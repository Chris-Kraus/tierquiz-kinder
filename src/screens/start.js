// Start-Bildschirm: Titel, Maskottchen, Schwierigkeitsstufen-Auswahl,
// Fragenanzahl-Auswahl, Start-Button (siehe design.md, "Nutzerfluss" Punkt 1
// "Start-Bildschirm" sowie "Layout-Empfehlungen", "Visuelle Grundlinie",
// "Barrierefreiheit").
//
// Ablauf: Kind wählt zuerst eine Schwierigkeitsstufe (zwei große Kacheln), danach
// wird der Start-Button aktiv. Ein Klick auf Start erzeugt den Quiz-Zustand und
// übergibt die eigentliche Navigation an den Aufrufer (siehe `onStart`-Callback,
// verdrahtet in src/main.js) – dieser Bildschirm kennt den Frage-Bildschirm
// (Issue #6) bewusst nicht direkt, um die Screens lose gekoppelt zu halten.
//
// Seit Issue #13: zusätzliche Fragenanzahl-Auswahl (5/10/15/20, Standard 10)
// unterhalb der Schwierigkeitsstufen-Auswahl — bewusst als schmale, dezente
// Chip-Reihe statt großer Kacheln (Abstimmung mit `ux-design`, siehe
// Issue-Beschreibung), damit sie klar sekundär zur eigentlich spielrelevanten
// Stufen-Wahl bleibt. Anders als die Schwierigkeitsstufe ist hier bereits ein
// Wert vorbelegt (kein Pflicht-Interaktionsschritt vor dem Spielstart nötig).
//
// Seit Issue #26: zweite Kachelreihe "Was möchtest du spielen?" OBERHALB der
// Schwierigkeitsstufen-Auswahl (design.md, "Modus-Auswahl auf dem
// Start-Bildschirm") — "Quizfragen" (bestehender Modus) bleibt vorbelegt/
// hervorgehoben, "Wer bin ich?" ist der neue, online-abhängige Umkehr-Quiz-
// Modus. Tippt ein Kind auf "Wer bin ich?", löst das einen "Testabruf" aus:
// laut PM-/Architektur-Entscheidung (architecture.md, "1. Umkehr-Quiz" ->
// "Finale technische Leitplanken") ist das kein separater Health-Check,
// sondern schlicht der erste Aufruf der neuen, asynchronen Pro-Frage-
// Generierungsfunktion `generateNextReverseQuestion` aus Issue #27 für Frage
// 1 der Runde. Seit Issue #27 ist src/quiz/reverseQuestionGenerator.js
// vollständig implementiert (Bildauflösung über Wikimedia Commons inkl.
// Retry-Logik bei Fehlschlag, Falschantworten-Ziehung) — der Testabruf hier
// gelingt also inzwischen bei bestehender Internetverbindung tatsächlich.
// Schlägt er dennoch fehl (kein Internet, oder alle Retry-Versuche aus #27
// scheitern), behandelt dieser Screen das weiterhin bewusst wie jeden
// anderen Fehlschlag: freundlicher Hinweis statt Fehlertext, Auswahl
// verbleibt bei "Quizfragen" (der eigentliche Frage-/Feedback-Bildschirm für
// diesen Modus mit Bildanzeige/Attributionszeile folgt erst in Issue #28,
// bis dahin bleibt der Modus über diesen Screen hinaus noch nicht spielbar).
// Ein dezenter Ladezustand direkt in der Kachel
// (Spinner + Label-Wechsel, analog zum bestehenden "Bild zeigen"-Button aus
// Issue #16, siehe question.js/imageHint.js) deckt die kurze Wartezeit ab.
//
// Seit Issue #28: der Modus ist jetzt tatsächlich spielbar (neuer Bildschirm
// src/screens/reverseQuestion.js) — GAME_MODE kommt daher nicht mehr lokal
// aus dieser Datei, sondern aus dem gemeinsamen quiz/gameMode.js (siehe
// dortiger Datei-Kommentar), damit state.js/main.js denselben Wert kennen.
// Zusätzlich wird das Ergebnis des "Testabrufs" (die bereits fertig
// aufgelöste erste Frage) jetzt nicht mehr verworfen, sondern zwischen-
// gespeichert (`pendingReverseQuestion`) und beim Start-Klick an den neuen
// Bildschirm weitergereicht — der spart sich damit einen zweiten,
// überflüssigen Netzwerk-Aufruf für Frage 1 und zeigt sie ohne zusätzlichen
// Ladebildschirm direkt an (design.md: "kein zusätzlicher Ladebildschirm nach
// dem Moduswechsel").
//
// Seit Issue #31: dritte Kachel "Tiergeräusche" (design.md, "Modus-Auswahl
// auf dem Start-Bildschirm: Dritte Kachel 'Tiergeräusche'") — Reihenfolge
// Quizfragen -> Wer bin ich? -> Tiergeräusche folgt der Priorisierung aus
// requirements.md, keine willkürliche Anordnung. Testabruf/Ladezustand/
// Fehlerfallback sind 1:1 dasselbe Muster wie bei "Wer bin ich?" oben (daher
// eigener, aber strukturell identischer Satz an Handlern statt Wieder-
// verwendung eines generischen Mode-Handlers — bewusste Konsistenz mit dem
// bereits etablierten Muster, kein DRY-Zwang an dieser Stelle). Seit dem
// Merge von Issue #32 (echter Fragegenerierungs-Pfad `generateNextSoundQuestion`)
// und #33 (Audio-Player-Bildschirm `soundQuestion.js`) wird das erfolgreiche
// Testabruf-Ergebnis genau wie bei `pendingReverseQuestion` oben
// zwischengespeichert (`pendingSoundQuestion`) und beim Rundenstart an
// `soundQuestion.js` weitergereicht statt es ein zweites Mal abzurufen.
//
// Seit Issue #45: fünfte Kachel "Tier-Memory" — strukturell dasselbe
// Testabruf-/Ladezustand-/Fehlerfallback-Muster wie oben, mit zwei
// Besonderheiten (siehe design.md/architecture.md, "Neuer Spielmodus
// 'Tier-Memory'"): (1) kein Bezug zur Fragenanzahl-Auswahl — die
// Kartenanzahl hängt direkt an der Schwierigkeitsstufe, daher wird die
// `.round-length-picker`-Sektion ausgeblendet, solange dieser Modus gewählt
// ist (kein dritter Auswahlschritt, Akzeptanzkriterium Issue #45). (2) Der
// Testabruf (`buildMemoryDeck`) baut das GESAMTE Kartenset für die aktuell
// gewählte (oder mangels Auswahl per EASY-Platzhalter angenommene)
// Schwierigkeitsstufe — ändert das Kind die Stufe NACH dem Antippen dieser
// Kachel, würde das zwischengespeicherte Deck die falsche Kartenanzahl
// haben. Deshalb wird zusätzlich zum Deck selbst (`pendingMemoryDeck`) die
// Schwierigkeitsstufe gespeichert, für die es aufgebaut wurde
// (`pendingMemoryDeckDifficulty`) — src/screens/memory.js vergleicht diese
// beim Rundenstart gegen die tatsächlich gewählte Stufe und baut bei einer
// Abweichung selbst ein frisches Deck (sichtbar über denselben Ladezustand
// wie beim Moduseinstieg, kein Sonderfall/Bug).

import animalsData from "../../data/animals.json";
import { DIFFICULTY_LEVELS, DIFFICULTY_LABELS } from "../quiz/difficulty.js";
import { DEFAULT_ROUND_LENGTH } from "../quiz/questionGenerator.js";
import { createQuizState } from "../quiz/state.js";
import { generateNextReverseQuestion } from "../quiz/reverseQuestionGenerator.js";
import { generateNextSoundQuestion } from "../quiz/soundQuestionGenerator.js";
// Issue #45: Testabruf für die neue "Tier-Memory"-Kachel ist der erste
// Aufruf von buildMemoryDeck() — gleiches Prinzip wie
// generateNextReverseQuestion/generateNextSoundQuestion oben (architecture.md,
// "Vollständiger Fehlschlag ... wird beim Versuch, den Modus zu betreten
// abgefangen — der Deck-Aufbau ist der Testabruf").
import { buildMemoryDeck } from "../quiz/memory.js";
import { GAME_MODE } from "../quiz/gameMode.js";

// Werte laut UX-Abstimmung zu Issue #13: 4 Chips, gleichermaßen für beide
// Schwierigkeitsstufen (PM-Entscheidung 13.08.2026, siehe Issue-Kommentar).
const ROUND_LENGTH_OPTIONS = [5, 10, 15, 20];

// Labels: design.md nennt "6–10 Jahre"/"10–12 Jahre" und "Einfach"/"Knifflig" als
// gleichwertige Vorschläge, ohne finale Entscheidung (siehe Issue #4, "Offene
// Fragen"). Pragmatische Wahl für diese Umsetzung: beides kombinieren (kindgerechtes
// Label groß, Altersangabe als Zusatzinfo) – zur Abstimmung im Issue-Kommentar
// vermerkt.
const DIFFICULTY_OPTIONS = [
  {
    value: DIFFICULTY_LEVELS.EASY,
    label: DIFFICULTY_LABELS[DIFFICULTY_LEVELS.EASY],
    hint: "6–10 Jahre",
  },
  {
    value: DIFFICULTY_LEVELS.HARD,
    label: DIFFICULTY_LABELS[DIFFICULTY_LEVELS.HARD],
    hint: "10–12 Jahre",
  },
];

/**
 * Rendert den Start-Bildschirm in den übergebenen Container.
 * @param {HTMLElement} container
 * @param {object} [callbacks]
 * @param {(quizState: object) => void} [callbacks.onStart] wird aufgerufen,
 *   sobald das Kind nach Stufenauswahl auf "Los geht's!" tippt; erhält den neu
 *   erzeugten Quiz-Zustand (siehe createQuizState).
 */
export function renderStartScreen(container, { onStart } = {}) {
  let selectedDifficulty = null;
  let selectedRoundLength = DEFAULT_ROUND_LENGTH;
  // Seit Issue #28: welcher Modus aktuell ausgewählt ist, plus (nur für
  // GAME_MODE.REVERSE relevant) die bereits fertig aufgelöste erste Frage aus
  // dem erfolgreichen Testabruf (siehe Datei-Kommentar oben). Wird beim
  // Start-Klick unten an den neu erzeugten Quiz-Zustand angehängt.
  let selectedMode = GAME_MODE.QUIZ;
  let pendingReverseQuestion = null;
  // Analoges Wiederverwendungsfeld für GAME_MODE.SOUND (Issue #33), gleiches
  // Prinzip wie pendingReverseQuestion oben.
  let pendingSoundQuestion = null;
  // Analoges Wiederverwendungsfeld für GAME_MODE.MEMORY (Issue #45) — hier
  // zusätzlich die Schwierigkeitsstufe, für die das Deck aufgebaut wurde
  // (siehe Datei-Kommentar oben, "Besonderheit (2)").
  let pendingMemoryDeck = null;
  let pendingMemoryDeckDifficulty = null;

  container.innerHTML = `
    <section class="start-screen" aria-labelledby="start-title">
      <p class="start-screen__mascot" aria-hidden="true">🦁</p>
      <h1 id="start-title" class="start-screen__title">Tierquiz</h1>
      <p class="start-screen__intro">Wähle deine Stufe und leg los!</p>

      <div class="mode-picker">
        <p id="mode-picker-label" class="mode-picker__label">
          Was möchtest du spielen?
        </p>
        <div
          class="mode-picker__group"
          role="group"
          aria-labelledby="mode-picker-label"
        >
          <button
            type="button"
            class="mode-button mode-button--selected"
            data-mode="${GAME_MODE.QUIZ}"
            aria-pressed="true"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__label">Quizfragen</span>
          </button>
          <button
            type="button"
            class="mode-button"
            data-mode="${GAME_MODE.REVERSE}"
            aria-pressed="false"
            aria-busy="false"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon" aria-hidden="true">🔎</span>
            <span class="mode-button__spinner" aria-hidden="true"></span>
            <span class="mode-button__label">Wer bin ich?</span>
            <span
              class="mode-button__online-icon"
              role="img"
              aria-label="Benötigt Internetverbindung"
              >🌐</span
            >
          </button>
          <button
            type="button"
            class="mode-button"
            data-mode="${GAME_MODE.SOUND}"
            aria-pressed="false"
            aria-busy="false"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon" aria-hidden="true">🔊</span>
            <span class="mode-button__spinner" aria-hidden="true"></span>
            <span class="mode-button__label">Tiergeräusche</span>
            <span
              class="mode-button__online-icon"
              role="img"
              aria-label="Benötigt Internetverbindung"
              >🌐</span
            >
          </button>
          <button
            type="button"
            class="mode-button"
            data-mode="${GAME_MODE.MEMORY}"
            aria-pressed="false"
            aria-busy="false"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon" aria-hidden="true">🧠</span>
            <span class="mode-button__spinner" aria-hidden="true"></span>
            <span class="mode-button__label">Tier-Memory</span>
            <span
              class="mode-button__online-icon"
              role="img"
              aria-label="Benötigt Internetverbindung"
              >🌐</span
            >
          </button>
        </div>
        <p
          class="mode-picker__hint"
          role="status"
          aria-live="polite"
          hidden
        ></p>
      </div>

      <div
        class="difficulty-picker"
        role="group"
        aria-label="Schwierigkeitsstufe wählen"
      >
        ${DIFFICULTY_OPTIONS.map(
          (option) => `
          <button
            type="button"
            class="difficulty-button"
            data-difficulty="${option.value}"
            aria-pressed="false"
          >
            <span class="difficulty-button__check" aria-hidden="true">✓</span>
            <span class="difficulty-button__label">${option.label}</span>
            <span class="difficulty-button__hint">${option.hint}</span>
          </button>
        `,
        ).join("")}
      </div>

      <div class="round-length-picker">
        <p id="round-length-label" class="round-length-picker__label">
          Anzahl der Fragen
        </p>
        <div
          class="round-length-chip-group"
          role="group"
          aria-labelledby="round-length-label"
        >
          ${ROUND_LENGTH_OPTIONS.map(
            (value) => `
            <button
              type="button"
              class="round-length-chip${
                value === DEFAULT_ROUND_LENGTH
                  ? " round-length-chip--selected"
                  : ""
              }"
              data-round-length="${value}"
              aria-pressed="${value === DEFAULT_ROUND_LENGTH}"
            >${value}</button>
          `,
          ).join("")}
        </div>
      </div>

      <button type="button" class="start-button" disabled>Los geht's!</button>
    </section>
  `;

  const modeButtons = Array.from(container.querySelectorAll(".mode-button"));
  const quizModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.QUIZ}"]`,
  );
  const reverseModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.REVERSE}"]`,
  );
  const reverseModeLabelEl = reverseModeButton.querySelector(
    ".mode-button__label",
  );
  const soundModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.SOUND}"]`,
  );
  const soundModeLabelEl = soundModeButton.querySelector(
    ".mode-button__label",
  );
  const memoryModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.MEMORY}"]`,
  );
  const memoryModeLabelEl = memoryModeButton.querySelector(
    ".mode-button__label",
  );
  const modeHintEl = container.querySelector(".mode-picker__hint");

  const difficultyButtons = Array.from(
    container.querySelectorAll(".difficulty-button"),
  );
  const roundLengthPickerEl = container.querySelector(".round-length-picker");
  const roundLengthChips = Array.from(
    container.querySelectorAll(".round-length-chip"),
  );
  const startButton = container.querySelector(".start-button");

  // Markiert genau eine Kachel als ausgewählt (Häkchen + aria-pressed, nicht
  // nur Farbe — siehe design.md, "Barrierefreiheit", "Keine ausschließlich
  // farbbasierte Codierung"), analog zum Schwierigkeitsstufen-Picker unten.
  function setSelectedMode(mode) {
    modeButtons.forEach((button) => {
      const isSelected = button.dataset.mode === mode;
      button.classList.toggle("mode-button--selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function hideModeHint() {
    modeHintEl.hidden = true;
    modeHintEl.textContent = "";
  }

  function showModeHint(message) {
    modeHintEl.textContent = message;
    modeHintEl.hidden = false;
  }

  // Ladezustand-Anzeige direkt in der Kachel (design.md, "Finale
  // Leitplanken": "gleiches Muster wie der bestehende 'Bild zeigen'-Button-
  // Ladezustand") — kein Vollbild-Spinner, keine Sperre der übrigen
  // Bedienung während des Testabrufs.
  function setReverseModeBusy(isBusy) {
    reverseModeButton.disabled = isBusy;
    reverseModeButton.setAttribute("aria-busy", String(isBusy));
    reverseModeLabelEl.textContent = isBusy
      ? "Wird geprüft …"
      : "Wer bin ich?";
  }

  // Identisches Ladezustand-Muster wie setReverseModeBusy oben (Issue #31,
  // design.md-Vorgabe "identisches Muster wie bei 'Wer bin ich?'").
  function setSoundModeBusy(isBusy) {
    soundModeButton.disabled = isBusy;
    soundModeButton.setAttribute("aria-busy", String(isBusy));
    soundModeLabelEl.textContent = isBusy
      ? "Wird geprüft …"
      : "Tiergeräusche";
  }

  // Identisches Ladezustand-Muster wie oben (Issue #45).
  function setMemoryModeBusy(isBusy) {
    memoryModeButton.disabled = isBusy;
    memoryModeButton.setAttribute("aria-busy", String(isBusy));
    memoryModeLabelEl.textContent = isBusy ? "Wird geprüft …" : "Tier-Memory";
  }

  // Issue #45: Fragenanzahl-Auswahl gilt nicht für Tier-Memory (kein dritter
  // Auswahlschritt, siehe Datei-Kommentar oben) — Sichtbarkeit wird bei jedem
  // Moduswechsel neu gesetzt statt nur einmalig, damit ein Zurückwechseln zu
  // "Quizfragen"/"Wer bin ich?"/"Tiergeräusche" die Sektion zuverlässig
  // wieder einblendet.
  function setRoundLengthPickerVisible(visible) {
    roundLengthPickerEl.hidden = !visible;
  }

  quizModeButton.addEventListener("click", () => {
    hideModeHint();
    selectedMode = GAME_MODE.QUIZ;
    // Ein evtl. vorhandenes Testabruf-Ergebnis gehört nur zum jeweiligen
    // Modus -- verwerfen, sobald das Kind zurück zu "Quizfragen" wechselt,
    // damit es nicht versehentlich bei einem späteren erneuten Wechsel
    // wiederverwendet wird (dort läuft ohnehin ein frischer Testabruf).
    pendingReverseQuestion = null;
    pendingSoundQuestion = null;
    pendingMemoryDeck = null;
    pendingMemoryDeckDifficulty = null;
    setSelectedMode(GAME_MODE.QUIZ);
    setRoundLengthPickerVisible(true);
  });

  // requestId-Muster gegen veraltete Antworten bei schnellem Doppel-Tap,
  // analog zu imageHintRequestId in question.js.
  let reverseModeRequestId = 0;

  reverseModeButton.addEventListener("click", async () => {
    hideModeHint();
    const requestId = ++reverseModeRequestId;
    setReverseModeBusy(true);

    try {
      // Testabruf = erster Aufruf von generateNextReverseQuestion für Frage 1
      // der Runde (siehe Datei-Kommentar oben). Die Schwierigkeitsstufe ist an
      // dieser Stelle im Bildschirm-Ablauf ggf. noch nicht gewählt (Modus-
      // Auswahl steht laut design.md bewusst ÜBER der Stufen-Auswahl), EASY
      // dient hier als sinnvoller Platzhalter, falls noch keine gewählt ist.
      // `animalsData.animals` (nicht das rohe Import-Objekt) — gleiche
      // Entpackung wie in question.js, da data/animals.json ein
      // Metadaten-Wrapper ({ schema_version, license, ..., animals: [...] })
      // um die eigentliche Tierliste ist.
      // Seit Issue #28: das Ergebnis wird nicht mehr verworfen, sondern als
      // bereits fertig aufgelöste Frage 1 der Runde zwischengespeichert (siehe
      // Datei-Kommentar oben) statt sie beim Rundenstart ein zweites Mal
      // abzurufen.
      const question = await generateNextReverseQuestion(
        animalsData.animals,
        new Set(),
        selectedDifficulty ?? DIFFICULTY_LEVELS.EASY,
      );

      if (requestId !== reverseModeRequestId) return;
      pendingReverseQuestion = question;
      selectedMode = GAME_MODE.REVERSE;
      setSelectedMode(GAME_MODE.REVERSE);
      // Falls zuvor Tier-Memory gewählt war (Issue #45): dessen Deck gehört
      // nicht mehr zum jetzt gewählten Modus, und die Fragenanzahl-Auswahl
      // gilt für diesen Modus wieder normal.
      pendingMemoryDeck = null;
      pendingMemoryDeckDifficulty = null;
      setRoundLengthPickerVisible(true);
    } catch {
      if (requestId !== reverseModeRequestId) return;
      // Kindgerechtes, nicht-technisches Abfangen (design.md/Issue #26
      // Akzeptanzkriterium): Auswahl bleibt bei "Quizfragen", egal ob der
      // Fehlschlag von fehlendem Internet oder (aktuell immer, solange #27
      // offen ist) vom noch fehlenden Generator kommt.
      pendingReverseQuestion = null;
      selectedMode = GAME_MODE.QUIZ;
      setSelectedMode(GAME_MODE.QUIZ);
      setRoundLengthPickerVisible(true);
      showModeHint("Dafür brauchst du gerade Internet 🌐");
    } finally {
      if (requestId === reverseModeRequestId) {
        setReverseModeBusy(false);
      }
    }
  });

  // requestId-Muster wie beim "Wer bin ich?"-Handler oben, aber ein eigener
  // Zähler — jede Kachel schützt sich nur gegen ihre eigenen veralteten
  // Antworten, ganz wie die beiden Kacheln bereits unabhängig voneinander
  // ihren jeweiligen Ladezustand verwalten.
  let soundModeRequestId = 0;

  soundModeButton.addEventListener("click", async () => {
    hideModeHint();
    const requestId = ++soundModeRequestId;
    setSoundModeBusy(true);

    try {
      // Testabruf = erster Aufruf von generateNextSoundQuestion für Frage 1
      // der Runde (Issue #31 Akzeptanzkriterium: "identisch mit dem ersten
      // Aufruf der neuen Fragegenerierungs-Funktion aus #32"). Der
      // Fehlerfall unten greift bei echtem Netzwerk-/Ladefehler (kein
      // Tier mit Audio erreichbar innerhalb der internen Retries aus #32).
      const question = await generateNextSoundQuestion(
        animalsData.animals,
        new Set(),
        selectedDifficulty ?? DIFFICULTY_LEVELS.EASY,
      );

      if (requestId !== soundModeRequestId) return;
      // Seit Issue #33 (Audio-Player-Bildschirm existiert jetzt): das
      // Ergebnis wird wie bei pendingReverseQuestion oben zwischengespeichert
      // statt es beim Rundenstart ein zweites Mal abzurufen.
      pendingSoundQuestion = question;
      selectedMode = GAME_MODE.SOUND;
      setSelectedMode(GAME_MODE.SOUND);
      // Siehe reverseModeButton-Handler oben: Modus gewechselt weg von
      // Tier-Memory -> dessen Deck verwerfen, Fragenanzahl-Auswahl wieder
      // einblenden.
      pendingMemoryDeck = null;
      pendingMemoryDeckDifficulty = null;
      setRoundLengthPickerVisible(true);
    } catch {
      if (requestId !== soundModeRequestId) return;
      // Kindgerechtes, nicht-technisches Abfangen, identisch zum "Wer bin
      // ich?"-Fehlerfall oben (design.md/Issue #31 Akzeptanzkriterium):
      // Auswahl bleibt bei "Quizfragen".
      pendingSoundQuestion = null;
      selectedMode = GAME_MODE.QUIZ;
      setSelectedMode(GAME_MODE.QUIZ);
      setRoundLengthPickerVisible(true);
      showModeHint("Dafür brauchst du gerade Internet 🌐");
    } finally {
      if (requestId === soundModeRequestId) {
        setSoundModeBusy(false);
      }
    }
  });

  // requestId-Muster wie bei den beiden Handlern oben (Issue #45).
  let memoryModeRequestId = 0;

  memoryModeButton.addEventListener("click", async () => {
    hideModeHint();
    const requestId = ++memoryModeRequestId;
    setMemoryModeBusy(true);

    try {
      // Testabruf = Aufbau des kompletten Kartensets für die aktuell
      // gewählte (oder mangels Auswahl per EASY-Platzhalter angenommene)
      // Schwierigkeitsstufe (architecture.md: "der Deck-Aufbau ist der
      // Testabruf"). Wird beim Rundenstart wiederverwendet, sofern die
      // Schwierigkeitsstufe bis dahin unverändert bleibt (siehe
      // pendingMemoryDeckDifficulty-Vergleich in memory.js).
      const difficultyForTestFetch = selectedDifficulty ?? DIFFICULTY_LEVELS.EASY;
      const deck = await buildMemoryDeck(
        animalsData.animals,
        difficultyForTestFetch,
      );

      if (requestId !== memoryModeRequestId) return;
      pendingMemoryDeck = deck;
      pendingMemoryDeckDifficulty = difficultyForTestFetch;
      selectedMode = GAME_MODE.MEMORY;
      setSelectedMode(GAME_MODE.MEMORY);
      // Issue #45 Akzeptanzkriterium: kein Fragenanzahl-Auswahlschritt für
      // diesen Modus.
      setRoundLengthPickerVisible(false);
    } catch {
      if (requestId !== memoryModeRequestId) return;
      // Kindgerechtes, nicht-technisches Abfangen, identisch zu den beiden
      // Fehlerfällen oben: Auswahl bleibt bei "Quizfragen".
      pendingMemoryDeck = null;
      pendingMemoryDeckDifficulty = null;
      selectedMode = GAME_MODE.QUIZ;
      setSelectedMode(GAME_MODE.QUIZ);
      setRoundLengthPickerVisible(true);
      showModeHint("Dafür brauchst du gerade Internet 🌐");
    } finally {
      if (requestId === memoryModeRequestId) {
        setMemoryModeBusy(false);
      }
    }
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedDifficulty = button.dataset.difficulty;

      difficultyButtons.forEach((otherButton) => {
        const isSelected = otherButton === button;
        otherButton.classList.toggle("difficulty-button--selected", isSelected);
        otherButton.setAttribute("aria-pressed", String(isSelected));
      });

      startButton.disabled = false;
    });
  });

  // Fragenanzahl ist kein Pflichtschritt (siehe Datei-Kommentar oben): schon
  // beim Rendern ist ein Chip (Standardwert) als ausgewählt markiert, der
  // Start-Button hängt nicht von einer Interaktion hier ab.
  roundLengthChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      selectedRoundLength = Number(chip.dataset.roundLength);

      roundLengthChips.forEach((otherChip) => {
        const isSelected = otherChip === chip;
        otherChip.classList.toggle(
          "round-length-chip--selected",
          isSelected,
        );
        otherChip.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });

  startButton.addEventListener("click", () => {
    if (!selectedDifficulty) {
      return;
    }

    const quizState = createQuizState(
      selectedDifficulty,
      [],
      selectedRoundLength,
      selectedMode,
    );

    // Seit Issue #28/#33: die bereits fertig aufgelöste erste Frage (aus dem
    // erfolgreichen Testabruf oben) wird als transientes Feld mitgegeben --
    // reverseQuestion.js/soundQuestion.js lesen/löschen es beim ersten
    // Rendern (siehe jeweiliger Datei-Kommentar) statt sie ein zweites Mal
    // abzurufen. Ist aus irgendeinem Grund keine vorhanden (z. B. Modus
    // wurde ohne vorherigen Testabruf-Erfolg gesetzt), holt sich der
    // jeweilige Bildschirm Frage 1 einfach ganz normal selbst -- kein
    // Absturz.
    if (selectedMode === GAME_MODE.REVERSE && pendingReverseQuestion) {
      quizState.pendingReverseQuestion = pendingReverseQuestion;
    }
    if (selectedMode === GAME_MODE.SOUND && pendingSoundQuestion) {
      quizState.pendingSoundQuestion = pendingSoundQuestion;
    }
    // Issue #45: analoges Wiederverwendungsfeld für Tier-Memory — memory.js
    // prüft beim Rendern zusätzlich, ob pendingMemoryDeckDifficulty noch zur
    // tatsächlich gewählten Schwierigkeitsstufe passt (siehe Datei-Kommentar
    // oben), baut sonst selbst ein frisches Deck.
    if (selectedMode === GAME_MODE.MEMORY && pendingMemoryDeck) {
      quizState.pendingMemoryDeck = pendingMemoryDeck;
      quizState.pendingMemoryDeckDifficulty = pendingMemoryDeckDifficulty;
    }

    onStart?.(quizState);
  });
}
