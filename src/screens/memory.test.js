// @vitest-environment jsdom
//
// DOM-Tests für den Tier-Memory-Bildschirm (Issue #45, design.md "Neuer
// Spielmodus 'Tier-Memory'"). Analog zum Muster in reverseQuestion.test.js:
// `../quiz/memory.js` wird teilweise gemockt — nur `buildMemoryDeck` (die
// Netzwerk-/Batch-Auflösungslogik, bereits separat in memory.test.js unter
// src/quiz/ abgedeckt) wird durch einen steuerbaren Mock ersetzt, `checkMatch`/
// `MEMORY_CARD_IMAGE_ALT_TEXT`/`MemoryDeckResolutionError` bleiben die
// echten Implementierungen (via `vi.importActual`), damit die eigentliche
// Karten-Interaktionslogik dieses Bildschirms gegen die echte
// Paarvergleichs-Funktion getestet wird.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";
import { GAME_MODE } from "../quiz/gameMode.js";

const LION = {
  id: "Q1",
  name_de: "Löwe",
  category: "Säugetier",
  habitat: ["Savanne"],
  continent: ["Afrika"],
  diet: "Fleischfresser",
  wikipedia_url_de: "https://de.wikipedia.org/wiki/L%C3%B6we",
  fun_fact: "Löwen leben in Rudeln.",
};
const TIGER = { id: "Q2", name_de: "Tiger", category: "Säugetier" }; // kein Wiki-Link/Fun Fact
const ELEPHANT = { id: "Q3", name_de: "Elefant", category: "Säugetier" };
const ZEBRA = { id: "Q4", name_de: "Zebra", category: "Säugetier" };
const EAGLE = { id: "Q5", name_de: "Adler", category: "Vogel" };
const PENGUIN = { id: "Q6", name_de: "Pinguin", category: "Vogel" };
const ANIMALS = [LION, TIGER, ELEPHANT, ZEBRA, EAGLE, PENGUIN];

vi.mock("../../data/animals.json", () => ({
  default: { animals: ANIMALS },
}));

const buildMemoryDeck = vi.fn();
vi.mock("../quiz/memory.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    buildMemoryDeck: (...args) => buildMemoryDeck(...args),
  };
});

const { renderMemoryScreen } = await import("./memory.js");

function makeDeck(animals) {
  const cards = [];
  animals.forEach((animal) => {
    const attribution = {
      text: "Foto: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://example.com/license",
    };
    cards.push({
      cardId: `${animal.id}-a`,
      animalId: animal.id,
      thumbUrl: `https://x/${animal.id}.jpg`,
      attribution,
    });
    cards.push({
      cardId: `${animal.id}-b`,
      animalId: animal.id,
      thumbUrl: `https://x/${animal.id}.jpg`,
      attribution,
    });
  });
  return cards;
}

function render(overrides = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onFinish = vi.fn();
  const quizState = { difficulty: DIFFICULTY_LEVELS.EASY, ...overrides };
  renderMemoryScreen(container, quizState, { onFinish });
  return { container, onFinish, quizState };
}

async function waitForBoard(container) {
  await vi.waitFor(() => {
    expect(container.querySelector(".memory-board").hidden).toBe(false);
  });
}

beforeEach(() => {
  document.body.innerHTML = "";
  buildMemoryDeck.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Ladezustand", () => {
  it("zeigt zunächst den Ladezustand, bis das Deck aufgelöst ist", async () => {
    let resolveDeck;
    buildMemoryDeck.mockReturnValue(
      new Promise((resolve) => {
        resolveDeck = resolve;
      }),
    );
    const { container } = render();

    expect(
      container.querySelector(".memory-board-status").hidden,
    ).toBe(false);
    expect(
      container.querySelector(".memory-board-status__loading").hidden,
    ).toBe(false);
    expect(container.querySelector(".memory-board").hidden).toBe(true);

    resolveDeck(makeDeck(ANIMALS));
    await waitForBoard(container);
    expect(container.querySelector(".memory-board-status").hidden).toBe(true);
  });

  it("zeigt einen freundlichen Fehlerzustand mit Retry-Button, wenn der Deck-Aufbau fehlschlägt", async () => {
    buildMemoryDeck.mockRejectedValueOnce(new Error("Netzwerkfehler"));
    const { container } = render();

    await vi.waitFor(() => {
      expect(
        container.querySelector(".memory-board-status__error").hidden,
      ).toBe(false);
    });
    expect(container.querySelector(".memory-board").hidden).toBe(true);
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);

    buildMemoryDeck.mockResolvedValueOnce(makeDeck(ANIMALS));
    container.querySelector(".memory-board-status__retry-button").click();

    await waitForBoard(container);
    expect(buildMemoryDeck).toHaveBeenCalledTimes(2);
  });
});

describe("Deck-Wiederverwendung (pendingMemoryDeck)", () => {
  it("nutzt ein vorhandenes pendingMemoryDeck derselben Schwierigkeitsstufe, ohne buildMemoryDeck erneut aufzurufen", async () => {
    const deck = makeDeck(ANIMALS);
    const { container } = render({
      pendingMemoryDeck: deck,
      pendingMemoryDeckDifficulty: DIFFICULTY_LEVELS.EASY,
    });

    await waitForBoard(container);
    expect(buildMemoryDeck).not.toHaveBeenCalled();
    expect(container.querySelectorAll(".memory-card")).toHaveLength(
      deck.length,
    );
  });

  it("ignoriert ein pendingMemoryDeck einer anderen Schwierigkeitsstufe und baut selbst ein frisches Deck", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render({
      pendingMemoryDeck: [{ cardId: "stale" }],
      pendingMemoryDeckDifficulty: DIFFICULTY_LEVELS.HARD, // != EASY
    });

    await waitForBoard(container);
    expect(buildMemoryDeck).toHaveBeenCalledTimes(1);
    expect(buildMemoryDeck.mock.calls[0][1]).toBe(DIFFICULTY_LEVELS.EASY);
  });
});

describe("Karten-Rendering und Barrierefreiheit", () => {
  it("rendert alle Karten als Button mit nicht-verratendem 'Verdeckte Karte'-aria-label und aria-pressed=false", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render();
    await waitForBoard(container);

    const cards = Array.from(container.querySelectorAll(".memory-card"));
    expect(cards).toHaveLength(12);
    cards.forEach((card, index) => {
      expect(card.tagName).toBe("BUTTON");
      expect(card.getAttribute("aria-pressed")).toBe("false");
      expect(card.getAttribute("aria-label")).toBe(
        `Verdeckte Karte, Karte ${index + 1}`,
      );
      expect(card.getAttribute("aria-label")).not.toMatch(
        /Löwe|Tiger|Elefant|Zebra|Adler|Pinguin/,
      );
    });
  });

  it("zeigt die Fortschrittsanzeige '0 von 6 Paaren gefunden' initial", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render();
    await waitForBoard(container);

    expect(container.querySelector(".memory-screen__progress").textContent).toBe(
      "0 von 6 Paaren gefunden",
    );
  });
});

describe("Treffer (gleiches Tier)", () => {
  it("markiert beide Karten dauerhaft als gelöst, zeigt Infosatz + Wikipedia-Link + Fun Fact, aktualisiert die Fortschrittsanzeige", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render();
    await waitForBoard(container);

    const cards = Array.from(container.querySelectorAll(".memory-card"));
    cards[0].click(); // Q1-a (Löwe)
    cards[1].click(); // Q1-b (Löwe) -> Treffer

    expect(cards[0].classList.contains("memory-card--solved")).toBe(true);
    expect(cards[1].classList.contains("memory-card--solved")).toBe(true);
    expect(cards[0].disabled).toBe(true);
    expect(cards[0].getAttribute("aria-pressed")).toBe("true");
    expect(cards[0].getAttribute("aria-label")).toMatch(/gefunden/);

    expect(
      container.querySelector(".memory-screen__progress").textContent,
    ).toBe("1 von 6 Paaren gefunden");

    const infoSentenceEl = container.querySelector(
      ".question-screen__info-sentence",
    );
    expect(infoSentenceEl.hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__info-sentence-text")
        .textContent,
    ).toMatch(/Löwe/);

    const wikiLink = container.querySelector(
      ".question-screen__info-sentence-wikipedia-link",
    );
    expect(wikiLink.hidden).toBe(false);
    expect(wikiLink.href).toBe(LION.wikipedia_url_de);

    const funFactEl = container.querySelector(".question-screen__fun-fact");
    expect(funFactEl.hidden).toBe(false);
    expect(
      container.querySelector(".question-screen__fun-fact-text").textContent,
    ).toBe(LION.fun_fact);
  });

  it("verbirgt Wikipedia-Link/Fun-Fact-Block, wenn das gefundene Tier keine hat", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render();
    await waitForBoard(container);

    const cards = Array.from(container.querySelectorAll(".memory-card"));
    // TIGER-Karten stehen an Position 3/4 (Index 2/3), siehe makeDeck-Reihenfolge.
    cards[2].click();
    cards[3].click();

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

  it("blendet den Infotext-Bereich beim nächsten Kartenklick wieder aus", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render();
    await waitForBoard(container);

    const cards = Array.from(container.querySelectorAll(".memory-card"));
    cards[0].click();
    cards[1].click();
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(false);

    cards[4].click(); // nächste Karte (Elefant) antippen
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(true);
  });

  it("ruft onFinish mit dem Ergebnis-Objekt auf, sobald alle Paare gefunden sind", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container, onFinish } = render();
    await waitForBoard(container);

    const cards = Array.from(container.querySelectorAll(".memory-card"));
    // Alle 6 Paare nacheinander lösen (Deck-Reihenfolge aus makeDeck: je zwei
    // aufeinanderfolgende Karten gehören zusammen).
    for (let i = 0; i < cards.length; i += 2) {
      expect(onFinish).not.toHaveBeenCalled();
      cards[i].click();
      cards[i + 1].click();
    }

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({
      mode: GAME_MODE.MEMORY,
      difficulty: DIFFICULTY_LEVELS.EASY,
      memoryPairCount: 6,
      memoryAttempts: 6,
    });
  });
});

describe("Kein Treffer (unterschiedliche Tiere)", () => {
  it("dreht beide Karten nach der Pause automatisch wieder um und sperrt alle übrigen Karten währenddessen", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render();
    await waitForBoard(container);

    const cards = Array.from(container.querySelectorAll(".memory-card"));
    // Fake-Timer VOR dem zweiten Klick aktivieren, da handleCardClick den
    // setTimeout() für die Verdecken-Pause synchron beim zweiten Klick
    // auslöst -- ein danach aktivierter Fake-Timer würde einen bereits mit
    // dem echten Timer geplanten Timeout nicht mehr erfassen.
    vi.useFakeTimers();
    cards[0].click(); // Löwe
    cards[2].click(); // Tiger -> kein Treffer

    expect(cards[0].classList.contains("memory-card--revealed")).toBe(true);
    expect(cards[2].classList.contains("memory-card--revealed")).toBe(true);
    // Übrige, noch nicht gelöste Karten sind während der Pause gesperrt.
    expect(cards[4].disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(1000);

    expect(cards[0].classList.contains("memory-card--revealed")).toBe(false);
    expect(cards[2].classList.contains("memory-card--revealed")).toBe(false);
    expect(cards[0].disabled).toBe(false);
    expect(cards[2].disabled).toBe(false);
    expect(cards[4].disabled).toBe(false);
    expect(cards[0].getAttribute("aria-label")).toBe("Verdeckte Karte, Karte 1");
  });

  it("ignoriert Klicks auf bereits aufgedeckte (unbestätigte) Karten", async () => {
    buildMemoryDeck.mockResolvedValue(makeDeck(ANIMALS));
    const { container } = render();
    await waitForBoard(container);

    const cards = Array.from(container.querySelectorAll(".memory-card"));
    cards[0].click();
    cards[0].click(); // erneuter Klick auf dieselbe, bereits aufgedeckte Karte

    // Kein Treffer ausgelöst (kein zweites Kartenpaar verglichen) -- Karte 1
    // bleibt einfach aufgedeckt, kein Fortschritt, kein Infotext.
    expect(
      container.querySelector(".memory-screen__progress").textContent,
    ).toBe("0 von 6 Paaren gefunden");
    expect(
      container.querySelector(".question-screen__info-sentence").hidden,
    ).toBe(true);
  });
});
