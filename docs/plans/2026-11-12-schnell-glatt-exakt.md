# Plan: schnell, glatt, exakt (12.11.2026)

**Status: freigegeben am 12.11.2026** (Florian: „Ok, fangen wir an“; die Entscheidungen aus Abschnitt 5 gelten wie empfohlen,
solange er nichts anderes sagt). Der Stand je Schritt steht in `docs/UEBERGABE.md`. Basis ist
`kurven.html?gewichte=geometrie` (Zweig `claude/form-spiegel`, Port 5194). Der Plan ersetzt die offenen Reste von G5 und G6
und ordnet die Wege A bis D ein.

**Gelesen dafür:** die Berichte und Übergaben der Sitzungen „3D-Editor Kurven und Mesh-Präzision“, „Mesh-Performance und
Optimierungsmöglichkeiten“, „Blaupause Editor Design Iteration“, „Lofts vs. Plasticity performance“ und „Mesh-Pose-Editor
Bedienung recherche“; die Gegenprüfung vom 10.11. mit ihren Einzelberichten; der Rechenkern (`dicht/ausKurven.ts`) und die
Anzeige (`form/kurven.ts`). **Neu recherchiert:** Plasticity und CAD-Flächen, Flächen aus Linien mit Richtung, Unterteilung und
glatte Anzeige (Quellen am Ende). **Gemessen wurde für diesen Plan nichts Neues**; alle Zahlen stammen aus den genannten
Berichten.

## Kurz

- **G1 bis G4 sind gebaut** und bleiben. Von **G5** fehlt der Teil „weniger Punkte“, **G6** (halbe Haut) fehlt ganz.
  **Die Wege A, B, C und D wurden nie gebaut.**
- Deine vier Beschwerden (zäh, stufig, bläst auf oder kollabiert, justiert nach) haben vier getrennte Ursachen (Abschnitt 2).
  G1 bis G4 haben den Ablauf geglättet, die Ursachen aber nicht entfernt.
- **Weg B und G6 lösen „zäh“ und „stufig“ sicher.** Es ist dieselbe Technik wie Subsurf in Blender: wenige Punkte rechnen, die
  Grafikkarte glättet.
- **Weg A löst „bläst auf, kollabiert, justiert nach“ an der Wurzel**, ist bei uns aber unbewiesen. Deshalb zuerst ein kleiner
  Beweis mit Bildern an deinen eigenen Formen, dann erst der Einbau.
- **C entfällt, wenn A trägt. D ist nur noch Rückfall.**
- **Lofts:** als Flächenart weiter nein (am 11.11. an deinen Formen gemessen). Was dir an Plasticity gefällt (immer glatt,
  saubere Kanten, sofort), liefern A und B zusammen, ohne dass du Flächenstücke planen musst.
- **Der Unterbau bleibt:** Linien sind die Wahrheit, darunter liegt ein Dreiecksnetz. Es ändern sich zwei Dinge: wie die Haut
  gerechnet und wie sie gezeigt wird. Spiegelung, Posen, Maul und Auswahl bauen darauf auf.
- **Acht Schritte.** Jeder endet mit etwas, das du im Fenster oder auf einem Bild deiner Formen siehst. Das Erste, was du
  siehst: glatte Schattierung mit Vektorkanten und Linien genau auf dem Pfad (Schritt 1).

## 1. Deine Fragen

### 1.1 Was ist von G1 bis G6 offen?

| Schritt | Inhalt | Stand |
| --- | --- | --- |
| G1 | schneller lösen | gebaut (Runde 12,8 → 7,7 ms bei 5 200 Punkten) |
| G2 | Griffe in wahrer Länge, Kurve sofort da | gebaut |
| G3 | rechnen im Bildtakt, bis die Form steht | gebaut |
| G4 | Schweres im Hintergrund (Verfeinern, Aufräumen, Kante, Loop) | gebaut. Rest: Das Einwechseln nach dem Loslassen kommt je nach Punktzahl nach 1 bis 6 s und ändert die Form dann einmal, um bis zu 3 Einheiten |
| G5 | Netz nicht dichter als nötig | **nur Teil 1** (keine flachen Dreiecke an den Linien). Teil 2 „weniger Punkte, oder die Anzeige ist feiner als das Rechennetz“ fehlt. Das ist Weg B |
| G6 | halbe Haut | **nicht gebaut.** Gebaut ist nur die Anzeige (die Hälften verschmelzen an der Mitte); gerechnet werden weiter beide Hälften |

Außerhalb der Reihe gebaut: Sichern und Laden, Schutz gegen das Davonlaufen, Stabilität an der Spiegelachse, der Wurstballon
als Versuch (`?wurst=1`, nicht tragfähig).

### 1.2 Was waren die Wege A bis D?

Sie stehen in Abschnitt 5 der Gegenprüfung vom 10.11. als „größere Wege, nicht bewiesen“. Keiner wurde gebaut.

| Weg | Idee in einem Satz | Urteil heute |
| --- | --- | --- |
| **A** | Die Haut direkt aus den Linien rechnen: Jede Linie bekommt ihre Richtung aus dem Liniennetz, daraus folgt die Haut in einem Schritt, ohne Runden | der wichtigste Schritt für die **Form** → Schritt 3 |
| **B** | Kleines Rechennetz, feine glatte Anzeige | der wichtigste Schritt für **Tempo und Glätte** → Schritte 1 und 2 |
| **C** | Die heutigen Runden reparieren: die Wölbung an den Linien mitlösen statt an der Haut ablesen | entfällt, wenn A trägt; sonst zweiter Rückfall |
| **D** | Sofort-Antwort: beim Greifen einmal vorausrechnen, wie die Haut auf den Griff antwortet, im Zug nur noch addieren | mit A überflüssig (A ist selbst sofort); sonst erster Rückfall |

### 1.3 Bringen uns G1 bis G6, A und B ans Ziel? Ist es noch der eleganteste Weg?

- **G1 bis G6 allein: nein.** Sie machen die heutige Rechnung schneller und ruhiger im Ablauf. Dass die Form vom Weg abhängt
  und dass eine Röhre dicker wird, wenn man sie verlängert, liegt in der Rechnung selbst.
- **Mit A und B: ja, für alles, was du aufgezählt hast** – unter dem Vorbehalt, dass der Beweis für A hält. A und B greifen an
  verschiedenen Stellen an und passen zusammen: B bestimmt, **wo** gerechnet und **wie** gezeigt wird, A bestimmt, **was**
  gerechnet wird, die halbe Haut halbiert beides.
- **Eleganter als das habe ich nichts gefunden.** Geprüft und wieder verworfen: Flächenstücke wie im CAD als Grundlage (1.4),
  ein Kontrollnetz aus Vierecken mit Unterteilung (braucht Planung um jede Linie, das war der Weg bis zum 04.11.), implizite
  Körper (verschmelzen bei Annäherung, Punkte behalten ihren Ort nicht).
- **Was neu ist gegenüber dem Stand vom 10.11.:** Die Anzeige wird nicht nur „feiner“, sie trägt auf jeder Linienkante das
  exakte Stück deines Bézier-Pfads (Abschnitt 4, Schritt 1). Und Pose, Maul und Auswahl hängen direkt an A: Erst wenn dieselben
  Linien immer dieselbe Haut geben, lässt sich eine Pose als „andere Lage derselben Linien“ speichern.

### 1.4 Lofts wie in Plasticity

- **Gemessen (11.11., deine Formen):** Wo ein Schlauch mit Ringen quer vorliegt, gibt der Loft dieselbe Form wie unsere Rechnung
  und ist 100- bis 1000-mal schneller. Aber nur 0 bis 10 % der Fläche deiner Formen sind solche Schläuche; nur ein Viertel bis
  ein Drittel der Fläche liegt in vierseitigen Feldern zwischen deinen Linien.
- **Was Plasticity an solchen Stellen selbst tut:** Ein Loft verbindet Profile, die sich entsprechen. Für Löcher und Felder mit
  beliebig vielen Seiten nimmt auch CAD keine Lofts, sondern Füllflächen, die ausgerechnet werden (in Plasticity „Patch“ mit
  Rand und Führungslinien, in Rhino „Patch“ mit einem Regler, der zwischen rund und flach stellt).
- **Was daran für uns stimmt:** Der Loft ist deshalb sauber, weil er eine direkte Funktion der Kurven ist. Genau das ist Weg A,
  nur für beliebige Liniennetze: An einem Schlauch mit Ringen ergibt A dasselbe wie ein Loft (Richtung an den Ringen radial →
  Zylinder), überall sonst füllt es das Feld rund aus.
- **Urteil:** kein Richtungswechsel. Der Loft bleibt das Mittel der Wahl für „Teile anfügen“ (Schwanz, Hals, Horn, Bein), wie am
  11.11. entschieden: später.

## 2. Woher die vier Beschwerden kommen

1. **Zäh.** Gerechnet wird auf demselben dichten Netz, das auch gezeigt wird, über die ganze Haut, in Runden. Eine Runde kostet
   7,7 / 15,5 / 32 ms bei 5 200 / 11 000 / 23 400 Punkten, und bis zur Ruhe braucht es 5 / 10 / 30 Runden. Die Wartezeit wächst
   also etwa mit dem Quadrat der Punktzahl (dein Firefish: 27 770 Punkte). Blender und ZBrush rechnen beim Ziehen nichts über
   die ganze Fläche: Du bewegst wenige Punkte, geglättet wird in der Grafikkarte.
2. **Stufig.** Die Haut wird als flache Dreiecke gezeichnet. Die Grenze einer Farbstufe läuft je Dreieck gerade und knickt an
   jeder Dreieckskante. In `kurven.html` ist die Stufe außerdem eine harte Schwelle je Bildpunkt, ohne Kantenglättung.
3. **Bläst auf, kollabiert, zerreißt.** Die Rechnung kennt je Punkt nur eine Zahl: wie stark die Haut dort insgesamt gewölbt
   ist, ohne Richtung. Für diese Zahl sind eine Röhre und eine Kugel von doppelter Dicke dasselbe. Darum wird ein Horn beim
   Verlängern dicker, ein dünnes kann ebenso gut einfallen, und eine Kappe zwischen wenigen Linien darf sich fast umsonst
   aufblasen. Viele Loops helfen, weil sie der Haut Stück für Stück die Freiheit nehmen.
4. **Justiert nach.** Eine Linie legt nur fest, wo die Haut liegt, nicht, wie sie über die Linie hinwegläuft. Diese fehlende
   Angabe liest die Rechnung jede Runde an der Haut selbst ab. Das Ergebnis hängt dadurch vom Weg ab: Hin und zurück gibt nicht
   genau dieselbe Form, ein neues Netz hat eine etwas andere Ruheform, und auf dichten Netzen braucht es mehr Runden.

Ursache 1 und 2 löst Weg B mit der halben Haut. Ursache 3 und 4 sind eine: Der Haut fehlt an den Linien die Richtung. Das löst
Weg A.

## 3. Zielbild

1. **Wahrheit sind nur die Linien:** Punkte, Griffe, Kreuzungen, Kante an oder aus. Jede Pose hat ihre eigenen Lagen derselben
   Punkte.
2. **Jede Linie kennt ihre Richtung**, also wie die Haut über sie hinwegläuft, von selbst aus dem Liniennetz: An einer Kreuzung
   spannen zwei Linien die Fläche auf, auf der Spiegelebene folgt sie aus der Symmetrie, dazwischen dreht sie gleichmäßig. Du
   stellst nichts ein. (Der Baustein dafür existiert seit dem 09.11.: `dicht/richtung.ts`, an der Kugel mit drei Loops auf 0,5°
   genau.)
3. **Die Haut wird aus Linien und Richtungen direkt gerechnet.** Gleiche Linien geben immer dieselbe Haut: kein Ablesen an der
   Haut, keine Runden bis zur Ruhe, kein Nachjustieren, hin und zurück genau.
4. **Gerechnet wird klein, gezeigt wird fein.** Das Rechennetz hat wenige tausend Punkte und nur eine Hälfte. Die Anzeige
   unterteilt es in der Grafikkarte so fein, wie der Zoom es verlangt; Linien liegen exakt auf ihrem Bézier-Pfad, Kanten sind
   scharf, Farbstufen sind Vektorkanten.
5. **Gespiegelt wird wirklich.** Eine Hälfte ist die Wahrheit, die Mittellinie ist von Anfang an eine Linie. Was über die Mitte
   reicht, verschmilzt an einem sauberen Loop. Eine Pose ist die angewendete Spiegelung.

## 4. Die Schritte

Jeder Schritt wird in einem eigenen Arbeitsbaum gebaut und kommt erst in dein Fenster (5194), wenn du ihn gesehen hast. Der
Aufwand ist grob in Arbeitstagen einer Sitzung geschätzt.

### Schritt 0: Aufräumen (½ Tag)

Was sortiert wird, steht in Anhang B. Kurz: eine Entwicklungslinie statt drei Zweigen, alte Arbeitsbäume weg (rund 8 GB), die
Gedächtnisdateien des Projekts auf wenige Seiten kürzen (sie werden in jeder Sitzung ganz gelesen und kosten jedes Mal Budget),
eine kurze Übergabe. Am Code des Editors ändert Schritt 0 nichts.

### Schritt 1: Glatte Anzeige (Weg B, erster Teil; 2 bis 3 Tage)

- **Was du danach siehst:** dieselben Formen, aber die Farbstufen sind scharfe, glatte Kanten wie eine Vektorlinie, bei jedem
  Zoom. Die Linien liegen genau auf der Haut. Das Loch im Donut hat in der Anzeige einen glatten Rand statt Stufen.
- **Zuerst ein Vergleichsbild** (½ Tag, vor dem Einbau): dein „strange bird“ bei 300 % und 800 %, nebeneinander heute und die
  zwei Bauarten der glatten Anzeige (Anhang A.1). Dein Auge entscheidet, welche eingebaut wird.
- **Was gebaut wird:** Das Netz wird nur für die Anzeige unterteilt; die Grafikkarte zeichnet 16- bis 64-mal so viele Dreiecke.
  Kanten der Haut, die auf einer Linie liegen, tragen das exakte Stück des Bézier-Pfads. „Kante an“ bleibt scharf. Die
  Farbstufe wird im Shader einen Bildpunkt breit geglättet (die Funktion dafür gibt es in `/editor` schon). An der Spiegelebene
  wird je Bildpunkt abgeschnitten statt je Netzpunkt.
- **Geprüft wird** mit einem Bild vorher und nachher an deinen drei Formen und einmal dem Abstand der Bilder im Zug.
- **Risiko:** klein. An der Rechnung ändert sich nichts.

### Schritt 2: Kleines Rechennetz (Weg B, zweiter Teil = Rest von G5; 1 bis 2 Tage)

- **Was du danach siehst:** Die Statuszeile zeigt etwa ein Drittel bis ein Viertel der Punkte, die Form sieht dank Schritt 1
  genauso glatt aus, und auch der Firefish lässt sich ohne Zähigkeit ziehen. Nach dem Loslassen wartet nichts mehr sichtbar.
- **Was gebaut wird:** Das Startnetz wird gröber. Dichter wird es nur dort, wo die Form es braucht (enge Linien, kleine
  Details). Zeichnen auf der Haut trifft die glatte Anzeige, nicht die groben Dreiecke.
- **Geprüft wird** an Firefish, Vogel und test_kaputt: ein Lauf je Form (Abstand der Bilder im Zug, Zeit bis zur Ruhe) und ein
  Bild „Form vorher und nachher übereinander“.
- **Risiko:** mittel. Die heutige Rechnung gibt auf einem gröberen Netz eine leicht andere Form (bisher bis 3 Einheiten). Wenn
  dich das stört, bleibt die Dichte über einen Schalter höher, bis Schritt 3 entschieden ist.

### Schritt 3: Beweis „Haut direkt aus den Linien“ (Weg A; 1 bis 2 Tage, nur Bilder)

- **Was du danach siehst:** ein Blatt mit Bildern, links heute, rechts neu: deine drei Formen, dazu Kugel, Schlauch, Rüssel und
  „Horn verlängern“. Am Fenster ändert sich in diesem Schritt nichts.
- **Was der Beweis zeigen muss** (in deinen Worten):
  - Ein Horn, das ich verlängere, wird nicht dicker und fällt nicht ein.
  - Ein Rüssel nur aus zwei Profillinien wird rund und nicht flach.
  - Die Kugel bleibt eine Kugel, auch wenn nur die Mittellinie da ist.
  - Hin und zurück gibt genau dieselbe Form; beim Loslassen ändert sich nichts.
  - Ein gröberes Netz gibt dieselbe Form (höchstens ½ Bildpunkt bei 300 %).
- **Ehrlich offen ist genau eine Frage:** ob die Richtung auch dort trägt, wo erst wenige Linien da sind (nur die Mittellinie,
  der Rüssel aus Profillinien). Dafür gibt es zwei Bauarten (Anhang A.3). Das „Organische“ beim Erstellen bleibt: Zwischen
  wenigen Linien wölbt sich die Haut weiter rund auf. Sie folgt den Linien aber strenger als heute; ob dir das gefällt, sollen
  die Bilder zeigen.
- **Was aus den vier Vorschlägen der Blaupause-Sitzung wird:** Der Wurstballon ist dieselbe Idee, dort aber in die alte Rechnung
  gezwängt; hier steckt die Richtung in der Rechnung selbst. „Dicke merken“ wird unnötig, weil die Dicke aus den Linien folgt.
  „Dicke aus der Seitenansicht“ ergibt sich von selbst, wo nur Profillinien da sind. Ein Druck-Regler wäre später als „Fülle“
  je Linie möglich, ist aber nicht geplant.
- **Wenn der Beweis nicht hält:** Die heutige Rechnung bleibt, auf kleinem Netz und halber Haut (Schritte 2 und 4 lohnen sich
  in jedem Fall). Gegen das Aufblasen bleibt dann nur der Druck-Regler, gegen das Nachhinken Weg D.
- **Nachtrag 13.11. (gerechnet):** Der Beweis hält so nicht. Die Haut nur aus den Linien bleibt an Kugel und Schlauch genau,
  wird aber zwischen wenigen Linien keilförmig oder flach und verändert deine drei Formen stark. Ein Teil hält: Aus den Linien
  und der Wölbung, die die Haut schon hat, folgen die Lagen in einer Lösung; damit bleibt das Horn am „strange bird“ beim
  Verlängern so dick, wie es war (heute +10 bis +16 %). Neue Haut runden kann dieser Teil nicht. Bilder und Zahlen:
  `docs/research/2026-11-13-beweis-haut-direkt.md`. Offen ist deine Entscheidung: weiter nach Plan mit der heutigen Rechnung,
  oder zuerst ein zweiter kurzer Beweis, ob beide zusammen das Ziehen exakt machen.

### Schritt 4: Echte Spiegelung und die neue Rechnung ins Fenster (G6 und A; 5 bis 8 Tage)

**Nachtrag 13.11.:** Schritt 3 hat ergeben, dass die heutige Rechnung bleibt (A hält nicht, B gefällt Florian nicht). Schritt 4
ist damit nur noch die echte Spiegelung; der zweite Punkt unten („Ziehen fühlt sich direkt an“) entfällt.

**Nachtrag 13.11. vormittags, kleiner Beweis „Donut“ (Probe `form-donut.ts`, Bild `docs/progress/editor/schritt4-donut-2026-11-13.jpg`):**
„Zurück → Form wie vorher“ hält schon heute (im Mittel 0,11, größter 0,4 neben der Kugel). „Loch mit glattem Rand“ hält nicht:
Heute ist der Rand eine scharfe Kante (Knick im Mittel 97°), und er bleibt eine, wenn die Hälften wirklich verschmolzen werden
(im Mittel 22° bis 77°, je nachdem, ob der Rand frei, eine Linie oder eine Linie ohne Wölbung ist); mit freiem Rand verzieht sich
das Loch. Der dritte Punkt unten („verschmelzen an einem glatten Loop“) folgt also nicht aus dem Umbau allein. Das Abschneiden
und Spiegeln der Hälfte selbst trägt. Offen ist Florians Entscheidung: Umbau auf die halbe Haut ohne glatten Rand, zuerst den
Rand klären, oder Schritt 4 zurückstellen.

**Nachtrag 13.11. mittags, zweiter kleiner Beweis „Donut mit Florians Regel“** (Florian: „Donut beweisen“; Probe
`form-donut-regel.ts`, nur Kern und ein Bild, im Fenster ändert sich nichts). Derselbe Fall wie oben (Kugel mit drei Loops, der
Punkt der Seite um 190 durch die Mitte), jetzt mit seiner Regel (Abschnitt 5, Punkt 4): Beim Loslassen wird an der Mitte
geschnitten; jede geschnittene Linie endet dort in einem Punkt ohne Knick (Griff senkrecht zur Mitte, wie jedes Ende eines Rings
im Kern); der Rand des Lochs ist ein neuer Loop der Mittelebene mit glatten Punkten an den neuen Kreuzungen. Zwei Fassungen:
(a) nur diese Regel, die heutige Rechnung rechnet weiter; (b) dazu wird die Haut am neuen Rand einmal neu gerundet (der neue
Loop hält dabei nur den Ort und gibt noch keine Wölbung vor), danach rechnet die heutige Rechnung unverändert weiter.
**Kriterien, vorher festgelegt:** 1. Im Bild (flach schattiert, gleiche Blicke wie oben) ist am Rand des Lochs keine Kante zu
sehen; im Schnitt läuft die Haut rund durch die Mitte (keine Spitze). 2. Der Knick quer über den Rand ist nicht größer als der
zwischen den Dreiecken daneben (heute im Mittel 97°). 3. Das Loch hat keine Ecken, sein Halbmesser bleibt im Bereich von heute
(73,5 bis 93,1). 4. Die Rechnung kommt zur Ruhe, nichts ist umgestülpt, und nach weiteren Runden der unveränderten heutigen
Rechnung ist der Rand noch glatt. **Aufwand:** ein halber bis ein Tag; hält es danach nicht: anhalten und es sagen.
**Ergebnis (13.11. mittags; Bilder `docs/progress/editor/schritt4-donut-regel-2026-11-13.jpg` und `…-regel-klein-…`, Zahlen
`schritt4-donut-regel-messung-2026-11-13.txt`, Einzelheiten in `docs/UEBERGABE.md`, Abschnitt 7.2):** Fassung (a) hält, alle
vier Kriterien sind erfüllt: Das Loch ist rund (Halbmesser 91,1 bis 91,8 statt 77 bis 92), der Knick quer über den Rand im
Mittel 18° statt 96° und so groß wie eine Reihe daneben, die Rechnung steht nach 3 + 8 Runden; ebenso bei mittlerem und kleinem
Loch und mit viermal so vielen Dreiecken. Dazu gehören zwei Festlegungen, die im Beweis entstanden sind: Der Griff des neuen
Endes ist der senkrechte Anteil des geteilten Griffs (mit seiner ganzen Länge springt die Form, wenn der Punkt gerade erst über
die Mitte kommt), und der Rand des Lochs ist ein Loop so rund wie möglich durch die neuen Kreuzungen. Beim Schneiden dürfen
keine schmalen Dreiecke bleiben (Punkte dicht an der Mitte kommen auf die Mitte). Fassung (b) ist verworfen: Hält der neue Rand
nur den Ort, kommt die Rechnung nicht zur Ruhe. Nicht gerechnet ist der Zug selbst (Vorschlag: beim ersten Durchstoßen einmal
schneiden, danach wandern nur die Linien). Florians Urteil zu den Bildern steht aus.
**Nachtrag 13.11. mittags, Florians zweite Regel** (Abschnitt 5, Punkt 4; dieselbe Probe mit `GRIFFE=kante`, Bilder
`docs/progress/editor/schritt4-donut-kante-2026-11-13.jpg` und `…-kante-klein-…`): Sie lässt sich ganz mit den Regeln rechnen,
die der Kern für Kanten schon hat. Fest gemacht (geschnitten, die neuen Enden behalten ihren Knick als Ecken von selbst, der
Rand ein Loop mit Kante) bewegt sich die Haut wenig: beim großen Loch bis 6,9, im Mittel 1,8 (zwischen den Linien rundet sich
jede Seite am Rand etwas, Knick 96° → 71°), gerade erst über die Mitte im Mittel 0,04. „Kante aus“ am Rand macht die Ecken glatt
(`kantenKnicken`: Griffe auf eine Gerade, Längen bleiben) und die Haut glatt (Knick am Rand 15° wie eine Reihe daneben, nichts
umgestülpt); der Umriss des Lochs bleibt, wie er geschnitten wurde (Halbmesser 77 bis 92, Ecken an den vier Punkten). Rund geht
erst, wenn der Schnitt fest ist. Der Zug braucht mit dieser Regel keinen Schnitt (er bleibt wie heute), und der Schnitt gibt
wieder eine gewöhnliche gespiegelte Haut: Der Donut hängt damit nicht mehr am Umbau auf die halbe Haut.

**Schritt 4a, der Donut im Bau-Fenster (Florian am 13.11. mittags: „Donut bauen“).** Gebaut wird in `form-bau` (Port 5197) auf
der heutigen Haut (ganze Haut mit Spiegelpaaren). Florians Fenster (5194) bleibt, wie es ist, bis er die Übernahme freigibt. Der
Umbau auf die halbe Haut wird Schritt 4b (Tempo, weniger Buchführung) und ist für den Donut nicht nötig. Etappen, jede mit
ihrer sichtbaren Probe:
1. **Der Schnitt im Kern** (`packages/shape/src/dicht/mitteSchnitt.ts`): wo die Pfade der Linien die Mitte kreuzen und welche
   Punkte dahinter liegen; „fest machen“ (die Haut an der Mitte schneiden und mit ihrem Spiegelbild verbinden, Punkte dicht an
   der Mitte kommen dabei auf die Mitte; die Linien an der Mitte teilen, die neuen Enden behalten ihren Knick; der Rand jedes
   Lochs wird ein Loop mit Kante und mit Punkten an den Kreuzungen). **Probe:** Tests im Kern (Kugel mit drei Loops, grobes und
   feines Netz: spiegelgleich, geschlossen, nichts hinter der Mitte, Linien auf ihren Pfaden), und die Donut-Probe rechnet mit
   der Kernfunktion dieselben Zahlen wie in der Übergabe 7.3.
2. **Lose anzeigen:** In den Blättern erscheinen Punkte, wo eine Linie die Mitte kreuzt (sie folgen dem Zug), und der Punkt
   hinter der Mitte ist markiert. Ziehen, Loslassen und Zurückziehen bleiben wie heute. **Probe:** Bildschirmfotos mit dem Punkt
   hinter der Mitte und nach dem Zurückziehen.
3. **Fest machen:** Den markierten Punkt löschen schneidet (⌘Z führt zurück). Der Rand ist danach ein gewöhnlicher Loop mit
   Kante, auswählbar, mit Punkten an den Kreuzungen. **Probe:** Bildschirmfotos vor und nach dem Löschen in gleicher Ansicht; die
   Haut bewegt sich dabei nicht mehr als im Kern gemessen (großes Loch bis rund 7), die Rechnung kommt zur Ruhe, danach lässt sich
   weiterziehen.
4. **Rund:** „Kante aus“ (Taste K) am Rand macht die Haut glatt, „Kante an“ wieder kantig. **Probe:** Bildschirmfoto; der Knick
   am Rand ist so groß wie eine Dreiecksreihe daneben.
5. **Seine Formen und die Grenzen:** dieselbe Folge an einer seiner Formen aus `wesen/`; in der Pose und am Maul eine Meldung
   statt eines Schnitts. Danach Übergabe und sein Urteil im Bau-Fenster.

**Festlegungen dazu (er kann widersprechen):** Fest gemacht wird alles, was hinter der Mitte liegt, nicht nur die Stelle des
gelöschten Punkts. „Kante aus“ am Rand gibt es erst nach dem Festmachen. Der Umriss des Lochs bleibt, wie er geschnitten wurde.
Liegt nur ein Griff hinter der Mitte und kein Punkt, bleibt die Stelle lose (offen, was dann fest macht). **Abbruch:** Hält eine
Etappe nach ihrem Aufwand (je ein halber bis ein Tag) nicht: anhalten und es sagen.
**Ergebnis (13.11. mittags; `docs/UEBERGABE.md`, Abschnitt 7.4):** Die Etappen 1 bis 5 sind im Bau-Fenster gebaut. Die Probe im
Fenster (`form-donut-fenster.mjs`) besteht an der Kugel und an `test_kaputt` und `teat firefish` in allen Punkten (lose, zurück,
fest, rund, weiterziehen, ⌘Z); fest machen bewegt die gezeigte Haut höchstens 4,7 bis 6,4, „Kante aus“ bringt den Knick am Rand
von 55° bis 82° auf 14° bis 26°. An `strange bird` stülpt schon der lose Zug an der geprüften Stelle die Haut um (der Zug von
heute); dort entsteht kein sauberer Donut. **Übernommen in Florians Fenster am 13.11. mittags** (er: „Übernehmen“;
`claude/form-bau` nach `claude/form-spiegel`, die Probe besteht auch dort). Sein Urteil steht aus.

**Schritt 4b, die halbe Haut (Florian am 13.11. mittags: „Ich bin jetzt etwas unterwegs, daher kannst du halbe Haut machen. Wir
werden das Tempo sicher noch brauchen“).** Gebaut wird zuerst, wo das Tempo entsteht, mit dem kleinsten Risiko: **die Rechnung
auf der Hälfte im Löser**, das Netz im Fenster bleibt ganz (so hatte es die Gegenprüfung vom 10.11. gemessen: „Rechnet der Löser
nur eine Hälfte …“). Probe: derselbe Zug ganz und halb im Kern (gleiche Form, Zeiten), dann im Bau-Fenster an seinen Formen
(Rechnen je Bild, Bilder im Zug, Proben wie vorher). Der große Umbau (das Netz selbst als Hälfte: Verdichten, Anzeige, Sichern)
bleibt zurückgestellt, bis das Tempo ihn verlangt.
**Ergebnis des ersten Teils (13.11. mittags; `docs/UEBERGABE.md`, Abschnitt 7.5):** gebaut und im Bau-Fenster Standard
(`?halb=0` zum Vergleichen). Gleiche Form (höchstens 0,08 auseinander), Zerlegen rund 50 %, eine Runde 73 % (nicht die erhoffte
Hälfte: Lösen ist heute nur noch die halbe Runde); im Fenster am „teat firefish“ Rechnen je Bild 10,3 → 7,1 ms, Bilder im Median
alle 16 statt 18 ms. Dazu „flüssig zuerst“ (eine weitere Runde je Bild nur, wenn sie ins Bild passt). Offen: Gewichte nach der
Geometrie und Vermessen auf der Hälfte (Runde auf 50 bis 60 %). **Übernommen in Florians Fenster am 13.11. nachmittags** (er:
„Dann mach erstmal weiter, wie du empfiehlst“; `claude/form-bau` nach `claude/form-spiegel`, die Donut-Probe besteht auch dort).
Sein Urteil zum Tempo steht aus. Der Rest steht unten als Schritt 4c.

- **Was du danach siehst:**
  - Jede neue Form beginnt als gespiegelte Kugel, **die Mittellinie ist von Anfang an eingezeichnet**.
  - Ziehen fühlt sich direkt an: Die Haut ist in jedem Bild fertig, nach dem Loslassen passiert nichts mehr.
  - **Ziehst du einen Punkt oder Griff über die Mitte, verschmelzen die Hälften an einem glatten Loop** (dein Donut: das Loch
    ist ein sauberer runder Rand). Ziehst du zurück, löst es sich wieder.
- **Was gebaut wird:** Die Haut ist nur noch die Hälfte z ≥ 0, die Spiegelebene ist ihr Rand; die Anzeige spiegelt. Die
  Rechnung aus Schritt 3 (oder, falls der Beweis nicht hielt, die heutige) rechnet auf dieser Hälfte. Die Naht an der Mitte ist
  eine Linie der Mittelebene, die von selbst entsteht und vergeht; auf Wunsch wird sie eine feste Linie mit Punkten und Griffen
  (Entscheidung 4).
- **Kleiner Beweis zuerst** (½ Tag, ein Bild): der Donut. Griff durch die Mitte → Loch mit glattem Rand; zurück → Form wie
  vorher.
- **Risiko:** mittel bis hoch; es ist der größte Umbau im Plan. Das Fenster arbeitet heute mit Punktpaaren; die Umstellung auf
  eine Hälfte berührt Einsetzen, Verdichten und die Anzeige. Dafür fallen rund 300 Zeilen Paar-Buchführung weg.

### Schritt 4c, vorgemerkt: der Rest der halben Haut (Tempo-Reserve; nicht vergessen)

**Florian am 13.11. nachmittags** (auf die Frage „Posen“ oder „Weiter an der Hälfte“): „Dann mach erstmal weiter, wie du
empfiehlst, aber es soll nicht vergessen werden. Wir werden das Tempo noch brauchen, wenn Shader, Materialien, Fell und
Zusatzteile wie Flügel und Beine dazukommen. Meine Formen sind momentan beliebige Testformen und haben nichts mit den Wesen zu
tun.“

Daraus folgt zweierlei:
- **Der Rest der halben Haut ist ein fester Schritt des Plans, kein „vielleicht später“.** Er kommt nach den Posen wieder auf
  den Tisch (dann wird Florian gefragt) und muss gebaut sein, bevor der erste der genannten Bausteine beginnt (Shader,
  Materialien, Fell, Zusatzteile; im Abschnitt „Danach“ also vor „Auswuchs und Teile anfügen“).
- **Seine heutigen Formen sind kein Maßstab für das Tempo.** „An seinen Formen sieht man davon nichts“ ist kein Grund, Tempo
  zurückzustellen oder zu streichen. Wie groß ein Wesen mit Zusatzteilen im Editor wird, weiß heute niemand; gebraucht wird
  Reserve.

Was offen ist, in der Reihenfolge, in der ich es bauen würde:
1. **Gewichte nach der Geometrie und Vermessen auf der Hälfte** (nur im Kern). Heute rechnen beide über die ganze Haut; die
   Gewichte sind mit 37 % der größte Posten einer Runde. Erwartung: eine Runde von 73 % auf 50 bis 60 % der ganzen Rechnung.
   Schwierig: Die Gewichte tauschen Kanten, auch solche auf der Mittelebene; dort entstünden Dreiecke über beide Hälften.
2. **Die einzelnen langsamen Bilder im Zug** (jedes zwanzigste braucht rund doppelt so lange, 32 bis 35 ms): Ursache messen,
   dann beheben. Bisher nicht untersucht.
3. **Verdichten und Anzeige auf der Hälfte:** der Teil eines Bilds, der nicht Rechnen ist. Wie viel die Hälfte dort spart, ist
   nicht gemessen; Shader, Materialien und Fell kommen später in diesem Teil dazu.
4. **Das Netz selbst als Hälfte** (der große Umbau oben: Mittellinie von Anfang an, die Paar-Buchführung fällt weg).

Jeder Teil mit seiner Probe wie in 4b (derselbe Zug vorher und nachher: gleiche Form, Zeiten im Kern, Bilder im Fenster), dazu
eine größere Prüfform als seine drei Testformen (etwa ein Körper mit vier angesetzten Teilen), damit die Reserve sichtbar wird.

### Schritt 5: Posen wie die Basis (3 bis 4 Tage)

- **Was du danach siehst:** In einer Pose bedienst du dieselben Punkte und Griffe wie in der Basis, und die Haut verhält sich
  genauso. Neue Punkte und Loops gibt es in der Pose nicht. Die Spiegelung ist in der Pose angewendet (beide Seiten frei), in
  der Basis ist sie wieder da.
- **Was gebaut wird:** Eine Pose speichert die Lagen der Linienpunkte und Griffe (und die Knochen), nicht mehr eine
  Verschiebung je Netzpunkt. Ihre Haut entsteht mit derselben Rechnung auf dem ganzen Netz (Hälfte plus Spiegelbild). Der
  Blendshape fürs Spiel ist der Unterschied beider Häute.
- **Folge:** Änderst du später die Basis, gehen die Posen mit (neue Punkte der Basis bekommen in der Pose ihren Platz auf der
  Linie).
- **Voraussetzung:** Schritt 3 hält. Mit der heutigen Rechnung ginge „bedienen wie die Basis“ auch, aber eine Pose ließe sich
  dann nicht aus ihren Linien wiederherstellen.

**Nachtrag 13.11. nachmittags: Schritt 5 mit der heutigen Rechnung** (Florian: „Dann mach erstmal weiter, wie du empfiehlst“).
Die Voraussetzung ist nicht erfüllt (Schritt 3: Die heutige Rechnung bleibt). Deshalb gilt für die Pose:

- **Eine Pose ist eine zweite Lage derselben Form:** dieselben Linien, Punkte und Griffe wie die Grundform an anderen Orten,
  dazu ihre eigene Haut auf demselben Netz. Gespeichert wird beides als Versatz gegen die Grundform: je Punkt und Griff der
  Linien, und je Netzpunkt der Haut (das ist der Blendshape). Die Haut muss dabei sein, weil die heutige Rechnung sie nicht aus
  den Linien allein wiederherstellt.
- **Gerechnet und gespeichert wird in der Ruhe der Pose** (vor den Knochen, das Maul ist zu). Die Knochen drehen nur, was
  gezeigt wird: Haut, Linien, Punkte, Griffe. Ein Zug im Blatt wird mit dem Winkel seines Punkts zurückgedreht. Für die
  Rechnung ist die Pose damit eine Form wie die Grundform: dieselbe Rechnung über die ganze Haut, Linien genau auf ihren
  Pfaden, Griffe gespeichert statt abgelesen, auch die Rechnung auf der Hälfte. Die Regler für Maul und Kopf rechnen nichts
  neu. So rechnet auch das Spiel: erst der Blendshape, dann die Knochen. (Anhang A.5 sah vor, in der gedrehten Lage zu
  rechnen. Dann müssten Linien und Griffe nach jedem Dreh neu abgelesen werden; das ist das Nachjustieren von heute.)
- **Ändert sich die Grundform, geht die Pose mit:** Linien der Pose = Linien der Grundform + Versatz, Haut der Pose = Haut der
  Grundform + Blendshape; beim Betreten setzt die Rechnung die Haut auf ihre Linien.

**Etappen**, jede mit ihrer sichtbaren Probe, gebaut im Bau-Fenster (5197); in Florians Fenster erst nach seinem Wort:
1. **Kleiner Beweis im Kern** (Probe `form-pose-ruhe.ts`, ein Bild; Aufwand ein halber Tag; hält er danach nicht: anhalten und
   es sagen). Eine Kugel mit Maul, im Fenster gezeichnet wie in der Fressen-Probe, Maul 30° offen. Derselbe Zug in der Pose
   (unterster Punkt der Unterlippe 25 nach unten), einmal wie heute (aus dem Fenster abgelesen), einmal neu (Rechnung der
   Grundform in der Ruhe der Pose, danach gedreht). Dazu der Gegenzug (25 nach oben: in der Ruhe läuft die Unterlippe dabei
   durch die Oberlippe) und ein Zug fern vom Maul. An den Lippen drei Fassungen: (a) die verborgene Fläche der Öffnung rechnet
   mit, (b) die Lippen sind eine Kante, (c) die Öffnung ist aus der Rechnung genommen.
   **Kriterien, vorher festgelegt:** 1. In der gezeigten Haut ist nichts umgeschlagen, und die Rechnung kommt zur Ruhe.
   2. Ohne Zug bewegt die Rechnung die Haut der Pose nicht (höchstens 0,05). 3. Ein Zug fern vom Maul gibt in der Pose dieselbe
   Haut wie in der Grundform (höchstens 0,5 auseinander). 4. Beim Zug an der Lippe bleibt die Haut fern vom Maul stehen
   (höchstens 1 bei Halbmesser 150), und die Linien liegen auf ihren Pfaden (höchstens 0,5). 5. Die Grundform bleibt bitgleich.
2. **Im Fenster ziehen wie in der Grundform:** Pose betreten, Punkte und Griffe ziehen, Regler drehen, zurück. **Probe:** die
   Fressen-Probe (`form-fressen-pose.mjs`) und ein Bildpaar vorher und nachher in gleicher Ansicht.
3. **Die Pose geht mit der Grundform mit** (Punkte der Grundform ziehen, Linie schneiden, Netz verfeinern). **Probe:** die
   Fressen-Probe, Schritt 4 (Grundform ändern, wieder in die Pose: der Zug an der Lippe bleibt).
4. **Beide Seiten frei** (die Spiegelung ist in der Pose angewendet). Eigener kleiner Beweis zuerst: Die Rechnung und die
   Linien setzen heute überall Spiegelpaare voraus.
5. **Florians Ablauf** an einer seiner Formen (Maul zeichnen, Fressen, formen), danach Übergabe und sein Urteil.

**Festlegungen (er kann widersprechen):** In der Pose gibt es keine neuen Punkte und Loops und kein Löschen (wie oben). Alte
Test-Posen in gesicherten Formen behalten ihren Blendshape; ihre Linien beginnen ohne Versatz.

**Ergebnis der Etappe 1 (13.11. nachmittags): Der Beweis hält nicht so, wie er festgelegt war; angehalten.** Bild
`docs/progress/editor/schritt5-pose-ruhe-2026-11-13.jpg`, Zahlen `schritt5-pose-ruhe-messung-2026-11-13.txt`, Einzelheiten in
`docs/UEBERGABE.md`, Abschnitt 7.6. Die Rechnung der Grundform kann die Pose rechnen: Nichts schlägt um, sie kommt nach 43 bis
73 Runden zur Ruhe, die Linien liegen genau auf ihren Pfaden, die Grundform bleibt bitgleich. Aber keine der drei Fassungen an
den Lippen erfüllt alle Kriterien:
- **(a) Die Öffnung rechnet mit** (die Rechnung der Grundform, unverändert): Ohne Zug steht die Haut (0,03), der Zug fern vom
  Maul ist derselbe wie in der Grundform. Ein Zug an der Lippe nimmt aber die Haut fern vom Maul mit: 10,7 beim Zug nach unten,
  31,7 beim Zug nach oben (Kriterium: 1). Nach oben verzieht sich der ganze Kopf sichtbar: In der Ruhe der Pose ist das Maul zu,
  die Unterlippe läuft dort durch die Oberlippe.
- **(b) Die Lippen als Kante:** Die Züge an der Lippe bleiben am Maul (fern 0,95 und 0,92) und sind sauber, auch nach oben. Der
  Wechsel zur Kante bewegt die Haut einmal um bis 0,6. Aber ein Zug fern vom Maul bläst die Form anders auf als in der
  Grundform (größte Bewegung 56,8 statt 40,0), und ohne Zug kriecht die Haut in 20 Runden um 0,12 (Kriterium: 0,05).
- **(c) Die Öffnung aus der Rechnung genommen:** Schon der Wechsel bewegt die ganze Form um 35,7. Scheidet aus; die Rechnung
  über die ganze Haut verträgt kein Loch.

Die Ursache liegt nicht in der Pose, sondern im Maul von heute: Die Haut ist dort geschlossen, nur die Anzeige schneidet auf.
In der Ruhe liegt die verborgene Fläche zwischen den Lippen; was die Lippen aufeinander zu bewegt, läuft dort durcheinander.
Erwartung (nicht gerechnet): Mit dem Maul als eigener Geometrie (Schritt 6: zwei Lippenlinien, die Höhle als Haut) gibt es keine
verborgene Fläche mehr; dann lässt sich die Pose in der gezeigten Lage rechnen, dort liegt nichts aufeinander. **Offen ist
Florians Entscheidung:** Schritt 6 vor Schritt 5 ziehen (empfohlen), die Posen jetzt mit (b) bauen (nur in der Pose ist die
Maullinie eine Kante), oder inzwischen Schritt 4c.

### Schritt 6: Maul als eigene Geometrie (4 bis 6 Tage, Entwurf und kleiner Beweis zuerst)

- **Was du danach siehst:** Das Maul ist ein echter Teil der Haut: Ober- und Unterlippe sind zwei Linien, die sich an den
  Mundwinkeln treffen, dahinter liegt die Maulhöhle als Haut. Linien, die vorher über die Maulstelle liefen, enden an den
  Lippen. Du kannst einen Loop nur um den Unterkiefer legen (außen ums Kinn, innen über den Maulboden). Die Lippen liegen exakt
  auf ihren Kurven.
- **Was gebaut wird:** Beim Anlegen des Mauls wird die Haut entlang der Lippenlinie wirklich aufgeschnitten und um die
  Maulhöhle ergänzt. Gerechnet wird in leicht geöffneter Stellung (dort liegt nichts aufeinander); geschlossen zeigt der
  Kieferknochen die Lippen genau aufeinander.
- **Risiko:** hoch; hier ist am meisten Entwurf offen (Anhang A.6). Deshalb zuerst ein Beweis an einer Form: Maul anlegen, Loop
  um den Unterkiefer, öffnen und schließen.

**Nachtrag 13.11. nachmittags: Schritt 6 kommt vor Schritt 5** (Florian nach dem Beweis zu den Posen: „ja, dann erst das
Maul“). Zuerst Entwurf und kleiner Beweis in Bildern; gebaut wird erst nach seinem Wort.

**Entwurf** (was feststeht und was der Beweis klären soll):
- **Die Haut:** Beim Anlegen wird das Rechennetz längs der Maullinie aufgetrennt. Die verborgene Fläche der Öffnung fällt weg;
  an die Oberlippe kommt der Gaumen, an die Unterlippe der Boden, beide als Haut. Zwischen den Mundwinkeln treffen sie sich. Das
  ist die Form, die die Anzeige heute nur einsetzt (`maulAmLoop`); neu ist, dass sie zur Haut gehört. Die Haut bleibt
  geschlossen: Das Maul ist eine Tasche.
- **Die Linien:** Die Maullinie bleibt ein Ring. Oberlippe und Unterlippe sind ihre beiden Stücke, der Mundwinkel ist der Punkt
  dazwischen (eine Ecke). In die Höhle gehört die Mittellinie: Sie läuft von der Oberlippe über den Gaumen nach hinten und über
  den Boden zur Unterlippe und hält so die Tiefe. Hat die Form keine Mittellinie, legt „Maul anlegen“ sie an. Weitere Linien in
  der Höhle sind gewöhnliche Loops (auch der Loop um den Unterkiefer). Die Lippen beginnen mit Kante an.
- **Bezugsstellung:** Gerechnet wird, wie die schmale Form gezeichnet ist: Die Lippen liegen leicht auseinander. „Zu“ ist der
  zurückgedrehte Kiefer in der Anzeige.
- **Knochen:** wie heute aus dem Maulschnitt. Der Boden dreht ganz mit dem Unterkiefer, der Gaumen mit dem Schädel, die Linie
  zwischen den Mundwinkeln ist die Achse.
- **Folge für die Posen (Schritt 5 danach):** Eine Pose wird in der gezeigten Lage gerechnet (Maul offen, nichts liegt
  aufeinander) und zurückgedreht gespeichert.
- **Offen, nach dem Beweis mit Bildern zu entscheiden:** wie tief die Höhle ohne weitere Linien wird; ob die Lippen beim Schließen
  genau aufeinander liegen; was mit Linien geschieht, die über die Maulstelle liefen; Zeichnen auf Stellen, die innen liegen;
  Zähne und Zunge später.

**Kleiner Beweis im Kern** (Probe `form-maul-haut.ts`, ein Bildblatt; im Fenster ändert sich nichts; Aufwand ein Tag; hält er
danach nicht: anhalten und es sagen). Form: dieselbe Kugel mit Ring und Maul wie beim Beweis zu den Posen
(`formen/pose-maul-kugel.eewesen`). **Kriterien, vorher festgelegt:**
1. **Das Maul ist Haut:** Nach dem Anlegen ist die Haut geschlossen und spiegelgleich, nichts ist umgeschlagen, die Lippen
   liegen auf ihrer Linie.
2. **Die Höhle hält:** Die Rechnung der Grundform kommt zur Ruhe, und die Höhle bleibt eine Höhle: Gaumen und Boden durchdringen
   sich nicht und stülpen sich nicht nach außen (Schnitt durch die Mitte im Bild). Außen bewegt das Anlegen die Haut höchstens
   um 1 (Halbmesser 150).
3. **Loop um den Unterkiefer:** Ein Schnitt quer durch den Unterkiefer gibt einen Ring außen ums Kinn und innen über den Boden;
   an ihm lässt sich ziehen, ohne dass etwas umschlägt.
4. **Öffnen und Schließen:** Mit dem Kiefer gedreht (30° offen; zu, so weit die Lippen reichen) ist nichts offen und nichts
   umgeschlagen.
5. **Zug an der Lippe bei offenem Maul** (daran sind die Posen gescheitert): Unterlippe 25 nach unten und 25 nach oben, in der
   gezeigten Lage gerechnet. Mit den Lippen als Kante: nichts umgeschlagen, der Kopf verzieht sich nicht (Haut fern vom Maul
   höchstens 1 bewegt), Linien höchstens 0,5 neben ihrem Pfad. Ohne Kante wird dasselbe gemessen und gezeigt.

**Ergebnis (13.11., 16:45 Uhr): Der Beweis hält nicht; angehalten bei Kriterium 2.** Bild
`docs/progress/editor/schritt6-maul-haut-2026-11-13.jpg`, Zahlen `schritt6-maul-haut-messung-2026-11-13.txt`, Einzelheiten in
`docs/UEBERGABE.md`, Abschnitt 7.7.
- **Kriterium 1 hält:** Das Maul lässt sich als Haut einschweißen: geschlossen, spiegelgleich, nichts verdreht, die Lippen genau
  auf ihrer Linie (3 062 Punkte, nach dem Vergleichmäßigen des Netzes 2 147).
- **Kriterium 2 hält nicht: Die Rechnung der Grundform hält keine Höhle.** Geprüft in acht Fassungen (Höhle gewölbt wie in der
  Anzeige von heute oder flach; je auf dem feinen Gitter mit den Lippen als Kante und auf dem vergleichmäßigten Netz mit glatten
  Lippen, mit Kante, mit Kante und der Mittellinie durch die Höhle). In jeder hält die Vorsicht die Rechnung nach acht Runden
  an, die Höhle ist dann weit auseinandergelaufen. Runde für Runde angesehen (drei Fassungen): Freie Punkte der Höhle bewegen
  sich schon in der ersten Runde 37 bis 98 weit. Mit glatten Lippen reißt die Höhle die ganze Form mit; mit den Lippen als
  Kante bleibt das Äußere nur auf dem feinen Gitter stehen. Wo es beginnt: bei der gewölbten Höhle mitten im Gaumen, bei der
  flachen hinten, wo Gaumen und Boden zusammenlaufen.
- **Kriterium 3 zur Hälfte:** Der Schnitt quer durch den Unterkiefer gibt den Ring außen ums Kinn und innen über den Boden. Der
  Kern setzt ihn aber an keiner von neun Stellen ins Netz ein (Ursache nicht untersucht); gezogen wurde deshalb nicht.
- **Kriterien 4 und 5** sind nicht mehr gerechnet.

Warum: Die heutige Rechnung macht die Haut zwischen den Linien so rund wie möglich und nimmt die Krümmung dafür an den Linien von
der Haut selbst ab. Eine Höhle ist eine tief eingestülpte Fläche mit einem Knick hinten und an den Mundwinkeln; ohne Linien, die
sie überall fassen, hat die Rechnung dafür kein Gleichgewicht. Das ist dieselbe Schwäche wie „bläst auf oder kollabiert“
zwischen wenigen Linien, hier in ihrer härtesten Form. **Folgerung: Das Maul als Tasche in derselben Haut geht mit der heutigen
Rechnung nicht.** (**Diese Folgerung ist falsch**, siehe die Berichtigung unten: Geprüft war meine Konstruktion, nicht ein
Maul, das wie jede Form mit Linien geformt ist.) Offen ist Florians Entscheidung zwischen: (1) das Maul bleibt wie heute, die Maullinie wird eine Kante, und
die Posen werden damit gebaut (Fassung b aus dem Beweis zu Schritt 5); (2) der Unterkiefer wird ein eigenes Teil mit eigener
Haut und eigenen Linien, zusammen mit „Teile anfügen“ (eigener Entwurf zuerst); (3) inzwischen Schritt 4c.

**Berichtigung zu den Beweisen der Schritte 5 und 6 (13.11., 17:15 Uhr).** Florian zum Ergebnis: „Ich verstehe das Problem nicht.
Ich kann doch jedes beliebige Maul auch mit dem jetzigen Mesh von Hand formen, und es kollabiert nichts, und es wird nichts
komisch aufgeblasen. Ich denke, du verkomplizierst da etwas oder hast mich missverstanden.“ Und zu den Posen: „Ich verstehe, dass
ich keine neuen Edgeloops oder Punkte in der Pose hinzufügen kann, aber verschieben und bearbeiten sollte ich alles ohne Probleme
können. Dann ist es ja ein einfacher Morph der Punkte und Handles von einer zur anderen Position, während die Kieferknochen sich
bewegen.“ Er hat seine Form `wesen/maul handgemacht test.eewesen` gesichert: ein Maul, von Hand geformt (zwei Kiefer, dazwischen
die Bucht), mit der Lippenlinie als Kante und je einem Loop nur um den Ober- und den Unterkiefer.

**Er hat recht. Beide Beweise haben das Falsche geprüft:**
- Der Beweis zu Schritt 6 hat ein fertiges, fast geschlossenes Inneres auf einmal eingeschweißt (dünn, mit einem Knick hinten,
  fast ohne Linien) und die Rechnung darauf losgelassen. Ein Maul, das wie jede Form mit Linien geformt wird, hält die Rechnung:
  Gegenprobe `form-maul-geformt.ts` (Kugel, der Punkt vorn 110 nach innen gezogen): steht nach 84 Runden, nichts umgeschlagen;
  Bild `docs/progress/editor/schritt6-maul-geformt-2026-11-13.jpg`. Seine Form steht (0,07 bis zur Ruhe).
- Der Beweis zu Schritt 5 ist an der verborgenen Fläche gescheitert, die nur das Maul aus der schmalen Form hat. An seiner Form
  gibt es sie nicht. Gegenprobe `form-pose-geformt.ts` (Unterkiefer 20° weiter offen, ein Punkt der Unterlippe 25 nach unten,
  25 und 70 nach oben, ein Punkt fern vom Maul; Rechnung der Grundform, unverändert): steht nach 42 bis 54 Runden, Linien genau
  auf ihren Pfaden, fern vom Maul bewegt sich nichts (0,00), keine neuen umgeschlagenen Dreiecke außer beim weiten Zug (8). Bild
  `docs/progress/editor/schritt5-pose-geformt-2026-11-13.jpg`, Zahlen `schritt5-6-gegenprobe-geformt-messung-2026-11-13.txt`.

**Was daraus folgt:**
- **Das Maul ist, was er formt.** Was er am 12.11. verlangt hat (echte eigene Geometrie, Loops nur um einen Kiefer, Kiefer nicht
  mehr an den alten Linien, exakt auf den Kurven), hat ein von Hand geformtes Maul schon. Eine eingeschweißte Höhle braucht es
  dafür nicht.
- **Was am geformten Maul fehlt, ist die Maul-Funktion.** „Fressen“ und die Regler kennen heute nur die schmale Form: Sie würden
  an seiner Form die Innenseiten der Kiefer als Öffnung wegschneiden (622 Dreiecke) und ein eigenes Inneres einsetzen. Die
  Gewichte der Knochen lassen sich aus seiner Lippenlinie schon lesen (Gelenk am Mundwinkel, der Unterkiefer dreht als Ganzes);
  an der Spitze des Unterkiefers, wo die Lippenlinie endet, knickt die Haut dabei (im Bild oben; beim Öffnen 4, beim Schließen
  20 umgeschlagene Dreiecke mehr).
- **Schritt 6, neu gefasst (klein):** die Maul-Funktion für ein geformtes Maul. Die Lippenlinie wählen, „Fressen“: Gelenk und
  Gewichte, nichts wird geschnitten, nichts eingesetzt; der Knick an der Kieferspitze wird behoben. Das Maul aus der schmalen
  Form bleibt daneben, wie es ist.
- **Schritt 5 wie im Nachtrag oben** und in seinen Worten: Eine Pose ist dieselbe Form mit anderen Lagen der Punkte und Griffe,
  dazu die Knochen. Die Fassungen (b) und (c) und die Frage nach der Kante am Maul entfallen für ein geformtes Maul.
- Reihenfolge: zuerst Schritt 6 neu (ohne Knochen gibt es an seiner Form keine Pose), dann Schritt 5. Gebaut wird im Bau-Fenster
  nach seinem Wort.

**Schritt 6, wie Florian ihn beschreibt (13.11., 17:30 Uhr): Das Maul entsteht automatisch an der gewählten Linie, als Form wie
von Hand.** Florian: „Das Maul soll aber an einem gewählten Edgeloop immer noch automatisch entstehen. […] Im Grunde machst du
ja nur die Kante hart und verbindest von der Seite die gegenüberliegenden Seiten. Das sollte automatisch passieren können. Das
Maul ist dann einfach eine Form wie von Hand gemacht, nur automatisiert. Ich kann weitere Edgeloops auch im Inneren einziehen und
später Zahnfleisch, Zähne und Zunge genau einstellen. (Zähne und Zahnfleisch und Zunge machen wir jetzt noch nicht.) […] Die
Spiegelkante ist zur Stabilisation der Form ja sowieso schon von Anfang an gegeben.“

**Geprüft und gehalten** (Probe `form-maul-automatisch.ts`, Bild `docs/progress/editor/schritt6-maul-automatisch-2026-11-13.jpg`,
Zahlen `schritt6-maul-automatisch-messung-2026-11-13.txt`): Das Maul wird nicht hineingebaut, sondern geformt, wie eine Hand es
täte; es wird nur an Linien gezogen, die Haut folgt der Rechnung der Grundform Schritt für Schritt.
1. Die gewählte Maullinie wird eine Kante (die Lippen).
2. Die Mittellinie ist da (sonst wird sie angelegt). Dazu kommt eine Querlinie durch beide Mundwinkel: ein Ring um den Kopf in
   der Ebene des Mauls. Er kreuzt die Mittellinie vorn zwischen den Lippen und die Maullinie in den Mundwinkeln. Sein Stück
   dazwischen ist die Verbindung der gegenüberliegenden Seiten; es ist hart.
3. **Durchstanzen** (Florian zum ersten Bild, 13.11., 17:35 Uhr: „Das Maul sieht aber auf deinen Bildern noch falsch aus. Es
   soll aussehen, als wäre der Edgeloop von der Seitenansicht durchgestanzt mit genau der Form des Maulloops von der Seite. Das
   heißt, die Mittellinie muss von der Seite exakt den Shape der Maullinie haben. […] Aber der Weg ist grundsätzlich richtig“):
   Die Mittellinie bekommt im Maul die Punkte und Griffe der Maullinie, flach auf die Mittelebene gelegt; die Kreuzung vorn
   wandert dabei zwischen die Mundwinkel, das Stück der Querlinie bis zum Mundwinkel wird gerade. Gezogen wird in Stufen,
   unterwegs wird verfeinert wie nach jedem Zug. Aus der Fläche zwischen den Lippen werden Gaumen und Boden. (Die erste Fassung
   zog nur die Kreuzung nach innen; die Mittellinie lief dann als gerades V nach hinten.)

Ergebnis an der Kugel mit Maullinie (8 Stufen zu 8 Schritten): Die Haut steht, nichts ist umgeschlagen, die Vorsicht greift nie
ein, die Linien liegen auf ihren Pfaden (0,08). **Die Mittellinie liegt im Maul höchstens 0,27 neben der Maullinie von der
Seite.** Die Flächen zwischen Lippe und Mitte weichen von der durchgestanzten Form noch bis 9,8 ab (im Mittel 2,4): Dort liegt
noch keine Linie, die Rechnung rundet. Außen bewegt sich die Haut bis 3,0 (mit dem Verfeinern unterwegs; ohne waren es 0,02).
Danach lassen sich Loops nur um den Unterkiefer und nur um den Oberkiefer schneiden und einsetzen (steht nach 7 Runden, nichts
umgeschlagen), und der Kieferknochen öffnet das Maul um 30° ohne umgeschlagene Dreiecke. Zum Vergleich: Dieselbe Form auf einmal hineingebaut (`form-maul-haut.ts`) kommt nicht zur
Ruhe, auch mit der Verbindung hinten als harter Linie (die Vorsicht hält nach acht Runden an). Der Unterschied ist das Formen in
Schritten, nicht die Form.

**Offen aus der Probe:** eine Form, nur im Kern. Die Flächen innen sind noch nicht genau durchgestanzt (bis 9,8 daneben);
Vorschlag: an jedem Punkt der Maullinie eine Querlinie wie am Mundwinkel (innen gerade von der Lippe zur Mitte, außen ein Loop
um den Kiefer), dann spannt die Rechnung dazwischen nur noch kurze Stücke. Die Maullinie bekommt am Mundwinkel einen zweiten
Punkt dicht neben dem vorhandenen (die Kreuzung mit der Querlinie muss den Mundwinkel selbst nehmen). Die Gewichte innen sind in der Probe grob (Boden ganz, Gaumen gar nicht);
geöffnet ist die Fläche hinten am Gelenk deshalb zackig. Glatte Lippen (Kante aus) sind nicht geprüft.

**Etappen** (Bau-Fenster, jede mit Bildpaar; in Florians Fenster erst nach seinem Wort):
1. **„Maul“ formt automatisch:** im Kern eine Funktion für die drei Schritte oben (mit Verfeinern im Zug), im Fenster am
   gewählten Ring. Nichts wird mehr geschnitten oder eingesetzt. **Probe:** die Zahlen oben im Fenster, und eine seiner Formen.
2. **Kieferknochen am geformten Maul:** Gelenk an den Mundwinkeln, Gewichte außen wie heute, innen weich vom Boden zum Gaumen;
   „Fressen“ und die Regler darauf. Gilt auch für ein von Hand geformtes Maul (Lippenlinie wählen); dort den Knick an der
   Kieferspitze beheben. **Probe:** seine Form „maul handgemacht test“ und das automatisch geformte Maul, zu und offen.
3. **Danach Schritt 5** (Posen als Morph der Punkte und Griffe mit den Knochen).

Das Maul aus der schmalen Form mit eingesetztem Inneren (die Anzeige von heute) bleibt für gesicherte Formen bestehen, bis er
entscheidet.

### Schritt 7: Auswahl wie in Blender (2 bis 3 Tage)

- **Was du danach siehst:** Du wählst Punkte, **Kanten** (das Linienstück zwischen zwei Punkten) und **Flächen** (das Feld
  zwischen den Linien). Ein Doppelklick auf eine Linie wählt den ganzen Loop. G, S und R wirken auf die Auswahl.
- **Zu klären** (Entscheidung 3): Doppelklick auf eine Linie setzt heute einen neuen Punkt. Der bekäme einen anderen Griff
  (Vorschlag: ⌘-Klick auf die Linie oder der Stift).

### Danach (nicht in diesem Plan)

**Vorher fertig sein muss Schritt 4c** (der Rest der halben Haut, oben): Florian braucht das Tempo für Shader, Materialien,
Fell und Zusatzteile.

Auswuchs und Teile anfügen (dort Lofts für Schläuche, Beweis „Schwanz als Loft mit weichem Übergang“), Formen addieren und
abziehen, Backen fürs Spiel (≤ 8 000 Dreiecke; mit dem kleinen Rechennetz liegt das Spielnetz schon fast vor), die
Werkzeugliste der Gegenprüfung (Präzision im Zug, verdeckte Linien blass), das Layout von `/editor`.

## 5. Entscheidungen für dich

Zu jeder steht meine Empfehlung; „alles wie empfohlen“ genügt.

1. **Plan und Reihenfolge freigeben?** Empfehlung: ja, mit Schritt 0 und 1 beginnen.
2. **Aufräumen (Anhang B):** eine Linie `claude/form-spiegel`; die 13 alten Arbeitsbäume löschen (rund 8 GB, die Zweige
   bleiben; ungespeicherte Reste sichere ich vorher als Zweig); Gedächtnisdateien kürzen, der alte Text wandert ins Archiv.
   Empfehlung: ja.
3. **Auswahl:** „Kante“ = Linienstück zwischen zwei Punkten, „Fläche“ = Feld zwischen den Linien, Doppelklick auf eine Linie =
   ganzer Loop; ein neuer Punkt auf einer Linie dann mit ⌘-Klick. Meinst du es so?
4. **Verschmelzen an der Mitte:** Empfehlung wie Blenders Mirror: Die Naht entsteht und vergeht von selbst, solange du ziehst
   und auch später (zurückziehen löst sie wieder). Eine feste Linie mit Punkten wird sie erst, wenn du sie doppelklickst oder
   die Spiegelung anwendest. Die Alternative wäre: schon beim Loslassen eine feste Linie.
   **Florian am 13.11. (nach dem Donut-Beweis), ersetzt die Empfehlung:** „Ich hätte mir vorgestellt, dass beim Donut an den
   neuen Kreuzungen Punkte ohne Knick entstehen und so der Donut wirklich ohne harte Kante entsteht. […] Der Punkt, den man über
   die Mitte zieht, soll nur während des Zuges noch sichtbar sein, aber vom ‚neuen‘ Mesh mit dem neuen Edgeloop des Lochs gelöst.
   Beim Loslassen verschwindet er, und es gibt kein Zurückziehen. So ähnlich ist es bei Blender, wenn Clipping beim Mirror
   Modifier eingestellt ist.“ Es gilt also: beim Loslassen endgültig an der Mitte geschnitten, der Rand des Lochs ein neuer
   Edgeloop mit glatten Punkten an den neuen Kreuzungen, kein Zurückziehen (⌘Z bleibt).
   **Florian am 13.11. mittags (nach dem zweiten Donut-Beweis), ändert seine Regel:** „Ich glaube, ich habe eine bessere
   Regeländerung, die Springen vermeidet. Der neue Loop soll nicht gleich rund sein, sondern wie vorher eine Kante. An den neuen
   Kreuzungen bilden sich Punkte, und der durch die Mitte gezogene Griff bleibt sichtbar, aber ist markiert. Ich kann ihn auch
   löschen, dann ist kein Rückführen mehr möglich. Wenn ich die Kante dann selektiere und ihre Kantigkeit auf 0 stelle, erhalte
   ich ja den runden Donut. Wäre das eleganter? Oder habe ich einen Denkfehler?“ Damit gilt (seine Zusage zur Antwort steht
   aus): Ziehen und Loslassen bleiben wie heute (die Hälften treffen sich an einer Kante, zurückziehen geht); an den Kreuzungen
   der Linien mit der Mitte erscheinen Punkte, der gezogene Punkt ist markiert; erst sein Löschen macht den Schnitt fest; der
   Rand des Lochs ist dann ein Loop mit Kante; rund wird er mit „Kante aus“.
5. **Posen speichern ihre Linien**, nicht mehr die Verschiebung je Netzpunkt (Schritt 5). Empfehlung: ja. Alte Test-Posen in
   gesicherten Formen werden dabei nicht übernommen.
6. **`/editor` (Blaupause-Layout)** wird während der Schritte 1 bis 7 nicht nachgezogen, danach einmal in einem Zug.
   Empfehlung: ja.

## 6. Arbeitsweise (damit das Budget hält)

- **Keine Messreihen im Hintergrund, keine Fächer aus Agenten.** Geprüft wird im Vordergrund, gebündelt, mit kurzer Ausgabe.
- **Jeder Schritt hat genau eine sichtbare Probe**, die vorher feststeht: ein Bild deiner Formen vorher und nachher oder ein
  Lauf im Fenster. Mehr gemessen wird nur, wenn etwas kaputtgeht.
- **Vergleichsbild vor dem Einbau** bei allem, was man sehen kann (Schritte 1, 3, 4, 6).
- **Hält ein Beweis nach dem geschätzten Aufwand nicht, halte ich an** und sage es, statt weiter zu suchen.
- **Gebaut wird nie unter deinem Fenster.** 5194 bleibt, wie es ist, bis du einen Schritt gesehen hast; ich sage vorher, wann es
  sich ändert.
- **Die Gedächtnisdateien werden klein gehalten** (Schritt 0): `CLAUDE.md` hat auf diesem Zweig 271 KB und wird in jeder
  Sitzung ganz gelesen.
- Nach jedem Schritt: committen, pushen, drei Sätze an dich (was sich an deiner Form geändert hat, was bleibt).

## 7. Was ich nicht weiß

- Ob A bei wenigen Linien trägt (Schritt 3 klärt es; die Literatur zeigt es nur für geschlossene, eher dichte Liniennetze).
- Wie stark die heutige Rechnung auf dem kleinen Netz anders aussieht (Schritt 2 zeigt es als Bild).
- Ob das Verschmelzen an der Mitte beim Hin- und Herziehen ruhig bleibt (Donut-Beweis in Schritt 4).
- Wie viel die Blätter (drei Zeichnungen und die Linienbänder) je Bild kosten; das wird in Schritt 1 einmal gemessen.
- Die Aufwände sind Schätzungen. Zusammen sind es etwa 19 bis 29 Arbeitstage; die Schritte 0 bis 3 etwa eine Woche.

---

## Anhang A: Technik für die bauende Sitzung

### A.1 Anzeige (Schritt 1)

Zwei Bauarten, das Vergleichsbild entscheidet:

- **Unterteilung (Loop, zwei bis drei Stufen).** Die Verfeinerung ist eine dünn besetzte Matrix (fein = S · grob); sie wird
  nur bei einem Netzwechsel neu gebaut (im Worker) und je Bild einmal angewendet (bei 3 000 Rechenpunkten und 48 000
  Anzeigepunkten wenige Millisekunden, geschätzt). Damit die Fläche nicht nach innen rutscht (gewöhnliche Unterteilung: Körper 0,4,
  dünnes Horn 1,7 Einheiten), werden die Rechenpunkte vor dem Unterteilen um ihren Abstand zur eigenen Grenzlage nach außen
  versetzt (ein bis zwei Durchgänge; die Grenzfläche geht dann durch die Rechenpunkte). Harte Linien: Knickregel längs der
  Kette. Linienpunkte jeder Stufe: aus dem Bézier-Pfad. Normalen aus dem feinen Netz. Vorteil: Farbstufen laufen glatt, weil
  auch die Normalen glatt sind (wie Subsurf).
- **Gekrümmte Dreiecke im Shader (PN-Dreiecke).** Je Rechendreieck zehn Kontrollpunkte aus Ecken und Normalen; Kanten auf einer
  Linie bekommen die Kontrollpunkte des exakten Pfadstücks (ein Stück eines kubischen Béziers ist wieder ein kubischer
  Bézier). Ausgewertet wird im Vertex-Shader über ein festes Gitter je Dreieck (Instanzen; WebGL 2 hat keine
  Tessellation-Stufe). Vorteil: einfach, Linien exakt, nichts schrumpft. Nachteil: Die Normalen sind nur stetig, die Grenze
  einer Farbstufe kann an groben Kanten leicht knicken.

Für beide: die geglättete Stufe `stufe(x, t) = smoothstep(t − w, t + w, x)` mit w = 0,85 · fwidth(x) (steht in
`form/blaupause.ts`), `MeshToonMaterial` in `kurven.ts` wird dafür ersetzt; Spiegelebene als Schnittebene des Materials statt
`anzeigeZ`; das Maul-Innere läuft durch dieselbe Anzeige; Strahltreffer (Zeichnen, Greifen auf der Haut) gegen das feine Netz,
zurückgerechnet auf Dreieck und Gewichte des Rechennetzes.

**Nachtrag 12.11. (Vergleichsbild):** Keine der beiden Bauarten allein. Die gekrümmten Dreiecke halten Linien und Grate sauber,
ihre eigenen Normalen geben aber kleine Wellen an jeder Dreieckskante. Die Unterteilung gibt ruhige Farbstufen, schwingt an
scharfen Graten aber über die Linie. Empfohlen und im Bild gezeigt ist die Verbindung: Form der gekrümmten Dreiecke (ohne Glätten
verfeinert), Schattierung mit den Normalen der gewöhnlichen Unterteilung. Stand und Bilder: `docs/UEBERGABE.md`, Abschnitt 4.

**Nachtrag 12.11. abends (Einbau):** Im Fenster gebaut hinter `&anzeige=glatt` (Bau-Zweig). Beim Einbau zeigte sich: Die Wellen
in den Farbstufen kamen vor allem aus den Normalen des ungleichmäßigen Netzes, nicht aus der Zahl der Dreiecke. Die Normalen der
Unterteilung aus dem Vergleichsbild sitzen zudem neben den gezeigten Punkten. Gebaut ist deshalb ein Normalenfeld je Rechenpunkt
(nach Max 1999, beruhigt mit Gewichten nach den Mittelwert-Koordinaten, Floater 2003), das mit den Lagen verfeinert wird. Die
Verfeinerung dient damit dem Umriss und den Linien, die Farbstufen sind schon ohne sie ruhig. Gemessen: Die Anzeige kostet im
Zug 2 bis 3 ms je Bild, das Tempo bestimmt die Löserrunde (Schritt 2). Einzelheiten: `docs/UEBERGABE.md`, Abschnitt 4.

**Nachtrag 12.11. spätabends (Standard):** Florian: „Ja, übernehmen“. Die glatte Anzeige ist seitdem der
Standard von `kurven.html` und liegt auf der gemeinsamen Linie (sein Fenster auf 5194). `&anzeige=grob` zeigt zum Vergleich die
Anzeige davor.

### A.2 Rechennetz (Schritt 2)

- `DREIECKE` (heute 6 000 bestellt, rund 5 200 Punkte an der Kugel) auf etwa ein Drittel. Die Schwellen in
  `dicht/verdichten.ts` hängen an der mittleren Startkante und gehen mit.
- Dichte nach Bedarf: an Linien nach dem Sehnenfehler gegen den Pfad (`GENAU`), zwischen eng benachbarten Linien mindestens
  zwei Kanten. Obergrenze für die Gesamtzahl.
- Schalter für die alte Dichte bleibt, bis Schritt 3 entschieden ist.

**Nachtrag 12.11. nachts (gebaut im Bau-Zweig):** Das Startnetz hat ein Drittel der Dreiecke; Formen mit feinerem Netz werden
beim Laden vergröbert (die Punkte, die bleiben, bleiben an ihrem Ort). Ein überall gleich grobes Netz reichte nicht: Deine drei
Formen sahen gleich aus, aber ein kleines Detail (das Ohr vom 08.11.) fiel flach auf seine Linie. „Dichter nach Bedarf“ ist
deshalb die Verfeinerung nach der Krümmung der Haut geworden (den Schalter gab es seit dem 08.11. als Versuch; nach der
Geometrie gerechnet halten auch die weiten Züge), mit eigener Genauigkeit von 1/16 der Startkante. Damit bleiben an deinen
Formen rund 40 % der Punkte statt eines Drittels; im Zug sind es 16 bis 20 ms je Bild statt 24 bis 44 ms, nach dem Loslassen
ruht alles nach 0,2 bis 0,9 s statt nach 0,6 bis 2,2 s. Die Regel „zwischen eng benachbarten Linien mindestens zwei Kanten“
und das Zeichnen gegen die feine Fläche sind nicht gebaut. `&netz=dicht` ist das Netz wie vorher. Einzelheiten und Zahlen:
`docs/UEBERGABE.md`, Abschnitt 5. Florian noch in der Nacht: „ja“; seitdem ist das kleine Rechennetz der Standard in seinem
Fenster.

### A.3 Beweis „Haut direkt aus den Linien“ (Schritt 3)

Nur im Kern (`packages/shape/src/dicht/`, eigene Datei, eigene Messskripte), nichts am Fenster. Gebaut am 09.11. und verworfen
wurde etwas anderes: die Richtung über eine Krümmungsmessung je Seite an den Linienpunkten, in den Runden der alten Rechnung,
auf dem dichten Netz. Hier geht die Richtung als Angabe ein, an der Haut wird nichts gemessen.

**Eingaben:** Rechennetz, Linien als Kantenketten, Ziele der Linienpunkte (Pfad), Richtung je Linienpunkt (`linienRichtung`),
Kante an/aus.

**Rechnung** (jede Lösung mit einer einmal zerlegten Matrix, je Bild nur Einsetzen):

1. **Normalenfeld.** Die Richtungen der Linien werden über die Haut verteilt.
   - Bauart 1 (Stanko u. a. 2016): je Komponente glatt verteilen, danach auf Länge 1. Reicht, wo die Linien dicht genug sind.
   - Bauart 2 (für wenige Linien): schrittweise glätten und nach jedem Schritt auf Länge 1 bringen, Start sind die Normalen der
     Haut, wie sie ist. Der Start bestimmt nur, auf welcher Seite die Haut liegt (Kuppel nach außen), nicht die Form. Auf der
     Hälfte liefert die Spiegelebene den Rand (Normale in der Ebene).
   - An harten Linien hat jede Seite ihre eigene Richtung; über die Linie wird nicht verteilt.
2. **Wölbung aus dem Normalenfeld** (H = −½ div n). Sie hat damit eine Richtung: Ein Schlauch mit radialen Normalen bleibt ein
   Schlauch.
3. **Lagen:** Laplace der Lagen = 2 H n (dazu ein kleiner Glättungsanteil wie bei Stanko), Linienpunkte auf dem Pfad. Der
   Operator stammt aus der Lage beim Greifen und wird nach dem Loslassen einmal im Hintergrund neu gebaut; wie viel sich die
   Haut dabei noch bewegt, ist das Maß für „justiert nach“.

**Fälle und Kriterien** (je ein Lauf; Bilder nebeneinander für Florian):

| Fall | Kriterium |
| --- | --- |
| Kugel nur mit Mittellinie | bleibt Kugel, höchstens 1 % vom Radius |
| Kugel mit drei Loops | höchstens 0,5 Einheiten |
| Schlauch mit drei Ringen, auf doppelte Länge gezogen | Dicke ändert sich höchstens 2 % |
| Rüssel aus zwei Profillinien | Querschnitt Höhe zu Breite mindestens 0,8 |
| Horn am „strange bird“ um 70 Einheiten verlängert | nicht dicker, nicht eingefallen (Bild) |
| ein Punkt hinaus und zurück | dieselbe Haut (höchstens 0,05 Einheiten) |
| dasselbe auf einem Viertel der Punkte | höchstens 0,18 Einheiten (½ Bildpunkt bei 300 %) an Kugel und Schlauch; an seinen Formen als Bild |
| Operator neu gebaut | Haut bewegt sich höchstens 0,18 Einheiten |
| Firefish, test_kaputt | keine umgestülpte Stelle, die die heutige Rechnung nicht auch hat |

**Abbruch:** Hält Bauart 2 Kugel und Rüssel nicht, ist A für den Anfang einer Form (wenige Linien) nicht tragfähig. Dann bleibt
die heutige Rechnung; die lineare Rechnung aus A taugt noch als Sofort-Antwort (Weg D).

**Nachtrag 13.11. (gerechnet, `dicht/direkt.ts`, Probe `form-direkt.ts`):** Gebaut ist Bauart 2 (in jedem Durchgang auf Länge 1)
und für die Lagen statt „Laplace = 2 H n“ je Kante die Zeile „Kante senkrecht auf dem Mittel der Normalen ihrer Enden“
(dieselbe Aussage, aber die Wölbung steht mit den neuen Lagen in der Gleichung; so bleibt keine alte Dicke stehen). Ergebnis
gegen die Tabelle: Kugel nur mit Mittellinie 0,14 % (hält), Kugel mit drei Loops 0,43 wie das Startnetz (hält), Schlauch
gestreckt −0,2 % (hält, aber die Enden werden keilförmig), Rüssel 0,36 (hält nicht), Horn umgestülpt (hält nicht), hin und
zurück 0,0002 (hält), Firefish und test_kaputt 112 und 10 umgestülpte Dreiecke gegen 0 (hält nicht). Der Abbruch gilt: A ist
für wenige Linien und für die vorhandenen Formen nicht tragfähig. Zwei Gründe, beide gemessen: Gleichmäßig verteilte Normalen
gehören zu einer Fläche mit überall gleicher Wölbung, und `linienRichtung` weicht an seinen Formen bis 68° von der Haut ab.
Die zweite Hälfte allein (Lagen aus den Linien und den Normalen der Haut) hält dagegen an allen vorhandenen Formen; Zahlen im
Bericht `docs/research/2026-11-13-beweis-haut-direkt.md`.

**Zweiter Beweis „B“ (13.11., Florian: „ok, prüfe B“), vor dem Bauen festgelegt.** Wieder nur Kern und Bilder.

Was B heißt: Ziehen an fertiger Haut rechnet die zweite Hälfte (Lagen direkt aus den Linien, die Wölbung der Haut bleibt).
Neue Haut rundet die heutige Rechnung, und zwar nur dort, wo das Verdichten neue Punkte gesetzt hat, weil die Haut gedehnt
wurde; alles andere steht dabei fest. Dazu kommen zwei Ergänzungen an B: Dreht eine Linie, drehen die Normalen der Haut mit
(die Drehung der Linien wird über die Haut verteilt). Und die Haut, wie sie beim Anfassen ist, ist genau die Lösung für
unbewegte Linien (was die Zeilen an ihr nicht erfüllen, bleibt als rechte Seite stehen); dann gibt es nichts, was sich beim
Anfassen oder Loslassen bewegen könnte, und die Normalen müssen kein eigener gemerkter Stand sein.

| Fall | Kriterium |
| --- | --- |
| Rüssel aus zwei Profillinien, aus der Kugel gezogen (8 Schritte) | Querschnitt Breite zu Höhe zwischen 0,8 und 1,25, nichts umgestülpt |
| derselbe Rüssel danach um die Hälfte verlängert (gleichmäßig gestreckt) | Breite und Höhe in der Mitte ändern sich höchstens 3 % |
| Horn am „strange bird“ um 70 verlängert | Dicke höchstens 3 % anders (wie im ersten Beweis, jetzt mit Drehen und Runden) |
| dasselbe Horn um 30° gebogen | keine neuen Knicke über 60°, nichts umgestülpt, Dicke höchstens 3 % anders (Bild gegen heute) |
| hin und zurück (Horn) | dieselbe Haut (höchstens 0,05) |
| nach dem Loslassen: neu angelegt, Linien unbewegt | Haut bewegt sich höchstens 0,18 |
| seine drei Formen angefasst, nichts gezogen | Haut bewegt sich nicht (höchstens 0,05) |

**Abbruch:** Wird der Rüssel so nicht rund oder knickt das gebogene Horn, bleibt es bei der heutigen Rechnung (Weg 1 aus dem
Bericht).

**Ergebnis (13.11.):** Der Abbruch gilt für das Erzeugen: Der Rüssel wird so nicht rund (B allein 1,96), und die heutige
Rechnung lässt sich nicht auf einen Teil der Haut beschränken (kommt nicht zur Ruhe, stülpt um, läuft davon). Die übrigen
Fälle hält B: Anfassen, Loslassen und hin und zurück auf ein Zehnmillionstel, das gebogene Horn ohne neue Knicke; die Dicke
bleibt bis auf 1 bis 5 % (heute 6 bis 16 %), das Kriterium von 3 % ist an einzelnen Stellen knapp verfehlt. B ist damit ein
genaues Werkzeug für fertige Haut, kein Ersatz für die heutige Rechnung. Zahlen und Bilder im Bericht, Abschnitt „Zweiter
Beweis“. Offen ist Florians Entscheidung: weiter nach Plan, oder B als Schalter im Bau-Fenster ausprobieren.

**B als Schalter im Bau-Fenster (13.11., Florian: „B ausprobieren“), vor dem Bauen festgelegt.** Nur im Bau-Fenster (5197,
`claude/form-bau`); sein Fenster (5194) bleibt, wie es ist.

- **Was er bekommt:** in `kurven.html` einen Schalter „Form halten“ (Knopf und Taste H, auch `&ziehen=direkt`). An: Ziehen an
  Punkten und Griffen rechnet B (die Haut folgt den Linien direkt, nichts rundet neu, nach dem Loslassen wird nur verdichtet).
  Aus: alles wie heute. Nur in der Grundform; die Pose bleibt, wie sie ist.
- **Was gebaut wird:** B im Kern so, dass je Bild nichts neu zerlegt wird (Zeilen als feste Felder, Drehung der Normalen über
  eine einmal zerlegte Matrix, wenige Schritte Nachführen je Bild); ein Löser `direkt` im `LoopZug`; im Fenster der Schalter,
  das Vorbereiten nach jeder Änderung (damit das Greifen nicht wartet) und kein Setzen mit der heutigen Rechnung, solange der
  Schalter an ist (auch nicht nach einem neuen Loop). Im Zug wird mit B nicht verfeinert, erst nach dem Loslassen.
- **Sichtbare Probe** (ein Lauf im Bau-Fenster, `GPU=1`): „strange bird“ und „teat firefish“ laden; greifen, ohne zu ziehen
  (Haut bewegt sich höchstens 0,05); die Hornspitze 70 hinauf und zurück (höchstens 0,05 neben der Haut davor); Abstand der
  Bilder im Zug; nach dem Loslassen bewegt sich die Haut höchstens 0,18.
- **Abbruch:** Bleibt ein Zug am Firefish im Mittel über 30 ms je Bild, oder sagt Florian, es fühle sich falsch an, kommt B
  nicht weiter ins Fenster; der Code bleibt hinter dem Schalter liegen.
- **Gebaut und gemessen (13.11. vormittags):** Der Schalter liegt im Bau-Fenster. Probe: gegriffen ohne zu ziehen 0,00; hinauf und
  zurück 0,00 neben der Haut von vorher (heute bis 19,6 am „strange bird“, bis 2,1 am Firefish); Bilder im Zug im Mittel alle
  14 ms („strange bird“) und 19 ms (Firefish), heute 16 und 20 ms; nach dem Loslassen höchstens 0,35 (wo das Verdichten Punkte
  zusammenlegt), im Mittel 0,00. Der Abbruch nach der Zeit greift nicht. Einzelheiten: `docs/UEBERGABE.md`, Abschnitt 6.
- **Florians Urteil (13.11. vormittags): „Gefällt nicht“.** Damit greift der zweite Abbruch: B kommt nicht in sein Fenster. Knopf
  und Taste sind wieder entfernt, der Code bleibt hinter `?ziehen=direkt` liegen. **Schritt 3 ist abgeschlossen: Die heutige
  Rechnung bleibt.** Weiter mit Schritt 4, wie im Plan für diesen Fall vorgesehen: echte Spiegelung mit der heutigen Rechnung,
  zuerst der Donut-Beweis.

### A.4 Spiegelung (Schritt 4)

- Die Haut der Basis ist die Hälfte z ≥ 0. Randpunkte liegen bei z = 0. In den Zeilen eines Randpunkts zählen die inneren
  Nachbarn doppelt (das Spiegelbild hat dasselbe x und y), z ist dort fest 0: zwei Matrizen (x/y und z), jede halb so groß.
- `Haut.spiegel`, das Mitteln der Paare am Ende jeder Runde und die Paar-Buchführung in `verdichten.ts`/`einsetzen.ts` entfallen
  für die Basis. Ringe sind schon heute Hälften mit Enden auf der Mittelebene.
- Start: halbe Kugel, die Mittellinie ist ein Loop der Mittelebene (Rand der Hälfte). Mit der alten Rechnung hielt ein einzelner
  Loop die Haut nicht; deshalb kommt die Mittellinie mit der neuen Rechnung oder mit der Hälfte, nicht vorher.
- Über die Mitte: Punkte der Hälfte, die nach z < 0 wollen, werden auf der Ebene gehalten und zählen dort als Rand (Normale in
  der Ebene, glatter Übergang ins Spiegelbild). Zieht die Haut dort wieder nach außen, werden sie frei. Die Anzeige schneidet je
  Bildpunkt. „Feste Linie“: die Randkette als Bézier-Loop anpassen und als Linie eintragen.
- Angewendet (Pose): Netz = Hälfte plus Spiegelbild, am Rand verschweißt; feste Nummern (Spiegelbild von Punkt i ist n + i).

### A.5 Pose (Schritt 5)

- Pose = Knochen + Lagen aller Linienpunkte und Griffe (beide Seiten) + Kante an/aus wie die Basis. Reihenfolge: Knochen drehen
  die Linien der Basis starr mit (Gewichte aus dem Maul), darauf der Versatz der Pose, daraus die Haut.
- Netz der Pose = angewendetes Netz der Basis, dieselben Verbindungen. Keine Werkzeuge, die Punkte oder Loops anlegen.
- Wird die Basis feiner, bekommen die Linien der Pose die neuen Punkte durch Teilen ihres Pfads an derselben Stelle.
- `pose.delta` je Netzpunkt und der eigene Löser der Pose (`HautZiele` mit Bereich) entfallen.

### A.6 Maul (Schritt 6)

Heute (`dicht/maulLoop.ts`): Die schmale Form ist ein Loop; die Haut bleibt geschlossen, nur die Anzeige schneidet auf und
setzt Gaumen und Boden als Gewölbe ein. Darum hängen die Kiefer weiter an den alten Linien, und um einen Kiefer allein lässt
sich nichts legen.

Ziel: Beim Anlegen wird das Rechennetz längs der Lippenlinie aufgetrennt; aus der einen Linie werden Ober- und Unterlippe mit
gemeinsamen Mundwinkel-Punkten; die Höhle kommt als Netz dazu (Rand = die beiden Lippen, in der Mittelebene eine Profillinie
für Gaumen und Boden). Linien, die die Form kreuzten, enden an den Lippen in gemeinsamen Punkten. Gerechnet wird in einer
Bezugsstellung mit leicht offenem Maul; „geschlossen“ ist die zurückgedrehte Stellung des Kieferknochens, die Lippen liegen dann
aufeinander. Lippen sind Linien mit Kante an oder aus wie alle anderen.

Offen (vor dem Bauen als Entwurf mit Bildern): wie tief die Höhle ohne weitere Linien wird; Zeichnen in der geschlossenen
Ansicht auf Stellen, die innen liegen; Mundwinkel als Punkt, an dem vier Flächen zusammenkommen; Zähne und Zunge später.

### A.7 Auswahl (Schritt 7)

- Kante = Stück eines Pfads zwischen zwei Punkten (Treffer am Pfad im Blatt und am Band im 3D-Fenster).
- Fläche = zusammenhängendes Gebiet der Haut zwischen Linienketten (Füllen über die Dreiecke des Rechennetzes; je Netzstand
  gemerkt). Ihre Auswahl meint die Punkte auf ihrem Rand.
- Doppelklick auf eine Linie = alle Punkte des Loops. Der heutige Doppelklick „neuer Punkt“ zieht um.

## Anhang B: Aufräumliste (Schritt 0)

**Zweige.** Heute: `main` (Stand 08.10.), `claude/editor-grundlayout` (Doku und Blaupause, Hauptordner), `claude/form-zuerst`
(ganz in `claude/form-spiegel` enthalten), `claude/form-spiegel` (Basis, 136 Commits voraus). `editor-grundlayout` hat 59
Dateien, die `form-spiegel` fehlen: Doku, Bilder und `.claude/launch.json`, kein Editor-Code. Vorschlag: `editor-grundlayout`
in `form-spiegel` führen, der Hauptordner wechselt auf diese Linie, `form-zuerst` bleibt als Zeiger. `main` bleibt unberührt.

**Arbeitsbäume** (zusammen rund 8 GB; gelöscht werden nur die Ordner, alle Zweige bleiben):

| Arbeitsbaum | Was | Vorschlag |
| --- | --- | --- |
| `form-wand`, `form-wand2` | Vergleich der Wand-Fassungen vom 11.11. (verworfen); `form-wand2` trägt eine ungespeicherte Änderung (Abstand zur Mitte 0, in der Übergabe beschrieben) | löschen |
| `form-zuerst` | Stand von `claude/form-zuerst`, Port 5193 | löschen (ganz in `form-spiegel` enthalten) |
| acht `agent-…`, `integ-welten`, `merge-verlaeufe` | Prototyp 1 (30.09.–01.10.), eines vom 12.10. Sieben tragen ungespeicherte Reste: vier sind seit dem 01.10. als `bergung/…` gesichert, zwei weitere (Nebel-Tests, Planet) sichere ich vorher ebenso, eines besteht nur aus gelöschten Dateien | löschen |
| `early-earle-meshy` (eigener Ordner) | deine Meshy-Tests | bleibt |
| `form-alt` | Basis, Port 5194 | bleibt; dazu neu `form-bau` zum Bauen mit eigenem Port |

**Ungespeichertes im Hauptordner:** drei Server-Einträge in `.claude/launch.json` und eine kleine Korrektur an drei Zeittests
(auf CI die doppelte Zeitgrenze) werden committet. Die Schrift „Hippie Movement.otf“ ist deine; sie bleibt, wie sie ist.

**Gedächtnisdateien.** `CLAUDE.md` 271 KB (auf `form-spiegel`; im Hauptordner 106 KB), `apps/editor/CLAUDE.md` 115 KB,
`docs/UEBERGABE.md` 103 KB. Vorschlag: `CLAUDE.md` auf Stand, Regeln, Fallen und Landkarte kürzen (wenige Seiten); der bisherige
Text wandert unverändert nach `docs/verlauf/`. `apps/editor/CLAUDE.md` beschreibt den alten Editor und wandert ganz ins Archiv.
Die Übergabe wird neu und kurz geschrieben (Stand, dieser Plan, Starten, Fallen), die alte bleibt in der Git-Geschichte.
Der Gedächtnis-Index der Sitzungen wird ebenso gestrafft.

**Code – noch nicht, erst nach Schritt 4** (damit der Vergleich mit dem alten Stand möglich bleibt), und nur nach deinem Ja:
die Schalter in `kurven.ts` (30, Liste in der alten Übergabe, Abschnitt 7), die alte Rechnung mit ihren Schutzregeln (Vorsicht,
Normalfluss, Wurstballon), `form.html` mit `main.ts`, die 232 Dateien unter `apps/editor/scripts/pruefen/` (alte Proben in einen
Unterordner). `editor.ts` ist eine Kopie von `kurven.ts` mit anderem Layout (1 744 abweichende Zeilen); die Doppelung wird beim
Nachziehen von `/editor` aufgelöst.

## Quellen

Im Repo:
- `docs/research/2026-11-10-gegenpruefung-kurven-loeser.md` (Abschnitt 5: Wege A bis D; Nachtrag: G1 bis G6 mit Messwerten) und
  `docs/research/2026-11-10-gegenpruefung-berichte/literatur.md` (Rangliste, Stanko, Adobe-Familie, Schneider & Kobbelt).
- `docs/research/2026-11-09-fibermesh-monstermash-richtung.md` (Linien mit Richtung, Beweis vom 09.11.).
- `docs/research/2026-11-11-loft-messung.md` (Loft an Florians Formen).
- `docs/research/2026-11-11-grundproblem-spiegelkante-rechnung.md` (Spiegelung, gültiger Stand `09f39297`).
- `docs/UEBERGABE.md` (Stand 11.11.: Karte von `kurven.ts`, Fallen, Altlasten).

Aus dem Netz (12.11.; je nur Zusammenfassung oder Abstract gelesen, wenn nicht anders gesagt):
- T. Stanko, S. Hahmann, G.-P. Bonneau, N. Saguin-Sprynski: Surfacing Curve Networks with Normal Control. Computers & Graphics
  2016. https://hal.archives-ouvertes.fr/hal-01342465 (Normalen von den Kurven über das Netz, daraus die mittlere Krümmung,
  daraus die Lagen; die Kurzfassung hat die Gegenprüfung im Volltext gelesen).
- J. Andrews, P. Joshi, N. Carr: A Linear Variational System for Modelling From Curves. Computer Graphics Forum 30(6), 2011.
  https://diglib.eg.org/handle/10.1111/v30i6pp1850-1861 (lineares System mit Lage und Querableitung an den Kurven; laut
  Abstract schneller, stabiler und genauer zu steuern als die nichtlinearen Systeme).
- S. Schaefer, J. Warren, D. Zorin: Lofting Curve Networks using Subdivision Surfaces. SGP 2004.
  https://people.engr.tamu.edu/schaefer/research/lofting.pdf · A. Levin: Interpolating Nets of Curves by Smooth Subdivision
  Surfaces. SIGGRAPH 1999. https://www.math.tau.ac.il/~levin/adi/paper7.htm (Lofts über Kurvennetze als Unterteilungsfläche;
  brauchen ein Kontrollnetz um die Kurven).
- P. Salvi, T. Várady: G2 Surface Interpolation Over General Topology Curve Networks. CGF 2014.
  https://diglib.eg.org/handle/10.1111/v33i7pp151-160 · P. Salvi, I. Kovács, T. Várady: Computationally efficient transfinite
  patches with fullness control. 2020. https://arxiv.org/abs/2002.11212 (Flächenstücke mit beliebig vielen Seiten; „Fülle“ als
  Stellgröße).
- Plasticity, Befehle Loft und Patch (inoffizielle Spiegel der Dokumentation):
  https://plasticity-unofficial-document-nakcinpm5-shinjiesaki.vercel.app/solid/loft ·
  https://plasticity-document-revisions.vercel.app/solid/patch · Rhino, Patch (Regler „Stiffness“ für die Fülle):
  https://docs.mcneel.com/rhino/9/help/en-us/commands/patch.htm
- OpenSubdiv, Stencil-Tabellen (warum Unterteilung bei festem Netz fast nichts kostet und nur ein Netzwechsel teuer ist):
  https://graphics.pixar.com/opensubdiv/docs/intro_30.html
- T. Boubekeur, M. Alexa: Phong Tessellation. SIGGRAPH Asia 2008. https://history.siggraph.org/?p=195171 · A. Vlachos u. a.:
  Curved PN Triangles. 2001 (gekrümmte Dreiecke aus Ecken und Normalen; aus dem Gedächtnis, heute nicht nachgelesen).
