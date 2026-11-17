# Plan: Ozzy stabil und schnell (17.11.2026)

**Stand: freigegeben am 17.11. nachts** (Florian: „Du kannst loslegen.“), mit drei Antworten (Abschnitt 6): Der Spiegel-Schalter
ruht („Lassen wir das mit dem mirror modifier fürs erste. müssen wir noch genauer definieren.“), Flächen meint das Feld zwischen den
Linien („Bei Flächen meine ich A“), „Gleiten passt so.“ Gebaut wird in der Reihenfolge der Etappen; was gebaut ist, steht je Schritt
unter **Gebaut**. Die Zahlen des Entwurfs kommen aus Messungen im Testbrowser; der Arbeitsbaum wurde dafür nicht geändert (die Versuche
ändern nur das ausgelieferte Modul für einen Lauf). Messblatt mit allen Tabellen und Bildern:
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
| D | Die Hälfte als Wahrheit (der Spiegel-Schalter ruht) | die halbe Haut ganz (Schritt 4c); der Schalter erst, wenn du ihn genauer beschrieben hast |
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
**Gebaut (17.11. nachts):** `apps/editor/scripts/pruefen/ozzy-alle.mjs` (alle oder nur die mit einem Wort im Namen).

**A1. Dem Werk den Bildtakt richtig melden (klein).** Der Fehler aus dem Prüfbericht (3.1): Ozzy zeichnet nach `bildRechnen`, das Werk
hält sein Bild für billig und rechnet bis zu 12 ms. Gebaut wird ein Setzer im Werk für „was das Bild sonst kostet“ und der Takt des
Bildschirms statt fester 14,5 ms. Probe: `ozzy-zug-messen` (gemessen im Versuch: 18,8 → 14,6 ms; „maul handgemacht test“ 15,7 → 12,7).
**Gebaut (17.11. nachts):** `werk.bildRestMelden` (Ozzy meldet am Ende jedes Bilds, was es ohne die Runden des Lösers gekostet hat).
Gemessen: „strange bird“ 18,8 / 26,4 → **14,6 / 21,8 ms** je Bild im Zug (Werk 10,8 → 5,9), „maul handgemacht test“ 15,7 / 20,5 →
12,9 / 19,7.
- **Dabei gefunden und behoben:** Mit dem richtigen Bildtakt lief der Zug der Probe `ozzy-werk` (eine frische Form mit nur einer
  Linie) in fünf von sechs Läufen davon. Ein neuer Löser bewegt die Haut in seinen ersten Runden weit (1,65 Einheiten je Runde,
  ab etwa der sechsten 0,04); bekam er dort nur eine oder zwei Runden je Bild, während die Maus weiterzog, lief die Haut auseinander.
  Jetzt laufen die ersten 16 Runden eines neuen Lösers mit dem festen Budget, erst danach gilt der Bildtakt (`ANLAUF_RUNDEN` im
  Werk). Danach: acht von acht Läufen gut, die Probe viermal gut. Dass ein Löser so empfindlich anläuft, gehört zu C1.
- **Nicht gebaut:** der Takt aus dem Bildschirm. Für 60 und 120 Bilder je Sekunde ergibt die Regel (87 % des Takts, bei schnellen
  Bildschirmen im Zug jedes zweite Bild) genau die 14,5 ms von heute; ein eigener Takt lohnt erst mit Etappe E.
- Beobachtet, für C1: An der Form der Probe (Fisch aus sieben Punkten) meldet das Werk nach dem Zug „Hier ließ sich das Netz nicht
  aufräumen“ und zählt 27 umgeschlagene Dreiecke, mit und ohne A1.

**A2. Seifenhaut stetig (klein bis mittel).** Du siehst: keine Scherben mehr, die Farben fließen; beim Ziehen zeigt die Dehnung weich,
wo die Haut gestreckt wird.
- Muster und Dehnung werden stetig weitergereicht: beim Verfeinern der Anzeige als Mittel der Kantenenden; bei Netzwechsel und bei
  der Übergabe von der Blase über das Dreieck, in dem der Punkt liegt, statt vom nächsten Punkt.
- Die Dehnung klingt ganz aus (heute hört das Ausklingen 2,5 s nach der letzten Änderung auf; nach dem Code bleibt rund ein
  Fünftel stehen) und wird einmal über die Nachbarn geglättet.
- Spiegelungen: Die Normalen sind heute zwischen den Rechenpunkten gerade gemischt. Ich lege ein Vergleichsbild mit rund gemischten
  Normalen daneben; du entscheidest, ob es das braucht.
- Probe: Vergleichsbilder in Ruhe, nach einem Zug mit Netzwechsel, beim Aufblasen, nach ⌘Z; das Maß „Sprünge der Haut“. **Dein Auge.**

**Gebaut (17.11. nachts), dein Urteil steht aus.** Bild:
[`2026-11-17-a2-seifenhaut-gebaut.png`](../progress/ozzy/2026-11-17-a2-seifenhaut-gebaut.png) (links vorher, Mitte gebaut in Ruhe,
rechts gebaut nach einem Zug; „strange bird“, gleiche Ansicht).
- Verfeinern der Anzeige: `GlattPlan.mischen` (Mittel der Kantenenden) statt Kopie eines Endes.
- Netzwechsel: `uebernehmen` in `werkHaut.ts` nimmt Muster und Dehnung vom nächsten Ort auf dem Netz davor (aus dem Dreieck dort,
  zwischen seinen Ecken gemischt; Suche über ein Gitter), nicht mehr vom nächsten Punkt.
- Übergabe von der Blase: Das Muster ist dieselbe Funktion der Lage wie auf der Blase (ihr Bezug in Einheiten des Werks), die
  Dehnung kommt je Rechenpunkt mit der Zuordnung der Übergabe. Während die Haut in die Form schnalzt, läuft die Dehnung der Blase
  auf 1: Die Farben kommen an, wenn die Form ankommt. (Gegen die Fläche gemessen zeigte sie den Unterschied zwischen dem Kissen der
  Blase und der Form; nach dem Laden von „strange bird“ war das ein fleckiges Muster, das bis zu neun Sekunden nachklang.)
- Die Dehnung klingt nach einer Änderung ganz aus und endet genau bei 1 (höchstens neun Sekunden lang kommen dafür noch Bilder);
  sie wird nur so weit geführt, wie die Farbe sie zeigt (0,5 bis 6,5).
- **Gemessen** (`ozzy-messen`, „strange bird“): Sprünge der Haut 0 in allen Abläufen; am 16.11. je einer beim Netzwechsel nach dem
  Zug und nach dem Pinsel (99 % der Bildpunkte bis 16 bzw. 20 von 255 anders). Alle 22 Proben halten.
- Nicht nötig war das Glätten der Dehnung über die Nachbarn: Nach einem Zug ist sie von selbst weich.
- **Offen:** das Vergleichsbild zu den Spiegelungen (rund gemischte Normalen). Und, für C1: An einem dünnen Schwanz (Fisch aus sieben
  Punkten) ist die Haut selbst zerknittert; das ist die Form aus der Rechnung, nicht die Anzeige.

**A3. Seifenhaut billig bei gleichem Bild (mittel).** Du siehst: nichts anderes, nur pünktliche Bilder.
- Das Rauschen der Dicke entsteht einmal je Bild in einer kleinen Textur statt viermal je Bildpunkt (gemessen: bis 9 ms).
- Das Zeichenziel bekommt 8 Bit je Kanal in der Farbkodierung, die im Licht mischt, statt 16 Bit (gemessen: 3 ms; die Kantenglättung
  bleibt vierfach). Vergleichsbild an den Glanzlichtern; weicht es sichtbar ab, bleibt es bei 16 Bit und zweifach.
- Die Stufen der Anzeige richten sich nach der Größe im Bild: so fein, dass eine Dreieckskante zwei bis drei Bildpunkte lang ist. Fern
  sind das weniger Stufen als heute (gemessen: 4,4 ms Grafikkarte, 2,5 ms Prozessor im Zug, Bild gleich), nah mehr als heute. **Das
  ist auch die Antwort auf „immer super glatt“: Der Umriss wird beim Hineinzoomen feiner statt eckig.**
- Ist von der Blase nichts zu sehen (eingerastet, Felder ohne Raum), wird ihr teures Ziel nicht benutzt (heute 6,5 ms für nichts).
- Probe: `ozzy-karte-messen` vorher und nachher; Bildvergleich bei stehender Zeit; dein Auge am Film einer Drehung.

**Gebaut (17.11. nachts) bis auf das Zeichenziel.** Messblatt:
[`2026-11-17-messen-nach-a.md`](../progress/ozzy/2026-11-17-messen-nach-a.md).
- **Der Fluss der Dicke als Textur** (`haut.ts`: einmal je Bild in 384 × 384 Bildpunkte, alle Durchgänge lesen sie; außerhalb ihres
  Fensters wird wie bisher gerechnet). Raum 13,3 → 10,7 ms, nah 16,6 → 11,4 ms; Bild gleich (76 dB).
- **Stufen nach der Größe im Bild** (`werkHaut.stufenFuer`): so viele, dass eine lange Kante der feinen Dreiecke rund fünf
  Gerätepunkte misst (das Maß, bei dem das Bild im Versuch gleich blieb). „strange bird“ in gewöhnlicher Größe: eine Stufe statt
  zwei, ab Zoom 2 wieder zwei. Nah heran begrenzt bei großen Formen weiter die Zahl der Dreiecke (wie bisher zwei Stufen); feiner
  wird es dort erst mit E1. Kleine Formen bekommen nah heran mehr Stufen als bisher.
- **Ohne sichtbare Blase kein teures Ziel** (eingerastet): 9,7 → 3,9 ms je Bild.
- **Stand:** Raum 15,8 → **9,5 ms**, nah 21,1 → **12,8 ms**, eingerastet 9,7 → **3,9 ms**, Vier Ansichten 16,8 → 15,1 ms. Die Ziele
  aus Abschnitt 2 (höchstens 8 und 10 ms) sind im Raum fast, nah noch nicht erreicht.
- **Nicht gebaut: das Zeichenziel mit 8 Bit.** Beim Nachrechnen zeigte sich: Damit die hellen Spiegelungen nicht abgeschnitten
  werden, müsste das Bild halb so hell gespeichert werden; nahe Weiß (und die Seifenhaut ist fast überall nahe Weiß) wären die
  Stufen dann gröber als die des Bildschirms. Das Risiko für „immer super glatt“ ist mir zu groß.
- **Gebaut am 17.11. um 20 Uhr (Florian: „Erst A3“): das teure Ziel nur so groß wie die Blase im Bild.** Ozzy gibt der Seifenhaut den Kasten
  der Form im Bild (`hautAusschnitt`); sie zeichnet die Blase in ein Ziel dieser Größe (`Haut.ausschnittFuer`, auf 128 Gerätepunkte
  gerastert) und den Grund darum herum direkt. Nicht in der Pose, nicht beim Aufblasen, und nicht, wenn der Kasten mehr als sechs
  Zehntel des Bilds deckt. **Gemessen:** Raum 9,5 → **6,0 ms**, Vier Ansichten 15,1 → **10,3 ms**, eingerastet 4,3 ms, nah
  herangezoomt unverändert 12,6 ms. **Bild gleich:** 70 bis 101 dB gegen das Ziel über das ganze Bild; mehr als eine Stufe von 255
  weichen höchstens 13 von 5,2 Millionen Bildpunkten ab. Alle 22 Proben halten.
- **Stand von A3 damit:** Raum 15,8 → 6,0 ms (Ziel 8: erreicht), Vier Ansichten 16,8 → 10,3 ms, eingerastet 9,7 → 4,3 ms, nah
  21,1 → 12,6 ms (Ziel 10: nicht erreicht; dort deckt die Blase das Bild, und die Zahl der Dreiecke begrenzt die Stufen: Das löst
  erst E1).

**A4. Kleinigkeiten (klein).** Fenstermaße nicht bei jedem Mausereignis abfragen; der Strahl gegen die Haut einmal je Bild statt je
Mausbewegung; in der Pose das Gedrehte merken, statt es zwölfmal je Bild neu zu drehen; Weichzeichner hinter Leiste und Menü nur, wo
man ihn sieht (Vergleichsbild).
**Gebaut (17.11. nachts):** die Lage der Zeichenfläche wird gemerkt; was unter dem ruhenden Zeiger liegt, klärt das nächste Bild
(`schweben`). **Offen:** das Gedrehte in der Pose merken; der Weichzeichner (Vergleichsbild).

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

**Gebaut (17.11., 21 Uhr), dein Urteil steht aus.**
- **Film:** [`2026-11-17-zeiger-system.mp4`](../progress/ozzy/2026-11-17-zeiger-system.mp4) (27 s; Standbild
  [`2026-11-17-zeiger-system.png`](../progress/ozzy/2026-11-17-zeiger-system.png)): dieselbe Handbewegung oben wie heute, unten mit dem
  Zeiger des Systems; erst in echter Geschwindigkeit, dann viermal langsamer. Es ist eine **Nachstellung**, kein Mitschnitt (ein
  Bildschirmfoto der Seite enthält den Zeiger des Systems nicht): Der rote Kreis ist die Hand; angenommen ist, dass ein Bild, das
  Ozzy zeichnet, zwei Bilder (33 ms) später auf dem Schirm steht als der Zeiger des Systems (üblich sind zwei bis drei; gemessen ist
  das hier nicht). Verpasste Bilder zeigt der Film nicht (beim Zeigen hält Ozzy im Testbrowser seine Bilder). Skript:
  `apps/editor/scripts/ozzy/zeiger-system-film.mjs`.
- **Schalter `?zeiger=system`** (ohne ihn ist alles wie bisher): Der Zeiger des Systems hat die Form des Werkzeugs (Pfeil, Spitze,
  Schlinge; sein Bild deckt sich mit dem gezeichneten: kein Bildpunkt weicht deutlich ab) und steht für den gezeichneten, solange
  der genau auf der Hand läge. Gezeichnet bleibt: beim Drücken und Greifen (der Zeiger gleitet zur Stelle und sitzt auf ihr); danach,
  bis er zur Hand zurückgefunden hat und die Hand fast ruht (sonst spränge er um den Weg, den er nachhängt); der Ring des Pinsels
  über der Haut; das Gleiten von einer Form des Zeigers in die andere. Tropfen, Schwellung und Feld bleiben im Bild und hängen dem
  Zeiger des Systems sichtbar nach. **Grenzen:** Wer Punkt um Punkt zieht, sieht den Zeiger des Systems nur in den kurzen Pausen
  dazwischen; der Gewinn liegt beim freien Zeigen. Im Raum über der Haut bleibt es wie heute (Ring). Ein Stift hat keinen Zeiger des
  Systems: Dort bleibt alles gezeichnet. Stellen: `main.ts` (`zeigerSystemSchritt`, `zeigerBildFuer`), `verhalten.ts`
  (`zeigerAnDerHand`).
- **Greifen sofort beim Drücken** (gilt immer, auch ohne den Schalter): `Verhalten.zielJetzt()` bestimmt das Ziel für genau den Ort
  des Drückens (dieselbe Suche wie in jedem Bild), bevor Ozzy fragt, ob etwas am Zeiger hängt; auch auf dem Blatt und mit P, nicht mit
  dem Lasso. Gegenprobe: Die Maus springt auf einen Punkt und drückt, ohne dass dazwischen ein Bild kommt: bisher in 0 von 3 Fällen
  gegriffen (es drehte die Ansicht), jetzt in 3 von 3. Ein Tropfen, der erst mit dem Drücken entsteht, bleibt an seiner Stelle, der
  Zeiger gleitet zu ihm. Ins Leere gedrückt dreht es weiter.
- **Nicht gebaut: „nach dem Loslassen zählt die Hand“.** Solange der gezeichnete Zeiger zu sehen ist, entscheidet er, was getroffen
  wird (so am 15.11. auf deinen Wunsch gebaut: „kann der cursor nach dem klick auf dem punkt bleiben“). Die Hand zählen zu lassen
  hieße: Der sichtbare Zeiger zeigt auf etwas anderes, als gegriffen wird. Mit dem Schalter zählt die Hand von selbst, sobald das
  System den Zeiger zeigt. Offen ist nur der schwebende Stift am iPad (dort ist die Spitze die Wahrheit): nicht geprüft, nicht
  angefasst.
- Probe: `apps/editor/scripts/pruefen/ozzy-zeiger-fenster.mjs` (sieben Kriterien: Greifen ohne Zeigen, Drehen ins Leere, ohne und
  mit Schalter, Ring und Spitze, Deckung der Bilder). Alle 23 Proben halten.

**B2. Eine Abbildung je Fläche, Wenden räumlich (mittel).** Du siehst: ⇧ + Ziehen in einem Feld der Vier Ansichten dreht den Körper
mit seinen Linien räumlich, parallel und genau wie in der einzelnen Ansicht; über die Hälfte kommt wie bisher die harte Kante.
- Wand, Feld, eingerastete Ansicht und Kistennetz bekommen eine gemeinsame Art Abbildung (Ort im Raum → Bild und zurück). Das Wenden
  eines Felds ist darin eine echte Drehung statt einer Stauchung.
- Die Linien werden nur neu aufgebaut, wenn sich das Werk ändert; je Bild gehen nur ihre Lagen durch die Abbildung (heute 1,5 ms je
  Bild und viel Abfall für die Speicherbereinigung, eine Quelle einzelner Aussetzer).
- Der weiße Körper liegt auch auf den Wänden des Raums (ein Weg für Verdecktes statt zwei); zuerst als Vergleichsbild.
- Probe: Film „Feld wenden“ vorher und nachher; Messblatt (Linien bauen unter 0,3 ms); alle Proben.

**Gebaut (17.11., 21 Uhr 15), erster Teil: Wenden räumlich. Dein Urteil steht aus.**
- **Du siehst:** ⇧ + Ziehen in einem Feld der Vier Ansichten dreht Körper und Linien räumlich; bis dahin wurde die Zeichnung gestaucht
  wie ein Blatt. In der einzelnen Ansicht drehte sich der Körper schon räumlich, die Linien aber lagen flach in der Mittelebene: Jetzt
  liegen sie beim Wenden an ihrem Ort auf der Form. Film (oben vorher, für den Lauf nachgestellt; unten jetzt):
  [`2026-11-17-feld-wenden-raeumlich.mp4`](../progress/ozzy/2026-11-17-feld-wenden-raeumlich.mp4), Standbild
  [`2026-11-17-feld-wenden-raeumlich.png`](../progress/ozzy/2026-11-17-feld-wenden-raeumlich.png).
- **Dabei gefunden und behoben:** Von hinten gesehen (gewendet) zeigte die Seite die abgewandte Hälfte der Form. Ihre Punkte und
  Linien galten als verdeckt (blass) und waren ohne Röntgen nicht zu greifen. Jetzt zeigt die Seite in Ruhe die Hälfte, die zum
  Betrachter zeigt. Gegenprobe am Punkt der Flanke von hinten: vorher „nichts“ am Zeiger, jetzt der Punkt.
- **Während des Wendens** sind die Linien der abgewandten Flanke als Verdecktes zu sehen (fein, blass), wie in Front und Top immer.
- **Technik:** `feldAbbildung` in `main.ts` ist die eine Abbildung eines Felds (Bild und Tiefe): für Linien (`imFeld`,
  `feldFlaeche.hin`), Körper (`feldAnsicht`) und Verdecktes (`tiefeImFeld`); gewendet eine Drehung um die Mitte der Form statt einer
  Stauchung. `Flaeche.hin(X, Y, T?)` nimmt die Tiefe, `Flaeche.raeumlich` sagt, dass sie zählt (die Fläche wird gerade nicht längs
  ihrer Achse gesehen); dann gibt `werkBlatt.bauen` die Tiefe jedes Punkts und jeder Kurve mit, und die Seite zeigt beide Hälften.
  `ebene(…, raeumlich)` dasselbe für die einzelne Ansicht. In Ruhe bleibt jede Abbildung, wie sie war.
- **Probe** `apps/editor/scripts/pruefen/ozzy-wenden-raum-fenster.mjs`: Feld und einzelne Ansicht um 45° gewendet und gehalten: Die
  Punkte der Mitte rücken um cos 45° zusammen, der Punkt der Flanke und sein Spiegelbild liegen 0,00 Punkte neben der Rechnung der
  räumlichen Drehung (139 und 59 Punkte auseinander; flach wären es 0); losgelassen ist alles wieder, wo es war. Alle 24 Proben halten.

**Gebaut (17.11., 21 Uhr 45), zweiter Teil: Die Linien werden nur neu aufgebaut, wenn sich etwas geändert hat.** Am Bild ändert sich
nichts. `werkBlatt.bauen` vergleicht eine Zeile aus allem, woran Netz und Proben hängen (`signatur`: der Stand des Werks, je Fläche
ihre Abbildung an vier Orten samt Tiefe, Stärke, Breite und Seite, die Breiten der Linien, der Entwurf von P). Im Zug, in der Pose
und solange etwas fließt (⌘Z, Tusche, neue Kreuzung), wird wie bisher in jedem Bild gebaut. Gemessen an „strange bird“, Zeiger in
Bewegung, ein Lauf je Fassung:

| | Linien je Bild | Rechnen je Bild (Median / 95 %) |
| --- | --- | --- |
| Raum, vorher | 1,7 ms | 3,0 / 3,7 ms |
| Raum, jetzt | 0,6 ms | 2,2 / 3,2 ms |
| Vier Ansichten, vorher | 2,3 ms | 4,3 / 5,0 ms |
| Vier Ansichten, jetzt | 1,0 ms | 3,7 / 4,2 ms |

Das Ziel „unter 0,3 ms“ ist nicht erreicht: Der Rest ist das Verhalten selbst (Tropfen, Schwellung, Szene), nicht mehr der Aufbau.
Dreht sich die Ansicht, wird weiter in jedem Bild gebaut (die Abbildung ändert sich). Alle 24 Proben halten.

**Offen aus B2:** beim Drehen nur die Lagen durch die Abbildung schicken, statt alles neu zu bauen; der weiße Körper auch an den
Wänden des Raums (Vergleichsbild zuerst); Wand und Kistennetz auf dieselbe Art Abbildung (dort ändert sich nichts Sichtbares).

**B3. Wireframe im Raum (klein bis mittel; Bild zuerst).** Vorschlag: eine Taste und ein Tropfen schalten im Raum zwischen Seifenhaut
und Netz. Das Netz ist das dichte Netz der Rechnung (das, was wirklich gerechnet wird), als Haarlinien auf der gewölbten Fläche, vorn
in Tinte, hinten fein und grün wie Verdecktes; die Linien und Punkte bleiben darüber greifbar. Ich zeige zwei Bilder (Netz allein,
Netz über blasser Seifenhaut), du wählst.

**Geklärt am 17.11. um 22 Uhr (Florian): „Das Netz im Raum hast du falsch verstanden. Ich meinte damit das Kurvennetz genau wie in
den Projektionsflächen, aber im Raum.“** Der Vorschlag oben (das Dreiecksnetz der Rechnung) war also nicht gemeint. Er bleibt nur als
Prüfhilfe hinter `?netz=1` und `?netz=2` (für die umgeschlagenen Dreiecke in Etappe C), ohne Taste und ohne Knopf.

**Gebaut (17.11., 22 Uhr 15): die Ansicht „Kurvennetz“ im Raum, Taste W. Dein Urteil steht aus.**
- **Du siehst:** W wechselt im Raum von der Seifenhaut zum weißen Körper mit Umriss, die Linien und Punkte liegen auf der Form, wie
  auf den Projektionsflächen (vorn in Tinte, was hinter der Form liegt, fein und grün); beim Drehen gehen sie räumlich mit. W noch
  einmal: zurück zur Seifenhaut. Film: [`2026-11-17-kurvennetz-im-raum.mp4`](../progress/ozzy/2026-11-17-kurvennetz-im-raum.mp4),
  Bild: [`2026-11-17-kurvennetz-im-raum.png`](../progress/ozzy/2026-11-17-kurvennetz-im-raum.png).
- **Greifen:** Punkte und Linien auf der Form hängen am Zeiger und lassen sich ziehen wie auf den Flächen, auch die der gespiegelten
  Hälfte. Gezogen wird im Blatt der Achse, die dem Blick am nächsten liegt (wie beim Pinsel), in der Tiefe des gegriffenen Punkts: Er
  bleibt genau unter dem Zeiger, seine Tiefe ändert sich nicht. Daneben auf der Form gilt weiter der Pinsel, ins Leere gezogen dreht es.
- **Die Zeichnungen an den Wänden** treten in dieser Ansicht zurück (sie lägen sonst über dem weißen Körper); die Kanten der Kiste
  bleiben und verschwinden hinter der Form.
- **Technik:** eine räumliche Fläche wie beim Wenden (B2): `raumNetz`, `raumNetzGilt`, `raumBlatt` in `main.ts`;
  `Flaeche.her(x, y, T?)` rechnet in der Ebene der Tiefe des gegriffenen Orts (`ankerTiefe`, `stellenTiefe` in `werkBlatt.ts`);
  `HautWerte.blaseAus`; die Kanten der Kiste haben eine Tiefe (`Kapseln.push` mit `v0`, `v1`).
- **Noch nicht gebaut:** mit P auf der Form zeichnen; ein Knopf (Tropfen) zum Umschalten; das Feld des Raums in den Vier Ansichten;
  auf der Fahrt in eine Ansicht blendet das Kurvennetz aus und die Seifenhaut übernimmt. Das Drehen von Richtungen rechnet schon mit
  der Tiefe, geprüft ist bisher nur das Ziehen von Punkten.
- **Probe** `apps/editor/scripts/pruefen/ozzy-raum-netz-fenster.mjs` (einschalten, ein Punkt der Flanke bleibt beim Ziehen 0,00 Punkte
  unter dem Zeiger, Pinsel und Drehen, ausschalten). Alle 25 Proben halten.

**Florians Urteil (17.11., 22 Uhr 30): „Ist erstmal ok so. Ich seh noch unterschiede zur studie in der ich es erarbeitet habe. Aber
notiere das für den feinschliff.“** Welche Unterschiede, hat er nicht gesagt. **Für den Feinschliff notiert:**
- Die Studie ist die Raum-Probe der Linien-Studie: `apps/editor/raum.html` (`src/linien/raum.ts`, `raum-main.ts`), Unterlagen in
  [`docs/look/linien/UEBERGABE.md`](../look/linien/UEBERGABE.md). Beide mit derselben Form nebeneinander (links die Studie, rechts
  Ozzy mit W): [`2026-11-17-kurvennetz-studie-gegen-ozzy.png`](../progress/ozzy/2026-11-17-kurvennetz-studie-gegen-ozzy.png).
- Was mir am Bild und in den Unterlagen auffällt (meine Liste, von ihm nicht bestätigt; vor dem Feinschliff mit ihm an diesem Bild
  durchgehen):
  - **Größe und Blick:** In der Studie füllt die Form das Bild und steht in den Ansichten Seite, Front, Top und Schräg ohne Kiste;
    in Ozzy steht sie klein in der Kiste des Raums. Bei gleicher Linienstärke wirkt das Netz in Ozzy dadurch dichter und dunkler.
  - **Ton der inneren Linien:** In der Studie sind sie heller und zurückhaltender, Verdecktes ist kaum zu sehen.
  - **P auf der Haut:** in der Studie spiegelgleich, rastet an der Mitte ein (von Mitte zu Mitte ein Ring), Kreuzungen werden auf der
    Haut gesucht. In Ozzys Kurvennetz noch nicht gebaut.
  - **Richtungen** drehen in der Studie auf der Haut, mit ⇧ aus der Haut. In Ozzy rechnen sie mit der Tiefe, geprüft ist es nicht.
  - **Leere Stelle:** In der Studie zieht Ziehen im Leeren einen Rahmen, ⌥ + Ziehen dreht. In Ozzy dreht Ziehen im Leeren, gewählt
    wird mit dem Lasso (L).
  - **Ziehen:** In der Studie zieht ein weiches Feld (Ersatz für den Löser), in Ozzy rechnet das Werk; gezogen wird in der Ebene der
    Ansicht, die dem Blick am nächsten liegt.
  - **Schattierung:** Die Studie hat einen Knopf dafür (drei Stufen wie gedruckt); in Ozzy ist der Körper immer weiß.

**B4. Die kleinen Stolpersteine (klein, je einer).**
- Hinweiszeile: nur, was unter dem Zeiger mit dem Werkzeug gerade möglich ist (höchstens drei Angaben), der Rest hinter „?“.
- Esc verlässt Werkzeug, Auswahl und Ansicht, lässt aber nicht mehr die Luft ab (dafür bleibt ⌫ ohne Auswahl). Vorschlag, dein Wort.
- Ein Entwurf mit P gehört seiner Fläche: Klicks knapp neben dem Feld zählen dazu, statt zu drehen und die Vier Ansichten zu schließen.
- ⌘Z: Die Haut fließt mit den Linien zurück.
- Aus der Liste der Übergabe: Enden eines Rings in Front und Top löschen; Klick an einer Kreuzung und der Tropfen „Maul“; ↩ hält an
  der Silhouette 110 bis 220 ms an (vorher rechnen); Drehen und Aufklappen als eine Bewegung; eine Meldung verschwindet, wenn ihr
  Anlass vorbei ist.

**Gebaut aus B4 (17.11., 22 Uhr 45): Ein Entwurf mit P gehört seiner Fläche.** Du siehst: Ist mit P eine Linie angefangen und ein
Klick landet knapp neben ihrem Feld (bis 28 Punkte), zählt er zur Linie und liegt an ihrem Rand. Weit daneben tut ein Klick nichts
und eine Meldung sagt, warum; Esc bricht wie bisher ab. Vorher drehte so ein Klick die Ansicht und schloss die Vier Ansichten, die
angefangene Linie ließ sich nicht fortsetzen. Stellen: `werkBlatt.ortFrei`, `entwurfOffen`, `ENTWURF_RAND`; `main.ts` beim Drücken.
Probe `ozzy-p-daneben-fenster.mjs` (mit `ALT=1` das alte Verhalten zum Vergleich: Dort schließen sich die Vier Ansichten).

**Gebaut aus B4 (17.11., 23 Uhr 15): Nach ⌘Z fließt die Haut mit den Linien zurück.** Du siehst: ⌘Z nimmt einen Zug zurück, Linien
und Haut gleiten zusammen an ihren Ort (0,22 s). Vorher glitten nur die Linien, die Haut sprang sofort. Vergleichsbild (oben vorher,
unten jetzt; das Bild vor ⌘Z, dann 1, 3, 6 und 14 Bilder danach):
[`2026-11-17-zurueck-haut-fliesst.png`](../progress/ozzy/2026-11-17-zurueck-haut-fliesst.png). Gemessen in der Probe: Im ersten Bild
nach ⌘Z liegt die Haut noch 38 Bildpunkte vom Ziel (Zug 60), dann 30, 23, 17, 12, 8, 5, 3 … und ist nach 11 Bildern da; kein Schritt
zurück. **Technik:** `werkHaut.rueckfluss` merkt die gezeigte Haut, `flussStart` bestimmt, wo jeder Punkt beginnt (als Höhenfeld
über der Haut von jetzt), geblendet werden die Punkte der Rechnung, die glatte Fläche wird wie immer daraus gerechnet. Das war nötig,
weil die Netze vor und nach ⌘Z keine gemeinsamen Nummern haben (schon ein kleiner Zug verdichtet und ordnet neu; zwei einfachere
Fassungen griffen deshalb nicht oder begannen am falschen Ort). Auch nach K (Kante) fließt die Haut so. Probe
`ozzy-zurueck-haut-fenster.mjs`. Alle 27 Proben halten. **Grenze:** Die Spitze eines sehr schmalen Zugs beginnt etwas runder, als
sie war (im Bild: Umriss und Linie liegen im ersten Bild an der Spitze knapp auseinander).

**Offen aus B4:** Hinweiszeile; Esc (Florian, 17.11.: nicht jetzt); Enden eines Rings in Front und Top löschen; Klick an einer
Kreuzung und der Tropfen „Maul“ (gehört zur Sitzung für das Maul); ↩ an der Silhouette; Drehen und Aufklappen als eine Bewegung;
Meldungen, die mit ihrem Anlass verschwinden.

### Etappe C: Werkzeuge mit dem Kern

Ab hier ändert die Sitzung auch den Rechenkern (sie ist die Sitzung des Kerns). Jede Änderung mit Probe im Kern, im Prüffenster
`kurven.html` und in Ozzy; der Schnitt `kurven.ts` → `werk.ts` bleibt wiederholbar.

**C1. Fehler zuerst (mittel).** Dazu aus Etappe A (17.11. nachts): Ein neuer Löser läuft empfindlich an (bekommt er am Anfang eines
Zugs zu wenige Runden am Stück, läuft die Haut einer Form mit nur einer Linie davon; A1 gibt ihm deshalb 16 Runden Anlauf: die
Ursache klären). Und: Ein Zug mit dem Einfluss O hängt davon ab, wann das Verfeinern eingewechselt wird (mitten in der Bewegung oder
danach; an „teat firefish“ 1,4 Einheiten Unterschied an den Nachbarpunkten bei einem Zug um 119): Er soll davon unabhängig sein.
Umgeschlagene Dreiecke nach gewöhnlichen Zügen an der Mitte und an dünnen Spitzen: Ursache messen
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
- Bedienung: ⌘ halten und ziehen gleitet (Punkt, Linie, Auswahl); auf dem iPad ein Knopf. Danach ein Film. Florian, 17.11. nachts:
  „Gleiten passt so.“ (⌘ + Ziehen; eine Kante wandert mit ihrer Linie, eine weiche Linie lässt die Form stehen, soweit der Beweis es
  hergibt).

**C4. Flächen wählen und bearbeiten (mittel; Bild zuerst).** Das ist Schritt 7 des Kern-Plans („Auswahl wie in Blender“): Punkte,
Linienstücke und Flächen. Eine Fläche ist das Feld der Haut zwischen Linien; gewählt meint sie die Punkte auf ihrem Rand.
- Du siehst: Ein Klick in ein Feld zwischen Linien wählt es (es tönt sich); an der gewählten Fläche ziehen bewegt sie; G, S und R
  wirken auf die Auswahl (auch für Punkte und Linien, das fehlt in Ozzy bisher). Ziehen an einer nicht gewählten Stelle dreht wie
  bisher. In jeder Ansicht gleich.
- Florian, 17.11. nachts: „Bei Flächen meine ich A“ (das Feld zwischen den Linien, wie die Flächenauswahl in Blender).

### Etappe D: Die Hälfte als Wahrheit und der Spiegel-Schalter

**D1. Der Rest der halben Haut (Schritt 4c; groß, in vier Teilen, jeder mit seiner Probe wie in 4b).** Gewichte und Vermessen auf
der Hälfte; die einzelnen langsamen Bilder im Zug; Verdichten und Anzeige auf der Hälfte; zuletzt das Netz selbst als Hälfte (der
Rand ist die Mittelebene, die Anzeige spiegelt, die Buchführung der Punktpaare fällt weg, und Punkte ohne Spiegelbild kann es dann
nicht mehr geben). Alte gesicherte Formen werden beim Laden zur Hälfte. Probe je Teil: derselbe Zug vorher und nachher (gleiche Form
bis 0,1), Zeiten im Kern, Bilder im Fenster; dazu eine größere Prüfform (ein Körper mit vier angesetzten Teilen), damit die Reserve
sichtbar wird.

**D2. Der Spiegel-Schalter: ruht** (Florian, 17.11. nachts: „Lassen wir das mit dem mirror modifier fürs erste. müssen wir noch
genauer definieren.“). Nicht bauen, bevor er die Stellungen beschrieben hat. Der Entwurf, wie er zur Freigabe vorlag (mittel; Beweis
im Kern zuerst): ein Tropfen in der Leiste mit drei Stellungen, reihum:
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

## 6. Drei Fragen an dich (beantwortet am 17.11. nachts)

**Antworten:** 1. Spiegel-Schalter: „du hast recht. Lassen wir das mit dem mirror modifier fürs erste. müssen wir noch genauer
definieren.“ 2. „Bei Flächen meine ich A“. 3. „Gleiten passt so.“ Freigabe: „Du kannst loslegen.“ Die Fragen, wie sie gestellt waren:

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
