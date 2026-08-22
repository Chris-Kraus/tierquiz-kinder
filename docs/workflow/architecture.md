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
| `fur_feather_color` | string, Enum (braun, grau, schwarz, weiß, rot/orange, gelb, bunt/gemustert) | nein | **Neu, Issue #22, 14.08.2026.** Fell-/Federfarbe, grobe Farbklasse statt exakter Naturtonbeschreibung (analog zu `category`, 7 Werte) — Basis für einen neuen, kindgerechten Fragetyp ("Welche Farbe hat das Fell/Gefieder von ...?") der einfachen Schwierigkeitsstufe. Nicht durch die Wikidata-Pipeline befüllt, sondern manuell durch `zoologe` kuratiert (analog zu `diet`/`lifespan_years`, Issues #18/#19) — Kuration ist eine separate Story (#23). Nur für Säugetiere/Vögel sinnvoll (434/500 Tiere); bei den übrigen 66 (Fisch, Reptil, Amphibie, Insekt, Spinnentier) bleibt das Feld planmäßig `null`, kein eigener "nicht anwendbar"-Mechanismus (siehe "Technische Einschätzung: Zwei vorgeschlagene Content-Erweiterungen" → "1. Fell-/Federn-Farbe" oben). |
| `audio_filename` | string | nein | **Neu, Tiergeräusche-Modus, 14.08.2026, siehe Abschnitt "Tiergeräusche: Finale technische Leitplanken" unten.** Reiner Commons-Dateiname ohne `File:`-Präfix (z. B. `"Corvus corax call.ogg"`), aus Wikidata-Property **P51** ("audio") extrahiert — technisch identisch zur `image_filename`-Extraktion (Issue #16): `getStringClaim()` auf die ohnehin bereits geladenen `claims`, kein neuer Netzwerk-Call zur Build-Zeit. Enthält **keine** Audio-URL, keine Lizenz-/Attributionsdaten und kein Audio-Byte — das eigentliche Audiofile wird nie gespeichert, nur live zur Laufzeit von Wikimedia Commons abgerufen. Optional, da P51 selbst optional ist und real gemessen nur bei 157 von 500 Tieren (31,4 %) vorhanden ist (Vollmessung 14.08.2026, `scripts/fetch-animals/measure-audio-coverage.js`, deutlich vogellastig: Vogel 56,6 %, Säugetier 13,0 %, Fisch 0,0 %). |

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
- **Geräusch-Referenzen** — ursprünglich nur als Randnotiz für später vermerkt, mit dem Story-Zuschnitt des Tiergeräusche-Modus (14.08.2026) jetzt konkretisiert und dem Schema als optionales Feld `audio_filename` hinzugefügt (siehe Feldtabelle oben sowie Abschnitt "Tiergeräusche: Finale technische Leitplanken" unten) — analog zur Entwicklung von `image_filename` von Randnotiz zu tatsächlichem Feld bei Issue #16.
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
        "image_filename": { "type": "string", "minLength": 1 },
        "fur_feather_color": {
          "type": "string",
          "enum": ["braun", "grau", "schwarz", "weiß", "rot/orange", "gelb", "bunt/gemustert"]
        },
        "audio_filename": { "type": "string", "minLength": 1 }
      }
    }
  }
}
```

**Änderung 14.08.2026 (Tiergeräusche-Modus):** Optionales Feld `audio_filename` ergänzt (Commons-Dateiname ohne `File:`-Präfix, aus Wikidata-Property P51 abgeleitet, reiner Text) — technisch identisch zur `image_filename`-Ergänzung aus Issue #16. Siehe Feldtabelle oben und Abschnitt "Tiergeräusche: Finale technische Leitplanken" unten.

**Änderung 14.08.2026 (Issue #22):** Optionales Feld `fur_feather_color` ergänzt (Fell-/Federfarbe, 7-wertiges Enum). Nur für Säugetiere/Vögel relevant (434/500 Tiere); für die übrigen 66 Tiere bleibt das Feld `null` — kein neuer Schema-Mechanismus für "nicht anwendbar" (siehe Feldtabelle oben und "Finale Leitplanken" im Abschnitt "Technische Einschätzung: Zwei vorgeschlagene Content-Erweiterungen"). Werte selbst werden in der separaten Kurations-Story #23 eingepflegt — zum Zeitpunkt dieser Story ist `data/animals.json` bewusst noch nicht geändert.

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

**Ergänzung 14.08.2026 (`business-analyst`-Entscheidung, siehe `requirements.md`, Abschnitt "Bewertung vorgeschlagener Content-Erweiterungen"):** Ein neues, manuell kuratiertes Feld für Fell-/Federnfarbe (Arbeitsname z. B. `fur_feather_color`, finaler Feldname/Enum vor Umsetzung final mit `zoologe` abzustimmen) wird bei Umsetzung der **einfachen Stufe (6–10)** zugeordnet, nicht der anspruchsvollen — analog zu `category`/`habitat`/`continent`. Betrifft nur die 434 von 500 Tieren mit Fell/Federn (Säugetiere + Vögel); für die übrigen 66 Tiere (Fisch, Insekt, Reptil, Amphibie, Spinnentier) bleibt das Feld schlicht unbefüllt — das bestehende Muster "optionales Feld, Fragegenerierung überspringt fehlende Werte" deckt diesen Fall bereits ab, keine neue "nicht anwendbar"-Sonderbehandlung im Schema nötig.

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

## Bild-Rateshilfe: Automatische Anzeige nach der Antwort (Issue #30, 14.08.2026, `software-architect`, umsetzungsreif)

**Anlass:** Nutzeranforderung, zusätzlich zum bestehenden, unveränderten "Bild zeigen"-Button aus Issue #16 (optional, vor der Antwort, manueller Klick) das Tierbild **nach** Abgabe der Antwort automatisch — ohne Klick — als Teil des Feedback-Bereichs anzuzeigen, ergänzend zu Infosatz/Fun Fact/Wikipedia-Link (#12/#24/#15).

**Grundsatzentscheidung: Wiederverwendung statt Neubau, aber neue Instanz statt geteilter Zustand.** Die reinen, DOM-/fetch-freien Hilfsfunktionen aus `src/quiz/imageHint.js` (`buildCommonsImageInfoUrl`, `extractImageInfo`, `buildAttribution`) sind bereits trigger-neutral — sie kennen weder Button noch Klickzeitpunkt, nur Dateiname rein, Bildinfo raus. Diese werden **unverändert wiederverwendet**, keine Duplikation der URL-Konstruktion/Antwort-Parsing-Logik. Gleiche Konstanten wie bei Issue #16: `THUMBNAIL_WIDTH = 330`, `REQUEST_TIMEOUT_MS = 3500`, derselbe Commons-Endpoint. Neu ist ausschließlich die **DOM-Verdrahtung**: ein zweiter, eigenständiger Bildbereich innerhalb des Feedback-Bereichs (analog zum bestehenden Präzedenzfall, dass der Fun-Fact-Block aus Issue #24 bewusst ein **eigenständiger** Block neben dem Infosatz-Block ist statt darin integriert) — nicht dieselben DOM-Elemente wie der Pre-Answer-Button/-Bereich, da Platzierung (Feedback-Bereich statt oberhalb der Antwortkacheln), Trigger (automatisch statt Klick) und Sichtbarkeitslogik (siehe unten) unterschiedlich sind.

**Trigger:** Der Abruf wird zum selben Zeitpunkt ausgelöst, zu dem der Feedback-Bereich sichtbar wird (Antwortauswahl abgeschlossen) — kein Klick, kein separater Auslöser. Voraussetzung wie bei #16: `image_filename` muss für das aktuelle Tier vorhanden sein.

**Vermeidung von Duplikat-Anzeige/-Abruf bei bereits manuell aufgedecktem Bild (Antwort auf offene UX-Frage, mit `ux-design` abgestimmt):** Da `resetImageHint()` ausschließlich beim Wechsel zur **nächsten** Frage aufgerufen wird (nicht bei Antwortabgabe), bleibt ein vor der Antwort manuell aufgedecktes Bild (Pre-Answer-Bereich, Issue #16) beim Feedback weiterhin sichtbar oberhalb der Antwortkacheln. Ein zusätzlicher automatischer Abruf im Feedback-Bereich wäre in diesem Fall ein exaktes Duplikat auf demselben Bildschirm (unnötiger zweiter Netzwerk-Call, verwirrend doppelte Bildanzeige). **Entscheidung: Ist das Bild für die aktuelle Frage bereits erfolgreich manuell aufgedeckt (Pre-Answer-Bereich sichtbar, nicht `hidden`), wird der automatische Feedback-Bereich-Bildblock übersprungen — kein zweiter Abruf, kein zweites Bild.** Nur wenn das Kind vor der Antwort **nicht** geklickt hat, löst die Antwortabgabe den automatischen Abruf aus. Dafür genügt ein einfacher Zustandscheck (`!imageHintEl.hidden` bzw. äquivalent) zum Zeitpunkt der Antwortabgabe — kein neuer globaler State nötig.

**Fehlerbehandlung — identisch zu Issue #16:** Fehlt `image_filename`, ist das Bild bereits manuell aufgedeckt (siehe oben), oder schlägt der automatische Abruf fehl (kein Netz, Timeout, keine verwertbare Commons-Antwort), erscheint der Feedback-Bild-Block schlicht **nicht** — kein Fehlertext, kein kaputter Platzhalter, kein Layout-Sprung. Gleiches Prinzip wie beim bestehenden Fun-Fact-Block (optionaler Block, der bei fehlendem Inhalt komplett wegfällt statt einen leeren Rahmen zu zeigen).

**Nicht-blockierend (wichtige Leitplanke, da sonst ein Regressionsrisiko gegenüber dem bestehenden Feedback-Verhalten bestünde):** Feedback-Text, Infosatz, Fun Fact und der "Weiter"-Button dürfen **nicht** auf den Bildabruf warten — sie erscheinen wie bisher sofort. Der Bildblock poppt bei Erfolg **nachträglich, still** ein, sobald die Antwort da ist (typisch < 1,5 s laut bestehender Messung, Abschnitt F), ohne den übrigen Feedback-Ablauf zu verzögern. Ein Kind, das sofort "Weiter" tippt, bevor der Abruf abgeschlossen ist, verpasst lediglich das automatische Bild — das ist unkritisch (keine Kernfunktion), erfordert aber denselben Stale-Response-Schutz wie beim bestehenden `imageHintRequestId`/`AbortController`-Muster (siehe Abschnitt G), damit eine spät eintreffende Antwort nicht versehentlich in den Feedback-Bereich der bereits nächsten Frage rendert.

**Alt-Text — bewusst abweichend vom Umkehr-Quiz-Modus (#28):** Anders als beim Umkehr-Quiz, wo der Tiername im Alt-Text die gesuchte Antwort verraten würde (siehe Abschnitt "1. Umkehr-Quiz" unten), ist die richtige Antwort an dieser Stelle (Feedback-Bereich, nach Antwortabgabe) bereits bekannt/angezeigt — hier ist ein aussagekräftiger Alt-Text mit Tiernamen (analog zum bestehenden Pre-Answer-Bild aus #16, `alt="{name_de}"`) unproblematisch und sogar hilfreich.

**NFR-1-Einordnung:** Keine neue, eigenständige Online-Ausnahme nötig — dies ist eine zweite Auslöse-Instanz **innerhalb** der bereits in Issue #16 etablierten, gezielten NFR-1-Ausnahme ("optionale Bild-Rateshilfe im Quizmodus"), nicht eine neue Kategorie wie beim Umkehr-Quiz (dort: ganzer Modus nicht offline spielbar). Die Kernfunktion (Fragen/Antworten/Punktestand) bleibt unverändert zu 100 % offline lauffähig; fehlt die Internetverbindung, bleibt schlicht auch dieser zweite Bildblock unsichtbar — identisch zum bereits bestehenden Verhalten des Pre-Answer-Buttons.

**Kein Schema-/Datenbedarf:** Nutzt ausschließlich das bereits vorhandene `image_filename`-Feld (Issue #16) — keine Datenschema-Änderung.

**Zusammenfassung Aufwand:** Klein — keine neue Fetch-/Parse-Logik, keine neue Pipeline-Phase, kein neues Datenfeld. Aufwand liegt ausschließlich in der neuen DOM-Verdrahtung im Feedback-Bereich von `src/screens/question.js` (neuer Bildblock, automatischer Trigger bei Antwortabgabe statt Klick, Sichtbarkeits-Check gegen den Pre-Answer-Bereich, Wiederverwendung des bestehenden Stale-Response-Schutzmusters).

## Technische Einschätzung: Zwei vorgeschlagene Content-Erweiterungen (14.08.2026, `software-architect`, konsultiert mit `zoologe`/`business-analyst`)

Zwei vom Nutzer vorgeschlagene Erweiterungen wurden gegen den bestehenden Code (`FIELD_DEFINITIONS` in `questionGenerator.js`, `difficulty.js`, `infoSentence.js`, `src/screens/question.js`) geprüft, bevor `business-analyst` daraus ggf. Stories schneidet. Fachliche/Sinnhaftigkeits-Bewertung siehe `requirements.md`, Abschnitt "Bewertung vorgeschlagener Content-Erweiterungen". **Reine Einschätzung, keine Implementierung.**

### 1. Fell-/Federn-Farbe

**Passt ins bestehende `FIELD_DEFINITIONS`-Muster, kein neuer Mechanismus nötig.** Technisch identisch zum bereits bewährten Muster von `diet`/`conservation_status` (`kind: "enum"`): ein neues Feld (Arbeitsname `fur_feather_color`, englische Namenskonvention wie alle übrigen technischen Feldnamen im Schema) mit einem kleinen, festen Enum-Wertebereich, ein neuer `FIELD_DEFINITIONS`-Eintrag (Frage-/Identify-Text, `getValue`, `format`) sowie ein Eintrag in `EASY_FIELDS` oder `HARD_ONLY_FIELDS` (`difficulty.js`) — Zuordnung ist eine offene Entscheidung mit `business-analyst`/Nutzer, siehe `requirements.md`.

**Wichtiger Punkt zur Frage "nicht anwendbar vs. unbekannt" (vom Nutzer explizit aufgeworfen):** Braucht **keine** neue Schema-Semantik. Das bestehende Optional-Feld-Muster (seit der Korrektur in Issue #2 für `habitat`/`continent`/`weight_kg` etabliert) unterscheidet im Code ohnehin nicht zwischen "Feld für dieses Tier nicht anwendbar" und "Feld für dieses Tier (noch) nicht befüllt" — beide Fälle sind schlicht `null`/nicht vorhanden, und `getCorrectValue()`/`FIELD_DEFINITIONS.*.getValue()` überspringen fehlende Werte bereits robust (siehe `questionGenerator.js`, Kommentar "Pflicht laut architecture.md: fehlende optionale Felder überspringen statt crashen"). Für Fisch/Reptil/Amphibie/Insekt/Spinnentier (66 von 500 Tieren, real gemessen) bleibt `fur_feather_color` einfach dauerhaft `null` — das ist keine Lücke, sondern korrektes Verhalten, und erfordert keinen zusätzlichen `applicable_categories`-Mechanismus oder Ähnliches. Einzige Vorkehrung: Die Kurations-Anleitung an `zoologe` sollte klarstellen, dass diese 66 Tiere bewusst ausgelassen werden (keine Kuration nötig/gewünscht), nicht dass dort ein Wert fehlt.

**Enum-Vorschlag (fachlich mit `zoologe` final abzustimmen, hier nur technischer Rahmen):** grobe Farbklassen statt exakter Naturtonbeschreibung, z. B. `braun`, `grau`, `schwarz`, `weiß`, `rot/orange`, `gelb`, `bunt/gemustert` — ähnlich klein wie das bestehende `category`-Enum (7 Werte), damit `buildValueQuestion` genug unterscheidbare Falschantworten pro Anfrage findet. Ein zu feines Enum (z. B. 20+ Farbtöne) würde die Kuration erschweren, ohne den Quiz-Mechanismus zu verbessern.

**Risiko, das an `zoologe`/`business-analyst` zurückgemeldet wird (keine Architektur-Entscheidung, sondern Content-Risiko):** Sollten Braun-/Grautöne bei Säugetieren stark dominieren, könnten Falschantworten bei der "distinct"-Strategie (Stufe 6–10) weniger klar unterscheidbar ausfallen als bei anderen Feldern wie `category` oder `continent`. Kein technischer Blocker, aber Grund für die in `requirements.md` empfohlene Rückfrage zur Schwierigkeitsstufen-Zuordnung.

**Aufwand:** Klein-mittel für den Code-Anteil (ein neuer `FIELD_DEFINITIONS`-Eintrag nach bewährtem Muster, ähnlich risikoarm wie die ursprüngliche Einführung von `diet`/`conservation_status`), separat von der (deutlich größeren) Kurations-Story.

**Finale Leitplanken (14.08.2026, `business-analyst` mit `software-architect` + `zoologe`, Story-Freigabe #22/#23):**

- **Feldname final bestätigt:** `fur_feather_color` (kein Änderungsbedarf gegenüber Arbeitsname) — konsistent zur englischen `snake_case`-Konvention aller technischen Feldnamen (`weight_kg`, `lifespan_years`, `conservation_status`).
- **Enum final bestätigt, unverändert:** `braun`, `grau`, `schwarz`, `weiß`, `rot/orange`, `gelb`, `bunt/gemustert` (7 Werte). `zoologe` bestätigt: für alle 434 relevanten Tiere (215 Säugetiere + 219 Vögel) realistisch eindeutig zuordenbar, sofern eine "dominante/charakteristischste Farbe"-Regel gilt (bereits in #23-Akzeptanzkriterien verankert). Kein Bedarf, einzelne Werte zu splitten oder zu streichen.
- **Konkrete Kurationsregeln (`zoologe`, zur Übernahme in die #23-Kurationsanleitung), um bei 434 Tieren konsistent zu bleiben:**
  1. **Gemusterte/mehrfarbige Tiere → `bunt/gemustert`**, auch wenn technisch nur zwei Grundfarben vorliegen (z. B. Zebra schwarz/weiß gestreift, Panda schwarz/weiß, Dachs → `bunt/gemustert`, nicht `schwarz` oder `weiß`). Faustregel: Sobald ein auffälliges Muster (Streifen, Flecken, klar abgesetzte Zonen) das prägende visuelle Merkmal ist, zählt das Muster stärker als die Einzelfarben.
  2. **Geschlechtsdimorphismus** (z. B. Pfau, Stockente, Löwenmähne): die bei Kindern typischerweise assoziierte/bekanntere Erscheinung verwenden (i. d. R. das auffälligere Geschlecht bei starkem Dimorphismus, z. B. Pfau-Männchen); bei Unsicherheit an dem im Spiel hinterlegten `image_filename`-Bild orientieren, falls vorhanden.
  3. **Saisonale/altersbedingte Variation** (z. B. Polarfuchs Sommer-/Winterfell, Jungvögel-Gefieder): die typische/adulte, am häufigsten assoziierte Färbung wählen, nicht den saisonalen Sonderfall.
  4. **Erwartungsgemäß ungleiche Verteilung:** `braun`/`grau` werden bei Säugetieren voraussichtlich stark dominieren, `gelb` wird selten vorkommen (v. a. vereinzelt bei Vögeln) — das ist inhaltlich korrekt und kein Kurationsfehler, keine künstliche Gleichverteilung erzwingen.
- **Bestätigtes Risiko, kein Blocker:** Die in der ursprünglichen Einschätzung genannte Braun-/Grau-Dominanz bei Säugetieren bleibt real (siehe Regel 4) und kann bei der "distinct"-Falschantworten-Strategie der einfachen Stufe zu weniger klar unterscheidbaren Falschantworten führen als bei `category`/`continent`. Kein technischer Blocker für die Freigabe; `qa-engineer` prüft nach Umsetzung stichprobenartig die Fragequalität (siehe #23-Akzeptanzkriterien).
- **Einordnung `FIELD_DEFINITIONS`/`difficulty.js` final:** neuer Eintrag nach `diet`/`conservation_status`-Muster (`kind: "enum"`, `getValue`/`hasValue`/`format`), Zuordnung zu `EASY_FIELDS` in `difficulty.js` (bereits entschieden, siehe Abschnitt "Schwierigkeitsstufen — Zuordnung zu vorhandenen Feldern").
- **Offene Frage für spätere QA/Kuration (keine Blockade für `status:ready`):** Bei einzelnen Grenzfällen (z. B. sehr helle Braun-/Beige-Töne zwischen `braun` und `weiß`) kann `zoologe` während der Kuration selbst final entscheiden — keine Rückfrage an den Nutzer nötig, da die groben Leitplanken (Regeln 1–4 oben) ausreichend Orientierung geben.

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

**Finale technische Leitplanken (14.08.2026, `software-architect`, Story-Freigabe #26/#27/#28):**

- **Strukturelle Abweichung vom bestehenden Generator, bewusst:** Der bestehende `generateQuestions()` in `questionGenerator.js` baut synchron das komplette Fragen-Set einer Runde (10 Fragen) im Voraus, weil alle Felder bereits lokal in `data/animals.json` vorliegen. Für "Wer bin ich?" ist das nicht sinnvoll übertragbar, da jede Frage einen asynchronen Netzwerk-Vorab-Check braucht — eine Runde vorab komplett aufzulösen würde 10 Bilder auf einmal laden (ein einziger, langer Ladebildschirm am Rundenstart) statt der in #28 gewünschten kurzen Pro-Frage-Ladezustände. **Entscheidung: eigene, asynchrone Fragegenerierungs-Funktion** (Arbeitsname `generateNextReverseQuestion(animals, usedAnimalIds, difficulty, rng)`), die **on demand pro Frage** aufgerufen wird — beim Rundenstart für Frage 1, danach jeweils nach Tap auf "Weiter". Kein Batch-Vorausbau wie beim bestehenden Modus.
- **Zieltier-Auswahl:** Kandidatenpool = alle Tiere mit befülltem `image_filename` (100 % Abdeckung laut Issue-#16-Messung), abzüglich bereits in der laufenden Runde verwendeter Tiere (`usedAnimalIds`, gleiche Konvention wie bestehender Generator).
- **Bildauflösung vorab, mit begrenztem Retry statt Fehleranzeige:** Für das gezogene Zieltier wird die bestehende Commons-`imageinfo`-API (identischer Call wie Issue #16: `iiurlwidth=330`, `origin=*`, `extmetadata`) aufgerufen, **bevor** die Funktion ein Ergebnis liefert. Schlägt der Abruf fehl (Netzwerkfehler, Timeout, leere Antwort), wird **bis zu 3 Mal** ein neues Zieltier gezogen und erneut versucht — realistisch ausreichend, da einzelne Commons-Abrufe laut Performance-Messung (Abschnitt F) sehr zuverlässig sind und ein Fehlschlag meist ein Einzelfall ist, kein systematischer Ausfall. Erst wenn auch der 3. Versuch scheitert, liefert die Funktion einen Fehler an den Aufrufer (Frage-Bildschirm, siehe #28) statt eine unspielbare Frage — dort greift dann der in `design.md` beschriebene freundliche Retry-Zustand, **kein** Rundenabbruch und **kein** Zurückspringen zur Modus-Auswahl.
- **Wiederverwendung als Vorab-Check bei Moduseinstieg (#26):** Der in #26 geforderte "Testabruf" bei Tap auf die "Wer bin ich?"-Kachel ist **kein separater Health-Check-Mechanismus**, sondern schlicht der erste Aufruf von `generateNextReverseQuestion()` für Frage 1 der Runde — gelingt er, wird direkt mit der bereits fertig aufgelösten ersten Frage in den Modus gewechselt (kein zusätzlicher Ladebildschirm nach dem Moduswechsel); schlägt er nach den 3 internen Versuchen fehl, greift das in #26 beschriebene freundliche Abfangen auf dem Start-Bildschirm (Auswahl verbleibt bei "Quizfragen"). Ein Ladezustand direkt in der Kachel selbst (analog zum bestehenden "Bild zeigen"-Button-Ladezustand) deckt die kurze Wartezeit ab.
- **Falschantworten-Ziehung (Tiernamen statt Feldwerte):** Neue, zum bestehenden `buildIdentifyQuestion` strukturell ähnliche, aber inhaltlich neue Auswahllogik — `buildIdentifyQuestion` bevorzugt aktuell **keine** Kategorie-Nähe (zieht rein zufällig aus allen Tieren ohne den gefragten Feldwert). Für "Wer bin ich?" gilt bewusst abweichend: 3 Falschantworten werden **bevorzugt aus derselben `category`** wie das Zieltier gezogen (dedupe nach `name_de` wie bei `dedupeAnimalsByName`, Ausschluss bereits in der Runde verwendeter Namen), damit ein Kind nicht rein über Größenklasse/Tiergruppe raten kann, sondern wirklich das Bild ansehen muss. Reichen die eindeutig benannten Kandidaten derselben Kategorie nicht für 3 Falschantworten (seltener Randfall bei sehr kleinen Kategorien), wird mit Kandidaten aus anderen Kategorien aufgefüllt, damit die Frage trotzdem entsteht statt zu scheitern.
- **Kein neues Datenfeld, kein neues globales State-Feld:** `image_filename` und `category` (beide bestehend) reichen. Bild-Lade-/Fehlerzustand bleibt lokaler UI-Zustand des Frage-Bildschirms, analog zur bestehenden Bild-Rateshilfe.

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

## Tiergeräusche: Finale technische Leitplanken (Issues #31/#32/#33, 14.08.2026, `software-architect`, umsetzungsreif)

**Status:** Vollmessung ist abgeschlossen (157/500, 31,4 %, siehe `requirements.md` "Entscheidungen zu den offenen Fragen", Punkt 2), die drei Umsetzungsstories sind aus dem Platzhalter-Issue #29 herausgeschnitten (analog zum Umkehr-Quiz-Zuschnitt #26/#27/#28). Dieser Abschnitt ersetzt/konkretisiert die vorherige Stichproben-basierte Einschätzung als verbindliche technische Grundlage für `web-developer`.

**Grundprinzip: 1:1 dieselbe Build-/Laufzeit-Trennung wie bei `image_filename` (Issue #16), nur mit Wikidata-Property P51 statt P18.** Es wird zu keinem Zeitpunkt ein Audio-Byte lokal gespeichert oder ins Repo committet.

**1. Build-Zeit (`scripts/fetch-animals/fetch-animals.js`, Teil von Issue #32):**
- `P51` ("audio") wird wie jede andere String-Property per `getStringClaim()` aus den ohnehin bereits geladenen `claims` extrahiert (kein zusätzlicher Netzwerk-Call).
- Ergebnis: neues optionales Feld **`audio_filename`** (reiner Commons-Dateiname ohne `File:`-Präfix, z. B. `"Corvus corax call.ogg"`) in `data/animals.json`. Kein Download, keine URL-Auflösung, keine Lizenzdaten zur Build-Zeit — identisches Prinzip wie bei `image_filename`.
- `audio_filename` ist ein **Pipeline-Feld**, kein manuell kuriertes Feld — gehört **nicht** in `MANUALLY_CURATED_FIELDS` (siehe Abschnitt "Pipeline-Regenerierung vs. manuell kuratierte Felder").

**2. Laufzeit (Fragegenerierung, Teil von Issue #32) — ein wichtiger Unterschied zu Bildern:**
- Commons-Aufruf ist strukturell identisch zum bestehenden `imageinfo`-Muster, aber **ohne** `iiurlwidth` (das ist ein reiner Bild-Thumbnail-Parameter; für Audiodateien existiert kein Thumbnail-Äquivalent in derselben API):
  ```
  GET https://commons.wikimedia.org/w/api.php
    ?action=query&titles=File:<audio_filename>&prop=imageinfo
    &iiprop=url|extmetadata&format=json&origin=*
  ```
  - `url` liefert direkt die abspielbare Audiodatei-URL (typischerweise `.ogg`), `extmetadata` liefert `Artist`/`LicenseShortName`/`LicenseUrl` im selben Request — ein Request deckt beides ab, wie bei Bildern.
- **Wichtige Erleichterung gegenüber dem Bild-Fall:** Ein `<audio>`-Element kann progressiv/gepuffert abspielen (Browser-natives Streaming-Verhalten), die Datei muss also **nicht** vollständig heruntergeladen sein, bevor Wiedergabe beginnt. Der "Vorab-Check pro Frage" (siehe Umkehr-Quiz-Muster oben) bedeutet hier konkret: Die **Metadaten-Auflösung** (URL + Attribution) muss vor Anzeige der Frage gelingen — nicht der vollständige Audio-Download. Das reduziert das Risiko spürbarer Wartezeiten gegenüber dem Bild-Fall zusätzlich.
- Fehlerbehandlung/Retry: identisches Muster wie Umkehr-Quiz — bis zu 3 Versuche mit neuem Zieltier, danach Fehler an den Bildschirm (dort dasselbe freundliche Retry-Muster wie #28, siehe `design.md`).
- **Bekanntes, ungemessenes technisches Risiko (kein Blocker, aber zu dokumentieren/beim Testen zu prüfen):** Wikimedia-Commons-Audiodateien liegen ganz überwiegend im Ogg-Vorbis-Format vor. Safari (Desktop und iOS/iPadOS) hat historisch unvollständige bzw. keine native Unterstützung für Ogg Vorbis im `<audio>`-Element. Für den aktuellen Umsetzungsschritt unkritisch (NFR 2 "später iPad" ist laut `requirements.md` explizit **kein** unmittelbares Umsetzungsziel), aber relevant, sobald ein iPad-/Safari-Rollout ansteht — dann vorab mit `audio.canPlayType('audio/ogg; codecs="vorbis"')` prüfen bzw. real auf einem Safari-Gerät testen. Keine Pipeline-/Datenkonsequenz jetzt, nur ein dokumentierter Vorbehalt für später.
- **Kein Caching-Sonderkonzept**, identisch zur Begründung bei Bildern (Standard-HTTP-Cache reicht, keine Messung dagegen vorgenommen, aber kein Grund zur Annahme eines abweichenden Verhaltens gegenüber `upload.wikimedia.org` für Bilder).

**3. Zieltier- vs. Distraktor-Pool — wichtige Klarstellung wegen der geringeren Abdeckung:**
- Der **Zieltier**-Kandidatenpool (das Tier, dessen Laut abgespielt wird) ist auf die 157 Tiere mit `audio_filename` beschränkt (31,4 %, deutlich vogellastig: Vogel 56,6 %, Säugetier 13,0 %, Fisch 0,0 %) — analog zur Beschränkung des Umkehr-Quiz-Zieltierpools auf `image_filename`-Tiere (dort 100 %).
- Die **Distraktor**-Namen (3 falsche Antwortoptionen) brauchen selbst **kein** Audio — sie sind reine Textnamen, kein Ton wird für sie abgespielt. Distraktoren werden daher wie bei #27 aus dem **vollen 500er-Pool** gezogen (bevorzugt gleiche `category` wie das Zieltier), nicht künstlich auf die 157 Audio-Tiere eingeschränkt. Das verhindert, dass die ohnehin schon kleinere/schiefere Audioabdeckung zusätzlich die Distraktor-Vielfalt einschränkt.
- Content-Diversitäts-Risiko (Vogellastigkeit des Zieltier-Pools) bleibt bestehen und ist an `zoologe` als Beobachtungspunkt weitergegeben (siehe `requirements.md`) — kein technischer Blocker.

**4. Struktur/State — identisch zu #27:** eigene, asynchrone Pro-Frage-Generierungsfunktion (`generateNextSoundQuestion`, kein Batch-Vorausbau), Ton-Lade-/Fehlerzustand bleibt UI-lokaler Zustand des Frage-Bildschirms, kein neues globales State-Feld in `src/quiz/state.js`.

**Zusammenfassung Aufwand:** Etwas größer als #27 (dort war `image_filename` bereits vorhanden), da hier zusätzlich die Build-Zeit-Extraktion (P51 → `audio_filename`) neu hinzukommt — aber vom selben, bereits zweimal bewährten Muster (P18/Issue #16, jetzt P51). Kein neuer Netzwerk-Mechanismus, keine neue Pipeline-Phase mit Retry-/Rate-Limit-Bedarf.

## Branch-Strategie für neue Spielmodi (14.08.2026, `software-architect`)

**Frage vom Nutzer:** Sollten neue Spielmodi auf einem eigenen Git-Branch statt direkt auf `main` entwickelt werden?

**Bisheriger Workflow:** Alle bisherigen Issues (#1–#21) wurden in kleinen, in sich abgeschlossenen Schritten direkt auf `main` committet — passend zu einem Kleinprojekt mit überschaubarem Umfang pro Änderung, bei dem `main` nach jedem Commit weiterhin durchgängig spielbar blieb.

**Abwägung für die drei neuen Spielmodi:**
- **Dafür (Feature-Branch):** Ein neuer Spielmodus wie Umkehr-Quiz oder Tiergeräusche besteht realistisch aus mehreren Stories (Fragegenerierung, neuer Bildschirm-/UI-Zustand, Modus-Auswahl-UI, ggf. NFR-1-Ausnahme), die erst in Kombination ein Ende-zu-Ende spielbares Ergebnis ergeben. Zwischen der ersten und letzten Story wäre bei direktem Commit auf `main` entweder unfertiger/unerreichbarer Code sichtbar im Hauptzweig, oder man müsste jede Zwischen-Story bereits vollständig in die Haupt-Navigation verdrahten, obwohl der Modus noch nicht fertig ist. Ein Feature-Branch erlaubt, den kompletten neuen Modus isoliert fertigzustellen und erst als Ganzes zu mergen — `main` bleibt währenddessen jederzeit exakt im aktuellen, bekannten, spielbaren Zustand.
- **Dagegen:** Merge-Aufwand (Konflikte, insbesondere falls `question.js`/`start.js`/`difficulty.js` parallel noch für andere Stories angefasst werden) und ein Bruch mit dem bisherigen, bewährten Direkt-auf-main-Rhythmus des Projekts — zusätzlicher Prozess-Overhead für ein Projekt, das bewusst schlank gehalten wird.

**Empfehlung: Ja, eigener Feature-Branch pro neuem Spielmodus** (z. B. `feature/umkehr-quiz`, `feature/tiergeraeusche`), aber **nicht** als generelle Abkehr vom bisherigen Workflow: Bugfixes, Content-Kuration (z. B. weitere `fun_fact`-Tranchen) und kleine, in sich abgeschlossene Änderungen am bestehenden Quizfragen-Modus bleiben wie bisher direkte Commits auf `main`. Der Unterschied liegt im **Umfang und Zwischenzustand**: Ein neuer Spielmodus ist der erste Fall im Projekt, der zwingend mehrere Stories braucht, bevor er überhaupt spielbar ist — genau dafür ist ein Feature-Branch gedacht, nicht als pauschale Prozess-Verschärfung. Merge zurück nach `main` erst, wenn der jeweilige Modus Ende-zu-Ende spielbar und (selbst-)review-fähig ist, nicht nach jeder Zwischen-Story.

**Reihenfolge falls mehrere Modi verfolgt werden:** Jeweils ein eigener Branch pro Modus, nicht ein gemeinsamer "neue Modi"-Sammel-Branch — die drei Ideen sind technisch und im Aufwand zu unterschiedlich (siehe oben), um sinnvoll gemeinsam entwickelt und gemeinsam gemerged zu werden.

**Bestätigung (`business-analyst`, 14.08.2026, siehe `requirements.md` "Bewertung dreier neuer Spielmodi" → "Entscheidungen zu den offenen Fragen"):** Diese Empfehlung wird vollständig bestätigt, keine Alternative vorzuziehen. Verbindlich für den Story-Zuschnitt von Umkehr-Quiz und Tiergeräusche (Fehlerbild entfällt, siehe dort — wird nicht weiterverfolgt).

## Infosatz + Wikipedia-Link im "Wer bin ich?"-Modus: Wiederverwendbarkeit (Issue #35, 15.08.2026, `software-architect`)

**Frage von `business-analyst`:** Können `buildInfoSentence()` (Issue #12, `src/quiz/infoSentence.js`) und die Wikipedia-Link-Anzeige (Issue #15) direkt für den neuen "Wer bin ich?"-Modus (#26/#27/#28) wiederverwendet werden?

**Antwort: Ja für die Logik, mit einer klaren Einschränkung bei der Verdrahtung.**

- `buildInfoSentence(animal, rng)` nimmt ausschließlich ein Tier-Objekt (plus optionale Zufallsquelle) entgegen. Die Funktion enthält keinerlei Bezug zu Fragetyp, Antwortoptionen oder Spielmodus — sie baut den Satz rein aus den Feldern des übergebenen Tiers (`category`, `habitat`, `continent`, `diet`, Zusatzfakt). Das gilt unverändert für ein im "Wer bin ich?"-Modus beantwortetes Tier; kein Änderungsbedarf an der Funktion selbst.
- Die Wikipedia-Link-Anzeige ist in `src/screens/question.js` als reine Bedingung `if (answeredAnimal?.wikipedia_url_de) { ... }` umgesetzt (siehe Issue #15) — ebenfalls unabhängig vom Fragetyp/Modus, reine Prüfung eines Tier-Feldes.
- **Was NICHT automatisch übernehmbar ist:** Beide Bausteine sind aktuell fest in die DOM-Struktur des bestehenden Quizfragen-Bildschirms verdrahtet (`container.querySelector(".question-screen__info-sentence...")` etc.). Da zum Zeitpunkt dieser Klärung noch nicht feststeht, welche konkrete Datei-/Modulstruktur #28 für den "Wer bin ich?"-Bildschirm wählt (eigenes Modul vs. Modus-Verzweigung in `question.js`), lässt sich diese Rendering-Verdrahtung nicht pauschal vorwegnehmen. Empfehlung an `web-developer` bei Umsetzung von #35: entsprechendes Markup + `querySelector`-Wiring im dann tatsächlich vorliegenden #28-Zielmodul analog zum bestehenden Muster in `question.js` nachbauen — reiner Wiring-Aufwand, keine neue Architektur-Entscheidung nötig.
- **Automatisches Feedback-Bild (#30) bewusst nicht mit übernehmen:** Technisch zwar ebenso trivial wiederverwendbar (`imageHint.js`), aber laut `ux-design`-Einschätzung (siehe `design.md`) im "Wer bin ich?"-Modus redundant, da dort bereits durchgehend ein Bild sichtbar ist. Deshalb kein Bestandteil von #35.

## Ergebnisliste: Modus-Feld + Lösch-Funktion (Issue #36, 15.08.2026, `software-architect`)

**Datenmodell-Erweiterung** von `src/quiz/history.js` (bisher: `date`, `score`, `total`, `difficulty`):

- **`mode`** (optional, string): `"quiz"` / `"reverse"` / `"sound"` — Namen bewusst konsistent zu den bereits etablierten Funktionsnamen `generateNextReverseQuestion`/`generateNextSoundQuestion` gewählt (siehe Abschnitte "1. Umkehr-Quiz" und "Tiergeräusche: Finale technische Leitplanken" oben), statt neuer, uneinheitlicher Bezeichner.
- **`id`** (string, z. B. `crypto.randomUUID()` mit Fallback für Umgebungen ohne diese API): nötig, um einzelne Einträge gezielt löschen zu können, ohne sich auf einen instabilen Array-Index oder ein nicht hart eindeutiges `date`-Feld zu verlassen.

**Migration bestehender Einträge:** Keine aktive Migration/Umschreibung von `localStorage`-Bestandsdaten nötig. `mode` bleibt optional (analog zur bereits bestehenden Fehlertoleranz-Philosophie in `history.js`), fehlt es bei einem Alt-Eintrag, wird das **ausschließlich auf Anzeige-Ebene** (`result.js`) als `"quiz"` interpretiert — Quizfragen war der einzige Modus vor dieser Erweiterung. Fehlt bei einem Alt-Eintrag eine `id`, wird sie beim Einlesen einmalig ergänzt (nur für die laufende Anzeige/zum Löschen-Können nötig; ein Zurückschreiben in `localStorage` ist unschädlich, aber kein Muss). Kein neuer Schema-Versionierungs-Mechanismus für `localStorage` nötig — die bestehende Datenmenge (max. `MAX_HISTORY_ENTRIES` = 5 Einträge) und die bereits lose Typisierung rechtfertigen keinen größeren Aufwand.

**Neue Funktionen:**
- `deleteHistoryEntry(id, storage)` — entfernt genau einen Eintrag per `id`, schreibt zurück, fehlertolerant (try/catch) wie die bestehenden Funktionen.
- `clearResultHistory(storage)` — entfernt alle Einträge, fehlertolerant.
- Beide liefern bei Erfolg die aktualisierte Liste, bei Fehlschlag `null` (konsistentes Rückgabemuster zu `saveResultToHistory`).

**Kein Einfluss auf bestehende Kappungslogik** (`MAX_HISTORY_ENTRIES = 5`) — unverändert.

## Infosatz/Wikipedia-Link/Fun Fact + automatisches Bild im "Tiergeräusche"-Modus: Wiederverwendbarkeit (Issues #41/#42, 16.08.2026, `software-architect`)

**Frage von `business-analyst`:** Können `buildInfoSentence()`/die Wikipedia-Link-Anzeige (bereits für Issue #35 im "Wer bin ich?"-Modus geprüft) sowie der automatische Feedback-Bild-Mechanismus aus `imageHint.js` (Issue #30) auch für den Tiergeräusche-Bildschirm (`src/screens/soundQuestion.js`) wiederverwendet werden?

**Antwort: Ja für beide, ein kleiner, aber notwendiger Vorbereitungsschritt fehlt aktuell.**

- **`buildInfoSentence(animal, rng)` und die Wikipedia-Link-Prüfung (`animal?.wikipedia_url_de`) sind unverändert übertragbar** — identische Begründung wie bereits für Issue #35 dokumentiert (siehe Abschnitt "Infosatz + Wikipedia-Link im 'Wer bin ich?'-Modus: Wiederverwendbarkeit" oben): beide Bausteine kennen nur ein Tier-Objekt, keinen Fragetyp/Modus.
- **`fun_fact` ist ebenfalls ein reines Tier-Feld** (`animal?.fun_fact`), keine Modus-Abhängigkeit — identisch übertragbar.
- **Wichtiger Unterschied zu #35, der vor der Umsetzung behoben werden muss:** `src/screens/soundQuestion.js` baut aktuell **keinen** `animalById`-Lookup auf (anders als `question.js`, das ihn direkt zu Beginn von `renderQuestionScreen()` aus `animalsData.animals` erzeugt). Die Frage-Objekte aus `generateNextSoundQuestion()` tragen zwar bereits `animalId` und `animalName` (siehe `soundQuestionGenerator.js`), aber **nicht** das volle Tier-Objekt (kein `wikipedia_url_de`, `fun_fact`, `category`, `habitat` etc. — diese Felder werden für die Fragegenerierung selbst nicht gebraucht und daher dort nicht mitgeführt). `handleAnswer()` in `soundQuestion.js` braucht daher zusätzlich einen `animalById`-Lookup (identisches Ein-Zeiler-Muster wie in `question.js`: `new Map(animalsData.animals.map((animal) => [animal.id, animal]))`, aus dem bereits importierten `animalsData`) und muss `answeredAnimal = animalById.get(question.animalId)` vor dem Aufruf von `buildInfoSentence()`/den übrigen Checks auflösen. Kein Datenschema-Risiko: `animalId` ist bereits Teil jedes Sound-Fragenobjekts (`buildSoundQuestion()` in `soundQuestionGenerator.js`), der Lookup ist ein reiner Laufzeit-Convenience-Schritt, kein neues Feld.
- **`imageHint.js`-Hilfsfunktionen (`buildCommonsImageInfoUrl`, `extractImageInfo`, `buildAttribution`) sind unverändert wiederverwendbar** für das automatische Feedback-Bild (#42) — identischer Mechanismus wie bei #30, ebenfalls abhängig vom oben beschriebenen `animalById`-Lookup, um an `animal.image_filename` zu kommen. **Anders als #30 im Quizfragen-Modus entfällt der dortige Duplikat-Check** (`!imageHintEl.hidden`) komplett, da es im Tiergeräusche-Modus laut `ux-design`-Entscheidung (siehe `design.md`) bewusst **keinen** Pre-Answer-Bild-Button gibt — die Implementierung ist dadurch sogar etwas einfacher als bei #30 (kein Sichtbarkeits-Check gegen einen zweiten DOM-Bereich nötig, das Bild wird bei jeder Antwort schlicht immer versucht).
- **Datenlage:** `image_filename` ist für 500/500 Tiere vorhanden (Issue #16), also zwangsläufig auch für alle 157 Tiere mit `audio_filename` — kein Abdeckungsrisiko für #42.
- **Kein neues globales State-Feld** in `src/quiz/state.js` nötig für beide Stories — identisches Prinzip wie bei #30/#35 (rein UI-lokaler Zustand des jeweiligen Bildschirms, Stale-Response-Schutz per lokaler Request-ID/AbortController wie bereits in `soundQuestion.js` für den Audio-Ladezustand etabliert).

**Reihenfolge #41 vs. #42:** Technisch unabhängig voneinander umsetzbar (unterschiedliche DOM-Bereiche, kein geteilter Zustand) — die in `design.md` festgelegte finale Anzeige-Reihenfolge (Feedback → Bild → Infosatz → Fun Fact → Weiter) lässt sich unabhängig von der Umsetzungsreihenfolge der beiden Stories per CSS/Markup-Position erreichen, kein Merge-Konfliktrisiko zwischen beiden.

**Aufwand:** Klein für beide Stories — kein neuer Netzwerk-Mechanismus, keine Schema-Änderung, nur DOM-Verdrahtung + der eine ergänzende `animalById`-Lookup, identisches Muster wie #15/#24/#30/#35.

## Play/Pause-Toggle beim Tierlaut-Button (Issue #43, 16.08.2026, `software-architect`)

**Frage von `business-analyst`:** Ist ein echtes Play/Stop-Toggle im bestehenden `handlePlayClick()` (`src/screens/soundQuestion.js`) risikoarm umsetzbar?

**Antwort: Ja, kleine, lokal begrenzte Änderung, kein neuer Mechanismus nötig.**

Aktuell:
```js
function handlePlayClick() {
  if (!audioEl.src) return;
  hasPlayedOnce = true;
  updatePlayButtonLabel();
  audioEl.currentTime = 0;
  audioEl.play().catch(() => {});
}
```

**Empfohlene Umsetzung:** Zustandsabfrage über `audioEl.paused` (natives, immer korrektes Flag des `<audio>`-Elements, kein eigener Tracking-State nötig, kein Risiko eines aus der Reihe laufenden manuellen Zustands):

```js
function handlePlayClick() {
  if (!audioEl.src) return;
  if (!audioEl.paused) {
    audioEl.pause();
    audioEl.currentTime = 0;
    return;
  }
  hasPlayedOnce = true;
  audioEl.currentTime = 0;
  audioEl.play().catch(() => {});
}
```

**Icon-/Label-Synchronisation über bestehende Audio-Events, nicht über den Klick-Handler allein:** Die bereits vorhandenen `waiting`/`playing`-Listener (aria-busy-Steuerung, siehe bestehender Code) werden um einen `pause`-Listener ergänzt, der Icon/`aria-label` zurück in den abspielbereiten Zustand setzt. Wichtig: Das `<audio>`-Element feuert `pause` zuverlässig sowohl bei manuellem `audioEl.pause()` **als auch** beim natürlichen Ende der Wiedergabe (Browser setzen `paused = true` und feuern `pause`, bevor `ended` feuert) — ein einziger `pause`-Listener deckt daher beide Fälle ab ("manuell gestoppt" und "von selbst zu Ende"), kein separater `ended`-Listener nötig, kein Risiko eines im "spielt gerade"-Zustand hängenbleibenden Buttons.
- `playing`-Listener (bereits vorhanden): setzt Icon/Label auf "spielt gerade" ("Tierlaut stoppen").
- `pause`-Listener (neu): setzt Icon/Label zurück auf "abspielbereit" (Label abhängig von `hasPlayedOnce`, wie bisher).

**Kein neuer globaler/geteilter Zustand:** Icon-/Label-Wechsel ist reine DOM-/CSS-Angelegenheit (z. B. eine Modifier-Klasse `sound-play-button--playing`, umgeschaltet in denselben zwei Listenern), keine Änderung an `quizState`/`state.js`.

**Kein Einfluss auf bestehende Ladezustands-/Fehlerlogik** (`showLoadingState()`, `showErrorState()`, Stale-Response-Schutz über `loadRequestId`) — der Toggle betrifft ausschließlich das Verhalten innerhalb einer bereits erfolgreich geladenen Frage, nicht den Ladevorgang selbst. `showLoadingState()` ruft bereits `audioEl.pause()` beim Frage-Wechsel auf (bestehender Reset) — das setzt automatisch auch den neuen `pause`-Listener aus, der bereits laufende Reset-Pfad muss nicht angepasst werden.

**Aufwand:** Sehr klein — lokale Änderung an einer bestehenden Funktion plus ein neuer Event-Listener, keine neue Architektur-Entscheidung.

## Neuer Spielmodus "Tier-Memory": Finale technische Leitplanken (Issue #45, 16.08.2026, `software-architect`, umsetzungsreif)

**Grundprinzip:** Wiederverwendung des vollständigen, bereits zweimal produktiv bewährten Live-Bild-Mechanismus aus Issue #16/#28 (`imageHint.js`: `buildCommonsImageInfoUrl`, `extractImageInfo`, `buildAttribution`, alle **unverändert** wiederverwendbar) — kein neuer Netzwerk-Mechanismus, kein neues Datenfeld. Der einzige echte Neubau ist die **Batch-Vorab-Auflösung mehrerer Bilder gleichzeitig** (statt eines einzelnen Bildes pro Frage wie bei #28/#33) sowie die reine Spiellogik (Kartenzustand, Paarvergleich).

**1. Modus-Konstante (`src/quiz/gameMode.js`):** Neuer Wert `MEMORY: "memory"` in `GAME_MODE`, analog zu `REVERSE`/`SOUND`. Kein Bezug zu `state.questions`/`roundLength` in der bisherigen Bedeutung nötig (siehe Punkt 4).

**2. Kartenpaar-Auswahl und Bild-Vorab-Auflösung — eigene, neue Funktion (Arbeitsname `buildMemoryDeck(animals, difficulty, rng)`):**
- Kandidatenpool: alle Tiere mit befülltem `image_filename` (100 % Abdeckung, siehe Issue #16). Zieht `getMemoryPairCount(difficulty)` (neue kleine Funktion in `difficulty.js`, liefert 6 bzw. 12, siehe `design.md`-Tabelle) eindeutige Tiere per Zufall (dedupe nach `name_de`, analog `dedupeAnimalsByName`, um z. B. nicht zwei sehr ähnlich benannte Einträge zu ziehen).
- **Batch-Auflösung, nicht Pro-Frage-Auflösung wie bei #27/#32:** Anders als bei "Wer bin ich?"/"Tiergeräusche" (dort wird pro Einzelfrage on demand nachgeladen) müssen bei Memory **alle** Kartenbilder bereits feststehen, bevor das Brett überhaupt angezeigt wird — ein Kind kann jede Karte in beliebiger Reihenfolge aufdecken, ein Nachladen "on demand beim ersten Aufdecken" würde zu inkonsistenten Wartezeiten mitten im Spiel führen (design.md verlangt zudem einen einheitlichen Ladebildschirm vor Rundenstart, keinen Pro-Karte-Ladezustand). Empfehlung: `Promise.all()` über alle gezogenen Tiere (jeweils ein `imageinfo`-Call, identische URL-Konstruktion wie bisher), mit demselben Timeout (`REQUEST_TIMEOUT_MS`, 3500 ms) pro Einzelabruf wie bei der bestehenden Bild-Rateshilfe.
- **Retry mit Ersatztier bei Einzelfehlschlag, kein Rundenabbruch:** Schlägt die Auflösung für ein gezogenes Tier fehl, wird (wie bei #27/#32) bis zu 3-mal ein anderes, noch nicht gezogenes Tier nachgezogen und erneut versucht, bevor die gesamte Funktion einen Fehler an den Aufrufer liefert. Bei 100 % P18-Abdeckung ist ein Fehlschlag ausschließlich netzwerkbedingt (Timeout/kein Netz), nicht datenbedingt — ein einzelner Fehlschlag ist ein Einzelfall, kein systematischer Ausfall (identische Einschätzung wie bei #27/#32).
- **Vollständiger Fehlschlag (z. B. kein Netz von Anfang an):** Wie bei #26/#31 wird das beim **Versuch, den Modus zu betreten** (Tap auf die "Tier-Memory"-Kachel) abgefangen — der Deck-Aufbau ist der Testabruf, identisches Prinzip wie bei den bestehenden Modi. Auswahl verbleibt bei "Quizfragen", freundlicher Hinweis (siehe `design.md`/bestehende Zustandstabelle).
- **Kartenobjekt-Struktur:** Aus jedem aufgelösten Tier werden **zwei** Karten-Einträge erzeugt (`{ cardId, animalId, thumbUrl, artist, licenseUrl }`, `cardId` z. B. `` `${animalId}-a` ``/`` `${animalId}-b` ``), danach das gesamte Karten-Array gemischt (Fisher-Yates mit derselben `rng`-Konvention wie der bestehende Fragegenerator) — Kartenposition ist damit unabhängig von der Ziehreihenfolge der Tiere.

**3. Spiellogik — reiner UI-lokaler Zustand, kein neues globales State-Feld:**
- Analog zu #27/#32/#28/#33: Kartenzustand (aufgedeckt/gelöst/verdeckt je `cardId`, aktuell aufgedeckte Karte(n), Versuchszähler) lebt vollständig lokal im neuen Bildschirm-Modul (`src/screens/memory.js`), nicht in `src/quiz/state.js`. Einziger Touchpunkt zu `state.js`: `state.mode = GAME_MODE.MEMORY` (Auswahl am Start) und optional ein einfacher Abschluss-Callback für den Ergebnis-Bildschirm (siehe Punkt 4).
- Paarvergleich ist eine reine, leicht testbare Funktion ohne DOM-Bezug (Arbeitsname `checkMatch(cardA, cardB)` → vergleicht `animalId`), auslagerbar in `src/quiz/memory.js` (Logik) getrennt von `src/screens/memory.js` (Darstellung) — konsistent mit der bestehenden Projekt-Trennung `quiz/` (Logik) vs. `screens/` (Darstellung).

**4. Rundenstruktur/Ergebnis — bewusste Abweichung vom bestehenden `state.questions`/`isQuizFinished()`-Muster:**
- Da es keine Einzelfragen gibt, wird `state.questions`/`roundLength` für den Memory-Modus **nicht** im bisherigen Sinn befüllt (kein Fragen-Array, keine `currentIndex`-Iteration). `src/main.js` verzweigt bei `mode === GAME_MODE.MEMORY` auf den neuen `memory.js`-Bildschirm, der eigenständig weiß, wann das Brett vollständig gelöst ist (alle Karten `solved`), und dann direkt den bestehenden Ergebnis-Bildschirm mit angepasstem Text aufruft (siehe `design.md`) — kein Versuch, das bestehende `isQuizFinished()`/`recordAnswer()`-Muster künstlich auf ein strukturell anderes Spiel zu pressen (Overengineering-Vermeidung).
- **Explizit kein Eintrag in der Ergebnis-Verlaufsliste (#14/#36) in dieser Version** — technisch begründet: `score`/`total` (Issue #14) modellieren "richtig von N Fragen", nicht "Versuche bis zur Lösung eines Memory-Bretts". Eine spätere Erweiterung (z. B. neues optionales Feld `attempts` statt `score`/`total`) wäre möglich, ist aber eine eigene, spätere Entscheidung (`business-analyst`) mit eigenem Story-Zuschnitt — kein Blocker für #45 selbst.

**5. `difficulty.js`-Erweiterung:** Neue, kleine, von `getFieldsForDifficulty()` unabhängige Funktion:
```js
const MEMORY_PAIR_COUNTS = Object.freeze({
  [DIFFICULTY_LEVELS.EASY]: 6,
  [DIFFICULTY_LEVELS.HARD]: 12,
});
export function getMemoryPairCountForDifficulty(difficulty) {
  assertKnownDifficulty(difficulty, "getMemoryPairCountForDifficulty");
  return MEMORY_PAIR_COUNTS[difficulty];
}
```
Bewusst **nicht** über `getFieldsForDifficulty()`/`EASY_FIELDS`/`HARD_FIELDS` modelliert — Memory nutzt keine Tierdatenbank-Felder für die Fragestellung selbst (nur `image_filename`), die Schwierigkeit steuert hier eine reine Zahl, kein Feld-Set. Eigene, parallele Funktion ist klarer als ein künstliches Pseudofeld wie `heaviest_animal`/`confusion_pair`.

**NFR-1-Hinweis (Rückmeldung an `business-analyst`, kein rein technischer Punkt):** Wie bei Umkehr-Quiz/Tiergeräusche ist der **gesamte Modus** ohne Internetverbindung nicht spielbar, da das Bild kein optionaler Zusatz, sondern die Karten selbst sind. Anders als bei jenen beiden Modi ist diese Ausweitung laut `requirements.md` ("Entscheidungen zu den offenen Fragen", Punkt 1) **nicht** automatisch durch die bestehende Nutzer-Entscheidung gedeckt ("kein pauschaler Freibrief für künftige Online-Abhängigkeiten") — technisch gibt es aber keine sinnvolle Alternative, die weiterhin "Basis sind die Bilder, die aktuell schon vorhanden sind" (Issue-Text) erfüllt, ohne Bilder neu lokal zu bündeln (was der bestehenden, bindenden Entscheidung gegen lokales Bild-Bundling widerspräche). Empfehlung: gleiche Behandlung wie #26/#31 (Vorab-Check beim Moduseinstieg, freundliches Abfangen ohne Internet), aber die formale Bestätigung dieser NFR-1-Erweiterung sollte laut eigener Projekt-Vorgabe explizit eingeholt werden, siehe Rückfrage in `requirements.md`.

**Aufwand:** Klein-mittel — kein neuer Netzwerk-Mechanismus (vollständige Wiederverwendung von `imageHint.js`), aber ein neues Bildschirm-Modul mit eigener, in dieser Form neuer Spiellogik (Kartenzustand, Batch-Auflösung mit `Promise.all()`, Mischen). Vergleichbar mit dem Aufwand von #27+#28 zusammen, da Fragegenerierung und Bildschirm hier nicht sinnvoll auf zwei Stories aufteilbar sind (die Batch-Logik und die Kartendarstellung sind eng gekoppelt, anders als bei #27/#28, wo die Pro-Frage-Generierung unabhängig vom Bildschirm-Rendering testbar war).

## Neuer Spielmodus "Buchstabensuche": Finale technische Leitplanken (Issue #46, 16.08.2026, `software-architect`, umsetzungsreif)

**Grundprinzip:** Strukturell am nächsten zu "Wer bin ich?" (#26/#27/#28) — Pro-Frage-Vorab-Auflösung eines einzelnen Bildes, reguläre Rundenstruktur mit `state.questions`/`roundLength`/Fortschrittsanzeige. Der eigentliche Unterschied liegt ausschließlich in der **Antwortmechanik** (Buchstaben-Eingabe statt 4 Antwortkacheln) — kein neuer Netzwerk- oder Bildauflösungs-Mechanismus nötig, volle Wiederverwendung von `imageHint.js` wie bei #27.

**1. Modus-Konstante:** Neuer Wert `LETTER_SEARCH: "letterSearch"` in `GAME_MODE`.

**2. Fragegenerierung — eigene, asynchrone Pro-Frage-Funktion (Arbeitsname `generateNextLetterSearchQuestion(animals, usedAnimalIds, rng)`):**
- Strukturell identisch zu `generateNextReverseQuestion()` (#27): Zieltier-Pool = Tiere mit `image_filename` (100 %), Bildauflösung vorab mit bis zu 3 Retry-Versuchen, `usedAnimalIds`-Ausschluss.
- **Kein Falschantworten-Ziehen nötig** (Unterschied zu #27/#32) — es gibt keine 4 Antwortoptionen, nur den einen Zielnamen (`name_de`), der Buchstabe für Buchstabe eingegeben wird. Das vereinfacht die Funktion gegenüber `generateNextReverseQuestion()`: kein `category`-basiertes Distraktor-Ziehen, kein Dedupe-nach-Name für Distraktoren nötig (nur für das Zieltier selbst, gegen `usedAnimalIds`).
- **Kein neues Datenfeld:** `image_filename` (bestehend) reicht als Basis, `name_de` (bestehend, Pflichtfeld) ist der zu erratende Text.

**3. Lücken-Berechnung — reine, DOM-freie, gut testbare Funktion (Arbeitsname `buildLetterPuzzle(name, difficulty)` in einem neuen, kleinen Modul `src/quiz/letterPuzzle.js`):**
- Nimmt `name_de` (z. B. `"Großer Panda"`) und die Schwierigkeitsstufe entgegen, liefert eine Struktur wie:
  ```js
  [
    { char: "G", type: "given" },
    { char: "r", type: "blank" },
    // ...
    { char: " ", type: "separator" },
    { char: "P", type: "given" },
    // ...
  ]
  ```
- **Positionsregel je Namensteil** (siehe `design.md`-Tabelle): Zählung startet bei jedem durch Leerzeichen/Bindestrich getrennten Namensteil neu bei 1 (nicht über den Gesamtnamen hinweg durchgezählt) — verhindert, dass die Regel bei einem zweiten Namensteil "zufällig" mitten in einem Wort beginnt. Erster/letzter Buchstabe jedes Teils ist laut `design.md` immer `given` (Einfach: zusätzlich erster+letzter; Knifflig: nur erster) — das wird als Override **nach** der Modulo-Regel angewendet (Override hat Vorrang vor "type: blank" aus der Modulo-Berechnung).
- **Umlaute/ß:** werden wie normale Buchstaben behandelt (jeweils **ein** `char`-Eintrag pro Unicode-Zeichen, kein Sonderfall) — `String.prototype.length`/Iteration über deutsche Umlaute ist in JavaScript unproblematisch (kein Surrogate-Pair-Risiko wie bei Emoji), keine Sonderbehandlung nötig.
- Reine Funktion, kein Zufall/kein `rng`-Parameter nötig (die Lücken-Positionen sind deterministisch aus Name + Schwierigkeit, nicht zufällig) — vollständig unit-testbar ohne Mocking, analog zu `difficulty.js`/`infoSentence.js`.

**4. Eingabe-Validierung — case-insensitive, pro Zeichen:**
- Vergleich erfolgt über `char.toLocaleLowerCase("de-DE") === expected.toLocaleLowerCase("de-DE")` (nicht das einfachere `toLowerCase()`, da `toLocaleLowerCase("de-DE")` das deutsche Gebietsschema korrekt anwendet, u. a. für ß-relevante Randfälle) — reine `screens/letterSearch.js`-lokale Prüfung pro Eingabefeld, kein Bezug zu `state.js`.
- Bei korrekter Eingabe: Feld wird `readonly`/gesperrt (zeigt fortan `char` aus `buildLetterPuzzle()` in korrekter Schreibweise, nicht die rohe Kind-Eingabe — vermeidet z. B. sichtbare Kleinschreibung am Namensanfang), Fokus wandert zum nächsten `blank`-Feld.
- Bei falscher Eingabe: Feld wird geleert, kurze Fehlermeldung eingeblendet (siehe `design.md`), Fokus bleibt auf demselben Feld für den nächsten Versuch.
- **Kein neues State-Feld für Fehlversuche** — laut `design.md` bewusst nicht gezählt/angezeigt, daher auch technisch nicht nötig, sie zu tracken.

**5. Abschluss einer Frage/Übergang zur nächsten:** Sobald alle `blank`-Felder korrekt gefüllt sind, wird intern derselbe `recordAnswer()`-Aufruf wie im bestehenden Quizfragen-Modus genutzt (`correct: true` — es gibt hier strukturell kein "falsch beantwortet", das Kind löst durch Wiederholung immer richtig, siehe `design.md`), damit `state.score`/`state.answers` und die bestehende Fortschritts-/Rundenlogik (`advanceToNextQuestion`, `isQuizFinished`) **unverändert** weiterlaufen — kein Sonderfall in `state.js` nötig. Der anschließende Infosatz-/Wikipedia-Link-/Fun-Fact-Block sowie der "Weiter"-Button funktionieren identisch zum bestehenden Feedback-Bereich.
- **Konsequenz für den Ergebnis-Bildschirm:** Da `correct` strukturell immer `true` ist, zeigt der bestehende Ergebnis-Bildschirm automatisch "10 von 10 richtig" o. ä. — das ist **beabsichtigt und keine Sonderbehandlung wert** (siehe `design.md`: kein Wettbewerbs-/Bewertungscharakter in diesem Modus, das Ergebnis bestätigt lediglich "alle Namen erfolgreich zusammengesetzt"). **Empfehlung an `business-analyst`:** falls das im Ergebnis-Text missverständlich wirkt (z. B. "10 von 10 richtig beantwortet" passt semantisch nicht ganz zu "10 Namen zusammengesetzt"), wäre eine kleine Textanpassung im Ergebnis-Bildschirm für diesen Modus sinnvoll (analog zur bereits modusabhängigen Ergebnistext-Anpassung bei #45) — UX-Frage, kein technischer Blocker, siehe Rückfrage an `ux-design`/`business-analyst`.
- **Ergebnis-Verlaufsliste (#14/#36):** Anders als bei #45 passt das bestehende `score`/`total`-Modell hier strukturell (auch wenn `score === total` triviert ist) — technisch spricht nichts dagegen, Einträge zu speichern (`mode: "letterSearch"`). Ob das inhaltlich sinnvoll ist (siehe Trivialitäts-Hinweis oben), ist eine `business-analyst`/`ux-design`-Abwägung, kein technisches Hindernis — Empfehlung: für den ersten Umsetzungsschritt **einbeziehen** (kein Mehraufwand, konsistent mit den übrigen Modi), Trivialitäts-Frage separat klären.

**6. Kein neues globales State-Feld über `mode` hinaus** — `state.questions`/`currentIndex`/`score`/`answers` funktionieren unverändert, wie oben begründet.

**NFR-1-Hinweis:** identische Einschätzung wie bei #45 (Bild ist Pflichtbestandteil jeder Frage, kein optionaler Zusatz) — dieselbe offene Bestätigungsfrage an `business-analyst`/Nutzer, siehe dortigen Hinweis und `requirements.md`.

**Aufwand:** Klein-mittel, spürbar kleiner als #45 — die Fragegenerierung ist eine Vereinfachung von `generateNextReverseQuestion()` (kein Distraktoren-Ziehen), die Lücken-Berechnung ist eine kleine, reine Funktion, und die Rundenstruktur wird **vollständig** unverändert übernommen (kein neuer State-Mechanismus wie bei #45 nötig). Der einzige spürbar neue UI-Baustein ist die Buchstaben-Eingabefeld-Reihe selbst.

## Branch-Strategie-Bestätigung für #45/#46 (16.08.2026, `software-architect`)

Beide Stories fallen unter die bereits bestehende Leitplanke "Branch-Strategie für neue Spielmodi" (siehe oben): jeweils ein eigener Feature-Branch (`feature/tier-memory`, `feature/buchstabensuche`), Merge erst wenn der jeweilige Modus Ende-zu-Ende spielbar ist. Da beide Modi unterschiedliche neue Dateien betreffen (`src/screens/memory.js`+`src/quiz/memory.js` vs. `src/screens/letterSearch.js`+`src/quiz/letterPuzzle.js`) und beide dieselben, aber additiv erweiterbaren gemeinsamen Dateien anfassen (`gameMode.js`, `difficulty.js`, `start.js`/`main.js` für Modus-Auswahl/-Weiche), ist ein Merge-Konflikt bei paralleler Bearbeitung möglich, aber gut auflösbar (rein additive Änderungen an denselben Stellen, kein widersprüchlicher Umbau) — kein Grund, die beiden Branches voneinander abhängig zu machen oder eine feste Reihenfolge vorzuschreiben.

## Buchstabensuche: "Lösung anzeigen"-Option — technische Umsetzung (Issue #52, 20.08.2026, `software-architect`, umgesetzt/gemerged PR #65)

**Anlass:** `business-analyst`/`ux-design` haben mit dem Nutzer die offene Rückfrage zur Zählung im Rundenergebnis geklärt (siehe `requirements.md`/`design.md`, Ergänzung 20.08.2026): Score/Total bleiben unverändert "N von N richtig", zusätzlich wird ausgewiesen, wie viele Fragen per "Lösung zeigen"-Button statt eigenständig gelöst wurden. Diese technische Umsetzung wurde vorab mit `software-architect` abgestimmt, um sicherzustellen, dass keine Breaking Change der bestehenden `results`-Datenstruktur entsteht.

**1. `recordAnswer()` (`src/quiz/state.js`):** Zusätzlicher optionaler Parameter `resolved` (boolean, Default `false`), der pro Antwort unverändert im bestehenden `answers[]`-Array vermerkt wird (analog zu `correct`) — **keine separate Zählvariable** in `state.js`. Die Anzahl aufgelöster Fragen pro Runde ist damit jederzeit aus `state.answers.filter(a => a.resolved).length` ableitbar (Single Source of Truth), statt einen zweiten, potenziell divergierenden Zähler mitzuführen.

**2. `saveResultToHistory()` (`src/quiz/history.js`):** Zusätzliches **optionales** Feld `resolvedCount` im Verlaufseintrag — exakt dasselbe rückwärtskompatible Muster wie das optionale `mode`-Feld aus Issue #36: kein Backfill für bestehende Alt-Einträge (die einfach kein `resolvedCount` haben), kein Pflichtfeld, keine Schema-Migration. Anzeige-Fallback (`resolvedCount ?? 0`, Zusatztext nur bei `> 0`) lebt ausschließlich in `src/screens/result.js`, nicht in `history.js` selbst — konsistent mit dem bestehenden Trennungsprinzip (Datenhaltung vs. Darstellung).

**3. Ergebnis-Bildschirm (`src/screens/result.js`):** `resolvedCount` wird aus `state.answers` abgeleitet (siehe Punkt 1) und sowohl im Hauptsatz ("... davon X aufgelöst!") als auch in der Verlaufsliste (`formatScoreText()`) genutzt — Zusatz erscheint ausschließlich bei mindestens 1 aufgelöster Frage, keine Layout-Änderung bei 0.

**Bestätigt: keine Breaking Change.** `results`-Einträge ohne `resolvedCount` (alle vor diesem Feature gespeicherten sowie Einträge aus Modi, die den Button nicht nutzen) bleiben unverändert lesbar und darstellbar — `resolvedCount` ist rein additiv, wie bereits bei `mode` (#36) etabliert.

## Kindgerechtes Redesign: Technische Leitplanken (20.08.2026, `software-architect`, konsultiert von `business-analyst`)

**Anlass:** Der Nutzer hat mit Claude Design ein komplettes visuelles Redesign gestaltet (Handoff-Bundle mit Design-Tokens, Screen-Spezifikationen für alle 5 Modi, drei neue Motivations-Features: Sticker-Album, Konfetti, Maskottchen "Fine"). Spielablauf/Datenlogik bleiben unverändert — reine Optik-/Motivations-Erweiterung. `business-analyst` hat vier offene technische Fragen zur Klärung vorgelegt, bevor der Story-Zuschnitt final wird.

**1. Font-Loading (Baloo 2 + Nunito) — Empfehlung: selbst gehostete `@font-face`-Dateien, kein Google-Fonts-CDN-Link.** `index.html`/`global.css` haben aktuell keinerlei Font-Loading-Infrastruktur (komplett greenfield) — die Entscheidung legt damit das Muster für alle künftigen Web-Font-Bedürfnisse des Projekts fest, nicht nur für dieses eine Redesign. Ein CDN-Link würde NFR 1 (100 % offline-lauffähige Kernfunktion) zwar nicht hart brechen (Fallback auf System-Font ist rein kosmetisch, blockiert nicht die Spielbarkeit), aber:
- Beide Fonts sind unter der SIL Open Font License frei selbst hostbar — keine Lizenzhürde.
- Beide existieren als **Variable Fonts** bei Google Fonts (ein `.woff2` pro Familie deckt alle benötigten Schnitte 600–800 ab, statt 3 statischer Dateien pro Familie) — Dateigröße insgesamt überschaubar (deutlich kleiner als die bereits akzeptierte Bildlogik).
- Damit entsteht **keine neue NFR-1-Ausnahme** — im Unterschied zu den bereits dokumentierten, bewusst eng begrenzten Ausnahmen (Bild-Rateshilfe #16, Umkehr-Quiz/Tiergeräusche als ganze Modi) wäre eine reine Kosmetik-Ausnahme fürs Laden von Schriftarten sachlich nicht zu rechtfertigen, wenn Selbst-Hosting genauso einfach ist.
- Umsetzung: zwei `.woff2`-Dateien unter `public/fonts/` (oder `src/assets/fonts/`) ablegen (einmalig von Google Fonts heruntergeladen, wie ein Asset committed — kein Build-Step/Pipeline nötig), `@font-face`-Deklarationen + neue `--font-heading`/`--font-body`-Custom-Properties in `global.css` `:root` ergänzen, bestehende hardcodierte `font-family`-Deklaration ersetzen.

**2. Modul-Design `album.js`/`confetti.js`:**
- **`src/quiz/album.js`**: einfacher als `history.js`, da nur eine deduplizierte Liste gesammelter Tier-IDs nötig ist, keine Einzel-Einträge mit eigener ID/Zeitstempel wie bei `history.js` (kein `crypto.randomUUID()` nötig). `STORAGE_KEY = "tierquiz-kinder:album"`. Kernfunktionen: `loadCollectedAnimals(storage)` (defensives JSON-Parsing, `Array.isArray`-Check, leeres Array bei Fehler), `addCollectedAnimal(animalId, storage)` (dedupliziert, gibt aktualisierte Liste zurück), `getAlbumProgress(storage, target = 12)` (Fortschrittsobjekt für Start-/Ergebnis-Screen). Das `resolveStorage`-try/catch-Muster aus `history.js` wird **dupliziert**, nicht in ein gemeinsames Utility-Modul extrahiert — passt zum bestehenden Repo-Stil (jedes `quiz/*.js`-Modul ist bewusst self-contained, es existiert aktuell kein geteiltes Utility-Modul), und zwei Verwendungsstellen rechtfertigen noch keine neue Abstraktionsschicht.
- **`src/quiz/confetti.js`**: reiner DOM-Layer, exportiert z. B. `triggerConfetti(container, options)`. Prüft `window.matchMedia('(prefers-reduced-motion: reduce)').matches` **einmalig beim Aufruf** und überspringt die Partikel-Erzeugung komplett (kein DOM-Churn), statt Partikel zu erzeugen und nur per CSS unsichtbar zu machen — sauberer und konsistent mit der Intention "kein Konfetti soll animieren". Aufrufstellen (richtige Antwort, Memory-Paar, Rundenende) übergeben jeweils, ob Konfetti in diesem Kontext gewünscht ist (deckt die im Handoff geforderte Abschaltbarkeit ab).
- Beide Module folgen der etablierten Testkonvention: co-located `album.test.js`/`confetti.test.js` (Vitest, vollständig etabliert, nicht mehr nur "optional" wie ursprünglich in diesem Dokument vermerkt — Korrektur dieser veralteten Formulierung).

**3. Maskottchen "Fine" — Empfehlung: Platzhalter jetzt umsetzen, echte Illustration als unabhängige Folge-Story.** Technisch trivial austauschbar, wenn von Anfang an über einen einzigen Asset-Pfad referenziert wird (z. B. eine Konstante `MASCOT_IMAGE_PATH` bzw. eine CSS-Custom-Property, die auf eine Bilddatei zeigt) statt Platzhalter-Markup direkt in mehreren Screens zu verstreuen — Austausch später bedeutet dann "eine Datei ersetzen", keine Folgearbeit an Markup/Logik. Es besteht kein technischer Grund, die UI-Umsetzung auf eine noch nicht beauftragte Illustration warten zu lassen. Empfehlung an `business-analyst`: mit Platzhalter (z. B. die im Prototyp bereits verwendete Streifentextur oder ein einfaches Emoji/Icon) starten, Beauftragung einer echten Illustration als separate, jederzeit nachschiebbare Story behandeln.

**4. Branch-Strategie — Empfehlung: EIN gemeinsamer Feature-Branch für das gesamte Redesign**, nicht mehrere. Abweichend von der bisherigen Konvention "ein Branch pro neuem Spielmodus" (Umkehr-Quiz, Tiergeräusche, Tier-Memory, Buchstabensuche), weil jene Modi jeweils unabhängig fertig und für sich spielbar waren — ein nur teilweise umgesetztes Redesign (z. B. neue Tokens + neuer Start-Screen, aber alte Frage-Screens) wäre dagegen ein inkonsistenter, nicht release-fähiger Zwischenzustand auf `main`. Ein Branch (z. B. `feature/kids-redesign`), alle Redesign-Stories committen darauf, Merge erst wenn das gesamte Redesign (oder zumindest ein in sich stimmiger Meilenstein) Ende-zu-Ende spielbar und QA-freigegeben ist — konsistent mit der bereits etablierten Branch-Philosophie ("Merge erst wenn Ende-zu-Ende spielbar").

## Sterne-/Maskottchen-Freischaltsystem: Technische Leitplanken (21.08.2026, `software-architect`, konsultiert von `business-analyst`)

**Anlass:** Ergänzung zum bereits gemergten Kids-Redesign (PR #78) — ein neues Sterne-/Maskottchen-Freischaltsystem laut Nutzer-Handoff ("CHANGES-sterne-maskottchen.md"): Runden-Sterne, 50 wählbare Maskottchen, Freischalt-Screen, Karussell. `business-analyst` hat vier technische Fragen zur Klärung vorgelegt.

**1. Album-Überschneidung — Empfehlung: `progress.js` verwaltet ausschließlich `stars`/`unlockedIds`/`activeIdx`, KEIN eigenes `collected`-Feld.** Das bereits gemergte `src/quiz/album.js` (Issue #68) ist die einzige Quelle der Wahrheit für gesammelte Tiere (`loadCollectedAnimals`/`addCollectedAnimal`/`getAlbumProgress`, eigener `STORAGE_KEY`). Ein zweites `collected`-Array in `progress.js` wäre eine zweite Quelle für exakt dieselbe Information — bei jeder künftigen Änderung (z. B. neues Sammel-Kriterium) müssten zwei Stellen synchron gehalten werden, ein klassisches Duplizierungsrisiko ohne technischen Gegenwert. Die einzige tatsächlich nötige Änderung an `album.js`: `ALBUM_TARGET` von 12 auf 9 senken (reiner Konstanten-Wert, keine Struktur-Änderung, bestehende Tests bleiben gültig). `progress.js` bekommt damit ein bewusst schmaleres Datenmodell als im Handoff-Dokument vorgeschlagen — die dortige Erwähnung von `collected` im `progress.js`-Beispielobjekt ist als Redundanz zu verwerfen, nicht als Vorgabe zu übernehmen.

**2. Modul-/Datenmodell `progress.js` — gleiches Muster wie `album.js`/`history.js`.** `STORAGE_KEY = "tierquiz-kinder:progress"`, `resolveStorage(storage)`-Helper (dupliziert, wie bei `album.js`/`confetti.js` begründet — kein gemeinsames Utility-Modul im Projekt), defensives JSON-Parsing, fehlertolerant bei blockiertem Storage (Spiel bleibt spielbar, Sterne/Freischaltungen werden dann einfach nicht persistiert). Kernfunktionen: `loadProgress(storage)` (liefert `{stars: 0, unlockedIds: [0], activeIdx: 0}` als Default), `recordRoundCompletion({ mode, score, roundLength }, storage)` (kapselt `earned = mode === GAME_MODE.MEMORY || score >= 5`, erhöht `stars` bei `earned`, gibt `{ earned, stars }` zurück), `redeemMascot(mascotId, storage)` (Guard `stars >= 5 && !unlockedIds.includes(mascotId)`, sonst No-Op/`null`; bei Erfolg `unlockedIds.push(mascotId)`, `stars -= 5`, `activeIdx = unlockedIds.length - 1`), `setActiveIdx(idx, storage)` (Karussell-Navigation, nur innerhalb `0..unlockedIds.length-1`). **`activeIdx` referenziert die Position innerhalb `unlockedIds`, nicht die Maskottchen-ID selbst** — da `unlockedIds` nur wächst (append-only, nie umsortiert/gelöscht), bleibt ein einmal gesetzter Index stabil, kein Invalidierungsrisiko.

**`recordRoundCompletion` wird zentral in `main.js`, `showResultScreen()`, aufgerufen — nicht in den einzelnen Frage-Bildschirmen.** `showResultScreen(quizState)` ist bereits die einzige Stelle, durch die jeder Rundenabschluss aller fünf Modi läuft (jeder Screen ruft `onFinish(quizState)` auf, das auf `showResultScreen` zeigt) — dort einmal auszuwerten vermeidet Duplikation der Stern-Logik über fünf Screens hinweg und hält die einzelnen Frage-Bildschirme weiterhin frei von Kenntnis des Maskottchen-Systems (gleiche Entkopplung wie bisher). `quizState.mode === GAME_MODE.MEMORY` genügt als Ersatz für "Memory vollständig gelöst", da `memory.js` `onFinish` laut bestehender Architektur ohnehin erst bei vollständig gelöstem Brett aufruft (kein zusätzlicher Zwischenzustand nötig).

**3. Neuer Screen `mascotChooser.js` + Rücksprung — Empfehlung: Closure-Callback statt String-basiertem `backTo`-Dispatch.** Das im Handoff vorgeschlagene `backTo`-String-Passing (z. B. `"result"`/`"start"`/`"question"`) würde einen neuen zentralen String-Enum plus Re-Dispatch-Switch in `main.js` erfordern — ein Bruch mit dem bestehenden Navigationsstil, in dem jeder Screen bereits Callback-Funktionen entgegennimmt (`onFinish`, `onBackToStart`, `onPlayAgain`), nie String-Identifikatoren. Stattdessen: `renderHeader()` bekommt einen neuen optionalen Callback `onOpenMascotChooser`, den `main.js` bei jedem `renderHeader()`-Aufruf **als Closure über den jeweils aktuellen Navigationszustand** übergibt — z. B. in `showQuestionScreen(quizState)`: `onOpenMascotChooser: () => renderMascotChooserScreen(appContent, { onDone: () => showQuestionScreen(quizState) })`. Kein neuer String-Enum, kein Re-Dispatch-Switch, keine Navigations-History-Datenstruktur nötig (wäre Überengineering für eine App mit ausschließlich Vorwärts-Navigation plus diesem einen Rücksprungfall) — passt sich vollständig in die bestehende, rein Closure-basierte main.js-Navigation ein.

**4. Test-Ansatz — keine Bedenken.** Vitest-Tests für `progress.js` analog `album.js`/`history.js`: Stern bei `score >= 5` vergeben, kein Stern bei `score < 5`, Memory-Modus immer `earned`, Einlösen zieht 5 Sterne ab, Guard verhindert doppeltes Freischalten desselben Maskottchens, `activeIdx` springt nach Freischaltung auf das neue Maskottchen, blockierter Storage lässt das Spiel unverändert weiterlaufen (kein Absturz, Rückgabewerte wie bei `album.js` `null`/Defaults).

## Startseite- & Sammlungs-Neuaufbau, Tier-Album-Entfernung: Technische Leitplanken (21.08.2026, `software-architect`, konsultiert von `business-analyst`)

**Anlass:** Neue Handoff-Datei "CHANGES-startseite-sammlung.md" ersetzt laut eigenem Kopftext die Startseiten-/Album-Beschreibungen aus README.md und "CHANGES-sterne-maskottchen.md". Arbeitsstand: `feature/mascot-unlock-system` (PR #84, noch offen, `#80`–`#82` bereits darauf gemergt/QA-abgenommen, `#83` noch nicht umgesetzt) — nicht `main`.

**1. Album-Entfernung — Umfang real geprüft, größer als der offensichtliche Fall.** `grep` über `src/` bestätigt: `src/quiz/album.js` wird nicht nur aus `start.js`/`result.js` importiert, sondern `addCollectedAnimal()` wird zusätzlich aus **fünf** Frage-Bildschirmen aufgerufen — `question.js` (Z. 679), `soundQuestion.js` (Z. 833), `reverseQuestion.js` (Z. 501), `letterSearch.js` (Z. 507), `memory.js` (Z. 355). Eine vollständige Entfernung berührt damit **7 Produktionsdateien** plus `album.js`/`album.test.js` selbst plus die zugehörigen CSS-Klassen (`.start-album-preview*` in `global.css`) — nicht die 2 Dateien, die man beim ersten Blick auf start.js/result.js vermuten würde. Empfehlung: Entfernung als eigene, in sich abgeschlossene Story schneiden (siehe unten, Story E), nicht "nebenbei" in einer der Sammlungs-Karten-Stories miterledigen, damit ihr vollständiger Umfang sichtbar bleibt und nicht ein Aufrufer übersehen wird.

**2. Wiederverwendbare 3-teilige Nav-Komponente — Empfehlung: neues, kleines gemeinsames Modul, bewusste Ausnahme vom bisherigen "kein Utility-Modul"-Muster.** Das Projekt dupliziert bislang bewusst Kleinigkeiten zwischen genau 2 Screens (z. B. `renderMascotCarouselMarkup`/`formatStars` zwischen `start.js`/`result.js`, Begründung: "kein gemeinsames UI-Utility-Modul im Projekt"). Bei 4 identischen Verwendungsstellen (Start-Maskottchen-Nav, Start-Sammlung-Nav, Ergebnis-Maskottchen-Nav, Ergebnis-Sammlung-Nav) kippt diese Abwägung: die Nav-Komponente trägt eine sicherheitsrelevante Detail-Anforderung (Doppel-Tap-Robustheit, siehe Punkt 4), die bei 4 unabhängigen Kopien mit einer höheren Wahrscheinlichkeit divergiert (ein Bugfix an einer Stelle vergessen an den anderen 3) als bei 2 Kopien. Neues Modul `src/quiz/navControl.js` (reiner Präsentations-/Wiring-Helper, kein Zustand, kein `localStorage`-Zugriff): eine Funktion, die Pfeil-links/Badge/Pfeil-rechts-Markup baut (Parameter: `label`, `disabledPrev`, `disabledNext`, `ariaLabelPrev`, `ariaLabelNext`) und eine zweite, die die beiden Pfeile in einem Container verdrahtet (Parameter: `onPrev`, `onNext`). Aufrufer (start.js, result.js) bleiben für die konkrete Bedeutung (Maskottchen-Index vs. Sammlungs-Seite) selbst zuständig — die Komponente kennt nur "vorheriger/nächster Schritt", keine Fachlogik. Kein neues Zustandsmodul, keine Overengineering-Abstraktion (z. B. kein generisches Pagination-Framework) — genau der eine wiederkehrende UI-Baustein, den der Handoff selbst als "kommt 4× vor" benennt.

**3. Doppel-Tap-Robustheit — React-Detail (`setState(st => ...)`) ist N/A, zugrunde liegendes Verhalten bereits durch das bestehende Muster erfüllt, sofern beibehalten.** Der Handoff begründet funktionale Updater mit React-Batching bei schnellen Kinder-Taps — irrelevant für Vanilla JS, hier gibt es keine State-Batching-Warteschlange. Das bestehende Muster in `start.js`/`result.js` (`prevButton.addEventListener("click", () => { const { activeIdx } = loadProgress(); setActiveIdx(activeIdx - 1); renderSideSection(); })`) ist bereits synchron: jeder Klick liest den *aktuellen* `localStorage`-Stand frisch, schreibt den neuen Wert, rendert danach neu — ein zweiter schneller Klick during dieser Kette liest zwangsläufig bereits den durch den ersten Klick geschriebenen Stand (kein Zwischenzustand, keine Nebenläufigkeit in Single-Threaded JS). **Vorgabe für die neue Nav-Komponente: dieses synchrone Read-Modify-Write-Re-Render-Muster beibehalten**, insbesondere kein `setTimeout`/`requestAnimationFrame`/Debounce zwischen Klick und Zustandsschreiben einbauen (würde die Garantie zerstören) — dann ist "zwei schnelle Taps = zwei Schritte" automatisch erfüllt, ohne einen Nachbau von Reacts funktionalen Updatern.

**4. Paginierungs-Zustand "Meine Sammlung" — rein lokaler UI-Zustand, keine neue Persistenz.** Die aktuell angezeigte Sammlungs-Seite (`colPage`, 0–5) ist im Handoff nicht als zu persistierender Wert genannt (anders als `activeIdx` in `progress.js`) — Empfehlung: als einfache lokale Closure-Variable in `renderStartScreen()`/`renderResultScreen()` führen, analog zu bereits bestehenden nicht-persistenten Zuständen dort (`selectedDifficulty`, `selectedMode` in `start.js`). Kein neues `localStorage`-Feld, kein Erweitern von `progress.js` nötig — reduziert Scope, vermeidet eine unbegründete neue Persistenzfläche.

**5. Header-Ausblendung auf der Startseite — reiner Conditional in `main.js`, kein struktureller Umbau.** `showStartScreen()` ruft aktuell `renderHeader(appHeader, {...})` unconditional auf. Empfehlung: Aufruf einfach weglassen bzw. `appHeader.innerHTML = ""` setzen, wenn der Zielbildschirm die Startseite ist — kein neuer `showHeader`-Parameter durch `header.js` selbst nötig, `main.js` entscheidet bereits an der einzigen Stelle, die weiß, welcher Bildschirm gerade gezeigt wird (gleiches Kopplungsprinzip wie der Rest der Datei). Das jetzt Header-exklusive `onOpenMascotChooser` fällt für den Start-Bildschirm weg; die dortige Sterne-Badge-Variante (siehe `design.md`) ruft `renderMascotChooserScreen` stattdessen direkt aus `start.js` heraus auf (Callback wird beim `renderStartScreen(...)`-Aufruf mitgegeben, gleiches Callback-Kopplungsmuster wie `onStart`) — kein Sonderfall in `main.js`'s Navigationsstil.

**6. Modus-Kachel-Einzeiligkeit (1280px) — reine CSS-Änderung, keine Architektur-Auswirkung.** `grid-template-columns: repeat(5, minmax(0, 1fr))` ersetzt das bisherige `flex-wrap`-Umbruchverhalten aus der Skalierungsentscheidung vom 16.08.2026 — betrifft ausschließlich `global.css`/das Markup der Kachel-Gruppe, keine Logik-Änderung. Einzige technische Voraussetzung: `minmax(0, 1fr)` statt `1fr` (sonst hängen die Spalten an `min-content` und der Bildschirm scrollt horizontal, wie im Handoff selbst korrekt begründet) — mit `min-width: 0` zusätzlich auf den Textblöcken der Kacheln, damit `overflow-wrap`/`hyphens` (siehe Issue #79) innerhalb der schmaleren Spalten weiterhin greift.

**7. Story-Zuschnitt-Empfehlung (Reihenfolge wichtig wegen technischer Abhängigkeiten):**
- **A — Startseiten-Restrukturierung:** Zeilenlayout (Abschnitt 1 des Handoffs), Kopfzeile auf Start ausblenden, Modus-Kacheln einzeilig. Reines Layout-Grundgerüst, Karten-Zeile zunächst mit Platzhalter-Inhalt (Inhalt folgt in B/C).
- **B — "Mein Maskottchen"-Karte + `navControl.js`:** neue Komponente (Punkt 2) bauen, Karte in der Kartenzeile aus A füllen, ersetzt das bisherige Karussell auf dem Start-Bildschirm.
- **C — "Meine Sammlung"-Karte auf dem Start-Bildschirm:** nutzt `navControl.js` aus B, Maskottchen-Paginierung (Punkt 4), Start-spezifisches Sterne-Badge; entfernt dabei den Album-Vorschau-Aufruf aus `start.js` (Teilmenge von Story E, hier nur der `start.js`-Anteil, weil die Sammlungs-Karte an dieselbe Stelle im Markup tritt).
- **D — Ergebnis-Bildschirm-Umbau:** rechte Spalte auf dieselbe "Meine Sammlung"-Karte (B/C-Komponenten wiederverwendet) + Maskottchen-Nav+Bühne, bedingtes "Runde geschafft/beendet"-Label; entfernt den Album-Kartenaufruf aus `result.js` (analog C).
- **E — Tier-Album-Modul endgültig entfernen:** verbleibende `addCollectedAnimal()`-Aufrufe in den 5 Frage-Bildschirmen entfernen, `album.js`/`album.test.js` löschen, verwaiste `.start-album-preview*`-CSS-Klassen bereinigen. Kann parallel zu A/B laufen (unabhängig von den Sammlungs-Karten-Stories), sollte aber vor dem finalen Merge des Gesamt-Branches abgeschlossen sein, damit kein toter Code auf `main` landet.
- **#83 (überarbeitet)** bleibt inhaltlich weitgehend unverändert (Sterne-Box-Logik selbst ist zwischen altem und neuem Handoff nahezu identisch), verliert aber die jetzt falsche Regressions-Annahme "Album unverändert" und bekommt das neue bedingte Runde-Label mit dazu (gleiche Datei, gleicher Bildschirmbereich) — kann unabhängig von A–E umgesetzt werden, da sie nur die bereits von #80 gelieferten `earned`/`stars`-Werte braucht.

## Bugfix-Historie

### Englischer Fallback bei Habitat-/Kontinent-Labels ("coastal margin" beim Seeotter, 15.08.2026, `software-architect`)

**Gemeldeter Bug:** Bei der Frage "Wo lebt das Tier Seeotter?" erschien als Wert "coastal margin" statt eines deutschen Habitat-Begriffs.

**Verifikation:** Bestätigt. `data/animals.json` (Stand `main` vor diesem Fix) enthielt bei Q41407 (Seeotter) `"habitat": ["coastal margin"]`. Q41407 hat auf Wikidata schlicht kein deutsches Label für diesen Habitat-Typ (Q64537438) — nur ein englisches ("coastal margin").

**Systematischer Scan aller 500 Tiere** (`habitat` und, zur Sicherheit, `continent` — gleiche Pipeline-Quelle) auf englische Wörter/Phrasen und andere unplausible Werte ergab:

- **2 Tiere mit echter Sprach-Kontamination** (Root Cause unten): Seeotter (Q41407, `"coastal margin"`) und Waschbär (Q121439, zusätzlich zum korrekten `"Wald"` noch `"urban habitat"`).
- `continent` war bei allen 500 Tieren durchgehend sauber deutsch (7 Werte: Afrika, Amerika, Asien, Australien, Europa, Nordamerika, Ozeanien) — keine Kontamination in diesem Feld gefunden, obwohl es über denselben Mechanismus (`labelMap`/`pickLabel()`) befüllt wird. Reiner Zufall der konkreten Wikidata-Datenlage (für alle referenzierten Kontinent-Items existierte ein deutsches Label), kein struktureller Unterschied zu `habitat` — der jetzt behobene Root Cause hätte grundsätzlich auch `continent` treffen können.
- Zusätzlich bestätigt (bereits aus früherer QA bekannt, Issue #8-Kontext, **nicht** Teil dieses Fixes): 2 Tiere mit Ländernamen statt Habitat-Typen im `habitat`-Array — Fasan (Q25432, 17 Länder-/Regionsnamen wie "Kasachstan", "Vietnam", "Mongolei" ...) und Hausmeerschweinchen (Q79803, `"Peru"`). Andere Ursache als der hier behobene Bug: die deutschen Labels dieser Wikidata-Items sind korrekt (z. B. "Kasachstan" ist der richtige deutsche Name des Staates) — das zugrunde liegende Wikidata-P2974-Statement (`habitat`) referenziert bei diesen Arten fälschlich Länder-/Staaten-Items statt Habitat-Typen. Kein Sprachfallback-Problem, sondern eine Wikidata-eigene Fehlkategorisierung; explizit außerhalb des Scopes dieses Fixes (siehe Auftrag), unverändert im Datensatz erhalten.

**Root Cause:** `fetchLabels()` (für `habitat`/`continent`-Item-Labels, `scripts/fetch-animals/fetch-animals.js`) rief `pickLabel(entity)` auf, das bei fehlendem deutschen Wikidata-Label unmarkiert auf das englische Label zurückfiel (`if (labels.de) return labels.de.value; if (labels.en) return labels.en.value; ...`). Für ein deutschsprachiges Kinderquiz ist ein durchgerutschter englischer Fachbegriff ebenso unpassend wie der in Issue #10 bereits behobene Fall eines lateinischen Artnamens in `name_de` — dort existiert seit #10 bereits ein strengerer, English-fallback-freier Mechanismus (`pickAnimalNameDe()`), der aber nur für Tiernamen galt, nicht für Habitat-/Kontinent-Item-Labels.

**Fix:**
1. `pickLabel()` durch `pickGermanLabel()` ersetzt (einzige Verwendung: `fetchLabels()` → `labelMap` für Habitat-/Kontinent-Items) — gibt ausschließlich `labels.de.value` zurück, sonst `null`, **kein** Fallback auf Englisch mehr. `fetchLabels()` fragt entsprechend nur noch `languages: "de"` ab. Anders als bei `name_de` (Pflichtfeld) ist `null` hier unkritisch: `habitat`/`continent` sind Arrays, ein einzelner Eintrag ohne deutsches Label wird über das bereits vorhandene `.filter(Boolean)` in `buildAnimal()` einfach aus der Liste entfernt statt englischen Text durchsickern zu lassen (konsistent mit der optionalen-Felder-Philosophie aus der Schema-Korrektur vom 13.08.2026 — kein neuer Pflichtfeld-/Fehlerpfad nötig).
2. **Architektur-Korrektur an der Cache-Struktur:** `labelMap` wurde bisher Teil des mit `--use-cache` wiederverwendbaren Hydration-Caches. Das ist grundsätzlich falsch, sobald die Label-Interpretationslogik (wie hier) sich ändern kann: ein gecachtes `labelMap` hätte diesen Fix bei `--use-cache`-Reruns stillschweigend wirkungslos gemacht, da die alten (fehlerhaften) Label-Werte unverändert aus dem Cache übernommen worden wären (in der Praxis beim ersten Fix-Versuch genau so beobachtet — 0 Diff trotz Code-Fix). `labelMap` wird jetzt **nicht mehr** in `saveCache()`/`loadCache()` persistiert, sondern bei jedem Lauf frisch berechnet (`computeLabelMap()`, neue eigenständige Funktion) — unkritischer Zusatzaufwand (51 Habitat- + 9 Kontinent-Items bei diesem Rerun), da nur die im gecachten Discovery-/Hydration-Ergebnis referenzierten Habitat-/Kontinent-QIDs neu angefragt werden, nicht die teure Discovery/Hydration selbst.

**Zusätzlich gefunden (bei der Regenerierung, nicht Teil des ursprünglich gemeldeten Bugs):** `MANUALLY_CURATED_FIELDS` (siehe Abschnitt "Pipeline-Regenerierung vs. manuell kuratierte Felder" oben) listete nur `["diet", "lifespan_years"]` — `fur_feather_color` (Issue #23) und `fun_fact` (Issue #24/#25) wurden bei ihrer Einführung nicht ergänzt. Eine erste Regenerierung mit dem alten Stand hätte diese Kuration für 434 bzw. 20 Tiere stillschweigend verworfen (beobachtet, dann vor dem Schreiben der finalen Datei korrigiert, nie committet). `MANUALLY_CURATED_FIELDS` jetzt vollständig: `["diet", "lifespan_years", "fun_fact", "fur_feather_color"]` (Reihenfolge an die bisherige JSON-Schlüsselreihenfolge angepasst, um unnötige Diff-Unruhe durch reine Schlüsselvertauschung zu vermeiden).

**Ergebnis der Regenerierung** (`node scripts/fetch-animals/fetch-animals.js --use-cache`, kein neuer Discovery-/Hydration-Wikidata-Call, nur die 60 Label-Items neu aufgelöst): Diff gegen den `main`-Stand vor diesem Fix zeigt **ausschließlich** die erwarteten Änderungen — `habitat` bei Seeotter (Feld komplett entfernt, da danach leer) und Waschbär (nur `"urban habitat"` entfernt, `"Wald"` bleibt), plus der unvermeidliche `retrieved_at`-Datumsstempel. Alle 500 Tier-IDs, alle sonstigen Felder inkl. sämtlicher manuell kuratierter Werte (`diet`, `lifespan_years`, `fur_feather_color`, `fun_fact`) sind wertidentisch zum vorherigen Stand (per Skript verifiziert, kein reiner Text-Diff). `continent` unverändert bei allen 500 Tieren. Test-Suite (94 Tests) weiterhin grün.

**Verantwortung Umsetzung:** `software-architect` (dieser Fix, direkt umgesetzt statt an `web-developer` delegiert, da reine Pipeline-/Datenkorrektur ohne Frontend-Bezug). Kein `git commit`/`push` durch diese Rolle (siehe Skill-Leitplanken) — übernimmt eine andere Rolle im Anschluss.

### Bugfix Issue #94: Bild in der Auflösung abgeschnitten + manchmal gar kein Bild (22.08.2026, `software-architect`, konsultiert von `business-analyst`)

**Gemeldeter Bug:** Roher Nutzer-Bugreport — "Aktuell ist das angezeigte Bild in der Auflösung nach der Antwort in den Rätseln abgeschnitten [...] Zudem wird manchmal gar kein Bild angezeigt." Der Report benennt keinen konkreten Spielmodus; Verifikation im Code ergab zwei unabhängige Ursachen mit unterschiedlichem Fix-Ort, siehe unten.

**Verifikation Teil 1 (Abschneidung):** Bestätigt, CSS-Ursache (`object-fit: cover` + feste Höhe), betrifft die Sticker-Karte (`.question-screen__feedback-image-img`/`.reverse-question__sticker-img`/`.letter-search__sticker-img`, 130px feste Höhe). Bestand bereits vor dem #72-Redesign (damals 176px statt 130px) — keine Regression, aber das Redesign hat die Box verkleinert und die Abschneidung dadurch verschärft. Gestalterische Bewertung/Lösung (`object-fit: contain`) siehe `design.md`, Abschnitt "Bugfix-Triage: Bild in der Auflösung abgeschnitten...".

**Verifikation Teil 2 ("manchmal gar kein Bild"):** Bestätigt, aber **nur für den normalen Quizfragen-Modus** (`question.js`, `startFeedbackImageFetch()`, Issue #30) — dort ein echter Architektur-Lücke, kein Datenproblem:

- `data/animals.json` hat **500/500 Tieren** ein `image_filename` (per Skript verifiziert) — die "kein Bild"-Fälle sind keine Datenabdeckungslücke.
- `startFeedbackImageFetch()` macht genau **einen** Fetch-Versuch gegen die Commons-API mit 3,5s Timeout (`REQUEST_TIMEOUT_MS`, unverändert aus Issue #16 übernommen) und fängt jeden Fehlschlag (Timeout, Netzwerkfehler, nicht auflösbare Datei) still ab, ohne jeden weiteren Versuch — bewusst so entschieden bei Issue #30 (design.md: "poppt still ein" als sekundäres Zusatzfeature, kein Fehlertext). Bei einem einzelnen transienten Netzwerk-Hänger (auf einem echten Mobilgerät/Wechsel zwischen Netzen realistisch, nicht nur ein Test-Randfall) bleibt das Bild für diese Frage **dauerhaft** unsichtbar, ohne jede Wiederholung oder Nutzer-erkennbaren Hinweis.
- Im Vergleich dazu haben die beiden anderen Bild-getriebenen Modi bereits eine deutlich robustere Fehlerbehandlung: `reverseQuestionGenerator.js` (Issue #27/28, wiederverwendet von `letterSearch.js`) macht bis zu **4 Versuche** (`MAX_RESOLUTION_ATTEMPTS`) und zeigt bei endgültigem Fehlschlag einen expliziten Fehlerzustand mit "Nochmal versuchen"-Button (`reverseQuestion.js`, `.reverse-image-frame__error`) — dort ist "kein Bild" nie *unsichtbar*, sondern ein sichtbarer, wiederholbarer Zustand.
- **Root Cause damit klar benannt:** eine Asymmetrie in der Fehlertoleranz zwischen Issue #30 (1 Versuch, stiller Fehlschlag) und Issue #27/28 (4 Versuche, sichtbarer Fehlerzustand) — keine bewusste Architekturentscheidung, sondern eine bei Issue #30 nie nachgezogene Lücke.

**Fix-Empfehlung (Umsetzung `web-developer`):** `startFeedbackImageFetch()` um einen begrenzten Retry (Vorschlag: 2–3 Versuche insgesamt, gleiches Zieltier/gleicher Dateiname — anders als bei #27/28 kann hier nicht auf ein anderes Zieltier ausgewichen werden, da das Tier durch die bereits gegebene Antwort feststeht) ergänzen, mit kurzer Pause zwischen den Versuchen, weiterhin nicht-blockierend gegenüber Feedback-Text/Infosatz/Fun-Fact/"Weiter"-Button (design.md-Vorgabe aus #30 bleibt gültig). Timeout pro Versuch (3,5s) unverändert lassen — ohne reale Telemetrie zur Fehlerursache (Timeout vs. Netzwerkfehler vs. nicht auflösbare Datei) ist eine Timeout-Erhöhung reine Vermutung, der Retry-Mechanismus selbst behebt den Kern unabhängig von der genauen Fehlerursache. Kein Fehlertext/keine Fehler-UI nötig (bewusste #30-Entscheidung bleibt bestehen) — der Retry macht das stille Ausblenden nur deutlich seltener, ändert aber nicht dessen Charakter als sekundäres Zusatzfeature. `extractImageInfo()`/`buildAttribution()`/`buildCommonsImageInfoUrl()` (imageHint.js) bleiben unverändert wiederverwendbar, keine Anpassung an den reinen Hilfsfunktionen nötig.

**Kein Architekturbedarf bei den anderen beiden Modi:** `reverseQuestion.js`/`letterSearch.js` haben bereits die robustere Fehlerbehandlung (s. o.) — dort ist "gelegentlich kein Bild trotz Retry + sichtbarem Fehlerzustand" ein akzeptiertes, dokumentiertes Verhalten (architecture.md, Issue #27/28-Abschnitt), kein neuer Bug.

**Verantwortung Umsetzung:** `web-developer` (kleiner, eng lokalisierter Fix in `question.js`, keine Schema-/Datenänderung). Kein `git commit`/`push` durch diese Rolle (siehe Skill-Leitplanken).

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
- 2026-08-14: **Finale Leitplanken für Fell-/Federfarbe (Issues #22/#23), Story-Freigabe auf `status:ready`.** `business-analyst` mit `software-architect` + `zoologe`: Feldname `fur_feather_color` und 7er-Enum (`braun`/`grau`/`schwarz`/`weiß`/`rot/orange`/`gelb`/`bunt/gemustert`) final bestätigt, keine Änderung gegenüber Ausgangsvorschlag. `zoologe` bestätigt realistische Zuordenbarkeit für alle 434 relevanten Tiere und liefert vier konkrete Kurationsregeln (gemusterte Tiere → `bunt/gemustert`, Umgang mit Geschlechtsdimorphismus/saisonaler Variation, erwartungsgemäß ungleiche Werteverteilung). Bekanntes Risiko (Braun-/Grau-Dominanz bei Säugetieren) bestätigt, aber kein Blocker. Details siehe Abschnitt "Technische Einschätzung: Zwei vorgeschlagene Content-Erweiterungen" → "1. Fell-/Federn-Farbe" → "Finale Leitplanken".
- 2026-08-14: **Automatische Bild-Anzeige nach der Antwort (Issue #30), Story-Freigabe auf `status:ready`.** Neue Nutzeranforderung, zusätzlich zum unveränderten Pre-Answer-Button aus Issue #16: Bild wird nach Antwortabgabe automatisch (ohne Klick) im Feedback-Bereich angezeigt. Wiederverwendung der bestehenden `imageHint.js`-Hilfsfunktionen (keine Logik-Duplikation), aber neue, eigenständige DOM-Instanz im Feedback-Bereich statt geteiltem Zustand mit dem Pre-Answer-Bereich. Falls das Kind bereits vor der Antwort manuell aufgedeckt hat, wird der automatische Abruf übersprungen (kein Duplikat-Abruf/-Anzeige). Gleiches stilles Ausblend-Verhalten bei fehlendem Bild/Netzwerkfehler wie bei #16, nicht-blockierend gegenüber Feedback-Text/Infosatz/Fun Fact/"Weiter"-Button. Keine neue NFR-1-Ausnahme (zweite Instanz der bereits bestehenden #16-Ausnahme), kein Schema-Bedarf. Details siehe Abschnitt "Bild-Rateshilfe: Automatische Anzeige nach der Antwort".
- 2026-08-14: **Story-Zuschnitt Tiergeräusche-Modus (Issues #31/#32/#33), aufgeteilt aus dem Backlog-Platzhalter #29.** Neues optionales Schema-Feld `audio_filename` (P51-Dateiname, analog zu `image_filename`/P18, Build-Zeit-Extraktion ohne neuen Netzwerk-Call). Laufzeit-Mechanismus strukturell identisch zum Umkehr-Quiz (`generateNextSoundQuestion`, 3-Retry-Vorab-Check), aber `iiurlwidth` entfällt (kein Audio-Thumbnail-Äquivalent) und der Vorab-Check prüft nur die Metadaten-Auflösung, nicht den vollständigen Download (progressive `<audio>`-Wiedergabe). Zieltier-Pool auf 157/500 Tiere mit Audio beschränkt, Distraktor-Namen bewusst aus dem vollen 500er-Pool gezogen, um die Falschantworten-Vielfalt nicht zusätzlich einzuschränken. Bekanntes, dokumentiertes Risiko: Ogg-Vorbis-Wiedergabe in Safari/iOS historisch unvollständig — für den aktuellen Schritt unkritisch (NFR 2 kein unmittelbares Ziel), vor einem späteren iPad-Rollout zu prüfen. Details siehe Abschnitt "Tiergeräusche: Finale technische Leitplanken". UX-Leitplanken (Play-Button, Wiederholbarkeit, dokumentierte Barrierefreiheits-Einschränkung für hörbeeinträchtigte Kinder) siehe `design.md`.
- 2026-08-14: **Finale Leitplanken für Umkehr-Quiz (Issues #26/#27/#28), Story-Freigabe auf `status:ready`.** `business-analyst` mit `software-architect` + `ux-design`: neue asynchrone Pro-Frage-Generierungsfunktion (`generateNextReverseQuestion`) statt Batch-Vorausbau wie im bestehenden Generator, mit bis zu 3 Retry-Versuchen (neues Zieltier) bei fehlgeschlagenem Bildabruf, bevor ein Fehler an den Bildschirm geht; Falschantworten-Ziehung bevorzugt gleiche `category` wie Zieltier (neue Logik, abweichend von `buildIdentifyQuestion`); der "Testabruf" beim Moduseinstieg (#26) ist identisch mit dem ersten Aufruf dieser Funktion, kein separater Health-Check. `ux-design` hat den neuen Frage-Bildschirm spezifiziert (Bild statt Fragetext, Pflicht-Attribution auf jeder Frage, Inline-Lade-/Fehlerzustand im reservierten Bildrahmen, kein Rundenabbruch bei Bildfehler) sowie eine wichtige Barrierefreiheits-Korrektur gegenüber Issue #16 festgehalten: Alt-Text darf hier **nicht** den Tiernamen verraten. Details siehe Abschnitt "1. Umkehr-Quiz" → "Finale technische Leitplanken" sowie `design.md`, Abschnitte "Modus-Auswahl auf dem Start-Bildschirm" (Ergänzung) und "Frage-/Feedback-Bildschirm 'Wer bin ich?'".
- 2026-08-14: **`business-analyst`-Entscheidungen zu allen 6 zuvor offenen Fragen aus den letzten beiden Klärungsrunden** (Nutzer hat die Klärung explizit an `business-analyst` delegiert, statt sie zurückzuspielen — siehe `requirements.md` für die vollständige Begründung je Entscheidung): (1) Fell-/Federnfarbe der einfachen Stufe (6–10) zugeordnet, grobes Enum als Leitplanke (siehe Abschnitt "Schwierigkeitsstufen — Zuordnung zu vorhandenen Feldern"). (2) "Besonderheiten" = `fun_fact` bestätigt, erste Kurations-Tranche auf 20 Tiere festgelegt (siehe `requirements.md`). (3) Online-Abhängigkeit ganzer Spielmodi (Umkehr-Quiz, Tiergeräusche) akzeptiert als eng begrenzte, dokumentierte NFR-1-Ausnahme. (4) Vollständige P51-Messung über alle 500 Tiere durchgeführt (neues Skript `scripts/fetch-animals/measure-audio-coverage.js`, analog zu `measure-image-coverage.js`, reiner Lesezugriff, kein Pipeline-Teil): 157/500 (31,4 %) statt der aus der 30er-Stichprobe grob geschätzten ~140 — Priorität 2 für Tiergeräusche bestätigt, keine weitere Messung nötig. (5) Fehlerbild zurückgestellt, auch nicht als kleine Machbarkeitsstudie — keine Projekt-Rolle deckt Bildproduktion/-bearbeitung ab, ungeklärte Share-Alike-Lizenzfrage bei Bearbeitungswerken. (6) Branch-Strategie (ein Feature-Branch pro neuem Spielmodus) vollständig bestätigt (siehe Abschnitt "Branch-Strategie für neue Spielmodi"). Vollständige Begründungen je Entscheidung: `requirements.md`, Abschnitte "Bewertung vorgeschlagener Content-Erweiterungen" und "Bewertung dreier neuer Spielmodi" → "Entscheidungen zu den offenen Fragen".
- 2026-08-15: **Wiederverwendbarkeit von `infoSentence.js`/Wikipedia-Link für "Wer bin ich?"-Modus geklärt (Issue #35).** `buildInfoSentence()` und die `wikipedia_url_de`-Anzeigelogik sind vollständig entkoppelt von Fragetyp/Modus und direkt wiederverwendbar; nur die DOM-Verdrahtung muss im (noch nicht feststehenden) #28-Zielmodul neu nachgebaut werden. Automatisches Feedback-Bild (#30) bewusst nicht mit übernommen (Redundanz, siehe `design.md`). Siehe Abschnitt "Infosatz + Wikipedia-Link im 'Wer bin ich?'-Modus: Wiederverwendbarkeit".
- 2026-08-15: **Datenmodell-Erweiterung Ergebnisliste (Issue #36), Story-Freigabe auf `status:ready`.** `history.js`-Einträge um optionales `mode`-Feld (`"quiz"`/`"reverse"`/`"sound"`) und `id` (für gezieltes Löschen) erweitert; keine aktive Migration von Bestandsdaten, fehlendes `mode` wird beim Anzeigen als `"quiz"` interpretiert. Neue Funktionen `deleteHistoryEntry(id, storage)`/`clearResultHistory(storage)`, gleiches Fehlertoleranz-/Rückgabemuster wie `saveResultToHistory`. Siehe Abschnitt "Ergebnisliste: Modus-Feld + Lösch-Funktion".
- 2026-08-15: **Bugfix: Englischer Fallback bei Habitat-/Kontinent-Labels** (gemeldet am Beispiel Seeotter: `habitat` = "coastal margin" statt eines deutschen Begriffs). Root Cause: `pickLabel()` (nur verwendet für Habitat-/Kontinent-Item-Labels in `fetchLabels()`) fiel bei fehlendem deutschen Wikidata-Label unmarkiert auf Englisch zurück. Systematischer Scan aller 500 Tiere ergab 2 betroffene Tiere (Seeotter, Waschbär); `continent` war zufällig bei allen 500 Tieren sauber. Fix: `pickLabel()` → `pickGermanLabel()` ohne En-Fallback (kontaminierte Array-Einträge werden schlicht gefiltert, analog zur bestehenden Optional-Feld-Philosophie), plus Architektur-Korrektur: `labelMap` nicht mehr Teil des `--use-cache`-Hydration-Caches (war sonst stumpf gegenüber Fixes an der Label-Interpretationslogik), sondern bei jedem Lauf frisch berechnet. Zusätzlich `MANUALLY_CURATED_FIELDS` um die bei ihrer Einführung vergessenen Felder `fur_feather_color` (#23) und `fun_fact` (#24/#25) ergänzt — sonst hätte die Regenerierung diese Kuration für 434 bzw. 20 Tiere verloren. `data/animals.json` regeneriert (`--use-cache`); Diff gegen den vorherigen `main`-Stand zeigt ausschließlich die erwarteten `habitat`-Änderungen bei den 2 betroffenen Tieren, alle anderen 498 Tiere und alle sonstigen Felder wertidentisch. Bereits bekanntes, separates Problem (Ländernamen statt Habitat-Typen bei Fasan/Hausmeerschweinchen, Issue #8-Kontext) bestätigt, aber bewusst nicht Teil dieses Fixes. Details siehe Abschnitt "Bugfix-Historie" → "Englischer Fallback bei Habitat-/Kontinent-Labels".
- 2026-08-20: **Technische Leitplanken für das kindgerechte Redesign (Claude-Design-Handoff), `business-analyst`-Anfrage beantwortet.** Font-Loading: selbst gehostete Variable-Font-`.woff2`-Dateien (Baloo 2, Nunito) statt Google-Fonts-CDN — vermeidet eine sachlich unnötige neue NFR-1-Ausnahme, da Selbst-Hosting genauso einfach ist. Neue Module `src/quiz/album.js` (einfacher als `history.js`, nur deduplizierte Tier-ID-Liste, kein `crypto.randomUUID()` nötig) und `src/quiz/confetti.js` (reiner DOM-Layer, überspringt Partikel-Erzeugung komplett bei `prefers-reduced-motion`). Maskottchen "Fine": Platzhalter jetzt umsetzen (über einen einzigen austauschbaren Asset-Pfad referenziert), echte Illustration als unabhängige Folge-Story. Branch-Strategie: ein gemeinsamer Feature-Branch `feature/kids-redesign` für das gesamte Vorhaben (Ausnahme von "ein Branch pro Spielmodus", da ein teilweise umgesetztes Redesign kein release-fähiger Zwischenzustand wäre). Details siehe Abschnitt "Kindgerechtes Redesign: Technische Leitplanken".
- 2026-08-21: **Technische Leitplanken für das Sterne-/Maskottchen-Freischaltsystem (Handoff-Ergänzung "CHANGES-sterne-maskottchen.md"), `business-analyst`-Anfrage beantwortet.** Album-Überschneidung aufgelöst: `progress.js` verwaltet nur `stars`/`unlockedIds`/`activeIdx`, KEIN eigenes `collected`-Feld — das bestehende `album.js` (Issue #68) bleibt einzige Quelle für gesammelte Tiere, nur `ALBUM_TARGET` sinkt von 12 auf 9. `progress.js` folgt demselben Persistenz-Muster wie `album.js`/`history.js` (STORAGE_KEY, `resolveStorage`, defensives Parsing). Stern-Vergabe (`recordRoundCompletion`) wird zentral einmal in `main.js`/`showResultScreen()` ausgewertet, nicht in den einzelnen Frage-Bildschirmen dupliziert. Neuer Screen `mascotChooser.js` mit Rücksprung über einen normalen Closure-Callback (`onOpenMascotChooser`, analog zu `onFinish`/`onBackToStart`), bewusst **kein** String-basiertes `backTo`-Enum mit Re-Dispatch-Switch (Überengineering für den bestehenden, rein Closure-basierten main.js-Navigationsstil). Details siehe Abschnitt "Sterne-/Maskottchen-Freischaltsystem: Technische Leitplanken". UX-Leitplanken (Stern-Icon-Kollision im Header, Copy, Barrierefreiheit) siehe `design.md`.
- 2026-08-21: **Technische Leitplanken für Startseiten-/Sammlungs-Neuaufbau und Tier-Album-Entfernung (Handoff-Ergänzung "CHANGES-startseite-sammlung.md", ersetzt laut eigenem Kopftext die Startseiten-/Album-Beschreibungen aus README.md und der vorherigen Handoff-Datei).** Arbeitsstand weiterhin `feature/mascot-unlock-system` (PR #84, offen). Album-Entfernung real geprüft: betrifft 7 Produktionsdateien (nicht nur start.js/result.js — `addCollectedAnimal()` läuft zusätzlich aus allen 5 Frage-Bildschirmen), als eigene Story E geschnitten. Neues gemeinsames Modul `src/quiz/navControl.js` für die 4× wiederverwendete 3-teilige Nav-Komponente (Pfeil/Badge/Pfeil) — bewusste Ausnahme vom bisherigen "kein Utility-Modul"-Muster, da 4 Kopien mit einer sicherheitsrelevanten Doppel-Tap-Anforderung das Duplizierungsrisiko kippen lassen. Doppel-Tap-Robustheit: React-`setState`-Updater-Hinweis aus dem Handoff ist N/A (kein Batching in Vanilla JS), bestehendes synchrones Read-Modify-Write-Re-Render-Muster erfüllt die Anforderung bereits, sofern kein Debounce/Timeout eingebaut wird. Sammlungs-Paginierung (`colPage`) als rein lokaler UI-Zustand, keine neue Persistenz. Header-Ausblendung auf Start: reiner Conditional in `main.js` (Aufruf weglassen), kein struktureller Umbau. Modus-Kachel-Einzeiligkeit: reine CSS-Änderung. Story-Reihenfolge A (Layout-Grundgerüst) → B ("Mein Maskottchen" + `navControl.js`) → C ("Meine Sammlung" auf Start) → D (Ergebnis-Umbau) → E (Album-Modul-Löschung, parallelisierbar), #83 unabhängig überarbeitbar. Details siehe Abschnitt "Startseite- & Sammlungs-Neuaufbau, Tier-Album-Entfernung: Technische Leitplanken". UX-Leitplanken (Layout, Barrierefreiheit, Reversion der Modus-Kachel-Skalierungsentscheidung) siehe `design.md`.
- 2026-08-22: **Bugfix-Triage Issue #94 (Bild in der Auflösung abgeschnitten + manchmal gar kein Bild), zwei getrennte Ursachen identifiziert.** Abschneidung: `object-fit: cover` + feste Höhe in der Sticker-Karte (130px, alle drei Modi), bestand schon vor dem #72-Redesign (damals 176px), keine Regression, aber durch die Verkleinerung sichtbarer geworden — Lösung `object-fit: contain` (Details `design.md`). "Kein Bild": betrifft nur den normalen Quizfragen-Modus (`question.js`/Issue #30) — 500/500 Tiere haben ein `image_filename` (keine Datenlücke), aber `startFeedbackImageFetch()` macht nur einen Fetch-Versuch mit stillem Fehlschlag, ohne Retry — im Unterschied zu Issue #27/28 (`reverseQuestionGenerator.js`, bis zu 4 Versuche + sichtbarer Fehlerzustand), das dieselbe Robustheitslücke nicht hat. Fix-Empfehlung: begrenzten Retry (2–3 Versuche, gleiches Zieltier) in `startFeedbackImageFetch()` ergänzen, Timeout unverändert. Details siehe Abschnitt "Bugfix-Historie" → "Bugfix Issue #94: Bild in der Auflösung abgeschnitten + manchmal gar kein Bild".
