// @vitest-environment jsdom
//
// Tests für main.js (Issue #87, "Startseiten-Restrukturierung"): main.js ist
// die einzige Stelle, die pro Bildschirm-Wechsel entscheidet, ob und wie die
// Kopfzeile (#app-header) gerendert wird. Seit dieser Story gilt
// `showHeader = screen !== "start"` (requirements.md/design.md,
// "Startseiten-/Sammlungs-Neuaufbau"): auf dem Start-Bildschirm wird
// renderHeader() gar nicht mehr aufgerufen (Container bleibt leer), auf allen
// anderen Bildschirmen (Frage-Runde, Ergebnis) unverändert wie zuvor. Diese
// Datei prüft daher ausschließlich dieses Navigations-/Verdrahtungs-
// Verhalten -- nicht die Inhalte der einzelnen Screens selbst (die haben
// jeweils eigene Testdateien, z. B. start.test.js, header.test.js).
//
// main.js ist ein reines Einstiegs-Skript ohne Exports: es liest `#app` aus
// dem Dokument und ruft showStartScreen() bereits als Modul-Seiteneffekt beim
// Import auf. Alle von main.js orchestrierten Screen-/Header-Module werden
// deshalb gemockt (gleiches Prinzip wie in start.test.js: Mocks fangen die
// jeweils übergebenen Callbacks/Optionen ein, über die der Test die
// Navigation nachstellt, ohne die echten Screen-Implementierungen zu
// rendern) -- ein einziger durchgehender Testfall bildet eine komplette
// Navigations-Reise ab (Start -> Runde -> Ergebnis -> zurück zum Start),
// bewusst NICHT als mehrere unabhängige `it()`-Fälle mit Modul-Reset:
// main.js hat keine Exports, gegen die man isoliert pro Test neu booten
// könnte, ohne für jeden Fall `vi.resetModules()` plus einen frischen
// dynamischen Import samt Mock-Neuverdrahtung zu wiederholen -- eine
// zusammenhängende Reise ist hier die robustere, weniger duplizierte Wahl.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GAME_MODE } from "./quiz/gameMode.js";

const renderHeader = vi.fn();
vi.mock("./screens/header.js", () => ({
  renderHeader: (...args) => renderHeader(...args),
}));

const renderStartScreen = vi.fn();
vi.mock("./screens/start.js", () => ({
  renderStartScreen: (...args) => renderStartScreen(...args),
}));

const renderQuestionScreen = vi.fn();
vi.mock("./screens/question.js", () => ({
  renderQuestionScreen: (...args) => renderQuestionScreen(...args),
}));

const renderReverseQuestionScreen = vi.fn();
vi.mock("./screens/reverseQuestion.js", () => ({
  renderReverseQuestionScreen: (...args) =>
    renderReverseQuestionScreen(...args),
}));

const renderSoundQuestionScreen = vi.fn();
vi.mock("./screens/soundQuestion.js", () => ({
  renderSoundQuestionScreen: (...args) => renderSoundQuestionScreen(...args),
}));

const renderMemoryScreen = vi.fn();
vi.mock("./screens/memory.js", () => ({
  renderMemoryScreen: (...args) => renderMemoryScreen(...args),
}));

const renderLetterSearchScreen = vi.fn();
vi.mock("./screens/letterSearch.js", () => ({
  renderLetterSearchScreen: (...args) => renderLetterSearchScreen(...args),
}));

const renderResultScreen = vi.fn();
vi.mock("./screens/result.js", () => ({
  renderResultScreen: (...args) => renderResultScreen(...args),
}));

const renderMascotChooserScreen = vi.fn();
vi.mock("./screens/mascotChooser.js", () => ({
  renderMascotChooserScreen: (...args) => renderMascotChooserScreen(...args),
}));

// showResultScreen ruft recordRoundCompletion() zentral auf (Issue #80) --
// gemockt statt der echten progress.js-API, damit dieser Test sich
// ausschließlich auf das Header-Verdrahtungsverhalten konzentriert, ohne ein
// echtes localStorage-Fake aufsetzen zu müssen (siehe start.test.js/
// header.test.js für Tests, die die echte Sterne-/Maskottchen-Logik prüfen).
const recordRoundCompletion = vi.fn(() => ({ earned: false }));
vi.mock("./quiz/progress.js", () => ({
  recordRoundCompletion: (...args) => recordRoundCompletion(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Kopfzeilen-Sichtbarkeit über die App-Navigation (Issue #87: showHeader = screen !== 'start')", () => {
  it("zeigt keine Kopfzeile auf dem Start-Bildschirm, zeigt sie aber in der Frage-Runde und im Ergebnis, und blendet sie beim Rücksprung zum Start wieder aus", async () => {
    // main.js ruft showStartScreen() bereits als Seiteneffekt beim Import auf.
    await import("./main.js");

    // 1) Initialer Start-Bildschirm: renderHeader() wird gar nicht aufgerufen
    //    (Akzeptanzkriterium: "kein Logo, kein Modus-Pill, kein Sterne-Badge").
    expect(renderStartScreen).toHaveBeenCalledTimes(1);
    expect(renderHeader).not.toHaveBeenCalled();

    // 2) Kind startet eine Runde über den an renderStartScreen übergebenen
    //    onStart-Callback -> Kopfzeile erscheint jetzt.
    const { onStart } = renderStartScreen.mock.calls[0][1];
    const quizState = {
      mode: GAME_MODE.QUIZ,
      currentIndex: 0,
      roundLength: 5,
      score: 0,
    };
    onStart(quizState);

    expect(renderQuestionScreen).toHaveBeenCalledTimes(1);
    expect(renderHeader).toHaveBeenCalledTimes(1);

    // 3) Runde beendet -> Ergebnis-Bildschirm zeigt die Kopfzeile weiterhin
    //    (alle Bildschirme außer dem Start zeigen sie unverändert).
    const { onFinish } = renderQuestionScreen.mock.calls[0][2];
    onFinish(quizState);

    expect(renderResultScreen).toHaveBeenCalledTimes(1);
    expect(renderHeader).toHaveBeenCalledTimes(2);

    // 4) "Zurück zum Start" (derselbe onBackToStart-Callback, den die
    //    Kopfzeile beim Home-Button-Klick aufruft) -> Kopfzeile verschwindet
    //    wieder, kein dritter renderHeader()-Aufruf.
    const { onBackToStart } = renderHeader.mock.calls[1][1];
    onBackToStart();

    expect(renderStartScreen).toHaveBeenCalledTimes(2);
    expect(renderHeader).toHaveBeenCalledTimes(2);

    // 5) Issue #89: das start-spezifische Sterne-Badge (unter der "Meine
    //    Sammlung"-Karte) öffnet die Maskottchen-Auswahl direkt aus start.js
    //    heraus -- KEIN Umweg über renderHeader (die Kopfzeile ist auf dem
    //    Start-Bildschirm ja ausgeblendet, s. o.), sondern über einen neuen
    //    onOpenMascotChooser-Callback, den main.js beim (zweiten, s. o.)
    //    renderStartScreen()-Aufruf mitgibt (architecture.md Punkt 5: "ruft
    //    renderMascotChooserScreen stattdessen direkt aus start.js heraus
    //    auf"). Fortsetzung derselben Navigations-Reise, kein eigener
    //    Testfall (siehe Datei-Kommentar oben, Begründung "eine
    //    zusammenhängende Reise" -- main.js hat keine Exports, gegen die man
    //    isoliert neu booten könnte, ohne für jeden Fall vi.resetModules()
    //    plus frischen dynamischen Import samt Mock-Neuverdrahtung zu
    //    wiederholen).
    const { onOpenMascotChooser } = renderStartScreen.mock.calls[1][1];
    expect(typeof onOpenMascotChooser).toBe("function");

    onOpenMascotChooser();

    expect(renderMascotChooserScreen).toHaveBeenCalledTimes(1);
    const { onDone } = renderMascotChooserScreen.mock.calls[0][1];
    expect(typeof onDone).toBe("function");

    // "Später ↩" bzw. eine erfolgreiche Auswahl -> Rücksprung zum Start,
    // kein zu bewahrender quizState nötig (anders als bei Frage-Runde/
    // Ergebnis oben) -- ein weiterer, komplett frischer
    // showStartScreen()-Aufruf genügt und baut Sternestand/Sammlung ohnehin
    // neu auf.
    onDone();

    expect(renderStartScreen).toHaveBeenCalledTimes(3);
  });
});
