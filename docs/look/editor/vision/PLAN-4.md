# Runde 4 (13.11.2026): Die Ecke (Florians Vision)

Analyse und Denkfehler: [`VISION-4.md`](VISION-4.md). Florians Antworten auf die offenen Fragen (wörtlich):

- Projektionen: „beim drehen der ansicht drehen sich auch die projektionen synchron so, dass sie dann alle genau
  übereinanderlegen könne. Die projektionen sind also eigentlich auch echte 3d ansichten“
- Grund: hell.
- Zwei Arten zu drehen: eine Taste schaltet um.

## Das Modell (so baue ich es)

**Drei Projektionen sind drei echte Ansichten des Wesens** (Cyan = Seite, Magenta = Front, Gelb = Top), jede mit eigener
Blickrichtung, gezeichnet als flache Druckfarbe (multipliziert) auf einer Tafel im Raum. Zwei Zustände, die weich ineinander
übergehen (Wert `t` von 0 bis 1):

| | Raum drehen (`t` → 0) | Wesen drehen (`t` → 1) |
|---|---|---|
| was sich dreht | die Kamera um alles (Licht dreht mit) | nur das Wesen (Licht bleibt) |
| Projektionen | auf den unsichtbaren Wänden hinter dem Wesen, Blick genau Seite, Front, Top | wandern zum Wesen, ihre Blickrichtung dreht sich synchron zur Kamera, bis alle drei deckungsgleich auf dem Wesen liegen |
| Wesen | Drahtmodell (Kurvennetz und Umriss), die Projektionen scheinen durch | wo die drei sich decken, entsteht das Material: ruhig, matt, gut lesbare Linien und Griffe |

Eine Taste (Tab) schaltet um; der Übergang ist die Vorführung: Die Tafeln lösen sich von den Wänden, drehen sich zur Kamera,
legen sich übereinander, und aus der Deckung wird das Material. Zurück entfaltet es sich wieder auf die Wände.

**Achsen:** Nahe Seite, Front, Top rastet die Kamera ein (Dolly-Zoom); die Projektion dieser Achse wird zur flachen Ansicht über
den ganzen Schirm, das Drahtmodell liegt genau darauf. 1/3/7 halten oder tippen wie in Runde 3.

**Viereransicht:** Taste 4: Die Wände klappen auf zum Blatt (Seite oben links, Front oben rechts, Top unten links, Raum unten
rechts), die Tafeln gleiten in ihre Felder. Noch einmal 4: zurück in die Ecke.

**Start:** Seitenansicht, leeres Papier, Stift P (Klick = Punkt, Ziehen = Griff, Klick auf den ersten Punkt = schließen).
Bestätigen (Enter oder Doppelklick): Die Ansicht zieht sich nach hinten, die Spiegelkante (der gezeichnete Umriss in der
Mittelebene) bleibt stehen, das Wesen bläst sich wackelnd auf (gedämpfte Feder, wie von einem Windzug aus der weggezogenen
Seitenansicht). Dann Drahtmodell, drei Projektionen an den Wänden der Ecke (Wände nicht gezeichnet), am Boden ein Quadrat
(ein Feld des 2048-Spiels).

## Gestaltung

- **Grund:** warmes Weiß, kein Glühen, kein Schein. Schatten nur als weicher Kontaktschatten unter dem Wesen.
- **Projektionen:** reine, flache Druckfarbe mit feiner gleichfarbiger Kante, überlagert multipliziert (Cyan + Magenta = Blau
  usw.). Nichts aus den alten Looks (keine Petrol-Kontur, kein Passer, kein Raster, kein langer Schatten).
- **Drahtmodell:** Kurvennetz in dunkler Tinte, Kiel stärker, verdeckte Linien fein und hell, dazu die Umrisslinie.
- **Material:** matt, hell, kühl-warme Schattierung (Gooch), damit dunkle Linien lesbar bleiben; Griffe als weiße Scheiben mit
  dunklem Ring, Ecken als Raute, gewählt in Florians Lila.
- **Bewegung:** jede Animation erklärt eine Veränderung (wohin etwas geht, woher es kommt), 150 bis 450 ms, unterbrechbar;
  Feder nur dort, wo etwas weich ist (Aufblasen, Einrasten).

## Bauplan

1. Seite `ecke.html` (`src/werkstatt/ecke.js`, erbt die Werft: Kamera, Flächen, Nachzeichnen, Haut, federnde Ansichten).
2. Heller Grund, Drahtmodell, Projektionen auf den Wänden (Raum drehen).
3. Wesen drehen (Tab): Tafeln wandern, Blickrichtungen drehen synchron, Deckung → Material.
4. Achsen-Morph zur flachen Ansicht; Viereransicht (4).
5. Start: Umriss mit dem Stift, Aufblasen mit Feder.
6. Prüfen mit Mauszügen, Filme, Präsentation (gleiche Adresse), Push.
