# QA-Report: Tierquiz für Kinder

Projektübergreifende QA-Notizen (wiederkehrende Probleme, offene Eskalationen), gepflegt von `qa-engineer`. Einzel-Test-Ergebnisse pro Story/Bug stehen als Kommentare in den jeweiligen GitHub Issues — dieses Dokument sammelt nur, was über eine einzelne Story hinaus relevant ist.

## Bekanntes wiederkehrendes Problem: verwaiste Worktrees blähen Testzahlen auf

**Seit:** mind. 17.08.2026, erneut bestätigt am 20.08.2026 bei der QA-Abnahme von PR #62 (Issue #45, Bug: Fragenanzahl-Sektion bei Tier-Memory).

Unter `.claude/worktrees/` liegen verwaiste Git-Worktrees (z.B. `agent-aa6baedeb7d976a2f` → `feature/buchstabensuche`, `agent-ab22be5d2cdab7175` → `feature/tier-memory`), die von vergangenen Agent-Sessions stehen gelassen wurden. `git worktree list` zeigt sie an. Da `vite.config.js` keine `test.exclude`/`test.include`-Einschränkung setzt, scannt `npm test` (`vitest run`) und `npm run lint` (`eslint .`) diese Worktrees mit — sie enthalten eigene Kopien von `src/` und `scripts/`.

**Symptom:** `npm test` meldet ca. 798 Tests über 60 Testdateien statt der tatsächlichen **279 Tests über 21 Testdateien**. `npm run lint` meldet zusätzliche, duplizierte Fehler aus den vorbestehenden `scripts/fetch-animals/*.js`-Problemen (einmal pro Worktree-Kopie plus einmal im Root).

**Workaround für QA-Läufe, bis das Cleanup erledigt ist:**
```
npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'
```
liefert die bereinigte, echte Testzahl. Für Lint: `npx eslint src` (nur App-Code) statt des vollen `npm run lint`, wenn nur der aktuelle PR-Diff relevant ist.

**Root-Cause-Fix (nicht von QA umzusetzen):** Verwaiste Worktrees unter `.claude/worktrees/` löschen (`git worktree remove` bzw. manuelles Aufräumen, Zuständigkeit `devops-engineer`/PM) und/oder `vitest`/`eslint`-Config um einen expliziten Exclude für `.claude/` ergänzen, damit das Problem nicht bei jeder neuen verwaisten Worktree erneut auftritt.

## Historie

- **2026-08-20** — QA-Abnahme PR #62 / Issue #45 (Tier-Memory Rundenlängen-Sichtbarkeit): Bugfix verifiziert (`.round-length-picker[hidden] { display: none; }` in `src/styles/global.css`). Computed `display: none` bei Tier-Memory bestätigt (nicht nur `hidden`-Attribut), Regressionscheck bei "Wer bin ich?" und "Buchstabensuche" ohne Auffälligkeiten (Sektion weiterhin sichtbar/funktional). 1 Zyklus, kein Fix nötig. Dabei das verwaiste-Worktrees-Problem (s.o.) erneut angetroffen und hier dokumentiert, da es bereits mind. einmal zuvor zu falschen Testzahlen in einem QA-Bericht geführt hatte.
- **2026-08-20** — QA-Abnahme Redesign-Vorhaben (Issues #67-#77, Branch `feature/kids-redesign`, PR #78): unabhängig geprüft, nicht nur die Selbstangaben von `web-developer` übernommen. `npm run test` (325/325), `npm run lint` (13 vorbestehende Fehler, gegen `main` verglichen, keine neuen), `npm run build` eigenständig ausgeführt. Manueller Durchlauf über 4 der 5 Spielmodi bis zum Ergebnis-Bildschirm (Quizfragen, "Wer bin ich?" inkl. echtem Wikimedia-Commons-Bildabruf, Tier-Memory, Buchstabensuche inkl. "Lösung zeigen"), dabei gezielt unveränderte Bestandslogik gegengeprüft: "Nochmal spielen" behält Modus/Schwierigkeit bei (kein Rücksprung zum Start), Fragenanzahl-Auswahl bleibt bei Tier-Memory ausgeblendet, Tier-Memory-Ergebnis zeigt weiterhin keine Verlaufsliste, `resolvedCount`("davon N aufgelöst") und Modus-Label in der Verlaufsliste unverändert korrekt. Keine Bugs gefunden — alle 10 verbleibenden Stories (#68-#77, #67 bereits zuvor einzeln QA-abgenommen) freigegeben. 1 Zyklus, kein Fix nötig.
