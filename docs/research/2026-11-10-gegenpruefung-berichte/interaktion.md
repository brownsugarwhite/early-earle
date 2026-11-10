# Gegenprüfung „Interaktion im Fenster“ (kurven.html)

Stand: Branch `claude/form-zuerst`, Commit afb79d15. Geprüft am 10.11.2026.

**Wie geprüft:** Nur gelesen. `apps/editor/src/form/kurven.ts` vollständig (3 410 Zeilen), `zerlegen.worker.ts`, `kurven.html`,
aus dem Kern `dicht/loops.ts` (LoopZug, Griffe, Pfad), `dicht/pfad.ts`, `dicht/ausKurven.ts` (Löser), `dicht/kurven.ts`
(`vermessen`, `hautNormalen`), `loeser/zerlegung.ts`, Kopf von `dicht/verdichten.ts` und `dicht/einsetzen.ts`; Planseite
Abschnitte 6, 8–11, 18; Bilanz Abschnitte 2–8. **Ich habe nichts gemessen** (meine Aufgabe nennt keine Messskripte, Browser war
verboten). Zahlen in diesem Bericht stammen aus der Planseite der anderen Session und sind so gekennzeichnet. Jede Aussage trägt
„gelesen“ (steht so im Code) oder „vermutet“ (aus dem Code gefolgert, nicht nachgemessen).

Pfade: `K` = `apps/editor/src/form/kurven.ts`, `AK` = `packages/shape/src/dicht/ausKurven.ts`, `L` = `packages/shape/src/dicht/loops.ts`,
`Z` = `packages/shape/src/loeser/zerlegung.ts`, `P` = `docs/plans/2026-11-06-kurven-als-wahrheit.md`.

---

## Das Wichtigste zuerst

1. **Der Löser rechnet nur, wenn die Maus sich bewegt.** Je `pointermove` eine Runde, höchstens zwei (K:2074–2079). Hält Florian
   die Maus still, rechnet nichts mehr; erst das Loslassen stößt vier weitere Runden an (K:2305). Was der Löser bis dahin
   schuldig blieb, wird also genau beim Loslassen sichtbar. Das ist eine Entscheidung der Ablaufsteuerung, keine Eigenschaft des
   Lösers, und in der Planseite nie in Frage gestellt worden (dort heißt es durchgehend „Runden je Mausbewegung“).
2. **Nach dem Loslassen laufen bis zu fünf sichtbare Änderungen hintereinander ab** (Abschnitt 1.3). Die größte ist das „Setzen“
   des verdichteten Netzes 30 ms nach dem Loslassen (K:1448–1479). Sie blockiert zugleich den Hauptthread für die Zerlegung
   (dort gemessen 0,13 s bei 5 200, 0,6 s bei 15 400 Punkten; P Abschnitt 6).
3. **Die Griffe werden nicht in wahrer Länge gezeigt** (K:1259–1265). Kurze Griffe werden auf 28 Bildpunkte gestreckt, mit einem
   Faktor je Punkt. Der Faktor wird beim Loslassen neu gerechnet (K:1295 gegen K:1306): Die Griffspitze springt. Das ist ein
   Fehler der Anzeige, der genau auf Florians Satz „Veränderungen beim Loslassen der Handles“ passt, und er hat mit dem Löser
   nichts zu tun.
4. **Punkt, Griff und Linie werden im selben Aufruf erst nach dem Löser gezeichnet** (K:2073–2096). Der Griff unter der Maus ist
   also so träge wie der Löser. Die Kurven sind aber die Wahrheit und kosten fast nichts; sie könnten immer sofort folgen.
5. **Im Standard läuft alles im Hauptthread.** Den Worker gibt es nur für `?gewichte=geometrie` (K:2090–2091, K:2137–2165).
6. **Die angezeigte Zeit „Zug … ms“ misst nur den Löser** (K:2074–2080), nicht Anzeige, DOM und GPU. Alle Tempo-Kriterien der
   Planseite („je Mausbewegung ≤ 16 ms“) beziehen sich darauf. Was Florian als Stocken sieht, ist nie gemessen worden.

---

## 1. Ablauf eines Zugs

### 1.1 Drücken (`druecken`, K:2864–2926)

| Schritt | Ort | Was |
| --- | --- | --- |
| Ziel lesen | K:2891–2901 | `data-l`, `data-i`, `data-g` des SVG-Elements unter der Maus |
| Doppelklick prüfen | K:2904, 2911, 2916; K:2853–2859 | eigene Zählung über `e.timeStamp` (das Blatt wird beim Drücken neu gebaut, `dblclick` käme nicht an) |
| Auswahl setzen, **alles neu zeichnen** | K:2920–2924 | `allesZeigen()`: Normalen, GPU-Puffer, Bänder, drei SVG-Blätter, dazu `vorrechnenPlanen()` |
| Zug anlegen | K:2925 → `zugStarten` K:1833–1963 bzw. `griffZugStarten` K:1719–1755 | Gewichte, **Schnappschuss** (K:1939, kopiert alle Lagen und Loops), **neuer `LoopZug`** (K:1928 → K:1655–1663) |

**Was wird zerlegt?** Im Standard (Grundform, `?haut=kurven`) ist `mitBereich()` falsch (K:238), der Bereich ist `null`
(K:1658): der Löser umfasst immer die **ganze Haut**, unabhängig davon, was gegriffen wird. `HautAusKurven` zerlegt zwei
Systeme: die Lagen (alle Punkte, Laplace-Zeilen plus Bindungen mit Gewicht 100; AK:265–301, AK:357) und die Verteilung der
Krümmung (AK:402–415). Beide werden über einen Fingerabdruck aller Zeilen gemerkt (Z:19–21, Z:56–69, genau zwei Einträge).

**Wie lange darf das dauern?** Es gibt keine Grenze im Code; das Drücken blockiert, bis der Löser steht.
- Ist die Zerlegung in der Ruhe schon vorgerechnet (K:1448–1456), findet das Greifen sie fertig. Trotzdem wird der ganze
  `LoopZug` neu gebaut: Bindungen (L:721–751, je Probe ein sortierter Zeichenketten-Schlüssel), Ketten (L:795–845, Map mit
  Zeichenketten), Gewichte, alle Zeilen als kleine JS-Felder (AK:266–301), zwei Fingerabdrücke über alle Zeilen, eine
  Vermessung (AK:359). Die Planseite misst für das Drücken insgesamt 84–101 ms bei 5 200 und 134–156 ms bei 15 400 Punkten
  (P Abschnitt 6, Tabelle). Das ist bei jedem Anfassen eines Griffs ein Halt von fünf bis zehn Bildern. (gelesen; Zahlen dort
  gemessen)
- Ist sie nicht vorgerechnet (Greifen innerhalb von 30 ms nach einer Änderung, oder die Vorrechnung läuft gerade), wird im
  Drücken selbst zerlegt: dort gemessen 0,13 s / 0,6 s, laut Z:7 0,23 s bei 7 900 und 1,2 s bei 27 800 Punkten.
- Der Vorrechner baut denselben `LoopZug` schon einmal (K:1455) und **wirft ihn weg**; gemerkt wird nur die Zerlegung.
  Weil der Löser über die ganze Haut nicht von der Auswahl abhängt, könnte das fertige Objekt beim Greifen einfach
  übernommen werden (Abschnitt 7, Vorschlag C).

In der Pose und mit `?haut=gedaechtnis` wird stattdessen ein Bereich um den Zug zerlegt (K:1657–1659), bei jedem Greifen neu.

### 1.2 Jede Mausbewegung (`bewegen` K:2928–2953 → `zugBewegen` K:2041–2098)

In dieser Reihenfolge, alles synchron im Ereignis:

| Nr. | Schritt | Ort | Kosten wachsen mit |
| --- | --- | --- | --- |
| 1 | Mauspunkt ins Blatt (`getBoundingClientRect` zweimal) | K:682–686, K:672–675 | – |
| 2 | Schwelle 2 Bildpunkte, danach gilt der Zug | K:2045–2046 | – |
| 3 | Neue Punkte, Griffe und Verschiebung je Probe: Griff K:2051–2061 (`griffZiehen`, `verschiebungLaengs`), Punkt K:2063–2071 | L:676–717 | Proben |
| 4 | **Bindungsziele** = Linie beim Anfang + Rest zum Pfad + Änderung des Pfads; je Loop mit Pfad ein neues Feld, auch für unbewegte Loops | K:1700–1707 (`mitRest`), K:2073 | Proben |
| 5 | **Löser: 1 Runde; eine zweite nur, wenn die erste unter 12 ms blieb** (nach der Geometrie unter 8 ms). In der Pose fest 2. | K:2075–2079, K:148, K:153 | Punkte |
| 6 | Verfeinern im Zug: **im Standard nie** (nur mit Bereich oder mit `?gewichte=geometrie`) | K:2088–2093 | – |
| 7 | **Haut zeigen:** Normalen der ganzen Haut neu, je gezeigtem Punkt eine zweite Normale aus seinen Dreiecken, Lagen und Normalen in die GPU-Puffer, Hüllkugel | K:1020–1083 | Punkte |
| 8 | **Bänder im 3D:** vier Geometrien aus JS-Listen ganz neu gebaut, die alten weggeworfen (GPU-Puffer löschen und neu anlegen) | K:1157–1200, K:1085–1120 | Proben |
| 9 | **Drei SVG-Blätter ganz neu:** `replaceChildren()`, je Loop zwei Pfade aus allen Proben (`toFixed` je Koordinate), Kanten, Griffe, Punkte | K:1313–1410 | Proben × 3 |
| 10 | Statuszeile | K:1492–1505 | – |
| 11 | WebGL: vier Ansichten, im nächsten Bild | K:3108–3160 | Dreiecke |

Eine Runde des Lösers (AK:890–1094) ist: Haut vermessen (Normalen, Krümmung, Tangentialanteil; `dicht/kurven.ts`:717–748),
Krümmung verteilen (ein Rückwärtseinsetzen mit einer Spalte, AK:713–749), rechte Seite aufbauen (AK:932–1013), Lagen lösen
(ein Rückwärtseinsetzen mit drei Spalten, AK:1064), spiegelgleich mitteln (AK:1074–1092). Dort gemessen: 14–16 ms je
Mausbewegung bei 5 200 Punkten (zwei Runden), 26–28 ms bei 15 400 (eine Runde); Florians Bild zeigte 126 ms bei 26 284
Punkten (P Abschnitt 11).

**Nicht** je Mausbewegung: Linien neu abtasten (die Proben behalten ihre Stelle t auf dem Pfad; nur ihr Ziel wird neu
ausgewertet), Verdichten, neu zerlegen.

### 1.3 Loslassen (`loslassen` K:2955–2982 → `zugEnde` K:2292–2329) — was die Haut danach noch verändert

Jede Quelle einzeln, in der Reihenfolge, in der Florian sie sieht:

| Nr. | Quelle | Ort | Wann sichtbar | Größe |
| --- | --- | --- | --- | --- |
| A | **Vier Runden am Ende** (holen auf, was der Löser im Zug schuldig blieb) | K:2305, K:142 | sofort | dort gemessen bis 1,4 Einheiten im Standard (P Abschn. 8), 0,2–2,4 nach der Geometrie (P Abschn. 10); bei schneller Hand mehr |
| B | **Linien werden von der Haut abgelesen** (`festlegenAlle`); das Band im 3D zeigte im Zug die *Ziele* (K:1136, K:1158), danach die Kette im Netz | K:2310, L:922–930 | sofort | klein (der Rest der weichen Bindung, vermutet unter 0,4 Einheiten: Schwelle in K:2516) |
| C | **Linie im Blatt wechselt die Darstellung:** im Zug Streckenzug durch die Proben, danach der glatte Bézier-Pfad | K:1332 | sofort | bei hohem Zoom und gestreckten Linien deutlich (Sehne gegen Bogen) |
| D | **Griffspitzen springen:** Der Anzeigefaktor wird neu gerechnet | K:1295 gegen K:1305–1306, K:1262–1265 | sofort | bis zur doppelten Grifflänge, siehe Abschnitt 3.3 |
| E | **Kreuzungen suchen** (alle Loop-Paare): neue Punkte auf beiden Loops, in der Grundform auf die Mitte beider Pfade gesetzt (der Pfad ändert sich) | K:2312, K:400–427 (Mitte: K:416–420) | sofort, nur wenn neue Kreuzung | selten |
| F | **Verdichten:** Kanten über 1,75 Startkanten teilen, unter ½ zusammenlegen, Linienkanten teilen, wo die Kette über MK/40 von der Kurve abweicht; Kanten drehen; neue Punkte entspannen; neue GPU-Puffer | K:2314, K:2339–2368 | sofort | dort gemessen 0,27–1,4 Einheiten |
| G | **Linien auf ihren Pfad ziehen**, mit dem *anderen* Löser (Gedächtnis, örtlich, 12 Runden), für jede Linie, die mehr als 0,05 Startkanten neben ihrem Pfad liegt | K:2322, K:2509–2536, K:255 | sofort | örtlich |
| H | Ecken von selbst neu bestimmen (`eckenAuto`): ein Punkt kann zwischen ● und ◆ wechseln | K:1420 | sofort | Anzeige; wirkt auf den Löser erst beim nächsten Zug |
| I | **Setzen in der Ruhe:** 30 ms später neuer Löser über das verdichtete Netz (**zerlegt im Hauptthread**), vier Runden | K:2317–2320, K:1451–1463 | 0,15–0,7 s nach dem Loslassen | **die größte Quelle:** dort gemessen 4,9 (Hals), 5,4 (Ohr), 32,2 (Rüssel) Einheiten; Hörner 20,0 + 3,3 (P Abschn. 8, 11, Bilanz 2.1) |
| J | **Nachverfeinern, bis zu dreimal:** nach dem Setzen wird noch einmal geteilt, neu zerlegt, wieder gesetzt | K:1464–1472, K:1447 | je weitere 0,15–0,7 s | dort gemessen 1,5–3,3 und kleiner |
| K | Der Stand nach I/J ist **nicht fertig gerechnet** (vier Runden, kein Abbruch nach Rest). Der Rest kommt beim nächsten Zug dazu, über die ganze Haut | K:1459–1462; P Abschn. 9 „Fallen“ | bei der ersten Mausbewegung des nächsten Zugs | dort gemessen: nach neun Griffzügen je 0,5–5,6 Einheiten |

Die Quellen A–H erscheinen gemeinsam in einem Bild (K:2328), I und jede Wiederholung von J je in einem eigenen. Florian
sieht also bis zu **fünf Stufen**: Loslassen, Setzen, und bis zu drei Nachverfeinerungen. Das deckt sich mit „Aufblasen in
Stufen“ (P Abschnitt 11, Fall 2).

Zusätzliche Kosten beim Loslassen, die als Halt spürbar sind: dort gemessen 71–80 ms bei 5 200 und 200 ms bei 15 400
Punkten (P Abschnitt 6), danach die Zerlegung im Hauptthread.

**Urteil:** Im Standard ist I die Hauptsache, und I ist grundsätzlich: Mit gleichen Gewichten hängt die Form am Netz
(P Abschnitt 8, 17). Das kann die Ablaufsteuerung nicht heilen. Sie macht es aber schlimmer als nötig: Die Änderung kommt in
bis zu fünf Stufen statt in einer, sie friert das Fenster ein, und sie trifft den nächsten Griff. A, C und D sind dagegen
reine Fragen der Ablaufsteuerung und der Anzeige und lassen sich ohne neuen Löser beheben.

---

## 2. Je Ereignis oder je Bild? Stau? Hauptthread?

- **Gerechnet wird je `pointermove`-Ereignis**, nicht je Bild: K:2952 (Ziehen) und K:3007–3011 (G/S/R). Im Bildtakt
  (`requestAnimationFrame`, K:3154–3160) läuft nur das WebGL-Zeichnen, und nur wenn `neuZeichnen` gesetzt ist. Es gibt im
  ganzen Fenster einen einzigen Zeitgeber (K:1451) und keine Rechnung im Bildtakt. (gelesen)
- **Zusammengefasst wird nichts.** Kein `getCoalescedEvents`, kein „nur das neueste Ereignis je Bild“, kein Verwerfen
  veralteter Ereignisse. (gelesen)
- **Können sich Ereignisse stauen?** Der Code verhindert es nicht. Ob es geschieht, entscheidet der Browser: Chromium
  (Electron) liefert `pointermove` höchstens einmal je Bild und fasst wartende Mausbewegungen zusammen, solange der
  Hauptthread beschäftigt ist. Dann staut sich nichts auf, aber die Bildrate fällt auf 1 / (Löser + Anzeige): Die Haut liegt
  um die Dauer eines Aufrufs hinter der Maus, dazu um das, was der Löser in ein bis zwei Runden nicht aufholt. (vermutet;
  Browserverhalten, nicht im Code und von mir nicht gemessen)
- **Der Löser läuft im Hauptthread** (K:2075–2078). Der Worker zerlegt nur (`zerlegen.worker.ts`:7–13) und wird nur mit
  `?gewichte=geometrie` überhaupt angelegt (K:2251–2266, aufgerufen nur aus K:2138, erreichbar nur über K:2090–2091).
- **Folge 1:** Auf Florians Bildschirm mit 120 Hz kommen bis zu 120 Ereignisse je Sekunde; ein Aufruf mit 15–30 ms Löser
  plus Anzeige füllt zwei bis vier Bilder. (vermutet)
- **Folge 2:** Die Zahl der Runden je Zug hängt an der Hand. Ein schneller Zug von 200 ms bekommt etwa zehn Ereignisse, ein
  langsamer hundert. Die Proben schicken feste 30 Mausschritte, jeden abgewartet (`form-loslassen-probe.mjs`:224). Sie messen
  deshalb weder Zusammenfassen noch eine schnelle Hand. Die Bilanz hat denselben Fehler zwischen Kern-Probe und Fenster
  gefunden (Bilanz 4.1); zwischen Probe und Hand besteht er weiter. (gelesen)
- **Folge 3:** Steht die Maus still, rechnet nichts. Der Rückstand bleibt stehen, bis losgelassen wird (Quelle A).
- **Folge 4:** Die zweite Runde hängt an der Uhr (K:2078). Unter Last oder nach einer Speicherbereinigung fällt sie weg;
  das Verhalten ist nicht wiederholbar.

---

## 3. Wie die Bézier-Linien auf die Haut kommen und wo „ungenau“ entsteht

### 3.1 Der Weg

1. **Anlegen:** Ein Loop wird in einem Blatt geschnitten (L), gezeichnet (F, K:2566–2600) oder mit dem Stift gesetzt
   (P, K:2792–2842). Er liegt zuerst als Proben auf Dreiecken der Haut.
2. **Einsetzen:** `loopEinsetzen` macht ihn zu einer **Kette von Kanten des Netzes** (K:2394–2412, `dicht/einsetzen.ts`:1–5):
   jede Probe ist danach ein Netzpunkt. Das ändert das Netz (neue Zerlegung).
3. **Griffe:** aus der Linie abgelesen (`griffeAnlegen`), beim Stift genau aus der Zeichnung (`griffeAusZeichnung`, K:2833–2836).
4. **Die Linie ist ihr Pfad:** Jede Probe bekommt eine feste Stelle t auf ihrem Bézier-Stück (`pfadParameter`, L:1200–1209).
   Ihr Ziel ist danach immer der Pfad an dieser Stelle (`pfadLagen`, L:1121–1150).
5. **Bindung:** Jede Probe (und ihr Spiegelbild) ist eine Zeile im Löser, mit Gewicht 100 gegen Gewicht 1 der
   Glättungszeilen (L:882, AK:300). Die Bindung ist **weich**, nicht hart.
6. **Im Zug** wird je Mausbewegung nur das Ziel neu ausgewertet (K:1700–1707); die Stellen t bleiben.
7. **Nach dem Zug** wird die Kette verfeinert, wo sie zwischen zwei Netzpunkten weiter als `GENAU` × Startkante = MK/40
   ≈ 0,2 Einheiten von der Kurve abweicht (K:279, K:2361, `verdichten.ts`:12–19).

### 3.2 Wie genau

- **In der Ruhe:** Die Blätter zeichnen den mathematischen Pfad selbst als SVG-Kurve (K:1223–1238, K:1332). Das ist exakt.
  Die Kette im Netz liegt höchstens MK/40 daneben, plus der Rest der weichen Bindung (bis 0,05 Startkanten ≈ 0,4 Einheiten
  werden geduldet, K:2516). Sauber gelöst.
- **Im Zug:** Blätter und 3D-Band zeigen die Ziele der Proben als Streckenzug (K:1136, K:1158, K:1332), nicht den Pfad und
  nicht die Haut. Wird eine Linie gestreckt, rücken die Proben auseinander; der Streckenzug wird eckig, und der gezogene
  Punkt (er liegt genau auf dem Pfad) sitzt neben der gezeichneten Linie. Beim Loslassen wird daraus der glatte Pfad
  (Quelle C). Die Haut selbst hat im Zug nur die alten Kanten: an gestreckten Stellen ist sie eckig, bis nach dem Loslassen
  verdichtet wird.

### 3.3 Wo „ungenau“ entsteht — die Stellen einzeln

1. **Griffe in falscher Länge** (K:1259–1265, K:1369): `f = max(1, 28 px / (Maßstab × kürzerer Griff))`, und **beide** Griffe
   des Punkts werden mit `f` gestreckt gezeigt. Die gezeigten Spitzen sind dann nicht die Kontrollpunkte der Kurve.
   - Beispiel bei 100 % (0,89 px je Einheit): Griffe 5 und 20 Einheiten lang → f = 6,3; der lange Griff wird 112 px lang
     gezeigt statt 18 px.
   - Ein sehr kurzer Griff auf einer Seite (ein Punkt, der ein Stück nahe an einem Nachbarn teilt, L:2503–2507) streckt den
     Griff der anderen Seite um ein Vielfaches, bis aus dem Blatt hinaus.
   - Beim Ziehen bewegt die Maus den Griff nur um 1/f (K:2056). Beim Loslassen wird f neu gerechnet: Wird der gezogene
     Griff der kürzere oder war er es, springt die Spitze (im Beispiel von 56 px zurück auf 28 px).
   - Betroffen sind alle Griffe unter 28 px: bei 100 % alles unter 31 Einheiten, also Augen, Ohren, Hörner, jedes Detail.
   Für einen Art Director, der Illustrator gewohnt ist, ist das die auffälligste Ungenauigkeit, und sie ist reine Anzeige.
2. **Streckenzug statt Pfad im Zug** (K:1332), siehe 3.2.
3. **Grobes Netz.** 6 000 bestellte Dreiecke (K:139), Startkante ≈ 8,3 Einheiten ≈ 7 px bei 100 %, ≈ 22 px bei 300 %
   (Zahlen P Abschnitt 11). Verdichtet wird nur nach Länge (K:2365), nicht nach Rundung; ein Ohr hat so lange Kanten wie der
   Rumpf (P Abschnitt 11, Fall 3). Bekannt und offen (Bilanz 2.4).
4. **Harte Farbstufen.** Das Material hat vier Stufen ohne Übergang (K:452–455, K:535). Kleinste Änderungen der Normalen
   verschieben die Stufengrenze sichtbar. Jede Nachjustierung wirkt dadurch größer, als sie ist, und Facetten werden
   betont. (vermutet)
5. **Feste Genauigkeit statt Bildschirmgenauigkeit.** MK/40 ≈ 0,18 px bei 100 % ist feiner, als man sieht; bei 4 000 % Zoom
   (K:670) sind es 7 px, also zu grob. Bei normalem Zoom löst die Regel nach fast jedem Zug an einem Detail eine
   Netzänderung aus (eine Kante von 8,3 Einheiten weicht ab Krümmungsradius 43 um mehr als 0,2 ab), also neue Zerlegung
   und Setzen. (gelesen; Häufigkeit vermutet)
6. **Kreuzung auf die Mitte** zweier Pfade gesetzt (K:416–420): beide Pfade ändern sich beim Anlegen der Kreuzung leicht.
7. **Ein Halbkreis als ein Bézier-Stück** liegt 1,4 % neben dem Kreis (L:1111–1112; Bilanz 4.10). Bekannt, Florians Wahl
   „Punkte wo nötig“ steht aus.
8. **Weiche Bindung:** Im Zug liegt die Kette um den Rest neben dem Ziel; gezeigt wird das Ziel. Klein.

---

## 4. URL-Schalter

17 Schalter (alle in K, gelesen):

| Schalter | Standard | Wirkung | Urteil |
| --- | --- | --- | --- |
| `dreiecke` (K:139) | 6000 | Dichte des Startnetzes | Messhilfe |
| `form` (K:178) | `kugel` | Startform `kugel` oder `bohne` | bleibt |
| `verdichten` (K:209) | an | `0`: kein Verdichten nach dem Zug | Messhilfe |
| `kruemmung` (K:211) | an | wirkt **nur** mit `haut=gedaechtnis` (L:880–883 reicht es nur an `HautZiele`; in der Pose immer aus, K:1662) | **Altlast, im Standard wirkungslos** |
| `haut` (K:217) | `kurven` | `gedaechtnis`: alter Löser mit Bereich | Vergleich; Altlast, sobald entschieden |
| `gewichte` (K:224) | `gleich` | `geometrie`: Maß nach der Geometrie, schaltet Verfeinern im Zug und Worker frei | offene Entscheidung |
| `richtung` (K:230) | aus | Beweis „Linien mit Richtung“ | **Altlast** (angehalten, P Abschn. 15) |
| `maxnormalen` (K:232) | aus | Normalen nach Max im Maß | **Altlast** (kein Hebel, P Abschn. 16) |
| `punkte` (K:249) | ohne Zusatzpunkte | `noetig`: neue Loops bekommen Punkte, bis der Pfad passt | offene Entscheidung (Bilanz 8.4) |
| `winkel` (K:260) | aus | Verdichten auch nach Flächendrehung | **Altlast** (gemessen schlechter, K:257–259) |
| `kurz` (K:267) | 0,5 | Zusammenlegen unter diesem Anteil der Startkante | bleibt, als Konstante |
| `genau` (K:279) | 1/40 | Liniengenauigkeit im Netz | bleibt, besser bildschirmbezogen |
| `genauHaut` (K:280) | aus | Haut ebenso fein | **Altlast** (gemessen schlechter, K:274–277) |
| `live` (K:287) | an | Verfeinern im Zug — **wirkt nur mit `gewichte=geometrie`** (K:2090) | im Standard wirkungslos |
| `liveKante` (K:288) | 2 | Auslöser Kantenlänge | wie `live` |
| `liveGenau` (K:290) | 1 | Auslöser Linienabweichung | wie `live` |
| `hintergrund` (K:2236) | an | Zerlegung im Worker — nur mit `live` und `geometrie` | im Standard wirkungslos |

**Was Florian ohne Schalter sieht:** Haut aus den Kurven über die ganze Haut, gleiche Gewichte, ein bis zwei Runden je
Mausbewegung, **kein** Verfeinern im Zug, kein Worker, Verdichten und Liniengenauigkeit nach dem Loslassen, Setzen 30 ms
später im Hauptthread. In der Fressen-Pose und beim Anlegen einer Linie rechnet der andere Löser (Gedächtnis, örtlich;
K:238, K:2531).

Rund 250 Zeilen des Fensters (K:282–336, K:2130–2266) und der Worker sind im Standard toter Code.

---

## 5. Bedienung, wie sie im Code steht

### 5.1 Vorhanden

| Was | Wie | Ort |
| --- | --- | --- |
| Wählen | Klick auf Punkt oder Linie; ⇧ schaltet um; Klick ins Leere hebt auf | K:2893–2924 |
| Ziehen | Punkt, mehrere Punkte, ganzer Loop; nur in der Ebene des Blatts | K:1833–1963, K:1576–1581 |
| Griff ziehen | glatt: Gegenüber dreht mit und behält seine Länge; Ecke: nur dieser; Spiegelpunkt: spiegelgleich | L:2170–2196 |
| Ecke ◆ / glatt ● | Doppelklick auf Punkt oder Griff, ⌥-Klick auf Punkt | K:2904, K:2916, K:1784–1831 |
| Neuer Punkt | Doppelklick auf die Linie, genau auf dem Pfad (de Casteljau) | K:2647–2684 |
| Löschen | ⌫, wie Illustrator (Nachbarn verbinden sich über ihre Griffe) | K:2686–2717 |
| Loop schneiden L, Form F, Stift P | P: Klick = Ecke, Ziehen = glatt, erster Punkt oder ⏎ schließt, ⌫ zurück | K:2372–2388, K:2566–2600, K:2729–2842 |
| G / S / R | folgen der Maus, X/Y/Z schränkt auf eine Achse ein, Klick oder ⏎ fertig, Esc oder andere Taste der Maus zurück | K:3037–3046, K:3067–3068, K:1552–1582 |
| Einfluss O | Kreis um die Auswahl, [ ] ändert die Größe | K:1872–1903, K:3088–3090 |
| Kante K | an/aus für Punkte oder Loop | K:2418–2445 |
| Maul, Fressen-Pose | Regler und Knopf | K:986–1018 |
| Zurück | ⌘Z, ganzer Schnappschuss je Schritt | K:3063–3066, K:339–387 |
| Ansicht | Rad/Pinch zoomt (25 %–4 000 %), zwei Finger/mittlere Taste verschieben, Pos1 | K:689–712, K:2992–3004 |

### 5.2 Was für präzises Arbeiten fehlt (nichts davon steht in Planseite oder Bilanz)

- **Zahleneingabe** bei G/S/R (im alten Editor gab es sie: `editing/modal/`, Plan 20.10. V3). Keine Felder für Lage eines
  Punkts, Länge und Winkel eines Griffs.
- **Feines Ziehen** (⇧ = Zehntel), **Pfeiltasten** (im alten Editor vorhanden).
- **Einrasten:** an Punkten, Kreuzungen, der Mittelebene, an Winkeln (⇧ = 45° wie Illustrator), an Hilfslinien oder einem
  Raster. Es gibt keine Hilfslinien.
- **Griff-Arten und -Hilfen:** nur glatt und Ecke. Es fehlen „gleich lang“, „nur Länge ändern“ (Richtung gesperrt), „nur
  Richtung ändern“, ⌥-Ziehen bricht die Tangente (Illustrator), Griffe aus einer Ecke herausziehen, automatische Griffe
  (Blender „Auto“).
- **Auswahl:** kein Rechteck, kein Lasso, kein „alles“, kein „alle Punkte dieses Loops“, kein Ausblenden oder Sperren
  einzelner Loops. Klick auf einen von mehreren gewählten Punkten ohne Ziehen lässt die Auswahl stehen (K:2922–2923;
  Illustrator wählt dann nur ihn).
- **Wiederholen** (⇧⌘Z) fehlt; es gibt nur den Stapel `zurueck` (K:349).
- **Ausrichten und Verteilen**, Kopieren, Duplizieren eines Loops.
- **Punkt längs der Linie schieben** (Blender GG).
- **Drehpunkt** wählbar (heute immer die Mitte der Auswahl, K:1929); **Ebene statt Achse** (⇧X).
- **Bearbeiten im 3D-Blatt:** dort gibt es nur die Kamera; Punkte und Griffe sind im 3D weder zu sehen noch zu greifen
  (K:3142 zeigt dort nur Bänder). G/S/R über dem 3D-Blatt nimmt die letzte Maus aus einem Blatt (Fehler 6.5).
- **Rückmeldung unter dem Zeiger:** kein Hervorheben vor dem Klick; während des Zugs wird der Zeiger zum Standardpfeil.
- **Vorher-Umriss** als dünne Linie während des Zugs (zum Vergleichen), **Maße** (Abstand, Winkel).
- **Schutz vor Versehen:** Ein Klick auf eine Linie mit 2 px Wackeln verschiebt den ganzen Loop und löst Verdichten und
  Setzen aus (K:2045, K:2925).

---

## 6. Fehler, Wettläufe, Speicher, Stocken

### 6.1 Was Stocken erzeugt

1. **Zerlegen im Hauptthread nach jeder Netzänderung** (K:1451–1456): 30 ms nach dem Loslassen, nach ⌘Z (das alte Netz ist
   nicht mehr unter den zwei gemerkten Systemen, Z:21), nach K, Löschen, neuem Loop, neuem Punkt. Dort gemessen 0,13 s bis
   über 1 s. Greift Florian in dieser Zeit den nächsten Griff, wartet sein Klick. Wegen der Liniengenauigkeit (3.3 Nr. 5)
   ändert sich das Netz nach fast jedem Zug an einem Detail.
2. **Drücken 84–156 ms** trotz fertiger Zerlegung (1.1).
3. **Loslassen 71–200 ms** synchron: vier Runden, Kreuzungen aller Loop-Paare (K:400–427, L:625–663, je Paar jede Strecke
   gegen jede, mit Objekten je Strecke), Verdichten, Linien auf den Pfad mit eigenem Löser, alles neu zeichnen.
4. **Anzeige je Mausbewegung, nie gemessen:** drei SVG-Blätter ganz neu (K:1323), darin erzwungenes Layout:
   `getBoundingClientRect` wird nach jeder DOM-Änderung wieder gelesen (K:1315, über `skala` K:673 auch je gezeigtem Griff
   K:1264). Vier Band-Geometrien neu samt GPU-Puffern (K:1191–1198). Normalen der ganzen Haut und Hüllkugel (K:1036–1081).
   Das wächst mit der Zahl der Loops und Proben, nicht mit dem Löser. (gelesen; Dauer vermutet)
5. **Speicherdruck je Mausbewegung:** Je Runde werden rund 22 Felder der Größe „Punkte × 8 Byte“ neu angelegt
   (`vermessen` 8 n, Krümmung ≈ 5 n, rechte Seite 3 n, Lösen 6 n: `dicht/kurven.ts`:720–723, AK:718–734, AK:932, Z:311–318),
   dazu Anzeige 6 n (K:1036, K:1042) und die Listen der Bänder. Bei 15 000 Punkten sind das etwa 3–4 MB je Ereignis, über
   100 MB je Sekunde. Die Speicherbereinigung kann daraus Aussetzer von einigen Millisekunden machen. (gelesen; Wirkung
   vermutet, im Leistungsprofil des Browsers zu prüfen)
6. **Langsame Datenform im heißen Pfad:** Nachbarn als Feld von Feldern, Gewichte als ein Typfeld je Punkt, `forEach` mit
   Funktionsaufruf je Nachbar (`dicht/kurven.ts`:731, AK:972, AK:984), in `hautNormalen` ein Feld je Dreieck (Zeile 187).
   Flache Felder (Start/Index/Wert) rechnen dasselbe schneller. (gelesen; Faktor vermutet)
7. **Das Netz wächst über die Sitzung** (Teilen ab 1,75, Zusammenlegen erst unter ½ Startkante): Jede Runde wird teurer.
   Florians Bild: 26 284 Punkte, 126 ms je Zug (P Abschnitt 11).

### 6.2 Wettläufe

- **Worker-Einwechseln** (nur `geometrie`): sauber gesichert. Jede Antwort trägt eine Nummer (K:2259–2264), das Zugende
  verwirft eine laufende Verfeinerung (K:2297), Griff-Züge lösen keine aus (K:2090). Zwei Schwächen: Der Worker hat keine
  Fehlerbehandlung; wirft die Zerlegung („nicht positiv definit“, Z:275), bleibt `verfeinerung` gesetzt und der Rest des
  Zugs verfeinert nicht mehr. Ein überholter Auftrag wird nicht abgebrochen, der nächste wartet dahinter.
- **Setzen gegen Greifen** (Standard): Der Zeitgeber prüft `zug` (K:1450, K:1453). Greift Florian vor dem Setzen, beginnt
  der Zug auf dem **ungesetzten** Netz, und die erste Mausbewegung enthält das ganze Setzen (Sprung von einigen Einheiten
  beim Anfassen). `nachLoesenOffen` bleibt dabei stehen und löst nach dem Zug ein weiteres Setzen aus, auch wenn dieser
  Zug nichts verdichtet hat (K:1457, K:2317). (gelesen; Größe vermutet)
- **Setzen gegen Zeichnen:** Der Zeitgeber prüft nur `zug`, nicht Stift, Form oder Loop-Schnitt. Er kann mitten in einer
  solchen Geste das Fenster anhalten. (gelesen; selten)

### 6.3 Speicher

- **Der Rückgängig-Stapel wächst unbegrenzt** (K:349; neun `push`, kein Kürzen). Jeder Schritt hält eine Kopie aller Lagen
  (K:364) und, sobald sich das Netz geändert hat (nach fast jedem Zug), das ganze alte Netz (Dreiecke, Nachbarlisten als
  Feld von Feldern, Proben). Bei 26 000 Punkten sind das einige Megabyte je Schritt. Über eine lange Sitzung wird daraus
  ein Speicherleck. (gelesen; Größe geschätzt)
- Sonst sauber: Geometrien werden freigegeben (K:613, K:794, K:1196), der Zerlegungsspeicher hält zwei Systeme (Z:21),
  Zeiten höchstens 200 Einträge (K:2081).

### 6.4 Was sauber gelöst ist

- Punkte sind die Wahrheit: Nach dem Zug bleiben sie, wohin sie gezogen wurden, statt von der Haut zurückgelesen zu werden
  (L:922–930). Kein Wandern der Ankerpunkte.
- Ein Punkt ändert nur seine zwei Stücke, ein Griff nur sein Stück (L:676–717); Einfügen teilt genau (L:2475–2517).
- Rückgängig nimmt einen ganzen Zug zurück, auch über Stufen und Netzwechsel hinweg (K:2122, K:2181, K:2220).
- Doppelklick über die Zeit des Ereignisses (K:2853–2859).
- Gezeichnet wird im 3D nur bei Bedarf (K:3155).
- Zerlegung gemerkt und in der Ruhe vorgerechnet (Z:56–69, K:1448–1456): richtig gedacht, nur im falschen Thread.

### 6.5 Kleine Fehler

1. **G/S/R mit veralteter Maus** (K:3068): `maus` wird nur über einem Blatt gesetzt (K:2935). Steht der Zeiger beim
   Tastendruck über dem 3D-Blatt oder der Leiste, startet der Zug an der letzten Stelle im Blatt; die erste Bewegung
   springt um den Abstand.
2. **Achse X/Y/Z während G/S/R** rechnet mit `maus` (K:3042), das aus einem anderen Blatt stammen kann als der Zug.
3. **G/S/R lässt sich nur in einem Blatt bestätigen** (K:2866 hängt an den Blättern); ein Klick im 3D-Blatt dreht die
   Kamera, der Zug läuft weiter.
4. **`pointercancel` übernimmt den Zug** (K:2989 → `zugEnde(true)`), statt ihn zurückzunehmen.
5. **Tasten ohne Prüfung der Zusatztasten** (K:3067): ⌘S startet Skalieren, ⌘R Drehen.
6. **Esc bricht einen Zug mit der Maus nicht ab** (K:3047); der Kommentar K:2105–2106 behauptet es.
7. **Loops können nicht übereinander hinweg gezogen werden.** Jede Linie ist eine Kette im Netz und wird nur beim Anlegen
   eingesetzt (einziger Aufruf K:2397). Zieht man ein Auge über einen Ring, kreuzen sich die Ziele, die Ketten können es
   nicht: Die Dreiecke dazwischen müssen umklappen. (gelesen, dass nichts neu eingesetzt wird; Folge vermutet; in
   Planseite und Bilanz nicht gefunden)

---

## 7. Was ich vorschlage (Ablauf und Anzeige; den Löser selbst prüfen andere)

Vor jedem Vorschlag steht, ob die Planseite ihn schon kennt.

**A. Löser im Bildtakt statt im Mausereignis, und weiterrechnen, solange gehalten wird.**
`pointermove` merkt nur die Maus und zeichnet Punkt, Griff und Bézier-Pfad sofort. Im Bildtakt: Ziele aus der letzten Maus,
so viele Runden, wie ins Zeitbudget passen, Haut zeigen. Steht die Maus, laufen die Runden weiter, bis sich die Haut je
Runde weniger als etwa 0,1 px bewegt (mit Obergrenze). Beim Loslassen ist dann nichts mehr nachzuholen (Quelle A weg), und
das Ergebnis hängt nicht mehr an der Zahl der Ereignisse.
- Planseite: nicht gefunden (gesucht: Leerlauf, requestAnimationFrame, je Bild). Das Kriterium „zwei Bilder nach der
  letzten Mausbewegung steht die Form“ (P Abschnitt 11) setzt genau das voraus, gebaut wurde es nicht.
- Ehrliche Grenze: Es behebt den schnell aufholenden Rückstand, nicht das langsame Kriechen (P Abschnitt 18: „wohin sie
  über viele Runden kriecht, entscheidet das Netz“) und nicht das Nachhinken bei schneller, gleichmäßiger Bewegung. Und es
  zeigt, was der Löser wirklich meint, auch seine Fehler (P Abschnitt 6: Überhang „mit mehr Runden schlechter“) — dann
  aber im Zug, wo Florian gegensteuern kann, statt danach. Nicht gemessen.

**B. Kurven sofort im Hauptthread, Haut im Worker.**
Die Kurven sind die Wahrheit und kosten Mikrosekunden. Rechnet der Löser in einem Worker (Lagen als geteilter oder
übertragener Puffer), folgt der Griff der Maus mit voller Bildrate, die Haut läuft ein, zwei Bilder nach, und weder Runden
noch Zerlegen noch Speicherbereinigung halten das Fenster an. Zerlegen, Verdichten, Einbetten liegen dann im selben Worker.
- Planseite/Bilanz: Die Bilanz nennt nur „Verfeinern und Matrixaufbau in den Worker“ (Bilanz 6, Tabelle) und danach
  WebAssembly. Dass die *Bedienung* vom Löser getrennt wird, steht nirgends. Der Kern ist dafür schon DOM-frei.

**C. Den fertigen Löser behalten statt nur die Zerlegung.** Der Vorrechner baut ihn ohnehin (K:1455). Über die ganze Haut
hängt er nicht an der Auswahl. Übernommen beim Greifen fällt das Drücken von 84–156 ms auf den Schnappschuss. Klein, ohne
Risiko. Planseite: nicht gefunden.

**D. Netzpflege als eine Hintergrund-Transaktion.** Nach dem Loslassen: Verdichten, Zerlegen, Setzen und das
Nachverfeinern auf einer Kopie im Worker, bis nichts mehr zu teilen ist; dann **einmal** einwechseln, und nur wenn Florian
gerade nichts hält (sonst verwerfen und nach dem nächsten Zug neu). Aus bis zu fünf Stufen und mehreren Halten wird eine
Änderung ohne Halt. Die Änderung selbst bleibt, solange die Form am Netz hängt; das ist eine Löserfrage.
- Planseite: Hintergrund-Zerlegung gibt es nur nach der Geometrie (P Abschnitt 10); „Verdichten in den Worker“ steht dort
  als offen. Für den Standard-Löser gibt es den Weg nicht (`vorlage`/`nurZeilen` nur nach der Geometrie, AK:356–357).

**E. Verfeinern im Zug auch für den Standard-Löser prüfen.** Die Planseite schließt es mit einem Argument aus („sonst
schwimmt die Haut bei jedem Netzschritt“, P Abschnitt 8), gemessen wurde es nur nach der Geometrie (P Abschnitt 10). Im
Zug bewegt sich ohnehin alles; ein Netzwechsel fällt dort weniger auf als nach dem Loslassen, und am Ende bleibt nichts
offen. Braucht D (echte Zerlegung des neuen Netzes aus dem Worker, kein Weiterziehen mit der alten). Als Test mit Florians
Auge, Kriterium: Änderung nach dem Loslassen ≤ ½ px bei Hals und Ohr. Ausgang offen.

**F. Griffe in wahrer Länge zeigen.** Kein Faktor. Für sehr kurze Griffe: größere Trefferfläche als Zeichen, ⌥-Ziehen am
Punkt zieht Griffe heraus, Zoom gibt es schon bis 4 000 %. Mindestens: den Faktor nach dem Loslassen nicht neu rechnen,
solange der Punkt gewählt bleibt. Planseite: nicht als Problem geführt.

**G. Im Zug den Bézier-Pfad zeichnen** (aus `p.cur` und `zug.griffeNeu`, beides liegt vor) statt des Streckenzugs: gleiche
Linie vor und nach dem Loslassen, und weniger DOM. Im 3D das Band aus dem fein abgetasteten Pfad.

**H. Anzeige billiger:** SVG-Elemente behalten und nur Attribute ändern, Feldgrößen merken (kein Layout je Ereignis),
Band-Puffer wiederverwenden, Arbeitsfelder des Lösers wiederverwenden, flache Nachbarfelder. Und zuerst **messen**: die
ganze Zeit vom Ereignis bis zum Bild, nicht nur den Löser.

**I. Liniengenauigkeit am Bildschirm ausrichten** (etwa ⅓ px beim aktuellen Zoom statt fest MK/40): weniger Netzwechsel
bei normalem Zoom, genauer bei hohem.

**J. Präzisionswerkzeuge** (5.2), in dieser Reihenfolge des Nutzens: Zahleneingabe und Koordinatenfeld; ⇧ fein und
Pfeiltasten; Einrasten (Punkte, Kreuzungen, Mitte, Winkel); Griff-Arten; Auswahlrechteck; Wiederholen; Bearbeiten im 3D.

**K. Aufräumen:** Rückgängig-Stapel begrenzen; die Fehler aus 6.5; die Schalter `kruemmung`, `richtung`, `maxnormalen`,
`winkel`, `genauHaut` entfernen (die Bilanz schlägt das Aufräumen schon vor).

**Reihenfolge nach Aufwand und Wirkung:** F, G, C (je klein, sofort sichtbar) → A → H mit Messung → D → B → E als Test.

---

## 8. Was ich nicht prüfen konnte

- **Keine eigene Messung.** Größe und Anteil jeder Quelle nach dem Loslassen stammen aus der Planseite. Ob A (Leerlauf-
  Runden) im Standard-Löser spürbar hilft, ist offen: Die Planseite misst dort für die Runden am Ende nur 0,1–1,4 Einheiten
  bei langsamen 30 Mausschritten.
- **Wie der Browser Mausereignisse zusammenfasst** und wie viele Ereignisse je Sekunde bei Florian ankommen.
- **Was Anzeige und Speicherbereinigung je Mausbewegung kosten.** Aus dem Code folgt nur, dass sie anfallen und nie
  gemessen wurden.
- **Ob der Griff-Sprung (3.3 Nr. 1) das ist, was Florian meint.** Die Rechnung im Code ist eindeutig; gesehen habe ich es
  nicht. Ein Blick mit ihm auf einen kurzen Griff an einem Ohr klärt es in einer Minute.
- **Die Folge beim Ziehen eines Loops über einen anderen** (6.5 Nr. 7).
- Die Pose (anderer Löser, Bereich) habe ich nur mitgelesen, nicht eigens geprüft.
