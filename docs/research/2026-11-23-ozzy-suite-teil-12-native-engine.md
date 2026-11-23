# Ozzy als Suite, Teil 12: Native App und eigene Engine, ehrlich eingestuft

Stand 23.11.2026. Ohne Agenten, mit zwei Suchen (Metal 4, neuronale Materialien auf Mobilgeräten). Vorher: Teil 1 bis 11, vor allem
Teil 2 (Tempo, Web oder nativ) und Teil 9 (Engine). Nichts davon ist gebaut.

**Dein Wort (23.11.):** „Würde es sich für dieses Großprojekt lohnen, eine native App zu bauen mit eigenen Renderern, quasi eine eigene
Engine, die genau auf uns zugeschnitten ist? … Wir müssen keine Weltklasse-Programme schlagen, … aber der Look muss sehr clever sein
und fehlender Realismus im Modell oder Renderer durch geschickte Shading-Tricks ausgeglichen werden, gerne auch durch eigens
Entwickeltes. … Wie hoch ist die Wahrscheinlichkeit, dass man etwas wirklich Neues schaffen kann, das einen echten Nutzen hat und
verändert, wie Mensch und KI zusammenarbeiten? Gib mir eine ehrliche Einstufung.“

## 0 Kurzfassung

1. **Ja, vorstellbar, aber das Neue entsteht in einem schmalen, tiefen Kern, nicht in allem zugleich.** Kleine Teams mit eigener Engine
   haben das geschafft: Procreate (eigene Metal-Engine, Standard fürs Malen auf dem iPad), Nomad Sculpt (im Kern eine Person, Standard
   fürs Formen auf Tablets), Rive (eigener Renderer für Vektoranimation). Dreams zeigt die andere Seite: eine ganz neue Engine, viele
   Jahre, am Ende eine Nische.
2. **Native lohnt sich langfristig wahrscheinlich, aber nicht jetzt für alles.** Zuerst der Player fürs Spiel (wie bei Spline), sobald
   die Zehn-Minuten-Frage und die Messung es zeigen. Den Editor erst nativ machen, wenn Look und Bedienung im Web bewiesen sind. Die
   Befehlsschicht und die Szene als Text (Teil 7) halten jeden Weg offen.
3. **Die beste Chance auf echtes Neues liegt dort, wo alte, übersehene Ideen auf neue Hardware treffen:** gemalte Kugeln statt
   Lichtsimulation, Kanten direkt aus Kurven, teure Looks als gelernte Kopie, die Neural Engine als zweiter Maler, Detail nach Bedarf,
   und Linien als gemeinsame Sprache von Mensch und KI.
4. **Zwei kleine Vorversuche** würden in wenigen Tagen zeigen, ob die mutigsten Ideen tragen (Abschnitt 5).

## 1 Ehrliche Einstufung

Das sind Urteile, keine Rechnungen.

| Frage | Einschätzung | Warum |
| --- | --- | --- |
| Native App für den Player im Spiel | wahrscheinlich ja, etwa 65 % | Die App bekommt vermutlich nur WebGL2 und höchstens 60 Bilder je Sekunde (`docs/FALLEN.md`); Spline spielt aus demselben Grund nativ ab; Neural Engine, MetalFX und Haptik gibt es nur nativ |
| Native App für den Editor, jetzt | nein | Look und Bedienung sind noch unbewiesen; im Web bauen wir schneller, Claude ist leichter angebunden, und jedes Gerät hat Ozzy sofort |
| Ein ganz neues Grundverfahren im Rendering, ein echter Durchbruch | 5 bis 10 % | Das Feld gehört großen Laboren (NVIDIA, Epic, Apple); ohne eigenes Forschungsteam gelingt das selten |
| Eine neue Verbindung bekannter Verfahren, die es so nirgends gibt und auf dem iPhone sichtbar besser aussieht | 40 bis 60 % | Kurven als Wahrheit, Engine für Illustration, gezeichnetes Licht, gelernte Looks und Scribble gibt es nirgends zusammen; jedes Teil ist erprobt |
| Spürbar bessere Zusammenarbeit von dir, Nicole und Claude in diesem Projekt | 60 bis 70 % | Linien, Regler und Regeln lesen Mensch und KI gleich gut; Zweige, Wächter und Bildvergleiche gibt es in Kreativwerkzeugen kaum |
| Verändert, wie Mensch und KI in der ganzen Branche zusammenarbeiten | unter 5 % | Das hängt weniger an der Technik als an Zeitpunkt, Verbreitung, Geld und Team; Adobe, Figma, Spline und World Labs bewegen sich schnell |

## 2 Warum ich das so sehe

- **Was die Erfolge kleiner Teams gemeinsam haben:** ein Gerät, ein Gefühl, extrem gut gemacht; die Engine dient genau diesem Gefühl.
  Procreate ist Malen auf dem iPad, Nomad Sculpt ist Kneten auf dem Tablet, Rive ist Vektoranimation im Produkt, Townscaper (eine Person,
  gebaut auf Unity) ist eine neue Idee fürs Bauen ohne eigene Engine.
- **Das größte Risiko für Ozzy ist die Breite.** Eine Suite für alles verteilt die Kraft. Neues entsteht, wenn ein Kern so gut ist, dass
  man ihn sofort spürt; der Rest kommt danach.
- **Woher Durchbrüche oft kommen:** alte Ideen auf neuer Hardware. Gaussian Splatting hat das Zeichnen mit Punkten wiederbelebt,
  neuronale Materialien das Vorausrechnen. Deshalb suche ich zuerst bei übersehenen alten Ideen.

## 3 Wo ich das Neue suchen würde: Ansätze, die es schon gibt

1. **Malen statt simulieren: die gemalte Kugel.** Du malst eine Kugel im gewünschten Stil, und sie wird der Werkstoff: Jede Stelle der
   Form nimmt die Farbe der Kugel an der Stelle mit derselben Richtung (Sloan und andere 2001, „The Lit Sphere“; in ZBrush als MatCap
   bekannt). Ein Texturzugriff je Bildpunkt, billiger geht es kaum, und es sieht aus wie gemalt. Neu wäre: mehrere gemalte Kugeln je
   Lichtrichtung, gemischt; die Schattengrenze als Linie (Teil 9); Claude macht aus einem Earle-Bild eine Kugel. Schwäche: Das Licht
   hängt am Blick, nicht an der Welt; in der Illustration ist das oft eine Stärke.
2. **Kanten direkt aus den Kurven.** Schriften werden seit Jahren direkt aus ihren Bézier-Kurven gezeichnet, scharf bei jeder Größe (Loop
   und Blinn 2005, Slug von Lengyel 2017). In 3D macht das kaum jemand. Ozzy hat die Kurven als Wahrheit; Silhouette und Lichtstufen
   könnten im Bild als Kurven gerechnet werden statt als Dreieckskanten. Das wäre echte Vektorgüte in 3D (Teil 9, Abschnitt 5).
   Unsicher: Sichtbarkeit und Tempo bei vielen Kurven.
3. **Teure Looks am Mac rechnen, am iPhone gelernt abspielen.** Ein kleines neuronales Netz lernt, einen teuren Shader nachzuahmen.
   NVIDIA zeigte 2024 Materialien, die damit über zehnmal schneller sind als geschichtete; 2026 liefen solche Materialien auf einer Meta
   Quest 3 mit über 90 Bildern je Sekunde, durch Vorausrechnen über mehrere Bilder und Destillation. Für uns: dein Fell (am Mac 26 bis
   32 ms in Bewegung) oder der Earle-Siebdruck als gelernte Kopie. Metal 4 erlaubt solche kleinen Netze direkt im Shader. Unsicher:
   Looks mit harten Kanten sind für Netze schwerer als weiche Materialien, und Flimmern muss gebändigt werden.
4. **Die Neural Engine als zweiter Maler.** Das iPhone hat neben der Grafik einen eigenen KI-Rechner, der beim Rendern fast nichts tut.
   Er könnte den letzten Pinselstrich übernehmen: Die Engine liefert Teile, Tiefe, Normalen und Bewegung, ein kleines Netz malt daraus
   das Bild im Stil. Intel hat 2021 aus solchen Puffern GTA-Bilder fotorealistisch gemacht; wir würden in Richtung Illustration gehen.
   Weil die Engine Bewegung und Teile genau kennt, lässt sich das Flimmern zähmen, das die Stilübertragung bei Videos plagt. Das geht nur
   nativ. Unsicher: groß, aber billig zu testen.
5. **Detail nach Bedarf aus den Linien.** Statt große Netze zu speichern, erzeugt Ozzy Dreiecke nur dort, wo das Auge sie sieht
   (adaptive Unterteilung, Nießner und andere 2012; Nanite bei Epic ist die schwere Form davon). Fell, Laub und Wolken als Splats (Kerbl
   und andere 2023), die aus den Linien wachsen: die Form aus Kurven, das Detail aus Punkten. Unsicherheit: mittel.
6. **Linien als gemeinsame Sprache von Mensch und KI.** Vielleicht der wichtigste Punkt. Die meisten KI-Werkzeuge erzeugen undurchsichtige
   Netze oder Bilder (Meshy, Marble) oder bedienen fremde Oberflächen über einen Chat. Ozzy kann der KI dieselbe kleine, lesbare Wahrheit
   geben wie dir: Linien, Regler, Regeln; dazu Zweige, Wächter und Bildvergleiche wie beim Programmieren. Vorbilder aus der Forschung:
   Formen als kleine Programme (ShapeAssembly 2020), CAD als Code. Hier liegt die beste Chance auf etwas, das die Zusammenarbeit wirklich
   verändert.

## 4 Native: was es bringt und was es kostet

**Was nur nativ geht:** die Neural Engine; Metal 4 mit Tensoren und kleinen Netzen im Shader; MetalFX (Hochskalieren, Entrauschen,
Zwischenbilder); Zwischenbilder im schnellen Speicher auf dem Chip, damit wären die Lesebilder (Teil 9) fast umsonst; Mesh-Shader;
Strahlverfolgung in Hardware auf neueren Chips; Apple Pencil Pro mit Schweben, Drücken und Drehen; Haptik (Physik zum Fühlen, Teil 11);
keine Pausen der Speicherbereinigung; 120 Bilder je Sekunde auf Pro-Geräten.

**Was es kostet:** eine zweite Codebasis oder einen Umzug; die 94 Shader (TSL) und der Renderer des Spiels müssten übersetzt werden; der
App Store; langsameres Ausprobieren.

| Weg | Was | Urteil |
| --- | --- | --- |
| **A Web bleibt, nativ nur der Player** | wie bei Spline: Ozzy und Studio im Browser, im Spiel ein nativer Player mit eigener Engine | **Empfehlung** als erster Schritt, nach der Messung |
| B Ein gemeinsamer Kern | Rust mit wgpu: nativ auf Metal, im Browser auf WebGPU; die Extras (Neural Engine, MetalFX) nur in der App | am elegantesten, aber Abschied von three.js; erst nach den Vorversuchen entscheiden |
| C Ganz nativ | Swift und Metal für Editor und Spiel | stärkstes iPhone-Gefühl, aber nur Apple-Geräte und der größte Umbau |

Die Brücke für jeden Weg: Befehlsschicht und Szene als Text (Teil 7). Was heute darin gebaut wird, geht bei keinem Umzug verloren.

## 5 Zwei kleine Vorversuche

1. **Gemalte Kugel** (im Web, wenige Tage): Du malst eine Kugel im Earle-Stil oder nimmst eine aus dem Shader-Strang; Ozzy macht daraus
   einen Werkstoff mit der Schattengrenze als Linie. Kriterium: An deiner Form sieht es aus wie gemalt, und auf dem iPhone 16 kostet es
   fast nichts.
2. **Neural Engine als Maler** (kleine native Test-App, wenige Tage): Puffer einer einfachen Szene (Teile, Tiefe, Normalen, Bewegung),
   ein kleines Netz, ein Bild im Stil. Kriterium: auf dem iPhone 16 bei 512 × 512 Bildpunkten unter 8 ms, ohne sichtbares Flimmern beim
   Drehen. Hält das, ist es das stärkste Argument für nativ.

Davor die Zehn-Minuten-Frage aus Teil 9 und die Messseite aus Teil 2.

## 6 Was ich nicht versprechen kann

- Dass etwas Weltneues herauskommt. Zusagen kann ich: gezielt dort zu suchen, wo übersehene Ideen auf neue Hardware treffen, jede Idee
  mit einem vorher festgelegten Kriterium zu prüfen und ehrlich zu sagen, wenn sie nicht trägt.
- Kluge Tricks sehen nur mit einem klaren Auge gut aus. Ob eine gemalte Kugel nach Kunst oder nach Effekt aussieht, entscheidet deine
  Art Direction, nicht die Technik.

## 7 Quellen

- Metal: [Neues in Metal](https://developer.apple.com/metal/whats-new/), [WWDC25, Metal 4](https://developer.apple.com/videos/play/wwdc2025/211/),
  [WWDC26, Sitzung 359](https://developer.apple.com/videos/play/wwdc2026/359/)
- Neuronale Materialien: [NVIDIA, Real-Time Neural Appearance Models](https://research.nvidia.com/labs/rtr/neural_appearance_models),
  [Real-Time Neural Materials on Mobile VR (CGF 2026)](https://diglib.eg.org/items/5a68e207-0669-4f16-b31f-7bcc486f99f4),
  [Multi-Scale Neural Representation for Complex Surface Reflectance (CGF 2026)](https://diglib.eg.org/items/03388295-db85-46bb-b9f8-942a2aaefba5)
- Forschung (ohne Link): P.-P. Sloan, W. Martin, A. Gooch, B. Gooch, „The Lit Sphere“, Graphics Interface 2001; C. Loop, J. Blinn,
  „Resolution Independent Curve Rendering using Programmable Graphics Hardware“, SIGGRAPH 2005; E. Lengyel, „GPU-Centered Font Rendering
  Directly from Glyph Outlines“, JCGT 2017; S. R. Richter, H. A. AlHaija, V. Koltun, „Enhancing Photorealism Enhancement“, 2021;
  M. Nießner, C. Loop, M. Meyer, T. DeRose, „Feature-Adaptive GPU Rendering of Catmull-Clark Subdivision Surfaces“, ACM TOG 2012;
  B. Kerbl, G. Kopanas, T. Leimkühler, G. Drettakis, „3D Gaussian Splatting for Real-Time Radiance Field Rendering“, SIGGRAPH 2023;
  B. Karis und andere, „Nanite“, SIGGRAPH 2021 (Kurs); R. K. Jones und andere, „ShapeAssembly“, SIGGRAPH Asia 2020.
- Vorbilder kleiner Teams: Procreate, Nomad Sculpt, Rive, Townscaper; dazu Dreams (Media Molecule).
- Vorher: Teil 2 (Tempo, Web oder nativ), Teil 7 (Befehlsschicht), Teil 9 (Engine, Zehn-Minuten-Frage), Teil 11 (Haptik und Physik).
