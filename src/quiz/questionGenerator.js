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

// Vergleichsfragen (Issue #20, siehe architecture.md Abschnitt "Technische
// Einschätzung: Anreicherungs-Ideen", Punkt 4): strukturell anders als
// FIELD_DEFINITIONS, denn hier sind die 4 Antwortoptionen selbst Tiere statt
// Feldwerte eines einzelnen Zieltiers. Deckt "Vergleichsfrage" und
// "Rekordhalter-Frage" in einem Mechanismus ab — kein separater
// Vorberechnungsschritt nötig, da die richtige Antwort einfach das Tier mit
// dem höchsten Wert unter den 4 zufällig gezogenen Kandidaten ist. Zunächst
// nur `weight_kg` (42 % Datenabdeckung); `length_cm` bewusst nicht (nur
// 2,2 % Abdeckung, siehe Issue).
const COMPARISON_FIELD_DEFINITIONS = {
  heaviest_animal: {
    question: "Welches dieser vier Tiere ist am schwersten?",
    getValue: (animal) =>
      isFiniteNumber(animal.weight_kg) ? animal.weight_kg : null,
  },
};

// Wie oft eine neue 4er-Zufallsauswahl versucht wird, wenn der Höchstwert
// unter den gezogenen Kandidaten mehrfach vorkommt (Gleichstand -> keine
// eindeutig richtige Antwort möglich, siehe buildComparisonQuestion unten).
const COMPARISON_MAX_ATTEMPTS = 20;

// Pseudofeld-Name für den Verwechslungspaare-Fragetyp (Issue #21), analog zu
// COMPARISON_FIELD_DEFINITIONS/"heaviest_animal": kein echtes
// Tierdatenbank-Feld, sondern ein eigener Fragepfad, der über dieselbe
// fieldOrder/fieldUsageCount-Priorisierung aus Issue #11 mitläuft (siehe
// generateQuestions unten). Bewusst kein Eintrag in FIELD_DEFINITIONS/
// COMPARISON_FIELD_DEFINITIONS, da die Datenquelle (data/confusionPairs.json)
// und die Fragestruktur (2 statt 4 Optionen) grundverschieden sind.
const CONFUSION_PAIR_FIELD = "confusion_pair";

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
  // Dedupe/Ausschluss muss auf Basis des *angezeigten* (formatierten) Texts
  // erfolgen, nicht des Rohwerts: `formatNumber()` rundet auf 1 Nachkomma-
  // stelle, wodurch unterschiedliche Rohwerte (z. B. 0.031 und 0.049) auf
  // denselben Anzeigetext ("0 kg") fallen können. Ohne diesen Vergleich auf
  // Anzeigetext-Ebene könnte eine Falschantwort optisch identisch mit der
  // korrekten Antwort erscheinen, obwohl ihr Rohwert abweicht (Issue #5,
  // QA-Bug 1: zwei Kacheln zeigen "0 kg", eine davon fälschlich als korrekt
  // markiert).
  const correctDisplay = def.format(correctValue);

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
      // Nach Rundung optisch nicht von der korrekten Antwort unterscheidbar
      // -> als Falschantwort ungeeignet, überspringen statt Duplikat riskieren.
      if (display === correctDisplay) continue;
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

/** Baut eine Vergleichsfrage (Issue #20): zieht `OPTION_COUNT` zufällige,
 * unbenutzte Tiere mit befülltem Quellfeld aus `candidateAnimals`, die
 * Optionen sind die Tiernamen selbst, korrekt ist das Tier mit dem höchsten
 * Wert. Bei Gleichstand um den Höchstwert (keine eindeutig richtige Antwort
 * möglich) wird eine neue 4er-Auswahl versucht (bis zu
 * `COMPARISON_MAX_ATTEMPTS`-mal). Liefert `null`, wenn entweder nicht genug
 * unterschiedlich benannte, unbenutzte Kandidaten mit dem Feld vorhanden sind
 * oder auch nach allen Versuchen kein gleichstandsfreies Quartett gefunden
 * wurde. Analog zu `tryBuildQuestionForField` liefert die Funktion
 * `{ question, animal }`, wobei `animal` hier das Gewinner-Tier ist (für die
 * `usedAnimalIds`-Buchführung in `generateQuestions` — dieselbe Semantik wie
 * bei den übrigen Fragetypen: das "Zieltier" der Frage wird pro Runde nicht
 * doppelt verwendet, die 3 unterlegenen Tiere bleiben wie sonstige
 * Falschantwort-Kandidaten frei wiederverwendbar). */
function buildComparisonQuestion({ def, field, candidateAnimals, usedAnimalIds, rng }) {
  const eligible = candidateAnimals.filter((animal) => {
    if (usedAnimalIds.has(animal.id)) return false;
    const value = def.getValue(animal);
    return isFiniteNumber(value);
  });

  // Dedupe nach Anzeigename wie bei buildIdentifyQuestion: die Optionen sind
  // Tiernamen, zwei Kandidaten mit demselben name_de würden sonst als
  // Options-Duplikat auffallen.
  const pool = dedupeAnimalsByName(eligible);
  if (pool.length < OPTION_COUNT) return null;

  for (let attempt = 0; attempt < COMPARISON_MAX_ATTEMPTS; attempt += 1) {
    const candidates = shuffle(pool, rng).slice(0, OPTION_COUNT);
    const values = candidates.map((animal) => def.getValue(animal));
    const maxValue = Math.max(...values);
    const winners = candidates.filter((_, index) => values[index] === maxValue);
    if (winners.length !== 1) continue; // Gleichstand -> neu ziehen

    const winner = winners[0];
    const options = shuffle(
      candidates.map((animal) => ({
        text: animal.name_de,
        correct: animal.id === winner.id,
      })),
      rng,
    );

    return {
      question: {
        id: `${winner.id}-${field}-comparison`,
        animalId: winner.id,
        animalName: winner.name_de,
        field,
        questionType: "comparison",
        text: def.question,
        options,
      },
      animal: winner,
    };
  }

  return null;
}

/** Baut eine Vergleichsfrage für ein bestimmtes Pseudofeld direkt aus einer
 * Tierliste, oder `null`, wenn dafür nicht genug Tiere mit befülltem Feld
 * vorhanden sind. Pendant zu `buildQuestionForField` für Vergleichsfragen —
 * eigene Funktion statt Wiederverwendung derselben Signatur, da es (anders
 * als bei den übrigen Fragetypen) kein einzelnes Zieltier gibt, auf das sich
 * die Frage bezieht. Primär von `generateQuestions` genutzt, aber auch direkt
 * exportiert für gezielte Tests dieser Feld-Strategie.
 * @param {string} field eines der von COMPARISON_FIELD_DEFINITIONS unterstützten Pseudofelder
 * @param {object[]} animals vollständige Tierliste
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random (für Tests austauschbar)
 */
export function buildComparisonQuestionForField(field, animals, rng = Math.random) {
  const def = COMPARISON_FIELD_DEFINITIONS[field];
  if (!def || !Array.isArray(animals)) return null;

  const usableAnimals = animals.filter(
    (animal) =>
      animal && isNonEmptyString(animal.name_de) && isNonEmptyString(animal.id),
  );

  const result = buildComparisonQuestion({
    def,
    field,
    candidateAnimals: usableAnimals,
    usedAnimalIds: new Set(),
    rng,
  });

  return result ? result.question : null;
}

/** Sucht unter `confusionPairs` alle Paare, die (noch) für diese Runde
 * nutzbar sind: beide Tier-IDs müssen im übergebenen `animals`-Bestand
 * vorhanden sein (Datei-Kommentar: `questionGenerator.js` kennt
 * `data/confusionPairs.json` nicht direkt, bekommt die Liste als Parameter,
 * siehe `generateQuestions`) und dürfen noch nicht in `usedAnimalIds`
 * stecken (kein Tier zweimal Zieltier pro Runde, dieselbe Regel wie bei den
 * übrigen Fragetypen — verhindert nebenbei auch, dass dasselbe Paar zweimal
 * in derselben Runde gezogen wird). Mindestens eine `distinction` muss
 * vorhanden sein (siehe architecture.md, "Verwechslungspaare — Datenstruktur
 * & Mindestumfang"). */
function findEligibleConfusionPairs(confusionPairs, animalById, usedAnimalIds) {
  return confusionPairs.filter((pair) => {
    if (!pair || !Array.isArray(pair.animals) || pair.animals.length !== 2) {
      return false;
    }
    const [idA, idB] = pair.animals;
    if (usedAnimalIds.has(idA) || usedAnimalIds.has(idB)) return false;
    if (!animalById.has(idA) || !animalById.has(idB)) return false;
    return Array.isArray(pair.distinctions) && pair.distinctions.length > 0;
  });
}

/** Baut eine Verwechslungspaare-Frage (Issue #21): zieht ein zufälliges,
 * noch nutzbares Paar aus `confusionPairs` sowie eine zufällige Distinction
 * daraus. Der Fragetext ist `distinction.text`, die beiden Optionen sind die
 * Tiernamen des Paares selbst (nur 2 statt 4, siehe design.md,
 * "Verwechslungspaare-Fragetyp") — `distinction.correct` referenziert die
 * Tier-ID der richtigen Antwort. Liefert `null`, wenn kein nutzbares Paar
 * (mehr) verfügbar ist (z. B. `confusionPairs` leer, oder beide Tiere jedes
 * verbliebenen Paares bereits in dieser Runde verbraucht). Anders als bei den
 * übrigen Fragetypen gibt es hier zwei "Zieltiere" statt einem — der
 * Rückgabewert trägt deshalb `animals` (Array, beide Tiere) statt `animal`
 * (Singular), siehe generateQuestions für die Buchführung in
 * `usedAnimalIds`. */
function buildConfusionPairQuestion({ confusionPairs, animals, usedAnimalIds, rng }) {
  if (!Array.isArray(confusionPairs) || confusionPairs.length === 0) {
    return null;
  }

  const animalById = new Map(animals.map((animal) => [animal.id, animal]));
  const eligiblePairs = findEligibleConfusionPairs(
    confusionPairs,
    animalById,
    usedAnimalIds,
  );
  if (eligiblePairs.length === 0) return null;

  const pair = pickRandom(eligiblePairs, rng);
  const distinction = pickRandom(pair.distinctions, rng);
  const [idA, idB] = pair.animals;
  const animalA = animalById.get(idA);
  const animalB = animalById.get(idB);

  const options = shuffle(
    [
      { text: animalA.name_de, correct: distinction.correct === idA },
      { text: animalB.name_de, correct: distinction.correct === idB },
    ],
    rng,
  );

  // Falls `distinction.correct` (kuratierte Daten) keiner der beiden
  // Paar-IDs entspricht, wären beide Optionen "falsch" -> keine gültige
  // Frage. Laut architecture.md ist die Liste statisch kuratiert und kein
  // Laufzeit-Check vorgesehen, trotzdem defensiv statt eine kaputte Frage
  // auszuliefern (Pflicht laut architecture.md: fehlerhafte/fehlende Daten
  // überspringen statt crashen).
  if (!options.some((option) => option.correct)) return null;

  return {
    question: {
      id: `${idA}-${idB}-confusion-pair`,
      animalId: distinction.correct,
      animalName: animalById.get(distinction.correct)?.name_de,
      field: CONFUSION_PAIR_FIELD,
      questionType: "confusionPair",
      text: distinction.text,
      options,
    },
    animals: [animalA, animalB],
  };
}

/** Baut eine Verwechslungspaare-Frage direkt aus einer Paar-/Tierliste, oder
 * `null`, wenn keine gültige Frage gebildet werden kann. Pendant zu
 * `buildComparisonQuestionForField` für diesen Fragetyp — eigene Funktion für
 * gezielte Tests, ohne den ganzen `generateQuestions`-Ablauf durchlaufen zu
 * müssen.
 * @param {object[]} confusionPairs Paare laut Schema aus data/confusionPairs.json
 * @param {object[]} animals vollständige Tierliste (Quelle für Namen/Lookup)
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random (für Tests austauschbar)
 */
export function buildConfusionPairQuestionForPairs(
  confusionPairs,
  animals,
  rng = Math.random,
) {
  if (!Array.isArray(confusionPairs) || !Array.isArray(animals)) return null;

  const usableAnimals = animals.filter(
    (animal) =>
      animal && isNonEmptyString(animal.name_de) && isNonEmptyString(animal.id),
  );

  const result = buildConfusionPairQuestion({
    confusionPairs,
    animals: usableAnimals,
    usedAnimalIds: new Set(),
    rng,
  });

  return result ? result.question : null;
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

/** Sortiert `fields` nach bisheriger Nutzung in der laufenden Runde
 * (aufsteigend, am wenigsten genutztes Feld zuerst), Gleichstände zufällig
 * gebrochen. Kern des Fixes für Issue #11: statt einer einmal pro Runde
 * fest gemischten Feld-Reihenfolge (die bei ungleicher Feld-Abdeckung fast
 * immer auf dasselbe, am besten abgedeckte Feld hinausläuft) wird die
 * Priorität pro Frage neu berechnet und bevorzugt unterrepräsentierte
 * Felder, bevor auf ein bereits häufig genutztes Feld zurückgegriffen wird. */
function orderFieldsByUsage(fields, fieldUsageCount, rng) {
  return shuffle(fields, rng).sort(
    (a, b) => fieldUsageCount[a] - fieldUsageCount[b],
  );
}

/** Sucht für ein bestimmtes Feld das erste noch unbenutzte Tier aus
 * `candidateAnimals`, für das sich eine gültige Frage bilden lässt, und
 * liefert `{ question, animal }` oder `null`, wenn kein Tier/Feld-Kombination
 * dafür (mehr) verfügbar ist. Wird pro Frage-Slot für das jeweils
 * priorisierte Feld aufgerufen (siehe `orderFieldsByUsage`), sodass aktiv
 * nach einem passenden Tier für das unterrepräsentierte Feld gesucht wird,
 * statt nur beim zufällig gezogenen Tier passiv durchzuprobieren. */
function tryBuildQuestionForField({
  def,
  field,
  difficulty,
  candidateAnimals,
  usedAnimalIds,
  rng,
}) {
  const wrongAnswerStrategy = getWrongAnswerStrategyForDifficulty(difficulty);

  for (const animal of candidateAnimals) {
    if (usedAnimalIds.has(animal.id)) continue;

    const correctValue = getCorrectValue(def, animal, rng);
    if (correctValue === null || correctValue === undefined) continue;

    const otherAnimals = candidateAnimals.filter(
      (other) => other.id !== animal.id,
    );

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

    if (question) return { question, animal };
  }

  return null;
}

/**
 * Erzeugt eine Runde Multiple-Choice-Fragen aus einer gegebenen Tierliste.
 *
 * Reine Funktion, kein DOM-Zugriff, keine Abhängigkeit von data/animals.json
 * (siehe Datei-Kommentar oben) — die Tierliste kommt als Parameter.
 *
 * Feld-Auswahl (Issue #11): pro Frage wird das bislang am wenigsten in
 * dieser Runde genutzte, für ein noch verfügbares Tier bebaubare Feld
 * bevorzugt (siehe `orderFieldsByUsage`/`tryBuildQuestionForField`) — das
 * sorgt für eine echte Durchmischung der Fragetypen, auch bei stark
 * ungleicher Feld-Abdeckung in der echten Tierdatenbank (z. B. `category`
 * zu 100 % vs. `habitat` zu ~5 % befüllt). Erst wenn kein unterrepräsen-
 * tiertes Feld mehr für ein verbleibendes Tier verfügbar ist, greift die
 * Runde wieder auf ein bereits häufiger genutztes Feld (i. d. R. `category`)
 * zurück. Das Vergleichsfrage-Pseudofeld `heaviest_animal` (Issue #20) nimmt
 * an genau derselben Priorisierung teil (siehe `buildComparisonQuestion`),
 * verdrängt die übrigen Fragetypen also nicht und wird umgekehrt nicht von
 * ihnen verdrängt. Das Verwechslungspaare-Pseudofeld `confusion_pair`
 * (Issue #21) reiht sich genauso ein (siehe `buildConfusionPairQuestion`),
 * mit dem Unterschied, dass hier bei einem Treffer BEIDE Tiere des Paares als
 * "verbraucht" markiert werden (siehe unten) statt nur eines.
 *
 * @param {object[]} animals Tierliste, je Eintrag laut architecture.md-Schema
 * @param {object} options
 * @param {string} options.difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @param {number} [options.count] Anzahl Fragen (Standard DEFAULT_ROUND_LENGTH)
 * @param {object[]} [options.confusionPairs] kuratierte Verwechslungspaare
 *   laut Schema aus data/confusionPairs.json (Issue #21) — analog zur
 *   Tierliste bewusst als Parameter statt fest importiert (siehe
 *   Datei-Kommentar oben); ohne Angabe (Standard `[]`) liefert der neue
 *   Fragetyp einfach keine Fragen, statt zu crashen.
 * @param {() => number} [options.rng] Zufallsquelle, Standard Math.random (für Tests austauschbar)
 * @returns {object[]} Array von Fragen, je mit `text`, `options` (4 Stück bei
 *   den bestehenden Fragetypen, 2 Stück beim Verwechslungspaare-Fragetyp,
 *   gemischt, genau eine mit `correct: true`), sowie `animalId`/`field` zur
 *   späteren Auswertung.
 */
export function generateQuestions(animals, options = {}) {
  const {
    difficulty,
    count = DEFAULT_ROUND_LENGTH,
    confusionPairs = [],
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

  const questions = [];
  const usedAnimalIds = new Set();
  const fieldUsageCount = Object.fromEntries(fields.map((field) => [field, 0]));

  while (questions.length < count) {
    const fieldOrder = orderFieldsByUsage(fields, fieldUsageCount, rng);
    let builtThisSlot = false;

    for (const field of fieldOrder) {
      // Vergleichsfrage- (Issue #20) und Verwechslungspaare-Pseudofelder
      // (Issue #21) laufen über eigene Builder statt FIELD_DEFINITIONS/
      // tryBuildQuestionForField — nehmen aber an derselben fieldOrder/
      // fieldUsageCount-Priorisierung teil, so dass sie sich in die
      // Feld-Durchmischung aus Issue #11 einreihen statt sie zu umgehen.
      const comparisonDef = COMPARISON_FIELD_DEFINITIONS[field];
      const isConfusionPairField = field === CONFUSION_PAIR_FIELD;
      const def =
        comparisonDef || isConfusionPairField ? null : FIELD_DEFINITIONS[field];
      if (!comparisonDef && !isConfusionPairField && !def) continue;

      const result = comparisonDef
        ? buildComparisonQuestion({
            def: comparisonDef,
            field,
            candidateAnimals,
            usedAnimalIds,
            rng,
          })
        : isConfusionPairField
          ? buildConfusionPairQuestion({
              confusionPairs,
              animals: candidateAnimals,
              usedAnimalIds,
              rng,
            })
          : tryBuildQuestionForField({
              def,
              field,
              difficulty,
              candidateAnimals,
              usedAnimalIds,
              rng,
            });

      if (result) {
        questions.push(result.question);
        // Verwechslungspaare-Builder liefert `animals` (beide Tiere des
        // Paares, Plural) statt `animal` (Singular wie bei allen übrigen
        // Fragetypen) — beide werden als "verbraucht" markiert, siehe
        // JSDoc oben.
        const resultAnimalIds = result.animals
          ? result.animals.map((animal) => animal.id)
          : [result.animal.id];
        resultAnimalIds.forEach((id) => usedAnimalIds.add(id));
        fieldUsageCount[field] += 1;
        builtThisSlot = true;
        break;
      }
    }

    // Kein Feld mehr lieferbar (alle passenden Tiere bereits verbraucht) ->
    // Runde endet hier, ggf. mit weniger als `count` Fragen (wie zuvor).
    if (!builtThisSlot) break;
  }

  return questions;
}

// Für DIFFICULTY_LEVELS: re-export als Komfort, damit Aufrufer (z. B.
// Tests/Frage-Bildschirm) nicht zusätzlich aus difficulty.js importieren
// müssen, wenn sie ohnehin schon questionGenerator.js nutzen.
export { DIFFICULTY_LEVELS };
