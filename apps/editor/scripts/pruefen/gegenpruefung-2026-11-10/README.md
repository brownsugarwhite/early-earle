# Messskripte der Gegenprüfung vom 10.11.2026

Belege zu [`docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`](../../../../../docs/research/2026-11-10-gegenpruefung-kurven-loeser.md).
Alle Skripte lesen den Kern nur; nichts davon gehört zum Editor. Sie stammen von den Prüfern der Gegenprüfung und sind hier
abgelegt, damit die Zahlen wiederholbar bleiben.

**Aufruf** (aus `packages/shape`, einzeln und nacheinander, Zeiten nur als Verhältnis lesen):

```bash
cd packages/shape && npx vite-node ../../apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/loeser/mess1.ts
```

Vor `mess3.ts` und `mess5.ts` einmal die Messkopie des Lösers erzeugen (bitgleich mit Standardwerten, `MODE=gleichheit` prüft es):

```bash
python3 apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/loeser/gen.py
```

| Skript | Misst | Wichtige Schalter |
| --- | --- | --- |
| `loeser/mess1.ts` | Anteile einer Runde, Genauigkeit der Linien, Bewegung je Runde nach dem Zug (Pendeln) | `FALL=hals\|ohr\|ruessel`, `GEWICHTE=gleich\|geometrie`, `NACH` |
| `loeser/mess2.ts` | Wegabhängigkeit: gleiche Endlinien auf vier Wegen | `FALL`, `GEWICHTE` |
| `loeser/mess3.ts` | Varianten in der Messkopie: Bremse je Punkt (`adaptiv`), feste Bremse (`beta05`), Quellen fest (`qfest`) | `MODE=gleichheit\|kosten\|varianten\|ort`, `VARIANTE`, `DREIECKE` (30000 = 23 406 Punkte, 36000 = 27 758) |
| `loeser/mess4.ts` | Abschätzung für das Pendeln gegen die Messung | `FALL`, `DREIECKE` |
| `loeser/mess5.ts` | Wirkung von `HALT` je Netzdichte; Sprung mit und ohne Bremse | `MODE=halt\|k2\|sprung` |
| `loeser/mess6.ts` | wie stark Verfeinern das Krümmungsmaß auf derselben Fläche ändert | `FALL` |
| `loeser/mess7.ts` | (G3) Kommt der Löser zur Ruhe? Bewegung je Abschnitt nach dem Zug, getrennt nach Form (längs der Normalen) und Gleiten längs der Fläche; die ersten Runden eines neuen Lösers einzeln (Anlauf) | `FALL=ruhe\|ohr\|hals\|ruessel`, `DREIECKE`, `JE`, `NACH` |
| `loeser/mess8.ts` | (G3) Steht die Haut wirklich? Nach der Ruhe ein neuer Löser auf demselben Stand (dreimal), dazu der Stand der Bremse je Punkt | `FALL`, `DREIECKE`, `RUHE`, `NEU` |
| `loeser/mess9.ts` | (G4) Was kostet ein neuer Löser mitten im Zug: Anlegen mit fertiger Zerlegung, erste Runden gegen die des alten | `DREIECKE`, `HALB` |
| `loeser/mess10.ts` | (G4.4) Hält die Haut, wenn man sie nach einem neuen Loop über die ganze Haut setzt? Je Runde Bewegung der Form und Gleiten, am Ende der Halbmesser der Kugel | `DREIECKE`, `LOOPS=ring,mitte,ring2`, `SETZEN=jeder\|ende`, `RUNDEN` |
| `algebra/a1-fuellung.ts` | Füllung der Zerlegung gegen andere Reihenfolgen | `DREIECKE` |
| `algebra/a2-spiegel.ts` | halbe Haut: Rechenarbeit und Gleichheit der Lösung | `DREIECKE` |
| `algebra/a3-genau.ts` | Kondition, weiche Bindung, `HALT` im quadrierten System | `DREIECKE`, `LOOPS` |
| `algebra/a4-kern.ts` | Lösen mit drei Spalten: Code heute gegen ausgeschrieben (`loesen3`) gegen Superknoten; Teil-Neuzerlegen | `DREIECKE`, `AUSGABE` (schreibt die Matrix für `kern.c`/`a6-wasm.mjs`) |
| `algebra/kern.c`, `haupt.c`, `accel.c`, `a6-wasm.mjs` | derselbe Rechenkern nativ, mit Apple Accelerate und als WebAssembly | brauchen die Matrix aus `a4-kern.ts` |
| `netz/m1-kugel.ts` | wohin neue Punkte beim Teilen kommen; Netzgüte | `DREIECKE` |
| `netz/m2-faelle.ts` | Netzgüte an Hals, Ohr, Rüssel vor, im und nach dem Zug | `FALL`, `GEWICHTE` |
| `netz/m3-mass.ts` | Krümmungsmaß auf genauer Kugel und genauem Ellipsoid | – |
| `netz/m4-iso.ts` | gleichmäßig neu vernetzt gegen heute | `FALL`, `TEIL=dichte\|ruhe\|lag\|stufen`, `GEWICHTE` |
| `netz/m5-ausgleich.ts` | Ausgleich beim Netzwechsel (in den Löser zur Laufzeit eingehängt) | `FALL=hals\|ruessel` |
| `netz/m6-spiegel.ts` | Spiegelzuordnung bei sehr nahen Punkten | – |
| `netz/m7-unruhige-stelle.mjs` | (G3, im Fenster, aus `apps/editor` mit `node`) die unruhige Stelle bei 23 400 Punkten: kurze Kanten im Startnetz, Umgebung des Punkts, der nach der Ruhe am weitesten wandert | `KURVEN_URL`, `HALTEN` |

`ausgaben/g3-fenster-*.txt`, `loeser-mess7.out`, `loeser-mess8.out` und `m7-unruhige-stelle.out` gehören zu Schritt G3 (10.11.
nachmittags, Bericht „Stand G3“): Messungen im Fenster mit `form-loslassen-probe.mjs` (`GPU=1`, `HALTEN`, `PAUSE`, `REST`, `FERN`,
`SICHERN`/`VERGLEICH`), `form-drei-faelle.mjs` (`HALTEN`) und `form-anlauf-probe.mjs`; der Stand vor G3 lief dafür als zweite Seite
auf demselben Server.

`ausgaben/g4-fenster-ruckeln.txt` und `loeser-mess9.out` gehören zu Schritt G4.1 (Verfeinern im Zug im Hintergrund): Abstand von
Bild zu Bild im Zug und die Arbeit im Hauptthread, vor G4 und nach jedem der drei Teilschritte.

`ausgaben/g4-fenster-loslassen.txt` und `g4-fenster-nachlauf-probe.txt` gehören zu G4.2/G4.3 (nach dem Loslassen: Nachlauf im
Bildtakt, dann Verdichten und Setzen im Hintergrund, einmal einwechseln). Die erste Datei stammt von `form-loslassen-probe.mjs`
(`GPU=1`, `HALTEN=0`, `WIEDER`; der Ablauf von vorher mit `&nachlauf=0` in `KURVEN_URL`): je Fall Abstand von Bild zu Bild nach dem
Loslassen, Bewegung bei gleichem Netz, jeder Netzwechsel mit dem Stand davor und danach, Zeiten des Auftrags. Die zweite von
`form-nachlauf-probe.mjs`: Rückgängig, wieder Greifen, Kante, neuer Loop und ein Ausfall des Workers, während Nachlauf oder
Hintergrund rechnen (der Stand darf nicht angefasst werden, wenn ihn inzwischen jemand geändert hat).

`ausgaben/g44-*.txt` und `loeser-mess10.out` gehören zu G4.4 (nach Loop, Punkt, Kante, Löschen, Rückgängig rechnet der
Hintergrund): `g44-fenster-aendern.txt` (`form-aendern-probe.mjs`, je Schritt der Stillstand des Fensters und der erste Griff
danach, vor und nach G4.4 bei drei Netzdichten), `g44-fenster-sofort.txt` (ein neuer Loop und sofort greifen: neu, ohne Setzen,
alter Ablauf), `g44-nachlauf-probe.txt` (die 18 Prüfungen mit dem Stand nach G4.4, dazu Kontrollen), `g44-vergleich-alte-proben.txt`
(elf ältere Proben im neuen und im alten Ablauf), `loeser-mess10.out` (im Kern: ein Ring allein hält die Haut nicht).

`ausgaben/g5-*.txt` gehören zum Anfang von G5 (die Güte des Netzes messen, 10.11. nachts): `g5-netzguete-probewesen.txt` ist die
Ausgabe von `form-netzguete.ts` (liegt eine Ebene höher bei den Proben) für sieben Probewesen aus `form-probewesen.mjs` (Kugel mit
drei Loops, Hals und Kopf, Rüssel und Ohr, danach gespielt; bei 5 200 und 23 400 Punkten am Start), `g5-probewesen-spiel.txt` die
Zahl der Punkte nach jedem Mal Hinaus-und-zurück (`SPIEL=30`). Florians eigene Wesen sind damit noch nicht gemessen.

`ausgaben/` enthält sonst die Ausgaben vom 10.11. (je ein Lauf, die Maschine war belegt). `a5-ausgabe.txt` stammt von einem Skript, das
eine von Hand angelegte Kopie des Lösers brauchte; gleichwertig ist `mess3.ts` mit `DREIECKE=30000`.
