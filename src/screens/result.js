// Ergebnis-/Abschluss-Bildschirm: Punktestand, "Nochmal spielen" / "Zurück zum
// Start" (siehe design.md, "Nutzerfluss" Punkt 6 "Ergebnis-/Abschluss-
// Bildschirm"; Issue #7).
//
// Zeigt die erreichte Punktzahl plus einen durchweg ermutigenden Satz –
// unabhängig vom Ergebnis, auch bei 0 von N richtigen Antworten gibt es kein
// Scheitern-Framing (design.md: "kein Scheitern-Framing selbst bei niedriger
// Punktzahl"). Die beiden Folgeaktionen kennen den Start-Bildschirm bewusst
// nicht direkt, sondern melden sich nur über Callbacks beim Aufrufer
// (src/main.js) – analog zum bisherigen Kopplungsmuster von start.js/
// question.js.
//
// Seit Issue #14: Beim Rendern wird das Rundenergebnis zusätzlich lokal in
// `localStorage` protokolliert (siehe src/quiz/history.js) und optional als
// eingeklappte Verlaufsliste unterhalb der beiden Folgeaktionen angeboten
// (Abstimmung mit `ux-design`: dezenter, standardmäßig eingeklappter Bereich,
// nie automatisch eingeblendet, keine wertende Rangfolgen-Optik). Nutzt dafür
// natives `<details>/<summary>` statt eigener Toggle-/ARIA-Logik – das ist
// von Haus aus per Tastatur bedienbar (Akzeptanzkriterium Issue #14) und
// braucht keinen zusätzlichen Event-Wire-up für den Auf-/Zuklapp-Zustand.
// Ist `localStorage` nicht verfügbar/blockiert, liefert history.js ein leeres
// Ergebnis und der gesamte Bereich wird einfach nicht gerendert (kein
// Absturz, keine technische Fehlermeldung im Kind-UI).
//
// Seit Issue #36 (Abstimmung mit `software-architect`/`ux-design`,
// 15.08.2026) zusätzlich: Jeder Eintrag zeigt den gespielten Spielmodus in
// der Metazeile und hat ein dezentes Lösch-Steuerelement (sofort, ohne
// Bestätigung); unterhalb der Liste gibt es "Alle Ergebnisse löschen" (mit
// `window.confirm()`-Bestätigung). Beide Lösch-Optionen liegen bewusst
// innerhalb des bestehenden `<details>`-Elements und sind dadurch automatisch
// unsichtbar/nicht fokussierbar, solange die Liste eingeklappt ist – wie
// schon beim Grundmechanismus aus #14 kein zusätzlicher Sichtbarkeits-Code
// nötig, das übernimmt der native Browser-Mechanismus. Da Löschen die
// Liste verändert, wird nach jeder Löschaktion nur der Verlaufsbereich selbst
// neu gerendert (nicht der komplette Ergebnis-Bildschirm) – ein erneuter
// voller renderResultScreen()-Aufruf würde sonst über saveResultToHistory()
// fälschlich einen weiteren "aktuelle Runde"-Eintrag anlegen.
//
// Seit Issue #52 (Buchstabensuche, "Lösung zeigen", Abstimmung mit
// `software-architect`/Nutzer, 20.08.2026) zusätzlich: der Hauptsatz sowie
// die Verlaufsliste zeigen bei mindestens 1 per Button aufgelöster Frage
// zusätzlich deren Anzahl ("... davon X aufgelöst!"), abgeleitet aus
// `quizState.answers.filter(a => a.resolved).length` (siehe
// formatScoreText/renderHistorySection unten) — Score/Total selbst bleiben
// dabei unverändert "N von N richtig" (bestehende Prämisse aus Issue #46).

import {
  saveResultToHistory,
  deleteHistoryEntry,
  clearResultHistory,
} from "../quiz/history.js";
import { DIFFICULTY_LABELS } from "../quiz/difficulty.js";
import { QUIZ_MODES, getModeLabel } from "../quiz/mode.js";
import { GAME_MODE } from "../quiz/gameMode.js";
import animalsData from "../../data/animals.json";
import { loadCollectedAnimals, getAlbumProgress, ALBUM_TARGET } from "../quiz/album.js";
import { triggerConfetti } from "../quiz/confetti.js";
// Issue #82, dritter Teil des Sterne-/Maskottchen-Freischaltsystems
// (#80-#83): Karussell unterhalb des Albums, gleiches Modul-Paar wie in
// start.js.
import { loadProgress, setActiveIdx } from "../quiz/progress.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";

const ANIMAL_NAME_BY_ID = new Map(
  animalsData.animals.map((animal) => [animal.id, animal.name_de]),
);

/**
 * Baut das Markup für die Album-Karte auf dem Ergebnis-Bildschirm (Redesign,
 * Issue #77, design.md "Ergebnis": "Album-Karte wie Start, aber Grid 3
 * Spalten, Felder 118px"). Gleiche Datenquelle/Logik wie die Start-Bildschirm-
 * Vorschau (Issue #71), bewusst hier dupliziert statt importiert (start.js
 * exportiert seine Version nicht, beide Bildschirme kennen einander nicht
 * direkt — gleiches Kopplungsprinzip wie im gesamten Projekt).
 */
function renderAlbumCardMarkup() {
  const collectedIds = loadCollectedAnimals();
  const { collected, target } = getAlbumProgress(undefined, ALBUM_TARGET);

  const slots = [];
  for (let i = 0; i < target; i += 1) {
    const animalId = collectedIds[i];
    if (animalId) {
      const name = ANIMAL_NAME_BY_ID.get(animalId) ?? "?";
      slots.push(
        `<div class="start-album-preview__slot start-album-preview__slot--collected">
          <span class="start-album-preview__slot-name">${name}</span>
        </div>`,
      );
    } else {
      slots.push(
        `<div class="start-album-preview__slot" aria-hidden="true">?</div>`,
      );
    }
  }

  return `
    <div class="start-album-preview start-album-preview--result">
      <div class="start-album-preview__header">
        <p class="start-album-preview__title">Mein Album</p>
        <span class="start-album-preview__badge">${collected}/${target}</span>
      </div>
      <div class="start-album-preview__grid">
        ${slots.join("")}
      </div>
      <p class="start-album-preview__footnote">
        ${
          collected >= target
            ? "Du hast schon alle Tiere gesammelt! 🎉"
            : `Noch ${target - collected} ${target - collected === 1 ? "Tier" : "Tiere"} zu sammeln!`
        }
      </p>
    </div>
  `;
}

// Singular/Plural-Copy fürs Karussell-Hinweiszeile -- dieselbe Ternary wie in
// start.js (siehe dortiger Kommentar zu design.md, "Singular/Plural-Copy");
// bewusst hier dupliziert statt geteilt importiert, gleiches
// Wiederverwendungsprinzip wie renderAlbumCardMarkup oben (kein gemeinsames
// UI-Utility-Modul im Projekt).
function formatStars(n) {
  return n === 1 ? "1 Stern" : `${n} Sterne`;
}

/**
 * Baut das Markup für das Maskottchen-Karussell unter dem Album auf dem
 * Ergebnis-Bildschirm (Issue #82, Handoff "Maskottchen-Karussell") --
 * inhaltlich identisch zu renderMascotCarouselMarkup() in start.js, bewusst
 * dupliziert statt geteilt importiert (siehe Kommentar oben).
 * @param {{stars: number, unlockedIds: number[], activeIdx: number}} progress
 * @returns {string}
 */
function renderMascotCarouselMarkup(progress) {
  const { stars, unlockedIds, activeIdx } = progress;
  const activeMascotId = unlockedIds[activeIdx] ?? 0;
  const activeMascot = MASCOTS[activeMascotId] ?? MASCOTS[0];
  const tint = tintOf(activeMascotId);

  const allCollected = unlockedIds.length >= MASCOTS.length;
  const canRedeem = stars >= 5 && !allCollected;

  let hint;
  if (allCollected) {
    hint = "Du hast alle 50 Maskottchen gesammelt!";
  } else if (canRedeem) {
    hint = `Du hast ${stars} Sterne — du darfst dir ein neues Maskottchen aussuchen!`;
  } else {
    hint = `${unlockedIds.length} von 50 dabei · noch ${formatStars(5 - stars)} bis zum nächsten.`;
  }

  const isFirst = activeIdx === 0;
  const isLast = activeIdx === unlockedIds.length - 1;

  return `
    <div class="mascot-carousel">
      <div class="mascot-carousel__header">
        <h3 class="mascot-carousel__title">Meine Maskottchen</h3>
        <span class="mascot-carousel__pill">${activeIdx + 1} von ${unlockedIds.length}</span>
      </div>
      <div class="mascot-carousel__row">
        <button
          type="button"
          class="mascot-carousel__arrow mascot-carousel__arrow--prev k-btn"
          aria-label="Vorheriges Maskottchen"
          ${isFirst ? "disabled" : ""}
        >←</button>
        <div class="mascot-carousel__stage" style="background: ${tint};" aria-live="polite">
          <span class="mascot-carousel__stage-emoji" aria-hidden="true">${activeMascot.emoji}</span>
          <p class="mascot-carousel__stage-name">${activeMascot.name}</p>
          <p class="mascot-carousel__stage-role">${activeMascot.role}</p>
        </div>
        <button
          type="button"
          class="mascot-carousel__arrow mascot-carousel__arrow--next k-btn"
          aria-label="Nächstes Maskottchen"
          ${isLast ? "disabled" : ""}
        >→</button>
      </div>
      <p class="mascot-carousel__hint">${hint}</p>
    </div>
  `;
}

/**
 * Formatiert einen ISO-Datums-String für die Verlaufsliste, z. B.
 * "13.08.2026, 14:32 Uhr". Liefert einen leeren String bei ungültigem Datum,
 * statt zu werfen (fehlertolerant, analog zu history.js).
 * @param {string} isoDate
 * @returns {string}
 */
function formatHistoryDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const datePart = date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}, ${timePart} Uhr`;
}

/**
 * Formatiert den kurzen Ergebnis-Text ("N von N richtig[, davon X
 * aufgelöst]") für einen Verlaufseintrag. Der "davon X aufgelöst"-Zusatz
 * erscheint nur bei mindestens 1 per "Lösung zeigen"-Button aufgelöster
 * Frage (Issue #52) -- Einträge ohne `resolvedCount`-Feld (Alt-Einträge vor
 * diesem Feature) oder mit `resolvedCount === 0`/`undefined` zeigen
 * unverändert nur "N von N richtig" (Anzeige-Fallback, siehe history.js).
 * @param {number} score
 * @param {number} total
 * @param {number} [resolvedCount]
 * @returns {string}
 */
function formatScoreText(score, total, resolvedCount) {
  const base = `${score} von ${total} richtig`;
  return resolvedCount > 0 ? `${base}, davon ${resolvedCount} aufgelöst` : base;
}

/**
 * Rendert das Markup für die eingeklappte Verlaufsliste (Issue #14, Modus-
 * Anzeige + Lösch-Steuerelemente seit Issue #36), oder einen leeren String,
 * wenn keine Historie (mehr) vorliegt (z. B. `localStorage` blockiert oder
 * der letzte Eintrag wurde gelöscht) – dann wird der ganze Bereich nicht
 * angeboten (identisches Verhalten für "nie Historie vorhanden" und "Historie
 * gerade geleert", Akzeptanzkriterium Issue #36).
 * @param {{id: string, date: string, score: number, total: number, difficulty: string, mode?: string, resolvedCount?: number}[]} history
 *   neueste zuerst (siehe src/quiz/history.js)
 * @returns {string}
 */
function renderHistorySection(history) {
  if (!history || history.length === 0) return "";

  const items = history
    .map((entry, index) => {
      const isCurrent = index === 0;
      const modeLabel = getModeLabel(entry.mode);
      const difficultyLabel = DIFFICULTY_LABELS[entry.difficulty] ?? entry.difficulty;
      return `
        <li class="result-history__item${
          isCurrent ? " result-history__item--current" : ""
        }">
          <div class="result-history__item-main">
            ${
              isCurrent
                ? '<span class="result-history__current-badge">Diese Runde</span>'
                : ""
            }
            <span class="result-history__result">${formatScoreText(entry.score, entry.total, entry.resolvedCount)}</span>
            <span class="result-history__meta">${modeLabel} · ${difficultyLabel} · ${formatHistoryDate(entry.date)}</span>
          </div>
          <button
            type="button"
            class="result-history__delete"
            data-entry-id="${entry.id ?? ""}"
            aria-label="Eintrag löschen"
          >🗑️</button>
        </li>
      `;
    })
    .join("");

  return `
    <details class="result-history">
      <summary class="result-history__toggle">Meine bisherigen Ergebnisse ansehen</summary>
      <p class="result-history__intro">Deine letzten ${history.length} Runden:</p>
      <ul class="result-history__list">
        ${items}
      </ul>
      <button type="button" class="result-history__clear-all">
        Alle Ergebnisse löschen
      </button>
    </details>
  `;
}

/**
 * Ersetzt den Inhalt des Verlaufsbereich-Wrappers nach einer Löschaktion
 * (Issue #36) mit dem neuen Zustand und verdrahtet die dabei frisch erzeugten
 * Steuerelemente erneut (das vorherige `<details>`-Element wird komplett
 * ersetzt, alte Event-Listener sind damit ohnehin hinfällig). Bleibt die
 * Liste nicht leer, wird das neue `<details>`-Element direkt aufgeklappt
 * belassen – Löschen ist nur möglich, während die Liste bereits aufgeklappt
 * ist (Design-Vorgabe), ein Wiederzuklappen nach dem Klick wäre unerwartet.
 * @param {HTMLElement} historyWrapper
 * @param {object[]} history
 */
function refreshHistorySection(historyWrapper, history) {
  historyWrapper.innerHTML = renderHistorySection(history);
  const detailsEl = historyWrapper.querySelector(".result-history");
  if (detailsEl) {
    detailsEl.open = true;
  }
  wireHistoryControls(historyWrapper);
}

/**
 * Verdrahtet die Lösch-Steuerelemente innerhalb des Verlaufsbereichs (Issue
 * #36): einzelne Einträge sofort ohne Bestätigung, die gesamte Liste nur nach
 * Bestätigung per `window.confirm()`. Wird sowohl beim ersten Rendern als
 * auch nach jeder Löschaktion (über refreshHistorySection) erneut aufgerufen.
 * @param {HTMLElement} historyWrapper
 */
function wireHistoryControls(historyWrapper) {
  const deleteButtons = historyWrapper.querySelectorAll(
    ".result-history__delete",
  );
  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const updated = deleteHistoryEntry(button.dataset.entryId);
      refreshHistorySection(historyWrapper, updated ?? []);
    });
  });

  const clearAllButton = historyWrapper.querySelector(
    ".result-history__clear-all",
  );
  clearAllButton?.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Wirklich alle gespeicherten Ergebnisse löschen?",
    );
    if (!confirmed) return;

    const updated = clearResultHistory();
    refreshHistorySection(historyWrapper, updated ?? []);
  });
}

/**
 * Wählt einen durchweg wertschätzenden Ermutigungssatz passend zur Quote der
 * richtigen Antworten. Bewusst keine Formulierung, die eine niedrige Quote
 * als "schlecht" framt (design.md, "Ergebnis-/Abschluss-Bildschirm").
 * @param {number} score
 * @param {number} total
 * @returns {string}
 */
function getEncouragement(score, total) {
  const ratio = total > 0 ? score / total : 0;

  if (ratio === 1) {
    return "Alle Fragen richtig – du kennst dich super mit Tieren aus!";
  }
  if (ratio >= 0.7) {
    return "Super gemacht! Du kennst dich schon richtig gut mit Tieren aus!";
  }
  if (ratio >= 0.4) {
    return "Toll gemacht! Du wirst immer besser!";
  }
  return "Klasse, dass du mitgemacht hast! Übung macht den Tier-Meister!";
}

/**
 * Rendert den Ergebnis-Bildschirm in den übergebenen Container.
 * @param {HTMLElement} container
 * @param {object} quizState Quiz-Zustand aus createQuizState nach Rundenende
 *   (siehe src/quiz/state.js) – erwartet `score`, `questions` sowie `answers`
 *   (für die aus `answers.filter(a => a.resolved).length` abgeleitete Anzahl
 *   aufgelöster Fragen, Issue #52). Für den
 *   Tier-Memory-Modus (Issue #45) übergibt src/screens/memory.js stattdessen
 *   ein schlankes Ergebnis-Objekt ({ mode: GAME_MODE.MEMORY, difficulty,
 *   memoryPairCount, memoryAttempts }) statt eines echten quizState — siehe
 *   dortiger Datei-Kommentar sowie den `isMemoryResult`-Zweig unten.
 * @param {object} [callbacks]
 * @param {() => void} [callbacks.onPlayAgain] wird bei Klick auf "Nochmal
 *   spielen" aufgerufen; der Aufrufer ist dafür zuständig, eine neue Runde
 *   (neuer Zustand, neue Fragen) zu starten.
 * @param {() => void} [callbacks.onBackToStart] wird bei Klick auf "Zurück
 *   zum Start" aufgerufen; führt ebenfalls zum Start-Bildschirm zurück.
 */
export function renderResultScreen(
  container,
  quizState,
  { onPlayAgain, onBackToStart } = {},
) {
  // Issue #45, design.md ("Rundenende"): Tier-Memory hat kein "richtig von N
  // Fragen"-Ergebnis (score/questions passen konzeptionell nicht, siehe
  // architecture.md Punkt 4) — eigener, durchweg wertschätzender Text statt
  // getEncouragement()/Score-Satz, UND bewusst KEIN Eintrag in der
  // Ergebnis-Verlaufsliste (#14/#36, explizites Akzeptanzkriterium).
  const isMemoryResult = quizState.mode === GAME_MODE.MEMORY;

  let scoreText;
  let encouragement;
  let history;

  if (isMemoryResult) {
    const attemptsLabel =
      quizState.memoryAttempts === 1 ? "Versuch" : "Versuchen";
    scoreText = `Super gemacht! Du hast alle ${quizState.memoryPairCount} Tierpaare gefunden!`;
    encouragement = `Das hast du in ${quizState.memoryAttempts} ${attemptsLabel} geschafft!`;
    history = []; // kein saveResultToHistory-Aufruf -> renderHistorySection blendet den Bereich unten automatisch aus
  } else {
    const score = quizState.score;
    const total = quizState.questions.length;
    // Issue #52 (Buchstabensuche, "Lösung zeigen"): Anzahl der per Button
    // aufgelösten statt eigenständig gelösten Fragen dieser Runde -- keine
    // separate Zählvariable, sondern aus der Antworten-Historie abgeleitet
    // (Single Source of Truth, wie bereits bei `score`, siehe state.js). Für
    // Modi ohne `resolved`-Unterstützung (`answers` bleibt dort `undefined`
    // oder ohne `resolved`-Feld) liefert das schlicht 0.
    const resolvedCount = (quizState.answers ?? []).filter(
      (answer) => answer.resolved,
    ).length;

    scoreText =
      resolvedCount > 0
        ? `Du hast ${score} von ${total} Fragen richtig beantwortet, davon ${resolvedCount} aufgelöst!`
        : `Du hast ${score} von ${total} Fragen richtig beantwortet!`;
    encouragement = getEncouragement(score, total);

    // Rundenergebnis lokal protokollieren (Issue #14) – fehlertolerant: bei
    // blockiertem/fehlendem localStorage liefert saveResultToHistory `null`
    // und renderHistorySection blendet den Bereich dann einfach aus. Seit
    // Issue #36 wird zusätzlich der gespielte Modus mitgespeichert – aktuell
    // ist im Hauptzweig nur der Quizfragen-Modus tatsächlich spielbar (die
    // anderen Modi stecken noch in unfertigen Feature-Branches, siehe
    // #26–#28/#31–#33), `quizState.mode` existiert dort also noch nicht; der
    // Fallback auf QUIZ_MODES.QUIZ hält result.js trotzdem schon
    // zukunftskompatibel, sobald ein Feature-Branch `mode` in den Zustand
    // einträgt. Seit Issue #52 zusätzlich `resolvedCount` (optionales Feld,
    // siehe history.js) -- kein Backfill für Alt-Einträge, für Modi ohne
    // Auflösen-Option (aktuell nur Buchstabensuche) einfach 0.
    history = saveResultToHistory({
      score,
      total,
      difficulty: quizState.difficulty,
      mode: quizState.mode ?? QUIZ_MODES.QUIZ,
      resolvedCount,
    });
  }

  // Redesign (Issue #77, design.md "Ergebnis"): kompakte "X/Y"-Großzahl
  // zusätzlich zum bestehenden vollen Satz (.result-screen__score bleibt
  // unverändert bestehen, inkl. "davon N aufgelöst" -- bestehende Tests
  // prüfen genau diesen Text). Memory-Variante: "N/N" (design.md: "Score =
  // '6/6'"), da alle Paare bei Rundenende per Definition gefunden sind.
  const scoreNumber = isMemoryResult
    ? `${quizState.memoryPairCount}/${quizState.memoryPairCount}`
    : `${quizState.score}/${quizState.questions.length}`;

  container.innerHTML = `
    <section class="result-screen" aria-labelledby="result-title">
      <div class="result-screen__panel">
        <p id="result-title" class="result-screen__label">Runde geschafft 🎉</p>
        <p class="result-screen__score-number">${scoreNumber}</p>
        <p class="result-screen__encouragement">${encouragement}</p>
        <p class="result-screen__score">
          ${scoreText}
        </p>

        <div class="result-screen__actions">
          <button type="button" class="result-screen__play-again k-btn">
            Nochmal! 🔁
          </button>
          <button type="button" class="result-screen__back-to-start k-btn">
            Zum Start
          </button>
        </div>

        <div class="result-history-container">${renderHistorySection(history)}</div>
      </div>

      <div class="result-screen__side"></div>

      <div class="feedback-panel__confetti" aria-hidden="true"></div>
    </section>
  `;

  const playAgainButton = container.querySelector(
    ".result-screen__play-again",
  );
  const backToStartButton = container.querySelector(
    ".result-screen__back-to-start",
  );
  const historyWrapper = container.querySelector(".result-history-container");

  playAgainButton.addEventListener("click", () => {
    onPlayAgain?.();
  });

  backToStartButton.addEventListener("click", () => {
    onBackToStart?.();
  });

  if (historyWrapper) {
    wireHistoryControls(historyWrapper);
  }

  // Album-Karte + Maskottchen-Karussell (Issue #82) werden zusammen in
  // `.result-screen__side` gerendert und nach jedem Pfeil-Klick komplett neu
  // aufgebaut -- gleiches Teilbereich-Update-Idiom wie in start.js
  // (renderSideSection), hier ohne zusätzlich zu erhaltenden lokalen
  // Auswahlzustand, da dieser Bildschirm keinen hat.
  const sideEl = container.querySelector(".result-screen__side");

  function renderSideSection() {
    const progress = loadProgress();
    sideEl.innerHTML = `
      ${renderAlbumCardMarkup()}
      ${renderMascotCarouselMarkup(progress)}
    `;
    wireMascotCarousel();
  }

  function wireMascotCarousel() {
    const prevButton = sideEl.querySelector(".mascot-carousel__arrow--prev");
    const nextButton = sideEl.querySelector(".mascot-carousel__arrow--next");

    prevButton?.addEventListener("click", () => {
      const { activeIdx } = loadProgress();
      setActiveIdx(activeIdx - 1);
      renderSideSection();
    });

    nextButton?.addEventListener("click", () => {
      const { activeIdx } = loadProgress();
      setActiveIdx(activeIdx + 1);
      renderSideSection();
    });
  }

  renderSideSection();

  // Redesign (Issue #69/#77, design.md "Ergebnis"): Konfetti bei Rundenende
  // (README: "Auslöser: ... Rundenende").
  triggerConfetti(container.querySelector(".feedback-panel__confetti"));

  playAgainButton.focus();
}
