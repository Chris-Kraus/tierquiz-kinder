// Maskottchen-Auswahl-Bildschirm (Issue #81, zweiter Teil des Sterne-/
// Maskottchen-Freischaltsystems #80-#83). Wird über das Sterne-Badge im
// Header geöffnet (siehe header.js, `onOpenMascotChooser`) — main.js
// verdrahtet dafür bei jedem renderHeader()-Aufruf eine Closure über den
// jeweils aktuellen Navigationszustand (architecture.md, "Sterne-/
// Maskottchen-Freischaltsystem: Technische Leitplanken", Punkt 3), z. B.
// `onOpenMascotChooser: () => renderMascotChooserScreen(appContent, { onDone:
// () => showQuestionScreen(quizState) })`. Dieser Screen kennt main.js/die
// übrigen Screens dadurch bewusst nicht direkt — er meldet nur über `onDone`
// zurück, wann er fertig ist (gleiches Kopplungsmuster wie `onFinish`/
// `onBackToStart` bei allen anderen Screens).
//
// Rendert bewusst NUR in `container` (== appContent), nicht in die Kopfzeile
// -- main.js ruft renderHeader() beim Öffnen dieses Screens NICHT erneut auf
// (siehe main.js, Datei-Kommentar zu onOpenMascotChooser): die Auswahl ist
// ein kurzer Zwischenstopp, kein vollwertiger Navigationszustand mit eigenem
// Kopfzeilen-Kontext (kein neuer `mode`, kein neuer Rundenfortschritt). Die
// Kopfzeile bleibt dadurch unverändert im Zustand des Bildschirms, von dem
// aus geöffnet wurde -- beim Zurückkehren (onDone) rendert der jeweilige
// show*Screen ohnehin Kopfzeile UND Inhalt frisch.

import { MASCOTS, tintOf } from "../quiz/mascots.js";
import { loadProgress, redeemMascot } from "../quiz/progress.js";
import { triggerConfetti } from "../quiz/confetti.js";

// Kurze Verzögerung vor `onDone()` nach erfolgreichem Einlösen (siehe
// wireMascotTile unten): triggerConfetti() hängt Partikel-DOM in den
// Container, deren Animation über CSS-`@keyframes k-conf` läuft (Issue #69).
// Ein sofortiger onDone()-Aufruf im selben Tick würde den kompletten
// Bildschirm (inkl. der gerade erst angehängten Partikel) synchron
// überschreiben, bevor der Browser auch nur einen einzigen Frame davon
// gemalt hat -- das Konfetti wäre dann faktisch unsichtbar. Der gewählte
// Wert liegt deutlich unter der minimalen Partikel-Laufzeit aus confetti.js
// (1,5-2,3s), lang genug, um den Ausbruch sichtbar zu machen, aber kurz
// genug, um das Kind nicht unnötig zu verzögern.
const CONFETTI_VIEW_DELAY_MS = 900;

/**
 * Baut das Markup für eine Maskottchen-Kachel (siehe Handoff,
 * "Maskottchen-Auswahl"): Fläche = Tint des Maskottchens, Emoji links, Name +
 * Rolle rechts. Echtes `<button>` (Barrierefreiheit: natürliche
 * Tab-Reihenfolge im Grid, siehe design.md).
 * @param {{id: number, name: string, emoji: string, role: string}} mascot
 * @returns {string}
 */
function renderMascotTileMarkup(mascot) {
  return `
    <button
      type="button"
      class="mascot-tile k-btn"
      data-mascot-id="${mascot.id}"
      style="background: ${tintOf(mascot.id)};"
      aria-label="${mascot.name} freischalten"
    >
      <span class="mascot-tile__emoji" aria-hidden="true">${mascot.emoji}</span>
      <span class="mascot-tile__info">
        <span class="mascot-tile__name">${mascot.name}</span>
        <span class="mascot-tile__role">${mascot.role}</span>
      </span>
    </button>
  `;
}

/**
 * Rendert den Maskottchen-Auswahl-Bildschirm in den übergebenen Container.
 * Zeigt ALLE noch nicht freigeschalteten Maskottchen (Listenreihenfolge, nicht
 * nur die nächsten sechs, siehe Handoff). Klick auf eine Kachel löst sie
 * gegen 5 Sterne ein (`redeemMascot`), zeigt Konfetti und kehrt danach über
 * `onDone` zum Aufrufer zurück. "Später ↩" kehrt ohne Einlösen zurück.
 * @param {HTMLElement} container
 * @param {object} [callbacks]
 * @param {() => void} [callbacks.onDone] wird aufgerufen, sobald der Screen
 *   fertig ist (Einlösen abgeschlossen oder "Später ↩" getippt) -- der
 *   Aufrufer entscheidet, zu welchem Bildschirm das zurückführt.
 */
export function renderMascotChooserScreen(container, { onDone } = {}) {
  const { unlockedIds } = loadProgress();
  const lockedMascots = MASCOTS.filter(
    (mascot) => !unlockedIds.includes(mascot.id),
  );

  container.innerHTML = `
    <section class="mascot-chooser" aria-labelledby="mascot-chooser-title">
      <div class="mascot-chooser__card">
        <div class="mascot-chooser__header">
          <div class="mascot-chooser__intro-text">
            <p class="mascot-chooser__label">5 Sterne eingelöst</p>
            <h1 id="mascot-chooser-title" class="mascot-chooser__title">Wähl dein neues Maskottchen!</h1>
            <p class="mascot-chooser__intro">Tippe auf das Tier, das dich ab jetzt begleiten soll. Die anderen kannst du später freischalten — für die nächsten 5 Sterne.</p>
          </div>
          <button type="button" class="mascot-chooser__later k-btn">Später ↩</button>
        </div>
        <div class="mascot-chooser__grid">
          ${lockedMascots.map(renderMascotTileMarkup).join("")}
        </div>
      </div>
      <div class="mascot-chooser__confetti" aria-hidden="true"></div>
    </section>
  `;

  const laterButton = container.querySelector(".mascot-chooser__later");
  laterButton.addEventListener("click", () => {
    onDone?.();
  });

  // Schützt gegen doppeltes onDone(), falls das Kind innerhalb der
  // CONFETTI_VIEW_DELAY_MS-Verzögerung noch eine zweite Kachel antippt --
  // ein zweites erfolgreiches Einlösen ist dabei nicht ausgeschlossen (bei
  // genug Sternen für mehrere Maskottchen durchaus gültiges Verhalten, siehe
  // redeemMascot-Guard in progress.js), nur der doppelte onDone()-Aufruf
  // danach wird vermieden.
  let redeeming = false;

  const tiles = Array.from(container.querySelectorAll(".mascot-tile"));
  tiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      if (redeeming) return;

      const mascotId = Number(tile.dataset.mascotId);
      const result = redeemMascot(mascotId);
      // Guard schlägt fehl, wenn zwischenzeitlich (z. B. durch ein anderes
      // offenes Browser-Tab) die Sterne nicht mehr reichen oder das
      // Maskottchen bereits anderweitig freigeschaltet wurde -- dann bleibt
      // der Bildschirm einfach unverändert stehen, kein Absturz.
      if (!result) return;

      redeeming = true;
      const confettiContainer = container.querySelector(
        ".mascot-chooser__confetti",
      );
      const particleCount = triggerConfetti(confettiContainer);

      if (particleCount > 0) {
        setTimeout(() => onDone?.(), CONFETTI_VIEW_DELAY_MS);
      } else {
        // prefers-reduced-motion: kein Konfetti erzeugt (siehe confetti.js),
        // also auch keine künstliche Wartezeit -- sofort zurück.
        onDone?.();
      }
    });
  });
}
