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
//
// Seit Issue #14: Beim Rendern wird das Rundenergebnis zusätzlich lokal in
// `localStorage` protokolliert (siehe src/quiz/history.js) und optional als
// eingeklappte Verlaufsliste unterhalb der beiden Folgeaktionen angeboten
// (Abstimmung mit `ux-design`: dezenter, standardmäßig eingeklappter Bereich,
// nie automatisch eingeblendet, keine wertende Rangfolgen-Optik). Nutzt dafür
// natives `<details>/<summary>` statt eigener Toggle-/ARIA-Logik – das ist
// von Haus aus per Tastatur bedienbar (Akzeptanzkriterium Issue #14) und
// braucht keinen zusätzlichen Event-Wire-up für den Auf-/Zuklapp-Zustand.
// Ist `localStorage` nicht verfügbar/blockiert, liefert history.js ein leeres
// Ergebnis und der gesamte Bereich wird einfach nicht gerendert (kein
// Absturz, keine technische Fehlermeldung im Kind-UI).

import { saveResultToHistory } from "../quiz/history.js";
import { DIFFICULTY_LABELS } from "../quiz/difficulty.js";

/**
 * Formatiert einen ISO-Datums-String für die Verlaufsliste, z. B.
 * "13.08.2026, 14:32 Uhr". Liefert einen leeren String bei ungültigem Datum,
 * statt zu werfen (fehlertolerant, analog zu history.js).
 * @param {string} isoDate
 * @returns {string}
 */
function formatHistoryDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const datePart = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}, ${timePart} Uhr`;
}

/**
 * Rendert das Markup für die eingeklappte Verlaufsliste (Issue #14), oder
 * einen leeren String, wenn keine Historie vorliegt (z. B. `localStorage`
 * blockiert) – dann wird der ganze Bereich nicht angeboten.
 * @param {{date: string, score: number, total: number, difficulty: string}[]} history
 *   neueste zuerst (siehe src/quiz/history.js)
 * @returns {string}
 */
function renderHistorySection(history) {
  if (!history || history.length === 0) return "";

  const items = history
    .map((entry, index) => {
      const isCurrent = index === 0;
      const difficultyLabel = DIFFICULTY_LABELS[entry.difficulty] ?? entry.difficulty;
      return `
        <li class="result-history__item${
          isCurrent ? " result-history__item--current" : ""
        }">
          ${
            isCurrent
              ? '<span class="result-history__current-badge">Diese Runde</span>'
              : ""
          }
          <span class="result-history__result">${entry.score} von ${entry.total} richtig</span>
          <span class="result-history__meta">${difficultyLabel} · ${formatHistoryDate(entry.date)}</span>
        </li>
      `;
    })
    .join("");

  return `
    <details class="result-history">
      <summary class="result-history__toggle">Meine bisherigen Ergebnisse ansehen</summary>
      <p class="result-history__intro">Deine letzten ${history.length} Runden:</p>
      <ul class="result-history__list">
        ${items}
      </ul>
    </details>
  `;
}

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

  // Rundenergebnis lokal protokollieren (Issue #14) – fehlertolerant: bei
  // blockiertem/fehlendem localStorage liefert saveResultToHistory `null`
  // und renderHistorySection blendet den Bereich dann einfach aus.
  const history = saveResultToHistory({
    score,
    total,
    difficulty: quizState.difficulty,
  });

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

      ${renderHistorySection(history)}
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
