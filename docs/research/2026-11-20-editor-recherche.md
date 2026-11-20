# Studio: Gesamtbericht der Editor-Recherche

Stand 20.11.2026. Zusammenfassung der 17 Berichte im Ordner [`2026-11-20-editor/`](2026-11-20-editor/). Gegenstand ist ein
2D-Vektor-Figureneditor (Arbeitstitel „Studio“) für Charakteranimation mit Physik und Spiellogik: angelehnt an Spine, aber
übersichtlicher, visuell, minimalistisch und mit einer einheitlichen Bediengrammatik. Beispiel und Testspiel ist Ozzy, der
schwarz-weiße Cartoonhund, auf einer vom Bildrand abgeschnittenen Scheibe, die man vorsichtig dreht.

**Was dieser Bericht tut.** Er fasst zusammen, stellt gegenüber und löst die Widersprüche zwischen den Einzelberichten auf. Neue
Messungen oder Quellen gibt es hier nicht. Wo ein Nachtrag (14a bis 14d) eine Frage schon entschieden hat, steht das dabei; wo eine
Probe oder Florians Auge entscheiden muss, ebenso. Eigene Schätzungen und Ableitungen dieses Berichts sind als „eigene Schätzung“ oder
„eigene Einschätzung“ markiert. Auf dem iPhone ist bisher nichts gemessen.

**Kürzel der Einzelberichte** (Abschnittsangaben in der Form „06 §2.6“):

| Kürzel | Datei | Thema |
|---|---|---|
| 01 | [`01-spine-skelett-tools.md`](2026-11-20-editor/01-spine-skelett-tools.md) | Spine und die Skelett-Werkzeuge |
| 02 | [`02-rive-lottie-vektor.md`](2026-11-20-editor/02-rive-lottie-vektor.md) | Rive, Lottie und die Vektor-Animationswerkzeuge |
| 03 | [`03-moho-harmony-morph-knochen.md`](2026-11-20-editor/03-moho-harmony-morph-knochen.md) | Morph und Knochen in Moho, Harmony, Animate, Synfig, OpenToonz |
| 04 | [`04-live2d-parameter.md`](2026-11-20-editor/04-live2d-parameter.md) | Live2D, Inochi2D und parameterbasierte Animation |
| 05 | [`05-posen-uebergaenge-zeit.md`](2026-11-20-editor/05-posen-uebergaenge-zeit.md) | Posen, Übergänge und Zeit |
| 06 | [`06-morph-mathematik.md`](2026-11-20-editor/06-morph-mathematik.md) | Mathematik von Formmorph und Verformung |
| 07 | [`07-autorig.md`](2026-11-20-editor/07-autorig.md) | Autorig für 2D-Vektorfiguren |
| 08 | [`08-figurenphysik.md`](2026-11-20-editor/08-figurenphysik.md) | Figurenphysik: Nachschwingen, Weichkörper, Gleichgewicht, Gehen, Stürze |
| 09 | [`09-physik-engines-web.md`](2026-11-20-editor/09-physik-engines-web.md) | Physik-Engines für Web und iPhone |
| 10 | [`10-rendern-shader.md`](2026-11-20-editor/10-rendern-shader.md) | Rendern auf der Grafikkarte und 2D-Effekte |
| 11 | [`11-technik-stack.md`](2026-11-20-editor/11-technik-stack.md) | Technik: Oberfläche, Zustand, Format, Plattformen, Tests |
| 12 | [`12-bedienung-kreativwerkzeuge.md`](2026-11-20-editor/12-bedienung-kreativwerkzeuge.md) | Bedienung: visuell, minimalistisch, selbsterklärend |
| 13 | [`13-spieldesign-ozzy-rad.md`](2026-11-20-editor/13-spieldesign-ozzy-rad.md) | Spieldesign: Ozzy auf dem Rad |
| 14a | [`14-nachtrag-physik-architektur.md`](2026-11-20-editor/14-nachtrag-physik-architektur.md) | Nachtrag: Physik aus einem Guss |
| 14b | [`14-nachtrag-spiellogik-ohne-code.md`](2026-11-20-editor/14-nachtrag-spiellogik-ohne-code.md) | Nachtrag: Spiellogik ohne Code |
| 14c | [`14-nachtrag-tempo-budget-ios.md`](2026-11-20-editor/14-nachtrag-tempo-budget-ios.md) | Nachtrag: Tempo-Budget auf iPhone 16, iPad und Mac |
| 14d | [`14-nachtrag-ton-haptik-barrierefreiheit.md`](2026-11-20-editor/14-nachtrag-ton-haptik-barrierefreiheit.md) | Nachtrag: Ton, Haptik und Barrierefreiheit |

**Inhalt:** 1 Überblick · 2 Wie die besten Programme und Verfahren es lösen · 3 Ehrliche Gegenüberstellungen · 4 Empfehlungen
(Produkt, Bedienung, Technik, Rechenkette, Begriffe, Widersprüche, Reihenfolge und Aufwand) · 5 Spielkonzept für Ozzy · 6 Risiken und
offene Fragen · 7 Quellen

---

## 1 Überblick

**Kein vorhandenes Werkzeug deckt den Fall ab; ein eigener Editor ist begründet, aber nur in Stufen.** Spine ist das reifste
Skelettwerkzeug, arbeitet aber mit Bildern auf Dreiecksnetzen, mischt Formschlüssel auf geraden Bahnen und hat keinen Editor fürs
iPad (01). Rive hat das beste Modell für Knochen auf Vektorpfaden, mit Gewichten je Anker und je Griff, aber keine eingebaute Physik,
keine selbst geformten Übergänge, kein Verschmelzen von Flächen und keinen iPad-Editor (02). Live2D liefert die beste Grammatik für
Regler, rechnet aber linear auf Texturen (04). Moho und Harmony zeigen, wie Korrekturformen an Knochenwinkeln hängen, verpacken es aber
mühsam (03). Kein fertiger Renderer verschmilzt Flächen weich (10). Daraus folgt ein eigener Editor auf eigener Laufzeit, der Spines
Semantik als Pflichtenheft nimmt, Rives Datenmodell und Live2Ds Regler übernimmt und vektornativ bleibt. Der Preis ist der Umfang: Rive
hat Jahre gebraucht (02 §7), und keiner der Einzelberichte schätzt den Aufwand bis zur Demo. Abschnitt 4.7 tut es grob.

**Das Grundgerüst ist in allen Berichten derselbe Baustein: der Regler.** Ein Regler ist ein benannter Wert mit Bereich, an dem
Schlüsselformen hängen: Kopfwinkel, Gelenkwinkel, Neigung, Tempo, Fortschritt eines Übergangs, auch die Zeit (01, 03, 04, 05, 12).
Eine Pose ist ein Stand der Regler. Ein Übergang läuft im Reglerraum und nie als Überblendung der Formen, damit jede Zwischenstellung
auf Florians gezeichneten Schlüsseln liegt (05 §4.3). „Jede Pose in jede andere“ wird als „Standard plus Ausnahmen“ gespeichert und als
Tafel „von × nach“ gezeigt; Zeit erscheint nur in gestalteten Übergängen als kurze Taktleiste (05). Physik schreibt Abweichungen, die in
Ruhe null sind: In Ruhe ist Ozzy genau seine Zeichnung (08 §9.1). Spiellogik besteht aus fertigen Bausteinen, stetigen Drähten und drei
Arten von Regelkarten (14b).

**Morph und Knochen greifen in einer festen Reihenfolge ineinander.** Alle Schlüsselformen einer Form sind Bearbeitungen derselben
Anker, die Zuordnung wird also nie geraten (02, 03, 06). Zwischen Schlüsseln wird nicht mehr nur je Koordinate gemischt, sondern in
einem Rahmen aus Drehung und Größe plus kleinem Rest, die Griffe relativ zur örtlichen Kontur (06 §2.6). Glatte Anker bleiben in jeder
Stufe glatt (Glätte-Regel, 06 §8). Knochen verformen Anker und Griffe direkt, ohne Dreiecksnetz; Korrekturformen leben im Ruheraum vor
dem Skinning und drehen mit dem Knochen mit (01, 03, 06). Für Ozzy reichen meist starre Teile an Knochen und biegsame Achsen für Beine,
Schwanz und Ohren; die Nähte schließt der Renderer durch Verschmelzen (06, 07).

**Physik: die Welt mit Box2D, die Figur mit einer eigenen XPBD-Schicht, ein Takt von 60 Hz.** Nach dem Nachtrag 14a rechnet Box2D 3.2
als WebAssembly das Rad (dynamisch, mit Trägheit und Rückwirkung), Ozzys Körperbrocken, Stürze und lose Dinge; eine eigene XPBD-Schicht
in TypeScript rechnet Nachschwingen, Bohne und Spritzer. Beide laufen in einem festen 60-Hz-Takt mit je vier Teilschritten, gezeichnet
wird zwischen zwei Takten gemischt. Freigegeben wird das erst nach der Probe P1 „Rad mit Gewicht“ (14a §7).

**Bild und Tempo: Der Abstandsfeld-Renderer des Prototyps ist der richtige Weg, aber auf dem iPhone noch unbewiesen.** Nur ein
Renderer, der Abstände kennt, liefert weiches Verschmelzen, Verjüngungen statt Outlines, Kontaktschatten und weiche Ränder aus einem
einzigen Wert (10). Nach 14c ist die Grafik des M3 Pro drei- bis viermal so stark wie die des iPhone 16; Felder über den ganzen
Bildschirm schafft das iPhone bei 60 Hz nicht. Die Szene der Demo passt nur mit vier Maßnahmen ins Budget von 8 ms Grafikzeit (Felder
nur im Rahmen jeder Figur, Felder in halber Auflösung, Welt gebacken oder analytisch, Tropfen analytisch). Zuerst misst eine einzige
Seite `tempo.html` auf seinen Geräten (14c §7).

**Bedienung: eine kurze Grammatik, kein globaler Modus.** Tippen wählt, Ziehen ändert, Halten zeigt mehr, Doppeltippen geht hinein.
Geändert wird immer die sichtbare „aktive Stelle“ (Grundform, Pose, Stelle auf einem Regler oder in einem Übergang), so wie Florian
schon heute im Werkzeug der Kopfdrehung arbeitet. Eine Leiste mit Schlüsseln, Zwiebelhaut und Bahnen dient allen Achsen; Physik,
Effekte und Klang hängen als Chips mit zwei Reglern an den Dingen (12, 14d). Ob die aktive Stelle trägt, prüft eine kleine Bedienprobe;
sie ist eine Wette gegen Rives Erfahrung mit zwei Modi (12 §5.1).

**Spiel: die Demo „Gassirunde“.** Ozzy dreht vor Sonnenuntergang eine Runde um eine kleine runde Welt, der Spieler dreht die Welt.
Ozzys Lage auf dem Rad ist das Gaspedal, gespielt wird Balancieren wie mit einem Besen, und Scheitern ist witzig statt hart (13 §9). Die
Demo ist zugleich die Abnahme für Studio: Was sie braucht und der Editor nicht kann, ist eine Lücke im Editor.

**Ehrlich zu den Grenzen.** Die Berichte stützen sich auf Handbücher, Quelltexte und Aufsätze. In vielen war das Suchbudget erschöpft,
Stimmen von Nutzern sind dünn, und auf dem iPhone ist nichts gemessen. Die größten Risiken sind der Umfang, das Tempo auf dem iPhone und
zwei Wetten (aktive Stelle statt Modi; eine Web-Bindung von Box2D, die zwei Personen pflegen). Die Gegenmittel: ein Umfang, den die Demo
bestimmt, eine feste Reihenfolge weniger Proben mit vorher festgelegten Kriterien und Florians Auge als letzte Instanz.

---

## 2 Wie die besten Programme und Verfahren es lösen

Je Bereich: was die besten Werkzeuge und Verfahren tun, und was daraus für Studio folgt. Einzelheiten und Belege stehen in den
genannten Berichten.

### 2.1 Skelett-Werkzeuge: Spine und Verwandte (01)

- **Spine 4.3** ist das ausgereifteste 2D-Skelettwerkzeug. Wertvoll ist vor allem seine Semantik: Knochenbaum, Plätze in der
  Malreihenfolge, Anhänge, Gewichte, Constraints, Varianten, Ereignisse; zur Laufzeit Spuren, gerichtete Mischzeiten je Paar mit
  Standardwert und Schwellen beim Überblenden.
- **Schwächen für uns:** bildbasiert (Texturen auf Dreiecksnetzen), Bézier-Pfade nur als Hilfslinien; Verformungsschlüssel schieben
  jeden Netzpunkt auf gerader Bahn und gelten immer für die ganze Fläche (der Hersteller rät selbst davon ab); kein Verschmelzen, keine
  Verjüngungen, kein Editor fürs iPad.
- **Das wertvollste Detail aus dem Laufzeitcode:** Bei gewichteten Netzen liegen Formkorrekturen als Versatz je Knochen-Einfluss im
  Raum des Knochens; gehäutet wird danach. So wandert ein Morph mit dem Knochen mit.
- **Griffgewichte:** Spine rät, Knoten und beide Griffe gleich zu gewichten. Nur dann erfahren alle drei Punkte dieselbe Abbildung, und
  die Kurve bleibt glatt.
- **Physik seit 4.2:** ein Versatz je Knochen, den Federkraft zur gekeyten Pose zurückzieht (Trägheit, Stärke, Dämpfung, Masse, Wind,
  Schwerkraft, Grenze); das ältere Modell aus Knoten und Federn hat der Hersteller verworfen. „Key Constrained“ backt Physik in
  Schlüssel, „Deterministic“ macht das Scrubben wiederholbar.
- **Slider (4.3):** eine Animation, angewendet an einer Stelle, auf Wunsch von einer Knocheneigenschaft getrieben. Das ist das
  Regler-Prinzip, das auch Live2D, Creature und der Prototyp nutzen.
- **Übergänge sind überall dünn:** Mischzeit je Paar (Spine), Wegsuche durch Zwischenzustände (Godot `travel()`), Fußkontakte im
  Übergangsgraph (Unity). Kein Werkzeug speichert Übergänge mit eigenen Zwischenposen und mit dem, was am Boden bleibt; der Prototyp
  kann beides.
- **Was Animatoren hassen:** den Baum in großen Projekten, die Falle Setup gegen Animate, fehlende Formschlüssel und Spiegelung,
  mühsames Gewichtsmalen.
- **Alternativen:** DragonBones laut Dritten verwaist, Spriter ohne Netze, Creature bildbasiert und wenig gepflegt, Unity 2D und Godot
  an ihre Engine und an Code gebunden.
- **Lizenz:** Spine-Laufzeiten dürfen nicht in einem Produkt stecken, das das Erstellen oder Bearbeiten von Skeletten ersetzt. Studio
  braucht eigenen Code und ein eigenes Format.

**Für Studio:** Spines Semantik als Pflichtenheft, aber vektornativ, mit Reglern als Grundbaustein, einer Übergangs-Tafel mit
Zwischenposen und Kontakten, Physik in zwei Schichten, eingebauter Spiegelung und ohne die Setup-Falle.

### 2.2 Vektor-Animationswerkzeuge: Rive, Lottie, After Effects, Cavalry (02)

- **Rive** ist das nächste Vorbild: Knochen verformen Vektorpfade, jeder Anker trägt bis zu vier Knochen, die beiden Griffe haben
  eigene Gewichtssätze; Griffe sind als Winkel und Länge gespeichert. Dazu Joysticks (Zeitleisten als Posen-Achsen), ein reifer
  Zustandsautomat mit Mischzuständen, Datenbindung über View Models, Skripte in Luau und analytisches Feathering.
- **Rives Lücken:** keine eingebaute Physik (nur über Skripte); Übergänge sind Überblendungen mit Dauer, Kurve, Exit Time und
  Zufallsgewichten, ohne eigene Zwischenformen; Morph nur zwischen Ständen desselben Pfads; kein Verschmelzen, keine Verjüngungen;
  kein iPad-Editor; Export im Abo. Bewertungen nennen den Zustandsautomaten den schwersten Teil für Gestalter.
- **Lottie** ist ein Abspielformat (Spezifikation 1.0, 2024): keine Knochen, keine Physik, Pfad-Morph nur bei gleicher Ankerzahl,
  Umfang je Abspieler verschieden. **After Effects** morpht Pfade über die Nummer der Anker auf geraden Bahnen. Die Erweiterungen
  liefern die besten Bedienideen: Joysticks 'n Sliders (Posen auf einem Steuerknüppel), RubberHose und Limber (ein Glied als biegsamer
  Strich), Duik (Autorig, Federn), alles aber auf Expressions und Desktop gebaut.
- **Cavalry** hat den technisch stärksten Morph der Motion-Werkzeuge (kubisch, starr nach ARAP, über Abstandsfelder), Blend Shapes mit
  additiven Deltas, Metaballs und Box2D mit Weichkörpern, aber keine interaktive Laufzeit.
- **Güte eines Morphs** hängt an zwei Fragen: Zuordnung (am zuverlässigsten durch Identität, also dieselben Anker) und Bahn (gerade
  Bahnen schrumpfen; Griffe nach Winkel und Länge bleiben glatt; Drehung und Größe getrennt mischen verhindert Schrumpfen).

**Für Studio:** Rives Datenmodell (Ankertypen, Griffe polar, Gewichte je Anker und Griff) und seine Logik-Begriffe übernehmen; dazu die
Posen-Achsen der After-Effects-Erweiterungen und die Morph-Strategien von Cavalry. Zuordnung durch Identität; automatische Zuordnung
nur in einem Assistenten für fremde Formen. Lottie höchstens als Export gebackener Clips.

### 2.3 Morph und Knochen in den großen 2D-Programmen: Moho, Harmony, Animate, Synfig, OpenToonz (03)

- Alle fünf trennen Formänderung und Knochen in zwei Systeme. Nur **Moho** verbindet sie direkt (Smart Bones), **Harmony** indirekt
  (Master Controller), die übrigen gar nicht.
- **Die bewährte Reihenfolge:** erst die Knochenpose bestimmen, dann die Form in ihrer Ruhe ändern (Morph und Korrekturen), zuletzt
  verformen die Knochen das Ergebnis. So arbeiten Mohos Smart Bones und die Pose Space Deformation (Lewis u. a. 2000). Keiner legt eine
  Formänderung nach den Knochen in Bildschirmkoordinaten ab.
- **Smart Bones** sind eine eindimensionale Pose Space Deformation: Ein Knochenwinkel spielt eine Aktion ab. Mächtig, weil die
  Korrektur bei jedem Winkel von selbst kommt; mühsam, weil die Zuordnung unsichtbar über Namen läuft, nur die Drehung treibt, mehrere
  Smart Bones um dieselben Punkte streiten und der Spielexport sie backt.
- **Harmony** hat die besten Reglerideen (Schieber, 2D-Punkt über einem Raster von Posen), mischt aber linear und braucht jenseits der
  Assistenten Skripte.
- **Automatische Zuordnung beim Morph** (Harmony nach Nähe und Farbe, Animate über Hinweise a bis z) ist unberechenbar; robust ist,
  was Moho, Synfig und der Prototyp tun: dieselben Anker in jeder Form.
- **Netz-Verformer** biegen schön, kosten aber die Vektorgenauigkeit (OpenToonz rastert vorher).
- **Lineares Mischen der Knochen** ist Standard aller Laufzeiten und schrumpft am Gelenk (bei 90° und halben Gewichten auf rund 71 %).

**Für Studio:** ein einziger Mechanismus „Formschlüssel am Regler“, wobei der Regler ein Knochenwinkel, ein freier Schieber, der
Fortschritt eines Übergangs, ein Physik- oder ein Spielwert sein kann. Geformt wird in der Pose, gespeichert als Versatz in der Ruhe;
streitende Korrekturen löst ein Kreuzschlüssel, kein Skript. Das Spiel rechnet mit demselben Code, Regler bleiben Regler.

### 2.4 Parameterbasierte Animation: Live2D und Inochi2D (04)

- **Live2D** baut alles auf Reglern auf: benannte Werte mit Bereich, an denen Schlüsselformen hängen. Abläufe, Ausdrücke, Physik,
  Blick, Atmen und Lippen schreiben nur in diese Regler. Das ist die eigentliche Erfindung, nicht die Verformer.
- **Mehrere Regler an einer Form** bilden ein volles Raster (k hoch n Schlüsselformen). Live2D rät zu höchstens zwei Reglern je
  Objekt und vermeidet die Explosion durch Schachtelung (15 statt 81 Formen für eine Augenbraue) und durch additive Zusatzformen.
- **Live2D mischt linear:** Drehungen schrumpfen in der Mitte, an jedem Schlüssel springt die Geschwindigkeit; die „erweiterte
  Interpolation“ baut einen Bogen aus bis zu 20 Zwischenschlüsseln nach. Der Prototyp mischt glatter.
- **Live2D-Physik** ist bewusst klein: Pendelketten, Eingänge und Ausgänge sind Regler, feste Rechenrate. **Neue Hilfen:** Anfasser an
  der Figur, die mehrere Regler stellen, „Ziel folgen“, Kreisregler, gespiegeltes Einfügen.
- **Inochi2D** (offen) füllt fehlende Schlüssel selbst, wählt die Interpolation je Bindung und addiert die Versätze mehrerer Regler;
  das Projekt steckt im Umbau.
- **Reglerraum gegen Zeitleiste:** Der Reglerraum gewinnt bei fortlaufenden Eingaben (Gefälle, Tempo, Blick), bei Kombinationen und
  wo Physik und Spiel mitreden; die Zeitleiste gewinnt bei gespielten Handlungen mit Timing. Spine (Slider) und Rive (Joysticks) sind
  genau dorthin gewandert: Regler als Unterbau, Zeit als ein Regler unter anderen.
- **Befund am Prototyp:** Der Kopfwinkel θ wird an der Front (0°/360°) einseitig gemischt; einige Anker kehren dort mit Tempo um
  (V-förmige Bahn). Zwischen 176° und 184° laufen Anker zwischen dicht liegenden Schlüsseln hin und her (04 §7.3).

**Für Studio:** Regler als einziges Bauteil, an dem Bewegung hängt (Linie, Kreis, Feld); θ periodisch mischen; Spiegelregel als
Eigenschaft des Reglers; je Teil höchstens eine volle Hauptachse, alles Weitere als Zusatz im mitlaufenden Rahmen (beim Maul etwa 25
statt 96 Schlüsselformen); Pendel mit Eingängen aus der Welt; Bahnen der Anker in der Leiste zeigen.

### 2.5 Posen, Übergänge und Zeit (05)

- **Kein großes Werkzeug ordnet Bewegung nur über eine Zeitleiste.** Spiele-Werkzeuge trennen „was“ (Posen), „wie weit“ (Parameter)
  und „wie dahin“ (Übergänge); die Zeitleiste ist dort ein Werkzeug für einzelne Clips.
- **„Jede in jede“ wird überall als Standard plus Ausnahmen gelöst** (Spine, Any State in Unity und Rive, Godots Wegsuche). Eine volle
  Matrix wird ab rund zehn Posen unübersichtlich, ein freier Graph zu „Spaghetti“, wovor Rive und Unity selbst warnen.
- **Gute Übergänge erhalten die Geschwindigkeit und sind jederzeit unterbrechbar.** Die Spielebranche nutzt Trägheits-Übergänge
  (Bollo, GDC 2018) und kritisch gedämpfte Federn (Holden; Apple).
- **Für Vektorformen entscheidend:** im Raum der Regler überblenden, nicht im Raum der Formen. Formen direkt überblenden schneidet die
  Ecke, Teile schrumpfen und verklumpen.
- **Ebenen mit Masken** verhindern, dass Kombinationen explodieren (5 Haltungen × 3 Blicke × 4 Stimmungen = 60 Posen gegen 12).
- **Aufnahme** (Procreate Dreams, Character Animator) bringt lebendiges Timing, ist aber eine Eingabe, kein Ordnungsprinzip. **Motion
  Matching** braucht Minuten an Bewegungsdaten und scheidet aus. **Physik und Prozedur** gehören als immer laufende Ebene darüber
  (Overgrowth, Cascadeur).
- **Befund am Prototyp:** Die gezeigten Haltungsgewichte folgen einer Feder mit 16/s; das glättet jeden Wechsel, verschiebt aber jede
  gestaltete Bewegung um rund 0,125 s und rundet ihre Akzente ab (05 §7).

**Für Studio:** Posen, Regler, Übergänge. Standardübergang als Trägheits-Ausgleich mit Feder, gestaltete Übergänge mit Taktleiste,
Zwischenposen, Zusatzbewegungen und „bleibt stehen“; Wegsuche „über X“; Unterbrechen je Übergang sofort, am nächsten Halt oder nie;
drei bis vier feste Schichten; Physik schreibt in sichtbare Regler.

### 2.6 Mathematik von Morph und Verformung (06)

- **Was weich aussieht, zerlegt Bewegung in Drehung und Größe** (gemischt über Winkel und Logarithmus) **und einen kleinen Rest**
  (gerade gemischt): ARAP-Interpolation, intrinsisches Mischen, Dual-Quaternionen, Live2Ds erweiterte Interpolation.
- **Gerades Mischen schrumpft eine Drehung um cos(Δφ/2):** auf 92 % bei 45°, 71 % bei 90°, 38 % bei 135°. Beim Skinning gilt dieselbe
  Zahl.
- **PCHIP** (monoton kubisch) ist richtig für Winkel und Längen, aber falsch für x und y eines drehenden Punkts: Liegen zwei Schlüssel
  bei −45° und +45°, hält PCHIP x flach, die Form wird in der Mitte schmal. Im Prototyp fällt das kaum auf, weil Florians Schlüssel
  dicht liegen.
- **Glatte Anker brauchen einen gemeinsamen Griffwinkel;** Griffe relativ zur örtlichen Tangente machen die 100°-Ausnahme des
  Prototyps überflüssig.
- **Vorbeilaufende Anker sind ein Ereignis** (eine Falte): Der Faltschlüssel ist das richtige Modell und wird eine sichtbare,
  verschiebbare Marke; drei billige Prüfungen je Bild (Sehnenumkehr, Schlaufe, Selbstschnitt) melden den Rest, ohne still zu
  reparieren.
- **Skinning auf Anker und Griffe,** nicht auf ein Dreiecksnetz; Drehungen sind im 2D komplexe Zahlen; optimierte Drehzentren (Le und
  Hodgins 2016) halten das Gelenk voll, fast zum Preis des linearen Mischens.
- **Griffe erben standardmäßig die Abbildung ihres Ankers;** eigene Griffgewichte sind ein Schalter mit Glätte-Schutz; für lange
  Stücke über einem Gelenk gibt es den Kurven-Ausgleich nach Liu, Jacobson und Gingold (2014), aus dem Illustrators Puppet Warp wurde.
- **Gewichte automatisch über Wärmeleitung** (Baran und Popović 2007): ein dünn besetztes System, einmal zerlegt. Bounded Biharmonic
  Weights sind schöner, brauchen aber quadratische Optimierung.
- **„Pose zeichnen, Studio zerlegt“:** Eine frei geformte Pose wird je Knochen in die beste Drehung und einen Rest zerlegt; Übergänge
  drehen dann, statt zu schrumpfen.
- **Ehrlich zu Ozzy:** Er besteht aus getrennten, meist steifen Teilen, die der Renderer verschmilzt. Gewichte braucht es nur, wo sich
  eine einzelne Form biegt (Schwanz, Ohren, Bohne beim Stauchen, Hals).

**Für Studio:** „Eine Form, viele Zustände“ als Grundgesetz; Mischart „Rahmen + Rest“ für neue Formen; Glätte-Regel in jeder Stufe;
Falten als sichtbare Ereignisse.

### 2.7 Autorig (07)

- **Kein Werkzeug riggt eine 2D-Vektorfigur aus Teilen vollautomatisch** mit Rollen, Seiten und Gewichten. Die Bausteine gibt es
  einzeln: Skelette aus Silhouetten (Forschung), Vorlagen für Tiere (Duik, Cartoon Animator), Namensregeln (Character Animator,
  Spine-PSD-Import, Live2D), automatische Gewichte (Unity, Spine, Rive, Moho, Blender).
- **Animated Drawings** (Meta 2023) zeigt die beste Kette für Laien: erkennen, Skelett setzen, sofort eine Bewegung zeigen, Fehler durch
  Ziehen der Gelenke korrigieren. Es kann nur Menschenfiguren, und sein schwächster Schritt ist das Ausschneiden, den wir nicht
  brauchen, weil unsere Figuren aus Teilen bestehen.
- **Pinocchio** (2007): Vorlage einbetten, Gewichte über Wärme. Zwei Lehren: Die Übergangszone an einem Gelenk soll etwa so breit sein
  wie das Glied dick ist, und Knie lassen sich aus der Form allein nicht zuverlässig finden.
- **Gewichte für Bézier-Griffe nach der Lage des Griffs** zu rechnen ist fehleranfällig, weil Griffe weit neben der Kurve liegen
  können; richtig ist, sie aus der Kurve abzuleiten.
- **Vorschlag:** ein deterministischer, erklärbarer Autorig aus drei Quellen: dem Teile-Graphen (Überlappung, Enthaltensein, Kontakt),
  einer Vorlage als Daten (Vierbeiner, Zweibeiner, Vogel) und einer Achse je Teil. Biegeachsen statt Knochenketten für Beine, Schwanz
  und Ohren (das verallgemeinert das „Rückgrat“ der Prototyp-Beine); Gewichte nur innerhalb eines Teils; Gelenke reiten auf der Form des
  Elternteils. Für Ozzys 19 Teile ergeben sich neun bewegliche Elemente.
- **Bedienung:** ein Klick, sofort ein Probewackeln, Fragen nur bei echter Unsicherheit, Korrektur durch Ziehen von Gelenkringen,
  gepinnte Entscheidungen bleiben beim Neu-Riggen erhalten, ein Rückgängig-Schritt.

**Für Studio:** dieser Autorig, geprüft gegen die Handdaten des Prototyps (`ELTER`, `PARTNER`, Kopfteile) und an zwei fremden Formen.

### 2.8 Figurenphysik (08)

- **Die besten Programme lassen die Animation führen und die Physik nur abweichen** (Spine: Versatz je Knochen; Live2D: Pendel in
  Parametern; Unreal: Federn auf die laufende Animation). In Ruhe ist die Figur genau ihre Zeichnung.
- **Eine Feder für alles:** Frequenz und Dämpfungsverhältnis verstellen sich nicht gegenseitig (Box2D beschreibt jede weiche Bedingung
  so); ein dritter Wert „Vorgriff“ deckt Ausholen und Überschießen ab. Spines und Live2Ds Reglersätze sind gekoppelt.
- **Nachschwingen auf gezeichnete Formen:** Ohren, Bart und Wangen treiben über ein Pendel einen Regler zwischen Florians
  Schlüsselformen; lange Teile wie der Schwanz bekommen eine Kette.
- **Weiche Vektorflächen ohne Knicke:** Anker und Griffe nie als einzelne Massenpunkte simulieren; gerechnet wird auf wenigen
  Kontrollpunkten, die Form folgt über ein glattes Feld, das Anker und beide Griffe mit derselben örtlichen Abbildung bewegt.
- **XPBD mit vielen Teilschritten und Formabgleich** sind unbedingt stabil und klein genug für JavaScript; mit der gerade animierten
  Pose als Ruheform wackelt eine Fläche nur vorübergehend.
- **Gleichgewicht ohne Robotik:** Spiele mit Charakter nehmen einen vereinfachten Körper (Rain World: zwei Körperbrocken; Gibbon: erst
  der Schwerpunkt) plus prozedurale Schritte und gezeichnete Posen. Wann ein Schritt nötig ist, sagt der Kipppunkt (Capture Point),
  wohin, die Raibert-Regel.
- **Ozzys Tapsen bergab** entsteht aus Hangabtrieb gegen begrenzte Bremskraft der Beine; ein Regler legt fest, ab welcher Neigung das
  passiert. **Stürze** sind eine aktive Ragdoll mit Spannungskurve; zum Aufstehen wird die gezeichnete Folge gewählt, die der Lage am
  nächsten ist.
- **Prüfstand im Editor:** Schubsen, Schütteln, Raddrehen, Röntgenansicht (Schwerpunkt, Stützstrecke, Kipppunkt), Aufnehmen in
  bearbeitbare Schlüssel.

**Für Studio:** Ziel, Feder, Wirklichkeit: Die Animation gibt Ziele, die Physik ist die Wirklichkeit, Federn mit Spannung verbinden
beides. Startwerte stehen in 08 §9.7; alle sind ungemessen.

### 2.9 Physik-Engines im Web (09, 14a)

- **Tempo entscheidet nicht:** Ozzy, Rad und einige Dutzend Hindernisse sind für jede ernsthafte Engine eine kleine Last. Es
  entscheiden die Ruhe der Kontakte, die Reibung auf dem drehenden Rad, Wiederholbarkeit, Zurückspulen, Pflege der Web-Anbindung und
  ob sich die Engine hinter einer eigenen Bedienung verstecken lässt.
- **Box2D 3.2** (MIT) über `box2d3-wasm` 6.0: Soft-Step-Löser, kontinuierliche Kollision, Ketten ohne Geisterkollisionen,
  Rollwiderstand, Motor-Gelenk mit Feder- und Tempozielen, plattformübergreifender Determinismus, Zustands-Hash, Snapshots
  (experimentell), WebAssembly von rund 160 bis 185 KB komprimiert.
- **Rapier 2D** ist gleich stark, mit offizieller TypeScript-API und Mehrkörpergelenken, aber rund viermal so groß und mit häufigen
  API-Brüchen; vorbereiteter Rückfall.
- **XPBD** ist stabil in dem Sinn, dass nichts explodiert, aber nicht ruhig: Das Paper nennt sichtbares Zittern und Probleme bei Stapeln;
  der Box2D-Autor bekam die Reibung damit nicht gut hin; Avian hat seine Kontakte auf Soft Step umgestellt, rechnet Gelenke aber weiter
  mit XPBD (14a §2).
- **Nicht verwenden:** Matter.js, p2, Phaser Box2D; Planck nur als reiner JavaScript-Rückfall.
- **Fester Takt mit Interpolation ist Pflicht;** der Prototyp rechnet heute mit der Bildzeit und ist darum nicht bitgenau wiederholbar.
- **Befunde aus dem Box2D-Quelltext (14a):** Das Mover-Gelenk wirkt ohne Hebelarm und Drehmoment, auf dem drehenden Rad gäbe es keine
  Rückwirkung, deshalb Vortrieb als Kräftepaar; jedes Umformen einer Hülle zerstört deren Kontakte, deshalb Haltungen über Gelenkziele
  zwischen festen Teilen; der Snapshot ist vollständig, aber experimentell.

**Für Studio:** Weg B aus 14a: Box2D rechnet die Welt, die eigene XPBD-Schicht die Figur, ein 60-Hz-Takt; Entscheidung nach Probe P1.

### 2.10 Rendern und 2D-Effekte (10, 14c)

- **Für unseren Look zählt, ob der Renderer Abstände kennt,** nicht wie schnell er Pfade füllt. Weiches Verschmelzen, Verjüngungen,
  weiche Ränder, Schein, Kontaktschatten und Auflösen sind Funktionen des Abstands zur Kante.
- **Kein fertiger Renderer verschmilzt Flächen** (Rive, Vello, Skia, PixiJS, ThorVG rechnen Abdeckung). Am nächsten kommt Rives
  analytisches Feathering.
- **Der Prototyp ist im Prinzip richtig gebaut:** Vorzeichen aus der Schablone, Abstand aus gespritzten Streckenrechtecken, Bild aus
  einem Shader mit weicher Vereinigung, Kantenglättung aus dem Abstand. Für ein Produkt fehlen: mehr als 24 Flächen, Verschmelz- und
  Ebenenregeln als Daten, eine Abflachung mit stabiler Stückzahl und Felder, die beim Zoomen nicht sättigen.
- **Kantenglättung aus dem Abstand** ist für uns die beste (stabil in Bewegung, scharf in jedem Zoom, ohne Nahtfehler), mit
  Gefälle-Korrektur nach der weichen Vereinigung und einer Regel für Spitzen unter einem Bildpunkt.
- **Apple-GPUs rendern in Kacheln:** Teuer sind Durchgänge und Bytes je Bildpunkt, nicht das Rechnen. Nachbearbeitungen (Bloom,
  Weichzeichner) entfallen.
- **WebGL2 jetzt, WebGPU später:** WebGPU gibt es seit Safari 26, mit schweren Fehlern bis Safari 26.4.
- **Eine Grammatik für alle Effekte:** Jeder Effekt ist ein Profil über dem Abstand, dazu höchstens Rauschen und Zeit; jeder Wert
  kann von Schlüssel, Pose oder Spielgröße getrieben werden.
- **Tempo (14c):** Die Grafik des M3 Pro ist drei- bis viermal so stark wie die des iPhone 16, warm vier- bis fünfeinhalbmal. Der
  heutige Renderer kostet auf dem iPhone rechnerisch 6 bis 11 ms je Million Bildpunkte; der ganze Bildschirm (3 Millionen Bildpunkte)
  geht bei 60 Hz nicht.

**Für Studio:** eigener Abstandsfeld-Renderer, eine Laufzeit für Editor und Spiel, Stufe 1 verallgemeinern und messen, Kachel-Durchgang
als Reserve.

### 2.11 Technik-Stack (11)

- **Wie die besten gebaut sind:** Die Zeichenfläche läuft nie über das UI-Framework (Figma, Rive, Graphite, tldraw). Das Dokument ist
  eine flache Sammlung von Datensätzen mit Kennung; Änderungen sind Diffs, aus denen Rückgängig, Speichern und Zusammenarbeit entstehen
  (Figma, tldraw, Excalidraw). Wo Editor und Laufzeit denselben Code teilen, gibt es keine Paritätsprobleme (Rive, Theatre.js); wo
  nicht, entstehen Versionskopplung (Spine) und fehlende Funktionen je Abspieler (Lottie). Formate tragen Versionen.
- **Fünf Schichten:** Format, Laufzeit, Bild, Editor-Kern, Oberfläche. Das Spiel nutzt dieselbe Laufzeit und denselben Renderer.
- **Heiße Flächen** (Bühne, Überlagerungen, Leiste, Posen-Brett) in eigenem Code; **kühle Flächen** (Felder, Menüs, Dialoge) mit React
  19.3 und dem React Compiler, Live-Werte über Signale; Preact 11 ist die leichtere Alternative.
- **Zustand:** eigener kleiner Store nach dem Vorbild von tldraw, Datensätze mit festen Kennungen (auch für Anker), Transaktionen mit
  Datensatz-Diffs, eine Geste ist ein Schritt.
- **Format:** JSON mit Versionen je Baustein und Migrationen, deterministisch geschrieben (gleicher Inhalt, gleiche Bytes), mit zod und
  JSON-Schema.
- **Bildrate:** WebKit zeichnet Canvas-Animationen nahe 60 Hz, auch auf 120-Hz-Bildschirmen; Chrome folgt dem Bildschirm. 60 Hz ist die
  ehrliche Referenz.
- **iPad mit Stift:** Pointer Events reichen seit Safari 18.2 (zusammengefasste und vorausgesagte Proben, Neigung, Schweben).
- **Verpackung:** vorerst keine; später Capacitor fürs iPad, Tauri 2 für eine Mac-App nur auf Wunsch.
- **Bausteine:** nehmen earcut, box2d3-wasm, perfect-freehand, Mutative oder Immer, zod, fractional-indexing, nanoid, tinykeys, Zag,
  fflate; prüfen paper.js 0.17 und Clipper2-WASM; nicht nehmen Spine-Laufzeiten, das tldraw-SDK und das Studio von Theatre.js (AGPL).

### 2.12 Bedienung kreativer Werkzeuge (12)

- **Selbsterklärende Werkzeuge haben eine kurze Grammatik, die überall gilt** (Figma, Procreate, Apple): antippen, ziehen, halten.
- **Modi sind die größte Fehlerquelle der Animationswerkzeuge** (Spine: Setup gegen Animate; Rive: Design gegen Animate). Die
  Forschung rät zu Quasimodi, die nur gelten, solange man hält.
- **Zustände mit automatischem Übergang sind am verständlichsten** (Keynote Magic Move, PowerPoint Morph, Figma Smart Animate,
  Principle): verdoppeln, ändern, fertig; die Zuordnung läuft über Identität.
- **Treiber statt Zeit** (Principle, ProtoPie Chain, Live2D, Spine-Slider): Das stützt den Regler als einen Baustein.
- **Vorspielen findet Timing schneller als Schlüssel setzen** (Procreate Dreams, Character Animator, Bret Victor).
- **Was sich von selbst bewegt, ist ein Verhalten, kein Schlüssel** (Apple Motion, Character Animator).
- **Eine Feder mit zwei Zahlen reicht als Zeitsprache** (Apple, WWDC 2023: Dauer und Federung).
- **Gesten sind Abkürzungen, nie der einzige Weg;** Procreates Gesten sind der stille Standard der Zeichner.
- **Figmas Umbau UI3:** Schwebende Panels machten Leute langsamer und wurden zurückgenommen. Minimal heißt wenige feste Orte, nicht
  alles verstecken.
- **Bret Victor:** sofortige Verbindung zu dem, was entsteht; Zeit als Raum zeigen (die Spur der Figur).

**Für Studio:** Bühne, unten Posen und die Leiste des Gewählten, rechts ein festes Feld; vier Gesten; ein Schlüsselpunkt mit drei
Zuständen; die aktive Stelle; vier Linsen; Chips; Drähte und Sätze; Spielen auf derselben Bühne.

### 2.13 Spieldesign: Rad, Balance, Komik (13)

- **Schwerkraft nach unten, nicht zur Mitte:** Auf einem kleinen Planeten wie in Super Mario Galaxy gibt es keine Hänge; Florians
  Mechanik braucht ein Rad in gewöhnlicher Schwerkraft.
- **Die Lage ist das Gaspedal:** oben steht Ozzy, etwas daneben tapst er, weiter unten trabt und galoppiert er, noch weiter reicht seine
  Bremskraft nicht, und er stolpert.
- **Gespielt wird Besen-Balancieren:** ein umgekehrtes Pendel mit der Kippzeit τ = √(R/g); große Räder kippen langsam.
- **Die besten Vorbilder bewegen die Welt statt der Figur** (LocoRoco, Super Monkey Ball, Kirby Tilt 'n' Tumble, Rolando) und lassen
  Hänge den Schwung machen (Tiny Wings). Gefahren: Wiederholung (Hauptkritik an LocoRoco) und Härte (TumbleSeed).
- **Komik aus Physik trägt,** wenn das Missgeschick harmlos bleibt und die Figur es ernst meint (harmlose Verletzung; Chuck Jones;
  Fall Guys). Bahnen bleiben echt, Cartoon gibt es nur in der Zeit, in den Posen und hinter dem Bildrand.
- **Eigensinn wird eine Mechanik aus Launen,** die nur Sollwerte ändern und sich etwa eine Sekunde vorher am Körper ankündigen (Lehre
  aus The Last Guardian).
- **Steuerung:** ein Finger, Ziehen überall; Halten, Ziehen und Loslassen sind drei Zustände derselben Physik; kein Knopf im Spiel.

### 2.14 Spiellogik ohne Code (14b)

- **Die stärksten Belege gibt es für Wenn-dann-Regeln an Dingen:** Laien bauen sie so gut wie Programmierer, 78 % der gewünschten
  Abläufe passen in einen Auslöser und eine Aktion (Ur u. a., CHI 2014); 58 % von 346 Kodu-Programmen hatten selbst gebaute Zustände aus
  Regeln; Super Mario Maker zeigt die größte Breite.
- **Die Fehler sind bekannt:** Laien verwechseln Ereignis („sobald“) und Zustand („solange“) und vergessen, dauerhafte Aktionen
  zurückzunehmen (Huang und Cakmak 2015); eine Studie mit 153 Personen fand zehn Fehlerklassen (Brackenbury u. a. 2019).
- **Graphen und Drähte sind lernbar, aber schwer zu prüfen** (Rive, Dreams, LittleBigPlanet). **Fertige Bausteine tragen die
  Schwere** (GDevelop, Construct, Fortnite-Geräte, Mario-Maker-Teile).
- **Vorschlag:** Bausteine, Drähte, Karten. Karten in genau drei Arten („Sobald“, „Solange“, „Laune“); Vorrang über fünf sichtbare
  Bänder (Körper, Regie, Spieler, Laune, Grund); ein fester Takt mit Schnappschuss; Folgen im nächsten Takt; Zufall mit Saat und
  getrennten Strömen; „Warum?“ und „Warum nicht?“ an jeder Änderung (mit der Whyline wurde Fehlersuche fast achtmal schneller, bei
  kleiner Stichprobe). Das Stolpern löst die Physik aus, nicht eine Tempo-Schwelle.

### 2.15 Tempo auf iPhone 16, iPad und Mac (14c)

- **Der Stromsparmodus halbiert den Bildtakt auf 30 Hz, Wärme allein nicht;** Wärme drosselt die Grafik auf 66 bis 78 %, und Bilder
  fallen dann unregelmäßig aus.
- **Ein iPhone-16-Kern ist im kurzen Lauf so schnell wie ein M3-Pro-Kern** (±10 %); warm mal 1,3 bis 1,5, im Stromsparmodus mal 2,5.
  Prozessorzeiten aus Safari am Mac lassen sich also fast eins zu eins übertragen; Grafikzeiten nicht.
- **Die Szene aus 13 passt in 8 ms Grafikzeit** nur mit vier Maßnahmen: Felder nur im Rahmen jeder Figur; Felder in halber Auflösung
  bei voller Bildauflösung (Valve-Verfahren, Spitzen prüfen); Welt einmal gebacken oder analytisch; Pfützen und Kameratropfen als
  analytische Tropfen. Rechnung: 3,4 bis 8,2 ms kalt.
- **Prozessor:** Die Kette für Ozzy kostet rund 1 bis 2,5 ms, wenn sie keinen Speicher wirft; der Prototyp rechnet heute bei jedem
  PCHIP-Aufruf alle Steigungen neu und legt dabei Felder an (geschätzt 2 bis 5,5 ms samt WebGL-Aufrufen).
- **Speicher, Kontext, Start:** keine feste Grenze, aber Abbrüche ab 1,25 GB beobachtet; Verlust des WebGL-Kontexts ist auf iOS real;
  Shader beim Laden übersetzen.
- **Messen in Safari ist eingeschränkt** (Uhr auf 1 ms ohne Isolation, keine GPU-Zeitabfrage auf iOS). Eine Messseite `tempo.html` mit
  zehn Blöcken und einem Knopf ersetzt die fünf Einzelproben aus 07 bis 11.

### 2.16 Ton, Haptik, Barrierefreiheit (14d)

- **Klang hängt an seiner Ursache:** Marke in der Zeit (Spine, Unreal, Rive), Zustand oder Übergang, Kontakt mit Aufprallstärke
  (Box2D), stetiger Wert (FMOD-Parameter, Wwise-RTPC). In Studio genügt ein Klang-Chip an der Ursache; „Tonhöhe nach Tempo“ ist ein
  Draht.
- **Abwechslung:** wenige Aufnahmen plus leichte Streuung, nicht die letzten zwei wiederholen, Mindestabstand, Stimmen begrenzen.
- **Musik sind Karten und Übergänge** wie Posen, mit Wechselstellen (sofort, Schlag, Takt, Phrase); Vorbild Untitled Goose Game.
- **iPhone:** Safari gibt Ton erst beim Loslassen der ersten Berührung frei; Web Audio schweigt im Stummmodus, und den Stummzustand kann
  niemand lesen, also braucht jeder Gag, der über Ton läuft, eine sichtbare Entsprechung. Haptik gibt es nur in der App;
  `@capacitor/haptics` kennt nur drei Stoßstärken.
- **Barrierefreiheit:** Nichts Wesentliches nur über Ton; Dreiklang aus Klang, Rand-Bild und Stoß; Bewegung reduzieren (Systemschalter
  plus eigener Schalter); Steuerhilfen (zwei Daumen, Ein-Tasten-Modus, Spieltempo).
- **Bestand:** Prototyp 1 hat eine erprobte Ton-Maschine (Mischpult, Stimmen-Pools, Vorausplaner, Freischalten mit Wachhund,
  Offline-Rendern für Tests); im Paketplan aus 11 fehlt ein Ton-Paket.

---

## 3 Ehrliche Gegenüberstellungen

Jede Tabelle wertet für unseren Fall: ein Charakter- und Physik-Spieleditor, ein Art Director ohne Programmierkenntnisse, der mit dem
Auge entscheidet und Übergänge selbst formen will; Mac, iPad mit Stift und iPhone; Formen, die exakt wie seine Zeichnungen aussehen und
nie springen, rutschen oder verklumpen. Die Wertungen stammen aus den Einzelberichten (Quelle je Tabelle), nicht aus Messungen.
Zeichen: ●●● stark, ●●○ mittel, ●○○ schwach; ++ sehr gut, + gut, o mittel, − schwach, −− ungeeignet.

### 3.1 Ordnungsprinzip der Zeit: Zeitleiste, Posengraph, Parameterraum, Aufnahme

Nach 05 §4.1, ergänzt um 04 §5 und 12 §5.2. Die letzte Zeile ist eine Erwartung, keine Erfahrung.

| Prinzip | Vorbilder | Übersicht | Ausdruck (Timing, Ausholen) | Spiel und Unterbrechung | Physik passt | ohne Programmieren | Touch | Glätte | Bauaufwand |
|---|---|---|---|---|---|---|---|---|---|
| Klassische Zeitleiste (Spuren je Eigenschaft) | Spine, After Effects, Rive | ●○○ | ●●● | ●○○ | ●○○ | ●●○ | ●○○ | ●●○ | gering |
| Posengraph (Zustandsautomat) | Unity, Unreal, Rive, Godot | ●●○ bis etwa 8 Zustände | ●○○ | ●●● | ●●○ | ●○○ | ●●○ | ●○○ | mittel |
| Tafel „Standard plus Ausnahmen“ | Spine (Mischzeiten), Godot (Wegsuche) | ●●● | ●○○ | ●●○ | ●●○ | ●●● | ●●○ | ●●○ | gering |
| Parameterraum (Leisten und Felder) | Live2D, Rive-Joysticks, Spine-Slider, Harmony, Blend Spaces | ●●● | ●●○ (Form ja, Zeit nein) | ●●● | ●●● | ●●○ | ●●● | ●●● | mittel |
| Aufnahme (Vorspielen) | Procreate Dreams, Character Animator | ●●○ | ●●● (Timing) | ●○○ | ●○○ | ●●● | ●●● | ●○○ (Zittern) | mittel |
| Prozedural und Physik | Overgrowth, Cascadeur, Rain World | ●○○ ohne Vorschau | ●●○ | ●●● | ●●● | ●○○ | ●●○ | ●●● | hoch |
| Motion Matching | große Spieleproduktionen | ●○○ | hängt an Daten | ●●● | ●●○ | ●○○ | – | ●●○ | nicht machbar |
| **Posen, Regler, Übergänge** (Vorschlag) | 04, 05, 12 | ●●● | ●●● | ●●● | ●●● | ●●○ | ●●● | ●●● | mittel bis hoch |

**Urteil:**

- **Der Parameterraum ist der Unterbau.** Die Kopfdrehung des Prototyps ist schon einer. Balance, Tempo, Blick, Stimmung und
  Gelenkwinkel werden Regler; das Spiel und die Physik bewegen sie; die Zeit ist ein Regler unter anderen.
- **„Standard plus Ausnahmen“ ist das Datenmodell für „jede Pose in jede andere“.** Eine Zelle der Tafel ist reicher als eine Dauer:
  Standard, „über X“ (Wegsuche), gestalteter Übergang oder gesperrt.
- **Die klassische Zeitleiste bleibt klein:** als Taktleiste innerhalb eines gestalteten Übergangs und als Expertenspur. Als
  Ordnungsprinzip taugt sie für einen Film, nicht für eine Spielfigur, die fast ihre ganze Zeit auf das Rad reagiert.
- **Der Posengraph ist nur eine Ansicht** (und der innere Automat eines Bausteins wie „Vierbeiner“, den Florian nicht baut).
- **Aufnahme ist eine Eingabe** in jede Leiste, mit Glätten und Ausdünnen. **Physik** ist eine immer laufende Ebene, die in sichtbare
  Regler schreibt. **Motion Matching** und KI-Zwischenbilder: nein.

### 3.2 Morph und Knochen

**a) Mischart zwischen Schlüsselformen** (nach 06 §9.1, ergänzt um 02 §6.2 und 04 §8.2)

| Mischart | Wer | genau an Schlüsseln | Drehung ohne Schrumpfen | Biegung im Teil | Schutz vor Vorbeilaufen | Bauaufwand | Urteil |
|---|---|---|---|---|---|---|---|
| Gerade Bahnen, Griffe kartesisch | After Effects, Lottie, Spines Verformungsschlüssel, Live2D | ja | nein (Faktor cos(Δφ/2)) | nein | nein | trivial | nur Rückfall |
| Anker gerade, Griffe nach Winkel und Länge | Rive | ja | Griffe ja, Anker nein | nein | nein | gering | als Teilschritt enthalten |
| PCHIP je Ankerkoordinate, Griffe absolut nach Winkel und Länge, 100°-Ausnahme | Prototyp (`raster.ts`) | ja | nur bei dichten Schlüsseln | nein | Faltschlüssel | vorhanden | bleibt für Florians Kopfdrehung, bis ein Vergleichsbild anders entscheidet |
| **Rahmen + Rest**, Griffe relativ zur örtlichen Tangente | Vorschlag 06 §2.6 | ja | ja (Teil und örtlich) | nein | Faltschlüssel, weniger Fehlalarme | klein | **Standard für neue Formen und Regler** |
| Intrinsisch (Sehnenlängen und Winkel) | Sederberg u. a. 1993 | ja | ja | entlang der Kontur | Sehne kann nicht durch null | mittel | nein (falsch bei echten Falten) |
| ARAP-Interpolation | Alexa u. a. 2000; Cavalry „Rigid“ | ja | ja | ja | gut, ohne Garantie | mittel bis groß | später als Mischart „biegen“ je Teil |
| Über Abstandsfelder | Cavalry „Implicit“ | Anker gehen verloren | – | ja | – | mittel | nein: Florians Anker müssen exakt bleiben |
| Begrenzte Verzerrung | Chen, Weber u. a. 2013 bis 2017 | ja | ja | ja | garantiert | groß | nicht nötig |

**Urteil:** PCHIP bleibt in allen Fällen die Kurve über die Schlüssel (monoton, kein Überschwingen). Was sich ändert, ist, welche
Größen gemischt werden: bei „Rahmen + Rest“ Drehwinkel, Logarithmus der Größe und kleine Reste statt roher x und y. Der Gegensatz
zwischen 01 bis 04 („PCHIP behalten“) und 06 („PCHIP auf x und y ist falsch“) ist deshalb kleiner, als er aussieht. Für Florians
fertige Kopfdrehung wird die Mischart nie still gewechselt, sondern nur nach einem Vergleichsbild in derselben Ansicht (Ohr 120°,
Stirnfranse zwischen 52° und 82°, 06 §11). Kreisregler wie θ werden periodisch gemischt (04 §7.3, 06 §2.5); Faltschlüssel werden
sichtbare, verschiebbare Marken.

**b) Reihenfolge und Ort einer Formänderung** (nach 03 §10.2, 04 §7.4, 06 §6, 07 Schritt 7)

| Weg | Wer | Für | Gegen | Urteil |
|---|---|---|---|---|
| Vor den Knochen, im Ruheraum des Knochens oder der Achse | Moho Smart Bones, Pose Space Deformation, Spine (je Einfluss im Knochenraum) | Korrekturen drehen mit; Änderungen der Grundform wirken überall | jeder Zug muss beim Formen in die Ruhe zurückgerechnet werden | **gewählt** für alle gespeicherten Formänderungen |
| Nach den Knochen, im Bildschirm | – | einfach | dreht nicht mit, bricht in jeder anderen Pose | verworfen |
| Beides als zwei Schichten | – | flexibel | zwei Orte für dasselbe; Florian müsste wissen, wo eine Änderung landet | verworfen |
| Zusatz im mitlaufenden Rahmen der aktuellen Form (Tangente, Normale, örtliche Größe) | Live2D-Schachtelung, 04 §7.4 | ein Zusatz (Maul, Augen) wirkt über viele Ansichten | nur plausibel; Korrekturen je Ansicht nötig | für Zusätze über einer Ansichtsachse (Kopf 360°) |
| Gelenke reiten auf der gemorphten Elternform (starre MLS) | 07 Schritt 7 | Ohrgelenke wandern bei der Kopfdrehung mit, ohne Schlüssel | eine kleine Rechnung je Bild | **gewählt** für Teile an gemorphten Eltern |
| Flüchtige Verformung nach dem Skinning (Formabgleich, Glätte-Schutz) | 06 §8, 07, 08 §3 | Wackeln, Glätte | darf nie gespeichert werden | erlaubt, wenn in Ruhe null und nie gespeichert |

**c) Wie die Knochen mischen** (nach 03 §10.4, 06 §9.2, 07 §3.3)

| Art | Wer | Gelenk bleibt voll | Kosten | Urteil |
|---|---|---|---|---|
| Starr: Teil ganz an einem Knochen | Moho (Ebene binden), Character Animator | keine Mischung nötig; die Naht schließt der Renderer | minimal | **Standard** für die meisten Teile Ozzys (Kopf, Nase, Bart) |
| Biegeachse: Bézier-Achse von der Wurzel zum Ende, Länge bleibt | Prototyp-„Rückgrat“, RubberHose, Kurvenverformer | ja, kein Einfallen, IK von selbst | gering | **Standard** für Beine, Schwanz, Ohren ohne Schlüsselformen und den Rumpf |
| Lineares Mischen (LBS) | Rive, Spine, alle Laufzeiten | nein, Faktor cos(φ/2) | minimal | Schalter |
| Optimierte Drehzentren | Le und Hodgins 2016 | ja, kaum Ausbeulen | klein, einmal vorgerechnet | **Standard** für Teile mit mehreren Knochen und Gewichten |
| Dual-komplexe Zahlen | 2D-Gegenstück der Dual-Quaternionen | ja | klein | nein (beult am Gelenk aus) |
| Netz-Verformer (ARAP, Gitter) | OpenToonz, Live2D, Puppet-Werkzeuge | ja | Netz und Verlust der Vektorgenauigkeit | nur als Werkzeug „Biegen“ beim Formen; das Ergebnis wird eine Form |

**Urteil:** Für Ozzy entschärft sich die Frage, weil die meisten Teile starr sind und die länglichen Teile Biegeachsen bekommen.
Gewichte mit Mischung bleiben für die Bohne beim Biegen und den Hals. Dort zeigen zwei Videos nebeneinander (lineares Mischen gegen
Drehzentren, 03 §11.10 Probe 5 und 06 §11 Probe 3), was Florian schöner findet; beides ist billig zu bauen.

### 3.3 Gewichte auf Anker und Griffe

Fünf Berichte nennen fünf Regeln (01 §3.1, 02 Empf. 5, 03 §11.3, 06 §4.4, 07 Schritt 6). Sie widersprechen sich weniger, als es
scheint, weil alle denselben Standard haben und dieselbe Bedingung schützen: Ein glatter Anker bleibt nur glatt, wenn seine beiden
Griffe dieselbe Abbildung erfahren.

| Regel | Herkunft | glatter Anker bleibt glatt | Kontrolle | Urteil |
|---|---|---|---|---|
| G0: Griffe erben die Abbildung ihres Ankers | Spines Rat, 06, 07 | exakt | gering | **Standard** |
| Ein gemeinsamer Gewichtssatz je glattem Griffpaar, der vom Anker abweichen darf | 03 §11.3 | exakt (beide Griffe dieselbe Abbildung) | hoch: ein halbes Gewicht am Knie rundet die Biegung | **Regel für Abweichungen an glatten Ankern** |
| Richtung gemeinsam, Längen mit eigenem Gewicht; an Ecken auch die Richtung | 01 §3.1 | ja | mittel | Sonderfall der Regel darüber |
| Eigene Gewichte je Griff (G1), danach Glätte-Schutz | Rive; 06 §4.4 | nur mit Schutz | sehr hoch | an Ecken; der Schutz repariert jede Stufe, die Glätte verletzt (auch die Physik) |
| Schalter „Griffe eigen“ | 02 Empf. 5 (wie Rive) | ohne Schutz nein | hoch | als Bedienung: Schloss am Anker (12 §6.10) |
| Vorschlag aus dem Kurvenpunkt bei t = 1/3 und 2/3 | 06 §5.2, 07 Schritt 6 (nach Liu u. a.) | danach Schutz | automatisch | Vorschlagswerte des Autorigs über Gelenkzonen |
| Kurven-Ausgleich je Knochen | Liu, Jacobson, Gingold 2014 (Illustrator Puppet Warp) | ja, als Nebenbedingung | automatisch | spätere Stufe für lange Stücke über Gelenken |
| Volle Ableitung der Verformung am Anker (G3) | 06 §4.4 | – | braucht Ableitungen gemalter Gewichte | nein |

**Urteil, als eine Regel:** Griffe erben. Weicht Florian ab, bekommt ein glatter Anker **einen** Gewichtssatz für sein Griffpaar
(exakt glatt, ohne Reparatur), eine Ecke einen je Griff. Der Glätte-Schutz (gemeinsame Richtung d ∝ |v|·v − |u|·u, Längen bleiben,
06 §4.4) greift nur dort, wo eine Stufe die Bedingung nicht von selbst hält: eigene Gewichte je Griff an einem glatten Anker und die
Physik. Vorschlagswerte kommen aus dem Kurvenpunkt, nicht aus der Lage des Griffs. Höchstens vier Knochen je Anker. Gezeigt wird das
Gewicht als Wärme auf der Form und als Ring am Anker; geändert wird es durch Ziehen am Anker, mit dem Pinsel nur als Fachwerkzeug.

### 3.4 Autorig-Verfahren

**a) Wie entsteht das Skelett?** (nach 07 §3.1)

| Ansatz | Vorbild | kann gut | scheitert an | Urteil |
|---|---|---|---|---|
| Handarbeit | Spine | alles, genau | Zeit, Fachwissen | nur als Korrektur |
| Achse der ganzen Silhouette | Mittelachse, Straight Skeleton, Chordal-Achse (Teddy) | Glieder einer einzelnen Form | Scheinäste, keine Bedeutung, überlappende Teile | je Teil ja; für die ganze Figur nur als Notweg |
| Posenschätzung mit neuronalem Netz | Animated Drawings | Bilder ohne Struktur | nur trainierte Körperbaupläne, Server oder großes Modell, nicht erklärbar | nein |
| Vorlage einbetten | Pinocchio, Duik, Cartoon Animator, Live2D | Bedeutung, IK, Physik | Lage der Knie, Namenszwang | ja, als Daten und Vorschlag |
| Neuronales Riggen | RigNet und Nachfolger | beliebige 3D-Netze | 3D, Daten, Rechenzeit, Erklärbarkeit | nein |
| **Teile-Graph + Vorlage + Achse je Teil** | Vorschlag 07 | nutzt, was die Figur schon hat; schnell, offline, erklärbar, korrigierbar | Figuren aus einem einzigen Umriss; neue Körperbaupläne brauchen eine Vorlage | **ja** |

**b) Wie entstehen die Gewichte?** (nach 06 §5.1, 07 §3.2)

| Verfahren | Wo | Stärke | Schwäche | Urteil |
|---|---|---|---|---|
| Starr | Moho, Character Animator | einfach, stabil | Knick am Gelenk (der Renderer verschmilzt ihn) | Standard für starre Teile |
| Nächster Knochen mit Übergang | Rive „Auto“, Moho | sofort verständlich | greift über Lücken in Nachbarteile | nur innerhalb eines Teils |
| **Achsen-Koordinate über das Rechennetz** | Vorschlag 07; Prototyp-Rückgrat | exakt für längliche Teile, keine Leckage, ein Regler je Gelenk | braucht eine Achse | **Standard** für Beine, Schwanz, Ohren, Rumpf |
| Wärmeleitung | Pinocchio, Blender | glatt, formbewusst, ein dünn besetztes System, einmal zerlegt | bricht bei getrennten Teilen | für runde Teile mit mehreren Knochen |
| Bounded Biharmonic Weights | Forschung (2011), Unity 2D | sehr glatt, örtlich, in [0, 1] erzwungen | quadratische Optimierung, kein fertiger Löser in TypeScript | erst, wenn Wärme sichtbar nicht reicht |
| Hüllkoordinaten (harmonisch, Mittelwert, Green) | Live2D-Gitter, Forschung | gut für Verformer über ganze Teile | nicht örtlich, nicht formbewusst | nicht für Knochen |
| Kurven-Fit | Liu u. a.; Illustrator Puppet Warp | Bézier bleibt Bézier, Glätte garantiert | Vorberechnung je Teil | Zusatz, spätere Stufe |

**c) Wie korrigiert man das Ergebnis?** (nach 03 §11.7, 07 §3.4, 12 §6.10)

| Muster | Vorbild | Urteil |
|---|---|---|
| Erst Marker setzen, dann rechnen | 3D-Autorigger | nein: ein Schritt zu viel |
| Erst rechnen, dann Gelenke ziehen | Animated Drawings | **ja** |
| Am Anker ziehen; ein Regler „hart ↔ weich“ je Gelenk (Ring) | 03 §11.7 und §11.8, 07 §5 | **ja, Standard** |
| An der Überlappung anheften | Character Animator | ja (Teil auf ein anderes ziehen) |
| Gewichte malen | Spine, Unity, Rive | als Fachwerkzeug (Taste W in der Linse Knochen) |

**Urteil:** Autorig aus Teile-Graph, Vorlage und Achse (07); Gewichte über die Achsen-Koordinate, für runde Teile über Wärme (06), BBW
nur bei Bedarf (der Wunsch aus 01 nach „formbewussten Gewichten wie BBW“ ist mit Achse und Wärme erfüllt). Läuft in einem dauerhaften
Worker nach dem Loslassen, nie in jedem Ziehbild (14c). Was Florian korrigiert, bleibt beim nächsten Lauf stehen.

### 3.5 Physik-Engines und Gesamtwege

**a) Gesamtwege** (nach 14a §4)

| Kriterium (Gewicht) | A: eigener XPBD-Kern für Figur und Welt (08) | **B: Box2D-Welt + XPBD-Figur** (09, korrigiert in 14a) | B′: wie B, die Welt steht, Schwerkraft und Kamera drehen | C: Rapier-Welt + XPBD-Figur |
|---|---|---|---|---|
| Ruhe und Reibung echter Kontakte: Sitzen, Rutschen, Liegen (hoch) | − | ++ | ++ | ++ |
| Sturz mit 10 bis 14 Körpern (hoch) | o | + | + | ++ |
| Dynamisches Rad mit Rückwirkung (hoch) | ++ | + | o | + |
| Anschlag gleich Zeichnung (hoch) | ++ | + | + | + |
| Morphende Hüllen (mittel) | + | o | o | + |
| Zurückspulen, Prüfsumme (hoch) | ++ | + | + | ++ |
| Ein Takt (mittel) | o (etwa 20 Teilschritte nötig) | ++ | ++ | ++ |
| Aufwand bis zur Probe (mittel) | −− (Wochen) | + (4 bis 6 Tage) | o | + |
| Pflege über Jahre (hoch) | − | + | + | o |
| Größe im Web (niedrig) | ++ | + | + | o |

**b) Engines im Einzelnen** (nach 09 §7.1, verkürzt)

| Kriterium | Box2D 3.2 (WASM) | Rapier 2D 0.21 | Planck.js | Phaser Box2D | Matter.js | p2 | eigene XPBD |
|---|---|---|---|---|---|---|---|
| Kontakte, Reibung, Stapel | ++ | ++ | + | + | − | o | − |
| Gelenke, Motoren, Ragdoll | ++ | ++ | + | + | −− | + | + |
| Kontinuierliche Kollision | ++ | + | + | + | −− | o | − |
| Determinismus über Plattformen | ++ | ++ | o | o | o | o | + (mit eigenen Winkelfunktionen) |
| Snapshot, Zurückspulen | ++ | ++ | − | −− | − | − | ++ |
| Federn auf Punkten, Griffen, Reglern | −− | o | −− | −− | − | − | ++ |
| Pflege | + (Kern sehr gut, Web-Bindung zwei Personen) | + (häufige API-Brüche) | + | −− (Stand 3.0) | − | −− | o (wir selbst) |
| Größe im Web | + (rund 160 bis 185 KB komprimiert) | o (rund 0,7 MB) | ++ | ++ | ++ | ++ | ++ |

**Urteil:** Weg B. Kontakte, Reibung, kontinuierliche Kollision und Ragdoll-Stöße sind in Box2D über Jahre gelöst; eine eigene Lösung
erreicht das nicht in vertretbarer Zeit, und genau ihre Schwächen (Zittern, Kriechen, Hüpfer, Explosion) sind die Bilder, die Florian
als Fehler sieht. Federn, Formabgleich und Flächenerhalt auf Florians Formen sind dagegen XPBDs Stärke und gehören in die eigene
Schicht. Rapier ist der vorbereitete Rückfall (besser bei morphenden Hüllen und Mehrkörpergelenken), B′ der Rückfall für die Kette am
drehenden Rad, A nur, wenn beide scheitern. Freigabe nach Probe P1 (Abschnitt 4.7).

### 3.6 Renderer

**a) Kern-Renderer** (nach 10 §2.13 und §7.1; die letzte Zeile ist eigene Einschätzung, weil 10 den geometrischen Weg nicht geprüft hat)

| Weg | Kanten | Verschmelzen, Dickenregel | Form ändert sich jedes Bild | iPhone, Safari, App | vektorgenauer Export | Urteil |
|---|---|---|---|---|---|---|
| **Eigener Abstandsfeld-Renderer** (Prototyp) | sehr gut, stabil, scharf in jedem Zoom | ja, voll | sehr gut | WebGL2 überall; Tempo auf dem iPhone noch zu messen | nein (nur über Backen) | **wählen** |
| Rive-Renderer | exakt, Feathering | nein | gut | gut | – | nein |
| Vello | exakt | nein | gut | WebGPU, junges WebGL2 | – | nein |
| Skia / CanvasKit | gut | nein | gut | mehrere MB | – | nein |
| PixiJS v8 (Triangulierung, MSAA) | mittel | nein | Neu-Zerlegung je Bild | gut | – | nein |
| ThorVG / dotLottie | gut | nein | gut | gut | Lottie | nur für Export |
| Kurvenlisten je Kachel mit Abdeckung (Slug) | exakt | nein | gut | gut | – | Vorbild für Stufe 2, dort mit Abstand statt Abdeckung |
| Geometrischer Weg: Verrundung über Versatzkurven und boolesche Operationen (paper.js 0.17 `offset` und `outline`, Clipper2) | über normales Pfadfüllen; Nahtfehler an gemeinsamen Kanten möglich | Verrundung ähnlich, aber nicht gleich der weichen Vereinigung; die Dickenregel (Abstand zu zwei Kanten) ist geometrisch schwer | boolesche Operationen je Bild an fast gleichen Kreuzungen, Sprünge der Topologie, wenn Teile sich berühren | Last auf dem Prozessor, fehleranfällig | **ja** | **nicht als Echtzeit-Renderer; prüfen als Backen** für Export, Kollisionskette und Vergleich mit dem Logo |

Zum geometrischen Weg (eigene Einschätzung): Er ist der einzige, der eine vektorgenaue Kontur liefert, und damit für drei Zwecke
wertvoll, die der Abstandsfeld-Renderer nicht abdeckt: Export als SVG oder Lottie mit Verschmelzen, dieselbe Kontur als Kette für Box2D
(14a backt die Rundungen ohnehin beim Bearbeiten) und ein exakter Vergleich mit Florians Logo. In Echtzeit trägt er nicht: Er bräuchte
je Bild robuste boolesche Operationen an morphenden Formen, und die Dickenregel lässt sich als Versatz nur näherungsweise bauen. Eine
kleine Probe kann an einer ruhenden Pose zeigen, wie nahe eine Verrundung mit paper.js oder Clipper2 dem Bild des Renderers kommt.

**b) Wie die Felder entstehen** (nach 10 §7.2 und 14c §8.1)

| Weg | Für | Gegen | Urteil |
|---|---|---|---|
| A wie heute: ganze Fläche, volle Dichte | läuft, einfach | iPhone rechnerisch rund 15 bis 34 ms; rund 180 MB Texturen | nicht für das Spiel |
| B Felder nur im Rahmen jeder Figur, volle Dichte | kleine Änderung, Bild unverändert | eine Figur passt, die ganze Szene knapp nicht | **sofort** |
| C Rahmen, Felder in halber Auflösung, Bild in voller (Valve 2007) | Speicherverkehr und Texturen auf ein Viertel, Felder sättigen später | Spitzen könnten weicher werden | **nächster Schritt, nur nach Vorher-Nachher-Bild** |
| D Kachel-Durchgang ohne Zwischentexturen (Stufe 2) | keine Grenze von 24 Flächen, kein Deckel für die Reichweite, exaktes Gefälle | eigener Code, Einsortieren, lange Listen bei großen Radien | Reserve |
| E WebGPU mit Rechenshadern | Einsortieren auf der Grafikkarte | iOS 26 nötig, frische Fehler | später, als zweites Backend |

**Urteil:** Abstandsfeld-Renderer behalten und verallgemeinern (Stufe 1 aus 10 §8.5): Verschmelz- und Ebenenmodell als Daten, aus denen
der Bildshader übersetzt wird; Felder nur im Rahmen jeder Figur; Abflachung mit fester Stückzahl; Reichweite je Flächenpaar; mehrere
Feldsätze, wenn eine Szene mehr als 24 Flächen braucht. WebGL2 jetzt, WebGPU später hinter derselben schmalen Schnittstelle. Effekte im
Bilddurchgang aus Abstand, Rauschen und Zeit; keine Nachbearbeitungen. Der geometrische Weg kommt als Backen hinzu, nicht als Ersatz.

### 3.7 UI-Technik

**a) Grundlage der Oberfläche** (nach 11 §3)

| | Ohne Framework | Lit 3 | React 19.3 + Compiler 1.0 | Preact 11 + Signals | Solid 2.0 | Svelte 5 |
|---|---|---|---|---|---|---|
| Feine Bindung an Live-Werte | von Hand | je Bauteil | je Bauteil, mit kleinen Abos fein genug | direkt in den Textknoten | von Grund auf fein | fein über Runen |
| Typprüfung mit TypeScript 7 | ja | schwach | ja | ja | ja | voraussichtlich noch nicht |
| Fertige Bauteile | keine | wenige | sehr viele | über `preact/compat` und Zag | verlangen noch Solid 1.9 | gut |
| Sicher für KI-Sitzungen | Struktur zerfällt leicht | mittel | am höchsten | hoch | mittel | mittel |
| Schon im Repo | Prototyp | nein | Spiel, alter Editor | nein | nein | nein |
| **Urteil** | nur für die heißen Flächen | nein | **kühle Flächen** | Alternative | beobachten | nein |

**b) Zustand und Rückgängig** (nach 11 §4)

| Verfahren | Wer | Für | Gegen | Urteil |
|---|---|---|---|---|
| Befehlsmuster | klassische Desktop-Programme | genau, speicherarm | jede Aktion doppelt programmiert; Gesten, Autorig, Aufnehmen schwer zu fassen | nein |
| Ganze Stände mit geteilter Struktur | Redux-Welt | trivial richtig, billig zu vergleichen | allein nichts zum Speichern oder Senden | als Unterbau ja |
| Patches (Immer, Mutative) | – | klein, sendbar | Pfade über Feldindizes brechen | nur zum bequemen Ändern innen |
| **Datensatz-Diffs** | tldraw, Excalidraw, Figma im Kern | ein Diff für Rückgängig, Speichern, Live-Verbindung, später Sync | Datensätze nicht zu groß bauen | **wählen** (eigener kleiner Store) |
| Rückgängig im CRDT | Yjs, Automerge, Loro | fest gegenüber Zusammenarbeit | die Bibliothek bestimmt das Datenmodell | später, nur bei Arbeit auf mehreren Geräten offline |

**c) Verpackung** (nach 11 §8)

| Weg | Engine | Zeichenfläche am 120-Hz-Bildschirm | wann |
|---|---|---|---|
| Browser + Dev-Server | Chrome oder Safari | Chrome 120 Hz, Safari etwa 60 Hz | **jetzt** |
| Safari-Web-App (Mac-Dock, iPad-Home-Bildschirm) | WebKit | etwa 60 Hz | **jetzt fürs iPad** |
| Capacitor (iPad) | WKWebView | etwa 60 Hz | wenn das iPad ohne Mac arbeiten soll; Pencil-Gesten über ein kleines Plugin |
| Tauri 2 (Mac) | WKWebView | etwa 60 Hz | nur bei Wunsch nach einer eigenen Mac-App |
| Electron (Mac) | Chromium | 120 Hz | nur, wenn Chromium-Eigenschaften zählen |

**Urteil:** Heiße Flächen (Bühne, Überlagerungen, Leiste, Posen-Brett) in eigenem Code auf WebGL2 und Canvas 2D; kühle Flächen mit React
19.3 und Compiler, Live-Werte über Signale (Schichtenregel: was sich je Bild ändert, läuft nie über React-Zustand); komplexe
Bedienelemente aus Zag; ein Befehlsregister als einzige Quelle für Tasten, Menüs, Befehlssuche und Hilfe. Eigener kleiner Store mit
Datensatz-Diffs (geschätzt 600 bis 1 000 Zeilen). Vorerst keine Verpackung; Florians Editor läuft von einem festen Stand, nie vom
Dev-Server, an dem gerade gebaut wird.

### 3.8 Speicherformat

| Weg | Vorbild | Für | Gegen | Urteil |
|---|---|---|---|---|
| **JSON mit Versionen und Migrationen** | tldraw | lesbar, saubere Git-Diffs, KI-Sitzungen können sicher lesen und schreiben, ältere Stände wandern beim Laden mit | größer; braucht einen deterministischen Schreiber | **wählen** |
| Binär mit Inhaltsverzeichnis der Eigenschaftstypen | Rive | klein; ältere Laufzeit überspringt Unbekanntes | nicht lesbar, keine Diffs | später nur für die Laufzeitdatei des Spiels, wenn gemessen nötig |
| Export, den nur die gleiche Laufzeitversion liest | Spine | einfach für den Hersteller | kettet Editor und Spiel aneinander, Neu-Export bei jedem Versionssprung | nein |
| Zustand als JSON, das die Laufzeit direkt lädt | Theatre.js | ein Format für Editor und Laufzeit | ohne Schema und Migration | die Idee übernehmen |
| Lottie als Austausch | Lottie | breite Abspieler | verliert Knochen, Physik, Logik und Verschmelzen | nur Export gebackener Clips |
| CRDT-Dokument | Yjs, Automerge, Loro | Mehrgeräte offline | die Bibliothek bestimmt das Modell | nicht jetzt |

**Regeln** (11 §5.2): Kennungen mit Typvorsilbe, auch für Anker; Reihenfolge über Bruchindizes; Eltern als Zeiger am Kind; nichts
Abgeleitetes in der Datei (keine Abflachung, keine ausgewerteten Posen, kein Physikstand); deterministisch schreiben (feste
Schlüsselfolge, Zahlen auf 1/1000 Bildpunkt gerundet, −0 als 0), atomar über Umbenennen; Dokument und Sitzung getrennt; Versionen je
Baustein (Kern, Physik, Logik, Effekte, Ton) mit eigener Migrationsfolge, nur vorwärts, jede mit einer Testdatei aus Florians Ozzy;
eine neuere Datei öffnet ein älterer Editor nur zum Lesen; Prüfung mit zod, JSON-Schema daraus; Bilder und Florians Original-SVGs als
Dateien nach Hash. **Offen in 11:** Griffe als Lage oder als Winkel und Länge. Vorschlag (eigene Einschätzung, nach 02 Empf. 1):
relativ zum Anker, beim glatten Anker ein gemeinsamer Winkel und zwei Längen, bei der Ecke je Griff Winkel und Länge. So ist die
Glätte im Format selbst festgehalten und kann durch Runden nicht verloren gehen.

### 3.9 Spiellogik

Nicht in der Liste der Gegenüberstellungen verlangt, aber Gegenstand des größten Widerspruchs (Graph gegen Regeln). Nach 14b §6.

| Modell | Vorbild | Florian baut es | Florian findet Fehler | Launen mit Ankündigung | passt zur Physik | wiederholbar | Urteil |
|---|---|---|---|---|---|---|---|
| Ereignisblatt | Construct, GDevelop | ●●○ | ●●○ | ●○○ | ●●○ | ●●○ (ein Zufallsstrom) | als Satzform übernehmen |
| Zustandsgraph mit Datenbindung | Rive | ●○○ | ●●○ | ●●○ | ●○○ | ●○○ | nur als Ansicht |
| Drähte und Bauteile | Dreams, LittleBigPlanet | ●●○ Einstieg | ●○○ | ●●○ | ●●○ | nicht beschrieben | Drähte nur für stetige Kopplung |
| Regeln am Objekt | Super Mario Maker | ●●● | ●●● durch Spielen | ●○○ | ●●● | – | Grundlage: fertige Bausteine |
| Auslöser und Reaktion | ProtoPie | ●●○ | ●●○ | ●○○ | ●○○ | ●○○ | Schwellen mit Rückweg übernehmen |
| Verhaltensbaum | Halo 2, Unreal | ●○○ | ●●○ | ●●○ | ●●○ | ●●○ | nur im Inneren eines Bausteins |
| Nutzen-Auswahl | Dual-Utility | ●○○ | ●○○ | ●●● | ●●○ | ●●○ | zur Wahl der Launen, unsichtbar |
| **Bausteine, Drähte, Karten** (Vorschlag) | 14b | ●●● erwartet | ●●● erwartet | ●●● | ●●● | ●●● | **wählen** |

**Urteil:** Kein vorhandenes Modell passt allein. Getragen von den Belegen ist die Mischung aus fertigen Bausteinen mit Reglern, Karten
als kurze Sätze am Ding in genau drei Arten, Drähten für stetige Kopplungen, Vorrang über wenige sichtbare Bänder, Ausführung im Takt
mit Schnappschuss und Fehlersuche über „Warum?“ und Zurückspulen. Graph und Baum gibt es nur als Ansicht und als Rechenregel unter der
Oberfläche.

---

## 4 Empfehlungen

### 4.1 Produkt

1. **Eigener Editor, zuerst als Werkzeug für Ozzy und die Demo.** Ob Studio später ein Produkt für andere wird, bleibt offen (01 Frage
   1, 11 Frage 2). Die Lizenzhygiene gilt ab dem ersten Tag: kein Code und kein Format von Spine, kein AGPL im Editor, kein SDK mit
   Lizenzschlüssel, eine automatische Liste der Lizenzen aller Abhängigkeiten (11 §14).
2. **Die Demo bestimmt den Umfang.** Die Gassirunde ist die Abnahme. Jede Editor-Funktion entsteht, wenn die Demo sie braucht, und wird
   an ihr geprüft; was die Demo nicht braucht, wartet. So bleibt der größte Risikoposten, der Umfang, begrenzt (Abschnitt 4.7).
3. **Eine Laufzeit für Editor und Spiel.** Der Editor zeigt immer die Laufzeit, nie eine eigene Vorschau; das Spiel lädt dieselbe Datei
   und rechnet mit demselben Code (10 §7.6, 11 §12). Was im Editor glatt aussieht, ist im Spiel glatt.
4. **Plattformen:** Mac im Browser, iPad als Safari-Web-App mit Stift, iPhone zum Spielen, Ansehen und für kleine Korrekturen (12 §5.9).
   60 Hz ist die Referenz für „glatt“; am Mac misst der Editor die Bildrate und bietet eine 60-Hz-Vorschau (11 §8.3). Capacitor fürs
   iPad erst, wenn Florian ohne Mac arbeiten will; Tauri nur auf Wunsch.
5. **Florians Fenster bleibt ruhig:** Sein Editor läuft aus einem festen Stand (gebaute Fassung oder eigener Arbeitsbaum mit eigenem
   Port), nie vom Dev-Server, an dem gerade gebaut wird (11 §8.3, Arbeitsregel 3).
6. **Spines Semantik als Pflichtenheft, eigene deutsche Wörter** (Abschnitt 4.5). Florian entscheidet die Begriffe.
7. **Bewusst nicht bauen, vorerst:** Motion Matching, KI-Zwischenbilder, Knoteneditor, freier Zustandsgraph oder Dopesheet als
   Hauptansicht, zwei globale Modi, schwebende Panels, CRDT und Cloud, Export nach Spine oder Rive, Bloom und Weichzeichner, Rasterbilder
   auf Netzen, Skripte (höchstens später als abgeschotteter Notausgang, 02 Empf. 14).
8. **Kalibrieren statt raten:** Eine Stunde mit Rives Joysticks und Zustandsautomat (02 Empf. 18) und eine Stunde Kodu oder Super Mario
   Maker 2 (14b Empf. 16), bevor die Bedienung von Posen und Logik gebaut wird. Florian sagt, was sich selbstverständlich anfühlt. Das
   ist freiwillig, weil es seine Zeit kostet.

### 4.2 Bedienung

1. **Die Grammatik zuerst, die Funktionen danach** (12 §6): Tippen wählt, Ziehen ändert an der aktiven Stelle, Halten zeigt mehr,
   Doppeltippen geht hinein, Esc oder Tippen ins Leere geht hinaus; Rückgängig als Taste, Geste und Pfeil. Jede neue Funktion muss sich
   in die Tabelle der Dinge und Griffe (12 §6.3) eintragen lassen, sonst wird sie umgebaut.
2. **Kein globaler Modus, sondern die aktive Stelle:** Grundform, Pose, Stelle auf einem Regler oder Stelle in einem Übergang. Zwei
   Signale zeigen sie (der Tropfen in der Leiste, die Randfarbe der Bühne mit Hinweis „ändert: Pose Erschrecken · Kopf 37°“), ein
   Geltungs-Chip bietet nach jeder Änderung „nur hier · in allen Posen · in der Grundform“ an, die Karte „Probe“ speichert nie etwas.
   Entschieden wird über die Bedienprobe aus 12 §9; nur wenn sie scheitert, wird das Modell mit zwei Modi als Gegenprobe gebaut.
3. **Ein Schlüsselpunkt mit drei Zuständen überall** (grau: ändert sich hier nicht; Ring: ändert sich, kein Schlüssel; gefüllt:
   Schlüssel). Kein Zustand „geändert, aber nicht gesetzt“: Jede Änderung landet sofort an der aktiven Stelle.
4. **Eine Leiste für alle Achsen**, gebaut aus der heutigen Zeitleiste der Kopfdrehung: Klick springt, Ziehen fährt, Formen auf der Bühne
   setzt einen Schlüssel, J und K springen, Z zeigt die Zwiebelhaut, ⇧Z die Bahnen der Anker; Farben nach Herkunft (Vorlage, gebaut,
   seins). Felder mit zwei Achsen bedienen sich genauso.
5. **Posen wie Folien:** ＋ hält den Stand als Pose fest, Halten verdoppelt, Antippen zeigt den Übergang sofort, Ziehen der Karte nach
   oben mischt stufenlos.
6. **Übergänge:** Standardfeder ohne Gestaltung; die Brücke zwischen zwei Posenkarten öffnet die Taktleiste eines gestalteten Übergangs
   (Zwischenposen, Abschnitte mit Dauer und Kurvenart, Zusatzbewegungen, „bleibt stehen“ je Teil); die Tafel „von × nach“ zeigt alle
   Paare, auf dem iPhone eine Liste je Pose.
7. **Vier Linsen** (Form, Knochen, Physik, Spiel) bestimmen nur, was greifbar ist; Antippen wechselt, Halten schaut kurz hin
   (Quasimodus). Eine Geste bedeutet in jeder Linse dasselbe.
8. **Physik, Effekte und Klang als Chips** mit zwei Reglern; Expertenwerte unter „Mehr“ als zweite und letzte Ebene; „in Schlüssel
   umwandeln“ als Ausweg, wenn eine Stelle von Hand nachgeformt werden soll.
9. **Eine Zeitsprache:** jede Feder mit **Dauer** und **Federung** (0 % = kein Überschwingen) und wenigen benannten Vorlagen (sanft,
   knapp, federnd, langsam), gleich für Übergänge und Physik-Chips (Abschnitt 4.6, Punkt 7).
10. **Logik ohne Code:** Bausteine mit Reglern, Drähte in der Linse Spiel, Regeln als Sätze am Ding („Sobald“, „Solange“, „Laune“), fünf
    sichtbare Bänder statt Prioritätszahlen; Karten leuchten je nach Lage, „Warum?“ und „Warum nicht?“ an jeder Änderung (14b).
11. **Sehen statt raten:** Zwiebelhaut, Bahnen der Anker, Spur der Zukunft in der Linse Physik, ein Prüfer, der Sprünge, Rutschen,
    Knicke, Kerben, schwebende Teile und Klänge ohne Bild meldet und mit „Zeigen“ hinspringt; geändert wird nichts ohne Florian. Dazu
    eine schlichte Kostenampel „iPhone“ (14c Empf. 12).
12. **iPad:** Der Stift formt, Schweben zeigt nur eine Vorschau; sobald ein Stift im Spiel ist, ändert der Finger keinen Inhalt mehr,
    sondern nur die Ansicht (Handballen-Abweisung ohne Sonderfälle); ein zweiter Finger auf der Bühne während eines Stiftzugs rastet
    ein; ein Modify-Knopf am Rand ersetzt ⌥; Procreates Gesten für Rückgängig und Wiederholen; Trefferflächen 44 pt, sichtbare Punkte
    klein. Ohne Stift (iPhone) formt der Finger grob.
13. **Spielen auf derselben Bühne:** Im Spiel gehört jede Berührung dem Spiel, genau wie später auf dem iPhone. Zum Formen hält man an
    (Leertaste oder ▶, auf dem iPad auch mit dem Stift); dann gilt die normale Grammatik an der Stelle, an der angehalten wurde. Was im
    Spiel geändert wird, bleibt.
14. **Autorig mit einem Knopf** („Knochen vorschlagen“ in der Linse Knochen), Probewackeln, Fragezeichen nur bei Unsicherheit,
    Gelenkringe ziehen, Pinnen; der ganze Lauf ist ein Rückgängig-Schritt (07 §5).
15. **Aufnahme als Eingabe:** ● an einem Regler scharf schalten, auf der Bühne ziehen, Finger heben ist Pause; Glätten und Ausdünnen
    (05 §5.9, 12 §6.9).

### 4.3 Technik

1. **Pakete** (11 §12.1, ergänzt um 14d): `studio-format` (Typen, Schemas, Migrationen, Schreiber), `studio-laufzeit` (Regler, Morph,
   Knochen, Posen, Übergänge, Logik, Takt), `studio-welt` (Box2D-Adapter und Figurphysik), `studio-bild` (Renderer), `studio-ton`
   (Planung ohne DOM, Ausgabe über Web Audio), dazu `apps/studio` und `apps/ozzy-spiel`. Laufzeit und Format ohne DOM, deterministisch.
2. **Form:** „Eine Form, viele Zustände“; Anker mit Kennung; neue Anker formtreu in allen Zuständen (de Casteljau); Mischart „Rahmen +
   Rest“ mit Griffen relativ zur Tangente für neue Formen; Kreisregler periodisch; Faltschlüssel als Marken; drei Wächter je Bild mit
   roter Markierung statt stiller Reparatur (06 §10).
3. **Knochen:** starre Teile, Biegeachsen für längliche Teile, Drehzentren für gewichtete Teile (lineares Mischen als Schalter),
   höchstens vier Knochen je Anker; Griffe nach der Regel aus 3.3; Korrekturformen im Ruheraum am Gelenkwinkel (PCHIP), Kreuzschlüssel
   für streitende Korrekturen; „Pose zeichnen, Studio zerlegt“ als spätere Stufe (06 §6.4).
4. **Autorig:** deterministischer Rechenkern in einem dauerhaften Worker; Teile-Graph, Vorlage „Vierbeiner“ als Daten, Achse je Teil,
   Achsen-Koordinate, Wärme für runde Teile; Laufzeit unter 50 ms nach dem Loslassen (07, 14c).
5. **Physik:** Weg B nach Probe P1: Box2D 3.2 über `box2d3-wasm` 6.0 (`compat`, einfädig) hinter einer schmalen Schnittstelle `welt` in
   unseren Begriffen (rund 25 Funktionen), eigene XPBD-Schicht für die Figur. Rad dynamisch (Scharnier, Lagerreibung als Motor mit
   Tempo 0, Trägheit aus dem Regler Radgewicht), Finger als kinematischer Körper mit Motor-Gelenk (Feder 4 Hz, Dämpfung 1, Höchstkraft),
   Vortrieb als Kräftepaar, Haltungen über Gelenkziele zwischen festen Teilen, Hüllen nie je Takt umformen (14a §8).
6. **Takt und Wiederholbarkeit:** ein fester Takt von 60 Hz mit je vier Teilschritten für Welt, Figur, Logik und Übergänge;
   Darstellung zwischen zwei Takten gemischt; Zeitkappung 0,25 s, höchstens fünf Takte je Bild; Zeitlupe nur über das Takt-Tempo;
   Zufall mit Saat und getrennten Strömen (nie `Math.random`); gemeinsamer Schlüsselstand alle 16 Takte, Prüfsumme aus drei Teilen;
   eigene Winkelfunktionen im Simulationspfad, sobald Aufnahmen über Geräte hinweg gleich sein müssen (09, 14a, 14b).
7. **Federmodell:** innen ein System zweiter Ordnung mit Frequenz f, Dämpfungsverhältnis ζ und Vorgriff r (08 §2.5); dieselben Maße
   nutzt Box2D für weiche Bedingungen. In der Bedienung Dauer d und Federung b; nach Apples Definition (WWDC 2023) gilt f = 1/d und
   ζ = 1 − b (eigene Umrechnung, beim Bau zu prüfen). Vorgriff, Schwerkraft-Anteil, Wind und Grenzen unter „Mehr“.
8. **Renderer:** WebGL2, Stufe 1 aus 10 §8.5 (Rahmen je Figur, feste Stückzahl beim Abflachen nach der Formel von Wang, Reichweite je
   Flächenpaar, Verschmelz- und Ebenenmodell als Daten, Spitzenregel und Gefälle-Korrektur, mehrere Feldsätze); halbe Feldauflösung
   nur nach Vorher-Nachher-Bild; Kachel-Durchgang als Reserve; WebGPU später; Kontextverlust behandeln; alle Shader beim Laden
   übersetzen; `preserveDrawingBuffer` im Spiel aus; unter 100 WebGL-Aufrufe je Bild (14c §9).
9. **Tempo:** Budget festschreiben (Hauptthread ≤ 6 ms, Grafik ≤ 8 ms auf dem kalten iPhone 16, GPU-Speicher ≤ 150 MB, erstes Bild
   ≤ 2 s); PCHIP-Steigungen nur bei Änderung der Schlüssel rechnen, keine Würfe für die Speicherbereinigung im Bildtakt; bis zur Messung
   mit der Umrechnungsregel aus 14c §6.4 arbeiten (Prozessor mal 1, Grafik mal 4) und am Mac in Safari messen, nicht in Chrome.
10. **Zustand und Format:** eigener Store mit Datensatz-Diffs, eine Geste ist ein Schritt, die Auswahl reist mit, Abgeleitetes kommt
    nicht in den Verlauf, Änderungen einer KI-Sitzung nicht in Florians Rückgängig; JSON nach 3.8; Speichern über den Dev-Server mit
    Revision, Live-Meldung bei fremden Änderungen und einem Journal in IndexedDB (11 §4 bis §6).
11. **Oberfläche:** heiße Flächen in eigenem Code, kühle mit React 19.3 und Compiler (Preact als Alternative), Zag für Bedienelemente,
    ein Befehlsregister für Tasten (`key` mit `code` als Rückfall wegen QWERTZ), Menüs, Befehlssuche und Hilfe (11 §3, §10).
12. **Tests:** vitest für Format, Migrationen, Store und Laufzeit; fast-check für „kein Sprung“, „kein Verklumpen“, „Rückgängig ist
    exakt“; Hash je Takt für Determinismus; Bildvergleich an Ausschnitten in Chromium und WebKit, echtes Safari über WebDriverIO;
    Playwright mit gesteuerter Uhr. Kein Test ersetzt Florians Auge (11 §11).
13. **Ton:** Web Audio in der eigenen Laufzeit; Sitzung „ambient“ wie im Hauptspiel; Start mit einem Tippen, damit Safari den Ton beim
    ersten Loslassen freigibt; Wachhund, der prüft, ob die Audio-Uhr läuft; Musik in Phrasen; Klang als Chip; Haptik zuerst über
    `@capacitor/haptics`, später über eine kleine eigene Erweiterung mit Core Haptics (14d §9).
14. **Export:** zuerst Bildfolgen und Sprite-Sheets aus derselben Laufzeit (sehen exakt aus); Vektor-Export (SVG, Lottie) nur mit
    gebackener Kontur und nur als Notausgang (10 §8.5, Abschnitt 3.6).

### 4.4 Eine Rechenkette für Editor und Spiel

Die Berichte nennen sechs Reihenfolgen (01 §5.4, 03 §11.2, 04 §7.10, 05 §5.12, 06 §8, 07 Schritt 7, dazu 08 §9.3 und 14b §7.6). Sie
lassen sich zu einer Kette zusammenführen. Zwei Punkte sind dabei bewusst entschieden: Die Physik der Knochen und Regler läuft **vor**
den Korrekturformen (sonst löst ein schwingender Schwanz seine Korrektur nicht aus; Abschnitt 4.6, Punkt 11), und nach dem Skinning
gibt es nur flüchtige Schritte, die nie gespeichert werden (Punkt 10).

```
Je Takt n (fest 1/60 s; Zeitlupe ändert nur, wie schnell Takte aufeinander folgen)
 1  Eingabe lesen und mit Taktnummer protokollieren (Finger am Rad, Tippen, Prüfstand)              14b §7.6
 2  Postfach aus Takt n−1 (Physik, Übergänge, Zonen, Zähler, Uhr, Spieler) und Messwerte lesen       14b §7.6
 3  Drähte: Messwert → Kennlinie → Glätten → Regler                                                 14b §7.3
 4  Regelkarten gegen denselben Stand prüfen; je Kanal auflösen (Band, dann Listenplatz);
    Ziele übergeben; Einmal-Aktionen (Ton, Effekt, Zähler); Folgen ins Postfach für n+1              14b §7.4–7.6
 5  Posen und Übergänge fortschreiben, Schichten zusammensetzen (Maske, ersetzen oder addieren)
    → Sollwerte der Regler und Knochen; Trägheits-Übergang beim Wechsel                              05 §5.12
 6  Welt: Box2D, 4 Teilschritte (Fingerkörper, Federbeine am Rad, Kräftepaar, Gelenkziele)           14a §6.1
 7  Figur: XPBD, 4 Teilschritte, auf dem Ergebnis der Welt: Federn auf Knochen und Reglern
    (Ohren, Bart, Schwanz, Stauchung); Spannung je Teil                                               08 §9.3, 14a §3e
 8  Prüfsumme aus Welt, Figur, Logik; alle 16 Takte ein gemeinsamer Schlüsselstand                    14a §6.1

Je Bild (Stand zwischen den letzten beiden Takten gemischt)
 9  Ansichts-Morph je Teil aus den Ansichtsreglern: Rahmen + Rest, periodisch, Falten als Ereignisse  06 §2.6, §8
10  Gelenke reiten auf der gemorphten Elternform (starre MLS) → Ruhelage der Knochen in dieser Ansicht 07 Schritt 7
11  Im Ruheraum: Formziele, Posen-Deltas, Korrekturformen an den physikalisch bewegten Winkeln und
    Reglern, Kreuzschlüssel, Übergangsformen; Zusätze über einer Ansichtsachse im mitlaufenden Rahmen  03 §11.2, 04 §7.4, 06 §6
12  Skinning: starre Teile, Biegeachsen, Drehzentren; Griffe erben oder Gewichtssatz je Griffpaar      06 §4, 07 Schritt 6
13  Flüchtig, in Ruhe null, nie gespeichert: Formabgleich-Wackeln, freigegebene Effekte; Glätte-Schutz 06 §7, 08 §3
14  Wächter: Sehnenumkehr, Schlaufe, Selbstschnitt → nur Marken im Editor                             06 §3
15  Abflachen mit fester Stückzahl → Felder im Rahmen jeder Figur → ein Bilddurchgang mit Effekten    10 §8.2, 14c
```

**Hinweise:** Die Schritte 9 bis 12 sind reine Funktionen der Regler und Knochen. Wo die Figurphysik in Schritt 7 die Lage eines Gelenks
braucht (Wurzel der Schwanzkette), wird Schritt 10 im Takt mitgerechnet; das ist billig. Beim Formen rechnet der Editor jeden Zug durch
Schritt 12 zurück in den Ruheraum (03 §10.2); die flüchtige Schicht aus Schritt 13 ist dabei angehalten, damit ein Wackeln nie in eine
Form gespeichert wird.

### 4.5 Begriffe (Vorschlag; Florian entscheidet)

Die Berichte benutzen dieselben Wörter für Verschiedenes: „Ebene“ (Platz in der Malreihenfolge in 01 und 10, Animationsschicht in 05 und
13), „Ablauf“ (Animation in 01 und 04, gestalteter Übergang im Prototyp und in 05), „Karte“ (Posenkarte in 12, Posenplan in 05,
Regelkarte in 14b), „Tempo“ (Federmaß in 05 und 08, Ozzys Geschwindigkeit in 08, 13 und 14b) und „Federung“ (Abschnitt 4.6, Punkt 7).
Vorschlag für eine eindeutige Sprache:

| Begriff | Bedeutung | ersetzt oder vermeidet |
|---|---|---|
| Form, Anker, Griff | geschlossener Pfad aus Ankern und Bézier-Griffen; Ankerart glatt oder Ecke | „Anhang“, „Mesh“ |
| Regler | benannter Wert mit Bereich, an dem Schlüsselformen hängen; als Leiste (eine Achse), Feld (zwei Achsen) oder Kreisregler | „Parameter“, „Slider“, „Joystick“ |
| Schlüssel, Schlüsselform | Gestalt einer Form an einer Stelle eines Reglers; Herkunft sichtbar: Vorlage, gebaut, seins, Falte, Wechsel | „Keyform“, „Verformungsschlüssel“ |
| Korrekturform, Kreuzschlüssel | Schlüsselform an einem Gelenkwinkel; Korrektur für das Zusammenwirken zweier Regler | „Smart Bone“, „Kombinationsform“ |
| Pose, Grundform | benannter Stand der Regler und Knochen, auch nur für einen Teil der Figur; die Grundform ist die erste Pose | „Setup-Pose“; „Haltung“ bleibt für Posen der Schicht Körper |
| Übergang | Wechsel von einer Pose in eine andere: Standardübergang (Feder) oder gestalteter Übergang (Taktleiste mit Zwischenposen) | „Weg“ (05), „Mix“, „Ablauf“ im Sinn des Prototyps |
| Zyklus | Kreisregler, den Zeit oder Weg vorschiebt (Gang, Schütteln, Atmen) | „Ablauf“ im Sinn von 01 und 04 |
| Verweilen | was eine Pose tut, solange sie gilt (die Diagonale der Tafel) | – |
| Tafel, Posenkarte, Posenplan | Übersicht „von × nach“; Vorschaubild einer Pose; frei angeordnete Posen mit Ausnahmen als Pfeilen | „Matrix“, „Karte“ |
| Schicht | Animationsschicht mit Maske (Körper, Kopf und Blick, Gesicht, Physik) | „Ebene“ in diesem Sinn, „Track“ |
| Ebene | Platz in der Malreihenfolge (passt zu den Ebenen im Paint-Modus) | „Slot“ |
| Wechsel | Schlüsselart für Sichtbarkeit, Reihenfolge oder Teiletausch, mit einer Breite (0 = hart) | „Switch“, „Teilewechsel“ |
| Biegeachse | Bézier-Achse eines länglichen Teils, die ihre Länge behält | „Rückgrat“, „Bahn“ |
| Feder: Dauer, Federung | Zeitsprache der Bedienung; innen Frequenz, Dämpfungsverhältnis, Vorgriff | „Tempo“ und „Stärke“ als Federmaße |
| Tempo | nur Ozzys Geschwindigkeit, ein Spielwert | Tempo als Federmaß |
| Spannung | wie fest ein Teil seiner Zielpose folgt (0 schlaff, 100 % exakt) | – |
| Linse, Chip | Sicht, die festlegt, was greifbar ist; angehängtes Verhalten, Effekt oder Klang mit zwei Reglern | „Modus“, „Constraint“, „Behavior“ |
| Baustein, Draht, Regel | fertiges Verhalten; stetige Kopplung; Satz am Ding („Sobald“, „Solange“, „Laune“) | „Behavior“, „Binding“, „Event“; „Karte“ als Logikwort |
| Band, Kanal | Vorrang (Körper, Regie, Spieler, Laune, Grund); die Stelle, um die gestritten wird | Prioritätszahlen |
| Marke, Fühler, Zone | Ereignis an einer Stelle eines Übergangs; Messstelle; Bereich für die Logik | „Event“, „Sensor“, „Bounding Box“ |
| Prüfstand, Prüfer | Testszene im Editor; Liste der Hinweise mit „Zeigen“ | – |
| Bremskraft, Haftung, Stehzone, Kippzeit, Radgewicht, Lagerreibung | Größen des Spiels (08, 13, 14a) | – |

### 4.6 Widersprüche zwischen den Berichten und ihre Auflösung

**Unstrittig in allen Berichten** (14a §1, eigene Durchsicht): eigener Editor statt fertigem Werkzeug; dieselben Anker in allen
Schlüsselformen; Regler als gemeinsamer Baustein; Übergänge im Reglerraum; Formänderungen vor den Knochen gespeichert; Griffe erben
standardmäßig; Figurphysik als eigene XPBD-Schicht; ein fester Takt mit gemischter Darstellung; „Aufnehmen“ backt Physik in
Schlüssel, die Florian nachformt; Abstandsfeld-Renderer; eine Laufzeit für Editor und Spiel; Florians Auge entscheidet.

Die 32 Punkte folgen der Liste der Widersprüche aus der Gegenprüfung der Berichte; Punkt 28 ist um drei Wortkonflikte ergänzt, die
dort fehlen. „Stand“ sagt, ob ein Nachtrag entschieden hat, ob dieser Bericht eine Empfehlung gibt, oder ob eine Probe oder Florian
entscheidet.

1. **Physik-Löser.** *Widerspruch:* 08 §8.1 will einen eigenen XPBD-Kern für Figur und Demo-Welt, Box2D erst später; 09 §5.1 und §8
   nehmen Box2D 3.2 sofort für die Welt; 11 folgt 09, 13 dem Modell aus 08. *Auflösung:* Weg B: Box2D rechnet Rad, Körperbrocken, Sturz
   und lose Dinge, die eigene XPBD-Schicht Nachschwingen, Bohne und Spritzer. XPBD verliert bei Ruhe und Reibung echter Kontakte, gewinnt
   bei Federn auf Florians Formen. *Stand:* entschieden in 14a, freigegeben erst nach Probe P1; Rückfälle Rapier, dann B′, zuletzt A.

2. **Rad.** *Widerspruch:* 09 macht das Rad kinematisch mit Zielwinkel, koppelt in einer Richtung und prüft den dynamischen Fall nicht;
   08 und 13 wollen Trägheit, Lagerreibung, Schwung nach dem Loslassen und spürbare Rückwirkung (Regler „Radgewicht“). *Auflösung:*
   dynamisches Rad an einem Scharnier, Lagerreibung als Motor mit Tempo 0 und Höchstmoment, Trägheit aus dem Radgewicht; „kinematisch“
   ist nur der äußerste Reglerwert („Boden“). Ozzys Vortrieb als Kräftepaar (auf Ozzy und gegengleich am Fußpunkt aufs Rad), weil das
   Mover-Gelenk von Box2D keine Rückwirkung kennt. *Stand:* entschieden in 14a; P1 prüft Halten, Rückwirkung (Drehimpulsbilanz innerhalb
   von 2 %) und Auslauf (K1 bis K3).

3. **Kollision der Welt.** *Widerspruch:* 08, 10 und 13 lassen Rad und Hindernisse am Abstandsfeld der gezeichneten Form kollidieren,
   09 §5.6 schlägt eigene Hüllen vor. *Auflösung:* „Eine Quelle, drei Ableitungen“: Der gezeichnete Weltpfad wird beim Bearbeiten einmal
   abgeflacht; daraus entstehen die Kette und gerundete Polygone für Box2D (Verschmelz-Rundungen eingebacken), das Abstandsfeld in
   TypeScript für Fühler, Fußnormalen und Teilchen und die Strecken des Renderers. Ozzys Hüllen sind feste Teile (Brust, Becken, Kopf);
   Haltungen entstehen über Gelenkziele, nie durch Umformen je Takt. *Stand:* entschieden in 14a; Kriterium K9: Zeichnung und Kette
   liegen höchstens 0,5 Bildpunkte auseinander.

4. **Takt.** *Widerspruch:* 02 feste 1/60 s mit höchstens fünf Nachholschritten; 04 etwa 120 Hz; 08 Teilschritte von 1/240 s; 09 60 Hz
   mit vier Unterschritten; 05 löst Federn je Bild mit der Bildzeit (nicht wiederholbar); zur Bildrate 09 „Mac bis 120 Hz“ gegen 11
   „Safari zeichnet nahe 60 Hz“. *Auflösung:* ein fester Takt von 60 Hz mit vier Teilschritten (die 1/240 s aus 08 sind dieselbe
   Teilschrittlänge), höchstens fünf Takte je Bild, Darstellung gemischt. Auch die Federn der Übergänge und die Logik laufen im Takt,
   sonst ist nichts wiederholbar; geschlossene Federlösungen (05) bleiben nützlich für die Spur der Zukunft (14c). Beide Aussagen zur
   Bildrate stimmen: Der Bildschirm des Mac zeigt 120 Hz, Safari und WKWebView zeichnen Canvas nahe 60 Hz, Chrome mit 120 Hz; 60 Hz ist
   die Referenz. 120 Hz mit zwei Teilschritten nur, wenn das Rad am Mac träge wirkt. *Stand:* entschieden in 14a und 14b; die Messseite
   zählt den Takt (auch 30 Hz im Stromsparmodus, 14c).

5. **Federn auf einzelnen Ankern.** *Widerspruch:* 08 „Anker nie einzeln simulieren, freie Anker nie im Gesicht“; 02 Empf. 10 und 09 §8
   „Federn auf Ankern, Punkten und Griffen“. *Auflösung:* Standard sind Federn auf Reglern (Pendel zwischen gezeichneten Schlüsselformen
   für Ohren, Bart, Wangen) und auf Knochenketten (Schwanz). Freies Wackeln einer Fläche nur über Formabgleich auf wenigen
   Kontrollpunkten mit einem glatten Feld, das Anker und beide Griffe gleich bewegt, und mit der animierten Pose als Ruheform. Federn auf
   einzelnen Ankern nur als ausdrücklicher Chip „Gelee“ für Dinge, die wabbelig sein sollen, nie an Ozzys Gesicht. So bleibt Ozzy in
   Ruhe exakt das Logo. *Stand:* Empfehlung dieses Berichts (folgt 08).

6. **Feder-Parameter.** *Widerspruch:* 01 und 06 übernehmen Spines Satz (Trägheit, Stärke, Masse, Dämpfung, Wind, Schwerkraft), 04
   Live2Ds vier Werte je Glied, 12 legt Spines Werte unter „Mehr“; 08 lehnt beide Sätze als gekoppelt ab. *Auflösung:* innen ein Modell
   mit Frequenz, Dämpfungsverhältnis und Vorgriff (08), weil sich nur diese Werte nicht gegenseitig verstellen und Box2D dieselben Maße
   nutzt; die unabhängigen Zusätze aus Spines Satz (Schwerkraft-Anteil, Wind, Grenze, Mischung) bleiben als Expertenwerte unter „Mehr“;
   das gekoppelte Paar Stärke und Masse entfällt. *Stand:* Empfehlung dieses Berichts.

7. **Federsprache der Oberfläche.** *Widerspruch:* „Federung“ ist in 05 die Dämpfung (100 % = kein Überschwingen), in 12 das Wippen
   (0 = kein Überschwingen); „Tempo“ ist in 05 eine Halbwertszeit, in 08 die Frequenz; 12 sagt „Dauer“, 09 „Frequenz und Dämpfung“.
   *Auflösung:* in der Bedienung **Dauer** und **Federung** wie bei Apple (2023): Federung 0 % = kein Überschwingen, mehr Federung = mehr
   Wippen; innen f = 1/Dauer und ζ = 1 − Federung (eigene Umrechnung). „Tempo“ ist nie ein Federmaß, weil es überall sonst Ozzys
   Geschwindigkeit meint. Die Skala aus 05 wird umgedreht. *Stand:* Empfehlung dieses Berichts; die Wörter entscheidet Florian.

8. **Mischen zwischen Schlüsselformen.** *Widerspruch:* 01, 02, 03 und 04 wollen PCHIP je Ankerkoordinate mit polaren Griffen und der
   100°-Ausnahme behalten (02 dazu einen Schalter „starr“); 06 nennt PCHIP auf x und y drehender Punkte falsch und macht „Rahmen + Rest“
   zum Standard. *Auflösung:* 06 hat in der Sache recht (bei wenigen Schlüsseln wird eine drehende Form in der Mitte schmal), die anderen
   in der Praxis (Florians dichte Schlüssel sehen heute richtig aus). „Rahmen + Rest“ ist keine Abkehr von PCHIP, sondern PCHIP auf
   besseren Größen; der Schalter „starr“ aus 02 ist darin der Rahmen. Standard für neue Formen und Regler; Florians Kopfdrehung bleibt,
   bis ein Vergleichsbild und sein Wort anders entscheiden. *Stand:* Empfehlung dieses Berichts; Probe S3 in 4.7.

9. **Bezugsrahmen der Formversätze.** *Widerspruch:* 03 und 06 speichern im Ruheraum vor dem Skinning, 01 im Raum des Knochens je
   Einfluss, 07 im Knochen- oder Achsenraum (längs und quer), 04 im mitlaufenden Rahmen der aktuellen Form; 07 lässt Gelenke je Bild auf
   der gemorphten Elternform reiten, 06 rechnet Drehzentren und Bindung einmal für die Ruheform vor. *Auflösung:* Die vier Angaben sind
   Schichten desselben Gedankens. Gespeicherte Formänderungen liegen vor dem Skinning im Raum ihres Knochens (bei mehreren Einflüssen je
   Einfluss wie Spine, bei Biegeachsen längs und quer zur Achse); für ein starres Teil sind Ruheraum und Knochenraum dasselbe. Der
   mitlaufende Rahmen aus 04 gilt für Zusätze über einer Ansichtsachse (Maul und Augen über der Kopfdrehung). Gelenke reiten auf der
   gemorphten Elternform (07). Gewichte gelten je Anker in allen Ansichten, weil alle Schlüssel dieselben Anker haben; Drehzentren werden
   je Ansichtsschlüssel vorgerechnet und mitgemischt (eigene Einschätzung). Bei Ozzy betrifft das wenige Teile, weil Kopf und Gesicht
   starr sind. *Stand:* Empfehlung dieses Berichts; die Probe „Ohrgelenke wandern bei der Kopfdrehung mit“ (07 §9) zeigt, ob es trägt.

10. **Formänderung nach dem Skinning.** *Widerspruch:* 03 „keine Formänderung nach Schritt 3“; 06, 07, 08 und 10 setzen Formabgleich,
    Wächter, Glätte-Reparatur, Squash and Stretch oder Zeitversatz dahinter. *Auflösung:* 03s Regel gilt für alles, was gespeichert
    wird. Nach dem Skinning sind nur flüchtige Schritte erlaubt, die in Ruhe null sind und nie in eine Form geschrieben werden:
    Formabgleich-Wackeln (zieht immer zur animierten Form zurück), Glätte-Schutz (dreht nur Griffe), Wächter (melden nur). Squash and
    Stretch und Zeitversatz fallen zusätzlich unter Punkt 19. Beim Formen ist die flüchtige Schicht angehalten. *Stand:* Empfehlung
    dieses Berichts.

11. **Physik vor oder nach den Korrekturformen.** *Widerspruch:* 06 §7 sagt „Knochenphysik vor dem Skinning und vor den Korrekturen“,
    die Kette in 06 §8 setzt die Korrekturen aber vor die Knochenphysik; dann löst ein schwingender Schwanz seine Korrektur nicht aus,
    was 03 §11.10 (Probe 3) und 01 §5.4 voraussetzen. *Auflösung:* Physik der Knochen und Regler zuerst, dann die Korrekturformen an den
    physikalisch bewegten Winkeln (Kette in 4.4, Schritte 7 und 11). 06 §8 ist an dieser Stelle zu tauschen. *Stand:* Empfehlung dieses
    Berichts; Probe „Feder treibt Korrektur“ (03).

12. **Griff-Gewichte, fünf Regeln.** *Widerspruch:* 01, 02, 03, 06 und 07 nennen verschiedene Regeln. *Auflösung:* eine Regel
    (Abschnitt 3.3): erben; Abweichung am glatten Anker als ein Gewichtssatz je Griffpaar (03), an der Ecke je Griff; Glätte-Schutz (06)
    nur, wo eine Stufe die Bedingung verletzt; Vorschlagswerte aus dem Kurvenpunkt (06, 07); Längen-Gewicht (01) als Sonderfall; der
    Schalter „Griffe eigen“ (02) wird zum Schloss am Anker. *Stand:* Empfehlung dieses Berichts; Probe „Griffgewicht“ (03 Probe 4, 06
    Probe 4).

13. **Skinning-Standard.** *Widerspruch:* 03 lineares Mischen plus Korrekturformen, 06 optimierte Drehzentren, 07 Biegeachsen ohne
    Gewichte. *Auflösung:* je Teilart: starre Teile ohne Mischung, längliche Teile als Biegeachse, gewichtete Teile mit mehreren Knochen
    über Drehzentren, lineares Mischen als Schalter; Korrekturformen gibt es in allen Fällen. *Stand:* Empfehlung dieses Berichts; am Hals
    und an der Bohne entscheidet Florian zwischen zwei Videos (03 Probe 5, 06 Probe 3).

14. **Gewichte im Autorig und ihre Bearbeitung.** *Widerspruch:* 01 BBW, 02 nach Nähe wie Rive, 06 Wärme, 07 Achsen-Koordinate, 03 ein
    Regler je Gelenk; bearbeitet wird mit Pinsel (02, 06), durch Ziehen am Anker (03) oder mit Pinsel nur als verstecktem Werkzeug (07).
    *Auflösung:* Achsen-Koordinate für längliche Teile mit dem Regler „hart ↔ weich“ je Gelenk (03, 07), Wärme für runde Teile mit
    mehreren Knochen, BBW nur bei sichtbarem Bedarf, Nähe nur innerhalb eines Teils. Bearbeitet wird zuerst durch Ziehen am Anker und am
    Gelenkring; der Pinsel ist da, aber als Fachwerkzeug. *Stand:* Empfehlung dieses Berichts.

15. **Glieder.** *Widerspruch:* Beine als zwei Knochen plus Bahn (01), starr an einem Knochen (03), Biegeachse (07, 08), Zwei-Knochen-
    Lösung an Strahl-Fußpunkten (09); Ohren als Pendel auf Reglern (04, 08), Biegeachse mit Federkette (07) oder gewichtete Knochen (03,
    06); Rumpf als Kette (01), Biegeachse (07), zwei Körperbrocken (08) oder eine Kapsel (09). *Auflösung:* Zeichenmodell und
    Physikmodell trennen. Zeichnung: Beine als Biegeachse von der Hüfte zur Pfote (sie ist zugleich die IK; ein Knie nur, wenn eine
    Vorlage es verlangt); Ohren als gezeichnete Schlüsselformen an einem Regler, den ein Pendel treibt, ohne Schlüsselformen als
    Biegeachse mit Federkette; Schwanz als Biegeachse mit Federkette; Rumpf als Biegeachse mit zwei Abschnitten oder über den Regler
    „Stauchung“. Physik: Brust, Becken und Kopf als Körper mit Motor-Gelenken, vier Federbeine aus Strahlabfragen (14a); die Kapsel aus
    09 ist damit ersetzt. *Stand:* Empfehlung dieses Berichts, gestützt auf 07, 08 und 14a.

16. **Gang: Phase oder Planer.** *Widerspruch:* 04, 05 und 13 lassen einen gezeichneten Zyklus über einen Kreisregler „Schritt“ laufen,
    den das Spiel nach dem Weg vorschiebt; 08 setzt die Pfoten mit einem Schrittplaner (Takt, Abstand oder Kipppunkt, Raibert-Zielpunkt,
    Standpfoten fest in Radkoordinaten). *Auflösung:* Der Planer bestimmt die Kontakte (wann und wo eine Pfote aufsetzt; Standpfoten
    rutschen nie), der Zyklus das Aussehen zwischen den Kontakten. Im gewöhnlichen Gang fällt beides zusammen: Der Planer löst Schritte im
    Takt der Fußfolge aus, die Phase läuft nach dem Weg, und bei jedem geplanten Aufsetzen wird die Phase auf die gezeichnete Kontaktstelle
    gezogen (Phasenabgleich wie in 05 §5.5). Nur Notschritte und Hindernisse lassen den Planer abweichen; danach fängt sich die Phase
    wieder. *Stand:* Empfehlung dieses Berichts; Probe in der Spielwiese (08 Etappen 2 und 3, „Pfoten rutschen nie“).

17. **Übergänge und Logik als Graph.** *Widerspruch:* 02 (Übergangsgraph wie Rive) und 08 (Absicht als Zustandsautomat) gegen 01, 05,
    12 und 13 (kein Graph als Hauptansicht). *Auflösung:* ein Modell „Bausteine, Drähte, Karten“; der Zustandsautomat aus 08 lebt im
    Baustein „Vierbeiner“ und ist als Zustandskarte zu sehen, aber nicht zu bauen; Posenübergänge als „Standard plus Ausnahmen“ mit Tafel.
    Rives Begriffe gehen darin auf: Exit Time wird „Unterbrechen am nächsten Halt“, Zufallsgewichte werden Varianten mit Gewicht, Any
    State ist der Standardübergang. *Stand:* entschieden in 14b.

18. **Modi.** *Widerspruch:* 02 Empf. 16 will zwei Modi „Formen“ und „Bewegen“, 07 §5 setzt einen „Bewegen-Modus“ voraus; 01 und 12
    wollen keinen globalen Modus. *Auflösung:* aktive Stelle ohne Modus (12), weil sie Florians Grundidee („In einer Pose arbeiten alle
    Werkzeuge wie in der Basis“) und seiner heutigen Arbeitsweise im Werkzeug folgt; der Autorig startet über den Knopf „Knochen
    vorschlagen“. Ehrlich: eine Wette gegen Rives Erfahrung. *Stand:* Empfehlung dieses Berichts; die Bedienprobe (12 §9) entscheidet, bei
    Misserfolg folgt die Gegenprobe mit zwei Modi.

19. **Effekte auf Ozzys Körper.** *Widerspruch:* 10 §9 setzt Squash and Stretch (Velocity Skinning), Schmierbild und Aufprallbild auf
    Stufe A „gleich einbauen“, obwohl 10 §1.2 Florians Regel zitiert, nur die Beinschattierung in Bewegung dürfe aus dem Shader kommen;
    13 erlaubt Körper-Effekte nur auf sein Wort; 03 und 08 machen Stauchen zu einer gezeichneten Schlüsselform an einem Physik-Regler.
    *Auflösung:* Auf Ozzy kommt nur, was Florian zeichnet, und die erlaubte Beinschattierung. Stauchen ist ein Regler „Stauchung“ zwischen
    seinen gezeichneten Formen, getrieben von einer Feder (08 §3.5, „erste Wahl“). Velocity Skinning, Schmierbilder, Mehrfachbilder und das
    Aufprallbild werden als Effekte gebaut, sind aber standardmäßig aus und kommen nur auf sein Wort auf die Figur. Stufe A aus 10
    enthält damit: Verschmelzen, Dickenregel, Linien mit Breitenprofil, Kantenglättung, Kontaktschatten, Dithering gegen Stufen. Effekte um
    Ozzy herum (Staub, Tropfen, Schatten) sind frei. *Stand:* Empfehlung dieses Berichts; Florian entscheidet je Effekt.

20. **Szene gegen Renderer.** *Widerspruch:* 13 verlangt Weltpfad, Pfützen, Spritzer, Tropfen auf der Kamera und weitere Figuren; 10
    hält Felder über den ganzen Bildschirm für zu teuer, ein Feldsatz fasst 24 Flächen, und das Budget von 8 ms war nicht durchgerechnet.
    *Auflösung:* 14c hat gerechnet: Die Szene passt in 8 ms nur mit vier Maßnahmen (Rahmen je Figur, halbe Feldauflösung, Welt gebacken
    oder analytisch, Tropfen analytisch), 3,4 bis 8,2 ms auf dem kalten Gerät; der obere Rand ist knapp, der Kachel-Durchgang bleibt
    Reserve. Je Figur ein eigener Feldsatz; Brechung der Kameratropfen nur auf Florians Wunsch. Die Katze gehört zum „Soll“, nicht zum
    „Muss“ der Demo (13 §10.11). *Stand:* geklärt in 14c, zu bestätigen mit der Messseite.

21. **Malreihenfolge bei der Kopfdrehung.** *Widerspruch:* 01 und 10 wollen Wechsel weich überblenden, 04 macht sie zur Schlüsselart
    „Wechsel“ an einer festen Stelle (heute verborgen bei 180°). *Auflösung:* beides in einem: Schlüsselart „Wechsel“ an einer Stelle, die
    Florian setzt, mit einer Breite (0 = harter Wechsel, sonst Überblendung über den Renderer). Standard ist der harte Wechsel an einer
    verdeckten Stelle wie heute; weich nur, wo ein harter Wechsel sichtbar wäre. *Stand:* Empfehlung dieses Berichts; sein Auge entscheidet
    (01 Frage 10).

22. **Sprung.** *Widerspruch:* 08 rechnet je Sprung eine eigene Schwerkraft g = 2h/t² und schnelleres Fallen nach dem Scheitel; 13 hat
    eine Schwerkraft je Welt, die Kippzeit, Sprunghöhe und Flugdauer zugleich bestimmt, und verlangt echte Bahnen. *Auflösung:* eine
    Schwerkraft je Welt (13), weil Box2D eine Welt mit einer Schwerkraft rechnet, die Kippzeit des Rads an derselben Größe hängt und der
    Spieler Bahnen lernen muss. Florian stellt die Sprunghöhe ein; Absprungtempo und Flugdauer folgen. Soll ein Sprung knackiger wirken,
    helfen Posen (Ausholen, Landung) und die Zeit (kurze Zeitlupe), keine eigene Schwerkraft. *Stand:* Empfehlung dieses Berichts; Florian
    entscheidet am Prüfstand.

23. **Stehzone.** *Widerspruch:* 08 a_max = 0,15 g (etwa ±8,5°), 13 0,3 g (±17°) im Garten und 0,25 g (±14°) im Park. *Auflösung:* Die
    Stehzone ist ein Regler je Welt („Haftung“ oder „Standfestigkeit“), kein fester Wert. Für die Demo mit den großzügigen Werten aus 13
    beginnen (Lernbarkeit, Lehre aus TumbleSeed) und früh mit Nicole testen; 08s Wert bleibt die realistische Einstellung. P1 rechnet mit
    0,3 g. *Stand:* entscheidet Florian (13 Frage 7).

24. **Eigensinn.** *Widerspruch:* 05 §6 lässt Launen nur auf ebenen Stücken zu, 13 §6.1 gerade an Erhöhungen, weil Florian dort
    besonderes Balancieren will. *Auflösung:* Launen überall, auch an Erhöhungen, aber fair: Ankündigung etwa eine Sekunde vorher am
    Körper, Beginn nur mit Vorlauf vor dem nächsten Ding, nie zwei zugleich, Ruhezeiten (13 §6.1, 14b §7.4). Die Ortsregel aus 05
    entfällt. *Stand:* entschieden in 13 und 14b.

25. **iPad-Eingabe.** *Widerspruch:* 11 §9.2 „Der Finger ändert nie Inhalt, solange ein Stift im Spiel ist“, Modifikatoren als Tasten am
    Rand; 12 §6.8 „Ändern: Ziehen (Stift genau, Finger grob)“ und „Einrasten: zweiter Finger auf die Bühne“. *Auflösung:* Sobald in einer
    Sitzung ein Stift erkannt ist, formt nur der Stift; der Finger bewegt die Ansicht und bedient Leisten und Knöpfe. Ein zweiter Finger,
    der während eines Stiftzugs aufgesetzt wird, ändert keinen Inhalt, sondern wirkt als Abwandler (Einrasten); das verträgt sich mit 11.
    Ohne Stift (iPhone, iPad ohne Pencil) formt der Finger grob. *Stand:* Empfehlung dieses Berichts; Technikprobe auf dem iPad (12 §9).

26. **Spielen im Editor.** *Widerspruch:* 12 §6.12 „Anfassen eines Griffs hält das Spiel an“; in 13 §4.3 ist im Spiel jedes Anfassen,
    auch auf Ozzy, das Ziehen des Rads. *Auflösung:* Im Spiel gehört jede Berührung dem Spiel, sonst prüft Florian im Editor eine andere
    Steuerung als auf dem iPhone. Zum Formen hält man an: Leertaste oder ▶, auf dem iPad auch mit dem Stift (Stift auf der Bühne:
    anhalten und formen; Finger: Rad). Danach schlägt der Geltungs-Chip die wahrscheinlichste Stelle vor (12 §6.12). *Stand:* Empfehlung
    dieses Berichts; Florian entscheidet (12 Frage 5).

27. **Export.** *Widerspruch:* 02 Empf. 17 nennt einen Lottie-Export billig, weil gleiche Anker gültige Pfadschlüssel ergeben; nach 10
    §7.6 gehen ohne gebackene Kontur Verschmelzen und Dickenregel verloren. *Auflösung:* Beides stimmt: Der Export ist technisch billig,
    sähe aber nicht aus wie das Logo. Deshalb zuerst Bildfolgen und Sprite-Sheets aus derselben Laufzeit; Vektor-Export nur mit gebackener
    Kontur (aus dem Feld nachgezogen oder geometrisch verrundet, Abschnitt 3.6) und nur als Notausgang. *Stand:* Empfehlung dieses
    Berichts; nötig erst, wenn eine Figur außerhalb unserer Laufzeit laufen muss (10 Frage 8).

28. **Begriffe.** *Widerspruch:* „Ebene“ (Malreihenfolge in 01 und 10, Animationsschicht in 05 und 13), „Ablauf“ (Animation in 01,
    gestalteter Weg in 05), „Übergang“ neben „Weg“; dazu drei Wortkonflikte, die der Kritiker nicht nennt: „Karte“ (Posenkarte,
    Posenplan, Regelkarte), „Tempo“ (Federmaß und Ozzys Geschwindigkeit) und „Federung“ (Punkt 7). *Auflösung:* Glossar in Abschnitt
    4.5. *Stand:* Vorschlag; Florian entscheidet die Wörter.

29. **Erste Proben ohne Reihenfolge.** *Widerspruch:* zehn Berichte verlangen je eine eigene Probe „vor dem Bau“, ohne gemeinsame
    Reihenfolge, was sich mit Arbeitsregel 2 nicht verträgt; nebenbei rechnet 07 den Autorig im Worker, während 11 Worker erst bei
    Messbedarf will. *Auflösung:* Eine Messseite ersetzt die fünf Tempo-Proben aus 07 bis 11 (14c §7); die übrigen Proben stehen in einer
    festen Reihenfolge mit vorher festgelegten Kriterien (Abschnitt 4.7). Der Worker für den Autorig ist genau der vorhersehbare
    Messbedarf, den 11 meint: Ein Lauf bis 50 ms passt in kein Bild. Laufzeit und Renderer bleiben im Hauptthread, bis die Messung etwas
    anderes sagt. *Stand:* Empfehlung dieses Berichts, gestützt auf 14c.

30. **Einseitig: kein Aufwand geschätzt.** Die Werkzeugvergleiche in 01 bis 04 und 11 wiegen nur Funktionen; Aufwand und Zeit bis zur
    Demo schätzt keiner, obwohl Florians Wochenlimit und Arbeitsregel 2 den Umfang begrenzen. *Auflösung:* grobe eigene Schätzung in
    Abschnitt 4.7, dazu der Umfang, den die Demo bestimmt. *Stand:* eigene Schätzung mit großer Unsicherheit.

31. **Einseitig: geometrischer Weg nicht geprüft.** 10 §7.1 nennt den Abstandsfeld-Renderer „die einzige Möglichkeit“ mit Verschmelzen
    und Dickenregel, prüft aber nicht die Verrundung über Versatzkurven (paper.js 0.17, Clipper2), die einen vektorgenauen Export und
    dieselbe Kontur für Kollision und Logo-Vergleich liefern würde. *Auflösung:* in Abschnitt 3.6 nachgetragen: als Echtzeit-Renderer
    ungeeignet, als Backen für Export, Kollisionskette und Logo-Vergleich prüfenswert. *Stand:* eigene Einschätzung; eine kleine Probe an
    einer ruhenden Pose.

32. **Quelle.** 05 §2.8 und seine Quellenliste verlinken vimeo.com/36579366 als „Stop Drawing Dead Fish“; nach 12 §12 ist das „Inventing
    on Principle“, und „Stop Drawing Dead Fish“ liegt unter vimeo.com/64895205. *Auflösung:* in Abschnitt 7 berichtigt. *Stand:* in 05
    beim nächsten Überarbeiten anzupassen.

**In den Einzelberichten beim nächsten Überarbeiten anpassen** (damit sie dem Stand der Nachträge und dieses Berichts folgen): 05 §2.8
(Link) und §5.5 (Skala der Federung, Punkt 7) sowie §6 (Launen nur auf ebenen Stücken, Punkt 24); 06 §8 (Physik vor den Korrekturen,
Punkt 11); 08 §8.1 und §9.5 sowie 13 §10.4 (Kontakte der Welt in Box2D, das Abstandsfeld nur für Fühler, Teilchen und Anzeige, wie 14a
§8 Empf. 13 verlangt); 09 §5.1, §6 und §8 (die fünf Änderungen aus 14a: Rad dynamisch, Kräftepaar statt Mover-Gelenk, Federbeine am Rad,
Haltungen über Gelenkziele, Kollision aus einer Quelle); 10 §9 (Stufe A ohne Effekte auf Ozzys Körper, Punkt 19).

### 4.7 Reihenfolge der Proben und Etappen, Aufwand

Arbeitsregel 2 verlangt je Schritt eine vorher festgelegte, sichtbare Probe und ein schonendes Budget. Die Reihenfolge stellt deshalb
die billigen Proben mit großer Wirkung an den Anfang (Messen, Physik-Grundsatz, Form-Kern), dann das Gerüst des Editors, dann die
Spielwiese, dann den Rest. Jede Probe endet mit einem Bild oder einer Aufnahme; „bestanden“ sagt nur Florian.

| Schritt | Inhalt | Probe (vorher festgelegt) | Wer urteilt | Aufwand, Arbeitstage (grob) |
|---|---|---|---|---|
| S1 | Messseite `tempo.html` (14c §7) | zehn Blöcke, Budgets aus 14c §6 als Ampeln; je Gerät rund 15 Minuten, in Safari und in der App | Zahlen; Florian liest die Zusammenfassung | 2 bis 4 (eigene Schätzung) |
| S2 | Probe P1 „Rad mit Gewicht“ (14a §7) | K1 bis K9: Halten, Rückwirkung, Auslauf, Hinsetzen am Hang (V1 gegen V2), Popo-Rutschen, Sturz, Spulen, Tempo, Treue | Florian, über eine Bildschirmaufnahme vom iPhone | 4,5 bis 6 (14a) |
| S3 | Form-Kern im Vergleich (06 §11 Proben 1 und 2; 04 §7.3) | Ohr 120° und Stirnfranse zwischen 52° und 82°: heute gegen „Rahmen + Rest“ in derselben Ansicht; langsame Drehung über die Front mit und ohne periodische Mischung | Florians Auge | 2 bis 4 |
| S4 | Gerüst: Format, Store, allgemeine Leiste mit Schlüsselpunkt (11 §16; 12 §10 Punkt 17 a, b) | einen Griff 100-mal ziehen, ein ⌘Z stellt den Stand davor her; zweimal speichern ergibt dieselben Bytes; eine Änderung durch eine Sitzung erscheint im offenen Editor | Tests und Florian | 6 bis 10 |
| S5 | Posen und Übergänge als Daten (05 §7) | „Hinsetzen mit Hüpfer“: der Plumps sitzt im Bild des Bodenkontakts, zehn schnelle Klicks ohne Sprung; Florian ändert ohne Code eine Dauer, eine Zwischenpose und eine Zusatzbewegung | Florian | 8 bis 14 |
| S6 | Spielwiese D0 (13 §9.7; 08 Etappen 1 bis 3; 14b L0; Welt-Adapter aus 14a; Renderer Stufe 1 aus 10) | 60 Sekunden auf dem iPhone: Ozzy lässt sich oben halten und in Schritt, Trab und Galopp bringen; grobes Rucken bringt ihn zum Stolpern; die Ohren stehen nach dem Schubsen exakt wie gezeichnet; derselbe Hash nach 600 Takten | Florian, Nicole | 30 bis 50 |
| S7 | Bedienprobe „selbsterklärend“ (12 §9) | fünf Aufgaben ohne Erklärung am Mac, dann am iPad; vier von fünf ohne Hilfe; kein unbemerkter Patzer an der aktiven Stelle | Florian, Nicole | 2 bis 3, dazu die Teile, die die Aufgaben brauchen |
| S8 | Knochen und Autorig (07 §9; 03 §11.10; 06 §11 Proben 3 bis 5) | der Autorig ohne Teilnamen trifft `ELTER`, `PARTNER` und die Kopfteile; Probewackeln ohne Lücke und Knick; Korrektur am Gelenk ohne Einschnürung; eine Feder treibt eine Korrektur | Florian | 15 bis 25 |
| S9 | Logik L1 bis L4 und Demo D1 bis D3 (14b §9; 13 §9.7) | Florian baut zwei Karten ohne Hilfe und sagt voraus, was passiert; Nicole schafft eine Runde ohne Erklärung; jede Laune ist an ihrer Ankündigung zu erkennen; eine ganze Runde mit Endkarte | Florian, Nicole | 30 bis 50 |
| S10 | D4 und D5: Park, Winter, Effekte, Ton, Haptik (13; 14d §9) | Vorher-Nachher-Bilder der Effekte in derselben Ansicht; Stumm-Probe; Florian spielt die Demo auf dem iPhone 16 | Florian | 20 bis 30 |

**Aufwand (eigene grobe Schätzung, ohne Messung früherer Bauzeiten):** Bis zur Spielwiese (S1 bis S6) rund 50 bis 90 Arbeitstage, also
grob zweieinhalb bis vier Monate; bis zur Demo mit drei Welten (S1 bis S10) rund 120 bis 200 Arbeitstage, also grob sechs bis neun
Monate (gerechnet mit 21 Arbeitstagen je Monat). Die Unsicherheit ist groß. Der Engpass sind nicht die Zeilen Code, sondern Florians Prüfrunden: Jede Probe braucht sein Auge, und die
Erfahrung der Ozzy-Stränge zeigt mehrere Runden je Schritt. Studio mit allem, was die Berichte vorschlagen (Pencil-Plugin, WebGPU,
Kurven-Ausgleich, ARAP-Mischart, Export, weitere Körperbaupläne), ist deutlich größer.

**Hebel, die den Weg verkürzen, ohne Florians Ziel aufzugeben:**

- **Autorig erst mit der zweiten Figur** (Katze in D4): Bis dahin trägt Ozzys Handrig aus dem Prototyp (`haltung.ts`), und S8 rückt
  hinter S9. Ersparnis vor der ersten Runde: rund drei bis fünf Wochen.
- **iPad zuerst als Safari-Web-App ohne eigene Gesten**, die Bedienprobe am Mac; Stift-Feinheiten nach der Demo.
- **Ton in der Demo zuerst nur Tapp, Plumps und Rumpeln** (13 §10.11 „Muss“), Musik und Haptik in D5.
- **Renderer bei Stufe 1 lassen**, solange die Messseite grün zeigt; Kachel-Durchgang und WebGPU nur bei rotem Ergebnis.
- **Abbruchregeln vorher festlegen:** Hält eine Probe nach dem geschätzten Aufwand nicht, wird angehalten und berichtet (Arbeitsregel 2;
  14a §7.3 hat das für P1 schon getan).

---

## 5 Spielkonzept-Richtungen für Ozzy

Grundlage ist Bericht 13, ergänzt um 08 (Körpermodell), 14a (Rad), 14b (Logik) und 14d (Ton). Alle Zahlen sind Startwerte zum Prüfen.

### 5.1 Die Mechanik in Kürze

- **Ein Rad in Schwerkraft nach unten, kein kleiner Planet.** Nur der Scheitel ist eben, zu beiden Seiten wird es steiler. Das Bild der
  kleinen Welt mit rundem Horizont bleibt, ihre Physik nicht (13 §2.1).
- **Die Lage ist das Gaspedal.** Ozzys Winkel vom Scheitel ist die Neigung unter ihm. Mit begrenzter Bremskraft der Beine (Garten 0,3 g)
  steht er bis etwa 3° still, tapst bis 8° im Schritt, trabt bis 13°, galoppiert bis 17°, darüber wird er schneller, als er kann, und
  stolpert. Die Seite bestimmt die Richtung, der Abstand vom Scheitel das Tempo; eine Anzeige ist unnötig, seine Gangart zeigt es
  (13 §2.2).
- **Gespielt wird Besen-Balancieren.** Ohne Bremse wächst eine Abweichung wie bei einem umgekehrten Pendel mit der Kippzeit τ = √(R/g).
  Bei g = 20 Körperlängen je s² beträgt die Kippzeit bei einem Radius von 8 L 0,63 s (nervös), bei 14 L 0,84 s (gutmütig), bei 20 L
  1 s (kaum Spannung); sie sollte deutlich über der Reaktionszeit des Menschen liegen. Wer Ozzy nach rechts schicken will, lässt ihn erst etwas nach rechts kippen und zieht dann den Boden nach wie ein
  Laufband (13 §2.3).
- **Drei Gesten, eine Physik:** Halten (das Rad steht wie Boden), Ziehen (das Rad folgt dem Finger über eine Feder mit Kraftgrenze; grobes
  Rucken verpufft), Loslassen (Schwung, Lagerreibung bremst). Jeder Schritt Ozzys drückt das Rad zurück; der Regler „Radgewicht“
  bestimmt, wie stark (Gassirunde: mittel). Kein Knopf im Spiel, auch Start und Weltwahl sind ein Rad (13 §2.4, 14a).
- **Regler je Welt:** Radius, Schwerkraft, Haftung (Stehzone), Radgewicht, Lagerreibung. Eis braucht keine Sonderregel: Die Haftung
  sinkt, die Stehzone schrumpft auf etwa ±6°, Ozzy rutscht früher (13 §2.5).
- **Besonderes Balancieren ohne Sonderregel:** Auf einem Hügel steht Ozzy auf einem zweiten, kleineren Scheitel, der schneller kippt;
  Lücken verlangen Schwung kurz vorher; bleibt er schnüffelnd stehen, trägt ihn das drehende Rad aus der Stehzone (13 §2.6).
- **Jedes Hindernis verlangt genau ein Tempo** (Steinchen Schritt, Stamm Trab, Lücke Galopp, Hügel Halten am Gipfel, Wippe Stopp in der
  Mitte). Das Fenster entsteht aus Ozzys Sprungkraft und Schrittlänge, nicht aus einer Regel je Hindernis; Ozzy springt selbst, wenn das
  Tempo passt, der Spieler ist der Reiter (13 §9.4).
- **Komik:** blamiert, nie verletzt; Ozzy meint es ernst; Ahnung, Pause, Folge; der Blick in die Kamera; Physik statt Konserve; Ketten
  von Ursache und Wirkung; hinter dem Bildrand ist alles Ton; die Musik stockt beim Plumps (13 §5.4). Bahnen bleiben echt; Cartoon gibt
  es nur in der Zeit (kurze Zeitlupe), in den Posen und hinter dem Bildrand.

### 5.2 Fünf Richtungen

| Richtung | In einem Satz | Stärken | Schwächen | Neue Systeme |
|---|---|---|---|---|
| **A „Gassirunde“** | Ozzy dreht vor Sonnenuntergang eine Runde um seine kleine Welt, der Spieler dreht die Welt | am nächsten an Florians Idee; gemütlich und witzig; zeigt alles, was Studio kann | Gefahr der Gleichförmigkeit (LocoRoco); Balancieren kann zu schwer sein (TumbleSeed) | wenige |
| B „Die Kugelnummer“ | Zirkusnummer auf einer Riesenkugel; Applaus für Kunststücke, Lacher für Pannen | die witzigste Richtung; Stürze werden belohnt | Takt und Musik, Publikum, viele Inhalte; Gefahr des Geskripteten | Takt, Publikum |
| C „Platsch!“ | Ozzy und ein Biber auf einem schwimmenden Stamm; wer bleibt oben? | glasklares Ziel, kurze Runden, zeigt Rückwirkung und Wasser | zweite Figur mit eigenem Gleichgewicht, Gegner-KI, viel Abstimmung | zweite Figur, Gegner-KI, Wasser |
| D „Ozzy will nicht“ | Ozzy soll ins Bad und will nicht; Rad und Köder überlisten ihn | Persönlichkeit im Mittelpunkt, wenig Reflexe nötig | Rätselbau je Level aufwendig; Balancieren tritt zurück | Bedürfnisse, Köder, Rätsel |
| E „Agility-Pokal“ | Hundesport-Parcours auf dem Rand des Rads | klare Regeln, jedes Gerät eine Fähigkeit, hoher Wiederspielwert | wettkämpferisch statt gemütlich; Geist braucht exakt gleiche Physik | Regeln, Zeitmessung, Geist |

Nach 13 §8 ist B die witzigste und C die klarste Richtung, aber beide brauchen große Systeme, die mit Ozzy auf dem Rad wenig zu tun
haben. A ist die Richtung, in der jede gebaute Fähigkeit später allen anderen dient.

### 5.3 Empfehlung: die Demo „Gassirunde“

**Warum:** Sie setzt Florians Idee eins zu eins um (oben stehen, bergab tapsen, vorsichtig drehen, stolpern, springen, an Erhöhungen
besonders balancieren, Eigensinn). Sie braucht die wenigsten neuen Systeme (keine zweite Figur mit Gleichgewicht, keinen Takt, keine
Rätsellogik, keine geräteübergreifend gleiche Physik). Sie zeigt trotzdem jede Fähigkeit des Editors: Morphs und Posen, gestaltete
Übergänge, Physik vom Nachschwingen bis zum Sturz, Logik mit Launen und Aufgaben, Verschmelzen in Pfützen und Staub. Scheitern ist
witzig statt hart. Und alles, was für sie gebaut wird, dient später B bis E.

**Was sie aus den anderen Richtungen übernimmt:** den **Pannen-Rückblick** aus B (am Ende laufen alle Stürze gleichzeitig ab, wie bei
Super Meat Boy) und die **Hindernis-Grammatik** aus E (jedes Ding verlangt genau ein Tempo).

**Umfang (13 §9.2):**

- **Spielwiese** zuerst: eine Welt ohne Ziel mit allen Dingen, Launen per Knopf, Dinge fallen lassen; Prüfstand und Spielzeug zugleich.
- **Garten** (Radius 14 L, Stehzone ±17°): Steinchen, Stamm, zwei Duftstellen, Schmetterling, kleiner Hügel, Wurst. Man lernt: Die Lage
  ist das Tempo.
- **Park** (Radius 11 L, ±14°): großer Hügel, Pfütze, Wippe, schlafende Katze, Bachlauf als Lücke, Ball. Man lernt Launen und das Halten
  an Erhöhungen.
- **Winter** (Radius 12 L, auf Eis ±6°): Eis, ein Schneeball, der beim Rollen wächst, ein Schneemann, vor dem Ozzy Angst hat. Man lernt
  Rutschen.
- **Rahmen:** Ozzy sitzt oben und wartet, das Anfassen des Rads startet; der Himmel ist die Uhr; ein Fähnchen markiert Start und Ziel;
  drei Aufgaben je Welt (Können und Unfug gemischt); Rückblick und Tagebuch am Ende; die Weltwahl ist selbst ein Rad.

**Launen in der Demo:** Schnüffeln, Sturkopf, Flitzen, Jagen, dazu Müde am Abend. Jede ändert nur Sollwerte, kündigt sich etwa eine
Sekunde vorher am Körper an, ist kurz und meist an einen Ort gebunden (13 §6.2). Die Häufigkeit stellen Charakter-Regler ein (Neugier,
Mut, Sturheit, Energie, Verfressenheit).

**Scheitern und Hilfen:** keine Leben, kein Spielende; ein Sturz kostet zwei bis vier Sekunden, weil die Sonne weiter sinkt; wer über
den Bildrand fällt, ist nur zu hören und kommt mit einem Andenken zurück; nach drei Fehlversuchen am selben Ding erscheint eine Hilfe,
die man ignorieren darf; eine Zen-Runde ohne Sonnenuntergang; Spieltempo 80 % als Schalter (13 §9.6).

**Steuerung:** Ziehen überall mit einer Tropfenmarke am Radrand, Querformat; Neigen und zwei Daumen als Schalter in den Einstellungen;
auf dem Mac Maus oder Trackpad (13 §4).

**Ton und Barrierefreiheit (14d):** Jeder Gag hinter dem Bildrand braucht den Dreiklang aus Klang, Rand-Bild und Stoß, weil der
Stummzustand nicht lesbar ist und Safari den Ton erst nach dem ersten Loslassen freigibt. Musik in Schichten nach Gangart und Stücken je
Welt; beim Plumps stockt sie sofort und setzt mit Ozzys erstem Schritt auf dem Schlag wieder ein; Stille beim Stehen gehört zur Musik.
„Bewegung reduzieren“ folgt dem Systemschalter und einem eigenen: kein Kamera-Wackeln (statt dessen ein kurzer Stillstand), kein Line
Boil, Zeitlupe ohne Zoom; das Rad, das dem Finger folgt, bleibt.

**Logik der Demo (14b):** Bausteine Vierbeiner, Rad, Ding, Zone, Zähler, Uhr, Kamera und Musik; Launen als Karten an den Dingen, die sie
anbieten (Duftstelle bietet Schnüffeln an); Ereignis-Karten für Staub, Ton und Zähler („Sobald Ozzy plumpst → Staub, Plumps, Zähler +1“);
Solange-Karten für Zustände („Solange Ozzy auf Eis → Gesicht vorsichtig“); Aufgaben als Sätze über Zähler mit Beweis-Lauf. Das Stolpern
löst die Physik des Vierbeiners aus, nicht eine Tempo-Schwelle.

**Etappen:** D0 Spielwiese, D1 Garten, D2 Komik (Sturz, Aufstehen je Lage, Schütteln, Blick, Abgang über den Rand), D3 Rahmen (Himmel,
Aufgaben, Rückblick, Tagebuch), D4 Park und Winter, D5 Feinschliff mit Ton, Musik und Haptik (13 §9.7); eingeordnet in Abschnitt 4.7.

**Was Studio dafür können muss** (13 §10.11, Muss für D0 bis D3): Ozzy mit Grund-, Gang-, Balance- und Sprungposen, Schnüffeln, Sturkopf,
Stolpern, Purzeln, drei Liegeposen, Aufstehen, Schütteln, Blick (rund 35 Posen, fünf gibt es schon); die Welt als ein geschlossener
Vektorpfad, Hügel und Lücken als Bearbeitungen dieses Pfads; Steinchen, Stamm, Hügel, Duftstelle, Fähnchen, Wurst; Himmel als Uhr und
Endkarte; Staub, Kontaktschatten, Stauchen (als gezeichnete Schlüsselformen, Abschnitt 4.6 Punkt 19); Tapp, Plumps, Rumpeln.

---

## 6 Risiken und offene Fragen

### 6.1 Risiken

| Risiko | Wirkung | Gegenmittel | Quelle |
|---|---|---|---|
| **Der Umfang wächst über das Wochenlimit hinaus** | halbe Werkzeuge, keine Demo | Umfang aus der Demo; feste Probenfolge mit Abbruchregeln; Hebel aus 4.7 | 02 §7, 13 §9.8, 4.7 |
| **Tempo auf dem iPhone verfehlt** (Renderer, Szene, Speicherwürfe) | Ruckeln; „Die Performance muss immer top sein“ verfehlt | Messseite zuerst; Rahmen je Figur; halbe Feldauflösung nach Bild; Auswerten ohne Würfe; Kachel-Durchgang als Reserve; Kostenampel im Editor | 10, 14c |
| Stromsparmodus und Wärme (30 Hz, unregelmäßige Ausfälle) | Florian urteilt unwissentlich bei 30 Hz | Anzeige im Editor; fester Takt mit Interpolation; bei kritischer Wärme gleichmäßig 30 Hz nach seinem Wort | 14c §8.2 |
| Web-Bindung von Box2D (zwei Betreuer), Snapshot experimentell | Updates hängen nach, Spulen bricht in einer neuen Fassung | schmale eigene Schnittstelle; Rapier als Plan B; Snapshots nie als Datei; dauerhaft nur Ausgangslage plus Protokoll | 09, 14a |
| Kette auf dem drehenden Rad (Box2D empfiehlt Ketten auf statischen Körpern) | Hängenbleiben, Durchfallen | Kriterien K5 und K6 in P1; Rückfall B′ (Welt steht, Schwerkraft und Kamera drehen) | 14a |
| **Die aktive Stelle trägt nicht** | Änderungen landen an der falschen Stelle | zwei Signale, Geltungs-Chip, Karte „Probe“, ein Rückgängig, das nie versagt; Bedienprobe; Gegenprobe mit zwei Modi | 12 §5.1, §9 |
| Eine neue Mischart verändert Florians Formen | Vertrauensverlust | nie still wechseln; Vergleichsbild in derselben Ansicht; seine Schlüssel nie löschen | 06 §9.1 |
| Autorig an Ozzy überangepasst | versagt an neuen Figuren | Vorlagen als Daten; Florians Testformen; zwei fremde Formen in der Probe | 07 §8 |
| Spiel zu schwer (umgekehrtes Pendel) | Frust | großer Radius, große Stehzone, mittleres Radgewicht, Hilfen; früh mit Nicole testen | 13 §9.8 |
| Eintönig (Hauptkritik an LocoRoco) | Wiederholung | jede Welt bringt eine neue physikalische Idee | 13 §9.8 |
| Eigensinn wirkt unfair (Lehre aus The Last Guardian) | Steuerung fühlt sich träge an | immer ankündigen, kurz, an Orte binden, Vorlauf vor dem nächsten Ding | 13 §6, 14b |
| Ton auf iOS (Freigabe, Stumm, Bluetooth bis 274 ms, Speicher beim Entpacken) | Gags kommen nicht an, Abbrüche | Dreiklang; Start mit einem Tippen; Wachhund; Musik in Phrasen, nacheinander entpacken | 14d §4 |
| WebGL-Kontextverlust, frühe WebGPU-Fehler | schwarzes Bild, Abstürze | Bild jederzeit aus Daten neu aufbauen; WebGL2 als Basis; WebGPU nur nach Prüfung auf seinen Geräten | 10 §5, 14c §3.4 |
| Wiederholbarkeit über Geräte | Fehlerberichte und Rückblicke nicht übertragbar | eigene Winkelfunktionen im Simulationspfad, sobald nötig; Hash-Test auf Mac und iPhone | 09, 14a §3e |
| Dünne Quellenlage bei Details | Fehleinschätzung an einer Stelle, auf die eine Entscheidung baut | in den Berichten mit † oder „Fachwissen“ markierte Aussagen vor einer Entscheidung nachlesen | alle |
| Lizenzen (Spine, AGPL, Klangbibliotheken, GEMA) | Rechtsrisiko, sobald Studio oder die Demo weitergegeben werden | Regeln aus 11 §14 und 14d §5.4; Lizenzliste als Test | 11, 14d |
| Ein Fenster wird unter Florian umgebaut | er verliert Arbeit oder Vertrauen | sein Editor aus festem Stand; eigener Arbeitsbaum je Strang | 11 §8.3, Arbeitsregel 3 |

### 6.2 Offene Fragen an Florian

**Was den nächsten Schritt aufhält** (in der Reihenfolge von 4.7):

1. Darf die Messseite auf deinem iPhone 16, deinem iPad und deinem Mac laufen (rund 15 Minuten je Gerät, in Safari und in der App)? Und
   welches iPad und welcher M3 Pro (14 oder 18 Grafikkerne) ist es? (14c)
2. Darf die Welt (Rad, Körper, Stürze, Ball) mit einer bewährten Physik-Bibliothek rechnen, während Ohren, Schwanz, Bart und Bohne mit
   unserer eigenen laufen? Ich würde es dir zuerst in der Probe „Rad mit Gewicht“ zeigen: drei Radgewichte, Hinsetzen am Hang, Rutschen
   auf dem Po, ein Sturz, Zurückspulen. (14a)
3. Willst du „Rahmen + Rest“ an Ohr und Stirnfranse neben dem heutigen Stand sehen, bevor es für neue Formen Standard wird? (06)
4. Darf Studio ohne Modi auskommen (du änderst, wo der Tropfen sitzt, wie heute im Werkzeug), oder lieber getrennt „Formen“ und
   „Bewegen“ wie in Rive? (12)
5. Ist die Gassirunde die Richtung, oder reizt dich der Zirkus oder das Duell mit dem Biber mehr? (13)

**Was warten kann** (Fragen der Einzelberichte, gebündelt):

- **Spiel (13 §12):** Stehzone eher ±8° (realistisch) oder ±17° (gutmütig)? Soll Ozzy das Rad spürbar mitdrehen? Springt Ozzy selbst,
  wenn das Tempo passt, oder auf Tippen? Eigensinn selten und charmant oder häufig? Darf Ozzy über den Bildrand verschwinden und mit einem
  Andenken zurückkommen? Streicheln als zweite Geste? Quer- oder Hochformat? Welche Fiktion der Scheibe? Katze, Schmetterling, Vogel
  schon in der Demo? Ton und Musik schon in der Demo? Neigen ausprobieren? Name „Gassirunde“?
- **Look (10 §10, 14c §10):** Darf es Grau geben, oder nur Raster aus Schwarz und Weiß? Wackeln für Momente oder nie? Welche Effekte dürfen
  auf Ozzys Körper (Schmierbild, Aufprallbild, Verformung nach Tempo)? Kantenglättung gegen das Logo prüfen. Siehst du einen Unterschied
  zwischen Feldern in voller und halber Auflösung? Bei Hitze lieber gleichmäßig 30 Bilder je Sekunde oder unregelmäßig 40 bis 60?
- **Bedienung (12 §11):** Tasten (B, W, 1 bis 4, Tab, Leertaste); iPad-Gesten wie Procreate; Feld rechts fest oder nur bei Bedarf; zwei
  Federregler oder Kurven sehen; das Wort „Linse“; auf dem iPhone nur ansehen oder auch korrigieren?
- **Posen und Übergänge (05 §9, 04 §10):** Übergänge in Sekunden oder über Gefühl? Tafel oder Posenplan zuerst? Teilposen (nur Kopf,
  nur Gesicht)? Ausholen und Nachfedern als Standard-Regler ausprobieren? Braucht Ozzy ein Nicken als zweite Kopfachse? Siehst du das
  Abprallen an der Front und das Hin und Her bei 176° bis 184°?
- **Knochen (03 §12, 06 §12, 07 §8):** Beine biegsam oder mit sichtbarem Knie? Ohren und Schwanz federn von Anfang an? Gewichte malen
  sichtbar oder nur als Fachwerkzeug? Reicht der Glätte-Schutz bei Griffgewichten? Sollen Drehungen aus frei gezeichneten Posen
  automatisch in Knochen wandern? Dürfen Formen zwischen zwei Schlüsseln über sie hinausschwingen?
- **Physik (08 §11, 14a §9):** Nachschwingen nur zwischen deinen gezeichneten Formen oder an manchen Teilen frei? Sturz schlaff oder
  gezeichnet (beide nebeneinander zeigen)? Wenige Charakter-Regler oder jede Feder einzeln? Darf Ozzys Fläche an Kontaktstellen leicht
  abflachen? Müssen Aufnahmen auf anderen Geräten genau gleich ablaufen?
- **Logik (14b §11):** Darf eine Laune wie Sturkopf den Spieler überstimmen? Gedankenblase nur im Editor oder auch im Spiel? Karten am
  Ding oder in einer Liste? Zufall je Welt fest oder je Runde neu? Darf die Regie ein Stolpern anfordern? Beweis-Lauf Pflicht? „Sobald“
  und „Solange“ oder „Wenn“ und „Während“?
- **Ton (14d §10):** Bei Stumm still wie das Hauptspiel oder ein Schalter „Ton trotz Stumm“? Gezeichnete Lautmalerei? Welcher
  Musik-Charakter? Wer macht die Klänge, wer spricht Ozzy? Haptik schon in der Demo-App?
- **Produkt (11 §17, 01 §6):** Bleibt Studio euer Werkzeug oder wird es ein Produkt? Willst du unterwegs am iPad ohne Mac formen? Chrome
  oder Safari am Mac? Ist „glatt bei 60 Bildern je Sekunde auf dem iPhone“ der Maßstab? Und die Begriffe aus 4.5.

### 6.3 Technisch offen (klären die Sitzungen selbst)

- Läuft WebAssembly in der Capacitor-WebView unter dem Lockdown-Modus? Lässt sich `box2d3-wasm` ohne Umwege mit Vite bündeln? Wie groß und
  wie schnell ist ein Snapshot unserer Szene, und was kosten Aufrufe über die WebAssembly-Grenze in Safari? (09 §10, 14a §9)
- Trägt die Kette auf dem drehenden Rad mit Bullets, oder braucht es B′? Reicht der Gelenkweg für Liegen und Aufstehen je Lage? (14a)
- Ist Box2D über Mac (Safari, Chrome) und iPhone (Safari, App) bitgleich? Tragen Box2D-Gelenke Ozzys Proportionen im Sturz? (09)
- WebGPU in der WKWebView unter iOS 26 und 27; Zeitabfragen; Grenze des GPU-Prozesses für Texturen; COOP und COEP in der App (10, 14c).
- Dünn besetzte Zerlegung in TypeScript für Wärme-Gewichte: Aufwand und Tempo auf dem iPad (06 §12).
- Formen mit Löchern und Teile, die erscheinen oder verschwinden, im Morph (06 §12).
- paper.js 0.17 gegen Clipper2-WASM an Ozzys Flächen; Verrundung einer ruhenden Pose gegen das Bild des Renderers (11, Abschnitt 3.6).
- Drehung des Pencil Pro in Safari; Systemgesten mit drei Fingern auf dem iPad (11, 12).
- Latenz von Web Audio auf dem iPhone 16; Zusammenspiel von App-Kategorie und `navigator.audioSession`; Gamepad in der WKWebView (14d).
- Inochi2D 0.9 und Live2D 5.4 nur als Ideenquellen beobachten (04); Nutzerstimmen zu Tauri, Solid 2.0 und paper.js nachholen (11).

### 6.4 Grenzen dieser Recherche

- In fast allen Einzelberichten war das gemeinsame Suchbudget gegen Ende oder schon zu Beginn erschöpft (nur 14d hatte wieder Websuche).
  Viele Aussagen stützen sich deshalb auf direkt abgerufene Handbücher, Changelogs, Quelltexte und Aufsätze; Stimmen von Nutzern sind dünn.
- Gesperrt oder nicht lesbar waren unter anderem die Adobe-Hilfe, die Seiten von Toon Boom, Videos auf Vimeo, das Moho-Handbuch (zu groß),
  das Lost-Marble-Forum (nur Suchauszüge) und einige Aufsatz-PDFs (SIMBICON, Formabgleich, „Small Steps“). Die Berichte markieren solche
  Aussagen (†, „Fachwissen“, „eigene Kenntnis“, „nach meinem Wissen“).
- Auf dem iPhone ist nichts gemessen; alle iPhone-Zahlen sind Rechnungen aus öffentlichen Vergleichswerten und Mac-Messungen, etwa ±50 %
  genau (14c).
- Keine Bedienidee ist mit Florian erprobt; alle Vorschläge zur Bedienung sind unbewiesen, bis er sie in der Hand hatte (12 §12).
- Versionen und Daten stammen aus der npm-Registry und von Herstellerseiten am 20.11.2026; einige Bausteine bewegen sich schnell
  (paper.js fünf Nebenversionen in drei Wochen, Solid 2.0 drei Tage alt).
- Dieser Gesamtbericht prüft die Quellen nicht neu; er stützt sich auf die Einzelberichte. Die Aufwandsschätzung in 4.7 und die
  Einschätzung des geometrischen Wegs in 3.6 stammen aus diesem Bericht, nicht aus den Einzelberichten.

---

## 7 Quellen

### 7.1 Die Einzelberichte und ihre Quellenlisten

Die vollständigen Quellen stehen am Ende jedes Einzelberichts, zusammen rund 1 140 eindeutige Links (mit Überschneidungen zwischen den
Berichten; gezählt am 20.11.2026).

| Bericht | Quellenabschnitt | Links | Schwerpunkt der Quellen |
|---|---|---|---|
| 01 | §7 | 67 | Spine-Handbuch, Laufzeitcode und Lizenztexte; DragonBones, Spriter, Creature, Unity 2D, Godot; Foren mit Antworten der Hersteller |
| 02 | §10 | 100 | Rive-Handbuch, Changelogs und Laufzeitcode; Lottie-Spezifikation; After-Effects-Erweiterungen; Cavalry, Jitter, Linearity Move |
| 03 | §13 | 68 | Handbücher von Harmony, Animate, Synfig, OpenToonz; Moho-Ankündigungen und Skriptreferenz; Pose Space Deformation, BBW |
| 04 | §12 | 73 | Live2D-Handbuch und SDK; Inochi2D- und nijilive-Quelltext; Spine, Rive, Cartoon Animator; Live2D-Forum |
| 05 | §11 | 67 | Handbücher von Spine, Unity, Unreal, Godot, Rive, Live2D, Blender, Procreate Dreams, Cascadeur; Vorträge GDC, SIGGRAPH, WWDC |
| 06 | §13 | 39 | Aufsätze zu Morph, Skinning und Gewichten; Laufzeitcode von Rive und Spine; libigl |
| 07 | §10 | 42 | Animated Drawings, Pinocchio, Teddy, MLS, RigNet, Liu u. a.; Autorig-Funktionen der Werkzeuge |
| 08 | §12 | 71 | XPBD, Formabgleich, Capture Point, Raibert; Spine-Physik, Live2D-Pendel; Rain World, Overgrowth, Gibbon; Box2D, Rapier |
| 09 | Quellen | 55 | Box2D-Blog und Release Notes, `box2d3-wasm`, Rapier-Handbuch, Planck, Matter, p2; npm-Registry; Avian; „Fix Your Timestep“ |
| 10 | Quellen | 82 | Renderer (Slug, Vello, Rive, Skia, PixiJS, ThorVG); Abstandsfelder; Apple-GPU-Dokumentation; WebGPU in Safari; Effekte |
| 11 | Quellen | 70 | Figma, tldraw, Excalidraw, Rive, Theatre.js, Motion Canvas, Graphite; Frameworks; WebKit-Einstellungen; Tauri, Capacitor; Testwerkzeuge |
| 12 | §13 | 48 | Figma, Procreate, Keynote, PowerPoint, Principle, ProtoPie, Origami, Construct, Character Animator, Apple Motion; Apple-Richtlinien; Bret Victor; NN/g |
| 13 | §13 | 48 | Spiele und Entwickleraussagen (LocoRoco, Tiny Wings, TumbleSeed, Super Meat Boy); Apple, MDN, Capacitor; Humorforschung; Hoober |
| 14a | Quellen | 43 | Box2D-Quelltext (Hauptzweig November 2026), Typen von `box2d3-wasm`; XPBD-Aufsätze; Avian; Rapier |
| 14b | §13 | 85 | Construct, GDevelop, Rive-Laufzeit, Kodu, Mario Maker, ProtoPie; Studien zu Wenn-dann-Regeln und Fehlersuche; Halo 2, F.E.A.R., Dual-Utility |
| 14c | Quellen | 68 | WebKit-Quelltext und Bugzilla; Apple-Dokumentation; Testberichte und Geekbench; Valve 2007; Foren |
| 14d | §11 | 111 | FMOD, Wwise, Unity, Unreal, Rive, Construct; WebKit, W3C, WHATWG, MDN; Apple-Dokumentation; Richtlinien zur Barrierefreiheit; Lizenzen von Klangbibliotheken |

### 7.2 Die wichtigsten Primärquellen je Bereich

Ausgewählt nach ihrem Gewicht für die Empfehlungen dieses Berichts; in Klammern die Berichte, die sie nutzen.

**Skelett- und Vektor-Werkzeuge**

- Spine, Netze und Verformungsschlüssel: <https://esotericsoftware.com/spine-meshes> (01, 06)
- Spine, Gewichte: <https://esotericsoftware.com/spine-weights> (01, 06, 07)
- Spine, Pfade und Griffgewichte: <https://esotericsoftware.com/spine-paths> (01)
- Spine, Physik: <https://esotericsoftware.com/spine-physics-constraints> (01, 06, 08, 09)
- Spine, Slider: <https://esotericsoftware.com/spine-sliders> (01, 04, 05)
- Spine-Laufzeit, Verformung im Knochenraum: <https://github.com/EsotericSoftware/spine-runtimes/blob/4.2/spine-ts/spine-core/src/attachments/Attachment.ts> (01, 06)
- Rive, Knochen und Gewichte: <https://rive.app/docs/editor/manipulating-shapes/bones.md> (06); Laufzeit `weight.cpp`: <https://github.com/rive-app/rive-runtime/blob/main/src/bones/weight.cpp> (03)
- Rive, Vector Feathering: <https://rive.app/docs/editor/fundamentals/vector-feathering> (02, 10)
- Lottie-Spezifikation 1.0, Formen: <https://lottie.github.io/lottie-spec/1.0/specs/shapes/> (02)
- Cavalry, Morph: <https://cavalry.studio/docs/nodes/behaviours/morph/> (02)
- GSAP MorphSVG: <https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/> (02, 06)
- Live2D, erweiterte Interpolation: <https://docs.live2d.com/en/cubism-editor-manual/extended-interpolation/> (04, 06)
- Live2D, Zusatzformen: <https://docs.live2d.com/en/cubism-editor-manual/blend-shape/> (03, 04, 05, 06)
- Inochi2D: <https://github.com/Inochi2D/inochi2d> (04)

**Morph, Skinning, Gewichte, Autorig**

- Lewis, Cordner, Fong: Pose Space Deformation, SIGGRAPH 2000: <https://www.scribblethink.org/Work/PSD/PSD.pdf> (03, 05, 06)
- Alexa, Cohen-Or, Levin: As-Rigid-As-Possible Shape Interpolation, SIGGRAPH 2000: <https://www.tau.ac.il/~levin/arap.pdf> (06)
- Jacobson, Baran, Popović, Sorkine: Bounded Biharmonic Weights, SIGGRAPH 2011: <https://igl.ethz.ch/projects/bbw/> (01, 03, 06, 07)
- Le, Hodgins: Real-time Skeletal Skinning with Optimized Centers of Rotation, SIGGRAPH 2016: <https://studios.disneyresearch.com/?p=39548> (06)
- Liu, Jacobson, Gingold: Skinning Cubic Bézier Splines, SIGGRAPH Asia 2014: <https://cragl.cs.gmu.edu/splineskin/> (06, 07)
- Baran, Popović: Automatic Rigging and Animation of 3D Characters (Pinocchio), SIGGRAPH 2007: <https://people.csail.mit.edu/ibaran/papers/2007-SIGGRAPH-Pinocchio.pdf> (06, 07)
- Smith u. a.: Animated Drawings, 2023: <https://arxiv.org/abs/2303.12741> (07)
- Igarashi, Matsuoka, Tanaka: Teddy, 1999: <https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf> (07)
- Schaefer, McPhail, Warren: Image Deformation Using Moving Least Squares, 2006: <https://people.engr.tamu.edu/schaefer/research/mls.pdf> (07)
- libigl-Tutorial (LBS, Dual-Quaternionen, BBW, ARAP): <https://libigl.github.io/tutorial/> (06)

**Posen, Übergänge, Zeit**

- Bollo: Inertialization, GDC 2018: <https://gdcvault.com/play/1025165/Inertialization-High-Performance-Animation-Transitions> (05, 08)
- Holden: Spring-It-On: <https://theorangeduck.com/page/spring-roll-call> (05, 08)
- Procreate Dreams, Performing: <https://help.procreate.com/dreams/handbook/keyframes-and-performing/performing> (05)

**Figurenphysik und Physik-Engines**

- Macklin, Müller, Chentanez: XPBD, 2016: <https://matthias-research.github.io/pages/publications/XPBD.pdf> (08)
- Müller u. a.: Detailed Rigid Body Simulation with XPBD, 2020: <https://matthias-research.github.io/pages/publications/PBDBodies.pdf> (08, 14a)
- Müller u. a.: Meshless Deformations Based on Shape Matching, 2005: <https://matthias-research.github.io/pages/publications/MeshlessDeformations_SIG05.pdf> (06, 08)
- Pratt u. a.: Capture Point, 2006: <https://cs.utexas.edu/~shivaram/readings/b2hd-PrattCDG2006.html> (08)
- Box2D 3.2: <https://box2d.org/posts/2026/10/box2d-3.2/> (09, 14a); Replay: <https://box2d.org/posts/2026/06/replay/> (09, 14a);
  Determinismus: <https://box2d.org/posts/2024/08/determinism/> (09, 14a); Solver2D und Soft Step: <https://box2d.org/posts/2024/02/solver2d/> (08, 09, 14a)
- `box2d3-wasm`: <https://github.com/Birch-san/box2d3-wasm> (09, 14a)
- Rapier, Determinismus: <https://rapier.rs/docs/user_guides/javascript/determinism> (08, 09)
- Avian 0.1, Wechsel der Kontakte von XPBD auf Soft Step: <https://joonaa.dev/blog/06/avian-0-1> (09)
- Fiedler: Fix Your Timestep: <https://gafferongames.com/post/fix_your_timestep/> (09)

**Rendern und Effekte**

- Valve 2007, Abstandsfelder in kleiner Auflösung: <https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf> (10, 14c)
- Rive, Feathering: <https://rive.app/blog/how-rive-reinvented-feathering-for-the-vectorian-era> (02, 10)
- Lengyel: A Decade of Slug, 2026: <https://terathon.com/blog/decade-slug.html> (10)
- Vello (`vello_gpu`): <https://docs.rs/vello_gpu> (10)
- Velocity Skinning, Eurographics 2021: <https://arxiv.org/abs/2104.04934> (10)
- SMEAR, SIGGRAPH 2024: <https://hal-iogs.archives-ouvertes.fr/hal-04576817v1> (10)

**Technik**

- Figma, Mehrspieler-Technik: <https://www.figma.com/blog/how-figmas-multiplayer-technology-works/> (11)
- tldraw, Speichern und Migrationen: <https://tldraw.dev/docs/persistence> (11)
- Excalidraw, Rückgängig mit Deltas: <https://github.com/excalidraw/excalidraw/pull/7348> (11)
- React Compiler 1.0: <https://react.dev/blog/2025/10/07/react-compiler-1> (11)
- paper.js, Changelog: <https://github.com/paperjs/paper.js/blob/develop/CHANGELOG.md> (11); Clipper2: <https://github.com/AngusJohnson/Clipper2> (11)
- `getCoalescedEvents` in Safari: <https://caniuse.com/mdn-api_pointerevent_getcoalescedevents> (11)
- WebKit, Bildtakt und Drosselgründe: <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/platform/graphics/AnimationFrameRate.h> (14c);
  Grundeinstellungen (60 fps): <https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml> (11, 14c)

**Bedienung**

- Figma: Our approach to designing UI3: <https://www.figma.com/blog/our-approach-to-designing-ui3/> (12)
- Keynote, Magic Move: <https://support.apple.com/guide/keynote/add-transitions-tanff5ae749e/mac> (12)
- Principle, Dokumentation: <https://principleformac.com/docs.html> (12)
- ProtoPie, Triggers: <https://www.protopie.io/learn/docs/interactions/triggers> (12, 14b)
- Construct 3, Events: <https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/events> (12, 13, 14b)
- Bret Victor: Inventing on Principle: <https://worrydream.com/InventingOnPrinciple/>; Stop Drawing Dead Fish: <https://worrydream.com/StopDrawingDeadFish/> (12)

**Spieldesign**

- Swink: Game Feel, The Secret Ingredient: <https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient> (13)
- Hoober: How Do Users Really Hold Mobile Devices?: <https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php> (13)
- LocoRoco: <https://en.wikipedia.org/wiki/LocoRoco>; TumbleSeed: <https://en.wikipedia.org/wiki/TumbleSeed> (13)
- Theorien des Humors (harmlose Verletzung nach McGraw und Warren): <https://en.wikipedia.org/wiki/Theories_of_humor> (13)

**Spiellogik**

- Ur, McManus, Ho, Littman, CHI 2014: <https://doi.org/10.1145/2556288.2557420> (14b)
- Huang, Cakmak, UbiComp 2015: <https://hcrlab.cs.washington.edu/assets/pdfs/2015/huang2015ubicomp.pdf> (14b)
- Brackenbury u. a., CHI 2019: <https://doi.org/10.1145/3290605.3300782> (14b)
- Stolee, Fristoe (Kodu), SIGCSE 2011: <https://kstolee.github.io/assets/papers/sigcse2011.pdf> (14b)
- Dill: Dual-Utility Reasoning: <http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter03_Dual-Utility_Reasoning.pdf> (14b)
- Isla: Handling Complexity in the Halo 2 AI, GDC 2005: <https://gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai> (14b)
- Orkin: F.E.A.R., GDC 2006: <https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf> (14b)

**Ton, Haptik, Barrierefreiheit**

- HTML-Norm, aktivierende Eingabe: <https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event> (14d)
- MDN, `AudioSession.type`: <https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type> (14d)
- Apple, Playing haptics: <https://developer.apple.com/design/human-interface-guidelines/playing-haptics> (14d)
- Capacitor Haptics: <https://capacitorjs.com/docs/apis/haptics> (13, 14d)
- Untitled Goose Game, adaptive Musik: <https://gamedeveloper.com/audio/getting-goosey-with-debussy-creating-an-adaptive-score-for-i-untitled-goose-game-i-> (14d)
- Xbox Accessibility Guidelines und Game Accessibility Guidelines: Links in 14d §11

### 7.3 Berichtigung

Bericht 05 (§2.8 und Quellenliste) verlinkt <https://vimeo.com/36579366> als Video zu Bret Victors „Stop Drawing Dead Fish“. Nach Bericht
12 (§12, dort geprüft) ist das die Aufnahme von „Inventing on Principle“ (CUSEC 2012); die Seite des Autors leitet „Stop Drawing Dead
Fish“ auf <https://vimeo.com/64895205> weiter und „Inventing on Principle“ auf <https://vimeo.com/906418692>. Die Aussage in 05 über den
Inhalt des Vortrags ist davon nicht berührt, nur der Link.
