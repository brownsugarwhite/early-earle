# Plan: Ozzy stabil und schnell (17.11.2026)

**Stand: Entwurf zur Freigabe.** Gebaut ist nichts. Alle Zahlen kommen aus Messungen dieser Sitzung im Testbrowser; der Arbeitsbaum
wurde dafür nicht geändert (die Versuche ändern nur das ausgelieferte Modul für einen Lauf). Messblatt mit allen Tabellen und Bildern:
[`docs/progress/ozzy/2026-11-17-messen-karte-zug-p.md`](../progress/ozzy/2026-11-17-messen-karte-zug-p.md).

**Auftrag (Florian, 17.11. abends, gekürzt wörtlich):** „Die ganzen optimierungen und mene klarstelungen will ich in dieser sitzung
erledigen um einen stabilen stand mit top performance zu erhalten. Maul, Posen und teile anfügen machen wir dannach in einem nächsten
schritt. […] Recherchiere erstmal und mache die notwendigen tests und ehrliche gegenüberstellungen und erstelle daraus einen plan für
die genaue vorgehensweise. […] Prüfe auch nochmal die gesamte bedienung ob alles funktioniert undob man noch etwas verbessern kann.“

**Seine Klarstellungen (wörtlich):**
- Spiegel: „Ich möchte wenn wir die hälfte dann final berechnen, einen Schalter der wie der mirrormodifier bei blender funktioniert.
  wenn man ihn klickt schaltet man clipping ein und aus und elemente verschmelzen in der mitte oder auch nicht. Wenn sie verschmelzen
  bildet sich in der mitte ein edgeloop. mit abgerundeten kanten. Es soll ein einfacher mehrfachschalter sein, der standardmäßig auf
  an mit clipping gestellt ist. beim ersten click wird clipping ausgeschaltet beim zweiten click wird die spiegelhälfte ausgeblendet.“
- P: „Das wekzeug P fuktioniert noch nicht überall gleich und es soll auch runde und gebogene shapes mit mehreren punkten von allen
  seiten/ansichten (außer raum) einzeichnen können. wenn ich also von einer seite eine linie über das mesh lege sollte diese immer ein
  edgeloop über die kante ziehen.“
- Gleiten: „Ich muss punkte und linien auch auf der haut gleiten lassen können ohne das mesh zu beeinflussen.“
- Flächen: „Ich will flächen in den ansichten auch bearbeiten können“.
- Wenden: „Wenn ich die ansichten wende drehen sie sich wie ein flaches blatt. Es sollen natürlich 3d objekte sein die isometrisch
  genau in der ansicht liegen und beim drehen auch 3d sein.“
- „Es soll eine wireframe ansicht im raum.“

**Seine Antworten auf die vier Fragen der Übergabe:** 1. Tempo in zwei Schritten: „Wenn du es für besser hälst […] wir werden das
tempo brauchen.“ 2. Seifenhaut in Bewegung kleiner zeichnen: „Nein, ich finde die seifenhaut auch so etwas snoch teilweise etwas
kantig. Sie soll immer super glatt und smooth aussehen und optimal bearbeitbar sein. Vllt gibt es hier auch eine elegantere lösung
oder du bekomms den shader selbst besser hin.“ 3. Systemzeiger: „OK, zeig mir erst enen film“. 4. Erst Tempo, dann Kern: „Wenn das
die bessere vorgehensweise ist. OK.“

## 1. Kurz

**Was die Prüfung ergeben hat:**

1. **Die Ausgangslage hält.** Alle 22 Fenster-Proben von Ozzy laufen durch.
2. **Das Kantige in der Seifenhaut hat eine klare Ursache und lässt sich ohne Kosten beheben.** Muster und Dehnung der Haut werden an
   drei Stellen vom nächsten Punkt kopiert statt stetig weitergereicht; die Dünnschichtfarbe macht aus jeder Stufe eine Scherbe. Im
   Versuch (nur stetig weiterreichen) sind die Scherben weg:
   [`2026-11-17-seifenhaut-glatt-vorher-nachher.png`](../progress/ozzy/2026-11-17-seifenhaut-glatt-vorher-nachher.png).
3. **Beim Drehen bremst die Grafikkarte, und zwar die Seifenhaut:** 13,5 ms je Bild im Raum, 18 ms nah herangezoomt (Linien: 2,6 ms).
   Einzeln gemessen kosten die Kantenglättung mit 16 Bit je Kanal 6,6 ms, das Rauschen der Dicke im Shader 5 bis 9 ms und Dreiecke,
   die kleiner sind als ein Bildpunkt, 4,4 ms (die Anteile überlappen sich). Alle drei lassen sich holen, **ohne dass das Bild
   kleiner oder anders wird**. Dein Nein zum kleineren Zeichnen in Bewegung kostet also nichts.
4. **Im Zug bremst der Prozessor:** 18,8 ms je Bild an „strange bird“. Mit zwei kleinen Hebeln (dem Werk den Bildtakt richtig melden,
   Stufen der Anzeige nach der Größe im Bild) gemessen 11,1 ms. Für sichere 60 und für 120 Bilder je Sekunde im Zug müssen der Löser
   aus dem Bildtakt und die feine Haut vom Prozessor.
5. **Wenden:** In der einzelnen eingerasteten Ansicht dreht der Körper schon räumlich. In den Feldern der Vier Ansichten wird die
   Zeichnung gestaucht wie ein Blatt. Das ist die Stelle.
6. **P ist je Ansicht verschieden und kann den gebogenen Schnitt nicht:** Gerade quer geht überall. Gebogen quer mit mehreren Punkten
   gibt in der Seite „Keine Form“, in der Front einen Ring mit 32 umgeschlagenen Dreiecken, im Top einen Ring, der nicht dem
   gezeichneten Bogen folgt. Eine offene Linie auf dem Körper wird immer geschlossen.
7. **Stabilität im Kern:** Nach drei gewöhnlichen Zügen an der Linie der Mitte zählt das Werk an „strange bird“ bis zu 16
   umgeschlagene Dreiecke (vorher 0), an „teat firefish“ 4 (vorher 0), an „maul handgemacht test“ 10 bis 14 (vorher 8). Punkte ohne
   Spiegelbild sind in zwei Läufen mit je neun Zügen nicht entstanden; der Fall vom 16.11. bleibt ein Prüfpunkt.
8. **Bedienung, kleine Stolpersteine:** Die Hinweiszeile ist in den Vier Ansichten breiter als das Fenster. Zweimal Esc im Raum lässt
   die Luft ab. Ein Klick mit P knapp neben ein Feld dreht und klappt die Vier Ansichten zu. In den Feldern ist neben der Form kaum
   Platz für einen Anfang „im Leeren“.

**Was ich vorschlage:** sechs Etappen, jede endet mit einem Stand, der benutzbar und gemessen ist. Du kannst nach jeder anhalten.

| | Etappe | Was du danach hast |
| --- | --- | --- |
| A | Tempo I und die glatte Seifenhaut | Drehen pünktlich am Takt, der Zug deutlich flüssiger (rund 11 statt 19 ms je Bild), Seifenhaut ohne Scherben und in jeder Größe glatt |
| B | Bedienung in Ozzy | Zeiger und Greifen direkt (Film zuerst), Wenden räumlich auch in den Feldern, Wireframe im Raum, die kleinen Stolpersteine weg |
| C | Werkzeuge mit dem Kern | P überall gleich und gebogen rundum, Gleiten auf der Haut, Flächen wählen und bearbeiten; keine neuen umgeschlagenen Dreiecke |
| D | Die Hälfte als Wahrheit, Spiegel-Schalter | die halbe Haut ganz (Schritt 4c), dein Schalter mit drei Stellungen |
| E | Tempo II | Löser aus dem Bildtakt, Haut auf der Grafikkarte: der Zug bei 120 |
| F | Abschluss | `main.ts` aufgeteilt, Übergabe, vorbereitet für Maul, Posen und Teile |

Drei Fragen an dich stehen in Abschnitt 6.

## 2. Maßstäbe (woran ich „top“ und „stabil“ messe)

Gemessen wird mit den Werkzeugen aus dem Messblatt, vor und nach jedem Schritt, je ein Lauf, an „strange bird“ (und einmal je Etappe
an allen drei Formen). Das Aussehen entscheidest du an Bild oder Film.

| | heute | nach Etappe A | nach Etappe E |
| --- | --- | --- | --- |
| Grafikkarte je Bild, Raum | 13,5 ms | höchstens 8 ms | höchstens 6 ms |
| Grafikkarte je Bild, Raum nah | 18 ms | höchstens 10 ms | höchstens 8 ms |
| Zug: Rechnen je Bild (Median / 95 %) | 18,8 / 26,4 ms | rund 11 / 17 ms (im Versuch gemessen) | höchstens 5 / 7 ms |
| Eingerastet, je Bild (etwa wenn der Zeiger sich bewegt) | 9,7 ms | höchstens 4 ms | wie A |

- **Glatt:** keine Scherben; am Umriss und in den Spiegelungen keine Facetten, bei jedem Zoom bis zum Achtfachen; kein Sprung bei
  Netzwechsel, Übergabe von der Blase und ⌘Z (das vorhandene Maß „Sprünge der Haut“ darf nicht steigen).
- **Stabil:** alle Proben halten; kein Punkt ohne Spiegelbild (wird gezählt); nach einem Zug nicht mehr umgeschlagene Dreiecke als
  davor; ⌘Z stellt jeden Handgriff her.
- 8 ms je Bild ist die Grenze für 120 Bilder je Sekunde, 16 ms die für 60. Nach A ist das Drehen bei 60 überall pünktlich und bei
  120 im Raum möglich; der Zug bleibt bis E knapp über dem Takt von 60 (jedes zwanzigste Bild).
- Die Ziele für die Grafikkarte nach A sind aus den einzeln gemessenen Hebeln geschätzt (sie überlappen sich), nicht gemessen. Hält
  ein Ziel nach dem Bau nicht, sage ich es mit dem Messblatt.

## 3. Die Etappen

Je Schritt: was du siehst, was gebaut wird, die Probe. Aufwand als Größe (klein: Stunden, mittel: ein halber bis ein Tag, groß:
mehrere Tage), nicht als Versprechen. Hält ein Beweis nach seinem Aufwand nicht, halte ich an und sage es.

### Etappe A: Tempo I und die glatte Seifenhaut (Ozzy; an der Rechnung ändert sich nichts)

**A0. Grundlinie (klein).** Das Messblatt von heute ist die Grundlinie. Dazu die Proben als eine Reihe (`ozzy-alle.mjs`: alle
nacheinander, je Probe eine Zeile), damit nach jedem Schritt in sieben Minuten klar ist, dass nichts gebrochen ist.

**A1. Dem Werk den Bildtakt richtig melden (klein).** Der Fehler aus dem Prüfbericht (3.1): Ozzy zeichnet nach `bildRechnen`, das Werk
hält sein Bild für billig und rechnet bis zu 12 ms. Gebaut wird ein Setzer im Werk für „was das Bild sonst kostet“ und der Takt des
Bildschirms statt fester 14,5 ms. Probe: `ozzy-zug-messen` (gemessen im Versuch: 18,8 → 14,6 ms; „maul handgemacht test“ 15,7 → 12,7).

**A2. Seifenhaut stetig (klein bis mittel).** Du siehst: keine Scherben mehr, die Farben fließen; beim Ziehen zeigt die Dehnung weich,
wo die Haut gestreckt wird.
- Muster und Dehnung werden stetig weitergereicht: beim Verfeinern der Anzeige als Mittel der Kantenenden; bei Netzwechsel und bei
  der Übergabe von der Blase über das Dreieck, in dem der Punkt liegt, statt vom nächsten Punkt.
- Die Dehnung klingt ganz aus (heute hört das Ausklingen 2,5 s nach der letzten Änderung auf; nach dem Code bleibt rund ein
  Fünftel stehen) und wird einmal über die Nachbarn geglättet.
- Spiegelungen: Die Normalen sind heute zwischen den Rechenpunkten gerade gemischt. Ich lege ein Vergleichsbild mit rund gemischten
  Normalen daneben; du entscheidest, ob es das braucht.
- Probe: Vergleichsbilder in Ruhe, nach einem Zug mit Netzwechsel, beim Aufblasen, nach ⌘Z; das Maß „Sprünge der Haut“. **Dein Auge.**

**A3. Seifenhaut billig bei gleichem Bild (mittel).** Du siehst: nichts anderes, nur pünktliche Bilder.
- Das Rauschen der Dicke entsteht einmal je Bild in einer kleinen Textur statt viermal je Bildpunkt (gemessen: bis 9 ms).
- Das Zeichenziel bekommt 8 Bit je Kanal in der Farbkodierung, die im Licht mischt, statt 16 Bit (gemessen: 3 ms; die Kantenglättung
  bleibt vierfach). Vergleichsbild an den Glanzlichtern; weicht es sichtbar ab, bleibt es bei 16 Bit und zweifach.
- Die Stufen der Anzeige richten sich nach der Größe im Bild: so fein, dass eine Dreieckskante zwei bis drei Bildpunkte lang ist. Fern
  sind das weniger Stufen als heute (gemessen: 4,4 ms Grafikkarte, 2,5 ms Prozessor im Zug, Bild gleich), nah mehr als heute. **Das
  ist auch die Antwort auf „immer super glatt“: Der Umriss wird beim Hineinzoomen feiner statt eckig.**
- Ist von der Blase nichts zu sehen (eingerastet, Felder ohne Raum), wird ihr teures Ziel nicht benutzt (heute 6,5 ms für nichts).
- Probe: `ozzy-karte-messen` vorher und nachher; Bildvergleich bei stehender Zeit; dein Auge am Film einer Drehung.

**A4. Kleinigkeiten (klein).** Fenstermaße nicht bei jedem Mausereignis abfragen; der Strahl gegen die Haut einmal je Bild statt je
Mausbewegung; in der Pose das Gedrehte merken, statt es zwölfmal je Bild neu zu drehen; Weichzeichner hinter Leiste und Menü nur, wo
man ihn sieht (Vergleichsbild).

### Etappe B: Bedienung in Ozzy

**B1. Zeiger und Greifen (klein bis mittel; Film zuerst, wie du gesagt hast).**
- Der Film: dieselbe Handbewegung zweimal nebeneinander, in echter Geschwindigkeit und in Zeitlupe. Links wie heute (der Zeiger wird
  im Bild gezeichnet, hängt ein bis zwei Bilder hinter der Hand und ruckt mit jedem verpassten Bild), rechts der Vorschlag (der
  Systemzeiger in der Form des Werkzeugs für Ruhe und Zeigen; der gezeichnete Zeiger nur, solange er sich von der Hand löst und zur
  gegriffenen Stelle gleitet; Tropfen, Schwellung und Feld bleiben flüssig im Bild). Dazu ein Schalter in der Adresse, damit du es in
  deinem Fenster selbst spürst: Ein Film zeigt Verzögerung nur ungefähr.
- Greifen sofort beim Drücken: Das Ziel wird für genau den Ort des Drückens bestimmt, nicht aus dem Bild davor. Das brauchen Stift und
  Finger (der erste Tipp greift heute oft nichts) und schnelles Arbeiten mit der Maus.
- Nach dem Loslassen zählt für das nächste Ziel die Hand, nicht der gezeichnete Zeiger.
- Probe: Film; eine Probe, die ohne vorheriges Zeigen drückt und den Punkt trotzdem greift.

**B2. Eine Abbildung je Fläche, Wenden räumlich (mittel).** Du siehst: ⇧ + Ziehen in einem Feld der Vier Ansichten dreht den Körper
mit seinen Linien räumlich, parallel und genau wie in der einzelnen Ansicht; über die Hälfte kommt wie bisher die harte Kante.
- Wand, Feld, eingerastete Ansicht und Kistennetz bekommen eine gemeinsame Art Abbildung (Ort im Raum → Bild und zurück). Das Wenden
  eines Felds ist darin eine echte Drehung statt einer Stauchung.
- Die Linien werden nur neu aufgebaut, wenn sich das Werk ändert; je Bild gehen nur ihre Lagen durch die Abbildung (heute 1,5 ms je
  Bild und viel Abfall für die Speicherbereinigung, eine Quelle einzelner Aussetzer).
- Der weiße Körper liegt auch auf den Wänden des Raums (ein Weg für Verdecktes statt zwei); zuerst als Vergleichsbild.
- Probe: Film „Feld wenden“ vorher und nachher; Messblatt (Linien bauen unter 0,3 ms); alle Proben.

**B3. Wireframe im Raum (klein bis mittel; Bild zuerst).** Vorschlag: eine Taste und ein Tropfen schalten im Raum zwischen Seifenhaut
und Netz. Das Netz ist das dichte Netz der Rechnung (das, was wirklich gerechnet wird), als Haarlinien auf der gewölbten Fläche, vorn
in Tinte, hinten fein und grün wie Verdecktes; die Linien und Punkte bleiben darüber greifbar. Ich zeige zwei Bilder (Netz allein,
Netz über blasser Seifenhaut), du wählst.

**B4. Die kleinen Stolpersteine (klein, je einer).**
- Hinweiszeile: nur, was unter dem Zeiger mit dem Werkzeug gerade möglich ist (höchstens drei Angaben), der Rest hinter „?“.
- Esc verlässt Werkzeug, Auswahl und Ansicht, lässt aber nicht mehr die Luft ab (dafür bleibt ⌫ ohne Auswahl). Vorschlag, dein Wort.
- Ein Entwurf mit P gehört seiner Fläche: Klicks knapp neben dem Feld zählen dazu, statt zu drehen und die Vier Ansichten zu schließen.
- ⌘Z: Die Haut fließt mit den Linien zurück.
- Aus der Liste der Übergabe: Enden eines Rings in Front und Top löschen; Klick an einer Kreuzung und der Tropfen „Maul“; ↩ hält an
  der Silhouette 110 bis 220 ms an (vorher rechnen); Drehen und Aufklappen als eine Bewegung; eine Meldung verschwindet, wenn ihr
  Anlass vorbei ist.

### Etappe C: Werkzeuge mit dem Kern

Ab hier ändert die Sitzung auch den Rechenkern (sie ist die Sitzung des Kerns). Jede Änderung mit Probe im Kern, im Prüffenster
`kurven.html` und in Ozzy; der Schnitt `kurven.ts` → `werk.ts` bleibt wiederholbar.

**C1. Fehler zuerst (mittel).** Umgeschlagene Dreiecke nach gewöhnlichen Zügen an der Mitte und an dünnen Spitzen: Ursache messen
(eine Kernprobe mit dem Zug von heute), beheben, als Zählung in die Proben. Punkte ohne Spiegelbild: den Fall vom 16.11. nachstellen,
Ursache im Verdichten beheben, Zählung in die Proben. Kriterium: nach den neun Zügen des Messblatts (`ozzy-zuege-zaehlen`) an keiner Form mehr umgeschlagene Dreiecke als davor.

**C2. P überall gleich, gebogen rundum (mittel bis groß; kleiner Beweis im Kern zuerst).** Du siehst, in Seite, Front und Top, vorn
und gewendet, eingerastet, im Feld und an der Wand dasselbe:
- **Quer über die Form** (Anfang und Ende im Leeren), gerade oder gebogen, mit beliebig vielen Punkten: ein Loop rundum, „über die
  Kante“. In dieser Ansicht liegt er deckungsgleich auf dem gezeichneten Pfad, vorn und hinten. Vor ↩ zeigt der Lichtring ihn.
- **Geschlossen auf dem Körper:** eine Form auf der Haut, wie heute.
- **Von Punkt oder Linie zu Punkt oder Linie:** eine Abzweigung, wie heute.
- Die Richtungen bleiben, wie du sie ziehst (auch ungleich lang und geknickt).
- Im Kern: der Schnitt der Haut mit dem Vorhang durch den gezeichneten Pfad längs der Blickrichtung (heute nur mit einer Ebene),
  spiegelgleich; die gezeichneten Punkte werden die Punkte des Loops.
- Beweis zuerst: ein Bild aus dem Kern (Bogen über die Kugel und über „strange bird“, drei Ansichten) und zwei Zahlen: Abstand des
  Loops vom gezeichneten Pfad in der Ansicht höchstens 0,5 Bildpunkte; keine umgeschlagenen Dreiecke.
- Probe danach: `ozzy-p-ueberall` wird zur Probe (dieselbe Geste, auf jeder Fläche derselbe Befund).
- Bleibt wie heute, bis du es anders willst: Eine offene Linie mitten auf dem Körper, die nirgends hängt, wird geschlossen (freie
  Enden kennt die Rechnung nicht).

**C3. Gleiten auf der Haut (mittel; Beweis zuerst, weil es an die Grundidee rührt).** Du willst Punkte und Linien auf der Haut
verschieben, ohne dass die Form sich ändert. Zwei Fälle:
- **Ein Punkt gleitet auf seiner Linie:** Die Linie bleibt, wo sie ist, die Form bleibt genau. Das geht sicher.
- **Eine Linie oder ein Punkt gleitet quer über die Haut:** Die Linie wird an der neuen Stelle auf die Haut gelegt, wie sie ist. Die
  Haut steht in dem Moment. Aber die Form ist bei uns, was aus den Linien folgt: Trug die Linie an der alten Stelle Form (eine Beule,
  eine Kante), dann setzt sich die Haut beim nächsten Rechnen etwas um. Eine Kante wandert mit ihrer Linie; das ist dann gewollt.
- **Beweis im Kern, Kriterium vorher festgelegt:** an deinen drei Formen je eine weiche Linie um 10 und um 30 Einheiten gleiten
  lassen, dann über die ganze Haut bis zur Ruhe rechnen. Die Haut darf sich um höchstens 0,5 Einheiten bewegen (ein Viertel
  Bildpunkt bei normaler Größe). Hält das nicht, zeige ich dir Bild und Zahlen, und wir entscheiden, ob „fast unverändert“ reicht.
- Bedienung (Vorschlag): ⌘ halten und ziehen gleitet (Punkt, Linie, Auswahl); auf dem iPad ein Knopf. Danach ein Film.

**C4. Flächen wählen und bearbeiten (mittel; Bild zuerst).** Das ist Schritt 7 des Kern-Plans („Auswahl wie in Blender“): Punkte,
Linienstücke und Flächen. Eine Fläche ist das Feld der Haut zwischen Linien; gewählt meint sie die Punkte auf ihrem Rand.
- Du siehst: Ein Klick in ein Feld zwischen Linien wählt es (es tönt sich); an der gewählten Fläche ziehen bewegt sie; G, S und R
  wirken auf die Auswahl (auch für Punkte und Linien, das fehlt in Ozzy bisher). Ziehen an einer nicht gewählten Stelle dreht wie
  bisher. In jeder Ansicht gleich.
- Ob ich „Flächen bearbeiten“ richtig verstehe, ist Frage 2 in Abschnitt 6.

### Etappe D: Die Hälfte als Wahrheit und der Spiegel-Schalter

**D1. Der Rest der halben Haut (Schritt 4c; groß, in vier Teilen, jeder mit seiner Probe wie in 4b).** Gewichte und Vermessen auf
der Hälfte; die einzelnen langsamen Bilder im Zug; Verdichten und Anzeige auf der Hälfte; zuletzt das Netz selbst als Hälfte (der
Rand ist die Mittelebene, die Anzeige spiegelt, die Buchführung der Punktpaare fällt weg, und Punkte ohne Spiegelbild kann es dann
nicht mehr geben). Alte gesicherte Formen werden beim Laden zur Hälfte. Probe je Teil: derselbe Zug vorher und nachher (gleiche Form
bis 0,1), Zeiten im Kern, Bilder im Fenster; dazu eine größere Prüfform (ein Körper mit vier angesetzten Teilen), damit die Reserve
sichtbar wird.

**D2. Der Spiegel-Schalter (mittel; Beweis im Kern zuerst).** Ein Tropfen in der Leiste mit drei Stellungen, reihum:
1. **Spiegel an, Clipping an (Standard).** Nichts geht durch die Mitte. Was die Mitte erreicht, verschmilzt mit seinem Spiegelbild:
   In der Mitte entsteht ein Loop, sein Rand ist rund.
2. **Spiegel an, Clipping aus.** Nichts Neues verschmilzt; Teile dürfen durch die Mitte und durchdringen ihr Spiegelbild.
3. **Spiegelhälfte ausgeblendet.** Du siehst und bearbeitest nur die Hälfte.
- Wie ich die Stellungen im Einzelnen lese, steht in Frage 1 (Abschnitt 6); davon hängt ab, was aus der Regel vom 13.11. wird
  (markierter Punkt, Löschen macht fest, K macht rund).
- Beweis zuerst: der Fall „ein Ohr bis an die Mitte ziehen“ im Kern, mit den Kriterien vom 13.11. (der Knick am Rand so klein wie
  eine Dreiecksreihe daneben, die Rechnung kommt zur Ruhe, nichts umgestülpt), ein Bild. Dann im Fenster, mit Film.

### Etappe E: Tempo II (der Zug bei 120)

**E1. Die Haut auf die Grafikkarte (groß; Beweis zuerst).** Heute rechnet der Prozessor je Bild alle feinen Punkte und lädt sie
zweimal hoch. Stattdessen bekommt die Grafikkarte nur die Rechenpunkte mit ihren Normalen und wölbt jedes Dreieck selbst, so fein,
wie es im Bild groß ist. Das ist die elegante Fassung von A3: bei jedem Zoom glatt, im Zug kein Hochladen. Beweis: Vergleichsbild
gegen die heutige Anzeige (Linien genau auf ihrem Pfad, harte Kanten hart), Messblatt (Haut im Zug unter 0,5 ms).

**E2. Der Löser aus dem Bildtakt (groß; eigener kleiner Plan, Beweis zuerst).** Die Runden des Lösers laufen neben dem Bild; das Bild
holt die jeweils neueste Haut. Heikel sind Netzwechsel, Nachlauf, Pose und der Stand. Beweis: ein Zug im Kern über diesen Weg, gleiche
Form bis 0,1; im Fenster Rechnen je Bild im Zug höchstens 5 / 7 ms.

### Etappe F: Abschluss

`main.ts` (5 643 Zeilen) nach seiner Gliederung mechanisch aufteilen, ohne Verhalten zu ändern (früher, falls die Größe der Datei
beim Bauen bremst); die glatte Anzeige als ein Modul für Prüffenster und Ozzy; Schalter an einer Stelle; Übergabe und
Projektgedächtnis; Messblatt an allen drei Formen und, wenn du magst, am iPad. **Vorbereitet für Maul, Posen und Teile:** feste Nummern der Hälfte und ihres
Spiegelbilds (die Pose mit zwei freien Seiten braucht sie); ein gemeinsamer Weg, Werte je Punkt durch jeden Netzwechsel zu tragen
(Muster, Dehnung, Blendshape, später Gewichte und Farben); Anzeige und Löser so geschnitten, dass mehrere Teile hineinpassen.

## 4. Reihenfolge und Abhängigkeiten

- **A vor allem anderen:** kleine Schritte mit gemessener Wirkung, kein Risiko für die Form.
- **B vor C:** B2 (eine Abbildung je Fläche) ist die Grundlage, auf der P und die Flächen in jeder Ansicht gleich bedient werden.
- **C vor D:** P, Gleiten und Flächen brauchst du zum Arbeiten und hängen nicht an der Hälfte. D1 ist der größte Umbau im Plan; er
  soll deine Werkzeuge nicht aufhalten. Der Preis: Was C im Kern anfasst, zieht D1 mit um.
- **D vor E:** Der Löser neben dem Bild und die Haut auf der Grafikkarte werden einmal gebaut, für die Hälfte.
- Willst du den Schalter früher: Die Stellungen 2 und 3 gehen schon auf der heutigen Haut (sie sind Anzeige); Stellung 1 ist erst
  mit der Hälfte sauber.

## 5. Arbeitsweise

- Je Schritt eine vorher festgelegte Probe und ein Messblatt, je ein Lauf, im Vordergrund. Keine Agenten-Fächer, keine Messreihen.
- Aussehen zuerst als Bild oder Film (gleiche Ansicht, vorher und nachher), dann Code. Nie „bestanden“ ohne dich.
- Früh und oft committen und pushen auf `claude/ozzy`; der Hauptordner wird nachgezogen. Dein Fenster `form-alt` (5194) bleibt
  unberührt. Jede Änderung unter `src` lädt Ozzy auf 5205 neu; Versuche laufen deshalb weiter als Flicken oder hinter einem Schalter.
- Nach jeder Etappe: Übergabe überschreiben, Stand in `CLAUDE.md`, deine Abnahme.

## 6. Drei Fragen an dich

**Frage 1, Spiegel-Schalter.** So lese ich dich; stimmt das?
- (a) Mit Clipping verschmilzt, was die Mitte erreicht, **von selbst beim Loslassen**, und der Rand ist **sofort rund**. Das ersetzt
  die Regel vom 13.11. (der Punkt hinter der Mitte bleibt markiert, erst Löschen macht fest, erst „Kante aus“ macht rund).
- (b) Ohne Clipping bleibt schon Verschmolzenes verschmolzen; nur Neues verschmilzt nicht und darf durch die Mitte.
- (c) Zum Trennen von Verschmolzenem: Clipping aus und herausziehen.

**Frage 2, Flächen.** Meinst du das Feld zwischen den Linien (anklicken, ziehen, G/S/R, wie die Flächenauswahl in Blender)? Oder
meinst du, in den Ansichten an der Haut selbst zu formen wie mit dem Pinsel im Raum?

**Frage 3, Gleiten.** Passt ⌘ + Ziehen? Und ist es richtig, dass eine Kante mit ihrer Linie wandert, während eine weiche Linie die
Form stehen lässt (soweit der Beweis es hergibt)?

Dazu die Freigabe: Reihenfolge wie oben, oder eine Etappe vorziehen?

## 7. Was ich nicht weiß

- Alle Zeiten stammen aus dem Testbrowser bei 1440 × 900. Dein Fenster, der Takt deines Bildschirms (60 oder 120) und das iPad sind
  nicht gemessen; A0 holt das nach, sobald du Ozzy einmal mit `?info=1` offen hast.
- Ob 8 Bit im Zeichenziel an den Glanzlichtern sichtbar anders aussehen (A3), zeigt erst das Vergleichsbild.
- Wie weit sich die Haut nach dem Gleiten einer formtragenden Linie umsetzt (C3), zeigt erst der Beweis.
- Die Ursache der umgeschlagenen Dreiecke (C1) kenne ich noch nicht; gemessen ist nur, dass sie entstehen.
- Der Zeiger-Film (B1) ist eine Nachstellung mit gemessenen Bildzeiten; wie es sich anfühlt, zeigt nur der Schalter in deinem Fenster.

## 8. Technik für die bauende Sitzung

| Was | Wo |
| --- | --- |
| Werkzeuge dieser Prüfung | `apps/editor/scripts/pruefen/ozzy-teile.mjs` (Browser, Flicken, `mitKarte`), `ozzy-karte-messen.mjs`, `ozzy-zug-messen.mjs`, `ozzy-p-ueberall.mjs`, `ozzy-zuege-zaehlen.mjs`; einmalige Beweise `apps/editor/scripts/ozzy/haut-glatt-beweis.mjs`, `stufen-vergleich.mjs` |
| A1 | `werk.ts`: `bildRestMs`, `BILD_MS`, `zugRechnen`, `bildRechnen` (letzte Zeile); Ozzy: Ende von `bild()` in `main.ts` (`stat.bildMs`, `mess.teile[0]`) |
| A2 | `werkHaut.ts`: `uebernehmen`, `naechsteSuche`, `vonBlase`, `bezugSetzen`, das Ausklingen in `rechnen` (und das Fenster von 2,5 s in `werkBild`); `glattPlan.ts`: `weiterreichen` (für die Seite der Spiegelung bleibt die heutige Regel), `feldVerfeinernIn` (Normalen gerade gemischt) |
| A3 | `src/anfang/haut.ts`: `dickeHier` und `rauschen` (vier Rauschwerte je Durchgang), Ziel mit `HalfFloatType` und `samples: 4`, vier Durchgänge in `durchgaenge`; `werk.glattStufen`, `GLATT_IM_ZUG`, `werkHaut.rechnen` (Stufen), `werkHaut.umriss`; Größe im Bild: `massstab.jetzt * nutzer.zoom / werkHaut.f` |
| A4 | `lageIm` (Fenstermaße), `werkHautTreffen` in der Zeigerbewegung, `werk.alsAnzeige` (zwölf Aufrufe je Bild) |
| B1 | `ozzy.css` (`#linien { cursor: none }`), `zeigerForm`, `zeigerGestaltSchritt`; `verhalten.ts`: `druecken` (greift nur den Tropfen mit Zustand `folgt`) |
| B2 | `feldAnsicht` und `feldFlaeche` (Wenden als Kosinus), `ebene`, `flaechenJetzt`, `faltPunkt`/`aufWand`, `imFeld`/`ausFeld`, `einzelAbbildung`; `werkBlatt.bauen` (je Bild) |
| C2 | Kern: `loopAusSchnitt` und `schnittLinien` in `loops.ts` (Ebene → Vorhang), `einsetzenLetzten`, `griffeAnlegen`; Werk: `loopSchneiden`, `stiftFertig`, `formErstellen`; Ozzy: `werkBlatt.fertig`, `ortFrei`, `knickSetzen`, `lichtring` |
| C3 | Kern: `loopEinsetzen`, `abzweigen` (Weg über die Haut), `linienAufPfad` (örtlich, mit Gedächtnis), Entspannen in `verdichten.ts`; die Rechnung über die ganze Haut misst die Krümmung an den Linien, „wie die Haut jetzt ist“ (`ausKurven.ts`, Kopf) |
| D | Plan des Kerns, Schritt 4 und 4c, Anhang A.4; `mitteSchnitt.ts` (`mitteFestmachen`), `HautOptionen.halb`, `halbMoeglich`; `verdichten.ts` (`teilen` legt Punkte zuerst ohne Spiegelbild an) |

Nicht bestätigt hat sich in dieser Prüfung: ein Hänger nach P in den Vier Ansichten (es war Esc, das wie gebaut aufs Blatt
zurückging) und eine dunkle Fläche beim Laden (nur im verdeckten Vorschaufenster, im Testbrowser nicht).
