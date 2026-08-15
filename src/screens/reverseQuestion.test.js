// @vitest-environment jsdom
//
// DOM-Tests für den neuen "Wer bin ich?"-Frage-Bildschirm (Issue #28,
// design.md "Frage-/Feedback-Bildschirm 'Wer bin ich?'"). Analog zum Muster
// in question.test.js/reverseQuestionGenerator.test.js:
// `../quiz/reverseQuestionGenerator.js` wird komplett gemockt (URL-
// Konstruktion/Netzwerk-Verhalten selbst ist bereits in
// reverseQuestionGenerator.test.js abgedeckt), hier wird nur geprüft, wie der
// Bildschirm auf Erfolg/Fehlschlag/vorab aufgelöste erste Frage reagiert.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";
import { GAME_MODE } from "../quiz/gameMode.js";

vi.mock("../../data/animals.json", () => ({
  default: { animals: [] },
}));

const generateNextReverseQuestion = vi.fn();
vi.mock("../quiz/reverseQuestionGenerator.js", () => ({
  generateNextReverseQuestion: (...args) =>
    generateNextReverseQuestion(...args),
  REVERSE_QUESTION_IMAGE_ALT_TEXT:
    "Foto eines Tieres – errate, welches Tier das ist",
}));

const { renderReverseQuestionScreen } = await import("./reverseQuestion.js");
const { createQuizState } = await import("../quiz/state.js");

function buildQuestion(overrides = {}) {
  return {
    id: "loewe-reverse-identify",
    animalId: "Q1",
    animalName: "Löwe",
    field: "reverse_identify",
    questionType: "reverseIdentify",
    image: {
      url: "https://commons.example/loewe-330px.jpg",
      alt: "Foto eines Tieres – errate, welches Tier das ist",
    },
    attribution: {
      text: "Foto: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://example.com/license",
    },
    options: [
      { text: "Löwe", correct: true },
      { text: "Tiger", correct: false },
      { text: "Elefant", correct: false },
      { text: "Zebra", correct: false },
    ],
    ...overrides,
  };
}

function render(quizState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onFinish = vi.fn();
  renderReverseQuestionScreen(container, quizState, { onFinish });
  return { container, onFinish };
}

beforeEach(() => {
  document.body.innerHTML = "";
  generateNextReverseQuestion.mockReset();
});

describe("renderReverseQuestionScreen (Issue #28)", () => {
  it("zeigt den reservierten Bildrahmen mit Ladeanimation, solange die Frage noch nicht aufgelöst ist", () => {
    generateNextReverseQuestion.mockReturnValue(new Promise(() => {})); // hängt bewusst
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.REVERSE,
    );
    const { container } = render(quizState);

    const frame = container.querySelector(".reverse-image-frame");
    expect(frame.getAttribute("aria-busy")).toBe("true");
    expect(
      container.querySelector(".reverse-image-frame__loading").hidden,
    ).toBe(false);
    expect(container.querySelector(".reverse-image-frame__image").hidden).toBe(
      true,
    );
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 1 von 3",
    );
    // Fixe Überschrift statt wechselndem Fragetext (design.md).
    expect(container.querySelector("#reverse-question-heading").textContent.trim()).toBe(
      "Wer bin ich?",
    );
  });

  it("zeigt nach erfolgreicher Auflösung Bild (mit generischem Alt-Text), Attribution und die 4 Namensoptionen", async () => {
    generateNextReverseQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.REVERSE,
    );
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(
        container.querySelector(".reverse-image-frame").getAttribute(
          "aria-busy",
        ),
      ).toBe("false");
    });

    const img = container.querySelector(".reverse-image-frame__image");
    expect(img.hidden).toBe(false);
    expect(img.src).toBe("https://commons.example/loewe-330px.jpg");
    // Wichtige Abweichung von Issue #16: KEIN Tiername im Alt-Text.
    expect(img.alt).not.toMatch(/Löwe/);
    expect(img.alt).toBe(
      "Foto eines Tieres – errate, welches Tier das ist",
    );

    const attributionText = container.querySelector(
      ".reverse-question__attribution-text",
    );
    expect(attributionText.textContent).toBe(
      "Foto: Jane Doe · Wikimedia Commons",
    );
    const attributionLink = container.querySelector(
      ".image-hint__attribution-link",
    );
    expect(attributionLink.hidden).toBe(false);
    expect(attributionLink.href).toBe("https://example.com/license");

    const tiles = container.querySelectorAll(".answer-tile");
    expect(tiles).toHaveLength(4);
    expect(
      Array.from(tiles).map((tile) => tile.textContent.trim()),
    ).toEqual(["Löwe", "Tiger", "Elefant", "Zebra"]);
  });

  it("nutzt eine bereits am Start-Bildschirm aufgelöste erste Frage ohne erneuten Abruf", () => {
    const pending = buildQuestion();
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.REVERSE,
    );
    quizState.pendingReverseQuestion = pending;
    const { container } = render(quizState);

    // Kein zusätzlicher Ladebildschirm nach dem Moduswechsel (design.md).
    expect(generateNextReverseQuestion).not.toHaveBeenCalled();
    expect(
      container.querySelector(".reverse-image-frame").getAttribute(
        "aria-busy",
      ),
    ).toBe("false");
    expect(container.querySelector(".reverse-image-frame__image").hidden).toBe(
      false,
    );
    // Transientes Feld wird konsumiert, nicht dauerhaft im Zustand belassen.
    expect(quizState.pendingReverseQuestion).toBeUndefined();
  });

  it("zeigt Sofort-Feedback bei richtiger Antwort und aktualisiert den Punktestand", async () => {
    generateNextReverseQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.REVERSE,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click(); // erste Option: "Löwe" (correct)

    const feedback = container.querySelector(".question-screen__feedback");
    expect(feedback.hidden).toBe(false);
    expect(feedback.textContent).toMatch(/richtig/);
    expect(quizState.score).toBe(1);
    expect(container.querySelector(".next-button").hidden).toBe(false);
  });

  it("zeigt Sofort-Feedback mit korrekter Antwort bei falscher Wahl, ohne Punktestand zu erhöhen", async () => {
    generateNextReverseQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.REVERSE,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    const tiles = container.querySelectorAll(".answer-tile");
    tiles[1].click(); // "Tiger" (falsch)

    const feedback = container.querySelector(".question-screen__feedback");
    expect(feedback.textContent).toMatch(/Löwe/); // nennt die richtige Antwort
    expect(quizState.score).toBe(0);
    expect(tiles[0].classList.contains("answer-tile--correct")).toBe(true);
    expect(tiles[1].classList.contains("answer-tile--selected-wrong")).toBe(
      true,
    );
  });

  it("lädt nach 'Weiter' die nächste Frage und setzt Bild/Attribution/Ladezustand vollständig zurück", async () => {
    const first = buildQuestion();
    const second = buildQuestion({
      animalId: "Q2",
      animalName: "Tiger",
      image: {
        url: "https://commons.example/tiger-330px.jpg",
        alt: "Foto eines Tieres – errate, welches Tier das ist",
      },
      attribution: { text: "Wikimedia Commons", licenseUrl: null },
      options: [
        { text: "Tiger", correct: true },
        { text: "Löwe", correct: false },
        { text: "Puma", correct: false },
        { text: "Gepard", correct: false },
      ],
    });
    generateNextReverseQuestion
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.REVERSE,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    container.querySelector(".next-button").click();

    // Direkt nach dem Klick (noch vor Auflösung von `second`): Reset sichtbar.
    expect(
      container.querySelector(".reverse-image-frame").getAttribute(
        "aria-busy",
      ),
    ).toBe("true");
    expect(
      container.querySelector(".reverse-question__attribution-text")
        .textContent,
    ).toBe("");
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      true,
    );
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 2 von 3",
    );

    await vi.waitFor(() => {
      const img = container.querySelector(".reverse-image-frame__image");
      expect(img.src).toBe("https://commons.example/tiger-330px.jpg");
    });
    // Kein Lizenz-Link, wenn keiner vorhanden ist (fehlende Felder werden
    // übersprungen statt "unbekannt" anzuzeigen, design.md).
    expect(
      container.querySelector(".image-hint__attribution-link").hidden,
    ).toBe(true);
    expect(generateNextReverseQuestion).toHaveBeenCalledTimes(2);
  });

  it("zeigt bei Fehlschlag einen freundlichen Fehlerzustand mit 'Nochmal versuchen', ohne die Runde abzubrechen", async () => {
    generateNextReverseQuestion.mockRejectedValueOnce(new Error("Netzwerkfehler"));
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.REVERSE,
    );
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(container.querySelector(".reverse-image-frame__error").hidden).toBe(
        false,
      );
    });
    // Kein technischer Fehlertext im DOM.
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
    // Bleibt bei Frage 1 -- kein Rundenabbruch/Fortschritt.
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 1 von 3",
    );
    expect(quizState.currentIndex).toBe(0);

    generateNextReverseQuestion.mockResolvedValueOnce(buildQuestion());
    container.querySelector(".reverse-image-frame__retry-button").click();

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );
    expect(container.querySelector(".reverse-image-frame__error").hidden).toBe(
      true,
    );
    expect(generateNextReverseQuestion).toHaveBeenCalledTimes(2);
  });

  it("ruft onFinish nach der letzten Frage mit korrektem Punktestand und vollständiger Fragenliste auf", async () => {
    generateNextReverseQuestion
      .mockResolvedValueOnce(buildQuestion({ animalId: "Q1" }))
      .mockResolvedValueOnce(buildQuestion({ animalId: "Q2" }));

    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      2,
      GAME_MODE.REVERSE,
    );
    const { container, onFinish } = render(quizState);

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );
    container.querySelector(".answer-tile").click(); // Frage 1: richtig
    container.querySelector(".next-button").click();

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );
    container.querySelectorAll(".answer-tile")[1].click(); // Frage 2: falsch
    container.querySelector(".next-button").click();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(quizState.score).toBe(1);
    expect(quizState.questions).toHaveLength(2);
    expect(quizState.answers).toHaveLength(2);
  });
});
