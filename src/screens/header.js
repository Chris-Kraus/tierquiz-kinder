// Sterne-Badge (Issue #81, zweiter Teil des Sterne-/Maskottchen-
// Freischaltsystems #80-#83): zeigt den persistenten Sternestand
// "⭐ {stars}/5" (loadProgress() aus progress.js, Issue #80) und wird zum
// animierten, klickbaren Button, sobald genug Sterne für ein neues
// Maskottchen vorhanden sind (canRedeem = stars >= 5 && unlockedIds.length <
// 50). Bewusst UNABHÄNGIG vom `progress`-Options-Objekt weiter unten (das
// meint den Rundenfortschritt/-punktestand, ein komplett anderer Zustand) —
// das Sterne-Badge wird deshalb immer gerendert, auch auf dem Start- und
// Ergebnis-Bildschirm ohne laufende Runde.
//
// Navigation dorthin folgt architecture.md, "Sterne-/Maskottchen-
// Freischaltsystem: Technische Leitplanken", Punkt 3: kein String-basiertes
// `backTo`-Enum, sondern ein neuer optionaler `onOpenMascotChooser`-Callback,
// den main.js bei jedem renderHeader()-Aufruf als Closure über den jeweils
// aktuellen Navigationszustand übergibt (z. B.
// `() => renderMascotChooserScreen(appContent, { onDone: () => showQuestionScreen(quizState) })`).
// Diese Datei kennt renderMascotChooserScreen selbst nicht, ruft nur den
// übergebenen Callback beim Klick auf.
import { loadProgress } from "../quiz/progress.js";

// Kopfzeile (Redesign, Issue #70, schließt Issue #66 "back to home button"
// ab). Wird von main.js bei jedem Bildschirm-Wechsel in einen eigenen
// Kopfzeilen-Container gerendert (siehe main.js, `#app-header` getrennt von
// `#app-content` — jeder Screen rendert weiterhin vollständig in seinen
// eigenen Container, kennt die Kopfzeile also nicht direkt).
//
// Kein bestehender Screen hatte vor diesem Redesign irgendeine Navigations-
// Chrome (verifiziert bei der Analyse für #70) — Issue #66 (leerer
// Platzhalter "back to home button") geht deshalb vollständig in dieser
// gemeinsamen Kopfzeile auf, statt einen isolierten Button pro Screen
// nachzurüsten.
//
// Bekannte Einschränkung dieser Story (siehe Issue #70/#72): Fortschritts-
// Pills/Punktestand zeigen den Stand zum Zeitpunkt des Bildschirm-Wechsels
// (main.js ruft renderHeader() einmal pro Navigation auf). Live-Updates
// *innerhalb* einer laufenden Frage-Runde (z. B. nach jeder beantworteten
// Frage) sind Aufgabe der jeweiligen Screen-Redesign-Story (#72 Quizfragen,
// #75 Buchstabensuche, #76 Memory) — die exportierte `renderHeader()`-
// Funktion ist dafür bereits wiederverwendbar, wird aber in dieser Story
// noch nicht aus den bestehenden Frage-Bildschirmen heraus erneut
// aufgerufen.

// Anzeige-Labels je Spielmodus (siehe design.md, Kopfzeile "Modus-Pill").
// Bewusst eine eigene, vollständige Zuordnung statt quiz/mode.js'
// `getModeLabel()` wiederzuverwenden: jene Funktion ist speziell für die
// Ergebnis-Verlaufsliste gedacht und fällt bei unbekannten Werten auf
// "Quizfragen" zurück (u. a. weil GAME_MODE.MEMORY dort bewusst nicht
// enthalten ist, siehe mode.js) — hier brauchen wir dagegen alle fünf
// tatsächlichen Modi korrekt beschriftet.
const HEADER_MODE_LABELS = Object.freeze({
  quiz: "Quizfragen",
  reverse: "Wer bin ich?",
  sound: "Tiergeräusche",
  memory: "Tier-Memory",
  letterSearch: "Buchstaben",
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Baut das Markup für das persistente Sterne-Badge (Issue #81). Als echtes
 * `<button>`: bei `canRedeem` mit `aria-label` (design.md, "Barrierefreiheit"),
 * sonst `disabled`/`aria-disabled="true"` — ein deaktivierter Button feuert
 * ohnehin keine Klicks, das deckt "Klick auf ein deaktiviertes Badge tut
 * nichts" bereits nativ ab.
 * @param {{stars: number, canRedeem: boolean}} state
 * @returns {string}
 */
function renderStarBadgeMarkup({ stars, canRedeem }) {
  const disabledAttrs = canRedeem ? "" : 'disabled aria-disabled="true"';
  const ariaLabel = canRedeem
    ? ` aria-label="${stars} Sterne — neues Maskottchen wählen"`
    : "";
  return `
    <button
      type="button"
      class="app-header__star-badge${canRedeem ? " app-header__star-badge--redeemable" : ""}"
      ${disabledAttrs}${ariaLabel}
    >⭐ ${stars}/5</button>
  `;
}

function renderProgressDots(currentIndex, roundLength) {
  if (!roundLength || roundLength < 1) return "";
  const dots = [];
  for (let i = 0; i < roundLength; i += 1) {
    let state = "open";
    if (i < currentIndex) state = "answered";
    else if (i === currentIndex) state = "current";
    dots.push(
      `<span class="app-header__progress-dot app-header__progress-dot--${state}"></span>`,
    );
  }
  return dots.join("");
}

/**
 * Rendert die Kopfzeile in den übergebenen Container. Vollständig
 * eigenständig (überschreibt `container.innerHTML`), analog zum Muster der
 * übrigen Screens.
 * @param {HTMLElement} container
 * @param {object} [options]
 * @param {() => void} options.onBackToStart Pflicht-Callback für den Home-Button
 * @param {string} [options.mode] einer der GAME_MODE-Werte (siehe quiz/gameMode.js), steuert die Modus-Pill
 * @param {{currentIndex: number, roundLength: number, score: number}} [options.progress] laufender Rundenstand — weggelassen auf dem Start-Bildschirm
 * @param {() => void} [options.onOpenMascotChooser] Issue #81: wird beim Klick
 *   auf das Sterne-Badge aufgerufen, sofern `canRedeem` (siehe
 *   renderStarBadgeMarkup) — main.js übergibt hier bei jedem Aufruf eine
 *   Closure über den jeweils aktuellen Navigationszustand (siehe
 *   architecture.md, Punkt 3), kein String-basiertes `backTo`. Ein
 *   deaktiviertes Badge feuert ohnehin keine Klicks (natives `disabled`),
 *   daher genügt ein einfaches Event-Listener-Wiring ohne zusätzliche Guard-
 *   Prüfung beim Klick selbst.
 */
export function renderHeader(
  container,
  { onBackToStart, mode, progress, onOpenMascotChooser } = {},
) {
  const modeLabel = mode ? HEADER_MODE_LABELS[mode] : null;

  const { stars, unlockedIds } = loadProgress();
  const canRedeem = stars >= 5 && unlockedIds.length < 50;
  const starBadgeHtml = renderStarBadgeMarkup({ stars, canRedeem });

  const progressHtml = progress
    ? `
      <div class="app-header__progress" role="img" aria-label="Frage ${progress.currentIndex + 1} von ${progress.roundLength}">
        ${renderProgressDots(progress.currentIndex, progress.roundLength)}
      </div>
      <div class="app-header__score" aria-label="Punktestand: ${progress.score} richtig">✓ ${progress.score}</div>
    `
    : "";

  container.innerHTML = `
    <div class="app-header__brand">
      <button type="button" class="app-header__home-button k-btn" aria-label="Zurück zum Start">
        <span class="app-header__logo" aria-hidden="true">🐾</span>
      </button>
      <span class="app-header__wordmark">Tierquiz</span>
      ${modeLabel ? `<span class="app-header__mode-pill">${escapeHtml(modeLabel)}</span>` : ""}
    </div>
    <div class="app-header__status">
      ${starBadgeHtml}
      ${progressHtml}
    </div>
  `;

  const homeButton = container.querySelector(".app-header__home-button");
  if (homeButton && typeof onBackToStart === "function") {
    homeButton.addEventListener("click", onBackToStart);
  }

  const starBadge = container.querySelector(".app-header__star-badge");
  if (starBadge && canRedeem && typeof onOpenMascotChooser === "function") {
    starBadge.addEventListener("click", onOpenMascotChooser);
  }
}
