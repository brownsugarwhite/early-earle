# Loft-Messung an Florians Formen (11.11.2026)

**Anlass.** Florian hat mit Plasticity gespielt: Formen sind dort immer rund und glatt, bei voller Szene schnell. Seine Frage:
„Warum waren Lofts für uns keine bessere Lösung?“ Antwort aus den Akten: Verworfen wurde am 12.10. ein Loft aus drei Silhouetten
(gescheitert an den Silhouetten). Ein Loft durch gezeichnete Linien im Raum, wie in Plasticity, wurde nie gebaut; er wurde am
21.10. und am 09.11. nur mit Argumenten abgelehnt. Diese Seite ist die Messung dazu. **Am Fenster und am Löser ist nichts
geändert**; alles ist Messcode in `apps/editor/scripts/pruefen/loft-2026-11-11/`.

## Kurzfassung

1. **Wo eine Form ein Schlauch mit Ringen quer dazu ist, ist der Loft klar besser.** Am Schwanz des Firefish liegt die heutige
   Haut im Mittel 0,2 Einheiten neben dem Loft (größter Abstand 2,0 = 3 % der halben Höhe). Derselbe Zug kostet mit dem Loft
   0,3–3,5 ms und ist in einem Schritt fertig; der Löser braucht 7–8 Runden, zusammen 350–610 ms. Die Zebrastreifen des Lofts
   sind ruhiger.
2. **Das trifft aber nur einen kleinen Teil deiner Formen.** Beim Firefish sind Hals (ab Ring 14) und Schwanz zusammen 10 %
   der Fläche, mit den zwei Flossen rund 18 %. Beim Bird gibt es keinen Teil mit zwei Ringen quer hintereinander, nur
   Schnabel- und Schwanzspitze (rund 5 %). Deine Loops sind überwiegend keine Querschnitte, sondern freie Linien: längs,
   schräg, einander kreuzend.
3. **An einer Abzweigung versagt der Loft.** Zwischen Ring 13 und 14 zweigt am Halsansatz ein Lappen ab. Der Loft bläht sich
   dort zu einer Blase (Haut im Mittel 8,8, bis 36,6 Einheiten daneben = 62 % der halben Höhe).
4. **Der allgemeine CAD-Weg wäre „eine Fläche je Feld zwischen den Linien“.** Deine zwei Formen haben 20 und 27 Felder; nur
   ein Viertel bis ein Drittel der Fläche liegt in Feldern mit vier Seiten. Der Rest hat 2, 3, 5 oder 6 Seiten.
5. **Zwei Behauptungen vom 21.10. und 09.11. sind jetzt gemessen** (an den vierseitigen Feldern, Fläche nur aus den vier
   Randlinien): „Zwischen wenigen Linien wird die Fläche flach“ stimmt meist nicht (größter Abstand zur heutigen Haut meist
   1–3 % der Feldgröße), in einzelnen Feldern doch (9–19 %). „An den Linien knickt es“ stimmt: im Mittel 4–12°, bis 26°.

**Was das heißt:** Der Loft ersetzt die dichte Haut nicht, solange du Linien frei auf die Form legst. Er ist aber das richtige
Mittel für alles Schlauchförmige (Schwanz, Hals, Horn, Bein) und dort hundert- bis tausendmal schneller bei gleicher Form.
Das ist Wissen für den späteren Schritt „Teile anfügen“; an der Reihenfolge ändert es nichts.

## Was gemessen wurde

- **Formen:** `wesen/teat firefish.eewesen` (27 770 Punkte, 17 Loops) und `wesen/strange bird.eewesen` (16 010 Punkte, 9 Loops).
  Die Loops mit Nummern: `docs/progress/editor/loft-loops-firefish-2026-11-11.jpg`, `loft-loops-bird-2026-11-11.jpg`.
- **Der Loft** (`loft.ts`): Querschnitte sind die Ringe (halb gezeichnet, gespiegelt). Zwei Führungen sind die Seitenlinie oben
  und unten. Am Schwanz kommt Linie 7 als dritte Führung dazu. Hinter dem letzten Ring läuft die Fläche zur Spitze der
  Seitenlinie. Die Fläche geht genau durch alle Ringe und die Seitenlinie (gemessen ≤ 0,06 Einheiten). Dazwischen wird die
  Form der Ringe weich überblendet. Es sind geschlossene Formeln, es gibt keinen Löser. In CAD heißt das „Loft mit
  Führungskurven“.
- **Die Schläuche habe ich von Hand benannt** (welche Ringe in welcher Reihenfolge). Eine Erkennung gibt es nicht.
- **Vergleich:** Abstand jedes Hautpunkts im Schlauch zum Loft; derselbe Zug (ein Ringende 30 Einheiten nach außen) mit dem
  Loft und mit dem Löser der Grundform (über die ganze Haut, nach der Geometrie, bis kein Punkt mehr als 0,05 Einheiten geht).
- **Einheiten:** Der Firefish ist 1 480 Einheiten lang, die Startkante des Netzes misst 8,6.

## Ergebnisse am Firefish

| | Hals (Ringe 14, 16, 17, Kopf) | Schwanz (Ringe 6, 9, Spitze, Linie 7) |
|---|---|---|
| Anteil an der Fläche | 5,8 % (1 831 Punkte) | 4,5 % (1 346 Punkte) |
| heutige Haut neben dem Loft: Mitte / 90 % / größter | 1,4 / 5,2 / 7,6 Einheiten | 0,2 / 0,8 / 2,0 Einheiten |
| dasselbe in % der halben Höhe | 3,5 / 13 / 19 % | 0,4 / 1,4 / 3,4 % |
| Loft neu aus den Linien | 0,30–0,35 ms | 2,9–3,2 ms |
| Zug mit dem Löser bis zur Ruhe | 7 Runden, 355–611 ms | 8 Runden, 353–583 ms |
| Zug mit dem Loft | 0,30–0,45 ms, ein Schritt | 2,9–3,5 ms, ein Schritt |
| nach dem Zug: Haut des Lösers neben dem Loft | 2,0 / 11,6 / 17,3 Einheiten | 0,6 / 3,1 / 5,8 Einheiten |
| Knick am ersten Ring, setzte man den Loft dort an die übrige Haut | im Mittel 11,5°, bis 71° | im Mittel 3,0°, bis 7,6° |

- **Schwanz:** praktisch dieselbe Form. Bild `docs/progress/editor/loft-schwanz-2026-11-11.jpg`.
- **Hals:** ähnliche Form, sichtbar anders an der unteren Flanke zwischen Ring 14 und 16 und am Kopf. Zwischen wenigen Ringen
  bestimmt beim Loft die Formel die Fläche (die Breite geht mit der Höhe der Seitenlinie mit), bei der heutigen Haut der Löser
  („so rund wie möglich“). Keine der beiden ist falsch; nach dem Zug liegen sie weiter auseinander (bis 17 Einheiten).
  Bild `loft-hals-2026-11-11.jpg`, nach dem Zug `loft-zug-2026-11-11.jpg`.
- **Linie 15** läuft längs über den Hals und ist weder Querschnitt noch Führung. Der Loft kennt sie nicht: Sie liegt im Mittel
  2,3, bis 5,3 Einheiten neben ihm. Eine Linie, die kein Querschnitt ist, hält ein Loft nicht.
- **Abzweigung** (Ringe 13 und 14, dazwischen der Lappen): Die Seitenlinie läuft dort um den Lappen herum, der Loft folgt ihr
  und wird eine Blase. Bild `loft-abzweigung-2026-11-11.jpg`.
- **Zeit je Punkt:** Loft 0,16 µs (Hals) bis 2,2 µs (Schwanz mit dritter Führung, nicht beschleunigt); Löser 1,6–3,1 µs je
  Punkt und Runde, mal 7–8 Runden. Der Loft rechnet außerdem nur den Schlauch, der Löser die ganze Haut.

## Felder zwischen den Linien (der allgemeine CAD-Weg)

Ein Feld ist ein Stück Haut, das ringsum von Linien begrenzt ist. Eine Seite ist ein Stück Rand, das zu einem Loop gehört.

| | Felder (gezeichnete Hälfte) | 2 Seiten | 3 Seiten | 4 Seiten | 5 Seiten | 6 und mehr |
|---|---|---|---|---|---|---|
| strange bird | 20 | – | 10 Felder, 35 % der Fläche | 5 Felder, 33 % | 4 Felder, 26 % | 1 Feld, 7 % |
| teat firefish | 27 | 3 Felder, 9 % | 8 Felder, 21 % | 8 Felder, 26 % | 6 Felder, 26 % | 2 Felder, 19 % |

Bilder: `loft-felder-bird-2026-11-11.jpg`, `loft-felder-firefish-2026-11-11.jpg` (grün = vier Seiten).

Für die vierseitigen Felder habe ich die einfachste CAD-Fläche gebaut, die nur die vier Randlinien kennt (Coons-Fläche), und
gegen die heutige Haut gemessen:

- **Abstand:** Firefish je Feld höchstens 0,8–4,1 Einheiten (1–3 % der Feldgröße), ein Feld am Bauch 31,5 (19 %). Bird je Feld
  höchstens 3,5–21,7 Einheiten (2–9 %). Die Linien allein tragen die Form also meist schon; wo ein Feld groß und gewölbt ist,
  fehlt die Fülle.
- **Knick an der gemeinsamen Linie zweier solcher Flächen:** Firefish im Mittel 3,8°, 90 % unter 9,3°, größter 12,6°
  (195 Stellen). Bird im Mittel 12,1°, 90 % unter 23,6°, größter 25,9° (117 Stellen). Die heutige Haut knickt dort nicht.

Damit so ein Flächennetz glatt und voll wird, braucht es Bedingungen an jeder Linie (gleiche Richtung beider Seiten) und eine
Regel für die Fülle im Feld. Soweit ich weiß (nicht nachgeprüft), löst Plasticity das beim Befehl „Patch“ ebenfalls mit einer
Ausgleichsrechnung, nur über wenige Kontrollpunkte je Fläche statt über 27 000 Netzpunkte. Felder mit 2, 3, 5 und mehr Seiten brauchen dazu eigene Bauarten. Das
ist die Regelfamilie, die die Bilanz vom 09.11. für „Flächenstücke über das Kurvennetz“ erwartet hat.

## Warum Plasticity trotzdem immer rund und schnell wirkt

In Plasticity baut man die Form in der Ordnung, die der Rechenkern braucht: Querschnitte in Reihe, Führungen, die jeden
Querschnitt kreuzen, Teile als eigene Körper, verschmolzen und verrundet. Dafür gibt es die Fläche als Formel. Deine heutige
Arbeitsweise ist freier: jede Linie an jede Stelle einer runden Form. Diese Freiheit ist es, die den Löser über das dichte Netz
kostet.

## Grenzen der Messung

- Zwei Formen, zwei Schläuche, von Hand benannt. Keine Kanten, kein Maul, keine Pose.
- Die Maschine war belegt (Last 6,5–10); die Zeiten des Lösers schwanken deshalb (zwei Läufe: 44–51 und 73–87 ms je Runde).
  Am Verhältnis ändert das nichts.
- Der Loft ist eine von mehreren möglichen Formeln. Eine andere Überblendung gibt zwischen den Ringen eine etwas andere Form.
- Löser: Arbeitsstand des Arbeitsbaums vom 11.11. gegen 06:50 mit den Standardwerten. Der Versuchsschalter `normalfluss` der
  bauenden Sitzung war aus; beide Läufe gaben dieselben Wege je Runde.
- Der Messcode zeichnet die Flanke des Schwanzes leicht streifig (die Ringform wird zwischen 96 Stützstellen gerade
  verbunden). Das ist ein Mangel des Messcodes, nicht des Verfahrens.

## Berichtigung meiner ersten Antwort

- „Nähte knicken die Farbstufen“ war am 21.10. gefolgert. Gemessen: ohne Zusatzbedingungen 4–12° im Mittel, bis 26°. Mit
  Bedingungen an den Linien ließe sich das beheben; das ist dann wieder eine Ausgleichsrechnung.
- „Zwischen wenigen Linien wird die Fläche flach“ war am 09.11. erwartet. Gemessen: meist nicht (1–3 % der Feldgröße), in
  großen gewölbten Feldern ja (9–19 %).

## Empfehlung

- Keine Richtungsänderung. Die dichte Haut bleibt für die freie Form.
- Wenn „Teile anfügen“ an der Reihe ist: Schwanz, Hals, Horn und Bein zuerst als Loft prüfen. Offen ist der weiche Übergang
  zum Körper; einfach angesetzt knickt er (Schwanz 3° im Mittel, Hals 11,5°). Kriterium für den kleinen Beweis: Übergang ohne
  sichtbaren Knick im Zebra, Zug unter 16 ms, Form im Schlauch höchstens 2 Einheiten neben der heutigen.

## Skripte

Aufruf aus `packages/shape`, Ausgabe nach `apps/editor/pruefen-ausgabe/loft/` (HTML; als Bild aus `apps/editor`:
`node scripts/pruefen/html-shot.mjs --jpg <datei.html>`).

- `npx vite-node ../../apps/editor/scripts/pruefen/loft-2026-11-11/messen.ts` — Loft gegen Haut, Zug mit Loft und Löser
  (`ZUG=0` ohne den Zug). Ausgabe des Laufs: `messung-firefish-2026-11-11.txt`.
- `…/felder.ts` — Felder, Seiten, Fläche nur aus den Randlinien, Knicke. Ausgabe: `felder-2026-11-11.txt`.
- `…/ansehen.ts` — Form mit nummerierten Loops; `…/uebersicht.ts` — Tabelle der Loops.
- `loft.ts` (Fläche, Netz, Abstand), `formen.ts` (laden, Bereiche), `bild.ts` (Bilder ohne Server).
