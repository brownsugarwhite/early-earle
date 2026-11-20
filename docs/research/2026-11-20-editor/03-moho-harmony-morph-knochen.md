# Morph und Knochen zusammen: Moho, Toon Boom Harmony, Animate, Synfig, OpenToonz

Recherche für den Figureneditor („Studio“), Thema 03, Stand 20.11.2026.

Fragen: Wie spielen Formmorph und Knochen in den großen 2D-Programmen zusammen? In welcher Reihenfolge wird verformt? Wie
hängen Korrekturformen an Knochenwinkeln (Pose Space Deformation im 2D)? Was ist an Mohos Smart Bones mächtig, was mühsam? Und
was folgt daraus für das Zusammenspiel von Vektormorph und Knochen in unserem Editor?

**Methode und Grenzen.** Gelesen habe ich die Handbücher von Toon Boom Harmony 22 Premium, Adobe Animate, Synfig 1.5 und
OpenToonz, die Ankündigungen von Lost Marble zu Moho 12 bis 14.4, die Moho-Skriptreferenz, Quelltext (OpenToonz, Rive-Laufzeit)
und die Fachartikel zu Pose Space Deformation (2000) und Bounded Biharmonic Weights (2011). Nutzerstimmen aus dem Lost-Marble-Forum
konnte ich nur als Suchauszüge lesen, weil das Forum automatische Abrufe nicht durchlässt; sie sind im Text als Forenauszug
markiert. Das Moho-Handbuch (21 MB) war für den Abruf zu groß. Mitten in der Arbeit war das Suchbudget dieses Laufs aufgebraucht;
die genaue Mechanik der Smart Bones (welcher Winkel welches Bild einer Aktion abspielt) stützt sich deshalb auf Tutorials,
Forenauszüge und eigene Kenntnis und ist so gekennzeichnet. Wo ich selbst rechne oder ableite, steht das dabei.

---

## Kurzfassung

1. **Alle fünf Programme trennen Formänderung und Knochen in zwei Systeme.** Nur Moho verbindet sie direkt (Smart Bones), Harmony
   indirekt (Master Controller, über Skripte und lineare Posen), Animate, Synfig und OpenToonz gar nicht.
2. **Die bewährte Reihenfolge:** erst die Knochenpose bestimmen, dann die Form in ihrer Ruhe ändern (Morph und Korrekturen), zuletzt
   verformen die Knochen das Ergebnis. So arbeiten Mohos Smart Bones (sie ändern Werte der Vektorebene, die danach von den Knochen
   verformt wird) und die Pose Space Deformation (Versätze im örtlichen Rahmen, vor dem Skinning).
3. **Smart Bones sind eine eindimensionale Pose Space Deformation:** Ein Knochenwinkel spielt eine Aktion ab. Mächtig, weil die
   Korrektur bei jedem Winkel von selbst kommt und weil sie fast jede Eigenschaft steuern. Mühsam, weil die Zuordnung unsichtbar ist,
   nur die Drehung treibt, mehrere Smart Bones um dieselben Punkte streiten und der Spielexport sie zu gebackenen Morph-Zielen macht.
4. **Harmony hat die besten Reglerideen** (Schieber, 2D-Punkt über einem Raster aus Posen, Stapel aus Rastern), aber die Zwischenposen
   sind linear, alles jenseits der Assistenten ist Skript, und Morphing zwischen Zeichnungen ist vom Spielexport ausgeschlossen.
5. **Automatische Zuordnung beim Morph ist unberechenbar** (Harmony nach Nähe und Farbe, Animate mit Hinweisen a bis z). Robust ist,
   was Moho, Synfig und unser Prototyp tun: dieselben Anker in jeder Form.
6. **Netz-Verformer biegen schön, kosten aber die Vektorgenauigkeit** (OpenToonz rastert Vektorzeichnungen, bevor das Netz sie biegt).
   Für Florians exakte Formen gehört die Verformung auf Anker und Griffe.
7. **Gewichte auf einzelne Griffe sind erprobt:** Die Rive-Laufzeit gewichtet Ein- und Ausgangsgriff jedes Ankers getrennt. Damit ein
   glatter Anker glatt bleibt, müssen seine beiden Griffe dieselbe Abbildung bekommen (eigene Ableitung).
8. **Lineares Mischen der Knochen (LBS) ist Standard aller Laufzeiten,** schrumpft aber am Gelenk (bei 90° und halben Gewichten auf
   rund 71 %). Korrekturformen am Gelenkwinkel oder das Mischen der Drehwinkel beheben das.
9. **Empfehlung:** ein einziger Mechanismus „Formschlüssel am Regler“. Ein Regler ist ein Knochenwinkel, ein freier Schieber (1D oder
   2D), der Fortschritt eines Übergangs, ein Physik- oder ein Spielwert. Geformt wird in der Pose, gespeichert als Versatz in der Ruhe.
   Streitende Korrekturen löst ein Kreuzschlüssel, kein Skript.

---

## 1. Zwei Arten, eine Form zu ändern

- **Morph (Formschlüssel):** Eine Form hat an bestimmten Stellen eine gezeichnete Gestalt; dazwischen wird gemischt. Gut für alles, was
  die Zeichnung selbst ändert: Ansicht drehen, Ausdruck, Verkürzung, Quetschen. Voraussetzung: Die Anker der Schlüssel entsprechen
  einander.
- **Knochen (Skinning):** Ein Gerüst aus Knochen bewegt die Anker, jeder Anker folgt den Knochen nach seinen Gewichten. Gut für alles,
  was sich als Drehung und Verschiebung erklärt: Beine, Kopf neigen, Schwanz schwingen. Schwäche: Knochen biegen die Form nur so gut,
  wie lineares Mischen es zulässt (Abschnitt 7.1).
- **Korrektur:** Ein Formschlüssel, der nicht von der Zeit, sondern von einer Knochenstellung abhängt, etwa „so sieht das Knie bei 90°
  aus“. Damit wird der Morph zur Reparatur der Knochen. Das ist der Kern des Themas.

Die Spannung zwischen beiden: Knochen geben Bewegung, Morph gibt Gestalt. Ein Editor, der „die weichsten Vektormorphs und
Posenübergänge“ liefern soll, muss beide in einer festen Reihenfolge verrechnen und dem Zeichner eine einzige Art geben, sie zu
bearbeiten.

---

## 2. Moho (Lost Marble, früher Anime Studio)

### 2.1 Vektorknochen und Bindung

- Eine **Knochenebene** ist eine Gruppe mit einem Skelett. Die Knochen sind unsichtbar und wirken auf die Ebenen darunter. Jeder Knochen
  hat einen einstellbaren Einflussbereich. Bewegen sich die Knochen, bewegen sich die Kurvenpunkte mit, und die Kurven laufen glatt
  durch die Punkte an ihrer neuen Lage ([Handbuch: Bone Layers](https://www.lostmarble.com/moho/manual/bone_layers.html)). Moho hatte
  ursprünglich keine Bézier-Griffe, sondern eine **Krümmung je Punkt**; die Kurve wird aus den Punkten neu gerechnet (Smart Bones steuern
  diese Krümmung bis heute als eigenen Wert). Bézier-Griffe an Punkten nennt die Ankündigung von Moho 12 (2016) als neu
  ([Moho 12](https://80.lv/articles/smith-micro-software-releases-moho-pro-12)); die „Bézier handles“ von Anime Studio 9 (2012) gehören
  wohl zu den Bewegungskurven. Wie Griffe unter Knochen behandelt werden, beschreibt keine der gelesenen Quellen.
- **Bindungsarten** ([Handbuch: Tutorial 3.1](https://www.lostmarble.com/moho/manual/tut03/01)):
  - *Flexibel* (Standard): Jeder Knochen wirkt auf jeden Punkt, schwächer mit dem Abstand. Folge: Ferne Teile zucken leicht mit.
  - *Bereich*: Jeder Knochen hat einen Abschneideradius (Werkzeug „Bone Strength“). Ein Punkt folgt den Knochen, in deren Bereich er
    liegt; liegt er in keinem, dem nächsten.
  - *Punktbindung*: Punkte hängen hart an einem Knochen. Laut Handbuch vor allem aus Gründen der Kompatibilität da; am Ellbogen dehnt
    und verzerrt sich die Form, und sie verformt keine Bilder.
  - *Ebenenbindung*: Eine ganze Ebene hängt starr an einem Knochen (Mundformen am Kopf, Requisit in der Hand).
  Forenauszüge zeigen, dass die Begriffe verwirren (flexibel gegen direkt, Stärke wirkt nur mit Bindung).
- **Moho 12** brachte Pin Bones (ein Knochen, der nur einen Punkt steuert), Squash-and-Stretch-Skalierung, „Independent Angle“ (fester
  Weltwinkel, etwa für Füße), Zielknochen und einen neuen IK-Löser
  ([Moho 12](https://80.lv/articles/smith-micro-software-releases-moho-pro-12)).

### 2.2 Smart Bones

**Mechanik** (nach Tutorials und Forenauszügen, im Handbuch nicht nachgelesen): Für einen Knochen legt man eine Aktion mit genau
seinem Namen an. In dieser Aktion ist Bild 0 die Ruhe; an einem späteren Bild dreht man den Knochen und formt, was bei diesem Winkel
gelten soll, auf Wunsch auch an mehreren Bildern mit Zwischenwinkeln. Beim Animieren liest Moho den Winkel des Knochens und wertet die
Aktion an der Stelle aus, an der sie diesen Winkel hat; dazwischen wird nach den Kurven der Aktion gemischt. Für die Gegenrichtung
braucht es eine zweite Aktion, die Moho mit angehängter 2 benennt (Forenauszug). Das Verfahren erschien 2012 mit Anime Studio Pro 9.

**Was Smart Bones steuern können** (Anime Studio 9.2 und 9.3,
[Smart Bones](https://www.animestudiotutor.com/bones/smart_bones/),
[Erweiterungen 9.3](https://www.animestudiotutor.com/past/smart_bones_enhancements/)):
- an Vektorebenen unter der Knochenebene: Punktbewegung, Krümmung, Linienbreite, Füll- und Strichfarbe;
- an jeder Ebene: Verschiebung, Größe, Drehung, Scherung, Deckkraft, Unschärfe;
- an der eigenen Knochenebene: Lage, Größe und Drehung anderer Knochen;
- seit 9.3: Switch-Ebenen, Ebenenreihenfolge, Sichtbarkeit, Pfadfolgen, Spiegeln, Strichanteil, Parameter von Formeffekten (etwa
  Verlaufsfarben).

**Smart-Bone-Regler („Dials“):** Knochen außerhalb der Figur, mit Winkelgrenzen, dienen als Hebel für Gesicht, Kopf- und Körperdrehung.
Lost Marble wirbt genau damit: ein Hebel bewegt viele verbundene Teile ([Funktionen](https://moho.lostmarble.com/pages/features)).
Ein Forenauszug beschreibt, wie eine Smart-Bone-Aktion Gesicht und Kopfform von vorn nach 3/4 morpht und dabei Zähne und Zunge für die
Tiefe verschiebt ([Forum, 2.5D-Kopf](https://www.lostmarble.com/forum/viewtopic.php?p=155510)).

**Moho 14.4 „Side Quest“ (2025)**
([Ankündigung](https://moho.lostmarble.com/blogs/news/free-update-export-to-video-game-engines-with-the-moho-14-4-side-quest)):
- **360°-Smart-Bones:** Dreht man den Knochen in der Aktion um genau 360°, gilt sie für eine ganze Umdrehung; man legt fest, wie die
  Zeichnung bei jedem Winkel aussieht. Ein Beispiel steuert damit das Tempo eines ganzen Gehzyklus.
- **glTF-Export für Spiele:** Skelett, Hauptanimation, Aktionen, dynamische Knochen und Smart Bones bleiben erhalten. Smart Bones werden
  dabei zu **Morph-Zielen** (Shape Keys), aber nur, wenn sie Knochen bewegen oder eine Warp-Ebene über einer Zeichnung verformen.
  Punktanimation einer Warp-Ebene wird nur exportiert, wenn sie in einer Aktion liegt. Nicht alle Funktionen werden unterstützt.
  Schluss daraus (eigene Ableitung): Im Spiel hängt das Morph-Ziel nicht mehr am Knochenwinkel; es wird zur Gewichtskurve einer
  Aktion. Bewegt eine Physik im Spiel den Knochen, folgt die Korrektur nicht.

**Nutzerstimmen** (Forenauszüge und ein Artikel):
- Smart Bones gelten als Mischung aus Korrekturformen und getriebenen Schlüsseln, vergleichbar der Pose Space Deformation aus 3D
  ([Lester Banks](https://lesterbanks.com/2016/11/working-mohos-smart-bone-actions/)).
- Gelobt: Eine Bewegung über einen Regler ist auf der Hauptzeitleiste nur ein Schlüssel; Zeit und Mischkurve lassen sich frei ändern,
  auch als Bézier.
- Nur die **Drehung** treibt; Lage oder Größe eines anderen Knochens muss man über Umwege in eine Drehung übersetzen
  ([Forum](https://www.lostmarble.com/forum/viewtopic.php?p=216824)). Smart Bones dürfen andere Knochen drehen, skalieren und verschieben
  ([Forum](https://www.lostmarble.com/forum/viewtopic.php?p=171792)).
- **Verschachtelung bricht:** Ein Nutzer meldet, dass zwei Ebenen von Smart Bones, die andere Smart Bones drehen, funktionieren, drei
  nicht; Aktionen mit mehreren Knochen haben Nebenwirkungen auf andere Bewegungen.
- **Streit:** Mehrere Smart Bones, die dieselben Punkte bewegen, „kämpfen“ miteinander; es gibt ein Skript und für Moho 14.4 ein
  eigenes Tutorial zu widerstreitenden Smart Bones.
- **Skripte** lesen bei einem Knochen, der von einem Smart Bone gesteuert wird, nicht den wirklichen Winkel; die Antwort im Forum war:
  backen ([Forum](https://www.lostmarble.com/forum/viewtopic.php?p=215518)).
- Mahnung erfahrener Nutzer: vor jedem ausgefeilten Aufbau fragen, ob er das Animieren wirklich schneller macht.

### 2.3 Smart Warp, Curver, Liquid Shapes

- **Smart Warp** (Moho 12): ein eigenes Netz, das Zeichnungen und Bilder verformt; man formt das Netz, die Zeichnung folgt. Das Netz
  kann an Knochen hängen, so trägt es deren Verformung weiter
  ([Moho 12](https://80.lv/articles/smith-micro-software-releases-moho-pro-12)). Ein Forenauszug aus Moho 14: Smart Warp verformt keine
  Vektorebene, deren Punkte selbst an Knochen gebunden sind; man bindet stattdessen das Netz
  ([Forum](https://www.lostmarble.com/forum/viewtopic.php?p=214311)). Kopfdrehungen über ein Smart-Warp-Netz sind ein gängiges
  Lehrbeispiel.
- **Curver** (Moho 14): biegen Vektoren und Bilder entlang einer Kurve, mehrere je Ebene, an Knochen oder Smart Bones gehängt, mit
  animierbarer Linienbreite; gedacht für Schwänze, Haare, Tentakel ([Funktionen](https://moho.lostmarble.com/pages/features)).
- **Liquid Shapes** (Moho 14): weiche Formen, die sich in Echtzeit vereinigen, abziehen, schneiden und ineinander verlaufen; gedacht für
  Feuer, Rauch, Wasser ([Moho 14](https://moho.lostmarble.com/blogs/news/moho-14-the-future-is-2d),
  [Funktionen](https://moho.lostmarble.com/pages/features)). Das ist dieselbe Richtung wie unser Verschmelzen über Abstandsfelder.

### 2.4 Dynamik und Physik

- **Knochendynamik:** Seit Moho 14 getrennt für Drehung, Lage und Größe, je mit Feder, Dämpfung und Drehmoment; dazu Wind seit 13.5
  ([Skriptreferenz M_Bone](https://mohoscripting.com/classes/M_Bone)). Gewicht und Schwerkraft je Knochen bestimmen Nachschwingen und
  Überlappen ([Funktionen](https://moho.lostmarble.com/pages/features)).
- **Steuerknochen mit Verzögerung** (Moho 14, „Delayed Constraints“): Ein Knochen folgt Winkel, Lage oder Größe eines anderen mit
  Faktor und Verzögerung in Bildern (Felder `fAngleControlParent`, `fAngleControlScale`, `fAngleControlDelay`).
- Eine Physik-Engine lässt Ebenen beim Abspielen fallen und abprallen.

### 2.5 Switch-Ebenen, Vitruvian Bones, Patch-Ebenen

- **Switch-Ebenen** tauschen Zeichnungen (Mundformen, Hände); Smart Bones können sie seit 9.3 schalten.
- **Vitruvian Bones** (13.5): mehrere Knochensätze in einer Ebene, jeder mit eigener Zeichnung, umschaltbar, etwa für andere Ansichten
  eines Kopfs oder Glieds in Verkürzung ([Moho 13.5](https://moho.lostmarble.com/blogs/news/moho-pro-13-5-new-features)).
- **Patch-Ebenen** decken die Naht ab, wo zwei Teile sich am Gelenk überlappen (in den gelesenen Quellen nicht beschrieben; aus der
  Praxis bekannt).

### 2.6 Reihenfolge der Verformung in Moho

1. Werte der Vektorebene: Punktbewegung der Hauptzeitleiste plus alles, was Smart-Bone-Aktionen an Punkten, Krümmung, Breite und Farbe
   ändern. Diese Werte liegen in der Ruhe der Ebene.
2. Knochen verformen die Punkte (flexibel, Bereich, Punkt- oder Ebenenbindung); die Kurven laufen glatt durch die neuen Lagen.
3. Optional verformt ein Smart-Warp-Netz oder ein Curver die Zeichnung; beide können selbst an Knochen hängen.
4. Ebenentransformation, dann Zeichnen (Patch-Ebenen, Liquid Shapes).

Darüber liegt eine Steuerkette: Knochenwinkel → Smart-Bone-Aktion → andere Knochen → weitere Aktionen. Ihre Tiefe ist nach den
Forenauszügen praktisch begrenzt.

### 2.7 Bewertung

| Stärke | Schwäche |
|---|---|
| Korrektur kommt bei jedem Winkel von selbst, auch unter IK und Dynamik | Zuordnung unsichtbar (Aktion mit Knochennamen, Winkel in der Aktion) |
| Fast jede Eigenschaft steuerbar (Punkte, Farbe, Reihenfolge, Tausch) | Nur Drehung treibt; Gegenrichtung braucht eine zweite Aktion |
| Ein Hebel für komplexe Bewegungen (Kopfdrehung, Gesicht) | Mehrere Smart Bones auf denselben Punkten streiten; Verschachtelung bricht |
| Vektoren bleiben Vektoren; Kurven laufen glatt durch bewegte Punkte | Spielexport backt Smart Bones zu Morph-Zielen, Bedingungen gelten |
| Dynamik je Kanal, Verzögerung, Curver, Liquid Shapes | Viele Bindungsarten mit verwirrenden Namen; Smart Warp und Punktbindung vertragen sich nicht |

---

## 3. Toon Boom Harmony

### 3.1 Verformer

Harmony baut Verformungen als Ketten aus Knoten. Das Rigging-Werkzeug zeigt die Steuerung rot (Aufbau, Ruhelage), das
Transform-Werkzeug grün (Animation). Jede Kette hat eine **Ruhelage** und eine **animierte Lage**; man kann jederzeit zur Ruhe zurück
([Verformungen](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-deformation.html),
[Ruhe und Animation](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-rest-position-set.html),
[Animieren](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-deformation-animation.html)).

| Verformer | Mechanik | Gedacht für |
|---|---|---|
| **Bone** | Starre Teile mit biegsamen Gelenken; Gelenkradius, Neigung (Bias), Einflusszone | Arme, Beine, Finger aus einer Zeichnung ([Bone](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-bone-deformation.html)) |
| **Game Bone** | wie Bone, ohne Bias und Einflusszone (unendlich), Falten etwas runder; im Spiel lineares Skinning | Export nach Unity ([Game Bone](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-game-bone-deformation.html)) |
| **Curve** | Bézier-Kurve mit Griffen; die Zeichnung verformt sich auf ganzer Länge; der erste Punkt verschiebt alle anderen | Haare, Mund, Brauen, Gummischlauch-Arme ([Curve](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-curve-deformation.html)) |
| **Envelope** | geschlossene Kurve um die Zeichnung, alle Punkte frei; biegt die Konturen, eine Textur im Inneren wird nicht mitverzerrt | Haare, Umhang, Kinn; Drehen ohne Zeichnungstausch ([Envelope](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-envelope-deformation.html)) |
| **Free Form** | Punkte überall, auch im Inneren; verzerrt auch die Textur | texturierte, komplexe Zeichnungen ([Free Form](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-free-form-deformation.html)) |
| **Weighted Deform** | mischt mehrere Quellen (Bones, Curves, Pegs als freie Punkte) nach dem Abstand; Qualität vor Tempo, reißt weniger | Haare mit Volumen, Texturen ([Weighted](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-weighted-deformations.html)) |

**Einflusszonen:** Radius, quer und längs zum Knochen, als Ellipse oder geformt
([Zonen](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-region-influence.html)). Game Bones haben keine.

### 3.2 Zusammensetzen

- **Verformer wirken nebeneinander, nicht aufeinander.** Hängt man einen Verformer unter einen anderen, verformen beide die Zeichnung je
  für sich; der obere bewegt die Punkte des unteren nicht. Dafür gibt es den Assistenten „Deformer on Deformer“: Er wandelt eine
  Kurvenkette in einen Master Controller, der die Punkte einer Hülle (Envelope) bewegt, die dann die Zeichnung verformt
  ([Deformer on Deformer](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-deformer-on-deformer.html)).
- **Weighted Deform als Sammelknoten:** Kurvenketten, eine Hülle und freie Punkte (Pegs) an einem Knoten; die Hülle kann eine Zone
  abgrenzen, in der freie Punkte nicht wirken
  ([Kombinieren](https://docs.toonboom.com/help/harmony-22/premium/deformation/use-weighted-deform-combined.html)).
- **Kinematic Output** hängt eine Zeichnung starr an einen Punkt der Kette; **Point Kinematic Output** tastet bis zu drei Stellen auf
  einer Kurve ab (folgen, drehen, skalieren). Eine Kette ohne Zeichnung wird so zur Steuerung für viele Teile (Kettenglieder)
  ([Point Kinematic](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-point-kinematic-output.html),
  [als Steuerung](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-using-deformers-as-controllers.html)).
- **Mehrfach-Pose-Rigs:** Je Ansicht eine eigene Kette in einer Untergruppe, ein Transformation-Switch wählt die Kette nach dem Namen
  der gezeigten Zeichnung ([Aufbau](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-structure-multi-pose-deformation-rig.html)).

### 3.3 Master Controller: Regler über Posen

Master Controller sind Knoten, die eigene Griffe auf der Bühne erzeugen (Schieber, 2D-Punkt, Knopf, Kästchen, Drehkreise, Pfeile) und
damit beliebige Werte der Szene setzen. Gebaut werden sie über die Skriptschnittstelle; für die häufigen Fälle gibt es Assistenten
([Master Controller](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-master-controller.html),
[Assistenten](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-master-controller-wizards.html)):

- **Slider:** speichert eine Reihe von Posen (aus aufeinanderfolgenden Bildern der Zeitleiste) und mischt zwischen zwei benachbarten.
  Die Zwischenposen entstehen durch „simple linear interpolation“; das Handbuch rät deshalb zu Zwischenposen, etwa bei 45° zwischen
  links und rechts, weil die Mitte sonst nicht stimmt. Posen müssen „interpolierbar“ sein: dieselben Ebenen und Zeichnungen, Unterschiede
  nur über Verformer und Transformationen
  ([Posen vorbereiten](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-poses-slider-wizard.html),
  [Slider](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-slider-wizard.html)).
- **Grid:** ein 2D-Punkt über einem rechteckigen Raster aus Posen; er mischt zwischen den nächsten Posen. Jede Reihe braucht gleich viele
  Posen, jede Pose wird von Hand einem Rasterpunkt zugeordnet; Mitte und Zellgröße stellt man in Feldern ein, damit der Punkt dort liegt,
  wo er wirkt (Nase, Handgelenk). Vorschlag des Handbuchs: Posen bei 0°, 45° und 90°
  ([Grid](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-grid-wizard.html),
  [Posen fürs Raster](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-poses-grid-wizard.html)).
- **Stack:** mehrere Raster übereinander; ein Schieber wählt das Raster (etwa die Mundform), der 2D-Punkt die Pose darin. Es gilt immer
  nur ein Raster, zwischen Rastern wird nicht gemischt.
- **Function:** einfache Schalter für Sichtbarkeit und Werte; alles Weitere ist Skript.

Ein Master Controller speichert die Posen in einer Datenbank im Szenenordner; zu viele gespeicherte Bilder machen ihn schwer und träge.

### 3.4 Morphing mit Hinweisen

Harmony erzeugt Zwischenzeichnungen zwischen zwei Vektor-Schlüsselzeichnungen
([Morphing](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morphing.html)). Mechanik und Regeln:
- Ohne Hilfe ordnet Harmony eine Ecke der nächsten Ecke der Zielzeichnung zu und eine Farbfläche der nächsten ähnlichen Fläche mit
  derselben Farbe ([Regel der nächsten Form](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-closest-similar-shape-rule.html)).
- **Hinweise** korrigieren das: Konturhinweise (Lage und Dicke einer Kontur), Zonenhinweise (welche Fläche zu welcher wird),
  Bleistifthinweise (Mittellinien), Verschwindehinweise (wohin eine Form verschwindet)
  ([Hinweise](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morph-hint.html),
  [Kontur](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-contour-hint.html),
  [Zone](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-zone-hint.html),
  [Verschwinden](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-vanishing-point-hint.html)).
- Jede Morph-Sequenz hat ihre eigenen Hinweise: Zeichnung 2 trägt einen Satz für den Weg von 1 nach 2 und einen anderen für 2 nach 3.
- Regeln: nur Vektoren; gleiche Farbfelder (gleiche Farbkennung); ähnliche Formen brauchen gleich viele Flächen; liegt eine Fläche in
  der Quelle innen und im Ziel außen (die Nase beim Drehen zur Seite), scheitert der Morph
  ([Regeln](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morph-rule.html)).
- Tempo über eine Funktionskurve (ein- und ausbremsen, rückwärts)
  ([Tempo](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morph-velocity-time.html)).
- Das Handbuch selbst sieht den Morph für einfache, ähnliche Formen (Rauch, Wasser, Haar) und rät: Dauert das Morphen länger als das
  Zeichnen, lieber zeichnen.

### 3.5 Federn und Gelenknähte

- **Dynamic Spring:** Ein Knoten nimmt die Bewegung seines Elternteils und fügt Spannung und Trägheit hinzu (Überschwingen,
  Nachziehen). Weil er die ganze Elternkette sieht, löst sich eine Hand vom Arm; dagegen lässt man die Eltern ab einer Stufe außer Acht
  ([Dynamic Spring](https://docs.toonboom.com/help/harmony-22/premium/reference/node/constraint/dynamic-spring-node.html)). Mit
  Weighted Deform und Pegs als freien Punkten bekommt jeder Punkt eines Haarschopfs sein eigenes Nachschwingen
  ([Dynamik](https://docs.toonboom.com/help/harmony-22/premium/deformation/use-weighted-deform-dynamic.html)).
- **Auto-Patch** schließt Gelenknähte zweier überlappender Teile von selbst (Bleistiftlinien und Farbe auf getrennten Schichten)
  ([Auto-Patch](https://docs.toonboom.com/help/harmony-22/premium/rigging/about-auto-patch-articulation.html)).

### 3.6 Spiele

Nur Ketten aus Game Bones lassen sich exportieren; im Spiel mischt das SDK linear (lineares Skinning) und sieht an Gelenken anders aus
als Harmonys Bone. Nicht unterstützt: Einflusszonen, Curve- und Envelope-Verformer, mehr als eine Pose in der Kette, animierte Pegs unter
Verformungsgruppen ([Verformung im Spiel](https://docs.toonboom.com/help/harmony-22/premium/gaming/concept-game-deform-guideline.html)).
Die Richtlinie für Spielfiguren sagt knapp: „Don't use Morphing.“
([Rig im Spiel](https://docs.toonboom.com/help/harmony-22/premium/gaming/concept-game-rig-guideline.html)).

### 3.7 Bewertung

Harmony hat das reichste Verformungsbesteck und die klarste Idee von Reglern über Posen (Grid, Stack). Aber: Verformer setzen sich
nicht von selbst zusammen, die Posenmischung ist linear und verlangt Zwischenposen, alles jenseits der Assistenten verlangt Skripte, der
Morph ist ein eigenes, unberechenbares System neben den Verformern, und das Spiel bekommt nur eine kleine Teilmenge.

---

## 4. Adobe Animate

- **Formtween:** Animate mischt zwischen zwei Vektorformen auf zwei Schlüsselbildern, auch Lage, Farbe und Strichbreite; Gruppen,
  Symbole und Bilder muss man vorher aufbrechen. **Formhinweise** a bis z ordnen Punkte einander zu; sie müssen in beiden Bildern in
  derselben Reihenfolge liegen und wirken am besten gegen den Uhrzeigersinn ab oben links
  ([Formtween](https://helpx.adobe.com/animate/desktop/animation/shape-tweening.html)). Das heißt: höchstens 26 Zuordnungen, sonst
  entscheidet Animate.
- **Bone-Werkzeug:** Knochen entweder in einer Form (eine IK-Form) oder als Kette von Symbolen. Kontrollpunkte einer Form hängen anfangs
  am nächsten Knochen; mit dem Bind-Werkzeug hängt man Punkte an mehrere Knochen und Knochen an mehrere Punkte (Quadrat: ein Knochen,
  Dreieck: mehrere). Zahlen für Gewichte nennt das Handbuch nicht. Eine IK-Form lässt sich nicht mehr skalieren oder scheren, bekommt keine neuen
  Striche, das Bearbeiten ihrer Punkte wird nicht empfohlen, und das Skelett ist nicht mehr änderbar, sobald nach dem ersten Bild Posen
  liegen. **Federn** (Stärke, Dämpfung) geben Knochen Nachschwingen. Zur Laufzeit steuerbar ist nur ein Skelett mit einer einzigen Pose
  ([Bone-Werkzeug](https://helpx.adobe.com/animate/desktop/animation/bone-tool-animation.html)).
- **Asset Warp („Modern Rigging“):** Ein Dreiecksnetz über Form oder Bild, Gelenke und Knochen (hart oder weich), eingefrorene Gelenke,
  Netzdichte nach Wahl; Posen auf Schlüsselbildern, klassischer Tween dazwischen. Ändert man das Rig später, übernimmt Animate die
  Änderung in alle Schlüsselbilder ([Rigging](https://helpx.adobe.com/animate/desktop/animation/character-rigging-in-animate.html)).

**Bewertung:** Formtween und Knochen leben in getrennten Welten (Formtweens auf Ebenen, Knochen in eigenen Pose-Ebenen, Asset Warp als
Netz je Schlüsselbild). Korrekturen, die vom Knochenwinkel abhängen, kennt Animate nicht. Lehrreich ist die Propagation: Rig-Änderungen
wirken rückwirkend auf alle Posen.

---

## 5. Synfig

- **Skelett-Ebene:** Jeder Anker ist ein gewichtetes Mittel mehrerer Knochen. „Link to Bone“ gibt einem Knochen 100 %, „Link to
  Skeleton“ verteilt Gewichte halbautomatisch nach Überdeckung: Je mehr der Anker im Einflussbereich eines Knochens liegt (Breite am
  Ursprung und an der Spitze), desto höher dessen Gewicht. Gewichte lassen sich in den Unterwerten des Ankers von Hand eintragen; ein
  Malwerkzeug nennt das Handbuch nicht ([Skelett-Ebene](https://synfig.readthedocs.io/en/latest/layers/skeleton.html),
  [Skelett-Werkzeug](https://synfig.readthedocs.io/en/latest/tools/skeleton.html)).
- **Skelett-Verformungsebene:** verzerrt das gerenderte Bild darunter auf einem Gitter (Pixelebene), für Bilder
  ([Skelett-Verformung](https://synfig.readthedocs.io/en/latest/layers/skeleton_deformation.html)).
- **Morph:** Synfig mischt alle Werte über Wegpunkte; ein Morph braucht dieselben Anker in beiden Formen
  ([Bone Morphing](https://synfig.readthedocs.io/en/latest/tutorials/bones_morphing.html)). Der Anker wird zum „Knochen-Einfluss“
  umgewandelt, seine Unterwerte bleiben animierbar; das legt die Reihenfolge Ankerwert → Knochen nahe (nicht ausdrücklich beschrieben).
  Die Liste der Umwandler enthält auch eine Feder („Dynamic“), deren Seite im Handbuch leer ist
  ([Umwandler](https://synfig.readthedocs.io/en/latest/converters.html)).

**Bewertung:** schlicht und vektorgenau; die Gewichte aus der Überdeckung einer Knochenkapsel sind ein brauchbarer einfacher Autorig.
Korrekturen an Knochenwinkeln gibt es nicht.

---

## 6. OpenToonz: Plastic

- Aus einer Zeichnung entsteht ein **Dreiecksnetz**; Vektorzeichnungen werden dafür mit einer wählbaren Auflösung **gerastert**. Das
  Netz lässt sich bearbeiten (Kanten tauschen, zusammenlegen, teilen, aufschneiden)
  ([Plastic](https://opentoonz.readthedocs.io/en/latest/create_animations_using_plastic_tool.html)).
- Ein **Skelett** aus Punkten (Winkel, Abstand, Stapelreihenfolge je Punkt, Winkelgrenzen); **Steifigkeit** malt man auf das Netz
  (rot steif, grün biegsam).
- Mehrere **Skelette mit Nummern** je Netz, je Bild umschaltbar (Kopfdrehung, andere Zeichnungen); Kurven gleichnamiger Punkte gehen über
  alle Skelette durch. **Ausdrücke** koppeln Punkte (linke Schulter folgt der rechten).
- Die Verformung ist das Verfahren „As-Rigid-As-Possible Shape Manipulation“ (Igarashi, Moscovich, Hughes) mit Steifigkeit je Netzpunkt,
  in drei Schritten gelöst ([Quelltext](https://github.com/opentoonz/opentoonz/blob/master/toonz/sources/tnzext/plasticdeformer.cpp)).

**Bewertung:** Die schönste Biegung ohne Gewichte (Steifigkeit statt Gewichte), aber auf Kosten der Vektoren (Raster) und ohne
Formschlüssel.

---

## 7. Forschung und zwei Nachbarn

### 7.1 Lineares Skinning und sein Fehler

Die Pose Space Deformation nennt das lineare Mischen „skeleton subspace deformation“: Ein Punkt liegt auf der Strecke zwischen seinen
starr mitbewegten Bildern; daher der zusammenfallende Ellbogen, und Künstler können die Form nicht direkt formen, nur Gewichte ändern
([Lewis, Cordner, Fong 2000](http://scribblethink.org/Work/PSD/PSD.pdf)).

Eigene Rechnung für 2D: Ein Punkt im Abstand r vom Gelenk mit halbem Gewicht auf zwei Knochen, die um θ gegeneinander gedreht sind,
landet im Abstand r · cos(θ/2). Bei 90° sind das 71 % (29 % Schwund), bei 180° fällt er auf das Gelenk. Mischt man stattdessen die
Drehwinkel (2D-Gegenstück zum Dual-Quaternion-Skinning), bleibt der Abstand erhalten, dafür wölbt sich die Außenseite.

### 7.2 Pose Space Deformation

([PDF](http://scribblethink.org/Work/PSD/PSD.pdf)) Ablauf:
1. Der Künstler stellt eine Pose und formt die Form dort direkt.
2. Gespeichert wird nur der Unterschied zur starr mitbewegten Lage, ausgedrückt im **örtlichen Rahmen**: Reine Gelenkbewegung ergibt
   den Unterschied null.
3. Die Unterschiede werden über den Posenraum (die Gelenkwinkel) verteilt interpoliert, mit Gaußschen Radialfunktionen; wo und wie
   breit sie wirken, bestimmt der Künstler.
4. Beim Abspielen: Punkt starr mitbewegen, interpolierten Unterschied dazu.

Das ist genau das Muster von Mohos Smart Bones, nur in einer Dimension und mit den Kurven der Aktion statt Radialfunktionen.

### 7.3 Gewichte automatisch

**Bounded Biharmonic Weights** rechnen glatte, örtlich begrenzte, formbewusste Gewichte für Punkte, Knochen und umschließende Linien,
in 2D und 3D, einmal beim Binden ([Jacobson u. a. 2011](https://igl.ethz.ch/projects/bbw/)). Das ist die Grundlage eines guten
Autorigs (mehr in einem eigenen Bericht); Synfig (Überdeckung einer Kapsel), Moho (Bereichsradius) und Harmony (Ellipsen) sind
einfache Näherungen.

### 7.4 Rive: eigene Gewichte für jeden Griff

In der Rive-Laufzeit hat jeder kubische Anker drei Gewichtssätze: einen für den Anker, je einen für Eingangs- und Ausgangsgriff, mit bis
zu vier Knochen und 8-Bit-Gewichten; gemischt wird linear über die Matrizen der Knochen
([cubic_weight.hpp](https://github.com/rive-app/rive-runtime/blob/main/include/rive/bones/cubic_weight.hpp),
[weight.cpp](https://github.com/rive-app/rive-runtime/blob/main/src/bones/weight.cpp),
[cubic_vertex.cpp](https://github.com/rive-app/rive-runtime/blob/main/src/shapes/cubic_vertex.cpp)). Die Griffe werden dabei als
eigene Punkte verformt. Bekommen beide Griffe eines glatten Ankers verschiedene Gewichte, stehen sie danach nicht mehr auf einer Linie:
Die Kurve knickt (eigene Ableitung).

### 7.5 Live2D: Blend Shapes

Live2D ergänzt seine Keyform-Raster um Blend Shapes, die Unterschiede **addieren**, damit man nicht jede Kombination von Parametern
anlegen muss. Das Handbuch rät davon ab, mehrere Blend Shapes auf dieselbe Eigenschaft zu legen, und zeigt selbst, wie ein Quadrat mit
einer Achteck- und einer Dreieck-Form bei beiden auf 1 zu keiner der beiden wird
([Blend Shape](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/)). Das ist der Streit der Smart Bones in anderer Gestalt:
Addieren ist einfach, aber Kombinationen brauchen eine eigene Antwort.

---

## 8. Querschnitt: Reihenfolge der Verformungen

| System | Reihenfolge | Was über die Reihenfolge entscheidet |
|---|---|---|
| Moho | Ebenenwerte (Hauptzeitleiste + Smart-Bone-Aktionen) → Knochen → Smart Warp / Curver → Ebene → Zeichnen | Knochenwinkel treiben Aktionen; Aktionen dürfen Knochen drehen |
| Harmony | Zeichnung (Tausch, Morph) → Verformungsketten nebeneinander (Weighted Deform mischt) → Pegs, Federn → Compositing | Master Controller schreiben Werte von außen hinein |
| Animate | Formtween, Pose-Ebene und Asset Warp getrennt | keine Verbindung |
| Synfig | Ankerwerte → Knochen-Einfluss → Ebenen; Rasterverformung als eigene Ebene | keine Treiber an Knochen |
| OpenToonz | Zeichnung (gerastert) → Netz → Plastic-Skelett (ARAP) → Bühne | keine Formschlüssel |
| Pose Space Deformation | Skelettpose → Unterschiede im örtlichen Rahmen (über den Posenraum interpoliert) → Skinning | Posenraum aus Gelenkwinkeln oder freien Reglern |
| Unser 3D-Editor (14.11.) | Pose = Grundform plus Versatz, in der Ruhe gerechnet; Züge im Gezeigten werden je Punkt zurückgedreht | eigene Erfahrung (`apps/editor/CLAUDE.md`) |

Alle, die Morph und Knochen überhaupt verbinden, ändern die Form **vor** den Knochen, in der Ruhe der Form. Keiner legt eine
Formänderung nach den Knochen in Bildschirmkoordinaten ab. Unser eigener 3D-Editor hat dieselbe Regel gefunden: Bearbeitet wird im
Gezeigten, gespeichert in der Ruhe, und der Versatz geht mit, wenn sich die Grundform ändert.

---

## 9. Smart Bones: mächtig und mühsam

**Mächtig**
- Die Korrektur gilt für jeden Winkel, nicht für ein Bild. Wer den Knochen animiert, per Hand, per IK oder per Dynamik, bekommt die
  richtige Form ohne weitere Arbeit.
- Ein Mechanismus für alles: Punkte, Krümmung, Farbe, Reihenfolge, Sichtbarkeit, Zeichnungstausch, andere Knochen.
- Regler-Knochen machen komplexe Bewegungen zu einem Hebel (Kopfdrehung, Blinzeln, Lächeln); auf der Zeitleiste ist das ein einziger
  Wert mit beliebiger Mischkurve.
- Mit 360° deckt ein Regler eine ganze Umdrehung ab.

**Mühsam**
- **Unsichtbare Zuordnung:** Name der Aktion = Name des Knochens; die Winkel stehen in einer eigenen Zeitleiste der Aktion. Wer das
  Prinzip nicht kennt, findet es nicht.
- **Eine Richtung je Aktion:** Für die Gegenrichtung eine zweite Aktion.
- **Nur Drehung treibt:** Lage, Länge oder Abstand nur über Hilfsknochen.
- **Streit und Verschachtelung:** Mehrere Smart Bones auf denselben Punkten addieren sich ungewollt; Ketten von Treibern brechen ab
  einer Tiefe; Aktionen mit mehreren Knochen haben Nebenwirkungen.
- **Werkzeugbruch:** Skripte sehen den wirklichen Winkel nicht; Smart Warp und Punktbindung vertragen sich nicht.
- **Spiel:** Der Export backt Smart Bones zu Morph-Zielen und nimmt nur bestimmte Fälle mit.

**Lehre:** Das Prinzip (Form folgt Gelenkwinkel, in der Ruhe gespeichert) ist richtig. Falsch sind die Verpackung (Aktionen mit Namen),
die Beschränkung auf Drehung und das Fehlen einer Antwort auf Kombinationen.

---

## 10. Gegenüberstellung für unseren Fall

Unser Fall: ein Charakter- und Physik-Spieleditor, ein Art Director ohne Programmierkenntnisse, Mac und iPad/iPhone, Vektorformen, die
genau wie seine Zeichnungen aussehen müssen, glatte Übergänge, die er selbst formen will.

### 10.1 Wo leben Korrekturformen?

| Weg | Für uns gut | Für uns schlecht |
|---|---|---|
| Moho: Aktion am Knochennamen | Prinzip bewährt | unsichtbar, eine Richtung, nur Drehung |
| Harmony: Master Controller mit Posen-Datenbank | Schieber und 2D-Raster sichtbar auf der Bühne | linear, Skripte, Posen als ganze Szene gespeichert |
| Live2D: Keyform-Raster je Parameter | klar, an Parametern | Raster wächst multiplikativ (Rat: höchstens zwei Parameter je Verformer) |
| PSD mit Radialfunktionen | beliebig viele Treiber | schwer vorherzusehen, Falloff ist ein abstrakter Wert |
| **Formschlüssel am Regler** (Vorschlag) | sichtbar, PCHIP wie im Prototyp, ein Mechanismus für alles | Kombinationen brauchen Kreuzschlüssel |

**Urteil:** Formschlüssel am Regler, eindimensional, mit PCHIP zwischen den Schlüsseln (kein Überschwingen); für echte 2D-Regler
(Blickrichtung) ein 2D-Feld wie Harmonys Grid; für Paare, die sich stören, Kreuzschlüssel. Radialfunktionen erst, wenn mehr als zwei
Treiber zusammenwirken müssen.

### 10.2 Reihenfolge von Morph und Knochen

| Weg | Urteil |
|---|---|
| Morph vor den Knochen, in der Ruhe der Form (PSD, Moho) | **gewählt**: Korrekturen reisen mit dem Knochen mit, Grundform-Änderungen wirken überall |
| Morph nach den Knochen, im Bildschirm | verworfen: dreht nicht mit, bricht bei jeder anderen Pose |
| beides als zwei Schichten | verworfen: zwei Orte für dasselbe, Florian müsste wissen, wo eine Änderung landet |

Bearbeitet wird trotzdem im Gezeigten: Der Editor rechnet jeden Zug in die Ruhe zurück (für einen Anker mit der Umkehrung der gemischten
Abbildung, für einen Griff durch Abziehen des Drehwinkels und Teilen der Streckung).

### 10.3 Griffe unter Knochen

| Weg | Glatt bleibt glatt | Kontrolle | Urteil |
|---|---|---|---|
| Nur Anker bewegen, Griffe neu berechnen (Mohos Krümmung) | ja | gering, Biegungen nur über mehr Anker | nein |
| Griffe als eigene Punkte mit eigenen Gewichten (Rive) | nein, wenn die Gewichte verschieden sind | hoch | nein |
| **Griffe als Vektor (Winkel, Länge) am Anker, Griffpaar am glatten Anker mit gemeinsamer Gewichtung, Ecken je Griff** | ja, exakt | hoch, wo es zählt | **ja** |

Begründung: Zwei Griffe auf einer Geraden durch den Anker bleiben auf einer Geraden, wenn beide mit derselben linearen Abbildung
gedreht und gestreckt werden. Ob das Gewicht des Paars dem des Ankers entspricht oder davon abweicht, spielt dafür keine Rolle. Ein vom
Anker abweichendes Gewicht des Griffpaars ist sogar das Werkzeug für runde Biegungen: Der Griff am Kniepunkt mit halbem Gewicht auf dem
Unterschenkel dreht sich halb mit, und die Biegung wird weich statt eckig. Das deckt Florians Wunsch nach Gewichten auf einzelnen
Griffen ab, ohne die Glätte zu gefährden.

### 10.4 Mischen der Knochen

| Weg | Urteil |
|---|---|
| Lineares Skinning (LBS) für Anker | **Standard**: vorhersehbar, Standard aller Laufzeiten, Schwund wird mit Korrekturformen behoben |
| Drehwinkel mischen (2D-Gegenstück zu Dual Quaternions) | **Schalter je Gelenk „Volumen halten“**, an Ozzys Hals und Schwanz gegen LBS + Korrektur zeigen |
| Netz mit ARAP und Steifigkeit (OpenToonz) | nicht für Vektoranker; die Idee „Steifigkeit statt Gewichte“ lebt im Autorig weiter (hart/weich je Gelenk) |

Griffe werden in jedem Fall über Winkel und Länge gedreht (gemischter Drehwinkel, gemischte Streckung); dort gibt es keinen Schwund.

### 10.5 Ansichten wechseln (Kopf 360°)

| Weg | Urteil |
|---|---|
| Zeichnungen tauschen (Harmony, Moho Switch, Vitruvian Bones, OpenToonz Skelett-Nummern) | nur für Teile, die erscheinen oder verschwinden |
| **Formschlüssel am Regler θ** (Prototyp `raster.ts`, Mohos 360°-Smart-Bones, Harmonys Slider) | **gewählt**, läuft schon: PCHIP je Ankerkoordinate, Griffe nach Winkel und Länge, Faltschlüssel, wo Anker aneinander vorbeilaufen würden |
| Netz verzerren (Smart Warp, Envelope, Free Form) | nein: Florians Formen müssen an den Schlüsseln exakt seine Zeichnung sein |

### 10.6 Zuordnung beim Morph

Harmony (nächste Form, Farbe, Hinweise je Sequenz) und Animate (Hinweise a bis z) raten die Zuordnung und lassen sie korrigieren. Moho,
Synfig und der Prototyp verlangen dieselben Anker in allen Schlüsseln. **Urteil:** dieselben Anker. Der Editor macht das leicht: Ein
neuer Schlüssel ist immer die Kopie der Form an dieser Stelle, also gibt es nichts zuzuordnen. Was erscheint oder verschwindet, regelt
Sichtbarkeit oder Länge null am Regler, kein Hinweis.

### 10.7 Was trägt die Verformung?

Netze (Plastic, Asset Warp, Smart Warp, Free Form, Weighted Deform) biegen weich und können Texturen, verlangen aber Netzdichte,
rastern Vektoren oder lösen die Form vom Bézier-Pfad. **Urteil:** Anker und Griffe tragen die Verformung. Ein Kurvenknochen (Harmonys
Curve, Mohos Curver) ist später eine Variante des Knochens für Schwanz und Ohren, er wirkt aber ebenfalls auf Anker, nicht auf Pixel.

### 10.8 Was treibt?

Moho: nur Knochendrehung. Harmony: alles, aber über Skripte. **Urteil:** jeder Wert mit derselben Bedienung: Gelenkwinkel, Länge eines
Knochens, Abstand zweier Punkte (Fuß zum Boden), Tempo, Balance, Spielwerte, freie Regler. Verknüpft wird sichtbar, durch Ziehen einer
Verbindung; Kreise im Abhängigkeitsgraphen zeigt der Editor rot an, statt wie Moho stillschweigend abzubrechen.

### 10.9 Gelenknähte

Moho: Patch-Ebenen. Harmony: Auto-Patch mit festen Bedingungen. **Urteil:** Verschmelzen im Renderer (weiche Vereinigung der
Abstandsfelder, wie im Prototyp): gleichfarbige Teile fließen ineinander, eine Naht entsteht gar nicht erst. Moho 14 geht mit Liquid
Shapes denselben Weg.

### 10.10 Editor und Spiel

Moho backt Smart Bones beim Export, Harmony exportiert eine Teilmenge (Game Bones, kein Morph). **Urteil:** Das Spiel rechnet mit
demselben Code wie der Editor, Regler bleiben Regler. Nur so folgt eine Korrektur einem Knochen, den im Spiel die Physik bewegt.

---

## 11. Empfehlung: das Zusammenspiel von Vektormorph und Knochen

### 11.1 Grundsatz: Alles ist ein Regler mit Schlüsseln

Ein **Regler** ist ein Wert mit einem Bereich. Ein **Formschlüssel** ist die Gestalt eines Teils bei einem Wert des Reglers, gespeichert
als Versatz gegen die Grundform. Damit sind folgende Dinge **dasselbe**:

| Was Florian tut | Regler | Schlüssel |
|---|---|---|
| Kopf um 360° drehen | Kopfwinkel θ | seine gezeichneten Ansichten, Zwischenschlüssel, Faltschlüssel |
| Blinzeln, Stirn heben | freier Regler 0…1 | geschlossen, gehoben |
| Knie oder Ohransatz bei 90° korrigieren | Gelenkwinkel | Korrektur bei 45°, 90°, 135° |
| Übergang Sitzen → Stehen formen | Fortschritt 0…1 des Übergangs | Zwischenformen, am Anfang und Ende null |
| Bauch staucht beim Landen | Physikwert (Stauchung) | gestauchte Form |
| Ozzy schwankt, wenn die Balance kippt | Spielwert (Balance) | geneigte, erschrockene Form |

Das ist Mohos Smart Bone, Harmonys Slider und Live2Ds Parameter in einem, ohne Namenskonvention und ohne Skript. Die Grundform ist
selbst nur der Schlüssel „Ruhe“.

### 11.2 Rechenreihenfolge je Bild

1. **Regler und Knochen bestimmen:** Zeitleiste und Posen setzen Regler und Knochenwinkel; IK, Bedingungen und Federn (Knochendynamik)
   rechnen die endgültigen Knochen; daraus folgen die Werte der Regler, die an Knochen hängen. Regler, die selbst Knochen bewegen (der
   Kopfwinkel dreht die Ohrknochen), werden in der Reihenfolge des Abhängigkeitsgraphen gerechnet.
2. **Form in der Ruhe:** Grundform plus die Versätze aller Regler. Anker: PCHIP über die Schlüssel des Reglers, die Versätze mehrerer
   Regler addiert. Griffe: Winkel (stetig abgewickelt) und Länge über die Schlüssel, mehrere Regler mit addierten Winkeln und
   multiplizierten Längenfaktoren. Dazu die Kreuzschlüssel (11.5).
3. **Knochen verformen:** Anker linear gemischt (oder je Gelenk mit gemischten Drehwinkeln), Griffe als Vektoren mit gemischtem
   Drehwinkel und gemischter Streckung ihres Gewichtssatzes.
4. **Teil an seinen Platz:** Teile, die ganz an einem Knochen hängen (Ebenenbindung), bekommen dessen Transformation.
5. **Zeichnen:** Kurven abflachen, Abstandsfelder, Verschmelzen, 2D-Shader.

Keine Formänderung nach Schritt 3. Federn wirken auf Knochen (Schritt 1) oder auf Regler (eine Feder auf einem Reglerwert, Schritt 1),
und die Korrekturen folgen ihnen von selbst.

### 11.3 Griffe und Gewichte

- Jeder Anker hat einen Gewichtssatz (bis vier Knochen wie in Rive).
- Jeder **glatte** Anker hat ein Griffpaar mit **einem** gemeinsamen Gewichtssatz; Standard „Griff folgt Anker“ (gleiche Gewichte wie
  der Anker). Weicht Florian davon ab, bleibt der Anker glatt (10.3).
- Jede **Ecke** darf jedem Griff einen eigenen Gewichtssatz geben.
- Griffe werden immer als Winkel und Länge behandelt, beim Morph wie bei den Knochen. Eine Sprache für beides.

### 11.4 Formen in der Pose, gespeichert in der Ruhe

- Florian stellt die Figur in eine Pose, wählt einen Regler (oder einen Gelenkbogen) und formt Anker und Griffe direkt wie in
  Illustrator. Der Editor rechnet den Zug in die Ruhe zurück und legt ihn als Schlüssel beim aktuellen Wert ab; liegt dort schon ein
  Schlüssel (näher als ein Fang, im Prototyp 4°: `KORREKTUR_NAH`), wird dieser geändert.
- Es gibt nur eine Regel, wohin eine Änderung geht: **zum gewählten Regler an seinem jetzigen Wert.** Ist kein Regler gewählt, geht sie
  in die Grundform und wirkt überall. Der Ort steht sichtbar am Werkzeug (Name und Wert des Reglers).
- Weil alle Schlüssel Versätze sind, gehen sie mit, wenn Florian die Grundform ändert (Lehre aus dem 3D-Editor: „Die Pose geht mit der
  Grundform mit“). Animate zeigt mit der Propagation von Rig-Änderungen in alle Posen dasselbe Ziel.

### 11.5 Streitende Korrekturen: Kreuzschlüssel

Wirken zwei Regler auf dieselben Anker (Kopfwinkel und Maul offen; Knie und Hüfte), addieren sich ihre Versätze. Stimmt die Summe
nicht, setzt Florian beide Regler auf die störende Stelle und formt: Der Editor legt einen **Kreuzschlüssel** an, gewichtet mit dem
Produkt der beiden Anteile (null, sobald einer der beiden Regler in der Ruhe steht). Das ist das 2D-Prinzip der Kombinationsformen und
die Antwort auf Mohos streitende Smart Bones und Live2Ds Warnung vor gestapelten Blend Shapes. Für Regler, die von Natur aus zwei
Dimensionen haben (Blickrichtung), gibt es statt dessen ein 2D-Feld mit Schlüsseln an Rasterpunkten wie Harmonys Grid, gemischt glatt
statt linear.

### 11.6 Übergänge als Regler

Ein Übergang von Pose A nach Pose B mischt alle Regler und Knochen über eine Tempokurve; die Korrekturen kommen von selbst. Will Florian
einen Übergang selbst formen, ist der Übergang ein Regler „Fortschritt 0…1“: Er scrubbt, formt, und der Editor legt Zwischenformen ab,
die an beiden Enden null sind. Das ist das Gegenstück zu Harmonys Hinweisen je Morph-Sequenz, nur als Form statt als Punkt. Die
Faltschlüssel des Prototyps sind schon solche Zwischenformen, nur automatisch.

### 11.7 Bedienung: eine Grammatik

- **Regler zeigen sich dort, wo sie wirken:** Ein Gelenk hat einen Bogen mit Strichen an seinen Schlüsselwinkeln; ein freier Regler ist
  ein kurzer Streifen oder ein kleines Feld neben dem Teil; ein Übergang ist ein Streifen an der Verbindung zweier Posen.
- **Schlüssel sind Punkte auf dem Regler:** antippen springt hin, ziehen verschiebt den Wert, wischen löscht. Dieselben Gesten überall.
- **Zwiebelhaut** zeigt die Nachbarschlüssel des gewählten Reglers als Umriss (im Werkzeug des Prototyps schon da, Taste Z).
- **Gewichte:** Knochen antippen färbt Anker und Griffe nach Gewicht; am Anker auf und ab ziehen ändert es; ein kleines Schloss am glatten
  Anker zeigt das gemeinsame Griffpaar. Auf dem iPad mit dem Finger, auf dem Mac mit der Maus, ohne Zahlenfelder.
- **Keine Namen als Mechanik:** Verknüpfungen entstehen durch Ziehen einer Linie vom Regler zum Treiber, nicht durch gleichlautende
  Namen.

### 11.8 Autorig aus dieser Sicht

- Teile, die ganz an einem Knochen hängen, bekommen 100 % (Ebenenbindung); bei Ozzy vermutlich die meisten Teile (Beine, Nase und Bart
  am Kopf).
- Teile über ein Gelenk (Bohne, Schwanz, Ohren, Hals) bekommen formbewusste Gewichte (Abschnitt 7.3) mit einem weichen Übergang am
  Gelenk; ein einziger Regler je Gelenk stellt die Breite des Übergangs ein („hart ↔ weich“, die Steifigkeit aus OpenToonz in einer Zahl).
- Griffpaare erben das Gewicht ihres Ankers; in der Übergangszone bekommen sie das Gewicht der Gelenkmitte, damit die Biegung rund wird.
- Der Autorig schlägt vor, Florian überschreibt; überschriebene Werte bleiben beim nächsten Autorig stehen.

### 11.9 Laufzeit und Spiellogik

Das Spiel lädt dieselben Daten und rechnet dieselben fünf Schritte. Spielwerte (Tempo, Balance, Stolpern) sind Regler; die Physik bewegt
Knochen und Regler; die Korrekturen folgen. Für Ozzy sind das je Bild etwa 20 Teile mit je 10 bis 30 Ankern: Mischen über wenige
Schlüssel und bis vier Knochen je Anker kostet auf dem iPhone weit unter einer Millisekunde (Schätzung, nicht gemessen).

### 11.10 Probe an Ozzy (was zuerst zu beweisen ist)

Nach Arbeitsregel 1 (Look zuerst beweisen) mit festgelegten Kriterien:
1. **Korrektur am Gelenk:** Ohransatz oder Schwanzwurzel, Knochen bis 120° gedreht. Vorher (LBS allein) gegen nachher (mit zwei
   Korrekturschlüsseln). Kriterium: keine Einschnürung, kein Knick, Glätte über den ganzen Winkelbereich (Video).
2. **Kreuzschlüssel:** Kopfwinkel θ und ein Gesichtsregler zusammen. Kriterium: Beide Regler einzeln stimmen wie bisher, die
   Kombination nach einem Kreuzschlüssel auch.
3. **Feder treibt Korrektur:** Schwanz mit Federknochen, Korrektur an seinem Winkel. Kriterium: Beim Nachschwingen läuft die Form glatt
   mit, ohne dass etwas animiert wurde.
4. **Griffgewicht:** Biegung eines Teils mit „Griff folgt Anker“ gegen halbes Griffgewicht. Kriterium: Florians Auge entscheidet,
   welche Biegung schöner ist; der glatte Anker bleibt in beiden Fällen glatt.
5. **LBS gegen Drehwinkel mischen** am Hals: zwei Videos nebeneinander, Florian wählt.

---

## 12. Offene Fragen

1. Soll Ozzys Bohne über Knochen biegen oder nur über Formschlüssel (Regler „Biegung“)? Das entscheidet, ob er Gewichte überhaupt sieht.
2. „Volumen halten“ (Drehwinkel mischen) oder LBS mit Korrektur: Was gefällt ihm am Hals und am Schwanz?
3. Wie viele Regler darf ein Teil tragen, bevor Kreuzschlüssel lästig werden? (Live2D rät zu höchstens zwei Parametern je Verformer.)
4. Sollen Übergänge zwischen allen Posen von selbst entstehen und nur auf Wunsch geformt werden, oder will er jede Verbindung sehen?
5. Darf ein Regler Knochen bewegen (wie Mohos Smart Bones, die andere Knochen drehen), etwa der Kopfwinkel die Ohren? Das macht den
   Abhängigkeitsgraphen tiefer.
6. Gewichte auf dem iPad: Ziehen am Anker reicht, oder braucht es einen Pinsel?
7. Nachprüfen, sobald das Moho-Handbuch 14 lesbar ist: genaue Zuordnung Winkel → Aktionsbild, Verhalten beim späteren Ändern der
   Grundzeichnung, wie mehrere Smart Bones auf denselben Punkten verrechnet werden.

---

## 13. Quellen

**Moho**
- Lost Marble: [Moho 14.4 Side Quest](https://moho.lostmarble.com/blogs/news/free-update-export-to-video-game-engines-with-the-moho-14-4-side-quest),
  [Moho 14](https://moho.lostmarble.com/blogs/news/moho-14-the-future-is-2d),
  [Funktionen](https://moho.lostmarble.com/pages/features),
  [Moho 13.5](https://moho.lostmarble.com/blogs/news/moho-pro-13-5-new-features)
- [Moho 12 (80.lv)](https://80.lv/articles/smith-micro-software-releases-moho-pro-12)
- Handbuch: [Bone Layers](https://www.lostmarble.com/moho/manual/bone_layers.html),
  [Tutorial 3.1 Bindung](https://www.lostmarble.com/moho/manual/tut03/01)
- [Skriptreferenz M_Bone](https://mohoscripting.com/classes/M_Bone)
- [Smart Bones (Anime Studio 9.2)](https://www.animestudiotutor.com/bones/smart_bones/),
  [Erweiterungen 9.3](https://www.animestudiotutor.com/past/smart_bones_enhancements/)
- [Lester Banks: Smart Bone Actions](https://lesterbanks.com/2016/11/working-mohos-smart-bone-actions/)
- Lost-Marble-Forum (nur Suchauszüge): [2.5D-Kopf mit Korrektur-Smart-Bones](https://www.lostmarble.com/forum/viewtopic.php?p=155510),
  [Smart Bone nach Lage](https://www.lostmarble.com/forum/viewtopic.php?p=216824),
  [Rigging und Smart Bones](https://www.lostmarble.com/forum/viewtopic.php?p=171792),
  [Winkel eines gesteuerten Knochens](https://www.lostmarble.com/forum/viewtopic.php?p=215518),
  [Smart Warp und Punktbindung](https://www.lostmarble.com/forum/viewtopic.php?p=214311),
  [Morph Targets vs Smart Bones](https://lostmarble.com/forum/viewtopic.php?p=156210)

**Toon Boom Harmony 22 Premium**
- Verformung: [Überblick](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-deformation.html),
  [Arten](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-deformer-type.html),
  [Bone](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-bone-deformation.html),
  [Game Bone](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-game-bone-deformation.html),
  [Curve](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-curve-deformation.html),
  [Envelope](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-envelope-deformation.html),
  [Free Form](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-free-form-deformation.html),
  [Weighted Deform](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-weighted-deformations.html),
  [Kombinieren](https://docs.toonboom.com/help/harmony-22/premium/deformation/use-weighted-deform-combined.html),
  [Dynamik](https://docs.toonboom.com/help/harmony-22/premium/deformation/use-weighted-deform-dynamic.html),
  [Einflusszonen](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-region-influence.html),
  [Ruhe](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-rest-position-set.html),
  [Animieren](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-deformation-animation.html),
  [Mehrfach-Pose-Rig](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-structure-multi-pose-deformation-rig.html),
  [Point Kinematic Output](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-point-kinematic-output.html),
  [Verformer als Steuerung](https://docs.toonboom.com/help/harmony-22/premium/deformation/about-using-deformers-as-controllers.html)
- Master Controller: [Überblick](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-master-controller.html),
  [Assistenten](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-master-controller-wizards.html),
  [Slider](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-slider-wizard.html),
  [Posen für den Slider](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-poses-slider-wizard.html),
  [Grid](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-grid-wizard.html),
  [Posen fürs Raster](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-poses-grid-wizard.html),
  [Deformer on Deformer](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-deformer-on-deformer.html)
- Morphing: [Überblick](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morphing.html),
  [Hinweise](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morph-hint.html),
  [Kontur](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-contour-hint.html),
  [Zone](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-zone-hint.html),
  [Verschwinden](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-vanishing-point-hint.html),
  [Regeln](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morph-rule.html),
  [Nächste Form](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-closest-similar-shape-rule.html),
  [Tempo](https://docs.toonboom.com/help/harmony-22/premium/morphing/about-morph-velocity-time.html)
- Spiel und Sonstiges: [Verformung im Spiel](https://docs.toonboom.com/help/harmony-22/premium/gaming/concept-game-deform-guideline.html),
  [Rig im Spiel](https://docs.toonboom.com/help/harmony-22/premium/gaming/concept-game-rig-guideline.html),
  [Dynamic Spring](https://docs.toonboom.com/help/harmony-22/premium/reference/node/constraint/dynamic-spring-node.html),
  [Auto-Patch](https://docs.toonboom.com/help/harmony-22/premium/rigging/about-auto-patch-articulation.html)

**Adobe Animate**
- [Formtween und Formhinweise](https://helpx.adobe.com/animate/desktop/animation/shape-tweening.html),
  [Bone-Werkzeug](https://helpx.adobe.com/animate/desktop/animation/bone-tool-animation.html),
  [Modern Rigging mit Asset Warp](https://helpx.adobe.com/animate/desktop/animation/character-rigging-in-animate.html)

**Synfig 1.5**
- [Skelett-Ebene](https://synfig.readthedocs.io/en/latest/layers/skeleton.html),
  [Skelett-Verformungsebene](https://synfig.readthedocs.io/en/latest/layers/skeleton_deformation.html),
  [Skelett-Werkzeug](https://synfig.readthedocs.io/en/latest/tools/skeleton.html),
  [Bone Morphing](https://synfig.readthedocs.io/en/latest/tutorials/bones_morphing.html),
  [Umwandler](https://synfig.readthedocs.io/en/latest/converters.html)

**OpenToonz**
- [Plastic-Werkzeug](https://opentoonz.readthedocs.io/en/latest/create_animations_using_plastic_tool.html),
  [plasticdeformer.cpp](https://github.com/opentoonz/opentoonz/blob/master/toonz/sources/tnzext/plasticdeformer.cpp)

**Forschung und Nachbarn**
- J. P. Lewis, M. Cordner, N. Fong: [Pose Space Deformation](http://scribblethink.org/Work/PSD/PSD.pdf), SIGGRAPH 2000
- A. Jacobson, I. Baran, J. Popović, O. Sorkine: [Bounded Biharmonic Weights](https://igl.ethz.ch/projects/bbw/), SIGGRAPH 2011
- T. Igarashi, T. Moscovich, J. F. Hughes: As-Rigid-As-Possible Shape Manipulation, SIGGRAPH 2005 (zitiert im OpenToonz-Quelltext)
- Rive-Laufzeit: [cubic_weight.hpp](https://github.com/rive-app/rive-runtime/blob/main/include/rive/bones/cubic_weight.hpp),
  [weight.cpp](https://github.com/rive-app/rive-runtime/blob/main/src/bones/weight.cpp),
  [cubic_vertex.cpp](https://github.com/rive-app/rive-runtime/blob/main/src/shapes/cubic_vertex.cpp)
- Live2D: [Blend Shape](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/)

**Aus dem Projekt**
- Prototyp `apps/editor/src/ozzy-figur/raster.ts` (Schlüsselformen je Winkel, PCHIP, Griffe nach Winkel und Länge, Faltschlüssel,
  `KORREKTUR_NAH`)
- `apps/editor/CLAUDE.md` (Pose in der Ruhe, Versatz gegen die Grundform, Züge im Gezeigten zurückgedreht)
- [`docs/research/2026-11-16-ozzy-morph-und-animation.md`](../2026-11-16-ozzy-morph-und-animation.md),
  [`docs/research/2026-11-18-ozzy-figur-recherche.md`](../2026-11-18-ozzy-figur-recherche.md)
