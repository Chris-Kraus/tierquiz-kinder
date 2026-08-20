// @vitest-environment jsdom
//
// DOM-Tests für den Ergebnis-Bildschirm — bislang ungetestet, diese Datei
// deckt gezielt den neuen Tier-Memory-Zweig ab (Issue #45, design.md
// "Rundenende"): eigener, durchweg wertschätzender Text statt "X von Y
// richtig" sowie bewusst KEIN Eintrag in der Ergebnis-Verlaufsliste (#14/#36).
// `../quiz/history.js` wird komplett gemockt, damit die Tests unabhängig von
// echtem localStorage-Verhalten sind und sich `saveResultToHistory` gezielt
// beobachten lässt.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GAME_MODE } from "../quiz/gameMode.js";

const saveResultToHistory = vi.fn();
vi.mock("../quiz/history.js", () => ({
  saveResultToHistory: (...args) => saveResultToHistory(...args),
  deleteHistoryEntry: vi.fn(() => []),
  clearResultHistory: vi.fn(() => []),
}));

const { renderResultScreen } = await import("./result.js");

function render(quizState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  renderResultScreen(container, quizState, {
    onPlayAgain: vi.fn(),
    onBackToStart: vi.fn(),
  });
  return container;
}

beforeEach(() => {
  document.body.innerHTML = "";
  saveResultToHistory.mockReset();
  saveResultToHistory.mockReturnValue([]);
});

describe("Tier-Memory-Ergebnis (Issue #45)", () => {
  it("zeigt den angepassten, wertschätzenden Text statt 'X von Y richtig'", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 9,
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/Super gemacht! Du hast alle 6 Tierpaare gefunden!/);
    expect(
      container.querySelector(".result-screen__encouragement").textContent,
    ).toBe("Das hast du in 9 Versuchen geschafft!");
    expect(container.textContent).not.toMatch(/richtig beantwortet/);
  });

  it("verwendet die Einzahl 'Versuch' bei genau einem Versuch", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 1,
    });

    expect(
      container.querySelector(".result-screen__encouragement").textContent,
    ).toBe("Das hast du in 1 Versuch geschafft!");
  });

  it("speichert KEINEN Eintrag in der Ergebnis-Verlaufsliste und rendert keine Verlaufsliste", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 4,
    });

    expect(saveResultToHistory).not.toHaveBeenCalled();
    expect(container.querySelector(".result-history")).toBeNull();
  });

  it("behält 'Nochmal spielen'/'Zurück zum Start' unverändert bei", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 4,
    });

    expect(container.querySelector(".result-screen__play-again")).not.toBeNull();
    expect(
      container.querySelector(".result-screen__back-to-start"),
    ).not.toBeNull();
  });
});

describe("Regulärer Quizfragen-Ergebnis-Zweig bleibt unverändert (Regressionsschutz)", () => {
  it("zeigt weiterhin 'X von Y Fragen richtig beantwortet' und speichert einen Verlaufseintrag", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/Du hast 7 von 10 Fragen richtig beantwortet!/);
    expect(saveResultToHistory).toHaveBeenCalledTimes(1);
    expect(saveResultToHistory).toHaveBeenCalledWith({
      score: 7,
      total: 10,
      difficulty: "6-10",
      mode: GAME_MODE.QUIZ,
      resolvedCount: 0,
    });
  });
});

describe("Buchstabensuche: 'davon X aufgelöst' im Rundenergebnis (Issue #52)", () => {
  it("zeigt bei mindestens 1 aufgelöster Frage den Zusatz 'davon X aufgelöst' im Hauptsatz und übergibt resolvedCount an saveResultToHistory", () => {
    const container = render({
      mode: GAME_MODE.LETTER_SEARCH,
      difficulty: "6-10",
      score: 10,
      questions: new Array(10).fill({}),
      answers: [
        { resolved: false },
        { resolved: true },
        { resolved: false },
        { resolved: true },
        { resolved: false },
        { resolved: false },
        { resolved: false },
        { resolved: false },
        { resolved: false },
        { resolved: false },
      ],
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(
      /Du hast 10 von 10 Fragen richtig beantwortet, davon 2 aufgelöst!/,
    );
    expect(saveResultToHistory).toHaveBeenCalledWith({
      score: 10,
      total: 10,
      difficulty: "6-10",
      mode: GAME_MODE.LETTER_SEARCH,
      resolvedCount: 2,
    });
  });

  it("zeigt bei 0 aufgelösten Fragen unverändert nur den bisherigen Satz, keine 'davon 0 aufgelöst'-Ergänzung", () => {
    const container = render({
      mode: GAME_MODE.LETTER_SEARCH,
      difficulty: "6-10",
      score: 10,
      questions: new Array(10).fill({}),
      answers: new Array(10).fill({ resolved: false }),
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/^\s*Du hast 10 von 10 Fragen richtig beantwortet!\s*$/);
    expect(container.textContent).not.toMatch(/aufgelöst/);
  });

  it("zeigt weiterhin 'N von N richtig' unverändert, wenn `answers` fehlt (Modi ohne resolved-Unterstützung)", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/^\s*Du hast 7 von 10 Fragen richtig beantwortet!\s*$/);
  });

  it("zeigt in der Verlaufsliste bei resolvedCount > 0 den Zusatz 'davon X aufgelöst'", () => {
    saveResultToHistory.mockReturnValue([
      {
        id: "current",
        date: "2026-08-20T10:00:00.000Z",
        score: 10,
        total: 10,
        difficulty: "6-10",
        mode: GAME_MODE.LETTER_SEARCH,
        resolvedCount: 3,
      },
      {
        id: "older",
        date: "2026-08-19T10:00:00.000Z",
        score: 8,
        total: 10,
        difficulty: "6-10",
        mode: GAME_MODE.QUIZ,
        resolvedCount: 0,
      },
    ]);

    const container = render({
      mode: GAME_MODE.LETTER_SEARCH,
      difficulty: "6-10",
      score: 10,
      questions: new Array(10).fill({}),
      answers: [{ resolved: true }],
    });

    const results = container.querySelectorAll(".result-history__result");
    expect(results[0].textContent).toBe("10 von 10 richtig, davon 3 aufgelöst");
    expect(results[1].textContent).toBe("8 von 10 richtig");
  });
});
