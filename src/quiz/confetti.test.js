// @vitest-environment jsdom
//
// Tests für src/quiz/confetti.js (Redesign, Issue #69).

import { describe, it, expect, vi, afterEach } from "vitest";
import { triggerConfetti } from "./confetti.js";

function mockMatchMedia(reducedMotion) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("triggerConfetti", () => {
  it("erzeugt die Standardanzahl Partikel im Container", () => {
    mockMatchMedia(false);
    const container = document.createElement("div");
    document.body.appendChild(container);

    const created = triggerConfetti(container);

    expect(created).toBe(34);
    expect(container.querySelectorAll(".k-confetti-particle")).toHaveLength(
      34,
    );
  });

  it("erlaubt eine abweichende Partikelanzahl", () => {
    mockMatchMedia(false);
    const container = document.createElement("div");

    const created = triggerConfetti(container, { count: 5 });

    expect(created).toBe(5);
    expect(container.querySelectorAll(".k-confetti-particle")).toHaveLength(
      5,
    );
  });

  it("erzeugt keine Partikel bei aktivem prefers-reduced-motion", () => {
    mockMatchMedia(true);
    const container = document.createElement("div");

    const created = triggerConfetti(container);

    expect(created).toBe(0);
    expect(container.querySelectorAll(".k-confetti-particle")).toHaveLength(
      0,
    );
  });

  it("liefert 0 bei fehlendem Container statt zu werfen", () => {
    mockMatchMedia(false);
    expect(triggerConfetti(null)).toBe(0);
    expect(triggerConfetti(undefined)).toBe(0);
  });

  it("entfernt einen Partikel nach Ende seiner Animation", () => {
    mockMatchMedia(false);
    const container = document.createElement("div");
    triggerConfetti(container, { count: 1 });

    const particle = container.querySelector(".k-confetti-particle");
    expect(particle).not.toBeNull();

    particle.dispatchEvent(new Event("animationend"));

    expect(container.querySelectorAll(".k-confetti-particle")).toHaveLength(
      0,
    );
  });

  it("verhält sich unkritisch, wenn window.matchMedia nicht existiert", () => {
    const original = window.matchMedia;
    // @ts-expect-error absichtlich entfernt, um fehlende matchMedia-Umgebung zu simulieren
    delete window.matchMedia;

    const container = document.createElement("div");
    const created = triggerConfetti(container, { count: 3 });

    expect(created).toBe(3);
    window.matchMedia = original;
  });
});
