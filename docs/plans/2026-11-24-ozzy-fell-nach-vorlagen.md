# Ozzy, Shader: Fell nach Florians Vorlagen (24.11.2026)

Florian (wörtlich): „schau mal, ich habe so schöne haare gefunden. Die sehen deutlich besser aus als unsere. Bekommst du das mit
shadern exakt so hin?“

Vorlagen (`docs/look/ozzy/shader/vorlagen/2026-11-24-fell-*.png|webp`): 01 grün (kurz, gekämmt mit Wirbel), 02 Giraffe (kurzer
Plüsch mit Muster), 03 graubraun (Wildfell, mehrfarbig), 04 dunkelbraun lang (Stacheln in Büscheln, feine Haare am Umriss), 05 Katze,
06 braun (Wirbel oben, weiche Spitzen), 07 Zottel (lange, hängende Strähnen), 08 weiß mit Locken, 09 lila (weich, wellig), 10 violett
(lang, fließend, Farbverlauf), 11 türkis (dicht, wirr, leuchtend). Vergleich mit unserem Fell heute:
`docs/progress/ozzy/shader/2026-11-24-fell-vorlagen-und-heute.png`.

## Ehrliche Einschätzung

- **Berichtigt (Florian: „bist du dir da sicher. die giraffe könnte ein shader sein“):** Nein, sicher war das nicht, und für die
  Giraffe war es falsch. Einzeln angesehen (Lupe am Umriss):
  - **Echtzeit-Fell aus Schalen**, wie unseres: **02 Giraffe** (am Umriss sieht man die geraden Kanten des Kugelnetzes, das Fell ist
    nur auf die Fläche gezeichnet), **06 braun** (am Rand die verwischten Streifen gemischter Schalen), **03 graubraun** (Schalen
    und Ränder, mit Treppen). Die sind mit unserer Technik erreichbar.
  - **Einzelne Haare** (Strähnen; offline oder in Spiel-Engines, die Haare als Linien zeichnen): 01, 04, 05 Katze, 08, 09, 10, 11.
    Am Umriss stehen feine einzelne Haare ab.
  - **KI-Bild:** 07 (Zeichen von Craiyon).
- Auch „in Echtzeit unmöglich“ war zu stark: Spiel-Engines zeichnen heute einzelne Haare in Echtzeit, nur nicht Hunderttausende im
  Browser auf dem iPhone mit dem Licht eines Offline-Bilds.

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
erreichbar, die Draufsicht zeigt im Shader nur das Blatt): Vergleich darum von schräg oben. **Nächster Schritt (auf sein Wort):** echte
Haare für die Vorlagen mit einzelnen Haaren am Umriss, zuerst die Katze (05).

Jeder Schritt wird an der Kugel neben seiner Vorlage gezeigt (`scripts/ozzy/shader-kugel.mjs`, Messung mit
`scripts/ozzy/kugel-messen.mjs`). Sein Auge entscheidet.
