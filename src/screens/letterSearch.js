// Frage-/Feedback-Bildschirm für den "Buchstabensuche"-Modus (Issue #46).
// Strukturell am nächsten zu src/screens/reverseQuestion.js (Issue #28,
// "Wer bin ich?"-Modus, siehe architecture.md: "Pro-Frage-Vorab-Auflösung
// eines einzelnen Bildes, reguläre Rundenstruktur mit
// state.questions/roundLength/Fortschrittsanzeige") — Bildrahmen-Ladezustand/
// Fehlerzustand/Attributionszeile sind bewusst 1:1 aus reverseQuestion.js
// übernommen (identische Klassen/Markup, damit das bestehende CSS unverändert
// wiederverwendet werden kann, gleiche Duplizierungs-Konvention wie bei den
// übrigen Modus-Bildschirmen, siehe dortiger Datei-Kommentar).
//
// Der eigentliche Unterschied liegt AUSSCHLIESSLICH in der Antwortmechanik
// (architecture.md, Punkt 1): statt 4 Antwortkacheln gibt es eine Reihe von
// Buchstaben-Kästchen (teils vorgegebener Text, teils echte
// <input maxlength="1">-Felder), die das Kind Buchstabe für Buchstabe
// ausfüllt. Die Lücken-Positionen kommen aus der reinen, DOM-freien Funktion
// buildLetterPuzzle() (src/quiz/letterPuzzle.js) — dieser Bildschirm ruft sie
// bei jeder neu geladenen Frage mit `quizState.difficulty` auf (die
// Fragegenerierung selbst kennt/braucht die Schwierigkeitsstufe nicht, siehe
// Datei-Kommentar in letterSearchQuestionGenerator.js).
//
// Sobald der komplette Name korrekt ergänzt ist, wird intern derselbe
// recordAnswer({correct: true})-Aufruf wie in den übrigen Modi genutzt
// (architecture.md, Punkt 5) — die bestehende Fortschritts-/Rundenlogik
// (advanceToNextQuestion/isQuizFinished) läuft dadurch unverändert weiter,
// kein neuer State-Mechanismus nötig. Infosatz (Issue #12) + Wikipedia-Link
// (Issue #15) + Fun Fact (Issue #24) sind 1:1 aus soundQuestion.js/
// reverseQuestion.js übernommen (identisches Markup/identische Klassen).
//
// Seit Issue #52 ("Lösung zeigen"): zusätzlicher, visuell zurückhaltender
// Button unterhalb der Kästchen-Reihe, mit dem das Kind die Antwort auflösen
// kann, statt weiter raten zu müssen. Wiederverwendet denselben Abschluss-
// Ablauf wie beim regulären Lösen (Infosatz/Wikipedia-Link/Fun Fact/"Weiter"-
// Button, siehe revealAnswerExtrasAndNext), markiert die Antwort im Zustand
// aber zusätzlich als `resolved: true` (recordAnswer, state.js) und zeigt ein
// bewusst anderes, nicht-grünes Feedback (siehe handleShowSolution unten),
// damit kein falsches "selbst richtig gelöst"-Signal entsteht.

import animalsData from "../../data/animals.json";
import {
  generateNextLetterSearchQuestion,
  LETTER_SEARCH_IMAGE_ALT_TEXT,
} from "../quiz/letterSearchQuestionGenerator.js";
import { buildLetterPuzzle } from "../quiz/letterPuzzle.js";
import { recordAnswer, advanceToNextQuestion } from "../quiz/state.js";
import { DEFAULT_ROUND_LENGTH } from "../quiz/questionGenerator.js";
import { buildInfoSentence } from "../quiz/infoSentence.js";
import { triggerConfetti } from "../quiz/confetti.js";
// Issue #82, dritter Teil des Sterne-/Maskottchen-Freischaltsystems
// (#80-#83): das `.feedback-panel__mascot`-Feld zeigt Tint + Emoji + Name +
// Rolle des aktiven Maskottchens (siehe question.js, gleiches Prinzip --
// QA-Bugfix Test-Fix-Zyklus 1: Name/Rolle fehlten ursprünglich als Text).
// Rein darstellend bis auf das Emoji, keine Live-Aktualisierung nötig.
import { loadProgress } from "../quiz/progress.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";

// Kindgerechte, kurze Fehlermeldung bei falscher Buchstaben-Eingabe
// (design.md, "Fehlerfall pro Buchstabe": "kein 'Falsch!', kein Rot/Buzzer-
// Ton" — bewusst dieselbe freundliche Formulierung wie im Issue-Text
// vorgeschlagen).
const WRONG_LETTER_MESSAGE = "Fast! Versuch's nochmal 🙂";

function normalizeLetter(value) {
  // "de-DE" statt des einfacheren toLowerCase() (architecture.md, Punkt 4:
  // "toLocaleLowerCase('de-DE') ... wendet das deutsche Gebietsschema korrekt
  // an, u. a. für ß-relevante Randfälle").
  return (value ?? "").toLocaleLowerCase("de-DE");
}

/**
 * Rendert den "Buchstabensuche"-Frage-Bildschirm in den übergebenen
 * Container und steuert den kompletten Ablauf einer Runde (Frage 1..N inkl.
 * Lade-/Fehlerzustand und Buchstaben-Eingabe/"Weiter").
 * @param {HTMLElement} container
 * @param {object} quizState Zustand aus createQuizState (siehe state.js),
 *   `mode` sollte GAME_MODE.LETTER_SEARCH sein.
 * @param {object} [callbacks]
 * @param {(quizState: object) => void} [callbacks.onFinish] wird nach der
 *   letzten Frage aufgerufen, sobald das Kind auf "Weiter" tippt.
 */
export function renderLetterSearchScreen(
  container,
  quizState,
  { onFinish } = {},
) {
  const totalQuestions = quizState.roundLength ?? DEFAULT_ROUND_LENGTH;

  if (!Array.isArray(quizState.questions)) {
    quizState.questions = [];
  }

  // Bereits als Zieltier verwendete Tiere DIESER Runde (Konvention aus
  // letterSearchQuestionGenerator.js: die Funktion mutiert das Set nicht
  // selbst, der Aufrufer trägt `animalId` nach jeder erfolgreich geladenen
  // Frage selbst nach) — lokaler Zustand dieses Bildschirm-Renderings, kein
  // globales State-Feld nötig (architecture.md, Punkt 6).
  const usedAnimalIds = new Set();

  // Lookup fürs schnelle Auffinden des vollen Tier-Objekts (wikipedia_url_de/
  // fun_fact/…) zu einer Frage (question.animalId) — identisches Muster wie
  // animalById in reverseQuestion.js/soundQuestion.js.
  const animalById = new Map(
    animalsData.animals.map((animal) => [animal.id, animal]),
  );

  const { unlockedIds, activeIdx } = loadProgress();
  const activeMascotId = unlockedIds[activeIdx] ?? 0;
  const activeMascot = MASCOTS[activeMascotId] ?? MASCOTS[0];

  container.innerHTML = `
    <section class="question-screen" aria-labelledby="letter-search-heading">
      <p class="question-screen__progress"></p>

      <!-- Redesign (Issue #75): Medienkarte, gleiche Gruppierung wie
           question.js/reverseQuestion.js/soundQuestion.js (#72-#74). -->
      <div class="question-screen__media">
        <!-- Identisches Markup/identische Klassen wie in reverseQuestion.js
             (Bildrahmen mit Lade-/Fehlerzustand) -- bewusste Wiederverwendung
             desselben, bereits QA-geprüften CSS (design.md, "Bildschirmaufbau:
             gleiche Bildrahmen-Optik/Größe wie beim 'Wer bin ich?'-Modus"). -->
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

        <!-- Pflicht-Attributionszeile auf jeder Frage (design.md: "identisches
             Pflicht-Attributions-Muster wie bei #28"). -->
        <p class="image-hint__attribution" hidden>
          <span class="letter-search__attribution-text"></span>
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
      <!-- design.md: feste Überschrift statt wechselndem Fragetext, analog
           zu reverseQuestion.js/soundQuestion.js. -->
      <h2 id="letter-search-heading" class="question-screen__text">
        Wie heißt dieses Tier?
      </h2>

      <!-- Buchstaben-Kästchen-Reihe(n) (design.md, "Eingabemechanik") --
           wird pro Frage komplett neu aufgebaut (renderLetterPuzzle unten). -->
      <div
        class="letter-puzzle"
        role="group"
        aria-label="Tiername ergänzen"
      ></div>

      <!-- Kurze, freundliche Fehlermeldung pro Buchstabe (design.md,
           "Fehlerfall pro Buchstabe"), per aria-live angekündigt (Akzeptanz-
           kriterium: "Fehlermeldung per aria-live angekündigt"). -->
      <p class="letter-puzzle__error" role="status" aria-live="polite" hidden></p>

      <!-- "Lösung zeigen"-Button (Issue #52, design.md "Buchstabensuche:
           Lösung anzeigen"): durchgehend sichtbar, sobald die Frage geladen
           ist, verschwindet nach Anzeige der Lösung (analog zum Zustand nach
           korrektem Lösen). Bewusst nach den Buchstaben-Kästchen und vor dem
           "Weiter"-Button im Markup, damit die Tab-Reihenfolge ohne
           zusätzliches tabindex-Handling passt. -->
      <button
        type="button"
        class="letter-puzzle__solve-button k-btn"
        aria-label="Lösung anzeigen und Namen auflösen"
        hidden
      >
        Lösung zeigen
      </button>
      </div>

      <!-- Redesign (Issue #75): dasselbe Feedback-Panel wie question.js
           (Issue #72) — bewusst außerhalb von .question-screen__body als
           eigenes Grid-Item (siehe dortiger Kommentar zum Overflow-Fund).
           Kein separater Bild-Refetch für die Sticker-Karte — wie #73 wird
           das bereits geladene reverse-image-frame-Bild wiederverwendet. -->
      <div class="feedback-panel" hidden>
        <div class="feedback-panel__mascot" style="background: ${tintOf(activeMascotId)};">
          <span class="feedback-panel__mascot-emoji" aria-hidden="true">${activeMascot.emoji}</span>
          <p class="feedback-panel__mascot-name">${activeMascot.name}</p>
          <p class="feedback-panel__mascot-role">${activeMascot.role}</p>
        </div>
        <div class="feedback-panel__body">
          <p
            class="question-screen__feedback"
            role="status"
            aria-live="polite"
            hidden
          ></p>

          <!-- Infosatz + Wikipedia-Link, identisches Markup wie reverseQuestion.js/
               soundQuestion.js. -->
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

          <!-- Fun Fact, identisches Markup wie soundQuestion.js (Issue #24). -->
          <p class="question-screen__fun-fact" hidden>
            <span class="question-screen__fun-fact-icon" aria-hidden="true">💡</span>
            <span class="question-screen__fun-fact-lead">Wusstest du schon?</span>
            <span class="question-screen__fun-fact-text"></span>
          </p>
        </div>

        <div class="feedback-panel__sticker">
          <div class="letter-search__sticker-frame">
            <img class="letter-search__sticker-img" alt="" />
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
    ".letter-search__attribution-text",
  );
  const attributionLinkEl = container.querySelector(
    ".image-hint__attribution-link",
  );
  const letterPuzzleEl = container.querySelector(".letter-puzzle");
  const letterErrorEl = container.querySelector(".letter-puzzle__error");
  const solveButton = container.querySelector(".letter-puzzle__solve-button");
  // Redesign (Issue #75): gemeinsamer Feedback-Panel-Wrapper wie question.js
  // (Issue #72) — Sichtbarkeit folgt feedbackEl.hidden.
  const feedbackPanelEl = container.querySelector(".feedback-panel");
  const confettiContainerEl = container.querySelector(
    ".feedback-panel__confetti",
  );
  const stickerImgEl = container.querySelector(".letter-search__sticker-img");
  const stickerNameEl = container.querySelector(
    ".feedback-panel__sticker-name",
  );
  const stickerBadgeEl = container.querySelector(
    ".feedback-panel__sticker-badge",
  );
  const feedbackEl = container.querySelector(".question-screen__feedback");
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
  const funFactEl = container.querySelector(".question-screen__fun-fact");
  const funFactTextEl = container.querySelector(
    ".question-screen__fun-fact-text",
  );
  const nextButton = container.querySelector(".next-button");

  // Bewacht gegen veraltete Antworten (identisches Muster wie loadRequestId
  // in reverseQuestion.js/soundQuestion.js).
  let loadRequestId = 0;
  // Verhindert einen doppelten recordAnswer()-Aufruf, falls handlePuzzleSolved
  // durch ein spätes Event mehrfach erreicht würde.
  let puzzleSolved = false;
  let blankInputs = [];

  function hideLetterError() {
    letterErrorEl.hidden = true;
    letterErrorEl.textContent = "";
  }

  function showLetterError() {
    letterErrorEl.textContent = WRONG_LETTER_MESSAGE;
    letterErrorEl.hidden = false;
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
    infoSentenceEl.hidden = true;
    infoSentenceTextEl.textContent = "";
    wikipediaLinkEl.hidden = true;
    wikipediaLinkEl.href = "#";
    wikipediaLinkTextEl.textContent = "";
    funFactEl.hidden = true;
    funFactTextEl.textContent = "";
    nextButton.hidden = true;
  }

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

    letterPuzzleEl.innerHTML = "";
    blankInputs = [];
    puzzleSolved = false;
    solveButton.hidden = true;
    hideLetterError();
    resetFeedback();
  }

  function showErrorState() {
    imageFrameEl.setAttribute("aria-busy", "false");
    loadingEl.hidden = true;
    imageEl.hidden = true;
    errorEl.hidden = false;
  }

  // Baut die Buchstaben-Kästchen-Reihe für `puzzle` (siehe buildLetterPuzzle,
  // letterPuzzle.js) komplett neu auf: vorgegebene Buchstaben als reiner Text
  // (kein editierbares Feld, design.md: "für Screenreader klar als 'bereits
  // vorhanden' erkennbar"), Lücken als echte <input maxlength="1">-Felder mit
  // aria-label je Position, Leerzeichen/Bindestriche als sichtbares, nicht
  // editierbares Trennzeichen zwischen den Namensteil-Gruppen (nie eine
  // Lücke, design.md/Akzeptanzkriterium).
  function renderLetterPuzzle(puzzle) {
    // "Buchstabe X von N" zählt nur tatsächliche Buchstaben (given + blank),
    // NICHT die Separatoren -- design.md-Beispiel "Buchstabe 3 von 8" bezieht
    // sich auf die Position im ganzen (sichtbaren) Namen, nicht auf die
    // modulo-basierte Lücken-Zählung je Namensteil (die intern in
    // buildLetterPuzzle() separat je Namensteil neu beginnt).
    const totalLetters = puzzle.filter(
      (entry) => entry.type !== "separator",
    ).length;

    let html = "";
    let letterPosition = 0;
    let wordOpen = false;

    puzzle.forEach((entry) => {
      if (entry.type === "separator") {
        if (wordOpen) {
          html += `</span>`;
          wordOpen = false;
        }
        html += `<span class="letter-puzzle__separator" aria-hidden="true">${
          entry.char === "-" ? "-" : " "
        }</span>`;
        return;
      }

      if (!wordOpen) {
        html += `<span class="letter-puzzle__word">`;
        wordOpen = true;
      }

      letterPosition += 1;
      if (entry.type === "given") {
        html += `<span class="letter-box letter-box--given">${entry.char}</span>`;
      } else {
        const label = `Buchstabe ${letterPosition} von ${totalLetters}`;
        html += `
          <input
            type="text"
            class="letter-box letter-box--blank"
            maxlength="1"
            inputmode="text"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            aria-label="${label}"
            data-expected-char="${entry.char}"
            data-base-label="${label}"
          />
        `;
      }
    });
    if (wordOpen) html += `</span>`;

    letterPuzzleEl.innerHTML = html;
    blankInputs = Array.from(
      letterPuzzleEl.querySelectorAll(".letter-box--blank"),
    );
    blankInputs.forEach((input) => {
      input.addEventListener("input", () => handleLetterInput(input));
    });
  }

  function focusNextOpenInput() {
    const next = blankInputs.find((input) => !input.readOnly);
    if (next) next.focus();
  }

  function handleLetterInput(input) {
    // maxlength schützt zwar bereits gegen längere Eingaben, aber IME-/
    // Einfüge-Randfälle können mehr als 1 Zeichen liefern -- defensiv auf das
    // erste Zeichen kürzen.
    const raw = input.value.slice(0, 1);
    input.value = raw;
    if (raw === "") return; // z. B. Backspace -- kein Eingabeversuch

    const expected = input.dataset.expectedChar;
    if (normalizeLetter(raw) === normalizeLetter(expected)) {
      // Korrekte Eingabe: Feld sperrt sich, zeigt die tatsächlich korrekte
      // Schreibweise (nicht die rohe Kind-Eingabe, architecture.md, Punkt 4),
      // Fokus wandert automatisch zum nächsten leeren Feld (design.md,
      // "Auto-Fokus-Wanderung").
      input.value = expected;
      input.readOnly = true;
      input.classList.add("letter-box--filled");
      input.setAttribute(
        "aria-label",
        `${input.dataset.baseLabel}: ${expected}, schon richtig`,
      );
      hideLetterError();
      focusNextOpenInput();

      const allFilled = blankInputs.every((el) => el.readOnly);
      if (allFilled && !puzzleSolved) {
        puzzleSolved = true;
        handlePuzzleSolved();
      }
    } else {
      // Falsche Eingabe: Feld leert sich, kurze freundliche Fehlermeldung,
      // Fokus bleibt für einen neuen Versuch auf demselben Feld (design.md:
      // "unbegrenzte Versuche, keine Auswirkung auf ein Punktesystem").
      input.value = "";
      showLetterError();
    }
  }

  // Gemeinsamer Abschluss-Teil für eigenständiges Lösen UND "Lösung zeigen"
  // (Issue #52: "Wiederverwendet denselben Ablauf wie beim regulären Lösen")
  // -- Infosatz/Wikipedia-Link/Fun Fact sowie der "Weiter"-Button sehen in
  // beiden Fällen identisch aus, nur Feedback-Text/-Optik und der
  // `resolved`-Wert unterscheiden sich (siehe handlePuzzleSolved/
  // handleShowSolution unten).
  function revealAnswerExtrasAndNext(question) {
    const answeredAnimal = animalById.get(question.animalId);

    // Redesign (Issue #68/#75, design.md "Sticker-Karte"): Sticker-Karte
    // gilt für beide Abschluss-Pfade (eigenständig gelöst UND "Lösung
    // zeigen") — dieser Modus hat strukturell kein "falsch beantwortet", nur
    // "selbst gelöst" vs. "aufgelöst" (siehe architecture.md, Punkt 5). Bild
    // wird aus dem bereits geladenen reverse-image-frame-Bild übernommen
    // (keine zweite Netzwerkanfrage, gleiches Prinzip wie #73). Album-Eintrag
    // entfällt seit Issue #91 (Tier-Album-Modul entfernt).
    if (answeredAnimal) {
      stickerImgEl.src = imageEl.src;
      stickerImgEl.alt = "";
      stickerNameEl.textContent = answeredAnimal.name_de;
      stickerBadgeEl.textContent = "NEU!";
    }

    if (answeredAnimal) {
      infoSentenceTextEl.textContent = buildInfoSentence(answeredAnimal);
      infoSentenceEl.hidden = false;
    }
    if (answeredAnimal?.wikipedia_url_de) {
      wikipediaLinkEl.href = answeredAnimal.wikipedia_url_de;
      wikipediaLinkTextEl.textContent = `Mehr über ${answeredAnimal.name_de} auf Wikipedia lesen`;
      wikipediaLinkEl.hidden = false;
    }
    if (answeredAnimal?.fun_fact) {
      funFactTextEl.textContent = answeredAnimal.fun_fact;
      funFactEl.hidden = false;
    }

    solveButton.hidden = true;
    nextButton.hidden = false;
    nextButton.focus();
  }

  function handlePuzzleSolved() {
    const question = quizState.questions[quizState.currentIndex];
    if (!question) return;

    feedbackEl.textContent = "✓ Super gemacht! Richtig ergänzt!";
    feedbackPanelEl.classList.add("feedback-panel--correct");
    feedbackPanelEl.hidden = false;
    feedbackEl.hidden = false;

    // Redesign (Issue #69/#75): Konfetti nur beim eigenständigen Lösen, nicht
    // bei "Lösung zeigen" (design.md/Copy-Regeln: Belohnung für echte
    // eigene Leistung).
    triggerConfetti(confettiContainerEl);

    // Kein "falsch beantwortet" möglich in diesem Modus (architecture.md,
    // Punkt 5: "es gibt hier strukturell kein 'falsch beantwortet'") -- daher
    // immer correct: true, dieselbe Fortschritts-/Rundenlogik wie in den
    // übrigen Modi läuft dadurch unverändert weiter. `resolved` bleibt hier
    // unverändert `false` (Standard) -- eigenständig gelöst, nicht per
    // "Lösung zeigen" (Issue #52).
    recordAnswer(quizState, {
      question,
      selectedText: question.animalName,
      correct: true,
    });

    revealAnswerExtrasAndNext(question);
  }

  // "Lösung zeigen" (Issue #52, design.md "Buchstabensuche: Lösung
  // anzeigen"): füllt alle verbleibenden Lücken mit dem korrekten Namen und
  // löst danach denselben Ablauf wie beim regulären Lösen aus -- aber mit
  // sichtbar unterschiedlichem Feedback (neutraler statt grüner Kästchen-
  // Zustand, "Hier ist die Lösung: {Name}" statt "✓ Super gemacht!"), damit
  // kein falsches "selbst richtig gelöst"-Signal entsteht.
  function handleShowSolution() {
    if (puzzleSolved) return;
    puzzleSolved = true;

    const question = quizState.questions[quizState.currentIndex];
    if (!question) return;

    // Bereits vom Kind korrekt eingetippte Felder bleiben unverändert (grün/
    // "filled") -- nur die tatsächlich noch offenen Lücken werden aufgelöst
    // (Akzeptanzkriterium: "füllt alle verbleibenden Lücken").
    blankInputs.forEach((input) => {
      if (input.readOnly) return;
      const expected = input.dataset.expectedChar;
      input.value = expected;
      input.readOnly = true;
      // Neutraler Darstellungs-Zustand, analog zu den bereits vorgegebenen
      // Kästchen -- bewusst NICHT .letter-box--filled (grünes "richtig"-Grün
      // wäre hier irreführend, design.md).
      input.classList.remove("letter-box--blank");
      input.classList.add("letter-box--given");
      input.setAttribute(
        "aria-label",
        `${input.dataset.baseLabel}: ${expected}, aufgelöst`,
      );
    });
    hideLetterError();

    feedbackEl.textContent = `Hier ist die Lösung: ${question.animalName}`;
    // Redesign (Issue #75): --incorrect/blush statt --correct/sky für die
    // Panel-Fläche — bewusst kein Häkchen-Icon/keine grüne Erfolgsfarbe
    // (design.md/Akzeptanzkriterium), kein Konfetti (siehe handlePuzzleSolved).
    feedbackPanelEl.classList.add("feedback-panel--incorrect");
    feedbackPanelEl.hidden = false;
    feedbackEl.hidden = false;

    recordAnswer(quizState, {
      question,
      selectedText: question.animalName,
      correct: true,
      resolved: true,
    });

    revealAnswerExtrasAndNext(question);
  }

  function showLoadedQuestion(question) {
    imageFrameEl.setAttribute("aria-busy", "false");
    loadingEl.hidden = true;
    errorEl.hidden = true;

    // Barrierefreiheits-Vorgabe (design.md): der Alt-Text darf den Tiernamen
    // NICHT enthalten, der Name ist hier die gesuchte Antwort selbst.
    imageEl.src = question.image.url;
    imageEl.alt = question.image.alt ?? LETTER_SEARCH_IMAGE_ALT_TEXT;
    imageEl.hidden = false;

    attributionTextEl.textContent = question.attribution.text;
    if (question.attribution.licenseUrl) {
      attributionLinkEl.href = question.attribution.licenseUrl;
      attributionLinkEl.hidden = false;
    }
    attributionEl.hidden = false;

    const puzzle = buildLetterPuzzle(question.animalName, quizState.difficulty);
    renderLetterPuzzle(puzzle);
    focusNextOpenInput();

    // "Lösung zeigen" ist durchgehend sichtbar, sobald die Frage geladen ist
    // (Issue #52, design.md: "kein Freischalten erst nach X Fehlversuchen,
    // keine zusätzliche Hürde").
    solveButton.hidden = false;
  }

  async function loadQuestion(index, reuseQuestion) {
    const requestId = ++loadRequestId;
    progressEl.textContent = `Tier ${index + 1} von ${totalQuestions}`;
    showLoadingState();

    let question = reuseQuestion ?? null;
    if (!question) {
      try {
        question = await generateNextLetterSearchQuestion(
          animalsData.animals,
          usedAnimalIds,
        );
      } catch {
        if (requestId !== loadRequestId) return;
        showErrorState();
        return;
      }
    }

    if (requestId !== loadRequestId) return;

    usedAnimalIds.add(question.animalId);
    quizState.questions[index] = question;
    showLoadedQuestion(question);
  }

  retryButton.addEventListener("click", () => {
    loadQuestion(quizState.currentIndex);
  });

  solveButton.addEventListener("click", handleShowSolution);

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
  // Feld -- wird hier konsumiert und sofort entfernt.
  const pendingQuestion = quizState.pendingLetterSearchQuestion ?? null;
  delete quizState.pendingLetterSearchQuestion;

  loadQuestion(quizState.currentIndex, pendingQuestion);
}
