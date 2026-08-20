# Status: Tierquiz für Kinder

Laufender Fortschritts-Tracker, gepflegt von `pm-workflow`. Einzel-Story-Status ist die Quelle der Wahrheit in den GitHub Issues (Labels `status:*` + Project Board); dieses Dokument bildet die projektweite Phase und eine kurze Historie ab.

## Aktuelle Phase

**Etappe 4 "Tier-Memory + Buchstabensuche" ist abgeschlossen und gemerged.** #45 (Tier-Memory, PR #50) und #46 (Buchstabensuche, PR #49) sind beide umgesetzt, QA-final-abgenommen und nach `main` gemerged (inkl. eines nachträglich per Merge-Sanity-Check gefundenen und gefixten CSS-Bugs bei #45, PR #62). Etappe 3 (#41–#43, #47, #48) weiterhin abgeschlossen. Zwei neue, noch unbearbeitete Stories im Backlog: #51 (Buchstabenrätsel-Felder verkleinern) und #52 (Lösung-anzeigen-Option), gerade in BA-Konkretisierung. Spielbar via `npm install && npm run dev` (oder `npm run build && npm run preview` für den Produktions-Build), aktuell 279/279 Tests grün.

## Prozess-Korrektur (17.–20.08.2026)

Zwei weitere Skill-Lücken in dieser Session gefunden und behoben: (1) `qa-engineer` hatte fälschlich `docs/workflow/qa-report.md` direkt auf `main` committet/gepusht — Skill präzisiert, Commit/Push bleibt ausnahmslos `web-developer` vorbehalten. (2) Das GitHub-Project-Board-Status-Feld (Draft/Ready/In Progress/Testing/Done, getrennt von den `status:*`-Labels) wurde bisher nie mitgepflegt, dadurch drifteten Board und Labels auseinander (#45–#48 zeigten "kein Status" trotz gesetzter Labels). `pm-workflow`-Skill um Pflicht zur parallelen Board-Feld-Pflege ergänzt, bestehender Drift für #45–#48 einmalig nachgezogen (auf `Done`).

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
| 16 | business-analyst + devops-engineer + web-developer | Bild-Rateshilfe (Option D': Live-Thumbnails von Wikimedia Commons) | done (QA: 8 Browser-Szenarien inkl. Netzwerkfehler/Offline-Kernquiz, Datenintegrität aller 500 Tiere) |
| 17 | business-analyst | Bild-Lizenzlösung | geschlossen, hinfällig — Option D' löst Attribution strukturell zur Laufzeit statt durch Bundling |

## Story-Übersicht — Etappe 3 (Tiergeräusche-Erweiterung + Cleanup)

| # | Rolle | Story | Status |
|---|---|---|---|
| 41 | web-developer | Infosatz/Wikipedia-Link/Fun Fact im Tiergeräusche-Modus | done (PR #44, QA Zyklus 3/4 final abgenommen) |
| 42 | web-developer | Automatische Feedback-Bildanzeige im Tiergeräusche-Modus | done (PR #44, QA Zyklus 3/4 final abgenommen) |
| 43 | web-developer | Play/Stop-Toggle für Tierlaut-Button | done (PR #44, QA: 64/64 Checks, 2 Bugfix-Zyklen) |
| 48 | devops-engineer | Lokale/Git-Cleanup-Kandidaten entfernen | done — 97-MB-Hydration-Cache gelöscht (Nutzerbestätigung), Build/Dev verifiziert |

## Story-Übersicht — Etappe 4 (Tier-Memory + Buchstabensuche)

| # | Rolle | Story | Status |
|---|---|---|---|
| 46 | web-developer | Neuer Spielmodus "Buchstabensuche" | done (PR #49, QA 2 Zyklen — CSS-Bug Eingabefeldbreite gefixt+verifiziert, gemerged `6b63df6`) |
| 45 | web-developer | Neuer Spielmodus "Tier-Memory" | done (PR #50, QA final; Merge-Sanity-Check fand zusätzlichen CSS-Bug bei Fragenanzahl-Sichtbarkeit → Fix in PR #62, QA erneut bestanden, gemerged `62ee6c2`) |

## Nächster Schritt

BA-Konkretisierung für zwei neue, roh angelegte Issues läuft: **#51** (Buchstabenrätsel-Kästchen verkleinern, Design-Change) und **#52** (Option zum Anzeigen/Auflösen der Lösung im Buchstabensuche-Modus — braucht ggf. `ux-design`-Abstimmung zur Zählung im Rundenergebnis). Sobald spezifiziert und auf `status:ready`, direkt an `web-developer` delegierbar. Kein weiterer offener Punkt im Backlog darüber hinaus.

## Nachtrag: Bild-Rateshilfe — Entscheidungsverlauf (14.08.2026)

Issue #16 war zu Sessionbeginn zwar mit `status:ready` gelabelt, inhaltlich aber veraltet (Optionen A–G noch offen, Entscheidung "Option B" aus `requirements.md` nicht in den Issue-Text übernommen). Auf Nutzeranfrage wurde vor der Umsetzung eine zusätzliche Evaluation durchgeführt (Live-Einbindung vs. lokales Bundling, reale Git/GitHub-Größenlimits, speicherarme Alternativen wie Thumbnails/Browser-Caching), inkl. echter Performance-Messung (Stichprobe von 30 Commons-Bildern: Original-Median 1,6 MB bis 12,6 MB vs. Thumbnail-Median 32 KB/<0,25s). Ergebnis: **Option D'** (Bild-Rateshilfe als explizit optionale Online-Zusatzfunktion, Live-Thumbnails statt lokalem Bundling) statt der ursprünglich angedachten Option B. `requirements.md` NFR 1 bekam dafür eine gezielte, dokumentierte Ausnahme (Präzedenz: Issue #14). Issue #17 (Lizenzlösung vor Veröffentlichung) wurde dadurch hinfällig und geschlossen, da Attribution jetzt strukturell zur Laufzeit gelöst ist, unabhängig vom Veröffentlichungsstatus.

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
test
- 2026-08-15: Nutzer-Bugreport "Seeotter-Habitat zeigt 'coastal margin'" bestätigt und behoben (`software-architect`). Root Cause: fehlender deutscher Sprach-Fallback in der Wikidata-Pipeline (`pickLabel()` fiel bei Habitat-/Kontinent-Labels unmarkiert auf Englisch zurück, wenn kein deutsches Label existierte). Systematischer Scan aller 500 Tiere: 2 betroffene Tiere (Seeotter, Waschbär). Dabei zusätzlich einen latenten Datenverlust-Bug in `MANUALLY_CURATED_FIELDS` gefunden und mitbehoben (fehlte `fur_feather_color`/`fun_fact`, hätte bei jeder künftigen Pipeline-Regenerierung 434 bzw. 20 Tiere an kuratierten Daten verloren). `data/animals.json` regeneriert, per Diff verifiziert: nur die 2 betroffenen Tiere geändert, sonst nichts. Bekanntes separates Problem (Ländernamen statt Habitat-Typen bei Fasan/Hausmeerschweinchen, Issue #8-Kontext) bestätigt, bewusst nicht mitgefixt. Details siehe `architecture.md` → "Bugfix-Historie". Kein Commit/Push durch diese Rolle.
- 2026-08-16/17: #41–#43 (Tiergeräusche-Erweiterung: Infosatz/Wiki-Link/Fun-Fact, automatisches Feedback-Bild, Play/Stop-Toggle) auf `feature/tiergeraeusche-erweiterung` umgesetzt, PR #44 nach 3 QA-Zyklen final abgenommen (64/64 Checks) und gemerged, Issues nachträglich geschlossen. Parallel 5 neue Stories konkretisiert: #45 (Tier-Memory) und #46 (Buchstabensuche) bleiben auf `status:draft`, blockiert durch fehlende Nutzer-Bestätigung der NFR-1-Online-Ausnahme für diese beiden Modi; #47 (Doku-Prozess-Story) Teilaufgabe 2 erledigt, Teilaufgabe 1 blockiert durch nötige Nutzer-Entscheidung zu Skill-Dateien außerhalb des Repos; #48 (Cleanup) von `devops-engineer` umgesetzt — 97-MB-Hydration-Cache nach Nutzerbestätigung gelöscht, Build/Dev verifiziert, geschlossen.
- 2026-08-17: Nutzer trifft alle drei ausstehenden Entscheidungen: (1) NFR-1-Online-Ausnahme auf #45/#46 erweitert, `requirements.md` entsprechend ergänzt, beide Issues auf `status:ready` gehoben; (2) Skill-Anpassung aus #47 bestätigt und umgesetzt (`web-developer`/`ux-design`/`software-architect` SKILL.md prüfen künftig vor Story-Start auf offene Feature-Branches mit neuerer Doku), Issue #47 geschlossen; (3) laufende Doku-Änderungen dieser Session (status.md, devops.md, requirements.md) sollen gebündelt committet/gepusht werden. #45/#46 sind damit die nächsten umsetzbaren Stories im Backlog, kein weiterer offener Punkt.
- 2026-08-17/20: #46 (Buchstabensuche) und #45 (Tier-Memory) parallel umgesetzt (je eigener Feature-Branch/PR). #46: QA fand CSS-Bug (Eingabefelder ~6,5× breiter als vorgegebene Kästchen, Overflow bei langen Namen), gefixt+verifiziert (Zyklus 2 bestanden), Nutzer bestätigt Merge, PR #49 gemerged (`6b63df6`), Issue automatisch geschlossen. #45: QA final bestanden, Nutzer bestätigt Merge, PR #50 gemerged — dabei musste `web-developer` einen echten Datei-Konflikt mit dem kurz zuvor gemergten #46 von Hand auflösen (beide Stories hatten unabhängig dieselbe Start-Bildschirm-Kachel-Logik in `start.js`/`main.js`/`gameMode.js` geändert). Nachträglicher QA-Sanity-Check des Merges fand einen weiteren, vorbestehenden (nicht durch den Merge verursachten) Bug: Fragenanzahl-Auswahl blieb bei Tier-Memory trotz korrektem `hidden`-Attribut visuell sichtbar (fehlende CSS-`[hidden]`-Override-Regel, Cascade-Falle). Fix auf neuem Branch (`fix/tier-memory-round-length-visibility`, PR #62), QA erneut bestanden, Nutzer bestätigt Merge, gemerged (`62ee6c2`). Beide Issues geschlossen, Feature-Branches und verwaiste lokale Worktrees aufgeräumt (Tests danach wieder korrekt 279/279 statt durch verwaiste Worktrees aufgebläht 798/798). Dabei zwei weitere Skill-Lücken gefunden und behoben: `qa-engineer` hatte fälschlich selbst einen Doku-Commit auf `main` gepusht (Skill präzisiert, ausschließlich `web-developer` committet); GitHub-Project-Board-Status-Feld war nie mit den `status:*`-Labels synchron gehalten worden (Board zeigte "kein Status" für bereits fertige Stories #45–#48, `pm-workflow`-Skill um Pflicht zur Board-Pflege ergänzt, Drift einmalig nachgezogen). Parallel dazu zwei neue, roh vom Nutzer angelegte Issues (#51, #52) zur Buchstabensuche gefunden — `business-analyst` mit Konkretisierung beauftragt.
