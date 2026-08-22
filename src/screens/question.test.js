// @vitest-environment jsdom
//
// Tests für den Fun-Fact-Block im Frage-Bildschirm (Issue #24, "Fun Fact im
// Feedback-Schritt"). Analog zum in Issue #15 verdrahteten Wikipedia-Link
// (bislang ohne eigene DOM-Tests) wird hier erstmals ein DOM-Test für
// src/screens/question.js ergänzt — dafür `jsdom` als neue Dev-Dependency
// sowie das `@vitest-environment jsdom`-Docblock-Pragma oben (nur für diese
// Datei, keine projektweite Umstellung der Standard-Testumgebung nötig).
//
// `data/animals.json`/`data/confusionPairs.json` werden bewusst gemockt
// statt der echten Dateien: `fun_fact` ist in der echten `data/animals.json`
// aktuell für kein einziges Tier befüllt (Kuration läuft parallel in Issue
// #25), ein Test gegen die echten Daten könnte den Vorhanden-Fall also nicht
// abdecken.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";
import {
  setActiveIdx,
  redeemMascot,
  recordRoundCompletion,
} from "../quiz/progress.js";
import { GAME_MODE } from "../quiz/gameMode.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";

const ANIMAL_WITH_FUN_FACT = {
  id: "Q1",
  name_de: "Wolf",
  category: "Säugetier",
  fun_fact: "Wölfe können bis zu 60 km/h schnell laufen.",
};

const ANIMAL_WITHOUT_FUN_FACT = {
  id: "Q2",
  name_de: "Fuchs",
  category: "Säugetier",
};

vi.mock("../../data/animals.json", () => ({
  default: { animals: [ANIMAL_WITH_FUN_FACT, ANIMAL_WITHOUT_FUN_FACT] },
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

describe("renderQuestionScreen — Fun-Fact-Block (Issue #24)", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("zeigt den Fun-Fact-Block mit dem Text des Tieres, wenn fun_fact vorhanden ist", () => {
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);

    const funFactEl = container.querySelector(".question-screen__fun-fact");
    const funFactTextEl = container.querySelector(
      ".question-screen__fun-fact-text",
    );

    expect(funFactEl.hidden).toBe(false);
    expect(funFactTextEl.textContent).toBe(ANIMAL_WITH_FUN_FACT.fun_fact);
  });

  it("blendet den Fun-Fact-Block ohne Platzhalter/Hinweis aus, wenn fun_fact fehlt", () => {
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q2", "Fuchs"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);

    const funFactEl = container.querySelector(".question-screen__fun-fact");
    const funFactTextEl = container.querySelector(
      ".question-screen__fun-fact-text",
    );

    // Bestehendes Feedback (Richtig/Falsch) bleibt unverändert sichtbar --
    // nur der Fun-Fact-Block selbst bleibt ausgeblendet, kein Platzhaltertext.
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      false,
    );
    expect(funFactEl.hidden).toBe(true);
    expect(funFactTextEl.textContent).toBe("");
  });

  it("bleibt unabhängig vom Infosatz-Block (Issue #12) — beide können unabhängig voneinander befüllt sein", () => {
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);

    const infoSentenceEl = container.querySelector(
      ".question-screen__info-sentence",
    );
    const funFactEl = container.querySelector(".question-screen__fun-fact");

    // Infosatz wird laut Issue #12 immer angezeigt (unabhängig von fun_fact) --
    // beide Blöcke existieren nebeneinander, keiner ersetzt den anderen.
    expect(infoSentenceEl.hidden).toBe(false);
    expect(funFactEl.hidden).toBe(false);
    expect(funFactEl).not.toBe(infoSentenceEl);
  });

  it("setzt den Fun-Fact-Block bei jeder neuen Frage vollständig zurück", () => {
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
      buildQuestion("Q2", "Fuchs"),
    ]);
    renderQuestionScreen(container, quizState);

    // Frage 1 (Wolf, hat fun_fact) beantworten.
    clickFirstAnswerTile(container);
    expect(container.querySelector(".question-screen__fun-fact").hidden).toBe(
      false,
    );

    // Weiter zu Frage 2 (Fuchs, kein fun_fact).
    container.querySelector(".next-button").click();

    const funFactEl = container.querySelector(".question-screen__fun-fact");
    const funFactTextEl = container.querySelector(
      ".question-screen__fun-fact-text",
    );
    expect(funFactEl.hidden).toBe(true);
    expect(funFactTextEl.textContent).toBe("");
  });
});

describe("Visuelle Unterscheidbarkeit Infosatz vs. Fun-Fact (Issue #24 QA-Bugfix)", () => {
  let container;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("zeigt Icon+\"Wusstest du schon?\" NUR beim Fun-Fact-Block, nicht beim Infosatz-Block", () => {
    // Q1 (Wolf) hat sowohl category (-> Infosatz) als auch fun_fact befüllt,
    // damit beide Blöcke gleichzeitig sichtbar sind (design.md, "Klarstellung
    // 14.08.2026 (Rückfrage aus Issue #24)": Icon+"Wusstest du schon?" sind
    // exklusives Erkennungsmerkmal des Fun-Fact-Blocks).
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    clickFirstAnswerTile(container);

    const infoSentenceEl = container.querySelector(
      ".question-screen__info-sentence",
    );
    const funFactEl = container.querySelector(".question-screen__fun-fact");

    expect(infoSentenceEl.hidden).toBe(false);
    expect(funFactEl.hidden).toBe(false);

    // Infosatz-Block: kein Icon, keine "Wusstest du schon?"-Einleitung mehr.
    expect(
      infoSentenceEl.querySelector(".question-screen__info-sentence-icon"),
    ).toBeNull();
    expect(
      infoSentenceEl.querySelector(".question-screen__info-sentence-lead"),
    ).toBeNull();
    expect(infoSentenceEl.textContent).not.toContain("Wusstest du schon?");
    // Stattdessen Überschrift-/Doppelpunkt-Format (architecture.md,
    // "Infosatz-Basisbaustein — Genus-Lücke").
    expect(
      container.querySelector(".question-screen__info-sentence-text")
        .textContent,
    ).toMatch(/^Wolf:/);

    // Fun-Fact-Block: Icon + "Wusstest du schon?" bleiben unverändert.
    expect(
      funFactEl.querySelector(".question-screen__fun-fact-icon"),
    ).not.toBeNull();
    expect(funFactEl.textContent).toContain("Wusstest du schon?");
  });
});

// Issue #82, dritter Teil des Sterne-/Maskottchen-Freischaltsystems
// (#80-#83): das `.feedback-panel__mascot`-Feld zeigt Tint + Emoji + Name +
// Rolle des aktiven Maskottchens, konsistent mit der Guide-Karte auf dem
// Start-Bildschirm (siehe start.test.js). QA-Bugfix (Test-Fix-Zyklus 1):
// Name/Rolle fehlten ursprünglich komplett als Text -- die beiden `it`-
// Blöcke unten prüfen jetzt zusätzlich zu Tint/Emoji auch Name und Rolle,
// um genau diese Testlücke zu schließen.
describe("Dynamisches Maskottchen im Feedback-Panel (Issue #82)", () => {
  function createFakeStorage() {
    const store = new Map();
    return {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => {
        store.set(key, String(value));
      },
    };
  }

  beforeEach(() => {
    globalThis.localStorage = createFakeStorage();
  });

  it("zeigt das Start-Default-Maskottchen (Fine der Fuchs) mit seinem Tint", () => {
    const container = document.createElement("div");
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    const mascotEl = container.querySelector(".feedback-panel__mascot");
    expect(mascotEl.getAttribute("style")).toContain(tintOf(0));
    expect(
      mascotEl.querySelector(".feedback-panel__mascot-emoji").textContent,
    ).toBe(MASCOTS[0].emoji);
    expect(
      mascotEl.querySelector(".feedback-panel__mascot-name").textContent,
    ).toBe(MASCOTS[0].name);
    expect(
      mascotEl.querySelector(".feedback-panel__mascot-role").textContent,
    ).toBe(MASCOTS[0].role);
  });

  it("zeigt das über activeIdx aktive Maskottchen, nicht immer Fine der Fuchs", () => {
    recordRoundCompletion({
      mode: GAME_MODE.QUIZ,
      score: 5,
      roundLength: 10,
    });
    recordRoundCompletion({
      mode: GAME_MODE.QUIZ,
      score: 5,
      roundLength: 10,
    });
    recordRoundCompletion({
      mode: GAME_MODE.QUIZ,
      score: 5,
      roundLength: 10,
    });
    recordRoundCompletion({
      mode: GAME_MODE.QUIZ,
      score: 5,
      roundLength: 10,
    });
    recordRoundCompletion({
      mode: GAME_MODE.QUIZ,
      score: 5,
      roundLength: 10,
    });
    redeemMascot(3);
    setActiveIdx(1); // unlockedIds = [0, 3] -> Position 1 = Maskottchen id 3

    const container = document.createElement("div");
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [
      buildQuestion("Q1", "Wolf"),
    ]);
    renderQuestionScreen(container, quizState);

    const mascotEl = container.querySelector(".feedback-panel__mascot");
    expect(mascotEl.getAttribute("style")).toContain(tintOf(3));
    expect(
      mascotEl.querySelector(".feedback-panel__mascot-emoji").textContent,
    ).toBe(MASCOTS[3].emoji);
    expect(
      mascotEl.querySelector(".feedback-panel__mascot-name").textContent,
    ).toBe(MASCOTS[3].name);
    expect(
      mascotEl.querySelector(".feedback-panel__mascot-role").textContent,
    ).toBe(MASCOTS[3].role);
  });
});
