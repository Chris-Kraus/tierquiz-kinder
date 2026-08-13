// Laufender Quiz-Zustand: aktuelle Frage, Punktestand, gewählte Schwierigkeitsstufe
// (siehe architecture.md, Abschnitt "Projektstruktur"). Reiner In-Memory-Zustand,
// keine Persistenz über Sitzungen hinweg (siehe requirements.md, "Ergebnis-
// Persistenz").
//
// Seit Issue #4 hält der Zustand die gewählte Schwierigkeitsstufe, die am
// Start-Bildschirm gesetzt wird. Seit Issue #6 (Frage-Bildschirm) kommen die
// generierte Fragenliste, der laufende Index sowie Punktestand/Antworten-
// Historie dazu — `questions` wird bewusst leer erzeugt und erst von
// src/screens/question.js befüllt (dort lebt der `generateQuestions()`-Aufruf,
// siehe questionGenerator.js), damit state.js weiterhin unabhängig von
// data/animals.json bleibt.

import { DIFFICULTY_LEVELS } from "./difficulty.js";

/**
 * Erzeugt den initialen Quiz-Zustand nach Auswahl einer Schwierigkeitsstufe
 * am Start-Bildschirm. `questions` ist zu diesem Zeitpunkt normalerweise noch
 * leer und wird von src/screens/question.js beim ersten Rendern befüllt.
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @param {object[]} [questions] optional vorab generierte Fragenliste (v. a. für Tests)
 */
export function createQuizState(difficulty, questions = []) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(
      `createQuizState: unbekannte Schwierigkeitsstufe "${difficulty}"`,
    );
  }

  return {
    difficulty,
    questions,
    currentIndex: 0,
    score: 0,
    // Antworten-Historie, eine Eintrag je beantworteter Frage (siehe
    // recordAnswer) — Basis für den Ergebnis-Bildschirm (Issue #7).
    answers: [],
  };
}

/**
 * Trägt die Antwort auf die aktuelle Frage in den Zustand ein: erhöht bei
 * richtiger Antwort den Punktestand und hängt einen Eintrag an die
 * Antworten-Historie an. Mutiert `state` bewusst (einfacher, DOM-naher
 * Zustand, kein Redux-artiges Immutability-Muster nötig für diesen Umfang).
 * @param {object} state Quiz-Zustand aus createQuizState
 * @param {object} params
 * @param {object} params.question die beantwortete Frage (aus questions)
 * @param {string} params.selectedText Anzeigetext der gewählten Option
 * @param {boolean} params.correct ob die gewählte Option korrekt war
 */
export function recordAnswer(state, { question, selectedText, correct }) {
  state.answers.push({
    questionId: question.id,
    selectedText,
    correct,
  });
  if (correct) {
    state.score += 1;
  }
  return state;
}

/**
 * Rückt den Zustand zur nächsten Frage vor (nach Klick auf "Weiter").
 * @param {object} state Quiz-Zustand aus createQuizState
 */
export function advanceToNextQuestion(state) {
  state.currentIndex += 1;
  return state;
}

/**
 * Ob alle Fragen der Runde beantwortet sind (currentIndex zeigt hinter das
 * letzte Element von `questions`).
 * @param {object} state Quiz-Zustand aus createQuizState
 * @returns {boolean}
 */
export function isQuizFinished(state) {
  return state.currentIndex >= state.questions.length;
}
