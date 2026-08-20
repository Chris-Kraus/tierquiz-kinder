// Pro-Frage-Generierungsfunktion für den "Buchstabensuche"-Modus (Issue #46).
// Löst on demand (wie generateNextReverseQuestion() aus Issue #27, nicht
// batch-vorausgebaut wie generateQuestions() in questionGenerator.js) ein
// zufälliges Zieltier samt Bild auf.
//
// Schnittstelle laut architecture.md, "Neuer Spielmodus 'Buchstabensuche':
// Finale technische Leitplanken", Punkt 2:
//
//   generateNextLetterSearchQuestion(animals, usedAnimalIds, rng)
//
// Strukturell fast identisch zu reverseQuestionGenerator.js (Zieltier-Pool =
// Tiere mit image_filename, Bildauflösung vorab mit bis zu 3 Retry-
// Versuchen, usedAnimalIds-Ausschluss), aber bewusst EINFACHER: kein
// Falschantworten-Ziehen nötig (architecture.md: "es gibt keine 4
// Antwortoptionen, nur den einen Zielnamen, der Buchstabe für Buchstabe
// eingegeben wird") — daher auch keine category-Präferenz-Logik und kein
// dedupeAnimalsByName-Bedarf wie in reverseQuestionGenerator.js. Aus
// demselben Grund braucht diese Funktion (anders als
// generateNextReverseQuestion) auch KEINEN difficulty-Parameter: die
// Schwierigkeitsstufe beeinflusst hier ausschließlich die Lücken-Berechnung
// (buildLetterPuzzle() in letterPuzzle.js), die der aufrufende Bildschirm
// (letterSearch.js) separat mit quizState.difficulty aufruft, NICHT die
// Zieltier-/Bildauflösung dieser Funktion (architecture.md, Punkt 2).
//
// Rückgabeform: ein Fragenobjekt mit bereits aufgelöstem Bild (URL) und
// Attribution — kein `options`-Feld (anders als reverseQuestionGenerator.js),
// stattdessen nur `animalName` (der zu erratende Tiername, Buchstabe für
// Buchstabe einzutippen). letterSearch.js baut daraus mit buildLetterPuzzle()
// die Kästchen-Reihe.

import {
  buildCommonsImageInfoUrl,
  extractImageInfo,
  buildAttribution,
  REQUEST_TIMEOUT_MS,
} from "./imageHint.js";

// Erster Versuch + bis zu 3 Retry-Versuche mit jeweils neuem Zieltier =
// maximal 4 Versuche insgesamt, bevor die Funktion ablehnt (identisch zu
// reverseQuestionGenerator.js/soundQuestionGenerator.js, architecture.md:
// "Pro-Frage-Vorab-Auflösung eines einzelnen Bildes ... wie bei #27").
const MAX_RESOLUTION_ATTEMPTS = 4;

// Generischer, nicht verratender Alt-Text (design.md, "Barrierefreiheit":
// "Bild-alt-Text bewusst nicht verratend, analog zu #28") — der Tiername ist
// hier die gesuchte Antwort selbst, ein Klartext-Alt-Text würde sie für
// Screenreader-Nutzer:innen vorwegnehmen. Wortlaut exakt wie im Issue-Text
// vorgegeben.
export const LETTER_SEARCH_IMAGE_ALT_TEXT =
  "Foto eines Tieres – errate, wie es heißt";

/**
 * Wird geworfen, wenn nach MAX_RESOLUTION_ATTEMPTS Versuchen für kein
 * gezogenes Zieltier ein Bild auflösbar war (Netzwerkfehler, Timeout, nicht
 * auflösbare Datei) oder der Kandidatenpool vorher erschöpft ist — identisches
 * Verhalten/Fehlerklassen-Muster wie ReverseQuestionImageResolutionError.
 * Aufrufer (Start-Bildschirm/letterSearch.js) behandeln das als normalen,
 * kindgerecht abzufangenden Fehlschlag.
 */
export class LetterSearchImageResolutionError extends Error {
  constructor() {
    super(
      "Für kein gezogenes Zieltier konnte ein Bild aufgelöst werden (nach mehreren Versuchen).",
    );
    this.name = "LetterSearchImageResolutionError";
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function pickRandom(array, rng) {
  return array[Math.min(array.length - 1, Math.floor(rng() * array.length))];
}

/**
 * Löst das Bild eines einzelnen Tiers über die bestehende Commons-API auf —
 * identischer Mechanismus/identische Duplikation wie in
 * reverseQuestionGenerator.js (siehe dortiger Datei-Kommentar für die
 * Begründung, warum dieser kleine Helfer bewusst je Generator-Datei
 * dupliziert statt geteilt wird). Liefert `null`, wenn die Datei nicht
 * auflösbar ist; Netzwerkfehler/Timeout werfen.
 * @param {string} filename Commons-Dateiname (animal.image_filename)
 * @returns {Promise<{thumbUrl: string, artist: string|null, licenseShortName: string|null, licenseUrl: string|null}|null>}
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
 * Erzeugt die nächste Frage des "Buchstabensuche"-Modus (Issue #46) —
 * asynchron und on demand pro Frage, analog zu generateNextReverseQuestion().
 *
 * @param {object[]} animals vollständige Tierliste (aus data/animals.json).
 * @param {Set<string>} usedAnimalIds IDs bereits als Zieltier verwendeter
 *   Tiere der laufenden Runde — wird von dieser Funktion nicht mutiert, der
 *   Aufrufer trägt das zurückgelieferte `animalId` selbst nach (gleiche
 *   Konvention wie reverseQuestionGenerator.js/soundQuestionGenerator.js).
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random (Testbarkeit).
 * @returns {Promise<{id: string, animalId: string, animalName: string, image: {url: string, alt: string}, attribution: {text: string, licenseUrl: string|null}}>}
 *   löst mit einer fertigen Frage auf (Bild + Attribution bereits aufgelöst);
 *   lehnt mit LetterSearchImageResolutionError ab, wenn nach den
 *   spezifizierten Versuchen kein Bild auflösbar war.
 */
export async function generateNextLetterSearchQuestion(
  animals,
  usedAnimalIds,
  rng = Math.random,
) {
  if (!Array.isArray(animals)) {
    throw new Error(
      "generateNextLetterSearchQuestion: animals muss ein Array sein",
    );
  }

  const usableAnimals = animals.filter(
    (animal) =>
      animal &&
      isNonEmptyString(animal.id) &&
      isNonEmptyString(animal.name_de) &&
      isNonEmptyString(animal.image_filename),
  );

  // Zieltiere, die in diesem Aufruf bereits erfolglos versucht wurden —
  // verhindert, dass ein Retry dasselbe bereits gescheiterte Zieltier erneut
  // zieht (identisches Muster wie reverseQuestionGenerator.js).
  const triedAnimalIds = new Set();

  for (let attempt = 0; attempt < MAX_RESOLUTION_ATTEMPTS; attempt += 1) {
    const candidates = usableAnimals.filter(
      (animal) =>
        !usedAnimalIds.has(animal.id) && !triedAnimalIds.has(animal.id),
    );
    if (candidates.length === 0) break;

    const animal = pickRandom(candidates, rng);
    triedAnimalIds.add(animal.id);

    let imageInfo;
    try {
      imageInfo = await resolveAnimalImage(animal.image_filename);
    } catch {
      continue; // Netzwerkfehler/Timeout -> neues Zieltier versuchen
    }
    if (!imageInfo) continue; // Datei nicht auflösbar -> neues Zieltier versuchen

    return {
      id: `${animal.id}-letter-search`,
      animalId: animal.id,
      animalName: animal.name_de,
      image: {
        url: imageInfo.thumbUrl,
        alt: LETTER_SEARCH_IMAGE_ALT_TEXT,
      },
      attribution: buildAttribution(imageInfo),
    };
  }

  throw new LetterSearchImageResolutionError();
}
