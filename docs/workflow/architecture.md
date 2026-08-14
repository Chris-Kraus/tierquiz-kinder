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
| `habitat` | array\<string\> | nein* | Array statt Einzelwert, da Tiere oft mehrere Lebensräume haben (z. B. Frosch: Süßwasser + Land). Ursprünglich als Pflichtfeld geplant, siehe Korrektur vom 13.08.2026 unten. |
| `continent` | array\<string\> | nein* | Ergänzt `habitat` um eine zweite, unabhängige geografische Achse ("Wo lebt ...?" als Kontinent vs. Lebensraumtyp wie Wald/Wüste/Ozean). Ursprünglich als Pflichtfeld geplant, siehe Korrektur vom 13.08.2026 unten. |
| `diet` | string, Enum (Fleischfresser, Pflanzenfresser, Allesfresser) | nein | Guter, einfacher Fragetyp ("Was frisst ...?"). Optional, weil auf Wikidata nicht für jede Art gleich sauber strukturiert erfasst (siehe Risiko unten). |
| `weight_kg` | number | nein* | Einzelwert (typisches/durchschnittliches Gewicht, Median über vorhandene Wikidata-Statements), bewusst **keine** Min/Max-Spanne — für ein Kinderquiz reicht ein ungefährer, vergleichbarer Wert. Ursprünglich als Pflichtfeld geplant, siehe Korrektur vom 13.08.2026 unten. |
| `length_cm` | number | nein | Analog zu Gewicht: guter Vergleichs-Fragetyp ("Welches Tier ist größer?"). Optional, da auf Wikidata seltener sauber erfasst als Gewicht. |
| `lifespan_years` | number | nein | Ungefähre Lebenserwartung — eigener, bei Kindern beliebter Fragetyp ("Wie alt wird ein ...?"). Optional, Datenlage auf Wikidata schwankt. |
| `conservation_status` | string, Enum (z. B. nicht gefährdet / gefährdet / stark gefährdet / vom Aussterben bedroht) | nein | Bildungswert (Artenschutz-Bewusstsein), aus IUCN-Daten auf Wikidata strukturiert verfügbar (Property P141). Kein zentraler Quiz-Fragetyp, aber sinnvoll als Zusatzinfo/gelegentliche Frage. Bewusst optional, kein Pflichtfeld, um die Datenbeschaffung nicht an lückenhafte IUCN-Abdeckung zu koppeln. |
| `fun_fact` | string | nein | Kurzer, kindgerechter Fakt — hoher Engagement-Wert (z. B. als Zusatzinfo nach Beantwortung). **Wichtig:** Wikidata hat kein strukturiertes "Fun Fact"-Feld, das müsste separat kuratiert werden (siehe Offene Fragen). |
| `wikipedia_url_de` | string (URL) | nein | Verweis auf den deutschen Wikipedia-Artikel des Tieres, für einen Weiterlese-Link im Feedback-Bereich (Issue #15) sowie als Zusatz-Referenzpunkt für eine mögliche spätere Bildlizenz-Klärung (Issue #16). Aus `entity.sitelinks.dewiki.title` zusammengesetzt (`https://de.wikipedia.org/wiki/<URL-kodierter Titel, Leerzeichen als Unterstrich>`), bereits Teil des bestehenden Hydration-Caches — kein neuer Netzwerk-Call nötig. Optional, da nicht jedes Tier einen deutschen Wikipedia-Artikel hat (Auswahl filtert nur nach Gesamt-Sitelinks über alle Sprachen, nicht spezifisch nach `dewiki`). Bewusst nur ein Link, **kein** Wikipedia-Artikeltext (lizenzrechtlicher Unterschied zu Issue #12, siehe dortige Begründung). |
| `image_filename` | string | nein | **Neu, Issue #16 (Option D′), 14.08.2026.** Reiner Commons-Dateiname ohne `File:`-Präfix (z. B. `"Panthera leo cub.jpg"`), aus Wikidata-Property **P18** extrahiert — analog zur bereits genutzten `getStringClaim()`-Extraktion wie bei `name_scientific`, da die vollen `claims` pro Tier bereits während der Hydration geladen werden (kein neuer Netzwerk-Call zur Build-Zeit). Dient ausschließlich dazu, den sonst nötigen Wikidata-Laufzeit-Roundtrip einzusparen (siehe "Bild-Rateshilfe (Issue #16)" unten) — enthält **keine** Bild-URL, keine Lizenz-/Attributionsdaten und kein Bild-Byte; das eigentliche Bild wird nie gespeichert. Optional, da P18 selbst optional ist (real gemessen: 100 % Abdeckung bei den ausgewählten 500 Tieren, siehe Messung in Issue #16, aber ohne Garantie bei künftigen Auswahl-Änderungen). |

*\* `habitat`, `continent` und `weight_kg` waren in der ursprünglichen Version dieses Dokuments als Pflichtfelder vorgesehen. Ein realer, vollständiger Testlauf der Datenbeschaffungs-Pipeline (Issue #2, 13.08.2026, siehe `devops.md`) gegen 1.480 populäre Tier-Kandidaten zeigte: `habitat` ist nur bei 4,9 %, `continent` nur bei 6,3 % und `weight_kg` nur bei 14,4 % der Kandidaten auf Wikidata strukturiert vorhanden — bei strikter Pflicht wären dadurch praktisch 0 Tiere ins Quiz gekommen. Alle drei wurden daher nachträglich zu optionalen Feldern herabgestuft (siehe "Korrektur vom 13.08.2026" unten). `color` wurde komplett aus dem Schema entfernt (0 % Abdeckung, siehe unten) statt nur optional gesetzt, da hier auch als optionales Feld praktisch nie ein Wert vorläge.*

**Korrektur vom 13.08.2026 — `color` aus dem Schema entfernt:** Das ursprünglich geplante Pflichtfeld `color` (Tierfarbe) wurde beim realen Testlauf der Wikidata-Pipeline (Issue #2) auf **0 von 1.480** populären Tier-Kandidaten gefunden — es existiert keine strukturierte Wikidata-Property, die für Tierarten in relevantem Umfang gepflegt wird (die generische `color`-Property P462 wird für Tierarten praktisch nicht verwendet; Farbangaben stehen bei Wikipedia/Wikidata nur als Fließtext im Artikel). Da dies kein Abdeckungsproblem ist, das ein optionales Feld lösen würde (0 % bliebe 0 %, egal ob Pflicht oder optional), und bewusst keine zusätzliche, nicht-Wikidata-Datenquelle für dieses eine Feld ergänzt werden soll, wurde `color` als Feld/Konzept **vollständig aus dem Schema entfernt** — nicht nur optional gesetzt. Details/Zahlen: `docs/workflow/devops.md`.

**Bewusst weggelassen (kein Overengineering):**
- **Volle taxonomische Klassifikation** (Familie, Ordnung, Gattung als eigene Baumstruktur) — für ein Kinderquiz reicht `category` (grobe Klasse) + optional `name_scientific`. Ein voller Taxonomie-Baum wäre Komplexität ohne erkennbaren Quiz-Nutzen in Phase 1.
- **Populationszahlen** — zu abstrakt für Kinder, kein klarer Fragetyp.
- **Fortpflanzung/Tragzeit** — kein Bezug zum aktuellen Scope, ggf. relevant für einen späteren Spielmodus, hier nicht mitgeplant.
- **Fressfeinde/Beute-Beziehungen** — inhaltlich reizvoll ("Wer frisst wen?"), aber strukturell ein Graph statt einer flachen Tabelle — deutlich mehr Komplexität. Als Idee für einen möglichen späteren Spielmodus vermerkt, nicht Teil von Phase 1.
- **Mehrsprachige Namen** — aktueller Scope ist Deutsch (siehe offene Frage in `requirements.md`); `name_scientific` dient bereits als sprachneutraler Anker, falls Mehrsprachigkeit später kommt.
- **Geschlechtsspezifische Werte** (z. B. Gewicht getrennt nach Männchen/Weibchen) — unnötige Präzision für ein Kinderquiz, ein einzelner Näherungswert reicht.
- **Bild-URL/Bildlizenzfelder** — laut Scope explizit ausgeschlossen in dieser Phase. Wenn Bilder für spätere bildbasierte Spielmodi ergänzt werden, braucht das ein eigenes Lizenzmodell **pro Bild** (Wikimedia-Commons-Bilder sind i. d. R. CC-BY-SA/CC-BY mit Attributionspflicht, anders als der CC0-Textdatensatz hier) — bewusst nicht in dieses Schema vorgezogen, da sonst ungenutzte Komplexität entstünde. **Update 13.08.2026 (Issue #16):** Die reale Abdeckung wurde gemessen (100 % P18-Bildabdeckung, aber nur 10,2 % CC0/Public Domain, 89,8 % attributionspflichtig). **Finale Entscheidung 14.08.2026 (überholt die vorherige Zwischenentscheidung "Option B"):** Die Bild-Rateshilfe wird per **Option D′** umgesetzt — kein lokales Bundling, keine Bildlizenzfelder im Schema nötig. Einzige Schema-Erweiterung ist der reine Text-Dateiname `image_filename` (siehe Abschnitt "Bild-Rateshilfe (Issue #16)" unten), Lizenz/Autor/Quelle werden zur Laufzeit live von der Commons-API abgerufen und angezeigt, nie im Datensatz gespeichert. Issue #17 (Attributionslösung vor Veröffentlichung) ist damit gegenstandslos und wurde geschlossen.
- **Geräusch-Referenzen** (für den späteren "Tiergeräusche erkennen"-Modus) — nur als Randnotiz für später, nicht Teil dieses Schemas.
- **`color` (Tierfarbe)** — ursprünglich als Pflichtfeld geplant, nach dem realen Pipeline-Testlauf (13.08.2026, Issue #2) komplett aus dem Schema entfernt: 0 von 1.480 populären Tier-Kandidaten hatten eine strukturierte Wikidata-Farbangabe (siehe Korrektur oben und `docs/workflow/devops.md`). Anders als bei den anderen weggelassenen Punkten oben ist das kein Design-Entscheid gegen Overengineering, sondern eine nachträgliche Korrektur einer sich als nicht datenseitig tragfähig erwiesenen Planung.

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
      "required": ["id", "name_de", "category"],
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
        "lifespan_years": { "type": "number", "exclusiveMinimum": 0 },
        "conservation_status": {
          "type": "string",
          "enum": ["nicht gefährdet", "gefährdet", "stark gefährdet", "vom Aussterben bedroht"]
        },
        "fun_fact": { "type": "string" },
        "wikipedia_url_de": { "type": "string", "format": "uri" },
        "image_filename": { "type": "string", "minLength": 1 }
      }
    }
  }
}
```

**Änderung 14.08.2026 (Issue #16, Option D′):** Optionales Feld `image_filename` ergänzt (Commons-Dateiname ohne `File:`-Präfix, aus Wikidata-Property P18 abgeleitet, reiner Text). Siehe Feldtabelle oben und Abschnitt "Bild-Rateshilfe (Issue #16): Finale technische Leitplanken" unten.

**Änderung 14.08.2026 (Issue #15):** Optionales Feld `wikipedia_url_de` ergänzt (Link zum deutschen Wikipedia-Artikel, aus `sitelinks.dewiki.title` abgeleitet). Siehe Feldtabelle oben und Abschnitt "Pipeline-Regenerierung vs. manuell kuratierte Felder" unten.

**Änderung 13.08.2026:** Pflichtfelder auf `id`, `name_de`, `category` reduziert; `habitat`, `continent`, `weight_kg` von Pflicht- zu optionalen Feldern herabgestuft; `color` als Property vollständig entfernt (nicht mehr in `properties`). Begründung siehe Abschnitt 1 oben ("Korrektur vom 13.08.2026").

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
  "lifespan_years": 14,
  "conservation_status": "gefährdet",
  "fun_fact": "Löwen sind die einzigen Katzen, die in Gruppen (Rudeln) leben."
}
```

**Echtes Beispiel aus dem tatsächlichen Wikidata-Import** (13.08.2026, siehe
`devops.md`) — zeigt den in der Praxis typischen Fall: Pflichtfelder plus
einige, aber nicht alle optionalen Felder befüllt (`fun_fact`, `diet` und
`length_cm` bleiben unbefüllt, siehe "Nicht befüllte Felder" in
`scripts/fetch-animals/README.md`):

```json
{
  "id": "Q33602",
  "name_de": "Großer Panda",
  "name_scientific": "Ailuropoda melanoleuca",
  "category": "Säugetier",
  "habitat": ["Wald"],
  "continent": ["Asien"],
  "weight_kg": 58.802,
  "conservation_status": "gefährdet"
}
```

Ein anderes reales Tier aus demselben Import zeigt den ebenfalls häufigen
Fall, dass nur die drei Pflichtfelder plus wissenschaftlicher Name/
Gefährdungsstatus vorliegen, aber `habitat`/`continent`/`weight_kg` fehlen
(Wolf, Q18498):

```json
{
  "id": "Q18498",
  "name_de": "Wolf",
  "name_scientific": "Canis lupus",
  "category": "Säugetier",
  "conservation_status": "nicht gefährdet"
}
```

### 3. Lizenz-/Quellenangabe: Datei-Ebene statt pro Tier

**Entscheidung:** Lizenz und Quelle werden **einmal auf Datei-/Metadaten-Ebene** hinterlegt (`license`, `source`, `source_url`, `retrieved_at` im Top-Level-Objekt, siehe oben), **nicht** als Pflichtfeld bei jedem einzelnen Tier.

**Begründung:** CC0 ("No Rights Reserved") ist die stärkste Form der Freigabe — sie verzichtet ausdrücklich auf alle Rechte einschließlich einer Attributionspflicht. Anders als bei CC-BY oder CC-BY-SA (wie Wikipedia-Artikeltext) gibt es rechtlich keine Pflicht, pro Datensatz eine Quellenangabe mitzuführen. Ein Lizenzfeld pro Tier wäre daher reine Redundanz ohne rechtlichen Mehrwert. Die Datei-Ebene reicht aus für:
- Nachvollziehbarkeit/Provenienz (woher kommen die Daten, wann wurden sie abgerufen),
- Reproduzierbarkeit (das `id`-Feld pro Tier verweist bereits auf die Wikidata-QID, das ist die eigentliche Rückverfolgbarkeit auf Datensatz-Ebene, kein separates Lizenzfeld nötig).

**Wichtiger Hinweis für später:** Sobald in einer späteren Phase Bilder (Wikimedia Commons) hinzukommen, gilt das **nicht** mehr 1:1 — Commons-Bilder haben oft CC-BY/CC-BY-SA-Lizenzen mit Attributionspflicht **pro Bild**. Das braucht dann ein eigenes Lizenzfeld pro Bild-Datensatz. Bewusst nicht in dieses Schema vorgezogen (kein Overengineering für aktuellen Scope), aber als Präzedenzfall hier dokumentiert, damit es beim späteren Schema-Erweitern nicht vergessen wird.

**Update 14.08.2026 (Issue #16, finale Entscheidung Option D′):** "Später" ist jetzt konkretisiert, aber anders als in der ursprünglichen Skizze angenommen: Es kommt **kein** Lizenzfeld pro Bild-Datensatz ins Schema, weil Bilder überhaupt nicht lokal gebündelt werden. Lizenz/Autor/Quelle werden bei der Bild-Rateshilfe **zur Laufzeit live** von der Commons-API abgerufen und direkt angezeigt, nie persistiert — das löst die Attributionsfrage strukturell, ohne ein Datenmodell dafür zu brauchen. Die vorherige Zwischenentscheidung "Option B" (Bundling ohne Attribution, siehe Issue #17) ist damit überholt; Issue #17 wurde geschlossen. Details: siehe Abschnitt "Bild-Rateshilfe (Issue #16): Finale technische Leitplanken" unten.

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

- **Stufe 6–10 (einfach):** Fragen primär aus `category`, `habitat`, `continent` — intuitive, visuell/kategorial erschließbare Fakten. Falschantworten aus deutlich unterschiedlichen Werten ziehen (z. B. andere Kontinente/Kategorien), damit sie klar unterscheidbar sind.
- **Stufe 10–12 (anspruchsvoll):** Zusätzlich Fragen aus `weight_kg`, `length_cm`, `lifespan_years`, `diet`, optional `conservation_status`. Falschantworten näher am richtigen Wert ziehen (z. B. ähnliche Gewichtsklassen), damit sie schwerer zu erraten sind.

Da `habitat`, `continent`, `diet`, `length_cm`, `lifespan_years` und `conservation_status` optionale Felder sind (siehe Datenlücken-Risiko oben), muss die Fragegenerierung pro Tier prüfen, welche optionalen Felder tatsächlich befüllt sind, und nur daraus Fragen bilden. `color` taucht hier bewusst nicht mehr auf (siehe "Korrektur vom 13.08.2026" oben — Feld vollständig aus dem Schema entfernt; QA hat diese Inkonsistenz am 13.08.2026 in Issue #9 gefunden und hier nachgezogen).

### 5. Technische Einschätzung: Anreicherungs-Ideen aus Zoologe/BA-Runde (13.08.2026)

Vier vom `zoologe` vorgeschlagene Anreicherungs-Ideen wurden gegen `src/quiz/questionGenerator.js`/`difficulty.js` geprüft, bevor `business-analyst` daraus Stories schneidet:

1. **Gefährdungsstatus-Fragetyp — bereits vollständig implementiert, kein neuer Code nötig.** `conservation_status` ist bereits als `FIELD_DEFINITIONS.conservation_status` implementiert (inkl. ordinaler `CONSERVATION_STATUS_ORDER` für die "nah dran"-Falschantwort-Strategie in Stufe 10–12) und steht in `HARD_ONLY_FIELDS` (`difficulty.js`). Bei 94,6 % Datenabdeckung läuft dieser Fragetyp vermutlich bereits live in Stufe 10–12 — die Annahme "aktuell ungenutzt" aus der Zoologe-Ideenliste war nicht codebasiert und ist überholt. **Empfehlung an BA:** keine Implementierungs-Story, höchstens eine kleine QA-Verifikations-Story ("kommt der Fragetyp in echten Runden tatsächlich vor?").
2. **`diet` reaktivieren — reine Daten-Story, kein Architektur-/Code-Bedarf.** `FIELD_DEFINITIONS.diet` existiert bereits und `diet` steht bereits in `HARD_ONLY_FIELDS` — der Fragetyp ist vollständig gebaut, liefert aber mangels Daten (0/500 befüllt) nie Fragen. Sobald `zoologe` Werte kuratiert und diese in `animals.json` eingepflegt sind, greift der Fragetyp automatisch. Offene Architektur-Frage für BA: **wer pflegt die kuratierten Werte ein** — reines Datei-Editieren von `animals.json` nach festem Schema, keine Pipeline-Änderung nötig, daher eher `web-developer`-Aufgabe als `devops-engineer` (dessen Zuständigkeit die Wikidata-Pipeline ist, nicht manuelle Kuration).
3. **`lifespan_years` reaktivieren — identische Situation wie `diet`.** Ebenfalls fertig im Code (`FIELD_DEFINITIONS.lifespan_years`, in `HARD_ONLY_FIELDS`), 0 % Datenabdeckung. Gleiche Empfehlung: reine Kurations-+Einpflege-Story, kein Code.
4. **Vergleichs- und Rekordhalter-Fragen (Zoologe-Ideen 4 und 5) — echte Architektur-Erweiterung, sollten zu einer Story zusammengelegt werden.** Beide brauchen denselben neuen Mechanismus: eine Frage, bei der die 4 Antwortoptionen selbst Tiere sind (statt 1 Zieltier + Feldwerte), und die richtige Antwort das Tier mit dem höchsten/niedrigsten Feldwert unter den 4 Kandidaten ist ("Welches der 4 Tiere ist am schwersten?" deckt sowohl freie Vergleichspaare als auch "Rekordhalter"-Fragen ab, wenn einer der 4 Kandidaten der tatsächliche Datensatz-Rekordhalter ist — kein separater Vorberechnungs-Schritt nötig). Neue Funktion parallel zu `buildValueQuestion`/`buildIdentifyQuestion` nötig, arbeitet mit `weight_kg`/`length_cm` (ggf. später weiteren numerischen Feldern), Kandidaten müssen das Feld befüllt haben (bei `weight_kg` 42 % Abdeckung ausreichend Pool, bei `length_cm` mit 2,2 % aktuell zu wenig — bis mehr `length_cm`-Daten kuratiert sind, zunächst nur `weight_kg`). **Empfehlung an BA:** eine Story für den neuen Vergleichsfragen-Mechanismus (zunächst nur `weight_kg`), Rekordhalter-Framing als Erweiterung ohne zusätzlichen Code.
5. **Verwechslungspaare (Zoologe-Idee 6) — eigenständige, kleinere Erweiterung.** Braucht eine kuratierte Liste von Tierpaaren (z. B. `data/confusionPairs.json` oder ähnlich), die beide im 500er-Datensatz vorkommen, plus einen eigenen, von `FIELD_DEFINITIONS` unabhängigen Fragepfad. Inhaltlich eng an `zoologe` gekoppelt (identifiziert plausible Paare), technisch klein und isoliert vom bestehenden Feld-Mechanismus. Kann unabhängig von Punkt 4 umgesetzt werden.

**Fazit für BA:** Von den 4 geprüften Ideen brauchen nur "Vergleichsfragen/Rekordhalter" (zusammengelegt) und "Verwechslungspaare" tatsächlich neue Implementierung. Gefährdungsstatus ist vermutlich schon erledigt, `diet`/`lifespan_years` sind reine Kurations- + Einpflege-Stories ohne Code-Story.

## Offene technische Fragen — Entscheidungen (13.08.2026)

1. **Fun Facts — Herkunft und Prozess:** Entscheidung: Feld bleibt optional und wird beim initialen Wikidata-Import **nicht** befüllt (kein Blocker für den ersten Datensatz). Manuelle/KI-gestützte Kuration ist eine mögliche spätere Ausbaustufe, kein Teil der ersten Umsetzung.
2. **Umgang mit lückenhaften Wikidata-Daten:** Entscheidung: Fehlende optionale Felder bleiben einfach leer (`null`/nicht vorhanden) statt das Tier auszuschließen. Die Fragegenerierung muss fehlende Felder überspringen können (siehe Abschnitt "Schwierigkeitsstufen" oben).
3. **Auswahlkriterium für die ~500 Tiere:** Entscheidung: automatisiert nach Bekanntheits-/Popularitäts-Proxy (Wikidata-Sitelinks), wie in der Skizze oben beschrieben — keine zusätzliche manuelle Kuratierung der Grundliste.
4. **`conservation_status` — didaktisch gewünscht?** Entscheidung: Feld bleibt optional im Schema, aber ohne aktiven Pflicht-Fragetyp — kann als gelegentliche Zusatzfrage in Stufe 10–12 genutzt werden, wenn Daten vorhanden sind (siehe oben), ist aber kein zentraler Bestandteil der Fragegenerierung.

## Infosatz-Basisbaustein — Genus-Lücke bei Tiernamen (Issue #12, 14.08.2026)

**Problem:** Die ursprüngliche Leitplanke ("Der/Die {name_de} ist ein/eine {category}.") setzt korrektes grammatisches Genus für `name_de` voraus — dafür gibt es aber kein Datenfeld, und Erraten würde regelmäßig falsch liegen (verstößt gegen das eigene Akzeptanzkriterium "kein wörtliches Einsetzen von Rohwerten in falscher Flexion").

**Entscheidung:** `web-developer`s Lösung — Überschrift-/Doppelpunkt-Format ("{name_de}: Ein/e {category}, der/die/das …") statt Artikel vor dem Tiernamen — wird als **dauerhafte Lösung für diese Phase** akzeptiert, kein Nacharbeiten nötig. Begründung: garantiert korrekte Grammatik ohne zusätzliche Datenpflege, passt zum Grundsatz "keine Architektur/kein Datenaufwand für Nice-to-haves ohne klaren Bedarf". Eine kuratierte Genus-Tabelle je Tier (analog zu `diet`/`lifespan_years`-Kuration) wäre technisch möglich, ist aber reiner Stil-Feinschliff ohne funktionalen Mehrwert — daher wie `fun_fact` als **mögliche, unpriorisierte spätere Ausbaustufe** vermerkt, kein aktueller Task.

## Verwechslungspaare — Datenstruktur & Mindestumfang (Issue #21, 13.08.2026)

**Mindestanzahl kuratierter Paare:** mindestens **15**, Zielgröße **20–30** für die erste Umsetzung. Begründung: Der Fragetyp ist einer von inzwischen ~9 möglichen Fragetypen (Kategorie, Lebensraum, Kontinent, Gewicht, Länge, Lebenserwartung, Ernährung, Gefährdungsstatus, Vergleichsfragen, Verwechslungspaare) und wird durch den bestehenden Diversitäts-Mechanismus aus Issue #11 (`orderFieldsByUsage`) ohnehin nicht öfter als andere Typen gezogen — bei 10 Fragen/Runde realistisch 0–2 Vorkommen. Mit 15 Paaren ist die Wiederholungswahrscheinlichkeit desselben Paars innerhalb einer Runde bzw. über wenige aufeinanderfolgende Runden gering; 20–30 sind komfortabel für Langzeit-Abwechslung, aber kein Blocker für den Start (Liste ist erweiterbar wie `data/animals.json` selbst).

**Datenstruktur:** neue Datei `data/confusionPairs.json`, unabhängig vom bestehenden `FIELD_DEFINITIONS`-Mechanismus. Vorschlag:

```json
[
  {
    "animals": ["Q39201", "Q42314"],
    "distinctions": [
      { "text": "Dieses Tier hat deutlich längere Ohren.", "correct": "Q39201" }
    ]
  }
]
```

- `animals`: die beiden Wikidata-IDs (`id` aus `data/animals.json`), müssen beide im 500er-Datensatz vorhanden sein (bei Kuration prüfen, kein Laufzeit-Check nötig, da Liste statisch kuratiert ist).
- `distinctions`: mindestens ein unterscheidendes Merkmal pro Paar (mehrere für Abwechslung möglich), `correct` referenziert die Tier-ID, auf die das Merkmal zutrifft. Fragegenerierung wählt zufällig ein Paar + eine Distinction daraus.
- Kein Bezug zu `FIELD_DEFINITIONS`/`HARD_ONLY_FIELDS` — eigener, kleiner Fragepfad parallel zu `buildValueQuestion`/`buildIdentifyQuestion` (analog zur Vergleichsfragen-Story #20), da hier nicht aus einem Datenfeld generiert, sondern aus der kuratierten Paar-/Distinction-Liste gezogen wird.

## Pipeline-Regenerierung vs. manuell kuratierte Felder (Issue #15, 14.08.2026)

**Anlass:** Issue #15 (`wikipedia_url_de`) verlangt, `data/animals.json` mit dem erweiterten `fetch-animals.js` neu zu generieren (ggf. via `--use-cache`). Zwischen der ursprünglichen Pipeline-Erstellung und heute wurden aber `diet` (#18) und `lifespan_years` (#19) **manuell kuratiert direkt in `data/animals.json` eingepflegt** — wie in Abschnitt 5 oben ("Technische Einschätzung ... Zoologe/BA-Runde") bereits so vorgesehen: reine Daten-/Kurations-Story, bewusst **ohne** Pipeline-Code-Änderung. `buildAnimal()` in `fetch-animals.js` kennt diese beiden Felder entsprechend nicht (kein `PROPS`-Eintrag, keine Extraktion, kein Platz im zusammengebauten Objekt).

**Risiko:** Ein einfacher Rerun von `fetch-animals.js` (auch mit `--use-cache`) baut `finalAnimals` komplett neu aus den Wikidata-Entities auf und **würde `diet`/`lifespan_years` für alle 500 Tiere kommentarlos verlieren**, da die Pipeline diese Felder nie geschrieben hat und beim Neuaufbau nicht "vererbt".

**Entscheidung:** `fetch-animals.js` bekommt eine generische Merge-Vorkehrung für **manuell kuratierte Felder**, die die Pipeline selbst nicht befüllt:

- Eine Konstante (z. B. `MANUALLY_CURATED_FIELDS = ["diet", "lifespan_years"]`) benennt explizit, welche Schema-Felder ausschließlich durch manuelle Kuration befüllt werden, nicht durch die Wikidata-Pipeline.
- Vor dem Schreiben der Ausgabedatei liest `main()` die **bisherige** `data/animals.json` (falls vorhanden), indiziert sie nach `id`, und überträgt für jedes neu gebaute Tier die Werte der `MANUALLY_CURATED_FIELDS`-Felder aus dem alten Datensatz mit gleicher `id`, sofern dort vorhanden.
- Lauf-Report ergänzt eine sichtbare Zeile pro kuratiertem Feld (z. B. "diet aus vorheriger animals.json übernommen: 500/500"), inkl. **Warnung**, falls ein Tier mit zuvor kuratiertem Wert in der neuen Auswahl (Top-500 nach Sitelinks) fehlt (Kandidat aus der Auswahl gefallen) — kein harter Fehler, aber sichtbar im Log.
- Diese Vorkehrung ist bewusst generisch (Array statt Einzelfall-Sonderlogik für `diet`/`lifespan_years`), da absehbar weitere manuell kuratierte Felder dazukommen können (z. B. `fun_fact`, siehe offene Frage 1 oben) und jeder künftige Pipeline-Rerun dasselbe Risiko hätte.
- Kein Rückgriff auf Git-Historie/separate Merge-Skripte nötig — die Pipeline wird dadurch selbst robust gegenüber eigenen Reruns, was dem bestehenden Cache-Rerun-Konzept (`--use-cache`) entspricht.

**Verantwortung Umsetzung:** `web-developer` (Teil von Issue #15).

## Bild-Rateshilfe (Issue #16): Erweiterte Evaluation — Repo-Größe & Einbindungsoptionen (14.08.2026, `business-analyst` + `software-architect` + `devops-engineer`)

**Anlass:** Der Nutzer möchte die bereits in `requirements.md` ("Entscheidungen aus Klärungsrunde", Zeile "Veröffentlichung") dokumentierte Entscheidung für **Option B** (volles lokales Bundling aller ~500 Bilder, keine Attribution, private Nutzung) noch einmal breiter evaluieren lassen, bevor sie endgültig steht — insbesondere wegen des befürchteten Repo-Größen-Zuwachses. **Diese Auswertung ist reine Entscheidungsgrundlage, keine neue Entscheidung.** Die bestehende Eintragung in `requirements.md` bleibt bis zu einer expliziten Nutzer-/PM-Entscheidung unverändert.

### A) Recherche: tatsächliche Git-/GitHub-Größenlimits

Quellen: [GitHub Docs — Repository limits](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits), [GitHub Docs — About storage and bandwidth usage (Git LFS)](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-storage-and-bandwidth-usage).

| Grenze | Wert | Konsequenz |
|---|---|---|
| Einzeldatei — empfohlenes Maximum | 1 MB (Soft-Empfehlung) | Kein technisches Problem, nur Performance-Hinweis (Diff/Checkout-Geschwindigkeit) |
| Einzeldatei — Warnschwelle | 50 MB | Git/GitHub warnt beim Push, Push funktioniert aber weiterhin |
| Einzeldatei — Hard-Limit | 100 MB | Push wird **blockiert**, außer die Datei wird via **Git LFS** getrackt |
| Repo-Gesamtgröße — Performance-Empfehlung | < 1 GB | Von GitHub Support empfohlen, kein Hard-Limit |
| Repo-Gesamtgröße — Soft-Warnschwelle | ~5 GB | Kann eine automatische Warn-E-Mail von GitHub auslösen, kein Zwangs-Stopp |
| Git LFS (GitHub Free-Plan, gilt auch für private Repos) | 10 GiB Speicher + 10 GiB Bandbreite/Monat kostenlos | Danach entweder Metered Billing (bei hinterlegter Zahlungsmethode) oder Sperre für neue LFS-Pushes (ohne Zahlungsmethode); bestehende Dateien bleiben als Pointer abrufbar |

**Einordnung für dieses Projekt:** Aktuelle Repo-Größe (`.git`) liegt bei **1,1 MB**, `data/` bei 176 KB — es gibt aktuell praktisch keinen Speicherdruck. Bei 500 Commons-Originalbildern (typische Downloadgrößen realer Fotos: grob geschätzt 0,5–6 MB pro Bild, vereinzelt auch mehr bei sehr hochauflösenden Profi-Aufnahmen) ist ein Repo-Wachstum in der Größenordnung **mehrere hundert MB bis ca. 1–2 GB** plausibel — **ungemessen, sollte vor einer endgültigen Entscheidung real gegen die 500 tatsächlichen Commons-Dateien gemessen werden** (analog zur bereits praktizierten Mess-Methodik aus Issue #16/#2, z. B. per `measure-image-coverage.js`-Erweiterung um `imageinfo`-Dateigrößen). Damit bliebe man voraussichtlich **unter** dem GitHub-Hard-Limit (100 MB/Datei) und wahrscheinlich unter der 5-GB-Soft-Warnschwelle, aber potenziell **oberhalb** der 1-GB-Performance-Empfehlung — kein Blocker, aber ein spürbarer Clone-/Checkout-/CI-Geschwindigkeitsnachteil gegenüber dem aktuellen schlanken Repo. **Git LFS lohnt sich für diesen Umfang voraussichtlich nicht:** Es löst kein Lizenzproblem, verursacht zusätzlichen Tooling-Aufwand (LFS-Setup, `.gitattributes`, LFS-fähiger Checkout auch für den Nutzer selbst) und wäre bei geschätzt 1–2 GB innerhalb des kostenlosen 10-GiB-Kontingents ohnehin nicht zwingend nötig — die eigentliche Frage ist Repo-Schlankheit/Performance, nicht ein hartes Limit.

### B) Frage 1: Live-/On-Demand-Einbindung (Hotlinking) vs. NFR 1

**Technisch möglich:** Ja. Bilder könnten zur Laufzeit direkt von Wikimedia Commons geladen werden (`<img src="https://upload.wikimedia.org/...">` bzw. ein Commons-API-Aufruf `action=query&prop=imageinfo` zur Laufzeit statt zur Build-Zeit). Die Commons-API unterstützt CORS für öffentliche GET-Anfragen, ein Browser-seitiger Live-Abruf ist also ohne eigenen Proxy-Server umsetzbar.

**Vor-/Nachteile gegenüber vollem lokalem Bundling:**

| | Hotlinking (live) | Lokales Bundling |
|---|---|---|
| Repo-Größe | Keine Auswirkung (0 Byte im Repo) | Groß (s. o.) |
| Offline-Tauglichkeit | **Nein** — Bildfunktion fällt ohne Internet komplett aus | Ja, vollständig |
| Abhängigkeit von Drittanbieter-Verfügbarkeit | Ja (Wikimedia-Server müssen erreichbar/verfügbar sein) | Nein, nach einmaligem Bundling autark |
| Attributionsdaten | Müssen zur Laufzeit dynamisch abgerufen werden (`imageinfo`), kein Vorab-Datenmodell nötig | Müssten vorab ins Schema (falls Attribution gewünscht) |
| Redistribution des Bild-Bytes durch die App selbst | **Nein** — die App verlinkt/lädt nur, verbreitet die Datei nicht selbst weiter | Ja — die Datei wird tatsächlich kopiert und mit der App ausgeliefert |
| Aufwand | Mittel (neuer Laufzeit-API-Call, Fehlerbehandlung bei Offline/Timeout) | Groß (neue Pipeline-Phase, Schema-Erweiterung, Repo-Größenmanagement) |

**Verletzt reines Hotlinking NFR 1?** Ja, unmittelbar — NFR 1 verlangt explizit, dass die **Kernfunktion** (Quiz spielen) ohne Internetzwang läuft, und lokal vorab bezogene Daten. Ein Bild-Hint, der zur Laufzeit live nachgeladen wird, widerspricht dem Wortlaut, **sofern die Bild-Rateshilfe als Teil der Kernfunktion zählt**.

**Möglicher Kompromiss (vom Nutzer selbst vorgeschlagen) — Bild-Hint als explizit optionale, online-abhängige Zusatzfunktion:** Das ist architektonisch sauber lösbar und entspricht strukturell bereits einem im Projekt vorhandenen Präzedenzfall: Issue #14 hat mit der lokalen Verlaufsliste ebenfalls eine gezielte, bewusste Ausnahme von einem bestehenden Scope-Ausschluss geschaffen, ohne die übrige Anforderung aufzuweichen. Konkret hieße das:
- **Kernfunktion (Quiz: Fragen, Antworten, Punktestand)** bleibt zu 100 % offline lauffähig — unverändert, keine Abstriche an NFR 1.
- Der "Bild zeigen"-Button wird als **optionale Zusatzfunktion** behandelt, die eine Internetverbindung voraussetzt. Bei fehlender Verbindung/fehlgeschlagenem Abruf blendet sich der Button/Bildbereich vollständig aus — das deckt sich sogar **bereits wortgleich** mit einem bestehenden Akzeptanzkriterium in Issue #16 ("Ist für ein Tier kein Bild verfügbar … wird der Button vollständig ausgeblendet statt eines Fehlers"), das lediglich um den Fall "kein Netz" erweitert werden müsste.
- Das würde eine **kleine, gezielte Ergänzung in `requirements.md`** erfordern (NFR 1 um einen expliziten Ausnahmesatz ergänzen, analog zur Issue-#14-Ergänzung bei "Explizit außerhalb des Scopes"), keine Neuformulierung der gesamten NFR.
- Dieser Kompromiss löst die Offline-Frage sauber, **löst aber die Lizenz-/Attributionsfrage nicht** — auch bei Live-Anzeige müssen Autor/Lizenz/Quelle laut Akzeptanzkriterien sichtbar sein, nur eben aus einem Laufzeit-API-Call statt aus vorab gespeicherten Metadaten.
- **Einordnung:** Dieser Kompromiss ist im Kern eine Variante von Option A (Hotlinking) bzw. der bereits in Issue #16 skizzierten Option D (progressive/optionale Netzwerknutzung) — der entscheidende Unterschied ist, dass die Netzabhängigkeit hier von Anfang an **bewusst und dokumentiert als Feature-Eigenschaft** geführt wird statt als nachträgliche Fehlerbehandlung eines eigentlich als offline-fähig verstandenen Features.

### C) Frage 3: Speicherarme Alternativen zwischen "alles bündeln" und "alles hotlinken"

1. **Komprimierte/verkleinerte Thumbnails lokal bündeln (neu bewertet):** Statt Originaldateien werden zur Fetch-/Build-Zeit verkleinerte, komprimierte Versionen erzeugt (z. B. max. 400–600 px Breite, JPEG-Qualität ~75–80). Typische Dateigröße pro Thumbnail: grob geschätzt 15–60 KB (ungemessen, aber deutlich unter Originalgrößen) → geschätzte Gesamtgröße für 500 Bilder: **ca. 15–50 MB**, weit unter jedem GitHub-Limit und ohne spürbaren Performance-Nachteil gegenüber dem heutigen Repo. **Wichtig:** Das ändert **nichts** an der Lizenzlage — Thumbnails unterliegen laut bereits erfolgter Prüfung (Issue #16, Option F) derselben Lizenz wie das Original. Diese Option löst ausschließlich das **Repo-Größen-Problem**, nicht das Attributionsthema. Aufwand: klein — ergänzt die ohnehin für Option B nötige neue Commons-API-Pipelinephase (siehe Issue #16-Diskussion) nur um einen zusätzlichen Resize-/Kompressions-Schritt (z. B. via `sharp` oder vergleichbarer Bibliothek).
2. **Browser-seitiges Caching bei Erstabruf (Cache API/IndexedDB), kein Repo-Bundling:** Bilder werden nicht im Repo versioniert, sondern beim ersten Online-Spielen vom Client per Hotlinking geladen und dort lokal zwischengespeichert (Service-Worker-Cache oder IndexedDB). Repo-Auswirkung: **0 Byte**. Nach dem ersten Online-Durchlauf pro Gerät/Browserprofil sind die bereits abgerufenen Bilder auch offline verfügbar — allerdings nur die, die tatsächlich schon einmal angezeigt wurden (kein garantiertes 100-%-Offline-Set), und nicht geräteübergreifend. Faktisch eine Variante von Hotlinking mit Offline-Komfortgewinn für Wiederholungsspiele auf demselben Gerät — braucht denselben NFR-1-Kompromiss wie unter B) beschrieben, da der allererste Abruf pro Bild zwingend online erfolgen muss.
3. **Nur die gemessenen 10,2 % CC0/PD-Bilder lokal bündeln (Option G aus Issue #16):** Sehr kleines Datenvolumen (51 Bilder; als Thumbnails geschätzt **< 5 MB**, selbst als Originale vermutlich deutlich unter 150 MB), kein Attributionsrisiko, vollständig offline-tauglich — aber Bildabdeckung auf ca. 1 von 10 Tieren reduziert, was den Nutzen der Rateshilfe als Feature stark einschränkt.
4. **Gestaffeltes/Chunk-basiertes Bundling:** Keine eigenständige Alternative auf derselben Ebene wie 1–3, sondern eine **ergänzende Technik**, die mit jeder der Bundling-Optionen kombinierbar ist (z. B. zunächst nur die häufigsten Kategorien/Tiere bündeln, Rest per Lazy-Load/späterem Update nachziehen, oder kategorienweise per Cache-API laden). Reduziert initiale Bundle-/Clone-Größe, verschiebt das Gesamtvolumen aber nur zeitlich, löst weder Lizenz- noch grundsätzliche Repo-Wachstumsfrage bei voller Endabdeckung.

### D) Gesamt-Vergleichstabelle

| Option | Repo-Größen-Auswirkung | Offline-tauglich | Aufwand | Lizenz-/Attributionsrisiko | Bildabdeckung |
|---|---|---|---|---|---|
| **B. Volles lokales Bundling (Originale)** — bisherige Entscheidung | Groß (geschätzt mehrere 100 MB – ~1–2 GB, ungemessen) | Ja, 100 % | Groß (neue Pipelinephase + Schema) | Hoch (89,8 % attributionspflichtig, bewusst ohne Attribution für private Nutzung akzeptiert) | Hoch (100 % P18-Abdeckung) |
| **B′. Lokales Bundling mit komprimierten Thumbnails** (neu) | Klein (geschätzt 15–50 MB) | Ja, 100 % | Mittel (wie B + ein Resize-Schritt) | Identisch zu B (Lizenz unverändert) | Hoch (100 %) |
| **A. Reines Hotlinking zur Laufzeit** | Keine (0 Byte) | Nein | Mittel | Muss dynamisch pro Bild angezeigt werden | Hoch, ungemessen |
| **Browser-Caching nach Erstabruf** (neu) | Keine (0 Byte) | Teilweise (nur bereits online gesehene Bilder, pro Gerät) | Mittel–groß (Cache-Logik) | Wie A | Wie A, abhängig vom Spielverlauf |
| **D′. Bild-Hint als explizit optionale Online-Zusatzfunktion** (Kompromiss aus Frage 1) | Wie A oder Browser-Caching, je nach gewählter Variante | Kernfunktion Quiz: ja / Bildfunktion: nein | Mittel + kleine `requirements.md`-Ergänzung (NFR-1-Ausnahme) | Wie A | Wie A |
| **G. Nur CC0/PD-Bilder lokal bündeln** | Sehr klein (< 5–150 MB) | Ja, 100 % | Mittel-groß | Keins | Niedrig (10,2 %) |

*(Gestaffeltes/Chunk-Bundling ist als kombinierbare Zusatztechnik zu jeder Bundling-Zeile zu verstehen, keine eigene Tabellenzeile.)*

### E) Empfehlung (`business-analyst` + `software-architect` + `devops-engineer`, ausdrücklich Empfehlung, keine Entscheidung)

Die eigentliche Sorge hinter dieser Neubewertung — Repo-Größen-Explosion durch 500 Bilder — lässt sich technisch **entschärfen, ohne die bereits getroffene Grundsatzentscheidung (Option B, volle Abdeckung, private Nutzung ohne Attribution) zu kippen**: Die recherchierten GitHub-Limits zeigen, dass selbst volles Bundling von Originalen wahrscheinlich nicht an ein Hard-Limit stoßen würde, aber spürbar über die Performance-Komfortzone hinausgeht. Die naheliegendste Verbesserung ist daher **Option B′ (lokales Bundling, aber als komprimierte Thumbnails statt Originaldateien)**: gleiche 100-%-Offline-Tauglichkeit, gleiche Bildabdeckung, gleiche (bereits akzeptierte) Lizenzlage wie die bisherige Entscheidung, aber ein Bruchteil der Dateigröße (geschätzt 15–50 MB statt mehrere hundert MB) bei nur geringfügig höherem Pipeline-Aufwand (ein zusätzlicher Resize-Schritt in der ohnehin für Option B nötigen neuen Commons-API-Phase). Das ist eine reine **Verfeinerung**, keine Kursänderung.

**Falls der Nutzer die Neubewertung stattdessen aus rechtlicher Vorsicht heraus wünscht** (nicht nur wegen Repo-Größe) — also die zugrunde liegende Frage ist nicht "wie groß wird das Repo", sondern "will ich überhaupt fremde, attributionspflichtige Bilddateien in meinem Repo redistribuieren" — ist **D′ (Bild-Hint als explizit optionale, online-abhängige Zusatzfunktion, technisch per Hotlinking/Option A)** der prinzipiell sauberere Weg: Die App selbst verbreitet dann nie eine Bilddatei, sie zeigt nur zur Laufzeit an, was Wikimedia direkt ausliefert, inkl. live abgerufener Attributionsdaten. Das kostet die 100-%-Offline-Eigenschaft für dieses eine Teil-Feature, ist dafür aber sofort mit einem im Projekt bereits etablierten Präzedenzmuster (gezielte NFR-Ausnahme wie bei Issue #14) sauber in `requirements.md` abbildbar.

**Nicht empfohlen:** Option G als alleinige Lösung — die Reduktion auf 10,2 % Bildabdeckung schwächt den Nutzen der Rateshilfe stark, nur um ein Problem (Repo-Größe) zu lösen, das sich mit B′ günstiger lösen lässt, ohne Abdeckung zu verlieren.

**Nächster sinnvoller Schritt vor einer endgültigen Entscheidung:** Reale Dateigrößen (Original **und** Thumbnail) für die 500 tatsächlichen Commons-Bilder messen (Erweiterung von `measure-image-coverage.js` um Dateigrößen aus `imageinfo`), um die obigen Schätzungen durch echte Zahlen zu ersetzen — passend zur im Projekt bereits etablierten Praxis, Kapazitäts-/Abdeckungsannahmen vor einer Entscheidung real zu verifizieren (siehe Issue #2, Issue #16-Bildabdeckungsmessung).

### F) Performance-Messung Option D′ (14.08.2026, `software-architect`, echte Messwerte)

**Anlass:** Konkrete Nutzerfrage zu D′ ("Bild-Hint als optionale Online-Zusatzfunktion"): Muss jedes Bild bei jedem Spielen neu geladen werden, und wie lange dauert ein Abruf tatsächlich? Gemessen an einer Zufallsstichprobe von 30 der 500 Tiere (`data/animals.json`, Wikidata-IDs), reale Wikidata-/Commons-API-Aufrufe und `curl`-Downloads, keine Schätzung.

**1) Browser-Cache-Verhalten (real geprüft, `curl -I` gegen mehrere echte `upload.wikimedia.org`-Bild-URLs):**
- Wikimedia setzt auf Bild-Antworten **kein** `Cache-Control`- oder `Expires`-Header (widerlegt die ursprüngliche Annahme im Auftrag) — verifiziert an mehreren Original- und Thumbnail-URLs.
- Es sind aber `ETag` und `Last-Modified` gesetzt. Ein bedingter GET (`If-None-Match: <etag>`) liefert real gemessen **`304 Not Modified`** ohne Bild-Bytes im Body zurück.
- Praktische Konsequenz: Browser cachen 200-Antworten auch ohne explizite Cache-Header (HTTP-Standardverhalten), meist per Heuristik anhand des `Last-Modified`-Alters. Bei erneutem Spielen auf demselben Gerät/Browserprofil (Cache nicht geleert) wird ein bereits gesehenes Bild also **entweder ganz ohne Netzwerk-Request** aus dem Cache angezeigt, **oder** es kommt zu einer schnellen bedingten Revalidierung (`304`, keine Bild-Bytes) statt eines vollen Re-Downloads. Ein voller Re-Download ist der **Worst Case** (Cache geleert, anderes Gerät, privater Modus), nicht der Regelfall.
- Für garantierte Offline-Wiederverwendbarkeit unabhängig von Browser-Heuristiken wäre optional ein App-seitiger Cache (Blob in IndexedDB/Cache-API nach Erstabruf) möglich — deckt sich mit der bereits unter C)2 skizzierten "Browser-seitiges Caching"-Option.

**2) Reale Dateigrößen (Commons-API `imageinfo`, n=30 Stichprobe, 100 % hatten ein P18-Bild):**

| Variante | Min | Median | Mittelwert | Max |
|---|---|---|---|---|
| Original (Vollbild) | 57 KB | **1.621 KB (~1,6 MB)** | 3.031 KB (~3,0 MB) | **12.659 KB (~12,6 MB)** |
| Thumbnail (`iiurlwidth=330`, `thumburl`) | 13 KB | **32 KB** | 33 KB | 72 KB |

Die 330px-Thumbnail-Variante ist damit im Median **~50× kleiner** als das Original — bei für einen Kinderquiz-Bildschirm völlig ausreichender Auflösung.

**3) Reale Download-Zeiten (`curl -w "%{time_total}"`, Messumgebung mit sehr guter Anbindung an die Wikimedia-CDN — reale Mobilfunk-/Heimnetz-Zeiten liegen je nach Bandbreite darüber):**

| Bildgröße (Original) | Ladezeit Original | Ladezeit Thumbnail (330px) |
|---|---|---|
| 57 KB | 0,14 s | 0,12 s |
| 405 KB | 0,20 s | 0,12 s |
| 1.670 KB | 0,26 s | 0,14 s |
| 5.587 KB | 0,41 s | 0,22 s |
| 12.659 KB | **0,69 s** | 0,13 s |

Zusätzlich vor dem eigentlichen Bild-Download nötig (falls `animals.json` nur die Wikidata-ID, nicht den P18-Dateinamen enthält): ein Wikidata-Lookup (`wbgetclaims`/`wbgetentities`, real gemessen **~0,23–0,28 s**) plus ein Commons-`imageinfo`-Lookup zur URL-Auflösung (real gemessen **~0,22–0,30 s**) — zusammen **~0,5 s** zusätzliche Latenz on top der Bildladezeit, auf jeder Verbindung, da latenz- nicht bandbreitengebunden (RTT-dominiert, auf Mobilfunk tendenziell etwas höher).

**4) UX-Einordnung:**
- **Nur Thumbnail laden ist klar der richtige Default:** Bei 13–72 KB (Median 32 KB) liegt die Gesamtzeit "Klick → Bild sichtbar" inkl. beider API-Lookups realistisch bei **~0,6–1,5 s** auch auf mäßigen Verbindungen — akzeptabel für einen Klick während einer aktiven Quizfrage, ein dezenter Lade-Zustand (z. B. Spinner im Button) ist trotzdem empfehlenswert, aber kein hartes Muss.
- **Volle Originalbilder als Default sind nicht empfehlenswert:** Die gemessenen Ausreißer bis 12,6 MB brauchen auf einer langsamen Mobilfunkverbindung (z. B. 1 Mbit/s) potenziell **über 100 Sekunden** — dort ist ein Ladeindikator zwingend, und selbst dann ist die Wartezeit für ein Kind mitten im Quiz nicht akzeptabel.
- **Empfehlung:** Für D′ (falls diese Variante gewählt wird) immer den Commons-`thumburl`-Parameter (z. B. 330–640px Breite) statt der Originaldatei anfragen — reduziert Größe und Ladezeit um Größenordnungen bei für den Zweck ausreichender Bildqualität. Zusätzlich: P18-Dateiname bereits zur Build-Zeit in `fetch-animals.js` mit auflösen und in `data/animals.json` ablegen (aktuell nicht der Fall, siehe `scripts/fetch-animals/fetch-animals.js`) — spart einen der beiden Laufzeit-API-Roundtrips (~0,25 s) bei jedem Bildabruf.

### G) Bild-Rateshilfe (Issue #16): Finale technische Leitplanken für Option D′ (14.08.2026, `software-architect`, umsetzungsreif)

**Status:** PM-Entscheidung ist final (siehe `requirements.md`, NFR 1 und Klärungstabelle "Veröffentlichung"): Option D′ wird umgesetzt. Dieser Abschnitt ersetzt die vorherige Option-B-Planung als verbindliche technische Grundlage für `web-developer`/`devops-engineer`.

**Grundprinzip:** Klare Trennung zwischen dem, was zur **Build-/Fetch-Zeit** (offline, einmalig, Teil von `fetch-animals.js`) vorbereitet wird, und dem, was ausschließlich zur **Laufzeit** (im Browser, nur auf Klick) abgerufen wird. Es wird zu keinem Zeitpunkt ein Bild-Byte lokal gespeichert oder ins Repo committet.

**1. Build-Zeit (`scripts/fetch-animals/fetch-animals.js`):**
- `P18` (Property "image") wird wie jede andere String-Property per `getStringClaim()` aus den ohnehin bereits geladenen `claims` extrahiert (kein zusätzlicher Netzwerk-Call, analog zu `name_scientific`).
- Ergebnis ist ausschließlich der **Commons-Dateiname als reiner Text** (z. B. `"Panthera leo cub.jpg"`), gespeichert im neuen optionalen Feld `image_filename` (siehe Datenschema/JSON-Schema oben). Kein Download, keine Auflösung zu einer URL, keine Lizenz-/Attributionsdaten — das bleibt vollständig der Laufzeit vorbehalten.
- Zweck dieser Vorab-Auflösung: Sie spart bei jedem späteren Bildabruf einen von zwei Laufzeit-API-Roundtrips (den Wikidata-`wbgetclaims`-Lookup, real gemessen ~0,23–0,28 s, siehe Abschnitt F oben) — die App muss zur Laufzeit nur noch gegen die Commons-API auflösen, nicht mehr zusätzlich gegen Wikidata.

**2. Laufzeit (Frontend, ausgelöst durch Klick auf "Bild zeigen"):**
- Voraussetzung für sichtbaren Button: `image_filename` ist für das aktuelle Tier vorhanden. Fehlt das Feld bereits im Datensatz, wird der Button gar nicht erst gerendert (kein Klick, kein Fehlversuch nötig) — deckt den Fall "kein Bild verfügbar" bereits vor jedem Netzwerk-Call ab.
- Bei Klick: **ein** Aufruf gegen die Wikimedia-Commons-API:
  ```
  GET https://commons.wikimedia.org/w/api.php
    ?action=query
    &titles=File:<image_filename>
    &prop=imageinfo
    &iiprop=url|extmetadata
    &iiurlwidth=330
    &format=json
    &origin=*
  ```
  - `origin=*` aktiviert den von Commons unterstützten CORS-Modus für anonyme Browser-Anfragen (kein eigener Proxy-Server nötig, siehe Abschnitt B oben).
  - `iiurlwidth=330` liefert im Response-Feld `thumburl` direkt eine fertige **330 px breite Thumbnail-URL** (Empfehlung 330–640px, siehe Performance-Messung Abschnitt F: Median 32 KB statt 1,6 MB beim Original) — **niemals** die Originaldatei anfragen.
  - `extmetadata` liefert in derselben Antwort `Artist`, `LicenseShortName` und `LicenseUrl` (Fallback: `UsageTerms`, analog zur bereits genutzten Logik aus `measure-image-coverage.js`) — ein einziger Request deckt sowohl Bild als auch Attribution ab, kein zweiter Call nötig.
- **Fehlerbehandlung (Netzwerkfehler, Timeout, Offline, leere/fehlende `imageinfo`-Antwort):** Button/Bildbereich blendet sich vollständig aus, kein Fehlertext, kein kaputter Platzhalter — identisch zum bereits bestehenden Verhalten bei fehlendem `image_filename`. Empfehlung: kurzes Timeout (z. B. 3–4 s) ansetzen, damit ein hängender Request die Frage nicht spürbar blockiert; nach Timeout gilt derselbe Ausblend-Pfad wie bei jedem anderen Fehlschlag.
- **Kein Caching-Sonderkonzept:** Der Standard-HTTP-Cache des Browsers reicht aus (siehe Performance-Messung Abschnitt F: `ETag`/`Last-Modified` sind gesetzt, bedingte Requests liefern real `304 Not Modified`). Kein Service-Worker, keine IndexedDB-Zwischenspeicherung in diesem Schritt — bewusst kein Overengineering für ein optionales Nice-to-have-Feature.
- **State-Reset:** Der aufgedeckte Zustand (Bild sichtbar, Ladezustand, ggf. Fehler-/Ausblend-Zustand) gehört zum lokalen UI-Zustand des Frage-Bildschirms (`src/screens/question.js`) und wird bei jedem Wechsel zur nächsten Frage zurückgesetzt — kein zusätzliches Feld im globalen Quiz-Zustand (`src/quiz/state.js`) nötig.

**3. UX-Vorgaben (abgestimmt mit `ux-design`, siehe `docs/workflow/design.md`, Abschnitt "Bild-Rateshilfe"):** Ladeindikator im Button selbst (kein Vollbild-Spinner), kindgerechte, dezente Attributionszeile statt juristischem Disclaimer-Ton, kein Layout-Sprung im 2×2-Antwortraster. Details siehe `design.md`.

**Zusammenfassung Aufwand:** Kleiner als die ursprünglich für Option B veranschlagte neue Pipeline-Phase — es gibt keine neue Build-Zeit-Pipelinephase mit eigenem Retry-/Rate-Limit-Bedarf (das war für Massenabruf bei Option B nötig, entfällt bei D′ komplett), nur eine kleine `getStringClaim()`-Erweiterung in `fetch-animals.js` plus ein neuer, schlanker Laufzeit-API-Call im Frontend.

## Technische Einschätzung: Zwei vorgeschlagene Content-Erweiterungen (14.08.2026, `software-architect`, konsultiert mit `zoologe`/`business-analyst`)

Zwei vom Nutzer vorgeschlagene Erweiterungen wurden gegen den bestehenden Code (`FIELD_DEFINITIONS` in `questionGenerator.js`, `difficulty.js`, `infoSentence.js`, `src/screens/question.js`) geprüft, bevor `business-analyst` daraus ggf. Stories schneidet. Fachliche/Sinnhaftigkeits-Bewertung siehe `requirements.md`, Abschnitt "Bewertung vorgeschlagener Content-Erweiterungen". **Reine Einschätzung, keine Implementierung.**

### 1. Fell-/Federn-Farbe

**Passt ins bestehende `FIELD_DEFINITIONS`-Muster, kein neuer Mechanismus nötig.** Technisch identisch zum bereits bewährten Muster von `diet`/`conservation_status` (`kind: "enum"`): ein neues Feld (Arbeitsname `fur_feather_color`, englische Namenskonvention wie alle übrigen technischen Feldnamen im Schema) mit einem kleinen, festen Enum-Wertebereich, ein neuer `FIELD_DEFINITIONS`-Eintrag (Frage-/Identify-Text, `getValue`, `format`) sowie ein Eintrag in `EASY_FIELDS` oder `HARD_ONLY_FIELDS` (`difficulty.js`) — Zuordnung ist eine offene Entscheidung mit `business-analyst`/Nutzer, siehe `requirements.md`.

**Wichtiger Punkt zur Frage "nicht anwendbar vs. unbekannt" (vom Nutzer explizit aufgeworfen):** Braucht **keine** neue Schema-Semantik. Das bestehende Optional-Feld-Muster (seit der Korrektur in Issue #2 für `habitat`/`continent`/`weight_kg` etabliert) unterscheidet im Code ohnehin nicht zwischen "Feld für dieses Tier nicht anwendbar" und "Feld für dieses Tier (noch) nicht befüllt" — beide Fälle sind schlicht `null`/nicht vorhanden, und `getCorrectValue()`/`FIELD_DEFINITIONS.*.getValue()` überspringen fehlende Werte bereits robust (siehe `questionGenerator.js`, Kommentar "Pflicht laut architecture.md: fehlende optionale Felder überspringen statt crashen"). Für Fisch/Reptil/Amphibie/Insekt/Spinnentier (66 von 500 Tieren, real gemessen) bleibt `fur_feather_color` einfach dauerhaft `null` — das ist keine Lücke, sondern korrektes Verhalten, und erfordert keinen zusätzlichen `applicable_categories`-Mechanismus oder Ähnliches. Einzige Vorkehrung: Die Kurations-Anleitung an `zoologe` sollte klarstellen, dass diese 66 Tiere bewusst ausgelassen werden (keine Kuration nötig/gewünscht), nicht dass dort ein Wert fehlt.

**Enum-Vorschlag (fachlich mit `zoologe` final abzustimmen, hier nur technischer Rahmen):** grobe Farbklassen statt exakter Naturtonbeschreibung, z. B. `braun`, `grau`, `schwarz`, `weiß`, `rot/orange`, `gelb`, `bunt/gemustert` — ähnlich klein wie das bestehende `category`-Enum (7 Werte), damit `buildValueQuestion` genug unterscheidbare Falschantworten pro Anfrage findet. Ein zu feines Enum (z. B. 20+ Farbtöne) würde die Kuration erschweren, ohne den Quiz-Mechanismus zu verbessern.

**Risiko, das an `zoologe`/`business-analyst` zurückgemeldet wird (keine Architektur-Entscheidung, sondern Content-Risiko):** Sollten Braun-/Grautöne bei Säugetieren stark dominieren, könnten Falschantworten bei der "distinct"-Strategie (Stufe 6–10) weniger klar unterscheidbar ausfallen als bei anderen Feldern wie `category` oder `continent`. Kein technischer Blocker, aber Grund für die in `requirements.md` empfohlene Rückfrage zur Schwierigkeitsstufen-Zuordnung.

**Aufwand:** Klein-mittel für den Code-Anteil (ein neuer `FIELD_DEFINITIONS`-Eintrag nach bewährtem Muster, ähnlich risikoarm wie die ursprüngliche Einführung von `diet`/`conservation_status`), separat von der (deutlich größeren) Kurations-Story.

### 2. "Besonderheiten des Tieres" — Deckungsgleich mit `fun_fact`, aber Anzeige-Code fehlt noch

**Kein neues Feld, keine neue Architektur nötig** — `fun_fact` ist bereits vollständiges optionales Schema-Feld (siehe Datenschema oben) mit fertiger UX-Spezifikation (`design.md`, "Fun Fact im Feedback-Schritt"). Kein Bezug zu `infoSentence.js`: Der Infosatz-Mechanismus baut Sätze **ausschließlich aus strukturierten Enum-/Zahlenfeldern** über feste, geprüfte Satzbausteine (`CATEGORY_INFO`, `HABITAT_PHRASES` etc.) — bewusst kein freier Text, siehe Datei-Kommentar in `infoSentence.js`. `fun_fact` ist dagegen ein eigenständiger, roh eingepflegter Freitext-String, der als **separater Block** unterhalb des Feedbacks angezeigt wird (laut `design.md`), nicht in die Fallback-Kette des Infosatzes integriert wird. Die beiden Mechanismen bleiben bewusst getrennt: eine Erweiterung von `infoSentence.js` um Freitext wäre eine Vermischung zweier unterschiedlicher Konzepte (deterministisch generiert vs. kuratierter Freitext) ohne technischen Nutzen.

**Korrektur einer impliziten Annahme aus der Anfrage:** `fun_fact` ist **nicht** bereits "nur noch eine Datenfrage" wie `diet`/`lifespan_years` (Issues #18/#19). Eine Code-Prüfung (`grep fun_fact src/`) zeigt: Das Feld kommt aktuell ausschließlich in `src/quiz/__fixtures__/sampleAnimals.js` (Testdaten) vor, **nicht** in `src/screens/question.js` — anders als `wikipedia_url_de` (Issue #15), das dort bereits vollständig verdrahtet ist (`if (answeredAnimal?.wikipedia_url_de) { ... }`, `src/screens/question.js` Zeilen ~419–423). Es fehlt also noch die Anzeige-Implementierung selbst, nicht nur der Dateninhalt.

**Empfehlung an `business-analyst`:** Zwei separate Stories, keine einzelne "Kurations-Story":
1. Implementierungs-Story (`web-developer`): UI-Block gemäß fertiger `design.md`-Spezifikation umsetzen — vom Zuschnitt/Risiko vergleichbar mit Issue #15 (kleiner, klar spezifizierter Änderungsumfang in `question.js`, kein neuer Zustand in `state.js` nötig, analog zur bereits getroffenen Feststellung bei der Bild-Rateshilfe, dass rein UI-lokaler Zustand ausreicht).
2. Kurations-Story (`zoologe`): inhaltlich wie in `requirements.md` beschrieben, mit deutlich höherem Aufwand pro Tier als bei `diet`/`lifespan_years` (Freitext-Formulierung statt Einzelwert-Bestimmung) — Empfehlung: phasenweise, mit einer ersten überschaubaren Tranche statt allen 500 Tieren auf einmal, da das UX-Design bereits für Teilbefüllung ausgelegt ist (kein sichtbarer Unterschied bei fehlendem Wert).

**Aufwand:** Implementierungsteil klein (fertige Spezifikation, bewährtes Muster aus Issue #15). Kurationsteil mittel-groß und am besten in Tranchen geplant, nicht als einzelne 500-Tier-Story.

## Technische Einschätzung: Drei vorgeschlagene neue Spielmodi (14.08.2026, `software-architect`, konsultiert mit `zoologe`/`ux-design`/`business-analyst`)

Der Nutzer hat drei neue Spielmodi vorgeschlagen (Umkehr-Quiz, Fehlerbild, Tiergeräusche) und um eine Machbarkeitsbewertung gebeten. **Reine Einschätzung, keine Implementierung, keine Issues angelegt.** Fachliche Priorisierung siehe `requirements.md`, Abschnitt "Bewertung dreier neuer Spielmodi"; UX-Skizze siehe `design.md`.

### 1. Umkehr-Quiz — Wiederverwendung des Bild-Rateshilfe-Mechanismus (Issue #16)

**Technischer Kern ist bereits vollständig vorhanden.** Der für Option D′ gebaute Laufzeit-Mechanismus (`image_filename` → Commons `action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=330&origin=*` → `thumburl` + Attributionsdaten in einem Request, siehe Abschnitt G oben) ist unverändert wiederverwendbar — technisch ist der Umkehr-Quiz-Modus kein neuer API-Mechanismus, sondern derselbe Aufruf, nur als **Pflichtbestandteil statt optionalem Hint** verwendet.

**Was sich dadurch ändert (nicht nur Wiederverwendung, echte neue Anforderungen):**
- **"Ausblenden bei Fehler" reicht nicht mehr.** Im Rateshilfe-Fall verschwindet bei einem Fehlschlag einfach ein optionaler Button — das Quiz läuft unverändert weiter. Im Umkehr-Quiz-Modus **ist** das Bild die Frage; schlägt der Abruf fehl, gibt es keine spielbare Frage. Nötig ist daher ein **Vorab-Check pro Frage** (Bild erfolgreich aufgelöst, bevor die Frage überhaupt angezeigt wird) statt des bisherigen "zeig Frage sofort, Bild kommt vielleicht später"-Musters — z. B. Bild für die nächste Frage bereits im Hintergrund laden/prüfen, während die aktuelle Frage noch läuft, oder ein kurzer Lade-Zustand vor Anzeige der Frage selbst (nicht nur im Button wie bisher).
- **Attribution auf jeder Frage, nicht nur gelegentlich.** Bisher war die Attributionszeile ein Rand-Detail eines optionalen Buttons. Hier erscheint sie bei **jeder einzelnen Frage** — UX-seitig zu berücksichtigen (siehe `design.md`), technisch unverändert (gleiches `extmetadata`-Feld).
- **Fragegenerierung neu, aber klein:** Ein neuer, paralleler Fragepfad (analog zu `buildValueQuestion`/`buildIdentifyQuestion`) wählt ein Zieltier, löst dessen Bild auf und zieht plausible Falschantworten aus dem übrigen Pool (z. B. gleiche `category`, damit Kinder nicht nur nach Größenklasse raten). Kein neues Datenfeld nötig — `image_filename` und `category` reichen.
- **State:** Bild-Lade-/Fehlerzustand bleibt wie bei der Rateshilfe UI-lokaler Zustand des Frage-Bildschirms, kein neues globales Zustandsfeld nötig.

**NFR-1-Frage (siehe `requirements.md`):** Anders als bei Issue #16 ist hier nicht ein optionaler Button, sondern der **gesamte Modus** ohne Internetverbindung nicht spielbar. Technisch sauber lösbar (analoge "weich ausblenden"-Logik, aber diesmal auf Modus-Ebene: fehlt beim Start dieses Modus die Verbindung bzw. schlägt ein erster Testabruf fehl, wird der Modus gar nicht erst betretbar, mit freundlichem Hinweis statt Fehlermeldung) — das ist aber eine **Scope-Entscheidung für `business-analyst`/Nutzer**, keine rein technische.

**Aufwand:** Klein-mittel — kein neuer Netzwerk-Mechanismus, sondern eine neue Nutzung eines bestehenden, bereits produktiv getesteten Mechanismus, plus eine neue Fragegenerierungs-Funktion und ein neuer Bildschirm-Zustand (Vorab-Check statt Nachträglich-Ausblenden).

### 2. Fehlerbild — kein bestehender Mechanismus wiederverwendbar

**Kategorial anderer Aufwandstyp.** Alle bisherigen Inhalte (Texte aus Wikidata, Bilder/perspektivisch Töne von Commons) sind **vorhandene** Daten, die abgerufen/kuratiert werden. Für "Original + Version mit 5 eingefügten Unterschieden" gibt es keine vorhandene Datenquelle — das Bildpaar muss aktiv **erzeugt** werden (Bildbearbeitung oder KI-gestützte Bildgenerierung). Das sprengt die bisherige Pipeline-Architektur (`fetch-animals.js` + Laufzeit-API-Calls) komplett; es bräuchte einen eigenen, neuen Content-Produktionsprozess außerhalb dieser Architektur.

**Neue technische Anforderungen, die es bisher im Projekt nicht gab:**
- **Datenstruktur für Klickflächen:** Pro Bildpaar müssten die 5 Unterschiede als Koordinaten/Bounding-Boxes hinterlegt werden (z. B. `data/spotTheDifferencePairs.json`, ähnlich wie `data/confusionPairs.json` für die Verwechslungspaare, aber mit Koordinaten statt Textmerkmalen) — Trefferprüfung beim Klick gegen diese Koordinaten, inkl. Toleranzbereich für Kinderfinger (siehe bestehende Touch-Ziel-Anforderungen in `design.md`).
- **Lizenzfrage neu:** Eine bearbeitete Version eines Commons-Fotos ist ein Bearbeitungswerk. Bei den überwiegend CC-BY-SA-Bildern (89,8 % laut Issue-#16-Messung) greift die Share-Alike-Pflicht — die bearbeitete Version müsste unter derselben Lizenz weitergegeben werden. Bisher musste die App nie ein Bild verändern, nur unverändert live anzeigen; das ist ein neuer rechtlicher Fall.
- **Speicherfrage:** Anders als beim Live-Hotlinking der anderen Bild-/Ton-Features müssten die bearbeiteten Bildpaare selbst **irgendwo gespeichert** werden (lokal gebündelt oder auf einem eigenen Hosting) — Live-Nachladen des unveränderten Commons-Originals reicht hier nicht, da ja gerade die bearbeitete Version gebraucht wird.

**Empfehlung:** Nicht mit der bestehenden Pipeline/dem bestehenden Team-Zuschnitt (Wikidata-Fetch + `zoologe`-Textkuration) sinnvoll leistbar. Falls der Nutzer das dennoch will, empfiehlt sich ein kleiner, bewusst isolierter Pilotversuch (5–10 Paare, manuell erstellt) als eigene Machbarkeitsstudie außerhalb des normalen 500-Tiere-Rhythmus, nicht als reguläre Story im bestehenden Zuschnitt.

### 3. Tiergeräusche — reale P51-Messung (Stichprobe n=30)

**Messmethodik:** Analog zur P18-Bildabdeckungsmessung aus Issue #16 (`measure-image-coverage.js`), aber als Stichprobe (n=30 von 500 zufällig gezogene Tiere aus `data/animals.json`) statt Vollmessung, gegen Wikidata-Property **P51 ("audio")** und anschließend gegen die Commons-`imageinfo`-API für die gefundenen Audiodateien (gleiche Methodik wie die Lizenzmessung für Bilder).

**Ergebnis:**

| Kategorie (Stichprobe) | n | mit P51-Audio | Anteil |
|---|---|---|---|
| Vogel | 7 | 4 | 57,1 % |
| Säugetier | 17 | 1 | 5,9 % |
| Fisch | 6 | 0 | 0 % |
| **Gesamt** | **30** | **5** | **16,7 %** |

**Lizenz der 5 gefundenen Audiodateien:** 4× CC BY-SA (3.0/4.0), 1× Public Domain — nahezu identische Verteilung zur bereits gemessenen Bildlizenzlage (10,2 % CC0/PD bei Bildern). Der bei Option D′ etablierte Mechanismus (Live-Abruf + Live-Attribution, kein lokales Bundling) ist strukturell 1:1 auf Audiodateien übertragbar — `iiprop=url|extmetadata` liefert für Audiodateien ebenso eine direkte URL plus Lizenzmetadaten wie für Bilder.

**Hochrechnung auf alle 500 Tiere** (reale Kategorienverteilung: 215 Säugetiere, 219 Vögel, 39 Fische, 11 Insekten, 10 Reptilien, 5 Amphibien, 1 Spinnentier — bereits an anderer Stelle in diesem Dokument gemessen): grobe Schätzung **≈ 140 von 500 Tieren (~28 %)** mit verfügbarem Ton, stark vogellastig (~125 der ~140 wären Vögel). **Ausdrücklich eine grobe Hochrechnung aus einer kleinen Stichprobe (Fehlerbereich pro Gruppe entsprechend hoch, insbesondere bei nur n=6–17 pro Kategorie), keine belastbare Zahl.** Empfehlung vor einer finalen Entscheidung: **vollständige P51-Messung über alle 500 Tiere**, exakt nach dem Muster von `measure-image-coverage.js` (dort P18, hier P51), um die Schätzung zu verifizieren.

**Technische Machbarkeit falls umgesetzt:** Gleicher Mechanismus wie Umkehr-Quiz (Vorab-Check pro Frage statt Ausblenden nach Fehler, Attribution auf jeder Frage, Fragepool auf Tiere mit vorhandenem P51 filtern). Zusätzlich zu prüfen (nicht gemessen in diesem Schritt): tatsächliche Dateigröße/Ladezeit von `.ogg`-Audiodateien — vermutlich ähnlich unkritisch wie Bild-Thumbnails, aber ungemessen; sollte Teil der Vollmessung sein, analog zur bereits für Bilder durchgeführten Performance-Messung (Abschnitt F oben).

**Aufwand:** Vergleichbar mit Umkehr-Quiz (gleicher Live-Abruf-Mechanismus, gleiche NFR-1-Frage), aber zusätzlich abhängig vom Ergebnis der empfohlenen Vollmessung, bevor der tatsächlich nutzbare Tierpool feststeht.

## Branch-Strategie für neue Spielmodi (14.08.2026, `software-architect`)

**Frage vom Nutzer:** Sollten neue Spielmodi auf einem eigenen Git-Branch statt direkt auf `main` entwickelt werden?

**Bisheriger Workflow:** Alle bisherigen Issues (#1–#21) wurden in kleinen, in sich abgeschlossenen Schritten direkt auf `main` committet — passend zu einem Kleinprojekt mit überschaubarem Umfang pro Änderung, bei dem `main` nach jedem Commit weiterhin durchgängig spielbar blieb.

**Abwägung für die drei neuen Spielmodi:**
- **Dafür (Feature-Branch):** Ein neuer Spielmodus wie Umkehr-Quiz oder Tiergeräusche besteht realistisch aus mehreren Stories (Fragegenerierung, neuer Bildschirm-/UI-Zustand, Modus-Auswahl-UI, ggf. NFR-1-Ausnahme), die erst in Kombination ein Ende-zu-Ende spielbares Ergebnis ergeben. Zwischen der ersten und letzten Story wäre bei direktem Commit auf `main` entweder unfertiger/unerreichbarer Code sichtbar im Hauptzweig, oder man müsste jede Zwischen-Story bereits vollständig in die Haupt-Navigation verdrahten, obwohl der Modus noch nicht fertig ist. Ein Feature-Branch erlaubt, den kompletten neuen Modus isoliert fertigzustellen und erst als Ganzes zu mergen — `main` bleibt währenddessen jederzeit exakt im aktuellen, bekannten, spielbaren Zustand.
- **Dagegen:** Merge-Aufwand (Konflikte, insbesondere falls `question.js`/`start.js`/`difficulty.js` parallel noch für andere Stories angefasst werden) und ein Bruch mit dem bisherigen, bewährten Direkt-auf-main-Rhythmus des Projekts — zusätzlicher Prozess-Overhead für ein Projekt, das bewusst schlank gehalten wird.

**Empfehlung: Ja, eigener Feature-Branch pro neuem Spielmodus** (z. B. `feature/umkehr-quiz`, `feature/tiergeraeusche`), aber **nicht** als generelle Abkehr vom bisherigen Workflow: Bugfixes, Content-Kuration (z. B. weitere `fun_fact`-Tranchen) und kleine, in sich abgeschlossene Änderungen am bestehenden Quizfragen-Modus bleiben wie bisher direkte Commits auf `main`. Der Unterschied liegt im **Umfang und Zwischenzustand**: Ein neuer Spielmodus ist der erste Fall im Projekt, der zwingend mehrere Stories braucht, bevor er überhaupt spielbar ist — genau dafür ist ein Feature-Branch gedacht, nicht als pauschale Prozess-Verschärfung. Merge zurück nach `main` erst, wenn der jeweilige Modus Ende-zu-Ende spielbar und (selbst-)review-fähig ist, nicht nach jeder Zwischen-Story.

**Reihenfolge falls mehrere Modi verfolgt werden:** Jeweils ein eigener Branch pro Modus, nicht ein gemeinsamer "neue Modi"-Sammel-Branch — die drei Ideen sind technisch und im Aufwand zu unterschiedlich (siehe oben), um sinnvoll gemeinsam entwickelt und gemeinsam gemerged zu werden.

## Änderungshistorie

- 2026-08-13: Erste Version — Datenschema für die Tierdatenbank (Phase 1: Quizfragen-Modus), Lizenz-/Quellenmodell, Skizze zur Wikidata-Datenbeschaffung.
- 2026-08-13: Schwierigkeitsstufen-Mapping ergänzt, offene technische Fragen anhand der Klärungsrunde mit dem Nutzer aufgelöst.
- 2026-08-13: Frontend-Tech-Stack entschieden (Issue #1): Vite + Vanilla JavaScript ohne UI-Framework, plain CSS, `data/animals.json` per statischem ES-Modul-Import eingebunden. Projektstruktur um Frontend-Ordner (`src/`, `tests/`) ergänzt.
- 2026-08-13: Schema-Korrektur nach realem Pipeline-Testlauf (Issue #2): Pflichtfelder auf `id`/`name_de`/`category` reduziert (`habitat`, `continent`, `weight_kg` von Pflicht zu optional herabgestuft), `color` komplett aus dem Schema entfernt — reale Wikidata-Abdeckung dieser Felder bei populären Tier-Kandidaten lag bei 0–14 %, siehe `docs/workflow/devops.md` für die gemessenen Zahlen.
- 2026-08-13: Technische Einschätzung der Zoologe-Anreicherungsideen für `business-analyst`: Gefährdungsstatus-Fragetyp ist bereits implementiert (Korrektur einer falschen Annahme), `diet`/`lifespan_years` sind reine Daten-Stories ohne Code-Bedarf, Vergleichs-/Rekordhalter-Fragen brauchen einen neuen gemeinsamen Mechanismus, Verwechslungspaare eine eigenständige kleine Erweiterung (siehe Abschnitt "Technische Entscheidungen & Trade-offs" Punkt 5).
- 2026-08-14: Merge-Vorkehrung für manuell kuratierte Felder (`diet`, `lifespan_years`) bei Pipeline-Reruns entschieden (Issue #15, Anlass: `wikipedia_url_de` erfordert Neugenerierung von `data/animals.json`), damit ein Rerun von `fetch-animals.js` diese seit #18/#19 kuratierten Werte nicht überschreibt — siehe Abschnitt "Pipeline-Regenerierung vs. manuell kuratierte Felder" oben.
- 2026-08-14: Optionales Feld `wikipedia_url_de` ergänzt (Issue #15) — Link zum deutschen Wikipedia-Artikel für den Feedback-Bereich, aus dem bereits vorhandenen `sitelinks.dewiki.title` im Hydration-Cache abgeleitet, kein neuer Netzwerk-Call.
- 2026-08-13: Verwechslungspaare (Issue #21) für `status:ready`-Freigabe konkretisiert: Mindestumfang 15 (Ziel 20–30) kuratierte Paare, Datenstruktur `data/confusionPairs.json` festgelegt (siehe Abschnitt "Verwechslungspaare — Datenstruktur & Mindestumfang").
- 2026-08-14: Erweiterte Evaluation der Bild-Rateshilfe-Optionen (Issue #16, auf Nutzerwunsch, keine neue Entscheidung): recherchierte GitHub-/Git-LFS-Größenlimits, Hotlinking-vs-Bundling-Trade-offs inkl. Kompromissvariante "Bild-Hint als optionale Online-Zusatzfunktion", sowie speicherarme Alternativen (komprimierte Thumbnails, Browser-Caching, CC0-only-Subset) verglichen. Empfehlung: Option B′ (Thumbnails statt Originalen) als Verfeinerung der bestehenden Option-B-Entscheidung, siehe Abschnitt "Bild-Rateshilfe (Issue #16): Erweiterte Evaluation".
- 2026-08-14: Reale Performance-Messung für Option D′ (Issue #16, auf Nutzerwunsch, keine neue Entscheidung): `curl`-Messung an 30 echten Commons-Bildern zeigt kein `Cache-Control`/`Expires` bei Wikimedia, aber funktionierende `ETag`-basierte 304-Revalidierung; Originalgrößen Median 1,6 MB (bis 12,6 MB), Thumbnails (330px) Median 32 KB (~50× kleiner); reale Ladezeiten 0,1–0,7 s (Original) bzw. durchgehend < 0,25 s (Thumbnail) plus ~0,5 s API-Lookup-Overhead. Empfehlung: Thumbnail statt Original als Default, P18-Dateiname zur Build-Zeit statt zur Laufzeit auflösen. Siehe Abschnitt "Performance-Messung Option D′".
- 2026-08-14: Technische Einschätzung zweier vom Nutzer vorgeschlagener Content-Erweiterungen (Fell-/Federn-Farbe, "Besonderheiten des Tieres"), reine Bewertung ohne Implementierung: Farbe passt ins bestehende `FIELD_DEFINITIONS`-Muster ohne neue "nicht anwendbar"-Semantik (bestehendes Optional-Feld-Verhalten reicht); "Besonderheiten" ist inhaltlich deckungsgleich mit dem bereits geplanten `fun_fact`-Feld, dessen Anzeige-UI aber entgegen ursprünglicher Annahme noch nicht implementiert ist (nur `wikipedia_url_de` aus Issue #15 ist verdrahtet) — braucht daher eine kleine Implementierungs- plus eine separate Kurations-Story. Details siehe Abschnitt "Technische Einschätzung: Zwei vorgeschlagene Content-Erweiterungen". Fachliche Bewertung siehe `requirements.md`.
- 2026-08-14: **PM-Entscheidung final: Option D′.** Issue #16 komplett rescoped, Option B verworfen. Neues optionales Schema-Feld `image_filename` (P18-Dateiname, zur Build-Zeit aus bereits geladenen Claims extrahiert, kein Bild-Byte). Finale technische Leitplanken für Build- vs. Laufzeit-Split, Commons-`imageinfo`-Aufruf (`iiurlwidth=330`, `origin=*`, liefert `thumburl` + `extmetadata` in einem Request), Fehlerbehandlung (Button blendet sich bei fehlendem `image_filename` oder Netzwerkfehler aus), kein Caching-Sonderkonzept (Standard-HTTP-Cache reicht). `requirements.md` NFR 1 um gezielte Ausnahme ergänzt (analog Issue #14). Issue #17 (Attributionslösung vor Veröffentlichung) dadurch gegenstandslos, geschlossen. Siehe Abschnitt "Bild-Rateshilfe (Issue #16): Finale technische Leitplanken für Option D′".
- 2026-08-14: Technische Einschätzung dreier vom Nutzer vorgeschlagener neuer Spielmodi (Umkehr-Quiz, Fehlerbild, Tiergeräusche), reine Bewertung ohne Implementierung: Umkehr-Quiz kann den bestehenden Bild-Rateshilfe-Mechanismus (Issue #16, Option D′) fast unverändert wiederverwenden (100 % `image_filename`-Abdeckung), braucht aber einen Vorab-Check statt Nachträglich-Ausblenden sowie eine explizite Entscheidung zur Online-Abhängigkeit des gesamten Modus. Fehlerbild braucht einen komplett neuen Content-Produktionsprozess (keine vorhandenen Bildpaar-Daten, neue Lizenzfrage durch Bearbeitungswerke) und wird nicht empfohlen im aktuellen Team-/Pipeline-Zuschnitt. Tiergeräusche real gemessen (Stichprobe n=30, Wikidata-Property P51): 16,7 % Gesamtabdeckung, stark vogellastig (57,1 % bei Vögeln vs. 5,9 % bei Säugetieren, 0 % bei Fischen in der Stichprobe), Lizenzlage nahezu identisch zu Bildern (4/5 CC-BY-SA, 1/5 PD) — Empfehlung: Vollmessung vor finaler Entscheidung. Zusätzlich Branch-Strategie-Empfehlung: eigener Feature-Branch pro neuem Spielmodus, bestehender Direkt-auf-main-Rhythmus bleibt für kleinere Änderungen bestehen. Details siehe Abschnitte "Technische Einschätzung: Drei vorgeschlagene neue Spielmodi" und "Branch-Strategie für neue Spielmodi". Fachliche Bewertung/Priorisierung siehe `requirements.md`.
