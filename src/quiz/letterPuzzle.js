// Lücken-Berechnung für den "Buchstabensuche"-Modus (Issue #46). Reine,
// DOM-freie, deterministische Funktion (kein Zufall/kein rng-Parameter
// nötig, siehe architecture.md, "Neuer Spielmodus 'Buchstabensuche': Finale
// technische Leitplanken", Punkt 3) — dadurch vollständig unit-testbar ohne
// Mocking, analog zu difficulty.js/infoSentence.js. Kennt weder DOM noch
// data/animals.json, wird ausschließlich von src/screens/letterSearch.js
// aufgerufen, um für den gezogenen Tiernamen die Kästchen-Reihe zu bauen.
//
// Schnittstelle/Rückgabeform 1:1 aus architecture.md übernommen:
//
//   buildLetterPuzzle(name, difficulty)
//   -> [{ char: "G", type: "given" }, { char: "r", type: "blank" }, ...,
//       { char: " ", type: "separator" }, ...]
//
// Positionsregel je Namensteil (design.md, "Schwierigkeitsgrad = Anteil
// verdeckter Buchstaben"): Zählung startet bei jedem durch Leerzeichen/
// Bindestrich getrennten Namensteil neu bei 1 (nicht über den Gesamtnamen
// hinweg durchgezählt) — z. B. bei "Großer Panda" getrennt für "Großer" und
// "Panda". Einfach (6–10): jeder 3. Buchstabe ist eine Lücke, erster UND
// letzter Buchstabe jedes Namensteils sind immer vorgegeben. Knifflig
// (10–12): jeder 2. Buchstabe ist eine Lücke, NUR der erste Buchstabe jedes
// Namensteils ist immer vorgegeben. Der Erster-/Letzter-Buchstabe-Override
// wird laut architecture.md NACH der Modulo-Regel angewendet (Override hat
// Vorrang vor "type: blank" aus der Modulo-Berechnung) — bei sehr kurzen
// Namensteilen (1–2 Buchstaben) sorgt das automatisch für mindestens einen
// sichtbaren Anker, kein Sonderfall nötig (architecture.md).
//
// Umlaute/ß: werden wie normale Buchstaben behandelt (architecture.md: "je
// EIN char-Eintrag pro Unicode-Zeichen, kein Sonderfall" — deutsche Umlaute
// sind reguläre BMP-Zeichen, kein Surrogate-Pair-Risiko wie bei Emoji,
// Array.from() reicht für eine sichere Zeichen-für-Zeichen-Iteration).
//
// Leerzeichen/Bindestriche sind NIE Lücken (design.md/Akzeptanzkriterium) —
// sie werden als eigener "separator"-Eintragstyp geführt, damit
// letterSearch.js sie unverändert als sichtbares Trennzeichen zwischen den
// Kästchen-Gruppen rendern kann, ohne sie fälschlich als Buchstaben zu
// zählen.

import { DIFFICULTY_LEVELS } from "./difficulty.js";

// Nur Leerzeichen und Bindestrich trennen Namensteile (design.md: "Leerzeichen/
// Bindestriche in mehrteiligen Namen"). Andere Zeichen (z. B. Apostroph) kommen
// in den aktuellen Tiernamen nicht vor und werden hier bewusst nicht als
// Trenner behandelt, um nicht ungeprüft zu raten.
const SEPARATOR_PATTERN = /[ -]/;

function assertKnownDifficulty(difficulty) {
  if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    throw new Error(
      `buildLetterPuzzle: unbekannte Schwierigkeitsstufe "${difficulty}"`,
    );
  }
}

/**
 * Berechnet für einen Tiernamen die Lücken-Positionen einer Schwierigkeits-
 * stufe (siehe Datei-Kommentar oben für die vollständige Regel-Herleitung).
 * @param {string} name z. B. "Großer Panda" (animal.name_de)
 * @param {string} difficulty einer der Werte aus DIFFICULTY_LEVELS (difficulty.js)
 * @returns {{char: string, type: "given"|"blank"|"separator"}[]}
 */
export function buildLetterPuzzle(name, difficulty) {
  assertKnownDifficulty(difficulty);
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(
      "buildLetterPuzzle: name muss ein nicht-leerer String sein",
    );
  }

  // Jeder 3. Buchstabe (Einfach) bzw. jeder 2. Buchstabe (Knifflig) ist eine
  // Lücke (design.md-Tabelle).
  const modulo = difficulty === DIFFICULTY_LEVELS.HARD ? 2 : 3;

  const entries = [];
  let word = [];

  function flushWord() {
    if (word.length === 0) return;
    const wordLength = word.length;
    word.forEach((char, indexInWord) => {
      const positionInWord = indexInWord + 1; // Zählung startet bei 1 je Namensteil
      const isFirst = indexInWord === 0;
      const isLast = indexInWord === wordLength - 1;
      // Override-Reihenfolge laut architecture.md: erst Modulo-Regel, dann
      // Erster-/Letzter-Buchstabe-Override (Override gewinnt).
      const isModuloBlank = positionInWord % modulo === 0;
      const forceGiven =
        difficulty === DIFFICULTY_LEVELS.HARD ? isFirst : isFirst || isLast;
      entries.push({
        char,
        type: isModuloBlank && !forceGiven ? "blank" : "given",
      });
    });
    word = [];
  }

  // Array.from() statt String.prototype[Symbol.iterator] direkt, um explizit
  // zu machen, dass hier bewusst zeichenweise (nicht bytes-/UTF-16-Unit-
  // weise) iteriert wird -- für deutsche Umlaute/ß ohnehin ohne Unterschied
  // (siehe Datei-Kommentar oben), aber die klarere Absicht im Code.
  for (const char of Array.from(name)) {
    if (SEPARATOR_PATTERN.test(char)) {
      flushWord();
      entries.push({ char, type: "separator" });
    } else {
      word.push(char);
    }
  }
  flushWord();

  return entries;
}
