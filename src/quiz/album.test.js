// Tests für src/quiz/album.js (Redesign, Issue #68). Nutzt eine In-Memory-
// Fake-Storage statt echtem `localStorage`, analog zu history.test.js.

import { describe, it, expect } from "vitest";
import {
  loadCollectedAnimals,
  addCollectedAnimal,
  getAlbumProgress,
  ALBUM_TARGET,
} from "./album.js";

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

describe("loadCollectedAnimals", () => {
  it("liefert ein leeres Array, wenn noch nichts gespeichert ist", () => {
    const storage = createFakeStorage();
    expect(loadCollectedAnimals(storage)).toEqual([]);
  });

  it("liefert die gespeicherten Tier-IDs", () => {
    const storage = createFakeStorage();
    storage.setItem("tierquiz-kinder:album", JSON.stringify(["Q140", "Q42"]));
    expect(loadCollectedAnimals(storage)).toEqual(["Q140", "Q42"]);
  });

  it("liefert ein leeres Array bei kaputten JSON-Daten", () => {
    const storage = createFakeStorage();
    storage.setItem("tierquiz-kinder:album", "{not-valid-json");
    expect(loadCollectedAnimals(storage)).toEqual([]);
  });

  it("liefert ein leeres Array, wenn der gespeicherte Wert kein Array ist", () => {
    const storage = createFakeStorage();
    storage.setItem("tierquiz-kinder:album", JSON.stringify({ foo: "bar" }));
    expect(loadCollectedAnimals(storage)).toEqual([]);
  });

  it("filtert nicht-string-Einträge defensiv heraus", () => {
    const storage = createFakeStorage();
    storage.setItem(
      "tierquiz-kinder:album",
      JSON.stringify(["Q140", 42, null, "", "Q42"]),
    );
    expect(loadCollectedAnimals(storage)).toEqual(["Q140", "Q42"]);
  });

  it("liefert ein leeres Array bei blockiertem localStorage", () => {
    expect(loadCollectedAnimals(createThrowingStorage())).toEqual([]);
  });

  it("liefert ein leeres Array ohne übergebene Storage, wenn kein localStorage existiert", () => {
    expect(loadCollectedAnimals()).toEqual([]);
  });
});

describe("addCollectedAnimal", () => {
  it("fügt ein neues Tier hinzu", () => {
    const storage = createFakeStorage();
    const updated = addCollectedAnimal("Q140", storage);
    expect(updated).toEqual(["Q140"]);
    expect(loadCollectedAnimals(storage)).toEqual(["Q140"]);
  });

  it("dedupliziert bei mehrfachem Sammeln desselben Tieres", () => {
    const storage = createFakeStorage();
    addCollectedAnimal("Q140", storage);
    const updated = addCollectedAnimal("Q140", storage);
    expect(updated).toEqual(["Q140"]);
    expect(loadCollectedAnimals(storage)).toEqual(["Q140"]);
  });

  it("hängt weitere unterschiedliche Tiere an", () => {
    const storage = createFakeStorage();
    addCollectedAnimal("Q140", storage);
    const updated = addCollectedAnimal("Q42", storage);
    expect(updated).toEqual(["Q140", "Q42"]);
  });

  it("liefert null bei blockiertem localStorage", () => {
    expect(addCollectedAnimal("Q140", createThrowingStorage())).toBeNull();
  });

  it("liefert null bei ungültiger animalId", () => {
    const storage = createFakeStorage();
    expect(addCollectedAnimal("", storage)).toBeNull();
    expect(addCollectedAnimal(null, storage)).toBeNull();
    expect(addCollectedAnimal(undefined, storage)).toBeNull();
  });
});

describe("getAlbumProgress", () => {
  it("liefert 0 von ALBUM_TARGET bei leerem Album", () => {
    const storage = createFakeStorage();
    expect(getAlbumProgress(storage)).toEqual({
      collected: 0,
      target: ALBUM_TARGET,
    });
  });

  it("liefert die aktuelle Anzahl gesammelter Tiere", () => {
    const storage = createFakeStorage();
    addCollectedAnimal("Q140", storage);
    addCollectedAnimal("Q42", storage);
    expect(getAlbumProgress(storage)).toEqual({
      collected: 2,
      target: ALBUM_TARGET,
    });
  });

  it("erlaubt ein abweichendes Ziel", () => {
    const storage = createFakeStorage();
    addCollectedAnimal("Q140", storage);
    expect(getAlbumProgress(storage, 5)).toEqual({ collected: 1, target: 5 });
  });
});
