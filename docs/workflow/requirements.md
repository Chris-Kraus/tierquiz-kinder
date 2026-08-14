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

## Bewertung vorgeschlagener Content-Erweiterungen (14.08.2026, `business-analyst` + `zoologe` + `software-architect`)

Der Nutzer hat zwei Content-Erweiterungen für den bestehenden Spielmodus "Quizfragen" zur Bewertung vorgeschlagen. **Dies ist eine reine Machbarkeits-/Sinnhaftigkeits-Bewertung — es wurden bewusst noch KEINE GitHub-Issues angelegt und keine Implementierung vorgenommen.** Beide Empfehlungen warten auf Rücksprache mit dem Nutzer, bevor sie als Stories gescoped werden. Technische Details siehe `architecture.md`, Abschnitt "Technische Einschätzung: Zwei vorgeschlagene Content-Erweiterungen".

### Idee 1: Fragen zur Fell-/Federn-Farbe

**Vorschlag:** Ein neues, spezifischeres Feld als das in Issue #2 komplett gestrichene generische `color`-Feld (0 % Wikidata-Abdeckung) — diesmal manuell durch `zoologe` kuratiert (analog zu `diet`/`lifespan_years`, Issues #18/#19), nur für Tiere mit Fell oder Federn relevant.

**Empfehlung: grundsätzlich sinnvoll, aber mit zwei offenen Punkten vor Story-Zuschnitt.**

- **Datenbasis real geprüft:** 434 von 500 Tieren (215 Säugetiere + 219 Vögel, 86,8 %) haben Fell/Federn und kämen für Kuration infrage; die übrigen 66 (Fisch, Insekt, Reptil, Amphibie, Spinnentier) bleiben planmäßig ohne Wert — kein Datenproblem, sondern schlicht nicht anwendbar (siehe `architecture.md` für die technische Einordnung, warum das *keine* Sonderbehandlung im Schema braucht).
- **Fachliche Einschränkung (`zoologe`):** Fell-/Federnfarbe ist bei vielen Säugetieren wenig eindeutig (Braun-/Grautöne dominieren, saisonale/geschlechtliche Variation, keine sauber eingrenzbare Einzelfarbe bei vielen Arten) — anders als `diet` (3 klare Werte) oder `lifespan_years` (eine Zahl) ist hier mehr Vereinfachung/Interpretation nötig, und die Falschantworten-Vielfalt könnte in der Praxis stark auf Braun/Grau/Schwarz konzentriert sein. Empfehlung: Aufwand ist vertretbar (vergleichbar mit `diet`/`lifespan_years`, eher am oberen Ende wegen der nötigen Vereinfachungsentscheidungen), aber die Kuration sollte ein handhabbares, nicht zu feines Enum verwenden (grobe Farbklassen statt exakter Naturton-Beschreibung).
- **Offene Frage 1 (Nutzer/`business-analyst`):** Sollte Fell-/Federnfarbe der **einfachen** Stufe (6–10, intuitiv/visuell) oder der **anspruchsvollen** Stufe (10–12) zugeordnet werden? Die bestehende Formulierung in diesem Dokument ("Kategorie, Lebensraum, Kontinent — *nicht* Farbe") war ursprünglich rein datengetrieben (Farbe existierte schlicht nicht im Schema), keine pädagogische Entscheidung. Farbe ist inhaltlich eher ein intuitiver/visueller Fragetyp und würde konzeptionell eher zur einfachen Stufe passen als zu Gewicht/Länge/Lebenserwartung — das ist aber eine Entscheidung, die der Nutzer/PM treffen sollte, kein Automatismus.
- **Offene Frage 2:** Konkreter Enum-Wertebereich (Vorschlag `software-architect`, siehe `architecture.md`) sollte vor Kurationsstart mit `zoologe` final abgestimmt werden.
- **Aufwandseinschätzung:** Mittel — zwei Stories: (a) kleine Code-Story (`software-architect`/`web-developer`, neues Schema-Feld + `FIELD_DEFINITIONS`-Eintrag + Zuordnung zu einer Schwierigkeitsstufe, geringes Risiko, folgt bewährtem Muster), (b) Kurations-Story (`zoologe`, ~434 Tiere, ähnliche Größenordnung wie `diet`/`lifespan_years`, die inzwischen beide bei 100 % Abdeckung stehen).

### Idee 2: "Besonderheiten des Tieres"

**Vorschlag:** Zusätzliche Zoologe-Infos, die ergänzend zum bestehenden Infosatz (Issue #12) angezeigt werden.

**Prüfergebnis: Kein eigenständiges drittes Konzept — inhaltlich identisch zum bereits geplanten `fun_fact`-Feld** (Schema-Feld seit Issue #2 vorgesehen, UX-Spezifikation seit der Anreicherungs-Runde am 13.08.2026 fertig, siehe `design.md`, Abschnitt "Fun Fact im Feedback-Schritt": ein zusätzlicher, visuell abgesetzter Block unterhalb des Richtig/Falsch-Feedbacks, der den Infosatz ergänzt statt ihn zu ersetzen). "Besonderheiten" beschreibt denselben Anwendungsfall wie "Fun Fact", nur mit leicht anderem Tonfall (eher "bemerkenswertes Merkmal" als "witziger Fakt") — das ist eine Content-Ton-Frage für `zoologe`, keine neue Datenstruktur oder UI.

**Wichtiger Befund, der die Aufwandseinschätzung ändert:** Anders als ursprünglich angenommen ("nur Daten fehlen, wie bei `diet`/`lifespan_years`") ist die Anzeige-Logik für `fun_fact` **im Code noch nicht gebaut** — anders als beim Wikipedia-Link (Issue #15), der bereits vollständig in `src/screens/question.js` verdrahtet ist, kommt `fun_fact` dort aktuell nur in einem Testfixture vor, nicht im tatsächlichen Frage-/Feedback-Bildschirm. Es braucht also **zwei** Stories, nicht nur eine Kurations-Story:

1. **Kleine Implementierungs-Story** (`web-developer`): Den bereits fertigen UX-Entwurf aus `design.md` umsetzen (Block unterhalb des Feedbacks, kein Platzhalter bei fehlendem Wert, kein Layout-Sprung) — vom Zuschnitt und Risiko vergleichbar mit Issue #15 (Wikipedia-Link).
2. **Kurations-Story** (`zoologe`): Kurze, kindgerechte, fachlich korrekte Sätze für die 500 Tiere formulieren.

**Aufwandseinschätzung `zoologe`:** Deutlich höher pro Tier als bei `diet`/`lifespan_years` — dort war jeweils ein einzelner kategorialer/numerischer Wert aus Fachwissen zu bestimmen, hier ist freies, individuelles Formulieren eines fachlich korrekten UND für Kinder spannenden Satzes pro Tier nötig (siehe `zoologe`-Skill, "keine erfundenen/falschen Fakten"). Empfehlung: **phasenweise Kuration** statt "alle 500 auf einmal" — das UX-Design ist bereits explizit für Teilbefüllung ausgelegt (kein sichtbarer Unterschied, wenn `fun_fact` bei einem Tier fehlt), es gibt also keinen technischen Zwang zur Vollständigkeit vor dem Launch. Sinnvoller erster Umfang: eine überschaubare erste Tranche bekannter/quiz-interessanter Tiere (Größenordnung ähnlich der Verwechslungspaare-Mindestmenge, siehe Issue #21), mit Erweiterung in Folge-Stories.

### Nächster Schritt

Beide Empfehlungen sind **Vorschläge, keine Entscheidungen**. Vor Anlage von GitHub-Issues sollte der Nutzer insbesondere zu Idee 1 die Schwierigkeitsstufen-Zuordnung sowie den Enum-Zuschnitt bestätigen; für Idee 2 sollte der Nutzer bestätigen, dass "Besonderheiten" = `fun_fact` (ggf. mit angepasstem Tonfall) korrekt verstanden wurde, und den Umfang der ersten Kurations-Tranche absegnen.

## Bewertung dreier neuer Spielmodi (14.08.2026, `business-analyst` + `zoologe` + `ux-design` + `software-architect`)

Der Nutzer hat drei konkrete neue Spielmodi vorgeschlagen und um eine gemeinsame Sinnhaftigkeits-/Machbarkeitsbewertung gebeten, **bevor** irgendetwas umgesetzt wird. **Dies ist erneut eine reine Bewertung — es wurden bewusst noch KEINE GitHub-Issues angelegt und keine Implementierung vorgenommen.** Die bisherige Einordnung dieser drei Ideen als vage "langfristige Vision" (siehe "Explizit außerhalb des Scopes" oben) wird durch diese Bewertung konkretisiert, aber noch nicht in tatsächliche Stories überführt — das folgt erst nach Rückmeldung des Nutzers zu Priorisierung und den unten genannten offenen Fragen. Technische Details/Zahlen siehe `architecture.md`, Abschnitt "Technische Einschätzung: Drei vorgeschlagene neue Spielmodi"; UX-Skizze siehe `design.md`, Abschnitt "Modus-Auswahl auf dem Start-Bildschirm (Skizze)".

### Idee 1: Umkehr-Quiz ("Wer bin ich?" — Bild statt Name, Tier erraten)

**Einschätzung: sinnvoll und mit vergleichsweise geringem technischem Zusatzaufwand machbar — aber mit einer echten, vom Nutzer zu treffenden Grundsatzentscheidung zur Online-Abhängigkeit.**

- **Datenlage sehr gut:** Der bereits für Issue #16 etablierte Mechanismus (`image_filename`-Feld, live nachgeladenes Commons-Thumbnail) deckt real gemessen **100 % der 500 ausgewählten Tiere** ab (siehe `architecture.md`, Abschnitt G) — für diesen Modus praktisch der komplette Tierpool nutzbar, kein Datenlücken-Problem wie bei den anderen beiden Ideen.
- **Entscheidender Unterschied zu Issue #16:** Dort war das Bild ein *optionaler* Zusatz-Button innerhalb der ansonsten zu 100 % offline spielbaren Kernfunktion. Hier ist das Bild der **zentrale Bestandteil jeder einzelnen Frage** dieses Modus — ohne Internetverbindung ist der gesamte Modus nicht spielbar, nicht nur eine Zusatzfunktion. Das ist eine deutlich größere Ausweitung der bestehenden NFR-1-Ausnahme (bisher: ein optionaler Button; hier: ein kompletter, sonst nicht spielbarer Spielmodus) und sollte vom Nutzer bewusst als solche bestätigt werden, nicht einfach als Fortführung des Issue-#16-Präzedenzfalls durchgewunken werden.
- **Empfehlung:** Grundsätzlich sinnvoll und lohnend, sofern der Nutzer die Online-Abhängigkeit dieses gesamten Modus explizit akzeptiert (analog zur bereits getroffenen NFR-1-Ausnahme für den Bild-Button, aber bewusst als eigene, größere Ausnahme dokumentiert). Attribution (Autor/Lizenz) muss dabei bei **jeder** Frage sichtbar sein, nicht nur gelegentlich bei einem optionalen Klick — siehe `design.md` für die UX-Einordnung dieses Unterschieds.
- **Priorität: 1 (höchste von den dreien)** — beste Datenabdeckung, geringstes technisches Neuland, bewährter Mechanismus.

### Idee 2: Fehlerbild (zwei Bilder, 5 Unterschiede anklicken)

**Einschätzung: fachlich/pädagogisch reizvoll, aber mit Abstand am aufwändigsten — grundlegend anderer Beschaffungsansatz als der Rest des Projekts.**

- **Kernproblem:** Anders als alle bisherigen Inhalte (Fakten aus Wikidata, Bilder/Töne live von Commons) gibt es fertige "Original + bearbeitete Version mit 5 eingefügten Unterschieden"-Bildpaare **nirgends als vorhandene Daten** auf Wikidata/Commons. Das ist kein Abdeckungsproblem, das durch Kuration oder eine bessere Wikidata-Query lösbar wäre, sondern erfordert eine **eigene Bildproduktion** pro Tierpaar — ein komplett anderer Aufwandstyp als alles, was das Projekt bisher gemacht hat.
- **Zusätzliches Risiko (rechtlich/inhaltlich):** Eine bearbeitete Version eines Commons-Fotos ist ein Bearbeitungswerk ("derivative work"). Bei den überwiegend CC-BY-SA-lizenzierten Commons-Bildern (siehe bereits gemessene 89,8 % attributionspflichtige Bilder, Issue #16) müsste eine solche bearbeitete Version unter derselben Lizenz weitergegeben werden ("Share-Alike") — eine neue rechtliche Fragestellung, die bislang nicht auftrat, weil die App bisher nie ein Bild verändert, sondern nur unverändert live angezeigt hat.
- **Realistischer Aufwand:** Deutlich größer als die bisher größte Kurationsaufgabe im Projekt (`fun_fact`, Freitext für 500 Tiere). Hier braucht es pro Tierpaar echte Bildbearbeitung (z. B. gezielt 5 plausible, kindgerecht erkennbare Unterschiede einfügen) plus strukturierte Koordinatendaten für die Klickflächen — eine Aufgabe, die eher in Richtung eines eigenen kleinen Content-Produktionsprozesses (Bildbearbeitungs-Tool/-Workflow, ggf. externe Unterstützung) geht als in Richtung "ein weiteres Datenfeld befüllen".
- **Empfehlung:** Nicht in der aktuellen Aufwands-/Team-Struktur (Wikidata-Pipeline + `zoologe`-Textkuration) sinnvoll umsetzbar. Falls gewünscht, empfiehlt sich ein kleiner, bewusst experimenteller Erstumfang (z. B. 5–10 handverlesene Paare) als eigenständige Machbarkeitsstudie, losgelöst vom übrigen 500-Tiere-Rhythmus des Projekts — keine Priorisierung im selben Zug wie die anderen beiden Ideen.
- **Priorität: 3 (niedrigste), empfohlen deutlich zurückstellen** — nicht "später sowieso", sondern bewusst als eigenständige, viel größere Initiative behandeln.

### Idee 3: Tiergeräusche ("Welches Tier ist das?" per Tierlaut)

**Einschätzung: technisch mit demselben bewährten Live-Abruf-Muster wie Idee 1 machbar, aber mit spürbar geringerer und stark schiefer Datenabdeckung — reale Stichprobe statt Schätzung.**

- **Reale Messung (Stichprobe n = 30 von 500 Tieren, Wikidata-Property P51 "audio", analog zur P18-Messung aus Issue #16):** **5 von 30 Tieren (16,7 %)** hatten eine hinterlegte Audioaufnahme. Aufschlüsselung nach Tiergruppe in der Stichprobe: **Vögel 4 von 7 (57 %)**, **Säugetiere 1 von 17 (5,9 %)**, **Fische 0 von 6 (0 %)**. Das deckt sich mit biologischer Plausibilität (Vogelgesang wird auf Commons/xeno-canto besonders häufig dokumentiert; die meisten Fische erzeugen keine für Menschen gut aufnehmbaren/dokumentierten Laute).
- **Hochrechnung auf alle 500 Tiere (vorsichtig, da Stichprobe pro Gruppe klein ist):** Reale Kategorienverteilung im Datensatz ist 215 Säugetiere / 219 Vögel / 39 Fische / 11 Insekten / 10 Reptilien / 5 Amphibien / 1 Spinnentier. Mit den gemessenen Gruppenraten grob hochgerechnet ergäben sich überschlägig **~125 Vögel + ~13 Säugetiere + ~0 Fische ≈ 140 von 500 Tieren (~28 %)** mit verfügbarem Ton — deutlich vogel-lastig, mit unbekanntem Beitrag der kleinen Restgruppen (Insekten/Reptilien/Amphibien/Spinnentiere, in der Stichprobe nicht vertreten). **Diese Hochrechnung ist eine grobe Richtungsangabe, keine belastbare Zahl** — vor einer endgültigen Entscheidung sollte, analog zur bereits etablierten Praxis (P18-Vollmessung für Issue #16), eine **vollständige P51-Messung über alle 500 Tiere** erfolgen statt der Stichprobe.
- **Lizenzlage identisch zum Bild-Fall:** Von den 5 gefundenen Audiodateien waren 4 CC-BY-SA (attributionspflichtig) und 1 Public Domain — nahezu deckungsgleich mit der bereits für Bilder gemessenen Verteilung (10,2 % CC0/PD, Rest attributionspflichtig). Der bereits für Bilder etablierte Lösungsansatz (live Attribution anzeigen statt lokal bündeln) ist direkt auf Ton übertragbar.
- **Konsequenz für Spielbarkeit:** Ein Pool von grob geschätzt ~140 statt 500 Tieren ist für einen eigenständigen Spielmodus noch komfortabel groß genug (Größenordnung vergleichbar mit anderen bereits erfolgreich mit Teilabdeckung betriebenen Fragetypen wie `weight_kg`, 42 % Abdeckung), aber deutlich vogellastig — Kinder würden in diesem Modus überproportional Vogelstimmen hören, was die Themenvielfalt gegenüber dem Hauptmodus einschränkt. Kein Blocker, aber ein Content-Diversitäts-Punkt, den `zoologe` im Blick behalten sollte, falls dieser Modus umgesetzt wird.
- **Priorität: 2 (mittel)** — technisch dem Umkehr-Quiz sehr ähnlich (gleiches Live-Abruf-/Attributions-Muster, gleiche Online-Abhängigkeits-Frage), aber durch die geringere und schiefe Abdeckung inhaltlich weniger rund; sollte nach Idee 1 und erst nach einer vollständigen P51-Messung über alle 500 Tiere final gescoped werden.

### Priorisierung (Empfehlung an den Nutzer)

**1. Umkehr-Quiz → 2. Tiergeräusche → 3. Fehlerbild (deutlich zurückgestellt).** Begründung: Umkehr-Quiz hat die beste Datenlage (100 %) und den geringsten technischen Neuheitsgrad (bewährter Mechanismus aus Issue #16). Tiergeräusche ist technisch sehr ähnlich, aber mit spürbar kleinerer, vogellastiger Datenbasis und sollte erst nach einer vollständigen P51-Messung final bewertet werden. Fehlerbild braucht einen komplett anderen, deutlich aufwändigeren Beschaffungsansatz (eigene Bildproduktion statt vorhandener Wikidata-/Commons-Fakten) und sollte nicht im selben Zug wie die anderen beiden geplant werden.

### Offene Fragen an den Nutzer vor Story-Zuschnitt

1. **Grundsatzfrage Online-Abhängigkeit (Idee 1 und 2 betreffend):** Ist es akzeptabel, dass ein kompletter neuer Spielmodus (nicht nur ein optionaler Button) ohne Internetverbindung gar nicht spielbar ist? Das ist eine bewusste Erweiterung der bisherigen NFR-1-Ausnahme aus Issue #16 und sollte explizit bestätigt werden, bevor Stories geschnitten werden.
2. **Vollmessung Tiergeräusche:** Soll vor einer finalen Entscheidung zu Idee 3 eine vollständige P51-Messung über alle 500 Tiere erfolgen (analog zur P18-Messung aus Issue #16), um die Hochrechnung aus der 30er-Stichprobe zu verifizieren?
3. **Fehlerbild — überhaupt weiterverfolgen?** Angesichts des grundlegend anderen Aufwandstyps: Soll diese Idee als eigenständige, kleine Machbarkeitsstudie (5–10 Paare) getrennt vom übrigen Projektrhythmus verfolgt werden, oder vorerst komplett zurückgestellt bleiben?
4. **Branch-Strategie:** Siehe `architecture.md`, Abschnitt "Branch-Strategie für neue Spielmodi" — Empfehlung dort: eigener Feature-Branch je neuem Spielmodus, Merge erst wenn der Modus Ende-zu-Ende spielbar ist.

## Korrektur (13.08.2026)

Im Zuge der realen Datenbeschaffung für Issue #2 (Wikidata) wurde festgestellt, dass die reale Feldabdeckung deutlich von der ursprünglichen Annahme abweicht (kein Testartefakt, gemessen an 1.480 hydrierten Tier-Datensätzen). Daraufhin wurde mit dem Nutzer abgestimmt: **"Farbe" entfällt als Basisfeld** (0% Abdeckung), und die Pflichtfelder wurden auf `id`, `name_de`, `category` reduziert — die übrigen Felder bleiben optional mit variierender Abdeckung je Tier. Details siehe "Datenbasis (Tierdatenbank)" oben sowie `architecture.md`.
