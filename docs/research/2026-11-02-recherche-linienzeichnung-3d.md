# Recherche: Vektor-Blueprint aus Ansichten → Subdivision-Käfig (02.11.2026)

> Zuarbeit zur [Gegenprüfung](../plans/2026-11-02-gegenpruefung-liniennetz.md) (Abschnitte 3, 4, 6 und 9.1). Frage: Gibt es
> einen veröffentlichten Weg, der „ein Liniennetz, ein Löser“ für Florians geklärtes Zielbild schlägt (Umrisse je Teil mit
> gezeichneter verdeckter Fortsetzung, Kanten mit Strichbreite = Härte, Loops als Linien in den Ansichten, dazwischen „so rund
> wie möglich“, Ausgabe ein Viereckskäfig), und was sollte ergänzt werden? Volltext gelesen: Prasad 2006, Cashman 2013 (Teile),
> Rivers 2010, FiberMesh, SmoothSketch, Monster Mash, Schaefer 2004, Dual Strip Weaving (Teile), CreatureShop (Teile). Nur
> Kurzfassung/Projektseite: Entem 2015/2019, Repoussé, Halstead 1993, Stanko 2016, Bessmeltsev 2015, Takayama 2013/14,
> Marcias 2015, Campen 2012, Gryaditskaya 2020, Kraevoy 2009, Gonen & Akleman 2012, You 2020, Werkzeug-Doku (Blender,
> Pencil+, Retopoflow, ZRemesher).

**Leitbefund:** Kein veröffentlichtes System deckt das geklärte Zielbild als Ganzes ab. Die Bausteine existieren aber verstreut
und sind großteils linear oder bewiesen.

## A. 3D aus Linienzeichnungen mit Verdeckungsstruktur

- **SmoothSketch (Karpenko & Hughes 2006).** Eingabe: sichtbare Konturen mit Cusps und T-Junctions. Nach Williams: verdeckte
  Konturen vervollständigen (Williams–Mumford-Zufallswege, Huffman-Labeling, verdeckte Cusps), topologische Einbettung,
  Aufblasen per Masse-Feder (Dreiecksnetz, „several seconds“). Der Nutzer zeichnet die verdeckten Konturen *nicht*; das Paper
  nennt nur Lipson & Shpitalni 1997 (CAD-Polyeder) als System mit gezeichneten verdeckten Linien. Eigene Grenzen:
  Vervollständigung ist lokal, Netzkonturen ≠ glatte Konturen, Selbstdurchdringungen in „Achselhöhlen“, keine Falten; sie
  wünschen sich „a minimization of some fairness functional“. Kein Code.
- **Williams 1994/96, Malik 1987:** Labeling gekrümmter Objekte (Limbs, Cusps, T-Junctions) — Theorie der Verdeckung, keine
  Formerzeugung.
- **Entem u. a. 2015 (Tiere aus Seitenansicht):** Teile aus Konturen mit T-Junctions, Hierarchie, symmetrische Paare, Blending
  impliziter Flächen. **Entem u. a. 2019:** „radial variation metric“ findet Teile rekursiv samt Tiefenordnung, Ausgabe
  geschichtetes SVG (editierbar), Anwendung teilebasiertes 3D. Das ist „überlappende Teilumrisse = Teilzerlegung“ — aber
  automatisch erkannt, nicht gezeichnet; nur Kurzfassungen.
- **Monster Mash (Dvorožňák, Sýkora u. a. 2020; Apache 2.0, C++/Emscripten).** Der Nutzer zeichnet Teile als überlappende
  Umrisse (geschlossen = Körper, offen = angesetzt über eine „merging boundary“). Je Teil Poisson-Inflation, Domänen vernäht,
  Delaunay-Dreiecksnetz, ARAP-L hält die Tiefenordnung dynamisch (Ungleichungen). Genau unser Fall „Bauchlinie unter dem
  Kopf“: Die verdeckte Fortsetzung ist schlicht der vollständige Umriss des hinteren Teils. Grenzen (eigene Angabe):
  Einzelansicht, Tiefenproportionen schlecht steuerbar, Dreiecksnetz.
- **Bessmeltsev u. a. 2015 (Canvases):** Konturzeichnung + 3D-Skelett → Teile als verallgemeinerte Rotationsflächen,
  Gestalt-Fortsetzung bei Verdeckung; kein Code. **CreatureShop 2022:** Nutzer umreißt Teile (teilweise überlappend) +
  Symmetrieebene/Landmarken, wasserdichtes Netz, ≈ 14 min je Figur.
- **Gryaditskaya 2020 / Hähnlein 2022:** Konstruktionslinien (auch verdeckte Hilfslinien) als 3D-Evidenz für perspektivische
  Konzeptskizzen — gezeichnete verdeckte Linien sind gute Bedingungen; liefert Kurven, keine Flächen.

**Antwort:** Niemand lässt den Nutzer die verdeckte Fortsetzung als *Flächenbedingung* zeichnen; am nächsten ist Monster Mash
(ganzer Teilumriss) — unsere blasse Linie ist in dessen Logik der Rest des Teilumrisses.

## B. Orthografische Mehransichten → 3D

- **Rivers, Durand, Igarashi 2010.** Silhouetten in ≥ 2 Orthoansichten → Schnitt der Silhouettenzylinder (Sichthülle) als
  CSG, rein 2D gerechnet. Glätten: FiberMesh-artige Laplace-Iteration, Punkte dürfen sich nur nach innen bewegen, **„rim
  points“** (Berührpunkte mit der Hülle) werden vorher berechnet und festgehalten. Widersprüchliche Silhouetten: „limited by
  the more restrictive“. Silhouetten sind die Repräsentation, 3D folgt live; Ø 21,7 min je Modell. Dreiecksnetz, nur scharfe
  CSG-Kanten, keine Linien/Loops. Kein Code.
- **Prasad, Zisserman, Fitzgibbon 2005/2006.** Parametrische Fläche (Geometry-Image-Gitter), thin-plate-Energie gᵀCg;
  Silhouette = lineare Zeilen (Lage in der Ansicht + Normale ⟂ Blickrichtung) → KKT-System `[C Aᵀ; A 0]`, dünn besetzt
  lösbar, globales Optimum. Multilokale Singularitäten (T-Junctions des Kontur-Generators) durch die Lage der Segmente im
  Parameterraum; Falten durch Membran- statt Biegeenergie quer zur Linie (§3.3); Genus 0–2 durch Verklebung. Ohne
  Tiefenbedingungen kollabiert z = 0 („Inflation constraints“). Einzelansicht, weitere Ansichten sind nur weitere lineare Zeilen.
- **Cashman & Fitzgibbon 2013 („What shape are dolphins?“).** Loop-Subdivision; die Zuordnung Kontur ↔ Fläche (Preimage) ist
  diskret, bei fester Zuordnung sind Silhouettenpunkt und Normalenbedingung linear in den Kontrollpunkten; thin-plate
  regularisiert; abwechselnd kontinuierlich (Trust-Region) und diskret (globale Suche/dynamische Programmierung über
  Preimages). MATLAB-Code „forms“ auf GitHub.
- **Kraevoy 2009:** Vorlage an Konturen (DP-Zuordnung Kontur ↔ Silhouette), Einzelansicht. **You u. a. 2020 (PDE-Flächen):**
  drei Orthoansichten mit Primär-, Sekundär- und **Querschnittskurven**, Vorlage + PDE-Flächen.
- **Kurvennetz-Linie:** True2Form 2014 (2D-Kurvennetz → 3D über Regularitäten); **CrossShade 2012** (Querschnittsstriche →
  Normalen an Kreuzungen, Coons-Füllung — nur Schattierung, patentiert); **BendSketch 2017** (Striche = Biegelinien konvex/
  konkav → Richtungsfeld → Höhenfeld, Mehransichten durch Registrierung, kein Code); Gingold 2009; SecondSkin 2015; **Pan 2015**
  (3D-Kurvennetz → Fläche entlang der Flow-Lines; MIT-Code); Bessmeltsev 2012; Stanko 2016; Yu 2022.
- **Schaefer, Warren, Zorin 2004 (Lofting mit Subdivision)** — direktester Vorläufer unseres Plans: Netz kubischer B-Splines
  (Längs-/Querschnittskurven, Creases) → Quadrangulierung je Stück mit **nur Valenz 3 und 5**, bewiesene Schranke
  Σ|val − 4| ≥ |k − 4| für k Randkurven, modifiziertes Catmull–Clark interpoliert die Kurven exakt, C² bikubisch an den Kurven,
  C¹ mit beschränkter Krümmung an Ecken; Creases entkoppeln die Regeln.

**Robustheit der Querschnitts-/Loop-Striche:** CrossShade und Stanko liefern/benötigen Normalen; Schaefer, Pan, Bessmeltsev
verlangen ein konsistentes 3D-Kurvennetz mit echten Schnittpunkten. Keines nimmt Loops als 2D-Linien in Orthoansichten — das
müssen wir selbst liefern (Loop = Reihe im Reihenplan, wie V5/V6 schon tun).

## C. „So rund wie möglich“

- Moreton–Séquin 1992 (nichtlinear, langsam); Welch–Witkin 1994; **Halstead–Kass–DeRose 1993**: Punkt- *und*
  Normalen-Interpolation auf der Catmull–Clark-Grenzfläche linear in den Kontrollpunkten (Grenz-/Tangentenmasken), Fairness =
  thin-plate + Membran exakt integriert → ein lineares System. Botsch–Kobbelt 2004 (vorberechnete Basisfunktionen, Echtzeit).
  **FiberMesh 2007:** zwei gekoppelte lineare Systeme, feste Faktorisierung, 10–15 fps bei 600–2 000 Punkten auf einem
  1-GHz-Pentium-M — 1 000–3 000 Käfigpunkte sind heute trivial. Repoussé 2008; Monster Mash: Poisson-Inflation.
- **Linear + Silhouette + Fairness zusammen:** Prasad (thin-plate + lineare Silhouette = ein KKT-System), Cashman (dasselbe auf
  Subdivision, Preimage diskret), Rivers (Rims festhalten, Glättung nur einwärts = „rundeste Fläche in der Hülle, die die
  Umrisse berührt“, aber heuristisch auf Dreiecken). Nichts Neueres, das das als Ganzes für Käfige löst.

## D. Illustrationsstil-Ausgabe und Bidirektionalität

- **Bénard & Hertzmann 2019 (Tutorial):** Konturen, Sichtbarkeit, Cusps. **Bénard–Hertzmann–Kass 2014:** topologisch
  korrekte Konturen für Catmull–Clark (Prototyp, braucht RenderMan). **ConTesse 2023:** sichtbare Konturen von
  Subdivision-Flächen mit notwendigen/hinreichenden Bedingungen, C++, Apache 2.0 → als Offline-Prüfer tauglich.
- **Blender Line Art:** Kontur, Crease, Occlusion-Level → verdeckte Linien in eigene Ebene + „Dot Dash“ = gestrichelt;
  Dicke global, keine Dicke nach Faltenwinkel. Freestyle: QI-Range. **Pencil+ 4:** getrennte „Visible/Hidden Lines“.
- **Bidirektional:** Nealen 2005, SilSketch 2007, Kraevoy 2009, Rivers 2010 (Silhouetten *sind* die Repräsentation). Kein
  System hält eine *persistente Vektor-Illustration* mit Kanten und Loops als editierbare Wahrheit mit 3D-Rückkopplung. Cole
  2008 / Hertzmann 2020: Menschen zeichnen vor allem Verdeckungskonturen und starke Gradienten — unser Blueprint liegt darauf.

## E. Edge Loops als Entwurfsprimitive

- **Takayama 2013 (Disney, patentiert, kein Code):** Stückgrenzen skizzieren → Quadstücke, Unterteilungszahl je Rand steuert
  die Topologie, Singularitäten automatisch mit Nutzerkontrolle. Takayama 2014 / Tarini 2022: Muster für n-seitige Stücke.
  Marcias 2015: datengetrieben, Striche im Stück geben den Kantenfluss vor.
- **Campen 2012 (Dual Loops Meshing):** automatisch. **Campen & Kobbelt 2014 (Dual Strip Weaving):** Atomoperation = ein ganzer
  zyklischer Streifen; beim Schweben wird der beste Elastica-Streifen vorgeschlagen, Klick fixiert, Rad zeigt Alternativen —
  Loop als Primitive, aber auf vorhandener Oberfläche, nicht in 2D-Ansichten.
- **Industrie:** Retopoflow „Contours“ (Strich quer über ein Glied → Ring, Punktzahl per Rad), ZRemesher-Guides, QuadSketch,
  Maya Quad Draw. Alle brauchen ein Referenznetz. Loops als planare Kurve in einer Orthoansicht: nur Lofting (Schaefer 2004)
  und You 2020 („key cross-section curves“).

## Fazit

Es gibt keinen publizierten Ansatz, der „ein Liniennetz, ein Löser“ für dieses Zielbild schlägt. Die Literatur bestätigt
vielmehr jede Zutat: lineare Silhouettenbedingungen mit Fairness in einem System (Prasad 2006 als KKT, Cashman 2013 auf
Subdivision), Lofting mit exakt interpolierendem Catmull–Clark plus Valenz-3/5-Quadrangulierung mit bewiesener Schranke
(Schaefer 2004), Loops als Atomoperation (Dual Strip Weaving), Teile aus überlappenden Umrissen (Monster Mash, Entem). Konkret
zu ergänzen:

1. **Rims nach Rivers** als harte Berührpunkte: Umrisspunkte an die Hülle heften, Glättung nur einwärts — „rundeste Fläche in
   der Hülle“ mit garantierter Umrisstreue.
2. **Cashmans Preimage-Schritt:** Zuordnung Umrisspunkt ↔ Käfigkante als diskrete Suche (DP mit Stetigkeitsstrafe), dazwischen
   rein lineares Lösen — „Umriss zuerst“ mit sauber getrennter Diskret/Kontinuierlich-Schleife statt Neuvernetzung.
3. **Schaefers Schranke |k − 4| und nur Valenz 3/5** als Prüfkriterium der Musterfüllung; Tarinis Aufzählung für n = 8.
4. **Verdeckte Fortsetzung = Teilumriss** (Monster Mash): Teil = eigene Käfigdomäne, Naht an der T-Junction-Linie,
   Tiefenordnung als Ungleichung — keine Teilerkennung nötig.
5. **ConTesse** (Apache 2.0) als unabhängiger Prüfer: Konturen des fertigen Käfigs rendern und gegen die Zeichnung messen.

Verworfen bleiben zu Recht: SmoothSketch-Vervollständigung (lokal, Selbstdurchdringung), CAD-Patches, globale Felder,
gelernte Erzeuger.

## Fünf unkonventionelle Ideen zum Testen

1. **Loop-Vorschlag beim Schweben statt ⌘R-Platzieren** (Dual Strip Weaving): Der Editor schlägt den biegeenergie-minimalen
   Loop vor, der die vorhandenen Linien kreuzt; Klick fixiert, Rad blättert Alternativen. Quelle: Campen & Kobbelt 2014.
2. **Härte = Membranstreifen** (Prasad §3.3): Eine Kante ersetzt quer zur Linie die Biege- durch Membranenergie, stufenlos
   gewichtet mit der Strichbreite 0–3 px; „weich bis scharf“ wird eine Zahl im Löser, keine Falten-Topologie.
3. **Strichbreite → zwei Normalen** (CrossShade + Halstead): Die Breite kodiert den Winkel zwischen den beidseitigen Normalen
   der Kante; Normalen sind in Catmull–Clark linear in den Kontrollpunkten und gehören ins selbe System.
4. **Teil-Domänen mit dynamischer Tiefenordnung** (Monster Mash ARAP-L): Posen verschieben Teile, Ungleichungen vorn/hinten
   je Pose — „Bauch hinter Kopf“ bleibt in jeder Pose ohne Durchdringung.
5. **Preimage-Freiheit als Glättungsreserve** (Cashman): Umrisspunkte dürfen entlang der Käfigkanten wandern (diskret), die
   Form nur linear; wo heute Kappen knittern (Kasten, Kerbe), löst das Wandern des Preimages das Problem statt neuer Ringe.

## Quellen

- SmoothSketch: https://cs.brown.edu/~jhughes/papers/Karpenko-I3F-2005/paper.pdf · https://cs.brown.edu/~jhughes/papers/Karpenko-IDO-2006/paper.pdf
- Williams: https://cs.unm.edu/~Williams/dissertation.html · Malik 1987: https://datalearner.com/academic/journal-papers/0920-5691/volumes-and-issues/1/paper-detail/12346
- Entem 2015: https://researchportal.ip-paris.fr/en/publications/modeling-3d-animals-from-a-side-view-sketch/ · Entem 2019: https://researchportal.ip-paris.fr/en/publications/automatic-structuring-of-organic-shapes-from-a-single-drawing/
- Monster Mash: https://dcgi.fel.cvut.cz/wp-content/wpallimport-dist/publications/pdf/publications-2020-dvoroznak-tog-mm-paper.pdf · Code: https://github.com/google/monster-mash
- Bessmeltsev 2015: https://www.cs.ubc.ca/labs/imager/tr/2015/Canvases · CreatureShop: https://cong-yi.github.io/assets/creatureshop/assets/CreatureShop_low_res.pdf
- Gryaditskaya 2020: https://hal-univ-tlse3.archives-ouvertes.fr/INRIA/hal-02952509 · Bonnici 2019: https://orca.cardiff.ac.uk/130683/1/sketch-position-postprint.pdf
- Rivers 2010: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/alec_siggraph2010_silhouette.pdf
- Prasad 2006: https://ora.ox.ac.uk/objects/uuid:1b7643df-1d8e-4b77-9ec2-a68b9f3bc735 · Prasad 2005: https://scispace.com/pdf/fast-and-controllable-3d-modelling-from-silhouettes-3jdvylq9lg.pdf
- Cashman & Fitzgibbon 2013: https://www.microsoft.com/en-us/research/wp-content/uploads/2013/01/Cashman.2012.WSD_.pdf · Code: https://github.com/jmmanley/forms
- Kraevoy 2009: https://api.openalex.org/works/doi:10.2312%2FSBM%2FSBM09%2F037-044 · You 2020: https://eprints.bournemouth.ac.uk/34149/
- True2Form: https://www.cs.ubc.ca/labs/imager/tr/2014/True2Form/index.htm · CrossShade: https://hal-univ-tlse3.archives-ouvertes.fr/INRIA/hal-00703202 · BendSketch: https://haopan.github.io/bendsketch.html · Gingold 2009: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/yotam_sasia2009_2D3Dmodeling.pdf · SecondSkin: https://www.dgp.toronto.edu/~depaolic/projects/secondSkin/SecondSkin.pdf
- Pan 2015: https://haopan.github.io/curvenet_surfacing.html · Code (MIT): https://github.com/haopan/FlowAlignedSurfacing · Bessmeltsev 2012: https://www.cs.ubc.ca/labs/imager/tr/2012/Quadrangulation/ · Stanko 2016: https://hal.archives-ouvertes.fr/hal-01342465 · Yu 2022: https://em-yu.github.io/research/surfacing_3d_sketches
- Schaefer/Warren/Zorin 2004: https://people.engr.tamu.edu/schaefer/research/lofting.pdf
- Company 2005: https://portalcientific.uji.es/documentos/5ec07986299952560fd2263b?lang=en · Lee & Han 2005: https://researchr.org/publication/LeeH05%3A8/bibtex
- Halstead 1993: https://graphics.pixar.com/library/FairSubdivision/index.html · Welch & Witkin 1994: https://history.siggraph.org/?p=119705 · Moreton & Séquin 1992 / Botsch & Kobbelt 2004: https://history.siggraph.org/?p=116097 · FiberMesh: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf · Repoussé: https://diglib.eg.org/handle/10.2312/SBM.SBM08.049-055 · Gonen & Akleman 2012: https://www.sciencedirect.com/science/article/abs/pii/S0097849312000581
- Bénard & Hertzmann 2019: https://arxiv.org/abs/1810.01175 · Bénard 2014: https://www.labri.fr/perso/pbenard/publications/contours · Code: https://github.com/benardp/contours · ConTesse: https://github.com/squidrice21/ConTesse · Cole 2008: https://pixl.cs.princeton.edu/pubs/Cole_2008_WDP/index.php · Hertzmann 2020: https://pubmed.ncbi.nlm.nih.gov/32126897/
- Blender Line Art: https://docs.blender.org/manual/en/latest/grease_pencil/modifiers/generate/line_art.html · Dot Dash: https://docs.blender.org/manual/en/latest/grease_pencil/modifiers/generate/dash.html · Freestyle-Dashes: https://developer.blender.org/T46716 · Pencil+ 4: https://docs.psoft.co.jp/plb400w/en/4.0.0/reference/Line_LineSet.html
- Nealen 2005: https://history.siggraph.org/?p=113959 · SilSketch: https://diglib.eg.org/handle/10.2312/SBM.SBM07.023-030
- Takayama 2013: https://la.disneyresearch.com/wp-content/uploads/Sketch-Based-Generation-and-Editing-of-Quad-Meshes-Paper.pdf · Patent: https://patents.google.com/patent/US9349216 · Tarini 2022: https://arxiv.org/pdf/2101.11569 · Marcias 2015: https://cims.nyu.edu/gcl/papers/DDQ-Paper.pdf
- Campen 2012: https://graphics.rwth-aachen.de/publication/3/campen_2012_sg_preprint1.pdf · Dual Strip Weaving: https://www.graphics.rwth-aachen.de/media/papers/campen_sa2014_dsw_medium.pdf
- Retopoflow: https://cgcookie.com/courses/retopology-with-retopoflow-3 · ZRemesher-Guides: https://3dreference.notion.site/Control-Curves-in-ZRemesher-ff095dd54911439691b4f3557eb060f2 · QuadSketch: https://superhivemarket.com/products/quadsketch
