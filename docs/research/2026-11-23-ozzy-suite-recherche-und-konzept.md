# Ozzy als Suite: Recherche, Konzept und Brainstorming

Stand 23.11.2026. **Auftrag (Florian, 23.11.):** Aus dem Editor für early earle soll eine vollwertige Suite für Design und Animation
in 2D und 3D werden, die das Beste aus 2D- und 3D-Programmen „neu denkt“: spielerisch und intuitiv, für Einsteiger („einfach den
Schritten folgen und am Ende etwas Cooles haben“) und für Profis („bis ins Detail wie bei Blender“), mit optimalen Schnittstellen zu
Claude und anderen KIs. Komplexe Zeitleisten, Shader- und Materialeditoren sollen durch intuitive Werkzeuge ersetzt werden; Shader,
Material und Partikel laufen live mit Top-Tempo; das Programm soll selbst intelligent wirken. „Es geht nicht darum, ein besseres Maya
oder Rhino oder Blender oder After Effects zu bauen.“ Offen für ihn: der genaue Ablauf, Genauigkeit wie bei CAD ohne den organischen
Stil zu stören, die Verbindung mit 2D (Studio), einfachere Animation. Gewünscht: Recherche, was es gibt; ein genaueres Konzept mit
Möglichkeiten; die Sicht der KI auf Zukunft und Arbeitsweise; ein ausführliches Brainstorming.

**Was dieses Papier ist:** eine Recherche (Stand November 2026, Quellen in Abschnitt 13) und ein Ideenpapier. Nichts davon ist gebaut
oder getestet. Eigene Einschätzungen sind als solche markiert. Die Studio-Recherche vom 20.11. (2D-Animation: Spine, Rive, Live2D, Moho,
Procreate Dreams, Physik, Bedienung) wird nicht wiederholt, nur benutzt. Viele Ranglisten im Netz stammen von Anbietern; wo es keine
unabhängige Prüfung gibt, steht es dabei.

**Inhalt:** 0 Kurzfassung · 1 Die Vision · 2 Was es schon gibt · 3 Was Ozzy mitbringt · 4 Leitideen · 5 Das Fundament · 6 Der Ablauf ·
7 Deine Fragen, je mit Möglichkeiten · 8 Vier Gesamtbilder · 9 Aus meiner Sicht als KI · 10 Ideenspeicher · 11 Weg in kleinen Beweisen ·
12 Offene Entscheidungen · 13 Quellen

---

## 0 Kurzfassung

1. **2026 öffnen die Großen ihre Programme für KI-Agenten.** Adobe (eigener Agent in Photoshop, Illustrator, Premiere; lokale
   MCP-Anbindung für fremde Agenten in Vorschau), Figma (der Agent schreibt Shader, dazu die neue Animation „Motion“), Spline (V2 im
   August „für die Zeit der Agenten“ neu gebaut, Claude Code baut Szenen), Rive (Agent und eine Textform der Datei für Agenten), Blender
   (offizieller MCP-Server). Dass eine KI das Programm bedienen kann, wird Pflicht. Ein Alleinstellungsmerkmal ist es nicht mehr.
2. **Fast alle setzen die KI auf alte Grundformen:** Ebenen, Schlüsselbild-Zeitleisten, Knotengraphen, dichte Dreiecksnetze. Figma hat
   2026 sogar eine klassische Zeitleiste neu eingeführt. Die Grundform selbst hat niemand neu gedacht. Das ist Ozzys Chance: Linien als
   Wahrheit sind für Menschen und KI gleich gut lesbar. Eine Form sind ein paar hundert benannte Punkte, keine 50 000 Dreiecke.
3. **Erzeugen auf Knopfdruck wird Massenware** (Text zu 3D in Minuten, ganze Welten, Bewegung aus Text oder Video). Knapp bleiben:
   Kontrolle, Bearbeitbarkeit, eine Figur, die in jeder Pose dieselbe bleibt, Geschmack und der Weg ins echte Spiel mit Tempo-Budget.
   Das sind Ozzys Stärken.
4. **Vorschlag fürs Fundament: fünf Bausteine, gleich in 2D und 3D:** Linien (Form), Looks (Aussehen), Regler (Werte, Posen, Zeit),
   Verhalten (was sich von selbst bewegt) und Bezüge (Genauigkeit). Alles, was man tun kann, ist ein Befehl auf diesen Bausteinen. Hand,
   KI und Rezepte benutzen dieselben Befehle.
5. **Jeder Schritt geht auf vier Wegen:** mit der Hand, mit Worten, mit einem Vorbild (Foto, Skizze, vorgespielte Bewegung) und mit einem
   Rezept (Schritte zum Folgen). Was die KI tut, ist ein normaler Schritt: sichtbar, zurücknehmbar, von Hand weiterzuführen.
6. **Deine Fragen, je ein Satz:** Genauigkeit „auf Abruf“ (Zögern rastet ein, schlauer Fang, weiche Bezüge). 2D und 3D als „Blatt und
   Raum“ in einem Dokument (Aufblasen hin, Abziehen zurück). Bewegung über Posenfeld, Verhalten, Vorspielen und eine Perlenschnur statt
   Zeitleiste. Looks als Proben auf der eigenen Form mit wenigen Reglern, Partikel als gezeichnete Ströme, das Tempo immer sichtbar. Klug
   wirkt es durch Geister-Vorschläge, Varianten, Zeigen und Sagen, einen sichtbaren KI-Zeiger, Wächter und ein Stilbuch.
7. **Empfehlung:** zuerst die gemeinsame Grundlage (eine Textform der Szene und eine Befehlsschicht für Hand und KI) und daran ein kleiner
   Beweis: Claude baut in Ozzy aus Worten eine Form, Schritt für Schritt sichtbar und zurücknehmbar. Danach Genauigkeit, dann das
   Posenfeld. Vorher klären, ob die Stränge zu einem Stamm zusammengeführt werden.

## 1 Die Vision, wie ich sie verstehe

Eine Suite für Form, Figur und Bewegung in 2D und 3D, die sich wie ein Spielzeug anfühlt und wie ein Profiwerkzeug trägt. Einsteiger
folgen Schritten und haben am Ende etwas Schönes; Profis gehen bis in jedes Detail, ohne das Programm zu wechseln. Zeitleisten, Shader-
und Materialeditoren werden durch Werkzeuge ersetzt, die man anfasst. Die KI ist eingebaut und von außen bedienbar. Das Programm wirkt
selbst klug: Es versteht, was man meint, denkt mit und erklärt sich.

**Sechs Prüfsteine** für jede Idee in diesem Papier:

| Prüfstein | Frage |
| --- | --- |
| Spiel | Fühlt es sich an wie Spielen, mit sofortiger Antwort? |
| Kein hässlicher Zustand | Sieht jeder Zwischenstand gut aus („alles, was man macht, ist irgendwie cool“)? |
| Tiefe auf Abruf | Kommt man vom ersten Strich bis ins letzte Detail, ohne Programm oder Modus zu wechseln? |
| Live | Bewegt jeder Regler das Bild im selben Moment, auch auf iPad und iPhone? |
| KI-nativ | Kann eine KI es lesen, tun, zeigen und prüfen? |
| Bleibt deins | Ist das Ergebnis bearbeitbar, im eigenen Stil, ohne schwarze Kiste? |

## 2 Was es schon gibt (Stand November 2026)

### 2.1 Die Großen öffnen sich für KI-Agenten

| Programm | Was 2026 neu ist | Was wir daraus lernen |
| --- | --- | --- |
| Adobe (Photoshop, Illustrator, Premiere, After Effects) | KI-Assistent auf Grundlage des „Creative Agent“ in den Programmen (im Juni als öffentliche Betas angekündigt); seit April eine Anbindung für Claude mit über 50 Werkzeugen; auf der MAX im November die Vorschau auf eine lokale MCP-Anbindung: fremde Agenten ändern die echten Projektdateien auf dem eigenen Rechner, Ebenen und Sequenzen bleiben bearbeitbar (Beta 2027) | Das Ergebnis der KI muss bearbeitbar bleiben. Das ist jetzt Standard. |
| Figma (Config, Juni) | „Motion“: Zeitleiste mit Schlüsseln und Vorlagen; Shader erzeugt der Agent im Gespräch (offene Beta); Code-Ebenen auf der Fläche | Selbst Figma setzt auf eine klassische Zeitleiste. Shader per Wort gibt es. |
| Spline V2 (20. August) | Editor ganz neu gebaut „für die Zeit der Agenten“; WebGPU; Desktop-App; eigener Agent und ein MCP-Server, über den Claude Code, Cursor und andere Szenen bauen und ändern; Ansichten Bearbeiten, Code, Vorschau; Handverfolgung per Kamera. Hana V2 (27. August): 2D-Fläche mit Agenten und echten 3D-Objekten | Der nächste Verwandte im Geist (Browser, Designer, Agenten). Formen entstehen dort aber aus Grundkörpern und Netzbearbeitung, nicht aus Linien. |
| Rive (seit Januar) | Skripte (Luau) und ein Agent, der Skripte schreibt, Layouts baut und animiert; eine Kommandozeile baut Rive-Dateien aus einer Textform (Rive Markup Language), die Agenten lesen und schreiben | Eine Textform der Szene ist der Schlüssel für Agenten. |
| Blender | Offizieller MCP-Server aus dem Blender Lab (laut Vergleichsseiten 1.0 im April, ab Blender 5.1), gedacht für Analyse, Fehlersuche und Skripte; führt KI-Code ohne Schutz aus | Bedienen per freiem Skript ist mächtig, aber unsicher und für den Nutzer unsichtbar. |
| Onshape (CAD) | MCP-Server für FeatureScript (August) | Auch CAD wird über Text und KI bedient. |
| MCP Apps (Januar) | Werkzeuge zeigen interaktive Oberflächen direkt im Gespräch mit Claude (auch in ChatGPT, VS Code, Cursor) | Ozzy könnte als lebendes Fenster mitten im Claude-Gespräch erscheinen. |

**Folgerung:** Die KI-Schnittstelle ist Pflicht. Unterscheiden wird sich ein Werkzeug durch die Grundform, die Mensch und KI gemeinsam
bearbeiten, und durch das Gefühl der Bedienung.

### 2.2 Erzeugen auf Knopfdruck

- **Text oder Bild zu 3D:** Rodin (Hyper3D), Meshy 6, Tripo (mit „Tripo Studio“ und Autorig laut Anbieter auch für Vierbeiner, Vögel und
  Fische), Hunyuan3D 3.1 (offen, eher saubere geschlossene Netze), TRELLIS.2. Ein Modell in Minuten. Unabhängige Vergleiche fehlen. Du
  fandest im Oktober, dass Meshy deine Entwürfe „fast perfekt“ trifft (`ki-3d-tools-2026-10.md`).
- **Objekte mit Verhalten:** Roblox „4D“ (offene Beta seit Februar) zerlegt erzeugte Objekte nach Bauplänen in Teile und hängt Verhalten
  an, zum Beispiel ein Auto mit drehenden Rädern. Eigene Baupläne sollen folgen.
- **Ganze Welten:** World Labs Marble (öffentlich seit November 2025, Version 1.1 im April) baut begehbare 3D-Welten aus Text, Bild, Video
  oder einem groben 3D-Aufbau; mit „Chisel“ baut man grob in 3D, und die KI füllt die Details. Googles Genie 3 erzeugt Welten Bild für
  Bild, ist aber nicht öffentlich.
- **Bewegung aus Text:** NVIDIA Kimodo (März, mit Schlüsseln und Bedingungen steuerbar), Tencent HY-Motion (offen, über eine Milliarde
  Parameter). Fast nur für Menschen-Skelette.

**Folgerung:** Erzeugtes taugt als Vorlage, kaum als Ergebnis. Es kommt als dichtes Netz mit gebackener Textur, ohne Teile, Namen,
Posen oder Linien. Nützlich wird es erst mit Struktur (Teile, Namen, Verhalten), wie Roblox' Baupläne zeigen. Diese Struktur hat Ozzy
von Haus aus.

### 2.3 Spielerisch formen

- **Dreams** (Media Molecule, PS4, 2020): ein einziges System für Formen, Malen, Animieren, Musik und Spiellogik, gewachsen aus einem
  Bildhauer-Werkzeug eines Game Jams. Animiert wird als Puppenspiel mit dem Controller; eine Standardpuppe läuft, rennt und springt von
  selbst. Menschen, die sonst nichts gestalten, bauten Erstaunliches; Aardman drehte damit einen Kurzfilm. Die Betreuung endete im
  September 2023. **Lehre:** Eine Grammatik für alles trägt. An eine Konsole gebunden und ohne Ausgabe in andere Programme blieb es eine
  Insel.
- **Womp** (Browser): „Goop“, Formen aus Abstandsfeldern, die verschmelzen, schneiden und flüssig bleiben, bis man festlegt; für
  Einsteiger gemacht; die KI liefert Startformen.
- **Monster Mash** (Google Research und Partner, 2020): Umriss zeichnen, aufblasen, an Punkten ziehen und die Bewegung gleich aufnehmen,
  Formen und Animieren in einem Fenster. Mit Teddy (1999) und FiberMesh (2007) die Wurzel von Ozzys Aufblasen
  (`2026-11-09-fibermesh-monstermash-richtung.md`).
- **Spores Kreaturen-Editor** (2008): Teile an eine Wirbelsäule stecken; jedes Ergebnis kann sofort laufen, tanzen und fressen, weil sich
  die Bewegung jedem Körper anpasst. **Lehre:** Was man baut, lebt sofort.
- **Nomad Sculpt** (iPad), **Substance 3D Modeler** und **Gravity Sketch** (VR): Ton und Skizzen im Raum.

**Folgerung:** „Es lebt sofort“ (Spore, Dreams) und „es bleibt flüssig, bis ich festlege“ (Womp) passen genau zu liquid drop. Dreams'
Schicksal mahnt: Plattform offen halten, Ausgabe in übliche Formate.

### 2.4 Genau und trotzdem frei

- **Plasticity** („CAD für Künstler“): genaue Flächen mit der Bedienung eines 3D-Programms. 2026.1 (April) brachte PolySplines (Netze
  werden bearbeitbare Flächen), 2026.2 (Oktober) eine Krümmungsanzeige als Shader und ein System für Bezüge (nur in der Studio-Fassung).
- **Shapr3D:** CAD auf dem iPad mit dem Stift.
- **SketchUp,** seit zwanzig Jahren: Beim Ziehen bietet das Programm Achsen, Mitten, Endpunkte und Parallelen an; man nimmt sie, indem man
  kurz verweilt. Der Beweis, dass Genauigkeit ohne Eingabefelder geht.
- **Procreate QuickShape:** Strich ziehen, am Ende halten, und er wird ein perfekter Kreis, eine Gerade oder ein Bogen, danach mit einem
  Griff nachstellbar.
- **Text zu CAD** (Zoo, AdamCAD, Autodesks „Neural CAD“ aus Project Bernini, Onshape über FeatureScript): Maße per Wort. Tests zeigen:
  Was richtig aussieht, ist noch kein gutes bearbeitbares Modell.

**Folgerung:** Genauigkeit entsteht aus Bezügen (gleich, parallel, auf, Maß) und aus Angeboten beim Ziehen, nicht aus Zahlenfeldern.
Neu wäre: Bezüge mit Stärke („ungefähr gleich lang“) für organische Formen. CAD kennt nur harte Bezüge, das organische Formen gar keine.

### 2.5 2D und 3D verbinden

- **Adobe Project Neo** (Beta, Stand 2026 unklar): 3D bauen und als bearbeitbare Vektoren an Illustrator geben, SVG hereinziehen und
  aufblasen; Stile wie „Vektor“ und „Illustrativ“; zuletzt ein Zeichenstift und „flüssige Vektoren“, die beim Verschmelzen bearbeitbar
  bleiben.
- **Spline Hana V2:** 2D-Fläche mit echten 3D-Objekten, Ausgabe als SVG und PDF.
- **Blender Grease Pencil:** 2D-Striche im 3D-Raum.
- **Live2D, Cartoon Animator** (360°-Kopf aus Zeichnungen), **Moho:** 2,5D aus Zeichnungen (Studio-Recherche 03, 04).
- **Eigene Arbeit:** Ozzy-Figur dreht den Kopf 360° aus deinen Schlüsselzeichnungen, an den Schlüsseln exakt. Den 3D-Weg fürs Maskottchen
  hast du verworfen („gerechnetes 3D kein bisschen“).

**Folgerung:** Der Markt verbindet 2D und 3D als Einbahnstraße (3D wird Vektorbild). Neu wäre: beides in einem Dokument mit denselben
Linien, in beide Richtungen, wobei gezeichnete 2D-Schlüssel die Wahrheit bleiben dürfen.

### 2.6 Bewegung ohne Zeitleiste

- **Cascadeur** (2026.1 im April, 2026.2 im August): AutoPosing (wenige Punkte ziehen, die KI setzt den Rest; Hände und Füße passen sich
  der Umgebung an; Vierbeiner verbessert), AutoPhysics (macht eine Schlüsselbild-Animation physikalisch glaubwürdig), KI-Zwischenbilder,
  den Charakter einer Bewegung aus einer Vorlage übertragen, neu Ebenen und Easing.
- **Video zu Bewegung:** Autodesk Flow Studio (Körper, Gesicht und Hände aus normalem Video, auch ganze Szenen), Move AI, Rokoko Vision,
  DeepMotion.
- **Text zu Bewegung:** Kimodo, HY-Motion (siehe 2.2).
- **Vorspielen:** Procreate Dreams, Adobe Character Animator, Dreams (Studio-Recherche 05, 12).
- **Urteil der Studio-Recherche (20.11.):** Der Reglerraum ist der Unterbau, die Zeit ist ein Regler unter anderen, Vorspielen ist eine
  Eingabe, Physik eine immer laufende Ebene, die klassische Zeitleiste bleibt klein.

**Folgerung:** Das Neue ist für Menschen-Skelette und Bewegungsdaten gebaut. Für Cartoon-Figuren mit Formschlüsseln, Maul, Quetschen und
Dehnen gibt es fast nichts. Genau das brauchen early earle und deine Figuren.

### 2.7 Material, Shader, Partikel

- **Shader per Wort:** Figmas Agent schreibt Shader im Gespräch (offene Beta).
- **Material aus Text oder Foto:** Unity AI Material Generator, Lumion (März), Substance 3D Sampler 6 (Nutzer berichten: Text geht besser
  als Foto).
- **EmberGen:** Rauch und Feuer in Echtzeit; die kommende Version 2 rechnet nur dort, wo etwas los ist (in einer Vorschau eine Milliarde
  Voxel interaktiv). Bedient wird trotzdem über Knoten.
- **Unreal Niagara, Unity VFX Graph, Blender-Knoten:** mächtig, aber Knotengraphen, also genau das, was du ersetzen willst.
- **Eigene Arbeit:** 94 Shader in elf Gruppen, je mit Stil-Reglern; die Streifen-Demo zeigt alle als Streifen zum Wischen.

**Folgerung:** Eine KI schreibt Shader-Code gut; der Shader-Strang ist der Beleg. Es fehlt eine Bedienung, die das Ergebnis als Probe auf
der eigenen Form zeigt und nur wenige Regler übrig lässt.

### 2.8 Die Lücke

Kein Werkzeug verbindet:

1. eine Grundform, die Mensch und KI gleich gut lesen und bearbeiten (Linien statt dichter Netze),
2. organisches Formen mit Genauigkeit auf Abruf,
3. 2D und 3D in einem Dokument mit denselben Linien, in beide Richtungen,
4. Bewegung über Posen, Regler, Verhalten und Vorspielen, gemacht für Cartoon-Figuren,
5. Looks mit wenigen Reglern als Proben auf der Form, live auf dem iPad,
6. einen eingebauten Geschmack, damit jeder Zustand gut aussieht.

Spline ist am nächsten (Browser, Designer, Agenten), aber im Kern klassisch. Dreams war im Geist am nächsten und ist Geschichte.

## 3 Was Ozzy schon mitbringt

| Strang (Zweig) | Was er kann | Rolle in der Suite |
| --- | --- | --- |
| Ozzy (`claude/ozzy`) auf dem Kern „Kurven als Wahrheit“ | Silhouette zeichnen, aufblasen; Linien, Loops, Punkte und Griffe im Raum; eingerastete und Vier Ansichten; Seifenhaut; liquid drop; iPad mit Stift | Formen in 3D und die Grammatik der ganzen Suite |
| Objekte, Spiegel, Nähte | mehrere Objekte, Spiegel an und aus, Naht | Szenen aus Teilen |
| Paint („Wachs“, „Tinte“) | Farblinien auf der Haut, Füllen, weiche Kanten, Ebenen und Ebenen-Ansicht | Färben |
| Maul, Zähne, Zunge (`claude/ozzy-maul`) | Maul als echte Form, Posen in Scheiben, Zähne je Pose, Backen ins Spielnetz (höchstens 8 000 Dreiecke), „Wie im Spiel“ | Beleben (Posen) und Ausgeben |
| Shader (`claude/ozzy-shader`) | 94 Shader in elf Gruppen, Stil-Regler, Streifen-Demo | Looks |
| Studio (`claude/ozzy-animation-physics-294508`, ruht) | Recherche, Konzept und Plan M0 bis M11 für einen 2D-Vektor-Figureneditor (Morph, Knochen, Posen, Physik, Spiellogik ohne Code); M0 gebaut | Figuren in 2D, Bewegung, Physik, Logik |
| Ozzy-Figur (2,5D) | Kopf 360° aus deinen Schlüsselzeichnungen | Brücke zwischen Zeichnung und Drehung |
| Claude in Ozzy (Recherche 18.11.) | erlaubte Wege: Ozzy als Claude-Seite, API mit eigenem Schlüssel, App Attest, MCP; die Anmeldung mit dem Claude-Abo in fremden Apps ist verboten | KI-Anbindung |

**Was davon selten ist** (eigene Einschätzung):

- **Linien als Wahrheit** machen Formen klein, benennbar und bearbeitbar. Das ist für eine KI wertvoller als jede Erzeugung von Netzen.
- **Die Seifenhaut** ist ein eingebautes „kein hässlicher Zustand“: Jeder Umriss wird rund und schön.
- **Die Vier Ansichten** sind feste Blickwinkel, an denen sich Mensch und KI gleichermaßen orientieren können.
- **liquid drop** ist eine eigene, durchgehende Sprache der Bedienung. Die meisten Programme haben nur Knöpfe.
- **Backen mit Budget** („Wie im Spiel“) führt bis ins echte Spiel. Die meisten Spielzeuge enden vor der Produktion.

**Beobachtung:** Die Teile liegen auf sechs Zweigen; nichts davon ist zusammengeführt. Eine Suite braucht einen Stamm. Studio passt schon
gut: Dort ist der Regler bereits der Grundbaustein.

## 4 Leitideen

1. **Linien sind die Wahrheit, in 2D und 3D.** Eine 2D-Figur und eine 3D-Form bestehen aus denselben Linien, Punkten und Griffen; 2D ist
   ein Blatt im Raum. Linien sind kompakt und benennbar, also auch für eine KI lesbar.
2. **Kein hässlicher Zustand.** Die Seifenhaut macht aus jedem Umriss etwas Rundes. Das gilt dann für alles: Jeder Look, jede Pose, jede
   Bewegung, jedes Licht startet mit Geschmack (Federn statt linearer Übergänge, Paletten statt Zufallsfarben). Profis schalten das
   Sicherheitsnetz ab.
3. **Tiefe auf Abruf.** Kein Programm für Anfänger und keins für Profis, sondern dieselben Werkzeuge in drei Tiefen: **Spielen** (Rezepte,
   Vorschläge, Varianten), **Gestalten** (alle Werkzeuge und Regler), **Bauen** (eigene Looks, eigene Verhalten, Code). Keine Modi, nur
   Linsen, die gelten, solange man hält (Studio-Recherche 12).
4. **Vier Wege zu jedem Schritt:** Hand, Wort, Vorbild, Rezept (Abschnitt 6).
5. **Was die KI tut, ist ein normaler Schritt.** Man sieht sie arbeiten, kann jeden Schritt zurücknehmen und von Hand weitermachen. Sie
   liefert Linien, Regler und Looks, keine fertigen Bilder.
6. **Verhalten vor Schlüsseln.** Was sich von selbst bewegen kann, bewegt sich von selbst (atmen, nachschwingen, gehen). Schlüssel nur
   dort, wo man Regie führen will.
7. **Live oder gar nicht.** Jeder Regler bewegt das Bild im selben Moment. Die Kosten sind immer sichtbar.
8. **Ein Dokument, viele Ziele.** Dieselbe Szene geht ins Spiel (gebacken), in ein Video, als SVG zu Illustrator, als glTF in andere
   Programme, als lebendes Fenster in ein Claude-Gespräch.

## 5 Das Fundament: fünf Bausteine

| Baustein | Was er ist | In 2D | In 3D | Was die KI daran liest |
| --- | --- | --- | --- | --- |
| **Linien** | Loops, Punkte, Griffe, Kanten | Umriss und Teile einer Figur | Silhouette, Loops quer und längs, Maul | „Ohr links: Loop mit 7 Punkten“ |
| **Looks** | Shader mit 3 bis 6 benannten Reglern und bekannten Kosten | Fläche „Comicdruck“ | Haut „Earle-Fell“ | Name, Regler, Kosten je Bild |
| **Regler** | benannter Wert mit Bereich; eine Pose ist ein Stand der Regler; auch die Zeit ist ein Regler | Kopfdrehung, Laune | Kiefer, Bauch, Fressen | „Fressen 0,7“ |
| **Verhalten** | Bewegung von selbst, mit ein bis zwei Reglern | Atmen, Blinzeln | Nachschwingen, Gehen, Folgen | „Wackeln, Stärke 0,3“ |
| **Bezüge** | Beziehung zwischen Dingen, hart oder weich | gleich lang, auf dem Boden | symmetrisch, tangential, Maß | „Schwanz = 2 × Kopf, weich“ |

Daraus folgt alles Weitere: Eine Animation sind Regler über die Zeit (aus Verhalten, Vorspielen und Übergängen). Ein Rezept ist eine Folge
von Befehlen mit Erklärungen. Eine Szene sind Objekte mit Kamera und Licht.

**Eine Befehlsschicht für alle.** Alles, was man tun kann, ist ein Befehl („Loop einfügen“, „aufblasen“, „Pose anlegen“, „Look
anwenden“, „Bezug setzen“). Die Hand, die KI, die Rezepte und die Proben rufen dieselben Befehle; jeder Befehl ist ein Schritt fürs
Zurücknehmen. Eine Textform (Arbeitstitel „Ozzy-Schrift“) schreibt das Dokument und die Befehle lesbar auf.

```
  Hand (Stift, Finger, Maus)   Wort (Claude, andere KI)   Vorbild (Foto, Skizze, Video)   Rezept
             \                          |                           |                  /
              ─────────────────────── Befehlsschicht ──────────────────────────────────
                                                |
                      Dokument: Linien · Looks · Regler · Verhalten · Bezüge
                                                |
          Rechnen: Haut aus Linien (Kern) · 2D-Morph und Physik (Studio) · Looks (WebGPU)
                                                |
          Ausgeben: Spiel (Backen) · Video · SVG · glTF · lebendes Fenster im Claude-Gespräch
```

## 6 Der Ablauf

**Sechs Stationen** als Tropfen in einer Leiste. Keine Modi: Man springt jederzeit, das Programm schlägt die nächste Station vor.

**Zeichnen → Formen → Färben → Beleben → Inszenieren → Ausgeben**

**Vier Wege an jeder Station:**

| Station | Hand | Wort | Vorbild | Rezept |
| --- | --- | --- | --- | --- |
| Zeichnen | P, N, e, E auf dem Blatt | „ein dicker Vogel von der Seite“ | Foto oder Skizze durchscheinen lassen, den Umriss erkennen | „Umriss in drei Zügen“ |
| Formen | Aufblasen, Loops, Ziehen, Bezüge | „Ohren länger, Schnauze runder“ | erzeugtes 3D-Modell als Vorlage unter der Form | „Kopf, Körper, Beine“ |
| Färben | Malen (Wachs, Tinte), Looks wischen | „Earle-Fell, Abendlicht“ | Farben und Muster aus einem Foto | „Ein Look in vier Schritten“ |
| Beleben | Posenfeld, Vorspielen, Perlenschnur, Verhalten | „schleicht zum Napf und frisst gierig“ | sich selbst vor der Kamera vorspielen; die Stimme bewegt das Maul | „Fressen in fünf Schritten“ |
| Inszenieren | Figuren auf die Bühne, Kamera vorspielen | „Nahaufnahme, wenn er rülpst“ | Storyboard-Skizze | „Kurzfilm in drei Einstellungen“ |
| Ausgeben | „Wie im Spiel“, Backen | „fürs iPhone, 60 Bilder je Sekunde“ | – | „Ins Spiel bringen“ |

**Drei Durchgänge** (ausgedacht, um den Ablauf zu prüfen):

- **Nicole, Einsteigerin, 15 Minuten.** Sie öffnet die Suite; drei große Tropfen: Form, Figur, Szene. Sie tippt „Form“ und folgt dem
  Rezept. Ein Umriss mit dem Finger; einen falschen gibt es nicht, die Seifenhaut rundet. Aufblasen. Durchscheinend schlägt das Programm
  Ohren und Beine vor; sie tippt zwei Ohren und vier Beine an. „Mehr davon“: sechs Varianten der Proportionen, sie nimmt die niedlichste.
  Sie wischt durch die Looks und bleibt bei „Knete“. Ein Tippen aufs Maul, und die Form kann fressen. Sie legt „atmen“ und „wackeln“ auf
  den Körper. Im Posenfeld zieht sie einen Punkt von „hungrig“ über „frisst“ nach „satt“ und nimmt die Fahrt auf. Sie sagt: „Lass ihn
  danach rülpsen.“ Fertig, sie schickt es dir.
- **Florian, Profi, zwei Stunden.** Du beginnst mit P in den Vier Ansichten, hältst die Ohren mit einem weichen Bezug gleich lang, baust
  einen Helm als hartes Teil mit Rundungen und lässt ihn weich mit dem Kopf verschmelzen. Mit Claude schreibst du einen neuen Look
  („Earle-Fell in harten Stufen, wärmer“) und stellst die Regler ein. Den Kopf spielst du mit dem Stift vor, den Schwanz danach mit dem
  Finger; das Timing schiebst du auf der Perlenschnur nach. Ein Wächter meldet eine Falte am Kiefer; du behebst sie. Backen, ab ins Spiel.
- **Claude, im Hintergrund.** Liest die Form in der Ozzy-Schrift, baut sechs Varianten in eigenen Zweigen, rendert je vier Ansichten,
  prüft sie mit den Wächtern und bietet die besten drei an. Du nimmst eine und arbeitest von Hand weiter.

## 7 Deine Fragen, je mit Möglichkeiten

### 7.1 Genauigkeit wie bei CAD, ohne den organischen Stil zu stören

| | Möglichkeit | Wie es sich anfühlt |
| --- | --- | --- |
| A | **Genauigkeit auf Abruf:** Frei ist Standard; wer beim Ziehen kurz zögert, bekommt Angebote. Am Ende eines Strichs halten macht Kreis, Gerade oder Bogen (wie QuickShape); beim Ziehen zeigen feine Linien „gleiche Höhe wie das andere Ohr“, „parallel“, „Mitte“, „tangential“ (wie SketchUp). | Wer schnell zieht, bleibt organisch; wer langsam wird, wird genau. |
| B | **Weiche Bezüge:** Ein Bezug hat eine Stärke von „frei“ bis „exakt“. „Ungefähr gleich lang“ hält zwei Ohren beieinander, ohne sie gleich zu machen. Bezüge erscheinen als kleine Zeichen an der Linie; antippen schaltet sie. | Die Form driftet nicht weg und bleibt trotzdem lebendig. |
| C | **Maß beim Ziehen und per Wort:** während des Ziehens Zahlen tippen („2x“, „45°“, „= Kopf“) oder sagen („Schwanz doppelt so lang wie der Kopf“); die KI macht daraus einen Bezug. | Genauigkeit ohne Eingabefeld. |
| D | **Proportionen statt Millimeter:** Raster in Kopf-Einheiten, ein Regler fürs Kindchenschema, Maße in „Augen“ oder „Köpfen“. | Die Genauigkeit, die Figurendesigner wirklich brauchen. |
| E | **Ton und Teile:** zwei Arten von Objekten auf denselben Linien: organische (Seifenhaut) und harte Teile (ziehen, drehen, abrunden, ausschneiden), die weich verschmelzen. | Helm, Rad oder Schwert neben dem Tier, ohne zweites Programm. |
| F | **Krümmung sichtbar:** ein Krümmungskamm an den Loops und eine Probe, die Dellen und Falten meldet. | Ein Profiwerkzeug, das hübsch aussieht. |

**Empfehlung:** A und B zuerst. Beide sind klein und passen zu deiner Bedienung, und die Bezüge wirken auf die Linien, bevor die Haut
gerechnet wird; am Rechenkern ändert sich nichts. D für Figuren. C kommt mit der KI-Schicht fast von selbst. E später, harte Teile sind
ein eigenes großes Feld.

### 7.2 Die Verbindung mit 2D

| | Möglichkeit | Was es bringt |
| --- | --- | --- |
| A | **Blatt und Raum:** ein Dokument; 2D-Blätter liegen im Raum. Jedes Blatt lässt sich aufblasen, jede Form abziehen. Dieselben Werkzeuge in beiden. | Eine Suite statt zweier Programme. |
| B | **Abziehen:** aus einer 3D-Form die 2D-Schlüssel (Front, 3/4, Seite) mit denselben Ankern erzeugen, als Start für eine Studio-Figur. Du korrigierst; deine gezeichneten Schlüssel bleiben die Wahrheit („Front genau, Seite und 3/4 annähern“). | Schneller Start für 2D-Figuren, ohne dass 3D den Look bestimmt. |
| C | **Aufblasen von Figuren:** Teile einer 2D-Figur werden 3D-Formen (der Weg von Monster Mash). | Aus einer Illustration eine drehbare Form. |
| D | **Gemeinsame Regler:** Eine Pose wie „Fressen“ gilt für die 2D-Figur und die 3D-Form, je in ihrer Darstellung. | Einmal Regie, zwei Ausgaben. |
| E | **Vektor-Ausgabe:** jede Ansicht als SVG oder PDF (wie Project Neo); die Linienansichten von Ozzy sind fast schon Illustrationen. | Für Illustratoren sofort ein Grund, die Suite zu nutzen. |
| F | **Getrennt mit Austausch:** Studio und Ozzy bleiben zwei Programme, die Dateien tauschen. | Am einfachsten, aber kein Gefühl einer Suite. |

**Empfehlung:** A als Rahmen, E früh (klein, großer Nutzen), B als Beweis an Ozzy-Figur, D sobald beide Posen haben. Studio bleibt der
2D-Motor; vor M1 sollte sein Datenmodell mit den fünf Bausteinen abgeglichen werden.

### 7.3 Animation einfach und intuitiv

| | Möglichkeit | Wie es geht |
| --- | --- | --- |
| A | **Posenfeld:** Posen liegen als Tropfen auf einer Fläche. Ein Punkt, den man durchs Feld zieht, mischt die Nachbarn; die aufgenommene Fahrt ist die Animation (Spatial Keyframing, Igarashi 2005; Live2D). | Animieren wie Malen. |
| B | **Vorspielen in Schichten:** einen Teil nach dem anderen vorspielen (Kopf, dann Schwanz); jeder Durchgang eine Schicht, geglättet (Layered Acting, 2003). | Timing aus der Hand, nicht aus Zahlen. |
| C | **Verhalten-Tropfen:** atmen, blinzeln, wackeln, schauen auf, folgen, hüpfen, gehen; auf einen Teil ziehen, zwei Regler. | Leben ohne einen einzigen Schlüssel. |
| D | **Perlenschnur:** Die Bahn eines Teils liegt als Perlenkette im Bild, eine Perle je Bild. Perlen zusammenschieben heißt langsamer; ihr Abstand zeigt Ausholen und Abbremsen. | Ersetzt den Kurveneditor, im Bild statt in einem Diagramm. |
| E | **Cartoon-Regler:** Quetschen und Dehnen, Ausholen, Überschwingen, Nachziehen als wenige Regler für alles („Gummi“, „Wucht“). | Die Disney-Prinzipien gratis. |
| F | **Regie per Wort:** „Er schleicht zum Napf, frisst gierig, rülpst.“ Die KI setzt das aus Posen, Verhalten und Übergängen zusammen, als bearbeitbare Bausteine, nicht als fertige Bewegungsdaten. | Bleibt in deinem Stil und bearbeitbar. |
| G | **Gesicht und Stimme:** Kamera aufs Gesicht, die Figur macht es nach; die Stimme bewegt das Maul. | Passt zum Maul-System. |
| H | **Takt-Leiste für Profis:** Eine kleine klassische Zeitleiste bleibt als Linse (Studio-Recherche). | Volle Kontrolle, wenn man will. |

**Empfehlung:** A und C zuerst (schnelles Staunen, gilt für 2D und 3D, die Posen von Maul und Fressen sind schon da), dann B und D, F
sobald die Befehlsschicht steht, G später, H als Linse.

### 7.4 Shader, Material und Partikel live

| | Möglichkeit | Wie es geht |
| --- | --- | --- |
| A | **Looks als Proben:** auf der eigenen Form durchwischen (die Streifen-Demo wird Teil der Suite), 3 bis 6 Regler je Look. | Wählen statt bauen. |
| B | **Varianten:** „Mehr davon“ zeigt sechs Stände der Regler eines Looks; man nimmt einen und wiederholt (Design Galleries, 1997). Keine Mischungen fremder Looks (dein Wort: einzelne Shader ausfeilen). | Suchen, ohne die Regler zu kennen. |
| C | **Look per Wort oder Foto im sicheren Rahmen:** Die KI schreibt oder ändert den Shader-Code; Ozzy übersetzt ihn, misst die Kosten und rendert eine Probe; erst dann erscheint er. | Neue Looks in Minuten, ohne Absturz und ohne Tempoverlust. |
| D | **Malen statt Masken:** mit Paint (Wachs, Tinte, Ebenen) festlegen, wo welcher Look gilt. | Schon gebaut, nur zu verbinden. |
| E | **Ströme:** Partikel als gezeichneter Strich (die Bahn), ausgehend von einem Teil, an der Haut abprallend; Vorlagen wie Funken, Dampf, Sabber, Staub beim Landen, Feuer. | Partikel ohne Kräftefelder und Knoten. |
| F | **Licht als Stimmung:** ein Regler für Tageszeit und Stimmung, in Earle-Paletten und harten Stufen. | Ein Griff statt zehn Lampen. |
| G | **Tempo-Tropfen:** Kosten je Bild und je Look immer sichtbar, ein Budget je Ziel (iPhone, iPad, Mac), Warnung vor dem Überschreiten; „Wie im Spiel“ vereinfacht. | Live bleibt live. |

**Technik:** WebGPU läuft in Chrome seit 2023 und in Safari auf Mac, iPhone und iPad seit Herbst 2025; three.js mit TSL ist schon im
Projekt. Partikel rechnet die Grafikkarte (Compute), Looks werden vorab übersetzt, die Kosten je Look gemessen.

**Empfehlung:** A und G zuerst (zum Teil schon da), C als der kluge Schritt, E als erster Partikel-Beweis (Dampf und Sabber zur
Fressen-Pose), D verbindet Paint.

### 7.5 Wie das Programm intelligent wirkt

Intelligent wirkt, was vorausdenkt, ohne dazwischenzufunken. Vieles davon braucht keine große KI: Regeln, Löser und kleine Modelle im
Programm sind sofort da, kostenlos und ohne Netz. Die große KI (Claude) braucht es für Worte, Namen, Varianten und Code.

| | Möglichkeit | Wie es wirkt |
| --- | --- | --- |
| A | **Geister-Vorschläge:** Nach dem Aufblasen erscheinen durchscheinend mögliche nächste Teile (Ohren, Beine, Augen); Tab nimmt sie. Autovervollständigen für Formen. | Es denkt mit. |
| B | **Teile erkennen und benennen:** Das Programm weiß, was Ohr, Schnauze und Bauch ist. | Man kann alles beim Namen nennen. |
| C | **Zeigen und Sagen:** mit dem Stift auf das Ohr zeigen und sagen „so wie bei einem Fuchs“ (Put-That-There, 1980). | Die natürlichste Art, einen Wunsch zu sagen. |
| D | **KI-Zeiger:** Claude arbeitet sichtbar als zweiter Zeiger in der Szene, wie ein Kollege in Figma; jederzeit anzuhalten. | Vertrauen durch Zusehen. |
| E | **Varianten-Zweige:** KI und Mensch probieren in Zweigen, nebeneinander vergleichbar, dann übernehmen. | Mut zum Ausprobieren. |
| F | **Vormachen:** „Zeig mir, wie du das gemacht hast“: Die KI spielt ihre Schritte langsam mit den echten Werkzeugen ab. | Einsteiger lernen beim Zusehen. |
| G | **Stilbuch:** die Regeln des Projekts (keine Outlines, Verläufe in harten Stufen, Lobster, Palette) als bearbeitbares Blatt, an das sich die KI hält, so wie dieses Projekt mit seinem Projektgedächtnis arbeitet. | Die KI arbeitet in deinem Stil. |
| H | **Wächter:** Proben, die freundlich melden: Falten, Kerben, schwebende Teile, zu viele Dreiecke, flackernde Kanten. Deine Regeln („sichtbare Falten sind Fehler“) werden Automatik. | Es passt auf. |
| I | **Kreuzen und Züchten:** Zwei Formen gekreuzt ergeben ein Kind mit gemischten Linien, Looks und Posen; über Generationen züchten (Picbreeder, Spore). Passt zum Verschmelzen im 2048-Spiel. | Ein Erkennungszeichen der Suite. |
| J | **Werkstatt im Hintergrund:** Die KI bereitet Knochen, Gewichte, Backen und Varianten vor und bietet sie an; sie überschreibt nie. | Die Fleißarbeit verschwindet. |

**Empfehlung:** A, H und G zuerst (wenig KI, wirken sehr klug), D und E mit der MCP-Anbindung, I als Erkennungszeichen, verknüpft mit dem
Spiel.

## 8 Vier Gesamtbilder

| | Gesamtbild | Kern | Einsteiger | Profi | KI | passt zu Ozzy | Aufwand |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Werkstatt** | ein endloser Raum mit Blättern und Formen; die Werkzeuge ändern sich mit dem, was man anfasst | ●●○ | ●●● | ●●○ | ●●● | mittel |
| 2 | **Bühne** | Darsteller bauen (Form, Look, Posen, Verhalten), dann auf der Bühne Regie führen | ●●○ | ●●○ | ●●● | ●●○ | mittel |
| 3 | **Rezeptbuch** | ein Pfad aus Schritten mit je einer Entscheidung; Rezepte teilen und weiterbauen | ●●● | ●○○ | ●●○ | ●○○ | gering, braucht aber 1 darunter |
| 4 | **Gespräch zuerst** | Gespräch und Vorschau; Werkzeuge erscheinen beim Anfassen | ●●● | ●○○ | ●●● | ●○○ | gering, aber alle machen es |

**Empfehlung:** 1 als Kern, 2 als Zoomstufe desselben Raums (näher heran: Werkstatt; weiter weg: Bühne), 3 als Schicht darüber für
Einsteiger, und die KI als Kollege mit Zeiger statt als Gesprächsfenster, das alles verdeckt. 4 nicht als Hauptform: Deine Stärke sind
die Werkzeuge, nicht der Chat.

## 9 Aus meiner Sicht als KI

### 9.1 Was ich gut kann und was nicht (ehrlich, Stand heute)

- **Gut:** Code (Shader, Löser, Werkzeuge), Struktur, Namen, Pläne, Regeln einhalten, Worte in Werte übersetzen, viele Varianten
  durchprobieren, Ergebnisse gegen Regeln prüfen, erklären.
- **Mittel:** Bilder beurteilen. Ich sehe Bildschirmfotos und erkenne grobe Fehler; feinen Geschmack treffe ich nicht verlässlich.
- **Schwach:** räumliches Feingefühl (Punkte frei im Raum setzen ohne Rückmeldung), das Gefühl einer Bewegung, Geschmack ohne Vorbild,
  lange Ketten ohne Prüfung. Meine Schätzung vom 18.11. gilt weiter: eine komplexe Figur aus einem einzigen Satz ohne Nacharbeit eher 1
  von 10; in Runden mit Ansichten und deinen Korrekturen realistisch.

**Daraus folgt die Arbeitsteilung:** Die KI macht Struktur, Einrichtung, Varianten, Code und Prüfungen; der Mensch macht Geschmack,
Vorspielen und den letzten Schliff. Das Werkzeug muss mir dafür relative Befehle geben („doppelt so lang wie“, „auf der Linie von“),
Bezüge statt Koordinaten, schnelle Bilder aus festen Ansichten und die Ergebnisse der Wächter als Daten.

### 9.2 Was ein Werkzeug braucht, damit eine KI gut darin arbeitet

1. **Eine Textform** (Ozzy-Schrift): kompakt, benannt, vergleichbar; eine Form in ein paar hundert Zeilen. Linien machen das möglich,
   dichte Netze nicht.
2. **Befehle mit Bedeutung,** dieselben wie für die Hand; jeder ein Schritt zum Zurücknehmen; ohne Fenster ausführbar und schnell, damit
   eine KI fünfzig Varianten durchprobieren kann.
3. **Sehen:** Bilder aus festen Ansichten, mit den Namen der Teile darüber. Die Vier Ansichten sind dafür ideal.
4. **Zweige:** Die KI arbeitet in Varianten, der Mensch übernimmt.
5. **Absicht speichern:** zu jedem Schritt das Warum („Ohren länger: niedlicher“), damit „nimm das zurück, aber lass die Farbe“ geht.
6. **Stilbuch und Grenzen:** Regeln des Geschmacks, Budgets (Zeit je Bild, Dreiecke), ein sicherer Rahmen für Code statt freier Skripte.
7. **Drei Anschlüsse:** ein MCP-Server auf dem Rechner (Claude Code, Claude Desktop und andere KIs bedienen Ozzy), eine MCP-App (Ozzy als
   lebendes Fenster im Gespräch) und eine Eingabe im Programm (mit eigenem API-Schlüssel; die Anmeldung mit dem Claude-Abo in fremden
   Apps ist verboten, Recherche 18.11.).

### 9.3 Wie sich die Arbeit verändert (eigene Einschätzung)

- **Bis 2027 bedienen Agenten alle großen Programme.** Menschen geben die Richtung, die KI erledigt die Fleißarbeit: Gewichte,
  Zwischenbilder, Varianten, Ausgabe.
- **Erzeugen wird billig.** Der erste Entwurf verliert an Wert. Kontrolle, Stil, eine Figur, die über viele Szenen gleich bleibt, und
  Bearbeitbarkeit gewinnen.
- **Gespräch und Hand verschmelzen.** Reiner Chat ist für Bilder zu ungenau, reine Handarbeit zu langsam. Gewinnen wird, wer einen
  gemeinsamen, sichtbaren Zustand bietet, an dem Mensch und KI gleichzeitig arbeiten, wie zwei Leute in einem Figma-Dokument.
- **Ein Mensch, viele Helfer.** Werkzeuge werden zu Bühnen, auf denen ein Mensch mehrere KI-Helfer lenkt: einer richtet Knochen ein, einer
  animiert, einer schreibt Shader, einer prüft.
- **Lernen beim Zusehen.** Einsteiger sehen der KI zu, wie sie es mit den echten Werkzeugen macht, statt Anleitungen zu suchen.
- **Echtzeit überall.** Was nicht live ist, wirkt alt.
- **Eigener Stil wird wertvoller.** Wenn alle dieselben Generatoren nutzen, sieht alles gleich aus. Eine Suite mit eingebautem Geschmack
  hat eine Stimme.
- **KIs werden Nutzer und Vertriebsweg.** Viele werden Werkzeuge über ihren Assistenten finden: „Claude, bau mir ein Maskottchen“, und
  Claude greift zum besten Werkzeug, das es bedienen kann. Das beste Werkzeug zu sein, mit dem eine KI Figuren baut, ist ein eigener Weg
  zu Nutzern.

### 9.4 Risiken

| Risiko | Gegenmittel |
| --- | --- |
| Einheitslook der KI | Stilbuch; dein Geschmack als Voreinstellung |
| Gefühl, es sei nicht mehr meins | Die KI liefert Schritte und Linien, keine fertigen Bilder |
| Kosten der KI-Aufrufe | eingebaute Klugheit lokal; große KI nur für Worte; Nutzer mit eigenem Konto oder Schlüssel |
| Abhängigkeit von einem Anbieter | offene Schnittstelle (MCP) für jede KI, offene Textform |
| Umfang | Eine Suite ist ein Vorhaben über Jahre (Studio allein grob 120 bis 200 Arbeitstage laut Recherche): kleine Beweise, die einzeln nützen; early earle als erster Kunde |
| Zersplitterung | sechs Zweige ohne Stamm: zusammenführen, auf dein Wort |
| Insel wie Dreams | Web, iPad, Mac; Ausgabe in übliche Formate |

## 10 Ideenspeicher

Zum Auswählen, nummeriert. Nichts davon ist gebaut oder getestet.

**Form und Genauigkeit**

1. Zögern rastet ein: am Ende eines Strichs halten, und er wird Kreis, Gerade, Bogen oder gespiegelt; danach mit einem Griff nachstellen.
2. Schlauer Fang: gleiche Höhe wie, parallel, tangential, Mitte, gleich lang; als feine Linie mit kleinem Tropfen; kurz verweilen nimmt an.
3. Weiche Bezüge mit einer Stärke von „frei“ bis „exakt“.
4. Maß beim Ziehen: „2x“, „45°“, „= Kopf“ tippen oder sagen.
5. Proportionsraster in Kopf-Einheiten, ein Regler fürs Kindchenschema.
6. Krümmungskamm an Loops und eine Glätte-Probe.
7. Ton und Teile: organische Formen und harte Teile auf denselben Linien, weich verschmolzen.
8. Messen mit ⌥: Abstände und Winkel beim Darüberfahren, auch im Raum.
9. Spiegel, Kreis, Reihe: spiegeln, rundum (Blüte, Seestern), entlang einer Linie wiederholen (Rückenplatten, Zähne).
10. Bausteine: Augen, Zähne, Krallen, Hörner, die auf der Haut einrasten und ihr folgen (Spore).

**2D und 3D**

11. Blatt und Raum: 2D-Blätter im Raum; aufblasen, abziehen.
12. Abziehen: 3D-Form zu 2D-Schlüsseln mit denselben Ankern.
13. Aufblasen von Figuren: Teile einer 2D-Figur werden Formen.
14. Vektor-Ausgabe jeder Ansicht als SVG und PDF.
15. Gemeinsame Posen für 2D-Figur und 3D-Form.
16. Ebenen in der Tiefe (Multiplane) für Parallaxe; Formen in 2D-Szenen.
17. Striche, die auf der Haut haften (die Farblinien von Paint sind schon Linien auf der Haut).

**Bewegung**

18. Posenfeld: Posen als Tropfen, die Fahrt aufnehmen.
19. Vorspielen in Schichten.
20. Perlenschnur fürs Timing.
21. Verhalten-Tropfen mit je zwei Reglern.
22. Cartoon-Regler: Gummi, Wucht, Ausholen, Überschwingen.
23. Gehen für jeden Körper: Bewegung, die sich jeder Zahl von Beinen anpasst (Spore); Füße mit Klicks setzen.
24. Die Stimme bewegt das Maul.
25. Das eigene Gesicht vorspielen; die Zuordnung nach Beispiel („so guckt er, wenn ich so gucke“).
26. Regie per Wort aus Bausteinen.
27. Nachschwingen von selbst, in Ruhe genau null (Studio: In Ruhe ist die Figur genau ihre Zeichnung).
28. Zeitpinsel: über einen Moment der Bewegung malen, um ihn zu dehnen oder zu übertreiben.
29. Kamera vorspielen: das iPad als Fenster in die Szene bewegen oder eine Bahn zeichnen.

**Look, Licht, Ströme**

30. Looks als Proben auf der eigenen Form.
31. Varianten eines Looks („mehr davon“).
32. Look per Wort oder Foto im sicheren Rahmen.
33. Malen statt Masken.
34. Licht als Stimmung, in Earle-Paletten und harten Stufen.
35. Ströme: Partikel als gezeichnete Bahn, mit Vorlagen.
36. Tempo-Tropfen und Budget je Ziel.
37. „Wie im Spiel“ für jedes Ziel.

**Intelligenz**

38. Geister-Vorschläge mit Tab.
39. Teile erkennen und benennen.
40. Zeigen und Sagen.
41. KI-Zeiger in der Szene.
42. Varianten-Zweige.
43. Vormachen.
44. Stilbuch.
45. Wächter.
46. Kreuzen und Züchten.
47. Werkstatt im Hintergrund.
48. Ozzy-Schrift, MCP-Server, Ozzy als lebendes Fenster im Claude-Gespräch.
49. Erzeugtes 3D (Meshy, Tripo, Hunyuan3D) nur als durchscheinende Vorlage, Loops darüberlegen.
50. Rezepte: aufnehmen, teilen, von der KI aus einem Ziel schreiben lassen.

**Gemeinschaft, Ausgabe, Gefühl**

51. Teilen und Weiterbauen mit Namensnennung (Dreams).
52. Ausgabe überall: Spiel, Video, SVG, glTF; später USD und Formate für Web-Animation.
53. Klang und Haptik: Einrasten klickt fein (iPad, Trackpad), Aufblasen pustet, Tropfen platschen leise; abschaltbar (Studio-Recherche
    14d).

## 11 Ein möglicher Weg in kleinen Beweisen

Jede Stufe nützt für sich und endet mit einer Probe an deinen Formen. Gebaut wird nur auf dein Wort.

| Stufe | Inhalt | Probe (Kriterium) |
| --- | --- | --- |
| 0 | **Ein Stamm:** die Stränge (Objekte, Paint, Maul, Shader) zusammenführen | alle vorhandenen Proben grün in einer Linie |
| 1 | **Ozzy-Schrift, Befehlsschicht, MCP-Server auf dem Rechner** | Claude baut aus zehn kurzen Beschreibungen je eine Startform in Ozzy, jeder Schritt sichtbar und mit ⌘Z einzeln zurückzunehmen; du behältst mindestens 6 von 10 als Start |
| 2 | **Genauigkeit auf Abruf:** Zögern rastet ein, schlauer Fang, weiche Bezüge (gleich lang, symmetrisch, parallel, auf dem Boden) | An einer deiner Formen bleiben zwei Ohren gleich lang, während du frei formst, und du spürst keinen Zwang |
| 3 | **Posenfeld und Verhalten-Tropfen in 3D** (mit den Posen von Maul und Fressen) | fünf Sekunden „hungrig, frisst, satt“ ohne Zeitleiste, live auf dem iPad |
| 4 | **Vektor-Ausgabe und Abziehen** (3D zu 2D-Schlüsseln für Studio) | SVG der Vier Ansichten; Front und Seite einer Form als Studio-Schlüssel, von dir korrigiert, schneller als von null gezeichnet |
| 5 | **Looks als Proben, Tempo-Tropfen, Look per Wort im sicheren Rahmen** | „Earle-Fell, wärmer“ ergibt in unter einer Minute einen neuen Look im Budget, den du brauchbar findest |
| 6 | **Rezepte und Geister-Vorschläge** | Nicole baut in 20 Minuten eine Figur, die du „cool“ findest |
| 7 | **Kreuzen und Züchten; Ozzy im Claude-Gespräch** | Zwei Formen gekreuzt ergeben ein Kind mit Posen und Look, im Claude-Gespräch drehbar |

Die Reihenfolge nach Stufe 1 ist frei. Stufe 1 zuerst, weil alle späteren Stufen die Befehlsschicht nutzen und weil sie früh beantwortet,
ob die KI in Ozzy brauchbar arbeitet.

## 12 Offene Entscheidungen (deine)

1. **Mit welchem Beweis anfangen?** Stufe 1 (KI baut Formen), 2 (Genauigkeit), 3 (Posenfeld) oder 4 (2D-Brücke).
2. **Ein Stamm zuerst?** Die Stränge Objekte, Paint, Maul und Shader zusammenführen, bevor Neues kommt.
3. **Für wen zuerst?** early earle selbst, Grafiker wie du, Einsteiger oder Indie-Spieleentwickler. Empfehlung: early earle, dann Grafiker.
4. **Wo zuerst?** Web und iPad wie jetzt, dazu das Claude-Gespräch (MCP-App); eine native App später.
5. **Studio:** vor M1 auf die fünf Bausteine abgleichen?
6. **Name:** Bleibt „Ozzy“ der Name der ganzen Suite?

## 13 Quellen

**KI-Agenten in Kreativprogrammen**

- Adobe, MAX 2026: [news.adobe.com](https://news.adobe.com/news/2026/11/adobe-powers-new-era-of-creativity)
- Adobe, Juni 2026: [news.adobe.com](https://news.adobe.com/news/2026/06/adobe-unveils-major-expansion)
- Adobe und fremde Agenten: [TechRadar](https://techradar.com/pro/adobe-wants-you-to-spend-less-time-editing-and-more-time-creating-creative-cloud-opens-its-doors-to-third-party-ai-agents)
- Figma, Config 2026: [figma.com](https://www.figma.com/blog/config-2026-recap/), [TechCrunch](https://techcrunch.com/2026/06/24/figma-adds-code-layers-support-for-animations-more-ai-features-in-new-update)
- Spline V2: [blog.spline.design](https://blog.spline.design/spline-v2), [The New Stack](https://thenewstack.io/spline-v2-mcp-agents/), [AlternativeTo](https://alternativeto.net/news/2026/8/spline-v2-launches-with-rebuilt-3d-editor-ai-agents-webgpu-and-new-desktop-app/)
- Spline Hana V2: [blog.spline.design](https://blog.spline.design/hana-v2)
- Rive: [Skripte](https://rive.app/blog/scripting-is-live-in-rive), [Agent](https://rive.app/blog/scripting-with-the-ai-coding-agent), [Rive für Agenten](https://rive.app/agents)
- Blender MCP: [Vergleich](https://www.strayspark.studio/blog/official-blender-mcp-server-comparison-2026), [Anleitung](https://www.meshy.ai/tutorials/blender-mcp-guide)
- MCP Apps: [Claude](https://claude.com/blog/interactive-tools-in-claude), [Übersicht](https://modelcontextprotocol.io/extensions/apps/overview.md), [The Register](https://www.theregister.com/2026/01/26/claude_mcp_apps_arrives)

**Erzeugen**

- Tripo 3.0: [GamesBeat](https://gamesbeat.com/tripo-3-0-makes-it-easy-to-generate-ai-3d-content/)
- Test von neun Generatoren: [Indie Hackers](https://www.indiehackers.com/post/best-ai-3d-model-generator-in-2026-i-tested-9-of-the-best-and-here-is-what-i-found-70ecab1a0a)
- Hunyuan3D Studio: [arXiv](https://arxiv.org/html/2509.12815v1)
- Roblox 4D: [Roblox](https://about.roblox.com/newsroom/2026/02/accelerating-creation-powered-roblox-cube-foundation-model), [TechCrunch](https://techcrunch.com/2026/02/04/robloxs-4d-creation-feature-is-now-available-in-open-beta/)
- World Labs Marble: [World Labs](https://www.worldlabs.ai/blog/marble-world-model), [The Batch](https://www.deeplearning.ai/the-batch/world-labs-makes-its-marble-generative-world-model-public-adds-chisel-editing-tool), [Marble 1.1](https://rits.shanghai.nyu.edu/ai/world-labs-releases-marble-1-1-auto-expanding-3d-world-generation)
- Kimodo: [NYU RITS](https://rits.shanghai.nyu.edu/ai/nvidia-releases-kimodo-controllable-text-to-motion-for-characters-and-humanoid-robots/); HY-Motion: [arXiv](https://arxiv.org/pdf/2512.23464v1)

**Formen und Genauigkeit**

- Dreams: [Game Developer](https://gamedeveloper.com/design/how-media-molecule-designed-a-fun-and-robust-toolset-for-i-dreams-i-), [Inverse](https://www.inverse.com/gaming/dreams-anniversary-five-years-playstation-media-molecule), [Aardman](https://aardman.com/latest-news/what-are-your-dreams-making-an-animated-short-on-the-ps4)
- Womp: [Goop](https://www.womp.com/blogs/the-ultimate-guide-to-goop-liquid-3d-modeling-thats-changing-everything)
- Monster Mash: [monstermash.zone](https://monstermash.zone/)
- Plasticity: [2026.2](https://digitalproduction.com/2026/10/21/plasticity-2026-2), [2026.1](https://digitalproduction.com/2026/04/21/plasticity-2026-1/)
- Text zu CAD: [Wevolver](https://www.wevolver.com/article/we-tested-7-text-to-cad-tools-are-they-actually-useful-for-engineers), [Hackaday](https://hackaday.io/page/399989-we-tried-text-to-cad-tools-so-you-dont-have-to-heres-where-they-actually-break)

**2D und 3D**

- Project Neo: [Überblick](https://helpx.adobe.com/project-neo/help/overview.html), [Neuerungen](https://helpx.adobe.com/project-neo/help/release-notes.html), [mit Illustrator](https://www.adobe.com/cc-shared/fragments/products/illustrator/3d/riverflow)

**Bewegung**

- Cascadeur: [2026.2](https://cascadeur.com/blog/view/cascadeur-2026-2-animation-layers-easing-new-languages), [2026.1](https://cascadeur.com/blog/view/cascadeur-2026-1-new-renderer-ue-live-link), [Physik, KI und Kontrolle](https://digitalproduction.com/2026/02/18/cascadeur-on-physics-ai-and-control/)
- Video zu Bewegung: [Autodesk Flow Studio](https://www.autodesk.com/products/flow-studio/features), [Übersicht](https://filmthreat.com/features/10-best-ai-tools-for-turning-video-into-3d-character-motion/)

**Material, Shader, Partikel**

- [Unity AI Material Generator](https://unity.com/blog/unity-ai-material-generator), [Lumion](https://lumion.com/news/cloud-ai-material-generator-release), [Substance Sampler im Nutzerforum](https://community.adobe.com/questions-69/where-is-texture-prompt-to-material-feature-1560478)
- EmberGen: [80.lv](https://80.lv/articles/upcoming-embergen-s-sparse-solver-handles-one-billion-voxels-in-real-time)

**Klassiker (ohne Link):** Teddy (Igarashi, Matsuoka, Tanaka, 1999); FiberMesh (Nealen, Igarashi, Sorkine, Alexa, 2007); Monster Mash
(Dvorožňák u. a., 2020); Spatial Keyframing (Igarashi, Moscovich, Hughes, 2005); Layered Acting (Dontcheva, Yngve, Popović, 2003);
Design Galleries (Marks u. a., 1997); Put-That-There (Bolt, 1980); Spores Kreaturen (Hecker u. a., 2008); Picbreeder (Secretan, Stanley u. a.,
2008); Bret Victor, „Inventing on Principle“ (2012); SketchUp-Inferenz; Procreate QuickShape.

**Eigene Berichte:** `docs/research/2026-11-20-editor-recherche.md` (Zweig `claude/ozzy-animation-physics-294508`),
`docs/research/2026-11-18-claude-in-ozzy.md` (Zweig `claude/ozzy-direct-integration-5cd812`), `docs/research/ki-3d-tools-2026-10.md`,
`docs/research/2026-11-09-fibermesh-monstermash-richtung.md`, `docs/look/ozzy/UEBERGABE.md`.
