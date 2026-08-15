// Tests für src/quiz/state.js — bislang ungetestet. Ergänzt im Rahmen von
// Issue #28 um Abdeckung für das neue `mode`-Feld (siehe dortiger
// Datei-Kommentar in state.js), das den bestehenden Quizfragen-Modus vom
// neuen "Wer bin ich?"-Modus unterscheidet. Die bereits vorher bestehenden
// Kernfunktionen (recordAnswer/advanceToNextQuestion/isQuizFinished) waren
// bisher nur indirekt über question.test.js/result.js abgedeckt — hier bewusst
// nur der für Issue #28 neue Teil (mode), kein nachträglicher Vollausbau
// bestehender, bereits produktiv laufender Funktionen (kein Scope-Creep).

import { describe, it, expect } from "vitest";
import { createQuizState } from "./state.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";
import { GAME_MODE } from "./gameMode.js";

describe("createQuizState — Spielmodus (Issue #28)", () => {
  it("setzt GAME_MODE.QUIZ als Standardmodus, wenn keiner angegeben ist", () => {
    const state = createQuizState(DIFFICULTY_LEVELS.EASY);
    expect(state.mode).toBe(GAME_MODE.QUIZ);
  });

  it("übernimmt einen explizit angegebenen Modus", () => {
    const state = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      10,
      GAME_MODE.REVERSE,
    );
    expect(state.mode).toBe(GAME_MODE.REVERSE);
  });

  it("wirft bei unbekanntem Modus", () => {
    expect(() =>
      createQuizState(DIFFICULTY_LEVELS.EASY, [], 10, "unbekannt"),
    ).toThrow(/Spielmodus/);
  });
});
