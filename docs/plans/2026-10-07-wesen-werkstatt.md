# Plan: Wesen-Werkstatt — prozedurales Kreaturen-System und Charaktereditor

> Freigegeben von Florian am 2026-10-07 (Plan-Modus). Repo-Kopie gemäß Arbeitsregel „Pläne sofort ins Repo“; Besetzung als Rollen (Leitung, starker Agent, Agent, Routine-Agent). Fortschritt: `docs/UEBERGABE.md`.

## Kontext

Florian schließt die bisherige Arbeit an early earle als erfolgreichen Prototyp ab und startet die Produktion neu in vier Teilen: **Map, Spielfeld/Spielmechanik, Charaktere, UI**. Von den alten Grafiken wird nichts weiterverwendet, nur Erkenntnisse und das, was überzeugt hat. Erster Produktionsteil sind die **Charaktere**: ein umfassender Charaktereditor, mit dem alle Wesen des Spiels aus einem einzigen, stufenlos verformbaren Grundblob plus kombinierbaren Modulen entstehen — im Stil seiner Referenzbögen (gemalt, weich schattiert, ohne Kontur, Licht von rechts), der zu Eyvind Earle passt.

Die bisherigen Versuche (Cloud-Session: Jelly-Blobs mit texturierten Meshy-Modellen kombiniert) sahen nicht vielversprechend aus. Übernommen werden daraus nur das **Jelly-Material** und die **blinzelnden Schlitzaugen**. Das Spiel muss später auf iPhone und Android flüssig laufen (60 fps, WKWebView = WebGPU auf dem Gerät, WebGL2 im Simulator).

**Zielzusage dieses Plans:** Wenn der Editor fertig ist, lassen sich darin Rexe, Giraffen, Fische, Drachen, Retriever, Raubkatzen, Vögel, Spinnen, Feuer- und Nebelwesen **und alle Kombinationen dazwischen** erstellen — und jedes Ergebnis sieht aus, als stünde es auf Florians Bögen (Bild 3, 16, 18): gemalt, weich schattiert, Licht von rechts oben, ohne Kontur. Die Tiere sind Nebenprodukt; das Produkt ist das System, das diesen Look für jede Kombination garantiert. Wie das sichergestellt wird, steht im **Look-Vertrag** und in der **Kombinationsmatrix** unten; jede Phase hat eine Look-Abnahme gegen die Bögen.

Das Manifest (`docs/manifest.docx`, Intro) setzt die Szene: Tjo Rizo ist im Müll versunken, PezenPez ist der letzte Jellyblob („dumm und schwabbelig“, extrem schmales, aber scharfes Sichtfeld durch den Augenschlitz), REX der letzte, klügste Bewohner; Blobs sind Splitter der Riesen-Seelen und verschmelzen mit ihresgleichen zu besser angepassten Mutationen. Möwen und Rexe sind verwandt. Das erklärt die Reihenfolge der Stufen: **Jelly → feste Blobs mit Schimmer → Wesen mit Maul, Augen, Beinen, Mustern, Fell, Flügeln …** und die Sonderformen Feuer- und Nebelwesen.

## Referenzanalyse (Florians 19 Bilder)

### Bild 1 — der Jellyblob (einzige direkte Referenz)
Kuppel mit flachem Boden, leicht nach vorn geneigt; Licht von **rechts oben** (zwei längliche Glanzlichter rechts oben, hellere Außenzone rechts, satteres Türkis links unten). Zwei dunklere, halbtransparente Innenformen („Organe“: Kopf- und Körperlappen), **ein schwarzer senkrechter Augenschlitz** auf dem unteren Lappen, drei helle Bläschen. Keine Kontur. Material: Glanz + Fake-Subsurface + Innenformen — das bestehende Jelly-Material trifft das bereits.

### Bild 2 — die Skizze des Grundsystems
Links drei Blob-Seitenansichten: hohe Kuppel mit flachem Boden, flache breite Kuppel, hohe schlanke Kuppel; jeweils ein Augenschlitz vorn und eine Trennlinie Kopf/Körper (= spätere Maulnaht). Rechts in Magenta die abgeleiteten Wesen: Jelly-Schlange (Kopflappen + langer Schwanz), zwei Rex-Typen (Stachelkamm, riesiges Maul, Stummelarme, dicke Beine, Schwanz), Giraffe (langer Hals, Flecken, Hörnchen), Krokodil/Schlange (lange Kiefer am Boden), zwei Mähnenwesen (Fell verdeckt den Körper, Maul offen, Schwanz mit Quaste), drei Vögel (großer Schnabel, große Augen, dünne Beine). **Erkenntnis:** Alle Wesen sind derselbe Blob; Typ = Lage/Größe des Mauls + Hals + Unterkörper + Anhänge.

**Florians Ergänzung (07.10.):** Das Maul ist am Blob **stufenlos von unten nach oben positionierbar**. Die Maullinie der drei Skizzen (von vorn-oben nach hinten-unten) ist genau diese Setzung: Maul tief = große Kopfmasse oben (Rex, Mähnenwesen), Maul hoch = kleiner Oberkiefer, breiter Unterkörper (Kröte, Fisch, Dackel von unten). Zusammen mit Neigung der Maullinie und Mundwinkel-Rückzug ergeben sich daraus alle Grundblobformen der Skizze — ohne ein weiteres Formprimitiv.

### Bild 3 — der große Bogen (Körper und Mäuler, genau)
Acht Reihen: Giraffen/Flamingo/Dackel/Retriever · fünf Fische · sechs Dinos · fünf Unterbiss-/Drachenwesen · zehn Raubkatzen · sechs Drachen/Rex · sieben Spinnen · vierzehn Vögel. Gemeinsamer Bauplan der Mäuler:

1. **Das Maul ist ein Keil, der quer durch die Vorderseite des Blobs schneidet.** Der Oberkiefer ist die Kopfmasse oberhalb der Schnittlinie; der Unterkiefer ein eigener, kleinerer Lappen. Beide Lippenkanten sind weiche Wülste, keine Linien.
2. **Mundwinkel definieren die Art:** bei Rex, Panther, Drachen wandern die Winkel weit **nach hinten**, bis auf Augenhöhe und dahinter (Bild 5 links, Bild 14); bei Hund und Giraffe liegen sie vorn an der Schnauze; bei Fischen gibt es keine Winkel — das Maul ist ein **rundes Loch mit Lippenring** (Bild 4).
3. **Innenraum:** dunkles Weinrot/Maroon mit Verlauf nach hinten ins Schwarze, darin eine **hellere rosa Zunge** (immer sichtbar, Bild 3/5/8/11/14); Rachen als weiche dunkle Höhle, keine Zeichnung.
4. **Zähne:** cremefarbene, weiche Kegel (gerundet oder spitz), stehen **auf der Lippenkante**, Größe variiert („mal ein großer, mal ein kleiner Zahn“), Eckzähne größer; bei geschlossenem Maul greifen sie ineinander oder ragen als Unterbiss-Hauer über die Oberlippe (Bild 7) bzw. als Fangzähne unter der Oberlippe hervor (Retriever Bild 8, Hauskatze Bild 14).
5. **Augen sitzen knapp über den Mundwinkeln** auf dem Oberkiefer-Wulst; beim Rex (Bild 11) tief unter einem Brauenwulst eingesunken, mit Nasenlöchern als zwei dunkle Punkte.
6. **Geschlossen:** Giraffe/Lion/Tiger/Panther zeigen nur eine weiche Naht oder gar nichts (Giraffe); Hund und Katze die typische **W-Form** der Oberlippe mit Nasenspiegel (Bild 8 rechts, Bild 9); Raubkatzen einen **kantigen Kiefer** mit eckigem Kinn (Bild 9).

Körper: Pear-/Kuppelform mit flachem Boden, Hals stufenlos von null (Rex, Fisch) bis sehr lang (Giraffe, Flamingo); Kopf = eigener Lappen oben am Hals, dessen Vorderseite das Maul trägt. Beine gehen **ohne Naht** aus dem Körper hervor (Bild 12), Schenkel dick bei Rex, Pfoten verlaufen saugnapfartig in den Boden. Schwänze: Rex als Verlängerung der Wirbelsäule in horizontaler Linie Schnauze–Schwanzspitze; Katzen/Retriever/Giraffe/Elefant als dünner Anhang mit Quaste oder langem Fellbogen.

### Bild 4 — Fische
Rundes Loch-Maul mit Lippenring (Betta, Kugelfisch, Halfterfisch), Loch-Maul mit Zähnen (brauner Fisch), Rachen-Maul mit Dreieckszähnen (blauer Drachenfisch, dieselbe Zahnlogik wie Rex). Flossen als weiche, lappige Flammenformen (Betta) oder Stacheln (Kugelfisch); Muster: Streifen (Halfterfisch), Punkte/Schuppen (Drachenfisch, Bild 13 verzerrungsfrei!), Sprenkel. Schwimmanimation: edel, mit Abstand zum Feld, Flossen wellen.

### Bild 5 — zwei Kieferextreme
Links **Rex**: Oberkiefer riesig, Mundwinkel hinter den Augen, Unterkiefer ein breiter Löffel, Flügel angelegt, Stummelarme. Rechts **Drache ohne Unterkiefer**: die Maulöffnung liegt direkt am Hals, **Unterbiss** (untere Zähne ragen aus dem Hals/Kinn nach oben), riesige Oberzähne, schwarzer Stachelkamm, Fledermausflügel mit violetter Membran, gelbes Auge. → Kiefergrößen (oben/unten) unabhängig und stufenlos, Unterkiefer bis null.

### Bild 6 — Hals-Wesen
Giraffen (Birnenkörper, langer sich verjüngender Hals, kleiner Kopflappen, Maul **oben am Kopf über dem Hals**, beim Gähnen rundes Loch), Flamingo (S-Hals, gebogener Schnabel), Dackel (sitzend, lange Schlappohren, Kopf hoch, Maul als Naht; heulend offen nach oben). Gleicher Bauplan, nur Hals-Länge/-Dicke und Kopfneigung.

### Bild 7 — Zähne bei geschlossenem Maul
Unterbiss-Hauer stehen über die Oberlippe; Maulnaht deutlich sichtbar; Zähne müssen in Ausrichtung und Abstand auch **geschlossen** passen (ineinandergreifen, nicht durchdringen).

### Bild 8 — Hunde
W-Form der Oberlippe, schwarzer Nasenspiegel, Schlappohren als Lappen, langes Fell als **flammenartige Büschel** (Retriever: Mähne aus großen weichen Zungen mit Verlauf), Heulen = Kopf nach oben, Maul offen, Zunge sichtbar.

### Bild 9 — Raubkatzen geschlossen
Kantiger Kiefer, eckiges Kinn, Wangen breit; Augen als schmale gelbe Schlitze; Tigerstreifen als **gemalte dunkle Pinselstriche mit Spitzen**; Mähne als Büschelkranz um den Kopf, der Gesicht und Maul frei lässt; Schwanz als dünner, oben eingerollter Bogen mit Farbverlauf.

### Bild 10 — Augen am Jellyblob
Großes Auge: weiße Sklera, schwarze Iris, weißes Glanzlicht, **dunkler Ring** (Augenhöhle) auf dem Körper; geschlossen = **Sichel**; Spirale; X; gequetschter Blob (Splat). Kleine Zähnchen am unteren Rand.

### Bild 11 — Rex-Kopf
Auge tief eingesunken unter Brauenwulst (rot-orange mit gelber Iris, schwarze Pupille), Nasenlöcher als Punkte, zwei Zahnreihen, Mundinneres dunkelrot. → Regler „Augen-Tiefe“ (0 = aufgesetzt wie Bild 10, 1 = eingesunken wie hier); Blinzeln muss in beiden Fällen funktionieren (Lider aus Körpermaterial).

### Bild 12 — Beine
Rex: dicke Schenkel, Beine gehen nahtlos aus dem Körper hervor; kleiner Dino: zwei Stampfer; Retriever: vier Pfoten; Lion: Pfoten untergeschlagen. Füße verlaufen weich in den Boden (Saugnapf).

### Bild 13 — Schlangen-/Aal-Unterkörper
Blauer Drachenfisch mit eingerolltem Schlangenkörper, Flossen, verzerrungsfreiem Schuppenmuster. → Unterkörper „Schlange“ als Wirbelsäule mit vielen Gliedern; Muster in Wirbelsäulen-Koordinaten (Bogenlänge × Umfangswinkel), damit Schuppen nie verzerren.

### Bild 14 — vier Maultypen offen
Rex (Winkel weit hinten), Panther (Katzenmaul, Fangzähne), Retriever (Hundeschnauze), Tiger (Raubkatze, breit). Alle: Zunge, dunkler Rachen, cremefarbene Zähne auf den Lippen.

### Bild 15 — Spinnen und Vögel
Spinnen: **zwei Beintypen**, dünn-eklig (lang, dunkel, knickig) und dick-behaart (kurz, fluffig, gestreift); zwei schwarze Schlitzaugen. Vögel: runde Fellkörper, **sehr dünne Beine** mit großen Füßen (stufenlos lang bis absurd), Schnabelformen (Flamingo gebogen, Tukan riesig, Ara-Haken, Kakadu-Haube, Pfau-Krone mit Schleppe, Eule flach), Farbfelder hart gegeneinander.

### Bild 16 — Lieblinge
Drachenfisch, Langhals-Dino mit Rückenkamm, Betta, Rex, Retriever, Drache ohne Unterkiefer — die Messlatte für Form, Muster und Shading.

### Bild 17 — Muster-Bogen (zu übersetzen)
Winged-Insekten (Biene, Falter, Pfauenfalter, Phönix); Fell-Blobs (Hunderassen, Schaf, Dalmatiner, Collie …); Tiger- und Leopardenfell in Größenreihe; Feuersalamander (gelb-schwarz); Reptil/Schlange (grün, Python, Schildkröte, Chamäleon); Fische (Clownfisch, Koi, Paletten-Doktor, Punkt); **Wale/Orca/Hai** (blau-grau, weißer Bauch — der helle Bauch liest sich als Kiefer); **Krokodile** (grüne Schuppen, Bauchplatten = Maulkante). → Übersetzung in den Stil von Bild 3: dieselben Farbfelder, aber harte Siebdruckstufen mit Verlauf innen, gemalte Striche, Papierkorn; die Bauch-/Kieferflächen werden echte Maulkanten des Systems.

### Bild 18 — feste Blobs, Nebel, Feuer
Oben: zwei feste Blobs (violett, grau-türkis) mit **feinem Korn und Glimmer** (Schimmerpunkte im Licht, Verlauf nach unten dunkler). Mitte: **Nebelwesen** (grün → türkis, wabernde Schwaden nach oben, Rauchfetzen, Augen als Schlitze), Größenreihe. Unten: **Feuerwesen** (gelb → orange → rot → magenta → violett, Flammenzungen, Funken), Größenreihe. Diese Optik soll **exakt** getroffen werden.

### Bild 19 — Exposition
Jellys (violett, türkis), Drachenfisch, Retriever, Giraffe, Dackel, Langhals-Dino, schwarzer Drache (grüne Augen), Drache ohne Unterkiefer, Rex, Pfau, Ara, Pinguin, Drachenkopf-Varianten, drei Elefanten (wunderschön, Stil passt nicht ganz — Rüssel mit Falten, Stoßzähne, Ohrensegel), violette Stacheldrachen-Reihe (klein → groß mit Flügeln). Lieblinge: Rex, geflügelte Drachenschlange, Retriever.

### Stil-Nenner über alle Bögen
- Keine Kontur; Form durch Wertkontrast, Rim rechts oben, weicher Kernschatten links unten.
- Weiche, **gemalte** Verläufe innerhalb klar begrenzter Farbflächen; Farbflächen stoßen hart aneinander (Bauch/Rücken, Streifen, Augenring).
- Feines Papierkorn/Airbrush-Rauschen in allen Flächen; Glimmerpunkte bei festen Blobs.
- Dunkle Pinselstriche mit Spitzen als Muster (Tiger, Fischstreifen, Drachenrücken) — Linien **in** der Form, nie um sie herum (Konturen-Regel).
- Fell/Mähne/Federn als große, weiche **Flammenbüschel** mit Verlauf, nicht als Haar-Shells.
- Zähne cremefarben, Rachen maroon, Zunge rosa, Augen gelb/schwarz/weiß mit dunklem Ring.

---

## Befund: warum die Prototypen nicht überzeugt haben

Aus den Fortschrittsbildern (`docs/progress/iter4-b5-setzkasten-desktop.png`, `p1b-fur-tiger.png`, `p1-blob-*`) und dem GDD §7:

1. **Körper = Ei plus angeklebte Teile.** Die alten Wesen sind gestreckte Ellipsoide mit aufgesetzten glTF-Modulen (Augen, Beine, Hörner aus `content/genome/assets/*.glb`). Es gibt keine Maul-Architektur: kein Keil, keine Kiefer, keine Lippenkanten, keine Zahnlogik. Florians Bögen leben aber vom Maul.
2. **Shading ist CG, nicht gemalt.** Glatte Lambert-Flächen mit Glanz; keine Siebdruckstufen mit Verlauf innen, kein Papierkorn, kein Rim von rechts. Fell als Strichhaufen (Tiger-Bild) statt großer weicher Büschel.
3. **Muster verzerren**, weil sie in Objektkoordinaten oder Standard-UVs laufen (Schuppen der Schlange). Verzerrungsfreie Muster brauchen Wirbelsäulen-Koordinaten.
4. **Meshy-Modelle** (Cloud-Session) sind statisch: kein stufenloses Verformen, kein Verschmelzen, fremder Stil, fremde UVs. Genau die Eigenschaften, die das System braucht, fehlen.
5. **Gut und übernehmbar:** Jelly-Material (Glanz, Organe, Bläschen, Subsurface) und die blinzelnden Schlitzaugen; die Verschmelz-Idee als SDF-Smooth-Min; die Draufsicht-Dynamik des Spielfelds; Labs/Editoren als touch-first-Teil der App.

---

## Recherche (Kurzfassung mit Quellen)

- **Spore** (Chris Hecker, Maxis): Körperhaut als implizite Fläche (Metaballs entlang der Wirbelsäule), **komplettes Mesh wird live generiert**, während der Spieler Torso und Gliedmaßen verändert; Gewichte aus „welches Teil hat welchen Metaball erzeugt“ (Probleme bei dicken Torsi — heute lösbar durch distanzbasierte, geglättete Gewichte); Animation morphologie-unabhängig als generalisierte Ziele + IK (SIGGRAPH 2008). Quellen: [Hecker, Liner Notes](https://www.chrishecker.com/My_Liner_Notes_for_Spore), [Motion Retargeting](https://www.chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies), [Procedural Texturing (SIGGRAPH 2007)](https://history.siggraph.org/learning/player-driven-procedural-texturing-by-debry-goffin-hecker-quigley-shodhan-et-al/).
- **SDF → Mesh in WebGPU**: Marching Cubes als Compute-Shader (Zelle pro Thread, Atomics, direkter Vertex-Puffer) ist in three.js/WebGPU machbar ([Cinevva 2026](https://app.cinevva.com/blog/2026-02-25-open-world-browser-part-07-marching-cubes.html)); three r186 bringt `StorageBufferNode`, `Texture3DNode`, `AtomicFunctionNode`, `ComputeNode` mit, dazu `examples/jsm/objects/MarchingCubes.js` (CPU) und `tsl/utils/Raymarching.js`. Für uns reicht zunächst **CPU-Extraktion im Worker** (Mesh wird nur beim Editieren und beim Laden erzeugt, nie pro Bild); GPU-Compute ist eine spätere Beschleunigung.
- **Fell auf Mobilgeräten**: Shells/Fins sind wegen Overdraw ungeeignet; Karten/Büschel sind der Standard ([80.lv](https://80.lv/articles/classic-video-games-trick-for-rendering-grass-fur/), [SIGGRAPH 2015 Poster TOS](https://history.siggraph.org/wp-content/uploads/2022/10/2015-Poster-34-Jiao_Dynamic-Fur-on-Mobile-using-Textured-Offset-Surfaces.pdf)). Florians Referenzen zeigen ohnehin **wenige große, weiche Flammenbüschel** → instanzierte Büschel-Geometrie mit Verlauf.
- **iOS 26 / Safari 26**: WebGPU inkl. Compute standardmäßig aktiv, auch in WKWebView ([App Developer Magazine](https://appdevelopermagazine.com/webgpu-in-ios-26/), [Apple Forums](https://developer.apple.com/forums/thread/770862)). Simulator bleibt WebGL2 → alles muss ohne Compute laufen.
- **Eigene Messungen** (2026-09-29, iPhone 16): 36 Jiggle-Meshes 60 fps / p99 17 ms; 36 Raymarch-Blobs nur mit Mobil-Preset 60 fps → **Raymarching nur für den Verschmelzmoment**, Wesen als Meshes.

---

## Grundentscheidung: ein Bauplan, drei Darstellungen

**Ein Wesen ist ein Bauplan** (`Bauplan`, JSON, engine-frei): Wirbelsäule mit Querschnitten, Hals, Kopflappen, Maul, Zähne, Augen, Unterkörper, Schwanz, Anbauten, Muster, Material, Verhalten. Aus demselben Bauplan entstehen:

| Darstellung | Wofür | Technik |
|---|---|---|
| **Implizite Form (SDF)** | Konstruktion: Körper, Hals, Kopf, dicke Beine, Schwanz, Rüssel verschmelzen nahtlos; Maul wird **herausgeschnitten**; Augenhöhlen werden eingesenkt | Smooth-Min aus Kapseln/Ellipsoiden entlang von Kurven; **eine** Definition für CPU (TS) und GPU (TSL) |
| **Skinned Mesh** | Alles, was im Spiel steht, läuft, schwimmt, fliegt (36 Wesen auf dem Brett, 60 fps) | Surface Nets im Worker (32³ Brett / 64³ Editor) mit **analytischen Normalen**, **Teil-Gewichten** (prozedurales Skelett) und **Wirbelsäulen-Koordinaten** (u = Bogenlänge, v = Winkel, Umfang) für verzerrungsfreie Muster |
| **Raymarch-Proxy** | Der Verschmelzmoment (zwei Flüssigkeiten) und die Jelly-Stufe (Innenorgane) | bestehender Jelly-Raymarcher + zeitlich geblendete Smooth-Min-Union beider Baupläne, Fäden und Tropfen |

Diskrete Teile sind **eigene Geometrie** und hängen am Skelett: Zähne (instanzierte Kegel auf den Lippenkurven), Augen (Kugeln + Lider aus Körpermaterial), Zunge, Fell-/Mähnen-Büschel, Flossen, Flügel, Ohren, Hörner, Rückenkamm, Schnäbel, **dünne Vogel- und Spinnenbeine** (ausdrücklich nicht dasselbe Mesh), Flammenzungen, Nebelschwaden.

**Warum nicht pur Raymarching?** 36 Wesen mit Maul, Zähnen, Beinen und Mustern pro Pixel zu marschieren sprengt jedes Mobilbudget (Messung oben), Fell/Zähne/Flügel sind ohnehin Geometrie, und scharfe gemalte Muster brauchen stabile Oberflächenkoordinaten.
**Warum nicht Loft/parametrisches Mesh?** Beine, Hals, Schwanz, Rüssel und Maul in beliebiger Kombination nahtlos zu verbinden („aus dem Körper geknetet“) kann nur eine implizite Fläche. Spore hat genau diesen Weg bewiesen.
**Warum nicht Meshy/Blender-Basismeshes?** Statisch, fremder Stil, kein stufenloses Morphen, kein Verschmelzen — das ist gescheitert.

### Der Bauplan (Datenmodell, Auszug)

```
Bauplan {
  stufe, material: 'jelly'|'fest'|'fell'|'feuer'|'nebel'|'schuppe',
  koerper: { laenge, breite, hoehe, kubik (0 rund … 1 würfelig), bauch, buckel, neigung, querschnitte[5] },
  hals:    { laenge 0…1.5, dicke, kruemmung (S-Form), ansatzHoehe },
  kopf:    { groesse, neigung, stirn, wangen, schnauzeLaenge, schnauzeDicke, brauenwulst },
  maul:    { hoehe 0 (ganz unten am Blob) … 1 (oben am Kopf), neigung (Winkel der Maullinie), form 0 (rundes Loch) … 1 (Keil),
             winkelRueckzug 0…1, breite, oberkiefer, unterkiefer 0…1 (0 = kein Unterkiefer),
             biss −1 (Unterbiss) … +1 (Überbiss), lippenRundung, kieferKante 0 (weich) … 1 (kantig), wForm 0…1, nasenspiegel,
             oeffnung 0…1 (Animationsziel), zunge: { groesse, farbe }, schnabel?: 'tukan'|'ara'|'flamingo'|'kakadu'|'eule'|'pinguin' }
  zaehne:  { stil: 'rund'|'spitz', groesse, streuung, dichte, eckzaehne, hauer (Unterbiss-Hauer), seed }
  augen:   { anzahl 1…4, positionen[] (Kopf-Kugelkoordinaten), groesse, tiefe 0 (aufgesetzt) … 1 (eingesunken), ring,
             typ: 'schlitz'|'gross'|'schlange'|'drache'|'schwarzweiss', iris, pupille, blinzelrate, ausdruck: 'offen'|'sichel'|'spirale'|'x' }
  unterkoerper: { typ: 'beine'|'vogel'|'spinneDuenn'|'spinneFlauschig'|'schlange',
                  beine: { anzahl 2|4|8, dicke, schenkel, laenge, fussGroesse, saugnapf }, schlange: { laenge, dicke, einrollen } }
  schwanz: { typ: 'keiner'|'wirbelsaeule'|'anhang'|'quaste'|'bogen', laenge, dickeVerlauf[], hoch }
  anbauten: [ { art: 'ohr'|'fluegel'|'rueckenkamm'|'maehne'|'frisur'|'ruessel'|'horn'|'flosse'|'kamm'|'schleppe'|'fuehler', form, groesse, position, farbe } ]
  muster:  { typ: 'uni'|'streifen'|'rosetten'|'platten'|'schuppen'|'punkte'|'bauchRuecken'|'flecken'|'ringel'|'salamander'|'koi',
             bereiche: { grund, bauch, muster, akzent, … → Farben }, dichte, groesse, drehung, pinselSpitze, zittern, seed }
  shading: { stufen 2…4, verlaufInStufe, rim, korn, glimmer, bauchlicht, lichtAzimut, lichtHoehe }
  verhalten: { tempo, schwere, neugier, fortbewegung: 'laufen'|'schlaengeln'|'schwimmen'|'fliegen', hoehe }
}
```
Alle Regler stufenlos, mit Vorgabebereichen und Kompatibilitätsregeln (z. B. Schlange ⇒ kein Schwanz; Vogel ⇒ Schnabel ersetzt Lippen). Zod-Schema mit `schemaVersion`; deterministisch über `seed`.

### Konstruktion im Detail

- **Körper**: 5 Querschnitte entlang einer Mittellinie (Kuppel mit flachem Boden als Ausgangsform), Kubik-Regler blendet die Querschnitte von Kreis zu Superellipse; Bauch/Buckel verschieben Querschnitte; Neigung kippt die Achse. Hals = Kapselkette mit eigener Krümmung; Kopf = Ellipsoid-Lappen am Halsende (bei Hals 0 verschmilzt er mit dem Körper → Rex/Fisch).
- **Maul (Kern des Systems)**: ein *Maulvolumen* wird vom Kopf subtrahiert. Es ist zwischen zwei Lippenkurven aufgespannt (Ober-/Unterlippe als Kurven um die Kopfachse). `hoehe` setzt die Maullinie stufenlos von ganz unten am Blob bis oben an den Kopf, `neigung` kippt sie — damit entstehen die Grundblobformen der Skizze (Florian, 07.10.); bei Hals > 0 liegt das Maul vorn bzw. oben am Kopflappen (Giraffe). `form` blendet von **Lochmaul** (beide Lippen ein Ring, Öffnung = radiale Weitung) zu **Keilmaul** (Lippen laufen in Mundwinkeln zusammen, Öffnung = Rotation des Unterkiefers); `winkelRueckzug` schiebt die Mundwinkel entlang der Kopfseite nach hinten (bis hinter die Augen); `oberkiefer`/`unterkiefer` skalieren die Kiefermassen, Unterkiefer 0 ergibt den Drachen ohne Unterkiefer (Öffnung liegt am Hals); `biss` verschiebt die Kiefer gegeneinander; `kieferKante` härtet die Unterkieferkontur (Raubkatze), `wForm` formt die Oberlippe (Hund/Katze) mit Nasenspiegel. Innenraum = eigener Materialbereich (Maroon-Verlauf nach hinten), Zunge = Ellipsoid am Unterkieferknochen. **Geschlossen ist der Konstruktionszustand**: Lippen liegen aufeinander, die Naht ist nur Wertkontrast (Giraffe) oder sichtbare Kante (Rex); Öffnen passiert im Rig.
- **Zähne**: an den Lippenkurven des geschlossenen Zustands abgetastet, oben/unten um eine halbe Teilung versetzt → greifen ineinander, durchdringen nie; Größe aus Seed (groß/klein-Wechsel, Eckzähne größer); Ausrichtung = Lippennormale → Kieferrichtung; Hauer ragen nach oben über die Oberlippe, Fangzähne unter der Oberlippe hervor; Zähne hängen an Ober-/Unterkieferknochen.
- **Augen**: Kugel mit Höhle (SDF-Subtraktion, `tiefe`), Brauenwulst wächst mit der Tiefe; dunkler Höhlenring auf dem Körper = Funktion des Abstands zur Augenkugel (kein UV nötig); Lider = zwei Kugelkappen aus Körpermaterial, drehen um das Augenzentrum → Blinzeln funktioniert in jeder Tiefe; Schlitzauge = analytisches SDF auf der Körperfläche (Port der blinzelnden Schlitzaugen); Ausdrücke (Sichel, Spirale, X) = 2D-SDF-Glyphen auf einer Scheibe im Augenbereich; Blick folgt Ziel (Finger/REX).
- **Unterkörper**: dicke Beine = Kapselketten **im SDF** (Schenkeldicke = Blend-Radius, Saugnapf = Fuß weitet sich am Boden) mit Hüfte/Knie/Fuß-Knochen; Vogelbeine und Spinnenbeine = eigene Röhren-Meshes (zwei Spinnen-Stile: dünn-knickig, dick-behaart mit Büscheln), Länge/Fußgröße stufenlos; Schlange = Wirbelsäule nach hinten verlängert mit vielen Gliedern, Einrollen im Idle.
- **Schwanz**: `wirbelsaeule` setzt die Mittellinie fort (Rex: horizontale Linie Schnauze–Spitze, hebt den Körper), `anhang`/`bogen`/`quaste` als Kapselkette mit Dickenverlauf, Quaste als Büschelcluster; alle als Federkette.
- **Anbauten** als prozedurale Module mit Sockeln auf der Fläche: Ohren (Lappen-Ellipsoid mit Falz: schlapp/spitz/rund), Flügel (Fledermaus: Fingerknochen + Membranfläche aus Splines, zweifarbig; Feder: gestaffelte Federkarten), Rückenkamm (Instanzen entlang der Wirbelsäule mit Größenkurve: Stachel/Flosse/Feder/Fell), Mähne/Frisur (Büschelkranz mit **Gesichtsmaske** aus Maul- und Augen-SDF), Rüssel (Kapselkette **im SDF**, Länge/Dicke, Falten als Linienmuster), Hörner (gewundene Kegel), Schnäbel (ersetzen die Lippen durch Keratin-Bereich mit Formvorgaben), Pfauen-Schleppe, Fühler.
- **Muster** rechnen im Shader in Wirbelsäulen-Koordinaten je Teil (u, v, Umfang) plus 3D-Rauschen im Körperraum (nahtlos): Streifen als gemalte Striche mit Spitzen und Zittern (Tiger), Rosetten (Leopard), Platten (Giraffe), Schuppen als Sechseckkacheln, deren Größe mit dem Umfang skaliert (nie verzerrt), Punkte (Drachenfisch), Bauch/Rücken-Teilung mit hart gemalter Kante (Wal, Orca, Koi, Krokodil-Bauchplatten), Flecken, Ringel, Salamander. Bereiche → frei wählbare Farben.
- **Shading** („Earle-Wesen-Material“, TSL, eine Materialfamilie): Lichtrichtung als Uniform (Standard rechts oben), 2–4 Siebdruckstufen mit Verlauf **innerhalb** jeder Stufe (Florians Regel), weicher Terminator-Wrap, Rim auf der Lichtseite, Bodenkontakt-Abdunklung, Papierkorn (triplanar, getönt), **Glimmer** (spärliche Funken im Lichtband, langsam animiert) für feste Blobs, Linienmuster-Ebene. Alles kombinierbar im Editor.
- **Jelly** (Stufe 1): bestehendes Material/Raymarcher weiterverwenden (Glanz, Organe, Bläschen, Subsurface), gespiegelt auf Licht von rechts; **kein Mund**; Verschmelzen als echter Flüssigkeitsblend (Smooth-Min mit Viskositätskurve, klebrige Fäden = dünner werdende Kapsel zwischen den Zentren, Tropfen fallen zurück).
- **Feuerwesen**: Körper emissiver Verlauf gelb → orange → rot → magenta → violett nach Höhe/Stufe, **Flammenzungen** als instanzierte gebogene Kegelsegel an der Oberseite (Rauschen, Aufsteigen, Flackern), Funken als kleine aufsteigende Quads; Augen als Schlitze. **Nebelwesen**: weicher grün → türkis Verlauf mit Fresnel-Ausdünnung am Rand, **Schwaden** als instanzierte, nach oben kringelnde Segel, abreißende Fetzen (kleine, verblassende Kugeln). Beides nach Bild 18, Größenreihe je Stufe.
- **Fell/Mähne/Federn**: instanzierte Flammenbüschel (zweiseitige gebogene Segel mit Verlauf Wurzel → Spitze, Länge/Krümmung/Dichte als Felder über die Fläche, Poisson-Verteilung in Wirbelsäulen-Koordinaten, Platzierung im Knochenraum → folgen der Animation), Wind/Federn als Rauschen; funktioniert mit jedem Muster (Tiger-/Leopardenfell färbt die Büschel aus dem Muster).
- **Animation (prozedural, keine Keyframes)**: Idle (Atmen, Gewicht, Blick, Blinzeln, Schwanz-/Ohrenfedern), Gang per Beinanzahl (2: Zweibeiner; 4: Schritt/Trab mit Phasen 0/½/¼/¾; 8: wechselnde Vierergruppen; Vogel mit Kopfnicken) aus Fußzielen im Körperraum + analytischer Zwei-Knochen-IK, Körperhub aus der Gangphase, Tempo aus Masse (dick = behäbig), Schlängeln (Kopfspur, S-Wellen), Schwimmen (Schwebe-Abstand zum Feld, Körperwelle, Flossenflattern, Gleiten mit Rollen), Fliegen (Schweben, Flügelschlag nach Größe, Schatten bleibt am Boden), Maul (öffnen/schließen/kauen/brüllen/gähnen: Kieferknochen + „Spitzmund“-Morph fürs Lochmaul), Quetschen (Vertex-Shader wie bisher), Verschmelzen (Proxy-Blend, dann Pop ins Kind-Mesh).
- **Leistung**: Mesh pro Art einmal erzeugt und gecacht (Wesen sind pro Zone/Stufe deterministisch), Brett-LOD 32³ (≈ 3–5 k Dreiecke), Editor 64³; Zähne/Büschel/Zungen instanziert; ≤ 40 Zeichenaufrufe für 36 Wesen; Ziel iPhone p99 ≤ 16,7 ms bei 36 Wesen mit Fell; `?bench=wesen`.

---

## Der Look-Vertrag: so wird der Stil der Bögen getroffen

Aus Bild 3, 5, 8, 9, 11, 13, 14, 16, 18 abgeleitete Regeln. Jede Regel ist im Material bzw. in der Geometrie **fest eingebaut**, nicht Sache der einzelnen Vorlage — deshalb gilt sie automatisch für jede Kombination. Zahlen sind Startwerte für die Abnahme; den Feinschliff macht Florian im Licht-&-Shader-Tab, der gewählte Stand wird als **Stil-Vorgabe** gespeichert und für alle Wesen übernommen.

| # | Merkmal in den Bögen | Regel im System | Prüfbar durch |
|---|---|---|---|
| 1 | **Licht von rechts oben**, Kernschatten links unten, weicher Terminator | Figurenlicht als eigene Uniform (Azimut ≈ +35–45° rechts, Höhe ≈ 40°), unabhängig von der 10°-Sonne der Karte (Bodenschatten kommen weiter von der Sonne). Wrap-Diffuse statt hartem N·L | Montage: Lichtseite immer rechts oben, in jeder Pose und Kombination |
| 2 | **Drei Wertzonen, in sich verlaufend** (Licht ≈ +12 %, Grund, Schatten ≈ −30 %), Übergänge weich gemalt, kurz (5–10 % der Körperhöhe), keine harten Cel-Kanten | `stepRamp`-Stufen mit **einstellbarer Federung** der Kanten und Verlauf innerhalb jeder Stufe; Vorgabe für Figuren weicher als für die Welt (Florian: „der Stil meiner Bilder … passt gut zu Earle“) | Histogramm der Montage: drei Plateaus, Lichtseite/Schattenseite ≈ 1,4–1,6 |
| 3 | **Schatten sind Farbe, nicht Grau**: dunkler, gesättigter, leicht kühler (Rex: Grauviolett → Tiefviolett; Retriever: Gold → Rostbraun) | Schattenfarbe je Farbrolle aus OKLab: L −0,12…−0,18, Chroma +0,02, Farbton 8–15° zum Kühlen; nie Schwarzmischung; Tinte getönt | Farbproben in der Montage; keine Grau-Schatten |
| 4 | **Keine Kontur**; Silhouette durch Wertkontrast, feiner Rim rechts oben | Konturen-Regel (Zustand 1), Rim ≈ 0,15 Breite nur zur Lichtseite, Rim-Farbe = aufgehellte Grundfarbe | Kantenprüfung: kein Pixel dunkler als die Tinte am Umriss |
| 5 | **Papierkorn / Airbrush-Rauschen** in allen Flächen, deutlich in Mitteltönen | triplanares Wertrauschen 3–6 % Amplitude, im Körperraum (wandert nicht), skaliert mit der Bildschirmgröße | Zoom-Montage; Korn sichtbar, nie körnig flimmernd |
| 6 | **Farbflächen stoßen weich-hart aneinander** (Bauch/Rücken, Augenring, Flossen, Flügelmembran) | Regionen aus Deskriptoren (Bauch/Rücken, Gesicht, Lippe, Rachen) mit Federung 1–2 % der Körperhöhe, Grenzen leicht gewellt (Rauschen) wie gemalt | Montage Wal/Orca/Koi (Bild 17 → Stil Bild 3) |
| 7 | **Muster als Pinselstriche** mit Spitzen (Tiger), weiche Rosetten mit hellem Kern (Leopard), Platten mit schmalen hellen Fugen (Giraffe), Sechseckschuppen mit Verlauf je Schuppe (Drachenfisch), senkrechte Fischstreifen, Sprenkel | Muster rechnen in Wirbelsäulen-Koordinaten, umfangstreu, mit Spitzen (`taper`), Zittern, weicher Kante; Musterfarbe folgt Regel 3 im Schatten | Montage Tiger (Bild 9/14), Leopard (Bild 3), Drachenfisch (Bild 13) |
| 8 | **Muster respektieren Gesicht und Maul**: Augen liegen frei, Lippen und Rachen tragen kein Muster, Streifen laufen auf das Gesicht zu und enden in Spitzen | Gesichts-/Lippen-/Rachenmasken aus den SDF-Teilen; Musterdichte läuft zur Maske auf 0 aus | jede Vorlage mit Muster, Nahaufnahme Kopf |
| 9 | **Maul**: Lippenwülste, cremefarbene Zähne (hell an der Spitze, warmer Schatten am Ansatz), Rachen Maroon → Schwarzrot nach hinten, Zunge Rosa mit hellem Mittelband | eigene Farbrollen Zahn/Zahnfleisch/Rachen/Zunge, Rachen-Verlauf nach Tiefe, Zahn-Verlauf entlang der Achse | Montage Bild 5/11/14 offen, Bild 7/9 geschlossen |
| 10 | **Augen** gelb mit Schlitz-/Rundpupille, schwarz mit weißer Pupille, weiß mit schwarzer Iris, dunkler Höhlenring, tief eingesunken beim Rex | Augentypen mit eigenen Farbrollen, Höhlenring aus Abstand, Tiefe-Regler | Montage Bild 10/11, Blinzeln in jeder Tiefe |
| 11 | **Fell und Mähne als große weiche Flammenbüschel**, 8–25 % der Körperhöhe, in Schichten, Verlauf Wurzel → Spitze, der Körperströmung folgend; Silhouette von Büscheln gebrochen | Büschelsystem mit Längen-/Krümmungsfeldern, Verlaufsmaterial (erbt Muster und Regeln 1–5), Gesichtsmaske | Montage Retriever (Bild 8), Löwe (Bild 9), fluffige Spinne (Bild 15) |
| 12 | **Feste Blobs mit Glimmer** (Bild 18 oben): Verlauf nach unten dunkler, feines Korn, spärliche helle Funken im Licht | Glimmer-Ebene: Funken nur im Lichtband, langsam animiert | Montage Bild 18 oben |
| 13 | **Feuer**: Gelb → Orange → Rot → Magenta → Violett nach Höhe und Stufe, Flammenzungen, Funken; **Nebel**: Grün → Türkis, weich ausdünnender Rand, Schwaden, Fetzen | eigene Materialfamilien mit festen Verläufen aus Bild 18, Augen bleiben scharf | Größenreihe gegen Bild 18 Mitte/unten |
| 14 | **Formensprache**: weiche Massen, Kopf und Maul dominieren (Kopf 40–60 % der Höhe bei Rex/Hund), kurze dicke Gliedmaßen, Saugnapf-Füße, Schwanz als klare Kurve | Bauplan-Vorgabebereiche und Vorlagen; Glättung 64³ gegen Facetten | Silhouetten-Vergleich im Overlay |
| 15 | **Bögen-Ansicht**: Dreiviertel von rechts vorn, leicht von oben, weißer Grund | **Referenzmodus** im Lab/Editor: weißer Grund, Bögen-Kamera, Overlay mit Deckkraft — damit der Vergleich eins zu eins ist | jede Abnahme |

**Stil-Vorgabe als Datei:** `content/creatures/stil.json` (Licht, Federung, Stufen, Korn, Rim, Schattenregel). Jedes Wesen liest sie; eine Änderung dort ändert alle Wesen gleichzeitig. So bleibt der Look eine Entscheidung, nicht hundert.

## Alle Kombinationen im selben Look

Der Editor kombiniert frei: Körperform (stufenlos) × Maulhöhe (stufenlos) × Maulform (Loch ↔ Keil, Winkel, Kiefer, Biss) × Hals × Unterkörper (dicke Beine 2/4, Vogel, Spinne ×2, Schlange) × Schwanz (5 Typen) × Anbauten (12 Arten, mehrfach) × Muster (11) × Material (Jelly, fest, Fell, Schuppe, Feuer, Nebel) × Augen (5 Typen × 1–4) × Zähne. Dass **jede** Kombination im Look bleibt, folgt aus der Bauweise, nicht aus Handarbeit:

1. **Eine Materialfamilie** für alle Körper mit den Regeln des Look-Vertrags; Teile tragen **Materialklassen** (Haut erbt Körperhaut samt Muster und Fell, Keratin für Schnäbel/Hörner/Krallen, Membran, Zahn, Rachen, Auge) — ein Rex-Maul an einem Giraffenhals mit Fischschuppen trägt deshalb Schuppen bis zur Lippe und dort den Rachen des Rex.
2. **Deskriptoren statt UVs**: Muster, Fell und Regionen lesen nur Bogenlänge, Winkel, Umfang, Bauch/Rücken, Gesichtsmaske — sie wissen nicht, ob das Teil ein Hals, ein Schwanz oder ein Spinnenbein ist.
3. **Ein Licht, eine Palette-Logik** (Farbrollen, Schattenregel 3) für Körper, Büschel, Zähne, Augen, Flügel.
4. **Kompatibilitätsregeln** (zod) verhindern Unsinn (Schlange + Schwanz, Schnabel + Zähne), erlauben aber bewusst Absurdes (Vogelbeine am Rex).
5. **Kombi-Kontaktbogen im Harness**: je Phase 24 zufällige Kombinationen plus feste **Chimären-Abnahme** (Giraffenhals + Rex-Maul + Drachenfisch-Schuppen + Löwenmähne + Spinnenbeine; Retriever-Fell + Drachenmaul + Flügel) — alle müssen wie vom selben Bogen aussehen. Automatische Vorprüfung (Wertzonen, Sättigung, Kantenkontrast, Masken frei), Urteil Florian.

**Fertig** heißt: ≥ 20 Vorlagen treffen ihre Bögen in der Montage nach Florians Urteil, die Chimären bestehen, und ein frei gebautes Wesen ohne Vorlage sieht ebenso aus.

---

## Editor „Wesen-Werkstatt“ (Bedienkonzept)

Route `/werkstatt/wesen` in der App (touch-first; mobil liegen die Regler als Bottom-Sheet über der Ansicht).

- **Ansicht**: Drehteller mit Orbit/Zoom, Earle-Boden mit hartem Schatten, Umschalter *Held* (groß) / *Brett* (3×3 Wesen in Spielfeldkamera und -größe) / *Reihe* (Größenreihe der Stufen); **Referenzbild-Overlay** (Bild laden, Deckkraft, Spiegeln) zum direkten Vergleich mit Florians Bögen; Screenshot-Knopf (in `docs/progress/`).
- **Tabs** (links/unten): Körper · Hals & Kopf · Maul & Zähne · Augen · Beine · Schwanz · Anbauten · Muster & Farben · Material & Licht · Animation. Jeder Tab: gruppierte Regler mit sprechenden Namen und Live-Wert, **Würfel** (nur diesen Tab zufällig), Schloss je Regler, Zurücksetzen je Tab.
- **Kopfzeile**: Vorlagen (Jelly, fester Blob, Rex, Drache ohne Unterkiefer, Giraffe, Retriever, Dackel, Tiger, Löwe, Panther, Drachenfisch, Betta, Kugelfisch, Spinne dünn/flauschig, Tukan, Flamingo, Pfau, Elefant, Feuer, Nebel …), Speichern/Laden (JSON in `content/creatures/`), Rückgängig/Wiederholen, A/B-Vergleich, glTF-Export (für Blender), Teilen-Bild.
- **Animationsleiste**: Idle · Laufen · Schlängeln · Schwimmen · Fliegen · Maul auf/zu · Brüllen · Blinzeln · Quetschen · **Verschmelzen** (Partner aus den Vorlagen) · Schleife/Scrubben · Zeitlupe.
- **Licht & Shader**: Azimut/Höhe (Vorgabe „Earle: rechts oben“), Stufenzahl, Verlauf-Anteil, Rim, Korn, Glimmer, Linienmuster, Bauchlicht — frei kombinierbar; Vergleich `?verlauf=0` bleibt.
- **Qualität**: während des Ziehens 32³ live, beim Loslassen 64³ im Worker; Anzeige der Dreiecke/Zeichenaufrufe/Budget-Ampel für das Brett.
- **Tab „Stufen“ (Wachstum)**: Bild 17/18 zeigen Größenreihen über 13 Stufen. Ein Bauplan trägt Wachstumskurven (Größe, Proportionen, welche Anbauten ab welcher Stufe, Musterdichte, Flammen-/Schwadenmenge); Stützstufen 1 · 5 · 9 · 13, dazwischen interpoliert; Ansicht *Reihe* zeigt alle 13.

---

## Was aus dem Repo übernommen wird (geprüft)

| Baustein | Datei | Verwendung |
|---|---|---|
| Jelly-Shading (Glanzbogen + Punkt, Organe, Bläschen, Fresnel-Rim, Wrap-Diffuse, Rippel) | `packages/render/src/blob/blobShading.ts` (`shadeBlob`, Zweig 0), `blob/RaymarchBlobMaterial.ts`, `blob/compileSdf.ts`, `blob/blobParamsUniforms.ts` | Jelly-Stufe und Verschmelz-Proxy; Licht auf **rechts oben** spiegeln (`lightDir` Z. 17, `rimDir` Z. 347, Punkt-Versatz Z. 351, Organ-Ellipse `JiggleBlobMaterial.ts:87`) |
| Schlitzauge | `blobShading.ts` `analyticEyeMask`/`analyticEyeRing` (Z. 406–413), `blob/faceGlyph.ts` | Schlitz-Typ der neuen Augen; Blinzeln neu (Kappen bzw. Höhenskalierung) |
| Blinzelkurve, Federketten, Idle-Uhr | `packages/genome/src/procedural.ts` (`blinkAmount`, `SpringChain`, `IdleClock`) | unverändert übernehmen |
| Surface Nets mit Gitter-Verschiebung gegen Pinch, Projektion auf die Fläche, SDF-Gradient-Normalen, Gewichte aus Teil-Abständen, Parallel-Transport der Ketten | `packages/render/src/creature/bodyMesh.ts` (`meshBody`, `contour`, `finish`, `chainRotations`, `swingQuat`) | Ausgangspunkt der neuen Extraktion in `packages/creature`; um Oberflächendeskriptoren, Knochengewichte, Teilmasken, Glättung erweitern |
| Schrittzyklus, Zwei-Knochen-IK, Schlangenspur, Maultreiber | `packages/genome/src/locomotion/{gait,ik,spine,mouth}.ts` | Mathematik weiterverwenden, auf das neue Skelett umstellen |
| Verschmelz-Zeitleiste und Sprung-Moves | `packages/render/src/blob/MergeTimeline.ts`, `genome/src/locomotion/moves.ts` | Ablauf und Timing (0–300 ms Blend, 300–450 ms Pop) |
| Soft-Body-Federn | `packages/physics` (`SpringJiggle`, `ShapeMatching`) | Quetschen/Wackeln |
| Earle-Stufen-Shading (bisher **nicht** von Wesen genutzt) | `packages/render/src/earle/gradients.ts` (`stepRamp`), `earle/tsl.ts` (`aaStep`, `PaletteLookup`), `earle/palette.ts` | Siebdruckstufen mit Verlauf innen für das Wesen-Material |
| Renderer, TSL-Cache-Fix, Backend-Erkennung | `apps/game/src/canvas/rendererSingleton.ts`, `packages/render/src/common/tslFunctionCache.ts` | Pflicht |
| Canvas-Host, Governor, Perf-Badge, Lab-Rahmen (Bottom-Sheet mobil) | `apps/game/src/canvas/CanvasHost.tsx`, `canvas/qualityGovernor.ts`, `overlay/PerfBadge.tsx`, `overlay/LabFrame.tsx` | Editor-Seite |
| Orbit, Wiese, Sonne | `apps/game/src/lab/tree/orbit.ts` (`OrbitRig`), `lab/rex/meadow.ts` (`createMeadow`), `packages/render/src/earle/hardShadow.ts` (`SunRig`) | Drehteller mit Earle-Boden und hartem Schatten |
| Regler-Bausteine | `apps/game/src/routes/LabCreature.tsx` (`Slider`, `Seg`), `editor/levels/ui.tsx` (`Stepper`, `Toggle`, `Section`, `Row`), `editor/levels/icons.tsx` | zu einem gemeinsamen `apps/game/src/ui/controls/` zusammenziehen |
| Zustand, Verlauf, Autosave | `apps/game/src/editor/levels/editorStore.ts` (zustand, Undo 40, Autosave 250 ms) | Muster für den Wesen-Store |
| Speichern auf den Mac / lokal / Teilen | `apps/game/src/editor/content/{target,local,share}.ts`, `apps/game/vite-plugins/contentApi.ts` | `DEFAULT_DIRS` um `creatures` erweitern; Entwürfe außerhalb der HMR-Globs halten |
| Werkstatt-Katalog, Routen | `apps/game/src/overlay/werkstattCatalog.ts`, `apps/game/src/App.tsx` | Eintrag + Route |
| Screenshot-Harness (Vorlage | Render nebeneinander) | `apps/game/e2e/nachschaerfung-shots.spec.ts`, `docs/progress/nachschaerfung-README.md` | Look-Beweis und Abnahmen |
| Bench, GPU-E2E | `apps/game/src/lab/blob/BlobBench.tsx`, `apps/game/e2e/webgpu.spec.ts`, `scripts/e2e.mjs` | `?bench=wesen`, WGSL-Fehlerfang |

**Nicht übernommen:** Kugel-Körper je Art (`genome/src/body.ts`), 32 GLB-Module, Maul-Sichel (`CreatureMouth.ts`), 11 feste Musterzweige (`blob/patterns.ts`), Fell-Shells/Fins, `CreatureRig` (Sockel-Retracing je Bild), Meshy-Modelle. Der alte Code bleibt unangetastet im Spiel, bis der Produktionsteil „Spielfeld“ die Bretter auf das neue System umstellt; dann wird er entfernt.

**Aus dem unbestätigten v4-Plan übernommen** (`origin/main:docs/prototyp/wesen-v4-plan-unbestaetigt.md`): Oberflächendeskriptoren je Vertex, Maul als Kavität mit Lippenkurven und Zahn-Slots, Materialklassen an Anbauten, `shapeHash`/`styleHash` getrennt, Vermaschen im Worker, Kombi-Prüfstand. **Arena-tauglich gebaut, aber erst im Teil „Spielfeld“ umgesetzt:** ein Zeichenaufruf für alle Körper (Slot-Geometrie, Knochen als Datentextur, fester Knochenrahmen je Wesen). Nicht übernommen: KI-3D-Teile, Detail-Normal-Arrays (Florians Vorlagen zeigen gemalte Verläufe, kein Mikrorelief; später erlaubt, wo es besser ist).

---

## Warum es diesmal den Look trifft (Lehre aus Baukasten v2)

Der v2-Baukasten (SDF + Surface Nets + `MeshToonMaterial`) fiel durch, weil er grobe Primitive, ein 8-Stufen-Toon-Material ohne Verläufe, kein echtes Maul und Fell als Strichhaufen hatte. Die Antwort ist nicht ein anderes Prinzip, sondern Qualität an genau diesen Stellen — und ein **Beweis an drei Helden, bevor der Editor in die Breite geht** (Arbeitsregel „Look zuerst beweisen“ aus `origin/main:CLAUDE.md`):

1. Auflösung 64³ für Helden, Taubin-Glättung, analytische Normalen → weiche gemalte Silhouetten statt Facetten.
2. Maulvolumen mit Lippenwülsten, Rachen, Zunge, Zähnen auf den Lippenkurven; Verschluss-Morph für das perfekt geschlossene Maul.
3. Gemaltes Material: Siebdruckstufen mit Verlauf innen, Rim rechts oben, Papierkorn, Pinselstriche mit Spitzen, Glimmer — alles gegen Bild 3/16 abgeglichen.
4. Fell als große Flammenbüschel mit Verlauf (Retriever, Löwe), nicht als Haar.
5. Referenz-Overlay im Harness: jede Abnahme als Vorlage-neben-Render in gleicher Ansicht.

---

## Baustellen, Modelle, Reihenfolge

Arbeitsweise wie bewährt: Agenten in `isolation: worktree` mit Pfad-Zuständigkeit, eigene E2E-Ports (nicht 5173/5174/4190), Merge durch die Leitung, nach Shader-Änderungen lokal `node apps/game/scripts/e2e.mjs e2e/webgpu.spec.ts` (TSL-Cache-Falle). Florian startet den Dev-Server selbst; Test-Fenster absprechen. Früh committen und pushen (Wochenlimit); Plan sofort als Datei ins Repo.

| # | Baustelle | Inhalt | Dateien (neu) | Modell |
|---|---|---|---|---|
| **K0** | **Fundament** | `packages/creature`: Bauplan-Schema (zod, `schemaVersion`), SDF-Kern mit Teil-IDs (Kapseln/Ellipsoide/Rundkegel, Smooth-Min, Subtraktion, Mittellinien), **identisch in TS und TSL** (Paritätstest), Surface Nets 32³/64³ im Worker mit Deskriptoren (Teilgewichte, Bogenlänge/Winkel/Umfang je Kette, Bauch/Rücken, Region, Höhlung), Taubin-Glättung, prozedurales Skelett (Wirbelsäule, Hals, Kopf, Kiefer, Beine, Schwanz, Rüssel) mit geglätteten Gewichten, Mesh-Cache (`shapeHash`), three-Anbindung (`SkinnedMesh`, Deskriptoren als Attribute) | `packages/creature/src/{bauplan,sdf,extract,rig,descriptors,worker}.ts`, `packages/render/src/creature2/{CreatureMesh,CreatureRuntime}.ts` | **Leitung** (+ ein Leitungs-Subagent) |
| **K1** | **Maul & Zähne** | Maulvolumen (Loch ↔ Keil, Höhe, Neigung, Winkel-Rückzug, Kiefergrößen, Biss, Kante, W-Form, Nasenspiegel, Schnäbel), Vermaschung bei ~25 % Öffnung, **Verschluss-Morph** (Rand-Vertices im geschlossenen Zustand auf die geschlossene Fläche projiziert → exakt geschlossen, Naht nur Wertkontrast), Zahnplatzierung auf den Lippenkurven mit Versatz (greifen ineinander), Größenmuster, Hauer/Fangzähne, Zunge, Rachenmaterial, Kiefer-Rig + Spitzmund-Morph; Verben öffnen/kauen/brüllen/gähnen | `packages/creature/src/mouth/*`, `packages/render/src/creature2/teeth.ts` | **Leitung** |
| **K2** | **Earle-Wesen-Material** | Kern: Lichtrichtung, 2–4 Stufen mit Verlauf innen (`stepRamp`), Terminator-Wrap, Rim, Bodenkontakt, Papierkorn, Glimmer, Region-Farbrollen (Haut, Bauch, Lippe, Rachen, Zahn, Keratin); Musterbibliothek in Wirbelsäulen-Koordinaten (Streifen mit Spitzen, Rosetten, Platten, Schuppen umfangstreu, Punkte, Bauch/Rücken, Flecken, Ringel, Salamander, Koi) mit Bereichen → Farben | `packages/render/src/creature2/material/{earleCreature,patterns,regions}.ts` | **Leitung** (Kern), starker Agent (Musterbibliothek) |
| **K3** | **Augen** | Augenkugel-Typen, Höhle/Tiefe/Brauenwulst, Höhlenring, Lider-Kappen (Blinzeln in jeder Tiefe), Schlitz-Port, Glyphen (Sichel, Spirale, X), Blick, 1–4 Augen auf Kopf-Kugelkoordinaten | `packages/creature/src/eyes.ts`, `packages/render/src/creature2/eyes.ts` | starker Agent |
| **K4** | **Unterkörper, Schwanz, Rüssel, Gang** | geknetete Beine (2/4, Schenkel, Saugnapf), Vogel-/Spinnenbeine als Röhren (zwei Spinnen-Stile), Schlange, Schwanztypen, Rüssel; Gang je Beinzahl, IK, Körperhub, Schlängeln, Schwimmen (Schwebe-Abstand), Fliegen, Idle, Tempo aus Masse | `packages/creature/src/{limbs,tail,trunk}.ts`, `packages/creature/src/motion/*` | starker Agent |
| **K5** | **Anbauten** | Ohren, Flügel (Membran/Feder), Rückenkamm, Mähne/Frisur mit Gesichtsmaske, Hörner, Flossen, Kämme, Schleppe, Fühler; Sockel-Regionen, Kompatibilitätsregeln | `packages/creature/src/attachments/*`, `packages/render/src/creature2/attachments/*` | Agent |
| **K6** | **Fell-Büschel, Feuer, Nebel, fester Blob** | Büschelsystem (Felder, Poisson, Knochenraum, Wind), Feuer (Verlauf, Flammenzungen, Funken), Nebel (Fresnel-Ausdünnung, Schwaden, Fetzen), Glimmer-Blob — exakt nach Bild 18 | `packages/render/src/creature2/{tufts,fire,fog}.ts` | starker Agent, Abnahme Leitung |
| **K7** | **Verschmelzen** | Jelly-Flüssigkeitsblend (Viskosität, Fäden, Tropfen), Proxy-Blend fester Stufen (Primitivlisten interpolieren, Teile schrumpfen/wachsen), Pop ins Kind-Mesh, Mobil-Preset | `packages/render/src/creature2/merge/*` | **Leitung** |
| **K8** | **Editor Wesen-Werkstatt** | Route `/werkstatt/wesen` (+ `/lab/wesen`), Tabs, gemeinsame Regler-Bausteine, Würfel/Schloss/Reset, Vorlagen, Speichern/Laden (`content/creatures/`, `contentApi` erweitern), Undo/Redo, A/B, Referenz-Overlay, Animationsleiste, Licht/Shader-Tab, Stufen-Tab, Brett-/Reihen-Ansicht, Budget-Ampel, mobiles Bottom-Sheet, glTF-Export | `apps/game/src/werkstatt/wesen/*`, `apps/game/src/ui/controls/*`, `apps/game/vite-plugins/contentApi.ts` | Agent |
| **K9** | **Vorlagen & Abnahme** | ≥ 20 Vorlagen nach den Bögen (Rex, Drache ohne Unterkiefer, Giraffe, Retriever, Dackel, Tiger, Löwe, Panther, Leopard, Drachenfisch, Betta, Kugelfisch, Halfterfisch, Spinne ×2, Tukan, Flamingo, Pfau, Eule, Elefant, Feuer, Nebel, Jelly, fester Blob); Harness-Montagen Vorlage | Render; Korrekturrunden | `content/creatures/presets/*.json`, `apps/game/e2e/wesen-shots.spec.ts` | Routine-Agent (JSON, Bilder), Agent (Korrekturen) |
| **K10** | **Leistung & Mobil** | LOD 32³/24³, Instanzierung Zähne/Büschel/Augen, Budgetmessung 36 Wesen (`?bench=wesen`), WebGL2-Pfad, GPU-E2E, iPhone-Messung + Deploy | `apps/game/src/lab/wesen/bench.ts` | Agent, Routine-Agent (Deploy) |
| **L1** | **Grundformen-Lab** (Phase 1) | Schlanke Vorstufe des Editors in `/lab/wesen`: schema-getriebenes Reglerpanel (Körper, Hals, Unterkörper, Maul, Licht, Material) nach dem `NumberField`-Muster aus `editor/map/MapEditor.tsx`, Live-Vermaschung 32³ beim Ziehen / 64³ beim Loslassen, Drehteller mit Earle-Boden, Vorlagen-Knöpfe, Referenz-Overlay; wird in K8 zur vollen Werkstatt ausgebaut | `apps/game/src/lab/wesen/*`, Route in `App.tsx`, Eintrag in `werkstattCatalog.ts` | Agent (parallel zu K0/K1) |

### Phasen und Gates

| Phase | Inhalt | Gate |
|---|---|---|
| **0 Vorbereitung** (Leitung) | `git fetch`; lokale 6 Commits sichern (Push), `origin/main` (Cloud-Doku, CLAUDE.md) konfliktfrei mergen; `claude/grundblobs` holen und das Jelly-/Schlitzaugen-Material der Cloud-Session sichten (Fallback: lokales `shadeBlob`); diesen Plan nach `docs/plans/2026-10-07-wesen-werkstatt.md` kopieren; CLAUDE.md-Regeln übernehmen (Commits ohne Modellnamen, Übergabe in `docs/UEBERGABE.md`) | Repo konsistent, Plan im Repo |
| **1 Grundformen-Beweis** (K0 + K1 + K2-Kern + L1, Jelly-Spiegelung) | **Das System, nicht die Tiere** (Florian, 07.10.): `/lab/wesen` mit live wirkenden Reglern für alle Grundformen — Körper (lang, würfelig, rund, dünn, dick), Maul **stufenlos in der Höhe**, alle Maulformen (Loch ↔ Keil, Winkel-Rückzug, Ober-/Unterkiefer bis „kein Unterkiefer“, Biss, Öffnen/Schließen), langer Hals mit Maul oben am Kopf, Schlangenform; Material nach Look-Vertrag Regeln 1–5, 9, 12 (Licht, Wertzonen, Farb-Schatten, Korn, Maulfarben, Glimmer), Jelly; Referenzmodus; Rex · Retriever · Drachenfisch nur als Vorlagen-Nebenprodukt; Harness-Montage Vorlage | Render; Mobil-Messung 36 Kopien | **Look-Abnahme 1:** Grundblob neben Bild 18 oben und Bild 3 (Dino-Reihe), Maul neben Bild 5/14 — **Florian sagt „ja, der Weg stimmt“**, erst dann Breite |
| **2 System in der Breite** (K3–K7 parallel in Worktrees) | Augen, Beine/Gang, Anbauten, Fell/Feuer/Nebel, Verschmelzen; K8 beginnt parallel mit dem stabilen Schema | **Look-Abnahme 2:** Kontaktbogen aller Familien gegen ihre Bögen (Regeln 6–8, 10, 11, 13), erster Kombi-Kontaktbogen; Verben im Lab; GPU-E2E grün |
| **3 Editor** (K8) | vollständige Werkstatt touch-first | Florian baut eine Vorlage ohne Hilfe nach; Speichern/Laden/Undo; mobil; Stil-Vorgabe aus dem Licht-&-Shader-Tab gespeichert |
| **4 Vorlagen, Leistung, Abnahme** (K9, K10) | ≥ 20 Vorlagen, Chimären, Bench, iPhone-Deploy, Doku (ADR-0003 „Wesen-System“, `docs/UEBERGABE.md`) | **Look-Abnahme 3 (fertig):** ≥ 20 Vorlagen treffen ihre Bögen, Chimären bestehen, freies Wesen ohne Vorlage im Look; iPhone p99 ≤ 16,7 ms bei 36 Wesen mit Fell |

Kostensteuerung: Leitung nur K0, K1, K2-Kern, K7 und Abnahmen; alles andere Agent 5.5 (max nur K3/K4/K6), JSON/Screenshots/Deploy Routine-Agent. Bilder nur über den Harness, keine Agenten-Nachläufe für Kleinigkeiten.

---

## Verifikation

- **Unit (vitest, Node):** SDF-Parität CPU/TSL (Stichproben per Readback im GPU-E2E), Determinismus (gleicher Bauplan → gleicher Hash), Mesh geschlossen (`nonManifoldEdges` = 0), Gewichte normiert, Zähne im geschlossenen Zustand ohne Durchdringung, Zahnabstand in beiden Zuständen, Lippen-Verschluss ≤ 1 % Lücke, Deskriptoren stetig über Teilgrenzen, Schema-Roundtrip aller Vorlagen, Kompatibilitätsregeln.
- **GPU-E2E (lokal, echte GPU):** WGSL-Fehlerfang, jede Vorlage rendert (Golden-Bilder für Signatur-Wesen), Verben laufen (Maul, Blinzeln, Gang, Verschmelzen), WebGL2-Pfad (`?backend=webgl`) sichtbar gleich.
- **Harness:** `EE_SHOTS=1` Montagen Vorlage | Render für jede Vorlage in `docs/progress/wesen-*`; Vergleich mit Bild 3/5/8/13/16/18.
- **Editor-E2E:** Regler ändern → Mesh aktualisiert (Dreieckszahl ändert sich), Speichern → `PUT /__content/creatures/…`, Laden-Roundtrip, Undo/Redo, mobiles Sheet (393×852).
- **Leistung:** `?bench=wesen` (36 Wesen gemischter Vorlagen, Fell an): Mac p99, iPhone 16 ≥ 58 fps, p99 ≤ 16,7 ms (Ziel) bzw. < 20 ms (Gate), Zeichenaufrufe ≤ 40, Speicher < 400 MB; Vermaschung 64³ im Worker < 150 ms, 32³ < 40 ms.
- **Pflicht je Baustelle:** `pnpm typecheck`, `pnpm test`, `pnpm lint`, betroffene E2E; nach Shadern `e2e/webgpu.spec.ts`.

## Risiken

- **Lippenverschluss**: bleibt eine sichtbare Naht, greift die Ausweichlösung zwei Mesh-Zustände (offen/zu) mit Überblendung im Pop.
- **Fell-Büschel auf Mobil**: Budget je Wesen begrenzen (≤ 160 Büschel Brett, ≤ 600 Held); Mobil-Preset reduziert Zahl, nie Stil.
- **Dünne Teile im impliziten Körper** (Spitzen, Stacheln): gehören konsequent zu den Anbauten, nicht ins SDF.
- **WebGL2-Pfad** (Simulator, evtl. App): keine Compute-Abhängigkeit; `SkinnedMesh` + Datentexturen funktionieren dort.
- **Vermaschungszeit im Editor**: Worker, zwei Auflösungen, Debounce; Stufenreihe im Leerlauf vorab.
- **Stilabweichung „gemalt ↔ Stufenlicht“**: Verlauf-Anteil und Stufenzahl sind Regler; Florian stellt live ein, Vorgabe aus dem Look-Beweis.

## Entscheidungen Florians (Fragerunde 07.10.)

1. **Look-Beweis zuerst**, dann Breite.
2. **Der erste Test zeigt das System, nicht Tiere:** alle Grundformen von Maul und Grundblob — mit langem Hals und Schlangenform, mit dem in der Höhe positionierbaren Maul und allen Maulformen, stufenlos per Regler. Die Tiere (Rex · Retriever · Drachenfisch) sind Nebenprodukt und kommen als Vorlagen dazu.
3. **Das alte Spiel bleibt komplett unangetastet** (Brett, Karte, Setzkasten mit den alten Wesen). Zuerst der Editor, um den Look zu finden. Anspruch: **„viel viel besser als im Prototyp.“**

Daraus folgt: Phase 1 enthält bereits das schlanke Grundformen-Lab (L1) mit Live-Reglern; Vermaschung, Maul und Material müssen von Anfang an in Heldenqualität (64³, Glättung, Verschluss-Morph, gemaltes Material) stehen, nicht als Platzhalter.

