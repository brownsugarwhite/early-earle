# Recherche: Teddy, FiberMesh, Monster Mash · Bleistift mit Glättung · Loops von selbst

Stand 08.11.2026, für den Plan [`docs/plans/2026-11-08-zeichnen-aufblasen-anbauen.md`](../plans/2026-11-08-zeichnen-aufblasen-anbauen.md).
Gesammelt in drei parallelen Recherchen; Paper-Server (Princeton, Tokio, arXiv, ETH) waren aus der Cloud gesperrt, Quellcode über
GitHub-Rohdateien und npm war lesbar.

**Markierung der Belege:** [P] Primärquelle selbst gelesen (Code, Hilfetext, Paper) · [PS] Wortlaut der Primärquelle nur als
Suchausschnitt gesehen · [S] Sekundärquelle (Reimplementierung, Vorlesung, Handbuch) · [G] aus dem Gedächtnis, nicht bestätigt.
Zwei Kernaussagen zu FiberMesh (Kurventyp je Operation, ebener Deckel) wurden zusätzlich mit eigenen Suchen gegengeprüft.

## A. Löschen, Schneiden, Extrudieren, Anbauen in skizzenbasierten Modellierern

### A1 Teddy (Igarashi, Matsuoka, Tanaka 1999) und Nachfolger

- **Erzeugen:** Anfang und Ende des Strichs werden verbunden → ebenes Polygon; Constrained Delaunay; Rückgrat = Chordal Axis
  (Mittelpunkte der inneren Kanten); Enddreiecke werden beschnitten (Halbkreis-Test) und als Fächer trianguliert; Rückgratpunkte
  werden proportional zum Abstand vom Polygon angehoben; jede innere Fächerkante wird ein Viertel-Oval, Querschnitte sind Ovale
  [PS T1, S T2]. Selbstschneidende Striche werden abgewiesen [PS T1].
- **Extrudieren (zwei Striche):** ein geschlossener Strich auf der Fläche ist der Basisring (Normale aus seiner Ausgleichsebene);
  der Extrusionsstrich wird auf eine Ebene senkrecht zur Fläche durch den Ring projiziert; Kopien des Rings laufen den Strich entlang,
  etwa senkrecht zur Richtung, auf die Strichbreite skaliert; **die Polygone im Ring werden gelöscht, die Ringkopien vernäht** [PS T1,
  S T4].
- **Schneiden:** ein Strich quer über das Objekt löscht die eine Seite; der Querschnitt wird aus ebenen Stücken zusammengesetzt
  (**Deckel stückweise eben**); danach kann man **direkt aus dem Schnitt extrudieren** [PS T1, S T3].
- **Glätten:** Polygone in einem Ring löschen und das Loch glatt neu füllen [PS T1].
- **Smooth Teddy** (Igarashi und Hughes 2003): nachträglich fast gleichseitige Dreiecke und Verfeinern über lokale Quadriken; nur
  kugelartige Topologie [PS T5, S T2].

### A2 FiberMesh (Nealen, Igarashi, Sorkine, Alexa 2007)

- Die Striche bleiben als Steuerkurven auf der Fläche und sind die Griffe; die Fläche entsteht aus einer Fairness-Optimierung mit
  glatt verteilten Krümmungsbeträgen und Lagebedingungen an den Kurven [PS F1] (deckt sich mit Abschnitt 2 der Planseite
  „Kurven als Wahrheit“).
- **Kurventyp je Operation** (gegengeprüft): Erzeugen → glatte Kurve; **Schnitt → scharfe Kurve**; **Extrusion → eine scharfe Kurve an
  der Basis und eine glatte entlang der Silhouette**; eine neu auf die Fläche gezeichnete Kurve ist zunächst glatt; der Typ ist
  umschaltbar [PS F1].
- **Schnitt:** „the system flattens the intersection (it is always developable) and generates a 2D mesh inside“ → **ebener Deckel** mit
  scharfer Kante (gegengeprüft) [PS F1].
- **Extrusion:** geschlossener Strich auf der Fläche, dann Silhouettenstrich (wie Teddy); **Tunnel:** geschlossener Strich, dann ein
  Strich auf der Gegenseite [PS F1].
- **Neu vernetzt** wird nach Erzeugen, Schnitt und Extrusion, jeweils am Ende der Operation; Kurven dürfen beliebige Topologie haben
  und unverbunden sein [PS F1].

### A3 Monster Mash (Dvorožňák u. a. 2020), Quellcode gelesen

Das Vorbild, das unserem Arbeiten in der Seite am nächsten kommt [P, `github.com/google/monster-mash`]:

- **Zeichnen:** jede Region ein Strich; **Zeichenreihenfolge = Tiefenreihenfolge**; geschlossener Strich = Körper; **offener Strich =
  angesetztes Teil, die Lücke schließt eine gerade Sehne, die die Naht markiert**; rechte Maustaste zeichnet hinter die überstrichenen
  Teile; **Doppelklick dupliziert ein Teil und legt es hinter alle anderen** (so entstehen Beine und Augen beider Seiten) [P M4, M7].
- **Aufblasen:** Poisson mit Kotangens-Laplace, rechte Seite = Aufblasstärke (Standard 2), z = 0 am Umriss, **an der Naht frei**,
  danach z ← √z [P M1]. Nachgerechnet: Bei gleicher Stärke c wird eine Scheibe nur mit c = 4 eine Halbkugel, ein Streifen nur mit c = 2
  ein Halbkreis — Kugeln und Röhren sind also nicht zugleich rund. **Unsere Vereinigung der größten Kugeln (`rund.ts`) ist für beide
  genau rund** und bleibt deshalb das Aufblasen.
- **Annähen:** Die Nahtpunkte eines Teils werden als feste Punkte ins Netz des Elternteils eingefügt, die Elterndreiecke daran auf das
  Teil umgehängt (Schlitz und Naht) [P M3]. **Grenze:** nicht wasserdicht — die Rückseite des Teils bleibt im Körper offen, die
  Achselnaht ist experimentell [P M1, M3, M7]. Für unsere eine geschlossene Haut braucht es eine geschlossene Nahtschleife.
- **Tiefe** entsteht nur über Ungleichungen in der späteren Verformung; ohne sie durchdringen sich Teile [P M5, PS M8].

### A4 Weitere Systeme (kurz)

- **RigMesh** (Borosán u. a. 2012): Verschmelzen ergibt eine **wasserdichte Vereinigung mit geschlossener Schnittschleife**, danach
  geglättet; Schnitt mit offener Kurve, glatt oder scharf [PS R1].
- **ShapeShop** (2005): implizit (BlobTree), Anfügen per Blend — keine Nähte, aber Verschmelzen (bei uns ausgeschlossen) [PS D1].
- **SmoothSketch** (2006): ergänzt verdeckte Konturen an T-Kreuzungen [PS D2]. **B-Mesh** (2010) und Blenders Skin-Modifier: Netz aus
  Skelett und Kugeln, Abzweigungen über konvexe Hüllen [PS D3, P D4].
- **UI heutiger Werkzeuge:** Nomad Sculpt hat Lathe, Tube und Trim, aber kein „Lasso aufblasen“; ZBrush ZSpheres/ZSketch bauen über
  ein Gerüst [S E1, E2]. Das klarste Vorbild für die Seitenansicht bleibt Monster Mash.

### A5 Netztechniken

- **Loch füllen:** Liepa 2003 (triangulieren, verfeinern, fairen) [PS X1]; eben wie Teddy/FiberMesh: Rand in eine Ebene legen, 2D
  vernetzen [PS T1, F1].
- **Ringe ungleicher Punktzahl verbinden:** Fuchs, Kedem, Uselton 1977 (kürzeste Kachelung als dynamische Programmierung) [PS X3];
  Blenders „Bridge Edge Loops“: kürzeren Ring auffüllen, beste Drehung, triangulieren, Querkanten umklappen [P X4].
- **Neu vernetzen:** Botsch und Kobbelt 2004 (teilen über 4/3 L, zusammenlegen unter 4/5 L, Wertigkeit 6, tangential entspannen)
  [PS X2]; unser `verdichten.ts` macht die ersten drei Schritte schon.
- **Harte Kante im Löser** nur, wenn die Glättung über die Kante entkoppelt ist; sonst blutet Krümmung in den Deckel [G X5] — bei uns
  ist das „Kante an“ (Gewicht 0 über die Linie).

### A6 Was wir übernehmen

1. **Kurventypen wie FiberMesh vorbelegen:** Startform → glatt; Schnitt/Löschen → Kante; Anbau → Ansatz wie sein Loop (am Schnitt
   Kante, an einer frei entstandenen Naht weich wie RigMesh), Silhouette glatt; danach mit K umschaltbar.
2. **Deckel eben** (Teddy, FiberMesh): Randkette in die Ausgleichsebene, innen 2D vernetzen, im Löser ohne Krümmungsquelle.
3. **Extrudieren aus dem Loop** wie Teddy: Ringkopien längs der Mittelachse der Zeichnung, nach außen rund, Inneres des Loops weg.
4. **Anbauen frei** wie RigMesh-Verschmelzen bzw. Monster Mash mit geschlossener Naht: Schnittschleife mit dem Körper berechnen, das
   Innere verwerfen, an der Schleife vernähen. Paare wie Monster Mashs Duplikat (bei uns der Spiegelzwilling).
5. **Fangen** über dieselbe Ecke (Monster Mash: Steiner-Punkt = Nahtpunkt), nie über eine Nachbarsuche; Knoten des Kurvennetzes beim
   Neuvernetzen nie verschieben.
6. **Neu vernetzen nur nach Topologie-Schritten** (FiberMesh), die Hälfte z ≥ 0 mit Kurven als festen Kanten, dann spiegeln.

## B. Bleistift mit Glättung, wenige Anker

*(folgt)*

## C. Loops von selbst

*(folgt)*

## Quellen (Teil A)

- T1 Teddy-Paper: https://www.cs.toronto.edu/~jacobson/seminar/igarashi-et-al-1999.pdf (Ausschnitte)
- T2 Reimplementierung zeyap/teddy: https://raw.githubusercontent.com/zeyap/teddy/master/README.md
- T3 Teddy-Handbuch: http://obado.free.fr/teddy/manual/tutorial5.html
- T4 UMBC-Vorlesung: https://courses.cs.umbc.edu/graduate/635/spring13/lectures/07_TeddyIntro.pdf
- T5 Smooth Teddy: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/smoothteddy/index.html
- F1 FiberMesh: https://igl.ethz.ch/projects/FiberMesh/fibermesh.pdf,
  https://people.eecs.berkeley.edu/~sequin/CS285/PAPERS/SIGGRAPH_07/041-nealen_FibreMesh.pdf
- M1–M7 Monster Mash, `github.com/google/monster-mash` (Branch main): M1 `src/reconstruction.cpp`, M3
  `third_party/ir3d-utils/MeshBuilder.cpp`, M4 `src/mainwindow.cpp`, M5 `src/defengarapl.cpp`, M7 `src/ui/myshell.html`
- M8 Google-Research-Blog 2021: https://research.google/blog/monster-mash-a-sketch-based-tool-for-casual-3d-modeling-and-animation/
- R1 RigMesh: https://cragl.cs.gmu.edu/rigmesh/rigmesh-small.pdf
- D1 ShapeShop: https://cspages.ucalgary.ca/~blob/webpapers/05/shapeshop_hires.pdf · D2 SmoothSketch:
  https://cs.brown.edu/~jhughes/papers/Karpenko-IDO-2006/main.htm · D3 B-Mesh: https://diglib.eg.org/xmlui/handle/10.2312/CGF.v29i7pp2169-2177
  · D4 Blender Skin-Modifier: `source/blender/modifiers/intern/MOD_skin.cc`
- E1 Nomad: https://forum.nomadsculpt.com/t/lathe-tool-feature/1900 · E2 ZBrush Unified Skin:
  https://help.maxon.net/zbr/en-us/Content/html/reference-guide/tool/zsphere/unified-skin/unified-skin.html
- X1 Liepa 2003: https://diglib.eg.org:443/xmlui/handle/10.2312/SGP.SGP03.200-206 · X2 Botsch und Kobbelt 2004:
  https://cg.cs.tu-dortmund.de/downloads/publications/2004/sgp04_slides.pdf · X3 Fuchs, Kedem, Uselton 1977:
  https://history.siggraph.org/?p=103213 · X4 Blender Bridge: `source/blender/bmesh/operators/bmo_bridge.cc` · X5 Botsch und
  Sorkine 2008: https://cg.cs.tu-dortmund.de/publications/2008-survey.pdf
