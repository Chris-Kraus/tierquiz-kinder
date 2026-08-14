// @vitest-environment jsdom
//
// Tests für den automatischen Feedback-Bild-Block (Issue #30: "Bild-
// Rateshilfe: Automatische Anzeige nach der Antwort"). Deckt die neue,
// eigenständige DOM-Instanz aus src/screens/question.js ab (siehe
// startFeedbackImageFetch/resetFeedbackImage dort) — eigene Testdatei
// analog zu question.test.js (Fun-Fact-Block, Issue #24), da hier ein
// eigenes fetch()-Mocking-Setup nötig ist, das die übrigen DOM-Tests nicht
// beeinflussen soll (question.js importiert kein fetch-Polyfill selbst,
// sondern nutzt das globale `fetch`, siehe imageHint.js-Datei-Kommentar:
// der eigentliche fetch()-Aufruf lebt bewusst in question.js).
//
// `data/animals.json`/`data/confusionPairs.json` werden wie in
// question.test.js gemockt statt der echten Dateien, da hier gezielt
// `image_filename` je Testfall variieren muss.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";

const ANIMAL_WITH_IMAGE = {
  id: "Q1",
  name_de: "Wolf",
  category: "Säugetier",
  image_filename: "Wolf.jpg",
};

const ANIMAL_WITHOUT_IMAGE = {
  id: "Q2",
  name_de: "Fuchs",
  category: "Säugetier",
};

vi.mock("../../data/animals.json", () => ({
  default: { animals: [ANIMAL_WITH_IMAGE, ANIMAL_WITHOUT_IMAGE] },
}));

vi.mock("../../data/confusionPairs.json", () => ({
  default: { pairs: [] },
}));

const { renderQuestionScreen } = await import("./question.js");
const { createQuizState } = await import("../quiz/state.js");

function buildQuestion(animalId, correctText) {
  return {
    text: `Frage zu ${animalId}?`,
    animalId,
    field: "name_de",
    options: [
      { text: correctText, correct: true },
      { text: "Falsch A", correct: false },
      { text: "Falsch B", correct: false },
      { text: "Falsch C", correct: false },
    ],
  };
}

function clickFirstAnswerTile(container) {
  container.querySelector(".answer-tile").click();
}

function successResponse(
  thumbUrl = "https://upload.wikimedia.org/thumb/wolf-330px.jpg",
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
// ab (Makrotask-Grenze).
async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("renderQuestionScreen — automatischer Feedback-Bild-Block (Issue #30)", () => {
  let container;
  let fetchMock;

  beforeEach(() => {
    container = document.createElement("div");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("zeigt nach der Antwort automatisch (ohne Klick) ein Bild mit Attribution und Tiername im Alt-Text, wenn image_filename vorhanden ist", async () => {
    fetchMock.mockResolvedValue(successResponse());

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);

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
      "https://upload.wikimedia.org/thumb/wolf-330px.jpg",
    );
    expect(imgEl.alt).toBe("Wolf");
    expect(
      container.querySelector(
        ".question-screen__feedback-image-attribution-text",
      ).textContent,
    ).toBe("Foto: Jane Doe · Wikimedia Commons");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("zeigt keinen automatischen Bild-Block, wenn image_filename fehlt (kein fetch-Aufruf)", async () => {
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q2", "Fuchs"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
    // Übriger Feedback-Bereich bleibt unverändert sichtbar.
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
  });

  it("zeigt keinen Bild-Block und wirft keinen Fehler, wenn der automatische Abruf fehlschlägt", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);
    await flushPromises();

    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
  });

  it("überspringt den automatischen Bild-Block, wenn das Bild bereits vor der Antwort manuell aufgedeckt wurde (kein Duplikat-Abruf)", async () => {
    fetchMock.mockResolvedValue(successResponse());

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    // Manuelles Aufdecken vor der Antwort (bestehender Issue #16-Mechanismus).
    container.querySelector(".image-hint-button").click();
    await flushPromises();
    expect(container.querySelector(".image-hint").hidden).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clickFirstAnswerTile(container);
    await flushPromises();

    // Kein zweiter Netzwerk-Call, kein automatischer Feedback-Bild-Block.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
    // Das bereits aufgedeckte Pre-Answer-Bild bleibt einfach stehen.
    expect(container.querySelector(".image-hint").hidden).toBe(false);
  });

  it("wartet mit Feedback-Text/Infosatz/'Weiter'-Button nicht auf den Bildabruf (nicht-blockierend)", () => {
    vi.useFakeTimers();
    fetchMock.mockReturnValue(new Promise(() => {})); // löst absichtlich nie auf

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);

    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(false);
    expect(container.querySelector(".next-button").hidden).toBe(false);
    // Bild-Block bleibt (noch) ausgeblendet, da der Abruf absichtlich nie
    // aufgelöst wird — kein Layout-Sprung, kein Fehlertext, aber auch kein
    // Warten des übrigen Feedback-Ablaufs darauf (siehe Assertions oben).
    expect(
      container.querySelector(".question-screen__feedback-image").hidden,
    ).toBe(true);
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

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
      buildQuestion("Q2", "Fuchs"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);
    // Kind tippt sofort "Weiter", bevor der Abruf für Frage 1 fertig ist.
    container.querySelector(".next-button").click();

    // `resolveJson` wird erst zugewiesen, sobald die then()-Kette in
    // startFeedbackImageFetch tatsächlich response.json() aufruft (ein
    // Microtask nach dem fetch()-Mock) — hier auf genau diesen Punkt warten,
    // bevor die (inzwischen veraltete) Antwort für Frage 1 aufgelöst wird.
    await Promise.resolve();
    await Promise.resolve();
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

    // Frage 2 hat kein image_filename -> Block muss ausgeblendet bleiben,
    // die veraltete Antwort von Frage 1 darf nicht mehr hineingerendert
    // werden.
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

  it("setzt den automatischen Bild-Block bei jeder neuen Frage vollständig zurück", async () => {
    fetchMock.mockResolvedValue(successResponse());

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
      buildQuestion("Q2", "Fuchs"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);
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
});
