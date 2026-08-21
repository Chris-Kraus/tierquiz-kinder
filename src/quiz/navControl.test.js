// @vitest-environment jsdom
//
// Tests für die neue wiederverwendbare 3-teilige Nav-Komponente (Issue #88,
// siehe architecture.md "Wiederverwendbare 3-teilige Nav-Komponente" und
// Datei-Kommentar in navControl.js). Deckt genau das ab, was diese
// Komponente selbst verantwortet: Markup (Badge-Text/Rand-Disabled/
// aria-label) sowie Wiring (Klick-Handler feuern, mit garantiert frischem
// Zustand statt einer beim ersten Rendern eingefangenen Kopie -- die
// eigentliche Fachlogik/Persistenz gehört den Aufrufern, siehe start.test.js).

import { describe, it, expect, vi } from "vitest";
import { buildNavControlMarkup, wireNavControl } from "./navControl.js";

describe("buildNavControlMarkup", () => {
  it("rendert Badge-Text genau so, wie er übergeben wurde (Aufrufer entscheidet über das Format)", () => {
    const container = document.createElement("div");
    container.innerHTML = buildNavControlMarkup({
      label: "1/3",
      disabledPrev: false,
      disabledNext: false,
      ariaLabelPrev: "Vorheriges Maskottchen",
      ariaLabelNext: "Nächstes Maskottchen",
    });

    expect(container.querySelector(".nav-control__badge").textContent).toBe(
      "1/3",
    );
  });

  it("rendert einen abweichenden Badge-Text (z. B. Seiten-Format für eine spätere Verwendungsstelle) unverändert", () => {
    const container = document.createElement("div");
    container.innerHTML = buildNavControlMarkup({
      label: "Seite 2/6",
      disabledPrev: false,
      disabledNext: false,
      ariaLabelPrev: "Vorherige Sammlungsseite",
      ariaLabelNext: "Nächste Sammlungsseite",
    });

    expect(container.querySelector(".nav-control__badge").textContent).toBe(
      "Seite 2/6",
    );
  });

  it("deaktiviert 'zurück' am linken Rand (disabledPrev), 'weiter' bleibt aktiv", () => {
    const container = document.createElement("div");
    container.innerHTML = buildNavControlMarkup({
      label: "1/3",
      disabledPrev: true,
      disabledNext: false,
      ariaLabelPrev: "Vorheriges Maskottchen",
      ariaLabelNext: "Nächstes Maskottchen",
    });

    expect(
      container.querySelector(".nav-control__arrow--prev").disabled,
    ).toBe(true);
    expect(
      container.querySelector(".nav-control__arrow--next").disabled,
    ).toBe(false);
  });

  it("deaktiviert 'weiter' am rechten Rand (disabledNext), 'zurück' bleibt aktiv", () => {
    const container = document.createElement("div");
    container.innerHTML = buildNavControlMarkup({
      label: "3/3",
      disabledPrev: false,
      disabledNext: true,
      ariaLabelPrev: "Vorheriges Maskottchen",
      ariaLabelNext: "Nächstes Maskottchen",
    });

    expect(
      container.querySelector(".nav-control__arrow--prev").disabled,
    ).toBe(false);
    expect(
      container.querySelector(".nav-control__arrow--next").disabled,
    ).toBe(true);
  });

  it("übernimmt kontextspezifische aria-label statt einer reinen Pfeil-Glyphe (design.md: nicht dasselbe Label an allen 4 Stellen)", () => {
    const container = document.createElement("div");
    container.innerHTML = buildNavControlMarkup({
      label: "Seite 1/6",
      disabledPrev: true,
      disabledNext: false,
      ariaLabelPrev: "Vorherige Sammlungsseite",
      ariaLabelNext: "Nächste Sammlungsseite",
    });

    expect(
      container
        .querySelector(".nav-control__arrow--prev")
        .getAttribute("aria-label"),
    ).toBe("Vorherige Sammlungsseite");
    expect(
      container
        .querySelector(".nav-control__arrow--next")
        .getAttribute("aria-label"),
    ).toBe("Nächste Sammlungsseite");
  });
});

describe("wireNavControl", () => {
  function renderInto() {
    const container = document.createElement("div");
    container.innerHTML = buildNavControlMarkup({
      label: "1/3",
      disabledPrev: false,
      disabledNext: false,
      ariaLabelPrev: "Vorheriges Maskottchen",
      ariaLabelNext: "Nächstes Maskottchen",
    });
    return container;
  }

  it("ruft onPrev/onNext beim jeweiligen Klick auf", () => {
    const container = renderInto();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    wireNavControl(container, { onPrev, onNext });

    container.querySelector(".nav-control__arrow--prev").click();
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();

    container.querySelector(".nav-control__arrow--next").click();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("wirft nicht, wenn onPrev/onNext fehlen (optionale Callbacks)", () => {
    const container = renderInto();
    expect(() => wireNavControl(container, {})).not.toThrow();
    expect(() =>
      container.querySelector(".nav-control__arrow--prev").click(),
    ).not.toThrow();
  });

  it("registriert zwei schnell aufeinanderfolgende Klicks als zwei separate Aufrufe (kein Debounce/Verschlucken) -- Grundlage der Doppel-Tap-Anforderung", () => {
    const container = renderInto();
    const onNext = vi.fn();
    wireNavControl(container, { onNext });

    const nextButton = container.querySelector(".nav-control__arrow--next");
    nextButton.click();
    nextButton.click();

    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("liest bei jedem Aufruf frisch übergebenen Zustand statt einer beim Verdrahten eingefangenen Kopie (keine stale closure)", () => {
    // Simuliert das vom Aufrufer erwartete Read-Modify-Write-Re-Render-Muster:
    // ein einfacher externer Zähler, den onNext bei jedem Klick frisch liest
    // und hochzählt -- kein einmalig beim Rendern eingefangener Wert.
    let position = 0;
    const positions = [];
    const container = renderInto();
    wireNavControl(container, {
      onNext: () => {
        position += 1;
        positions.push(position);
      },
    });

    const nextButton = container.querySelector(".nav-control__arrow--next");
    nextButton.click();
    nextButton.click();
    nextButton.click();

    expect(positions).toEqual([1, 2, 3]);
  });
});
