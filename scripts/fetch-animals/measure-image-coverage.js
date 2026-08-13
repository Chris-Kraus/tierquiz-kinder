#!/usr/bin/env node
/**
 * measure-image-coverage.js
 *
 * REINES ANALYSE-/MESS-SKRIPT — kein Teil der produktiven Datenbeschaffungs-
 * Pipeline (siehe fetch-animals.js) und wird von dieser auch nicht
 * aufgerufen. Verändert weder data/animals.json noch sonst etwas — reiner
 * Lesezugriff gegen Wikidata- und Wikimedia-Commons-API, Ausgabe nur auf
 * stdout.
 *
 * Hintergrund: GitHub Issue #16 ("Bild als Rateshilfe"), Abschnitt
 * "Erweiterte Optionsübersicht", Option G ("Hybrid: nur CC0/PD-Bilder lokal
 * bündeln"). Offene Frage dort: wie hoch ist die reale CC0/Public-Domain-
 * Bildabdeckung unter den 500 ausgewählten Tieren tatsächlich? Dieses Skript
 * misst das per echtem Test gegen die Wikidata-/Commons-API (analog zur
 * habitat/weight_kg/color-Messung aus Issue #2), bevor eine Entscheidung
 * über Option A–G fällt.
 *
 * Ablauf:
 *   1. data/animals.json lesen, alle 500 `id`s (Wikidata-QIDs) sammeln.
 *   2. Wikidata wbgetentities, Batches à 50 QIDs, props=claims — P18
 *      ("image") pro Tier extrahieren (Commons-Dateiname oder kein Wert).
 *   3. Für alle gefundenen Dateinamen: Wikimedia-Commons-API
 *      (action=query&prop=imageinfo&iiprop=extmetadata), Batches à 50
 *      Dateititel pro Request (MediaWiki-Limit für normale Nutzer).
 *   4. Lizenz aus extmetadata.LicenseShortName / .UsageTerms auslesen,
 *      kategorisieren: kein Bild / CC0 oder Public Domain / andere Lizenz
 *      (mit Auflistung, welche Lizenzen vorkommen) / Bild referenziert, aber
 *      Commons-Metadaten nicht auflösbar (Datei gelöscht o. ä., Edge Case).
 *   5. Prozentzahlen berechnen und einen strukturierten Ergebnisbericht auf
 *      stdout ausgeben (Eingabe für den Issue-#16-Kommentar).
 *
 * Ausführung: node scripts/fetch-animals/measure-image-coverage.js
 * Laufzeit: ca. 1-3 Minuten (10 Wikidata-Batches + bis zu 10 Commons-Batches).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ANIMALS_PATH = path.join(REPO_ROOT, "data", "animals.json");

const WIKIDATA_API_ENDPOINT = "https://www.wikidata.org/w/api.php";
const COMMONS_API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
// Gleiche User-Agent-Policy wie fetch-animals.js (Wikimedia verlangt einen
// aussagekräftigen User-Agent).
const USER_AGENT =
  "tierquiz-kinder-measure-image-coverage/1.0 (https://github.com/Chris-Kraus/tierquiz-kinder; christian.b.kraus@icloud.com)";

const WIKIDATA_BATCH_SIZE = 50; // wbgetentities-Limit pro Request
const COMMONS_BATCH_SIZE = 50; // MediaWiki-Limit für mehrere `titles` pro Request (normale Nutzer)

// --- HTTP-Hilfsfunktionen (vereinfachte Variante von fetch-animals.js) ---

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

async function loadAnimalIds() {
  const raw = await readFile(ANIMALS_PATH, "utf-8");
  const data = JSON.parse(raw);
  return data.animals.map((a) => a.id);
}

// --- Schritt 2: P18 (image) via Wikidata batch-weise auflösen ------------

function getStringClaim(claims, prop) {
  const statements = claims[prop];
  if (!statements || statements.length === 0) return null;
  const val = statements[0].mainsnak && statements[0].mainsnak.datavalue;
  if (!val || val.type !== "string") return null;
  return val.value;
}

async function fetchP18(qids) {
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
      const filename = getStringClaim(entity.claims || {}, "P18");
      result.set(qid, filename);
    }
    done += batch.length;
    process.stdout.write(`\rWikidata P18-Abfrage: ${done}/${qids.length} Tiere geprüft`);
  }
  console.log("");
  return result;
}

// --- Schritt 3: Lizenz je Bild via Commons batch-weise auflösen ---------

// CC0 und gemeinfrei (Public Domain) gelten für die Bewertung von Option G
// (siehe Issue #16) als "attributionsfrei nutzbar". LicenseShortName-Werte
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
      // Normalisierung serverseitig aktiv lassen (Standard); Rückmapping
      // erfolgt unten über data.query.normalized.
    }).toString()}`;
    const data = await fetchWithRetry(url);
    const pages = (data.query && data.query.pages) || {};

    // Rückmapping normalisierter Titel -> ursprünglich angefragter Titel,
    // damit die Ergebnisse wieder den Original-Dateinamen zugeordnet werden
    // können (MediaWiki normalisiert z. B. Unterstriche zu Leerzeichen).
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
  console.log("measure-image-coverage.js — Messung der P18-Bildabdeckung und Commons-Lizenzverteilung");
  console.log("(reines Analyse-Skript für Issue #16, keine Schreibzugriffe)\n");

  const qids = await loadAnimalIds();
  console.log(`${qids.length} Tiere aus data/animals.json geladen.\n`);

  const p18ByQid = await fetchP18(qids);

  const withImage = [];
  const withoutImage = [];
  for (const [qid, filename] of p18ByQid.entries()) {
    if (filename) withImage.push({ qid, filename });
    else withoutImage.push(qid);
  }

  console.log(`\nP18 (image) vorhanden: ${withImage.length}/${qids.length}`);
  console.log(`P18 (image) fehlt: ${withoutImage.length}/${qids.length}\n`);

  // Mehrere Tiere könnten theoretisch dieselbe Datei referenzieren -> für
  // die Commons-Abfrage deduplizieren, für die Auswertung pro Tier aber
  // wieder zurückmappen.
  const uniqueFilenames = [...new Set(withImage.map((w) => w.filename))];
  console.log(`Davon eindeutige Commons-Dateinamen: ${uniqueFilenames.length}\n`);

  const licenseByFilename = await fetchCommonsLicenses(uniqueFilenames);

  let cc0PdCount = 0;
  let otherLicenseCount = 0;
  let unresolvableCount = 0;
  const otherLicenseCounts = new Map(); // licenseShortName -> count (pro Tier)

  for (const { filename } of withImage) {
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

  const total = qids.length;
  const pct = (n) => ((n / total) * 100).toFixed(1);

  console.log("\n=== Ergebnis ===\n");
  console.log(`Gesamt Tiere: ${total}`);
  console.log(`  Kein Bild (P18 fehlt):                     ${withoutImage.length} (${pct(withoutImage.length)} %)`);
  console.log(`  Bild vorhanden, CC0 oder Public Domain:    ${cc0PdCount} (${pct(cc0PdCount)} %)`);
  console.log(`  Bild vorhanden, andere Lizenz:              ${otherLicenseCount} (${pct(otherLicenseCount)} %)`);
  if (unresolvableCount > 0) {
    console.log(
      `  Bild referenziert, Commons-Metadaten nicht auflösbar (Edge Case): ${unresolvableCount} (${pct(unresolvableCount)} %)`,
    );
  }

  if (otherLicenseCounts.size > 0) {
    console.log(`\nVorkommende "andere" Lizenzen (Anzahl Tiere):`);
    for (const [license, count] of [...otherLicenseCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  - ${license}: ${count}`);
    }
  }

  console.log(`\n(Methodik: Wikidata wbgetentities in ${Math.ceil(total / WIKIDATA_BATCH_SIZE)} Batches à ${WIKIDATA_BATCH_SIZE} für P18; `);
  console.log(
    `Commons action=query&prop=imageinfo&iiprop=extmetadata in ${Math.ceil(uniqueFilenames.length / COMMONS_BATCH_SIZE)} Batches à ${COMMONS_BATCH_SIZE} Dateititel für Lizenzdaten.)`,
  );
}

main().catch((err) => {
  console.error("\nAbbruch mit Fehler:", err);
  process.exitCode = 1;
});
