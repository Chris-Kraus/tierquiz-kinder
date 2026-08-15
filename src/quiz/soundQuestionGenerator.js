// Pro-Frage-Generierungsfunktion für den "Tiergeräusche"-Modus (Issue #32).
// Löst on demand (nicht batch-vorausgebaut für eine ganze Runde wie
// generateQuestions() in questionGenerator.js) ein zufälliges Zieltier samt
// Tierlaut auf und liefert eine fertige 4-Optionen-Frage.
//
// Strukturell fast identisch zu src/quiz/reverseQuestionGenerator.js (Issue
// #27, "Wer bin ich?"-Modus) — bewusst eine eigene, unabhängige Datei statt
// gemeinsamer Abstraktion (siehe architecture.md, "Tiergeräusche: Finale
// technische Leitplanken", Punkt 4: "eigene, asynchrone
// Pro-Frage-Generierungsfunktion"; die beiden Fragepfade sollen unabhängig
// voneinander weiterentwickelbar bleiben, analog zur bewussten Trennung von
// questionGenerator.js und reverseQuestionGenerator.js). Zwei echte
// Unterschiede zu #27 (siehe architecture.md, selber Abschnitt):
//
//   1. Der Zieltier-Kandidatenpool ist auf Tiere mit befülltem
//      `audio_filename` beschränkt (157/500, 31,4 % — deutlich kleiner und
//      schiefer als die 100 % `image_filename`-Abdeckung bei #27). Die
//      Distraktor-Namen (3 falsche Antwortoptionen) brauchen dagegen KEIN
//      eigenes Audio und werden bewusst aus dem VOLLEN 500er-Pool gezogen
//      (bevorzugt gleiche `category`), damit die geringere Audioabdeckung
//      nicht zusätzlich die Distraktor-Vielfalt einschränkt.
//   2. Der Commons-`imageinfo`-Aufruf verzichtet auf `iiurlwidth` (reiner
//      Bild-Thumbnail-Parameter ohne Audio-Äquivalent) und liest `url` statt
//      `thumburl` — ein `<audio>`-Element kann progressiv/gepuffert
//      abspielen, die Datei muss vor der Wiedergabe also nicht vollständig
//      heruntergeladen sein. Der Vorab-Check vor Anzeige der Frage prüft
//      daher nur die Metadaten-Auflösung (URL + Attribution), nicht den
//      vollständigen Audio-Download (siehe architecture.md, selber
//      Abschnitt, Punkt 2).
//
// Schnittstelle (analog zu generateNextReverseQuestion aus #27):
//
//   generateNextSoundQuestion(animals, usedAnimalIds, difficulty, rng)
//
// Ablauf pro Aufruf:
// 1. Zieltier-Auswahl: zufällig aus allen Tieren mit befülltem
//    `audio_filename`, abzüglich `usedAnimalIds` (gleiche Konvention wie
//    questionGenerator.js/reverseQuestionGenerator.js) sowie bereits in
//    diesem Aufruf erfolglos versuchter Tiere.
// 2. Audioauflösung: Commons-`imageinfo`-Aufruf mit `iiprop=url|extmetadata`
//    (ohne `iiurlwidth`, siehe oben) — liefert direkt die abspielbare
//    Audiodatei-URL (`info.url`, typischerweise `.ogg`) plus Attribution
//    (`extmetadata`) in einem Request.
// 3. Schlägt die Audioauflösung fehl (Netzwerkfehler, Timeout, keine
//    verwertbare Antwort), wird bis zu 3 Mal ein neues Zieltier gezogen und
//    erneut versucht (macht insgesamt maximal 4 Versuche, identisches Muster
//    zu #27). Scheitert auch der letzte Versuch, lehnt die Funktion mit
//    SoundQuestionAudioResolutionError ab — der Frage-Bildschirm (#33) zeigt
//    dann den in design.md dokumentierten freundlichen Retry-Zustand, kein
//    Rundenabbruch, kein Zurückspringen zur Modus-Auswahl.
// 4. Falschantworten: 3 weitere Tiernamen, bevorzugt aus derselben
//    `category` wie das Zieltier, aber aus dem VOLLEN 500er-Tierpool (siehe
//    Unterschied 1 oben) — dedupe nach `name_de`, Ausschluss bereits in der
//    Runde verwendeter Namen. Reichen eindeutige Kandidaten derselben
//    Kategorie nicht, wird mit Kandidaten aus anderen Kategorien aufgefüllt.
//
// Rückgabeform (siehe JSDoc unten): ein Fragenobjekt mit bereits aufgelöster
// Audio-URL und Attribution. #33 zeigt daraus den Play-Button + die
// Attributionszeile ("Ton: {Artist} · Wikimedia Commons", siehe design.md,
// Abschnitt "Frage-/Feedback-Bildschirm 'Tiergeräusche'") sowie die 4
// Namensoptionen an (bewusst NICHT Teil dieser Datei/Story — #32 liefert nur
// die Datengrundlage).
//
// Kein neues globales State-Feld in src/quiz/state.js nötig (Ton-Lade-/
// Fehlerzustand bleibt UI-lokaler Zustand des Frage-Bildschirms, siehe
// architecture.md, selber Abschnitt, Punkt 4) — identisches Prinzip wie #27.

import { COMMONS_API_ENDPOINT, REQUEST_TIMEOUT_MS } from "./imageHint.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

const WRONG_OPTION_COUNT = 3;

// Erster Versuch + bis zu 3 Retry-Versuche mit jeweils neuem Zieltier =
// maximal 4 Versuche insgesamt, bevor die Funktion ablehnt (identisches
// Muster zu #27, siehe architecture.md, "Tiergeräusche: Finale technische
// Leitplanken", Punkt 2: "identisches Muster wie Umkehr-Quiz").
const MAX_RESOLUTION_ATTEMPTS = 4;

/**
 * Wird geworfen, wenn nach MAX_RESOLUTION_ATTEMPTS Versuchen für kein
 * gezogenes Zieltier eine Audio-URL auflösbar war (Netzwerkfehler, Timeout,
 * nicht auflösbare Datei) oder der Kandidatenpool vorher erschöpft ist
 * (siehe Datei-Kommentar oben, Punkt 3). Aufrufer (Frage-Bildschirm #33)
 * behandelt das als normalen, kindgerecht abzufangenden Fehlschlag, analog
 * zu ReverseQuestionImageResolutionError aus #27.
 */
export class SoundQuestionAudioResolutionError extends Error {
  constructor() {
    super(
      "Für kein gezogenes Zieltier konnte eine Audio-URL aufgelöst werden (nach mehreren Versuchen).",
    );
    this.name = "SoundQuestionAudioResolutionError";
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Identisch zum Fisher-Yates-Shuffle in questionGenerator.js/reverseQuestionGenerator.js.
function shuffle(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom(array, rng) {
  const index = Math.min(array.length - 1, Math.floor(rng() * array.length));
  return array[index];
}

// Identisch zu dedupeAnimalsByName in questionGenerator.js/
// reverseQuestionGenerator.js — bewusst hier erneut dupliziert statt
// importiert, aus demselben Grund wie bereits in reverseQuestionGenerator.js
// begründet: kein Re-Export nur für diese eine Hilfsfunktion, um die
// unabhängigen Fragepfade nicht unnötig zu koppeln.
function dedupeAnimalsByName(animalList) {
  const seen = new Set();
  const result = [];
  for (const animal of animalList) {
    if (seen.has(animal.name_de)) continue;
    seen.add(animal.name_de);
    result.push(animal);
  }
  return result;
}

/**
 * Baut die Commons-API-URL für den imageinfo-Abruf zu einem gegebenen
 * Commons-Audio-Dateinamen (`audio_filename` aus data/animals.json, reiner
 * Text ohne "File:"-Präfix). Bewusst KEIN `iiurlwidth` (siehe Datei-Kommentar
 * oben, Unterschied 2, sowie architecture.md, "Tiergeräusche: Finale
 * technische Leitplanken", Punkt 2) — das ist ein reiner Bild-Thumbnail-
 * Parameter ohne Audio-Äquivalent; `url` liefert bereits ohne diesen
 * Parameter direkt die abspielbare Originaldatei-URL. `origin=*` aktiviert
 * CORS für den anonymen Browser-Request, identisch zu buildCommonsImageInfoUrl
 * in imageHint.js.
 * @param {string} filename Commons-Dateiname ohne "File:"-Präfix
 * @returns {string}
 */
export function buildCommonsAudioInfoUrl(filename) {
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${filename}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    format: "json",
    origin: "*",
  });
  return `${COMMONS_API_ENDPOINT}?${params.toString()}`;
}

// Identisch zur gleichnamigen Hilfsfunktion in imageHint.js — Commons liefert
// `Artist` oft als HTML-Fragment statt Klartext, für die kindgerechte
// Attributionszeile wird nur der reine Text gebraucht.
function stripHtml(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/<[^>]*>/g, "").trim();
  return text === "" ? null : text;
}

/**
 * Parst die Commons-`action=query&prop=imageinfo`-Antwort für einen
 * Audio-Abruf und liefert die für die Tiergeräusche-Frage nötigen Felder,
 * oder `null`, wenn die Datei nicht auflösbar ist (fehlende Seite, gelöschte
 * Datei, keine imageinfo, keine `url`) — beide Fälle behandelt der Aufrufer
 * gleich wie einen Netzwerkfehler: "dieses Zieltier taugt nicht, neues
 * ziehen" (siehe Datei-Kommentar oben, Punkt 3). Strukturell analog zu
 * extractImageInfo in imageHint.js, aber `url` statt `thumburl` (kein
 * Thumbnail-Konzept für Audio, siehe buildCommonsAudioInfoUrl oben).
 * @param {object} json geparste JSON-Antwort der Commons-API
 * @returns {{audioUrl: string, artist: string|null, licenseShortName: string|null, licenseUrl: string|null}|null}
 */
export function extractAudioInfo(json) {
  const pages = json && json.query && json.query.pages;
  if (!pages || typeof pages !== "object") return null;

  // `pages` ist ein Objekt, dessen Schlüssel die (zur Build-Zeit unbekannte)
  // MediaWiki-Page-ID ist — bei nicht auflösbaren Titeln liefert Commons eine
  // negative Pseudo-ID mit `missing`-Flag statt eines Fehler-HTTP-Status.
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;

  const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
  if (!info || typeof info.url !== "string" || info.url === "") {
    return null;
  }

  const extmetadata = info.extmetadata || {};
  const artist = stripHtml(extmetadata.Artist && extmetadata.Artist.value);
  const licenseShortName =
    (extmetadata.LicenseShortName && extmetadata.LicenseShortName.value) ||
    (extmetadata.UsageTerms && extmetadata.UsageTerms.value) ||
    null;
  const licenseUrl =
    (extmetadata.LicenseUrl && extmetadata.LicenseUrl.value) || null;

  return {
    audioUrl: info.url,
    artist,
    licenseShortName: licenseShortName || null,
    licenseUrl,
  };
}

/**
 * Baut die kindgerechte Attributionszeile aus den geparsten Audioinfos
 * (siehe design.md, Abschnitt "Frage-/Feedback-Bildschirm 'Tiergeräusche'":
 * "Ton: {Artist} · Wikimedia Commons", gleiches Format wie #16/#28, nur
 * "Ton" statt "Foto"). Strukturell analog zu buildAttribution in
 * imageHint.js — bewusst eigene Funktion statt Wiederverwendung, da der
 * feste Text ("Foto: ...") dort bild-spezifisch ist. Der Lizenz-Link wird
 * separat zurückgegeben, damit der Aufrufer ihn als kleinen,
 * unaufdringlichen Link ("(Lizenz)") anhängen kann.
 * @param {{artist?: string|null, licenseUrl?: string|null}} [audioInfo]
 * @returns {{text: string, licenseUrl: string|null}}
 */
export function buildSoundAttribution({ artist, licenseUrl } = {}) {
  const text = artist
    ? `Ton: ${artist} · Wikimedia Commons`
    : "Wikimedia Commons";
  return {
    text,
    licenseUrl: licenseUrl || null,
  };
}

/**
 * Löst die Audio-URL eines einzelnen Tiers über die Commons-API auf
 * (identischer Mechanismus wie die Bildauflösung in reverseQuestionGenerator.js,
 * nur mit buildCommonsAudioInfoUrl/extractAudioInfo statt der Bild-Pendants).
 * Liefert die geparsten Audioinfos, oder `null`, wenn die Datei nicht
 * auflösbar ist. Netzwerkfehler und Timeout werfen und werden vom Aufrufer
 * als Fehlschlag dieses Versuchs behandelt.
 * @param {string} filename Commons-Dateiname (animal.audio_filename)
 * @returns {Promise<{audioUrl: string, artist: string|null, licenseShortName: string|null, licenseUrl: string|null}|null>}
 */
async function resolveAnimalSound(filename) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(buildCommonsAudioInfoUrl(filename), {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return extractAudioInfo(json);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Zieht bis zu WRONG_OPTION_COUNT Falschantwort-Tiere für `animal`, bevorzugt
 * aus derselben `category` (siehe Datei-Kommentar oben, Punkt 4): dedupe nach
 * `name_de`, Ausschluss des Zieltiers selbst sowie bereits in der Runde
 * verwendeter Tiere (`usedAnimalIds`). Reichen die gleiche-Kategorie-
 * Kandidaten nicht für WRONG_OPTION_COUNT, wird mit Kandidaten aus anderen
 * Kategorien aufgefüllt. `animals` ist bewusst der VOLLE, unbeschränkte
 * Tierpool (nicht nur Tiere mit `audio_filename`, siehe Datei-Kommentar oben,
 * Unterschied 1) — Distraktoren brauchen kein eigenes Audio. Liefert `null`,
 * wenn auch danach nicht genug eindeutig benannte Kandidaten verfügbar sind.
 * @returns {object[]|null}
 */
function pickWrongAnswerAnimals({ animal, animals, usedAnimalIds, rng }) {
  const eligible = animals.filter(
    (other) =>
      other &&
      isNonEmptyString(other.id) &&
      isNonEmptyString(other.name_de) &&
      other.id !== animal.id &&
      other.name_de !== animal.name_de &&
      !usedAnimalIds.has(other.id),
  );

  const sameCategory = dedupeAnimalsByName(
    eligible.filter((other) => other.category === animal.category),
  );
  const sameCategoryNames = new Set(sameCategory.map((other) => other.name_de));
  const otherCategory = dedupeAnimalsByName(
    eligible.filter((other) => other.category !== animal.category),
  ).filter((other) => !sameCategoryNames.has(other.name_de));

  const ordered = [...shuffle(sameCategory, rng), ...shuffle(otherCategory, rng)];
  if (ordered.length < WRONG_OPTION_COUNT) return null;

  return ordered.slice(0, WRONG_OPTION_COUNT);
}

/**
 * Baut das fertige Fragenobjekt für ein Zieltier mit bereits aufgelöster
 * Audio-URL, oder `null`, wenn nicht genug eindeutig benannte
 * Falschantwort-Tiere verfügbar sind (siehe pickWrongAnswerAnimals) —
 * praktisch nur bei extrem kleinen/bereits stark verbrauchten Tierbeständen
 * relevant; der Aufrufer behandelt das wie einen Audioauflösungs-Fehlschlag
 * (neues Zieltier statt Absturz).
 */
function buildSoundQuestion({ animal, animals, usedAnimalIds, audioInfo, rng }) {
  const wrongAnimals = pickWrongAnswerAnimals({
    animal,
    animals,
    usedAnimalIds,
    rng,
  });
  if (!wrongAnimals) return null;

  const options = shuffle(
    [
      { text: animal.name_de, correct: true },
      ...wrongAnimals.map((other) => ({ text: other.name_de, correct: false })),
    ],
    rng,
  );

  return {
    id: `${animal.id}-sound-identify`,
    animalId: animal.id,
    animalName: animal.name_de,
    field: "sound_identify",
    questionType: "soundIdentify",
    // Bereits vollständig aufgelöst (siehe Datei-Kommentar oben, Punkt 2) —
    // #33 muss keinen eigenen Netzwerk-Call mehr auslösen, nur noch den
    // Play-Button mit dieser URL verdrahten.
    audio: {
      url: audioInfo.audioUrl,
    },
    attribution: buildSoundAttribution(audioInfo),
    options,
  };
}

/**
 * Erzeugt die nächste Frage des "Tiergeräusche"-Modus (Issue #32) — asynchron
 * und on demand pro Frage (nicht batch-vorausgebaut wie generateQuestions()
 * in questionGenerator.js, siehe Datei-Kommentar oben).
 *
 * @param {object[]} animals vollständige Tierliste (aus data/animals.json),
 *   analog zum ersten Parameter von generateQuestions()/
 *   generateNextReverseQuestion(). Dient sowohl als Quelle für den
 *   audio_filename-gefilterten Zieltier-Pool als auch (unfiltriert) als
 *   Quelle für die Distraktor-Namen (siehe Datei-Kommentar oben,
 *   Unterschied 1).
 * @param {Set<string>} usedAnimalIds IDs bereits als Zieltier verwendeter
 *   Tiere der laufenden Runde (Duplikat-Vermeidung, gleiche Konvention wie
 *   questionGenerator.js/reverseQuestionGenerator.js) — wird von dieser
 *   Funktion nicht mutiert, der Aufrufer trägt das zurückgelieferte
 *   `animalId` selbst nach.
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 *   (difficulty.js) — wird validiert (schnelles Scheitern bei unbekanntem
 *   Wert, analog zu generateNextReverseQuestion); beeinflusst aktuell keine
 *   weitere Logik dieser Funktion (Falschantworten-Ziehung ist hier bewusst
 *   stufenunabhängig, identisch zu #27).
 * @param {() => number} [rng] Zufallsquelle, Standard Math.random (Testbarkeit,
 *   analog zu bestehenden Mustern).
 * @returns {Promise<object>} löst mit einer fertigen Frage auf (Audio-URL +
 *   Attribution bereits aufgelöst, siehe buildSoundQuestion oben für die
 *   exakte Form); lehnt mit SoundQuestionAudioResolutionError ab, wenn nach
 *   den in #32 spezifizierten Versuchen keine Audio-URL auflösbar war.
 */
export async function generateNextSoundQuestion(
  animals,
  usedAnimalIds,
  difficulty,
  rng = Math.random,
) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(
      `generateNextSoundQuestion: unbekannte Schwierigkeitsstufe "${difficulty}"`,
    );
  }
  if (!Array.isArray(animals)) {
    throw new Error("generateNextSoundQuestion: animals muss ein Array sein");
  }

  // Zieltier-Kandidatenpool: nur Tiere mit befülltem audio_filename (siehe
  // Datei-Kommentar oben, Unterschied 1) — die Distraktor-Ziehung weiter
  // unten nutzt bewusst den vollen, unfiltrierten `animals`-Parameter statt
  // dieser Liste.
  const usableAnimals = animals.filter(
    (animal) =>
      animal &&
      isNonEmptyString(animal.id) &&
      isNonEmptyString(animal.name_de) &&
      isNonEmptyString(animal.audio_filename),
  );

  // Zieltiere, die in diesem Aufruf bereits erfolglos versucht wurden (siehe
  // Datei-Kommentar oben, Punkt 3) — verhindert, dass ein Retry dasselbe
  // bereits gescheiterte Zieltier erneut zieht.
  const triedAnimalIds = new Set();

  for (let attempt = 0; attempt < MAX_RESOLUTION_ATTEMPTS; attempt += 1) {
    const candidates = usableAnimals.filter(
      (animal) =>
        !usedAnimalIds.has(animal.id) && !triedAnimalIds.has(animal.id),
    );
    if (candidates.length === 0) break;

    const animal = pickRandom(candidates, rng);
    triedAnimalIds.add(animal.id);

    let audioInfo;
    try {
      audioInfo = await resolveAnimalSound(animal.audio_filename);
    } catch {
      continue; // Netzwerkfehler/Timeout -> neues Zieltier versuchen
    }
    if (!audioInfo) continue; // Datei nicht auflösbar -> neues Zieltier versuchen

    const question = buildSoundQuestion({
      animal,
      animals,
      usedAnimalIds,
      audioInfo,
      rng,
    });
    if (question) return question;
    // Kein gültiges Fragenobjekt bildbar (siehe buildSoundQuestion) -> wie
    // ein Auflösungs-Fehlschlag behandelt, nächster Versuch.
  }

  throw new SoundQuestionAudioResolutionError();
}
