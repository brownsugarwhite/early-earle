# Ozzy: Maul, Zähne, Zunge. Konzept (20.11.2026)

**Stand:** Konzept und Studie, zur Freigabe. **In Ozzy ist nichts gebaut**, am Werk und am Rechenkern nichts geändert. Die Studie
steht als eigene Seite neben Ozzy: `http://localhost:5205/maul.html` (Zweig `claude/ozzy-maul`, er baut auf dem Paint-Zweig auf).

**Nachtrag vom selben Tag (Abschnitt 12) ändert den Kern:** Nach deiner Rückfrage ist der Schnitt nur noch die Geburt des Mauls.
Mit dem Bestätigen wird es echte Form, bearbeitbar wie der Rest. Wo die Abschnitte 3, 9 und 10 dem widersprechen, gilt Abschnitt 12.

- Bildblatt 1: [`2026-11-20-maul-aus-einer-linie-bogen.jpg`](../progress/ozzy/2026-11-20-maul-aus-einer-linie-bogen.jpg)
- Bildblatt 2: [`2026-11-20-zaehne-linse-zunge-bogen.jpg`](../progress/ozzy/2026-11-20-zaehne-linse-zunge-bogen.jpg)
- Bildblatt 3 (Nachtrag): [`2026-11-20-maul-echte-form-probe.jpg`](../progress/ozzy/2026-11-20-maul-echte-form-probe.jpg)
- Recherche: [`docs/research/2026-11-20-maul-zaehne-zunge-recherche.md`](../research/2026-11-20-maul-zaehne-zunge-recherche.md)
- Übergabe des Strangs: [`docs/look/ozzy/maul/UEBERGABE.md`](../look/ozzy/maul/UEBERGABE.md)

## 0. Dein Auftrag (20.11.2026, wörtlich)

> Hi Claude, Bau auf dem Zweig claude/reverent-feynman-1efdd3 auf.
>
> Dort haben wir zusammenfügen und abziehen von objekten und den paint modus erstellt. Es ist alles noch nicht ganz fertig.
>
> Hier möchte ich darauf aufbauen und Am Maul arbeiten. Ein Maul wird mit einer linie erstellt (P oder freihand). Ob diese andere
> loops kreuzen spielt dabei keine rolle.
>
> Die Linie wird dann nach bestätigung automatisch zum maul mit ober und unterkieferknochen, die sich im animationsmodus/Posenmodus
> bewegen lassen.
>
> Bei einer linie sind lippen im "maul zu" zustand deckungsgleich und das maul ist geschlossen quasi unsichtbar. Man hat dann einen
> button "lippen trennen" und kann diese dann auch im geschlossenen zustand separat bearbeiten um über- und unterbiss zu erstellen.
>
> Ein Maul Bildet eine saubere innen Tasche und erscheint als separante eben im Paintmode. Das Innere ist dunkelrot und es wird ein
> automatischer innerer ring für das zahnfleisch gezogen der etwas heller ist.
>
> Im geschlossenen zustand bei "maul zu" und deckungsgleichen lippen lässt sich die linie nur als ganzes bearbeiten. es ist aber
> quasi wie ein zusammengeklappter edgeloop dessen punkte an ober und unterlippe gleich sind und zusammen synchroniesiert bearbeitet
> werden.
>
> Das maul ist eine klare einbuchtung mit harter kante. wenn ich das maul mit p leicht geöffnet von der seite einzeichne und "in"
> der gezeichneten öffnung punkte/kreuzungen liegen werden diese gelöscht. Es sind ja autoatsch neu kreuzungen an den lippen
> entstanden, die die form halten. Das Maul ist ein echtes bearbeitbares teil des meshes, als hätte ich es von hand gezogen und
> bemalt. Ober unterkiefer sollen nicht wie in altenversionen einfluss auf einander haben..
>
> Nach dem entstandenen maul sollen sich auch zähne einschalten lassen. Zähne können spitz, abgrundet, gebogen viereckig wie
> backenzähne und können verschiedene wurzeln haben. Zu beginn sind sie in einem einfachen schönen shape und gleichmäßig auf das
> zahnfleisch verteilt.
>
> Wie im ganz alten editor, kann ich anzahl winkel und noch ein paar dinge an den zähnen einstellen die nötig sind um sie optimal im
> maul auszurichten. Einzelne Zähne lassen sich auswählen und verschieben. Jeder Zahn ist wie ein eigenes Objekt. Ich kann die zähne
> als gesamtes und einzeln auswählen. Ich kann zähne aber nur innerhalb des mauls und etwas puffer außerhalb bewegen. Ich ann z.B.
> keinen zahn zum schwanz oder bein ziehen...
>
> Wenn ich zähne ausgewählt habe erscheint rechts oben ein rundes feld in dem ein zahn als model im 3d raum abgebildet ist. Ich kann
> hier den zahn separat bearbeiten. Um den Zahn in dem ring ist ein weiterer ring den ich drehen kann. Um verschiedenen
> voreingestellte formen auszuwählen, krümmung, wurzelform, zahnform und zahngröße von allen zhnen und bei auswahl des einzelnen
> zahnes soll möglich sein.
>
> In der Pose bearbeite ich alles exakt wie im Basis-modus/Grundshape...nur mit dem Unterschied, dass ich keine punkte oder linien
> hinzufügen kann. Die Punkte und handles wandern in der editor pose von einem punkt zum anderen, genau wie die handles.
>
> Beim gebackenen model fürs spiel muss das dann gut umgesetzt sein, dass die posen/blendshapes auch im spiel hervorragend
> funktionieren.
>
> In meiner Vision fürt Ozzy den user elegant durch die bedienung und alles ist selbsterklärend und läuft schritt für schritt ab.
> Alles funktioniert gleich und man kann zu jedem zeitpunkt hin und her switchen und alles auf gleiche art bearbeiten wenn nötig. Mir
> ist die bedienung des Maul, Zahn, Pose, Knochen mechanismus noch nicht ganz klar und verbildlicht. Die bedienung von der ersten
> version des editors mit den zähnen war ganz ok. Ich würde aber gerne ohne die vielen regler auskommen und mehr das visuelle liquid
> drop design nutzen und weiterentwickeln. Es steht für absoluten minimalismus in der optik bei maximaler interaktivität und
> flüssigen verschmelzung des users mit der umgebung in Ozzi.
>
> Für Designer wie mich soll es einerseits bis ins kleinste deteil anpassbar sein. Andrerseits soll ein mensch ohne viele kentnisse
> gleichzeitig immer etwas erstellen können das cool aussieh und schon vollständig funktioniert. Das heißt ozzi muss hochintelligente
> voreinstellungen haben die sich intuitiv auswählen lassen bzw ausgewählt sind. wie das elemente wie kiefer und zunge schon
> vorgeriggt und mit funktionierenden posen erscheinen, ich diese dann aber bis ins kleinste deteil anpassen kann und einzelne zähne
> komplett vrändern kann, das zahnfleiscch und den mundinnenraum genau wie das restliche mesh mit den gewohnten tools. Wobei
> kleinteilige deteils wie zähne in einem runden extrafesster rechts oben aufgehen (das fenster lässt sich größer ziehen).
>
> Textbuttons und regler wirklich nur da wo es nötig ist. (Abgesehen vom ozzymenü...das ist nur für mich zum entwickeln und testen)
>
> Wenn regler sinn machen und spaß machen, z.B bei der anzahl der Zähne. Stelle ich mir einen kreisrunden regler wie bei einem alten
> CD blayer das volumen vor mit einer tollen haptik beim drehen im liquid drop design. der regler könnte um das runde
> bearbeitungsfeld der zähne liegen oder am bildrand (abgeschnitten, das nur ein teil herinragt)
>
> Es soll mit dem Maul auch eine Zunge volgegeben sein. Die Zunge soll realistich im Maul liegen und wie Gummi verziehbar sein. lass
> dir auch hier bitte etwas richtig cooles einfallen.
>
> Mache ausfühliche Recherchen und alle notwendigen Tests und erstelle ein elegantes Konzept für Maul, Zähne und Zunge das sich
> perfekt in das liquid drop design integriert.
> Lass dich dabei gerne von anderen Tools und experimenten inspirieren und sieh nach was wir in diesem Projekt schon recherchiert
> und getestet haben.

## 1. Kurzfassung

**Das Maul ist ein Schnitt, kein Umbau.** Deine Form bleibt, wie sie ist: ein geschlossener Körper, den ihre Linien tragen. Die
Maullinie liegt auf der Haut wie eine Farblinie. Längs dieser Linie wird die *gezeigte* Haut gerade von Seite zu Seite
aufgeschnitten („durchgestanzt“, dein Wort vom 13.11.). Die zwei Wände des Schnitts sind Gaumen und Mundboden. Zwei Knochen am
Mundwinkel drehen jede Seite des Schnitts für sich. Zähne und Zunge sind kleine Teile, die am Maul hängen.

Was die Studie an deinen Formen zeigt (Bildblatt 1 und 2, alles echt aus dem Fenster):

- **Eine Linie genügt**, und es ist gleich, welche Linien der Form sie kreuzt („teat firefish“, „strange bird“).
- **Zu ist die Form von vorher:** 0 von rund einer Million Bildpunkten anders, in drei Blicken.
- **Offen steht eine saubere Tasche mit harter Kante,** dunkelrot, mit dem helleren Ring fürs Zahnfleisch.
- **Ober- und Unterkiefer haben keinen Einfluss aufeinander.**
- **Zähne, Linse, Drehregler und Zunge** sind zum Anfassen da.

Was sie nicht zeigt, steht in Abschnitt 8. Das Wichtigste: Sie steht neben Ozzy, die Lippenlinie hat noch keine Punkte zum
Ziehen, „Lippen trennen“ ist nur gezeichnet, und bei sehr weit offenem Maul staucht sich die Haut hinter dem Mundwinkel zu einer
Falte.

**Bei dir liegt** (Abschnitt 10): ob dieser Weg trägt, und ob ich mit Etappe 1 in Ozzy beginne.

## 2. Was schon da war

Gelesen habe ich die Recherche vom 12.10. (Maul, Kiefer, Zähne, Rig), die Übergabe von Sitzung 4 (13./14.11.: drei Fassungen von
„Maul formen“, das Maul aus einer Linie, dein Halt am 14.11.), deine Blätter 05 und 06 (oberes Maul rosa, unteres blau, Mundwinkel
schwarz), deine Bilder 03, 07 und 14 und die Zahn-Tafel vom 15.10. Das Wichtigste daraus:

| Dein Wort | Was es für dieses Konzept heißt |
| --- | --- |
| 13.11.: „als wäre der Edgeloop von der Seitenansicht durchgestanzt mit genau der Form des Maulloops von der Seite“ | Das Maul ist ein Schnitt gerade von Seite zu Seite. Von der Seite hat es genau die Form der Linie. |
| 13.11.: „Das Maul ist dann einfach eine Form wie von Hand gemacht, nur automatisiert.“ „Keine Punkte von selbst.“ | Ozzy setzt nur, was du auch setzen würdest: die Linie, den Mundwinkel, zwei Knochen. |
| 14.11.: „Das Maul mit der fest eingeklappten Wulst ist nicht, was ich erwarte. Wenn ich nachträglich Linien durchs Maul ziehe, stören diese festen Wulsten.“ | Die Form kennt das Maul nicht. Eine Linie, die du später durchs Maul ziehst, ist eine Linie wie jede andere. |
| 14.11.: „Wenn ich ein Maul über eine vorhandene Kreuzung lege, muss ich erst mit Handarbeit die Kreuzungspunkte zurechtlegen.“ | Kreuzungen unter dem Maul bleiben, wo sie sind. Es gibt nichts zurechtzulegen. |
| 14.11.: „Das braucht alles ein eigenes System und Definition.“ | Abschnitt 3 ist diese Definition. |
| 15.10.: Zähne dürfen sich überschneiden („das macht ein Maul erst aus“), „süße Blobzähne“ | Keine Warnung, kein Wegschieben; eine Vorlage ohne Spitze. |
| 15.10.: „dass über die Mischung aus Blendshape und Knochen auch sehr kleine geschlossene Mäuler sehr groß werden können“ | Pose = Knochen plus Versatz der Punkte, auch der Punkte der Lippe (Abschnitt 4.9). |

Die acht Fragen, die Sitzung 4 am 14.11. für die Maul-Sitzung aufgeschrieben hat, und deine Antworten von heute:

| Frage vom 14.11. | Deine Antwort heute | Im Konzept |
| --- | --- | --- |
| 1 Wie geht die Haut an der Lippe in die Tasche über? | „klare einbuchtung mit harter kante“ | Kante des Schnitts; K rundet nur die Lippe (dein Wort vom 13.11.) |
| 2 Linien durchs Maul | „Ob diese andere loops kreuzen spielt dabei keine rolle“ | Die Form kennt das Maul nicht |
| 3 Kreuzungen unter einem neuen Maul | in der Öffnung gelöscht, an den Lippen neue | 3.4, Fall 3 und 4 |
| 4 Ist das Maul in der Grundform zu? | bei einer Linie zu; man kann es auch leicht offen zeichnen | 3.4, Fall 1 und 4 |
| 5 Was heißt „quasi unsichtbar“, was lässt sich zu ziehen? | die Linie als Ganzes; „Lippen trennen“ | 4.3, 4.4 |
| 6 Die Tasche | „saubere innen Tasche“, dunkelrot, Zahnfleischring, eigene Ebene im Paint-Modus | 3.3, 4.8 |
| 7 Welcher Teil geht mit dem Kiefer? | zwei Knochen, kein Einfluss aufeinander | 3.3 (Reichweite), offen: Abschnitt 8 |
| 8 Welche Formen sind die Fälle? | nicht gesagt | geprüft an „teat firefish“ und „strange bird“ |

## 3. Die Definition

### 3.1 Drei Schichten

1. **Die Form.** Linien, Punkte, Griffe, die Haut daraus: wie immer. Sie weiß nichts vom Maul.
2. **Das Maul.** Eine Linie auf der Haut, ein Mundwinkel, zwei Knochen. Daraus wird je Bild abgeleitet: der Schnitt in der gezeigten
   Haut, Gaumen und Boden, die Drehung der zwei Seiten. Abgeleitet heißt: nie von Hand zu flicken, immer sauber, und wenn du das Maul
   löschst, ist die Form wieder ganz.
3. **Die Bewohner.** Zähne und Zunge: kleine eigene Teile, die an einem Kiefer hängen und mit ihm gehen.

Dasselbe Muster hat der Verbund vom 19.11.: Die Objekte bleiben Objekte, zu sehen ist, was aus ihnen abgeleitet wird. Du hast es
„sehr gut gemacht“ genannt. Das Maul ist ein Abziehen, das so dünn ist wie eine Linie.

### 3.2 Warum nicht eine Tasche in der gerechneten Haut

So war es am 13./14.11. gebaut: Die Maullinie war eine Linie der Form, die Tasche Haut, die die Rechnung zwischen den Linien rund
macht. Das trug an der Kugel und scheiterte an genau den Fällen, die du genannt hast (Übergabe von Sitzung 4, 7.16): Kreuzte eine
Linie das Maul, verloren die Lippen ihre Paarung; zu lag die Naht 3° bis 5° geknickt im Bild; die Form unter dem Maul ging mit dem
Kiefer mit; auf feinem Netz lief die Tasche davon. Der Grund ist immer derselbe: Die Rechnung macht alles zwischen den Linien so
rund wie möglich. Eine Tasche hält sie nur, wenn viele Linien sie fassen, und zusammengeklappt (Lippe auf Lippe) hat sie keine Form.

Der Schnitt umgeht das. Die Rechnung sieht nie eine Tasche und nie zwei Lippen an einem Ort. Dafür gilt: Gaumen und Boden entstehen
nach einer festen Regel (gerade von Seite zu Seite) und nicht aus beliebigen Linien. Was du daran formen kannst, steht in 4.5.

### 3.3 Was ein Maul ist

- **Die Lippenlinie.** Deine Linie. Ihre Punkte sind Orte auf der Haut (wie die Punkte einer Farblinie), mit Griffen wie jede Linie.
  Zwischen den Punkten läuft der Schnitt gerade von Seite zu Seite. An einer gespiegelten Form zeichnest du eine Hälfte, von der
  Mitte bis zum Mundwinkel.
- **Der Mundwinkel.** Das innere Ende der Linie (der schwarze Punkt in deinem Blatt 05). Er ist das Scharnier.
- **Zwei Lippen.** Jeder Punkt der Linie gilt für Ober- und Unterlippe zugleich („zusammengeklappter Edgeloop“). Erst „Lippen
  trennen“ macht daraus zwei Linien (4.4).
- **Gaumen und Boden.** Die zwei Wände des Schnitts. Zu liegen sie aufeinander, offen sind sie das Innere des Mauls. Farbe:
  dunkelrot, nach hinten dunkler; längs der Lippe ein Ring in hellerem Rot, das Zahnfleisch. Seine Breite ist eine Linie im Maul.
- **Die Rachenlinie.** Die hintere Kante der Tasche, von Mundwinkel zu Mundwinkel durch das Innere. Am Anfang gerade. Ihr Punkt in
  der Mitte lässt sich nach hinten ziehen: Die Tasche wird tiefer (dein Wort vom 14.11.: „2 Mundwinkel verbinden und so die Tiefe
  der Maultasche bearbeiten“).
- **Zwei Knochen.** Oberkiefer und Unterkiefer, beide vom Mundwinkel zur Spitze ihrer Lippe. Jeder dreht nur seine Seite des
  Schnitts. Vor dem Mundwinkel dreht ein Kiefer starr; dahinter läuft die Drehung weich aus. Wie weit ein Kiefer reicht, sagt seine
  **Reichweite** (am Anfang: so weit, wie die Lippe lang ist).

### 3.4 Die Fälle

| Nr. | Fall | Was geschieht | Stand |
| --- | --- | --- | --- |
| 1 | Eine Linie, von der Seite gezeichnet, vom Rand der Form zum Mundwinkel | Maul, zu. Im Bild steht die Form von vorher, dazu die Linie in Türkis | Studie: hält |
| 2 | Die Linie kreuzt Linien der Form | Nichts. Die Linien bleiben | Studie: hält (3 und 5 Kreuzungen) |
| 3 | Offen: eine Linie der Form läuft über die Lippe | Sie reißt an der Lippe; jede Hälfte geht mit ihrem Kiefer. An der Lippe steht je Kiefer ein Punkt (dein Wort: „automatisch neue Kreuzungen an den Lippen“). Im Bau bekommt die Linie dort einen echten Punkt (genau auf ihrem Pfad, nichts bewegt sich): Ziehst du ihn, formst du die Lippe, und die Lippenlinie geht mit, weil sie auf der Haut liegt | Studie: reißt und zeigt den Punkt; der echte Punkt: Etappe 3 |
| 4 | Leicht offen gezeichnet: eine Linie, die hineinläuft und wieder hinaus; ihr Knick ist der Mundwinkel | Zwei Lippen von Anfang an; was zwischen ihnen liegt, ist weg. Punkte und Kreuzungen der Form in der Öffnung verschwinden aus dem Bild und lassen sich nicht greifen. In der Datei bleiben sie: Sie tragen die Haut bis zur Lippe mit, und löschst du das Maul, sind sie wieder da | nicht gebaut: Etappe 4 |
| 5 | Später eine Linie quer durchs Maul ziehen (P) | Eine Linie der Form wie jede andere; am Maul gilt Fall 3 | folgt aus 3.1; in Ozzy zu prüfen |
| 6 | Die Linie von vorn oder im Raum auf die Haut gezeichnet | Dieselbe Regel: Punkte auf der Haut, dazwischen gerade von Seite zu Seite. Ist das Maul von der Seite gesehen kürzer als breit (ein Maul auf einer flachen Front), zieht Ozzy die Rachenlinie von selbst ein Stück nach hinten, damit es eine Tasche gibt | nicht gebaut: Etappe 1 und 5 |
| 7 | Die Form ändern, nachdem das Maul da ist | Die Punkte der Lippe wandern mit der Haut; der Schnitt wird neu abgeleitet | nicht gebaut: Etappe 1; Risiko „Kriechen“ (Abschnitt 8) |
| 8 | Das Maul löschen | Die Form ist ganz wie vorher | folgt aus 3.1 |
| 9 | Eine Form ohne Linien | wie jede andere (Randfall, dein Wort vom 14.11.) | Studie: der Schnitt braucht keine Linien |
| 10 | Freie Form (Spiegel aus) | Die Linie läuft von Mundwinkel zu Mundwinkel über die ganze Form | nicht gebaut, später |

## 4. Die Bedienung, Schritt für Schritt

Ozzy führt: **Nach jedem Schritt hängt dort, wo der nächste möglich ist, ein Tropfen.** Kein Menü, kein Reiter. Wer nur tippt,
bekommt ein Maul mit Kiefern, Zunge und Zähnen, das sich bewegt. Wer formen will, greift an denselben Stellen tiefer.

### 4.1 Eine Linie, ein Tropfen „Maul“

P oder Freihand, wie immer. Eine offene Linie, die auf der Haut endet, kann die Form nicht tragen: Sie kann nur ein Maul werden.
An ihrem inneren Ende, dem Mundwinkel, hängt darum der Tropfen **„Maul“** (Bildblatt 1, Bild 10). Ein Tipp bestätigt. Das Maul
zeigt sich: Es geht einmal auf und halb wieder zu (kein Sprung in eine neue Form; dein Wort vom 13.11.). Danach ist es zu, und die
Linie liegt türkis auf der Haut.

### 4.2 Die Kiefer

Mit dem Maul gibt es die Pose **„Fressen“** schon fertig (oben wenig, unten weit). In der Pose sitzt an jeder Kieferspitze ein
Tropfen, rosa oben, blau unten, an einer Haarlinie zum Mundwinkel: Das sind die zwei Knochen (Bildblatt 1, Bild 3, 7, 8). Ziehen
dreht den Kiefer; knapp vor „zu“ rastet er zu. In der Grundform kannst du einen Tropfen gedrückt halten, um kurz hineinzusehen;
losgelassen schließt das Maul wieder.

Später am Knochen (Etappe 2): ein kleiner Tropfen auf der Haarlinie für die Reichweite (wie weit Kopf oder Kinn mitgehen) und das
Scharnier selbst, falls es nicht am Mundwinkel sitzen soll.

### 4.3 Die Lippenlinie bearbeiten, solange das Maul zu ist

Punkte, Griffe, Ecke oder rund, Doppelklick setzt einen Punkt: wie an jeder Linie. Jeder Punkt gilt für beide Lippen. Die Punkte
gleiten auf der Haut; sie ziehen die Form nicht. K rundet die Lippe (nur die Kante, die Tasche bleibt), `[` und `]` stellen, wie
breit, wie an der Naht des Verbunds.

### 4.4 „Lippen trennen“

Am Mundwinkel hängt, solange die Lippenlinie gewählt ist, ein zweiter kleiner Tropfen: **„Lippen trennen“**. Danach gibt es zwei
Linien, rosa oben und blau unten, die sich im Mundwinkel treffen (Bildblatt 1, Bild 12, gezeichnet). Was du damit machst:

- **Die Unterlippe zurückziehen: Überbiss.** Der Unterkiefer wird vorn kürzer; die Unterseite des Oberkiefers, die dabei frei wird,
  ist Haut (sie gehört zum Maul erst dort, wo die Lippen aufeinanderliegen).
- **Die Unterlippe vorziehen: Unterbiss.**
- **Eine Lücke lassen:** Wo die zwei Linien auseinanderlaufen, ist das Maul auch geschlossen offen (ein Zahn schaut heraus).
- **Jeden Kiefer als Ganzes rücken** (sein Knochen lässt sich dann auch schieben, nicht nur drehen).

„Lippen verbinden“ legt sie wieder aufeinander. Das ist der Teil des Konzepts, den ich am wenigsten bewiesen habe (Abschnitt 8);
gebaut wird er erst nach einer eigenen Probe an deinem Blatt 06 (Rex: oben lang, unten zurück).

### 4.5 Die Tasche

Am Anfang: gerade von Seite zu Seite, hinten am Mundwinkel zu Ende. Drei Linien gehören dem Maul, und nur wenn du sie anfasst:
die Rachenlinie (tiefer), die Mitte des Gaumens und die Mitte des Bodens (ein Punkt darauf, nach oben oder unten gezogen, wölbt
die Wand). Alle mit den gewohnten Werkzeugen. Gemalt wird die Tasche wie die Haut (4.8).

### 4.6 Zähne

Unter der Leiste quillt mit dem Maul der Tropfen **„Zähne“**. Ein Tipp: Sie sprießen von der Spitze nach hinten aus dem Zahnfleisch
(Bildblatt 2, Bild 1). Am Anfang: ein einfacher Zahn („Tropfen“), gleichmäßig verteilt, spiegelgleich, vorn größer, unten ein Zahn
weniger als oben (dann stehen die unteren in den Lücken der oberen).

- **Ein Tipp auf einen Zahn wählt seine Reihe**, ein zweiter Tipp den einzelnen Zahn (und sein Spiegelbild). Ein Tipp ins Leere
  hebt die Auswahl auf.
- **Ziehen rückt einen gewählten Zahn** auf dem Zahnfleisch. Er bleibt im Maul und höchstens ein Stück vor der Lippe: Weiter hinaus
  hält ihn die Lippe fest.
- Jeder Zahn hängt starr an seinem Kiefer. Zähne dürfen sich überschneiden.
- Innen wird ein Zahn nie länger als der Spalt zwischen den Kiefern: Geschlossen steckt er im Maul, offen ist er groß (der alte
  Kniff „geschlossen klein, offen groß“, hier von selbst). Zähne **außen** vor der Lippe behalten ihre Länge und liegen bei
  geschlossenem Maul über dem anderen Kiefer (Bildblatt 2, Bild 12; dein Bild 07).

### 4.7 Die Linse

Sobald etwas Kleines gewählt ist (ein Zahn, eine Reihe, später die Zunge, ein Auge), geht oben rechts **die Linse** auf: ein rundes
Feld, in dem das Teil groß und im Raum steht (Bildblatt 2, Bild 3 bis 6).

- **Innen:** der Zahn mit seiner Wurzel und der Linie, an der er aus dem Zahnfleisch tritt. Ziehen dreht ihn. In einer späteren
  Etappe trägt er dort seine eigenen Linien und Punkte, und die gewohnten Werkzeuge gelten in der Linse.
- **Der Formenring** (innen): die Vorlagen als kleine Zeichen (Tropfen, Spitz, Säbel, Nadel, Blob, Schaufel, Backe, Hauer). Den
  Ring drehen oder ein Zeichen antippen: Was oben an der Marke steht, gilt, und die Zähne gehen weich in die neue Form über.
- **Der Drehregler** (außen, geriffelt): ein Rad ohne Anschlag wie der Lautstärkeknopf eines alten CD-Spielers. Er stellt immer
  eine Sache; welche, sagen die **Perlen** an seinem Rand: `#` Anzahl, `G` Größe, `B` Biegung, `W` Wurzel, `N` Neigung, `V` Verlauf
  (vorn groß, hinten klein), `S` Sitz (innen bis außen). Gilt die Auswahl einem einzelnen Zahn, stellen Form, Größe, Biegung und
  Wurzel nur ihn.
- **Das Gefühl beim Drehen:** Es rastet (bei Zahlen je Rast ein Schritt, sonst fein), es läuft nach, wenn man es anschubst, es tickt
  leise, und an der Marke hängt ein Tropfen, der sich in Drehrichtung dehnt und an der Rast zurückschnappt. Die Zahl steht nur,
  solange gedreht wird. Das Rad der Maus dreht mit. **Eine echte Haptik gibt es im Browser nicht:** Das iPad hat keinen Motor dafür,
  die des Stifts ist für Webseiten nicht zu erreichen, am iPhone gibt es nur einen Umweg, der mit iOS 26.5 wohl versperrt wurde
  (Recherche, Abschnitt 4). Das Gefühl muss aus Bild und Ton kommen.
- **Ein Tropfen am Rand zieht die Linse größer.**
- **Die andere Lage, die du nennst** (ein großes Rad am Bildrand, abgeschnitten): nicht gebaut. Mein Vorschlag: erst die Linse am
  Mac und am iPad anfassen, dann entscheiden.

### 4.8 Die Zunge

Sie ist mit dem Maul da: Sie liegt auf dem Unterkiefer, ihre Breite richtet sich nach dem Maul, oben hat sie eine flache Rille
(Bildblatt 2, Bild 14 bis 16).

- **Sie lebt:** Bewegt sich der Kiefer, kommt sie mit Verzögerung nach und schwingt aus.
- **Gummi:** Greifen und ziehen dehnt sie; gedehnt wird sie dünner (ihr Rauminhalt bleibt). Die Wurzel bleibt am Kiefer.
- **In der Grundform schnellt sie zurück.** Dort formst du sie (in der Linse: ihr Umriss, ihre Dicke, die Rille; Vorlagen am
  Formenring: rund, spitz, gespalten, lang).
- **In einer Pose bleibt sie, wo du sie loslässt.** Das ist ihre Pose (nicht gebaut).
- **Über die Lippe hinaus hängt sie:** Dort hat sie keinen Boden mehr.
- **Ablegen** (Idee, nicht gebaut): Lässt du die Spitze auf einem Zahn oder der Lippe los, bleibt sie dort kleben.

### 4.9 Das Maul im Paint-Modus

Das Maul ist im Stapel der Ebenen ein eigener Tropfen (dunkelrot mit hellem Rand). Es bringt mit: das Innere als Füllung, das
Zahnfleisch als Farblinie längs der Lippe. Diese Farblinie bedienst du wie jede: Punkte, Breite, hart oder weich mit dem Tropfen am
Faden. Du kannst im Maul weitere Farblinien ziehen (die Rillen am Gaumen aus deinem Bild 14). Zähne und Zunge tragen je eine Farbe
(ein Farbtropfen, auf das Teil gezogen). In der Ebenen-Ansicht (X) steht das Maul aufgeklappt wie ein Buch: Gaumen oben, Boden
unten, damit man hineinmalen kann.

### 4.10 Die Pose

Wie du es beschreibst: In der Pose arbeitest du genau wie in der Grundform, nur ohne neue Punkte und Linien. Gespeichert wird je
Pose: die Winkel der Knochen (jetzt zwei Kiefer, später die Kette der Zunge) und der Versatz jedes Punkts und Griffs gegen die
Grundform. Neu ist nur, was dazukommt: die Punkte der Lippenlinie (ein kleines Maul wird offen groß und rund), die Lage jedes
Zahns, die Kette der Zunge. Die Posen stehen als Tropfen in einer Reihe (Grundform, Fressen, Plus); zwischen zwei Tropfen gezogen,
wandern Punkte und Griffe von der einen Lage zur anderen.

Der Weg dafür steht seit dem 14.11. im Werk (Pose = Ruhe der Pose plus Knochen; Etappe 2 und 3 von Sitzung 4). Offen sind dort
Etappe 4 und 5.

## 5. liquid drop: die Bausteine

| Baustein | Wo | Schon in Ozzy? |
| --- | --- | --- |
| Tropfen, der am Ort des nächsten Schritts hängt („Maul“, „Lippen trennen“) | am Mundwinkel | ja („Maul“ unter einem gewählten Ring) |
| Tropfen, die aus der Leiste quellen, wenn es sie gibt („Zähne“, „Zunge“) | Leiste | ja (Farben, „Fressen“) |
| Knochen als Haarlinie mit Tropfen | Kieferspitzen | neu (heute zwei Regler in der Tafel „Fressen“) |
| Die Linse: ein rundes Feld für Kleines, größer zu ziehen | oben rechts | neu |
| Formenring: Vorlagen an einem Ring, die Marke oben | um die Linse | neu |
| Drehregler mit Perlen: ein Rad für alles, was eine Zahl ist | um die Linse | neu |
| Sprießen: Teile wachsen aus der Fläche | Zähne | neu (verwandt: Farbe läuft ein) |
| Gummi: ziehen, dehnen, zurückschnellen | Zunge; ein Zahn am Rand seines Bereichs | neu |
| Deine Farben für die Lippe: zu türkis, oben rosa, unten blau, Mundwinkel schwarz | Lippenlinie | neu (aus deinem Blatt 05) |

Texte stehen nur an zwei Tropfen („Maul“, „Zähne“/„Zunge“ in der Leiste) und als Zahl im Drehregler, solange er dreht.

## 6. Voreinstellungen: was Ozzy von selbst richtig setzt

| Was | Am Anfang | Zu ändern mit |
| --- | --- | --- |
| Mundwinkel und Scharnier | das innere Ende der Linie | Punkt der Linie ziehen |
| Pose „Fressen“ | oben 8°, unten 34° | Tropfen an den Knochen |
| Reichweite der Kiefer | so weit, wie die Lippe lang ist; dahinter läuft es aus | Tropfen am Knochen (Etappe 2) |
| Tasche | gerade von Seite zu Seite; tiefer von selbst, wenn das Maul flach auf der Form liegt | Rachenlinie, Mitte von Gaumen und Boden |
| Farben | innen dunkelrot, nach hinten dunkler; Zahnfleisch heller, ein Zehntel der Lippenlänge breit; Zähne elfenbein; Zunge rosa | Paint-Modus |
| Zähne | 12 oben, 11 unten, Vorlage „Tropfen“, vorn größer, bis kurz vor den Mundwinkel, mitten auf dem Zahnfleisch, leicht nach außen geneigt | Linse |
| Zunge | so breit, wie das Maul es zulässt; reicht bis kurz hinter die unteren Zähne | Linse |

## 7. Fürs Spiel backen

- **Ein Netz** (höchstens 8 000 Dreiecke): die Haut, an der Lippe aufgeschnitten (die Punkte der Lippe doppelt, am selben Ort),
  dazu Gaumen und Boden, Zähne und Zunge als Teile desselben Netzes.
- **Knochen:** Schädel (Oberkiefer), Unterkiefer, drei bis vier für die Zunge. Zähne hängen ganz an ihrem Kiefer.
- **Blendshapes:** je Pose einer (Versatz vor der Drehung der Knochen gespeichert), höchstens drei mit Normalen (Recherche vom
  12.10.: rund 0,8 MB je Art).
- **Zu ist unsichtbar,** weil die doppelten Punkte der Lippe dieselbe Lage und dieselbe Normale der Haut tragen: keine Kante im
  Licht. Das ist das Kriterium der Etappe „Backen“.
- **Die Zunge lebt im Spiel** über eine kleine Feder je Knochen (wie Haare und Stoff in VRM-Figuren), nicht über gespeicherte
  Bewegung.
- Ein Wert im Spiel treibt alles: Öffnung 0 bis 1 stellt die Kiefer und mischt den Blendshape.

Was vom Editor dafür schon da ist: `backen.ts` im Kern (dünnt das dichte Netz aus und kennt die Gewichte der Knochen). Nicht
geprüft: das Ausdünnen an einer aufgeschnittenen Lippe.

## 8. Was die Studie beweist und was nicht

**Die Studie:** `apps/editor/maul.html`, Code `apps/editor/src/maulstudie/`. Sie liest eine gesicherte Form (Haut des Rechennetzes
und Linien), verfeinert sie für den Blick und ändert nichts an ihr. Der Schnitt läuft mit derselben Bibliothek wie der Verbund.
Bilder und Zahlen: `scripts/ozzy/maul-studie-bilder.mjs`, `maul-studie-bogen.mjs`.

| Geprüft | Ergebnis |
| --- | --- |
| Ein Maul aus einer Linie, an einer Form mit Linien | „teat firefish“ (33 Linienzüge, 3 kreuzen die Lippe) und „strange bird“ (5 kreuzen): Maul entsteht, die Linien der Form bleiben unberührt |
| Zu = die Form von vorher | 0 von 1 027 524 Bildpunkten anders (Seite), 0 von 926 969 (schräg), 0 von 570 178 (Front) |
| Tasche, harte Kante, Zahnfleischring | Bildblatt 1, Bild 4 und 5 |
| Kiefer ohne Einfluss aufeinander | Bildblatt 1, Bild 7 und 8: Jeder dreht allein; die Wände drehen starr mit ihrem Kiefer |
| Tempo des Stellens der Kiefer | 2,0 bis 3,3 ms je Bild bei 111 000 Punkten (samt Zähnen und Linien) |
| Tempo des Schnitts | 0,25 s („strange bird“, 128 000 Dreiecke) bis 0,43 s („teat firefish“, 222 000) |
| Zeichnen und bestätigen | mit echten Zeigergesten: Strich, Tropfen „Maul“ am inneren Ende, Tipp (Bildblatt 1, Bild 10 und 11) |
| Drehregler | mit der Maus gedreht: 60° sind vier Rasten, 12 → 16 Zähne; 90° sind sechs |
| Formenring, Auswahl Reihe und einzelner Zahn, Zahn rücken, Zunge ziehen | mit echten Zeigergesten bedient, ohne Fehler in der Konsole |

**Was sie nicht beweist** (ehrlich, damit nichts überrascht):

1. **Sie steht neben Ozzy.** Kein Werk, kein ⌘Z, kein Sichern, nur Wachs als Material. Die harten Kanten deiner Form zeichnet sie
   weich.
2. **Zu zeigt sie die Form selbst, nicht die geschnittene Haut.** Die Bibliothek braucht einen Spalt mit Breite (0,18 Einheiten);
   zeigt man geschlossen die geschnittene Haut, sind 276 bis 509 Bildpunkte anders: eine Haarlinie. Im Bau teile ich die Dreiecke
   an der Linie direkt, mit Breite null; Kriterium: 0 Bildpunkte auch dann.
3. **Der Schnitt ist zu langsam fürs Ziehen an der Lippe** (0,25 bis 0,43 s für die ganze Form). Im Bau nur die getroffenen
   Dreiecke; ich teste es, Kriterium: unter 16 ms an „teat firefish“.
4. **Die Lippenlinie hat in der Studie keine Punkte.** Sie ist ein Profil von der Seite. Punkte auf der Haut, Griffe, K, von vorn
   gezeichnet: nicht gebaut.
5. **Weit offen staucht sich die Haut hinter dem Mundwinkel zu einer Falte** (Bildblatt 1, Bild 6; bei 22° und 70°). Die Regel,
   welcher Teil mit dem Kiefer geht, ist in der Studie die einfachste, die trägt (ein Fächer um das Scharnier). Im Bau: die
   Gewichte von Sitzung 4 (`maulGeformtAmLoop`) oder ein Knochen mit halbem Winkel am Mundwinkel (Recherche vom 12.10.);
   Kriterium: an „teat firefish“ bis 70° keine Falte.
6. **„Lippen trennen“, das offen gezeichnete Maul, Rachenlinie und Wölbung: nicht gebaut,** nur beschrieben.
7. **Zähne:** Formen nur aus Zahlen (acht Vorlagen); einen Zahn frei mit Linien formen geht nicht. Die Wurzel sieht man nur in der
   Linse.
8. **Zunge:** eine Kette mit elf Knoten; sie stößt an Gaumen und Boden, nicht an Zähne. Pose halten, Kleben, Vorlagen: nicht
   gebaut.
9. **Paint-Ebene, Pose (speichern, mehrere), Backen: nicht gebaut.**
10. **iPad und Stift: nichts geprüft.** Gebaut ist alles mit Zeiger-Ereignissen (Finger dreht, zwei Finger zoomen).

**Risiken, die ich sehe:**

- **Die Lippe kriecht bei weiten Zügen an der Form.** Dieselbe Sache wie bei der Bemalung (Liste „was bleibt“, C1): Das Werk
  rechnet die Haut ohne Gedächtnis neu, Orte auf der Haut wandern dabei bis 0,7 Einheiten. Für eine Lippe ist das mehr als für
  eine Farbfläche. Abhilfe wäre dieselbe (nach jedem Zug an den Linien der Form ausrichten).
- **Die Bemalung der Haut bei offenem Maul.** Die Farbe verlässt sich heute darauf, dass die Anzeige alle Dreiecke der Haut in
  ihrer Reihenfolge zeigt. Eine aufgeschnittene Haut tut das nicht. Das braucht einen eigenen Weg (die Orte durch den Schnitt
  tragen) und ist der Kern von Etappe 5.
- **Die Pose im Werk** dreht heute im Werk (ein Kieferwinkel, ein Schädelwinkel, das Maul von Sitzung 4). Das neue Maul dreht in
  der Anzeige. Beides muss zusammenfinden, ohne die Rechnung von Sitzung 4 anzufassen: ein neuer Handgriff im Werk neben den alten
  (dafür frage ich dich vorher, wie vereinbart).

## 9. Etappen

Nichts davon baue ich ohne dein Wort. Jede Etappe hat eine sichtbare Probe an einer deiner Formen und endet mit einem Film.

| Etappe | Was | Probe und Kriterium |
| --- | --- | --- |
| 1 | **Das Maul in Ozzy:** Linie (P oder Freihand, Seite oder im Raum) → Tropfen „Maul“ → Schnitt in der Anzeige; zu türkis; alle Materialien; ⌘Z, Sichern, Laden; das Maul von Sitzung 4 bleibt daneben | „teat firefish“: zu 0 Bildpunkte anders; Schnitt mit Breite null |
| 2 | **Kiefer:** zwei Knochen als Tropfen in der Pose „Fressen“; Reichweite; der Mundwinkel ohne Falte | bis 70° keine Falte; Kiefer einzeln; Stellen unter 4 ms |
| 3 | **Lippenlinie bearbeiten:** Punkte auf der Haut, Griffe, K rund mit Breite; Punkte der Form an der Lippe; schneller Schnitt | Ziehen an der Lippe unter 16 ms je Bild |
| 4 | **Lippen trennen** und das offen gezeichnete Maul | dein Blatt 06 (Rex) nachgestellt: oben lang, unten zurück, zu und offen |
| 5 | **Tasche und Farbe:** Rachenlinie, Wölbung; das Maul als Ebene im Paint-Modus, Zahnfleisch als Farblinie, aufgeklappt malen; die Bemalung der Haut bei offenem Maul | deine Farben aus Bild 14 nachgemalt |
| 6 | **Zähne:** Reihen, Vorlagen, Linse mit Formenring und Drehregler, einzelner Zahn, Sitz außen | dein Bild 07 und der Rex aus Blatt 06 nachgestellt |
| 7 | **Zunge:** liegt, Gummi, Pose halten, Vorlagen | die Zunge des Hunds aus Bild 14: breit auf dem Unterkiefer, im weit offenen Maul |
| 8 | **Ein Zahn als kleine Form:** in der Linse mit Linien und Punkten frei formen | ein Zahn, den keine Vorlage kann |
| 9 | **Posen:** alles in der Pose bearbeiten (Form, Lippe, Zähne, Zunge), Posen als Tropfen, zwischen zwei Posen ziehen | ein kleines Maul wird offen groß und rund |
| 10 | **Backen** fürs Spiel | zu keine Kante im Licht; Öffnen im Spiel-Renderer; höchstens 8 000 Dreiecke |

Mein Vorschlag für die Reihenfolge: 1, 2, 3 (dann ist das Maul selbst fertig), 6 und 7 (sie stehen in der Studie am weitesten),
dann 4, 5, 9, 8, 10. Etappe 4 vor 6, wenn dir Über- und Unterbiss wichtiger sind als die Zähne.

## 10. Was bei dir liegt

**Diese zwei Fragen halten den nächsten Schritt auf:**

1. **Trägt der Weg „das Maul ist ein Schnitt“?** Sieh dir dazu die Studie an (Tropfen an den Kiefern ziehen, „Zähne“, einen Zahn
   antippen, am Rad drehen, die Zunge ziehen, P und selbst eine Linie zeichnen). Der Preis steht in 3.2: Gaumen und Boden folgen
   einer festen Regel und wenigen eigenen Linien, nicht beliebigen Loops.
2. **Soll ich mit Etappe 1 in Ozzy beginnen?**

**Für dich entschieden, du kannst es umdrehen:**

- Der erste Tipp wählt die Reihe, der zweite den einzelnen Zahn.
- Ein einzelner Zahn nimmt sein Spiegelbild mit.
- Unten ein Zahn weniger als oben.
- Der Drehregler liegt um die Linse (nicht am Bildrand).
- Die Lippe trägt deine Farben aus Blatt 05.
- Zu wird die Linie gezeigt (türkis), solange die Linien zu sehen sind; ohne Linien ist das Maul unsichtbar.
- Zähne innen passen sich dem Spalt an; nur Zähne außen behalten geschlossen ihre Länge.

**Steht aus, eilt nicht:** was „Lippen trennen“ genau können muss (mein Vorschlag in 4.4); die Namen und Formen der Vorlagen; die
Tasten; ob die Zunge in der Grundform zurückschnellt oder liegen bleibt.

## 11. Dateien

- Studie: `apps/editor/maul.html`, `apps/editor/src/maulstudie/` (`main.ts`, `schnitt.ts`, `form.ts`, `gebiss.ts`, `zahn.ts`,
  `zunge.ts`, `linse.ts`, `maul.css`). Adresse: `?form=<Name>` (Standard „teat firefish“), `?linie=x,y;x,y;…`, `?reich=1,1.9`,
  `?fein=0|1|2`, `?ruhe=1` (ohne die Bewegung am Anfang). Haken: `window.__maul`.
- Bilder: `apps/editor/scripts/ozzy/maul-studie-bilder.mjs` (nimmt auf), `maul-studie-bogen.mjs` (setzt die zwei Blätter).
- Bedienung der Studie: Ziehen im Leeren dreht, Rad zoomt; Tropfen an den Kieferspitzen öffnen; Leiste unten: „P · Linie“
  (eine eigene Maullinie von der Seite zeichnen, dann der Tropfen „Maul“), „Maul“ (an und aus), „Zähne“, „Zunge“, „Linien“,
  vier Blicke. Tasten: 1 bis 4 Blick, P zeichnen, Esc.

## 12. Nachtrag (20.11., nach deiner Rückfrage): Mit dem Bestätigen wird das Maul echte Form

Deine Rückfrage, wörtlich:

> das mit dem Maul und Zähne gefallen mir sehr gut. Aber bedeutet das dass ich das innere des mauls nicht bearbeiten kann?
> zahnfleischlinie, maultasche, bemalung/textur und die kieferpunkte sollten nach dem erstellen genauso bearbeitbar sein wie der rest
> des meshs.
>
> Es soll dann eine ebene maul mit der zahnfleischlinie und den farben des mauls angelegt sein. Ich muss auch ganz abgefahrene
> maulformen erstellen können mit riesen über und unterbiss und großen hauern auf einer seite auch im geschlossenen zustand. Wird das
> dann gehen?

### 12.1 Die Antwort

**Mit dem Schnitt allein, wie er in Abschnitt 3 steht: nein.** Dort sind Tasche und Kiefer abgeleitet. Die Tasche hätte nur drei
eigene Linien, die Punkte der Lippe glitten auf der Haut, statt den Kiefer zu formen, und zwei Kiefer, die geschlossen
übereinanderstehen, kann ein Schnitt in einem geschlossenen Körper nicht darstellen. Das war der Preis aus 3.2, und er ist dir zu
hoch. Darum:

**Der Schnitt ist die Geburt des Mauls. Mit dem Bestätigen wird es echte Form.** Es entsteht genau so, wie die Studie es zeigt
(eine Linie, zu unsichtbar, saubere Tasche, harte Kante). Aber was dabei entsteht, wird der Form übergeben, wie beim Anwenden eines
Abziehens (Sitzung „Objekte“, ⌥ + Klick):

- **Die Tasche ist Haut der Form.** Du ziehst darin Linien mit P, setzt Kanten, wählst Felder, malst: wie überall.
- **Die Lippe ist eine Linie der Form,** mit Kante, Punkten und Griffen. Ziehst du einen ihrer Punkte, geht die Haut des Kiefers
  mit. Das sind deine Kieferpunkte.
- **Linien der Form, die über das Maul liefen, sind an der Lippe geschnitten;** dort stehen die neuen Kreuzungen. Was in der
  Öffnung lag, ist weg. Das ist dein Satz von heute früh, und es ist genau das, was das Anwenden eines Abziehens seit dem 18.11. tut.
- **Im Maul liegen von Anfang an zwei Linien:** die Mitte von Gaumen und Boden (von der Seite mit der Form der Maullinie, dein Wort
  vom 13.11.) und die Rachenlinie von Mundwinkel zu Mundwinkel (dein Wort vom 14.11.). Mehr nur, wenn du sie ziehst.
- ~~**Gerechnet wird das Maul leicht geöffnet,** als Bucht zwischen zwei Kiefern, so wie du „maul handgemacht test“ gebaut hast.
  „Zu“ und jede andere Stellung stellen die Knochen.~~ **Nach der Probe P1 (12.6) umgekehrt: Gerechnet wird das Maul zu.** Das
  ist die Ruhe der Form; die Knochen öffnen nur, was gezeigt wird (wie die Pose seit dem 14.11.). Du siehst und bearbeitest es in
  jeder Stellung.
- **Lippen zusammen:** Jeder Punkt gilt für beide Lippen. **Lippen trennen:** zwei Linien, jeder Kiefer für sich formbar.
  Geschlossen dürfen die Kiefer dann übereinanderstehen; was innen liegt, sieht man nicht. Das ist der Weg zu riesigem Über- und
  Unterbiss.
- **Die Studie bleibt, wofür sie gut ist:** als Vorschau im Augenblick des Bestätigens, für die genaue Zuordnung jeder Linie und
  Kreuzung zu ihrem Kiefer (daran scheiterte es am 14.11.) und fürs Backen.

| Du willst | Geht das? | Stand |
| --- | --- | --- |
| Zahnfleischlinie bearbeiten | ja: eine Farblinie längs der Lippe, mit Punkten, Breite, hart oder weich | Farblinien gibt es (Paint-Modus); im Maul nicht geprüft |
| Maultasche bearbeiten wie den Rest | ja, sobald sie Haut der Form ist | Probe 12.2: Die Tasche wird Haut; darin formen: nicht geprüft |
| Bemalung, Textur im Maul | ja: Die Tasche ist Haut, also bemalbar. Zum Hineinmalen muss das Maul offen oder aufgeklappt stehen | nicht geprüft (in der Pose steht die Bemalung heute nicht im Bild) |
| Kieferpunkte bearbeiten | ja: Die Lippe ist eine Linie der Form | 18.11. im Kern gemessen: Ein Punkt der Naht lässt sich ziehen, die Rechnung kommt zur Ruhe |
| Eine Ebene „Maul“ mit Zahnfleischlinie und Farben, von selbst angelegt | ja | nicht gebaut (Etappe 4 neu) |
| Riesiger Über- und Unterbiss, auch geschlossen | ja, über „Lippen trennen“ und zwei Kiefer, die jeder für sich geformt werden | nicht geprüft; das ist der größte offene Punkt (12.3, P3) |
| Große Hauer auf einer Seite, auch geschlossen | ja: Ein Zahn lässt sich von seinem Spiegelbild lösen; Zähne vor der Lippe behalten geschlossen ihre Länge | Länge geschlossen: Bildblatt 2, Bild 12; das Lösen vom Spiegelbild: nicht gebaut, klein |

### 12.2 Die Probe dazu (heute, in Ozzy selbst, kein Code geändert)

Bildblatt 3: [`2026-11-20-maul-echte-form-probe.jpg`](../progress/ozzy/2026-11-20-maul-echte-form-probe.jpg). Skript
`apps/editor/scripts/ozzy/maul-echt-probe.mjs`.

Was ich getan habe, mit dem, was Ozzy heute kann: einen Körper gezeichnet, davor ein zweites, flaches Objekt als Raum des Mauls,
„Abziehen“ angewendet (⌥ + Klick), dann den Tropfen „Maul“ an der Naht angetippt und „Fressen“ auf 25° und 50° gestellt.

| Geprüft | Ergebnis |
| --- | --- |
| Die Tasche ist Haut der Form | eine Form, geschlossen, spiegelgleich (1 430 Punkte, keine offene Kante) |
| Die Lippe ist eine Linie | ein Ring mit Kante und drei Punkten, gewählt; der Tropfen „Maul“ erscheint an ihr |
| Die Knochen greifen | „Fressen“ 25° und 50°: Der Unterkiefer öffnet |
| Nichts schlägt um | 6 Dreiecke als umgeschlagen gezählt, vor und nach dem Öffnen dieselben |

**Was die Probe nicht zeigt:** Der Körper hatte keine eigenen Linien (dein Randfall). Das Maul war ein aufgeblasenes Objekt, kein
durchgestanzter Keil aus einer Linie, also mit Wangen und ohne spitzen Mundwinkel. „Zu“, Zwillinge, getrennte Lippen und die
Bemalung kamen nicht vor.

### 12.3 Was offen ist: vier Proben, in dieser Reihenfolge

Zwei Erfahrungen stehen gegeneinander: Am 13.11. lief eine Tasche, die auf einmal ins Netz gebaut war, in acht Fassungen davon.
Am 18.11. hielt ein angewendetes Abziehen mit Kante. Welche hier gilt, zeigt nur die Probe an deiner Form.

| Nr. | Probe | Kriterium |
| --- | --- | --- |
| P1 | **Das Maul aus einer Linie als echte Form, an „teat firefish“** (im Kern, ohne Fenster): Kiefer mit der Regel der Studie leicht öffnen, den Keil abziehen und anwenden, die Rechnung laufen lassen | Sie kommt zur Ruhe; nichts schlägt neu um; fern vom Maul bewegt sich die Haut weniger als 0,5 Einheiten; zurückgedreht auf „zu“ liegt die Haut an der Lippe weniger als 1 Einheit neben der Form von vorher, der Spalt der Lippen unter 0,5 |
| P2 | **Der Mundwinkel:** Am Scharnier ist die Tasche dünner als die Maschen (14.11.: bis 6 umgeschlagene Dreiecke). Der Keil bekommt dort eine kleine Rundung | auf dem Rechennetz des Fensters nichts umgeschlagen, nichts tritt durch die Haut |
| P3 | **Lippen trennen:** dein Blatt 06 (Rex) nachstellen, oben lang, unten zurück, geschlossen und offen | die zwei Lippen einzeln gezogen, geschlossen kein Loch und keine Falte außen |
| P4 | **Die Ebene „Maul“:** Füllung innen und Zahnfleischlinie in der Tasche, bei offenem Maul gemalt | Farbe und Linie sitzen nach Schließen und Öffnen, wo sie waren |

Hält P1 nicht, sage ich es und zeige, woran es liegt; dann bleibt als zweiter Weg, die Tasche in Schritten zu formen wie am 13.11.
(das hielt), mit der Zuordnung aus dem Schnitt. **P1 ist gerechnet: Ergebnis in 12.6** (geöffnet gerechnet hält es nicht, zu
gerechnet mit Linien im Maul fast; der zweite Weg ist dafür nicht nötig).

**Schon bekannt aus dem 18.11. (Plan „Objekte“, Beweis im Kern, zwei Kugeln mit je drei Linien):** Nach dem Abziehen steht die
Rechnung nach 2 bis 3 Runden, nichts schlägt um, die Kante ist sauber (86°), die Wand der Höhle trägt die Linien des abgezogenen
Objekts, und ein Punkt der Naht, um 20 gezogen, nimmt beide Formen mit. **Und eine Warnung von dort:** Wird die Naht mit K weich,
fällt die Höhle zu einer flachen Mulde zusammen, solange wenige Linien sie halten. „K rundet nur die Lippe“ braucht darum an einer
echten Tasche die schmale Rundung des Verbunds, nicht die weiche Linie.

### 12.4 Die Etappen, neu geordnet

| Etappe | Was | Vorher |
| --- | --- | --- |
| 1 | **Das Maul als echte Form in Ozzy:** Linie → Tropfen „Maul“ → Vorschau als Schnitt → angewendet; Linien im Maul; ⌘Z, Sichern | P1, P2 |
| 2 | **Kiefer:** zwei Knochen als Tropfen; „zu“ als Stellung; der Mundwinkel ohne Falte | |
| 3 | **Lippen:** zusammen (ein Punkt gilt für beide), trennen, Über- und Unterbiss, geschlossen bearbeiten | P3 |
| 4 | **Die Ebene „Maul“:** Farben, Zahnfleischlinie, im Maul malen | P4 |
| 5 | **Zähne:** wie Abschnitt 4.6 und 4.7, dazu ein Zahn ohne Spiegelbild | |
| 6 | **Zunge** | |
| 7 bis 9 | ein Zahn als kleine Form; Posen; Backen | |

Nach P1 (12.6): In Etappe 1 gehört der Schnitt ohne Spalt, in Etappe 2 ist „zu“ keine Stellung der Knochen mehr, sondern die Ruhe
der Form.

### 12.5 Was bei dir liegt

Eine Frage hält den nächsten Schritt auf: **Soll ich die Probe P1 rechnen?** Sie entscheidet, ob Etappe 1 so gebaut werden kann.

Deine Antwort (20.11.): „Ja, P1 rechnen“. Das Ergebnis steht in 12.6, die nächste Frage in 12.7.

### 12.6 Ergebnis der Probe P1 (20.11.)

Bildblatt 4: [`2026-11-20-maul-p1-probe.jpg`](../progress/ozzy/2026-11-20-maul-p1-probe.jpg). Probe im Kern, ohne Fenster:
`apps/editor/scripts/pruefen/form-maul-echt.ts` (Aufruf im Kopf der Datei; ein Lauf dauert rund 12 Sekunden). In Ozzy, am Werk und
am Rechenkern ist nichts geändert.

**Kurz:** So, wie ich P1 in 12.3 festgelegt hatte (leicht geöffnet rechnen), hält es **nicht**. So, wie der Nachtrag es sonst
beschreibt (Linien im Maul, **zu** gerechnet, die Knochen öffnen nur die Anzeige), hält das Maul an „teat firefish“ fast: Die
Rechnung steht sofort, die Tasche bleibt, fern ändert sich nichts, und die Kiefer beeinflussen sich nicht. Drei meiner Kriterien
sind knapp verfehlt: ein gefaltetes Dreieck am Mundwinkel, der Spalt der Lippen, und 1,5 statt 1 an der Haut des Unterkiefers.

**Was gerechnet wurde.** Deine Form „teat firefish“, wie das Fenster sie lädt (11 765 Punkte, 17 Linien, mittlere Netzkante 13,3).
Die Maullinie der Studie, als hauchdünner Keil (0,4 breit) abgezogen und angewendet, mit dem Baustein vom 18.11. Das dauert 0,1 s.
Danach: 12 312 Punkte, die Lippe ist ein Ring mit Kante (136 Punkte des Netzes). Zwei deiner Linien sind an der Lippe geschnitten:
die Mittellinie der Form (sie endet jetzt vorn an Ober- und Unterlippe) und die Linie von der Schnauzenspitze über die Seite nach
hinten (jetzt zwei Stücke, beide hängen an der Lippe). Keine ging verloren.

| | A: wie in 12.3 festgelegt | B: wie im Nachtrag | C: wie B, ohne Aufräumen |
| --- | --- | --- | --- |
| Was | Kiefer 8° und 22° geöffnet, so gerechnet, keine Linien im Maul | Linien im Maul (Mitte von Gaumen und Boden, Rachenlinie), zu gerechnet, Netz aufgeräumt wie im Fenster (Nadeln zusammenlegen, verdichten) | dasselbe, das Netz bleibt, wie der Schnitt es hinterlässt |
| K1 Die Rechnung kommt zur Ruhe | ja, nach 71 Runden | **ja, nach 2 Runden** | ja, nach 3 Runden |
| K2 Nichts schlägt neu um | **nein:** 6 Dreiecke an der Unterlippe gefaltet | **nein:** je Seite 1 Dreieck am Mundwinkel (siehe unten) | **nein:** je Seite 4 Splitter an der Lippe (siehe unten) |
| K3 Fern bewegt sich die Haut unter 0,5 | **nein:** 1,34 | ja: 0,48 (davon 0,30 vom Aufräumen selbst) | ja: 0,04 |
| K4 Zu liegt die Haut außen unter 1 neben der Form von vorher | **nein:** bis 20,44; 578 Punkte über 1 | **knapp nein:** bis 1,52; 28 von 11 814 Punkten über 1 | **knapp nein:** bis 1,38; 20 von 12 035 |
| K5 Der Spalt der Lippen unter 0,5 | **nein:** 1,65 | **knapp nein:** 0,59 (angelegt war der Spalt 0,40 breit) | **knapp nein:** 0,76 |
| Die Tasche | bläst sich auf: Wände bis 49,79 neben den geraden Wänden | bleibt: höchstens 0,80 | bleibt: höchstens 0,90 |

Zum Vergleich: Deine Form allein, ohne Maul, bewegt sich beim ersten Rechnen bis 1,95 (sie ist nicht ganz in Ruhe gesichert);
genauso aufgeräumt und gerechnet wie in B liegt sie danach höchstens 0,30 neben sich selbst.

**Warum A nicht hält.** Eine mit den Knochen geöffnete Form ist für die Rechnung keine Ruhe: Sie rundet die gedrehte Haut im
Auslauf hinter dem Mundwinkel neu (bis 20 daneben), und eine Tasche ohne eigene Linien bläst sie auf. Das ist dieselbe Erfahrung
wie am 13.11. (Geometrie fertig ins Netz bauen und die Rechnung darauf loslassen). Der Satz „gerechnet wird das Maul leicht
geöffnet“ aus 12.1 ist damit falsch und oben gestrichen.

**Was in B und C hält** (Bildblatt 4, obere Reihe):

- **Zu ist die Ruhe.** Die Rechnung steht nach 2 bis 3 Runden. Fern vom Maul liegt die Haut danach 0,04 (C) und 0,48 (B) neben
  der Form von vorher; in B kommen davon 0,30 vom Aufräumen selbst (so viel bewegt es die Form auch ohne Maul).
- **Die Tasche bleibt eine Tasche,** sobald die zwei Linien in ihr liegen (die Mitte von Gaumen und Boden, die Rachenlinie). Diese
  zwei Linien sind also nicht nur da, damit du etwas zum Anfassen hast: Sie halten das Maul.
- **Die Knochen öffnen nur die Anzeige,** wie die Pose seit dem 14.11. Geöffnet (8° und 22°) spannt sich kein einziges Dreieck quer
  über das Maul, mit und ohne Aufräumen.
- **Welcher Kiefer ein Punkt ist, steht in den Linien des Mauls:** Die Lippe teilt sich am Mundwinkel in Ober- und Unterlippe; in
  der Tasche gehört zu einer Lippe, was von ihr aus zu erreichen ist, ohne die Rachenlinie zu überschreiten. Gegenprobe: An 1 836
  von 1 838 Punkten dasselbe wie die Zuordnung gleich nach dem Schnitt. Es braucht dafür keinen eigenen Wert je Punkt, der jeden
  Netzwechsel überstehen muss.
- **Die Kiefer beeinflussen sich nicht** (dein Satz aus dem Auftrag). Ein Punkt der Unterlippe, 15 von der Oberlippe weggezogen
  (zu): Der Unterkiefer folgt bis 14,84. Der Oberkiefer bewegt sich 0,00 (B) und höchstens 0,02 (C), seine Lippe 0,00, fern 0,06
  bis 0,13. In B steht die Rechnung nach 2 Runden, in C nach 85. (Das ist der Fall „Lippen getrennt“: In der Probe sind Ober- und
  Unterlippe zwei Ränder derselben Linie. Mit Lippen zusammen zieht ein Punkt mit Absicht beide.)

**Was nicht hält, und wo es liegt:**

1. **Der Mundwinkel (K2 in B).** Das Aufräumen legt am Mundwinkel je Seite ein Dreieck gefaltet auf seinen Nachbarn (Fläche 15,
   175° gegen den Nachbarn). Dort ist die Tasche dünner als das Netz; das ist die Probe P2. Ohne Aufräumen (C) sind es stattdessen
   je Seite 4 Splitter des Schnitts an Lippe und Mundwinkel (Fläche höchstens 0,05; ein gewöhnliches Dreieck dieses Netzes hat
   rund 77), die bei der kleinsten Bewegung umklappen.
   **Korrektur aus P2 (12.9):** Das Dreieck je Seite in B war keine Falte. Es ist ein Dreieck der Wand an der Rachenlinie; dort
   liegen Gaumen und Boden aufeinander, so soll es sein. Die alte Zählung hält es für umgeschlagen.
2. **Der Spalt (K5).** Die Bibliothek braucht einen Keil mit Breite; die Rechnung weitet ihn von 0,40 auf 0,59 bis 0,76. Im Bau
   muss die Lippe ohne Spalt entstehen (die Dreiecke an der Linie direkt teilen, Ober- und Unterlippe als Zwillinge am selben
   Ort). Das ist nicht gezeigt.
3. **Die Haut außen am Unterkiefer (K4).** Bis 1,38 und 1,52 neben der Form von vorher, an 20 bis 28 Punkten, rund 40 unter der
   Lippe an der Seite. Die Ursache ist nicht belegt. Meine Deutung: An der harten Kante der Lippe rundet jede Seite für sich,
   weil die Haut nicht mehr glatt über die Maullinie läuft.
4. **Am gezogenen Lippenpunkt** falten sich je Seite ein bis zwei weitere Dreiecke (Fläche 3 bis 10). Das Aufräumen, das im Werk
   nach jedem Zug läuft, lief in der Probe nicht; ob es Dreiecke an einer harten Kante aufrichtet, ist nicht geprüft.

**Zwei Fehler meiner eigenen Probe, die ich unterwegs gefunden habe** (damit die Zahlen oben nicht mit früheren verwechselt
werden): Zuerst hatte ich jeden Punkt nach seiner Lage einem Kiefer zugeordnet. Zu liegen die Wände aber nur 0,4 auseinander, und
nach dem Rechnen steht ein Punkt des Bodens leicht auf der Seite des Gaumens. Daraus kamen zwei falsche Befunde: „66 Dreiecke
spannen sich quer über das Maul“ und „der Oberkiefer bewegt sich 2,76“. Mit der Zuordnung aus den Linien sind es 0 und 0,00. Und
das Bild „die Form von vorher“ zeigte erst zwei Striche, die es nicht gibt.

**Was die Probe nicht zeigt:** nichts in Ozzy (kein Fenster, kein Look: Das Bildblatt ist ein flach schattiertes Messbild). Nur
diese eine Form und diese eine Maullinie. Kein Bearbeiten bei geöffnetem Maul, kein „Lippen trennen“, keine Bemalung, kein Ziehen
an Punkten im Maul, kein K an der Lippe.

**Was daraus für den Bau folgt** (ändert 12.1 an einer Stelle, sonst nichts):

- Die Ruhe der Form ist das geschlossene Maul. Die Knochen drehen nur, was gezeigt wird. Das Werk kennt das schon (Pose).
- Die zwei Linien im Maul entstehen mit dem Maul und gehören fest dazu.
- Der Kiefer eines Punkts wird aus Lippe und Rachenlinie gelesen.
- Der Schnitt braucht eine eigene Fassung ohne Spalt, und der Mundwinkel braucht eine Antwort (P2), bevor Etappe 1 in Ozzy beginnt.

### 12.7 Was jetzt bei dir liegt

Eine Frage hält den nächsten Schritt auf: **Soll ich die Probe P2 rechnen?** Wieder nur im Kern, an „teat firefish“: der Schnitt
ohne Spalt (Ober- und Unterlippe als Zwillinge am selben Ort) und der Mundwinkel. Kriterien, vorher festgelegt: zu ist der Spalt
genau null; nach dem Aufräumen des Werks ist am Mundwinkel nichts gefaltet; geöffnet spannt sich nichts über das Maul; außen
liegt die Haut weniger als 1 neben der Form von vorher (oder ich zeige, woher der Rest kommt). Hält das, kann Etappe 1 in Ozzy
beginnen.

Die anderen Wege: zuerst P3 („Lippen trennen“ an deinem Blatt 06), oder hier anhalten.

Deine Antwort (20.11.): „Ja, P2 rechnen“.

### 12.8 Probe P2: Aufbau und Messweise (festgelegt, bevor gerechnet wird)

**Aufbau.** Wie Fassung B in 12.6: die Maullinie als dünner Keil abgezogen und angewendet (das schneidet deine Linien an der
Lippe und legt die zwei Linien ins Maul). Neu ist der Schritt danach, der Reißverschluss: Alle Punkte der Lippe und der Tasche
kommen genau auf die Maullinie; der Spalt ist dann zu, Gaumen und Boden liegen aufeinander. Die Lippe wird ein zusammengeklappter
Loop, dessen Punkte paarweise Zwillinge sind (dein Bild aus dem Auftrag). Das Modell dafür hat der Kern seit dem 14.11.
(`maulLinie.ts`, hier mit dem Winkel 0: Die zweite Lippe ist genau das Abbild der ersten). Dann aufräumen wie im Fenster und rechnen.

| Nr. | Kriterium | Wie gemessen |
| --- | --- | --- |
| Z1 | Zu ist der Spalt genau null | (a) an der Linie: Ober- und Unterlippe haben dieselben Punkte und Griffe (Abweichung 0); (b) am Netz: größter Abstand eines Punkts der einen Lippe zur Kette der anderen, gleich nach dem Schließen und nach dem Rechnen |
| Z2 | Am Mundwinkel ist nach dem Aufräumen nichts gefaltet | kein Dreieck steht steiler als 120° gegen einen Nachbarn, mit dem es keine Kante einer harten Linie teilt (Lippe, Rachenlinie); die alte Zählung nenne ich dazu, mit Ort und Fläche |
| Z3 | Geöffnet spannt sich nichts über das Maul | mit den Knochen 8° und 22° geöffnet (nur Anzeige): kein Dreieck, dessen Kante sich mehr als verdoppelt; Falten wie Z2 als Angabe |
| Z4 | Außen liegt die Haut zu weniger als 1 neben der Form von vorher | Abstand jedes Punkts außen zur Fläche der Form von vorher; bleibt ein Rest, zeige ich, woher er kommt |
| Z5 | Die geschlossene Linie lässt sich als Ganzes ziehen | ein Punkt der Lippe 15 gezogen, sein Zwilling geht mit: Die Rechnung steht, Z1 und Z2 gelten weiter |

Dazu wie in P1: Die Rechnung kommt zur Ruhe, fern vom Maul bewegt sich die Haut weniger als 0,5.

### 12.9 Ergebnis der Probe P2 (20.11.)

Bildblatt 5: [`2026-11-20-maul-p2-probe.jpg`](../progress/ozzy/2026-11-20-maul-p2-probe.jpg). Dieselbe Probe wie P1, mit dem
neuen Schritt (`REISS=1 OBEN=0 UNTEN=0`, Aufruf im Kopf von `apps/editor/scripts/pruefen/form-maul-echt.ts`). In Ozzy, am Werk und
am Rechenkern ist nichts geändert.

**Kurz:** Das Maul ohne Spalt hält an „teat firefish“. Die Rechnung steht nach 2 Runden. Die Lippe ist ein zusammengeklappter
Loop mit Zwillingen, der Spalt an der Linie genau null. Am Mundwinkel ist nichts gefaltet, geöffnet spannt sich nichts, und die
geschlossene Linie lässt sich als Ganzes ziehen. Zwei Kriterien sind wörtlich nicht erfüllt, und bei beiden ist jetzt belegt,
woran es liegt: Am Netz bleibt zwischen den Lippen ein Rest von 0,14, und außen am Unterkiefer liegt die Haut 1,63 statt unter 1
neben deiner Form. Der zweite Rest kommt nicht vom Maul: Jede harte Linie an dieser Stelle bewegt die Haut genauso.

| Nr. | Kriterium | Ergebnis |
| --- | --- | --- |
| | Die Rechnung kommt zur Ruhe; fern unter 0,5 | **ja:** 2 Runden; fern 0,48 (davon 0,30 vom Aufräumen selbst) |
| Z1a | Zu ist der Spalt null, an der Linie | **ja, genau 0:** 13 Punkte (der Mundwinkel und sechs Paare), jede Lippe das Abbild der anderen; drei Punkte anderer Linien, die an der Lippe enden, gehen mit |
| Z1b | Zu ist der Spalt null, am Netz | **nein: bis 0,14** (gleich nach dem Schließen 0,32). Die zwei Lippen sind im Netz verschieden unterteilt (21 und 22 Punkte), liegen aber auf derselben Kurve |
| Z2 | Am Mundwinkel ist nach dem Aufräumen nichts gefaltet | **ja:** am ganzen Maul kein gefaltetes Dreieck |
| Z3 | Geöffnet spannt sich nichts über das Maul | **ja:** 0 gespannt, 0 gefaltet (8° und 22°) |
| Z4 | Außen liegt die Haut unter 1 neben der Form von vorher | **nein:** Unterkiefer bis 1,63 (32 Punkte über 1), Oberkiefer bis 0,33. Woher: siehe unten |
| Z5 | Die geschlossene Linie lässt sich als Ganzes ziehen | **ja, nach dem Aufräumen:** Beide Lippen gehen 14,84 von 15 mit, der Spalt an der Linie bleibt 0. Gleich nach dem Zug sind am gezogenen Punkt 6 Dreiecke gefaltet; nach dem Aufräumen, das im Werk auf jeden Zug folgt (hier nachgestellt), keines. Danach geöffnet: 0 gespannt, 0 gefaltet |

Die Tasche bleibt (Wände höchstens 0,75 neben gerade). Bildblatt 5, obere Reihe von links: deine Form vorher; mit Maul, zu;
mit den Knochen geöffnet; die geschlossene Linie 15 gezogen; dasselbe geöffnet (die Oberlippe trägt den Zacken, die Unterlippe
die passende Kerbe).

**Woher der Rest außen kommt (Z4).** Gegenprobe (Kontrolle 3, `KONTROLLE3=1`): dieselbe Form **ohne Schnitt**, ohne Tasche, ohne
geschnittene Linien. Nur eine Linie quer über die Form längs der Maullinie, vom Mundwinkel nach vorn hart (Kante an), dahinter
weich. Ergebnis: Unterkiefer bis 1,65 an derselben Stelle (34 Punkte über 1), Oberkiefer bis 0,48. Der Rest ist also das, was
„Kante an“ in der Rechnung von heute bedeutet: Neben einer harten Linie rundet jede Seite für sich. Ausgeschlossen sind damit das
Maul selbst, die Tasche und die geschnittenen Linien; dazu die Genauigkeit der Lippenlinie (genauer angelegt: 1,32), das Aufräumen
(ohne Maul 0,30) und ein langsames Weiterkriechen (300 weitere Runden: am Maul nichts).

Was daraus folgt: Solange die Lippe eine harte Kante ist, ist „zu“ nicht auf den Punkt die Form von vorher, sondern die Form mit
einer Kante an dieser Stelle. Ob man 1,6 Einheiten sieht, kann nur dein Auge im Look von Ozzy sagen. Soll „zu“ genau die Form von
vorher sein, müsste die Rechnung lernen, dass die Haut über eine geschlossene Lippe glatt weiterläuft. Das wäre eine Änderung am
Rechenkern und bleibt deinem Wort vorbehalten.

**Der Rest am Netz (Z1b).** Die Linie ist genau: Beide Lippen haben dieselben Punkte und Griffe. Im Netz sind es zwei Ketten auf
derselben Kurve, die das Aufräumen verschieden unterteilt; dazwischen bleiben linsenförmige Reste bis 0,14 (gleich nach dem Zug
kurz 0,35). Genau null im Netz ginge nur, wenn das Aufräumen des Kerns die zwei Lippen gleich unterteilt hielte; das kann es
heute nicht. Die Anzeige legt harte Linien auf ihre Kurve; was von dem Rest zu sehen ist, zeigt erst Ozzy.

**Was ich unterwegs gefunden habe (wichtig für den Bau):**

1. **Die Zwillingsregel des Kerns (14.11.) kennt nur Lippen, deren Enden auf der Spiegelebene liegen.** An einem Ende, das an
   einer anderen Linie hängt (die Mitte von Gaumen und Boden hängt vorn an der Lippe), setzt sie einen Griff nach außen, den es
   dort nicht gibt. Damit kippte die Rechnung in eine andere Ruhelage: Unterkiefer 6 statt 1,6 daneben, 42 bis 71 Runden. Mit dem
   Griff null: 2 Runden. Die Probe setzt ihn von außen zurück; für die erste Scheibe von Etappe 1 reicht das.
2. **Ohne Aufräumen kommt das Maul ohne Spalt nicht zur Ruhe** (602 Runden; die Punkte der Wände dicht an der Rachenlinie
   wandern). Das Aufräumen nach dem Schnitt gehört fest dazu; das Fenster tut es ohnehin.
3. **Welcher Kiefer ein Punkt außen ist:** die Lippe, die von ihm aus über die Kanten des Netzes zuerst erreicht wird (vor dem
   Mundwinkel trennt die Lippe die Haut der zwei Kiefer ganz). Das gilt auch an der verzogenen Lippe: nach dem Zug an 0 Punkten
   anders. Die Lage gegen die gezeichnete Maullinie sagt dort nichts mehr.
4. **Die alte Zählung „umgeschlagen“ taugt am Maul nicht.** Sie zählt das Dreieck der Wand an der Rachenlinie mit, das gewollt
   so liegt. Die neue Messung zählt Dreiecke, die steiler als 120° auf einem Nachbarn liegen, ohne dass eine harte Linie
   dazwischen ist.
5. **Ein weit herausgezogener Punkt zwischen dichten Nachbarn wird eine Klinge.** Mit 19 statt 13 Punkten auf der Lippe bleiben
   am gezogenen Punkt 6 Dreiecke gefaltet, auch nach dem Aufräumen. Das ist keine Sache des Mauls (jede Linie tut das; Feinschliff).
6. **Punkte am selben Ort.** Gaumen und Boden und die Zwillinge an Kreuzungen liegen jetzt genau aufeinander. Wer die Spiegelpaare
   einer solchen Haut aus den Lagen neu liest, ordnet sie falsch zu; sie müssen mitgeführt werden. Das Verdichten tut das seit
   dem 18.11.; das Teilen von Kanten liest sie neu, und das Laden einer gesicherten Form vermutlich auch (nicht geprüft).

**Was die Probe nicht zeigt:** wie bei P1 nichts in Ozzy, keinen Look, nur diese Form und diese Maullinie. Dazu nicht: „Lippen
trennen“ (P3), die Bemalung (P4), das Sichern und Laden einer Form mit Maul (Punkt 6).

### 12.10 Was jetzt bei dir liegt

Eine Frage hält den nächsten Schritt auf: **Soll ich mit Etappe 1 in Ozzy beginnen?** In zwei kleinen Schritten:

1. **Zuerst ein Vergleichsbild im Look von Ozzy** (Wachs, gleiche Ansicht, vorher und nachher): die Form aus P2 in Ozzy geladen,
   wenn es geht, ohne Ozzy zu ändern (ob das Laden mit Punkten am selben Ort zurechtkommt, weiß ich noch nicht: Punkt 6). Daran
   siehst du, ob das geschlossene Maul für dein Auge unsichtbar genug ist. Die zwei Reste oben (1,6 außen, 0,14 am Netz) sind
   Fragen an dein Auge, keine an eine Zählung.
2. **Dann die erste Scheibe:** eine Linie von der Seite, der Tropfen „Maul“, und das Maul entsteht wie in P2 (zu, Lippen als
   Zwillinge), mit ⌘Z. Noch kein Öffnen, keine Zähne. Dafür brauche ich dein Wort für einen neuen Handgriff im Werk (neben dem
   Abziehen). Am Rechenkern ändere ich dafür nichts.

Die anderen Wege: zuerst P3 („Lippen trennen“ an deinem Blatt 06), oder hier anhalten.

Deine Antwort (20.11.): „Du musst mir nicht immer Vergleiche und Tests zeigen. Starte Etappe 1. Wir behalten es im Kopf und machen
dann einen großen Feinschlifflauf am Ende.“ Das Vergleichsbild entfällt; Offenes steht ab jetzt in
[`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md).

### 12.11 Etappe 1, erste Scheibe: gebaut (20.11.)

In Ozzy: in der Seite mit P eine Linie vom Leeren vor der Form bis zum Mundwinkel in ihr, ↩. Sie bleibt stehen und bekommt den
Tropfen „Maul“; der Tropfen macht daraus das Maul wie in P2 (zu gerechnet, die Lippe ein zusammengeklappter Loop mit Zwillingen,
zwei Linien im Maul). ⌘Z nimmt es zurück, Esc verwirft die wartende Linie. Zieht man einen Punkt der Lippe, geht sein Zwilling
mit (das konnte das Werk schon, vom Maul aus einer Linie des 14.11.).

Wo: der Baustein `apps/editor/src/form/maulEcht.ts` (ohne Fenster, Tests `maulEcht.test.ts`), der Handgriff `werk.maulSchneiden`,
der wartende Strich in `werkBlatt.ts` (`maulStrich`), der Tropfen in `main.ts` (`maulUiZeigen`). Probe im Fenster:
`scripts/pruefen/ozzy-maul-fenster.mjs` (an „teat firefish“ und mit `FRISCH=1` an einem frischen Oval).

Anders als in P2: (1) Nach dem Schließen wird eine Seite um einen Hauch (0,03°) um den Mundwinkel gedreht, damit keine zwei Punkte
am selben Ort liegen (der Kern läse sonst die Spiegelpaare falsch). (2) Der Keil ist am Mundwinkel eine Schneide (in P2 fielen
dort drei Punktreihen auf einen Ort). (3) Die Splitter des Schnitts werden vor dem Zwillingsschritt zusammengelegt. (4) Die zwei
Enden einer geschnittenen Linie kommen an der Lippe auf einen Ort. Am Rechenkern ist nichts an der Rechnung geändert; er gibt eine
vorhandene Funktion nach außen (`kantenTeilenMit`).


### 12.12 Etappe 2: gebaut (20.11.)

Deine Antwort (20.11.): „Ja, Etappe 2“.

In Ozzy: Mit dem Maul gibt es die Pose „Fressen“ (oben 8°, unten 34°) und an jeder Kieferspitze einen Tropfen an einer Haarlinie
zum Mundwinkel, rosa oben, blau unten. Ziehen dreht den Kiefer um den Mundwinkel, jeder für sich; knapp vor „zu“ (unter 2°) rastet
er zu; weiter als 70° unten und 45° oben geht es nicht. In der Grundform bleibt das Maul zu: Hältst du einen Tropfen, öffnet es
sich für einen Blick und schließt beim Loslassen. „Fressen“ (die Tafel oben rechts) lässt es offen. Gleich nach dem Schneiden
zeigt sich das Maul einmal (auf und wieder zu). Ein Zug an einem Tropfen ist ein Schritt für ⌘Z.

Wie: Die Ruhe der Form bleibt das geschlossene Maul, die zwei Knochen drehen nur, was gezeigt wird (das Werk kannte das von der
Pose seit dem 14.11.; das neue Maul hängt jetzt daran, `G.maul` ist seine Lippe). Welcher Kiefer ein Punkt ist, steht in den Linien
(Lippe am Mundwinkel geteilt, Tasche bis zur Rachenlinie; außen vor dem Mundwinkel die nähere Lippe, dahinter die Seite der Geraden
durch den Mundwinkel). Wie weit er mitdreht: vor dem Mundwinkel ganz, so weit der Kiefer reicht (1,15 Längen der Lippe); hinter
dem Mundwinkel läuft die Drehung über den Winkel um das Scharnier aus, nach außen über den Abstand. **Beide Ausläufe werden mit dem
Winkel des Kiefers breiter**, damit weit geöffnet nichts faltet: Quer bleibt von der Haut hinter dem Mundwinkel mindestens 30 %,
die Scherung am Rand der Reichweite bleibt unter 1,25. Mit festen Ausläufen (wie in der Studie) schlug bei 70° der Bauch von „teat
firefish“ einen Haken.

Geprüft im Fenster (`ozzy-maul-fenster.mjs`, Kriterien 8 bis 12, an „teat firefish“ und an einem frischen Oval): bei 34°/8° und
am Anschlag (70° unten) kein gefaltetes Dreieck, größte Dehnung einer Kante 1,5; die Tasche dreht starr (Test); das Drehen der
Anzeige dauert 0,5 ms an „teat firefish“; „Fressen“ aus gibt die Grundform genau zurück. Die Linien liegen in der geöffneten Lage
auf der Haut (Ozzy zeichnete Linien im Übergang bisher aus gedrehten Punkten und Griffen; weit geöffnet lagen sie im Bild sichtbar
neben dem Umriss, nicht gemessen: jetzt je Ort vom Pfad der Ruhe, `stueckeGezeigtBei`).

Nicht gebaut aus der Zeile des Plans: der Tropfen für die Reichweite und das verschiebbare Scharnier. Bilder:
`docs/progress/ozzy/2026-11-20-maul-etappe2-fressen.jpg`, `…-weit.jpg`, `…-blick.jpg`. Offenes:
[`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md).

### 12.13 Probe P3 und Etappe 3: gebaut (20.11.)

Deine Antwort (20.11.): „Ja, Etappe 3“. Die Probe P3 habe ich, wie angekündigt, selbst gerechnet, gleich im Fenster mit dem
Handgriff selbst (Kriterien 13 bis 16 von `ozzy-maul-fenster.mjs`).

**P3 hält** an „teat firefish“ und an einem frischen Oval: Nach „Lippen trennen“ lässt sich jede Lippe für sich ziehen, die Form
kommt zur Ruhe, die andere Lippe bleibt genau stehen (0,000). Der Überbiss (jeder Punkt der Unterlippe ein Viertel zum Mundwinkel
hin, oben lang, unten zurück) steht zu und offen im Bild; geöffnet faltet nichts. Auch eine Lücke hält (ein Punkt der Unterlippe 10
nach unten, einer der Oberlippe 6 nach oben: das Maul steht dort auch geschlossen offen). Was das Werk danach als umgeschlagen
zählt (4 bis 6 Dreiecke), liegt an der Lippe und in der Tasche am Mundwinkel, außen nichts. Dein Blatt 06 selbst (Rex) ist nicht
nachgebaut: Die Form gibt es nicht in `wesen/`.

**In Ozzy:** Ist ein Punkt der Lippe gewählt, hängt hinter dem Mundwinkel der Tropfen „Lippen trennen“. Danach gelten die Punkte
nicht mehr für beide Lippen: Oberlippe und Unterlippe sind die zwei Hälften eines Rings, die sich im Mundwinkel treffen. Wo sie
noch aufeinanderliegen, stehen zwei Punkte am selben Ort; welche Lippe du greifst, sagt die Seite des Zeigers (über der Linie die
obere, darunter die untere). Jeder Kiefer liest seine Lage jetzt aus seiner eigenen Lippe: Sein Tropfen sitzt an seiner Spitze, er
reicht so weit, wie seine Lippe lang ist. „Lippen verbinden“ (derselbe Tropfen) macht die Unterlippe wieder zum Abbild der
Oberlippe. Beides ein Schritt für ⌘Z.

**Wie:** Trennen nimmt der Lippe nur die Marke des zusammengeklappten Loops (`maulLinie`); die Form ändert sich dabei nicht. Das
Maul der Form merkt sich, dass es echt ist und welche Hälfte der Kette die Unterlippe ist (`G.maul.echt`, `ersteUnten`). **Das zu
merken ist nötig:** Aus der Lage gelesen kippte die Zuordnung an einer Kugel, sobald die Unterlippe gekürzt war (Test). Am
Rechenkern ist nichts geändert.

Nicht gebaut: die Farben der Lippen (türkis, rosa, blau: Die Anzeige der Linien kennt nur eine Tinte), ein Kiefer als Ganzes
gerückt, ein Zeichen am Zeiger, welche Lippe er greifen würde. Bilder: `docs/progress/ozzy/2026-11-20-maul-etappe3-ueberbiss.jpg`,
`…-ueberbiss-offen.jpg`. Offenes: [`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md), Punkte 30 bis 39.

### 12.14 Probe P4 und Etappe 4: die Ebene „Maul“, gebaut (20.11.)

Deine Antwort (20.11.): „Ja, Etappe 4“. Die Probe P4 lief wieder im Fenster (`ozzy-maul-farbe-fenster.mjs`, Kriterien F1 bis F7,
auf Wachs an „teat firefish“).

**In Ozzy:** Mit dem Maul gibt es im Paint-Modus eine Ebene „Maul“, oben im Stapel: das Innere dunkelrot, längs der Lippe ein
hellerer Ring für das Zahnfleisch (ein Zehntel der Lippenlänge breit). Die Grenze zwischen beiden ist eine Farblinie, die du wie
jede bedienst. Zu ist von außen keine Farbe zu sehen; offen steht sie im Maul, in „Fressen“ und beim Blick. Wählst du im
Paint-Modus die Ebene „Maul“, öffnet sich das Maul, damit du hineinmalen kannst; mit einer anderen Ebene schließt es wieder.
⌘Z, das das Maul zurücknimmt, nimmt die Ebene mit. Gewählt bleibt nach dem Schneiden die Ebene, auf der du warst.

**P4 hält:** Die Farblinie liegt nach „Fressen“ aus und an genau, wo sie lag; eine Füllung, bei offenem Maul gesetzt, sitzt nach
Schließen und Öffnen an derselben Stelle; nach einem Zug an der Lippe und nach dem ganzen Ablauf von Etappe 3 (Lippen trennen,
Überbiss, verbinden: 11 bis 17 Netzwechsel) trifft von außen kein Strahl Farbe.

**Wie, und was dabei herauskam:** Die Zahnfleischlinie ist eine Höhenlinie des Abstands von der Lippe in der Tasche (vom Gaumen
über die Rachenlinie zum Boden). In der ersten Fassung hielt eine zweite Farblinie knapp hinter der Lippe die Farben im Maul. Das
hielt den Netzwechseln nicht stand: Nach den Zügen von Etappe 3 lief die Füllung über die ganze Form (2 530 von 8 911 Strahlen
trafen Farbe; vermutlich landete beim Netzwechsel ein neu gesuchter Ort der Linie auf der Haut außen, nachgesehen habe ich das
nicht). Jetzt gilt für diese Ebene eine Regel: **Was auf ihr gefüllt ist,
bleibt in der Tasche; ihre Grenze ist die Lippe selbst** (das Farbwerk fragt das Werk nach der Tasche). Dafür ist in der
Bemalung zum ersten Mal eine Stelle, die eine Ebene anders behandelt als die anderen. Am Rechenkern ist nichts geändert.

Dazu: Am Maul als echte Form steht die Bemalung jetzt auch in der Pose im Bild (vorher in keiner Pose).

Nicht gebaut: nach hinten dunkler, das Maul aufgeklappt wie ein Buch in der Ebenen-Ansicht, Farben für Zähne und Zunge (die
gibt es noch nicht). Bilder: `docs/progress/ozzy/2026-11-20-maul-etappe4-fressen.jpg`, `…-gemalt.jpg`. Offenes:
[`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md), Punkte 40 bis 49.

Zwei Kriterien älterer Proben des Paint-Modus waren bei meinem Lauf nicht erfüllt (`ozzy-farbe-fenster.mjs` 2: eine Farblinie
0,68 statt höchstens 0,5 neben ihrer Lage nach Zug und Rückzug; `ozzy-farbe-ebenen-fenster.mjs` 68: Zeiten). Beide hängen an der
Uhr, und der Rechner war dabei stark belastet (Last 7 bis 8). Gegen den Stand davor habe ich nicht verglichen.

### 12.15 Etappe 5, erste Scheibe: die Zähne sprießen (20.11.)

Deine Antwort (20.11.): „Ja, Etappe 5“.

**In Ozzy:** Hat die Form ein Maul, hängt unter der Leiste der Tropfen „Zähne“. Ein Tipp: Das Maul öffnet sich, und aus beiden
Kiefern sprießen Zähne, von der Spitze nach hinten: oben zwölf, unten elf (die unteren stehen in den Lücken der oberen), Vorlage
„Tropfen“, spiegelgleich, vorn größer. Jeder Zahn hängt starr an seinem Kiefer und geht mit ihm mit, in „Fressen“ und beim Blick.
Zu stecken die Zähne im Maul: Innen wird ein Zahn nie länger als der Spalt zwischen den Kiefern. ⌘Z nimmt die Zähne zurück. Sie
stehen im Stand der Form (`standJetzt`) und kommen so mit in die Datei; Sichern und Laden habe ich im Fenster nicht geprüft.

**Wie:** Die Zähne sind Werte am Maul (je Reihe Anzahl, Größe, Neigung, Verlauf, Reichweite, Sitz, Vorlage), keine Punkte der Form.
Wo jeder sitzt, wird aus der Tasche gelesen: Die Reihe läuft auf der Höhenlinie des halben Zahnfleischs ihrer Wand; ein Zahn hängt
an zwei Orten dieser Linie (Dreieck und Gewichte, wie die Bemalung) und geht so von selbst mit der Haut mit. Seine Form ist die
Vorlage der Studie (`maulstudie/zahn.ts`). Gezeigt werden alle Zähne als ein eigenes Netz neben der Haut, in jedem Material.

**Geprüft** im Fenster (`ozzy-maul-zaehne-fenster.mjs`, Z1 bis Z6, an „teat firefish“ auf Wachs) und im Modell (Test „die Zähne“):
zwölf und elf Plätze, elf davon Spiegelbilder; zu hat kein Zahn Länge; offen zeigen die oberen nach unten, die unteren nach oben.
Dass die unteren Zähne in den Lücken der oberen stehen, prüft nur der Test (an einer Kugel, nicht an deiner Form): Die untere
Reihe reicht dafür einen halben Zahn weniger weit nach hinten, so haben beide dieselbe Teilung. Das gilt für die Werte am Anfang,
nicht für beliebige. (Zuerst reichten beide Reihen gleich weit: Da standen die unteren nur vorn in den Lücken, hinten den oberen
gegenüber.)

**Was von Etappe 5 fehlt:** die Linse mit Formenring und Drehregler (Anzahl, Größe, Neigung, Verlauf, Sitz und die acht Vorlagen
lassen sich in Ozzy noch nicht stellen), Zähne wählen und rücken, ein Zahn ohne Spiegelbild, Zähne außen vor der Lippe, die Farbe
(die Zähne tragen die Farbe der Form). Bild: `docs/progress/ozzy/2026-11-20-maul-etappe5-zaehne.jpg`. Offenes:
[`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md), Punkte 50 bis 59.

### 12.16 Etappe 5, zweite Scheibe: die Linse (20.11.)

Deine Antwort (20.11.): „Ja, die Linse“.

**In Ozzy:** Der Tropfen „Zähne“ bleibt unter der Leiste. Der erste Tipp lässt die Zähne sprießen und öffnet oben rechts, unter
der Tafel „Fressen“, die Linse; danach öffnet und schließt er sie. In der Linse steht der Zahn groß im Raum (ziehen dreht ihn),
um ihn liegen zwei Ringe:

- **Der Formenring** mit den acht Vorlagen: ein Zeichen antippen oder den Ring drehen; was an der Marke steht, gilt. Die Zähne
  gehen weich in die neue Form über.
- **Der Drehregler:** Die Perlen sagen, was er stellt: `#` Anzahl, `G` Größe, `N` Neigung, `V` Verlauf, `S` Sitz. Er rastet, läuft
  nach und tickt; die Zahl steht, solange gedreht wird. Das Rad der Maus dreht mit.
- **Zwei Perlen in den Farben der Kiefer** (rosa: obere Reihe, blau: untere) sagen, wem die Linse gilt. Am Anfang beiden Reihen.
  Eine Perle antippen: nur diese Reihe; noch einmal: wieder beide.
- **Beide Reihen zusammen:** unten immer ein Zahn weniger, in den Lücken der oberen. Eine Reihe allein lässt sich bis auf null
  Zähne drehen.
- Solange die Linse offen ist, steht das Maul offen. Esc oder der Tropfen schließt sie. Jeder Griff ist ein Schritt für ⌘Z.

**Wie:** Die Linse ist die der Studie (`maulstudie/linse.ts`, ihr Aussehen jetzt in `linse.css`); neu sind die Perlen der Reihen.
Sie stellt nur Werte am Maul (`G.maul.zaehne`); Plätze und Netz der Zähne folgen wie in der ersten Scheibe. „Beide zusammen“ ist
eine Regel an einer Stelle (`zaehnePaar`: dieselbe Teilung, unten einer weniger).

**Geprüft** im Fenster (`ozzy-maul-zaehne-fenster.mjs`, Z1 bis Z6 und L1 bis L7, an „teat firefish“ auf Wachs, mit echten
Zeigergesten): der Drehregler um gut 60° gedreht sind vier Rasten, 12 → 16 Zähne; ein Tipp auf „Spitz“; die Perle „G“ und das
Rad der Maus; die untere Reihe allein; ⌘Z Griff für Griff; Esc; an der Form ziehen bei offener Linse; die Linse in „Fressen“.
Im Modell (Test „die Zähne“): Die Reihen greifen bei 3, 5, 8, 12 und 17 Zähnen ineinander (an einer Kugel). Die Studie läuft
weiter (einmal geladen, Linse geöffnet, keine Fehler). Die Proben des Mauls und der Ebene „Maul“ halten.

**Gemessen** (einmal, in der Probe, nicht an deinem Gerät): Ein gestellter Wert kostet 3 ms und je Bild rund 4 ms mehr (30 statt
26 ms). Ein Bild mit offenem Maul braucht dort also rund 26 ms, auch wenn kein Wert gestellt wird: davon 13 ms die Linien an den
Wänden und 8 ms das Netz der Linien. Diese zwei Posten rechnen nach dem Code an der Form, nicht an den Zähnen; ohne Zähne habe
ich nicht gemessen (Liste, Punkt 55).

**Was von Etappe 5 noch fehlt:** Zähne im Bild antippen (Reihe, einzelner Zahn) und rücken, ein Zahn ohne Spiegelbild, Zähne
außen vor der Lippe, die Farbe, die Perlen Biegung und Wurzel. Bild: `docs/progress/ozzy/2026-11-20-maul-etappe5-linse.jpg`.
Offenes: [`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md), Punkte 50 bis 65.

### 12.17 Etappe 5, dritte Scheibe: Zähne im Bild wählen und rücken (20.11.)

Deine Antwort (20.11.): „Ja, Zähne wählen“.

**In Ozzy:**

- **Antippen:** Ein Tipp auf einen Zahn wählt seine Reihe (die Linse geht auf, wenn sie zu ist). Ein zweiter Tipp wählt den Zahn
  mit seinem Spiegelbild, ein dritter ihn allein, ein vierter führt zurück zur Reihe. Die Linse sagt kurz, was gilt („oben“,
  „Paar“, „allein“). An der Spitze jedes gewählten Zahns steht ein Ring; steht die Form davor, ist er blass und gepunktet.
- **Stellen:** Ist ein Zahn gewählt, stellen der Formenring und die Perle `G` nur ihn (`G`: seine Größe gegen die Reihe, 100 % ist
  wie die Reihe). Die anderen Perlen stellen weiter seine Reihe.
- **Rücken:** Ziehen rückt einen gewählten Zahn auf dem Zahnfleisch, längs der Reihe und zur Tiefe des Mauls. Er bleibt im Maul
  und auf seiner Wand. Ist er mit seinem Spiegelbild gewählt, rückt es genauso.
- **Ziehen:** ⌫ zieht den gewählten Zahn, dort bleibt eine Lücke; ⌘Z bringt ihn zurück. Bei offener Linse lässt ⌫ nie die Luft ab.
- **Aufheben:** Ein Tipp daneben oder Esc hebt die Wahl am Zahn auf (die Linse bleibt offen).
- **Vorrang:** Solange die Linse offen ist, gehören Tipps auf Zähne den Zähnen. Ist sie zu (in „Fressen“ sieht man die Zähne
  auch), gehen Punkte und Linien der Form vor; ein Tipp auf einen Zahn, an dem nichts von der Form hängt, öffnet die Linse.

So geht ein Hauer auf einer Seite: den Zahn dreimal antippen (allein), am Formenring „Hauer“, mit `G` größer. Innen wird er
dabei wie jeder Zahn nie länger als der Spalt der Kiefer; ein Hauer, der bei geschlossenem Maul herausschaut, braucht die Zähne
außen (Liste, Punkt 53).

**Wie:** Eine Reihe trägt für einzelne Zähne eigene Werte (`ZahnReihe.eigen`, je Nummer des Zahns: gerückt, Vorlage, Größe,
gezogen); alles andere bleibt abgeleitet wie bisher. Wer die Anzahl einer Reihe ändert, lässt ihr Eigenes fallen (die Nummern
meinen dann andere Zähne). Getroffen wird ein Zahn mit einem Strahl auf das Netz der Zähne; die Haut der Form davor verdeckt ihn.
Beim Rücken wird der Weg im Bild in die zwei Richtungen des Zahns an der Haut zerlegt (längs des Zahnfleischs, zur Lippe).

**Geprüft** im Fenster (`ozzy-maul-zaehne-fenster.mjs`, W1 bis W8, mit echten Zeigergesten, an „teat firefish“): Reihe, Paar,
allein; „Hauer“ nur an zwei Zähnen; beim Rücken zum Nachbarn folgte der Fuß dem Zeiger (102 % des Wegs von 18 Bildpunkten), das
Spiegelbild rückte genauso; `G` nur am einen Zahn; ⌫ und ⌘Z; der Tipp daneben; die Anzahl lässt Eigenes fallen; in „Fressen“
öffnet ein Tipp auf einen Zahn die Linse. Im Modell (Test „die Zähne“): gezogen, gerückt (auch über die Enden hinaus), eigene
Größe und Vorlage, der Rahmen eines Zahns an der Haut. Die Proben des Mauls und der Ebene „Maul“ halten, die Studie läuft.

**Was von Etappe 5 noch fehlt:** Zähne außen vor der Lippe, eine eigene Farbe, die Perlen Biegung und Wurzel. Bild:
`docs/progress/ozzy/2026-11-20-maul-etappe5-einzelner-zahn.jpg`. Offenes:
[`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md), Punkte 50 bis 73.

### 12.18 Etappe 5, vierte Scheibe: Zähne außen und die Farbe der Zähne (20.11.)

Deine Antwort (20.11.): „Ja, Zähne außen“.

**In Ozzy:**

- **Zähne außen:** Die Perle `S` (Sitz) dreht jetzt bis vor die Lippe (die Linse zeigt dann „außen 0.4“). Ein Zahn außen steht
  neben der Lippe, zeigt wie alle zum anderen Kiefer und behält seine Länge, auch wenn das Maul zu ist: Geschlossen liegen die
  oberen über dem Unterkiefer, die unteren über dem Oberkiefer. Stehen beide Reihen außen, greifen sie von außen ineinander.
- **Ein einzelner Zahn:** Ein gewählter Zahn lässt sich über die Lippe hinaus rücken, höchstens 1,2 Breiten des Zahnfleischs
  weit; weiter hinaus hält ihn die Lippe fest. So schaut ein Hauer bei geschlossenem Maul heraus.
- **Farbe:** Auf Wachs, Solid und Zebra tragen die Zähne ihre eigene Farbe, am Anfang Elfenbein. Eine Perle unten an der Linse
  zeigt sie; ein Tipp darauf öffnet den Farbwähler des Systems. Alle Zähne tragen dieselbe Farbe, der Zahn in der Linse auch.

**Wie:** Ein Zahn mit einem Sitz unter null hängt weiter an der Wand seines Kiefers (an der Linie dicht hinter der Lippe); sein
Fuß ist von dort längs der Wand über die Lippe hinaus versetzt. Die Länge: im Maul höchstens der Spalt der Kiefer; außen die
volle, sobald der Zahn um seine halbe Tiefe vor der Lippe steht, dazwischen anteilig. Die Farbe steht am Maul
(`G.maul.zaehne.farbe`). Auf den festen Materialien stehen die Zähne nicht mehr im Netz des Körpers: Sie werden danach als
eigenes Netz ins selbe Ziel gezeichnet (`zahnBild.ts`), mit dem Kugelbild des Wachses ohne seine Farbe mal ihrer Farbe.

**Geprüft** im Fenster (`ozzy-maul-zaehne-fenster.mjs`, F1, F2, A1, A2, an „teat firefish“ auf Wachs): Ein Bildpunkt auf einem
Zahn ist elfenbein (rot 210, grün 200, blau 176), nach dem Setzen von Blau blau, ⌘Z gibt Elfenbein zurück; mit `S` und dem Rad der
Maus liegt der Sitz beider Reihen bei −0,45, jeder Zahn steht 5 Einheiten vor der Lippe; bei geschlossenem Maul ist der längste
Zahn 27,5 lang und 13 Zähne sind im Bild zu treffen (im Maul hätte keiner Länge). Im Modell (Test „die Zähne“): der Fuß vor der
Lippe, die Länge bei geschlossenem Maul, ein Zahn über die Lippe gerückt. Einmal jedes Material angesehen (Solid, Zebra, Wachs,
helles Solid, Jelly, Seifenhaut): keine Fehler; das helle Solid zeigt die Zähne weiß wie den Körper, die Seifenhaut als Blasen.

**Was an den Zähnen noch fehlt:** die Perlen Biegung und Wurzel, eine Farbe je Reihe oder je Zahn, die Farbe auf den übrigen
Materialien. Bilder: `docs/progress/ozzy/2026-11-20-maul-etappe5-zaehne-aussen.jpg`, `…-zahnfarbe.jpg`. Offenes:
[`2026-11-20-ozzy-maul-was-bleibt.md`](2026-11-20-ozzy-maul-was-bleibt.md), Punkte 50 bis 79.
