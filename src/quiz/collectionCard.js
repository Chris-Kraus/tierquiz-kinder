// "Meine Sammlung"-Karte: paginiertes 50-Maskottchen-Raster (freigeschaltet =
// Tint + Name, verdeckt = "?"), siehe docs/workflow/design.md, "'Meine
// Sammlung'-Karte (Maskottchen-Sammelraster, ersetzt das Tier-Album
// konzeptionell)". Ursprünglich in src/screens/start.js gebaut (Issue #89,
// dortiger Datei-Kommentar "renderCollectionCardMarkup()"/
// "renderCollectionCard()"); mit Issue #90 (Ergebnis-Bildschirm braucht
// dieselbe Karte als zweite Verwendungsstelle) hierher extrahiert, statt das
// gesamte Pagination-/Kachel-Rendering ein zweites Mal in result.js zu
// duplizieren (siehe dortige Issue-Vorgabe: "do not duplicate the
// pagination/tile-rendering logic").
//
// Tile-Größe/Name-Schriftgröße unterscheiden sich zwischen Start (108px/15px,
// CSS-Standardwerte auf `.collection-grid__tile`/`.collection-grid__name`)
// und Ergebnis (130px/16px laut Handoff-Abschnitt 5 "Ergebnis-Screen
// (Änderungen)") -- diese Funktion kennt diesen Unterschied bewusst NICHT:
// beide Bildschirme erzeugen exakt dasselbe Markup/dieselben Klassennamen,
// der jeweilige Aufrufer hängt lediglich eine zusätzliche Modifier-Klasse an
// den umschließenden Kartencontainer (siehe result.js, `.result-collection-card`)
// und überschreibt die beiden Maße per CSS-Scoping -- exakt dasselbe Prinzip,
// das global.css bereits für die (mittlerweile entfernte) Album-Vorschau
// verwendet hat (`.start-album-preview--result` überschrieb dort die
// Feldgröße genauso, ohne die Basis-Komponente zu verzweigen).
//
// Auch die Hinweiszeile unterhalb des Rasters unterscheidet sich fachlich
// zwischen den beiden Bildschirmen (Start: "Hinter jedem ? versteckt sich
// ein Maskottchen: ..."; Ergebnis: "Runde geschafft = 1 Stern. Für 5 Sterne
// darfst du ein neues Maskottchen aus der Sammlung freischalten.") -- daher
// als Parameter statt hartkodiertem Text, die Pagination-/Kachel-Logik selbst
// bleibt trotzdem vollständig gemeinsam.

import { MASCOTS, tintOf } from "./mascots.js";
import { buildNavControlMarkup, wireNavControl } from "./navControl.js";
import { loadProgress } from "./progress.js";

// 50 Maskottchen / 9 Kacheln pro Seite = 6 Seiten (5 volle + 1 Rest-Seite mit
// 5 Kacheln, Math.ceil deckt das korrekt ab).
export const COLLECTION_PAGE_SIZE = 9;
export const COLLECTION_PAGE_COUNT = Math.ceil(MASCOTS.length / COLLECTION_PAGE_SIZE);

/**
 * Baut das Markup für eine Seite des Sammlungs-Rasters plus Nav plus
 * Hinweiszeile. Reine Stringfunktion, kein DOM-Zugriff -- der Aufrufer
 * (mountCollectionCard() unten, oder ein Screen direkt) fügt das Ergebnis
 * selbst per innerHTML ein.
 *
 * Letzte Seite rendert nur die real vorhandenen Slots
 * (`Math.min(COLLECTION_PAGE_SIZE, MASCOTS.length - startId)`), keine leeren
 * Platzhalter-Kästen.
 * @param {{unlockedIds: number[]}} progress
 * @param {number} colPage 0-indexierte aktuelle Sammlungs-Seite
 * @param {object} [options]
 * @param {string} options.hintText Fertig formatierter Hinweiszeilen-Text --
 *   diese Funktion kennt den screen-spezifischen Wortlaut nicht (siehe
 *   Datei-Kommentar oben).
 * @returns {string}
 */
export function renderCollectionGridMarkup(progress, colPage, { hintText } = {}) {
  const { unlockedIds } = progress;
  const startId = colPage * COLLECTION_PAGE_SIZE;
  const slotsOnPage = Math.min(COLLECTION_PAGE_SIZE, MASCOTS.length - startId);

  const tiles = [];
  for (let i = 0; i < slotsOnPage; i += 1) {
    const mascotId = startId + i;
    const mascot = MASCOTS[mascotId];
    const unlocked = unlockedIds.includes(mascotId);

    if (unlocked) {
      tiles.push(`
        <div
          class="collection-grid__tile collection-grid__tile--unlocked"
          style="background: ${tintOf(mascotId)};"
        >
          <span class="collection-grid__figure" aria-hidden="true">${mascot.emoji}</span>
          <p class="collection-grid__name">${mascot.name}</p>
        </div>
      `);
    } else {
      tiles.push(`
        <div class="collection-grid__tile collection-grid__tile--locked" aria-hidden="true">
          <span class="collection-grid__mark">?</span>
        </div>
      `);
    }
  }

  const navMarkup = buildNavControlMarkup({
    label: `Seite ${colPage + 1}/${COLLECTION_PAGE_COUNT}`,
    disabledPrev: colPage === 0,
    disabledNext: colPage === COLLECTION_PAGE_COUNT - 1,
    ariaLabelPrev: "Vorherige Sammlungsseite",
    ariaLabelNext: "Nächste Sammlungsseite",
  });

  return `
    <div class="collection-grid" aria-live="polite">
      ${tiles.join("")}
    </div>
    ${navMarkup}
    <p class="start-collection-card__hint">${hintText}</p>
  `;
}

/**
 * Rendert die Sammlungs-Karte in `bodyEl` und verdrahtet das Seiten-Nav
 * vollständig selbst -- der Aufrufer muss sich um nichts weiter kümmern
 * außer den Zielcontainer bereitzustellen. `colPage` ist rein lokaler
 * UI-Zustand (Closure-Variable, analog zu `selectedDifficulty` in start.js),
 * KEINE eigene localStorage-Persistenz -- jeder mountCollectionCard()-Aufruf
 * bekommt seine eigene, unabhängige Seiten-Position (Start- und
 * Ergebnis-Bildschirm teilen sich also NICHT dieselbe aktuell angezeigte
 * Seite, was auch fachlich richtig ist: es sind zwei unabhängige
 * Bildschirm-Aufrufe).
 *
 * Doppel-Tap-Robustheit (architecture.md, Punkt 3): onPrev/onNext lesen
 * bei jedem Aufruf frisch (`loadProgress()`) bzw. schreiben direkt die
 * äußere `colPage`-Variable, danach sofortiges Neu-Rendern inkl. neu
 * verdrahteter Buttons -- kein Debounce/Timeout dazwischen.
 * @param {HTMLElement} bodyEl
 * @param {object} [options]
 * @param {string} options.hintText siehe renderCollectionGridMarkup()
 */
export function mountCollectionCard(bodyEl, { hintText } = {}) {
  let colPage = 0;

  function render() {
    const progress = loadProgress();
    bodyEl.innerHTML = renderCollectionGridMarkup(progress, colPage, {
      hintText,
    });

    wireNavControl(bodyEl, {
      onPrev: () => {
        colPage = Math.max(0, colPage - 1);
        render();
      },
      onNext: () => {
        colPage = Math.min(COLLECTION_PAGE_COUNT - 1, colPage + 1);
        render();
      },
    });
  }

  render();
}
