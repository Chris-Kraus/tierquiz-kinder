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
import { triggerConfetti } from "../quiz/confetti.js";
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
// Issue #82, dritter Teil des Sterne-/Maskottchen-Freischaltsystems
// (#80-#83): das `.feedback-panel__mascot`-Feld zeigt Tint + Emoji + Name +
// Rolle des aktiven Maskottchens (siehe question.js, gleiches Prinzip --
// QA-Bugfix Test-Fix-Zyklus 1: Name/Rolle fehlten ursprünglich als Text).
// Rein darstellend bis auf das Emoji, keine Live-Aktualisierung nötig.
import { loadProgress } from "../quiz/progress.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";

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

  const { unlockedIds, activeIdx } = loadProgress();
  const activeMascotId = unlockedIds[activeIdx] ?? 0;
  const activeMascot = MASCOTS[activeMascotId] ?? MASCOTS[0];

  container.innerHTML = `
    <section class="question-screen" aria-labelledby="sound-question-heading">
      <p class="question-screen__progress"></p>

      <div class="question-screen__media">
        <div class="sound-player-frame" aria-live="polite" aria-busy="true">
          <div class="sound-player-frame__loading">
            <span class="sound-player-frame__loading-icon" aria-hidden="true"
              >🎵</span
            >
            <p class="sound-player-frame__loading-text">Ton wird geladen …</p>
          </div>

          <button
            type="button"
            class="sound-play-button k-btn"
            hidden
            aria-busy="false"
            aria-label="Tierlaut abspielen"
          >
            <span class="sound-play-button__icon" aria-hidden="true">🔊</span>
            <span class="sound-play-button__spinner" aria-hidden="true"></span>
          </button>
          <p class="sound-player-frame__hint" hidden>Tippe und hör genau hin!</p>

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

        <audio class="sound-question__audio" preload="none" hidden></audio>

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
      </div>

      <div class="question-screen__body">
      <h2 id="sound-question-heading" class="question-screen__text">
        Welches Tier ist das?
      </h2>

      <div
        class="answer-grid answer-grid--sound"
        role="group"
        aria-label="Antwortmöglichkeiten"
      ></div>
      </div>

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

          <p class="question-screen__fun-fact" hidden>
            <span class="question-screen__fun-fact-icon" aria-hidden="true">💡</span>
            <span class="question-screen__fun-fact-lead">Wusstest du schon?</span>
            <span class="question-screen__fun-fact-text"></span>
          </p>
        </div>

        <div class="feedback-panel__sticker">
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
            <p class="feedback-panel__sticker-name"></p>
          </div>
          <div class="feedback-panel__confetti" aria-hidden="true"></div>
          <button type="button" class="next-button k-btn" hidden>Weiter</button>
        </div>
      </div>
    </section>
  `;

  const progressEl = container.querySelector(".question-screen__progress");
  const playerFrameEl = container.querySelector(".sound-player-frame");
  const loadingEl = container.querySelector(".sound-player-frame__loading");
  const playButtonEl = container.querySelector(".sound-play-button");
  const playButtonHintEl = container.querySelector(
    ".sound-player-frame__hint",
  );
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
  // Redesign (Issue #74): gemeinsamer Feedback-Panel-Wrapper wie question.js
  // (Issue #72) — Sichtbarkeit folgt feedbackEl.hidden.
  const feedbackPanelEl = container.querySelector(".feedback-panel");
  const confettiContainerEl = container.querySelector(
    ".feedback-panel__confetti",
  );
  const stickerNameEl = container.querySelector(
    ".feedback-panel__sticker-name",
  );
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
      // Redesign (Issue #74, design.md "Antwortkacheln"): Ziffern-Badge 1-4
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
    stickerNameEl.textContent = "";
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

  // Issue #103: begrenzter Retry, falls der automatische Abruf fehlschlägt
  // (Timeout, Netzwerkfehler, nicht auflösbare Datei) -- portiert aus
  // question.js/Issue #96 (dort seinerzeit ohne Nachziehen dieser Datei
  // eingeführt, was #103 erst zur strukturell dreimal wahrscheinlicheren
  // Fehlerquelle machte als im inzwischen abgesicherten Quizfragen-Modus).
  // Bewusst dieselbe Anzahl/Semantik wie dort (kein Ausweichen auf ein
  // anderes Zieltier -- das Tier steht durch die bereits gegebene Antwort
  // fest, es wird lediglich derselbe Abruf erneut versucht). 3 Versuche
  // insgesamt (architecture.md, "Bugfix Issue #94" → Fix-Empfehlung: "2–3
  // Versuche insgesamt").
  const FEEDBACK_IMAGE_MAX_ATTEMPTS = 3;

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

    // Ein Versuch (attemptIndex, 0-basiert). Bei Fehlschlag ruft sich die
    // Funktion selbst mit dem nächsten Index auf, solange
    // FEEDBACK_IMAGE_MAX_ATTEMPTS noch nicht erreicht ist und die Frage
    // zwischenzeitlich nicht gewechselt hat (Stale-Response-Schutz bleibt
    // über alle Versuche hinweg wirksam, da requestId je Frage konstant
    // bleibt und bei jedem Reset erhöht wird). Identisch zu question.js/#96.
    function attemptFetch(attemptIndex) {
      const controller = new AbortController();
      feedbackImageAbortController = controller;
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      fetch(buildCommonsImageInfoUrl(animal.image_filename), {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((json) => {
          // Zwischenzeitlich wurde bereits zur nächsten Frage gewechselt
          // (z. B. "Weiter" vor Abschluss des Abrufs getippt) -> diese
          // Antwort gehört nicht mehr zum aktuell sichtbaren Feedback-
          // Bereich, nicht mehr anwenden (design.md, "nicht-blockierend").
          if (requestId !== feedbackImageRequestId) return;

          const info = extractImageInfo(json);
          // Keine verwertbare Antwort (z. B. nicht auflösbare Datei) zählt
          // wie ein Fehlschlag -> löst einen Retry aus, siehe .catch unten.
          if (!info) throw new Error("Kein verwertbares Bild in der Antwort");

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
          // Zwischenzeitlich zur nächsten Frage gewechselt -> keinen Retry
          // mehr anstoßen, die Frage ist nicht mehr aktuell.
          if (requestId !== feedbackImageRequestId) return;

          if (attemptIndex + 1 < FEEDBACK_IMAGE_MAX_ATTEMPTS) {
            attemptFetch(attemptIndex + 1);
            return;
          }

          // Identisch zu Issue #16/#30/#96: nach dem letzten Versuch bleibt
          // der Block schlicht ausgeblendet (Default-Zustand), kein
          // Fehlertext, kein Layout-Sprung -- der Retry macht dieses stille
          // Ausblenden nur seltener, ändert aber nicht dessen Charakter.
        })
        .finally(() => {
          clearTimeout(timeoutId);
          // Nur den eigenen AbortController zurücksetzen, nicht den eines
          // inzwischen gestarteten Retry-Versuchs (der synchron im .catch
          // oben bereits einen neuen Controller gesetzt haben kann, bevor
          // dieses .finally hier ausgeführt wird).
          if (feedbackImageAbortController === controller) {
            feedbackImageAbortController = null;
          }
        });
    }

    attemptFetch(0);
  }

  // Reset vor jedem neuen Ladeversuch: Ton, Attribution und Ladezustand
  // vollständig zurücksetzen (design.md, Abschnitt "Reset" — "identisches
  // Prinzip wie bei #28"), Antwortkacheln/Feedback ebenfalls leeren, da noch
  // keine Frage zum Beantworten da ist.
  function showLoadingState() {
    playerFrameEl.setAttribute("aria-busy", "true");
    loadingEl.hidden = false;
    playButtonEl.hidden = true;
    playButtonHintEl.hidden = true;
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
    playButtonHintEl.hidden = true;
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
    playButtonHintEl.hidden = false;
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
      // QA-Bug-Report Zyklus 2 (Issue #43): bei einem sofortigen Stop-Klick,
      // BEVOR die Wiedergabe tatsächlich begonnen hat (nur `waiting` bereits
      // gefeuert, `playing` steht noch aus, da der Browser noch puffert),
      // blieb aria-busy sonst dauerhaft "true" hängen — es wurde bislang
      // AUSSCHLIESSLICH im `playing`-Handler unten zurückgesetzt, der in
      // diesem Fall nie mehr feuert (der Ton wird ja gerade gestoppt statt
      // gestartet). Direkter, synchroner Reset hier im Stop-Pfad ist
      // deterministisch unabhängig davon, ob/wann ein `pause`-Event eintrifft
      // (siehe zusätzlicher Reset im `pause`-Listener unten als zweite
      // Absicherung) — kein Warten auf einen Event-Rundlauf nötig, der
      // Screenreader-Nutzer sonst kurz (oder im Bug-Fall dauerhaft) im
      // Lade-Spinner-Zustand hängen ließe. Ein `abort`-Event wäre hier keine
      // verlässliche Alternative: `audioEl.pause()` bricht laut Spec nicht
      // zwangsläufig den laufenden Ressourcen-Ladevorgang ab (das täte erst
      // `load()`/ein neuer `src`), `abort` feuert in diesem Szenario daher
      // nicht zuverlässig.
      playButtonEl.setAttribute("aria-busy", "false");
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
    // QA-Bug-Report Zyklus 2 (Issue #43): analog zum bestehenden
    // audioEl.paused-Guard im `playing`-Handler unten (Zyklus 1) — ein
    // `waiting`-Event, das erst NACH einem bereits erfolgten manuellen Stop
    // eintrifft (spät zugestelltes Event aus dem inzwischen abgebrochenen
    // Puffervorgang), darf den Button nicht erneut in den Busy-Zustand
    // versetzen, obwohl der Stop-Klick ihn synchron bereits zurückgesetzt hat
    // (siehe handlePlayClick oben).
    if (audioEl.paused) return;
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
    // QA-Bug-Report Zyklus 2 (Issue #43): zweite, event-basierte Absicherung
    // zusätzlich zum synchronen Reset im Stop-Pfad von handlePlayClick oben —
    // `pause` feuert laut Spec zuverlässig bei JEDEM Übergang von "läuft"/
    // "puffert" zu "gestoppt" (siehe Kommentar unten), unabhängig davon, ob
    // zu diesem Zeitpunkt bereits `playing` gefeuert hat. Deckt damit auch
    // Fälle ab, die (noch) nicht über den Klick-Handler laufen.
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
      feedbackPanelEl.classList.add("feedback-panel--correct");

      // Redesign (Issue #69/#74): Konfetti nur bei richtiger Antwort.
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

    // Redesign (Issue #68/#74, design.md "Sticker-Karte"): Sticker-Karte
    // zeigt das beantwortete Tier, unabhängig von richtig/falsch (gleiches
    // Prinzip wie question.js/reverseQuestion.js). Issue #92: kein Badge mehr
    // -- nur noch Bild+Name (das ehemalige NEU!/SCHAU MAL-Badge war seit #91
    // fest auf "NEU!" verdrahtet, auch für längst bekannte Tiere).
    if (answeredAnimal) {
      stickerNameEl.textContent = answeredAnimal.name_de;
    }

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
