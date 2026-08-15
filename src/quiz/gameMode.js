// Gemeinsame Modus-Konstanten für den Quiz-Zustand (Issue #28: bislang war
// GAME_MODE nur lokal in src/screens/start.js definiert, siehe dortiger
// Datei-Kommentar "state.js/main.js kennen den Modus in dieser Story bewusst
// noch nicht" — mit Issue #28 wird der Modus jetzt tatsächlich bis zum
// Ergebnis-Bildschirm durchverdrahtet, daher braucht es eine gemeinsame
// Quelle statt der bisherigen, nur lokal in start.js sichtbaren Konstante.
//
// Eigene, winzige Datei statt z. B. in state.js definiert, damit auch
// Module, die den Quiz-Zustand nicht kennen (z. B. src/main.js für die
// Bildschirm-Weiche), den Modus-Wert importieren können, ohne einen Umweg
// über state.js zu nehmen.
//
// Seit Issue #31: dritter Wert `SOUND` für den "Tiergeräusche"-Modus ergänzt
// (Name laut architecture.md, "Ergebnisliste: Modus-Feld + Lösch-Funktion",
// bewusst konsistent zur dortigen Funktionsbenennung
// `generateNextSoundQuestion` aus #32 gewählt). Der Start-Bildschirm kann den
// Modus damit bereits jetzt auswählen/an createQuizState übergeben; die
// eigentliche Bildschirm-Weiche in src/main.js (analog zur REVERSE-Weiche
// oben) folgt erst mit dem zugehörigen Frage-Bildschirm in Issue #33, siehe
// dortiger Umsetzungsstand — ganz analog dazu, wie auch REVERSE hier erst ab
// #26 auswählbar, aber erst ab #28 tatsächlich bis zum Frage-Bildschirm
// durchverdrahtet war.

export const GAME_MODE = Object.freeze({
  QUIZ: "quiz",
  REVERSE: "reverse",
  SOUND: "sound",
});
