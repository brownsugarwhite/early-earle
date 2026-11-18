# Ozzy nach deinem ersten Test: Ursachen und Plan

**Stand: 18.11.2026, nachmittags. Gebaut: der Rückschritt beim Aufblasen (Schritt 1, erster Teil), Schritt 2 (Rest), Schritt 4 (Teil 1), dazu die Materialien Solid und Zebra. Alles andere wartet (Tabellen gleich unten).** Du hast am Morgen getestet und gebeten: alles
ansehen, die Ursachen suchen, nur einen Plan vorstellen. Deine vier Bildschirmfotos liegen in
[`docs/look/ozzy/2026-11-18-florian-test/`](../look/ozzy/2026-11-18-florian-test/). Gemessen ist auf deinem Mac, im Testbrowser
(Fenster 1440 × 900, doppelte Dichte, höchstens 60 Bilder je Sekunde); dein Bildschirm hat 120 Bilder, also 8,3 ms je Bild.

## Stand nach deinen Antworten (18.11., mittags)

| Schritt | Dein Wort | Stand |
| --- | --- | --- |
| 1 Aufblasen | „meine formen waren mit linie … vllt muss ich das nochmal genau testen und erörtern wie es genau ohne linie aussehen sollte … und ob schon edgeloops vorgezeichnet sein sollen an den optimalen stellen.“ Am Nachmittag: „behebe den rückschritt beim aufblasen.“ | **Der Rückschritt ist behoben** (`f933b707`, `7388b349`): Ohne Linien setzt der Hintergrund nie; ändert sich der Rauminhalt über einen Auftrag um mehr als 30 %, ohne dass sich eine Linie bewegt hat, gilt das als davongelaufen, und es bleibt der Stand davor, mit aufgeräumtem Netz. Im Fenster: kein Ballon und kein Punkt mehr, mit und ohne Linie. Die Probe „ohne Linie“ prüft jetzt auch, ob die Haut noch die gezeichnete Form ist. **Offen, wartet auf dich:** das Netz der frischen Form, die Loops, die ersten Linien. Ein Lauf zum Ansehen: Lege ich die Form dreimal so groß an (in der Größe deiner gesicherten Formen), hat sie bei gleicher Netzkante rund 3 000 statt 600 Punkte und ist glatt ([`2026-11-18-aufblasen-groesser-angelegt.png`](../progress/ozzy/2026-11-18-aufblasen-groesser-angelegt.png)); an den Spitzen bleiben Fehler. |
| 2 Vier Ansichten | „schieben kannst du erstmal so lassen. … Den rest von 2 kannst du machen“ | **gebaut** (`6e8c5d00`): In den Vier Ansichten rastet das Feld des Raums nicht mehr ein. Das Schieben bleibt bei Leertaste + Ziehen. |
| 3 Seifenhaut im Zug | „Es ist nicht nur das eckige. Das mesh wirkt einfach viel fragiler als in der version auf 5197.“ | Vergleich geliefert (oben). Die Dehnung der Seifenhaut (weicher, schneller ruhig) ist nicht gebaut und wartet auf dein Ja; sie gilt unabhängig von Schritt 1, die eckigen Flecken sind an deinen gesicherten Formen gemessen. |
| 4 Ein Look überall | „ok bitte aber exakt. Mit ganz smooth verjüngenden outlines.“ | **Teil 1 gebaut** (`d727e24e`): Messlatte als Probe (`ozzy-look-messen.mjs`); der Umriss der eingerasteten Seite ist so breit wie in der Vorlage (1,9 gegen 1,8 Gerätepunkte, vorher 2,5; Bild [`2026-11-18-umriss-seite-vorher-nachher.png`](../progress/ozzy/2026-11-18-umriss-seite-vorher-nachher.png)). **Die Wände: Entwurf als Bild** ([`2026-11-18-waende-entwurf.png`](../progress/ozzy/2026-11-18-waende-entwurf.png)), gebaut wird zusammen mit Schritt 5, weil drei weiße Körper an den Wänden das Drehen sonst teurer machen. |
| 5 Flüssig drehen | „Wie behebst du das?“ | erklärt im Abschnitt zu Schritt 5 und in der Antwort; nicht gebaut, wartet auf dein Ja. |

### Materialien (dein Auftrag vom 18.11., nachmittags)

„Ich möchte folgende materialien. Wireframe (haben wir), solid wie in http://localhost:5197/kurven.html?gewichte=geometrie,
seifenhaut, und die beiden die wir im screenshot erarbeitet hatten (jelly und helles solid mit leichter kante und verlauf aber ohne
die extra outlines, zebra, das grüne material aus dem alten editor mit den punkten und der hellen automatischen bauchfläche. Bitte die
Materialien und shader exakt wie wir sie erarbeitet haben und keine eigene version.“ Deine Bilder dazu:
[`7-materialien-helles-solid-und-jelly.webp`](../look/ozzy/2026-11-18-florian-test/7-materialien-helles-solid-und-jelly.webp),
[`8-material-gruen-punkte-bauch.webp`](../look/ozzy/2026-11-18-florian-test/8-material-gruen-punkte-bauch.webp).

| Material | Quelle | Stand |
| --- | --- | --- |
| Wireframe | Kurvennetz im Raum, Taste W | war da |
| Seifenhaut (dazu Irisdruck, Horizont, Höhenlinien) | `src/anfang/haut.ts` | war da, bleibt |
| **Solid** | Prüffenster `src/form/kurven.ts` (`hautMaterial`, `umrissMaterial`, Licht) | **gebaut** (`7388b349`), Zeile für Zeile übernommen; im Menü und mit Taste M; Bild [`2026-11-18-materialien-solid-zebra.png`](../progress/ozzy/2026-11-18-materialien-solid-zebra.png). Grafikkarte je Bild an „strange bird“: im Raum 12,9 → 7,0 ms, herangezoomt 22,5 → 9,5 ms |
| **Zebra** | alter Editor `src/three/matcap.ts` (`zebraMatcap`) | **gebaut** (`7388b349`) |
| Jelly | Blaupause-Editor `src/form/blaupause.ts` (`BlaupauseBild`, Look `jelly`) und `lava.ts` | **offen.** Der Renderer zeichnet ein ganzes Fenster mit seinem eigenen dunklen Grund, parallel, mit Lava, Bläschen und Bodenkontakt aus `editor.ts`. Exakt geht es nur, wenn Ozzy ihn unverändert aufruft: Dann bringt Jelly seinen Grund mit, und Ozzys Linien müssen darauf hell werden. **Frage an dich unten.** |
| Helles Solid | derselbe Renderer, Look `logo` ohne Kontur und Rand | **offen**, wie Jelly |
| Grün mit Punkten und Bauch | alter Editor: Palette „Blob“ (`src/three/wesenLook.ts`) im Earle-Material `packages/render/src/creature2` | **offen.** Das Material ist für die andere Grafikschnittstelle (WebGPU) geschrieben und liest je Ecke 16 Werte (Lage am Körper, Bauch und Rücken), die der alte Editor aus seinem Skelett rechnete. In Ozzy braucht es dafür eine zweite Zeichenfläche und diese Werte aus der Form. |

Solid und Zebra zeigen die Haut im Raum und im Feld des Raums der Vier Ansichten. Eingerastet und in den flachen Feldern bleibt die
Linienansicht; beim Aufblasen selbst bleibt es die Seifenhaut.

## Kurz

| Was du gesehen hast | Ursache | Schritt |
| --- | --- | --- |
| Aufblasen manchmal zerrissen, keine Form „aus der Höhe“ | Nach dem Aufblasen wird die Haut neu gerechnet, aus einer einzigen Linie oder ganz ohne Linie. Das hat keinen festen Ausgang. Dazu ein Rückschritt von mir aus der Nacht (C1). | 1 |
| Vier Ansichten: nur zoomen, das Feld des Raums rastet ein | Zwei Finger zoomen statt zu schieben (schieben geht nur mit Leertaste + Ziehen); das Einrasten kennt die Vier Ansichten nicht. | 2 |
| Seifenhaut im Zug eckig, erholt sich sehr lange | Die Farben folgen der Dehnung je Rechenpunkt (grob, eckig); sie klingt mit 1,6 s ab, ruhig ist es erst nach 5 bis 6 s. | 3 |
| Projektionen sehen anders aus als die Ansichten | Die Wände im Raum zeichnet eine andere Technik als Ansichten und Felder. | 4 |
| Drehen stockt, Übergang zu den Vier Ansichten stockt, MacBook stark beansprucht | Die Grafikkarte braucht im Raum 6 bis 13 ms je Bild (Budget 8,3); beim Aufklappen ein Bild von über 100 ms; jede Zeigerbewegung zeichnet die Seifenhaut neu. | 5 |

Reihenfolge: 1, 2, 3, dann 4 und 5 zusammen (sie teilen sich die Wände). Aufwand zusammen sechs bis acht Tage; je Schritt unten.

## Schritt 1: Aufblasen hält

**Was ich gefunden habe** (Bild: [`2026-11-18-aufblasen-ursache.png`](../progress/ozzy/2026-11-18-aufblasen-ursache.png); deine zwei
Delfine habe ich aus den Bildschirmfotos nachgezeichnet, die Griffe sind geschätzt):

- **Die Form aus der Höhe gibt es schon.** Beim Aufblasen baut Ozzy genau das, was du erwartest: An jeder Stelle die größte Kugel,
  die in die Zeichnung passt, jeder Querschnitt ein Kreis, dünn wo die Zeichnung schmal ist (wie Teddy). Du siehst sie nur einen
  Moment, denn gleich danach rechnet das Werk die Haut neu.
- **Mit Linie** (Schalter im Menü; deine Bilder sehen danach aus, an der Wand stehen die Punkte): Die Haut wird aus der einen Linie
  neu gerechnet. Eine Linie allein legt die Dicke nicht fest, also hat die Rechnung keinen festen Ausgang. Erste Silhouette: hält
  (Rauminhalt plus 15 %). Zweite Silhouette: der Schnabel zerknittert, vier Dreiecke schlagen um. Zweite Silhouette mit viermal
  so feinem Netz: Schon nach dem Aufblasen steht die Haut an der Spitze der Rückenflosse bis 16 Einheiten über die Zeichnung
  hinaus, und die Rechnung bläht sie dann auf (halbe Dicke 42 → 53) und zerreißt sie wie in deinem zweiten Bild.
- **Ohne Linie** (der Standard seit dem 16.11.): Die Linie der Mitte wird gleich nach dem Aufblasen gelöscht, und das Löschen stößt
  dieselbe Rechnung an, jetzt ganz ohne Halt. Ergebnis bei allen drei Formen, die ich probiert habe: ein Ballon (aus 150 × 58 × 39
  wird 127 × 105 × 95), oder die Haut zieht sich zu einem Punkt zusammen, oder (der Fisch der Proben) eine große Kugel.
  **Das ist ein Rückschritt aus C1 von heute Nacht.** Bis dahin brach diese Rechnung sofort ab und wurde verworfen, die Form blieb.
  Seit ich im Kern die Schrittweite begrenzt habe, bricht sie nicht mehr ab, sondern läuft ruhig ins Falsche und meldet „steht“.
  Im Kern nachgestellt: mit Schrittweite Rauminhalt 0, ohne sie „abgebrochen, es gilt der Stand davor“. Die Probe „ohne Linie“ hat
  es nicht gemerkt: Sie prüft nur, ob die Haut stillsteht, nicht, ob sie noch die Zeichnung ist.
- **Dünne Stellen:** Das Rechennetz einer frischen Form ist grob (270 bis 330 Punkte, Kante 15,6 Einheiten; die Spitzen von Flossen
  und Schnabel sind nur 5 bis 12 breit). Schon direkt nach dem Aufblasen, vor jeder Rechnung, sind meist 4 bis 12 Dreiecke
  umgeschlagen. Das zerknitterte Schwanzende in deinem ersten Bild ist so eine Stelle.
- **Was dahinter steht:** Die Rechnung braucht Linien, um eine Form festzuhalten. Mit vielen Linien (deine gesicherten Formen) hält
  sie gut. Mit keiner oder einer Linie hat sie keinen festen Ausgang; je nach Zeichnung und Netz hält sie, kriecht zu runden Beulen
  oder reißt.

**Was ich bauen würde:**

1. **Die aufgeblasene Form ist die Form.** Nach dem Aufblasen wird nichts neu gerechnet, mit und ohne Linie. Ohne Linie entsteht die
   Linie gar nicht erst (heute: anlegen, rechnen, löschen, wieder rechnen).
2. **Eine Sicherung im Hintergrund für alle Fälle:** Ein Ergebnis, das die Form verliert (Rauminhalt bricht ein oder vervielfacht
   sich, ohne dass du gezogen hast), wird verworfen wie ein davongelaufenes. Die Grenze lege ich an deinen Formen fest (jede Linie
   einmal gelöscht). Ohne Linien rechnet der Löser nie.
3. **Dünne Stellen sauber:** Die Weite des Netzes richtet sich nach der schmalsten Stelle der Zeichnung; Spitzen aus zwei dicht
   gesetzten Punkten bekommen ein sauberes Ende. Ich teste es, Kriterium unten.
4. **Die ersten Linien** (der unsichere Teil, Beweis zuerst): Punkt 1 schützt die frische Form, aber der erste Zug stößt dieselbe
   Rechnung wieder an. Solange Linien die Form nicht festlegen, darf sie fern der Linien nicht verloren gehen. Zwei Wege teste ich
   im Kern gegeneinander: (a) Hat die Form nur ihre Linie der Mitte, folgt sie ihr als runde Form aus der Höhe (die Regel des
   Aufblasens). (b) Allgemein: Fern aller Linien hält die Haut ihre Form (so hält „Maul formen“ heute schon die Haut fern vom Maul).
   Du bekommst einen Film, bevor etwas davon Standard wird.

**Probe (vorher festgelegt):** der Fisch der Proben und deine zwei Delfine, je mit und ohne Linie, je mit grobem und feinem Netz.
Direkt nach dem Aufblasen und 5 s später: Die Seite liegt höchstens 2,5 Einheiten neben der Zeichnung, die Ausdehnung ändert sich um
höchstens 2 %, kein umgeschlagenes Dreieck. Dazu ein Bild für dein Auge. Die Proben `ozzy-ohne-linie-fenster.mjs` und
`ozzy-silhouette-fenster.mjs` bekommen dasselbe Kriterium. Für Punkt 4: Zug an der Linie der Mitte und an einem ersten Ring mit P:
nichts reißt oder bläht sich, fern der gezogenen Stelle bewegt sich die Haut höchstens 2 Einheiten, kein Sprung beim Greifen und
Loslassen.

**Für die neue Sitzung wichtig:** Ein angefügtes Bein beginnt auch mit wenigen Linien. Punkt 4 ist deshalb Vorarbeit für „Teile“.

**Aufwand:** Punkt 1 und 2 ein halber Tag, Punkt 3 ein halber bis ein Tag, Punkt 4 ein bis zwei Tage mit Film.

## Schritt 2: Vier Ansichten

- **Verschieben:** Heute zoomen zwei Finger auf dem Trackpad (und das Mausrad) das Feld unter dem Zeiger. Schieben gibt es nur als
  Leertaste + Ziehen (steht in der Hinweiszeile, aber wer sucht es dort). Vorschlag: **zwei Finger schieben das Feld, Pinch zoomt**
  (wie in Illustrator und auf dem iPad); das Mausrad zoomt weiter, Leertaste + Ziehen bleibt. Dasselbe in der einzelnen Ansicht
  und im Raum (dort schiebt es das ganze Bild).
- **Kein Einrasten:** Nach dem Drehen (auch mit Schwung) rastet die Ansicht ein, wenn sie näher als 9° an einer der sechs Ansichten
  steht. Die Vier Ansichten sind davon nicht ausgenommen. In den Vier Ansichten bleibt das Feld des Raums künftig, wie du es
  loslässt.

**Probe:** In jedem Feld verschieben zwei Finger die Form um den geschobenen Weg, Pinch zoomt zum Zeiger hin; das Feld des Raums 3°
neben einer Ansicht losgelassen bleibt dort. **Aufwand:** ein halber Tag.

## Schritt 3: Seifenhaut im Zug

**Was ich gefunden habe** (Bild: [`2026-11-18-seifenhaut-im-zug.png`](../progress/ozzy/2026-11-18-seifenhaut-im-zug.png)):

- Die Farben zeigen, wie stark die Haut gedehnt ist. Gemessen wird das je Rechenpunkt an der Fläche seiner Dreiecke. Im Zug
  verschiebt und verfeinert die Rechnung das Netz; das zählt als Dehnung mit, obwohl die Haut dort gar nicht gedehnt ist. Und es
  hat die Körnung des Rechennetzes (Kanten von rund 10 Gerätepunkten): Daher die eckigen Flecken und Sterne. Gemessen im Zug: Dehnung
  0,56 bis 1,65 (1 wäre Ruhe).
- Nach dem Loslassen klingt die Dehnung mit 1,6 s ab: nach 1,5 s noch 0,93 bis 1,13, ruhig nach 5 bis 6 s. So lange wird auch jedes
  Bild neu gezeichnet.
- Im Zug zeigt die Anzeige je nach Größe weniger Stufen als in Ruhe (an „teat firefish“ in gewöhnlicher Größe das rohe Rechennetz).

**Was ich bauen würde:** die Dehnung weich über die Fläche verteilt und enger begrenzt, sodass nur echte Dehnung Farbe gibt; das
Abklingen in rund einer Sekunde; im Zug überall mindestens eine Stufe. **Zuerst das Vergleichsbild** an derselben Stelle wie oben,
Kriterium: im Zug keine eckigen Flecken, 1,5 s nach dem Loslassen ruhig. Dein Nein vom 17.11. bleibt: Die Seifenhaut wird beim
Bewegen nicht gröber gezeichnet. **Aufwand:** ein halber bis ein Tag.

## Schritt 4: Ein Look überall

Die Vorlage ist `raum.html` der Linien-Studie (dein Wort: keine Abweichungen, in Ansichten, Projektionen und im Kurvennetz).

**Was ich gefunden habe** (Bild: [`2026-11-18-look-vorlage-ansicht-wand.png`](../progress/ozzy/2026-11-18-look-vorlage-ansicht-wand.png)):

- **Ansichten und Felder** benutzen die Technik der Vorlage (weißer Körper, Umriss als Hülle, Linien je Bildpunkt verdeckt). Daher
  gefällt dir dein viertes Bild. Zwei Abweichungen: Bei gleicher Größe ist der Umriss der Seite kräftiger (2,3 bis 3,4 statt 1,8
  Gerätepunkte; vermutlich liegen dort Umriss und Linie der Mitte übereinander), und innere Konturen an Falten sind fett statt fein.
  Dazu zeigt Ozzy die Form in gewöhnlicher Größe rund viermal kleiner als die Vorlage: Dieselben Striche wirken dann schwerer.
- **Die Wände im Raum** zeichnet eine andere Technik: Striche entlang jeder Kontur der Haut, Verdecktes über eine grobe Tiefenkarte.
  Daher die fetten, ineinander liegenden Konturen in deinem dritten Bild. Beim Aufklappen zeichnet Ozzy die Wände schon heute mit dem
  weißen Körper; die Technik ist also da.
- **Bleibt, weil gewollt:** Eingerastet ist die Ansicht parallel (dein Wort vom 17.11.). Die Vorlage ist perspektivisch und zeigt
  deshalb die Linien der hinteren Hälfte leicht versetzt in Grün; parallel liegen sie genau hinter denen der vorderen.

**Was ich bauen würde:**

1. **Die Messlatte zuerst:** eine Probe, die dieselbe Form in der Vorlage und in Ozzy gleich groß zeigt (Ansicht, Feld, Wand,
   Kurvennetz im Raum) und Strichbreiten vergleicht. Ihr Blatt bekommst du vor dem Bau.
2. **Die Wände wie die Ansichten:** weißer Körper, Hülle, Linien, Punkte. Ich teste zwei Wege und nehme den billigeren, der gleich
   aussieht: jedes Bild neu zeichnen, oder das Bild einer Wand nur dann neu, wenn sich die Form ändert (beim Drehen wäre die Wand
   dann fast umsonst; das hilft Schritt 5).
3. **Umriss und innere Konturen** in Ansicht und Feld an die Vorlage angleichen.

**Kriterium:** Bei gleicher Größe weicht die Breite des Umrisses an allen vier Stellen höchstens 0,3 Gerätepunkte von der Vorlage
ab; innere Konturen und verdeckte Linien wie dort. Dann dein Auge. **Aufwand:** anderthalb bis zwei Tage.

## Schritt 5: Flüssig drehen und aufklappen, weniger Last

**Was ich gemessen habe** („strange bird“):

| Ansicht | Grafikkarte je Bild | davon Seifenhaut |
| --- | --- | --- |
| Raum, gewöhnliche Größe | 5,9 ms | 1,5 |
| Raum, herangezoomt (2,9-fach) | 13,0 ms | 8,4 |
| eingerastet | 3,1 ms | 0 |
| Vier Ansichten | 10,5 ms | 2,9 |

- **Drehen:** Der Prozessor braucht dabei nur 2,2 ms je Bild. Die Grafikkarte liegt im Raum knapp am Budget von 8,3 ms und
  herangezoomt weit darüber (dein Fenster ist größer als meins, also eher mehr). Dann wechseln Bilder mit einem und mit zwei Takten:
  Das ist das Stocken. Die Vorlage zeichnet nur die Linienansicht, ohne Seifenhaut und ohne Wände. Die Linienfläche (Wände,
  Kurvennetz, Zeiger) kostet im Raum rund 3 ms.
- **Übergang zu den Vier Ansichten:** ein einzelnes Bild von 105 ms am Anfang (29 ms glatte Haut in voller Feinheit, 69 ms für die
  Wände), auf dem Rückweg ein Bild von 22 ms und Lücken von 36 bis 69 ms.
- **Last:** Jede Zeigerbewegung zeichnet ein volles Bild samt Seifenhaut (bis 120 je Sekunde); nach jedem Zug laufen 5 bis 6 s
  Bilder weiter (das Abklingen aus Schritt 3); dazu rechnet nach jedem Zug der Hintergrund. In Ruhe zeichnet Ozzy nichts.

**Wie ich es behebe** (deine Frage vom 18.11. mittags):

1. **Der Zeiger allein kostet keine Seifenhaut.** Ozzy hat zwei Zeichenflächen übereinander: unten die Seifenhaut, oben Linien und
   Zeiger. Heute werden bei jeder Zeigerbewegung beide neu gezeichnet. Künftig nur die obere, solange sich an der Seifenhaut nichts
   ändert (der Zeiger liegt nicht über der Blase, nichts dreht sich, nichts klingt nach).
2. **Die Wände sind beim Drehen fast umsonst.** Was an einer Wand steht, hängt nur von der Form ab, nicht vom Blick. Jede Wand wird
   einmal als Bild gezeichnet (weißer Körper, Umriss, Linien: der Look aus Schritt 4) und beim Drehen nur noch als Bild an ihre
   Wand gelegt. Neu gezeichnet wird sie, wenn sich die Form ändert oder du an dieser Wand arbeitest.
3. **Die Seifenhaut groß im Bild.** Sie wird in fünf Durchgängen gezeichnet. Ich messe jeden einzeln und nehme heraus oder
   vereinfache, was man im Bild nicht sieht (Kriterium: das Bild bleibt gleich). Gröber gezeichnet wird sie nicht.
4. **Das Aufklappen wird vorbereitet.** Das eine Bild von 105 ms entsteht, weil im ersten Bild des Aufklappens die glatte Haut in
   voller Feinheit und die Zeichnungen der drei Wände zum ersten Mal angelegt werden. Beides lege ich in der Ruhe davor an (sobald
   die Form steht), auf mehrere Bilder verteilt.
5. **Gleichmäßiger Takt.** Braucht ein Bild doch länger als ein Takt, zeigt Ozzy gleichmäßig jedes zweite, statt zwischen einem und
   zwei Takten zu wechseln; das ist es, was man als Stocken sieht.

**Kriterium (ich teste es, an „strange bird“ und „teat firefish“ in deiner Fenstergröße):** Drehen im Raum mit Schwung: Grafikkarte
und Prozessor zusammen in 95 % der Bilder unter 8,3 ms in gewöhnlicher Größe; Aufklappen und zurück ohne ein Bild über 25 ms; Zeiger
allein unter 2 ms je Bild. Ob es sich bei 120 Bildern flüssig anfühlt, entscheidet dein Auge (mein Testbrowser zeigt nur 60).
**Aufwand:** ein bis zwei Tage.

## Deine Fragen

**Warum ändert E1 den Look der Haut?** Heute verfeinert der Prozessor das Rechennetz in Stufen und kennt dabei das ganze Netz: Jeder
neue Punkt und jede Richtung der Fläche entsteht aus den Nachbarn ringsum. E1 gibt diese Arbeit der Grafikkarte. Die sieht je Dreieck
nur seine drei Ecken und deren Richtungen und wölbt jedes Dreieck für sich. Das ergibt fast, aber nicht genau dieselbe Fläche. Die
Lage unterscheidet sich kaum; die Spiegelungen und Farben der Seifenhaut hängen aber an der Richtung der Fläche in jedem Bildpunkt,
und dort sieht man kleine Unterschiede (wie eine leicht andere Delle in einem Spiegel). Es kann unsichtbar sein, es kann auch besser
aussehen (die Haut wäre im Zug so fein wie in Ruhe). Deshalb steht vor E1 ein Vergleichsbild. Denkbar ist auch ein Weg ohne
Unterschied (dieselben Stufen wie heute, nur auf der Grafikkarte gerechnet). Ob er trägt, ist nicht bewiesen; er wäre aufwendiger,
und ich würde beide im Vergleichsbild nebeneinander zeigen.

**Woran merkst du den Unterschied beim Zeiger?** Der gezeichnete Zeiger (das Dreieck) wird von Ozzy gezeichnet, also ein bis zwei
Bilder nach deiner Hand, und nur so oft, wie Ozzy Bilder schafft. Der Zeiger des Systems liegt immer genau unter der Hand. Du würdest
es merken, wenn du schnell fährst (das Dreieck hängt eine Spur nach, wie an einem Gummi) und immer dann, wenn Ozzy stockt (das
Dreieck stockt mit, der Systemzeiger nie). Zum Ausprobieren: `ozzy.html?zeiger=system`. Wenn dich nichts stört, bleibt das Dreieck;
zu entscheiden ist hier nichts.

**Kann der Rest nach Maul, Posen und Teilen kommen?** Ja: E1 (Haut auf der Grafikkarte), E2 (Löser neben dem Bild), das Gleiten
(zurückgestellt), die halbe Haut Teil 3 und 4, der Spiegel-Schalter und die Feinschliff-Liste. Zwei Hinweise: E2 wird nötig, sobald
Formen über rund 10 000 Rechenpunkte haben (mit angefügten Teilen wahrscheinlich), und es wird etwas größer, je mehr Handgriffe es
bis dahin gibt (geschätzt drei bis vier statt zwei bis drei Tage). Schritt 1 dieses Plans sollte vorher fertig sein: Ohne ihn
beginnt jede neue Form unsicher, und angefügte Teile beginnen wie eine neue Form. Die Schritte 2 bis 5 betreffen die Anzeige von
Ozzy, nicht den Kern; sie können auch neben der neuen Sitzung laufen.

## Fragen an dich (Stand 18.11., nachmittags)

1. **Jelly und helles Solid:** Sollen sie ihren dunklen Grund mitbringen, wie in deinem Bildschirmfoto (dann werden Ozzys Linien
   und Wände dort hell)? Oder sollen sie auf Ozzys weißem Raum stehen (dann muss ich den Renderer der Blaupause anpassen, und es ist
   nicht mehr Zeile für Zeile dasselbe)?
2. **Schritt 1, das Netz der frischen Form:** Soll ich die Form beim Aufblasen größer anlegen (Bild oben)? Das ist eine Zahl; die
   Spitzen und die Loops bleiben eigene Punkte.
3. Schritt 3 (Seifenhaut im Zug), Schritt 5 (flüssig drehen) samt den Wänden und die Loops warten, bis du sie erörtert hast.

## Anhang: die nachgezeichneten Silhouetten (zum Nachstellen)

Punkte aus deinen Bildschirmfotos abgelesen, `[x, y]` in Bildpunkten des Fotos, im Uhrzeigersinn; eine `1` an dritter Stelle heißt
Ecke. Für die Probe auf 520 Bildpunkte Breite gebracht; glatte Punkte bekommen Griffe längs der Verbindung ihrer Nachbarn, je ein
Drittel des Abstands zum Nachbarn lang. Gesetzt mit `__ozzy.form(anker)`, aufgeblasen mit `__ozzy.aufblasen()`; `?ohneLinie=0|1`
wählt den Schalter, `?dreiecke=8000` das viermal so feine Netz. Im Kern stellt `form-aufraeumen.ts` die Rechnung nach (Stand über
`__ozzy.standGepackt()`; `SCHRITT=0` zeigt das Verhalten vor C1).

```js
// erste Silhouette (dein erstes Bild)
[[783, 357], [812, 372], [936, 358], [1203, 427], [1282, 462], [1284, 388, 1], [1378, 406], [1553, 426], [1626, 446], [1568, 358],
 [1620, 275], [1588, 266], [1440, 303], [1346, 273], [1254, 208], [1236, 213], [1178, 138], [1163, 140], [1130, 203], [1035, 199], [898, 266]]
// zweite Silhouette (dein zweites Bild)
[[697, 268], [748, 233], [870, 176], [951, 166], [1002, 134, 1], [1002, 146, 1], [975, 203], [1042, 221], [1110, 262], [1133, 307, 1],
 [1180, 275, 1], [1179, 285, 1], [1198, 337, 1], [1196, 346, 1], [975, 340], [940, 290], [890, 342], [775, 265]]
```
