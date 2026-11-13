# Vision: Der Kurven-Editor als Raum (Fassung 2, 12.11.2026, nach den Prototypen)

> Auftrag (Florian, 12.11.): der coolste und eleganteste Editor für seine Kurven. Minimalistisch, „alles funktioniert gleich“,
> selbsterklärend, Shader und Animation statt Text. Für diese Sitzung galt keine der festgelegten Regeln; die andere Sitzung
> (Kurve reparieren) wurde nicht berührt (eigener Zweig, eigener Ordner, kein Code des Editors geändert).
> Recherche: [`RECHERCHE.md`](RECHERCHE.md). Prototyp: [`prototyp/`](prototyp/) (Bauanleitung unten).
> **Präsentation mit Filmen und Prototyp:** https://claude.ai/artifact/SahX9VLKYfxFbmhNPNs18f (Quelle `praesentation/`).

## Der Satz

**Das Wesen steht in einer Ecke aus Papier. Seine Schatten an den Wänden sind die Ansichten. Eine Hand formt, zwei Finger
schauen. Was du tust, zeigt sich in Licht, nicht in Worten.**

## Der wichtigste Fund

Florians vier Fenster (Seite oben links, Front rechts daneben, Top darunter, 3D in der freien Ecke) sind keine Willkür: Sie
sind exakt die **europäische Projektionsmethode** (ISO 5456-2, Methode 1). Bei ihr steht das Objekt zwischen Betrachter und
Wand und wirft seine Ansicht nach hinten, wie einen Schatten. Klappt man die drei Wände einer Raumecke flach auf, entsteht genau
sein Blatt. Im Prototyp ist das keine Behauptung, sondern eine Animation: Die Wände klappen um ihre Kanten, die Form gleitet in
ihr Feld (Bilder `docs/progress/editor/vision-falten-*.jpg`).

Daraus folgt das ganze Konzept: **Es gibt keine Fenster, nur einen Raum, der sich falten lässt.**

## 1. Raum (Anordnung)

| Zustand | Was man sieht | Wofür | Wie man hinkommt |
|---|---|---|---|
| **Raum** | Das Jelly-Wesen in einer Ecke aus drei Wänden. Boden = Top, Rückwand = Seite, Seitenwand = Front, jede Wand mit der Illustration ihrer Ansicht (Platten, Kontur, langer Schatten). | verstehen, schräg schneiden, das Wesen erleben | Start; zwei Finger drehen |
| **Blatt** | Die Wände flach: Florians 2×2, **ein Maßstab**, keine Rahmen, keine Titel. Die Lage sagt, welche Ansicht es ist. | genau arbeiten, alle Ansichten zugleich | aus dem Raum herauszoomen: Die Ecke faltet sich auf |
| **Blick** | Eine Ansicht füllt den Bildschirm. | Telefon; Feinarbeit | in ein Feld des Blatts hineinzoomen, oder im Raum auf eine Achse drehen: Dort wird die Form durchsichtig und ihr Schatten an der Wand übernimmt |

- **Ordnungslinien.** Fasst man einen Punkt, gehen im Raum drei Lichtstrahlen senkrecht zu den Wänden und treffen dort sein
  Bild. Auf dem Blatt laufen gepunktete Linien waagerecht (gleiche Höhe) und senkrecht (gleiche Länge), zwischen Front und Top
  über die 45°-Gehrungslinie der Zeichner. Das ist der Linienriss des Schiffbaus: Das „Straken“ (alle Ansichten passen zusammen)
  wird sichtbar.
- **Die Wände sind bearbeitbar** (Interactive Shadows, 1992): Ein Punkt an der Wand bewegt sich in der Ebene dieser Ansicht.
  Ein Strich über einen Schatten schneidet einen Loop in dieser Ansicht.
- **Die Ecke bleibt hinten.** Dreht man um das Wesen herum, wandert die Ecke mit; von hinten gesehen ist der Grund hell (das
  Wenden der Blaupause, ohne Knopf).

## 2. Hand (Grammatik)

| Regel | Bedeutung | Gebaut |
|---|---|---|
| **Ein Finger macht.** | Auf einem Punkt, Griff oder einer Linie: formen. Auf der Leere oder der Haut: zeichnen. | ja |
| **Zwei Finger schauen.** | Ziehen = drehen (Raum) oder schwenken (Blatt); kneifen = Zoom, weit heraus = Auffalten; zwei Finger tippen = zurück, drei = vor; zwei Finger still halten und schieben = Zeit spulen. | ja |
| **Ein ruhender Finger hält.** | Während eines Zugs: Der zweite Finger ist ein Zirkel, sein Abstand ist der Einfluss (Blenders O). Auf einem Punkt ruhend: Der Griffzug knickt (Ecke). | ja |
| **Mehr tippen, mehr nehmen.** | 1× Punkt, 2× Loop, 3× alles. Ein Tipp auf eine Linie setzt dort einen Punkt (die Perle zeigt vorher, wo). | ja |
| **Ein Strich bedeutet, was seine Form sagt.** | Über den Umriss = Loop (Lichtring läuft vorher um den Körper). Geschlossen auf der Haut = Form (Magnet zieht das Ende an). Zickzack = Kritzeln. Längs einer Linie = Tusche. | ja |
| **Kritzeln nimmt eine Schicht weg.** | Ecke → glatt; Kante → weich; Punkt weg; Linie weg. Was nicht geht (Kreuzung, Mittellinie), schüttelt den Kopf. | ja |
| **Nachfahren tuscht.** | Wie ein Tuschezeichner, der die Bleistiftlinie nachzieht: Das nachgefahrene Stück wird Kante. | ja |
| **Halten zeigt Verborgenes.** | Auf der Form: Röntgenlinse, Linien dahinter werden greifbar. Auf der Leere: Lichtspuren der Gesten, die hier gehen. | ja |
| **Pose ohne Regler.** | Ins Maul greifen und aufziehen. Das offene Maul *ist* die Pose; der Passer zeigt Grundform gegen Pose. | erster Wurf |

**Auf dem Mac** dieselbe Grammatik: Klick = Tippen, Maus ziehen = ein Finger, Trackpad mit zwei Fingern = drehen, Kneifen oder
Rad = Zoom, Rad während eines Zugs = Einfluss, ⇧ = ruhender Finger (Knick), ⌥ halten = Röntgen, ⌘Z/⇧⌘Z, Tab = falten,
1/3/7 = Seite/Front/Top (wie Blenders Ziffernblock), K = Kante, ⌫ = löschen. Die Tasten sind ein zweiter Weg, nie der einzige.

## 3. Licht (Sprache)

Grundregel aus der Luftfahrt: **dunkles Cockpit.** Zu sehen sind das Wesen, seine Linien und Punkte. Alles andere erscheint,
wenn es gebraucht wird.

| Signal | Bedeutet | Stand im Prototyp |
|---|---|---|
| Nähe | „greifbar“: Punkte schwellen, das nächste Ziel hebt sich (Bubble Cursor) | Maus |
| Perle | „hier entsteht ein Punkt“ | Maus |
| Ordnungslinien | dieser Punkt in den anderen Ansichten | Raum und Blatt |
| Seifenhaut | wo die Haut sich gerade neu findet (Frei Otto); erstarrt beim Loslassen | leise, nur im stärksten Bereich |
| Zirkel | Einflussbereich, mit wandernden Ringen | ja |
| Lichtring | Vorschau des neuen Loops | ja |
| Tusche / Krümel | Kante entsteht / etwas verschwindet | ja |
| Spiegelglas | die Mittelebene, nur in ihrer Nähe | ja |
| Röntgenlinse | Durchsicht an einer Stelle | ja |
| Passer | Pose gegen Grundform (rosa = Grundform, lila = Pose) | ja, im Blatt |
| Geister | frühere Formen beim Zurückgehen | ja |
| Einrasten | Die Form wird zu ihrem Schatten | ja |
| Kopfschütteln | „geht nicht“ | ja |
| Wackeln | Jelly nach dem Loslassen | ja |
| Ton (aus) | Zupfen, Reißverschluss, Rascheln, Klick | `?ton=1` oder M |

## 4. Prüfung aus vielen Blickwinkeln (ehrlich)

**Florian als Illustrator.** Die Wände sind seine Illustrationen, das 3D-Jelly steht davor wie in einer Galerie. Tusche und
Bleistift sind Zeichnerbegriffe, keine Werkzeuge. *Gefahr:* Im Raum dominiert das Jelly; genaues Zeichnen geschieht im Blick
oder Blatt. Gut so, aber der Weg dorthin muss schnell sein (eine Kneifbewegung).

**Bildhauer (Rodin).** Profile umrunden ist hier das Drehen im Raum; „Formen, die von innen drängen“ ist die Haut zwischen den
Linien. Zwei Hände am Ton: der ruhende Finger. *Fehlt:* direktes Drücken und Ziehen der Haut. Ein Finger auf der Haut zeichnet
hier. Eine Variante (Haut ziehen = nächste Linien mitnehmen) wäre zu prüfen.

**Architekt.** Ein Raum statt vier Fenster ist eine Ordnung, kein Effekt: Das Blatt ist die Abwicklung, der Blick ist ein Feld
daraus. Ordnungslinien und Gehrung sind die Konstruktion. Frei Ottos Seifenhaut ist die ehrlichste Darstellung dessen, was der
Löser tut. *Gefahr:* Drei Wände sind „Architektur“, die mit dem Wesen um Aufmerksamkeit konkurriert. Darum sind sie dunkel, das
Wesen leuchtet.

**Ingenieur.** Das Datenmodell bleibt (mitte/ring/paar, Punkte, Griffe, Kanten, Spiegel). Die Wände sind drei Renderziele, die
es für die Ansichten ohnehin gibt. Treffer an Wänden sind Strahl gegen Ebene. Gemessen in der Cloud (Software-Grafik): Raum und
Blatt stetig ~17 ms je Bild; ein Zug am „teat firefish“ (27 770 Punkte) kostet dank einmal gerechneter Zugbasis (Botsch &
Kobbelt) nur eine Addition je Netzpunkt. *Gefunden und behoben:* ein Speicherleck (Puffer je Bild neu), Gesten, die unter Last
falsch erkannt wurden (jetzt nach Zeitstempel). *Offen:* nichts davon ist auf dem iPhone gemessen.

**Spieledesigner.** Keine Fehlerzustände, nur Zurück. Jede Geste hat ein Echo (Ring, Krümel, Wackeln, Klick). Townscapers
„klare Arbeitsteilung zwischen Nutzer und Algorithmus“: Florian zieht Linien, der Rechner bläst die Haut auf und macht sie schön.
Spore: Das Wesen lebt (atmen und Blick folgen sind noch nicht gebaut).

**Kind / Neuling.** Ein Finger zeichnet: sofort belohnend. Zwei Finger drehen: kennt man aus Karten. Zwei Finger tippen = zurück
kennt man aus Procreate, sonst nicht. Die Geisterhand führt es einmal vor.

**Skeptiker (Norman & Nielsen).** Gesten sind schwer zu entdecken. Antwort hier: Vorschau vor jeder Handlung, eine Regel statt
vieler, Geisterhand, Halten = „zeig mir, was geht“, Tasten auf dem Mac. *Ehrlich:* Den Zirkel (ruhender zweiter Finger) und das
Zeitspulen findet niemand von selbst. *Und:* „Ein Finger auf der Leere zeichnet“ bricht Florians Gewohnheit „Grund ziehen dreht“.
Deshalb gibt es die Variante `?leere=drehen` (Leere dreht, Striche beginnen auf der Haut).

**Barrierefreiheit.** Keine Beschriftung heißt: nichts für Bildschirmleser. Farbe trägt Bedeutung (rosa/lila), dazu immer Lage
und Form. Bewegung lässt sich reduzieren (Seifenhaut `?seife=0`, Wackeln). Haptik in der App wäre ein Kanal für Nichtsehende.

**Florians Budget.** Nichts davon braucht den Löser. Jede Säule lässt sich einzeln in `kurven.ts` übernehmen, ohne die andere
Sitzung zu stören (Reihenfolge unten).

## 5. Was der Prototyp ist und was nicht

- **Ist:** eine lauffähige Seite (eine Datei) mit Raum, Blatt, Blick, Faltung, Ordnungslinien, der ganzen Grammatik für Finger,
  Maus und Trackpad, allen Lichtsignalen oben, Florians drei Formen (`?form=vogel`, `fisch`, `kaputt`) und Filmen mit
  Geisterfingern.
- **Ist nicht:** sein Löser. Die Haut rechnet ein Ersatzverfahren (Verformung mit radialen Basisfunktionen durch die Proben der
  Linien): Sie geht genau durch die Linien und gibt für gleiche Linien immer dieselbe Haut, bläst sich aber nicht auf wie seine
  und kennt keine echten Kanten (Kanten sind gezeichnet, nicht gerechnet). Das Maul ist ein einfacher Kieferknochen, keine eigene
  Geometrie.
- **Ungeprüft:** iPhone, Safari, echte Finger, Florians Auge.

## 5a. Was das Bauen gelehrt hat (gefunden in den Tests)

- **Pixeldichte:** `setViewport` rechnet in three.js immer mit der Pixeldichte, auch wenn ein Renderziel gebunden ist. Bei
  doppelter Dichte (iPhone, Retina-Mac) waren die Wandbilder und das Blatt leer, bei einfacher Dichte (Cloud-Tests) nicht.
  Behoben; gilt für jeden, der Ansichten in Renderziele zeichnet.
- **Puffer:** Linien und Punkte je Bild mit neuen Attributen anzulegen, lässt die GPU-Puffer überlaufen (three gibt ersetzte
  Attribute nie frei). Nach kurzer Zeit dauerte im Blatt jedes Bild 1 bis 2 s. Jetzt feste Puffer mit Kapazität.
- **Gesten unter Last:** Zwei gleichzeitige Finger kamen bei langsamen Bildern als „erst einer, dann der andere“ an und wurden
  als ruhender Finger gedeutet. Entscheidungen fallen jetzt nach dem Zeitstempel der Ereignisse; Halten wird im Bildtakt geprüft.
- **Seifenhaut:** am ganzen Körper zu laut (alles regenbogenbunt). Jetzt nur der Bereich, der sich am stärksten bewegt, kubisch
  abfallend, höchstens zu 42 % gemischt.
- **Maul gegen Auge:** Eine Form über die Mitte war zu schnell ein Maul (ein Auge nahe der Mitte wurde eines). Jetzt: vorn, breit
  (mindestens 1,6-mal so breit wie hoch) und in der unteren Hälfte.

## 6. Übernahme in den Editor (Vorschlag, je Schritt einzeln)

1. **Blatt mit einem Maßstab und Ordnungslinien** in den vier Fenstern (nur Anzeige, kein Kern).
2. **Raumecke als 3D-Fenster:** die drei Ansichten als Wandbilder, Strahlen beim Greifen.
3. **Grammatik:** ein Finger zeichnet (Schnitt/Form ohne L/F), Kritzeln löscht, Nachfahren tuscht; Tasten bleiben.
4. **Lichtsignale:** Ring, Zirkel, Röntgen, Seifenhaut, Kopfschütteln.
5. **Falten** zwischen Raum, Blatt und Blick (Kneifen).
6. **Pose übers Maul**, sobald Schritt 6 des Plans (Maul als eigene Geometrie) steht.

## 7. Entscheidungen für Florian

1. Raumecke als 3D-Fenster: ja / nein / als Schalter?
2. Leere zeichnet (Vision) oder Leere dreht (wie heute, `?leere=drehen`)?
3. Ein Maßstab für alle Ansichten im Blatt?
4. Tusche und Kritzeln statt K und ⌫ (Tasten bleiben)?
5. Seifenhaut: Bedeutung oder Ablenkung?

## Bauanleitung Prototyp

```bash
cd docs/look/editor/vision/prototyp
npm i three@0.170.0 esbuild@0.24.0   # oder NODE_MODULES=<pfad> setzen
node bau.mjs src/main.js dist/vision.html
# Parameter: ?form=kugel|vogel|fisch|kaputt  ?layout=raum|blatt|seite|front|top  ?leere=drehen  ?ton=1  ?seife=0
# Filme: node film.cjs raum aus.mp4 960 600 25 16
```

---

## Nachtrag 13.11.2026: Runde 2 nach Florians Rückmeldung

Florian: „mit der Maus am Desktop nicht bedienbar … Ich hätte auch erwartet dass du das layout veränderst … Gerade sieht es halt
aus wie vorher nur als raumecke … Bitte gib mir auch anständige fullscreenprototypen … vor allem mit maus und tastatur.“
Plan: [`PLAN-2.md`](PLAN-2.md). Präsentation (Version 2): https://claude.ai/artifact/SahX9VLKYfxFbmhNPNs18f.

**Grammatik, Maus zuerst** (alle drei gleich): links ziehen auf Leere oder Haut dreht (wie heute im Editor, mit Einrasten);
links auf Punkt, Griff, Linie bearbeitet; Doppelklick auf eine Linie setzt einen Punkt, auf einen Punkt schaltet er Ecke ↔ glatt;
rechts ziehen (oder ⌥ + links, oder P) zeichnet: quer = Loop, geschlossen = Form, Zickzack = weg; Rad zoomt, während eines Zugs
stellt es den Einfluss ein; Mitte, Leertaste oder ⇧ + Leere schwenkt; 1/3/7/0, ⌘Z, ⇧⌘Z, ⌫, K, F, X (Röntgen), Esc, ?, Tab.
iPad: Finger wie die linke Taste, Pencil zeichnet, zwei Finger zoomen und schwenken, zwei Finger tippen = zurück, drei = vor,
lange drücken und ziehen = zeichnen. Eine Geistermaus führt beim Start Drehen, Ziehen, Schneiden und Zoom vor und stellt danach
alles wieder her.

**Drei Layouts** (je eine Vollbildseite, Quelle `prototyp/src/werkstatt/`):

1. **Bullaugen**: eine Ansicht auf einem Drehteller mit Raststrichen alle 45°. Seite, Front, Top sind Bullaugen: in Ruhe klein
   am Rand, jedes dort, wo seine Kamera steht (sie wandern beim Drehen mit); beim Zeigen auf einen Punkt kommen sie heran und
   suchen sich einen Platz neben dem Wesen in ihrer Richtung (Bewertung nach Deckung des Umrisses). Einrasten = Dolly-Zoom in
   die Parallelansicht. Bearbeiten auch im Bullauge.
2. **Modellblatt**: Turnaround auf Papier, sieben Ansichten in einem Maßstab, alle bearbeitbar. Konstruktionslinien in
   Non-Photo-Blau; der Punkt unter dem Zeiger oder in der Hand zieht seine Höhe durch alle Ansichten und seine Länge in die
   Draufsicht. Drehen dreht alle Ansichten zugleich, das Blatt federt zurück. Das Blatt (Masken, Abstandsfeld, Kontur, Schatten,
   Korn) wird nur neu gerechnet, wenn sich Form oder Lage ändern.
3. **Drei Platten**: Seite Pink, Front Gelb, Top Blau als Risograph-Platten übereinander (multipliziert, Raster in eigenem
   Winkel, Korn). Die Platte, an deren Linien man arbeitet, druckt kräftig. Passerkreuze schieben eine Platte entlang ihrer
   gemeinsamen Achse; Tab legt alle nebeneinander (heutiges Layout) und wieder übereinander.

**Geprüft** mit echten Mauszügen in Playwright (Chromium, Software-Grafik): Klick, ⇧-Klick, Doppelklick (Punkt setzen, Ecke),
rechts ziehen (Schnitt mit Vorschau), Zickzack, ⌘Z, Rad, Leertaste; Finger, Pencil, Kneifen, zwei Finger tippen, lange drücken
mit künstlichen Ereignissen. Nicht geprüft: iPad, Safari, Florians Mac, Bildrate.

**Gelernt:** Bullaugen direkt am Zeiger und stark vergrößert decken das Wesen zu (jetzt: freier Platz, halbes Wesen im Bild).
Ein Modellblatt, das in 45°-Schritten einrastet, zeigt breite Ansichten auf schmalen Plätzen (jetzt: federt zurück). Platten,
die beim Überfahren sofort wechseln, flackern (jetzt: kurzes Verweilen oder Klick). Der Zähler für Doppelklicks muss nach einer
Doppelklick-Handlung neu beginnen, sonst schaltet ein zweiter Doppelklick die Ecke gleich wieder zurück.

**Empfehlung:** jede Variante zehn Minuten mit dem strange bird probieren. Erwartung: Modellblatt für Proportionen und
Überblick, Bullaugen für die Arbeit an einer Stelle; nächster Schritt wäre beides zusammen (Modellblatt als Grundlayout,
Doppelklick macht eine Ansicht groß, die anderen kommen als Bullaugen zum Zeiger). Die Raumecke aus Runde 1 ist jetzt auch mit
der Maus bedienbar (links dreht, rechts zeichnet).

---

## Nachtrag 13.11.2026 (abends): Runde 3, die Werft

Florian zu Runde 2: Bedienung und Material waren übernommen, die Fenster nur anders verteilt, ohne Vorteil gegenüber dem
gewöhnlichen Layout; Punkte, Linien, Konturen und Materialien ohne Zusammenspiel. Er will die eleganteste Lösung, ausführlich
abgewogen, ohne Scrollen, Sprünge und Überlagerungen. Konzept und Abwägung: [`PLAN-3.md`](PLAN-3.md).

**Kern:** Fenster gibt es, weil ein Punkt im Raum drei Zahlen braucht und die Maus zwei liefert. In Florians Modell liegt jede
Kurve in einer natürlichen Fläche (Kiel: Mittelebene, Spant: seine Querebene, Form: die Haut). Wer in dieser Fläche zieht, braucht
kein zweites Fenster. Daraus folgen sieben Grundsätze: ein Bild; jede Kurve in ihrer Fläche; der Blick bestimmt den Look (Raum =
Jelly, Achse = Illustration, Dolly-Zoom); Ansichten federn (1/3/7 halten oder tippen); zeichnen statt zerren (Nachzeichnen ersetzt
ein Kurvenstück); Haut wie Ton (Ziehen auf der Haut verschiebt die Kurvenpunkte im Umkreis); eine Formensprache (Kiel stärker als
Spanten, Punkte nur an der Kurve unter der Hand, Griffe nur am aktiven Punkt, Hilfen nur in der Handlung, Grundriss am Boden).

**Gebaut:** `prototyp/src/werkstatt/werft.js` (Seite `dist/werft.html`). Geprüft mit Mauszügen: Spantpunkt bleibt in seiner
Ebene, Haut formen, Nachzeichnen des Kiels (Spitze bei 0,22 → 0,35), Taste 1 → Seite als Illustration, 0 zurück; Finger und
Pencil mit künstlichen Ereignissen.

**Beim Bauen gelernt:** Beim Nachzeichnen müssen Kreuzungszwillinge auf anderen Kurven mitgehen, sonst muss die Haut durch zwei
Lagen und bildet Spitzen. Randgriffe behalten ihre Richtung, sonst biegt sich das Nachbarstück mit. Ein Strich über einer
Kreuzung ist mehrdeutig; die Kurve wird deshalb je Kurve nach Anfang und Ende gesucht. Die Seifenhaut aus Runde 1 fällt weg:
Die Hand zeigt sich als Flieder-Licht.


## Nachtrag 13.11.2026 (nachts): Runde 4, die Ecke

Florians Vision (wörtlich und geprüft in [`VISION-4.md`](VISION-4.md), Plan in [`PLAN-4.md`](PLAN-4.md)): Statt des Grundrisses
am Boden liegen Seite, Front und Top in Cyan, Magenta und Gelb an den Wänden einer Ecke, deren Wände man nicht sieht. Die
Projektionen sind echte 3D-Ansichten: Dreht man das Wesen, drehen sie sich synchron mit, legen sich deckungsgleich übereinander,
und an ihrer Schnittfläche entsteht das Material. Eine Taste schaltet zwischen „Raum drehen“ und „Wesen drehen“. Heller Grund.
Start: Umriss mit dem Stift in der Seitenansicht, Bestätigen, die Ansicht zieht sich zurück, das Wesen bläst sich wackelnd auf.

**Wie es gebaut ist:**

- *Projektor je Ansicht.* Auf der Achse schaut er fast parallel (Öffnung 0,6°) genau von der Seite, von vorn oder von oben; seine
  Maske liegt als Tafel auf der Wand hinter dem Wesen (der Wand, die vom Blick abgewandt ist). Beim Zusammenlaufen werden Blick
  (Quaternion), Ziel, Rahmenhöhe und Öffnung (im Tangens-Raum) zur Kamera hin gemischt, wie beim Dolly-Zoom; die Tafel steht
  immer senkrecht zu ihrem Projektor. Am Ende ist der Projektor die Kamera: Ein Bild, das vom Auge aus geworfen wird, deckt sich
  aus dem Auge immer genau mit dem Wesen (Anamorphose), ganz gleich, auf welcher Ebene die Tafel liegt.
- *Material an der Schnittfläche.* Jede Tafel schreibt ihre Deckung in einen eigenen Farbkanal (Cyan → Rot, Magenta → Grün,
  Gelb → Blau); wo das Minimum der drei groß ist und der Körper liegt, erscheint das Material. Unterwegs zeigen sich die
  Überdruckfarben (Cyan und Magenta = Blau usw.) wie ein Druck, der in Passer kommt. Die Dichten (0,40 / 0,32 / 0,34) sind so
  gewählt, dass alle drei übereinander ein neutrales Grau ergeben (Graubalance).
- *Raum oder Wesen.* Beides ist dieselbe Kamerafahrt um das Wesen; im Wesen-Modus dreht sich der Raum (Licht und Fliese) mit dem
  Blick mit, deshalb dreht sich auf dem Bildschirm nur das Wesen. Zurück im Raum richtet sich die Fliese mit einer kleinen Drehung
  wieder an den Wänden aus (Vierteldrehungen sehen gleich aus). Im Wesen-Modus hängt das Zusammenlaufen vom Winkel zur nächsten
  Achse ab: bis 6° liegen die Ansichten an ihren Wänden, ab 29° deckungsgleich im Wesen. Auf einer Achse macht der Dolly-Zoom die
  Ansicht flach; die Tafel dieser Achse liegt dann genau unter dem Drahtmodell (Morph zur Seitenansicht), die anderen stehen
  hochkant und verblassen.
- *Viereransicht.* Die Tafeln fliegen in Bildkoordinaten von ihrer Wand in ihr Feld (am Anfang perspektivisch richtig, am Ende
  flach), der Raum schrumpft über eine Verschiebung der Projektion ins vierte Feld. Europäische Anordnung: Seite oben links,
  Front rechts daneben (gleiche Höhen in einer Zeile), Top darunter (gleiche Längen in einer Spalte), alle im selben Maßstab.
- *Start.* Stift wie in Vektorprogrammen. Das Wesen entsteht durch Aufblasen des Umrisses: Poisson-Gleichung Δf = −2 im Umriss,
  Höhe z = ±0,92·√f (lange Teile bekommen runde Querschnitte; Teddy 1999, Monster Mash 2020), Fläche mit Surface Nets auf
  F = κ²f − z² (glatt, das Gitter ist zur Mittelebene symmetrisch, die Spiegelpartner ergeben sich aus den Zellen), Rand auf den
  gezeichneten Umriss gelegt, Taubin-Glättung. Drei Spanten an Querschnitten des Rumpfs. Die Seitenansicht zieht sich auf ihre
  Wand zurück (der „Windzug“), das Wesen bläst sich mit einer gedämpften Feder auf (1,25 Hz, gut ein Viertel Überschwingen), die
  Welle läuft vom Kopf zum Schwanz; Front und Top wachsen mit, weil ihre Projektoren das aufgehende Wesen sehen.

**Gestaltung:** warmes Weiß, kein Glühen, kein Schein; Druckfarben multipliziert mit feiner, satterer Kante derselben Farbe;
Drahtmodell = Kurvennetz in dunkler Tinte (Kiel doppelt so stark), verdeckte Linien hell, Umriss, dazu Transparentpapier (der
Körper hellt die Farben hinter sich auf); Material matt mit kühlen Schatten und warmem Licht (Gooch et al. 1998), so bleiben
dunkle Linien und weiße Griffe mit dunklem Ring lesbar; Lila heißt gewählt; Fliese als feines Quadrat; weicher Kontaktschatten.
Dynamisch, aber still: Linien werden zum Betrachter hin kräftiger (Strichstärke nach Tiefe), der Kontaktschatten weicht dem
Licht aus (im Wesen-Modus bleibt er stehen, während sich das Wesen dreht), das Transparentpapier trägt einen Hauch der
Schattierung, die Hand zeigt sich beim Haut-Formen als lila Ring der Reichweite, X gehalten macht das Material im Kreis
durchsichtig (Röntgen).

**Beim Bauen gelernt:** Chrome zeigte eine nur noch geleerte 2D-Überlagerung abwechselnd mit einem alten Puffer (ein unsichtbarer
Bildpunkt je Bild behebt es). Der Gitterrand des aufgeblasenen Netzes macht die Seitenansicht zackig, bis er auf den Umriss gelegt
wird. Masken brauchen Kantenglättung, sonst franst die Kante der Druckfarbe aus. Im Test staut sich die Arbeit des
Software-Renderers bis zum Screenshot; das Prüfwerkzeug wartet deshalb nach jedem Bild.

**Ehrlich offen:** Florians Satz „das Material des 3D-Models ist immer enthalten“ (Raum drehen) habe ich so gelesen, dass sich
im Raum das Material nicht ändert; gebaut ist im Raum das Drahtmodell, weil er auch schreibt „Wireframe, wenn die Projektionen
die Seiten anzeigen“. Ob das Zusammenlaufen vom Winkel abhängen soll oder nur von Tab, muss er beim Drehen fühlen. Die Spanten
beim Start sind geraten (drei, gleichmäßig im Rumpf). Bildrate auf iPhone und Mac nicht gemessen; unter der Oberfläche rechnet
weiter die Ersatz-Haut.
