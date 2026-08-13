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

import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";
import { DEFAULT_ROUND_LENGTH } from "../quiz/questionGenerator.js";
import { createQuizState } from "../quiz/state.js";

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
    label: "Einfach",
    hint: "6–10 Jahre",
  },
  {
    value: DIFFICULTY_LEVELS.HARD,
    label: "Knifflig",
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

  container.innerHTML = `
    <section class="start-screen" aria-labelledby="start-title">
      <p class="start-screen__mascot" aria-hidden="true">🦁</p>
      <h1 id="start-title" class="start-screen__title">Tierquiz</h1>
      <p class="start-screen__intro">Wähle deine Stufe und leg los!</p>

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

  const difficultyButtons = Array.from(
    container.querySelectorAll(".difficulty-button"),
  );
  const roundLengthChips = Array.from(
    container.querySelectorAll(".round-length-chip"),
  );
  const startButton = container.querySelector(".start-button");

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
    );

    onStart?.(quizState);
  });
}
