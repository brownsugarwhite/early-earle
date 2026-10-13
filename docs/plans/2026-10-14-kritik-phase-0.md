# Kritik-Register nach Phase 0 (14.10.2026)

> Florian (14.10. nachts): „Ich kann es jetzt nur schwer beurteilen. Beim Feuer fehlen mir ein paar Verläufe und das Gas ist auch noch weit von der Vorlage weg, sieht aber alles schon vielversprechend aus. Deine ehrliche Kritik trifft zu und wird vermutlich in den nächsten Phasen erst behoben. Notiere es als Kritik, dass es nicht vergessen wird, und dann los mit Phase 1.“
>
> Diese Liste ist das Gedächtnis dafür. Jeder Punkt hat die Phase, die ihn löst (Plan [`2026-10-13-wesen-editor-2.md`](2026-10-13-wesen-editor-2.md), Abschnitt 11). Erledigtes wird mit Datum abgehakt, nicht gelöscht. Vor jedem Phasenende diese Liste gegen den Stand prüfen.

## Florians Urteile (Phase 0)

| Datum | Woran | Urteil | Folge |
|---|---|---|---|
| 14.10. | Rex-Haps (Beweis 2) | „scheint für mich erstmal zu passen“; der getrennte Kiefer mit Überbiss (Unterkiefer läuft deutlich in den Oberkiefer) ist ihm wichtig | Phase 2 (Kiefer getrennt) |
| 14.10. | Tiger-Kopf (Beweis 4) | „zumindest schon besser als alle Versuche zuvor“, „vor allem das Maul passt noch nicht“ | Maul technisch sauber (14.10. spätabends); Look-Urteil offen → Phase 2/4 |
| 14.10. | Stile, erste Runde (Beweis 5) | „ganz gut, aber treffen es noch nicht wirklich“ | zweite Runde gebaut |
| 14.10. | Stile, zweite Runde | „Beim Feuer fehlen mir ein paar Verläufe, das Gas ist noch weit von der Vorlage weg, sieht aber alles schon vielversprechend aus“ | unten, Phase 4 |

## Offene Kritik, nach Phase geordnet

### Phase 1 (Kern breit)

- [ ] **Kein Worker, dichte LU:** Bau läuft im Hauptthread (Umbau 90–150 ms, Maul ≈ 150 ms); ab ≈ 2 000 Käfigpunkten ist eine dünn besetzte Zerlegung nötig. (Beweis 1)
- [ ] **Front/Top-Widersprüche entscheidet der Kern still** für die kleinere Breite (Rex Front 11 px, Langhals Top 16 px). Mit Reifen/Breitenlinie als Griffen entscheidet Florian. (Beweis 1)
- [ ] **Reifen kein 3D-Griff**, Spanten nur als Dokumentfeld; keine Front-Griffe; nur der Seitenumriss ist Griff, kein Pinsel im 3D. (Beweis 1)
- [ ] **Hals-Übergang ohne Überblendung** (Langhals: Kopf → Hals), Ringe nach Krümmung lassen gerade Hälse dünn besetzt (3 Ringe auf 0,23 Hals); **Loop-Cut/Verdichtung** fehlt. (Beweis 1/2)
- [ ] **Ente als Form nur mit Teilen** (Überhang-Schnabel ist kein Umriss-Fall). (Beweis 1)
- [ ] **Maullinie, Augen, Spanten, Kanten sind im Editor noch Code (Ausstattung je Prüfwesen)**, nicht gezeichnet. Florian muss den Tiger-Kopf selbst bauen können (Abnahme Phase 1). (Beweis 2/4) — *14.10. abends, M3 Teil 1:* Maullinie gezeichnet (Maul-Tab) und Augen per Klick (Stufe „Augen“) landen in der Ausstattung des Dokuments und bauen den Kern; Spanten sind Reifen auf dem Körper (M3 Teil 2: Perle, Band, ⌃R); Kantenlinien werden Falten (M3 Teil 7, erste Stufe ohne Einrasten).
- [ ] **Alte Bauwege und Versuche** (`packages/shape/src/versuch/`, sechs Bauwege in `Szene3D.tsx`, `?versuch=`-Routing) sind noch da; Kerne vorher herauslösen (Plan 10).
- [ ] **Dokument v0** ohne Käfig; v1 mit Migration fehlt.

### Phase 2 (Maul, Zähne, Augen)

- [ ] **Kiefer getrennt / Überbiss** (Florian: wichtig), Lippenband zwischen roter und blauer Lippe, Hauer außen bei geschlossenem Maul.
- [ ] **Rachenlinie und Kieferlinie als Griffe** (heute Automatik: Lotfußpunkt auf der Wirbelsäule ab Racheneingang; Band/Platte/Beutel als Zahlen).
- [ ] **Bodengrenze / Kieferbereich bei dicken Rümpfen:** Tiger braucht 30° statt 58°, weil die Flanke hinter dem Winkel faltet; die Kieferlinie soll den Jaw-Bereich begrenzen.
- [ ] **Sehr dünne Hälse** (Giraffenhals 2 % der Höhe) bleiben mit Maul durchdrungen (≈ 70/110); braucht Loop-Cut oder eine gemeinsame Tasche beider Seiten.
- [ ] **Kehl-/Nackenkette, Zunge, Zähne einzeln setzen, Zahnprüfung, Zahnrahmen je Öffnungsart.**
- [ ] **Augen im Mesh mit Augapfel** (Raubtiere), Augen-Zustände X/Sichel/Spirale/Blinzeln; der Tiger hat heute gemalte gelbe Schlitze mit Lidring.
- [ ] **Kleines geschlossenes Maul → großes rundes offenes Maul** (Florian, 15.10. nachts: „Offen soll der Tiger ein großes rundes Maul wie in meiner Referenz haben können. Es ist wichtig, dass über die Mischung aus Blendshape und Knochen auch sehr kleine geschlossene Mäuler sehr groß werden können.“). Heute öffnet nur der Knochen (Drehung um die Mundwinkel), die Größe des Haps hängt an der Maullänge. Weg (Plan 5.2): Fressen-Pose = Knochen + Körper-Blendshape als Käfig-Deltas derselben Topologie (Lippenschleife bleibt, Mundwinkel wandern nach hinten/außen, Lippen weiten sich zum Rund), mit der Öffnung überblendet, in der Pose mit den Pinseln bearbeitbar; bei kurzen Mäulern braucht der runde Rand mehr Lippenpunkte (Loop-Cut längs am Maul). (Phase 2; Vorprobe siehe Phase-1-Plan)
- [ ] **Tiger-Maul als Mercedesstern** (Florian, 15.10. nachts): Auf seinen Entwürfen bildet der Nasenverbindungsstrich mit den beiden Maularmen einen Mercedesstern, und die **Mundwinkel enden geschlossen noch auf der ersten vorderen Plattenfläche** der Kastenschnauze. Im Kern läuft die Lippe heute über die Frontplatte hinaus an die Seiten (Winkelring bei 17 % der Länge, Kasten endet bei 15 %). Nötig: Mundwinkel auf der Frontplatte (Winkelring an der Plattenkante oder Lippe ganz im Kappengitter), die Maularme laufen von der Plattenmitte schräg nach außen-unten; der Unterkiefer schwenkt als untere Plattenhälfte plus Kinn. (Beweis 2/4, Phase 2) — *15.10. nachts, Sofortprobe:* Winkel von 17 % auf 6 % (Ring 2, gleich hinter der Platte) mit Rille 0,6 % und Armen ab der Plattenmitte: 0 Durchdringungen, als Tiger-Standard übernommen; Zähne am kurzen Maul skaliert. Rest (Winkel auf der Plattenfläche, gerade Diagonalen, größerer Haps) braucht die Plattenmaul-Topologie.
- [ ] **Kinn** (gerades Kastenkinn der Raubkatzen) und **W-Oberlippe** (Hund), Rundmaul (Fisch), Maul ohne Unterkiefer (Drache) als Maularten.
- [ ] **Zug am Seitenumriss mit Maul** baut heute neu (≈ 150 ms) statt zu ziehen.

### Phase 3 (Teile, Rig)

- [ ] **Teil als Bibliotheks-Dokument** mit Ansatzring; heute nur Säulenbein aus Parametern.
- [ ] **Knochenkette mit Knie und Fuß, IK, Gewichte nach Ringindex**, 3 × 3-Felder, Flügel/Flossen/Schwanz/Hörner/Fühler.
- [ ] **Körper auf die Füße heben** auch im Kern (heute nur im Editor).

### Phase 4 (Klingen, Haut, Stile)

- [ ] **Feuer: Verläufe fehlen** (Florian). Die Bänder sind flache Stufen; der Bogen hat weiche Verläufe innerhalb jeder Stufe (Look-Vertrag: Verläufe nur innerhalb harter Stufen) und Innenbänder auf den Zungen selbst; Farbstufe genau nach Stufe 7 abgleichen.
- [ ] **Gas: noch weit von der Vorlage** (Florian). Schwaden als elegant geschwungene Fahnen (Locke als gezeichnete Kurve statt Kringelzahl), weiche Airbrush-Ränder des Körpers, Bläschen mit weichem Rand, Wirbel feiner.
- [ ] **Fell am weitesten vom Bogen:** Wolle aus hunderten weichen Strichen. Weg: gemaltes Büschelfeld als Hauptträger (Abstandsfelder im Zonen-Atlas), gebaute Büschel nur am Umriss, kleinere Büschel am Gesicht, Material-Federung je Klinge.
- [ ] **Zonen im Editor zeichnen** (Vektorformen auf dem Körper, ⇧W Weichheit), Muster je Zone aus dem Atlas, Kacheln mit mehr Texeln als Netzpunkten (Rasterung auf der Grenzfläche).
- [ ] **Jelly auf dem Kern-Netz**, Stil-Tab mit Reglern, Zonen für Feuer/Gas; Jelly blasser als Bild 1 (L 189 gegen 219).
- [ ] **Schnurrhaare, Mähnenkrause, Ohrmuscheln** (Tiger-Kopf gegen Bild 9), Stirnzeichnung als Vektorformen statt Streifenmuster.

### Phase 5 (Spiel)

- [ ] Export ins Spiel, 36 Wesen auf dem iPhone 16 ≥ 58 fps, ≤ 100 Draw Calls; Fell-Budget (680 gebaute Büschel ≈ 170 000 Dreiecke sind keine Spiel-Variante).

## Erledigt (mit Datum)

- [x] 14.10.: Kastenschnauze (ebene Kappe), Hautfalten enden an der Lippe, Rachenlinie automatisch, Leiter entfächert, Drache als Prüfwesen → Beweis 2 ganz.
- [x] 14.10.: Beine am runden Bauch (gleichmäßige Ringwinkel, Feldrand wandert die Achse hinab) → Beweis 3 ganz.
- [x] 14.10.: Zonen-Atlas → Beweis 4 ganz.
- [x] 14.10.: Stile zweite Runde (Zwiebel, wellige Bänder, Wirbel, Locken, Kugelbläschen, Büschelfeld).
