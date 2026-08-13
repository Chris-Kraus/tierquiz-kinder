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
   formalen JSON Schema (architecture.md Abschnitt 2) geprüft. Nur
   vollständig valide Datensätze landen in der finalen `animals.json`
   (bis zu 500, nach Sitelinks sortiert). Das Skript validiert die
   geschriebene Datei am Ende noch einmal selbst und meldet Fehler über den
   Exit-Code.

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

## Bekannte Datenlücken (wichtig für Datenqualität)

Die Architektur-Skizze warnte bereits vor lückenhafter Wikidata-Abdeckung für
`habitat`/`diet`. Beim tatsächlichen Testen gegen den echten Wikidata Query
Service zeigte sich, dass das Problem **deutlich weiterreichender** ist, als
die Skizze angenommen hat — auch bei Pflichtfeldern:

- **`continent`** (Pflichtfeld): Es gibt **keine** direkte, verlässlich
  gepflegte "Kontinent"-Property auf Artebene in Wikidata. Selbst absolute
  Vorzeige-Einträge wie Löwe (Q140), Tiger, Elefant, Pferd oder Delfin haben
  **keine** strukturierten Geo-Verbreitungsdaten als direkte Statements.
  Der in diesem Skript genutzte Umweg über `P183` ("endemic to") + `P30`
  greift nur bei tatsächlich endemischen Arten (bei stichprobenartigem Test:
  ca. 12–13 % der populären Säugetier-Kandidaten hatten überhaupt einen
  `P183`-Wert) — bei weitverbreiteten, gerade den bekanntesten Tieren (Löwe,
  Elefant, Wolf, Fuchs, Delfin ...) ist "endemic to" semantisch gar nicht
  anwendbar und bleibt leer.
- **`color`** (Pflichtfeld): Es existiert **keine** brauchbare strukturierte
  Wikidata-Property für die Farbe eines Tieres (getestete generische
  `color`-Property `P462` wird für Tierarten praktisch nicht verwendet,
  Stichprobe: ca. 0,2 % Abdeckung unter populären Säugetieren). Farbangaben
  stehen bei Wikipedia/Wikidata i. d. R. nur als Fließtext im Artikel, nicht
  als strukturiertes Statement. Es wurde **bewusst keine Farbe erfunden oder
  aus Bildern/Fließtext geraten** — das Feld bleibt leer, wo keine
  strukturierten Daten vorliegen.
- **`habitat`** (Pflichtfeld): wie von der Architektur-Skizze erwartet lückenhaft
  (Stichprobe: ca. 8–9 % Abdeckung unter populären Säugetieren via `P2974`).

**Konsequenz:** Da `habitat`, `continent` und `color` laut dem in
`architecture.md` festgelegten formalen JSON Schema **Pflichtfelder** sind,
werden Tiere, für die diese Wikidata-Daten fehlen, aus der finalen
`animals.json` ausgeschlossen (nicht mit Platzhaltern aufgefüllt). Die
tatsächliche Anzahl der resultierenden Tiere liegt dadurch **deutlich unter
den angestrebten ~500** — siehe Lauf-Ergebnis in
`docs/workflow/devops.md` und im Kommentar zu Issue #2 für die konkrete Zahl.

Das ist kein Bug im Skript, sondern eine reale Grenze der Datenquelle
gegenüber der Schema-Annahme aus der Architektur-Skizze. Mögliche nächste
Schritte (Entscheidung liegt bei `software-architect`, nicht bei diesem
Skript): `habitat`/`continent`/`color` im Schema optional statt Pflicht
setzen, eine zusätzliche Datenquelle für diese Felder ergänzen (z. B.
kuratierte Zusatzdaten), oder die Zielgröße von ~500 auf die real erreichbare
Menge anpassen.

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
