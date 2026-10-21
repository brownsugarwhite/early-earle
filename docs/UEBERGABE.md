# Übergabe (Stand 21.10.2026 nachmittags: Teil A „Maul als Einsatz“, E1 — Haut wieder genau, als Nächstes Standard + Mundwinkel)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix. **Diese Datei ist der Einstieg für eine frische Sitzung.** Alles zu Teil A
liegt bisher nur im Kern (`packages/shape/src/kern/einsatz/`), hinter Schaltern; im Editor ist davon noch nichts zu sehen.

## Start der frischen Sitzung

Zum Einfügen (Florian):

> Lies `docs/UEBERGABE.md` und auf der Planseite `docs/plans/2026-10-21-maul-einsatz-weiter.md` die Abschnitte ab „Ursache am
> Mundwinkel“ (vor allem „Stand E1“ und die beiden Nachträge E1). Weiter mit Teil A, E1 nach der Übergabe: zuerst die genaue Haut
> als Standard des Kernrings (Feld auf K2, Reihen nach Feldgröße, Ausgleich außen, dünn besetzter Löser, ganze Reihe, Haut-Tor als
> Test), dann den Mundwinkel (Quadratgitter um c).

Lesereihenfolge für die Sitzung:
1. `CLAUDE.md` (lädt von selbst: Stand, Regeln, Fallen; Einträge „2026-10-21 …“ unten in der Liste).
2. Diese Datei.
3. Planseite [`docs/plans/2026-10-21-maul-einsatz-weiter.md`](plans/2026-10-21-maul-einsatz-weiter.md): „Ursache am Mundwinkel und
   die Entscheidung“, „Schritte“ (E1–E6), „Stand E1“, „Nachtrag E1 (mittags)“, „Nachtrag E1 (nachmittags): Haut wieder genau“.
4. Register [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md), „Befunde aus E1“.
5. Grundlage Teil A: [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md)
   (Festlegungen, Schritte A1–A14).

## Worum es geht

Florian 21.10.: „Weiter mit Teil A ‚Maul als Einsatz‘: Damit sollen glatte Haut, Querschnitt aus der Hülle, Linien exakt und Loops
auch mit Maul wirken.“ Heute schaltet ein Maul den Körper auf den alten Maulbau um (`ableitenMitMaul`) — ohne all das. Der Einsatz
dreht es um: A0 ist der Körper ohne Maul mit allem, was der Körper kann; das Maul wird in die einmal verfeinerte Fläche von A0
eingesetzt (Feld um die Maullinie, Karte, Topologie, Lippe, Haut lösen = A3–A7), außerhalb des Felds bleibt der Körper bitgleich.

Reihenfolge: **E1 Gitter** (läuft) → E2 A0 wie im Editor → E3 Bau → E4 Editor, Maul zu (**Florians Blick**) → E5 Öffnen → E6 Rest
(Kiefer getrennt, Zähne, Augen, Rig, alter Maulbau raus, Abnahme).

**Florians letzte Wahl (21.10. nachmittags): „Mach zuerst die Haut wieder genauer (0,25 px), dann den Mundwinkel.“**

## Stand E1

Commits: `903f49f6` (Plan), `80905daf` (Kernring), `93331e7d` (Wulst zur Spitze), `0dfee101` (Bilder), dazu der Commit dieser
Übergabe (Haut genauer, Skripte).

- **Kernring** (`einsatzTopologie(…, { gitter: 'kernring' })`, `einsatz/topologie.ts`): Der Mundwinkel c ist ein regulärer
  Gitterpunkt am Ende des Schnitts. Lippe m = M − 2 Spannen, Reihe 1 ein Ring um den Schlitz mit 2M + 1 Punkten, c Faltenpunkt mit
  vier Hautflächen (ohne Punktschärfe), Dreierpole an den Kernecken; ab Reihe 1 laufen 2M + 1 Speichen bis zum Feldrand. Die Lippe
  endet als Falte (`lippeAnpassen(…, { ende: 'falte' })`, `einsatz/lippe.ts`): Spitze (2U_{m−1} + 4c)/6 auf dem gezeichneten
  Mundwinkel, c eine halbe Spanne dahinter; Reihe 0 der Topologie ist die angepasste Lippe. Lage in zwei Stufen (`kernGitter`):
  innen Tutte in der um c zentrierten Auffaltung ζ' = √(ζ² − x_c) bis Reihe J_i, außen Tutte in der Karte. Reihenzahl konform
  (J ≈ a·m / (2V_c(1 − V_c)), 3 … 8) oder Option `J`; Mindestzelle am Mundwinkel eine Kante von K1 (`eckeMin`); der Lippenwulst
  läuft zur Spitze aus (`einsatz/loesen.ts`). Ohne `gitter: 'kernring'` bitgleich zum Schleifengitter.
- **Haut genauer (neu):** `einsatzFall(…, { stufe: 2 })` (`kern/pruefen/einsatzFall.ts`) legt das Feld auf **K2** (A0 zweimal
  exakt verfeinert; Feldradius physisch gleich, `feldMitGerademRand(…, mMax)` mit 2 · `M_MAX`); `einsatzTopologie(…, {
  aussenRunden })` gleicht die äußere Stufe nach Hautlängen aus (Gewicht ← √(alt · Hautlänge/Kartenlänge), Median-normiert,
  faltenfrei). Beides Schalter, ohne sie bitgleich. **Noch nicht Standard.**
- **Ursache der groben Haut** (gemessen): konforme Reihenzahl klein (Kugel mittel J = 4); Speichenabstand = Randkante von K1
  (≈ 24 px an der Kugel, Fehler ≈ h²/8R ≈ 0,3 px — ohne feineres Feld ist 0,25 px nicht erreichbar); große Felder: die Karte staucht
  den Feldrand weit hinter dem Mundwinkel (Zellen bis 50 : 1 auf der Haut). Der Wulst ist es nicht.

| | Schleifengitter (alt, K1) | Kernring K1, J konform | **Kernring K2, J 12, Ausgleich 6** |
|---|---|---|---|
| Haut gegen A0 (Kugel, Ei, Birne, Langhals) | 0,16–0,49 px | 0,32–1,27 px | **0,16–0,22 px** (Kugel mittel/tief/hoch 0,16/0,22/0,20; Ei mittel S 0,16, Ei tief 0,16; Birne mittel 0,17; Langhals hoch 0,17) |
| Knick am Mundwinkel | 131–179° (alle) | ≤ 12° in 29 von 39; Tor A0 + 2° in 4–5 von 15 | 4,4–9,9° in diesen Fällen (A0 1,7–6,0°) |
| Viereckgüte | 1–47° / bis 10 : 1 | 1–38° / bis 18 : 1 | 2–36° / bis 11 : 1 |

Rex und Robbe bleiben bei 2–4 px nahe der Lippe: eigene Falten bzw. feine Kerbe von A0 im Feld (gehört zu E2), keine
Auflösungsfrage. Bilder: `docs/progress/editor/e1-mundwinkel-schleifengitter-2026-10-21.png` (Zebra reißt am Mundwinkel) gegen
`docs/progress/editor/e1-mundwinkel-kernring-2026-10-21.png` (Streifen laufen durch).

## Nächste Schritte (in dieser Reihenfolge)

1. **Haut als Standard des Kernrings** (Florians Wahl zuerst):
   1. Feld auf K2 als Standard des Kernrings (in `einsatzFall`, später im Bau E3); J nach Feldgröße (konforme Formel, Kappe 16 statt
      8 — heute fest J = 12 über die Umgebung), `aussenRunden` 6 als Standard.
   2. Lage (`kernGitter`) und A7 (`einsatzLoesen`) auf einen dünn besetzten Löser umstellen — heute dichte LU (`luZerlegen`/
      `luLoesen`), bei M ≈ 35 und J = 12–16 dauert ein Fall 10–30 s. Vorbild: `loeser/normalSystem.ts` (dünn besetzte LU aus S2).
   3. Ganze Reihe messen (`e1-haut.ts` ohne `FAELLE`, im Hintergrund), dann ein Haut-Tor als Test in `einsatz/kernring.test.ts`:
      ≤ 0,25 px, wo A0 keine eigenen Falten im Feld trägt (Rex/Robbe bis E2 ausgenommen); verfehlt → `it.fails` + Register.
   4. Gegenprobe auf K2: Topologie-Test an allen 54 Fällen, Spiegel exakt, außen bitgleich, Lippe ≤ 1 px, Knick nicht schlechter.
2. **Mundwinkel** (Tor: Knick ≤ A0 + 2°): Ziel-Lage nahe c als Quadratgitter auf der Haut (Reihe r im Abstand r·h,
   h = |c − U_{m−1}|) samt den Reihen dahinter, übergeblendet in die heutige Lage; einbetten nach Tutte mit Mittelwertgewichten aus
   der Ziel-Lage (positiv, linear genau, faltenfrei bei konvexem Rand). Dazu Lippenstellen zum Mundwinkel hin auf h stufen und das
   Feld hinter dem Mundwinkel verlängern, wo es für zwei, drei Quadrate nicht reicht (`einsatzFall(…, { verlaengerung })` gibt es).
   **Nicht wiederholen** — sechs Lage-Varianten sind gemessen und verworfen (Planseite „Nachtrag E1 (mittags)“): Gewichte nach
   Hautlänge am Mundwinkel, radiale Umparametrisierung, fester Fächer, innere Stufe in W', Polarkoordinaten um c, Ideallage nur
   innen. Lehre: Die Ziel-Lage muss als Ganzes (mit den Reihen dahinter) vorgegeben und faltenfrei eingebettet werden.
3. **E1-Rest:** schiefe Felder (Viereckgüte bis 2° / 11 : 1 auch auf K2; Übergangsreihe mit 3/5-Polpaaren oder ausgeglichene
   Feldwahl, Register A5 Weg 2), Lippenstellen für verwickelte Linien (Bogenlänge/Krümmung statt konform; Rex mittel Lippe 5,6 px).
4. Danach **E2** (A0 wie im Editor: glatt, berühren, Hülle, Linien, Loops; Florians Ablauf Kugel → umformen → Maul; Falten von A0
   im Feld laufen auf einer Spalte weiter), **E3** (`maulEinsatzBauen`, eingefrorene Topologie im Dokument, schneller Zugweg),
   **E4** (Schalter „Maul: Einsatz“ im Editor, Maul zu → Florians Blick), E5, E6.

Je Schritt: Planseite „Stand …“ nachtragen, Register, Bilder, commit + push; nichts als „bestanden“ melden ohne Florian.

## Werkzeuge

- **Tests:** `packages/shape/src/kern/einsatz/kernring.test.ts` (Lippe als Falte ≤ 1e-12, Topologie an 54 Fällen mit Valenzen,
  Tor als `it.fails`), dazu die übrigen `einsatz/*.test.ts`. Lauf: `pnpm --filter @ee/shape test` (≈ 2 min).
- **Messskripte** (aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<datei>`; Übersicht in
  `apps/editor/scripts/pruefen/README.md`):
  - `teilA/e1-haut.ts` — Haut gegen A0 je Fall: `STUFE=2 JS=12 AR=6 FAELLE=kugel/mittel/gerade,ei/mittel/s`. `JS` mehrere Werte mit
    Komma (0 = konform), `GITTER` (Standard kernring), `WULST`. Ausgabe je Fall: Haut max/99 %, Ort (Abstand zu Lippe, Spitze,
    Rand), Normale, Knick (A0), Viereckgüte.
  - `teilA/e1-reihe.ts` — Kernring gegen Schleifengitter über die Reihe (Topologie, Valenzen, Lippe, Haut, Knick mit Ort):
    `GITTER`, `VERL`, `JI`, `FAELLE`.
  - `teilA/e1-faecher.ts` — Fächer um c (Winkel und Abstände von U'_m … D'_m in der Tangentialebene).
  - `teilA/e1-gitterbild.ts` — Gitter als HTML (`AUSGABE=<datei.html>`), Bild mit `node scripts/pruefen/html-shot.mjs` (aus
    `apps/editor`).
  - `einsatz-loesen.ts` — Nahaufnahme des Mundwinkels (A0 · Einsatz · Abstand · Zebra): `GITTER=kernring NAH=4`, optional `J`.
  - `teilA/e1-kissen-kern.ts`, `teilA/e1-kissen-zellen.ts`, `teilA/schlitz-vorversuch.ts` — Kissen-Vorversuche.
- **Fälle:** `<körper>/<anfang>/<form>` (z. B. `kugel/mittel/gerade`, `ei/mittel/s`, `langhals/hoch/gerade`), Liste
  `einsatzFaelle()`; „ausgeglichen“ = Linie ≤ 1 px auf der Haut (`hautAbstand`), das sind 39 von 54.
- **Auf K2 messen:** `einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 1), fit.punkte, { stufen: 1 })` und
  `einsatzMessen(…, 2)` (allgemein `3 − STUFE` bzw. `4 − STUFE`: gleiche Grenzfläche wie Stufe 3 von A0).
- Lange Läufe (ganze Reihe auf K2 mit dichter LU: weit über 10 min) im Hintergrund starten.

## Fallen aus E1

- Die Karte steht auf Dreiecken der Stufe 3 von A0. Zellen am Mundwinkel kleiner als eine Kante von K1 klappen (deshalb
  `eckeMin`). Mit dem K2-Feld bleibt die Karte auf Stufe 3 (eine K2-Kante = zwei Kartendreiecke); wer noch feiner will, muss die
  Karte mitverfeinern.
- Topologie und Lippe müssen dieselbe Lage von c haben (die Falte legt c vor): Reihe 0 = angepasste Lippe, c auf dem Kartenstrahl.
- Ohne Teilung in zwei Stufen dreht jeder Versatz des Feldrands den ganzen Fächer um c; Festhalten der Mundwinkelspeiche faltet.
- Lippenstellen wachsen vom Mundwinkel aus geometrisch, das Wachstum muss gedeckelt sein (0,8 · L/m), sonst läuft der Stellenplan
  über.
- Rex/Robbe 2–4 px in der Haut-Messung sind A0-Falten im Feld (E2), nicht die Auflösung.
- Tests an der Naht: −0 gegen 0 scheitert an `toBe` — Fehler sammeln und vergleichen, nicht je Wert `toBe`.

## Davor (V0–V6, Abnahme offen)

Maßgeblich bleibt der am 20.10. freigegebene Plan
[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md) (Stände V0–V6.4 am
Ende der Seite); Teil A ist der Block, den Florian am 21.10. früh davor gezogen hat. Gebaut und im Editor (Abnahme offen): V0
Fallen und Bedienfehler, V1 Prüfstand „Extremreihe“, V3 G/S/R und proportional in den Blättern, V4 Querschnitt aus der Sichthülle,
V5 P-Linien als Käfigschleifen, V6 ⌘R-Loops (Bühne und Blätter, G/S/R, mehrere Loops); V2-Linien nicht abgenommen („sehr sehr
wild“, standardmäßig aus). Offen danach: V6-Rest (jeden Käfigring als Loop, Loops auf „Teile“/mit Maul), V5-Rest (Lage 0,3 px,
Grat), V7 ein Körper, V8 Vektor-Ausgabe, V9 Abnahme.

Zum Ausprobieren im Editor (nach dem Pull den Dev-Server neu starten): Wesen ohne Maul (Röhre), Zeiger auf den Hals, ⌘R → gelber
Ring, Mausrad = Anzahl, Klick; Ring anklicken (türkis), S + Maus oder Zahl + Enter verjüngt, O für weichen Übergang, ⌘Z je Schritt.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen nicht
  stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und begründet
  auf die Planseite schreiben. Maßstab: Netz immer glatt und schön außer an gewollten Kanten.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert. Neue
  Wege hinter Schaltern, ohne sie bitgleich.
- Mit Florians Ablauf testen (Kugel → umformen → Maul). Immer sagen, was im Editor ist und was nur im Kern (Teil A: bisher nur
  Kern).
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180, seinen Dev-Server nicht starten. Während
  eines E2E-Laufs keine Dateien unter `apps/editor/src` oder `packages/shape` ändern; E2E-Läufe überschreiben Bilder in
  `docs/progress/editor/` — vor dem Commit zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen; nie in
  `~/Documents/early earle Editor/Bibliothek` schreiben.
- Keine Modellnamen in Commits, Docs oder Code. Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks
  überschreiben.
