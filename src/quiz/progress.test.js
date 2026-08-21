// Tests für src/quiz/progress.js (Issue #80, Sterne-/Maskottchen-
// Freischaltsystem). Nutzt eine In-Memory-Fake-Storage statt echtem
// `localStorage`, analog zu album.test.js/history.test.js — sowohl für den
// Erfolgsfall als auch, um "blockiertes localStorage" (z. B. Safari Private
// Mode) gezielt zu simulieren.

import { describe, it, expect } from "vitest";
import {
  loadProgress,
  recordRoundCompletion,
  redeemMascot,
  setActiveIdx,
} from "./progress.js";
import { GAME_MODE } from "./gameMode.js";

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

function createThrowingStorage() {
  return {
    getItem: () => {
      throw new Error("localStorage blockiert (z. B. Safari Private Mode)");
    },
    setItem: () => {
      throw new Error("localStorage blockiert (z. B. Safari Private Mode)");
    },
  };
}

describe("loadProgress", () => {
  it("liefert den Default, wenn noch nichts gespeichert ist", () => {
    const storage = createFakeStorage();
    expect(loadProgress(storage)).toEqual({
      stars: 0,
      unlockedIds: [0],
      activeIdx: 0,
    });
  });

  it("liefert den Default bei kaputten JSON-Daten", () => {
    const storage = createFakeStorage();
    storage.setItem("tierquiz-kinder:progress", "{not-valid-json");
    expect(loadProgress(storage)).toEqual({
      stars: 0,
      unlockedIds: [0],
      activeIdx: 0,
    });
  });

  it("liefert den Default bei blockiertem localStorage, ohne zu werfen", () => {
    expect(() => loadProgress(createThrowingStorage())).not.toThrow();
    expect(loadProgress(createThrowingStorage())).toEqual({
      stars: 0,
      unlockedIds: [0],
      activeIdx: 0,
    });
  });

  it("liefert den Default ohne übergebene Storage, wenn kein localStorage existiert", () => {
    expect(loadProgress()).toEqual({ stars: 0, unlockedIds: [0], activeIdx: 0 });
  });
});

describe("recordRoundCompletion", () => {
  it("vergibt einen Stern bei score >= 5", () => {
    const storage = createFakeStorage();
    const result = recordRoundCompletion(
      { mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 },
      storage,
    );
    expect(result).toEqual({ earned: true, stars: 1 });
    expect(loadProgress(storage).stars).toBe(1);
  });

  it("vergibt keinen Stern unterhalb von score 5", () => {
    const storage = createFakeStorage();
    const result = recordRoundCompletion(
      { mode: GAME_MODE.QUIZ, score: 4, roundLength: 10 },
      storage,
    );
    expect(result).toEqual({ earned: false, stars: 0 });
    expect(loadProgress(storage).stars).toBe(0);
  });

  it("Tier-Memory vergibt immer einen Stern, unabhängig vom score", () => {
    const storage = createFakeStorage();
    const result = recordRoundCompletion(
      { mode: GAME_MODE.MEMORY, score: 0, roundLength: 0 },
      storage,
    );
    expect(result).toEqual({ earned: true, stars: 1 });
  });

  it("erhöht stars über mehrere geschaffte Runden hinweg", () => {
    const storage = createFakeStorage();
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 }, storage);
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 }, storage);
    expect(loadProgress(storage).stars).toBe(2);
  });

  it("bleibt fehlertolerant bei blockiertem localStorage (kein Absturz)", () => {
    const storage = createThrowingStorage();
    expect(() =>
      recordRoundCompletion(
        { mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 },
        storage,
      ),
    ).not.toThrow();
    const result = recordRoundCompletion(
      { mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 },
      storage,
    );
    expect(result.earned).toBe(true);
  });
});

describe("redeemMascot", () => {
  it("löst ein Maskottchen gegen 5 Sterne ein und zieht 5 Sterne ab", () => {
    const storage = createFakeStorage();
    for (let i = 0; i < 5; i += 1) {
      recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 }, storage);
    }
    const result = redeemMascot(1, storage);
    expect(result).toEqual({ stars: 0, unlockedIds: [0, 1], activeIdx: 1 });
    expect(loadProgress(storage)).toEqual(result);
  });

  it("setzt activeIdx auf das neu freigeschaltete Maskottchen", () => {
    const storage = createFakeStorage();
    for (let i = 0; i < 10; i += 1) {
      recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 }, storage);
    }
    redeemMascot(1, storage);
    const second = redeemMascot(2, storage);
    expect(second.unlockedIds).toEqual([0, 1, 2]);
    expect(second.activeIdx).toBe(2);
  });

  it("Guard: liefert null und ändert nichts bei weniger als 5 Sternen", () => {
    const storage = createFakeStorage();
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 }, storage);
    expect(redeemMascot(1, storage)).toBeNull();
    expect(loadProgress(storage)).toEqual({ stars: 1, unlockedIds: [0], activeIdx: 0 });
  });

  it("Guard: verhindert doppeltes Freischalten desselben Maskottchens", () => {
    const storage = createFakeStorage();
    for (let i = 0; i < 10; i += 1) {
      recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 }, storage);
    }
    redeemMascot(1, storage);
    const before = loadProgress(storage);
    expect(redeemMascot(1, storage)).toBeNull();
    expect(loadProgress(storage)).toEqual(before);
  });

  it("liefert null bei blockiertem localStorage", () => {
    expect(redeemMascot(1, createThrowingStorage())).toBeNull();
  });
});

describe("setActiveIdx", () => {
  it("setzt einen gültigen Index und persistiert ihn", () => {
    const storage = createFakeStorage();
    for (let i = 0; i < 5; i += 1) {
      recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 }, storage);
    }
    redeemMascot(1, storage);
    const updated = setActiveIdx(0, storage);
    expect(updated.activeIdx).toBe(0);
    expect(loadProgress(storage).activeIdx).toBe(0);
  });

  it("ist ein No-Op außerhalb des gültigen Bereichs", () => {
    const storage = createFakeStorage();
    const before = loadProgress(storage);
    expect(setActiveIdx(5, storage)).toEqual(before);
    expect(setActiveIdx(-1, storage)).toEqual(before);
    expect(loadProgress(storage)).toEqual(before);
  });

  it("bleibt fehlertolerant bei blockiertem localStorage (kein Absturz)", () => {
    expect(() => setActiveIdx(0, createThrowingStorage())).not.toThrow();
  });
});
