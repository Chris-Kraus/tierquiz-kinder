#!/usr/bin/env node
/**
 * measure-audio-coverage.js
 *
 * REINES ANALYSE-/MESS-SKRIPT — kein Teil der produktiven Datenbeschaffungs-
 * Pipeline (siehe fetch-animals.js) und wird von dieser auch nicht
 * aufgerufen. Verändert weder data/animals.json noch sonst etwas — reiner
 * Lesezugriff gegen Wikidata- und Wikimedia-Commons-API, Ausgabe nur auf
 * stdout.
 *
 * Hintergrund: Bewertung des vorgeschlagenen neuen Spielmodus
 * "Tiergeräusche" (siehe docs/workflow/requirements.md, Abschnitt
 * "Bewertung dreier neuer Spielmodi", Idee 3). Eine erste Stichprobe
 * (n = 30 von 500 Tieren) hatte eine Gesamtabdeckung von 16,7 % ergeben,
 * stark vogellastig. Vor der finalen Priorisierungs-Entscheidung wird hier
 * eine echte Vollmessung über alle 500 Tiere durchgeführt (analog zur
 * P18-Vollmessung aus measure-image-coverage.js), um die Hochrechnung aus
 * der Stichprobe durch echte Zahlen zu ersetzen.
 *
 * Ablauf:
 *   1. data/animals.json lesen, alle 500 `id`s (Wikidata-QIDs) plus
 *      `category` sammeln.
 *   2. Wikidata wbgetentities, Batches à 50 QIDs, props=claims — P51
 *      ("audio") pro Tier extrahieren (Commons-Dateiname oder kein Wert).
 *   3. Für alle gefundenen Dateinamen: Wikimedia-Commons-API
 *      (action=query&prop=imageinfo&iiprop=extmetadata), Batches à 50
 *      Dateititel pro Request (MediaWiki-Limit für normale Nutzer) — liefert
 *      Lizenzdaten (extmetadata funktioniert auch für Audio-/Video-Dateien,
 *      nicht nur Bilder).
 *   4. Auswertung: Gesamtabdeckung, Aufschlüsselung nach `category`,
 *      Lizenzverteilung (CC0/PD vs. andere Lizenzen, analog zur Bild-
 *      Messung).
 *   5. Strukturierten Ergebnisbericht auf stdout ausgeben.
 *
 * Ausführung: node scripts/fetch-animals/measure-audio-coverage.js
 * Laufzeit: ca. 1-3 Minuten (10 Wikidata-Batches + einige Commons-Batches).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ANIMALS_PATH = path.join(REPO_ROOT, "data", "animals.json");

const WIKIDATA_API_ENDPOINT = "https://www.wikidata.org/w/api.php";
const COMMONS_API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
// Gleiche User-Agent-Policy wie fetch-animals.js / measure-image-coverage.js
// (Wikimedia verlangt einen aussagekräftigen User-Agent).
const USER_AGENT =
  "tierquiz-kinder-measure-audio-coverage/1.0 (https://github.com/Chris-Kraus/tierquiz-kinder; christian.b.kraus@icloud.com)";

const WIKIDATA_BATCH_SIZE = 50; // wbgetentities-Limit pro Request
const COMMONS_BATCH_SIZE = 50; // MediaWiki-Limit für mehrere `titles` pro Request (normale Nutzer)

// --- HTTP-Hilfsfunktionen (identisch zu measure-image-coverage.js) ------

async function fetchWithRetry(url, retries = 5, backoffMs = 2000) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(60000),
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

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

// --- Schritt 1: Tiere laden -----------------------------------------------

async function loadAnimals() {
  const raw = await readFile(ANIMALS_PATH, "utf-8");
  const data = JSON.parse(raw);
  return data.animals.map((a) => ({ id: a.id, category: a.category }));
}

// --- Schritt 2: P51 (audio) via Wikidata batch-weise auflösen ------------

function getStringClaim(claims, prop) {
  const statements = claims[prop];
  if (!statements || statements.length === 0) return null;
  const val = statements[0].mainsnak && statements[0].mainsnak.datavalue;
  if (!val || val.type !== "string") return null;
  return val.value;
}

async function fetchP51(qids) {
  const result = new Map(); // qid -> filename | null
  const batches = chunk(qids, WIKIDATA_BATCH_SIZE);
  let done = 0;
  for (const batch of batches) {
    const url = `${WIKIDATA_API_ENDPOINT}?${new URLSearchParams({
      format: "json",
      action: "wbgetentities",
      ids: batch.join("|"),
      props: "claims",
    }).toString()}`;
    const data = await fetchWithRetry(url);
    for (const [qid, entity] of Object.entries(data.entities || {})) {
      const filename = getStringClaim(entity.claims || {}, "P51");
      result.set(qid, filename);
    }
    done += batch.length;
    process.stdout.write(`\rWikidata P51-Abfrage: ${done}/${qids.length} Tiere geprüft`);
  }
  console.log("");
  return result;
}

// --- Schritt 3: Lizenz je Audiodatei via Commons batch-weise auflösen ---

// CC0 und gemeinfrei (Public Domain) gelten als "attributionsfrei nutzbar"
// (gleiche Logik wie measure-image-coverage.js). LicenseShortName-Werte
// variieren leicht (z. B. "CC0", "Public domain", "PD-old", "PD US"),
// daher ein toleranter Musterabgleich statt einer festen Werteliste.
function isCc0OrPublicDomain(licenseShortName) {
  if (!licenseShortName) return false;
  const s = licenseShortName.toLowerCase();
  return s.includes("cc0") || s.includes("public domain") || s.startsWith("pd") || s.includes(" pd");
}

async function fetchCommonsLicenses(filenames) {
  const result = new Map(); // filename -> { licenseShortName } | "unresolvable"
  const titles = filenames.map((f) => `File:${f}`);
  const batches = chunk(titles, COMMONS_BATCH_SIZE);
  let done = 0;
  for (const batch of batches) {
    const url = `${COMMONS_API_ENDPOINT}?${new URLSearchParams({
      format: "json",
      action: "query",
      titles: batch.join("|"),
      prop: "imageinfo",
      iiprop: "extmetadata",
    }).toString()}`;
    const data = await fetchWithRetry(url);
    const pages = (data.query && data.query.pages) || {};

    const normalizedToOriginal = new Map();
    for (const n of (data.query && data.query.normalized) || []) {
      normalizedToOriginal.set(n.to, n.from);
    }

    for (const page of Object.values(pages)) {
      const requestedTitle = normalizedToOriginal.get(page.title) || page.title;
      const filename = requestedTitle.replace(/^File:/, "");
      if (page.missing !== undefined || !page.imageinfo || page.imageinfo.length === 0) {
        result.set(filename, "unresolvable");
        continue;
      }
      const extmetadata = page.imageinfo[0].extmetadata || {};
      const licenseShortName =
        (extmetadata.LicenseShortName && extmetadata.LicenseShortName.value) ||
        (extmetadata.UsageTerms && extmetadata.UsageTerms.value) ||
        null;
      result.set(filename, { licenseShortName });
    }
    done += batch.length;
    process.stdout.write(`\rCommons-Lizenzabfrage: ${done}/${titles.length} Dateien geprüft`);
  }
  console.log("");
  return result;
}

// --- Hauptablauf -----------------------------------------------------

async function main() {
  console.log("measure-audio-coverage.js — Vollmessung der P51-Audioabdeckung und Commons-Lizenzverteilung");
  console.log("(reines Analyse-Skript, keine Schreibzugriffe auf data/animals.json)\n");

  const animals = await loadAnimals();
  console.log(`${animals.length} Tiere aus data/animals.json geladen.\n`);

  const p51ByQid = await fetchP51(animals.map((a) => a.id));

  const withAudio = [];
  const withoutAudio = [];
  const categoryById = new Map(animals.map((a) => [a.id, a.category]));
  for (const [qid, filename] of p51ByQid.entries()) {
    if (filename) withAudio.push({ qid, filename, category: categoryById.get(qid) });
    else withoutAudio.push({ qid, category: categoryById.get(qid) });
  }

  console.log(`\nP51 (audio) vorhanden: ${withAudio.length}/${animals.length}`);
  console.log(`P51 (audio) fehlt: ${withoutAudio.length}/${animals.length}\n`);

  // Aufschlüsselung nach Tiergruppe (category)
  const totalByCategory = new Map();
  const withAudioByCategory = new Map();
  for (const a of animals) {
    totalByCategory.set(a.category, (totalByCategory.get(a.category) || 0) + 1);
  }
  for (const a of withAudio) {
    withAudioByCategory.set(a.category, (withAudioByCategory.get(a.category) || 0) + 1);
  }

  console.log("=== Abdeckung nach Tiergruppe ===\n");
  const categoriesSorted = [...totalByCategory.entries()].sort((a, b) => b[1] - a[1]);
  for (const [category, total] of categoriesSorted) {
    const withA = withAudioByCategory.get(category) || 0;
    const pctCat = ((withA / total) * 100).toFixed(1);
    console.log(`  ${category.padEnd(14)}: ${String(withA).padStart(3)}/${String(total).padStart(3)} (${pctCat}%)`);
  }

  // Lizenzverteilung der gefundenen Audiodateien
  const uniqueFilenames = [...new Set(withAudio.map((w) => w.filename))];
  console.log(`\n${uniqueFilenames.length} eindeutige Commons-Audiodateien, Lizenzabfrage läuft...\n`);

  const licenseByFilename = await fetchCommonsLicenses(uniqueFilenames);

  let cc0PdCount = 0;
  let otherLicenseCount = 0;
  let unresolvableCount = 0;
  const otherLicenseCounts = new Map();

  for (const { filename } of withAudio) {
    const info = licenseByFilename.get(filename);
    if (info === "unresolvable" || info === undefined) {
      unresolvableCount++;
      continue;
    }
    const { licenseShortName } = info;
    if (isCc0OrPublicDomain(licenseShortName)) {
      cc0PdCount++;
    } else {
      otherLicenseCount++;
      const key = licenseShortName || "(unbekannt/kein LicenseShortName-Feld)";
      otherLicenseCounts.set(key, (otherLicenseCounts.get(key) || 0) + 1);
    }
  }

  const total = animals.length;
  const pct = (n) => ((n / total) * 100).toFixed(1);

  console.log("\n=== Gesamtergebnis ===\n");
  console.log(`Gesamt Tiere: ${total}`);
  console.log(`  Kein Ton (P51 fehlt):                       ${withoutAudio.length} (${pct(withoutAudio.length)} %)`);
  console.log(`  Ton vorhanden, CC0 oder Public Domain:      ${cc0PdCount} (${pct(cc0PdCount)} %)`);
  console.log(`  Ton vorhanden, andere Lizenz:                ${otherLicenseCount} (${pct(otherLicenseCount)} %)`);
  if (unresolvableCount > 0) {
    console.log(
      `  Ton referenziert, Commons-Metadaten nicht auflösbar (Edge Case): ${unresolvableCount} (${pct(unresolvableCount)} %)`,
    );
  }

  if (otherLicenseCounts.size > 0) {
    console.log(`\nVorkommende "andere" Lizenzen (Anzahl Tiere):`);
    for (const [license, count] of [...otherLicenseCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${license}: ${count}`);
    }
  }

  console.log(`\n(Methodik: Wikidata wbgetentities in ${Math.ceil(total / WIKIDATA_BATCH_SIZE)} Batches à ${WIKIDATA_BATCH_SIZE} für P51; `);
  console.log(
    `Commons action=query&prop=imageinfo&iiprop=extmetadata in ${Math.ceil(uniqueFilenames.length / COMMONS_BATCH_SIZE)} Batches à ${COMMONS_BATCH_SIZE} Dateititel für Lizenzdaten.)`,
  );
}

main().catch((err) => {
  console.error("\nAbbruch mit Fehler:", err);
  process.exitCode = 1;
});
