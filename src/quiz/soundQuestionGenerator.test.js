// Test für den Schnittstellen-Platzhalter aus Issue #31 (siehe Datei-
// Kommentar in soundQuestionGenerator.js): solange Issue #32 diese Datei
// nicht durch die echte Implementierung ersetzt hat, muss jeder Aufruf
// zuverlässig ablehnen, damit src/screens/start.js den "Tiergeräusche"-
// Testabruf konsistent als Fehlerfall behandelt.

import { describe, it, expect } from "vitest";
import { generateNextSoundQuestion } from "./soundQuestionGenerator.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

describe("generateNextSoundQuestion (Platzhalter, Issue #31)", () => {
  it("lehnt jeden Aufruf ab, solange die echte Implementierung aus Issue #32 fehlt", async () => {
    await expect(
      generateNextSoundQuestion([], new Set(), DIFFICULTY_LEVELS.EASY),
    ).rejects.toThrow();
  });
});
