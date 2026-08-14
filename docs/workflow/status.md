# Status: Tierquiz für Kinder

Laufender Fortschritts-Tracker, gepflegt von `pm-workflow`. Einzel-Story-Status ist die Quelle der Wahrheit in den GitHub Issues (Labels `status:*` + Project Board); dieses Dokument bildet die projektweite Phase und eine kurze Historie ab.

## Aktuelle Phase

**Etappe 2 "Backlog-Erweiterung" ist fertig und vollständig QA-abgenommen (#12–#21, außer #17 bewusst zurückgestellt).** Spielbar via `npm install && npm run dev` (oder `npm run build && npm run preview` für den Produktions-Build).

## Prozess-Korrektur (13.08.2026)

QA war für #1/#3/#4/#5 zunächst nur Selbsttest der umsetzenden Rolle, keine unabhängige Prüfung. Der `pm-workflow`-Skill wurde entsprechend korrigiert: QA ist ab sofort für **jede** Story zwingend, Selbsttest ersetzt keine unabhängige Prüfung. Ab #6 wurde das durchgehend so gelebt und hat sich bewährt (siehe Historie — mehrere echte Bugs wären sonst unentdeckt geblieben).

## Story-Übersicht — Etappe 1 abgeschlossen

| # | Rolle | Story | Status |
|---|---|---|---|
| 1 | software-architect | Frontend-Tech-Stack entscheiden | done (QA-geprüft) |
| 2 | devops-engineer | Wikidata-Pipeline → `animals.json` | done — 500/500 Tiere |
| 3 | web-developer | Projekt-Grundgerüst | done (QA-geprüft) |
| 4 | web-developer | Start-Bildschirm + Schwierigkeitsstufen | done (QA-geprüft, Barrierefreiheit verifiziert) |
| 5 | web-developer | Fragegenerierungs-Logik | done (QA fand kritischen Rundungs-Bug, gefixt+verifiziert) |
| 6 | web-developer | Frage-Bildschirm | done (QA-geprüft, beide Schwierigkeitsstufen, Tastatur-only) |
| 7 | web-developer | Ergebnis-Bildschirm + Rundenablauf | done (QA fand AC-Verstoß bei "Nochmal spielen", gefixt+verifiziert) |
| 9 | qa-engineer | Nachträgliche QA #1/#3/#4/#5 + Integration | done |
| 10 | devops-engineer | Lateinische Tiernamen fixen | done |
| 11 | web-developer | Fragevielfalt (Feld-Dominanz-Bug) | done (im Rahmen von #8 gefunden, gefixt+verifiziert) |
| 8 | qa-engineer | Gesamt-Abnahme End-to-End inkl. Barrierefreiheit | **done — Etappe abgeschlossen** |

## Story-Übersicht — Etappe 2 abgeschlossen

| # | Rolle | Story | Status |
|---|---|---|---|
| 13 | web-developer | Fragenanzahl am Start wählbar (5/10/15/20) | done (QA-geprüft, Playwright, Tastatur) |
| 18 | zoologe + web-developer | diet-Daten für alle 500 Tiere kuratiert | done (QA: 40/40 Testrunden, Fragetyp aktiv) |
| 14 | web-developer | Lokale Verlaufsliste (letzte 5 Runden) | done (QA-geprüft, Fehlertoleranz/Cap verifiziert) |
| 19 | zoologe + web-developer | lifespan_years-Daten für alle 500 Tiere kuratiert | done (QA: 200/200 Testrunden) |
| 12 | web-developer | Infosatz zum Tier im Feedback | done (QA fand Bug bei Lebenserwartung < 1 Jahr, gefixt+verifiziert, 2 Zyklen) |
| 15 | web-developer | Wikipedia-Link im Feedback | done (QA: 0 Datenverluste bei diet/lifespan_years nach Pipeline-Regenerierung) |
| 20 | web-developer | Vergleichsfragen: schwerstes Tier von 4 | done (QA: 80+60 simulierte Runden, keine Domination, keine Leaks) |
| 21 | zoologe + web-developer | Verwechslungspaare-Fragetyp (30 Paare) | done (QA: 500+500 simulierte Runden, Datenintegrität verifiziert) |
| 17 | business-analyst | Bild-Lizenzlösung | bewusst zurückgestellt, kein aktueller Blocker |

## Nächster Schritt

Etappe 2 ist fertig. Offen: Issue #17 (Bild-Lizenzlösung) aktivieren, sobald eine Veröffentlichung konkret geplant wird. Weitere Folgeschritte (z. B. weitere Spielmodi) noch nicht gescoped.

## Bekannte, akzeptierte Einschränkungen (kein Blocker)

- Kategorien-Schieflage in `animals.json` (Säugetiere+Vögel 87,4%) — Quiz ist dadurch säugetier-/vogellastig.
- `diet` und `lifespan_years` haben 0/500 befüllte Werte (echte Wikidata-Lücke) — diese Fragetypen kommen faktisch nie vor, auch nach dem Vielfalts-Fix in #11.
- `scripts/fetch-animals/fetch-animals.js` hat 7 vorbestehende Lint-Fehler, durchgehend als bekannt/außerhalb-Scope akzeptiert.

## Historie

- 2026-08-13: BA/UX/Architekt-Grundlagendokumente erstellt, Nutzer-Klärungsrunde eingearbeitet.
- 2026-08-13: Backlog (8 Issues) angelegt, Board/Labels eingerichtet.
- 2026-08-13: #1, #3, #4, #5 abgeschlossen (zunächst nur Selbsttest). #2 nach mehreren Wikidata-API-Ausfällen und zwei Pipeline-Bugs (Sub-Taxa-Chunking, Label-Lookup) abgeschlossen — aber 0/1480 Tiere erfüllten initial alle Pflichtfelder (Datenrealität schlechter als angenommen).
- 2026-08-13: Nutzer-Entscheidung: Pflichtfelder auf id/name_de/category reduziert, `color` komplett gestrichen (0% Wikidata-Abdeckung). #2 danach erfolgreich: 500/500 Tiere.
- 2026-08-13: Prozess-Korrektur — QA ab sofort zwingend pro Story (`pm-workflow`-Skill angepasst). Nachträgliche QA (#9) für #1/#3/#4/#5 gestartet.
- 2026-08-13: QA findet 2 Bugs: kritische Duplikat-Falschantworten in #5 (Rundungskollision, bis zu 68% betroffen bei bestimmten Feldern), lateinische statt deutsche Tiernamen bei 37/500 Tieren (neues Issue #10). Beide gefixt, unabhängig re-verifiziert, #5 und #9 geschlossen, #10 geschlossen.
- 2026-08-13: #6 umgesetzt und QA-abgenommen (beide Schwierigkeitsstufen, Tastatur-only, keine Bugs).
- 2026-08-13: #7 umgesetzt, QA findet AC-Verstoß ("Nochmal spielen" sollte Schwierigkeitsstufe beibehalten statt zum Start zu führen) — gefixt, re-verifiziert, geschlossen.
- 2026-08-13: #8 (Gesamt-Abnahme) findet blockierenden Vielfalts-Bug (Feld-Auswahl dominiert von am besten abgedecktem Feld, bis zu 91,7% derselbe Fragetyp) — neues Issue #11, gefixt (Priorisierung unterrepräsentierter Felder pro Frage-Slot), unabhängig verifiziert (0/40 Runden dominiert), geschlossen.
- 2026-08-13: #8 final gegen frischen Produktions-Build erneut verifiziert und geschlossen. **Etappe 1 vollständig abgeschlossen.**
- 2026-08-13: Zoologe/Architektur-Anreicherungsrunde ergibt 5 neue Backlog-Stories (#17–#21), zusammen mit zuvor angelegten #12–#15 9 Stories im Backlog. `pm-workflow` koordiniert `software-architect`/`ux-design` für offene Klärungspunkte je Story; 7 Stories auf `status:ready` gehoben (#12, #13, #15, #18, #19, #20, #21), #14 bleibt draft (Nutzer-Scope-Entscheidung offen), #17 bleibt bewusst draft (erst bei Veröffentlichungsabsicht relevant).
- 2026-08-14: Nutzer bestätigt #14 als rein lokale Verlaufsliste (kein Mehrbenutzer) — auf `status:ready` gehoben, `requirements.md` entsprechend präzisiert. Alle 8 ready-Stories nacheinander umgesetzt und QA-geprüft: #13, #18, #14, #19, #12 (inkl. Bugfix Lebenserwartung < 1 Jahr, 2 QA-Zyklen), #15 (inkl. Architektur-Fix für Datenerhalt bei Pipeline-Regenerierung), #20, #21 (inkl. 30 kuratierten Verwechslungspaaren). Jede Story einzeln committed und gepusht. **Etappe 2 vollständig abgeschlossen**, nur #17 bleibt bewusst offen.
