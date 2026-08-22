// @vitest-environment jsdom
//
// DOM-Tests für den neuen "Buchstabensuche"-Frage-Bildschirm (Issue #46,
// design.md "Neuer Spielmodus 'Buchstabensuche'"). Analoges Muster zu
// reverseQuestion.test.js: `../quiz/letterSearchQuestionGenerator.js` wird
// komplett gemockt (Netzwerk-Verhalten selbst ist bereits in
// letterSearchQuestionGenerator.test.js abgedeckt), hier wird nur geprüft,
// wie der Bildschirm auf Erfolg/Fehlschlag/vorab aufgelöste erste Frage
// reagiert sowie die eigentliche Buchstaben-Eingabemechanik.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";
import { GAME_MODE } from "../quiz/gameMode.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";
import { recordRoundCompletion, redeemMascot, setActiveIdx } from "../quiz/progress.js";

const LION = {
  id: "Q1",
  name_de: "Löwe",
  category: "Säugetier",
  habitat: ["Savanne"],
  continent: ["Afrika"],
  diet: "Fleischfresser",
  wikipedia_url_de: "https://de.wikipedia.org/wiki/L%C3%B6we",
  fun_fact: "Löwen sind die einzigen Katzen, die in Gruppen leben.",
};

const TIGER = {
  id: "Q2",
  name_de: "Tiger",
  category: "Säugetier",
  // Bewusst ohne wikipedia_url_de/fun_fact -- deckt den "kein Link/kein Fun
  // Fact"-Fall ab.
};

vi.mock("../../data/animals.json", () => ({
  default: { animals: [LION, TIGER] },
}));

const generateNextLetterSearchQuestion = vi.fn();
vi.mock("../quiz/letterSearchQuestionGenerator.js", () => ({
  generateNextLetterSearchQuestion: (...args) =>
    generateNextLetterSearchQuestion(...args),
  LETTER_SEARCH_IMAGE_ALT_TEXT: "Foto eines Tieres – errate, wie es heißt",
}));

const { renderLetterSearchScreen } = await import("./letterSearch.js");
const { createQuizState } = await import("../quiz/state.js");

function buildQuestion(overrides = {}) {
  return {
    id: "loewe-letter-search",
    animalId: "Q1",
    animalName: "Löwe",
    image: {
      url: "https://commons.example/loewe-330px.jpg",
      alt: "Foto eines Tieres – errate, wie es heißt",
    },
    attribution: {
      text: "Foto: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://example.com/license",
    },
    ...overrides,
  };
}

function render(quizState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onFinish = vi.fn();
  renderLetterSearchScreen(container, quizState, { onFinish });
  return { container, onFinish };
}

function fillCorrectly(container) {
  // Tippt für jedes noch offene Feld den erwarteten Buchstaben ein, bis der
  // Name vollständig gelöst ist.
  let input = container.querySelector(".letter-box--blank:not([readonly])");
  while (input) {
    input.value = input.dataset.expectedChar;
    input.dispatchEvent(new Event("input"));
    input = container.querySelector(".letter-box--blank:not([readonly])");
  }
}

beforeEach(() => {
  document.body.innerHTML = "";
  generateNextLetterSearchQuestion.mockReset();
});

describe("renderLetterSearchScreen (Issue #46)", () => {
  it("zeigt den reservierten Bildrahmen mit Ladeanimation, solange die Frage noch nicht aufgelöst ist", () => {
    generateNextLetterSearchQuestion.mockReturnValue(new Promise(() => {})); // hängt bewusst
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);

    const frame = container.querySelector(".reverse-image-frame");
    expect(frame.getAttribute("aria-busy")).toBe("true");
    expect(
      container.querySelector(".reverse-image-frame__loading").hidden,
    ).toBe(false);
    expect(
      container.querySelector(".question-screen__progress").textContent,
    ).toBe("Tier 1 von 3");
    expect(
      container.querySelector("#letter-search-heading").textContent.trim(),
    ).toBe("Wie heißt dieses Tier?");
  });

  it("baut nach erfolgreicher Auflösung die Buchstaben-Kästchen-Reihe: Löwe (Einfach) hat 4 Kästchen, davon 1 Lücke", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(container.querySelectorAll(".letter-box")).toHaveLength(4);
    });

    // "Löwe": L(1,given) ö(2,given) w(3,blank) e(4,given,letzter) -- Einfach:
    // jeder 3. Buchstabe Lücke, erster/letzter immer given.
    const boxes = container.querySelectorAll(".letter-box");
    expect(boxes[0].tagName).toBe("SPAN");
    expect(boxes[0].textContent).toBe("L");
    expect(boxes[1].textContent).toBe("ö");
    expect(boxes[2].tagName).toBe("INPUT");
    expect(boxes[2].getAttribute("aria-label")).toBe("Buchstabe 3 von 4");
    expect(boxes[3].textContent).toBe("e");

    // Bild/Attribution ebenfalls sichtbar (identisches Muster wie #28).
    const img = container.querySelector(".reverse-image-frame__image");
    expect(img.hidden).toBe(false);
    expect(img.alt).toBe("Foto eines Tieres – errate, wie es heißt");
    expect(img.alt).not.toMatch(/Löwe/);
  });

  it("sperrt ein Feld nach korrekter (case-insensitiver) Eingabe und springt automatisch zum nächsten leeren Feld", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    const input = container.querySelector(".letter-box--blank");
    expect(input.dataset.expectedChar).toBe("w");

    // Groß geschrieben eingegeben -- case-insensitive korrekt.
    input.value = "W";
    input.dispatchEvent(new Event("input"));

    // Zeigt die tatsächlich korrekte Schreibweise (Kleinbuchstabe), nicht die
    // rohe Kind-Eingabe.
    expect(input.value).toBe("w");
    expect(input.readOnly).toBe(true);
    expect(input.classList.contains("letter-box--filled")).toBe(true);
  });

  it("zeigt bei falscher Eingabe eine kurze freundliche Fehlermeldung, leert das Feld und erlaubt beliebig viele weitere Versuche", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    const input = container.querySelector(".letter-box--blank");
    input.value = "x";
    input.dispatchEvent(new Event("input"));

    expect(input.value).toBe("");
    expect(input.readOnly).toBe(false);
    const errorEl = container.querySelector(".letter-puzzle__error");
    expect(errorEl.hidden).toBe(false);
    expect(errorEl.textContent).not.toMatch(/Falsch/);
    expect(container.textContent).not.toMatch(/Error/);

    // Zweiter Fehlversuch -- weiterhin möglich, kein Limit.
    input.value = "y";
    input.dispatchEvent(new Event("input"));
    expect(errorEl.hidden).toBe(false);

    // Danach richtig -- Fehlermeldung verschwindet, Feld sperrt sich.
    input.value = "w";
    input.dispatchEvent(new Event("input"));
    expect(errorEl.hidden).toBe(true);
    expect(input.readOnly).toBe(true);
  });

  it("zeigt nach vollständig korrekt gelöstem Namen Infosatz, Wikipedia-Link, Fun Fact und den 'Weiter'-Button, und trägt das Ergebnis als richtig", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    fillCorrectly(container);

    const feedbackEl = container.querySelector(".question-screen__feedback");
    expect(feedbackEl.hidden).toBe(false);
    expect(feedbackEl.textContent).toMatch(/Super gemacht/);

    const infoSentenceEl = container.querySelector(
      ".question-screen__info-sentence",
    );
    expect(infoSentenceEl.hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__info-sentence-text")
        .textContent,
    ).toMatch(/^Löwe:/);

    const wikipediaLinkEl = container.querySelector(
      ".question-screen__info-sentence-wikipedia-link",
    );
    expect(wikipediaLinkEl.hidden).toBe(false);
    expect(wikipediaLinkEl.href).toBe(LION.wikipedia_url_de);

    const funFactEl = container.querySelector(".question-screen__fun-fact");
    expect(funFactEl.hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__fun-fact-text").textContent,
    ).toBe(LION.fun_fact);

    expect(container.querySelector(".next-button").hidden).toBe(false);
    expect(quizState.score).toBe(1);
    expect(quizState.answers).toHaveLength(1);
    expect(quizState.answers[0].correct).toBe(true);
  });

  it("blendet Wikipedia-Link und Fun Fact ohne Platzhalter aus, wenn die Felder beim Tier fehlen", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(
      buildQuestion({ animalId: "Q2", animalName: "Tiger" }),
    );
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(
        container.querySelectorAll(".letter-box--blank").length,
      ).toBeGreaterThan(0),
    );

    fillCorrectly(container);

    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(false);
    expect(
      container.querySelector(".question-screen__info-sentence-wikipedia-link")
        .hidden,
    ).toBe(true);
    expect(container.querySelector(".question-screen__fun-fact").hidden).toBe(
      true,
    );
  });

  it("behandelt Leerzeichen in mehrteiligen Namen als sichtbares Trennzeichen, nie als Eingabefeld", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(
      buildQuestion({ animalId: "Q1", animalName: "Großer Panda" }),
    );
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);

    await vi.waitFor(() =>
      expect(
        container.querySelectorAll(".letter-box--blank").length,
      ).toBeGreaterThan(0),
    );

    expect(
      container.querySelectorAll(".letter-puzzle__separator"),
    ).toHaveLength(1);
    // Kein Eingabefeld ist der Separator selbst.
    const blankChars = Array.from(
      container.querySelectorAll(".letter-box--blank"),
    ).map((el) => el.dataset.expectedChar);
    expect(blankChars).not.toContain(" ");
  });

  it("nutzt eine bereits am Start-Bildschirm aufgelöste erste Frage ohne erneuten Abruf", () => {
    const pending = buildQuestion();
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    quizState.pendingLetterSearchQuestion = pending;
    const { container } = render(quizState);

    expect(generateNextLetterSearchQuestion).not.toHaveBeenCalled();
    expect(
      container.querySelector(".reverse-image-frame").getAttribute("aria-busy"),
    ).toBe("false");
    expect(quizState.pendingLetterSearchQuestion).toBeUndefined();
  });

  it("zeigt bei Fehlschlag einen freundlichen Fehlerzustand mit 'Nochmal versuchen', ohne die Runde abzubrechen", async () => {
    generateNextLetterSearchQuestion.mockRejectedValueOnce(
      new Error("Netzwerkfehler"),
    );
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(
        container.querySelector(".reverse-image-frame__error").hidden,
      ).toBe(false);
    });
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
    expect(quizState.currentIndex).toBe(0);

    generateNextLetterSearchQuestion.mockResolvedValueOnce(buildQuestion());
    container.querySelector(".reverse-image-frame__retry-button").click();

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );
    expect(container.querySelector(".reverse-image-frame__error").hidden).toBe(
      true,
    );
    expect(generateNextLetterSearchQuestion).toHaveBeenCalledTimes(2);
  });

  it("lädt nach 'Weiter' die nächste Frage und baut eine frische Kästchen-Reihe auf", async () => {
    generateNextLetterSearchQuestion
      .mockResolvedValueOnce(buildQuestion())
      .mockResolvedValueOnce(
        buildQuestion({
          animalId: "Q2",
          animalName: "Tiger",
          image: {
            url: "https://commons.example/tiger-330px.jpg",
            alt: "Foto eines Tieres – errate, wie es heißt",
          },
        }),
      );

    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    fillCorrectly(container);
    container.querySelector(".next-button").click();

    expect(
      container.querySelector(".question-screen__progress").textContent,
    ).toBe("Tier 2 von 3");
    expect(container.querySelector(".letter-puzzle").innerHTML).toBe("");

    await vi.waitFor(() => {
      const img = container.querySelector(".reverse-image-frame__image");
      expect(img.src).toBe("https://commons.example/tiger-330px.jpg");
    });
    expect(generateNextLetterSearchQuestion).toHaveBeenCalledTimes(2);
  });

  it("ruft onFinish nach der letzten Frage mit korrektem Punktestand auf", async () => {
    generateNextLetterSearchQuestion
      .mockResolvedValueOnce(buildQuestion({ animalId: "Q1" }))
      .mockResolvedValueOnce(
        buildQuestion({ animalId: "Q2", animalName: "Tiger" }),
      );

    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      2,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container, onFinish } = render(quizState);

    await vi.waitFor(() =>
      expect(
        container.querySelectorAll(".letter-box--blank").length,
      ).toBeGreaterThan(0),
    );
    fillCorrectly(container);
    container.querySelector(".next-button").click();

    await vi.waitFor(() =>
      expect(
        container.querySelectorAll(".letter-box--blank").length,
      ).toBeGreaterThan(0),
    );
    fillCorrectly(container);
    container.querySelector(".next-button").click();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(quizState.score).toBe(2);
    expect(quizState.questions).toHaveLength(2);
  });
});

describe("'Lösung zeigen' (Issue #52)", () => {
  it("ist versteckt, solange die Frage noch lädt, und erscheint sobald sie geladen ist", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);

    const solveButton = container.querySelector(".letter-puzzle__solve-button");
    expect(solveButton.hidden).toBe(true);

    await vi.waitFor(() => expect(solveButton.hidden).toBe(false));
    expect(solveButton.getAttribute("aria-label")).toBe(
      "Lösung anzeigen und Namen auflösen",
    );
    expect(solveButton.tagName).toBe("BUTTON");
    expect(solveButton.getAttribute("type")).toBe("button");
  });

  it("steht im Markup nach den Buchstaben-Kästchen und vor dem 'Weiter'-Button (Tab-Reihenfolge)", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    const focusable = Array.from(
      container.querySelectorAll(
        ".letter-box--blank, .letter-puzzle__solve-button, .next-button",
      ),
    );
    const tags = focusable.map((el) => el.className);
    const solveIndex = tags.findIndex((c) =>
      c.includes("letter-puzzle__solve-button"),
    );
    const nextIndex = tags.findIndex((c) => c.includes("next-button"));
    const blankIndex = tags.findIndex((c) => c.includes("letter-box--blank"));
    expect(blankIndex).toBeLessThan(solveIndex);
    expect(solveIndex).toBeLessThan(nextIndex);
  });

  it("füllt bei Klick alle verbleibenden Lücken mit dem korrekten Namen und lässt den Button danach verschwinden", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    const solveButton = container.querySelector(".letter-puzzle__solve-button");
    solveButton.click();

    // "Löwe": die eine Lücke (w) ist jetzt aufgelöst.
    expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(0);
    expect(solveButton.hidden).toBe(true);
  });

  it("zeigt nach Auflösen den neutralen Feedback-Text statt '✓ Super gemacht!' und OHNE die --correct-Klasse (visuell abgegrenzt vom echten Lösen)", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    container.querySelector(".letter-puzzle__solve-button").click();

    const feedbackEl = container.querySelector(".question-screen__feedback");
    expect(feedbackEl.hidden).toBe(false);
    expect(feedbackEl.textContent).toBe("Hier ist die Lösung: Löwe");
    expect(feedbackEl.textContent).not.toMatch(/Super gemacht/);
    expect(
      feedbackEl.classList.contains("question-screen__feedback--correct"),
    ).toBe(false);
  });

  it("nutzt für aufgelöste Kästchen den neutralen letter-box--given-Zustand statt des grünen letter-box--filled", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    const input = container.querySelector(".letter-box--blank");
    container.querySelector(".letter-puzzle__solve-button").click();

    expect(input.value).toBe("w");
    expect(input.readOnly).toBe(true);
    expect(input.classList.contains("letter-box--given")).toBe(true);
    expect(input.classList.contains("letter-box--filled")).toBe(false);
    expect(input.getAttribute("aria-label")).toMatch(/aufgelöst/);
  });

  it("lässt bereits vom Kind korrekt eingetippte Kästchen unverändert (grün/filled) und löst nur die verbleibenden Lücken auf (gemischter Zustand)", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(
      buildQuestion({ animalId: "Q1", animalName: "Großer Panda" }),
    );
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(
        container.querySelectorAll(".letter-box--blank").length,
      ).toBeGreaterThan(1),
    );

    // Ein Feld eigenständig korrekt lösen, bevor "Lösung zeigen" geklickt wird.
    const firstBlank = container.querySelector(".letter-box--blank");
    firstBlank.value = firstBlank.dataset.expectedChar;
    firstBlank.dispatchEvent(new Event("input"));
    expect(firstBlank.classList.contains("letter-box--filled")).toBe(true);

    container.querySelector(".letter-puzzle__solve-button").click();

    // Das eigenständig gelöste Feld bleibt grün/filled ...
    expect(firstBlank.classList.contains("letter-box--filled")).toBe(true);
    expect(firstBlank.classList.contains("letter-box--given")).toBe(false);
    // ... alle übrigen, noch offenen (nicht bereits korrekt ausgefüllten)
    // Lücken sind jetzt neutral aufgelöst -- keine echte offene Lücke mehr.
    expect(
      container.querySelectorAll(".letter-box--blank:not(.letter-box--filled)"),
    ).toHaveLength(0);
  });

  it("zeigt danach Infosatz, Wikipedia-Link, Fun Fact und den 'Weiter'-Button wie beim regulären Lösen", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    container.querySelector(".letter-puzzle__solve-button").click();

    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(false);
    expect(
      container.querySelector(".question-screen__info-sentence-wikipedia-link")
        .hidden,
    ).toBe(false);
    expect(container.querySelector(".question-screen__fun-fact").hidden).toBe(
      false,
    );
    expect(container.querySelector(".next-button").hidden).toBe(false);
  });

  it("trägt die Antwort als resolved: true, correct: true im Zustand ein und zählt normal zum Punktestand", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    container.querySelector(".letter-puzzle__solve-button").click();

    expect(quizState.answers).toHaveLength(1);
    expect(quizState.answers[0].correct).toBe(true);
    expect(quizState.answers[0].resolved).toBe(true);
    expect(quizState.score).toBe(1);
  });

  it("ignoriert einen zweiten Klick, nachdem bereits aufgelöst wurde (kein doppelter recordAnswer-Aufruf)", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    const solveButton = container.querySelector(".letter-puzzle__solve-button");
    solveButton.click();
    solveButton.click();

    expect(quizState.answers).toHaveLength(1);
  });

  it("versteckt den Button, sobald das Kind die Frage eigenständig löst (kein doppeltes Angebot nach Erfolg)", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".letter-box--blank")).toHaveLength(1),
    );

    fillCorrectly(container);

    expect(
      container.querySelector(".letter-puzzle__solve-button").hidden,
    ).toBe(true);
    expect(quizState.answers[0].resolved).toBe(false);
  });
});

// Issue #82, dritter Teil des Sterne-/Maskottchen-Freischaltsystems
// (#80-#83): das `.feedback-panel__mascot`-Feld zeigt Tint + Emoji + Name +
// Rolle des aktiven Maskottchens, konsistent mit question.test.js (QA-Bugfix
// Test-Fix-Zyklus 1: Name/Rolle fehlten ursprünglich komplett als Text, nur
// Tint+Emoji wurden geprüft). Rendert synchron in container.innerHTML, bevor
// die (hier gemockte) generateNextLetterSearchQuestion-Promise aufgelöst ist
// -- kein await/waitFor nötig, um das Feld zu prüfen.
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

  it("zeigt das über activeIdx aktive Maskottchen mit Name, Rolle und Tint", () => {
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    redeemMascot(3);
    setActiveIdx(1); // unlockedIds = [0, 3] -> Position 1 = Maskottchen id 3

    generateNextLetterSearchQuestion.mockResolvedValueOnce(buildQuestion());
    const quizState = createQuizState(
      DIFFICULTY_LEVELS.EASY,
      [],
      3,
      GAME_MODE.LETTER_SEARCH,
    );
    const { container } = render(quizState);

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
