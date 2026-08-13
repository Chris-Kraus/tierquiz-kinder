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
5. **Schwierigkeitsgrade:** Es gibt **zwei umschaltbare Schwierigkeitsstufen**, gekoppelt an Altersgruppen: **6–10 Jahre** (einfacher — Fragen zu intuitiven/visuellen Fakten wie Kategorie, Lebensraum, Kontinent, Farbe) und **10–12 Jahre** (anspruchsvoller — zusätzlich Fragen zu spezifischeren/numerischen Fakten wie Gewicht, Länge, Lebenserwartung, Ernährung, ggf. Gefährdungsstatus, sowie näher beieinanderliegende, schwerer unterscheidbare Falschantworten). Die Stufe wird am Start-Bildschirm gewählt, nicht automatisch erkannt, und ist jederzeit wechselbar. Details zur Feld-Zuordnung siehe `architecture.md`.
6. **Feedback pro Frage:** Es wird erwartet, dass das Kind nach Beantwortung einer Frage erkennt, ob die Antwort richtig oder falsch war (konkrete Gestaltung ist UX-Thema, nicht Requirements-Thema). Kein akustisches Feedback (Sound-Effekte) in dieser Phase — rein visuelles Feedback, siehe "Explizit außerhalb des Scopes".
7. **Rundenlänge:** 10 Fragen pro Quiz-Durchlauf als Standard (fest, aber technisch leicht anpassbar).

## Datenbasis (Tierdatenbank)

- **Quelle:** Wikidata (nicht Wikipedia-Artikeltext), da CC0-lizenziert und ohne Attributionspflicht — relevant im Hinblick auf eine mögliche spätere Veröffentlichung der App. Diese Entscheidung ist bereits mit dem Nutzer geklärt und bindend.
- **Umfang:** Zielgröße ca. 500 Tiere.
- **Bilder:** In dieser Phase explizit **ausgeschlossen** — keine Tierbilder werden bezogen, gespeichert oder angezeigt. Fragen und Antworten basieren ausschließlich auf Textdaten/Fakten aus Wikidata.
- **Konkretes Datenschema** (welche Attribute pro Tier, Struktur, Format) ist Aufgabe von `software-architect` und wird dort spezifiziert, nicht in diesem Dokument.

## Nicht-funktionale Anforderungen

1. **Lokale Lauffähigkeit ohne Internetzwang für die Kernfunktion:** Die App muss lokal auf dem Rechner des Nutzers laufen können, ohne dass für die Kernfunktion (Quiz spielen) eine Internetverbindung zur Laufzeit erforderlich ist. Die Tierdatenbank wird vorab (offline) aus Wikidata bezogen/aufbereitet und lokal mit der App ausgeliefert — nicht zur Laufzeit live abgefragt.
2. **Später browserbasiert, auch auf iPad:** Die App soll technisch so gebaut werden, dass ein späterer Einsatz browserbasiert auf einem iPad möglich ist, ohne die Architektur grundlegend neu bauen zu müssen. Das ist aktuell **kein** unmittelbares Umsetzungsziel, sondern eine Anforderung an die technische Ausrichtung (z. B. Web-Technologien statt plattformspezifischer Nativ-Lösung).
3. **Kindgerechte Bedienbarkeit:** Da die Zielgruppe Kinder sind, sollte die Bedienung einfach und fehlertolerant sein. Konkrete Umsetzung ist Aufgabe von `ux-design`.
4. **Sprache:** Deutsch als alleinige Sprache für den aktuellen Scope (bestätigt). Mehrsprachigkeit ist kein aktuelles Ziel.

## Explizit außerhalb des Scopes

- **Weitere Spielmodi** (Tiergeräusche erkennen, Fehlerbild, Tier an Schatten erkennen, ggf. weitere) — sind Teil der langfristigen Vision, werden aber aktuell **nicht** spezifiziert, geplant oder umgesetzt. Sie werden hier nur als zukünftige Erweiterung vermerkt.
- **Bilder pro Tier** — in dieser Phase komplett ausgeschlossen (weder Beschaffung noch Anzeige), unabhängig vom Spielmodus.
- **Wikipedia-Artikeltext als Datenquelle** — bewusst nicht verwendet (Lizenzgründe, siehe Datenbasis).
- **Mehrbenutzer-/Online-Funktionen** (Accounts, Cloud-Sync, Vergleich mit anderen Spielern) — nicht Teil des aktuellen Scopes; aktueller Fokus ist lokale Einzelnutzung.
- **Native iPad-App** — falls iPad-Nutzung kommt, ist sie browserbasiert gedacht, nicht als native App.
- **Sound-Effekte** — rein visuelles Feedback in dieser Phase, akustisches Feedback ist eine mögliche spätere Ausbaustufe.
- **Ergebnis-Persistenz über Sitzungen hinweg** (Highscore, Verlauf) — nicht Teil des aktuellen Scopes, nur ein Ergebnis am Ende der jeweiligen Runde.
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
| Veröffentlichung | Noch unklar — Option wird offengehalten (CC0-Datenbasis bleibt dadurch bindend), aber kein zusätzlicher Aufwand für Veröffentlichungs-Vorbereitung (Impressum etc.) in dieser Phase |
| Tierauswahl (500) | Automatisch nach Popularität/Bekanntheit (Wikidata-Sitelinks), siehe `architecture.md` |
| Sound-Effekte | Nein, rein visuelles Feedback zunächst |
| Weiter-Mechanik nach Feedback | Manueller "Weiter"-Button (mehr Kontrolle fürs Kind), siehe `design.md` |
