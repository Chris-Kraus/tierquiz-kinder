// @vitest-environment jsdom
//
// DOM-Tests für den neuen "Tiergeräusche"-Frage-Bildschirm (Issue #33,
// design.md "Frage-/Feedback-Bildschirm 'Tiergeräusche'"). Analog zum Muster
// in question.test.js/reverseQuestion.test.js: `../quiz/
// soundQuestionGenerator.js` wird komplett gemockt (URL-Konstruktion/
// Netzwerk-Verhalten selbst ist bereits in soundQuestionGenerator.test.js
// abgedeckt), hier wird nur geprüft, wie der Bildschirm auf Erfolg/
// Fehlschlag reagiert sowie auf das neue Play-Button-/Wiederholbarkeits-
// Verhalten, das es bei #28 (Bild statt Ton) nicht gab.
//
// jsdom implementiert HTMLMediaElement.play()/pause()/load() nicht wirklich
// (würde sonst zur Laufzeit einen "not implemented"-Fehler über die
// virtualConsole melden) — play/pause/load werden daher global gestubbt,
// damit die Tests deterministisch bleiben und gezielt prüfen können, WANN
// play() aufgerufen wird (insbesondere: nie automatisch, siehe "kein
// Autoplay"-Test unten).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";

vi.mock("../../data/animals.json", () => ({
  default: { animals: [] },
}));

const generateNextSoundQuestion = vi.fn();
vi.mock("../quiz/soundQuestionGenerator.js", () => ({
  generateNextSoundQuestion: (...args) => generateNextSoundQuestion(...args),
}));

const { renderSoundQuestionScreen } = await import("./soundQuestion.js");
const { createQuizState } = await import("../quiz/state.js");

function buildQuestion(overrides = {}) {
  return {
    id: "rabe-sound-identify",
    animalId: "Q1",
    animalName: "Rabe",
    field: "sound_identify",
    questionType: "soundIdentify",
    audio: {
      url: "https://commons.example/rabe.ogg",
    },
    attribution: {
      text: "Ton: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://example.com/license",
    },
    options: [
      { text: "Rabe", correct: true },
      { text: "Eule", correct: false },
      { text: "Adler", correct: false },
      { text: "Spatz", correct: false },
    ],
    ...overrides,
  };
}

function render(quizState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onFinish = vi.fn();
  renderSoundQuestionScreen(container, quizState, { onFinish });
  return { container, onFinish };
}

beforeEach(() => {
  // vi.restoreAllMocks() ZUERST: vi.spyOn auf eine bereits gespyte Methode
  // liefert sonst dieselbe Spy-Instanz mit der Aufruf-Historie der
  // vorherigen Tests zurück (keine automatische Zurücksetzung zwischen
  // Tests) — ohne diesen Reset würden play()-Aufrufzahlen über Tests hinweg
  // kumulieren statt pro Test bei 0 zu starten.
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  generateNextSoundQuestion.mockReset();
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(
    undefined,
  );
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(
    () => {},
  );
  vi.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(
    () => {},
  );
});

describe("renderSoundQuestionScreen (Issue #33)", () => {
  it("zeigt den reservierten Player-Rahmen mit Ladeanimation, solange die Frage noch nicht aufgelöst ist", () => {
    generateNextSoundQuestion.mockReturnValue(new Promise(() => {})); // hängt bewusst
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    const frame = container.querySelector(".sound-player-frame");
    expect(frame.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector(".sound-player-frame__loading").hidden).toBe(
      false,
    );
    expect(container.querySelector(".sound-play-button").hidden).toBe(true);
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 1 von 3",
    );
    // Fixe Überschrift statt wechselndem Fragetext (design.md).
    expect(
      container.querySelector("#sound-question-heading").textContent.trim(),
    ).toBe("Welches Tier ist das?");
  });

  it("zeigt nach erfolgreicher Auflösung den Play-Button, die Attribution und die 4 Namensoptionen", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(
        container.querySelector(".sound-player-frame").getAttribute(
          "aria-busy",
        ),
      ).toBe("false");
    });

    const playButton = container.querySelector(".sound-play-button");
    expect(playButton.hidden).toBe(false);
    expect(playButton.getAttribute("aria-label")).toBe("Tierlaut abspielen");
    expect(container.querySelector(".sound-question__audio").src).toBe(
      "https://commons.example/rabe.ogg",
    );

    const attributionText = container.querySelector(
      ".sound-question__attribution-text",
    );
    expect(attributionText.textContent).toBe(
      "Ton: Jane Doe · Wikimedia Commons",
    );
    const attributionLink = container.querySelector(
      ".image-hint__attribution-link",
    );
    expect(attributionLink.hidden).toBe(false);
    expect(attributionLink.href).toBe("https://example.com/license");

    const tiles = container.querySelectorAll(".answer-tile");
    expect(tiles).toHaveLength(4);
    expect(Array.from(tiles).map((tile) => tile.textContent.trim())).toEqual([
      "Rabe",
      "Eule",
      "Adler",
      "Spatz",
    ]);

    // Regressionsschutz für den manuell (Playwright, 375px/iPhone SE)
    // gefundenen Scroll-Bug: ohne diese Modifier-Klasse fällt .answer-grid
    // unterhalb 30rem auf ein 1-Spalten-Layout zurück, das zusammen mit dem
    // Player-Rahmen + der Pflicht-Attribution die Kernaufgabe zum Scrollen
    // bringt (design.md, "Kein Scrollen bei der Kernaufgabe").
    expect(
      container
        .querySelector(".answer-grid")
        .classList.contains("answer-grid--sound"),
    ).toBe(true);
  });

  it("spielt den Ton NICHT automatisch ab — erst ein Tap auf den Play-Button startet die Wiedergabe", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() =>
      expect(container.querySelector(".sound-play-button").hidden).toBe(
        false,
      ),
    );

    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    container.querySelector(".sound-play-button").click();
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("kann den Ton beliebig oft über denselben Button erneut abspielen und wechselt danach das aria-label", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() =>
      expect(container.querySelector(".sound-play-button").hidden).toBe(
        false,
      ),
    );

    const playButton = container.querySelector(".sound-play-button");
    playButton.click();
    expect(playButton.getAttribute("aria-label")).toBe(
      "Tierlaut noch einmal abspielen",
    );

    playButton.click();
    playButton.click();
    // Kein Limit — beliebig oft antippbar (design.md).
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3);
  });

  it("zeigt Sofort-Feedback bei richtiger Antwort und aktualisiert den Punktestand", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click(); // erste Option: "Rabe" (correct)

    const feedback = container.querySelector(".question-screen__feedback");
    expect(feedback.hidden).toBe(false);
    expect(feedback.textContent).toMatch(/richtig/);
    expect(quizState.score).toBe(1);
    expect(container.querySelector(".next-button").hidden).toBe(false);
  });

  it("zeigt Sofort-Feedback mit korrekter Antwort bei falscher Wahl, ohne Punktestand zu erhöhen", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    const tiles = container.querySelectorAll(".answer-tile");
    tiles[1].click(); // "Eule" (falsch)

    const feedback = container.querySelector(".question-screen__feedback");
    expect(feedback.textContent).toMatch(/Rabe/); // nennt die richtige Antwort
    expect(quizState.score).toBe(0);
    expect(tiles[0].classList.contains("answer-tile--correct")).toBe(true);
    expect(tiles[1].classList.contains("answer-tile--selected-wrong")).toBe(
      true,
    );
  });

  it("lädt nach 'Weiter' die nächste Frage und setzt Ton/Attribution/Ladezustand vollständig zurück", async () => {
    const first = buildQuestion();
    const second = buildQuestion({
      animalId: "Q2",
      animalName: "Eule",
      audio: { url: "https://commons.example/eule.ogg" },
      attribution: { text: "Wikimedia Commons", licenseUrl: null },
      options: [
        { text: "Eule", correct: true },
        { text: "Rabe", correct: false },
        { text: "Adler", correct: false },
        { text: "Spatz", correct: false },
      ],
    });
    generateNextSoundQuestion
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    // Ton einmal abspielen, damit sich hasPlayedOnce/aria-label danach
    // nachweislich wieder zurücksetzt.
    container.querySelector(".sound-play-button").click();
    container.querySelector(".answer-tile").click();
    container.querySelector(".next-button").click();

    // Direkt nach dem Klick (noch vor Auflösung von `second`): Reset sichtbar.
    expect(
      container.querySelector(".sound-player-frame").getAttribute(
        "aria-busy",
      ),
    ).toBe("true");
    expect(
      container.querySelector(".sound-question__attribution-text")
        .textContent,
    ).toBe("");
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      true,
    );
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 2 von 3",
    );

    await vi.waitFor(() => {
      const playButton = container.querySelector(".sound-play-button");
      expect(playButton.hidden).toBe(false);
    });
    expect(container.querySelector(".sound-question__audio").src).toBe(
      "https://commons.example/eule.ogg",
    );
    // Label wieder im Ausgangszustand -- hasPlayedOnce wurde zurückgesetzt.
    expect(
      container.querySelector(".sound-play-button").getAttribute(
        "aria-label",
      ),
    ).toBe("Tierlaut abspielen");
    // Kein Lizenz-Link, wenn keiner vorhanden ist (fehlende Felder werden
    // übersprungen statt "unbekannt" anzuzeigen, design.md).
    expect(
      container.querySelector(".image-hint__attribution-link").hidden,
    ).toBe(true);
    expect(generateNextSoundQuestion).toHaveBeenCalledTimes(2);
  });

  it("zeigt bei Fehlschlag einen freundlichen Fehlerzustand mit 'Nochmal versuchen', ohne die Runde abzubrechen", async () => {
    generateNextSoundQuestion.mockRejectedValueOnce(
      new Error("Netzwerkfehler"),
    );
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(container.querySelector(".sound-player-frame__error").hidden).toBe(
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

    generateNextSoundQuestion.mockResolvedValueOnce(buildQuestion());
    container.querySelector(".sound-player-frame__retry-button").click();

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );
    expect(container.querySelector(".sound-player-frame__error").hidden).toBe(
      true,
    );
    expect(generateNextSoundQuestion).toHaveBeenCalledTimes(2);
  });

  it("ruft onFinish nach der letzten Frage mit korrektem Punktestand und vollständiger Fragenliste auf", async () => {
    generateNextSoundQuestion
      .mockResolvedValueOnce(buildQuestion({ animalId: "Q1" }))
      .mockResolvedValueOnce(buildQuestion({ animalId: "Q2" }));

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 2);
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
