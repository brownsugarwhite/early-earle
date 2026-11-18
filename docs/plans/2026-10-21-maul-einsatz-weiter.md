# Maul als Einsatz — Fortsetzung (21.10.2026)

Florian 21.10.: „Weiter mit Teil A ‚Maul als Einsatz‘: Damit sollen glatte Haut, Querschnitt aus der Hülle, Linien exakt und
Loops auch mit Maul wirken.“ Grundlage bleibt Teil A des freigegebenen Plans
[`2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md) (acht Festlegungen, Schritte A1–A14).
Diese Seite hält fest, was seitdem gilt, was ich technisch neu entscheide und in welcher Reihenfolge es in den Editor kommt.

## Warum der Einsatz

Heute schaltet ein Maul den Körper auf den alten Maulbau um (`ableitenMitMaul`): ohne glatte Haut, ohne „Umrisse berühren“, ohne
Querschnitt aus der Hülle, ohne Linien exakt, ohne Loops (Loops lösen sich in Knoten auf). Der Einsatz dreht das um: **A0 ist der
Körper ohne Maul — mit allem, was der Körper kann** (glatt, berühren, Hülle, Linien, Loops, Pinsel). Das Maul wird danach in die
einmal verfeinerte Fläche von A0 eingesetzt; außerhalb seines Felds bleibt der Körper bitgleich.

## Stand A1–A7 (Kern, 15./16.10., frisch gemessen 21.10.)

A1 Linie auf A0, A2 exakte Verfeinerung, A3 Feldwahl, A4 Karte, A5 Topologie, A6 Lippe, A7 Haut lösen — alle Tests grün.
Gemessen an 15 ausgeglichenen Fällen (Kugel, Ei, Rex, Langhals, Robbe; Kiefer gleich, zu):

| | Kugel/Ei | Langhals | Rex | Robbe |
|---|---|---|---|---|
| Haut gegen A0 | 0,31–0,49 px | 0,16–0,18 px | 1,8–2,2 px | 3,6–4,0 px |
| Knick (größter, Fläche) | **131–179°** | **158–176°** | **176–179°** | **176–179°** |
| A0 ohne Maul | 2–3° | 6° | 105° (Schnauzenkante) | 18° |

Die Lippe trifft ab m = 10 die Linie auf ≤ 1 px (m = 16: ≤ 0,3 px). **Der Knick sitzt immer am Mundwinkel**: Die Fläche klappt
dort um. Rex und Robbe: Falten bzw. feine Kerben von A0 im Feld gehen verloren.

## Ursache am Mundwinkel und die Entscheidung (technisch, Florian 16.10.: „die Falte dort ist meine Aufgabe“)

Im heutigen Gitter laufen die Hautreihen als Schleifen um den Mund (konzentrisch), jede Reihe wendet am Mundwinkel um 180°.
Am Mundwinkel c liegen deshalb nur **zwei** Hautflächen, die zusammen 360° überdecken müssen (der geschlossene Schlitz hat die
Breite null). Catmull–Clark gibt einem Sektor aus k Flächen von sich aus k · 90° — zwei Flächen sind 180°: Die Fläche faltet
(Biermann/Levin/Zorin 2000). Drei Anläufe am alten Gitter (Ecke, Spitze, Sektorregel) blieben gefaltet oder halb sauber.

**Neu: Der Mundwinkel ist ein regulärer Gitterpunkt am Ende eines Schnitts.** Das Feld wird als zwei Rechtecke vernetzt — über
und unter der Maullinie samt ihrer Verlängerung vom Mundwinkel bis zum Feldrand —, Spalten quer zur Linie, Reihen längs. Die
Lippen sind die beiden Seiten des Schnitts; c hat vier Hautflächen (natürlich 360°), dazu die Tasche. **Vorversuch** (Kissen mit
geschlossenem Schlitz, Catmull–Clark Stufe 3, größter Knick am Schlitzende): c als Faltenpunkt **7,8°**, c als Ecke 20,9°
(zum Vergleich: heutiges Gitter 131–179°). Also c als Faltenpunkt (ohne Punktschärfe); die Spitze der Lippen liegt dann ⅓ Kante
hinter c — die Lippenanpassung legt c so, dass die Grenzlage genau auf dem schwarzen Punkt (Mundwinkel) liegt.

Was das außerdem löst:
- **Lippenauflösung frei vom Feldrand:** m = Spalten bis c; der Rest der Spalten liegt auf der Verlängerung (heute m = E/2, also
  schlechte Gitter bei langen Lippen oder schlechte Lippen bei kleinen Feldern — Befunde A5/A6).
- **Nur Vierecke, unregelmäßige Punkte nur an den Rechteckecken am Feldrand** (wie heute die vier Fünferpole).
- Ober- und Unterseite dürfen verschieden viele Reihen haben (Lippe hoch an der Naht: oben wenige, unten viele).

Was es kostet: Die Reihen laufen nicht mehr als Schleifen um den Mund (das Blender-Muster für Hand-Animation). Unsere Posen
rechnet der Kern (Knochen + Blendshape), Schleifen braucht hier niemand; beim Öffnen dehnt sich das Gitter um c — gemessen in E5.

## Schritte (je Schritt Kern-Test mit Tor, Bilder, Stand hier; was nicht erreicht ist, bleibt als `it.fails` mit Registereintrag)

- **E1 Gitter aus zwei Rechtecken (Kern).** Schnitt verlängern (Pfad vom Mundwinkel zum Feldrand in Richtung der Linie), Karte je
  Hälfte auf ein Rechteck (Tutte, Rand nach Bogenlänge), Topologie neu (Haut, Lippen, Tasche, Rachen; Spiegel und Naht wie heute),
  Lippe (A6) mit Faltenpunkt am Mundwinkel, Haut lösen (A7). **Tor** an den 54 Fällen der Einsatz-Reihe: Knick am Mundwinkel
  ≤ Knick von A0 + 2°, Haut gegen A0 ≤ 0,25 px (wo A0 keine feineren Details trägt als das Gitter), außen bitgleich, Spiegel
  bitgenau, Lippe ≤ 1 px, Viereckgüte ≥ 20° / ≤ 4:1.
- **E2 A0 wie im Editor (Kern).** A0 mit glatter Haut, „berühren mittel“, Querschnitt aus der Hülle, Linien, Loops; Florians
  Ablauf (Startkugel → umformen → Maul). Falten von A0 im Feld (Rex-Schnauzenkante) laufen auf einer Spalte weiter.
- **E3 Bau (Kern).** `maulEinsatzBauen` (`einsatz/einsatz.ts`): eingefrorene Topologie im Dokument (`kaefig.maulEinsatz`),
  schneller Weg für Gesten (feste Matrix, Rückwärtseinsetzen), Zeiten wie der Körper.
- **E4 Editor: geschlossenes Maul.** Schalter „Maul: Einsatz“; der Körper mit Maul hat alle Körperwerkzeuge. → **Dein Blick**
  (zu; Earle-Look, Zebra, Abweichung gegen den Körper ohne Maul).
- **E5 Öffnen.** Tasche lösen (A8), Kiefergewichte und Haps (A11), Fressen und Posen (Teil B) auf dem Einsatz.
- **E6 Rest.** Kiefer getrennt (A9: Über-/Unterbiss), Zähne, Augen, Deskriptoren, Rig, Lippen-px (A13), alter Maulbau
  entfernt; Abnahme (A14).

Du siehst also zuerst das geschlossene Maul auf dem vollen Körper (E4), dann das offene (E5), dann den Rest (E6).

## Risiken

- **Feldform:** Ein schiefes Feld gibt schiefe Rechtecke (Viereckgüte). Die Feldwahl (A3) bleibt, die Ecken der Rechtecke werden
  so gewählt, dass oben und unten gleich viele Spalten liegen; reicht das nicht, kommt die kompakte Feldwahl (Register, Weg 1).
- **Tasche am Mundwinkel:** Innen bilden zwei Taschenflächen einen Sektor von fast 0°; geschlossen verdeckt, offen im Fressen
  sichtbar — in E5 messen.
- **Mäuler ohne Naht** (seitlich) und das Plattenmaul (Tiger-Stern) sind Sonderfälle der Rechtecke (zwei Mundwinkel,
  Platte) — nach E4.

## Stand E1 (21.10. nachmittags): Kernring statt zwei Rechtecken

**Zwei Rechtecke gemessen und verworfen.** Verlängerung und Karten bauen faltenfrei (50 von 54 Fällen, 4 ohne Verlängerung zum
Feldrand), aber die Lippe bekommt nur 1–6 Spalten: Die Spalten des Feldrands verteilen sich auf Lippe *und* Verlängerung. Der
Versuch bleibt als `einsatz/rechteck.ts`.

**Kernring (Option `gitter: 'kernring'`, `einsatz/topologie.ts`).** Reihe 0 ist die Lippe mit m = M − 2 Spannen (M = Lippen-
auflösung des Felds), Reihe 1 ein Ring um den Schlitz mit 2M + 1 Punkten: über jedem Lippenpunkt einer, dazu um den Mundwinkel
U'_{m+1}, E (auf der Verlängerung) und D'_{m+1}. c hat vier Hautflächen (natürlich 360°) und ist Faltenpunkt ohne Punktschärfe;
die beiden Kernecken sind Dreierpole. Ab Reihe 1 laufen alle Reihen mit 2M + 1 Speichen bis zum Feldrand. Die Lippe endet als
Falte (`lippeAnpassen(…, { ende: 'falte' })`): Die Spitze (2U_{m−1} + 4c)/6 liegt auf dem gezeichneten Mundwinkel, c eine halbe
Spanne dahinter; Reihe 0 der Topologie ist gleich die angepasste Lippe (sonst passte das Gitter am Mundwinkel nicht mehr).

**Lage — was gemessen wurde, was trägt:**
- Die Karte ist konform bis auf ein Seitenverhältnis a (|∂p/∂U| = a·|∂p/∂V|, über alle Fälle ±10 %, Winkel 1–3° von 90°). Nahe
  dem Schlitzende ist die Haut ∝ ζ² (ζ = a·U + i·(V_c − V)): Jedes in der Karte regelmäßige Gitter hat dort zwei Zellen mit 180°.
- Lage in der um c zentrierten Auffaltung ζ' = √(ζ² − x_c) (x_c für die halbe Spanne der Falte): c ist dort der Wurzelpunkt,
  seine drei Nachbarn verteilen sich nach Tutte über 180° in ζ', auf der Haut über 360°, und die Zellen am Mundwinkel werden so
  groß wie die letzte Lippenspanne (beides wird quadriert).
- Reihenzahl konform passend (J ≈ a·m / (2V_c(1 − V_c)), 3 … 8): Reihen- und Lippenabstand gleich, Zellen überall Quadrate.
  Mit der alten Reihenzahl (aus Tiefe/Randkante) waren die Zellen am Mundwinkel im Verhältnis 4–7 : 1 — Knick 9–19°.
- Lippenstellen konform (gleichmäßig in τ) mit einer kleinsten Zellgröße am Mundwinkel (eine Kante von K1, Wachstum 1,3): Bei
  großem m würden die konformen Zellen sonst ≈ 1 px, kleiner als die Dreiecke der Karte — dort stimmt die Abbildung nicht mehr.
- **Zwei Stufen, jede faltenfrei:** innen (Reihen 0 … J/2) Tutte in ζ' mit einer symmetrisch entworfenen Reihe auf der
  Kartenlinie U = konst; außen Tutte in der Karte (konvexes Rechteck), die den Versatz des Feldrands aufnimmt. Ohne die Teilung
  dreht jeder Versatz des Feldrands den ganzen Fächer um c (harmonisch, der Winkel klingt zum Mundwinkel hin nicht ab);
  Festhalten der Mundwinkelspeiche (ein oder zwei Reihen) faltet.
- Kissen-Vorversuch 2 (ungleiche Zellen am Schlitzende): Lippenspanne 2× → 1,9°, 3× → 11°, 6× → 17°; flache Zellen (1 : 3) → 12°;
  Wachstum 1,5 je Zelle nach außen → 0,6°. Am Mundwinkel zählen also gleich große, etwa quadratische Zellen.

**Messung (39 ausgeglichene Fälle, Haut-Abstand der Linie ≤ 1 px, Startgitter → A6 → A7, Knick auf Stufe 3):**

| | Schleifengitter | Kernring heute |
|---|---|---|
| Knick ≤ A0 + 2° (Tor) | 0 | 5 |
| Knick ≤ 12° | 0 | 29 |
| Knick > 90° | 39 | 7 |
| Haut gegen A0 | 0,2–0,5 px (Kugel/Ei/Langhals) | 0,2–1,3 px |
| Viereckgüte | 1–47° / bis 10 : 1 | 1–38° / bis 18 : 1 |

Gute Fälle: Kugel/Ei/Birne „mittel“ und „hoch“ (4,4–9,8° am Mundwinkel), Langhals 6,9–7,2° (A0 6°). **Offen (ehrlich):**
1. Die Karte ist um c nicht symmetrisch, sobald die letzte Lippenspanne einige Dreiecke groß ist: Dieselbe Hautweite liegt auf
   beiden Schlitzseiten verschieden weit von V_c (Ei tief J: 0,077 gegen 0,037) — der Fächer ist in ζ' symmetrisch, auf der Haut
   aber gedreht. → örtliche, auf der Haut symmetrische Auffaltung um c (Polarkoordinaten in der Tangentialebene) für die innersten
   Reihen.
2. Schiefe Felder (Feldrandmitte bis 0,45 in V neben der Verlängerung: Robbe hoch, Rex tief, J-Linien) verzerren die äußere Stufe
   (Viereckgüte bis 1°, 18 : 1), Robbe hoch faltet einmal. → Übergangsreihe mit 3/5-Polpaaren (Register, A5 Weg 2) oder
   ausgeglichene Feldwahl.
3. Konforme Lippenstellen passen schlecht zu verwickelten Linien (Rex mittel: Lippe 5,6 px statt ≤ 1). → Stellen nach Bogenlänge
   und Krümmung, nur zum Mundwinkel hin konform gestuft.
4. Haut 0,6–1,2 px (Tor 0,25): kleineres J als vorher (Kugel mittel J = 4 statt 7) und die schiefen Zellen der äußeren Stufe.

## Nachtrag E1 (21.10. mittags): Wo der Knick am Mundwinkel herkommt

- **Kissen-Vorversuch 3** (Kernring-Topologie auf einem Kissen mit idealer Lage: Reihe r = Quadratring der halben Größe r·h um
  das Schlitzende, Dreierpole an den Ringecken): bei gleich großen Quadraten um c **1,0°** am Mundwinkel (Gitter 3,7°). Lippen-
  spanne 2 × Reihenhöhe → 14°, Reihenhöhe 2 × Lippenspanne → 10,5°, Spanne 1 : Reihe 0,5 → 16°. Die Topologie ist also gut;
  am Mundwinkel zählt allein, dass die vier Zellen um c etwa gleich große Quadrate sind.
- **Fächer im echten Feld gemessen** (Winkel und Abstand von U'_m, U'_{m+1}, E, D'_{m+1}, D'_m in der Tangentialebene an c):
  heute 3–10-mal näher an c als die letzte Lippenspanne (1–5 px gegen 7–20 px) und um 20–50° gekippt; Startlage (ohne A7) am
  Mundwinkel 3–10°, A7 ändert ±2°. Die konforme Lage ist um c parabelförmig (Reihe 1 umrundet c wie eine Parabel mit c im
  Brennpunkt: E im Abstand D, U'_m in 2D) — das ist die echte Konformgeometrie und begrenzt den Knick auf etwa 5–10°.
- **Gemessen und verworfen** (je Variante an vier bis acht Fällen): Gewichte nach Hautlänge am Mundwinkel (E bleibt an c, Fächer
  kippt nach hinten); radiale Umparametrisierung Φ (nahe c hautgleich) — Größen stimmen, Winkel gestaucht (U'_m 65° statt 90°);
  Fächer fest als Quadrat in Φ — faltet (die Reihen dahinter passen nicht); innere Stufe in W' = ζ² − x_c — Größen stimmen, fern
  von c verzerrt, faltet außen; Polarkoordinaten auf der Haut um c (überblendet) — Fächer symmetrisch, aber weiter gestaucht;
  Ideallage nur in den inneren Reihen eingesetzt — faltet (Reihen dahinter widersprechen). Lehre: Tutte mit gleichen Gewichten
  in einer winkelhalbierenden Auffaltung ist nicht das Quadratgitter; die Ziel-Lage muss als Ganzes (mit den Reihen dahinter)
  vorgegeben und faltenfrei eingebettet werden.
- **Lippenwulst läuft zur Spitze aus** (nur Kernring): Das Wulstband um die Lippe legte eine Beule auf den Mundwinkel (1–2°).
  Birne mittel 6,1 → 3,6°, Kugel mittel 5,4 → 4,4°, Kugel hoch 5,7 → 5,0°.
- **Weg (technisch entschieden):** Ziel-Lage nahe c als Quadratgitter auf der Haut (Reihe r im Abstand r·h, h = |c − U_{m−1}|)
  samt den Reihen dahinter, übergeblendet in die heutige Lage; eingebettet nach Tutte mit Mittelwertgewichten aus der Ziel-Lage
  (positiv, linear genau: gibt die Ziel-Lage wieder, wo sie gültig ist; faltenfrei, weil der Rand konvex bleibt). Dazu die
  Lippenstellen zum Mundwinkel hin auf h stufen und das Feld hinter dem Mundwinkel verlängern, wo es für zwei, drei Quadrate
  nicht reicht.
- **Bilder** (Nahaufnahme um die Lippenspitze, je Fall A0 · Einsatz · Abstand zu A0 · Zebra):
  `docs/progress/editor/e1-mundwinkel-schleifengitter-2026-10-21.png` (Zebra reißt am Mundwinkel — die Falte) gegen
  `docs/progress/editor/e1-mundwinkel-kernring-2026-10-21.png` (Streifen laufen glatt durch; dafür Haut 0,7–1,3 px statt 0,2–0,5,
  weil die konforme Reihenzahl kleiner ist). Skript `apps/editor/scripts/pruefen/einsatz-loesen.ts` mit `GITTER=kernring NAH=4`.

## Nachtrag E1 (21.10. nachmittags): Haut wieder genau — Florian: „Mach zuerst die Haut wieder genauer (0,25 px), dann den Mundwinkel.“

**Ursache der groben Haut im Kernring:** (1) die konforme Reihenzahl ist klein (Kugel mittel J = 4), (2) die Speichen stehen so
weit auseinander wie die Randkanten von K1 (≈ 24 px an der Kugel): Auf runder Haut gibt ein Kontrollabstand h etwa h²/8R
(24²/(8 · 230) ≈ 0,3 px) — ohne feineres Gitter ist 0,25 px nicht erreichbar; (3) große Felder: Die Karte staucht den Feldrand
weit hinter dem Mundwinkel konform (viele Randpunkte in einem schmalen V-Band), gleiche Gewichte in der Karte geben dort auf der
Haut Zellen bis 50 : 1. Der Lippenwulst ist es nicht (ohne Wulst gleich).

**Gebaut (Schalter, ohne sie bitgleich):**
- `einsatzFall(…, { stufe: 2 })`: Feld auf **K2** (zweimal exakt verfeinert, gleiche Grenzfläche wie A0, alle Abstände halb so
  groß, Lippenauflösung doppelt). Feldradius bleibt 3 Kanten von K1 (physisch gleich), `M_MAX` doppelt
  (`feldMitGerademRand(…, mMax)`). A7 dann mit `a0Netz(k, 1)` und `{ stufen: 1 }`, Messen mit `einsatzMessen(…, 2)`.
- `einsatzTopologie(…, { aussenRunden })`: äußere Stufe nach Hautlängen ausgeglichen (Gewicht ← √(alt · Hautlänge/Kartenlänge),
  auf den Median normiert; positive Gewichte im konvexen Kartenrechteck, also faltenfrei).

**Gemessen (Haut gegen A0, max / 99 %, px):**

| Fall | K1, J konform | K1, J 8 | K2, J 8 | K2, J 12, Ausgleich 6 |
|---|---|---|---|---|
| Kugel mittel gerade | 0,75 / 0,66 | 0,41 / 0,23 | 0,25 / 0,16 | **0,16 / 0,10** |
| Kugel tief gerade | 0,95 | – | 0,73 / 0,43 | **0,22 / 0,09** |
| Kugel hoch gerade | 1,01 | – | 0,63 / 0,36 | **0,20 / 0,09** (J 12, Ausgleich 6) |
| Ei mittel S | 1,27 / 0,58 | 0,70 / 0,27 | 0,68 / 0,43 | **0,16 / 0,10** |
| Ei tief gerade | 0,37 | – | 0,22 / 0,15 | **0,16 / 0,07** |
| Birne mittel gerade | 0,68 / 0,46 | 0,54 / 0,30 | 0,38 / 0,23 | **0,17 / 0,11** |
| Langhals hoch gerade | 0,32 / 0,19 | 0,25 / 0,14 | 0,28 / 0,14 | **0,17 / 0,11** |

Zum Vergleich das alte Schleifengitter (K1): 0,16–0,49 px. Rex und Robbe bleiben bei 2–4 px nahe der Lippe: Das sind die
eigenen Falten bzw. die feine Kerbe von A0 im Feld (gehört zu E2: „Falten von A0 im Feld laufen auf einer Spalte weiter“),
keine Frage der Auflösung. Knick am Mundwinkel unverändert 4–10° (nächster Schritt).

**Offen für den nächsten Schritt (Haut):** K2 + J nach Feldgröße (Kappe 16 statt 8) + Ausgleich außen (6 Runden) als Standard des
Kernrings; A7 auf einen dünn besetzten Löser umstellen (heute dichte LU: bei M ≈ 35 und J = 12–16 dauert ein Fall 10–30 s);
dann die ganze Reihe und ein Haut-Tor als Test (≤ 0,25 px, wo A0 keine eigenen Falten im Feld trägt). Messskript
`apps/editor/scripts/pruefen/teilA/e1-haut.ts` (`STUFE=2 JS=12 AR=6`).

## Nachtrag E1 (21.10., zweite Sitzung): Haut als Standard, Mundwinkel ohne Wulst

Florian: „Weiter mit Teil A, E1 nach der Übergabe: zuerst die genaue Haut als Standard des Kernrings …, dann den Mundwinkel
(Quadratgitter um c). Es muss für alles eine elegante und saubere Lösung geben!“

**Haut: Standard des Kernrings (gebaut, Tor erreicht)**
- Dünn besetzte Normalgleichungen in A7 (`einsatzLoesen`) und in der Lage (`kernGitter`), wie im Körper (`normalSystem`). Ein
  Fall auf K2 (Topologie, Lippe, Haut, Messen) braucht ≈ 3–4 s statt 10–30 s.
- **Schlitz genau auf der Linie** (`schnittAufLinie` in `einsatz/flaeche.ts`): Die Punkte des Kantenpfads rücken auf die Linie
  (Schritt halbiert, solange ein Dreieck klappen würde). Auf K2 lag der Pfad bis 2,8 px neben der Linie; Lippe (auf der Linie)
  und Haut (am Pfad) widersprachen sich, am Mundwinkel entstanden Falten von 160–179°.
- Der Prüffall baut jetzt den Standard: Feld auf K2, Schlitz auf der Linie. `FALL_ALT` (K1, Kantenpfad) hält die alten
  Prüfungen bitgleich. Reihenzahl konform passend, auf K2 zwischen 10 und 16; Ausgleich außen 6 Runden.
- **Ganze Reihe** (39 ausgeglichene Fälle): Haut ≤ 0,25 px in 30 von 30 ohne Rex/Robbe (Median 0,12, max 0,22); außen
  bitgleich und Spiegel bitgenau in allen 39. Rex und Robbe 2–4 px: eigene Falten von A0 im Feld (E2).
- Tests: `einsatz/kernring.extrem.ts` (ganze Reihe im Extrem-Lauf: Haut-Tor; Mundwinkel-Tor als `it.fails`), Wächter an drei
  Fällen in `einsatz/kernring.test.ts`. Skript `apps/editor/scripts/pruefen/teilA/e1-reihe-k2.ts`.

**Mundwinkel: was den Knick wirklich machte**
- **Messung ehrlich gemacht:** Der Umkreis der Mundwinkel-Messung sind jetzt drei Kanten des Feldkäfigs (≈ 20 px). Vorher
  waren es drei letzte Lippenspannen; der Bereich schrumpfte mit kürzeren Spannen und schönte die Zahl (gemessen).
- **Lippenwulst raus** (im Kernring 0, Schleifengitter bitgleich): 0,4 px über ein Band von 3 % der Kopfhöhe sind auf K2 eine
  Steigung bis 12°, die der feinere Käfig auflöst. Längs der ganzen Lippe knickte die Haut um 3–5°; am Mundwinkel war das der
  Hauptgrund für das verfehlte Tor (alter Messbereich: mit Wulst 1 von 39, ohne 28 von 39). Dass sich geschlossene Lippen
  nicht tangential berühren, ist Sache der Tasche (A8). Ein geschlossenes Maul darf auf der Haut unsichtbar sein (Florian
  15.10. zum Rundmaul). Bild vorher/nachher (gleicher Ausschnitt): [`e1-mundwinkel-ohne-wulst-2026-10-21.jpg`](../progress/editor/e1-mundwinkel-ohne-wulst-2026-10-21.jpg).
- **Letzte Lippenspanne ¼ Feldkante** (`eckeMin` auf K2 0,25 statt 1): Die konforme Lage legt Ring 1 am Mundwinkel sehr dicht
  an c. Mit einer ganzen Kante war die letzte Lippenspanne 3- bis 20-mal so lang, die vier Zellen um c waren ungleich. Knick an
  c: Ei tief J 9,4 → 4,8°, Langhals hoch J 14,2 → 8,0°; Rex tief gerade war gefaltet, 179,8 → 9,8°. Gemessen mit 1, 0,5, 0,25
  und 0,1; 0,25 und 0,1 sind gleich gut.
- **Stand** (neuer Standard, fester Messbereich): Mundwinkel-Tor (≤ A0 + 2°) in 26 von 30 ohne Rex/Robbe, 31 von 39 mit.
  Verfehlt: Kugel mittel J 4,4° (A0 1,4°), Ei mittel J 3,9° (1,2°), Ei tief J 4,8° (1,4°), Langhals hoch J 8,0° (6,0°).

**Ursachen der vier übrigen Fälle (gemessen)**
1. **Verdrehung an J-Linien:** Am Haken ist der Feldrand außen länger als innen (um etwa 2 · Feldradius · Hakenwinkel). Die
   Lippe hat oben und unten dieselben Stellen, Speiche k muss aber zu Randpunkt k: An J-Linien sind das rund zehn Speichen
   Versatz. Eine harmonische Lage dreht damit den Fächer um c. Die zwei Stufen der Kartenlage halten den Fächer fest, knicken
   dafür an der festen Reihe J_i (Kugel/Ei mittel J: 3,9–4,4° in den Zellen zwischen Reihe J_i − 1 und J_i).
2. **Die Karte zeigt am Linienende nicht in die Verlängerung:** Ihre Linie V = V_c weicht 1–52° von der Endtangente der Linie ab
   (Median ≈ 11°; die angepasste Lippe ≤ 0,9°). Auf einem feineren Netz (Stufe 4) bleibt das so: In einem schief liegenden Feld
   ist die Linie V = V_c schon im Stetigen nicht die gerade Verlängerung. Der Fächer um c liegt deshalb gegen die Lippe gekippt
   (Ei tief J, Langhals hoch J: Knick an c).

**Gemessen und verworfen** (je an vier bis sieben J- und Vergleichsfällen; der Code ist wieder ausgebaut)
- Normalenbindung in A7 (jede feine Kante in der Tangentialebene von A0): Haut gleich, Knick an c schlechter (9,4 → 11,2°,
  14,2 → 17,8°). Der Knick an c kommt aus der Lage, nicht aus dem Lösen.
- Zellform ausgleichen, jede Zelle ein Quadrat (MIPS mit Sperre gegen Umklappen, Newton, vorher entwirrt): Bei fester
  Speichenzahl um c ist das konforme Gitter logarithmisch-polar, die Ringe ziehen sich spiralig auf c zusammen. Mundwinkel
  schlechter (Kugel tief J 3,8 → 7,5°).
- Zellform zur Kissen-Vorlage über das ganze Feld (symmetrische Dirichlet-Energie): Die Vorlage passt nicht zur Feldform,
  Zellen bis 32 : 1, Falte 178°.
- Reihen nach Hautlänge auf die Speichen der Karte (erste Reihe in der Lippenspanne): faltet an c (179°). Die Speichenrichtungen
  der Karte an c sind falsch; die Stauchung hatte das nur verdeckt.
- Naht der beiden Stufen glätten (Laplace auf der Haut): gemischt (Kugel tief J 3,2 → 2,0°, Ei mittel J 3,9 → 8,4°).
- Feld hinter dem Mundwinkel verlängern (`verlaengerung` 0,5 und 1): gemischt; große Mäuler stoßen an die Grenze der
  Lippenauflösung (m 34 → 14).
- Lage „Band“ (Kissen in zwei Ringen um die Lippe, Rest in einer eigenen Karte; bleibt als Versuch `lage: 'band'`): Wo es nicht
  faltet, ist der Mundwinkel hervorragend (Langhals hoch J 6,6° bei A0 6,0°, Birne J 0,9–1,4°). Die Kissen-Topologie stimmt
  also. Es faltet aber dort, wo die Verdrehung (1.) dicht hinter dem Band aufgenommen wird (Zellen über 90° geschert).

**Weg (Vorschlag für den nächsten Schritt):** Die Verdrehung nicht als Scherung, sondern in der Topologie aufnehmen: eine
Übergangsreihe mit Polpaaren (5er außen am Haken, 3er innen), sodass außen mehr Speichen zum Feldrand laufen als innen. Dann
kann um c das Kissen liegen, der Rest nimmt die Feldform ohne Drehung auf, und die Naht der beiden Stufen entfällt.
Alternativ ein ausgeglichenes Feld (Randpunkte oben und unten gleich verteilt). Beides erst an den vier Fällen beweisen.

## Nachtrag E1 (21.10., dritte Sitzung): Mundwinkel an J-Linien — Feld, Fächer, Naht

Florian: „Ja, mach hier mit der Verdrehung an J-Linien weiter (Übergangsreihe mit Polpaaren), bis das Mundwinkel-Tor auch an den
vier J-Fällen hält.“

**Ergebnis: Mundwinkel-Tor in 30 von 30** (ganze Reihe, 39 ausgeglichene Fälle, Rex/Robbe bis E2 ausgenommen):

| | zweite Sitzung | jetzt |
|---|---|---|
| Mundwinkel ≤ A0 + 2° (ohne Rex/Robbe) | 26 von 30 | **30 von 30** |
| größter Abstand Mundwinkel − A0 | 3,5° | 1,5° (J-Linien 0,9°) |
| größter Knick im Feld − A0 | 4,8° | 1,9° |
| Haut gegen A0 (ohne Rex/Robbe) | max 0,22, Median 0,12 px | max 0,09, Median 0,07 px |
| Lippe (alle 39) | bis 2,7 px | ≤ 0,44 px |
| umgeklappte Zellen | 2 Fälle (Robbe hoch) | keine, auch an Rex/Robbe |
| Rex/Robbe: Knick (A0 9–105°) | bis 179° in 3 Fällen | 9–43° |
| Rex/Robbe: Haut | 0,15–4,1 px | 0,08–1,0 px |

Die vier J-Fälle am Mundwinkel: Kugel mittel J 4,4 → 1,8° (A0 1,4°), Ei mittel J 3,9 → 1,1° (1,2°), Ei tief J 4,8 → 2,0°
(1,4°), Langhals hoch J 8,0 → 5,6° (6,0°). Bild (gleicher Ausschnitt, A0 · Einsatz · Abstand · Zebra; vorher franst das Zebra
unter dem Mundwinkel aus): [`e1-mundwinkel-j-linien-2026-10-21.jpg`](../progress/editor/e1-mundwinkel-j-linien-2026-10-21.jpg).

**Die Polpaare waren nicht der Hebel (ehrlich).** Die Verdrehung (Speiche k → Randpunkt k bis ±20 Speichen versetzt) gibt es
auch in Fällen, die das Tor halten; sie entscheidet nicht über den Knick an c. Gebaut wurden stattdessen drei Dinge — alle im
Kern, Standard des Kernrings auf K2, K1 und `FALL_ALT` bleiben bitgleich:

1. **Feld begradigt bis 1,5 Radien** (`feldWaehlen(…, { kappe })`, `einsatzFall(…, { kappe })`, Standard auf K2 1,5): Ganz
   begradigt wuchs das Feld auf K2 über den Kopf und lag schief zur Linie (Rex mittel: 3008 Flächen, aber nur 64 Randpunkte —
   m = 14, die Lippe fiel auf eine grobe Auflösung zurück). Das reine Band (kompakt) setzte an Buckel zwei Fünferpole
   nebeneinander (Kugel hoch gerade: 66° in der letzten Zellreihe). Gekappt bleibt das Band um die Linie ohne Kerben und Buckel,
   konkave Ecken an der Kappe nimmt der Kernring als Dreierpole. Die Lippenauflösung folgt der Länge des Bands (keine Obergrenze
   `M_MAX` mehr auf K2, m 15–58). Allein: Mundwinkel 28 von 30, J-Linien bis 2,5° über A0.
2. **Fächer um c als Halbkreis** (`faecherKreis`, Option `faecher: 'kreis'`): Die fünf Punkte der Reihe 1 um c liegen in der
   Tangentialebene bei 90°, 45°, 0°, −45°, −90° gegen die Verlängerung des Schlitzes, im mittleren Abstand ihrer Tutte-Lagen;
   danach wird die innere Stufe neu gerechnet. Das ist das „Quadratgitter um c“ aus dem Nachtrag vom Mittag, als feste Vorgabe
   nur für den Fächer — die Reihen dahinter legt Tutte. Allein aus der Karte lag der Fächer gekippt: Die Karte gibt den beiden
   Schlitzufern an der Spitze verschiedene V-Abstände (an J-Linien oben bis 2-mal so weit wie unten; eine Eigenart der Dreiecke
   an der Spitze, die beim Verfeinern bleibt). Der Halbkreis liegt ganz auf der Haut (Mittelpunkt = Lage von c in der Karte);
   um den Kontrollpunkt c gebaut faltete er dort, wo die Linie neben der Haut liegt (Langhals mittel bis 63 px, 19–32 Zellen).
   Mit 1.: 30 von 30, J-Linien höchstens 0,9° über A0.
3. **Nahtspeichen auf den Kartenlinien ihrer Reihen** (Option `naht: 'karte'`): Nach Bogenlänge passten sie nicht zu Reihe J_i,
   die ganz auf ihrer Kartenlinie liegt. Wo die Karte längs der Naht ungleich dehnt (Robbe hoch: Reihe J_i trifft die Naht nach
   Bogenlänge bei einem Fünftel ihres U), läuft der Rand der äußeren Stufe zurück, sie ist nicht mehr konvex, und Zellen klappen
   um (Robbe hoch 5–7, Rex mittel 3–4, Rex tief S 2 — mit dem gekappten Feld wurden Rex und Robbe erst echte K2-Fälle). Auf den
   Kartenlinien bleibt jede Stufe ein Rechteck, Tutte bleibt faltenfrei. Die 30 übrigen Fälle ändern sich kaum (Mundwinkel
   ≤ 0,02°, Haut ± 0,01 px, Knick ± 0,5°).

Über alle 54 Fälle (auch die 15 mit der Linie neben der Haut): umgeklappte Zellen 64 → 1 (Langhals mittel gerade, Linie 21 px
neben der Haut; vorher ebenfalls 1).

**Gemessen und verworfen** (Code wieder ausgebaut): Übergangsreihe mit Polpaaren (Prämisse falsch, s. o.); symmetrischer
Schlitz in der Karte (oben und unten gleiche V-Abstände um die Spitze; allein zu wenig, mit dem Fächer unnötig, Zellen bis 24 : 1);
Auffaltung der Karte an der Spitze (Kotangensgewichte in Wurzelkoordinaten — ohne Wirkung); Ortskarte (innere Stufe in
Abstandskoordinaten zur Lippe — faltet an c); reines Band mit geglättetem Rand (die Fünferpole bleiben); Fächer als Quadrat statt
Kreis (faltet an einer J-Linie); Fächer hinterher drehen (Ring 1 und 2 auf die Sollwinkel — gemischt).

**Tests:** Mundwinkel-Tor in `einsatz/kernring.extrem.ts` jetzt `it` (vorher `it.fails`), das Haut-Tor verlangt dort zusätzlich
„nirgends umgeklappt“ auch an Rex/Robbe; neue Wächter in `einsatz/kernring.test.ts`: Mundwinkel an drei J-Linien und keine
umgeklappte Zelle an Robbe hoch (beide am alten Code rot gegengeprüft: 4,42 / 4,83 / 8,01° über der Grenze, 5 Zellen).
Skripte: `teilA/e1-reihe-k2.ts` und `einsatz-loesen.ts` mit `KAPPE`, `FAECHER`, `NAHT` (`KAPPE=0 FAECHER=tutte NAHT=bogen` = Stand
der zweiten Sitzung), `teilA/e1-gitterbild.ts` ebenso.

**Offen (Register „Befunde aus E1“):**
- Rex/Robbe bleiben bis E2 außerhalb der Tore: Haut 0,6–1,0 px und Knick 23–43° an Rex mittel und Robbe hoch, wo A0 eigene
  Falten im Feld trägt (Schnauzenkante 105°, Kerbe 18°); Rex tief J am Mundwinkel 8,6° (A0 4,3°).
- Robbe hoch: Die Linie trifft die Naht spitz. Die konforme Karte drängt die Speichen über den ersten Lippenstellen an die Naht
  (V wächst dort mit der dritten Potenz des Abstands), Reihe J_i liegt über ihnen gerade → Zellen bis 57 : 1 an Reihe J_i (vorher
  6,5 : 1, dafür umgeklappt). Weg: Reihe J_i nahe der Naht nach Bogenlänge statt über den Lippenstellen, oder ein eigener
  Schlitzanfang mit Polen.
- Spitze Zellen in der letzten Zellreihe am Feldrand (Ecken des gekappten Felds, bis 1,4°; vorher an der Stufennaht bis 2,1°);
  der Knick dort bleibt unauffällig.

**Nächster Schritt nach Plan:** E2 (A0 wie im Editor; Falten von A0 im Feld laufen auf einer Spalte weiter — das betrifft genau
Rex und Robbe).

## E2 im Detail (21.10., dritte Sitzung — Florian: „Ja, mach hier mit E2 weiter (A0 wie im Editor, Rex und Robbe in die Tore).“)

**Ziel:** Der Einsatz arbeitet auf dem A0, das der Editor wirklich baut, und hält die Tore an allen Körpern, auch an Rex und
Robbe. Bis E1 baute der Prüffall A0 mit dem alten `ableiten` (frisch gewählte Ringe, ohne glatte Haut) und ließ Rex/Robbe aus den
Toren, weil A0 dort eigene Schärfen im Feld trägt, die der Einsatz verliert.

**Befund vor dem Bau** (Feld auf K2, Standard des Kernrings):
- Schärfen von A0 im Feld haben nur Rex mittel (32 scharfe Kanten, 26 davon praktisch unendlich, und die Schnauzenspitze als
  scharfer Punkt) und Robbe hoch/mittel (ein scharfer Punkt an der Schnauzenfront auf der Naht). Beim Rex ist die Falte eine
  kurze **Querfalte** aus einer Ecke im Top-Umriss: Sie kreuzt die Maullinie fast rechtwinklig und endet im Feld; die Linie
  beginnt genau an der Schnauzenspitze. Die Topologie zählt sie heute als `verloreneFalten`.
- **A0 wie im Editor** (Startkugel, eingefrorene Ringe, umgeformt, glatte Haut, „berühren mittel“) ändert daran nichts, bringt
  aber vier Robbe-Fälle auf die Haut (Linie ≤ 1 px) und verschiebt die Zahlen: ganze Reihe 43 Fälle, Haut max 0,10 px ohne
  Rex/Robbe, Mundwinkel 29 von 30 (Birne mittel S 3,47° bei A0 1,26°), Lippe > 1 px an Rex mittel (1,5 / 1,1) und Robbe hoch J
  (2,6), Robbe hoch J faltet (172°; A0 selbst hat dort 72°), Rex tief J am Mundwinkel 6,6° (A0 3,3°).

**Schritte** (je Schritt Test vorher rot, Reihe, Bild, Stand hier):
- **E2.1 A0 wie im Editor im Prüffall** (gebaut als Option `einsatzFall(…, { a0: { art: 'editor', plan } })`, `editorBauen` aus
  dem Prüfstand der Extremreihe; alter Weg bitgleich). Wird Standard auf K2, sobald die Tore dort halten.
- **E2.2 Mundwinkel auf dem Editor-A0:** Birne mittel S und Rex tief J verstehen und lösen.
- **E2.3 Schärfen von A0 im Feld:** (a) eine Falte, die den Schlitz kreuzt, läuft oben und unten auf je einer Speiche (Speiche
  über der Lippenstelle, an der sie den Schlitz kreuzt; Gitterpunkte auf der Falte, Schärfe von A0 übernommen); (b) ein scharfer
  Punkt im Feld wird ein Gitterpunkt mit seiner Punktschärfe (auf der Naht ein Punkt der Nahtspeiche, am Linienanfang U₀);
  (c) Falten im Feld, die den Schlitz nicht kreuzen (P-Linien neben dem Maul), auf der Speiche oder Reihe, die ihrer Richtung folgt
  — erst wenn ein Fall es zeigt.
- **E2.4 A0-Varianten:** Querschnitt aus der Hülle (`umrisseExakt`), P-Linien am Maul, Loops; je Variante die ganze Reihe.
- **E2.5 Tore an allen Körpern** (auch Rex/Robbe): Haut ≤ 0,25 px gegen A0, Mundwinkel ≤ A0 + 2°, Knick im Feld ≤ A0 + 2°,
  nirgends umgeklappt, Lippe ≤ 1 px, außen bitgleich, Spiegel bitgenau; Standard umstellen, Tests, Bilder.

## Stand E2 (21.10., dritte Sitzung): A0 wie im Editor, Spitzen von A0, Tore an Rex und Robbe

**Ergebnis** (ganze Reihe auf dem neuen Standard, 43 ausgeglichene Fälle — vier Robbe-Fälle mehr als auf dem alten A0, weil
ihre Linie jetzt auf der Haut liegt):

| | Stand E1 (A0 alt, ohne Rex/Robbe) | E2 (A0 wie im Editor, alle Körper) |
|---|---|---|
| Mundwinkel ≤ A0 + 2° | 30 von 30 | **43 von 43** (größter Abstand 1,5°) |
| Haut-Tor (≤ 0,25 px, Knick ≤ A0 + 2°, Lippe ≤ 1 px, nirgends umgeklappt) | 30 von 30 | **39 von 43** |
| Haut ohne Rex/Robbe | max 0,09 px | max 0,09 px, Median 0,06 |
| Rex/Robbe Haut | 0,08–1,0 px | 0,07–0,37 px |

Bild (gleicher Ausschnitt um den Linienanfang, A0 wie im Editor, vorher Stand E1, nachher E2):
[`e2-spitzen-anfang-2026-10-21.jpg`](../progress/editor/e2-spitzen-anfang-2026-10-21.jpg).

**Gebaut** (Standard des Kernrings auf K2; K1 und `FALL_ALT` bitgleich):
1. **A0 wie im Editor** (E2.1, `einsatzFall(…, { a0 })`, Standard auf K2): Startkugel, eingefrorene Ringe, umgeformt, glatte Haut,
   „berühren mittel“, genauer Bau mit Zurückschreiben der Stationen (`editorBauen` aus dem Prüfstand der Extremreihe).
2. **Ausgleich der Stufennaht** (`nahtAusgleich`, ein Schritt): Reihe J_i gleitet auf ihrer Kartenlinie zum Mittel ihrer
   Speichennachbarn, beide Stufen neu. Die Verdrehung an J-Linien nimmt die äußere Stufe harmonisch auf, gleich hinter J_i am
   stärksten (Rex tief J: die E-Speiche dreht dort um 58°); ein Schritt halbiert den Knick der Speichen an der Naht (Rex tief J
   am Mundwinkel 6,6 → 4,1° bei A0 3,3°).
3. **Letzte Lippenspanne 0,15 Feldkante** (statt 0,25): Sie war noch doppelt so lang wie der Fächerradius (ρ/h Median 0,47 →
   0,66; kürzer ändert nichts mehr, dort bestimmt die konforme Lage die Spanne). Birne mittel S 3,5 → 2,8° (A0 1,3°).
4. **Spitzen von A0 übernehmen** (`spitzen`): Eine Spitze auf der Naht im Feld wird der Nahtpunkt der nächsten Reihe mit ihrer
   Punktschärfe (Robbe mittel: Haut 0,58 → 0,14 px); beginnt die Linie an einer Spitze (Rex mittel: Schnauzenspitze, die Linie
   verlässt die Naht unter 46–69°), bekommt die Lippe dort eine Ecke — U₀ und D₀ mit der Punktschärfe, in der Lippe
   (`lippeAnpassen(…, { anfang: 'ecke' })`) der Phantompunkt 2U₀ − U₁ statt des Spiegelbilds (Lippe 1,5 → 0,7 px). Ohne die
   passende Lippe war die Ecke schädlich (Haut 3,8 px) — Käfig und Lippe brauchen dieselbe Regel.
5. **Naht nach Bogenlänge auf einer umparametrisierten Karte** (`naht: 'bogenKarte'`, `nahtBogen`): U' = Bogenlängenanteil auf
   der Naht, zum Mundwinkel hin quadratisch in U' = U übergehend; jede Stufe bleibt ein Rechteck (anders als die alte Naht nach
   Bogenlänge, die mit Reihe J_i kollidierte). An einem spitzen Schlitzanfang lagen die Reihen auf der Naht vorher weit auseinander
   (Robbe hoch: erste Reihe 42 px vom Anfang, die übrigen 4–9 px). Rex mittel 0,51 → 0,18 px, Robbe hoch 1,36 → 0,37 px; die 30
   übrigen Fälle ändern sich nicht messbar.
6. **Knickmaß ohne die Umgebung von Spitzen** (`groessterKnick(…, ohne)`): Kanten im Umkreis einer Feldkante um eine Spitze von A0
   (beim Einsatz auch um seine eigenen Spitzen) zählen nicht, bei A0 und beim Einsatz gleich. An einer Spitze gibt es keinen
   glatten Bezug; der Winkel zwischen den feinen Flächen dort hängt allein am Netz um sie (Robbe mittel 74,7° gegen A0 71,7° bei
   0,14 px Haut). Ein Umkreis von einer halben Feldkante reichte nicht: Eine Ecke wirkt in Catmull-Clark auf ihren ganzen
   Käfig-Ring. Das Maß sucht Falten in glatter Haut; scharfe Kanten zählte es schon vorher nicht.

**Gemessen und verworfen:** eine Stufe statt zwei (faltet an J-Linien, 160–180°); einen Teil der Verdrehung schon in Reihe J_i
(faltet an c); Reihe J_i weiter außen (der Knick wandert mit hinaus, Feld 48–178°); Fächerachse aus der Endtangente der Linie
bzw. aus der letzten Lippenkante (Birne mittel S 3,3°, andere schlechter); Fächerradius = letzte Lippenspanne (faltet); ganzer Ring
um c fest (schlechter); drei Schritte Nahtausgleich (Ei tief J klappt um); Polpaare für die Verdrehung (am Haken bis 25 Randpunkte
versetzt — viel zu viele Pole).

**Offen** (Register „Befunde aus E2“; im Extrem-Lauf als `OFFEN` und `it.fails` über alle Fälle):
- **Robbe hoch** (Linie beginnt oben auf dem Kopf, die Oberseite des Schlitzes ist ein schmaler Streifen unter der Kopfnaht): Die
  Haut faltet in den ersten oberen Lippenzellen (176–179°). Ursache: An einem spitzen Schlitzanfang staucht die konforme Karte
  auch quer zur Naht (V ∝ r³); die Ring-1-Punkte über den ersten Lippenstellen fallen in 3D zusammen. Weg: Eckenentfaltung am
  Schlitzanfang (Potenzabbildung des Kartenwinkels auf den wahren Winkel, wie die Wurzelauffaltung um c).
- **Rex mittel J** (Haut 0,30 px, Knick 44,7° bei A0 27,1°): Die Querfalte von A0 kreuzt den Schlitz nahe dem Anfang und läuft
  schräg zur Naht unter dem Kiefer. Im Kernring ist das keine Gitterlinie (Speichen enden am Feldrand, Reihen an der Naht); die
  Falte geht im Einsatz verloren. Weg: eine eigene Kappe um die Spitze (Polargitter um U₀, die Falte als äußerer Ring).
- **Robbe tief J** (Knick 16,8° an der Lippe bei A0 11,2°): Die Lippe hat bei Stelle 12 einen Buckel quer zur Haut (zweite
  Differenz 4,5 px, an der Kugel 0,1 px); vermutlich zieht die gezeichnete Linie dort über eine Wölbung von A0. Stärkere Glättung
  der Lippe drückt ihn (1,3 px), kostet aber Lippengenauigkeit (0,51 px).
- E2.4 (A0 mit Querschnitt aus der Hülle, P-Linien am Maul, Loops) ist noch nicht gemessen; scharfe Punkte neben der Naht und
  Falten, die den Schlitz kreuzen und am Feldrand enden, sind vorbereitet, aber ohne Fall.

**Tests:** `kernring.extrem.ts` — Haut-Tor jetzt an allen Körpern (Knick ≤ A0 + 2° statt ≤ 30° ohne Rex/Robbe) außer der Liste
`OFFEN`, dasselbe Tor über alle Fälle als `it.fails`, Mundwinkel-Tor an allen 43; `kernring.test.ts` — Lippe als Falte jetzt mit
Ecke am Anfang (Rex mittel S, Unterteilung gegen B-Spline 1,7e-16), neuer Wächter „Spitzen von A0“ (Robbe mittel, Rex mittel
gerade; am alten Code rot: Haut 0,64 / 0,86 px, Knick 46° bei A0 18°). Skripte mit `A0`, `NR`, `SPITZEN`, `ANFANG`.

## Nachtrag E2 (21.10., abends): Befund an den drei offenen Fällen, Weg „Leiter“

**Robbe tief J — gelöst (Lippenziel auf der Haut):** Die gezeichnete Linie lag zwischen 8 und 45 % ihrer Länge bis 0,75 px neben
der Haut von A0: Ihre Tiefe kommt aus 16 Knoten mit Tiefe von der Haut (`linieAufHaut`, Teil H), dazwischen kubisch; nahe der
Silhouette ist die Tiefe steil, die Linie wellt sich (zweite Differenz 0,5–1,2 px je 1/64). Der Schlitz liegt längst auf der Haut
(`linieAufNetz`), die Lippe (A6) folgte aber der gewellten Linie — Kontrollpunkte abwechselnd ±0,5 px, Buckel bei Stelle 12. Neu:
`einsatzFall(…, { lippeAufHaut })` legt das Lippenziel wie den Schlitz auf die Haut (nächster Punkt). Robbe tief J: Knick
16,8° → 11,2° (A0 11,2°). Ein Strahl längs z (Seitenlage bleibt) klappt an Kugel tief J nahe der Silhouette um (176°) — der
nächste Punkt ist die robuste Wahl; die Seitenlage ändert sich dabei um höchstens den Abstand zur Haut.
Ganze Reihe (43 Fälle) mit Lippenziel auf der Haut gegen heute: Robbe tief J ins Tor; Mundwinkel genauer an 13 Fällen (Birne hoch
gerade 2,9 → 1,2°, Kugel tief S 2,1 → 1,0°, Birne mittel S 2,8 → 1,2°), Lippe genauer an Robbe mittel (0,56 → 0,09 px); Haut
unverändert (ohne Rex/Robbe max 0,09 px). **Aber Rex mittel gerade fällt heraus** (Knick 24,7° → 39,1° bei A0 27,1°) — dort
sitzt der Knick an der verlorenen Falte (siehe unten), kleine Änderungen am Lippenrand kippen ihn. Deshalb vorerst nur Option
(`LAH=1` in den Skripten); Standard zusammen mit der Leiter. Haut-Tor in beiden Fällen 39 von 43.

**Robbe hoch — Ursache berichtigt:** Kein spitzer Schlitzanfang (am Anfang 78° zwischen Naht und Linie), sondern ein **schmaler
Streifen**: Die Linie läuft fast über ihre ganze Länge 1,5 (gerade) bzw. 0,4 (J) Feldkanten unter der Kopfnaht (Seitenansicht:
knapp unter dem oberen Umriss). Die konforme Karte staucht einen langen schmalen Streifen exponentiell (V/V_c bei 20 % der
Linie 1,9·10⁻³ bzw. 9,9·10⁻⁶, in allen anderen 41 Fällen ≥ 0,06). Im Kernring enden die Reihen auf der Naht und die Speichen am
Feldrand — in einem Streifen zwischen Schlitz und Naht (zwei *benachbarten* Seiten des Kartenrechtecks) laufen deshalb **beide**
Scharen längs des Streifens, für jede Lage: Die Reihen 1–4 liegen an Speiche 3–5 nur 1–2 ‰ neben der Lippe, eine Speiche läuft
dort über die geknickte Kontrollpolygon-Lippe → Zelle umgeklappt, 176°/179°. Keine Lage im heutigen Gitter löst das.

**Rex mittel — Ursache:** Die Falte von A0 ist ein **Ring um die Schnauzenfront** (Unterkante der Frontplatte, Bild
Front/Seite): Sie kreuzt die Linie an Lippenstelle 5 (≈ 36 px hinter der Spitze) und läuft unten bis zur Naht unter der
Schnauze (oben nur drei Kanten weit). Der Knick 44,7° (J) bzw. 24,7° (gerade) sitzt 0,8 bzw. 2,2 px neben ihr; im Kernring ist
sie keine Gitterlinie (eine Speiche endet am Feldrand, nicht auf der Naht) und geht verloren. Weil Rex mittel gerade mit
24,7° knapp im Tor liegt, kippt es schon bei kleinen Änderungen am Lippenrand (Lippenziel auf der Haut: 31,0°).

**Ein Weg für beide: die Leiter (Sprossen zur Naht).** Auf einer Seite enden die Speichen der ersten q Lippenstellen (vom Anfang
O bis zur Halsstelle P) nicht am Feldrand, sondern auf der Naht; t Reihen („Holme“) laufen zwischen Lippe und Naht bis zum Hals
und dann als gewöhnliche Reihen weiter, die Reihen t + 1 … J beginnen auf der Naht hinter dem Hals. Im ganzen Netz ist das eine
Leiter über die schmale Oberlippe (Sprosse = Speiche rechts + Spiegelbild), wie man sie von Hand legen würde.
- Pole: je Leiter und Hälfte ein Dreierpol (Holm t an Sprosse 1, nahe O) und ein Fünferpol (Holm t am Hals). Sonst regulär.
- Zählung: Jede Sprosse spart dem Feldrand eine Speiche; damit die Speichen den Feldrand (2M + 1 Punkte von K1) genau treffen,
  wächst die Lippe: m = M + (q_oben + q_unten − 6)/2 (heute q = 1 je Seite: m = M − 2). q ungerade.
- Hals: bei der Falte die Falte selbst (Sprosse q = die Falte, Schärfe von A0 übernommen; oben läuft das kurze Stück auf der
  Speiche über P weiter, E2.3 a); beim Streifen dort, wo er breiter wird, quer vom Schlitz zur Naht.
- Lage: Feld entlang des Halses in Leiterfeld und Ringfeld teilen, je eine Karte aus vier Randstücken (`karteAusStuecken`) — im
  Leiterfeld liegen Lippe und Naht auf *gegenüberliegenden* Seiten, die Karte staucht dort nicht mehr; im Ringfeld wie heute
  (zwei Stufen um c), mit dem L-förmigen Gitter.
- Robbe hoch J (Streifen 0,4 Kanten) braucht t = 0: Sprossen direkt von der Lippe zur Naht.

## E2.6 Leiter — Bauplan (21.10., abends)

**Gitter** (eine Seite, hier oben; unten gespiegelt über k → S − k). Lippe U₀ = O … U_q = P (Hals) … U_m = c. Leiterfeld zwischen
Lippe, Naht und Hals:
- Holme = Reihen 1 … t (t ≥ 0) parallel zur Lippe; ihre Nahtenden (r, 0) liegen auf der Naht nahe O.
- Sprossen = Speichen 1 … q: U_k → (1, k) → … → (t, k) → X_k auf der Naht; X₁ = (t, 0) (das letzte Holmstück), X_q = Q.
- Zellen: Lippenzellen [U_k, U_{k+1}, (1, k+1), (1, k)], Holmzellen, Kernzellen [(t, k), (t, k+1), X_{k+1}, X_k].
- Dreierpol (t, 1), Fünferpol (t, q) (bei t = 0 beide auf der Lippe).

Ringfeld (der Rest): Reihen 0 … t ab Speiche q (Knoten (r, q) auf dem Hals), Reihen t + 1 … J ab der Naht hinter Q (B_r), Halszelle
[(t, q), (t + 1, q), B_{t+1}, Q]; L-förmiges Gitter. Der Feldrand trifft genau: m = M + (q_oben + q_unten − 6)/2, q ungerade.

**Lage:** Ringfeld in einer eigenen Karte (Feld entlang des Halses geteilt, `karteAusStuecken`: U = 0 Lippe ab P, V = 0 Hals +
Naht hinter Q, V = 1 untere Naht, U = 1 Feldrand) — der Hals steht senkrecht auf der Lippe, die Karte staucht dort nicht; darin
die beiden Stufen um c wie heute, nur mit dem L-Gitter. Leiterfeld direkt auf der Haut: Sprossen als Wege von U_k zu X_k (Holme
bei r/(t + 1)), X_k längs der Naht nach Bogenlänge, beim Hals auf der Falte.

**Erkennen:** (a) Falte — eine scharfe Kantenkette von A0 im Feld kreuzt den Schlitz und erreicht auf einer Seite die Naht
(Rex mittel: unten, Lippenstelle 5); Hals = die Falte, ihre Schärfe auf den Halskanten; ein kurzes Stück auf der Gegenseite läuft
auf der Speiche über P (E2.3 a). (b) Keil — der Abstand w(s) zwischen Schlitzufer und Naht derselben Seite wächst langsamer als
w ≈ s/2 (Robbe hoch: Keil von ≈ 22°, bei J eine Engstelle von 0,5 Kanten); Hals, wo der Keil Platz für t + 1 Zellen hat.

**Schritte:** L1 Erkennen (Skript, Bilder) → L2 Feld teilen und Ringkarte (Stauchung messen) → L3 Gitter beider Felder (Bild,
nirgends umgeklappt) → L4 Käfig, Lippe, Lösen, Messen (Rex mittel gerade/J, Robbe hoch gerade/J in den Toren) → L5 ganze Reihe
(alle übrigen Fälle bitgleich, keine Leiter), Lippenziel auf der Haut als Standard, Tests, Doku. Alter Weg ohne Leiter bitgleich.

## Stand E2.6 (21.10., abends): Leiter gebaut (Option `leiter`), drei der vier offenen Fälle bewegt

**Gebaut** (alles hinter `einsatzTopologie(…, { leiter: true })`; ohne Fund und ohne Option bitgleich, Einsatz-Tests unverändert):
1. **Erkennen** (`einsatz/leiter.ts`): Falte von A0, die den Schlitz kreuzt und auf einer Seite bis zur Naht läuft (Rex mittel:
   Lippenstelle 13 von 41, Hals 23–26 feine Kanten), samt dem kurzen Stück auf der Gegenseite; sonst Keil (w < s/2 zwischen 20 und
   70 % der Linie; Hals an der ersten Stelle danach mit Platz für drei Feldkanten, kürzester Kantenweg zur Naht).
2. **Ringkarte**: Halbfeld am Hals geteilt (`leiterDreiecke`), Karte aus vier Randstücken (Hals + Naht hinter Q als V-Rand).
   Leiterkarte: Lippe und Naht hinter X_1 gegenüber (U = 0/1), die Sprossen V-Linien — keine Stauchung.
3. **Gitter** (`einsatz/leiterGitter.ts`): Ringfeld L-förmig (`kernGitterL`), Leiterfeld als Tutte-Gitter in der Leiterkarte
   (die Coons-Fläche faltete an der Engstelle von Robbe hoch J), Halszelle, Dreier- und Fünferpol. m = M − 2 + (q − 1)/2.
4. **Lippe**: Leiterteil gleichmäßig, Ringteil nach Bogenlänge (konform sprang die Spanne an P auf das Doppelte); an einer Falte
   eine **Ecke der Lippe** (`lippenPunkt/lippeAnpassen(…, ecken)`, Phantompunkte 2P_q − P_{q∓1}) — im Käfig laufen dort drei
   scharfe Kanten zusammen, Käfig und Lippe brauchen dieselbe Regel.
5. **Falte**: Schärfe von A0 auf dem Hals und auf dem Stück über P (E2.3 a, Punkte der Speiche fest auf dem Stück).
6. **Stufennaht**: J_i nie die Reihe, die einer Spitze auf der Naht am nächsten liegt (Robbe hoch gerade: zwei Reihen 1,1 px
   auseinander an der Spitze, Haut 0,48 → 0,21 px).
7. **Lösen**: Unbekannte aus der Topologie; **Knickmaß** nimmt Ecken aus, an denen drei Falten zusammenlaufen.
8. **Stück der Falte über P** in natürlicher Lage (Punkte der Speiche nicht fest; fest auf dem kurzen Stück zogen sie Reihe 1 an
   die Lippe, Knick 30,8° statt 29,6°).

**Standard auf K2** (seit diesem Stand): Leiter und Lippenziel auf der Haut. Ganze Reihe (43 Fälle) gegen den Stand E2:

| | Stand E2 | E2.6 |
|---|---|---|
| Haut-Tor (≤ 0,25 px, Knick ≤ A0 + 2°, Lippe ≤ 1 px, nirgends umgeklappt) | 39 von 43 | **41 von 43** |
| Mundwinkel ≤ A0 + 2° | 43 von 43 | 43 von 43 (13 Fälle genauer, z. B. Birne hoch gerade 2,9 → 1,2°) |
| Lippe ≤ 1 px | 42 von 43 | 43 von 43 (Robbe hoch J 2,56 → 0,15 px) |
| Rex mittel J | Haut 0,30 px, Knick 44,7° | **0,13 px, 27,4°** (A0 27,1°) |
| Robbe hoch gerade | Haut 0,37 px, Knick 176° | **0,21 px, 7,3°** (A0 13,9°) |
| Robbe tief J | Knick 16,8° | **11,2°** (A0 11,2°) |

Eine Leiter finden nur Rex mittel (Falte) und Robbe hoch (Keil); alle anderen Fälle ändern sich nur durch das Lippenziel auf der
Haut.

**Offen:**
- **Rex mittel gerade:** Knick 29,6° (A0 27,1°, Tor 29,1°). Er liegt in Reihe 1 neben der Kreuzung der Falte mit der Linie; örtlich
  hat A0 dort höchstens 11°, der Einsatz 26–30° (auch Rex mittel J, dort verdeckt der globale Vergleich mit A0s 27° an der
  Schnauzenspitze den Unterschied). Gemessen und verworfen: halbscharfe erste Faltenkante an der Lippe (gerade 30,1°), ohne Ecke
  der Lippe (29,9°), beides (30,3°), ohne das Stück über P (30,3°), Lippenteilung stetig an P (≈ 0°), Stück fest auf der Falte
  (30,8°) — der Standard (Ecke, scharf, Stück in natürlicher Lage) ist mit 29,6° der beste. Vor dem nächsten Versuch die Lage der
  Falte von A0 an der Kreuzung genau ansehen (sie läuft bei gerade 0,5 px auf der Linie).
- **Robbe hoch J:** faltet an der Engstelle (die Linie kommt der Kopfnaht bis 0,5 Feldkanten nahe, bei 30 % der Länge; dahinter
  weitet sich der Streifen wieder). Durch die Engstelle müssten sieben Holme. Weg: zwei Leitern hintereinander (vor der Engstelle
  ohne Holme, dahinter bis zur Weite) — oder die Engstelle als Grenze der Zeichnung behandeln (Florians Entscheidung).
- E2.4 (A0 mit Hülle, P-Linien am Maul, Loops) noch nicht gemessen.

**Tests:** `kernring.test.ts` — neuer Wächter „Leiter“ (Rex mittel J, Robbe hoch gerade in den Toren, ohne Fund bitgleich; ohne
Leiter rot), Topologie mit den Polen der Leiter (Valenz 3 und 5), Lippe als Falte mit Ecke, Spitzen-Wächter an Rex mittel J
(26 Tests grün); `kernring.extrem.ts` — offen nur noch Rex mittel gerade und Robbe hoch J (Extrem-Lauf grün: Haut-Tor ohne die
offenen, Mundwinkel-Tor an allen 43, Gesamttest erwartet rot). Bild
[`e2-leiter-2026-10-21.jpg`](../progress/editor/e2-leiter-2026-10-21.jpg).
