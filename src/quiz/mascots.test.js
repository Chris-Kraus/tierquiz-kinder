// Tests für src/quiz/mascots.js (Issue #80, Sterne-/Maskottchen-
// Freischaltsystem).

import { describe, it, expect } from "vitest";
import { MASCOTS, TINTS, tintOf } from "./mascots.js";

describe("MASCOTS", () => {
  it("enthält genau 50 Einträge", () => {
    expect(MASCOTS).toHaveLength(50);
  });

  it("jeder Eintrag hat id passend zu seinem Index, name, emoji und role", () => {
    MASCOTS.forEach((mascot, index) => {
      expect(mascot.id).toBe(index);
      expect(typeof mascot.name).toBe("string");
      expect(mascot.name.length).toBeGreaterThan(0);
      expect(typeof mascot.emoji).toBe("string");
      expect(mascot.emoji.length).toBeGreaterThan(0);
      expect(typeof mascot.role).toBe("string");
      expect(mascot.role.length).toBeGreaterThan(0);
    });
  });

  it("erstes Maskottchen (id 0) ist Fine der Fuchs", () => {
    expect(MASCOTS[0].name).toBe("Fine der Fuchs");
  });
});

describe("tintOf", () => {
  it("liefert 6 rotierende Farben aus TINTS", () => {
    expect(TINTS).toHaveLength(6);
  });

  it("rotiert die Zuordnung per Modulo über TINTS", () => {
    for (let id = 0; id < 20; id += 1) {
      expect(tintOf(id)).toBe(TINTS[id % TINTS.length]);
    }
  });

  it("liefert für id 0 und id 6 (eine Rotation weiter) dieselbe Farbe", () => {
    expect(tintOf(0)).toBe(tintOf(6));
    expect(tintOf(0)).toBe(TINTS[0]);
  });

  it("liefert für die letzte Maskottchen-id (49) eine gültige TINTS-Farbe", () => {
    expect(TINTS).toContain(tintOf(49));
  });
});
