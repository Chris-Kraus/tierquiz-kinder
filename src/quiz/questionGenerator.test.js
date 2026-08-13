// Tests für src/quiz/questionGenerator.js (Issue #5: Fragegenerierungs-
// Logik). Läuft ausschließlich gegen die Test-Fixture
// src/quiz/__fixtures__/sampleAnimals.js — bewusst NICHT gegen
// data/animals.json (siehe Datei-Kommentar in questionGenerator.js: die
// echte Tierdatenbank ist exklusiv Issue #2 und wird hier nicht angefasst).

import { describe, it, expect } from "vitest";
import {
  generateQuestions,
  buildQuestionForField,
  DEFAULT_ROUND_LENGTH,
} from "./questionGenerator.js";
import { DIFFICULTY_LEVELS, getFieldsForDifficulty } from "./difficulty.js";
import { sampleAnimals } from "./__fixtures__/sampleAnimals.js";

const EASY = DIFFICULTY_LEVELS.EASY;
const HARD = DIFFICULTY_LEVELS.HARD;

function expectValidQuestionShape(question) {
  expect(question.options).toHaveLength(4);
  const correctOptions = question.options.filter((option) => option.correct);
  expect(correctOptions).toHaveLength(1);

  const texts = question.options.map((option) => option.text);
  expect(new Set(texts).size).toBe(4); // keine Duplikate unter den Optionen

  expect(typeof question.text).toBe("string");
  expect(question.text.length).toBeGreaterThan(0);
  expect(typeof question.animalId).toBe("string");
  expect(typeof question.field).toBe("string");
}

describe("generateQuestions — Grundform", () => {
  it("erzeugt standardmäßig DEFAULT_ROUND_LENGTH (10) Fragen", () => {
    const questions = generateQuestions(sampleAnimals, { difficulty: EASY });
    expect(DEFAULT_ROUND_LENGTH).toBe(10);
    expect(questions).toHaveLength(10);
  });

  it("jede Frage hat 4 Optionen, genau eine richtige, keine Duplikate", () => {
    const questions = generateQuestions(sampleAnimals, { difficulty: HARD });
    expect(questions.length).toBeGreaterThan(0);
    questions.forEach(expectValidQuestionShape);
  });

  it("bezieht sich innerhalb einer Runde auf unterschiedliche Tiere (keine Duplikate)", () => {
    const questions = generateQuestions(sampleAnimals, { difficulty: EASY });
    const animalIds = questions.map((q) => q.animalId);
    expect(new Set(animalIds).size).toBe(animalIds.length);
  });

  it("Rundenlänge ist über 'count' konfigurierbar", () => {
    const questions = generateQuestions(sampleAnimals, {
      difficulty: EASY,
      count: 5,
    });
    expect(questions).toHaveLength(5);
  });

  it("wirft bei unbekannter Schwierigkeitsstufe (keine leise Fehlfunktion)", () => {
    expect(() =>
      generateQuestions(sampleAnimals, { difficulty: "erwachsen" }),
    ).toThrow();
  });

  it("wirft nicht und liefert höchstens so viele Fragen wie Tiere vorhanden, wenn count > Pool", () => {
    const questions = generateQuestions(sampleAnimals, {
      difficulty: EASY,
      count: 1000,
    });
    expect(questions.length).toBeLessThanOrEqual(sampleAnimals.length);
    expect(questions.length).toBeGreaterThan(0);
  });
});

describe("generateQuestions — Schwierigkeitsstufen nutzen unterschiedliche Felder", () => {
  it("Stufe 6-10 nutzt ausschließlich category/habitat/continent/color", () => {
    const easyFields = new Set(getFieldsForDifficulty(EASY));
    // Über mehrere Läufe prüfen, da die Feld-/Tierauswahl zufällig ist.
    for (let i = 0; i < 10; i += 1) {
      const questions = generateQuestions(sampleAnimals, { difficulty: EASY });
      questions.forEach((question) => {
        expect(easyFields.has(question.field)).toBe(true);
      });
    }
  });

  it("Stufe 10-12 kann auch die anspruchsvolleren Felder nutzen (Feldmenge ist Obermenge)", () => {
    const hardFields = new Set(getFieldsForDifficulty(HARD));
    const questions = generateQuestions(sampleAnimals, { difficulty: HARD });
    questions.forEach((question) => {
      expect(hardFields.has(question.field)).toBe(true);
    });
  });
});

describe("buildQuestionForField — Robustheit bei fehlenden optionalen Feldern", () => {
  it("überspringt (liefert null) statt zu crashen, wenn das Tier das Feld nicht hat", () => {
    const pinguin = sampleAnimals.find((a) => a.name_de === "Pinguin");
    expect(pinguin.length_cm).toBeUndefined();
    expect(() =>
      buildQuestionForField(pinguin, "length_cm", sampleAnimals, HARD),
    ).not.toThrow();
    expect(
      buildQuestionForField(pinguin, "length_cm", sampleAnimals, HARD),
    ).toBeNull();
  });

  it("liefert eine gültige Frage für ein Tier, das nur Pflichtfelder besitzt (Seestern)", () => {
    const seestern = sampleAnimals.find((a) => a.name_de === "Seestern");
    const question = buildQuestionForField(
      seestern,
      "category",
      sampleAnimals,
      EASY,
    );
    expect(question).not.toBeNull();
    expectValidQuestionShape(question);
  });

  it("liefert null für ein unbekanntes Feld statt zu crashen", () => {
    const loewe = sampleAnimals.find((a) => a.name_de === "Löwe");
    expect(
      buildQuestionForField(loewe, "does_not_exist", sampleAnimals, EASY),
    ).toBeNull();
  });
});

describe("buildQuestionForField — Falschantworten-Strategie 'close' (Stufe 10-12)", () => {
  it("wählt bei numerischen Feldern die betragsmäßig nächstgelegenen Falschantworten", () => {
    // Kleine, kontrollierte Teilmenge mit klar unterschiedlichen Gewichten:
    // Löwe 190, Tiger 220 (Δ30), Braunbär 300 (Δ110), Zebra 350 (Δ160),
    // Giraffe 800 (Δ610), Elefant 5000 (Δ4810) — die 3 nächsten sind
    // Tiger/Braunbär/Zebra, nicht Giraffe/Elefant.
    const byName = (name) => sampleAnimals.find((a) => a.name_de === name);
    const subset = [
      "Löwe",
      "Tiger",
      "Braunbär",
      "Zebra",
      "Giraffe",
      "Elefant",
    ].map(byName);
    const loewe = byName("Löwe");

    const question = buildQuestionForField(loewe, "weight_kg", subset, HARD);
    expect(question).not.toBeNull();

    const wrongTexts = question.options
      .filter((o) => !o.correct)
      .map((o) => o.text);
    expect(wrongTexts.sort()).toEqual(["220 kg", "300 kg", "350 kg"].sort());
    expect(wrongTexts).not.toContain("800 kg");
    expect(wrongTexts).not.toContain("5000 kg");
  });
});

describe("buildQuestionForField — diet-Feld (nur 3 mögliche Enum-Werte)", () => {
  it("erzeugt trotzdem eine gültige 4-Optionen-Frage (Fallback auf Tiernamen als Optionen)", () => {
    const loewe = sampleAnimals.find((a) => a.name_de === "Löwe");
    const question = buildQuestionForField(loewe, "diet", sampleAnimals, HARD);
    expect(question).not.toBeNull();
    expectValidQuestionShape(question);
    // Fallback-Frageform: Optionen sind Tiernamen, nicht Diät-Werte.
    expect(question.questionType).toBe("identify");
  });
});
