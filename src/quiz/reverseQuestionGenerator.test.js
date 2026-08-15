// Tests für src/quiz/reverseQuestionGenerator.js (Issue #27: Implementierung
// der in Issue #26 nur als Schnittstelle definierten
// `generateNextReverseQuestion`).
//
// Anders als imageHint.test.js (siehe dortiger Datei-Kommentar) MUSS hier der
// fetch()-Aufruf gemockt werden: die Bildauflösung ist in dieser Datei kein
// optionaler, vom DOM ausgelöster Schritt mehr, sondern fester Bestandteil
// der Funktion selbst (Pflicht-Vorab-Check vor Rückgabe der Frage, siehe
// Datei-Kommentar in reverseQuestionGenerator.js). `global.fetch` wird daher
// mit `vi.stubGlobal` ersetzt; die URL-Konstruktion/Antwort-Parsing-Logik
// selbst (buildCommonsImageInfoUrl/extractImageInfo) ist bereits separat in
// imageHint.test.js abgedeckt, hier wird nur der Gesamtablauf geprüft (welche
// Tiere gezogen werden, Retry-Verhalten, Falschantworten-Ziehung, Fehlerfall).

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  generateNextReverseQuestion,
  ReverseQuestionImageResolutionError,
  REVERSE_QUESTION_IMAGE_ALT_TEXT,
} from "./reverseQuestionGenerator.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

// Kleine, frei erfundene, aber schema-konforme Fixture (analog zu
// src/quiz/__fixtures__/sampleAnimals.js, hier lokal definiert, da die
// image_filename/category-Kombination gezielt auf die in dieser Datei zu
// prüfenden Fälle zugeschnitten ist: mehrere Säugetiere für die
// Kategorie-Präferenz, eine Kategorie mit nur einem Mitglied
// ("Spinnentier") für den Auffüll-Randfall, sowie ein Tier ohne
// `image_filename`, das nie als Zieltier gezogen werden darf).
const animals = [
  { id: "Q1", name_de: "Löwe", category: "Säugetier", image_filename: "loewe.jpg" },
  { id: "Q2", name_de: "Tiger", category: "Säugetier", image_filename: "tiger.jpg" },
  { id: "Q3", name_de: "Elefant", category: "Säugetier", image_filename: "elefant.jpg" },
  { id: "Q4", name_de: "Zebra", category: "Säugetier", image_filename: "zebra.jpg" },
  { id: "Q5", name_de: "Adler", category: "Vogel", image_filename: "adler.jpg" },
  { id: "Q6", name_de: "Pinguin", category: "Vogel", image_filename: "pinguin.jpg" },
  { id: "Q7", name_de: "Hai", category: "Fisch", image_filename: "hai.jpg" },
  { id: "Q8", name_de: "Spinne", category: "Spinnentier", image_filename: "spinne.jpg" },
  { id: "Q9", name_de: "Kein Bild Tier", category: "Säugetier" }, // kein image_filename
];

const rngZero = () => 0;

function buildImageInfoJson({
  thumbUrl,
  artist,
  licenseShortName,
  licenseUrl,
} = {}) {
  const extmetadata = {};
  if (artist) extmetadata.Artist = { value: artist };
  if (licenseShortName) extmetadata.LicenseShortName = { value: licenseShortName };
  if (licenseUrl) extmetadata.LicenseUrl = { value: licenseUrl };

  return {
    query: {
      pages: {
        1: {
          imageinfo: [{ thumburl: thumbUrl, extmetadata }],
        },
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

function urlFor(mockCallArgs) {
  return new URL(mockCallArgs[0]);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateNextReverseQuestion", () => {
  it("löst mit einer fertigen Frage auf: Bild, kindgerechte Attribution, 4 Optionen mit genau einer korrekten", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(
        buildImageInfoJson({
          thumbUrl: "https://upload.wikimedia.org/thumb/loewe-330px.jpg",
          artist: "Jane Doe",
          licenseShortName: "CC BY-SA 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        }),
      ),
    );

    const question = await generateNextReverseQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(question.animalId).toBe("Q1");
    expect(question.animalName).toBe("Löwe");
    expect(question.image).toEqual({
      url: "https://upload.wikimedia.org/thumb/loewe-330px.jpg",
      alt: REVERSE_QUESTION_IMAGE_ALT_TEXT,
    });
    expect(question.attribution).toEqual({
      text: "Foto: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    });
    expect(question.options).toHaveLength(4);
    expect(question.options.filter((o) => o.correct)).toHaveLength(1);
    expect(question.options.find((o) => o.correct).text).toBe("Löwe");
  });

  it("verrät den Tiernamen nicht im Alt-Text (Barrierefreiheits-Vorgabe aus design.md)", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/loewe.jpg" })),
    );

    const question = await generateNextReverseQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(question.image.alt).not.toMatch(/Löwe/);
    expect(question.image.alt).toBe(
      "Foto eines Tieres – errate, welches Tier das ist",
    );
  });

  it("fragt die Commons-API exakt mit dem image_filename des gezogenen Zieltiers ab", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/loewe.jpg" })),
    );

    await generateNextReverseQuestion(animals, new Set(), DIFFICULTY_LEVELS.EASY, rngZero);

    const url = urlFor(fetch.mock.calls[0]);
    expect(url.searchParams.get("titles")).toBe("File:loewe.jpg");
    expect(url.searchParams.get("iiurlwidth")).toBe("330");
  });

  it("zieht Falschantworten bevorzugt aus derselben category wie das Zieltier", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/loewe.jpg" })),
    );

    const question = await generateNextReverseQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    const wrongNames = question.options
      .filter((o) => !o.correct)
      .map((o) => o.text);
    // Alle anderen Säugetiere im Fixture (Tiger, Elefant, Zebra, Kein Bild
    // Tier) reichen für 3 Falschantworten -> keine andere Kategorie nötig.
    expect(wrongNames).toHaveLength(3);
    for (const name of wrongNames) {
      const animal = animals.find((a) => a.name_de === name);
      expect(animal.category).toBe("Säugetier");
    }
  });

  it("füllt mit anderen Kategorien auf, wenn die Kategorie des Zieltiers zu wenige Kandidaten hat", async () => {
    // Eigenes, kleines Fixture: "Spinne" ist die einzige Kandidatin mit
    // image_filename (also das einzig mögliche Zieltier bei rngZero), ihre
    // Kategorie "Spinnentier" hat sonst kein Mitglied im Fixture -> alle 3
    // Falschantworten müssen aus anderen Kategorien aufgefüllt werden. Die
    // übrigen drei Tiere brauchen kein image_filename (nur als
    // Falschantwort-Namen relevant).
    const spiderFixture = [
      { id: "S1", name_de: "Spinne", category: "Spinnentier", image_filename: "spinne.jpg" },
      { id: "S2", name_de: "Löwe", category: "Säugetier" },
      { id: "S3", name_de: "Adler", category: "Vogel" },
      { id: "S4", name_de: "Hai", category: "Fisch" },
    ];
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/spinne.jpg" })),
    );

    const question = await generateNextReverseQuestion(
      spiderFixture,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(question.animalId).toBe("S1");
    const wrongNames = question.options
      .filter((o) => !o.correct)
      .map((o) => o.text)
      .sort();
    expect(wrongNames).toEqual(["Adler", "Hai", "Löwe"]);
  });

  it("schließt bereits in der Runde verwendete Tiere (usedAnimalIds) von Zieltier- UND Falschantworten-Auswahl aus", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/tiger.jpg" })),
    );

    // Löwe (Q1) bereits verwendet -> darf weder erneut als Zieltier noch als
    // Falschantwort-Option auftauchen.
    const question = await generateNextReverseQuestion(
      animals,
      new Set(["Q1"]),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(question.animalId).toBe("Q2"); // nächstes Tier mit Bild nach Löwe
    const allNames = question.options.map((o) => o.text);
    expect(allNames).not.toContain("Löwe");
  });

  it("ignoriert Tiere ohne image_filename bei der Zieltier-Auswahl", async () => {
    // Nur Q9 (kein image_filename) bleibt übrig -> kein gültiges Zieltier
    // mehr, Funktion muss ablehnen statt Q9 zu wählen, OHNE fetch
    // aufzurufen.
    const usedAnimalIds = new Set(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"]);

    await expect(
      generateNextReverseQuestion(animals, usedAnimalIds, DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(ReverseQuestionImageResolutionError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("zieht bei einem Bildauflösungs-Fehlschlag (Netzwerkfehler) ein neues Zieltier und versucht es erneut", async () => {
    fetch
      .mockRejectedValueOnce(new Error("Netzwerkfehler"))
      .mockResolvedValueOnce(
        jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/tiger.jpg" })),
      );

    const question = await generateNextReverseQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(urlFor(fetch.mock.calls[0]).searchParams.get("titles")).toBe(
      "File:loewe.jpg",
    );
    expect(urlFor(fetch.mock.calls[1]).searchParams.get("titles")).toBe(
      "File:tiger.jpg",
    );
    expect(question.animalId).toBe("Q2");
  });

  it("zieht bei nicht auflösbarer Datei (missing-Flag) ebenfalls ein neues Zieltier", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse(missingFileJson()))
      .mockResolvedValueOnce(
        jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/tiger.jpg" })),
      );

    const question = await generateNextReverseQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(question.animalId).toBe("Q2");
  });

  it("lehnt nach insgesamt 4 Versuchen (1 + 3 Retries) mit ReverseQuestionImageResolutionError ab, wenn der Bildabruf durchgehend fehlschlägt", async () => {
    fetch.mockRejectedValue(new Error("Netzwerkfehler"));

    await expect(
      generateNextReverseQuestion(animals, new Set(), DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(ReverseQuestionImageResolutionError);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("lehnt ab, wenn auch nach den Versuchen nicht genug Falschantwort-Kandidaten für ein gezogenes Zieltier verfügbar sind", async () => {
    fetch.mockResolvedValue(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/spinne.jpg" })),
    );

    // Nur "Spinne" (Q8) und "Kein Bild Tier" (Q9) sind nicht in
    // usedAnimalIds -> für Q8 als Zieltier bleibt nur 1 möglicher
    // Falschantwort-Kandidat (Q9), das reicht nicht für 3 Optionen.
    const usedAnimalIds = new Set(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"]);

    await expect(
      generateNextReverseQuestion(animals, usedAnimalIds, DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(ReverseQuestionImageResolutionError);
  });

  it("bricht ab und lehnt ab, sobald der Kandidatenpool erschöpft ist, ohne unnötige weitere Versuche/Fetches", async () => {
    const twoAnimals = [
      { id: "A1", name_de: "Fuchs", category: "Säugetier", image_filename: "fuchs.jpg" },
      { id: "A2", name_de: "Wolf", category: "Säugetier", image_filename: "wolf.jpg" },
    ];
    fetch.mockResolvedValue(jsonResponse(missingFileJson()));

    await expect(
      generateNextReverseQuestion(twoAnimals, new Set(), DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(ReverseQuestionImageResolutionError);
    // Nur 2 Kandidaten insgesamt -> maximal 2 Versuche möglich, nicht 4.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("mutiert das übergebene usedAnimalIds-Set nicht selbst", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/loewe.jpg" })),
    );

    const usedAnimalIds = new Set(["Q5"]);
    await generateNextReverseQuestion(animals, usedAnimalIds, DIFFICULTY_LEVELS.EASY, rngZero);

    expect(usedAnimalIds).toEqual(new Set(["Q5"]));
  });

  it("weist bei unbekannter Schwierigkeitsstufe zurück, ohne einen Netzwerk-Call auszulösen", async () => {
    await expect(
      generateNextReverseQuestion(animals, new Set(), "unbekannt", rngZero),
    ).rejects.toThrow(/Schwierigkeitsstufe/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("weist zurück, wenn animals kein Array ist", async () => {
    await expect(
      generateNextReverseQuestion(null, new Set(), DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toThrow(/animals/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
