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

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "data", "animals.json");
// Zwischenspeicher der rohen, hydrierten Wikidata-Daten (vor der
// Pflichtfeld-Validierung/dem Zuschnitt auf animals.json). Erlaubt, spätere
// Schema-Anpassungen (welche Felder sind Pflicht, welche Felder werden
// überhaupt aufgenommen) mit `--use-cache` neu anzuwenden, ohne Discovery
// und Hydration erneut gegen Wikidata zu fahren (spart Zeit + API-Last).
// Bewusst außerhalb von data/ (kein Teil des App-Outputs) und in .gitignore
// aufgenommen (Build-Artefakt, kein Quellcode).
const CACHE_PATH = path.join(__dirname, ".cache", "hydration-cache.json");

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

// Felder, die NICHT von dieser Pipeline befüllt werden, sondern ausschließlich
// durch manuelle fachliche Kuration direkt in data/animals.json (siehe
// architecture.md, Abschnitt "Pipeline-Regenerierung vs. manuell kuratierte
// Felder", Issue #15; `diet` kuratiert in #18, `lifespan_years` in #19).
// buildAnimal() hat für diese Felder bewusst KEINEN Code-Pfad. Bei jedem
// Rerun dieser Pipeline (auch mit --use-cache) werden ihre Werte daher aus
// der VORHERIGEN data/animals.json übernommen (siehe mergeManuallyCuratedFields
// weiter unten) — sonst würde ein Rerun die Kuration aus #18/#19 stillschweigend
// verwerfen, da buildAnimal() die neuen Tier-Objekte komplett neu aufbaut.
const MANUALLY_CURATED_FIELDS = ["diet", "lifespan_years"];

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

async function discoverTaxonCandidates(taxonQid, categoryLabel, limit) {
  const query = `
    SELECT ?animal ?sitelinks WHERE {
      ?animal wdt:${TAXON_RANK_PROP} wd:${SPECIES_RANK_QID} .
      ?animal wdt:${PARENT_TAXON_PROP}* wd:${taxonQid} .
      ?animal wikibase:sitelinks ?sitelinks .
      FILTER(?sitelinks > ${SITELINKS_MIN})
      FILTER NOT EXISTS { ?animal wdt:P31 wd:${FOSSIL_TAXON_QID} }
    }
    ORDER BY DESC(?sitelinks)
    LIMIT ${limit}
  `;
  const bindings = await sparqlQuery(query);
  return bindings.map((b) => ({
    id: qidFromUri(b.animal.value),
    sitelinks: parseInt(b.sitelinks.value, 10),
    category: categoryLabel,
  }));
}

// Für "einfache" Klassen (eine einzige QID): eine Query über den ganzen
// P171*-Teilbaum. Für "zusammengesetzte" Klassen (subTaxa: [...]): der
// Teilbaum der Gesamtklasse ist beim Wikidata Query Service zu teuer
// (beobachtet: strukturelle 502/504 bei Insecta/Mollusca, kein reines
// Lastproblem, siehe README.md) — stattdessen mehrere kleinere Queries über
// bekannte Unter-Taxa (Ordnungen/Klassen), einzeln retry-fähig, danach
// gemergt/dedupliziert/auf das Klassen-Limit gekürzt.
async function discoverClassCandidates(classQid, classConfig, fallbackLimit) {
  if (typeof classConfig === "string") {
    return discoverTaxonCandidates(classQid, classConfig, fallbackLimit);
  }
  const { label, subTaxa } = classConfig;
  const perSubTaxonLimit = Math.ceil(fallbackLimit / subTaxa.length) + 20; // kleiner Puffer für Überlappung
  const byId = new Map();
  const failedSubTaxa = [];
  for (const subQid of subTaxa) {
    try {
      const candidates = await discoverTaxonCandidates(subQid, label, perSubTaxonLimit);
      for (const c of candidates) if (!byId.has(c.id)) byId.set(c.id, c);
    } catch (err) {
      failedSubTaxa.push(`${subQid} (${err.message})`);
    }
  }
  if (failedSubTaxa.length > 0) {
    console.log(`\n    (Sub-Taxa fehlgeschlagen und übersprungen: ${failedSubTaxa.join(", ")})`);
  }
  const merged = [...byId.values()].sort((a, b) => b.sitelinks - a.sitelinks);
  return merged.slice(0, fallbackLimit);
}

function classLabel(classConfig) {
  // classConfig ist bei "einfachen" Klassen bereits das Label selbst
  // (String, z. B. "Säugetier"), bei zusammengesetzten Klassen ein Objekt
  // mit .label. TAXON_CLASSES ist NICHT nach Label indiziert, sondern nach
  // QID — hier also nicht erneut nachschlagen.
  return typeof classConfig === "string" ? classConfig : classConfig.label;
}

async function discoverAllCandidates() {
  const byId = new Map();
  const failedClasses = [];
  for (const [classQid, classConfig] of Object.entries(TAXON_CLASSES)) {
    const label = classLabel(classConfig);
    process.stdout.write(`Discovery: ${label} (${classQid}) ... `);
    try {
      const candidates = await discoverClassCandidates(classQid, classConfig, PER_CLASS_CANDIDATE_LIMIT);
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
      failedClasses.push(label);
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

// Heuristik: Ist `value` tatsächlich der lateinische Artname statt eines
// echten deutschen/englischen Trivialnamens? Hintergrund (Issue #10): 37 von
// 500 Tieren hatten fälschlich den wissenschaftlichen Namen in name_de. Root
// Cause war KEIN fehlendes Label (das den bestehenden Fallback in pickLabel()
// ausgelöst hätte), sondern ein tatsächlich VORHANDENES Wikidata-"de"-Label,
// dessen Wert selbst der lateinische Binomial-Name ist (z. B. Q14683 „Haus-
// sperling“: labels.de = "Passer domesticus", obwohl sitelinks.dewiki.title
// korrekt "Haussperling" ist) – pickLabel() gab dieses Label unverändert
// zurück, da es ja "vorhanden" war. Verifiziert an den echten Rohdaten im
// Hydration-Cache für alle 37 betroffenen Tiere.
function looksLikeScientificName(value, scientificName) {
  if (!value) return false;
  const v = value.trim();
  if (scientificName && v.toLowerCase() === scientificName.trim().toLowerCase()) return true;
  // Generisches Binomial-Muster (Gattung Art, z. B. "Passer domesticus"):
  // großgeschriebenes erstes Wort, komplett kleingeschriebenes zweites Wort.
  // Echte deutsche Trivialnamen bestehen aus großgeschriebenen Substantiven,
  // auch mehrteilig (z. B. "Große Kerbameise") – ein rein kleingeschriebenes
  // zweites Wort kommt dort praktisch nicht vor. Gegengeprüft: 0
  // Falsch-Positive unter den 462 nicht betroffenen Tieren im bestehenden
  // Datensatz (data/animals.json vor diesem Fix).
  return /^[A-ZÄÖÜ][a-zäöüß]+ [a-zäöüß][a-zäöüß-]*$/.test(v);
}

// Anzeigename für ein Tier (name_de). Strengere Variante von pickLabel(), die
// zusätzlich lateinische Artnamen als Label verwirft (siehe Issue #10) statt
// sie unverändert zu übernehmen. Nur für Tiernamen verwendet – pickLabel()
// bleibt für Habitat-/Kontinent-Item-Labels unverändert (dort ist der Bug
// nicht relevant).
function pickAnimalNameDe(entity, scientificName) {
  const labels = entity.labels || {};
  if (labels.de && !looksLikeScientificName(labels.de.value, scientificName)) {
    return labels.de.value;
  }
  // Fallback: deutscher Wikipedia-Artikeltitel – meist ein verlässlicher
  // echter deutscher Trivialname. Greift sowohl wenn das "de"-Label ganz
  // fehlt, als auch (der Bugfall aus #10) wenn es selbst der lateinische
  // Artname ist. ABER: bei einigen wenigen Arten ohne eigenständigen
  // deutschen Trivialnamen ist auch der deutsche Wikipedia-Artikel selbst
  // unter dem lateinischen Namen angelegt (beobachtet z. B. bei Q15978631
  // "Homo sapiens" und Q130888 "Drosophila melanogaster" – der jeweilige
  // Artikel zur Art selbst trägt den wissenschaftlichen Titel, während
  // "Mensch"/"Fruchtfliege" andere, hier nicht referenzierte Wikidata-Items
  // sind) – daher auch hier gegenprüfen statt blind zu übernehmen.
  const dewikiTitle = entity.sitelinks && entity.sitelinks.dewiki && entity.sitelinks.dewiki.title;
  if (dewikiTitle && !looksLikeScientificName(dewikiTitle, scientificName)) {
    return dewikiTitle;
  }
  // Kein echtes deutsches Label und kein deutscher Wikipedia-Artikel
  // vorhanden: bewusst KEIN englisches Fallback-Label als Anzeigename (siehe
  // Issue #10 – ein englischer Name ist für ein deutsches Kinderquiz ebenso
  // wenig kindgerecht wie Latein, und würde zudem meist ebenfalls nur den
  // lateinischen Namen doppeln, siehe z. B. Q53462). `null` macht das Tier
  // über die Pflichtfeld-Validierung (validateRequiredFields) ungültig; es
  // wird durch den nächsten populären Kandidaten aus dem größeren Pool
  // nachbesetzt (siehe main(): valid.slice(0, TARGET_TOTAL)).
  return null;
}

// Kanonische deutsche Wikipedia-URL aus dem Sitelink-Titel (Issue #15). Der
// Titel ist bereits Teil des Hydration-Caches (hydrateEntities() lädt
// props: "labels|claims|sitelinks") — kein zusätzlicher Netzwerk-Call nötig.
// Leerzeichen werden zu Unterstrichen (Wikipedia-URL-Konvention), danach wird
// URL-kodiert (deckt Umlaute/Sonderzeichen in Artikeltiteln ab).
function buildWikipediaUrlDe(dewikiTitle) {
  if (typeof dewikiTitle !== "string" || dewikiTitle.trim() === "") return null;
  const underscored = dewikiTitle.trim().replace(/ /g, "_");
  return `https://de.wikipedia.org/wiki/${encodeURIComponent(underscored)}`;
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
  const name_scientific = getStringClaim(claims, PROPS.scientificName);
  const name_de = pickAnimalNameDe(entity, name_scientific);

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

  // Issue #15: Link zur deutschen Wikipedia-Seite, aus dem bereits geladenen
  // sitelinks.dewiki-Titel abgeleitet (siehe buildWikipediaUrlDe oben).
  const wikipedia_url_de = buildWikipediaUrlDe(
    entity.sitelinks && entity.sitelinks.dewiki && entity.sitelinks.dewiki.title,
  );

  // name_scientific wurde bereits oben (vor pickAnimalNameDe) extrahiert.

  // `color` wurde nach dem ersten Testlauf komplett aus dem Schema entfernt
  // (0 von 1.480 Kandidaten hatten eine strukturierte Wikidata-Farbangabe —
  // kein Abdeckungsproblem, das "optional statt Pflicht" gelöst hätte,
  // siehe architecture.md "Korrektur vom 13.08.2026" und README.md). Es wird
  // hier bewusst kein `color`-Feld mehr erzeugt, auch nicht leer/optional.
  const animal = {
    id: candidate.id,
    name_de,
    ...(name_scientific ? { name_scientific } : {}),
    category: candidate.category,
    // habitat/continent/weight_kg: seit der Schema-Korrektur vom 13.08.2026
    // optional (ursprünglich Pflicht, siehe architecture.md) — nur
    // aufnehmen, wenn tatsächlich Daten vorhanden sind, statt leerem
    // Array/`null` (konsistent mit den übrigen optionalen Feldern).
    ...(habitat.length > 0 ? { habitat } : {}),
    ...(continent.length > 0 ? { continent } : {}),
    ...(weight_kg != null ? { weight_kg } : {}),
    ...(length_cm != null ? { length_cm } : {}),
    ...(conservation_status ? { conservation_status } : {}),
    ...(wikipedia_url_de ? { wikipedia_url_de } : {}),
    _sitelinks: candidate.sitelinks,
    _isExtinct: isExtinct,
  };
  return animal;
}

// Pflichtfelder seit der Schema-Korrektur vom 13.08.2026 (architecture.md):
// nur noch id/name_de/category. habitat/continent/weight_kg/length_cm/
// conservation_status/name_scientific sind optional und werden nur
// aufgenommen, wenn Daten vorhanden sind (siehe buildAnimal oben). `color`
// existiert als Feld nicht mehr.
function validateRequiredFields(animal) {
  const missing = [];
  if (!animal.id || !/^Q[0-9]+$/.test(animal.id)) missing.push("id");
  if (!animal.name_de) missing.push("name_de");
  if (!CATEGORY_ENUM.includes(animal.category)) missing.push("category");
  return missing;
}

// Rein informative Abdeckungs-Statistik für die (jetzt optionalen) Felder —
// fließt nicht in die Validierung ein, aber in den Lauf-Report/die Doku.
function computeOptionalFieldCoverage(animals) {
  const fields = [
    "habitat",
    "continent",
    "weight_kg",
    "length_cm",
    "name_scientific",
    "conservation_status",
    "wikipedia_url_de",
  ];
  const coverage = {};
  for (const f of fields) {
    coverage[f] = animals.filter((a) => {
      const v = a[f];
      return Array.isArray(v) ? v.length > 0 : v != null;
    }).length;
  }
  return coverage;
}

// --- Manuell kuratierte Felder über Reruns hinweg erhalten ---------------

// Liest die zuvor geschriebene data/animals.json (falls vorhanden) und
// überträgt MANUALLY_CURATED_FIELDS (aktuell: diet, lifespan_years) anhand
// der Tier-`id` auf die neu aufgebauten Datensätze — diese Felder kennt
// buildAnimal() nicht, sie kommen ausschließlich aus manueller fachlicher
// Kuration (#18/#19) und würden bei einem reinen Neuaufbau sonst verloren
// gehen (siehe architecture.md, Issue #15). Mutiert `finalAnimals` in-place
// und gibt eine kleine Statistik für den Lauf-Report zurück.
async function mergeManuallyCuratedFields(finalAnimals) {
  const stats = {
    counts: Object.fromEntries(MANUALLY_CURATED_FIELDS.map((f) => [f, 0])),
    droppedAnimalIds: [],
    hadPreviousFile: false,
  };

  let previousAnimals;
  try {
    const raw = await readFile(OUTPUT_PATH, "utf-8");
    previousAnimals = JSON.parse(raw).animals || [];
    stats.hadPreviousFile = true;
  } catch {
    // Kein vorheriger Lauf (Erstgenerierung) – nichts zu übernehmen.
    return stats;
  }

  const previousById = new Map(previousAnimals.map((a) => [a.id, a]));

  for (const animal of finalAnimals) {
    const previous = previousById.get(animal.id);
    if (!previous) continue;
    for (const field of MANUALLY_CURATED_FIELDS) {
      if (previous[field] != null && animal[field] == null) {
        animal[field] = previous[field];
        stats.counts[field] += 1;
      }
    }
  }

  // Sichtbarkeit, falls ein zuvor kuratiertes Tier aus der neuen
  // Top-TARGET_TOTAL-Auswahl gefallen ist (z. B. durch Sitelink-Schwankungen)
  // – kein harter Fehler, aber im Lauf-Report sichtbar machen.
  const finalIds = new Set(finalAnimals.map((a) => a.id));
  for (const [id, previous] of previousById.entries()) {
    if (finalIds.has(id)) continue;
    const hadCuratedValue = MANUALLY_CURATED_FIELDS.some((f) => previous[f] != null);
    if (hadCuratedValue) stats.droppedAnimalIds.push(id);
  }

  return stats;
}

// --- Cache (Discovery + Hydration zwischenspeichern) -------------------

async function saveCache({ pool, entities, endemicToContinents, labelMap }) {
  const payload = {
    savedAt: new Date().toISOString(),
    pool,
    entities: Object.fromEntries(entities),
    endemicToContinents: Object.fromEntries(endemicToContinents),
    labelMap: Object.fromEntries(labelMap),
  };
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf-8");
  console.log(`Cache geschrieben: ${CACHE_PATH} (${pool.length} Kandidaten).`);
}

async function loadCache() {
  let raw;
  try {
    raw = await readFile(CACHE_PATH, "utf-8");
  } catch {
    return null;
  }
  const payload = JSON.parse(raw);
  return {
    pool: payload.pool,
    entities: new Map(Object.entries(payload.entities)),
    endemicToContinents: new Map(Object.entries(payload.endemicToContinents)),
    labelMap: new Map(Object.entries(payload.labelMap)),
    savedAt: payload.savedAt,
  };
}

// Führt Discovery (Phase 1) + Hydration inkl. Kontinent-/Label-Auflösung
// (Phase 2) aus. Ausgelagert aus main(), damit main() bei `--use-cache`
// diesen kompletten (teuren) Block überspringen kann.
async function fetchAndHydrate() {
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

  return { pool, entities, endemicToContinents, labelMap };
}

// --- Hauptablauf -----------------------------------------------------

async function main() {
  console.log(`fetch-animals.js — Wikidata-Datenbeschaffung für die Tierquiz-Datenbank`);
  console.log(`Zielgröße: ~${TARGET_TOTAL} Tiere, Popularitäts-Schwelle: sitelinks > ${SITELINKS_MIN}\n`);

  const useCache = process.argv.includes("--use-cache");
  let pool, entities, endemicToContinents, labelMap;

  if (useCache) {
    const cached = await loadCache();
    if (cached) {
      ({ pool, entities, endemicToContinents, labelMap } = cached);
      console.log(
        `--use-cache: Cache geladen (${CACHE_PATH}, gespeichert ${cached.savedAt}) — ${pool.length} Kandidaten, ${entities.size} hydrierte Entities. Phase 1+2 (Discovery/Hydration) werden übersprungen.\n`,
      );
    } else {
      console.log(`--use-cache angegeben, aber kein Cache unter ${CACHE_PATH} gefunden — führe vollen Fetch aus.\n`);
    }
  }

  if (!pool) {
    ({ pool, entities, endemicToContinents, labelMap } = await fetchAndHydrate());
    await saveCache({ pool, entities, endemicToContinents, labelMap });
  }

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
  console.log(`Vollständig schema-valide (Pflichtfelder id/name_de/category befüllt): ${valid.length}`);
  if (Object.keys(missingFieldCounts).length > 0) {
    console.log(`Fehlende Pflichtfelder (Häufigkeit über alle hydrierten Kandidaten):`);
    for (const [field, count] of Object.entries(missingFieldCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${field}: bei ${count}/${built.length} Kandidaten leer`);
    }
  }
  console.log(`\n=> ${finalAnimals.length} Tiere gehen in data/animals.json (Ziel: ~${TARGET_TOTAL}).`);

  const curationStats = await mergeManuallyCuratedFields(finalAnimals);
  if (curationStats.hadPreviousFile) {
    console.log(`\nManuell kuratierte Felder aus vorheriger ${path.basename(OUTPUT_PATH)} übernommen:`);
    for (const field of MANUALLY_CURATED_FIELDS) {
      console.log(`  - ${field}: ${curationStats.counts[field]}/${finalAnimals.length}`);
    }
    if (curationStats.droppedAnimalIds.length > 0) {
      console.log(
        `  WARNUNG: ${curationStats.droppedAnimalIds.length} Tier(e) mit zuvor kuratierten Werten sind aus der neuen Top-${TARGET_TOTAL}-Auswahl gefallen und daher nicht mehr in data/animals.json: ${curationStats.droppedAnimalIds.join(", ")}`,
      );
    }
  } else {
    console.log(`\nKeine vorherige ${path.basename(OUTPUT_PATH)} gefunden — keine manuell kuratierten Felder zu übernehmen (Erstgenerierung).`);
  }

  const coverage = computeOptionalFieldCoverage(finalAnimals);
  console.log(`\nAbdeckung optionaler Felder in den finalen ${finalAnimals.length} Tieren:`);
  for (const [field, count] of Object.entries(coverage)) {
    const pct = finalAnimals.length > 0 ? ((count / finalAnimals.length) * 100).toFixed(1) : "0.0";
    console.log(`  - ${field}: ${count}/${finalAnimals.length} (${pct} %)`);
  }

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
