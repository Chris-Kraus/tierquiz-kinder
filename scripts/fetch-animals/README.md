# fetch-animals

Wikidata-Datenbeschaffungs-Pipeline für die Tierquiz-Datenbank (`data/animals.json`).
Umsetzung von GitHub Issue #2, siehe `docs/workflow/architecture.md` Abschnitt
"Skizze: Datenbeschaffung aus Wikidata" für die zugrundeliegende Architektur-Entscheidung.

## Ausführung

Voraussetzung: Node.js ≥ 18 (nutzt eingebautes `fetch`, keine npm-Abhängigkeiten).

```bash
node scripts/fetch-animals/fetch-animals.js
```

Das Skript ist **offline/on-demand** gedacht, kein Teil des App-Laufzeitpfads
(siehe architecture.md, "Datenfluss & zentrale Komponenten"). Laufzeit: ca.
5–10 Minuten (Wikidata Query Service braucht pro Tier-Klasse ~20–25s; die
Detail-Hydration per API ist danach deutlich schneller).

Schreibt `data/animals.json` (überschreibt eine vorhandene Datei). Bei erneutem
Bedarf (aktualisierte Wikidata-Daten) das Skript einfach erneut ausführen.

**Cache für schnelle Re-Runs bei reinen Schema-/Filter-Änderungen:**

```bash
node scripts/fetch-animals/fetch-animals.js --use-cache
```

Jeder volle Lauf (Discovery + Hydration) schreibt die rohen, hydrierten
Wikidata-Daten nach `scripts/fetch-animals/.cache/hydration-cache.json`
(git-ignoriert, reines Build-Artefakt). Mit `--use-cache` überspringt das
Skript Phase 1+2 komplett und wendet nur Phase 3 (Zusammenbau + Validierung +
Schreiben von `data/animals.json`) auf die zwischengespeicherten Rohdaten an —
nützlich, wenn sich nur ändert, welche Felder Pflicht sind oder wie sie
verarbeitet werden, ohne erneut gegen Wikidata zu fetchen (spart Zeit und
API-Last). Ohne Cache-Datei fällt `--use-cache` automatisch auf einen vollen
Fetch zurück.

## Ablauf

1. **Discovery** (SPARQL, `query.wikidata.org/sparql`): pro Tier-Klasse
   (Säugetier/Mammalia, Vogel/Aves, Reptil/Reptilia, Amphibie/Amphibia,
   Fisch/Actinopterygii, Insekt/Insecta, Spinnentier/Arachnida,
   Weichtier/Mollusca) werden Arten (`taxon rank = species`, Property P105)
   gesucht, deren Sitelink-Anzahl > 15 ist (Popularitäts-Proxy, siehe
   `requirements.md`), fossile/ausgestorbene Taxa werden ausgeschlossen.
   Ergebnis wird pro Klasse nach Sitelinks sortiert.
2. **Merge & globale Sortierung**: alle Klassen-Kandidaten werden
   zusammengeführt (Dedupe über QID) und global nach Sitelinks absteigend
   sortiert — die reine Popularität entscheidet, keine manuelle Kuratierung
   (siehe architecture.md, "Offene technische Fragen — Entscheidungen", Punkt 3).
3. **Hydration** (Wikidata-API `wbgetentities`, Batches à 50 IDs): für den
   Kandidaten-Pool werden die Detail-Claims geladen (Gewicht, Länge,
   wissenschaftlicher Name, Habitat, Gefährdungsstatus, "endemic to" als
   Kontinent-Proxy).
4. **Validierung**: jeder Datensatz wird gegen die Pflichtfelder aus dem
   formalen JSON Schema (architecture.md Abschnitt 2) geprüft — seit der
   Schema-Korrektur vom 13.08.2026 nur noch `id`, `name_de`, `category`
   (siehe "Bekannte Datenlücken & Schema-Korrektur" unten für den Grund).
   Nur vollständig valide Datensätze landen in der finalen `animals.json`
   (bis zu 500, nach Sitelinks sortiert). `habitat`/`continent`/`weight_kg`/
   `length_cm`/`conservation_status`/`name_scientific` werden aufgenommen,
   wenn vorhanden, sonst weggelassen. Das Skript validiert die geschriebene
   Datei am Ende noch einmal selbst und meldet Fehler über den Exit-Code.

## Verifizierte / korrigierte Property- und Item-IDs

Die Architektur-Skizze markierte ihre Property-IDs explizit als
"zur Illustration, vor Umsetzung verifizieren". Bei der Umsetzung wurden
folgende IDs gegen echte Wikidata-Testabfragen geprüft und teils korrigiert:

| Zweck | Property/Item | Bemerkung |
|---|---|---|
| Taxon-Rang "Art" | `wdt:P105` = `wd:Q7432` | wie in der Skizze, verifiziert an Q140 (Löwe) |
| Elterntaxon (transitiv) | `wdt:P171*` | wie in der Skizze |
| Säugetiere | `wd:Q7377` | wie erwartet |
| Vögel | `wd:Q5113` | wie erwartet |
| Reptilien | `wd:Q10811` | **nicht** Q10811-artige Rateversuche — per `P225`-Testabfrage verifiziert |
| Amphibien | `wd:Q10908` | verifiziert |
| Fische (Strahlenflosser) | `wd:Q127282` (Actinopterygii) | verifiziert; deckt die weit überwiegende Mehrheit der "Fische" ab |
| Insekten | `wd:Q1390` | verifiziert |
| Spinnentiere | `wd:Q1358` | verifiziert |
| Weichtiere | `wd:Q25326` | verifiziert |
| Fossile/ausgestorbene Taxa ausschließen | `wdt:P31` = `wd:Q23038290` ("fossil taxon") | **nicht in der Skizze enthalten** — ergänzt, da sonst z. B. Tyrannosaurus (hohe Sitelink-Zahl) als "Reptil" ins Tierquiz gerutscht wäre |
| Gewicht | `wdt:P2067` (mass) | wie in der Skizze; Werte sind Quantity-Statements mit Einheit (kg/g/t/lb), Median aller konvertierbaren Werte wird verwendet (mehrere Statements pro Tier üblich, z. B. nach Geschlecht) |
| Länge | `wdt:P2043` (length) | wie in der Skizze |
| Wissenschaftlicher Name | `wdt:P225` (taxon name) | wie in der Skizze |
| Gefährdungsstatus | `wdt:P141` (IUCN conservation status) | wie in der Skizze; Mapping auf das 4-stufige Schema-Enum siehe unten. **Achtung:** der reale Item-QID für "endangered" ist `Q96377276`, nicht das naheliegend vermutete `Q11394` — per Testabfrage über reale Artikel-Daten korrigiert |
| Habitat | `wdt:P2974` (habitat) | in der Skizze nicht mit Property-ID benannt, nur als Risikofeld erwähnt — ergänzt |
| Kontinent | `wdt:P183` (endemic to) → Zielort → `wdt:P30` (continent) | **kein Bestandteil der Architektur-Skizze.** Es gibt keine direkte, gut gepflegte "Kontinent"-Property auf Artebene (siehe "Bekannte Datenlücken" unten) — dies ist der am ehesten belastbare Ersatz, real getestet |

## Bekannte Datenlücken & Schema-Korrektur (13.08.2026)

Die Architektur-Skizze warnte bereits vor lückenhafter Wikidata-Abdeckung für
`habitat`/`diet`. Ein erster vollständiger Testlauf des Skripts gegen den
echten Wikidata Query Service (1.480 hydrierte Kandidaten über alle 8
Tier-Klassen, sitelinks > 15) zeigte: das Problem ist **deutlich
weitreichender** als die Skizze angenommen hatte — auch bei den damaligen
Pflichtfeldern. Gemessene Ist-Abdeckung über den vollen Kandidaten-Pool:

| Feld | Abdeckung im echten Lauf | Befund |
|---|---|---|
| `color` | **0 / 1.480 (0 %)** | Keine belastbare strukturierte Wikidata-Property für Tierfarbe gefunden. Die generische `color`-Property (`P462`) wird für Tierarten praktisch nie verwendet. Farbangaben stehen bei Wikipedia/Wikidata nur als Fließtext im Artikel, nicht als Statement. |
| `habitat` | 72 / 1.480 (**4,9 %**) | `P2974` (habitat) ist selbst bei sehr bekannten Arten selten gepflegt. |
| `continent` | 93 / 1.480 (**6,3 %**) | Es gibt **keine** direkte "Kontinent"-Property auf Artebene. Der Umweg über `P183` ("endemic to") → `P30` (continent) greift nur bei tatsächlich endemischen Arten — bei weitverbreiteten, gerade den bekanntesten Tieren (Löwe, Elefant, Wolf, Delfin ...) ist "endemic to" semantisch gar nicht anwendbar und bleibt leer. Stichprobe direkt verifiziert: Löwe (Q140), "Kaninchen" (Q9394) und Elefant (Q7378) haben **0** Habitat- und **0** "endemic to"-Statements. |
| `weight_kg` | 213 / 1.480 (**14,4 %**) | Deutlich besser abgedeckt bei Säugetieren (z. B. Löwe: korrekt aus mehreren Gewichts-Statements ermittelt, Median 126 kg), aber über den gemischten Pool aus allen 8 Klassen gemittelt bricht die Abdeckung stark ein — Vögel, Reptilien, Amphibien, Fische, Insekten und Weichtiere haben `P2067` (mass) nur selten gepflegt. |

**Ursprüngliches Ergebnis:** Bei strikter Durchsetzung aller damaligen
Pflichtfelder erfüllten **0 von 1.480** hydrierten, nach Popularität
ausgewählten Kandidaten alle Pflichtfelder gleichzeitig — nicht weil das
Skript fehlschlug (Discovery und Hydration liefen technisch fehlerfrei
durch, inkl. korrekter Einheiten-Konvertierung und Popularitäts-Sortierung),
sondern weil die Schnittmenge "Tier hat gleichzeitig Gewicht **und** Habitat
**und** Kontinent **und** Farbe in Wikidata" praktisch leer war. Gezielt
gegengeprüft, um einen Skript-Bug auszuschließen: die Extraktionslogik
funktioniert nachweislich korrekt (Löwe bekommt z. B. korrekt
`weight_kg = 126` aus den realen Gewichts-Statements berechnet) —
`habitat`/`continent` sind für dieselben Tiere schlicht mit 0 Statements in
Wikidata hinterlegt.

**Entscheidung des Nutzers (13.08.2026, siehe Issue #2):** Schema angepasst
statt zusätzliche Datenquelle oder Zielgröße reduziert:
1. Pflichtfelder auf `id`, `name_de`, `category` reduziert. `habitat`,
   `continent`, `weight_kg`, `length_cm`, `diet`, `lifespan_years`,
   `conservation_status` sind optional (werden aufgenommen, wenn Wikidata-
   Daten vorhanden sind, sonst weggelassen) — siehe `architecture.md`,
   "Korrektur vom 13.08.2026".
2. `color` komplett aus dem Schema entfernt (nicht nur optional gesetzt),
   da 0 % Abdeckung durch "optional" nicht behoben würde.

Es wurden zu keinem Zeitpunkt Platzhalter-/Fake-Werte erzeugt, um
Pflichtfelder künstlich aufzufüllen — echte Datenlücken werden als fehlende
optionale Felder abgebildet, nicht verschleiert.

**Ergebnis nach der Schema-Korrektur** (Rebuild via `--use-cache`, kein
erneuter Wikidata-Fetch nötig): 500 von 500 Ziel-Tieren erfolgreich in
`data/animals.json` geschrieben, alle mit `id`/`name_de`/`category`. Reale
Abdeckung der optionalen Felder in den finalen 500: `name_scientific` 100 %,
`conservation_status` 94 %, `weight_kg` 42 %, `habitat` 13,4 %, `continent`
5,6 %, `length_cm` 2,2 %. Details und die durch die reine
Sitelinks-Sortierung bedingte Kategorien-Schieflage (Säugetiere/Vögel
zusammen 87,4 % der 500) siehe `docs/workflow/devops.md`.

## Nicht befüllte Felder (bewusste Entscheidung, kein Bug)

- `fun_fact`: bleibt beim initialen Import unbefüllt (siehe architecture.md,
  "Offene technische Fragen — Entscheidungen", Punkt 1).
- `diet`: keine belastbare, direkt auf das 3-stufige Schema-Enum
  (Fleischfresser/Pflanzenfresser/Allesfresser) abbildbare Wikidata-Property
  gefunden. Eine Ableitung über die taxonomische Ordnung (z. B. "Carnivora ⇒
  Fleischfresser") wurde bewusst **nicht** umgesetzt, da sie im Einzelfall
  falsch wäre (Beispiel: Großer Panda ist taxonomisch Carnivora, ernährt sich
  aber überwiegend von Bambus). Bleibt daher in dieser Story komplett leer.
- `lifespan_years`: in dieser Story nicht hydriert (kein in der Architektur-
  Skizze benanntes, verifiziertes Property für Lebenserwartung mit
  ausreichender Abdeckung geprüft) — optionales Feld, kein Blocker.
