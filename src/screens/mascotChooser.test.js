// @vitest-environment jsdom
//
// Tests für src/screens/mascotChooser.js (Issue #81, zweiter Teil des
// Sterne-/Maskottchen-Freischaltsystems #80-#83). Gleiches DOM-Test-Muster
// wie question.test.js/reverseQuestion.test.js (jsdom-Umgebung, echtes
// Rendern in einen an document.body gehängten Container).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderMascotChooserScreen } from "./mascotChooser.js";
import {
  loadProgress,
  recordRoundCompletion,
} from "../quiz/progress.js";
import { GAME_MODE } from "../quiz/gameMode.js";
import { MASCOTS } from "../quiz/mascots.js";

function createContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

// Treibt den Sternestand über die echte progress.js-API hoch, analog zu
// header.test.js -- kein dupliziertes localStorage-Schema in den Tests.
function setStars(n) {
  for (let i = 0; i < n; i += 1) {
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
  }
}

// Gleiches Problem/gleiche Lösung wie in header.test.js: mascotChooser.js
// ruft loadProgress()/redeemMascot() ohne Storage-Override auf, diese
// jsdom/Node-Kombination stellt aber kein echtes globales `localStorage`
// bereit. In-Memory-Fake pro Test statt `.clear()`.
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
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("renderMascotChooserScreen", () => {
  it("zeigt nur noch nicht freigeschaltete Maskottchen (Start-Default: nur id 0 freigeschaltet)", () => {
    const container = createContainer();
    renderMascotChooserScreen(container, { onDone: () => {} });

    const tiles = container.querySelectorAll(".mascot-tile");
    // MASCOTS hat 50 Einträge, id 0 ist per Default bereits freigeschaltet
    // -> 49 offene Kacheln.
    expect(tiles).toHaveLength(MASCOTS.length - 1);

    const tileIds = Array.from(tiles).map((tile) =>
      Number(tile.dataset.mascotId),
    );
    expect(tileIds).not.toContain(0);
    expect(tileIds).toContain(1);

    // Reihenfolge = Listenreihenfolge (Handoff: "nicht nur die nächsten
    // sechs", Reihenfolge = Listenreihenfolge).
    expect(tileIds).toEqual([...tileIds].sort((a, b) => a - b));
  });

  it("zeigt Kopf, Titel und Intro-Text laut Handoff", () => {
    const container = createContainer();
    renderMascotChooserScreen(container, { onDone: () => {} });

    expect(container.querySelector(".mascot-chooser__label").textContent).toBe(
      "5 Sterne eingelöst",
    );
    expect(container.querySelector(".mascot-chooser__title").textContent).toBe(
      "Wähl dein neues Maskottchen!",
    );
    expect(container.querySelector(".mascot-chooser__later")).not.toBeNull();
  });

  it('ruft onDone() ohne Einlösen auf, wenn "Später ↩" getippt wird', () => {
    const container = createContainer();
    const onDone = vi.fn();
    renderMascotChooserScreen(container, { onDone });

    container.querySelector(".mascot-chooser__later").click();

    expect(onDone).toHaveBeenCalledTimes(1);
    // Kein Einlösen -- Fortschritt bleibt beim Start-Default.
    expect(loadProgress()).toEqual({ stars: 0, unlockedIds: [0], activeIdx: 0 });
  });

  it("löst beim Klick auf eine Kachel das Maskottchen ein (Sterne -5, unlockedIds erweitert) und ruft danach onDone() auf", () => {
    setStars(5);
    const container = createContainer();
    const onDone = vi.fn();
    renderMascotChooserScreen(container, { onDone });

    const firstTile = container.querySelector(
      '.mascot-tile[data-mascot-id="1"]',
    );
    expect(firstTile).not.toBeNull();
    firstTile.click();

    // Einlösen passiert synchron beim Klick, onDone() erst nach der kurzen
    // Konfetti-Sichtbarkeits-Verzögerung (siehe mascotChooser.js,
    // CONFETTI_VIEW_DELAY_MS).
    const progress = loadProgress();
    expect(progress.stars).toBe(0);
    expect(progress.unlockedIds).toEqual([0, 1]);
    expect(progress.activeIdx).toBe(1);

    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("tut nichts (kein Einlösen, kein onDone), wenn ein Maskottchen ohne ausreichende Sterne angeklickt wird", () => {
    // 0 Sterne (Default) -- redeemMascot() sollte laut Guard No-Op sein.
    const container = createContainer();
    const onDone = vi.fn();
    renderMascotChooserScreen(container, { onDone });

    container.querySelector('.mascot-tile[data-mascot-id="1"]').click();

    expect(loadProgress()).toEqual({ stars: 0, unlockedIds: [0], activeIdx: 0 });
    vi.advanceTimersByTime(2000);
    expect(onDone).not.toHaveBeenCalled();
  });
});
