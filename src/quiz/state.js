// Laufender Quiz-Zustand: aktuelle Frage, Punktestand, gewählte Schwierigkeitsstufe
// (siehe architecture.md, Abschnitt "Projektstruktur"). Reiner In-Memory-Zustand,
// keine Persistenz über Sitzungen hinweg (siehe requirements.md, "Ergebnis-
// Persistenz").
//
// Aktuell (Issue #4) hält der Zustand nur die gewählte Schwierigkeitsstufe, die am
// Start-Bildschirm gesetzt wird. Felder für die laufende Frage/den Punktestand
// kommen mit dem Frage-Bildschirm (Issue #6) dazu, sobald deren Form feststeht.

import { DIFFICULTY_LEVELS } from "./difficulty.js";

export function createQuizState(difficulty) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(
      `createQuizState: unbekannte Schwierigkeitsstufe "${difficulty}"`,
    );
  }

  return {
    difficulty,
  };
}
