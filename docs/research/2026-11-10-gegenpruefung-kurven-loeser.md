# Gegenprüfung „Kurven als Wahrheit“: Fehler, Übersehenes, bessere Wege (10.11.2026)

**Anlass.** Florian: „Das Ergebnis ist schon ganz gut, aber entweder sehe ich noch Veränderungen beim Loslassen der Handles und das
Mesh justiert nach oder es ist ungenau und stockt. … Kann man etwas noch eleganter oder besser lösen, um die Ziele besser zu
erreichen? Hast du noch Ideen für den Editor für Werkzeuge, Funktionen bzw. die allgemeine Bedienung …? Denke über den Tellerrand
hinaus und kontrolliere die bisherigen Versuche. Gibt es Fehler? … Haben wir etwas übersehen? Kann man den Löser noch verbessern?“

**Wie geprüft.**
- Unabhängig von der bauenden Session, am Stand `afb79d15` des Branches `claude/form-zuerst`. Am Code des Editors wurde nichts
  geändert.
- **Gelesen:** der Löser (`packages/shape/src/dicht/ausKurven.ts`), die Zerlegung (`loeser/zerlegung.ts`), das Verdichten, das
  Fenster (`apps/editor/src/form/kurven.ts`, ganz), die Planseite „Kurven als Wahrheit“ (Abschnitte 1–18), die Bilanz vom 09.11.,
  Florians Vorgaben seit dem 02.11. Dazu Recherche: Flächen aus Kurven, schnelle Löser, Werkzeuge anderer Programme.
- **Gemessen:** im Kern, ohne Fenster, mit dem unveränderten Löser, an der Kugel mit drei Loops und den Zügen Hals, Ohr, Rüssel
  aus `form-netzunabhaengig.ts`. Varianten des Lösers laufen in einer Messkopie, die mit Standardwerten bitgleich zum Original
  rechnet (geprüft).
- Neun Prüfer liefen parallel. Vier brachen am Nutzungslimit ab, bevor sie ihren Bericht schrieben; ihre Skripte und Ausgaben
  waren vollständig. Die Messungen, auf denen die Hauptaussagen stehen, habe ich danach einzeln und nacheinander wiederholt
  (im Text **✓**). Alles andere heißt „gemessen (ein Lauf)“.
- **Nicht geprüft:** das Fenster mit der Maus, Florians eigene Wesen, die Pose. Alle Zahlen gelten für die Prüffälle.
- Skripte und Ausgaben: [`apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/`](../../apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/README.md).
- Die sechs fertigen Einzelberichte (Ablauf im Fenster, Versuche und Urteile, Literatur, schnelle Löser, Werkzeuge, Florians
  Vorgaben als Prüfliste) liegen unverändert unter [`2026-11-10-gegenpruefung-berichte/`](2026-11-10-gegenpruefung-berichte/).
  Sie enthalten die Einzelbelege mit Datei und Zeile; dieser Bericht fasst zusammen und ergänzt die Messungen.
- Einheiten wie auf der Planseite: 1 Einheit = 0,89 px bei 100 %, 2,7 px bei 300 % (Florians Arbeitszoom).

## Kurzfassung

- **Das Prinzip bleibt richtig** (Kurven als Wahrheit, dichtes Netz). Was stört, kommt nicht aus dem Prinzip.
- **„Justiert nach“ und „stockt“ haben fünf getrennte Ursachen.** Vier davon sind Fehler oder Versäumnisse in Anzeige, Ablauf und
  Rechnung. Sie lassen sich in kleinen Schritten beheben, ohne neue Formel:
  1. **Die Griffe springen beim Loslassen.** Kurze Griffe werden gestreckt gezeigt, und der Streckfaktor wird beim Loslassen neu
     gerechnet. Das ist ein reiner Anzeigefehler und passt wörtlich auf „Veränderungen beim Loslassen der Handles“.
  2. **Der Löser rechnet nur, solange sich die Maus bewegt.** Hältst du still, rechnet nichts. Der Rest kommt beim Loslassen
     auf einmal, danach folgen bis zu vier weitere sichtbare Stufen im Abstand von Zehntelsekunden.
  3. **Der Standard-Löser pendelt.** Nach jedem Zug springt die Haut von Runde zu Runde zwischen zwei Lagen hin und her: am Ohr um
     0,3–0,6 Einheiten, am Rüssel um 2. Auf einem dichten Netz, wie deine Wesen es haben (23 400 Punkte), sind es am Ohr 2,4 und
     am Rüssel 5 bis 26 Einheiten je Runde. Die Bremse dagegen steht schon im Code, sie ist aber nur beim anderen Löser
     (`?gewichte=geometrie`) eingeschaltet. Mit ihr steht die Haut nach drei bis vier Runden. **✓**
  4. **Der Netzwechsel nach dem Loslassen ändert die Form** (bekannt, Planseite Abschnitt 17). Neu: Das lässt sich beim Wechsel
     ausgleichen. Am Hals bleiben dann 0,3 statt 6,3 Einheiten, am Rüssel 1,0 statt 35. Das ist nur noch das Abrunden, das du
     erwartest. **✓** (Hals)
  5. **Eine Rechenrunde ist doppelt so teuer wie nötig.** Zwei Drittel einer Runde kostet ein einziger Schritt (das Lösen mit
     der fertig zerlegten Matrix). Er ist allgemein geschrieben und in JavaScript 3,7-mal langsamer als dieselbe Rechnung
     ausgeschrieben für drei Spalten: 6,0 → 1,6 ms. **✓**
- **Die Schlussfolgerung der Bilanz „am Löser gibt es keinen Hebel mehr, es bleibt nur Tempo, notfalls WebAssembly oder nativ“
  trägt so nicht.** Die Punkte 2 bis 5 sind Hebel an Ablauf und Rechnung. WebAssembly bringt beim Lösen nur noch das 1,7-Fache
  über gut geschriebenes JavaScript. Der Editor kann im Browser bzw. in Electron bleiben.
- **Eleganter heißt hier: vier Regeln statt weiterer Formeln** (Abschnitt 4). Die Kurve ist immer sofort da. Die Haut rechnet
  durchgehend, bis sie steht. Ein Netzwechsel ändert die Form nicht. Ein Löser, der von selbst zur Ruhe kommt, ohne versteckte
  Stellgrößen.
- **Ehrlich offen bleibt eine Modellfrage:** Wo nur eine Linie eine Form hält (Ohr, Horn, Rüssel), legt keine Linie die Dicke
  quer fest. Dort hängt die Form leicht vom Weg ab (gemessen am Ohr rund 1 Einheit). Das beheben die vier Regeln nicht. Dafür gibt
  es einen Vorschlag für die Bedienung (Stütz-Loop) und drei größere Wege, die erst eine Tagesmessung brauchen (Abschnitt 5).
- **Nachtrag (10.11.):** Florian hält `?gewichte=geometrie` für den bisher besten Weg, nur zu langsam. Dafür gelten nur ein
  Teil der Schritte, und eine Nachmessung zeigt zwei Gründe für „zu langsam“ (teure Runde, viel mehr Runden auf dichten
  Netzen). Siehe den Nachtrag vor Anhang A.
- **Stand (10.11. nachmittags):** G1 bis G3 sind gebaut und im Fenster gemessen (am Ende des Nachtrags). Hält man die Maus vor
  dem Loslassen kurz still, ruckt die Haut beim Loslassen nicht mehr nach (bei 23 400 Punkten vorher 11 Einheiten). Dabei
  gefunden: Auf einem geänderten Netz schwingt ein neuer Löser vier bis fünf Runden über; so entstehen die Stufen nach dem
  Loslassen. Das ist der Kern von G4.
- **Stand (10.11. abends):** G4.1 bis G4.3 sind gebaut. Im Zug hält das Verfeinern nicht mehr an. Nach dem Loslassen springt
  nichts mehr, das Fenster steht nicht mehr still (vorher 0,5 bis 3,7 s), und die Haut wird einmal eingewechselt statt in
  Stufen. Offen: Das Einwechseln kommt auf sehr dichten Netzen erst nach 3 bis 6 s und ändert die Form einmal um 0,3 bis 3
  Einheiten; nach Loop, Punkt und Kante läuft noch alles im Hauptthread (G4.4).
- **Stand (10.11. spätabends):** G4.4 ist gebaut. Kante, Löschen, Punkt setzen und Rückgängig halten das Fenster nicht mehr an
  (vorher 0,1 bis 6 s), und der Ruck beim ersten Greifen nach neuen Loops ist weg (fern vom Griff 7 bis 26 Einheiten je Bild →
  höchstens 0,2). Neuer Befund: Mit einem einzelnen Loop hält nichts die Haut; dort bleibt es beim alten Verhalten.
- **Stand (10.11. nachts):** Ein Wesen lässt sich jetzt sichern und laden und übersteht das Neuladen. Für G5 gibt es ein
  Messwerkzeug für die Güte des Netzes; gemessen ist damit erst an Probewesen, Florians eigene stehen aus. Erste Befunde dort:
  Das Netz ist nicht dichter als das Startnetz, es wächst mit der Fläche und beim Spielen (hinaus und zurück, gleiche Form, 7 bis
  10 % mehr Punkte); an den Linien bleiben in jedem Wesen flache Dreiecke stehen.
- **Werkzeuge:** Dem Fenster fehlen fast alle Präzisionshilfen aus Illustrator und Blender (Zahlen im Zug, fein mit ⇧,
  Pfeiltasten, Einrasten, Wiederholen, Auswahlrechteck). Der größte Hebel der Bedienung ist, weite Züge überflüssig zu machen:
  Auswuchs als eigene Operation und eine Startform aus einer Seitenzeichnung (Abschnitt 6).

## 1. Was du siehst, und woher es kommt

| Was du siehst | Ursache | Größe | Abhilfe | Aufwand |
| --- | --- | --- | --- | --- |
| Griffspitze springt beim Loslassen | kurze Griffe werden auf 28 px gestreckt gezeigt; der Faktor wird nach dem Zug neu gerechnet | bis zur doppelten Grifflänge (aus dem Code gerechnet) | Griffe in wahrer Länge, oder Faktor festhalten | klein |
| Linie sieht nach dem Loslassen anders aus | im Zug wird ein Streckenzug gezeichnet, danach der Bézier-Pfad | sichtbar bei hohem Zoom | im Zug den Pfad zeichnen | klein |
| Haut ruckt beim Loslassen | vier Runden auf einmal holen nach, was der Löser im Zug schuldig blieb | 0,2 Einheiten bei 5 200 Punkten, 2,1 bei 11 000 | durchgehend rechnen, auch beim Halten | klein bis mittel |
| Haut zittert, springt zwischen zwei Lagen, „bläst sich in Stufen auf“ | der Standard-Löser pendelt, die Bremse fehlt | je Runde: Ohr ±0,3–0,6, Rüssel ±2–2,6; bei 23 400 Punkten Ohr ±2,4, Rüssel 5–26 | vorhandene Bremse auch im Standard | sehr klein |
| Haut setzt sich nach dem Loslassen in bis zu fünf Stufen | das neue Netz liest dieselbe Fläche anders; dazu läuft der Wechsel in Stufen im Hauptthread | Hals 6,3, Ohr 7,7, Rüssel 35 Einheiten | Netzwechsel im Hintergrund, einmal einwechseln, mit Ausgleich | mittel |
| Stocken | Löser und ganze Anzeige in jedem Mausereignis im Hauptthread; Runde 9 ms bei 5 200, 21 ms bei 11 000, 60 ms bei 28 000 Punkten; Zerlegen 0,1–1,2 s im Hauptthread | – | Lösen straffen, Kurven zuerst zeichnen, Schweres in den Worker, halbe Haut | klein bis mittel |
| Grobe kleine Details | ein Netz für Rechnen und Zeigen | Ohr 22,5° je Kante (Planseite) | Abschnitt 5, Weg B | groß |

## 2. Fehler und Versäumnisse im Einzelnen

### 2.1 Anzeige

**Griffe werden nicht in wahrer Länge gezeigt, und der Faktor springt** (gelesen).
- `kurven.ts:1259–1265`: `griffFaktor = max(1, 28 px / (Maßstab × kürzerer Griff))`, für beide Griffe eines Punkts.
- Im Zug bleibt der Faktor vom Anfang (`:1295`, `:1303`), die Maus wirkt mit 1/Faktor (`:2056`). Nach dem Zug wird er neu
  gerechnet (`:1305–1306`).
- Beispiel bei 100 %: Griffe 5 und 20 Einheiten lang, Faktor 6,3. Ziehst du den kurzen auf 10 Einheiten, steht die Spitze im Zug
  bei 56 px. Nach dem Loslassen ist der Faktor 3,15 und die Spitze steht bei 28 px.
- Betroffen sind alle Griffe unter 28 px, bei 100 % also unter 31 Einheiten: Augen, Ohren, Hörner, jedes Detail.
- Nebenwirkung: Ein sehr kurzer Griff auf einer Seite streckt den Griff der anderen Seite um ein Vielfaches.
- Nicht im Fenster angesehen. Mit Florian an einem kurzen Griff in einer Minute zu bestätigen.

**Im Zug zeigt das Blatt einen Streckenzug statt des Bézier-Pfads** (gelesen, `kurven.ts:1332`: `!zug && exakt ? pfadKurven : pfad`).
Gestreckte Linien sind im Zug eckig, der gezogene Punkt sitzt neben der gezeichneten Linie. Beim Loslassen wechselt die Darstellung.

**Punkt, Griff und Linie werden erst nach dem Löser gezeichnet** (gelesen, `kurven.ts:2073–2097`). Der Griff unter der Maus ist so
träge wie eine Löserrunde plus die ganze Anzeige. Die Kurven kosten fast nichts und könnten immer sofort folgen.

**Die Anzeige „Zug … ms“ misst nur den Löser** (`kurven.ts:2074–2080`). Danach laufen ungemessen: Normalen der ganzen Haut,
vier Band-Geometrien neu samt Grafikpuffern, drei SVG-Blätter ganz neu (`:2094–2097`). Alle Tempo-Kriterien der Planseite
(„≤ 16 ms“) beziehen sich auf die Löser-Zahl. Was du als Stocken siehst, wurde nie gemessen. Dein Bildschirm läuft laut
Projektgedächtnis mit 120 Hz, ein Bild dauert dort 8,3 ms.

### 2.2 Ablauf

**Gerechnet wird nur im Mausereignis** (gelesen).
- Je Mausbewegung eine Runde, eine zweite nur, wenn die erste unter 12 ms blieb (`kurven.ts:2075–2079`). Die Bildschleife zeichnet
  nur. Steht die Maus, rechnet nichts.
- Beim Loslassen vier Runden auf einmal (`:2305`, `RUNDEN_ENDE = 4`).
- Folge: Was fehlt, siehst du genau beim Loslassen. Gemessen (ein Lauf, Zug in 30 Mausschritten): Rest 0,19 Einheiten bei 5 200
  Punkten, 2,10 bei 11 000; davon bleiben nach den vier Runden noch 0,04 bzw. 0,57.
- Die Zahl der Runden je Zug hängt an der Hand: Ein schneller Zug bekommt zehn Ereignisse, ein langsamer hundert. Die Proben
  schicken 30 abgewartete Mausschritte und messen deshalb weder eine schnelle Hand noch das Halten.
- Auf der Planseite steht durchgehend „Runden je Mausbewegung“. Das Kriterium „zwei Bilder nach der letzten Mausbewegung steht die
  Form“ (Abschnitt 11) setzt Rechnen ohne Mausbewegung voraus; gebaut wurde es nicht.

**Nach dem Loslassen folgen bis zu fünf sichtbare Stufen** (gelesen, `kurven.ts:2292–2329`, `:1448–1479`).
1. Loslassen: vier Runden, Linien ablesen, Kreuzungen suchen, Verdichten, Linien auf den Pfad (mit dem anderen Löser). Ein Bild.
2. 30 ms später: neuer Löser über das verdichtete Netz. Die Zerlegung läuft im Hauptthread (0,1–0,6 s Halt). Vier Runden. Ein Bild.
3. Danach bis zu dreimal: noch einmal feiner teilen, neu zerlegen, wieder setzen. Je ein Bild.
- Stufe 2 ist die größte Änderung (Hals 6,3, Ohr 7,7, Rüssel 35 Einheiten; ein Lauf). Ihre Größe hängt am Löser, die Treppe und
  die Halte hängen am Ablauf.
- Der Stand nach Stufe 2 und 3 ist „vier Runden weiter“, nicht fertig. Der Rest kommt beim nächsten Griff dazu, über die ganze Haut.
- Greifst du vor Stufe 2 den nächsten Punkt, beginnt der Zug auf dem ungesetzten Netz; die erste Mausbewegung enthält das ganze
  Setzen (Sprung beim Anfassen).

**Im Standard läuft alles im Hauptthread.** Den Worker und das Verfeinern im Zug gibt es nur mit `?gewichte=geometrie`
(`kurven.ts:2090–2091`). Griff-Züge verfeinern in keinem Modus im Zug (`!z.griff`). Rund 250 Zeilen des Fensters sind im Standard
ohne Wirkung.

### 2.3 Löser

**Der Standard-Löser pendelt; die Bremse fehlt** (gemessen **✓**, Skripte `loeser/mess1.ts`, `mess3.ts`).

Ablauf: Zug in 30 Mausschritten mit je einer Runde wie im Fenster, danach Ziele fest, je Runde die größte Bewegung der Haut.

| Fall | Standard heute | mit der Bremse, die „geometrie“ schon hat |
| --- | --- | --- |
| Ohr, 5 200 Punkte | 0,43 · 0,33 · 0,33 · 0,32 · … Runde 40: 0,63; jede Runde in die Gegenrichtung | 0,37 · 0,23 · 0,04 · 0,013 · 0,007 · 0,003 |
| Rüssel, 5 200 Punkte | 2,15 · 2,06 · 2,03 · 2,03 · 2,6 · … Runde 40: 0,62 | 0,76 · 1,11 · 0,29 · 0,49 · 0,27 · 0,04 (ein Lauf) |
| Ohr, 23 400 Punkte | 2,39 · 2,46 · 2,35 · 2,30 · … Runde 30: 0,58 | 0,29 · 0,11 · 0,04 · 0,03 · 0,012 |
| Rüssel, 23 400 Punkte | 19,6 · 14,2 · 6,2 · 11,5 · 5,3 · 6,9 · … Runde 15: 26,5 · Runde 20: 21,1 | 0,99 · 0,29 · 0,65 · 0,37 · 0,47 · 0,23 · … Runde 20: 0,06 |

- Die Bewegung wechselt jede Runde das Vorzeichen (Kosinus zum Schritt davor −1,00) und wächst am Ohr über 75 Runden noch an.
  In welcher der beiden Lagen die Haut beim Loslassen steht, ist Zufall. Jede weitere Runde (Loslassen, Setzen, Nachverfeinern)
  kippt sie wieder. Auf dem dichten Netz ist der Standard-Löser am Rüssel praktisch instabil.
- Ursache im Code: Bei „geometrie“ wird die Korrektur der Krümmung je Punkt halbiert, wenn sie das Vorzeichen wechselt
  (`ausKurven.ts:937–945`). Bei „gleich“ wird der verteilte Wert ohne Bremse eingesetzt (`:936`).
- Die Bremse ändert das Ziel nicht: Die Endformen mit und ohne liegen am Ohr 0,18 Einheiten auseinander (Mittel 0,01).
- Die Planseite kennt das Pendeln als Randnotiz („pendelt am Ohr dauerhaft um etwa 0,3“, Abschnitt 12). Es wurde nie als
  Ursache behandelt, nie auf einem dichten Netz gemessen und nie mit der vorhandenen Bremse versucht.
- Die Änderung (acht Zeilen) steht in Anhang B.

**Eine versteckte Stellgröße wirkt als Gedächtnis und hängt an der Netzdichte** (gelesen und gemessen **✓**, `mess5.ts`,
`algebra/a3-genau.ts`).
- Die Verteilung der Krümmung enthält je Punkt eine Zeile „bleib beim gemessenen Wert“ mit dem Gewicht `HALT = 1e-6`
  (`ausKurven.ts:73`, `:413`). Sie sollte nur das System lösbar halten.
- Das System wird quadriert gelöst (Normalgleichungen). Dadurch ist 1e-6 nicht mehr klein: Auf großen Feldern und feinen
  Netzen liegt der kleinste Eigenwert darunter.
- Gemessen, wie viel der Krümmungskorrektur ankommt: drei Loops 99 % bei 5 200 Punkten, 91 % bei 19 800; ein Ring 78 % bei
  5 000, 32 % bei 19 300. Beim einzelnen Ring mit 10 600 Punkten bleibt die Hälfte der gemessenen Krümmung als Gedächtnis stehen.
- Folge: Der Standard-Löser ist auf dichten Netzen mit wenigen Linien zum Teil ein Gedächtnis-Löser, und wie stark, entscheidet
  die Netzdichte. Das widerspricht „aus den Kurven, ohne Gedächtnis“ und ist ein weiterer Grund, warum ein feineres Netz eine
  andere Form annimmt.
- Zugleich dämpft diese Zeile heute das Pendeln. Ohne sie läuft der ungebremste Löser bei 28 000 Punkten auseinander (ein Lauf).
  Deshalb erst die Bremse, dann diese Größe klein oder skalenfrei machen. Nicht quadriert gelöst wäre ihr Einfluss unter 0,2 %.

**Die Form hängt leicht vom Weg ab** (gemessen, ein Lauf, `mess2.ts`). Ohr, dieselben Endlinien auf vier Wegen, je 300 Runden
ausgerechnet: 30 gegen 120 Schritte 0,08 Einheiten; direkter Weg gegen „150 % und zurück“ 0,87; ein einziger großer Schritt 0,99.
Nach der Geometrie 0,96 / 0,84 / 2,7. Das ist die direkte Prüfung von „Kurven sind die Wahrheit“; sie fehlte bisher.

**Das Maß ist auf der Kugel genau, die Normalen sind es nicht** (gemessen, ein Lauf, `netz/m3-mass.ts`).
- Mit den wahren Normalen liest das Maß des Standard-Lösers auf der Kugel genau 1,000. Mit den nach Fläche gemittelten Normalen
  0,915 ± 0,089, an den Linienpunkten 0,60 ± 0,34.
- Grund: Auf dem Startnetz (Surface Nets, 16 % stumpfe Dreiecke) ist der Anteil des Laplace in der Fläche fünfmal so groß wie
  der Anteil längs der Normale (1,35 gegen 0,25 Einheiten). Ein Grad Fehler in der Normale macht daraus 10 % Fehler im Maß.
- Die unberührte Kugel mit drei Loops wandert deshalb in 30 Runden bis 0,6 Einheiten (Mittel 0,14).
- „Normalen nach Max“ wurde am 09.11. nur gegen den Sprung und an der mehrdeutigen Kuppel geprüft (siehe Abschnitt 3). Mit der
  Bremse lohnt eine neue, kleine Messung: unberührte Kugel mit drei Loops, 30 Runden.

### 2.4 Tempo

**Das Lösen mit der fertigen Zerlegung ist 3,7-mal langsamer als nötig** (gemessen **✓**, `algebra/a4-kern.ts`).
- `zerlegung.ts:289–318` rechnet für eine beliebige Zahl von Spalten: innerste Schleife über `k`, Werte verschachtelt in einem
  Feld, zwei neue Felder je Aufruf.
- Dieselbe Rechnung für drei Spalten ausgeschrieben, mit drei getrennten Feldern, gibt dasselbe Ergebnis (Unterschied 1e-10):

| Lösen, drei Spalten | 5 200 Punkte | 11 000 Punkte |
| --- | --- | --- |
| Code heute (JavaScript) | 6,0 ms **✓** | 15,2 ms |
| ausgeschrieben (JavaScript) | 1,6 ms **✓** | 4,0 ms |
| ausgeschrieben, WebAssembly | 1,0 ms | 2,5 ms |
| nativ (clang) / Apple Accelerate | 1,0 / 0,8 ms | 2,4 / 2,1 ms |

- Eine Runde „gleich“ kostet 9,0 ms, davon 6,1 ms dieses Lösen **✓**. Mit der ausgeschriebenen Fassung sind es gerechnet 4,5 ms.
  Eine Runde „geometrie“ kostet 13,1 ms (Lösen 6,3, Krümmung verteilen 3,9, intrinsische Triangulierung 1,1, Vermessen 0,9; ein
  Lauf); gerechnet werden daraus etwa 7 ms.
- Die Bilanz führt „drei Spalten in einem Durchgang“ als offenen Schritt. Er ist seit dem 06.11. gebaut, aber in dieser
  langsamen Form.
- Je Runde werden außerdem rund 22 Felder der Größe „Punkte × 8 Byte“ neu angelegt (gelesen); bei 15 000 Punkten sind das über
  100 MB je Sekunde. Wiederverwenden nimmt der Speicherbereinigung die Arbeit.

**Halbe Haut** (gemessen, ein Lauf, `algebra/a2-spiegel.ts`): Rechnet der Löser nur eine Hälfte (die Grundform ist spiegelgleich),
sinkt die Rechenarbeit beim Lösen auf 34 %, beim Zerlegen auf 38 %. Die Lösung ist dieselbe (Unterschied 0,0004 Einheiten).
Voraussetzung ist Entscheidung 3 der Bilanz (Grundform immer symmetrisch).

**Was WebAssembly und nativ wirklich bringen** (gemessen, ein Lauf):

| | JavaScript heute | WebAssembly | nativ (clang) | Apple Accelerate |
| --- | --- | --- | --- | --- |
| Zerlegen, 5 200 Punkte | 80 ms **✓** | 34 ms | 34–39 ms | 6,5 ms |
| Zerlegen, 11 000 Punkte | 262 ms | 103 ms | 105–126 ms | 12,3 ms |

- Beim Lösen bringt WebAssembly nur das 1,7-Fache über gut geschriebenes JavaScript, beim Zerlegen das 2,4-Fache. Die Bilanz
  schätzte für ein natives Modul „Zerlegen 10- bis 30-mal, Runde 5- bis 10-mal“. Gemessen: Zerlegen 2-mal mit einfachem nativem
  Code, 12- bis 21-mal mit einer ausgereiften Bibliothek; Lösen 6-mal gegen heute, aber nur 1,6- bis 2-mal gegen das ausgeschriebene
  JavaScript.
- Läuft das Zerlegen im Hintergrund (Regel 3 in Abschnitt 4), stört seine Dauer kaum noch. Ein natives Modul ist dann nicht nötig.
- Kein Hebel (gemessen): die Reihenfolge der Zerlegung (5 % neben der besten), ein Teil-Neuzerlegen nach örtlichem Verfeinern
  (79–93 % der Arbeit müssten neu), harte statt weiche Bindungen (die Linienpunkte liegen schon 0,003 Einheiten genau).

**Bei 28 000 Punkten reicht das allein nicht.** Eine Runde kostet dort heute 60 ms, mit dem ausgeschriebenen Lösen geschätzt 25 ms.
Dazu kommen halbe Haut und die Frage, ob das Rechennetz so fein sein muss (Abschnitt 5, Weg B). Das Spiel zeigt höchstens
8 000 Dreiecke; das Fenster rechnet bei deinen Wesen mit 52 000.

### 2.5 Netzwechsel: Verfeinern soll nur abrunden

Florian (09.11.): „Das ganze sollte doch komplett unsichtbar sein … und da sollte es ja einfach nur abrunden, aber in exakt der
gleichen Form.“

**Versuch „Ausgleich beim Netzwechsel“** (gemessen, `netz/m5-ausgleich.ts`, ohne Änderung am Kern eingehängt).
- Beim Wechsel auf das verdichtete Netz merkt sich jeder Punkt einmal, um wie viel der Löser auf dem neuen Netz eine andere
  Krümmung verlangen würde, als die Haut gerade hat. Dieser Unterschied wird als fester Zuschlag mitgeführt. Damit steht die Haut,
  wie sie beim Loslassen war, auf dem neuen Netz in Ruhe.

| | Hals **✓** | Rüssel (ein Lauf) |
| --- | --- | --- |
| nur verdichtet, kein Löser (das reine Abrunden) | 0,34 | 1,04 |
| heute: vier Runden nach dem Verdichten | 6,34 (Mittel 1,10) | 35,1 (Mittel 3,9) |
| mit Ausgleich: vier Runden | 0,34 (Mittel 0,01) | 1,04 |
| mit Ausgleich: 30 Runden weiter | 0,00 | 0,04 |

- Beim nächsten Zug kann der Zuschlag bleiben oder über den Zug abklingen. Klingt er ab, ist die Endform am Hals dieselbe wie
  heute (0,04 Einheiten Unterschied), nur ohne Sprung.
- **Ehrliche Grenze:** Der Zuschlag ist ein kleines Gedächtnis für den Lesefehler des Netzes, nicht für die Form. Am Rüssel ist
  er noch nicht gut: Nach dem nächsten Zug bewegt sich die Haut beim Loslassen bis 1,5 (Zuschlag bleibt) bzw. 1,9 Einheiten
  (klingt ab, dazu vier Kratzer im Netz); heute sind es dort 0,4. Über viele Züge hintereinander ist nichts gemessen.
- Der saubere Weg bleibt das Maß nach der Geometrie (Sprung 0,4 am Hals, 1,7 am Rüssel laut Planseite). Mit doppelt so schnellen
  Runden (2.4) ist es neu zu beurteilen.

**Sauber gelöst:** Neue Punkte liegen beim Teilen schon rund (0,016 Einheiten neben der Kugel statt 0,081 auf der Sehnenmitte).
Am Platz der neuen Punkte liegt der Sprung nicht. Aber: Nach dem Teilen haben je 13 % der Punkte vier oder acht Nachbarn (vorher
je 2–3 %). Das Maß mit gleichen Gewichten liest dieselbe Fläche danach um 8 % (Hals), 14 % (Ohr) und 40 % (Rüssel) stärker
gekrümmt; nach der Geometrie um 2–4 % (ein Lauf, `loeser/mess6.ts`).

### 2.6 Kleinere Fehler (gelesen, nicht im Fenster geprüft)

1. Der Rückgängig-Stapel wächst unbegrenzt (`kurven.ts:349`); jeder Schritt hält nach einem Netzwechsel das ganze alte Netz.
2. G/S/R startet mit einer veralteten Mausstelle, wenn der Zeiger beim Tastendruck über dem 3D-Blatt steht (`:3068`); bestätigen
   lässt es sich nur in einem Blatt (`:2866`).
3. ⌘S startet Skalieren, ⌘R Drehen (Tasten ohne Prüfung der Zusatztasten, `:3067`).
4. Esc bricht einen Zug mit der Maus nicht ab (`:3047`); `pointercancel` übernimmt den Zug, statt ihn zurückzunehmen (`:2989`).
5. Der Worker hat keine Fehlerbehandlung; wirft die Zerlegung, verfeinert der Rest des Zugs nicht mehr.
6. Loops können nicht übereinander hinweg gezogen werden: Eine Linie wird nur beim Anlegen ins Netz eingesetzt (`:2397`).
   Kreuzen sich später die Ziele, müssen die Dreiecke dazwischen umklappen (Folge vermutet).
7. Die Liniengenauigkeit ist fest (MK/40), nicht am Bildschirm ausgerichtet: bei 100 % feiner, als man sieht (und löst nach fast
   jedem Zug an einem Detail einen Netzwechsel aus), bei 4 000 % Zoom 7 px grob.
8. Die Spiegelzuordnung (`hautAus`) rundet Lagen auf 0,001: Zwei Punkte, die näher als 0,0005 beieinander oder an der
   Mittelebene liegen, bekommen falsche Partner (gemessen an einem Kunstfall, `netz/m6-spiegel.ts`). Betrifft nur
   zusammengefallene Stellen.

### 2.7 Was sauber ist

- Punkte sind die Wahrheit: Nach dem Zug bleiben sie, wohin sie gezogen wurden. Ein Punkt ändert nur seine zwei Stücke.
- Die Linie liegt in der Ruhe genau auf ihrem Pfad (Rest ≤ 0,003 Einheiten im Zug, 0,000 danach).
- Stift, Griffe, G/S/R und O sind stimmig gebaut. Rückgängig nimmt einen ganzen Zug zurück.
- Die Diagnosen der bauenden Session „Form hängt am Netz“ und „Linienpunkte tragen ein Gedächtnis“ stimmen und sind im Code
  nachvollziehbar. Das Maß nach der Geometrie ist Stand der Literatur.
- Die Zerlegung ist für diese Größe richtig gebaut und gut geordnet.

## 3. Die bisherigen Versuche: welche Urteile tragen

Vollständige Tabelle aller 26 Versuche seit dem 05.11. mit Prüfung je Urteil:
[`2026-11-10-gegenpruefung-berichte/versuche.md`](2026-11-10-gegenpruefung-berichte/versuche.md). Hier nur, was sich ändert.

| Urteil der Session | Befund der Gegenprüfung |
| --- | --- |
| „Am Löser gibt es keinen Hebel mehr, der Hebel ist Tempo“ (Bilanz) | **Nicht belegt.** Bremse, verstecktes Gedächtnis, Rechnen beim Halten und Ausgleich sind Hebel. Die drei Beweise vom 09.11. entstanden laut Git zwischen 09:30 und 12:14 Uhr; angesetzt waren je zwei Tage. Dieselbe Planseite sagt am 08.11.: „Schneller rechnen ändert daran nichts.“ |
| „Krümmung an den Linien mitgelöst: verworfen“ (Abschnitt 18) | **Nicht belegt.** Gebaut, gemessen und entfernt in 17 Minuten. Die gewünschte Eigenschaft trat ein („danach steht die Form (0,00)“, kein Gedächtnis, keine Dämpfung). „35-mal langsamer“ galt für die erste Fassung (innere Rechnung auf 10⁻⁶ genau, ohne Start aus der letzten Lösung). Im Fenster an Florians Fällen nie gemessen. |
| „Linien mit Richtung: nach Tag 1 angehalten“ (Abschnitt 15) | Die Idee ist **bestätigt** (Form eindeutig, Richtung aus dem Liniennetz auf 0,5° genau). Gescheitert ist eine Umsetzung, die die Richtung wieder über eine Messung an der Haut einspeiste. „Tag 1“ waren 101 Minuten. Der in der Recherche genannte Rückfall „rein linear aus der Richtung“ wurde nie gebaut. |
| „Normalen nach Max: an der Kuppel schlechter“ (Abschnitt 16) | **Artefakt.** Die Kuppel über einem Ring ist mehrdeutig (jede Kugel durch den Ring passt); das „Wandern“ ist Gleiten längs dieser Schar. Der Endstand mit Max ist fast genau eine Kugel, der heutige ist gestreckt. |
| Florians Urteil über `?gewichte=geometrie` (08.11.: „ruckelt“, hinkt nach) | Beurteilt wurde ein **Bündel**: anderes Maß, gedämpfte Schritte, andere Matrix, Verfeinern im Zug mit Halten. Das Ruckeln kommt vom Verfeinern im Hauptthread, das Nachhinken von den gebremsten Schritten bei einer Runde je Mausbewegung. Getrennt hat er es nie gesehen. |
| „Die Gleichung braucht Lage und Normale“ (Recherche 09.11.) | **Zu grob.** Das gilt für den Rand eines Flächenstücks. Bei Linien im Inneren einer geschlossenen Haut ersetzt „die Haut läuft knickfrei über die Linie“ die fehlende Angabe, wie beim kubischen Spline durch Punkte. Mehrdeutig ist nur der einzelne Ring. Praktisch stimmt die Aussage beim heutigen Löser trotzdem, weil er Knick und Wölbung an der Linie in einer einzigen Messzahl vermengt. |
| „B über die ganze Haut ist überall gleich oder besser“ (06.11.) | Trägt eingeschränkt: Dieselbe Seite nennt drei schlechtere Fälle; die Testschranken wurden dafür verdoppelt. Das Setzen nach dem Loslassen kam mit B neu in die Welt und wurde an dem Tag nicht gemessen. |

**Messverfahren, die mehrere Urteile schwächen:**
- Je ein Lauf, und das Fenster ist nicht wiederholbar (die zweite Runde hängt an der Uhr, das Setzen an einem Zeitgeber).
  Derselbe Fall „Hörner 170, geometrie“ gibt am 08.11. 11,4 Einheiten und am 09.11. 4,6.
- Faltenzählungen streuen bei gleicher Form um den Faktor 2.
- Kriterien bei 100 % Zoom und 5 200 Punkten; du arbeitest bei 300 % und mit 11 000–26 000 Punkten. Ein halber Bildpunkt ist
  bei 300 % nur 0,18 Einheiten.
- Die Kern-Probe führt die Linien nicht auf ihrem Pfad wie das Fenster seit dem 07.11.

**Annahmen, die sich durch alle Versuche ziehen und nie geprüft wurden:**
- „Eine Runde je Mausbewegung“ (statt: rechnen, bis es steht).
- „Ein Netz für Rechnen und Zeigen“ (darum hängen Auflösung, Tempo und Stabilität aneinander).
- „Die Krümmung an den Linien wird an der Haut gemessen“, und zwar an den schlechtesten Punkten des Netzes.
- „Verfeinern ist ein Ereignis mit neuem Löser“ (jeder neue Löser beginnt ohne den Stand des alten).
- „Wo keine Linie die Form festlegt, füllt die Haut von gestern.“ Dafür gibt es keine Regel.

## 4. Eleganter: vier Regeln statt weiterer Formeln

Alle fünf Ursachen aus der Kurzfassung verletzen eine von vier einfachen Regeln. Keine davon ist eine Sonderregel für einen
Körper oder eine Lage.

1. **Die Kurve ist immer sofort da.** Punkt, Griff und Bézier-Pfad werden gezeichnet, bevor irgendetwas gerechnet wird, in
   wahrer Länge und als Pfad. Sie sind die Wahrheit und kosten nichts.
2. **Die Haut rechnet durchgehend, bis sie steht.** Die Maus gibt nur das Ziel vor. Gerechnet wird im Bildtakt (später im
   Worker), so viele Runden, wie in ein Bild passen, und weiter, solange du hältst. Beim Loslassen ist nichts mehr nachzuholen.
   Dazu gehört ein Maß für „steht“ (Bewegung je Runde unter einem Zehntel Bildpunkt).
3. **Ein Netzwechsel ändert die Form nicht.** Verdichten, Zerlegen und Setzen laufen im Hintergrund auf einer Kopie und werden
   einmal eingewechselt, wenn du nichts hältst. Das neue Netz übernimmt die Form, wie sie ist (Ausgleich oder Maß nach der
   Geometrie). Aus bis zu fünf Stufen wird ein Abrunden.
4. **Ein Löser, der von selbst zur Ruhe kommt, ohne versteckte Stellgrößen.** Die Bremse gilt für beide Maße, `HALT` hängt nicht
   mehr an der Netzdichte, ein neuer Löser übernimmt den Stand des alten.

Was das für deine zwei Beschwerden heißt:
- **„Justiert nach“:** Griffe und Linie stehen sofort richtig (Regel 1). Die Haut kommt an, während du noch hältst (Regel 2).
  Der Netzwechsel rundet nur ab (Regel 3). Nichts kippt mehr hin und her (Regel 4).
- **„Ungenau und stockt“:** Der Griff folgt der Maus mit voller Bildrate (Regel 1). Eine Runde kostet die Hälfte (2.4), es passen
  bei 5 200 Punkten zwei bis drei statt einer in ein Bild. Kein Halt beim Zerlegen (Regel 3).

**Nicht versprochen:** Wie es sich im Fenster anfühlt, entscheidet dein Blick. Gemessen sind die Bausteine einzeln im Kern, nicht
zusammen und nicht mit der Maus.

## 5. Größere Wege (nicht bewiesen), je mit einer Tagesmessung

Die vier Regeln lösen nicht, dass die Form an einer einzelnen Linie quer nicht festgelegt ist, und nicht, dass ein dichtes
Netz teuer ist. Dafür gibt es vier Kandidaten. Keiner ist gemessen. Jeder braucht zuerst einen Tag im Kern mit Kriterium und
Abbruch.

**A. Linear aus Linien mit Richtung: die Form ist eine direkte Funktion der Linien.**
- Idee: Die Richtung an den Linien kommt wie am 09.11. aus dem Liniennetz (`dicht/richtung.ts`, 0,5° genau). Daraus entstehen
  in zwei bis drei fertig zerlegten Lösungen erst die Normalen der ganzen Haut, dann die Wölbung, dann die Lagen (Stanko u. a.
  2016; verwandt Andrews, Joshi, Carr 2011 und die Adobe-Patente dazu). An der Haut wird nichts abgelesen, Runden gibt es nicht.
- Verspricht: jedes Bild fertig, hin und zurück genau, kein Setzen, keine umgestülpte Stelle, die sich selbst bestätigt.
- Belegte Grenzen: Die Kugel wird nur genähert (Krümmung 0,97–1,03 im Beispiel der Arbeit). Linien ohne Kreuzung haben keine
  eigene Richtung. Bruchstelle ist der Rüssel aus zwei Profillinien: Die Wölbung quer ist in linearen Systemen eine Angabe.
- Unterschied zu den verworfenen Versuchen: Verworfen wurde die Richtung über die Krümmungsmessung je Seite (Abschnitt 15) und
  „quer wie längs“ (Abschnitt 13). Dieser Weg misst nichts an der Haut. Die Recherche vom 09.11. nennt ihn als Rückfall.
- Tagesmessung: Kugel mit drei Loops ≤ 0,5 Einheiten vom Radius; Hals, Ohr, Rüssel auf 6 000, 12 000, 24 000 Dreiecken gleich
  (≤ 0,5); Rüssel-Querschnitt Höhe zu Breite ≥ 0,8. Verwerfen, wenn die Kugel über 2 Einheiten abweicht oder der Rüssel flach
  bleibt. Dann taugt er höchstens als Sofort-Antwort (D).

**B. Kleines Rechennetz, glatt unterteilte Anzeige.**
- Idee: Rechnen auf 1 500–2 500 Punkten (FiberMesh rechnete live 600–2 000). Zeigen mit einer glatten Unterteilung, in der die
  Linien genau auf ihrem Pfad liegen und Kanten scharf bleiben. Verdichtet wird das Rechennetz nur, wo die Form es braucht.
- Verspricht: viele Runden je Bild, weniger Netzwechsel, glatte kleine Details bei hohem Zoom.
- Grenzen: Details unter einer Kante des Rechennetzes brauchen weiter örtliche Dichte. Die Unterteilung muss Linien und Kanten
  genau treffen (eigene Arbeit, 3–5 Tage).
- Billige Probe ohne Bau: `kurven.html?dreiecke=2000`. Die Facetten ignorieren und nur fühlen: Hinkt es noch? Springt es noch?

**C. Krümmung an den Linien mitgelöst, diesmal sauber.**
- Idee wie Abschnitt 18 der Planseite: Die Krümmung an den Linien ist eine Unbekannte, gewählt so, dass die Haut glatt über die
  Linie läuft. Das ist dieselbe Ruheform wie heute, aber in einem Schritt statt über gebremste Runden, ohne Gedächtnis.
- Neu gegenüber dem 17-Minuten-Versuch: innere Rechnung grob (10⁻²) und vom letzten Stand aus, Runden und Reste zählen statt
  Zeit, Hörner-Fall messen.
- Lohnt erst, wenn die gebremste Runde (2.3) nicht reicht.

**D. Sofort-Antwort aus dem Griff.**
- Idee: Beim Greifen wird einmal die lineare Antwort der Haut auf den gezogenen Punkt gelöst (eine Spalte). Je Bild wird sie vor
  der Runde aufaddiert. Steht die Maus, ist der Zuschlag null (anders als der verworfene „Schwung“).
- Verspricht: Die Haut ist der Runde eine halbe bis ganze Runde voraus. Nicht gemessen; kann bei Richtungswechsel überschwingen.

**Geprüft und nicht empfohlen:** Anderson, Tschebyschow, L-BFGS (brauchen eine Zielfunktion, die es nicht gibt); Mehrgitter und
WebGPU für die Runde (bei dieser Größe langsamer als das Lösen mit der fertigen Zerlegung); Willmore-Fluss; Flächenspannung
oder Volumen als Zusatz (Regler); Felder aus Abstandsfunktionen als Körper (verschmilzt); Flächenstücke zwischen den Linien als
Form (das ist der Käfig-Weg; fürs Spielnetz weiter richtig).

## 6. Werkzeuge und Bedienung

Geordnet nach Wert für „schnell und genau“. Nach jeder Operation gibt es nur Linien, Punkte und Griffe, sonst nichts; kein
Regler, keine Automatik, die Punkte setzt.

**Zuerst (klein, sofort spürbar):**
1. **Präzision im Zug.** Nach G/S/R eine Zahl tippen; ⇧ zehnmal feiner; Pfeiltasten schieben die Auswahl; mit ⌃ einrasten
   (Griff auf 0/45/90°, Griff gleich lang wie der gegenüber, Punkt auf die Höhe eines anderen Punkts, auf die Mittelebene, auf
   eine Kreuzung); am Zeiger Δx, Δy, Grifflänge, Winkel. Dazu Wiederholen (⇧⌘Z) und Auswahlrechteck. Das meiste gab es im alten
   Editor schon (`apps/editor/src/editing/modal/`); es ist Nachziehen, keine Erfindung.
2. **Verdeckte Linien blass und gestrichelt, weiter greifbar.** Klick trifft das Sichtbare, ⌥-Klick das Stück darunter; eine
   Taste zeigt nur die gewählten Loops (Solo). Das ist deine Klarstellung vom 02.11. und macht Blätter mit zehn Loops lesbar.
3. **Umkehr-Wächter.** Kehrt eine Linie innerhalb eines Stücks um oder berührt sich im Raum, wird das Stück rot und die Haut
   bleibt dort beim letzten gültigen Stand. Der Griff bleibt frei (Illustrator hält nie einen Griff fest). Das beantwortet
   Entscheidung 5 der Bilanz und nimmt die schwarzen Stellen an der Quelle.
4. **Prüfansichten, je eine Taste:** enge Stufen (Zebra); Nachlauf als Farbe (wo die Haut noch nicht steht – zugleich das
   ehrlichste Messgerät für jeden Löser-Versuch); Dehnung der Dreiecke; Spielnetz (gebacken, 8 000 Dreiecke). Das Backen gibt
   es im Kern, das Kurven-Fenster benutzt es nicht.

**Schneller zum Wesen (der größte Hebel der Bedienung):**
5. **Auswuchs als eigene Operation (E).** Horn, Ohr, Flosse und Hals entstehen heute durch weite Züge aus der Kugel. Genau
   dieser Zug dehnt das Netz, erzwingt den Netzwechsel und springt. FiberMesh, Teddy und Blender machen daraus eine Operation:
   Fuß-Loop wählen, E, Verlauf mit zwei, drei Punkten zeichnen; die Haut entsteht in einem Schritt in der richtigen Dichte, mit
   einem Loop am Fuß und einem über die Spitze. Ehrlich: Das ist Vorschau und dann Ergebnis, nicht live im strengen Sinn.
6. **Startform aus einer Seitenzeichnung** (dein „fühlt sich gut an“ vom 04.11.), als Wahl neben der Kugel. Der gezeichnete
   Umriss wird der Loop der Mittelebene; danach ist er ein Loop wie jeder andere.
7. **Stütz-Loop mit einem Klick: Wölbung als Linie.** Beim Schweben zeigt das Fenster den Loop durch die Stelle unter dem
   Zeiger, Klick setzt ihn, Ziehen längs der Normale macht die Stelle dicker oder dünner. Dazu ein Schalter, der die Haut nach
   dem Abstand zur nächsten Linie färbt: Dort, wo keine Linie nah ist, legt keine Linie die Form fest. Das ist die Antwort der
   Bedienung auf die offene Modellfrage und auf „wenn ich etwas schmaler mache, nehme ich ihm auch die Höhe“.
8. **Mausrad über einem gewählten Loop** macht ihn dicker oder dünner (S um seine Mitte), ohne Tastenwechsel.
9. **Bibliothek als Kurvensätze.** Ein gespeichertes Horn ist ein Satz Loops relativ zu seinem Fuß; Klick setzt ihn, danach
   sind es gewöhnliche Loops. Kein Teil-Objekt, keine Erkennung.

**Linienpflege (jede Verbesserung der Linie verbessert die Haut):**
10. **Kreis und eben** (Loop auf den bestpassenden Kreis bzw. in seine Ebene: Augen, Nüstern, Ringe); **Harmonisieren** (an
    einem glatten Punkt die Grifflängen so setzen, dass die Krümmung stetig durchläuft; aus der Schriftgestaltung);
    **Krümmungskamm** an der gewählten Linie; **Vereinfachen** mit Punktzahl vorher/nachher; **Linie direkt biegen**
    (⌘-Ziehen an einem Stück). Nichts davon läuft von selbst.
11. **Loop auf der Haut gleiten lassen (GG)** und **Parallel-Loop** im festen Abstand (Breite einer Rundung neben einer Kante).
12. **O entlang der Haut** statt im Raum (heute gehen die Gegenlippe oder ein zweites Horn mit).

**Ansichten:**
13. **Blatt auf den Loop legen.** Eine Taste legt ein Blatt genau in die Ebene des gewählten Loops; dort ist er eine unverzerrte
    2D-Form wie ein Illustrator-Pfad. Dazu Hinten und Unten als Umschalter und Greifen im 3D-Blatt (mit ⌥ längs der Normale).

**Dokument:**
14. **Speichern als Kurven, mit Rundreise-Test.** Das Dokument ist Startumriss, Loops und Operationen. Laden baut die Haut
    neu auf. Der Test misst den Abstand zwischen der Haut vor dem Speichern und nach dem Laden. Das ist das direkteste Maß für
    „Kurven sind die Wahrheit“, in einer Zahl, und das härteste Kriterium für jeden Löser. Heute wird er nicht bestehen.
15. **Zwischenablage mit Illustrator.** Einen Pfad kopieren und in ein Blatt einfügen: Er liegt wie mit dem Stift gezeichnet
    auf der Haut. Umgekehrt ein Blatt als SVG kopieren.

**Nicht bauen, obwohl es naheliegt:** Pinsel in der Grundform (zweite Wahrheit neben den Kurven; gehört in die Pose); Regler für
Härte, Wölbung oder Druck; Griffe festhalten; von selbst glätten oder Punkte setzen; eine weitere Verdichtungsregel, solange der
Netzwechsel die Form ändert; das Nachjustieren weich überblenden und für gelöst erklären; ein Panel voller Zahlenfelder
(Zahlen gehören in den Zug).

## 7. Vorschlag für die Reihenfolge

Kleine Schritte in `kurven.html`, je ein Kriterium, du urteilst im Fenster. Vor Schritt 1 einmal messen, was du wirklich siehst:
die ganze Zeit vom Mausereignis bis zum Bild und den Abstand der Bilder im Zug (eine Stunde).

| Schritt | Inhalt | Kriterium | Aufwand |
| --- | --- | --- | --- |
| 1. Anzeige | Griffe wahr oder Faktor fest; Bézier-Pfad im Zug; Punkt, Griff, Linie vor dem Löser zeichnen | beim Loslassen eines Griffs bewegt sich im Blatt nichts | ½ Tag |
| 2. Bremse | Dämpfung je Punkt auch für „gleich“ (Anhang B); neuer Löser übernimmt den Stand des alten | Ohr und Rüssel, 5 200 und 23 400 Punkte: nach vier Runden unter 0,05 Einheiten je Runde | ½ Tag |
| 3. Lösen straffen | drei Spalten ausschreiben, eine Spalte ebenso, Felder wiederverwenden | Runde ≤ 5 ms bei 5 200 Punkten (heute 9) | ½ Tag |
| 4. Durchgehend rechnen | Löser im Bildtakt mit Zeitbudget, weiter beim Halten, Maß für „steht“ | Endrunden beim Loslassen bewegen unter ½ px bei 300 % | 1 Tag |
| 5. Netzwechsel | Verdichten, Zerlegen, Setzen als eine Transaktion im Worker, einmal einwechseln, mit Ausgleich | nach dem Loslassen genau eine Änderung, nicht größer als das Abrunden (Hals 0,3) | 2 Tage |
| 6. Geometrie neu fühlen | `?gewichte=geometrie` mit den Schritten 1–5, ohne das Bündel vom 08.11. | dein Urteil; danach Standard entscheiden | – |
| 7. Verstecktes Gedächtnis | `HALT` skalenfrei; Krümmung nicht quadriert lösen | Kugel mit einem Ring: Korrektur kommt zu über 99 % an, bei 5 000 und 20 000 Punkten | ½ Tag |
| 8. Halbe Haut | nach deiner Entscheidung | gleiche Form, Lösen ≤ 40 % | 2 Tage |

Danach Werkzeuge nach Abschnitt 6 (zuerst 1–4), und je nach deinem Urteil eine Tagesmessung zu A oder B aus Abschnitt 5.

## 8. Entscheidungen für Florian

1. **Soll die bauende Session mit den Schritten 1–5 weitermachen?** (Kein neuer Löser, kein Umbau; fünf kleine Schritte.)
2. **Griffe:** in wahrer Länge wie in Illustrator (kurze Griffe sind dann klein, Zoom hilft), oder Mindestlänge behalten, nur
   ohne Sprung?
3. **Grundform immer symmetrisch?** (Aus der Bilanz, weiter offen.) Dann rechnet der Löser eine Hälfte und ist gut doppelt so
   schnell; Posen dürfen weiter schief sein.
4. **Welche Werkzeuge zuerst?** Mein Vorschlag: Präzision im Zug und verdeckte Linien blass, danach Auswuchs (E).

Nachtrag 10.11.: Frage 1 ist entschieden (die Sitzung der Gegenprüfung baut G1–G4), Frage 2 auch („Die Griffe bleiben in wahrer
Länge wie in Illustrator“). Fragen 3 und 4 sind offen.

## 9. Was diese Prüfung nicht kann

- Sie hat nichts im Fenster gemessen und nichts gesehen. Ob der Griff-Sprung das ist, was du meinst, zeigt ein Blick.
- Die Bausteine (Bremse, Ausgleich, schnelleres Lösen, Rechnen beim Halten) sind einzeln gemessen, nicht zusammen.
- Der Ausgleich ist am Rüssel nicht gut genug und über viele Züge nicht gemessen.
- Rechnen beim Halten behebt den Rest nach dem Zug, nicht das Nachhinken bei schneller, gleichmäßiger Bewegung.
- Vier Prüfer brachen ab; ihre Zahlen ohne **✓** stammen aus je einem Lauf auf einer belegten Maschine. Zeiten sind als
  Verhältnisse zu lesen.
- Andrews, Joshi, Carr 2011 war nur als Abstract zugänglich; die Aussagen dazu stützen sich auf die Dissertation des Erstautors
  und drei Patente derselben Gruppe.
- Die Pose (anderer Löser, Bereich) wurde nur mitgelesen.

## Nachtrag (10.11., nach Florians Rückfrage): `?gewichte=geometrie` als Zielmodell

Florian: „In der anderen Session haben wir `kurven.html?gewichte=geometrie` als bisher elegantesten Weg mit bester Genauigkeit,
aber zu langsam getestet. Zumindest kam es mir am besten vor. Baut deine Aussage auf diesem Modell auf?“

**Antwort.** Der Bericht hat beide Löser gemessen. Die auffälligsten Zahlen (Pendeln, Sprung von 6–35 Einheiten, verstecktes
Gedächtnis) gehören zum Standard ohne Schalter. Für „geometrie“ gilt:
- Florians Eindruck deckt sich mit den Messungen: genaueste Form, kleiner Sprung beim Netzwechsel (Hals 0,4 statt 6,3), kein
  Pendeln (die Bremse ist dort eingebaut), kein verstecktes Gedächtnis (das System wird dort nicht quadriert gelöst).
- Von den acht Schritten aus Abschnitt 7 entfallen Schritt 2 (Bremse), Schritt 7 (`HALT`) und der Ausgleich beim Netzwechsel;
  sie betreffen nur den Standard-Löser. Es bleiben Anzeige, schneller lösen, durchgehend rechnen, Netzwechsel und Zerlegen im
  Hintergrund, halbe Haut.

**Warum „geometrie“ zu langsam ist** (gemessen **✓**, Kern, Ohr-Zug in 30 Mausschritten mit je einer Runde wie im Fenster, ohne
Verfeinern im Zug; `loeser/mess1.ts` mit `GEWICHTE=geometrie`, Ausgabe `ausgaben/loeser-mess1-ohr-geometrie-dichte.out`):

| Punkte | eine Runde | davon Lagen lösen | davon Krümmung verteilen | Rückstand nach dem Zug | Runden bis zur Ruhe | Anlegen beim Greifen |
| --- | --- | --- | --- | --- | --- | --- |
| 5 222 | 12,8 ms | 6,2 ms | 3,8 ms | 1,4 Einheiten | etwa 5 | 0,19 s |
| 10 964 | 32,1 ms | 15,2 ms | 10,7 ms | 3,5 Einheiten | etwa 10 | 0,42 s |
| 23 406 | 72,7 ms | 37,5 ms | 25,2 ms | 19 Einheiten | etwa 30 | 1,1–1,2 s |

Drei Ursachen:
1. **Die Runde ist teuer.** 80–87 % stecken in zwei Schritten, die beide mit dem allgemein geschriebenen Einsetzen rechnen
   (Abschnitt 2.4): das Lösen der Lagen (drei Spalten; ausgeschrieben 3,7-mal schneller **✓**) und das Verteilen der Krümmung
   (je Runde fünf bis sechs Lösungen mit einer Spalte durch dieselbe Funktion; geschätzt zwei- bis dreimal schneller, nicht
   gemessen). Gerechnet werden aus 12,8 / 32 / 73 ms etwa 6 / 15 / 32 ms.
2. **Auf dichten Netzen braucht der Löser viel mehr Runden.** Der Rückstand nach demselben Zug wächst von 1,4 auf 19 Einheiten,
   die Zahl der Runden bis zur Ruhe von 5 auf 30. Die Bremse je Punkt muss dort stärker greifen. Das ist dieselbe Wurzel wie
   beim Pendeln des Standard-Lösers (2.3): Die Krümmung an den Linien wird an der Haut gemessen, und das wirkt umso stärker
   zurück, je feiner das Netz ist. Schneller rechnen allein behebt das bei 20 000 und mehr Punkten nicht.
3. **Nach jedem Zug wird neu zerlegt, im Hauptthread.** Nach der Geometrie hängt die Matrix an der Form (`ausKurven.ts:254–258`);
   30 ms nach dem Loslassen baut das Fenster den Löser neu (`kurven.ts:1448–1456`, gelesen). Es steht dann 0,2 s bei 5 200 und
   über 1 s bei 23 400 Punkten. Dazu kommen die Halte von 35–52 ms beim Verfeinern im Zug (Planseite Abschnitt 10).

**Reihenfolge, wenn „geometrie“ der Weg ist** (ersetzt die Tabelle in Abschnitt 7):

| Schritt | Inhalt | Kriterium |
| --- | --- | --- |
| G1 | Einsetzen für drei Spalten und für eine Spalte ausschreiben, Felder wiederverwenden (nur Kern, `loeser/zerlegung.ts`) | gleiche Lösung (Unterschied ≤ 1e-9); Runde „geometrie“ ≤ 7 ms bei 5 200 und ≤ 16 ms bei 11 000 Punkten |
| G2 | Anzeige: Griffe, Bézier-Pfad im Zug, Kurve vor der Rechnung | beim Loslassen eines Griffs bewegt sich im Blatt nichts |
| G3 | durchgehend rechnen, auch beim Halten, mit einem Maß für „steht“ | Endrunden beim Loslassen bewegen unter ½ px bei 300 % |
| G4 | Zerlegen, Verdichten und Zeilenaufbau im Worker, einmal einwechseln (bei „geometrie“ nach jedem Zug) | kein Halt über 16 ms im Zug und nach dem Loslassen |
| G5 | Netz nicht dichter als nötig: prüfen, warum es auf 20 000 und mehr Punkte wächst; Obergrenze oder Weg B aus Abschnitt 5 | Florians Wesen bleiben unter etwa 10 000 Punkten, oder die Anzeige ist feiner als das Rechennetz |
| G6 | halbe Haut (nach Florians Entscheidung) | gleiche Form, Runde etwa halbiert |

- Das Spiel zeigt höchstens 8 000 Dreiecke, also rund 4 000 Punkte. Ein Rechennetz mit 23 000 Punkten ist sechsmal feiner,
  kostet nach der Tabelle das Sechsfache je Runde und braucht das Sechsfache an Runden.
- Ursache 2 zeigt: Auch bei „geometrie“ setzt die Rückkopplung an den Linien die Grenze. Weg C aus Abschnitt 5 (Krümmung an
  den Linien mitgelöst, ohne Bremse) zielt genau darauf. Er sollte nach G1–G4 seine Tagesmessung bekommen, und zwar auf einem
  dichten Netz.
- Nicht gemessen: das Fenster (dort wird im Zug verfeinert, und jeder neue Löser beginnt ohne den Stand der Bremse), Rüssel und
  Hörner bei „geometrie“ auf dichten Netzen, die Runde nach G1.

**Stand (10.11. mittags): G1 und G2 gebaut** (Florian: „dann kannst du es machen“; die Übergabe der bauenden Sitzung steht in
`docs/UEBERGABE.md`).

| Schritt | Gemessen | Kriterium |
| --- | --- | --- |
| G1 (`6eae3883`) | Lösen mit drei Spalten 6,0 → 1,7 ms (5 200 Punkte), 15,2 → 4,0 ms (11 000). Runde „geometrie“ 12,8 → 7,7 / 32 → 15,5 / 73 → 32 ms bei 5 200 / 11 000 / 23 400 Punkten. Ergebnis bitgleich (Test; die Bewegungen je Runde nach dem Zug sind Ziffer für Ziffer dieselben). | bei 11 000 Punkten erfüllt (≤ 16 ms); bei 5 200 knapp nicht (7,7 statt ≤ 7 ms, Maschine belegt) |
| G2 (`0f80f0e2`) | Im Fenster mit der Maus (`form-griff-loslassen.mjs`): Griffspitze unter der Maus 0,00 px; Sprung der Spitze beim Loslassen 0,00 px (mit der Mindestlänge von vorher 42,5 px); Linie im Zug gegen die Linie danach 0,00 px, am Griff und am Punkt. | erfüllt; Florians Entscheidung zur Grifflänge steht aus |

- Der Rückstand auf dichten Netzen (Ursache 2 oben) ist durch G1 nicht kleiner geworden, nur jede Runde billiger. Er ist Sache von
  G3 und G5.
- Der Server auf 5193 gehört jetzt dieser Sitzung (gleiche Adresse).

**Stand (10.11. nachmittags): G3 gebaut** (Florian: „Die Griffe bleiben in wahrer Länge wie in Illustrator. Mach weiter mit
G3.“; Commits `44a0fb8d`, `ab3a8d95`).

Gebaut (`apps/editor/src/form/kurven.ts`):
- **Griffe:** Die wahre Länge gilt. Der Streckfaktor und der Vergleichsschalter `?griffe=mindest` sind entfernt.
- **Rechnen im Bildtakt.** Über die ganze Haut setzt eine Mausbewegung nur noch die Ziele und zeichnet die Kurven (`zugBewegen`).
  Gerechnet wird einmal je Bild (`zugRechnen` in der Bildschleife): mindestens eine Runde, weitere, solange sie in 12 ms passen.
  Das läuft auch, wenn die Maus ruht, bis die Form steht. Die Statuszeile zeigt so lange „(rechnet)“.
- **Maß für „steht“:** In einer Runde bewegt sich kein Punkt mehr als 0,05 Einheiten längs der Flächennormalen (0,14 px bei
  300 %); spätestens nach 60 Runden ohne Mausbewegung ist Schluss. Gemessen wird die Form, nicht die ganze Bewegung der Punkte
  (Befund 2).
- **Loslassen:** Runden am Ende gibt es nur noch, wenn die Haut nicht steht (höchstens vier, wie bisher).
- **Setzen nach dem Loslassen:** rechnet, bis die Form steht (höchstens zwölf Runden), statt genau vier Runden (`?setzen=4` zum
  Vergleich; Befund 1).
- Nach dem Neuaufsetzen und nach dem Einwechseln im Zug gelten sofort die Pfade als Ziele (`zieleVonJetzt`). Sonst hielte der
  Löser, der jetzt weiterrechnet, die Linien bis zur nächsten Mausbewegung auf den Sehnen des alten Netzes.
- Unverändert: wann im Zug verfeinert wird (nach einer Mausbewegung), der Löser mit Bereich (Pose, `?haut=gedaechtnis`), der Kern.

Gemessen im Fenster mit der Maus und echter Grafikkarte (`form-loslassen-probe.mjs` mit `GPU=1 PAUSE=16 HALTEN=…`, Ohr). Der Stand
vor G3 lief zum Vergleich als zweite Seite auf demselben Server. „Ende gegen vorher“ = wie weit die Haut am Ende von der Haut vor
dem Loslassen liegt: größter Abstand / 99 % der Punkte / Zahl der Punkte über 1 Einheit. Stufen = sichtbare Änderungen ab dem
Loslassen (das Loslassen mitgezählt). Vor G3 je ein Lauf, mit G3 zwei bis drei, bei 23 400 Punkten sechs (Fenster-Proben streuen).

| Punkte, vor dem Loslassen gehalten | vor G3: Ruck beim Loslassen | vor G3: Ende gegen vorher | mit G3: Ruck | mit G3: Ende gegen vorher |
| --- | --- | --- | --- | --- |
| 5 200, 0,6–1,5 s | 1,06 | 1,7 / 1,2 / 150 | 0,00 | 1,2–1,3 / 0,30–0,35 / 2 |
| 11 000, 0,6–1,5 s | 0,85 | 0,8 / 0,6 / 0 | 0,00 | 0,3–0,5 / 0,02–0,04 / 0 |
| 23 400, 2–2,5 s | 11,4 | 15,0 / 8,7 / 9 862, in fünf Stufen über 6 s | 0,00 | 0,7–5,6 / 0,25–0,7 / 0–92, in zwei bis fünf Stufen |

- **Kriterium** (Runden am Ende unter ½ px bei 300 % = 0,18 Einheiten): erfüllt, wenn die Maus vor dem Loslassen kurz ruht
  (0,00 in allen Läufen). Bei 5 200 und 11 000 Punkten steht die Haut nach vier bis acht Runden (0,1 bis 0,2 s).
- **Schnell ziehen und halten** (drei Mausschritte in 0,2 s, dann 2 s halten; 5 200 Punkte): Vor G3 lag die Haut bis zum
  Loslassen 39 Einheiten neben der Form des langsamen Zugs (99 % der Punkte: 34). Mit G3 kommt sie beim Halten an: 1,4
  (99 %: 0,6); zwei langsame Läufe unterscheiden sich um 0,4 (99 %: 0,2). Die Form hängt damit nicht mehr an der
  Geschwindigkeit des Zugs (Hinweis der bauenden Sitzung, Übergabe Abschnitt 6).
- **Rest zur Ruhe**, wenn der Löser aufhört (Form nach 40–60 weiteren Runden): 0,06 bei 5 200, 0,05 bei 11 000 Punkten. Bei
  23 400 Punkten 0,07–0,8 für 99 % der Punkte (vier Läufe); in drei davon wandern an einer Stelle des Netzes 8 bis 146 Punkte
  um 3 bis 10 Einheiten weiter (Befund 4).
- **Griff ziehen** (`form-griff-loslassen.mjs`): Runden am Ende 0,52 → 0,00 Einheiten; Spitze und Linie wie nach G2 (0,00 px).
- **Nicht erfüllt, und von G3 nicht zu erwarten:** schneller Zug mit sofortigem Loslassen. Dort holt weiter das Loslassen nach
  (Ende gegen vorher bei 5 200 Punkten 2,9 vor wie nach G3, bei 11 000 Punkten 3,3 → 2,7, bei 23 400 Punkten 10,4 → 3,1; dort
  bekommt der Löser im Zug der Probe mehr Runden als vorher).
- **Was beim Loslassen nach dem Halten bleibt**, kommt vom Verdichten und vom Setzen danach: bei 5 200 Punkten 0,8 + 0,5
  Einheiten an zwei Punkten neben der Linie am Ohransatz (99 % der Punkte unter 0,4), bei 23 400 Punkten ein bis vier Stufen an
  der Stelle aus Befund 4. Das ist G4.
- Florians Hörner mit Griffspiel (`form-drei-faelle.mjs`, ohne Halten): Im verknoteten Zustand (Griff um 120° gedreht, die Linie
  kehrt um) schwankt der Rauminhalt nach dem Loslassen in Stufen: vor G3 um 6 und 46 % (zwei Läufe), mit G3 um 15, 24 und 25 %
  (drei Läufe). Die Läufe streuen stärker als der Unterschied. Mit 1,2 s Halten vor jedem Loslassen endet derselbe Zug bei 2,6
  Einheiten neben dem Stand vor dem Loslassen, ohne Halten bei 5 bis 66. „Hin und zurück“ und zwei weite Züge (`form-hin-zurueck.mjs`, `form-explosion-probe.mjs` a, e) geben vor
  und nach G3 dasselbe.

**Vier Befunde aus dem Messen** (Kern: `loeser/mess7.ts`, `mess8.ts`; Fenster: `form-anlauf-probe.mjs`,
`netz/m7-unruhige-stelle.mjs`; Ausgaben unter `ausgaben/g3-fenster-*`, `loeser-mess7.out`, `loeser-mess8.out`, `m7-…`):

1. **Auf einem geänderten Netz schwingt ein neuer Löser über (Anlauf).** Seine Bremse je Punkt (`beta`) beginnt bei 1 und findet
   erst nach vier bis fünf Runden ihren Wert. Solange schwingt die ganze Haut. Gemessen an der Kugel, in die gerade drei Loops
   eingesetzt wurden und an der sich sonst nichts ändert (Form je Runde, größter Punkt):

   | Punkte | Runde 1 | 2 | 3 | 4 | 5 | 6 | nach 10 Runden netto |
   | --- | --- | --- | --- | --- | --- | --- | --- |
   | 5 222 | 3,9 | 7,9 | 2,9 | 1,05 | 0,10 | 0,02 | 0,12 |
   | 10 964 | 3,3 | 8,2 | 4,6 | 0,33 | 0,04 | 0,03 | 0,04 |
   | 23 406 | 1,6 | 5,1 | 5,2 | 1,15 | 0,43 | 0,06 | 0,07 |

   - In Runde 1 bewegen sich 4 076 von 5 222 Punkten um mehr als ½ px bei 300 %, mitten in den Feldern zwischen den Linien. Die
     Haut kommt fast genau dorthin zurück, wo sie war: Der Ausschlag ist dreißig- bis sechzigmal so groß wie das, was zu
     korrigieren war.
   - **Gegenprobe:** Ein neuer Löser auf einer Haut, die steht, und auf demselben Netz bewegt nichts (0,01–0,06 Einheiten bei
     5 200 bis 23 400 Punkten, dreimal nacheinander; `mess8.ts`). Der Anlauf kommt also vom geänderten Netz, nicht vom neuen
     Löser allein. Vermutung, nicht gemessen: Es sind die neuen Punkte auf den Linien; an ihnen wird die Krümmung gemessen, die
     sich in die Felder verteilt.
   - **Das Setzen nach dem Loslassen** ist genau dieser Fall: neues Netz, neuer Löser. Es rechnete vier Runden und zeigte dann den
     Stand, mitten im Anlauf; nach dem Nachverfeinern noch bis zu dreimal. Das passt zum „Aufblasen in Stufen“ vom 08.11. Seit G3
     rechnet es, bis die Form steht. Die Wirkung ist klein und nicht sicher: Bei 23 400 Punkten waren die Stufen mit vier Runden
     3,2 / 1,8 / 1,2 Einheiten, mit der neuen Fassung 2,0 / 0,16 / 0,07 und in einem weiteren Lauf 3,0 / 1,5 / 0,16; bei 5 200
     Punkten kein Unterschied. Der Anlauf bleibt, solange das Setzen sichtbar rechnet (G4).
   - **Das erste Greifen nach einem neuen Loop** zeigt den Anlauf im Fenster: fern vom Griff je Bild 5,3 / 7,0 / 4,7 / 0,9
     Einheiten, am Ende liegt die Haut dort 5 Einheiten neben der Kugel (dass der erste Zug die Kugel umformt, ist seit dem
     07.11. bekannt). Beim zweiten Greifen bewegt sich fern vom Griff nur, was den Linien folgt.
   - Übergabe Falle 10 kannte das Zurücksetzen der Bremse. Neu sind die Größe, die Gegenprobe und der Zusammenhang mit den Stufen
     nach dem Loslassen.
2. **Die Punkte gleiten längs der Fläche weiter, die Form steht.** Nach einem Zug bewegen sich die Punkte bei 23 400 Punkten je
   Runde um 0,04 Einheiten, 400 Runden lang gleich (16 Einheiten); an der ruhenden Kugel um 0,006. Das liegt fast ganz längs
   der Fläche. Die Form (Bewegung längs der Normalen) steht nach etwa 25 Runden; danach ändert sie sich in 25 bis 200 Runden um
   0,06 bis 0,17 Einheiten. Das Auge sieht vom Gleiten nichts, aber:
   - Ein Maß für „steht“ über die ganze Bewegung wird auf dichten Netzen nie erfüllt. Deshalb misst G3 die Form.
   - Gleitende Punkte strecken und stauchen Dreiecke. Das kann zum Wachsen des Netzes beitragen (nicht gemessen; Thema von G5).
   - In der Tabelle oben („Rückstand 19 Einheiten, etwa 30 Runden bis zur Ruhe“) ist die „größte Bewegung je Runde“ ab Runde 30
     dieses Gleiten, kein Rest des Zugs.
3. **Die Haut steht wirklich, die Bremse hält sie nicht nur fest.** Befürchtung beim Messen: Die Bremse je Punkt könnte den
   Löser anhalten, bevor er am Ziel ist. Gegenprobe wie in Befund 1: Ein neuer Löser (Bremse wieder bei 1) auf dem Ruhestand
   bewegt die Form um höchstens 0,06 Einheiten. Im Ruhestand steht die Bremse bei der Hälfte der Punkte über 0,5, nur 8 bis 54
   Punkte sind am Boden (0,02).
4. **Auf dem dichten Prüfnetz bleibt eine Stelle unruhig, und das kommt vom Zusammenlegen.** Bei 23 400 Punkten hat schon das
   Startnetz 1 442 Kanten unter der halben mittleren Länge (kürzeste 0,25 bei im Mittel 3,9). Der erste Netzwechsel im Zug legt
   sie zusammen, auch weit weg vom Zug. Bei (−115, 48, ±93) bleiben Punkte mit drei und vier Nachbarn, ein Winkel von 0,1 bis
   0,5° und in einem Lauf ein umgeklapptes Dreieck. Dort springt die Haut je Runde um ±0,2 Einheiten zwischen zwei
   Nachbarpunkten, die Stelle wandert in 30 Runden um 0,5 bis 1,8 Einheiten, und nach dem Loslassen bewegt jedes Setzen sie um 1
   bis 5.
   - Ohne Verfeinern im Zug (`&live=0`) gibt es die Stelle nicht (Rest zur Ruhe 0,17 Einheiten überall).
   - Ohne Zusammenlegen (`&kurz=0`) wächst das Netz im selben Zug auf 35 700 Punkte, und die Haut fällt ein (40 bis 68
     Einheiten). Das Zusammenlegen ist also nötig, es arbeitet auf dichten Netzen nur zu grob.
   - Das Prüfnetz mit 23 400 Punkten ist erzeugt; Florians dichte Wesen sind durch Verfeinern gewachsen. Ob sie solche Stellen
     haben, ist nicht gemessen. Für G5 heißt das: zuerst die Güte des Netzes ansehen (kurze Kanten, Punkte mit drei oder vier
     Nachbarn, spitze Dreiecke), dann die Zahl der Punkte.

**Was das für G4 heißt.** G4 war als „Zerlegen, Verdichten und Zeilenaufbau im Worker, einmal einwechseln“ beschrieben. Nach den
Befunden ist der Kern von G4 der Ablauf nach dem Loslassen, der Worker ist das Mittel:
1. **Nachlauf im Bildtakt.** Lässt man los, bevor die Haut steht, rechnet derselbe Löser im Bildtakt weiter, bis sie steht
   (heute: höchstens vier Runden auf einmal, der Rest bleibt liegen bis zum nächsten Greifen).
2. **Setzen verdeckt.** Verdichten, Zerlegen und Setzen laufen danach im Hintergrund, bis die neue Haut steht. Gezeigt wird nur
   das Ergebnis, einmal. Der Anlauf des neuen Lösers ist dann nicht zu sehen. Greift man vorher wieder zu, verfällt der Auftrag.
3. **Dasselbe nach jeder anderen Änderung** (Loop schneiden, Punkt setzen, Kante): Die Haut steht, bevor man das nächste Mal
   greift. Das erste Greifen formt dann nichts mehr um.
4. Den Stand der Bremse an den neuen Löser weiterzugeben (Vorschlag der bauenden Sitzung) ist nach der Gegenprobe in Befund 1
   nicht der Hebel: Auf demselben Netz stört ein neuer Löser nicht, und auf einem neuen Netz kommt der Anlauf von den neuen
   Punkten. Erst messen, ob es nach Schritt 2 noch etwas bringt.

**Stand (10.11. nachmittags, danach): G4.1 gebaut — Verfeinern im Zug ganz im Hintergrund** (Florian: „gleich zu G4. Es gefällt
mir schon besser … aber aktuell ruckt es während dem Ziehen noch spürbar. Wird das noch besser werden in dieser Runde?“;
Commit `cf46b548`).

**Woher das Rucken im Zug kam** (im Fenster gemessen, Ohr, echte Grafikkarte; `form-loslassen-probe.mjs`, Zeile „Bilder im Zug“;
Ausgaben `ausgaben/g4-fenster-ruckeln.txt`):
- **Halte beim Verfeinern.** Drei- bis viermal je Zug hielt das Auslösen des Verfeinerns den Zug an: 40–90 ms bei 5 200 Punkten,
  rund 100 ms bei 11 000, 180–290 ms bei 23 400. Im Hauptthread liefen dabei: den Zug neu aufsetzen, verdichten, die neuen Punkte
  einbetten, die Zeilen der Matrix bauen. Nur die Zerlegung lief im Hintergrund.
- **Die Runde selbst auf sehr dichten Netzen.** Bei 5 200 und 11 000 Punkten kommt jedes Bild in 16 ms (60 Bilder je Sekunde).
  Bei 23 400 Punkten kostet die Löserrunde 29–33 ms je Bild; mehr als 30 Bilder je Sekunde gehen dort nicht.

Gebaut:
- Der ganze Auftrag läuft im Worker (`apps/editor/src/form/verfeinern.ts`, `verfeinern.worker.ts`): verdichten, einbetten,
  Zeilen bauen, zerlegen. Die Haut geht flach hin und zurück, die großen Felder ohne Kopie. Ein Fehler kommt als Meldung
  zurück, der Zug läuft weiter.
- Beim Auslösen wird der Zug nicht mehr neu aufgesetzt. Die Loops gehen als festgelegte Kopie in den Auftrag, der Löser des Zugs
  rechnet ohne Neuanfang weiter.
- Eingewechselt wird im nächsten Bild an Stelle der Löserrunde.

| Punkte | vorher: Bilder über 33 / 50 / 100 ms, längster Abstand | jetzt | Auslösen im Hauptthread | Einwechseln |
| --- | --- | --- | --- | --- |
| 5 200 | 5 / 4 / 0, 87 ms | 1 / 0 / 0, 46 ms | 38–67 → 1–3 ms | 10 ms |
| 11 000 | 5 / 4 / 3, 130 ms | 2 / 1 / 0, 54 ms | 92–112 → 1–5 ms | 28 ms |
| 23 400 | 89 / 22 / 5, 469 ms (Mitte 46 ms) | 42 / 3 / 1, 106 ms (Mitte 33 ms) | 184–292 → 2–4 ms | 59 ms |

- Kriterium von G4 („kein Halt über 16 ms im Zug“): beim Auslösen erfüllt; beim Einwechseln bei 5 200 Punkten erfüllt, bei
  11 000 und 23 400 nicht (28 und 59 ms, zweimal je Zug). Davon kostet der neue Löser für das feinere Netz 21 bzw. 46 ms
  (im Kern allein 16 bzw. 29 ms, `loeser/mess9.ts`).
- Ein neuer Löser mitten im Zug rechnet seine erste Runde kaum länger als der alte (43 statt 29 ms bei 23 400 Punkten, sechs
  statt vier Schritte beim Verteilen der Krümmung). Den Startwert weiterzugeben lohnt dafür nicht.
- Die Form: „Hin und zurück“ und zwei weite Züge geben dasselbe wie vor G4.1 (`form-hin-zurueck.mjs`, `form-explosion-probe.mjs`
  a, e). Test `verfeinern.test.ts`: Der Auftrag rechnet Feld für Feld dasselbe wie die Schritte einzeln.
- **Bleibt für sehr dichte Wesen:** die Runde selbst (G5: Netz nicht dichter als nötig; G6: halbe Haut).

**Weiter in G4** (Stand G4.1; G4.2 und G4.3 stehen gleich darunter): G4.2 Nachlauf im Bildtakt nach dem Loslassen, G4.3 Setzen
verdeckt und einmal einwechseln, G4.4 dasselbe nach Loop, Punkt und Kante.

**Stand (10.11. abends): G4.2 und G4.3 gebaut — nach dem Loslassen** (Florian: „Ja, mach weiter mit G4.2 und G4.3: Nachlauf im
Bildtakt nach dem Loslassen, dann Verdichten und Setzen verdeckt im Hintergrund und einmal einwechseln.“; Commits `d695c2b5`,
`97ad1457`). Gilt für `?gewichte=geometrie` in der Grundform; Pose, `?haut=gedaechtnis` und gleiche Gewichte laufen wie bisher.

**Was vorher nach dem Loslassen geschah** (im Fenster gemessen, Ohr, schneller Zug, sofort losgelassen, echte Grafikkarte;
`form-loslassen-probe.mjs` mit `&nachlauf=0`; Ausgaben `ausgaben/g4-fenster-loslassen.txt`):
1. Beim Loslassen rechnete das Fenster höchstens vier Runden auf einmal und verdichtete das Netz. Das hielt 58 / 115 / 274 ms an
   (5 200 / 11 000 / 23 400 Punkte), und die Haut sprang dabei um 0,7 bis 1,7 Einheiten.
2. 30 ms später zerlegte es das neue Netz und setzte die Haut, dann verfeinerte es bis zu dreimal nach, jedes Mal mit Zerlegen
   und Setzen. Alles im Hauptthread: Das Fenster stand zusammen 0,5 / 0,8 / 3,7 s still (längster Halt 0,18 / 0,45 / 1,4 s).
3. Jede Stufe war zu sehen: nach dem Sprung noch ein bis zwei Netzwechsel.

**Gebaut:**
- **Nachlauf (G4.2).** Steht die Haut beim Loslassen noch nicht, rechnet der Löser des Zugs im Bildtakt weiter, bis die Form
  steht (`kurven.ts`, `nachlaufRechnen`). Beim Loslassen selbst bewegt sich nichts mehr.
- **Aufräumen im Hintergrund (G4.3).** Danach geht ein Auftrag an den Worker (`verfeinern.ts`, `aufraeumen`): verdichten,
  zerlegen, setzen bis zur Ruhe, bis zu dreimal nachverfeinern. Das Fenster zeigt so lange die Haut, wie sie ist, und wechselt
  einmal ein (`aufgeraeumtAnwenden`). In der Statuszeile steht so lange „verfeinert im Hintergrund“.
- **Die Zerlegung kommt mit.** Das nächste Greifen zerlegt nicht mehr. Greift man, bevor der Auftrag fertig ist, verfällt er,
  und der Zug nimmt die Zerlegung des letzten Zugs. Dafür prüft der Kern jetzt selbst, ob eine angebotene Zerlegung zur
  Struktur passt (Netz, Bindungen der Linien, Kanten, Quellen der Krümmung; `ausKurven.ts`, `strukturSchluessel`). Passt sie
  nicht, zerlegt er selbst.
- **Der Stand entscheidet.** Ändert inzwischen jemand etwas (Rückgängig, Kante, neuer Loop, neuer Zug), enden Nachlauf und
  Auftrag ohne Wirkung. Geprüft wird am Stand selbst (Netz, Lagen, Loops als Streuwert), nicht an jeder Stelle, die ihn
  ändern kann.
- **Fehler.** Meldet der Auftrag einen Fehler, räumt das Fenster diesen Zug selbst auf wie früher. Fällt der Worker ganz aus,
  läuft bis zum Neuladen alles im Fenster (wie mit `?hintergrund=0`).
- Schalter `?nachlauf=0`: der Ablauf von vorher, zum Vergleichen.

**Gemessen** (schneller Zug, sofort losgelassen; vorher → jetzt; Spannen aus zwei bis drei Läufen):

| | 5 200 Punkte | 11 000 Punkte | 23 400 Punkte |
| --- | --- | --- | --- |
| Sprung beim Loslassen (Einheiten) | 1,1–1,7 → 0,00 | 0,7–0,9 → 0,00 | 0,9 → 0,00 |
| das Loslassen selbst hält an | 58 → 3 ms | 115 → 5 ms | 274 → 6 ms |
| längster Abstand zwischen zwei Bildern danach | 183 → 21 ms | 453 → 25 ms | 1 437 → 31 ms |
| Stillstand zusammen (Bilder über 50 ms) | 0,5 s → keiner | 0,8 s → keiner | 3,7 s → keiner |
| sichtbare Netzwechsel nach dem Loslassen | 2 → 1 | 1 → 1 | 2 → 1 |
| das Einwechseln kommt nach | 0,7–0,9 s | 1,4–2,0 s | 3,2–6,1 s |
| es ändert die Haut um (größte Stelle / 99 % der Punkte unter) | 3,1 / 2,1 | 1,2 / 0,5 | 0,7 / 0,3 |
| Endstand gegen den Stand beim Loslassen | 3,1–3,7 → 3,4–3,6 | 1,3 → 1,4–1,7 | 1,2 → 1,2–1,3 |

- **Langsamer Zug mit Halten** (ein Mausschritt je Bild, 0,6 bis 2 s gehalten): Das Einwechseln kommt nach 0,2–0,6 / 1,0–1,1 /
  1,4–2,5 s und ändert 99 % der Punkte um weniger als 0,32 / 0,25 / 0,25 Einheiten (größte Stelle 1,3 / 0,7 / 0,4). Das Netz
  ist dann schon im Zug verfeinert (G4.1), es bleibt wenig nachzuholen.
- **Gleich wieder greifen** (400 ms nach dem Loslassen, 23 400 Punkte): Das Drücken hielt 1,0 s an (Zerlegen), jetzt 23–25 ms.
  Bei 5 200 Punkten war es schon vorher schnell (13–27 ms).
- **Gegenprobe ohne Verdichten** (`&verdichten=0&live=0`): Nach dem Nachlauf liegt die Haut höchstens 0,2 Einheiten neben der
  Ruhe. Was das Einwechseln noch ändert, kommt also vom feineren Netz selbst, nicht von einem Rest des Lösers.
- **Kriterium von G4** („kein Halt über 16 ms nach dem Loslassen“): bei 5 200 und 11 000 Punkten erfüllt bis auf das eine Bild
  des Einwechselns (21–25 ms, das Mitlesen der Probe eingerechnet). Bei 23 400 Punkten kostet jede Runde im Nachlauf 29–31 ms
  (rund 30 Bilder je Sekunde, bis die Haut steht). Das ist die Runde selbst, also G5 und G6.

**Geprüft, dass nichts den Stand anfasst, der nicht mehr gilt** (`form-nachlauf-probe.mjs`, 18 Prüfungen, bei 5 200 und 11 000
Punkten alle gut; Ausgabe `ausgaben/g4-fenster-nachlauf-probe.txt`): ⌘Z im Nachlauf und während der Hintergrund rechnet (der Stand
vor dem Zug ist Bit für Bit wieder da und bleibt), ⌘Z nach dem Einwechseln, gleich wieder greifen und weiterziehen, Kante und
neuer Loop während der Hintergrund rechnet (der Auftrag verfällt, zweimal ⌘Z führt genau zum Anfang zurück), ein Fehler im
Auftrag, ein Ausfall des Workers. Dazu „hin und zurück“, die Griff-Probe und zwei weite Züge wie vorher.
Tests: `ausKurvenVorlage.test.ts` (eine Zerlegung wird bei gleicher Struktur Bit für Bit übernommen, sonst zerlegt der Löser
selbst), `verfeinern.test.ts` (der Auftrag rechnet dasselbe wie der Ablauf im Fenster nacheinander).

**Ehrlich offen nach G4.2/G4.3:**
1. **Das Einwechseln kommt auf dichten Netzen spät** (3 bis 6 s bei 23 400 Punkten). Jeder Durchgang zerlegt das Netz neu; vom
   Auftrag sind 1,9 bis 4,4 s Zerlegen. Greift man vorher wieder, verfällt der Auftrag; verfeinert wird dann im nächsten Zug
   (G4.1) und nach dem nächsten Loslassen mit Pause.
2. **Das Einwechseln ändert die Form einmal sichtbar.** Nach schnellen Zügen bis 3 Einheiten bei 5 200 Punkten (8 px bei 300 %),
   0,7 bis 1,2 bei 11 000 bis 23 400 (2 bis 3 px); nach langsamen Zügen fast überall unter ¼ Einheit. Es ist dieselbe Änderung
   wie vorher in Stufen: Das feinere Netz hat eine etwas andere Ruheform. Die Ursache gehört zu G5 (Form unabhängig vom Netz).
   Mildern ließe sie sich, indem das Fenster beim Einwechseln über rund 0,15 s weich überblendet statt umzuspringen (nicht
   gebaut, Florians Entscheidung).
3. **Alles andere läuft noch im Hauptthread:** nach Loop, Punkt, Kante, Löschen und Rückgängig. Gemessen: Kante an hält 0,2 s
   (5 200 Punkte) bzw. 0,5 s (11 000) an; das Vorrechnen der Zerlegung in der Ruhe 0,1 bis 1 s. Das ist G4.4.
4. Wird zwischen Loslassen und Einwechseln ein Loop geschnitten oder ein Punkt gesetzt, verfällt das Aufräumen dieses Zugs;
   nachgeholt wird es nach dem nächsten Zug. (Kante und Löschen verdichten selbst, wie bisher.)
5. Greift man vor dem Einwechseln wieder, rechnet der neue Zug mit der Zerlegung des letzten (ihre Gewichte gehören zur Form
   beim letzten Greifen). Die beiden Züge verhalten sich dann wie ein langer.

**Zwei Fallen beim Messen** (für spätere Proben): Wer gleich nach dem Loslassen große Stände aus dem Fenster abholt, hält es
selbst an (bei 23 400 Punkten rund 60 ms; stand zuerst als „längster Abstand 93 ms“ in der Messung). Und nach einem Netzwechsel
sagt der Vergleich Punkt für Punkt nichts: Die Punkte sind neu nummeriert (die Probe meldete „bewegt um 321“; die Form war
dieselbe).

**Stand (10.11. spätabends): G4.4 gebaut — nach Loop, Punkt, Kante, Löschen, Rückgängig** (Florian: „dann mach wie du
empfiehlst“; Commits `9e755156`, `124e32a3`). Gilt wie G4.2/G4.3 für `?gewichte=geometrie` in der Grundform.

**Was vorher geschah** (im Fenster gemessen mit `form-aendern-probe.mjs`, echte Grafikkarte; Stillstand = Summe der Abstände
über 50 ms zwischen zwei Bildern ab dem Auslösen; Ausgaben `ausgaben/g44-fenster-aendern.txt`):

| Schritt | 5 200 Punkte | 11 000 Punkte | 23 400 Punkte |
| --- | --- | --- | --- |
| Loop schneiden | 0,12–0,20 s | 0,41–0,80 s | 1,1–1,3 s |
| Kante an | 0,37 s | 0,92 s | 2,5 s |
| Kante aus | 0,49 s | 1,4 s | 6,2 s (fünf Halte) |
| Punkt setzen (Doppelklick) | 0,09 s | 0,28 s | 1,0 s |
| Punkt löschen | 0,17 s | 0,55 s | 1,6 s |
| Rückgängig | 0,11 s | 0,31 s | 1,05 s |

- **Woher:** Nach jeder Änderung rechnete das Fenster 30 ms später die Zerlegung für das nächste Greifen (0,1 / 0,3 / 1 s).
  Kante und Löschen rechneten davor die ganze Haut neu (zerlegen, zwölf Runden, verdichten) und setzten sie danach in Stufen.
- **Der erste Griff nach neuen Loops:** Nach dem Schneiden setzte sich die Haut nicht; das tat erst der Löser des ersten Zugs,
  sichtbar. Fern vom Griff (untere Hälfte, während oben 6 Einheiten gezogen werden) schlug die Haut je Bild aus: 5,3 / 7,0 / 4,7
  Einheiten bei 5 200 Punkten, 11,0 / 11,6 / 2,1 bei 11 000, 21,8 / 25,9 / 8,8 bei 23 400. Danach blieb dort eine Änderung von
  2 Einheiten (Mittel 0,8). Der zweite Griff war ruhig (höchstens 0,12 je Bild, es bleibt 0,09).

**Gebaut:**
- **Was für den Stand offen ist, gehört zum Stand** (`kurven.ts`, `ruheOffen`: setzen, nur in Ruhe, verdichten). 30 ms nach
  einer Änderung geht es an den Hintergrund (`ruheImHintergrund`). Verfällt ein Auftrag, weil sich der Stand geändert hat,
  beginnt einer für den neuen Stand. Rückgängig bringt mit zurück, was für den alten Stand offen war.
- **Auftrag mit Vorstufe** (`verfeinern.ts`): zerlegen und setzen, bis die Form steht (höchstens 60 Runden), und die gesetzte
  Haut samt Zerlegung als Zwischenstand melden; danach aufräumen wie nach dem Loslassen. Das Fenster zeigt erst die gesetzte
  Haut (`zwischenAnwenden`: dasselbe Netz, neue Lagen), dann die aufgeräumte.
- **Kante an oder aus, Löschen** (`hautNeuRechnen`): als Auftrag mit Vorstufe statt im Fenster. Die Linien zeigen die Änderung
  sofort, die Haut folgt.
- **Neuer Loop** (L, F, Stift): Die Haut setzt sich im Hintergrund, sobald sich Loops kreuzen, und nur, wenn sie dabei zur Ruhe
  kommt; danach wird nicht aufgeräumt (das tut wie bisher der erste Zug). Schalter `?loopsetzen=0`: wie vorher.
- **Sonst** (Punkt gesetzt, Rückgängig): nur die Zerlegung für das nächste Greifen, im Hintergrund.
- **Der Griff wartet** (`griffWartet`, `griffNachholen`): Wer greift, während der Hintergrund für genau diesen Stand noch die
  Haut setzt oder zerlegt, bekäme einen Löser ohne Zerlegung auf einer Haut, die nicht steht. Der Griff beginnt deshalb erst,
  wenn der Hintergrund fertig ist, dort, wo die Maus dann ist (höchstens 4 s, sonst wie früher). Nach einem Zug wartet er nicht.
- Ecke umschalten rechnet weiter im Fenster (das Ausrichten der Griffe gleich danach braucht den Stand); nur das Setzen danach
  geht in den Hintergrund. Meldet ein Auftrag einen Fehler oder fällt der Worker aus, rechnet das Fenster wie vorher selbst.

**Gemessen nach dem Umbau:**

| Schritt | 5 200 Punkte | 11 000 Punkte | 23 400 Punkte |
| --- | --- | --- | --- |
| Loop schneiden: Stillstand | 0–0,12 s | 0,06–0,12 s | 0,11–0,34 s |
| Kante an: Stillstand; die Kante erscheint nach; aufgeräumt nach | keiner; 0,2–0,3 s; 0,4 s | keiner; 0,5–0,6 s; 0,9–1,0 s | keiner; 1,6–2,6 s; 3,4–5,2 s |
| Kante aus | keiner; 0,2 s; 0,4–0,5 s | keiner; 0,5 s; 0,9 s | keiner; 2,2 s; 4,6–4,7 s |
| Punkt setzen: Stillstand | keiner | keiner | 0,08 s |
| Punkt löschen, Rückgängig: Stillstand | keiner | keiner | keiner |
| nach dem zweiten Loop steht die Haut nach | 0,4 s | 0,8 s | 1,9 s |
| erster Griff nach den Loops: Ausschlag fern vom Griff je Bild | 7,0 → 0,14 | 11,6 → 0,12 | 25,9 → 0,20 |
| … und was dort bleibt | 2,0 → 0,06 | 2,0 → 0,10 | 2,0 → 0,07 |

- „Keiner“ heißt: kein Abstand über 50 ms zwischen zwei Bildern (längster 17 bis 40 ms).
- Beim Loop bleibt das Einsetzen selbst (die Kette ins Netz, die Linie auf ihren Pfad): 0,05–0,07 / 0,06–0,12 / 0,1–0,2 s.
- Die Änderung von 2 Einheiten, die früher der erste Griff brachte, kommt jetzt gleich nach dem zweiten Loop, wenn die Haut
  sich setzt (größte Stelle 2,0, Mittel 0,4 bis 1,0). Sie gehört zur Linie als Bézier-Pfad ohne Zusatzpunkte: Ein halber Ring
  mit zwei Punkten ist kein genauer Kreis (bis 2 Einheiten daneben), die Haut folgt ihm.
- **Gleich nach einem neuen Loop greifen** (vierter Loop, sofort die obere Kreuzung 6 Einheiten ziehen; neu / alter Ablauf;
  `ausgaben/g44-fenster-sofort.txt`): Drücken 3 / 134 ms, Ausschlag fern vom Griff 0,11 / 4,6 bei 5 200 Punkten; 6 / 328 ms,
  0,15 / 7,8 bei 11 000; 12 / 922 ms, 0,14 / 24,6 bei 23 400. Der Griff wartet dafür 0,1–0,3 / 0,4–0,8 / 1,3 s, bis die gesetzte
  Haut da ist. (Ohne das Warten, mit dem Setzen im Hintergrund, zerlegte das Fenster beim Drücken selbst: 0,15 / 0,5 / 2,5 s.)
- **Ältere Proben im neuen und im alten Ablauf** (Härte, Boden, Kreuzung, Griffe, Stift, Maul, Fressen-Pose, hin und zurück, zwei
  weite Züge, Griff loslassen; `ausgaben/g44-vergleich-alte-proben.txt`): dieselben Formen. Im neuen Ablauf steht die Haut schon
  vor dem ersten Zug (z. B. Knick quer über den weichen Pilzrand vor dem Zug 3,7° statt 6,2°).

**Befund: Mit einem einzelnen Loop hält nichts die Haut.** Der erste Versuch setzte die Haut nach jedem neuen Loop. Bei
11 000 Punkten zog schon der erste Ring die Kugel um 11 Einheiten flach (bei 5 200 nur 2), die nächsten Loops lagen auf der
verzogenen Haut, und nach dem dritten lief die Haut auseinander. Im Kern nachgemessen (`loeser/mess10.ts`, `ausgaben/loeser-mess10.out`):
- Ein Ring allein: Ein neuer Löser schlägt bis 144 bzw. 149 Einheiten je Runde aus (die Kugel hat den Halbmesser 150), braucht 23
  bzw. 36 Runden (5 200 bzw. 11 000 Punkte) und landet je nach Netz woanders (2 bis 3,5 Einheiten neben der Kugel, im Fenster
  11). Bei 23 400 Punkten steht die Haut nach 60 Runden noch nicht und liegt bis 26 Einheiten neben der Kugel.
- Ring und Mitte zusammen: 7 Runden, Ausschlag bis 12, Ende 2 neben der Kugel. Drei Loops: 6 Runden, bis 8.
- Jedes Aufräumen danach beginnt wieder mit einem neuen Löser und bricht nach zwölf Runden ab; mit einem einzelnen Ring ist das
  mitten im Ausschlag.
Deshalb die zwei Bedingungen beim neuen Loop: erst wenn sich Loops kreuzen, und nur, wenn die Haut zur Ruhe kommt. Mit einem
einzelnen Loop bleibt alles wie bisher: Die Haut bleibt, wie sie ist, und der erste Griff setzt sie (mit dem alten Ruck). Das ist
eine Schwäche des Lösers, nicht des Ablaufs; sie gilt genauso für jeden Zug mit nur einem Loop.

**Geprüft:** `form-nachlauf-probe.mjs` (18 Prüfungen, bei 5 200 und 11 000 Punkten alle gut): Kante und neuer Loop, während der
Hintergrund rechnet, setzen sich jetzt selbst; zweimal ⌘Z führt Bit für Bit zum Anfang; Fehler im Auftrag und Ausfall des
Workers. Tests `verfeinern.test.ts` (12): die Vorstufe rechnet dasselbe wie die Schritte einzeln, der Zwischenstand übersteht
die Grenze zum Worker, „nur in Ruhe“ lässt die Haut sonst, wie sie war.

**Ehrlich offen nach G4.4:**
1. **Die Kante erscheint auf dichten Netzen erst nach 1,6 bis 2,6 s** (23 400 Punkte; vorher stand das Fenster so lange still
   und zeigte sie dann). Davon ist rund 1 s Zerlegen.
2. **Mit einem einzelnen Loop** setzt sich nichts von selbst, der erste Griff ruckt dort wie bisher (siehe Befund).
3. **Loop schneiden hält noch 0,1 bis 0,2 s an** (dichte Netze), **Ecke umschalten** rechnet noch im Fenster.
4. **Der Griff wartet** nach Loop, Kante, Punkt oder Rückgängig bis zu 0,3 / 0,8 / 1,3 s (wer sofort greift). Die Linie folgt
   der Maus in dieser Zeit noch nicht. G/S/R über die Tastatur warten nicht.
5. Ältere Proben, die nach K oder Entf eine feste Zeit warten, lesen zu früh; vier sind angepasst (`ruhigK`).

**Stand (10.11. nachts): vor G5 — Wesen sichern und laden; G5 Teil 1 — die Güte des Netzes messen** (Florian: „Weiter mit G5:
zuerst mein Wesen sichern und laden können (es übersteht dann auch das Neuladen), dann die Güte des Netzes an meinen echten Wesen
messen.“)

*Sichern und Laden* (`92b60a5b`; `src/form/ablage.ts`, in `kurven.ts` der Abschnitt „Wesen behalten, sichern, laden“,
`vite.config.ts`). Bis dahin lebte ein Wesen nur im offenen Fenster; jedes Neuladen begann mit der Kugel, auch das von selbst
bei jeder Änderung am Code.

| Was | Wie |
| --- | --- |
| **Behalten** | Der Stand liegt im Browser und ist nach dem Neuladen wieder da: Netz, Loops mit Punkten, Griffen und Kanten, Maul, Fressen-Pose samt Grundform, Ausschnitt der Blätter, Name. Geschrieben wird 0,8 s nach einer Änderung, nicht im Zug. |
| **Sichern** (Knopf, ⌘S) | unter einem Namen als Datei `wesen/<Name>.eewesen` im Arbeitsbaum. Ein anderer vorhandener Name wird erst beim zweiten Drücken überschrieben. |
| **Laden** | aus der Liste der gesicherten Wesen (oder eine Datei von anderswo). |
| **Neu** | wieder die Startform. |
| **Wesen von vorher** | „Laden“ und „Neu“ sind Schritte: ⌘Z bringt das Wesen von vorher zurück. Zusätzlich bleibt es im Browser liegen und steht nach einem Neuladen in der Liste von „Laden“ ganz oben. |

- Gemessen: Eine Datei hat 0,4 MB bei 5 000 und 2,0 MB bei 24 000 Punkten; das Packen kostet im Fenster 1 bis 4 ms. Jede Zahl
  bleibt Bit für Bit (Test). Die Abstände der Bilder bei Loop, Kante, Punkt und Rückgängig sind wie nach G4.4
  (`form-aendern-probe.mjs` bei 5 200 und 23 400 Punkten).
- Das Maß des Startnetzes gehört jetzt zum Wesen: Ein geladenes Wesen behält seine Netzdichte, auch in einem Fenster mit anderer
  Startform.
- Geprüft: `ablage.test.ts` (4), `form-ablage-probe.mjs` (27 Prüfungen, bei 5 000 und bei 24 000 Punkten alle gut: neu laden,
  Zug danach, ⌘Z, Sichern mit Feld und ⌘S, Name bleibt, kein Überschreiben, Neu, Laden, Wesen von vorher, Fressen-Pose, andere
  Startform), dazu unverändert `form-nachlauf-probe.mjs` (18). Bilder: `docs/progress/editor/form-ablage-sichern-2026-11-10.png`,
  `form-ablage-laden-2026-11-10.png`.
- **Grenzen:** Die Liste der Schritte (⌘Z) wird nicht gesichert. Behalten wird nur in diesem Browser und nur zur selben
  Startform der Adresse (`form`, `dreiecke`; `&behalten=0` schaltet es ab). Sichern in den Ordner braucht den laufenden Server
  dieses Arbeitsbaums; ohne ihn legt der Browser die Datei ab. Es gibt keine älteren Fassungen einer Datei (anderer Name) und
  kein Löschen im Fenster (Datei im Ordner löschen).

*Die Güte des Netzes messen* (`apps/editor/scripts/pruefen/form-netzguete.ts`, liest gesicherte Wesen; Aufruf im Kopf des
Skripts). Je Wesen: Zahl der Punkte gegen ein gleichmäßiges Netz mit der Startkante; Kanten nach Länge gegen die Regeln des
Verdichtens; wo die Punkte liegen (Abstand zur nächsten Linie); Nachbarn je Punkt, kleinste Winkel; Fehler (offene Kanten,
umgeklappte Dreiecke, Spiegel); unruhige Stellen mit Ort; wie rund die Fläche ist (Sehnenfehler je Kante) und eine Schätzung, wie
viele Punkte für die Rundung genügten. Dazu ein Bild je Wesen (drei Ansichten, Dreiecke nach Dichte gefärbt, Linien, unruhige
Stellen).

**Florians Wesen sind damit noch nicht gemessen:** Sie lebten nur im offenen Fenster. Sobald er eins sichert, liegt es im Ordner
`wesen/`, und die Messung ist ein Aufruf.

*Erste Zahlen an Probewesen* (`form-probewesen.mjs` baut sie mit der Maus: Kugel mit drei Loops → Hals, Ring um den Hals, Kopf →
Rüssel, Ohr mit Kante → mit Ohr und Kopf gespielt; wenige Linien, wenige Züge, kein Ersatz für seine Wesen). Ausgabe:
`ausgaben/g5-netzguete-probewesen.txt`, `g5-probewesen-spiel.txt`; Bilder
`docs/progress/editor/form-netzguete-probewesen-5k-2026-11-10.jpg` und `…-23k-…`.

| Probewesen | Punkte | gegen gleichmäßig | Dreiecke unter 1° / unter 5° | davon flach längs einer Linie / Nadel an einer Linie | umgeklappt | für die Rundung genügten (Schätzung) |
| --- | --- | --- | --- | --- | --- | --- |
| Kugel, drei Loops (5 200) | 5 222 | 1,19 | 8 / 20 | 0 / 20 | 0 | 2 100 |
| Hals und Kopf | 6 023 | 0,99 | 20 / 26 | 24 / 0 | 0 | 2 800 |
| Rüssel, Ohr, Kante | 7 082 | 1,00 | 22 / 24 | 22 / 0 | 0 | 3 000 |
| danach gespielt (12-mal hinaus und zurück) | 7 578 | 1,07 | 18 / 20 | 18 / 0 | 0 | 3 100 |
| Kugel, drei Loops (23 400) | 23 452 | 1,13 | 10 / 250 | 0 / 228 | 0 | 2 200 |
| Hals und Kopf | 28 529 | 0,99 | 14 / 20 | 14 / 0 | 0 | 2 700 |
| Rüssel, Ohr, Kante | 32 890 | 0,98 | 26 / 32 | 28 / 0 | 2 | 3 000 |

(Dreiecke beider Seiten gezählt. Zwei Läufe desselben Baus geben bei den spitzen Dreiecken 16 bis 26 statt genau dieselbe Zahl:
Die Züge mit der Maus sind nicht auf das Bild genau gleich.)

1. **Das Netz ist nicht dichter als das Startnetz.** Nach den Zügen liegt die Dichte überall bei 0,9 bis 1,2 des Startnetzes,
   auch an den Linien (auf ihnen 1,1 bis 1,4). Die Zahl der Punkte wächst mit der Fläche: 5 200 → 7 100 bzw. 23 400 → 32 900.
   Dass die Linien feiner aufgelöst werden (auf MK/40), macht hier keine dichten Streifen.
2. **Beim Spielen wächst das Netz, obwohl die Form dieselbe bleibt.** Ohr und Kopf je sechsmal hinaus und zurück an dieselbe
   Stelle: Fläche 458 353 → 458 342, Punkte 7 082 → 7 578 (7 % mehr), verteilt über die ganze Haut. Je 30-mal: 7 090 → 7 768
   (10 % mehr); das erste Mal bringt je Punkt rund 200 Punkte, jedes weitere 2 bis 5. Der Grund liegt in den Regeln: Gestreckte
   Kanten werden über 1,75 Startkanten geteilt, gestauchte erst unter 0,5 zusammengelegt; dazwischen bleibt, was einmal geteilt
   ist. Jeder Punkt, mit dem man spielt, lässt so seinen Anteil zurück. Das passt zu Florians Beobachtung vom 08.11. (18 234 →
   26 284 Punkte nach dem Griffspiel), ist an seinen Wesen aber nicht gemessen.
3. **In jedem Probewesen bleiben an den Linien flache Dreiecke stehen.** Zwei Arten, beide nur an Linien:
   - *Nadeln nach dem Schneiden eines Loops:* zwei Punkte der Linie fast aufeinander (kürzeste Kante 0,013 Startkanten bei
     5 200, 0,002 bei 23 400 Punkten; 20 bzw. 228 Dreiecke unter 5°). Das erste Aufräumen nach einem Zug legt sie zusammen. Bis
     dahin rechnet der Löser mit ihnen.
   - *Flache Dreiecke längs der Linie nach dem Aufräumen:* drei aufeinanderfolgende Punkte derselben Linie bilden ein Dreieck
     (Winkel 0,01 bis 1°, der dritte 179°), der mittlere hat nur drei bis fünf Nachbarn. Sie bleiben, weil keine ihrer Kanten
     kurz genug zum Zusammenlegen ist (0,4 bis 1,1 Startkanten). 14 bis 28 je Wesen, in allen Läufen am Ring um den Hals (dem
     Loop, der nach dem ersten weiten Zug geschnitten wurde). Vermutung, nicht nachgewiesen: Sie entstehen, wenn das
     Zusammenlegen einen freien Punkt neben der Linie in einen Punkt der Linie legt.
   - Dazu zwei umgeklappte Dreiecke an der Ohrspitze mit Kante (nur bei 23 400 Punkten).
   Das sind die Stellen, an denen in G3 die Haut unruhig blieb (Befund 4 dort: Punkte mit drei und vier Nachbarn, Winkel von
   0,1 bis 0,5°). Abseits der Linien (weiter als zwei Startkanten) gibt es keinen Punkt mit drei Nachbarn; der kleinste Winkel
   ist dort 18 bis 23° bei 5 200 Punkten und 4 bis 8° bei 23 400 (dort bringt schon das Startnetz 6° mit).
4. **Für die Rundung genügte ein Bruchteil der Punkte** (Schätzung aus der Krümmung: Kante überall so lang, dass die Fläche
   zwischen zwei Punkten höchstens 0,2 Einheiten von der Sehne abweicht, ein halbes Pixel bei 300 %, höchstens 15 Einheiten
   lang): rund 3 000 Punkte für das Probewesen, unabhängig davon, ob es mit 7 100 oder 32 900 gerechnet ist. Das sagt nur, was
   die fertige Form zum Zeigen braucht. Was der Löser braucht, damit dieselbe Form entsteht, sagt es nicht (ein gröberes Netz
   hat heute eine etwas andere Ruheform, siehe G4.3).
5. Zu grob ist das Netz in den Probewesen nirgends (Sehnenfehler je Kante höchstens 0,35 Einheiten, 99 % unter 0,19).

**Was das für G5 heißt (Vorschlag, noch nicht gebaut):** erst die Güte, wie im Befund zu G3 gesagt: (a) keine flachen Dreiecke
längs der Linien mehr entstehen lassen und die vorhandenen auflösen, (b) Nadeln gleich beim Schneiden eines Loops vermeiden;
dann die Zahl: (c) das Wachsen beim Spielen begrenzen (zusammenlegen, was nach dem Zurückziehen wieder dichter ist als das
Startnetz). Vor (c) steht die Messung an Florians Wesen: Wie viel ihrer 11 000 bis 26 000 Punkte ist Fläche, wie viel ist
Spielen?

## Anhang A: Messwerte

**Pendeln und Bremse** (Bewegung je Runde nach einem Zug in 30 Mausschritten; `loeser/mess1.ts`, `mess3.ts`):
siehe Tabelle in 2.3. Aufruf: `MODE=varianten FALL=ohr DREIECKE=30000 VARIANTE=original,adaptiv NACH=40` (bestellt 30 000
Dreiecke = 23 406 Punkte mit drei Loops; 6 000 = 5 222, 14 000 = 10 964, 36 000 = 27 758).

**Rest nach dem Zug, Standard-Löser** (ein Lauf, Zug 160 hoch in 30 Mausschritten mit je einer Runde):

| Punkte | Rest beim Loslassen | nach den 4 Runden des Fensters | Bewegung je Runde danach |
| --- | --- | --- | --- |
| 5 222 | 0,19 | 0,04 | 0,017 · 0,014 · 0,019 … |
| 10 964 | 2,10 | 0,57 | 0,99 · 0,74 · 0,56 · 0,42 … Runde 20: 0,015 |
| 27 758 | 1,61 | 1,57 | 1,5 · 1,5 · 1,5 · 1,3 … Runde 20: 0,63 · Runde 60: 0,54 (kommt nicht zur Ruhe) |

**Kosten einer Runde** (5 222 Punkte, Anteile):

| | vermessen | intrinsisch | Krümmung verteilen | Lagen lösen | Rest |
| --- | --- | --- | --- | --- | --- |
| gleich (9,9 ms) | 10 % | – | (im Rest) | 65 % | 26 % |
| geometrie (13,1 ms) | 7 % | 9 % | 30 % (4,4 Schritte) | 48 % | 7 % |

**Zerlegung** (5 222 Punkte): Einträge der Matrix 53 914, des Faktors 616 127; beste geprüfte Reihenfolge 583 405 (5 % weniger).
Halbe Haut: 213 846 + 201 941 Einträge, Rechenarbeit 38 % (Zerlegen) und 34 % (Lösen).

**Nach der Geometrie, Ohr, nach dem Zug** (ein Lauf): 1,20 · 0,96 · 0,21 · 0,20 · 0,04 · 0,04 …, danach dauerhaft 0,002–0,03 je
Runde (kommt nie ganz zur Ruhe).

**Wegabhängigkeit, Ohr** (Fläche, größter Abstand der Endformen nach 300 Runden):

| | 30×1 ↔ 120×2 | 30×1 ↔ ein Schritt | 30×1 ↔ 150 % und zurück |
| --- | --- | --- | --- |
| gleich | 0,08 | 0,99 | 0,87 |
| geometrie | 0,96 | 2,72 | 0,84 |

**Maß auf genauen Flächen** (`netz/m3-mass.ts`): Kugel mit wahren Normalen 1,000 ± 0,000; mit Normalen nach Fläche 0,915 ± 0,089;
auf den Linien 0,60 ± 0,34 (kleinstes 0,03, größtes 2,35). Ellipsoid, Netz zweifach gestreckt: 0,73 des wahren Werts, nach dem
Verdichten 0,83; an alten Punkten ändert sich das Maß im Mittel um das 1,16-Fache (vierfach gestreckt: 2,5-fach).

**Netzgüte:** Startnetz 16 % stumpfe Dreiecke, längste/kürzeste Kante je Dreieck im Median 1,46. Gleichmäßig neu vernetzt:
1,8 % stumpf, 1,12; die unberührte Kugel wandert dann in 30 Runden 0,23 statt 0,60 Einheiten. Kein großer Hebel.

## Anhang B: Die drei kleinen Änderungen als Skizze

**Bremse für „gleich“** (`ausKurven.ts`, in `schritt`, nach `let k = m.kante2[i]! * c[i]!;`; genau so in der Messkopie,
`loeser/gen.py`):

```ts
if (!geo) {
  // Unterschied zwischen verteilter und gemessener Krümmung, je Punkt gebremst wie bei „geometrie“
  const d = m.kante2[i]! * (c[i]! - m.kap[i]!);
  const b = d * this.dVorher![i]! < 0 ? Math.max(0.02, 0.5 * this.beta![i]!) : Math.min(1, 1.25 * this.beta![i]!);
  this.beta![i] = b;
  this.dVorher![i] = d;
  k = m.kante2[i]! * m.kap[i]! + b * d;
}
```

(`beta` und `dVorher` wie bei „geometrie“ anlegen. An Linienpunkten ist `c = kap`, dort ändert sich nichts.)

**Lösen für drei Spalten ausgeschrieben:** Funktion `loesen3` in `algebra/a4-kern.ts` (40 Zeilen, drei getrennte Felder,
vorwärts streuen, rückwärts sammeln, Kehrwert der Diagonale einmal je Spalte).

**Ausgleich beim Netzwechsel** (`netz/m5-ausgleich.ts`): direkt nach dem Anlegen des Lösers auf dem neuen Netz einmal
`delta[i] = kap[i] − c[i]` (gemessene minus verteilte Krümmung), danach in jeder Runde `c[i] += delta[i]`.

## Quellen

Im Repo: Planseite `docs/plans/2026-11-06-kurven-als-wahrheit.md`, Bilanz `docs/research/2026-11-09-bilanz-wesen-editor.md`,
Recherche `docs/research/2026-11-09-fibermesh-monstermash-richtung.md`, Klarstellungen `docs/plans/2026-10-22-klarstellungen.md`.

Literatur (gelesen, soweit nicht anders vermerkt):
- Nealen, Igarashi, Sorkine, Alexa: FiberMesh, SIGGRAPH 2007. https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf
- Schneider, Kobbelt: Geometric fairing of irregular meshes for free-form surface design, CAGD 2001.
  https://graphics.rwth-aachen.de/media/papers/geom_fair1.pdf
- Stanko, Hahmann, Bonneau, Saguin-Sprynski: Smooth Interpolation of Curve Networks with Surface Normals, Eurographics 2016.
  http://tiborstanko.sk/assets/2016-eg.pdf
- Andrews, Joshi, Carr: A Linear Variational System for Modelling From Curves, CGF 2011 (nur Abstract).
  https://diglib.eg.org/handle/10.1111/v30i6pp1850-1861 · Andrews, Dissertation 2013, Kap. 5.
  https://www2.eecs.berkeley.edu/Pubs/TechRpts/2013/EECS-2013-103.pdf
- Botsch, Kobbelt: An Intuitive Framework for Real-Time Freeform Modeling, SIGGRAPH 2004.
  https://graphics.rwth-aachen.de/media/papers/modeling1.pdf
- Botsch, Bommes, Kobbelt: Efficient Linear System Solvers for Mesh Processing, 2005. https://cgg.unibe.ch/media/papers/solvers1.pdf
- Shi, Yu, Bell, Feng: A Fast Multigrid Algorithm for Mesh Deformation, SIGGRAPH 2006.
  https://i.cs.hku.hk/~yzyu/publication/multigrid_mesh-sig06.pdf
- Stein, Grinspun, Wardetzky, Jacobson: Natural Boundary Conditions for Smoothing in Geometry Processing, 2018.
  https://arxiv.org/abs/1707.04348
- Peng u. a.: Anderson Acceleration for Geometry Optimization and Physics Simulation, 2018.
  https://ar5iv.labs.arxiv.org/html/1805.05715
- Herholz, Sorkine-Hornung: Sparse Cholesky Updates for Interactive Mesh Parameterization, 2020.
  https://igl.ethz.ch/projects/sparse-cholesky-update/sparse-cholesky-update-paper.pdf
- de Goes, James: Regularized Kelvinlets, SIGGRAPH 2017. https://graphics.pixar.com/library/Kelvinlets
- Werkzeuge: Blender-Handbuch (Zahlen im Zug, Einrasten, Kante gleiten, LoopTools), Illustrator-Hilfe (Krümmungswerkzeug,
  Vereinfachen, intelligente Hilfslinien), Glyphs (Harmonisieren), Speed Punk (Krümmungskamm), Rhino (Zebra, Krümmungsgraph).
