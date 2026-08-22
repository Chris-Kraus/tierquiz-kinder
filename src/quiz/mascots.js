// Maskottchen-Datengrundlage für das Sterne-/Maskottchen-Freischaltsystem
// (Issue #80, erster Teil eines 4-Story-Vorhabens #80-#83). Reine Datenliste
// + Tint-Hilfsfunktion, keine Persistenz (siehe dafür src/quiz/progress.js).
//
// Liste (Name, Emoji, Rolle) sowie TINTS-Werte stammen 1:1 aus dem Nutzer-
// Handoff "CHANGES-sterne-maskottchen.md" (Abschnitte "Die 50 Maskottchen"
// und "Hintergrundfarben je Maskottchen") — siehe docs/workflow/requirements.md,
// "Ergänzung 21.08.2026: Sterne-/Maskottchen-Freischaltsystem", sowie
// docs/workflow/architecture.md, "Sterne-/Maskottchen-Freischaltsystem:
// Technische Leitplanken".
//
// `id` entspricht dem Index in dieser Liste (0-basiert) und ist zugleich der
// Wert, der in progress.js als `unlockedIds`-Eintrag persistiert wird —
// Reihenfolge dieser Liste darf sich deshalb nach dem ersten Release nicht
// mehr ändern (Index 0 = Fine der Fuchs = Start-Maskottchen).
//
// Emojis sind laut Handoff bewusst nur Platzhalter für spätere Comic-
// Illustrationen (siehe requirements.md, "Explizit außerhalb des Scopes") —
// nicht Teil dieser Story.

export const MASCOTS = Object.freeze(
  [
    { name: "Fine der Fuchs", emoji: "🦊", role: "rät neugierig mit" },
    { name: "Berti der Bär", emoji: "🐻", role: "tröstet bei knapp daneben" },
    { name: "Pia der Pinguin", emoji: "🐧", role: "jubelt und watschelt" },
    { name: "Otto die Eule", emoji: "🦉", role: "liest die Frage vor" },
    { name: "Frido der Frosch", emoji: "🐸", role: "hüpft bei jedem Punkt" },
    { name: "Toni der Tiger", emoji: "🐯", role: "traut sich alles zu" },
    {
      name: "Lotte das Faultier",
      emoji: "🦥",
      role: "nimmt jeden Zeitdruck raus",
    },
    {
      name: "Karla die Katze",
      emoji: "🐱",
      role: "schleicht sich an Antworten ran",
    },
    { name: "Hugo der Hund", emoji: "🐶", role: "bleibt treu an deiner Seite" },
    { name: "Emma das Erdmännchen", emoji: "🦝", role: "hält Wache und späht" },
    { name: "Pauli das Pferd", emoji: "🐴", role: "galoppiert zur nächsten Frage" },
    { name: "Kasimir der Kater", emoji: "🐈", role: "gähnt vornehm" },
    { name: "Klara das Kamel", emoji: "🐪", role: "kennt jede Wüste" },
    { name: "Elli der Elefant", emoji: "🐘", role: "vergisst nie eine Antwort" },
    { name: "Gerda die Giraffe", emoji: "🦒", role: "sieht die Lösung von oben" },
    { name: "Zita das Zebra", emoji: "🦓", role: "zählt Streifen zum Merken" },
    { name: "Leo der Löwe", emoji: "🦁", role: "brüllt bei jedem Treffer" },
    { name: "Momo der Affe", emoji: "🐵", role: "albert zwischen den Fragen" },
    { name: "Paula der Panda", emoji: "🐼", role: "bringt Bambus-Pausen" },
    { name: "Konrad der Koala", emoji: "🐨", role: "hält sich gut fest" },
    { name: "Willi der Wal", emoji: "🐳", role: "spritzt Konfetti-Wasser" },
    { name: "Delia der Delfin", emoji: "🐬", role: "klickt vor Freude" },
    { name: "Hilde der Hai", emoji: "🦈", role: "grinst mit allen Zähnen" },
    { name: "Kurt die Krabbe", emoji: "🦀", role: "läuft immer seitwärts" },
    { name: "Oktavia der Oktopus", emoji: "🐙", role: "hilft mit acht Armen" },
    { name: "Schorsch die Schildkröte", emoji: "🐢", role: "kommt sicher an" },
    { name: "Susi das Schaf", emoji: "🐑", role: "zählt sich selbst" },
    { name: "Rudi das Rind", emoji: "🐮", role: "muht Applaus" },
    { name: "Piet das Schwein", emoji: "🐷", role: "wühlt nach Tipps" },
    { name: "Helga die Henne", emoji: "🐔", role: "legt goldene Punkte" },
    { name: "Kiki das Küken", emoji: "🐣", role: "piept vor Aufregung" },
    { name: "Emil die Ente", emoji: "🦆", role: "schnattert Fun Facts" },
    { name: "Selma der Schwan", emoji: "🦢", role: "bleibt elegant" },
    { name: "Alwin der Adler", emoji: "🦅", role: "hat den Überblick" },
    { name: "Polly der Papagei", emoji: "🦜", role: "wiederholt die Frage" },
    { name: "Flori der Flamingo", emoji: "🦩", role: "steht auf einem Bein" },
    { name: "Pepe der Pfau", emoji: "🦚", role: "zeigt sein Rad bei Erfolg" },
    { name: "Hasi der Hase", emoji: "🐰", role: "hoppelt voran" },
    { name: "Igor der Igel", emoji: "🦔", role: "rollt sich bei Fehlern ein" },
    { name: "Mia die Maus", emoji: "🐭", role: "flüstert kleine Tipps" },
    { name: "Hanni der Hamster", emoji: "🐹", role: "sammelt alles ein" },
    {
      name: "Eddi das Eichhörnchen",
      emoji: "🐿️",
      role: "versteckt Belohnungen",
    },
    { name: "Wanda der Wolf", emoji: "🐺", role: "heult vor Freude" },
    { name: "Bruno der Biber", emoji: "🦫", role: "baut die Sammlung aus" },
    { name: "Nala das Nashorn", emoji: "🦏", role: "geht durch jede Frage" },
    { name: "Hanna das Hippo", emoji: "🦛", role: "macht große Sprünge" },
    { name: "Kroko der Krokodil", emoji: "🐊", role: "grinst breit" },
    { name: "Lasse das Lama", emoji: "🦙", role: "spuckt nie, versprochen" },
    { name: "Yuri der Yak", emoji: "🐂", role: "stapft durch den Schnee" },
    { name: "Flo die Fledermaus", emoji: "🦇", role: "hört jedes Geräusch" },
  ].map((mascot, id) => ({ id, ...mascot })),
);

/**
 * Sechs rotierende Hintergrundfarben für Maskottchen-Flächen (Guide auf dem
 * Start-Screen, Karussell-Bühne, Feedback-Panel, Auswahl-Kacheln) — siehe
 * Handoff, "Hintergrundfarben je Maskottchen". Feste Zuordnung über den
 * Index (Modulo), keine zufällige/änderbare Zuordnung.
 */
export const TINTS = Object.freeze([
  "#F3DFA8",
  "#9CD5F2",
  "#FBEFDC",
  "#F4E7E4",
  "#E4E7F2",
  "#DCEBE2",
]);

/**
 * Liefert die Hintergrundfarbe für ein Maskottchen anhand seiner `id`
 * (rotierend über TINTS via Modulo, siehe Handoff).
 * @param {number} id Maskottchen-ID (Index in MASCOTS)
 * @returns {string} Hex-Farbwert aus TINTS
 */
export function tintOf(id) {
  return TINTS[id % TINTS.length];
}
