# Vision: Der Kurven-Editor als Raum (Fassung 2, 12.11.2026, nach den Prototypen)

> Auftrag (Florian, 12.11.): der coolste und eleganteste Editor für seine Kurven. Minimalistisch, „alles funktioniert gleich“,
> selbsterklärend, Shader und Animation statt Text. Für diese Sitzung galt keine der festgelegten Regeln; die andere Sitzung
> (Kurve reparieren) wurde nicht berührt (eigener Zweig, eigener Ordner, kein Code des Editors geändert).
> Recherche: [`RECHERCHE.md`](RECHERCHE.md). Prototyp: [`prototyp/`](prototyp/) (Bauanleitung unten).

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
