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
import { triggerConfetti } from "../quiz/confetti.js";
// Issue #83, vierter/letzter Teil des Sterne-/Maskottchen-Freischaltsystems
// (#80-#83): renderStarsBoxMarkup() unten braucht den aktuellen
// Sternestand/unlockedIds.
import { loadProgress } from "../quiz/progress.js";
// Issue #90: die alte Album-Karte (`renderAlbumCardMarkup()`, Issue #77) und
// das alte Maskottchen-Karussell (`renderMascotCarouselMarkup()`, Issue #82)
// sind komplett entfernt -- die rechte Spalte zeigt jetzt dieselbe "Meine
// Sammlung"-Karte + denselben "Mein Maskottchen"-Baustein wie der
// Start-Bildschirm (Issue #89/#88), aus den mit dieser Story neu
// extrahierten gemeinsamen Modulen importiert statt hier nachgebaut (siehe
// renderSideSection() weiter unten sowie die jeweiligen Datei-Kommentare in
// src/quiz/collectionCard.js/mascotStageCard.js). `album.js` selbst wurde
// zum Zeitpunkt dieser Story noch von den 5 Frage-Bildschirmen verwendet;
// die vollständige Modul-Entfernung erfolgte in der separaten Story #91.
import { mountCollectionCard } from "../quiz/collectionCard.js";
import { mountMascotStage } from "../quiz/mascotStageCard.js";

// Singular/Plural-Copy für die Sterne-Box (Issue #83) -- Deutsch
// unterscheidet beim Zählen nur zwischen genau 1 und allem anderen, kein
// Sonderfall für 0 nötig.
function formatStars(n) {
  return n === 1 ? "1 Stern" : `${n} Sterne`;
}

/**
 * Baut das Markup für die Sterne-Box im Ergebnis-Bildschirm (Issue #83,
 * vierter/letzter Teil des Sterne-/Maskottchen-Freischaltsystems #80-#83).
 * Weiße Karte (4px Rahmen, Radius 24, Padding 18, margin-top 16, siehe
 * Issue/Handoff "Sterne-Box im Ergebnis"): Label + Reihe aus 5 Zeichen
 * (gefüllt ⭐ / offen ☆) + situativer Satz (drei Fälle) + optionaler
 * CTA-Button.
 *
 * `canRedeem`-Formel identisch zu header.js (stars >= 5 &&
 * unlockedIds.length < 50), hier bewusst dupliziert statt geteilt importiert
 * (kleines, bewusst in Kauf genommenes Duplikat zwischen genau 2 Screens,
 * siehe architecture.md, Punkt 2 -- kippt erst bei 4 Verwendungsstellen wie
 * beim navControl.js-Nav).
 *
 * Die Sterne-Reihe zeigt `min(stars, 5)` gefüllte Sterne -- im normalen
 * Spielfluss ist `stars` ohnehin nie größer als 5 (Einlösen setzt sofort auf
 * `stars - 5` zurück, siehe progress.js redeemMascot), der `min()`-Schutz
 * greift nur in dem seltenen Fall, dass ein Kind nach Erreichen von 5 Sternen
 * noch eine weitere Runde spielt, ohne zwischendurch einzulösen. Der in
 * dieser Runde neu verdiente Stern (`earned === true`) ist dabei immer der
 * zuletzt gefüllte (`filledCount - 1`) und bekommt die `k-pop`-Animation aus
 * dem Redesign (bereits bestehendes Keyframe, siehe global.css) --
 * respektiert automatisch die projektweite `prefers-reduced-motion`-Regel
 * (global.css, gilt pauschal für alle `animation-duration`n, keine eigene
 * Ausnahme nötig).
 * @param {{stars: number, unlockedIds: number[]}} progress
 * @param {boolean} earned ob in dieser Runde tatsächlich ein Stern verdient wurde
 * @returns {string}
 */
function renderStarsBoxMarkup(progress, earned) {
  const { stars, unlockedIds } = progress;
  const canRedeem = stars >= 5 && unlockedIds.length < 50;
  const filledCount = Math.min(stars, 5);
  const poppedIndex = earned ? filledCount - 1 : -1;

  const starsRow = Array.from({ length: 5 }, (_, i) => {
    const filled = i < filledCount;
    const isNew = filled && i === poppedIndex;
    return `<span
      class="stars-box__star${isNew ? " stars-box__star--new" : ""}"
      style="${filled ? "" : "opacity: .4;"}"
    >${filled ? "⭐" : "☆"}</span>`;
  }).join("");

  let sentence;
  if (canRedeem) {
    sentence = "Du darfst dir jetzt ein neues Maskottchen aussuchen.";
  } else if (earned) {
    sentence = `Runde geschafft — dafür gibt es 1 Stern! Noch ${formatStars(5 - stars)} bis zum nächsten Maskottchen.`;
  } else {
    // Issue #119: dieser Zweig ist im echten Spielfluss nicht mehr erreichbar
    // (recordRoundCompletion vergibt inzwischen immer einen Stern, `earned`
    // ist also strukturell immer `true`) -- greift nur als Default für
    // Aufrufe, die renderResultScreen ohne main.js/recordRoundCompletion
    // direkt aufrufen (siehe result.test.js). Bewusst kein Verweis mehr auf
    // die entfernte "ab 5 richtigen Tieren"-Schwelle.
    sentence = "Spiel eine Runde zu Ende, dann gibt es einen Stern.";
  }

  const ctaHtml = canRedeem
    ? `<button type="button" class="stars-box__cta k-btn">Neues Maskottchen wählen 🎁</button>`
    : "";

  return `
    <div class="stars-box">
      <p class="stars-box__label">${canRedeem ? "5 Sterne voll!" : "Sterne"}</p>
      <div class="stars-box__row" aria-label="${stars} von 5 Sternen">
        ${starsRow}
      </div>
      <p class="stars-box__sentence">${sentence}</p>
      ${ctaHtml}
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
 * @param {() => void} [callbacks.onOpenMascotChooser] Issue #83: wird beim
 *   Klick auf den CTA-Button der Sterne-Box aufgerufen (nur gerendert bei
 *   `canRedeem`) — main.js übergibt hier dieselbe Closure wie beim
 *   Header-Badge (Issue #81, architecture.md Punkt 3), inkl. Rücksprung zum
 *   Ergebnis-Bildschirm über `onDone`.
 */
export function renderResultScreen(
  container,
  quizState,
  { onPlayAgain, onBackToStart, onOpenMascotChooser } = {},
) {
  // Issue #83, vierter/letzter Teil des Sterne-/Maskottchen-
  // Freischaltsystems (#80-#83): main.js wertet recordRoundCompletion()
  // zentral in showResultScreen() aus und schreibt das Ergebnis (`earned`)
  // als transientes Feld auf denselben quizState (analog zum bestehenden
  // `starsAwarded`-Merker dort) -- dieser Screen kennt recordRoundCompletion
  // selbst nicht, liest nur das fertige Ergebnis. Fehlt das Feld (z. B. in
  // bestehenden Tests, die renderResultScreen ohne main.js direkt aufrufen),
  // gilt `earned === undefined` als falsy -> "Runde beendet"/kein Stern
  // verdient, ein sinnvoller Default statt eines Absturzes.
  const earned = quizState.earned === true;

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

  const progress = loadProgress();

  container.innerHTML = `
    <section class="result-screen" aria-labelledby="result-title">
      <div class="result-screen__panel">
        <p id="result-title" class="result-screen__label">${earned ? "Runde geschafft 🎉" : "Runde beendet"}</p>
        <p class="result-screen__score-number">${scoreNumber}</p>
        <p class="result-screen__encouragement">${encouragement}</p>
        <p class="result-screen__score">
          ${scoreText}
        </p>

        ${renderStarsBoxMarkup(progress, earned)}

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

      <div class="result-screen__side">
        <div class="start-card result-collection-card">
          <h3 class="start-card__title">Meine Sammlung</h3>
          <div class="start-card__body" data-collection-card-body></div>
        </div>
        <div class="result-mascot-section">
          <h3 class="result-mascot-section__title">Mein Maskottchen</h3>
          <div class="start-card__body" data-mascot-stage-body></div>
        </div>
      </div>

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

  // Issue #83: CTA-Button der Sterne-Box, nur vorhanden bei `canRedeem`
  // (siehe renderStarsBoxMarkup) -- öffnet dieselbe Maskottchen-Auswahl wie
  // das Header-Badge, über dieselbe main.js-Closure (Issue #81,
  // architecture.md Punkt 3).
  const starsBoxCta = container.querySelector(".stars-box__cta");
  starsBoxCta?.addEventListener("click", () => {
    onOpenMascotChooser?.();
  });

  if (historyWrapper) {
    wireHistoryControls(historyWrapper);
  }

  // Issue #90: rechte Spalte zeigt jetzt dieselbe "Meine Sammlung"-Karte +
  // denselben "Mein Maskottchen"-Baustein wie der Start-Bildschirm (Issue
  // #89/#88), ersetzt die alte Album-Karte + das alte Maskottchen-Karussell
  // (Issue #82/#77) vollständig. Beide mount*()-Funktionen (aus den geteilten
  // Modulen src/quiz/collectionCard.js/mascotStageCard.js) übernehmen ihr
  // eigenes Rendern + Doppel-Tap-robustes Pfeil-Wiring komplett selbst --
  // result.js muss dafür (anders als vorher bei renderSideSection()/
  // wireMascotCarousel()) keine eigene Wiring-Funktion mehr bereitstellen.
  //
  // Kachel-Mindestgröße (130px)/Name-Schriftgröße (16px) laut Handoff-
  // Abschnitt 5 unterscheiden sich von der Start-Bildschirm-Variante
  // (108px/15px) -- gelöst über die zusätzliche `.result-collection-card`-
  // Klasse auf dem Kartencontainer (CSS-Scoping, siehe global.css), nicht
  // über einen Parameter an der geteilten Render-Funktion (siehe
  // collectionCard.js-Datei-Kommentar).
  const sideEl = container.querySelector(".result-screen__side");

  mountCollectionCard(sideEl.querySelector("[data-collection-card-body]"), {
    hintText:
      "Runde geschafft = 1 Stern. Für 5 Sterne darfst du ein neues Maskottchen aus der Sammlung freischalten.",
  });
  mountMascotStage(sideEl.querySelector("[data-mascot-stage-body]"));

  // Redesign (Issue #69/#77, design.md "Ergebnis"): Konfetti bei Rundenende
  // (README: "Auslöser: ... Rundenende").
  triggerConfetti(container.querySelector(".feedback-panel__confetti"));

  playAgainButton.focus();
}
