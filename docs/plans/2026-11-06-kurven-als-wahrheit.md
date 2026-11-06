# Kurven als Wahrheit: Stift wie Illustrator, Härte, was FiberMesh anders macht

Stand 06.11.2026, zur Freigabe. Noch nichts gebaut.

## Anlass (Florian, 06.11.)

- „die härte hat bei mir noch nicht die erwartete wirkung … Ich glaube die härte funktioniert noch nicht wie sie soll.“
- „Was macht z.B FiberMesh anders? … Vllt können wir von FiberMesh noch etwas lernen.“
- „… ein Werkzeug wie P bei Illustrator, bei dem man Punkt für Punkt mit Handle einmalt. Wenn ich aktuell einen Punkt lösche,
  bleibt die Linie einfach wie sie ist und die Bezier-Handles darum stimmen nicht mehr mit der Kurve überein. Kann es so sein wie
  bei Illustrator …?“
- Dazu seine Frage davor: „machen wir wieder sonderregeln gerade?“ (Antwort: teilweise; mehrere Schwellen kommen daher, dass die
  Griffe aus den Proben abgelesen werden.)

## 1. Härte, gemessen (Fenster, mit der Maus, `scripts/pruefen/form-haerte-probe.mjs`)

Kugel, drei Loops, der waagerechte Ring ist der Rand. Knick quer über den Rand, Median über alle Proben:

| Fall | hart (3) | weich (0) |
|---|---|---|
| Pilz: Rand gesetzt, dann die Unterseite 120 hinauf | 3,3° (an den Kreuzungen bis 15°) | 4,2° |
| Härte erst danach gesetzt | unverändert 4,2°, auch nach einem kleinen Zug | – |
| Linse: oben 70 hinab, unten 70 hinauf | 3,3° | 4,2° |
| Braue (die Linie selbst hinausgezogen, 05.11.) | 37° | 28° |

Zum Vergleich: Zwei runde Kappen, die sich am Rand einer so flachen Linse treffen, hätten dort einen Knick von etwa 67°.

**Ursache.** Die Haut behält bei jedem Zug ihre Krümmung, wie sie vorher war (das Gedächtnis des Lösers). Härte nimmt nur die
Glättung quer über die Linie weg: Die Haut *darf* dort knicken, aber nichts bringt sie dazu. Beide Seiten behalten ihre alte
runde Krümmung und laufen weiter glatt ineinander. Ein Knick entsteht nur, wo die Linie selbst gegen die Haut bewegt wird (Braue).
Nachträglich gesetzt wirkt Härte gar nicht, weil sich ohne Zug nichts neu rechnet. Und nach jedem Zug übernimmt die Linie die
Lage der Haut (`festlegen`): Hat die Haut einen Knick weggeglättet, ist er danach auch aus der Linie verschwunden.

## 2. Was FiberMesh anders macht

Quelle: Nealen, Igarashi, Sorkine, Alexa: *FiberMesh: Designing Freeform Surfaces with 3D Curves*, SIGGRAPH 2007, Abschnitte 2–5.

- **Die Fläche wird aus den Kurven neu gerechnet, ohne Gedächtnis.** Nach jeder Änderung läuft eine Glättung bis zum Stillstand
  (5–10 Runden): erst glatte Krümmungswerte über die ganze Fläche (an den Kurven aus der jetzigen Fläche), dann die Lagen so, dass
  jeder Punkt diese Krümmung in Richtung seiner Normale hat; die Kurven sind feste Lagen. Ändert man die Art einer Kurve (glatt ↔
  scharf) oder löscht man sie, formt sich die Fläche sofort neu (Paper, Bild 7 und 8). Bei uns ändert beides nichts.
- **Scharf heißt nur: Lage fest, ohne Glätte quer (C0).** Eine glatte Kurve verlangt zusätzlich, dass die Fläche glatt über sie
  läuft. Weil sich die Fläche neu rechnet, wird jede Seite so rund wie möglich, und wo sie sich treffen, entsteht der Knick von
  selbst.
- **Die Haut verteilt sich von selbst gleichmäßig.** Die Ziele haben nur einen Anteil in Normalenrichtung (bei uns tragen sie auch
  die alte Verteilung längs der Fläche mit, deshalb blieben gestauchte Spitzen gestaucht); an den Kurven kommen Ziele für die
  Kantenlängen dazu, und nach jedem Zug wird das ganze Netz gleichmäßig neu vernetzt.
- **Die Kurven sind die Griffe.** Gezogen wird an Kurven (mit mitwachsendem Bereich, „peeling“, das haben wir übernommen); die
  Fläche folgt, nie umgekehrt.
- **Auch FiberMesh hat Grenzen** (laut Paper): Das Ergebnis hängt vom Netz ab (gleichmäßiger Laplace statt Flächenmaß), es lief nur
  mit kleinen Netzen (600–2000 Punkte, das ganze Netz ein System, 10–15 Bilder je Sekunde), Kurven sind nur Lagen. Dass Kurven
  auch die Richtung der Krümmung sagen könnten, steht dort als Zukunft — das haben wir mit der Krümmung mit Richtung schon.
  Über Falten an Spitzen schreibt das Paper nichts; sein gleichmäßiges Netz lässt gestauchte Dreiecke gar nicht erst stehen.

**Kurzversuch auf unserem Netz** (nicht im Code, nur zum Abschätzen): Glättung nach FiberMesh, Rand scharf. Ohne gleichmäßiges
Netz bleibt schon die unberührte Kugel nicht rund (stellenweise 9 % eingedrückt), und die Kante an der Linse ist noch klein
(Median 7°, weich 4°). Das deckt sich mit unserem ersten Versuch am 05.11. („schaukelt sich auf dem Netz auf“) und mit dem, was
das Paper verlangt: gleichmäßiges Netz und Kantenlängen-Ziele. Das ist ein eigener Beweis, kein Nachmittag.

## 3. Vorschlag: zwei Schritte

### A. Linien als echte Bézier-Pfade, Stift P wie Illustrator (zuerst)

- Ein Loop ist ein geschlossener Pfad aus Ankerpunkten mit **gespeicherten** Griffen (glatt: gegenüber; Ecke: getrennt). Die Kette
  im Netz ist nur noch seine Abtastung auf der Haut.
- **Stift P:** Klick setzt eine Ecke, Klick und Ziehen einen glatten Punkt mit Griffen, Klick auf den ersten Punkt schließt den
  Pfad; gezeichnet auf die Haut in Seite, Front oder Top (über die Mitte gezogen ein Ring wie heute). Freihand mit F und Schneiden
  mit L bleiben.
- **Punkt löschen:** Die Nachbarn verbinden sich über ihre eigenen Griffe, die Linie dazwischen ist genau dieses Bézier-Stück; die
  Haut folgt der neuen Linie.
- **Punkt einfügen** auf der Linie (Doppelklick): teilt das Bézier-Stück formgleich (de Casteljau), die Griffe der Nachbarn werden
  gekürzt — wie in Illustrator.
- Kreuzungen sind gemeinsame Punkte zweier Pfade, wie heute.
- Was damit wegfällt: die Griffe aus Ausgleichspolynomen über Proben und ihre Schwellen (Ausrichten ab 4°, Knick ab 5°, Linienproben
  nur unter ¼ zusammenlegen); die Knick-Regel liest den Knick dann genau aus den Griffen.
- Aufwand: etwa 2–3 Tage (Pfad im Kern, Abtastung auf die Haut, Stift und Löschen in den drei Blättern, Griffe, Speichern im
  Rückgängig).

### B. Fläche aus den Kurven, nach FiberMesh (danach, erst als Beweis)

- Nach jedem Zug, nach jeder Änderung der Härte und nach dem Löschen einer Linie wird die Haut aus den Linien neu gerechnet (ohne
  Gedächtnis), Härte = scharf (nur Lage) bis glatt (Lage und Glätte quer), Ziele nur in Normalenrichtung, Kantenlängen an den
  Linien, danach gleichmäßig neu vernetzt.
- Prüfen gegen: Linse und Pilz mit hartem Rand bekommen die Kante, die die runden Seiten ergeben (Linse ≈ 60°+), weich bleiben sie
  rund; Härte nachträglich wirkt sofort; Linie löschen → Haut folgt; unberührte Kugel bleibt rund (< 1 %); flacher Boden, Rüssel,
  Hammer, Überhang ohne Falten; Ziehen flüssig (Netz einmal je Umvernetzung zerlegen, beim Ziehen nur einsetzen).
- Abbruch, wenn die Kugel nicht rund bleibt oder es nur mit Regeln geht, die einen Körper oder eine Lage nennen; dann bleibt das
  heutige Gedächtnis, und Härte bekommt einen eigenen, kleineren Weg.
- Aufwand: Beweis etwa 1–2 Tage.

**Empfehlung:** A zuerst. Es ist dein Wunsch, es ist vorhersehbar, und es nimmt die Schwellen heraus, nach denen du gefragt hast.
B danach als Beweis mit den Kriterien oben.
