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
