// Lokale Verlaufsliste der letzten Quiz-Ergebnisse (Issue #14). Speichert
// pro Rundenende einen Eintrag in `localStorage` und liefert die gespeicherte
// Liste für den Ergebnis-Bildschirm (src/screens/result.js) zurück.
//
// Abstimmung mit `software-architect` (siehe Issue #14, Kommentar 13.08.2026):
// `localStorage` ist die einfachste passende Lösung für dieses kleine
// Vanilla-JS/Vite-Projekt (kein Backend, kein IndexedDB). Minimal-Datenmodell
// pro Eintrag: `date`, `score` (Anzahl richtiger Antworten), `total`
// (Fragenanzahl der Runde — seit Issue #13 variabel über `roundLength`,
// siehe state.js), `difficulty`. Bewusst **rohe** Werte (score+total statt
// vorab berechneter Prozentzahl), da unterschiedliche Rundenlängen sonst
// nicht ohne Weiteres fair vergleichbar wären.
//
// `localStorage` kann fehlen oder blockiert sein (z. B. Safari Private Mode)
// — jeder Zugriff ist deshalb in try/catch gekapselt. Bei Fehlschlag wird das
// Feature einfach nicht angeboten (leeres Array / `null`), kein Absturz,
// keine technische Fehlermeldung im Kind-UI (Akzeptanzkriterium Issue #14).
//
// Rein lokale Verlaufsliste auf diesem Gerät — kein geräteübergreifender
// Abgleich, kein Nutzerkonto (siehe requirements.md, "Explizit außerhalb des
// Scopes", Ergänzung 13.08.2026).

const STORAGE_KEY = "tierquiz-kinder:result-history";

// PM-Entscheidung 13.08.2026 (Issue #14, Kommentar): Verlaufsliste zeigt die
// letzten 5 Versuche.
export const MAX_HISTORY_ENTRIES = 5;

/** Liefert die zu nutzende Storage-Implementierung: übergebener Parameter
 * (v. a. für Tests) oder das globale `localStorage`, falls vorhanden. Der
 * Zugriff auf `localStorage` selbst kann bereits werfen (manche Browser
 * blockieren den Zugriff komplett) — deshalb ebenfalls in try/catch. */
function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Liest die gespeicherte Verlaufsliste, neueste zuerst. Liefert bei
 * fehlendem/blockiertem `localStorage` oder kaputten/fremden Daten einfach
 * ein leeres Array statt zu werfen oder abzustürzen.
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{date: string, score: number, total: number, difficulty: string}[]}
 */
export function loadResultHistory(storage) {
  const target = resolveStorage(storage);
  if (!target) return [];

  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Speichert ein neues Rundenergebnis am Anfang der Verlaufsliste (neueste
 * zuerst) und kappt sie auf MAX_HISTORY_ENTRIES Einträge. Fehlertolerant:
 * bei fehlendem/blockiertem `localStorage` passiert einfach nichts (kein
 * Absturz) und der Rückgabewert ist `null` statt der aktualisierten Liste —
 * der Aufrufer (result.js) blendet die Verlaufsliste dann einfach aus.
 * @param {object} result
 * @param {number} result.score Anzahl richtig beantworteter Fragen
 * @param {number} result.total Fragenanzahl der Runde
 * @param {string} result.difficulty Schwierigkeitsstufe (siehe DIFFICULTY_LEVELS)
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{date: string, score: number, total: number, difficulty: string}[] | null}
 */
export function saveResultToHistory({ score, total, difficulty }, storage) {
  const target = resolveStorage(storage);
  if (!target) return null;

  try {
    const existing = loadResultHistory(target);
    const entry = {
      date: new Date().toISOString(),
      score,
      total,
      difficulty,
    };
    const updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
    target.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}
