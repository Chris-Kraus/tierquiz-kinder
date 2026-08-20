// Spielbildschirm für den "Tier-Memory"-Modus (Issue #45). Klassisches
// Memory/Concentration: zwei Karten pro Tier zeigen dasselbe Live-Thumbnail
// (kein Bild+Name-Paar), siehe design.md, Abschnitt "Neuer Spielmodus
// 'Tier-Memory'". Wiederverwendet den Bild-Rateshilfe-Mechanismus aus Issue
// #16/#28 (imageHint.js) über die neue Batch-Vorab-Auflösung in
// src/quiz/memory.js (buildMemoryDeck) sowie den bestehenden
// Infosatz-/Wikipedia-Link-/Fun-Fact-Baustein aus question.js/
// reverseQuestion.js (buildInfoSentence, Issue #12/#15/#24) — identisches
// Markup/dieselben CSS-Klassen, kein neuer Textstil.
//
// Anders als question.js/reverseQuestion.js/soundQuestion.js hält dieser
// Bildschirm KEINEN Bezug zu state.questions/roundLength/currentIndex
// (architecture.md, "Finale technische Leitplanken", Punkt 3/4): der
// komplette Kartenzustand (aufgedeckt/gelöst/verdeckt je Karte, aktuell
// aufgedeckte Karte(n), Versuchszähler) lebt rein lokal in dieser Datei.
// Einziger Touchpunkt zu quiz/state.js ist quizState.mode/quizState.difficulty
// (von start.js gesetzt) sowie optional die beiden transienten Felder
// `pendingMemoryDeck`/`pendingMemoryDeckDifficulty` (siehe start.js,
// analog zu pendingReverseQuestion/pendingSoundQuestion) — wird das bereits
// beim Moduseinstieg erfolgreich aufgelöste Deck NICHT für dieselbe
// Schwierigkeitsstufe wiederverwendet (z. B. weil das Kind die Stufe nach dem
// Antippen der Kachel noch geändert hat), baut dieser Bildschirm das Deck
// selbst frisch auf — sichtbar über denselben Ladezustand wie beim
// Moduseinstieg, kein Sonderfall nötig.
//
// Rundenende: sobald alle Paare gelöst sind, ruft dieser Bildschirm
// `onFinish` NICHT mit einem regulären quizState auf (es gibt keine
// Einzelfragen/keinen Score im bisherigen Sinn), sondern mit einem eigenen,
// schlanken Ergebnis-Objekt ({ mode, difficulty, memoryPairCount,
// memoryAttempts }) — src/screens/result.js erkennt `mode === GAME_MODE.MEMORY`
// und zeigt dafür einen angepassten, durchweg wertschätzenden Text statt
// "X von Y richtig" (design.md) und speichert bewusst KEINEN Eintrag in der
// Ergebnis-Verlaufsliste (#14/#36).

import animalsData from "../../data/animals.json";
import {
  buildMemoryDeck,
  checkMatch,
  MEMORY_CARD_IMAGE_ALT_TEXT,
} from "../quiz/memory.js";
import { getMemoryPairCountForDifficulty } from "../quiz/difficulty.js";
import { buildInfoSentence } from "../quiz/infoSentence.js";
import { GAME_MODE } from "../quiz/gameMode.js";
import { addCollectedAnimal } from "../quiz/album.js";
import { triggerConfetti } from "../quiz/confetti.js";

// design.md, "Interaktion": "ca. 1 Sekunde — lang genug zum Erkennen, kurz
// genug um keine Wartezeit-Frustration zu erzeugen".
const MISMATCH_PAUSE_MS = 1000;

/**
 * Rendert den Tier-Memory-Bildschirm in den übergebenen Container und steuert
 * die komplette Runde (Laden aller Kartenbilder, Karten-Interaktion,
 * Rundenende).
 * @param {HTMLElement} container
 * @param {object} quizState Zustand aus createQuizState (siehe state.js),
 *   `mode` sollte GAME_MODE.MEMORY sein (Aufrufer/main.js entscheidet das,
 *   dieser Bildschirm prüft es selbst nicht). Nutzt nur `difficulty` sowie
 *   optional die transienten `pendingMemoryDeck`/`pendingMemoryDeckDifficulty`
 *   Felder (siehe Datei-Kommentar oben).
 * @param {object} [callbacks]
 * @param {(result: {mode: string, difficulty: string, memoryPairCount: number, memoryAttempts: number}) => void} [callbacks.onFinish]
 *   wird aufgerufen, sobald alle Paare gefunden sind.
 */
export function renderMemoryScreen(container, quizState, { onFinish } = {}) {
  const pairCount = getMemoryPairCountForDifficulty(quizState.difficulty);
  const animalById = new Map(
    animalsData.animals.map((animal) => [animal.id, animal]),
  );

  container.innerHTML = `
    <section class="memory-screen" aria-labelledby="memory-heading">
      <!-- Redesign (Issue #76, design.md "Tier-Memory"): Kopfzeile mit Titel
           + zwei Pills (Paare/Versuche) statt reinem Fließtext-Fortschritt.
           .memory-screen__progress bleibt als reines Live-Region-Element für
           Screenreader erhalten (visuell redundant zu den Pills, aber schon
           vorhandene, funktionierende aria-live-Ankündigung — kein Grund,
           das anzufassen). -->
      <div class="memory-screen__header">
        <h2 id="memory-heading" class="memory-screen__title">Finde die Tierpaare!</h2>
        <div class="memory-screen__pills">
          <span class="memory-screen__pill memory-screen__pill--pairs"></span>
          <span class="memory-screen__pill memory-screen__pill--attempts"></span>
        </div>
      </div>
      <!-- Bleibt in der Barrierefreiheits-Struktur (kein hidden-Attribut,
           das würde auch aria-live für Screenreader unwirksam machen) --
           visuell versteckt, da dieselbe Information jetzt in den Pills
           oben sichtbar ist (siehe .visually-hidden in global.css). -->
      <p class="memory-screen__progress visually-hidden" aria-live="polite"></p>

      <!-- Ladezustand vor Rundenstart (architecture.md: "einheitlicher
           Ladebildschirm vor Rundenstart, keinen Pro-Karte-Ladezustand") —
           deckt sowohl den initialen Deck-Aufbau als auch einen erneuten
           Aufbau bei fehlendem/nicht wiederverwendbarem Testabruf-Ergebnis
           ab (siehe Datei-Kommentar oben). Gleiches Lade-/Fehlerzustand-Muster
           wie .reverse-image-frame in reverseQuestion.js, hier aber für das
           gesamte Brett statt ein einzelnes Bild. -->
      <div class="memory-board-status" aria-live="polite" aria-busy="true">
        <div class="memory-board-status__loading">
          <span class="memory-board-status__icon" aria-hidden="true">🐾</span>
          <p class="memory-board-status__text">Karten werden vorbereitet …</p>
        </div>
        <div class="memory-board-status__error" hidden>
          <span class="memory-board-status__icon" aria-hidden="true">🙈</span>
          <p class="memory-board-status__text">
            Die Karten wollen gerade nicht laden.
          </p>
          <button type="button" class="memory-board-status__retry-button k-btn">
            Nochmal versuchen
          </button>
        </div>
      </div>

      <!-- Karten-Grid (design.md: "Scrollen ist hier ausdrücklich zulässig",
           anders als question.js/reverseQuestion.js — kein
           Kein-Scrollen-Zwang für dieses Board). Echte <button>-Elemente,
           per Tastatur bedienbar (design.md, "Barrierefreiheit"). -->
      <div
        class="memory-board"
        role="group"
        aria-label="Memory-Karten"
        hidden
      ></div>

      <!-- Infosatz + Wikipedia-Link nach einem Treffer: identisches
           Markup/dieselben CSS-Klassen wie question.js/reverseQuestion.js
           (Issue #12/#15), bewusst wiederverwendet statt eines neuen
           Textstils. Bleibt sichtbar bis zur nächsten Kartenauswahl (siehe
           resetFeedback() unten), fester reservierter Bereich (kein
           Layout-Sprung). -->
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

      <!-- Fun Fact (Issue #24), identisches Markup wie question.js. -->
      <p class="question-screen__fun-fact" hidden>
        <span class="question-screen__fun-fact-icon" aria-hidden="true">💡</span>
        <span class="question-screen__fun-fact-lead">Wusstest du schon?</span>
        <span class="question-screen__fun-fact-text"></span>
      </p>

      <!-- Redesign (Issue #76, design.md "Tier-Memory"): Fußnote unterhalb
           des Bretts + Konfetti-Container (Trigger bei jedem gefundenen
           Paar, siehe #69/handleCardClick unten). -->
      <p class="memory-screen__footnote">
        Tippe zwei Karten an. Passen sie zusammen, bleiben sie offen — und
        das Tier wandert ins Album.
      </p>
      <div class="feedback-panel__confetti" aria-hidden="true"></div>
    </section>
  `;

  const progressEl = container.querySelector(".memory-screen__progress");
  const pairsPillEl = container.querySelector(
    ".memory-screen__pill--pairs",
  );
  const attemptsPillEl = container.querySelector(
    ".memory-screen__pill--attempts",
  );
  const confettiContainerEl = container.querySelector(
    ".feedback-panel__confetti",
  );
  const statusEl = container.querySelector(".memory-board-status");
  const loadingEl = container.querySelector(".memory-board-status__loading");
  const errorEl = container.querySelector(".memory-board-status__error");
  const retryButton = container.querySelector(
    ".memory-board-status__retry-button",
  );
  const boardEl = container.querySelector(".memory-board");
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

  let deck = null;
  let cardButtons = new Map(); // cardId -> button
  let flippedCards = []; // aktuell aufgedeckte, noch unbestätigte Karten
  let solvedCount = 0;
  let attempts = 0;
  // Bewacht gegen veraltete Ladeergebnisse (gleiches Muster wie
  // loadRequestId in reverseQuestion.js), falls "Nochmal versuchen"
  // schnell mehrfach getippt wird.
  let loadRequestId = 0;

  function updateProgress() {
    progressEl.textContent = `${solvedCount} von ${pairCount} Paaren gefunden`;
    // Redesign (Issue #76, design.md "Tier-Memory"): sichtbare Pills statt
    // reinem Fließtext — progressEl bleibt als aria-live-Ankündigung für
    // Screenreader bestehen (siehe Template-Kommentar oben).
    pairsPillEl.textContent = `Paare ${solvedCount} von ${pairCount}`;
    attemptsPillEl.textContent = `Versuche ${attempts}`;
  }

  // design.md: der Infotext-Bereich verschwindet, sobald das Kind die
  // nächste Karte antippt — wird deshalb bei jedem neuen Kartenklick zuerst
  // zurückgesetzt (siehe handleCardClick unten).
  function resetFeedback() {
    infoSentenceEl.hidden = true;
    infoSentenceTextEl.textContent = "";
    wikipediaLinkEl.hidden = true;
    wikipediaLinkEl.href = "#";
    wikipediaLinkTextEl.textContent = "";
    funFactEl.hidden = true;
    funFactTextEl.textContent = "";
  }

  function showLoadingState() {
    statusEl.hidden = false;
    statusEl.setAttribute("aria-busy", "true");
    loadingEl.hidden = false;
    errorEl.hidden = true;
    boardEl.hidden = true;
    boardEl.innerHTML = "";
    cardButtons = new Map();
    flippedCards = [];
    resetFeedback();
  }

  function showErrorState() {
    statusEl.setAttribute("aria-busy", "false");
    loadingEl.hidden = true;
    errorEl.hidden = false;
    boardEl.hidden = true;
  }

  // Setzt Optik + Barrierefreiheits-Zustand einer Karte (design.md,
  // "Barrierefreiheit": aria-label je Zustand, KEIN Tiername im Alt-Text
  // verdeckter/aufgedeckter Karten — sonst wäre die Merkaufgabe für
  // Screenreader-Nutzer:innen trivial). `MEMORY_CARD_IMAGE_ALT_TEXT` ist
  // bewusst generisch ("Tierbild"), die Kartenposition macht jede Karte
  // trotzdem eindeutig ansprechbar.
  function setCardRevealed(button, revealed, position) {
    const frontEl = button.querySelector(".memory-card__front");
    const backEl = button.querySelector(".memory-card__back");
    frontEl.hidden = !revealed;
    backEl.hidden = revealed;
    button.classList.toggle("memory-card--revealed", revealed);
    button.setAttribute("aria-pressed", String(revealed));
    button.setAttribute(
      "aria-label",
      revealed
        ? `${MEMORY_CARD_IMAGE_ALT_TEXT}, Karte ${position}`
        : `Verdeckte Karte, Karte ${position}`,
    );
  }

  function setCardSolved(button, position) {
    button.classList.add("memory-card--solved");
    button.setAttribute("aria-pressed", "true");
    button.setAttribute(
      "aria-label",
      `${MEMORY_CARD_IMAGE_ALT_TEXT}, Karte ${position}, gefunden`,
    );
  }

  // Sperrt/entsperrt alle noch nicht gelösten Karten (design.md: "Während
  // dieser Pause sind alle übrigen Karten kurz gesperrt (kein drittes
  // Aufdecken), identisches Sperr-Prinzip wie bei den Quiz-Antwortkacheln").
  // Bereits gelöste Paare bleiben unabhängig davon immer disabled.
  function setBoardLocked(locked) {
    cardButtons.forEach((button) => {
      if (button.classList.contains("memory-card--solved")) return;
      button.disabled = locked;
    });
  }

  function handleCardClick(button) {
    if (button.disabled) return; // gelöst, bereits aufgedeckt oder gesperrt

    const cardId = button.dataset.cardId;
    const card = deck.find((c) => c.cardId === cardId);
    if (!card) return;

    const position = Number(button.dataset.position);

    resetFeedback();
    button.disabled = true;
    setCardRevealed(button, true, position);
    flippedCards.push({ card, button, position });

    if (flippedCards.length < 2) return;

    attempts += 1;
    // Redesign (Issue #76): Versuche-Pill muss nach JEDEM Versuch aktuell
    // sein, nicht nur bei Treffer (echter Fund: der bisherige einzige
    // updateProgress()-Aufruf unten lief nur im Treffer-Zweig, die Pill
    // blieb bei einem Fehlversuch bis zum nächsten Treffer veraltet). Nur
    // die Pill direkt aktualisieren, nicht die volle updateProgress()
    // (die auch den aria-live-Text neu setzt) — sonst würde ein
    // Fehlversuch den unveränderten "X von Y Paaren"-Text erneut per
    // aria-live ankündigen.
    attemptsPillEl.textContent = `Versuche ${attempts}`;
    const [first, second] = flippedCards;
    flippedCards = [];

    if (checkMatch(first.card, second.card)) {
      setCardSolved(first.button, first.position);
      setCardSolved(second.button, second.position);
      solvedCount += 1;
      updateProgress();
      showMatchFeedback(first.card.animalId);

      if (solvedCount >= pairCount) {
        onFinish?.({
          mode: GAME_MODE.MEMORY,
          difficulty: quizState.difficulty,
          memoryPairCount: pairCount,
          memoryAttempts: attempts,
        });
      }
      return;
    }

    // Kein Treffer: kurze Pause, danach automatisch wieder verdecken
    // (design.md: "bewusst automatisch statt über einen manuellen
    // 'Weiter'-Button").
    setBoardLocked(true);
    setTimeout(() => {
      setCardRevealed(first.button, false, first.position);
      setCardRevealed(second.button, false, second.position);
      setBoardLocked(false);
    }, MISMATCH_PAUSE_MS);
  }

  function showMatchFeedback(animalId) {
    const animal = animalById.get(animalId);
    if (!animal) return;

    // Redesign (Issue #68/#69/#76, design.md "Tier-Memory"/"Album"): jedes
    // gefundene Paar sammelt das Tier ins Album und löst Konfetti aus
    // (README: "Auslöser: jede richtige Antwort, jedes Memory-Paar").
    addCollectedAnimal(animal.id);
    triggerConfetti(confettiContainerEl);

    infoSentenceTextEl.textContent = buildInfoSentence(animal);
    infoSentenceEl.hidden = false;

    if (animal.wikipedia_url_de) {
      wikipediaLinkEl.href = animal.wikipedia_url_de;
      wikipediaLinkTextEl.textContent = `Mehr über ${animal.name_de} auf Wikipedia lesen`;
      wikipediaLinkEl.hidden = false;
    }

    if (animal.fun_fact) {
      funFactTextEl.textContent = animal.fun_fact;
      funFactEl.hidden = false;
    }
  }

  function showBoard(cards) {
    deck = cards;
    solvedCount = 0;
    attempts = 0;
    flippedCards = [];

    boardEl.innerHTML = cards
      .map((card, index) => {
        const position = index + 1;
        return `
          <button
            type="button"
            class="memory-card"
            data-card-id="${card.cardId}"
            data-position="${position}"
            aria-pressed="false"
            aria-label="Verdeckte Karte, Karte ${position}"
          >
            <span class="memory-card__back" aria-hidden="true">🐾</span>
            <img class="memory-card__front" src="${card.thumbUrl}" alt="" hidden />
          </button>
        `;
      })
      .join("");

    cardButtons = new Map(
      Array.from(boardEl.querySelectorAll(".memory-card")).map((button) => [
        button.dataset.cardId,
        button,
      ]),
    );
    cardButtons.forEach((button) => {
      button.addEventListener("click", () => handleCardClick(button));
    });

    statusEl.hidden = true;
    boardEl.hidden = false;
    updateProgress();
  }

  async function loadDeck() {
    const requestId = ++loadRequestId;
    showLoadingState();
    updateProgress();

    // Testabruf-Ergebnis vom Start-Bildschirm wiederverwenden (siehe
    // Datei-Kommentar oben), aber NUR wenn es für dieselbe Schwierigkeitsstufe
    // aufgebaut wurde — sonst hätte das Brett die falsche Kartenanzahl.
    let cards = null;
    if (
      Array.isArray(quizState.pendingMemoryDeck) &&
      quizState.pendingMemoryDeckDifficulty === quizState.difficulty
    ) {
      cards = quizState.pendingMemoryDeck;
    }
    delete quizState.pendingMemoryDeck;
    delete quizState.pendingMemoryDeckDifficulty;

    if (!cards) {
      try {
        cards = await buildMemoryDeck(animalsData.animals, quizState.difficulty);
      } catch {
        if (requestId !== loadRequestId) return;
        showErrorState();
        return;
      }
    }

    if (requestId !== loadRequestId) return;
    showBoard(cards);
  }

  retryButton.addEventListener("click", () => {
    loadDeck();
  });

  loadDeck();
}
