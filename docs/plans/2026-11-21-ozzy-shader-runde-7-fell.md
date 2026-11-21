# Ozzy, Shader Runde 7: Fell nachschärfen (21.11.2026)

Florian auf die Frage, was als Nächstes kommt: „Fell zuerst“ (Wahl A: Ghibli-Ränder, Schaf, Tempo auf dem iPhone messen).
Zweig `claude/ozzy-shader`, Fenster 5219. Offenes davor: `docs/plans/2026-11-20-ozzy-shader-was-bleibt.md`, Punkte 26, 28, 30.

## Messung vorher (Testbrowser, Grafikkarte, „strange bird“, 1200 × 800 bei Pixeldichte 2)

Zeit je Bild samt Ozzy (Grund: Comicdruck), in Bewegung und im Stand (volle Güte):

| Zoom | Shader | Bewegung | Stand |
| --- | --- | --- | --- |
| 2,4 | Comicdruck (Grund) | 19,6 ms | 17,2 ms |
| 2,4 | Fell Ghibli | 42,6 ms | 76,5 ms |
| 2,4 | Fell Echt | 33,3 ms | 61,8 ms |
| 2,4 | Schaf | 40,9 ms | 84,1 ms |
| 6 | Comicdruck | 14,2 ms | 14,3 ms |
| 6 | Fell Ghibli | 73,0 ms | 183,9 ms |

Anteile bei Zoom 6 (Ghibli, je ein Teil abgeschaltet): die Suche nach dem Büschel rund 35 ms in Bewegung und 110 ms im Stand;
Deckung zu Abtastungen 6 und 80 ms; das Licht 9 und 40 ms. Das feine Netz (238 000 statt 59 000 Dreiecke) kostet bei Zoom 2,4
rund 10 ms. **Die Suche nach dem Büschel ist der größte Posten**, und sie hängt nur an der Wurzel, nicht an der Höhe der Schale.

## Was ich baue

1. **Tempo:** Büschel in einem raumzentrierten Gitter (zwei Kandidaten statt acht Zellen, kleine Streuung); dazu prüfen: in
   Bewegung ohne Abtastungen, Zahl der Schalen und Auflösung in Bewegung nach der Fläche im Bild.
2. **Ghibli-Ränder:** die Haare eines Büschels verschmelzen zu einer Strähne, die nur an der Spitze in wenige Spitzen aufgeht;
   die Spitzen eines Büschels gleich lang; das Gitter im Weiß (Streuung der Höhe je Bildpunkt) ersetzen.
3. **Schaf:** Wolle als Stapel (Kuppeln mit feinen gekräuselten Fasern, dunkle Spalten dazwischen, einzelne Fasern darüber)
   statt Wendeln (die nah ein Netz aus Ringen zeichnen). Gilt für den Felltyp „Locken“.
4. **iPhone:** Fenster 5219 im WLAN (`--host`), Adresse mit `info=1` (zeigt Bilder je Sekunde); Florian liest ab.

## Proben (vorher festgelegt)

- Tempo: Ghibli in Bewegung bei Zoom 2,4 unter 30 ms (heute 42,6), bei Zoom 6 unter 40 ms (heute 73); im Stand bei Zoom 6
  unter 100 ms (heute 184). Bild vorher und nachher gleich (nah und Übersicht).
- Ghibli: nah (Zoom 6, Fuchs) Ränder ohne Kratzer und kein Gitter im Weiß; die Übersicht bleibt.
- Schaf: nah Stapel mit Kräuselung statt Ringen; in der Übersicht weiter Vlies.

## Stand (21.11.2026): gebaut

Bilder vorher | nachher: `docs/progress/ozzy/shader/2026-11-21-runde-7-fell.png` (Ghibli, Schaf), `…-runde-7-fell-andere.png`
(Echt und Anime: gleicher Look, nur schneller).

- **Tempo:** Büschel (Echt, Ghibli, Plüsch, Wolle) im raumzentrierten Raster mit zwei Kandidaten (`zelleBcc` in `schalen.ts`),
  die Flammen (Anime, Spider-Verse, Manga) mit vier (je Teilraster die zwei nächsten); in Bewegung sinkt die Auflösung nach der
  Fläche der Form im Bild (70 %, ab einem Drittel 60 %, ab 60 % des Bilds 50 %); höchstens 32 statt 40 Schalen.
- **Ghibli:** Im Büschel rücken die Haare zur Mitte und wurden dabei bis zehnmal dünner (Punkte unter einem Bildpunkt: die Kratzer
  am Rand, das Strichgitter im Weiß). Jetzt behalten sie die halbe Dicke (`uZusammen` 0,5), nie dünner als 0,6 Bildpunkte, die
  Spitzen eines Büschels fast gleich lang (`uStreu`); die Striche an den Büschelspitzen leiser; wo das Fell nicht voll deckt,
  wird es im Zusammensetzen über eine kleine Scheibe gemittelt (gemalter weicher Rand, das Innere bleibt scharf). Ganz verschmolzen
  (`uZusammen` 1) wurden die Büschel zu glatten Schuppen: verworfen.
- **Schaf:** Wolle als Stapel (`wolle` in `fell.ts`; Felltyp Locken im Stil Echt): Kuppeln im raumzentrierten Raster, darauf kleine
  Kuppeln (Blumenkohl), flache Spalten, dichte gekräuselte Fasern; Licht matt nach der Neigung der Kuppel, tief im Stapel dunkel und
  gelblich. Schmale Stapel standen wie Stacheln; gestreute dünnere Fasern wirkten wie Gewebe: beides verworfen.

Messung nachher (gleicher Ablauf; der Grund schwankt zwischen den Läufen um einige Millisekunden):

| Zoom | Shader | Bewegung | Stand |
| --- | --- | --- | --- |
| 2,4 | Comicdruck (Grund) | 13,0 ms | 12,7 ms |
| 2,4 | Fell Ghibli | 28,0 ms (vorher 42,6) | 54,7 ms (76,5) |
| 2,4 | Fell Echt | 26,2 ms (33,3) | 45,6 ms (61,8) |
| 2,4 | Fell Anime | 26,3 ms (69,9) | 62,3 ms (140,3) |
| 2,4 | Schaf | 25,9 ms (40,9) | 57,5 ms (84,1) |
| 6 | Comicdruck | 11,7 ms | 10,3 ms |
| 6 | Fell Ghibli | 32,4 ms (73,0) | 100,7 ms (183,9) |
| 6 | Schaf | 32,0 ms | 109,9 ms |

Die drei Zielwerte für Ghibli sind erreicht (der Stand nah liegt auf der Grenze). **Am iPhone ist noch nichts gemessen:** Fenster
5219 läuft mit `--host`; Florian öffnet im selben WLAN `http://<Mac>:5219/ozzy.html?form=strange%20bird&shader=fell&info=1`, dreht
die Form und liest „B/s“ (Bilder je Sekunde) und „Bild … ms“ in der Zeile oben ab.
