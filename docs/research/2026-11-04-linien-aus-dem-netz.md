# Linien aus dem Netz — Probe und ehrliche Prognose (04.11.2026)

Florians Frage nach dem Screenshot seines Vierbeiners:

> „Das Mesh bildet noch oft nicht die optimale Form und weicht stark von der Outline ab, was eigentlich nicht passieren
> sollte, da jede Ansicht und Outline das echte Mesh zeigt. Ist es sogar möglich, die Linien und Kanten ganz gegen Shader
> auszutauschen, oder ist das zu ungenau? So könnte ich quasi jede Kante, die entsteht, direkt mit Griffen bearbeiten. Flache
> sind gestrichelt und werden dicker bis 3 px und solid und schwarz bei vollem ‚Crease‘. … An Stellen, an denen sich Outline
> und Kante treffen, entstehen automatisch Punkte. … Kannst du das mal auf die Probe stellen und recherchieren und mir eine
> ehrliche Prognose geben, ob das gehen würde und vielleicht sogar genau die elegante Lösung ist, die wir suchen?“

## Kurz

- **Warum es heute abweicht:** Drei gezeichnete Ansichten können sich widersprechen. Heute nimmt der Körper dann die
  Schnittmenge: In deinem Bild reicht der Kopf in der Seite höher als die gezeichnete Front, also schneidet die Front ihn ab.
  Die Seite lag 41 Einheiten neben dem Mesh.
- **Die Probe (gebaut, zum Anfassen: `form.html?netz`):** Alle Umrisse zeichnet der Shader am Mesh, auch in der Seite. Deine
  Punkte sind Griffe auf dieser Linie. Die Ansicht, die du bearbeitest, führt. Die anderen zeigen danach das Mesh: Ihre Punkte
  bleiben, wo die Linie noch auf dem Mesh liegt, und nur dort, wo sich der Umriss geändert hat, kommen Punkte dazu.
- **Ergebnis:** In allen Ansichten liegt die Linie danach höchstens 1,5–3 Einheiten neben dem Mesh (vorher bis 41), also
  etwa eine halbe Rasterzelle. Nichts wandert von selbst weiter (fünf Durchläufe ohne Änderung: kein Punkt bewegt sich).
- **Kanten:** Zeichnen kann sie der Shader, aber finden kann er sie nicht. Eine weiche Linie (0 px) hinterlässt im Mesh
  keinen Knick, den man sehen könnte (≤ 10° gegen 105° bei 3 px). Kanten bleiben deshalb deine gespeicherten Linien
  (Absicht). Der Shader zeichnet sie auf dem Mesh, Strich nach Härte, wie heute schon in Front, Top und 3D.
- **Prognose:** Für das Problem „Linie und Mesh weichen ab“ ist das die elegante Lösung. Eine Regel ersetzt drei Dinge: die
  Trennung „gezeichnet/folgt“, die Kopplung äußerster Punkte und die Schnittmenge. Sie ist genau dein Satz vom 16.10.: „die
  schwarze Linie zeigt den Ist-Zustand, die bearbeitete Ansicht führt“. Die **Form** selbst macht sie nicht besser. Die
  Kerben, wo Teile zusammenstoßen, und die runden Füße zeigt sie nur ehrlich. Das ist ein eigener, nächster Hebel.

## 1. Warum das Mesh heute von der Linie abweicht

Der Körper ist die Vereinigung von Ellipsoiden. Jedes kommt von einem größten Kreis einer gezeichneten Fläche und muss in die
beiden anderen Ansichten passen (`dicht/gleich.ts`). Reicht ein Kreis der Seite über die gezeichnete Front hinaus, hat er
dort keinen Platz und fällt weg. Bei deinem Vierbeiner trifft das genau die großen Kreise des Kopfs: Der Kopf wird klein und
flach, und die gezeichnete Seitenlinie läuft weit über dem Mesh. Die Front lag zusätzlich 11 Einheiten neben dem Mesh, weil das
Top (es folgte dem runden Körper) hinten schmaler war als die gezeichneten Beine.

Nachgestellt aus dem Screenshot (Punkte abgelesen, `scripts/pruefen/form-netz-probe.mjs`), Bild
`docs/progress/editor/form-netz-heute-2026-11-04.jpg`.

## 2. Die Probe „Linien aus dem Netz“

**Regel (eine):** Die Ansicht, die du gerade bearbeitest, führt. Für jeden ihrer Kreise reden nur die Ansichten mit, die für
den ganzen Kreis Platz haben. Eine Ansicht ohne Platz sagt nichts, der Kreis wird dort so rund wie möglich. Danach zeigt sie,
was entstanden ist (`GleichOptionen.fuehrend`; ohne führende Ansicht baut der Kern bitgleich wie bisher).

**Nachführen:** Der echte Umriss jeder Ansicht kommt direkt aus dem Körper (Rand der Vereinigung der projizierten Ellipsen,
`dicht/silhouette.ts`). Die Linie einer mitgeführten Ansicht behält jeden Punkt, solange ihr Stück auf diesem Umriss liegt
(bitgleich). Wo nicht, setzt sie zwischen zwei Ankerpunkten neue Punkte auf den Umriss: erst dort, wo es am weitesten
danebenliegt, dann wieder ausgedünnt. Ecken des Umrisses werden Ecken (`dicht/folgen.ts`).

**Im Fenster** (`form.html?netz`): Seite, Front und Top zeigen nur noch die Shader-Linie mit deinen Punkten darauf. Front und
Top werden beim ersten Bau übernommen. Die alte Kopplung der äußersten Punkte ist aus, weil das Mesh das jetzt selbst tut.

Gemessen im Fenster mit der Maus (größter Abstand Linie ↔ Umriss des Meshes in Einheiten, Rasterzelle 4,76):

| Schritt | Seite | Front | Top | Punkte |
|---|---|---|---|---|
| heute (Schnittmenge) | **40,9** | 11,0 | 0,5 | – |
| Kopfpunkt der Seite gezogen (Seite führt) | 1,5 | 2,3 | 0,5 | Front: 6 neu, 6 behalten; Top unverändert |
| im Top eine Flosse 70 hinaus (Top führt) | 2,1 | 1,9 | 4,5 | Seite: alle 17 bitgleich; Front: 4 neu, 11 behalten |
| Kopf in der Seite 60 tiefer (Seite führt) | 3,2 | 2,1 | 1,6 | Front: 1 neu, 13 behalten (der Kopf geht zurück) |

Kernskript (`scripts/pruefen/form-netzlinien.ts`, gleiche Zahlen): Derselbe Stand neu gebaut ohne führende Ansicht zeigt
dasselbe (Seite 2,1, Front 1,7, Top 0,5). Fünf Runden „bauen und nachführen“ ohne Änderung setzen keinen einzigen Punkt neu.
Der Stand ist also stabil und hängt nicht davon ab, wer zuletzt geführt hat. Tests in `dicht/folgen.test.ts`: Kugel,
Richtung der halben Linien, bitgleich bei passendem Umriss, Kopf über der Front, bitgleich ohne Führung.

**Zeit:** Beim großen Vierbeiner dauert das Loslassen 1,3–1,5 s. Davon ist 1,0 s der Bau wie heute; Umrisse und Nachführen
kosten 0,2–0,4 s, noch ohne jede Beschleunigung. Während des Ziehens baut das Fenster grob wie bisher; die mitgeführten
Ansichten springen erst beim Loslassen.

Bilder: `docs/progress/editor/form-netz-{heute,seite-fuehrt,top-fuehrt,kopf-tiefer}-2026-11-04.jpg`.

**Ablauf aus der Startkugel** (`scripts/pruefen/form-netz-kugel.mjs`, Bild `form-netz-kugel-2026-11-04.jpg`):

1. Die Seite oben höher ziehen: Front und Top folgen wie bisher.
2. In der Front einen Punkt hinausziehen. Die Front führt; Seite (alle 4 Punkte bitgleich) und Top (7 neu, 2 behalten) werden
   nachgeführt. Abstand danach: Seite 1,3, Front 1,4, Top 2,0.
3. Im Top einen Punkt hineinziehen: Seite und Front bitgleich, Abstand 0,7 / 0,8 / 1,4.
4. ⌘Z: 1,3 / 0,2 / 1,2.

Die Linien stimmen also auch hier. Sichtbar wird aber die Form: Das Top wird ein abgerundetes Rechteck statt eines Ovals, und
die Schattierung ist fleckig. Das ist die Vereinigung vieler Ellipsoide, die die Linien jetzt ehrlich zeigen.

## 3. Shader statt Linien: was geht und was nicht

- **Umrisse:** Ja. Der Shader zeichnet genau das Mesh, pixelgenau. Griffe können aber nicht in einem Bild hängen, sie brauchen
  eine Linie. Die Probe holt sie als Vektor aus dem Körper; die Kurve durch die Griffe liegt höchstens eine halbe Rasterzelle
  neben der Shader-Linie (an runden Stellen deutlich weniger). „Zu ungenau“ ist es also nicht. Die Genauigkeit bestimmt das
  Raster des Meshes, nicht der Shader.
- **Kanten:** Teilweise. Eine harte Kante (3 px) ist im Mesh ein Knick von etwa 105° und wäre für einen Shader sichtbar; eine
  weiche (0 px) ist eine runde Wulst mit höchstens 10° und nicht von jeder anderen Rundung zu unterscheiden. Ein Shader, der
  Kanten selbst sucht, würde weiche Linien übersehen oder auf jeder Wölbung eine Linie malen. Richtig ist: Die Kante bleibt
  deine Linie mit Härte (Absicht), der Körper wird um sie herum gebaut, und der Shader zeichnet sie auf dem Mesh, gestrichelt
  bis 3 px schwarz. Für dich sieht das genauso aus wie „aus dem Netz“, ist aber stabil und greifbar.
- **Treffpunkte Umriss/Kante:** Machbar. Eine harte Kante macht im Umriss einen Knick, und das Nachführen setzt dort schon
  heute von selbst einen Eckpunkt (Ecken des Umrisses werden Ecken). Für weiche Kanten schneidet man ihre Linie in jeder
  Ansicht mit dem Umriss. Noch nicht gebaut, weil Kanten in gleichwertigen Ansichten den Körper noch nicht formen.

## 4. Recherche

**Linien aus dem Netz sind Stand der Technik:**
- Konturen, Kanten und Stoßpunkte lassen sich aus Netzen gewinnen. Für die Darstellung ist das gelöst, mit Breite nach
  Stärke, verdeckt und gestrichelt (Bénard & Hertzmann, „Line Drawings from 3D Models“, 2019, <https://arxiv.org/abs/1810.01175>;
  Blender Freestyle und Line Art: Kantenarten Silhouette, Crease nach Winkel und gespeicherte Edge Marks).
- Unser Shader ist das Rückseiten-Verfahren (Raskar & Cohen 1999): genau und mit konstanter Breite, aber nur Pixel, keine
  Kurve. Griffe brauchen eine Kurve, wie die Probe sie aus dem Körper holt.
- Weiche Wülste lassen sich nicht finden. Kammlinien brauchen hohe Ableitungen und finden jede Wölbung (Ohtake u. a. 2004).
  Pixar speichert die steuernden Linien deshalb auf der Fläche, statt sie zu extrahieren (de Goes u. a., „Character
  Articulation through Profile Curves“, 2022). Das passt zu „Kanten bleiben gespeicherte Linien“.

**Bearbeiten über den Umriss gibt es, aber immer nur in einer Ansicht:**
- Belege: Nealen u. a. 2005 (Laplace, das Gleiten des Umrisses bleibt unberücksichtigt), SilSketch 2007, Pixar „Silhouette
  Sketching on Inside Out“ 2015 (in Hunderten Einstellungen eingesetzt), FiberMesh 2007 (der gezeichnete Umriss bleibt als Griff
  auf der Fläche).
- Wer das Gleiten sauber löst (Kraevoy u. a. 2009, Cashman & Fitzgibbon 2013), braucht Minuten bis Stunden.
- Unsere Lage beschreibt Rivers u. a., „3D Modeling with Silhouettes“, 2010: Bei widersprüchlichen Silhouetten setzt sich die
  strengere durch. Das ist genau die heutige Schnittmenge. ZBrush ShadowBox macht es ebenso.

**Nicht gefunden:** ein System, in dem drei gekoppelte Orthoansichten den echten Umriss mit dauerhaften Griffen zeigen und eine
Regel sagt, welche Ansicht beim Ziehen nachgibt. Auch kein Werkzeug am Markt ändert die Form über Griffe am Umriss (Plasticity,
Inventor, Project Neo, Spline, Womp, Gravity Sketch, Nomad). Die Probe ist in dieser Form neu.

**Stabile Griffe:** Linien, die bei jedem Bau neu gefittet werden, springen; ihre Punktzahl und Ecken hängen an Schwellen (Potrace
2003, Schneider 1990, Illustrator Image Trace). Abhilfe aus der Forschung zu Strichen: die Linien weiterführen statt neu fitten
(Kalnins u. a. 2003, Bénard u. a., „Active Strokes“, 2012). Genau das tut das Nachführen: Punkte, deren Stück noch passt, bleiben
bitgleich.

**Risiken aus der Recherche, mit unserem Stand:**
1. „Die Abweichung wandert nur: Griff ≠ Mauszeiger, weil der Umriss gleitet“: Bei uns ist die bearbeitete Ansicht selbst die
   Eingabe; ihr Umriss liegt auf ihrer Linie (gemessen 1,3–3,2 Einheiten). Der Griff bleibt unter dem Zeiger.
2. „Ansichten teilen Maße, ein Zug ändert die anderen“: gewollt, und die Regel sagt, wer nachgibt.
3. „Griffe entstehen und verschwinden, wenn sich die Topologie ändert“: offen. Die Probe nimmt je Ansicht nur den größten
   Umriss; ein abgetrenntes Stück oder ein Loch hat noch keine Griffe.
4. „Weiche Kanten lassen sich nicht extrahieren“: bestätigt, deshalb gespeicherte Linien.
5. „Surface Nets vernetzt jedes Mal neu, also gehen keine vorab gerechneten Löser; Griffe besser auf die wenigen Formgrößen
   abbilden“: So ist es gebaut. Die Griffe sind die Zeichnungen, aus denen der Körper entsteht.

## 5. Ehrliche Prognose

**Geht es?** Für die Umrisse ja, das ist jetzt gezeigt: im Fenster, mit der Maus, an deinem Wesen. Für Kanten mit derselben
Logik, aber als gespeicherte Linien, die der Shader zeichnet, nicht als Linien, die der Shader findet.

**Ist es die elegante Lösung?** Für „Linie und Mesh weichen ab“: ja. Widersprüche zwischen den Ansichten kann es nicht mehr
geben, weil keine Ansicht etwas anderes zeigt als das Mesh. Statt Schnittmenge, Kopplung und „gezeichnet oder folgt“ gibt es
eine Regel. Nichts davon nennt einen Körperteil oder eine Lage. Laut Recherche hat das in dieser Form noch niemand gebaut. Die
Bausteine (Linien aus dem Netz, Bearbeiten am Umriss, weitergeführte statt neu gefittete Linien) sind aber jeder für sich
erprobt.

**Was es nicht löst, ehrlich:**

1. **Form — das größere Restproblem.** Der Körper ist eine Vereinigung vieler Ellipsoide. Das wird sichtbar:
   - Wo Teile aus verschiedenen Ansichten zusammenstoßen, entstehen Kerben (im Top bei der Flosse, dazu kleine
     Shader-Kratzer).
   - Wenn Front und Seite verschieden breit sind, wird das Top kastig statt oval (Bild Startkugel).
   - Die Schattierung ist fleckig.
   - Eckige Füße, die Seite und Front beide eckig zeigen, werden im Mesh rund.

   Bisher versteckte die gezeichnete Linie einen Teil davon, jetzt zeigt die Linie es. „So rund wie möglich“ heißt: die
   rundeste Fläche, die alle Umrisse berührt, nicht die Vereinigung von Ellipsoiden. Der nächste Hebel ist eine Form, die über
   die Ellipsoide hinweg glatt ist (weiche Vereinigung oder Glätten mit festgehaltenen Umrissen), dazu Ecken als Kanten im
   Bau. Die Linien aus dem Netz bleiben dabei, wie sie sind: Sie zeigen dann eben die bessere Form.
2. **Automatische Punkte.** Wo eine andere Ansicht den Umriss ändert, setzt die Automatik Punkte, im Beispiel 6 für den Kopf
   in der Front. Am 11.10. mochtest du Punkte, die sich von selbst setzen, nicht; am 16.10. hast du sie erlaubt, „wenn wirklich
   notwendig“. Hier sind sie nötig, aber ihre Lage ist Geschmackssache. Das solltest du im Fenster ansehen.
3. **Kanten in gleichwertigen Ansichten.** Sie formen den Körper noch nicht, sobald Front oder Top gezeichnet ist. Das ist
   die Voraussetzung für die Treffpunkte.
4. **Innere Linien.** Sie stehen innerhalb des Umrisses, etwa der Kopf vor dem Körper in der Front (Bild „kopf-tiefer“). Der
   Shader zeichnet sie schon. Griffe darauf brauchen die Herkunft (welche Fläche welcher Ansicht) und sind ein eigener
   Schritt.
5. **Zeit.** Das Nachführen lässt sich etwa zehnfach beschleunigen (Raster statt Suche über alle Strecken); der Bau selbst
   bleibt, wie er ist.

**Nachtrag (04.11. abends), Florians nächster Screenshot:** Kugel unter dem Kopf abgelöst, Naht im Top, Zacken in der Front.
Seine Fragen: „Also müssen wir eine Seite zur vorgebenden Form machen? … Ich bin mir nicht sicher, ob Front und Top überhaupt
den Umriss zeigen müssen. Der Umriss soll mit Shader eingezeichnet sein, aber die echten Bearbeitungspunkte sollten auf den
weichen bzw. harten Kanten liegen … Es geht irgendwie wieder darum, aus drei Formen eine Form zu erzwingen. Aber wir wollen ja
direkt die Form in den Ansichten bearbeiten, nur die Darstellung ist eine andere.“

Gemessen am nachgestellten Fall (Punkte aus dem Screenshot, Abstand Linie ↔ Mesh): heute Seite 74,5 / Front 66,0 / Top 3,1;
Seite führt: Seite 2,7, aber die Front bleibt 66,0 daneben; **Front führt: unverändert 66,0.** Die Regel „wer keinen Platz hat,
redet nicht mit“ greift nur, wo eine Ansicht gar nichts zeigt; hier zeigt das Top etwas, nur schmal. Für diesen Fall bräuchte es
die nächste Regel. Das ist genau das Muster, das Florian sieht: Solange drei gezeichnete Flächen den Körper bestimmen, ist jede
Widerspruchsregel ein Flicken.

Sein Modell ist ein anderes: **eine Form, Linien auf ihr als Griffe, die Ansichten zeigen sie.** Jeder Linienpunkt ist ein
3D-Punkt; jede Ansicht bewegt zwei seiner drei Koordinaten (so arbeiten die Linien seit 8d8bae88 schon). Der Umriss ist nur
Anzeige (Shader). Damit gibt es nichts zu erzwingen und keine Widersprüche. Vorlage: FiberMesh (Nealen u. a. 2007; Linien auf der
Fläche sind die Griffe, die Fläche ist die glatteste durch sie, weich oder scharf), Pixar-Profilkurven (de Goes u. a. 2022).
Was dazu gehört und noch fehlt:

1. Linien allein machen kein Volumen. Eine gezeichnete Fläche legt einmal Volumen an (wie heute die Seite, später auch ein Bein
   in der Front); danach ist sie keine Bedingung mehr, ihr Umriss wird eine Linie auf der Form.
2. Wo der Umriss keine Linie hat, legt das Anfassen der Shader-Linie dort eine weiche Linie auf die Form.
3. Der Kern: die rundeste Fläche durch alle Linien, auch wenn eine Linie die Form nach innen zieht (heute wächst die Form nur
   zu Linien hin).

**Empfehlung (vor dem Nachtrag):** Probier `?netz` an deinen eigenen Wesen aus. Wenn es sich richtig anfühlt, wird es der normale Weg im Fenster.
Danach kommt, was du siehst: entweder die Form (weiche Übergänge, Ecken) oder die Kanten in gleichwertigen Ansichten samt
Treffpunkten.
