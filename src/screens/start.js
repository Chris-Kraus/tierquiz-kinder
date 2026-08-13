// Start-Bildschirm: Titel, Maskottchen, Schwierigkeitsstufen-Auswahl, Start-Button
// (siehe design.md, "Nutzerfluss" Punkt 1 "Start-Bildschirm" sowie
// "Layout-Empfehlungen", "Visuelle Grundlinie", "Barrierefreiheit").
//
// Ablauf: Kind wählt zuerst eine Schwierigkeitsstufe (zwei große Kacheln), danach
// wird der Start-Button aktiv. Der Frage-Bildschirm existiert technisch noch nicht
// (folgt in Issue #6) – ein Klick auf Start zeigt deshalb bewusst nur einen
// sichtbaren Platzhalter statt zu navigieren.

import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";
import { createQuizState } from "../quiz/state.js";

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
 */
export function renderStartScreen(container) {
  let selectedDifficulty = null;

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

      <button type="button" class="start-button" disabled>Los geht's!</button>

      <p class="start-screen__placeholder" role="status" hidden></p>
    </section>
  `;

  const difficultyButtons = Array.from(
    container.querySelectorAll(".difficulty-button"),
  );
  const startButton = container.querySelector(".start-button");
  const placeholder = container.querySelector(".start-screen__placeholder");

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

  startButton.addEventListener("click", () => {
    if (!selectedDifficulty) {
      return;
    }

    const quizState = createQuizState(selectedDifficulty);

    // Platzhalter, solange der Frage-Bildschirm noch nicht existiert (Issue #6).
    console.info("Quiz gestartet mit Zustand:", quizState);
    placeholder.hidden = false;
    placeholder.textContent = "Frage-Bildschirm folgt (siehe Issue #6).";
  });
}
