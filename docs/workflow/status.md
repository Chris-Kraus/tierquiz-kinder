# Status: Tierquiz für Kinder

Laufender Fortschritts-Tracker, gepflegt von `pm-workflow`. Einzel-Story-Status ist die Quelle der Wahrheit in den GitHub Issues (Labels `status:*` + Project Board); dieses Dokument bildet die projektweite Phase und eine kurze Historie ab.

## Aktuelle Phase

Umsetzung der ersten Etappe "Quizfragen-Modus lokal spielbar" (siehe `requirements.md`).

## Story-Übersicht (Stand siehe Datum unten)

| # | Rolle | Story | Status |
|---|---|---|---|
| 1 | software-architect | Frontend-Tech-Stack entscheiden | done |
| 2 | devops-engineer | Wikidata-Pipeline → `animals.json` | in-progress (Discovery-Query für "Insekt" wiederholt an 502/504 gescheitert, Chunking-Fix wird gerade geprüft) |
| 3 | web-developer | Projekt-Grundgerüst | done |
| 4 | web-developer | Start-Bildschirm + Schwierigkeitsstufen | done |
| 5 | web-developer | Fragegenerierungs-Logik | done (19/19 Tests grün) |
| 6 | web-developer | Frage-Bildschirm | blockiert durch #2 (braucht echte `animals.json`, nicht nur Fixture) |
| 7 | web-developer | Ergebnis-Bildschirm + Rundenablauf | blockiert durch #6 |
| 8 | qa-engineer | End-to-End-Test | blockiert durch #2, #7 |

## Nächster Schritt

Sobald #2 eine valide `animals.json` liefert: #6 starten, danach #7, dann #8.

## Offene Punkte

- Erster gebündelter Commit steht noch aus (siehe Historie).

## Historie

- 2026-08-13: BA/UX/Architekt-Grundlagendokumente erstellt, Nutzer-Klärungsrunde eingearbeitet.
- 2026-08-13: Backlog (8 Issues) angelegt, Board/Labels eingerichtet.
- 2026-08-13: #1, #3, #4, #5 abgeschlossen. #2 läuft (Wikidata-API-Instabilität), Chunking-Fix für "Insekt"-Query angestoßen.
