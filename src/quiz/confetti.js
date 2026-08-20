// Konfetti-Effekt (Redesign, Issue #69): erzeugt kurzlebige DOM-Partikel bei
// richtigen Antworten, gefundenen Memory-Paaren und Rundenende (siehe
// design.md, Keyframe `k-conf` aus Issue #67).
//
// Abstimmung mit `business-analyst`/`ux-design` (siehe architecture.md,
// "Kindgerechtes Redesign: Technische Leitplanken", Punkt 2): prüft
// `prefers-reduced-motion` **vor** der Partikel-Erzeugung und erzeugt in
// diesem Fall gar keine Partikel-DOM (statt sie per CSS nur unsichtbar zu
// machen) — vermeidet unnötigen DOM-Churn und ist die sauberere Umsetzung der
// Absicht "kein Konfetti soll animieren".
//
// Aufrufstellen (question.js, memory.js, result.js) entscheiden jeweils, ob
// Konfetti in ihrem Kontext gewünscht ist (deckt die im Handoff geforderte
// Abschaltbarkeit ab) — reines DOM-Utility-Modul ohne eigenes Trigger-Wiring.

const DEFAULT_PARTICLE_COUNT = 34;
const DEFAULT_DURATION_MIN_S = 1.5;
const DEFAULT_DURATION_MAX_S = 2.3;
const DEFAULT_COLORS = ["var(--sand)", "var(--sky)", "#ffffff"];
const DEFAULT_DX_RANGE = 110; // ±110px, siehe design.md
const DEFAULT_ROT_MIN_DEG = 240;
const DEFAULT_ROT_MAX_DEG = 780;

function prefersReducedMotion() {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    // Umgebungen ohne matchMedia (z. B. manche Testumgebungen) behandeln wir
    // konservativ als "keine Präferenz", nicht als Fehler.
    return false;
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

/**
 * Löst einen Konfetti-Effekt im übergebenen Container aus. Erzeugt bei
 * aktivem `prefers-reduced-motion` überhaupt keine Partikel (kein DOM-Churn),
 * statt sie nur unsichtbar zu rendern. Partikel entfernen sich nach Ende
 * ihrer Animation selbst (kein DOM-Leak bei wiederholtem Trigger).
 * @param {HTMLElement} container Element, in das die Partikel eingehängt werden (sollte `position: relative`/`overflow: hidden` haben, siehe design.md)
 * @param {object} [options]
 * @param {number} [options.count] Anzahl Partikel, Standard 34
 * @param {string[]} [options.colors] Partikelfarben, Standard sand/sky/weiß
 * @returns {number} Anzahl tatsächlich erzeugter Partikel (0 bei reduced-motion oder fehlendem Container)
 */
export function triggerConfetti(container, options = {}) {
  if (!container || typeof container.appendChild !== "function") return 0;
  if (prefersReducedMotion()) return 0;

  const count = options.count ?? DEFAULT_PARTICLE_COUNT;
  const colors = options.colors ?? DEFAULT_COLORS;

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement("span");
    particle.className = "k-confetti-particle";
    particle.setAttribute("aria-hidden", "true");

    const dx = `${randomSign() * randomBetween(0, DEFAULT_DX_RANGE)}px`;
    const rot = `${randomBetween(DEFAULT_ROT_MIN_DEG, DEFAULT_ROT_MAX_DEG)}deg`;
    const durationS = randomBetween(
      DEFAULT_DURATION_MIN_S,
      DEFAULT_DURATION_MAX_S,
    );
    const color = colors[i % colors.length];
    const isRound = i % 2 === 0;

    particle.style.setProperty("--dx", dx);
    particle.style.setProperty("--rot", rot);
    particle.style.animationDuration = `${durationS}s`;
    particle.style.background = color;
    particle.style.borderRadius = isRound ? "999px" : "6px";

    particle.addEventListener(
      "animationend",
      () => {
        particle.remove();
      },
      { once: true },
    );

    container.appendChild(particle);
  }

  return count;
}
