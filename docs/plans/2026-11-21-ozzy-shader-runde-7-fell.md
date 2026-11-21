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
