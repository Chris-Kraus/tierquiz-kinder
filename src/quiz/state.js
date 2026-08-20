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
// data/animals.json bleibt. Seit Issue #13 hält der Zustand zusätzlich die am
// Start-Bildschirm gewählte Fragenanzahl (`roundLength`) — src/screens/
// question.js nutzt sie statt der festen DEFAULT_ROUND_LENGTH beim Erzeugen
// der Fragenliste.
//
// Seit Issue #28 hält der Zustand zusätzlich den gewählten Spielmodus
// (`mode`, siehe quiz/gameMode.js) — src/main.js nutzt ihn, um zwischen dem
// bestehenden Frage-Bildschirm (src/screens/question.js) und dem neuen
// "Wer bin ich?"-Bildschirm (src/screens/reverseQuestion.js) zu wählen.
// `questions` bleibt für den Umkehr-Quiz-Modus ebenfalls leer erzeugt und wird
// dort aber ANDERS befüllt als im bestehenden Modus: nicht als kompletter
// Batch vor der ersten Frage, sondern Frage für Frage on demand (siehe
// reverseQuestion.js, Datei-Kommentar) — für `isQuizFinished` unten macht das
// keinen Unterschied, solange `questions` am Ende genauso viele Einträge wie
// `roundLength` enthält.

import { DIFFICULTY_LEVELS } from "./difficulty.js";
import { DEFAULT_ROUND_LENGTH } from "./questionGenerator.js";
import { GAME_MODE } from "./gameMode.js";

/**
 * Erzeugt den initialen Quiz-Zustand nach Auswahl einer Schwierigkeitsstufe
 * (und optional Fragenanzahl/Modus) am Start-Bildschirm. `questions` ist zu
 * diesem Zeitpunkt normalerweise noch leer und wird vom jeweiligen
 * Frage-Bildschirm (question.js bzw. seit Issue #28 reverseQuestion.js) beim
 * ersten Rendern befüllt.
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS
 * @param {object[]} [questions] optional vorab generierte Fragenliste (v. a. für Tests)
 * @param {number} [roundLength] gewünschte Rundenlänge (Anzahl Fragen), Standard DEFAULT_ROUND_LENGTH
 * @param {string} [mode] einer der Werte aus GAME_MODE (quiz/gameMode.js), Standard GAME_MODE.QUIZ
 */
export function createQuizState(
  difficulty,
  questions = [],
  roundLength = DEFAULT_ROUND_LENGTH,
  mode = GAME_MODE.QUIZ,
) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(
      `createQuizState: unbekannte Schwierigkeitsstufe "${difficulty}"`,
    );
  }
  if (!Object.values(GAME_MODE).includes(mode)) {
    throw new Error(`createQuizState: unbekannter Spielmodus "${mode}"`);
  }

  return {
    difficulty,
    roundLength,
    mode,
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
 *
 * Seit Issue #52 (Buchstabensuche, "Lösung zeigen") zusätzlich: optionaler
 * Parameter `resolved`, der vermerkt, ob die Antwort über den "Lösung
 * zeigen"-Button aufgelöst statt eigenständig gelöst wurde. Keine separate
 * Zählvariable — die Anzahl aufgelöster Fragen pro Runde wird bei Bedarf aus
 * `state.answers.filter(a => a.resolved).length` abgeleitet (Single Source
 * of Truth, wie bereits bei `score`).
 * @param {object} state Quiz-Zustand aus createQuizState
 * @param {object} params
 * @param {object} params.question die beantwortete Frage (aus questions)
 * @param {string} params.selectedText Anzeigetext der gewählten Option
 * @param {boolean} params.correct ob die gewählte Option korrekt war
 * @param {boolean} [params.resolved] ob die Antwort per "Lösung
 *   zeigen"-Button aufgelöst wurde (Issue #52), Standard `false`
 */
export function recordAnswer(
  state,
  { question, selectedText, correct, resolved = false },
) {
  state.answers.push({
    questionId: question.id,
    selectedText,
    correct,
    resolved,
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
