// Wiederverwendbare 3-teilige Nav-Komponente (Pfeil ← / Badge / Pfeil →),
// siehe docs/workflow/architecture.md, "Wiederverwendbare 3-teilige Nav-
// Komponente" (Issue #88, erste von 4 geplanten Verwendungsstellen:
// Start-Maskottchen-Nav hier, Start-Sammlung-Nav (#89), Ergebnis-
// Maskottchen-Nav + Ergebnis-Sammlung-Nav (#90)). Bewusste Ausnahme vom
// bisherigen Projekt-Muster "kleine Duplikate zwischen genau 2 Screens sind
// okay" (z. B. renderMascotCarouselMarkup()/formatStars() zwischen
// start.js/result.js) -- bei 4 identischen Verwendungsstellen mit der
// sicherheitsrelevanten Doppel-Tap-Anforderung unten kippt diese Abwägung
// (architecture.md, Punkt 2).
//
// Reiner Präsentations-/Wiring-Helper: kein Zustand, kein localStorage-
// Zugriff, keine Fachlogik -- diese Komponente kennt nur "vorheriger/
// nächster Schritt" plus einen fertig formatierten Badge-Text. Was genau
// navigiert wird (Maskottchen-Index vs. Sammlungs-Seite) und wie der
// Badge-Text lautet ("1/3" vs. "Seite 2/6"), entscheidet ausschließlich der
// jeweilige Aufrufer.
//
// Zwei getrennte Funktionen (Markup-Builder + Wiring-Helper) statt einer
// einzigen kombinierten Render-Funktion -- analog zum bereits bestehenden
// Muster in start.js (bisher: renderMascotCarouselMarkup() baute das
// Markup, ein separates wireMascotCarousel() verdrahtete danach die
// Klick-Handler). Aufrufer fügen das Markup zunächst per innerHTML ein und
// rufen wireNavControl() erst danach auf dem eingefügten Container auf.
//
// Doppel-Tap-Robustheit (architecture.md, Punkt 3 -- "zwei schnelle Taps
// müssen zwei Schritte weiterblättern"): Diese Komponente selbst tut dafür
// nichts Besonderes und darf das auch nicht -- sie hängt ausschließlich
// addEventListener("click", ...) an die beiden Pfeile, ohne Debounce/
// Timeout/requestAnimationFrame dazwischen. Die eigentliche Garantie kommt
// aus der Verantwortung des AUFRUFERS: onPrev/onNext müssen bei JEDEM
// Aufruf frisch den aktuellen Stand lesen (z. B. loadProgress()), statt eine
// beim Rendern eingefangene Kopie zu verwenden (keine stale closure), und
// danach neu rendern -- wodurch für einen zweiten, schnell folgenden Klick
// bereits ein frisch eingefügter Button mit frisch verdrahtetem Listener
// existiert. Ein Debounce/Timeout HIER würde diese Garantie zerstören, egal
// wie sorgfältig der Aufrufer selbst ist.

/**
 * Baut das Markup für Pfeil-links/Badge/Pfeil-rechts. Reine Stringfunktion,
 * kein DOM-Zugriff -- der Aufrufer fügt das Ergebnis selbst per innerHTML
 * ein (gleiches Muster wie alle anderen *Markup()-Funktionen im Projekt,
 * z. B. renderCollectionGridMarkup() in collectionCard.js).
 * @param {object} options
 * @param {string} options.label Fertig formatierter Badge-Text, z. B. "1/3"
 *   oder "Seite 2/6" -- diese Komponente kennt das Format nicht, der
 *   Aufrufer entscheidet (Positions- vs. Seiten-Text).
 * @param {boolean} options.disabledPrev
 * @param {boolean} options.disabledNext
 * @param {string} options.ariaLabelPrev z. B. "Vorheriges Maskottchen" oder
 *   "Vorherige Sammlungsseite" -- je Verwendungsstelle unterschiedlich
 *   (design.md, "Barrierefreiheit": nicht dasselbe Label an allen 4
 *   Stellen, sonst nicht erkennbar, welches der beiden Navs den Fokus hat).
 * @param {string} options.ariaLabelNext
 * @returns {string}
 */
export function buildNavControlMarkup({
  label,
  disabledPrev,
  disabledNext,
  ariaLabelPrev,
  ariaLabelNext,
}) {
  return `
    <div class="nav-control">
      <button
        type="button"
        class="nav-control__arrow nav-control__arrow--prev k-btn"
        aria-label="${ariaLabelPrev}"
        ${disabledPrev ? "disabled" : ""}
      >←</button>
      <span class="nav-control__badge">${label}</span>
      <button
        type="button"
        class="nav-control__arrow nav-control__arrow--next k-btn"
        aria-label="${ariaLabelNext}"
        ${disabledNext ? "disabled" : ""}
      >→</button>
    </div>
  `;
}

/**
 * Verdrahtet die beiden Pfeile innerhalb von `container` (muss bereits das
 * von buildNavControlMarkup() erzeugte Markup enthalten, z. B. per
 * vorherigem `container.innerHTML = buildNavControlMarkup(...)`).
 *
 * WICHTIG für Doppel-Tap-Robustheit (siehe Datei-Kommentar oben): `onPrev`/
 * `onNext` müssen selbst frisch lesen/schreiben/neu rendern -- diese
 * Funktion garantiert das nicht, sie hängt nur die Listener an.
 * @param {HTMLElement} container
 * @param {object} [callbacks]
 * @param {() => void} [callbacks.onPrev]
 * @param {() => void} [callbacks.onNext]
 */
export function wireNavControl(container, { onPrev, onNext } = {}) {
  const prevButton = container.querySelector(".nav-control__arrow--prev");
  const nextButton = container.querySelector(".nav-control__arrow--next");

  prevButton?.addEventListener("click", () => onPrev?.());
  nextButton?.addEventListener("click", () => onNext?.());
}
