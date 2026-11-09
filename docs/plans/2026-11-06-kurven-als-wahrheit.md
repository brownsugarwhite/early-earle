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

## 6. Stand (06.11. abends): B über die ganze Haut ist Standard, Kante an/aus

- **B ist Standard im Fenster** (`kurven.html`; `?haut=gedaechtnis` zum Vergleich): In jedem Zug rechnet sich die ganze Haut aus den
  Kurven, ohne Stufen. Hat ein Zug verdichtet, setzt sich das neue Netz gleich danach in der Ruhe (4 Runden).
- **Greifen schnell:** dünn besetzte Zerlegung mit verschachtelter Ordnung (`loeser/zerlegung.ts`), gemerkt je Netz und Loops und in
  der Ruhe vorgerechnet. Gemessen mit der Maus (`form-greifen-probe.mjs`):

  | Punkte | Drücken | je Mausbewegung | Loslassen | Setzen danach (Ruhe) |
  | --- | --- | --- | --- | --- |
  | 5 200 | 84–101 ms | 14–16 ms | 71–80 ms | 0,13 s |
  | 15 400 | 134–156 ms | 26–28 ms | 200 ms | 0,6 s |

  Vorher kostete allein das Zerlegen beim Greifen 0,3–1,5 s.
- **Kante an/aus statt Härte 0–3** (Taste K, für gewählte Punkte oder den ganzen Loop): Zwischen zwei Stützstellen ist die Linie Kante,
  wenn eine von beiden Kante ist; der Knick läuft zum nächsten weichen Punkt aus. Kreuzt eine Linie, die dort mindestens 15° knickt,
  wirkt die Kreuzung wie eine Kante. Über eine Kante fließt keine Krümmung, jede Seite rundet sich aus ihren eigenen Kurven.
- **Gemessen im Fenster** (Knick quer über die Linie, Median; `form-haerte-probe.mjs`, `form-loops-braue.mjs`):

  | Fall | Kante | weich |
  | --- | --- | --- |
  | Pilz-Rand | 37° | 10° |
  | Linse | 24° | 9° |
  | Braue (oben) | 48° | 13° |

  Nachträglich zur Kante gemacht: nur 10° → 15° (größter 31°), neu gerechnet in 0,2 s. Die kreuzenden Linien laufen dort glatt über
  den Rand, und die Haut folgt ihnen. Den Knick bringt erst A (Schritt 4 unten: Ecke von selbst mit Griffen zu den Nachbarn).
- **Die anderen Proben:** Boden 0,11 unter der Ebene, 0 umgeschlagen. Kreuzung 41° bzw. 0°, Griffe 36°, Spiegelpunkt 97°/121°/0°.
  Maul dicht bis 55°, ⌘Z genau. Fressen-Pose 25 für 25. Hammer 0/0 (Knicke über 60°/umgeklappt), Rüssel mit Griff −45° 8/0.
  Überhang nach den letzten beiden Zügen 0/0 und 0/0 (vorher 12/4 und 28/10).
- **Schlechter (offen):**
  - Am Überhang direkt nach dem weiten Zug („oben −300“) 30 Knicke und 6 umgeklappt, im Kern-Test und im Fenster gleich; die
    nächsten Züge glätten es. Ohne das Setzen des verdichteten Netzes 4/0, mit mehr Runden schlechter: Die Falten sind die Form,
    die die Kurven an dieser Spitze sagen.
  - Rüssel im Kern-Test (Griff 45° gedreht) 28/6 statt 20/2.
  - Schlaufe (die Linie kreuzt sich selbst) 38/12 statt 14/2.

  Die Grenzen der Kern-Tests stehen jetzt bei diesen Werten (`weiterZug.test.ts`, mit Begründung).

## 7. Plan für A: Linien als Bézier-Pfade (06.11. abends)

Florian: „Ja: B über die ganze Haut als Standard (Greifen auch bei vielen Punkten schnell machen), Härte als Kante an/aus statt 0–3,
danach A mit echten Griffen und Stift P.“

**Heute.** Ein Loop sind Proben auf der Haut (eine Kette von Kanten im Netz) mit Punkten darauf. Die Griffe werden nicht gespeichert,
sondern am Verlauf der Proben abgelesen (Ausgleichspolynom je Seite); ein Zug verschiebt die Proben mit Hermite-Stücken. Daher die
Schwellen (Ausrichten ab 4°, Knick ab 15°), daher bleibt beim Löschen eines Punkts die Linie, wie sie ist, und eine Ecke von selbst
knickt nur die Verschiebung, nicht die Linie.

**Ziel.** Jeder Loop hat einen Pfad: Punkte mit gespeicherten Griffen (ein, aus), glatt (Griffe auf einer Geraden) oder Ecke (frei).
Zwischen zwei Punkten liegt genau das kubische Bézier-Stück aus ihnen und ihren Griffen. Der Pfad ist die Wahrheit; die Kette im Netz
ist nur seine Abtastung, jede Probe hat ihre Stelle auf dem Pfad (Stück, t), ihr Ziel ist der Pfad an dieser Stelle. Die Haut rechnet
sich aus den Pfaden (B).

**Schritte** (je Schritt Tests im Kern, dann im Fenster mit der Maus):

1. **Pfad im Kern** (`dicht/pfad.ts`): Punkte, Griffe, Arten (Ring mit Enden auf der Mittelebene, Mitte, Paar), Auswerten, Länge,
   nächste Stelle. Aus einem heutigen Loop formtreu angelegt (Bézier-Anpassung je Stück zwischen seinen Punkten, `fit.ts`). Ziele der
   Bindungen aus dem Pfad; ein Zug ändert Punkte und Griffe, nicht mehr die Proben.
2. **Bearbeiten wie Illustrator:** Punkt ziehen (Griffe gehen mit), Griff ziehen (glatt: der andere dreht mit, Ecke: frei), Punkt
   löschen (die Nachbarn verbinden sich über ihre eigenen Griffe), Punkt einfügen per Doppelklick (de Casteljau, die Form bleibt),
   Ecke/glatt per Doppelklick oder ⌥.
3. **Stift P** in Seite, Front und Top: Klick setzt eine Ecke, Klicken und Ziehen einen glatten Punkt mit Griffen, Klick auf den ersten
   Punkt schließt; die Punkte liegen auf der Haut, die Griffe in ihrer Tangentialebene; über die Mitte gezeichnet ein Ring. L und F
   bleiben (sie legen den Pfad durch Anpassung an).
4. **Kante und Knick:** Eine Ecke von selbst an einer Kante bekommt Griffe zu ihren Nachbarpunkten („Vector“), die Linie knickt dort
   wirklich; Kante an/aus wirkt dann sofort mit Knick.
5. **Nachziehen:** Kreuzungen (gemeinsamer Punkt zweier Pfade), Spiegelpunkte, Maul und Mundwinkel, Fressen-Pose, Verdichten (neue
   Kettenpunkte bekommen ihre Stelle auf dem Pfad); alle Fenster-Proben.

Was wegfällt: Griffe aus Proben ablesen (`griffeBei` mit Polynom), Ausrichten ab 4°, Linienproben nur unter ¼ zusammenlegen, die
Hermite-Verschiebung. Aufwand wie geschätzt etwa 2–3 Tage.

### Stand Teil A (06.11. abends): Schritte 1 und 2 gebaut

**Entscheidung beim Bauen: Die Linie behält ihre Form, die Griffe steuern ihre Verformung.** Der Plan oben wollte die Linie genau
auf den Pfad legen. Dann änderte schon das Anlegen die Haut (ein halber Ring als ein Bézier-Stück liegt bis 6 Einheiten neben dem
Kreis, und eine mit dem Stift gezeichnete Form läge zwischen ihren Punkten nicht mehr auf der Haut). Jetzt speichert jeder Punkt
seine Griffe, die Linie bleibt beim Anlegen genau, wie sie auf der Haut liegt. Jeder Zug verformt sie genau so, wie sich das
Bézier-Stück aus Punkten und Griffen ändert (das tat `verschiebungLaengs` schon; neu ist, dass die Griffe danach gespeichert
werden statt neu abgelesen).

- **Anlegen** (`griffeAnlegen`): je Stück das Bézier-Stück durch die Linie nach kleinsten Quadraten, glatte Punkte mit beiden
  Griffen auf einer Geraden, Spiegelpunkte senkrecht zur Mittelebene. Ein Ring bekommt an seinen Enden Punkte, die nur Griffe
  halten (unsichtbar, nicht greifbar, wie vorher; fällt eine Kreuzung darauf, wird es ein Spiegelpunkt). Ein neuer Loop liest seine
  Griffe erst, nachdem seine Kreuzungen eingesetzt sind.
- **Einfügen** (Doppelklick, Kreuzungen): teilt das Stück wie Illustrator (de Casteljau). Die Linie bleibt genau, der neue Punkt
  ist glatt, die Nachbargriffe behalten ihre Richtung und werden kürzer.
- **Löschen** (⌫, `punkteLoeschen`): Die Nachbarn verbinden sich über ihre eigenen Griffe (Richtung bleibt, Länge angepasst), die
  Linie folgt dem neuen Stück. Kreuzungen mit einem gelöschten Loop werden gewöhnliche Punkte (die anderen Loops bleiben, wie sie
  sind).
- **Gemessen mit der Maus** (`form-pfad-probe.mjs`): Augen-Form mit 8 Punkten, alle glatt auf 0,0000°. Doppelklick: Linie 0
  bewegt, neuer Punkt glatt, Nachbargriffe 0,0000° gedreht und halb so lang. Oberen Punkt gelöscht: Linie zwischen den Nachbarn
  0,17 bewegt, 0 umgeklappt, Nachbargriffe 0,0000° gedreht. ⌘Z genau. Bilder
  `docs/progress/editor/form-pfad-loeschen-{vorher,nachher}-2026-11-06.jpg`.
- **Die anderen Proben** gleich oder besser: Griffe zeigen am glatten Punkt 0,0° statt 2,8° Zacken, Fressen-Pose 25 für 25, Maul
  und Kopf-Zug wie vorher, Rüssel mit gedrehtem Griff 8/0 statt 12/2 (Knicke über 60°/umgeklappt). Etwas schlechter: Boden
  0,25 statt 0,11 Einheiten unter der Ebene (die Griffe an den Ecken sind jetzt die gespeicherten). `?griffe=0` zeigt zum
  Vergleich das Ablesen wie vorher.
- **Verworfen (gemessen):** neue Punkte und die Längen der Nachbargriffe aus der Linie neu angepasst (an einer weit gezogenen
  Rüsselspitze wurden die Griffe 600 Einheiten lang); Ecke von selbst, wo die Linie über 15° knickt (Ecken sperren die Krümmung im
  Löser: Rüsselspitze 30 statt 6 Knicke).

**Schritt 3, Stift P** (gebaut): wie Illustrator in einem Blatt. Klick = Ecke, Klicken und Ziehen = glatter Punkt (Griff folgt der
Maus, das Gegenüber zeigt zurück), Klick auf den ersten Punkt oder ⏎ schließt, ⌫ nimmt den letzten Punkt zurück, Esc bricht ab. Die
Form wird wie mit F auf die Haut gelegt (über die Mitte ein Ring, in der Seite vorn über den Umriss auch), ihre Punkte sind die
geklickten, die Griffe der glatten Punkte die gezogenen, in die Fläche gehoben. Gemessen mit der Maus (`form-stift-probe.mjs`): vier
Anker ums Auge, die Linie liegt im Blatt höchstens 0,35 px neben der gezeichneten Form, die Griffe zeigen im Blatt genau wie
gezogen (22/0, −22/0, 0/22), die geklickte Ecke ist eine Ecke, die Haut bleibt unverändert, 0 umgeklappt; oberen Punkt 20 hoch:
0 umgeklappt; ⌘Z genau; in der Front quer über die Mitte ein Ring mit den zwei Punkten der vorderen Hälfte. Bilder
`docs/progress/editor/form-stift-{zeichnen,fertig}-2026-11-06.jpg`.

**Schritt 4, Kante knickt die Linie** (gebaut): Wird eine Linie zur Kante (Taste K), bekommen die Punkte der Linien, die sie
kreuzen, neue Griffe, und die Linie knickt dort wirklich, die Haut mit ihr. Kante aus: Die Griffe liegen wieder auf einer Geraden.
Abweichung vom Plan: nicht „Vector“ (Griffe zu den Nachbarpunkten), sondern **jede Seite so rund wie möglich** (natürliches Ende:
das Stück zum Nachbarn hat am Knick keine Krümmung). Mit „Vector“ wird ein Pilzhut eine Glocke, die sich am Rand nach außen biegt,
und schon eine Kugel bekommt am Äquator einen Grat von 71°; rund wird der Hut eine Kuppel. `?knick=vektor` zeigt zum Vergleich die
Regel aus dem Plan.

| Knick quer über den Rand (Median), im Fenster | bisher | rund | „Vector“ |
| --- | --- | --- | --- |
| Kugel, Kante am Äquator gesetzt | 5° | 27° | 71° |
| Kante, dann die Unterseite 120 hinauf | 37° | 81° | 110° |
| Unterseite 120 hinauf, dann Kante | 15° | 92° | 109° |
| Linse (oben und unten zur Mitte), Kante vorher | 24° | 73° | — |

Am harten Ring knickt der kreuzende Ring an der Kreuzung 57° statt 11°. 0 umgeklappt bis auf die Linse (2). Im Kern-Test
(`pfad.test.ts`): nachträglich 12° → 87°, wieder aus 14°. Bild `docs/progress/editor/form-kante-knick-vergleich-2026-11-06.jpg`.
**Das ist eine Look-Entscheidung für Florian:** Ob eine Kante die Form so stark ändern soll, sieht man im Bild.

Nächster Schritt: Pose, Maul und Verdichten durchprüfen, dann die alte Ableselogik entfernen.

**Schritt 5 (06.11. nachts): Kante „rund“ festgelegt, auch beim Ziehen; altes Ablesen entfernt.** Florian nach dem Vergleich
(Kuppel gegen Glocke): „ja dann rund“.

- **Rund auch beim Ziehen** (`griffVersatzImZug` in `loops.ts`, benutzt von `verschiebungLaengs` und `griffeNach`): Eine Ecke von
  selbst folgt in jedem Zug ihren Nachbarn so, dass jede Seite rund bleibt. Ihr Griff verschiebt sich um die Hälfte dessen, was
  Nachbarpunkt und dessen Griff zu ihr hin sich gegen sie verschieben; das natürliche Ende, das K setzt, bleibt so erhalten. Vorher
  folgte sie beim Ziehen „Vector“ (ein Drittel der Sehne), deshalb hing der Knick an der Reihenfolge. Zwei Ecken von selbst
  nebeneinander stimmen sich in einigen Runden ab (das Stück zwischen ihnen wird gerade). Dreht oder skaliert ein Zug ihre Griffe
  selbst (S/R mit ihr in der Auswahl), gilt das.
- **Wie bei K:** Ein gelöschter Kanten-Loop macht seine Kreuzungen in den anderen wieder glatt; ein Doppelklick, der eine Kreuzung
  wieder zur Ecke von selbst macht, knickt sie rund; ein neuer Loop, der eine Kante kreuzt, liest dort seine Griffe je Seite (als
  Ecke) und ändert die Form nicht.
- **Altes Ablesen entfernt:** das Ausgleichspolynom je Seite (`steigungSeite`) samt Lesezweig in `griffeBei`, die 4°-Schwelle in
  `griffeAusrichten`, `?griffe=0` und `?knick=vektor`. `griffeBei`, `griffZiehen`, `griffeAbbilden` und `griffeAusrichten` brauchen
  keine Lagen mehr; `istVektorEcke` heißt jetzt `istEckeVonSelbst`. Die Kern-Tests legen die Griffe an wie das Fenster (jeder neue
  Loop nach seinen Kreuzungen).

| Knick quer über den Rand (Median), im Fenster | rund bei K, „Vector“ beim Ziehen | jetzt |
| --- | --- | --- |
| Kugel, Kante am Äquator gesetzt | 27° | 27° |
| Kante, dann die Unterseite 120 hinauf | 81° | 92° |
| Unterseite 120 hinauf, dann Kante | 92° | 92° |
| Linse (Kante, dann oben und unten 70 zur Mitte) | 73° (2 umgeklappt) | 83° (8 umgeklappt) |

Am harten Ring knickt der kreuzende Ring an der Kreuzung 48° (Grat 50°), glatt 0°. Die anderen Proben wie vorher (Pfad, Stift,
Braue, Kreuzung, Griffe, Boden 0,25, Zoom, Verdichten, Maul, Fressen-Pose 25 für 25, Explosion a/c/e/g/Pilz). Bild
`docs/progress/editor/form-kante-rund-reihenfolge-2026-11-06.jpg`. Ehrlich zur Linse: Rund heißt hier, jede Seite läuft gerade aus
dem Knick und wölbt sich dann. Zwei Kugelkappen gäben 67°, die Linse hat 83° und an der Kante 8 sehr kleine umgeklappte Dreiecke.
Im Kern-Test C (Rüssel, Griff gedreht) 34 Knicke über 60° und 2 umgeklappt statt 28 und 6: Der Griff an der Spitze zeigt nach den
Zügen noch, wie er auf der Kugel lag, gedreht wird er von dort aus; im Fenster 8 und 0.

**Nachtrag (06.11. nachts): Punkt hinaus und zurück gibt wieder dieselbe Linie.** Florian: „wenn ich einen Punkt rausziehe und
dann wieder zurücksetze, ist das Mesh nicht gleich. Warum?“ (Bild mit Wellen an der Linie). Gemessen mit der Maus
(`scripts/pruefen/form-hin-zurueck.mjs`: neuer Punkt auf der Mitte, weit hinaus, genau zurück): Ohne Verdichten kommt die Linie
genau zurück. Die Wellen kamen von den Punkten, die das Verdichten beim Hinausziehen in die Linie setzt. Sie bekommen ihre Stelle s
in der Mitte ihrer Kante, lagen aber nach Sehnenlänge bzw. Catmull–Rom daneben, und ein Zug zurück rechnet nach s. Jetzt liegt ein
neuer Punkt genau auf dem Bézier-Stück (`pfadBei`), dazu der kleine Abstand, den die Linie beim Anlegen von ihrem Pfad hatte.

| Welle der Linie nach hinaus und zurück (vor dem Zug 0,07) | nach Sehnenlänge (vorher) | Catmull–Rom nach s | auf dem Pfad |
| --- | --- | --- | --- |
| 100 hinaus | 0,16 | 0,10 | 0,07 |
| 220 hinaus | 0,38 | 0,18 | 0,07 |
| 400 hinaus | — | 0,56 | 0,07 |

Ganz gleich ist das Netz danach trotzdem nicht: Es hat mehr Punkte und andere Dreiecke, die Form aber ist dieselbe. Test
`weiterZug.test.ts` E (mit Catmull–Rom rot). Etwas schlechter wurde die absichtlich verdrehte Schlaufe (40/12 statt 34/10), wo die
Linie selbst verkehrt läuft.

**Nachtrag (06.11. spätabends): Biegung zwischen zwei Punkten, Abwägung.** Florian: Die Griffe fühlen sich nicht ganz wie in
Illustrator an; nach mehrfachem Ziehen entstehen zwischen zwei Punkten Biegungen, die sich mit den Griffen nicht glätten lassen
(Bild `docs/progress/editor/form-biegung-florian-2026-11-06.webp`). Gemessen mit der Maus (`scripts/pruefen/form-restversatz.mjs`,
Kugel, drei Loops):

- Die Linie ist nicht genau ihr Bézier-Pfad. Sie ist der Schnitt durch die Haut beim Anlegen, die Griffe werden ihr angepasst, der
  Rest bleibt je Stelle als fester Versatz an der Linie. An gleicher Stelle bis 7,2 Einheiten (meist längs der Linie), neben der
  Kurve 2,0 an den beiden ersten Loops (beim Anlegen nur zwei Kreuzungen, ein Halbkreis als ein Stück; spätere Kreuzungen teilen
  den Pfad formtreu und erben das), 0,7 am dritten.
- Der Versatz ist eine feste Richtung im Raum und dreht sich nicht mit dem Stück: Wird ein Punkt woandershin gezogen, steht quer,
  was längs lag (neben der Kurve 2,0 → 3,3 / 3,2 / 4,3, zurück am alten Ort wieder 2,0). Er sammelt sich nicht an (dreimal hinaus
  und zurück gleich, der Punkt 0,00 neben seinem Ort). Griff gegen Linie 1,2°, nach einem neuen Punkt 3,1° (der Punkt liegt auf
  der Linie, seine Griffe auf dem Pfad). In Florians Bild zeigt der linke Griff am oberen Punkt fast waagerecht, die Linie läuft
  gut 10° schräg weg.
- Örtlich (`scripts/pruefen/form-oertlich.mjs`, oben 60 hinauf): Unter dem unveränderten Ring ändert sich die Form um höchstens
  0,6 (Abstand zur Kugel 0,23 → 0,85), mit Gedächtnis 0,5 (→ 0,77). Die Punkte gleiten aus den Kurven bis 2,2 längs der Fläche
  (Gedächtnis 0,6); das sieht man nicht.
- Vorschlag: Die Linie ist der Bézier-Pfad, die Haut folgt ihm. Dann steuern die Griffe alles, und Verdichten und Zusammenlegen
  ändern die Linie nie. Preis beim Anlegen: Ein Halbkreis als ein Stück liegt etwa 1,4 % neben dem Kreis (an der Kugel 2
  Einheiten). Entweder ändert sich die Haut beim Anlegen so weit, oder der neue Loop bekommt so viele Punkte wie nötig
  (in Illustrator hat ein Kreis vier). Entscheidung bei Florian.
- Was die Käfig-Verfahren besser konnten (Vierecke mit Kantenloops auf den Linien, feste Punktzahl für Posen und Muster, Glätte
  und scharfe Falten per Unterteilung, wenige hundert Punkte), betrifft das Netz fürs Spiel. Das lässt sich als letzter Schritt
  aus den fertigen Loops bauen (Stücknetz aus P2), statt die Form daran zu binden.

**Nachtrag (06.11. nachts): Gedächtnis gegen „aus den Kurven“, gemessen.** Florian: „ist gedächtnis dann nicht besser?“ Beide
Löser im Fenster mit der Maus, gleicher Ablauf (Kugel, drei Loops; `?haut=gedaechtnis` zum Vergleich). Netze mit 5 200 bzw.
15 400 Punkten:

| | Gedächtnis | aus den Kurven (Standard) |
| --- | --- | --- |
| Punkt 120 hinaus und genau zurück: Haut neben der Kugel (vorher 0,23) | 1,84 (ohne Verdichten 2,05) | 0,65 (0,74) |
| großer Zug (Kreuzung vorn), je Mausbewegung | 19–21 / 65–70 ms | 15–16 / 27–29 ms |
| großer Zug, Drücken | 185–249 / 503–537 ms | 71–73 / 137 ms |
| kleiner Zug (Punkt einer Augen-Form, 15 hinauf), je Mausbewegung | 1,5–1,6 / 3,6–3,7 ms | 14,5–16,5 / 26,5–28,3 ms |
| kleiner Zug, Drücken | 67–86 / 134–150 ms | 59–84 / 134 ms |

- Das Gedächtnis ist nur bei kleinen Zügen schneller, dort etwa zehnmal: Es rechnet nur im Bereich um den Zug. Bei großen Zügen ist
  es langsamer (der große Bereich wird beim Greifen zerlegt, nicht in der Ruhe vorgerechnet). Die Aussage vom Abend „große Netze
  sind mit B langsamer“ gilt also nur für kleine Züge.
- In der Form ist „aus den Kurven“ in allen gemessenen Fällen gleich oder besser (Abschnitt 5: Überhang, Hammer, Boden, gelöschte
  Form, Pilzkante). Nach einem Hin und Zurück bleibt mit Gedächtnis fast dreimal so viel stehen: Was ein Zug geformt hat, merkt sich
  die Haut, auch wenn die Linie wieder am alten Ort ist. Dasselbe lässt eine gelöschte Form als Beule zurück (7,2 gegen 0,7).
- Ganz ohne Geschichte ist auch „aus den Kurven“ nicht: Die Krümmung an den Loops wird an der Haut gemessen, wie sie gerade ist
  (wie in FiberMesh), daher 0,74 statt 0,23 nach dem Hin und Zurück.
- Prüfungen: `scripts/pruefen/form-hin-zurueck.mjs`, `form-greifen-probe.mjs` (großer Zug), neu `form-tempo-oertlich.mjs` (kleiner
  Zug), je mit `KURVEN_URL`.

**Nachtrag (07.11.): Die Linie ist ihr Pfad, gebaut.** Florian: „ja genau zur Bézier-Kurve machen“. Eine Variante hat er nicht
gewählt; gebaut ist meine Empfehlung „ohne Zusatzpunkte“, „Punkte wo nötig“ liegt zum Vergleich hinter `?punkte=noetig`.

- **Was jetzt gilt (Grundform):**
  - Jede Probe einer Linie hat ihren Platz auf dem Pfad (t in ihrem Stück). Ihr Ziel ist genau der Pfad dort (`pfadLagen`). Im Zug
    kommt zur Änderung des Pfads hinzu, was der Linie beim Anfang noch fehlte (`mitRest`). Die Punkte bleiben, wohin sie gezogen
    wurden: `festlegen` liest sie nicht mehr von der Haut ab.
  - **Anlegen:** Die Griffe werden nach dem nächsten Punkt angepasst (drei Runden wie bei Schneider). Jede Probe kommt an die Stelle
    des nächsten Punkts auf ihrem Pfad (`pfadParameter`), damit sie nur quer zur Linie springt; vorher lag sie an gleicher Stelle bis
    7,2 längs daneben. Dann springt die Linie örtlich und mit Gedächtnis auf den Pfad (`linienAufPfad`).
  - **Kreuzungen:** Ein neuer Loop lässt den Proben der Loops, die er kreuzt, ihre Stelle (`loopErgaenzt`). Vorher wurde sie neu als
    Bogenlänge vermessen, und eine Kreuzung lag dann längs neben der wirklichen. Eine Kreuzung ist ein Ort auf beiden Pfaden.
  - **Ringenden:** Ein Ende eines Rings, das nur Griffe hält, ist glatt und steht senkrecht zur Mittelebene.
  - **O** formt Loops mit Pfad wie Blender eine Kurve: Punkte und Griffspitzen gehen je mit ihrem Gewicht mit, glatte Punkte bleiben
    glatt (`griffeProportional`). Vorher ging O je Probe, und danach wurden die Griffe neu abgelesen.
  - **Stift:** Eine geklickte Ecke hat im Blatt keinen Griff. Ein gerade gezeichnetes Stück bekommt ein Drittel der Sehne, es bleibt
    gerade. In der Tiefe folgt die Ecke der Haut (`eckenTiefe`).
    - Mit angepassten Griffen lag die Linie im Blatt bis 2,4 px neben der Zeichnung.
    - Ganz ohne Griff schnitt ein Rechteck quer über die Kugel als Sehne durch die Haut: 32 umgeklappte Dreiecke, mit Tiefe allein
      noch 20, jetzt 0.
    - Wird eine Ecke ohne Griffe per Doppelklick glatt, bekommt sie Griffe von je einem Drittel des Abstands zu ihren Nachbarn.
  - **Pose:** In der Pose bleibt alles wie bisher; dort folgen die Linien der Änderung ihres Pfads.
- **Gemessen im Fenster mit der Maus** (Kugel, drei Loops; `form-restversatz.mjs`, `form-hin-zurueck.mjs` mit neu `ZYKLEN`):

| | bis 06.11. | jetzt |
| --- | --- | --- |
| Linie ↔ Pfad an gleicher Stelle | bis 7,2 (neben der Kurve 2,0) | 0,00 |
| Griff ↔ Linie am Punkt | bis 3,1° | 0,0° |
| Kugel nach dem Anlegen, höchstens / Mittel | 0,23 / 0,15 | 2,23 / 0,39 |
| nach dem ersten Zug (der Löser rechnet die ganze Haut) | 0,65 / 0,22 | 2,35 / 1,09 |
| Hin und zurück, 2. und 3. Mal gegen das vorige (Form längs der Normale) | 0,15 / 0,13 | 0,19 / 0,18 |

  Der Punkt kommt in beiden Fällen genau zurück (0,00), die Linie jetzt auch (die Mitte liegt danach wieder bis 2,23 neben dem
  Kreis wie vor dem Zug).
- **Der Preis „ohne Zusatzpunkte“:**
  - Ein Halbkreis als ein Stück liegt bis 1,4 % neben dem Kreis, und seine Krümmung schwankt längs des Stücks um etwa 15 %.
  - Die Haut entsteht aus der Krümmung der Linien. Deshalb weicht nach dem ersten Zug die ganze Kugel ab, nicht nur an den Linien.
  - Im Kern bis zum Stillstand gerechnet (`scripts/pruefen/form-gleichgewicht.ts`, 60 Runden), höchstens / Mittel:
    - bisher 0,70 / 0,24;
    - genau ohne Zusatzpunkte 2,49 / 1,15;
    - Punkte wo nötig (0,43, wie `?punkte=noetig`) 0,67 / 0,22, mit 4 / 6 / 3 statt 3 / 4 / 3 Punkten: Der halbe Ring bekommt einen
      Punkt, die Mitte zwei, wie ein Kreis in Illustrator vier hat.
  - Bilder (`scripts/pruefen/form-linie-pfad-bild.mjs`: drei Loops, dann die obere Kreuzung 80 hinauf):
    `docs/progress/editor/form-linie-pfad-{ohne,noetig}-2026-11-07.jpg`.
    - Ohne Zusatzpunkte: ein sauberes Ei, unten bis 2,20 neben der Kugel.
    - Mit Punkten wo nötig: unten 1,61, aber die Mitte bekam ihre Punkte oben und unten genau dort, wo der senkrechte Ring sie danach
      kreuzt (10 Einheiten daneben). Die obere Kreuzung zieht deshalb nur das kurze Stück bis zu diesem Punkt: oben ein spitzer Zipfel.
      So ginge das erst mit einer weiteren Regel (eine Kreuzung ersetzt einen nahen Punkt, der von selbst kam).
- **Verworfen (gemessen):**
  - Beim Anlegen mit dem Löser über die ganze Haut auf den Pfad: Mit nur einem Loop hält nichts die Kugel rund. Schon der erste Ring
    zog sie bis 10,6 weg, nach drei Loops 8,9, im Mittel 3,5. Örtlich mit Gedächtnis sind es 2,2, im Mittel 0,4.
  - Punkte wo nötig mit 0,1: Wegen des Rauschens der Linie im Netz kamen 13 / 10 / 5 Punkte heraus.
- **Die anderen Proben:**
  - Pfad: Einfügen genau, Löschen bewegt die Linie zwischen den Nachbarn 0,10 statt 0,17.
  - Stift: die Linie im Blatt höchstens 0,33 px neben der Zeichnung, vorher 0,35.
  - Boden: 0,01 unter der Ebene, vorher 0,25.
  - Braue: 49° gegen 11°.
  - Pilz: Kante 89,5° bzw. 90,2°, die Reihenfolge ist egal; weich 9°.
  - Linse: 80° mit 6 umgeklappten statt 83° mit 8.
  - Augen-Form ohne O um 30° gedreht: 4 umgeklappt statt 10.
  - Wie vorher: Maul dicht bis 55°, Fressen-Pose 25 für 25, Zoom, Spiegelpunkt, Hammer 0/0, Greifen 14,6 ms je Mausbewegung.
- **Anders oder schlechter:**
  - Kugel mit Kante am Äquator: knickt 42,5° statt 27°.
  - Kreuzung, Griff 60 px seitlich gezogen: knickt 38,8° bzw. 11,3° je nach Reihenfolge der Loops, vorher 41°; den Grund habe ich
    nicht nachgeprüft.
  - Überhang (`form-explosion-probe.mjs`, Fall a), nach dem letzten Zug: 6 bis 12 Knicke über 60° und 2 umgeklappte Dreiecke an der
    Schnabelspitze, vorher 0 / 0. Die Linien liegen dabei nach jedem Schritt genau auf ihrem Pfad (0,00). Es springt also nichts nach;
    die Form kommt aus den Pfaden selbst. Der senkrechte Ring verlässt die weit vorgezogene Spitze mit seinem alten Griff.
- **Prüfungen:** Kern `dicht/linieAufPfad.test.ts` (4 Tests), alle 101 Tests unter `src/dicht/` grün; im Fenster neu der Haken
  `pfadRest` und `PFAD=1` in `form-explosion-probe.mjs`.
- **Fallen:**
  - Dateien im Vite-Root nie ändern, während Fenster-Proben laufen: Das Fenster lädt neu, und die laufende Probe misst Unsinn
    (die Härte-Probe brach so ab).
  - Proben, die eine Stelle s als Bogenlänge der Linie lesen, liegen daneben: s ist jetzt der Platz auf dem Pfad. Die Kurven-Probe
    traf deshalb mit dem Doppelklick einen Punkt statt der Linie; jetzt sucht sie die Probe nach ihrem s.

**Nachtrag (08.11.): Kleine Details — Linien im Netz mit fester Genauigkeit, Linie als Bézier-Kurve gezeichnet, Doppelklick überall.**
Florian mit Bild (`docs/progress/editor/form-detail-florian-2026-11-08.webp`): „Was ich nicht verstehe, warum es ungenau und eckig wird,
wenn ich kleine Details rausziehe … Die Linie wird ganz kantig. Der Punkt sitzt nicht mehr exakt auf der Linie, und ich habe Probleme,
einen neuen Punkt einzufügen direkt am Detail.“ Zu „Punkte wo nötig“: „etwas besser, aber ich muss es weiter testen“ — Standard bleibt
ohne Zusatzpunkte, `?punkte=noetig` bleibt zum Vergleich.

- **Nachgestellt** (`scripts/pruefen/form-detail-probe.mjs`): Kugel, drei Loops, auf dem senkrechten Ring in der Front vier Punkte per
  Doppelklick (40°, 50°, 60°, 70° vom Scheitel, zwischen zwei Netzpunkten wie von Hand), die zwei mittleren zusammen 70 nach außen —
  ein Ohr wie im Bild.
- **Drei Ursachen:**
  - Die Linie wurde durch ihre Proben gezeichnet, und das sind Punkte des Netzes. Verdichtet wurde nur nach der Länge (über 1,75
    Startkanten). Am Ohr lagen die Proben bis 13,6 auseinander; wo die Kurve eng wird, schnitt die gezeichnete Linie sie um bis 1,02
    ab (bei 307 % 2,8 Bildpunkte).
  - Ein Punkt liegt genau auf seinem Pfad, die gezeichnete Linie auf der Sehne zwischen zwei Proben: bis 0,92 daneben (2,5 Bildpunkte).
  - Ein Doppelklick wurde still verworfen, wenn er in s näher als eine Startkante an einem Punkt lag. s ist aber der Platz beim
    Anlegen: Nach dem Zug lagen in diesem Abstand bis 25 Einheiten Linie, an der Flanke des Ohrs ging kein Punkt.
- **Jetzt:**
  - Nach einem Zug löst das Netz die Linien auf eine feste Abweichung auf (`verdichten` mit `genau` = MK/40 ≈ 0,22, bei 307 % 0,6
    Bildpunkte; wie adaptives Neuvernetzen nach Dunyach u. a. 2013): Eine Kante einer Linie wird geteilt, wo die Linie zwischen ihren
    zwei Netzpunkten weiter von der Sehne abweicht (liegt ein Punkt der Linie darin, genau an ihm, sonst in der Mitte); der neue Punkt
    liegt genau auf der Kurve. Zusammengelegt wird nur, wo die neue Kante danach höchstens halb so weit abweicht oder nicht weiter als
    die zwei, die sie ersetzt. Nach dem Setzen wird noch einmal geteilt, wo es nötig ist (höchstens dreimal). Nur in der Grundform: In
    der Pose liegt die Linie neben ihrem Pfad.
  - Die Blätter zeichnen die Linie als ihren Bézier-Pfad (SVG-Kurven aus den abgebildeten Punkten und Griffen; das Blatt bildet
    linear ab): bei jedem Zoom glatt und genau durch die Punkte. Während eines Zugs und in der Pose wie bisher die Linie, wie sie liegt.
  - Doppelklick: Der Punkt kommt an die Stelle des gezeichneten Pfads, die dem Klick am nächsten ist; verworfen nur, wo im Blatt schon
    ein Punkt näher als 3 Bildpunkte liegt.
- **Gemessen am Ohr** (mit der Maus, Front bei 307 %, 2,74 Bildpunkte je Einheit):

| | vorher | jetzt |
| --- | --- | --- |
| gezeichnete Linie schneidet ihre Kurve ab | 1,02 (2,8 px) | 0 (Pfad); Linie im Netz 0,18 (0,5 px) |
| Punkt neben der Linie des Netzes | 0,92 (2,5 px) | 0,10 (0,3 px) |
| Doppelklick an der Flanke (20 %, 80 % des Stücks) | verworfen | gesetzt, 0,1 bzw. 0,4 px neben dem Klick |
| Haut zwischen den Linien neben der runden Fläche | 0,85 | 0,99 (unverändert grob) |
| Netzpunkte der ganzen Haut | 5 136 | 5 152 |

  Bilder `docs/progress/editor/form-detail-{vorher,nachher}-{front,3d}-2026-11-08.jpg`. Nur die Linie als Kurve zu zeichnen reicht
  nicht: Mit dem alten Netz ist die Linie glatt, der Umriss des Shaders daneben eckig, wo die Linie den Umriss bildet (`?genau=0`).
- **Die Haut zwischen den Linien bleibt so grob wie vorher.** Sie ebenso fein zu machen (`?genauHaut=1`: geteilt, wo die Fläche zwischen
  den Enden einer Kante weiter als MK/40 von der runden abweicht, Länge × Drehung der Normale / 8, nicht in Falten) macht das Ohr rund
  (0,21 statt 0,99; 6 248 Punkte), aber weite Züge schlechter, gemessen mit der Maus (Knicke über 60° / umgeklappt):

| | ohne | Linien genau (Standard) | Linien und Haut genau |
| --- | --- | --- | --- |
| Rüssel, erster Zug | 5 / 0 | 3 / 0 | 22 / 10 |
| Rüssel, Griff an der Spitze −45° | 24 / 4 | 31 / 0 | 62 / 30 bis 108 / 46 (zwei Läufe) |
| Fressen-Pose, Unterlippe 25 hinab (Haut umgeklappt) | 0 | 0 | 8 |
| Augen-Form S ×1,3 (umgeschlagen) | 0 | 0 | 2 |

  Ohne Schutz vor Falten wucherte der Überhang ganz (1 724 Knicke, 784 umgeklappt, später 17 615 Punkte): Die Falte an der
  Schnabelspitze wurde immer feiner geteilt und beim Setzen größer. Der Löser aus den Kurven verträgt die vielen geteilten Dreiecke an
  stark gedehnten Stellen nicht; die Haut fein und stabil zu machen ist ein eigener Schritt (etwa Neuvernetzen mit Entspannen statt nur
  Teilen). Gleich nach dem Anlegen eines Loops zu teilen war ebenfalls schlechter (ohne Setzen danach klappten Splitter um).
- **Unterwegs gefunden:** An einer Stift-Ecke fallen beim Anlegen zwei Proben auf die Ecke (0,01 auseinander, das Vermessen auf dem Pfad
  projiziert beide dorthin). Das Zusammenlegen nahm den Doppelten bisher beim ersten Zug weg; eine zu strenge Schranke („die neue Kante
  weicht höchstens halb so weit ab“) ließ ihn stehen, ein Dreieck ohne Fläche und zwei umgeklappte auf der Spiegelseite. Jetzt darf
  zusammengelegt werden, was die Linie nicht verschlechtert.
- **Die anderen Proben** (Standard gegen `?genau=0`, je ein Lauf): Überhang am Ende 6 / 2 wie vorher, nach „oben −300“ 40 / 12 statt
  34 / 8; Hammer, Schnabel, Pilz, Linse, Hin und zurück (Haut 2,32 / 1,08, gegen das vorige Mal 0,19 / 0,18), Boden (0,01), Kreuzung
  (38,8° / 11,3°), Maul (dicht bis 55°), Fressen-Pose (0 / 7), Pfad, Griffe, Spiegelpunkt, Zoom: gleich; Stift 0 umgeklappt (wie vorher);
  Augen-Form R 30° 0 statt 4 umgeschlagen; Braue 46,8° / 11,3° statt 45,3° / 12,4°; Greifen gleich schnell (je Bewegung 15–16 ms bei
  5 200 Punkten, 27–29 ms bei 15 400).
- **Kern-Test** `linieAufPfad.test.ts` „Genauigkeit“: dasselbe Ohr im Kern. Linie ↔ Kurve 1,02 → ohne Genauigkeit 1,02, mit 0,18; mit der
  Haut (Versuch) Fläche 0,27; geschlossen, spiegelgleich, Ketten heil, Punkte an Ort; die unberührte Startkugel und drei Loops auf ihr
  teilen nichts. Alle 102 Tests unter `src/dicht/` grün.
- **Fallen:**
  - Jede neue Verfeinerung zuerst am Überhang und am Rüssel der Explosionsprobe prüfen: In Falten und an stark gedehnten Stellen
    schaukeln sich Regeln nach Normalen auf.
  - Abstände von Punkten nie in s messen: s ist nach einem Zug keine Länge mehr.
  - Eine Schranke beim Zusammenlegen gegen „nicht schlechter als vorher“ messen, nicht gegen einen festen Wert; sonst bleiben
    doppelte Punkte stehen.
  - Was an Pfaden hängt, gilt nur in der Grundform (in der Pose sind die Griffe die der Grundform).

## 8. Nachtrag (08.11. abends): Sprung beim Loslassen, Stift-Form über Linien — gemessen, noch nichts geändert

Florian (mit zwei Bildern einer Stift-Form über zwei Linien): „die Haut sollte immer glatt sein, auch bei kleinen Details und hoher
Zoomstufe“; „wenn ich z. B. eine Form mit P erstelle und diese über die vorhandenen Linien ziehe, ist die Form sehr ungenau und wird
von den auf den Kreuzungen stehenden Punkten verzogen. Die Form soll exakt wie eingezeichnet direkt auf der Haut liegen, ohne diese zu
verändern“; Frage: „beim Loslassen springt das Mesh teilweise ziemlich zwischen den Punkten. Kann man die Performance optimieren und
können Änderungen auch live beim Zug passieren …? In meiner Vision ist das Mesh wirklich live dynamisch und verdichtet/lockert sich
perfekt während des Zuges.“ Erst die Fragen beantworten, dann Haut und Punkte.

**Sprung beim Loslassen** (`scripts/pruefen/form-loslassen-probe.mjs`: Stand nach der letzten Mausbewegung gegen jede spätere Änderung,
Abstand jedes Punkts zur Fläche davor; drei Loops, 30 Mausschritte, 15,6 ms je Bewegung bei 5 222 Punkten):

| Zug | ohne Verdichten (`?verdichten=0`) | Standard: gleich beim Loslassen | Standard: ≈ 0,4–0,6 s danach (Setzen) |
| --- | --- | --- | --- |
| Hals (obere Kreuzung 160 hoch) | 0,11 | 0,27 | 4,9 (1 456 Punkte über 1) |
| Ohr (zwei Punkte 70 hinaus) | 0,11 | 0,92 | 5,4 (660 Punkte über 1) |
| Rüssel (+320 / −70) | 1,41 | 1,41 | 32,2 (3 226 Punkte über 1) |

- Während des Zugs ist die Haut auf ihrem Netz fertig gerechnet (die vier Runden am Ende ändern höchstens 1,4). Der Sprung kommt eine
  halbe Sekunde nach dem Loslassen, wenn sich das verdichtete Netz setzt. Die neuen Punkte liegen erst auf der alten Fläche (≤ 1,4); das
  Nachrechnen auf dem feineren Netz verschiebt sie. Das Nachverfeinern der Linien (`genau`) trägt kaum bei (mit `?genau=0` gleich).
- **Ursache:** Der Löser (wie FiberMesh) rechnet „glatt“ als gleich gewichtetes Mittel der Nachbarn und hält die Verteilung der Punkte
  (`tang` in `vermessen`). Damit hängt die Form vom Netz ab: dieselben Linien auf einem anderen Netz geben eine andere Form. Das Paper
  nennt das selbst als Grenze (Abschnitt 2: gleichmäßiger Laplace statt Flächenmaß).
- **Folgerung:** Live verdichten hilft erst, wenn die Form nicht mehr vom Netz abhängt (sonst schwimmt die Haut bei jedem Netzschritt).
  Zwei Schritte: (1) Löser netzunabhängig (Gewichte nach der Geometrie der Dreiecke, Laplace–Beltrami mit Kotangens auf einer
  intrinsischen Delaunay-Triangulierung; die Verteilung der Punkte getrennt davon entspannen); (2) das Netz im Zug nachführen (Teilen,
  Zusammenlegen, Entspannen nur, wo sich etwas ändert). Teuer ist dabei nicht das Verdichten (25–53 ms für das ganze Netz), sondern das
  Neuzerlegen des Lösers nach jeder Netzänderung (110–153 ms bei 5 000–6 500 Punkten, heute in der Ruhe): Löser mit Warmstart ohne
  Zerlegung (iterativ) oder Zerlegen im Hintergrund und einwechseln. Je Bewegung heute 15–16 ms bei 5 200 Punkten, 27–29 ms bei 15 400.

**Stift-Form über Linien** (`scripts/pruefen/form-stift-kreuzung-probe.mjs`: drei Loops, in der Seite ein Stift-Kreis mit Radius 78 und
vier glatten Ankern auf den Diagonalen um die Kreuzung der beiden Ringe, er kreuzt jeden Ring zweimal):

- Die Linie liegt im Blatt bis 3,6 Einheiten (3,2 px bei 100 %) neben der Zeichnung, aus dem Kreis wird ein welliges Achteck wie in
  Florians Bild (`docs/progress/editor/form-stift-kreuzung-vorher-2026-11-08.jpg`). Die Haut bewegt sich bis 2,4 (390 Punkte über 0,5).
- **Ursache:** Die Kreuzungen werden Punkte der neuen Linie und teilen jedes gezeichnete Stück (hier in der Mitte). Die Anker behalten
  aber den Griff des ganzen Stücks (43,1 statt 21,5), die Kreuzungspunkte bekommen abgelesene Griffe; `linienAufPfad` legt die Linie
  auf diesen Pfad, die Haut folgt. Dazu liegt der Pfad in der Tiefe zwischen den Punkten nicht auf der Haut (Griffe in der
  Tangentialebene).
- **Weg (vorgeschlagen):** die gezeichneten Stücke an den Kreuzungen nach de Casteljau teilen (im Blatt dann genau die Zeichnung), die
  Tiefe der Griffe an die Haut anpassen (kleinste Quadrate längs des Stücks); was dann noch neben der Haut liegt, ist der Rest einer
  kubischen Kurve auf einer gewölbten Fläche (bei Bedarf ein Punkt mehr, „Punkte wo nötig“).

### Stand (08.11. abends): Stift-Form genau über Linien — gebaut

Florian: „ok, machen wir es so“ (Reihenfolge: zuerst die Stift-Form, dann der Löser als Beweis, dann Haut fein und live).

- **Kern `griffeAusZeichnung`** (`dicht/loops.ts`, im Fenster aus `stiftFertig` statt des Überschreibens der Ankergriffe): Jeder Punkt der
  neuen Linie (Anker, Kreuzungen, Enden eines Rings) bekommt seine Stelle auf der Zeichnung; jedes Stück des Pfads ist im Blatt genau das
  Stück der Zeichnung zwischen seinen Punkten (de Casteljau). Die Tiefe der Griffe wird nach kleinsten Quadraten an die Linie auf der
  Haut angepasst (Anfang: die Tangentialebene): je glattem Anker eine Unbekannte (die Griffe bleiben auf einer Geraden), an Kreuzungen
  je Seite eine (die alte Linie hat die Haut dort zu einem Grat gezogen), Ecken an gerade gezeichneten Stücken mit einem Drittel der
  Sehne und gemeinsam angepasst, Ecken an gebogenen Stücken danach einzeln (wie `eckenTiefe`). Ob ein Stück gerade ist, sagt die
  Zeichnung, nicht die Lage der Punkte (eine Kreuzung sitzt auf der alten Linie, bis 0,09 neben der Geraden). Passt ein Anker nicht
  (er lag nicht auf dem Körper), bleiben die abgelesenen Griffe.
- **Gemessen mit der Maus** (`form-stift-kreuzung-probe.mjs`, vorher → jetzt):

| Form | Linie im Blatt neben der Zeichnung | Haut bewegt | umgeklappt |
| --- | --- | --- | --- |
| Kreis R 78 über zwei Ringe | 3,6 Einheiten (3,2 px) → 0,03 (0,0 px) | 2,43 (390 Punkte über 0,5) → 0,13 | 0 |
| Kreis R 130 (nahe am Umriss) | → 0,03 | → 0,42 | 0 |
| Quadrat aus Ecken (`ECKEN=1`) | → 0,09 (0,1 px) | → 0,25 | 0 |
| Augen-Form ohne Kreuzungen (`form-stift-probe.mjs`) | 0,33 px → 0,34 px | unverändert | 0 |
| Ring quer über die Mitte (Front) | → 0,00 px | — | 0 |

  Die Griffe der Anker sind jetzt so lang wie ihr Stück bis zur Kreuzung (Kreis: 21,5 statt 43,1).
- **Kern-Test** `linieAufPfad.test.ts` „Stift über zwei Linien“: Kreis und Quadrat; die Gegenprobe wie bis heute (Pfad im Blatt 3,66
  neben der Zeichnung) fällt durch. Kreis: Pfad im Blatt 0,009, Haut 0,17; Quadrat 0,19 / 0,27. 103 Tests unter `src/dicht/` grün.
- **Was bleibt:** Die Haut bewegt sich beim Anlegen noch bis 0,13–0,42 Einheiten: Ein kubisches Stück folgt einer gewölbten Haut mit
  Graten an alten Linien nicht ganz. Die Grate kommen daher, dass die Kurven der ersten Loops die Kugel nicht genau treffen (drei Loops:
  Kugel bis 2,2 daneben); genauer ginge es mit Punkten wo nötig (Florians offene Wahl).
- **Verworfen (gemessen):** nur in die Tangentialebene gehoben 0,88; Kreuzungen glatt angepasst 0,59; Ecken an gebogenen Stücken mit
  den anderen zusammen angepasst (Augen-Form: 4 umgeklappte Dreiecke an der Ecke).
- **Fallen:** Die Stelle eines Punkts auf der Zeichnung nur zwischen seinen Nachbarankern suchen (die Zeichnung kann sich nahe
  kommen); ein geschlossener Loop springt über seinen ersten Anker um eine Runde (K Stücke) zurück. Ein Griff, der im Blatt null ist und
  nur in der Tiefe wirkt, verlässt die Haut an seiner Ecke: nicht frei mit den anderen anpassen.

## 9. Beweis (08.11. nachts): Form unabhängig vom Netz

Florian: „Ja, mach mit dem Löser-Beweis weiter: Form unabhängig vom Netz, Kriterien Sprung beim Loslassen höchstens ein halber
Bildpunkt, je Mausbewegung höchstens 16 ms.“

**Ursache, gemessen im Kern** (`apps/editor/scripts/pruefen/form-netzunabhaengig.ts`): Der Löser misst die Krümmung als Mittel der
Normalkrümmung über die Kantenrichtungen, gewichtet mit der Kantenlänge², und verteilt sie nach der Zahl der Nachbarn. Auf einem
gestreckten Netz sieht er vor allem die langen Kanten. Derselbe Hals, auf dem Netz beim Loslassen fertig gerechnet und auf dem
verdichteten Netz: bis 6,4 Einheiten anders. Derselbe Zug auf Startnetzen mit 6 000, 12 000 und 24 000 Dreiecken: 0,86 bzw. 3,6
gegen das feinste, ohne Ordnung.

**Gebaut** (`?gewichte=geometrie` im Fenster; Standard bleibt bis zu Florians Wort das Mittel der Nachbarn):
- `dicht/intrinsisch.ts`: intrinsische Delaunay-Triangulierung der Haut (dieselben Punkte; Kanten werden nur rechnerisch geklappt,
  Länge aus dem Kosinussatz in der aufgefalteten Raute; harte Linien werden nie geklappt), darauf Kotangens-Gewichte ≥ 0. Kosten 1,0–1,5 ms
  bei 5 000–9 000 Punkten, 2,9 ms bei 19 000.
- `HautAusKurven` mit `geometrie`: Die Krümmung wird darauf gemessen und harmonisch verteilt (Laplace–Beltrami; konjugierte Gradienten,
  vorkonditioniert mit dem einmal zerlegten Laplace des Netzes, gestartet bei der letzten Runde, 2–3 Schritte). Die Matrix der Lagen und
  die Verteilung der Punkte bleiben die mit gleichen Gewichten (dieselbe Zerlegung wie bisher, die Dreiecke bleiben gut). Gelöst wird
  der Unterschied zwischen Soll und gemessener Krümmung; wechselt er an einem Punkt das Vorzeichen, wird die Korrektur dort halbiert,
  sonst wieder bis zum vollen Schritt angehoben.
- Im Fenster: zweite Runde je Mausbewegung nur, wenn die erste unter 8 ms blieb (eine Runde ≈ 10 ms bei 5 200 Punkten).

**Netzunabhängig (Kern):**

| Prüfung | bisher | nach der Geometrie |
| --- | --- | --- |
| Hals: Startnetz 6 000 / 12 000 gegen 24 000 Dreiecke | 0,86 / 3,64 | 0,51 / 0,26 (halbiert je Verdopplung) |
| Hals: Netz beim Loslassen gegen verdichtet, beide fertig | 6,37 | 0,36 (99 % 0,17) |
| Hals: zwei feine Netze (6 200 gegen 21 000 Punkte) | 1,75 | 0,51 |
| Rüssel: zwei feine Netze (6 900 gegen 20 700 Punkte) | 16,2 (99 % 14,8) | 2,5 an der Spitze (99 % 0,32) |
| Ohr: Netz beim Loslassen gegen verdichtet | 8,0 | 1,5 |

Test `dicht/netzunabhaengig.test.ts`: Hals auf 6 000 gegen 12 000 Dreiecken, nach der Geometrie 0,52, mit gleichen Gewichten 2,52
(Gegenprobe). 104 Tests unter `src/dicht/` grün.

**Sprung beim Loslassen im Fenster** (`form-loslassen-probe.mjs`, mit der Maus, 5 222 Punkte, 30 Mausschritte; Endstand gegen den
Stand vor dem Loslassen; 0,89 px je Einheit bei 100 %):

| Zug | bisher | nach der Geometrie |
| --- | --- | --- |
| Hals (obere Kreuzung 160 hoch) | 4,92 (4,4 px) | **0,34 (0,30 px)** |
| Ohr, schneller Zug | 5,98 (5,3 px) | 8,69 (7,7 px) |
| Ohr, langsamer Zug (120 Mausschritte) | 5,79 (5,2 px) | 4,84 (4,3 px); ohne Nachteilen der Linien 1,04 |
| Rüssel (+320 / −70) | 33,85 (30 px) | 7,94 (7,1 px) |
| je Mausbewegung | 15,8–16,1 ms | **10,1–13,1 ms** (Überhang mit 6 500 Punkten 13,5–15,3) |

Das Kriterium hält der Hals, die Zeit alle Züge. Ohr und Rüssel springen weiter, aus einem Grund, den kein Löser beheben kann: Der Zug
läuft auf dem Netz vom Greifen. Am Rüssel ist es vierfach gestreckt (ein Rohr mit Radius ≈ 50 aus wenigen Punkten im Umfang ist 4–9
Einheiten eckig), an der Ohrspitze sind die Linien wenige Sehnen um eine enge Biegung. Nach dem Loslassen wird das Netz verdichtet und die
Linien werden genau nachgeteilt; der Löser zeigt dann richtig die feinere Form, das ist der Sprung. Mit dem bisherigen Löser kam dazu,
dass die Form am Netz hing (Hals). Auf gestreckten Dreiecken schätzt die Matrix mit gleichen Gewichten außerdem falsch ein, wie stark
sich die Krümmung ändert (längs der Streckung 0,1–0,4-mal, quer bis zweimal): Der Löser schwingt quer und hinkt längs nach, das Ohr bei
schnellem Zug 3,2 Einheiten hinter dem fertigen Stand. Beides verschwindet, wenn das Netz schon während des Zugs fein und gleichmäßig
bleibt. Weil die Form jetzt nicht mehr vom Netz abhängt, darf es mitten im Zug verfeinert und neu zerlegt werden, ohne dass etwas springt.
Die Zerlegung bestimmt nur, wie schnell der Löser ankommt, nicht wohin; sie kann deshalb im Hintergrund laufen und eingewechselt werden.

**Andere Proben im Fenster mit `?gewichte=geometrie`** (bisher in Klammern): Boden 0,00 unter der Ebene (0,01); Pilz mit Kante 92°
(90°); Stift-Form über Linien, Haut 0,13 (0,13); Maul dicht, 0 umgeklappt; Hin und zurück wie bisher. Schlechter: Linse mit hartem Rand,
Median 78,5° (80°), aber an 10 % der Randproben kein Knick und 14 statt 6 umgeklappte Splitter (im Bild ein sauberer Rand; offen);
Überhang (Explosion a) am Ende 20 Knicke über 60° statt 6–12, dafür 0 statt 2 umgeklappt.

**Verworfen (gemessen):** Kotangens mit geklemmten negativen Gewichten (Hals 3,3; die Dreiecke verfallen beim Zug, 14 % statt 5 %
stumpfe Kanten); nur messen, aber gleich verteilen (2,8); die Gewichte der Verteilung je Löser einfrieren (schwingt); die Korrektur zuerst
in Normalenrichtung mit dem Operator nach der Geometrie lösen (explodiert auch am Hals: die Linearisierung weiß nicht, dass sich die
Kantenlängen mitändern); feste Dämpfung 0,5–0,7 für alle Punkte (Rüssel schwingt, Ohr hinkt 3,4 nach); die Verteilung der Punkte
tangential entspannen (Dreiecke besser, 1,5 % stumpfe Kanten, aber die Form wandert 4–6 Einheiten); Schwung (überschwingt bis 58).

**Fallen:** Ein Fixpunktverfahren kann sich je Runde kaum bewegen und trotzdem weit vom Ziel sein: erst weiterrechnen lassen
(`__kurven.nachrechnen(n)`, im Probe-Skript `NACH=<Runden>`), dann urteilen. Die Bilder der Härte-Probe überschreiben sich je Lauf
(eigenen Ordner je Variante). Proben ohne Ordner legen ihre Bilder in `apps/editor/` ab.

**Vorschlag für Schritt 3 (Haut fein und live):** während des Zugs verfeinern, wo die Haut gestreckt wird oder eine Linie ungenau wird
(Teilen, Zusammenlegen, genaues Nachteilen wie nach dem Zug), das neue Netz im Hintergrund zerlegen und einwechseln, sobald es fertig
ist; nach dem Loslassen bleibt dann nichts mehr zu tun. Danach die Linse und den Überhang.

## 10. Schritt 3 (08.11. nachts): Verfeinern im Zug, Zerlegung im Hintergrund

Florian: „Ja, weiter mit Schritt 3: Netz und Linien schon während des Zugs verfeinern, Zerlegung im Hintergrund.“ Gebaut für den Löser
nach der Geometrie (`?gewichte=geometrie`; `?live=0` ohne Verfeinern, `?hintergrund=0` mit Zerlegen im Vordergrund).

**Ablauf im Fenster:**
- **Auslösen:** eine Kante der Haut länger als 2 Startkanten, oder ein Ziel einer Linie weicht von der Sehne seiner Nachbarn so weit ab,
  wie es nach dem Zug erlaubt ist.
- **Weiterziehen ohne Neuzerlegen:** Der Zug wird festgehalten und mit derselben Zerlegung weitergeführt (`HautOptionen.vorlage`). Das
  geht, weil die Matrix beim Löser nach der Geometrie nur bestimmt, wie schnell er ankommt, nicht wohin.
- **Feineres Netz:** Es wird aus diesem Stand verdichtet wie nach dem Zug (Teilen, Zusammenlegen, Linien genau). Jeder seiner Punkte
  merkt sich seine Stelle auf der alten Haut (`dicht/einbettung.ts`: nächstes Dreieck, baryzentrisch, Versatz im Rahmen des Dreiecks).
- **Hintergrund:** Die Zeilen seiner Matrix (`nurZeilen`) gehen flach an einen Worker (`src/form/zerlegen.worker.ts`).
- **Einwechseln:** Ist die Zerlegung zurück, wird mitten im Zug eingewechselt. Die Punkte des neuen Netzes werden auf der alten Haut von
  jetzt ausgewertet, die Linien behalten den Stand ihrer Punkte.

**Matrix nach Kantenlängen:** Der Löser nach der Geometrie gewichtet seine Matrix jetzt nach 1 / Kantenlänge², je Punkt höchstens
zehnfacher Unterschied zwischen den Nachbarn (ohne Begrenzung explodierte er am Ohr ohne Verdichten). Auf gestreckten Dreiecken
antwortet die Matrix so in jeder Richtung wie die Krümmung nach der Geometrie: Im Kern hinkte das Ohr 0,75 → 0,23 nach, und der Rüssel
auf dem Netz vom Greifen lag 9,2 → 1,6 neben dem feinen.

**Gemessen im Fenster** (`form-loslassen-probe.mjs`, 30 Mausschritte, 5 200 Punkte am Anfang; Einheiten, 0,89 px je Einheit bei 100 %):

| Zug | bisheriger Löser | Geometrie ohne Verfeinern | mit Verfeinern im Zug (Hintergrund) | davon Nachhinken |
| --- | --- | --- | --- | --- |
| Hals | 4,92 | 0,34 | **0,36 (0,32 px)**, 3 Wechsel | 0,22 |
| Rüssel | 33,85 | 7,94 | **1,43 (1,3 px)**, 9 Wechsel | 1,28 |
| Ohr | 5,98 | 8,69 | **3,62 (3,2 px)**, 5 Wechsel | 2,41 |

- Je Mausbewegung im Mittel 11,5–13,4 ms, höchstens 19 ms (bisheriger Löser 16 ms).
- Auslösen hält den Zug 35–52 ms an (Verdichten 18–31, Zeilen 12–17), Einwechseln 4–9 ms. Zwischen Auslösen und Einwechseln vergehen
  113–186 ms, in denen auf dem alten Netz weitergezogen wird. Im Vordergrund hielt jede Stufe den Zug 130–195 ms an.
- **Was bleibt, ist Nachhinken:** Der Löser macht je Mausbewegung eine Runde (≈ 10 ms) und kommt dabei am Ohr mit etwa 0,65–0,77 je Runde
  näher. Bei schnellem Zug hinkt die Haut deshalb hinter dem Ziel her (Ohr 2,4, Rüssel 1,3), und die Runden nach dem Loslassen holen das
  auf. Das Kriterium ½ px hält damit nur der Hals.

**Andere Proben** (`?gewichte=geometrie`): Boden 0,00; Pilz 92°; Linse 80,6° mit 2 umgeklappten Dreiecken (Beweis vom 08.11.: an 10 % des
Rands kein Knick, 14); Stift-Form 0,13; Überhang am Ende 2 statt 6–20 Knicke über 60°, 0 umgeklappt; Maul dicht; Hin und zurück wie bisher.

**Tests:** `dicht/einbettung.test.ts` (Zerlegung über Daten löst genau wie direkt; die Einbettung gibt die Punkte genau zurück und geht
mit). 106 Tests unter `src/dicht/` grün.

**Verworfen (gemessen):**
- feste volle Schritte ohne Anpassung je Punkt (Ohr 6,9, Rüssel 21,7);
- Längengewichte ohne Begrenzung (das Ohr ohne Verdichten explodierte);
- der Versatz der Einbettung längs der gemittelten Normale (Rückweg nur auf 0,009 genau);
- die Suche über zwei Nachbarringe (langsamer als das Raster).

**Offen:**
- Nachhinken im schnellen Zug: Die Runden müssten schneller werden oder schneller ankommen.
- Das Verdichten beim Auslösen könnte ebenfalls in den Worker (dann ≈ 10 statt 35–52 ms).
- Griff-Züge verfeinern noch nicht.
- Florians Wahl, ob der Löser nach der Geometrie Standard wird.

## 11. Florians drei Fälle (08.11. abends): nachgestellt, gemessen, Vorschlag für den Löser-Schritt

Florian: „Ja, stell meine drei Fälle nach und miss sie: Hörner mit Griffspiel bis schwarz, Aufblasen in Stufen, grobes kleines Detail.
Danach schlag mir den Löser-Schritt mit Kriterien vor.“ Seine Bilder: `docs/progress/editor/form-ohren-aufblasen-florian-2026-11-08.webp`
(Hörner, Aufblasen), `form-detail-grob-florian-2026-11-08.webp` (grobes Detail); das Bild mit den schwarzen Stellen (26 284 Punkte,
126 ms je Zug) liegt nur im Chat.

**Probe:** `apps/editor/scripts/pruefen/form-drei-faelle.mjs` (Fenster, mit der Maus; `FALL=hoerner|detail`, `DICK=1` breite Hörner mit
Einfluss O, `KURVEN_URL` für Varianten). Je Zug: Zeit je Mausbewegung, Punkte, Knicke über 60°, umgeklappte Dreiecke und **umgestülpte**
(neu: die Außenseite zeigt ins Innere, Strahl-Parität längs der drei Achsen; das sind die schwarzen Stellen), ob die Linie selbst faltet,
und jede Änderung nach dem Loslassen (wie weit, wo, Volumen). 0,89 px je Einheit bei 100 %.

### Fall 1: Hörner, mit dem Griff gespielt, bis schwarz

Aufbau: Kugel, drei Loops, auf dem senkrechten Ring zwei Punkte 170 nach oben außen (mit O, breite Hörner wie in Florians Bild), dann elf
Züge am Griff der Spitze (länger, hin und her gedreht, in Front und Seite), jeder einzeln losgelassen. Bilder
`docs/progress/editor/form-drei-hoerner-{1-hinaus,2-griff10,3-griff11-schwarz}-2026-11-08.jpg`.

- Die ersten neun Züge (Griff bis 71 lang): nichts Schwarzes, nach dem Loslassen bewegt sich die Haut noch 0,5–5,6 Einheiten.
- **Griff 10** (Front, Griff 71 → 107 lang, −120° gedreht): Die Linie kehrt an der Spitze um (Knick 144° von einer Probe zur nächsten)
  und kreuzt sich in der Front selbst.
- **Griff 11** (Seite, −90° gedreht): Die Haut springt im Zug bis 142 Einheiten. 648 Dreiecke sind umgestülpt (2,9 % der Fläche), am
  hinteren Teil der Hörner (x 120–160, y 160–200), wie in Florians Bild.
- **Nach dem Loslassen** wächst die schwarze Stelle in drei Schritten weiter (18,2 → 2,1 → 1,2 Einheiten; 2,9 → 6,1 % der Fläche,
  Volumen −6,3 %), und das Verdichten setzt dort auf einmal 900 Punkte dazu (6 556 → 7 474). Je Mausbewegung blieb es hier bei 20 ms;
  Florians 26 000 Punkte kamen mit weiteren Zügen.
- **Gegenprobe ohne Verdichten** (`?verdichten=0`): Die Falte entsteht genauso (290 Dreiecke, 2,2 %), und beim Loslassen bewegt sich die
  Haut trotzdem um 28 Einheiten, das Volumen fällt um 8,7 %. Die umgestülpte Stelle wächst also schon durch die Rechenrunden selbst.
- **Ursache:** (a) Ein sehr langer, gedrehter Griff biegt die Linie an der Spitze zurück; einer Linie, die umkehrt, kann die Haut nur
  gefaltet folgen. (b) Der Löser nimmt die Krümmung an den Linien so, wie die Haut sie gerade hat, und drückt längs der Normale, die die
  Haut gerade hat. Für eine umgestülpte Stelle sind beide „richtig“: Sie bestätigt sich selbst und wächst mit jeder Runde. (c) Das
  Verdichten teilt in der verzerrten Falte weiter: daher die vielen Punkte und das Tempo.
- Mit `?gewichte=geometrie` faltete die Linie in diesem Ablauf nicht (größter Knick 98°) und es wurde nichts schwarz; die Züge laufen
  dort aber anders, das ist kein Vergleich Zug für Zug.

### Fall 2: Aufblasen in Stufen

- **Ohne Griffspiel** (Hörner 170 hinaus, Standard): Nach dem Loslassen bewegt sich die Haut in zwei Schritten 17,9–20,0 und 1,5–3,3
  Einheiten (rund 0,6 s danach), das Volumen fällt um 5 % (die Hörner werden etwas kleiner). **Ohne Verdichten nur 1,5.** Die Stufen sind
  also das Verfeinern nach dem Loslassen: Beim heutigen Löser hängt die Form vom Netz ab.
- **Mit `?gewichte=geometrie`:** 11,4 Einheiten nach dem Loslassen, hier vor allem Nachhinken (170 Einheiten in 30 Mausschritten).
- **Mit Falte:** siehe Fall 1, die schwarze Stelle wächst in drei Schritten.

### Fall 3: grobes kleines Detail

Ohr aus dem senkrechten Ring (70 hinaus), dann schmaler gezogen. Am Ohr gegen den Rumpf, nach dem Loslassen:

| | Punkte am Ohr | Kante im Mittel (Rumpf 8,3) | Drehung der Normale je Kante: 90 % / größte (Rumpf 4° / 6°) |
| --- | --- | --- | --- |
| Standard | 186 | 9,0 | 22,5° / 46,7° |
| schmaler gezogen | 179 | 8,9 | 22,6° / 41,8° |
| `?genauHaut=1` | 549 | 5,4 | 12,3° / 27,5° |
| `?gewichte=geometrie` | 280 | 9,7 | 16,1° / 34,6° |

- Am Ohr sind die Kanten so lang wie am Rumpf (sogar etwas länger), obwohl es viel stärker gebogen ist: Jede Kante dreht die Fläche dort
  fünfmal so stark. Das sind die Facetten und zackigen Farbstufen. Das Verdichten richtet sich nur nach der Länge.
- Schmaler gezogen legt das Zusammenlegen am Ohr ein paar Punkte zusammen (186 → 179).
- `genauHaut` halbiert die Drehung je Kante nur am Ohr (Rumpf unverändert); weite Züge wurden damit am 08.11. schlechter (Rüssel 108
  statt 31 Knicke, 46 statt 0 umgeklappt), weil sich die Form beim heutigen Löser mit dem Netz ändert. Bilder
  `docs/progress/editor/form-drei-ohr-nah-{standard,genauhaut}-2026-11-08.jpg`.

### Vorschlag: Löser-Schritt „Form unabhängig vom Netz, sofort, dicht wo nötig, nie umgestülpt“

**Teil 1 — Form unabhängig vom Netz und sofort** (der unsichere Teil, als Beweis):
- Weg: Die Krümmung wird weiter nach der Geometrie gemessen und verteilt (bewiesen: gleiche Form auf grobem und feinem Netz). Neu: Auch die
  Matrix, mit der gelöst wird, kommt aus der Geometrie und wird im Hintergrund nachgeführt (der Worker aus Schritt 3). Der Löser sollte
  dann wie heute in ein, zwei Runden ankommen statt in vielen (das ist das Nachhinken). Zu beweisen.
- Kriterien: Nachjustieren nach dem Loslassen ≤ ½ px (Hals, Ohr, Rüssel, Hörner 170; heute 4,9 / 6,0 / 33,9 / 19,4 Einheiten); kein
  Nachhinken: zwei Bilder nach der letzten Mausbewegung steht die Form auf ½ px; je Mausbewegung ≤ 16 ms, kein Halt über 33 ms.
- Abbruch: Hält das Nachhinken nach zwei Arbeitstagen nicht bei ≤ 16 ms, wird angehalten und berichtet (dann wird die Frage nach einem
  schnelleren Kern, WebAssembly oder nativ, echt).

**Teil 2 — dicht, wo es gebraucht wird** (erst nach Teil 1):
- Weg: Eine Regel für die Dichte: Eine Kante wird geteilt, wo die Fläche zwischen ihren Enden weiter als eine feste Toleranz von der Sehne
  abweicht, und zusammengelegt, wo sie danach höchstens halb so weit abweicht. Sie ersetzt die drei Regeln von heute (Teilen über 1,75,
  Zusammenlegen unter ½ Startkante, Linien genau).
- Kriterien: Drehung der Normale je Kante überall ≤ 8° (Ohr heute 22,5°, Rumpf 4°); an den Prüfformen höchstens 1,5-mal so viele Punkte
  wie heute; Rüssel, Überhang und Fressen-Pose nicht schlechter als heute.

**Teil 3 — nichts bleibt umgestülpt:**
- Weg: Die Richtung, in die die Haut gewölbt wird, kommt von den Linien (sie wissen, wo außen ist), nicht von der Haut selbst; eine
  umgestülpte Stelle kann sich dann nicht mehr bestätigen. Dazu eine Entscheidung für Florian: Wenn ein Griff die Linie zum Umkehren
  bringt, wird die Linie rot, oder der Griff lässt sich nicht so weit ziehen.
- Kriterien: Hörner mit Griffspiel (diese Probe): keine umgestülpte Fläche außer genau dort, wo sich eine Linie selbst kreuzt; nach den
  elf Griffzügen höchstens 1,5-mal so viele Punkte wie vorher; je Mausbewegung ≤ 16 ms.

**Nicht schlechter** (vorhandene Proben): Boden, Pilz, Linse, Überhang, Rüssel, Hin und zurück, Stift-Form, Maul, Fressen-Pose.

## 12. Teil 1 als Beweis (08.11. abends): angehalten, die Ursache liegt im Modell

Florian: „Ja, fang mit Teil 1 als Beweis an: Form unabhängig vom Netz und sofort, mit den Kriterien und dem Abbruch nach zwei Tagen von
der Planseite.“ Geplant war: Die Matrix wird nach der Geometrie gebaut und im Hintergrund nachgeführt, dann kommt der Löser in ein, zwei
Runden an.

**Gemessen** (Kern, `apps/editor/scripts/pruefen/form-netzunabhaengig.ts`, Ohr, 30 Mausschritte mit je einer Runde wie im Fenster;
Nachhinken = Stand nach dem letzten Mausschritt gegen fertig gerechnet, Einheiten):

| Löser | Nachhinken | nach zwei Runden | Form hängt am Netz |
| --- | --- | --- | --- |
| gleiche Gewichte (Standard) | 0,38 | 0,14 | 7,96 |
| nach der Geometrie (heute) | 1,35 | 0,38 | 1,81 |
| dazu Matrix nach der Geometrie | 3,65 | 1,33 | 1,30 |
| dazu im Hintergrund nachgeführt (alle 9 Schritte) | 4,40 | 2,15 | 1,27 |

Die Matrix nach der Geometrie macht das Nachhinken größer, nicht kleiner.

**Ursache, Runde für Runde gemessen** (`SCHWINGEN=<Runden>`, `FEST=1` volle Schritte ohne Dämpfung, `QFEST=1` Krümmung an den Linien fest):
- Heute misst der Löser die Krümmung an den Linien jede Runde an der Haut. Ungedämpft wächst dann ab Runde 3 ein Fehler um das 1,7-Fache je
  Runde (vorn unten an der Kugel); mit der Matrix nach der Geometrie schwingt er mit dem Faktor −2,4. Deshalb braucht der Löser die Dämpfung,
  und die Dämpfung ist das Nachhinken.
- Bleibt die Krümmung an den Linien fest, steht der Löser nach drei Runden: 0,11 → 0,05 → 0,03 → 0,02.
- Der Löser mit gleichen Gewichten pendelt am Ohr dauerhaft um etwa 0,3 hin und her.
- **Kugel mit einem Ring** (`apps/editor/scripts/pruefen/form-kuppel-probe.ts`): Die obere Kuppel 25 % höher gestellt bleibt bei 163 statt
  150; 25 % flacher endet bei 155. Unberührt schwingt die Form in den ersten Runden um ±50 % und bleibt bei 155,7 stehen. Nach der Geometrie
  ähnlich (154 bzw. 146).

**Befund:** Misst der Löser die Krümmung an einer Linie an der Haut selbst, legen die Linien die Form zwischen sich nicht fest. Eine höhere
Kuppel misst an ihrem Rand mehr Krümmung, verteilt sie und bleibt höher; eine flachere ebenso, und auch eine umgestülpte Kuppel passt zu sich
selbst. Daraus folgen alle drei Fälle aus Abschnitt 11: Der Löser hat keinen festen Punkt, auf den er zuläuft, er schwingt oder treibt und
braucht Dämpfung (Nachhinken); nach dem Loslassen bewegt sich die Form in Stufen; eine umgestülpte Stelle bleibt und wächst. Schneller rechnen
(WebAssembly, nativ) ändert daran nichts.

**Verworfen (gemessen):** Matrix nach der Geometrie (Nachhinken 1,35 → 3,65) und im Hintergrund nachgeführt (4,40); die Krümmung an den Linien
über eine Scheibe gemittelt (Radius 10: wächst weiter; Radius 20: stabil, aber nur 0,75–0,8 je Runde, und die Form ändert sich um 8,6);
Anderson-Beschleunigung (erst 0,02, dann schaukelt es sich wieder auf; mit Neustart bei wachsendem Schritt läuft der Löser auseinander); eine
weiche Bindung an die Messung wie bei FiberMesh (läuft schneller auseinander). Der Code dieser Versuche ist wieder entfernt; geblieben sind
die zwei Schalter für die Messung (`messreiheSetzen` in `dicht/ausKurven.ts`).

**Vorschlag: Teil 1 neu, die Krümmung an den Linien kommt aus den Linien selbst.**
- Wie stark sich die Haut an einer Linie wölbt, folgt daraus, wie sich die Linie biegt (ihr Bézier-Pfad, gegen die Normale der Haut
  gemessen). Quer zur Linie gilt „so rund wie möglich“ (gleich stark), außer eine kreuzende Linie sagt etwas anderes. Das ist die „Krümmung
  mit Richtung“ vom 06.11., aber ohne Gedächtnis.
- Dann legen die Linien die Form fest (Kurven als Wahrheit). Der Löser sollte nach wenigen Runden stehen wie mit fester Krümmung (drei
  Runden), und die Form hängt nicht am Netz, weil der Pfad genau ist. Ob eine umgestülpte Stelle dann von selbst zurückfindet, prüft der
  Beweis.
- Was sich ändern kann: Formen zwischen wenigen Linien (Kugel mit einem Ring, Rüssel, Hammer, Boden, Pilz) sind neu zu prüfen. Quer zu einer
  einzelnen Linie ist „so rund wie möglich“ eine Annahme.
- Kriterien wie Teil 1, dazu: Die Kugel mit einem Ring bleibt aus jeder Startkuppel eine Kugel (150 ± 0,5); Boden, Pilz, Linse, Überhang,
  Rüssel, Hammer und Fressen-Pose nicht schlechter. Zeit: der Rest der zwei Tage.

## 13. Teil 1 neu (09.11.): Krümmung aus den Linien — fünf Anläufe, angehalten

Florian: „Ja, mach mit Teil 1 neu weiter: Krümmung an den Linien aus den Linien selbst, quer so rund wie möglich, ohne Gedächtnis …“ und
nach seiner Rückfrage („Ich dachte, wenn sich das Mesh beim Zug exakt immer neu aus den Linien entwickelt und dabei live verdichtet …,
haben wir weder Ecken noch ein Springen nach dem Loslassen“): „nein du kannst anfangen“.

**Gebaut und gemessen** (Kern, im Löser „aus den Kurven“ als Schalter, nach der Messung wieder entfernt; Kugel mit einem Ring
`form-kuppel-probe.ts`, Ohr `form-netzunabhaengig.ts`):

| Anlauf | Kugel mit einem Ring | Ohr |
| --- | --- | --- |
| 1. quer so stark wie längs (Normalkrümmung der Linie) | jede Startkuppel läuft auf dieselbe Form zu (141 statt 150) | läuft am Ring auseinander (bis 6,8 je Runde) |
| 2. längs aus der Linie (jetzt), quer von der Haut beim Anfassen, am Punkt der Linie gemessen | fällt zusammen (54) | — |
| 3. dasselbe, quer an den Nachbarn gemessen | läuft auseinander | 0,75–0,8 je Runde, Nachhinken 4,9, Netz 6,8 |
| 4./5. quer aus einem Paraboloid im Umkreis von 1,5 bzw. 4 Kanten | schrumpft (127 nach 20 Runden) | läuft im Zug auseinander |

**Befunde:**
- **Die Krümmung längs einer Linie aus ihrem Verlauf ist genau:** am Ring der Kugel 1,00 des Werts (0,87–1,20).
- **Quer zur Linie trägt die Linie selbst nichts.** „Quer so stark wie längs“ gilt auf der Kugel, aber nicht am Ansatz eines Ohrs (der Ring
  biegt nach innen, quer ist der Körper rund: ein Sattel, daraus wird eine tiefe Delle) und nicht an einem Rüssel, den nur gerade
  Seitenlinien halten (er wird flach). Die Krümmung quer muss von kreuzenden Linien kommen, von der Haut (Gedächtnis) oder aus einer Regel
  wie „aufblasen nach der Dicke“.
- **Die Haut an den Punkten einer Linie misst der Löser falsch** (`form-kap-ring.ts`): Auf der Kugel liegt die Krümmung dort bei 9–225 %
  des Werts (gleiche Gewichte im Mittel 50 %, nach der Geometrie 78 %), daneben bei 99–106 %; nach dem üblichen Verdichten noch 16–134 %.
  Die Haut liegt dabei auf der Kugel (±0,15): Auf den kurzen Kanten neben der eingesetzten Linie überdeckt das Rauschen der Lagen die
  Krümmung. Ein Paraboloid über 4 Kanten trifft sie auf 2,5 %. Der heutige Löser baut seine Krümmung genau aus diesen Werten an den Linien:
  ein Grund für Treiben, Dämpfung und Sprünge.
- **Eine Kuppel über genau einem Ring am Äquator ist ein Grenzfall:** Eine Halbkugel ist die höchste Kuppel mit dieser Krümmung; schon 2 %
  zu wenig lassen sie in eine flache Kuppel kippen, 17 % zu viel sind mit keiner Kuppel erfüllbar. Als Kriterium ungeeignet.

**Stand:** Keine Variante erfüllt die Kriterien; der Löser ist unverändert (Code der Versuche entfernt). Entscheidung bei Florian
(Bericht im Chat): ein Weg mit dem Löser, den er bevorzugt (gleiche Gewichte), sauberen Dreiecken an den Linien und einem Netz, das sich nur
während des Zugs verdichtet, oder ein grundsätzlicher Weg, bei dem jede Linie ihre Rundung quer als eigene Angabe trägt.

## 14. Recherche (09.11.): FiberMesh, Monster Mash und die fehlende Angabe an den Linien

Florian lehnte beide Wege aus Abschnitt 13 ab („klingen nach viel Nachjustieren“) und bat um eine gründliche Recherche. Ergebnis:
[`docs/research/2026-11-09-fibermesh-monstermash-richtung.md`](../research/2026-11-09-fibermesh-monstermash-richtung.md).

- FiberMesh hat dieselben Schwächen: Runden, Gedächtnis, Neuvernetzen nach dem Loslassen, nicht ganz netzunabhängig. Mit Kurven ohne
  Normalen ist die netzunabhängige Lösung dort selbst instabil. Monster Mash umgeht die Frage (2D-Zeichnung aufblasen, dann eine
  Ruheform verformen).
- Wurzel (Schneider & Kobbelt 2001): Die Gleichung, die FiberMesh und unser Löser rechnen (ΔH = 0), braucht an den Linien Lage **und
  Richtung** (Normale). Dann ist die Form eindeutig, Kugel und Zylinder sind genaue Lösungen, und Verfeinern ändert nur die Näherung.
  Unser Löser gibt nur die Lage vor und misst den Rest an der Haut. Daraus folgen Mehrdeutigkeit, Nachhinken, Stufen und schwarze
  Löcher.
- Vorschlag: **Linien mit Richtung**, von selbst aus dem Liniennetz:
  - an Kreuzungen senkrecht auf beiden Tangenten;
  - auf der Mittelebene aus der Symmetrie;
  - dazwischen gleichmäßig gedreht;
  - einsame Linien wie gezeichnet.
- Ein naiver Schnellversuch (nur die Normale in der Zeile des Linienpunkts tauschen) hielt nicht: Kuppel ×1,25 → 199, ×0,8 pendelt um
  145. Die Richtung muss in die Krümmungsmessung je Seite.
- Beweis mit Kriterien und Abbruch in Abschnitt 6 der Recherche. Entscheidung bei Florian.

## 15. Beweis „Linien mit Richtung“ (09.11.): nach Tag 1 angehalten

Florian: „Ja, bau den Beweis „Linien mit Richtung“ nach Abschnitt 6 der Recherche, im Browser wie bisher, mit Kriterien und Abbruch nach
zwei Tagen.“ Gebaut hinter `kurven.html?richtung=1` (ohne den Schalter bitgleich, 107 Tests grün).

**Gebaut:**
- **Richtung aus dem Liniennetz** (`dicht/richtung.ts`, Test `richtung.test.ts`):
  - an Kreuzungen senkrecht auf beiden Tangenten;
  - auf der Mittelebene aus der Symmetrie;
  - dazwischen ein Rahmen längs der Linie, der fehlende Winkel nach der Bogenlänge verteilt;
  - Linien ohne Kreuzung nehmen die Haut beim Anfassen.
  - Kugel mit drei Loops: 644 Linienpunkte, höchstens 0,52° neben der Normale der Kugel (Kriterium 1°). Die Tangente kommt aus einer
    Parabel über eine Kantenlänge je Seite; aus drei Punkten kippte sie bis 1,8°.
- **Löser „aus den Kurven“ mit Richtung** (`dicht/ausKurven.ts`):
  - Krümmung je Seite der Linie über drei Kantenlängen, mit Neigung gegen die vorgegebene Ebene angepasst; die Seiten kommen aus dem Fächer
    der Dreiecke um den Punkt.
  - Jede Seite verteilt ihren Wert in ihr Feld.
  - Die Punkte neben der Linie bekommen je Runde ein Ziel ohne Neigung (eigene Zeile).
  - Im Maß des Lösers die Normalen nach Max (`hautNormalenMax`).

**Gemessen:**
- **Die Form ist mit Richtung eindeutig** (Kugel mit einem Ring, `form-kuppel-probe.ts`): Kuppel ×1,25 → 170, 161, 156 … nach 10 Runden
  150,5, dann 149,8–150,2; ×0,8 → nach 5 Runden 150,0. Ohne Richtung bleibt sie bei 163. Das hat keine Variante vorher geschafft.
- **Nebenbefund: Das Maß des Lösers misst die Krümmung heute 8 % zu flach** (`form-normalen-mass.ts`; Kugel: Mittel 0,917, an einzelnen
  Punkten 0,73). Das liegt an den nach Fläche gemittelten Normalen; mit den Normalen nach Max misst es 0,999 (0,99–1,01). Mit genauen
  Werten an den Linien und dem alten Maß blähte sich sogar die exakte Kugel auf; mit den Normalen nach Max bleibt sie über 40 Runden bei
  149,6–150,2.
- **Messung an den Linien:** Nur die direkten Nachbarn lagen bis zum 260-Fachen daneben (eingesetzte Linie: 4–6 Nachbarn, sehr kurze
  Kanten). Eine Umgebung von drei Kantenlängen trifft die Kugel auf 3 %.
- **Die Richtung nur über die Messung wirken lassen (wie in der Arbeit) schaukelt sich auf:** Die Rückkopplung ist umso stärker, je größer
  das Feld hinter der Linie ist, am Ring etwa zwölffach (stabil wäre unter zwei). Deshalb die eigene Zeile für die Punkte neben der Linie.
- **Nach der Geometrie** ist es stabil, aber nur gedämpft und langsam: Der Fehler halbiert sich etwa alle 10 Runden. Volle Schritte
  explodieren.
- **Hörner-Zug im Kern** (`form-richtung-horn.ts`, ohne Verdichten): erst nach fünf Schutzregeln stabil über 170 Einheiten. Die Regeln:
  - Normalen-Filter: Um eine enge Hornspitze reichte die Umgebung auf die andere Seite, Werte bis 921.
  - Halt der Neigung und Grenze je Runde: Die Neigung lief auf 16.
  - Mindestbreite quer zur Linie: Nach dem Verfeinern hatte eine Seite fast nur Linienpunkte, Wert 15 507.
  - Halt bei der Krümmung der Nachbarn.
  - Leere Winkel zwischen kreuzenden Linien überspringen: Werte bis 10¹⁶.
  - Nach dem Verfeinern springt die Haut um 27 Einheiten (ohne Richtung 15–20) und kriecht danach weiter (28 → 38 in 30 Runden).
- **Florians Hörner-Fall im Fenster** (`form-drei-faelle.mjs` mit `?richtung=1`):
  - Je Mausbewegung 13–16 ms.
  - Hinausziehen: 12 Dreiecke umgestülpt.
  - Nach dem Loslassen bläst sich die Haut weiter in Stufen auf (24,5 / 25,4 / 7 / 5,5 Einheiten, wie ohne Richtung 18–20).
  - **Schlechter als heute:** umgestülpte Stellen schon ab Griff 1 (0,2–0,7 % der Fläche), Griff 8 4,3–5,9 %, Griff 10 6,8–7,5 %, danach
    läuft die Haut weg (heute: bis Griff 9 sauber, Griff 11 2,9 %).

**Bilanz:**
- Die Aussage der Recherche stimmt: Mit Richtung ist die Form eindeutig (Kuppel). Die Richtung lässt sich von selbst aus dem Liniennetz
  gewinnen.
- Die Rechnung, die die Arbeit dafür nimmt (Krümmung an den Linien je Seite messen), ist auf unserem Netz nicht robust. Sie braucht schon
  sechs Schutzregeln und ist im echten Fall schlechter als heute.
- Den Sprung nach dem Verfeinern löst sie mit gleichen Gewichten nicht (die Form hängt am Netz). Nach der Geometrie wird sie zu langsam.
- Wiederkehrendes Muster (Teil 1, Teil 1 neu, hier): Die schwache Stelle ist jedes Mal, die Krümmung an den Linien in jeder Runde an der Haut
  zu messen.
- Abbruch nach Tag 1, weil Florians Fall schlechter wird und die Regeln wachsen (Arbeitsregel: ab der dritten neuen Regel die Struktur
  prüfen).

**Bleibt (hinter dem Schalter, Wissen):**
- `richtung.ts` mit Test;
- die Normalen nach Max;
- die Proben `form-kuppel-probe.ts` (RICHTUNG, SOLL, G1 …), `form-richtung-horn.ts` (NACH, DIAG, GEWICHTE),
  `form-richtung-netz.ts`, `form-richtung-seiten.ts`, `form-richtung-ablauf.ts`, `form-normalen-mass.ts`;
- `form-netzunabhaengig.ts` mit RICHTUNG;
- `form-drei-faelle.mjs` bricht ab, wenn die Haut wegläuft.

**Wege danach (Entscheidung bei Florian):**
- (a) Die Normalen nach Max allein im heutigen Löser prüfen: Das Maß misst heute 8 % zu flach und hängt von der Form der Dreiecke ab. Das
  könnte einen Teil des Sprungs nach dem Verfeinern erklären. Kurze Messung, keine neue Regel.
- (b) Ein letzter struktureller Beweis: die Krümmung an den Linien nicht messen, sondern als Unbekannte in einem gemeinsamen System mit den
  Lagen und der Richtung lösen. Ungewiss, etwa zwei Tage.
- (c) Beim heutigen Löser bleiben und die Kraft auf die Bedienung legen.

## 16. Weg a (09.11.): Normalen nach Max allein im heutigen Löser

Florian: „Weg a: Prüf die Normalen nach Max allein im heutigen Löser (ohne Richtung): Sprung nach dem Loslassen, Hörner mit Griffspiel,
Kuppel. Keine neuen Regeln.“ Schalter `HautOptionen.maxNormalen`, im Fenster `kurven.html?maxnormalen=1` (ohne bitgleich). Heute und mit
Max je am selben Tag gemessen.

| Messung | heute | Normalen nach Max |
| --- | --- | --- |
| Kuppel ×1,25 nach 40 Runden (`form-kuppel-probe.ts`) | oben 163,5, unten −141,7 | oben 137,4, unten −160,4, wandert weiter |
| Kugel unberührt nach 40 Runden | 155,7 / −150,3 | 131,8 / −169,0, wandert weiter |
| Hals: Sprung nach dem Verfeinern (`form-netzunabhaengig.ts`) | bis 6,34 (Mittel 1,10) | bis 6,14 (Mittel 0,97) |
| Hals: Nachhinken letzter Schritt / zwei Runden danach | 0,06 / 0,03 | 0,10 / 0,06 |
| Rüssel: Sprung nach dem Verfeinern | bis 35,5 (Mittel 3,95) | bis 37,2 (Mittel 4,07) |
| Rüssel: Nachhinken letzter Schritt / zwei Runden danach | 1,58 / 0,94 | 0,81 / 0,19 |
| Fenster, Hörner hinaus: Sprung nach dem Loslassen | 20,0 + 3,3 (Volumen −5,6 %) | 21,4 + 2,3 (Volumen −5,5 %) |
| Fenster, Griff 1–10: umgestülpt | 0–56 Dreiecke (höchstens 0,1 %) | 0–50 (Griff 1–5: 0) |
| Fenster, Griff 11: umgestülpt vor / nach dem Setzen | 19,8 % / 8,7 % | 13,6 % / 3,9 % |
| Fenster, Griff 11: Sprung nach dem Loslassen | 31,7 (Volumen +10,7 %) | 43,7 (Volumen +12,1 %) |
| je Mausbewegung | 15,9–17,7 ms | 16,0–18,6 ms |

**Bilanz:**
- Kein Hebel gegen das Aufblasen nach dem Loslassen: Der Sprung nach dem Verfeinern bleibt gleich groß. Er kommt aus den gleichen Gewichten
  (die Form hängt am Netz), nicht aus den Normalen.
- An der Kuppel wird es schlechter: Gegen die Mehrdeutigkeit hilft das genauere Maß nicht, die Form wandert sogar weiter.
- Etwas besser: das Nachhinken am Rüssel (halb so viel) und die schwarzen Stellen bei Griff 11 (13,6 statt 19,8 %). Dafür springt es dort
  nach dem Loslassen stärker. Je Mausbewegung etwa 1 ms mehr.
- Nicht als Standard übernommen; der Schalter bleibt zum Ausprobieren. Gegen den Sprung hat bisher nur die Messung nach der Geometrie mit
  Verfeinern im Zug gewirkt (Abschnitt 10: Hals 0,36, Rüssel 1,4); ihr Nachteil war das Nachhinken. Beide Schalter zusammen
  (`?gewichte=geometrie&maxnormalen=1`) sind nicht gemessen.

## 17. Warum das verfeinerte Netz eine andere Form annimmt (09.11.)

Florian: „was ich nicht ganz verstehe, ist, warum das verdichtete Mesh überhaupt eine andere Form annimmt. Das ganze sollte doch komplett
unsichtbar sein, außer an den Kanten der langen Flossen oder Rüssel … und da sollte es ja einfach nur abrunden, aber in exakt der gleichen
Form.“

**Antwort:** Er hat recht, so muss es sein. Bei uns ist es nicht so, weil der Löser die Krümmung nicht misst, sondern aus der Anordnung der
Dreiecke schätzt: wie weit ein Punkt über dem Mittel seiner Nachbarn steht, durch das mittlere Kantenquadrat. Jeder Nachbar zählt gleich,
ob nah oder fern; das Ergebnis hängt davon ab, wie das Netz gerade aussieht.

**Gemessen** (`form-mass-netz.ts`): Hörner 170 hinaus, dann verfeinert wie nach dem Loslassen. Verglichen werden nur die alten Punkte, die
das Verfeinern nicht bewegt, also dieselbe Fläche mit einem anderen Netz drumherum.

| Bereich | Dreiecke gestreckt | Maß heute (Mittel) | je Punkt | nach der Geometrie (Mittel) | je Punkt |
| --- | --- | --- | --- | --- | --- |
| Rest | 1,77 → 1,62 | 0,526 → 0,564 (+7 %) | 14 % | 0,796 → 0,807 (+1,4 %) | 7,5 % |
| Horn | 1,83 → 1,68 | 1,148 → 1,239 (+8 %) | 11 % | 1,583 → 1,620 (+2,3 %) | 4,8 % |

- Auf derselben Fläche liest das heutige Maß nach dem Verfeinern 7–8 % mehr Krümmung. Der Löser biegt die Haut, bis seine Schätzung wieder
  zu den Linien passt. Das ist die Stufe nach dem Loslassen, und jeder weitere Verfeinerungsdurchgang gibt die nächste.
- Das heutige Maß liest diese Fläche außerdem um ein Drittel flacher als das nach der Geometrie (0,53 gegen 0,80). In sich ist es stimmig
  (die Formen sehen rund aus), aber es ist an das Netz gebunden.
- FiberMesh hat dieselbe Schwäche und schreibt sie selbst (gleich gewichteter Laplace, nicht ganz unabhängig vom Netz).
- Mit dem Maß nach der Geometrie wäre Verfeinern nur Abrunden: Hals 0,36 statt 6,4 Einheiten (Abschnitt 9/10).
- Dort hinkt es heute nach, weil der Löser nach der Geometrie misst, die Lage aber mit der einfachen Matrix rechnet. Deshalb nähert er sich
  in gedämpften Schritten an. Messen und Rechnen müssten dasselbe Maß benutzen.

## 18. Beweis „gleiches Maß beim Messen und Rechnen“ (09.11.): am ersten Tag angehalten

Florian: „ja“ auf meine Frage: „Soll ich den Löser als Beweis so umbauen, dass er mit demselben geometrischen Maß misst und rechnet?
Kriterien wären: Verfeinern ändert die Form höchstens um einen halben Bildpunkt, kein Nachhinken, höchstens 16 ms je Mausbewegung,
Abbruch nach zwei Tagen.“

**Gebaut und wieder entfernt:** Die Matrix der Lagen kommt aus denselben Kotangens-Gewichten der intrinsischen Triangulierung wie die
Messung (beim Anlegen gerechnet), dazu volle Schritte ohne Dämpfung.

**Gemessen im Kern** (`form-netzunabhaengig.ts`, Einheiten, 0,89 px je Einheit). Nachhinken heißt: Stand nach dem letzten Mausschritt
gegen fertig gerechnet. Sprung heißt: Netz beim Loslassen gegen verfeinert, beide fertig gerechnet.

| | Nachhinken | Sprung | je Mausschritt (2 Runden) |
| --- | --- | --- | --- |
| Hals, gleiche Gewichte (Standard) | 0,06 | 6,34 | 18,2 ms |
| Hals, nach der Geometrie (heute, gedämpft) | 0,02 | 0,37 | 21,1 ms |
| Hals, gleiches Maß | 2,87 | 1,78 | 26 ms |
| Rüssel, gleiche Gewichte | 1,58 | 35,5 | |
| Rüssel, nach der Geometrie | 1,06 | 1,70 | |
| Rüssel, gleiches Maß | 29 | 28,6; auf dem feinen Netz läuft die Haut weg | |

- Das gleiche Maß macht es schlechter. Meine Erklärung am Ende von Abschnitt 17 war falsch: Nicht der Unterschied zwischen Messen und
  Rechnen bremst den Löser. Das stand schon in Abschnitt 12 (Matrix nach der Geometrie: Nachhinken 1,35 → 3,65); ich hätte es vor dem
  Vorschlag nachlesen müssen.
- Im Kern hält der heutige Weg nach der Geometrie am Hals beide Kriterien (Sprung 0,33 px, Nachhinken 0,02), am Rüssel nicht (1,5 px,
  Nachhinken 1,06).

**Florians Hörner-Fall im Fenster, heutiger Weg nach der Geometrie** (`form-drei-faelle.mjs` mit `?gewichte=geometrie`, Verfeinern im Zug;
in Klammern der Standard aus Abschnitt 16):

| Zug | nach dem Loslassen bewegt | umgestülpt | je Mausbewegung |
| --- | --- | --- | --- |
| Hörner 170 hinaus | 4,0 + 0,8 + 0,1, zusammen 4,6 (20,0 + 3,3) | 0 | 13,8 ms (15,9–17,7) |
| Griff 1–5 | 0,4–2,0 | 0–2 Dreiecke | 12,4–14,0 ms |
| Griff 6–9 | 2,7–7,6 | bis 36 Dreiecke (unter 0,1 % der Fläche) | 13,0–15,1 ms |
| Griff 10 (Griff 107 lang, −120°) | 16,9, dann 12,7 zurück (Volumen +5,0 %, dann −3,5 %) | im Zug 112 (0,1 %), danach 12 | 15,1 ms |
| Griff 11 | 11,6 + 5,0 + 1,4 + 0,6, zusammen 16,8 (31,7) | 16–18 (Standard: 19,8 % der Fläche) | 19,7 ms (max 25) |

- Viel besser als der Standard: kaum schwarze Stellen, ein Fünftel des Aufblähens nach dem Loslassen.
- Das Kriterium hält es nicht: Nach dem Loslassen bewegt sich die Haut noch 0,4–17 Einheiten, bei Griff 10 schwingt sie einmal hin und zurück.
