// Zuordnung Felder → Schwierigkeitsstufe (siehe architecture.md, Abschnitt
// "Schwierigkeitsstufen — Zuordnung zu vorhandenen Feldern").
//
// Stufe 6–10 (einfach): Fragen ausschließlich aus category/habitat/continent
// — Falschantworten aus deutlich unterschiedlichen Werten (klar
// unterscheidbar).
// Stufe 10–12 (anspruchsvoll): zusätzlich weight_kg/length_cm/lifespan_years/
// diet/conservation_status — Falschantworten möglichst nah am richtigen Wert
// (schwerer zu erraten). Die eigentliche Fragetext-/Antwortlogik lebt in
// questionGenerator.js, hier wird nur festgelegt, welche Felder pro Stufe
// erlaubt sind.

export const DIFFICULTY_LEVELS = Object.freeze({
  EASY: "6-10",
  HARD: "10-12",
});

// Reihenfolge ist bewusst wie in architecture.md aufgeführt.
const EASY_FIELDS = Object.freeze(["category", "habitat", "continent"]);
const HARD_ONLY_FIELDS = Object.freeze([
  "weight_kg",
  "length_cm",
  "lifespan_years",
  "diet",
  "conservation_status",
]);
const HARD_FIELDS = Object.freeze([...EASY_FIELDS, ...HARD_ONLY_FIELDS]);

function assertKnownDifficulty(difficulty, callerName) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(
      `${callerName}: unbekannte Schwierigkeitsstufe "${difficulty}"`,
    );
  }
}

/**
 * Liefert die für eine Schwierigkeitsstufe nutzbaren Tierdatenbank-Felder
 * (siehe architecture.md, Abschnitt "Schwierigkeitsstufen").
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @returns {readonly string[]}
 */
export function getFieldsForDifficulty(difficulty) {
  assertKnownDifficulty(difficulty, "getFieldsForDifficulty");
  return difficulty === DIFFICULTY_LEVELS.HARD ? HARD_FIELDS : EASY_FIELDS;
}

/**
 * Strategie zur Auswahl von Falschantworten je Schwierigkeitsstufe:
 * "distinct" = deutlich unterschiedliche Werte (Stufe 6–10), "close" =
 * möglichst nah am richtigen Wert (Stufe 10–12) — siehe architecture.md.
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @returns {"distinct" | "close"}
 */
export function getWrongAnswerStrategyForDifficulty(difficulty) {
  assertKnownDifficulty(difficulty, "getWrongAnswerStrategyForDifficulty");
  return difficulty === DIFFICULTY_LEVELS.HARD ? "close" : "distinct";
}
