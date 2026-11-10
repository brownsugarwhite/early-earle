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

`ausgaben/` enthält sonst die Ausgaben vom 10.11. (je ein Lauf, die Maschine war belegt). `a5-ausgabe.txt` stammt von einem Skript, das
eine von Hand angelegte Kopie des Lösers brauchte; gleichwertig ist `mess3.ts` mit `DREIECKE=30000`.
