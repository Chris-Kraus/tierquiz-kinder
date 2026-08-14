// Tests für src/quiz/questionGenerator.js (Issue #5: Fragegenerierungs-
// Logik). Läuft ausschließlich gegen die Test-Fixture
// src/quiz/__fixtures__/sampleAnimals.js — bewusst NICHT gegen
// data/animals.json (siehe Datei-Kommentar in questionGenerator.js: die
// echte Tierdatenbank ist exklusiv Issue #2 und wird hier nicht angefasst).

import { describe, it, expect } from "vitest";
import {
  generateQuestions,
  buildQuestionForField,
  buildComparisonQuestionForField,
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
  it("Stufe 6-10 nutzt ausschließlich category/habitat/continent", () => {
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

describe("buildQuestionForField — Regressionstest QA-Bug #5 (Rundungskollision bei 'close')", () => {
  // Lokaler, testspezifischer Datensatz (bewusst nicht sampleAnimals, siehe
  // QA-Kommentar in Issue #5: die Löwe-basierten Fixture-Werte kollidieren
  // nach Rundung auf 1 Nachkommastelle nicht, daher hat die bestehende
  // Testsuite den Bug nicht abgedeckt). Reproduziert den realen Fall aus dem
  // Bug-Report (kleine Tiere mit Gewichten < 1 kg, formatNumber() rundet auf
  // 1 Nachkommastelle -> mehrere Rohwerte fallen auf denselben Anzeigetext
  // "0 kg").
  const correctAnimal = {
    id: "T1",
    name_de: "Testmaus",
    category: "Säugetier",
    weight_kg: 0.03, // rundet auf "0 kg"
  };

  it("wählt keine Falschantwort, deren Anzeigetext (nach Rundung) mit der korrekten Antwort kollidiert", () => {
    const otherAnimals = [
      // Rohwert 0.04 ist der betragsmäßig NÄCHSTE Wert zu 0.03 (Δ0.01) und
      // wäre unter der alten, rein rohwertbasierten "close"-Sortierung die
      // erste Wahl — rundet aber ebenfalls auf "0 kg" wie der korrekte Wert.
      { id: "T2", name_de: "Kollisionstier A", category: "Säugetier", weight_kg: 0.04 },
      { id: "T3", name_de: "Nahtier B", category: "Säugetier", weight_kg: 0.2 },
      { id: "T4", name_de: "Nahtier C", category: "Säugetier", weight_kg: 0.3 },
      { id: "T5", name_de: "Nahtier D", category: "Säugetier", weight_kg: 0.5 },
      { id: "T6", name_de: "Ferntier", category: "Säugetier", weight_kg: 100 },
    ];

    const question = buildQuestionForField(
      correctAnimal,
      "weight_kg",
      [correctAnimal, ...otherAnimals],
      HARD,
    );

    expect(question).not.toBeNull();
    expect(question.questionType).toBe("value");
    expectValidQuestionShape(question); // prüft u.a. 4 eindeutige Anzeigetexte

    const texts = question.options.map((o) => o.text);
    // Der kollidierende Kandidat (0.04 kg -> "0 kg") darf nicht als
    // Falschantwort neben der korrekten "0 kg"-Antwort auftauchen.
    expect(texts.filter((t) => t === "0 kg")).toHaveLength(1);
  });

  it("weicht auf die Identifizieren-Fallback-Frage aus, wenn ALLE nahen Kandidaten nach Rundung mit dem korrekten Wert kollidieren", () => {
    const otherAnimals = [
      { id: "T2", name_de: "Kollisionstier A", category: "Säugetier", weight_kg: 0.01 },
      { id: "T3", name_de: "Kollisionstier B", category: "Säugetier", weight_kg: 0.02 },
      { id: "T4", name_de: "Kollisionstier C", category: "Säugetier", weight_kg: 0.04 },
      { id: "T5", name_de: "Kollisionstier D", category: "Säugetier", weight_kg: 0.045 },
    ];

    const question = buildQuestionForField(
      correctAnimal,
      "weight_kg",
      [correctAnimal, ...otherAnimals],
      HARD,
    );

    // Kein value-basierter Falschantworten-Pool mit genug eindeutigen
    // Anzeigetexten möglich -> muss auf die generische Identifizieren-Frage
    // (Tiernamen als Optionen) ausweichen statt eine Frage mit doppelten
    // Anzeigewerten zu erzeugen oder null zurückzugeben.
    expect(question).not.toBeNull();
    expect(question.questionType).toBe("identify");
    expectValidQuestionShape(question);
  });
});

describe("generateQuestions — Feld-Durchmischung innerhalb einer Runde (Regressionstest Issue #11)", () => {
  // Issue #11 (QA-Fund aus #8): die Feld-Reihenfolge wurde früher EINMAL pro
  // Runde gemischt und dann für jedes Tier in exakt dieser festen Reihenfolge
  // durchprobiert. Bei ungleicher Feld-Abdeckung (echte data/animals.json:
  // category 100 %, habitat ~5 %, continent ~6 %) gewann dadurch praktisch
  // immer dasselbe, am besten abgedeckte Feld — Stufe 6-10 bestand zu 91,7 %
  // aus `category`-Fragen (siehe Issue #11 für die volle Analyse).
  //
  // sampleAnimals ist hierfür ein besonders scharfer Testfall: ALLE Tiere
  // darin haben category/habitat/continent vollständig gesetzt. Mit der alten
  // Logik hätte das bedeutet, dass IMMER nur das zuerst gemischte Feld
  // verwendet wird -> eine komplette Runde (10/10 Fragen) bestünde aus einem
  // einzigen Feldtyp, bei jedem einzelnen Lauf. Das macht diesen Test robust
  // gegen ein Wieder-Einschleichen des alten "einmal pro Runde mischen"-Musters,
  // ohne auf einen bestimmten Zufallsseed angewiesen zu sein.
  const ROUNDS = 30;
  const ROUND_SIZE = 10;
  // Erfolgskriterium: kein Feld darf eine einzelne Runde dominieren
  // (> 60 % der Fragen), wenn — wie hier — mehrere Felder ausreichend
  // abgedeckt sind. Das ist bewusst lockerer als eine perfekte Gleichverteilung
  // (1/3 je Feld bei 3 EASY-Feldern), aber deutlich strenger als das alte
  // Verhalten (durchgängig 100 % ein Feld).
  const MAX_SHARE_PER_ROUND = 0.6;

  function tallyFields(questions) {
    const tally = {};
    for (const q of questions) tally[q.field] = (tally[q.field] || 0) + 1;
    return tally;
  }

  function maxShare(tally, total) {
    return Math.max(...Object.values(tally)) / total;
  }

  it("Stufe 6-10: kein Feld dominiert eine Runde mit >60% der Fragen (30 simulierte Runden)", () => {
    const overallTally = {};
    let worstShare = 0;

    for (let i = 0; i < ROUNDS; i += 1) {
      const questions = generateQuestions(sampleAnimals, {
        difficulty: EASY,
        count: ROUND_SIZE,
      });
      expect(questions).toHaveLength(ROUND_SIZE);

      const roundTally = tallyFields(questions);
      const share = maxShare(roundTally, questions.length);
      worstShare = Math.max(worstShare, share);

      for (const [field, n] of Object.entries(roundTally)) {
        overallTally[field] = (overallTally[field] || 0) + n;
      }
    }

    expect(worstShare).toBeLessThanOrEqual(MAX_SHARE_PER_ROUND);
    // Über alle 30 Runden hinweg müssen tatsächlich alle 3 vorgesehenen
    // Felder vorkommen (nicht nur theoretisch verfügbar sein).
    expect(Object.keys(overallTally).sort()).toEqual(
      ["category", "continent", "habitat"].sort(),
    );
  });

  it("Stufe 10-12: kein Feld dominiert eine Runde mit >60% der Fragen (30 simulierte Runden)", () => {
    let worstShare = 0;

    for (let i = 0; i < ROUNDS; i += 1) {
      const questions = generateQuestions(sampleAnimals, {
        difficulty: HARD,
        count: ROUND_SIZE,
      });
      expect(questions.length).toBeGreaterThan(0);

      const roundTally = tallyFields(questions);
      const share = maxShare(roundTally, questions.length);
      worstShare = Math.max(worstShare, share);
    }

    expect(worstShare).toBeLessThanOrEqual(MAX_SHARE_PER_ROUND);
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

describe("buildComparisonQuestionForField — Vergleichsfrage 'heaviest_animal' (Issue #20)", () => {
  it("wählt unter 4 Kandidaten mit eindeutigem Höchstgewicht genau das schwerste Tier als korrekte Option", () => {
    // Kontrollierte 4er-Teilmenge mit eindeutig unterschiedlichen Gewichten
    // (Löwe 190 < Tiger 220 < Braunbär 300 < Zebra 350) — da die Teilmenge
    // exakt 4 Tiere umfasst, ist das Ergebnis unabhängig vom Zufalls-Shuffle
    // immer dieselbe Auswahl, nur die Reihenfolge der Optionen variiert.
    const byName = (name) => sampleAnimals.find((a) => a.name_de === name);
    const subset = ["Löwe", "Tiger", "Braunbär", "Zebra"].map(byName);

    const question = buildComparisonQuestionForField(
      "heaviest_animal",
      subset,
    );

    expect(question).not.toBeNull();
    expect(question.questionType).toBe("comparison");
    expect(question.text).toBe("Welches dieser vier Tiere ist am schwersten?");
    expectValidQuestionShape(question);

    const optionNames = question.options.map((o) => o.text).sort();
    expect(optionNames).toEqual(
      ["Löwe", "Tiger", "Braunbär", "Zebra"].sort(),
    );

    const correctOption = question.options.find((o) => o.correct);
    expect(correctOption.text).toBe("Zebra");
    expect(question.animalName).toBe("Zebra");
    expect(question.animalId).toBe(byName("Zebra").id);
  });

  it("liefert null, wenn weniger als 4 Tiere ein befülltes weight_kg haben", () => {
    const subset = sampleAnimals
      .filter((a) => typeof a.weight_kg === "number")
      .slice(0, 3);
    expect(
      buildComparisonQuestionForField("heaviest_animal", subset),
    ).toBeNull();
  });

  it("liefert null für ein unbekanntes Pseudofeld statt zu crashen", () => {
    expect(() =>
      buildComparisonQuestionForField("does_not_exist", sampleAnimals),
    ).not.toThrow();
    expect(
      buildComparisonQuestionForField("does_not_exist", sampleAnimals),
    ).toBeNull();
  });

  it("liefert null, wenn der Höchstwert unter den 4 Kandidaten mehrfach vorkommt (kein eindeutig korrekter Gewinner)", () => {
    // Exakt 4 Kandidaten, davon zwei mit dem (gemeinsamen) Höchstgewicht ->
    // jede der COMPARISON_MAX_ATTEMPTS Neuziehungen wählt zwangsläufig
    // dieselben 4 Tiere (nur andere Reihenfolge) und trifft immer wieder auf
    // denselben Gleichstand -> muss null liefern statt zwei "korrekte"
    // Optionen zu erzeugen.
    const tiedAnimals = [
      { id: "T1", name_de: "Tier A", weight_kg: 20 },
      { id: "T2", name_de: "Tier B", weight_kg: 20 },
      { id: "T3", name_de: "Tier C", weight_kg: 10 },
      { id: "T4", name_de: "Tier D", weight_kg: 5 },
    ];
    expect(
      buildComparisonQuestionForField("heaviest_animal", tiedAnimals),
    ).toBeNull();
  });

  it("dedupliziert Kandidaten nach Anzeigename (name_de), nicht nach id", () => {
    const duplicateNameAnimals = [
      { id: "T1", name_de: "Zwilling", weight_kg: 20 },
      { id: "T2", name_de: "Zwilling", weight_kg: 25 }, // gleicher Name, andere id
      { id: "T3", name_de: "Tier C", weight_kg: 10 },
      { id: "T4", name_de: "Tier D", weight_kg: 5 },
    ];
    // Nach Dedupe bleiben nur 3 eindeutig benannte Tiere übrig -> zu wenige
    // für eine 4-Optionen-Frage.
    expect(
      buildComparisonQuestionForField("heaviest_animal", duplicateNameAnimals),
    ).toBeNull();
  });
});

describe("generateQuestions — 'heaviest_animal' ist nur in Stufe 10-12 verfügbar und fügt sich in die Feld-Priorisierung (Issue #20)", () => {
  it("Stufe 6-10 erzeugt niemals eine 'heaviest_animal'-Frage", () => {
    for (let i = 0; i < 10; i += 1) {
      const questions = generateQuestions(sampleAnimals, { difficulty: EASY });
      questions.forEach((q) => expect(q.field).not.toBe("heaviest_animal"));
    }
  });

  it("Stufe 10-12: 'heaviest_animal'-Fragen (falls gezogen) sind gültig und korrekt ausgewertet", () => {
    const weightByName = Object.fromEntries(
      sampleAnimals.map((a) => [a.name_de, a.weight_kg]),
    );
    let sawComparisonQuestion = false;

    for (let i = 0; i < 30; i += 1) {
      const questions = generateQuestions(sampleAnimals, {
        difficulty: HARD,
        count: 10,
      });

      questions
        .filter((q) => q.field === "heaviest_animal")
        .forEach((question) => {
          sawComparisonQuestion = true;
          expect(question.questionType).toBe("comparison");
          expectValidQuestionShape(question);

          const correctOption = question.options.find((o) => o.correct);
          const maxWeight = Math.max(
            ...question.options.map((o) => weightByName[o.text]),
          );
          expect(weightByName[correctOption.text]).toBe(maxWeight);
        });
    }

    // sampleAnimals hat >4 Tiere mit befülltem weight_kg, also muss der
    // Fragetyp über 30 Runden hinweg mindestens einmal gezogen werden — sonst
    // wäre er faktisch nicht in die Priorisierung eingebunden (Issue #11).
    expect(sawComparisonQuestion).toBe(true);
  });

  it("Stufe 10-12: 'heaviest_animal' verdrängt die übrigen Fragetypen nicht (kein Feld dominiert >60% einer Runde)", () => {
    // Regressionsschutz analog zum bestehenden Issue-#11-Test oben: stellt
    // sicher, dass die Einbindung des neuen Pseudofelds die bestehende
    // Durchmischung nicht kaputt macht.
    let worstShare = 0;
    for (let i = 0; i < 30; i += 1) {
      const questions = generateQuestions(sampleAnimals, {
        difficulty: HARD,
        count: 10,
      });
      const tally = {};
      for (const q of questions) tally[q.field] = (tally[q.field] || 0) + 1;
      const share = Math.max(...Object.values(tally)) / questions.length;
      worstShare = Math.max(worstShare, share);
    }
    expect(worstShare).toBeLessThanOrEqual(0.6);
  });
});
