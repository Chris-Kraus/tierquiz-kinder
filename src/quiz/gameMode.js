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

export const GAME_MODE = Object.freeze({
  QUIZ: "quiz",
  REVERSE: "reverse",
});
