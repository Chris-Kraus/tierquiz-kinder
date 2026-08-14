// Frage-Bildschirm: Fortschrittsanzeige, Fragetext, Antwortkacheln im
// 2×2-Raster (4 Optionen) bzw. 1×2-Raster (2 Optionen, Verwechslungspaare-
// Fragetyp aus Issue #21), Sofort-Feedback richtig/falsch, manueller
// "Weiter"-Button (siehe design.md, "Nutzerfluss" Punkte 2–5, "Interaktions-
// und Zustandsverhalten", "Layout-Empfehlungen", "Verwechslungspaare-
// Fragetyp", "Barrierefreiheit"; Issue #6, #21).
//
// Erzeugt die Fragenliste selbst (per generateQuestions aus der echten
// data/animals.json), sobald quizState noch keine Fragen enthält — die
// Schwierigkeitsstufe kommt dafür aus quizState.difficulty (gesetzt am
// Start-Bildschirm, siehe src/quiz/state.js). Ruft nach der letzten Frage
// (Klick auf "Weiter") `onFinish(quizState)` auf; der Aufrufer (src/main.js)
// navigiert damit zum Ergebnis-Bildschirm (siehe src/screens/result.js,
// Issue #7) — dieser Bildschirm kennt result.js bewusst nicht direkt.

import animalsData from "../../data/animals.json";
// Issue #21: kuratierte Verwechslungspaare (Verwechslungspaare-Fragetyp), vgl.
// data/animals.json oben — auch hier bekommt questionGenerator.js die Liste
// nur als Parameter, kein eigener Import dort (siehe Datei-Kommentar in
// questionGenerator.js).
import confusionPairsData from "../../data/confusionPairs.json";
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
      confusionPairs: confusionPairsData,
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
      ></div>

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

      <p class="question-screen__wikipedia-link" hidden>
        <a
          class="question-screen__wikipedia-link-anchor"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span aria-hidden="true">📖</span>
          <span class="question-screen__wikipedia-link-text"></span>
        </a>
      </p>

      <button type="button" class="next-button" hidden>Weiter</button>
    </section>
  `;

  const progressEl = container.querySelector(".question-screen__progress");
  const headingEl = container.querySelector(".question-screen__text");
  const answerGridEl = container.querySelector(".answer-grid");
  // Anders als bei den übrigen Elementen unten (einmalig referenziert, Inhalt
  // wird pro Frage nur befüllt) müssen die Antwortkacheln pro Frage komplett
  // neu aufgebaut werden: die Optionsanzahl variiert (4 bei den bestehenden
  // Fragetypen, 2 beim Verwechslungspaare-Fragetyp aus Issue #21), siehe
  // `renderAnswerTiles` unten. `tileButtons` wird deshalb bewusst mit `let`
  // pro Frage neu zugewiesen statt einmalig mit `const` aus dem initialen
  // Markup gelesen.
  let tileButtons = [];
  const feedbackEl = container.querySelector(".question-screen__feedback");
  const infoSentenceEl = container.querySelector(
    ".question-screen__info-sentence",
  );
  const infoSentenceTextEl = container.querySelector(
    ".question-screen__info-sentence-text",
  );
  // Issue #15: Link zur deutschen Wikipedia-Seite des Tieres, nur sichtbar,
  // wenn animal.wikipedia_url_de vorhanden ist (nicht jedes Tier hat einen
  // deutschen Wikipedia-Artikel, siehe architecture.md).
  const wikipediaLinkEl = container.querySelector(
    ".question-screen__wikipedia-link",
  );
  const wikipediaLinkAnchorEl = container.querySelector(
    ".question-screen__wikipedia-link-anchor",
  );
  const wikipediaLinkTextEl = container.querySelector(
    ".question-screen__wikipedia-link-text",
  );
  const nextButton = container.querySelector(".next-button");

  // Baut die Antwortkacheln für `question` komplett neu auf (statt nur
  // bestehende Kacheln zurückzusetzen), da die Optionsanzahl pro Frage
  // variiert (design.md, "Verwechslungspaare-Fragetyp"). Gleiche Kachel-
  // Optik/-Größe wie bisher (siehe global.css, `.answer-tile`) — bei genau 2
  // Optionen bekommt das Raster zusätzlich die Modifier-Klasse
  // `answer-grid--pair` für das schmalere, mittige 1×2-Layout statt des
  // vollbreiten 2×2-Rasters.
  function renderAnswerTiles(question) {
    answerGridEl.classList.toggle(
      "answer-grid--pair",
      question.options.length === 2,
    );
    // Kachel-Markup bewusst ohne den Options-Text darin (Platzhalter-Span
    // bleibt leer) — der Text wird direkt im Anschluss per `textContent`
    // gesetzt statt hier in die Template-Strings interpoliert, damit
    // Optionstexte (Tiernamen/kuratierte Merkmalssätze) nie als HTML
    // interpretiert werden.
    answerGridEl.innerHTML = question.options
      .map(
        (_, i) => `
          <button type="button" class="answer-tile" data-option-index="${i}" aria-pressed="false">
            <span class="answer-tile__icon" aria-hidden="true"></span>
            <span class="answer-tile__text"></span>
          </button>
        `,
      )
      .join("");
    tileButtons = Array.from(answerGridEl.querySelectorAll(".answer-tile"));
    tileButtons.forEach((button, i) => {
      button.querySelector(".answer-tile__text").textContent =
        question.options[i].text;
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
    // Issue #15: bei jeder neuen Frage vollständig zurücksetzen, damit der
    // Link nie kurz mit dem vorherigen Tier sichtbar/erreichbar ist —
    // `hidden` nimmt das <a>-Element zusätzlich aus der Tab-Reihenfolge.
    wikipediaLinkEl.hidden = true;
    wikipediaLinkAnchorEl.href = "#";
    wikipediaLinkTextEl.textContent = "";
    nextButton.hidden = true;

    renderAnswerTiles(question);

    // onclick statt addEventListener: pro Frage wird hier bewusst der
    // Handler der vorherigen Frage überschrieben (kein Listener-Stacking
    // über die 10 Fragen einer Runde hinweg).
    tileButtons.forEach((button) => {
      button.onclick = () => handleAnswer(button, question, index);
    });
  }

  function handleAnswer(selectedButton, question) {
    // Nach Auswahl: alle Kacheln (4 oder, beim Verwechslungspaare-Fragetyp
    // aus Issue #21, 2) kurz deaktiviert (design.md, "Interaktions- und
    // Zustandsverhalten").
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

    // Issue #15: Wikipedia-Link nur anzeigen, wenn wikipedia_url_de für das
    // Tier vorhanden ist (kein generischer Such-Link-Fallback, siehe
    // PM-Entscheidung im Issue) — kindgerechter Linktext statt roher URL.
    if (answeredAnimal?.wikipedia_url_de) {
      wikipediaLinkAnchorEl.href = answeredAnimal.wikipedia_url_de;
      wikipediaLinkTextEl.textContent = `Mehr über ${answeredAnimal.name_de} auf Wikipedia lesen`;
      wikipediaLinkEl.hidden = false;
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
