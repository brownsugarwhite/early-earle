# Ozzy-Figur: Recherche (18.11.2026)

Auftrag (Florian, 18.11.): Ozzy, das Maskottchen des Editors, als 2,5D-Bewegungswerkzeug neu bauen: Vektormorphs mit gleicher
Punktzahl und ein einfaches Rig, Kopf und Körper um 360°, Teile gleiten weich und teils flüssig ineinander (passend zu
„liquid drop“), überrealistische Physik (immer schneller laufen, bei zu viel Tempo stolpern, springen, in der Luft drehen,
Saltos, Stufen physikalisch richtig und tapsig), Posen direkt bearbeiten. Er muss **genau** wie die Vorlagen aussehen; keine
Kanten oder Knicke wie im Prototyp. Grundlage: Florians sechs SVGs (`docs/look/ozzy-figur/vorlagen/`). Der Plan, der daraus folgt:
[`docs/plans/2026-11-18-ozzy-figur.md`](../plans/2026-11-18-ozzy-figur.md). Die Recherche vom 16.11. zum Prototyp
([`2026-11-16-ozzy-morph-und-animation.md`](2026-11-16-ozzy-morph-und-animation.md)) gilt weiter; hier steht, was neu ist.

## 1. Wie andere 2,5D-Figuren drehen

- **Live2D Cubism:** Formen hängen an Parametern (z. B. Winkel X und Y des Kopfs). Der Zeichner legt an Schlüsselwerten
  „Keyforms“ an, dazwischen wird gemischt; zwei Parameter mit je drei Schlüsseln ergeben ein Raster aus 3 × 3 = 9 Formen. Das
  Handbuch rät zu höchstens zwei Parametern je Verformer, weil die Formen sich vervielfachen, und zu Schlüsseln an beiden Enden
  jedes Bereichs. Kinder erben die Verformung ihres Elternteils.
  ([Keyforms X/Y](https://docs.live2d.com/en/cubism-editor-manual/keyform-xydirection/),
  [Eltern und Kinder](https://docs.live2d.com/en/cubism-editor-manual/keyform-parent-chilid-relation/),
  [Blend Shapes](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/))
- **Rive:** Vektorformen, Knochen, IK, „Joysticks“: Ein 2D-Regler blendet Zeitleisten für links/rechts und oben/unten; damit
  bauen Leute genau solche Kopfdrehungen ([Joysticks](https://rive.app/docs/editor/manipulating-shapes/joysticks),
  [Beispiel-Rig](https://rive.app/marketplace/28370-53642-interactive-character-rig-bones-joysticks-and-data-binding/)).
  Seit 2025 gibt es Skripte (Luau) mit Physik (Schwerkraft, Kollision, Federn), die auf Web und iOS laufen
  ([Ankündigung](https://rive.app/blog/scripting-is-live-in-rive)). Bekannte Haken: Das 1D-Mischen ist nicht linear (ein Forum
  empfiehlt additives Mischen), und Formen verschmelzen nicht miteinander.
- **Spine, Moho, Toon Boom, Cartoon Animator:** Raster-Netze bzw. Vektoren mit Knochen; für Drehungen zeichnet man je Ansicht
  (vorn, 3/4, Seite, hinten) und morpht dazwischen. Die Ohren sind überall die Problemstelle (Recherche vom 16.11.).

**Was wir übernehmen:** das Raster aus Schlüsselformen (Live2D) mit wenigen Parametern je Teil, Schlüssel an den Enden, Kinder
erben die Verformung. Den Weg „Rive als Werkzeug“ verfolgen wir nicht: Florians SVGs würden dort zwar exakt erscheinen, aber
das flüssige Verschmelzen, die Weiß-Regeln und die eigene Physik müssten wir trotzdem selbst bauen, nur in einem fremden Editor.

## 2. Formen ohne Kanten morphen

- **Gleiche Punkte, gleiche Reihenfolge, gleicher Start** ist die Grundbedingung (After-Effects-Praxis). Florians SVGs erfüllen
  sie bereits (Test T1 im Plan): Er hat die Ansichten durch Verschieben derselben Punkte gezeichnet.
- **Winkel und Längen statt gerader Bahnen** (Sederberg u. a., SIGGRAPH 1993; Alexa, Cohen-Or, Levin, SIGGRAPH 2000: „so starr
  wie möglich“): Drehende Formen schrumpfen sonst in der Mitte. Bei Florians Teilen bewegen sich die meisten Punkte wenig; der
  Unterschied zwischen linear und Winkel/Länge ist im Test klein. Für Ohren und Schwanz (große Drehungen) zerlegen wir je Teil
  in Drehung, Größe und Lage und mischen diese getrennt (Art „S“ im Test).
- **Griffe als Winkel und Länge:** glatte Anker bleiben glatt (beide Griffe drehen gleich), Ecken bleiben Ecken. Rive legt
  Bézier-Griffe ebenso als Drehung und Abstand ab.
- **Über den Winkel periodisch und monoton interpolieren** (PCHIP, wie im Prototyp): kein Überschwingen zwischen den Schlüsseln.

## 3. Flüssig verschmelzen, Weiß sauber halten

- **Weiche Vereinigung von Abstandsfeldern** (Quilez, „smooth minimum“; auch in Dreams verwendet): zwei Formen fließen mit einer
  runden Kehle ineinander, Spitzen weit weg von anderen Teilen bleiben spitz. Das Feld ist in der Kehle kein exakter Abstand
  mehr, fürs Zeichnen unwichtig ([smin](https://iquilezles.org/articles/smin)). Nachteil: Laufen zwei Kanten lange dicht
  nebeneinander, schwillt die Verbindung etwas an.
- **Morphologisches Schließen** (Ausdehnen, dann Schrumpfen um denselben Radius, „rollende Kugel“): exakte Kehlen, konvexe Ecken
  bleiben unverändert, kein Anschwellen. Braucht ein echtes Abstandsfeld der Vereinigung, z. B. per Jump Flooding (Rong & Tan
  2006) auf der Grafikkarte. Als zweite Stufe vorgesehen, falls die weiche Vereinigung irgendwo zu viel aufträgt.
- **Abstandsfeld je Teil auf der Grafikkarte** (eigener Test T3/T4): Jede Kante wird als Rechteck gezeichnet, die Grafikkarte
  behält je Bildpunkt den kleinsten Abstand (MIN-Mischen); das Vorzeichen kommt aus einer Schablone je Teil. Ergebnis: exakt wie
  das SVG (nur Kantenglättung weicht ab), dazu frei kombinierbar: weich vereinigen, Weiß an Schwarz klemmen, Spalte zeichnen.
- **iOS:** WebGL2 auf dem iPhone kann in 16-Bit-Gleitkomma rendern und mischen, nicht in 32 Bit (`EXT_float_blend` fehlt)
  ([WebKit 247240](https://bugs.webkit.org/show_bug.cgi?id=247240), [WebKit 241399](https://bugs.webkit.org/show_bug.cgi?id=241399)).
  Der Test-Renderer nutzt Half-Float, Rückfall auf 8 Bit mit kleinerem Band.
- **Gegenüber Runde 5 des Prototyps** (Weichzeichnen + Schwelle): Das rundet auch Spitzen und dünnt Schmales aus; Abstandsfelder
  nicht.

## 4. Physik, die witzig wirkt

- **Overgrowth** (David Rosen, GDC 2014): flüssige, reaktive Bewegung aus sehr wenigen Schlüsselposen plus einfacher Prozedur;
  die Physik bestimmt, die Posen schmücken
  ([GDC Vault](https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach),
  [Bericht](https://gamedeveloper.com/design/video-an-indie-approach-to-procedural-animation)).
- **Rain World** (Jakobsson, Therrien, GDC 2016): Körper als wenige Massenpunkte im Raum (die Figur aus zwei verbundenen
  Kugeln, die rollen und kippen können), Gliedmaßen und Schwanz werden darüber gezeichnet und bewegen sich prozedural; die
  Bewegung bekommt dadurch Gewicht ([Bericht](https://gamedeveloper.com/art/video-animating-i-rain-world-i-and-its-many-squishy-stretchy-creatures)).
- **Coros u. a., „Locomotion Skills for Simulated Quadrupeds“** (SIGGRAPH 2011): ein simulierter Hund mit Schritt, Trab, Pass,
  Galopp, Sprüngen auf und von Plattformen, Hinlegen und Aufstehen nach einem Sturz; Gangarten als Graph, ein Modell mit vorderem
  und hinterem Beinrahmen, biegsame Wirbelsäule, „virtuelle Kräfte“ halten den Rumpf
  ([Projektseite](https://www.cs.ubc.ca/~van/papers/2011-TOG-quadruped/index.html)). Das ist die Vorlage für Ozzys Löser: ein
  starrer Rumpf, den Beine mit begrenzter Kraft tragen und aufrecht halten.
- **Wobbledogs:** eine ganze Spielidee aus physikalisch simulierten, wackelnden Hunden
  ([Interview](https://gamedeveloper.com/design/behind-the-ai-and-physics-of-i-wobbledogs-i-procedurally-goofy-wobbledogs)).
- **Gibbon: Beyond the Trees:** erst der Schwerpunkt (Flugbahn, Schwung bleibt erhalten), dann die Glieder in Stufen von grob nach
  fein; so bleibt der Kontakt zum Ast und der Schwung stetig
  ([Deep Dive](https://www.gamedeveloper.com/programming/deep-dive-physics-based-animation-in-gibbon-beyond-the-trees)).
- **Wackelpudding, der in die Zeichnung zurückfindet:** Formabgleich („shape matching“, Müller u. a. 2005) zieht verformte Punkte
  zur Zielform zurück; Spiele wie JellyCar leben davon. Für Ozzys Bohne: Die Zielform ist die gezeichnete Bohne der aktuellen
  Pose, die Physik verformt nur vorübergehend.
- **Übergänge ohne Sprung:** Trägheits-Übergänge (Bollo, GDC 2018) und gedämpfte Federn (Holden) wie im Prototyp, Runde 5.
- **Steuerung:** Coyote-Zeit, Sprung-Puffer, variable Sprunghöhe (Recherche vom 16.11.).

## 5. 3D mit Blender: geprüft, nicht der Weg

Florian hat 3D ausdrücklich erlaubt. Gegen 3D spricht, was die Vorlagen selbst zeigen:

- **Die Ansichten sind gezeichnet, nicht projiziert.** Im Profil schaut das ferne Beinpaar um 36 Einheiten nach vorn heraus (wie
  aus 70° statt 90°), in der Front nur das rechte Hinterbein, die Rückansicht hat die Beine an denselben Stellen wie die Front.
  Ein 3D-Modell trifft nie alle Ansichten zugleich; es bräuchte Formen je Ansicht („view-dependent geometry“), also dasselbe
  Raster wie in 2,5D, nur mit mehr Aufwand.
- **Die Grafik lebt in der Ebene:** Schlitze als Kerben in der weißen Maske, Bartzacken, Scheitel, keilförmiger Ohrspalt,
  verjüngte schwarze Ränder. In 3D wären das Texturen oder Abziehbilder auf gekrümmten Flächen, die sich beim Drehen verzerren.
- **Der Test zeigt:** Direkt aus seinen Punkten gemorpht, trägt die Kopfdrehung schon gut (Schlitz, linke Hälfte); die Fehler
  sitzen an benennbaren Stellen, die Regeln oder eine korrigierte 45°-Ansicht lösen.
- **Wo „3D“ trotzdem hilft:** als unsichtbares Gerüst. Hüften, Schultern, Hals, Schwanzwurzel und Ohrwurzeln sind Punkte im Raum;
  daraus folgen Lage und Reihenfolge der Teile bei jeder Drehung (Test T5). Blender wird nicht gebraucht.

## 6. Quellen

- Live2D: https://docs.live2d.com/en/cubism-editor-manual/keyform-xydirection/ ·
  https://docs.live2d.com/en/cubism-editor-manual/keyform-parent-chilid-relation/ ·
  https://docs.live2d.com/en/cubism-editor-manual/blend-shape/
- Rive: https://rive.app/docs/editor/manipulating-shapes/joysticks · https://rive.app/blog/scripting-is-live-in-rive ·
  https://rive.app/marketplace/28370-53642-interactive-character-rig-bones-joysticks-and-data-binding/
- Quilez, smooth minimum: https://iquilezles.org/articles/smin
- WebKit/iOS-Erweiterungen: https://bugs.webkit.org/show_bug.cgi?id=247240 · https://bugs.webkit.org/show_bug.cgi?id=241399
- Overgrowth: https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach ·
  https://gamedeveloper.com/design/video-an-indie-approach-to-procedural-animation
- Rain World: https://gamedeveloper.com/art/video-animating-i-rain-world-i-and-its-many-squishy-stretchy-creatures
- Coros u. a. 2011: https://www.cs.ubc.ca/~van/papers/2011-TOG-quadruped/index.html
- Wobbledogs: https://gamedeveloper.com/design/behind-the-ai-and-physics-of-i-wobbledogs-i-procedurally-goofy-wobbledogs
- Gibbon: https://www.gamedeveloper.com/programming/deep-dive-physics-based-animation-in-gibbon-beyond-the-trees
- Ältere Quellen (Sederberg 1993, Alexa 2000, Bollo 2018, Holden, Celeste-Steuerung): Recherche vom 16.11.
