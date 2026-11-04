# Phase 0, Beweis 1: Kern-Tempo und Treue (13.10.2026, abends)

> Plan: [`docs/plans/2026-10-13-wesen-editor-2.md`](../plans/2026-10-13-wesen-editor-2.md), Abschnitt 11.1. Code: `packages/shape/src/{kaefig,subdivision,loeser,kern}/` (Einstieg `@ee/shape/kern`), Editor-Tab „kern“ am 3D-Fenster (`apps/editor/src/kern/kernBau.ts`), Bilder `docs/progress/editor/kern-*.png` (`node apps/editor/scripts/kern-bilder.mjs`), Messung `packages/shape/src/kern/beweis1.test.ts` (Ausgabe mit `--reporter=verbose`).

## Was gebaut ist

1. **Käfig als Halbkanten-Struktur** auf Typed Arrays (`kaefig/halbkanten.ts`): Kanten- und Punktschärfe, Nachbarschaft, Mannigfaltigkeits-Prüfung, Volumen.
2. **Catmull-Clark als Matrix** (`subdivision/catmullClark.ts`, `matrix.ts`): eine Stufe = dünn besetzte Matrix Kind ← Eltern, mit halbscharfen Falten (DeRose/Chaikin) und Punktschärfe, Semantik gleich dem alten Orakel `versuch/catmullClark.ts` (Test: drei Stufen auf 1e-9 gleich, gleiche Kindschärfen, gleiche Flächenlisten). Dazu die **Grenzflächen-Maske** (Halstead/Kass/DeRose; Würfelecke landet bei ½, Stufe 3 gegen Stufe 6 < 1e-6).
3. **Löser** (`loeser/lu.ts`, `grenzflaeche.ts`): dichte LU je Topologie; (a) Grenzlagen der Käfigpunkte treffen Ziele exakt, (b) gewichteter Ausgleich mit zusätzlichen Bedingungen für feine Punkte (die Naht der Stufe 3 auf der Kurve).
4. **Vorlage „Röhre“** (`kaefig/roehre.ts`): R Ringe × N Punkte, vorn und hinten eine Kappe aus (N/4)² Vierecken, keine Pole, nur Vierecke; Orientierung wird beim Bau geprüft.
5. **Ableitung** (`kern/ableiten.ts`): Seitenumriss → Leiter (Rücken/Bauch, Sprossen; aus dem Wirbelsäulen-Versuch) → Poisson-Dicke der Seite (aus „rund“) → Ringe auf Sprossen (Punkt bei v = (1+cos θ)/2, seitlich ±Dicke) → Käfig so gelöst, dass die Grenzfläche durch alle Ziele und die feine Naht durch die Kurve geht. **Ecken des Seitenumrisses** werden Falten: Ring genau auf die Ecke, Schärfe quer mit cos²-Verlauf; Ecken an den Spitzen werden Eckpunkte der Kappe (Punktschärfe).
6. **Griff „Seitenumriss“** (`seiteZiehen`): Ziele der Naht wandern auf die neue Kurve, die Ringpunkte folgen ihrem oberen bzw. unteren Nahtpunkt mit Gewicht cos θ; Löser und Matrix liefern das Netz. Topologie, Matrix und LU bleiben.
7. **Editor-Tab „kern“** (`?versuch=kern&wesen=kugel|rex|langhals|ueberhang`): während Gesten Zug (≈ 3 ms), beim Loslassen Ableitung (≈ 100–190 ms); Seitenleiste zeigt Naht-Abweichung und Zeiten.

## Messwerte (px bei 461 px je Kachel; Käfig 402 Punkte, Stufe 3 = 25 602 Punkte, ≈ 380 000 Gewichte)

| Prüfwesen | Naht → Kurve max (Ø) | Kurve → Naht max | Umriss (Raster) → Kurve max | Ableitung gesamt | Kriterium (Plan) |
|---|---|---|---|---|---|
| Kugel | 0,27 (0,03) | 0,26 | 0,27 | 173 ms | ≤ 0,5 ✓ |
| Rex | 0,70 (0,05) | 0,46 | 0,45 | 123 ms | ≤ 0,5 ✗ (Rest an der Schwanzspitze, Eckpunkt) |
| Rex, 36 Ringe | 0,71 (0,03) | 0,48 | 0,50 | 191 ms | – |
| Langhals (Hals steht) | 1,52 (0,14) | 1,59 | 1,56 | 127 ms | ≤ 2 ✓ |
| Überhang-Ente (Florian 13.10.) | 1,14 (0,12) | 1,17 | 1,78 | 109 ms | ≤ 2 ✓ (Seite); Falten am Überhang, siehe unten |

**Tempo:** Matrix · Käfig (Stufe 3, 25 090 Punkte) 0,70 ms; Zugschritt am Seitenumriss (Leiter 1,5 + Ziele 0,1 + Löser 1,9 + Matrix 0,8) ≈ 2,6 ms bei 24 Ringen, 3,7 ms bei 36 Ringen. Kriterium ≤ 5 ms Käfig / ≤ 16 ms fein ✓. Aufbau je Topologie: Matrix 70–125 ms, LU 3–6 ms.

**Zugschritt-Treue:** Ein einzelner Knoten des Rex-Umrisses um 23 px angehoben (scharfe Beule): Naht → neue Kurve 1,80 px (24 Ringe), 1,04 px (36 Ringe). Die Treue hängt an der Ringdichte, nicht am Löser; die Verdichtung („Reifen einfügen“, Plan 4.2) ist der vorgesehene Weg, dazu Ringe nach Krümmung.

## Vergleichsbilder

`docs/progress/editor/kern-{kugel,rex,langhals,ueberhang}.png` (ganzer Editor) und `kern-<wesen>-3d-kern.png` gegen `kern-<wesen>-3d-rund.png` (gleiche Kamera): Kugel ist eine Kugel; Rex und Langhals decken sich mit der runden Bauweise, aber als Vierecksnetz fester Topologie mit 402 Käfigpunkten, Falten an der Schnauze und Eckpunkten an den Spitzen; die Ente zeigt die Grenze der Sprossen.

## Was noch nicht stimmt (deutlich)

- **Ecken an den Spitzen** (Rex-Schwanz): 0,70 px; der Eckpunkt der Kappe (Valenz 4, Punktschärfe) zieht die Naht neben die Kurve. Abhilfe: Spitze als eigener Ring mit Falte oder Kappe mit Mittelkante; noch nicht gebaut.
- **Überhang (Schnauze über Bauch):** Die Sprossen der Leiter kreuzen an dieser Stelle Schnauze und Bauch zugleich; die Ringe schneiden sich, am Hals entstehen Falten und Beulen (Bild `kern-ueberhang-3d-kern.png`). Die Seite stimmt (1,14 px), die Form dazwischen nicht. Der Plan sieht dafür Teile (Schnauze als eigener Käfig, verschmolzen) oder schräge Ringe vor; die Seitenteile aus dem Top (Haken) fehlen im Kern noch ganz.
- **Breite nur aus dem Poisson-Feld:** Top und Front gehen über die „rund“-Anpassung ein (A(x), B(y)); flache Ober- und Unterseiten der Front werden rund (bekannte Grenze von „rund“). Spanten als Ringe-Griffe (Reifen) sind der nächste Schritt und noch nicht gebaut.
- **Ringverteilung:** Ringe gleichmäßig nach Wirbelsäulenlänge; Verdichtung an Krümmung und Ecken fehlt (deshalb 1,8 px beim Zugschritt).
- **Nur der Seitenumriss ist Griff.** Front/Top als Griffe, Pinsel im 3D, Maul: Phase 1 bzw. Beweis 2.
- **Dichte LU** (n³/3): bei 402 Punkten 3–6 ms, bei 600 Punkten 6 ms; ab ≈ 2 000 Käfigpunkten braucht es eine dünn besetzte Zerlegung.
- **Kein Worker, kein Earle-Material** im Tab „kern“: Matcap wie die anderen Tabs. Beweis 4 (Look live) steht aus.

## Urteil

Der Kern trägt: eine Wahrheit (Käfig), exakte Grenzfläche durch die Zeichnung, Zugschritte in wenigen Millisekunden, Ecken als Falten ohne Sonderregel. Nicht erreicht sind 0,5 px am Rex (0,70) und die Ente als Form (Seite ja, Hals nein). Beweis 1 gilt damit als **bestanden mit zwei offenen Punkten** (Spitzen-Ecke, Überhang als Teil). Weiter mit Beweis 4 (Look live auf diesem Netz) und Beweis 2 (Maul), parallel die Reifen (Spanten als Ringe-Griffe).

## Nachtrag 13.10. nachts: die offenen Punkte, nachgearbeitet

Florian (unterwegs): „Fixe die Punkte aus offen und ehrlich und dann weiter.“ Stand danach (Messung `beweis1.test.ts`, `diagnose.test.ts`, `querschnitt.test.ts`, `varianten.test.ts`; alle 14 Kern-Tests grün):

1. **Spitzen-Ecke ✓** Ecken an den Spitzen bekommen eine kleine Kappe (`kappeSpitze` 2,5 % statt 5 %), der Eckpunkt rückt an die Kurve: Rex 0,70 → **0,33 px** (Kriterium ≤ 0,5 erfüllt). Kiel (Mittelkante in der Kappe) brächte 0,26 px, ist aber nicht Standard (Varianten-Test).
2. **Ringverteilung ✓** Ringe nach Krümmung des Seitenumrisses (`kruemmung` 2): Langhals 1,52 → **0,97 px**. Messung jetzt nach dem Loslassen (Ableitung), nicht nur im Zugschritt.
3. **Breite nicht mehr aus Poisson ✓** Projektionsregel: Ein Ringpunkt bei Höhe v und Breitenanteil w liegt seitlich bei w · W, und W ist die größte Breite, die ins Top (bei x) **und** in die Front (bei jeder Höhe des Rings) passt. Der Poisson-Schritt entfällt in der Ableitung (≈ 90–140 ms, größter Posten die Matrix). Kugel: Front 0,1 px, Top 0,3 px.
4. **Querschnitte aus Front und Spanten ✓** Mit gezeichneten Spanten gilt `vorlageBei` (Halbprofil je Station). Ohne Spanten bekommt jeder **liegende Abschnitt** (Sprossen eher senkrecht: Rumpf, Kopf) seinen Lappen der Front-Silhouette als Vorlage, nach Bogenlänge abgetastet, Ecken genau auf Stützstellen; **stehende Abschnitte** (Sprossen eher waagerecht: Hals) bekommen einen Kreis. Ecken im Querschnitt werden **Längsfalten** (Schärfe aus der Härte des Knotens). Kasten-Kugel (Front als Kasten, Seite und Top Kreise): Front **0,7 px**, Knick an den Längskanten **93°** (rund wären < 15°).
   - **Falle:** Die Schnittgrenzen des Lappens müssen auf die Enden der Front **einrasten** (3 % der Abschnittshöhe). Front und Seite sind getrennt gezeichnet; die Sprosse endete bei 0,5297, die Deckkante lag bei 0,53, und das Zuschneiden warf Deck- und Bodenkante samt Ecken weg (Front 18,9 px, keine Falten). Abgeschnittene Lappen (Sprosse mitten im Körper, Rumpf unter dem Hals) führen jetzt **flach zur Naht** statt schräg zur ersten Stützstelle.
5. **Messung in Front und Top ✓** (`ansichtMessen`): Umriss des feinen Netzes gegen die gezeichnete Kurve, in beiden Richtungen.
6. **Earle-Material im Tab „kern“ ✓ (Beweis 4, erster Schritt):** `createCreatureMaterial` aus `packages/render/src/creature2` auf dem Kern-Netz, Deskriptoren (Wirbelsäulen-s, θ, Umfang, Bauch; Zonen) am Käfig gerechnet und über die Grenzmatrix auf Stufe 3 gebracht; Paletten Tiger/Rex/Blob/Giraffe, Bauchfeld hart, Rückenfeld weich, gemalte Schlitzaugen mit Blinzeln; Umschalter Look/Palette in der Seitenleiste (`&look=earle&palette=…`). Bilder `kern-<wesen>-3d-earle.png`. Muster schwimmen beim Ziehen nicht (Deskriptoren folgen dem Käfig). Das Vergleichsbild Tiger-Kopf (Kastenschnauze) steht noch aus: `kern-tiger-3d-{kern,earle}.png` (Tiger-Vorlage mit Spanten, Naht 1,23 px, 4 Falten) zeigt einen runden Schnauzenstummel mit Ringfalten, keinen Kasten; die Spanten der Vorlage sind rund gezeichnet, der Kasten braucht Spanten mit Ecken (dann Längsfalten wie beim Kasten-Test).

### Messwerte jetzt (px bei 461 px je Kachel)

| Prüfwesen | Naht → Kurve max (Ø) | Kurve → Naht max | Front | Top | Kriterium |
|---|---|---|---|---|---|
| Kugel | 0,28 (0,04) | 0,27 | 0,1 | 0,3 | ≤ 0,5 ✓ |
| Rex | 0,33 (0,04) | 0,20 | 11,0 | 1,9 | ≤ 0,5 ✓ (Seite); Front: Widerspruch, siehe unten |
| Rex, 36 Ringe | 0,33 (0,02) | 0,18 | 11,1 | 1,9 | – |
| Langhals (Hals steht) | 0,97 (0,18) | 0,99 | 4,0 | 15,9 | ≤ 2 ✓ (Seite); Top: Widerspruch |
| Überhang-Ente | 1,21 (0,11) | 1,24 | 22,2 | 31,7 | ≤ 2 ✓ (Seite); Form braucht Teile |
| Kasten-Kugel | 0,28 (0,04) | 0,27 | 0,7 | 24,5 (Top-Kreis gegen Kasten-Front, Front gewinnt: gewollt) | Knick 93° ✓ |

Zugschritt am Seitenumriss (Rex, Knoten um 23 px gehoben): Löser + Matrix 2,8 ms (24 Ringe) bzw. 3,9 ms (36 Ringe); während des Zugs 1,5–1,7 px, nach dem Loslassen 0,75 bzw. 0,37 px.

**Widersprüche zwischen den Ansichten werden still entschieden:** Die Projektionsregel nimmt die kleinere Breite. Beim nachgezogenen Rex ist die Front breiter gezeichnet als das Top erlaubt (0,194 gegen 0,182 → Front 11 px daneben), beim Langhals das Top breiter als die Front (0,233 gegen 0,136 → Top 16 px). Das ist kein Fehler des Kerns, aber er zeigt es nicht an. Vorgesehen: Saum und Δ-Zahl (Plan 9.8) und Reifen, mit denen Florian je Station entscheidet.

### Was jetzt noch offen ist

- **Überhang als Teil** (Schnauze über dem Bauch, Haken im Top): Seite stimmt, Form dazwischen nicht; Beweis 3 (Teile).
- **Hals-Übergang:** Beim Langhals trifft der liegende Rumpf (Lappen-Vorlage, oben flach abgeschnitten) auf den stehenden Hals (Kreis) ohne Überblendung. Wirbelsäule mit schrägen Ringen oder Hals als Teil.
- **Reifen als Griffe:** Spanten wirken nur über das Dokumentfeld `spanten`; kein Griff im 3D, keine Front-Griffe.
- **Nur der Seitenumriss ist Griff**, kein Pinsel im 3D.
- **Kein Worker**, **dichte LU** (ab ≈ 2 000 Käfigpunkten dünn besetzt nötig).
- **Beweis 2 (Maul)**, **Beweis 3 (Teil)**, **Beweis 5 (Feuer/Gas/Fell)**, Vergleichsbild Tiger-Kopf für Beweis 4.

**Urteil:** Beweis 1 ist **bestanden** (Kugel 0,28, Rex 0,33, Langhals 0,97, Ente 1,21 px in der Seite; Zugschritt ≈ 3 ms; Kasten mit Falten aus der Front). Die Ente bleibt als Form ein Fall für Teile. Weiter mit Beweis 2 (Maul mit Haps).

## Nachtrag 14.10. abends: Sauberkeit und entfächerte Leiter

Plan 3.2 verlangt 0 Durchdringungen in Ruhe. Gemessen (Stufe 2, neuer Test in `beweis1.test.ts`): Kugel, Rex, Überhang-Ente, Tiger 0; **Langhals 94** am Schwanz: Die kürzeste Leiter hatte die Rückenlinie an der tief liegenden Schwanzspitze aufgebraucht, während die Bauchlinie darunter noch 6 % rundete; alle Sprossen teilten sich den Spitzenpunkt, Ring 23 und die hintere Kappe fielen auf ihn. `kernLeiter` entfächert solche Läufe jetzt an beiden Enden (eine Linie mit weniger als der Hälfte des Rests der anderen wird linear mitgeführt). Ergebnis: alle fünf 0; Naht Langhals 1,36 px (vorher 0,97; Plan ≤ 2), Ente 0,54 (vorher 1,21), Kugel/Rex unverändert. Dazu `kastenKappe`: an einer senkrechten Kastenfront wird die Kappe ein ebenes Gitter in Ring 0 (Beweis-2-Nachtrag, Punkt 1).
