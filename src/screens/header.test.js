// @vitest-environment jsdom
//
// Tests für src/screens/header.js (Redesign, Issue #70, schließt Issue #66
// ab; Sterne-Badge + Rundenpunktestand-Icon-Wechsel seit Issue #81, siehe
// Datei-Kommentar in header.js).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHeader } from "./header.js";
import { recordRoundCompletion } from "../quiz/progress.js";
import { GAME_MODE } from "../quiz/gameMode.js";

function createContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

// Treibt den Sternestand über die echte progress.js-API hoch (kein direktes
// localStorage-Schreiben mit einem hier dupliziertem Storage-Key/Schema) --
// jeder Aufruf mit score >= 5 vergibt genau einen Stern (siehe
// progress.test.js).
function setStars(n) {
  for (let i = 0; i < n; i += 1) {
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
  }
}

// header.js liest den Sternestand über loadProgress() ohne Storage-Override,
// greift also auf das globale `localStorage` zu. Diese jsdom/Node-Kombination
// stellt darüber aber KEIN echtes globales `localStorage` bereit (weder
// `localStorage` noch `window.localStorage` sind hier definiert, anders als
// in einem echten Browser) -- ein reiner `localStorage.clear()` würde daher
// werfen. Gleiches In-Memory-Fake wie in progress.test.js (`createFakeStorage`),
// hier aber am globalen Objekt gesetzt, da header.js keinen Storage-Parameter
// entgegennimmt. Frisches Fake pro Test statt `.clear()` -- vermeidet
// Zustands-Überlauf zwischen Tests genauso zuverlässig.
function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = createFakeStorage();
});

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

  // Issue #81, "Stern-Icon-Kollision im Header" (design.md): ⭐ ist jetzt
  // exklusiv dem neuen Sterne-Badge vorbehalten, der bestehende
  // Rundenpunktestand zeigt stattdessen ✓ (Wiederverwendung des bereits
  // etablierten "richtig beantwortet"-Symbols).
  it("zeigt den Rundenpunktestand mit ✓ statt ⭐ (Icon-Kollision aufgelöst, Issue #81)", () => {
    const container = createContainer();
    renderHeader(container, {
      onBackToStart: () => {},
      mode: "quiz",
      progress: { currentIndex: 0, roundLength: 10, score: 3 },
    });

    const scoreEl = container.querySelector(".app-header__score");
    expect(scoreEl.textContent).toContain("✓");
    expect(scoreEl.textContent).not.toContain("⭐");
    expect(scoreEl.textContent).toContain("3");
  });
});

// Sterne-Badge (Issue #81, Sterne-/Maskottchen-Freischaltsystem). Wird
// IMMER gerendert, unabhängig vom `progress`-Options-Objekt (das nur den
// Rundenfortschritt steuert) -- daher auch ohne `mode`/`progress` sichtbar
// (Start-/Ergebnis-Bildschirm).
describe("renderHeader - Sterne-Badge", () => {
  it("zeigt den aktuellen Sternestand und ist deaktiviert, solange weniger als 5 Sterne vorhanden sind", () => {
    const container = createContainer();
    renderHeader(container, { onBackToStart: () => {} });

    const badge = container.querySelector(".app-header__star-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain("0/5");
    expect(badge.disabled).toBe(true);
    expect(badge.getAttribute("aria-disabled")).toBe("true");
    expect(badge.classList.contains("app-header__star-badge--redeemable")).toBe(
      false,
    );
  });

  it("bleibt deaktiviert bei 4 Sternen (knapp unter der Schwelle)", () => {
    setStars(4);
    const container = createContainer();
    renderHeader(container, { onBackToStart: () => {} });

    const badge = container.querySelector(".app-header__star-badge");
    expect(badge.textContent).toContain("4/5");
    expect(badge.disabled).toBe(true);
  });

  it("wird bei 5 Sternen zum aktivierten, animierten Button mit aria-label", () => {
    setStars(5);
    const container = createContainer();
    renderHeader(container, { onBackToStart: () => {} });

    const badge = container.querySelector(".app-header__star-badge");
    expect(badge.textContent).toContain("5/5");
    expect(badge.disabled).toBe(false);
    expect(badge.hasAttribute("aria-disabled")).toBe(false);
    expect(badge.getAttribute("aria-label")).toBe(
      "5 Sterne — neues Maskottchen wählen",
    );
    expect(badge.classList.contains("app-header__star-badge--redeemable")).toBe(
      true,
    );
  });

  it("ruft onOpenMascotChooser auf, wenn das einlösbare Badge geklickt wird", () => {
    setStars(5);
    const container = createContainer();
    const onOpenMascotChooser = vi.fn();
    renderHeader(container, {
      onBackToStart: () => {},
      onOpenMascotChooser,
    });

    container.querySelector(".app-header__star-badge").click();

    expect(onOpenMascotChooser).toHaveBeenCalledTimes(1);
  });

  it("ruft onOpenMascotChooser NICHT auf, wenn das deaktivierte Badge geklickt wird", () => {
    const container = createContainer();
    const onOpenMascotChooser = vi.fn();
    renderHeader(container, {
      onBackToStart: () => {},
      onOpenMascotChooser,
    });

    // Ein natives disabled-Button feuert in jsdom (wie im echten Browser)
    // ohnehin kein click-Event -- deckt "Klick auf deaktiviertes Badge tut
    // nichts" bereits strukturell ab.
    container.querySelector(".app-header__star-badge").click();

    expect(onOpenMascotChooser).not.toHaveBeenCalled();
  });
});
