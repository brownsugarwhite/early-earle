# Machbarkeit: Wesen aus Silhouetten und Kantenlinien (Tiger-Konzept)

Stand 11.10.2026. Frage von Florian: Lässt sich aus genauen Silhouetten und zusätzlichen Kantenlinien in jeder Ansicht ein genaues Netz erzeugen?

Das Konzept im Einzelnen:
- Kanten, die in runde Formen übergehen, werden mit Verjüngung und Verlauf gezeichnet.
- Das Maul gibt es geschlossen (schwarzer Winkel, türkise Punkte) und offen (rot oben, blau unten), jeweils in einem eigenen Tab.
- Aus beiden Zuständen entstehen eine Blendshape sowie Ober- und Unterkieferknochen.
- Reihenfolge: Rumpf und Kopf, dann das Maul zu und offen, dann Füße, Flügel und Ähnliches, zuletzt ein Linien-Tab für Markierungen.

Vorlage: [`docs/look/editor/03-tiger-konzept.webp`](../look/editor/03-tiger-konzept.webp). Versuche: `packages/shape/src/versuch/`, im Editor über `?versuch=subd`, Bilder unter [`docs/progress/editor/versuch-subdivision.png`](../progress/editor/versuch-subdivision.png).

## Kurzantwort

**Ja, machbar.** Das Konzept trifft genau die Information, aus der man ein sauberes Netz bauen kann. Es braucht aber vier Leitplanken, sonst wird es widersprüchlich oder weich:

1. **Linien sind 3D-Linien, keine Zeichnung je Ansicht.**
   - Jede Linie lebt einmal im Objekt und erscheint in allen Ansichten.
   - Punkte, die in zwei Ansichten vorkommen (dein schwarzer Mundwinkel, die türkisen Punkte), teilen eine Koordinate: Seite und Front die Höhe, Seite und Top die Länge, Front und Top die Breite. Das ist dieselbe Kopplung wie bei den Profilen heute.
   - Erst zwei Ansichten legen einen Punkt im Raum fest.
2. **Eine Kante braucht einen Winkel.**
   - Eine Linie mit Verjüngung macht allein keine Kante; auf einer runden Fläche bleibt sie fast unsichtbar (Versuch 3).
   - Der Knick muss aus einer Silhouette kommen, zum Beispiel aus der Ecke des Schnauzenkastens in der Seitenansicht.
   - Die Verjüngung ist dann die Kantenschärfe: Sie bestimmt, wie die Kante in die runde Form übergeht (Versuch 2).
3. **Darunter liegt ein fester Grundkäfig (Subdivision wie in Blender), kein frei erzeugtes Netz.**
   - Alle Wesen und alle Posen haben dieselbe Topologie. Damit funktionieren Blendshapes, Knochen, Detailstufen und Muster.
   - Die Linien werden zu Kantenschleifen des Käfigs, ihre Verjüngung zur Kantenschärfe (Blenders Edge Crease).
   - Die Silhouetten sind das Ziel, auf das der Käfig angepasst wird. Im Versuch gelang das auf unter 0,4 px genau.
4. **Das Maul kann nicht nur Blendshape sein.**
   - Dein Maul öffnet sich um gut 120°. Eine reine Blendshape lässt die Kiefer in den Zwischenstufen schrumpfen (bei 60° je Kiefer um 13 %, bei 90° um 29 %).
   - Deshalb drehen Ober- und Unterkieferknochen, und die Blendshape korrigiert nur den Rest.
   - Die Maulnaht muss in voller Länge existieren, weil der Mundwinkel beim Öffnen nach hinten wandert („Reißverschluss“).
   - Maultasche, Zähne und Zunge kommen aus Vorlagen.

## Was das Konzept richtig macht

- **Silhouette plus Kantenlinien** ist genau das „Kurvennetz“, mit dem man Flächen gezielt formt. Autodesign und Produktdesign arbeiten so. Die Linien sagen, wo die Fläche bricht, die Silhouette, wie weit sie reicht.
- **Verjüngung und Verlauf** entsprechen der Kantenschärfe von Subdivision-Flächen (Blender Edge Crease, OpenSubdiv). Mathematisch ist das ein Wert je Punkt der Linie: 0 heißt rund, 1 und mehr heißt scharf.
- **Gleiche Punkte in mehreren Ansichten** (deine Farben) lösen das Hauptproblem jeder Rekonstruktion aus Zeichnungen, die Zuordnung. Mit ihr ist die Lage im Raum eindeutig.
- **Zustände als Tabs mit gleicher Punktstruktur**: drei rote, ein schwarzer und drei blaue Punkte offen; geschlossen liegen rot und blau aufeinander (türkis). Genau das braucht eine Blendshape.
- **Die Reihenfolge** passt zur Technik: Erst steht die Grundform mit ihrem Käfig, dann bekommt das Maul seine Naht und Tasche, dann folgen Anbauteile an Andockringen, zuletzt Masken auf der fertigen Fläche.

## Versuche (11.10.)

1. **Subdivision-Käfig aus den drei Profilen** (Ringe vorn → hinten, Pole an den Enden), Catmull-Clark mit drei Stufen.
   - Ohne Anpassung schrumpft die Fläche: Die Kugel ist 4–15 px zu klein, je nach Käfig (7×8 … 11×16).
   - **Mit Anpassung** liegt die Abweichung bei 0,17–0,37 px. Dafür wird der Käfig 6–8-mal um den Abstand Ziel minus Grenzlage verschoben (inverse Unterteilung).
   - Ein Käfig mit 58 Punkten reicht für die Kugel. Das Ei mit Spitze bleibt ebenfalls auf der Silhouette.
   - Code: `kaefigAusProfilen`, `kaefigAnpassen` in `packages/shape/src/versuch/kaefig.ts`.
2. **Verjüngte Kanten** (halbscharfe Kanten nach DeRose 1998, Schärfe nach Chaikin entlang der Linie geglättet). Ein Kasten in drei Fassungen:
   - alle Kanten rund
   - alle Kanten scharf
   - **vorn oben scharf, nach hinten und unten in eine runde Form auslaufend**

   Die dritte Fassung ist genau „Kante geht in runde Form über“. Code: `packages/shape/src/versuch/catmullClark.ts`.
3. **Kanten auf der Kugel:** Quer- und Rückenkanten auf einer runden Form erzeugen nur einen schwachen Grat. Eine Kantenlinie braucht einen Knick der Form, sonst gibt es nichts, was scharf sein kann.
4. **Kiefer, gerechnet:**
   - Lineare Überblendung zwischen zu und offen verkürzt einen drehenden Kiefer in der Mitte der Bewegung auf cos(θ/2).

     | Drehwinkel je Kiefer | Länge bei 50 % | Schrumpfung |
     |---|---|---|
     | 30° | 97 % | 3 % |
     | 45° | 92 % | 8 % |
     | 60° | 87 % | 13 % |
     | 90° | 71 % | 29 % |
     | 110° | 57 % | 43 % |

   - Aus deiner Zeichnung gemessen: Oberlippe und Unterlippe stehen offen gut **120°** auseinander.
   - Der Lippenrand dehnt sich in der Frontansicht von 47 px (zu, Mitte → Winkel) auf 117 px (Oberlippe) bzw. 139 px (Unterlippe), also **etwa 2,5- bis 3-fach**.

## Wo Probleme entstehen können (und wie wir sie lösen)

1. **Silhouetten legen die Form nicht vollständig fest.** Zwischen drei Umrissen gibt es unendlich viele Körper.
   - Lösung: eine feste Füllregel. Die Fläche ist die glatteste Fläche des Käfigs, die die Silhouetten und Linien trifft.
   - Der Front-Querschnitt dient als Vorlage je Bereich (Kopf und Rumpf getrennt).
2. **Die Silhouette hängt von der Ansicht ab.** Die Seitensilhouette liegt nur dort in der Mittelebene, wo nichts seitlich absteht. Wangen, Ohren und Beine bilden einen Teil der Seitensilhouette außerhalb der Mitte.
   - Lösung: Die Silhouette ist der Umriss der ganzen Form, keine Mittellinie. Seitlich abstehende Teile (Ohren, Beine) werden eigene Teile. Wangen passt der Käfig so an, dass ihr Umriss in allen Ansichten stimmt.
3. **Überhänge** (Schnauze über dem Kinn, offener Unterkiefer, der unter den Rumpf hängt). Der heutige Ring-Loft entlang einer Achse kann das nicht.
   - Lösung: Der Käfig hat eine eigene Kopf- und Kiefertopologie (Schleifen um die Schnauze und um die Maulnaht), keinen reinen Ringschlauch.
4. **Linien, die nur in einer Ansicht gezeichnet sind**, haben keine Tiefe.
   - Lösung: Sie werden auf die Fläche projiziert, wie Malen auf das Modell, und sind danach in den anderen Ansichten sichtbar und verschiebbar.
   - Linien, die wie das Maul in zwei Ansichten vorkommen, sind exakt.
5. **Kanten gibt es nur entlang von Käfigkanten.** Die Schleifen des Käfigs müssen also den Linien folgen.
   - Lösung: eine **Vorlage „Grundblob“** mit vorgesehenen Schleifen für Maulnaht, Augen, Schnauzenkasten, Wangen und Nase. Eine zusätzliche Linie fügt eine Schleife ein.
   - Freie Netzerzeugung je Wesen wäre flexibler, bricht aber Blendshapes, Animation und Detailstufen.
6. **Maul:**
   - **Reißverschluss:** Der Mundwinkel wandert beim Öffnen nach hinten (in deiner Zeichnung deutlich). Die Naht muss daher in voller (offener) Länge existieren; geschlossen ist ein Teil davon zu.
   - **Dehnung:** Der Lippenrand dehnt sich 2,5- bis 3-fach. Muster dehnen sich mit. Zähne hängen deshalb an den Kieferknochen, nicht an der Lippe.
   - **Maultasche:** Rachen, Gaumen und Zunge sind im geschlossenen Zustand im Netz vorhanden, aber versteckt. Spiele machen es genauso.
   - **Durchdringung:** Zähne und Unterkiefer dürfen nicht durch den Körper fahren (das alte Problem der Werkstatt). Die Kieferdrehung wird daher begrenzt, das Gelenk sitzt sauber.
   - **Naht im geschlossenen Zustand:** Die Normalen müssen über die geschlossene Naht gemittelt werden, sonst bleibt eine sichtbare Linie.
7. **Zwischenstufen:** Eine reine Blendshape lässt die Kiefer schrumpfen (Tabelle oben).
   - Lösung: Die **Kieferdrehung wird aus zu und offen geschätzt** (Ober- und Unterkiefer je ein Knochen). Die Blendshape speichert nur die Korrektur.
8. **Offen ändert auch die Silhouetten**: Der Schädel kippt, der Unterkiefer hängt tief.
   - Lösung: Ein Zustands-Tab ist eine Kopie **aller** Profile und Linien mit gleicher Punktstruktur. In Posen werden Punkte nur verschoben.
9. **Anbauteile** (Füße, Flügel):
   - Übergänge sind entweder sichtbare Nähte oder müssen verschmolzen werden.
   - Lösung: Andockringe (aus dem Modulsystem) mit einer Übergangszone im Käfig. Die Teile hängen am Skelett.
10. **Linien-Tab (Augenringe, Bauch, Schuppenbereiche)** sollte keine Geometrie werden, sondern Masken.
    - Linien aus einer Ansicht werden auf die Fläche projiziert und ergeben Zonen.
    - Der Earle-Shader hat Zonen bereits; dorthin fließen die Masken.
11. **Spiel:**
    - **Vertexbudget:** Stufe 2 fürs Brett, Stufe 3 in Nahaufnahmen.
    - **Kanten:** Scharfe Kanten brauchen getrennte Normalen; der Versuch nutzt dafür „Auto Smooth“.
    - **Darstellung:** ein Netz je Wesen, Instancing und Skinning im Shader. Die Grenzen der Bildrate (iPhone ≥ 58 fps, 36 Wesen) sind bei der Topologie mitzudenken.
12. **Bedienung:**
    - Bei vielen Linien in drei Ansichten werden verdeckte Linien grau gezeigt, wie in deiner Zeichnung.
    - Die Auswahl muss zwischen Linie und Punkt unterscheiden.
    - Die 3D-Ansicht zeigt die Linien zum Abgleich.

## Was die Literatur sagt (Recherche 11.10.)

- **Nächster Verwandter: „3D Modeling with Silhouettes“ (Rivers, Durand, Igarashi 2010).**
  - Jedes Teil entsteht aus bis zu drei orthografischen Silhouetten: Hülle aus den Ansichten, dann Glättung mit festgehaltenen Konturpunkten.
  - Die Autoren schreiben selbst, organische Modelle lägen dem Verfahren schlecht.
  - Unser Weg unterscheidet sich: Wir passen einen **glatten Käfig** an die Silhouetten an (Versuch 1), statt eine eckige Hülle zu glätten.
- **FiberMesh (Nealen u. a. 2007)** kennt glatte und scharfe Kurven auf einer Fläche, auch eine **offene scharfe Kurve, die mitten in einer glatten Fläche beginnt**, also deine auslaufende Kante.
- **Flächen aus Kurvennetzen** (Coons, Gordon, Pan 2015, Bessmeltsev 2012) brauchen geschlossene Kurvenzyklen. **Auslaufende Kantenlinien sind offene Kurven** und passen nicht hinein.
  - Deshalb: Kanten nicht als Flächenränder, sondern als **Kantenschärfe auf einem Käfig**.
- **Halbscharfe Kanten** (DeRose 1998, OpenSubdiv):
  - Schärfe 0–10, je Kante und je Ecke.
  - `CREASE_CHAIKIN` glättet die Schärfe entlang einer Kette. Genau so arbeitet der Versuch.
  - Blender rechnet seine Edge Crease c (0–1) laut einem Commit von 2018 in die Schärfe 10·c² um (nicht im heutigen Code geprüft).
- **Keine gepflegte JavaScript-Bibliothek** für Catmull-Clark **mit** Kanten.
  - `opensubdiv-wasm` 0.2.0 hat keine Schärfe-Schnittstelle.
  - `three-subdivide` kann nur Loop.
  - three.js hat seine Unterteilung (r125) entfernt.
  - Eine eigene Umsetzung (Versuch) ist der richtige Weg.
- **Anpassen an Silhouetten:**
  - Die Grenzfläche hängt **linear** von den Käfigpunkten ab (Stam 1998, Limit-Stencils), Kurven- und Silhouettenbedingungen werden damit lineare Ausgleichsprobleme.
  - Die Silhouette braucht abwechselnd „Konturpunkte suchen, linear lösen“ (Cashman & Fitzgibbon 2013 passen so Unterteilungsflächen an Silhouetten aus mehreren Bildern an).
- **Maul:**
  - Lineare Blendshapes bewegen Punkte auf **Geraden**; eine Kieferdrehung verkürzt sich deshalb (Lewis u. a. 2014). Korrekturformen setzen spät ein, Zwischenformen helfen.
  - „Sticky Lips“ (Blender Studio „Lip Zipper“): Lippenpunkte bekommen einen Nahtparameter; bis zu einer Öffnungsschwelle werden Ober- und Unterlippe zusammengezogen. Das geht auch im Vertex-Shader.
  - Die **Maultasche** gehört ins Grundnetz.
- **Markierungen:**
  - Linien per Strahl auf die **Ruhepose** projizieren.
  - Masken in eine Textur oder ein Vertex-Attribut backen; dann rutschen sie nicht unter Knochen und Blendshapes.
  - Dreiachsige Projektion zur Laufzeit streckt an flachen Winkeln und trifft auch die Rückseite.
- **Werkzeuge:**
  - ZBrush ShadowBox, Nomad und Blender-Add-ons erzeugen aus drei Ansichten nur eine **Rohform aus Voxeln** zum Weitermodellieren.
  - **Gravity Sketch** und Blender lösen „glatt und scharf zugleich“ mit **Unterteilung plus Creases**.
  - Unser Editor wäre der erste, der das direkt aus Silhouetten und Linien steuert.

## Empfehlung für die Umsetzung ab Dienstag

- **Datenmodell:** Wesen = Profile (Silhouetten) + 3D-Linien (Punkte mit Kennung, Schärfe je Punkt) + Zustände (Tabs) mit gleicher Struktur. Die Kopplung gilt für Profile, Linienpunkte und Zustände.
- **Fläche:**
  - Vorlage „Grundblob“-Käfig
  - an Silhouetten und Linien angepasst, wie im Versuch
  - Catmull-Clark mit Kantenschärfe aus der Verjüngung
  - daraus das Spielnetz. Der Platzhalter-Loft entfällt.
- **Maul:**
  - Naht in voller Länge mit Reißverschluss-Parameter (Nahtparameter je Lippenpunkt, Schwelle über die Öffnung)
  - Kieferknochen aus zu → offen geschätzt, Korrektur-Blendshape
  - Tasche, Zähne und Zunge aus Vorlagen
- **Meilensteine:**
  1. 3D-Linien im Editor (zeichnen, gekoppelt, Verjüngung als Strichbreite und Verlauf)
  2. Grundkäfig mit Anpassung und Kanten aus Linien
  3. **Tiger-Kopf als Look-Abnahme gegen das Konzeptbild**, gleiche Ansichten nebeneinander
  4. Maul zu und offen mit Knochen
  5. Linien-Tab mit Masken
  6. Anbauteile
- **Vorschlag:** **SVG-Import aus Illustrator** je Ansicht. Du zeichnest ohnehin in Illustrator; Pfade mit Ankerpunkten ließen sich 1:1 als Profile und Linien übernehmen. Für den Tiger hieße das: gleich mit deiner Zeichnung starten statt nachzeichnen.

## Quellen

- Igarashi, Matsuoka, Tanaka 1999, Teddy: https://www.cs.princeton.edu/courses/archive/fall00/cs597b/papers/teddy-siggraph99.pdf
- Nealen, Igarashi, Sorkine, Alexa 2007, FiberMesh: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf
- Rivers, Durand, Igarashi 2010, 3D Modeling with Silhouettes: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/alec_siggraph2010_silhouette.pdf
- Karpenko, Hughes 2006, SmoothSketch: https://cs.brown.edu/~jhughes/papers/Karpenko-IDO-2006/main.htm
- Borosán u. a. 2012, RigMesh: https://cragl.cs.gmu.edu/rigmesh/
- Dvorožňák u. a. 2020, Monster Mash: https://dcgi.fel.cvut.cz/wp-content/wpallimport-dist/publications/pdf/publications-2020-dvoroznak-tog-mm-paper.pdf
- Xu u. a. 2014, True2Form: https://www.cs.ubc.ca/labs/imager/tr/2014/True2Form/index.htm
- Bae, Balakrishnan, Singh 2008, ILoveSketch: https://www.dgp.toronto.edu/~shbae/ilovesketch.htm
- Pan u. a. 2015, Flow Aligned Surfacing of Curve Networks: https://haopan.github.io/papers/sketch_surface.pdf
- Bessmeltsev, Wang, Sheffer, Singh 2012, Design-Driven Quadrangulation: https://www.cs.ubc.ca/labs/imager/tr/2012/Quadrangulation/
- Blender Bsurfaces (Quelltext): https://github.com/blender/blender-addons/blob/main/mesh_bsurfaces.py
- DeRose, Kass, Truong 1998, Subdivision Surfaces in Character Animation: https://graphics.pixar.com/library/Geri/paper.pdf (Link leitet um, über Sekundärquellen belegt)
- OpenSubdiv, Unterteilungsregeln und Kanten: https://github.com/PixarAnimationStudios/OpenSubdiv/blob/release/documentation/subdivision_surfaces.rst
- Blender-Handbuch, Subdivision Surface: https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/subdivision_surface.html
- opensubdiv-wasm: https://github.com/nasedkinpv/opensubdiv-wasm · three-subdivide: https://github.com/stevinz/three-subdivide
- Stam 1998, Exact Evaluation of Catmull-Clark Surfaces: https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/cc.pdf
- Levin 1999, Interpolating Nets of Curves by Smooth Subdivision Surfaces: https://www.math.tau.ac.il/%7Elevin/adi/paper7.htm
- Schaefer, Warren, Zorin 2004, Lofting Curve Networks using Subdivision Surfaces: https://people.engr.tamu.edu/schaefer/research/lofting.pdf
- Cashman, Fitzgibbon 2013, What Shape Are Dolphins?: https://www.microsoft.com/en-us/research/publication/shape-dolphins-building-3d-morphable-models-2d-images/
- Lewis, Cordner, Fong 2000, Pose Space Deformation: https://www.scribblethink.org/Work/PSD/PSD.pdf
- Lewis u. a. 2014, Practice and Theory of Blendshape Facial Models: https://scribblethink.org/Work/Pdfs/blendshapes_MAIN.pdf
- Blender Studio, Lip Zipper: https://studio.blender.org/training/facial-rigging/lip-zipper/
- Golus 2017, Triplanar Mapping: https://bgolus.medium.com/normal-mapping-for-a-triplanar-shader-10bf39dca05a
- Crane, Weischedel, Wardetzky 2013, Geodesics in Heat: https://arxiv.org/pdf/1204.6216
- Gravity Sketch, Crease und SubD: https://help.gravitysketch.com/hc/en-us/articles/5913003925533-Crease
- ZBrush ShadowBox: https://help.maxon.net/zbp/en-us/Content/html/4_palettes_tool-3-geometry-shadowbox.html
