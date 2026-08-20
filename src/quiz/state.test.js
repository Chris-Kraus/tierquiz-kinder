// Tests für src/quiz/state.js — bislang ungetestet. Ergänzt im Rahmen von
// Issue #28 um Abdeckung für das neue `mode`-Feld (siehe dortiger
// Datei-Kommentar in state.js), das den bestehenden Quizfragen-Modus vom
// neuen "Wer bin ich?"-Modus unterscheidet. Die bereits vorher bestehenden
// Kernfunktionen (recordAnswer/advanceToNextQuestion/isQuizFinished) waren
// bisher nur indirekt über question.test.js/result.js abgedeckt — hier bewusst
// nur der für Issue #28 neue Teil (mode), kein nachträglicher Vollausbau
// bestehender, bereits produktiv laufender Funktionen (kein Scope-Creep).

import { describe, it, expect } from "vitest";
import { createQuizState, recordAnswer } from "./state.js";
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

describe("recordAnswer — resolved-Feld (Issue #52, Buchstabensuche 'Lösung zeigen')", () => {
  it("vermerkt resolved: false als Standard, wenn der Parameter nicht übergeben wird", () => {
    const state = createQuizState(DIFFICULTY_LEVELS.EASY);
    recordAnswer(state, {
      question: { id: "q1" },
      selectedText: "Löwe",
      correct: true,
    });

    expect(state.answers).toHaveLength(1);
    expect(state.answers[0].resolved).toBe(false);
    expect(state.score).toBe(1);
  });

  it("vermerkt resolved: true, wenn explizit übergeben (per 'Lösung zeigen' aufgelöst)", () => {
    const state = createQuizState(DIFFICULTY_LEVELS.EASY);
    recordAnswer(state, {
      question: { id: "q1" },
      selectedText: "Löwe",
      correct: true,
      resolved: true,
    });

    expect(state.answers[0].resolved).toBe(true);
    // Zählt weiterhin normal zum Punktestand (bestehende Prämisse aus
    // Issue #46: keine neue "Scheitern"-Kategorie).
    expect(state.score).toBe(1);
  });

  it("leitet die Anzahl aufgelöster Fragen bei mehreren Antworten korrekt aus answers.filter ab (keine separate Zählvariable)", () => {
    const state = createQuizState(DIFFICULTY_LEVELS.EASY);
    recordAnswer(state, {
      question: { id: "q1" },
      selectedText: "Löwe",
      correct: true,
    });
    recordAnswer(state, {
      question: { id: "q2" },
      selectedText: "Tiger",
      correct: true,
      resolved: true,
    });
    recordAnswer(state, {
      question: { id: "q3" },
      selectedText: "Bär",
      correct: true,
      resolved: true,
    });

    const resolvedCount = state.answers.filter((a) => a.resolved).length;
    expect(resolvedCount).toBe(2);
    expect(state.score).toBe(3);
  });
});
