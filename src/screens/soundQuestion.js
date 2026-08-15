// Frage-/Feedback-Bildschirm für den "Tiergeräusche"-Modus (Issue #33).
// Wiederverwendet den bestehenden Frage-/Feedback-Mechanismus aus
// src/screens/question.js (Fortschrittsanzeige, 2×2-Antwortraster,
// Sofort-Feedback, manueller "Weiter"-Button, Punktestand über
// quiz/state.js) fast unverändert (siehe design.md, Abschnitt "Frage-/
// Feedback-Bildschirm 'Tiergeräusche'") — neu ist nur, WAS im oberen Bereich
// steht (Play-Button statt Bild/Bildrahmen, feste Pflicht-Attribution) sowie
// der Lade-/Fehlerzustand, der die asynchrone Pro-Frage-Generierung aus
// Issue #32 (generateNextSoundQuestion) sichtbar macht.
//
// Strukturell eng an src/screens/reverseQuestion.js (Issue #28, "Wer bin
// ich?"-Modus) angelehnt — dieses Projekt lebt allerdings auf einem eigenen,
// unabhängigen Feature-Branch (feature/tiergeraeusche) ohne Historie zu
// reverseQuestion.js, daher bewusst eine eigenständige, hier neu geschriebene
// Datei statt eines Imports/einer geteilten Abstraktion (architecture.md,
// "Branch-Strategie für neue Spielmodi": jeder Modus bleibt bis zum eigenen
// Merge unabhängig entwickelbar). Die paar wirklich identischen Bausteine
// (Antwortkacheln-Markup, Klick-Handling, Feedback-Text-Bausteine) werden
// daher bewusst dupliziert statt geteilt — gleiches Vorgehen wie bereits bei
// dedupeAnimalsByName in reverseQuestionGenerator.js/soundQuestionGenerator.js
// begründet.
//
// WICHTIGE, bewusste Abweichung von question.js (design.md, AC von Issue
// #33): kein Infosatz (Issue #12), kein Wikipedia-Link (Issue #15), kein Fun
// Fact (Issue #24) nach der Antwort — design.md scopt die Wiederverwendung
// für diesen Bildschirm explizit nur auf "Sofort-Feedback, 'Weiter'-Button,
// Punktestand, Ergebnis-Bildschirm", diese drei Zusatzbausteine sind dort
// nicht erwähnt. Kein Scope-Creep über die Story hinaus.
//
// Fragengenerierung: wie bei #28 wird PRO Frage asynchron
// `generateNextSoundQuestion` aufgerufen (architecture.md, "Tiergeräusche:
// Finale technische Leitplanken", Punkt 4: "eigene, asynchrone Pro-Frage-
// Generierungsfunktion ... identisch zu #27"). Anders als #28 gibt es hier
// bewusst KEIN "bereits am Start-Bildschirm vorab aufgelöste erste Frage"-
// Wiederverwendungsfeld (dort `quizState.pendingReverseQuestion`): der
// zugehörige Moduseinstieg/Testabruf-Mechanismus ist Teil der Start-
// Bildschirm-Kachel aus Issue #31, die laut Story-Aufteilung bewusst NICHT
// Teil dieser Story ist (sie folgt erst nach dem Merge von
// feature/umkehr-quiz nach main) — dieser Bildschirm lädt Frage 1 daher
// immer frisch selbst, ohne ein vom Aufrufer übergebenes Zustandsfeld zu
// erwarten. Kein Scope-Creep in Richtung #31.

import animalsData from "../../data/animals.json";
import { generateNextSoundQuestion } from "../quiz/soundQuestionGenerator.js";
import {
  recordAnswer,
  advanceToNextQuestion,
} from "../quiz/state.js";
import { DEFAULT_ROUND_LENGTH } from "../quiz/questionGenerator.js";

/**
 * Rendert den "Tiergeräusche"-Frage-Bildschirm in den übergebenen Container
 * und steuert den kompletten Ablauf einer Runde (Frage 1..N inkl.
 * Lade-/Fehlerzustand und Feedback/"Weiter").
 * @param {HTMLElement} container
 * @param {object} quizState Zustand aus createQuizState (siehe state.js).
 * @param {object} [callbacks]
 * @param {(quizState: object) => void} [callbacks.onFinish] wird nach der
 *   letzten Frage aufgerufen, sobald das Kind auf "Weiter" tippt.
 */
export function renderSoundQuestionScreen(
  container,
  quizState,
  { onFinish } = {},
) {
  // Gleicher Fallback wie question.js/reverseQuestion.js für Zustände ohne
  // roundLength (z. B. in Tests).
  const totalQuestions = quizState.roundLength ?? DEFAULT_ROUND_LENGTH;

  if (!Array.isArray(quizState.questions)) {
    quizState.questions = [];
  }

  // Bereits als Zieltier verwendete Tiere DIESER Runde (Konvention aus
  // soundQuestionGenerator.js: die Funktion selbst mutiert das Set nicht,
  // der Aufrufer trägt `animalId` nach jeder erfolgreich geladenen Frage
  // selbst nach) — bewusst lokaler Zustand dieses Bildschirm-Renderings,
  // kein globales State-Feld nötig (architecture.md, Punkt 4).
  const usedAnimalIds = new Set();

  container.innerHTML = `
    <section class="question-screen" aria-labelledby="sound-question-heading">
      <p class="question-screen__progress"></p>
      <!-- design.md: feste Überschrift statt wechselndem Fragetext, da die
           eigentliche "Frage" der Ton selbst ist. -->
      <h2 id="sound-question-heading" class="question-screen__text">
        Welches Tier ist das?
      </h2>

      <!-- Fester, moderat großer Player-Rahmen (design.md: "reservierter
           Player-Bereich", analog zum Bildrahmen bei #28, kein Layout-Sprung)
           — enthält je nach Zustand genau EINEN der drei Bereiche darunter.
           aria-live/aria-busy kündigen Lade-/Fehlerzustands-Wechsel für
           Screenreader an (design.md, "Barrierefreiheit"). -->
      <div class="sound-player-frame" aria-live="polite" aria-busy="true">
        <div class="sound-player-frame__loading">
          <span class="sound-player-frame__loading-icon" aria-hidden="true"
            >🎵</span
          >
          <p class="sound-player-frame__loading-text">Ton wird geladen …</p>
        </div>

        <!-- Play-Button: echtes <button>-Element, per Tastatur fokussierbar
             und auslösbar (Enter/Space), aussagekräftiges aria-label (design.md,
             "Barrierefreiheit") — Label wechselt nach dem ersten Abspielen von
             "Tierlaut abspielen" zu "Tierlaut noch einmal abspielen"
             (updatePlayButtonLabel unten). Derselbe Button kann beliebig oft
             erneut angetippt werden (kein separater "Nochmal"-Button, kein
             Limit). aria-busy kennzeichnet den kurzen Pufferzustand beim
             (ersten) Abspielen — dezenter Indikator IM Button selbst statt
             Vollbild-Spinner, gleiches Muster wie image-hint-button in
             question.js. -->
        <button
          type="button"
          class="sound-play-button"
          hidden
          aria-busy="false"
          aria-label="Tierlaut abspielen"
        >
          <span class="sound-play-button__icon" aria-hidden="true">🔊</span>
          <span class="sound-play-button__spinner" aria-hidden="true"></span>
        </button>

        <div class="sound-player-frame__error" hidden>
          <span class="sound-player-frame__error-icon" aria-hidden="true"
            >🙈</span
          >
          <p class="sound-player-frame__error-text">
            Dieser Ton will gerade nicht laden.
          </p>
          <button
            type="button"
            class="sound-player-frame__retry-button"
          >
            Nochmal versuchen
          </button>
        </div>
      </div>

      <!-- Das eigentliche Audio-Element bleibt unsichtbar (keine nativen
           Browser-Bedienelemente) — die Bedienung läuft ausschließlich über
           den Play-Button oben (design.md: "Abspielen startet ausschließlich
           durch expliziten Tap auf den Play-Button"). preload=none, da die
           URL laut #32 zwar bereits vorab aufgelöst (Metadaten-Check), die
           eigentliche Audiodatei aber bewusst erst beim ersten Play-Tap
           geladen wird (progressive Wiedergabe, siehe architecture.md,
           "Tiergeräusche: Finale technische Leitplanken", Punkt 2). -->
      <audio class="sound-question__audio" preload="none" hidden></audio>

      <!-- Pflicht-Attributionszeile auf jeder Frage (design.md: "gleiches
           Format wie #16/#28", hier fest statt optional) — bewusst dieselben
           Klassen wie image-hint__attribution* in question.js/global.css
           (identisches Optik-/Formulierungs-Muster gefordert, keine
           Geschmacksfrage). Standardmäßig hidden, da beim ersten Rendern noch
           kein Ton aufgelöst ist (Reset-Prinzip analog zu #16/#28). -->
      <p class="image-hint__attribution" hidden>
        <span class="sound-question__attribution-text"></span>
        <a
          class="image-hint__attribution-link"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          hidden
          >(Lizenz)</a
        >
      </p>

      <!-- answer-grid--sound (global.css): manuell auf 375px (iPhone SE)
           gegengeprüft (npm run dev, Playwright-Screenshot) — ohne diese
           Zusatzklasse scrollt die Kernaufgabe (Player + Attribution + 4
           Antwortkacheln) auf schmalen Telefonen leicht (der bestehende
           Ein-Spalten-Fallback des Basis-.answer-grid unterhalb 30rem
           braucht dafür zu viel vertikale Höhe, zusammen mit dem
           Player-Rahmen + der Pflicht-Attribution). Gleiches Prinzip wie
           beim strukturell verwandten "Wer bin ich?"-Frage-Bildschirm
           (design.md, "Frage-/Feedback-Bildschirm 'Tiergeräusche'": "Kein
           Scrollen bei der Kernaufgabe" gilt unverändert) — Tiernamen sind
           zudem durchweg kurze Einzelwörter, daher bleibt 2×2 auch bei
           schmalen Kachelbreiten gut lesbar. -->
      <div
        class="answer-grid answer-grid--sound"
        role="group"
        aria-label="Antwortmöglichkeiten"
      ></div>

      <p
        class="question-screen__feedback"
        role="status"
        aria-live="polite"
        hidden
      ></p>

      <button type="button" class="next-button" hidden>Weiter</button>
    </section>
  `;

  const progressEl = container.querySelector(".question-screen__progress");
  const playerFrameEl = container.querySelector(".sound-player-frame");
  const loadingEl = container.querySelector(".sound-player-frame__loading");
  const playButtonEl = container.querySelector(".sound-play-button");
  const errorEl = container.querySelector(".sound-player-frame__error");
  const retryButton = container.querySelector(
    ".sound-player-frame__retry-button",
  );
  const audioEl = container.querySelector(".sound-question__audio");
  const attributionEl = container.querySelector(".image-hint__attribution");
  const attributionTextEl = container.querySelector(
    ".sound-question__attribution-text",
  );
  const attributionLinkEl = container.querySelector(
    ".image-hint__attribution-link",
  );
  const answerGridEl = container.querySelector(".answer-grid");
  let tileButtons = [];
  const feedbackEl = container.querySelector(".question-screen__feedback");
  const nextButton = container.querySelector(".next-button");

  // Bewacht gegen veraltete Antworten (gleiches Muster wie
  // imageHintRequestId/loadRequestId in question.js/reverseQuestion.js): wird
  // bei jedem neuen Ladeversuch erhöht, eine spät eintreffende Antwort eines
  // bereits verlassenen Ladeversuchs (z. B. nach schnellem Doppel-Tap auf
  // "Nochmal versuchen") verändert die DOM-Elemente der inzwischen aktiven
  // Frage nicht mehr.
  let loadRequestId = 0;

  // Ob der Ton für die aktuelle Frage bereits mindestens einmal abgespielt
  // wurde — steuert den aria-label-Wechsel des Play-Buttons (design.md:
  // "Tierlaut abspielen" / "Tierlaut noch einmal abspielen"). Pro Frage
  // zurückgesetzt (siehe showLoadingState unten).
  let hasPlayedOnce = false;

  function updatePlayButtonLabel() {
    playButtonEl.setAttribute(
      "aria-label",
      hasPlayedOnce ? "Tierlaut noch einmal abspielen" : "Tierlaut abspielen",
    );
  }

  // Baut die 4 Antwortkacheln für `question` komplett neu auf (identisches
  // Markup-Muster wie question.js/reverseQuestion.js, bewusst hier dupliziert
  // statt importiert, siehe Datei-Kommentar oben). Der Tiergeräusche-Modus
  // hat laut soundQuestionGenerator.js immer genau 4 Optionen, daher kein
  // answer-grid--pair-Fall nötig.
  function renderAnswerTiles(question) {
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

  function resetFeedback() {
    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackEl.classList.remove(
      "question-screen__feedback--correct",
      "question-screen__feedback--incorrect",
    );
    nextButton.hidden = true;
  }

  // Reset vor jedem neuen Ladeversuch: Ton, Attribution und Ladezustand
  // vollständig zurücksetzen (design.md, Abschnitt "Reset" — "identisches
  // Prinzip wie bei #28"), Antwortkacheln/Feedback ebenfalls leeren, da noch
  // keine Frage zum Beantworten da ist.
  function showLoadingState() {
    playerFrameEl.setAttribute("aria-busy", "true");
    loadingEl.hidden = false;
    playButtonEl.hidden = true;
    playButtonEl.disabled = false;
    playButtonEl.setAttribute("aria-busy", "false");
    errorEl.hidden = true;

    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
    hasPlayedOnce = false;
    updatePlayButtonLabel();

    attributionEl.hidden = true;
    attributionTextEl.textContent = "";
    attributionLinkEl.hidden = true;
    attributionLinkEl.href = "#";

    answerGridEl.innerHTML = "";
    tileButtons = [];
    resetFeedback();
  }

  // Fehlerzustand (design.md: "nach 3 erfolglosen Versuchen aus #32" — diese
  // Versuche sind zu diesem Zeitpunkt bereits INNERHALB von
  // generateNextSoundQuestion gelaufen, hier wird nur noch das Endergebnis
  // behandelt). Kein Rundenabbruch, kein Zurück zur Modus-Auswahl: der
  // "Nochmal versuchen"-Button stößt unten einfach denselben Ladeversuch für
  // denselben Frage-Index erneut an.
  function showErrorState() {
    playerFrameEl.setAttribute("aria-busy", "false");
    loadingEl.hidden = true;
    playButtonEl.hidden = true;
    errorEl.hidden = false;
  }

  function showLoadedQuestion(question) {
    playerFrameEl.setAttribute("aria-busy", "false");
    loadingEl.hidden = true;
    errorEl.hidden = true;

    // URL bereits vollständig aufgelöst (Metadaten-Check laut #32) — der
    // eigentliche Audio-Download startet browserseitig erst beim ersten
    // Play-Tap (preload="none" oben).
    audioEl.src = question.audio.url;
    playButtonEl.hidden = false;
    updatePlayButtonLabel();

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

  // Lädt die Frage für `index`: ruft `generateNextSoundQuestion` auf.
  // Schlägt der Aufruf fehl (nach den in #32 spezifizierten internen
  // Versuchen), zeigt showErrorState() den freundlichen Retry-Zustand statt
  // die Runde abzubrechen.
  async function loadQuestion(index, reuseQuestion) {
    const requestId = ++loadRequestId;
    progressEl.textContent = `Frage ${index + 1} von ${totalQuestions}`;
    showLoadingState();

    let question = reuseQuestion ?? null;
    if (!question) {
      try {
        question = await generateNextSoundQuestion(
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

  // Play-Button: spielt den Ton bei jedem Tap von vorn ab (design.md:
  // "erneut angetippt werden, um den Ton von vorn abzuspielen" — kein
  // Fortsetzen, kein separater "Nochmal"-Button). `.catch(() => {})` fängt
  // eine Ablehnung des play()-Promise ab (z. B. nicht unterstütztes
  // Audioformat, siehe architecture.md, "bekanntes ... Risiko" zu Ogg
  // Vorbis/Safari) — kein zusätzlicher Fehlerzustand hierfür verlangt, die
  // eigentliche Frage bleibt unabhängig davon normal beantwortbar.
  function handlePlayClick() {
    if (!audioEl.src) return;
    hasPlayedOnce = true;
    updatePlayButtonLabel();
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  }

  playButtonEl.addEventListener("click", handlePlayClick);

  // Kurzer Pufferzustand (design.md: "dezenter Indikator im Button selbst,
  // kein Vollbild-Spinner", gleiches Muster wie image-hint-button in
  // question.js) — `waiting` feuert, sobald der Browser für die Wiedergabe
  // puffern muss; `playing` sobald die Wiedergabe tatsächlich läuft.
  audioEl.addEventListener("waiting", () => {
    playButtonEl.setAttribute("aria-busy", "true");
  });
  audioEl.addEventListener("playing", () => {
    playButtonEl.setAttribute("aria-busy", "false");
  });

  function handleAnswer(selectedButton, question) {
    tileButtons.forEach((button) => {
      button.disabled = true;
    });

    const selectedIndex = Number(selectedButton.dataset.optionIndex);
    const selectedOption = question.options[selectedIndex];
    const correctIndex = question.options.findIndex((option) => option.correct);
    const correctButton = tileButtons[correctIndex];

    selectedButton.setAttribute("aria-pressed", "true");

    // Identische Formulierungen/Icon-Logik wie question.js/reverseQuestion.js
    // (design.md: "Feedback-/Antwortmechanik: unverändert") — Richtig/Falsch
    // wird nie ausschließlich über Farbe kommuniziert.
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

      feedbackEl.textContent = `Fast! Die richtige Antwort ist: ${question.options[correctIndex].text}`;
      feedbackEl.classList.add("question-screen__feedback--incorrect");
    }

    feedbackEl.hidden = false;

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
  // wiederverwenden statt sie ein zweites Mal abzurufen (analoges Muster zu
  // reverseQuestion.js/pendingReverseQuestion, siehe start.js). Transientes
  // Feld -- wird hier konsumiert und sofort entfernt, damit ein späteres
  // "Nochmal spielen" (neuer quizState, siehe main.js) es nicht versehentlich
  // erneut vorfindet.
  const pendingQuestion = quizState.pendingSoundQuestion ?? null;
  delete quizState.pendingSoundQuestion;

  loadQuestion(quizState.currentIndex, pendingQuestion);
}
