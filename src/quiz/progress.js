// Persistenz für das Sterne-/Maskottchen-Freischaltsystem (Issue #80, erster
// Teil eines 4-Story-Vorhabens #80-#83). Gleiches Muster wie src/quiz/
// album.js und src/quiz/history.js: eigener STORAGE_KEY, `resolveStorage`-
// Helper (dupliziert statt geteiltes Utility-Modul, siehe architecture.md,
// "Sterne-/Maskottchen-Freischaltsystem: Technische Leitplanken", Punkt 2),
// defensives JSON-Parsing, fehlertolerant bei blockiertem localStorage
// (Spiel bleibt vollständig spielbar, Sterne/Freischaltungen werden dann
// einfach nicht persistiert).
//
// Datenmodell bewusst **nur** { stars, unlockedIds, activeIdx } — KEIN
// eigenes `collected`-Feld. Das bereits gemergte src/quiz/album.js (Issue
// #68) bleibt die alleinige Quelle für gesammelte Tiere; ein zweites
// `collected`-Array hier wäre eine redundante zweite Quelle für dieselbe
// Information (siehe architecture.md für die vollständige Begründung, sowie
// requirements.md, "Ergänzung 21.08.2026: Sterne-/Maskottchen-
// Freischaltsystem"). Das im Nutzer-Handoff vorgeschlagene `collected`-Feld
// im progress.js-Beispielobjekt ist bewusst verworfen, nicht übernommen.
//
// `unlockedIds` wächst ausschließlich an (append-only, nie umsortiert oder
// gelöscht) — `activeIdx` referenziert deshalb stabil die Position
// INNERHALB von unlockedIds, nicht die Maskottchen-ID selbst.

import { GAME_MODE } from "./gameMode.js";

const STORAGE_KEY = "tierquiz-kinder:progress";

/** Start-Default: noch keine Sterne, nur das Start-Maskottchen (id 0 =
 * Fine der Fuchs) freigeschaltet und aktiv. */
const DEFAULT_PROGRESS = Object.freeze({
  stars: 0,
  unlockedIds: Object.freeze([0]),
  activeIdx: 0,
});

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
 * Defensives Parsing eines gespeicherten Rohwerts in ein gültiges
 * Progress-Objekt. Liefert bei fehlenden/kaputten/fremden Daten den
 * Default zurück statt zu werfen oder Teilobjekte mit falscher Form zu
 * übernehmen.
 * @param {unknown} raw
 * @returns {{stars: number, unlockedIds: number[], activeIdx: number}}
 */
function parseProgress(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      stars: DEFAULT_PROGRESS.stars,
      unlockedIds: [...DEFAULT_PROGRESS.unlockedIds],
      activeIdx: DEFAULT_PROGRESS.activeIdx,
    };
  }

  const stars = Number.isFinite(raw.stars) && raw.stars >= 0 ? raw.stars : 0;

  const unlockedIds = Array.isArray(raw.unlockedIds)
    ? raw.unlockedIds.filter((id) => Number.isInteger(id) && id >= 0)
    : [];
  const safeUnlockedIds = unlockedIds.length > 0 ? unlockedIds : [0];

  const activeIdx =
    Number.isInteger(raw.activeIdx) &&
    raw.activeIdx >= 0 &&
    raw.activeIdx < safeUnlockedIds.length
      ? raw.activeIdx
      : 0;

  return { stars, unlockedIds: safeUnlockedIds, activeIdx };
}

/**
 * Liest den aktuellen Fortschritt (Sterne, freigeschaltete Maskottchen,
 * aktiver Karussell-Index). Liefert bei fehlendem/blockiertem
 * `localStorage` oder kaputten/fremden Daten den Default
 * `{ stars: 0, unlockedIds: [0], activeIdx: 0 }` statt zu werfen.
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{stars: number, unlockedIds: number[], activeIdx: number}}
 */
export function loadProgress(storage) {
  const target = resolveStorage(storage);
  if (!target) {
    return {
      stars: DEFAULT_PROGRESS.stars,
      unlockedIds: [...DEFAULT_PROGRESS.unlockedIds],
      activeIdx: DEFAULT_PROGRESS.activeIdx,
    };
  }

  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        stars: DEFAULT_PROGRESS.stars,
        unlockedIds: [...DEFAULT_PROGRESS.unlockedIds],
        activeIdx: DEFAULT_PROGRESS.activeIdx,
      };
    }
    return parseProgress(JSON.parse(raw));
  } catch {
    return {
      stars: DEFAULT_PROGRESS.stars,
      unlockedIds: [...DEFAULT_PROGRESS.unlockedIds],
      activeIdx: DEFAULT_PROGRESS.activeIdx,
    };
  }
}

/** Best-Effort-Persistierung; Fehler (z. B. blockiertes localStorage)
 * werden bewusst verschluckt statt geworfen — Aufrufer entscheiden anhand
 * ihres eigenen Rückgabewerts (`null` bei Fehlschlag), nicht anhand einer
 * Exception. */
function persist(target, progress) {
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

/**
 * Wertet den Abschluss einer Runde aus und vergibt bei Erfolg einen Stern.
 * Eine Runde gilt als geschafft, wenn mindestens 5 Tiere richtig
 * beantwortet wurden (`score >= 5`) oder es sich um eine (laut main.js
 * ohnehin erst bei vollständig gelöstem Brett aufgerufene) Tier-Memory-
 * Runde handelt. Fehlertolerant: bei blockiertem/fehlendem localStorage
 * wird trotzdem der korrekte `earned`-Wert zurückgegeben, nur eben nicht
 * persistiert (`stars` im Rückgabewert entspricht dann dem nicht
 * gespeicherten, aber korrekt berechneten Zwischenstand).
 * @param {{mode: string, score: number, roundLength: number}} round
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{earned: boolean, stars: number}}
 */
export function recordRoundCompletion({ mode, score }, storage) {
  const earned = mode === GAME_MODE.MEMORY || score >= 5;
  const current = loadProgress(storage);
  const stars = earned ? current.stars + 1 : current.stars;

  if (earned) {
    const target = resolveStorage(storage);
    if (target) {
      persist(target, { ...current, stars });
    }
  }

  return { earned, stars };
}

/**
 * Löst ein Maskottchen gegen 5 Sterne ein. Guard: nur möglich, wenn
 * mindestens 5 Sterne vorhanden sind UND das Maskottchen noch nicht
 * freigeschaltet ist — sonst No-Op, Rückgabewert `null`, keine Änderung.
 * Bei Erfolg: `mascotId` wird an `unlockedIds` angehängt, 5 Sterne werden
 * abgezogen, `activeIdx` springt auf die neue (letzte) Position.
 * @param {number} mascotId Maskottchen-ID (siehe src/quiz/mascots.js)
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{stars: number, unlockedIds: number[], activeIdx: number} | null}
 */
export function redeemMascot(mascotId, storage) {
  const current = loadProgress(storage);

  if (current.stars < 5 || current.unlockedIds.includes(mascotId)) {
    return null;
  }

  const unlockedIds = [...current.unlockedIds, mascotId];
  const updated = {
    stars: current.stars - 5,
    unlockedIds,
    activeIdx: unlockedIds.length - 1,
  };

  const target = resolveStorage(storage);
  if (!target) return null;
  if (!persist(target, updated)) return null;

  return updated;
}

/**
 * Setzt den aktiven Karussell-Index (Position innerhalb `unlockedIds`).
 * No-Op außerhalb des gültigen Bereichs (`0..unlockedIds.length-1`).
 * @param {number} idx neuer aktiver Index
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {{stars: number, unlockedIds: number[], activeIdx: number}}
 */
export function setActiveIdx(idx, storage) {
  const current = loadProgress(storage);

  if (!Number.isInteger(idx) || idx < 0 || idx >= current.unlockedIds.length) {
    return current;
  }

  const updated = { ...current, activeIdx: idx };
  const target = resolveStorage(storage);
  if (target) {
    persist(target, updated);
  }
  return updated;
}
