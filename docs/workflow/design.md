# UX-Design: Tierquiz für Kinder

Dieses Dokument ist ein lebendes Dokument der Rolle `ux-design`. Es wird bei neuen Erkenntnissen ergänzt, nicht überschrieben.

## Scope dieses Dokuments

Aktueller Fokus ausschließlich: **Spielmodus "Quizfragen" (Multiple-Choice-Trivia)** mit Tierdaten aus Wikidata (Gewicht, Lebensraum, Farbe, ggf. weitere Felder — final durch `software-architect`). Bild-**Dateien** sind weiterhin nicht Teil der Kern-Tierdatenbank (kein Bundling). **Ausnahme (Issue #16, 14.08.2026):** Die optionale Bild-Rateshilfe zeigt live von Wikimedia Commons nachgeladene Bilder an, siehe eigener Abschnitt "Bild-Rateshilfe" weiter unten. Weitere Spielmodi (Tiergeräusche, Fehlerbild, Schattenrätsel) werden hier bewusst nicht mitgestaltet, sollten aber layoutseitig nicht blockiert werden (z. B. Startbildschirm sollte spätere Modus-Auswahl ohne Redesign zulassen können).

## Zielgruppe (bestätigt)

Zwei umschaltbare Schwierigkeitsstufen, gekoppelt an Altersgruppen: **6–10 Jahre** (einfacher) und **10–12 Jahre** (anspruchsvoller). Die Stufe wird am Start-Bildschirm gewählt (siehe Nutzerfluss), nicht automatisch erkannt, und jederzeit wechselbar. Spielt zunächst am Rechner der Eltern, später ggf. auf einem iPad im Browser. Die folgenden Empfehlungen (Sprache, Klickflächengröße, Feedback-Ton, Komplexität) gelten für beide Stufen; Unterschiede zwischen den Stufen sind bei den jeweiligen Abschnitten vermerkt.

Konsequenzen aus dieser Altersannahme:
- Kinder in diesem Alter können bereits flüssig lesen, aber kurze Sätze und einfache Wörter sind sicherer als komplexe Formulierungen.
- Motorik/Touch: Finger sind kleiner als bei Erwachsenen, aber Zielgenauigkeit ist noch nicht voll ausgereift — großzügige Klickflächen und Abstände sind wichtig, um Fehltaps zu vermeiden.
- Frustrationstoleranz ist gering: falsche Antworten dürfen nie wie ein "Scheitern" wirken, sondern wie ein normaler Teil des Lernens/Spielens.
- Lesetempo variiert stark in dieser Altersspanne — keine Zeitdruck-Elemente (z. B. Countdown-Timer) im aktuellen Scope vorsehen, sofern nicht explizit gefordert.

## Nutzerfluss (Quizmodus)

```
Start-Bildschirm
   │  Auswahl Schwierigkeitsstufe (6–10 / 10–12 Jahre), z. B. zwei große Buttons
   │  (Kind tippt/klickt "Los geht's" bzw. "Spielen")
   ▼
Frage-Bildschirm (Frage 1 von 10)
   │  4 Antwortoptionen sichtbar, keine ist vorausgewählt
   ▼
Antwortauswahl (Tap/Klick auf eine Antwortfläche)
   ▼
Sofort-Feedback (richtig ODER falsch), Antwortflächen kurz gesperrt
   │  weitere Interaktion erst nach kurzer Anzeige-Pause bzw. Tap auf "Weiter"
   ▼
Nächste Frage (Frage 2 von N) ── wiederholt sich bis Frage N erreicht
   ▼
Ergebnis-/Abschluss-Bildschirm
   │  zeigt erreichte Punktzahl / Anzahl richtiger Antworten, durchweg positiv formuliert
   ▼
Optionen: "Nochmal spielen" oder "Zurück zum Start"
```

Details je Schritt:

1. **Start-Bildschirm**
   - Freundlicher Titel ("Tierquiz") plus Maskottchen-/Tier-Illustration (kein Foto nötig, da Bilder aktuell ausgeschlossen sind — ein einfaches, freundliches Grafikelement reicht).
   - **Schwierigkeitsstufen-Auswahl:** zwei große, klar unterscheidbare Buttons/Kacheln ("6–10 Jahre" / "10–12 Jahre" oder kindgerechtere Labels wie "Einfach" / "Knifflig"), bevor das Spiel startet. Auswahl gilt nur für den aktuellen Durchlauf, keine Speicherung über Sitzungen hinweg (siehe Requirements).
   - Ein großer, eindeutiger Start-Button (z. B. "Los geht's!" oder "Spielen") nach der Stufenauswahl. Sonst keine Ablenkung durch weitere Einstellungen/Menüs.
   - Perspektivisch (nicht jetzt umsetzen): Platz für spätere Modus-Auswahl vorsehen, damit der Startbildschirm nicht komplett neu gebaut werden muss, sobald weitere Spielmodi hinzukommen.

2. **Frage-Bildschirm**
   - Fortschrittsanzeige oben (z. B. "Frage 3 von 10" oder eine visuelle Fortschrittsleiste/Punktereihe) — gibt Kindern Orientierung, wie viel noch kommt.
   - Fragetext kurz, klar, kindgerecht formuliert, gut lesbar oben mittig platziert.
   - 4 Antwortmöglichkeiten als große Kacheln/Buttons, in einem 2×2-Raster (oder untereinander bei schmalen Bildschirmen) — nicht als schmale Textzeilen oder Radiobuttons.
   - Kein Zeitdruck-Element (kein sichtbarer Countdown) im aktuellen Scope.

3. **Antwortauswahl**
   - Tap/Klick auf eine Antwortkachel wählt sie sofort aus, keine zusätzliche "Bestätigen"-Aktion nötig (reduziert Klickschritte, wichtig für jüngere Kinder).
   - Nach Auswahl werden alle vier Kacheln kurz deaktiviert (verhindert Mehrfach-Tap/versehentliches Antippen einer zweiten Antwort während des Feedbacks).

4. **Feedback richtig/falsch**
   - **Richtig:** Positive, verstärkende Rückmeldung — freundliche Animation/Farbe (z. B. Grün-Ton, Häkchen, kleine "Hurra"-Animation oder Konfetti), kurzer ermutigender Text ("Super gemacht!", "Richtig!"). Rein visuell — kein Sound (siehe unten).
   - **Falsch:** Bewusst *nicht* entmutigend gestalten. Keine roten "X"/Fehler-Buzzer-Ästhetik, kein wertender Text wie "Falsch!" oder "Leider verloren". Stattdessen: neutral-freundlicher Ton ("Fast! Die richtige Antwort ist …" oder "Das war's leider nicht, aber schau mal …"), richtige Antwort wird hervorgehoben/eingeblendet, damit ein Lerneffekt entsteht. Farbe eher gedeckt/neutral statt aggressivem Rot (z. B. sanftes Orange/Gelb statt Signalrot).
   - **Kein Sound:** Feedback ist in dieser Phase rein visuell, keine akustischen Effekte (bewusste Entscheidung — hält den Scope klein und vermeidet Störung in Umgebungen wie einem Klassenzimmer). Mögliche spätere Ausbaustufe.
   - Nach dem Feedback: klarer "Weiter"-Button (groß, gut sichtbar), kein automatisches Weiterspringen — gibt dem Kind bewusst Kontrolle über das eigene Tempo.

5. **Nächste Frage**
   - Gleicher Bildschirmaufbau wie Schritt 2, Fortschrittsanzeige aktualisiert sich sichtbar (motivierender Effekt: "ich komme voran").

6. **Ergebnis-/Abschluss-Bildschirm**
   - Zeigt Gesamtergebnis (z. B. "Du hast 7 von 10 Fragen richtig beantwortet!") durchweg wertschätzend formuliert, unabhängig vom Ergebnis — kein Scheitern-Framing selbst bei niedriger Punktzahl (z. B. immer ein ermutigender Satz wie "Toll gemacht!" oder "Du wirst immer besser!").
   - Evtl. kleine visuelle Belohnung (Sterne, Abzeichen, Tier-Emoji-Reihe) als optionale Ausbaustufe, kein Zwang für den ersten Wurf.
   - Zwei klare Folgeaktionen: "Nochmal spielen" (primär, groß) und "Zurück zum Start" (sekundär).

## Layout-Empfehlungen

- **Antwortflächen:** große, klar abgegrenzte Kacheln statt Textlinks. Empfohlene Mindest-Tapfläche orientiert an gängigen Touch-Zielgrößen-Empfehlungen: mindestens ca. 44×44 px als absolutes Minimum (Apple HIG), für Kinder eher großzügiger anzusetzen (deutlich größer als bei Erwachsenen-UI), plus ausreichend Abstand zwischen den Kacheln, um Fehltaps auf dem iPad zu vermeiden.
- **Ein-Spalten- bzw. 2×2-Raster** für die vier Antworten, je nach Bildschirmbreite responsiv umschaltend (z. B. 2×2 auf Tablet/Desktop, untereinander gestapelt auf sehr schmalen Bildschirmen).
- **Wenig Text pro Bildschirm:** kurze Sätze, große Schrift, keine verschachtelten Menüs oder Textwüsten. Ein Gedanke pro Bildschirm.
- **Klar erkennbarer Fokus/Call-to-Action** je Bildschirm (ein dominanter Button), damit auch ungeübte Nutzer:innen sofort wissen, was als Nächstes zu tun ist.
- **Kein Scrollen bei der Kernaufgabe** (Frage + 4 Antworten sollten ohne Scrollen auf einen Blick passen, auch im Querformat auf dem iPad).
- **Touch-first:** keine reinen Hover-Zustände als einzige Information (z. B. Tooltips), da auf Touch-Geräten kein Hover existiert. Alle wichtigen Zustände (ausgewählt, richtig, falsch, deaktiviert) müssen auch ohne Hover sichtbar/verständlich sein.

## Interaktions- und Zustandsverhalten

| Zustand | Verhalten |
|---|---|
| Antwortkachel (Normal) | klickbar/antippbar, deutlich als interaktiv erkennbar (z. B. leichte Erhöhung/Schatten, klare Umrandung) |
| Antwortkachel (Hover, nur Desktop) | leichte visuelle Hervorhebung als Zusatz, nicht als einzige Information |
| Antwortkachel (Pressed/Active) | kurzes visuelles/haptisches Feedback beim Antippen (z. B. leichtes "Eindrücken"), bestätigt dem Kind, dass der Tap erkannt wurde |
| Antwortkachel (Ausgewählt, richtig) | grüner/positiver Zustand, restliche Kacheln gedimmt/deaktiviert |
| Antwortkachel (Ausgewählt, falsch) | neutral-freundlicher Hinweiszustand, richtige Antwort wird zusätzlich hervorgehoben |
| Antwortkacheln (nach Auswahl) | alle vier temporär deaktiviert bis "Weiter" |
| Ladezustand (z. B. Fragen werden geladen) | einfache, kindgerechte Ladeanimation statt technischer Spinner/Fehlermeldungen; falls Laden hängt, freundlicher Hinweistext statt technischer Fehlermeldung |
| Fehlerzustand (z. B. Daten nicht verfügbar) | kindgerechte, nicht beängstigende Formulierung (kein technisches Fehler-Jargon), mit einfachem Weg zurück zum Start |
| "Bild zeigen"-Button (Normal, Issue #16) | dezenter, sekundärer Button/Icon auf dem Frage-Bildschirm, deutlich kleiner/unauffälliger als die 4 Antwortkacheln, damit er nicht mit der Kernaufgabe konkurriert; nur sichtbar, wenn für das aktuelle Tier ein Bild ermittelbar ist |
| "Bild zeigen"-Button (Ladezustand) | kleiner, dezenter Indikator **im Button selbst** (z. B. Icon wird kurz durch einen einfachen Punkte-/Kreis-Loader ersetzt), Button währenddessen deaktiviert gegen Doppelklick — kein Vollbild-Spinner, keine Verzögerung der übrigen Frage-Interaktion |
| "Bild zeigen"-Button (kein Bild/Fehler) | Button bzw. Bildbereich blendet sich vollständig aus (kein Klick nötig, um das zu bemerken) — kein Fehlertext, kein kaputtes Bild-Icon, wirkt für das Kind nicht wie ein Defekt |
| Aufgedecktes Bild + Attributionszeile | Bild erscheint innerhalb eines festen, moderat großen Rahmens (kein Layout-Sprung, kein Scrollen), Attributionszeile direkt darunter dezent/klein, siehe Abschnitt "Bild-Rateshilfe" unten |

## Visuelle Grundlinie

- **Farbwelt:** freundlich, kindgerecht, aber nicht überreizt — z. B. warme, gesättigte aber nicht grelle Grundfarben (Blau/Grün/Gelb-Töne als Basis), Rot bewusst sparsam einsetzen (nur für seltene, nicht bedrohliche Akzente) und nicht als Symbol für "falsch" verwenden, um das Feedback nicht entmutigend wirken zu lassen. Positive Farbe (Grün) für "richtig" konsequent nutzen; für "falsch" ein neutraleres Orange/Gelb statt Signalrot.
- **Typografie:** große, gut lesbare, serifenlose Schrift (z. B. vergleichbar mit Schulschriften wie "Comic-Sans-artig" freundlich, aber gut lesbar — konkrete Font-Wahl liegt bei `web-developer`); klare Schriftgrößenhierarchie (Frage deutlich größer als Nebentexte); ausreichende Zeilenhöhe für junge Leser:innen.
- **Kontrast:** hoher Kontrast zwischen Text und Hintergrund, mindestens WCAG-AA-Niveau (Kontrastverhältnis ≥ 4,5:1 für Fließtext, ≥ 3:1 für große Schrift/UI-Elemente), damit auch bei ungünstigen Lichtverhältnissen (z. B. iPad im Freien) alles gut lesbar bleibt.
- **Abstände:** großzügig, luftig, keine gedrängten Layouts — passt zur Zielgruppe (Übersichtlichkeit senkt kognitive Last) und zur Touch-Bedienung (verhindert Fehltaps).
- **Illustration/Maskottchen:** ein wiederkehrendes freundliches Maskottchen (z. B. ein Tier-Charakter) kann Wiedererkennung und emotionale Bindung schaffen, ohne dass Fotos einzelner Tiere nötig sind (die sind ja aktuell explizit ausgeschlossen). Einfache, freundliche Illustrationsstile (flat design, runde Formen) statt realistischer/fotografischer Darstellung.

## Barrierefreiheit

- **Touch-Zielgrößen:** ausreichend groß und mit genug Abstand (siehe Layout-Empfehlungen), wichtig sowohl für motorisch noch ungeübte Kinder als auch generell für Touch-Bedienung auf dem iPad.
- **Kontrast:** siehe visuelle Grundlinie, WCAG-AA als Richtwert.
- **Tastaturbedienbarkeit:** auch wenn Hauptzielgerät Touch/Maus ist, sollte die Web-App grundsätzlich mit Tastatur bedienbar sein (Tab-Reihenfolge, sichtbarer Fokusring, Enter/Space zur Auswahl) — relevant für Nutzung am Rechner der Eltern und allgemeine Web-Standards.
- **Screenreader/Semantik:** Buttons als echte `<button>`-Elemente (nicht nur `<div>` mit Klick-Handler), aussagekräftige Labels/Alt-Texte, damit die App grundsätzlich mit Screenreadern nutzbar ist — auch wenn Barrierefreiheit für sehbehinderte Kinder kein explizit genannter Schwerpunkt war, ist dies eine Low-Cost-Empfehlung mit hohem Nutzen.
- **Keine ausschließlich farbbasierte Codierung:** "richtig"/"falsch" nicht nur über Farbe kommunizieren, sondern zusätzlich über Symbol (Haken/Hinweis-Icon) und Text, damit auch farbfehlsichtige Kinder das Feedback eindeutig verstehen.
- **Bewegungsreduktion:** Animationen (z. B. Konfetti bei richtiger Antwort) sollten dezent gehalten und im Rahmen von `prefers-reduced-motion` reduzierbar sein.
- **Kein Zeitdruck:** siehe Nutzerfluss — keine Countdown-Timer im aktuellen Scope, um Stress zu vermeiden und Zugänglichkeit für unterschiedliche Lesetempi sicherzustellen.

## iPad-/Touch-Überlegungen (perspektivisch)

- Layout muss im Quer- und Hochformat funktionieren (iPad wird häufig quer gehalten) — Antwortraster sollte sich anpassen, ohne dass Inhalte abgeschnitten werden oder Scrollen nötig wird.
- Kein Hover-abhängiges UI (siehe oben).
- Ausreichend große Klickflächen und Abstände wie beschrieben, da Kinderfinger ungenauer treffen als Erwachsenenfinger bzw. ein Mauszeiger.
- Performance/Ladezeiten so gestalten, dass auch auf einem älteren/leihweise genutzten iPad die App flüssig bleibt (keine schweren Animationen als Blockierer) — technische Umsetzung liegt bei `web-developer`/`software-architect`, hier nur als UX-relevanter Hinweis vermerkt.

## Fun Fact im Feedback-Schritt (13.08.2026, Anreicherungs-Runde)

Anlass: `zoologe` kuratiert perspektivisch kurze Fun Facts (`fun_fact`-Feld, füllt sich nur schrittweise, viele Tiere bleiben vorerst leer). Empfehlung für die Einbindung im Feedback-Schritt (siehe "4. Feedback richtig/falsch" oben):

**Bestätigung 14.08.2026 (`business-analyst`-Entscheidung, siehe `requirements.md` "Bewertung vorgeschlagener Content-Erweiterungen"):** Die hier beschriebene Teilbefüllungs-Auslegung ist bewusst passend zur Entscheidung, `fun_fact` **nicht** vollständig vor Launch zu befüllen — die erste Kurations-Tranche umfasst 20 Tiere (Größenordnung analog zur Verwechslungspaare-Mindestmenge, Issue #21). Diese Design-Vorgabe (kein Layout-Sprung, kein Platzhalter bei fehlendem Wert) bleibt damit unverändert korrekt und muss für den kleinen Ersttranche-Umfang nicht angepasst werden.

- **Platzierung:** Fun Fact erscheint **unterhalb** des bestehenden Richtig/Falsch-Feedbacks, oberhalb des "Weiter"-Buttons — ergänzt das Feedback, ersetzt es nicht. Kein eigener Zwischenbildschirm, um den Ablauf nicht zusätzlich zu verlangsamen (Rundenlänge/Tempo ist laut Requirements bewusst schlicht gehalten).
- **Kein Fun Fact vorhanden:** Feedback-Bereich sieht exakt wie heute aus, keine leere Box/Platzhalter, kein "Kein Fun Fact verfügbar"-Hinweis — für das Kind darf nicht auffallen, dass hier "etwas fehlt". Layout darf sich also nicht abhängig vom Vorhandensein verschieben (fester Rahmen, der optional befüllt wird, oder Bereich komplett weggelassen).
- **Vorhanden:** Kurzer, visuell abgesetzter Block (z. B. eigenes Icon wie eine Glühbirne/ein Fragezeichen-Tier, dezente Hintergrundfarbe passend zur bestehenden Farbwelt), Einleitung kindgerecht framen ("Wusstest du schon?") statt trocken als Datenfeld zu präsentieren.
- **Beide Altersstufen:** Gleiche Darstellung für 6–10 und 10–12 — der Unterschied liegt im Textinhalt selbst (Aufgabe von `zoologe`: altersgerechte Formulierung), nicht in der UI-Behandlung.

**Klarstellung 14.08.2026 (Rückfrage aus Issue #24):** Der Infosatz-Block (Issue #12) wurde tatsächlich mit einem eigenen Überschrift-/Doppelpunkt-Format umgesetzt ("{name_de}: Ein/e {category}...", siehe `architecture.md` "Infosatz-Basisbaustein — Genus-Lücke"), **nicht** mit "Wusstest du schon?"/Glühbirne. Diese Formulierung + Icon sind damit in der Praxis das **alleinige, exklusive Erkennungsmerkmal des Fun-Fact-Blocks** — keine Überschneidung, keine Anpassung nötig. Die beiden Blöcke sind bereits ausreichend unterscheidbar (unterschiedliche Akzentfarbe: Infosatz blau-getönt, Fun Fact gelb/orange-getönt; unterschiedliches Icon: keins vs. Glühbirne 💡; unterschiedlicher Textstil: sachlicher Fakten-Satz vs. "Wusstest du schon?"-Einleitung). **Reihenfolge, falls beide vorhanden sind:** Infosatz zuerst (immer vorhanden, faktenbasiert), Fun Fact darunter (selten vorhanden, überraschender Bonus-Charakter) — passt zur Lesereihenfolge "erst Fakten, dann Extra-Highlight".
- **Barrierefreiheit:** Gleiche Kontrast-/Schriftgrößen-Vorgaben wie übriger Feedback-Text (siehe "Visuelle Grundlinie"/"Barrierefreiheit" oben), kein separates Regelwerk nötig.

## Verwechslungspaare-Fragetyp (Issue #21, 13.08.2026)

Neuer Fragetyp: zwei häufig verwechselte Tiere (z. B. Alpaka/Lama) werden gegenübergestellt, ein Merkmal wird genannt, das Kind ordnet es dem richtigen Tier zu ("Welches der beiden Tiere hat deutlich längere Ohren?").

- **Antwortoptionen:** bewusst nur **2 statt 4** Kacheln — kein Auffüllen mit zwei zusätzlichen, für diese Frage sinnlosen Distraktor-Tieren. Gleiche Kachel-Optik/-Größe wie bei den bestehenden 4er-Fragen (siehe "Layout-Empfehlungen" oben), nur als 1×2- statt 2×2-Raster, mittig auf dem Frage-Bildschirm. Kein Sonderlayout/eigener Screen nötig.
- **Frageformulierung:** Merkmalssatz steht wie gewohnt im Frage-Bereich oben, darunter die beiden Tiernamen als große Antwortkacheln — strukturell identisch zum bestehenden Frage-Bildschirm, nur mit reduzierter Optionsanzahl.
- **Feedback danach:** unverändert bestehender Richtig/Falsch-Mechanismus (siehe "4. Feedback richtig/falsch"), inkl. ggf. vorhandenem Fun Fact/Wikipedia-Link aus den anderen Anreicherungs-Stories — dieser Fragetyp ist rein bei der Antwortoptionen-Anzahl ein Sonderfall, sonst identisch zum bestehenden Ablauf.
- **Barrierefreiheit:** gleiche Anforderungen wie bestehende Antwortkacheln (Tastaturbedienbarkeit, Tab-Reihenfolge, Kontrast) — durch nur 2 statt 4 Optionen sogar einfacher zu bedienen.

## Bild-Rateshilfe (Issue #16, 14.08.2026, `ux-design` + `software-architect`)

Finale UX-Leitplanken für die optionale Bild-Rateshilfe (Option D′, siehe `docs/workflow/architecture.md`, Abschnitt "Bild-Rateshilfe (Issue #16): Finale technische Leitplanken"). Bild wird live von Wikimedia Commons als Thumbnail nachgeladen, sobald das Kind aktiv danach fragt — kein automatisch sichtbares Bild.

**Platzierung:** Ein kleiner, sekundärer Button (z. B. "🔍 Bild zeigen") auf dem Frage-Bildschirm, oberhalb der vier Antwortkacheln oder seitlich neben dem Fragetext platziert — deutlich zurückhaltender gestaltet als die Antwortkacheln selbst (kleinere Fläche, gedeckteres Farbschema), damit die eigentliche Aufgabe (Frage beantworten) klar im Vordergrund bleibt und das Bild nicht wie ein notwendiger Schritt wirkt. Der Button reserviert seinen Platz im Layout unabhängig davon, ob ein Bild letztlich verfügbar ist, **außer** wenn `image_filename` für das Tier fehlt — dann wird der Button gar nicht gerendert (kein Leerraum-Rätsel für das Kind, siehe Zustandstabelle oben).

**Verdeckt-/Aufdecken-Interaktion:**
- Vor dem Klick: kein Bild sichtbar, nur der Button. Kein Hover-Aufdecken (Touch-first, siehe bestehende Layout-Empfehlungen), Aufdecken ausschließlich per explizitem Klick/Tap.
- Beim Klick: Button geht kurz in einen Ladezustand (siehe Zustandstabelle) — dezent, im Button selbst, kein Vollbild-Ladeindikator. Laut Performance-Messung (`architecture.md`, Abschnitt F) dauert der reale Abruf meist deutlich unter 1,5 s, ein aufwendiger Ladebildschirm wäre unangemessen für diese kurze Wartezeit.
- Nach Erfolg: Bild erscheint innerhalb eines festen, moderat großen Rahmens (Richtwert: nicht größer als eine der vier Antwortkacheln zusammen, damit "Kein Scrollen bei der Kernaufgabe" weiterhin gilt), abgerundete Ecken passend zur bestehenden Kachel-Optik. Direkt darunter die Attributionszeile (siehe unten).
- Nach Fehlschlag (kein Netz, Timeout, keine verwertbare Commons-Antwort): Button/Bildbereich blendet sich weich aus, kein Fehlertext, kein rotes Warnsymbol — für das Kind soll es einfach so wirken, als gäbe es hier kein Bild.

**Attributionszeile — kindgerecht statt juristischer Disclaimer:**
- Kleine, dezente Textzeile direkt unter dem Bild, deutlich kleiner/leiser als der übrige UI-Text (z. B. Fußnoten-Schriftgröße, gedeckte/graue Farbe), damit sie nicht mit dem Quiz-Inhalt konkurriert, aber bei Bedarf lesbar bleibt.
- **Formulierung bewusst einfach halten**, kein Juristen-Ton: z. B. "Foto: {Artist} · Wikimedia Commons" statt "Lizenzhinweis: © {Artist}, veröffentlicht unter {LicenseShortName} ({LicenseUrl})". Lizenzname/-Link können als kleiner, unaufdringlicher Link angehängt werden (z. B. "(Lizenz)"), statt die volle Lizenzbezeichnung auszuschreiben — die Kinder selbst müssen das nicht lesen/verstehen, es reicht, dass es vorhanden und für Erwachsene auffindbar ist.
- Fehlt eines der Metadatenfelder (z. B. kein `Artist` in `extmetadata`), wird nur mit dem vorhandenen Rest angezeigt (z. B. nur "Wikimedia Commons"), keine "unbekannt"-Platzhalter, keine leere/kaputt wirkende Zeile.
- Gleiche Kontrast-/Lesbarkeits-Mindestanforderung wie übriger Text (siehe "Visuelle Grundlinie"), auch wenn die Schrift kleiner ist als der Haupttext.

**Reset:** Aufgedeckter Zustand (Bild + Attribution) wird bei jeder neuen Frage vollständig zurückgesetzt — nächste Frage startet wieder im verdeckten Ausgangszustand mit neuem, ggf. nicht sichtbarem Button.

**Barrierefreiheit:** Button als echtes `<button>`-Element, fokussierbar und per Tastatur (Enter/Space) auslösbar, konsistent mit bestehenden Anforderungen an Antwortkacheln. Bild braucht einen aussagekräftigen `alt`-Text (z. B. der Tiername). Ladezustand sollte für Screenreader nicht komplett stumm bleiben (z. B. `aria-busy`/`aria-live`-Hinweis reicht, kein aufwendiges Sonderkonzept nötig).

**Kein Einfluss auf Kernablauf:** Der Button ändert nichts an Antwortauswahl, Feedback-Mechanik oder Punktestand — rein optionale Zusatzinfo während der aktiven Frage, wie in den Akzeptanzkriterien von Issue #16 festgehalten.

## Bild-Rateshilfe: Automatische Anzeige nach der Antwort (Issue #30, 14.08.2026, `ux-design` + `software-architect`)

Neue, ergänzende UX-Leitplanken zusätzlich zum obigen Abschnitt "Bild-Rateshilfe (Issue #16)", der **unverändert bestehen bleibt** (Pre-Answer-Button, optional, manueller Klick). Neu: Zusätzlich wird das Bild **nach** Abgabe der Antwort automatisch — ohne Klick — als Teil des Feedback-Bereichs angezeigt, ergänzend zu Infosatz/Fun Fact/Wikipedia-Link.

**Platzierung/Reihenfolge im Feedback-Bereich:** Direkt **unterhalb** des Richtig/Falsch-Feedbacktexts, **oberhalb** des Infosatz-Blocks (inkl. eingebettetem Wikipedia-Link) und des Fun-Fact-Blocks:

```
Richtig/Falsch-Feedback
   ▼
Bild (neu, automatisch, Issue #30)
   ▼
Infosatz (inkl. Wikipedia-Link)
   ▼
Fun Fact (falls vorhanden)
   ▼
"Weiter"-Button
```

**Begründung der Reihenfolge:** Das Bild ist die unmittelbarste, am schnellsten erfassbare Ergänzung zur soeben aufgelösten richtigen Antwort ("So sieht das Tier aus") — passend direkt nach dem Feedbacktext, bevor die textbasierten Vertiefungen (Infosatz, Fun Fact) folgen. Passt zur bereits etablierten Lesereihenfolge "erst der unmittelbare Fakt, dann das Extra-Highlight" (siehe Fun-Fact-Reihenfolgebegründung oben).

**Visuelle Unterscheidung vom weiterhin bestehenden Pre-Answer-Button:** Kein Button, kein Lupe-Icon, kein "Bild zeigen"-Label, kein Klick-Ladezustand — das Bild poppt still ein, sobald es geladen ist (siehe `architecture.md`, "nicht-blockierend"). Gleiche Bildrahmen-Optik (fester, moderat großer Rahmen mit abgerundeten Ecken, passend zur Kachel-Optik) wie beim aufgedeckten Pre-Answer-Bild, aber ohne die Button-Chrome darüber — im Feedback-Bereich wirkt es als selbstverständlicher Bestandteil der Antwort-Auflösung, nicht als weitere interaktive Zusatzoption. Attributionszeile direkt darunter, identisches Format wie beim Pre-Answer-Bild ("Foto: {Artist} · Wikimedia Commons", optionaler kleiner "(Lizenz)"-Link).

**Verhalten bei bereits manuell aufgedecktem Bild:** Hat das Kind vor der Antwort bereits auf "Bild zeigen" getippt, ist das Bild zum Zeitpunkt des Feedbacks bereits oberhalb der Antwortkacheln sichtbar. In diesem Fall **erscheint der automatische Feedback-Bild-Block nicht zusätzlich** (siehe `architecture.md` für die technische Begründung) — eine zweite, identische Bildkopie auf demselben Bildschirm wäre für das Kind verwirrend ("warum ist das jetzt zweimal da?") statt hilfreich, und würde zudem unnötig Layout-Höhe kosten. Das bereits sichtbare Pre-Answer-Bild bleibt einfach stehen, kein zusätzlicher Effekt nötig.

**Kein Bild vorhanden/Fehlschlag:** Identisch zum bestehenden Fun-Fact-/Infosatz-Muster — der Block erscheint schlicht nicht, kein Platzhalter, kein Fehlertext, kein Layout-Sprung. Für das Kind darf nicht auffallen, dass hier etwas fehlt.

**Beide Altersstufen:** Gleiche Darstellung für 6–10 und 10–12 Jahre, kein Unterschied.

**Barrierefreiheit:** Bild-`alt`-Text mit Tiernamen (z. B. `alt="{name_de}"`) — anders als beim Umkehr-Quiz-Modus (#28) ist die richtige Antwort an dieser Stelle bereits bekannt, ein Alt-Text mit Klartext-Namen verrät hier nichts. Der Bildblock selbst muss Screenreadern nicht separat per `aria-live` angekündigt werden (kein Ladezustand, der aktiv kommuniziert werden müsste, da es keinen Button/keine Interaktion gibt) — es reicht, dass er als normales Bild mit `alt`-Text im DOM erscheint, sobald geladen. Gleiche Kontrast-/Lesbarkeits-Anforderungen wie übriger Feedback-Inhalt.

## Modus-Auswahl auf dem Start-Bildschirm (Skizze, 14.08.2026, `ux-design`)

Anlass: Der Nutzer hat drei neue Spielmodi vorgeschlagen (Umkehr-Quiz, Fehlerbild, Tiergeräusche — Bewertung siehe `requirements.md`/`architecture.md`). Der bestehende Start-Bildschirm (siehe "Nutzerfluss" oben) war bewusst schlank gehalten und hatte bereits einen Platzhalter-Hinweis ("Perspektivisch: Platz für spätere Modus-Auswahl vorsehen"). Diese Skizze konkretisiert das erstmals — **grobe Skizze, keine pixelgenaue Spezifikation**, da noch keiner der drei Modi final gescoped ist.

**Grundprinzip: Modus-Auswahl ergänzt die bestehende Schwierigkeitsstufen-Auswahl, ersetzt sie nicht.** Beide sind unabhängige, einfache Ein-Tap-Entscheidungen — kein Grund, daraus einen mehrstufigen Assistenten zu machen, solange die Gesamtzahl sichtbarer Elemente klein bleibt (siehe bestehender Grundsatz "Wenig Text pro Bildschirm", "Ein Gedanke pro Bildschirm").

**Vorschlag — ein Bildschirm, zwei klar getrennte Auswahl-Gruppen:**

```
┌─────────────────────────────────┐
│         🦁 Tierquiz              │
│                                   │
│  Was möchtest du spielen?        │
│  ┌───────────┐ ┌───────────┐    │
│  │ Quizfragen │ │ Wer bin   │    │
│  │  (Start)   │ │  ich? 🌐  │    │
│  └───────────┘ └───────────┘    │
│                                   │
│  Wie schwer?                     │
│  ┌───────────┐ ┌───────────┐    │
│  │  Einfach   │ │  Knifflig  │    │
│  └───────────┘ └───────────┘    │
│                                   │
│        [ Los geht's! ]           │
└─────────────────────────────────┘
```

- **Reihenfolge:** Modus-Auswahl **über** der Schwierigkeitsstufen-Auswahl, da sie die grundlegendere Entscheidung ist (was spiele ich) vor der feineren (wie schwer). Beide bleiben große, klar unterscheidbare Kacheln im bestehenden Stil (siehe "Layout-Empfehlungen" oben) — kein neues visuelles Vokabular, nur eine zweite Kachelreihe.
- **Vorbelegung:** "Quizfragen" (bestehender Modus) ist standardmäßig vorausgewählt/hervorgehoben, damit ein Kind, das einfach nur spielen will, ohne bewusste Zusatzentscheidung genau das bekommt, was es heute schon kennt. Nur bei explizitem Tap auf einen anderen Modus wechselt die Auswahl.
- **Kindgerechte Labels statt Fachbegriffe:** "Umkehr-Quiz" ist ein Projekt-interner Arbeitsname, kein kindgerechtes Label — Vorschlag "Wer bin ich?" (Bild zeigen, Namen erraten). "Tiergeräusche" kann als Label direkt stehen bleiben (bereits selbsterklärend für Kinder), ggf. mit einem kleinen Lautsprecher-Icon. Finaler Wortlaut sollte mit `zoologe`/Nutzer abgestimmt werden, wenn die Modi tatsächlich gebaut werden.
- **Online-Kennzeichnung bei online-abhängigen Modi:** Modi, die laut `architecture.md` zwingend eine Internetverbindung brauchen (Umkehr-Quiz, Tiergeräusche — siehe dortige NFR-1-Diskussion), bekommen ein kleines, dezentes Icon auf der Kachel (z. B. 🌐 oder ein WLAN-Symbol), **kein** Warntext/Ausrufezeichen — passend zum bestehenden Grundsatz, Fehlerzustände nie bedrohlich wirken zu lassen. Der bestehende Quizfragen-Modus bekommt kein Icon, da er ohne Einschränkung offline läuft.
- **Fehlerfall ohne Internet:** Tippt ein Kind auf einen online-abhängigen Modus ohne bestehende Verbindung, greift dasselbe kindgerechte, nicht-technische Fehlermuster wie beim bestehenden "Bild zeigen"-Button (siehe Zustandstabelle oben) — statt den Modus zu betreten und dort mitten in einer Frage zu scheitern, wird das idealerweise schon beim Versuch, den Modus zu starten, freundlich abgefangen (z. B. kurzer Hinweis "Dafür brauchst du Internet" plus automatischer Verbleib bei "Quizfragen"). Konkrete technische Umsetzung (Vorab-Check vs. Fehler beim ersten Frage-Laden) ist Aufgabe von `software-architect`/`web-developer`.
- **Skalierungsgrenze:** Dieser Ein-Bildschirm-Ansatz funktioniert gut für bis zu ca. 3–4 Modi nebeneinander (aktuell: Quizfragen + 2 realistisch verfolgte neue Modi, siehe Priorisierung in `requirements.md` — Fehlerbild vorerst zurückgestellt). Sollten deutlich mehr Modi hinzukommen, sollte die Modus-Auswahl in einen eigenen, vorgeschalteten Bildschirm ausgelagert werden (Schritt 0 vor der heutigen Schwierigkeitsauswahl) statt eine wachsende Kachel-Wand auf einem Bildschirm zu erzeugen — für den aktuell absehbaren Umfang (max. 3 Modi) ist das aber noch nicht nötig.
- **Barrierefreiheit:** Gleiche Anforderungen wie bestehende Auswahlkacheln (Tastaturbedienbarkeit, Tab-Reihenfolge, Kontrast, keine reine Farbcodierung) — das Online-Icon braucht zusätzlich einen Text-Alternativtext (z. B. `aria-label="Benötigt Internetverbindung"`), nicht nur ein Icon ohne Beschreibung.

**Finale Leitplanken (14.08.2026, `ux-design` + `software-architect`, Story-Freigabe #26):**

- **Label final bestätigt:** "Wer bin ich?" für den neuen Modus, "Quizfragen" bleibt unverändert für den bestehenden Modus (vorbelegt/hervorgehoben, siehe oben).
- **"Testabruf" beim Moduseinstieg ist kein separater Mechanismus:** Er ist identisch mit dem ersten Aufruf der neuen Fragegenerierungs-Funktion aus #27 (siehe `architecture.md`, Abschnitt "1. Umkehr-Quiz" → "Finale technische Leitplanken") für Frage 1 der Runde. Gelingt er, wechselt der Bildschirm direkt mit der bereits fertigen ersten Frage in den Modus — kein zusätzlicher Ladebildschirm nach dem Tap. Schlägt er (nach den intern 3 Versuchen aus #27) fehl, bleibt die Auswahl bei "Quizfragen", mit kurzem freundlichem Hinweis (z. B. "Dafür brauchst du gerade Internet 🌐" statt technischer Fehlermeldung).
- **Ladezustand während des Testabrufs:** Kleiner, dezenter Indikator direkt **in der "Wer bin ich?"-Kachel selbst** (gleiches Muster wie der bestehende "Bild zeigen"-Button-Ladezustand, siehe Zustandstabelle oben) — kein Vollbild-Spinner, keine Sperre der übrigen Start-Bildschirm-Bedienung währenddessen.

## Frage-/Feedback-Bildschirm "Wer bin ich?" (Issue #28, 14.08.2026, `ux-design` + `software-architect`)

Finale UX-Leitplanken für den neuen Frage-Bildschirm des Umkehr-Quiz-Modus. Wiederverwendet den bestehenden Frage-/Feedback-Mechanismus (Fortschrittsanzeige, 2×2-Antwortraster, Sofort-Feedback, manueller "Weiter"-Button, Punktestand — siehe "Nutzerfluss" oben) fast unverändert; neu ist nur, **was** im oberen Bereich des Bildschirms steht (Bild statt Fragetext) und die Pflicht-Attribution.

**Layout:**
- Fortschrittsanzeige oben, identisch zum bestehenden Modus (z. B. "Frage 3 von 10").
- Statt eines pro Frage wechselnden Fragetexts: eine kurze, feste Überschrift **"Wer bin ich?"** (immer gleich, da die eigentliche "Frage" das Bild selbst ist) — passt zur bestehenden Vorgabe "Ein Gedanke pro Bildschirm", kein zusätzlicher Text nötig.
- Darunter das aufgelöste Bild (330px-Thumbnail, nicht das Original) in einem festen, moderat großen Rahmen mit abgerundeten Ecken (gleiche Bildrahmen-Optik wie bei der bestehenden Bild-Rateshilfe, Issue #16) — hier aber als **primärer** Bildschirminhalt bewusst größer/zentraler positioniert als der dortige sekundäre Hint-Rahmen, jedoch weiterhin so bemessen, dass Bild + Attributionszeile + 4 Antwortkacheln ohne Scrollen auf einen Blick passen (siehe bestehende Vorgabe "Kein Scrollen bei der Kernaufgabe").
- Direkt unter dem Bild: die Attributionszeile (siehe unten).
- Darunter die 4 Namensoptionen im gewohnten 2×2-Kachel-Raster (gleiche Optik/Größe wie im bestehenden Modus).

**Attributionszeile — auf jeder Frage, gleiche Formulierung wie Issue #16:**
- Gleiches Format wie bei der bestehenden Bild-Rateshilfe ("Foto: {Artist} · Wikimedia Commons", optionaler kleiner "(Lizenz)"-Link, fehlende Metadatenfelder werden übersprungen statt "unbekannt" anzuzeigen) — kein neuer Formulierungsstil nötig, nur eine neue Platzierung (fest statt optional nach Klick).
- Da sie jetzt Pflichtbestandteil jeder Frage ist (nicht mehr Rand-Detail eines optionalen Buttons), bleibt sie trotzdem klein/dezent (Fußnoten-Schriftgröße, gedeckte Farbe) — sie soll informativ, aber nicht das visuell dominante Element sein; das Bild und die Antwortkacheln bleiben der Fokus.

**Ladezustand vor Frage-Anzeige (Zusammenspiel mit #27):**
- Da das Bild laut #27 **vor** Anzeige der Frage vorab aufgelöst wird, reserviert der Bildschirm den späteren Bildrahmen bereits während des Ladens (fester Platzhalter in Bildrahmen-Größe, kein Layout-Sprung beim Nachladen) und zeigt darin eine einfache, kindgerechte Ladeanimation (z. B. dezent pulsierendes Icon), keinen technischen Spinner — konsistent mit der bestehenden Vorgabe für Ladezustände (Zustandstabelle oben). Fortschrittsanzeige und Bildschirmrahmen bleiben währenddessen sichtbar/stabil, nur der Bildbereich zeigt den Ladezustand.
- Erwartete Dauer meist unter 1,5 s (siehe Performance-Messung `architecture.md` Abschnitt F) — kein aufwendiger Ladebildschirm nötig, reiner Inline-Ladezustand reicht.

**Fehlerzustand (nach 3 erfolglosen Versuchen aus #27, echter Sonderfall):**
- Im selben reservierten Bildrahmen erscheint statt Ladeanimation ein freundliches, nicht technisches Hinweisbild/-icon (z. B. ein ratloses Tier-Icon) mit kurzem Text (z. B. "Dieses Bild will gerade nicht laden") und einem "Nochmal versuchen"-Button, der eine neue Frage anstößt — **kein** Rundenabbruch, **kein** Zurück zur Modus-Auswahl, zählt nicht als beantwortete/übersprungene Frage. Gleicher freundlicher Ton wie bei allen übrigen Fehlerzuständen im Projekt (siehe Zustandstabelle oben, "Fehlerzustand").

**Reset:** Bild, Attribution und Ladezustand werden bei jedem Frage-Wechsel vollständig zurückgesetzt — identisches Prinzip wie bei der bestehenden Bild-Rateshilfe.

**Feedback/Antwortmechanik:** unverändert (siehe "4. Feedback richtig/falsch" oben) — Sofort-Feedback, "Weiter"-Button, Punktestand, Ergebnis-Bildschirm am Rundenende, alles identisch zum bestehenden Modus.

**Barrierefreiheit — wichtige Abweichung von Issue #16:**
- Bild braucht einen aussagekräftigen `alt`-Text, aber **bewusst nicht den Tiernamen** — anders als bei der bestehenden Bild-Rateshilfe (dort ist der Name durch den Fragetext bereits bekannt, das Bild illustriert nur) wäre der Tiername hier die gesuchte Antwort selbst. Ein `alt`-Text mit Klartext-Namen würde die Antwort für Screenreader-Nutzer:innen vorwegnehmen und den Modus für sie unspielbar machen. **Entscheidung:** generischer, nicht verratender Alt-Text, z. B. `alt="Foto eines Tieres – errate, welches Tier das ist"`.
- Ladezustand für Screenreader nicht komplett stumm (`aria-busy`/`aria-live`, wie bei Issue #16), gleiche Anforderung auch für den Fehlerzustand (Wechsel muss angekündigt werden).
- Ansonsten identische Anforderungen wie bestehende Antwortkacheln (Tastaturbedienbarkeit, Tab-Reihenfolge, Kontrast, keine reine Farbcodierung).

## Modus-Auswahl auf dem Start-Bildschirm: Dritte Kachel "Tiergeräusche" (14.08.2026, `ux-design`, Story-Freigabe #31)

Ergänzt den obigen Abschnitt "Modus-Auswahl auf dem Start-Bildschirm (Skizze)", der bereits explizit beide neuen Modi mitgedacht hatte ("bis zu ca. 3–4 Modi" als Skalierungsgrenze für den Ein-Bildschirm-Ansatz). Mit der dritten Kachel wird diese Grenze erreicht, aber nicht überschritten — kein Wechsel zu einem vorgeschalteten Auswahlbildschirm nötig.

```
┌─────────────────────────────────┐
│         🦁 Tierquiz              │
│                                   │
│  Was möchtest du spielen?        │
│  ┌────────┐┌────────┐┌────────┐ │
│  │Quizfragen││Wer bin ││Tier-   │ │
│  │ (Start)  ││ich? 🌐 ││geräu-  │ │
│  │          ││        ││sche 🔊🌐│ │
│  └────────┘└────────┘└────────┘ │
│                                   │
│  Wie schwer?                     │
│  ┌───────────┐ ┌───────────┐    │
│  │  Einfach   │ │  Knifflig  │    │
│  └───────────┘ └───────────┘    │
│                                   │
│        [ Los geht's! ]           │
└─────────────────────────────────┘
```

- **Label:** "Tiergeräusche" bleibt wie im ursprünglichen Skizzen-Vorschlag unverändert stehen — bereits selbsterklärend für Kinder, kein kindgerechteres Umbenennen nötig (anders als "Umkehr-Quiz" → "Wer bin ich?").
- **Icons:** kleines Lautsprecher-Icon (🔊) als Modus-Kennzeichnung, zusätzlich das bereits etablierte Online-Icon (🌐) mit `aria-label="Benötigt Internetverbindung"` — gleiche Behandlung wie bei "Wer bin ich?".
- **Vorbelegung/Reihenfolge unverändert:** "Quizfragen" bleibt vorbelegt/hervorgehoben. Reihenfolge der drei Kacheln folgt der Priorisierung aus `requirements.md` (Quizfragen → Wer bin ich? → Tiergeräusche), keine willkürliche Anordnung.
- **Fehlerfall ohne Internet:** identisches Muster wie bei "Wer bin ich?" (siehe Zustandstabelle oben und "Finale Leitplanken" im vorherigen Abschnitt) — Testabruf ist der erste Aufruf von `generateNextSoundQuestion()` für Frage 1, Ladezustand direkt in der Kachel, freundlicher Hinweis bei Fehlschlag, Auswahl verbleibt bei "Quizfragen".
- **Layout-Prüfung:** Drei Kacheln nebeneinander bleiben innerhalb der bestehenden Vorgabe "Kein Scrollen bei der Kernaufgabe" — bei sehr schmalen Bildschirmen greift wie bei den Antwortkacheln das bestehende responsive Umschaltmuster (gestapelt statt nebeneinander).
- **Barrierefreiheit:** identisch zu den bestehenden Modus-Kacheln (Tastaturbedienbarkeit, Tab-Reihenfolge, Kontrast, Text-Alternative für das Online-Icon).

## Frage-/Feedback-Bildschirm "Tiergeräusche" (14.08.2026, `ux-design` + `software-architect`, Story-Freigabe #32/#33)

Wiederverwendet den bestehenden Frage-/Feedback-Mechanismus (Fortschrittsanzeige, 2×2-Antwortraster, Sofort-Feedback, manueller "Weiter"-Button, Punktestand) fast unverändert — strukturell analog zum Abschnitt "Frage-/Feedback-Bildschirm 'Wer bin ich?'" oben. Neu ist, **was** im oberen Bereich des Bildschirms steht (Audio-Player statt Bild) sowie drei Punkte, die sich vom Bild-Modus unterscheiden: Wiederholbarkeit, kein Autoplay, und eine bewusst dokumentierte Barrierefreiheits-Einschränkung.

**Layout:**
- Fortschrittsanzeige oben, identisch zu den bestehenden Modi.
- Feste Überschrift **"Welches Tier ist das?"** (analog zu "Wer bin ich?" beim Bild-Modus) — die "Frage" ist der Ton selbst, kein wechselnder Fragetext nötig.
- Darunter ein großer, zentraler **Play-Button** (🔊-Icon, großzügige Touch-Fläche, gleiche Mindestgröße wie Antwortkacheln) statt eines Bildrahmens — bewusst prominent, da er die einzige Möglichkeit ist, an die zur Beantwortung nötige Information zu kommen (anders als beim Bild-Modus, wo das Bild passiv sichtbar ist, sobald geladen).
- Direkt darunter die Attributionszeile (gleiches Format wie #16/#28: "Ton: {Artist} · Wikimedia Commons", optionaler kleiner "(Lizenz)"-Link, fehlende Felder werden übersprungen).
- Darunter die 4 Namensoptionen im gewohnten 2×2-Kachel-Raster.

**Abspiel-/Wiederholungs-Interaktion (neu gegenüber #28, dort nicht relevant):**
- **Kein Autoplay.** Der Ton startet ausschließlich durch expliziten Tap/Klick auf den Play-Button — konsistent mit dem bestehenden Grundsatz "kein Hover-/Automatik-Aufdecken" (siehe Bild-Rateshilfe) und zusätzlich technisch geboten (Browser blockieren Ton-Autoplay ohne Nutzerinteraktion i. d. R. ohnehin).
- **Beliebig oft wiederholbar:** Derselbe Play-Button kann erneut angetippt werden, um den Ton von vorn abzuspielen — kein separater "Nochmal"-Button, kein Limit, kein Zeitdruck (konsistent mit dem bestehenden Grundsatz "keine Countdown-/Zeitdruck-Elemente"). Während der Wiedergabe kann der Button optisch leicht abweichen (z. B. dezente "spielt gerade"-Animation), das ist aber ein Detail für `web-developer`, keine harte Vorgabe.
- **Ladezustand vor Frage-Anzeige:** identisches Muster wie #28 — reservierter Player-Bereich zeigt eine dezente, kindgerechte Ladeanimation, während der Ton laut #32 vorab aufgelöst wird (Metadaten-Check, kein vollständiger Download nötig, siehe `architecture.md`). Danach erscheint der Play-Button an derselben Stelle, kein Layout-Sprung.
- **Kurzer Pufferzustand beim ersten Abspielen:** Da die eigentliche Audiodatei erst beim Play-Tap zu laden beginnt (progressive Wiedergabe, siehe `architecture.md`), kann ein sehr kurzer Pufferzustand auftreten — dezenter Indikator im Button selbst (gleiches Muster wie der bestehende "Bild zeigen"-Button-Ladezustand), kein Vollbild-Spinner.

**Fehlerzustand (nach 3 erfolglosen Versuchen aus #32):** identisches Muster wie #28 — freundlicher Hinweis im reservierten Player-Bereich, "Nochmal versuchen"-Button stößt eine neue Frage an, kein Rundenabbruch, kein Zurück zur Modus-Auswahl, zählt nicht als beantwortete/übersprungene Frage.

**Reset:** Ton, Attribution und Player-/Ladezustand werden bei jedem Frage-Wechsel vollständig zurückgesetzt.

**Feedback/Antwortmechanik:** unverändert (siehe "4. Feedback richtig/falsch" oben).

**Barrierefreiheit:**
- Play-Button als echtes `<button>`-Element, tastaturbedienbar (Enter/Space), mit aussagekräftigem `aria-label` (z. B. "Tierlaut abspielen" bzw. bei bereits einmal abgespieltem Ton "Tierlaut noch einmal abspielen"). Lade-/Pufferzustand nicht komplett stumm für Screenreader (`aria-busy`/`aria-live`, wie bei bestehenden Ladezuständen).
- **Bewusst kein Transkript/keine Textbeschreibung des Tons** — anders als sonst bei Web-Barrierefreiheit üblich (z. B. Untertitel/Transkripte für Audio-Inhalte), da hier der Ton selbst das zu lösende Rätsel ist; eine Textbeschreibung würde die Antwort vorwegnehmen und den Modus unspielbar machen. Das ist eine bewusste, dokumentierte Abweichung vom allgemeinen Barrierefreiheits-Grundsatz, kein Versehen.
- **Bekannte, bewusst dokumentierte Einschränkung: Dieser Modus ist für hörbeeinträchtigte/gehörlose Kinder strukturell nicht spielbar.** Es gibt keine gleichwertige visuelle/textliche Alternative zur Kernaufgabe (Ton erkennen), ohne den Modus selbst funktionslos zu machen. **Entscheidung (`business-analyst` + `ux-design`, 14.08.2026): kein Blocker für die Umsetzung** — der bestehende Quizfragen-Modus und der Umkehr-Quiz-Modus bleiben für diese Zielgruppe unverändert vollständig spielbar, nur dieser eine zusätzliche, optionale Modus ist betroffen. Wichtig ist Transparenz statt stillschweigendem Hinnehmen: siehe `requirements.md` für die formale Dokumentation dieser Einschränkung. Zum Vergleich: Der Umkehr-Quiz-Modus (#28) hat eine strukturell ähnliche, aber bislang nicht ebenso explizit als "bekannte Einschränkung" dokumentierte Lücke für sehbeeinträchtigte/blinde Kinder (Bild als Kernaufgabe ohne Audio-Alternative) — nicht Teil dieser Story, aber als Beobachtung für eine mögliche spätere Nachdokumentation vermerkt.
- Ansonsten identische Anforderungen wie bestehende Antwortkacheln (Tastaturbedienbarkeit, Tab-Reihenfolge, Kontrast, keine reine Farbcodierung).

## Infosatz + Wikipedia-Link im "Wer bin ich?"-Modus (Issue #35, 15.08.2026, `ux-design`)

Ergänzt den Abschnitt "Frage-/Feedback-Bildschirm 'Wer bin ich?'" (Issue #28) oben, der Feedback/Antwortmechanik bisher pauschal als "unverändert" beschrieb — ohne die seit #12/#15/#24/#30 im Quizfragen-Modus hinzugekommenen Zusatzinfos (Infosatz, Wikipedia-Link, Fun Fact, automatisches Bild) explizit mitzudenken. Diese Ergänzung schließt die Lücke gezielt für Infosatz + Wikipedia-Link (Fun Fact bleibt unangetastet, falls ohnehin vorhanden; automatisches Bild wird bewusst ausgeschlossen, siehe unten).

**Automatisches Feedback-Bild (#30) bewusst NICHT Teil dieses Modus:** Im "Wer bin ich?"-Modus ist das Tierbild bereits der durchgehend sichtbare primäre Bildschirminhalt — anders als im Quizfragen-Modus, wo vor der Antwort meist kein Bild sichtbar ist (außer bei manuellem Aufdecken über #16), sodass das automatische Feedback-Bild dort echten Mehrwert liefert. Im "Wer bin ich?"-Modus wäre derselbe Mechanismus eine reine Bild-Dopplung auf ein und demselben Screen. Der automatische Bild-Mechanismus (`imageHint.js`) wird für diesen Modus daher schlicht nicht aufgerufen — kein bedingtes Ausblenden nötig, da der Fall "bereits sichtbares Bild" hier nicht die Ausnahme, sondern immer zutreffend ist.

**Platzierung/Reihenfolge im Feedback-Bereich** (unterhalb der 4 Antwortkacheln, an der bestehenden Position des Sofort-Feedbacks):

```
Richtig/Falsch-Feedback
   ▼
Infosatz (inkl. Wikipedia-Link)
   ▼
Fun Fact (falls vorhanden)
   ▼
"Weiter"-Button
```

Identisch zur bestehenden Reihenfolge des Quizfragen-Modus, nur ohne den hier redundanten Bild-Schritt aus #30 — der Feedback-Bereich bleibt dadurch sogar kompakter.

**Kein Scrollen-Risiko durch diese Ergänzung:** Die Vorgabe "Kein Scrollen bei der Kernaufgabe" bezieht sich auf den Bereich *vor* der Antwort (Bild + Attribution + 4 Kacheln, siehe #28). Der Feedback-Bereich danach darf – wie im Quizfragen-Modus bereits akzeptiert – bei Bedarf zu Scrollen führen; das ist kein neues Zugeständnis, sondern folgt demselben bereits etablierten Muster.

**Barrierefreiheit:** Der Infosatz nennt den Tiernamen (`{name_de}: Ein/e {category}...`). Das ist an dieser Stelle unproblematisch, da die richtige Antwort nach der Antwortabgabe bereits aufgelöst ist — gleiche Begründung wie bereits im Abschnitt "Bild-Rateshilfe: Automatische Anzeige nach der Antwort" für den dortigen `alt`-Text festgehalten. Keine neue Einschränkung gegenüber dem bestehenden Quizfragen-Modus. Gleiche Kontrast-/Lesbarkeits- und Tastaturanforderungen wie der übrige Feedback-Bereich.

**Beide Altersstufen:** Gleiche Darstellung, kein Unterschied.

## Ergebnisliste: Löschen + Modus-Anzeige (Issue #36, 15.08.2026, `ux-design`)

Ergänzt den bestehenden, bewusst zurückhaltenden Ton der Verlaufsliste aus Issue #14 ("keine wertende Rangfolge", chronologisch, eingeklappt by default, natives `<details>/<summary>`) um zwei neue Fähigkeiten, ohne diesen Grundton zu verändern.

**Löschen einzelner Einträge:** Kleines, dezentes Steuerelement pro Eintrag (z. B. "🗑️" oder "×" als echtes `<button>`, `aria-label="Eintrag löschen"`), am rechten Rand jeder Zeile — deutlich kleiner/unauffälliger als der Ergebnistext, damit es nicht mit dem eigentlichen Inhalt konkurriert. **Kein Bestätigungsdialog** — geringe Tragweite (ein historischer Eintrag, keine laufende Spielrunde), passend zum bestehenden Grundsatz "wenig Klickschritte".

**Ganze Liste leeren:** Zusätzlicher, klar unterscheidbarer Text-Button/Link unterhalb der Liste ("Alle Ergebnisse löschen"), bewusst weniger prominent als "Nochmal spielen"/"Zurück zum Start". **Mit Bestätigung** (z. B. natives `confirm()` oder ein zweistufiger Button-Zustand "Wirklich alle löschen?") — größere Tragweite als ein Einzeleintrag. Ein technisches `confirm()` ist hier anders als im übrigen, bewusst kindgerecht/technikarm gehaltenen Quiz-Flow vertretbar, da die Zielgruppe dieses Bereichs laut Issue #14 explizit "Spieler:in bzw. Elternteil" ist, nicht das jüngere Kind selbst.

**Sichtbarkeit:** Beide Lösch-Optionen bleiben unsichtbar, bis die Liste aktiv aufgeklappt wird (innerhalb des bestehenden `<details>`-Elements) — konsistent mit "eingeklappt by default", keine zusätzliche Ablenkung auf dem Ergebnis-Bildschirm.

**Leere Liste nach Löschen:** Wird der letzte Eintrag gelöscht (einzeln oder komplett), verschwindet der gesamte Verlaufsbereich (inkl. "Meine bisherigen Ergebnisse ansehen"-Link) wieder vollständig — identisches Verhalten zum bestehenden Fall "keine Historie vorhanden", kein Sonderfall.

**Modus-Anzeige:** Neuer, kurzer Textbestandteil in der bestehenden Metazeile pro Eintrag (bisher `"{difficultyLabel} · {date}"`), erweitert zu `"{modeLabel} · {difficultyLabel} · {date}"`. Modus-Labels identisch zu den bereits auf dem Start-Bildschirm verwendeten kindgerechten Bezeichnungen ("Quizfragen" / "Wer bin ich?" / "Tiergeräusche", siehe Abschnitt "Modus-Auswahl auf dem Start-Bildschirm"). **Keine Farbcodierung, kein modusabhängiger visueller Unterschied** — reiner Text, konsistent mit dem Grundsatz "keine wertende Optik", nur zusätzliche Information. Alt-Einträge ohne gespeicherten Modus werden mit dem Default-Label "Quizfragen" angezeigt, ohne erkennbaren Unterschied zu "echten" Quizfragen-Einträgen (kein "geschätzt"/"unbekannt"-Hinweis) — konsistent mit der bestehenden Projekt-Philosophie, fehlende/nachträglich ergänzte Daten transparent, aber ohne sichtbaren Sonderstatus zu behandeln.

**Barrierefreiheit:** Lösch-Buttons als echte `<button>`-Elemente, per Tastatur erreichbar/auslösbar (Tab-Reihenfolge nach dem jeweiligen Listeneintrag), mit aussagekräftigen `aria-label`s statt reinem Icon ohne Text-Alternative — konsistent mit bestehenden Anforderungen.

## Infosatz + Wikipedia-Link + Fun Fact im "Tiergeräusche"-Modus (Issue #41, 16.08.2026, `ux-design`)

Ergänzt den Abschnitt "Frage-/Feedback-Bildschirm 'Tiergeräusche'" (Issue #33) oben um dieselbe Lücke, die bereits für den "Wer bin ich?"-Modus über Issue #35 geschlossen wurde: Der bestehende Feedback-Bereich zeigte bisher bewusst keinen Infosatz/Wikipedia-Link/Fun Fact ("kein Scope-Creep über #33 hinaus").

**Platzierung/Reihenfolge im Feedback-Bereich** (unterhalb der 4 Antwortkacheln, an der bestehenden Position des Sofort-Feedbacks):

```
Richtig/Falsch-Feedback
   ▼
Bild (falls Issue #42 bereits umgesetzt, siehe eigener Abschnitt unten)
   ▼
Infosatz (inkl. Wikipedia-Link)
   ▼
Fun Fact (falls vorhanden)
   ▼
"Weiter"-Button
```

Identisch zur bestehenden Reihenfolge im Quizfragen-Modus (Feedback → Bild → Infosatz → Fun Fact → Weiter, siehe Abschnitt "Bild-Rateshilfe: Automatische Anzeige nach der Antwort" oben) — dasselbe Muster wird hier 1:1 übertragen, unabhängig davon, in welcher Reihenfolge #41/#42 tatsächlich umgesetzt werden.

**Formulierung/Format:** identisch zum Quizfragen-Modus — Infosatz "{name_de}: Ein/e {category}, ...", Wikipedia-Link "📖 Mehr über {name_de} auf Wikipedia lesen", Fun Fact "💡 Wusstest du schon? ...". Kein neuer Formulierungsstil, nur eine neue Platzierung in einem anderen Bildschirm.

**Barrierefreiheit:** Der Infosatz nennt den Tiernamen — unproblematisch, da die richtige Antwort nach Antwortabgabe bereits aufgelöst ist (gleiche Begründung wie bereits bei #30/#35 dokumentiert). Keine neue Einschränkung gegenüber den bestehenden Modi.

**Beide Altersstufen:** Gleiche Darstellung, kein Unterschied.

## Automatische Bildanzeige im Feedback des "Tiergeräusche"-Modus (Issue #42, 16.08.2026, `ux-design` + `business-analyst`)

**Entscheidung: automatische Anzeige NACH der Antwort (analog Issue #30), bewusst KEIN "Bild zeigen"-Button VOR der Antwort (anders als Issue #16 im Quizfragen-Modus).**

Begründung: Die Kernaufgabe des Tiergeräusche-Modus ist "das Tier am Laut erkennen". Ein vor der Antwort abrufbares Bild würde diese Aufgabe direkt vorwegnehmen — die 4 Antwortoptionen ließen sich dann rein visuell statt akustisch lösen, der Modus wäre für ein Kind, das den Button nutzt, faktisch funktionslos. Das ist dieselbe Logik, die bereits im Abschnitt "Frage-/Feedback-Bildschirm 'Tiergeräusche'" oben zur bewussten Ablehnung eines Text-Transkripts geführt hat ("eine Textbeschreibung würde die Antwort vorwegnehmen und den Modus unspielbar machen") — ein Bild ist ein noch direkterer Antwort-Verrat als ein Transkript, die Ablehnung gilt also erst recht. Nach der Antwort ist die richtige Lösung dagegen bereits bekannt; ein Bild dort ist reine, unproblematische Bestätigung/Illustration — exakt der bereits im Quizfragen-Modus etablierte Anwendungsfall (Issue #30).

**Platzierung/Reihenfolge:** direkt unterhalb des Richtig/Falsch-Feedbacktexts, oberhalb des Infosatz-Blocks (siehe Reihenfolge-Diagramm im Abschnitt oben) — identisch zur Platzierung im Quizfragen-Modus.

**Visuelle Gestaltung/Attribution/Reset/Fehlerbehandlung:** identisch zum bestehenden Abschnitt "Bild-Rateshilfe: Automatische Anzeige nach der Antwort" oben (fester Bildrahmen mit abgerundeten Ecken, "Foto: {Artist} · Wikimedia Commons"-Attributionszeile mit optionalem "(Lizenz)"-Link, stilles Einpoppen ohne Ladeindikator, stilles Ausblenden bei Fehlschlag/fehlendem Bild, `alt="{name_de}"`) — keine abweichende Gestaltung nötig, nur ein neuer Bildschirm mit demselben Muster.

**Kein Duplikat-Problem wie beim Quizfragen-Modus:** Da es in diesem Modus (bewusst, siehe oben) keinen Pre-Answer-Bild-Button gibt, entfällt die dortige Sonderbehandlung "nicht anzeigen, falls bereits manuell aufgedeckt" — das Bild erscheint im Tiergeräusche-Modus schlicht bei jeder Antwort (sofern `image_filename` vorhanden), ohne Sonderfall.

**Beide Altersstufen:** Gleiche Darstellung, kein Unterschied.

## Ergänzung: Play/Pause-Toggle beim Tierlaut-Button (Issue #43, 16.08.2026, `ux-design`)

Ergänzt den Abschnitt "Frage-/Feedback-Bildschirm 'Tiergeräusche'" oben, Unterabschnitt "Abspiel-/Wiederholungs-Interaktion" — der dort bereits als Detail erwähnte optische Wiedergabe-Indikator ("Während der Wiedergabe kann der Button optisch leicht abweichen") wird hier zu einer echten Interaktion konkretisiert: **erneutes Antippen während der Wiedergabe stoppt den Ton**, statt ihn (wie bisher) einfach von vorne neu zu starten.

**Entscheidung: Stop-und-Zurücksetzen, kein Pause-mit-Fortsetzen.** Tierlaute sind kurze Clips; ein Wiederaufnehmen mitten im Clip bringt für die Kernaufgabe "am ganzen Laut erkennen" keinen Mehrwert und wäre potenziell verwirrender als ein einfaches Ein/Aus. Nach dem Stoppen setzt ein erneuter Tap den Ton wieder ganz von vorne fort (unverändert zum bestehenden "beliebig oft wiederholbar").

**Zustands-/Label-Wechsel:**
- Abspielbereit, noch nie gespielt: Icon 🔊, `aria-label="Tierlaut abspielen"`.
- Abspielbereit, bereits mind. einmal gespielt (inkl. nach Stoppen oder natürlichem Ende): Icon 🔊, `aria-label="Tierlaut noch einmal abspielen"` (unverändert zum bestehenden Verhalten).
- Spielt gerade: Icon wechselt zu einem klar erkennbaren "Stopp"-Symbol (z. B. ⏹️), `aria-label="Tierlaut stoppen"`.

**Kein neuer Ladezustand:** Der bestehende, dezente Puffer-Indikator (`waiting`/`playing`-Events, aria-busy) bleibt unverändert bestehen und ist von diesem Toggle-Verhalten unabhängig.

**Barrierefreiheit:** Der Zustandswechsel muss über das `aria-label` erkennbar sein (siehe oben) — kein zusätzlicher `aria-live`-Hinweis nötig, da der Button selbst fokussiert bleibt und der Label-Wechsel beim erneuten Fokussieren/Vorlesen erkennbar ist, analog zum bestehenden Muster bei anderen zustandsabhängigen Buttons im Projekt (z. B. `image-hint-button`).

## Modus-Auswahl auf dem Start-Bildschirm: Fünfter/sechster Modus — Skalierungsentscheidung (16.08.2026, `ux-design`, Vorbereitung #45/#46)

Mit den beiden neuen Modi "Tier-Memory" (#45) und "Buchstabensuche" (#46) wächst die Zahl der Modus-Kacheln von 3 auf 5. Der bestehende Abschnitt "Modus-Auswahl auf dem Start-Bildschirm" hatte dafür bereits eine Leitplanke vorgesehen: *"Sollten deutlich mehr Modi hinzukommen, sollte die Modus-Auswahl in einen eigenen, vorgeschalteten Bildschirm ausgelagert werden."*

**Entscheidung: Noch kein eigener Vorschaltbildschirm — Kachel-Grid bricht stattdessen responsive auf zwei Zeilen um (z. B. 3+2), bleibt aber ein einziger Start-Bildschirm.** Begründung: "Deutlich mehr" (ursprünglicher Text) bezog sich auf ein starkes Wachstum über die genannte Grenze von 3–4 hinaus, nicht auf eine einzelne zusätzliche Kachel. 5 Kacheln plus die bestehende Schwierigkeitsstufen-Auswahl plus Start-Button lassen sich noch in einem vertretbaren, wenn auch etwas höheren Bildschirm unterbringen, ohne die Kernprinzipien (kein Hover-Zwang, große Touch-Flächen, klare Gruppierung) zu verletzen — ein zusätzlicher Navigationsschritt vor jedem Rundenstart wäre für Kinder eher ein Mehraufwand als ein Gewinn. **Ab einem sechsten Modus sollte die vorgeschaltete Bildschirm-Lösung erneut geprüft werden** — dieser Abschnitt macht die Grenze damit expliziter als zuvor ("3–4 komfortabel, 5 noch auf einem Bildschirm vertretbar, 6 = harte Grenze zur Neubewertung").

- **Layout:** Gleiches Kachel-Grid-Prinzip wie bisher (`design.md`, "Modus-Auswahl auf dem Start-Bildschirm"), nur mit `flex-wrap`/CSS-Grid-Umbruch statt fester Ein-Zeilen-Anordnung — identische Kachel-Größe/-Optik, keine Verkleinerung einzelner Kacheln, um die Touch-Zielgrößen-Vorgabe nicht zu unterlaufen.
- **Reihenfolge:** Bestehende drei Modi zuerst (Quizfragen → Wer bin ich? → Tiergeräusche, wie bisher), danach die beiden neuen in der Reihenfolge ihrer Priorisierung (siehe `requirements.md`): Tier-Memory (#45) vor Buchstabensuche (#46) — reine Konvention, keine funktionale Bedeutung.
- **Zuständigkeit für den Umbau:** Da #45 und #46 unabhängig voneinander und in beliebiger Reihenfolge umgesetzt werden können (siehe Branch-Strategie), führt **die jeweils zuerst umgesetzte Story** den Umbau auf das umbrechende Grid durch; die zweite Story ergänzt lediglich ihre eigene Kachel im bereits umgebauten Grid. Beide Story-Beschreibungen verweisen auf diesen Abschnitt, keine der beiden setzt den Umbau als bereits erledigt voraus.
- **Online-Icon (🌐):** Beide neuen Kacheln bekommen das bestehende Online-Icon (siehe unten, "NFR-1-Frage") nach demselben Muster wie "Wer bin ich?"/"Tiergeräusche" — vorbehaltlich der in `requirements.md` offen dokumentierten Bestätigung, dass die NFR-1-Ausnahme auf diese beiden neuen Modi ausgeweitet wird.

## Neuer Spielmodus "Tier-Memory" (Issue #45, 16.08.2026, `ux-design` + `business-analyst`)

**Grundprinzip:** Klassisches Memory-/Concentration-Spiel mit **verdeckten Kartenpaaren, die jeweils dasselbe Live-Thumbnail desselben Tieres zeigen** (zwei identische Bild-Karten pro Tier) — nicht Bild+Name-Paare. Begründung: Der Issue-Text nennt ausdrücklich "Basis sind die Bilder, die aktuell schon vorhanden sind" (der bestehende `image_filename`-Mechanismus aus Issue #16/#28), und ein klassisches "zwei identische Karten"-Memory ist die für die Zielgruppe (6–12 Jahre) unmittelbar verständliche, keine Zusatzerklärung nötige Spielform — kein neues Datenfeld, keine neue Paarungslogik zwischen unterschiedlichen Inhaltstypen nötig.

**Schwierigkeitsgrad = Kartenanzahl (Entscheidung `business-analyst`, 16.08.2026, wie im Issue gefordert):**

| Stufe | Tierpaare | Kartenanzahl gesamt | Begründung |
|---|---|---|---|
| Einfach (6–10) | 6 | 12 | Passt zur alterstypischen Merkspanne jüngerer Kinder bei klassischen Memory-Spielen; überschaubar, schnell lösbar (wichtig bei geringer Frustrationstoleranz, siehe Zielgruppen-Konsequenzen oben). |
| Knifflig (10–12) | 12 | 24 | Deutlich spürbar schwerer (doppelte Kartenzahl), bleibt aber noch in einer für ein Kinderspiel angemessenen Größenordnung (kein 50+-Karten-Brett). |

Kein neues Enum nötig — nutzt die bestehenden `DIFFICULTY_LEVELS` (`6-10`/`10-12`) aus `difficulty.js`, hier aber als Kartenanzahl statt als Feld-Zuordnung interpretiert (siehe `architecture.md` für die technische Einordnung dieses Unterschieds).

**Bildschirmaufbau:**
- Kein Fragetext, keine Fortschrittsanzeige "Frage X von N" (es gibt keine Einzelfragen) — stattdessen eine schlichte Kopfzeile "Tier-Memory" plus optional ein kleiner Fortschritts-Hinweis "{gefundene Paare} von {Gesamtpaare} Paaren gefunden".
- Karten-Grid darunter, responsive (z. B. 3×4 bei 12 Karten, 4×6 bei 24 Karten je nach Bildschirmbreite, analog zum bereits etablierten responsiven Umbruchmuster der Antwortkacheln). **Scrollen ist hier ausdrücklich zulässig**, anders als bei der strikten "Kein Scrollen bei der Kernaufgabe"-Vorgabe für den Quizfragen-/Wer-bin-ich?-Bildschirm — ein Memory-Brett mit bis zu 24 Karten ist ein strukturell anderer Inhaltstyp (Überblick verschaffen ist Teil des Spiels), kein Zugeständnis an die übrigen Modi.
- **Kartenrückseite (verdeckt):** Einheitliches, einfaches Rückseiten-Design für alle Karten (z. B. dezentes Pfoten-/Tier-Silhouetten-Muster passend zum bestehenden Maskottchen-Gedanken aus "Visuelle Grundlinie") — bewusst identisch für alle Karten, das ist das Wesen von Memory.
- **Kartenvorderseite (aufgedeckt):** Live-Thumbnail (330px, identischer Mechanismus wie Issue #16/#28) in festem Kartenrahmen, kein Tiername sichtbar auf der Karte selbst (sonst wäre Merken trivial über Text statt Bild).

**Interaktion:**
- Tap auf eine verdeckte Karte deckt sie auf. Ist bereits eine andere Karte aufgedeckt (aber noch nicht als Paar bestätigt), wird die zweite Karte ebenfalls aufgedeckt und sofort verglichen.
- **Treffer (gleiches Tier):** Beide Karten bleiben dauerhaft aufgedeckt (kein erneutes Verdecken), leichtes positives visuelles Feedback (analog zum bestehenden "richtig"-Grünton, aber dezenter als beim Quizfragen-Feedback, da kein vollständiger Bildschirmwechsel). **Direkt danach erscheint der Infotext-Bereich** (siehe unten).
- **Kein Treffer:** Nach einer kurzen, festen Pause (Empfehlung: **ca. 1 Sekunde** — lang genug zum Erkennen, kurz genug um keine Wartezeit-Frustration zu erzeugen) drehen sich beide Karten automatisch wieder verdeckt um. **Bewusst automatisch statt über einen manuellen "Weiter"-Button**, anders als beim übrigen Quiz-Feedback: Hier gibt es keinen Lesetext, der Zeit zum Verarbeiten braucht (reiner visueller Soforteindruck "gleich oder nicht"), ein Extra-Tap pro Fehlversuch wäre bei einem 24-Karten-Brett unnötig ermüdend. Während der Pause sind alle übrigen Karten kurz gesperrt (kein drittes Aufdecken), identisches Sperr-Prinzip wie bei den Quiz-Antwortkacheln.
- **Kein Zeitdruck/keine Zugbegrenzung:** Beliebig viele Versuche, kein Timer, kein Punktabzug — konsistent mit dem bestehenden Grundsatz "kein Scheitern-Framing".

**Infotext nach einem Treffer (Kernanforderung aus dem Issue-Text):**
- Direkt nach einem gefundenen Paar erscheint unterhalb des Karten-Grids ein Textblock mit dem bestehenden Infosatz-Baustein (`buildInfoSentence()`, Issue #12) **plus** Wikipedia-Link (Issue #15) für das soeben gefundene Tier — identisches Format/Ton wie im Quizfragen-Modus ("{name_de}: Ein/e {category}, …" + "📖 Mehr über {name_de} auf Wikipedia lesen"). Kein neuer Textstil.
- **Sichtbar bis zur nächsten Kartenauswahl:** Tippt das Kind eine neue (dritte) Karte an, verschwindet der Infotext-Block und das neue Aufdecken/Vergleichen beginnt — exakt wie im Issue-Text gefordert ("bis zur Auswahl/dem Aufdecken der nächsten Karte"). Kein manueller Schließen-Button nötig.
- **Layout:** Fester, reservierter Bereich unterhalb des Grids (kein Sprung des Karten-Grids selbst, wenn der Text erscheint/verschwindet) — leer, wenn kein Paar gerade gefunden wurde, analog zum bestehenden "kein Platzhalter bei fehlendem Wert"-Prinzip.
- **Fun Fact (falls vorhanden):** Optional zusätzlich unterhalb des Infosatzes, identisches Muster wie im Quizfragen-Modus (fehlt meist, da nur 20 Tiere aktuell kuratiert — kein Problem, gleiches "kein Platzhalter"-Prinzip).

**Rundenende:** Sobald alle Paare gefunden sind, wechselt der Bildschirm zum bestehenden Ergebnis-Bildschirm-Rahmen (siehe "6. Ergebnis-/Abschluss-Bildschirm" oben), aber mit angepasstem Text statt "X von Y richtig beantwortet": z. B. "Super gemacht! Du hast alle {Anzahl} Tierpaare gefunden!" plus die Anzahl benötigter Versuche als motivierender Zusatz ("Das hast du in {Versuche} Versuchen geschafft!") — **keine wertende Einordnung** (kein "das war schlecht/gut"), rein informativ, konsistent mit dem bestehenden, durchweg wertschätzenden Ton. "Nochmal spielen"/"Zurück zum Start" bleiben unverändert.

**Bewusst außerhalb des Scope von #45 (spätere Folge-Story, analog zu #30/#35/#41-#43):**
- Keine Aufnahme in die Ergebnis-Verlaufsliste (#14/#36) in dieser ersten Version — das dortige Datenmodell (`score`/`total` als "richtig von N") passt konzeptionell nicht 1:1 auf ein Memory-Ergebnis (Versuche statt Richtig/Falsch-Quote), eine saubere Erweiterung ist eine eigene, spätere Entscheidung.
- Keine Fragenanzahl-Auswahl (bereits im Issue-Text ausgeschlossen) — die Kartenanzahl ist stattdessen an die Schwierigkeitsstufe gekoppelt (siehe Tabelle oben), kein zusätzlicher dritter Auswahl-Schritt am Start-Bildschirm.

**Barrierefreiheit:**
- Karten als echte `<button>`-Elemente, tastaturbedienbar (Tab-Reihenfolge durchs Grid, Enter/Space zum Aufdecken), mit `aria-label` je nach Zustand (z. B. "Verdeckte Karte" / bei aufgedeckter Karte ein nicht-verratender Alt-Text wie bei #28, da das Ziel ja gerade das Erkennen/Merken ist — Empfehlung: `alt="Tierbild, Karte {Position}"`, kein Tiername im Alt-Text, sonst wäre das Spiel für Screenreader-Nutzer:innen trivial statt eine Merkaufgabe).
- Gefundene Paare: Zustandswechsel (aufgedeckt/dauerhaft gelöst) muss für Screenreader erkennbar sein (`aria-pressed`/Status-Text), gleiches Prinzip wie bei anderen zustandsabhängigen Buttons im Projekt.
- **Bekannte, bewusst dokumentierte Einschränkung (analog zur bereits für Tiergeräusche dokumentierten Lücke):** Ein reines Bild-Memory ist für sehbeeinträchtigte/blinde Kinder strukturell nicht spielbar (die Kernaufgabe ist visuelles Wiedererkennen). Keine gleichwertige Alternative vorgesehen, da eine Textbeschreibung das Erkennungsmerkmal vorwegnehmen würde. Wird analog zur bestehenden Tiergeräusche-Dokumentation in `requirements.md` festgehalten, kein Blocker (siehe dort).
- Gleiche Kontrast-/Touch-Zielgrößen-Anforderungen wie übrige Kacheln — bei 24 Karten (Stufe Knifflig) besonders wichtig, da die Karten bei fester Bildschirmbreite kleiner ausfallen als bei den bestehenden 4 Antwortkacheln; Mindest-Tapfläche (siehe "Layout-Empfehlungen" oben) darf dabei nicht unterschritten werden — notfalls zusätzliches Scrollen statt Unterschreitung der Mindestgröße.

## Neuer Spielmodus "Buchstabensuche" (Issue #46, 16.08.2026, `ux-design` + `business-analyst`)

**Grundprinzip:** Tierbild wird gezeigt, der Tiername (`name_de`) erscheint darunter als Reihe von Buchstaben-Kästchen im Stil eines klassischen Lückenworträtsels — ein Teil der Buchstaben ist bereits sichtbar vorgegeben, die fehlenden Kästchen sind leere Eingabefelder, die das Kind Buchstabe für Buchstabe ausfüllt, bis der komplette Name sichtbar ist.

**Eingabemechanik (Entscheidung `ux-design`, 16.08.2026 — Abweichung vom sonst reinen Tap-only-Interaktionsmuster des Projekts, bewusst begründet):**
- Jedes fehlende Kästchen ist ein echtes `<input type="text" maxlength="1">`-Feld, groß genug für die bestehenden Touch-Zielgrößen-Vorgaben, mit großer, gut lesbarer Schrift (gleiche Typografie-Linie wie übriger Frage-Text). Bereits vorgegebene Buchstaben werden als optisch gleich große, aber nicht editierbare Kästchen im selben Raster dargestellt — das Kind sieht die komplette "Wortform" auf einen Blick, ähnlich einem Kreuzworträtsel-Wort.
- **Warum Tippen statt Auswahl-Kacheln (Abweichung vom sonstigen Muster):** Die Kernaufgabe dieses Modus ist wörtlich "fehlende Buchstaben ergänzen" (Issue-Text) — das ist inhaltlich eine Schreib-/Rechtschreibübung, keine Mehrfachauswahl-Frage. Eine Buchstaben-Auswahl aus Kacheln (analog zu den bestehenden 4 Antwortkacheln) würde die eigentliche Übung (sich an die Schreibweise erinnern) verwässern. Auf Touch-Geräten (auch dem perspektivischen iPad) öffnet ein Tap auf ein `<input>`-Feld automatisch die native Bildschirmtastatur — kein Zusatzaufwand für `web-developer`.
- **Auto-Fokus-Wanderung:** Nach korrekter Eingabe eines Buchstabens springt der Fokus automatisch zum nächsten leeren Kästchen (kein manueller Tap nötig zwischen den Buchstaben) — reduziert Klickschritte, passend zum bestehenden Grundsatz "wenig Klickschritte für Kinder".
- **Groß-/Kleinschreibung:** Eingabe wird **case-insensitive** geprüft (Kind kann Groß- oder Kleinbuchstaben tippen, beides gilt als richtig) — vermeidet unnötige Frustration durch reine Formalie, passend zum bestehenden Grundsatz "fehlertolerante Bedienung". Angezeigt wird nach korrekter Eingabe stets die tatsächlich korrekte Schreibweise aus `name_de` (i. d. R. Großbuchstabe am Namensanfang, Rest klein).
- **Leerzeichen/Bindestriche in mehrteiligen Namen** (z. B. "Großer Panda", "Rotkehlchen" einteilig, aber z. B. "Asiatischer Elefant" zweiteilig): werden **nie** als Lücke behandelt, erscheinen immer direkt als sichtbares Leerzeichen/Trennzeichen zwischen den Kästchen-Gruppen — nur tatsächliche Buchstaben (inkl. Umlaute ä/ö/ü und ß) können Lücken sein.

**Schwierigkeitsgrad = Anteil verdeckter Buchstaben (Entscheidung `business-analyst`, 16.08.2026, analog zur Kartenanzahl-Regel bei #45):**

| Stufe | Regel | Effekt |
|---|---|---|
| Einfach (6–10) | Jeder 3. Buchstabe ist eine Lücke (Positionen 3, 6, 9, …), erster und letzter Buchstabe jedes Namensteils immer sichtbar vorgegeben | ca. 25–30 % der Buchstaben fehlen — viel sichtbarer Kontext erleichtert das Erraten/Erinnern |
| Knifflig (10–12) | Jeder 2. Buchstabe ist eine Lücke (Positionen 2, 4, 6, …), nur der erste Buchstabe jedes Namensteils ist immer sichtbar vorgegeben | ca. 45–50 % der Buchstaben fehlen — spürbar anspruchsvoller |

Bei sehr kurzen Namen (z. B. 3–4 Buchstaben) sorgt die Regel "erster/letzter Buchstabe sichtbar" (Einfach) bzw. "erster Buchstabe sichtbar" (Knifflig) automatisch für mindestens einen sinnvollen Anker — kein Sonderfall nötig, die Positionsregel greift unverändert.

**Fehlerfall pro Buchstabe (Kernanforderung aus dem Issue-Text):**
- Tippt das Kind den falschen Buchstaben in ein Kästchen, erscheint **sofort** (nicht erst am Namensende) eine kurze, freundliche Fehlermeldung mit Aufforderung zum erneuten Versuch — Ton konsistent mit dem bestehenden "falsch"-Feedback im Quizfragen-Modus (kein "Falsch!", kein Rot/Buzzer-Ton, stattdessen z. B. "Fast! Versuch's nochmal 🙂"). Das Kästchen selbst leert sich wieder für einen neuen Versuch.
- **Unbegrenzte Versuche pro Buchstabe, keine Auswirkung auf ein Punktesystem** — konsistent mit dem bestehenden Grundsatz "kein Scheitern-Framing"; Fehlversuche werden nicht gezählt/angezeigt (kein "3. Versuch"-Countdown, das würde Druck erzeugen).

**Nach vollständigem Namen (Kernanforderung aus dem Issue-Text):**
- Sobald alle Kästchen korrekt gefüllt sind, erscheint unterhalb des Namens der bestehende Infosatz-Baustein (Issue #12) plus Wikipedia-Link (Issue #15), identisches Format wie in den übrigen Modi. Fun Fact ergänzend, falls vorhanden (gleiches "kein Platzhalter"-Prinzip).
- Danach der bestehende manuelle "Weiter"-Button zur nächsten Runde-Position — **dieser Modus behält die reguläre Rundenstruktur mit Fortschrittsanzeige und wählbarer Fragenanzahl** (5/10/15/20, Issue #13), anders als #45: Der Issue-Text für #46 enthält **keinen** Ausschluss der Fragenanzahl-Auswahl (im Unterschied zu #45, wo das explizit gefordert wird) — Buchstabensuche verhält sich daher strukturell wie "Wer bin ich?"/"Tiergeräusche": eine Abfolge von N Tieren mit Fortschrittsanzeige "Tier X von N" statt "Frage X von N".

**Bildschirmaufbau (Layout, analog zu "Wer bin ich?"):**
- Fortschrittsanzeige oben ("Tier 3 von 10").
- Feste Kopfzeile "Wie heißt dieses Tier?".
- Tierbild darunter (gleiche Bildrahmen-Optik/Größe wie beim "Wer bin ich?"-Modus, live geladenes 330px-Thumbnail, Attributionszeile direkt darunter — identisches Pflicht-Attributions-Muster wie bei #28, da das Bild auch hier zentraler, nicht optionaler Bestandteil jeder Aufgabe ist).
- Darunter die Buchstaben-Kästchen-Reihe(n) (siehe Eingabemechanik oben), bei langen Namen zeilenumbrechend.
- Darunter (erst nach vollständiger Lösung) der Feedback-/Infotext-Bereich wie oben beschrieben.
- **Kein Scrollen-Risiko bei der Kernaufgabe:** Bild + Attribution + Buchstabenreihe(n) sollten ohne Scrollen sichtbar sein (wie bei #28); der nachgelagerte Infotext-Bereich darf wie im Quizfragen-Modus bei Bedarf zu Scrollen führen (gleiches bereits etablierte Muster).

**Barrierefreiheit:**
- Bild-`alt`-Text **bewusst nicht verratend** (analog zu #28: `alt="Foto eines Tieres – errate, wie es heißt"`), da der Tiername hier die gesuchte Antwort ist.
- Eingabefelder mit aussagekräftigem `aria-label` je Position (z. B. "Buchstabe 3 von 8"), Tab-Reihenfolge folgt der Lese-/Eingabereihenfolge, Fehlermeldung wird per `aria-live` angekündigt (nicht komplett stumm für Screenreader-Nutzer:innen).
- Vorgegebene (nicht editierbare) Buchstaben-Kästchen sind für Screenreader klar als "bereits vorhanden" erkennbar (kein editierbares Feld, reiner Text/`aria-readonly`), damit der Unterschied zu den Lücken eindeutig ist.
- Gleiche Kontrast-/Touch-Zielgrößen-Anforderungen wie übrige Elemente.

## Buchstabensuche: Kästchen verkleinern (Issue #51, 20.08.2026, `ux-design` + `business-analyst`)

**Anlass:** Nutzer-Wunsch, die Buchstaben-Kästchen (`.letter-box`, `src/styles/global.css`) zu verkleinern. Ausgangslage per Chrome-DevTools-Messung gegen `npm run dev` verifiziert: aktuell fest **44×52px** (Breite × Höhe) — dieser Wert stammt aus dem QA-Bugfix in PR #62 (Issue #46, Zyklus 1), der zuvor eine ungewollte Browser-UA-Standardbreite von ~289px bei den `<input>`-Lücken behoben hatte, dabei aber bewusst "deutlich über dem 44×44-px-Touch-Zielgrößen-Minimum" dimensioniert wurde (Breite exakt am Minimum, Höhe mit Puffer darüber).

**Entscheidung: Zielgröße 44×44px (quadratisch), Breite unverändert, Höhe von 52px auf 44px reduziert (–15 % Fläche).**

Begründung:
- Die Breite (44px) entspricht bereits exakt der im Projekt etablierten Mindest-Touchfläche (`design.md`, "Layout-Empfehlungen": "mindestens ca. 44×44 px als absolutes Minimum (Apple HIG)") und darf nicht weiter sinken, ohne diese Vorgabe zu verletzen.
- Die Höhe hatte bisher einen Puffer über dem Minimum (52px statt 44px) — dieser Puffer kann abgebaut werden, ohne die Mindestgröße zu unterschreiten. Das Kästchen wird dadurch spürbar kompakter und quadratisch statt leicht hochrechteckig — eine klar wahrnehmbare, aber begründet begrenzte Verkleinerung.
- 44×44px ist kein neuer, separat zu rechtfertigender Wert, sondern exakt die bereits im Projekt dokumentierte, etablierte Zahl — leicht nachvollziehbar und testbar, kein Interpretationsspielraum für einen willkürlichen Zwischenwert.
- Für ein Buchstaben-Rätsel-Raster ist eine quadratische Kästchenform zudem die naheliegendere, an ein Kreuzworträtsel angelehnte Optik (passt zum bereits dokumentierten Vergleich "ähnlich einem Kreuzworträtsel-Wort").

**Verhalten bei langen Tiernamen:** Das bestehende `flex-wrap: wrap` auf `.letter-puzzle`/`.letter-puzzle__word` (bereits als QA-Bugfix aus Zyklus 1 vorhanden, verifiziert u. a. mit "Fichtenkreuzschnabel", 20 Buchstaben, einteilig) bleibt unverändert ausreichend — bei kleineren statt größeren Kästchen sinkt das Overflow-Risiko tendenziell, es steigt nicht. Kein zusätzlicher Anpassungsbedarf.

**Betroffene CSS-Regel:** `.letter-box` in `src/styles/global.css` (aktuell `width: 2.75rem; height: 3.25rem;`) → `height` auf `2.75rem` (= 44px bei 16px Root-Schriftgröße) ändern, `width` unverändert lassen. Gilt einheitlich für `.letter-box--given`, `--blank`, `--filled` (gemeinsame Basisklasse).

## Buchstabensuche: Lösung anzeigen (Issue #52, 20.08.2026, `ux-design` + `business-analyst`)

**Anlass:** Nutzer-Wunsch nach einer Möglichkeit, sich im Buchstabensuche-Modus die Lösung anzeigen/auflösen zu lassen, statt weiter raten zu müssen.

**Button-Platzierung/-Gestaltung:** Neuer Button unterhalb der Buchstaben-Kästchen-Reihe, an der Stelle, an der auch die Fehlermeldung erscheint (`.letter-puzzle__error`-Bereich) — durchgehend sichtbar, sobald die Frage geladen ist (kein Freischalten erst nach X Fehlversuchen, keine zusätzliche Hürde). **Visuell zurückhaltend** (Text-/Sekundär-Button-Stil, nicht in der kräftigen Primärfarbe der übrigen Aktions-Buttons) — bewusst so gestaltet, dass er nicht zum vorschnellen Überspringen verlockt, aber jederzeit verfügbar bleibt, wenn ein Kind wirklich nicht weiterkommt. Label "Lösung zeigen", `aria-label="Lösung anzeigen und Namen auflösen"`. Nach Anzeige der Lösung verschwindet der Button (Frage ist damit für dieses Tier abgeschlossen, analog zum Zustand nach korrektem Lösen).

**Verhalten danach:** Wiederverwendet denselben Rendering-Pfad wie beim regulären Lösen (`handlePuzzleSolved`) — alle verbleibenden Lücken werden mit dem korrekten Namen aufgefüllt, danach der bestehende Infosatz + Wikipedia-Link + Fun Fact (falls vorhanden), danach der reguläre "Weiter"-Button. **Bewusst kein Direktsprung zur nächsten Frage** — das Kind soll den aufgelösten Namen und die Zusatzinfos noch sehen können, konsistent mit dem bestehenden Ablauf, keine Sonderlogik nötig.

**Wichtige visuelle Unterscheidung zum echten Lösen (UX-Entscheidung):** Eine unveränderte Anzeige wie beim selbstständigen Lösen (grünes "✓ Super gemacht!"-Feedback, grün gefüllte Kästchen) wäre irreführend — sie würde ein falsches "alles selbst richtig erkannt"-Signal geben. Stattdessen:
- Aufgelöste Buchstaben-Kästchen nutzen einen **neutralen** Darstellungs-Zustand (analog zu `.letter-box--given`, nicht das grüne `.letter-box--filled`/"richtig"-Grün).
- Der Feedback-Text wechselt von "✓ Super gemacht! Richtig ergänzt!" zu einer neutralen Formulierung, z. B. **"Hier ist die Lösung: {Name}"** (kein Häkchen-Icon, keine grüne Erfolgsfarbe).

**Zählung im Ergebnis — final entschieden (Nutzer, 20.08.2026):** Eine aufgelöste Frage wird im Rundenergebnis **separat ausgewiesen**, statt unverändert nur als "richtig" mitzuzählen oder als "nicht richtig" gewertet zu werden. Score/Total bleiben unverändert "N von N richtig" (bestehende, bewusst dokumentierte Produktentscheidung aus Issue #46: "das Kind löst durch Wiederholung immer richtig" bleibt erhalten — kein Scheitern-Framing wird eingeführt), zusätzlich wird aber ausgewiesen, wie viele der N Fragen aufgelöst statt eigenständig gelöst wurden, z. B. **"Du hast 10 von 10 Fragen richtig beantwortet, davon 2 aufgelöst!"** — der Zusatz erscheint nur bei mindestens 1 aufgelöster Frage (Hauptsatz des Ergebnis-Bildschirms, `result.js`, sowie analog in der Verlaufsliste, Issue #14/#36). Damit bleibt die *visuelle* Unterscheidung während der Frage (siehe oben) konsistent mit der Zählweise im Endergebnis — beides signalisiert ehrlich, was das Kind selbst geleistet hat, ohne ein Scheitern-Framing einzuführen.

**Technische Umsetzung (mit `software-architect` abgestimmt, 20.08.2026):** `recordAnswer()` (`src/quiz/state.js`) bekommt einen zusätzlichen optionalen Parameter `resolved` (boolean, Default `false`), der pro Antwort im bestehenden `answers[]`-Array vermerkt wird (analog zu `correct`) — die Anzahl aufgelöster Fragen wird bei Rundenende aus `answers.filter(a => a.resolved).length` abgeleitet, keine separate Zählvariable. `saveResultToHistory()` (`src/quiz/history.js`) bekommt ein zusätzliches **optionales** Feld `resolvedCount` im Verlaufseintrag — exakt dasselbe rückwärtskompatible Muster wie das optionale `mode`-Feld aus Issue #36 (kein Backfill für Alt-Einträge, Anzeige-Fallback ausschließlich in `result.js`). Bestätigt: keine Breaking Change der bestehenden `results`-Datenstruktur. Vollständige Akzeptanzkriterien siehe Issue #52.

**Barrierefreiheit:** Button als echtes `<button>`-Element, per Tastatur erreichbar/auslösbar (Tab-Reihenfolge nach den Buchstaben-Kästchen, vor dem "Weiter"-Button), mit `aria-label` (siehe oben) statt reinem Icon-Button. Der Zustandswechsel (Kästchen gefüllt, Feedback-Text erscheint) läuft über den bestehenden `aria-live="polite"`-Bereich (`.question-screen__feedback`), keine neue Ankündigungslogik nötig.

## Kindgerechtes Redesign: Visuelle Spezifikation (20.08.2026, `ux-design`, Claude-Design-Handoff)

**Anlass:** Der Nutzer hat mit Claude Design ein komplettes visuelles Redesign gestaltet (Handoff-Bundle, High-Fidelity-Prototyp `Tierquiz Kids.dc.html`). Spielablauf/Datenlogik bleiben unverändert — reine Optik-/Typo-/Feedback-Aufbau-Erneuerung plus drei neue Motivations-Features (Sticker-Album, Konfetti, Maskottchen "Fine"). Diese Spezifikation ist die verbindliche Quelle für `web-developer` — das Original-Handoff-Bundle liegt außerhalb des Repos (`~/Downloads/`) und ist **nicht** die Quelle der Wahrheit für künftige Sessions.

### Design-Tokens

| Token | Wert | Verwendung |
|---|---|---|
| `--ink` | `#231A45` | Text, alle Rahmen, alle Schatten |
| `--paper` | `#FFF3E2` | Seitenhintergrund |
| `--card` | `#ffffff` | Kartenflächen, unbeantwortete Kacheln |
| `--sky` | `#9CD5F2` | Auswahl-Zustand, richtige Antwort, Ergebnis-Panel, Score-Badge |
| `--sand` | `#F3DFA8` | Logo-Kachel, Maskottchen-Karte, Album-Badge, aktiver Fortschrittspunkt |
| `--sand-soft` | `#FBEFDC` | Medien-Karte, vorgegebene Buchstaben, Memory-Rückseite |
| `--blush` | `#F4E7E4` | Feedback bei falscher Antwort, gewählte falsche Kachel |
| `--muted` | `#8B7BA8` | Sekundärtext, Labels — **siehe Kontrast-Korrektur unten** |
| `--link` | `#2A6E93` | Links (`a`), Hover → `#231A45` |
| Radius | Karten `32px`, Buttons/Kacheln `24px`, kleine Boxen `18–22px`, Pills `999px` | |
| Rahmen | Karten/Buttons `4px solid var(--ink)`; kleine Elemente `3px` | |
| Schatten | Karten `0 10px 0 #231A45`, Buttons `0 8px 0 #231A45`, Pills `0 6px 0 #231A45` (harter Offset, kein Blur) | |
| Spacing | 8 / 12 / 16 / 22 / 26 / 34 px | |

### Barrierefreiheits-Korrektur: `--muted` verletzt WCAG AA (blockierend, vor Umsetzung zu fixen)

Bestehende Konvention in `global.css` (siehe Header-Kommentar dort): alle Farbpaarungen sind gegen ≥4.5:1 (Normaltext) / ≥3:1 (UI/Großtext) geprüft. Ich habe die neuen Tokens gegen dieselbe Schwelle real berechnet (WCAG-Relativluminanz-Formel, nicht geschätzt):

| Paarung | Kontrast | Schwelle | Ergebnis |
|---|---|---|---|
| `--ink` auf `--paper` | 14,7:1 | 4,5:1 | ✅ |
| `--ink` auf `--sky` | 10,1:1 | 4,5:1 | ✅ |
| `--ink` auf `--sand` | 12,2:1 | 4,5:1 | ✅ |
| `--ink` auf `--blush` | 13,3:1 | 4,5:1 | ✅ |
| `--link` auf `--card` | 5,6:1 | 4,5:1 | ✅ |
| `--muted` auf `--paper` | 3,49:1 | 4,5:1 | ❌ **fehlt** |
| `--muted` auf `--card` | 3,82:1 | 4,5:1 | ❌ **fehlt** |
| `--muted` auf `--blush` | 3,17:1 | 4,5:1 | ❌ **fehlt** |

`--muted` fällt bei **jeder** im Handoff spezifizierten Textverwendung (Labels 13–15px, Sekundärtext, "gewählt & falsch"-Feedbacktext auf `--blush`) unter die Schwelle — passiert nur die 3:1-UI-Schwelle, nicht die 4,5:1-Textschwelle, obwohl es laut Spec als lesbarer Text (nicht nur Dekoration/Icon) eingesetzt wird. Das ist kein Stilbruch-Risiko, sondern ein echter, gemessener Verstoß gegen die im Projekt bereits etablierte Konvention.

**Fix, zwei gleichwertige Optionen für `web-developer`/finale Entscheidung bei Umsetzung:**
1. `--muted` dunkler ziehen (Ziel-Relativluminanz ≤ 0,143, also spürbar dunkler als der aktuelle Wert — passt den Farbton an, ohne den Rest der Palette zu berühren), **oder**
2. Wo Text (nicht Icon/Dekoration) betroffen ist, `--ink` mit reduzierter Opazität statt `--muted` verwenden — Muster existiert im Handoff bereits an anderer Stelle (Infosatz nutzt `opacity:.75` auf dunklem Text) und ist damit kein neues Konzept.
Beide Optionen sind vor Story-Freigabe der Token-Story zu verifizieren (Akzeptanzkriterium: gemessener Kontrast ≥4,5:1 überall wo `--muted`/Ersatz als Text auf Fläche dient), nicht nachträglich.

### Typografie

- Headings: **Baloo 2**, 800. H1 Start `76px`, H1 Frage `44px`, Feedback-Titel `52px`, Ergebnis-Zahl `120px`, Kachel-Label `32px`.
- Body: **Nunito**, 700/800. Fließtext `19–25px`, Labels `13–15px` (uppercase, `letter-spacing:.1em`).
- Minimum im gesamten UI: 15px; alle Antwort-/Aktionsflächen ≥88px hoch (Kacheln 128px, Memory-Karten 150px, Buchstabenboxen 78×96px).
- Font-Loading: selbst gehostete `.woff2` (siehe `architecture.md`, Abschnitt "Kindgerechtes Redesign: Technische Leitplanken") — kein Google-Fonts-CDN.

### Button-Verhalten ("haptische" Druck-Mechanik, gilt für alle Kacheln/Buttons inkl. Memory-Karten/Buchstabenboxen)

```css
.k-btn { border:4px solid var(--ink); border-radius:24px; box-shadow:0 8px 0 var(--ink);
         transition:transform .12s, box-shadow .12s, background .12s; }
.k-btn:hover:not(:disabled) { transform:translateY(3px); box-shadow:0 5px 0 var(--ink); }
.k-btn:active:not(:disabled) { transform:translateY(8px); box-shadow:0 0 0 var(--ink); }
.k-btn:focus-visible { outline:5px solid #9CD5F2; outline-offset:4px; }
```

### Keyframes + Barrierefreiheit (bereits korrekt spezifiziert, deckt sich mit bestehender Konvention)

```css
@keyframes k-pop { 0%{transform:scale(.7) rotate(-6deg)} 55%{transform:scale(1.08) rotate(2deg)} 100%{transform:scale(1) rotate(0)} }
@keyframes k-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
@keyframes k-wiggle { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
@keyframes k-conf { 0%{transform:translate3d(0,-30px,0) rotate(0);opacity:1}
                    100%{transform:translate3d(var(--dx),640px,0) rotate(var(--rot));opacity:0} }
```
`@media (prefers-reduced-motion: reduce)`: `k-conf`/`k-float`/`k-wiggle` deaktivieren, `k-pop` auf reine Opazitätsänderung reduzieren — **bereits korrekt im Handoff spezifiziert**, deckt sich mit der bestehenden globalen `prefers-reduced-motion`-Konvention in `global.css` (keine Lücke gefunden).

### Screens (Kurzfassung je Screen — exakte px-/Klassen-Werte final, siehe Story-Issues für vollständige Akzeptanzkriterien)

- **Kopfzeile (alle Screens, neu — schließt Issue #66 mit ein):** Logo-Kachel 52×52 (`k-wiggle`), Wortmarke, Modus-Pill links; Fortschritts-Pills (ein Punkt pro Frage: beantwortet=`--sky`, aktuell=`--sand`, offen=weiß) + Score-Badge rechts. **Enthält den Home-/Zurück-Button aus Issue #66** — bisher hatte kein Screen irgendeine Navigations-Chrome (verifiziert), dieser Screen führt sie erstmals ein, statt sie separat pro Screen nachzurüsten.
- **Start:** Grid `1fr 400px`. Links: H1, 3-Schritte-Auswahl (Spielmodus 5 Kacheln, Schwierigkeit 2, Rundenlänge 3), CTA. Rechts: Maskottchen-Karte (Platzhalter, siehe unten) mit Sprechblase, darunter Album-Vorschau (Grid 4×3, `N/12`).
- **Frage (Quizfragen/Wer bin ich?/Tiergeräusche):** Grid `460px 1fr`. Medienkarte links (variiert je Modus — Foto+Button / Foto dauerhaft / Play-Karte), Fragekarte rechts mit Vorlesebutton, Antwortkacheln 2×2 (2 bei Verwechslungspaaren).
- **Buchstabensuche:** Foto-Karte + Buchstabenreihe (78×96 Boxen), Fehlerzeile reserviert (kein Layout-Sprung), "Lösung zeigen" zurückhaltend gestaltet.
- **Tier-Memory:** eine Karte, Grid 6 Spalten, Rückseite `--sand-soft` + 🐾, aufgedeckt weiß + `k-pop`, Paar gefunden `--sky`.
- **Feedback-Panel** (alle Modi außer Memory): Grid `130px 1fr 320px` — Maskottchen-Platzhalter, Titel+Fun-Fact-Box+Infosatz (bestehende `buildInfoSentence()`/Wikipedia-Link-Logik unverändert wiederverwendet), Sticker-Karte (Foto+Name+"NEU!"-Pill bei Album-Neuzugang) + Weiter-Button. Konfetti-Trigger bei richtiger Antwort.
- **Ergebnis:** Score `120px`, Ermutigungssatz (`getEncouragement()` unverändert), Album-Zusammenfassung, Album-Karte 3 Spalten. Konfetti bei Rundenende. Memory-Variante: eigener Satz, kein Verlaufseintrag (bestehendes Verhalten).

### Maskottchen "Fine" — Platzhalter-Entscheidung

Illustration existiert noch nicht. `software-architect` bestätigt: technisch problemlos später austauschbar, wenn von Anfang an über einen einzigen Asset-Pfad referenziert (siehe `architecture.md`). **UX-Entscheidung: mit Platzhalter starten** (gestreifte Textur wie im Prototyp, oder ersatzweise ein großes Emoji als Übergangslösung), echte Illustration als unabhängige, jederzeit nachschiebbare Folge-Story — kein Blocker für den Rest des Redesigns.

### Zielgruppen-Einschätzung (6–10 vs. 10–12 Jahre)

Das Handoff ist im Titel auf "7 Jahre" zugeschnitten, `requirements.md` definiert aber zwei Stufen (6–10/10–12). Einschätzung: **kein Blocker.** Die verspielten Motivations-Elemente (Maskottchen, Sticker, Konfetti, große abgerundete Baloo-2-Headlines) sind stilistisch näher an der jüngeren Gruppe, entfernen aber keine Funktionalität für die ältere Gruppe — Kachelgrößen/Kontraste/Bedienbarkeit gelten unverändert für beide Stufen, und niemand ist gezwungen, das Album zu beachten. Eine mögliche spätere Anpassung (z. B. dezenterer visueller Ton in der "Knifflig"-Stufe) ist eine optionale Geschmacksfrage, keine jetzt zu klärende Anforderungslücke.

### Fokus-Reihenfolge

Handoff verlangt "Frage → Hilfe → Antworten → Weiter". Ob das 1:1 der aktuellen DOM-Reihenfolge in `question.js`/`memory.js`/`letterSearch.js` entspricht, ist beim bestehenden Code nicht abschließend verifiziert (nur Funktionsnamen bekannt, nicht exakte Markup-Reihenfolge) — **Akzeptanzkriterium der jeweiligen Screen-Story**: `web-developer` verifiziert die reale Tab-Reihenfolge nach dem Umbau, nicht nur übernehmen, dass sie automatisch passt.

## Sterne-/Maskottchen-Freischaltsystem (21.08.2026, `ux-design`, konsultiert von `business-analyst`)

Ergänzung zum bereits gemergten Kids-Redesign (PR #78), Handoff-Datei "CHANGES-sterne-maskottchen.md": Runden-Sterne (≥5 richtige Tiere = 1 Stern, Memory: vollständig gelöst = immer 1 Stern), 5 Sterne = 1 von 50 wählbaren Maskottchen, Karussell unter dem Album, Album 12→9.

### Stern-Icon-Kollision im Header — Empfehlung: Rundenpunktestand bekommt eigenes Icon, ⭐ bleibt exklusiv der Maskottchen-Währung vorbehalten

Der bestehende Header zeigt während einer laufenden Frage-Runde bereits "⭐ {score}" (`.app-header__score`, Anzahl bisher richtiger Antworten dieser Runde). Die neue Spezifikation will zusätzlich ein persistentes Sterne-Badge "⭐ {stars}/5" im selben Header — beide gleichzeitig sichtbar während einer laufenden Runde, beide mit ⭐. Das ist für die Zielgruppe (6–12 Jahre) eine echte Verwechslungsgefahr: zwei ⭐-Zahlen im selben Sichtfeld ohne erkennbaren Bedeutungsunterschied.

**Entscheidung:** ⭐ wird projektweit exklusiv zum Symbol der persistenten Maskottchen-Währung (taucht so bereits an vielen weiteren Stellen auf: Sterne-Box im Ergebnis, Album-Fußnote, Karussell-Hinweiszeile — ⭐ dort umzubenennen würde mehr Inkonsistenz erzeugen als der schmalere bestehende Rundenpunktestand). Der bestehende Rundenpunktestand (`.app-header__score`) wechselt stattdessen von "⭐ {score}" auf **"✓ {score}"** — das Häkchen-Symbol ist im Projekt bereits fest als "richtig beantwortet"-Symbol etabliert (`.answer-tile--correct .answer-tile__icon` zeigt exakt dieses ✓ nach jeder richtigen Antwort), die Wiederverwendung ist daher naheliegend statt eine dritte, neue Bedeutung einzuführen. Ergebnis: ⭐ bedeutet ab sofort im gesamten Header/UI immer "Sterne Richtung nächstem Maskottchen", ✓ bedeutet immer "richtige Antworten in dieser Runde" — beide Badges können nebeneinander stehen, ohne dass ein Kind zwischen zwei gleich aussehenden Zahlen raten muss. Reine Text-/Icon-Änderung in `header.js`, kein Layout-Umbau nötig.

### Singular/Plural-Copy ("1 Stern" / "N Sterne")

Kein bestehender Präzedenzfall wiederverwendbar: Der scheinbar ähnliche Fall aus Issue #52 (`resolvedCount`, "davon X aufgelöst") brauchte nie eine echte Singular/Plural-Unterscheidung, da "aufgelöst" im Deutschen nicht dekliniert wird — dort reichte ein einfaches `> 0`-Gate ohne Wortformwechsel. Für "Stern"/"Sterne" ist dagegen eine echte grammatikalische Unterscheidung nötig. **Empfehlung:** ein einziger kleiner Helper (z. B. `formatStars(n) => n === 1 ? "1 Stern" : \`${n} Sterne\`\`), da Deutsch bei Zählung nur zwischen genau 1 und "alles andere" unterscheidet (kein Sonderfall für 0, "0 Sterne" ist korrekt) — keine Bibliothek nötig, reine Ternary genügt für diesen einen Anwendungsfall.

### Barrierefreiheit

- Header-Stern-Badge: als `<button>` mit `aria-label="{stars} Sterne — neues Maskottchen wählen"` (bei `canRedeem`) bzw. `disabled`+`aria-disabled="true"` (sonst) — wie im Handoff vorgesehen, keine Ergänzung nötig.
- Karussell-Pfeile: zusätzlich zu `disabled` an den Rändern je ein `aria-label` ("Vorheriges Maskottchen"/"Nächstes Maskottchen" statt nur "←"/"→", da reine Pfeil-Glyphen für Screenreader nicht aussagekräftig sind).
- Karussell-Bühne: `aria-live="polite"` auf dem Bühnen-Container (analog zum bestehenden Muster bei `.reverse-image-frame`, siehe Frage-/Feedback-Bildschirm "Wer bin ich?"), damit ein Wechsel des angezeigten Maskottchens per Pfeil-Klick auch ohne visuellen Fokuswechsel angekündigt wird.
- Freischaltung: kurze `role="status"`-Ankündigung ("Neues Maskottchen freigeschaltet: {Name}") nach erfolgreichem Einlösen, konsistent mit bestehenden Status-Ankündigungsmustern im Projekt (z. B. Feedback-Text-Bereiche).
- Maskottchen-Kacheln in der Auswahl: echte `<button>`-Elemente, natürliche Tab-Reihenfolge im Grid (kein manuelles `tabindex` nötig), Mindest-Tapfläche wie bei bestehenden Kacheln (min-height 132px laut Handoff liegt bereits deutlich über der 44×44px-Mindestgröße).

### Guide-Sprechblase je Maskottchen — kein separates Zitat nötig

Die Handoff-Tabelle liefert pro Maskottchen nur Name + Rolle (z. B. "rät neugierig mit"), keine 50 einzelnen Sprechblasen-Zitate. **Entscheidung:** Die vorhandene "Rolle"-Spalte wird direkt als Sprechblasentext wiederverwendet (z. B. "Fine, dein Tierguide" / "rät neugierig mit") statt 50 neue Zitate zu erfinden, die im Handoff nicht vorgesehen sind — die Rollenbeschreibungen sind bereits so formuliert, dass sie als kurzer Guide-Kommentar funktionieren, ohne zusätzlichen Content-Aufwand.

### Layout-Auswirkung Album 12→9 + Karussell

Kein Konflikt mit "Kein Scrollen bei der Kernaufgabe" — diese Vorgabe gilt für die Kernaufgaben-Screens (Frage/Feedback), nicht für Start-/Ergebnis-Screen (dort ist Scrollen bereits an anderer Stelle toleriert, siehe Tier-Memory-Board-Vorgabe). Die Album-Verkleinerung 3×3 statt 4×3 reduziert zudem die vertikal beanspruchte Fläche des Albums selbst, was das neu hinzukommende Karussell darunter größtenteils kompensiert. **Akzeptanzkriterium für die Umsetzung:** `web-developer` prüft die reale Bildschirmhöhe auf Start- und Ergebnis-Screen nach dem Umbau per Screenshot (etablierter Verifikationsstandard dieses Projekts), keine reine Annahme.

## Entscheidungen aus Klärungsrunde (13.08.2026)

Alle vorherigen offenen Fragen sind geklärt: Zielalter → zwei Stufen 6–10/10–12 (siehe "Zielgruppe"), Sound-Effekte → nein, Fragenanzahl → 10 pro Runde (fest), Weiter-Mechanik → manueller Button, Sprache → Deutsch. Details jeweils in den Abschnitten oben eingearbeitet.
