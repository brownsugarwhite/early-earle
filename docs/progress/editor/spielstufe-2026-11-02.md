# Spielstufe — der Editor-Käfig auf Brettstufe 1 (02.11.2026)

**Frage:** Florian will das Wesen von Anfang an in *Spielqualität* sehen. Das Spiel zeichnet ein gebackenes Netz auf
Catmull-Clark-Stufe 1 (Budget ≤ 8 000 Dreiecke je Wesen samt Maul, Plan „Wesen-Editor 2“ §Spiel; Budget-Tor in
`docs/UEBERGABE.md`), der Editor zeigt Stufe 3 als Grenzfläche. Wie gut überträgt sich der heutige Käfig auf Stufe 1?
Stand `ca96bbc6`, Branch `claude/editor-grundlayout`, nichts am Kern oder Editor geändert. **Abnahme offen.**

Messung: `apps/editor/scripts/pruefen/spielstufe.ts` (neu), Bilder `apps/editor/scripts/pruefen/spielstufe-bild.mjs` (neu),
Zahlen als JSON in `apps/editor/pruefen-ausgabe/spielstufe-2026-11-02.json` (gitignoriert). Alle px bei 461 je Kachel.

## Kurzfassung

- **Budget:** Ein Röhren-Körper hat auf Stufe 1 **3 200 Dreiecke**, die Mehrteiler 3 344 (Ente), 3 968 (Vierbeiner),
  6 288 (Fisch) — ohne Maul alle im Budget. **Mit Maul gibt es heute keine Stufe 1:** Der Einsatz sitzt auf K2 (Käfig zweimal
  verfeinert); der Käfig mit Maul hat als Stufe 0 schon **18 928 (Rex) bzw. 25 958 (Kugel) Dreiecke**, das 2,4- bis 3,2-fache
  des Budgets; eine Stufe darüber wären 75 712 bzw. 103 832.
- **Umriss:** Die Silhouette der Stufe 1 (reine Catmull-Clark-Lage) weicht von der Silhouette der Stufe 3 um höchstens
  0,9–4,8 px ab (Mittel 0,1–0,8 px); am größten an Kasten und Kegel in der Front (4,0 / 4,8 px). Auf die Grenzfläche gedrückt
  („Grenze“, Halstead-Maske derselben Stufe) höchstens 0,4–2,8 px, Mittel 0,1–0,6; Stufe 2 bleibt unter 1 px außer
  Tigerkopf-Front (2,8). Gegen die **Zeichnung** verschiebt Stufe 1 das Δ-Maximum des Editors um −0,8 … +3,6 px (meist
  unter 1 px; Tigerkopf Front 2,3 → 5,9, Kegel Top 2,6 → 4,1, Robbe Top 12,5 → 14,4); die mittlere Abweichung steigt bei
  runden Körpern von 0,1 auf 0,5–0,6 px (Sehnenfehler), mit Grenzlage bleibt sie bei 0,1.
- **Facetten (Knicke zwischen Nachbarflächen auf Stufe 1):** 95 % der Kanten unter 11–12° (Kugel, Ei), 20–24° (Rex,
  Langhals, Robbe, Tigerkopf, Kegel), 29–34° (Ente, Fisch, Vierbeiner). Anteil der Kanten über 20°: 0 % (Kugel, Ei),
  5–12 % (Röhren-Körper), 18–25 % (Mehrteiler). Die Maxima liegen bei 50–163°: an den gezeichneten Falten (Tigerkopf-Kasten
  163°, gewollt), aber auch **abseits aller Falten**: Rex 133° im ersten Ringband an der Schnauze (Stufe 3 dort 14°),
  Tigerkopf 56° im Ringband 1, Kegel 54° an der Ecke des Dreiecks-Querschnitts (keine Falte gesetzt; Stufe 3 14°), Langhals
  53° oben am Hals (Stufe 3 14,5°), Ente 84°, Fisch 89°, Vierbeiner 61°. Auf der Grenzlage sinken die Maxima (Rex abseits
  133 → 36°, Tigerkopf 56 → 30°), die 95-%-Werte kaum (−1 bis −3°).
- **Flachband** (Anteil der Fläche von Stufe 3, deren Normale weniger als 5° von der Blickrichtung abweicht; Kugel als
  Bezug 8,7 %): Seite Rex 18,9 %, Robbe 21,8 %, Tigerkopf 17,7 %, **Kegel 34,4 %** (gezeichnetes Dreieck in der Front = gerade
  Flanken); Front Vierbeiner 31,0 %, Ente 20,0 %, Langhals 15,9 %, Fisch 14,8 %; Top Vierbeiner 23,7 %. „Umrisse berühren“
  mittel gegen aus bzw. rund ändert das um höchstens 3,2 Punkte (Langhals Front 15,9 / 12,7 / 14,6 %; Ente Top 11,3 / 8,5 /
  9,1 %), bei Kugel, Ei, Tigerkopf und Kegel gar nicht. Die flachen Flanken kommen also aus den gezeichneten Querschnitten
  (Front-Lappen, Spanten), nicht aus der Superellipse; „mittel“ kauft dafür Δ Front (Rex 10,3 → 7,3, Robbe 8,5 → 6,2,
  Ente 14,3 → 12,6, Vierbeiner 21,4 → 16,2 px).
- **Sichtprobe** (`spielstufe-rex-2026-11-02.png`, `spielstufe-langhals-2026-11-02.png`, Cel-Stufen, 480 px je Kachel):
  Stufe 1 mit glatten Punktnormalen ist in diesem Look bei dieser Größe von Stufe 3 nicht zu unterscheiden — mit den
  Normalen der Grenzfläche ebenso wenig; nur flach schattiert (Dreiecksnormalen) treppen die Cel-Grenzen am Bauch. Der
  polygonale Umriss (Rex ≤ 1,5 px, Langhals ≤ 3,0 px oben am Hals) fällt bei 480 px nicht auf.

## Methode (was genau gemessen wurde)

- **Körper wie der Editor:** `editorBauen(imAblauf(dok, art, 'kugel'), editorPlan(art))` aus
  `packages/shape/src/kern/pruefen/extremMessung.ts` (Startkugel umgeformt, Stationen eingefroren, Stand zurückgeschrieben
  bis er steht; Bauplan glatt + Umrisse berühren „mittel“). Röhre: `stand.abl` (Käfig `abl.kaefig` mit gelösten Lagen,
  `abl.fein` = Grenzlagen der Stufe 3). Teile: wie `baumKoerper` im Worker `baumAbleiten(dok, { paare: true }, teilbaum(dok,
  stationen.teile))` (`b.kaefig`, `b.fein`, `b.unterteilung`), Zonen aus `b.zone`, gezeichnete Falten gegen Klinge aus
  `baumFalten(b).gewollt`.
- **Stufen:** `unterteilung(abl.kaefig, 3)` frisch vom gelösten Käfig (die Unterteilung in der Ableitung trägt in
  `stufen[i].kaefig.xyz` noch die Lagen vor dem Löser, nur ihre Matrix wird benutzt). Stufe L: „CC“ =
  `stufen[L−1].kaefig.xyz` (reine Catmull-Clark-Lage), „Grenze“ = `anwenden3(grenzMaske(stufen[L−1].kaefig), xyz)`
  (Halstead/Kass/DeRose-Maske derselben Stufe). Gegenprobe: Stufe 3 Grenze gegen `abl.fein` = 0,0000 px in allen 30
  Bauten (Spalte „Grenzprobe“) — es ist dieselbe Fläche, die der Editor zeigt.
- **a) Dreiecke** = 2 × Vierecke der Stufe (alle Flächen ab Stufe 1 sind Vierecke); Stufe 0 = Σ (Ecken − 2) je Käfigfläche.
- **b) Δ ↔ Zeichnung:** `blattAbweichungen(punkte, flaechen, dok, 240)` aus `kern/abweichung.ts` — derselbe Aufruf wie im
  Worker (`wesen.ts`), mit dem Netz der jeweiligen Stufe. Stufe 3 Grenze reproduziert die Zahl, die der Editor im
  Blatt-Titel zeigt, bei 9 von 10 Körpern exakt; beim Tigerkopf Front 2,29 gegen 2,09 vom Worker bei bitgleichen Lagen
  (< 0,00005 px) und gleichen Flächen: `umrissStuecke` teilt Flächen nach dem Vorzeichen der Newell-Komponente in zu- und
  abgewandt, die exakt achsparallelen Kastenflächen kippen mit Rundungsfehlern — die Δ-Messung ist dort auf 0,2 px
  empfindlich (`PROBE=tigerkopf`).
- **b2) Δ Stufe L ↔ Stufe 3:** Umriss beider Netze je Blatt wie in `blattAbweichungen` (`umrissAusNetz` mit 240 Zellen,
  Punkte auf die Silhouettenkanten des eigenen Netzes gelegt, `umrissStuecke`), Abstand in beiden Richtungen, max und
  Mittel über alle Umrisspunkte.
- **c) Knicke:** Newell-Normalen je Fläche, Winkel über jede innere Kante (keine Kante ausgenommen, auch scharfe nicht —
  was das Spiel zeichnet, ist der Knick); max, 95 %, 99 %, Anteil > 10° und > 20°. „Abseits der Falten“: kein Abkömmling
  einer scharfen Käfigkante (`faltenAbkoemmlinge`, jede Schärfe, bei Teilen auch die Klinge), keine radiale Kante an einer
  Spitze, beide Flächen mit einem Käfig-Vorfahren ohne scharfe Kante und ohne Spitze (`flaechenVorfahren`). Ort = Zone der
  Vorfahren (Röhre: Ringband i, j = 0 Rücken, N/4 rechts, N/2 Bauch, oder Kappe vorn/hinten; Teile: Zone des Baums) und
  Kantenmitte in Welt.
- **d) Flachband:** Σ Fläche (|n · d| < sin θ) / Σ Fläche auf Stufe 3 Grenze, d = z (Seite), x (Front), y (Top), θ = 5° und
  10°. Eichung: Kugel gemessen 8,6 % / 17,5 %, analytisch sin 5° = 8,7 %, sin 10° = 17,4 %. Varianten über den Bauplan
  (`fuelle: 'mittel'` = Editor, `undefined` = ohne Berühren, `'rund'`), Stationen der Startkugel in allen Varianten
  dieselben; bei Teilen als Option von `baumAbleiten` (der Editor gibt dem Baum immer `BAUM_STANDARD`, die Chips
  Haut/Fülle wirken auf ihn nicht — Kern-Option, im Editor nicht schaltbar).
- **e) Maul-Einsatz:** `einsatzFall(art, anfang, form)` + `einsatzAblauf` (Standard des Kernrings, Feld auf K2), Knicke auf
  dem gelösten Käfig mit Maul (`g.kaefig`, `g.xyz`) ohne weitere Stufe.

## Schritt 1: `dreieck-budget.ts` (unverändert, Ausgabe wörtlich)

```
Röhre (Editor-Ablauf) | Käfigpunkte | Flächen | Dreiecke Stufe 0 / 1 / 2 / 3
kugel       | 402 | 400 | 800 / 3200 / 12800 / 51200
rex         | 402 | 400 | 800 / 3200 / 12800 / 51200
langhals    | 402 | 400 | 800 / 3200 / 12800 / 51200
robbe       | 402 | 400 | 800 / 3200 / 12800 / 51200
tigerkopf   | 402 | 400 | 800 / 3200 / 12800 / 51200

Teile (Editor-Ablauf) | Käfigpunkte | ≈ Dreiecke Stufe 1 / 2 / 3
ente        | 420 | 3360 / 13440 / 53760
vierbeiner  | 498 | 3984 / 15936 / 63744
fisch       | 788 | 6304 / 25216 / 100864
zweihals    | 370 | 2960 / 11840 / 47360
krabbe      | 212 | 1696 / 6784 / 27136

Maul-Einsatz (Standard, Feld auf K2) | A0 | K2 | mit Maul | Dreiecke mit Maul Stufe 0 / 1 / 2
kugel/mittel/gerade  | 402 P / 400 F | 6402 P / 6400 F | 14058 P / 12979 F | 25958 / 103832 / 415328 (über Budget)
rex/mittel/j         | 402 P / 400 F | 6402 P / 6400 F | 10959 P / 9464 F | 18928 / 75712 / 302848 (über Budget)
```

(Laufzeit 25 s, davon die zwei Maulfälle ≈ 20 s. Die Teile-Zeile schätzt Flächen ≈ Punkte; die genauen Zahlen stehen in
Tabelle a: Ente 3 344, Vierbeiner 3 968, Fisch 6 288 Dreiecke auf Stufe 1.)

## Schritt 2: `spielstufe.ts` (Ausgabe wörtlich; Bauzeiten je Lauf ± 20 ms, alle anderen Zahlen in drei Läufen gleich)

### a) Dreiecke je Stufe (Budget 8000 je Wesen samt Maul)

| Körper | Bau | Käfig P / F | Falten: scharfe Käfigkanten (gezeichnet / Klinge), Käfigflächen mit Falte | Dreiecke Stufe 0 | Stufe 1 | Stufe 2 | Stufe 3 (Editor) | Bau ms |
|---|---|---|---|---|---|---|---|---|
| kugel | Röhre | 402 / 400 | 0 (0 / 0), 0 | 800 | 3200 | 12800 (über Budget) | 51200 | 403 |
| ei | Röhre | 402 / 400 | 0 (0 / 0), 0 | 800 | 3200 | 12800 (über Budget) | 51200 | 260 |
| rex | Röhre | 402 / 400 | 8 (8 / 0), 24 | 800 | 3200 | 12800 (über Budget) | 51200 | 304 |
| langhals | Röhre | 402 / 400 | 0 (0 / 0), 0 | 800 | 3200 | 12800 (über Budget) | 51200 | 431 |
| robbe | Röhre | 402 / 400 | 0 (0 / 0), 4 | 800 | 3200 | 12800 (über Budget) | 51200 | 606 |
| tigerkopf | Röhre | 402 / 400 | 60 (60 / 0), 86 | 800 | 3200 | 12800 (über Budget) | 51200 | 313 |
| kegel | Röhre | 402 / 400 | 0 (0 / 0), 0 | 800 | 3200 | 12800 (über Budget) | 51200 | 244 |
| ente | Teile 2 Streifen + 1 seitlich | 420 / 418 | 46 (8 / 38), 104 | 836 | 3344 | 13376 (über Budget) | 53504 | 187 |
| fisch | Teile 5 Streifen + 1 seitlich | 788 / 786 | 30 (8 / 22), 68 | 1572 | 6288 | 25152 (über Budget) | 100608 | 316 |
| vierbeiner | Teile 1 Streifen + 2 seitlich | 498 / 496 | 8 (8 / 0), 20 | 992 | 3968 | 15872 (über Budget) | 63488 | 175 |

### b) Δ Silhouette ↔ Zeichnung je Blatt (px bei 461 je Kachel; max/mittel; S · F · T)

| Körper | Stufe 1 CC | Stufe 1 Grenze | Stufe 2 CC | Stufe 2 Grenze | Stufe 3 Grenze (= Editor) | Editor meldet | Grenzprobe px |
|---|---|---|---|---|---|---|---|
| kugel | 1.3/0.6 · 0.9/0.5 · 1.4/0.6 | 0.5/0.1 · 0.5/0.3 · 0.5/0.1 | 0.4/0.2 · 0.4/0.2 · 0.4/0.2 | 0.3/0.1 · 0.2/0.1 · 0.3/0.1 | 0.3/0.1 · 0.2/0.1 · 0.3/0.1 | 0.3/0.1 · 0.2/0.1 · 0.3/0.1 | 0.000 |
| ei | 1.5/0.5 · 0.8/0.4 · 1.5/0.5 | 0.6/0.1 · 0.8/0.3 · 0.6/0.1 | 0.4/0.1 · 0.4/0.2 · 0.4/0.1 | 0.3/0.1 · 0.5/0.1 · 0.4/0.1 | 0.3/0.1 · 0.4/0.1 · 0.4/0.1 | 0.3/0.1 · 0.4/0.1 · 0.4/0.1 | 0.000 |
| rex | 0.9/0.1 · 7.6/2.3 · 1.8/0.7 | 0.7/0.1 · 7.1/2.4 · 1.9/0.4 | 1.0/0.1 · 7.4/2.3 · 1.6/0.6 | 1.1/0.1 · 7.2/2.4 · 1.6/0.5 | 1.1/0.1 · 7.3/2.3 · 1.6/0.6 | 1.1/0.1 · 7.3/2.3 · 1.6/0.6 | 0.000 |
| langhals | 2.8/0.4 · 5.0/0.8 · 2.8/1.1 | 2.6/0.2 · 3.6/0.7 · 3.4/0.9 | 1.3/0.2 · 4.2/0.7 · 3.0/0.9 | 1.7/0.2 · 3.9/0.7 · 3.2/0.9 | 1.5/0.2 · 4.0/0.7 · 3.1/0.9 | 1.5/0.2 · 4.0/0.7 · 3.1/0.9 | 0.000 |
| robbe | 3.2/0.8 · 5.8/1.3 · 14.4/2.2 | 4.0/0.2 · 7.2/1.8 · 12.5/1.7 | 3.8/0.3 · 6.1/1.4 · 13.0/1.9 | 4.0/0.2 · 6.4/1.6 · 12.5/1.8 | 4.0/0.2 · 6.2/1.5 · 12.5/1.8 | 4.0/0.2 · 6.2/1.5 · 12.5/1.8 | 0.000 |
| tigerkopf | 2.4/0.7 · 5.9/0.8 · 6.0/1.4 | 2.6/0.4 · 3.8/0.8 · 6.5/0.7 | 2.5/0.5 · 4.3/0.6 · 6.3/1.0 | 2.5/0.4 · 2.3/0.6 · 6.0/0.8 | 2.5/0.4 · 2.3/0.6 · 6.2/0.8 | 2.5/0.4 · 2.1/0.6 · 6.2/0.8 | 0.000 |
| kegel | 2.8/1.0 · 6.8/1.9 · 4.1/1.6 | 2.0/0.5 · 7.8/2.3 · 3.2/0.6 | 2.3/0.6 · 6.7/1.9 · 3.3/1.2 | 2.0/0.6 · 6.8/2.1 · 2.6/0.9 | 2.1/0.6 · 7.3/2.0 · 2.6/1.0 | 2.1/0.6 · 7.3/2.0 · 2.6/1.0 | 0.000 |
| ente | 4.1/0.7 · 12.8/2.6 · 2.1/0.5 | 2.9/0.3 · 13.1/2.8 · 2.3/0.5 | 2.7/0.3 · 12.6/2.7 · 2.1/0.5 | 3.3/0.2 · 12.6/2.7 · 2.1/0.5 | 3.4/0.2 · 12.6/2.7 · 2.1/0.5 | 3.4/0.2 · 12.6/2.7 · 2.1/0.5 | 0.000 |
| fisch | 1.9/0.4 · 3.5/0.9 · 2.9/0.7 | 1.6/0.2 · 3.5/0.9 · 3.1/0.4 | 1.3/0.2 · 3.5/0.9 · 3.0/0.6 | 1.4/0.1 · 3.5/0.9 · 3.0/0.5 | 1.4/0.1 · 3.5/0.9 · 2.9/0.5 | 1.4/0.1 · 3.5/0.9 · 2.9/0.5 | 0.000 |
| vierbeiner | 2.3/0.7 · 16.5/3.9 · 5.0/1.3 | 3.4/0.3 · 16.2/3.9 · 4.1/0.8 | 2.9/0.3 · 16.3/3.8 · 4.5/1.0 | 3.4/0.3 · 16.2/3.9 · 4.2/0.8 | 3.3/0.3 · 16.2/3.8 · 4.3/0.9 | 3.3/0.3 · 16.2/3.8 · 4.3/0.9 | 0.000 |

### b2) Δ Silhouette Stufe L ↔ Stufe 3 (px; max/mittel; S · F · T) — wie eckig ist der Spiel-Umriss

| Körper | Stufe 1 CC | Stufe 1 Grenze | Stufe 2 CC | Stufe 2 Grenze |
|---|---|---|---|---|
| kugel | 1.3/0.5 · 0.9/0.4 · 1.3/0.6 | 0.4/0.1 · 0.6/0.4 · 0.3/0.1 | 0.4/0.1 · 0.2/0.1 · 0.3/0.1 | 0.1/0.0 · 0.1/0.1 · 0.1/0.0 |
| ei | 1.4/0.5 · 0.9/0.4 · 1.4/0.5 | 0.4/0.1 · 0.6/0.3 · 0.3/0.1 | 0.3/0.1 · 0.2/0.1 · 0.3/0.1 | 0.1/0.0 · 0.1/0.1 · 0.1/0.1 |
| rex | 1.5/0.1 · 1.1/0.4 · 0.9/0.3 | 1.5/0.1 · 0.7/0.3 · 0.6/0.2 | 0.3/0.0 · 0.3/0.1 · 0.7/0.1 | 0.2/0.0 · 0.2/0.0 · 0.3/0.0 |
| langhals | 3.0/0.4 · 1.1/0.3 · 1.8/0.5 | 1.3/0.1 · 0.6/0.1 · 0.9/0.2 | 0.8/0.1 · 0.6/0.1 · 0.4/0.1 | 0.4/0.0 · 0.8/0.0 · 0.2/0.1 |
| robbe | 1.9/0.7 · 2.3/0.6 · 1.9/0.7 | 0.6/0.1 · 1.4/0.4 · 1.4/0.5 | 0.5/0.2 · 0.7/0.2 · 0.6/0.2 | 0.4/0.0 · 0.4/0.1 · 0.6/0.1 |
| tigerkopf | 1.8/0.5 · 4.0/0.7 · 1.5/0.6 | 0.8/0.1 · 2.2/0.4 · 0.8/0.2 | 1.0/0.2 · 2.8/0.2 · 0.8/0.2 | 0.7/0.0 · 0.8/0.1 · 0.4/0.1 |
| kegel | 2.1/0.5 · 4.8/0.6 · 3.2/0.8 | 0.9/0.1 · 2.8/0.5 · 2.1/0.6 | 0.5/0.1 · 1.1/0.2 · 0.8/0.3 | 0.1/0.0 · 0.8/0.1 · 0.4/0.0 |
| ente | 2.5/0.7 · 2.8/0.6 · 1.1/0.2 | 1.1/0.1 · 1.4/0.4 · 1.3/0.1 | 0.7/0.2 · 0.7/0.2 · 1.0/0.1 | 0.7/0.0 · 0.4/0.1 · 0.1/0.0 |
| fisch | 1.7/0.4 · 1.2/0.2 · 1.0/0.3 | 0.5/0.1 · 0.5/0.1 · 0.5/0.2 | 0.4/0.1 · 0.4/0.1 · 0.6/0.1 | 0.2/0.0 · 0.7/0.0 · 0.1/0.0 |
| vierbeiner | 2.2/0.6 · 1.6/0.4 · 1.2/0.6 | 1.0/0.1 · 1.0/0.2 · 1.0/0.2 | 0.8/0.2 · 0.5/0.1 · 1.1/0.1 | 0.6/0.0 · 0.5/0.0 · 0.2/0.0 |

### c) Knicke zwischen Nachbarflächen (Grad: max / 95 % / 99 %, in Klammern Anteil der Kanten > 10° / > 20°; Kanten)

| Körper | Stufe 1 CC, ganzer Körper | Stufe 1 CC, abseits der Falten | Stufe 1 Grenze, ganz | Stufe 1 Grenze, abseits | Stufe 2 CC, ganz | Stufe 2 CC, abseits | Stufe 3 Grenze, ganz | Stufe 3 Grenze, abseits |
|---|---|---|---|---|---|---|---|---|
| kugel | 12.9 / 11.2 / 11.5 (23.4 % / 0.0 %; 3200) | 12.9 / 11.2 / 11.5 (23.4 % / 0.0 %; 3200) | 11.6 / 11.2 / 11.4 (23.8 % / 0.0 %; 3200) | 11.6 / 11.2 / 11.4 (23.8 % / 0.0 %; 3200) | 6.5 / 5.6 / 5.7 (0.0 % / 0.0 %; 12800) | 6.5 / 5.6 / 5.7 (0.0 % / 0.0 %; 12800) | 3.1 / 2.8 / 2.9 (0.0 % / 0.0 %; 51200) | 3.1 / 2.8 / 2.9 (0.0 % / 0.0 %; 51200) |
| ei | 20.5 / 12.0 / 13.6 (22.2 % / 0.1 %; 3200) | 20.5 / 12.0 / 13.6 (22.2 % / 0.1 %; 3200) | 15.9 / 11.9 / 13.0 (22.6 % / 0.0 %; 3200) | 15.9 / 11.9 / 13.0 (22.6 % / 0.0 %; 3200) | 10.4 / 6.0 / 6.6 (0.0 % / 0.0 %; 12800) | 10.4 / 6.0 / 6.6 (0.0 % / 0.0 %; 12800) | 5.0 / 3.0 / 3.3 (0.0 % / 0.0 %; 51200) | 5.0 / 3.0 / 3.3 (0.0 % / 0.0 %; 51200) |
| rex | 133.5 / 23.9 / 35.0 (30.1 % / 10.2 %; 3200) | 133.5 / 22.9 / 30.0 (27.5 % / 8.7 %; 2972) | 88.2 / 22.0 / 31.3 (29.3 % / 8.7 %; 3200) | 36.1 / 21.0 / 25.8 (27.0 % / 6.9 %; 2972) | 91.0 / 11.6 / 17.7 (9.8 % / 0.8 %; 12800) | 32.1 / 11.0 / 14.1 (8.4 % / 0.1 %; 11960) | 103.5 / 5.7 / 8.4 (0.6 % / 0.2 %; 51200) | 14.0 / 5.5 / 6.9 (0.1 % / 0.0 %; 47984) |
| langhals | 53.0 / 24.2 / 30.9 (39.9 % / 9.3 %; 3200) | 53.0 / 24.2 / 30.9 (39.9 % / 9.3 %; 3200) | 44.9 / 21.7 / 27.5 (38.9 % / 7.2 %; 3200) | 44.9 / 21.7 / 27.5 (38.9 % / 7.2 %; 3200) | 29.5 / 11.6 / 14.8 (8.4 % / 0.1 %; 12800) | 29.5 / 11.6 / 14.8 (8.4 % / 0.1 %; 12800) | 14.5 / 5.7 / 7.3 (0.1 % / 0.0 %; 51200) | 14.5 / 5.7 / 7.3 (0.1 % / 0.0 %; 51200) |
| robbe | 51.4 / 23.9 / 35.7 (34.3 % / 11.8 %; 3200) | 46.0 / 23.6 / 35.1 (33.8 % / 11.4 %; 3160) | 53.3 / 23.4 / 31.9 (32.0 % / 9.8 %; 3200) | 36.6 / 23.2 / 31.8 (31.5 % / 9.5 %; 3160) | 52.7 / 12.4 / 17.1 (10.8 % / 0.3 %; 12800) | 22.9 / 12.1 / 16.7 (10.5 % / 0.2 %; 12656) | 61.7 / 6.1 / 8.5 (0.2 % / 0.0 %; 51200) | 11.1 / 6.0 / 8.4 (0.2 % / 0.0 %; 50656) |
| tigerkopf | 162.6 / 24.1 / 83.8 (29.9 % / 6.3 %; 3200) | 56.2 / 17.5 / 22.5 (28.0 % / 1.6 %; 2442) | 108.9 / 20.2 / 75.6 (28.4 % / 5.2 %; 3200) | 29.9 / 16.7 / 19.2 (26.8 % / 0.8 %; 2442) | 154.0 / 9.6 / 56.1 (4.5 % / 2.3 %; 12800) | 38.2 / 8.5 / 11.1 (1.4 % / 0.1 %; 9908) | 112.2 / 4.6 / 22.0 (1.7 % / 1.1 %; 51200) | 24.1 / 4.2 / 5.5 (0.1 % / 0.0 %; 39912) |
| kegel | 54.3 / 20.0 / 46.4 (22.9 % / 5.1 %; 3200) | 54.3 / 20.0 / 46.4 (22.9 % / 5.1 %; 3200) | 47.0 / 20.2 / 40.2 (22.7 % / 5.2 %; 3200) | 47.0 / 20.2 / 40.2 (22.7 % / 5.2 %; 3200) | 28.8 / 10.0 / 20.7 (5.0 % / 1.1 %; 12800) | 28.8 / 10.0 / 20.7 (5.0 % / 1.1 %; 12800) | 14.1 / 5.0 / 10.5 (1.2 % / 0.0 %; 51200) | 14.1 / 5.0 / 10.5 (1.2 % / 0.0 %; 51200) |
| ente | 152.3 / 34.0 / 79.3 (41.4 % / 20.2 %; 3344) | 83.8 / 35.0 / 77.6 (42.6 % / 23.8 %; 2392) | 151.4 / 32.4 / 77.9 (41.2 % / 19.5 %; 3344) | 81.1 / 32.4 / 76.4 (41.7 % / 22.8 %; 2392) | 153.6 / 18.6 / 42.6 (19.5 % / 4.6 %; 13376) | 51.1 / 19.6 / 40.8 (22.0 % / 4.9 %; 9808) | 154.2 / 9.8 / 19.9 (4.1 % / 0.9 %; 53504) | 27.2 / 9.8 / 19.6 (4.1 % / 0.7 %; 39712) |
| fisch | 147.7 / 31.4 / 53.7 (42.7 % / 17.8 %; 6288) | 89.3 / 28.9 / 49.2 (40.4 % / 17.3 %; 5656) | 146.6 / 28.5 / 52.0 (40.3 % / 16.3 %; 6288) | 58.6 / 26.3 / 44.0 (37.8 % / 15.5 %; 5656) | 155.5 / 14.9 / 25.3 (16.6 % / 2.4 %; 25152) | 44.6 / 14.1 / 23.1 (16.1 % / 2.0 %; 22800) | 160.7 / 7.3 / 11.9 (2.1 % / 0.3 %; 100608) | 22.9 / 7.0 / 11.4 (1.8 % / 0.0 %; 91552) |
| vierbeiner | 67.8 / 29.3 / 46.1 (50.9 % / 25.4 %; 3968) | 61.3 / 28.8 / 41.9 (51.0 % / 25.4 %; 3772) | 65.5 / 27.9 / 39.7 (49.0 % / 24.8 %; 3968) | 50.7 / 27.8 / 35.7 (49.0 % / 24.7 %; 3772) | 73.3 / 14.4 / 21.3 (24.6 % / 1.3 %; 15872) | 34.5 / 14.3 / 20.3 (24.7 % / 1.1 %; 15160) | 91.5 / 7.1 / 10.3 (1.2 % / 0.1 %; 63488) | 19.9 / 7.1 / 10.0 (1.0 % / 0.0 %; 60784) |

### c2) Ort des größten Knicks (Käfigzone der beiden Flächen, Kantenmitte in Welt)

| Körper | Stufe 1 CC, ganz | Stufe 1 CC, abseits der Falten | Stufe 3 Grenze, ganz | Stufe 3 Grenze, abseits |
|---|---|---|---|---|
| kugel | 12.9° Kappe hinten bei (0.27, 0.26, 0.02) | 12.9° Kappe hinten bei (0.27, 0.26, 0.02) | 3.1° Kappe hinten bei (0.27, 0.26, 0.00) | 3.1° Kappe hinten bei (0.27, 0.26, 0.00) |
| ei | 20.5° Kappe vorn bei (-0.30, 0.22, -0.02) | 20.5° Kappe vorn bei (-0.30, 0.22, -0.02) | 5.0° Kappe vorn bei (-0.30, 0.22, 0.00) | 5.0° Kappe vorn bei (-0.30, 0.22, 0.00) |
| rex | 133.5° Ringband 0/23, j 15/16 bei (-0.35, 0.32, -0.01) | 133.5° Ringband 0/23, j 15/16 bei (-0.35, 0.32, -0.01) | 103.5° Kappe vorn bei (-0.37, 0.29, 0.00) | 14.0° Ringband 0/23, j 15/16 bei (-0.34, 0.32, -0.00) |
| langhals | 53.0° Ringband 4/23, j 15/16 – Ringband 5/23, j 15/16 bei (0.05, 0.71, -0.01) | 53.0° Ringband 4/23, j 15/16 – Ringband 5/23, j 15/16 bei (0.05, 0.71, -0.01) | 14.5° Ringband 4/23, j 15/16 – Ringband 5/23, j 15/16 bei (0.05, 0.71, -0.00) | 14.5° Ringband 4/23, j 15/16 – Ringband 5/23, j 15/16 bei (0.05, 0.71, -0.00) |
| robbe | 51.4° Kappe vorn bei (-0.38, 0.58, 0.02) | 46.0° Kappe vorn bei (-0.36, 0.57, 0.06) | 61.7° Kappe vorn bei (-0.38, 0.58, 0.00) | 11.1° Kappe vorn bei (-0.36, 0.57, 0.06) |
| tigerkopf | 162.6° Ringband 3/23, j 4/16 – Ringband 3/23, j 5/16 bei (-0.29, 0.27, 0.12) | 56.2° Ringband 1/23, j 3/16 bei (-0.36, 0.34, 0.09) | 112.2° Ringband 3/23, j 5/16 bei (-0.29, 0.27, 0.12) | 24.1° Ringband 1/23, j 3/16 bei (-0.36, 0.37, 0.09) |
| kegel | 54.3° Ringband 11/23, j 4/16 – Ringband 11/23, j 5/16 bei (0.06, 0.07, 0.43) | 54.3° Ringband 11/23, j 4/16 – Ringband 11/23, j 5/16 bei (0.06, 0.07, 0.43) | 14.1° Ringband 11/23, j 4/16 – Ringband 11/23, j 5/16 bei (0.06, 0.07, 0.42) | 14.1° Ringband 11/23, j 4/16 – Ringband 11/23, j 5/16 bei (0.06, 0.07, 0.42) |
| ente | 152.3° frei bei (0.05, 0.53, -0.01) | 83.8° frei bei (0.11, 0.14, 0.22) | 154.2° kappe bei (0.13, 0.14, 0.21) | 27.2° frei bei (0.11, 0.14, 0.22) |
| fisch | 147.7° kappe bei (0.03, 0.04, 0.00) | 89.3° ansatz bei (0.38, 0.22, -0.01) | 160.7° kappe bei (0.03, 0.04, -0.00) | 22.9° ansatz bei (-0.06, 0.43, -0.00) |
| vierbeiner | 67.8° frei – ansatz bei (0.15, 0.18, 0.08) | 61.3° frei bei (0.16, 0.00, 0.08) | 91.5° kappe bei (-0.38, 0.41, 0.00) | 19.9° frei – ansatz bei (-0.12, 0.18, 0.05) |

### d) Flachband der Stufe 3: Anteil der Fläche innerhalb 5° (10°) der Blickrichtung (Seite ±z · Front ±x · Top ±y)

| Körper | Variante | Fläche | < 5° S · F · T | < 10° S · F · T | Δ Stufe 3 S · F · T |
|---|---|---|---|---|---|
| kugel | editor (glatt + mittel) | 0.8831 | 8.6 % · 10.3 % · 8.5 % | 17.5 % · 17.0 % · 17.7 % | 0.3/0.1 · 0.2/0.1 · 0.3/0.1 |
| kugel | ohne Berühren | 0.8820 | 8.6 % · 9.0 % · 8.5 % | 17.4 % · 17.8 % · 17.8 % | 0.3/0.1 · 0.1/0.0 · 0.3/0.1 |
| kugel | rund | 0.8820 | 8.6 % · 9.0 % · 8.5 % | 17.4 % · 17.8 % · 17.8 % | 0.3/0.1 · 0.1/0.0 · 0.3/0.1 |
| ei | editor (glatt + mittel) | 0.7453 | 8.2 % · 11.5 % · 7.3 % | 16.2 % · 20.8 % · 14.8 % | 0.3/0.1 · 0.4/0.1 · 0.4/0.1 |
| ei | ohne Berühren | 0.7449 | 8.2 % · 10.9 % · 7.3 % | 16.1 % · 21.0 % · 14.8 % | 0.3/0.1 · 0.4/0.1 · 0.4/0.1 |
| ei | rund | 0.7453 | 8.2 % · 11.5 % · 7.3 % | 16.2 % · 20.8 % · 14.8 % | 0.3/0.1 · 0.4/0.1 · 0.4/0.1 |
| rex | editor (glatt + mittel) | 0.5559 | 18.9 % · 9.5 % · 3.1 % | 30.0 % · 20.8 % · 6.6 % | 1.1/0.1 · 7.3/2.3 · 1.6/0.6 |
| rex | ohne Berühren | 0.5454 | 18.1 % · 9.8 % · 2.8 % | 28.8 % · 26.6 % · 5.3 % | 1.1/0.1 · 10.3/5.4 · 1.6/0.5 |
| rex | rund | 0.5512 | 18.0 % · 8.7 % · 3.1 % | 28.8 % · 21.1 % · 6.5 % | 1.1/0.1 · 8.5/3.3 · 1.6/0.6 |
| langhals | editor (glatt + mittel) | 0.4496 | 11.5 % · 15.9 % · 8.7 % | 19.2 % · 26.2 % · 17.6 % | 1.5/0.2 · 4.0/0.7 · 3.1/0.9 |
| langhals | ohne Berühren | 0.4489 | 11.4 % · 12.7 % · 8.3 % | 19.0 % · 23.6 % · 17.6 % | 1.5/0.2 · 4.0/0.7 · 3.4/0.9 |
| langhals | rund | 0.4482 | 11.5 % · 14.6 % · 8.5 % | 19.0 % · 25.2 % · 17.7 % | 1.5/0.2 · 4.0/0.8 · 3.4/0.9 |
| robbe | editor (glatt + mittel) | 1.1976 | 21.8 % · 14.5 % · 6.5 % | 28.6 % · 23.5 % · 13.3 % | 4.0/0.2 · 6.2/1.5 · 12.5/1.8 |
| robbe | ohne Berühren | 1.1863 | 22.0 % · 16.6 % · 5.4 % | 28.7 % · 26.5 % · 11.7 % | 4.0/0.2 · 8.5/4.0 · 12.5/1.7 |
| robbe | rund | 1.1979 | 21.8 % · 14.7 % · 6.6 % | 28.6 % · 23.7 % · 13.2 % | 4.0/0.2 · 6.7/1.5 · 12.5/1.8 |
| tigerkopf | editor (glatt + mittel) | 1.3440 | 17.7 % · 12.9 % · 11.8 % | 26.7 % · 21.4 % · 18.0 % | 2.5/0.4 · 2.3/0.6 · 6.2/0.8 |
| tigerkopf | ohne Berühren | 1.3436 | 17.7 % · 12.8 % · 11.8 % | 26.7 % · 21.5 % · 18.0 % | 2.5/0.4 · 2.1/0.6 · 6.2/0.8 |
| tigerkopf | rund | 1.3439 | 17.7 % · 12.9 % · 11.8 % | 26.7 % · 21.4 % · 18.0 % | 2.5/0.4 · 2.1/0.6 · 6.2/0.8 |
| kegel | editor (glatt + mittel) | 1.6862 | 34.4 % · 13.5 % · 5.2 % | 42.9 % · 27.9 % · 10.0 % | 2.1/0.6 · 7.3/2.0 · 2.6/1.0 |
| kegel | ohne Berühren | 1.6850 | 34.5 % · 13.8 % · 5.2 % | 42.6 % · 27.7 % · 10.0 % | 2.2/0.6 · 7.0/2.0 · 2.6/0.9 |
| kegel | rund | 1.6862 | 34.4 % · 13.5 % · 5.2 % | 42.9 % · 27.9 % · 10.0 % | 2.1/0.6 · 6.7/2.0 · 2.6/1.0 |
| ente | editor (glatt + mittel) | 0.5880 | 8.2 % · 20.0 % · 11.3 % | 15.1 % · 30.1 % · 20.7 % | 3.4/0.2 · 12.6/2.7 · 2.1/0.5 |
| ente | ohne Berühren | 0.5700 | 6.6 % · 20.3 % · 8.5 % | 12.3 % · 30.7 % · 16.5 % | 3.4/0.2 · 14.3/4.6 · 2.3/0.5 |
| ente | rund | 0.5790 | 7.1 % · 19.6 % · 9.1 % | 13.3 % · 30.0 % · 18.3 % | 3.4/0.2 · 12.7/3.6 · 2.3/0.5 |
| fisch | editor (glatt + mittel) | 0.5194 | 4.3 % · 14.8 % · 5.0 % | 8.2 % · 30.8 % · 10.1 % | 1.4/0.1 · 3.5/0.9 · 2.9/0.5 |
| fisch | ohne Berühren | 0.5153 | 4.1 % · 15.5 % · 5.0 % | 7.3 % · 32.9 % · 9.4 % | 1.4/0.1 · 3.7/1.2 · 3.1/0.5 |
| fisch | rund | 0.5186 | 4.3 % · 15.3 % · 5.2 % | 8.1 % · 31.2 % · 9.9 % | 1.4/0.1 · 3.1/0.9 · 3.2/0.5 |
| vierbeiner | editor (glatt + mittel) | 0.7475 | 9.1 % · 31.0 % · 23.7 % | 15.4 % · 44.2 % · 31.1 % | 3.3/0.3 · 16.2/3.8 · 4.3/0.9 |
| vierbeiner | ohne Berühren | 0.7391 | 9.0 % · 31.9 % · 22.3 % | 15.3 % · 44.4 % · 29.1 % | 3.3/0.3 · 21.4/4.7 · 4.3/0.6 |
| vierbeiner | rund | 0.7467 | 8.9 % · 31.1 % · 24.0 % | 14.9 % · 44.0 % · 31.0 % | 3.3/0.3 · 16.3/3.9 · 4.3/0.8 |

### e) Maul-Einsatz (Standard, Feld auf K2): der Käfig mit Maul ohne weitere Stufe (Knicke in Grad, wie c)

| Fall | A0 P / F | K2 P / F | mit Maul P / F | Dreiecke (Käfigflächen) | scharfe Kanten | Knicke ganz: max / 95 % / 99 % (> 10° / > 20°; Kanten) | Knicke ohne scharfe Kanten |
|---|---|---|---|---|---|---|---|
| kugel/mittel/gerade | 402 / 400 | 6402 / 6400 | 14058 / 12979 | 25958 (über Budget) | 220 | 177.2 / 5.7 / 103.4 (3.0 % / 2.3 %; 25958) | 177.2 / 5.7 / 31.8 (2.2 % / 1.5 %; 25738) |
| rex/mittel/j | 402 / 400 | 6402 / 6400 | 10959 / 9464 | 18928 (über Budget) | 180 | 178.9 / 20.4 / 103.0 (12.9 % / 5.0 %; 18928) | 178.9 / 17.0 / 72.3 (12.0 % / 4.1 %; 18748) |


## Lesart

1. **Stufe 1 trägt das Budget, aber nur ohne Maul.** 3 200–6 288 Dreiecke je Körper lassen 1 700–4 800 für Lippe, Tasche,
   Rachen und Zähne. Der heutige Einsatz braucht das 6- bis 8-fache davon, weil er den ganzen Käfig zweimal verfeinert
   (K2 = 6 400 Flächen vor dem Maul). Ein Spielnetz mit Maul auf Stufe 1 gibt es mit dem heutigen Kern nicht; die Tabelle e
   misst deshalb den Käfig mit Maul selbst: Seine Haut hat die Knicke der Stufe 2 (95 % unter 5,7° Kugel bzw. 20,4° Rex), die
   Maxima von 103–179° stammen aus Tasche und Rachen (Rückseiten liegen fast aufeinander) und sind hier nicht von der Haut
   getrennt gezählt.
2. **Der Umriss der Stufe 1 ist auf 1–3 px polygonal, nicht 5–15.** Die großen Δ-Zahlen (Robbe Top 12,5, Vierbeiner
   Front 16,2, Ente Front 12,6) hat Stufe 3 schon; Stufe 1 legt an runden Körpern nur den Sehnenfehler darauf
   (Kugel/Ei ≤ 1,4 px max, 0,5 px Mittel), an Kasten und Kegel bis 4–5 px in der Front. Die Grenzlage halbiert das; sie ist
   dieselbe Topologie und kostet nichts (eine Maske je Käfigpunkt beim Backen).
3. **Die Facetten sind das eigentliche Problem der Stufe 1, nicht der Umriss.** Ein Viertel bis die Hälfte aller Kanten
   knickt über 10°, bei den Mehrteilern jede vierte bis fünfte über 20°. Mit glatten Punktnormalen sieht das Cel-Material
   darüber hinweg (Sichtprobe), die Silhouette und jeder Schattenwurf zeigen aber die Polygone; und die Maxima abseits der
   Falten (Rex 133° an der Schnauze, Tigerkopf 56°, Kegel 54°, Teile 61–89°) sind Stellen, an denen der Käfig schon auf
   Stufe 3 Falten von 14–27° hinterlässt — auf Stufe 1 werden daraus Knicke, die man sieht. Das deckt sich mit der
   Käfiggüte der Extremreihe (Rex kleinster Innenwinkel 29°, Seitenverhältnis 24,9).
4. **Flache Flanken kommen aus der Zeichnung.** Das Flachband wächst mit dem Berühren „mittel“ um höchstens 3 Punkte;
   der Kegel hat 34 % Flachband in der Seite, weil seine Front ein Dreieck ist, der Vierbeiner 31 % in der Front wegen seiner
   breiten geraden Flanken. Für die wilden Umrisslinien (V2) heißt das: Wo ein Drittel der Fläche in der Blickrichtung
   liegt, ist die Silhouette in der Tiefe schlecht bestimmt — unabhängig von der Fülle-Stufe.
5. **Normalen der Grenzfläche** (Punktnormalen der Stufe 3 an denselben Käfigpunkten) bringen gegenüber glatten
   Punktnormalen der Stufe 1 im Bild nichts Sichtbares; die Zahlen dazu wurden nicht gemessen (nur die Bilder).

## Nicht gemessen, Grenzen

- Kein Körper **mit Maul** auf Stufe 1 oder 2 (gibt es im heutigen Bau nicht); keine Trennung der Maul-Knicke nach Haut /
  Lippe / Tasche (`orteNachBereich` gilt für den alten Maulbau, nicht für den Einsatz).
- Keine Zähne, Augen, Beine, Posen, kein Earle-Material, keine Schatten; die Bilder nutzen three.js `MeshToonMaterial`
  mit drei Stufen, orthografisch, ohne Muster. Wie das Spiel selbst (WebGPU/TSL, Atlas, Deskriptoren je Ecke) Stufe 1
  schattiert, ist nicht geprüft; die Spiel-Probe P0 auf dem iPhone steht aus.
- „Abseits der Falten“ nimmt alle scharfen Käfigkanten aus, bei Teilen auch die Klinge (gezeichnet / Klinge sind in Tabelle a
  getrennt gezählt: Ente 8 / 38, Fisch 8 / 22); eine Variante „nur gezeichnete Falten ausgenommen“ wurde nicht gerechnet.
- Flachband-Varianten bei Teilen sind Kern-Optionen (`baumAbleiten({ fuelle })`), nicht das, was der Editor baut.
- Die Δ-Messung (`blattAbweichungen`) ist an exakt achsparallelen Flächen auf 0,2 px empfindlich (Tigerkopf, siehe Methode);
  alle anderen Zahlen reproduzieren den Editor exakt.
- Laufzeiten: Bau 0,2–0,3 s je Körper, Messung 0,7–2,3 s je Körper und Variante, Maulfälle 10–15 s; gesamt 59 s.

## Befehle

```
cd packages/shape
npx vite-node ../../apps/editor/scripts/pruefen/dreieck-budget.ts
BILD=1 npx vite-node ../../apps/editor/scripts/pruefen/spielstufe.ts          # Tabellen a–d, Netze als JSON
MAUL=1 npx vite-node ../../apps/editor/scripts/pruefen/spielstufe.ts          # dazu Tabelle e (Maul-Einsatz)
PROBE=tigerkopf KOERPER='' TEILE='' VARIANTEN=0 npx vite-node ../../apps/editor/scripts/pruefen/spielstufe.ts
cd ../../apps/editor && node scripts/pruefen/spielstufe-bild.mjs             # PNGs nach docs/progress/editor/
```

Umgebung von `spielstufe.ts`: `KOERPER` (Röhre, Standard kugel,ei,rex,langhals,robbe,tigerkopf,kegel), `TEILE` (Standard
ente,fisch,vierbeiner), `VARIANTEN=0`, `BILD=1`, `MAUL=1` (+ `FAELLE`), `PROBE=<Körper>`, `AUSGABE`.

Wiederverwendet (nichts geändert): `editorBauen`, `editorPlan`, `imAblauf` (`kern/pruefen/extremMessung.ts`), `EXTREMREIHE`,
`baumAbleiten`, `baumFalten`, `teilbaum`, `unterteilung`, `grenzMaske`, `anwenden3`, `alleFlaechen`, `blattAbweichungen`,
`umrissStuecke`, `ABWEICHUNG_PX`, `umrissAusNetz`, `faltenAbkoemmlinge`, `flaechenVorfahren`, `feinesNetz`, `wesenBauen`,
`einsatzFall`, `einsatzAblauf`, `pfadAbtasten`, `vollerPfad`.
