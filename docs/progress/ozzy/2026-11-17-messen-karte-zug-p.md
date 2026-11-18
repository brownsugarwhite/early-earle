# Ozzy: Messblatt vom 17.11.2026 abends (Grundlage des Plans „Ozzy stabil und schnell“)

Alle Läufe im Testbrowser mit Grafikkarte (M3 Pro), Fenster 1440 × 900, doppelte Pixeldichte, je **ein** Lauf. Geändert wurde am
Arbeitsbaum nichts: Die Fassungen entstehen, indem das Skript das ausgelieferte Modul für diesen einen Lauf ändert (`ozzy-teile.mjs`,
„Flicken“). Zeiten nur als Verhältnisse lesen; Florians Fenster kann größer sein (am 4K-Bildschirm mit doppelter Dichte sind es rund
1,6-mal so viele Bildpunkte wie hier).

## 1. Was ein Bild auf der Grafikkarte kostet

Werkzeug: `apps/editor/scripts/pruefen/ozzy-karte-messen.mjs`, Form „strange bird“ (7 437 Rechenpunkte, 119 121 Punkte gezeigt), das
Werk ruht. Je Zelle: **Rechnen je Bild (Prozessor) / samt Warten auf die Grafikkarte**, Millisekunden, Median aus 40 Bildern. Das
Warten (ein Bildpunkt wird zurückgelesen) kostet selbst rund 1 bis 2 ms: Die Zahlen sind obere Grenzen, die Unterschiede stimmen.

| Fassung | Raum | Raum nah (Zoom 2,9) | eingerastet Seite | Vier Ansichten |
| --- | --- | --- | --- | --- |
| wie gebaut | 2,3 / **15,8** | 3,1 / **21,1** | 1,1 / 9,7 | 4,0 / 16,8 |
| ohne Kantenglättung der Seifenhaut (gebaut: vierfach, 16 Bit) | 2,2 / 9,2 | 2,9 / 13,7 | 1,2 / 5,7 | 3,8 / 11,3 |
| Kantenglättung zweifach | 2,2 / 12,3 | 3,0 / 18,2 | 1,1 / 8,3 | 3,7 / 15,3 |
| vierfach, 8 statt 16 Bit je Kanal | 2,3 / 12,7 | 3,0 / 18,3 | 1,3 / 8,0 | 3,9 / 15,5 |
| 8 Bit, ohne Kantenglättung | 2,2 / 8,8 | 3,0 / 13,0 | 1,2 / 5,5 | 3,6 / 11,4 |
| ohne das Rauschen der Dicke im Shader | 2,2 / 11,0 | 3,1 / 12,1 | 1,3 / 9,7 | 3,8 / 14,2 |
| ohne Kantenglättung und ohne Rauschen | 2,4 / 7,6 | 3,0 / 8,4 | 1,0 / 5,8 | 3,9 / 10,1 |
| nur die Vorderseite der Blase | 2,3 / 12,4 | 2,9 / 15,1 | 1,3 / 9,3 | 3,9 / 15,7 |
| ohne Seifenhaut | 2,4 / 5,0 | 2,9 / 5,2 | 1,0 / 3,2 | 3,5 / 7,7 |
| ohne Linien | 2,0 / 12,0 | 2,7 / 18,1 | 0,9 / 7,4 | 3,4 / 12,8 |
| ohne beides (Grundlast) | 1,7 / 1,9 | 2,4 / 2,6 | 0,7 / 0,9 | 3,1 / 3,3 |

Einfache Dichte, wie gebaut: Raum 2,3 / 11,3 · eingerastet 0,8 / 4,7 · Vier Ansichten 3,7 / 12,6.

**Lesart (Raum, wie gebaut: rund 13,5 ms Grafikkarte je Bild):**
- Die **Seifenhaut** kostet rund 10 ms, die Linien rund 2,6 ms. Eingerastet ist von der Blase nichts zu sehen, und sie kostet trotzdem
  6,5 ms: Das ist die feste Last ihres Zeichenziels (vierfache Kantenglättung mit 16 Bit je Kanal über das ganze Bild).
- **Kantenglättung:** vierfach mit 16 Bit kostet 6,6 ms; mit 8 Bit 3,5 ms; zweifach 3,1 ms.
- **Rauschen:** Die Dicke der Haut wird je Bildpunkt und Durchgang aus vier Rauschwerten gerechnet (vier Durchgänge): 4,8 ms im Raum,
  9 ms nah.
- **Mit einfacher Dichte wird es kaum billiger** (15,8 → 11,3): Ein großer Teil hängt nicht an den Bildpunkten, sondern an den
  Dreiecken (nächster Abschnitt).

## 2. Stufen der glatten Anzeige

Werkzeug: `apps/editor/scripts/ozzy/stufen-vergleich.mjs`, gleiche Ansicht im Raum, die Zeit der Seifenhaut steht. Bild:
[`2026-11-17-anzeige-stufen-2-1-0.png`](2026-11-17-anzeige-stufen-2-1-0.png) (von links: zwei Stufen wie gebaut, eine, keine).

| Stufen | Punkte gezeigt | Rechnen / mit Grafikkarte (ms) | Bild gegen „zwei Stufen“ |
| --- | --- | --- | --- |
| 2 (wie gebaut) | 119 121 | 2,1 / 15,3 | – |
| 1 | 29 821 | 1,9 / 10,9 | gleich bis auf 57 dB (nicht zu sehen) |
| 0 | 7 476 | 1,8 / 9,8 | gleich bis auf 52 dB |

In dieser Größe sind die Dreiecke von zwei Stufen kleiner als ein Bildpunkt. Das kostet die Grafikkarte 4,4 ms je Bild und den
Prozessor im Zug 2,5 ms, und man sieht es nicht. Nah herangezoomt braucht es die Stufen (und mehr).

## 3. Der Zug

Werkzeug: `apps/editor/scripts/pruefen/ozzy-zug-messen.mjs`, ein Punkt der Linie der Mitte an der Wand der Seite, 1,5 s gezogen.

| Form | Fassung | Bilder | Rechnen je Bild (Median / 95 %) | Werk · Haut · Linien (Median) | Abstand der Bilder (Median / 95 %) |
| --- | --- | --- | --- | --- | --- |
| strange bird | wie gebaut | 182 | **18,8 / 26,4** | 10,8 · 5,2 · 1,5 | 19,8 / 27,7 |
| strange bird | Bildtakt gemeldet | 200 | 14,6 / 22,2 | 6,0 · 5,3 · 1,4 | 15,5 / 24,7 |
| strange bird | eine Stufe | 193 | 15,8 / 22,3 | 8,7 · 2,7 · 1,4 | 17,2 / 26,8 |
| strange bird | Bildtakt + eine Stufe | 153 | **11,1 / 17,3** | 5,8 · 2,7 · 1,4 | 16,4 / 23,5 |
| maul handgemacht test | wie gebaut | 188 | 15,7 / 20,5 | 10,2 · 2,4 · 1,3 | 16,9 / 26,8 |
| maul handgemacht test | Bildtakt gemeldet | 162 | 12,7 / 17,3 | 7,3 · 2,5 · 1,3 | 16,3 / 22,9 |
| maul handgemacht test | eine Stufe | 162 | 13,6 / 17,0 | 10,4 · 1,2 · 1,2 | 16,3 / 26,5 |
| maul handgemacht test | Bildtakt + eine Stufe | 153 | 12,2 / 17,3 | 8,8 · 1,2 · 1,2 | 16,5 / 23,6 |

„Bildtakt gemeldet“: Ozzy sagt dem Werk, was sein Bild ohne die Runden des Lösers kostet (der Fehler aus dem Prüfbericht vom 17.11.,
Abschnitt 3.1). „Eine Stufe“: `?fein=1`. Auch mit beiden bleiben 5 % der Bilder über 17 ms und kommen im Abstand von 23 ms: Solange der
Löser im Bild rechnet und die feine Haut je Bild auf dem Prozessor entsteht und hochgeladen wird, sind 60 Bilder je Sekunde im Zug nicht
sicher und 120 nicht möglich.

## 4. Seifenhaut: woher das Kantige kommt

Bild: [`2026-11-17-seifenhaut-glatt-vorher-nachher.png`](2026-11-17-seifenhaut-glatt-vorher-nachher.png) (links wie gebaut, rechts
der Versuch; gleiche Ansicht, Werkzeug `apps/editor/scripts/ozzy/haut-glatt-beweis.mjs`).

Ursache (gelesen und im Versuch bestätigt): Die Farben der Seifenhaut hängen an zwei Werten je Punkt, der Lage im Muster und der
Dehnung. Beide werden an drei Stellen **vom nächsten Punkt kopiert statt stetig weitergereicht**: bei der Übergabe von der Blase der
Studie, bei jedem Netzwechsel (`uebernehmen` in `werkHaut.ts`), und beim Verfeinern der Anzeige (`GlattPlan.weiterreichen`: Ein neuer
Punkt nimmt den Wert eines Endes seiner Kante). Das gibt Felder mit Stufen, und die Dünnschichtfarbe macht aus jeder Stufe eine
Scherbe. Bei einer geladenen Form ist es am stärksten: Ihre Punkte suchen sich den nächsten Punkt einer Blase, die eine andere Form hat.
Im Versuch wird nur stetig weitergereicht (Mittel der Kantenenden) und das Muster aus der eigenen Lage genommen: Die Scherben sind weg.
Das kostet keine Rechenzeit.

## 5. Wenden

Bilder: [`2026-11-17-einzel-wenden-raeumlich.png`](2026-11-17-einzel-wenden-raeumlich.png) (eingerastete Seite, ⇧ + Ziehen: Der Körper
dreht räumlich) und [`2026-11-17-feld-wenden-wie-ein-blatt.png`](2026-11-17-feld-wenden-wie-ein-blatt.png) (Feld der Seite in den Vier
Ansichten, ⇧ + Ziehen: Die Zeichnung wird gestaucht wie ein Blatt). Im Code: `feldAnsicht` und `feldFlaeche` in `main.ts` rechnen das
Wenden eines Felds als Stauchung mit dem Kosinus des Winkels; die eingerastete Ansicht dreht die Kamera.

## 6. P: was wo geschieht

Werkzeug: `apps/editor/scripts/pruefen/ozzy-p-ueberall.mjs`, je Versuch eine frische Ellipse (aufgeblasen, ohne Linien). Eingerastet,
gewendet, im Feld und an der Wand verhält sich dieselbe Ansicht gleich; die Unterschiede liegen zwischen den Ansichten.

| Geste | Seite | Front | Top |
| --- | --- | --- | --- |
| geschlossene Form auf dem Körper (4 Klicks) | Paar mit 4 Punkten | Ring mit 4 Punkten (über die Mitte) | Ring mit 4 Punkten |
| gerade quer über die Form, ↩ | Ring rundum | Ring rundum | Loop rundum (längs der Mitte: Paar) |
| **gebogen quer über die Form (3 Klicks), ↩** | **„Keine Form …“** | **Ring mit 2 Punkten, 32 umgeschlagene Dreiecke** (gewendet 2) | Ring mit 2 Punkten, nicht der gezeichnete Bogen |
| offen auf dem Körper (3 Klicks), ↩ | wird geschlossen (Paar mit 3 Punkten) | wird geschlossen (Ring) | wird geschlossen |

Dazu beobachtet:
- An einer Form mit vielen Linien („strange bird“) trifft fast jeder Klick eine vorhandene Linie: Dann beginnt eine Abzweigung statt
  einer Form, und dieselbe Geste gibt je nach Stelle etwas anderes.
- In den Vier Ansichten füllt die Form ihr Feld fast ganz: Für einen Anfang „im Leeren“ ist kaum Platz, im Feld der Front gar keiner.
  Ein Klick mit P knapp neben das Feld dreht die Ansicht und klappt die Vier Ansichten zu.
- Das Werk kennt je Punkt nur gleich lange Griffe nach beiden Seiten oder eine Ecke: Eine mit P gezogene ungleiche Richtung geht
  verloren (`knickSetzen` ist leer).
- Esc verlässt das Werkzeug; ohne Werkzeug geht Esc eine Ebene zurück (Vier → Raum → Blatt). Zweimal Esc im Raum lässt also die Luft
  ab. Nichts geht verloren (↩ bläst dieselbe Form wieder auf), aber es erschreckt.

## 7. Was gewöhnliche Züge hinterlassen

Werkzeug: `apps/editor/scripts/pruefen/ozzy-zuege-zaehlen.mjs`: je Form drei Punkte der Linie der Mitte an der Wand der Seite
nacheinander 30 Bildpunkte nach oben gezogen; gezählt, wenn das Werk ruht. Zwei Läufe (die Züge sind nicht genau wiederholbar).

| Form | umgeschlagene Dreiecke vorher | nach Zug 1 · 2 · 3 (erster Lauf) | (zweiter Lauf) | Punkte ohne Spiegelbild |
| --- | --- | --- | --- | --- |
| strange bird | 0 | 0 · 14 · 8 | 0 · 4 · 16 | 0 |
| teat firefish | 0 | 0 · 0 · 4 | 0 · 0 · 4 | 0 |
| maul handgemacht test | 8 | 12 · 14 · 10 | 14 · 10 · 14 | 0 |

„Umgeschlagen“ zählt jedes Dreieck gegen die Normalen seiner Ecken; am Maul zählen steile Wände der Tasche mit (daher die 8 vorher).
Der Fall „ein Punkt ohne Spiegelbild nach einem Zug“ (16.11., „strange bird“) ist hier nicht aufgetreten.

## 8. Ausgangslage

Alle 22 Fenster-Proben von Ozzy (`scripts/pruefen/ozzy-*-fenster.mjs`) laufen am 17.11. abends durch („alles gut“, zusammen rund
sieben Minuten).
