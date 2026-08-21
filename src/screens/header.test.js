// @vitest-environment jsdom
//
// Tests für src/screens/header.js (Redesign, Issue #70, schließt Issue #66
// ab).

import { describe, it, expect, vi } from "vitest";
import { renderHeader } from "./header.js";

function createContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("renderHeader", () => {
  it("rendert Logo, Wortmarke und Home-Button ohne Modus/Fortschritt (Start-Bildschirm)", () => {
    const container = createContainer();
    renderHeader(container, { onBackToStart: () => {} });

    expect(container.querySelector(".app-header__wordmark").textContent).toBe(
      "Tierquiz",
    );
    expect(container.querySelector(".app-header__home-button")).not.toBeNull();
    expect(container.querySelector(".app-header__mode-pill")).toBeNull();
    expect(container.querySelector(".app-header__progress")).toBeNull();
    expect(container.querySelector(".app-header__score")).toBeNull();
  });

  it("ruft onBackToStart auf, wenn der Home-Button geklickt wird", () => {
    const container = createContainer();
    const onBackToStart = vi.fn();
    renderHeader(container, { onBackToStart });

    container.querySelector(".app-header__home-button").click();

    expect(onBackToStart).toHaveBeenCalledTimes(1);
  });

  it("zeigt die Modus-Pill mit dem korrekten Label für jeden Spielmodus", () => {
    const cases = [
      ["quiz", "Quizfragen"],
      ["reverse", "Wer bin ich?"],
      ["sound", "Tiergeräusche"],
      ["memory", "Tier-Memory"],
      ["letterSearch", "Buchstaben"],
    ];

    for (const [mode, label] of cases) {
      const container = createContainer();
      renderHeader(container, { onBackToStart: () => {}, mode });
      expect(container.querySelector(".app-header__mode-pill").textContent).toBe(
        label,
      );
    }
  });

  it("rendert Fortschritts-Pills passend zum aktuellen Stand", () => {
    const container = createContainer();
    renderHeader(container, {
      onBackToStart: () => {},
      mode: "quiz",
      progress: { currentIndex: 2, roundLength: 5, score: 2 },
    });

    const dots = container.querySelectorAll(".app-header__progress-dot");
    expect(dots).toHaveLength(5);
    expect(dots[0].classList.contains("app-header__progress-dot--answered")).toBe(
      true,
    );
    expect(dots[1].classList.contains("app-header__progress-dot--answered")).toBe(
      true,
    );
    expect(dots[2].classList.contains("app-header__progress-dot--current")).toBe(
      true,
    );
    expect(dots[3].classList.contains("app-header__progress-dot--answered")).toBe(
      false,
    );
    expect(dots[3].classList.contains("app-header__progress-dot--current")).toBe(
      false,
    );

    expect(container.querySelector(".app-header__score").textContent).toContain(
      "2",
    );
  });

  it("rendert keine Fortschritts-Pills ohne progress-Option (z. B. Tier-Memory, Ergebnis-Bildschirm)", () => {
    const container = createContainer();
    renderHeader(container, { onBackToStart: () => {}, mode: "memory" });

    expect(container.querySelector(".app-header__progress")).toBeNull();
    expect(container.querySelector(".app-header__score")).toBeNull();
    expect(container.querySelector(".app-header__mode-pill").textContent).toBe(
      "Tier-Memory",
    );
  });

  it("escaped Modus-Labels defensiv (keine HTML-Injektion über unerwartete Werte)", () => {
    const container = createContainer();
    renderHeader(container, {
      onBackToStart: () => {},
      mode: '<img src=x onerror="alert(1)">',
    });

    // Unbekannter Modus-Wert hat kein Label in HEADER_MODE_LABELS -> keine Pill
    expect(container.querySelector(".app-header__mode-pill")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
