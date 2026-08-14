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

- **Platzierung:** Fun Fact erscheint **unterhalb** des bestehenden Richtig/Falsch-Feedbacks, oberhalb des "Weiter"-Buttons — ergänzt das Feedback, ersetzt es nicht. Kein eigener Zwischenbildschirm, um den Ablauf nicht zusätzlich zu verlangsamen (Rundenlänge/Tempo ist laut Requirements bewusst schlicht gehalten).
- **Kein Fun Fact vorhanden:** Feedback-Bereich sieht exakt wie heute aus, keine leere Box/Platzhalter, kein "Kein Fun Fact verfügbar"-Hinweis — für das Kind darf nicht auffallen, dass hier "etwas fehlt". Layout darf sich also nicht abhängig vom Vorhandensein verschieben (fester Rahmen, der optional befüllt wird, oder Bereich komplett weggelassen).
- **Vorhanden:** Kurzer, visuell abgesetzter Block (z. B. eigenes Icon wie eine Glühbirne/ein Fragezeichen-Tier, dezente Hintergrundfarbe passend zur bestehenden Farbwelt), Einleitung kindgerecht framen ("Wusstest du schon?") statt trocken als Datenfeld zu präsentieren.
- **Beide Altersstufen:** Gleiche Darstellung für 6–10 und 10–12 — der Unterschied liegt im Textinhalt selbst (Aufgabe von `zoologe`: altersgerechte Formulierung), nicht in der UI-Behandlung.
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

## Entscheidungen aus Klärungsrunde (13.08.2026)

Alle vorherigen offenen Fragen sind geklärt: Zielalter → zwei Stufen 6–10/10–12 (siehe "Zielgruppe"), Sound-Effekte → nein, Fragenanzahl → 10 pro Runde (fest), Weiter-Mechanik → manueller Button, Sprache → Deutsch. Details jeweils in den Abschnitten oben eingearbeitet.
