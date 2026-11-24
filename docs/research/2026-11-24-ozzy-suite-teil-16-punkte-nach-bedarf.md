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

## 6 Nachtrag: deine Regel und was wir früher schon hatten (24.11.)

**Dein Wort:** „Ich glaube, ich will die Punkte nicht direkt nach dem Zug aufräumen, sondern erst mit dem nächsten Zug neu setzen. Wir
haben schon sehr viel ausprobiert. War eine Methode früher schon mal dabei, bevor wir uns für die jetzige Rechnung entschieden haben?“

**Gesucht in:** Gedächtnis, `docs/verlauf/`, `docs/plans/`, `docs/research/` (auch die Gegenprüfung vom 10.11. mit der Liste aller
Versuche), `docs/UEBERGABE.md` und den Commits aller Zweige.

**Genau diese Methode war nicht dabei.** Fünf Verwandte schon:

| Wann | Was | Wie es ausging |
| --- | --- | --- |
| 11.10. | Im ersten Editor setzten sich Punkte von selbst. | Du hast es abgelehnt: „Das mit den Punkten, die sich von selbst setzen, gefällt mir nicht … ich setze neue Punkte von Hand.“ Und: „Es reicht, wenn man mit 4 Punkten am Kreis anfängt, 12 sind zu viel.“ |
| 16. und 20.10. | Kopplung zwischen den Ansichten (Liniennetz, Käfig-Zeit): Im Zug fügt Ozzy einen Punkt ein, nur wenn der Rest über 1 px liegt, höchstens zwei je Zug, ohne die Form zu ändern (Commit `d1103876`). | Dein Wort: „nur wenn wirklich notwendig“. Die Punkte blieben danach stehen. |
| 05. bis 10.11. | Das dichte Netz verdichtet sich selbst (`9b996ee3`), auch live im Zug (`d088e839`), später nach dem Loslassen im Hintergrund (`d695c2b5`). Betraf die Dreiecke, nicht die Punkte der Linien. | Gemessen: Der Sprung nach dem Loslassen kam vom Verdichten danach. Am 09.11. sagtest du: „Ich dachte, wenn sich das Mesh beim Zug exakt immer neu aus den Linien entwickelt und live verdichtet, haben wir weder Ecken noch ein Springen.“ Fünf Anläufe, dann die Recherche zu FiberMesh und danach die heutige Rechnung. |
| 07.11. | „Punkte wo nötig“ (`?punkte=noetig`, Commit `a0d2f959`): Neue Loops bekommen Zusatzpunkte, bis ihr Pfad die Form genau trifft (4/6/3 statt 3/4/3 Punkte). | So rund wie vorher, aber ein Zusatzpunkt landete 10 Einheiten neben einer späteren Kreuzung, und deren Zug machte einen Zipfel. Dein Urteil: „etwas besser“; die Entscheidung blieb offen. |
| 13.11. | Donut, deine erste Fassung: „Der Punkt, den man über die Mitte zieht, soll nur während des Zuges noch sichtbar sein … Beim Loslassen verschwindet er.“ | Am selben Abend durch deine zweite Fassung ersetzt; seit dem 18.11. entsteht die Naht beim Loslassen von selbst (`62103f1d`). |

Dazu gibt es seit dem 08.11. im Bleistift-Kern ein Verfahren, das eine Linie mit den wenigsten Ankern nachzieht
(`packages/shape/src/zeichnen/anpassen.ts`, Commit `4628182e`). Es könnte beim nächsten Zug die kleinste tragende Menge an Punkten
finden.

**Was das für deine Regel heißt:**

- **Sie passt zu dem, was wir gemessen haben.** Der Sprung nach dem Loslassen kam vom Aufräumen danach. Wer erst mit dem nächsten Zug
  neu setzt, lässt die Form nach dem Loslassen in Ruhe, und Rückgängig bleibt einfach, weil sich zwischen zwei Zügen nichts ändert.
- **Sie löst das Problem von „Punkte wo nötig“.** Der Zipfel kam von einem stehen gebliebenen Zusatzpunkt neben einer neuen Kreuzung.
  Werden die Punkte mit jedem Zug neu gesetzt, bleibt kein alter Punkt an der falschen Stelle stehen.
- **Die Bedingung:** Das Neusetzen zu Beginn des nächsten Zugs darf die Form nicht ändern, nur ihre Beschreibung. Einfügen geht genau;
  Wegnehmen nur innerhalb einer Toleranz, die unter einem Bildpunkt bleibt, und am besten nur rund um den neuen Zug. Sonst zuckt die Form
  genau in dem Moment, in dem du greifst.
- **Der Unterschied zu 11.10.:** Damals waren die automatischen Punkte sichtbare Punkte, um die du dich kümmern musstest. Hier sind
  Punkte gar keine Bedienelemente mehr.

## 7 Meine Einschätzung: eleganter, besser, genauer? (24.11.)

**Deine Frage:** „Hältst du das für einen eleganteren Weg, der hilft, das Mesh besser und genauer zu bearbeiten?“

- **Eleganter: ja.** Eine Regel ersetzt viele, die wir einzeln gebaut haben: Punkt auf der Linie nur mit P, die Sperre gegen nahe Punkte
  beim Doppelklick, die Zusatzpunkte aus „Punkte wo nötig“, das Einfügen am kleinen Detail, das am 08.11. nicht ging. Das ist die Art
  Strukturänderung, die die Arbeitsregel meint („ab der dritten neuen Regel die Struktur prüfen“). Und sie passt zu deinem Denken: Du
  greifst die Form, nicht Punkte. Deine Linien bleiben deine; Punkte und Hilfsloops werden Ozzys.
- **Besser bearbeiten: ja, wahrscheinlich.** Man kann überall greifen und knicken, und Fehler aus schlecht liegenden Punkten (der Zipfel
  vom 07.11.) fallen weg. Frei wie beim Sculpting, sauber wie bei Vektoren.
- **Genauer: in zwei Bedeutungen verschieden.** Die Form zu treffen, die du meinst, wird genauer, weil die Kontrolle dort entsteht, wo du
  greifst. Maße, genaue Kreise und Wiederholbarkeit werden nicht von selbst genauer, denn das Neusetzen arbeitet mit einer Toleranz.
  Dafür bleiben Anker, die du bewusst setzt, und genaue Grundformen (rationale Kreise) für Logo und CAD.
- **Der eigentliche Prüfstein ist die Vorhersagbarkeit, nicht die Mathematik.** Bei festen Punkten siehst du vorher, was ein Zug tut. Bei
  Punkten nach Bedarf muss genauso klar sein, wie weit ein Zug wirkt und in welche Richtung die Hilfskreuzung läuft; sonst fühlt es sich
  an, als mache das Netz, was es will. Deshalb gehört während des Zugs sichtbar dazu, wo die Kreuzung liegt und wie weit sie reicht, so
  wie beim Donut der gezogene Punkt sichtbar blieb.
- **Mein Urteil:** der elegantere Weg und eine echte Vereinfachung des Kerns, unter zwei Bedingungen: Das Neusetzen ändert die Form nicht
  merklich, und jeder Zug ist vorhersagbar. Bewiesen ist davon noch nichts.

## 8 Nachtrag: Kugel und Horn, und wie FiberMesh es macht (24.11.)

**Dein Wort:** „Eine Kugel hätte dann quasi keine sichtbaren Loops oder Punkte. Wenn ich an einem Punkt ziehe, werden drei Edgeloops mit
je vier Punkten gesetzt (also sechs Kreuzungen), man sieht aber nur den Punkt, an dem ich ziehe. … Wenn ich … einen kleinen Kreis setze
und dann die Mitte des Kreises rausziehe, entstehen zwei Loops, die bis zur Kreiskante führen, und ich kann dort ein Horn herausziehen,
ohne dass es sich aufbläst, oder? … Beim nächsten Zug kann ich ihn wieder einfahren, bis die Haut wieder glatt auf der Grundkugel ist?
Erst wenn ich am Höcker selbst einen Loop erstelle, kann ich ihn nicht mehr zurücksetzen?“ Und: „Wie macht das FiberMesh? Beruht
FiberMesh auch auf Bézier?“

**So verstehe ich es:**

- **Drei Loops, sechs Kreuzungen** sind wie die drei Großkreise einer Kugel: Zwei laufen durch den Punkt, an dem du ziehst, der dritte
  umrundet ihn wie ein Äquator. Sichtbar ist nur dein Punkt.
- **Ohne eigenen Loop** reicht ein Zug über die ganze Kugel, sie wird zum Ei oder Tropfen. Für eine kleine Beule braucht es eine
  Reichweite: Sie wächst mit der Zugweite wie bei FiberMesh, oder du gibst sie über Druck oder einen Regler.
- **Mit deinem kleinen Kreis** ist der Kreis die Grenze. Die zwei Hilfsloops laufen von der Mitte zur Kreiskante, und das Horn wächst nur
  innerhalb. Die Reichweite bestimmst du dann durch Zeichnen statt durch einen Regler.
- **Aufblasen: sehr wahrscheinlich weniger.** Die Recherche vom 09.11. hat die Wurzel gefunden: Eine Linie legt nur die Lage der Haut
  fest, nicht ihre Richtung; erst wo sich zwei Linien kreuzen, ist die Richtung bestimmt. Deine Kreuzung entsteht genau an der Spitze, und
  der Kreis hält den Fuß. Damit ist das Horn festgelegt. Bewiesen ist das nicht: Der Beweis „Linien mit Richtung“ vom 09.11. bestätigte,
  dass Richtung die Form eindeutig macht, scheiterte aber an der Rechnung auf unserem Netz.
- **Zurückschieben: ja.** Wichtig ist der Unterschied zwischen unsichtbar und weg. Nach dem Zug sind die Hilfsloops unsichtbar, aber sie
  sind das Gedächtnis des Höckers. Beim nächsten Zug setzt Ozzy sie neu. Schiebst du den Höcker zurück, bis die Haut auf der Grundkugel
  liegt, braucht die Form sie nicht mehr, und sie verschwinden wirklich. Ein kleines Einrasten kurz vor der Grundform hilft, genau
  dorthin zu kommen.
- **Ein eigener Loop auf dem Höcker:** Zurückschieben geht weiterhin, nur dein Loop bleibt, weil er deiner ist. Er liegt dann flach auf
  der Kugel, bis du ihn löschst.
- **Die Grundkugel kann exakt sein.** Ist die Grundform eine echte Kugel und keine Näherung aus Bézier-Stücken, beschreiben die Loops nur,
  was du davon wegziehst. Bei Zug null ist sie wieder genau rund; das beantwortet nebenbei die Frage nach dem perfekten Kreis.

**Haken, die bleiben:**

- Greifst du den Höcker erneut, muss die neue Kreuzung die vorhandene Form genau übernehmen; sonst zuckt er beim Greifen.
- Ohne eigenen Loop braucht es eine klare, vorhersagbare Reichweite.
- Sichtbar ist nur ein Punkt; die Reichweite sollte trotzdem zu sehen sein, etwa als Licht auf der Haut (das gab es schon als Studie:
  „Einfluss als Licht“, 12.11., Commit `ce41fec2`).
- Posen und Morphs müssen an Stellen der Form hängen statt an Punkten.

**Wie FiberMesh es macht** (Nealen und andere 2007; unsere Recherche vom 09.11.:
`docs/research/2026-11-09-fibermesh-monstermash-richtung.md`):

- **Keine Bézier-Kurven.** Die Kurven sind dichte Linienzüge aus vielen Punkten, die auf dem Netz liegen und Teil davon sind.
- **Feste Punkte gibt es nicht.** Man zieht an jeder Stelle einer Kurve; wie weit die Verformung entlang der Kurve reicht, wächst mit der
  Zugweite.
- **Die Haut** ist die glatteste Fläche durch alle Kurven, in Runden gerechnet: erst die Krümmung glätten, dann die Lage dazu lösen (nach
  eigener Angabe 5 bis 10 Runden). Kurven sind glatt oder scharf. Nach dem Loslassen wird neu vernetzt.
- **Kurven zeichnet man selbst** auf die Fläche; gezogen wird an Kurven, nicht an beliebigen Stellen der Haut.
- **Schwächen** laut unserer Recherche: ein Gedächtnis, das die Form vom Weg abhängig macht, Neuvernetzen nach dem Loslassen,
  Abhängigkeit vom Netz, und ohne Richtung an den Kurven wird es instabil.
- **Der Unterschied zu deiner Idee:** Bei FiberMesh sind die Punkte auf den Kurven frei, aber die Kurven musst du selbst zeichnen. Bei dir
  entstehen auch die Kurven von selbst, genau dort, wo du greifst, und sie bringen die fehlende Richtung gleich mit.

## 9 Nachtrag: Greifen ohne Zucken, Reichweite, Licht, Posen (24.11.)

**1. Erneut greifen, ohne dass es zuckt.** Dein Wort: „deshalb meine anfängliche Frage mit den vier Punkten und dem Kreis“. Genau: Die
Antwort von dort trägt hier.

- **Einfügen ist exakt.** Liegen am Höcker schon unsichtbare Loops, setzt Ozzy die neue Kreuzung in sie hinein (de Casteljau); das ändert
  die Form um nichts.
- **Neu beschreiben ist fast exakt,** wenn die Stücke klein genug sind. Faustregel aus der Kreisrechnung: Stücke mit höchstens einer
  Vierteldrehung, also vier Punkte je Kreis, liegen bei 500 px Radius 0,14 px daneben, sechs Punkte 0,01 px. Wo es genau sein muss, nimmt
  Ozzy echte Kreise mit Gewichten.
- **Der Rest verschwindet in der Bewegung:** Was an Unterschied bleibt, blendet Ozzy in den ersten Bildern des Zugs weich ein, während
  deine Hand sich ohnehin bewegt.

**2. Reichweite ohne eigenen Loop.** Dein Wort: Zieht man an der Kugel, wird sie logisch zum Tropfen, und die Reichweite läuft bis zum
Äquator; setzt man den Äquator von Hand nicht in die Mitte, reicht der Zug bis zu dieser Linie, weil kein dritter Loop nötig ist.

- **Einverstanden, und es lässt sich allgemein fassen:** Der dritte Loop liegt dort, wo sich die Haut von der Zugrichtung wegdreht. Bildlich:
  Eine Lampe leuchtet aus der Zugrichtung auf die Form, und der beleuchtete Teil ist die Reichweite. An der Kugel ist die Lichtgrenze
  genau der Äquator.
- **Deine Linie hat Vorrang:** Liegt eine eigene Linie um den Griff, reicht der Zug bis zu ihr, auch wenn sie nicht in der Mitte liegt.
- **Eine Stelle braucht noch eine Regel:** An langen Formen. Ziehst du eine Wurst seitlich, liegt die Lichtgrenze quer zur Wurst nach
  einer Vierteldrehung, längs aber erst an ihren Enden; dann würde die ganze Seite mitgehen. Vorschlag: längs so weit wie quer, bis zu
  deiner nächsten Linie. An runden Formen wie Kugel, Ei oder Kopf stellt sich die Frage nicht.

**3. Die Reichweite als Licht.** Einverstanden. Mit der Lampe aus Punkt 2 ist das Licht nicht nur eine Anzeige, sondern die Regel selbst:
Was hell wird, geht mit.

**4. Posen an Stellen der Form statt an Punkten.** Kein grundsätzliches Problem, aber eine echte Umstellung:

- **Heute** speichert eine Pose, wie weit sich Punkte der Linien verschieben (Pose als Versatz der Linien). Verschwinden Punkte, fehlt der
  Pose der Halt.
- **Künftig** wird eine Pose ein Feld auf der Form: an jeder Stelle der Grundform, wie weit sie sich verschiebt. Ebenso die Gewichte der
  Knochen, die ohnehin gemalt werden. Ozzy wertet das Feld an den Punkten aus, die gerade da sind.
- **Als Halt dienen deine eigenen Linien und die Grundform;** die unsichtbaren Hilfsloops müssen das nicht leisten.
- **Das ist sogar robuster:** Morphs zwischen Formen mit verschieden vielen Punkten (Studio) und die Leiter von 2 bis 2048 werden
  leichter, weil keine Punktnummern mehr zueinander passen müssen.
- **Im Spiel ändert sich nichts:** Beim Backen werden die Punkte fest, und Blendshapes sind wie heute Verschiebungen je Punkt des
  Spielnetzes.
- **Der Preis:** Die Posen im Maul-Strang (vier Scheiben, Zähne je Pose) müssten auf Felder umziehen. Und wird die Grundform nachträglich
  geändert, muss das Feld mitwandern; dafür gibt es bekannte Verfahren (etwa Deformation Transfer, Sumner und Popović 2004).

## 10 Nachtrag: die Wurst genauer (24.11.)

**Dein Wort:** „Es gibt doch dann auch bei der Wurst bereits existierende Edgeloops. Loops, die wirklich zur Form beitragen, sollen ja
bleiben, z. B. bei einem Bauch oder Hals. Bzw. was das angeht, bin ich noch nicht ganz sicher.“

- **Du hast recht:** Wo Loops die Form tragen (Bauch, Hals, Taille), begrenzen sie den Zug, und die Frage stellt sich dort nicht.
- **Die Lampe braucht dort nicht einmal einen Loop:** An einem Hals oder einer Taille dreht sich die Haut von der Lampe weg, also endet das
  Licht dort von selbst. Die Reichweite folgt der Form.
- **Die Frage stellt sich nur an einem langen, gleichmäßigen Stück:** einer geraden Wurst, einem Schwanz, einem Hals ohne Verengung. So ein
  Stück braucht keinen Ring, um seine Form zu halten; also liegt dort keiner, und längs dreht sich die Haut nicht weg. Die Lampe würde die
  ganze Seite beleuchten, und die ganze Seite ginge mit.
- **Vorschlag: Wo du greifst, entscheidet.** Greifst du auf der Fläche, entsteht eine Beule, längs so lang wie quer breit, so wie an der
  Kugel. Greifst du die Längslinie selbst, geht die ganze Seite mit.
- **Welche Loops bleiben** (deine offene Frage), als Vorschlag: deine Linien immer und sichtbar; Ozzys Hilfsloops unsichtbar, solange die
  Form sie braucht. Den Zug begrenzen die Form selbst (das Licht) und deine Linien, nicht die unsichtbaren Hilfsloops. So ist alles, was
  einen Zug begrenzt, für dich sichtbar.

## 11 Quellen

- A. Nealen, T. Igarashi, O. Sorkine, M. Alexa, „FiberMesh: Designing Freeform Surfaces with 3D Curves“, SIGGRAPH 2007.
- W. Welch, A. Witkin, „Free-Form Shape Design Using Triangulated Surfaces“, SIGGRAPH 1994.
- T. W. Sederberg, J. Zheng, A. Bakenov, A. Nasri, „T-splines and T-NURCCs“, SIGGRAPH 2003; T. W. Sederberg, D. L. Cardon,
  G. T. Finnigan, N. S. North, J. Zheng, T. Lyche, „T-spline Simplification and Local Refinement“, SIGGRAPH 2004.
- W. Boehm, „Inserting New Knots into B-spline Curves“, Computer-Aided Design 1980; T. Lyche, K. Mørken, „Knot Removal for Parametric
  B-spline Curves and Surfaces“, Computer Aided Geometric Design 1987.
- Sculptris (2009) und Blender (dynamische Topologie).
- Kreis: eigene Rechnung (Griff 4/3 · tan(Bogen / 4) · Radius, Abweichung durch Abtasten bestimmt).
