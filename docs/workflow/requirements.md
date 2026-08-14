# Requirements: Tierquiz für Kinder

Dieses Dokument ist die projektweite Klammer für Ziel, Scope und Anforderungen. Es wird laufend aktualisiert, sobald sich Entscheidungen ändern oder neue hinzukommen. Konkrete Umsetzungs-Stories werden **nicht** hier, sondern als GitHub Issues im Repo geführt (siehe "Ablage-Konvention" unten).

Aktueller Fokus dieses Dokuments: **ausschließlich der Spielmodus "Quizfragen" (Multiple-Choice-Trivia)** sowie die dafür nötige Tierdatenbank. Andere Spielmodi sind nur als langfristige Vision vermerkt (siehe "Explizit außerhalb des Scopes").

## Ablage-Konvention

- Projektweite Requirements: diese Datei, `docs/workflow/requirements.md`, im Projekt-Repo. Sie wird als lebendes Dokument gepflegt (Änderungen direkt in der Datei, gebündelte Commits statt Commit pro Kleinständerung).
- Einzelne Stories/Tasks: werden **nicht** in dieser Datei oder anderswo lokal dupliziert, sondern als GitHub Issues im Repo (`Chris-Kraus/tierquiz-kinder`) angelegt, sobald sie mit PM, Architektur und UX gescoped sind. In diesem Arbeitsschritt wurden bewusst noch keine Issues erstellt — das folgt nach Abstimmung.

## Ziel & Zielgruppe

**Ziel:** Eine interaktive Website, mit der Kinder spielerisch Tierwissen lernen bzw. testen können. Erster Baustein ist ein Multiple-Choice-Quiz zu Tieren.

**Zielgruppe:** Kinder, aufgeteilt in zwei umschaltbare Schwierigkeitsstufen: **6–10 Jahre** (einfacher) und **10–12 Jahre** (anspruchsvoller). Die Stufe wird vom Kind/Elternteil am Start-Bildschirm gewählt und ist jederzeit wechselbar (keine automatische Erkennung). Details zur Umsetzung siehe "Schwierigkeitsgrade" unten sowie `ux-design`/`architecture.md`.

**Nutzungskontext:** Zunächst lokal auf dem Rechner des Nutzers (Entwicklungs-/Testphase), später möglicherweise browserbasiert auch auf einem iPad nutzbar.

## Funktionale Anforderungen — Spielmodus "Quizfragen"

1. **Fragetyp:** Multiple-Choice-Fragen zu Tieren (z. B. "Welches Tier ...?", "Wie viele Beine hat ...?", "Wo lebt ...?" — konkrete Frageschablonen sind Teil der Datenmodellierung/UX, nicht dieses Dokuments).
2. **Anzahl Antwortoptionen:** 4 Antwortoptionen pro Frage (passt zum 2×2-Kachel-Layout aus `design.md`).
3. **Fragenauswahl aus der Tierdatenbank:** Fragen werden aus dem Pool der ~500 Tiere generiert bzw. ausgewählt. Wie genau (zufällig, mit/ohne Wiederholung innerhalb einer Runde, Kategorien-Filter, wie falsche Antwortoptionen aus den übrigen Tieren plausibel gezogen werden) ist technisch in Abstimmung mit `software-architect` zu klären — bei zwei Schwierigkeitsstufen zusätzlich: welche Felder/Frageschablonen je Stufe genutzt werden (siehe `architecture.md`, Abschnitt Schwierigkeitsstufen).
4. **Punktestand / Ergebnis-Tracking:** Es gibt einen Punktestand bzw. ein Ergebnis pro Quiz-Durchlauf (z. B. "X von Y richtig beantwortet"), angezeigt am Ende der Runde. Keine Speicherung über einzelne Sitzungen hinaus (kein Highscore/Verlauf) in dieser Phase — siehe "Explizit außerhalb des Scopes".
5. **Schwierigkeitsgrade:** Es gibt **zwei umschaltbare Schwierigkeitsstufen**, gekoppelt an Altersgruppen: **6–10 Jahre** (einfacher — Fragen zu intuitiven/visuellen Fakten wie Kategorie, Lebensraum, Kontinent; *nicht* Farbe, siehe "Datenbasis") und **10–12 Jahre** (anspruchsvoller — zusätzlich Fragen zu spezifischeren/numerischen Fakten wie Gewicht, Länge, Lebenserwartung, Ernährung, ggf. Gefährdungsstatus, sowie näher beieinanderliegende, schwerer unterscheidbare Falschantworten). Die Stufe wird am Start-Bildschirm gewählt, nicht automatisch erkannt, und ist jederzeit wechselbar. Details zur Feld-Zuordnung siehe `architecture.md`.
6. **Feedback pro Frage:** Es wird erwartet, dass das Kind nach Beantwortung einer Frage erkennt, ob die Antwort richtig oder falsch war (konkrete Gestaltung ist UX-Thema, nicht Requirements-Thema). Kein akustisches Feedback (Sound-Effekte) in dieser Phase — rein visuelles Feedback, siehe "Explizit außerhalb des Scopes".
7. **Rundenlänge:** 10 Fragen pro Quiz-Durchlauf als Standard (fest, aber technisch leicht anpassbar).

## Datenbasis (Tierdatenbank)

- **Quelle:** Wikidata (nicht Wikipedia-Artikeltext), da CC0-lizenziert und ohne Attributionspflicht — relevant im Hinblick auf eine mögliche spätere Veröffentlichung der App. Diese Entscheidung ist bereits mit dem Nutzer geklärt und bindend.
- **Umfang:** Zielgröße ca. 500 Tiere.
- **Bilder:** Für die Kern-Tierdatenbank weiterhin **ausgeschlossen** — es werden keine Bild-**Dateien** bezogen, gespeichert oder lokal mitausgeliefert. Fragen und Antworten basieren ausschließlich auf Textdaten/Fakten aus Wikidata. **Ausnahme (Issue #16, 14.08.2026):** Für die optionale Bild-Rateshilfe wird pro Tier zusätzlich lediglich der **Commons-Dateiname** (reiner Text, aus Wikidata-Property P18) bereits bei der Datenbeschaffung mit abgelegt (`image_filename`, optional) — das eigentliche Bild selbst wird weiterhin nicht bezogen oder gespeichert, sondern erst live von Wikimedia Commons als Thumbnail nachgeladen, wenn das Kind es aktiv anfordert (siehe nicht-funktionale Anforderung 1 und `architecture.md`).
- **Konkretes Datenschema** (welche Attribute pro Tier, Struktur, Format) ist Aufgabe von `software-architect` und wird dort spezifiziert, nicht in diesem Dokument.
- **Korrektur aus realer Datenbeschaffung (Issue #2):** Das Feld **"Farbe" ist als Basisfeld gestrichen** — die reale Wikidata-Abdeckung liegt bei 0% über 1.480 hydrierte Tier-Datensätze, es gibt also faktisch keine strukturierten Farbdaten zum Abfragen. Mit dem Nutzer abgestimmt und entschieden. Auch die übrigen optionalen Felder (Lebensraum, Kontinent, Gewicht u. a.) sind unterschiedlich häufig befüllt (z. B. Lebensraum ~4,9%, Kontinent ~6,3%, Gewicht ~14,4%) — nur `id`, `name_de` und `category` sind pro Tier verpflichtend. Die tatsächlich stellbare Fragevielfalt variiert dadurch von Tier zu Tier; Details siehe `architecture.md`.

## Nicht-funktionale Anforderungen

1. **Lokale Lauffähigkeit ohne Internetzwang für die Kernfunktion:** Die App muss lokal auf dem Rechner des Nutzers laufen können, ohne dass für die Kernfunktion (Quiz spielen) eine Internetverbindung zur Laufzeit erforderlich ist. Die Tierdatenbank wird vorab (offline) aus Wikidata bezogen/aufbereitet und lokal mit der App ausgeliefert — nicht zur Laufzeit live abgefragt. **Ausnahme, Ergänzung 14.08.2026 (Issue #16):** Die optionale Bild-Rateshilfe (ein Button, mit dem das Kind während einer aktiven Frage freiwillig ein Foto des gesuchten Tieres aufdecken kann) ist von dieser Anforderung gezielt ausgenommen und darf eine Internetverbindung voraussetzen. Sie lädt das Bild live als Thumbnail von Wikimedia Commons nach, sobald das Kind den Button drückt — es wird kein Bild vorab bezogen oder lokal mitausgeliefert. Ohne Internetverbindung oder falls für ein Tier kein Bild ermittelbar ist, blendet sich der Button/die Funktion vollständig aus — kein Fehler, kein kaputter Platzhalter. Die eigentliche Kernfunktion (Quiz: Fragen, Antworten, Punktestand) bleibt davon unberührt zu 100 % offline lauffähig; die Ausnahme betrifft ausschließlich diesen einen optionalen Button — analog zur bereits bestehenden, ebenso gezielten Ausnahme aus Issue #14 (dort: lokale Verlaufsliste als bewusste Einzelausnahme vom Persistenz-Ausschluss, ohne die übrige Anforderung aufzuweichen).
2. **Später browserbasiert, auch auf iPad:** Die App soll technisch so gebaut werden, dass ein späterer Einsatz browserbasiert auf einem iPad möglich ist, ohne die Architektur grundlegend neu bauen zu müssen. Das ist aktuell **kein** unmittelbares Umsetzungsziel, sondern eine Anforderung an die technische Ausrichtung (z. B. Web-Technologien statt plattformspezifischer Nativ-Lösung).
3. **Kindgerechte Bedienbarkeit:** Da die Zielgruppe Kinder sind, sollte die Bedienung einfach und fehlertolerant sein. Konkrete Umsetzung ist Aufgabe von `ux-design`.
4. **Sprache:** Deutsch als alleinige Sprache für den aktuellen Scope (bestätigt). Mehrsprachigkeit ist kein aktuelles Ziel.

## Explizit außerhalb des Scopes

- **Weitere Spielmodi** (Tiergeräusche erkennen, Fehlerbild, Tier an Schatten erkennen, ggf. weitere) — sind Teil der langfristigen Vision, werden aber aktuell **nicht** spezifiziert, geplant oder umgesetzt. Sie werden hier nur als zukünftige Erweiterung vermerkt.
- **Bilder pro Tier** — weiterhin komplett ausgeschlossen als **fest gebündelter/lokal gespeicherter** Bestandteil der Kern-Tierdatenbank, unabhängig vom Spielmodus. **Ergänzung 14.08.2026 (Issue #16):** Eine gezielte, bewusste Ausnahme hiervon ist die optionale Bild-Rateshilfe im Quizmodus — ein Bild wird dort **nicht** gebündelt/gespeichert, sondern nur live von Wikimedia Commons als Thumbnail angezeigt, wenn das Kind es aktiv per Button abruft (siehe nicht-funktionale Anforderung 1, `architecture.md`). Der grundsätzliche Ausschluss von Bild-**Dateien** aus der Kerndatenbank bleibt davon unberührt.
- **Wikipedia-Artikeltext als Datenquelle** — bewusst nicht verwendet (Lizenzgründe, siehe Datenbasis).
- **Mehrbenutzer-/Online-Funktionen** (Accounts, Cloud-Sync, Vergleich mit anderen Spielern) — nicht Teil des aktuellen Scopes; aktueller Fokus ist lokale Einzelnutzung.
- **Native iPad-App** — falls iPad-Nutzung kommt, ist sie browserbasiert gedacht, nicht als native App.
- **Sound-Effekte** — rein visuelles Feedback in dieser Phase, akustisches Feedback ist eine mögliche spätere Ausbaustufe.
- **Mehrbenutzer-/geräteübergreifende Ergebnis-Persistenz** (Accounts, Cloud-Sync, Vergleich mit anderen Spielern) — weiterhin nicht Teil des Scopes. **Ergänzung 13.08.2026 (Issue #14):** Eine rein lokale, geräteinterne Verlaufsliste der letzten Versuche (`localStorage`, kein Konto, kein Abgleich zwischen Geräten) ist davon ausgenommen und als Nutzer-bestätigte Erweiterung gescoped — siehe Issue #14.
- **Mehr als zwei Schwierigkeitsstufen** — die zwei Stufen (6–10 / 10–12) decken den aktuellen Bedarf ab, keine feingranularere Staffelung geplant.

## Entscheidungen aus Klärungsrunde (13.08.2026)

Alle Punkte aus der ersten Runde offener Fragen wurden geklärt bzw. mit einem bewussten, leicht revidierbaren Default versehen:

| Thema | Entscheidung |
|---|---|
| Zielalter | Zwei Stufen: 6–10 und 10–12 Jahre, umschaltbar (siehe "Zielgruppe" und "Schwierigkeitsgrade") |
| Antwortoptionen | 4 pro Frage |
| Schwierigkeitsgrade | Ja, zwei Stufen — siehe oben |
| Rundenlänge | 10 Fragen (Standard) |
| Ergebnis-Persistenz | Nein, nur Ergebnis am Rundenende |
| Sprache | Deutsch, alleinige Sprache |
| Veröffentlichung | Noch unklar — Option wird offengehalten (CC0-Datenbasis bleibt dadurch bindend), aber kein zusätzlicher Aufwand für Veröffentlichungs-Vorbereitung (Impressum etc.) in dieser Phase. **Korrektur 14.08.2026 (Issue #16):** Die vorherige Zwischenentscheidung "Option B" (volles lokales Bundling aller Tierbilder ohne Attribution, nur für private Nutzung tragbar) wurde nach vertiefter Evaluation **verworfen und durch Option D′ ersetzt**: Die Bild-Rateshilfe lädt Bilder live als Thumbnail von Wikimedia Commons nach und zeigt Autor/Lizenz/Quelle live pro Bild an, statt Bilddateien lokal zu bündeln (siehe nicht-funktionale Anforderung 1 sowie `architecture.md`, Abschnitt "Bild-Rateshilfe"). Da damit Attribution bereits jetzt und unabhängig vom Veröffentlichungsstatus korrekt live angezeigt wird, entfällt die zuvor in Issue #17 festgehaltene Bedingung ("eigene Attributionslösung vor Veröffentlichung nötig") faktisch — Issue #17 wurde entsprechend geschlossen. |
| Tierauswahl (500) | Automatisch nach Popularität/Bekanntheit (Wikidata-Sitelinks), siehe `architecture.md` |
| Sound-Effekte | Nein, rein visuelles Feedback zunächst |
| Weiter-Mechanik nach Feedback | Manueller "Weiter"-Button (mehr Kontrolle fürs Kind), siehe `design.md` |

## Korrektur (13.08.2026)

Im Zuge der realen Datenbeschaffung für Issue #2 (Wikidata) wurde festgestellt, dass die reale Feldabdeckung deutlich von der ursprünglichen Annahme abweicht (kein Testartefakt, gemessen an 1.480 hydrierten Tier-Datensätzen). Daraufhin wurde mit dem Nutzer abgestimmt: **"Farbe" entfällt als Basisfeld** (0% Abdeckung), und die Pflichtfelder wurden auf `id`, `name_de`, `category` reduziert — die übrigen Felder bleiben optional mit variierender Abdeckung je Tier. Details siehe "Datenbasis (Tierdatenbank)" oben sowie `architecture.md`.
