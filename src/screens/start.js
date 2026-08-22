// Start-Bildschirm: Titel, Maskottchen, Schwierigkeitsstufen-Auswahl,
// Fragenanzahl-Auswahl, Start-Button (siehe design.md, "Nutzerfluss" Punkt 1
// "Start-Bildschirm" sowie "Layout-Empfehlungen", "Visuelle Grundlinie",
// "Barrierefreiheit").
//
// Ablauf: Kind wählt zuerst eine Schwierigkeitsstufe (zwei große Kacheln), danach
// wird der Start-Button aktiv. Ein Klick auf Start erzeugt den Quiz-Zustand und
// übergibt die eigentliche Navigation an den Aufrufer (siehe `onStart`-Callback,
// verdrahtet in src/main.js) – dieser Bildschirm kennt den Frage-Bildschirm
// (Issue #6) bewusst nicht direkt, um die Screens lose gekoppelt zu halten.
//
// Seit Issue #13: zusätzliche Fragenanzahl-Auswahl (5/10/15/20, Standard 10)
// unterhalb der Schwierigkeitsstufen-Auswahl — bewusst als schmale, dezente
// Chip-Reihe statt großer Kacheln (Abstimmung mit `ux-design`, siehe
// Issue-Beschreibung), damit sie klar sekundär zur eigentlich spielrelevanten
// Stufen-Wahl bleibt. Anders als die Schwierigkeitsstufe ist hier bereits ein
// Wert vorbelegt (kein Pflicht-Interaktionsschritt vor dem Spielstart nötig).
//
// Seit Issue #26: zweite Kachelreihe "Was möchtest du spielen?" OBERHALB der
// Schwierigkeitsstufen-Auswahl (design.md, "Modus-Auswahl auf dem
// Start-Bildschirm") — "Quizfragen" (bestehender Modus) bleibt vorbelegt/
// hervorgehoben, "Wer bin ich?" ist der neue, online-abhängige Umkehr-Quiz-
// Modus. Tippt ein Kind auf "Wer bin ich?", löst das einen "Testabruf" aus:
// laut PM-/Architektur-Entscheidung (architecture.md, "1. Umkehr-Quiz" ->
// "Finale technische Leitplanken") ist das kein separater Health-Check,
// sondern schlicht der erste Aufruf der neuen, asynchronen Pro-Frage-
// Generierungsfunktion `generateNextReverseQuestion` aus Issue #27 für Frage
// 1 der Runde. Seit Issue #27 ist src/quiz/reverseQuestionGenerator.js
// vollständig implementiert (Bildauflösung über Wikimedia Commons inkl.
// Retry-Logik bei Fehlschlag, Falschantworten-Ziehung) — der Testabruf hier
// gelingt also inzwischen bei bestehender Internetverbindung tatsächlich.
// Schlägt er dennoch fehl (kein Internet, oder alle Retry-Versuche aus #27
// scheitern), behandelt dieser Screen das weiterhin bewusst wie jeden
// anderen Fehlschlag: freundlicher Hinweis statt Fehlertext, Auswahl
// verbleibt bei "Quizfragen" (der eigentliche Frage-/Feedback-Bildschirm für
// diesen Modus mit Bildanzeige/Attributionszeile folgt erst in Issue #28,
// bis dahin bleibt der Modus über diesen Screen hinaus noch nicht spielbar).
// Ein dezenter Ladezustand direkt in der Kachel
// (Spinner + Label-Wechsel, analog zum bestehenden "Bild zeigen"-Button aus
// Issue #16, siehe question.js/imageHint.js) deckt die kurze Wartezeit ab.
//
// Seit Issue #28: der Modus ist jetzt tatsächlich spielbar (neuer Bildschirm
// src/screens/reverseQuestion.js) — GAME_MODE kommt daher nicht mehr lokal
// aus dieser Datei, sondern aus dem gemeinsamen quiz/gameMode.js (siehe
// dortiger Datei-Kommentar), damit state.js/main.js denselben Wert kennen.
// Zusätzlich wird das Ergebnis des "Testabrufs" (die bereits fertig
// aufgelöste erste Frage) jetzt nicht mehr verworfen, sondern zwischen-
// gespeichert (`pendingReverseQuestion`) und beim Start-Klick an den neuen
// Bildschirm weitergereicht — der spart sich damit einen zweiten,
// überflüssigen Netzwerk-Aufruf für Frage 1 und zeigt sie ohne zusätzlichen
// Ladebildschirm direkt an (design.md: "kein zusätzlicher Ladebildschirm nach
// dem Moduswechsel").
//
// Seit Issue #31: dritte Kachel "Tiergeräusche" (design.md, "Modus-Auswahl
// auf dem Start-Bildschirm: Dritte Kachel 'Tiergeräusche'") — Reihenfolge
// Quizfragen -> Wer bin ich? -> Tiergeräusche folgt der Priorisierung aus
// requirements.md, keine willkürliche Anordnung. Testabruf/Ladezustand/
// Fehlerfallback sind 1:1 dasselbe Muster wie bei "Wer bin ich?" oben (daher
// eigener, aber strukturell identischer Satz an Handlern statt Wieder-
// verwendung eines generischen Mode-Handlers — bewusste Konsistenz mit dem
// bereits etablierten Muster, kein DRY-Zwang an dieser Stelle). Seit dem
// Merge von Issue #32 (echter Fragegenerierungs-Pfad `generateNextSoundQuestion`)
// und #33 (Audio-Player-Bildschirm `soundQuestion.js`) wird das erfolgreiche
// Testabruf-Ergebnis genau wie bei `pendingReverseQuestion` oben
// zwischengespeichert (`pendingSoundQuestion`) und beim Rundenstart an
// `soundQuestion.js` weitergereicht statt es ein zweites Mal abzurufen.
//
// Seit Issue #45: vierte Kachel "Tier-Memory" — strukturell dasselbe
// Testabruf-/Ladezustand-/Fehlerfallback-Muster wie oben, mit zwei
// Besonderheiten (siehe design.md/architecture.md, "Neuer Spielmodus
// 'Tier-Memory'"): (1) kein Bezug zur Fragenanzahl-Auswahl — die
// Kartenanzahl hängt direkt an der Schwierigkeitsstufe, daher wird die
// `.round-length-picker`-Sektion ausgeblendet, solange dieser Modus gewählt
// ist (kein dritter Auswahlschritt, Akzeptanzkriterium Issue #45). (2) Der
// Testabruf (`buildMemoryDeck`) baut das GESAMTE Kartenset für die aktuell
// gewählte (oder mangels Auswahl per EASY-Platzhalter angenommene)
// Schwierigkeitsstufe — ändert das Kind die Stufe NACH dem Antippen dieser
// Kachel, würde das zwischengespeicherte Deck die falsche Kartenanzahl
// haben. Deshalb wird zusätzlich zum Deck selbst (`pendingMemoryDeck`) die
// Schwierigkeitsstufe gespeichert, für die es aufgebaut wurde
// (`pendingMemoryDeckDifficulty`) — src/screens/memory.js vergleicht diese
// beim Rundenstart gegen die tatsächlich gewählte Stufe und baut bei einer
// Abweichung selbst ein frisches Deck (sichtbar über denselben Ladezustand
// wie beim Moduseinstieg, kein Sonderfall/Bug).
//
// Seit Issue #46: fünfte Kachel "Buchstabensuche" (design.md, "Neuer
// Spielmodus 'Buchstabensuche'", Reihenfolge Tier-Memory vor Buchstabensuche
// laut dortiger Konvention). Testabruf/Ladezustand/Fehlerfallback sind wieder
// 1:1 dasselbe Muster wie bei "Wer bin ich?"/"Tiergeräusche" oben — einziger
// technischer Unterschied: `generateNextLetterSearchQuestion` braucht
// (anders als die übrigen Testabrufe) KEINE Schwierigkeitsstufe als Parameter
// (siehe letterSearchQuestionGenerator.js, Datei-Kommentar: die
// Schwierigkeitsstufe beeinflusst hier ausschließlich die Lücken-Berechnung,
// die erst letterSearch.js beim Anzeigen der Frage aufruft). Anders als
// Tier-Memory nutzt dieser Modus die reguläre Fragenanzahl-Auswahl (siehe
// architecture.md, "Buchstabensuche": "behält die reguläre Rundenstruktur
// mit ... wählbarer Fragenanzahl") — jeder erfolgreiche Moduswechsel weg von
// Tier-Memory (zu diesem oder einem der beiden bestehenden Modi) blendet die
// `.round-length-picker`-Sektion deshalb wieder ein. Das bereits bestehende
// `.mode-picker__group` (flex-wrap: wrap, siehe global.css) bricht mit einer
// fünften Kachel bereits automatisch auf mehrere Zeilen um (auf der
// bestehenden max-width des Start-Bildschirms passen ohnehin nur 2 Kacheln
// pro Zeile) — kein zusätzlicher Grid-Umbau nötig.

// Seit Issue #87 (neue Handoff-Datei "CHANGES-startseite-sammlung.md",
// Abschnitt 1, siehe requirements.md/design.md "Startseiten-/Sammlungs-
// Neuaufbau"): reiner Zeilenlayout-Umbau, keine Logik-Änderung. `.start-screen`
// ist jetzt eine einzige Spalte aus Vollbreite-"Zeilen" (Titel -> Kartenzeile
// "Mein Maskottchen"/"Meine Sammlung" -> Modus-Auswahl -> Schwierigkeit ->
// Fragenanzahl -> CTA) statt des bisherigen zweispaltigen Haupt-/
// Seitenspalten-Layouts (Issue #71). Die Modus-Kacheln stehen jetzt bewusst
// wieder in EINER Reihe (`.mode-picker__group`, 5 Spalten) -- eine explizite
// Reversion der 2-zeiligen Umbruch-Entscheidung vom 16.08.2026 (design.md,
// "Modus-Auswahl auf dem Start-Bildschirm: Fünfter/sechster Modus"), siehe
// dortige neue Ergänzung. Die Kopfzeile wird auf diesem Bildschirm nicht mehr
// gerendert (siehe main.js, `showStartScreen()`) -- diese Datei kannte die
// Kopfzeile ohnehin nie direkt, daher keine Änderung hier nötig.
import animalsData from "../../data/animals.json";
import { DIFFICULTY_LEVELS, DIFFICULTY_LABELS } from "../quiz/difficulty.js";
import { DEFAULT_ROUND_LENGTH } from "../quiz/questionGenerator.js";
import { createQuizState } from "../quiz/state.js";
import { generateNextReverseQuestion } from "../quiz/reverseQuestionGenerator.js";
import { generateNextSoundQuestion } from "../quiz/soundQuestionGenerator.js";
// Issue #45: Testabruf für die neue "Tier-Memory"-Kachel ist der erste
// Aufruf von buildMemoryDeck() — gleiches Prinzip wie
// generateNextReverseQuestion/generateNextSoundQuestion oben (architecture.md,
// "Vollständiger Fehlschlag ... wird beim Versuch, den Modus zu betreten
// abgefangen — der Deck-Aufbau ist der Testabruf").
import { buildMemoryDeck } from "../quiz/memory.js";
import { generateNextLetterSearchQuestion } from "../quiz/letterSearchQuestionGenerator.js";
import { GAME_MODE } from "../quiz/gameMode.js";
// Issue #82 (Datengrundlage weiterhin genutzt), Issue #88 (Markup/Wiring
// ersetzt -- siehe renderMascotStageCardMarkup() unten): `loadProgress`/
// `setActiveIdx` liefern/steuern den aktiven Maskottchen-Index (siehe
// progress.js), `MASCOTS`/`tintOf` die Anzeige-Daten (Name, Emoji, Rolle,
// Hintergrundfarbe je Maskottchen, siehe mascots.js).
//
// Issue #89: der bisherige Album-Vorschau-Import (`loadCollectedAnimals`/
// `getAlbumProgress`/`ALBUM_TARGET` aus `quiz/album.js`) entfällt hier
// ersatzlos -- die rechte Karte ("Meine Sammlung") zeigt ab jetzt die 50
// Maskottchen (renderCollectionCardMarkup() unten), nicht mehr die
// gesammelten Tierarten. `album.js` selbst bleibt unangetastet (wird noch
// von den 5 Frage-Bildschirmen sowie result.js verwendet, vollständige
// Modul-Entfernung ist die separate Story #91).
import { loadProgress, setActiveIdx } from "../quiz/progress.js";
import { MASCOTS, tintOf } from "../quiz/mascots.js";
// Issue #88: neue wiederverwendbare Nav-Komponente (Pfeil/Badge/Pfeil),
// ersetzt das bisherige, screen-eigene Karussell-Markup/-Wiring aus Issue
// #82 (renderMascotCarouselMarkup()/wireMascotCarousel()) an dieser ersten
// von 4 geplanten Verwendungsstellen (siehe architecture.md,
// "Wiederverwendbare 3-teilige Nav-Komponente").
import { buildNavControlMarkup, wireNavControl } from "../quiz/navControl.js";
// Issue #89: dieselbe canRedeem-Berechnung wie im Kopfzeilen-Sterne-Badge
// (Issue #81), jetzt aus header.js exportiert statt ein zweites Mal lokal
// berechnet (siehe dortiger Kommentar zu canRedeemMascot()).
import { canRedeemMascot } from "./header.js";

// Singular/Plural-Copy fürs Karussell-Hinweiszeile (Handoff, "Maskottchen-
// Karussell": "noch {N Stern|N Sterne} bis zum nächsten") -- Deutsch
// unterscheidet beim Zählen nur zwischen genau 1 und allem anderen, kein
// Sonderfall für 0 nötig (siehe design.md, "Singular/Plural-Copy"). Kein
// bestehender Helper dafür wiederverwendbar (weder header.js noch
// mascotChooser.js zeigen bislang einen Sterne-Zählsatz), daher neu -- reine
// Ternary genügt, keine Bibliothek nötig.
function formatStars(n) {
  return n === 1 ? "1 Stern" : `${n} Sterne`;
}

/**
 * Baut das Markup für die "Mein Maskottchen"-Karte (Issue #88, neue
 * Handoff-Datei "CHANGES-startseite-sammlung.md", Abschnitt 2) -- ersetzt
 * die bisherige Kombination aus Guide-Karte (vormals
 * renderMascotGuideMarkup()) + kleinem Karussell (vormals
 * renderMascotCarouselMarkup()) aus Issue #82 durch eine große quadratische
 * Bühne (`aspect-ratio: 1.1`, `box-sizing: border-box` -- Pflicht laut
 * Handoff, sonst laufen Rahmen/Padding über die 100% Kartenbreite hinaus)
 * plus das neue wiederverwendbare Nav-Element (src/quiz/navControl.js). Das
 * frühere Sprechblasen-Element ("Fine, dein Tierguide") entfällt laut
 * Handoff ersatzlos -- der Guide geht vollständig in der neuen Bühne auf.
 * `aria-live="polite"` auf der Bühne (gleiches Muster wie vorher
 * `.mascot-carousel__stage`), damit ein Pfeil-Klick auch ohne visuellen
 * Fokuswechsel angekündigt wird.
 * @param {{stars: number, unlockedIds: number[], activeIdx: number}} progress
 * @returns {string}
 */
function renderMascotStageCardMarkup(progress) {
  const { stars, unlockedIds, activeIdx } = progress;
  const activeMascotId = unlockedIds[activeIdx] ?? 0;
  const activeMascot = MASCOTS[activeMascotId] ?? MASCOTS[0];
  const tint = tintOf(activeMascotId);

  const allCollected = unlockedIds.length >= MASCOTS.length;
  const canRedeem = stars >= 5 && !allCollected;

  // Drei-Fälle-Hinweiszeile laut Handoff, Abschnitt 2.5 -- Copy hier bewusst
  // wörtlich aus der neuen Handoff-Datei übernommen (weicht leicht vom
  // vorherigen #82-Karussell-Wortlaut ab).
  let hint;
  if (allCollected) {
    hint = "Du hast alle 50 Maskottchen gesammelt!";
  } else if (canRedeem) {
    hint = `Du hast ${stars} Sterne — du darfst dir ein neues Maskottchen aussuchen!`;
  } else {
    hint = `Noch ${formatStars(5 - stars)}, bis du ein weiteres Maskottchen freischalten kannst.`;
  }

  const navMarkup = buildNavControlMarkup({
    label: `${activeIdx + 1}/${unlockedIds.length}`,
    disabledPrev: activeIdx === 0,
    disabledNext: activeIdx === unlockedIds.length - 1,
    ariaLabelPrev: "Vorheriges Maskottchen",
    ariaLabelNext: "Nächstes Maskottchen",
  });

  return `
    <div class="mascot-stage" style="background: ${tint};" aria-live="polite">
      <span class="mascot-stage__figure" aria-hidden="true">${activeMascot.emoji}</span>
      <p class="mascot-stage__name">${activeMascot.name}</p>
      <p class="mascot-stage__role">${activeMascot.role}</p>
    </div>
    <p class="start-mascot-card__select-label">Maskottchen auswählen</p>
    ${navMarkup}
    <p class="start-mascot-card__hint">${hint}</p>
  `;
}

// Issue #89, neue Handoff-Datei "CHANGES-startseite-sammlung.md", Abschnitt 3
// ("Karte 'Meine Sammlung'"): 9 Kacheln pro Seite, 6 Seiten für die 50
// Maskottchen aus mascots.js (50 / 9 = 5 volle Seiten + 1 Rest-Seite mit 5
// Kacheln -- Math.ceil deckt das korrekt ab, keine Rundungs-Sonderbehandlung
// nötig).
const COLLECTION_PAGE_SIZE = 9;
const COLLECTION_PAGE_COUNT = Math.ceil(MASCOTS.length / COLLECTION_PAGE_SIZE);

/**
 * Baut das Markup für die "Meine Sammlung"-Karte (Issue #89) -- ersetzt die
 * bisherige Album-Vorschau (entfernter Import oben) an derselben Stelle im
 * Layout, trackt aber eine komplett andere Sache: freigeschaltete
 * Maskottchen (50 Stück, siehe mascots.js) statt gesammelte Tierarten (siehe
 * requirements.md, "kein Wiederverwenden des Album-Rasters für einen neuen
 * Zweck"). Rein darstellend + die Nav-Verdrahtung passiert wie beim
 * Maskottchen-Karten-Pendant außerhalb dieser Funktion (siehe
 * renderCollectionCard() unten) -- diese Funktion baut nur das Markup für
 * die jeweils aktuelle Seite.
 *
 * `colPage` ist rein lokaler UI-Zustand (Closure-Variable in
 * renderStartScreen(), analog zu selectedDifficulty) -- KEINE eigene
 * localStorage-Persistenz, anders als `activeIdx` beim Maskottchen-Nav
 * (progress.js). Welche Maskottchen bereits freigeschaltet sind, kommt
 * weiterhin aus `progress.unlockedIds` (echte Persistenz), nur die aktuell
 * angezeigte Sammlungs-SEITE ist rein transient.
 *
 * Letzte Seite (0-indexed COLLECTION_PAGE_COUNT - 1, also Seite 6 von 6)
 * rendert laut Handoff nur die real vorhandenen Slots
 * (`Math.min(9, 50 - seite*9)` -- hier ausgedrückt über
 * `Math.min(COLLECTION_PAGE_SIZE, MASCOTS.length - startId)`), keine leeren
 * Platzhalter-Kästen: bei 50 Maskottchen und Seite 5 (0-indexed) ergibt das
 * `Math.min(9, 50 - 45) = 5` Kacheln (Maskottchen-IDs 45-49).
 * @param {{unlockedIds: number[]}} progress
 * @param {number} colPage 0-indexierte aktuelle Sammlungs-Seite
 * @returns {string}
 */
function renderCollectionCardMarkup(progress, colPage) {
  const { unlockedIds } = progress;
  const startId = colPage * COLLECTION_PAGE_SIZE;
  const slotsOnPage = Math.min(COLLECTION_PAGE_SIZE, MASCOTS.length - startId);

  const tiles = [];
  for (let i = 0; i < slotsOnPage; i += 1) {
    const mascotId = startId + i;
    const mascot = MASCOTS[mascotId];
    const unlocked = unlockedIds.includes(mascotId);

    if (unlocked) {
      tiles.push(`
        <div
          class="collection-grid__tile collection-grid__tile--unlocked"
          style="background: ${tintOf(mascotId)};"
        >
          <span class="collection-grid__figure" aria-hidden="true">${mascot.emoji}</span>
          <p class="collection-grid__name">${mascot.name}</p>
        </div>
      `);
    } else {
      tiles.push(`
        <div class="collection-grid__tile collection-grid__tile--locked" aria-hidden="true">
          <span class="collection-grid__mark">?</span>
        </div>
      `);
    }
  }

  const navMarkup = buildNavControlMarkup({
    label: `Seite ${colPage + 1}/${COLLECTION_PAGE_COUNT}`,
    disabledPrev: colPage === 0,
    disabledNext: colPage === COLLECTION_PAGE_COUNT - 1,
    ariaLabelPrev: "Vorherige Sammlungsseite",
    ariaLabelNext: "Nächste Sammlungsseite",
  });

  return `
    <div class="collection-grid" aria-live="polite">
      ${tiles.join("")}
    </div>
    ${navMarkup}
    <p class="start-collection-card__hint">Hinter jedem ? versteckt sich ein Maskottchen: 5 Sterne sammeln, dann darfst du eins aussuchen.</p>
  `;
}

/**
 * Baut das Markup für das start-spezifische Sterne-Badge (Issue #89) --
 * mittig unter der "Meine Sammlung"-Karte, ersetzt an dieser einen Stelle das
 * Kopfzeilen-Badge aus Issue #81 (die Kopfzeile ist auf dem Start-Bildschirm
 * ausgeblendet, siehe Issue #87). Nutzt dieselbe `canRedeem`-Berechnung wie
 * `header.js` (jetzt von dort exportiert statt ein zweites Mal berechnet,
 * siehe Import oben) -- reine Darstellungs-Variante, keine zweite
 * Freischalt-Logik-Kopie.
 *
 * Unter 5 Sternen laut Handoff bewusst "unsichtbar/ohne Fläche" (kein
 * Rahmen/Hintergrund/Schatten, nur Text) und `disabled` -- ab 5 Sternen
 * dunkle CTA-Optik (analog `.start-button`) samt `k-nudge`-Animation,
 * klickbar.
 * @param {{stars: number, canRedeem: boolean}} state
 * @returns {string}
 */
function renderStartStarBadgeMarkup({ stars, canRedeem }) {
  if (canRedeem) {
    return `
      <button
        type="button"
        class="start-star-badge start-star-badge--redeemable"
        aria-label="${stars} Sterne — neues Maskottchen wählen"
      >⭐ ${stars} Sterne · Maskottchen aussuchen</button>
    `;
  }

  return `
    <button
      type="button"
      class="start-star-badge"
      disabled
      aria-disabled="true"
    >⭐ ${stars}/5 Sterne</button>
  `;
}

// Werte laut UX-Abstimmung zu Issue #13: 4 Chips, gleichermaßen für beide
// Schwierigkeitsstufen (PM-Entscheidung 13.08.2026, siehe Issue-Kommentar).
//
// Issue #87: die neue Handoff-Datei ("CHANGES-startseite-sammlung.md",
// Abschnitt 1) nennt für die Fragenanzahl-Zeile nur noch 3 Kacheln ("5
// Fragen/10 Fragen/15 Fragen") -- ohne zu erwähnen, dass die vierte Option
// (20) damit bewusst entfallen soll, und ohne die PM-Entscheidung zu Issue
// #13 (13.08.2026, s.o.) explizit aufzuheben. Da eine echte Funktions-
// reduktion (Option "20 Fragen" komplett entfernen) etwas anderes ist als der
// hier beauftragte reine Layout-/CSS-Umbau, bleibt die Option bewusst
// erhalten -- nur das Zeilenlayout (volle Breite, "flex: 1"-Kacheln statt
// kleiner Chips) wird umgesetzt. Siehe PR-Beschreibung/Issue-Kommentar zu #87
// für die explizite Rückfrage an business-analyst/PM.
const ROUND_LENGTH_OPTIONS = [5, 10, 15, 20];

// Labels: design.md nennt "6–10 Jahre"/"10–12 Jahre" und "Einfach"/"Knifflig" als
// gleichwertige Vorschläge, ohne finale Entscheidung (siehe Issue #4, "Offene
// Fragen"). Pragmatische Wahl für diese Umsetzung: beides kombinieren (kindgerechtes
// Label groß, Altersangabe als Zusatzinfo) – zur Abstimmung im Issue-Kommentar
// vermerkt.
const DIFFICULTY_OPTIONS = [
  {
    value: DIFFICULTY_LEVELS.EASY,
    label: DIFFICULTY_LABELS[DIFFICULTY_LEVELS.EASY],
    hint: "6–10 Jahre",
  },
  {
    value: DIFFICULTY_LEVELS.HARD,
    label: DIFFICULTY_LABELS[DIFFICULTY_LEVELS.HARD],
    hint: "10–12 Jahre",
  },
];

/**
 * Rendert den Start-Bildschirm in den übergebenen Container.
 * @param {HTMLElement} container
 * @param {object} [callbacks]
 * @param {(quizState: object) => void} [callbacks.onStart] wird aufgerufen,
 *   sobald das Kind nach Stufenauswahl auf "Los geht's!" tippt; erhält den neu
 *   erzeugten Quiz-Zustand (siehe createQuizState).
 * @param {() => void} [callbacks.onOpenMascotChooser] Issue #89: wird beim
 *   Klick auf das start-spezifische Sterne-Badge aufgerufen, sofern
 *   `canRedeem` (siehe renderStartStarBadgeMarkup) -- main.js übergibt hier
 *   dieselbe Art Closure wie beim Kopfzeilen-Badge (Issue #81) bzw. der
 *   Sterne-Box im Ergebnis (Issue #83), architecture.md Punkt 3, inkl.
 *   Rücksprung zum Start-Bildschirm über `onDone`.
 */
export function renderStartScreen(container, { onStart, onOpenMascotChooser } = {}) {
  let selectedDifficulty = null;
  let selectedRoundLength = DEFAULT_ROUND_LENGTH;
  // Seit Issue #28: welcher Modus aktuell ausgewählt ist, plus (nur für
  // GAME_MODE.REVERSE relevant) die bereits fertig aufgelöste erste Frage aus
  // dem erfolgreichen Testabruf (siehe Datei-Kommentar oben). Wird beim
  // Start-Klick unten an den neu erzeugten Quiz-Zustand angehängt.
  let selectedMode = GAME_MODE.QUIZ;
  let pendingReverseQuestion = null;
  // Analoges Wiederverwendungsfeld für GAME_MODE.SOUND (Issue #33), gleiches
  // Prinzip wie pendingReverseQuestion oben.
  let pendingSoundQuestion = null;
  // Analoges Wiederverwendungsfeld für GAME_MODE.MEMORY (Issue #45) — hier
  // zusätzlich die Schwierigkeitsstufe, für die das Deck aufgebaut wurde
  // (siehe Datei-Kommentar oben, "Besonderheit (2)").
  let pendingMemoryDeck = null;
  let pendingMemoryDeckDifficulty = null;
  // Analoges Wiederverwendungsfeld für GAME_MODE.LETTER_SEARCH (Issue #46),
  // gleiches Prinzip wie pendingReverseQuestion/pendingSoundQuestion oben.
  let pendingLetterSearchQuestion = null;
  // Issue #89: aktuell angezeigte Seite der "Meine Sammlung"-Karte -- rein
  // lokaler UI-Zustand, analog zu selectedDifficulty oben, KEINE eigene
  // localStorage-Persistenz (siehe renderCollectionCardMarkup()-Kommentar).
  let colPage = 0;

  container.innerHTML = `
    <section class="start-screen" aria-labelledby="start-title">
      <div class="start-screen__title-row">
        <h1 id="start-title" class="start-screen__title">Hallo! Wollen wir Tiere entdecken?</h1>
        <p class="start-screen__intro">Wähle dir ein Spiel aus. Ich lese jede Frage vor — und falsch raten ist völlig okay, dann schauen wir uns das Tier zusammen an.</p>
      </div>

      <div class="start-cards">
        <div class="start-card start-card--mascot">
          <h3 class="start-card__title">Mein Maskottchen</h3>
          <div class="start-card__body" data-mascot-card-body></div>
        </div>
        <div class="start-card start-card--collection">
          <h3 class="start-card__title">Meine Sammlung</h3>
          <div class="start-card__body" data-collection-card-body></div>
        </div>
      </div>

      <div class="start-star-badge-row" data-star-badge-row></div>

      <div class="mode-picker">
        <h2 id="mode-picker-label" class="mode-picker__label">
          1 · Welches Spiel möchtest du spielen?
        </h2>
        <div
          class="mode-picker__group"
          role="group"
          aria-labelledby="mode-picker-label"
        >
          <button
            type="button"
            class="mode-button mode-button--selected k-btn"
            data-mode="${GAME_MODE.QUIZ}"
            aria-pressed="true"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon-box" aria-hidden="true">
              <span class="mode-button__icon">❓</span>
            </span>
            <span class="mode-button__text">
              <span class="mode-button__label">Quizfragen</span>
              <span class="mode-button__hint">Antwort antippen</span>
            </span>
          </button>
          <button
            type="button"
            class="mode-button k-btn"
            data-mode="${GAME_MODE.REVERSE}"
            aria-pressed="false"
            aria-busy="false"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon-box" aria-hidden="true">
              <span class="mode-button__icon">🎭</span>
              <span class="mode-button__spinner" aria-hidden="true"></span>
            </span>
            <span class="mode-button__text">
              <span class="mode-button__label">Wer bin ich?</span>
              <span class="mode-button__hint">Tier erraten</span>
            </span>
            <span
              class="mode-button__online-icon"
              role="img"
              aria-label="Benötigt Internetverbindung"
              >🌐</span
            >
          </button>
          <button
            type="button"
            class="mode-button k-btn"
            data-mode="${GAME_MODE.SOUND}"
            aria-pressed="false"
            aria-busy="false"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon-box" aria-hidden="true">
              <span class="mode-button__icon">🔊</span>
              <span class="mode-button__spinner" aria-hidden="true"></span>
            </span>
            <span class="mode-button__text">
              <span class="mode-button__label">Tierlaute</span>
              <span class="mode-button__hint">Hören &amp; raten</span>
            </span>
            <span
              class="mode-button__online-icon"
              role="img"
              aria-label="Benötigt Internetverbindung"
              >🌐</span
            >
          </button>
          <button
            type="button"
            class="mode-button k-btn"
            data-mode="${GAME_MODE.MEMORY}"
            aria-pressed="false"
            aria-busy="false"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon-box" aria-hidden="true">
              <span class="mode-button__icon">🃏</span>
              <span class="mode-button__spinner" aria-hidden="true"></span>
            </span>
            <span class="mode-button__text">
              <span class="mode-button__label">Tier-Memory</span>
              <span class="mode-button__hint">Paare finden</span>
            </span>
            <span
              class="mode-button__online-icon"
              role="img"
              aria-label="Benötigt Internetverbindung"
              >🌐</span
            >
          </button>
          <button
            type="button"
            class="mode-button k-btn"
            data-mode="${GAME_MODE.LETTER_SEARCH}"
            aria-pressed="false"
            aria-busy="false"
          >
            <span class="mode-button__check" aria-hidden="true">✓</span>
            <span class="mode-button__icon-box" aria-hidden="true">
              <span class="mode-button__icon">🔤</span>
              <span class="mode-button__spinner" aria-hidden="true"></span>
            </span>
            <span class="mode-button__text">
              <span class="mode-button__label">Buchstaben</span>
              <span class="mode-button__hint">Wort füllen</span>
            </span>
            <span
              class="mode-button__online-icon"
              role="img"
              aria-label="Benötigt Internetverbindung"
              >🌐</span
            >
          </button>
        </div>
        <p
          class="mode-picker__hint"
          role="status"
          aria-live="polite"
          hidden
        ></p>
      </div>

      <div class="difficulty-picker-row">
        <h2 id="difficulty-picker-label" class="difficulty-picker__label">
          2 · Wie schwer soll das Spiel sein?
        </h2>
        <div
          class="difficulty-picker"
          role="group"
          aria-labelledby="difficulty-picker-label"
        >
          ${DIFFICULTY_OPTIONS.map(
            (option) => `
            <button
              type="button"
              class="difficulty-button k-btn"
              data-difficulty="${option.value}"
              aria-pressed="false"
            >
              <span class="difficulty-button__check" aria-hidden="true">✓</span>
              <span class="difficulty-button__label">${option.label}</span>
              <span class="difficulty-button__hint">${option.hint}</span>
            </button>
          `,
          ).join("")}
        </div>
      </div>

      <div class="round-length-picker">
        <h2 id="round-length-label" class="round-length-picker__label">
          3 · Wie viele Fragen möchtest du beantworten?
        </h2>
        <div
          class="round-length-chip-group"
          role="group"
          aria-labelledby="round-length-label"
        >
          ${ROUND_LENGTH_OPTIONS.map(
            (value) => `
            <button
              type="button"
              class="round-length-chip k-btn${
                value === DEFAULT_ROUND_LENGTH
                  ? " round-length-chip--selected"
                  : ""
              }"
              data-round-length="${value}"
              aria-pressed="${value === DEFAULT_ROUND_LENGTH}"
            >${value} Fragen</button>
          `,
          ).join("")}
        </div>
      </div>

      <button type="button" class="start-button k-btn" disabled>Los geht's! 🚀</button>
    </section>
  `;

  // Issue #87 richtete die Kartenzeile (`.start-cards`, "Mein Maskottchen"
  // / "Meine Sammlung") als reinen Layout-Rahmen ein. Issue #88 füllte die
  // linke Karte mit der echten Bühne + dem neuen navControl.js-Element
  // (siehe renderMascotStageCardMarkup() oben). Issue #89 füllt jetzt die
  // rechte Karte mit dem echten 50-Maskottchen-Raster
  // (renderCollectionCardMarkup() oben, ersetzt die bisherige Album-Vorschau
  // vollständig -- #91 entfernt album.js selbst) plus dem start-spezifischen
  // Sterne-Badge darunter.
  //
  // Zwei getrennte Render-Funktionen (Maskottchen-Karte / Sammlungs-Karte)
  // statt einer gemeinsamen `renderSideSection()` wie zuvor: beide Karten
  // haben jetzt unabhängigen, eigenen lokalen/persistenten Navigations-
  // Zustand (`activeIdx` in progress.js vs. `colPage` rein lokal, s. o.) --
  // ein Pfeil-Klick in der einen Karte muss die andere nicht unnötig neu
  // rendern.
  const mascotCardBodyEl = container.querySelector("[data-mascot-card-body]");
  const collectionCardBodyEl = container.querySelector(
    "[data-collection-card-body]",
  );
  const starBadgeRowEl = container.querySelector("[data-star-badge-row]");

  function renderMascotCard() {
    const progress = loadProgress();
    mascotCardBodyEl.innerHTML = renderMascotStageCardMarkup(progress);

    // Doppel-Tap-Robustheit (architecture.md, Punkt 3): onPrev/onNext lesen
    // hier bewusst JEDES MAL frisch über loadProgress(), statt die oben
    // bereits geladene `progress`-Variable (eine potenziell veraltete
    // Kopie) wiederzuverwenden -- kein Debounce/Timeout dazwischen, danach
    // sofortiges Neu-Rendern (inkl. Neu-Verdrahten frischer Buttons), damit
    // ein zweiter, schnell folgender Klick garantiert den bereits durch den
    // ersten Klick geschriebenen Stand liest.
    wireNavControl(mascotCardBodyEl, {
      onPrev: () => {
        const { activeIdx } = loadProgress();
        setActiveIdx(activeIdx - 1);
        renderMascotCard();
      },
      onNext: () => {
        const { activeIdx } = loadProgress();
        setActiveIdx(activeIdx + 1);
        renderMascotCard();
      },
    });
  }

  function renderCollectionCard() {
    const progress = loadProgress();
    collectionCardBodyEl.innerHTML = renderCollectionCardMarkup(
      progress,
      colPage,
    );

    // Doppel-Tap-Robustheit wie bei renderMascotCard() oben -- `colPage`
    // ist zwar rein lokaler UI-Zustand (kein loadProgress()-Neulesen nötig),
    // aber dieselbe Garantie gilt: onPrev/onNext schreiben/lesen direkt die
    // äußere `colPage`-Variable (keine beim Aufruf eingefangene Kopie),
    // danach sofortiges Neu-Rendern inkl. neu verdrahteter Buttons -- ein
    // zweiter, schnell folgender Klick liest damit garantiert den bereits
    // durch den ersten Klick aktualisierten Stand.
    wireNavControl(collectionCardBodyEl, {
      onPrev: () => {
        colPage = Math.max(0, colPage - 1);
        renderCollectionCard();
      },
      onNext: () => {
        colPage = Math.min(COLLECTION_PAGE_COUNT - 1, colPage + 1);
        renderCollectionCard();
      },
    });
  }

  // Issue #89: start-spezifisches Sterne-Badge -- einmalig beim Aufbau des
  // Bildschirms gerendert (gleiches Prinzip wie header.js: main.js ruft
  // renderHeader() einmal pro Navigation auf, kein Live-Update *innerhalb*
  // eines Bildschirms nötig). Der Sternestand ändert sich hier nur über die
  // Maskottchen-Auswahl (onOpenMascotChooser), die main.js beim Rücksprung
  // ohnehin per komplett frischem renderStartScreen()-Aufruf neu aufbaut.
  function renderStarBadge() {
    const progress = loadProgress();
    const { stars } = progress;
    const canRedeem = canRedeemMascot(progress);
    starBadgeRowEl.innerHTML = renderStartStarBadgeMarkup({
      stars,
      canRedeem,
    });

    if (canRedeem) {
      const badgeButton = starBadgeRowEl.querySelector(".start-star-badge");
      badgeButton?.addEventListener("click", () => {
        onOpenMascotChooser?.();
      });
    }
  }

  renderMascotCard();
  renderCollectionCard();
  renderStarBadge();

  const modeButtons = Array.from(container.querySelectorAll(".mode-button"));
  const quizModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.QUIZ}"]`,
  );
  const reverseModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.REVERSE}"]`,
  );
  const reverseModeLabelEl = reverseModeButton.querySelector(
    ".mode-button__label",
  );
  const soundModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.SOUND}"]`,
  );
  const soundModeLabelEl = soundModeButton.querySelector(".mode-button__label");
  const letterSearchModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.LETTER_SEARCH}"]`,
  );
  const letterSearchModeLabelEl = letterSearchModeButton.querySelector(
    ".mode-button__label",
  );
  const memoryModeButton = container.querySelector(
    `[data-mode="${GAME_MODE.MEMORY}"]`,
  );
  const memoryModeLabelEl = memoryModeButton.querySelector(
    ".mode-button__label",
  );
  const modeHintEl = container.querySelector(".mode-picker__hint");

  const difficultyButtons = Array.from(
    container.querySelectorAll(".difficulty-button"),
  );
  const roundLengthPickerEl = container.querySelector(".round-length-picker");
  const roundLengthChips = Array.from(
    container.querySelectorAll(".round-length-chip"),
  );
  const startButton = container.querySelector(".start-button");

  // Markiert genau eine Kachel als ausgewählt (Häkchen + aria-pressed, nicht
  // nur Farbe — siehe design.md, "Barrierefreiheit", "Keine ausschließlich
  // farbbasierte Codierung"), analog zum Schwierigkeitsstufen-Picker unten.
  function setSelectedMode(mode) {
    modeButtons.forEach((button) => {
      const isSelected = button.dataset.mode === mode;
      button.classList.toggle("mode-button--selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function hideModeHint() {
    modeHintEl.hidden = true;
    modeHintEl.textContent = "";
  }

  function showModeHint(message) {
    modeHintEl.textContent = message;
    modeHintEl.hidden = false;
  }

  // Ladezustand-Anzeige direkt in der Kachel (design.md, "Finale
  // Leitplanken": "gleiches Muster wie der bestehende 'Bild zeigen'-Button-
  // Ladezustand") — kein Vollbild-Spinner, keine Sperre der übrigen
  // Bedienung während des Testabrufs.
  function setReverseModeBusy(isBusy) {
    reverseModeButton.disabled = isBusy;
    reverseModeButton.setAttribute("aria-busy", String(isBusy));
    reverseModeLabelEl.textContent = isBusy ? "Wird geprüft …" : "Wer bin ich?";
  }

  // Identisches Ladezustand-Muster wie setReverseModeBusy oben (Issue #31,
  // design.md-Vorgabe "identisches Muster wie bei 'Wer bin ich?'"). Seit
  // Issue #87: Label-Text auf der Kachel selbst ist "Tierlaute" (Kurzlabel
  // aus der neuen Handoff-Datei, vermeidet Mitten-im-Wort-Umbruch in der
  // schmaleren Einzeilen-Kachel -- die Kopfzeilen-Modus-Pille aus header.js
  // bleibt bewusst unverändert bei "Tiergeräusche", andere Anzeigeort/nicht
  // Teil dieser Story).
  function setSoundModeBusy(isBusy) {
    soundModeButton.disabled = isBusy;
    soundModeButton.setAttribute("aria-busy", String(isBusy));
    soundModeLabelEl.textContent = isBusy ? "Wird geprüft …" : "Tierlaute";
  }

  // Identisches Ladezustand-Muster wie oben (Issue #46). Seit Issue #87:
  // Kurzlabel "Buchstaben" (dieselbe Kurzform, die header.js für die
  // Kopfzeilen-Modus-Pille bereits verwendet, siehe HEADER_MODE_LABELS).
  function setLetterSearchModeBusy(isBusy) {
    letterSearchModeButton.disabled = isBusy;
    letterSearchModeButton.setAttribute("aria-busy", String(isBusy));
    letterSearchModeLabelEl.textContent = isBusy
      ? "Wird geprüft …"
      : "Buchstaben";
  }

  // Identisches Ladezustand-Muster wie oben (Issue #45).
  function setMemoryModeBusy(isBusy) {
    memoryModeButton.disabled = isBusy;
    memoryModeButton.setAttribute("aria-busy", String(isBusy));
    memoryModeLabelEl.textContent = isBusy ? "Wird geprüft …" : "Tier-Memory";
  }

  // Issue #45: Fragenanzahl-Auswahl gilt nicht für Tier-Memory (kein dritter
  // Auswahlschritt, siehe Datei-Kommentar oben) — Sichtbarkeit wird bei jedem
  // Moduswechsel neu gesetzt statt nur einmalig, damit ein Zurückwechseln zu
  // "Quizfragen"/"Wer bin ich?"/"Tiergeräusche" die Sektion zuverlässig
  // wieder einblendet.
  function setRoundLengthPickerVisible(visible) {
    roundLengthPickerEl.hidden = !visible;
  }

  quizModeButton.addEventListener("click", () => {
    hideModeHint();
    selectedMode = GAME_MODE.QUIZ;
    // Ein evtl. vorhandenes Testabruf-Ergebnis gehört nur zum jeweiligen
    // Modus -- verwerfen, sobald das Kind zurück zu "Quizfragen" wechselt,
    // damit es nicht versehentlich bei einem späteren erneuten Wechsel
    // wiederverwendet wird (dort läuft ohnehin ein frischer Testabruf).
    pendingReverseQuestion = null;
    pendingSoundQuestion = null;
    pendingMemoryDeck = null;
    pendingMemoryDeckDifficulty = null;
    pendingLetterSearchQuestion = null;
    setSelectedMode(GAME_MODE.QUIZ);
    setRoundLengthPickerVisible(true);
  });

  // requestId-Muster gegen veraltete Antworten bei schnellem Doppel-Tap,
  // analog zu imageHintRequestId in question.js.
  let reverseModeRequestId = 0;

  reverseModeButton.addEventListener("click", async () => {
    hideModeHint();
    const requestId = ++reverseModeRequestId;
    setReverseModeBusy(true);

    try {
      // Testabruf = erster Aufruf von generateNextReverseQuestion für Frage 1
      // der Runde (siehe Datei-Kommentar oben). Die Schwierigkeitsstufe ist an
      // dieser Stelle im Bildschirm-Ablauf ggf. noch nicht gewählt (Modus-
      // Auswahl steht laut design.md bewusst ÜBER der Stufen-Auswahl), EASY
      // dient hier als sinnvoller Platzhalter, falls noch keine gewählt ist.
      // `animalsData.animals` (nicht das rohe Import-Objekt) — gleiche
      // Entpackung wie in question.js, da data/animals.json ein
      // Metadaten-Wrapper ({ schema_version, license, ..., animals: [...] })
      // um die eigentliche Tierliste ist.
      // Seit Issue #28: das Ergebnis wird nicht mehr verworfen, sondern als
      // bereits fertig aufgelöste Frage 1 der Runde zwischengespeichert (siehe
      // Datei-Kommentar oben) statt sie beim Rundenstart ein zweites Mal
      // abzurufen.
      const question = await generateNextReverseQuestion(
        animalsData.animals,
        new Set(),
        selectedDifficulty ?? DIFFICULTY_LEVELS.EASY,
      );

      if (requestId !== reverseModeRequestId) return;
      pendingReverseQuestion = question;
      selectedMode = GAME_MODE.REVERSE;
      setSelectedMode(GAME_MODE.REVERSE);
      // Falls zuvor Tier-Memory/Buchstabensuche gewählt war (Issue #45/#46):
      // deren zwischengespeichertes Ergebnis gehört nicht mehr zum jetzt
      // gewählten Modus, und die Fragenanzahl-Auswahl gilt für diesen Modus
      // wieder normal.
      pendingMemoryDeck = null;
      pendingMemoryDeckDifficulty = null;
      pendingLetterSearchQuestion = null;
      setRoundLengthPickerVisible(true);
    } catch {
      if (requestId !== reverseModeRequestId) return;
      // Kindgerechtes, nicht-technisches Abfangen (design.md/Issue #26
      // Akzeptanzkriterium): Auswahl bleibt bei "Quizfragen", egal ob der
      // Fehlschlag von fehlendem Internet oder (aktuell immer, solange #27
      // offen ist) vom noch fehlenden Generator kommt.
      pendingReverseQuestion = null;
      selectedMode = GAME_MODE.QUIZ;
      setSelectedMode(GAME_MODE.QUIZ);
      setRoundLengthPickerVisible(true);
      showModeHint("Dafür brauchst du gerade Internet 🌐");
    } finally {
      if (requestId === reverseModeRequestId) {
        setReverseModeBusy(false);
      }
    }
  });

  // requestId-Muster wie beim "Wer bin ich?"-Handler oben, aber ein eigener
  // Zähler — jede Kachel schützt sich nur gegen ihre eigenen veralteten
  // Antworten, ganz wie die beiden Kacheln bereits unabhängig voneinander
  // ihren jeweiligen Ladezustand verwalten.
  let soundModeRequestId = 0;

  soundModeButton.addEventListener("click", async () => {
    hideModeHint();
    const requestId = ++soundModeRequestId;
    setSoundModeBusy(true);

    try {
      // Testabruf = erster Aufruf von generateNextSoundQuestion für Frage 1
      // der Runde (Issue #31 Akzeptanzkriterium: "identisch mit dem ersten
      // Aufruf der neuen Fragegenerierungs-Funktion aus #32"). Der
      // Fehlerfall unten greift bei echtem Netzwerk-/Ladefehler (kein
      // Tier mit Audio erreichbar innerhalb der internen Retries aus #32).
      const question = await generateNextSoundQuestion(
        animalsData.animals,
        new Set(),
        selectedDifficulty ?? DIFFICULTY_LEVELS.EASY,
      );

      if (requestId !== soundModeRequestId) return;
      // Seit Issue #33 (Audio-Player-Bildschirm existiert jetzt): das
      // Ergebnis wird wie bei pendingReverseQuestion oben zwischengespeichert
      // statt es beim Rundenstart ein zweites Mal abzurufen.
      pendingSoundQuestion = question;
      selectedMode = GAME_MODE.SOUND;
      setSelectedMode(GAME_MODE.SOUND);
      // Siehe reverseModeButton-Handler oben: Modus gewechselt weg von
      // Tier-Memory/Buchstabensuche -> deren zwischengespeicherte Ergebnisse
      // verwerfen, Fragenanzahl-Auswahl wieder einblenden.
      pendingMemoryDeck = null;
      pendingMemoryDeckDifficulty = null;
      pendingLetterSearchQuestion = null;
      setRoundLengthPickerVisible(true);
    } catch {
      if (requestId !== soundModeRequestId) return;
      // Kindgerechtes, nicht-technisches Abfangen, identisch zum "Wer bin
      // ich?"-Fehlerfall oben (design.md/Issue #31 Akzeptanzkriterium):
      // Auswahl bleibt bei "Quizfragen".
      pendingSoundQuestion = null;
      selectedMode = GAME_MODE.QUIZ;
      setSelectedMode(GAME_MODE.QUIZ);
      setRoundLengthPickerVisible(true);
      showModeHint("Dafür brauchst du gerade Internet 🌐");
    } finally {
      if (requestId === soundModeRequestId) {
        setSoundModeBusy(false);
      }
    }
  });

  // requestId-Muster wie bei den beiden Handlern oben (Issue #45).
  let memoryModeRequestId = 0;

  memoryModeButton.addEventListener("click", async () => {
    hideModeHint();
    const requestId = ++memoryModeRequestId;
    setMemoryModeBusy(true);

    try {
      // Testabruf = Aufbau des kompletten Kartensets für die aktuell
      // gewählte (oder mangels Auswahl per EASY-Platzhalter angenommene)
      // Schwierigkeitsstufe (architecture.md: "der Deck-Aufbau ist der
      // Testabruf"). Wird beim Rundenstart wiederverwendet, sofern die
      // Schwierigkeitsstufe bis dahin unverändert bleibt (siehe
      // pendingMemoryDeckDifficulty-Vergleich in memory.js).
      const difficultyForTestFetch = selectedDifficulty ?? DIFFICULTY_LEVELS.EASY;
      const deck = await buildMemoryDeck(
        animalsData.animals,
        difficultyForTestFetch,
      );

      if (requestId !== memoryModeRequestId) return;
      pendingMemoryDeck = deck;
      pendingMemoryDeckDifficulty = difficultyForTestFetch;
      selectedMode = GAME_MODE.MEMORY;
      setSelectedMode(GAME_MODE.MEMORY);
      // Siehe reverseModeButton-Handler oben: ein evtl. vorhandenes
      // Buchstabensuche-Testabruf-Ergebnis gehört nicht mehr zum jetzt
      // gewählten Modus.
      pendingLetterSearchQuestion = null;
      // Issue #45 Akzeptanzkriterium: kein Fragenanzahl-Auswahlschritt für
      // diesen Modus.
      setRoundLengthPickerVisible(false);
    } catch {
      if (requestId !== memoryModeRequestId) return;
      // Kindgerechtes, nicht-technisches Abfangen, identisch zu den übrigen
      // Fehlerfällen: Auswahl bleibt bei "Quizfragen".
      pendingMemoryDeck = null;
      pendingMemoryDeckDifficulty = null;
      selectedMode = GAME_MODE.QUIZ;
      setSelectedMode(GAME_MODE.QUIZ);
      setRoundLengthPickerVisible(true);
      showModeHint("Dafür brauchst du gerade Internet 🌐");
    } finally {
      if (requestId === memoryModeRequestId) {
        setMemoryModeBusy(false);
      }
    }
  });

  // requestId-Muster wie bei den übrigen Kacheln oben, eigener Zähler (Issue
  // #46).
  let letterSearchModeRequestId = 0;

  letterSearchModeButton.addEventListener("click", async () => {
    hideModeHint();
    const requestId = ++letterSearchModeRequestId;
    setLetterSearchModeBusy(true);

    try {
      // Testabruf = erster Aufruf von generateNextLetterSearchQuestion für
      // Frage 1 der Runde (architecture.md, Punkt 2). Anders als bei "Wer bin
      // ich?"/"Tiergeräusche" braucht dieser Aufruf keine Schwierigkeitsstufe
      // (siehe letterSearchQuestionGenerator.js, Datei-Kommentar).
      const question = await generateNextLetterSearchQuestion(
        animalsData.animals,
        new Set(),
      );

      if (requestId !== letterSearchModeRequestId) return;
      pendingLetterSearchQuestion = question;
      selectedMode = GAME_MODE.LETTER_SEARCH;
      setSelectedMode(GAME_MODE.LETTER_SEARCH);
      // Siehe reverseModeButton-Handler oben: ein evtl. vorhandenes
      // Tier-Memory-Testabruf-Ergebnis gehört nicht mehr zum jetzt gewählten
      // Modus, und dieser Modus nutzt (anders als Tier-Memory) die reguläre
      // Fragenanzahl-Auswahl wieder normal (architecture.md, "Buchstabensuche":
      // "behält die reguläre Rundenstruktur ... mit wählbarer Fragenanzahl").
      pendingMemoryDeck = null;
      pendingMemoryDeckDifficulty = null;
      setRoundLengthPickerVisible(true);
    } catch {
      if (requestId !== letterSearchModeRequestId) return;
      // Kindgerechtes, nicht-technisches Abfangen, identisch zu den übrigen
      // Fehlerfällen (design.md/Akzeptanzkriterium): Auswahl bleibt bei
      // "Quizfragen".
      pendingLetterSearchQuestion = null;
      selectedMode = GAME_MODE.QUIZ;
      setSelectedMode(GAME_MODE.QUIZ);
      setRoundLengthPickerVisible(true);
      showModeHint("Dafür brauchst du gerade Internet 🌐");
    } finally {
      if (requestId === letterSearchModeRequestId) {
        setLetterSearchModeBusy(false);
      }
    }
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedDifficulty = button.dataset.difficulty;

      difficultyButtons.forEach((otherButton) => {
        const isSelected = otherButton === button;
        otherButton.classList.toggle("difficulty-button--selected", isSelected);
        otherButton.setAttribute("aria-pressed", String(isSelected));
      });

      startButton.disabled = false;
    });
  });

  // Fragenanzahl ist kein Pflichtschritt (siehe Datei-Kommentar oben): schon
  // beim Rendern ist ein Chip (Standardwert) als ausgewählt markiert, der
  // Start-Button hängt nicht von einer Interaktion hier ab.
  roundLengthChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      selectedRoundLength = Number(chip.dataset.roundLength);

      roundLengthChips.forEach((otherChip) => {
        const isSelected = otherChip === chip;
        otherChip.classList.toggle("round-length-chip--selected", isSelected);
        otherChip.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });

  startButton.addEventListener("click", () => {
    if (!selectedDifficulty) {
      return;
    }

    const quizState = createQuizState(
      selectedDifficulty,
      [],
      selectedRoundLength,
      selectedMode,
    );

    // Seit Issue #28/#33: die bereits fertig aufgelöste erste Frage (aus dem
    // erfolgreichen Testabruf oben) wird als transientes Feld mitgegeben --
    // reverseQuestion.js/soundQuestion.js lesen/löschen es beim ersten
    // Rendern (siehe jeweiliger Datei-Kommentar) statt sie ein zweites Mal
    // abzurufen. Ist aus irgendeinem Grund keine vorhanden (z. B. Modus
    // wurde ohne vorherigen Testabruf-Erfolg gesetzt), holt sich der
    // jeweilige Bildschirm Frage 1 einfach ganz normal selbst -- kein
    // Absturz.
    if (selectedMode === GAME_MODE.REVERSE && pendingReverseQuestion) {
      quizState.pendingReverseQuestion = pendingReverseQuestion;
    }
    if (selectedMode === GAME_MODE.SOUND && pendingSoundQuestion) {
      quizState.pendingSoundQuestion = pendingSoundQuestion;
    }
    // Issue #45: analoges Wiederverwendungsfeld für Tier-Memory — memory.js
    // prüft beim Rendern zusätzlich, ob pendingMemoryDeckDifficulty noch zur
    // tatsächlich gewählten Schwierigkeitsstufe passt (siehe Datei-Kommentar
    // oben), baut sonst selbst ein frisches Deck.
    if (selectedMode === GAME_MODE.MEMORY && pendingMemoryDeck) {
      quizState.pendingMemoryDeck = pendingMemoryDeck;
      quizState.pendingMemoryDeckDifficulty = pendingMemoryDeckDifficulty;
    }
    if (
      selectedMode === GAME_MODE.LETTER_SEARCH &&
      pendingLetterSearchQuestion
    ) {
      quizState.pendingLetterSearchQuestion = pendingLetterSearchQuestion;
    }

    onStart?.(quizState);
  });
}
