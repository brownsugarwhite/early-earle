# Ozzy, Shader: Fell nach Florians Vorlagen (24.11.2026)

Florian (wörtlich): „schau mal, ich habe so schöne haare gefunden. Die sehen deutlich besser aus als unsere. Bekommst du das mit
shadern exakt so hin?“

Vorlagen (`docs/look/ozzy/shader/vorlagen/2026-11-24-fell-*.png|webp`): 01 grün (kurz, gekämmt mit Wirbel), 02 Giraffe (kurzer
Plüsch mit Muster), 03 graubraun (Wildfell, mehrfarbig), 04 dunkelbraun lang (Stacheln in Büscheln, feine Haare am Umriss), 05 Katze,
06 braun (Wirbel oben, weiche Spitzen), 07 Zottel (lange, hängende Strähnen), 08 weiß mit Locken, 09 lila (weich, wellig), 10 violett
(lang, fließend, Farbverlauf), 11 türkis (dicht, wirr, leuchtend), am Nachmittag dazu 12 grüner Ball (weich, feine Haare am Umriss). Vergleich mit unserem Fell heute:
`docs/progress/ozzy/shader/2026-11-24-fell-vorlagen-und-heute.png`.

## Ehrliche Einschätzung

Zuerst pauschal geurteilt (alle offline oder KI, „ganz exakt: nein“). Auf Florians Fragen („bist du dir da sicher. die giraffe
könnte ein shader sein“, dann mit vier Links „Schau dir auch meine restlichen referenzen nochmal an ob auch das echte shader sein
könnten“) einzeln geprüft: vergrößert am Umriss, dazu die Quellen aus seinen Links (Bildgröße, Dateiname und Signatur stimmen überein).

- **Sicher Echtzeit:**
  - **02 Giraffe:** Schalen (am Umriss die geraden Kanten des Kugelnetzes, das Fell ist nur auf die Fläche gezeichnet).
  - **03 graubraun:** Unity, jedes Haar ein schmales Blatt, das die Grafikkarte erzeugt (ein Gras-Shader; Y Hartzell, „Wolf Fur
    Material (Game Art)“, https://ysidro.artstation.com/projects/1nx5vX).
  - **04 dunkelbraun lang:** Unreal, laut Text mit Schalen gebaut (Maximiliaan Maene, „WIP- Realtime fur shader“,
    https://maenemaximiliaan.artstation.com/projects/1n1q48; Datei `HighResScreenshot00001`, gleiche Größe 1414 × 1260). Die feinen
    Haare am Umriss sind punktierte Linien durch die Schalen.
  - **11 türkis:** Sketchfab, echte Haare als Dreiecke (636 890 Dreiecke in 32 Teilen), läuft im Browser („Furry Ball 2: Electric
    Boogaloo (Real Fur Test)“,
    https://sketchfab.com/3d-models/furry-ball-2-electric-boogaloo-real-fur-test-befd7100dc3441758fbcf3b37d66c335; im Browser
    geöffnet, es läuft).
- **Wahrscheinlich Echtzeit:** **06 braun** (gemischte Schalen am Rand); **09 lila** (Haarkarten: Streifen mit dem Bild vieler Haare,
  wie in Spielen; am Umriss ausgefranste Streifen); **01 grün** (der Umriss ist fast glatt, obwohl die Haare auf der Fläche lang
  sind; Schalen oder kurzes Fell, nicht sicher).
- **Offline gerechnet:** **08 weiß mit Locken**, 3ds Max „Hair and Fur“ (Amir Cherni, „Fur Presets“,
  https://www.artstation.com/artwork/nQ4lYo; gleiche Signatur unten rechts).
- **Unklar, eher offline:** 05 Katze (feine helle Pünktchen wie beim Offline-Rechnen), 10 violett, 12 grüner Ball.
- **KI-Bild:** 07 (Zeichen von Craiyon).
- „In Echtzeit unmöglich“ war falsch: 04 zeigt lange, feine Haare aus Schalen, 11 echte Haare im Browser.

## Was daraus folgt (24.11.)

- **Schalen reichen weiter als gedacht:** 04 zeigt lange, feine Haare aus Schalen. Unsere können länger, dünner und dichter werden.
- **Echte Haare gehen im Browser:** 11 zeichnet rund 640 000 Dreiecke Haar in Echtzeit (auf dem iPhone ungeprüft).
- **Zwischenweg wie 03:** jedes Haar ein schmales Blatt, von der Grafikkarte vervielfacht (in WebGL2 als Instanzen).
- **Schafwolle (08)** (Florian: „Vor allem die weiße schafswolle finde ich interessant“): offline gerechnet. In Echtzeit zu prüfen:
  Locken aus Schalen (runde Büschel, deren Haare sich um die Achse des Büschels drehen, dunkle Lücken dazwischen) und wenige tausend
  echte Flusen am Umriss. Kriterium: Locken mit dunklen Lücken, weiche Flusen am Umriss, cremiges Weiß, an der Kugel neben 08 in
  gleicher Ansicht.

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
- **Tempo:** in Bewegung nicht langsamer als unser Fell heute (gemessen mit `scripts/ozzy/shader-tempo.mjs`, Zahlen unten); Zahl
  der Haare nach Größe im Bild.

## Etappen

0. **Probe** an einer Kugel neben der Vorlage, gleiche Ansicht: zuerst Schalen nach 02 (Giraffe) und 06 (braun), gebaut (siehe
   „Stand der Probe“); danach echte Haare nach 05 (Katze), auf sein Wort. **Kriterium:** Florian sieht einzelne Haare am Umriss,
   Strich mit Wirbel, Büschel, Haarglanz und dunkle Wurzeln, und sagt, ob es in diese Richtung geht. Danach erst weiter.
1. **Kurzes Fell**, je Vorlage ein eigener Shader (Florians Regel: eigene ausgefeilte Fassung je Stil): 01 grün, 02 Giraffe,
   03 graubraun, 05 Katze, 06 braun, 09 lila.
2. **Langes Fell:** 04 dunkelbraun lang, 07 Zottel, 10 violett, 11 türkis (mit Leuchten).
3. **Locken:** 08 weiß.
4. **Tempo** auf dem iPhone, Bildblätter, Übergabe.

## Stand der Probe (24.11.)

Gebaut: `src/ozzy/shader/voreinstellungen/samtfell.ts` mit **Giraffenfell** (nach 02) und **Braunes Fell** (nach 06), auf den Schalen.
Was den Unterschied machte (Blatt `docs/progress/ozzy/shader/2026-11-24-fell-probe-schalen.png`):

1. **Keine Büschel:** Unsere Büschel im Raster lasen sich als Nadelkissen; hier ist jedes Haar für sich, dicht und fein.
2. **Flach im Strich:** Die Haare liegen fast an; jedes Haar ist im Bild ein langer Streifen (Giraffe ohne Schwerkraft, sonst ein
   Wirbel; Braun mit Schwerkraft: Wirbel oben).
3. **Gemischt statt an und aus:** Die Schalen werden durchscheinend von innen nach außen gemischt (`durchsicht`), jedes Haar mit
   weichem Querschnitt und weich ausblendender Spitze. Hart an und aus (Deckung zu Abtastungen) gab scharfe Striche mit Lücken und
   am Umriss Körner; gemischt fließen die Haare ineinander wie in den Vorlagen. **Das war der wichtigste Schritt.**
4. **Haare bis kurz vor die Spitze dick** (sie decken oben, die dunklen Wurzeln verschwinden darunter), Wurzeln dunkel, Spitzen hell.
5. **Strähnen** (Braun): Gruppen von Haaren gleicher Helligkeit, längs des Strichs gestreckt, zuletzt auf die ganze Farbe gelegt
   (sonst decken die hellen Spitzen sie zu).

Tempo (Mac, „strange bird“, je Bild mit Warten auf die Grafikkarte, `scripts/ozzy/shader-tempo.mjs`): in Bewegung Giraffenfell
14,7 ms, Braunes Fell 18,3 ms, unser Fell bisher 15,9 ms; im Stand (ein Bild in voller Güte) 27,9, 56,5 und 25,4 ms.

Offen: Am Vogel wird das Braun streifig (alle Maße hängen am Halbmesser der ganzen Form, an kleinen Teilen sind Haare und Strähnen
darum groß); die Testkugel ist eine liegende Linse (die frische Form wird nie ganz rund; von oben gesehen in der Raumkiste nicht
erreichbar, die Draufsicht zeigt im Shader nur das Blatt): Vergleich darum von schräg oben. **Nächster Schritt (auf sein Wort):** siehe
„Was daraus folgt“.

## Etappe Schafwolle (24.11., Florian: „Schafwolle bauen“)

Ziel: Vorlage 08 (offline gerechnet) in Echtzeit, als eigener Shader „Schafwolle“ in „Fell & Flausch“.

1. **Locken aus Schalen** (gemischt wie das Samtfell): Locken als Zellen im Raum, jede eine Kuppel (Haare in der Mitte lang, am Rand
   kurz: so entstehen die dunklen Lücken), die Haare drehen sich mit der Höhe um die Achse ihrer Locke und laufen zur Spitze
   zusammen, jede Locke neigt sich in ihre eigene Richtung; jedes Haar leicht gewellt.
2. **Echte Flusen:** dünne Haare als Bänder zum Betrachter (je Haar ein Dutzend Stücke, instanziert), Wurzeln gleichmäßig auf der
   Haut (Dreiecke nach Fläche gewählt, bei jeder Änderung des Netzes neu gesetzt), länger als die Locken, gewellt, nach den Schalen
   gemischt gezeichnet, in der Wolle ausgeblendet. Haare dünner als ein Bildpunkt werden blasser statt dünner.
3. **Licht** wie die Vorlage: weich von oben links, Spitzen durchscheinend, kühle Aufhellung von rechts.

Probe: Testkugel neben 08 (schräg von oben, `NEIGUNG=64 ZOOM=2.0`) und an „strange bird“, Tempo mit `shader-tempo.mjs`.
**Kriterium:** Locken mit dunklen Lücken, weiche Flusen am Umriss, cremiges Weiß. Sein Auge entscheidet.

**Stand (24.11. abends):** gebaut, `src/ozzy/shader/voreinstellungen/wolle.ts` („Schafwolle“), die Flusen allgemein in `schalen.ts`
(`flusen` einer Art). Blatt `docs/progress/ozzy/shader/2026-11-24-schafwolle-probe.png` (Vorlage 08, Testkugel, „strange bird“).
Was den Unterschied machte, in fünf Anläufen:

1. Locken als Zellen im Raum mit der Kuppel aus dem Abstand zur Grenze gaben Kissen mit geraden Kanten (Pflaster). Das
   **Verhältnis der Abstände** zur nächsten und zur zweitnächsten Mitte hat runde Höhenlinien; dazu wird die Locke in einem leicht
   **gewellten Raum** gesucht: keine geraden Furchen mehr.
2. Jede Locke ein **Bausch**: zu ihrem Rand neigt sich ihre Oberfläche fürs Licht nach außen (Licht auf der einen, Schatten auf der
   anderen Seite). Erst damit wurden die Locken rund.
3. **Kleiner und weicher:** Locken mit 0,075 des Halbmessers, ungleich lange Haare, durchscheinender je Schale.
4. **Flusen** als echte Haare: 10 000 dünne, gewellte Bänder, am Umriss voll, vorn auf der Wolle blasser, in der Wolle unsichtbar.
   Zu viele und zu lange Flusen gaben ein Netz aus Linien; zu stark gekräuselte sahen gekritzelt aus.

Tempo (Mac, „strange bird“, `shader-tempo.mjs`): beim Drehen 18,6 ms je Bild (das Braune Fell 18,3, unser Fell bisher 15,9), im Stand
44 ms. Offen: siehe „was bleibt“ Punkt 70.

Jeder Schritt wird an der Kugel neben seiner Vorlage gezeigt (`scripts/ozzy/shader-kugel.mjs`, Messung mit
`scripts/ozzy/kugel-messen.mjs`). Sein Auge entscheidet.
