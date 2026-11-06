# Kurven als Wahrheit: Stift wie Illustrator, Härte, was FiberMesh anders macht

Stand 06.11.2026, zur Freigabe. Noch nichts gebaut.

Nachtrag 06.11. nachmittags: Beweis B gebaut und gemessen, Ergebnis in Abschnitt 4. Die Ursache in Abschnitt 1 war falsch vermutet:
Nicht das Gedächtnis der Haut verhindert die Kante, sondern die Linien knicken an der harten Linie nicht.

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

## 4. Ergebnis Beweis B (06.11. nachmittags)

Florian: „Ja, beweis zuerst B: Haut im Einflussbereich bei jedem Zug neu aus den Kurven rechnen (wie FiberMesh, gleichmäßiges
Netz), mit den Kriterien aus dem Dokument. A danach.“

**Gebaut.** `HautAusKurven` (`packages/shape/src/dicht/ausKurven.ts`): Die Haut im Bereich jedes Zugs wird aus den Loops neu
gerechnet, ohne Gedächtnis (wie FiberMesh). Die Krümmung kommt harmonisch aus den Loops (dort gemessen, wie die Haut gerade ist)
und aus dem Rand des Bereichs; über harte Linien und Ecken fließt nichts; die Punkte bleiben in der Fläche verteilt, wie sie gerade
liegen. Im Fenster ist das der Schalter `?haut=kurven`, Standard bleibt der heutige Löser. Neu für beide Löser: Nach einer Änderung
der Härte und nach dem Löschen von Loops oder Punkten rechnet die Haut neu (ganze Haut, 0,2–0,4 s).

**Gemessen** (Kern: `ausKurven.test.ts` mit den Prüffällen `kurvenFaelle.ts`; Fenster mit der Maus: `form-haerte-probe.mjs`,
`form-explosion-probe.mjs`):

| Fall | heute (Gedächtnis) | aus den Kurven |
|---|---|---|
| Kugel, nichts gezogen (größter Abstand, Radius 150) | 0,77 | 0,71 |
| Linse, Querlinien am Rand geknickt, hart (Soll ≈ 67°) | 64° | 70° |
| Linse, weich | 24° | 16° |
| Pilz, Querlinien am Rand geknickt (Soll ≈ 78°), Kern | 77°, 0 umgeklappt | 78°, 0 umgeklappt |
| Pilz mit geknickten Linien im Fenster | Kante, glatt | Kante, darunter Lappen, 12 umgeklappt |
| Pilz wie bei dir (Rand hart, unten hinauf), Fenster | 3,3°, glatt | 13,6°, Lappen, 12 umgeklappt |
| Härte nachträglich, dann neu gerechnet, Fenster | 4,2° → 5,8° | 6,6° → 18,7° |
| Form hinausgezogen, dann gelöscht, Fenster (Beule) | 24,9 → 7,2 | 23,9 → 0,7 |
| Überhang (Knicke über 60° / umgeklappt), Fenster | 28 / 10 | 4 / 0 |
| langer Hammer, Fenster | 7 / 0 | 18 / 6 |
| Rüssel, Griff um −45° gedreht, Fenster | 13 / 0 | 17 / 0 |
| flacher Boden, Kern (tiefster Punkt unter der Ebene) | 0,23 | 0,00 |
| je Mausbewegung beim Überhang | 24–31 ms | 15–20 ms |

**Was das heißt.**

1. **Die Kante kommt aus den Linien, nicht aus der Haut.** Knicken die Querlinien an der harten Linie, machen beide Löser die Kante,
   die die Form verlangt (Pilz 77° bzw. 78°, Soll ≈ 78°). Knicken sie nicht, macht keiner eine. Bei deinem Pilz knicken sie nicht:
   Eine Ecke von selbst an einer harten Kreuzung knickt heute nur die Verschiebung beim Ziehen, nicht die Linie. Die Querlinie läuft
   nach dem Zug weiter glatt und senkrecht über den Rand. Das ist der Grund für „die Härte hat noch nicht die erwartete Wirkung“.
2. **B allein ist kein Gewinn.** Ohne Gedächtnis ist die Haut besser beim Überhang, beim Boden und beim Löschen, und sie ist
   schneller je Mausbewegung. Schlechter ist sie, wo wenige Linien ein Feld spannen: Zwischen weit entfernten Linien behält sie die
   Krümmung, die die Linien an sich messen, also die alte (Lappen unter dem Pilzrand, Hammer). Das ist eine bekannte Eigenschaft
   von FiberMesh: Dort zeichnet man mehr Linien.
3. **Neu rechnen nach Härte und Löschen** gehört dazu, gleich mit welchem Löser: Ohne Zug blieb die Haut bisher, wie sie war. Das
   ist jetzt für beide gebaut.

**Vorschlag: A, mit dem Knick als erstem Schritt.** Eine Ecke knickt die Linie wirklich (Griffe gespeichert, an einer Ecke getrennt).
Wird eine Linie hart, werden die Punkte der Linien, die sie kreuzen, Ecken mit Griffen zu ihren Nachbarpunkten (wie Blenders
„Vector“), und die Haut rechnet neu. Was dann herauskommt, zeigt `form-b-kern-pilz-geknickt`. Der Löser bleibt der heutige;
„aus den Kurven“ bleibt als Schalter zum Vergleichen.

Bilder: `docs/progress/editor/form-b-kern-{linse-hart,pilz-hart,pilz-geknickt,loeschen}-2026-11-06.jpg` (Kern, beide Löser, Seite
und schräg von unten; `apps/editor/scripts/pruefen/form-b-bild.ts`), `form-b-fenster-pilz-{heute,kurven}-2026-11-06.jpg` (Pilz wie
bei dir), `form-b-fenster-pilz-geknickt-{heute,kurven}-2026-11-06.jpg` (Pilz mit geknickten Linien).

Gemessen und verworfen: die Krümmung aus den Kurven, aber die Punkte verteilt wie beim Anfassen (wie der heutige Löser). Die Haut
verknittert, weil die gemessene Krümmung an den Linien und die alte Verteilung nicht zueinander passen.

## 5. Nachtrag (06.11. abends): Korrektur zu B, und was Härte sein soll

Florian: „das mit der härte verstehe ich bis heute nicht. Die härte des knicks entsteht doch automatisch und kann im grunde nur ganz
oder garnicht sein. Alles dazwischen ist rund mit verschiedenen handlelängen oder nicht? … Variante B scheint in fast allem besser
zu sein. Erkläre mir deine Empfehlung nochmal genauer“.

**Korrektur zu B.** Im Fenster rechnete B nur in einem Bereich um den Zug. Der Rand dieses Bereichs gab die Haut, die stehen bleibt,
mit ihrer alten Wölbung als Krümmung ins Feld; daher kamen die Lappen und der schlechtere Hammer. FiberMesh rechnet immer die ganze
Haut. So gemessen (Fenster, mit der Maus; Knicke über 60° / umgeklappt):

| Fall | heute | B im Bereich | B über die ganze Haut |
|---|---|---|---|
| Pilz mit geknickten Linien | Kante, 0 | Kante, Lappen, 12 | Kante, 0 |
| Pilz wie bei dir (Rand hart, unten hinauf) | 3,3°, keine Kante | 13,6°, Lappen, 12 | 34°, Kante, 2 |
| Überhang | 28 / 10 | 4 / 0 | 6 / 0 |
| langer Hammer | 7 / 0 | 18 / 6 | 0 / 0 |
| Rüssel, Griff −45° | 13 / 0 | 17 / 0 | 14 / 0 |
| Boden (tiefster Punkt unter der Ebene) | 0,14 | – | 0,11 |
| Form gelöscht (Rest der Beule) | 7,2 | – | 0,7 |
| je Mausbewegung | 6–32 ms | 3–20 ms | 11–23 ms |
| beim Greifen (Zerlegen) | 20–310 ms | 15–320 ms | 90–350 ms |

B über die ganze Haut ist überall gleich oder besser. Im Fenster rechnet `?haut=kurven` jetzt immer so. Kosten: Beim Greifen wird die
ganze Haut zerlegt (bei 4 000–7 000 Punkten 0,1–0,35 s; bei 10 000 Punkten gemessen 0,6 s, bei 18 000 2 s). Das ist der offene Punkt,
bevor B Standard wird (schneller zerlegen).

**Härte: ganz oder gar nicht.** Florian hat recht. Ein Knick ist da oder nicht. Wie rund eine Stelle ist, sagen die Griffe (kurze
Griffe = enge Rundung). Die Zahl 0–3 tat bisher etwas Drittes: Sie schwächte nur die Glättung quer über die Linie ab. Eine
Zwischenhärte war deshalb eine Rundung über ein, zwei Dreiecke, also abhängig vom Netz und nicht gestaltbar. Vorschlag:

- **Ecke (◆) an einem Punkt:** Die Linie knickt dort. Läuft sie dabei über eine andere Linie, knickt die Haut entlang dieser Linie
  (zwischen den Kreuzungen übergeblendet; so ist es seit dem Pilz schon gebaut).
- **„Kante“ an einer Linie (an/aus, auch nur für ein Stück):** Die Haut darf quer über die Linie knicken; jede Seite rundet sich für
  sich, der Winkel ergibt sich aus der Form. Nötig für Linien ohne Querlinien (Braue, Lippe, Pilzrand). Dick schwarz = Kante, dünn =
  weich.
- **Rundung:** über die Griffe der Linien, keine Zahl.
- Die Zahl 0–3 entfällt.

**Empfehlung jetzt:** (1) B über die ganze Haut als Standard, sobald das Zerlegen beim Greifen auch bei 10 000+ Punkten schnell ist;
bis dahin `?haut=kurven` zum Ausprobieren. (2) Härte als An/Aus „Kante“ statt 0–3. (3) Danach A: Griffe gespeichert, eine Ecke knickt
die Linie wirklich, Stift P, Löschen und Einfügen wie in Illustrator.

Bilder: `docs/progress/editor/form-b-fenster-pilz-ganz-2026-11-06.jpg` (Pilz wie bei dir), `form-b-fenster-pilz-geknickt-ganz-2026-11-06.jpg`.

