// Spielmodus-Konstanten (Issue #36). Analog zu difficulty.js zentral
// definiert, damit die Ergebnis-Verlaufsliste (history.js/result.js) und
// spätere Bildschirme (Modus-Auswahl am Start-Bildschirm, aktuell noch auf
// unfertigen Feature-Branches für "Wer bin ich?"/Tiergeräusche, siehe
// #26–#28/#31–#33) dieselben Werte/Labels nutzen statt sie zu duplizieren.
//
// Werte bewusst konsistent zu den bereits in architecture.md etablierten
// Namen der jeweiligen (Pro-Frage-)Fragegeneratoren gewählt
// (generateNextReverseQuestion / generateNextSoundQuestion), siehe Issue #36,
// Abstimmung mit `software-architect`.

// Seit Issue #46: vierter Wert `LETTER_SEARCH` für den "Buchstabensuche"-
// Modus (Wert konsistent zu GAME_MODE.LETTER_SEARCH in gameMode.js sowie zur
// dortigen Fragegenerator-Benennung `generateNextLetterSearchQuestion`,
// gleiches Namensschema wie bei REVERSE/SOUND oben).
export const QUIZ_MODES = Object.freeze({
  QUIZ: "quiz",
  REVERSE: "reverse",
  SOUND: "sound",
  LETTER_SEARCH: "letterSearch",
});

// Quizfragen war vor Issue #36 der einzige Modus im Projekt. Dient sowohl als
// Default für neu gespeicherte Einträge ohne explizit übergebenen Modus als
// auch als Anzeige-Fallback für Alt-Einträge ohne gespeichertes `mode`-Feld
// (siehe history.js/result.js).
export const DEFAULT_MODE = QUIZ_MODES.QUIZ;

// Kindgerechte Anzeige-Labels (siehe design.md, "Modus-Auswahl auf dem
// Start-Bildschirm" sowie "Ergebnisliste: Löschen + Modus-Anzeige").
export const MODE_LABELS = Object.freeze({
  [QUIZ_MODES.QUIZ]: "Quizfragen",
  [QUIZ_MODES.REVERSE]: "Wer bin ich?",
  [QUIZ_MODES.SOUND]: "Tiergeräusche",
  [QUIZ_MODES.LETTER_SEARCH]: "Buchstabensuche",
});

/**
 * Liefert das kindgerechte Anzeige-Label für einen Spielmodus. Unbekannte/
 * fehlende Werte fallen auf das Label des Default-Modus ("Quizfragen")
 * zurück — das deckt insbesondere Alt-Einträge in der Ergebnis-Verlaufsliste
 * ab, die vor Issue #36 ohne `mode`-Feld gespeichert wurden (`mode` ist
 * `undefined`): sie werden dadurch ohne erkennbaren Unterschied zu "echten"
 * Quizfragen-Einträgen angezeigt (Akzeptanzkriterium Issue #36, siehe
 * history.js für die zugehörige Migrations-Begründung).
 * @param {string} [mode]
 * @returns {string}
 */
export function getModeLabel(mode) {
  return MODE_LABELS[mode] ?? MODE_LABELS[DEFAULT_MODE];
}
