// @vitest-environment jsdom
//
// Tests für die drei Folge-Stories zum "Tiergeräusche"-Modus (Issue #41:
// Infosatz/Wikipedia-Link/Fun Fact, Issue #42: automatisches Feedback-Bild).
// Eigene Testdatei analog zu question.feedbackImage.test.js: hier wird
// gezielt echte(re) Tierdaten (inkl. wikipedia_url_de/fun_fact/
// image_filename) über `../../data/animals.json` gemockt, statt der leeren
// Liste aus soundQuestion.test.js — dieses Mocking-Setup soll die übrigen
// DOM-Tests dort nicht beeinflussen. Issue #43 (Play/Stop-Toggle) wird in
// soundQuestion.test.js abgedeckt, da dort bereits das
// HTMLMediaElement-Stubbing für den Play-Button existiert.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";

const ANIMAL_WITH_EXTRAS = {
  id: "Q1",
  name_de: "Rabe",
  category: "Vogel",
  wikipedia_url_de: "https://de.wikipedia.org/wiki/Rabe",
  fun_fact: "Raben können Werkzeuge benutzen.",
  image_filename: "Rabe.jpg",
};

const ANIMAL_WITHOUT_EXTRAS = {
  id: "Q2",
  name_de: "Eule",
  category: "Vogel",
};

vi.mock("../../data/animals.json", () => ({
  default: { animals: [ANIMAL_WITH_EXTRAS, ANIMAL_WITHOUT_EXTRAS] },
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
      licenseUrl: null,
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

function successResponse(
  thumbUrl = "https://upload.wikimedia.org/thumb/rabe-330px.jpg",
) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        query: {
          pages: {
            1: {
              imageinfo: [
                {
                  thumburl: thumbUrl,
                  extmetadata: {
                    Artist: { value: "Jane Doe" },
                    LicenseShortName: { value: "CC BY-SA 4.0" },
                  },
                },
              ],
            },
          },
        },
      }),
  };
}

// Zwei Microtask-Ticks reichen für die then()-Kette in
// startFeedbackImageFetch (fetch() -> response.json() -> Verarbeitung), ein
// zusätzlicher setTimeout(0) deckt auch den abschließenden .finally()-Zweig
// ab (Makrotask-Grenze) — identisch zu question.feedbackImage.test.js.
async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("renderSoundQuestionScreen — Infosatz/Wikipedia-Link/Fun Fact (Issue #41)", () => {
  let fetchMock;

  beforeEach(() => {
    document.body.innerHTML = "";
    generateNextSoundQuestion.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(
      undefined,
    );
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(
      () => {},
    );
    vi.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(
      () => {},
    );
    fetchMock = vi.fn().mockResolvedValue(successResponse());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("zeigt nach der Antwort den Infosatz inkl. Wikipedia-Link an, wenn das Tier vorhanden ist", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();

    const infoSentenceEl = container.querySelector(
      ".question-screen__info-sentence",
    );
    expect(infoSentenceEl.hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__info-sentence-text")
        .textContent,
    ).toMatch(/Rabe/);

    const wikiLink = container.querySelector(
      ".question-screen__info-sentence-wikipedia-link",
    );
    expect(wikiLink.hidden).toBe(false);
    expect(wikiLink.href).toBe("https://de.wikipedia.org/wiki/Rabe");
    expect(
      container.querySelector(
        ".question-screen__info-sentence-wikipedia-link-text",
      ).textContent,
    ).toBe("Mehr über Rabe auf Wikipedia lesen");
  });

  it("zeigt den Fun Fact an, wenn animal.fun_fact vorhanden ist", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelectorAll(".answer-tile")[1].click(); // falsche Antwort

    const funFactEl = container.querySelector(".question-screen__fun-fact");
    expect(funFactEl.hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__fun-fact-text").textContent,
    ).toBe("Raben können Werkzeuge benutzen.");
  });

  it("zeigt keinen Wikipedia-Link/Fun-Fact-Block, wenn die Felder am Tier fehlen", async () => {
    generateNextSoundQuestion.mockResolvedValue(
      buildQuestion({
        animalId: "Q2",
        animalName: "Eule",
        options: [
          { text: "Eule", correct: true },
          { text: "Rabe", correct: false },
          { text: "Adler", correct: false },
          { text: "Spatz", correct: false },
        ],
      }),
    );
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();

    // Infosatz selbst erscheint immer (category ist Pflichtfeld), Link/Fun
    // Fact bleiben dagegen ausgeblendet, kein Platzhalter.
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(false);
    expect(
      container.querySelector(
        ".question-screen__info-sentence-wikipedia-link",
      ).hidden,
    ).toBe(true);
    expect(
      container.querySelector(".question-screen__fun-fact").hidden,
    ).toBe(true);
  });

  it("setzt Infosatz/Wikipedia-Link/Fun Fact bei jedem Frage-Wechsel vollständig zurück", async () => {
    generateNextSoundQuestion
      .mockResolvedValueOnce(buildQuestion())
      .mockResolvedValueOnce(
        buildQuestion({
          animalId: "Q2",
          animalName: "Eule",
          options: [
            { text: "Eule", correct: true },
            { text: "Rabe", correct: false },
            { text: "Adler", correct: false },
            { text: "Spatz", correct: false },
          ],
        }),
      );
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(false);
    expect(
      container.querySelector(".question-screen__fun-fact").hidden,
    ).toBe(false);

    container.querySelector(".next-button").click();

    // Direkt nach "Weiter" (noch vor Auflösung der nächsten Frage): kein
    // kurzes Aufblitzen des vorherigen Tiers.
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(true);
    expect(
      container.querySelector(".question-screen__info-sentence-text")
        .textContent,
    ).toBe("");
    expect(
      container.querySelector(".question-screen__fun-fact").hidden,
    ).toBe(true);
    expect(
      container.querySelector(
        ".question-screen__info-sentence-wikipedia-link",
      ).hidden,
    ).toBe(true);
  });
});

describe("renderSoundQuestionScreen — automatisches Feedback-Bild (Issue #42)", () => {
  let fetchMock;

  beforeEach(() => {
    document.body.innerHTML = "";
    generateNextSoundQuestion.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(
      undefined,
    );
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(
      () => {},
    );
    vi.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(
      () => {},
    );
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("zeigt nach der Antwort automatisch (ohne Klick) ein Bild mit Attribution und Tiername im Alt-Text, wenn image_filename vorhanden ist", async () => {
    fetchMock.mockResolvedValue(successResponse());
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();

    // Feedback-Text erscheint sofort, unabhängig vom noch laufenden Abruf.
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
    const feedbackImageEl = container.querySelector(
      ".question-screen__feedback-image",
    );
    expect(feedbackImageEl.hidden).toBe(true);

    await flushPromises();

    expect(feedbackImageEl.hidden).toBe(false);
    const imgEl = container.querySelector(
      ".question-screen__feedback-image-img",
    );
    expect(imgEl.src).toBe(
      "https://upload.wikimedia.org/thumb/rabe-330px.jpg",
    );
    expect(imgEl.alt).toBe("Rabe");
    expect(
      container.querySelector(
        ".question-screen__feedback-image-attribution-text",
      ).textContent,
    ).toBe("Foto: Jane Doe · Wikimedia Commons");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("zeigt keinen automatischen Bild-Block, wenn image_filename fehlt (kein fetch-Aufruf)", async () => {
    generateNextSoundQuestion.mockResolvedValue(
      buildQuestion({
        animalId: "Q2",
        animalName: "Eule",
        options: [
          { text: "Eule", correct: true },
          { text: "Rabe", correct: false },
          { text: "Adler", correct: false },
          { text: "Spatz", correct: false },
        ],
      }),
    );
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
  });

  it("zeigt keinen Bild-Block und wirft keinen Fehler, wenn der automatische Abruf auch nach allen Retry-Versuchen fehlschlägt (Issue #103)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    await flushPromises();

    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
    // Issue #103 (portiert aus #96): 3 Versuche insgesamt (1 Erstversuch + 2
    // Retries), bevor endgültig aufgegeben wird — stilles Fehlschlag-
    // Verhalten bleibt danach unverändert (kein Fehlertext, kein Crash,
    // siehe Assertions oben).
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("zeigt das Bild nach einem fehlgeschlagenen ersten Versuch, sobald der zweite Versuch erfolgreich ist (Issue #103, Retry)", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(successResponse());
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    // Feedback-Text erscheint sofort, unabhängig vom noch laufenden Abruf.
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );

    await flushPromises();

    const feedbackImageEl = container.querySelector(
      ".question-screen__feedback-image",
    );
    expect(feedbackImageEl.hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__feedback-image-img").src,
    ).toBe("https://upload.wikimedia.org/thumb/rabe-330px.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gibt nach dem letzten Retry-Versuch endgültig auf, ohne einen weiteren (vierten) Fetch-Aufruf auszulösen (Issue #103)", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("network down"))
      .mockRejectedValueOnce(new Error("nicht auflösbare Datei"));
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Rest der Feedback-UI (Text, "Weiter"-Button) bleibt unbeeinflusst.
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
    expect(container.querySelector(".next-button").hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
  });

  it("wartet mit Feedback-Text/Infosatz/'Weiter'-Button nicht auf den Bildabruf (nicht-blockierend)", async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // löst absichtlich nie auf
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();

    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(false);
    expect(container.querySelector(".next-button").hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
  });

  it("setzt den automatischen Bild-Block bei jeder neuen Frage vollständig zurück", async () => {
    fetchMock.mockResolvedValue(successResponse());
    generateNextSoundQuestion
      .mockResolvedValueOnce(buildQuestion())
      .mockResolvedValueOnce(
        buildQuestion({
          animalId: "Q2",
          animalName: "Eule",
          options: [
            { text: "Eule", correct: true },
            { text: "Rabe", correct: false },
            { text: "Adler", correct: false },
            { text: "Spatz", correct: false },
          ],
        }),
      );
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    await flushPromises();
    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(false);

    container.querySelector(".next-button").click();

    const feedbackImageEl = container.querySelector(
      ".question-screen__feedback-image",
    );
    expect(feedbackImageEl.hidden).toBe(true);
    expect(
      container
        .querySelector(".question-screen__feedback-image-img")
        .getAttribute("src"),
    ).toBe("");
  });

  it("ignoriert eine spät eintreffende Antwort, wenn vor Abschluss des Abrufs bereits zur nächsten Frage gewechselt wurde (Stale-Response-Schutz)", async () => {
    let resolveJson;
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        new Promise((resolve) => {
          resolveJson = resolve;
        }),
    });
    generateNextSoundQuestion
      .mockResolvedValueOnce(buildQuestion())
      .mockResolvedValueOnce(
        buildQuestion({
          animalId: "Q2",
          animalName: "Eule",
          options: [
            { text: "Eule", correct: true },
            { text: "Rabe", correct: false },
            { text: "Adler", correct: false },
            { text: "Spatz", correct: false },
          ],
        }),
      );
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click();
    container.querySelector(".next-button").click();

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    // `resolveJson` wird erst zugewiesen, sobald die then()-Kette
    // tatsächlich response.json() aufruft — hier auf genau diesen Punkt
    // warten, bevor die (inzwischen veraltete) Antwort für Frage 1 aufgelöst
    // wird.
    await vi.waitFor(() => expect(resolveJson).toBeDefined());
    resolveJson({
      query: {
        pages: {
          1: {
            imageinfo: [
              { thumburl: "https://example.org/late.jpg", extmetadata: {} },
            ],
          },
        },
      },
    });
    await flushPromises();

    // Frage 2 (Eule) hat kein image_filename -> Block muss ausgeblendet
    // bleiben, die veraltete Antwort von Frage 1 (Rabe) darf nicht mehr
    // hineingerendert werden.
    const feedbackImageEl = container.querySelector(
      ".question-screen__feedback-image",
    );
    expect(feedbackImageEl.hidden).toBe(true);
    expect(
      container
        .querySelector(".question-screen__feedback-image-img")
        .getAttribute("src"),
    ).toBe("");
  });
});
