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
