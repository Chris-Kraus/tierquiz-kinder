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
  it("liefert für Stufe 6-10 ausschließlich category/habitat/continent", () => {
    const fields = getFieldsForDifficulty(DIFFICULTY_LEVELS.EASY);
    expect(fields).toEqual(["category", "habitat", "continent"]);
  });

  it("liefert für Stufe 10-12 zusätzlich die anspruchsvolleren Felder inkl. Vergleichsfrage-Pseudofeld (Issue #20)", () => {
    const fields = getFieldsForDifficulty(DIFFICULTY_LEVELS.HARD);
    expect(fields).toEqual(
      expect.arrayContaining([
        "category",
        "habitat",
        "continent",
        "weight_kg",
        "length_cm",
        "lifespan_years",
        "diet",
        "conservation_status",
        "heaviest_animal",
      ]),
    );
    expect(fields).toHaveLength(9);
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
