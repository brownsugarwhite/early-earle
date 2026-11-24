# Ozzy, Shader: Fell nach Florians Vorlagen (24.11.2026)

Florian (wörtlich): „schau mal, ich habe so schöne haare gefunden. Die sehen deutlich besser aus als unsere. Bekommst du das mit
shadern exakt so hin?“

Vorlagen (`docs/look/ozzy/shader/vorlagen/2026-11-24-fell-*.png|webp`): 01 grün (kurz, gekämmt mit Wirbel), 02 Giraffe (kurzer
Plüsch mit Muster), 03 graubraun (Wildfell, mehrfarbig), 04 dunkelbraun lang (Stacheln in Büscheln, feine Haare am Umriss), 05 Katze,
06 braun (Wirbel oben, weiche Spitzen), 07 Zottel (lange, hängende Strähnen), 08 weiß mit Locken, 09 lila (weich, wellig), 10 violett
(lang, fließend, Farbverlauf), 11 türkis (dicht, wirr, leuchtend). Vergleich mit unserem Fell heute:
`docs/progress/ozzy/shader/2026-11-24-fell-vorlagen-und-heute.png`.

## Ehrliche Einschätzung

- **Ganz exakt: nein.** Die Vorlagen sind Bilder aus Offline-Renderern (oder KI-Bildern, 07): Hunderttausende bis Millionen
  einzelner Haare, Licht, das viele Male durch das Haar springt, Sekunden bis Minuten je Bild. Das geht nicht in Echtzeit, schon gar
  nicht auf dem iPhone.
- **Sehr nah: ich teste es.** Was die Vorlagen schön macht, lässt sich in Echtzeit fast alles nachbauen. 03 sieht selbst wie ein
  Echtzeit-Fell aus Schalen und Rändern aus.

## Was unserem Fell fehlt (am Vergleichsblatt)

1. **Einzelne Haare.** Unser Fell ist ein gleichmäßiges Muster aus kleinen Kegeln (wie ein Nadelkissen). In den Vorlagen sieht man
   einzelne Haare, vor allem am Umriss, wo sie fein abstehen.
2. **Strich.** Die Vorlagen sind gekämmt: lange Linien, Wirbel (01, 06), Scheitel, Haare, die sich überlagern. Unseres steht fast
   gerade nach außen.
3. **Büschel mit Unordnung.** Strähnen verschiedener Größe und Richtung, einzelne Ausreißer (04, 05, 09). Unsere Büschel sind alle
   gleich und liegen in einem Raster.
4. **Haarlicht.** Zwei Glanzlinien quer zum Haar (die zweite farbig), Gegenlicht, das durch die Spitzen scheint, dunkle Wurzeln,
   helle Spitzen, weiches Licht im hellen Fell (08, 09). Unseres ist fast flach.
5. **Länge.** Die Haare sind lang im Verhältnis zur Kugel (bis rund ein Achtel des Halbmessers) und biegen sich unter ihrem Gewicht.

## Weg: echte Haare über dem Fell aus Schalen

Schalen (heute) können kurzen, dichten Flaum, aber keine einzelnen langen Haare: Bei langen, gekämmten Haaren zerfallen sie in
Scheiben. Darum kommen echte Haare dazu:

- **Haare als Linien im Raum:** 20 000 bis 100 000 Haare je Form, jedes eine Kurve aus 8 bis 16 Stücken, gezeichnet als dünnes Band
  zum Betrachter (instanziert). Die Wurzeln liegen gleichmäßig auf der Haut (Dreieck und Gewichte, je Netzstand neu gezogen); so
  gehen sie beim Formen mit.
- **Strich und Wirbel** aus einem glatten Richtungsfeld auf der Haut (Wirbelpunkte, Scheitel, Schwerkraft), **Büschel** (die Spitzen
  laufen zur Mitte ihres Büschels, Büschel verschieden groß), **Unordnung** (einzelne Ausreißer, Kräuseln), **Locken** (Schraube um die
  Büschelachse).
- **Haarlicht:** zwei verschobene Glanzlinien (Kajiya-Kay, Marschner genähert), Durchschein im Gegenlicht, Wurzeln dunkel nach der
  Tiefe im Fell, weiches Licht im hellen Fell.
- **Unterfell:** die heutigen Schalen als dichter, dunkler Grund, damit nicht Millionen Haare nötig sind.
- **Weiche Kanten:** Haare dünner als ein Bildpunkt werden blasser statt dünner (kein Flimmern). **In Ruhe** rechnet das Bild weiter
  und sammelt leicht versetzte Bilder (so wird es weich wie im Offline-Bild); in Bewegung zählt das Tempo.
- **Tempo:** in Bewegung nicht langsamer als unser Fell heute (26 bis 32 ms je Bild auf dem Mac); Zahl der Haare nach Größe im Bild.

## Etappen

0. **Probe „Haare“** an einer Kugel, Ziel Vorlage 06 (braun) und 05 (Katze), gleiche Ansicht. **Kriterium:** Florian sieht einzelne
   Haare am Umriss, Strich mit Wirbel, Büschel, Haarglanz und dunkle Wurzeln, und sagt, ob es in diese Richtung geht. Danach erst
   weiter.
1. **Kurzes Fell**, je Vorlage ein eigener Shader (Florians Regel: eigene ausgefeilte Fassung je Stil): 01 grün, 02 Giraffe,
   03 graubraun, 05 Katze, 06 braun, 09 lila.
2. **Langes Fell:** 04 dunkelbraun lang, 07 Zottel, 10 violett, 11 türkis (mit Leuchten).
3. **Locken:** 08 weiß.
4. **Tempo** auf dem iPhone, Bildblätter, Übergabe.

Jeder Schritt wird an der Kugel neben seiner Vorlage gezeigt (`scripts/ozzy/shader-kugel.mjs`, Messung mit
`scripts/ozzy/kugel-messen.mjs`). Sein Auge entscheidet.
