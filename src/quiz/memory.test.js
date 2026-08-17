// Tests für src/quiz/memory.js (Issue #45: Tier-Memory-Spiellogik).
//
// Wie reverseQuestionGenerator.test.js/soundQuestionGenerator.test.js muss
// hier fetch() gemockt werden (Pflicht-Vorab-Auflösung ALLER Kartenbilder vor
// Rückgabe des Decks). Anders als dort läuft die Auflösung hier über
// Promise.all() (mehrere Positionen parallel) — die Reihenfolge der
// tatsächlichen fetch()-Aufrufe zwischen den Positionen ist daher nicht
// garantiert deterministisch nachzustellen. Der Mock ist deshalb bewusst
// NICHT call-order-basiert (mockResolvedValueOnce-Kette), sondern liest den
// angefragten Dateinamen aus der URL und antwortet dafür gezielt (siehe
// mockFetchByFilename unten) — robust unabhängig von der tatsächlichen
// Ausführungsreihenfolge der parallelen Positionen.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildMemoryDeck,
  checkMatch,
  MemoryDeckResolutionError,
  MEMORY_CARD_IMAGE_ALT_TEXT,
} from "./memory.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

const rngZero = () => 0;

function buildImageInfoJson({ thumbUrl, artist, licenseUrl } = {}) {
  const extmetadata = {};
  if (artist) extmetadata.Artist = { value: artist };
  if (licenseUrl) extmetadata.LicenseUrl = { value: licenseUrl };
  return {
    query: {
      pages: {
        1: { imageinfo: [{ thumburl: thumbUrl, extmetadata }] },
      },
    },
  };
}

function missingFileJson() {
  return { query: { pages: { "-1": { missing: "" } } } };
}

function jsonResponse(json) {
  return { ok: true, json: async () => json };
}

// Antwortet gezielt je nach angefragtem Commons-Dateinamen (Schlüssel ohne
// "File:"-Präfix) statt nach Aufrufreihenfolge — siehe Datei-Kommentar oben.
// `map[filename]` ist entweder `{ error: true }` (Netzwerkfehler wirft),
// `{ missing: true }` (nicht auflösbare Datei) oder ein Bildinfo-Objekt
// (`{ thumbUrl, artist?, licenseUrl? }`) bei Erfolg.
function mockFetchByFilename(map) {
  fetch.mockImplementation(async (url) => {
    const titles = new URL(url).searchParams.get("titles") ?? "";
    const filename = titles.replace(/^File:/, "");
    const entry = map[filename];
    if (!entry) {
      throw new Error(`Test-Mock: kein Eintrag für Dateinamen "${filename}"`);
    }
    if (entry.error) throw new Error("Netzwerkfehler");
    if (entry.missing) return jsonResponse(missingFileJson());
    return jsonResponse(buildImageInfoJson(entry));
  });
}

function makeAnimals(count, prefix = "A") {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    name_de: `Tier ${prefix}${i}`,
    image_filename: `${prefix.toLowerCase()}${i}.jpg`,
  }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildMemoryDeck", () => {
  it("baut für EASY ein Set aus 12 Karten (6 Paare), je zwei identische Karten pro Tier", async () => {
    const animals = makeAnimals(6);
    mockFetchByFilename(
      Object.fromEntries(
        animals.map((a) => [
          a.image_filename,
          { thumbUrl: `https://x/${a.image_filename}`, artist: "Jane Doe" },
        ]),
      ),
    );

    const deck = await buildMemoryDeck(animals, DIFFICULTY_LEVELS.EASY, rngZero);

    expect(deck).toHaveLength(12);

    const byAnimal = new Map();
    for (const card of deck) {
      const group = byAnimal.get(card.animalId) ?? [];
      group.push(card);
      byAnimal.set(card.animalId, group);
    }
    expect(byAnimal.size).toBe(6);
    for (const [animalId, cards] of byAnimal) {
      expect(cards).toHaveLength(2);
      expect(cards[0].thumbUrl).toBe(`https://x/${animalId.toLowerCase()}.jpg`);
      expect(cards[1].thumbUrl).toBe(cards[0].thumbUrl);
    }
  });

  it("baut für HARD ein Set aus 24 Karten (12 Paare)", async () => {
    const animals = makeAnimals(12);
    mockFetchByFilename(
      Object.fromEntries(
        animals.map((a) => [
          a.image_filename,
          { thumbUrl: `https://x/${a.image_filename}` },
        ]),
      ),
    );

    const deck = await buildMemoryDeck(animals, DIFFICULTY_LEVELS.HARD, rngZero);

    expect(deck).toHaveLength(24);
    const uniqueAnimalIds = new Set(deck.map((c) => c.animalId));
    expect(uniqueAnimalIds.size).toBe(12);
  });

  it("jede Karte hat eine eindeutige cardId im Muster {animalId}-a/{animalId}-b", async () => {
    const animals = makeAnimals(6);
    mockFetchByFilename(
      Object.fromEntries(
        animals.map((a) => [a.image_filename, { thumbUrl: `https://x/${a.image_filename}` }]),
      ),
    );

    const deck = await buildMemoryDeck(animals, DIFFICULTY_LEVELS.EASY, rngZero);

    const cardIds = deck.map((c) => c.cardId);
    expect(new Set(cardIds).size).toBe(cardIds.length);
    for (const card of deck) {
      expect(card.cardId).toMatch(new RegExp(`^${card.animalId}-[ab]$`));
    }
  });

  it("beide Karten desselben Tieres tragen dieselbe Bild-URL und Attribution", async () => {
    const animals = makeAnimals(6);
    mockFetchByFilename(
      Object.fromEntries(
        animals.map((a) => [
          a.image_filename,
          { thumbUrl: `https://x/${a.image_filename}`, artist: "Jane Doe", licenseUrl: "https://license" },
        ]),
      ),
    );

    const deck = await buildMemoryDeck(animals, DIFFICULTY_LEVELS.EASY, rngZero);

    const byAnimal = new Map();
    for (const card of deck) {
      const group = byAnimal.get(card.animalId) ?? [];
      group.push(card);
      byAnimal.set(card.animalId, group);
    }
    for (const [, cards] of byAnimal) {
      expect(cards[0].thumbUrl).toBe(cards[1].thumbUrl);
      expect(cards[0].attribution).toEqual(cards[1].attribution);
      expect(cards[0].attribution).toEqual({
        text: "Foto: Jane Doe · Wikimedia Commons",
        licenseUrl: "https://license",
      });
    }
  });

  it("ignoriert Tiere ohne image_filename und Duplikate nach name_de beim Kandidatenpool", async () => {
    const animals = [
      ...makeAnimals(5),
      { id: "NoImage", name_de: "Ohne Bild" }, // kein image_filename
      { id: "Dup", name_de: "Tier A0" }, // Namensduplikat von A0
    ];
    // Nur 5 gültige, eindeutige Kandidaten -> reicht nicht für 6 Paare
    // (EASY) -> muss ablehnen, OHNE dass überhaupt ein fetch versucht wird.
    await expect(
      buildMemoryDeck(animals, DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(MemoryDeckResolutionError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("zieht bei Bildauflösungs-Fehlschlag einer Position ein Ersatztier aus der Reserve, kein Rundenabbruch", async () => {
    // 7 Tiere für EASY (6 Paare): 6 werden initial gezogen, 1 bleibt als
    // Ersatztier-Reserve übrig. "A0" (das unter rngZero als eine der
    // Erstauswahl-Positionen gezogen wird) schlägt fehl -> die Funktion muss
    // trotzdem ein vollständiges 12-Karten-Deck liefern, indem sie auf das
    // verbleibende Ersatztier ausweicht.
    const animals = makeAnimals(7);
    const failing = animals[0]; // wird laut Fisher-Yates-Verhalten bei rngZero definitiv gezogen (Erstauswahl oder Reserve)

    const responses = Object.fromEntries(
      animals
        .filter((a) => a.id !== failing.id)
        .map((a) => [a.image_filename, { thumbUrl: `https://x/${a.image_filename}` }]),
    );
    responses[failing.image_filename] = { error: true };
    mockFetchByFilename(responses);

    const deck = await buildMemoryDeck(animals, DIFFICULTY_LEVELS.EASY, rngZero);

    expect(deck).toHaveLength(12);
    const animalIds = new Set(deck.map((c) => c.animalId));
    // Das durchgehend fehlschlagende Tier darf NICHT im finalen Deck
    // vorkommen (wurde vollständig durch die Reserve ersetzt).
    expect(animalIds.has(failing.id)).toBe(false);
    expect(animalIds.size).toBe(6);
  });

  it("lehnt mit MemoryDeckResolutionError ab, wenn eine Position auch nach Ersatztier-Versuchen scheitert und keine Reserve mehr übrig ist", async () => {
    // Exakt 6 Tiere für EASY -> keine Reserve übrig, ein durchgehender
    // Fehlschlag kann nicht kompensiert werden.
    const animals = makeAnimals(6);
    const responses = Object.fromEntries(
      animals.map((a) => [a.image_filename, { thumbUrl: `https://x/${a.image_filename}` }]),
    );
    responses[animals[0].image_filename] = { error: true };
    mockFetchByFilename(responses);

    await expect(
      buildMemoryDeck(animals, DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(MemoryDeckResolutionError);
  });

  it("behandelt eine nicht auflösbare Datei (missing-Flag) wie einen Auflösungs-Fehlschlag", async () => {
    const animals = makeAnimals(7);
    const failing = animals[0];
    const responses = Object.fromEntries(
      animals
        .filter((a) => a.id !== failing.id)
        .map((a) => [a.image_filename, { thumbUrl: `https://x/${a.image_filename}` }]),
    );
    responses[failing.image_filename] = { missing: true };
    mockFetchByFilename(responses);

    const deck = await buildMemoryDeck(animals, DIFFICULTY_LEVELS.EASY, rngZero);
    expect(deck).toHaveLength(12);
    expect(deck.some((c) => c.animalId === failing.id)).toBe(false);
  });

  it("wirft synchron bei unbekannter Schwierigkeitsstufe, ohne fetch aufzurufen", async () => {
    const animals = makeAnimals(6);
    await expect(
      buildMemoryDeck(animals, "unbekannt", rngZero),
    ).rejects.toThrow(/Schwierigkeitsstufe/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("wirft, wenn animals kein Array ist", async () => {
    await expect(
      buildMemoryDeck(null, DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toThrow(/animals/);
  });
});

describe("checkMatch", () => {
  it("liefert true für zwei Karten desselben Tieres", () => {
    expect(
      checkMatch({ cardId: "Q1-a", animalId: "Q1" }, { cardId: "Q1-b", animalId: "Q1" }),
    ).toBe(true);
  });

  it("liefert false für Karten unterschiedlicher Tiere", () => {
    expect(
      checkMatch({ cardId: "Q1-a", animalId: "Q1" }, { cardId: "Q2-a", animalId: "Q2" }),
    ).toBe(false);
  });

  it("liefert false, wenn eine der beiden Karten fehlt", () => {
    expect(checkMatch(null, { cardId: "Q1-a", animalId: "Q1" })).toBe(false);
    expect(checkMatch({ cardId: "Q1-a", animalId: "Q1" }, undefined)).toBe(false);
  });
});

describe("MEMORY_CARD_IMAGE_ALT_TEXT", () => {
  it("ist ein nicht-verratender, generischer Text ohne Tiernamen", () => {
    expect(MEMORY_CARD_IMAGE_ALT_TEXT).toBe("Tierbild");
  });
});
