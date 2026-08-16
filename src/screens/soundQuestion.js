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
// Seit Issue #41/#42: Infosatz (Issue #12) inkl. Wikipedia-Link (Issue #15),
// Fun Fact (Issue #24) sowie das automatische Feedback-Bild (Issue #30) NACH
// der Antwort, analog zu question.js/reverseQuestion.js (siehe dortiger
// Datei-Kommentar sowie design.md, Abschnitte "Infosatz + Wikipedia-Link +
// Fun Fact im 'Tiergeräusche'-Modus" und "Automatische Bildanzeige im
// Feedback des 'Tiergeräusche'-Modus"). Anders als question.js gibt es hier
// bewusst KEINEN Pre-Answer-Bild-Button (architecture.md, Issues #41/#42:
// "kein Duplikat-Check nötig" — der automatische Abruf läuft bei jeder
// Antwort ohne Sonderfall). Dafür braucht dieser Bildschirm — anders als
// reverseQuestion.js, das seinen animalById-Lookup bereits seit #35 hat —
// einen neuen `animalById`-Lookup (architecture.md, Issues #41/#42: Sound-
// Fragenobjekte tragen nur `animalId`/`animalName`, nicht das volle
// Tier-Objekt).
//
// Seit Issue #43: echtes Play/Stop-Toggle am Play-Button (architecture.md,
// Issue #43) — ein Klick während laufender Wiedergabe stoppt den Ton und
// setzt ihn auf Anfang zurück, statt ihn (wie bisher) unbedingt neu zu
// starten. Zustandsabfrage über `audioEl.paused`, Icon-/Label-Sync über die
// bereits vorhandenen `playing`-/einen neuen `pause`-Listener — kein neuer
// globaler State.
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
// Issue #41: Infosatz-Mechanismus 1:1 aus question.js/reverseQuestion.js
// wiederverwendet (architecture.md, Issues #41/#42: "buildInfoSentence() ...
// unverändert übertragbar").
import { buildInfoSentence } from "../quiz/infoSentence.js";
// Issue #42: automatisches Feedback-Bild — dieselben reinen, DOM-/fetch-
// freien Hilfsfunktionen wie question.js (Issue #30), keine eigene Kopie
// nötig (architecture.md, Issues #41/#42: "imageHint.js-Hilfsfunktionen ...
// unverändert wiederverwendbar").
import {
  buildCommonsImageInfoUrl,
  extractImageInfo,
  buildAttribution,
  REQUEST_TIMEOUT_MS,
} from "../quiz/imageHint.js";

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

  // Issue #41/#42: Lookup fürs schnelle Auffinden des vollen Tier-Objekts
  // (wikipedia_url_de/fun_fact/image_filename/…) zu einer Frage
  // (question.animalId) — identisches Muster wie animalById in question.js/
  // reverseQuestion.js. Das Fragen-Objekt aus generateNextSoundQuestion trägt
  // selbst nur die fürs Raten nötigen Felder (audio/attribution/options/
  // animalId/animalName), nicht das komplette Tier-Objekt (architecture.md,
  // Issues #41/#42).
  const animalById = new Map(
    animalsData.animals.map((animal) => [animal.id, animal]),
  );

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

      <!-- Issue #42: automatische Bild-Anzeige NACH der Antwort — identisches
           Markup/dieselben Klassen wie question.js (Issue #30), damit Optik/
           Verhalten (inkl. bestehendem CSS) unverändert übernommen werden.
           Anders als question.js gibt es hier keinen Pre-Answer-Bild-Button,
           daher entfällt der dortige Duplikat-Check (architecture.md, Issues
           #41/#42). Bleibt per hidden-Attribut versteckt, bis
           startFeedbackImageFetch() unten einen Treffer liefert. -->
      <div class="question-screen__feedback-image" hidden>
        <img class="question-screen__feedback-image-img" alt="" />
        <p class="question-screen__feedback-image-attribution">
          <span class="question-screen__feedback-image-attribution-text"></span>
          <a
            class="question-screen__feedback-image-attribution-link"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            hidden
            >(Lizenz)</a
          >
        </p>
      </div>

      <!-- Issue #41: Infosatz inkl. Wikipedia-Link, unterhalb des
           Richtig/Falsch-Feedbacks und des automatischen Feedback-Bilds
           (design.md, "Infosatz + Wikipedia-Link + Fun Fact im
           'Tiergeräusche'-Modus": Reihenfolge Feedback -> Bild -> Infosatz ->
           Fun Fact -> Weiter) — identisches Markup/identische Klassen wie
           question.js/reverseQuestion.js. -->
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

      <!-- Issue #41: Fun Fact — eigenständiger Block unterhalb des
           Infosatz-Blocks, oberhalb des "Weiter"-Buttons (design.md, selber
           Abschnitt). Nur sichtbar, wenn animal.fun_fact vorhanden ist
           (identisches Markup wie question.js, Issue #24). -->
      <p class="question-screen__fun-fact" hidden>
        <span class="question-screen__fun-fact-icon" aria-hidden="true">💡</span>
        <span class="question-screen__fun-fact-lead">Wusstest du schon?</span>
        <span class="question-screen__fun-fact-text"></span>
      </p>

      <button type="button" class="next-button" hidden>Weiter</button>
    </section>
  `;

  const progressEl = container.querySelector(".question-screen__progress");
  const playerFrameEl = container.querySelector(".sound-player-frame");
  const loadingEl = container.querySelector(".sound-player-frame__loading");
  const playButtonEl = container.querySelector(".sound-play-button");
  // Issue #43: Icon-Element wird zwischen 🔊 (abspielbereit) und ⏹️ (spielt
  // gerade) umgeschaltet (design.md, "Play/Pause-Toggle beim
  // Tierlaut-Button").
  const playButtonIconEl = container.querySelector(".sound-play-button__icon");
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

  // Issue #42: Elemente des automatischen Feedback-Bild-Blocks — eigene
  // Referenzen statt Wiederverwendung der Attribution*-Elemente oben
  // (eigenständige DOM-Instanz, analog zu question.js/Issue #30).
  const feedbackImageEl = container.querySelector(
    ".question-screen__feedback-image",
  );
  const feedbackImageImgEl = container.querySelector(
    ".question-screen__feedback-image-img",
  );
  const feedbackImageAttributionTextEl = container.querySelector(
    ".question-screen__feedback-image-attribution-text",
  );
  const feedbackImageAttributionLinkEl = container.querySelector(
    ".question-screen__feedback-image-attribution-link",
  );

  // Issue #41: Infosatz-/Wikipedia-Link-/Fun-Fact-Elemente — identische
  // Referenz-Namen wie in question.js/reverseQuestion.js für einfache
  // Vergleichbarkeit der Bildschirme.
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

  // Issue #43: schaltet Icon + aria-label des Play-Buttons zwischen
  // "abspielbereit" (🔊, Label via updatePlayButtonLabel) und "spielt gerade"
  // (⏹️, "Tierlaut stoppen") um — design.md, "Play/Pause-Toggle beim
  // Tierlaut-Button". Wird von den `playing`-/`pause`-Audio-Events unten
  // aufgerufen, nicht direkt aus dem Klick-Handler (architecture.md, Issue
  // #43: Icon-/Label-Sync über die nativen Events, nicht über den
  // Klick-Handler allein) — dieselbe Modifier-Klasse erlaubt zusätzliches
  // CSS-Styling (global.css).
  function setPlayButtonPlaying(isPlaying) {
    playButtonEl.classList.toggle("sound-play-button--playing", isPlaying);
    playButtonIconEl.textContent = isPlaying ? "⏹️" : "🔊";
    if (isPlaying) {
      playButtonEl.setAttribute("aria-label", "Tierlaut stoppen");
    } else {
      updatePlayButtonLabel();
    }
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
    // Issue #41: bei jeder neuen Frage vollständig zurücksetzen, damit
    // Infosatz/Wikipedia-Link/Fun Fact des vorherigen Tieres nie kurz
    // sichtbar/erreichbar bleiben (identisches Muster wie in question.js/
    // reverseQuestion.js).
    infoSentenceEl.hidden = true;
    infoSentenceTextEl.textContent = "";
    wikipediaLinkEl.hidden = true;
    wikipediaLinkEl.href = "#";
    wikipediaLinkTextEl.textContent = "";
    funFactEl.hidden = true;
    funFactTextEl.textContent = "";
    nextButton.hidden = true;
  }

  // Issue #42: eigener Stale-Response-Schutz für den automatischen Feedback-
  // Bild-Block, analog zu loadRequestId oben, aber als eigenes Paar
  // (eigenständige DOM-Instanz, kein geteilter Zustand mit dem Audio-
  // Ladezustand).
  let feedbackImageRequestId = 0;
  let feedbackImageAbortController = null;

  // Setzt den automatischen Feedback-Bild-Block bei jeder neuen Frage
  // vollständig zurück (kein über die Frage hinaus sichtbares Bild) und
  // bricht einen noch laufenden Abruf der vorherigen Frage aktiv ab
  // (identisches Muster wie resetFeedbackImage in question.js, Issue #30).
  function resetFeedbackImage() {
    feedbackImageRequestId += 1;
    if (feedbackImageAbortController) {
      feedbackImageAbortController.abort();
      feedbackImageAbortController = null;
    }

    feedbackImageEl.hidden = true;
    feedbackImageImgEl.src = "";
    feedbackImageImgEl.alt = "";
    feedbackImageAttributionTextEl.textContent = "";
    feedbackImageAttributionLinkEl.hidden = true;
    feedbackImageAttributionLinkEl.href = "#";
  }

  // Löst den automatischen Bildabruf für den Feedback-Bereich aus (Issue #42,
  // analog zu startFeedbackImageFetch in question.js/Issue #30). Wiederverwendet
  // bewusst dieselben reinen Hilfsfunktionen wie imageHint.js (URL-Bau/
  // Antwort-Parsing/Attribution, keine Logik-Duplikation) und dieselbe
  // Fehlerbehandlung (stiller Ausblend-Pfad, kein Fehlertext). Anders als
  // question.js entfällt hier der Duplikat-Check gegen einen Pre-Answer-Bild-
  // Bereich, den es in diesem Modus bewusst nicht gibt (architecture.md,
  // Issues #41/#42). Läuft nicht-blockierend: der Aufruf hier kehrt sofort
  // zurück, der Rest von handleAnswer (Feedback/Infosatz/Fun Fact/"Weiter")
  // wartet nicht auf das fetch()-Ergebnis.
  function startFeedbackImageFetch(animal) {
    if (!animal?.image_filename) return;

    const requestId = ++feedbackImageRequestId;
    const controller = new AbortController();
    feedbackImageAbortController = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    fetch(buildCommonsImageInfoUrl(animal.image_filename), {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json) => {
        // Zwischenzeitlich wurde bereits zur nächsten Frage gewechselt (z. B.
        // "Weiter" vor Abschluss des Abrufs getippt) -> diese Antwort gehört
        // nicht mehr zum aktuell sichtbaren Feedback-Bereich, nicht mehr
        // anwenden (design.md, "nicht-blockierend").
        if (requestId !== feedbackImageRequestId) return;

        const info = extractImageInfo(json);
        if (!info) return;

        const attribution = buildAttribution(info);
        // Bewusst MIT Tiernamen im Alt-Text (identisch zu question.js/#30):
        // die richtige Antwort ist an dieser Stelle bereits bekannt/
        // angezeigt, ein Klartext-Alt-Text verrät hier nichts.
        feedbackImageImgEl.src = info.thumbUrl;
        feedbackImageImgEl.alt = animal.name_de;
        feedbackImageAttributionTextEl.textContent = attribution.text;
        if (attribution.licenseUrl) {
          feedbackImageAttributionLinkEl.href = attribution.licenseUrl;
          feedbackImageAttributionLinkEl.hidden = false;
        }
        // Poppt still ein (design.md) -- kein Button/Ladezustand, der hier
        // vorher etwas anderes angezeigt hätte.
        feedbackImageEl.hidden = false;
      })
      .catch(() => {
        // Kein Netz, Timeout oder keine verwertbare Antwort -> Block bleibt
        // schlicht ausgeblendet (Default-Zustand), kein Fehlertext, kein
        // Layout-Sprung.
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (requestId === feedbackImageRequestId) {
          feedbackImageAbortController = null;
        }
      });
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
    // Issue #43: expliziter Reset statt Verlass auf das `pause`-Event — die
    // Tests stubben audioEl.pause() als No-Op (jsdom implementiert keine
    // echte Medienwiedergabe), daher muss der Icon-/Label-Zustand hier auch
    // ohne ein tatsächlich gefeuertes Event zurückgesetzt werden.
    setPlayButtonPlaying(false);

    attributionEl.hidden = true;
    attributionTextEl.textContent = "";
    attributionLinkEl.hidden = true;
    attributionLinkEl.href = "#";

    answerGridEl.innerHTML = "";
    tileButtons = [];
    resetFeedback();
    // Issue #42: automatischer Feedback-Bild-Block ist eine eigenständige
    // DOM-Instanz mit eigenem Stale-Response-Schutz — ebenfalls bei jeder
    // neuen Frage vollständig zurücksetzen (siehe resetFeedbackImage oben).
    resetFeedbackImage();
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

  // Play-Button (Issue #43: Play/Stop-Toggle, design.md "Play/Pause-Toggle
  // beim Tierlaut-Button"): ein Tap während laufender Wiedergabe stoppt den
  // Ton und setzt ihn auf Anfang zurück (kein Fortsetzen mitten im Clip,
  // siehe UX-Entscheidung), statt ihn wie bisher unbedingt neu zu starten.
  // Zustandsabfrage über `audioEl.paused` — natives, immer korrektes Flag,
  // kein eigener Tracking-State nötig (architecture.md, Issue #43).
  // `.catch(() => {})` fängt eine Ablehnung des play()-Promise ab (z. B.
  // nicht unterstütztes Audioformat, siehe architecture.md, "bekanntes ...
  // Risiko" zu Ogg Vorbis/Safari) — kein zusätzlicher Fehlerzustand hierfür
  // verlangt, die eigentliche Frage bleibt unabhängig davon normal
  // beantwortbar.
  function handlePlayClick() {
    if (!audioEl.src) return;

    if (!audioEl.paused) {
      audioEl.pause();
      audioEl.currentTime = 0;
      return;
    }

    hasPlayedOnce = true;
    // Synchroner Label-Zwischenstand (bestehendes Verhalten vor #43) — der
    // `playing`-Listener unten überschreibt aria-label/Icon unmittelbar
    // danach auf "Tierlaut stoppen", sobald die Wiedergabe tatsächlich
    // läuft.
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
    // QA-Bug-Report Zyklus 1 (Issue #43): `playing` kann verzögert eintreffen
    // (Zwischen-Puffervorgang, sichtbar an einem vorherigen `waiting`) — hat
    // der Nutzer den Ton zwischenzeitlich per handlePlayClick() bereits
    // wieder gestoppt (audioEl.pause() setzt audioEl.paused synchron auf
    // true), würde ein danach eintreffendes, jetzt veraltetes `playing`-
    // Event den Button sonst fälschlich zurück auf "spielt gerade" schalten,
    // obwohl der Ton nachweislich nicht mehr läuft. Guard analog zum
    // loadRequestId-/feedbackImageRequestId-Stale-Response-Schutz oben,
    // hier aber ohne zusätzlichen Zähler: audioEl.paused ist bereits das
    // native, immer aktuelle Flag für "wurde inzwischen wieder gestoppt" und
    // damit ausreichend, um das veraltete Event zu erkennen und zu
    // ignorieren. Icon/aria-label bleiben dann auf dem vom `pause`-Listener
    // bereits gesetzten "abspielbereit"-Zustand.
    if (audioEl.paused) return;
    // Issue #43: Icon/aria-label auf "spielt gerade" umschalten, sobald die
    // Wiedergabe tatsächlich läuft.
    setPlayButtonPlaying(true);
  });
  // Issue #43: `pause` feuert zuverlässig sowohl bei manuellem
  // audioEl.pause() als auch beim natürlichen Ende der Wiedergabe (Browser
  // setzen `paused = true` und feuern `pause`, bevor `ended` feuert) — ein
  // einziger Listener deckt daher beide Fälle ab, kein separater `ended`-
  // Listener nötig, kein Risiko eines im "spielt gerade"-Zustand hängen-
  // bleibenden Buttons (architecture.md, Issue #43).
  audioEl.addEventListener("pause", () => {
    setPlayButtonPlaying(false);
  });

  function handleAnswer(selectedButton, question) {
    tileButtons.forEach((button) => {
      button.disabled = true;
    });

    const selectedIndex = Number(selectedButton.dataset.optionIndex);
    const selectedOption = question.options[selectedIndex];
    const correctIndex = question.options.findIndex((option) => option.correct);
    const correctButton = tileButtons[correctIndex];
    // Issue #41/#42: einmaliger Lookup, wird sowohl für den automatischen
    // Bildabruf als auch für Infosatz/Wikipedia-Link/Fun Fact unten gebraucht
    // (identisches Muster wie question.js).
    const answeredAnimal = animalById.get(question.animalId);

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

    // Issue #42: automatischer Bildabruf startet in dem Moment, in dem der
    // Feedback-Bereich sichtbar wird — kein Klick nötig, nicht-blockierend
    // (siehe startFeedbackImageFetch oben).
    startFeedbackImageFetch(answeredAnimal);

    // Issue #41: Infosatz wird IMMER angezeigt, unabhängig davon, ob richtig
    // oder falsch geantwortet wurde (identische Regel wie in question.js/
    // reverseQuestion.js) — daher bewusst außerhalb des if/else oben, direkt
    // nach dem Feedback.
    if (answeredAnimal) {
      infoSentenceTextEl.textContent = buildInfoSentence(answeredAnimal);
      infoSentenceEl.hidden = false;
    }

    // Issue #41: Wikipedia-Link nur anzeigen, wenn wikipedia_url_de für das
    // Tier vorhanden ist (kein generischer Such-Link-Fallback, identisch zu
    // question.js/reverseQuestion.js).
    if (answeredAnimal?.wikipedia_url_de) {
      wikipediaLinkEl.href = answeredAnimal.wikipedia_url_de;
      wikipediaLinkTextEl.textContent = `Mehr über ${answeredAnimal.name_de} auf Wikipedia lesen`;
      wikipediaLinkEl.hidden = false;
    }

    // Issue #41: Fun Fact nur anzeigen, wenn animal.fun_fact vorhanden ist —
    // kein Platzhalter/"nicht verfügbar"-Hinweis bei fehlendem Wert
    // (design.md: "Layout darf sich nicht abhängig vom Vorhandensein
    // verschieben"). Wie der Infosatz oben unabhängig davon, ob richtig oder
    // falsch geantwortet wurde.
    if (answeredAnimal?.fun_fact) {
      funFactTextEl.textContent = answeredAnimal.fun_fact;
      funFactEl.hidden = false;
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
  // wiederverwenden statt sie ein zweites Mal abzurufen (analoges Muster zu
  // reverseQuestion.js/pendingReverseQuestion, siehe start.js). Transientes
  // Feld -- wird hier konsumiert und sofort entfernt, damit ein späteres
  // "Nochmal spielen" (neuer quizState, siehe main.js) es nicht versehentlich
  // erneut vorfindet.
  const pendingQuestion = quizState.pendingSoundQuestion ?? null;
  delete quizState.pendingSoundQuestion;

  loadQuestion(quizState.currentIndex, pendingQuestion);
}
