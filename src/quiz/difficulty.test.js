// Tests für src/quiz/difficulty.js (Issue #5: Feld-Zuordnung je
// Schwierigkeitsstufe). Reine Logik-Tests, keine Fixture-Tierliste nötig.

import { describe, it, expect } from "vitest";
import {
  DIFFICULTY_LEVELS,
  getFieldsForDifficulty,
  getWrongAnswerStrategyForDifficulty,
} from "./difficulty.js";

describe("DIFFICULTY_LEVELS", () => {
  it("bleibt kompatibel zu state.js/start.js (EASY/HARD mit bekannten Werten)", () => {
    expect(DIFFICULTY_LEVELS.EASY).toBe("6-10");
    expect(DIFFICULTY_LEVELS.HARD).toBe("10-12");
  });
});

describe("getFieldsForDifficulty", () => {
  it("liefert für Stufe 6-10 category/habitat/continent plus das Verwechslungspaare-Pseudofeld (Issue #21, steht laut Akzeptanzkriterien in beiden Stufen zur Verfügung)", () => {
    const fields = getFieldsForDifficulty(DIFFICULTY_LEVELS.EASY);
    expect(fields).toEqual([
      "category",
      "habitat",
      "continent",
      "confusion_pair",
    ]);
  });

  it("liefert für Stufe 10-12 zusätzlich die anspruchsvolleren Felder inkl. Vergleichsfrage-Pseudofeld (Issue #20) und Verwechslungspaare-Pseudofeld (Issue #21)", () => {
    const fields = getFieldsForDifficulty(DIFFICULTY_LEVELS.HARD);
    expect(fields).toEqual(
      expect.arrayContaining([
        "category",
        "habitat",
        "continent",
        "confusion_pair",
        "weight_kg",
        "length_cm",
        "lifespan_years",
        "diet",
        "conservation_status",
        "heaviest_animal",
      ]),
    );
    expect(fields).toHaveLength(10);
  });

  it("wirft bei unbekannter Schwierigkeitsstufe", () => {
    expect(() => getFieldsForDifficulty("erwachsen")).toThrow();
  });
});

describe("getWrongAnswerStrategyForDifficulty", () => {
  it("nutzt 'distinct' für Stufe 6-10 und 'close' für Stufe 10-12", () => {
    expect(getWrongAnswerStrategyForDifficulty(DIFFICULTY_LEVELS.EASY)).toBe(
      "distinct",
    );
    expect(getWrongAnswerStrategyForDifficulty(DIFFICULTY_LEVELS.HARD)).toBe(
      "close",
    );
  });

  it("wirft bei unbekannter Schwierigkeitsstufe", () => {
    expect(() => getWrongAnswerStrategyForDifficulty("erwachsen")).toThrow();
  });
});
