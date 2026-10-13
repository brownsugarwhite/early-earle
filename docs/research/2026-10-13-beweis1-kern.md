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
