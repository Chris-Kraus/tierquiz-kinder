// "Mein Maskottchen"-Bühne + Nav: zeigt/wechselt das aktuell aktive
// (freigeschaltete) Maskottchen, siehe docs/workflow/design.md, "'Mein
// Maskottchen'-Karte + wiederverwendbare 3-teilige Nav". Ursprünglich in
// src/screens/start.js gebaut (Issue #88, dortiger Datei-Kommentar
// "renderMascotStageCardMarkup()"/"renderMascotCard()"); mit Issue #90
// (Ergebnis-Bildschirm braucht laut design.md "technisch dieselbe
// Komponente wie oben, nur zweitplatziert") hierher extrahiert, statt sie in
// result.js ein zweites Mal nachzubauen.

import { MASCOTS, tintOf } from "./mascots.js";
import { buildNavControlMarkup, wireNavControl } from "./navControl.js";
import { loadProgress, setActiveIdx } from "./progress.js";

// Singular/Plural-Copy für die Hinweiszeile ("noch {N Stern|N Sterne} bis
// zum nächsten") -- Deutsch unterscheidet beim Zählen nur zwischen genau 1
// und allem anderen, kein Sonderfall für 0 nötig.
function formatStars(n) {
  return n === 1 ? "1 Stern" : `${n} Sterne`;
}

/**
 * Baut das Markup für Bühne + Auswählen-Label + Nav + Hinweiszeile. Reine
 * Stringfunktion, kein DOM-Zugriff -- der Aufrufer (mountMascotStage() unten)
 * fügt das Ergebnis selbst per innerHTML ein.
 * @param {{stars: number, unlockedIds: number[], activeIdx: number}} progress
 * @returns {string}
 */
export function renderMascotStageMarkup(progress) {
  const { stars, unlockedIds, activeIdx } = progress;
  const activeMascotId = unlockedIds[activeIdx] ?? 0;
  const activeMascot = MASCOTS[activeMascotId] ?? MASCOTS[0];
  const tint = tintOf(activeMascotId);

  const allCollected = unlockedIds.length >= MASCOTS.length;
  const canRedeem = stars >= 5 && !allCollected;

  // Drei-Fälle-Hinweiszeile laut Handoff -- Copy wörtlich übernommen.
  let hint;
  if (allCollected) {
    hint = "Du hast alle 50 Maskottchen gesammelt!";
  } else if (canRedeem) {
    hint = `Du hast ${stars} Sterne — du darfst dir ein neues Maskottchen aussuchen!`;
  } else {
    hint = `Noch ${formatStars(5 - stars)}, bis du ein weiteres Maskottchen freischalten kannst.`;
  }

  const navMarkup = buildNavControlMarkup({
    label: `${activeIdx + 1}/${unlockedIds.length}`,
    disabledPrev: activeIdx === 0,
    disabledNext: activeIdx === unlockedIds.length - 1,
    ariaLabelPrev: "Vorheriges Maskottchen",
    ariaLabelNext: "Nächstes Maskottchen",
  });

  return `
    <div class="mascot-stage" style="background: ${tint};" aria-live="polite">
      <span class="mascot-stage__figure" aria-hidden="true">${activeMascot.emoji}</span>
      <p class="mascot-stage__name">${activeMascot.name}</p>
      <p class="mascot-stage__role">${activeMascot.role}</p>
    </div>
    <p class="start-mascot-card__select-label">Maskottchen auswählen</p>
    ${navMarkup}
    <p class="start-mascot-card__hint">${hint}</p>
  `;
}

/**
 * Rendert die Maskottchen-Bühne in `bodyEl` und verdrahtet das Nav
 * vollständig selbst -- der Aufrufer muss sich um nichts weiter kümmern
 * außer den Zielcontainer bereitzustellen.
 *
 * Doppel-Tap-Robustheit (architecture.md, Punkt 3): onPrev/onNext lesen bei
 * JEDEM Aufruf frisch über loadProgress() (kein Debounce/Timeout dazwischen),
 * danach sofortiges Neu-Rendern inkl. neu verdrahteter Buttons.
 * @param {HTMLElement} bodyEl
 */
export function mountMascotStage(bodyEl) {
  function render() {
    const progress = loadProgress();
    bodyEl.innerHTML = renderMascotStageMarkup(progress);

    wireNavControl(bodyEl, {
      onPrev: () => {
        const { activeIdx } = loadProgress();
        setActiveIdx(activeIdx - 1);
        render();
      },
      onNext: () => {
        const { activeIdx } = loadProgress();
        setActiveIdx(activeIdx + 1);
        render();
      },
    });
  }

  render();
}
