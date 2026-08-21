// Sticker-Album (Redesign, Issue #68): sammelt Tier-IDs, die das Kind bereits
// durch eine richtige Antwort oder ein gefundenes Memory-Paar "verdient" hat,
// in `localStorage`. Einfacher als src/quiz/history.js: hier reicht eine
// deduplizierte Liste von Tier-IDs, keine Einzel-Einträge mit eigener ID/
// Zeitstempel — ein Tier ist entweder gesammelt oder nicht, kein Verlauf
// nötig. Deshalb kein `crypto.randomUUID()` wie in history.js.
//
// `localStorage` kann fehlen oder blockiert sein (z. B. Safari Private Mode)
// — jeder Zugriff ist deshalb wie bei history.js in try/catch gekapselt. Bei
// Fehlschlag verhält sich das Album einfach wie leer/nicht änderbar, kein
// Absturz, keine technische Fehlermeldung im Kind-UI.
//
// Rein lokales Album auf diesem Gerät — kein geräteübergreifender Abgleich,
// kein Nutzerkonto (siehe requirements.md).

const STORAGE_KEY = "tierquiz-kinder:album";

/** Ziel-Anzahl gesammelter Tiere fürs Album (siehe design.md, "Redesign"). */
export const ALBUM_TARGET = 12;

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
 * Liest die Liste bereits gesammelter Tier-IDs. Liefert bei fehlendem/
 * blockiertem `localStorage` oder kaputten/fremden Daten ein leeres Array
 * statt zu werfen oder abzustürzen.
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {string[]}
 */
export function loadCollectedAnimals(storage) {
  const target = resolveStorage(storage);
  if (!target) return [];

  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry === "string" && entry);
  } catch {
    return [];
  }
}

/**
 * Fügt eine Tier-ID zum Album hinzu, falls noch nicht vorhanden (dedupliziert
 * — mehrfaches Sammeln desselben Tieres erzeugt keinen doppelten Eintrag).
 * Fehlertolerant: bei fehlendem/blockiertem `localStorage` passiert einfach
 * nichts und der Rückgabewert ist `null` statt der aktualisierten Liste.
 * @param {string} animalId Tier-ID (siehe `id`-Feld in data/animals.json)
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @returns {string[] | null}
 */
export function addCollectedAnimal(animalId, storage) {
  const target = resolveStorage(storage);
  if (!target || typeof animalId !== "string" || !animalId) return null;

  try {
    const existing = loadCollectedAnimals(target);
    if (existing.includes(animalId)) return existing;
    const updated = [...existing, animalId];
    target.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return null;
  }
}

/**
 * Liefert den Album-Fortschritt für die Anzeige auf Start-/Ergebnis-
 * Bildschirm.
 * @param {Storage} [storage] Storage-Implementierung, Standard `localStorage` (für Tests austauschbar)
 * @param {number} [target] Ziel-Anzahl, Standard `ALBUM_TARGET`
 * @returns {{collected: number, target: number}}
 */
export function getAlbumProgress(storage, target = ALBUM_TARGET) {
  const collected = loadCollectedAnimals(storage).length;
  return { collected, target };
}
