# Ozzy: Messblatt nach Etappe A (17.11.2026, nachts)

Plan: [`docs/plans/2026-11-17-ozzy-stabil-schnell.md`](../../plans/2026-11-17-ozzy-stabil-schnell.md), Etappe A. Grundlinie:
[`2026-11-17-messen-karte-zug-p.md`](2026-11-17-messen-karte-zug-p.md). Gleiche Werkzeuge, gleicher Testbrowser (1440 × 900, doppelte
Dichte, „strange bird“), je ein Lauf. Gebaut sind A0, A1, A2, A3 (Fluss als Textur, Stufen nach der Größe im Bild, kein teures Ziel
ohne sichtbare Blase, und seit 20 Uhr: das Ziel der Kantenglättung nur so groß wie die Blase im Bild) und aus A4 zwei Punkte.

## Grafikkarte je Bild (Rechnen / mit Grafikkarte, ms)

| | Raum | Raum nah (Zoom 2,9) | eingerastet Seite | Vier Ansichten |
| --- | --- | --- | --- | --- |
| vorher | 2,3 / 15,8 | 3,1 / 21,1 | 1,1 / 9,7 | 4,0 / 16,8 |
| nach A, noch mit dem Ziel über das ganze Bild (19 Uhr) | 2,0 / 9,5 | 3,1 / 12,8 | 0,9 / 3,9 | 3,9 / 15,1 |
| **nach A, Ziel nur so groß wie die Blase (20 Uhr)** | 2,2 / **6,0** | 3,2 / **12,6** | 1,2 / **4,3** | 3,9 / **10,3** |
| dasselbe ohne Seifenhaut (Versuch) | 1,7 / 3,9 | 3,2 / 5,9 | 1,0 / 3,5 | 3,8 / 7,9 |
| nach A, ohne Kantenglättung (Versuch) | 2,1 / 6,3 | 3,1 / 8,7 | 1,0 / 4,0 | 3,8 / 10,2 |
| nach A, zweifach statt vierfach (Versuch) | 1,8 / 8,8 | 3,1 / 10,6 | 1,0 / 4,2 | 4,0 / 12,8 |
| nach A, 8 statt 16 Bit (Versuch) | 1,8 / 7,4 | 3,1 / 10,2 | 1,0 / 4,2 | 3,9 / 12,5 |
| nach A, ohne Seifenhaut (Versuch) | 1,9 / 4,1 | 3,0 / 5,6 | 0,9 / 3,0 | 3,7 / 8,1 |

Schritt für Schritt (Raum / nah, mit stehender Zeit der Seifenhaut, Zoom nah 2,46): vorher 13,3 / 16,6 · mit dem Fluss als Textur
10,7 / 11,4 · dazu Stufen nach der Größe im Bild 9,7 / 11,5. Bild gegen vorher: Raum 61 dB (eine Stufe statt zwei), nah 76 dB (nur
die Textur): nicht zu sehen.

Die vier Zeilen „Versuch“ darunter stammen vom Stand um 19 Uhr (Ziel über das ganze Bild).

**Das Ziel nur so groß wie die Blase (17.11., 20 Uhr):** Die Seifenhaut zeichnet in ein Ziel, das nur den Kasten der Form im Bild deckt (auf
128 Gerätepunkte gerastert; es wächst sofort und schrumpft erst nach einer Weile), darum herum den Grund direkt. Deckte der Kasten
mehr als sechs Zehntel des Bilds (nah herangezoomt), bleibt es beim ganzen Bild. **Bild gegen das ganze Ziel** (vier Ansichten bei
stehender Zeit, 5,2 Millionen Bildpunkte je Bild): Raum 101 dB, etwas näher 99 dB, Vier Ansichten 91 dB, Raum von hinten mit der
Rückseite im Bild 70 dB. Mehr als eine Stufe von 255 weichen ab: 13 Bildpunkte (von hinten) und 3 (Vier Ansichten), einzelne
Randpunkte der Blase. Um eine Stufe weichen im Dunkel der Rückseite rund 1 % der Bildpunkte ab (das Rauschen gegen Stufen rundet dort
ohne den Umweg über 16 Bit minimal anders). Mitten in einer Drehung („teat firefish“, vier Stellungen): 70 bis 78 dB.

**Was bleibt:** Die Seifenhaut kostet im Raum und in den Vier Ansichten noch rund 2 ms, nah herangezoomt rund 6,7 ms (dort deckt sie
das Bild, das Ziel bleibt groß). Die Linien kosten in den Vier Ansichten rund 6 ms (drei weiße Körper), sonst 2,5 bis 4 ms.

## Stufen der Anzeige beim Zoomen („strange bird“)

| Zoom | lange Kante des Rechennetzes im Bild | Stufen | feine Kante |
| --- | --- | --- | --- |
| 0,46 | 4,8 Gerätepunkte | 0 | 4,8 |
| 1,0 | 10,5 | 1 (vorher 2) | 5,2 |
| 1,43 | 15,0 | 1 | 7,5 |
| 2,46 | 25,8 | 2 | 6,5 |
| 4,0 | 42,0 | 2 (die Zahl der Dreiecke begrenzt) | 10,5 |

## Der Zug (Rechnen je Bild, Median / 95 %, ms)

| Form | vorher | nach A1 | nach A |
| --- | --- | --- | --- |
| strange bird | 18,8 / 26,4 (Werk 10,8 · Haut 5,2 · Linien 1,5) | 14,6 / 21,8 | **10,9 / 16,9** (Werk 5,7 · Haut 2,7 · Linien 1,3) |
| maul handgemacht test | 15,7 / 20,5 (Werk 10,2 · Haut 2,4 · Linien 1,3) | 12,9 / 19,7 | 12,6 / 16,8 (Werk 9,1 · Haut 1,2 · Linien 1,2) |

An der kleineren Form rechnet der Löser jetzt mehr Runden je Bild (das Bild sonst ist billiger geworden); die Bildzeit bleibt im Takt.

## Seifenhaut

- Sprünge der Haut (`ozzy-messen`, „strange bird“): 0 in allen Abläufen; am 16.11. je einer beim Netzwechsel nach dem Zug und nach
  dem Pinsel.
- Dehnung nach dem Laden: von der Übergabe an höchstens 3 % von 1 entfernt, nach einer Sekunde genau 1 (vorher bis an die Grenzen
  des Sichtbaren und neun Sekunden lang).
- Bilder: [`2026-11-17-a2-seifenhaut-gebaut.png`](2026-11-17-a2-seifenhaut-gebaut.png).

## Proben

Alle 22 Fenster-Proben halten (`ozzy-alle.mjs`). Zwei Dinge fielen dabei auf, beide sind im Kern vorgemerkt (C1):
- Ein neuer Löser braucht am Anfang eines Zugs einige Runden am Stück, sonst läuft die Haut einer Form mit nur einer Linie davon
  (jetzt: `ANLAUF_RUNDEN`).
- Ein Zug mit dem Einfluss O hängt davon ab, wann das Verfeinern aus dem Hintergrund eingewechselt wird: mitten in der Bewegung oder
  danach. An „teat firefish“ liegen die Nachbarpunkte je nachdem 1,4 Einheiten auseinander (bei einem Zug um 119). Die Probe
  `ozzy-pinsel` zieht deshalb jetzt rasch und hält, bis das Verfeinern da ist; so stimmen Ozzy und Prüffenster auf 1e-5 überein.
