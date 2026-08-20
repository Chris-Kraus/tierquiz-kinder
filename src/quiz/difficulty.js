// Zuordnung Felder → Schwierigkeitsstufe (siehe architecture.md, Abschnitt
// "Schwierigkeitsstufen — Zuordnung zu vorhandenen Feldern").
//
// Stufe 6–10 (einfach): Fragen ausschließlich aus category/habitat/continent
// — Falschantworten aus deutlich unterschiedlichen Werten (klar
// unterscheidbar).
// Stufe 10–12 (anspruchsvoll): zusätzlich weight_kg/length_cm/lifespan_years/
// diet/conservation_status — Falschantworten möglichst nah am richtigen Wert
// (schwerer zu erraten). Zusätzlich das Vergleichs-Pseudofeld
// `heaviest_animal` (Issue #20): strukturell kein Datenbank-Feld, sondern ein
// eigener Fragemechanismus (4 Tiere als Optionen statt 1 Zieltier + Werte),
// aber bewusst als ganz normaler Eintrag in HARD_ONLY_FIELDS geführt, damit
// er automatisch an der bestehenden orderFieldsByUsage-Priorisierung
// (Issue #11) teilnimmt statt sie zu umgehen. Die eigentliche
// Fragetext-/Antwortlogik lebt in questionGenerator.js, hier wird nur
// festgelegt, welche Felder pro Stufe erlaubt sind.

export const DIFFICULTY_LEVELS = Object.freeze({
  EASY: "6-10",
  HARD: "10-12",
});

// Kindgerechte Anzeige-Labels je Stufe (siehe design.md, Issue #4: "Einfach"/
// "Knifflig" als Label, Altersangabe als Zusatzinfo). Zentral hier definiert,
// damit Start-Bildschirm (start.js) und Ergebnis-Verlaufsliste (Issue #14,
// history.js/result.js) dieselben Labels nutzen statt sie zu duplizieren.
export const DIFFICULTY_LABELS = Object.freeze({
  [DIFFICULTY_LEVELS.EASY]: "Einfach",
  [DIFFICULTY_LEVELS.HARD]: "Knifflig",
});

// Reihenfolge ist bewusst wie in architecture.md aufgeführt.
//
// "confusion_pair" (Issue #21, Verwechslungspaare-Fragetyp) steht laut
// Akzeptanzkriterien für BEIDE Schwierigkeitsstufen zur Verfügung, deshalb
// hier in EASY_FIELDS statt in HARD_ONLY_FIELDS: EASY_FIELDS fließt unten in
// HARD_FIELDS mit ein, ein einziger Eintrag deckt also automatisch beide
// Stufen ab. Wie `heaviest_animal` ist auch dies kein echtes
// Tierdatenbank-Feld, sondern ein Pseudofeld mit eigenem Fragepfad (siehe
// questionGenerator.js, buildConfusionPairQuestion) — hier wird nur seine
// Verfügbarkeit je Stufe festgelegt.
// "fur_feather_color" (Issue #22, Fell-/Federfarbe): steht laut Entscheidung
// von business-analyst der einfachen Stufe zur Verfügung — Farbe ist ein
// unmittelbar visuell erschließbares Merkmal, konzeptionell näher an
// category/habitat/continent als an den numerischen Stufe-10–12-Feldern
// (siehe architecture.md, "Finale Leitplanken"). Echtes Tierdatenbank-Feld
// (kein Pseudofeld wie confusion_pair/heaviest_animal), läuft aber technisch
// über denselben FIELD_DEFINITIONS-Mechanismus wie category/diet.
const EASY_FIELDS = Object.freeze([
  "category",
  "habitat",
  "continent",
  "fur_feather_color",
  "confusion_pair",
]);
const HARD_ONLY_FIELDS = Object.freeze([
  "weight_kg",
  "length_cm",
  "lifespan_years",
  "diet",
  "conservation_status",
  // Vergleichsfrage-Pseudofeld (Issue #20), kein echtes Tierdatenbank-Feld —
  // siehe questionGenerator.js, COMPARISON_FIELD_DEFINITIONS.
  "heaviest_animal",
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

// Tier-Memory (Issue #45): hier bestimmt die Schwierigkeitsstufe direkt die
// Kartenanzahl statt eines Feld-Sets (siehe architecture.md, Abschnitt
// "Neuer Spielmodus 'Tier-Memory': Finale technische Leitplanken", Punkt 5) —
// bewusst NICHT über getFieldsForDifficulty()/EASY_FIELDS/HARD_FIELDS
// modelliert, da Memory keine Tierdatenbank-Felder für die Fragestellung
// nutzt (nur image_filename). Eigene, parallele Funktion statt eines
// künstlichen Pseudofeldes wie heaviest_animal/confusion_pair.
const MEMORY_PAIR_COUNTS = Object.freeze({
  [DIFFICULTY_LEVELS.EASY]: 6,
  [DIFFICULTY_LEVELS.HARD]: 12,
});

/**
 * Liefert die Anzahl der Tierpaare (nicht Karten gesamt — das Doppelte) für
 * den Tier-Memory-Modus je Schwierigkeitsstufe (design.md-Tabelle: 6 bzw.
 * 12 Paare).
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @returns {number}
 */
export function getMemoryPairCountForDifficulty(difficulty) {
  assertKnownDifficulty(difficulty, "getMemoryPairCountForDifficulty");
  return MEMORY_PAIR_COUNTS[difficulty];
}
