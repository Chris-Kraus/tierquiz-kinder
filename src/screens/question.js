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
// Issue #16 (Option D′): Bild-Rateshilfe. Reine URL-Konstruktion/Antwort-
// Parsing-Logik lebt in imageHint.js (testbar ohne DOM/fetch-Mock, siehe
// dortiger Datei-Kommentar) — der eigentliche fetch()-Aufruf und die
// DOM-/Zustandssteuerung (Button-Ladezustand, Reset pro Frage) passieren
// hier, analog zum bestehenden Wikipedia-Link-Baustein oben.
import {
  buildCommonsImageInfoUrl,
  extractImageInfo,
  buildAttribution,
  REQUEST_TIMEOUT_MS,
} from "../quiz/imageHint.js";

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

      <!-- Issue #16 (Option D′): Bild-Rateshilfe. Kleiner, sekundärer Button
           oberhalb der Antwortkacheln (design.md, "Bild-Rateshilfe (Issue
           #16)"), nur sichtbar, wenn image_filename für das aktuelle Tier
           vorhanden ist (siehe showQuestion/resetImageHint unten). Reserviert
           bewusst keinen festen Platz, wenn kein Bild ermittelbar ist — kein
           Leerraum-Rätsel fürs Kind. -->
      <button
        type="button"
        class="image-hint-button"
        hidden
        aria-busy="false"
      >
        <span class="image-hint-button__icon" aria-hidden="true">🔍</span>
        <span class="image-hint-button__spinner" aria-hidden="true"></span>
        <span class="image-hint-button__label">Bild zeigen</span>
      </button>

      <div class="image-hint" hidden>
        <img class="image-hint__image" alt="" />
        <p class="image-hint__attribution">
          <span class="image-hint__attribution-text"></span>
          <a
            class="image-hint__attribution-link"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            hidden
            >(Lizenz)</a
          >
        </p>
      </div>

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
        <!-- Issue #15: Wikipedia-Link, seit dem Zusammenführungs-Wunsch als
             letztes Element INNERHALB des Infosatz-Blocks statt als eigener,
             danebenstehender Block (siehe Datei-Kommentar unten bei
             wikipediaLinkEl). Eigenes hidden-Attribut unabhängig vom
             umschließenden p-Element -- der Infosatz bleibt unverändert
             sichtbar, wenn das Tier keinen wikipedia_url_de-Eintrag hat. -->
        <a
          class="question-screen__info-sentence-wikipedia-link"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          hidden
        >
          <span aria-hidden="true">📖</span>
          <span class="question-screen__info-sentence-wikipedia-link-text"></span>
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
  // deutschen Wikipedia-Artikel, siehe architecture.md). Seit dem
  // Zusammenführungs-Wunsch (Nutzeranfrage 14.08.2026) lebt der Link direkt
  // im Infosatz-Block (Issue #12) statt in einem eigenen, danebenstehenden
  // Element — `wikipediaLinkEl` ist damit direkt das `<a>`-Element, kein
  // umschließendes `<p>` mehr nötig.
  const wikipediaLinkEl = container.querySelector(
    ".question-screen__info-sentence-wikipedia-link",
  );
  const wikipediaLinkTextEl = container.querySelector(
    ".question-screen__info-sentence-wikipedia-link-text",
  );
  const nextButton = container.querySelector(".next-button");

  // Issue #16: Bild-Rateshilfe-Elemente.
  const imageHintButtonEl = container.querySelector(".image-hint-button");
  const imageHintButtonLabelEl = container.querySelector(
    ".image-hint-button__label",
  );
  const imageHintEl = container.querySelector(".image-hint");
  const imageHintImageEl = container.querySelector(".image-hint__image");
  const imageHintAttributionTextEl = container.querySelector(
    ".image-hint__attribution-text",
  );
  const imageHintAttributionLinkEl = container.querySelector(
    ".image-hint__attribution-link",
  );

  // Bewacht gegen veraltete Antworten: wird bei jedem Reset (neue Frage)
  // erhöht und bei jedem Klick-Request eingefroren, damit eine spät
  // eintreffende Antwort einer bereits verlassenen Frage die DOM-Elemente der
  // inzwischen aktiven Frage nicht mehr verändert (siehe handleImageHintClick
  // unten). `imageHintAbortController` bricht den zugehörigen fetch()-Aufruf
  // zusätzlich aktiv ab, statt nur die Antwort zu ignorieren.
  let imageHintRequestId = 0;
  let imageHintAbortController = null;

  // Setzt den Bild-Rateshilfe-Bereich für eine neue Frage vollständig zurück
  // (design.md, "Bild-Rateshilfe (Issue #16)", Abschnitt "Reset") — Button
  // nur sichtbar, wenn `animal.image_filename` vorhanden ist.
  function resetImageHint(animal) {
    imageHintRequestId += 1;
    if (imageHintAbortController) {
      imageHintAbortController.abort();
      imageHintAbortController = null;
    }

    imageHintButtonEl.hidden = !animal?.image_filename;
    imageHintButtonEl.disabled = false;
    imageHintButtonEl.setAttribute("aria-busy", "false");
    imageHintButtonLabelEl.textContent = "Bild zeigen";

    imageHintEl.hidden = true;
    imageHintImageEl.src = "";
    imageHintImageEl.alt = "";
    imageHintAttributionTextEl.textContent = "";
    imageHintAttributionLinkEl.hidden = true;
    imageHintAttributionLinkEl.href = "#";
  }

  // Löst den einen erlaubten Laufzeit-Commons-API-Call aus (architecture.md,
  // Abschnitt G: "ein Aufruf gegen die Wikimedia-Commons-API"). Bei jedem
  // Fehlschlag (Netzwerkfehler, Timeout, nicht auflösbare Datei) blendet sich
  // Button UND Bildbereich still aus — kein Fehlertext, kein kaputter
  // Platzhalter (design.md, Zustandstabelle "kein Bild/Fehler").
  function handleImageHintClick() {
    const question = quizState.questions[quizState.currentIndex];
    const animal = animalById.get(question?.animalId);
    if (!animal?.image_filename) return;

    const requestId = ++imageHintRequestId;
    const controller = new AbortController();
    imageHintAbortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    imageHintButtonEl.disabled = true;
    imageHintButtonEl.setAttribute("aria-busy", "true");
    imageHintButtonLabelEl.textContent = "Bild wird geladen …";

    fetch(buildCommonsImageInfoUrl(animal.image_filename), {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json) => {
        // Zwischenzeitlich wurde bereits zur nächsten Frage gewechselt (oder
        // erneut geklickt) -> diese Antwort gehört nicht mehr zum aktuell
        // sichtbaren Zustand, nicht mehr anwenden.
        if (requestId !== imageHintRequestId) return;

        const info = extractImageInfo(json);
        if (!info) {
          imageHintButtonEl.hidden = true;
          return;
        }

        const attribution = buildAttribution(info);
        imageHintImageEl.src = info.thumbUrl;
        imageHintImageEl.alt = animal.name_de;
        imageHintAttributionTextEl.textContent = attribution.text;
        if (attribution.licenseUrl) {
          imageHintAttributionLinkEl.href = attribution.licenseUrl;
          imageHintAttributionLinkEl.hidden = false;
        }
        imageHintEl.hidden = false;
        // Der Button hat seinen Zweck erfüllt (Bild ist jetzt aufgedeckt) —
        // ausblenden statt eines wirkungslosen zweiten Klicks.
        imageHintButtonEl.hidden = true;
      })
      .catch(() => {
        if (requestId !== imageHintRequestId) return;
        imageHintButtonEl.hidden = true;
        imageHintEl.hidden = true;
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (requestId === imageHintRequestId) {
          imageHintAbortController = null;
        }
      });
  }

  imageHintButtonEl.addEventListener("click", handleImageHintClick);

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
    wikipediaLinkEl.href = "#";
    wikipediaLinkTextEl.textContent = "";
    nextButton.hidden = true;

    // Issue #16: Bild-Rateshilfe bei jeder neuen Frage vollständig
    // zurücksetzen (design.md, Abschnitt "Reset").
    resetImageHint(animalById.get(question.animalId));

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
      wikipediaLinkEl.href = answeredAnimal.wikipedia_url_de;
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
