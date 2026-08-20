// Frage-/Feedback-Bildschirm für den "Wer bin ich?"-Modus (Umkehr-Quiz,
// Issue #28). Wiederverwendet den bestehenden Frage-/Feedback-Mechanismus aus
// src/screens/question.js (Fortschrittsanzeige, 2×2-Antwortraster,
// Sofort-Feedback, manueller "Weiter"-Button, Punktestand über
// quiz/state.js) fast unverändert (siehe design.md, Abschnitt "Frage-/
// Feedback-Bildschirm 'Wer bin ich?'") — neu ist nur, WAS im oberen Bereich
// steht (Bild statt wechselndem Fragetext, feste Pflicht-Attribution) sowie
// der Lade-/Fehlerzustand, der die asynchrone Pro-Frage-Generierung aus
// Issue #27 (generateNextReverseQuestion) sichtbar macht.
//
// Bewusst eine EIGENE Datei statt Erweiterung von question.js: die beiden
// Fragepfade sind (wie schon in reverseQuestionGenerator.js begründet, siehe
// dortiger Datei-Kommentar zu dedupeAnimalsByName) bewusst unabhängig
// gehalten, um keine Kopplung zwischen dem stabilen, bereits QA-geprüften
// bestehenden Modus (Issue #6 ff.) und dem neuen, asynchronen Umkehr-Quiz-
// Modus einzuführen. Die paar wirklich identischen Bausteine (Antwortkacheln-
// Markup, Klick-Handling, Feedback-Text-Bausteine) werden daher bewusst
// dupliziert statt aus question.js re-exportiert — gleiches Vorgehen wie bei
// dedupeAnimalsByName in reverseQuestionGenerator.js.
//
// Seit Issue #35: Infosatz (Issue #12) inkl. Wikipedia-Link (Issue #15) NACH
// der Antwort, analog zu question.js (siehe dortiger Datei-Kommentar beim
// buildInfoSentence-Import sowie design.md, Abschnitt "Infosatz +
// Wikipedia-Link im 'Wer bin ich?'-Modus"). Bewusst weiterhin NICHT
// übernommen: Fun Fact (Issue #24, nicht Teil des #35-Scopes, siehe dortiges
// "Explizit außerhalb des Scopes") sowie das automatische Feedback-Bild aus
// Issue #30 (mit ux-design abgestimmte Redundanz-Entscheidung: das Bild
// dieses Modus ist bereits durchgehend sichtbar, ein zusätzliches
// Feedback-Bild wäre eine reine Dopplung, siehe design.md).
//
// Fragengenerierung: anders als question.js (ein synchroner Batch-Aufruf für
// die komplette Runde vor Frage 1) wird hier PRO Frage asynchron
// `generateNextReverseQuestion` aufgerufen (architecture.md, "Finale
// technische Leitplanken" zu Issue #27/#28) — Frage 1 kommt dabei nach
// Möglichkeit aus dem bereits am Start-Bildschirm erfolgreich aufgelösten
// "Testabruf" (siehe start.js, `quizState.pendingReverseQuestion`), alle
// weiteren Fragen werden jeweils nach Tap auf "Weiter" frisch geladen.

import animalsData from "../../data/animals.json";
import {
  generateNextReverseQuestion,
  REVERSE_QUESTION_IMAGE_ALT_TEXT,
} from "../quiz/reverseQuestionGenerator.js";
import {
  recordAnswer,
  advanceToNextQuestion,
} from "../quiz/state.js";
import { DEFAULT_ROUND_LENGTH } from "../quiz/questionGenerator.js";
// Issue #35: Infosatz-Mechanismus 1:1 aus question.js wiederverwendet (siehe
// architecture.md, "Infosatz + Wikipedia-Link im 'Wer bin ich?'-Modus:
// Wiederverwendbarkeit" — buildInfoSentence ist vollständig entkoppelt von
// Fragetyp/Spielmodus, nur die Rendering-Verdrahtung unten ist neu).
import { buildInfoSentence } from "../quiz/infoSentence.js";
import { addCollectedAnimal, loadCollectedAnimals } from "../quiz/album.js";
import { triggerConfetti } from "../quiz/confetti.js";

/**
 * Rendert den "Wer bin ich?"-Frage-Bildschirm in den übergebenen Container
 * und steuert den kompletten Ablauf einer Runde (Frage 1..N inkl.
 * Lade-/Fehlerzustand und Feedback/"Weiter").
 * @param {HTMLElement} container
 * @param {object} quizState Zustand aus createQuizState (siehe state.js),
 *   `mode` sollte GAME_MODE.REVERSE sein (Aufrufer/main.js entscheidet das,
 *   dieser Bildschirm prüft es selbst nicht).
 * @param {object} [callbacks]
 * @param {(quizState: object) => void} [callbacks.onFinish] wird nach der
 *   letzten Frage aufgerufen, sobald das Kind auf "Weiter" tippt.
 */
export function renderReverseQuestionScreen(
  container,
  quizState,
  { onFinish } = {},
) {
  // Seit Issue #13/#28: Rundenlänge kommt aus der am Start-Bildschirm
  // gewählten `quizState.roundLength`, gleicher Fallback wie question.js für
  // Zustände ohne roundLength (z. B. in Tests).
  const totalQuestions = quizState.roundLength ?? DEFAULT_ROUND_LENGTH;

  if (!Array.isArray(quizState.questions)) {
    quizState.questions = [];
  }

  // Bereits als Zieltier verwendete Tiere DIESER Runde (Konvention aus
  // reverseQuestionGenerator.js: die Funktion selbst mutiert das Set nicht,
  // der Aufrufer trägt `animalId` nach jeder erfolgreich geladenen Frage
  // selbst nach) — bewusst lokaler Zustand dieses Bildschirm-Renderings
  // (jede neue Runde ruft renderReverseQuestionScreen erneut auf), kein
  // globales State-Feld nötig (architecture.md: "kein neues globales
  // State-Feld nötig").
  const usedAnimalIds = new Set();

  // Issue #35: Lookup fürs schnelle Auffinden des vollen Tier-Objekts
  // (category/habitat/diet/wikipedia_url_de/…) zu einer Frage
  // (question.animalId) — identisches Muster wie animalById in question.js.
  // Das Fragen-Objekt aus generateNextReverseQuestion trägt selbst nur die
  // fürs Raten nötigen Felder (image/attribution/options/animalId), nicht das
  // komplette Tier-Objekt.
  const animalById = new Map(
    animalsData.animals.map((animal) => [animal.id, animal]),
  );

  container.innerHTML = `
    <section class="question-screen" aria-labelledby="reverse-question-heading">
      <p class="question-screen__progress"></p>

      <!-- Redesign (Issue #73): Medienkarte, gleiche Gruppierung wie
           question.js (Issue #72) — reine Layout-Ergänzung, kein
           Verhaltens-/Klassen-Unterschied an den bestehenden Elementen. -->
      <div class="question-screen__media">
        <!-- Fester, moderat großer Bildrahmen (design.md: "reserviert den
             späteren Bildrahmen bereits während des Ladens, kein Layout-
             Sprung") — enthält je nach Zustand genau EINEN der drei Bereiche
             darunter. aria-live/aria-busy kündigen Lade-/Fehlerzustands-
             Wechsel für Screenreader an (wichtige Abweichung von Issue #16,
             siehe design.md "Barrierefreiheit"). -->
        <div class="reverse-image-frame" aria-live="polite" aria-busy="true">
          <div class="reverse-image-frame__loading">
            <span class="reverse-image-frame__loading-icon" aria-hidden="true"
              >🐾</span
            >
            <p class="reverse-image-frame__loading-text">Bild wird geladen …</p>
          </div>
          <img
            class="reverse-image-frame__image"
            alt=""
            hidden
          />
          <div class="reverse-image-frame__error" hidden>
            <span class="reverse-image-frame__error-icon" aria-hidden="true"
              >🙈</span
            >
            <p class="reverse-image-frame__error-text">
              Dieses Bild will gerade nicht laden.
            </p>
            <button
              type="button"
              class="reverse-image-frame__retry-button"
            >
              Nochmal versuchen
            </button>
          </div>
        </div>

        <!-- Pflicht-Attributionszeile auf jeder Frage (design.md: "gleiches
             Format wie Issue #16", hier fest statt optional) — bewusst
             dieselben Klassen wie image-hint__attribution* in question.js/
             global.css (identische Optik/Formulierung gefordert, keine
             Geschmacksfrage). Standardmäßig hidden, da beim ersten Rendern
             noch kein Bild aufgelöst ist (Reset-Prinzip analog zu #16). -->
        <p class="image-hint__attribution" hidden>
          <span class="reverse-question__attribution-text"></span>
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

      <div class="question-screen__body">
      <!-- design.md: feste Überschrift statt wechselndem Fragetext, da die
           eigentliche "Frage" das Bild selbst ist. -->
      <h2 id="reverse-question-heading" class="question-screen__text">
        Wer bin ich?
      </h2>

      <!-- answer-grid--reverse (global.css): hält das echte 2×2-Raster auch
           auf schmalen Telefonen bei (anders als der bestehende
           Ein-Spalten-Fallback unterhalb 30rem in question.js) -- ohne diese
           Zusatzklasse würden 4 gestapelte Kacheln zusammen mit dem neuen
           Bildrahmen + der Pflicht-Attribution auf gängigen Telefongrößen
           (z. B. iPhone SE) scrollen, siehe Datei-Kommentar bei
           .reverse-image-frame in global.css. -->
      <div
        class="answer-grid answer-grid--reverse"
        role="group"
        aria-label="Antwortmöglichkeiten"
      ></div>
      </div>

      <!-- Redesign (Issue #73): dasselbe Feedback-Panel wie question.js
           (Issue #72) — bewusst außerhalb von .question-screen__body als
           eigenes Grid-Item (siehe dortiger Kommentar zum Overflow-Fund).
           Kein Fun-Fact-Block (bleibt außerhalb des #35-Scopes, siehe
           Datei-Kommentar oben) und kein separater Bild-Refetch für die
           Sticker-Karte — das bereits geladene reverse-image-frame-Bild wird
           direkt wiederverwendet (keine zweite Netzwerkanfrage nötig). -->
      <div class="feedback-panel" hidden>
        <div class="feedback-panel__mascot" aria-hidden="true"></div>
        <div class="feedback-panel__body">
          <p
            class="question-screen__feedback"
            role="status"
            aria-live="polite"
            hidden
          ></p>

          <!-- Issue #35: Infosatz inkl. Wikipedia-Link, unterhalb des
               Richtig/Falsch-Feedbacks (design.md, "Infosatz + Wikipedia-Link
               im 'Wer bin ich?'-Modus") — identisches Markup/identische
               Klassen wie question.js. -->
          <p class="question-screen__info-sentence" hidden>
            <span class="question-screen__info-sentence-text"></span>
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
        </div>

        <div class="feedback-panel__sticker">
          <div class="reverse-question__sticker-frame">
            <img class="reverse-question__sticker-img" alt="" />
            <p class="feedback-panel__sticker-name"></p>
            <span class="feedback-panel__sticker-badge"></span>
          </div>
          <div class="feedback-panel__confetti" aria-hidden="true"></div>
          <button type="button" class="next-button k-btn" hidden>Weiter</button>
        </div>
      </div>
    </section>
  `;

  const progressEl = container.querySelector(".question-screen__progress");
  const imageFrameEl = container.querySelector(".reverse-image-frame");
  const loadingEl = container.querySelector(".reverse-image-frame__loading");
  const imageEl = container.querySelector(".reverse-image-frame__image");
  const errorEl = container.querySelector(".reverse-image-frame__error");
  const retryButton = container.querySelector(
    ".reverse-image-frame__retry-button",
  );
  const attributionEl = container.querySelector(".image-hint__attribution");
  const attributionTextEl = container.querySelector(
    ".reverse-question__attribution-text",
  );
  const attributionLinkEl = container.querySelector(
    ".image-hint__attribution-link",
  );
  const answerGridEl = container.querySelector(".answer-grid");
  let tileButtons = [];
  // Redesign (Issue #73): gemeinsamer Feedback-Panel-Wrapper wie question.js
  // (Issue #72) — Sichtbarkeit folgt feedbackEl.hidden.
  const feedbackPanelEl = container.querySelector(".feedback-panel");
  const confettiContainerEl = container.querySelector(
    ".feedback-panel__confetti",
  );
  const stickerImgEl = container.querySelector(
    ".reverse-question__sticker-img",
  );
  const stickerNameEl = container.querySelector(
    ".feedback-panel__sticker-name",
  );
  const stickerBadgeEl = container.querySelector(
    ".feedback-panel__sticker-badge",
  );
  const feedbackEl = container.querySelector(".question-screen__feedback");
  // Issue #35: Infosatz-/Wikipedia-Link-Elemente — identische Referenz-Namen
  // wie in question.js für einfache Vergleichbarkeit der beiden Bildschirme.
  const infoSentenceEl = container.querySelector(
    ".question-screen__info-sentence",
  );
  const infoSentenceTextEl = container.querySelector(
    ".question-screen__info-sentence-text",
  );
  const wikipediaLinkEl = container.querySelector(
    ".question-screen__info-sentence-wikipedia-link",
  );
  const wikipediaLinkTextEl = container.querySelector(
    ".question-screen__info-sentence-wikipedia-link-text",
  );
  const nextButton = container.querySelector(".next-button");

  // Bewacht gegen veraltete Antworten (gleiches Muster wie
  // imageHintRequestId/reverseModeRequestId in question.js/start.js): wird
  // bei jedem neuen Ladeversuch erhöht, eine spät eintreffende Antwort eines
  // bereits verlassenen Ladeversuchs (z. B. nach schnellem Doppel-Tap auf
  // "Nochmal versuchen") verändert die DOM-Elemente der inzwischen aktiven
  // Frage nicht mehr.
  let loadRequestId = 0;

  // Baut die 4 Antwortkacheln für `question` komplett neu auf (identisches
  // Markup-Muster wie question.js/renderAnswerTiles, bewusst hier dupliziert
  // statt importiert, siehe Datei-Kommentar oben). Der Umkehr-Quiz-Modus hat
  // laut reverseQuestionGenerator.js immer genau 4 Optionen (kein
  // Verwechslungspaare-Fragetyp hier), daher kein `answer-grid--pair`-Fall
  // nötig.
  function renderAnswerTiles(question) {
    answerGridEl.innerHTML = question.options
      .map(
        (_, i) => `
          <button type="button" class="answer-tile k-btn" data-option-index="${i}" aria-pressed="false">
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
      // Redesign (Issue #73, design.md "Antwortkacheln"): Ziffern-Badge 1-4
      // vor der Antwort, wird in handleAnswer auf ✓/✗ überschrieben.
      button.querySelector(".answer-tile__icon").textContent = String(i + 1);
    });
  }

  function resetFeedback() {
    feedbackPanelEl.hidden = true;
    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackPanelEl.classList.remove(
      "feedback-panel--correct",
      "feedback-panel--incorrect",
    );
    stickerImgEl.src = "";
    stickerImgEl.alt = "";
    stickerNameEl.textContent = "";
    stickerBadgeEl.textContent = "";
    // Issue #35: bei jeder neuen Frage vollständig zurücksetzen, damit
    // Infosatz/Wikipedia-Link des vorherigen Tieres nie kurz sichtbar/
    // erreichbar bleiben (identisches Muster wie showQuestion() in
    // question.js).
    infoSentenceEl.hidden = true;
    infoSentenceTextEl.textContent = "";
    wikipediaLinkEl.hidden = true;
    wikipediaLinkEl.href = "#";
    wikipediaLinkTextEl.textContent = "";
    nextButton.hidden = true;
  }

  // Reset vor jedem neuen Ladeversuch: Bild, Attribution und Ladezustand
  // vollständig zurücksetzen (design.md, Abschnitt "Reset" — "identisches
  // Prinzip wie bei der bestehenden Bild-Rateshilfe"), Antwortkacheln/
  // Feedback ebenfalls leeren, da noch keine Frage zum Beantworten da ist.
  function showLoadingState() {
    imageFrameEl.setAttribute("aria-busy", "true");
    loadingEl.hidden = false;
    imageEl.hidden = true;
    imageEl.src = "";
    imageEl.alt = "";
    errorEl.hidden = true;

    attributionEl.hidden = true;
    attributionTextEl.textContent = "";
    attributionLinkEl.hidden = true;
    attributionLinkEl.href = "#";

    answerGridEl.innerHTML = "";
    tileButtons = [];
    resetFeedback();
  }

  // Fehlerzustand (design.md: "nach 3 erfolglosen Versuchen aus #27" — diese
  // Versuche sind zu diesem Zeitpunkt bereits INNERHALB von
  // generateNextReverseQuestion gelaufen, hier wird nur noch das Endergebnis
  // behandelt). Kein Rundenabbruch, kein Zurück zur Modus-Auswahl: der
  // "Nochmal versuchen"-Button stößt unten einfach denselben Ladeversuch für
  // denselben Frage-Index erneut an.
  function showErrorState() {
    imageFrameEl.setAttribute("aria-busy", "false");
    loadingEl.hidden = true;
    imageEl.hidden = true;
    errorEl.hidden = false;
  }

  function showLoadedQuestion(question) {
    imageFrameEl.setAttribute("aria-busy", "false");
    loadingEl.hidden = true;
    errorEl.hidden = true;

    // Barrierefreiheits-Korrektur gegenüber Issue #16 (design.md): der
    // Alt-Text darf den Tiernamen NICHT enthalten, sonst wäre die Antwort für
    // Screenreader-Nutzer:innen vorweggenommen. `question.image.alt` kommt
    // bereits fertig aus reverseQuestionGenerator.js
    // (REVERSE_QUESTION_IMAGE_ALT_TEXT), hier nur zur Doku importiert/
    // referenziert.
    imageEl.src = question.image.url;
    imageEl.alt = question.image.alt ?? REVERSE_QUESTION_IMAGE_ALT_TEXT;
    imageEl.hidden = false;

    attributionTextEl.textContent = question.attribution.text;
    if (question.attribution.licenseUrl) {
      attributionLinkEl.href = question.attribution.licenseUrl;
      attributionLinkEl.hidden = false;
    }
    attributionEl.hidden = false;

    renderAnswerTiles(question);
    tileButtons.forEach((button) => {
      button.onclick = () => handleAnswer(button, question);
    });
  }

  // Lädt die Frage für `index`: nutzt `reuseQuestion` (die bereits am
  // Start-Bildschirm aufgelöste Frage 1, siehe unten), sonst ein frischer
  // Aufruf von generateNextReverseQuestion. Schlägt der Aufruf fehl (nach den
  // in #27 spezifizierten internen Versuchen), zeigt showErrorState() den
  // freundlichen Retry-Zustand statt die Runde abzubrechen.
  async function loadQuestion(index, reuseQuestion) {
    const requestId = ++loadRequestId;
    progressEl.textContent = `Frage ${index + 1} von ${totalQuestions}`;
    showLoadingState();

    let question = reuseQuestion ?? null;
    if (!question) {
      try {
        question = await generateNextReverseQuestion(
          animalsData.animals,
          usedAnimalIds,
          quizState.difficulty,
        );
      } catch {
        if (requestId !== loadRequestId) return;
        showErrorState();
        return;
      }
    }

    // Zwischenzeitlich wurde bereits erneut geladen (z. B. schneller
    // Doppel-Tap auf "Nochmal versuchen") -> diese Antwort gehört nicht mehr
    // zum aktuell sichtbaren Ladeversuch, nicht mehr anwenden.
    if (requestId !== loadRequestId) return;

    usedAnimalIds.add(question.animalId);
    quizState.questions[index] = question;
    showLoadedQuestion(question);
  }

  function handleAnswer(selectedButton, question) {
    tileButtons.forEach((button) => {
      button.disabled = true;
    });

    const selectedIndex = Number(selectedButton.dataset.optionIndex);
    const selectedOption = question.options[selectedIndex];
    const correctIndex = question.options.findIndex((option) => option.correct);
    const correctButton = tileButtons[correctIndex];

    selectedButton.setAttribute("aria-pressed", "true");

    // Identische Formulierungen/Icon-Logik wie question.js/handleAnswer
    // (design.md: "Feedback-/Antwortmechanik: unverändert") — Richtig/Falsch
    // wird nie ausschließlich über Farbe kommuniziert.
    if (selectedOption.correct) {
      selectedButton.classList.add("answer-tile--correct");
      selectedButton.querySelector(".answer-tile__icon").textContent = "✓";

      feedbackEl.textContent = "✓ Super gemacht! Das ist richtig!";
      feedbackPanelEl.classList.add("feedback-panel--correct");

      // Redesign (Issue #69/#73): Konfetti nur bei richtiger Antwort.
      triggerConfetti(confettiContainerEl);
    } else {
      selectedButton.classList.add("answer-tile--selected-wrong");
      selectedButton.querySelector(".answer-tile__icon").textContent = "●";

      correctButton.classList.add("answer-tile--correct");
      correctButton.querySelector(".answer-tile__icon").textContent = "✓";

      feedbackEl.textContent = `Fast! Die richtige Antwort ist: ${question.options[correctIndex].text}`;
      feedbackPanelEl.classList.add("feedback-panel--incorrect");
    }

    feedbackPanelEl.hidden = false;
    feedbackEl.hidden = false;

    // Redesign (Issue #68/#73, design.md "Sticker-Karte"): Sticker-Bild wird
    // aus dem bereits geladenen reverse-image-frame-Bild übernommen (keine
    // zweite Netzwerkanfrage, siehe Template-Kommentar oben). Album-Sammeln
    // unabhängig von richtig/falsch, gleiches Prinzip wie question.js.
    const answeredAnimalForSticker = animalById.get(question.animalId);
    if (answeredAnimalForSticker) {
      const wasAlreadyCollected = loadCollectedAnimals().includes(
        answeredAnimalForSticker.id,
      );
      addCollectedAnimal(answeredAnimalForSticker.id);
      stickerImgEl.src = imageEl.src;
      stickerImgEl.alt = "";
      stickerNameEl.textContent = answeredAnimalForSticker.name_de;
      stickerBadgeEl.textContent = wasAlreadyCollected ? "SCHAU MAL" : "NEU!";
    }

    // Issue #35: Infosatz IMMER anzeigen, unabhängig davon, ob richtig oder
    // falsch geantwortet wurde (identische Regel wie in question.js/Issue
    // #12) — daher bewusst außerhalb des if/else oben, direkt nach dem
    // Feedback. `question.animalId` ist hier bereits das aufgelöste Zieltier
    // (nicht die ausgewählte Antwort), animalById liefert das volle
    // Tier-Objekt mit den für buildInfoSentence nötigen Feldern.
    const answeredAnimal = animalById.get(question.animalId);
    if (answeredAnimal) {
      infoSentenceTextEl.textContent = buildInfoSentence(answeredAnimal);
      infoSentenceEl.hidden = false;
    }

    // Issue #35/#15: Wikipedia-Link nur anzeigen, wenn wikipedia_url_de für
    // das Tier vorhanden ist (kein generischer Such-Link-Fallback, identisch
    // zu question.js).
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

  retryButton.addEventListener("click", () => {
    loadQuestion(quizState.currentIndex);
  });

  nextButton.addEventListener("click", () => {
    advanceToNextQuestion(quizState);

    if (quizState.currentIndex >= totalQuestions) {
      onFinish?.(quizState);
      return;
    }

    loadQuestion(quizState.currentIndex);
  });

  // Frage 1: die am Start-Bildschirm bereits erfolgreich aufgelöste Frage
  // wiederverwenden statt sie ein zweites Mal abzurufen (siehe Datei-
  // Kommentar oben sowie start.js). `pendingReverseQuestion` ist ein
  // transientes Feld -- wird hier konsumiert und sofort wieder entfernt,
  // damit ein späteres "Nochmal spielen" (neuer quizState, siehe main.js) es
  // nicht versehentlich erneut vorfindet.
  const pendingQuestion = quizState.pendingReverseQuestion ?? null;
  delete quizState.pendingReverseQuestion;

  loadQuestion(quizState.currentIndex, pendingQuestion);
}
