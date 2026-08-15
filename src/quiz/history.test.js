// Tests für src/quiz/history.js (Issue #14: lokale Verlaufsliste der letzten
// Quiz-Ergebnisse; erweitert um Modus-Feld, `id` sowie Lösch-Funktionen in
// Issue #36). Nutzt eine In-Memory-Fake-Storage statt echtem `localStorage`,
// damit die Tests ohne DOM-/Browser-Umgebung laufen — sowohl für den
// Erfolgsfall als auch, um "blockiertes localStorage" (z. B. Safari Private
// Mode) gezielt zu simulieren.

import { describe, it, expect } from "vitest";
import {
  saveResultToHistory,
  loadResultHistory,
  deleteHistoryEntry,
  clearResultHistory,
  MAX_HISTORY_ENTRIES,
} from "./history.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";
import { QUIZ_MODES } from "./mode.js";

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

  it("speichert einen Eintrag mit eindeutiger id und dem übergebenen mode (Issue #36)", () => {
    const storage = createFakeStorage();
    const updated = saveResultToHistory(
      {
        score: 7,
        total: 10,
        difficulty: DIFFICULTY_LEVELS.EASY,
        mode: QUIZ_MODES.REVERSE,
      },
      storage,
    );

    expect(typeof updated[0].id).toBe("string");
    expect(updated[0].id.length).toBeGreaterThan(0);
    expect(updated[0].mode).toBe(QUIZ_MODES.REVERSE);
  });

  it("vergibt unterschiedlichen Einträgen unterschiedliche IDs (Issue #36, Grundlage für gezieltes Löschen)", () => {
    const storage = createFakeStorage();
    saveResultToHistory(
      { score: 1, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );
    saveResultToHistory(
      { score: 2, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );

    const history = loadResultHistory(storage);
    expect(history[0].id).not.toBe(history[1].id);
  });
});

describe("loadResultHistory — Migration von Alt-Einträgen ohne id/mode (Issue #36)", () => {
  it("ergänzt bei einem Alt-Eintrag ohne id-Feld beim Lesen eine id, ohne das mode-Feld zu schreiben", () => {
    const storage = createFakeStorage();
    // Alt-Eintrag simulieren: so, wie er vor Issue #36 (Issue #14-Stand)
    // gespeichert worden wäre — ohne `id`, ohne `mode`.
    storage.setItem(
      "tierquiz-kinder:result-history",
      JSON.stringify([
        {
          date: "2026-08-01T10:00:00.000Z",
          score: 4,
          total: 10,
          difficulty: DIFFICULTY_LEVELS.EASY,
        },
      ]),
    );

    const history = loadResultHistory(storage);

    expect(history).toHaveLength(1);
    expect(typeof history[0].id).toBe("string");
    expect(history[0].id.length).toBeGreaterThan(0);
    expect(history[0].mode).toBeUndefined();
    expect(history[0]).toMatchObject({ score: 4, total: 10 });
  });

  it("vergibt bei wiederholtem Lesen dieselbe (persistierte) id für einen migrierten Alt-Eintrag", () => {
    const storage = createFakeStorage();
    storage.setItem(
      "tierquiz-kinder:result-history",
      JSON.stringify([
        {
          date: "2026-08-01T10:00:00.000Z",
          score: 4,
          total: 10,
          difficulty: DIFFICULTY_LEVELS.EASY,
        },
      ]),
    );

    const firstRead = loadResultHistory(storage);
    const secondRead = loadResultHistory(storage);

    expect(secondRead[0].id).toBe(firstRead[0].id);
  });

  it("lässt bereits vorhandene ids/mode-Werte unverändert", () => {
    const storage = createFakeStorage();
    storage.setItem(
      "tierquiz-kinder:result-history",
      JSON.stringify([
        {
          id: "bestehende-id",
          date: "2026-08-14T10:00:00.000Z",
          score: 6,
          total: 10,
          difficulty: DIFFICULTY_LEVELS.HARD,
          mode: QUIZ_MODES.SOUND,
        },
      ]),
    );

    const history = loadResultHistory(storage);
    expect(history[0]).toMatchObject({
      id: "bestehende-id",
      mode: QUIZ_MODES.SOUND,
    });
  });
});

describe("deleteHistoryEntry", () => {
  it("entfernt genau den Eintrag mit der übergebenen id und persistiert das Ergebnis", () => {
    const storage = createFakeStorage();
    saveResultToHistory(
      { score: 1, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );
    saveResultToHistory(
      { score: 2, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );
    const [newest, oldest] = loadResultHistory(storage);

    const updated = deleteHistoryEntry(newest.id, storage);

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(oldest.id);
    expect(loadResultHistory(storage)).toHaveLength(1);
  });

  it("liefert die unveränderte Liste, wenn keine passende id existiert", () => {
    const storage = createFakeStorage();
    saveResultToHistory(
      { score: 1, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );

    const updated = deleteHistoryEntry("unbekannte-id", storage);

    expect(updated).toHaveLength(1);
  });

  it("liefert ein leeres Array, wenn der letzte Eintrag gelöscht wird", () => {
    const storage = createFakeStorage();
    saveResultToHistory(
      { score: 1, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );
    const [entry] = loadResultHistory(storage);

    const updated = deleteHistoryEntry(entry.id, storage);

    expect(updated).toEqual([]);
    expect(loadResultHistory(storage)).toEqual([]);
  });

  it("wirft nicht und liefert null, wenn die Storage blockiert ist", () => {
    const storage = createThrowingStorage();
    let result;
    expect(() => {
      result = deleteHistoryEntry("irgendeine-id", storage);
    }).not.toThrow();
    expect(result).toBeNull();
  });
});

describe("clearResultHistory", () => {
  it("entfernt alle Einträge und persistiert das", () => {
    const storage = createFakeStorage();
    saveResultToHistory(
      { score: 1, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );
    saveResultToHistory(
      { score: 2, total: 10, difficulty: DIFFICULTY_LEVELS.EASY },
      storage,
    );

    const updated = clearResultHistory(storage);

    expect(updated).toEqual([]);
    expect(loadResultHistory(storage)).toEqual([]);
  });

  it("wirft nicht und liefert null, wenn die Storage blockiert ist", () => {
    const storage = createThrowingStorage();
    let result;
    expect(() => {
      result = clearResultHistory(storage);
    }).not.toThrow();
    expect(result).toBeNull();
  });
});
