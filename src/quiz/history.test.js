// Tests für src/quiz/history.js (Issue #14: lokale Verlaufsliste der letzten
// Quiz-Ergebnisse). Nutzt eine In-Memory-Fake-Storage statt echtem
// `localStorage`, damit die Tests ohne DOM-/Browser-Umgebung laufen — sowohl
// für den Erfolgsfall als auch, um "blockiertes localStorage" (z. B. Safari
// Private Mode) gezielt zu simulieren.

import { describe, it, expect } from "vitest";
import {
  saveResultToHistory,
  loadResultHistory,
  MAX_HISTORY_ENTRIES,
} from "./history.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

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

describe("loadResultHistory", () => {
  it("liefert ein leeres Array, wenn noch nichts gespeichert wurde", () => {
    const storage = createFakeStorage();
    expect(loadResultHistory(storage)).toEqual([]);
  });

  it("liefert ein leeres Array statt zu werfen, wenn die Storage blockiert ist", () => {
    const storage = createThrowingStorage();
    expect(() => loadResultHistory(storage)).not.toThrow();
    expect(loadResultHistory(storage)).toEqual([]);
  });

  it("liefert ein leeres Array bei kaputten/fremden Daten statt zu werfen", () => {
    const storage = createFakeStorage();
    storage.setItem("tierquiz-kinder:result-history", "{ kein valides JSON");
    expect(loadResultHistory(storage)).toEqual([]);

    storage.setItem("tierquiz-kinder:result-history", JSON.stringify({ a: 1 }));
    expect(loadResultHistory(storage)).toEqual([]);
  });
});

describe("saveResultToHistory", () => {
  it("speichert einen Eintrag mit date/score/total/difficulty (rohe Werte)", () => {
    const storage = createFakeStorage();
    const updated = saveResultToHistory(
      { score: 7, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      score: 7,
      total: 10,
      difficulty: DIFFICULTY_LEVELS.EASY,
    });
    expect(typeof updated[0].date).toBe("string");
    expect(Number.isNaN(new Date(updated[0].date).getTime())).toBe(false);
  });

  it("neue Einträge stehen vorn (neueste zuerst)", () => {
    const storage = createFakeStorage();
    saveResultToHistory(
      { score: 3, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );
    saveResultToHistory(
      { score: 9, total: 10, difficulty: DIFFICULTY_LEVELS.HARD },
      storage,
    );

    const history = loadResultHistory(storage);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ score: 9, difficulty: DIFFICULTY_LEVELS.HARD });
    expect(history[1]).toMatchObject({ score: 3, difficulty: DIFFICULTY_LEVELS.EASY });
  });

  it("kappt die Liste auf MAX_HISTORY_ENTRIES (behält die neuesten)", () => {
    const storage = createFakeStorage();
    expect(MAX_HISTORY_ENTRIES).toBe(5);

    for (let i = 0; i < MAX_HISTORY_ENTRIES + 3; i += 1) {
      saveResultToHistory(
        { score: i, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
        storage,
      );
    }

    const history = loadResultHistory(storage);
    expect(history).toHaveLength(MAX_HISTORY_ENTRIES);
    // Neuester Eintrag (letzter Aufruf, score = MAX_HISTORY_ENTRIES + 2) zuerst.
    expect(history[0].score).toBe(MAX_HISTORY_ENTRIES + 2);
    // Älteste 3 Einträge (score 0,1,2) wurden verdrängt.
    expect(history.map((entry) => entry.score)).not.toContain(0);
  });

  it("wirft nicht und liefert null, wenn die Storage blockiert ist", () => {
    const storage = createThrowingStorage();
    let result;
    expect(() => {
      result = saveResultToHistory(
        { score: 5, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
        storage,
      );
    }).not.toThrow();
    expect(result).toBeNull();
  });

  it("unterstützt unterschiedliche total-Werte nebeneinander (Issue #13-Abhängigkeit: rohe score/total statt Prozent)", () => {
    const storage = createFakeStorage();
    saveResultToHistory(
      { score: 9, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );
    saveResultToHistory(
      { score: 18, total: 20, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );

    const history = loadResultHistory(storage);
    expect(history[0]).toMatchObject({ score: 18, total: 20 });
    expect(history[1]).toMatchObject({ score: 9, total: 10 });
  });
});
