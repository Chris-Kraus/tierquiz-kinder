// Tests für src/quiz/infoSentence.js (Issue #12: Infosatz-Generator).
// Deckt insbesondere die im Issue geforderten Akzeptanzkriterien ab:
// Minimalfall (nur Pflichtfelder), Grammatik-Mapping (Artikel/Präpositionen/
// Relativpronomen), sowie die zufällige Priorisierung mehrerer Zusatzfakten
// (PM-Entscheidung, siehe Issue #12).

import { describe, it, expect } from "vitest";
import { buildInfoSentence } from "./infoSentence.js";

// Deterministische rng-Ersatzwerte (Muster wie in questionGenerator.test.js):
// 0 wählt immer das erste Element, ein Wert knapp unter 1 immer das letzte.
const FIRST = () => 0;
const LAST = () => 0.999999;

describe("buildInfoSentence — Minimalfall (nur Pflichtfelder)", () => {
  it("liefert einen nicht-leeren Basissatz, wenn nur id/name_de/category befüllt sind", () => {
    const animal = { id: "Q1", name_de: "Wolf", category: "Säugetier" };
    const sentence = buildInfoSentence(animal, FIRST);

    expect(sentence).toBe("Wolf: Ein Säugetier.");
  });

  it("funktioniert für jede category aus dem Enum ohne Crash und mit korrektem Artikel", () => {
    const cases = [
      ["Säugetier", "Ein Säugetier."],
      ["Vogel", "Ein Vogel."],
      ["Reptil", "Ein Reptil."],
      ["Amphibie", "Eine Amphibie."],
      ["Fisch", "Ein Fisch."],
      ["Insekt", "Ein Insekt."],
      ["Spinnentier", "Ein Spinnentier."],
      ["Weichtier", "Ein Weichtier."],
    ];

    for (const [category, expectedTail] of cases) {
      const sentence = buildInfoSentence(
        { id: "Q1", name_de: "Tier", category },
        FIRST,
      );
      expect(sentence).toBe(`Tier: ${expectedTail}`);
    }
  });

  it("Sonstiges wird kindgerecht als 'besonderes Tier' statt wörtlich als 'ein Sonstiges' formuliert", () => {
    const sentence = buildInfoSentence(
      { id: "Q1", name_de: "Seestern", category: "Sonstiges" },
      FIRST,
    );
    expect(sentence).toBe("Seestern: Ein besonderes Tier.");
  });

  it("bricht bei unbekanntem/fehlendem category-Wert nicht ab (defensiver Fallback)", () => {
    const sentence = buildInfoSentence(
      { id: "Q1", name_de: "Mysterientier", category: "Unbekannt" },
      FIRST,
    );
    expect(sentence.length).toBeGreaterThan(0);
    expect(sentence.startsWith("Mysterientier: Ein Tier")).toBe(true);
  });
});

describe("buildInfoSentence — optionale Bausteine", () => {
  it("Geografie-Baustein kombiniert habitat und continent grammatisch korrekt", () => {
    const animal = {
      id: "Q140",
      name_de: "Löwe",
      category: "Säugetier",
      habitat: ["Savanne"],
      continent: ["Afrika"],
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toBe(
      "Löwe: Ein Säugetier, das in der Savanne und in Afrika lebt.",
    );
  });

  it("nutzt nur bekannte habitat-Werte und überspringt unbekannte/verunreinigte Werte", () => {
    const animal = {
      id: "Q1",
      name_de: "Schneeleopard",
      category: "Säugetier",
      // Bekanntes Datenqualitätsproblem: habitat kann mit Ländernamen statt
      // Lebensraumtypen verunreinigt sein (siehe infoSentence.js-Kommentar).
      habitat: ["Kasachstan", "Mongolei", "Wald"],
      continent: [],
    };
    const sentence = buildInfoSentence(animal, LAST);
    expect(sentence).toBe("Schneeleopard: Ein Säugetier, das im Wald lebt.");
  });

  it("Diät-Baustein setzt korrekten Artikel/Relativpronomen ein", () => {
    const animal = {
      id: "Q1",
      name_de: "Adler",
      category: "Vogel",
      diet: "Fleischfresser",
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toBe(
      "Adler: Ein Vogel, der ein Fleischfresser ist.",
    );
  });

  it("Amphibie nutzt das feminine Relativpronomen 'die'", () => {
    const animal = {
      id: "Q1",
      name_de: "Frosch",
      category: "Amphibie",
      diet: "Fleischfresser",
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toBe("Frosch: Eine Amphibie, die ein Fleischfresser ist.");
  });

  it("Gewicht unter 1 kg wird kindgerecht in Gramm statt '0 kg' ausgedrückt", () => {
    const animal = {
      id: "Q1",
      name_de: "Wintergoldhähnchen",
      category: "Vogel",
      weight_kg: 0.0077,
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toContain("Gramm wiegt");
    expect(sentence).not.toContain("0 Kilogramm");
  });

  it("Länge ab 100 cm wird in Meter statt Zentimeter ausgedrückt", () => {
    const animal = {
      id: "Q1",
      name_de: "Blauwal",
      category: "Säugetier",
      length_cm: 2710,
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toContain("Meter lang ist");
  });

  it("Lebenserwartung von 1 Jahr nutzt den Singular 'Jahr'", () => {
    const animal = {
      id: "Q1",
      name_de: "Schmetterling",
      category: "Insekt",
      lifespan_years: 1,
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toContain("etwa 1 Jahr alt wird");
    expect(sentence).not.toContain("1 Jahre");
  });

  it("Lebenserwartung unter 1 Jahr wird kindgerecht in Monaten statt als Dezimal-Jahreszahl ausgedrückt (QA-Bug, Issue #12)", () => {
    // Realer betroffener Datensatz aus data/animals.json (lifespan_years: 0.1)
    // — vor dem Fix erzeugte das "etwa 0,1 Jahre alt wird".
    const animal = {
      id: "Q1",
      name_de: "Seidenspinner",
      category: "Insekt",
      diet: "Pflanzenfresser",
      lifespan_years: 0.1,
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toBe(
      "Seidenspinner: Ein Insekt, das ein Pflanzenfresser ist und etwa 1,2 Monate alt wird.",
    );
    expect(sentence).not.toContain("Jahre");
    expect(sentence).not.toContain("0,1");
  });

  it("Lebenserwartung von 0,5 Jahren wird als '6 Monate' (nicht '0,5 Jahre') ausgedrückt", () => {
    // Realer betroffener Datensatz aus data/animals.json (lifespan_years: 0.5,
    // z. B. Bettwanze) — glatter Monatswert, prüft die Singular/Plural-
    // Grenze (6 Monate → Plural) und dass volle Monate nicht als "6,0" formatiert werden.
    const animal = {
      id: "Q1",
      name_de: "Bettwanze",
      category: "Insekt",
      diet: "Fleischfresser",
      lifespan_years: 0.5,
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toContain("etwa 6 Monate alt wird");
    expect(sentence).not.toContain("0,5 Jahre");
  });

  it("Gefährdungsstatus wird als Prädikativ-Klausel eingebaut", () => {
    const animal = {
      id: "Q1",
      name_de: "Tiger",
      category: "Säugetier",
      conservation_status: "stark gefährdet",
    };
    const sentence = buildInfoSentence(animal, FIRST);
    expect(sentence).toBe(
      "Tiger: Ein Säugetier, das als stark gefährdet gilt.",
    );
  });
});

describe("buildInfoSentence — Zusatzfakt-Priorisierung (PM-Entscheidung: zufällig wechselnd)", () => {
  const animalWithAllExtraFacts = {
    id: "Q140",
    name_de: "Löwe",
    category: "Säugetier",
    weight_kg: 126,
    length_cm: 250,
    lifespan_years: 14,
    conservation_status: "gefährdet",
  };

  it("wählt bei mehreren befüllten Zusatzfakten genau einen aus (kein überladener Satz)", () => {
    const sentence = buildInfoSentence(animalWithAllExtraFacts, FIRST);
    const extraFactMarkers = [
      "Kilogramm wiegt",
      "Meter lang ist",
      "Jahre alt wird",
      "gilt",
    ];
    const matchCount = extraFactMarkers.filter((marker) =>
      sentence.includes(marker),
    ).length;
    expect(matchCount).toBe(1);
  });

  it("unterschiedliche rng-Werte können unterschiedliche Zusatzfakten liefern", () => {
    const first = buildInfoSentence(animalWithAllExtraFacts, FIRST);
    const last = buildInfoSentence(animalWithAllExtraFacts, LAST);
    expect(first).not.toBe(last);
  });
});

describe("buildInfoSentence — Robustheit", () => {
  it("liefert nie einen leeren String, auch für ein leeres Tier-Objekt", () => {
    expect(buildInfoSentence({}, FIRST).length).toBeGreaterThan(0);
  });

  it("nutzt Math.random als Standard-rng, wenn keine übergeben wird", () => {
    const animal = { id: "Q1", name_de: "Fuchs", category: "Säugetier" };
    expect(() => buildInfoSentence(animal)).not.toThrow();
  });
});
