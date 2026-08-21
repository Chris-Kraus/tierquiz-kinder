// @vitest-environment jsdom
//
// DOM-Tests für die Modus-Auswahl auf dem Start-Bildschirm (Issue #26/#31,
// design.md "Modus-Auswahl auf dem Start-Bildschirm"). Analog zum Muster in
// question.test.js: `data/animals.json` wird gemockt (Inhalt spielt für diese
// Story keine Rolle, siehe reverseQuestionGenerator.js/
// soundQuestionGenerator.js), und die beiden Fragegenerierungs-Module werden
// ebenfalls gemockt, damit sowohl der Erfolgs- als auch der Fehlschlag-Pfad
// des jeweiligen "Testabrufs" deterministisch prüfbar sind — unabhängig
// davon, ob die echte Implementierung (#27 bzw. #32) bereits vorliegt oder
// (aktueller Stand für #32) noch als Schnittstellen-Stub immer ablehnt.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";
import {
  loadProgress,
  setActiveIdx,
  redeemMascot,
  recordRoundCompletion,
} from "../quiz/progress.js";
import { GAME_MODE } from "../quiz/gameMode.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";
import { ALBUM_TARGET } from "../quiz/album.js";

vi.mock("../../data/animals.json", () => ({
  default: { animals: [] },
}));

const generateNextReverseQuestion = vi.fn();
vi.mock("../quiz/reverseQuestionGenerator.js", () => ({
  generateNextReverseQuestion: (...args) =>
    generateNextReverseQuestion(...args),
}));

const generateNextSoundQuestion = vi.fn();
vi.mock("../quiz/soundQuestionGenerator.js", () => ({
  generateNextSoundQuestion: (...args) => generateNextSoundQuestion(...args),
}));

// Issue #45: Testabruf für "Tier-Memory" ist buildMemoryDeck() — gleiches
// Mock-Prinzip wie die beiden Fragegeneratoren oben.
const buildMemoryDeck = vi.fn();
vi.mock("../quiz/memory.js", () => ({
  buildMemoryDeck: (...args) => buildMemoryDeck(...args),
}));

const generateNextLetterSearchQuestion = vi.fn();
vi.mock("../quiz/letterSearchQuestionGenerator.js", () => ({
  generateNextLetterSearchQuestion: (...args) =>
    generateNextLetterSearchQuestion(...args),
}));

const { renderStartScreen } = await import("./start.js");

function render() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onStart = vi.fn();
  renderStartScreen(container, { onStart });
  return { container, onStart };
}

// Karussell/Guide (Issue #82) lesen/schreiben den Fortschritt über die echte
// progress.js-API ohne Storage-Override -- gleiches Problem/gleiche Lösung
// wie in header.test.js/mascotChooser.test.js: diese jsdom/Node-Kombination
// stellt kein echtes globales `localStorage` bereit. In-Memory-Fake pro Test
// statt `.clear()`.
function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

// Treibt den Sternestand über die echte progress.js-API hoch (kein
// dupliziertes localStorage-Schema in den Tests), analog zu
// mascotChooser.test.js.
function setStars(n) {
  for (let i = 0; i < n; i += 1) {
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
  }
}

// Schaltet ein bestimmtes Maskottchen frei (5 Sterne hochtreiben, dann
// einlösen) -- baut `unlockedIds` ausschließlich über die echte
// redeemMascot()-API auf, kein direktes localStorage-Schreiben.
function unlockMascot(mascotId) {
  setStars(5);
  redeemMascot(mascotId);
}

beforeEach(() => {
  document.body.innerHTML = "";
  generateNextReverseQuestion.mockReset();
  generateNextSoundQuestion.mockReset();
  buildMemoryDeck.mockReset();
  generateNextLetterSearchQuestion.mockReset();
  globalThis.localStorage = createFakeStorage();
});

describe("Album 3×3-Raster (Issue #82)", () => {
  it("rendert genau ALBUM_TARGET (9) Album-Felder in einem 3-Spalten-Grid", () => {
    const { container } = render();

    const slots = container.querySelectorAll(".start-album-preview__slot");
    expect(slots).toHaveLength(ALBUM_TARGET);
    expect(ALBUM_TARGET).toBe(9);

    const badge = container.querySelector(".start-album-preview__badge");
    expect(badge.textContent).toBe(`0/${ALBUM_TARGET}`);
  });
});

describe("'Mein Maskottchen'-Karte (Issue #88, ersetzt Guide-Karte + Karussell aus Issue #82)", () => {
  it("zeigt das Start-Default-Maskottchen (Fine der Fuchs) mit Name, Rolle und Tint-Hintergrund", () => {
    const { container } = render();

    const stage = container.querySelector(".mascot-stage");
    expect(container.querySelector(".mascot-stage__name").textContent).toBe(
      "Fine der Fuchs",
    );
    expect(container.querySelector(".mascot-stage__role").textContent).toBe(
      "rät neugierig mit",
    );
    expect(container.querySelector(".mascot-stage__figure").textContent).toBe(
      MASCOTS[0].emoji,
    );
    expect(stage.getAttribute("style")).toContain(tintOf(0));
  });

  it("zeigt das aktive (nicht das erste) freigeschaltete Maskottchen samt passendem Tint, wenn activeIdx entsprechend gesetzt ist", () => {
    unlockMascot(1);
    unlockMascot(2);
    setActiveIdx(1); // unlockedIds = [0, 1, 2] -> Position 1 = Maskottchen id 1

    const { container } = render();

    expect(container.querySelector(".mascot-stage__name").textContent).toBe(
      MASCOTS[1].name,
    );
    expect(container.querySelector(".mascot-stage__role").textContent).toBe(
      MASCOTS[1].role,
    );
    expect(
      container.querySelector(".mascot-stage").getAttribute("style"),
    ).toContain(tintOf(1));
  });

  it("Bühne trägt aria-live='polite' (Ankündigung bei Pfeil-Wechsel ohne Fokuswechsel)", () => {
    const { container } = render();

    expect(
      container.querySelector(".mascot-stage").getAttribute("aria-live"),
    ).toBe("polite");
  });

  it("nutzt navControl.js für das Nav-Element -- Badge zeigt '{position}/{unlockedIds.length}', beide Pfeile disabled bei genau 1 freigeschaltetem Maskottchen", () => {
    const { container } = render();

    expect(container.querySelector(".nav-control__badge").textContent).toBe(
      "1/1",
    );
    expect(
      container.querySelector(".nav-control__arrow--prev").disabled,
    ).toBe(true);
    expect(
      container.querySelector(".nav-control__arrow--next").disabled,
    ).toBe(true);
  });

  it("hat kontextspezifische aria-label statt reiner Pfeil-Glyphen ('Vorheriges/Nächstes Maskottchen')", () => {
    const { container } = render();

    expect(
      container
        .querySelector(".nav-control__arrow--prev")
        .getAttribute("aria-label"),
    ).toBe("Vorheriges Maskottchen");
    expect(
      container
        .querySelector(".nav-control__arrow--next")
        .getAttribute("aria-label"),
    ).toBe("Nächstes Maskottchen");
  });

  it("aktiviert beide Pfeile in der Mitte von 3 freigeschalteten Maskottchen, Badge zeigt '2/3'", () => {
    unlockMascot(1);
    unlockMascot(2);
    setActiveIdx(1); // Mitte von 3 freigeschalteten Maskottchen

    const { container } = render();

    expect(
      container.querySelector(".nav-control__arrow--prev").disabled,
    ).toBe(false);
    expect(
      container.querySelector(".nav-control__arrow--next").disabled,
    ).toBe(false);
    expect(container.querySelector(".nav-control__badge").textContent).toBe(
      "2/3",
    );
  });

  it("navigiert per Pfeil-Klick, aktualisiert Bühne/Badge synchron und persistiert setActiveIdx", () => {
    unlockMascot(1);
    unlockMascot(2);
    setActiveIdx(0); // unlockedIds = [0, 1, 2], starte bei Fine (id 0)

    const { container } = render();

    expect(container.querySelector(".mascot-stage__name").textContent).toBe(
      MASCOTS[0].name,
    );

    container.querySelector(".nav-control__arrow--next").click();

    expect(container.querySelector(".mascot-stage__name").textContent).toBe(
      MASCOTS[1].name,
    );
    expect(container.querySelector(".nav-control__badge").textContent).toBe(
      "2/3",
    );
    // Persistiert über setActiveIdx (progress.js) statt nur lokalem UI-Zustand.
    expect(loadProgress().activeIdx).toBe(1);

    container.querySelector(".nav-control__arrow--prev").click();
    expect(container.querySelector(".mascot-stage__name").textContent).toBe(
      MASCOTS[0].name,
    );
    expect(loadProgress().activeIdx).toBe(0);
  });

  it("registriert zwei schnell aufeinanderfolgende Klicks auf 'weiter' als zwei Schritte, nicht nur einen (manueller Doppel-Tap-Test, architecture.md Punkt 3)", () => {
    unlockMascot(1);
    unlockMascot(2);
    setActiveIdx(0); // unlockedIds = [0, 1, 2]

    const { container } = render();

    // Zwei schnelle, synchron aufeinanderfolgende click()-Aufrufe auf DASSELBE
    // ursprünglich gerenderte Element -- kein await/Timeout dazwischen. Der
    // erste Klick rendert mascotCardBodyEl per innerHTML komplett neu (siehe
    // start.js, renderSideSection()); da beide click()-Aufrufe synchron im
    // selben Tick laufen, simuliert das exakt das im Story-Auftrag
    // beschriebene Doppel-Tap-Szenario (nicht nur ein einzelner Klick, der
    // zufällig zweimal geprüft wird).
    container.querySelector(".nav-control__arrow--next").click();
    container.querySelector(".nav-control__arrow--next").click();

    expect(loadProgress().activeIdx).toBe(2);
    expect(container.querySelector(".mascot-stage__name").textContent).toBe(
      MASCOTS[2].name,
    );
    expect(container.querySelector(".nav-control__badge").textContent).toBe(
      "3/3",
    );
  });

  it("bewahrt bereits getroffene Schwierigkeitsstufen-Auswahl über einen Nav-Pfeilklick hinweg", () => {
    unlockMascot(1);
    const { container } = render();

    const easyButton = container.querySelector(
      `[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`,
    );
    easyButton.click();
    expect(easyButton.classList.contains("difficulty-button--selected")).toBe(
      true,
    );

    container.querySelector(".nav-control__arrow--next").click();

    // Die Seitenspalte (Bühne/Nav/Album) wurde neu gerendert, die
    // Schwierigkeitsstufen-Auswahl links (unabhängiger DOM-Bereich/lokaler
    // Zustand) bleibt davon unberührt.
    expect(
      container
        .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
        .classList.contains("difficulty-button--selected"),
    ).toBe(true);
    expect(container.querySelector(".start-button").disabled).toBe(false);
  });

  describe("Hinweiszeile: drei Fälle (Handoff Abschnitt 2.5)", () => {
    it("einlösbar: 'Du hast {stars} Sterne — du darfst dir ein neues Maskottchen aussuchen!'", () => {
      setStars(5);
      const { container } = render();

      expect(
        container.querySelector(".start-mascot-card__hint").textContent,
      ).toBe("Du hast 5 Sterne — du darfst dir ein neues Maskottchen aussuchen!");
    });

    it("normal, Singular: 'Noch 1 Stern, bis du ein weiteres Maskottchen freischalten kannst.' bei 4 Sternen", () => {
      setStars(4);
      const { container } = render();

      expect(
        container.querySelector(".start-mascot-card__hint").textContent,
      ).toBe(
        "Noch 1 Stern, bis du ein weiteres Maskottchen freischalten kannst.",
      );
    });

    it("normal, Plural: 'Noch 5 Sterne, bis du ein weiteres Maskottchen freischalten kannst.' bei 0 Sternen (Start-Default)", () => {
      const { container } = render();

      expect(
        container.querySelector(".start-mascot-card__hint").textContent,
      ).toBe(
        "Noch 5 Sterne, bis du ein weiteres Maskottchen freischalten kannst.",
      );
    });

    it("alle 50 gesammelt: 'Du hast alle 50 Maskottchen gesammelt!'", () => {
      for (let id = 1; id < MASCOTS.length; id += 1) {
        unlockMascot(id);
      }
      const { container } = render();

      expect(loadProgress().unlockedIds).toHaveLength(50);
      expect(
        container.querySelector(".start-mascot-card__hint").textContent,
      ).toBe("Du hast alle 50 Maskottchen gesammelt!");
      // Auch bei zusätzlichen 5 Sternen bleibt es bei der "alle gesammelt"-
      // Meldung, nicht der einlösbaren -- kein Redeem-Screen mehr möglich.
    });
  });
});

describe("Modus-Auswahl (Issue #26)", () => {
  it("zeigt 'Quizfragen' vorbelegt/hervorgehoben und 'Wer bin ich?' mit Online-Hinweis", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const reverseButton = container.querySelector('[data-mode="reverse"]');

    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(quizButton.getAttribute("aria-pressed")).toBe("true");
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(reverseButton.getAttribute("aria-pressed")).toBe("false");

    const onlineIcon = reverseButton.querySelector(".mode-button__online-icon");
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    // Der bestehende Quizfragen-Modus bekommt laut Akzeptanzkriterium kein
    // Online-Icon.
    expect(quizButton.querySelector(".mode-button__online-icon")).toBeNull();
  });

  it("bleibt bei 'Quizfragen', wenn der Testabruf fehlschlägt, mit freundlichem Hinweis statt Fehlertext", async () => {
    generateNextReverseQuestion.mockRejectedValue(new Error("Netzwerkfehler"));
    const { container } = render();

    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();

    // Ladezustand direkt in der Kachel, keine Sperre des restlichen Bildschirms.
    expect(reverseButton.getAttribute("aria-busy")).toBe("true");
    expect(reverseButton.disabled).toBe(true);

    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(reverseButton.disabled).toBe(false);

    const hintEl = container.querySelector(".mode-picker__hint");
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("Dafür brauchst du gerade Internet 🌐");
    // Kein technischer Fehlertext im DOM.
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
  });

  it("wählt 'Wer bin ich?' aus, wenn der Testabruf gelingt", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "Wer bin ich?" });
    const { container } = render();

    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();

    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      true,
    );
    expect(reverseButton.getAttribute("aria-pressed")).toBe("true");
    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(false);
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
  });

  it("ruft den Testabruf mit der aktuell gewählten Schwierigkeitsstufe auf, sobald eine gewählt ist", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "x" });
    const { container } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
      .click();
    container.querySelector('[data-mode="reverse"]').click();

    await vi.waitFor(() => {
      expect(generateNextReverseQuestion).toHaveBeenCalled();
    });
    expect(generateNextReverseQuestion.mock.calls[0][2]).toBe(
      DIFFICULTY_LEVELS.HARD,
    );
  });

  it("lässt die bestehende Schwierigkeitsstufen-Auswahl unverändert und unabhängig von der Modus-Auswahl funktionieren", () => {
    const { container } = render();

    const startButton = container.querySelector(".start-button");
    expect(startButton.disabled).toBe(true);

    const easyButton = container.querySelector(
      `[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`,
    );
    easyButton.click();

    expect(easyButton.classList.contains("difficulty-button--selected")).toBe(
      true,
    );
    expect(startButton.disabled).toBe(false);
  });
});

describe("Modus-Auswahl: dritte Kachel 'Tiergeräusche' (Issue #31)", () => {
  it("zeigt 'Tiergeräusche' mit Lautsprecher- und Online-Icon, ohne die bestehenden zwei Kacheln zu verändern", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    const soundButton = container.querySelector('[data-mode="sound"]');

    expect(soundButton).not.toBeNull();
    // Seit Issue #87: Kurzlabel "Tierlaute" statt "Tiergeräusche" auf der
    // Kachel selbst (Handoff-Vorgabe gegen Mitten-im-Wort-Umbruch in der
    // schmaleren Einzeilen-Kachel) -- die Kopfzeilen-Modus-Pille (header.js)
    // bleibt unverändert bei "Tiergeräusche", nicht Teil dieser Story.
    expect(soundButton.querySelector(".mode-button__label").textContent).toBe(
      "Tierlaute",
    );
    expect(soundButton.querySelector(".mode-button__icon").textContent).toBe(
      "🔊",
    );
    const onlineIcon = soundButton.querySelector(".mode-button__online-icon");
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    expect(soundButton.classList.contains("mode-button--selected")).toBe(false);
    expect(soundButton.getAttribute("aria-pressed")).toBe("false");

    // Die beiden bestehenden Kacheln bleiben unverändert (Akzeptanzkriterium
    // "bleiben unverändert erhalten und funktionieren unabhängig von der
    // neuen dritten Kachel").
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(reverseButton.querySelector(".mode-button__label").textContent).toBe(
      "Wer bin ich?",
    );
  });

  it("bleibt bei 'Quizfragen', wenn der Testabruf für 'Tiergeräusche' fehlschlägt, mit freundlichem Hinweis statt Fehlertext", async () => {
    generateNextSoundQuestion.mockRejectedValue(new Error("Netzwerkfehler"));
    const { container } = render();

    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();

    expect(soundButton.getAttribute("aria-busy")).toBe("true");
    expect(soundButton.disabled).toBe(true);

    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(soundButton.classList.contains("mode-button--selected")).toBe(false);
    expect(soundButton.disabled).toBe(false);

    const hintEl = container.querySelector(".mode-picker__hint");
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("Dafür brauchst du gerade Internet 🌐");
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
  });

  it("wählt 'Tiergeräusche' aus, wenn der Testabruf gelingt", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container } = render();

    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();

    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(soundButton.classList.contains("mode-button--selected")).toBe(true);
    expect(soundButton.getAttribute("aria-pressed")).toBe("true");
    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(false);
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
  });

  it("ruft den Testabruf für 'Tiergeräusche' mit der aktuell gewählten Schwierigkeitsstufe auf", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "x" });
    const { container } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
      .click();
    container.querySelector('[data-mode="sound"]').click();

    await vi.waitFor(() => {
      expect(generateNextSoundQuestion).toHaveBeenCalled();
    });
    expect(generateNextSoundQuestion.mock.calls[0][2]).toBe(
      DIFFICULTY_LEVELS.HARD,
    );
  });

  it("erzeugt beim Start einen Quiz-Zustand mit mode 'sound', wenn 'Tiergeräusche' erfolgreich ausgewählt wurde", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("sound");
  });

  it("wechselt unabhängig zwischen 'Wer bin ich?' und 'Tiergeräusche', ohne dass sich die Kacheln gegenseitig stören", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "Wer bin ich?" });
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container } = render();

    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();
    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      true,
    );

    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(soundButton.classList.contains("mode-button--selected")).toBe(true);
    expect(reverseButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
  });
});

describe("Modus-Auswahl: vierte Kachel 'Tier-Memory' (Issue #45)", () => {
  it("zeigt 'Tier-Memory' mit eigenem Icon und Online-Hinweis, ohne die bestehenden drei Kacheln zu verändern", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const memoryButton = container.querySelector('[data-mode="memory"]');

    expect(memoryButton).not.toBeNull();
    expect(
      memoryButton.querySelector(".mode-button__label").textContent,
    ).toBe("Tier-Memory");
    const onlineIcon = memoryButton.querySelector(".mode-button__online-icon");
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    expect(memoryButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
  });

  it("zeigt beim Rendern die Fragenanzahl-Auswahl (gilt erst nach Auswahl von Tier-Memory nicht mehr)", () => {
    const { container } = render();
    expect(container.querySelector(".round-length-picker").hidden).toBe(
      false,
    );
  });

  it("bleibt bei 'Quizfragen', wenn der Testabruf (Deck-Aufbau) fehlschlägt, mit freundlichem Hinweis statt Fehlertext", async () => {
    buildMemoryDeck.mockRejectedValue(new Error("Netzwerkfehler"));
    const { container } = render();

    const memoryButton = container.querySelector('[data-mode="memory"]');
    memoryButton.click();

    expect(memoryButton.getAttribute("aria-busy")).toBe("true");
    expect(memoryButton.disabled).toBe(true);

    await vi.waitFor(() => {
      expect(memoryButton.getAttribute("aria-busy")).toBe("false");
    });

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(memoryButton.classList.contains("mode-button--selected")).toBe(
      false,
    );

    const hintEl = container.querySelector(".mode-picker__hint");
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("Dafür brauchst du gerade Internet 🌐");
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
    // Fragenanzahl-Auswahl bleibt bei einem Fehlschlag/Verbleib bei
    // "Quizfragen" weiterhin sichtbar.
    expect(container.querySelector(".round-length-picker").hidden).toBe(
      false,
    );
  });

  it("wählt 'Tier-Memory' aus und blendet die Fragenanzahl-Auswahl aus, wenn der Testabruf gelingt", async () => {
    buildMemoryDeck.mockResolvedValue([{ cardId: "a" }]);
    const { container } = render();

    const memoryButton = container.querySelector('[data-mode="memory"]');
    memoryButton.click();

    await vi.waitFor(() => {
      expect(memoryButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(memoryButton.classList.contains("mode-button--selected")).toBe(
      true,
    );
    expect(memoryButton.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
    // Issue #45 Akzeptanzkriterium: kein Fragenanzahl-Auswahlschritt für
    // diesen Modus.
    expect(container.querySelector(".round-length-picker").hidden).toBe(
      true,
    );
  });

  it("blendet die Fragenanzahl-Auswahl wieder ein, wenn nach Tier-Memory zu einem anderen Modus gewechselt wird", async () => {
    buildMemoryDeck.mockResolvedValue([{ cardId: "a" }]);
    const { container } = render();

    const memoryButton = container.querySelector('[data-mode="memory"]');
    memoryButton.click();
    await vi.waitFor(() => {
      expect(memoryButton.getAttribute("aria-busy")).toBe("false");
    });
    expect(container.querySelector(".round-length-picker").hidden).toBe(
      true,
    );

    container.querySelector('[data-mode="quiz"]').click();
    expect(container.querySelector(".round-length-picker").hidden).toBe(
      false,
    );
  });

  it("ruft den Testabruf (Deck-Aufbau) mit der aktuell gewählten Schwierigkeitsstufe auf", async () => {
    buildMemoryDeck.mockResolvedValue([{ cardId: "a" }]);
    const { container } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
      .click();
    container.querySelector('[data-mode="memory"]').click();

    await vi.waitFor(() => {
      expect(buildMemoryDeck).toHaveBeenCalled();
    });
    expect(buildMemoryDeck.mock.calls[0][1]).toBe(DIFFICULTY_LEVELS.HARD);
  });
});

describe("Modus-Auswahl: fünfte Kachel 'Buchstabensuche' (Issue #46)", () => {
  it("zeigt 'Buchstabensuche' mit Buchstaben- und Online-Icon, ohne die bestehenden Kacheln zu verändern", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    const soundButton = container.querySelector('[data-mode="sound"]');
    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );

    expect(letterSearchButton).not.toBeNull();
    // Seit Issue #87: Kurzlabel "Buchstaben" statt "Buchstabensuche" auf der
    // Kachel (dieselbe Kurzform, die header.js für die Kopfzeilen-Modus-Pille
    // bereits verwendet, siehe HEADER_MODE_LABELS).
    expect(
      letterSearchButton.querySelector(".mode-button__label").textContent,
    ).toBe("Buchstaben");
    const onlineIcon = letterSearchButton.querySelector(
      ".mode-button__online-icon",
    );
    expect(onlineIcon).not.toBeNull();
    expect(onlineIcon.getAttribute("aria-label")).toMatch(/Internet/);
    expect(letterSearchButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(letterSearchButton.getAttribute("aria-pressed")).toBe("false");

    // Die bestehenden Kacheln bleiben unverändert.
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(reverseButton.querySelector(".mode-button__label").textContent).toBe(
      "Wer bin ich?",
    );
    expect(soundButton.querySelector(".mode-button__label").textContent).toBe(
      "Tierlaute",
    );
  });

  it("bleibt bei 'Quizfragen', wenn der Testabruf für 'Buchstabensuche' fehlschlägt, mit freundlichem Hinweis statt Fehlertext", async () => {
    generateNextLetterSearchQuestion.mockRejectedValue(
      new Error("Netzwerkfehler"),
    );
    const { container } = render();

    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();

    expect(letterSearchButton.getAttribute("aria-busy")).toBe("true");
    expect(letterSearchButton.disabled).toBe(true);

    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(true);
    expect(letterSearchButton.classList.contains("mode-button--selected")).toBe(
      false,
    );
    expect(letterSearchButton.disabled).toBe(false);

    const hintEl = container.querySelector(".mode-picker__hint");
    expect(hintEl.hidden).toBe(false);
    expect(hintEl.textContent).toBe("Dafür brauchst du gerade Internet 🌐");
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
  });

  it("wählt 'Buchstabensuche' aus, wenn der Testabruf gelingt", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "Löwe",
    });
    const { container } = render();

    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();

    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    expect(letterSearchButton.classList.contains("mode-button--selected")).toBe(
      true,
    );
    expect(letterSearchButton.getAttribute("aria-pressed")).toBe("true");
    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(quizButton.classList.contains("mode-button--selected")).toBe(false);
    expect(container.querySelector(".mode-picker__hint").hidden).toBe(true);
  });

  it("ruft den Testabruf für 'Buchstabensuche' OHNE Schwierigkeitsstufen-Parameter auf (architecture.md: kein difficulty-Parameter nötig)", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "x",
    });
    const { container } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.HARD}"]`)
      .click();
    container.querySelector('[data-mode="letterSearch"]').click();

    await vi.waitFor(() => {
      expect(generateNextLetterSearchQuestion).toHaveBeenCalled();
    });
    expect(generateNextLetterSearchQuestion.mock.calls[0]).toHaveLength(2);
  });

  it("erzeugt beim Start einen Quiz-Zustand mit mode 'letterSearch', wenn 'Buchstabensuche' erfolgreich ausgewählt wurde", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "Löwe",
    });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();
    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("letterSearch");
    expect(quizState.pendingLetterSearchQuestion).toEqual({
      animalName: "Löwe",
    });
    expect(generateNextLetterSearchQuestion).toHaveBeenCalledTimes(1);
  });

  it("verwirft ein zwischenzeitlich vorhandenes Buchstabensuche-Testabruf-Ergebnis, wenn zurück zu 'Quizfragen' gewechselt wird", async () => {
    generateNextLetterSearchQuestion.mockResolvedValue({
      animalName: "Löwe",
    });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const letterSearchButton = container.querySelector(
      '[data-mode="letterSearch"]',
    );
    letterSearchButton.click();
    await vi.waitFor(() => {
      expect(letterSearchButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector('[data-mode="quiz"]').click();
    container.querySelector(".start-button").click();

    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingLetterSearchQuestion).toBeUndefined();
  });
});

// Issue #28: der Modus ist jetzt tatsächlich spielbar -- der Start-Button
// muss den gewählten Modus sowie (im Erfolgsfall des Testabrufs) die bereits
// aufgelöste erste Frage an den neu erzeugten Quiz-Zustand weiterreichen
// (siehe reverseQuestion.js, das dieses transiente Feld konsumiert, um sich
// den doppelten Netzwerk-Aufruf für Frage 1 zu sparen).
describe("Start-Button — Moduswahl an den Quiz-Zustand weiterreichen (Issue #28)", () => {
  it("erzeugt einen Quiz-Zustand mit mode 'quiz' und ohne pendingReverseQuestion, wenn 'Quizfragen' gewählt bleibt", () => {
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingReverseQuestion).toBeUndefined();
  });

  it("erzeugt nach erfolgreichem Testabruf einen Quiz-Zustand mit mode 'reverse' und der bereits aufgelösten ersten Frage", async () => {
    const resolvedQuestion = { text: "Wer bin ich?" };
    generateNextReverseQuestion.mockResolvedValue(resolvedQuestion);
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();
    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("reverse");
    expect(quizState.pendingReverseQuestion).toBe(resolvedQuestion);
    // Der Testabruf selbst darf für den eigentlichen Rundenstart nicht noch
    // einmal ausgelöst werden (kein zweiter Aufruf durch den Start-Klick).
    expect(generateNextReverseQuestion).toHaveBeenCalledTimes(1);
  });

  it("verwirft ein zwischenzeitlich vorhandenes Testabruf-Ergebnis, wenn zurück zu 'Quizfragen' gewechselt wird", async () => {
    generateNextReverseQuestion.mockResolvedValue({ text: "Wer bin ich?" });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const reverseButton = container.querySelector('[data-mode="reverse"]');
    reverseButton.click();
    await vi.waitFor(() => {
      expect(reverseButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector('[data-mode="quiz"]').click();
    container.querySelector(".start-button").click();

    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingReverseQuestion).toBeUndefined();
  });

  // Analog zu den drei "Wer bin ich?"-Tests oben, aber für Issue #33
  // ('Tiergeräusche') -- deckt den beim Rebase-Merge-Konflikt (siehe main.js/
  // start.js-Historie) neu verdrahteten `pendingSoundQuestion`-Pfad ab, der
  // bislang ungetestet war.
  it("erzeugt nach erfolgreichem Testabruf einen Quiz-Zustand mit mode 'sound' und der bereits aufgelösten ersten Frage", async () => {
    const resolvedQuestion = { text: "Tiergeräusch" };
    generateNextSoundQuestion.mockResolvedValue(resolvedQuestion);
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("sound");
    expect(quizState.pendingSoundQuestion).toBe(resolvedQuestion);
    // Der Testabruf selbst darf für den eigentlichen Rundenstart nicht noch
    // einmal ausgelöst werden (kein zweiter Aufruf durch den Start-Klick).
    expect(generateNextSoundQuestion).toHaveBeenCalledTimes(1);
  });

  it("verwirft ein zwischenzeitlich vorhandenes Tiergeräusche-Testabruf-Ergebnis, wenn zurück zu 'Quizfragen' gewechselt wird", async () => {
    generateNextSoundQuestion.mockResolvedValue({ text: "Tiergeräusch" });
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const soundButton = container.querySelector('[data-mode="sound"]');
    soundButton.click();
    await vi.waitFor(() => {
      expect(soundButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector('[data-mode="quiz"]').click();
    container.querySelector(".start-button").click();

    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingSoundQuestion).toBeUndefined();
  });

  // Analog zu den "Wer bin ich?"/"Tiergeräusche"-Tests oben, für Issue #45.
  it("erzeugt nach erfolgreichem Testabruf einen Quiz-Zustand mit mode 'memory' und dem bereits aufgebauten Deck", async () => {
    const resolvedDeck = [{ cardId: "a" }, { cardId: "b" }];
    buildMemoryDeck.mockResolvedValue(resolvedDeck);
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const memoryButton = container.querySelector('[data-mode="memory"]');
    memoryButton.click();
    await vi.waitFor(() => {
      expect(memoryButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector(".start-button").click();

    expect(onStart).toHaveBeenCalledTimes(1);
    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("memory");
    expect(quizState.pendingMemoryDeck).toBe(resolvedDeck);
    expect(quizState.pendingMemoryDeckDifficulty).toBe(DIFFICULTY_LEVELS.EASY);
    // Der Testabruf selbst darf für den eigentlichen Rundenstart nicht noch
    // einmal ausgelöst werden (kein zweiter Aufruf durch den Start-Klick).
    expect(buildMemoryDeck).toHaveBeenCalledTimes(1);
  });

  it("verwirft ein zwischenzeitlich vorhandenes Tier-Memory-Testabruf-Ergebnis, wenn zurück zu 'Quizfragen' gewechselt wird", async () => {
    buildMemoryDeck.mockResolvedValue([{ cardId: "a" }]);
    const { container, onStart } = render();

    container
      .querySelector(`[data-difficulty="${DIFFICULTY_LEVELS.EASY}"]`)
      .click();
    const memoryButton = container.querySelector('[data-mode="memory"]');
    memoryButton.click();
    await vi.waitFor(() => {
      expect(memoryButton.getAttribute("aria-busy")).toBe("false");
    });

    container.querySelector('[data-mode="quiz"]').click();
    container.querySelector(".start-button").click();

    const quizState = onStart.mock.calls[0][0];
    expect(quizState.mode).toBe("quiz");
    expect(quizState.pendingMemoryDeck).toBeUndefined();
  });
});

// Issue #87: reiner Zeilenlayout-Umbau der Startseite (Titel -> Kartenzeile
// "Mein Maskottchen"/"Meine Sammlung" -> Modus-Auswahl in EINER Reihe ->
// Schwierigkeit -> Fragenanzahl -> CTA), siehe requirements.md/design.md
// "Startseiten-/Sammlungs-Neuaufbau". Bewusst strukturelle statt visuelle
// Assertions (keine Prüfung konkreter CSS-Pixelwerte, siehe Story-Vorgabe) --
// die tatsächliche Ein-Zeilen-Darstellung bei 1280px ist zusätzlich per
// Screenshot manuell verifiziert (siehe PR-Beschreibung).
describe("Zeilenlayout der Startseite (Issue #87)", () => {
  it("Titelzeile (H1 + Absatz) steht in einer eigenen, vollbreiten Zeile", () => {
    const { container } = render();

    const titleRow = container.querySelector(".start-screen__title-row");
    expect(titleRow).not.toBeNull();
    expect(titleRow.querySelector("#start-title")).not.toBeNull();
    expect(titleRow.querySelector(".start-screen__intro")).not.toBeNull();
  });

  it("Kartenzeile mit genau zwei Karten ('Mein Maskottchen' links, 'Meine Sammlung' rechts) steht zwischen Titelzeile und Modus-Auswahl", () => {
    const { container } = render();

    const cardsRow = container.querySelector(".start-cards");
    expect(cardsRow).not.toBeNull();

    const cards = cardsRow.querySelectorAll(".start-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector(".start-card__title").textContent).toBe(
      "Mein Maskottchen",
    );
    expect(cards[1].querySelector(".start-card__title").textContent).toBe(
      "Meine Sammlung",
    );

    // Reihenfolge der Zeilen: Titel -> Karten -> Modus-Auswahl (design.md,
    // "Startseiten-/Sammlungs-Neuaufbau").
    const rows = Array.from(
      container.querySelector(".start-screen").children,
    );
    const titleRowIndex = rows.indexOf(
      container.querySelector(".start-screen__title-row"),
    );
    const cardsRowIndex = rows.indexOf(cardsRow);
    const modePickerIndex = rows.indexOf(
      container.querySelector(".mode-picker"),
    );
    expect(titleRowIndex).toBeLessThan(cardsRowIndex);
    expect(cardsRowIndex).toBeLessThan(modePickerIndex);
  });

  it("zeigt alle 5 Modus-Kacheln in EINER Reihe -- genau ein .mode-picker__group, kein Umbruch auf mehrere Container (Reversion der 2-zeiligen Entscheidung vom 16.08.2026)", () => {
    const { container } = render();

    const groups = container.querySelectorAll(".mode-picker__group");
    expect(groups).toHaveLength(1);
    expect(groups[0].querySelectorAll(".mode-button")).toHaveLength(5);
  });

  it("jede Modus-Kachel zeigt Icon, Label UND einen kurzen Hinweistext (z. B. 'Antwort antippen')", () => {
    const { container } = render();

    const quizButton = container.querySelector('[data-mode="quiz"]');
    expect(
      quizButton.querySelector(".mode-button__icon").textContent,
    ).toBe("❓");
    expect(
      quizButton.querySelector(".mode-button__label").textContent,
    ).toBe("Quizfragen");
    expect(
      quizButton.querySelector(".mode-button__hint").textContent,
    ).toBe("Antwort antippen");
  });

  it("Schwierigkeits-Zeile ist als eigene Zeilen-Sektion (Label + Kachel-Gruppe) umschlossen", () => {
    const { container } = render();

    const row = container.querySelector(".difficulty-picker-row");
    expect(row).not.toBeNull();
    expect(row.querySelector("#difficulty-picker-label")).not.toBeNull();
    expect(row.querySelector(".difficulty-picker")).not.toBeNull();
  });

  it("Fragenanzahl-Kacheln behalten alle vier bestehenden Optionen (5/10/15/20 Fragen) im neuen Zeilenlayout -- bewusst NICHT auf 3 reduziert, siehe Datei-Kommentar bei ROUND_LENGTH_OPTIONS in start.js", () => {
    const { container } = render();

    const chips = Array.from(container.querySelectorAll(".round-length-chip"));
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "5 Fragen",
      "10 Fragen",
      "15 Fragen",
      "20 Fragen",
    ]);
  });

  it("CTA-Button 'Los geht's! 🚀' steht als letzte, vollbreite Zeile nach der Fragenanzahl-Auswahl", () => {
    const { container } = render();

    const rows = Array.from(
      container.querySelector(".start-screen").children,
    );
    const roundLengthIndex = rows.indexOf(
      container.querySelector(".round-length-picker"),
    );
    const ctaIndex = rows.indexOf(container.querySelector(".start-button"));
    expect(roundLengthIndex).toBeLessThan(ctaIndex);
    expect(ctaIndex).toBe(rows.length - 1);
  });
});
