# DevOps: Tierquiz für Kinder

Dieses Dokument ist ein lebendes Dokument der Rolle `devops-engineer`. Es wird bei neuen Erkenntnissen ergänzt, nicht überschrieben.

## Scope dieses Arbeitsschritts

Umsetzung von GitHub Issue #2: Wikidata-Datenbeschaffungs-Pipeline für die Tierquiz-Datenbank (`scripts/fetch-animals/` → `data/animals.json`), gemäß dem in `docs/workflow/architecture.md` festgelegten Schema. Kein Repo-/CI-/Deployment-Setup in diesem Schritt (das Repo existiert bereits, Frontend-Tech-Stack/CI/Deployment sind separate, spätere Arbeitsschritte).

## Projekt-Setup (Repo/Remote)

Bereits vorhanden (nicht Teil dieses Arbeitsschritts): lokales Repo unter `~/Projects/tierquiz-kinder`, privates GitHub-Repo `Chris-Kraus/tierquiz-kinder`, `gh` CLI authentifiziert. `gh` und `node` sind auf diesem Rechner unter `/opt/homebrew/bin/` installiert, aber in der Shell-Umgebung dieser Session standardmäßig **nicht** im `PATH` — beide wurden über den vollen Pfad aufgerufen. Falls das bei künftigen Sessions erneut auftritt: kein Blocker, einfach `/opt/homebrew/bin/gh`/`/opt/homebrew/bin/node` verwenden oder `PATH` in der Shell-Konfiguration ergänzen.

## Wikidata-Datenbeschaffungs-Pipeline (`scripts/fetch-animals/`)

**Sprache:** Node.js (eingebautes `fetch`, keine npm-Abhängigkeiten) — passt zum bereits im Repo vorhandenen Vite/Node-Stack.

**Ausführung:** `node scripts/fetch-animals/fetch-animals.js` (Details, Ablauf und Property-ID-Verifikation siehe `scripts/fetch-animals/README.md`). Für Re-Runs nach reinen Schema-/Filter-Änderungen (ohne erneuten Wikidata-Fetch): `node scripts/fetch-animals/fetch-animals.js --use-cache` (nutzt `scripts/fetch-animals/.cache/hydration-cache.json`, wird bei jedem vollen Lauf automatisch geschrieben).

**Ablauf (zweistufig, wie in architecture.md skizziert):**
1. Discovery per SPARQL (`query.wikidata.org/sparql`) pro Tier-Klasse (Säugetier, Vogel, Reptil, Amphibie, Fisch, Insekt, Spinnentier, Weichtier), gefiltert nach `taxon rank = species`, Sitelink-Anzahl > 15 (Popularitäts-Proxy) und ohne fossile Taxa.
2. Hydration per Wikidata-API (`wbgetentities`, Batches à 50) für Gewicht, Länge, wiss. Name, Gefährdungsstatus, Habitat, Kontinent-Proxy.
3. Validierung jedes Datensatzes gegen die Pflichtfelder aus dem formalen JSON Schema (architecture.md Abschnitt 2; seit der Schema-Korrektur vom 13.08.2026 nur noch `id`/`name_de`/`category`); nur vollständig valide Datensätze landen in `data/animals.json`.

### Robustheit der Pipeline (während der Umsetzung gefunden und behoben)

- Der Wikidata Query Service liefert bei besonders teuren Queries (großer `P171*`-Teilbaum) strukturelle 502/504-Fehler, kein reines Lastproblem. Betroffen: Insekten (Insecta) und Weichtiere (Mollusca) als eine einzige Volltraversierung. Lösung: für diese beiden Klassen wird stattdessen über mehrere kleinere, bekannte Unter-Taxa (z. B. Käfer, Schmetterlinge, Hautflügler, Libellen, Zweiflügler, Schnabelkerfe, Heuschrecken bei Insekten; Schnecken, Muscheln, Kopffüßer bei Weichtieren) einzeln abgefragt und die Ergebnisse gemergt — jede Teil-Query bleibt für WDQS unkritisch.
- Generelle Retry-Logik mit exponentiellem Backoff (bis zu 6 Versuche) für transiente 429/500/502/503/504-Fehler; eine einzelne dauerhaft fehlschlagende Klasse/Sub-Taxon bricht den Gesamtlauf nicht ab, sondern wird übersprungen und im Log sichtbar gemeldet.
- Property-/Item-IDs aus der Architektur-Skizze wurden vor Umsetzung gegen echte Wikidata-Testabfragen verifiziert; mehrere waren falsch oder fehlten (z. B. IUCN-Status "endangered" = `Q96377276`, nicht das naheliegend vermutete `Q11394`; "fossil taxon"-Filter `Q23038290` war in der Skizze gar nicht vorgesehen). Details siehe `scripts/fetch-animals/README.md`.

### Testlauf 1 (13.08.2026) — BLOCKER gefunden, seither behoben

Vollständiger Testlauf gegen den echten Wikidata Query Service/API durchgeführt (kein Sandbox-/Netzwerk-Problem — die Verbindung zu `query.wikidata.org` und `www.wikidata.org` funktioniert einwandfrei aus dieser Umgebung).

**Discovery:** 1.485 eindeutige, populäre Tier-Kandidaten über alle 8 Klassen gefunden (jeweils bis zu 220 pro Klasse, sitelinks > 15), korrekt nach Kategorie gelabelt und nach Popularität sortiert.

**Hydration:** 1.480 Kandidaten erfolgreich mit Detail-Claims angereichert (5 ohne Entity-Daten verloren), davon 5 wegen IUCN-Status "extinct" ausgeschlossen.

**Validierung gegen die Pflichtfelder — Kernbefund:**

| Pflichtfeld | Abdeckung |
|---|---|
| `color` | 0 / 1.480 (0 %) |
| `habitat` | 72 / 1.480 (4,9 %) |
| `continent` | 93 / 1.480 (6,3 %) |
| `weight_kg` | 213 / 1.480 (14,4 %) |

**→ 0 von 1.480 Kandidaten erfüllen alle Pflichtfelder gleichzeitig.** `data/animals.json` wurde geschrieben, enthält nach diesem Lauf aber ein leeres `animals`-Array (Top-Level-Struktur mit `schema_version`, `license: "CC0-1.0"`, `source`, `source_url`, `retrieved_at` ist korrekt befüllt).

Dies wurde gezielt gegengeprüft, um einen Skript-Fehler auszuschließen: die Extraktionslogik funktioniert nachweislich korrekt (z. B. Löwe/Q140 bekommt `weight_kg = 126` korrekt aus den realen, mehrfachen Gewichts-Statements berechnet — Median über Statements mit unterschiedlichen Qualifiern wie Geschlecht/Alter). Für dasselbe Tier sind `habitat` und `continent` aber mit **0 Statements** in Wikidata hinterlegt — das ist keine Frage der Property-ID, sondern schlicht nicht vorhandene Daten, auch bei den bekanntesten Tieren (Löwe, Elefant u. Ä.).

**Einordnung:** Das ist kein Netzwerk-/Sandbox-Blocker (der in der Aufgabenstellung als Beispiel genannte Fall), sondern ein **Daten-Verfügbarkeits-Blocker**: die Schema-Annahme aus `architecture.md` (Pflichtfelder `habitat`/`continent`/`color` zuverlässig per Wikidata-SPARQL/API befüllbar) hält der Realität der Wikidata-Datenlage nicht stand — auch nicht für die bekanntesten, meistverlinkten Tiere. Die Architektur-Skizze hatte dieses Risiko für `habitat`/`diet` bereits benannt, aber deutlich unterschätzt (angenommen: lückenhaft, real: nahezu nicht vorhanden), und für `continent`/`color` gar nicht als Risiko vermerkt.

Es wurden **bewusst keine Platzhalter-, Rate- oder KI-erfundenen Werte** erzeugt, um die Pflichtfelder künstlich aufzufüllen — das hätte die tatsächliche Datenqualität verschleiert.

**Empfehlung, die dem Nutzer vorgelegt wurde:**
1. `habitat`, `continent`, `weight_kg` im Schema von Pflicht- zu optionalen Feldern herabstufen (analog zur bereits für `diet` getroffenen Entscheidung in architecture.md), `color` komplett entfernen (0 % Abdeckung, "optional" hätte das nicht behoben), oder
2. eine zusätzliche, kuratierte Datenquelle für diese Felder ergänzen, oder
3. Zielgröße realistisch nach unten korrigieren.

**Entscheidung des Nutzers (13.08.2026):** Option 1 — Pflichtfelder lockern, `color` entfernen. Umgesetzt in `architecture.md` (Feldtabelle, formales JSON Schema, Beispieldatensätze) und in `fetch-animals.js` (`validateRequiredFields`, `buildAnimal`, siehe `scripts/fetch-animals/README.md`).

### Testlauf 2 (13.08.2026) — mit gelockerten Pflichtfeldern, ERFOLGREICH

Rebuild via `--use-cache` auf Basis der bereits hydrierten Rohdaten aus Testlauf 1 (kein erneuter Wikidata-Fetch nötig — genau der Anwendungsfall, für den der Cache-Mechanismus ergänzt wurde).

**Ergebnis:**
- Hydrierte Kandidaten: 1.480 (5 wegen IUCN-Status "extinct" ausgeschlossen).
- Vollständig schema-valide (Pflichtfelder `id`/`name_de`/`category`): **1.480 von 1.480**.
- **→ 500 von 500 Ziel-Tieren in `data/animals.json` geschrieben, Validierung erfolgreich.**

**Abdeckung der optionalen Felder in den finalen 500 Tieren:**

| Feld | Abdeckung |
|---|---|
| `name_scientific` | 500 / 500 (100,0 %) |
| `conservation_status` | 470 / 500 (94,0 %) |
| `weight_kg` | 210 / 500 (42,0 %) |
| `habitat` | 67 / 500 (13,4 %) |
| `continent` | 28 / 500 (5,6 %) |
| `length_cm` | 11 / 500 (2,2 %) |
| `diet` | 0 / 500 (nicht hydriert, siehe README.md "Nicht befüllte Felder") |
| `lifespan_years` | 0 / 500 (nicht hydriert, siehe README.md "Nicht befüllte Felder") |

Diese Felder sind jetzt bewusst optional — die Fragegenerierung (`questionGenerator.js`/`difficulty.js`, Issue #5) überspringt bereits fehlende Felder automatisch (gegengeprüft, siehe unten), sodass diese Lückenhaftigkeit kein Blocker mehr ist.

**Bekannte, dem Nutzer im Issue-Kommentar gemeldete Kategorien-Schieflage** (bereits in Issue #2 als mögliches Risiko der reinen Sitelinks-Popularitäts-Sortierung vorab benannt, bewusst nicht eigenmächtig durch ein anderes Auswahlkriterium behoben):

| category | Anzahl | Anteil |
|---|---|---|
| Säugetier | 218 | 43,6 % |
| Vogel | 219 | 43,8 % |
| Fisch | 36 | 7,2 % |
| Insekt | 11 | 2,2 % |
| Reptil | 10 | 2,0 % |
| Amphibie | 5 | 1,0 % |
| Spinnentier | 1 | 0,2 % |
| Weichtier | 0 | 0 % |

Säugetiere und Vögel dominieren mit zusammen 87,4 % der 500 Tiere, da sie in den zugrundeliegenden Wikidata-Sitelink-Zahlen strukturell höher liegen als z. B. Fische/Insekten/Weichtiere — reine Popularitäts-Sortierung ohne Kategorien-Balancierung, wie in `requirements.md`/`architecture.md` festgelegt. Für den Quizfragen-Fragetyp "Zu welcher Tiergruppe gehört ...?" bleibt das nutzbar (7 von 8 Kategorien mit ≥ 1 Tier vertreten), aber Falschantworten-Vielfalt für seltenere Kategorien (Weichtier: 0 Tiere, Spinnentier: 1 Tier) ist entsprechend eingeschränkt.

**Gegenprüfung Fragegenerierung (`src/quiz/questionGenerator.js`, `src/quiz/difficulty.js`, Issue #5):** `getCorrectValue`/`buildValueQuestion` behandeln fehlende/`undefined` Felder bereits sauber (liefern `null` statt zu crashen), daher keine Codeanpassung nötig. Eine Ausnahme: `difficulty.js` (`EASY_FIELDS`) und `questionGenerator.js` (`FIELD_DEFINITIONS.color`) referenzieren weiterhin das jetzt aus dem Schema entfernte Feld `color` — das führt zu keinem Fehler (Fragen zu `color` werden für alle echten Tiere einfach nie erzeugt, da `animal.color` nie existiert), ist aber toter Code. Empfehlung für `web-developer`: in einem eigenen, kleinen Follow-up (nicht Teil von Issue #2) den `color`-Eintrag aus `EASY_FIELDS` und `FIELD_DEFINITIONS` entfernen. Die Test-Fixtures unter `src/quiz/__fixtures__/` enthalten weiterhin synthetische `color`-Werte — unverändert gelassen, da Issue #5/`web-developer`-Zuständigkeit.

**Status:** Issue #2 **geschlossen** (`status:done`), `data/animals.json` enthält 500 valide Tiere. Committen/Pushen bleibt bei PM (nicht durch diese Rolle vorgenommen).

## Issue #10: Lateinische Namen in `name_de` (13.08.2026)

Von `qa-engineer` bei der nachträglichen Prüfung (#9) gemeldet: 37 von 500 Tieren (7,4 %) hatten in `data/animals.json` einen lateinischen (wissenschaftlichen) statt deutschen Namen in `name_de` — für ein Kinderquiz nicht kindgerecht (z. B. "Apodemus sylvaticus" statt "Waldmaus").

**Ursache (verifiziert am Hydration-Cache, nicht nur vermutet):** Kein fehlendes Wikidata-Label, das den bestehenden Fallback in `pickLabel()` ausgelöst hätte, sondern ein tatsächlich **vorhandenes** `de`-Label, dessen Wert selbst der lateinische Binomial-Name ist. Beispiel Q14683 (Haussperling): `labels.de.value = "Passer domesticus"`, obwohl `sitelinks.dewiki.title` korrekt `"Haussperling"` ist. `pickLabel()` prüfte nur "ist ein `de`-Label vorhanden", nicht "ist es tatsächlich ein deutscher Trivialname" — gab das Latein-Label also unverändert zurück, ohne je den (an sich schon vorhandenen) `dewiki`-Fallback zu erreichen. Zusätzlich fanden sich bei der Verifikation 2 weitere Fälle (Q15978631 "Homo sapiens", Q130888 "Drosophila melanogaster"), bei denen sogar der deutsche Wikipedia-Artikeltitel selbst der lateinische Name ist (kein eigener deutscher Trivialname für die Art-Seite vorhanden) — vom ursprünglichen Issue nicht erfasst, da dort nur an `name_de == name_scientific` geprüft wurde; hier zusätzlich über eine generische Binomial-Regex gefunden.

**Fix (`scripts/fetch-animals/fetch-animals.js`):** Neue Funktion `looksLikeScientificName(value, scientificName)` erkennt lateinische Artnamen (a) per Exakt-Vergleich mit dem gehydrierten `name_scientific` (P225) und (b) generisch per Binomial-Muster (großgeschriebenes erstes Wort, komplett kleingeschriebenes zweites Wort — im Deutschen praktisch nie der Fall, da deutsche Substantive/mehrteilige Trivialnamen durchgehend großgeschrieben werden; gegengeprüft: 0 Falsch-Positive unter den ursprünglich 462 unbetroffenen Tieren). Neue Funktion `pickAnimalNameDe(entity, scientificName)` (nur für `name_de` verwendet, `pickLabel()` bleibt für Habitat-/Kontinent-Labels unverändert) mit Prioritätsreihenfolge:
1. Wikidata-`de`-Label, falls vorhanden **und nicht** lateinisch-verdächtig.
2. Deutscher Wikipedia-Artikeltitel (`sitelinks.dewiki.title`), falls vorhanden **und nicht** lateinisch-verdächtig.
3. Sonst `null` → Tier fällt bei der Pflichtfeld-Validierung durch `name_de` und wird ausgeschlossen.

Bewusst **kein** englisches Fallback-Label mehr für `name_de` (anders als im ursprünglichen `pickLabel()`, das für allgemeine Habitat/Kontinent-Labels weiterhin de→en→dewiki nutzt): laut Empfehlung im Issue wäre ein englischer Anzeigename für ein deutsches Kinderquiz ebenso wenig kindgerecht wie Latein, und deckt sich oft ohnehin nur mit dem lateinischen Namen (z. B. Q53462: sowohl `de`- als auch `en`-Label = "Macropus rufus"). Gegenprüft: von den 500 vorherigen Tieren hätten ohnehin nur 0 zusätzlich ein reines Englisch-Fallback benötigt (499 hatten ein `de`-Label, 1 ging direkt über `dewiki`) — der Entfernung des Englisch-Fallbacks kostet also keine der vorher korrekten Einträge.

**Ausschluss statt fehlerhafter Anzeige, mit Nachbesetzung:** Da der Kandidaten-Pool aus der Discovery-Phase (1.480 hydrierte Kandidaten) deutlich größer als die Zielgröße 500 ist, rücken ausgeschlossene Tiere automatisch durch den nächstpopulären Kandidaten mit echtem deutschen Namen nach (`valid.slice(0, TARGET_TOTAL)` in `main()`, unverändert).

**Neuerzeugung:** `node scripts/fetch-animals/fetch-animals.js --use-cache` — kein erneuter Wikidata-Fetch nötig, reiner Rebuild aus dem bestehenden `hydration-cache.json`.

**Ergebnis:**
- Vollständig schema-valide Kandidaten: 1.268 von 1.480 (vorher 1.480 von 1.480 — 212 statt vorher 0 scheitern jetzt an `name_de`, weil kein echtes deutsches Label/Artikel vorhanden ist; erwartetes, gewolltes Verhalten des Fixes).
- **→ weiterhin 500 von 500 Ziel-Tieren in `data/animals.json`**, davon 33 der ursprünglich 37 Latein-Fälle in-place korrigiert (jetzt z. B. Q14683 "Haussperling", Q15083 "Nord-Giraffe", Q25334 "Rotkehlchen", Q42627 "Bengalkatze"), 4 endgültig ausgeschlossen (kein verwertbares deutsches Label/Artikel: Q139487, Q53462, Q15978631, Q130888) und durch 4 andere populäre Kandidaten mit echtem deutschen Namen nachbesetzt.
- **Verifikation (eigene Prüfung, nicht nur Annahme):** 0 von 500 `name_de`-Werten matchen exakt `name_scientific`; 0 von 500 matchen die generische Latein-Binomial-Regex; alle 500 `name_de`-Werte sind eindeutig (keine Duplikate). Stichprobenhafte Positiv-Fälle wie "Puma", "Lama", "Dugong" (Gattungsname ist zugleich der korrekte deutsche Trivialname) bewusst nicht fälschlich ausgeschlossen.
- Kategorien-Verteilung nach Nachbesetzung nahezu unverändert: Säugetier 215 (43,0 %), Vogel 219 (43,8 %), Fisch 39 (7,8 %), Insekt 11 (2,2 %), Reptil 10 (2,0 %), Amphibie 5 (1,0 %), Spinnentier 1 (0,2 %), Weichtier weiterhin 0.
- Abdeckung der optionalen Felder in den finalen 500 praktisch unverändert (`name_scientific` 100 %, `conservation_status` 94,6 %, `weight_kg` 42,0 %, `habitat` 13,4 %, `continent` 5,4 %, `length_cm` 2,2 %).

**Status:** Issue #10 **geschlossen** (`status:done`). Committen/Pushen bleibt bei PM (nicht durch diese Rolle vorgenommen).

## Issue #16: Messung der P18-/CC0-Bildabdeckung (13.08.2026)

**Kontext:** Issue #16 ("Bild als Rateshilfe"), Abschnitt "Erweiterte Optionsübersicht". `software-architect` empfahl dort Option G ("Hybrid: nur CC0/PD-Bilder lokal bündeln") als vielversprechendste Lösung für das Lizenzproblem bei angezeigten Tierbildern, mit der offenen Frage, wie hoch die reale CC0/Public-Domain-Abdeckung unter den 500 ausgewählten Tieren tatsächlich ist. Reine Mess-/Analyse-Aufgabe, **kein Bundling, keine Schema-/Pipeline-Änderung** in diesem Schritt.

**Methodik:** Neues, eigenständiges Skript `scripts/fetch-animals/measure-image-coverage.js` (klar als reines Analyse-Tool gekennzeichnet, nicht Teil der produktiven Pipeline, keine Schreibzugriffe auf `data/animals.json`):
1. Alle 500 `id`s (Wikidata-QIDs) aus `data/animals.json` gelesen.
2. Wikidata `wbgetentities` in 10 Batches à 50 IDs (`props=claims`), Property **P18** ("image") pro Tier extrahiert.
3. Für alle gefundenen Commons-Dateinamen: Wikimedia-Commons-API (`commons.wikimedia.org/w/api.php`, `action=query&prop=imageinfo&iiprop=extmetadata`) in 10 Batches à 50 Dateititel (MediaWiki-Limit für mehrere `titles` pro Request bei normalen Nutzern), Feld `LicenseShortName` (Fallback `UsageTerms`) ausgelesen.
4. Kategorisierung: kein Bild / CC0 oder Public Domain (toleranter Musterabgleich auf `LicenseShortName`) / andere Lizenz (mit Auflistung der vorkommenden Lizenzen). Stichprobe der CC0/PD-Kategorie gegengeprüft (45× `"Public domain"`, 6× `"CC0"` — Summe 51, keine Falsch-Positiven durch den Musterabgleich).

**Ergebnis (500/500 Tiere geprüft):**

| Kategorie | Anzahl | Anteil |
|---|---|---|
| Kein Bild (P18 fehlt) | 0 | 0,0 % |
| Bild vorhanden, CC0 oder Public Domain | 51 | 10,2 % |
| Bild vorhanden, andere Lizenz | 449 | 89,8 % |

P18-Abdeckung ist mit 100 % überraschend hoch (deutlich höher als bei `habitat`/`continent`/`weight_kg` in Issue #2) — plausibel, da die Sitelinks-Popularitäts-Schwelle (> 15) tendenziell Tiere mit gut gepflegten Wikidata-Einträgen selektiert. Die "andere Lizenz"-Kategorie ist erwartungsgemäß dominiert von Commons-Standardlizenzen: CC BY-SA 4.0 (135), CC BY-SA 3.0 (120), CC BY 2.0 (71), CC BY-SA 2.0 (38), CC BY-SA 2.5 (27), CC BY 4.0 (26), sowie kleinere Reste (CC BY 3.0, GFDL 1.2, CC BY 2.5, KOGL Type 1, CC BY-SA 3.0 de/at, "Attribution", "Copyrighted free use", CC BY 2.0 de).

**Einschätzung zu Option G:** Mit 10,2 % CC0/PD-Abdeckung liegt der Wert klar unter der im Issue als Warnschwelle genannten Marke von 20 %. Ergebnis als Issue-#16-Kommentar dokumentiert; Entscheidung über A–G bleibt beim Nutzer/PM.

**Skript-Verbleib:** `measure-image-coverage.js` bleibt im Repo unter `scripts/fetch-animals/` (als Referenz/Wiederholbarkeit, z. B. falls sich die Commons-Datenlage ändert), ist aber klar im Datei-Header als reines Analyse-Tool ohne Pipeline-Anbindung gekennzeichnet — kein Aufräumbedarf, da es weder Abhängigkeiten noch Wartungslast für die produktive Pipeline erzeugt.

## Issue #48: Cleanup lokaler/Git-Dateien (17.08.2026)

**Scan-Ergebnis:** `git status`, `du -sh` auf bekannte Cache-/Build-Ordner, `git ls-files` gegen Log-/Temp-/`.DS_Store`-Muster geprüft. Ein einziger konkreter Kandidat gefunden:

- `scripts/fetch-animals/.cache/hydration-cache.json` — 97 MB (101.860.051 Byte), rein lokal, war nie in Git (bereits vor dieser Story korrekt in `.gitignore` erfasst). Reiner Zwischenspeicher der Wikidata-Hydration für `fetch-animals.js --use-cache`-Re-Runs, keine Quelle der Wahrheit für `data/animals.json`.

Keine weiteren Kandidaten: keine verwaisten Branches (Feature-Branch aus PR #44 bereits automatisch entfernt), keine `.log`/`.DS_Store`/Backup-Dateien in Git, `.gitignore` deckt `node_modules/`, `dist/`, `.DS_Store`, `*.log`, den Cache-Ordner und `.claude/` bereits vollständig ab.

**Nutzerentscheidung:** Löschen, kein Backup (Datei jederzeit über einen erneuten vollen `fetch-animals.js`-Lauf ohne `--use-cache` neu erzeugbar).

**Durchgeführt:** `scripts/fetch-animals/.cache/hydration-cache.json` gelöscht, leerer `.cache`-Ordner mitentfernt.

**Verifikation danach:**
- `npm run build`: erfolgreich (`dist/` unverändert erzeugt).
- `npm run dev`: Server startet, `http://localhost:5173/` antwortet mit HTTP 200.

**Status:** Issue #48 aus Sicht `devops-engineer` erledigt. Committen/Pushen bleibt bei PM/`web-developer` (hier ohnehin nichts zu committen, da die gelöschte Datei nie in Git war).

## Issue #104: GitHub Pages Deployment eingerichtet (22.08.2026)

**Kontext:** Erste Deployment-Story für das Projekt, siehe `requirements.md` Abschnitt "Ergänzung 22.08.2026: Deployment-Entscheidung — GitHub Pages, Repo öffentlich" für die vorgelagerte Entscheidung (Repo bereits öffentlich, Interaction Limits bereits gesetzt). Diese Story ist der rein technische Deployment-Teil.

**Umgesetzt (Branch `setup/github-pages-deployment`, PR #105):**

1. `vite.config.js`: `base: "/tierquiz-kinder/"` ergänzt (Seite läuft künftig unter `https://chris-kraus.github.io/tierquiz-kinder/`, Subpfad statt Domain-Root). Lokal verifiziert: `npm run build` erzeugt jetzt korrekte `/tierquiz-kinder/assets/...`-Pfade in `dist/index.html` statt `/assets/...`.

2. Neuer Workflow `.github/workflows/deploy-pages.yml`: Trigger Push auf `main` + manueller `workflow_dispatch`; Permissions `contents: read`/`pages: write`/`id-token: write`; Concurrency-Gruppe `"pages"` (`cancel-in-progress: false`) nach GitHubs Standard-Pages-Vorlage. Build-Job (Checkout → Node 20, da kein `.nvmrc`/`engines`-Feld im Projekt vorhanden war → `npm ci` → `npm run build` → `actions/upload-pages-artifact` auf `dist/`) und Deploy-Job (`needs: build`, `actions/deploy-pages`, Environment `github-pages`).

3. GitHub Pages in den Repo-Settings aktiviert: `gh api -X POST repos/Chris-Kraus/tierquiz-kinder/pages -f build_type=workflow` — erfolgreich beim ersten Versuch. `build_type` steht jetzt auf `"workflow"`, `html_url` auf `https://chris-kraus.github.io/tierquiz-kinder/`. `status` ist aktuell `null`, da der Workflow (trigget nur auf `main`) noch keinen Lauf hatte — erwartet bis zum ersten Merge.

**Nebenbefund (behoben):** Beim Anlegen der PR schlug sowohl `gh pr create` (GraphQL-Fehler "does not have the correct permissions to execute CreatePullRequest") als auch der direkte REST-Aufruf (`GET .../pulls` → 404) fehl. Ursache verifiziert: `has_pull_requests` stand auf Repo-Ebene auf `false` (vermutlich unbeabsichtigter Nebeneffekt der private→public-Umstellung oder der Interaction-Limits-Automatisierung, nicht der eigentlichen Interaction-Limits-Einstellung selbst, die separat und korrekt über `contributors_only` läuft). Behoben per `gh api -X PATCH repos/Chris-Kraus/tierquiz-kinder -f has_pull_requests=true` — danach lief `gh pr create` ohne weitere Probleme durch. Reine Wiederherstellung eines Standard-GitHub-Features, keine sicherheitsrelevante Änderung; Interaction Limits (`contributors_only`, bis 22.02.2027) bleiben unverändert aktiv.

**Lokale Verifikation:**
- `npm run test`: 28 Dateien / 422 Tests grün.
- `npm run lint`: 13 vorbestehende Fehler in `scripts/fetch-animals/` (unrelated `no-undef`/`no-unused-vars`) — per `git stash` gegengeprüft, bereits auf `main` vorhanden, keine Regression durch diese Änderung.
- `npm run build`: erfolgreich, korrekte `/tierquiz-kinder/`-Asset-Pfade.
- Workflow-YAML manuell Zeile für Zeile gegen GitHubs offizielle Pages-Vorlage geprüft (Einrückung, `needs`-Abhängigkeit, Permissions/Concurrency/Environment-Blöcke); `actionlint`/`pyyaml` waren lokal nicht installiert, daher keine automatisierte Validierung möglich.

**Was nicht von diesem Branch aus prüfbar ist:** Der Workflow triggert nur `on: push: branches: [main]`, läuft also nicht auf dem Feature-Branch/PR selbst. Der tatsächliche Actions-Lauf, die Live-URL und der Mobile-Browser-Test (Akzeptanzkriterien aus Issue #104) sind erst nach dem Merge prüfbar — an `qa-engineer` im Issue-Kommentar entsprechend übergeben.

**Status:** PR #105 offen, nicht gemerged (Merge bleibt bei `web-developer`). Committen/Pushen für diese reine Infrastruktur-Story (kein Application-Code unter `src/**`) direkt durch `devops-engineer` vorgenommen, analog zum bereits etablierten Präzedenzfall für reine GitHub-Settings-/Infra-Änderungen in diesem Projekt.

## Referenz: GitHub-Repo-Settings (Stand 22.08.2026)

Übersicht der aktuellen Konfiguration von `https://github.com/Chris-Kraus/tierquiz-kinder/settings`, inkl. der `gh`-CLI-Aufrufe zum Prüfen/Ändern — als Nachschlagestelle für künftige Sessions, damit der Stand nicht jedes Mal neu erhoben werden muss. Hintergrund/Begründung der Entscheidungen siehe `requirements.md`, Abschnitt "Ergänzung 22.08.2026: Deployment-Entscheidung — GitHub Pages, Repo öffentlich".

**Sichtbarkeit:** `public` (vom Nutzer selbst umgestellt, ursprünglich `private`).
```bash
gh repo view Chris-Kraus/tierquiz-kinder --json visibility
# Ändern (Vorsicht, siehe requirements.md zur Begründung):
gh repo edit Chris-Kraus/tierquiz-kinder --visibility public   # bzw. --visibility private
```

**Collaborators:** Einziger Collaborator ist der Repo-Owner selbst (`Chris-Kraus`, `admin`/`push`) — niemand sonst kann direkt committen/pushen, unabhängig von der öffentlichen Sichtbarkeit. Fremde können forken + PRs öffnen (auf öffentlichen Repos technisch nicht verhinderbar), aber ein PR landet nie ohne expliziten Merge durch den Owner im Repo.
```bash
gh api repos/Chris-Kraus/tierquiz-kinder/collaborators --jq '.[] | {login, permissions}'
```

**Interaction Limits:** `contributors_only`, gültig bis **22.02.2027** — schränkt ein, wer auf Issues/PRs kommentieren/neue Issues öffnen darf, als Absicherung gegen unerwünschte Fremdkommentare auf dem jetzt öffentlichen Repo (einzige verfügbare GitHub-Bordmaßnahme dafür, da Issues aktiv bleiben müssen fürs Story-Tracking dieses Projekts). **Befristet, nicht dauerhaft** — muss nach Ablauf erneuert werden, sonst kann wieder jeder beliebige GitHub-Account kommentieren.
```bash
gh api repos/Chris-Kraus/tierquiz-kinder/interaction-limits
# Erneuern/ändern (limit: existing_users | contributors_only | collaborators_only; expiry: one_day|three_days|one_week|one_month|six_months):
gh api -X PUT repos/Chris-Kraus/tierquiz-kinder/interaction-limits -f limit=contributors_only -f expiry=six_months
# Aufheben:
gh api -X DELETE repos/Chris-Kraus/tierquiz-kinder/interaction-limits
```

**Issues/Pull Requests:** Beide aktiv (`has_issues: true`, `has_pull_requests: true`). Story-Tracking dieses Projekts läuft vollständig über GitHub Issues + Project Board — beide Features dürfen nicht deaktiviert werden, ohne den gesamten `pm-workflow`-Prozess zu brechen.
```bash
gh api repos/Chris-Kraus/tierquiz-kinder --jq '{has_issues, has_pull_requests, has_discussions, allow_forking}'
```
*Historischer Hinweis:* `has_pull_requests` war zwischenzeitlich versehentlich auf `false` gestanden (vermutlich Nebeneffekt der private→public-Umstellung), wurde im Rahmen von Issue #104 wiederhergestellt.

**GitHub Pages:** Aktiv, Quelle "GitHub Actions" (nicht ein fester Branch), Live-URL `https://chris-kraus.github.io/tierquiz-kinder/`. Deployment läuft automatisch bei jedem Push auf `main` über `.github/workflows/deploy-pages.yml` (Issue #104).
```bash
gh api repos/Chris-Kraus/tierquiz-kinder/pages --jq '{build_type, html_url, status}'
# Deploy-Historie:
gh run list --repo Chris-Kraus/tierquiz-kinder --workflow=deploy-pages.yml
```

## Claude Code GitHub Actions eingerichtet (22.08.2026)

**Kontext:** Umsetzung von `Chris-Kraus/claude-setup` #16 (automatisches PR-Review) und #18 (`@claude`-Kommentar-Bot), dort gedraftet und mit `qa-engineer`/`devops-engineer` abgestimmt (Details/Rationale in `claude-setup`, `docs/workflow/github-actions.md` — hier nur die konkrete Umsetzung für dieses Repo).

**Umgesetzt (Branch `setup/claude-code-actions`):**

1. `.github/workflows/code-review.yml` — automatisches PR-Review über `anthropics/claude-code-action`, nutzt das offizielle `code-review`-Plugin, postet Inline-Kommentare auf `pull_request`-Events. `--max-turns 5`, `timeout-minutes: 15`, Concurrency-Gruppe pro PR mit `cancel-in-progress: true`. **Kein Merge-Gate** — reiner Kommentar, kein Required Status Check (qa-engineer-Bedingung aus #16).
2. `.github/workflows/claude-assistant.yml` — `@claude`-Kommentar-Bot, **bewusst comment-only, kein Code-Push** (Nutzerentscheidung, siehe `claude-setup` #18): `contents: read` + `--disallowedTools` blockiert `Edit`/`Write`/`git push`/`git commit` zusätzlich zur Permission-Einschränkung.

**Sicherheitsrelevant für dieses Repo:** Das Action-eigene Write-Access-Gate (nur Nutzer mit Repo-Schreibrechten können `@claude` triggern) greift hier zusätzlich zu den bereits bestehenden `contributors_only`-Interaction-Limits — einziger Collaborator mit Push-Rechten ist der Repo-Owner selbst, also trotz öffentlichem Repo kein zusätzliches Risiko durch Fremd-Trigger.

**Noch offen, nicht durch diese Rolle ausführbar (Nutzer-Aktion nötig):**
- Claude GitHub App auf `Chris-Kraus/tierquiz-kinder` installieren (`https://github.com/apps/claude`, Browser-Flow).
- `ANTHROPIC_API_KEY`-Secret setzen — **erst nachdem** ein Spend-Limit in der Anthropic Console für den Key gesetzt wurde (bestätigte Guardrail aus #17), dann lokal `gh secret set ANTHROPIC_API_KEY --repo Chris-Kraus/tierquiz-kinder`.

**Bekannte technische Einschränkung:** `claude-assistant.yml` reagiert auf `issue_comment`/`pull_request_review_comment` — GitHub liest solche Workflows nur vom Default-Branch (`main`), nicht vom PR-Branch selbst. Der `@claude`-Bot funktioniert also erst nach dem Merge dieses PRs, nicht schon während der Review-Phase. `code-review.yml` (Trigger `pull_request`) validiert sich dagegen bereits auf diesem PR selbst.

## Offene Infrastruktur-Fragen

- Follow-up-Empfehlung an `web-developer`: totes `color`-Feld aus `src/quiz/difficulty.js` (`EASY_FIELDS`) und `src/quiz/questionGenerator.js` (`FIELD_DEFINITIONS.color`) entfernen (siehe oben) — keine funktionale Dringlichkeit, nur Code-Hygiene.
- Kategorien-Schieflage (Säugetiere/Vögel dominieren) ist bekannt und im Issue-Kommentar vermerkt; keine Änderung am Auswahlkriterium ohne erneute Rückmeldung des Nutzers.
- Lint-Workflow (separater CI-Check bei Push/PR, siehe Skill-Aufgabe 2) ist weiterhin nicht eingerichtet — bisher nur der Pages-Deployment-Workflow. Eigener Folge-Schritt, falls gewünscht.
- Post-Merge-Verifikation von Issue #104 (Actions-Lauf grün, Live-URL, Mobile-Test) steht noch aus — Aufgabe von `qa-engineer` nach dem Merge von PR #105.
