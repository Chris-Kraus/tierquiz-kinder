// @vitest-environment jsdom
//
// DOM-Tests für den Ergebnis-Bildschirm — bislang ungetestet, diese Datei
// deckt gezielt den neuen Tier-Memory-Zweig ab (Issue #45, design.md
// "Rundenende"): eigener, durchweg wertschätzender Text statt "X von Y
// richtig" sowie bewusst KEIN Eintrag in der Ergebnis-Verlaufsliste (#14/#36).
// `../quiz/history.js` wird komplett gemockt, damit die Tests unabhängig von
// echtem localStorage-Verhalten sind und sich `saveResultToHistory` gezielt
// beobachten lässt.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GAME_MODE } from "../quiz/gameMode.js";
import {
  loadProgress,
  setActiveIdx,
  redeemMascot,
  recordRoundCompletion,
} from "../quiz/progress.js";
import { MASCOTS } from "../quiz/mascots.js";

const saveResultToHistory = vi.fn();
vi.mock("../quiz/history.js", () => ({
  saveResultToHistory: (...args) => saveResultToHistory(...args),
  deleteHistoryEntry: vi.fn(() => []),
  clearResultHistory: vi.fn(() => []),
}));

const { renderResultScreen } = await import("./result.js");

// Gleiches In-Memory-Fake wie in start.test.js/header.test.js/
// mascotChooser.test.js -- diese jsdom/Node-Kombination stellt kein echtes
// globales `localStorage` bereit, progress.js braucht aber eines (kein
// Storage-Parameter aus result.js heraus).
function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

function setStars(n) {
  for (let i = 0; i < n; i += 1) {
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
  }
}

function unlockMascot(mascotId) {
  setStars(5);
  redeemMascot(mascotId);
}

function render(quizState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  renderResultScreen(container, quizState, {
    onPlayAgain: vi.fn(),
    onBackToStart: vi.fn(),
  });
  return container;
}

beforeEach(() => {
  document.body.innerHTML = "";
  saveResultToHistory.mockReset();
  saveResultToHistory.mockReturnValue([]);
  globalThis.localStorage = createFakeStorage();
});

// Issue #90: die rechte Spalte zeigt jetzt dieselbe "Meine Sammlung"-Karte
// wie der Start-Bildschirm (Issue #89, src/quiz/collectionCard.js) --
// ersetzt die bisherige 9-Felder-Album-Vorschau (Issue #82) vollständig.
// Gleiches Nav-Scoping-Problem wie in start.test.js (beide Nav-Vorkommen auf
// diesem Bildschirm nutzen dieselben `.nav-control__*`-Klassen): Tests hier
// grenzen deshalb bewusst über `[data-collection-card-body]` ein.
describe("'Meine Sammlung'-Karte auf dem Ergebnis-Bildschirm (Issue #90, ersetzt die Album-Vorschau #82)", () => {
  function renderQuiz(extra = {}) {
    return render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
      ...extra,
    });
  }

  function collectionBody(container) {
    return container.querySelector("[data-collection-card-body]");
  }

  it("zeigt auf Seite 1 das freigeschaltete Start-Maskottchen (Fine der Fuchs), restliche 8 Kacheln bleiben als '?' verdeckt", () => {
    const container = renderQuiz();

    const tiles = collectionBody(container).querySelectorAll(
      ".collection-grid__tile",
    );
    expect(tiles).toHaveLength(9);
    expect(
      tiles[0].classList.contains("collection-grid__tile--unlocked"),
    ).toBe(true);
    expect(tiles[0].querySelector(".collection-grid__name").textContent).toBe(
      MASCOTS[0].name,
    );
    for (let i = 1; i < 9; i += 1) {
      expect(
        tiles[i].classList.contains("collection-grid__tile--locked"),
      ).toBe(true);
    }
  });

  it("liegt in einem eigenen Kartencontainer mit der `.result-collection-card`-Modifier-Klasse (größere 130px/16px-Kacheln laut Handoff Abschnitt 5)", () => {
    const container = renderQuiz();

    expect(
      container.querySelector(".result-collection-card"),
    ).not.toBeNull();
    expect(
      container
        .querySelector(".result-collection-card")
        .contains(collectionBody(container)),
    ).toBe(true);
  });

  it("nutzt navControl.js fürs Seiten-Nav -- Badge zeigt 'Seite 1/6', kontextspezifische aria-labels", () => {
    const container = renderQuiz();
    const body = collectionBody(container);

    expect(body.querySelector(".nav-control__badge").textContent).toBe(
      "Seite 1/6",
    );
    expect(
      body.querySelector(".nav-control__arrow--prev").getAttribute(
        "aria-label",
      ),
    ).toBe("Vorherige Sammlungsseite");
    expect(
      body.querySelector(".nav-control__arrow--next").getAttribute(
        "aria-label",
      ),
    ).toBe("Nächste Sammlungsseite");
  });

  it("blättert per Klick zur nächsten Seite und registriert zwei schnelle Klicks als zwei Seiten (Doppel-Tap-Test)", () => {
    const container = renderQuiz();
    const body = collectionBody(container);

    body.querySelector(".nav-control__arrow--next").click();
    expect(
      collectionBody(container).querySelector(".nav-control__badge")
        .textContent,
    ).toBe("Seite 2/6");

    collectionBody(container).querySelector(".nav-control__arrow--next").click();
    collectionBody(container).querySelector(".nav-control__arrow--next").click();
    expect(
      collectionBody(container).querySelector(".nav-control__badge")
        .textContent,
    ).toBe("Seite 4/6");
  });

  it("zeigt die ergebnis-spezifische Fußnote wörtlich (nicht die Start-Hinweiszeile)", () => {
    const container = renderQuiz();

    expect(
      collectionBody(container).querySelector(".start-collection-card__hint")
        .textContent,
    ).toBe(
      "Runde geschafft = 1 Stern. Für 5 Sterne darfst du ein neues Maskottchen aus der Sammlung freischalten.",
    );
  });

  it("rendert keine Reste der entfernten Album-Vorschau/des entfernten Karussells mehr", () => {
    const container = renderQuiz();

    expect(container.querySelector(".start-album-preview")).toBeNull();
    expect(container.querySelector(".mascot-carousel")).toBeNull();
  });
});

// Issue #90: darunter (separat, eigener Bereich) dieselbe "Mein
// Maskottchen"-Bühne+Nav wie der Start-Bildschirm (Issue #88,
// src/quiz/mascotStageCard.js) -- ersetzt das bisherige Karussell (Issue
// #82) vollständig. Scoping über `[data-mascot-stage-body]`, gleiches
// Prinzip wie bei der Sammlungs-Karte oben.
describe("'Mein Maskottchen'-Bühne+Nav auf dem Ergebnis-Bildschirm (Issue #90, ersetzt das Karussell #82)", () => {
  function renderQuiz() {
    return render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
    });
  }

  function mascotBody(container) {
    return container.querySelector("[data-mascot-stage-body]");
  }

  it("zeigt beim Start-Default genau 1 freigeschaltetes Maskottchen, beide Pfeile disabled", () => {
    const container = renderQuiz();
    const body = mascotBody(container);

    expect(body.querySelector(".mascot-stage__name").textContent).toBe(
      MASCOTS[0].name,
    );
    expect(body.querySelector(".nav-control__badge").textContent).toBe("1/1");
    expect(body.querySelector(".nav-control__arrow--prev").disabled).toBe(
      true,
    );
    expect(body.querySelector(".nav-control__arrow--next").disabled).toBe(
      true,
    );
  });

  it("hat aussagekräftige aria-label statt reiner Pfeil-Glyphen, und aria-live='polite' auf der Bühne", () => {
    const container = renderQuiz();
    const body = mascotBody(container);

    expect(
      body.querySelector(".nav-control__arrow--prev").getAttribute(
        "aria-label",
      ),
    ).toBe("Vorheriges Maskottchen");
    expect(
      body.querySelector(".nav-control__arrow--next").getAttribute(
        "aria-label",
      ),
    ).toBe("Nächstes Maskottchen");
    expect(body.querySelector(".mascot-stage").getAttribute("aria-live")).toBe(
      "polite",
    );
  });

  it("navigiert per Pfeil-Klick, aktualisiert Bühne/Badge synchron und persistiert setActiveIdx", () => {
    unlockMascot(1);
    unlockMascot(2);
    setActiveIdx(0);

    const container = renderQuiz();
    const body = mascotBody(container);

    expect(body.querySelector(".mascot-stage__name").textContent).toBe(
      MASCOTS[0].name,
    );

    body.querySelector(".nav-control__arrow--next").click();

    expect(
      mascotBody(container).querySelector(".mascot-stage__name").textContent,
    ).toBe(MASCOTS[1].name);
    expect(
      mascotBody(container).querySelector(".nav-control__badge").textContent,
    ).toBe("2/3");
    expect(loadProgress().activeIdx).toBe(1);
  });

  it("registriert zwei schnell aufeinanderfolgende Klicks als zwei Schritte (Doppel-Tap-Test)", () => {
    unlockMascot(1);
    unlockMascot(2);
    setActiveIdx(0);

    const container = renderQuiz();
    const body = mascotBody(container);

    body.querySelector(".nav-control__arrow--next").click();
    mascotBody(container).querySelector(".nav-control__arrow--next").click();

    expect(
      mascotBody(container).querySelector(".nav-control__badge").textContent,
    ).toBe("3/3");
    expect(
      mascotBody(container).querySelector(".nav-control__arrow--next")
        .disabled,
    ).toBe(true);
  });

  describe("Hinweiszeile: drei Fälle (gleiche Logik wie start.js)", () => {
    it("einlösbar", () => {
      setStars(5);
      const container = renderQuiz();

      expect(
        mascotBody(container).querySelector(".start-mascot-card__hint")
          .textContent,
      ).toBe("Du hast 5 Sterne — du darfst dir ein neues Maskottchen aussuchen!");
    });

    it("normal, Singular bei 4 Sternen", () => {
      setStars(4);
      const container = renderQuiz();

      expect(
        mascotBody(container).querySelector(".start-mascot-card__hint")
          .textContent,
      ).toBe(
        "Noch 1 Stern, bis du ein weiteres Maskottchen freischalten kannst.",
      );
    });

    it("alle 50 gesammelt", () => {
      for (let id = 1; id < MASCOTS.length; id += 1) {
        unlockMascot(id);
      }
      const container = renderQuiz();

      expect(
        mascotBody(container).querySelector(".start-mascot-card__hint")
          .textContent,
      ).toBe("Du hast alle 50 Maskottchen gesammelt!");
    });
  });
});

describe("Fußnote unterhalb der 'Meine Sammlung'-Karte (Issue #90)", () => {
  it("erscheint genau einmal, wörtlich laut Handoff Abschnitt 5", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
    });

    const footnotes = Array.from(
      container.querySelectorAll(".start-collection-card__hint"),
    ).filter(
      (el) =>
        el.textContent ===
        "Runde geschafft = 1 Stern. Für 5 Sterne darfst du ein neues Maskottchen aus der Sammlung freischalten.",
    );
    expect(footnotes).toHaveLength(1);
  });
});

describe("Tier-Memory-Ergebnis (Issue #45)", () => {
  it("zeigt den angepassten, wertschätzenden Text statt 'X von Y richtig'", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 9,
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/Super gemacht! Du hast alle 6 Tierpaare gefunden!/);
    expect(
      container.querySelector(".result-screen__encouragement").textContent,
    ).toBe("Das hast du in 9 Versuchen geschafft!");
    expect(container.textContent).not.toMatch(/richtig beantwortet/);
  });

  it("verwendet die Einzahl 'Versuch' bei genau einem Versuch", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 1,
    });

    expect(
      container.querySelector(".result-screen__encouragement").textContent,
    ).toBe("Das hast du in 1 Versuch geschafft!");
  });

  it("speichert KEINEN Eintrag in der Ergebnis-Verlaufsliste und rendert keine Verlaufsliste", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 4,
    });

    expect(saveResultToHistory).not.toHaveBeenCalled();
    expect(container.querySelector(".result-history")).toBeNull();
  });

  it("behält 'Nochmal spielen'/'Zurück zum Start' unverändert bei", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 4,
    });

    expect(container.querySelector(".result-screen__play-again")).not.toBeNull();
    expect(
      container.querySelector(".result-screen__back-to-start"),
    ).not.toBeNull();
  });
});

describe("Regulärer Quizfragen-Ergebnis-Zweig bleibt unverändert (Regressionsschutz)", () => {
  it("zeigt weiterhin 'X von Y Fragen richtig beantwortet' und speichert einen Verlaufseintrag", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/Du hast 7 von 10 Fragen richtig beantwortet!/);
    expect(saveResultToHistory).toHaveBeenCalledTimes(1);
    expect(saveResultToHistory).toHaveBeenCalledWith({
      score: 7,
      total: 10,
      difficulty: "6-10",
      mode: GAME_MODE.QUIZ,
      resolvedCount: 0,
    });
  });
});

describe("Sterne-Box im Ergebnis-Bildschirm (Issue #83)", () => {
  function renderQuiz(extra = {}) {
    return render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
      ...extra,
    });
  }

  it("zeigt bei canRedeem (5 Sterne) das Label '5 Sterne voll!', den Einlösbar-Satz und den CTA-Button", () => {
    setStars(5);
    const container = renderQuiz({ earned: false });

    expect(container.querySelector(".stars-box__label").textContent).toBe(
      "5 Sterne voll!",
    );
    expect(container.querySelector(".stars-box__sentence").textContent).toBe(
      "Du darfst dir jetzt ein neues Maskottchen aussuchen.",
    );
    expect(container.querySelector(".stars-box__cta")).not.toBeNull();
    expect(container.querySelector(".stars-box__cta").textContent).toBe(
      "Neues Maskottchen wählen 🎁",
    );
  });

  it("zeigt bei verdientem, aber noch nicht einlösbarem Stern den passenden Satz mit Singular '1 Stern', kein CTA", () => {
    // 4 Sterne bereits vorhanden + in dieser Runde ein 5. verdient wäre
    // bereits canRedeem -- daher hier 3 Sterne vorher + earned: true, macht
    // 4 Sterne insgesamt, "noch 1 Stern" bis zum nächsten Maskottchen.
    setStars(3);
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    const container = renderQuiz({ earned: true });

    expect(container.querySelector(".stars-box__sentence").textContent).toBe(
      "Runde geschafft — dafür gibt es 1 Stern! Noch 1 Stern bis zum nächsten Maskottchen.",
    );
    expect(container.querySelector(".stars-box__cta")).toBeNull();
  });

  it("zeigt bei verdientem Stern und Plural-Fall (2 Sterne) 'Noch N Sterne'", () => {
    setStars(2);
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    const container = renderQuiz({ earned: true });

    expect(container.querySelector(".stars-box__sentence").textContent).toBe(
      "Runde geschafft — dafür gibt es 1 Stern! Noch 2 Sterne bis zum nächsten Maskottchen.",
    );
  });

  it("zeigt bei keinem verdienten Stern den Ermutigungssatz, kein CTA", () => {
    const container = renderQuiz({ score: 3, earned: false });

    expect(container.querySelector(".stars-box__sentence").textContent).toBe(
      "Ab 5 richtigen Tieren in einer Runde gibt es einen Stern. Probier es gleich nochmal!",
    );
    expect(container.querySelector(".stars-box__cta")).toBeNull();
    expect(container.querySelector(".stars-box__label").textContent).toBe(
      "Sterne",
    );
  });

  it("markiert genau den neu verdienten Stern mit der k-pop-Animationsklasse", () => {
    setStars(2);
    recordRoundCompletion({ mode: GAME_MODE.QUIZ, score: 5, roundLength: 10 });
    const container = renderQuiz({ earned: true });

    const stars = container.querySelectorAll(".stars-box__star");
    expect(stars).toHaveLength(5);
    const newStars = container.querySelectorAll(".stars-box__star--new");
    expect(newStars).toHaveLength(1);
    // 3. Stern (Index 2) ist der neu verdiente.
    expect(stars[2].classList.contains("stars-box__star--new")).toBe(true);
  });

  it("markiert keinen Stern mit k-pop, wenn kein Stern verdient wurde", () => {
    const container = renderQuiz({ score: 3, earned: false });

    expect(container.querySelectorAll(".stars-box__star--new")).toHaveLength(
      0,
    );
  });

  it("öffnet beim Klick auf den CTA-Button die Maskottchen-Auswahl via onOpenMascotChooser", () => {
    setStars(5);
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
      earned: false,
    });
    const onOpenMascotChooser = vi.fn();

    // renderResultScreen erneut mit demselben Container aufrufen, diesmal
    // mit onOpenMascotChooser-Callback (render()-Helper oben setzt ihn nicht).
    renderResultScreen(
      container,
      {
        mode: GAME_MODE.QUIZ,
        difficulty: "6-10",
        score: 7,
        questions: new Array(10).fill({}),
        earned: false,
      },
      { onPlayAgain: vi.fn(), onBackToStart: vi.fn(), onOpenMascotChooser },
    );

    container.querySelector(".stars-box__cta").click();
    expect(onOpenMascotChooser).toHaveBeenCalledTimes(1);
  });
});

describe("Bedingtes Runde-Label (Issue #83)", () => {
  it("zeigt 'Runde geschafft 🎉' wenn earned === true", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
      earned: true,
    });

    expect(container.querySelector(".result-screen__label").textContent).toBe(
      "Runde geschafft 🎉",
    );
  });

  it("zeigt 'Runde beendet' wenn kein Stern verdient wurde (earned: false)", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 3,
      questions: new Array(10).fill({}),
      earned: false,
    });

    expect(container.querySelector(".result-screen__label").textContent).toBe(
      "Runde beendet",
    );
  });

  it("zeigt 'Runde beendet' als Default, wenn `earned` gar nicht gesetzt ist (bestehende Aufrufe ohne main.js)", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
    });

    expect(container.querySelector(".result-screen__label").textContent).toBe(
      "Runde beendet",
    );
  });

  it("zeigt 'Runde geschafft 🎉' bei Tier-Memory (dort immer earned === true, siehe recordRoundCompletion)", () => {
    const container = render({
      mode: GAME_MODE.MEMORY,
      difficulty: "6-10",
      memoryPairCount: 6,
      memoryAttempts: 4,
      earned: true,
    });

    expect(container.querySelector(".result-screen__label").textContent).toBe(
      "Runde geschafft 🎉",
    );
  });
});

describe("Buchstabensuche: 'davon X aufgelöst' im Rundenergebnis (Issue #52)", () => {
  it("zeigt bei mindestens 1 aufgelöster Frage den Zusatz 'davon X aufgelöst' im Hauptsatz und übergibt resolvedCount an saveResultToHistory", () => {
    const container = render({
      mode: GAME_MODE.LETTER_SEARCH,
      difficulty: "6-10",
      score: 10,
      questions: new Array(10).fill({}),
      answers: [
        { resolved: false },
        { resolved: true },
        { resolved: false },
        { resolved: true },
        { resolved: false },
        { resolved: false },
        { resolved: false },
        { resolved: false },
        { resolved: false },
        { resolved: false },
      ],
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(
      /Du hast 10 von 10 Fragen richtig beantwortet, davon 2 aufgelöst!/,
    );
    expect(saveResultToHistory).toHaveBeenCalledWith({
      score: 10,
      total: 10,
      difficulty: "6-10",
      mode: GAME_MODE.LETTER_SEARCH,
      resolvedCount: 2,
    });
  });

  it("zeigt bei 0 aufgelösten Fragen unverändert nur den bisherigen Satz, keine 'davon 0 aufgelöst'-Ergänzung", () => {
    const container = render({
      mode: GAME_MODE.LETTER_SEARCH,
      difficulty: "6-10",
      score: 10,
      questions: new Array(10).fill({}),
      answers: new Array(10).fill({ resolved: false }),
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/^\s*Du hast 10 von 10 Fragen richtig beantwortet!\s*$/);
    expect(container.textContent).not.toMatch(/aufgelöst/);
  });

  it("zeigt weiterhin 'N von N richtig' unverändert, wenn `answers` fehlt (Modi ohne resolved-Unterstützung)", () => {
    const container = render({
      mode: GAME_MODE.QUIZ,
      difficulty: "6-10",
      score: 7,
      questions: new Array(10).fill({}),
    });

    expect(
      container.querySelector(".result-screen__score").textContent,
    ).toMatch(/^\s*Du hast 7 von 10 Fragen richtig beantwortet!\s*$/);
  });

  it("zeigt in der Verlaufsliste bei resolvedCount > 0 den Zusatz 'davon X aufgelöst'", () => {
    saveResultToHistory.mockReturnValue([
      {
        id: "current",
        date: "2026-08-20T10:00:00.000Z",
        score: 10,
        total: 10,
        difficulty: "6-10",
        mode: GAME_MODE.LETTER_SEARCH,
        resolvedCount: 3,
      },
      {
        id: "older",
        date: "2026-08-19T10:00:00.000Z",
        score: 8,
        total: 10,
        difficulty: "6-10",
        mode: GAME_MODE.QUIZ,
        resolvedCount: 0,
      },
    ]);

    const container = render({
      mode: GAME_MODE.LETTER_SEARCH,
      difficulty: "6-10",
      score: 10,
      questions: new Array(10).fill({}),
      answers: [{ resolved: true }],
    });

    const results = container.querySelectorAll(".result-history__result");
    expect(results[0].textContent).toBe("10 von 10 richtig, davon 3 aufgelöst");
    expect(results[1].textContent).toBe("8 von 10 richtig");
  });
});
