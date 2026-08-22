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
// Issue #24: Fun Fact im Feedback-Schritt. Bewusst EIGENSTÄNDIGER Block neben
// dem Infosatz-Block oben (Issue #12) statt darin integriert — der Infosatz
// baut Sätze ausschließlich aus strukturierten Enum-/Zahlenfeldern über feste
// Satzbausteine (infoSentence.js), `fun_fact` ist dagegen roher, kuratierter
// Freitext ohne Baustein-Fallback-System (siehe architecture.md, "Besonder-
// heiten des Tieres — Deckungsgleich mit fun_fact, aber Anzeige-Code fehlt
// noch"). Keine eigene Logik-Datei nötig (anders als infoSentence.js/
// imageHint.js) — reines Vorhandensein/Text-Auslesen von animal.fun_fact,
// keine Herleitung/Transformation.
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
import { triggerConfetti } from "../quiz/confetti.js";
// Issue #82, dritter Teil des Sterne-/Maskottchen-Freischaltsystems
// (#80-#83): das `.feedback-panel__mascot`-Feld zeigt Tint + Emoji + Name +
// Rolle des über `loadProgress().activeIdx` aktiven Maskottchen -- konsistent
// mit der Guide-Karte auf dem Start-Bildschirm (siehe start.js,
// renderMascotAreaMarkup). QA-Bugfix (Test-Fix-Zyklus 1, Issue-82-Kommentare):
// Name/Rolle fehlten ursprünglich komplett als Text (nur Tint+Emoji). Rein
// darstellend bis auf das Emoji (aria-hidden nur dort), daher reicht ein
// einmaliger Wert beim Rendern, keine Live-Aktualisierung nötig (ein Wechsel
// des aktiven Maskottchens passiert nur über die Maskottchen-Auswahl, die
// diesen Bildschirm ohnehin per onDone -> showQuestionScreen komplett neu
// rendert, siehe main.js).
import { loadProgress } from "../quiz/progress.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";

/**
 * Rendert den Frage-Bildschirm in den übergebenen Container und steuert den
 * kompletten Ablauf einer Runde (Frage 1..N inkl. Feedback/"Weiter").
 * @param {HTMLElement} container
 * @param {object} quizState Zustand aus createQuizState (siehe state.js)
 * @param {object} [callbacks]
 * @param {(quizState: object) => void} [callbacks.onFinish] wird nach der
 *   letzten Frage aufgerufen, sobald das Kind auf "Weiter" tippt.
 * @param {() => void} [callbacks.onProgress] Issue #120: wird nach jeder
 *   Antwort (Score-Änderung) sowie beim Weiterschalten zur nächsten Frage
 *   (Fortschritts-Punkt-Änderung) aufgerufen, damit main.js die Kopfzeile
 *   live aktualisieren kann -- diese Datei kennt renderHeader() selbst
 *   weiterhin nicht (siehe main.js, `updateHeader`).
 */
export function renderQuestionScreen(
  container,
  quizState,
  { onFinish, onProgress } = {},
) {
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

  const { unlockedIds, activeIdx } = loadProgress();
  const activeMascotId = unlockedIds[activeIdx] ?? 0;
  const activeMascot = MASCOTS[activeMascotId] ?? MASCOTS[0];

  container.innerHTML = `
    <section class="question-screen" aria-labelledby="question-heading">
      <p class="question-screen__progress"></p>

      <div class="question-screen__media">
        <button
          type="button"
          class="image-hint-button k-btn"
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
      </div>

      <div class="question-screen__body">
      <h2 id="question-heading" class="question-screen__text"></h2>

      <div
        class="answer-grid"
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
  // Redesign (Issue #72): gemeinsamer Feedback-Panel-Wrapper, siehe
  // Template-Kommentar oben — Sichtbarkeit folgt `feedbackEl.hidden`.
  const feedbackPanelEl = container.querySelector(".feedback-panel");
  const confettiContainerEl = container.querySelector(
    ".feedback-panel__confetti",
  );
  const stickerNameEl = container.querySelector(
    ".feedback-panel__sticker-name",
  );
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
  // Issue #24: Fun-Fact-Block-Elemente — bewusst eigene Referenzen statt
  // Wiederverwendung der Infosatz-Elemente oben (konzeptionell eigenständiger
  // Block, siehe Datei-Kommentar beim buildInfoSentence-Import).
  const funFactEl = container.querySelector(".question-screen__fun-fact");
  const funFactTextEl = container.querySelector(
    ".question-screen__fun-fact-text",
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

  // Issue #30: Elemente des automatischen Feedback-Bild-Blocks — eigene
  // Referenzen statt Wiederverwendung der imageHint*-Elemente oben
  // (eigenständige DOM-Instanz, siehe Datei-Kommentar beim Markup oben).
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

  // Issue #30: eigener Stale-Response-Schutz für den automatischen Feedback-
  // Bild-Block, analog zu imageHintRequestId/imageHintAbortController oben,
  // aber bewusst als eigenes Paar (eigenständige DOM-Instanz, kein geteilter
  // Zustand mit dem Pre-Answer-Mechanismus).
  let feedbackImageRequestId = 0;
  let feedbackImageAbortController = null;

  // Setzt den automatischen Feedback-Bild-Block bei jeder neuen Frage
  // vollständig zurück (kein über die Frage hinaus sichtbares Bild) und
  // bricht einen noch laufenden Abruf der vorherigen Frage aktiv ab.
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

  // Issue #96: begrenzter Retry, falls der automatische Abruf fehlschlägt
  // (Timeout, Netzwerkfehler, nicht auflösbare Datei). Anders als bei Issue
  // #27/28 (reverseQuestionGenerator.js) gibt es hier kein Ausweichen auf ein
  // anderes Zieltier — das Tier steht durch die bereits gegebene Antwort
  // fest, es wird lediglich derselbe Abruf erneut versucht. 3 Versuche
  // insgesamt (architecture.md, "Bugfix Issue #94" → Fix-Empfehlung: "2–3
  // Versuche insgesamt").
  const FEEDBACK_IMAGE_MAX_ATTEMPTS = 3;

  // Löst den automatischen Bildabruf für den Feedback-Bereich aus (Issue #30:
  // "Bild-Rateshilfe: Automatische Anzeige nach der Antwort"). Wiederverwendet
  // bewusst dieselben reinen Hilfsfunktionen wie handleImageHintClick oben
  // (URL-Bau/Antwort-Parsing/Attribution, keine Logik-Duplikation) und
  // dieselbe Fehlerbehandlung (stiller Ausblend-Pfad, kein Fehlertext) — aber
  // in einer eigenen DOM-Instanz mit eigenem Stale-Response-Schutz. Läuft
  // nicht-blockierend: der Aufruf hier kehrt sofort zurück, der Rest von
  // handleAnswer (Feedback/Infosatz/Fun Fact/"Weiter") wartet nicht auf das
  // fetch()-Ergebnis.
  function startFeedbackImageFetch(animal) {
    if (!animal?.image_filename) return;

    // Duplikat-Vermeidung (architecture.md, mit ux-design abgestimmt): Wurde
    // das Bild für diese Frage bereits vor der Antwort manuell aufgedeckt
    // (Pre-Answer-Bereich sichtbar, `resetImageHint()` feuert erst beim
    // Wechsel zur nächsten Frage), wird der automatische Abruf übersprungen —
    // kein zweiter Netzwerk-Call, kein doppeltes Bild auf dem Bildschirm.
    if (!imageHintEl.hidden) return;

    const requestId = ++feedbackImageRequestId;

    // Ein Versuch (attemptIndex, 0-basiert). Bei Fehlschlag ruft sich die
    // Funktion selbst mit dem nächsten Index auf, solange
    // FEEDBACK_IMAGE_MAX_ATTEMPTS noch nicht erreicht ist und die Frage
    // zwischenzeitlich nicht gewechselt hat (Stale-Response-Schutz bleibt
    // über alle Versuche hinweg wirksam, da requestId je Frage konstant
    // bleibt und bei jedem Reset erhöht wird).
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
          // Bewusst MIT Tiernamen im Alt-Text (anders als beim Umkehr-Quiz-
          // Modus #28): die richtige Antwort ist an dieser Stelle bereits
          // bekannt/angezeigt, ein Klartext-Alt-Text verrät hier nichts.
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

          // Identisch zu Issue #16/#30: nach dem letzten Versuch bleibt der
          // Block schlicht ausgeblendet (Default-Zustand), kein Fehlertext,
          // kein Layout-Sprung — der Retry macht dieses stille Ausblenden
          // nur seltener, ändert aber nicht dessen Charakter (Issue #96).
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
      // Redesign (Issue #72, design.md "Antwortkacheln"): Ziffern-Badge 1-4
      // vor der Antwort, wird in handleAnswer auf ✓/✗ überschrieben.
      button.querySelector(".answer-tile__icon").textContent = String(i + 1);
    });
  }

  function showQuestion(index) {
    const question = quizState.questions[index];

    progressEl.textContent = `Frage ${index + 1} von ${totalQuestions}`;
    headingEl.textContent = question.text;

    feedbackPanelEl.hidden = true;
    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackPanelEl.classList.remove(
      "feedback-panel--correct",
      "feedback-panel--incorrect",
    );
    stickerNameEl.textContent = "";
    infoSentenceEl.hidden = true;
    infoSentenceTextEl.textContent = "";
    // Issue #15: bei jeder neuen Frage vollständig zurücksetzen, damit der
    // Link nie kurz mit dem vorherigen Tier sichtbar/erreichbar ist —
    // `hidden` nimmt das <a>-Element zusätzlich aus der Tab-Reihenfolge.
    wikipediaLinkEl.hidden = true;
    wikipediaLinkEl.href = "#";
    wikipediaLinkTextEl.textContent = "";
    // Issue #24: bei jeder neuen Frage vollständig zurücksetzen, damit der
    // Fun Fact des vorherigen Tieres nie kurz sichtbar bleibt (gleiches
    // Muster wie beim Wikipedia-Link oben).
    funFactEl.hidden = true;
    funFactTextEl.textContent = "";
    nextButton.hidden = true;

    // Issue #16: Bild-Rateshilfe bei jeder neuen Frage vollständig
    // zurücksetzen (design.md, Abschnitt "Reset").
    resetImageHint(animalById.get(question.animalId));
    // Issue #30: automatischer Feedback-Bild-Block ist eine eigenständige
    // DOM-Instanz mit eigenem Stale-Response-Schutz — ebenfalls bei jeder
    // neuen Frage vollständig zurücksetzen (siehe resetFeedbackImage oben).
    resetFeedbackImage();

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
    // Vorgezogen (statt wie zuvor erst nach dem Feedback-Text ermittelt), da
    // Issue #30 den animalById-Lookup bereits für den automatischen
    // Bildabruf direkt nach `feedbackEl.hidden = false` unten braucht — ein
    // einziger Lookup statt Duplikation.
    const answeredAnimal = animalById.get(question.animalId);

    selectedButton.setAttribute("aria-pressed", "true");

    // Richtig/Falsch wird nie ausschließlich über Farbe kommuniziert,
    // sondern zusätzlich über Symbol (Icon) und Text (design.md,
    // "Barrierefreiheit", "Keine ausschließlich farbbasierte Codierung").
    if (selectedOption.correct) {
      selectedButton.classList.add("answer-tile--correct");
      selectedButton.querySelector(".answer-tile__icon").textContent = "✓";

      feedbackEl.textContent = "✓ Super gemacht! Das ist richtig!";
      feedbackPanelEl.classList.add("feedback-panel--correct");

      // Redesign (Issue #69/#72, design.md "Feedback-Panel"): Konfetti nur
      // bei richtiger Antwort, nicht bei falscher/aufgelöster.
      triggerConfetti(confettiContainerEl);
    } else {
      selectedButton.classList.add("answer-tile--selected-wrong");
      selectedButton.querySelector(".answer-tile__icon").textContent = "●";

      correctButton.classList.add("answer-tile--correct");
      correctButton.querySelector(".answer-tile__icon").textContent = "✓";

      // Bewusst kein "Falsch!"/rotes X (design.md, "Feedback richtig/falsch"):
      // neutral-freundlicher Text, richtige Antwort wird zusätzlich benannt.
      feedbackEl.textContent = `Fast! Die richtige Antwort ist: ${question.options[correctIndex].text}`;
      feedbackPanelEl.classList.add("feedback-panel--incorrect");
    }

    feedbackPanelEl.hidden = false;
    feedbackEl.hidden = false;

    // Redesign (Issue #68/#72, design.md "Sticker-Karte"): Sticker-Karte
    // zeigt das beantwortete Tier unabhängig davon, ob richtig oder falsch
    // geantwortet wurde (gleiches "richtig wie falsch"-Prinzip wie beim
    // Infosatz/Fun Fact oben, kein Straf-Framing). Issue #92: kein Badge mehr
    // (siehe Template-Kommentar oben) -- nur noch Bild+Name.
    if (answeredAnimal) {
      stickerNameEl.textContent = answeredAnimal.name_de;
    }

    // Issue #30: automatischer Bildabruf startet in dem Moment, in dem der
    // Feedback-Bereich sichtbar wird — kein Klick nötig. Nicht-blockierend:
    // startFeedbackImageFetch kehrt sofort zurück, der übrige Feedback-Ablauf
    // unten (Infosatz/Fun Fact/"Weiter") wartet nicht auf das fetch()-
    // Ergebnis (siehe Funktionskommentar oben).
    startFeedbackImageFetch(answeredAnimal);

    // Issue #12: Infosatz wird IMMER angezeigt, unabhängig davon, ob richtig
    // oder falsch geantwortet wurde (siehe PM-Entscheidung im Issue) — daher
    // hier bewusst außerhalb des if/else oben, direkt nach dem Feedback.
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

    // Issue #24: Fun Fact nur anzeigen, wenn animal.fun_fact vorhanden ist —
    // kein Platzhalter/"nicht verfügbar"-Hinweis bei fehlendem Wert (design.md,
    // "Fun Fact im Feedback-Schritt": "Layout darf sich nicht abhängig vom
    // Vorhandensein verschieben"). Wie der Infosatz oben unabhängig davon, ob
    // richtig oder falsch geantwortet wurde.
    if (answeredAnimal?.fun_fact) {
      funFactTextEl.textContent = answeredAnimal.fun_fact;
      funFactEl.hidden = false;
    }

    recordAnswer(quizState, {
      question,
      selectedText: selectedOption.text,
      correct: selectedOption.correct,
    });
    onProgress?.();

    nextButton.hidden = false;
    nextButton.focus();
  }

  nextButton.addEventListener("click", () => {
    advanceToNextQuestion(quizState);
    onProgress?.();

    if (isQuizFinished(quizState)) {
      onFinish?.(quizState);
      return;
    }

    showQuestion(quizState.currentIndex);
  });

  showQuestion(quizState.currentIndex);
}
