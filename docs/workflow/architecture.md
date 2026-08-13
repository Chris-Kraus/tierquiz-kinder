# Architecture: Tierquiz für Kinder

Dieses Dokument ist die technische Architektur-Klammer für das Projekt. Aktueller Fokus (siehe `docs/workflow/requirements.md`): ausschließlich der Spielmodus "Quizfragen" und die dafür nötige Tierdatenbank. Es wird als lebendes Dokument gepflegt, gebündelte Commits statt Commit pro Kleinständerung.

## Tech-Stack & Begründung

Diese Datei behandelt zwei Bereiche: die **Datenschicht** (Format, Struktur und Beschaffung der Tierdatenbank) und den **Frontend-Tech-Stack** (Framework, Build-Tooling, Einbindung der Daten) für die eigentliche Quiz-App.

### Datenschicht

Festgelegt für die Datenschicht:
- **Format:** Eine lokale JSON-Datei (`data/animals.json`), zur Build-/Entwicklungszeit aus Wikidata generiert und offline mit der App ausgeliefert (siehe nicht-funktionale Anforderung "lokale Lauffähigkeit ohne Internetzwang" in `requirements.md`). Kein Datenbank-Server nötig — für ~500 Tiere ist eine einzelne JSON-Datei völlig ausreichend, ein DBMS wäre Overengineering für diesen Umfang.
- **Datenquelle:** Wikidata (SPARQL/API), CC0-lizenziert. Bereits mit dem Nutzer bindend geklärt (siehe `requirements.md`).

### Frontend

**Entscheidung: Vite + Vanilla JavaScript (ES-Module), kein UI-Framework.**

Kein React/Vue/Angular und auch kein leichtgewichtigeres Framework wie Svelte — stattdessen reines JavaScript mit DOM-Manipulation, organisiert in kleinen Modulen pro Bildschirm/Verantwortlichkeit. Als Build-/Dev-Tooling: **Vite** (Dev-Server mit Hot-Reload + Produktions-Bundler), npm als Paketmanager. Styling mit **plain CSS** (keine CSS-Frameworks wie Tailwind/Bootstrap), organisiert in wenigen Dateien (global + pro Bildschirm).

**Begründung:**

- **Umfang rechtfertigt kein Framework:** Die App hat laut `ux-design`/`requirements.md` genau vier Bildschirmtypen (Start, Frage, Feedback ist Teil des Frage-Bildschirms, Ergebnis) und einen simplen, linearen Zustand (aktuelle Frage, Punktestand, gewählte Schwierigkeitsstufe). Das ist mit einfachen JS-Funktionen und gezielten DOM-Updates gut lesbar und wartbar abbildbar — ein Framework mit eigenem Reaktivitäts-/Component-Modell (React, Vue, auch Svelte) wäre zusätzliche Lern- und Abhängigkeits-Last ohne erkennbaren Mehrwert für diesen Umfang. Das entspricht explizit dem Auftrag aus Issue #1, Overengineering zu vermeiden.
- **Kein Server nötig, trotzdem moderne DX:** Vite braucht keinen Backend-Server — es ist nur ein Dev-Server für die lokale Entwicklung und ein Bundler, der am Ende reine statische Dateien (`index.html`, JS, CSS) erzeugt. Das passt exakt zur nicht-funktionalen Anforderung "kein Backend/Server nötig, statische Auslieferung reicht". Gegenüber komplett werkzeuglosem Vanilla-JS (`<script>`-Tags ohne Build-Schritt) gewinnt man dabei: ES-Module mit sauberer Aufteilung in Dateien, einen Dev-Server mit Hot-Reload (schnelleres Entwickeln), und — wichtig für die Datenanbindung — nativen JSON-Modul-Import.
- **`data/animals.json`-Einbindung:** Die Datei wird per statischem ES-Modul-Import zur Build-Zeit eingebunden (`import animals from '../../data/animals.json'`), den Vite nativ unterstützt. Damit landet die Tierdatenbank direkt im JS-Bundle — kein `fetch()` zur Laufzeit nötig, keine Netzwerkabhängigkeit, und keine potenziellen `file://`-CORS-Probleme beim rein lokalen Öffnen. Das erfüllt die nicht-funktionale Anforderung "lokale Lauffähigkeit ohne Internetzwang" unmittelbar auch für die Frontend-Seite (nicht nur für die Datenbeschaffung, siehe Datenschicht oben).
- **Später iPad-Browser-tauglich, ohne Neubau:** Vite erzeugt am Ende Standard-Web-Technologien (HTML/CSS/JS als statische Assets über `vite build` → Ordner `dist/`), die auf jedem modernen Browser laufen, inklusive Safari auf dem iPad — keine plattformspezifische Nativ-Lösung, kein Rewrite nötig. Der Wechsel von "lokal am Rechner öffnen/servieren" zu "auf einem beliebigen statischen Webhost für iPad-Zugriff deployen" ist rein eine Frage des Hostings, nicht der Architektur.
- **Kein ungenutzter Vorbau:** Kein Bilder-Handling (keine Bild-Asset-Pipeline nötig), kein Sound (keine Audio-Bibliothek), keine Mehrsprachigkeit (kein i18n-Setup), kein Backend (kein API-Layer, kein State-Sync) — passend zum aktuellen Scope laut `requirements.md`, "Explizit außerhalb des Scopes". Diese Punkte sind bewusst nicht vorbereitet, da sie aktuell keinen Anlass haben; die gewählte Struktur (siehe unten) steht einer späteren Erweiterung aber nicht im Weg.
- **JavaScript statt TypeScript:** Für ein Hobby-/Kleinprojekt mit überschaubarer Logik (Fragegenerierung, einfacher UI-Zustand) ist der Zusatznutzen von TypeScript (Typsicherheit) gegenüber dem Zusatzaufwand (Type-Definitionen, Kompilierschritt-Feinheiten) in diesem Umfang gering. Vite unterstützt TypeScript nativ, falls `web-developer` es bei der Umsetzung doch bevorzugt — keine architektonische Festlegung dagegen, nur keine Vorgabe dafür.
- **Testing (optional, nicht jetzt verbindlich):** Falls für die Fragegenerierungs-Logik (Auswahl korrekter/falscher Antworten je Schwierigkeitsstufe) Tests gewünscht sind, passt **Vitest** nahtlos zu Vite (gleiche Konfiguration, kein zusätzliches Tooling-Ökosystem). Keine verbindliche Vorgabe in diesem Schritt, nur als naheliegende Option vermerkt, falls `web-developer` das für sinnvoll hält.

## Projektstruktur (Ordner/Module)

Vorschlag für das Gesamt-Repo, inkl. Frontend-Teil (siehe Tech-Stack-Entscheidung oben: Vite + Vanilla JS):

```
tierquiz-kinder/
├── index.html                 # Vite-Einstiegspunkt (HTML-Root, referenziert src/main.js)
├── package.json               # npm-Abhängigkeiten (u. a. vite)
├── vite.config.js             # Vite-Konfiguration (i. d. R. minimal)
├── src/
│   ├── main.js                 # App-Einstiegspunkt, initialisiert den Start-Bildschirm
│   ├── screens/                 # Ein Modul je Bildschirm aus dem Nutzerfluss (ux-design.md)
│   │   ├── start.js              # Start-Bildschirm inkl. Schwierigkeitsstufen-Auswahl
│   │   ├── question.js           # Frage-Bildschirm inkl. Antwortauswahl & Feedback
│   │   └── result.js             # Ergebnis-/Abschluss-Bildschirm
│   ├── quiz/                    # Quiz-Logik, unabhängig von der Darstellung
│   │   ├── state.js               # Laufender Zustand (aktuelle Frage, Punktestand, Stufe)
│   │   ├── questionGenerator.js   # Fragenauswahl aus data/animals.json, Falschantworten-Logik
│   │   └── difficulty.js          # Zuordnung Felder → Schwierigkeitsstufe (siehe Abschnitt unten)
│   ├── styles/                  # Plain CSS
│   │   ├── global.css             # Basis-Styles, Farb-/Abstands-Tokens (siehe ux-design.md)
│   │   └── ...                    # ggf. weitere Dateien pro Bildschirm
│   └── assets/                  # Statische Assets (z. B. Maskottchen-Illustration) — keine Tierbilder (siehe Scope)
├── data/
│   └── animals.json          # Generierte Tierdatenbank (siehe Schema unten), per ES-Modul-Import in src/quiz eingebunden
├── scripts/
│   └── fetch-animals/        # Wikidata-Abruf-Pipeline (spätere Umsetzung durch devops-engineer/web-developer)
├── tests/                     # Optional (siehe Tech-Stack-Begründung), z. B. Vitest für questionGenerator.js
├── docs/
│   └── workflow/
│       ├── requirements.md
│       └── architecture.md
└── README.md
```

Die Trennung `screens/` (Darstellung/Interaktion) vs. `quiz/` (reine Logik) ist bewusst: `questionGenerator.js`/`difficulty.js` lassen sich so unabhängig von DOM-Code testen, und die Fragegenerierungs-Logik bleibt an einer Stelle gebündelt statt über Bildschirm-Module verstreut.

`scripts/fetch-animals/` ist ein Vorschlag zur Trennung von "Daten beschaffen" (offline, einmalig/gelegentlich neu ausführbar) und "Daten nutzen" (App liest nur die fertige `animals.json`, keine Laufzeit-Abhängigkeit zu Wikidata).

## Datenfluss & zentrale Komponenten

```
Wikidata (SPARQL/API)
      │  (einmalig / bei Bedarf erneut ausgeführt, nicht zur Laufzeit der App)
      ▼
fetch-animals-Skript  →  data/animals.json  (lokal, offline, CC0)
      │
      ▼
Quiz-App liest ausschließlich die lokale JSON-Datei zur Laufzeit
```

Die Trennung ist bewusst: Die App selbst hat zur Laufzeit keine Netzwerkabhängigkeit zu Wikidata (Anforderung "lokale Lauffähigkeit ohne Internetzwang"). Der Abruf-Schritt ist ein separater, vorgelagerter Prozess.

## Technische Entscheidungen & Trade-offs

### 1. Datenschema für `animals.json`

**Datei-Struktur (Top-Level):**

```json
{
  "schema_version": "1.0.0",
  "license": "CC0-1.0",
  "source": "Wikidata",
  "source_url": "https://www.wikidata.org/",
  "retrieved_at": "2026-08-13",
  "animals": [ /* ... siehe unten ... */ ]
}
```

**Pro-Tier-Datensatz — Felder und Begründung:**

| Feld | Typ | Pflicht | Begründung / Quiz-Nutzen |
|---|---|---|---|
| `id` | string (Wikidata-QID, z. B. `"Q140"`) | ja | Eindeutiger Schlüssel, ermöglicht Rückverfolgung zur Quelle und späteres Re-Fetching/Update einzelner Datensätze. |
| `name_de` | string | ja | Anzeigename, Basis jeder Frage. |
| `name_scientific` | string | nein | Wissenschaftlicher Name (z. B. "Panthera leo") — eigener kleiner Fragetyp möglich ("Wie heißt der Löwe auf Latein?"), aber nicht bei jedem Tier gleich einprägsam für Kinder, daher optional. |
| `category` | string, Enum (Säugetier, Vogel, Reptil, Amphibie, Fisch, Insekt, Spinnentier, ...) | ja | Klassischer, gut verständlicher Kinderquiz-Fragetyp ("Zu welcher Tiergruppe gehört ...?") und nützlich, um plausible Falsch-Antworten aus derselben/anderen Kategorie zu ziehen. |
| `habitat` | array\<string\> | ja | Vom Nutzer vorgegeben. Array statt Einzelwert, da Tiere oft mehrere Lebensräume haben (z. B. Frosch: Süßwasser + Land). |
| `continent` | array\<string\> | ja | Ergänzt `habitat` um eine zweite, unabhängige geografische Achse ("Wo lebt ...?" als Kontinent vs. Lebensraumtyp wie Wald/Wüste/Ozean). Beide Felder decken unterschiedliche, für Kinder gut verständliche Fragetypen ab. |
| `diet` | string, Enum (Fleischfresser, Pflanzenfresser, Allesfresser) | nein* | Guter, einfacher Fragetyp ("Was frisst ...?"). Optional, weil auf Wikidata nicht für jede Art gleich sauber strukturiert erfasst (siehe Risiko unten). |
| `weight_kg` | number | ja | Vom Nutzer vorgegeben. Einzelwert (typisches/durchschnittliches Gewicht), bewusst **keine** Min/Max-Spanne — für ein Kinderquiz reicht ein ungefährer, vergleichbarer Wert; eine Spanne wäre zusätzliche Komplexität ohne klaren Mehrwert für Multiple-Choice-Fragen. |
| `length_cm` | number | nein | Analog zu Gewicht: guter Vergleichs-Fragetyp ("Welches Tier ist größer?"). Optional, da auf Wikidata seltener sauber erfasst als Gewicht. |
| `color` | array\<string\> | ja | Vom Nutzer vorgegeben. Array, da viele Tiere mehrfarbig sind. |
| `lifespan_years` | number | nein | Ungefähre Lebenserwartung — eigener, bei Kindern beliebter Fragetyp ("Wie alt wird ein ...?"). Optional, Datenlage auf Wikidata schwankt. |
| `conservation_status` | string, Enum (z. B. nicht gefährdet / gefährdet / stark gefährdet / vom Aussterben bedroht) | nein | Bildungswert (Artenschutz-Bewusstsein), aus IUCN-Daten auf Wikidata strukturiert verfügbar (Property P141). Kein zentraler Quiz-Fragetyp, aber sinnvoll als Zusatzinfo/gelegentliche Frage. Bewusst optional, kein Pflichtfeld, um die Datenbeschaffung nicht an lückenhafte IUCN-Abdeckung zu koppeln. |
| `fun_fact` | string | nein | Kurzer, kindgerechter Fakt — hoher Engagement-Wert (z. B. als Zusatzinfo nach Beantwortung). **Wichtig:** Wikidata hat kein strukturiertes "Fun Fact"-Feld, das müsste separat kuratiert werden (siehe Offene Fragen). |

*\* `diet` ist inhaltlich ein starker Kandidat für "Pflicht", wird aber wegen unsicherer Wikidata-Abdeckung (siehe Risiko-Absatz unten) als optional geführt, bis die tatsächliche Datenlage geprüft ist.*

**Bewusst weggelassen (kein Overengineering):**
- **Volle taxonomische Klassifikation** (Familie, Ordnung, Gattung als eigene Baumstruktur) — für ein Kinderquiz reicht `category` (grobe Klasse) + optional `name_scientific`. Ein voller Taxonomie-Baum wäre Komplexität ohne erkennbaren Quiz-Nutzen in Phase 1.
- **Populationszahlen** — zu abstrakt für Kinder, kein klarer Fragetyp.
- **Fortpflanzung/Tragzeit** — kein Bezug zum aktuellen Scope, ggf. relevant für einen späteren Spielmodus, hier nicht mitgeplant.
- **Fressfeinde/Beute-Beziehungen** — inhaltlich reizvoll ("Wer frisst wen?"), aber strukturell ein Graph statt einer flachen Tabelle — deutlich mehr Komplexität. Als Idee für einen möglichen späteren Spielmodus vermerkt, nicht Teil von Phase 1.
- **Mehrsprachige Namen** — aktueller Scope ist Deutsch (siehe offene Frage in `requirements.md`); `name_scientific` dient bereits als sprachneutraler Anker, falls Mehrsprachigkeit später kommt.
- **Geschlechtsspezifische Werte** (z. B. Gewicht getrennt nach Männchen/Weibchen) — unnötige Präzision für ein Kinderquiz, ein einzelner Näherungswert reicht.
- **Bild-URL/Bildlizenzfelder** — laut Scope explizit ausgeschlossen in dieser Phase. Wenn Bilder für spätere bildbasierte Spielmodi ergänzt werden, braucht das ein eigenes Lizenzmodell **pro Bild** (Wikimedia-Commons-Bilder sind i. d. R. CC-BY-SA/CC-BY mit Attributionspflicht, anders als der CC0-Textdatensatz hier) — bewusst nicht in dieses Schema vorgezogen, da sonst ungenutzte Komplexität entstünde.
- **Geräusch-Referenzen** (für den späteren "Tiergeräusche erkennen"-Modus) — nur als Randnotiz für später, nicht Teil dieses Schemas.

### 2. Formales JSON Schema

Zur Validierung durch `web-developer`/`devops-engineer` bei der Umsetzung:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Tierquiz Tierdatenbank",
  "type": "object",
  "required": ["schema_version", "license", "source", "retrieved_at", "animals"],
  "properties": {
    "schema_version": { "type": "string" },
    "license": { "type": "string", "const": "CC0-1.0" },
    "source": { "type": "string" },
    "source_url": { "type": "string", "format": "uri" },
    "retrieved_at": { "type": "string", "format": "date" },
    "animals": {
      "type": "array",
      "items": { "$ref": "#/$defs/animal" }
    }
  },
  "$defs": {
    "animal": {
      "type": "object",
      "required": ["id", "name_de", "category", "habitat", "continent", "weight_kg", "color"],
      "properties": {
        "id": { "type": "string", "pattern": "^Q[0-9]+$" },
        "name_de": { "type": "string", "minLength": 1 },
        "name_scientific": { "type": "string" },
        "category": {
          "type": "string",
          "enum": ["Säugetier", "Vogel", "Reptil", "Amphibie", "Fisch", "Insekt", "Spinnentier", "Weichtier", "Sonstiges"]
        },
        "habitat": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "continent": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "diet": {
          "type": "string",
          "enum": ["Fleischfresser", "Pflanzenfresser", "Allesfresser"]
        },
        "weight_kg": { "type": "number", "exclusiveMinimum": 0 },
        "length_cm": { "type": "number", "exclusiveMinimum": 0 },
        "color": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "lifespan_years": { "type": "number", "exclusiveMinimum": 0 },
        "conservation_status": {
          "type": "string",
          "enum": ["nicht gefährdet", "gefährdet", "stark gefährdet", "vom Aussterben bedroht"]
        },
        "fun_fact": { "type": "string" }
      }
    }
  }
}
```

**Beispieldatensatz (Löwe):**

```json
{
  "id": "Q140",
  "name_de": "Löwe",
  "name_scientific": "Panthera leo",
  "category": "Säugetier",
  "habitat": ["Savanne", "Grasland"],
  "continent": ["Afrika"],
  "diet": "Fleischfresser",
  "weight_kg": 190,
  "length_cm": 250,
  "color": ["Goldbraun"],
  "lifespan_years": 14,
  "conservation_status": "gefährdet",
  "fun_fact": "Löwen sind die einzigen Katzen, die in Gruppen (Rudeln) leben."
}
```

### 3. Lizenz-/Quellenangabe: Datei-Ebene statt pro Tier

**Entscheidung:** Lizenz und Quelle werden **einmal auf Datei-/Metadaten-Ebene** hinterlegt (`license`, `source`, `source_url`, `retrieved_at` im Top-Level-Objekt, siehe oben), **nicht** als Pflichtfeld bei jedem einzelnen Tier.

**Begründung:** CC0 ("No Rights Reserved") ist die stärkste Form der Freigabe — sie verzichtet ausdrücklich auf alle Rechte einschließlich einer Attributionspflicht. Anders als bei CC-BY oder CC-BY-SA (wie Wikipedia-Artikeltext) gibt es rechtlich keine Pflicht, pro Datensatz eine Quellenangabe mitzuführen. Ein Lizenzfeld pro Tier wäre daher reine Redundanz ohne rechtlichen Mehrwert. Die Datei-Ebene reicht aus für:
- Nachvollziehbarkeit/Provenienz (woher kommen die Daten, wann wurden sie abgerufen),
- Reproduzierbarkeit (das `id`-Feld pro Tier verweist bereits auf die Wikidata-QID, das ist die eigentliche Rückverfolgbarkeit auf Datensatz-Ebene, kein separates Lizenzfeld nötig).

**Wichtiger Hinweis für später:** Sobald in einer späteren Phase Bilder (Wikimedia Commons) hinzukommen, gilt das **nicht** mehr 1:1 — Commons-Bilder haben oft CC-BY/CC-BY-SA-Lizenzen mit Attributionspflicht **pro Bild**. Das braucht dann ein eigenes Lizenzfeld pro Bild-Datensatz. Bewusst nicht in dieses Schema vorgezogen (kein Overengineering für aktuellen Scope), aber als Präzedenzfall hier dokumentiert, damit es beim späteren Schema-Erweitern nicht vergessen wird.

### 4. Skizze: Datenbeschaffung aus Wikidata

Dies ist eine **grobe technische Skizze als Grundlage** für die spätere Umsetzung durch `devops-engineer`/`web-developer` — keine fertige Implementierung. Konkrete Property-IDs sollten vor Umsetzung gegen die aktuelle Wikidata-Doku verifiziert werden.

**Empfohlener zweistufiger Ansatz:**

1. **Kandidaten-Auswahl (Discovery):** Eine SPARQL-Query gegen den Wikidata Query Service (`query.wikidata.org/sparql`), die Arten (`wdt:P31`/`wdt:P279*` auf Taxon-Klassen wie Mammalia, Aves, Reptilia, ...) mit deutschem Label findet. **Wichtig:** Eine reine "alle Taxa"-Query liefert Millionen Einträge, viele davon obskure Arten (z. B. seltene Käfer), die für ein Kinderquiz ungeeignet sind. Empfehlung: Auswahl zusätzlich nach **Bekanntheit** eingrenzen, z. B. über die Anzahl der Wikipedia-Sprachversionen (Sitelinks) oder einen Popularitäts-Proxy wie QRank — so kommen bevorzugt bekannte Tiere (Löwe, Elefant, Delfin, Papagei ...) in die Auswahl statt zufälliger Randfälle. Alternativ/ergänzend: Start von einer kuratierten Seed-Liste bekannter Tiere.

   Grobe Skizze (Property-IDs zur Illustration, vor Umsetzung verifizieren):
   ```sparql
   SELECT ?animal ?animalLabel ?classLabel WHERE {
     ?animal wdt:P105 wd:Q7432 .          # taxon rank: Art
     ?animal wdt:P171* ?class .
     VALUES ?class { wd:Q7377 wd:Q5113 } # z.B. Mammalia, Aves (Liste erweitern)
     SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
   }
   LIMIT 500
   ```

2. **Detail-Anreicherung (Hydration):** Für die ausgewählten ~500 QIDs pro Tier die vollen Statements abrufen — entweder per SPARQL mit `OPTIONAL`-Klauseln für jedes Feld (Gewicht `wdt:P2067`, Länge `wdt:P2043`, Gefährdungsstatus `wdt:P141`, wissenschaftlicher Name `wdt:P225`, ...) oder per Wikidata-API (`wbgetentities`/Special:EntityData) in Batches. Letzteres ist robuster bei vielen optionalen Feldern und großen Batches als eine einzelne sehr breite SPARQL-Query.

**Bekanntes Risiko (für Aufwandsschätzung relevant):** Wikidata-Abdeckung für "weiche" Felder wie `habitat` und `diet` ist bei Tierarten erfahrungsgemäß **nicht** durchgängig strukturiert vorhanden — anders als z. B. Gewicht oder taxonomische Einordnung, die meist gut gepflegt sind. Für `fun_fact` gibt es **gar keine** passende Wikidata-Property — dieses Feld braucht in jedem Fall eine separate, manuelle (oder KI-gestützt vorbereitete + menschlich geprüfte) Kuration, unabhängig von der Wikidata-Pipeline. Das ist eine bewusste Doku dieses Trade-offs für die spätere Aufwandsplanung, keine Entscheidung, die hier bereits getroffen wird.

## Schwierigkeitsstufen — Zuordnung zu vorhandenen Feldern

Der Nutzer hat zwei umschaltbare Schwierigkeitsstufen festgelegt (6–10 Jahre / 10–12 Jahre, siehe `requirements.md`). Das erfordert **keine neuen Datenfelder** — die Stufen werden ausschließlich in der Fragegenerierungs-Logik (Aufgabe von `web-developer`, nicht dieses Schema) über die Wahl der genutzten Felder abgebildet:

- **Stufe 6–10 (einfach):** Fragen primär aus `category`, `habitat`, `continent`, `color` — intuitive, visuell/kategorial erschließbare Fakten. Falschantworten aus deutlich unterschiedlichen Werten ziehen (z. B. andere Kontinente/Kategorien), damit sie klar unterscheidbar sind.
- **Stufe 10–12 (anspruchsvoll):** Zusätzlich Fragen aus `weight_kg`, `length_cm`, `lifespan_years`, `diet`, optional `conservation_status`. Falschantworten näher am richtigen Wert ziehen (z. B. ähnliche Gewichtsklassen), damit sie schwerer zu erraten sind.

Da `diet`, `length_cm`, `lifespan_years` und `conservation_status` optionale Felder sind (siehe Datenlücken-Risiko oben), muss die Fragegenerierung für Stufe 10–12 pro Tier prüfen, welche optionalen Felder tatsächlich befüllt sind, und nur daraus Fragen bilden.

## Offene technische Fragen — Entscheidungen (13.08.2026)

1. **Fun Facts — Herkunft und Prozess:** Entscheidung: Feld bleibt optional und wird beim initialen Wikidata-Import **nicht** befüllt (kein Blocker für den ersten Datensatz). Manuelle/KI-gestützte Kuration ist eine mögliche spätere Ausbaustufe, kein Teil der ersten Umsetzung.
2. **Umgang mit lückenhaften Wikidata-Daten:** Entscheidung: Fehlende optionale Felder bleiben einfach leer (`null`/nicht vorhanden) statt das Tier auszuschließen. Die Fragegenerierung muss fehlende Felder überspringen können (siehe Abschnitt "Schwierigkeitsstufen" oben).
3. **Auswahlkriterium für die ~500 Tiere:** Entscheidung: automatisiert nach Bekanntheits-/Popularitäts-Proxy (Wikidata-Sitelinks), wie in der Skizze oben beschrieben — keine zusätzliche manuelle Kuratierung der Grundliste.
4. **`conservation_status` — didaktisch gewünscht?** Entscheidung: Feld bleibt optional im Schema, aber ohne aktiven Pflicht-Fragetyp — kann als gelegentliche Zusatzfrage in Stufe 10–12 genutzt werden, wenn Daten vorhanden sind (siehe oben), ist aber kein zentraler Bestandteil der Fragegenerierung.

## Änderungshistorie

- 2026-08-13: Erste Version — Datenschema für die Tierdatenbank (Phase 1: Quizfragen-Modus), Lizenz-/Quellenmodell, Skizze zur Wikidata-Datenbeschaffung.
- 2026-08-13: Schwierigkeitsstufen-Mapping ergänzt, offene technische Fragen anhand der Klärungsrunde mit dem Nutzer aufgelöst.
- 2026-08-13: Frontend-Tech-Stack entschieden (Issue #1): Vite + Vanilla JavaScript ohne UI-Framework, plain CSS, `data/animals.json` per statischem ES-Modul-Import eingebunden. Projektstruktur um Frontend-Ordner (`src/`, `tests/`) ergänzt.
