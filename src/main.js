import "./styles/global.css";
import { renderStartScreen } from "./screens/start.js";
import { renderQuestionScreen } from "./screens/question.js";
// Issue #28: neuer Frage-Bildschirm für den "Wer bin ich?"-Modus (Umkehr-
// Quiz) — main.js ist die einzige Stelle, die beide Frage-Bildschirme kennt
// und anhand von `quizState.mode` (siehe quiz/gameMode.js) entscheidet,
// welcher gerendert wird; die Bildschirme selbst kennen einander weiterhin
// nicht direkt (gleiches Kopplungsmuster wie bisher).
import { renderReverseQuestionScreen } from "./screens/reverseQuestion.js";
import { renderResultScreen } from "./screens/result.js";
import { renderSoundQuestionScreen } from "./screens/soundQuestion.js";
// Issue #45: neuer Spielbildschirm für den "Tier-Memory"-Modus — main.js
// entscheidet anhand von quizState.mode auch hierfür, welcher Bildschirm
// gerendert wird (gleiches Kopplungsmuster wie bei REVERSE/SOUND oben).
import { renderMemoryScreen } from "./screens/memory.js";
// Issue #46: neuer Frage-Bildschirm für den "Buchstabensuche"-Modus --
// gleiches Weiche-Prinzip wie bei REVERSE/SOUND oben, main.js bleibt die
// einzige Stelle, die alle Frage-Bildschirme kennt.
import { renderLetterSearchScreen } from "./screens/letterSearch.js";
import { createQuizState } from "./quiz/state.js";
import { GAME_MODE } from "./quiz/gameMode.js";
import { renderHeader } from "./screens/header.js";

// App-Einstiegspunkt: verdrahtet die Navigation zwischen den Bildschirmen.
// Jeder Bildschirm rendert sich selbst vollständig in `#app-content` (siehe
// jeweilige render*Screen-Funktion) und meldet über einen Callback, wann der
// nächste Bildschirm dran ist – die Screens kennen einander dadurch nicht
// direkt.
//
// Seit dem Redesign (Issue #70): `#app` ist nicht mehr der direkte Ziel-
// Container der Screens, sondern hält zusätzlich eine persistente Kopfzeile
// (`#app-header`, siehe screens/header.js) neben `#app-content`. Die
// Kopfzeile kennt die einzelnen Screens nicht direkt — main.js bleibt die
// einzige Stelle, die bei jedem Bildschirm-Wechsel sowohl den Screen als
// auch die Kopfzeile neu rendert.

const app = document.querySelector("#app");
app.innerHTML = `
  <div id="app-header" class="app-header"></div>
  <div id="app-content"></div>
`;
const appHeader = document.querySelector("#app-header");
const appContent = document.querySelector("#app-content");

function showStartScreen() {
  renderHeader(appHeader, { onBackToStart: showStartScreen });
  renderStartScreen(appContent, { onStart: showQuestionScreen });
}

function showQuestionScreen(quizState) {
  renderHeader(appHeader, {
    onBackToStart: showStartScreen,
    mode: quizState.mode,
    progress:
      quizState.mode === GAME_MODE.MEMORY
        ? undefined // Tier-Memory hat keine Fragen-Fortschritts-Anzeige (siehe memory.js, eigener Paare-Fortschritt)
        : {
            currentIndex: quizState.currentIndex,
            roundLength: quizState.roundLength,
            score: quizState.score,
          },
  });

  if (quizState.mode === GAME_MODE.REVERSE) {
    renderReverseQuestionScreen(appContent, quizState, {
      onFinish: showResultScreen,
    });
    return;
  }
  if (quizState.mode === GAME_MODE.SOUND) {
    renderSoundQuestionScreen(appContent, quizState, {
      onFinish: showResultScreen,
    });
    return;
  }
  if (quizState.mode === GAME_MODE.MEMORY) {
    renderMemoryScreen(appContent, quizState, { onFinish: showResultScreen });
    return;
  }
  if (quizState.mode === GAME_MODE.LETTER_SEARCH) {
    renderLetterSearchScreen(appContent, quizState, {
      onFinish: showResultScreen,
    });
    return;
  }
  renderQuestionScreen(appContent, quizState, { onFinish: showResultScreen });
}

function showResultScreen(quizState) {
  renderHeader(appHeader, {
    onBackToStart: showStartScreen,
    mode: quizState.mode,
  });
  // "Nochmal spielen" und "Zurück zum Start" führen laut design.md bewusst
  // zu zwei getrennten Pfaden (QA-Feedback zu Issue #7, siehe Issue-Kommentar):
  // "Nochmal spielen" spart der Zielgruppe die erneute Stufenwahl und startet
  // direkt eine neue Runde mit derselben, zuletzt gewählten Schwierigkeitsstufe
  // – ohne den Start-Bildschirm erneut zu zeigen. "Zurück zum Start" führt
  // weiterhin zum Start-Bildschirm mit freier Schwierigkeitswahl. Seit Issue
  // #13 (PM-Entscheidung 13.08.2026) gilt dasselbe für die Fragenanzahl: sie
  // wird bei "Nochmal spielen" beibehalten, analog zur Schwierigkeitsstufe.
  renderResultScreen(appContent, quizState, {
    onPlayAgain: () => {
      // Immer ein komplett neuer quizState (createQuizState) statt den
      // abgeschlossenen quizState wiederzuverwenden bzw. zu mutieren – Score/
      // Antworten/Fragen der vorherigen Runde dürfen nicht hängen bleiben.
      // Schwierigkeitsstufe, Fragenanzahl UND (seit Issue #28) der Spielmodus
      // werden übernommen, die Fragenliste wird vom jeweiligen Frage-
      // Bildschirm beim Rendern neu generiert (siehe question.js bzw.
      // reverseQuestion.js) – ohne die Modus-Übernahme würde "Nochmal
      // spielen" aus einer "Wer bin ich?"-Runde überraschend in den
      // bestehenden Quizfragen-Modus zurückfallen.
      showQuestionScreen(
        createQuizState(
          quizState.difficulty,
          [],
          quizState.roundLength,
          quizState.mode,
        ),
      );
    },
    onBackToStart: showStartScreen,
  });
}

showStartScreen();
