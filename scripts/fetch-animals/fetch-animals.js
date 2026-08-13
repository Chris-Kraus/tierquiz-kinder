#!/usr/bin/env node
/**
 * fetch-animals.js
 *
 * Wikidata-Datenbeschaffungs-Pipeline für die Tierquiz-Datenbank
 * (siehe docs/workflow/architecture.md, Abschnitt "Skizze: Datenbeschaffung
 * aus Wikidata" und GitHub Issue #2).
 *
 * Zweistufiger Ansatz:
 *   1. Discovery: pro Tier-Klasse (Säugetier, Vogel, ...) eine SPARQL-Query
 *      gegen den Wikidata Query Service, die Arten (taxon rank = species)
 *      unterhalb der jeweiligen Klasse findet und nach Sitelink-Anzahl
 *      (Popularitäts-Proxy) sortiert.
 *   2. Hydration: für die gefundenen Kandidaten-QIDs die Detail-Felder per
 *      Wikidata-API (wbgetentities, batch-weise) nachladen.
 *
 * Nur Node.js-Bordmittel (fetch, fs) – keine externen Abhängigkeiten.
 *
 * Ausführung: node scripts/fetch-animals/fetch-animals.js
 * (siehe scripts/fetch-animals/README.md für Details)
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "data", "animals.json");

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const API_ENDPOINT = "https://www.wikidata.org/w/api.php";
// Wikimedia verlangt einen aussagekräftigen User-Agent (siehe Wikimedia User-Agent Policy).
const USER_AGENT =
  "tierquiz-kinder-fetch-animals/1.0 (https://github.com/Chris-Kraus/tierquiz-kinder; christian.b.kraus@icloud.com)";

// --- Konfiguration -----------------------------------------------------

// Taxon-Klassen -> category-Enum-Wert aus dem Schema (architecture.md).
// QIDs verifiziert per Testabfrage gegen wdt:P225 (taxon name), nicht aus
// der Architektur-Skizze übernommen, da dort explizit nur "zur Illustration"
// markiert (siehe architecture.md Abschnitt 4).
const TAXON_CLASSES = {
  Q7377: "Säugetier", // Mammalia
  Q5113: "Vogel", // Aves
  Q10811: "Reptil", // Reptilia
  Q10908: "Amphibie", // Amphibia
  Q127282: "Fisch", // Actinopterygii (Strahlenflosser, deckt die meisten "Fische" ab)
  // Insecta und Mollusca NICHT als eine einzige P171*-Query über die ganze
  // Klasse: der transitive Teilbaum ist dort so groß, dass der Wikidata
  // Query Service die Anfrage strukturell mit 502/504 abbricht (beobachtet
  // beim ersten Testlauf, kein reines Retry-/Lastproblem). Stattdessen wird
  // über bekannte, kleinere Unter-Taxa (Ordnungen/Klassen) aufgeteilt —
  // deckt die für ein Kinderquiz relevanten, populären Arten praktisch
  // vollständig ab, ohne die teure Volltraversierung.
  Q1390: {
    label: "Insekt", // Insecta
    subTaxa: ["Q22671", "Q28319", "Q22651", "Q25375", "Q25312", "Q26371", "Q167810"],
    // Käfer, Schmetterlinge, Hautflügler, Libellen, Zweiflügler, Schnabelkerfe, Heuschrecken
  },
  Q1358: "Spinnentier", // Arachnida
  Q25326: {
    label: "Weichtier", // Mollusca
    subTaxa: ["Q4867740", "Q25368", "Q128257"],
    // Schnecken, Muscheln, Kopffüßer
  },
};

const SPECIES_RANK_QID = "Q7432"; // taxon rank: species (verifiziert an Q140/Löwe)
const FOSSIL_TAXON_QID = "Q23038290"; // "fossil taxon" — schließt ausgestorbene Arten (z. B. Dinosaurier) aus
const PARENT_TAXON_PROP = "P171";
const TAXON_RANK_PROP = "P105";

// Popularitäts-Proxy: Sitelink-Anzahl (Anzahl Wikipedia-Sprachversionen u. a.),
// siehe requirements.md Entscheidungstabelle und architecture.md Abschnitt 4.
const SITELINKS_MIN = 15;
// Pro Klasse geladene Kandidaten (großzügiger Puffer oberhalb des Zielwerts,
// da nicht alle Kandidaten am Ende alle Pflichtfelder befüllt bekommen,
// siehe README.md "Bekannte Datenlücken").
const PER_CLASS_CANDIDATE_LIMIT = 220;
const TARGET_TOTAL = 500;

// Property-IDs für die Detail-Hydration (verifiziert per Testabfrage gegen
// bekannte Tiere wie Löwe/Q140; teilweise abweichend von der reinen
// Architektur-Skizze, siehe README.md "Abweichungen von der Architektur-Skizze"):
const PROPS = {
  scientificName: "P225", // taxon name
  mass: "P2067", // mass
  length: "P2043", // length
  conservationStatus: "P141", // IUCN conservation status
  habitat: "P2974", // habitat
  endemicTo: "P183", // endemic to (bester verfügbarer Proxy für "continent", siehe README.md)
  continentDirect: "P30", // continent (auf dem per P183 referenzierten Ort)
};

const CONSERVATION_STATUS_MAP = {
  Q211005: "nicht gefährdet", // least concern
  Q719675: "nicht gefährdet", // near threatened
  Q278113: "gefährdet", // vulnerable
  Q96377276: "stark gefährdet", // endangered
  Q219127: "vom Aussterben bedroht", // critically endangered
  Q239509: "vom Aussterben bedroht", // extinct in the wild
};
const EXTINCT_STATUS_QID = "Q237350"; // "extinct" — Tier wird ausgeschlossen (kein Quiz zu ausgestorbenen Tieren)

const WEIGHT_UNIT_TO_KG = {
  Q11570: 1, // kilogram
  Q41803: 0.001, // gram
  Q191118: 1000, // tonne
  Q100995: 0.45359237, // pound
};
const LENGTH_UNIT_TO_CM = {
  Q174728: 1, // centimetre
  Q11573: 100, // metre
  Q174789: 0.1, // millimetre
};

const CATEGORY_ENUM = [
  "Säugetier",
  "Vogel",
  "Reptil",
  "Amphibie",
  "Fisch",
  "Insekt",
  "Spinnentier",
  "Weichtier",
  "Sonstiges",
];

// --- HTTP-Hilfsfunktionen ------------------------------------------------

// Der Wikidata Query Service liefert bei größeren/aufwändigeren Queries
// gelegentlich transiente 502/503/504-Fehler (Server-Last), unabhängig von
// dieser Umgebung. Großzügige Retries mit exponentiellem Backoff fangen das
// zuverlässig ab (in der Praxis beobachtet: vereinzelte 502/504, spätestens
// beim 2.–3. Versuch erfolgreich).
async function fetchWithRetry(url, options, retries = 6, backoffMs = 3000) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(120000),
      });
      if ([429, 500, 502, 503, 504].includes(res.status)) {
        throw new Error(`HTTP ${res.status} (transient)`);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const wait = backoffMs * Math.pow(1.6, attempt);
        console.error(`  (Fehler: ${err.message} – Retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms)`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

async function sparqlQuery(query) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;
  const data = await fetchWithRetry(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT,
    },
  });
  return data.results.bindings;
}

async function apiCall(params) {
  const url = `${API_ENDPOINT}?${new URLSearchParams({
    format: "json",
    ...params,
  }).toString()}`;
  return fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
}

function qidFromUri(uri) {
  return uri.split("/").pop();
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

// --- Phase 1: Discovery ---------------------------------------------------

async function discoverClassCandidates(classQid, categoryLabel) {
  const query = `
    SELECT ?animal ?sitelinks WHERE {
      ?animal wdt:${TAXON_RANK_PROP} wd:${SPECIES_RANK_QID} .
      ?animal wdt:${PARENT_TAXON_PROP}* wd:${classQid} .
      ?animal wikibase:sitelinks ?sitelinks .
      FILTER(?sitelinks > ${SITELINKS_MIN})
      FILTER NOT EXISTS { ?animal wdt:P31 wd:${FOSSIL_TAXON_QID} }
    }
    ORDER BY DESC(?sitelinks)
    LIMIT ${PER_CLASS_CANDIDATE_LIMIT}
  `;
  const bindings = await sparqlQuery(query);
  return bindings.map((b) => ({
    id: qidFromUri(b.animal.value),
    sitelinks: parseInt(b.sitelinks.value, 10),
    category: categoryLabel,
  }));
}

async function discoverAllCandidates() {
  const byId = new Map();
  const failedClasses = [];
  for (const [classQid, categoryLabel] of Object.entries(TAXON_CLASSES)) {
    process.stdout.write(`Discovery: ${categoryLabel} (${classQid}) ... `);
    try {
      const candidates = await discoverClassCandidates(classQid, categoryLabel);
      console.log(`${candidates.length} Kandidaten (sitelinks > ${SITELINKS_MIN})`);
      for (const c of candidates) {
        // Falls ein Taxon über mehrere Klassen erreichbar ist (seltene
        // Mehrfach-Klassifikation), erste Zuordnung behalten.
        if (!byId.has(c.id)) byId.set(c.id, c);
      }
    } catch (err) {
      // Eine einzelne, dauerhaft fehlschlagende Klasse soll den gesamten
      // Lauf nicht abbrechen (z. B. wiederholte 502/504 vom WDQS bei
      // besonders teuren Queries) — stattdessen überspringen und am Ende
      // sichtbar als Lücke melden.
      console.log(`FEHLGESCHLAGEN nach mehreren Retries: ${err.message}`);
      failedClasses.push(categoryLabel);
    }
  }
  if (failedClasses.length > 0) {
    console.log(`\nWARNUNG: Discovery für folgende Klassen fehlgeschlagen und übersprungen: ${failedClasses.join(", ")}`);
  }
  return [...byId.values()].sort((a, b) => b.sitelinks - a.sitelinks);
}

// --- Phase 2: Hydration ---------------------------------------------------

async function hydrateEntities(qids) {
  const entities = new Map();
  const batches = chunk(qids, 50); // wbgetentities-Limit: 50 IDs pro Request
  let done = 0;
  for (const batch of batches) {
    const data = await apiCall({
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "labels|claims|sitelinks",
      languages: "de|en",
    });
    for (const [qid, entity] of Object.entries(data.entities || {})) {
      entities.set(qid, entity);
    }
    done += batch.length;
    process.stdout.write(`\rHydration: ${done}/${qids.length} Tiere geladen`);
  }
  console.log("");
  return entities;
}

async function fetchLabels(qids) {
  const labels = new Map();
  const batches = chunk([...new Set(qids)], 50);
  for (const batch of batches) {
    if (batch.length === 0) continue;
    const data = await apiCall({
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "labels",
      languages: "de|en",
    });
    for (const [qid, entity] of Object.entries(data.entities || {})) {
      labels.set(qid, pickLabel(entity));
    }
  }
  return labels;
}

async function fetchClaimsOnly(qids) {
  const out = new Map();
  const batches = chunk([...new Set(qids)], 50);
  for (const batch of batches) {
    if (batch.length === 0) continue;
    const data = await apiCall({
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "claims",
    });
    for (const [qid, entity] of Object.entries(data.entities || {})) {
      out.set(qid, entity.claims || {});
    }
  }
  return out;
}

// --- Claim-Extraktion -------------------------------------------------

function pickLabel(entity) {
  const labels = entity.labels || {};
  if (labels.de) return labels.de.value;
  if (labels.en) return labels.en.value;
  // Fallback: deutscher Wikipedia-Seitentitel, falls kein Wikidata-Label vorhanden.
  const dewiki = entity.sitelinks && entity.sitelinks.dewiki;
  if (dewiki) return dewiki.title;
  return null;
}

function getStringClaim(claims, prop) {
  const statements = claims[prop];
  if (!statements || statements.length === 0) return null;
  const val = statements[0].mainsnak && statements[0].mainsnak.datavalue;
  if (!val || val.type !== "string") return null;
  return val.value;
}

function getItemQids(claims, prop) {
  const statements = claims[prop] || [];
  const qids = [];
  for (const s of statements) {
    const val = s.mainsnak && s.mainsnak.datavalue;
    if (val && val.type === "wikibase-entityid") qids.push(val.value.id);
  }
  return qids;
}

function median(nums) {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Liest Quantity-Statements, konvertiert per unitMap in eine Zielmaßeinheit
// und gibt den Median aller konvertierbaren Werte zurück (robust gegenüber
// z. B. mehreren Gewichtsangaben nach Geschlecht/Altersstufe, siehe README.md).
function getQuantityValue(claims, prop, unitMap) {
  const statements = claims[prop] || [];
  const converted = [];
  for (const s of statements) {
    const val = s.mainsnak && s.mainsnak.datavalue;
    if (!val || val.type !== "quantity") continue;
    const unitUri = val.value.unit;
    const unitQid = unitUri && unitUri !== "1" ? qidFromUri(unitUri) : null;
    const factor = unitQid ? unitMap[unitQid] : null;
    if (factor == null) continue; // unbekannte/nicht gemappte Einheit: überspringen statt raten
    const amount = parseFloat(val.value.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    converted.push(amount * factor);
  }
  return median(converted);
}

// --- Aufbau eines Tier-Datensatzes -----------------------------------

function buildAnimal(candidate, entity, labelMap, endemicToContinents) {
  const claims = entity.claims || {};
  const name_de = pickLabel(entity);

  const habitatQids = getItemQids(claims, PROPS.habitat);
  const habitat = habitatQids.map((q) => labelMap.get(q)).filter(Boolean);

  const endemicQids = getItemQids(claims, PROPS.endemicTo);
  const continentSet = new Set();
  for (const locQid of endemicQids) {
    for (const contQid of endemicToContinents.get(locQid) || []) {
      const label = labelMap.get(contQid);
      if (label) continentSet.add(label);
    }
  }
  const continent = [...continentSet];

  const weight_kg = getQuantityValue(claims, PROPS.mass, WEIGHT_UNIT_TO_KG);
  const length_cm = getQuantityValue(claims, PROPS.length, LENGTH_UNIT_TO_CM);

  const conservationQids = getItemQids(claims, PROPS.conservationStatus);
  let conservation_status = null;
  let isExtinct = false;
  for (const q of conservationQids) {
    if (q === EXTINCT_STATUS_QID) isExtinct = true;
    if (CONSERVATION_STATUS_MAP[q]) conservation_status = CONSERVATION_STATUS_MAP[q];
  }

  const name_scientific = getStringClaim(claims, PROPS.scientificName);

  const animal = {
    id: candidate.id,
    name_de,
    ...(name_scientific ? { name_scientific } : {}),
    category: candidate.category,
    habitat,
    continent,
    weight_kg,
    ...(length_cm != null ? { length_cm } : {}),
    // color: keine belastbare strukturierte Wikidata-Property gefunden
    // (siehe README.md "Bekannte Datenlücken") – bewusst nicht erfunden.
    color: [],
    ...(conservation_status ? { conservation_status } : {}),
    _sitelinks: candidate.sitelinks,
    _isExtinct: isExtinct,
  };
  return animal;
}

function validateRequiredFields(animal) {
  const missing = [];
  if (!animal.id || !/^Q[0-9]+$/.test(animal.id)) missing.push("id");
  if (!animal.name_de) missing.push("name_de");
  if (!CATEGORY_ENUM.includes(animal.category)) missing.push("category");
  if (!Array.isArray(animal.habitat) || animal.habitat.length === 0) missing.push("habitat");
  if (!Array.isArray(animal.continent) || animal.continent.length === 0) missing.push("continent");
  if (typeof animal.weight_kg !== "number" || !(animal.weight_kg > 0)) missing.push("weight_kg");
  if (!Array.isArray(animal.color) || animal.color.length === 0) missing.push("color");
  return missing;
}

// --- Hauptablauf -----------------------------------------------------

async function main() {
  console.log(`fetch-animals.js — Wikidata-Datenbeschaffung für die Tierquiz-Datenbank`);
  console.log(`Zielgröße: ~${TARGET_TOTAL} Tiere, Popularitäts-Schwelle: sitelinks > ${SITELINKS_MIN}\n`);

  console.log("=== Phase 1: Discovery ===");
  const allCandidates = await discoverAllCandidates();
  console.log(`\nInsgesamt ${allCandidates.length} eindeutige Kandidaten gefunden.`);

  // Globaler Puffer oberhalb des Zielwerts für die Hydration, da nicht alle
  // Kandidaten am Ende alle Pflichtfelder befüllt bekommen.
  const HYDRATION_POOL_SIZE = Math.min(allCandidates.length, PER_CLASS_CANDIDATE_LIMIT * Object.keys(TAXON_CLASSES).length);
  const pool = allCandidates.slice(0, HYDRATION_POOL_SIZE);
  console.log(`Hydration-Pool (Top-${pool.length} nach Sitelinks) wird nachgeladen.\n`);

  console.log("=== Phase 2: Hydration ===");
  const entities = await hydrateEntities(pool.map((c) => c.id));

  // Für continent: "endemic to"-Zielorte sammeln und deren P30 (continent) auflösen.
  const endemicTargets = new Set();
  for (const c of pool) {
    const entity = entities.get(c.id);
    if (!entity) continue;
    for (const q of getItemQids(entity.claims || {}, PROPS.endemicTo)) endemicTargets.add(q);
  }
  console.log(`Löse ${endemicTargets.size} "endemic to"-Orte für die Kontinent-Ableitung auf ...`);
  const endemicClaims = await fetchClaimsOnly([...endemicTargets]);
  const endemicToContinents = new Map();
  const allContinentQids = new Set();
  for (const [locQid, locClaims] of endemicClaims.entries()) {
    const conts = getItemQids(locClaims, PROPS.continentDirect);
    endemicToContinents.set(locQid, conts);
    for (const q of conts) allContinentQids.add(q);
  }

  // Labels für alle referenzierten Habitat- und Kontinent-Items sammeln.
  const habitatQids = new Set();
  for (const c of pool) {
    const entity = entities.get(c.id);
    if (!entity) continue;
    for (const q of getItemQids(entity.claims || {}, PROPS.habitat)) habitatQids.add(q);
  }
  console.log(`Löse Labels für ${habitatQids.size} Habitat- und ${allContinentQids.size} Kontinent-Items auf ...`);
  const labelMap = await fetchLabels([...habitatQids, ...allContinentQids]);

  console.log("\n=== Phase 3: Zusammenbau & Validierung ===");
  const built = [];
  const missingFieldCounts = {};
  let extinctExcluded = 0;
  for (const candidate of pool) {
    const entity = entities.get(candidate.id);
    if (!entity) continue;
    const animal = buildAnimal(candidate, entity, labelMap, endemicToContinents);
    if (animal._isExtinct) {
      extinctExcluded++;
      continue;
    }
    const missing = validateRequiredFields(animal);
    for (const f of missing) missingFieldCounts[f] = (missingFieldCounts[f] || 0) + 1;
    built.push({ animal, missing });
  }

  const valid = built.filter((b) => b.missing.length === 0).map((b) => b.animal);
  valid.sort((a, b) => b._sitelinks - a._sitelinks);
  const finalAnimals = valid.slice(0, TARGET_TOTAL).map((a) => {
    const { _sitelinks, _isExtinct, ...clean } = a;
    return clean;
  });

  console.log(`\nHydrierte Kandidaten: ${built.length}`);
  console.log(`Davon wegen IUCN-Status "extinct" ausgeschlossen: ${extinctExcluded}`);
  console.log(`Vollständig schema-valide (alle Pflichtfelder befüllt): ${valid.length}`);
  console.log(`Fehlende Pflichtfelder (Häufigkeit über alle hydrierten Kandidaten):`);
  for (const [field, count] of Object.entries(missingFieldCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${field}: bei ${count}/${built.length} Kandidaten leer`);
  }
  console.log(`\n=> ${finalAnimals.length} Tiere gehen in data/animals.json (Ziel: ~${TARGET_TOTAL}).`);

  const output = {
    schema_version: "1.0.0",
    license: "CC0-1.0",
    source: "Wikidata",
    source_url: "https://www.wikidata.org/",
    retrieved_at: new Date().toISOString().slice(0, 10),
    animals: finalAnimals,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`\nGeschrieben: ${OUTPUT_PATH}`);

  // Abschließende Selbst-Validierung der geschriebenen Datei.
  const revalidationErrors = finalAnimals.flatMap((a, i) => {
    const missing = validateRequiredFields(a);
    return missing.length ? [`animals[${i}] (${a.id}): fehlt ${missing.join(", ")}`] : [];
  });
  if (revalidationErrors.length > 0) {
    console.error(`\nVALIDIERUNGSFEHLER in der geschriebenen Datei:`);
    revalidationErrors.forEach((e) => console.error("  " + e));
    process.exitCode = 1;
  } else {
    console.log(`Validierung OK: alle ${finalAnimals.length} Tiere erfüllen die Pflichtfelder aus dem formalen JSON Schema.`);
  }
}

main().catch((err) => {
  console.error("\nAbbruch mit Fehler:", err);
  process.exitCode = 1;
});
