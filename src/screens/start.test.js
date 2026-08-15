// @vitest-environment jsdom
//
// DOM-Tests für die neue Modus-Auswahl auf dem Start-Bildschirm (Issue #26,
// design.md "Modus-Auswahl auf dem Start-Bildschirm"). Analog zum Muster in
// question.test.js: `data/animals.json` wird gemockt (Inhalt spielt für diese
// Story keine Rolle, siehe reverseQuestionGenerator.js), und
// `../quiz/reverseQuestionGenerator.js` wird ebenfalls gemockt, damit sowohl
// der Erfolgs- als auch der Fehlschlag-Pfad des "Testabrufs" deterministisch
// prüfbar sind — unabhängig davon, ob die echte Implementierung aus Issue
// #27 bereits vorliegt oder (aktueller Stand) noch als Schnittstellen-Stub
// immer ablehnt.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";

vi.mock("../../data/animals.json", () => ({
  default: { animals: [] },
}));

const generateNextReverseQuestion = vi.fn();
vi.mock("../quiz/reverseQuestionGenerator.js", () => ({
  generateNextReverseQuestion: (...args) =>
    generateNextReverseQuestion(...args),
}));

const { renderStartScreen } = await import("./start.js");

function render() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onStart = vi.fn();
  renderStartScreen(container, { onStart });
  return { container, onStart };
}

beforeEach(() => {
  document.body.innerHTML = "";
  generateNextReverseQuestion.mockReset();
});

describe("Modus-Auswahl (Issue #26)", () => {
  it("zeigt 'Quizfragen' vorbelegt/hervorgehoben und 'Wer bin ich?' mit Online-Hinweis", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const reverseButton = container.querySelector('[data-mode="reverse"]');

    expect(quizButton.classList.contains("mode-button--selected")).toBe(
      true,
    );
    expect(quizButton.getAttribute("aria-pressed")).toBe("true");
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(reverseButton.getAttribute("aria-pressed")).toBe("false");

    const onlineIcon = reverseButton.querySelector(
      ".mode-button__online-icon",
    );
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    // Der bestehende Quizfragen-Modus bekommt laut Akzeptanzkriterium kein
    // Online-Icon.
    expect(
      quizButton.querySelector(".mode-button__online-icon"),
    ).toBeNull();
  });

  it("bleibt bei 'Quizfragen', wenn der Testabruf fehlschlägt, mit freundlichem Hinweis statt Fehlertext", async () => {
    generateNextReverseQuestion.mockRejectedValue(new Error("Netzwerkfehler"));
    const { container } = render();

    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();

    // Ladezustand direkt in der Kachel, keine Sperre des restlichen Bildschirms.
    expect(reverseButton.getAttribute("aria-busy")).toBe("true");
    expect(reverseButton.disabled).toBe(true);

    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(
      true,
    );
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(reverseButton.disabled).toBe(false);

    const hintEl = container.querySelector(".mode-picker__hint");
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("Dafür brauchst du gerade Internet 🌐");
    // Kein technischer Fehlertext im DOM.
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
  });

  it("wählt 'Wer bin ich?' aus, wenn der Testabruf gelingt", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "Wer bin ich?" });
    const { container } = render();

    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();

    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      true,
    );
    expect(reverseButton.getAttribute("aria-pressed")).toBe("true");
    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
  });

  it("ruft den Testabruf mit der aktuell gewählten Schwierigkeitsstufe auf, sobald eine gewählt ist", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "x" });
    const { container } = render();

    container.querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
      .click();
    container.querySelector('[data-mode="reverse"]').click();

    await vi.waitFor(() => {
      expect(generateNextReverseQuestion).toHaveBeenCalled();
    });
    expect(generateNextReverseQuestion.mock.calls[0][2]).toBe(
      DIFFICULTY_LEVELS.HARD,
    );
  });

  it("lässt die bestehende Schwierigkeitsstufen-Auswahl unverändert und unabhängig von der Modus-Auswahl funktionieren", () => {
    const { container } = render();

    const startButton = container.querySelector(".start-button");
    expect(startButton.disabled).toBe(true);

    const easyButton = container.querySelector(
      `[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`,
    );
    easyButton.click();

    expect(easyButton.classList.contains("difficulty-button--selected")).toBe(
      true,
    );
    expect(startButton.disabled).toBe(false);
  });
});

// Issue #28: der Modus ist jetzt tatsächlich spielbar -- der Start-Button
// muss den gewählten Modus sowie (im Erfolgsfall des Testabrufs) die bereits
// aufgelöste erste Frage an den neu erzeugten Quiz-Zustand weiterreichen
// (siehe reverseQuestion.js, das dieses transiente Feld konsumiert, um sich
// den doppelten Netzwerk-Aufruf für Frage 1 zu sparen).
describe("Start-Button — Moduswahl an den Quiz-Zustand weiterreichen (Issue #28)", () => {
  it("erzeugt einen Quiz-Zustand mit mode 'quiz' und ohne pendingReverseQuestion, wenn 'Quizfragen' gewählt bleibt", () => {
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingReverseQuestion).toBeUndefined();
  });

  it("erzeugt nach erfolgreichem Testabruf einen Quiz-Zustand mit mode 'reverse' und der bereits aufgelösten ersten Frage", async () => {
    const resolvedQuestion = { text: "Wer bin ich?" };
    generateNextReverseQuestion.mockResolvedValue(resolvedQuestion);
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();
    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("reverse");
    expect(quizState.pendingReverseQuestion).toBe(resolvedQuestion);
    // Der Testabruf selbst darf für den eigentlichen Rundenstart nicht noch
    // einmal ausgelöst werden (kein zweiter Aufruf durch den Start-Klick).
    expect(generateNextReverseQuestion).toHaveBeenCalledTimes(1);
  });

  it("verwirft ein zwischenzeitlich vorhandenes Testabruf-Ergebnis, wenn zurück zu 'Quizfragen' gewechselt wird", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "Wer bin ich?" });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();
    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector('[data-mode="quiz"]').click();
    container.querySelector(".start-button").click();

    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingReverseQuestion).toBeUndefined();
  });
});
