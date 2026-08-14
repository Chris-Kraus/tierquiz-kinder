// Tests für src/quiz/imageHint.js (Issue #16: Bild-Rateshilfe, Option D′).
// Deckt die reine Logik ab (URL-Konstruktion, Antwort-Parsing,
// Attributionstext) — der eigentliche fetch()-Aufruf lebt in
// src/screens/question.js und wird hier bewusst nicht gemockt (siehe
// architecture.md, Abschnitt G: ein einziger, simpler API-Call ohne eigene
// Retry-/Cache-Logik, die testenswert wäre).

import { describe, it, expect } from "vitest";
import {
  buildCommonsImageInfoUrl,
  extractImageInfo,
  buildAttribution,
  COMMONS_API_ENDPOINT,
  THUMBNAIL_WIDTH,
} from "./imageHint.js";

describe("buildCommonsImageInfoUrl", () => {
  it("baut die exakte URL/Parameter-Kombination aus architecture.md Abschnitt G", () => {
    const url = buildCommonsImageInfoUrl("Panthera leo cub.jpg");
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(COMMONS_API_ENDPOINT);
    expect(parsed.searchParams.get("action")).toBe("query");
    expect(parsed.searchParams.get("titles")).toBe("File:Panthera leo cub.jpg");
    expect(parsed.searchParams.get("prop")).toBe("imageinfo");
    expect(parsed.searchParams.get("iiprop")).toBe("url|extmetadata");
    expect(parsed.searchParams.get("iiurlwidth")).toBe(String(THUMBNAIL_WIDTH));
    expect(parsed.searchParams.get("format")).toBe("json");
    expect(parsed.searchParams.get("origin")).toBe("*");
  });

  it("kodiert Sonderzeichen im Dateinamen korrekt", () => {
    const url = buildCommonsImageInfoUrl("Größer Panda (Ailuropoda).jpg");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("titles")).toBe(
      "File:Größer Panda (Ailuropoda).jpg",
    );
  });

  it("fragt niemals die Originaldatei an (iiurlwidth immer gesetzt)", () => {
    const url = buildCommonsImageInfoUrl("x.jpg");
    expect(new URL(url).searchParams.has("iiurlwidth")).toBe(true);
  });
});

describe("extractImageInfo", () => {
  it("liefert thumbUrl/artist/licenseShortName/licenseUrl bei vollständiger Antwort", () => {
    const json = {
      query: {
        pages: {
          123: {
            imageinfo: [
              {
                thumburl: "https://upload.wikimedia.org/thumb/lion-330px.jpg",
                extmetadata: {
                  Artist: { value: '<a href="https://example.org">Jane Doe</a>' },
                  LicenseShortName: { value: "CC BY-SA 4.0" },
                  LicenseUrl: {
                    value: "https://creativecommons.org/licenses/by-sa/4.0",
                  },
                },
              },
            ],
          },
        },
      },
    };

    expect(extractImageInfo(json)).toEqual({
      thumbUrl: "https://upload.wikimedia.org/thumb/lion-330px.jpg",
      artist: "Jane Doe",
      licenseShortName: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    });
  });

  it("nutzt UsageTerms als Fallback, wenn LicenseShortName fehlt", () => {
    const json = {
      query: {
        pages: {
          1: {
            imageinfo: [
              {
                thumburl: "https://upload.wikimedia.org/thumb/x-330px.jpg",
                extmetadata: {
                  UsageTerms: { value: "Public domain" },
                },
              },
            ],
          },
        },
      },
    };

    expect(extractImageInfo(json)?.licenseShortName).toBe("Public domain");
  });

  it("liefert artist/licenseUrl als null, wenn extmetadata fehlt (kein Absturz)", () => {
    const json = {
      query: {
        pages: {
          1: {
            imageinfo: [{ thumburl: "https://upload.wikimedia.org/thumb/x-330px.jpg" }],
          },
        },
      },
    };

    expect(extractImageInfo(json)).toEqual({
      thumbUrl: "https://upload.wikimedia.org/thumb/x-330px.jpg",
      artist: null,
      licenseShortName: null,
      licenseUrl: null,
    });
  });

  it("liefert null bei fehlender Datei (missing-Flag in der Commons-Antwort)", () => {
    const json = {
      query: {
        pages: {
          "-1": { missing: "", title: "File:Does not exist.jpg" },
        },
      },
    };

    expect(extractImageInfo(json)).toBeNull();
  });

  it("liefert null, wenn imageinfo fehlt oder leer ist", () => {
    expect(
      extractImageInfo({ query: { pages: { 1: {} } } }),
    ).toBeNull();
    expect(
      extractImageInfo({ query: { pages: { 1: { imageinfo: [] } } } }),
    ).toBeNull();
  });

  it("liefert null, wenn thumburl fehlt", () => {
    const json = {
      query: { pages: { 1: { imageinfo: [{ extmetadata: {} }] } } },
    };
    expect(extractImageInfo(json)).toBeNull();
  });

  it("liefert null bei komplett kaputter/leerer Antwort statt zu werfen", () => {
    expect(extractImageInfo(null)).toBeNull();
    expect(extractImageInfo({})).toBeNull();
    expect(extractImageInfo({ query: {} })).toBeNull();
    expect(extractImageInfo({ query: { pages: {} } })).toBeNull();
    expect(() => extractImageInfo(undefined)).not.toThrow();
  });
});

describe("buildAttribution", () => {
  it("baut den kindgerechten Text mit Artist", () => {
    expect(
      buildAttribution({ artist: "Jane Doe", licenseUrl: "https://x.org" }),
    ).toEqual({
      text: "Foto: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://x.org",
    });
  });

  it("lässt fehlenden Artist weg statt 'unbekannt' anzuzeigen", () => {
    expect(buildAttribution({ artist: null, licenseUrl: null })).toEqual({
      text: "Wikimedia Commons",
      licenseUrl: null,
    });
  });

  it("funktioniert auch ganz ohne Argument", () => {
    expect(buildAttribution()).toEqual({
      text: "Wikimedia Commons",
      licenseUrl: null,
    });
  });
});
