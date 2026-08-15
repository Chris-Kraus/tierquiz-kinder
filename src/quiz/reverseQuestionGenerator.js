// Pro-Frage-Generierungsfunktion für den "Wer bin ich?"-Modus (Umkehr-Quiz,
// Issue #27). Löst on demand (nicht batch-vorausgebaut für eine ganze Runde
// wie generateQuestions() in questionGenerator.js) ein zufälliges Zieltier
// samt Bild auf und liefert eine fertige 4-Optionen-Frage.
//
// Schnittstelle wurde bereits in Issue #26 mit `software-architect`
// abgestimmt (siehe docs/workflow/architecture.md, Abschnitt "1. Umkehr-Quiz"
// -> "Finale technische Leitplanken"):
//
//   generateNextReverseQuestion(animals, usedAnimalIds, difficulty, rng)
//
// Ablauf pro Aufruf:
// 1. Zieltier-Auswahl: zufällig aus allen Tieren mit befülltem
//    `image_filename` (100 % Abdeckung laut Issue-#16-Messung), abzüglich
//    `usedAnimalIds` (gleiche Konvention wie questionGenerator.js) sowie
//    bereits in diesem Aufruf erfolglos versuchter Tiere.
// 2. Bildauflösung: derselbe Commons-`imageinfo`-Call wie die bestehende
//    Bild-Rateshilfe (Issue #16, siehe imageHint.js: `iiurlwidth=330`,
//    `origin=*`, `extmetadata`) — hier aber als Pflichtbestandteil VOR
//    Rückgabe der Frage aufgelöst, nicht optional erst nach Klick wie dort.
// 3. Schlägt die Bildauflösung fehl (Netzwerkfehler, Timeout, nicht
//    auflösbare Datei), wird bis zu 3 Mal ein neues Zieltier gezogen und
//    erneut versucht (macht insgesamt maximal 4 Versuche). Scheitert auch
//    der letzte Versuch, lehnt die Funktion mit
//    ReverseQuestionImageResolutionError ab — der Frage-Bildschirm (#28)
//    zeigt dann den in design.md dokumentierten freundlichen Retry-Zustand,
//    kein Rundenabbruch, kein Zurückspringen zur Modus-Auswahl.
// 4. Falschantworten: 3 weitere Tiernamen, bevorzugt aus derselben
//    `category` wie das Zieltier (neue Logik, bewusst NICHT
//    `buildIdentifyQuestion` aus questionGenerator.js wiederverwendet, da
//    jene Funktion rein zufällig ohne Kategorie-Präferenz zieht, siehe
//    dortiger Datei-Kommentar sowie architecture.md, Abschnitt "1.
//    Umkehr-Quiz" -> "Finale technische Leitplanken"). Reichen die eindeutig
//    benannten Kandidaten derselben Kategorie nicht aus (seltener Randfall
//    bei sehr kleinen Kategorien wie z. B. "Spinnentier" mit nur 1 Tier im
//    Datensatz), wird mit Kandidaten aus anderen Kategorien aufgefüllt,
//    damit die Frage trotzdem entsteht statt zu scheitern.
//
// Wiederverwendung als "Testabruf" bei Moduseinstieg (Issue #26,
// src/screens/start.js): der dortige Klick-Handler ruft diese Funktion
// bereits für Frage 1 der Runde auf — kein separater Health-Check-Mechanismus
// nötig, siehe Datei-Kommentar dort.
//
// Rückgabeform (siehe JSDoc unten): ein Fragenobjekt mit bereits aufgelöstem
// Bild (URL) und Attribution. #28 zeigt daraus Bild + Attributionszeile + die
// 4 Namensoptionen an, siehe design.md "Frage-/Feedback-Bildschirm 'Wer bin
// ich?'" für die genaue Bildschirmgestaltung (bewusst NICHT Teil dieser
// Datei/Story — #27 liefert nur die Datengrundlage).

import {
  buildCommonsImageInfoUrl,
  extractImageInfo,
  buildAttribution,
  REQUEST_TIMEOUT_MS,
} from "./imageHint.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

const WRONG_OPTION_COUNT = 3;

// Erster Versuch + bis zu 3 Retry-Versuche mit jeweils neuem Zieltier =
// maximal 4 Versuche insgesamt, bevor die Funktion ablehnt (siehe
// architecture.md, "Finale technische Leitplanken", Bildauflösung-Abschnitt).
const MAX_RESOLUTION_ATTEMPTS = 4;

// Generischer, nicht verratender Alt-Text (design.md, "Frage-/Feedback-
// Bildschirm 'Wer bin ich?'" -> "Barrierefreiheit — wichtige Abweichung von
// Issue #16"): anders als bei der optionalen Bild-Rateshilfe (dort ist der
// Tiername durch den Fragetext bereits bekannt, das Bild illustriert nur)
// wäre ein Klartext-Tiername im Alt-Text hier die gesuchte Antwort selbst —
// würde die Antwort für Screenreader-Nutzer:innen vorwegnehmen.
export const REVERSE_QUESTION_IMAGE_ALT_TEXT =
  "Foto eines Tieres – errate, welches Tier das ist";

/**
 * Wird geworfen, wenn nach MAX_RESOLUTION_ATTEMPTS Versuchen für kein
 * gezogenes Zieltier ein Bild auflösbar war (Netzwerkfehler, Timeout, nicht
 * auflösbare Datei) oder der Kandidatenpool vorher erschöpft ist (siehe
 * Datei-Kommentar oben, Punkt 3). Aufrufer (Start-Bildschirm #26,
 * Frage-Bildschirm #28) behandeln das als normalen, kindgerecht
 * abzufangenden Fehlschlag — genau wie zuvor
 * ReverseQuestionGeneratorNotImplementedError vor dieser Story.
 */
export class ReverseQuestionImageResolutionError extends Error {
  constructor() {
    super(
      "Für kein gezogenes Zieltier konnte ein Bild aufgelöst werden (nach mehreren Versuchen).",
    );
    this.name = "ReverseQuestionImageResolutionError";
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Identisch zum Fisher-Yates-Shuffle in questionGenerator.js.
function shuffle(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom(array, rng) {
  const index = Math.min(array.length - 1, Math.floor(rng() * array.length));
  return array[index];
}

// Identisch zu dedupeAnimalsByName in questionGenerator.js — bewusst hier
// dupliziert statt importiert: questionGenerator.js exportiert diese
// Hilfsfunktion nicht (reines modulinternes Detail dort), ein Re-Export nur
// für diese eine Funktion wäre eine unnötige Kopplung zwischen den beiden
// unabhängigen Fragegenerierungs-Pfaden (siehe architecture.md: bewusst
// getrennte, parallele Fragepfade).
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
 * Löst das Bild eines einzelnen Tiers über die bestehende Commons-API auf
 * (identischer Mechanismus wie die Bild-Rateshilfe, Issue #16, siehe
 * imageHint.js sowie question.js/handleImageHintClick für das
 * AbortController+Timeout-Muster). Liefert die geparsten Bildinfos, oder
 * `null`, wenn die Datei nicht auflösbar ist (z. B. gelöscht, kein
 * `thumburl`) — beides behandelt der Aufrufer gleich: "dieses Zieltier taugt
 * nicht, neues ziehen" (siehe Datei-Kommentar oben, Punkt 3). Netzwerkfehler
 * und Timeout werfen und werden dort ebenfalls als Fehlschlag dieses
 * Versuchs behandelt.
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
 * Zieht bis zu WRONG_OPTION_COUNT Falschantwort-Tiere für `animal`, bevorzugt
 * aus derselben `category` (siehe Datei-Kommentar oben, Punkt 4): dedupe nach
 * `name_de` (wie `dedupeAnimalsByName`), Ausschluss des Zieltiers selbst
 * sowie bereits in der Runde verwendeter Tiere (`usedAnimalIds`, gleiche
 * Konvention wie `buildIdentifyQuestion` in questionGenerator.js). Reichen
 * die gleiche-Kategorie-Kandidaten nicht für WRONG_OPTION_COUNT, wird mit
 * Kandidaten aus anderen Kategorien aufgefüllt. Liefert `null`, wenn auch
 * danach nicht genug eindeutig benannte Kandidaten verfügbar sind.
 * @returns {object[]|null}
 */
function pickWrongAnswerAnimals({ animal, animals, usedAnimalIds, rng }) {
  const eligible = animals.filter(
    (other) =>
      other &&
      isNonEmptyString(other.id) &&
      isNonEmptyString(other.name_de) &&
      other.id !== animal.id &&
      other.name_de !== animal.name_de &&
      !usedAnimalIds.has(other.id),
  );

  const sameCategory = dedupeAnimalsByName(
    eligible.filter((other) => other.category === animal.category),
  );
  const sameCategoryNames = new Set(sameCategory.map((other) => other.name_de));
  const otherCategory = dedupeAnimalsByName(
    eligible.filter((other) => other.category !== animal.category),
  ).filter((other) => !sameCategoryNames.has(other.name_de));

  const ordered = [...shuffle(sameCategory, rng), ...shuffle(otherCategory, rng)];
  if (ordered.length < WRONG_OPTION_COUNT) return null;

  return ordered.slice(0, WRONG_OPTION_COUNT);
}

/**
 * Baut das fertige Fragenobjekt für ein Zieltier mit bereits aufgelöstem
 * Bild, oder `null`, wenn nicht genug eindeutig benannte Falschantwort-Tiere
 * verfügbar sind (siehe pickWrongAnswerAnimals) — praktisch nur bei extrem
 * kleinen/bereits stark verbrauchten Tierbeständen relevant; der Aufrufer
 * behandelt das wie einen Bildauflösungs-Fehlschlag (neues Zieltier statt
 * Absturz).
 */
function buildReverseQuestion({ animal, animals, usedAnimalIds, imageInfo, rng }) {
  const wrongAnimals = pickWrongAnswerAnimals({
    animal,
    animals,
    usedAnimalIds,
    rng,
  });
  if (!wrongAnimals) return null;

  const options = shuffle(
    [
      { text: animal.name_de, correct: true },
      ...wrongAnimals.map((other) => ({ text: other.name_de, correct: false })),
    ],
    rng,
  );

  return {
    id: `${animal.id}-reverse-identify`,
    animalId: animal.id,
    animalName: animal.name_de,
    field: "reverse_identify",
    questionType: "reverseIdentify",
    // Bereits vollständig aufgelöst (siehe Datei-Kommentar oben, Punkt 2) —
    // #28 muss keinen eigenen Netzwerk-Call mehr auslösen, nur noch anzeigen.
    image: {
      url: imageInfo.thumbUrl,
      alt: REVERSE_QUESTION_IMAGE_ALT_TEXT,
    },
    attribution: buildAttribution(imageInfo),
    options,
  };
}

/**
 * Erzeugt die nächste Frage des "Wer bin ich?"-Modus (Umkehr-Quiz, Issue
 * #27) — asynchron und on demand pro Frage (nicht batch-vorausgebaut wie
 * `generateQuestions()` in questionGenerator.js, siehe Datei-Kommentar oben).
 *
 * @param {object[]} animals vollständige Tierliste (aus data/animals.json),
 *   analog zum ersten Parameter von generateQuestions() in
 *   questionGenerator.js.
 * @param {Set<string>} usedAnimalIds IDs bereits als Zieltier verwendeter
 *   Tiere der laufenden Runde (Duplikat-Vermeidung, gleiche Konvention wie
 *   questionGenerator.js) — wird von dieser Funktion nicht mutiert, der
 *   Aufrufer trägt das zurückgelieferte `animalId` selbst nach.
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 *   (difficulty.js) — wird validiert (schnelles Scheitern bei unbekanntem
 *   Wert, analog zu createQuizState/getFieldsForDifficulty); beeinflusst
 *   aktuell keine weitere Logik dieser Funktion (Falschantworten-Ziehung ist
 *   hier bewusst stufenunabhängig, siehe Datei-Kommentar oben, Punkt 4).
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random (Testbarkeit,
 *   analog zu bestehenden Mustern in questionGenerator.js).
 * @returns {Promise<object>} löst mit einer fertigen Frage auf (Bild +
 *   Attribution bereits aufgelöst, siehe buildReverseQuestion oben für die
 *   exakte Form); lehnt mit ReverseQuestionImageResolutionError ab, wenn
 *   nach den in #27 spezifizierten Versuchen kein Bild auflösbar war.
 */
export async function generateNextReverseQuestion(
  animals,
  usedAnimalIds,
  difficulty,
  rng = Math.random,
) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(
      `generateNextReverseQuestion: unbekannte Schwierigkeitsstufe "${difficulty}"`,
    );
  }
  if (!Array.isArray(animals)) {
    throw new Error(
      "generateNextReverseQuestion: animals muss ein Array sein",
    );
  }

  const usableAnimals = animals.filter(
    (animal) =>
      animal &&
      isNonEmptyString(animal.id) &&
      isNonEmptyString(animal.name_de) &&
      isNonEmptyString(animal.image_filename),
  );

  // Zieltiere, die in diesem Aufruf bereits erfolglos versucht wurden (siehe
  // Datei-Kommentar oben, Punkt 3) — verhindert, dass ein Retry dasselbe
  // bereits gescheiterte Zieltier erneut zieht.
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

    const question = buildReverseQuestion({
      animal,
      animals,
      usedAnimalIds,
      imageInfo,
      rng,
    });
    if (question) return question;
    // Kein gültiges Fragenobjekt bildbar (siehe buildReverseQuestion) ->
    // wie ein Auflösungs-Fehlschlag behandelt, nächster Versuch.
  }

  throw new ReverseQuestionImageResolutionError();
}
