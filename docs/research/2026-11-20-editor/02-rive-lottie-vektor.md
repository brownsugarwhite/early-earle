# Rive, Lottie und die Vektor-Animationswerkzeuge (Recherche, 20.11.2026)

Teil der Recherche für den Figureneditor „Studio“: Vektorformen als Grundlage, Morph zwischen Schlüsselformen, Knochen mit Gewichten
bis auf einzelne Anker und Griffe, Posen und frei bestimmbare Übergänge, Physik, Spiellogik, eingebaute 2D-Shader. Dieses Kapitel
behandelt **Rive** gründlich, dazu **Lottie und After Effects**, die **Rigging-Erweiterungen für After Effects** (Duik Ángela,
Joysticks 'n Sliders, RubberHose, Limber) sowie **Cavalry, Jitter, Linearity Move und Haiku**. Leitfrage: Wie verbinden diese
Werkzeuge Vektorformen, Morph und Knochen, wie gut sind ihre Formmorphs, und was heißt das für unseren Fall (Charakter- und
Physik-Spieleditor, ein Art Director ohne Programmierkenntnisse, Mac und iPad/iPhone)?

**Methode und Grenzen.** Gestützt auf Handbücher, Changelogs und – wo die Doku schweigt – den offenen Laufzeit-Quellcode von Rive;
Herstellervergleiche sind als solche gekennzeichnet; Nutzerstimmen aus Bewertungsportalen und Foren. Die Websuche war für alle
parallel laufenden Recherchen gemeinsam begrenzt und war erschöpft, als Cavalry an der Reihe war. Cavalry, Jitter, Linearity Move
und Haiku stützen sich deshalb nur auf direkt abgerufene Herstellerseiten, ohne Nutzerstimmen und ohne eigenen Test.

---

## Kurzfassung

1. **Rive ist das nächste Vorbild für „Studio“.** Es verformt Vektorpfade mit Knochen und erlaubt getrennte Gewichte für jeden Anker
   und für jeden der beiden Bézier-Griffe. Im Laufzeitcode trägt jeder Anker bis zu vier Knochen mit 8-Bit-Gewichten, die Griffe
   haben eigene Gewichtssätze. Dazu kommen Joysticks (Zeitleisten als Posen-Achsen), ein reifer Zustandsautomat mit Mischzuständen,
   Datenbindung, Skripte in Luau (seit 13.01.2026 allgemein) und analytisches Feathering.
2. **Rive speichert Bézier-Griffe als Winkel und Länge** (alle drei Griff-Ankertypen im Laufzeitcode). Das bestätigt den Weg unseres
   Prototyps („Griffe nach Winkel und Länge“). Morph gibt es in Rive aber nur zwischen Ständen **desselben** Pfads (Vertex-Schlüssel):
   Die Zuordnung der Anker ist dadurch eindeutig, eine automatische Zuordnung fremder Formen gibt es nicht.
3. **Rive hat keine eingebaute Physik.** Der Hersteller schreibt das in seinem eigenen Vergleich mit Spine; im Laufzeitcode gibt es nur
   Scroll-Physik. Federn, Schwerkraft und Kollisionen entstehen dort ausschließlich über Skripte.
4. **Übergänge sind in Rive Überblendungen.** Ein Übergang hat Dauer, Kurve, Exit Time und Zufallsgewichte, aber keine eigenen
   Zwischenformen. Wer einen Übergang selbst formen will, muss einen eigenen Zustand mit eigener Zeitleiste dazwischen bauen.
5. **Die größte Hürde in Rive ist der Zustandsautomat.** Bewertungen und eine Fallstudie nennen übereinstimmend die Logik als den
   schwersten Teil für Gestalter (Grundlagen in Stunden, Zustandsautomat in Tagen).
6. **Das Weiche in Rive ist Feathering, nicht Verschmelzen.** Weiche Kanten werden analytisch auf dem Pfad gerechnet, ohne
   Unschärfe-Durchgang. Das braucht den eigenen Renderer und erzwingt die Füllregel „Clockwise“. Flächen, die weich ineinander
   fließen, und Verjüngungen statt gleich dicker Striche gibt es nicht eingebaut; danach wird im Forum gefragt.
7. **Der Rive-Editor läuft auf Mac, Windows und im Browser, nicht auf dem iPad.** Export ohne Startbild kostet ein Abo (Cadet 17 $
   im Monat oder 108 $ im Jahr). Die Laufzeiten sind MIT-lizenziert und klein (Web 222–648 KB komprimiert).
8. **Lottie ist ein Abspielformat.** Die offene Spezifikation 1.0 (Linux Foundation, September 2024) enthält nur verbreitete
   Funktionen. Lottie kennt keine Knochen und keine Physik; Rigs aus After Effects werden zu Schlüsseln gebacken. Pfad-Morph braucht
   gleich viele Anker, und der Funktionsumfang schwankt je Plattform. Interaktivität kommt seit 2025 über dotLottie-Zustandsautomaten.
   Sie schalten Segmente; eine Mischung zwischen Zuständen beschreibt der Hersteller nicht.
9. **After Effects morpht Pfade über die Nummer der Anker.** Jeder Anker läuft auf gerader Bahn, beginnend beim „ersten Anker“; Griffe
   werden als x/y-Vektoren gemischt. Falscher Startpunkt oder umgekehrte Richtung verdrehen die Form oder stülpen sie um. Smart Mask
   Interpolation hilft mit vielen erzeugten Schlüsseln, kostet aber die Easing-Kurven.
10. **Die Plugins für After Effects liefern die besten Bedienideen.** Joysticks 'n Sliders: Posen auf einem Steuerknüppel oder Schieber
    mischen, auch für Pfade. RubberHose und Limber: ein Glied als ein biegsamer Strich mit Reglern für Härte, Rundung und Umklappen.
    Duik: Autorig, Konnektor, Federn. Alles beruht jedoch auf Expressions, ist an den Desktop gebunden und wird für Lottie gebacken.
11. **Cavalry (Canva, Pro-Funktionen seit April 2026 frei) hat den technisch stärksten Morph der Motion-Werkzeuge.** Er bietet die
    Strategien Kubisch, Starr (ARAP) und Feld (SDF), Paarung nach Nähe oder Nummer und eine Regel für unpaarige Anker. Dazu kommen
    Blend Shapes mit additiven Deltas, Metaballs (2.8), ein Gummischlauch-Glied als Zwei-Knochen-IK und Box2D-Physik mit Weichkörpern.
    Cavalry hat aber keine interaktive Laufzeit: Der Web-Player ruht.
12. **Für unseren Fall deckt kein vorhandenes Werkzeug alles ab:** Formmorph unter Kontrolle des Auges, Knochen, eingebaute Physik,
    Spiellogik, verschmelzende Flächen und Arbeiten auf dem iPad. Der eigene Editor ist begründet. Er sollte Rives Datenmodell und
    Logik-Begriffe übernehmen, dazu die Posen-Achsen von Joysticks 'n Sliders sowie die Morph-Strategien und die Weichkörper-Regler
    von Cavalry. Lottie taugt nur als optionaler Export gebackener Clips.

---

## 1. Rive

### 1.1 Was Rive heute ist

- **Selbstbild 2026:** eine „agent-native“ 2D- und 3D-Engine. Man baut entweder von Hand im Editor oder mit einem Coding-Agenten über
  die Rive-CLI ([Einführung](https://rive.app/docs/getting-started/introduction)).
- **Editor:** Desktop-App für macOS und Windows, dazu ein Web-Editor im Browser ([Downloads](https://rive.app/downloads)). Eine
  Linux-App fehlt; im Forum klagt ein Nutzer über die schlechte Leistung des Browser-Editors unter Linux
  ([Forum](https://rive.app/community/forums/bugs/fsLjspgTHYcR/rive-editorsite-bad-performance-on-linux-machine/ft6zrBzmF8BG)).
  Eine iPad-App gibt es nicht; ob der Web-Editor auf dem iPad bedienbar ist, sagt der Hersteller nicht.
- **Laufzeiten:** quelloffen unter MIT, für Web (WASM), iOS/macOS, Android, Flutter, React/React Native, C++, Unity, Unreal und Defold
  ([Rive vs. Spine](https://rive.app/rive-vs-spine), [Unity](https://rive.app/docs/game-runtimes/unity/unity)).
- **Zeitleiste der letzten Neuerungen** ([Releases](https://rive.app/blog/releases)):

| Datum | Neuerung |
|---|---|
| 11.02.2025 | Vector Feathering (weiche Kanten, Glühen, Schatten) |
| 15.04.2025 | Data Binding (View Models statt Eingaben) |
| 17.07.2025 | Listen, Bilder und Artboards in der Datenbindung ([Blog](https://rive.app/blog/data-binding-supercharged-lists-images-and-artboards)) |
| 04.09.2025 | Komponenten (früher „verschachtelte Artboards“) |
| 20.10.2025 | Export wird Teil der Bezahlpläne, neuer günstiger Plan ([Blog](https://rive.app/blog/rive-s-new-9-mo-plan)); heute exportiert der freie Plan nur mit Startbild |
| 12./13.01.2026 | KI-Coding-Agent; Scripting allgemein verfügbar ([Blog](https://rive.app/blog/scripting-is-live-in-rive)) |
| 30.04.2026 | KI-Agent auch im freien Plan |

- **Preise heute** ([Preise](https://rive.app/docs/account-admin/pricing)):
  - **Free:** Export nur mit Rive-Startbild, drei gemeinsame Dateien; Zustandsautomat, Datenbindung und Scripting sind enthalten.
  - **Cadet:** 17 $ je Platz und Monat oder 108 $ im Jahr, Export ohne Startbild, beliebig viele Dateien.
  - **Voyager:** 49 $, mit Bibliotheken und Agent-Guthaben.
  - **Enterprise:** 1 440 $ je Platz und Jahr.

  Exportierte Dateien laufen nach Rives Ankündigung auch ohne Abo weiter, und es gibt keine Laufzeitgebühren.

### 1.2 Bedienung: Design- und Animate-Modus

Rive trennt das Bauen (Design) vom Bewegen (Animate). Der Grund steht in der Doku: Sobald eine Zeitleiste gewählt ist, erzeugt jede
geänderte Eigenschaft einen Schlüssel. Die zwei Modi verhindern versehentliche Schlüssel ([Keys](https://rive.app/docs/editor/animate-mode/keys)).

- **Ein Symbol für alles:** Neben jeder Eigenschaft sitzt ein Schlüssel-Knopf mit drei Zuständen: grau umrandet (nicht animiert),
  farbig umrandet (animiert, aber kein Schlüssel am Abspielkopf), gefüllt (Schlüssel am Abspielkopf). Dasselbe Bedienelement gilt für
  Lage, Farbe und Anker. Das ist eine gute Vorlage für „alles funktioniert gleich“.
- **Schlüssel bearbeiten:** verschieben; mit ⌥ das Timing einer Auswahl strecken; mit ⌘⌥ dieselbe Bewegung über mehrere Objekte
  staffeln; Kopieren über Objekte hinweg (passende Eigenschaften werden übertragen); Schlüssel umkehren; einen Schlüssel an Daten
  binden (Rechtsklick „Data Bind“).
- **Zeitleiste** ([Timeline](https://rive.app/docs/editor/animate-mode/timeline)):
  - Abspielarten: einmal, Schleife, Ping-Pong.
  - Arbeitsbereich, Einrasten auf 60 Bilder/s (einstellbar), „Quantize“ für Stop-Motion.
  - Gegen den Spuren-Wust gibt es Filter: nur Auswahl zeigen, Tasten P/R/S/O/T blenden Lage, Drehung, Größe, Deckkraft oder alle
    Transformationen ein.
  - „Apply all to design mode“ übernimmt die Werte am Abspielkopf in die Grundform.
- **Interpolation** ([Easing](https://rive.app/docs/editor/animate-mode/interpolation-easing)):
  - Hold, Linear (voreingestellt), Cubic (wie CSS-`cubic-bezier`, kein Überschwingen).
  - Cubic Value: Griffe im Kurveneditor, darf überschwingen, mit automatischen Griffen durch die Nachbarschlüssel.
  - Elastic: Amplitude und Periode, wie eine Feder.
  - Kurveneditor mit Wert- und Geschwindigkeitsansicht ([Graph Editor](https://rive.app/docs/editor/animate-mode/graph-editor)).
- **Einschätzung:** Die Grammatik ist einheitlich (Knopf, Schlüssel, Bindung). Die Zeitleiste ist aber klassisch nach Spuren je
  Eigenschaft gebaut. Bei Figuren mit vielen Ankern braucht man die Filter ständig. Eine Fallstudie (Juni 2025) nennt als Umstellung
  für Gestalter, dass das Schlüsseln von Pfaden und Ankern anders funktioniert als in After Effects
  ([Fallstudie](https://rive.app/blog/how-cars24-revved-up-interactions-and-engagements-with-rive)).

### 1.3 Pfade, Ankertypen und Griffe

- **Vier Ankertypen** ([Edit Vertices](https://rive.app/docs/editor/fundamentals/edit-vertices)):
  - **Straight:** ohne Griffe, mit eigenem Eckenradius.
  - **Mirrored:** beide Griffe mit gleichem Winkel und gleicher Länge.
  - **Asymmetric:** gleicher Winkel, eigene Längen.
  - **Detached:** beide Griffe frei.
- **Anker in beiden Modi bearbeitbar.** Im Animate-Modus schlüsselt man alle oder nur die gewählten Anker (⇧K). Anker vereinfachen
  (Simplify) geht nur im Design-Modus. Wer einen Anker löscht, löscht auch seine Schlüssel und seine Knochengewichte. Ein Rechteck
  oder eine Ellipse muss erst in einen freien Pfad umgewandelt werden; dabei gehen ihre Schlüssel verloren.
- **Griffe als Winkel und Länge (Beleg aus dem Laufzeitcode):** Rive speichert die Griffe nicht als Punkte. Jeder Ankertyp hat dafür
  Winkel- und Längenwerte ([rive-runtime](https://github.com/rive-app/rive-runtime), Dateien `cubic_*_vertex_base.hpp`):

  | Ankertyp | gespeicherte Werte |
  |---|---|
  | Detached | `inRotation`, `inDistance`, `outRotation`, `outDistance` |
  | Mirrored | `rotation`, `distance` |
  | Asymmetric | `rotation`, `inDistance`, `outDistance` |

  Ein Morph zwischen zwei Schlüsseln mischt deshalb Winkel und Länge der Griffe und nicht ihre Endpunkte. Ein glatter Anker bleibt
  glatt, und ein drehender Griff wird unterwegs nicht kürzer. Genau so arbeitet unser Prototyp (`raster.ts`: „Griffe nach Winkel und
  Länge“).
- **Grenze:** Jede Zahl (x, y, Griffwinkel, Grifflänge) läuft einzeln nach der Interpolation ihres Schlüssels. Voreingestellt ist das
  linear von Schlüssel zu Schlüssel. Mit „Cubic Value“ und automatischen Griffen läuft sie glatt durch die Nachbarschlüssel, kann dann
  aber überschwingen. Eine monotone Kurve über mehrere Schlüsselformen hinweg (PCHIP wie im Prototyp) gibt es nicht. Auch einen
  Schutz gegen Anker, die aneinander vorbeilaufen (unsere „Faltschlüssel“), gibt es nicht; darauf muss das Auge achten.

### 1.4 Knochen auf Vektorpfaden

**Bedienung** ([Bones](https://rive.app/docs/editor/manipulating-shapes/bones), [Bone Tips](https://rive.app/docs/editor/manipulating-shapes/bone-tips)):

- **Knochen setzen:** Mit dem Knochenwerkzeug (B) klickt man Ketten; jeder neue Knochen ist Kind des vorigen. Abzweige beginnen an
  einem gewählten Gelenk. Nur der Wurzelknochen hat eine Lage (x, y); alle anderen haben Länge und Drehung relativ zum Elternteil.
  Gelenke sind keine eigenen Objekte. Wer ein Gelenk verschiebt, ändert Länge und Drehung der beiden anliegenden Knochen.
- **Drei Wege, mit Knochen zu steuern:**
  1. Starre Teile (Hand, Schuh) an einen Knochen hängen.
  2. Anker und Bézier-Griffe eines Pfads an einen oder mehrere Knochen binden.
  3. Ein Bild über ein Mesh binden.

  Die drei Wege lassen sich in einem Rig mischen, etwa eine starre Hand am Unterarm und einen Ärmel, der über mehrere Knochen gewichtet
  ist.
- **Binden:** Im Inspector unter „Bind Bones“ Knochen wählen. Jeder Knochen bekommt eine Farbe, und jeder Anker zeigt ein
  Kreisdiagramm aus diesen Farben; die Summe ist immer 100 %.
- **Werkzeuge für Gewichte:**
  - **Auto-Weights** nach dem nächsten Knochen, mit zwei Reglern: *Blend* (wie breit die Übergänge zwischen Knochen sind) und
    *Influence* (wie viele Knochen höchstens auf einen Anker wirken).
  - **Smooth** gleicht Gewichte zwischen Nachbarn an.
  - **Edit Weights:** Gewicht eines Knochens durch Ziehen nach oben oder unten ändern.
  - **Sperren** eines Gewichts, damit andere Änderungen es nicht verschieben.
  - **Show Weights** blendet die Kreisdiagramme ein oder aus.
- **Griffe eigens gewichten:** Auf Vektorpfaden lassen sich die Griffe getrennt vom Anker gewichten, für feinere Kontrolle über die
  Biegung.

**Mechanik in der Laufzeit:**

- **Speicherung:** Ein Gewicht packt die Knochen-Nummern und die Werte in je eine 32-Bit-Zahl, also höchstens vier Knochen je Punkt
  mit 8-Bit-Auflösung ([weight.cpp](https://skia.googlesource.com/external/github.com/rive-app/rive-cpp/+/3b98edc46a174e63848665d59c5517207bf9ad33/src/bones/weight.cpp)).
- **Rechnung:** Die Verformung ist lineare Mischung der Knochenmatrizen (Linear Blend Skinning).
- **Griffe:** Ein `CubicWeight` hält eigene Werte- und Nummernsätze für den Eingangs- und den Ausgangsgriff. Beide Griffpunkte werden
  durch die gemischten Matrizen geschickt (`cubic_weight_base.hpp`, `cubic_vertex.cpp`).
- **Reihenfolge:** Erst wirkt der Morph (auch geschlüsselte Ankerlagen, also die Ruhelage), danach verformen die Knochen.

**Einschätzung:**

- Für Vektoren ist das das ausgereifteste Modell am Markt. Getrennte Gewichte für die Griffe sind selten. Sie lösen das Problem, dass
  eine Kurve am Gelenk sonst „hinter“ dem Anker herzieht.
- Lineare Mischung von Matrizen hat die bekannten Schwächen: Bei starker Beugung fällt das Gelenk ein, und ein Griff, dessen Ende
  anders gewichtet ist als sein Anker, ändert Länge und Winkel unkontrolliert. Rive gibt dagegen die Werkzeuge an die Hand
  (Gewichte, Glätten). Eine eingebaute Ausgleichsform je Knochenwinkel, wie bei Moho mit „Smart Bones“, gibt es nicht. Behelfsweise
  lässt sie sich bauen, indem ein Joystick-Griff einem Punkt am Knochen folgt und so eine Zeitleiste mit Ausgleichsformen spult; das
  wurde hier nicht geprüft.
- **Kosten:** Für jeden Anker drei Gewichtssätze sind mächtig, in der Praxis aber viel Pflege. Sinnvoll ist ein Standard „Griff erbt
  das Gewicht seines Ankers“, der nur bei Bedarf getrennt wird.

### 1.5 Meshes

- **Nur für Bilder und Komponenten:** Meshes gibt es nur auf Rasterbildern und auf Komponenten im Modus „Node“. Eine Komponente wird
  dabei flach gezeichnet und dann verformt. Vektorpfade bekommen keine Meshes, sie werden direkt über Anker und Griffe verformt
  ([Meshes](https://rive.app/docs/editor/manipulating-shapes/meshes)).
- **Werkzeuge:** Kontur automatisch nachzeichnen (Auto-Trace), mehr Punkte erzeugen, erzwungene Kanten für Falten und Ecken,
  Mesh-Punkte direkt schlüsseln oder an Knochen binden.

Für uns ist das nebensächlich, solange Ozzy aus Vektoren besteht. Interessant ist es für spätere Texturen oder Fotos.

### 1.6 Constraints

Rive hat diese Bindungen ([Übersicht](https://rive.app/docs/editor/constraints/constraints-overview), [llms.txt](https://rive.app/docs/llms.txt)):

| Bindung | Wirkung | Wichtige Regler |
|---|---|---|
| **IK** ([IK](https://rive.app/docs/editor/constraints/ik-constraint)) | Kette zum Ziel; Ziel ist meist eine Gruppe vom Stil „Target“ | Knochenzahl; Biegerichtung umkehren; Stärke (animierbar, so blendet man zwischen FK und IK) |
| **Distance** ([Distance](https://rive.app/docs/editor/constraints/distance-constraint)) | Abstand zu einem Ziel halten | Modus näher, weiter oder genau |
| **Transform, Translation, Rotation, Scale** | Werte eines Ziels kopieren und/oder begrenzen | unabhängig von der Hierarchie |
| **Follow Path** ([Follow Path](https://rive.app/docs/editor/constraints/follow-path-constraint)) | Objekt läuft auf einem Pfad | Strecke in %, auch über 100 %; mitdrehen; Versatz |
| **Scroll** ([Scroll](https://rive.app/docs/editor/constraints/scroll-constraint)) | Inhalte in Layouts scrollen | mit elastischer oder begrenzter Scroll-Physik, der einzigen Physik im Laufzeitcode |

- **Reihenfolge:** Bei 100 % gewinnt die untere Bindung, darunter wird gemischt.
- **IK verschachteln:** IK-Ziele lassen sich verschachteln, etwa das Fußziel als Kind des Beinziels.
- **Für Ozzy:** IK für die Beine auf dem gekrümmten Rad, Distance für hängende Teile, Follow Path für Hindernisse auf dem Rad. Alles
  ist kinematisch; nichts davon schwingt nach.

### 1.7 Joysticks, Solos, Komponenten

- **Joysticks** ([Joysticks](https://rive.app/docs/editor/manipulating-shapes/joysticks)):
  - Jede Achse (X, Y) spult eine eigene Zeitleiste. Eine Zeitleiste wird so zur **Posen-Achse**: links, Mitte, rechts als Schlüssel
    bei 0 %, 50 % und 100 %.
  - Mit nur einer Achse wird der Joystick zum Schieber. Jede Achse lässt sich umkehren.
  - Der Griff kann einem anderen Objekt folgen, etwa dem Mauszeiger, während der Zustandsautomat läuft.
  - So baut man in Rive Kopfdrehungen und Gesichter, wie schon die Recherche vom 18.11. festhielt. Das Prinzip „Zeitleiste =
    Parameterachse“ ist elegant: Eine Achse kann beliebig viele Schlüsselposen mit eigenen Kurven tragen.
- **Solos** ([Solos](https://rive.app/docs/editor/manipulating-shapes/solos)): Eine Gruppe zeigt nur ein Kind, etwa für Mundformen,
  Hüte oder Bildfolgen. Inaktive Kinder werden weder gezeichnet noch gerechnet. Das aktive Kind wird geschlüsselt (springt hart) oder
  gebunden.
- **Komponenten** ([Components](https://rive.app/docs/editor/fundamentals/components)):
  - Wiederverwendbare Artboards. Die Quelle lässt sich zur Laufzeit per Bindung tauschen.
  - Jede Instanz bekommt ihren eigenen Zustandsautomaten oder Zeitleisten. Eine *Remap*-Zeitleiste stellt Mischung und Abspielstelle
    in Prozent als Regler bereit.
  - Komponenten im Modus „Node“ lassen sich mit einem Mesh an Knochen binden.

### 1.8 Zustandsautomat

**Aufbau** ([State Machine](https://rive.app/docs/editor/state-machine/state-machine), [States](https://rive.app/docs/editor/state-machine/states)):

- **Ebenen:** Jede Ebene ist ein eigener Graph, alle laufen gleichzeitig (etwa Gehen auf einer Ebene, Blinzeln auf einer anderen).
  Animieren zwei Ebenen dieselbe Eigenschaft, gewinnt die untere. Ebenen lassen sich zum Testen einzeln abschalten.
- **Zustände:**
  - **Entry, Any State, Exit:** Exit hält die Ebene an; ein Übergang aus „Any State“ startet sie wieder.
  - **Single:** eine Zeitleiste, mit Tempo; ein negativer Wert spielt rückwärts.
  - **1D-Blend:** mischt mehrere Zeitleisten nach einer Zahl. „Capture Base State“ ist voreingestellt: Jeder Frame beginnt bei den
    Grundwerten, also ergibt derselbe Wert immer dasselbe Bild.
  - **Additive Blend:** legt Zeitleisten mit je 0–100 % übereinander. Der Anteil ist fest, an ein View-Model gebunden oder kommt aus
    einer alten Eingabe.

  Die Recherche vom 18.11. fand einen Forumshinweis, dass die 1D-Mischung nicht linear wirkt und additives Mischen besser sei; das
  wurde hier nicht erneut geprüft.

**Übergänge** ([Transitions](https://rive.app/docs/editor/state-machine/transitions)):

- **Bedingungen:** View-Model-Werte, Ereignisse oder Artboard-Breite, -Höhe und -Verhältnis. Alle Bedingungen eines Übergangs müssen
  gelten. Mehrere Übergänge zwischen denselben Zuständen ergeben ein ODER.
- **Dauer:** voreingestellt 0, also ein harter Schnitt. Dazu eine Kurve: linear voreingestellt, kubisch und weitere; Kurven auf
  Übergängen gibt es seit Juni 2023 ([Changelog](https://rive.app/changelog/motion-paths-and-interpolation-on-transitions)).
- **Exit Time:** als Zeit oder in Prozent; 100 % heißt „erst zu Ende spielen“.
- **Weitere Schalter:** „Pause Source When Exiting“ und „Allow exit during transition“; Letzteres lässt einen Hover-Effekt sofort
  umkehren.
- **Aktionen** am Anfang oder Ende eines Übergangs: Wert setzen, Ereignis melden, Fokus.
- **Randomize Exit** mit Gewichten: 3 : 1 ergibt 75 % zu 25 %.
- Übergänge lassen sich abschalten, ohne sie zu löschen.

**Zuhörer und Ereignisse** ([Listeners](https://rive.app/docs/editor/state-machine/listeners)):

- **Auslöser:**
  - Zeiger: betreten, verlassen, bewegen, drücken, loslassen, ziehen, klicken (linke, rechte und mittlere Taste).
  - Daten und Ereignisse: Änderung eines View-Model-Werts, Rive-Ereignis.
  - Bedienung: Fokus, Tastatur, Gamepad, Texteingabe, Barrierefreiheit.
- **Treffbereich:** Eine Form kann ihn sein; „Opaque Target“ hält Zeiger auf, eine Capture-Phase greift vor inneren Elementen.
- **Aktionen:** Wert setzen, Objekt zum Zeiger bewegen, Ereignis melden, Fokus.
- **Ereignisse** können auch Töne abspielen (Audio Events) oder Links öffnen.

**Einschätzung:**

- Das ist der vollständigste visuelle Logik-Baukasten unter den Vektor-Werkzeugen.
- Für das Rad-Spiel wäre vieles direkt da:
  - Ziehen am Rad über „Pointer Drag“.
  - Gehtempo als 1D-Blend nach der Radgeschwindigkeit.
  - Eigenwille über „Randomize Exit“ mit Gewichten.
  - Tapsen und Stolpern als Audio-Ereignisse.
- Was fehlt:
  - Übergänge haben keine eigene Form. Sie mischen die Werte der beiden Zustände über die Dauer; eine Zwischenpose für genau diesen
    Übergang geht nur über einen eigenen Zwischenzustand.
  - Die Lernkurve ist steil (siehe 1.12).

### 1.9 Datenbindung

**Grundlage** ([Overview](https://rive.app/docs/editor/data-binding/overview), [Migration](https://rive.app/docs/editor/data-binding/migration-guide)):

- View Models beschreiben die Daten, Instanzen halten die Werte.
- Bindungen verbinden sie mit beliebigen Eigenschaften, in beide Richtungen und unabhängig von der Hierarchie: Wer umbenennt oder
  umbaut, bricht keinen Code.
- Seit 2025 ersetzt die Datenbindung die alten Eingaben (Bool, Zahl, Auslöser) und das Abhören von Ereignissen zur Laufzeit. Beides
  läuft weiter, gilt aber als abgelöst.

**Konverter** ([Converters](https://rive.app/docs/editor/data-binding/converters)) formen Werte vor der Bindung um:

| Art | Konverter |
|---|---|
| Zahl | Round, Calculate, Range Map, Formula (auch mit Zufall), Convert to Number |
| Glätten über die Zeit | Interpolator für Zahlen und Farben |
| Text | Pad, Trim, Convert to String, Remove Trailing Zeros, String Template |
| Schalter | Toggle |
| Listen | Number to List, List to Length |
| Eigene | Konverter-Skripte |

Konverter lassen sich verketten. Besonders nützlich für Spiele sind *Range Map* (Radgeschwindigkeit auf Gehtempo) und *Interpolator*
(ein Wert springt nicht, sondern gleitet nach).

### 1.10 Scripting, Shader, KI-Agent

**Skripte:**

- **Sprache:** Luau, eine typisierte Lua-Variante ([Blog](https://rive.app/blog/scripting-is-live-in-rive)). Begründung des Herstellers
  ([Warum Luau](https://rive.app/blog/why-scripting-runs-on-luau)): Die virtuelle Maschine ist nur einige hundert Kilobyte groß, lässt
  sich abschotten und stoppen und verhält sich ausreichend deterministisch. Die Editor-Typen werden aus der C++-Engine erzeugt.
  WebAssembly und JavaScript wurden verworfen, weil Speicher-Modell, Größe und Typprüfung nicht passen.
- **Gleicher Motor:** Der Editor nutzt dieselbe Skript-Engine wie die Laufzeiten.
- **Protokolle** ([Protokolle](https://rive.app/docs/scripting/protocols/overview)): Node (eigenes Zeichnen), Layout, Converter,
  Path Effect, Transition Condition, Listener Action, Util, Test und Dateiformat. Jedes Protokoll erzeugt ein typisiertes Gerüst und
  begrenzt, worauf das Skript zugreifen darf.
- **Node-Skripte** ([Node](https://rive.app/docs/scripting/protocols/node-scripts)):
  - Lebenszyklus `init`, `advance(Sekunden)`, `update` (bei geänderten Eingaben) und `draw(renderer)`.
  - Sie zeichnen Pfade und erzeugen Komponenten zur Laufzeit.
  - Die Doku empfiehlt für Simulationen feste Schritte (1/60 s) mit Akkumulator und höchstens etwa fünf Nachholschritten.
- **Physik:** Die Ankündigung nennt Schwerkraft, Kollisionen, Trägheit, Federn, Folgeketten und Nachschwingen als Einsatzzweck. All
  das ist Code und nicht eingebaut.
- **Path-Effect-Skripte** ([Path Effects](https://rive.app/docs/scripting/protocols/path-effect-scripts)) verändern Pfadgeometrie in
  Echtzeit, angewendet auf Striche.

**Shader** ([WGSL](https://rive.app/docs/scripting/wgsl-shaders), [GPU Canvas](https://rive.app/docs/runtimes/web/gpu-canvas)):

- Eigene Vertex- und Fragment-Shader in WGSL. Ein Skript zeichnet sie auf eine Offscreen-Leinwand und dann als Bild.
- Beim Export werden sie für Metal, GLSL ES 3.0, WGSL, HLSL und SPIR-V übersetzt.
- Keine Compute-Shader. Die GPU-Leinwand ist im Web noch experimentell.

**KI-Coding-Agent:** schreibt Luau, baut Layouts und View Models; seit April 2026 auch im freien Plan.

**Einschätzung:** Rive ist damit ein Spiel-Werkzeug geworden. Für einen Art Director ohne Programmierkenntnisse liegt aber genau das,
was Ozzys Spiel ausmacht (Balance, Stolpern, Federn), auf der Code-Seite.

### 1.11 Laufzeit, Renderer, Feathering

**Rive Renderer** ([Renderer](https://rive.app/renderer), [Open Source](https://rive.app/blog/rive-renderer-now-open-source-and-available-on-all-platforms)):

- Eigener GPU-Renderer für Vektorpfade, quelloffen. Er nutzt Pixel Local Storage und zerlegt Pfade in Dreiecks-Flicken mit
  analytischer Kantenglättung.
- Backends: Metal, Vulkan, D3D11/12, OpenGL/WebGL und WebGPU.
- Im Web verwenden nur die WebGL2-Pakete diesen Renderer. Die Canvas2D-Pakete können manches nicht, etwa Layer-Masken
  ([Feature Support](https://rive.app/docs/feature-support)).

**Größen der Laufzeit** ([Größen](https://rive.app/docs/runtimes/runtime-sizes)):

| Laufzeit | komprimiert | entpackt |
|---|---|---|
| Web canvas-lite | 222 KB | 707 KB |
| Web canvas | 567 KB | 1,7 MB |
| Web webgl2 | 648 KB | 2,2 MB |
| iOS | ≈ 1,7 MB | ≈ 4,7 MB |
| Android | ≈ 2,4 MB | ≈ 7 MB |

**Vector Feathering** ([Doku](https://rive.app/docs/editor/fundamentals/vector-feathering), [Technik](https://rive.app/blog/how-rive-reinvented-feathering-for-the-vectorian-era)):

- **Einstellungen:** Jede Füllung und jeder Strich kann weich werden, nach außen (Glühen, Schatten) oder nach innen (Innenschatten).
  Regler: Stärke (voreingestellt 12), Versatz x/y, Raum (Welt oder lokal). Alles lässt sich schlüsseln und binden.
- **Technik:** Der Renderer rechnet die Abdeckung jeder Kante schon für die Kantenglättung. Beim Feathering wird diese Rampe zu einer
  Gauß-Glocke verbreitert, deren Integral sich analytisch ergibt. Die 50-%-Linie liegt genau auf dem Pfad.
- **Schwierigkeit:** Die harte Arbeit steckte in Kurven und Ecken. Dort braucht es ein 2D-Integral, das Überlappungen der Dreiecke
  ausgleicht.
- **Folge:** Es gibt keinen Unschärfe-Durchgang über Pixel. Die Kante bleibt in jeder Größe sauber und lässt sich in Echtzeit
  animieren.
- **Bedingungen:** Feathering braucht den Rive Renderer und erzwingt die Füllregel „Clockwise“. Sich selbst schneidende Pfade können
  deshalb anders aussehen.
- **Noch nicht da:** Verjüngte Striche, deren Weichheit einer Kurve folgt, nennt der Hersteller als künftige Richtung. Nutzer fragen
  im Forum nach verjüngten Strichen und nach Physik (Themen „Please allow for stroke tapering“, „Physics Feature please“; das alte
  Forum leitet heute auf [community.rive.app](https://community.rive.app/) um).

**Bezug zu uns:** Unser Abstandsfeld-Renderer bekommt weiche Kanten, Glühen und weiches Verschmelzen aus derselben Rechnung. Rives
Feathering ist der Maßstab für Tempo und Sauberkeit, aber kein Ersatz für das Verschmelzen von Flächen.

### 1.12 Was Nutzer loben und kritisieren

**Lob:**

- Kleine Dateien und schnelle Laufzeit. Ein Testbericht nennt etwa 50 KB statt 500 KB als Lottie; eine Fallstudie nennt 150 KB → 15 KB
  ([MakerStack](https://makerstack.co/reviews/rive-review/), [Rive vs. Spine](https://rive.app/rive-vs-spine)).
- Interaktivität ohne Code im App-Projekt, plattformgleiche Darstellung, freie Laufzeiten
  ([Product Hunt](https://producthunt.com/products/rive/reviews)).

**Kritik:**

- **Lernkurve**, vor allem beim Zustandsautomaten. Grundlagen in Stunden, Zustandsautomat in Tagen; Gestalter erleben die Logik als
  zusätzliche Schicht ([MakerStack](https://makerstack.co/reviews/rive-review/),
  [Fallstudie](https://rive.app/blog/how-cars24-revved-up-interactions-and-engagements-with-rive), G2-Bewertungen laut Suchauszug).
- **Kleines Ökosystem:** weniger Anleitungen als After Effects oder Lottie.
- **Preise:** Seit Oktober 2025 kostet der Export ohne Startbild ein Abo
  ([Ankündigung](https://rive.app/blog/rive-s-new-9-mo-plan)). Der Lottie-Import ist nur noch für Enterprise
  ([Blog](https://rive.app/blog/why-importing-lotties-isn-t-the-workflow-rive-was-built-for)).
- **Leistung des Editors bei großen Dateien:** Die Versionsgeschichte lädt minutenlang
  ([Forum](https://rive.app/community/forums/bugs/fsLjspgTHYcR/revision-history-is-incredibly-slow/ftBydzufCzZ6)). Der Hersteller
  hat das in einem Changelog verbessert.
- **Für Spiele-Figuren** gilt Spine als tiefer. Rive selbst nennt Spines eingebaute Physik-Bindung (Haare, Stoff, Nachschwingen) als
  Grund für Spine ([Rive vs. Spine](https://rive.app/rive-vs-spine)).

### 1.13 Bewertung: Morph und Knochen in Rive

| Frage | Rive |
|---|---|
| Wie entsteht ein Morph? | Anker eines Pfads schlüsseln; nur derselbe Pfad, also gleiche Anker in gleicher Reihenfolge |
| Zuordnung der Anker | durch Identität (es ist derselbe Anker); keine Hilfe für fremde Formen |
| Bahn der Anker | Zahl für Zahl nach der Schlüssel-Kurve; linear oder glatt mit möglichem Überschwingen |
| Griffe | Winkel und Länge, also glatt bleibt glatt |
| Knochen und Morph zusammen | Morph in der Ruhelage, danach Knochen (Matrizen linear gemischt); Gewichte je Anker und je Griff |
| Posen mischen | Joystick (Zeitleiste als Achse), 1D- und additive Mischzustände, Ebenen |
| Übergänge | Überblendung mit Dauer und Kurve; keine eigene Übergangsform |
| Was fehlt | Ausgleichsformen je Knochenwinkel, monotone Splines über Schlüsselformen, eingebaute Federn, Verschmelzen |

---

## 2. Lottie und After Effects

### 2.1 Format, Spezifikation, Player

- **Format:** Lottie ist JSON aus After Effects, exportiert über Bodymovin bzw. das LottieFiles-Plugin. Inhalt sind Formebenen, Pfade,
  Füllungen, Striche, Verläufe, Masken und Schlüssel mit Bézier-Easing.
- **Spezifikation:** Die **Lottie Animation Community** der Linux Foundation hat am 17.09.2024 die **Spezifikation 1.0**
  veröffentlicht, am 15.04.2025 die 1.0.1
  ([Linux Foundation](https://www.linuxfoundation.org/press/lottie-animation-community-announces-lottie-v1.0-specification),
  [1.0.1](https://lottie.github.io/news/announcing-lottie-specification-1.0.1)). Sie enthält bewusst nur weit unterstützte
  Funktionen. Bei den Formen sind das Ellipse, Rechteck, Pfad, Stern/Vieleck, Füllung, Strich, Verlaufsfüllung und -strich, Gruppe,
  Transformation. Einziger Modifikator ist Trim Path; Merge Paths, Repeater, Offset Path und Ähnliches stehen nicht im Kern
  ([Shapes](https://lottie.github.io/lottie-spec/1.0/specs/shapes/)).
- **Schlüssel:** Jeder Schlüssel hat Bézier-Easing mit Ein- und Ausgangsgriff in [0,1]. Der Wert darf überschwingen, die Zeit nicht.
  Dazu Hold-Schlüssel ([Properties](https://lottie.github.io/lottie-spec/1.0/specs/properties/)).
- **Player:** lottie-web (SVG, Canvas, HTML), lottie-ios, lottie-android, Skottie (Skia), ThorVG/dotLottie und weitere. LottieFiles
  nennt für iOS mit ThorVG 80 % schnelleres Zeichnen; das ist eine Herstellerangabe
  ([LottieFiles oder Rive](https://lottiefiles.com/blog/lottie-animations/lottiefiles-or-rive)).

### 2.2 Pfad-Morph in After Effects

- **Grundmechanik:** Ein Pfad wird geschlüsselt; zwischen zwei Schlüsseln läuft jeder Anker auf gerader Linie zu dem Anker mit
  **derselben Nummer**, beginnend beim „ersten Anker“ (First Vertex). Steht der erste Anker an unpassender Stelle (oben gegen unten),
  verdreht sich die Form. Laufen die Anker einer Form gegen den Uhrzeigersinn, stülpt sie sich um. Laut Praxisberichten lässt sich die
  Richtung eines Pfads in After Effects nicht direkt umkehren; üblich ist der Umweg über Illustrator
  ([ProVideo Coalition](https://www.provideocoalition.com/managing-moving-masks/),
  [Adobe-Forum](https://community.adobe.com/t5/after-effects-discussions/impossible-to-fix-a-reversed-path-on-a-morph-without-using-illustrator/m-p/13335960)).
- **Ungleiche Ankerzahl:** After Effects fügt selbst Anker hinzu, die selten an der passenden Stelle sitzen. Die Forenpraxis lautet:
  gleiche Ankerzahl, gleicher erster Anker, Anker anatomisch zuordnen, mehr Schlüssel
  ([Adobe-Forum](https://community.adobe.com/t5/after-effects-discussions/how-do-i-morph-shapes-with-different-points-in-a-controlled-way/m-p/10037073),
  [Adobe-Forum 2](https://community.adobe.com/t5/after-effects-discussions/inconsistent-vertex-count-between-keyframes-that-have-same-number-of-vertices/td-p/13296511)).
  Eine Voreinstellung hält die Ankerzahl beim Bearbeiten konstant.
- **Griffe:** In Lottie liegen die Tangenten als x/y-Vektor relativ zum Anker vor und werden komponentenweise gemischt; After Effects
  verhält sich sichtbar gleich (gerade Bahnen). Dreht sich ein Griff zwischen zwei Schlüsseln, wird er unterwegs kürzer, und die
  Kurve knickt ein. Rive und unser Prototyp mischen dagegen Winkel und Länge.
- **Smart Mask Interpolation** (Keyframe-Assistent, Pro-Version) ändert die Interpolation nicht. Sie erzeugt viele Zwischenschlüssel
  und Zusatzanker, damit die gerade Interpolation einen besseren Weg nimmt
  ([Handbuch](https://www.manualsdir.com/manuals/753844/adobe-after-effects.html?page=337), [ProVideo Coalition](https://www.provideocoalition.com/managing-moving-masks/)).
  - **Regler:** Schlüsselrate; gerade Ankerbahnen ja/nein; Biegewiderstand (0 = biegen, 100 = dehnen); Qualität (0 = nur gleiche
    Nummern, 100 = jeder mit jedem); Zusatzanker (oft 100–200); Zuordnung Auto/Kurve/Polylinie; „Erste Anker passen“.
  - **Grenzen:** Easing geht verloren, Ausweg ist Time Remapping. Ein falscher erster Anker oder eine falsche Richtung bleibt falsch.
    Höchstens 99 Schlüssel je Sekunde.
- **Puppet-Werkzeug:** verformt die Ebene über ein Dreiecksnetz mit Nadeln. Es wirkt auf das gerasterte Bild und nicht auf die Anker;
  für Lottie ist es nicht verwendbar.

### 2.3 Grenzen beim Export und Unterschiede je Plattform

- **Kompatibilität laut LottieFiles** ([Kompatibilität](https://docs.lottiefiles.com/en/integrations/after-effects/09_lottie-compatibility)):
  - **Sauber:** Formebenen; Pfad-Animation, aber nur bei gleicher Ankerzahl; Alpha-Masken; einfache Texte.
  - **Teilweise:** Luma-Masken, 3D-Ebenen, komplexe Verläufe; von den Effekten nur Schatten, Tönung und Unschärfe.
  - **Nicht:** Expressions (vorher backen), die meisten Effekte, Glow, Kamera, Licht, Einstellungsebenen, Ton.
- **Je Plattform verschieden** ([Supported Features](https://github.com/airbnb/lottie/blob/master/supported-features.md)):

  | Funktion | Android | iOS | Web | Windows |
  |---|---|---|---|---|
  | Merge Paths | ja | nein | nein | ja |
  | Luma-Masken | nein | nein | unklar | nein |
  | Expressions | nein | nein | ja | nein |
  | Gaußsche Unschärfe | ja | nein | unklar | nein |

  Bei ungleicher Ankerzahl zwischen Pfad-Schlüsseln stürzte lottie-android früher ab. Heute warnt es und zeichnet nur die kleinere
  Zahl von Ankern ([Commit](https://skia.googlesource.com/external/github.com/airbnb/lottie-android/+/4750fbd71bddb2b7f7303bf7ec2ed877cf0a542e)).
- **Praxisfallen** ([EL Passion](https://elpassion.com/blog/lottie-who-common-mistakes-in-after-effects-animation-for-lottie)):
  versteckte Merge Paths aus Illustrator-Importen, zu viele Schlüssel (Pfad-Animation, Wiggler, Autotrace) und damit große Dateien,
  große Masken kosten Leistung, spät getestet ist schwer zu finden.

### 2.4 dotLottie, Zustandsautomaten, Lottie Creator

- **dotLottie:** ein Container, der Animationen, Schriften, Bilder, Themes und Zustandsautomaten bündelt
  ([Power Stack 2026](https://lottiefiles.com/blog/inside-lottiefiles/the-lottie-power-stack-2026)).
- **Zustandsautomaten** (seit 23.09.2025, [Blog](https://lottiefiles.com/blog/state-machines/state-machines-are-finally-in-lottie-creator),
  [Doku](https://docs.lottiefiles.com/en/format/dotlottie/interactivity/state-machines)):
  - Zustände sind **Segmente** einer Animation.
  - Übergänge mit Bedingungen; Eingaben als Zahl, Text, Schalter oder Ereignis.
  - Interaktionen: Maus betritt oder verlässt, Maus gedrückt oder losgelassen.
  - Eine Mischung zwischen Animationen wird nicht beschrieben. Datenbindung ist angekündigt.
- **Lottie Creator** (Web-Editor, Ende 2025 neu geschrieben):
  - Zustandsautomaten, Themes, Easing-Editor, KI-Funktionen.
  - Ein **Physik-Simulator** (seit Dezember 2025) rechnet Schwerkraft, Abprall, Reibung und Kollisionen und **schreibt Schlüssel**.
    Ein Regler wählt zwischen „genau, aber viele Schlüssel“ und „bearbeitbar, aber gröber“
    ([Physik-Simulator](https://docs.lottiefiles.com/en/creator/14_plugins/physics-simulator)).
  - Knochen und Formmorph werden nicht erwähnt.

### 2.5 Einschätzung

Lottie ist der Standard für **Abspielen**: offen, überall abspielbar, riesige Verbreitung. Nach eigener Angabe von LottieFiles gibt es
4,2 Millionen Downloads der Player je Woche gegenüber etwa 134 000 bei Rive; das ist eine Herstellerangabe.

Für einen Figuren- und Spieleditor fehlt aber fast alles:

- keine Knochen zur Laufzeit,
- keine Physik,
- Logik nur als Segment-Schalter,
- Morph nur bei gleicher Ankerzahl, mit kartesischen Griffen,
- Effekte und Masken je Plattform verschieden.

Rive beschreibt Lottie-Dateien als Abspieldateien voller gebackener Schlüssel, ohne Rig und ohne Logik
([Blog](https://rive.app/blog/why-importing-lotties-isn-t-the-workflow-rive-was-built-for)). Das ist parteiisch, trifft aber den Kern.

---

## 3. Rigging-Erweiterungen für After Effects

| Werkzeug | Idee | Stärken | Grenzen |
|---|---|---|---|
| **Duik Ángela** (17. Fassung, frei und quelloffen; [duik.org](https://duik.org/)) | Vollständiger Rigging-Baukasten: Strukturen wie Knochen, Autorig, IK, Konnektor, Automatiken | Autorig erkennt Arm, Bein, Wirbelsäule und Schwanz und baut Regler. Bei mehr als zwei Gliedern wählt er Bézier-IK oder FK mit Nachschwingen ([Autorig](https://github.com/RxLaboratory/Duik/wiki/autorig)). „Bones“ erzeugt für **jeden Anker und jeden Griff** eines Bézier-Pfads einen steuerbaren Knochen ([Bones](https://github.com/RxLaboratory/Duik/wiki/bones)). Automatiken: Wiggle, Rad, Feder, Abprall, Schleife, Schwingen, Blinzeln, Geh- und Laufzyklen. Die Feder nimmt die Geschwindigkeit beim Anhalten auf; der Modus „Simulation“ folgt auch geerbter Bewegung ([Spring](https://github.com/RxLaboratory/Duik/wiki/spring)). | Keine Gewichte: ein Regler je Anker oder Griff. Expressions machen große Szenen langsam. Für Lottie muss alles gebacken werden. |
| **Joysticks 'n Sliders** ([aescripts](https://aescripts.com/joystick-n-sliders), [Vergleich](https://www.schoolofmotion.com/blog/after-effects-tool-review-joysticks-n-sliders-vs-duik-bassel)) | **Posen statt Knochen:** Schlüsselposen auf aufeinanderfolgenden Frames ablegen; ein Joystick mischt fünf Posen (Mitte, links, rechts, oben, unten), Schieber beliebig viele | Wirkt auf alles, ab 1.1 auch auf Masken und Bézier-Pfade. „Path Flipper“ (1.5) spiegelt Pfade so, dass sie gut interpolieren. Ideal für Gesichter und Kopfdrehungen. | Zwischen Posen lassen sich keine Schlüssel setzen; die Mischung ist fest. Nur Joystick und Schieber. Expressions. |
| **RubberHose 3** ([Regler](https://battleaxe.co/rubberhose/docs/controls), [3.2](https://www.toolfarm.com/news/battle-axe-rubberhose-v3-2-new-simple-bend-multi-hose)) | Ein Glied ist ein Strich zwischen zwei Reglern | „Hose Length“ (ab hier gestreckt); „Realism“: 100 % wirkt wie straffes IK, weniger wird weich; „Roundness“ von scharfem zu rundem Knick; „Direction“ gibt auch Tiefe; AutoFlop klappt die Biegung ab einer Schwelle weich um. Seit 3.2.0 (April 2024) mehrere Knicke; „Simple bend“ für schnelles Rendern. | Vor allem für Schlauch-Glieder; Expressions. |
| **Limber 2** ([aescripts](https://aescripts.com/limber/)) | Glieder mit echten Gelenken (Ellbogen, Knie) als Formebenen | IK (dehnbar oder nicht) und FK; eigene Grafik über „Rig & Pose“ | Laut Hersteller nur für Glieder mit einem oder zwei Gelenken, nicht für Schwänze oder Tentakel |

**Was daraus folgt:**

- **Die besten Bedienideen kommen aus diesen Plugins:**
  - Posen auf einem Regler mischen (Joysticks 'n Sliders).
  - Ein Glied als **ein** biegsamer Strich mit sprechenden Reglern: Härte, Rundung, Umklappen (RubberHose, Limber, Cavalry).
  - Ein Autorig, das Gliedertypen erkennt (Duik).
  - Federn als Ein-Klick-Automatik (Duik).
- **Schwäche:** Alles ist aus Expressions zusammengesetzt. Das ist langsam, hängt an After Effects auf dem Desktop und muss für Lottie
  zu Schlüsseln gebacken werden.
- **Bewertung aus der Praxis:** Ein Testbericht empfiehlt, beide zu kombinieren: Joysticks 'n Sliders für Posen, Duik für den Rest des
  Rigs.

---

## 4. Cavalry

**Stellung:** Prozedurales 2D-Motion-Design-Programm, „3D-Denken in 2D“, heute ein Canva-Produkt. Nach dem Umzug zu Canva im
Februar 2026 sind seit 2.7 (16.04.2026) die Pro-Funktionen frei; die Anmeldung läuft über ein Canva-Konto
([2.7](https://cavalry.studio/docs/tech-info/release-notes/2.7/2-7-0-release-notes/)).

**Formen und Morph:**

- **Morph-Verhalten** ([Morph](https://cavalry.studio/docs/nodes/behaviours/morph/)), in 2.8 (30.09.2026) neu geschrieben
  ([2.8](https://cavalry.studio/docs/tech-info/release-notes/2.8/2-8-0-release-notes/)). Es mischt Formen mit **verschiedener**
  Ankerzahl. Die Doku nennt die Optionen, beschreibt sie aber nicht:
  - **Strategie:** Auto, Cubic-Only, **Rigid (ARAP)**, **Implicit (SDF)**.
  - **Paarung:** Auto (nächster Partner) oder Ordered (nach Nummer).
  - **Unpaarige Anker:** zur Mitte zusammenziehen, ausblenden oder stehen lassen.
  - **Ausgabe:** kubische Bézier-Kurven oder Polylinie.

  „Starr“ entspricht dem bekannten As-Rigid-As-Possible-Verfahren (Drehungen statt gerader Bahnen). „Feld“ mischt über Abstandsfelder
  und erlaubt so auch Topologiewechsel. Das ist dieselbe Familie wie unser Renderer.
- **Blend Shape** ([Blend Shape](https://cavalry.studio/docs/nodes/behaviours/blend-shape/)): mehrere Ziele mit gleicher Ankerzahl,
  je mit eigener Stärke. Modus *Replace* oder *Deltas* (additiv; im Beispiel „Lächeln“ plus „Lippe hoch“).
- **Weitere Verformer:** **Metaballs-Form** (2.8, verschmilzt Formen organisch), **Lattice** und Vier-Punkt-Verzerrung (2.6,
  [2.6](https://cavalry.studio/docs/tech-info/release-notes/2.6/2-6-0-release-notes/)), Wellen- und Wander-Verformer,
  **verjüngte Striche** (2.0, [2.0](https://cavalry.studio/docs/tech-info/release-notes/2.0/2-0-0-release-notes/)).

**Glieder und Bewegung:**

- **Rubber Hose Limb** ([Doku](https://cavalry.studio/docs/nodes/behaviours/rubber-hose-limb/)): einfaches Zwei-Knochen-IK auf einer
  Form mit genug Unterteilungen. Gelenk in Prozent, Länge, Verjüngung als Kurve, „Curvature“ (Grifflänge am Gelenk), Umklappen,
  Dehnen.
- **Verhalten:** Spring, Squash and Stretch, Motion Stretch, Look At, Auto-Animate (seit 2.0)
  ([Verhalten](https://cavalry.studio/docs/nodes/behaviours/)).
- **Kein Skelett:** Ein Knochensystem mit Gewichten gibt es nicht.

**Physik:**

- **Forge Dynamics** baut auf **Box2D** auf ([Forge](https://cavalry.studio/docs/nodes/shapes/forge-dynamics/forge-dynamics-shape/)).
- **Körperarten:** dynamisch, still, kinematisch (folgt Schlüsseln) und „Kinematic Hybrid“ (erst Schlüssel, ab dem letzten Schlüssel
  frei).
- **Weichkörper** (seit 2.6) mit Steifigkeit, Dämpfung, Druck, Formtreue, Partikelradius und Höchstdehnung. Ebenfalls seit 2.6 gibt
  es konkave Kollisionsformen und reißende Bindungen.
- Die Ergebnisse lassen sich zwischenspeichern.
- **Grenze:** Während der Simulation darf sich die Geometrie nicht ändern, also keine Pfad-Animation und keine Verformer.

**Ausgabe:**

- **Lottie-Export:** ohne Filter und einige Shader-Arten
  ([Lottie-Export](https://cavalry.studio/docs/user-interface/menus/window-menu/render-manager/lottie-export/)).
- **Web-Player:** WASM, etwa 3 MB, kein Zustandsautomat; derzeit „on hold“
  ([Web Player](https://cavalry.studio/docs/web-player/)).

**Einschätzung:** Cavalry ist kein Figuren- und kein Spieleditor, aber die beste Ideenquelle für den Formmorph: Strategien je Fall,
Paarung, Regel für unpaarige Anker, Deltas, Metaballs. Seine Weichkörper-Regler sind eine brauchbare Vorlage für Ozzys Bohne.

---

## 5. Jitter, Linearity Move, Haiku

- **Jitter** ([jitter.video](https://jitter.video/)): web-basiert, für Marken- und UI-Teams; Vorlagen, Effekte, KI-Agenten, eigene
  Vektorformen morphen, Export als Video, GIF und Lottie. Keine Knochen, keine Logik, keine Physik. Die Morph-Güte wurde hier nicht
  geprüft.
- **Linearity Move** ([linearity.io/move](https://www.linearity.io/move/)): nativ für iPad und Mac. Getrennte Modi für Gestalten und
  Animieren; „Drag to Animate“ (man bewegt ein Objekt, die App setzt die Schlüssel); Morph zwischen Formen per Klick; eigene Kurven;
  Export als Lottie, Video und GIF. Trim Path und Pfad folgen waren auf der Seite als „kommt bald“ angekündigt. Keine Knochen, keine
  Logik. **Wichtig für uns:** Es zeigt, dass Bewegungsgestaltung auf dem iPad mit Stift und Fingern trägt.
- **Haiku Animator** ([GitHub](https://github.com/HaikuTeam/animator)): Lottie-Editor mit Zeitleiste, tabellenartigen
  „Expressions“ und Code-Anbindung. Seit August 2021 quelloffen (AGPL), die Firma hat den Betrieb eingestellt. Die Werkzeugkette ist
  veraltet (Node 8). Haiku ist ein warnendes Beispiel: Ein Werkzeug zwischen Design und Code ohne eigene Laufzeit-Nische hat sich nicht
  gehalten.

---

## 6. Querschnitt

### 6.1 Wie die Werkzeuge Form, Morph und Knochen verbinden

| Werkzeug | Formgrundlage | Morph | Knochen auf Vektoren | Posen mischen | Physik | Logik zur Laufzeit |
|---|---|---|---|---|---|---|
| **Rive** | kubische Pfade, Griffe als Winkel und Länge | Anker schlüsseln, derselbe Pfad | ja, Gewichte je Anker und je Griff, bis 4 Knochen | Joystick, 1D- und additive Mischung, Ebenen | nur per Skript | ja, voll |
| **Lottie** | kubische Pfade, Griffe als Vektor | gleiche Ankerzahl, gerade Bahnen | nein (gebacken) | nein | nein | Segmente schalten (dotLottie) |
| **After Effects + Plugins** | Formebenen | Index, gerade Bahnen, Smart Mask Interpolation | Duik: ein Regler je Anker/Griff; Puppet nur gerastert | Joysticks 'n Sliders | Duik-Feder (Expression) | nein |
| **Cavalry** | Formen und Netze | Morph mit Strategien (kubisch, ARAP, SDF), Blend Shapes mit Deltas | kein Skelett mit Gewichten gefunden (Gummischlauch-Glied) | Blend-Shape-Stärken | Box2D mit Weichkörpern | nein |
| **Jitter / Linearity Move** | Vektorformen | Morph per Klick | nein | nein | nein | nein |

### 6.2 Güte der Formmorphs: Zuordnung der Anker und Bahn

Zwei Fragen entscheiden über einen schönen Morph: **Welcher Anker gehört zu welchem?** (Zuordnung) und **Auf welcher Bahn läuft er?**
(Interpolation). Die Recherchen vom 16. und 18.11. haben die Forschung dazu zusammengefasst: Winkel und Längen statt gerader Bahnen
(Sederberg 1993) und „so starr wie möglich“ (Alexa 2000).

**Zuordnung:**

1. **Durch Identität** (Rive, Lottie, After Effects bei gleicher Ankerzahl, Cavalry Blend Shape, unser Prototyp): Der Gestalter
   zeichnet alle Schlüsselformen durch Verschieben derselben Anker. Das ist die zuverlässigste Zuordnung, weil das Auge sie festlegt.
   Sie verlangt Disziplin: gleiche Anker, gleicher Start, gleiche Richtung.
2. **Automatisch für fremde Formen:**
   - GSAP MorphSVG wählt Startpunkt und Paarung automatisch (`shapeIndex: "auto"`), paart Unterpfade nach Größe, Lage oder
     Komplexität und gleicht die Ankerzahl durch Unterteilen an ([MorphSVG](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/)).
   - flubber macht Polygone daraus und unterteilt bis zu einer Höchstlänge der Kanten ([flubber](https://github.com/veltman/flubber)).
   - Cavalry paart nach Nähe oder Nummer und regelt die Reste.
   - After Effects mit Smart Mask Interpolation sucht den besten ersten Anker und erzeugt Zwischenschlüssel.

   Alle diese Verfahren sind gut für Logo-Übergänge, aber schlecht steuerbar. MorphSVG empfiehlt, den automatisch gefundenen Wert
   festzuschreiben, und rät bei schlechter Paarung zum Zerlegen in Einzelpfade.

**Bahn:**

1. **Gerade Bahnen mit kartesischen Griffen** (After Effects, Lottie, MorphSVG „linear“): Drehende Teile schrumpfen in der Mitte,
   Griffe knicken.
2. **Griffe als Winkel und Länge** (Rive; unser Prototyp): Glatte Anker bleiben glatt, Griffe drehen sauber. Die Anker laufen aber
   weiterhin auf geraden oder einzeln geglätteten Bahnen.
3. **Drehung und Länge auch für die Anker** (MorphSVG „rotational“ um einen Ursprung; Cavalry „Rigid (ARAP)“): Teile drehen, statt zu
   schrumpfen. MorphSVG warnt, dass das je nach Form auch schlechter aussehen kann.
4. **Über Felder** (Cavalry „Implicit (SDF)“): Die Form fließt, auch bei anderer Topologie. Spitzen und genaue Anker gehen dabei
   verloren, sofern man das Ergebnis nicht zurück in Kurven bringt.

**Urteil:**

- Für eine Figur, deren Formen der Art Director selbst zeichnet, ist die **Zuordnung durch Identität** die richtige Grundlage.
- Bahnen mit **Griffen nach Winkel und Länge** und mit einer **monotonen Spline über alle Schlüsselformen** (PCHIP, Prototyp) sind
  besser als alles, was Rive und Lottie eingebaut haben.
- Für Teile mit großen Drehungen (Ohren, Schwanz) kommt eine **Zerlegung in Drehung, Größe und Lage** (Art ARAP) hinzu.
- Automatische Zuordnung gehört nur in einen Assistenten zum **Verbinden fremder Formen** und zeigt Startpunkt und Richtung immer an.

---

## 7. Ehrliche Gegenüberstellung für unseren Fall

Unser Fall: ein Art Director ohne Programmierkenntnisse, der mit dem Auge entscheidet und Übergänge selbst formen will. Ozzy aus
glatten Vektorflächen mit Verjüngungen statt Outlines, verschmelzenden Flächen und Physik. Ein Demospiel auf dem Rad. Mac und
iPad/iPhone.

| Kriterium | Rive komplett | Lottie mit After Effects und Plugins | Cavalry | Eigener Editor „Studio“ |
|---|---|---|---|---|
| Formmorph unter Kontrolle des Auges | gut (Identität, Griffe polar); keine Spline über Schlüsselformen, keine Übergangsform | mittel (Index, kartesisch); Smart Mask Interpolation kostet Easing | technisch stark (ARAP, SDF), aber prozedural und ohne Figur | frei gestaltbar; der Prototyp hat schon PCHIP, polare Griffe und Faltschlüssel |
| Knochen, Gewichte je Anker und Griff | ja, am Markt führend | nur Regler je Anker (Duik); Puppet gerastert | nein | muss gebaut werden; Rive ist die Vorlage |
| Physik (Nachschwingen, Weichkörper, Welt) | nur per Luau-Code | Duik-Feder, gebacken | Box2D mit Weichkörpern, aber nicht zur Laufzeit | eingebaut und sichtbar, muss gebaut werden |
| Spiellogik ohne Code | sehr gut, aber steile Lernkurve | Segmente schalten | keine | muss gebaut werden; Rive als Vorlage, einfacher |
| Verschmelzen, Verjüngung, weiche Kanten | Feathering ja; Verschmelzen und Verjüngung nein | kaum | Metaballs, verjüngte Striche, Filter | Abstandsfeld-Renderer vorhanden |
| Editor auf dem iPad | nein | nein | nein | im Browser möglich, Stift und Gesten sind zu gestalten |
| Laufzeit auf iPhone | ja, klein, schnell | ja, Funktionen je Plattform verschieden | Web-Player ruht | eigener WebGL2-Weg, Tempo selbst sichern |
| Abhängigkeit und Kosten | Abo für Export; Editor und Dateiablage beim Hersteller | Abo für After Effects, Plugins kostenpflichtig | frei, Canva-Konto | eigener Aufwand, volle Kontrolle |
| Aufwand bis zum Demospiel | gering bei Form und Logik, hoch bei Physik (Code) | hoch, für ein Spiel ungeeignet | ungeeignet | hoch; muss in Stufen gebaut werden |

**Ehrliches Urteil:**

- **Wäre das Ziel nur**, eine Maskottchen-Animation schnell in eine App zu bringen, gewänne **Rive**: reif, schnell, plattformgleich,
  mit dem besten Vektor-Knochen-Modell.
- **Für unser Ziel** spricht trotzdem alles für den **eigenen Editor**. Rive hat genau die Punkte nicht, die Florian am wichtigsten
  sind:
  1. Übergänge selbst formen (in Rive nur Überblendung).
  2. Weich verschmelzende Flächen und Verjüngungen statt Outlines (in Rive nicht eingebaut).
  3. Physik ohne Code (in Rive nur Luau).
  4. Arbeiten auf dem iPad (Rive hat keinen iPad-Editor).
  5. Morphs, die über viele Schlüsselformen glatt und monoton laufen (in Rive Zahl für Zahl je Schlüsselpaar).

  Die frühere Entscheidung vom 18.11. („Rive als Werkzeug verfolgen wir nicht“) bestätigt sich.
- **Das Risiko ist der Umfang.** Rive hat Jahre gebraucht. Deshalb sollten wir Rives erprobte Begriffe übernehmen, statt sie neu zu
  erfinden, und in Stufen bauen, jede mit einer sichtbaren Probe an Ozzy.

---

## 8. Empfehlungen für „Studio“

**Form und Morph**

1. **Anker wie in Rive:** Typen Ecke (mit Eckenradius), gespiegelt, asymmetrisch und frei; Griffe gespeichert als Winkel und Länge.
   So bleibt glatt glatt, auch beim Knochen-Verformen und beim Mischen.
2. **Eine Form, viele Schlüsselformen, immer dieselben Anker.** Anker fügt man nur im Formmodus hinzu, und dann in allen
   Schlüsselformen zugleich: an derselben Kurvenstelle (gleiches t, nach De Casteljau geteilt), damit keine Schlüsselform ihr Aussehen
   ändert. Wer einen Anker löscht, löscht ihn überall, samt Gewichten. In Rive ist das genauso.
3. **Bahnen:** Die Anker laufen über alle Schlüsselformen auf einer monotonen Spline (PCHIP, kein Überschwingen), die Griffe polar.
   Für Teile mit großen Drehungen gibt es einen Schalter „starr“, der Drehung, Größe und Lage getrennt mischt (ARAP-Familie, wie
   Cavalry „Rigid“ und MorphSVG „rotational“). Faltschlüssel bleiben die Sicherung gegen aneinander vorbeilaufende Anker.
4. **Assistent zum Verbinden fremder Formen** (Import zweier SVGs mit verschiedener Ankerzahl):
   - Startpunkt und Laufrichtung zeigen, Richtung umkehren.
   - Paarung nach Nähe vorschlagen; der Gestalter setzt Hinweis-Nadeln, wie die Formhinweise in Flash oder Animate, die festlegen,
     welche Stelle zu welcher gehört.
   - Fehlende Anker an passender Kurvenstelle ergänzen.
   - Das Ergebnis sind immer gewöhnliche Schlüsselformen mit gleichen Ankern; zur Laufzeit gibt es keine Automatik.

**Knochen**

5. **Gewichte je Anker, Griffe erben das Gewicht ihres Ankers.** Getrennte Griff-Gewichte wie in Rive gibt es nur auf Wunsch
   (Schalter „Griffe eigen“). Höchstens vier Knochen je Punkt. Anzeige als Kreisdiagramm in Knochenfarben (Rive).
   - Werkzeuge: Pinsel zum Ziehen, Glätten, Sperren, Auto-Gewichte mit zwei Reglern („Weichheit“ wie Blend, „höchstens n Knochen“
     wie Influence).
   - Ziel: Ein Klick liefert ein brauchbares Ergebnis, Feinarbeit nur, wo das Auge es verlangt.
6. **Reihenfolge wie in Rive:** erst der Formmorph in der Ruhelage, dann die Knochen.
   **Neu gegenüber Rive:** Jede Zahl kann eine Formachse treiben: Knochenwinkel, Radgeschwindigkeit, Neigung. Damit formt der Art
   Director für „Knie stark gebeugt“ eine Ausgleichsform, die mit dem Winkel einblendet. Das ist der Kern eines optimalen
   Zusammenspiels von Morph und Knochen. Rive kann das nur über Umwege, weil ein Joystick-Griff der Lage eines Objekts folgt und
   nicht direkt einem Winkel oder einer Geschwindigkeit.
7. **Autorig mit Gliedertypen** (Idee aus Duik): Bein, Schwanz, Ohr, Kopf erkennen und passende Regler setzen. Glieder als ein
   biegsamer Strich mit Reglern Härte, Rundung und Umklappen (RubberHose, Limber, Cavalry). Eine Kette mit mehr als zwei Gliedern
   bekommt Bézier-IK oder FK mit Nachschwingen (Duik).

**Posen und Übergänge**

8. **Pose als Grundobjekt:** eine benannte Sammlung von Werten (Knochen, Formachsen, Farben).
   - **Posen-Achsen** in 1D oder 2D wie Rives Joystick und Joysticks 'n Sliders. Eine Achse darf beliebig viele Schlüsselposen
     tragen (Rive-Prinzip „Zeitleiste als Achse“).
   - **Additive Posen-Ebenen** für Gesicht und Ohren (Cavalry „Deltas“, Rive „Additive“).
   - **Basiswert-Regel** wie Rives „Capture Base State“: Derselbe Wert ergibt immer dasselbe Bild.
9. **Übergänge** im Graphen wie in Rive: Any State, Dauer, Kurve inklusive Feder (Elastic), Exit Time, Abbruch erlaubt,
   Zufallsgewichte für Ozzys Eigenwillen.
   **Neu:** Jeder Übergang kann **eigene Zwischenposen** tragen, die der Art Director mit Zwiebelhaut formt. Das ist das, was
   Joysticks 'n Sliders und Rive nicht können; Duik kann es nur über Schlüssel. Voreingestellt ist eine Überblendung im Posenraum
   (Zahlen mischen, Formen folgen), nie im Bildraum.

**Physik**

10. **Eingebaut und sichtbar** statt Code: Federn auf Knochen, Ankern und Griffen für das Nachschwingen von Ohren, Bart und Schwanz.
    Spine hat dafür eine eingebaute Bindung, Rive nur Code. Für die Bohne ein Weichkörper mit wenigen Reglern (Cavalry: Steifigkeit,
    Dämpfung, Druck, Formtreue). Starre Körper für Rad und Hindernisse.
11. **Feste Schrittweite** von 1/60 s mit Akkumulator und höchstens fünf Nachholschritten (Rive-Empfehlung). Deterministisch, damit
    sich eine Spielszene wiederholen lässt.

**Logik**

12. **Eine Bediengrammatik:** Jede Eigenschaft hat dasselbe kleine Symbol mit drei Möglichkeiten:
    - **Schlüssel** (Zeit),
    - **Bindung** (Daten und Logik),
    - **Feder** (Physik).

    Das erweitert Rives einheitlichen Schlüssel-Knopf um die Physik und erfüllt „alles soll gleich funktionieren“.
13. **Datenmodell statt Eingaben:** Rive hat 2025 die Eingaben durch View Models abgelöst. Wir beginnen gleich so:
    - typisierte Werte (Zahl, Schalter, Auslöser, Auswahl, Farbe, Liste),
    - Konverter (Bereich abbilden, über Zeit glätten, Formel),
    - Zuhörer (Zeiger, Ziehen, Tastatur, Gamepad, Wertänderung, Ereignis),
    - Aktionen (Wert setzen, Ereignis, Ton).
14. **Lernkurve klein halten:** Rives größte Kritik ist der Zustandsautomat. Daher:
    - vorgefertigte Graphen (Stehen, Gehen, Stolpern, Fallen, Aufstehen),
    - Logik direkt auf der Bühne abspielen und den aktiven Zustand sichtbar machen,
    - klare Wörter.

    Skripte erst später und nur als abgeschotteter Notausgang (Rive wählte dafür Luau wegen Größe und Sandbox).

**Darstellung und Bedienung**

15. **Abstandsfeld-Renderer behalten** und ausbauen: weiches Verschmelzen, Weichheit innen und außen mit Versatz und Welt- oder
    Lokalraum (Rives Feathering-Regler übernehmen), Verjüngungen statt Outlines. Kein Unschärfe-Durchgang über Pixel; Rive zeigt,
    dass weiche Kanten analytisch billig sind.
16. **Zwei Modi** wie Rive und Linearity Move: *Formen* und *Bewegen*, damit keine Schlüssel aus Versehen entstehen. „Ziehen zum
    Animieren“ (Linearity Move). Die Zeitleiste zeigt Posen und Schlüsselformen statt Spuren je Eigenschaft; der Kurveneditor öffnet
    nur bei Bedarf. iPad: Stift und Gesten von Anfang an mitdenken.
17. **Export:** Gebackene Clips als Lottie sind optional und billig, denn gleiche Anker ergeben gültige Pfad-Schlüssel. Nur Formen,
    Füllungen, Verläufe und Trim nutzen; das ist der Kern von Lottie 1.0. Dazu SVG und Videos. Keinen eigenen Rive-Export.
18. **Eine Stunde Rive als Probe:** Florian könnte eine Stunde mit Rives Joysticks und dem Zustandsautomaten spielen und sagen, was ihm
    gefällt und was nicht. Das kalibriert unsere Bedienung billiger als jeder eigene Entwurf.

---

## 9. Offene Fragen

1. **Übergänge:** Will Florian jeden Übergang selbst formen können (eigene Zwischenposen), oder reicht eine Überblendung im Posenraum
   mit Nachschwingen aus der Physik, und er formt nur, wo es hakt?
2. **Griff-Gewichte:** Reicht „Griffe erben das Gewicht ihres Ankers“ mit Ausnahme auf Wunsch, oder will er Griffe von Anfang an
   getrennt gewichten wie in Rive?
3. **Physik:** Wie viel Physik soll im Spiel live laufen und wie viel als geformte Pose? Ein Stolpern könnte zum Beispiel halb Physik,
   halb Schlüsselpose sein.
4. **iPad:** Soll der Editor auf dem iPad gleichwertig sein oder dort zunächst nur Posen, Übergänge und Abspielen bieten? Formen würde
   dann am Mac entstehen.
5. **Skripte:** Braucht „Studio“ überhaupt Skripte, oder genügt eine visuelle Logik mit Konvertern? Rive zeigt, dass Skripte das Tor
   zu Spielen sind, aber auch, dass sie die Arbeit zum Code verschieben.
6. **Rasterbilder mit Meshes** (wie Rive und Spine) später zulassen, oder bei reinen Vektoren bleiben?
7. **Nicht geprüft:**
   - wie sich Rives 1D-Mischung bei Pfad-Ankern genau verhält (Forumshinweis vom 18.11.);
   - wie gut die Klick-Morphs von Jitter und Linearity Move zuordnen;
   - die Nutzerstimmen zu Cavalry, Jitter und Linearity Move (Suchbudget erschöpft).

---

## 10. Quellen

**Rive – Handbuch**

- Bones: https://rive.app/docs/editor/manipulating-shapes/bones · Bone Tips: https://rive.app/docs/editor/manipulating-shapes/bone-tips
- Meshes: https://rive.app/docs/editor/manipulating-shapes/meshes · Joysticks: https://rive.app/docs/editor/manipulating-shapes/joysticks
  · Solos: https://rive.app/docs/editor/manipulating-shapes/solos
- Edit Vertices: https://rive.app/docs/editor/fundamentals/edit-vertices · Components: https://rive.app/docs/editor/fundamentals/components
  · Vector Feathering: https://rive.app/docs/editor/fundamentals/vector-feathering
- Constraints: https://rive.app/docs/editor/constraints/constraints-overview · IK: https://rive.app/docs/editor/constraints/ik-constraint
  · Distance: https://rive.app/docs/editor/constraints/distance-constraint · Follow Path:
  https://rive.app/docs/editor/constraints/follow-path-constraint · Scroll: https://rive.app/docs/editor/constraints/scroll-constraint
- Timeline: https://rive.app/docs/editor/animate-mode/timeline · Keys: https://rive.app/docs/editor/animate-mode/keys · Interpolation:
  https://rive.app/docs/editor/animate-mode/interpolation-easing · Graph Editor: https://rive.app/docs/editor/animate-mode/graph-editor
- State Machine: https://rive.app/docs/editor/state-machine/state-machine · States: https://rive.app/docs/editor/state-machine/states ·
  Transitions: https://rive.app/docs/editor/state-machine/transitions · Listeners: https://rive.app/docs/editor/state-machine/listeners
- Data Binding: https://rive.app/docs/editor/data-binding/overview · Converters: https://rive.app/docs/editor/data-binding/converters ·
  Migration: https://rive.app/docs/editor/data-binding/migration-guide
- Scripting: https://rive.app/docs/scripting/getting-started · Protokolle: https://rive.app/docs/scripting/protocols/overview · Node:
  https://rive.app/docs/scripting/protocols/node-scripts · Path Effects: https://rive.app/docs/scripting/protocols/path-effect-scripts
  · WGSL: https://rive.app/docs/scripting/wgsl-shaders · GPU Canvas: https://rive.app/docs/runtimes/web/gpu-canvas
- Feature Support: https://rive.app/docs/feature-support · Laufzeitgrößen: https://rive.app/docs/runtimes/runtime-sizes · Unity:
  https://rive.app/docs/game-runtimes/unity/unity · Preise: https://rive.app/docs/account-admin/pricing · Index:
  https://rive.app/docs/llms.txt · Einführung: https://rive.app/docs/getting-started/introduction · Downloads: https://rive.app/downloads

**Rive – Blog, Vergleich, Code**

- Feathering-Technik: https://rive.app/blog/how-rive-reinvented-feathering-for-the-vectorian-era
- Scripting: https://rive.app/blog/scripting-is-live-in-rive · Luau: https://rive.app/blog/why-scripting-runs-on-luau
- Releases: https://rive.app/blog/releases · Preisänderung: https://rive.app/blog/rive-s-new-9-mo-plan
- Renderer: https://rive.app/renderer · https://rive.app/blog/rive-renderer-now-open-source-and-available-on-all-platforms
- Lottie-Import: https://rive.app/blog/why-importing-lotties-isn-t-the-workflow-rive-was-built-for · Listen in der Datenbindung:
  https://rive.app/blog/data-binding-supercharged-lists-images-and-artboards
- Rive vs. Spine (Herstellerseite): https://rive.app/rive-vs-spine · Changelog Übergangskurven:
  https://rive.app/changelog/motion-paths-and-interpolation-on-transitions
- Laufzeitcode: https://github.com/rive-app/rive-runtime (u. a. `include/rive/generated/shapes/cubic_detached_vertex_base.hpp`,
  `…/cubic_mirrored_vertex_base.hpp`, `…/cubic_asymmetric_vertex_base.hpp`, `include/rive/generated/bones/cubic_weight_base.hpp`,
  `include/rive/constraints/scrolling/`) · Gewichte:
  https://skia.googlesource.com/external/github.com/rive-app/rive-cpp/+/3b98edc46a174e63848665d59c5517207bf9ad33/src/bones/weight.cpp

**Rive – Stimmen**

- MakerStack (19.03.2026): https://makerstack.co/reviews/rive-review/ · Product Hunt: https://producthunt.com/products/rive/reviews ·
  G2 (nur Suchauszug): https://www.g2.com/products/rive/reviews
- Fallstudie: https://rive.app/blog/how-cars24-revved-up-interactions-and-engagements-with-rive
- Forum: https://rive.app/community/forums/bugs/fsLjspgTHYcR/revision-history-is-incredibly-slow/ftBydzufCzZ6 ·
  https://rive.app/community/forums/bugs/fsLjspgTHYcR/rive-editorsite-bad-performance-on-linux-machine/ft6zrBzmF8BG · Wünsche
  „Physics Feature please“ und „Please allow for stroke tapering“ (alte Adressen leiten auf https://community.rive.app/ um)

**Lottie und After Effects**

- Spezifikation 1.0: https://www.linuxfoundation.org/press/lottie-animation-community-announces-lottie-v1.0-specification ·
  1.0.1: https://lottie.github.io/news/announcing-lottie-specification-1.0.1 · Shapes: https://lottie.github.io/lottie-spec/1.0/specs/shapes/
  · Properties: https://lottie.github.io/lottie-spec/1.0/specs/properties/
- Supported Features: https://github.com/airbnb/lottie/blob/master/supported-features.md · Kompatibilität:
  https://docs.lottiefiles.com/en/integrations/after-effects/09_lottie-compatibility
- lottie-android, ungleiche Ankerzahl:
  https://skia.googlesource.com/external/github.com/airbnb/lottie-android/+/4750fbd71bddb2b7f7303bf7ec2ed877cf0a542e
- dotLottie-Zustandsautomaten: https://lottiefiles.com/blog/state-machines/state-machines-are-finally-in-lottie-creator ·
  https://docs.lottiefiles.com/en/format/dotlottie/interactivity/state-machines
- Physik-Simulator: https://docs.lottiefiles.com/en/creator/14_plugins/physics-simulator · Power Stack 2026:
  https://lottiefiles.com/blog/inside-lottiefiles/the-lottie-power-stack-2026 · LottieFiles oder Rive (Herstellerseite):
  https://lottiefiles.com/blog/lottie-animations/lottiefiles-or-rive
- Praxisfallen: https://elpassion.com/blog/lottie-who-common-mistakes-in-after-effects-animation-for-lottie
- Masken-Interpolation: https://www.provideocoalition.com/managing-moving-masks/ · Handbuch (Smart Mask Interpolation):
  https://www.manualsdir.com/manuals/753844/adobe-after-effects.html?page=337
- Adobe-Forum: https://community.adobe.com/t5/after-effects-discussions/how-do-i-morph-shapes-with-different-points-in-a-controlled-way/m-p/10037073
  · https://community.adobe.com/t5/after-effects-discussions/inconsistent-vertex-count-between-keyframes-that-have-same-number-of-vertices/td-p/13296511
  · https://community.adobe.com/t5/after-effects-discussions/impossible-to-fix-a-reversed-path-on-a-morph-without-using-illustrator/m-p/13335960

**Rigging-Erweiterungen**

- Duik: https://duik.org/ · https://github.com/RxLaboratory/Duik/wiki/bones · https://github.com/RxLaboratory/Duik/wiki/autorig ·
  https://github.com/RxLaboratory/Duik/wiki/spring
- Joysticks 'n Sliders: https://aescripts.com/joystick-n-sliders · Vergleich mit Duik:
  https://www.schoolofmotion.com/blog/after-effects-tool-review-joysticks-n-sliders-vs-duik-bassel
- RubberHose: https://battleaxe.co/rubberhose/docs/controls · https://www.toolfarm.com/news/battle-axe-rubberhose-v3-2-new-simple-bend-multi-hose
- Limber: https://aescripts.com/limber/

**Cavalry, Jitter, Linearity Move, Haiku**

- Cavalry Release Notes: https://cavalry.studio/docs/tech-info/release-notes/2.0/2-0-0-release-notes/ ·
  https://cavalry.studio/docs/tech-info/release-notes/2.6/2-6-0-release-notes/ · https://cavalry.studio/docs/tech-info/release-notes/2.7/2-7-0-release-notes/
  · https://cavalry.studio/docs/tech-info/release-notes/2.8/2-8-0-release-notes/
- Cavalry Verhalten: https://cavalry.studio/docs/nodes/behaviours/ · Morph: https://cavalry.studio/docs/nodes/behaviours/morph/ ·
  Blend Shape: https://cavalry.studio/docs/nodes/behaviours/blend-shape/ · Rubber Hose Limb:
  https://cavalry.studio/docs/nodes/behaviours/rubber-hose-limb/ · Forge Dynamics:
  https://cavalry.studio/docs/nodes/shapes/forge-dynamics/forge-dynamics-shape/ · Web Player: https://cavalry.studio/docs/web-player/ ·
  Lottie-Export: https://cavalry.studio/docs/user-interface/menus/window-menu/render-manager/lottie-export/
- Jitter: https://jitter.video/ · Linearity Move: https://www.linearity.io/move/ · Haiku Animator: https://github.com/HaikuTeam/animator

**Morph-Verfahren im Netz**

- GSAP MorphSVG: https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/ · flubber: https://github.com/veltman/flubber

**Eigene Vorarbeiten**

- `docs/research/2026-11-16-ozzy-morph-und-animation.md` (Sederberg 1993, ARAP 2000, Trägheits-Übergänge)
- `docs/research/2026-11-18-ozzy-figur-recherche.md` (Rive-Joysticks, Entscheidung gegen Rive als Werkzeug, smooth minimum)
