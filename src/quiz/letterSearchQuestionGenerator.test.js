// Tests für src/quiz/letterSearchQuestionGenerator.js (Issue #46). Analoges
// Muster zu reverseQuestionGenerator.test.js: `global.fetch` wird gemockt
// (URL-Konstruktion/Antwort-Parsing selbst ist bereits in imageHint.test.js
// abgedeckt), hier wird nur der Gesamtablauf geprüft (welche Tiere gezogen
// werden, Retry-Verhalten, Fehlerfall) — bewusst KEIN Falschantworten-Test
// (dieser Modus hat keine Antwortoptionen, siehe Datei-Kommentar in
// letterSearchQuestionGenerator.js).

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  generateNextLetterSearchQuestion,
  LetterSearchImageResolutionError,
  LETTER_SEARCH_IMAGE_ALT_TEXT,
} from "./letterSearchQuestionGenerator.js";

const animals = [
  {
    id: "Q1",
    name_de: "Löwe",
    category: "Säugetier",
    image_filename: "loewe.jpg",
  },
  {
    id: "Q2",
    name_de: "Tiger",
    category: "Säugetier",
    image_filename: "tiger.jpg",
  },
  {
    id: "Q3",
    name_de: "Elefant",
    category: "Säugetier",
    image_filename: "elefant.jpg",
  },
  {
    id: "Q4",
    name_de: "Zebra",
    category: "Säugetier",
    image_filename: "zebra.jpg",
  },
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
  if (licenseShortName)
    extmetadata.LicenseShortName = { value: licenseShortName };
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

describe("generateNextLetterSearchQuestion", () => {
  it("löst mit einer fertigen Frage auf: animalName, Bild, kindgerechte Attribution, kein options-Feld", async () => {
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

    const question = await generateNextLetterSearchQuestion(
      animals,
      new Set(),
      rngZero,
    );

    expect(question.animalId).toBe("Q1");
    expect(question.animalName).toBe("Löwe");
    expect(question.image).toEqual({
      url: "https://upload.wikimedia.org/thumb/loewe-330px.jpg",
      alt: LETTER_SEARCH_IMAGE_ALT_TEXT,
    });
    expect(question.attribution).toEqual({
      text: "Foto: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    });
    expect(question.options).toBeUndefined();
  });

  it("verrät den Tiernamen nicht im Alt-Text (Barrierefreiheits-Vorgabe aus design.md)", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/loewe.jpg" })),
    );

    const question = await generateNextLetterSearchQuestion(
      animals,
      new Set(),
      rngZero,
    );

    expect(question.image.alt).not.toMatch(/Löwe/);
    expect(question.image.alt).toBe("Foto eines Tieres – errate, wie es heißt");
  });

  it("fragt die Commons-API exakt mit dem image_filename des gezogenen Zieltiers ab", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/loewe.jpg" })),
    );

    await generateNextLetterSearchQuestion(animals, new Set(), rngZero);

    const url = urlFor(fetch.mock.calls[0]);
    expect(url.searchParams.get("titles")).toBe("File:loewe.jpg");
    expect(url.searchParams.get("iiurlwidth")).toBe("330");
  });

  it("schließt bereits in der Runde verwendete Tiere (usedAnimalIds) von der Zieltier-Auswahl aus", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/tiger.jpg" })),
    );

    const question = await generateNextLetterSearchQuestion(
      animals,
      new Set(["Q1"]),
      rngZero,
    );

    expect(question.animalId).toBe("Q2"); // nächstes Tier mit Bild nach Löwe
  });

  it("ignoriert Tiere ohne image_filename bei der Zieltier-Auswahl", async () => {
    const usedAnimalIds = new Set(["Q1", "Q2", "Q3", "Q4"]);

    await expect(
      generateNextLetterSearchQuestion(animals, usedAnimalIds, rngZero),
    ).rejects.toBeInstanceOf(LetterSearchImageResolutionError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("zieht bei einem Bildauflösungs-Fehlschlag (Netzwerkfehler) ein neues Zieltier und versucht es erneut", async () => {
    fetch
      .mockRejectedValueOnce(new Error("Netzwerkfehler"))
      .mockResolvedValueOnce(
        jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/tiger.jpg" })),
      );

    const question = await generateNextLetterSearchQuestion(
      animals,
      new Set(),
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

    const question = await generateNextLetterSearchQuestion(
      animals,
      new Set(),
      rngZero,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(question.animalId).toBe("Q2");
  });

  it("lehnt nach insgesamt 4 Versuchen (1 + 3 Retries) mit LetterSearchImageResolutionError ab, wenn der Bildabruf durchgehend fehlschlägt", async () => {
    fetch.mockRejectedValue(new Error("Netzwerkfehler"));

    await expect(
      generateNextLetterSearchQuestion(animals, new Set(), rngZero),
    ).rejects.toBeInstanceOf(LetterSearchImageResolutionError);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("bricht ab und lehnt ab, sobald der Kandidatenpool erschöpft ist, ohne unnötige weitere Versuche/Fetches", async () => {
    const twoAnimals = [
      { id: "A1", name_de: "Fuchs", image_filename: "fuchs.jpg" },
      { id: "A2", name_de: "Wolf", image_filename: "wolf.jpg" },
    ];
    fetch.mockResolvedValue(jsonResponse(missingFileJson()));

    await expect(
      generateNextLetterSearchQuestion(twoAnimals, new Set(), rngZero),
    ).rejects.toBeInstanceOf(LetterSearchImageResolutionError);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("mutiert das übergebene usedAnimalIds-Set nicht selbst", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ thumbUrl: "https://x/loewe.jpg" })),
    );

    const usedAnimalIds = new Set(["Q3"]);
    await generateNextLetterSearchQuestion(animals, usedAnimalIds, rngZero);

    expect(usedAnimalIds).toEqual(new Set(["Q3"]));
  });

  it("weist zurück, wenn animals kein Array ist", async () => {
    await expect(
      generateNextLetterSearchQuestion(null, new Set(), rngZero),
    ).rejects.toThrow(/animals/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
