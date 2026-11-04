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

(folgt aus der Recherche-Session, siehe unten)

## 5. Ehrliche Prognose

**Geht es?** Für die Umrisse ja, das ist jetzt gezeigt: im Fenster, mit der Maus, an deinem Wesen. Für Kanten mit derselben
Logik, aber als gespeicherte Linien, die der Shader zeichnet, nicht als Linien, die der Shader findet.

**Ist es die elegante Lösung?** Für „Linie und Mesh weichen ab“: ja. Widersprüche zwischen den Ansichten kann es nicht mehr
geben, weil keine Ansicht etwas anderes zeigt als das Mesh. Statt Schnittmenge, Kopplung und „gezeichnet oder folgt“ gibt es
eine Regel. Nichts davon nennt einen Körperteil oder eine Lage.

**Was es nicht löst, ehrlich:**

1. **Form.** Wo Teile aus verschiedenen Ansichten zusammenstoßen, hat die Vereinigung Kerben: im Top bei der Flosse
   sichtbar, dazu kleine Shader-Kratzer. Eckige Füße, die Seite und Front beide eckig zeigen, werden im Mesh rund. Bisher
   versteckte die gezeichnete Linie das, jetzt zeigt die Linie es. Der nächste Hebel ist eine weiche Vereinigung, also runde
   Übergänge statt Kerben, und Ecken als Kanten im Bau.
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

**Empfehlung:** Probier `?netz` an deinen eigenen Wesen aus. Wenn es sich richtig anfühlt, wird es der normale Weg im Fenster.
Danach kommt, was du siehst: entweder die Form (weiche Übergänge, Ecken) oder die Kanten in gleichwertigen Ansichten samt
Treffpunkten.
