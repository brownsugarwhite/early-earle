# Beweis „Haut direkt aus den Linien“ (Schritt 3 des Plans vom 12.11.), Ergebnis vom 13.11.2026

Plan: [`../plans/2026-11-12-schnell-glatt-exakt.md`](../plans/2026-11-12-schnell-glatt-exakt.md), Schritt 3 und Anhang A.3.
Gerechnet wurde nur im Kern (`packages/shape/src/dicht/direkt.ts`), nichts im Fenster. Alle Zahlen stammen aus einem Lauf der
Probe `apps/editor/scripts/pruefen/form-direkt.ts` auf dem kleinen Rechennetz (Aufruf am Ende). Florian hat die Bilder noch
nicht beurteilt.

## Kurz

- **Der geplante Weg hält nicht.** „Die Haut ist eine Funktion der Linien allein“ (im Folgenden A) scheitert an zwei Stellen:
  Zwischen wenigen Linien werden Enden keilförmig und ein Rüssel flach, und die Richtung, die die Linien von selbst vorgeben,
  passt an Florians Formen nicht zur Haut. Seine drei Formen kommen verändert und mit umgestülpten Flächen zurück.
- **Ein Teil davon hält, und zwar gut** (im Folgenden B): Aus den Linien und der Wölbung, die die Haut schon hat, folgen die
  Lagen in einer einzigen Lösung. Damit bleibt das Horn am „strange bird“ beim Verlängern so dick, wie es war (heute wird es
  10 bis 16 % dicker), hin und zurück gibt bitgleich dieselbe Haut, und seine drei Formen kommen unverändert zurück.
- **B kann nichts Neues runden.** Zieht man einen Rüssel aus der Kugel, entsteht mit B keine runde Röhre. Das kann die heutige
  Rechnung (Breite zu Höhe 1,03).
- Damit ist die Frage für Florian: nach Plan weiter mit der heutigen Rechnung, oder zuerst prüfen, ob B und die heutige Rechnung
  zusammen das Ziehen exakt machen.

## Was der Beweis zeigen sollte

| Satz aus dem Plan | heute | A · nur aus den Linien | B · Linien bewegen die Haut direkt, ihre Wölbung bleibt |
| --- | --- | --- | --- |
| Ein Horn, das ich verlängere, wird nicht dicker und fällt nicht ein | wird dicker: +16 · +15 · +10 % | Dicke −9 · −2 · −3 %, aber 76 Dreiecke umgestülpt | bleibt: −0 · +1 · +3 % |
| Ein Rüssel nur aus zwei Profillinien wird rund und nicht flach | rund: Breite zu Höhe 1,03 | flach: 0,36, umgestülpt | nicht rund: 1,94 (der Körper geht mit in die Breite) |
| Die Kugel bleibt eine Kugel, auch wenn nur die Mittellinie da ist | bleibt | bleibt (0,14 % vom Radius, wie das Startnetz) | bleibt |
| Hin und zurück gibt genau dieselbe Form | nicht gemessen (rechnet in Runden) | Unterschied 0,0002 | Unterschied 0 (bitgleich) |
| Beim Loslassen ändert sich nichts | setzt sich in Runden | läuft nach jedem neuen Anlegen weiter weg | im Mittel 0,04, an der größten Stelle einmal 0,8, dann 0,3 und 0,2 (Kriterium 0,18) |
| Ein gröberes Netz gibt dieselbe Form | Mittel 0,14, größter 0,77 | Mittel 0,31, größter 1,24 | Mittel 0,10, größter 0,61 |

Zur letzten Zeile: Schlauch gestreckt auf 3 680 und auf 1 070 Punkten, Punkte des groben Netzes gegen die feine Fläche. Das
Kriterium (höchstens 0,18) ist damit nicht gezeigt; sauber messbar war es so auch nicht, weil schon die beiden Startnetze 0,2
bis 0,7 Einheiten neben der Kapsel liegen.

## Die Fälle im Einzelnen

**Kugel** (1 500 Punkte nur mit der Mittellinie, 1 784 mit drei Loops). Alle drei Rechnungen lassen sie stehen: größter Abstand
von der Kugel 0,22 bzw. 0,43 Einheiten, genau wie das Startnetz. A fünfmal neu angelegt: Die Fläche bewegt sich je Mal um
0,00 bzw. 0,02. Bild: `docs/progress/editor/schritt3-kugel-2026-11-13.jpg`.

**Schlauch** (Radius 50, 1 284 Punkte, Mittellinie und drei Ringe; das Stück zwischen den äußeren Ringen auf doppelte Länge).
Bild: `schritt3-schlauch-2026-11-13.jpg`.

| | Dicke zwischen den Ringen (vorher 49,94) | Enden gegen die runde Kappe | Knicke über 60° |
| --- | --- | --- | --- |
| heute | 49,85 (−0,19 %) | bis 2,4 | 0 |
| A | 49,86 (−0,17 %) | bis 12,7 (keilförmig, von oben gesehen spitz) | 30 |
| B | 49,90 (−0,09 %) | bis 0,7 | 0 |

Zwischen den Ringen hält also jede Rechnung die Dicke. Der Unterschied liegt an den Enden, die nur die Mittellinie hält. Neu
angelegt und noch einmal gerechnet: A läuft weiter weg (je Mal bis 19 bis 22 Einheiten, danach 62 umgestülpte Dreiecke). B
bewegt sich um 0,10 · 0,04 · 0,03, wenn die Normalen gemerkt bleiben, und um 0,5 je Mal, wenn sie jedes Mal neu von der Haut
gelesen werden.

**Rüssel nur aus zwei Profillinien** (Kugel mit Mittellinie und einem Ring weit hinten; die vordere Kappe in acht Schritten um
160 nach vorn, nach jedem Schritt verdichtet wie im Fenster). Querschnitt in der Mitte des Rüssels, Höhe 86:
heute Breite 88 (rund), A Breite 32 und 22 umgestülpte Dreiecke, B Breite 167 (die neue Wand erbt die Wölbung der Kugel am
Rand der Kappe und zieht den Körper mit). Bild: `schritt3-ruessel-2026-11-13.jpg`.

**Horn am „strange bird“** (7 628 Punkte; die Spitze bei y = 466 um 70 nach oben, die Punkte der Kreuzung gehen mit). Dicke
des Horns von vorn gesehen bei 40 / 60 / 80 % seiner Länge. Bild: `schritt3-horn-2026-11-13.jpg`.

| | Dicke | gegen vorher |
| --- | --- | --- |
| vorher | 62,1 · 64,9 · 63,2 | |
| heute, nur angefasst (ohne Zug, bis zur Ruhe) | 67,3 · 70,5 · 70,7 | +8 · +9 · +12 % |
| heute, verlängert | 71,9 · 74,6 · 69,3 | +16 · +15 · +10 % |
| A, verlängert | 56,6 · 63,7 · 61,2 | −9 · −2 · −3 %, 76 Dreiecke umgestülpt |
| B, verlängert | 61,9 · 65,7 · 64,9 | −0 · +1 · +3 % |

Der größere Teil des Dickerwerdens heute kommt nicht vom Verlängern: Die gesicherte Form ruht für die heutige Rechnung nicht,
schon das Anfassen lässt das Horn um 8 bis 12 % aufgehen. B rechnet einmal rund 240 ms, davon rund 230 ms für das Zerlegen und
3 bis 4 ms für das Einsetzen; solange die Normalen dieselben sind, wäre im Zug nur das Einsetzen nötig.

**Seine drei Formen, nichts gezogen, einmal gerechnet.** Abstand der Punkte zur gesicherten Fläche (Mittel / größter) und
umgestülpte Dreiecke (gesichert: 2 / 0 / 0). Bilder: `schritt3-strange-bird-…`, `schritt3-teat-firefish-…`,
`schritt3-test_kaputt-2026-11-13.jpg`.

| Form | heute | A | B |
| --- | --- | --- | --- |
| strange bird (7 628 Punkte) | 1,37 / 29,6 · 2 | 4,15 / 52,2 · 82 | 0,15 / 1,4 · 2 |
| teat firefish (11 765) | 0,09 / 1,8 · 0 | 4,86 / 69,2 · 112 | 0,10 / 0,9 · 0 |
| test_kaputt (2 166) | 0,08 / 0,8 · 0 | 2,40 / 18,1 · 10 | 0,10 / 0,8 · 0 |

B danach noch dreimal neu angelegt, Normalen gemerkt: je Mal höchstens 0,22 · 0,13 · 0,09 (strange bird), 0,23 · 0,12 · 0,08
(firefish), 0,17 · 0,09 · 0,06 (test_kaputt). Normalen jedes Mal neu von der Haut gelesen: je Mal 0,4 bis 1,0, und das wird
kaum kleiner.

## Warum A nicht hält

1. **Zwischen wenigen Linien fehlt eine Angabe.** A verteilt die Richtung der Linien so gleichmäßig wie möglich über die Haut.
   Eine Haut, deren Normalen so verteilt sind, ist überall gleich stark gewölbt (Satz von Ruh und Vilms, 1970). Kugel und
   Schlauch zwischen zwei Ringen sind solche Flächen, deshalb bleiben sie genau. Ein Schlauch mit runder Kappe ist keine: Der
   Schlauch ist halb so stark gewölbt wie die Kappe. Hält ihn nur die Profillinie, gleicht A das aus, und das Ende wird ein
   Keil. Die Gegenprobe: Gibt man die Wölbung an den Linien dazu (an der Haut gemessen), liegt das Ende noch 6,1 statt 12,7
   daneben; nimmt man überall die Wölbung der Haut, 0,8.
   Das ist dieselbe Lücke, die die Gegenprüfung vom 10.11. benannt hat (an einer Linie fehlt die Krümmung quer), nur von der
   anderen Seite gesehen: Ein Feld von Normalen füllt sie nicht.
2. **Die Richtung aus dem Liniennetz trägt nur an der Kugel.** `linienRichtung` setzt die Normale an Kreuzungen aus den beiden
   Linien und dreht sie dazwischen gleichmäßig. An der Kugel stimmt das auf 0,5°. An Florians Formen weicht es von der Haut
   ab: je Linie im Mittel 0 bis 15° (eine 39°); bei 20 von 30 Linien liegt ein Zehntel der Punkte mehr als 10° daneben, bei
   8 mehr als 30°; an einzelnen Stellen sind es bis 68°. An Kreuzungen sind es meist unter 5°, an einigen 12 bis 23°. Als
   Wahrheit genommen, biegt das seine Formen um bis zu 69 Einheiten und stülpt Flächen um.

Nach der Abbruchregel des Plans (Anhang A.3) ist A damit für den Anfang einer Form und für seine vorhandenen Formen nicht
tragfähig.

## Was an B dran ist und was fehlt

B benutzt nur die zweite Hälfte der neuen Rechnung: Je Kante steht eine Zeile „die Kante steht senkrecht auf dem Mittel der
Normalen ihrer Enden“, dazu je Punkt zwei Zeilen, die ihn in der Fläche halten; die Punkte auf den Linien liegen fest. Die
Normalen sind die der Haut beim Anfassen. Das ist eine Lösung, keine Runden.

- **Belegt:** Dicke bleibt beim Strecken und Verlängern; hin und zurück bitgleich; vorhandene Formen bleiben stehen; kein neues
  umgestülptes Dreieck in den geprüften Fällen; harte Linien (Kante an) gehen mit (jede Seite verlässt die Linie für sich).
- **Nicht belegt:** Drehen. Im Horn-Fall sind die Normalen einfach stehen geblieben; biegt man etwas stark, müssen sie
  mitdrehen (Drehung der Linien über die Haut verteilen). Das ist nicht gebaut.
- **Offen:** Die Normalen müssen ein gemerkter Stand der Haut sein, auch über das Verdichten hinweg. Neu von der Haut gelesen
  kriecht die Fläche bei jedem Anfassen.
- **Kann es nicht:** neue Haut runden (Rüssel). Dafür braucht es weiter eine Rechnung wie die heutige, oder eine Regel, die
  neuen Punkten ihre Normale gibt.
- **Tempo:** einmal Zerlegen beim Greifen (rund 230 ms bei 7 600 Punkten), je Bild ein Einsetzen (3 bis 4 ms), wenn die
  Normalen im Zug stehen bleiben. Drehen sie mit, ändert sich die Matrix; das wäre eigens zu lösen.

## Wege von hier

1. **Nach Plan weiter.** Die heutige Rechnung bleibt, Schritt 4 (echte Spiegelung, Mittellinie von Anfang an) kommt als
   Nächstes. Gegen das Aufgehen beim Anfassen bleibt dann nur ein Regler; B bleibt als Befund liegen.
2. **Zuerst ein zweiter, kurzer Beweis für B** (wieder nur Kern und Bilder, etwa ein Tag): Ziehen an fertiger Haut rechnet B,
   neue Haut rundet die heutige Rechnung. Zu zeigen wäre: Rüssel aus der Kugel wird rund (mindestens 0,8); derselbe Rüssel
   danach verlängert bleibt gleich dick (höchstens 3 %); ein Horn um 30° gebogen knickt nicht; nach dem Loslassen bewegt sich
   nichts über 0,18. Hält das, käme B mit Schritt 4 ins Fenster.

## Nachrechnen

```bash
# aus packages/shape; BLATT = Pfad ohne Endung, es entstehen ein Blatt mit allem und je Fall ein eigenes (HTML)
BLATT=/tmp/schritt3 npx vite-node ../../apps/editor/scripts/pruefen/form-direkt.ts
# einzelne Fälle: FALL=kugel,schlauch,ruessel,horn,formen,viertel   Startnetz der Körper: DREIECKE=2000
# aus apps/editor: die Blätter als Bilder
HOEHE=100 node scripts/pruefen/html-shot.mjs --jpg /tmp/schritt3-*.html
```

Der ganze Lauf dauert rund 45 Sekunden; seine Ausgabe liegt in `docs/progress/editor/schritt3-messung-2026-11-13.txt`. Test im
Kern: `packages/shape/src/dicht/direkt.test.ts`.
