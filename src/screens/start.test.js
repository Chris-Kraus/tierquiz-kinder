// @vitest-environment jsdom
//
// DOM-Tests für die Modus-Auswahl auf dem Start-Bildschirm (Issue #26/#31,
// design.md "Modus-Auswahl auf dem Start-Bildschirm"). Analog zum Muster in
// question.test.js: `data/animals.json` wird gemockt (Inhalt spielt für diese
// Story keine Rolle, siehe reverseQuestionGenerator.js/
// soundQuestionGenerator.js), und die beiden Fragegenerierungs-Module werden
// ebenfalls gemockt, damit sowohl der Erfolgs- als auch der Fehlschlag-Pfad
// des jeweiligen "Testabrufs" deterministisch prüfbar sind — unabhängig
// davon, ob die echte Implementierung (#27 bzw. #32) bereits vorliegt oder
// (aktueller Stand für #32) noch als Schnittstellen-Stub immer ablehnt.

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

const generateNextSoundQuestion = vi.fn();
vi.mock("../quiz/soundQuestionGenerator.js", () => ({
  generateNextSoundQuestion: (...args) => generateNextSoundQuestion(...args),
}));

const generateNextLetterSearchQuestion = vi.fn();
vi.mock("../quiz/letterSearchQuestionGenerator.js", () => ({
  generateNextLetterSearchQuestion: (...args) =>
    generateNextLetterSearchQuestion(...args),
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
  generateNextSoundQuestion.mockReset();
  generateNextLetterSearchQuestion.mockReset();
});

describe("Modus-Auswahl (Issue #26)", () => {
  it("zeigt 'Quizfragen' vorbelegt/hervorgehoben und 'Wer bin ich?' mit Online-Hinweis", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const reverseButton = container.querySelector('[data-mode="reverse"]');

    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(quizButton.getAttribute("aria-pressed")).toBe("true");
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(reverseButton.getAttribute("aria-pressed")).toBe("false");

    const onlineIcon = reverseButton.querySelector(".mode-button__online-icon");
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    // Der bestehende Quizfragen-Modus bekommt laut Akzeptanzkriterium kein
    // Online-Icon.
    expect(quizButton.querySelector(".mode-button__online-icon")).toBeNull();
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
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
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
    expect(quizButton.classList.contains("mode-button--selected")).toBe(false);
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
  });

  it("ruft den Testabruf mit der aktuell gewählten Schwierigkeitsstufe auf, sobald eine gewählt ist", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "x" });
    const { container } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
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

describe("Modus-Auswahl: dritte Kachel 'Tiergeräusche' (Issue #31)", () => {
  it("zeigt 'Tiergeräusche' mit Lautsprecher- und Online-Icon, ohne die bestehenden zwei Kacheln zu verändern", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    const soundButton = container.querySelector('[data-mode="sound"]');

    expect(soundButton).not.toBeNull();
    expect(soundButton.querySelector(".mode-button__label").textContent).toBe(
      "Tiergeräusche",
    );
    expect(soundButton.querySelector(".mode-button__icon").textContent).toBe(
      "🔊",
    );
    const onlineIcon = soundButton.querySelector(".mode-button__online-icon");
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    expect(soundButton.classList.contains("mode-button--selected")).toBe(false);
    expect(soundButton.getAttribute("aria-pressed")).toBe("false");

    // Die beiden bestehenden Kacheln bleiben unverändert (Akzeptanzkriterium
    // "bleiben unverändert erhalten und funktionieren unabhängig von der
    // neuen dritten Kachel").
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(reverseButton.querySelector(".mode-button__label").textContent).toBe(
      "Wer bin ich?",
    );
  });

  it("bleibt bei 'Quizfragen', wenn der Testabruf für 'Tiergeräusche' fehlschlägt, mit freundlichem Hinweis statt Fehlertext", async () => {
    generateNextSoundQuestion.mockRejectedValue(new Error("Netzwerkfehler"));
    const { container } = render();

    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();

    expect(soundButton.getAttribute("aria-busy")).toBe("true");
    expect(soundButton.disabled).toBe(true);

    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(soundButton.classList.contains("mode-button--selected")).toBe(false);
    expect(soundButton.disabled).toBe(false);

    const hintEl = container.querySelector(".mode-picker__hint");
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("Dafür brauchst du gerade Internet 🌐");
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
  });

  it("wählt 'Tiergeräusche' aus, wenn der Testabruf gelingt", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container } = render();

    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();

    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(soundButton.classList.contains("mode-button--selected")).toBe(true);
    expect(soundButton.getAttribute("aria-pressed")).toBe("true");
    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(false);
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
  });

  it("ruft den Testabruf für 'Tiergeräusche' mit der aktuell gewählten Schwierigkeitsstufe auf", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "x" });
    const { container } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
      .click();
    container.querySelector('[data-mode="sound"]').click();

    await vi.waitFor(() => {
      expect(generateNextSoundQuestion).toHaveBeenCalled();
    });
    expect(generateNextSoundQuestion.mock.calls[0][2]).toBe(
      DIFFICULTY_LEVELS.HARD,
    );
  });

  it("erzeugt beim Start einen Quiz-Zustand mit mode 'sound', wenn 'Tiergeräusche' erfolgreich ausgewählt wurde", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("sound");
  });

  it("wechselt unabhängig zwischen 'Wer bin ich?' und 'Tiergeräusche', ohne dass sich die Kacheln gegenseitig stören", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "Wer bin ich?" });
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container } = render();

    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();
    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      true,
    );

    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(soundButton.classList.contains("mode-button--selected")).toBe(true);
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
  });
});

describe("Modus-Auswahl: vierte Kachel 'Buchstabensuche' (Issue #46)", () => {
  it("zeigt 'Buchstabensuche' mit Buchstaben- und Online-Icon, ohne die bestehenden drei Kacheln zu verändern", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    const soundButton = container.querySelector('[data-mode="sound"]');
    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );

    expect(letterSearchButton).not.toBeNull();
    expect(
      letterSearchButton.querySelector(".mode-button__label").textContent,
    ).toBe("Buchstabensuche");
    const onlineIcon = letterSearchButton.querySelector(
      ".mode-button__online-icon",
    );
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    expect(letterSearchButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(letterSearchButton.getAttribute("aria-pressed")).toBe("false");

    // Die drei bestehenden Kacheln bleiben unverändert.
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(reverseButton.querySelector(".mode-button__label").textContent).toBe(
      "Wer bin ich?",
    );
    expect(soundButton.querySelector(".mode-button__label").textContent).toBe(
      "Tiergeräusche",
    );
  });

  it("bleibt bei 'Quizfragen', wenn der Testabruf für 'Buchstabensuche' fehlschlägt, mit freundlichem Hinweis statt Fehlertext", async () => {
    generateNextLetterSearchQuestion.mockRejectedValue(
      new Error("Netzwerkfehler"),
    );
    const { container } = render();

    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();

    expect(letterSearchButton.getAttribute("aria-busy")).toBe("true");
    expect(letterSearchButton.disabled).toBe(true);

    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(letterSearchButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(letterSearchButton.disabled).toBe(false);

    const hintEl = container.querySelector(".mode-picker__hint");
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("Dafür brauchst du gerade Internet 🌐");
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
  });

  it("wählt 'Buchstabensuche' aus, wenn der Testabruf gelingt", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "Löwe",
    });
    const { container } = render();

    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();

    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(letterSearchButton.classList.contains("mode-button--selected")).toBe(
      true,
    );
    expect(letterSearchButton.getAttribute("aria-pressed")).toBe("true");
    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(false);
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
  });

  it("ruft den Testabruf für 'Buchstabensuche' OHNE Schwierigkeitsstufen-Parameter auf (architecture.md: kein difficulty-Parameter nötig)", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "x",
    });
    const { container } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
      .click();
    container.querySelector('[data-mode="letterSearch"]').click();

    await vi.waitFor(() => {
      expect(generateNextLetterSearchQuestion).toHaveBeenCalled();
    });
    expect(generateNextLetterSearchQuestion.mock.calls[0]).toHaveLength(2);
  });

  it("erzeugt beim Start einen Quiz-Zustand mit mode 'letterSearch', wenn 'Buchstabensuche' erfolgreich ausgewählt wurde", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "Löwe",
    });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();
    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("letterSearch");
    expect(quizState.pendingLetterSearchQuestion).toEqual({
      animalName: "Löwe",
    });
    expect(generateNextLetterSearchQuestion).toHaveBeenCalledTimes(1);
  });

  it("verwirft ein zwischenzeitlich vorhandenes Buchstabensuche-Testabruf-Ergebnis, wenn zurück zu 'Quizfragen' gewechselt wird", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "Löwe",
    });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();
    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector('[data-mode="quiz"]').click();
    container.querySelector(".start-button").click();

    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingLetterSearchQuestion).toBeUndefined();
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

  // Analog zu den drei "Wer bin ich?"-Tests oben, aber für Issue #33
  // ('Tiergeräusche') -- deckt den beim Rebase-Merge-Konflikt (siehe main.js/
  // start.js-Historie) neu verdrahteten `pendingSoundQuestion`-Pfad ab, der
  // bislang ungetestet war.
  it("erzeugt nach erfolgreichem Testabruf einen Quiz-Zustand mit mode 'sound' und der bereits aufgelösten ersten Frage", async () => {
    const resolvedQuestion = { text: "Tiergeräusch" };
    generateNextSoundQuestion.mockResolvedValue(resolvedQuestion);
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("sound");
    expect(quizState.pendingSoundQuestion).toBe(resolvedQuestion);
    // Der Testabruf selbst darf für den eigentlichen Rundenstart nicht noch
    // einmal ausgelöst werden (kein zweiter Aufruf durch den Start-Klick).
    expect(generateNextSoundQuestion).toHaveBeenCalledTimes(1);
  });

  it("verwirft ein zwischenzeitlich vorhandenes Tiergeräusche-Testabruf-Ergebnis, wenn zurück zu 'Quizfragen' gewechselt wird", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector('[data-mode="quiz"]').click();
    container.querySelector(".start-button").click();

    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingSoundQuestion).toBeUndefined();
  });
});
