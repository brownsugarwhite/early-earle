# Übergabe: 62 Shader für Ozzy (21.11.2026, Runde 7)

Pläne: `docs/plans/2026-11-20-ozzy-shader.md` (Runde 1), `docs/plans/2026-11-20-ozzy-shader-runde-2.md` (Runde 2 bis 5),
`docs/plans/2026-11-21-ozzy-shader-runde-6.md` (Runde 6: Fell, Flausch, Häute im Zeichenstil, Diskokugel),
`docs/plans/2026-11-21-ozzy-shader-runde-7-fell.md` (Runde 7: Fell schneller, Ghibli-Ränder, Schaf als Stapel; Messungen). Recherche:
`docs/research/2026-11-20-shader-recherche.md`, für die Tiere `docs/research/2026-11-20-tiermuster-recherche.md`, für den T-Rex
`docs/research/2026-11-20-t-rex-haut-recherche.md`, für Fell und Flausch `docs/research/2026-11-21-fell-flausch-recherche.md`.
Offenes: `docs/plans/2026-11-20-ozzy-shader-was-bleibt.md`. Bilder: `docs/progress/ozzy/shader/` (Runde 7, vorher | nachher:
`2026-11-21-runde-7-fell.png`, `-fell-andere.png`; Runde 6:
`2026-11-21-runde-6-fell.png`, `-muster.png`, `-flausch.png`, `-haeute.png`, `-tiere.png`, `-nah.png`; Runde 5:
`2026-11-20-runde-5-trex-stile.png`, `-farben.png`, `-nah.png`; Runde 4: `2026-11-20-runde-4-*.png`; Runde 3:
`2026-11-20-runde-3-neu.png`; je Gruppe nach Runde 2: `2026-11-20-runde-2-*.png`; Runde 1: `2026-11-20-alle-20.png` und einzelne).

## Wo und wie ansehen

- Zweig `claude/ozzy-shader` (von `claude/ozzy-maul`), Arbeitsbaum `.claude/worktrees/ozzy-shader`, Fenster **5219** (Eintrag
  `ozzy-shader` in `.claude/launch.json`). Nichts ist nach `claude/ozzy-maul` oder `claude/ozzy` zusammengeführt.
- In Ozzy: Menü (Feinregler) → Knopf **Shader**, dann die Tafel unten rechts: sechs Gruppen zum Auf- und Zuklappen, je Shader ein
  Knopf, darunter seine Zeile und seine Regler (Doppelklick setzt einen Regler zurück), oben **Bühne** (der Shader zeichnet seinen
  eigenen Grund). **⇧M** nächster Shader, **⌥⇧M** voriger. Adresse: `?shader=<name>` (z. B. `eineLinie`, `fell`).
- Bilder ohne Fenster: `node scripts/ozzy/shader-bilder.mjs <ordner> [name …]` aus `apps/editor` (startet für die Dauer des Laufs
  einen eigenen Vite auf 5219, falls dort keiner läuft; `NAME`, `ZOOM`, `GIER`, `NEIGUNG`, `WARTEN`, `BUEHNE=0`, `SEITE=1`, `EXTRA`,
  `REGLER='{"stil":1}'` setzt Regler; ein leeres `NAME=` lässt das Laden scheitern). Fell und Wolke brauchen `WARTEN=3500` (erst
  übersetzen, dann ein Bild in voller Güte).
  Blatt aus Bildern: `node scripts/ozzy/bildblatt.mjs <ziel.png> <spalten> <breite je Bild> <bilder…>` (die Breite gilt **je Bild**).
- Labor für Eine Linie ohne Fenster: `npx vite-node scripts/ozzy/linie-labor.ts <ordner> [schritte …]`.

## Die 62, in sechs Gruppen

- **Spider-Verse (17):** Comicdruck, Aquarell, Indrajal, Punk-Collage, Marker 2099, Tintenfleck, Da Vinci, Glitch, Earth-42,
  Multiplane, Noir, Cartoon, Neunziger, Sienkiewicz, Venom-Blitz, Pixel, LEGO.
- **Anime & Manga (7):** Anime, Manga, Flammenwesen, Dampfwesen, Shinkai, Ukiyo-e, Gouache (Ghibli).
- **Materialien (10):** Autolack, Haut, Knete, Earle-Haut, Earle-Schuppen, Flüssigglas, Opal, Diamant, Diamantbesatz, Diskokugel.
- **Tiermuster (15):** Leopard, Tiger, Giraffe (seit Runde 6 auf dem Fell), Elefant, Python (`schlange`), Klapperschlange,
  Korallennatter, Krokodil, Feuersalamander, T-Rex (`trex`), Drache, Pfeilgiftfrosch (`frosch`), Chamäleon (`chamaeleon`), Krake,
  Turing-Haut. Die Häute haben den Regler **Stil** (Echt, Anime, Manga, Spider-Verse, Earle); der T-Rex sieben Stile (Kino,
  Spider-Verse, Earle, Fossil, Spielzeug, Anime, Manga) und vier Färbungen (Erde, Wald, Asche, Glut).
- **Fell & Flausch (6):** Fell (Stile Echt, Ghibli, Anime, Spider-Verse, Manga, Plüsch; 20 Muster; sechs Felltypen), Schaf,
  Plüschtier, Wolke (Echt, Ghibli, Anime), Zuckerwatte, Pusteblume (Versuch).
- **Effekte (7):** Eine Linie, Feuer, Tropfen, Rauch, Tinte, Staub, Ereignishorizont.

Was jeder tut, steht im Kopf seiner Datei (`voreinstellungen/`).

## Aufbau (`apps/editor/src/ozzy/shader/`)

- `kern.ts`: `ShaderKern` hält die Haut (glatte Anzeige des Werks, wie Solid), Ziele (folgen der Fenstergröße), gemeinsame Werte
  (`u`: Zeit, Auflösung, Schnitte, Licht, Kamera, Mitte, Radius, **halbe Ausdehnung `uHalb`**). Werkzeuge: `netz`, `flaeche`, `szene`,
  `paar` (Hin- und Herrechnen), `loeschen`. Alle Programme `RawShaderMaterial` mit GLSL ES 3.0.
- `glsl.ts`: Rauschen (Simplex, fBm, Curl, Voronoi), Farbe (Spektrum CIE, Schwarzkörper, ACES), Licht (Studio aus Softboxen),
  Druck (Raster, Schraffur, Papier).
- `daten.ts`: G-Puffer (Normale + Deckung, Lage + Tiefe), Rückseite, `G_LESEN`. `bildShader.ts`: ein Shader in einem Durchgang über
  dem G-Puffer (`bildVoreinstellung`), `WeicheMaske` (weichgezeichnete Deckung, `tWeich`).
- `stroemung.ts`: 2D-Navier–Stokes (Stam). `linieSim.ts` + `linie.worker.ts`: die eine Linie.
- `shaderHaut.ts`: wählt, führt die Zeit, legt das Bild über den Grund; `wahl.ts`: die Tafel (Gruppen `SHADER_GRUPPEN` in
  `kern.ts`). Einbau in `main.ts`: Suchwort `MATERIAL_SHADER`, Haken `__ozzy.shader(name, { buehne, regler, neu })`.
- Seit Runde 6 unter `voreinstellungen/`: `schalen.ts` (der gemeinsame Lauf für alles, was über der Haut wächst), `fell.ts`,
  `flausch.ts` (Wolke, Zuckerwatte, Pusteblume), `hautStile.ts` (Stile für Häute), `haeute.ts` (Drache, Frosch, Chamäleon, Krake und
  die Schuppentiere), `buehnen.ts` (gemeinsame Bühnen). `tiere.ts` hält nur noch GLSL-Bausteine (`TIER_ZELLEN`, `TIER`).

## Merke

1. Bewegte Shader halten das Bild am Laufen (`unruhig`), nur solange das Material „Shader“ zu sehen ist.
2. Kein Backtick in GLSL-Kommentaren; keine örtliche Variable, die wie eine Funktion aus `glsl.ts` heißt (`p`, `papier`, `schritt` …).
   Eine GLSL-Konstante in TypeScript nie so nennen wie eine Voreinstellung derselben Datei (`KROKODIL_GLSL` neben `KROKODIL`).
3. Größen, die zur Form passen sollen, aus ihrer Größe im Bild rechnen (Eine Linie: `formRadiusPx`; Tropfen: `formPx()` im Shader),
   Richtungen aus `uHalb` (Tiger: Streifen quer zur längsten Achse).
4. **Tropfen:** Jeder Tropfen hängt an der Unterkante direkt über ihm; die Suche läuft grob, an jeder Stufe scharf geprüft, und wo die
   weiche Maske etwas meldet, dazwischen fein (sonst springt sie über dünne Spitzen, und der Tropfen ist von Zeile zu Zeile ein
   anderer: Streifen). Der Ansatz ist eine weiche Vereinigung mit der Form (Abstand aus `tWeich`), seine Farbe geht in den Überzug über.
5. **Staub:** Teilchen als Vierecke je Teilchen (instanziert), im Vertex-Shader nach der Bewegung gestreckt und nach der Tiefe
   unscharf (gleiche Lichtmenge). Sie liegen im selben Ziel wie die Statue (Tiefe), Blättchen deckend, Funken addiert.
6. **Ereignishorizont:** Strahlengang bis 260 Schritte je Bildpunkt (der teuerste Shader); die Masse ist so klein, dass ihr runder
   Schatten hinter der Form bleibt.
7. Zeiten für Aufnahmen: `__ozzy.shader(name, { neu: true })` beginnt von vorn. Feuer (16 s), Staub (12 s), Tinte und Eine Linie
   brauchen Zeit: Feuer bei rund 4,3 s, Staub bei 3,3 s, Tinte bei 7 s, Eine Linie ab 10 s aufnehmen.
8. **Feuer prüfen:** `?feuerPruef=1` zeigt die Geschwindigkeit (grün steigt, rot sinkt), `?feuerPruef=2` die Quelle (rot) und die
   Temperatur (grün). Die Strömung rechnet mit y nach oben wie das Bild; Auftrieb `[Temperatur hebt, Rauch drückt]`, beim Feuer ist
   der Rauch warm (negativer zweiter Wert: er steigt mit).
9. **Flüssigglas:** Die Normale der Rückseite am selben Bildpunkt gehört nicht zur Austrittsstelle des Strahls; mit ihr wurde fast
   alles total reflektiert (schwarz). Der Austritt ist darum eine Linse (Spiegelbild der vorderen Normale längs des Blicks), und die
   Umgebung ist rundum hell (Hohlkehle), damit jeder gebrochene Strahl Licht trifft.
10. Die App hält nur drei Vorschau-Server; das Bildskript startet darum seinen eigenen Vite nur für den Lauf.
11. **Schuppen:** Bis Runde 5 lagen sie in regelmäßigen Reihen in drei Ebenen (`schuppenEbene`, `schuppe2`, `platteRund` in
    `tiere.ts`, als Bausteine noch da); wo die Fläche die Richtung wechselte, entstand eine Naht. Seit Runde 6 sind Schlangen und
    Drache **Schindeln im Raum** (`schindel` in `haeute.ts`): Zellen eines Rasters, je Zelle eine Schuppe mit runder Vorderkante
    und spitzer freier Kante, längs des Strichs geneigt; welche oben liegt, entscheidet ihr Rang längs des Strichs (`schindelRang`:
    die vordere deckt), unter der freien Kante der oberen liegt ein Schatten. Bauchplatten (`bauchPlatte`) wo die Haut nach unten
    zeigt; Kieselschuppen über `pflaster` aus `trex.ts` (genauer Abstand zum Rand der Zelle und seine Richtung).
12. **Diamant:** Facetten entstehen durch Einrasten der Normale auf eine Kugel aus Richtungen (bis 200 Vergleiche je Facette, vier
    Facetten je Bildpunkt); das ist ein Schliff des Aussehens, keine ebenen Flächen im Raum. Der Weg im Stein liest die Rückseite dort,
    wo der gebrochene Strahl ankommt (`insBild`), nicht am selben Bildpunkt. Den Diamanten macht das Licht: hell mit harten schwarzen
    Karten (`juwelLicht`); nur dunkel mit kleinen Lampen sah er aus wie Chrom.
13. **LEGO:** Die Steine hängen an der Form, nicht am Blick (vorher entschieden Vorder- und Rückseite je Bildpunkt: Flackern). Der
    Prozessor legt das Netz in ein Raster (`gitterBauen` in `lego.ts`: je Säule die Schnitte mit der Haut, vier Säulen je Zelle; die
    Steine je Schicht im Verband) und reicht es als 3D-Textur (`tSteine`: Farbe + 1 und Nummer des Steins). Neu gelegt wird, wenn sich
    `netzStand` oder ein Regler ändert, im Zug höchstens alle 90 ms (an „strange bird“ 2 bis 10 ms). Kanten glätten fünf Strahlen, wo
    sich die Kennung des Getroffenen im Bildpunktquadrat ändert (`fwidth` vor jeder Verzweigung; in den Strahlen keine Ableitungen).
14. **Häute in Stilen** (`hautStile.ts`): Eine Haut liefert nur `Haut` (Farbe ohne Licht, Normale mit Relief, Höhe auf der Schuppe,
    Fuge, Abstand zum Rand der Schuppe, Glanz, Rauheit, `lod`); die Stile zeichnen sie: Echt (Studio, linear, danach ACES), Anime
    (zwei Töne nach der glatten Form, Linien nur an den Schuppen, Glanz als weiße Form; nach Guilty Gear Xrd), Manga (Schwarz,
    Weiß, Rasterfolie, Federstriche), Spider-Verse, Earle (vier Stufen, Petrol). Der T-Rex nimmt dieselben Stile über `rexZuHaut`.
    Die Reihenfolge der Stile hat sich für die Tiere geändert (Runde 4: echt, Spider-Verse, Earle; jetzt Echt, Anime, Manga,
    Spider-Verse, Earle): gemerkte Regler zeigen danach einen anderen Stil. Die Stile außer Echt legen eine Kontur um die Form.
15. **Gouache:** jedes Stück ein Pinselstrich (je Zelle im Bild einer, drei Lagen, der oberste deckende gewinnt; seine Farbe ist die
    Vorlage an seiner Mitte). 75 Striche je Bildpunkt werden geprüft, die Farbe nur für die drei Sieger gerechnet.
16. **Diamantbesatz:** Steine in Zellen im Raum; `rho` ist der Ort im Stein von der Mitte (0) zum Rand (1), aus dem Abstand zur Mitte
    und zum Rand der Zelle (Kissenform). Wird ein Stein im Bild kleiner als rund zehn Bildpunkte, wird er ruhig zusammengefasst (sonst
    flimmert der Schliff).
17. **T-Rex** (`trex.ts`): eine Haut für alle Stile (`rexHaut`); die Stile zeichnen sie nur verschieden. Die Schuppen sind Zellen im
    Raum (`pflaster`), die Wölbung rund um die Mitte der Zelle. Die Normale kommt aus dem Gefälle aller Teile (Pflasterschuppen,
    Schmuckschuppen, Rückenhöcker, Falten, Narben), nicht aus Differenzen. `jeSchuppe` liest das Muster an der Mitte jeder Schuppe
    (Kino, Fossil), sonst glatt; die Fugen dunkelt jeder Stil selbst ab (im Comic hätten sie ein Mosaik gezeichnet). Schuppen kleiner
    als rund zwei Bildpunkte (aus `uMass`) treten zurück. Regler mit `stufen` zeigen in der Tafel den Namen der Stufe statt der Zahl.
18. **Schalen** (`schalen.ts`, Lengyel u. a. 2001): Das Netz des Kerns wird instanziert gezeichnet (`gl_InstanceID` = Schale), alles
    in einem `render`-Aufruf in ein Ziel mit vier Abtastungen und zwei Ausgängen (Farbe, Kennung). Zwei Arten: **Deckung** (Fell:
    alpha to coverage; im aufgelösten Ziel steht Deckung mal Alpha, darum setzt `deckungSchalen` die Wurzel ein) und **Durchsicht**
    (Wolke, Zuckerwatte: erst die Haut deckend, dann die Schalen vormultipliziert gemischt; die Deckung je Schale aus der Dicke einer
    Schicht, `1 - exp(-σ·36/N)`, so bleibt das Bild bei jeder Zahl der Schalen gleich dicht). Die Zahl der Schalen folgt der Länge des
    Fells im Bild (Fell höchstens 32), die Höhe jeder Schale wird je Bildpunkt verzittert (IGN), sonst sieht man Scheiben. **Muster
    je Ecke** (`eckMuster`): einmal je Ecke in eine Textur gerechnet (ein Durchgang mit Punkten, `gl_VertexID`), nur wenn sich Netz
    oder Regler ändern; die Schalen lesen es mit `texelFetch`. **In Bewegung** (Blick, Form oder ein lebender Shader) 45 % der
    Schalen in 70 % der Auflösung, nah weniger (60 % ab einem Drittel des Bilds, 50 % ab 60 %; je Stufe ein eigenes Ziel), danach
    ein Bild in voller Güte (`unruhig` hält es so lange am Laufen). Ein Bildpunkt ohne Haar bekommt Deckung null statt `discard`
    (das hielt die frühe Tiefenprüfung aus). **Zellsuchen kosten am meisten** (Runde 7, gemessen: die Suche nach dem Büschel war
    bei Nahsicht 110 von 170 ms): `zelleBcc` sucht im raumzentrierten Raster unter zwei Kandidaten statt acht Zellen.
19. **Fell** (`fell.ts`): Haare als Zellen im Raum (je Zelle eins; acht statt 27 Nachbarzellen, `zelleAcht`), Länge je Haar
    verschieden, zur Spitze dünner; Büschel ziehen die Spitzen zur Mitte (Silva u. a. 2010), Locken als Kreis um die Wurzel. Licht:
    Kajiya-Kay mit zwei verschobenen Glanzlinien. **Ghibli** sind dicke Haare in großen Büscheln (drei Töne, Pinselspur, Papier);
    **Anime, Spider-Verse, Manga** brauchen Büschel als Flammen (Kegel längs des Strichs, `bueschel`, vier Kandidaten im
    raumzentrierten Raster): Mit dünnen Haaren wurde ihre Kontur fleckig. Tusche nur, wo die Kennung des Büschels wechselt und das
    vordere höher liegt (vorher auf jeder Schale: Rauschen). Muster an der Wurzel jedes Haars (`fellMuster`, 20 Muster), Scheckung
    weiß von unten (`uScheckung`). **Merke (Runde 7):** Wer Haare zur Mitte eines Büschels zieht, macht sie dabei dünner (der Ort
    wird gestreckt): an den Spitzen Punkte unter einem Bildpunkt, also Kratzer am Rand und Strichgitter. Ghibli gleicht das halb aus
    (`uZusammen`), mit Mindestdicke, Spitzen fast gleich lang (`uStreu`); ganz ausgeglichen werden die Büschel glatte Schuppen. Der
    Rand im Ghibli-Stil wird im Zusammensetzen über eine gefüllte Scheibe gemittelt, nur wo das Fell nicht voll deckt (acht Proben
    auf einem Ring machten aus jedem Punkt einen Ring). **Wolle** (Felltyp Locken im Stil Echt, `wolle`): Stapel als flache Kuppeln
    mit kleinen Kuppeln darauf, dichte gekräuselte Fasern; schmale Stapel standen wie Stacheln.
20. **Flausch** (`flausch.ts`): Die Wolke ist ein Höhenfeld aus Ballen (`kuppel`: Kuppeln aus `zelleAcht`, dazu feines Rauschen)
    auf den Schalen; Licht nach Nubis (Beer, Puder, Silberrand, Himmel), Ghibli und Anime in Stufen. Zuckerwatte: Fasern, wo sich die
    Nullstellen zweier Rauschfelder schneiden, Rosa und Hellblau je Ecke gemischt, Glitzer. Pusteblume: Same, Stiel, Schirm (Versuch).
21. **Diskokugel** (Runde 6): Die Kacheln kommen aus einem Würfelraster im Raum: Die Fuge ist, wo die Fläche eine Ebene des Rasters
    kreuzt; der Abstand auf der Fläche ist der Abstand zur Ebene geteilt durch `sqrt(1 - n²)` (`rasterKachel`), so gibt es keinen
    Knick (die drei Ebenen von Runde 4 knickten die Reihen). Die Normale einer Kachel liest der Shader an ihrer Mitte (die Mitte der
    Zelle auf die Tangentialebene gelegt und ins Bild gerechnet), dazu eine kleine Neigung je Kachel; die Drehung trägt der Raum.
    Strahlen sind ein radiales Verwischen der hellen Kacheln im Bild vom Mittelpunkt der Kugel aus (`uZentrum`, im Sternfilter),
    nicht mehr ein Strahlengang durch Dunst (der war körnig).
22. **Bühnen** (`buehnen.ts`) geben lineare Farbe; wer im Bildschirmraum zeichnet (Anime, Manga, Spider-Verse), wandelt am Ende.
    Neu in Runde 6: blauer Himmel, Ghibli-Himmel, Anime-Himmel, Manga-Grund, Jahrmarkt, unter Wasser, Wüste, Savanne.
23. **Tempo messen:** Zeiten je Bild mit der Grafikkarte (ein Bildpunkt zurücklesen, sonst misst man nur den Prozessor), im
    Testbrowser mit `GPU=1`, Blick zwischen den Bildern ändern (sonst greift die volle Güte im Stand). Nach Runde 7 Fell in Bewegung
    rund 26 bis 32 ms je Bild samt Ozzy (Grund 11 bis 13 ms), im Stand 45 bis 110 ms; Zahlen im Plan der Runde 7. Was ein Teil
    kostet, zeigt ein Lauf mit abgeschaltetem Teil (`FLICKEN` wie in `ozzy-teile.mjs`; Muster in GLSL-Text, nicht in JS-Code, den
    Vite umformt). Am iPhone nicht gemessen (Adresse mit `info=1` zeigt Bilder je Sekunde). Das Übersetzen eines Fell- oder
    Hautshaders kostet beim Wechsel 0,4 bis 0,7 s.
