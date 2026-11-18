# Vergleich: das Fenster von Sitzung 4 (5197) und Ozzy

**18.11.2026, mittags.** Florian: „Das mesh wirkt einfach viel fragiler als in der version auf 5197. Es sollte doch exakt gleich
sein oder? […] Ich vermute es ist ein grundsätzliches problem. Vergleiche die beiden versionen nochmal ausführlich. Was fehlt aus der
letzten großen fable session und welche punkte waren bei ihr noch offen? haben wir schon etwas umgesetzt.“ Seine zwei Fotos dazu:
[`5-fenster-5197-delfin-von-hand.jpg`](../look/ozzy/2026-11-18-florian-test/5-fenster-5197-delfin-von-hand.jpg),
[`6-ozzy-delfin-mit-linie-knick-in-der-flosse.jpg`](../look/ozzy/2026-11-18-florian-test/6-ozzy-delfin-mit-linie-knick-in-der-flosse.jpg).
Verglichen ist am Code (Zeile für Zeile) und mit wenigen gezielten Läufen, keine Messreihen.

## Kurz

1. **Die Rechnung ist dieselbe.** Ozzy sitzt direkt auf dem letzten Stand von Sitzung 4, nichts von dort fehlt. An einer Form mit
   Linien ergibt derselbe Zug in allen drei Fenstern dasselbe Netz.
2. **Du hast trotzdem recht: Frische Formen gehen in Ozzy schneller kaputt.** Das liegt nicht am Bearbeiten, sondern daran, wie die
   Form entsteht. Auf 5197 hast du aus der großen runden Startform Schritt für Schritt geformt. In Ozzy entsteht die Form in einem
   Schritt aus der Silhouette: zehnmal weniger Rechenpunkte, eine einzige Linie, und die dünnen Stellen sind von Geburt an kaputt.
3. **Dazu kommt ein Rückschritt von mir aus der Nacht (C1).** Läuft die Rechnung an einer frischen Form davon, wurde das bis gestern
   erkannt und verworfen; die aufgeblasene Form blieb. Seit ich die Schrittweite begrenzt habe, läuft sie langsam ins Falsche und
   wird angenommen. Das gilt mit und ohne Linie.
4. **Deine Idee mit vorgezeichneten Loops trägt.** Dieselbe Form, die mit einer Linie zum Ballon wird, bleibt mit fünf Loops rundum
   ein Delfin.

## 1. Was am Code gleich ist und was nicht

| Teil | Sitzung 4 (Zweig `claude/form-bau`, 5197) gegen Ozzy heute |
| --- | --- |
| Herkunft | Ozzy beginnt genau am letzten Commit von Sitzung 4 (`f248c538`). In `form-bau` gibt es nichts, was Ozzy fehlt (0 Commits). |
| Rechenkern (`packages/shape/src/dicht`, `loeser`) | **Bis zum 18.11., 1 Uhr nachts: keine einzige geänderte Zeile.** Seitdem drei Commits von mir: C1 (Schrittweite, feste Kanten der Mittelebene, Aufrichten, Spiegelpaare), C2 (Loop quer mit P), D1 (Gewichte und Vermessen auf der Hälfte). |
| Fenster-Logik (`kurven.ts` dort, `werk.ts` hier) | Der Schnitt ist nachgerechnet: `kurven.ts` von Sitzung 4 und die Vorlage des Schnitts sind gleich; seit dem Schnitt kamen im Werk 302 Zeilen dazu, 4 wurden geändert. Dazugekommen: Aufblasen aus der Silhouette (`neuAusUmriss`), der Griff im Raum, die Meldung der Bildkosten („flüssig zuerst“ greift damit auch in Ozzy), Loop quer mit P, Aufrichten, die Pause beim Verfeinern im Zug. |
| Schalter | dieselben Voreinstellungen (Gewichte nach der Geometrie, kleines Rechennetz, Rechnung auf der Hälfte) |
| Anzeige | 5197: flächig in drei Tönen. Ozzy: Seifenhaut und Linienansichten. Die glatte Anzeige darunter ist dieselbe Rechnung. |

**Ein gezielter Lauf dazu:** „strange bird“ geladen, der höchste Punkt 70 Einheiten hinauf, gehalten, losgelassen, zurückgezogen.
Gemessen ist die Haut selbst, in allen Fenstern gleich gezählt.

| Fenster | Punkte vorher / nach dem Loslassen / zurück | umgeschlagen vorher / gehalten / in Ruhe | Knick zwischen Nachbardreiecken |
| --- | --- | --- | --- |
| 5197, Fenster von Sitzung 4 | 7 437 / 7 461 / 7 449 | 0 / 2 / 0 | 5,8° → 5,9° |
| 5205, Prüffenster von heute | 7 437 / 7 455 / 7 451 | 0 / 2 / 0 | 5,8° → 5,9° |
| Ozzy, eingerastete Seite | 7 437 / 7 455 / 7 451 | 0 / 2 / 0 | 5,8° → 5,9° |

## 2. Warum es sich trotzdem fragiler anfühlt

**a) Die Form entsteht anders.** Das ist der grundsätzliche Unterschied.

| | deine Formen von 5197 | frisch aufgeblasen in Ozzy |
| --- | --- | --- |
| Anfang | die runde Startform: 1 500 Rechenpunkte für einen Körper mit Halbmesser 150 | die Silhouette in einem Schritt: 270 bis 330 Rechenpunkte |
| Weg | viele kleine Züge, nach jedem verfeinert das Netz, dünne Teile wachsen mit feinem Netz | keine Zwischenschritte: Flossen und Schnabel (5 bis 12 Einheiten breit) entstehen bei einer Netzkante von 15,6 |
| Stand danach | 3 500 bis 11 400 Punkte („strange bird“: 7 400), viele Linien | 650 bis 730 Punkte, eine Linie (oder keine) |
| Knick zwischen Nachbardreiecken | 5,8° | 14° bis 15° |
| umgeschlagene Dreiecke in Ruhe | 0 | 2 bis 12, schon vor jedem Zug |
| im Zug (ein Punkt 40 hinauf) | 2 | bis 16 |

Die Netzweite ist eine feste Zahl (15 Einheiten). Für die dicke Startform ist das fein; für einen schlanken Delfin mit Flossen ist es
im Verhältnis zur Dicke vier- bis dreißigmal gröber. Dazu kommt, was Sitzung 4 schon gemessen hat (Schritt 3, 13.11.): Zwischen
wenigen Linien legt die Rechnung die Form nicht fest.

**b) Der Rückschritt aus C1.** Im Kern nachgestellt, an der zweiten nachgezeichneten Silhouette mit feinem Netz:

| Fall | Kern von heute | wie bis gestern Nacht (ohne Schrittweite) |
| --- | --- | --- |
| mit Linie der Mitte | „steht“, Rauminhalt 0,83 → 2,82 Mio., halbe Dicke 42 → 107: **Ballon, angenommen** | „nicht endlich“: **abgebrochen, die aufgeblasene Form bleibt** |
| ohne Linie | „steht“, Rauminhalt 0: **Punkt, angenommen** | abgebrochen, die aufgeblasene Form bleibt |

Die Schrittweite hatte ich eingeführt, damit eine frische Form beim ersten Griff nicht mehr auseinanderfliegt. Sie macht aus einem
Auseinanderfliegen (das die Sicherung fängt) ein langsames Davonkriechen (das niemand fängt). An deinen Formen mit Linien greift sie
nicht, wie der Lauf oben zeigt.

**c) Die Anzeige** zeigt in der Seifenhaut jede Falte als Glanzlicht. Sie ist aber nicht die Ursache: Dieselbe frische Form ist auch
in der flächigen Anzeige zerknittert.

Bild: [`2026-11-18-vergleich-frische-form.png`](../progress/ozzy/2026-11-18-vergleich-frische-form.png)

## 3. Deine Idee: Loops vorzeichnen

Ein Lauf: die zweite Silhouette aufgeblasen (feines Netz, 1 271 Punkte, Rauminhalt 0,83 Mio., halbe Dicke 42), ohne das Neurechnen
danach; dann fünf Loops rundum mit P quer über den Körper.

| | Rauminhalt | halbe Dicke | umgeschlagen |
| --- | --- | --- | --- |
| nur die Linie der Mitte, Rechnung von heute | 2,82 bis 5,80 Mio. | 107 bis 156 | 84 |
| mit fünf Loops rundum | 0,66 Mio. | 34 | 13 |

Mit Loops hat die Rechnung einen festen Ausgang: Die Form bleibt ein Delfin, etwas schlanker als aufgeblasen. Die 13 umgeschlagenen
Dreiecke sitzen an den dünnen Spitzen; das ist das Netz von der Geburt, nicht die Loops.

## 4. Was aus Sitzung 4 offen war und wo es heute steht

Gebaut hat Sitzung 4: glatte Anzeige, kleines Rechennetz, Donut, Rechnung auf der Hälfte (erster Teil), „Maul formen“ bis zum Maul
aus einer Linie, Abzweigungen, Posen Etappe 2 und 3. Alles davon ist im Werk und in Ozzy benutzbar.

| Offen in Sitzung 4 (Stand 14.11.) | Heute |
| --- | --- |
| Rest der halben Haut (4c): Gewichte und Vermessen auf der Hälfte, die einzelnen langsamen Bilder | **gebaut** (D1 Teil 1 und 2, 18.11.) |
| Rest der halben Haut: Verdichten und Anzeige auf der Hälfte, das Netz selbst als Hälfte | gemessen, nicht gebaut |
| Umgeschlagene Dreiecke an der Mitte und an dünnen Spitzen | **zum Teil:** Aufrichten (C1): im Messblatt 46 → 12; an frischen Formen weiter 2 bis 12 |
| Punkte ohne Spiegelbild | **behoben** (C1) |
| „flüssig zuerst“ griff in Ozzy nicht | **behoben** (A1, 17.11.) |
| Greifen hing vom Bild davor ab | **behoben** (B1, 17.11.) |
| Loop rundum nur gerade | **gebaut:** gebogen, mit beliebig vielen Punkten (C2) |
| Auswahl wie in Blender (Schritt 7, „eher später“) | **zum Teil:** Lasso, Felder wählen, G, S, R (C4) |
| Start ohne Linie: erste Linie und erster Zug an einer Form ohne Linien („zu prüfen“, Prüfung vom 17.11.) | **nicht gelöst**, durch C1 schlimmer geworden: Schritt 1 im Plan nach dem ersten Test |
| „Die Haut nur aus den Linien scheitert zwischen wenigen Linien“ (Schritt 3, 13.11.) | unverändert; das ist der Kern des Problems mit frischen Formen |
| Pose Etappe 4 (beide Seiten frei) und 5 (dein Ablauf) | offen: neue Sitzung |
| Maul-System | offen: neue Sitzung, zuerst beschreibst du die Fälle |
| Griff eines glatt gesetzten Punkts bei Abzweigungen | offen |
| Zeichnen gegen die feine Fläche (Schritt 2) | nicht gebaut |
| Aufräumen (30 Schalter in `kurven.ts`, alte Rechnung, alte Proben) | offen, nur mit deinem Ja |
| Deine Urteile zu Abzweigungen und Pose Etappe 2 und 3 | stehen aus |

## 5. Was daraus folgt

Schritt 1 des Plans [`2026-11-18-ozzy-nach-dem-ersten-test.md`](../plans/2026-11-18-ozzy-nach-dem-ersten-test.md) bekommt drei Teile,
die ich in dieser Reihenfolge bauen würde:

1. **Die Sicherung wiederherstellen (klein, behebt meinen Rückschritt):** Ein Ergebnis, das die Form verliert, wird wieder verworfen,
   die aufgeblasene Form bleibt. Ohne Linien rechnet der Löser nie. Probe: die drei Formen aus dem Plan, mit und ohne Linie, grobes
   und feines Netz; die Form nach 5 s ist die aufgeblasene.
2. **Die frische Form bekommt ein Netz wie eine von Hand geformte:** so fein, wie ihre dünnste Stelle es braucht, mit sauberen
   Spitzen. Ich teste es, Kriterium: nach dem Aufblasen kein umgeschlagenes Dreieck, Knick zwischen Nachbardreiecken unter 8°.
3. **Loops vorzeichnen (deine Entscheidung):** Wo sie sitzen sollen, ist die Frage. Mein Vorschlag zum Ansehen: Ozzy kennt beim
   Aufblasen die Mittelachse der Zeichnung und die Dicke an jeder Stelle. Daraus lassen sich Loops rundum setzen, wo der Körper am
   dicksten ist, an jeder Engstelle und am Ansatz jeder Flosse. Du bekommst ein Bild mit zwei, drei Fassungen an deinen Delfinen,
   bevor etwas Standard wird; jeder Loop bleibt löschbar.
