# Prototyp „Kurven im Raum“

Lauffähige Vision des Kurven-Editors: Raum, Blatt und Blick mit Faltung, eine Gestengrammatik ohne Werkzeugleiste, Licht statt
Beschriftung. Konzept: [`../KONZEPT.md`](../KONZEPT.md), Recherche: [`../RECHERCHE.md`](../RECHERCHE.md), Präsentation:
https://claude.ai/artifact/SahX9VLKYfxFbmhNPNs18f (Prototyp darin als `vision.html`, Einstellungen über den Anker).

## Runde 4 (13.11.2026): die Ecke

Drei Ansichten als Druckfarben (Cyan Seite, Magenta Front, Gelb Top) an den unsichtbaren Wänden einer Ecke. Jede ist eine
echte Ansicht mit eigenem Projektor. Tab: Wesen drehen; die Ansichten gleiten an der Wand einer unsichtbaren Kugel hinter das
Wesen und decken sich dort, in ihrer Schnittmenge entsteht auf dem Wesen das Material. Start mit dem Stift in der Seitenansicht. Prüfung der Vision: [`../VISION-4.md`](../VISION-4.md),
Plan: [`../PLAN-4.md`](../PLAN-4.md).

```bash
node bau.mjs src/einstieg/ecke.js dist/ecke.html "Ecke"
# Standard: Start mit dem Stift auf leerem Papier. Ohne Stift: ?start=0&form=vogel (im Artefakt: #vogel-ohnestift)
# Größe der Kugel (halbe Diagonalen des Wesens, Standard 3,4): ?kugel=6 (im Artefakt: #vogel-ohnestift-kugel6)
node film2.cjs dist/ecke.html stift <film.mp4> 960 600                          # auch: start
node film2.cjs dist/ecke.html tab <film.mp4> 960 600 25 20 "start=0&form=vogel"  # auch: drehen, achse, vier
node pruefe.cjs dist/ecke.html <ordner> <schritte.js> 1280 800 "start=0&form=vogel"
```

| Taste, Geste | Wirkung |
|---|---|
| Stift (Start) | Klick = Ecke, Ziehen = glatter Punkt mit Griffen, Klick auf den ersten Punkt = schließen, <kbd>Enter</kbd> oder Doppelklick = bestätigen, <kbd>⌫</kbd> = letzter Punkt weg, <kbd>Esc</kbd> = neu |
| Leere ziehen | drehen. Raum: alles dreht sich, die Ansichten bleiben an den Wänden. Wesen (nach Tab): nur das Wesen dreht sich, Licht und Fliese bleiben |
| <kbd>Tab</kbd> | Raum drehen ↔ Wesen drehen (die Ansichten wandern ins Wesen, wo sich alle drei decken, entsteht das Material) |
| <kbd>4</kbd> | Viereransicht ↔ Ecke (Seite oben links, Front oben rechts, Top unten links, Raum unten rechts; in jedem Feld bearbeitbar) |
| <kbd>1</kbd> <kbd>3</kbd> <kbd>7</kbd> halten oder tippen, <kbd>0</kbd> | Seite, Front, Top: flach, die Druckfarbe der Achse liegt genau unter dem Drahtmodell; <kbd>0</kbd> = Raum |
| sonst | wie in der Werft: Punkte und Griffe ziehen, Haut formen, Nachzeichnen, Spant schneiden, Rad, <kbd>⌘Z</kbd>, <kbd>?</kbd> Vorführung |

| Datei | Inhalt |
|---|---|
| `src/werkstatt/ecke.js` | Klasse `Ecke` (erbt `Werft`): Projektoren und Tafeln, Deckung je Druckfarbe, Zusammensetzen (Transparentpapier, Material), Licht und Fliese, Tab, Viereransicht, Stift, Aufblasen, Vorführungen |
| `src/werkstatt/aufblasen.js` | Umriss → Poisson (Δf = −2) → z = ±κ√f → Surface Nets → Rand auf den Umriss → Taubin; drei Spanten aus Querschnitten |
| `src/werkstatt/shader2.js` | neu: `tafelVS/FS`, `tafelDeckFS`, `koerperZusammenFS`, `bodenEckeVS/FS`, `goochFS` |

`pruefe.cjs` wartet jetzt nach jedem Bild auf die Grafik (liest einen Bildpunkt); sonst staut sich die Arbeit des
Software-Renderers bis zum Screenshot und läuft in die Zeitgrenze.

## Runde 3 (13.11.2026): die Werft

Ein Bild, jede Kurve in ihrer Fläche, federnde Ansichten, Jelly ↔ Illustration, Haut formen, Nachzeichnen.
Plan und Abwägung: [`../PLAN-3.md`](../PLAN-3.md).

```bash
node bau.mjs src/einstieg/werft.js dist/werft.html "Werft"
node film2.cjs dist/werft.html start <film.mp4> 1280 800        # Vorführung; kurze Filme: ebene, achse, haut, nach, spant, feder
```

`src/werkstatt/werft.js` erbt die Kamera der Bullaugen (Dolly-Zoom, Einrasten) und ersetzt Zeichnen, Formensprache und Züge.
Neue Shader in `src/werkstatt/shader2.js`: `konturFS`, `ebeneVS/FS`, `bodenFS`.

## Runde 2 (13.11.2026): drei Vollbild-Prototypen, Maus zuerst

| Seite | Einstieg | Idee |
|---|---|---|
| `dist/bullaugen.html` | `src/einstieg/bullaugen.js` | eine große Ansicht auf dem Drehteller; Seite, Front, Top als Bullaugen, die zum Punkt unter dem Zeiger kommen |
| `dist/modellblatt.html` | `src/einstieg/modellblatt.js` | Turnaround auf Papier (Front, ¾, Seite, ¾ hinten, Rücken, Draufsicht, zwei Farbansichten), Konstruktionslinien |
| `dist/platten.html` | `src/einstieg/platten.js` | Seite, Front, Top als Risograph-Platten übereinander; Passerkreuze, Tab legt sie nebeneinander |

```bash
node bau.mjs src/einstieg/bullaugen.js dist/bullaugen.html "Bullaugen"
node bau.mjs src/einstieg/modellblatt.js dist/modellblatt.html "Modellblatt"
node bau.mjs src/einstieg/platten.js dist/platten.html "Drei Platten"
node pruefe.cjs dist/bullaugen.html <ordner> <schritte.js>      # Prüfbilder mit echten Mauszügen (Filmuhr)
node film2.cjs dist/bullaugen.html start <film.mp4> 1280 800     # Film der Geistermaus-Vorführung
```

Die Form ist `vogel` (strange bird), sonst `#kugel`, `#fisch`, `#kaputt`. `?geist=0` startet ohne Vorführung.

| Datei | Inhalt |
|---|---|
| `src/werkstatt/basis.js` | Klasse `Werkstatt` (erbt `App`): Klicks wie im Editor, Schweben, Bildtakt, Überlagerung, Stand für die Vorführung |
| `src/werkstatt/maus.js` | Grammatik: links auf Leere/Haut dreht, links auf Dingen bearbeitet, rechts/⌥/P zeichnet, Rad, Mitte/Leertaste, Tasten, iPad |
| `src/werkstatt/zeiger.js`, `geist.js` | Zeiger als kleinste Zeichen; Geistermaus (Vorführung beim Start, `?`) und Filmuhr |
| `src/werkstatt/sichten.js` | Parallelansicht aus jedem Winkel, Kamera mit Dolly-Zoom zur Parallelansicht |
| `src/werkstatt/shader2.js` | Grund, Drehteller, Bullauge (Glas), Papierkorn, Risograph-Platte (Raster, Umriss, Korn) |
| `src/werkstatt/bullaugen.js`, `modellblatt.js`, `platten.js` | die drei Layouts samt Drehbuch der Vorführung |

## Bauen und Starten (Runde 1)

```bash
npm i three@0.170.0 esbuild@0.24.0     # einmal (oder NODE_MODULES=<pfad> setzen)
node bau.mjs src/main.js dist/vision.html
open dist/vision.html                   # eine Datei, läuft ohne Server
```

Einstellungen über die Adresse (`?form=vogel&layout=blatt`) oder den Anker (`#vogel-blatt`, im Artefakt):

| Schlüssel | Werte |
|---|---|
| Form | `kugel` (Start mit Mittellinie), `vogel` (strange bird), `fisch` (teat firefish), `kaputt` (test_kaputt) |
| Layout | `raum` (Start), `blatt`, `seite`, `front`, `top` |
| Varianten | `leeredreht` (ein Finger auf der Leere dreht; Striche beginnen auf der Haut), `ton`, `ohneseife`, `zeigen` (Geisterhand führt vor) |

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/netz.js` | Netz der Haut (Ruhe, aktuelle Lage, Dreiecke, Spiegelpartner, Strahl, nächster Punkt), Ikosaeder-Kugel |
| `src/linien.js` | Loops als Bézier (`mitte`, `ring`, `paar`), Proben, Punkt einsetzen (de Casteljau) und löschen (Schneider-Anpassung) |
| `src/rbf.js`, `src/haut.js` | Ersatzlöser: Verformung mit radialen Basisfunktionen durch die Proben der Linien; Zugbasis für flüssige Züge |
| `src/schnitt.js` | Strich → Loop (Nulldurchgänge der Strichfläche auf dem Netz), geschlossener Strich → Form, Kreuzungen |
| `src/zeichner.js`, `src/shader.js` | three.js: Jelly, Papier mit Platten und langem Schatten (Sprungflutung), Linienbänder, Punkte, Wände, Strahlen, Glas |
| `src/raum.js`, `src/ansichten.js` | Raumecke, Faltung, Blatt-Layout (Projektionsmethode 1), Ansichten |
| `src/app.js`, `src/bild.js`, `src/werkzeuge.js` | Handlungen, Geschichte, Pose, Bildschleife, Wände als Ansichten (Interactive Shadows), Überlagerung |
| `src/eingabe.js` | Grammatik für Finger, Maus und Trackpad |
| `src/film.js` | Geisterfinger und Filme (`?film=raum|werkstatt|roentgen`) |
| `src/formen.js`, `daten/`, `werkzeug/wesen_lesen.py` | Florians gesicherte Formen (`.eewesen`) als Ruhenetz mit ihren Loops |
| `film.cjs`, `stand.cjs`, `schau.cjs` | Filme, Standbilder, Prüfbilder mit Playwright |

## Grenzen

Die Haut ist nicht Florians Löser: Sie geht genau durch die Linien und ist für gleiche Linien immer gleich, bläst sich aber nicht
auf und kennt keine echten Kanten. Das Maul ist ein einfacher Kieferknochen. Geprüft nur in Chromium mit Software-Grafik
(Maus und simulierte Finger), nicht auf dem iPhone.
