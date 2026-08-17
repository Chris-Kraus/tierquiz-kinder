// Tests für src/quiz/mode.js (Issue #36: Spielmodus-Konstanten + Label-
// Auflösung für die Ergebnis-Verlaufsliste). Reine Funktions-Tests ohne
// DOM-/Storage-Abhängigkeit — die eigentliche Speicher-/Migrationslogik ist
// in history.test.js abgedeckt; hier geht es um die reine Anzeige-Auflösung,
// die result.js für die Modus-Spalte der Verlaufsliste nutzt.

import { describe, it, expect } from "vitest";
import { QUIZ_MODES, DEFAULT_MODE, MODE_LABELS, getModeLabel } from "./mode.js";

describe("getModeLabel", () => {
  it("liefert das kindgerechte Label für jeden bekannten Modus", () => {
    expect(getModeLabel(QUIZ_MODES.QUIZ)).toBe("Quizfragen");
    expect(getModeLabel(QUIZ_MODES.REVERSE)).toBe("Wer bin ich?");
    expect(getModeLabel(QUIZ_MODES.SOUND)).toBe("Tiergeräusche");
    // Issue #46: neuer "Buchstabensuche"-Modus, Ergebnis-Verlaufsliste
    // (architecture.md: "mode: 'letterSearch'") übernimmt das Label
    // automatisch über MODE_LABELS.
    expect(getModeLabel(QUIZ_MODES.LETTER_SEARCH)).toBe("Buchstabensuche");
  });

  it("fällt bei fehlendem mode (Alt-Eintrag ohne mode-Feld, Issue #36-Migration) auf 'Quizfragen' zurück", () => {
    // Genau der Migrationsfall aus Issue #36: ein vor dieser Story
    // gespeicherter Verlaufseintrag hat kein `mode`-Feld (`undefined`) und
    // muss ohne erkennbaren Unterschied zu "echten" Quizfragen-Einträgen als
    // "Quizfragen" angezeigt werden.
    expect(getModeLabel(undefined)).toBe(MODE_LABELS[DEFAULT_MODE]);
    expect(getModeLabel(undefined)).toBe("Quizfragen");
  });

  it("fällt bei einem unbekannten/kaputten mode-Wert defensiv auf 'Quizfragen' zurück", () => {
    expect(getModeLabel("irgendein-unbekannter-wert")).toBe("Quizfragen");
  });
});

describe("QUIZ_MODES / DEFAULT_MODE", () => {
  it("nutzt 'quiz' als Default-Modus (einziger Modus vor Issue #36)", () => {
    expect(DEFAULT_MODE).toBe(QUIZ_MODES.QUIZ);
  });

  it("definiert die laut architecture.md vereinbarten Modus-Werte (seit Issue #46 vier: quiz/reverse/sound/letterSearch)", () => {
    expect(QUIZ_MODES).toEqual({
      QUIZ: "quiz",
      REVERSE: "reverse",
      SOUND: "sound",
      LETTER_SEARCH: "letterSearch",
    });
  });
});
