// Bild-Rateshilfe (Issue #16, Option D′): reine, DOM- und fetch-freie
// Hilfsfunktionen für den Laufzeit-Commons-API-Call, den der Frage-
// Bildschirm (src/screens/question.js) beim Klick auf den "Bild zeigen"-
// Button auslöst. Bewusst als eigenes Modul getrennt von question.js, damit
// URL-Konstruktion und Antwort-Parsing ohne DOM-/fetch-Mocking testbar sind
// (siehe architecture.md, Abschnitt "G) Bild-Rateshilfe (Issue #16): Finale
// technische Leitplanken für Option D′").
//
// Bewusst KEIN Bild-Byte, keine Persistenz hier — reine Laufzeit-Helfer, die
// erst bei explizitem Klick des Kindes verwendet werden (data/animals.json
// enthält nur den reinen Commons-Dateinamen in `image_filename`, siehe
// scripts/fetch-animals/fetch-animals.js).

export const COMMONS_API_ENDPOINT = "https://commons.wikimedia.org/w/api.php";

// 330px-Thumbnail (Empfehlung aus der realen Performance-Messung,
// architecture.md Abschnitt F: Median 32 KB statt 1,6 MB beim Original) —
// niemals die Originaldatei anfragen.
export const THUMBNAIL_WIDTH = 330;

// Empfohlenes Timeout (architecture.md Abschnitt G: 3–4 s), damit ein
// hängender Request die Frage nicht spürbar blockiert — nach Ablauf gilt
// derselbe stille Ausblend-Pfad wie bei jedem anderen Fehlschlag.
export const REQUEST_TIMEOUT_MS = 3500;

/**
 * Baut die Commons-API-URL für den imageinfo-Abruf zu einem gegebenen
 * Commons-Dateinamen (`image_filename` aus data/animals.json, reiner Text
 * ohne "File:"-Präfix). Exakte Parameter siehe architecture.md, Abschnitt
 * "G) Bild-Rateshilfe (Issue #16): Finale technische Leitplanken für Option
 * D′" — `iiurlwidth=330` liefert `thumburl` statt der Originaldatei,
 * `origin=*` aktiviert CORS für den anonymen Browser-Request.
 * @param {string} filename Commons-Dateiname ohne "File:"-Präfix
 * @returns {string}
 */
export function buildCommonsImageInfoUrl(filename) {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${filename}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(THUMBNAIL_WIDTH),
    format: "json",
    origin: "*",
  });
  return `${COMMONS_API_ENDPOINT}?${params.toString()}`;
}

// Commons liefert manche extmetadata-Felder (v. a. `Artist`) oft als
// HTML-Fragment statt Klartext (z. B. `<a href="...">Name</a>`) — für die
// kindgerechte Attributionszeile (design.md: kein Juristen-Ton, kurzer
// Klartext) wird nur der reine Text gebraucht, daher hier strippen.
function stripHtml(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/<[^>]*>/g, "").trim();
  return text === "" ? null : text;
}

/**
 * Parst die Commons-`action=query&prop=imageinfo`-Antwort und liefert die für
 * die Bild-Rateshilfe nötigen Felder, oder `null`, wenn die Datei nicht
 * auflösbar ist (fehlende Seite, gelöschte Datei, keine imageinfo, kein
 * thumburl) — jeder dieser Fälle löst im Aufrufer denselben stillen
 * Ausblend-Pfad aus wie ein Netzwerkfehler (siehe design.md, "Bild
 * zeigen-Button (kein Bild/Fehler)").
 * @param {object} json geparste JSON-Antwort der Commons-API
 * @returns {{thumbUrl: string, artist: string|null, licenseShortName: string|null, licenseUrl: string|null}|null}
 */
export function extractImageInfo(json) {
  const pages = json && json.query && json.query.pages;
  if (!pages || typeof pages !== "object") return null;

  // `pages` ist ein Objekt, dessen Schlüssel die (zur Build-Zeit unbekannte)
  // MediaWiki-Page-ID ist — bei nicht auflösbaren Titeln liefert Commons eine
  // negative Pseudo-ID mit `missing`-Flag statt eines Fehler-HTTP-Status.
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;

  const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
  if (!info || typeof info.thumburl !== "string" || info.thumburl === "") {
    return null;
  }

  const extmetadata = info.extmetadata || {};
  const artist = stripHtml(extmetadata.Artist && extmetadata.Artist.value);
  // Fallback UsageTerms analog zur bereits genutzten Logik aus
  // measure-image-coverage.js (Issue #16, Messung der CC0/PD-Abdeckung).
  const licenseShortName =
    (extmetadata.LicenseShortName && extmetadata.LicenseShortName.value) ||
    (extmetadata.UsageTerms && extmetadata.UsageTerms.value) ||
    null;
  const licenseUrl =
    (extmetadata.LicenseUrl && extmetadata.LicenseUrl.value) || null;

  return {
    thumbUrl: info.thumburl,
    artist,
    licenseShortName: licenseShortName || null,
    licenseUrl,
  };
}

/**
 * Baut die kindgerechte Attributionszeile aus den geparsten Bildinfos (siehe
 * design.md, Abschnitt "Bild-Rateshilfe (Issue #16)": "Foto: {Artist} ·
 * Wikimedia Commons" statt juristischem Disclaimer-Ton; fehlende
 * Einzelfelder werden weggelassen statt als "unbekannt" angezeigt). Der
 * Lizenz-Link wird separat zurückgegeben, damit der Aufrufer ihn als kleinen,
 * unaufdringlichen Link ("(Lizenz)") anhängen kann, statt die volle
 * Lizenzbezeichnung im Fließtext auszuschreiben.
 * @param {{artist?: string|null, licenseUrl?: string|null}} [imageInfo]
 * @returns {{text: string, licenseUrl: string|null}}
 */
export function buildAttribution({ artist, licenseUrl } = {}) {
  const text = artist
    ? `Foto: ${artist} · Wikimedia Commons`
    : "Wikimedia Commons";
  return {
    text,
    licenseUrl: licenseUrl || null,
  };
}
