# Phase 0, Beweis 4: Look live (14.10.2026, abends)

> Plan: [`docs/plans/2026-10-13-wesen-editor-2.md`](../plans/2026-10-13-wesen-editor-2.md), Abschnitte 8 und 11.1 (4). Code: Deskriptoren `packages/shape/src/kern/deskriptoren.ts` (Gesichtsmaske), Kasten-Spanten `packages/shape/src/kern/kasten.ts`, Zähne `zahnLagen` in `packages/shape/src/kern/maul.ts`, Material `packages/render/src/creature2/material/earleCreature.ts` (Ruhelage als Attribut `eeRest`), Editor `apps/editor/src/kern/kernBau.ts` (Ausstattung je Prüfwesen), `apps/editor/src/three/wesenLook.ts` (Paletten), `Renderer3D.setzeWesen` (Gesicht, Zähne, Lidring). Bilder `docs/progress/editor/kern-tiger-kopf.png` (zu), `-kopf-auf.png` (Haps), `-kopf-kaefig.png`, `-ganz.png`, Vergleich `vergleich-tiger-kopf.png` (`TIGER=1 node apps/editor/scripts/kern-bilder.mjs -`, Montage `node apps/editor/scripts/maul-vergleich.mjs <bogen> <render …>`).

Kriterium des Plans: `createCreatureMaterial` auf dem neuen Netz mit Deskriptoren aus dem Käfig, Zonen mit einem harten Bauchfeld und einem weich auslaufenden Rückenfeld, Tiger-Streifen, gemaltes Auge mit Blinzeln, Zahnverlauf; Vergleichsbild Tiger-Kopf neben `raubkatzen_mouth closed_kastenschnauze.png`, Florians Urteil; keine Muster, die beim Ziehen schwimmen.

## Was gebaut ist

1. **Earle-Material auf dem Kern-Netz** (seit Beweis 1): 16 Deskriptor-Floats je Ecke aus dem Käfig (Bogenlänge, Winkel als cos/sin ohne Nahtsprung, Umfang, Bauch/Rücken; Rachen, Abstand zur Maulkante, Gesichtsmaske, Lippenkante, Unterlippenseite, Teil), mit derselben Grenzmatrix wie die Lagen aufs feine Netz abgebildet. Paletten Tiger, Rex, Blob, Giraffe nach `ZIELSYSTEM.md`.
2. **Zonen**: Bauchfeld hart (Federung 0,04), Rückenfeld weich auslaufend (Federung 0,9, Muster läuft über), Latz (cremefarbene Brust, Bild 9). Beim Tiger sichtbar in `kern-tiger-ganz.png`: Latz mit scharfer Kante, Rücken verläuft.
3. **Muster schwimmen nicht**: Das Material rechnet Muster, Zonen, Augen, Nase und Scharte im **Ruheraum**. Bei Posen (Haps, Beinschwung) führt das Netz die unposierte Lage als eigenes Attribut `eeRest` mit (`CreatureMaterialOptionen.ruheAttribut`); `kernBauen` liefert sie je Ecke. `kern-tiger-kopf.png` und `kern-tiger-kopf-auf.png`: Stirnstreifen, Nase und Augen liegen zu und offen an derselben Stelle der Haut.
4. **Zahnverlauf**: Zähne als Klingen-Käfige (`zahnLagen`: 6 oben, 5 unten, am Zahnfleisch = Taschenreihe 1 des posierten Käfigs, nach innen geneigt) mit `createToothMaterial` (Wurzel dunkler → Spitze heller über das Attribut `eeTooth`); sie hängen an der Kieferpose. Bilder `kern-maul-rex-vorn-auf.png`, `kern-tiger-kopf-auf.png`.
5. **Tiger-Kopf mit Kastenschnauze** (Ausstattung in `kernBau.ts`): Kasten-Spanten über die Front (`kastenSpanten`, Härte 0,85, von 2 % bis 15 % der Länge, bis 25 % rund auslaufend), Maullinie unter der Spitze (Überbiss), **Gesichtsmaske** auf dem Käfig (Kappe und Ringe 0–2 ganz, bis Ring 6 auslaufend, Oberseite frei): das Material macht die Schnauze hell (Bauchfarbe) und hält die Streifen fern; **Dreiecksnase** oben an der Front (Oberkante = höchster Mittellinienpunkt dicht hinter der Spitze, 5,5 % der Höhe darunter) mit **Scharte** hinab zur Lippe; **dünne dunkle Lippenlinie** (Lippenband 0,9 % der Höhe in Lippenfarbe `#3a2a26`); gemalte Schlitzaugen gelb mit Lidring (Ring 4, Winkel 3); Wangenzacken (14 Zacken um die untere Gesichtshälfte) und Ohren (zwei Tropfen) als statische Klingen mit den Deskriptoren ihres Fußpunkts; Streifen dünner mit Spitzen (Dichte 0,7, Größe 0,3).
6. **Kamera per URL** für Bilder: `&kamera=azimut°,elevation°,distanz,zielX,zielY,zielZ` (Kopf: −62°, 8°, 0,8 auf (−0,27, 0,4); Bogen-Blick Dreiviertel von vorn, Körper nach rechts hinten).

## Messwerte

| Was | Wert |
|---|---|
| Tiger (Stufe 2, Kasten + Maul): Lippen zu | Spalt 6 · 10⁻¹⁷ (Ketten liegen aufeinander) |
| Tiger: Durchdringungen 0 / 50 / 100 % | **76 / 144 / 346** (an der Lippe am kleinen Kappenfeld der Kastenfront; nicht erfüllt, siehe unten) |
| Rex vorn (Beweis 2): Durchdringungen 0 … 100 % | 0 / 0 / 0 / 0 / 0 |
| Umbau Tiger mit Maul (Stufe 3, Editor) | ≈ 150 ms; Pose ≈ 3 ms |
| Zonen | Bauch hart, Rücken weich, Latz hart (Bild `kern-tiger-ganz.png`) |

## Was stimmt und was nicht (deutlich)

- **Trägt:** Der Look läuft live auf dem Kern-Netz, mit Posen (Ruhelage als Attribut), Zonen, Streifen, gemalten Augen, Nase/Scharte und Zähnen mit Verlauf. Der Kasten über Spanten gibt der Schnauze die Front und die Kanten des Bogens, die Gesichtsmaske die helle Schnauze mit weißen Wangen.
- **Gegen den Bogen (Bild 9 rechts)** trifft der Kopf die Anlage (Kasten, Nase oben, Scharte, Lippenlinie, Streifen auf der Stirn, Latz), nicht die Feinheiten: Das **Kinn** fehlt (der Bogen hat ein markantes gerades Kinn unter der Lippe; unser Unterkiefer ist die runde Unterseite), die **Augen** sind gemalte Schlitze (der Bogen hat gelbe Mandelaugen mit Brauenwulst und Lidlinie, Plan 5.4 „im Mesh mit Augapfel“ für Raubtiere), die **Stirnstreifen** sind das prozedurale Wirbelsäulen-Muster (der Bogen zeichnet die Stirn mit ein paar gezielten Strichen und einem hellen Fleck über den Augen), **Schnurrhaare** und die **Mähnenkrause** als Fell fehlen, die Ohren sind Tropfen statt runder Ohrmuscheln. Alles davon sind Bausteine der Phasen 2 und 4 (Augen im Mesh, Zonen-Atlas, Klingen-Pinsel), kein Material-Problem.
- **Zonen-Atlas nicht gebaut** (Plan 8.2, Ptex-Kacheln mit Abstandsfeldern): Zonen sind weiter die drei prozeduralen Formen plus die Gesichtsmaske auf dem Käfig. Für den Tiger-Kopf reichte das; die Vektorformen auf der Haut (Florians Illustrator-Wunsch) bleiben Phase 4.
- **Tiger-Maul nicht sauber:** 76 Durchdringungen schon geschlossen, 346 offen. Die Lippe beginnt am winzigen Kappenfeld der senkrechten Kastenfront (die Kappe ist beim Kasten nur das Feld um die Spitze, die Front besteht aus Ring 0), Tasche und Rille laufen dort gegeneinander. Beweis 2 gilt damit für Kugel, Rex vorn und Rex unten, nicht für den Kasten; Weg: Lippe als Ring-Schleife durch Ring 0 statt durch die Kappe, oder Kappe so groß wie die Front (Kappenanteil je Wesen).
- **Blinzeln** läuft im Material (Uhr in `Renderer3D`), ist in den Standbildern aber nicht zu sehen.

## Offen, nächste Schritte

1. Florians Urteil zum Vergleichsbild `vergleich-tiger-kopf.png` (Bogen | Kopf zu | Kopf Haps | ganz).
2. Augen im Mesh (Plan 5.4) und Kinn als Kasten-Unterkiefer, dann der Tiger ein zweites Mal gegen Bild 9.
3. Tiger-Maul: Lippenschleife durch Ring 0 (Kastenfront), Ziel 0 Durchdringungen wie beim Rex.
4. Zonen-Atlas (Phase 4), Stirnzeichnung als Vektorformen statt Streifenmuster.

## Nachtrag 14.10. spätabends: Zonen-Atlas gebaut, Beweis 4 ganz

Das Kriterium verlangte den **Zonen-Atlas** (Plan 8.2); er fehlte in der ersten Fassung. Jetzt gebaut:

- **Kachelung** (`packages/shape/src/kern/atlas.ts`, `kachelung`): jede Käfigfläche eine Kachel von (2^L + 1)² Texeln. Die Unterteilung erzeugt je Ecke ein Kind [Eckpunkt, Kantenpunkt, Flächenpunkt, Kantenpunkt] am Stück; so bekommt jede feine Fläche ihre Käfigfläche und jede Ecke ihr (u, v), und die feinen Punkte liegen genau auf dem Kachelgitter. Tiger (Stufe 3): 541 Kacheln à 9², 216 × 216 Texel.
- **Zonen als Vektorformen** (`ZonenForm`): geschlossenes Polygon in einer Ansicht (Seite, Top, Front) mit **Weichheit je Punkt**. `zonenRastern` wertet je feinem Punkt in der Ruhelage den signierten Abstand (+ innen) und die örtliche Weichheit aus und schreibt sie in die Kacheln (Abstand RGB, Weichheit RGB als zweites Feld); gemeinsame Punkte benachbarter Kacheln bekommen denselben Wert → nahtlos (Test `atlas.test.ts`).
- **Material** (`earleCreature.ts`): Attribut `eeAtlas` (Kachelkoordinate je Ecke), zwei Half-Float-Texturen (in WebGPU filterbar), Maske je Zone = smoothstep(−w, w, Abstand) mit w = max(Weichheit, Ableitung) → harte Kanten pixelscharf, weiche nach der gezeichneten Weichheit; `atlasAn` schaltet die prozeduralen Zonen ab (`&atlas=0` zum Vergleich). Angesetzte Klingen (Wangen, Ohren) lesen die Kachel ihres Fußpunkts.
- **Tiger-Zonen** (`tigerZonen` in `kernBau.ts`, Seitenansicht): Bauchfeld **hart** mit welliger Kante bei 40 % der Höhe, Rückenfeld **weich** (0,12 H) ab 62 %, Latz an der Brust **oben hart, unten weich** (hart → weich entlang einer Form). Bilder `kern-tiger-ganz.png` (Atlas), `kern-tiger-ganz-prozedural.png` (Vergleich), `kern-tiger-seite.png`, `kern-tiger-ganz-auf.png` (Haps: der Atlas hängt an der Fläche und folgt der Pose von selbst).

Damit sind alle Punkte des Kriteriums gebaut: Material auf dem Kern-Netz, Zonen-Atlas mit hartem Bauch- und weichem Rückenfeld, Tiger-Streifen, gemaltes Auge mit Blinzeln, Zahnverlauf, Vergleichsbild, Muster ohne Schwimmen. Nicht gebaut (Phase 4): Zeichnen der Formen im Editor (heute Code), Muster je Zone aus dem Atlas, Ptex-Export fürs Spiel; die Kacheln bleiben bei (2^L + 1)² Texeln, feinere Formen brauchen Kacheln mit mehr Texeln als Netzpunkten (Rasterung auf der Grenzfläche statt an den Punkten).
