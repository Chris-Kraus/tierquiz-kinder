// Tests für src/quiz/soundQuestionGenerator.js (Issue #32: Fragegenerierungs-
// Pfad für den Tiergeräusche-Modus).
//
// Strukturell analog zu reverseQuestionGenerator.test.js (Issue #27), mit den
// beiden Unterschieden aus dem Datei-Kommentar der getesteten Datei
// gespiegelt: (1) Zieltier-Auswahl filtert auf `audio_filename` statt
// `image_filename`, Falschantworten werden dagegen bewusst aus dem VOLLEN,
// unfiltrierten Tierpool gezogen (eigener Test dafür unten); (2) die
// Commons-URL enthält kein `iiurlwidth` und `extractAudioInfo` liest `url`
// statt `thumburl` aus der Antwort.
//
// Wie bei reverseQuestionGenerator.test.js MUSS hier der fetch()-Aufruf
// gemockt werden, da die Audioauflösung ein fester Pflichtbestandteil der
// Funktion ist (Vorab-Check vor Rückgabe der Frage), nicht optional wie bei
// der (bild-spezifischen) Bild-Rateshilfe. `global.fetch` wird daher mit
// `vi.stubGlobal` ersetzt.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  generateNextSoundQuestion,
  SoundQuestionAudioResolutionError,
  buildCommonsAudioInfoUrl,
  extractAudioInfo,
  buildSoundAttribution,
} from "./soundQuestionGenerator.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

// Kleine, frei erfundene, aber schema-konforme Fixture (analog zum lokalen
// Fixture-Muster in reverseQuestionGenerator.test.js): mehrere Vögel für die
// Kategorie-Präferenz (inkl. Tiere OHNE audio_filename, die trotzdem als
// Falschantwort taugen müssen — Kern-Unterschied zu #27, siehe
// Datei-Kommentar), eine Kategorie mit nur einem Mitglied ("Spinnentier")
// für den Auffüll-Randfall, sowie ein Tier ganz ohne audio_filename, das nie
// als Zieltier gezogen werden darf.
const animals = [
  { id: "Q1", name_de: "Rabe", category: "Vogel", audio_filename: "rabe.ogg" },
  { id: "Q2", name_de: "Adler", category: "Vogel" }, // kein audio_filename
  { id: "Q3", name_de: "Eule", category: "Vogel" }, // kein audio_filename
  { id: "Q4", name_de: "Spatz", category: "Vogel" }, // kein audio_filename
  { id: "Q5", name_de: "Löwe", category: "Säugetier" },
  { id: "Q6", name_de: "Tiger", category: "Säugetier", audio_filename: "tiger.ogg" },
  { id: "Q7", name_de: "Hai", category: "Fisch" },
  { id: "Q8", name_de: "Spinne", category: "Spinnentier", audio_filename: "spinne.ogg" },
  { id: "Q9", name_de: "Kein Ton Tier", category: "Vogel" }, // kein audio_filename
];

const rngZero = () => 0;

function buildImageInfoJson({ url, artist, licenseShortName, licenseUrl } = {}) {
  const extmetadata = {};
  if (artist) extmetadata.Artist = { value: artist };
  if (licenseShortName) extmetadata.LicenseShortName = { value: licenseShortName };
  if (licenseUrl) extmetadata.LicenseUrl = { value: licenseUrl };

  return {
    query: {
      pages: {
        1: {
          imageinfo: [{ url, extmetadata }],
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

describe("buildCommonsAudioInfoUrl", () => {
  it("baut die Commons-imageinfo-URL ohne iiurlwidth (kein Audio-Thumbnail-Äquivalent)", () => {
    const url = new URL(buildCommonsAudioInfoUrl("Corvus corax call.ogg"));
    expect(url.searchParams.get("action")).toBe("query");
    expect(url.searchParams.get("titles")).toBe("File:Corvus corax call.ogg");
    expect(url.searchParams.get("prop")).toBe("imageinfo");
    expect(url.searchParams.get("iiprop")).toBe("url|extmetadata");
    expect(url.searchParams.get("iiurlwidth")).toBeNull();
    expect(url.searchParams.get("origin")).toBe("*");
  });
});

describe("extractAudioInfo", () => {
  it("liest die abspielbare url (nicht thumburl) plus Attribution aus der Antwort", () => {
    const info = extractAudioInfo(
      buildImageInfoJson({
        url: "https://upload.wikimedia.org/rabe.ogg",
        artist: "Jane Doe",
        licenseShortName: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      }),
    );
    expect(info).toEqual({
      audioUrl: "https://upload.wikimedia.org/rabe.ogg",
      artist: "Jane Doe",
      licenseShortName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    });
  });

  it("liefert null bei fehlender Seite (missing-Flag)", () => {
    expect(extractAudioInfo(missingFileJson())).toBeNull();
  });

  it("liefert null, wenn keine url im imageinfo-Eintrag steht", () => {
    expect(
      extractAudioInfo({
        query: { pages: { 1: { imageinfo: [{ extmetadata: {} }] } } },
      }),
    ).toBeNull();
  });
});

describe("buildSoundAttribution", () => {
  it("baut 'Ton: {Artist} · Wikimedia Commons' bei vorhandenem Artist", () => {
    expect(
      buildSoundAttribution({ artist: "Jane Doe", licenseUrl: "https://x/lizenz" }),
    ).toEqual({ text: "Ton: Jane Doe · Wikimedia Commons", licenseUrl: "https://x/lizenz" });
  });

  it("fällt auf reinen 'Wikimedia Commons'-Text zurück, wenn kein Artist bekannt ist", () => {
    expect(buildSoundAttribution({})).toEqual({
      text: "Wikimedia Commons",
      licenseUrl: null,
    });
  });
});

describe("generateNextSoundQuestion", () => {
  it("löst mit einer fertigen Frage auf: Audio-URL, kindgerechte Attribution, 4 Optionen mit genau einer korrekten", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(
        buildImageInfoJson({
          url: "https://upload.wikimedia.org/rabe.ogg",
          artist: "Jane Doe",
          licenseShortName: "CC BY-SA 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        }),
      ),
    );

    const question = await generateNextSoundQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(question.animalId).toBe("Q1");
    expect(question.animalName).toBe("Rabe");
    expect(question.field).toBe("sound_identify");
    expect(question.questionType).toBe("soundIdentify");
    expect(question.audio).toEqual({ url: "https://upload.wikimedia.org/rabe.ogg" });
    expect(question.attribution).toEqual({
      text: "Ton: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    });
    expect(question.options).toHaveLength(4);
    expect(question.options.filter((o) => o.correct)).toHaveLength(1);
    expect(question.options.find((o) => o.correct).text).toBe("Rabe");
  });

  it("fragt die Commons-API exakt mit dem audio_filename des gezogenen Zieltiers ab, ohne iiurlwidth", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ url: "https://x/rabe.ogg" })),
    );

    await generateNextSoundQuestion(animals, new Set(), DIFFICULTY_LEVELS.EASY, rngZero);

    const url = urlFor(fetch.mock.calls[0]);
    expect(url.searchParams.get("titles")).toBe("File:rabe.ogg");
    expect(url.searchParams.get("iiurlwidth")).toBeNull();
  });

  it("zieht Falschantworten bevorzugt aus derselben category wie das Zieltier", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ url: "https://x/rabe.ogg" })),
    );

    const question = await generateNextSoundQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    const wrongNames = question.options.filter((o) => !o.correct).map((o) => o.text);
    expect(wrongNames).toHaveLength(3);
    for (const name of wrongNames) {
      const animal = animals.find((a) => a.name_de === name);
      expect(animal.category).toBe("Vogel");
    }
  });

  it("zieht Falschantworten auch aus Tieren OHNE audio_filename (voller 500er-Pool, nicht nur der Zieltier-Audiopool)", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ url: "https://x/rabe.ogg" })),
    );

    const question = await generateNextSoundQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    const wrongNames = question.options.filter((o) => !o.correct).map((o) => o.text);
    // Adler/Eule/Spatz/"Kein Ton Tier" sind die einzigen anderen Vögel im
    // Fixture und haben ALLE kein audio_filename -> die 3 Falschantworten
    // müssen zwangsläufig aus dieser Gruppe stammen.
    for (const name of wrongNames) {
      const animal = animals.find((a) => a.name_de === name);
      expect(animal.audio_filename).toBeUndefined();
    }
    expect(fetch).toHaveBeenCalledTimes(1); // kein zusätzlicher Audio-Abruf für Distraktoren nötig
  });

  it("füllt mit anderen Kategorien auf, wenn die Kategorie des Zieltiers zu wenige Kandidaten hat", async () => {
    // Eigenes, kleines Fixture: "Spinne" ist die einzige Kandidatin mit
    // audio_filename (also das einzig mögliche Zieltier bei rngZero), ihre
    // Kategorie "Spinnentier" hat sonst kein Mitglied im Fixture -> alle 3
    // Falschantworten müssen aus anderen Kategorien aufgefüllt werden.
    const spiderFixture = [
      { id: "S1", name_de: "Spinne", category: "Spinnentier", audio_filename: "spinne.ogg" },
      { id: "S2", name_de: "Löwe", category: "Säugetier" },
      { id: "S3", name_de: "Adler", category: "Vogel" },
      { id: "S4", name_de: "Hai", category: "Fisch" },
    ];
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ url: "https://x/spinne.ogg" })),
    );

    const question = await generateNextSoundQuestion(
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
      jsonResponse(buildImageInfoJson({ url: "https://x/tiger.ogg" })),
    );

    // Rabe (Q1) bereits verwendet -> darf weder erneut als Zieltier noch als
    // Falschantwort-Option auftauchen.
    const question = await generateNextSoundQuestion(
      animals,
      new Set(["Q1"]),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(question.animalId).toBe("Q6"); // nächstes Tier mit Ton nach Rabe
    const allNames = question.options.map((o) => o.text);
    expect(allNames).not.toContain("Rabe");
  });

  it("ignoriert Tiere ohne audio_filename bei der Zieltier-Auswahl", async () => {
    // Nur Q9 (kein audio_filename) bleibt übrig -> kein gültiges Zieltier
    // mehr, Funktion muss ablehnen statt Q9 zu wählen, OHNE fetch
    // aufzurufen.
    const usedAnimalIds = new Set(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"]);

    await expect(
      generateNextSoundQuestion(animals, usedAnimalIds, DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(SoundQuestionAudioResolutionError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("zieht bei einem Audioauflösungs-Fehlschlag (Netzwerkfehler) ein neues Zieltier und versucht es erneut", async () => {
    fetch
      .mockRejectedValueOnce(new Error("Netzwerkfehler"))
      .mockResolvedValueOnce(
        jsonResponse(buildImageInfoJson({ url: "https://x/tiger.ogg" })),
      );

    const question = await generateNextSoundQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(urlFor(fetch.mock.calls[0]).searchParams.get("titles")).toBe("File:rabe.ogg");
    expect(urlFor(fetch.mock.calls[1]).searchParams.get("titles")).toBe("File:tiger.ogg");
    expect(question.animalId).toBe("Q6");
  });

  it("zieht bei nicht auflösbarer Datei (missing-Flag) ebenfalls ein neues Zieltier", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse(missingFileJson()))
      .mockResolvedValueOnce(
        jsonResponse(buildImageInfoJson({ url: "https://x/tiger.ogg" })),
      );

    const question = await generateNextSoundQuestion(
      animals,
      new Set(),
      DIFFICULTY_LEVELS.EASY,
      rngZero,
    );

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(question.animalId).toBe("Q6");
  });

  it("lehnt nach insgesamt 4 Versuchen (1 + 3 Retries) mit SoundQuestionAudioResolutionError ab, wenn der Audioabruf durchgehend fehlschlägt", async () => {
    fetch.mockRejectedValue(new Error("Netzwerkfehler"));

    await expect(
      generateNextSoundQuestion(animals, new Set(), DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(SoundQuestionAudioResolutionError);
    // Nur 3 Tiere mit audio_filename im Fixture (Q1, Q6, Q8) -> maximal 3
    // Versuche möglich, nicht 4 (Kandidatenpool erschöpft sich vor dem
    // theoretischen Maximum).
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("lehnt ab, wenn auch nach den Versuchen nicht genug Falschantwort-Kandidaten für ein gezogenes Zieltier verfügbar sind", async () => {
    const tinyFixture = [
      { id: "T1", name_de: "Spinne", category: "Spinnentier", audio_filename: "spinne.ogg" },
      { id: "T2", name_de: "Kein Ton Tier", category: "Spinnentier" },
    ];
    fetch.mockResolvedValue(jsonResponse(buildImageInfoJson({ url: "https://x/spinne.ogg" })));

    // Nur 1 möglicher Falschantwort-Kandidat insgesamt -> reicht nicht für 3
    // Optionen.
    await expect(
      generateNextSoundQuestion(tinyFixture, new Set(), DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(SoundQuestionAudioResolutionError);
  });

  it("bricht ab und lehnt ab, sobald der Kandidatenpool erschöpft ist, ohne unnötige weitere Versuche/Fetches", async () => {
    const twoAnimals = [
      { id: "A1", name_de: "Fuchs", category: "Säugetier", audio_filename: "fuchs.ogg" },
      { id: "A2", name_de: "Wolf", category: "Säugetier", audio_filename: "wolf.ogg" },
    ];
    fetch.mockResolvedValue(jsonResponse(missingFileJson()));

    await expect(
      generateNextSoundQuestion(twoAnimals, new Set(), DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toBeInstanceOf(SoundQuestionAudioResolutionError);
    // Nur 2 Kandidaten insgesamt -> maximal 2 Versuche möglich, nicht 4.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("mutiert das übergebene usedAnimalIds-Set nicht selbst", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(buildImageInfoJson({ url: "https://x/rabe.ogg" })),
    );

    const usedAnimalIds = new Set(["Q5"]);
    await generateNextSoundQuestion(animals, usedAnimalIds, DIFFICULTY_LEVELS.EASY, rngZero);

    expect(usedAnimalIds).toEqual(new Set(["Q5"]));
  });

  it("weist bei unbekannter Schwierigkeitsstufe zurück, ohne einen Netzwerk-Call auszulösen", async () => {
    await expect(
      generateNextSoundQuestion(animals, new Set(), "unbekannt", rngZero),
    ).rejects.toThrow(/Schwierigkeitsstufe/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("weist zurück, wenn animals kein Array ist", async () => {
    await expect(
      generateNextSoundQuestion(null, new Set(), DIFFICULTY_LEVELS.EASY, rngZero),
    ).rejects.toThrow(/animals/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
