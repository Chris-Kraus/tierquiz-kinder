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
import { createQuizState } from "./quiz/state.js";
import { GAME_MODE } from "./quiz/gameMode.js";

// App-Einstiegspunkt: verdrahtet die Navigation zwischen den Bildschirmen.
// Jeder Bildschirm rendert sich selbst vollständig in `#app` (siehe jeweilige
// render*Screen-Funktion) und meldet über einen Callback, wann der nächste
// Bildschirm dran ist – die Screens kennen einander dadurch nicht direkt.

const app = document.querySelector("#app");

function showStartScreen() {
  renderStartScreen(app, { onStart: showQuestionScreen });
}

function showQuestionScreen(quizState) {
  if (quizState.mode === GAME_MODE.REVERSE) {
    renderReverseQuestionScreen(app, quizState, {
      onFinish: showResultScreen,
    });
    return;
  }
  if (quizState.mode === GAME_MODE.SOUND) {
    renderSoundQuestionScreen(app, quizState, { onFinish: showResultScreen });
    return;
  }
  renderQuestionScreen(app, quizState, { onFinish: showResultScreen });
}

function showResultScreen(quizState) {
  // "Nochmal spielen" und "Zurück zum Start" führen laut design.md bewusst
  // zu zwei getrennten Pfaden (QA-Feedback zu Issue #7, siehe Issue-Kommentar):
  // "Nochmal spielen" spart der Zielgruppe die erneute Stufenwahl und startet
  // direkt eine neue Runde mit derselben, zuletzt gewählten Schwierigkeitsstufe
  // – ohne den Start-Bildschirm erneut zu zeigen. "Zurück zum Start" führt
  // weiterhin zum Start-Bildschirm mit freier Schwierigkeitswahl. Seit Issue
  // #13 (PM-Entscheidung 13.08.2026) gilt dasselbe für die Fragenanzahl: sie
  // wird bei "Nochmal spielen" beibehalten, analog zur Schwierigkeitsstufe.
  renderResultScreen(app, quizState, {
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
