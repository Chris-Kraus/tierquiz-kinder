// @vitest-environment jsdom
//
// DOM-Tests für den neuen "Tiergeräusche"-Frage-Bildschirm (Issue #33,
// design.md "Frage-/Feedback-Bildschirm 'Tiergeräusche'"). Analog zum Muster
// in question.test.js/reverseQuestion.test.js: `../quiz/
// soundQuestionGenerator.js` wird komplett gemockt (URL-Konstruktion/
// Netzwerk-Verhalten selbst ist bereits in soundQuestionGenerator.test.js
// abgedeckt), hier wird nur geprüft, wie der Bildschirm auf Erfolg/
// Fehlschlag reagiert sowie auf das neue Play-Button-/Wiederholbarkeits-
// Verhalten, das es bei #28 (Bild statt Ton) nicht gab.
//
// jsdom implementiert HTMLMediaElement.play()/pause()/load() nicht wirklich
// (würde sonst zur Laufzeit einen "not implemented"-Fehler über die
// virtualConsole melden) — play/pause/load werden daher global gestubbt,
// damit die Tests deterministisch bleiben und gezielt prüfen können, WANN
// play() aufgerufen wird (insbesondere: nie automatisch, siehe "kein
// Autoplay"-Test unten).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DIFFICULTY_LEVELS } from "../quiz/difficulty.js";

vi.mock("../../data/animals.json", () => ({
  default: { animals: [] },
}));

const generateNextSoundQuestion = vi.fn();
vi.mock("../quiz/soundQuestionGenerator.js", () => ({
  generateNextSoundQuestion: (...args) => generateNextSoundQuestion(...args),
}));

const { renderSoundQuestionScreen } = await import("./soundQuestion.js");
const { createQuizState } = await import("../quiz/state.js");

function buildQuestion(overrides = {}) {
  return {
    id: "rabe-sound-identify",
    animalId: "Q1",
    animalName: "Rabe",
    field: "sound_identify",
    questionType: "soundIdentify",
    audio: {
      url: "https://commons.example/rabe.ogg",
    },
    attribution: {
      text: "Ton: Jane Doe · Wikimedia Commons",
      licenseUrl: "https://example.com/license",
    },
    options: [
      { text: "Rabe", correct: true },
      { text: "Eule", correct: false },
      { text: "Adler", correct: false },
      { text: "Spatz", correct: false },
    ],
    ...overrides,
  };
}

function render(quizState) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const onFinish = vi.fn();
  renderSoundQuestionScreen(container, quizState, { onFinish });
  return { container, onFinish };
}

beforeEach(() => {
  // vi.restoreAllMocks() ZUERST: vi.spyOn auf eine bereits gespyte Methode
  // liefert sonst dieselbe Spy-Instanz mit der Aufruf-Historie der
  // vorherigen Tests zurück (keine automatische Zurücksetzung zwischen
  // Tests) — ohne diesen Reset würden play()-Aufrufzahlen über Tests hinweg
  // kumulieren statt pro Test bei 0 zu starten.
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  generateNextSoundQuestion.mockReset();
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(
    undefined,
  );
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(
    () => {},
  );
  vi.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(
    () => {},
  );
});

describe("renderSoundQuestionScreen (Issue #33)", () => {
  it("zeigt den reservierten Player-Rahmen mit Ladeanimation, solange die Frage noch nicht aufgelöst ist", () => {
    generateNextSoundQuestion.mockReturnValue(new Promise(() => {})); // hängt bewusst
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    const frame = container.querySelector(".sound-player-frame");
    expect(frame.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector(".sound-player-frame__loading").hidden).toBe(
      false,
    );
    expect(container.querySelector(".sound-play-button").hidden).toBe(true);
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 1 von 3",
    );
    // Fixe Überschrift statt wechselndem Fragetext (design.md).
    expect(
      container.querySelector("#sound-question-heading").textContent.trim(),
    ).toBe("Welches Tier ist das?");
  });

  it("zeigt nach erfolgreicher Auflösung den Play-Button, die Attribution und die 4 Namensoptionen", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(
        container.querySelector(".sound-player-frame").getAttribute(
          "aria-busy",
        ),
      ).toBe("false");
    });

    const playButton = container.querySelector(".sound-play-button");
    expect(playButton.hidden).toBe(false);
    expect(playButton.getAttribute("aria-label")).toBe("Tierlaut abspielen");
    expect(container.querySelector(".sound-question__audio").src).toBe(
      "https://commons.example/rabe.ogg",
    );

    const attributionText = container.querySelector(
      ".sound-question__attribution-text",
    );
    expect(attributionText.textContent).toBe(
      "Ton: Jane Doe · Wikimedia Commons",
    );
    const attributionLink = container.querySelector(
      ".image-hint__attribution-link",
    );
    expect(attributionLink.hidden).toBe(false);
    expect(attributionLink.href).toBe("https://example.com/license");

    const tiles = container.querySelectorAll(".answer-tile");
    expect(tiles).toHaveLength(4);
    // Prüft gezielt .answer-tile__text statt des gesamten Kachel-Textinhalts:
    // seit dem Redesign (Issue #74, design.md "Antwortkacheln") zeigt
    // .answer-tile__icon zusätzlich ein Ziffern-Badge (1-4) vor der Antwort.
    expect(
      Array.from(tiles).map((tile) =>
        tile.querySelector(".answer-tile__text").textContent.trim(),
      ),
    ).toEqual(["Rabe", "Eule", "Adler", "Spatz"]);

    // Regressionsschutz für den manuell (Playwright, 375px/iPhone SE)
    // gefundenen Scroll-Bug: ohne diese Modifier-Klasse fällt .answer-grid
    // unterhalb 30rem auf ein 1-Spalten-Layout zurück, das zusammen mit dem
    // Player-Rahmen + der Pflicht-Attribution die Kernaufgabe zum Scrollen
    // bringt (design.md, "Kein Scrollen bei der Kernaufgabe").
    expect(
      container
        .querySelector(".answer-grid")
        .classList.contains("answer-grid--sound"),
    ).toBe(true);
  });

  // Analog zum entsprechenden Test in reverseQuestion.test.js
  // (`pendingReverseQuestion`) -- deckt den beim Rebase-Merge-Konflikt (siehe
  // start.js-Historie) neu verdrahteten `pendingSoundQuestion`-Wiederver-
  // wendungspfad ab, der bislang ungetestet war.
  it("nutzt eine bereits am Start-Bildschirm aufgelöste erste Frage ohne erneuten Abruf", () => {
    const pending = buildQuestion();
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    quizState.pendingSoundQuestion = pending;
    const { container } = render(quizState);

    // Kein zusätzlicher Ladezustand nach dem Moduswechsel (design.md, analog
    // zu reverseQuestion.js/#28).
    expect(generateNextSoundQuestion).not.toHaveBeenCalled();
    expect(
      container.querySelector(".sound-player-frame").getAttribute(
        "aria-busy",
      ),
    ).toBe("false");
    expect(container.querySelector(".sound-play-button").hidden).toBe(false);
    // Transientes Feld wird konsumiert, nicht dauerhaft im Zustand belassen.
    expect(quizState.pendingSoundQuestion).toBeUndefined();
  });

  it("spielt den Ton NICHT automatisch ab — erst ein Tap auf den Play-Button startet die Wiedergabe", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() =>
      expect(container.querySelector(".sound-play-button").hidden).toBe(
        false,
      ),
    );

    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    container.querySelector(".sound-play-button").click();
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("kann den Ton beliebig oft über denselben Button erneut abspielen und wechselt danach das aria-label", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() =>
      expect(container.querySelector(".sound-play-button").hidden).toBe(
        false,
      ),
    );

    const playButton = container.querySelector(".sound-play-button");
    playButton.click();
    expect(playButton.getAttribute("aria-label")).toBe(
      "Tierlaut noch einmal abspielen",
    );

    playButton.click();
    playButton.click();
    // Kein Limit — beliebig oft antippbar (design.md).
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(3);
  });

  it("zeigt Sofort-Feedback bei richtiger Antwort und aktualisiert den Punktestand", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    container.querySelector(".answer-tile").click(); // erste Option: "Rabe" (correct)

    const feedback = container.querySelector(".question-screen__feedback");
    expect(feedback.hidden).toBe(false);
    expect(feedback.textContent).toMatch(/richtig/);
    expect(quizState.score).toBe(1);
    expect(container.querySelector(".next-button").hidden).toBe(false);
  });

  it("zeigt Sofort-Feedback mit korrekter Antwort bei falscher Wahl, ohne Punktestand zu erhöhen", async () => {
    generateNextSoundQuestion.mockResolvedValue(buildQuestion());
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    const tiles = container.querySelectorAll(".answer-tile");
    tiles[1].click(); // "Eule" (falsch)

    const feedback = container.querySelector(".question-screen__feedback");
    expect(feedback.textContent).toMatch(/Rabe/); // nennt die richtige Antwort
    expect(quizState.score).toBe(0);
    expect(tiles[0].classList.contains("answer-tile--correct")).toBe(true);
    expect(tiles[1].classList.contains("answer-tile--selected-wrong")).toBe(
      true,
    );
  });

  it("lädt nach 'Weiter' die nächste Frage und setzt Ton/Attribution/Ladezustand vollständig zurück", async () => {
    const first = buildQuestion();
    const second = buildQuestion({
      animalId: "Q2",
      animalName: "Eule",
      audio: { url: "https://commons.example/eule.ogg" },
      attribution: { text: "Wikimedia Commons", licenseUrl: null },
      options: [
        { text: "Eule", correct: true },
        { text: "Rabe", correct: false },
        { text: "Adler", correct: false },
        { text: "Spatz", correct: false },
      ],
    });
    generateNextSoundQuestion
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );

    // Ton einmal abspielen, damit sich hasPlayedOnce/aria-label danach
    // nachweislich wieder zurücksetzt.
    container.querySelector(".sound-play-button").click();
    container.querySelector(".answer-tile").click();
    container.querySelector(".next-button").click();

    // Direkt nach dem Klick (noch vor Auflösung von `second`): Reset sichtbar.
    expect(
      container.querySelector(".sound-player-frame").getAttribute(
        "aria-busy",
      ),
    ).toBe("true");
    expect(
      container.querySelector(".sound-question__attribution-text")
        .textContent,
    ).toBe("");
    expect(container.querySelector(".question-screen__feedback").hidden).toBe(
      true,
    );
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 2 von 3",
    );

    await vi.waitFor(() => {
      const playButton = container.querySelector(".sound-play-button");
      expect(playButton.hidden).toBe(false);
    });
    expect(container.querySelector(".sound-question__audio").src).toBe(
      "https://commons.example/eule.ogg",
    );
    // Label wieder im Ausgangszustand -- hasPlayedOnce wurde zurückgesetzt.
    expect(
      container.querySelector(".sound-play-button").getAttribute(
        "aria-label",
      ),
    ).toBe("Tierlaut abspielen");
    // Kein Lizenz-Link, wenn keiner vorhanden ist (fehlende Felder werden
    // übersprungen statt "unbekannt" anzuzeigen, design.md).
    expect(
      container.querySelector(".image-hint__attribution-link").hidden,
    ).toBe(true);
    expect(generateNextSoundQuestion).toHaveBeenCalledTimes(2);
  });

  it("zeigt bei Fehlschlag einen freundlichen Fehlerzustand mit 'Nochmal versuchen', ohne die Runde abzubrechen", async () => {
    generateNextSoundQuestion.mockRejectedValueOnce(
      new Error("Netzwerkfehler"),
    );
    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
    const { container } = render(quizState);

    await vi.waitFor(() => {
      expect(container.querySelector(".sound-player-frame__error").hidden).toBe(
        false,
      );
    });
    // Kein technischer Fehlertext im DOM.
    expect(container.textContent).not.toMatch(/Netzwerkfehler|Error/);
    // Bleibt bei Frage 1 -- kein Rundenabbruch/Fortschritt.
    expect(container.querySelector(".question-screen__progress").textContent).toBe(
      "Frage 1 von 3",
    );
    expect(quizState.currentIndex).toBe(0);

    generateNextSoundQuestion.mockResolvedValueOnce(buildQuestion());
    container.querySelector(".sound-player-frame__retry-button").click();

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );
    expect(container.querySelector(".sound-player-frame__error").hidden).toBe(
      true,
    );
    expect(generateNextSoundQuestion).toHaveBeenCalledTimes(2);
  });

  // Issue #43: Play/Stop-Toggle — ein erneuter Tap auf den Play-Button
  // während laufender Wiedergabe stoppt den Ton statt ihn neu zu starten
  // (design.md, "Play/Pause-Toggle beim Tierlaut-Button"). `audioEl.paused`
  // ist in jsdom standardmäßig `true` (play()/pause() sind oben komplett
  // gestubbt, verändern das native Flag also nicht) — die "läuft
  // gerade"-Fälle stubben die `paused`-Getter-Property daher gezielt auf
  // `false`, um den tatsächlichen Laufzeitzustand zu simulieren (architecture.md,
  // Issue #43: Zustandsabfrage über `audioEl.paused`).
  describe("Play/Stop-Toggle des Tierlaut-Buttons (Issue #43)", () => {
    it("wechselt Icon und aria-label zu 'Tierlaut stoppen', sobald die Wiedergabe läuft (playing-Event)", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");

      // QA-Bug-Report Zyklus 1 (Issue #43): der `playing`-Handler prüft jetzt
      // audioEl.paused, bevor er den Button auf "spielt gerade" schaltet
      // (Guard gegen verspätete/veraltete playing-Events, siehe Test unten).
      // Der reale Browser setzt `paused` bereits synchron beim play()-Aufruf
      // auf `false` (spec), lange bevor `playing` feuert -- hier über die
      // gemockte Getter-Property nachgebildet (Datei-Kommentar oben), damit
      // dieser Test weiterhin den tatsächlichen "läuft gerade"-Laufzeitzustand
      // simuliert statt sich auf den jsdom-Default (`true`, da play() oben
      // No-Op-gestubbt ist) zu verlassen.
      vi.spyOn(window.HTMLMediaElement.prototype, "paused", "get").mockReturnValue(
        false,
      );
      playButton.click();
      audioEl.dispatchEvent(new Event("playing"));

      expect(playButton.getAttribute("aria-label")).toBe("Tierlaut stoppen");
      expect(
        playButton.querySelector(".sound-play-button__icon").textContent,
      ).toBe("⏹️");
      expect(
        playButton.classList.contains("sound-play-button--playing"),
      ).toBe(true);
    });

    it("stoppt den Ton bei erneutem Klick während laufender Wiedergabe (Pause + Zurücksetzen auf Anfang), statt ihn neu zu starten", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");

      playButton.click(); // startet die Wiedergabe
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

      // Simuliert laufende Wiedergabe (natives Flag, siehe Datei-Kommentar
      // oben).
      vi.spyOn(window.HTMLMediaElement.prototype, "paused", "get")
        .mockReturnValue(false);
      const pauseCallsBefore =
        window.HTMLMediaElement.prototype.pause.mock.calls.length;
      audioEl.currentTime = 5;

      playButton.click(); // zweiter Klick WÄHREND der Wiedergabe

      expect(
        window.HTMLMediaElement.prototype.pause.mock.calls.length,
      ).toBeGreaterThan(pauseCallsBefore);
      expect(audioEl.currentTime).toBe(0);
      // Kein zweiter play()-Aufruf -- der Ton wird gestoppt, nicht neu
      // gestartet.
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    });

    it("kehrt nach dem pause-Event zuverlässig in den abspielbereiten Zustand zurück (natürliches Ende oder manueller Stopp)", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");

      playButton.click();
      audioEl.dispatchEvent(new Event("playing"));
      // `pause` feuert zuverlässig sowohl bei manuellem Stopp als auch beim
      // natürlichen Ende der Wiedergabe (architecture.md, Issue #43) — ein
      // einziger Listener deckt beide Fälle ab, hier direkt simuliert.
      audioEl.dispatchEvent(new Event("pause"));

      expect(playButton.getAttribute("aria-label")).toBe(
        "Tierlaut noch einmal abspielen",
      );
      expect(
        playButton.querySelector(".sound-play-button__icon").textContent,
      ).toBe("🔊");
      expect(
        playButton.classList.contains("sound-play-button--playing"),
      ).toBe(false);
    });

    it("QA-Bug-Report Zyklus 1: ein verspätet eintreffendes playing-Event NACH manuellem Stopp setzt den Button nicht wieder auf 'spielt gerade' zurück", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");

      // Läuft bereits (Puffervorgang abgeschlossen, echtes `playing`-Event
      // bereits verarbeitet).
      const pausedSpy = vi
        .spyOn(window.HTMLMediaElement.prototype, "paused", "get")
        .mockReturnValue(false);
      playButton.click();
      audioEl.dispatchEvent(new Event("playing"));
      expect(playButton.getAttribute("aria-label")).toBe("Tierlaut stoppen");

      // Nutzer stoppt manuell (zweiter Klick während laufender Wiedergabe) —
      // audioEl.pause() setzt audioEl.paused im echten Browser synchron auf
      // true, hier über die gemockte Getter-Property nachgebildet, bevor der
      // reale `pause`-Handler (unten simuliert) dasselbe tut.
      pausedSpy.mockReturnValue(true);
      playButton.click();
      audioEl.dispatchEvent(new Event("pause"));

      expect(playButton.getAttribute("aria-label")).toBe(
        "Tierlaut noch einmal abspielen",
      );
      expect(
        playButton.classList.contains("sound-play-button--playing"),
      ).toBe(false);

      // Reproduziert exakt den QA-Bug-Report (Issue #43, Zyklus 1): ein
      // `playing`-Event, das bereits VOR dem Stop-Klick des Nutzers
      // unterwegs war (z. B. wegen eines Zwischen-Puffervorgangs) und erst
      // jetzt -- NACH dem Stopp -- eintrifft. audioEl.paused ist zu diesem
      // Zeitpunkt bereits true (s. o.), der Handler muss das veraltete
      // Event daher ignorieren, statt den Button fälschlich wieder auf
      // "spielt gerade" zu schalten.
      audioEl.dispatchEvent(new Event("playing"));

      expect(playButton.getAttribute("aria-label")).toBe(
        "Tierlaut noch einmal abspielen",
      );
      expect(
        playButton.querySelector(".sound-play-button__icon").textContent,
      ).toBe("🔊");
      expect(
        playButton.classList.contains("sound-play-button--playing"),
      ).toBe(false);
    });

    it("startet die Wiedergabe wie bisher von vorne, wenn der Ton gerade NICHT läuft", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");
      audioEl.currentTime = 5;

      // audioEl.paused ist im Ausgangszustand true (noch nie/nicht mehr
      // abgespielt) -- ein Klick startet unverändert von vorne.
      playButton.click();

      expect(audioEl.currentTime).toBe(0);
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    });

    // QA-Bug-Report Zyklus 2 (Issue #43): sofortiger Stop-Klick, BEVOR die
    // Wiedergabe tatsächlich begonnen hat -- der Browser puffert noch (nur
    // `waiting` bereits gefeuert), `playing` steht zu diesem Zeitpunkt noch
    // aus und wird durch den Stop auch nie mehr eintreffen. Vor dem Fix blieb
    // aria-busy am Play-Button dauerhaft "true" hängen (5/5 reproduziert laut
    // QA), da es ausschließlich im `playing`-Handler zurückgesetzt wurde.
    it("setzt aria-busy am Play-Button zurück, wenn der Nutzer stoppt, BEVOR die Wiedergabe tatsächlich begonnen hat (nur waiting, kein playing)", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");

      // Erster Klick startet die Wiedergabe -- audioEl.paused ist zu diesem
      // Zeitpunkt noch im jsdom-Default (`true`, play() ist oben No-Op-
      // gestubbt), löst also unverändert den Start-Zweig aus (identisches
      // Muster wie die übrigen Tests in diesem describe-Block).
      playButton.click();
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

      // `paused` wird beim play()-Aufruf im echten Browser synchron auf
      // `false` gesetzt (Spec), lange bevor `playing` feuert (Datei-Kommentar
      // oben) -- hier über die gemockte Getter-Property nachgebildet, damit
      // der zweite Klick unten den "läuft bereits"/Stop-Zweig auslöst.
      const pausedSpy = vi
        .spyOn(window.HTMLMediaElement.prototype, "paused", "get")
        .mockReturnValue(false);

      audioEl.dispatchEvent(new Event("waiting")); // Browser puffert noch
      expect(playButton.getAttribute("aria-busy")).toBe("true");

      // Sofortiger Stop-Klick, bevor `playing` je gefeuert hat.
      playButton.click();
      pausedSpy.mockReturnValue(true);

      // Kein `playing`-Event trifft je ein -- der Fix darf sich also NICHT
      // ausschließlich auf den `playing`-Handler verlassen.
      expect(playButton.getAttribute("aria-busy")).toBe("false");
      // hasPlayedOnce wurde bereits beim ersten Klick synchron gesetzt
      // (bestehendes Verhalten, unabhängig vom Fix hier) -- das Label bleibt
      // daher auf "noch einmal abspielen", nur aria-busy/Icon/--playing sind
      // hier relevant.
      expect(playButton.getAttribute("aria-label")).toBe(
        "Tierlaut noch einmal abspielen",
      );
      expect(
        playButton.querySelector(".sound-play-button__icon").textContent,
      ).toBe("🔊");
      expect(
        playButton.classList.contains("sound-play-button--playing"),
      ).toBe(false);
    });

    // Ergänzt den obigen Test um die zweite, event-basierte Absicherung
    // (`pause`-Listener) -- deckt den Fall ab, dass der reale Browser das
    // `pause`-Event asynchron erst nach dem Klick zustellt.
    it("setzt aria-busy auch über das nachträglich eintreffende pause-Event zurück, falls es noch nicht busy war", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");

      // Erster Klick startet die Wiedergabe (Default-`paused`, siehe Test
      // oben).
      playButton.click();
      vi.spyOn(window.HTMLMediaElement.prototype, "paused", "get").mockReturnValue(
        false,
      );
      audioEl.dispatchEvent(new Event("waiting"));
      expect(playButton.getAttribute("aria-busy")).toBe("true");

      // `pause` feuert (z. B. asynchron nach einem `audioEl.pause()`-Aufruf)
      // -- unabhängig vom synchronen Reset im Klick-Handler muss auch dieser
      // Pfad allein aria-busy zuverlässig zurücksetzen.
      audioEl.dispatchEvent(new Event("pause"));

      expect(playButton.getAttribute("aria-busy")).toBe("false");
    });

    // QA-Bug-Report Zyklus 2 (Issue #43): ein `waiting`-Event, das erst NACH
    // einem bereits erfolgten manuellen Stop eintrifft (spät zugestelltes
    // Event aus dem inzwischen abgebrochenen Puffervorgang), darf den Button
    // nicht erneut in den Busy-Zustand versetzen.
    it("ignoriert ein verspätet eintreffendes waiting-Event NACH manuellem Stopp (Button bleibt nicht busy)", async () => {
      generateNextSoundQuestion.mockResolvedValue(buildQuestion());
      const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 3);
      const { container } = render(quizState);
      await vi.waitFor(() =>
        expect(container.querySelector(".sound-play-button").hidden).toBe(
          false,
        ),
      );

      const playButton = container.querySelector(".sound-play-button");
      const audioEl = container.querySelector(".sound-question__audio");

      // Erster Klick startet die Wiedergabe (Default-`paused`, siehe Test
      // oben).
      playButton.click();

      const pausedSpy = vi
        .spyOn(window.HTMLMediaElement.prototype, "paused", "get")
        .mockReturnValue(false);

      // Stop, bevor der Browser das erste `waiting` überhaupt zugestellt hat.
      playButton.click();
      pausedSpy.mockReturnValue(true);
      expect(playButton.getAttribute("aria-busy")).toBe("false");

      // Jetzt trifft das veraltete `waiting`-Event aus dem bereits
      // abgebrochenen Puffervorgang ein.
      audioEl.dispatchEvent(new Event("waiting"));

      expect(playButton.getAttribute("aria-busy")).toBe("false");
    });
  });

  it("ruft onFinish nach der letzten Frage mit korrektem Punktestand und vollständiger Fragenliste auf", async () => {
    generateNextSoundQuestion
      .mockResolvedValueOnce(buildQuestion({ animalId: "Q1" }))
      .mockResolvedValueOnce(buildQuestion({ animalId: "Q2" }));

    const quizState = createQuizState(DIFFICULTY_LEVELS.EASY, [], 2);
    const { container, onFinish } = render(quizState);

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );
    container.querySelector(".answer-tile").click(); // Frage 1: richtig
    container.querySelector(".next-button").click();

    await vi.waitFor(() =>
      expect(container.querySelectorAll(".answer-tile")).toHaveLength(4),
    );
    container.querySelectorAll(".answer-tile")[1].click(); // Frage 2: falsch
    container.querySelector(".next-button").click();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(quizState.score).toBe(1);
    expect(quizState.questions).toHaveLength(2);
    expect(quizState.answers).toHaveLength(2);
  });
});
