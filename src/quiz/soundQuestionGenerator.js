// Schnittstellen-Platzhalter für die Tiergeräusche-Fragegenerierung (Issue
// #31). Analog zum Vorgehen bei generateNextReverseQuestion (#26
// referenzierte die Funktion bereits als klar benannte, noch nicht
// implementierte Schnittstelle, bevor #27 sie ausgefüllt hat — siehe
// docs/workflow/architecture.md, Abschnitt "1. Umkehr-Quiz" ->
// "Finale technische Leitplanken"): src/screens/start.js braucht für den
// "Testabruf" beim Antippen der neuen "Tiergeräusche"-Kachel bereits jetzt
// einen konkreten, aufrufbaren Funktionsnamen mit der finalen Signatur,
// obwohl die eigentliche Audio-Auflösung (Wikimedia-Commons-Metadaten,
// Zieltier-/Distraktor-Pool-Logik) erst in Issue #32 entsteht.
//
// Finale Signatur bereits mit `software-architect` abgestimmt (siehe
// architecture.md, Abschnitt "Tiergeräusche: Finale technische
// Leitplanken", Punkt 4 "Struktur/State — identisch zu #27"):
//
//   generateNextSoundQuestion(animals, usedAnimalIds, difficulty, rng)
//
// Wichtig: Issue #32 (Fragegenerierungs-Logik) und #33 (Frage-/
// Feedback-Bildschirm) entstehen auf dem separaten Branch
// `feature/tiergeraeusche` und sind NICHT Teil dieser Story (#31, siehe
// dortiger Issue-Text, "Wichtiger Hinweis: Branch-Strategie"). Diese Datei
// liefert daher bewusst nur die Schnittstelle, keine Implementierung: jeder
// Aufruf lehnt ab (rejected Promise), egal ob Internetverbindung besteht
// oder nicht. src/screens/start.js fängt das wie jeden anderen
// Auflösungsfehler ab (freundlicher Hinweis, Auswahl bleibt bei
// "Quizfragen", siehe dortiger Datei-Kommentar) — auf diesem Branch ist das
// korrektes Verhalten, der Modus ist hier noch nicht spielbar. Sobald die
// echte Implementierung aus #32 nach `main` gemerged wird, ersetzt sie diese
// Platzhalter-Datei unter demselben Pfad/Namen vollständig, ohne dass
// start.js angepasst werden muss.

/**
 * Platzhalter für die künftige Pro-Frage-Generierungsfunktion des
 * "Tiergeräusche"-Modus (siehe Datei-Kommentar oben). Lehnt aktuell jeden
 * Aufruf ab, bis Issue #32 diese Datei durch die echte Implementierung
 * ersetzt.
 * @param {object[]} _animals vollständige Tierliste (animalsData.animals)
 * @param {Set<string>} _usedAnimalIds in dieser Runde bereits verwendete Tier-IDs
 * @param {string} _difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @param {() => number} [_rng] optionale Zufallsquelle (Standard Math.random)
 * @returns {Promise<object>} niemals erfüllt in dieser Platzhalter-Version
 */
export async function generateNextSoundQuestion(
  // eslint-disable-next-line no-unused-vars
  _animals,
  // eslint-disable-next-line no-unused-vars
  _usedAnimalIds,
  // eslint-disable-next-line no-unused-vars
  _difficulty,
  // eslint-disable-next-line no-unused-vars
  _rng,
) {
  throw new Error(
    "generateNextSoundQuestion ist noch nicht implementiert (folgt in Issue #32 auf feature/tiergeraeusche).",
  );
}
