// Fragenauswahl aus der Tierdatenbank inkl. Falschantworten-Logik (siehe
// architecture.md, Abschnitt "Projektstruktur" und "Schwierigkeitsstufen —
// Zuordnung zu vorhandenen Feldern").
//
// Bewusst NICHT: `import animals from "../../data/animals.json"`. Issue #2
// (Wikidata-Import, Erzeugung von data/animals.json) läuft parallel zu diesem
// Issue (#5) und ist zum Zeitpunkt dieser Umsetzung ggf. noch nicht fertig.
// Diese Datei nimmt die Tierliste stattdessen als Parameter entgegen
// (`generateQuestions(animals, options)`), damit die Logik unabhängig vom
// Fertigstellungsstand von Issue #2 entwickel- und testbar ist (siehe
// src/quiz/__fixtures__/sampleAnimals.js für Tests). Der Frage-Bildschirm
// (Issue #6) ruft `generateQuestions` später mit der echten, importierten
// Liste aus data/animals.json auf.

import {
  DIFFICULTY_LEVELS,
  getFieldsForDifficulty,
  getWrongAnswerStrategyForDifficulty,
} from "./difficulty.js";

// Rundenlänge als Konstante statt hart verteilt im Code (siehe
// requirements.md Punkt 7, "leicht anpassbar").
export const DEFAULT_ROUND_LENGTH = 10;

const OPTION_COUNT = 4;
const WRONG_OPTION_COUNT = OPTION_COUNT - 1;

// Feste Reihenfolge für "näher am richtigen Wert"-Vergleiche bei
// conservation_status (kein numerisches Feld, aber ordinal gestuft).
const CONSERVATION_STATUS_ORDER = [
  "nicht gefährdet",
  "gefährdet",
  "stark gefährdet",
  "vom Aussterben bedroht",
];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function formatNumber(value) {
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 10) / 10);
}

// Pro Feld: wie eine Frage/Antwort dazu aussieht. `kind` steuert, ob der Wert
// ein einzelner Enum-Wert, ein Array (mehrere mögliche Werte je Tier) oder
// eine Zahl ist — das bestimmt, wie der "richtige Wert" für eine Frage
// gezogen wird und wie Falschantworten verglichen werden.
const FIELD_DEFINITIONS = {
  category: {
    kind: "enum",
    question: (name) => `Zu welcher Tiergruppe gehört das Tier ${name}?`,
    identifyQuestion: (value) => `Welches Tier gehört zur Gruppe „${value}“?`,
    getValue: (animal) =>
      isNonEmptyString(animal.category) ? animal.category : null,
    hasValue: (animal, value) => animal.category === value,
    format: (value) => value,
  },
  habitat: {
    kind: "array",
    question: (name) => `Wo lebt das Tier ${name}?`,
    identifyQuestion: (value) => `Welches Tier lebt hier: ${value}?`,
    getValues: (animal) => animal.habitat,
    hasValue: (animal, value) =>
      Array.isArray(animal.habitat) && animal.habitat.includes(value),
    format: (value) => value,
  },
  continent: {
    kind: "array",
    question: (name) => `Auf welchem Kontinent lebt das Tier ${name}?`,
    identifyQuestion: (value) => `Welches Tier lebt hier: ${value}?`,
    getValues: (animal) => animal.continent,
    hasValue: (animal, value) =>
      Array.isArray(animal.continent) && animal.continent.includes(value),
    format: (value) => value,
  },
  color: {
    kind: "array",
    question: (name) => `Welche Farbe hat das Tier ${name}?`,
    identifyQuestion: (value) => `Welches Tier hat die Farbe „${value}“?`,
    getValues: (animal) => animal.color,
    hasValue: (animal, value) =>
      Array.isArray(animal.color) && animal.color.includes(value),
    format: (value) => value,
  },
  diet: {
    kind: "enum",
    question: (name) => `Was frisst das Tier ${name}?`,
    identifyQuestion: (value) => `Welches Tier ist ein „${value}“?`,
    getValue: (animal) => (isNonEmptyString(animal.diet) ? animal.diet : null),
    hasValue: (animal, value) => animal.diet === value,
    format: (value) => value,
  },
  weight_kg: {
    kind: "number",
    question: (name) => `Wie viel wiegt das Tier ${name} ungefähr?`,
    identifyQuestion: (value) =>
      `Welches Tier wiegt ungefähr ${formatNumber(value)} kg?`,
    getValue: (animal) =>
      isFiniteNumber(animal.weight_kg) ? animal.weight_kg : null,
    hasValue: (animal, value) => animal.weight_kg === value,
    format: (value) => `${formatNumber(value)} kg`,
  },
  length_cm: {
    kind: "number",
    question: (name) => `Wie lang ist das Tier ${name} ungefähr?`,
    identifyQuestion: (value) =>
      `Welches Tier ist ungefähr ${formatNumber(value)} cm lang?`,
    getValue: (animal) =>
      isFiniteNumber(animal.length_cm) ? animal.length_cm : null,
    hasValue: (animal, value) => animal.length_cm === value,
    format: (value) => `${formatNumber(value)} cm`,
  },
  lifespan_years: {
    kind: "number",
    question: (name) => `Wie alt wird das Tier ${name} ungefähr?`,
    identifyQuestion: (value) =>
      `Welches Tier wird ungefähr ${formatNumber(value)} Jahre alt?`,
    getValue: (animal) =>
      isFiniteNumber(animal.lifespan_years) ? animal.lifespan_years : null,
    hasValue: (animal, value) => animal.lifespan_years === value,
    format: (value) => `${formatNumber(value)} Jahre`,
  },
  conservation_status: {
    kind: "enum",
    order: CONSERVATION_STATUS_ORDER,
    question: (name) => `Wie gefährdet ist das Tier ${name}?`,
    identifyQuestion: (value) =>
      `Welches Tier hat den Gefährdungsstatus „${value}“?`,
    getValue: (animal) =>
      isNonEmptyString(animal.conservation_status)
        ? animal.conservation_status
        : null,
    hasValue: (animal, value) => animal.conservation_status === value,
    format: (value) => value,
  },
};

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

/** Ermittelt den "richtigen Wert" einer Frage für ein Tier/Feld, oder `null`,
 * wenn das Feld bei diesem Tier fehlt (Pflicht laut architecture.md: fehlende
 * optionale Felder überspringen statt crashen). */
function getCorrectValue(def, animal, rng) {
  if (def.kind === "array") {
    const values = def.getValues(animal);
    if (!Array.isArray(values)) return null;
    const usable = values.filter(isNonEmptyString);
    if (usable.length === 0) return null;
    return pickRandom(usable, rng);
  }
  return def.getValue(animal);
}

/** Baut eine "Wert"-Frage: Fragetext bezieht sich auf `animal`, die 4
 * Optionen sind Feldwerte (1 korrekt + 3 aus anderen Tieren gezogen). Liefert
 * `null`, wenn dafür nicht genug unterschiedliche Falschantworten im
 * Datensatz vorhanden sind (z. B. Felder mit sehr wenigen möglichen Werten
 * wie `diet`) — dann versucht der Aufrufer die "Identifizieren"-Variante. */
function buildValueQuestion({
  def,
  field,
  animal,
  correctValue,
  otherAnimals,
  wrongAnswerStrategy,
  rng,
}) {
  const pool = new Map(); // Anzeigetext -> Rohwert (für Sortierung nach Nähe)

  for (const other of otherAnimals) {
    const candidates =
      def.kind === "array"
        ? Array.isArray(def.getValues(other))
          ? def.getValues(other)
          : []
        : [def.getValue(other)];

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      if (def.kind === "number" && !isFiniteNumber(candidate)) continue;
      if (typeof candidate === "string" && !isNonEmptyString(candidate))
        continue;
      if (candidate === correctValue) continue;
      // Array-Felder: Werte überspringen, die auch beim gefragten Tier selbst
      // zutreffen (sonst wäre die "Falschantwort" eigentlich richtig).
      if (def.kind === "array" && def.hasValue(animal, candidate)) continue;

      const display = def.format(candidate);
      if (!pool.has(display)) {
        pool.set(display, candidate);
      }
    }
  }

  if (pool.size < WRONG_OPTION_COUNT) return null;

  const entries = Array.from(pool.entries());
  let chosen;

  const canRankByDistance = def.kind === "number" || Boolean(def.order);
  if (wrongAnswerStrategy === "close" && canRankByDistance) {
    const distance = (value) =>
      def.order
        ? Math.abs(def.order.indexOf(value) - def.order.indexOf(correctValue))
        : Math.abs(value - correctValue);
    chosen = entries
      .slice()
      .sort((a, b) => distance(a[1]) - distance(b[1]))
      .slice(0, WRONG_OPTION_COUNT);
  } else {
    chosen = shuffle(entries, rng).slice(0, WRONG_OPTION_COUNT);
  }

  const options = shuffle(
    [
      { text: def.format(correctValue), correct: true },
      ...chosen.map(([display]) => ({ text: display, correct: false })),
    ],
    rng,
  );

  return {
    id: `${animal.id}-${field}-value`,
    animalId: animal.id,
    animalName: animal.name_de,
    field,
    questionType: "value",
    text: def.question(animal.name_de),
    options,
  };
}

/** Fallback-Frageform: "Welches Tier hat/ist ...?" — die 4 Optionen sind
 * Tiernamen statt Feldwerten. Nötig für Felder mit sehr wenigen möglichen
 * Werten (z. B. `diet` mit nur 3 Enum-Werten insgesamt: aus anderen Tieren
 * lassen sich dafür nie 3 unterschiedliche Falsch-*Werte* ziehen). Die
 * Falschantworten sind trotzdem "aus anderen Tieren im Datensatz gezogen"
 * (siehe Akzeptanzkriterien), nur eben als Tiername statt Feldwert. */
function buildIdentifyQuestion({
  def,
  field,
  animal,
  correctValue,
  otherAnimals,
  usedAnimalIds,
  rng,
}) {
  const wrongCandidates = otherAnimals.filter((other) => {
    if (usedAnimalIds.has(other.id)) return false;
    if (!isNonEmptyString(other.name_de)) return false;
    if (other.name_de === animal.name_de) return false;
    return !def.hasValue(other, correctValue);
  });

  const uniqueWrongCandidates = dedupeAnimalsByName(wrongCandidates);
  if (uniqueWrongCandidates.length < WRONG_OPTION_COUNT) return null;

  const chosen = shuffle(uniqueWrongCandidates, rng).slice(
    0,
    WRONG_OPTION_COUNT,
  );

  const options = shuffle(
    [
      { text: animal.name_de, correct: true },
      ...chosen.map((other) => ({ text: other.name_de, correct: false })),
    ],
    rng,
  );

  return {
    id: `${animal.id}-${field}-identify`,
    animalId: animal.id,
    animalName: animal.name_de,
    field,
    questionType: "identify",
    text: def.identifyQuestion(correctValue),
    options,
  };
}

/**
 * Baut eine einzelne Frage für ein bestimmtes Tier/Feld, oder `null`, wenn
 * dafür (z. B. wegen fehlender Daten) keine gültige 4-Optionen-Frage gebildet
 * werden kann. Primär von `generateQuestions` genutzt, aber auch direkt
 * exportiert — nützlich für gezielte Tests einzelner Feld-Strategien.
 * @param {object} animal Tier, über das die Frage gestellt wird
 * @param {string} field eines der von FIELD_DEFINITIONS unterstützten Felder
 * @param {object[]} animals vollständige Tierliste (Quelle für Falschantworten)
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random (für Tests austauschbar)
 */
export function buildQuestionForField(
  animal,
  field,
  animals,
  difficulty,
  rng = Math.random,
) {
  const def = FIELD_DEFINITIONS[field];
  if (!def || !animal) return null;

  const correctValue = getCorrectValue(def, animal, rng);
  if (correctValue === null || correctValue === undefined) return null;

  const otherAnimals = animals.filter(
    (other) => other && other.id !== animal.id,
  );
  const wrongAnswerStrategy = getWrongAnswerStrategyForDifficulty(difficulty);

  const valueQuestion = buildValueQuestion({
    def,
    field,
    animal,
    correctValue,
    otherAnimals,
    wrongAnswerStrategy,
    rng,
  });
  if (valueQuestion) return valueQuestion;

  return buildIdentifyQuestion({
    def,
    field,
    animal,
    correctValue,
    otherAnimals,
    usedAnimalIds: new Set(),
    rng,
  });
}

/**
 * Erzeugt eine Runde Multiple-Choice-Fragen aus einer gegebenen Tierliste.
 *
 * Reine Funktion, kein DOM-Zugriff, keine Abhängigkeit von data/animals.json
 * (siehe Datei-Kommentar oben) — die Tierliste kommt als Parameter.
 *
 * @param {object[]} animals Tierliste, je Eintrag laut architecture.md-Schema
 * @param {object} options
 * @param {string} options.difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @param {number} [options.count] Anzahl Fragen (Standard DEFAULT_ROUND_LENGTH)
 * @param {() => number} [options.rng] Zufallsquelle, Standard Math.random (für Tests austauschbar)
 * @returns {object[]} Array von Fragen, je mit `text`, `options` (4 Stück,
 *   gemischt, genau eine mit `correct: true`), sowie `animalId`/`field` zur
 *   späteren Auswertung.
 */
export function generateQuestions(animals, options = {}) {
  const {
    difficulty,
    count = DEFAULT_ROUND_LENGTH,
    rng = Math.random,
  } = options;

  if (!Array.isArray(animals)) {
    throw new Error("generateQuestions: animals muss ein Array sein");
  }

  const fields = getFieldsForDifficulty(difficulty); // wirft bei unbekannter Stufe

  const usableAnimals = animals.filter(
    (animal) =>
      animal && isNonEmptyString(animal.name_de) && isNonEmptyString(animal.id),
  );
  const candidateAnimals = shuffle(usableAnimals, rng);
  const shuffledFields = shuffle(fields, rng);

  const questions = [];
  const usedAnimalIds = new Set();

  for (const animal of candidateAnimals) {
    if (questions.length >= count) break;
    if (usedAnimalIds.has(animal.id)) continue;

    for (const field of shuffledFields) {
      const def = FIELD_DEFINITIONS[field];
      if (!def) continue;

      const correctValue = getCorrectValue(def, animal, rng);
      if (correctValue === null || correctValue === undefined) continue;

      const otherAnimals = candidateAnimals.filter(
        (other) => other.id !== animal.id,
      );
      const wrongAnswerStrategy =
        getWrongAnswerStrategyForDifficulty(difficulty);

      const question =
        buildValueQuestion({
          def,
          field,
          animal,
          correctValue,
          otherAnimals,
          wrongAnswerStrategy,
          rng,
        }) ||
        buildIdentifyQuestion({
          def,
          field,
          animal,
          correctValue,
          otherAnimals,
          usedAnimalIds,
          rng,
        });

      if (question) {
        questions.push(question);
        usedAnimalIds.add(animal.id);
        break;
      }
    }
  }

  return questions;
}

// Für DIFFICULTY_LEVELS: re-export als Komfort, damit Aufrufer (z. B.
// Tests/Frage-Bildschirm) nicht zusätzlich aus difficulty.js importieren
// müssen, wenn sie ohnehin schon questionGenerator.js nutzen.
export { DIFFICULTY_LEVELS };
