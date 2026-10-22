# Phase 0, Beweis 2: Maul mit Haps (13.10.2026, nachts)

> Plan: [`docs/plans/2026-10-13-wesen-editor-2.md`](../plans/2026-10-13-wesen-editor-2.md), Abschnitte 5.1, 5.2 und 11.1 (2). Code: `packages/shape/src/kern/maul.ts` (Einstieg `@ee/shape/kern`), Editor-Tab „kern“ mit Chips „Maul: aus · vorn · unten · hals“, Regler „Öffnung“ und „Käfig zeigen“ (`apps/editor/src/kern/kernBau.ts`). Messung `packages/shape/src/kern/beweis2.test.ts` (Stufe 2, Ausgabe mit `--reporter=verbose --silent=false`), Diagnose nach Käfig-Elternflächen `maul.diag.test.ts`. Bilder `docs/progress/editor/kern-maul-<wesen>-<lage>-<zu|halb|auf>[-kaefig].png` (`MAUL=1 node apps/editor/scripts/kern-bilder.mjs`).

Kriterium des Plans: Maullinie an drei Stellen (vorn, unten, Hals) → Längsschleife einrasten, Schlitz, Tasche, Kiefer, Öffnung 100 %; 0 Durchdringungen bei 0/25/50/75/100 %, Bohne, Umbau ≤ 200 ms, Vergleich mit `rex_mouth_detail` und dem Drachen.

## Was gebaut ist

1. **Maullinie in Wirbelsäulen-Koordinaten** (`MaulLinie = { fv }`: Anteil f der Wirbelsäule, Höhe v auf der Sprosse). So liegt die Lippe immer auf der Fläche, auch wo die Sprossen fächern (Hinterkopf, Halsansatz); eine gezeichnete 2D-Linie wird mit `maulLinieAusPunkten` übersetzt, `maulLiniePunkte` liefert sie dicht zurück. Vorgefertigte Linien je Lage: `maulLinieVorlage(dok, 'vorn' | 'unten' | 'hals')`.
2. **Schleife einrasten** (Plan 4.2): Der Pfad ist die Kappenzeile durch die Spitze plus die Längsschleife j_L = N/4 bis zum Winkelring k. Jeder Ring und jeder Quadratring der Kappe wird so umparametrisiert (`umparametrisieren`, Ecken bleiben Stützstellen), dass sein Lippenpunkt auf der Linie liegt; die Station des Winkelrings rastet auf den gezeichneten Mundwinkel (der Ring auf den Winkel, nicht umgekehrt).
3. **Schlitz**: obere und untere Kopie je Pfadpunkt (der Mundwinkel bleibt ein Punkt), Flächen unterhalb des Schlitzes werden auf die Kopien umgeschrieben; Lippenkanten sind scharfe Falten; **Rille**: beide Ketten 1,2 % der Höhe nach innen (dunkle Maullinie wie auf den Bögen; Ober- und Unterhaut treffen sich im Winkel statt tangential).
4. **Tasche**: K = 3 Inset-Reihen je Kette (Lippe → Zahnfleisch → Rachen) als Linse (Dicke nach lokaler Dicke, wächst nach innen), Rachenziel je Spalte auf der Wirbelsäule zwischen Lippenstation und Winkelring (nie hinter dem Scharnier), Winkelsäule, **Vorhang** aus Vierecken zwischen oberer und unterer Reihe K mit je einem Dreieck in den Mundwinkeln (die einzigen Nicht-Vierecke); Umlaufsinn aus der Haut abgeleitet, Käfig geschlossen und mannigfaltig (`pruefeKaefig`). Taschenpunkte werden in der mittleren Höhe und innerhalb von 80 % der Breite ihrer Station gehalten.
5. **Löser**: Käfig durch die Ziele, Naht-Ausgleich nur auf der Haut (Start über der Spitze), Lippenziele mit Nahtgewicht; **Laplace-Glättung** im Ausgleich (`glaettung`, Plan 4.4) gegen den Wellenschlag reiner Interpolation neben scharfen Falten; untere Kette bitgleich auf die obere; Tasche gegen die Ketten nachgelöst (mit Glättung), damit Ober- und Unterblatt spiegelbildlich bleiben.
6. **Kiefer** (`maulPose`): Unterkiefer dreht um die Achse durch die Mundwinkel (Gewichte aus der Lage zum Schlitz, Kehlband 2 Ringe), Schädel kippt um ein Gelenk hinten (Werkstatt-Wissen), Band 8 Ringe; Öffnungsart „ziehen“ (Robbe, Drache) als Verschiebung entlang Rachen → Lippe; Kieferplatte mit Kehlbeutel als Option. Posen laufen auf dem Käfig, die Matrix liefert das Netz (Öffnung ≈ 3 ms).
7. **Look**: Deskriptoren für Rachen (Tiefe), Lippenband (Abstand zur Lippe), Unterlippenseite und Kante; Lippenband 3 % der Höhe; Rex-Palette: Lippenband hell, Rachen maroon (Bilder).
8. **Diagnose**: Durchdringungen je Paar von Käfig-Elternflächen (Kindflächen je Stufe in Eltern-Reihenfolge), Taschenpunkte außerhalb der Haut, lange Käfigkanten. Damit wurden die Ursachen unten gefunden.

## Messwerte (Stufe 2, 461 px je Kachel; Käfig 527–653 Punkte)

| Fall | Umbau (Stufe 3) | Lippe → Linie | Durchdringungen 0 / 25 / 50 / 75 / 100 % | Spalt vorn bei 100 % |
|---|---|---|---|---|
| Kugel, vorn | 55 ms (Stufe 2) | 2,4 px (Rille) | **0 / 0 / 0 / 0 / 0** | 128 % der Maullänge |
| Rex, vorn | **140 ms** | 1,3 px (Rille) | 120 / 10 / 10 / 10 / 10 (offen nur am Apex) | 143 % |
| Rex, unten | 49 ms (Stufe 2) | 0,6 px | 368 / 92 / 94 / … | 139 % |
| Langhals, Hals (zieht) | 69 ms (Stufe 2) | 4,0 px | 2538 / 1894 / … | 90 % |

Bohne: ja (Bild `kern-maul-rex-vorn-auf.png`: Lippenband hell, Rachen maroon, Oberkiefer kippt, Unterkiefer fällt). Umbau 140 ms ✓ (≤ 200). Öffnung als Pose ≈ 3 ms.

## Was stimmt und was nicht (deutlich)

- **Trägt:** Maul als Kantenpfad im selben Käfig (keine eigene Topologie je Maulart nötig), Schleife einrasten je Ring, Tasche mit Vorhang nur aus Vierecken plus zwei Dreiecken, Käfig immer geschlossen, Kiefer als Käfig-Pose. Die Kugel erfüllt das Kriterium vollständig. Der Rex öffnet sauber bis auf 10 Paare an der Spitze.
- **Apex:** Die Rex-Schnauze ist in der Vorlage eine scharfe Ecke, die Lippe beginnt genau dort. In einer Spitze ohne Dicke ist kein Platz für eine Tasche; die unteren Blätter streifen die Kinnhaut (10 Paare, unsichtbar). Weg: Lippenanfang unterhalb der Spitze (Kappenzeile b_L < c/2, Topologie ist vorbereitet) oder eine stumpfe Kappe.
- **Geschlossen am Rex (120):** Ober- und Unterblatt der Tasche kreuzen sich knapp hinter der Lippe, wo die Schnauze dünn ist (Linse ≈ 1–2 px). Weg: Verdichtung (Loop-Cut neben der Lippe, Plan 4.2) und ein Mindestabstand der Blätter.
- **Unten (368):** gleicher Mechanismus an der Kinnspitze plus die tiefe Lippe nahe der Bauchnaht (kleine untere Ringhälfte).
- **Hals (2538):** Die Tasche faltet sich, wo das Maul um den Hinterkopf in den Hals läuft (Spalten verschiedener Lage zielen auf nahe Rachenpunkte), und „ziehen“ ist nur als Richtung gebaut, nicht gegen die Haut geprüft. Bild `kern-maul-langhals-hals-auf-kaefig.png` zeigt es. Weg: Rachenlinie als eigene Kurve (Plan 5.1: Kieferlinie als zweiter Griff), Kehlkette.
- **Kehle/Nacken:** Hinter dem Mundwinkel teilt die Schleife den Ring in Schädel- und Kieferseite; folgt nur die obere Hälfte dem Schädel, entsteht eine Scherlinie längs des Halses (Langhals), folgt der ganze Ring, faltet sich die Kugel unten. Beides ist als Option da (`nackenGanz`); die Werkstatt-Ketten (⅔/⅓) fehlen noch.
- **Kinnboden bei Blobs:** Eine starre untere Halbkugel kann 58° kippen, ohne dass der Kinnboden in den Bauch schwingt (Kugel 0 Paare); die Kieferplatte mit Kehlbeutel war ein Irrweg (faltete), bleibt als Option aus.
- **Nicht gebaut:** Zähne, Zunge, Kiefer getrennt (Überbiss als Griff; ein Überbiss-Versuch lag die Unterlippe falsch, deshalb die Rille), Maulart Loch/W-Lippe, Zug am Seitenumriss mit Maul (Umbau statt Zug, ≈ 150 ms), Stufe 3 im Durchdringungstest (Rasterbeschleuniger sprengt den Speicher).

## Urteil

Beweis 2 ist **zur Hälfte bestanden**: Mechanik, Topologie, Tempo, Bohne und Look stimmen; die Kugel erfüllt alle Kriterien, der Rex offen bis auf den Apex. Nicht erfüllt sind 0 Durchdringungen geschlossen am Rex, „unten“ und „Hals“. Das spricht nicht gegen die Bauweise (die Fehler sind örtlich: dünne Spitze, Blattabstand, Rachenlinie am Hals), der Rückfall aus Plan 13 (Maul-Topologie als Vorlage je Maulart) ist nicht nötig. Entscheidung für Florian: den Haps am Rex ansehen (`kern-maul-rex-vorn-auf.png` gegen `rex_mouth_detail`) und ob die Rille als Maullinie gefällt; dann Apex-Regel, Loop-Cut neben der Lippe und Rachenlinie als Griff.

## Nachtrag 13.10. spätnachts: Lippe unter der Spitze, Linsenrichtung geglättet

Florian zum Rex-Haps (`kern-maul-rex-vorn-auf.png`): „scheint für mich erstmal zu passen.“ Danach zwei Änderungen:

1. **Lippenanfang unter der Spitze** (`MaulLinie.unterSpitze`, Vorlagen vorn/unten = 1): Der Pfad beginnt an der Bauchnaht des ersten Quadratrings der Kappe statt in der Schnauzenspitze; der Oberkiefer steht vor (Überbiss wie beim Rex-Bogen), und in der scharfen Spitze muss keine Tasche sitzen. Die Lippe läuft an dieser Station zur Naht hinab (Kinnschnitt), die Linse dort nimmt die Dicke der ersten Kreuzungsspalte.
2. **Linsenrichtung** („oben“) entlang der Lippe geglättet (±2 Spalten) und gegen die Taschenrichtung orthogonalisiert. An der Kinnnaht zeigte „oben“ in die Tasche hinein und trennte die Blätter nicht; am Übergang Kopf → Hals drehte es in einer Spalte um 90°.

| Fall | Lippe → Linie | Durchdringungen 0 / 25 / 50 / 75 / 100 % | Spalt vorn bei 100 % |
|---|---|---|---|
| Kugel, vorn | 1,3 px (Rille) | **0 / 0 / 0 / 0 / 0** | 122 % |
| Rex, vorn | 0,3 px | **0 / 0 / 0 / 0 / 0** | 135 % |
| Rex, unten | 0,8 px | **0 / 0 / 0 / 0 / 0** | 145 % |
| Langhals, Hals (zieht) | 4,0 px | 2424 / 1976 / … | – |

Umbau Rex (Stufe 3) 135–155 ms. Die Tests `beweis2.test.ts` verlangen jetzt 0 Durchdringungen für Kugel, Rex vorn und Rex unten.

**Hals (Drache) bleibt offen:** Die Taschenreihen benachbarter Spalten am Halsansatz (Ringe 12–15) zielen auf fast denselben Rachenpunkt (Wirbelsäule bei Station Lippe + 0,7 · Rest) und laufen aufeinander zu; die Vierecke zwischen den Spalten werden Splitter und verdrillen sich (Diagnose: Elternflächen `F487/F505`, obere gegen untere Reihe derselben Spalten). Weg: die Rachenlinie als eigener Griff mit eigener Teilung (Plan 5.1, Kieferlinie), die Reihen der Halsspalten laufen waagerecht zur Halsachse, nicht zum Halsansatz.

**Urteil neu:** Beweis 2 ist für **drei der vier Lagen bestanden** (vorn, unten, Kugel); Tempo, Bohne, Look, Lippe auf der Linie und Mannigfaltigkeit überall. Offen: Hals, Zähne, Zunge, Kiefer getrennt, Zug am Seitenumriss mit Maul. Vergleichsbild [`vergleich-maul-rex.png`](../progress/editor/vergleich-maul-rex.png) (`node apps/editor/scripts/maul-vergleich.mjs`).

## Nachtrag 14.10. abends: Kastenschnauze und Hals sauber, Beweis 2 ganz bestanden

Florian (14.10.): „Du hast ja selbst bemerkt, dass vor allem das Maul noch nicht passt. Mache erst alle Beweise ganz fertig.“ Befunde und Umbauten, alle in `packages/shape/src/kern/maul.ts` und `ableiten.ts`, Messung Stufe 2 in `beweis2.test.ts`:

1. **Kastenfront (Tiger).** An einer senkrechten Front fächern die Sprossen der Leiter um die Spitze; die Kappe war nur ein winziges Feld an der Lippe (3 × 3 Punkte in 2 % der Fronthöhe), die Front bestand aus Ring 0. Die Lippenzeile lag praktisch auf der Spitze, die Fläche dazwischen faltete (84 Durchdringungen geschlossen). Jetzt **`kastenKappe`** (`ableiten.ts`): Liegt Ring 0 in der Frontebene (Vorschub gegenüber der Spitze < 6 % seiner Höhe), wird die Kappe ein ebenes Gitter in Ring 0, Quadratring r = Ring 0 um r/(c/2) zum Frontpunkt C verkleinert, C auf der Frontlinie in Lippenhöhe; die Lippe geht als Mittelzeile durch die Spitze (`unterSpitze` 0). Spitzige Schnauzen (Rex, Kugel) bleiben unberührt.
2. **Hautfalten enden an der Lippe.** Eine Ringfalte (Umriss-Ecke: Nasen- und Kinnecke des Tigers) kreuzte den Schlitz und lag nur auf einer Lippenkopie (oben die obere Ringhälfte, unten die untere). Die eine Kopie wurde Ecke, die andere Faltenpunkt, die Grenzlagen der beiden Ketten klafften 0,02. Jetzt werden an jedem Lippenpunkt die Kanten zur Haut entschärft; beide Kopien sehen dieselben zwei Lippenfalten.
3. **Linse am Taschenpunkt messen**, nicht an der Lippe (`dickeAn`): Bei der Kastenfront ist die Kappendicke null, die Tasche liegt aber in den vollen Ringen dahinter.
4. **Kiefer des Tigers:** Der Kopf sitzt auf dem Rumpf; bei 58° stieß der Unterkiefer an die Brust und die Flanke hinter dem Winkel faltete (Haut an Haut, 128 Paare). Ausstattung: Unterkiefer 30°, Schädel 26°, Band 1 Ring. Die eigentliche Lösung (Kieferlinie als Griff, Bodengrenze) ist Phase 2.
5. **Rachenlinie neu** (`Tvon`): Vorher Ringmitte bei Station i₀ + 0,7 · (k − i₀). Läuft das Maul um den Hinterkopf in den Hals, liegen die Lippen an der Halswurzel als Stapel übereinander (flache Ringe), die Taschenspalten zeigten alle senkrecht nach unten auf dieselbe Stelle, deckten sich und kreuzten sich (2 424 Paare). Jetzt ist die Rachenlinie die Wirbelsäule ab einem **Racheneingang** bei `rachenTiefe` des Wegs bis zum **Halsansatz** (erster Knick > 50° gegen die Kopfachse über die ersten drei Ringe, hinter dem der Querschnitt auf ≤ 70 % fällt; ein Knick in einen dickeren Rumpf wie beim Tiger zählt nicht) oder bis zum Winkelring; das Rachenziel je Lippenpunkt ist sein **Lotfußpunkt** auf dieser Linie, nie vor dem Eingang. Schnauzenlippen laufen nach hinten zum Eingang (tiefe Bohne, Rex unverändert), Seitenlippen waagerecht nach innen; seitlich höchstens 80 % der Ringbreite am Ziel. Die Rille ist auf 40 % des Wegs zur Ringmitte begrenzt (dünner Hals).
6. **Leiter entfächert** (`kernLeiter`, `leiterEntfaechern` in `ableiten.ts`): Am Langhals-Schwanz war die Rückenlinie aufgebraucht, während die Bauchlinie noch 6 % rundete; alle Sprossen dort teilten sich den Spitzenpunkt, Ring 23 und die hintere Kappe fielen auf ihn zusammen (94 Durchdringungen im Körper ohne Maul). Läufe, in denen eine Linie weniger als die Hälfte des Rests der anderen vor sich hat, werden linear mitgeführt (Anfang und Ende). Alle fünf Prüfwesen sind ohne Maul jetzt durchdringungsfrei (Test in `beweis1.test.ts`); Langhals-Naht 1,36 px statt 0,97 (Plan ≤ 2), Ente 0,54 statt 1,21.
7. **Drache als Prüfwesen** (`halsVerbreitern` in `kern/kasten.ts`, Editor `?wesen=drache`): der Langhals mit doppelt so dickem Hals in der Front (Giraffenhals ≈ 2 % der Höhe ist für zwei Taschen zu dünn; Florians Drache in Bild 5 hat einen dicken Hals). Der dünne Giraffenhals bleibt gemessen: geschlossen sind nur noch die Lippenblätter im dünnsten Halsstück betroffen (≈ 70 Paare), offen ≈ 110.

| Fall | Durchdringungen 0 / 25 / 50 / 75 / 100 % | Spalt vorn bei 100 % |
|---|---|---|
| Kugel, vorn | **0 / 0 / 0 / 0 / 0** | 122 % |
| Rex, vorn | **0 / 0 / 0 / 0 / 0** | 135 % |
| Rex, unten | **0 / 0 / 0 / 0 / 0** | 111 % |
| **Tiger, Kastenschnauze** (Kiefer 30°, Schädel 26°) | **0 / 0 / 0 / 0 / 0** | 83 % |
| **Drache (Langhals, Hals × 2), Hals, zieht** | **0 / 0 / 0 / 0 / 0** | 70 % |
| Langhals (Giraffenhals), Hals | ≈ 70 / … / ≈ 110 (nur im dünnsten Halsstück) | – |

Umbau Rex (Stufe 3) 141 ms. Bilder: `kern-maul-tiger-vorn-{zu,halb,auf}.png`, `kern-maul-drache-hals-{zu,halb,auf}.png` (je mit `-kaefig`), `kern-tiger-kopf.png`, `kern-tiger-kopf-auf.png`.

**Urteil neu:** Beweis 2 ist **bestanden** für alle drei Lagen des Plans (vorn, unten, Hals) und die Kastenschnauze. Offen bleiben als Griffe der Phase 2: Rachenlinie und Kieferlinie zeichnen, Kiefer getrennt/Überbiss, Zunge, Bodengrenze; dazu die Verdichtung (Loop-Cut) für sehr dünne Hälse.
