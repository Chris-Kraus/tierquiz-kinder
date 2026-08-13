// Ergebnis-/Abschluss-Bildschirm: Punktestand, "Nochmal spielen" / "Zurück zum
// Start" (siehe design.md, "Nutzerfluss" Punkt 6 "Ergebnis-/Abschluss-
// Bildschirm"; Issue #7).
//
// Zeigt die erreichte Punktzahl plus einen durchweg ermutigenden Satz –
// unabhängig vom Ergebnis, auch bei 0 von N richtigen Antworten gibt es kein
// Scheitern-Framing (design.md: "kein Scheitern-Framing selbst bei niedriger
// Punktzahl"). Die beiden Folgeaktionen kennen den Start-Bildschirm bewusst
// nicht direkt, sondern melden sich nur über Callbacks beim Aufrufer
// (src/main.js) – analog zum bisherigen Kopplungsmuster von start.js/
// question.js.

/**
 * Wählt einen durchweg wertschätzenden Ermutigungssatz passend zur Quote der
 * richtigen Antworten. Bewusst keine Formulierung, die eine niedrige Quote
 * als "schlecht" framt (design.md, "Ergebnis-/Abschluss-Bildschirm").
 * @param {number} score
 * @param {number} total
 * @returns {string}
 */
function getEncouragement(score, total) {
  const ratio = total > 0 ? score / total : 0;

  if (ratio === 1) {
    return "Alle Fragen richtig – du kennst dich super mit Tieren aus!";
  }
  if (ratio >= 0.7) {
    return "Super gemacht! Du kennst dich schon richtig gut mit Tieren aus!";
  }
  if (ratio >= 0.4) {
    return "Toll gemacht! Du wirst immer besser!";
  }
  return "Klasse, dass du mitgemacht hast! Übung macht den Tier-Meister!";
}

/**
 * Rendert den Ergebnis-Bildschirm in den übergebenen Container.
 * @param {HTMLElement} container
 * @param {object} quizState Quiz-Zustand aus createQuizState nach Rundenende
 *   (siehe src/quiz/state.js) – erwartet `score` und `questions`.
 * @param {object} [callbacks]
 * @param {() => void} [callbacks.onPlayAgain] wird bei Klick auf "Nochmal
 *   spielen" aufgerufen; der Aufrufer ist dafür zuständig, eine neue Runde
 *   (neuer Zustand, neue Fragen) zu starten.
 * @param {() => void} [callbacks.onBackToStart] wird bei Klick auf "Zurück
 *   zum Start" aufgerufen; führt ebenfalls zum Start-Bildschirm zurück.
 */
export function renderResultScreen(
  container,
  quizState,
  { onPlayAgain, onBackToStart } = {},
) {
  const score = quizState.score;
  const total = quizState.questions.length;
  const encouragement = getEncouragement(score, total);

  container.innerHTML = `
    <section class="result-screen" aria-labelledby="result-title">
      <p class="result-screen__mascot" aria-hidden="true">🎉</p>
      <h2 id="result-title" class="result-screen__title">Runde geschafft!</h2>
      <p class="result-screen__score">
        Du hast ${score} von ${total} Fragen richtig beantwortet!
      </p>
      <p class="result-screen__encouragement">${encouragement}</p>

      <div class="result-screen__actions">
        <button type="button" class="result-screen__play-again">
          Nochmal spielen
        </button>
        <button type="button" class="result-screen__back-to-start">
          Zurück zum Start
        </button>
      </div>
    </section>
  `;

  const playAgainButton = container.querySelector(
    ".result-screen__play-again",
  );
  const backToStartButton = container.querySelector(
    ".result-screen__back-to-start",
  );

  playAgainButton.addEventListener("click", () => {
    onPlayAgain?.();
  });

  backToStartButton.addEventListener("click", () => {
    onBackToStart?.();
  });

  playAgainButton.focus();
}
