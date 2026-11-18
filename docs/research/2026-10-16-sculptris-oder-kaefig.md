# Sculptris-Netz oder Käfig? (Recherche 16.10.2026)

> Florian (16.10. abends, nach einem Test von Sculptris in ZBrush): „Wäre das nicht auch eine gute Option, das Mesh so
> aufzubauen, oder ist unsere Methode besser für meine Bedingungen? Würde sich ein Mesh wie bei Sculptris nicht genauer an
> mein Vektor-Liniennetz anpassen lassen?“ Recherche mit zwei Suchen (Werkzeuge und Produktionsabläufe; Forschung zu Flächen
> durch Kurvennetze), dazu unsere eigenen Versuche. Kein Code geändert.

## Kurzantwort

**Nein.** Ein Sculptris-Netz würde sich nicht genauer an das Liniennetz legen, und für die Bedingungen des Editors
(genaue Linien, Posen aus Knochen und Blendshapes, Spiel auf dem iPhone) ist der Käfig der bessere Kern. Aus der Recherche
kommen aber vier konkrete Verbesserungen für unseren Weg (unten).

## Warum

1. **Dichte macht nicht genau.** Sculptris (in ZBrush „Sculptris Pro“) und Blender Dyntopo teilen Dreiecke dort, wo der
   Pinsel arbeitet, und vereinfachen sie anderswo. Sie entscheiden nur, *wo das Netz dicht ist* — Linien kennen sie nicht.
   Genau wird eine Fläche erst, wenn jede gezeichnete Linie eine Kante im Netz ist und als feste Bedingung gilt. Das geht im
   Käfig genauso (Plan „Liniennetz, Zielform, Käfig“, S8: Linien als Kantenschleifen).
2. **Ein Dreiecksnetz trifft eine Kurve nur an seinen Punkten,** dazwischen liegen gerade Stücke. Für 0,05 px Abstand
   müssten die Kanten an engen Rundungen (Radius 23–46 px) 3–4 px kurz sein, für 0,1° Normalengenauigkeit sogar
   ≈ 0,2 px. Im Spiel (≤ 8 000 Dreiecke) geht das nicht. Die Grenzfläche des Käfigs ist glatt, Lage und Normale sind in jeder
   Auflösung genau.
3. **Jede Bearbeitung ändert die Topologie.** Posen sind Verschiebungen je Punkt auf festem Netz (Blendshapes; glTF
   verlangt für Morph-Ziele dieselbe Punktzahl wie das Grundnetz). Profi-Abläufe sculpten deshalb erst und bauen danach ein
   festes Netz (ZRemesher oder Retopologie von Hand, Details projizieren, dann Rig und Blendshapes). Blender schreibt dazu,
   es gebe keine perfekten Automatiken, die Endtopologie für animierte Figuren entstehe von Hand. Unser Käfig ist dieses
   feste Netz — bei uns von Anfang an und automatisch.
4. **Kanten mit Härte.** Dreiecksnetze kennen nur glatt oder scharf (oder sehr viele Polygone). Unterteilungsflächen haben
   stufenlose Härte je Kante, ohne zusätzliche Punkte (Pixar, DeRose u. a. 1998; OpenSubdiv).
5. **Symmetrie, Muster, LOD.** Dynamische Netze laufen aus der Symmetrie (Blender bietet dafür „Symmetrize“) und verlieren
   bei jedem Umbau die UVs — die Musterzonen müssten jedes Mal neu übertragen werden. Beim Käfig sind Spiegelpaare, Zonen und
   Detailstufen (= Unterteilungsstufen) fest.
6. **Unsere eigenen Versuche** mit Dreiecksnetzen aus Abstandsfeldern: Wesen-Werkstatt (Surface Nets) deckte sich nur zu
   52–74 % mit den Bögen, 1,6–4,4 s je Neuaufbau; der Schnitt-Loft war „zerrissen, kantig“; „rund“ (Aufblasen) rund, aber
   Top/Front bis 37 px daneben. Der Käfig liegt bei 0,2–0,3 px (Kugel, Rex-Seite).

Gegenprobe aus der Forschung: FiberMesh (2007) ist genau „Sculptris plus Kurven“ — Strichpunkte werden Netzpunkte, ein
Glättungslöser füllt die Fläche. Auch dort sind die Kurven nur an den Punkten genau, die Kanten kennen nur glatt/scharf, und
die Topologie wird nur nach dem Loslassen geändert, weil der Löser sonst neu zerlegt werden müsste. Ganze Kurven genau
interpolieren nur Flächenstücke (Coons/Gregory) und angepasste Unterteilungsflächen (Levin 1999; Schaefer, Warren, Zorin 2004).

## Was wir übernehmen (für S5–S8)

1. **Linien als harte Bedingungen.** Heute gehen Umrisse gewichtet in den Ausgleich ein („fast“). Genau wird es, wenn die
   Glätte unter festen Bedingungen minimiert wird (dünn besetztes Gleichungssystem mit Nebenbedingungen). Die Zielform bleibt
   abseits der Linien ein weiches Ziel.
2. **Umrisse mit Normale.** Am Umriss steht die Fläche senkrecht zur Blickrichtung; das ist eine weitere lineare Bedingung
   je Probe. So werden Silhouetten auch in der Normale genau (unsere L0-Messung: Lage 0,04–0,29 px, Normalen bis 24°).
3. **Kappen ohne vielkantige Pole** (Gitterkappen mit Valenz 3/5 oder polare Unterteilung): Nahe solcher Pole folgt die
   Grenzfläche der Valenz statt dem Käfig — wahrscheinlich eine Ursache der Kappenfalten (Vermutung, prüfen).
4. **Bézier-Kurven exakt im Käfig:** Eine scharfe Kantenschleife ist in der Grenzfläche ein kubischer B-Spline. Damit
   Florians Bézier-Kurven exakt passen, die Kurven intern als B-Splines führen (echte Knicke als scharf markieren) oder ein
   Verfahren nehmen, das beliebige Kurven interpoliert (Levin 1999).

## Wo ein Sculptris-Netz helfen kann

- **Freier „Ton“ als Eingabe** für Wesen, die nicht aus Wirbelsäule und Ringen entstehen: Das Tonmodell ist nur das Ziel, der
  Käfig legt sich darüber (eine automatische Retopologie).
- **Freier Formpinsel**, dessen Ergebnis als Käfig-Verschiebung gespeichert wird (wie heute der Pinsel).
- **Grundsatz von FiberMesh, den wir schon nutzen:** Topologie nur zwischen Gesten ändern, nie während einer Geste
  (eingefrorene Stationen).
- **Nicht** als Spielnetz und nicht als einzige Wahrheit.

## Nicht nachgeprüft

- Innenleben von Sculptris Pro (Symmetrie, Zusammenspiel mit 3D-Layern) nur aus der Dokumentation erschlossen.
- Ob ZRemesher-Schleifen bei Kurvenstärke 100 exakt auf den Kurven liegen.
- Die Bedingung für glatte Kurven im Käfig ((Q₋ + 4P + Q₊)/6) und die Umriss-Normalen-Bedingung sind aus Standard-Eigenschaften
  von B-Splines hergeleitet, nicht aus einer Quelle; Kappenfalten durch die Valenz ist eine Vermutung.

## Quellen (aus der Recherche, nicht einzeln nachgeprüft)

- Maxon: Sculptris Pro — https://help.maxon.net/zbr/en-us/Content/html/user-guide/3d-modeling/modeling-basics/creating-meshes/sculptris-pro/sculptris-pro.html
- Maxon: ZRemesher mit Kurven — https://help.maxon.net/zbr/en-us/Content/html/user-guide/3d-modeling/topology/zremesher/using-curves/using-curves.html
- Blender: Dyntopo — https://docs.blender.org/manual/en/latest/sculpt_paint/sculpting/tool_settings/dyntopo.html
- Blender: Retopologie — https://docs.blender.org/manual/en/latest/modeling/meshes/retopology.html
- Khronos: glTF 2.0, Morph-Ziele — https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc
- Nealen u. a. 2007: FiberMesh — https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf
- Dvorožňák u. a. 2020: Monster Mash — https://dcgi.fel.cvut.cz/~sykorad/monster_mash.html
- Rivers, Durand, Igarashi 2010: 3D-Modelle aus Silhouetten — https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/alec_siggraph2010_silhouette.pdf
- Bessmeltsev u. a. 2012: Vierecke aus geschlossenen 3D-Kurven — https://www.cs.ubc.ca/labs/imager/tr/2012/Quadrangulation/
- Stanko u. a. 2016: Flächen aus Kurvennetzen mit Normalen — https://hal.archives-ouvertes.fr/hal-01342465
- Levin 1999: Interpolierende Unterteilung — https://www.math.tau.ac.il/~levin/adi/paper7.htm
- Schaefer, Warren, Zorin 2004: Lofting mit Unterteilungsflächen — https://people.engr.tamu.edu/schaefer/research/lofting.pdf
- DeRose, Kass, Truong 1998: halbscharfe Falten — https://graphics.pixar.com/library/Geri/paper.pdf
- OpenSubdiv: Unterteilungsflächen — https://github.com/PixarAnimationStudios/OpenSubdiv/blob/release/documentation/subdivision_surfaces.rst
- Karčiauskas, Peters, Reif 2004: Form nahe besonderer Punkte — https://www.cise.ufl.edu/research/SurfLab/papers/03part2.pdf
- Botsch, Kobbelt 2004: Remeshing mit Kantenlinien — https://cg.cs.tu-dortmund.de/publications/2004-remeshing.pdf
- Pietroni u. a. 2021: QuadWild — https://vcg.isti.cnr.it/publication/2021/PNACT21
- Xu 2005: Konvergenz von Normalen auf Dreiecksnetzen — https://doi.org/10.1007/11537908_27
