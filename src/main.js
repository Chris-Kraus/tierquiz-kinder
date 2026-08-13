import "./styles/global.css";
import { renderStartScreen } from "./screens/start.js";
import { renderQuestionScreen } from "./screens/question.js";
import { renderResultScreen } from "./screens/result.js";
import { createQuizState } from "./quiz/state.js";

// App-Einstiegspunkt: verdrahtet die Navigation zwischen den Bildschirmen.
// Jeder Bildschirm rendert sich selbst vollständig in `#app` (siehe jeweilige
// render*Screen-Funktion) und meldet über einen Callback, wann der nächste
// Bildschirm dran ist – die Screens kennen einander dadurch nicht direkt.

const app = document.querySelector("#app");

function showStartScreen() {
  renderStartScreen(app, { onStart: showQuestionScreen });
}

function showQuestionScreen(quizState) {
  renderQuestionScreen(app, quizState, { onFinish: showResultScreen });
}

function showResultScreen(quizState) {
  // "Nochmal spielen" und "Zurück zum Start" führen laut design.md bewusst
  // zu zwei getrennten Pfaden (QA-Feedback zu Issue #7, siehe Issue-Kommentar):
  // "Nochmal spielen" spart der Zielgruppe die erneute Stufenwahl und startet
  // direkt eine neue Runde mit derselben, zuletzt gewählten Schwierigkeitsstufe
  // – ohne den Start-Bildschirm erneut zu zeigen. "Zurück zum Start" führt
  // weiterhin zum Start-Bildschirm mit freier Schwierigkeitswahl.
  renderResultScreen(app, quizState, {
    onPlayAgain: () => {
      // Immer ein komplett neuer quizState (createQuizState) statt den
      // abgeschlossenen quizState wiederzuverwenden bzw. zu mutieren – Score/
      // Antworten/Fragen der vorherigen Runde dürfen nicht hängen bleiben.
      // Nur die Schwierigkeitsstufe wird übernommen, die Fragenliste wird von
      // question.js beim Rendern neu generiert (siehe dort).
      showQuestionScreen(createQuizState(quizState.difficulty));
    },
    onBackToStart: showStartScreen,
  });
}

showStartScreen();
