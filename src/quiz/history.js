// Lokale Verlaufsliste der letzten Quiz-Ergebnisse (Issue #14, erweitert um
// Modus-Feld + Lösch-Funktionen in Issue #36). Speichert pro Rundenende einen
// Eintrag in `localStorage` und liefert die gespeicherte Liste für den
// Ergebnis-Bildschirm (src/screens/result.js) zurück.
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
// Seit Issue #36 (Abstimmung mit `software-architect`, 15.08.2026) zusätzlich:
// `id` (eindeutiger Schlüssel je Eintrag, nötig zum gezielten Löschen —
// `date` ist nicht hart eindeutig, ein Array-Index verschiebt sich beim
// Löschen) sowie optionales `mode` (`"quiz"`/`"reverse"`/`"sound"`, siehe
// src/quiz/mode.js). Alt-Einträge ohne `id` bekommen beim Einlesen einmalig
// eine ergänzt (siehe `ensureEntryIds` unten) und werden der Einfachheit
// halber gleich zurückgeschrieben — unschädlich laut Architektur-Abstimmung,
// macht IDs aber über mehrere Aufrufe hinweg stabil (wichtig für gezieltes
// Löschen). Ein fehlendes `mode`-Feld wird bewusst **nicht** beim Einlesen
// geschrieben, sondern ausschließlich auf Anzeige-Ebene in `result.js` als
// "Quizfragen" interpretiert (siehe dortige Kommentare).
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
 * Erzeugt eine möglichst eindeutige ID für einen neuen oder migrierten
 * Verlaufseintrag (Issue #36). Nutzt `crypto.randomUUID()`, falls verfügbar;
 * Fallback auf Zeitstempel+Zufallszahl für ältere Umgebungen ohne diese API.
 * Kollisionen sind bei dieser kleinen Datenmenge (max. MAX_HISTORY_ENTRIES
 * Einträge) praktisch ausgeschlossen, ein kryptografisch harter Anspruch
 * besteht hier nicht (reiner Lösch-Schlüssel, kein Sicherheitsmerkmal).
 * @returns {string}
 */
function generateEntryId() {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // Zugriff auf crypto kann in seltenen Umgebungen selbst werfen — Fallback
    // unten greift dann einfach.
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Ergänzt fehlende `id`-Felder bei Alt-Einträgen (vor Issue #36 gespeichert)
 * einmalig beim Einlesen, ohne sonstige Felder (insbesondere `mode`) zu
 * verändern. Nicht-Objekt-Einträge (kaputte/fremde Daten) werden defensiv als
 * leeres Objekt behandelt statt zu werfen.
 * @param {unknown[]} entries
 * @returns {{entries: object[], changed: boolean}} `changed` zeigt an, ob
 *   mindestens eine ID neu vergeben wurde (Signal für ein lohnendes
 *   Zurückschreiben, siehe loadResultHistory).
 */
function ensureEntryIds(entries) {
  let changed = false;
  const withIds = entries.map((entry) => {
    const safeEntry = entry && typeof entry === "object" ? entry : {};
    if (typeof safeEntry.id === "string" && safeEntry.id) return safeEntry;
    changed = true;
    return { ...safeEntry, id: generateEntryId() };
  });
  return { entries: withIds, changed };
}

/**
 * Liest die gespeicherte Verlaufsliste, neueste zuerst. Liefert bei
 * fehlendem/blockiertem `localStorage` oder kaputten/fremden Daten einfach
 * ein leeres Array statt zu werfen oder abzustürzen. Ergänzt fehlende `id`-
 * Felder bei Alt-Einträgen (Issue #36) und schreibt die Liste in diesem Fall
 * zurück, damit die IDs über mehrere Aufrufe hinweg stabil bleiben (wichtig
 * für gezieltes Löschen). Ein fehlendes `mode`-Feld bleibt bewusst
 * unangetastet — der Anzeige-Fallback dafür lebt in `result.js`.
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{id: string, date: string, score: number, total: number, difficulty: string, mode?: string}[]}
 */
export function loadResultHistory(storage) {
  const target = resolveStorage(storage);
  if (!target) return [];

  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const { entries, changed } = ensureEntryIds(parsed);
    if (changed) {
      try {
        target.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch {
        // Zurückschreiben ist ein Best-Effort-Komfort (siehe Datei-Kommentar
        // oben) — schlägt es fehl, liefern wir trotzdem die im
        // Arbeitsspeicher ergänzte Liste statt abzustürzen.
      }
    }
    return entries;
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
 * @param {string} [result.mode] Spielmodus (siehe src/quiz/mode.js), optional
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{id: string, date: string, score: number, total: number, difficulty: string, mode?: string}[] | null}
 */
export function saveResultToHistory({ score, total, difficulty, mode }, storage) {
  const target = resolveStorage(storage);
  if (!target) return null;

  try {
    const existing = loadResultHistory(target);
    const entry = {
      id: generateEntryId(),
      date: new Date().toISOString(),
      score,
      total,
      difficulty,
      mode,
    };
    const updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
    target.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

/**
 * Entfernt genau einen Verlaufseintrag anhand seiner `id` (Issue #36,
 * einzelnes Lösch-Steuerelement pro Eintrag, ohne Bestätigung). Fehlertolerant
 * wie die übrigen Funktionen: bei blockiertem/fehlendem `localStorage` oder
 * sonstigen Fehlern wird `null` geliefert statt zu werfen.
 * @param {string} id ID des zu löschenden Eintrags (siehe `id`-Feld)
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{id: string, date: string, score: number, total: number, difficulty: string, mode?: string}[] | null}
 */
export function deleteHistoryEntry(id, storage) {
  const target = resolveStorage(storage);
  if (!target) return null;

  try {
    const existing = loadResultHistory(target);
    const updated = existing.filter((entry) => entry.id !== id);
    target.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

/**
 * Entfernt die gesamte Verlaufsliste (Issue #36, "Alle Ergebnisse löschen",
 * mit Bestätigung durch den Aufrufer in result.js). Fehlertolerant wie die
 * übrigen Funktionen.
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {[] | null}
 */
export function clearResultHistory(storage) {
  const target = resolveStorage(storage);
  if (!target) return null;

  try {
    target.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch {
    return null;
  }
}
