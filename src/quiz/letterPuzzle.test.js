// Tests für src/quiz/letterPuzzle.js (Issue #46: Lücken-Berechnung für den
// "Buchstabensuche"-Modus). Reine Logik-Tests, keine Fixture-Tierliste nötig
// (analog zu difficulty.test.js) — buildLetterPuzzle kennt weder DOM noch
// data/animals.json.

import { describe, it, expect } from "vitest";
import { buildLetterPuzzle } from "./letterPuzzle.js";
import { DIFFICULTY_LEVELS } from "./difficulty.js";

// Hilfsfunktion: reduziert das Ergebnis auf eine kompakte, gut lesbare Form
// für Assertions, z. B. "G,r,o,ß,e,r" -> "G-o-ß-r" (given) vs. Lücken.
function typesOf(puzzle) {
  return puzzle.map((entry) => entry.type);
}
function charsOf(puzzle) {
  return puzzle.map((entry) => entry.char);
}

describe("buildLetterPuzzle", () => {
  it("liefert für einen einteiligen Namen (Einfach) je Eintrag char+type, Zeichen in Originalreihenfolge", () => {
    // "Rotkehlchen" -- 11 Buchstaben, Einfach = jeder 3. Buchstabe Lücke
    // (Positionen 3, 6, 9), aber erster (Pos 1) und letzter (Pos 11) Buchstabe
    // immer given -- hier ohnehin nicht von der Modulo-Regel betroffen.
    const puzzle = buildLetterPuzzle("Rotkehlchen", DIFFICULTY_LEVELS.EASY);

    expect(charsOf(puzzle).join("")).toBe("Rotkehlchen");
    expect(typesOf(puzzle)).toEqual([
      "given", // R (1)
      "given", // o (2)
      "blank", // t (3)
      "given", // k (4)
      "given", // e (5)
      "blank", // h (6)
      "given", // l (7)
      "given", // c (8)
      "blank", // h (9)
      "given", // e (10)
      "given", // n (11, letzter Buchstabe -> immer given)
    ]);
  });

  it("liefert für einen einteiligen Namen (Knifflig) jeden 2. Buchstaben als Lücke, nur der erste Buchstabe ist fix given", () => {
    // "Adler" -- 5 Buchstaben, Knifflig = jeder 2. Buchstabe Lücke (Pos 2, 4),
    // nur Pos 1 ist fix given (Pos 5 unterliegt der Modulo-Regel normal).
    const puzzle = buildLetterPuzzle("Adler", DIFFICULTY_LEVELS.HARD);

    expect(typesOf(puzzle)).toEqual([
      "given", // A (1, erster Buchstabe -> immer given)
      "blank", // d (2)
      "given", // l (3)
      "blank", // e (4)
      "given", // r (5, unterliegt normal der Modulo-Regel, 5%2!==0)
    ]);
  });

  it("behandelt Leerzeichen in mehrteiligen Namen als separator, nie als Lücke, und startet die Zählung je Namensteil neu", () => {
    // "Großer Panda": "Großer" (6 Buchstaben) und "Panda" (5 Buchstaben),
    // Zählung jeweils bei 1 neu (Einfach: jeder 3. Buchstabe Lücke, außer
    // erster/letzter Buchstabe je Teil).
    const puzzle = buildLetterPuzzle("Großer Panda", DIFFICULTY_LEVELS.EASY);

    expect(charsOf(puzzle).join("")).toBe("Großer Panda");
    const separatorEntry = puzzle.find((entry) => entry.char === " ");
    expect(separatorEntry.type).toBe("separator");

    // "Großer": G(1,given) r(2,given) o(3,blank) ß(4,given) e(5,given) r(6,given,letzter)
    const grosserTypes = typesOf(puzzle.slice(0, 6));
    expect(grosserTypes).toEqual([
      "given",
      "given",
      "blank",
      "given",
      "given",
      "given",
    ]);

    // "Panda": P(1,given) a(2,given) n(3,blank) d(4,given) a(5,given,letzter)
    const pandaTypes = typesOf(puzzle.slice(7));
    expect(pandaTypes).toEqual(["given", "given", "blank", "given", "given"]);
  });

  it("behandelt Bindestriche ebenfalls als separator, nie als Lücke", () => {
    const puzzle = buildLetterPuzzle("Rot-Kehlchen", DIFFICULTY_LEVELS.HARD);

    const separatorEntry = puzzle.find((entry) => entry.char === "-");
    expect(separatorEntry.type).toBe("separator");
    expect(charsOf(puzzle).join("")).toBe("Rot-Kehlchen");
  });

  it("behandelt Umlaute/ß als normale einzelne Buchstaben (ein Eintrag je Zeichen, keine Verdopplung)", () => {
    const puzzle = buildLetterPuzzle("Wüste", DIFFICULTY_LEVELS.EASY);
    expect(puzzle).toHaveLength(5);
    expect(charsOf(puzzle)).toEqual(["W", "ü", "s", "t", "e"]);
  });

  it("sorgt bei einem sehr kurzen Namensteil (1 Buchstabe) automatisch für einen sichtbaren Anker (erster = letzter Buchstabe)", () => {
    // Einzelner Buchstabe: sowohl "erster" als auch "letzter" -> in beiden
    // Stufen immer given, unabhängig von der Modulo-Regel.
    const easy = buildLetterPuzzle("A", DIFFICULTY_LEVELS.EASY);
    expect(easy).toEqual([{ char: "A", type: "given" }]);

    const hard = buildLetterPuzzle("A", DIFFICULTY_LEVELS.HARD);
    expect(hard).toEqual([{ char: "A", type: "given" }]);
  });

  it("wirft bei unbekannter Schwierigkeitsstufe", () => {
    expect(() => buildLetterPuzzle("Löwe", "erwachsen")).toThrow(
      /Schwierigkeitsstufe/,
    );
  });

  it("wirft bei leerem/fehlendem Namen", () => {
    expect(() => buildLetterPuzzle("", DIFFICULTY_LEVELS.EASY)).toThrow(/name/);
    expect(() => buildLetterPuzzle(undefined, DIFFICULTY_LEVELS.EASY)).toThrow(
      /name/,
    );
  });
});
