# Status: Tierquiz für Kinder

Laufender Fortschritts-Tracker, gepflegt von `pm-workflow`. Einzel-Story-Status ist die Quelle der Wahrheit in den GitHub Issues (Labels `status:*` + Project Board); dieses Dokument bildet die projektweite Phase und eine kurze Historie ab.

## Aktuelle Phase

**Erste Etappe "Quizfragen-Modus lokal spielbar" ist fertig und vollständig QA-abgenommen (#8 geschlossen).** Spielbar via `npm install && npm run dev` (oder `npm run build && npm run preview` für den Produktions-Build).

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

## Aktuelle Phase (Fortsetzung)

Etappe 2 (Backlog-Erweiterung) in Scoping: 8 von 9 Backlog-Stories aus der Zoologe/Anreicherungsrunde stehen jetzt auf `status:ready` (#12, #13, #15, #18, #19, #20, #21) bzw. bewusst weiter `status:draft` mit dokumentiertem Grund (#14 wartet auf eine echte Nutzer-Scope-Entscheidung, #17 ist absichtlich geparkt bis Veröffentlichung konkret ansteht). Noch keine Implementierung gestartet — Reihenfolge/Priorisierung unter den ready-Stories ist der nächste PM-Schritt.

## Nächster Schritt

Reihenfolge der `status:ready`-Stories (#12, #13, #15, #18, #19, #20, #21) mit dem Nutzer priorisieren und Umsetzung starten (`web-developer` iterativ, `qa-engineer` zwingend pro Story). Offen: Nutzer-Entscheidung zu #14 (lokale Verlaufsliste als Scope-Erweiterung ja/nein).

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
