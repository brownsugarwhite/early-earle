# Posen, Übergänge und Zeit (Recherche, 20.11.2026)

**Auftrag (Florian, 20.11.):** ein Editor für Vektorfiguren, in dem man verschiedene Posen bestimmt und den Übergang von jeder
Pose in jede andere selbst festlegt; angelehnt an Spine, aber übersichtlicher und besser bedienbar; Schlüssel und Zeitleisten so
minimalistisch wie möglich; ein besseres System als die klassische Zeitleiste ist ausdrücklich erwünscht, aber nur nach ehrlicher
Gegenüberstellung. Dieser Bericht ist Thema 5 der Editor-Recherche (Ordner `docs/research/2026-11-20-editor/`): **Posen,
Übergänge und Alternativen zur Zeitleiste.** Formen und Morph, Knochen und Autorig, Physik, Shader und das Spielkonzept stehen in
den anderen Berichten des Ordners; hier kommen sie nur vor, wo sie die Ordnung der Bewegung berühren.

Grundlage: Handbücher (Spine, Unity, Unreal, Godot, Rive, Live2D, Blender, Toon Boom, Procreate Dreams, Cascadeur), Vorträge
(GDC 2016 und 2018, SIGGRAPH 2017, WWDC 2018), Fachartikel aus der Spielebranche, Foren und Testberichte. Die Quellen stehen am
Ende, die Grenzen dieser Recherche in Abschnitt 10.

---

## 0. Kurzfassung

1. **Kein großes Werkzeug ordnet Bewegung nur über eine Zeitleiste.** Spiele-Werkzeuge trennen drei Fragen: *was* (Posen, Clips),
   *wie weit* (Parameter, Blend Spaces) und *wie dahin* (Übergänge). Die Zeitleiste ist dort das Werkzeug für einzelne Clips, nicht
   das Ordnungsprinzip.
2. **Für „von jeder Pose in jede andere“ hat sich „Standard plus Ausnahmen“ durchgesetzt:** Spine hat eine Standard-Mischzeit und
   Mischzeiten je Paar; Unity und Rive haben „Any State“; Godot sucht selbst einen Weg durch den Graphen. Eine volle Matrix ist
   vollständig, wird aber ab rund zehn Posen unübersichtlich; ein freier Graph wird zu „Spaghetti“, wovor Rive und Unity selbst
   warnen.
3. **Ein guter Übergang erhält die Geschwindigkeit und ist jederzeit unterbrechbar.** Das klassische Überblenden leistet beides
   schlecht; Unity blendet bei einer Unterbrechung sogar von einer eingefrorenen Pose aus. Die Spielebranche nutzt dafür
   Trägheits-Übergänge (Bollo, GDC 2018) und kritisch gedämpfte Federn (Holden; Apple: Federn statt fester Dauer).
4. **Für Vektorformen ist der wichtigste Punkt: im Raum der Regler überblenden, nicht im Raum der Formen.** Wechselt der Kopf von
   links nach rechts, soll der Kopfwinkel laufen und dabei über Florians Schlüssel der Front gehen. Ein direktes Überblenden der
   Formen schneidet die Ecke, Teile schrumpfen und verklumpen. Live2D, Toon Boom und Rive arbeiten genau so: Formen hängen an
   Parametern, Bewegung bewegt die Parameter.
5. **Parameterräume sind für ein Spiel die stärkste Form der Pose** (Blend Spaces, Live2D-Keyforms, Rive-Joysticks, Toon-Boom-
   Master-Controller, Spine-Slider): wenige gezeichnete Schlüssel, unendlich viele Zwischenstellungen, direkt vom Spiel steuerbar,
   am Finger bedienbar. Ihre Grenze ist die Zahl der Achsen: Zwei je Feld gehen gut, drei sind kaum noch zu zeichnen.
6. **Ebenen mit Masken verhindern, dass Kombinationen explodieren** (Unity, Spine, Rive, Unreal Aim Offset, Live2D-Ausdrücke):
   Haltung, Blick und Stimmung werden übereinandergelegt, nicht als eigene Posen gezeichnet.
7. **Aufnahme** (Procreate Dreams „Performing“, Adobe Character Animator) bringt lebendiges Timing und passt zum iPad; sie ist eine
   gute Eingabe, kein Ordnungsprinzip. **Motion Matching** braucht Minuten an Bewegungsdaten und scheidet für handgezeichnete
   Figuren aus.
8. **Physik und Prozedurales gehören als immer laufende Ebene darüber** (Overgrowth mit sehr wenigen Schlüsselposen, Cascadeur mit
   einem physikalischen Vorschlag als „Geist“, Physik-Verhalten in Character Animator). Der Art Director stellt Charakter ein,
   statt jede Nachschwingung zu schlüsseln.
9. **Vorschlag: Posen, Regler, Wege.** Eine Posenleiste (was), Regler als Leisten oder Felder mit Schlüsseln (wie weit; die Zeit ist
   nur ein weiterer Regler), Wege zwischen Posen (Standard: Feder; Ausnahme: gestalteter Weg mit Zwischenposen auf einer kurzen
   Taktleiste), Ebenen, eine immer laufende Physik und Spielwerte, die Regler bewegen. Alles bedient sich wie die heutige
   Zeitleiste der Kopfdrehung: Klick springt, Ziehen fährt, Zeichnen setzt einen Schlüssel, Z zeigt die Zwiebelhaut.
10. **Der Prototyp hat schon die Hälfte davon** (Haltungen als Gewichte, Abläufe aus Abschnitten, Wege über Zwischenhaltungen,
    Feder). Die Abläufe stehen aber im Code, und jede Bewegung läuft hinter einer Feder her, die Florians Zeiten um rund 0,1 s
    verschiebt und glättet. Empfohlen: die Abläufe sichtbar und bearbeitbar machen und die Feder nur beim Wechsel wirken lassen
    (Trägheits-Übergang). Prüfstein: „Hinsetzen mit Hüpfer“.

---

## 1. Begriffe, wie dieser Bericht sie verwendet

- **Pose:** gespeicherte Stellung der Figur: die Werte aller oder einiger Regler und Knochen, dazu bei Bedarf eine Korrekturform
  (Versatz einzelner Anker und Griffe). Eine Pose kann ganz sein oder nur Teile betreffen (Kopf, Gesicht).
- **Haltung:** Pose der Grund-Ebene (Stehen, Sitzen, Liegen); Wort aus dem Prototyp.
- **Regler:** eine Größe mit Schlüsselformen an bestimmten Werten (Kopfwinkel, Maul offen, Phase des Gangs). Als **Leiste** eine
  Achse, als **Feld** zwei Achsen.
- **Weg:** Übergang von einer Pose in eine andere. Der **Standardweg** ist eine Feder ohne eigene Gestaltung; ein **gestalteter
  Weg** (im Prototyp „Ablauf“) hat Zwischenposen, Zeiten, Kurven und Zusatzbewegungen.
- **Ebene:** eigene Schicht mit eigener Pose und eigenen Wegen, die nur bestimmte Teile betrifft und dort ersetzt oder addiert.
- **Feder:** bringt einen Wert weich zu seinem Ziel. Kritisch gedämpft schwingt sie nicht über; mit weniger Dämpfung schwingt sie
  nach. Einstellbar über **Tempo** (Halbwertszeit) und **Federung** (Dämpfung).
- **Trägheits-Übergang:** Beim Wechsel wird der Unterschied zwischen Gezeigtem und neuem Ziel samt Geschwindigkeit gemerkt und
  klingt dann weich ab; das neue Ziel selbst läuft unverändert.
- **Auslöser:** Ereignis aus dem Spiel (Stolpern, Sprung), das einen Weg startet.

---

## 2. Was die besten Programme und Verfahren tun

### 2.1 Pose zu Pose und Posenbibliotheken

- **Grundsatz aus dem Zeichentrick:** Disneys Prinzip „Straight ahead and pose to pose“ unterscheidet das Zeichnen Bild für Bild
  (fließend, aber schwer in Proportion zu halten) vom Arbeiten mit Schlüsselposen, deren Zwischenbilder später entstehen (gute
  Kontrolle über Komposition und Ausdruck). Im Rechner füllt die Maschine die Zwischenbilder, der Animator wacht darüber; meist
  wird beides kombiniert. Dazu gehören „Slow in, slow out“ (mehr Bilder an den Posen), Nachlauf und Überlappung (lose Teile kommen
  später an) und Timing als Träger von Gewicht und Stimmung
  ([Wikipedia: Twelve basic principles](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation)).
- **Blender Pose Library:** Eine Pose ist ein Asset mit Namen, Vorschaubild und Katalog (technisch eine Aktion mit einem Bild
  Schlüssel). Anwenden per Klick, nur auf gewählte Knochen, auch gespiegelt; **Ziehen am Vorschaubild nach links oder rechts
  blendet die Pose stufenlos ein** (nach links wird sie abgezogen, über 100 % ist möglich); in der 3D-Ansicht liegen die Posen als
  Leiste („Asset Shelf“) unter der Bühne ([Blender-Handbuch](https://docs.blender.org/manual/en/latest/animation/armatures/posing/editing/pose_library.html)).
  Das ist das einfachste und eleganteste Modell für eine Posenbibliothek: Posen sind Bilder, die man anfasst.
- **Spine Graph:** Ein Regler „Favor“ erzeugt Zwischenposen zwischen zwei Schlüsseln, näher an der einen oder der anderen
  ([Spine Graph](https://esotericsoftware.com/spine-graph)). Das ist die digitale Form der Zwischenbild-Angaben, mit denen
  Zeichentrick-Animatoren festlegen, wohin die Zwischenbilder rücken.
- **Cascadeur AutoPosing:** Man bewegt wenige Regler (Füße, Hände, Richtung), der Rest des Körpers stellt sich passend ein; einzelne
  Regler lassen sich festhalten ([Hilfe AutoPosing](https://cascadeur.com/help/tools/autoposing)). Seit 2025.1 erzeugt eine
  „AI Inbetweening“ die Bewegung zwischen zwei Schlüsselposen aus Posen, Timing und Stil (zuerst höchstens 88, seit 2025.2 höchstens
  120 Bilder zwischen zwei Schlüsseln; seit 2025.3 je Abschnitt als Interpolationsart wählbar)
  ([Hilfe Inbetweening](https://cascadeur.com/help/category/278), [Digital Production 2025.2](https://digitalproduction.com/2025/07/31/cascadeur-2025-2-adds-motion-styles-tangent-editing-and-automatic-fulcrum-detection/)).
  Der Hersteller betont, dass Posen und Timing beim Animator bleiben; Grenzen nennt er offen: kaum Vierbeiner beim Inbetweening,
  keine Rücksicht auf Hindernisse, Trainingsdaten überwiegend aus eigenen Spielen
  ([Digital Production 2026](https://digitalproduction.com/2026/02/18/cascadeur-on-physics-ai-and-control/)).

**Lehre:** Posen sollen sichtbare Dinge sein (Karten mit Bild), die man anfasst, ganz oder teilweise anwendet und spiegelt; die
Zwischenbilder entstehen automatisch, ihre Verteilung (näher an A oder B) stellt man mit einem Regler ein, nicht mit Kurven je
Kanal.

### 2.2 Zustandsautomaten und Übergangsgraphen

**Unity (Mecanim).** Zustände enthalten Clips oder Blend Trees, Übergänge haben Bedingungen auf Parametern. Je Übergang: *Has Exit
Time* und *Exit Time* (ab welchem Anteil des Clips der Wechsel darf), *Fixed Duration* und *Transition Duration*, *Transition
Offset* (wo im Ziel-Clip begonnen wird) und *Interruption Source* (wer den Übergang unterbrechen darf: niemand, der alte, der neue
Zustand oder beide in einer Reihenfolge), dazu *Ordered Interruption*. Übergänge aus „Any State“ werden immer zuerst geprüft. Im
Inspector zeigt ein Diagramm das Mischfenster und die Fußkontakte beider Clips; man stellt Dauer und Versatz durch Ziehen ein
([Unity: Transitions](https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/class-transition)).
**Bei einer Unterbrechung merkt sich Unity die Pose des Augenblicks und blendet von dieser stehenden Pose zum neuen Ziel**; die
Geschwindigkeit geht verloren. Der Grund ist die Rechenlast vieler gleichzeitiger Übergänge. Der Beitrag des Unity-Teams räumt
selbst ein, dass unterbrechbare Übergänge „many opportunities to get lost in the complexity“ bieten
([Unity-Blog 2016](https://unity.com/blog/engine-platform/state-machine-transition-interruptions)). Gegen große Graphen gibt es
Unter-Automaten mit Ein- und Ausgang ([Unity-Tutorial](https://amara.org/subtitles/UyAgBXac0D8P/en/1/download/Animator%20Sub-state%20machine%20hierarchies%20-%20Unity%20Official%20Tutorials.en.txt))
und Ebenen (Abschnitt 2.5).

**Unreal (AnimGraph).** Zustandsautomaten mit Übergangsregeln als kleinen Logik-Graphen; *Conduits* bündeln Übergänge (einer zu
vielen, viele zu einem), *State Aliases* lassen mehrere Zustände dieselben Regeln teilen. Je Übergang wählt man die Art des
Mischens: *Standard Blend* (Dauer, Kurve), *Inertialization* oder einen eigenen Misch-Graphen; ein *Blend Profile* lässt einzelne
Knochen schneller oder langsamer mischen als andere
([Unreal: Transition Rules](https://dev.epicgames.com/documentation/en-us/unreal-engine/transition-rules-in-unreal-engine),
[State Machines](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-machines-in-unreal-engine)). Neuer ist die
**Chooser Table**: eine Tabelle, deren Zeilen mögliche Animationen sind und deren Spalten Bedingungen auf Variablen; gewählt wird
die passende Zeile (noch „experimentell“) ([Unreal: Chooser](https://dev.epicgames.com/documentation/en-us/unreal-engine/dynamic-asset-selection-in-unreal-engine)).
Das ist eine Tabelle statt eines Graphen, ein Gedanke, der für uns wichtig wird.

**Godot (AnimationTree).** Zustandsautomat mit Start und Ende. Je Übergang: *Switch Mode* (sofort; sofort, aber an derselben Stelle
im Ziel-Clip; erst am Ende), *Xfade Time* mit wahlweise eigener Kurve, Priorität, Bedingung oder Ausdruck (etwa
`velocity > 0`). Besonders: **`travel()` fährt über Zwischenzustände auf dem kürzesten Weg durch den Graphen (A*-Suche)**; gibt es
keinen Weg, springt es direkt. Daneben Blend Trees (Blend2/3, OneShot mit Ein- und Ausblenden, TimeScale) und BlendSpace1D/2D
(in 2D mit automatischer Delaunay-Dreiecksteilung)
([Godot: AnimationTree](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html),
[Godot: Transition](https://docs.godotengine.org/en/stable/classes/class_animationnodestatemachinetransition.html)).

**Rive.** Der Zustandsautomat lebt im Gestaltungswerkzeug selbst und richtet sich an Gestalter ohne Code
([Rive-Blog](https://rive.app/blog/how-state-machines-work-in-rive)). Zustände: Entry, Any State, Exit, einzelne Zeitleiste (mit
Tempo, negativ rückwärts), 1D-Mischung (eine Zahl mischt mehrere Zeitleisten; „Capture Base State“ sorgt dafür, dass derselbe
Wert immer dasselbe Bild gibt) und additive Mischung (mehrere Zeitleisten mit je 0 bis 100 %) ([Rive: States](https://rive.app/docs/editor/state-machine/states)).
Übergänge: Dauer (Standard 0, also ein harter Schnitt), Interpolation (Standard linear), Exit Time als Zeit oder Prozent,
Bedingungen (alle müssen gelten; mehrere Übergänge zwischen denselben Zuständen wirken als „oder“), „Pause Source When
Exiting“, Verlassen während des Übergangs erlauben, zufälliger Ausgang mit Gewichten
([Rive: Transitions](https://rive.app/docs/editor/state-machine/transitions)). Ebenen laufen gleichzeitig, je Ebene ein Zustand;
belegen zwei Ebenen dieselbe Eigenschaft, gewinnt die untere in der Liste ([Rive: Layers](https://rive.app/docs/editor/state-machine/layers)).
Für neue Arbeiten empfiehlt Rive „Data Binding“ statt einzelner Eingänge. Rives eigener Fehlersuche-Leitfaden rät: „Avoid
spaghetti state machines“, also Logik in Ebenen aufteilen und in verschachtelte Artboards zerlegen, aber nicht zu tief verschachteln
([Rive-Blog: Debugging](https://rive.app/blog/5-tips-to-debug-rive-files-like-a-developer)).

**Statecharts.** Die klassische Antwort auf explodierende Automaten (Harel, 1987): Zustände enthalten Unterzustände, ein Zustand kann
in **parallele Bereiche** geteilt sein, die gleichzeitig aktiv sind, Übergänge haben Wächter-Bedingungen und können verzögert
feuern, ein „History“-Zustand kehrt zum zuletzt aktiven Unterzustand zurück ([statecharts.dev](https://statecharts.dev/what-is-a-statechart.html)).
Unitys Unter-Automaten und Rives Ebenen sind Teilformen davon.

**Lehre:** Graphen machen Spiellogik sichtbar und sind für Gestalter erlernbar (Rive beweist es). Sie kippen aber schnell in
Unübersicht, und ihr Standardübergang (Überblenden mit fester Dauer) ist der schwächste Teil. Wer „jede in jede“ will, braucht
Abkürzungen: Any State, Wegsuche, Tabellen.

### 2.3 Spine: Standard-Mischzeit, Paare und Spuren

- **Mischen:** Wechselt die Animation einer Spur, überblendet Spine mit der Dauer aus `AnimationStateData`: einer **Standardzeit
  (`defaultMix`) für alle Paare und eigenen Zeiten für einzelne Paare (`setMix(von, nach, dauer)`)**; jeder Eintrag kann sie noch
  einmal überschreiben. Animationen lassen sich in eine Warteschlange stellen (`addAnimation`, Start vor dem Ende um die Mischzeit
  verschoben); „leere Animationen“ blenden in die Grundpose hinein und aus ihr heraus
  ([Spine: Applying Animations](https://esotericsoftware.com/spine-applying-animations),
  [API-Referenz](https://esotericsoftware.com/spine-api-reference)).
- **Kurve des Mischens:** bis 4.2 linear; seit 4.3 gibt es `mixInterpolation` für nicht-lineare Übergänge
  ([Spine 4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)).
- **Unterbrechen:** Kommt eine neue Animation mitten im Mischen, beginnt ein neues Mischen vom aktuellen Stand; die unterbrochene
  Animation blendet weiter aus (Ketten aus `mixingFrom`).
- **Spuren:** Höhere Spuren überschreiben nur die Eigenschaften, die sie schlüsseln; je Spur ein Anteil (`alpha`) und wahlweise
  additiv ([Spine: Preview](https://esotericsoftware.com/spine-preview)).
- **„Dipping“:** Schlüsseln zwei Animationen verschiedene Eigenschaften, scheint beim Überblenden die Pose darunter durch. Dagegen
  gab es `holdPrevious`; seit 4.3 verhindert die Laufzeit das von selbst.
- **Wo die Zeiten entstehen:** Im Editor probiert man Mischzeiten in der Vorschau aus (Regler „Mix“, Spuren, Anteil, additiv);
  festgelegt werden sie zur Laufzeit, im Code oder bei spine-unity im Inspector des SkeletonDataAsset (Standardzeit plus Liste
  eigener Paare) ([Spine: Preview](https://esotericsoftware.com/spine-preview),
  [Forum spine-unity](https://esotericsoftware.com/forum/d/9985)). Der Übergang ist damit eine Sache der Programmierung, nicht der
  Gestaltung.
- **Slider (4.3):** Eine Animation wird als Einschränkung angewendet, und zwar an einem wählbaren Bild; das Bild stellt man von Hand
  ein oder lässt es von einem Knochen steuern (Drehung, Lage, Größe oder Scherung werden auf einen Bereich von Bildern abgebildet),
  additiv oder ersetzend, mit Anteil ([Spine: Sliders](https://ar.esotericsoftware.com/spine-sliders)). Damit hat auch Spine einen
  Parameterraum bekommen: Eine Animation wird zur Achse von Posen.
- **Zeitleiste:** Das Dopesheet zeigt Schlüssel je Knochen und Eigenschaft, farbig nach Art, mit Filtern; der Graph zeigt
  Bézier-Kurven je Kanal mit Vorlagen ([Spine: Dopesheet](https://esotericsoftware.com/spine-dopesheet),
  [Spine: Graph](https://esotericsoftware.com/spine-graph)).

**Lehre:** „Eine Standardzeit plus Ausnahmen je Paar“ ist das kleinste vollständige Modell für „jede in jede“. Was fehlt: Ein
Übergang ist dort nur eine Dauer mit Kurve, kein Weg; man kann keine Zwischenpose einfügen; und die Zeiten gehören nicht dem, der
die Figur gestaltet.

### 2.4 Parameterraum: Posen als Punkte in einem Feld

- **Blend Spaces.** Unity: Clips als Punkte in einem 1D- oder 2D-Raum, das Gewicht hängt vom Abstand zum roten Punkt der
  Parameter ab; Arten für Richtungen (Gehen in vier Richtungen) und für freie Achsen (Tempo × Drehung); dazu „Direct“, wo jedes
  Gewicht direkt gesetzt wird, etwa für Gesichtsformen
  ([Unity: 2D Blending](https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/animation-blend-trees/blend-tree-2dblending)).
  Unreal: Raster oder Dreiecksteilung, Glättung über eine Zeit, rote Linien zeigen schlechte Dreiecke
  ([Unreal: Blend Spaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blend-spaces-in-unreal-engine),
  [automatische Blend Spaces](https://dev.epicgames.com/documentation/unreal-engine/automatic-blend-space-creation-in-unreal-engine?lang=en-US));
  ein Nutzer merkt an, dass dort meist nur drei Clips zugleich gemischt werden
  ([Forum](https://forums.unrealengine.com/t/anybody-know-how-the-blend-space-interpolation-algorithm-works/102044)).
  Godot teilt den 2D-Raum automatisch in Dreiecke (Delaunay).
- **Aim Offset (Unreal):** ein additiver Blend Space aus Blickrichtungen, der auf jede Grundbewegung gelegt wird
  ([Unreal: Aim Offset](https://dev.epicgames.com/documentation/en-us/unreal-engine/aim-offset-in-unreal-engine)). Für Ozzy heißt das:
  Blick und Kopfneigung als additives Feld über Stehen, Tapsen und Sitzen.
- **Live2D Cubism:** Parameter mit Minimum, Standard und Maximum; an Schlüsselwerten legt man Formen an („Keyforms“), dazwischen
  wird automatisch interpoliert; Bewegung entsteht, indem man Parameter animiert
  ([Live2D: Parameter](https://docs.live2d.com/en/cubism-editor-manual/parameter/)). Zwei Parameter mit je drei Schlüsseln ergeben
  ein Raster aus 3 × 3 = 9 Formen ([Keyforms X/Y](https://docs.live2d.com/en/cubism-editor-manual/keyform-xydirection/)).
  Seit 4.2 gibt es „Blend Shapes“: Unterschiede (Gewicht × Formunterschied), die sich addieren, ohne dass sich die Keyforms
  vervielfachen, mit Einschränkungen bei Bearbeitung und Interpolation ([Live2D: Blend Shape](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/)).
  Ausdrücke setzen Parameter (ersetzen, addieren oder multiplizieren); Physik schreibt eigene Ausgangs-Parameter und gewinnt immer
  ([VTube Studio Wiki](https://github.com/DenchiSoft/VTubeStudio/wiki/Expressions-(a.k.a.-Stickers-or-Emotes))).
- **Toon Boom Harmony, Master Controller:** Assistenten bauen aus gezeichneten Posen einen Schieberegler (eine Achse) oder ein
  Raster (ein Punkt in 2D, Spalten × Zeilen Posen, alle Felder müssen gefüllt sein); bewegt man den Punkt, wird aus den nächsten
  Posen gemischt. Die Dokumentation warnt: Liegen eine Pose und ihre gespiegelte Fassung nebeneinander, staucht sich die Figur
  dazwischen ([Grid Wizard](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-grid-wizard.html),
  [Slider Wizard](https://docs.toonboom.com/help/harmony-20/premium/master-controller/use-slider-wizard.html)). Genau dieses
  Stauchen löst bei uns der Faltschlüssel im Raster der Kopfdrehung.
- **Rive Joysticks:** Ein Griff scrubbt mit seiner X- und Y-Lage je eine Zeitleiste; mit nur einer Achse wird er zum Schieberegler;
  sein Griff kann einem anderen Objekt folgen (dem Zeiger) und selbst geschlüsselt werden
  ([Rive: Joysticks](https://rive.app/docs/editor/manipulating-shapes/joysticks)). Damit bauen Nutzer Kopfdrehungen
  (Recherche vom 18.11.: [`2026-11-18-ozzy-figur-recherche.md`](../2026-11-18-ozzy-figur-recherche.md)).
- **Joysticks 'n Sliders (After Effects):** Ein Joystick entsteht aus fünf Schlüsselposen (Mitte und vier Ränder), dazwischen wird
  gefüllt; Schieberegler haben beliebig viele Posen. Testbericht: sehr einfach einzurichten, aber **zwischen den Posen lassen sich
  keine Schlüssel setzen**; das freie Werkzeug DUIK kann das
  ([School of Motion](https://schoolofmotion.com/blog/after-effects-tool-review-joysticks-n-sliders-vs-duik-bassel)).
- **Moho Smart Bones:** Die Drehung eines Knochens steuert eine Aktion (Korrekturform, Morph, ganze Bewegung); auch als „Drehknopf“
  ohne sichtbaren Körperteil. Foren berichten, dass tief verschachtelte Smart Bones brechen
  ([Lester Banks](https://lesterbanks.com/2016/11/working-mohos-smart-bone-actions/), [Moho-Forum](https://lostmarble.com/forum/viewtopic.php?p=180929)).
- **Theorie dazu:** „Pose Space Deformation“ (Lewis, Cordner, Fong, SIGGRAPH 2000) fasst Formen als Abbildung aus einem Posenraum
  (Skelett oder abstrakte Parameter) auf Verschiebungen auf; an beliebigen Posen modellierte Formen werden durch verstreute
  Interpolation verbunden ([PDF](https://www.scribblethink.org/Work/PSD/PSD.pdf)). Korrekturformen, Blend Shapes und Smart Bones
  sind Spielarten davon.

**Lehre:** So drehen und spielen professionelle 2D-Figuren. Ein Übergang ist hier einfach eine Bewegung des Punkts im Feld, und das
Spiel kann den Punkt direkt bewegen. Grenzen: Jede weitere Achse vervielfacht die Schlüssel; Dreiecksteilungen erzeugen Knicke im
Tempo, wo der Punkt eine Dreieckskante kreuzt (eigene Folgerung: Die Mischung ist dort nur stetig, nicht glatt); gespiegelte
Nachbarn stauchen; das Feld kennt keine Zeit (kein Ausholen, kein Nachfedern) und zeigt nur, was gezeichnet ist.

### 2.5 Ebenen und Masken

- **Unity:** Ebenen ersetzen (*Override*) oder addieren (*Additive*); eine Maske legt fest, welche Körperteile eine Ebene betrifft
  (Werfen nur oben, Gehen unten); „Sync“-Ebenen übernehmen die Struktur einer anderen Ebene mit anderen Clips, etwa eine verletzte
  Fassung von Gehen, Laufen und Springen
  ([Unity: Layers](https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/animation-layers)).
- **Spine:** Spuren mit Anteil und additiv (Abschnitt 2.3). **Rive:** Ebenen und additive Mischzustände. **Unreal:** Aim Offset
  (additiv). **Live2D:** Ausdrücke addieren oder multiplizieren Parameter. **Godot:** OneShot blendet eine Geste ein und aus.

**Lehre:** Ebenen sind der Grund, warum Spielfiguren mit wenigen Posen auskommen. Ohne Ebenen braucht „Sitzen und dabei nach links
schauen und dabei ängstlich“ eine eigene Pose; mit Ebenen ergibt es sich.

### 2.6 Motion Matching

- **Verfahren:** In jedem Bild durchsucht das Spiel eine Datenbank von Bewegungsaufnahmen nach dem Bild, das am besten zur
  aktuellen Pose und zur gewünschten Bahn der nächsten Augenblicke passt, und springt mit kurzem Überblenden dorthin. Ubisoft
  (Clavet, GDC 2016) nahm dafür fünf bis zehn Minuten freies Herumlaufen auf, statt Anfänge, Stopps und Drehungen einzeln zu
  ordnen; Spiellogik kommt als Markierung obendrauf
  ([GDC Vault](https://www.gdcvault.com/play/1022985/Motion-Matching-and-The-Road)).
- **Unreal Pose Search** (seit 5.4 serienreif): Schema mit Kanälen (Bahn, Pose), Datenbank, Kostenfunktion, Trägheits-Übergänge
  zwischen den gefundenen Stücken; ersetzt Zustandsautomaten und Blend Spaces, braucht aber viele passende Daten (Gehen, Laufen,
  Drehen, Anhalten, Starten) ([Unreal: Motion Matching](https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine),
  [Unreal 5.4](https://www.unrealengine.com/en-US/blog/unreal-engine-5-4-is-now-available)).

**Lehre:** Für handgezeichnete Vektorfiguren nicht machbar: Niemand zeichnet Minuten an Bewegung. Zwei kleine Gedanken daraus
taugen aber: die nächste Pose nach **Ähnlichkeit** wählen (welches Aufstehen passt zur Lage, in der Ozzy gerade liegt) und beim
Eintritt in einen Zyklus die **Phase** treffen (Abschnitt 2.7).

### 2.7 Trägheits-Übergänge und Federn

- **Inertialization (Bollo, SIGGRAPH 2017, GDC 2018, „Gears of War 4“):** Statt zu überblenden, schneidet das Spiel sofort auf das
  Ziel und glättet nachträglich. Beim Wechsel werden die Geschwindigkeit der alten Bewegung und der Unterschied zwischen alter und
  neuer Pose gemerkt; ein Polynom fünften Grades beginnt mit genau diesem Unterschied und dieser Geschwindigkeit und läuft bis zum
  Ende der Übergangszeit auf null; es wird auf das Ziel addiert. Über die Anfangsbeschleunigung wird verhindert, dass es
  überschwingt. Bollo zeigt die Alternativen: nur die Pose angleichen (Geschwindigkeit springt) oder die Geschwindigkeit naiv
  übernehmen (schwingt über). Weil die alte Bewegung nicht weiterlaufen muss, war es 60 % billiger als Überblenden
  ([SIGGRAPH-Talk, PDF](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Bollo_High-Performance-Animation-in-Gears-of-War-4.pdf),
  [GDC Vault](https://gdcvault.com/play/1025165/Inertialization-High-Performance-Animation-Transitions)).
  Im selben Vortrag: **Phasenabgleich.** Aus der Lage des linken Fußes zum rechten wird eine Phase gerechnet; kehrt die Figur in den
  Gang zurück, beginnt der Gang an dem Bild, das zu dieser Phase passt.
- **Federn (Holden, „Spring-It-On“, 2021):** Ein Dämpfer, der unabhängig von der Bildrate ist, wird über seine **Halbwertszeit**
  eingestellt; eine Feder mit Geschwindigkeit hält Richtungswechsel des Ziels stetig; kritische Dämpfung erreicht das Ziel am
  schnellsten ohne Überschwingen; mit dem Dämpfungsverhältnis wird sie weicher oder federnder. Trägheits-Übergänge gehen auch mit
  Federn: beim Wechsel Versatz und Geschwindigkeit merken, auf die neue Bewegung addieren, mit einer Feder abklingen lassen. Dazu
  eine Feder, die ihr Ziel zu einer gewählten Zeit erreicht, und eine doppelte Feder für weiches Anfahren und Abbremsen
  ([theorangeduck.com](https://theorangeduck.com/page/spring-roll-call)). Eine Variante folgt einem Signal genau, wo es sauber ist,
  und glättet nur Sprünge ([Tracking Springs](https://theorangeduck.com/page/perfect-tracking-springs)).
- **Dead Blending (Holden, 2023):** Die alte Bewegung wird mit abklingender Geschwindigkeit fortgeschrieben und in die neue
  überblendet. Braucht nur die aktuelle Pose und ihre Geschwindigkeit, macht bei sehr verschiedenen Posen weniger Fehler, dämpft
  aber manchmal Einzelheiten. Für Drehungen hält es die Richtung des Überblendens fest, damit nichts zwischen +175° und −175°
  umspringt ([Dead Blending](https://theorangeduck.com/page/dead-blending)). In Unreal seit 5.3 als Knoten, als Ersatz für den
  Trägheits-Knoten ([Unreal API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/FAnimNode_DeadBlending),
  [Erfahrungsbericht](https://www.theorangeduck.com/page/dead-blending-node-unreal-engine)).
- **Apple, „Designing Fluid Interfaces“ (WWDC 2018):** Federn mit zwei Größen, Dämpfung (100 % = kein Überschwingen) und Ansprechen
  (wie schnell). Rat: mit 100 % beginnen und nur dann federn lassen, wenn die Geste Schwung hat (Musik-App: Antippen 100 %,
  Wegwischen 80 %). Statt zeitgesteuerter Animationen laufen ständig Verhaltensweisen, die man jederzeit umlenken kann; elastische
  Bewegungen beschreibt man bewusst nicht mit einer Dauer. Die Geschwindigkeit der Geste wird weitergerechnet, um das Ziel zu
  finden ([Apple Developer](https://developer.apple.com/videos/play/wwdc2018/803/)).

**Lehre:** Ein Standardübergang von jeder Pose in jede andere muss die Geschwindigkeit erhalten, jederzeit umlenkbar und billig
sein. Trägheit und Federn leisten das; Überblenden nicht. Aber: Beide glätten nur. Ausholen, Zwischenposen und Gags erfinden sie
nicht; die müssen gestaltet werden.

### 2.8 Aufnahme statt Schlüsselbilder

- **Procreate Dreams, „Performing“:** Abspielkopf setzen, Perform antippen, auf der Bühne ziehen: Bewegen, Drehen, Skalieren,
  Verzerren und Filter werden in Echtzeit als Schlüssel aufgenommen; Finger heben hält an; ein Regler „Motion Filtering“ glättet
  (0 % nimmt jedes Zittern mit); mehrere Aufnahmen verschiedener Art liegen übereinander, gleiche Art ersetzt
  ([Procreate Handbuch](https://help.procreate.com/dreams/handbook/keyframes-and-performing/performing)).
- **Adobe Character Animator:** Ganz auf Aufführung gebaut: Verhalten (Gesicht, gezogene Griffe, Auslöser) werden zur Aufnahme
  „scharf“ geschaltet, jede Aufnahme ist ein Balken („Take“) in der Zeitleiste, Takes lassen sich mit weichem Ein- und Ausblenden
  verbinden (Standard eine halbe Sekunde); wiederholte Auslöser erscheinen als kompakte Balken; Physik und Gehen werden simuliert,
  nicht in die Zeitleiste gebacken ([Adobe Tutorial](https://www.adobe.com/learn/adobe-character-animator/web/recording-editing-performances),
  [Adobe Hilfe](https://helpx.adobe.com/adobe-character-animator/using/record-and-playback.html)).
- **Bret Victor, „Stop Drawing Dead Fish“ (2012):** Werkzeuge sollen die Reaktionsfähigkeit einer Simulation mit der Spontaneität
  einer Aufführung verbinden; heutige Werkzeuge liefern feste, tote Ergebnisse, lebendiges Verhalten gibt es nur per Code
  ([SF SIGGRAPH](https://san-francisco.siggraph.org/?p=712), [Video](https://vimeo.com/36579366)).

**Lehre:** Aufnahme findet Timing schneller als jedes Schlüsselsetzen und passt perfekt zu Finger und Stift. Sie braucht gute Regler
(was man aufnimmt), Glättung und ein Ausdünnen auf wenige Schlüssel, sonst ist sie nicht mehr zu bearbeiten.

### 2.9 Prozedural und Physik

- **Overgrowth (Rosen, GDC 2014):** einfache prozedurale Techniken für flüssige, interaktive Bewegung mit sehr wenigen
  Schlüsselbildern ([GDC Vault](https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach)). Nach Berichten von
  Zuschauern waren es 13 Schlüsselbilder für alle Fortbewegung, dazwischen federnde Interpolation, Lauf-Zyklen aus drei bis vier
  Posen und zuerst die Physik, dann die Animation darauf
  ([Unity-Forum](https://discussions.unity.com/t/an-indie-approach-to-procedural-animation-gdc-video-talk/538228),
  [Polycount](https://polycount.com/discussion/comment/2093086)).
- **Cascadeur AutoPhysics:** Ein zweiter, andersfarbiger Charakter („Physical Assistant“) zeigt die physikalisch richtige Fassung
  der Animation; die Zeitleiste färbt Abschnitte nach Kontakten (ballistisch, wenige, viele Stützpunkte); man übernimmt per Knopf;
  besonders gewichtete Bilder behalten ihre Pose; ist keine Lösung möglich, wird es rot. Sekundärbewegung macht die Bewegung
  weicher und betonter und gehört ans Ende der Arbeit
  ([Hilfe AutoPhysics](https://cascadeur.com/help/tools/physics_tools/autophysics),
  [Stützpunkte](https://cascadeur.com/help/tools/physics_tools/autophysics/fulcrum_points)). Der Hersteller beschreibt, dass
  abstrakte Physik-Begriffe Animatoren abschreckten und das **Vorzeigen** als Geist besser ankam
  ([Digital Production 2026](https://digitalproduction.com/2026/02/18/cascadeur-on-physics-ai-and-control/)).
- **Character Animator:** Physik, Atmen, Gehen und Wackeln laufen als Verhalten ohne Schlüssel
  ([Adobe Hilfe](https://helpx.adobe.com/adobe-character-animator/using/record-and-playback.html)).
- **Live2D:** Haarschwingen ist Physik, die eigene Parameter schreibt und alles andere überschreibt (Abschnitt 2.4).
- **Spine 4.2/4.3:** Physik-Einschränkungen (Dämpfung, Trägheit, Wind, Schwerkraft), in 4.3 stabiler bei niedriger Bildrate, und auf
  Wunsch in Schlüssel backbar ([Spine 4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)).

**Lehre:** Physik läuft am besten immer, schreibt in sichtbare Werte (Live2D) und schlägt vor, statt zu bestimmen (Cascadeur). Für
den Art Director heißt das: Er stellt Charakter ein (wie weich, wie träge, wie stark) und sieht das Ergebnis sofort.

### 2.10 Die klassische Zeitleiste heute

Spine, Rive und After Effects zeigen Schlüssel je Teil und Eigenschaft; Kurven bearbeitet man je Kanal im Graphen; Zwiebelhaut
zeigt Nachbarbilder. **Stärken:** genaues Timing, jede Einzelheit möglich, jeder kennt sie. **Schwächen für unseren Fall:** Eine
Pose ist über viele Zeilen verteilt und als Ganzes nicht greifbar; Übergänge zwischen Clips liegen in einem anderen System (bei
Spine in der Laufzeit); für Spielreaktionen braucht es ohnehin einen Automaten obendrauf; auf dem Telefon wird sie eng. Florians
heutige Zeitleiste der Kopfdrehung ist bereits eine Abwandlung: Ihre Achse ist der **Winkel**, nicht die Zeit, und je Teil gibt es
nur eine Zeile.

---

## 3. Muster, die sich durch alle guten Lösungen ziehen

1. **Standard plus Ausnahmen.** Eine Regel für alle Paare, eigene Regeln nur, wo das Auge es verlangt (Spine, Any State).
2. **Posen sind Dinge mit Bild** (Blender), keine verstreuten Schlüssel.
3. **Formen hängen an Reglern, Bewegung bewegt Regler** (Live2D, Toon Boom, Rive, Spine-Slider, Pose Space Deformation).
4. **Ebenen statt Kombinationen** (Unity, Spine, Rive, Aim Offset).
5. **Übergänge erhalten die Geschwindigkeit und lassen sich jederzeit umlenken** (Bollo, Holden, Apple).
6. **Zeit wird nur gestaltet, wo eine Bewegung etwas erzählt** (Hinsetzen, Stolpern, Gag); Reaktionen auf das Spiel brauchen keine
   Zeitleiste, sondern Regler und Federn.
7. **Physik schlägt vor, das Auge entscheidet** (Cascadeur).
8. **Vorspielen ist die schnellste Art, Timing zu finden** (Procreate Dreams, Character Animator, Bret Victor).
9. **Logik bleibt klein und geschichtet** (Statecharts; Rives eigener Rat gegen Spaghetti; Unreals Tabellen).
10. **Kontakte und Phase zählen** (Fußkontakte im Unity-Diagramm, Stützpunkte in Cascadeur, Phasenabgleich bei Bollo).

---

## 4. Ehrliche Gegenüberstellung für unseren Fall

**Unser Fall:** ein Figuren- und Physik-Spieleditor; ein Art Director ohne Programmierkenntnisse, der mit dem Auge entscheidet und
Übergänge selbst formen will; Mac, iPad und iPhone; Vektorformen, die genau wie seine Zeichnungen aussehen müssen und nie springen,
rutschen oder verklumpen dürfen; eine Spielfigur, die laufend auf ein drehendes Rad reagiert.

### 4.1 Welches Ordnungsprinzip?

●●● stark, ●●○ mittel, ●○○ schwach (Einschätzung aus der Recherche, nicht gemessen)

| | Übersicht | Ausdruck (Timing, Ausholen, Überlappung) | Spiel und Unterbrechung | Physik passt dazu | Ohne Programmieren | Touch | Glätte garantiert | Bauaufwand für uns |
|---|---|---|---|---|---|---|---|---|
| Klassische Zeitleiste (Kanäle) | ●○○ | ●●● | ●○○ | ●○○ | ●●○ | ●○○ | ●●○ | gering (Leiste da) |
| Posengraph (Automat) | ●●○ bis 8 Zustände | ●○○ | ●●● | ●●○ | ●○○ | ●●○ | ●○○ | mittel |
| Standard + Ausnahmen (Spine-Tafel) | ●●● | ●○○ | ●●○ | ●●○ | ●●● | ●●○ | ●●○ | gering |
| Parameterraum (Leisten, Felder) | ●●● | ●●○ (Form ja, Zeit nein) | ●●● | ●●● | ●●○ | ●●● | ●●● | mittel (Kopf-Raster da) |
| Aufnahme | ●●○ | ●●● (Timing) | ●○○ | ●○○ | ●●● | ●●● | ●○○ (Zittern) | mittel |
| Prozedural und Physik | ●○○ ohne Vorschau | ●●○ | ●●● | ●●● | ●○○ (Zahlen) | ●●○ | ●●● | hoch (Abstimmung) |
| Motion Matching | ●○○ | hängt an Daten | ●●● | ●●○ | ●○○ | – | ●●○ | nicht machbar (Daten) |
| **Posen, Regler, Wege (Vorschlag)** | ●●● | ●●● | ●●● | ●●● | ●●○ | ●●● | ●●● | mittel bis hoch |

**Urteil:**

- **Klassische Zeitleiste** bleibt nötig, aber klein: als Taktleiste innerhalb eines gestalteten Wegs und als Ansicht für Experten.
  Als Ordnungsprinzip taugt sie für einen Film, nicht für eine Spielfigur.
- **Posengraph** ist richtig für die wenigen diskreten Zustände des Spiels (Stehen, Tapsen, Stolpern, Fallen, Aufstehen). Er muss
  klein bleiben (Ebenen statt Kombinationen, Gruppen statt Spaghetti) und darf nicht der Ort sein, an dem Übergänge gestaltet werden.
- **Standard plus Ausnahmen** ist das richtige Datenmodell für „jede in jede“; der Inhalt eines Übergangs muss aber reicher sein
  als eine Dauer.
- **Parameterraum** ist der Kern: Florians Kopfdrehung ist schon einer. Balance, Tempo, Blick und Stimmung werden Regler; das Spiel
  bewegt sie.
- **Aufnahme** kommt als Eingabe dazu (Regler live spielen), nicht als eigenes System.
- **Prozedural und Physik** sind Pflicht für das Rad-Spiel, aber als Ebene mit sichtbaren Reglern und Vorschau.
- **Motion Matching** und KI-Zwischenbilder: nein. Übernommen werden nur Phasenabgleich und Auswahl nach Ähnlichkeit.

### 4.2 Wie legt man „jede Pose in jede andere“ fest?

| Möglichkeit | Wer nutzt es | Stärke | Schwäche | Für uns |
|---|---|---|---|---|
| Volle Matrix (jede Zelle ausgefüllt) | niemand als Pflicht | vollständig, nichts geht vergessen | N × (N − 1) Zellen: 10 Posen = 90 Übergänge | nur als **Ansicht** |
| Standard + Ausnahmen je Paar | Spine | kleinster Aufwand, vorhersehbar | Übergang ist nur eine Dauer | **Datenmodell** |
| Graph mit Pfeilen und Any State | Unity, Unreal, Rive | Logik sichtbar | Spaghetti, Bedingungen, Unterbrechungsregeln | nur Ausnahmen zeigen |
| Graph mit Wegsuche | Godot `travel()` | man nennt nur das Ziel, Zwischenposen ergeben sich | Weg nicht immer der, den das Auge will | als Option „über X“ |
| Bewegung im Parameterraum | Live2D, Blend Spaces | jeder Übergang liegt auf gezeichneten Formen | keine Zeit, kein Ausholen | für Regler |
| Automatisch nach Ähnlichkeit | Motion Matching | keine Logik nötig | braucht Unmengen Daten | nur für Auswahl (Aufstehen) |

**Urteil:** Gespeichert wird „Standard plus Ausnahmen“. Gezeigt wird beides: eine **Tafel** (Zeilen: von, Spalten: nach), in der
jede Zelle anklickbar ist, damit Florian wirklich jeden Übergang bestimmen kann und sieht, welche noch Standard sind; und eine
**Karte** der Posen, auf der nur die Ausnahmen als Pfeile stehen. Eine Zelle kann sein: Standard (leer), eigenes Tempo, „über X“
(Wegsuche durch gestaltete Wege), gestalteter Weg (Zwischenposen) oder gesperrt.

### 4.3 Wie rechnet ein Übergang?

| Art | Wer | Geschwindigkeit stetig | Unterbrechbar | Überschwingen | Kosten | Für Vektorformen |
|---|---|---|---|---|---|---|
| Lineares Überblenden, feste Dauer | Spine (bis 4.2), Rive (Standard), Unity | nein (Knick an Anfang und Ende) | ja, neues Mischen | nein | zwei Posen | schneidet die Ecke, wenn im Formraum |
| Überblenden von eingefrorener Pose | Unity bei Unterbrechung | nein | ja | nein | gering | wirkt abrupt |
| Feder folgt dem Ziel (Tiefpass) | Prototyp heute | ja | ja | einstellbar | gering | glatt, aber Zeiten verschoben und Akzente gedämpft |
| Trägheit mit Polynom (Bollo) | Gears of War, Unreal | ja | ja | nein (erzwungen) | eine Pose + Versatz | gut, feste Übergangszeit |
| Trägheit mit Feder (Holden) | Spielebranche | ja | ja | einstellbar | eine Pose + Versatz | gut, Zeit ergibt sich |
| Dead Blending | Unreal 5.3+ | ja | ja | selten (liegt zwischen fortgeschriebener alter und neuer Bewegung) | gering | robuster bei sehr verschiedenen Posen |
| Weg im Reglerraum | Live2D, Toon Boom | je nach Feder | ja | je nach Feder | Regler statt Anker | **bleibt auf Florians Schlüsseln** |

**Urteil:** Übergänge laufen **im Reglerraum** (Kopfwinkel, Haltungsgewichte, Phase, Maul), damit jede Zwischenstellung eine
gezeichnete ist. Darauf wirkt als Standard ein **Trägheits-Ausgleich mit kritisch gedämpfter Feder**: beim Wechsel Versatz und
Geschwindigkeit merken, abklingen lassen, das Ziel läuft unverändert. Für gestaltete Wege ändert das nichts an Florians Zeiten; für
Spielregler (Ziel springt dauernd) bleibt die heutige „Feder folgt“. Dead Blending lohnt einen Vergleich bei sehr verschiedenen
Posen (Stolpern aus vollem Lauf).

### 4.4 Klassische Zeitleiste oder etwas anderes?

| Möglichkeit | Stärke | Schwäche | Urteil |
|---|---|---|---|
| Dopesheet + Kurven je Kanal | volle Kontrolle | viele Zeilen, Pose nicht greifbar | Expertenansicht |
| Taktleiste: Posenkarten auf der Zeit, je Abschnitt eine Kurvenart und Zusatzbewegungen | Pose zu Pose, wenige Elemente, passt zu den Abläufen des Prototyps | feinste Einzelheiten nur über Spuren | **Standard für gestaltete Wege** |
| Federn ohne Zeit | lebendig, unterbrechbar, nichts einzustellen | keine genaue Zeit für Gags | **Standard für Reaktionen** |
| Aufnahme | lebendiges Timing, Finger | Zittern, viele Schlüssel | **Eingabe** für Regler-Spuren |

### 4.5 Kombinationen (Haltung × Blick × Stimmung)

Eigene Pose je Kombination wächst als Produkt (5 Haltungen × 3 Blickrichtungen × 4 Stimmungen = 60 Posen). Ebenen mit Masken
brauchen 5 + 3 + 4 = 12 und kombinieren den Rest (Statecharts nennen das parallele Bereiche). **Urteil: Ebenen**, drei bis vier
feste (Körper, Kopf und Blick, Gesicht, Physik), mit Maske je Teil und Art (ersetzen oder addieren).

---

## 5. Vorschlag: Posen, Regler, Wege

### 5.1 Leitgedanke

Zeit wird nur dort gezeigt, wo sie gestaltet wird. Eine Spielfigur verbringt fast ihre ganze Zeit in Reaktionen (das Rad kippt,
Ozzy gleicht aus); dafür braucht sie Posen, Regler und Federn, keine Zeitleiste. Nur erzählte Bewegungen (Hinsetzen mit Hüpfer,
Stolpern, Aufstehen) bekommen eine kurze Taktleiste, und die lebt im Übergang selbst.

### 5.2 Eine Bediengrammatik: Alles ist eine Leiste mit Schlüsseln

Florians heutige Zeitleiste der Kopfdrehung (Schlüssel je Teil über den Winkel, Klick springt, Ziehen dreht, J und K springen zum
vorigen und nächsten Schlüssel, Z zeigt die Zwiebelhaut, Farben nach Herkunft: Vorlage, gebaut, seins) wird **die eine Leiste für
alles**:

| Leiste | Achse | Wer bewegt sie |
|---|---|---|
| Kopfdrehung | Winkel 0° bis 360°, rund | Spiel, Pose, Hand |
| Maul, Ohren, Stirn | 0 bis 1 | Pose, Hand, Ausdruck |
| Gang | Phase 0 bis 1, rund | Zeit × Tempo |
| Gestalteter Weg | Fortschritt 0 bis 1 (Dauer in Sekunden) | Zeit |
| Balance | −1 bis +1 | Physik, Spiel |

Überall gilt dasselbe: **Klick** springt an die Stelle, **Ziehen** fährt die Achse, **Zeichnen auf der Bühne** (Anker, Griffe,
Knochen) setzt an dieser Stelle einen Schlüssel, **Z** zeigt Schlüssel davor und danach, **J/K** springen, **Halten** auf einem
Schlüssel öffnet Kurvenart, Kopieren, Spiegeln, Löschen. Ein **Feld** (zwei Achsen) bedient sich genauso, nur in der Fläche:
Schlüssel sind Punkte, die Zwiebelhaut zeigt die Nachbarn. Wer eine Leiste kann, kann alle.

### 5.3 Posen

- **Posenleiste unter der Bühne** (wie Blenders Asset Shelf): Karten mit Vorschaubild, gruppiert nach Ebene.
- **Pose speichern:** den aktuellen Stand der Regler und Knochen als Karte festhalten; wahlweise nur für gewählte Teile.
- **Pose anwenden:** Antippen springt (über den Standardweg); **Ziehen der Karte nach rechts blendet stufenlos ein** (Blender).
  Gespiegelt anwenden über ein Halten-Menü.
- **Pose bearbeiten:** Karte wählen, auf der Bühne mit denselben Werkzeugen wie bei Schlüsseln arbeiten. Was sich nicht über Regler
  ausdrücken lässt, wird eine **Korrekturform** der Pose (Versatz einzelner Anker und Griffe), die mit dem Gewicht der Pose mitgeht.
  So arbeitet der Prototyp schon (Knochen plus Korrekturform je Haltung).
- **Verweilen:** Was eine Pose tut, solange sie gilt (Atmen, Schnüffeln, Wedeln), steht in ihrer Karte (siehe 5.5: die Diagonale).

### 5.4 Regler

- **Leiste** (eine Achse) oder **Feld** (zwei Achsen) mit Schlüsselformen. Regelmäßige Raster wie bei Live2D und Toon Boom haben
  Vorrang vor freier Dreiecksteilung: Sie mischen glatt (PCHIP wie im Kopf-Raster) und lassen sich in Florians Weise füllen
  (Ränder und Mitte zuerst, dann Ecken).
- **Faltschlüssel** bleiben, wo Anker aneinander vorbeilaufen würden; gespiegelte Nachbarn stauchen sonst (Toon-Boom-Warnung).
- **Wer einen Regler bewegt:** die Hand, eine Pose (Posen speichern Reglerwerte), die Zeit (Gang, Weg), das Spiel (Neigung, Tempo)
  oder ein Knochen (wie Spine-Slider und Moho-Smart-Bones). Diese Quellen sind sichtbar am Regler angeschrieben.
- **Runde Regler** (Kopf 360°, Phase) nehmen den kürzeren Weg über 0°/360° und halten die Richtung während eines Wechsels fest
  (wie Holdens Lösung für ±175°).
- **Tempo-Grenze** je Regler (der Prototyp hat 160°/s für den Kopf): Das Ziel läuft höchstens so schnell, die Feder glättet.

### 5.5 Wege

**Standardweg.** Jeder Wechsel ohne eigene Gestaltung ist ein Trägheits-Ausgleich im Reglerraum mit einer Feder. Global einstellbar
mit zwei Reglern: **Tempo** (Halbwertszeit) und **Federung** (100 % = kein Überschwingen, darunter federt es nach; Apples Rat: mit
100 % beginnen). Dazu **Nachlauf je Teil** (wie Unreals Blend Profile): Kopf, Ohren, Schwanz und Bart kommen etwas später an; das
ergibt Überlappung bei jedem Wechsel, ohne einen Schlüssel. Vorschlag, noch unbewiesen: zwei weitere Regler **Ausholen** (eine kurze
Gegenbewegung vor dem Wechsel) und **Nachfedern**; ob das gut aussieht, entscheidet Florians Auge.

**Gestalteter Weg** (heute „Ablauf“). Ein Paar (von, nach) bekommt einen eigenen Weg, sobald Florian in der Tafel die Zelle öffnet
und etwas ändert. Er sieht dann eine **Taktleiste**:

```
Stehen ──weich 0,20 s──▶ [Ausholen] ──linear 0,34 s──▶ [Sitzen]
  Zusatz:              Hüpfer 0,12 ▁▂▃▂▁        Plumps ▼ (klingt 0,7 s aus)
  bleibt stehen:  ███ alle Pfoten ███        ███ Vorderpfoten ███
```

- **Zwischenposen** als Karten auf der Zeit; neue per „+“ an der gerade gezeigten Stelle (Schnappschuss, danach bearbeiten). Das ist
  Pose zu Pose: Die Karten sind die Schlüssel des Wegs.
- **Abschnitte** dazwischen mit Dauer (Kante ziehen) und Kurvenart (weich, fallen, auf, linear, Feder); ein **Verteilungs-Regler**
  wie Spines „Favor“ statt Kurvengriffen.
- **Zusatzbewegungen** als Blöcke (Hüpfer, Plumps, Seufzer, Wedeln) auf eigener Zeile; sie addieren auf Regler oder Knochen.
- **Was stehen bleibt** (Pfoten vorn, hinten, alle, Hintern) als Balken; die Figur verschiebt sich dann als Ganzes, statt zu rutschen
  (gibt es im Prototyp schon).
- **Spuren** (Expertenstufe): Kurven einzelner Regler im Weg, etwa ein aufgenommener Blick. Erst sichtbar, wenn gebraucht.
- **Tempo** des ganzen Wegs als Faktor (der Prototyp hat ihn); Varianten desselben Paars (Hinsetzen normal und mit Hüpfer) wählt das
  Spiel über einen Wert, den Zufall mit Gewichten (wie Rive) oder Florian per Knopf.

**Tafel und Karte.** Die Tafel zeigt alle Paare (Zeilen von, Spalten nach): leer = Standard, ◆ = gestalteter Weg, „→ X“ = über X, ×
= gesperrt. **Die Diagonale ist das Verweilen** (was Ozzy tut, solange er in der Pose bleibt). Die Karte zeigt die Posen frei
angeordnet und nur die Ausnahmen als Pfeile; wählt man eine Pose, erscheinen ihre Wege. Auf dem iPhone wird die Tafel zur Liste
„Von Sitzen nach …“.

**Wegsuche.** Steht in einer Zelle „über X“ oder ist der direkte Weg gesperrt, setzt das System den Weg aus gestalteten Wegen
zusammen (wie Godots `travel()`): Hocke → Liegen über Diener, so wie der Prototyp es heute im Code hat.

**Unterbrechen.** Je Weg wählbar: **sofort** (Standard: der neue Weg beginnt am Gezeigten, Rest per Trägheit; liegt das Gezeigte
schon auf dem neuen Weg, wird übersprungen, was dahinter liegt, wie heute im Prototyp), **am nächsten Halt** (erst die nächste
Zwischenpose erreichen, wie Unitys Exit Time oder Godots „At End“) oder **nie** (Fallen läuft zu Ende).

**Umkehren.** Ein Weg B → A ist nicht einfach A → B rückwärts (aus Ausholen würde Nachlauf). Rückwärts abspielen gibt es als
Option, Standard ist es nicht.

**Phase.** Mündet ein Weg in einen Zyklus (Tapsen), beginnt der Zyklus an der Phase, die zur Pfotenstellung passt (Bollo); Godot
nennt das „Sync“, Unity „Transition Offset“.

### 5.6 Ebenen

Drei bis vier feste Ebenen statt freier Spuren: **Körper** (Haltungen, Gang, Balance), **Kopf und Blick** (Kopfdrehung,
Blickfeld, Neigung; additiv wie ein Aim Offset), **Gesicht** (Stirn, Maul, Ohrenstellung), **Physik** (immer zuletzt). Jede Ebene hat
ihre eigene aktuelle Pose und ihre eigenen Wege; eine Maske nennt die Teile, eine Art sagt „ersetzen“ oder „addieren“. Das hält
jede Tafel klein.

### 5.7 Physik

Immer laufende Federn je Teil (Ohren, Bart, Schwanz, Kopf) für Nachschwingen; die Körperbalance auf dem Rad als Physik, die in den
**Balance-Regler** schreibt (wie Live2Ds Physik-Parameter). So bleibt alles, was die Physik tut, ein sichtbarer Regler auf
Florians Schlüsseln, und er kann Steifigkeit, Dämpfung und Stärke mit dem Auge einstellen. Für das Fallen übernimmt die Physik ganz
(eigener Zustand); zurück geht es über ein Aufstehen, das nach Ähnlichkeit zur Lage gewählt wird. Später denkbar: ein Geist wie in
Cascadeur, der zeigt, wie ein gestalteter Weg physikalisch richtig aussähe; Florian übernimmt, was ihm gefällt.

### 5.8 Spiel

- **Spielwerte** (vom Spiel geliefert, benannt): Steigung unter Ozzy, Tempo, Kippen (Schwerpunkt gegen Stützfläche), Kontakt je
  Pfote, Hindernis voraus, Laune.
- **Verbindungen:** Spielwert → Regler über eine gezeichnete Kennlinie (Steigung −20° … +20° → Balance −1 … +1). Die meiste
  Spiellogik ist das.
- **Regeln je Pose** statt eines Pfeil-Gewirrs: eine kurze „Wenn“-Liste an der Karte („wenn Tempo > 0,6 und Kippen > 0,8 →
  Stolpern“). Für Varianten eine kleine Tabelle wie Unreals Chooser (Zeilen: Aufstehen vom Bauch, Rücken, Seite; Spalten: Lage).
- **Auslöser** (Sprung, Stolpern) starten Wege; **Ereignisse im Weg** (Pfote setzt auf, Plumps) melden zurück an das Spiel
  (Geräusch, Stoß aufs Rad).

### 5.9 Aufnahme

Jeder Regler und jedes Feld lässt sich live spielen: Aufnahme an, Weg oder Szene läuft, Florian bewegt mit Finger, Stift oder Maus.
Das Ergebnis wird geglättet (Regler wie Procreates „Motion Filtering“), auf wenige Schlüssel ausgedünnt und landet als Spur in der
Leiste. Mit dem Rad selbst gespielt, wird daraus eine Vorführung: Florian dreht das Rad, Ozzy reagiert, die Szene wird mitgeschnitten.

### 5.10 Prüfung der Ausdruckskraft

| Ausdrucksmittel | Wo im System |
|---|---|
| Schlüsselpose, Silhouette | Pose (Karte) mit Korrekturform |
| Zwischenpose (Breakdown) | Zwischenpose im gestalteten Weg |
| Timing, Akzent | Dauer und Kurvenart der Abschnitte; Taktleiste |
| Slow in, slow out | Kurvenart und Verteilungs-Regler |
| Ausholen | Zwischenpose oder Standard-Regler „Ausholen“ (zu prüfen) |
| Nachlauf, Überlappung | Nachlauf je Teil, Physik-Ebene, Federung |
| Halten mit Leben | Verweilen (Diagonale), Atmen, Physik |
| Kontakt, nichts rutscht | Balken „bleibt stehen“, Phase |
| Gag mit genauer Zeit | gestalteter Weg mit festen Sekunden, Ereignisse |
| Feinste Einzelheit eines Teils | Spur (Kurve eines Reglers) in der Expertenansicht |

### 5.11 Bildschirm

Mac und iPad: Bühne groß; darunter die Posenleiste; darunter die Leiste des Gewählten (Regler, Feld oder Taktleiste eines Wegs).
Ein Umschalter zeigt statt der Bühne die Tafel oder die Karte. iPhone: Bühne und eine Leiste, Posen als waagrechte Kartenreihe,
Tafel als Liste. Alle Ziele groß genug für den Finger; Felder sind zum Ziehen mit dem Daumen gemacht.

### 5.12 Rechnung je Bild

1. Spielwerte lesen. 2. Regeln prüfen: Ziele je Ebene setzen, Auslöser starten Wege. 3. Wege und Zyklen fortschreiben → Sollwerte
der Regler. 4. Trägheits-Ausgleich und Federn → gezeigte Reglerwerte mit Geschwindigkeit. 5. Ebenen zusammensetzen (Maske, ersetzen
oder addieren). 6. Physik addiert ihre Versätze. 7. Formen aus den Reglern (Raster, Faltschlüssel), Knochen, Korrekturformen.
8. Kontakte halten, Lage in der Welt. 9. Zeichnen. Alle Federn exakt gelöst (unabhängig von der Bildrate, Holden); bei Ozzy sind
das einige Dutzend Zahlen, also vernachlässigbar neben dem Zeichnen.

Datenmodell in Kürze: `regler[]` (Name, Bereich, rund?, Schlüssel), `posen[]` (Ebene, Werte je Regler, Korrekturform?),
`wege[]` (von, nach, Art Standard/gestaltet/über, Tempo, Federung, Abschnitte, Unterbrechen, Varianten), `ebenen[]` (Teile, Art),
`verbindungen[]` (Spielwert, Regler, Kennlinie), `regeln[]` (Ebene, von, wenn, nach). Gesichert wie heute die Schlüssel der
Kopfdrehung als JSON-Datei.

---

## 6. Skizze: Ozzy auf dem Rad mit diesem System

Nur als Beleg, dass das System das Spiel trägt; das Spielkonzept selbst steht in seinem eigenen Bericht.

- **Ebene Körper:** Posen Stehen, Hocke, Sitzen, Liegen, Diener (vorhanden), dazu Tapsen (Zyklus über die Phase, Tempo-Regler,
  bergauf/bergab als zweite Achse), Balance (Feld: Kippen vor/zurück × Wackeln), Sprung (Weg mit Ausholen, Flug, Landung),
  Stolpern (Weg, „am nächsten Halt“ unterbrechbar), Fallen (Physik), Liegen auf Bauch, Rücken, Seite, Aufstehen je Lage.
- **Ebene Kopf:** Kopfdrehung 360° (vorhanden), Blickfeld, Neigung als Gegenbewegung zur Balance.
- **Ebene Gesicht:** Stirn (neugierig, entschlossen, besorgt), Ohrenstellung.
- **Ebene Physik:** Ohren, Bart, Schwanz; Schwanz als Gegengewicht zur Balance.
- **Abläufe im Spiel:** Bergab steigt das Tempo (Physik), der Gang wird schneller (Phase), Balance kippt nach vorn. Wird es zu schnell
  oder kippt er zu weit, löst die Regel an „Tapsen“ das Stolpern aus; daraus wird Fallen (Physik), dann sucht das System nach
  Ähnlichkeit die passende Liegepose und spielt das passende Aufstehen. Eigensinn: eine Laune-Tabelle wählt mit Gewichten „bleibt
  stehen und schnüffelt“, „setzt sich“ (vorhandener Weg) oder „rennt los“, nur auf ebenen Stücken.

---

## 7. Bezug zum Prototyp

| Prototyp (`apps/editor/src/ozzy-figur/`) | Im Vorschlag | Änderung |
|---|---|---|
| `HALTUNGEN` mit Gewichten (Summe 1) | Posen der Ebene Körper; die Mischung ist ein Feld | bleibt |
| `ABLAEUFE` (Abschnitte: `nach`, `dauer`, `kurve`, `hub`, `wedeln`, `plumps`, `seufzer`, `steht`) | gestaltete Wege, Felder werden Zeilen der Taktleiste | aus dem Code in eine Datei, bearbeitbar |
| `ablaufFuer` (Wenn-Kette je Paar, sonst direkt mit 0,7 s) | Tafel: Standard + Ausnahmen + Varianten (`Art`) | sichtbar machen |
| `wege` (`hocke>liegen` über Diener) | Zelle „über X“, Wegsuche | sichtbar machen |
| Feder 16/s auf allen Gewichten, Zusatzbewegungen um 2/16 s verzögert | Standardweg; bei gestalteten Wegen Trägheits-Ausgleich | prüfen (siehe unten) |
| Kopf: Leitwinkel mit Höchsttempo, gezeigter Winkel an der Feder | Regler mit Tempo-Grenze und Feder | bleibt |
| Zeitleiste der Kopfdrehung mit Zwiebelhaut (`werkzeug.ts`) | die eine Leiste für alle Regler und Wege | verallgemeinern |
| Faltschlüssel im Raster (`raster.ts`) | Regler-Schlüssel | bleibt; Übergänge im Reglerraum nutzen sie von selbst |

**Der wichtigste technische Befund:** In `steuerung.ts` folgen die gezeigten Gewichte dem Ablauf an einer kritisch gedämpften
Feder mit 16/s. Das glättet jeden Wechsel, verschiebt aber auch jede gestaltete Bewegung um rund 2/16 s = 0,125 s und rundet ihre
Akzente ab; deshalb müssen Hüpfer und Plumps eigens um diese Zeit verzögert werden (Kommentar im Code). Ein Trägheits-Übergang
dagegen folgt dem Ablauf genau und glättet nur den Sprung beim Wechsel. Dafür müssen die Abschnitte an ihren Grenzen ein stetiges
Tempo haben oder bewusst springen: Bei „weich“ ist es stetig; bei „linear“ und „fallen“ springt es. Beim Aufprall (Plumps) ist der
Sprung gewollt, an anderen Grenzen hilft ein kleiner Trägheits-Ausgleich.

**Vorgeschlagene Proben** (jede mit festem Kriterium, Florian vergleicht nebeneinander):

1. **Trägheit statt Nachlauf** an „Hinsetzen mit Hüpfer“. Kriterium: Der Plumps sitzt im selben Bild wie der Bodenkontakt; bei zehn
   schnellen Klicks springt nichts und keine Pfote rutscht.
2. **Tafel und Taktleiste** für die acht vorhandenen Abläufe. Kriterium: Florian ändert ohne Code eine Dauer, eine Zwischenpose und
   eine Zusatzbewegung; gespeichert wird wie heute in eine JSON-Datei.
3. **Balance-Feld auf dem Rad.** Kriterium: Beim Drehen des Rads kippt Ozzy stetig, ohne Sprünge, jede Stellung liegt auf
   gezeichneten Schlüsseln.

---

## 8. Empfehlungen

1. **Den Editor um Posen, Regler und Wege ordnen**, nicht um eine durchgehende Zeitleiste.
2. **Eine einzige Leiste für alle Achsen** (Winkel, Phase, Fortschritt, Zeit, Balance), gebaut aus der Zeitleiste der Kopfdrehung
   mit Zwiebelhaut, J/K und Farben nach Herkunft; Felder für zwei Achsen bedienen sich gleich.
3. **Übergänge im Reglerraum rechnen**, nie Formen direkt überblenden.
4. **Standardweg = Trägheits-Ausgleich mit kritisch gedämpfter Feder**, global mit Tempo und Federung (Standard 100 %), dazu
   Nachlauf je Teil.
5. **„Standard plus Ausnahmen“ als Datenmodell**; als Ansichten eine vollständige Tafel (jede Zelle anklickbar, Diagonale =
   Verweilen) und eine Karte, die nur Ausnahmen zeigt; auf dem iPhone eine Liste je Pose.
6. **Gestaltete Wege als Taktleiste** mit Zwischenposen-Karten, Abschnitten (Dauer, Kurvenart, Verteilung), Zusatzbewegungen und
   „bleibt stehen“; Kurven je Regler nur als Expertenspur.
7. **Wegsuche „über X“** wie Godots `travel()`; Unterbrechen je Weg (sofort, am nächsten Halt, nie); Umkehren nur als Option;
   Phasenabgleich beim Eintritt in Zyklen.
8. **Drei bis vier feste Ebenen** (Körper, Kopf und Blick, Gesicht, Physik) mit Maske und Art statt freier Spuren.
9. **Regelmäßige Raster für Felder**, PCHIP-glatt, mit Faltschlüsseln; freie Dreiecksteilung nur, wo nötig.
10. **Physik als immer laufende Ebene, die in sichtbare Regler schreibt**; Fallen als Physik-Zustand, Aufstehen nach Ähnlichkeit.
11. **Spiellogik als Verbindungen (Spielwert → Regler mit Kennlinie) und kurze Regeln je Pose**, Varianten in kleinen Tabellen;
    kein freies Pfeil-Gewirr.
12. **Aufnahme für jeden Regler** mit Glättung und Ausdünnen, auf iPad mit Finger und Stift.
13. **Abläufe des Prototyps zuerst in Daten überführen**, dann die drei Proben aus Abschnitt 7, in dieser Reihenfolge.
14. **Nicht bauen:** Motion Matching, KI-Zwischenbilder, ein Dopesheet mit Zeilen je Eigenschaft als Hauptansicht, ein freier
    Zustandsgraph als Hauptansicht.

---

## 9. Offene Fragen an Florian

1. **Zeit oder Gefühl?** Willst du Übergänge lieber in Sekunden festlegen (genau) oder über Tempo und Federung (lebendig, Zeit ergibt
   sich)? Vorschlag: Standardwege über Gefühl, gestaltete Wege in Sekunden.
2. **Tafel oder Karte zuerst?** Welche Ansicht soll beim Öffnen der Übergänge erscheinen?
3. **Teilposen:** Sollen Posen auch nur den Kopf oder nur das Gesicht betreffen dürfen, oder immer den ganzen Ozzy?
4. **Spiellogik im selben Editor?** Regeln und Verbindungen als eigener Reiter im Editor (wie Rive) oder getrennt?
5. **Wo arbeitest du an Wegen:** am Mac, am iPad mit Stift oder auch am iPhone? (Bestimmt, wie weit die Tafel auf dem Telefon gehen
   muss.)
6. **Ausholen und Nachfedern als Standard-Regler** ausprobieren, oder bleibt Ausholen immer eine gezeichnete Zwischenpose?
7. **Eigensinn:** Wie viel davon willst du selbst gestalten (Laune-Tabelle), wie viel soll das System von sich aus tun?
8. **Wörter:** Pose, Haltung, Weg, Ablauf, Regler, Leiste, Feld, Tafel, Karte – passen sie, oder hast du eigene?

---

## 10. Grenzen dieser Recherche

- Das Kontingent für Websuchen war gegen Ende erschöpft; einzelne Punkte stützen sich deshalb auf Suchauszüge statt auf die ganze
  Seite: Toon Boom Master Controller, Moho Smart Bones, Adobe Character Animator, spine-unity (Mischzeiten im Inspector) und die
  Einzelheiten zum Overgrowth-Vortrag (dort nur Berichte von Zuschauern).
- Bei Unitys Freeform-Mischung und Unreals Dreiecksgewichten nennen die Handbücher die Formeln nicht; die Aussage über Knicke an
  Dreieckskanten ist eigene Folgerung.
- Nichts davon ist an Ozzy gemessen. Ausholen und Nachfedern als Regler, die Diagonale als Verweilen und die Taktleiste sind
  Vorschläge; ob sie tragen, zeigen erst die Proben und Florians Auge.

---

## 11. Quellen

**Zustandsautomaten, Mischen, Ebenen**
- Unity: [Transitions](https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/class-transition),
  [2D Blending](https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/animation-blend-trees/blend-tree-2dblending),
  [Layers](https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/animation-layers),
  [Blog: Transition interruptions](https://unity.com/blog/engine-platform/state-machine-transition-interruptions),
  [Tutorial Sub-State Machines](https://amara.org/subtitles/UyAgBXac0D8P/en/1/download/Animator%20Sub-state%20machine%20hierarchies%20-%20Unity%20Official%20Tutorials.en.txt)
- Unreal: [Transition Rules](https://dev.epicgames.com/documentation/en-us/unreal-engine/transition-rules-in-unreal-engine),
  [State Machines](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-machines-in-unreal-engine),
  [Blend Spaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blend-spaces-in-unreal-engine),
  [Automatic Blend Spaces](https://dev.epicgames.com/documentation/unreal-engine/automatic-blend-space-creation-in-unreal-engine?lang=en-US),
  [Aim Offset](https://dev.epicgames.com/documentation/en-us/unreal-engine/aim-offset-in-unreal-engine),
  [Chooser](https://dev.epicgames.com/documentation/en-us/unreal-engine/dynamic-asset-selection-in-unreal-engine),
  [Blend Nodes](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprint-blend-nodes-in-unreal-engine),
  [Forum: Blend-Space-Gewichte](https://forums.unrealengine.com/t/anybody-know-how-the-blend-space-interpolation-algorithm-works/102044)
- Godot: [AnimationTree](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html),
  [AnimationNodeStateMachineTransition](https://docs.godotengine.org/en/stable/classes/class_animationnodestatemachinetransition.html)
- Rive: [States](https://rive.app/docs/editor/state-machine/states), [Transitions](https://rive.app/docs/editor/state-machine/transitions),
  [Layers](https://rive.app/docs/editor/state-machine/layers), [Joysticks](https://rive.app/docs/editor/manipulating-shapes/joysticks),
  [Blog: State Machines](https://rive.app/blog/how-state-machines-work-in-rive),
  [Blog: Debugging](https://rive.app/blog/5-tips-to-debug-rive-files-like-a-developer)
- Statecharts: [statecharts.dev](https://statecharts.dev/what-is-a-statechart.html)

**Spine**
- [Applying Animations](https://esotericsoftware.com/spine-applying-animations), [API-Referenz](https://esotericsoftware.com/spine-api-reference),
  [Preview](https://esotericsoftware.com/spine-preview), [Sliders](https://ar.esotericsoftware.com/spine-sliders),
  [Spine 4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released), [Dopesheet](https://esotericsoftware.com/spine-dopesheet),
  [Graph](https://esotericsoftware.com/spine-graph), [Forum spine-unity Mischzeiten](https://esotericsoftware.com/forum/d/9985)

**Parameterraum und Posen**
- Live2D: [Parameter](https://docs.live2d.com/en/cubism-editor-manual/parameter/),
  [Keyforms X/Y](https://docs.live2d.com/en/cubism-editor-manual/keyform-xydirection/),
  [Blend Shape](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/),
  [VTube Studio: Expressions](https://github.com/DenchiSoft/VTubeStudio/wiki/Expressions-(a.k.a.-Stickers-or-Emotes))
- Toon Boom: [Grid Wizard](https://docs.toonboom.com/help/harmony-22/premium/master-controller/about-grid-wizard.html),
  [Slider Wizard](https://docs.toonboom.com/help/harmony-20/premium/master-controller/use-slider-wizard.html)
- [School of Motion: Joysticks 'n Sliders vs. DUIK](https://schoolofmotion.com/blog/after-effects-tool-review-joysticks-n-sliders-vs-duik-bassel)
- Moho: [Lester Banks: Smart Bone Actions](https://lesterbanks.com/2016/11/working-mohos-smart-bone-actions/),
  [Moho-Forum](https://lostmarble.com/forum/viewtopic.php?p=180929)
- [Blender: Pose Library](https://docs.blender.org/manual/en/latest/animation/armatures/posing/editing/pose_library.html)
- Lewis, Cordner, Fong: [Pose Space Deformation (PDF)](https://www.scribblethink.org/Work/PSD/PSD.pdf)
- [Wikipedia: Twelve basic principles of animation](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation)

**Übergänge, Federn, Motion Matching**
- Bollo: [SIGGRAPH 2017 Talk (PDF)](https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Bollo_High-Performance-Animation-in-Gears-of-War-4.pdf),
  [GDC 2018](https://gdcvault.com/play/1025165/Inertialization-High-Performance-Animation-Transitions)
- Holden: [Spring-It-On](https://theorangeduck.com/page/spring-roll-call), [Dead Blending](https://theorangeduck.com/page/dead-blending),
  [Dead Blending in Unreal](https://www.theorangeduck.com/page/dead-blending-node-unreal-engine),
  [Tracking Springs](https://theorangeduck.com/page/perfect-tracking-springs)
- [Unreal API: Dead Blending](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/FAnimNode_DeadBlending)
- [Apple WWDC 2018: Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)
- Clavet: [Motion Matching, GDC 2016](https://www.gdcvault.com/play/1022985/Motion-Matching-and-The-Road);
  [Unreal: Motion Matching](https://dev.epicgames.com/documentation/en-us/unreal-engine/motion-matching-in-unreal-engine),
  [Unreal 5.4](https://www.unrealengine.com/en-US/blog/unreal-engine-5-4-is-now-available)

**Aufnahme, Prozedural, Physik**
- [Procreate Dreams: Performing](https://help.procreate.com/dreams/handbook/keyframes-and-performing/performing)
- Adobe Character Animator: [Tutorial](https://www.adobe.com/learn/adobe-character-animator/web/recording-editing-performances),
  [Hilfe](https://helpx.adobe.com/adobe-character-animator/using/record-and-playback.html)
- Bret Victor: [Stop Drawing Dead Fish (Ankündigung)](https://san-francisco.siggraph.org/?p=712), [Video](https://vimeo.com/36579366)
- Rosen: [GDC 2014](https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach),
  [Unity-Forum](https://discussions.unity.com/t/an-indie-approach-to-procedural-animation-gdc-video-talk/538228),
  [Polycount](https://polycount.com/discussion/comment/2093086)
- Cascadeur: [AutoPhysics](https://cascadeur.com/help/tools/physics_tools/autophysics),
  [Stützpunkte](https://cascadeur.com/help/tools/physics_tools/autophysics/fulcrum_points),
  [AutoPosing](https://cascadeur.com/help/tools/autoposing), [Inbetweening](https://cascadeur.com/help/category/278),
  [Digital Production 2025.2](https://digitalproduction.com/2025/07/31/cascadeur-2025-2-adds-motion-styles-tangent-editing-and-automatic-fulcrum-detection/),
  [Digital Production 2026](https://digitalproduction.com/2026/02/18/cascadeur-on-physics-ai-and-control/)

**Aus diesem Repo**
- [`2026-11-16-ozzy-morph-und-animation.md`](../2026-11-16-ozzy-morph-und-animation.md),
  [`2026-11-18-ozzy-figur-recherche.md`](../2026-11-18-ozzy-figur-recherche.md)
- Prototyp: `apps/editor/src/ozzy-figur/ablauf.ts`, `steuerung.ts`, `haltung.ts`, `raster.ts`, `werkzeug.ts`
