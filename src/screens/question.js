// Frage-Bildschirm: Fortschrittsanzeige, Fragetext, 4 Antwortkacheln im
// 2×2-Raster, Sofort-Feedback richtig/falsch, manueller "Weiter"-Button
// (siehe design.md, "Nutzerfluss" Punkte 2–5, "Interaktions- und
// Zustandsverhalten", "Layout-Empfehlungen", "Barrierefreiheit"; Issue #6).
//
// Erzeugt die Fragenliste selbst (per generateQuestions aus der echten
// data/animals.json), sobald quizState noch keine Fragen enthält — die
// Schwierigkeitsstufe kommt dafür aus quizState.difficulty (gesetzt am
// Start-Bildschirm, siehe src/quiz/state.js). Ruft nach der letzten Frage
// (Klick auf "Weiter") `onFinish(quizState)` auf; der Aufrufer (src/main.js)
// navigiert damit zum Ergebnis-Bildschirm (siehe src/screens/result.js,
// Issue #7) — dieser Bildschirm kennt result.js bewusst nicht direkt.

import animalsData from "../../data/animals.json";
import {
  generateQuestions,
  DEFAULT_ROUND_LENGTH,
} from "../quiz/questionGenerator.js";
import {
  recordAnswer,
  advanceToNextQuestion,
  isQuizFinished,
} from "../quiz/state.js";
// Issue #12: kurzer Infosatz zum Tier, wird nach jeder Antwort (richtig wie
// falsch) zusätzlich zum bestehenden Feedback angezeigt (siehe
// PM-Entscheidung im Issue). Reine Template-Logik aus Wikidata-Feldern, kein
// Wikipedia-Artikeltext (siehe infoSentence.js für die volle Herleitung).
import { buildInfoSentence } from "../quiz/infoSentence.js";

const OPTION_COUNT = 4;

/**
 * Rendert den Frage-Bildschirm in den übergebenen Container und steuert den
 * kompletten Ablauf einer Runde (Frage 1..N inkl. Feedback/"Weiter").
 * @param {HTMLElement} container
 * @param {object} quizState Zustand aus createQuizState (siehe state.js)
 * @param {object} [callbacks]
 * @param {(quizState: object) => void} [callbacks.onFinish] wird nach der
 *   letzten Frage aufgerufen, sobald das Kind auf "Weiter" tippt.
 */
export function renderQuestionScreen(container, quizState, { onFinish } = {}) {
  if (!Array.isArray(quizState.questions) || quizState.questions.length === 0) {
    // Seit Issue #13: Rundenlänge kommt aus der am Start-Bildschirm
    // gewählten `quizState.roundLength` statt der festen
    // DEFAULT_ROUND_LENGTH — Fallback nur für Zustände, die (z. B. in
    // Tests) ohne roundLength erzeugt wurden.
    quizState.questions = generateQuestions(animalsData.animals, {
      difficulty: quizState.difficulty,
      count: quizState.roundLength ?? DEFAULT_ROUND_LENGTH,
    });
  }

  const totalQuestions = quizState.questions.length;

  // Issue #12: Lookup fürs schnelle Auffinden des vollen Tier-Objekts zu
  // einer Frage (question.animalId) — die Frage selbst trägt nur die für
  // Issue #5 nötigen Felder (text/options/animalId/field), nicht das
  // komplette Tier-Objekt.
  const animalById = new Map(
    animalsData.animals.map((animal) => [animal.id, animal]),
  );

  container.innerHTML = `
    <section class="question-screen" aria-labelledby="question-heading">
      <p class="question-screen__progress"></p>
      <h2 id="question-heading" class="question-screen__text"></h2>

      <div
        class="answer-grid"
        role="group"
        aria-label="Antwortmöglichkeiten"
      >
        ${Array.from(
          { length: OPTION_COUNT },
          (_, i) => `
          <button type="button" class="answer-tile" data-option-index="${i}" aria-pressed="false">
            <span class="answer-tile__icon" aria-hidden="true"></span>
            <span class="answer-tile__text"></span>
          </button>
        `,
        ).join("")}
      </div>

      <p
        class="question-screen__feedback"
        role="status"
        aria-live="polite"
        hidden
      ></p>

      <p class="question-screen__info-sentence" hidden>
        <span class="question-screen__info-sentence-icon" aria-hidden="true">💡</span>
        <span class="question-screen__info-sentence-lead">Wusstest du schon?</span>
        <span class="question-screen__info-sentence-text"></span>
      </p>

      <button type="button" class="next-button" hidden>Weiter</button>
    </section>
  `;

  const progressEl = container.querySelector(".question-screen__progress");
  const headingEl = container.querySelector(".question-screen__text");
  const tileButtons = Array.from(container.querySelectorAll(".answer-tile"));
  const feedbackEl = container.querySelector(".question-screen__feedback");
  const infoSentenceEl = container.querySelector(
    ".question-screen__info-sentence",
  );
  const infoSentenceTextEl = container.querySelector(
    ".question-screen__info-sentence-text",
  );
  const nextButton = container.querySelector(".next-button");

  function resetTilesForQuestion(question) {
    tileButtons.forEach((button, i) => {
      const option = question.options[i];
      button.querySelector(".answer-tile__text").textContent = option.text;
      button.querySelector(".answer-tile__icon").textContent = "";
      button.disabled = false;
      button.setAttribute("aria-pressed", "false");
      button.classList.remove(
        "answer-tile--correct",
        "answer-tile--selected-wrong",
      );
    });
  }

  function showQuestion(index) {
    const question = quizState.questions[index];

    progressEl.textContent = `Frage ${index + 1} von ${totalQuestions}`;
    headingEl.textContent = question.text;

    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackEl.classList.remove(
      "question-screen__feedback--correct",
      "question-screen__feedback--incorrect",
    );
    infoSentenceEl.hidden = true;
    infoSentenceTextEl.textContent = "";
    nextButton.hidden = true;

    resetTilesForQuestion(question);

    // onclick statt addEventListener: pro Frage wird hier bewusst der
    // Handler der vorherigen Frage überschrieben (kein Listener-Stacking
    // über die 10 Fragen einer Runde hinweg).
    tileButtons.forEach((button) => {
      button.onclick = () => handleAnswer(button, question, index);
    });
  }

  function handleAnswer(selectedButton, question) {
    // Nach Auswahl: alle vier Kacheln kurz deaktiviert (design.md,
    // "Interaktions- und Zustandsverhalten").
    tileButtons.forEach((button) => {
      button.disabled = true;
    });

    const selectedIndex = Number(selectedButton.dataset.optionIndex);
    const selectedOption = question.options[selectedIndex];
    const correctIndex = question.options.findIndex((option) => option.correct);
    const correctButton = tileButtons[correctIndex];

    selectedButton.setAttribute("aria-pressed", "true");

    // Richtig/Falsch wird nie ausschließlich über Farbe kommuniziert,
    // sondern zusätzlich über Symbol (Icon) und Text (design.md,
    // "Barrierefreiheit", "Keine ausschließlich farbbasierte Codierung").
    if (selectedOption.correct) {
      selectedButton.classList.add("answer-tile--correct");
      selectedButton.querySelector(".answer-tile__icon").textContent = "✓";

      feedbackEl.textContent = "✓ Super gemacht! Das ist richtig!";
      feedbackEl.classList.add("question-screen__feedback--correct");
    } else {
      selectedButton.classList.add("answer-tile--selected-wrong");
      selectedButton.querySelector(".answer-tile__icon").textContent = "●";

      correctButton.classList.add("answer-tile--correct");
      correctButton.querySelector(".answer-tile__icon").textContent = "✓";

      // Bewusst kein "Falsch!"/rotes X (design.md, "Feedback richtig/falsch"):
      // neutral-freundlicher Text, richtige Antwort wird zusätzlich benannt.
      feedbackEl.textContent = `Fast! Die richtige Antwort ist: ${question.options[correctIndex].text}`;
      feedbackEl.classList.add("question-screen__feedback--incorrect");
    }

    feedbackEl.hidden = false;

    // Issue #12: Infosatz wird IMMER angezeigt, unabhängig davon, ob richtig
    // oder falsch geantwortet wurde (siehe PM-Entscheidung im Issue) — daher
    // hier bewusst außerhalb des if/else oben, direkt nach dem Feedback.
    const answeredAnimal = animalById.get(question.animalId);
    if (answeredAnimal) {
      infoSentenceTextEl.textContent = buildInfoSentence(answeredAnimal);
      infoSentenceEl.hidden = false;
    }

    recordAnswer(quizState, {
      question,
      selectedText: selectedOption.text,
      correct: selectedOption.correct,
    });

    nextButton.hidden = false;
    nextButton.focus();
  }

  nextButton.addEventListener("click", () => {
    advanceToNextQuestion(quizState);

    if (isQuizFinished(quizState)) {
      onFinish?.(quizState);
      return;
    }

    showQuestion(quizState.currentIndex);
  });

  showQuestion(quizState.currentIndex);
}
