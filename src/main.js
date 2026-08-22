import "./styles/global.css";
import { renderStartScreen } from "./screens/start.js";
import { renderQuestionScreen } from "./screens/question.js";
// Issue #28: neuer Frage-Bildschirm für den "Wer bin ich?"-Modus (Umkehr-
// Quiz) — main.js ist die einzige Stelle, die beide Frage-Bildschirme kennt
// und anhand von `quizState.mode` (siehe quiz/gameMode.js) entscheidet,
// welcher gerendert wird; die Bildschirme selbst kennen einander weiterhin
// nicht direkt (gleiches Kopplungsmuster wie bisher).
import { renderReverseQuestionScreen } from "./screens/reverseQuestion.js";
import { renderResultScreen } from "./screens/result.js";
import { renderSoundQuestionScreen } from "./screens/soundQuestion.js";
// Issue #45: neuer Spielbildschirm für den "Tier-Memory"-Modus — main.js
// entscheidet anhand von quizState.mode auch hierfür, welcher Bildschirm
// gerendert wird (gleiches Kopplungsmuster wie bei REVERSE/SOUND oben).
import { renderMemoryScreen } from "./screens/memory.js";
// Issue #46: neuer Frage-Bildschirm für den "Buchstabensuche"-Modus --
// gleiches Weiche-Prinzip wie bei REVERSE/SOUND oben, main.js bleibt die
// einzige Stelle, die alle Frage-Bildschirme kennt.
import { renderLetterSearchScreen } from "./screens/letterSearch.js";
import { createQuizState } from "./quiz/state.js";
import { GAME_MODE } from "./quiz/gameMode.js";
import { renderHeader } from "./screens/header.js";
// Issue #81: neuer Maskottchen-Auswahl-Bildschirm, geöffnet über das im
// Header neu hinzugekommene Sterne-Badge (siehe screens/header.js,
// `onOpenMascotChooser`). Rendert wie jeder andere Screen ausschließlich in
// `appContent` -- main.js bleibt die einzige Stelle, die renderHeader() UND
// den jeweiligen Content-Screen kennt (siehe unten, `onOpenMascotChooser`-
// Closures pro Navigationszustand, architecture.md Punkt 3).
import { renderMascotChooserScreen } from "./screens/mascotChooser.js";
// Issue #80: Sterne-/Maskottchen-Freischaltsystem (erster Teil, reine
// Datengrundlage ohne sichtbare UI). showResultScreen ist bereits die
// einzige Stelle, durch die jeder Rundenabschluss aller fünf Modi läuft
// (siehe architecture.md, "Sterne-/Maskottchen-Freischaltsystem: Technische
// Leitplanken") — recordRoundCompletion wird deshalb genau hier einmal
// aufgerufen statt in den einzelnen Frage-Bildschirmen dupliziert, die
// bleiben weiterhin frei von Kenntnis des Maskottchen-Systems.
import { recordRoundCompletion } from "./quiz/progress.js";

// App-Einstiegspunkt: verdrahtet die Navigation zwischen den Bildschirmen.
// Jeder Bildschirm rendert sich selbst vollständig in `#app-content` (siehe
// jeweilige render*Screen-Funktion) und meldet über einen Callback, wann der
// nächste Bildschirm dran ist – die Screens kennen einander dadurch nicht
// direkt.
//
// Seit dem Redesign (Issue #70): `#app` ist nicht mehr der direkte Ziel-
// Container der Screens, sondern hält zusätzlich eine persistente Kopfzeile
// (`#app-header`, siehe screens/header.js) neben `#app-content`. Die
// Kopfzeile kennt die einzelnen Screens nicht direkt — main.js bleibt die
// einzige Stelle, die bei jedem Bildschirm-Wechsel sowohl den Screen als
// auch die Kopfzeile neu rendert.

const app = document.querySelector("#app");
app.innerHTML = `
  <div id="app-header" class="app-header"></div>
  <div id="app-content"></div>
`;
const appHeader = document.querySelector("#app-header");
const appContent = document.querySelector("#app-content");

// Issue #87: Kopfzeile wird auf der Startseite komplett ausgeblendet
// (`showHeader = screen !== "start"`, design.md/requirements.md
// "Startseiten-/Sammlungs-Neuaufbau") -- das neue Zeilenlayout dort braucht
// weder Logo/Home-Button noch Modus-Pille/Sterne-Badge (Letzteres bekommt in
// einer Folge-Story #89 eine eigene Platzierung unter der neuen "Meine
// Sammlung"-Karte). `appHeader.innerHTML` wird hier bewusst geleert statt gar
// nicht angefasst zu lassen -- kommt man von einem anderen Bildschirm zurück
// zum Start (z. B. über den Home-Button), muss die zuvor dort gerenderte
// Kopfzeile verschwinden, nicht nur beim allerersten Aufruf leer bleiben.
// Alle anderen Bildschirme (Frage-Runde, Ergebnis, Maskottchen-Auswahl) rufen
// weiterhin unverändert renderHeader() auf (siehe showQuestionScreen/
// showResultScreen unten) -- keine neue header.js-Option nötig, da main.js
// bereits die einzige Stelle ist, die pro Bildschirm-Wechsel entscheidet, ob
// und wie die Kopfzeile gerendert wird.
function showStartScreen() {
  appHeader.innerHTML = "";
  // Issue #89: das neue start-spezifische Sterne-Badge unter der "Meine
  // Sammlung"-Karte braucht dieselbe Art Closure wie das Kopfzeilen-Badge
  // (Issue #81) bzw. die Sterne-Box im Ergebnis (Issue #83) --
  // architecture.md Punkt 3: kein String-basiertes `backTo`, sondern eine
  // Closure über den aktuellen Navigationszustand. Der Start-Bildschirm hat
  // keinen zu bewahrenden Zustand (anders als quizState bei den anderen
  // beiden Stellen) -- der Rücksprung ruft deshalb einfach erneut
  // showStartScreen() auf, das den Bildschirm ohnehin komplett frisch (inkl.
  // aktualisiertem Sternestand/freigeschalteten Maskottchen) neu aufbaut.
  renderStartScreen(appContent, {
    onStart: showQuestionScreen,
    onOpenMascotChooser: () =>
      renderMascotChooserScreen(appContent, { onDone: () => showStartScreen() }),
  });
}

function showQuestionScreen(quizState) {
  // Issue #120: Fortschritts-Punkte/Score-Badge sollen sich live aktualisieren
  // (nach jeder Antwort bzw. beim Weiterschalten zur nächsten Frage), nicht
  // erst beim nächsten Bildschirm-Wechsel. `updateHeader` bündelt den bisher
  // einmaligen renderHeader()-Aufruf in eine wiederverwendbare Funktion, die
  // main.js weiterhin exklusiv besitzt (siehe Datei-Kommentar oben) -- die
  // einzelnen Frage-Bildschirme rufen sie nur über den neuen `onProgress`-
  // Callback auf, kennen `renderHeader`/`appHeader` selbst weiterhin nicht.
  const updateHeader = () => {
    renderHeader(appHeader, {
      onBackToStart: showStartScreen,
      mode: quizState.mode,
      progress:
        quizState.mode === GAME_MODE.MEMORY
          ? undefined // Tier-Memory hat keine Fragen-Fortschritts-Anzeige (siehe memory.js, eigener Paare-Fortschritt)
          : {
              currentIndex: quizState.currentIndex,
              roundLength: quizState.roundLength,
              score: quizState.score,
            },
      // Issue #81: Closure über denselben (mutierten) quizState -- der
      // jeweilige Frage-Bildschirm hält currentIndex/score direkt auf diesem
      // Objekt, daher landet "Später ↩"/Einlösen exakt bei der Frage, von der
      // aus geöffnet wurde, nicht bei Frage 1 (siehe question.js: baut
      // quizState.questions nur einmal auf, ein erneuter renderQuestionScreen-
      // Aufruf für denselben quizState ist idempotent).
      onOpenMascotChooser: () =>
        renderMascotChooserScreen(appContent, {
          onDone: () => showQuestionScreen(quizState),
        }),
    });
  };
  updateHeader();

  if (quizState.mode === GAME_MODE.REVERSE) {
    renderReverseQuestionScreen(appContent, quizState, {
      onFinish: showResultScreen,
      onProgress: updateHeader,
    });
    return;
  }
  if (quizState.mode === GAME_MODE.SOUND) {
    renderSoundQuestionScreen(appContent, quizState, {
      onFinish: showResultScreen,
      onProgress: updateHeader,
    });
    return;
  }
  if (quizState.mode === GAME_MODE.MEMORY) {
    // Kein onProgress: Tier-Memory zeigt keine Fortschritts-Punkte/Score-
    // Badge in der Kopfzeile (siehe updateHeader oben), hat also nichts, das
    // hier live zu aktualisieren wäre.
    renderMemoryScreen(appContent, quizState, { onFinish: showResultScreen });
    return;
  }
  if (quizState.mode === GAME_MODE.LETTER_SEARCH) {
    renderLetterSearchScreen(appContent, quizState, {
      onFinish: showResultScreen,
      onProgress: updateHeader,
    });
    return;
  }
  renderQuestionScreen(appContent, quizState, {
    onFinish: showResultScreen,
    onProgress: updateHeader,
  });
}

function showResultScreen(quizState) {
  // Stern-Vergabe zentral hier auswerten (siehe Import-Kommentar oben).
  // Seit Issue #81 kann dieselbe Funktion für denselben quizState/
  // Ergebnis-Objekt MEHRFACH aufgerufen werden: öffnet das Kind über das neue
  // Sterne-Badge die Maskottchen-Auswahl mitten vom Ergebnis-Bildschirm aus
  // und kehrt danach hierher zurück (`onOpenMascotChooser` unten,
  // architecture.md Punkt 3), ruft main.js showResultScreen(quizState) ein
  // zweites Mal mit demselben Objekt auf. Ohne Schutz würde
  // recordRoundCompletion() dabei fälschlich ein zweites Mal ausgewertet und
  // ein zweiter, unverdienter Stern vergeben (seit Issue #119 vergibt jede
  // Runde einen Stern, unabhängig vom Score — die Doppelvergabe-Gefahr
  // besteht also für JEDE Runde, nicht nur ab einem bestimmten Score). Der `starsAwarded`-
  // Merker wird direkt auf das Ergebnis-Objekt geschrieben (gleiches Muster
  // wie die transienten `pending*`-Felder in start.js) und verhindert das --
  // rein lokale main.js-Absicherung, keine Änderung an progress.js nötig.
  //
  // Seit Issue #83 wird zusätzlich das `earned`-Ergebnis von
  // recordRoundCompletion() als transientes `quizState.earned`-Feld
  // gemerkt (gleiches Muster wie `starsAwarded` direkt darüber) -- result.js
  // braucht diesen Wert für das bedingte Panel-Label ("Runde geschafft
  // 🎉"/"Runde beendet") sowie die Sterne-Box, auch bei einem erneuten
  // showResultScreen()-Aufruf nach Rücksprung aus der Maskottchen-Auswahl
  // (dann liefert recordRoundCompletion selbst nichts mehr, der `if`-Zweig
  // wird ja übersprungen).
  if (!quizState.starsAwarded) {
    const { earned } = recordRoundCompletion({
      mode: quizState.mode,
      score: quizState.score,
      roundLength: quizState.roundLength,
    });
    quizState.starsAwarded = true;
    quizState.earned = earned;
  }

  renderHeader(appHeader, {
    onBackToStart: showStartScreen,
    mode: quizState.mode,
    onOpenMascotChooser: () =>
      renderMascotChooserScreen(appContent, {
        onDone: () => showResultScreen(quizState),
      }),
  });
  // "Nochmal spielen" und "Zurück zum Start" führen laut design.md bewusst
  // zu zwei getrennten Pfaden (QA-Feedback zu Issue #7, siehe Issue-Kommentar):
  // "Nochmal spielen" spart der Zielgruppe die erneute Stufenwahl und startet
  // direkt eine neue Runde mit derselben, zuletzt gewählten Schwierigkeitsstufe
  // – ohne den Start-Bildschirm erneut zu zeigen. "Zurück zum Start" führt
  // weiterhin zum Start-Bildschirm mit freier Schwierigkeitswahl. Seit Issue
  // #13 (PM-Entscheidung 13.08.2026) gilt dasselbe für die Fragenanzahl: sie
  // wird bei "Nochmal spielen" beibehalten, analog zur Schwierigkeitsstufe.
  renderResultScreen(appContent, quizState, {
    onPlayAgain: () => {
      // Immer ein komplett neuer quizState (createQuizState) statt den
      // abgeschlossenen quizState wiederzuverwenden bzw. zu mutieren – Score/
      // Antworten/Fragen der vorherigen Runde dürfen nicht hängen bleiben.
      // Schwierigkeitsstufe, Fragenanzahl UND (seit Issue #28) der Spielmodus
      // werden übernommen, die Fragenliste wird vom jeweiligen Frage-
      // Bildschirm beim Rendern neu generiert (siehe question.js bzw.
      // reverseQuestion.js) – ohne die Modus-Übernahme würde "Nochmal
      // spielen" aus einer "Wer bin ich?"-Runde überraschend in den
      // bestehenden Quizfragen-Modus zurückfallen.
      showQuestionScreen(
        createQuizState(
          quizState.difficulty,
          [],
          quizState.roundLength,
          quizState.mode,
        ),
      );
    },
    onBackToStart: showStartScreen,
    // Issue #83: CTA-Button der Sterne-Box ("Neues Maskottchen wählen 🎁")
    // -- dieselbe Closure wie beim Header-Sterne-Badge oben (Issue #81,
    // architecture.md Punkt 3), inkl. Rücksprung genau hierher.
    onOpenMascotChooser: () =>
      renderMascotChooserScreen(appContent, {
        onDone: () => showResultScreen(quizState),
      }),
  });
}

showStartScreen();
