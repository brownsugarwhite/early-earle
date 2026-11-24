# Ozzy als Suite, Teil 16: Punkte nach Bedarf

Stand 24.11.2026. Ohne Agenten und ohne Suche, mit einer kleinen Rechnung zum Bézier-Kreis. Vorher: Teil 1 bis 15. Sammelphase: nichts
gebaut, nichts getestet.

**Dein Wort (24.11.):** „Um einen perfekten Bézier-Kreis zu machen, brauche ich zwingend vier Punkte, oder? Ist die Position der vier
Punkte egal, oder müssen sie exakt verteilt sein?“ Und: „Wäre es bei meinem Mesh nicht besser und stabiler, wenn das Mesh beim
Bearbeiten unsichtbar genau da, wo ein Edgeloop gebraucht wird, automatisch einen setzt und die Vektorpunkte als dynamisch gesehen
werden? … Punkte sind immer da, wo sich Edgeloops kreuzen. Jeder Punkt am Mesh kann potentiell eine Kreuzung von Linien sein. Wenn ich
ziehe, entsteht an genau der Stelle eine Kreuzung, die optimal die Form hält. … Nach dem Zug ist der Punkt wieder weg.“

## 1 Der Bézier-Kreis

Ein perfekter Kreis geht mit gewöhnlichen (kubischen) Bézier-Kurven gar nicht, mit keiner Zahl von Punkten; es bleibt immer eine
Näherung. Genau geht er nur mit rationalen Kurven, bei denen jeder Punkt ein Gewicht trägt (so machen es CAD-Programme mit NURBS).

| Punkte | Bogen je Stück | Griff (mal Radius) | größte Abweichung | bei 500 px Radius |
| --- | --- | --- | --- | --- |
| 2 | 180° | 1,3333 | 1,84 % | 9,2 px, sichtbar |
| 3 | 120° | 0,7698 | 0,15 % | 0,8 px, knapp unsichtbar |
| 4 | 90° | 0,5523 | 0,027 % | 0,14 px, unsichtbar |
| 6 | 60° | 0,3573 | 0,0024 % | 0,01 px |
| 8 | 45° | 0,2652 | 0,0004 % | 0 px |

- **Vier Punkte sind der übliche Kompromiss,** nicht die Pflicht. Drei reichen fürs Auge oft schon, zwei sind sichtbar unrund.
- **Die Lage ist frei,** auch gedreht oder ungleich verteilt, solange jeder Griff tangential am Kreis liegt und seine Länge zu seinem Bogen
  passt: Griff = 4/3 · tan(Bogen / 4) · Radius. Ungleich verteilt sind an einem Punkt die beiden Griffe verschieden lang, und der größte
  Bogen bestimmt den Fehler (vier Punkte mit Bögen von 60, 120, 90 und 90 Grad sind so ungenau wie drei gleich verteilte).
- **Falsche Griffe rächen sich:** Ein 120-Grad-Bogen mit dem Griff für 90 Grad weicht um 14 % ab, eine deutliche Delle.
- **Für deine Idee heißt das:** Niemand sollte sich darum kümmern müssen. Ozzy setzt so viele Punkte, wie die gewünschte Genauigkeit
  braucht, oder rechnet einen echten Kreis mit Gewichten, wenn es auf CAD-Genauigkeit ankommt.

## 2 Deine Theorie in meinen Worten

Punkte sind keine festen Bedienelemente mehr. Wo du greifst, legt Ozzy unsichtbar eine Kreuzung zweier Linien genau durch diese Stelle,
mit genau den Loops, die die Form beim Ziehen halten. Nach dem Zug verschwinden Punkt und Hilfsloops wieder, soweit die Form sie nicht
mehr braucht. So kann man überall ziehen und überall knicken, und nahe oder doppelte Punkte gibt es nicht, weil keiner von Hand gesetzt
wird.

**Ja, verstanden, und schlüssig.** Die Idee passt zu deiner Regel „Punkte nur, wenn nötig“, zu „Hand schlägt Regler“ (Teil 4), zum
Scribble (Teil 6) und zum Formen mit Kurven (Teil 3).

## 3 Vorbilder: Die Idee steht nicht allein

- **FiberMesh** (Nealen und andere 2007): Man zieht an jeder Stelle einer Kurve, nicht an festen Punkten; wie weit die Verformung reicht,
  wächst mit der Zugweite.
- **Welch und Witkin 1994:** Man zieht an jeder Stelle einer Fläche; das Netz verfeinert sich dort selbst und vereinfacht sich danach
  wieder.
- **T-Splines** (Sederberg und andere 2003 und 2004): Kontrollpunkte lassen sich örtlich einfügen, ohne ganze Loops um den Körper zu
  ziehen, und überflüssige Punkte werden automatisch wieder entfernt.
- **Dynamische Topologie** (Sculptris, Blender): Dreiecke entstehen beim Pinselstrich genau dort, wo sie gebraucht werden.
- **Die Mathematik dafür gibt es:** Einen Punkt einfügen, ohne die Form zu ändern, geht genau (de Casteljau, Knoteneinfügen nach Boehm
  1980); einen Punkt wieder entfernen geht nur innerhalb einer Toleranz (Knotenentfernen nach Lyche und Mørken 1987).

## 4 Die eine offene Stelle: Wo lebt die Form, wenn der Punkt weg ist?

Verschwindet der Punkt nach dem Zug, muss die neue Form irgendwo stehen. Drei Möglichkeiten:

1. **In den verbleibenden Linien:** Ozzy passt sie neu an, innerhalb einer Toleranz.
2. **Der Punkt bleibt,** weil die Form ihn braucht; ein Knick lässt sich nicht anders ausdrücken.
3. **In der Haut** als feines Detail (Frequenztrennung, Teil 3).

**Mein Vorschlag:** Punkte sind Folge der Form, nicht ihre Ursache. Nach jedem Zug behält Ozzy die kleinste Menge an Punkten und Loops,
die die Form innerhalb einer Toleranz trägt; Knicke behalten immer einen Punkt. Die Kurven bleiben die Wahrheit, nur ihre Punkte
verwaltet Ozzy selbst. Für genaue Arbeit (CAD, Logo) blendest du die Punkte ein, und Punkte, die du bewusst setzt (Anker), bleiben, wo
du sie hingesetzt hast.

## 5 Was dafür gelöst werden muss

1. **Kein Wandern:** Vereinfacht Ozzy nach jedem Zug neu, darf sich die Form anderswo nicht unmerklich verschieben. Also kleine
   Toleranz, nur rund um den Zug vereinfachen, deine Anker nie anfassen.
2. **Richtung der Hilfsloops:** Durch einen beliebigen Punkt gibt es viele mögliche Kreuzungen. Naheliegend sind die Richtung der
   Nachbar-Loops oder die der stärksten Krümmung; beim Knick bestimmt die Zugrichtung oder ⌥ die Richtung der Kante.
3. **Reichweite:** wie weit ein Zug wirkt. Vorbild FiberMesh: Sie wächst mit der Zugweite; dazu Druck oder ein Regler.
4. **Posen und Animation:** Posen hängen heute an Punkten (Pose als Versatz der Linien). Verschwinden Punkte, muss eine Pose an Stellen
   der Form hängen statt an Punktnummern. Dasselbe gilt für Morphs in Studio.
5. **Der Rechenkern:** Das berührt den Kern „Kurven als Wahrheit“ und die Rechnung von Sitzung 4, die bisher unangetastet bleibt. Nur auf
   dein Wort.

## 6 Quellen

- A. Nealen, T. Igarashi, O. Sorkine, M. Alexa, „FiberMesh: Designing Freeform Surfaces with 3D Curves“, SIGGRAPH 2007.
- W. Welch, A. Witkin, „Free-Form Shape Design Using Triangulated Surfaces“, SIGGRAPH 1994.
- T. W. Sederberg, J. Zheng, A. Bakenov, A. Nasri, „T-splines and T-NURCCs“, SIGGRAPH 2003; T. W. Sederberg, D. L. Cardon,
  G. T. Finnigan, N. S. North, J. Zheng, T. Lyche, „T-spline Simplification and Local Refinement“, SIGGRAPH 2004.
- W. Boehm, „Inserting New Knots into B-spline Curves“, Computer-Aided Design 1980; T. Lyche, K. Mørken, „Knot Removal for Parametric
  B-spline Curves and Surfaces“, Computer Aided Geometric Design 1987.
- Sculptris (2009) und Blender (dynamische Topologie).
- Kreis: eigene Rechnung (Griff 4/3 · tan(Bogen / 4) · Radius, Abweichung durch Abtasten bestimmt).
