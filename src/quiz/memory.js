// Spiellogik für den "Tier-Memory"-Modus (Issue #45): Kartenpaar-Auswahl,
// Batch-Vorab-Auflösung aller Kartenbilder sowie der reine Paarvergleich —
// bewusst getrennt vom Bildschirm-Modul (src/screens/memory.js), analog zur
// bestehenden Projekt-Trennung quiz/ (Logik) vs. screens/ (Darstellung), siehe
// architecture.md, Abschnitt "Neuer Spielmodus 'Tier-Memory': Finale
// technische Leitplanken", Punkt 3.
//
// Wiederverwendung: der komplette Live-Bild-Mechanismus aus Issue #16/#28
// (imageHint.js: buildCommonsImageInfoUrl/extractImageInfo/buildAttribution)
// bleibt unverändert — der einzige echte Neubau hier ist die
// Batch-Vorab-Auflösung MEHRERER Bilder gleichzeitig (Punkt 2 der
// Leitplanken), da bei Memory anders als bei "Wer bin ich?"/"Tiergeräusche"
// alle Kartenbilder feststehen müssen, BEVOR das Brett angezeigt wird (kein
// Nachladen mitten im Spiel).
//
// Ablauf von buildMemoryDeck():
// 1. Kandidatenpool: alle Tiere mit befülltem image_filename, dedupe nach
//    name_de (wie dedupeAnimalsByName in reverseQuestionGenerator.js/
//    questionGenerator.js), gemischt mit der übergebenen rng.
// 2. Die ersten getMemoryPairCountForDifficulty(difficulty) Tiere sind die
//    Erstauswahl, der Rest dient als Ersatztier-Reserve.
// 3. Für jedes gezogene Tier wird das Bild aufgelöst (identischer
//    imageinfo-Call wie #16/#27/#32). Schlägt die Auflösung fehl, wird bis zu
//    3-mal ein Ersatztier aus der Reserve gezogen und erneut versucht, bevor
//    diese Kartenposition endgültig als gescheitert gilt. Alle Positionen
//    werden dabei parallel aufgelöst (Promise.all), nicht nacheinander.
// 4. Scheitert auch nur eine Position endgültig, lehnt die gesamte Funktion
//    mit MemoryDeckResolutionError ab — kein Rundenabbruch-Sonderfall hier,
//    der Aufrufer (Moduseinstieg am Start-Bildschirm bzw. screens/memory.js)
//    behandelt das wie jeden anderen Bildauflösungs-Fehlschlag der übrigen
//    Modi (freundlicher Hinweis/Retry, siehe design.md).
// 5. Aus jedem aufgelösten Tier werden zwei Karten-Einträge erzeugt
//    (cardId `${animalId}-a`/`${animalId}-b`), das gesamte Karten-Array wird
//    danach gemischt — Kartenposition ist damit unabhängig von der
//    Ziehreihenfolge der Tiere.

import {
  buildCommonsImageInfoUrl,
  extractImageInfo,
  buildAttribution,
  REQUEST_TIMEOUT_MS,
} from "./imageHint.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";
import { getMemoryPairCountForDifficulty } from "./difficulty.js";

// Erster Versuch + bis zu 3 Ersatztier-Versuche = maximal 4 Versuche pro
// Kartenposition, bevor diese Position endgültig scheitert (analog
// MAX_RESOLUTION_ATTEMPTS in reverseQuestionGenerator.js/
// soundQuestionGenerator.js).
const MAX_RESOLUTION_ATTEMPTS = 4;

/**
 * Wird geworfen, wenn für mindestens eine Kartenposition nach mehreren
 * Ersatztier-Versuchen kein Bild auflösbar war, oder wenn der Kandidatenpool
 * (Tiere mit image_filename) kleiner ist als die für die Schwierigkeitsstufe
 * benötigte Paaranzahl. Aufrufer behandeln das als normalen, kindgerecht
 * abzufangenden Fehlschlag (analog ReverseQuestionImageResolutionError).
 */
export class MemoryDeckResolutionError extends Error {
  constructor() {
    super(
      "Für das Tier-Memory-Brett konnten nicht genug Kartenbilder aufgelöst werden.",
    );
    this.name = "MemoryDeckResolutionError";
  }
}

// Nicht-verratender Alt-Text-Baustein (design.md, "Barrierefreiheit":
// "kein Tiername im Alt-Text verdeckter/aufgedeckter Karten"). Die konkrete
// Kartenposition wird erst im Bildschirm-Modul (screens/memory.js) ergänzt,
// da sie von der finalen, gemischten Reihenfolge abhängt, die dieses Modul
// selbst erzeugt.
export const MEMORY_CARD_IMAGE_ALT_TEXT = "Tierbild";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Identisch zum Fisher-Yates-Shuffle in questionGenerator.js/
// reverseQuestionGenerator.js/soundQuestionGenerator.js.
function shuffle(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Identisch zu dedupeAnimalsByName in reverseQuestionGenerator.js/
// soundQuestionGenerator.js — bewusst hier dupliziert statt importiert
// (gleiche Begründung wie dort: bewusst unabhängige, parallele Fragepfade).
function dedupeAnimalsByName(animalList) {
  const seen = new Set();
  const result = [];
  for (const animal of animalList) {
    if (seen.has(animal.name_de)) continue;
    seen.add(animal.name_de);
    result.push(animal);
  }
  return result;
}

/**
 * Löst das Bild eines einzelnen Tiers über die bestehende Commons-API auf —
 * identischer Mechanismus wie resolveAnimalImage in
 * reverseQuestionGenerator.js/soundQuestionGenerator.js. Liefert `null`, wenn
 * die Datei nicht auflösbar ist; Netzwerkfehler/Timeout werfen.
 * @param {string} filename
 */
async function resolveAnimalImage(filename) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(buildCommonsImageInfoUrl(filename), {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return extractImageInfo(json);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Löst die Kartenposition für `initialAnimal` auf, mit bis zu 3
 * Ersatztier-Versuchen aus `reserve` bei Fehlschlag (siehe Datei-Kommentar
 * oben, Punkt 3). `takeReserve` entnimmt synchron ein weiteres, noch nicht
 * verwendetes Ersatztier aus der gemeinsamen Reserve (geteilter Zustand
 * zwischen den parallel laufenden Positionen, aber unkritisch: die Entnahme
 * selbst passiert stets synchron zwischen zwei `await`s, kein Race
 * möglich).
 * @returns {Promise<{animal: object, imageInfo: object}>}
 */
async function resolveDeckSlot(initialAnimal, takeReserve) {
  let animal = initialAnimal;
  for (let attempt = 0; attempt < MAX_RESOLUTION_ATTEMPTS; attempt += 1) {
    if (!animal) return null;

    let imageInfo = null;
    try {
      imageInfo = await resolveAnimalImage(animal.image_filename);
    } catch {
      imageInfo = null; // Netzwerkfehler/Timeout -> Ersatztier versuchen
    }
    if (imageInfo) return { animal, imageInfo };

    animal = takeReserve();
  }
  return null;
}

/**
 * Vergleicht zwei aufgedeckte Karten (reine, DOM-freie Funktion, siehe
 * architecture.md Punkt 3) — ein Treffer bedeutet dasselbe Tier, nicht
 * dieselbe Karte (jede Karte kommt genau einmal vor, cardA !== cardB ist vom
 * Aufrufer bereits sichergestellt).
 * @param {{animalId: string}} cardA
 * @param {{animalId: string}} cardB
 * @returns {boolean}
 */
export function checkMatch(cardA, cardB) {
  return Boolean(cardA) && Boolean(cardB) && cardA.animalId === cardB.animalId;
}

/**
 * Baut ein vollständig aufgelöstes, gemischtes Kartenset für eine
 * Tier-Memory-Runde (Issue #45). Alle Kartenbilder sind bei Rückgabe bereits
 * geladen — kein Nachladen mehr nötig, sobald das Brett gerendert wird.
 * @param {object[]} animals vollständige Tierliste (aus data/animals.json)
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random
 * @returns {Promise<{cardId: string, animalId: string, thumbUrl: string, attribution: {text: string, licenseUrl: string|null}}[]>}
 *   gemischtes Array mit genau 2 × Paaranzahl Karten.
 */
export async function buildMemoryDeck(animals, difficulty, rng = Math.random) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(`buildMemoryDeck: unbekannte Schwierigkeitsstufe "${difficulty}"`);
  }
  if (!Array.isArray(animals)) {
    throw new Error("buildMemoryDeck: animals muss ein Array sein");
  }

  const pairCount = getMemoryPairCountForDifficulty(difficulty);

  const usableAnimals = dedupeAnimalsByName(
    animals.filter(
      (animal) =>
        animal &&
        isNonEmptyString(animal.id) &&
        isNonEmptyString(animal.name_de) &&
        isNonEmptyString(animal.image_filename),
    ),
  );
  if (usableAnimals.length < pairCount) {
    throw new MemoryDeckResolutionError();
  }

  const shuffledPool = shuffle(usableAnimals, rng);
  const initialPicks = shuffledPool.slice(0, pairCount);
  const reserve = shuffledPool.slice(pairCount);

  // Gemeinsame, synchron entnommene Ersatztier-Reserve für alle parallel
  // laufenden resolveDeckSlot-Aufrufe (siehe dortiger Funktions-Kommentar).
  let reserveIndex = 0;
  function takeReserve() {
    if (reserveIndex >= reserve.length) return null;
    const animal = reserve[reserveIndex];
    reserveIndex += 1;
    return animal;
  }

  const resolvedSlots = await Promise.all(
    initialPicks.map((animal) => resolveDeckSlot(animal, takeReserve)),
  );

  if (resolvedSlots.some((slot) => !slot)) {
    throw new MemoryDeckResolutionError();
  }

  const cards = [];
  resolvedSlots.forEach(({ animal, imageInfo }) => {
    const attribution = buildAttribution(imageInfo);
    cards.push({
      cardId: `${animal.id}-a`,
      animalId: animal.id,
      thumbUrl: imageInfo.thumbUrl,
      attribution,
    });
    cards.push({
      cardId: `${animal.id}-b`,
      animalId: animal.id,
      thumbUrl: imageInfo.thumbUrl,
      attribution,
    });
  });

  return shuffle(cards, rng);
}
