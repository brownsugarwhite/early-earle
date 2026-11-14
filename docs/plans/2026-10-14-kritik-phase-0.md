# Kritik-Register nach Phase 0 (14.10.2026)

> Florian (14.10. nachts): „Ich kann es jetzt nur schwer beurteilen. Beim Feuer fehlen mir ein paar Verläufe und das Gas ist auch noch weit von der Vorlage weg, sieht aber alles schon vielversprechend aus. Deine ehrliche Kritik trifft zu und wird vermutlich in den nächsten Phasen erst behoben. Notiere es als Kritik, dass es nicht vergessen wird, und dann los mit Phase 1.“
>
> Diese Liste ist das Gedächtnis dafür. Jeder Punkt hat die Phase, die ihn löst (Plan [`2026-10-13-wesen-editor-2.md`](2026-10-13-wesen-editor-2.md), Abschnitt 11). Erledigtes wird mit Datum abgehakt, nicht gelöscht. Vor jedem Phasenende diese Liste gegen den Stand prüfen.

## Florians Urteile (Phase 0)

| Datum | Woran | Urteil | Folge |
|---|---|---|---|
| 15.10. nachmittags | Ente mit Flügeln, Giraffe mit Bauch vor der Nase (Bild `docs/look/editor/florian-2026-10-15-ente-fluegel.webp`) | „Aus den Shapes lässt sich sehr genau ableiten, was verlangt ist … ich hätte eine weiche Ente mit Flügeln erwartet … sobald der Bauch weiter vorn ist als die Nasenspitze, springt es um … es muss flexibler und intelligenter werden“; Mund auch an Bauch, Hals, Nase frei setzbar | Plan Teil G „Grundkörper für jede Form“ nach dem Maul-Beweis (seine Entscheidung 7) |
| 15.10. vormittags | Maul an eigenen Wesen (Kugel mit Bauch, Ei, Langhals, Rex) | „äußerst fragil … Nasen und Bäuche kollabieren, komische Falten und Wellen, der gelbe Umriss wird shaky und ragt aus der schwarzen Form … Das Maul soll perfekt sitzen und das Grundmesh nicht beeinflussen“; J-Mundwinkel unmöglich, echter Rex-Unterbiss zerreißt alles | Plan [Maul als Einsatz, Werkzeug-Harmonie und Posen](2026-10-15-maul-einsatz-harmonie-posen.md), Teil A |
| 15.10. vormittags | Fressen nach „Fressen wie Editor“ | „beim Zurückspringen auf Editor bleibt der neue Shape der Fressen-Pose erhalten“; mit Maul nichts verschiebbar; „Im Fressen-Tab ist das Maul immer getrennt“; Regler für Morphs, Bones je Pose; „Das Posen- und Blendshape-Element ist das Herzstück“ | Rücknahme 42ef353; Teil B (B1 als Sofortkorrektur) |
| 15.10. vormittags | Pinsel und Linien | „Tools wie Ziehen und Aufblasen werden nicht korrekt auf die Shapes übertragen … jede Änderung der schwarzen Linie oder das Setzen des Mauls wirft unvorhersehbare Abweichungen aus. Alle Werkzeuge müssen perfekt harmonieren!“ | Teil H (Käfig als Wahrheit, Relief, örtliche Änderungen, Linien bleiben, wo gezeichnet) |
| 15.10. vormittags | Prüfungen | „Die Testwesen sind nur zum Testen. Daran ist nicht eine Sache abgenommen … Deine Tests waren sehr, sehr unvollständig“ | Teil V (Zufallsreihe, Werkzeug-Matrix, Kontaktbögen), keine Meldung „bestanden“ ohne Abnahme |
| 14.10. | Rex-Haps (Beweis 2) | „scheint für mich erstmal zu passen“; der getrennte Kiefer mit Überbiss (Unterkiefer läuft deutlich in den Oberkiefer) ist ihm wichtig | Phase 2 (Kiefer getrennt) |
| 14.10. | Tiger-Kopf (Beweis 4) | „zumindest schon besser als alle Versuche zuvor“, „vor allem das Maul passt noch nicht“ | Maul technisch sauber (14.10. spätabends); Look-Urteil offen → Phase 2/4 |
| 14.10. | Stile, erste Runde (Beweis 5) | „ganz gut, aber treffen es noch nicht wirklich“ | zweite Runde gebaut |
| 14.10. | Stile, zweite Runde | „Beim Feuer fehlen mir ein paar Verläufe, das Gas ist noch weit von der Vorlage weg, sieht aber alles schon vielversprechend aus“ | unten, Phase 4 |
| 15.10. | Zeichnung ist Form, Schritte 1–4 (Editor) | „passt weitestgehend“, „bei den anderen viel besser und genauer als vorher“, gerade Linie am Blob „funktioniert gut“ | Riesenmaul am Langhals behoben (unten) |
| 15.10. | Reifen/Kasten im Editor | „Mit den Kästen komme ich ganz gut zurecht! Das ist vielversprechend. Tiger sollte ich ohne Probleme hinbekommen“ | Phase-1-Abnahme (10-Minuten-Tiger) läuft bei ihm |
| 15.10. nachts | Sculpt-Tools, gelbe Linie; Maulgriffe ziehen Silhouettenpunkte | „Sollte sich nicht die echte Umrisslinie (schwarz) an diese Form anpassen?“ — „Die Mundhandles ziehen jedes Mal einen neuen Silhouettenpunkt statt sich selbst zu bewegen … Handles sind von der Außenhaut disconnected, es entsteht nicht der gewünschte Spalt. Das ist kaputt.“ | Formen folgen nach jedem Pinselstrich gebaut (Profile an die Silhouette, Deltas nachgeführt, Planseite „Zeichnung ist Form“ Stand 15.10. nachts); Maulgriffe in der Bauweise Kern frei (kein Umrissknoten), Kiefer endet als Wand am eigenen Anfang → Spalt (Planseite Phase 2) |
| 15.10. spätabends | Kiefer folgen den falschen Linien (M2) | „Die Linie beim Überbiss/Unterbiss folgt immer noch der schwarzen Shapelinie vom entgegengesetzten Kiefer … Die Kiefer müssen NUR ihrer Linie folgen, der blauen und der roten wie der schwarzen in den Ansichten. Die blaue Linie IST exakt die Lippenkante und die rote auch EXAKT eine Lippenkante! Das muss gelöst werden!“ | Kanten direkt aus den gezeichneten 3D-Linien (Seite, Front, Top, auch der Winkel), Naht des kürzeren Kiefers als Wand vom Anfang zum Umriss, dahinter die schwarze Linie unverändert, kein Einrasten der Anfänge im Editor; rot/blau 0,05–0,4 px in Seite und Front (Planseite Phase 2, Stand 15.10. spätabends) |
| 15.10. abends | Überbiss, Bilder mit langem Oberkiefer / Unterbiss (M2) | „zeig mir ein Bild, bei dem der Oberkiefer deutlich länger ist und ich von unten die Maultasche sehe, und einen deutlichen Unterbiss“ — „siehst du selbst, dass es nicht geht? Vorne sind die Lippen immer noch zusammen bei allen Bildern bis jetzt.“ | Ursache: die untere Kopie saß vorn auf dem roten Anfang. Jetzt eigener Anfang je Lippenlinie (die vordere ist der Schlitz, die andere die versetzte Kante), der kürzere Kiefer rückt als Ganzes hinter seinen Anfang, Unterbiss = blau vorn; Rex blau 0,0 px, offen 0 Paare; Bilder `ueberbiss-rex-{seite,unten,offen}`, `unterbiss-kugel-*` (Planseite Phase 2, Stand 15.10. abends) |
| 15.10. | Überbiss, Präzision und Spanten (M2) | „Rot und Blau sollen exakt die Lippenkante darstellen, bis jetzt nur sehr grob … ein Spant über Ober- und Unterkiefer in der Seite → in der Front zwei übereinanderliegende Spanten bearbeiten … Front, Seite und von oben“ | Grundbedingungen auf der Planseite Phase 2 (M2); Präzision gemessen (rot 0,2 px, blau ≤ 2 px Seite / ≤ 5 px Front an Ringspalten, Kinn bis 10 px), Kiefer-Spanten als nächster Meilenstein |
| 15.10. | Überbiss, Band-Bilder (M2) | „nicht, was ich wollte … Durchdringungen werden vom Überbiss bedeckt … Ober- und Unterkiefer separat als Teil des Shapes anpassen … Regler entsprechen nicht dem Plan“ | Zwei Teile des Shapes: blaue Linie in Seite (Höhe) und Front (Breite), Unterkiefer eingerückt, Überlappung verdeckt erlaubt; Regler und Band entfernt (Planseite Phase 2) |
| 15.10. | Überbiss, Kugel-Bilder (M2) | „kein echter Überbiss, die Lippen schließen immer noch bündig … der grüne Lappen geht offen mit dem Unterkiefer auf … die blaue und die rote Linie sollen genau die Lippenkante vorgeben; von unten die Maultasche des Oberkiefers sehen“ | Oberlippe als eigenes Band-Netz an der blauen Schleife bis zur roten Kante, Unterkiefer im Käfig zurückgesetzt (Planseite Phase 2) |
| 15.10. | Überbiss, erste Bilder (M2) | „passt noch nicht: der untere Kiefer ist an der vorderen Kante langgezogen bis zur überstehenden Spitze der Oberlippe; Unterkiefer und Lippe sind viel kürzer und schmaler … ragen geschlossen etwas hinein. Das sollte deutlich als Grundbedingung festgelegt sein!“ | Grundbedingung auf der Planseite Phase 2 (M2); Rex-Linie beginnt jetzt am Kinn, Lippendicke 4 % |
| Sitzungsende (14.10.) | Formen folgen, Handles an der Silhouette | „Wenn ich Pinseltools nutze, geht es und die schwarze Linie folgt. Wenn ich dann aber die Handles an der Silhouette bewege, springt die Form und beides passt nicht überein. Beim Maul soll auch die schwarze Linie direkt an die zugehörige Lippe angrenzen. Gelbe Linie ist immer gleich der schwarzen Linie!“ | Folgen nur nach Pinselstrichen, am Gestenende (50c1dd4); Maulspalt vorbereitet, aus → Planseite [Ruhiges Netz und Maulschlitz](2026-10-14-ruhiges-netz-und-maulschlitz.md), Block 2 |
| Sitzungsende (14.10.) | Bearbeiten nach dem Folgen | „Es wird gerade ganz schlecht zu bearbeiten. Es entstehen willkürlich Punkte und die Form springt.“ | Beim Folgen keine eingefügten Knoten mehr (50c1dd4) |
| 14.10. nachmittags | Stand nach dem Abbruch | „Das Springen wurde gerade schon besser. Am schwierigsten und unvollständigsten waren noch die Arbeit an Über- und Unterbiss … nicht wie im Plan … nicht besonders sauber.“ | Stand gesichert; Über-/Unterbiss als Block 2 neu |
| 14.10. nachmittags | Maul an der schwarzen Linie, zwei Bilder | „Das Kernproblem ist, dass Ober- und Unterkieferlinie nicht an der schwarzen Linie angrenzen … Sie sollen von der Seite direkt in die schwarze Profillinie übergehen und verbunden sein, wodurch ein echter Maulschlitz entsteht … Das echte Mesh reagiert viel zu sensibel und wirft sehr schnell Wellen und tiefe Falten … je ein Spant für Ober- und Unterkiefer … Der gelbe Meshrand weicht oft viel zu weit von der schwarzen Kontur ab!“ | Regel: die schwarze Linie ist die Wahrheit für den Umriss; Block 2 der neuen Planseite |
| 14.10. nachmittags | Wellen und Falten beim Verziehen, zwei Bilder | Kugel mit getrennten Kiefern: Unterkiefer als gefalteter Kasten (Front Δ 20,5 px); Komma mit hochgezogenem Schwanz: Sägezahn in Front/Top (Δ 33,4 / 26,5 px), Faltengrat auf dem Rücken | Block 1 der neuen Planseite (ruhiges Netz), Florians Wahl: zuerst |
| 14.10. abends | Maul nach dem Einzeichnen | „Das Maul läuft nach dem Einzeichnen spitz nach vorne. Es soll sich genau in dem eingezeichneten Shape, aber auf die Außenhaut legen und somit genau dessen Rundung haben … viele komische Artefakte und Falten, vor allem an den Kieferspitzen“ | Lippenbreite aus der Haut × Verhältnis der Knoten (8d6d993), von oben wieder rund; Lippenanfang koppelt Front/Top (c027839) |
| 14.10. abends | Glätten | „Oft sieht es während des Glättens sehr gut aus, und wenn ich dann loslasse, springt das Mesh in eine sehr unschöne Form.“ | Ursache Formen folgen mit Maul (7,5–59 px Sprung); mit Maul kein Folgen nach Pinselstrichen (ec9c27b); exaktes Folgen fürs Maul offen |

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

- [ ] **Umriss von oben und vorn = Zeichnung** (Florian, 15.10. morgens: „Auch beim Tiger weicht die Form von oben und von der Seite sehr von dem eingezeichneten Shape ab“). Plan [`2026-10-15-zeichnung-ist-form.md`](2026-10-15-zeichnung-ist-form.md). *15.10. morgens, Schritt 1:* Sichthülle und Breitenpunkte im Ausgleich; Top Rex 1,0 px, Tiger 4,0 (vorher 21,6), Langhals 14,2 (vorher 17,5). Rest: Langhals-Brust *(danach gelöst: `liegendAb` 0,5, Top 4 px)*, Tiger-Frontplatte gegen runde Top-Nase, Rex-Front 11 px (Florians Front breiter als sein Top), Maulbau ohne Breitenpunkte (Kieferpose wirft sonst Falten). *Schritt 4:* Δ-Zahl im Blatt-Titel und Saum im Blatt zeigen die Abweichung je Blatt; Widersprüche der Kurven sind sichtbar. *Schritt 3:* Stationen eingefroren, nichts springt mehr; offen: Käfig selbst im Dokument, Kurven folgen dem Körper nicht automatisch. (Phase 1)
- [ ] **„Die Formen folgen immer“** (Florian, 15.10. morgens: „dass ich mit der echten Form arbeite und nicht mit gerundeten Punkten“). Entschieden: ja. Heute bleiben Front/Top nach einer Seite-Änderung stehen und zeigen Δ. Der naive Weg (Knoten auf die Silhouette rutschen) ist probiert und verworfen (Rückkopplung, Langhals verformt); die richtige Bauweise steht auf der Planseite „Zeichnung ist Form“ (Silhouette als Kurve, Anpassung je Segment beim Ziehen, führende Kurve). Kern-Option `fuehrend` ist gebaut und getestet. (Phase 1, Rest; eigene Sitzung)
- [ ] **Ruhiges Netz beim Verziehen** (Florian 14.10., Bilder): Sägezahn in Front und Top am hochgezogenen Schwanz (Δ 33 / 26 px), Faltengrat, Kasten-Unterkiefer; „das echte Mesh reagiert viel zu sensibel“. → Planseite [Ruhiges Netz und Maulschlitz](2026-10-14-ruhiges-netz-und-maulschlitz.md), Block 1. (Phase 1, Rest)
- [x] **Langhals: „Riesenmaul direkt in die Schnauze, auch wenn ich nur ein kleines darunter setze“** (Florian, 15.10. morgens, Screenshot). Ursache: Im Front-Blatt holten die Maulpunkte ihre Tiefe (x) vom Platzhalter-Loft, dessen Front beim Langhals weit hinter der Schnauze liegt; der dritte Punkt eines kleinen V landete bei x = 0,04 (Rumpf), das Maul lief von der Schnauze bis dorthin (Länge 0,265). *Behoben:* Tiefe aus dem feinen Kern-Netz (`punktAufKern` in `apps/editor/src/maul/maulFlaeche.ts`); dasselbe V ergibt jetzt ein Maul von 0,059. (Phase 1, erledigt)
- [x] **Gerade Maullinie ergibt ein gerades Maul** (Florian, 15.10.: „wenn ich ganz gerades Maul einzeichne, hat es immer diese komische Kerbe vorne“). *15.10. morgens, Schritt 2:* Anfang auf der Kontur (Weltpunkt), Lippenhöhe je Ring aus der Kreuzung mit der Sprosse, Kappenzeile auf dem Anfang; Kerbe weg (Kugel 0,7 px, Rex 1,9–2,1 px = Rille). Rest: Rille vorn 2–3 px in der Seitenansicht sichtbar; scharfe Spitze → Überbiss statt Lippe durch die Spitze. (Phase 1, Rest Phase 2)

### Phase 2 (Maul, Zähne, Augen)

- [x] **Formen folgen nach dem Pinsel** (Florian 15.10. nachts: „Sollte sich nicht die echte Umrisslinie an diese Form anpassen?“): *gebaut 15.10. nachts* — nach jedem Strich der Grundform passen sich die drei Profile an die Silhouette an (Knoten/Ecken bleiben, Einfügen ab 2 px), die Deltas werden nachgeführt, der Körper bleibt bitgenau. Rest: Folgen nach Zügen in den anderen Blättern (Plan „Zeichnung ist Form“ 4.1, Punkte 1–3), kein Vereinfachen eingefügter Knoten. *14.10. nachmittags (50c1dd4):* Folgen hängt am Gestenende und läuft nur nach Pinselstrichen; es werden keine Knoten mehr eingefügt (Florian: „willkürlich Punkte“); Folgen nach Kurvenzügen bleibt offen.
- [ ] **Maulschlitz an der schwarzen Linie** (Florian 14.10.): Rot und Blau gehen von der Seite direkt in die schwarze Linie über (Lippenanfänge = Knoten der schwarzen Linie, echter Schlitz), jeder Kiefer aus seiner eigenen schwarzen Linie (heute: Wand am kürzeren Kiefer, Schnabel bei vorgezogenem Anfang), je ein Spant für Ober- und Unterkiefer, Netz ruhig und geglättet. → Planseite [Ruhiges Netz und Maulschlitz](2026-10-14-ruhiges-netz-und-maulschlitz.md), Block 2.
- [ ] **Kiefer getrennt / Überbiss** (Florian: wichtig), Lippenband zwischen roter und blauer Lippe, Hauer außen bei geschlossenem Maul. *15.10. spätabends, gültiger Stand:* jede Lippenlinie ist exakt die Kante ihres Kiefers in Seite, Front und Top (Kanten direkt aus den gezeichneten 3D-Linien, auch der Winkel; Rot vorn = Überbiss, Blau vorn = Unterbiss), die Kieferhaut folgt ihrer Kante und ihrer eigenen schwarzen Linie (Wand vom Anfang zum Umriss, dahinter unverändert); Titel zeigen rot/blau in px. Rex rot 0,06 / blau 0,0 px; gezeichnete Mäuler 0,05–0,4 px. **Reste:** Kiefer-Spanten (Front/Top zwei Spanten übereinander); Tiger-Kinn unter der Platte faltet (Kasten-Querschnitt im verschobenen Kiefer); Rex offen 12 verdeckte Paare vorn (Stützen-Pfad), Rex-Unterbiss an scharfer Schnauze 66 Paare (Test); eckige Linien ziehen die Kante zwischen Knoten in den Körper (Sehne). *15.10. nachmittags (abgelöst):* zwei Teile des Shapes (rote/blaue Linie in Seite und Front), Unterkiefer eingerückt, verdeckte Überlappung erlaubt. **Reste:** blaue Kante an den Kappenspalten (Kinn) bis 10 px neben der Linie (Tangente statt Ring); offen 48 Paare lippeU/lippeU am Kinnanfang (Rex); Kantenpräzision noch nicht im Blatt angezeigt; Unterbiss; **Kiefer-Spanten** (zwei Spanten übereinander in Front/Top je Kiefer, Florian 15.10.). — *15.10. mittags, Phase 2 M2:* **Überbiss gebaut** (Oberlippe als U mit Boden und Innenseite, Unterkieferkante innen darüber; Rex 0 Durchdringungen bei allen Öffnungen; Chips gleich/getrennt in der Tafel Maul, blaue Linie ziehbar; Planseite Phase 2, Stand). Rest: Unterbiss, Hauer außen als bewusste Zahnlage (M4), Lippenband-Deskriptor fürs U, Florians Urteil.
- [ ] **Rachenlinie und Kieferlinie als Griffe** (heute Automatik: Lotfußpunkt auf der Wirbelsäule ab Racheneingang; Band/Platte/Beutel als Zahlen).
- [ ] **Bodengrenze / Kieferbereich bei dicken Rümpfen:** Tiger braucht 30° statt 58° (Plattenmaul 20°), weil die Flanke hinter dem Winkel faltet; die Kieferlinie soll den Jaw-Bereich begrenzen. *15.10. nachmittags:* Die Editor-Kugel (Startkugel) faltet ab 75 % die Haut unter dem Maul (80–250 Paare), auch ohne Überbiss und bei 30°; die Prüf-Kugel aus der Vorlage nicht. *15.10.:* Auch das Schädelband (8 Ringe hinter dem Scharnier) nimmt beim Tiger den halben Rumpf mit (Ohren wandern beim Öffnen); dieselbe Linie soll den Schädelbereich begrenzen.
- [ ] **Ringpfad-Mäuler bei 24 Punkten je Ring** (Tiger-Ausstattung seit M1): die Tasche ist auf 16 Punkte abgestimmt und durchdringt sich (tascheO/tascheO); Taschenmaße nach dem Ringabstand skalieren. (Phase 2)
- [ ] **Sehr dünne Hälse** (Giraffenhals 2 % der Höhe) bleiben mit Maul durchdrungen (≈ 70/110); braucht Loop-Cut oder eine gemeinsame Tasche beider Seiten.
- [ ] **Kehl-/Nackenkette, Zunge, Zähne einzeln setzen, Zahnprüfung, Zahnrahmen je Öffnungsart.**
- [ ] **Augen im Mesh mit Augapfel** (Raubtiere), Augen-Zustände X/Sichel/Spirale/Blinzeln; der Tiger hat heute gemalte gelbe Schlitze mit Lidring.
- [ ] **Kleines geschlossenes Maul → großes rundes offenes Maul** (Florian, 15.10. nachts: „Offen soll der Tiger ein großes rundes Maul wie in meiner Referenz haben können. Es ist wichtig, dass über die Mischung aus Blendshape und Knochen auch sehr kleine geschlossene Mäuler sehr groß werden können.“). Heute öffnet nur der Knochen (Drehung um die Mundwinkel), die Größe des Haps hängt an der Maullänge. Weg (Plan 5.2): Fressen-Pose = Knochen + Körper-Blendshape als Käfig-Deltas derselben Topologie (Lippenschleife bleibt, Mundwinkel wandern nach hinten/außen, Lippen weiten sich zum Rund), mit der Öffnung überblendet, in der Pose mit den Pinseln bearbeitbar; bei kurzen Mäulern braucht der runde Rand mehr Lippenpunkte (Loop-Cut längs am Maul). (Phase 2) — *15.10. nachts, Vorprobe gebaut (Phase-1-Plan, M3 Teil 8):* `kaefig.posen.fressen` + Pinsel im Fressen-Modus; das Sternmaul des Tigers wird offen deutlich größer, zu unverändert. Rest: runder Lippenrand (Loop-Cut), Pose-Deltas an die Maullinie binden, Posenliste.
- [ ] **Tiger-Maul als Mercedesstern** (Florian, 15.10. nachts): Auf seinen Entwürfen bildet der Nasenverbindungsstrich mit den beiden Maularmen einen Mercedesstern, und die **Mundwinkel enden geschlossen noch auf der ersten vorderen Plattenfläche** der Kastenschnauze. Im Kern läuft die Lippe heute über die Frontplatte hinaus an die Seiten (Winkelring bei 17 % der Länge, Kasten endet bei 15 %). Nötig: Mundwinkel auf der Frontplatte (Winkelring an der Plattenkante oder Lippe ganz im Kappengitter), die Maularme laufen von der Plattenmitte schräg nach außen-unten; der Unterkiefer schwenkt als untere Plattenhälfte plus Kinn. (Beweis 2/4, Phase 2) — *15.10. nachts, Sofortprobe:* Winkel von 17 % auf 6 % (Ring 2, gleich hinter der Platte) mit Rille 0,6 % und Armen ab der Plattenmitte: 0 Durchdringungen, als Tiger-Standard übernommen; Zähne am kurzen Maul skaliert. Rest (Winkel auf der Plattenfläche, gerade Diagonalen, größerer Haps) braucht die Plattenmaul-Topologie. — *15.10. vormittags, Phase 2 M1:* **Plattenmaul gebaut** (Lippenzeile im Kappengitter nach dem Front-Verlauf gebogen, Winkel auf der Platte bei |z| 0,035, Scharnier bei 8 % hinter der Platte, 24 Punkte je Ring): Tiger 0 Durchdringungen bei allen Öffnungen, im Front-Blatt zeichenbar (Planseite Phase 2, Stand). Rest: großer Haps (M3), Zähne am kurzen Pfad (M4), Vergleichsbild und Florians Urteil.
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

> Florian (15.10.): „Ich weiß nie so recht, wann der Zeitpunkt für welches Feedback ist. Falls ich etwas bemängele, das laut Plan erst noch gemacht wird, dann notiere es und mache nach Plan weiter.“ So wird es gehalten: Jede Rückmeldung landet hier mit ihrer Phase; was in den laufenden Schritt gehört, wird sofort gemacht, der Rest wartet an seiner Stelle.

- [x] 14.10.: Kastenschnauze (ebene Kappe), Hautfalten enden an der Lippe, Rachenlinie automatisch, Leiter entfächert, Drache als Prüfwesen → Beweis 2 ganz.
- [x] 14.10.: Beine am runden Bauch (gleichmäßige Ringwinkel, Feldrand wandert die Achse hinab) → Beweis 3 ganz.
- [x] 14.10.: Zonen-Atlas → Beweis 4 ganz.
- [x] 14.10.: Stile zweite Runde (Zwiebel, wellige Bänder, Wirbel, Locken, Kugelbläschen, Büschelfeld).
- [x] 15.10.: „Zeichnung ist Form“ Schritt 1: Sichthülle (Front nur am breitesten Punkt, Rest beschnitten) und Breitenpunkte im Ausgleichslöser; Top Rex 1,0 px, Tiger 4,0 px (vorher 21,6).
- [x] 15.10.: „Zeichnung ist Form“ Schritt 2: Lippe auf der gezeichneten Linie (Konturanfang, Sprossen-Kreuzungen); Kerbe weg.
- [x] 15.10.: „Zeichnung ist Form“ Schritt 4: Δ je Blatt im Titel (grün/ocker/pink) und Lichtsaum > 2 px; Zahlen in der Tafel Spiel.
- [x] 15.10.: „Zeichnung ist Form“ Schritt 3 (Zuschnitt): Stationen im Dokument eingefroren, Kurvenänderungen ziehen denselben Käfig nach, Ecken/Reifen nachgeführt, „Neu ableiten“; Giraffenhals bleibt oben (Satz 3).
- [x] 15.10.: Langhals-Riesenmaul (Maulpunkte im Front-Blatt mit Tiefe vom Platzhalter-Loft) → Tiefe aus dem Kern-Netz.
- [x] 15.10.: Langhals-Brust: schräge Sprossen ab 0,5 Neigung mit Front-Lappen statt Kreis (`liegendAb`), Top 14 → 4 px.
- [x] 15.10. vormittags: Phase 2 M1 Plattenmaul (Mercedesstern auf der Platte, Tiger 0 Durchdringungen, im Front-Blatt zeichenbar); Beutel läuft mit dem Kieferband aus (Bauchringe standen beim Öffnen nicht still); Library-Tiger baut und öffnet sein Maul ohne Chip.
- [x] 15.10. mittags: Phase 2 M2 Kiefer getrennt mit Überbiss (Rex, 0 Durchdringungen bei 0/25/50/75/100 %, Chips gleich/getrennt, blaue Linie zeichenbar).
- [x] 15.10. nachts: Block 2 zu Ende gebaut (Chip „getrennt“ unter dem Kopf, verdeckte Kinnspitze aus dem Seiten-Δ, Maullage eingefroren, Kiefer-Spanten); Langhals-Kehle: Ursache war die Naht (Rundgang mit Lücke), Langhals „gleich“ jetzt 0 Durchdringungen; Breitenpunkte mit Maul (Top am Maul ≤ 4 px bei Kugel und Langhals); Posenliste und Pose-Deltas an der Maullinie (Phase 2 M3).

## Offen aus der Nacht 15.10. (eigene Befunde, je mit Phase)

- **Lokalität (Block 2, Satz 2) nicht erfüllt:** Lippenanfang 10 px gezogen → außerhalb des Bands 0,2–0,7 px beim kürzeren Kiefer, aber 1,3–4,6 px beim Schlitzanfang; ohne Maul misst Block 1 schon 3,0 px (Kugel) bzw. 9,2 px (Komma). Ursache: globale Leiter (Ringe gleiten) und der ganze Kiefer folgt seiner Linie → „Käfig als Wahrheit“ (Florians Entscheidung).
- **Langhals bei 100 % Öffnung:** Wangenknick hinter dem Mundwinkel (63–85°, das Gelenk liegt auf der Haut) und gestauchte Kehle bei heruntergezogenem roten Anfang (91°), ohne Durchdringungen → Plan 5.2 (Gelenk im Kopf, Kehlkette).
- **„Blau am Hals“:** blauer Anfang weit am Hals → der Unterkiefer hängt als Lappen heraus (248–584 Paare) → Phase 2 Maularten (ohne Unterkiefer / Drache) oder Grenze für den Anfang.
- **Tiger aus der Library:** die „Wangen“ der Ausstattung erscheinen als weiße Zackenreihe am Bauch unter dem Gesicht (schon am 14.10. so) → Look-Urteil Florian, Phase 4.
- **Runder Haps:** Vergleichsbild `docs/progress/editor/haps-vergleich-tiger-2026-10-15.jpg` — der Tiger öffnet nur ein kleines Loch in der Platte; Florian entscheidet zwischen Automatik (Haut wandert mit, Loop-Cut) und Fressen-Pose → Phase 2 M3.
- **Kugel-Unterkiefer im Kiefer-Spant:** an der Kugel-Front hat der Unterkiefer anfangs nur den Achspunkt; erst „+“ auf der Unterkiefer-Kurve macht ihn formbar (gleiche Punktstruktur, Punkte nur von Hand) → Florians Urteil beim Ausprobieren.

## Offen aus Phase 2 M4 Zähne (15.10. nachts, eigene Befunde, je mit Phase)

- **Zahngröße und -breite gegen die Referenz** (`rex_mouth_detail`): Die Automatik ist schmaler (Breite 0,42 der Länge) und kleiner (7,5 % der Höhe) als die dicken Kegel der Referenz; einstellbar mit Breite und Größe → Florians Urteil zu den Grundwerten, Phase 2.
- **Hintere außen-Fänge schräg** (folgen der Haut des Unterkiefers am Mundwinkel, bis 37° nach hinten) → Florians Urteil; Ausweg je Zahn über die Spreizung oder eine senkrechte Grundrichtung für außen-Zähne, Phase 2.
- **Bedienung nach Plan 9.4, noch nicht gebaut:** Werkzeug „Setzen T“ (Klick aufs Zahnfleisch setzt einen Zahn), Spitze ziehen = Länge, Seite ziehen = Breite, Fächer (Hauer, Spiegeln aus, kopieren, löschen, Prüfen), Prüf-Lupe → Phase 2 (nach Florians Probe).
- **Verdeckte Riesenzähne:** Steckt das Zahnfleisch geschlossen im Gegenkiefer (Über-/Unterbiss), gibt ein Zahn geschlossen keinen Befund; sticht er dort aus dem Gegenkiefer heraus, wird das nicht gemeldet (der Paritätstest zählt in der Überlappung zweier Körperteile einen Punkt in beiden als außen; Ausweg: Windungszahl statt Parität) → Phase 2.
- **Neigungsvorschlag** sucht nur ±20° → bei großen Neigungen kommt nur „kürzen“, Phase 2.
- **Front-Blatt** taugt kaum zum Ziehen (Zahnreihe stark verkürzt: Rex unten Zahn 2 bis 5 auf 11,5 px) → Ziehen in Seite oder Bühne; ggf. Hinweis in der Tafel, Phase 4.
- **Zahnprüfung im selben Worker wie der Bau:** 200–500 ms; ein Zug direkt nach dem Start einer Prüfung wartet bis zu einer halben Sekunde → eigener Prüf-Worker, falls Florian es merkt, Phase 5.
- **Tempo-Tests unter Last:** Drei feste Schranken (Umbau ≤ 350/500 ms, Kanten-Laufzeit) kippen, wenn die Maschine belegt ist (Lastmittel 21,8), einzeln grün → bei Gelegenheit als „beste von n“ messen, Phase 5.

## Offen aus Phase 2 M5 Augen (15.10. nachts, eigene Befunde, je mit Phase)

- **Brauenwulst am Augapfel nicht gelöst** (drei gemessene Anläufe, Abbruchregel): Am Rex ist das Feld um das Auge längs des Körpers zu schmal (Ringe am Mundwinkel 0,009–0,015 auseinander). Wege: Ringe am Auge (Stationen wie ein Reifen), Loop-Cut, Brauenkante von Hand (Kantenlinie + Pinsel), Braue als Teil → Florians Entscheidung, Phase 2/3.
- **Augapfel nur über der Lippenreihe:** Am Rex taugen nur Ringpunkte mit j ≤ 3 (16 je Ring), sonst berührt die Höhle die Lippe. Seitlich tiefer (j = 4) bräuchte die Lippe mehr Abstand oder einen Loop-Cut → Phase 3.
- **Kein Blick:** Die Pupille schaut entlang der Flächennormale (Glubschauge) bzw. 28° zur Schnauze (Augapfel); ein Auge folgt nicht → Hauptplan („Blick kommt später“), Phase 4.
- **Dunkler Ring weicher als in Bild 10/11**; das Lid der Augenkugeln hat nur die Grundfarbe (keine Zonen, keine Muster) → Look-Urteil Florian, Phase 4.
- **Feuer und Gas:** behalten ihr gemaltes Schlitzauge, keine Formen, Zustände oder Kugeln (eigenes Material) → Phase 4 (Stile).
- **Höhle nur ohne angesteckte Beine und nicht für ein Auge in der Mitte** (Zyklop-Augapfel auf der Naht) → bei Bedarf, Phase 3.

## Offen aus Phase 2 M6 Maularten (15.10. nachts, eigene Befunde, je mit Phase)

- **Drache ohne Unterkiefer:** Die untere Schnauzenhälfte steht beim Öffnen als Schnabel vor (Maullinie bei 0,42 der Sprosse). Tiefer gelegte Linien (0,25/0,15) falten die dünne Kehlhaut in die Tasche (offen 42–54 Durchdringungen) → eigene Kehl-Tasche, Phase 2/3.
- **Rundmaul-Zähne nur Anzeige** (15.10. früh gebaut: Zähne rundum am Ring-Zahnfleisch): Wählen, Ziehen und die Prüfung gegen den Gegenkiefer gibt es dort nicht, Phase 2.
- **Rundmaul flacht die Front ab** (die Haut dehnt sich radial) und gilt nur ohne Schlitzmaul, ohne Beine, mit Earle-Look → Look-Urteil Florian, Phase 3.
- **W-Oberlippe (Hund) nicht gelöst** (drei Anläufe am Plattenmaul): Arme, die am Mundwinkel wieder steigen oder flach auslaufen, schneiden beim Öffnen durch die Oberlippe (67–442 Paare). Wege: Unterkiefergewichte je Armstück, oder Hund als Schlitzmaul mit Philtrum-Kerbe → Florians Entscheidung, Phase 2.
- **Bauch hebt beim Öffnen ab** (Kugel mit Maul vorn, Rex: 1,4–1,6 % der Höhe, Bauch gleitet nach hinten): Die Unterkiefergewichte reichen bis zum Boden. Bodenhaftung über die Gewichte staucht die Haut (36 Paare) → Schädel statt Unterkiefer am Limit (Plan 5.2), Phase 2, wenn Florian es sieht.

## Florian 15.10. morgens (zu M5/M6)

- [ ] **Finaler Test gegen die Bögen später** (Look noch nicht nah dran, Richtung stimmt) → nach Phase 3/4.
- [ ] **Bug- und Wunschliste Zähne** kommt von Florian → Phase 2.
- [ ] **Runde Bohne aus jeder geschlossenen Maulform:** geht für ihn mit den Werkzeugen und der Fressen-Pose (damit ist die offene M3-Frage „Automatik oder Fressen-Pose“ für ihn beantwortet: Fressen-Pose genügt) → beobachten.
- [ ] **Hundemaul:** seine Frage, ob es mit den bisherigen Werkzeugen geht → Antwort im Chat, Ergänzung „Lippenverlauf im Front-Blatt auch beim Schlitzmaul“ nur auf seinen Wunsch.

## Florian 15.10. vormittags: Grundfehler (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“)

- [ ] **Maul verändert den Körper** (Bauch/Nase klappen zusammen, Kinnwand, Ei-Schnabel, Falten beim einfachsten Maul, unruhiger gelber Umriss) → Teil A (Einsatz, A0 bitgleich).
- [ ] **Mundwinkel in jeder Form** (J, senkrecht, S) und **Maul an jeder Stelle** (hoch, seitlich, Kinn, Hals) → Teil A (Karte, Lippenschleife).
- [ ] **Über- und Unterbiss über die Bézier-Griffe, Kiefer unabhängig** → Teil A (Korrekturfeld je Kieferseite).
- [ ] **Rücksprung auf „Editor“ zeigt die Pose** → B1 (Sofortkorrektur).
- [ ] **Fressen wie Editor bearbeitbar, Lippen exakt auf Rot/Blau, in Fressen immer getrennt, Bones je Pose, Morph-Regler** → Teil B.
- [ ] **Pinsel ↔ schwarze Linien ↔ Maul ohne unvorhersehbare Abweichungen** → Teil H.
- [ ] **Vollständige Prüfungen** (Zufallsreihe, Werkzeug-Matrix, echte Gesten) → Teil V vor jedem Umbau.
- [ ] **Grundkörper für jede Form** (Bauch vor der Nase ohne Umspringen, S-Hals, Flügel/Flossen als nahtlose Teile, weiche Ente aus drei Shapes) → Teil G.

## Bestandsaufnahme zu B3 (15.10. abends, eigene Befunde, je mit Schritt)

Bei B3 behoben: Knochen griffen in anderen Posen auf die Fressen-Öffnung (`setzeOeffnung(1)` ohne Moduswechsel); Tafel-Regler Unterkiefer/Schädel/Haps schrieben die gemeinsamen Maul-Optionen statt der Fressen-Pose; Maul-Optionen von Prüfwesen und Dokument wurden flach gemischt (der erste Rig-Zug am Tiger warf dessen Winkel, Band und Rille aus dem Bau); Knochen in der Seite wurden mit der Fressen-Öffnung gezeichnet; die Bühnen-Hinweise kannten neue Posen nicht; die alte Posen-Seitenform (`posenProfile`) ersetzte im Kern-Bau die Seite.

- [x] **Maul- und Zahnebene behandeln jede Pose als „offen“** (`maul/MaulEbene.tsx` `zustandVon`, `maul/ZahnEbene.tsx`, alter `ZahnBereich`): in Idle zeigen sie die offenen Lippen bzw. Zähne → B5 (Pose-Linien), B9 — *Maulebene erledigt in B5 (15.10. nachts): in der Bauweise Kern zeigt eine Pose Rot und Blau der Pose (`posen/poseLippen.tsx`), geschlossen eine türkise Linie; Zahnebene bleibt B9.* (Zähne in Posen).
- [ ] **Zähne öffnen mit dem Gewicht von Fressen, nicht mit der Pose** (Idle mit offenem Kiefer zeigt geschlossene Zähne) → B9.
- [ ] **Rundmaul-Rand ziehen liest die Öffnung erst nach `beginGeste`**; im Editor-Tab hat `werkzeuge/ziel.ts` sie dann schon auf 0 gesetzt → B7/B9 (Rundmaul in Posen).
- [ ] **Kieferknopf ist außerhalb von Körper/Maul/Zähne unsichtbar, aber greifbar** (`viewports/Steuerung3D.tsx`) → B7 (Kieferknopf als Vorschau).
- [ ] **Gestenbeginn im Editor-Tab beendet jede Vorschau**, auch beim Ziehen von Reglern (Zahnregler springen von offenen auf geschlossene Werte) → B7.
- [ ] **`nurPose` lässt in einer Pose alle Maul-Optionen durch**, auch Bauoptionen (Rille, Reihen, Band bauen den Käfig um) → B6 (Werkzeug-Router je Werkzeug).
- [ ] **Pinsel hat auf der Bühne Vorrang vor den Knochengriffen**: Knochen greift man mit dem Auswahlwerkzeug (A) → Bedienung in B7 klären (Hinweis oder Vorrang der Griffe).
- [ ] **Beine**: Posen-Formen werden auf den geschwungenen Käfig gelegt, der Übertrag rechnet dort mit dem geschwungenen statt dem Ruhe-Käfig → B9.

## Befunde aus B5 (15.10. nachts, eigene Befunde, je mit Schritt)

- [ ] **Großer Zug an Blau bei festem Anfang faltet die Kinnfront** (Rex, Knoten 60 px tiefer: die Lippe läuft vorn unter die Kinnfläche; 25 px gibt die Illustrator-S-Kurve mit kleiner Stufe im Lippenband). Ein größerer Einflussbereich (6 statt 3 Kanten) ändert das Bild nicht. Für so starke Züge müssen Kinn bzw. Anfang mitgehen → B8 (extreme Posen: Haut folgt der Lippe über größere Strecken).
- [ ] **Mundwinkel folgt dem Zeiger nur auf 0,6 px** (bei 10 px Zug; am Winkel mischen sich Schädel- und Kieferdrehung, umgerechnet wird mit der Drehung des Winkels). Exakt ginge über die Ableitung der Lippe nach dem Versatz (drei Einsetz-Läufe je Knoten) → B6/B7, wenn es stört.
- [ ] **Knicke in der Pose-Linie kann die Lippe nicht nachbilden** (freie Griffe 0,44–0,54 px, glatte Griffe 0,05 px; der Mundwinkel ist rund, weil die Lippenkette glatt um ihn läuft) → Teil A (Mundwinkel als Eckpunkt der Lippenschleife).
- [ ] **Front und Top einer Pose zeigen noch die Grundprofile** (samt Lichtsaum der Grundform); nur die Seite zeigt den posierten Umriss → B6.
- [ ] **Rot und Blau der Pose nur in den Blättern**, nicht auf der Bühne (wie die Grundlinien) → B7.

## Befunde aus B6 (15.10. spätabends)

- **Aufblasen mit Betrag 0 schreibt einen leeren Undo-Schritt in die Pose** (`apps/editor/src/kern/pinsel.ts`: `betrag` aus „rechts minus unten“; ein Zug genau diagonal nach rechts unten ergibt 0, die Pose bekommt trotzdem Form/Bezug geschrieben). → B7 (Undo-Verhalten der Oberfläche).
- **Hebel an den Knoten der Pose-Linie fehlen** (Seite, Front, Top): Die Linie der Pose ist ein posierter Umriss, keine Bézier-Kurve; Hebel bräuchten eine Bedeutung (örtliche Krümmung oder Tangente). → Entscheidung Florian, dann B7.

## Befunde aus A5 (16.10. früh, eigene Befunde)

- **Güte der Hautvierecke hängt an der Feldform** (Teil A, A3/A5; Entwurf 2.5 verlangt ≥ 25° und Streckung ≤ 4). Gemessen nach vier Anläufen am Gitter: ausgeglichene Felder gut (23–39°), unausgeglichene schlecht (Keil am Mundwinkel bis 5°), große Felder (m > 10) alle schlecht. Ursachen: fehlendes Gleichgewicht (Randpunkt m nicht hinter dem Mundwinkel, V-Versatz bis 0,42), Lappen im Feld, große Felder für kurze Lippen. **Wege (Entscheidung Florian):**
  1. **A3 neu: kompakte, ausgeglichene Felder** — Streifen um die Linie als Rechteck in den Gitterkoordinaten der Röhre bzw. der Kappe, Gleichgewicht über die Karte prüfen und die kurze Seite wachsen lassen (Entwurf 2.3, Schritt 7). Hilft bei den meisten Lagen; bei Linien nahe der Mittelnaht nachgerechnet unmöglich (der Oberlippenbereich endet an der Naht).
  2. **Übergangsreihe mit 3/5-Polpaaren** (im Entwurf nur als Rückfall für zu großes m): Im äußeren Ring teilen oder vereinen sich Speichen. Dann ist m nicht mehr an den Feldrand gebunden (kurze Lippen mit m ≈ 6–10, lange mit mehr), und schiefe Felder werden ausgeglichen. Kostet je Übergang zwei unregelmäßige Punkte im äußeren Ring (sichtbar auf der Haut, flach gelegt).
  3. **Ungleiche Lippen** (m_oben ≠ m_unten), Rachen als Streifen statt Quadrat. Löst nur das Gleichgewicht, nicht die großen Felder.
  - Empfehlung: 1 + 2. A6 (Lippe exakt) hängt nicht daran und läuft weiter; A7 wird zuerst an ausgeglichenen Fällen gebaut und gezeigt.
- **Lippenauflösung gegen Feldrand** (A6, 16.10. früh): Die Lippe braucht krümmungsgewichtet m ≥ 10 für ≤ 1 px und m ≈ 12–14 für das Ziel 0,3 px (gemessen über 111 Linien); kompakte, ausgeglichene Felder haben heute m = 8, große Felder m = 14–22 (dort sitzt die Lippe auf ≤ 0,18 px, aber das Gitter ist schief). Weil m heute an den Feldrand gebunden ist (m = E/2), widersprechen sich gute Lippe und gutes Gitter. Das ist das stärkste Argument für Weg 2 (Übergangsreihe: m nach der Linie, Feldrand nach der Form).

## Befunde aus A7 (16.10. früh, eigene Befunde)

- **Mundwinkel faltet bei geschlossenen, unendlich scharfen Lippen** (Teil A, A5/A7; Entwurf 2.6 „c bekommt unendliche Punktschärfe“). Die Haut um c hat zwei Flächen und muss 360° überdecken; der Ecksektor aus k Flächen bekommt unter Catmull–Clark k·90° → Umklappen in 0,2–1,4 px um c, in allen gemessenen Fällen, schon in der Startlage. **Wege (Entscheidung Florian):**
  1. **Eckregel mit Sektorwinkel** (Biermann, Levin, Zorin 2000, Abschnitt 6.2/6.3: Kantenpunkt (3/4 − γ)·c + γ·w + 1/16·(vier Nachbarn), γ = 3/8 − ¼ cos θ_k, konkav θ_k = (2π − α)/k, dazu an konkaven Ecken immer eine Flachheitskorrektur über die Eigenvektoren). **Gemessen (16.10. früh, Versuch außerhalb der Produktion): die Kantenregel allein hilft nicht** — γ = 3/8, 1/2, 5/8: weiter alle 15 Fälle gefaltet (bis 180°). Die Flachheitskorrektur braucht 1/sin(kθ_k) und ist bei ganz geschlossenen Lippen (α = 0, θ = 2π) singulär. Dieser Weg geht also nur mit einem leicht geöffneten Mundwinkel (α > 0) oder einer eigenen Herleitung für α = 0.
  2. **Mundwinkel als Spitze** (glatter Faltenpunkt statt Ecke, Lippen-B-Spline mit Spitze, Grenzlage auf den schwarzen Punkt gelegt): gemessen 8 von 15 sauber, der Rest braucht Arbeit am Gitter um c.
  3. **Fächer am Mundwinkel** (vier Hautflächen an c, Valenz 6): ein Ecksektor aus vier Flächen ist von sich aus 360°; zwei zusätzliche Speichen, Topologie ändert sich.
  4. **Kleine runde Öffnung am Mundwinkel** (Lippen geschlossen nicht ganz bis c, Lippenschleife glatt herum): Mundwinkel leicht gerundet — gehört zu Florians Wahl „scharf oder leicht gerundet“ beim Look-Urteil.
  - Empfehlung (nach der Messung geändert): **4 oder 2** — ein ganz geschlossener scharfer Mundwinkel ist mit Catmull–Clark nicht faltenfrei zu haben (drei Versuche: Ecke, Spitze, Sektorregel). Eine kleine runde Öffnung am Mundwinkel (4) passt zu deiner Wahl „scharf oder leicht gerundet“; die Spitze (2) behält die Lippen bis c geschlossen, braucht aber Arbeit am Gitter um c (8 von 15 sauber). Florian entscheidet.
- **Falten von A0 im Feld gehen verloren** (A3, Entwurf 2.3 Schritt 5 nicht gebaut): Rex 16 scharfe Kanten im Feld (eine senkrechte Kante an der Schnauzenfront, die die Maullinie kreuzt) → Haut bis 3,5 px daneben. Nach Entwurf endet die Falte am Schlitz und läuft auf einer Speiche. **Gestaltungsfrage dabei (Florian):** Kreuzt die Falte den Schlitz, braucht die Oberseite die Speiche ihres oberen Randpunkts, die Unterseite die ihres unteren; beide Lippenpunkte müssen an derselben Stelle der Linie sitzen. Das geht nur, wenn Ober- und Unterlippe verschieden verteilt sein dürfen (U_k und D_k nicht mehr aufeinander; beide Lippen liegen weiter auf der Linie, ≤ 0,3 px), oder wenn das Feld so gewählt wird, dass beide Randpunkte gespiegelt passen.
- **Hautreihen nach Feldtiefe** (A5): mit Rand und Kragen fest gleicht nur die letzte Reihe die neue Verbindung an den Randpunkten aus; J = 8 statt 4 bringt die Kugel von 0,75 auf 0,26 px. J aus der Feldtiefe wählen (Reihenabstand ≈ Kantenlänge, Entwurf 2.5).
- **Einsatzgitter feiner als die Details von A0** (A7, Robbe): Die Robbe hat an der Schnauzenspitze eine feine Kerbe, die K1 mit vielen kleinen Flächen trägt; das Einsatzgitter (m = 8) löst sie nicht auf → bis 4 px Abweichung genau dort, sonst ≤ 0,7 px. Gehört zur Frage Feldgröße / Lippenauflösung (Befunde A5/A6): kompakte Felder oder ein feineres Gitter (m vom Feldrand gelöst).

## Befunde aus E2 (21.10., Maul als Einsatz — A0 wie im Editor, Spitzen von A0)

- **Stand E2.6 (21.10., abends):** Leiter gebaut und Standard auf K2 — Robbe hoch gerade (Haut 0,21 px, Knick 7,3°), Rex mittel J
  (0,13 px, 27,4°) und mit dem Lippenziel auf der Haut Robbe tief J (11,2°) in den Toren, Haut-Tor 41 von 43. Planseite „Stand E2.6“.
- [ ] **Rex mittel gerade: Knick an der Kreuzung der Falte mit der Linie** (29,6° bei A0 27,1°, Tor 29,1°): in Reihe 1 neben P;
  örtlich A0 ≤ 11°, Einsatz 26–30° (auch J). Nicht die Ecke, nicht die Lippenteilung, nicht das Stück über P (gemessen). Die Falte
  läuft bei gerade 0,5 px auf der Linie — dort weiter suchen.
- [ ] **Robbe hoch J: Engstelle** (Linie bis 0,5 Feldkanten an der Kopfnaht): faltet auch mit Leiter (sieben Holme durch die
  Engstelle). Weg: zwei Leitern hintereinander — oder als Grenze der Zeichnung (Florian).
- [x] **Robbe hoch: Haut faltet im schmalen Streifen unter der Kopfnaht** (176–179° an Lippenstelle 4, Haut 0,37 px). Ursache
  berichtigt (21.10. abends): kein spitzer Anfang (78°), sondern ein langer Streifen von 1,5 (gerade) bzw. 0,4 (J) Feldkanten
  zwischen Linie und Naht; die konforme Karte staucht ihn exponentiell (V/V_c bei 20 % 1,9·10⁻³ bzw. 9,9·10⁻⁶), und weil Reihen
  auf der Naht und Speichen am Feldrand enden, laufen im Streifen beide Scharen längs — in jeder Lage. Eckenentfaltung hilft
  nicht. Weg: **Leiter** (Speichen der ersten q Lippenstellen enden auf der Naht, je Hälfte ein Dreier- und ein Fünferpol,
  m = M + (q_oben + q_unten − 6)/2), Planseite „Nachtrag E2 (21.10., abends)“.
- [x] **Rex mittel: Falte von A0 im Feld** (J: Haut 0,30 px, Knick 44,7° bei A0 27,1°; gerade knapp im Tor mit 24,7°, kippt bei
  kleinen Änderungen am Lippenrand auf 39°). Die Falte ist ein Ring um die Schnauzenfront (Unterkante der Frontplatte): Sie
  kreuzt die Linie an Lippenstelle 5 und läuft unten bis zur Naht; im Kernring endet keine Speiche auf der Naht, die Falte geht
  verloren. Weg: **Leiter** auf der unteren Seite mit der Falte als Hals-Sprosse (Schärfe übernommen), oben das kurze Stück auf
  der Speiche über der Kreuzung (E2.3 a).
- [x] **Robbe tief J: Buckel der Lippe quer zur Haut** (Knick 16,8° an der Lippe bei A0 11,2°). Ursache (21.10. abends): Die
  gezeichnete Linie lag bis 0,75 px neben der Haut (Tiefe aus 16 Knoten, nahe der Silhouette steil, die Linie wellt sich); der
  Schlitz liegt auf der Haut, die Lippe folgte der Welle. Gelöst mit dem Lippenziel auf der Haut (`lippeAufHaut`, Knick 11,2°);
  noch Option, Standard zusammen mit der Leiter (sonst kippt Rex mittel gerade).
- [ ] **E2.4 offen:** A0 mit Querschnitt aus der Hülle, P-Linien am Maul (Falten, die den Schlitz kreuzen), Loops.
- [ ] **Spiel-Budget (21.10. spätabends, Florians Frage nach der Polygonzahl auf dem Handy):** Der Einsatz auf K2 verfeinert den
  ganzen Käfig zweimal und kommt mit Lippe, Tasche und Rachen auf 9 500–13 000 Flächen (Kugel mittel gerade, Rex mittel J);
  schon die Käfigflächen allein sind 19 000–26 000 Dreiecke, das Brett-Budget ist 8 000 je Wesen (Körper ohne Maul auf Stufe 1:
  3 200). Messung `apps/editor/scripts/pruefen/dreieck-budget.ts`. Wege: Einsatz örtlich ohne Verfeinerung des ganzen Körpers
  (Stücknetz mit Dichteübergang), weniger Lippenspannen (6–8 reichen für ein rundes offenes Maul), kleinerer Rachen, eigene
  Brettstufe. Als Budget-Tor in P2/P3 der Prüfphase (Übergabe, „Vorgehen ab 22.10.“), dazu Spiel-Probe P0 auf dem iPhone.
- **Erledigt (21.10.):** A0 wie im Editor als Standard des Prüffalls auf K2; Mundwinkel-Tor an allen 43 Fällen auch an Rex und
  Robbe (Ausgleich der Stufennaht, letzte Lippenspanne 0,15 Feldkante); Spitzen von A0 auf der Naht (Robbe mittel 0,58 → 0,14 px)
  und am Linienanfang als Ecke der Lippe (Rex mittel Lippe 1,5 → 0,7 px); Naht nach Bogenlänge auf umparametrisierter Karte (Robbe
  hoch 1,36 → 0,37 px, Rex mittel 0,51 → 0,18 px); Knickmaß ohne die Umgebung von Spitzen (dort gibt es keinen glatten Bezug).
  Haut-Tor 39 von 43 an allen Körpern. Planseite „Stand E2“.

## Befunde aus E1 (21.10., Maul als Einsatz — Kernring)

- [ ] **Rex und Robbe bis E2 außerhalb der Tore** (21.10., dritte Sitzung): Haut 0,6–1,0 px und Knick 23–43° an Rex mittel und
  Robbe hoch, wo A0 eigene Falten im Feld trägt (Schnauzenkante 105°, Kerbe 18°); Rex tief J am Mundwinkel 8,6° (A0 4,3°).
  Umgeklappt ist dort nichts mehr. → E2 („Falten von A0 im Feld laufen auf einer Spalte weiter“).
- [ ] **Spitzer Schlitzanfang** (Robbe hoch, 21.10., dritte Sitzung): Die Linie trifft die Naht spitz; die konforme Karte drängt
  die Speichen über den ersten Lippenstellen an die Naht (V wächst dort mit der dritten Potenz des Abstands), Reihe J_i liegt über
  ihnen gerade → Zellen bis 57 : 1 an Reihe J_i. Wege: Reihe J_i nahe der Naht nach Bogenlänge statt über den Lippenstellen, oder
  ein eigener Schlitzanfang mit Polen.
- [ ] **Spitze Zellen am Feldrand** (21.10., dritte Sitzung): in der letzten Zellreihe an den Ecken des gekappten Felds bis 1,4°
  (vorher an der Stufennaht bis 2,1°); Knick dort unauffällig (höchstens A0 + 1,9° im ganzen Feld).
- **Erledigt (21.10., dritte Sitzung): Mundwinkel-Tor 30 von 30** (`einsatz/kernring.extrem.ts`, jetzt `it`; Wächter an drei
  J-Linien in `kernring.test.ts`). Vorher 26 von 30, verfehlt an J-Linien (Kugel mittel J 4,4°, Ei mittel J 3,9°, Ei tief J 4,8°,
  Langhals hoch J 8,0°; jetzt 1,8 / 1,1 / 2,0 / 5,6° bei A0 1,4 / 1,2 / 1,4 / 6,0°). Nicht die Verdrehung war es (sie gibt es auch
  in Fällen, die das Tor halten), sondern Feld und Fächer: Feld begradigt bis 1,5 Radien (`kappe`; ganz begradigt wuchs es über
  den Kopf, das reine Band hatte Buckel mit Fünferpolpaaren), Fächer um c als Halbkreis auf der Haut (`faecherKreis`; aus der Karte
  allein lag er gekippt, weil sie den Schlitzufern an der Spitze verschiedene V-Abstände gibt). Dazu Nahtspeichen auf den
  Kartenlinien ihrer Reihen (`naht: 'karte'`): Nach Bogenlänge passten sie nicht zu Reihe J_i, Robbe hoch und Rex klappten um —
  jetzt in keinem der 39 Fälle, über alle 54 Fälle 64 → 1. Haut max 0,22 → 0,09 px, Lippe ≤ 0,44 px. Planseite „Nachtrag E1
  (dritte Sitzung)“; verworfen: Polpaare, symmetrischer Schlitz, Auffaltung an der Spitze, Ortskarte, reines Band, Fächer als
  Quadrat, Fächer hinterher drehen.
- **Erledigt (21.10., zweite Sitzung):**
  - Haut ≤ 0,25 px als Standard des Kernrings (K2, Reihen 10–16, Ausgleich außen): 30 von 30 ohne Rex/Robbe, Haut-Tor in
    `kernring.extrem.ts`; Rex/Robbe 2–4 px wegen eigener Falten von A0 im Feld (E2).
  - Einsatz zu langsam für K2: dünn besetzte Normalgleichungen in Lage und A7, ein Fall ≈ 3–4 s statt 10–30 s.
  - Falten 160–179° am Mundwinkel auf K2: Der Kantenpfad lag bis 2,8 px neben der Linie → Pfadpunkte auf die Linie
    (`schnittAufLinie`).
  - Lippenwulst knickte auf K2 längs der Lippe 3–5° (Steigung bis 12° im schmalen Band) → im Kernring 0 (Tasche A8 sorgt für den
    Abstand der Lippen).
  - Mundwinkel-Messung hing an der letzten Lippenspanne (schrumpfte mit ihr) → fester Umkreis von drei Feldkanten.
- **Knick am Mundwinkel kommt von der Lage, nicht von der Topologie** (21.10. mittags): Kissen mit idealer Lage 1,0°, 2 : 1-Zellen
  10–16°; im Feld liegt der Fächer 3–10-mal zu nah an c und gekippt (konforme Lage ist um c parabelförmig). Sechs Lage-Varianten
  gemessen und verworfen (Planseite „Nachtrag E1“), in der zweiten Sitzung sechs weitere (Normalenbindung, Zellform als Quadrate
  und zur Kissen-Vorlage, Reihen nach Hautlänge, Naht glätten, Feld verlängern; Planseite „Nachtrag E1 (zweite Sitzung)“).
- ~~Kernring braucht Zellgrößen ≥ einer Kante von K1 am Mundwinkel~~ → auf K2 widerlegt (21.10., zweite Sitzung): Kürzere letzte
  Lippenspannen (¼ Feldkante) passen zur dichten Lage um c und sind besser (Ei tief J 9,4 → 4,8°, Rex tief gerade gefaltet →
  9,8°); die Karte darunter stört nicht.

## Befunde aus B7 (16.10. früh, eigene Befunde)

- **Abspielen nicht flüssig** (Rex ≈ 8–9 Bilder/s): Ein Gewichtswechsel kostet im Worker 55 ms (posierte Dreiecke mit Normalen ≈ 37 ms, Zähne ≈ 12 ms), dazu Übertragung und Anwenden im Hauptthread. Entwurf §7 verlangt ≤ 8 ms → gemerkte Dreieckszerlegung (Topologie fest, nur Lagen und Normalen) und ein schlanker Anwendungsweg. → B10.
- **Pose mit gegiertem Kiefer durchdringt sich** (heutiger Maulbau): Kugel mit Kiefer 34°, Gieren 8°, Schädel 14° → 16 Hautpaare (Überbiss: 9 zusätzlich zur erlaubten verdeckten Überlappung); die Fressen-Pose der Kugel (gleich) hat bei 100 % 2 Paare. Das Überblenden fügt keine hinzu. → B8 (extreme Posen) bzw. Teil A.
- ~~„Aus der Vorschau“ fehlt~~ → erledigt 16.10. früh (Worker-Auftrag `mischen`, exakt). Grenze: Bei einer schiefen Pose mit Lippenkorrektur wäre die Summe nicht spiegelgleich; gespeichert wird die rechte Hälfte.
- **Erledigt aus B6:** Aufblasen mit Betrag 0 schreibt keinen leeren Undo-Schritt mehr (Geste ohne Wirkung → kein Schritt). Offen bleibt die Entscheidung zu den Hebeln an den Knoten der Pose-Linie.

## Befunde aus G4 neu, Wirbelsäulen-Baum (16.10. früh, eigene Befunde)

- **Ansatz der Äste faltet** (Schritt 3, drei Anläufe, angehalten): Feld auf der Rumpfnaht lang und schmal entlang der schrägen Sehne, Hals rund → verzogene Vierecke zwischen Feldrand und erstem Astring (Langhals 553 von 759 Falten an der Sehne). Wege: (1) Übergangsringe, die den Feldrand zuerst entlang der Flächennormale anheben und dann in die Astrichtung drehen (Knoten wie in B-Mesh/SQM); (2) Feld quer so breit wie der Ast am Ansatz (aus der Front), längs nach der Sehne, beide Seiten etwa gleich lang; (3) Astringe am Ansatz senkrecht zur Astachse statt aus der Leiter des Asts.
- **Knick im Ast fächert** (Hals → Kopf bei Ente, Giraffe, S-Hals): dieselbe Ursache wie der Fächer im Entenkörper; die Zerlegung muss auch innerhalb eines Asts greifen (Kopf als Ast am Hals oder Hals als Ast am Kopf, je nach Dicke).
- **Entenrumpf hat Falten am Bauch** (59°): Die Front des Rumpfs trägt noch die Schultern der Flügel (der Flügel ist in der Front kein dünnes Teil); kommt mit den Flügeln als seitliche Äste.
- **Fischflossen auf der Mittelebene reißen** (Seite 22 px): Gabel-Äste aus der Seite noch ohne eigene Front/Top-Breite (dünne Flosse); kommt nach dem Ansatz.

## Regression G2 und sichtbare Falten im Editor (16.10. morgens, Florian)

- **Regression G2 (behoben, 00681e29):** Seit G2 (15.10. 22:35) fror der Editor beim ersten Bau der Startkugel auch die Enden der Wirbelsäule ein. Nach dem Umformen oder dem Zeichnen eines Mauls (andere Knotenzahl) wurde das alte Ende „in der Nähe“ gesucht und lag an der Kerbe statt an der Schnabelspitze: Florians Schnabel mit Unterbiss Seite Δ 32 px, Prüfreihe „Unterbiss Florian“ mit eingefrorener Startkugel Δ 20 px und 822 Durchdringungen statt Δ 0,8 px und 0; seine Vase aus der Kugel mit der Wirbelsäule quer durch den Körper. Jetzt: mit Maul wie vor G2 (bitgleich, 20 Fälle), ohne Maul Enden nur, solange sie die Form tragen. Meine erste Prüfung meldete fälschlich „keine Regression“, weil sie nur frische Bauten und Library-Körper verglich. **Regel:** Jede neue Automatik mit Florians Ablauf prüfen (Kugel bauen, Stationen frieren ein, dann umformen, Knoten einfügen, Maul zeichnen; `KUGEL0=1`, `mitStationenVon`, Editor-Ablauf `ablauf.mjs`).
- **Sichtbare Falten, die schon vorher da waren** (gemessen am heutigen Stand, faltenMass Stufe 3, Kanten über 20°): Langhals-Nacken (Knick Hals → Kopf) 23°, 32 Kanten; Rex 93°, 77; Robbe 34°, 118; Ente/Überhang 68°, 669; Kugel mit kleinem Maul (Kiefer gleich) Haut 46° geschlossen; Schnabel mit Unterbiss (Florians Ablauf) Haut 177°, 268 Durchdringungen. Das sind Fehler, keine Ausgangswerte. Wege: Maul als Einsatz (Teil A) in den Editor, Knick als eigenes Glied (Plan „Formgerechte Topologie“).

## Befunde aus S0 (Plan „Liniennetz, Zielform, Käfig“, 16.10. vormittags, eigene Befunde)

- **„Rex 93°“ ist überwiegend die gezeichnete Schnauzenspitze:** Das alte Faltenmaß zählte die Kanten um eine Spitze mit
  Punktschärfe (ein Kegel aus vier Flächen) und halbscharfe Kanten als Falten. Nach Zonen: freie Haut 20,3°, Spitze 40,6°,
  Kappe 25,1°. → Gilt ab jetzt: Falten nach Zonen messen (`kern/pruefen/zonen.ts`), Tore auf der freien Haut.
- **Kappen sind die größte Faltenquelle** der heutigen Röhre: einfache Form 99°, Vase 172°, Ente 171°, Ente mit Haken 138°
  (flache oder breite Enden mit c × c-Kappe). → S2 (glatte Haut) muss die Kappen einschließen; S5 legt Enden neu aus.
- **Der „eingedrückte Kopf“ (Florians Screenshot 1) ist vor allem ein Widerspruch der Zeichnungen:** Im Top ist der Kopf
  gleich hinter dem Schnabel breit, die Front (Glocke aus Hals und Körper) erlaubt in dieser Höhe nur einen schmalen Kopf —
  bis 36,7 px. Kein Körper kann beides treffen; der heutige Bau drückt den Kopf still auf die Front. → Der Editor markiert
  Widersprüche jetzt rot; welche Ansicht gewinnt, gehört zur Look-Entscheidung in S3.
- **Rex Front 11,1 px:** davon 6,0 px Widerspruch zwischen Front und Top (die Front ist an der Schulter breiter als das Top),
  der Rest Baufehler. **Langhals:** Seite 3,7 px höher als die Front (Library-Vorlage ohne Kopplung), sichtbar im Front-Δ.
- **Robbe, Giraffe mit Bauch, Vierbeiner, Zweihals, Augenstiele, Flügel oben:** kein Widerspruch — ihr ganzes Δ (10–74 px)
  ist Baufehler der einen Röhre.

## Florians Klarstellung zum Plan „Liniennetz, Zielform, Käfig“ (16.10.)

> „Die schwarze Linie soll genau den Ist-Zustand des Meshes zeigen und da wir durch das Liniennetz alle Punkte in allen
> Ansichten haben verstehe ich nicht warum das nicht möglich ist, bzw wie es zu den Widersprüchen kommen kann. Die
> schwarzen Linien wie bei der Ente würden beim Bau ja gar nicht erst wie im Beispiel entstehen…“

- **Das 3D-Liniennetz ist die einzige Wahrheit**, die schwarze Linie jeder Ansicht seine Projektion (der echte Umriss).
  → Planseite, Nachtrag 16.10.; die alte Aussage „die Wahrheit bleibt in den Zeichnungen“ ist dort als überholt markiert.
- **Die bearbeitete Ansicht führt, die anderen folgen am entsprechenden Punkt.** → S1c gebaut (Kopplung jedes Punkts in
  jeder Formgeste); offen: S3 (dritte Koordinate jedes Umrissknotens im Dokument).
- **Rot nur für Altes und Fremdes** (gespeicherte Wesen, Vorlagen, nachgezeichnete Bögen) mit „angleichen“ → gebaut.
- **Gelb (Δ) ist Baukontrolle und soll leer sein.** → Bis S5/S6 zeigt es ehrlich, wo der Körper der stimmigen Linie noch
  nicht folgen kann (Hälse, Bauch vor der Nase, Flügel).

## Befunde aus S1/S1c (Plan „Liniennetz, Zielform, Käfig“, 16.10. mittags, eigene Befunde)

- **Gelöst 16.10. nachmittags (Florian: „einfügen, aber nur wenn wirklich notwendig“):** Die Kopplung teilt jetzt bei einem
  Rest über 1 px ein Segment der folgenden Ansicht (höchstens zwei je Zug, nur wenn es hilft); Zufallsreihe 325/325 stimmig,
  2 nötige Punkte. Ursprünglicher Befund: **Kopplung ohne neue Punkte hat eine Grenze:** Verlangt die führende Ansicht an einer Stelle eine Breite, die die folgende
  nur mit einem zusätzlichen Knoten darstellen kann (Ente-Haken: Kopf im Top breit, Front mit einem einzigen freien Knoten
  am Bauch), bleibt die folgende stimmig und der Rest als Widerspruch in der führenden stehen (Kern: 2 von 325
  Zufallsgesten). → Frage an Florian: Punkt am entsprechenden Ring einfügen lassen (gegen die Regel vom 11.10.) oder von
  Hand setzen?
- **Angleichen verändert eine alte Zeichnung sichtbar** (Ente, Front führt: Top-Kopf so schmal wie die Front, Flügel
  spitzer); der heutige Körper folgt nicht genau (Front-Δ danach 44 px). → S3 (Umrisse berühren).
- **Kantenlinien-Falten sind Treppen über Käfigkanten** und jetzt in allen Blättern sichtbar; der Front-Umriss wackelt an
  einer solchen Falte. → S8 (Linien exakt).
- **Faltenrest im Entenhals:** Hinter 21 Netzproben der Seite liegt eine umgeklappte Fläche (≈ 2 px vor der Haut, Rückseite
  zur Kamera; die Bühne zeichnet sie nicht). → S2 (glatte Haut), als Prüfung: Netzproben „hinter umgeklappter Fläche“
  (`netz-d.mjs`) müssen 0 werden.
- **Liniennetz knapp über dem Zeitbudget beim Vierbeiner** (33,5 ms statt ≤ 30 ms; 74 Faltenzüge, 7748 Proben). → Falten
  gröber ausdünnen oder Sichtbarkeit je Zug statt je Probe, wenn es stört.
- **Gemessen statt vermutet (Lehre):** Ein kleiner Außenversatz für Konturproben (gegen das Streifen in ihrer eigenen
  Ansicht) machte sie in den anderen Ansichten fälschlich sichtbar (bis 176 px verdeckt), und die Verdeckung auf einer Stufe
  gröber wich an streifenden Stellen und Kehlen um 2–20 px ab — beides erst durch den Vergleich mit dem Strahltest der
  Bühne gefunden (`netz-d.mjs`) und behoben.
- **Faltenrest im Entenhals (Nachtrag S2):** mit „glatt“ 21/3/3/6 → 7/0/0/0 Proben hinter umgeklappter Fläche
  (Seite/Front/Back/Bottom); der Rest an der Seite verschwindet erst mit S5 (der Haken klappt die Röhre um).

## Befunde aus S2 „Glatte Haut“ (Plan „Liniennetz, Zielform, Käfig“, 16.10. nachmittags, eigene Befunde)

- **Tor „kein Körper schlechter um > 0,5 px“ nicht erfüllt — angehalten nach mehr als drei Anläufen:** Vase Front
  9,1 → 13,5 px, Giraffe mit Bauch Front 15,6–16,5 → 22,0, S-Hals Top 6,6 → 7,6/8,4, Robbe aus der Startkugel Seite
  3,1 → 4,0 (Schnauzenspitze), Fisch Top +0,6/0,7. Ursache gemessen: Die Breitenpunkte setzen die breiteste Stelle jedes
  Rings auf das Top; auf der glatten Haut liegt sie dort, wo die Ziele sie haben, und dort ist das Top schmaler (Vase:
  x −0,145 statt −0,08, Kreis 0,222 statt 0,253). Die Wellen der Interpolation hatten die Silhouette zufällig nach außen
  gedrückt. Anläufe: Laplace gegen 0, relativ zur Zielform, gehobener Bezug, Breiten-/Nahtgewichte, Kappenfaktor,
  Stufe 1. → S3 (Umrisse berühren, Breitenlinie als Griff); bis dahin entscheidet Florian, ob „glatt“ trotzdem Standard
  wird (Top wird dabei oft deutlich besser: Robbe 20,7 → 12,3, Giraffe 18 → 9,4 px).
- **Fernfeld örtlicher Züge (≤ 0,1 px) mit der Röhre nicht erreichbar:** unverändert wie heute (Kugel 5,1 px, einfache Form
  83 px), weil die Ringe je Bau aus der Leiter neu gelegt werden. → S5 (örtliche Teile); das Tor gehört dorthin.
- **Volumen:** Fisch +4,4/+4,9 % (Flossen als Querschnitte einer Röhre werden beim Glätten voller), Giraffe −2,1 %.
  → S6 (Flossen als seitliche Teile).
- **Mit Maul oder Beinen noch ohne Glättung:** Am alten Maulbau gemischt (Florians Kugelmaul Seite +7 px, sonst weniger
  Hautfalten und Durchdringungen). → mit dem Maul als Einsatz (Teil A) auf der glatten Haut.
- **Lehre:** Die Falten der Röhre kommen nicht aus Naht und Breite, sondern aus der Interpolation der Käfigziele (nur die
  Ziele: Rex aus der Startkugel 173°); die Ziele als Käfig sind glatt, aber 5–10 % zu klein. Glätten muss deshalb relativ
  zur Zielform sein (nur die Abweichung), sonst werden Querschnitte runder und Flossen dicker. Ein „gehobener“ Bezug
  (Richardson-Schritte Richtung Interpolation) bringt die Wellen zurück.

## Befunde aus dem S3-Versuch „Fülle“ (Plan „Liniennetz, Zielform, Käfig“, 16.10. nachmittags, eigene Befunde)

- **Die Glättung relativ zur Zielform erhält Unregelmäßigkeiten der Ziele.** Fülle in Stufen von Ring zu Ring (p 3 → 3,5 →
  4) zeichnete sich als Ringbänder auf der Flanke ab. → Alles, was Ziele je Ring verändert, muss längs der Ringe glatt
  verlaufen (Füllverlauf geglättet; gilt auch für S3/S5).
- **Fülle radial verschoben = Wellen:** Schulterpunkte stiegen in Höhen, in denen die Front schmaler ist, und wurden je Ring
  anders beschnitten. → Fülle nur waagerecht auf gleicher Höhe.
- **Geneigte Ringe:** Volle Schultern liegen an einer anderen Stelle x als die Ringmitte und ragten übers Top (Robbe Top +8 px,
  Falten 34°). → Jeder Punkt am Top an seiner eigenen Stelle beschneiden.
- **Widersprüche nicht „erreichen“ wollen:** Auf die ganze Front gezielt, blähte die Rex-Schulter (6 px Widerspruch) Ringe bis
  p 24 auf. → Ziel ist die Sichthülle (erreichbarer Teil der Front), der Rest bleibt rot.
- **Robbe mit „mittel“: flacher Bauch vorn, ein Knick 21°** (stark geneigte Ringe mit vollem Bauch fächern). → S3 füllt
  nur im Höhenband, in dem der Ring die Front stellt, nicht den ganzen Ring.
- **„genau“ ist kastig:** Kanten ohne Faltenmarken im Käfig (Faltenmaß 34° an der einfachen Form, Rex +12 % Volumen). →
  Falls Florian „genau“ wählt: Kanten als Falten im Käfig, sonst bleibt es eine weiche Näherung.

## Befunde aus S3 Teil 1 „Front berühren“ (16.10. abends, eigene Befunde)

- **Tor „kein Körper schlechter um > 2°“ nicht gehalten — angehalten:** Langhals (frisch) und Drache bekommen +1,3 bis
  3,3° an einer Falte, die es schon gab (Langhals Hals/Kopf bei x 0,014, y 0,605). Die Ente aus der Startkugel wird an
  ihrer schon kaputten Kappe schlechter (Front 8,7 → 14,3 px, Falten 36 → 45°). Anläufe: Gewicht der Berührpunkte,
  Glockenbreite, Wachstumsgrenze gekappt/übersprungen, Endringe, Top-Abstand. → S5 (eigene Querschnitte je Teil) nimmt die
  Ursachen; bis dahin ist Berühren ein Schalter je Wesen.
- **Die Vase brauchte Breite, nicht Fülle:** Geneigte Ringe rechnen ihre Breite W an der Ringmitte, die Sichthülle an
  ihrem Punkt erlaubt mehr (0,229 gegen 0,259). → Berühren wächst bis zur Hülle am eigenen Punkt, auch über W hinaus.
- **Giraffe: Vorlage passt nicht zu geneigten Ringen** (Flaschen-Front auf jede Sprosse gestreckt: an der Bauchhöhe nimmt
  der Ring den schmalen Hals der Vorlage) — Berühren müsste × 2 bis × 3,6 wachsen (+27 % Volumen). → Übersprungen (über
  × 1,35); Lösung in S5.
- **Seitliche Teile pumpen den Rumpf auf:** Fisch +44 % Volumen ohne Grenze. → Wünsche über × 1,35 gelten als anderes
  Teil (S6) und werden übersprungen (Fisch dann +10 %).
- **Glättung relativ zur Zielform hält nicht jede Zielerhöhung:** Die glatte Haut traf erhöhte Ziele nur zu etwa ⅔. →
  Berührpunkte als Breitenpunkte; alle gewachsenen Punkte als Bedingung gaben Falten (26°), nur die verlangten (Gewicht ¼)
  nicht.
- **Deine einfache Form hinten: nur als Kante erreichbar** (0,8 breit bei fast 0 Höhe). „mittel“ rundet eng (22,8°),
  Top-Ecken bleiben offen. → Markierung „nur als Kante“ im Blatt fehlt noch (Rest von S3).
- **Breitenlinie als Griff (S3, zurückgestellt):** Querschnitte je Ring in der Höhe zu verziehen ist der falsche Hebel. Bei
  geneigten Ringen wandert der Punkt längs der Sprosse auch in x (Rex/Robbe nach oben 15–20 px Rest). Starkes Verziehen
  faltet (Robbe 36–91°), und ohne mitgehende Front widerspricht der Griff der Front-Zeichnung (Kugel). → Als
  3D-Bedingung im Löser (Breitenlinie mit Tangente) zusammen mit S5 bauen.

## Befunde aus S4 „Teile erkennen“ (16.10. abends, eigene Befunde)

- **Einordnung nicht ganz zugfest:** 4 von 1428 Zügen (< 10 px, 30 Schritte) springen hin und her, 17 wechseln einmal — alle
  an kleinen Grenz-Wülsten (Rex-Stirnwülste, Drachen-Halsverbreiterung, Vierbeiner-Schulter, Kastenkinn). Weg: Mindestgröße
  eines Teils relativ zum Körper oder Florians Regel, was ein Teil ist (S4-Bestätigung).
- **Mehrdeutige Ausbuchtungen als „erlaubt“ eingetragen**, nachdem die Kandidaten zu sehen waren (Rex-Schwanz und
  -Stirnwülste, Robbenkopf, Tiger-Schnauze, Vierbeiner-Kopf, Flügelansatz der Library-Ente) — Florian entscheidet sie.
- **Paar aus nur einer Ansicht** füllt in den anderen Ansichten die volle Hülle (Spitzen der einfachen Form decken in der
  Seite die hintere Hälfte); die Dicke müsste aus der Form kommen (S6) oder Florian zeichnet sie (verdecktes Stück als Kurve).
- **Mittelteile in Front/Top blockig** (Raster der Hülle, ≈ 2 px) und z. T. zu breit (die Hülle am Halsansatz ist so breit
  wie die Glocke der Front) — Anzeige, keine Geometrie.
- **Skelett:** Zhang–Suen löscht schräge Linien von zwei Zellen Breite; Beschneiden misst gegen den zufälligen Abzweig;
  flache Wülste bilden je nach Rasterlage keinen Ast. Für S4 umgangen (Lü–Wang, seitliche Äste ohne Beschneiden, Mitnehmen
  an der eingefrorenen Sehne); die Seite nutzt noch das Beschneiden (in den Zügen stabil, aber dieselbe Anfälligkeit).
- **Nicht gebaut:** Klick macht ein verdecktes Stück zu einer eigenen Kurve (`dok.teile`) — nach Florians Bestätigung.

## Befunde aus S5 „Mittelebenen-Baum“ (16.10. abends/nachts, eigene Befunde)

- **Gabeln brauchen ein Y-Stück.** Der Überhang (Kopf über der Brust, Kehle dazwischen) und der Fischschwanz sind Gabeln:
  Ein Strang teilt sich in zwei Lappen. Als Verbindungsstück dreht sich der Kopf im Kind um ≈ 90° (Fächer, 173°); als ein
  Streifen bleibt der Fächer von heute (28°, besser als 58°). Fisch heute: unterer Lappen über den Übergang 2:1, oberer
  seitlich. Weg: Y-Stück (Dreieck aus Stammring und zwei Lappenringen, Mitte mit drei Kanten) oder Kopf als Streifen
  neben dem Rumpf, beide an der Sehne geklebt (Seite an Seite).
- **Überlappende Sehnenblöcke** (Rücken- und Bauchflosse übereinander): Ein Elternring kann nicht auf beiden Sehnen enden,
  ohne dass beide Kinder Punktzahl und Lage teilen → das kleinere Teil bleibt im Rumpf (Fisch-Bauchflosse, frei 32°).
  Weg: gemeinsamer Block, dessen Ringe beide Sehnen schneiden; die Kindringe 0 nehmen deren Lage.
- **Hohlkehlen an den Sehnenenden:** Punkte mit sechs Kanten auf der Naht, quer über die Naht 20–25° (S-Hals 23,4°, Ente
  24,6°, Giraffe 20,5°). Die Übergangslänge (0,2–0,7) ändert das nicht; die Stelle ist auch geometrisch stark gekrümmt
  (einspringende Ecke der Seite). Weg: Hohlkehle als eigener Streifen mit Radius aus der gezeichneten Innenecke (Plan S6).
- **Kehrtwende im Kind** (Ente: Hals nach rechts oben, Kopf zurück nach links, ~150°): Sprossen laufen an der Innenecke
  zusammen; gespreizt und mit Ringfalte auf beiden Seiten frei 16°, aber Zone Kante 72°. Weg: Kopf als eigenes Glied am
  Hals (S4 trennt Hals und Kopf nicht, weil nur eine Seite eine Kehle hat).
- **Entenschwanz ist eine Klinge:** Top an den letzten 15 px 2–9 px breit und 3 px kürzer als die Seite, Seite 47 px hoch —
  die Kappe wird eine senkrechte Klingenkante (77°). S3 rundet sie (24°) und weicht dafür ab. Widerspruch der Zeichnungen;
  Florian entscheidet (rund oder Klinge).
- **Übergang 2:1 am Langhals versucht, zurückgestellt:** Falten gut (≤ 18°), aber die S4-Sehne liegt tief in der Brust;
  deren dicker Ansatz landete im Hals mit 8 Punkten (Top 4,4 → 6,8 px, Seite 1,5 → 3,0). Weg: Übergangssehne dort, wo der Hals
  dünn ist (die Brust bleibt im Rumpf).
- **Querschnitt der Elternstreifen:** Front-Lappen besser (Giraffe-Front 1,9 statt 8,8 px), aber mit einer Flosse im Rumpf
  trägt jeder Ring ihren Stachel (Fisch 60°) → dort rund. Eigentlich gehört dem Rumpf nur sein eigener Front-Umriss (ohne
  Kinder); für Paare in Front und Top gebaut (Rumpf-Silhouetten), für Mittelteile in der Front noch nicht.
- **Käfiggüte nicht Ziel der Auslegung:** kleinster Winkel 8–36°, Seitenverhältnis 3,5–19 (heute 4–28°, 10–47). Tore ≥ 25°
  und ≤ 3 nicht erfüllt; an verjüngten Spitzen und Sehnenenden unvermeidlich kurze Kanten (Kanten je Streifen bis 0,06 des
  Medians).
- **Querschnitts-Reste, die keine Topologie sind:** Langhals/Drache Front 3,9 px am obersten Kopfpunkt, Top 4,4 px am
  hinteren Rumpf (heute 4,3/3,4) — Kopfring in der Front zu niedrig, geneigte Ringe gegen das Top.
- **Topologie je Bau neu:** Die Auslegung wird bei jedem genauen Bau bestimmt (110–250 ms); Einfrieren und Pinsel/Posen
  auf dem Baum kommen mit S7.
- **P-Linien fehlen auf dem Baum:** `baumBau.ts` setzt Falten nur aus gezeichneten Ecken der Seite, nicht aus `dok.kanten`.
  Florians Entscheidung (16.10. abends, Planseite S7/S8): bis S8 kein Rückschritt — der Einbau (S7) braucht die P-Linien
  mindestens als Treppenfalte auf der nächsten Schleife je Streifen und über die Ansätze (Prüffall Ente, Linie über den
  Halsansatz).

## Befunde aus den S5-Resten (16.10. nachts, eigene Befunde; Planseite „S5-Reste“)

- **Hohlkehlen — Ursache gefunden, für Hälse gelöst (R1 Kragen):** Die Falten an den Sehnenenden lagen schon in der Zielform,
  auch wo die Zeichnung gerade läuft. In einem Nahtpunkt mit sechs Kanten trafen der oben runde Rumpfring (Radius ≈ 45 px)
  und der spitz endende Kindring auf der Sehne (≈ 11 px) zusammen. Mit dem Kragen (U-Schleife auf der Rumpfhaut) gibt es
  keine Sattelpunkte auf der Naht: Giraffe 11,2°, S-Hals 13,4°, Ente 16,4°.
- **Überlappende Flossen — gelöst (R2):** Kragen-Paar über gemeinsamen Ringen, die längere Flosse mit 16 Punkten. Die Wege
  „gemeinsamer Block“ aus den S5-Befunden sind damit erledigt.
- **Dünne Flossenkanten:** Die Hinterkante der Fisch-Rückenflosse faltet 22–26° auch oberhalb des Ansatzes (Ring 1 → 2); die
  Flosse ist eine schmale Linse. Wie der Entenschwanz: Klinge (scharfe Kante, als gewollt gezählt) oder rund? Florian
  entscheidet; ohne Entscheidung bleibt das Ansatz-Tor am Fisch offen.
- **Rückenflosse mit 16 Punkten:** Ihre Spitze ist eng besetzt (Seitenverhältnis 13,8, schlechtestes Viereck am Fisch). Sauber
  wäre ein Übergang 16 → 8 im Kind (Übergangsreihe mit 3/5-Polen, wie S6 sie plant).
- **Fisch-Geist 262 ms** (5 Streifen) über dem Tor 250 ms.
- **Front-Lappen mit Schnittknick:** Ohne eingebaute Bauchflosse nimmt der Fischrumpf den Front-Lappen. Dessen Umriss ist an
  den Brustflossen (Paar, S6) gerade abgeschnitten, und der Knick wird zur Falte am Schwanzstiel (25°). Rund behebt sie, kostet
  aber vorn (Front 4,7 → 6,0 px). Weg: Schnitt der Paare im Front-Umriss glatt verlaufen lassen, oder der Rumpf bekommt in S6
  seinen eigenen Umriss ohne die Paare.
- **Überhang (R4) nach drei Fehlanläufen angehalten:** Querschnitt je Ring (173°), geglättet über ±2/4/6 Ringe (154/91/62°),
  der gezeichnete Spant für alle Ringe (42,8°); die Glocke bleibt mit 28,2° das Beste. Ursache: ein Streifen mit einer
  Ringschar über den Fächer an der Kehle; dort liegen Ringe mit ganz verschiedenen Höhenbereichen dicht beieinander, und
  jeder eigene Querschnitt lässt sie sich kreuzen. Wege: (a) Kopf als eigener Streifen mit eigenem Querschnitt, angesetzt per
  Kragen mit Drehung (der Kopf zeigt quer zur Sehne; bisher 173° beim Ansatz als Sehne); (b) Gabel mit Brust und Kopf als
  Lappen (Y-Stück); (c) Querschnitt aus der Sichthülle je Punkt (min(Top bei x, Front bei y)) statt eines Lappens je Ring.
  Zusätzlich: Gilt ein gezeichneter Spant im Baum? Heute verdrängen die Rumpf-Silhouetten eines Paars ihn (mit Spant war der
  Überhang schlechter, weil ein Spant für alle Ringe auch den Kopf formt) → Spanten je Teil, mit S7.
- **R3 nicht anwendbar:** Das Stück über der schmalsten Halsstelle trägt den Kopf (63 % des Rumpfumfangs). Ein Übergang 2:1
  bräuchte am Kopf wieder 1:2. Langhals und Drache bleiben ein Streifen.
- **Messskripte und Kragen:** Skripte, die Käfigflächen in der Reihenfolge (Streifen, Ring, j) abzählen, beschriften Flächen
  mit Kragen falsch (Flächen im U entfallen). Richtig: `bk.flaecheRing`, `bk.flaecheJ`, `bk.flaecheStreifen`.
- **R5 Höhenfeld (Versuch, 16.10. nachts):** zwei gemessene Anläufe (rund; rund + Berühren + feine Feldpunkte). Glatter an
  Vase und Drache, aber vorn 3–7 px ungenauer an Giraffe, Ente und Fisch (keine Front-Form im Querschnitt). Kein Standard;
  bleibt als Baustein für S6 (dünne seitliche Teile als Feld über ihrer Fläche). Aufgedeckt: Ringe, die dicht an einer
  einspringenden Ecke vorbeilaufen (Überhang-Kehle, 1,6 px), bekommen eine Taille — im Ring-Modus unsichtbar, aber ein
  Auslegungsfehler (Weg: Kopf als eigenes Teil, oder Sprossen um die Ecke biegen).

## Befunde aus S6 „Seitliche Teile“ (16.10. spätnachts, eigene Befunde; Planseite „Stand S6“)

- **Fenster und Fußabdruck — gelöst:** Ein Fenster auf groben Rumpfzeilen war 1,5- bis 3-mal so lang wie der erste
  Röhrenring; der Löser stauchte die Haut (Ente Ansatz 37–68°, Zweihals 172°). Jetzt liegt der Fensterrand auf dem Fußabdruck
  des Wurzelrings, längs der Achse auf die Rumpfhaut gelegt (Ente 15,4°, Zweihals 23,3°).
- **Zweihals-Ring auf der Mittelebene — behoben:** Trifft eine Station die zweite Ansicht nicht (nahe der Wurzel liegt deren
  Sehne weiter außen), nimmt sie den Wert der nächsten getroffenen Station statt der Rumpfmitte (z = 0); vorher kreuzte der
  erste Halsring seinen Zwilling (167°).
- **Beine am Bauch — gelöst (Vierbeiner Ansatz 31,5 → 19,9°):** Die Innenkante des Beins liegt eine Rumpfzeile neben der
  Bauchnaht; zwischen Fenster und Naht blieb kein Platz für eine Kehle (Bauch waagerecht, Bein senkrecht). Versucht: Rumpf
  mit 24 Punkten je Ring (Kappen und Übergang 2:1 brechen), schwach gebundener Fensterrand (28,4°). Gelöst: Bei Teilen mit
  primärer Ansicht Seite rückt der Fensterrand längs der Achse um den halben Abstand zum ersten Ring in die Ecke
  (`fensterKehle`; Zweihals 23,3 → 14,8°). Bei Flügeln und Flossen verschlechterte derselbe Versatz Top und Front (die
  Wurzel-Ecken sind dort gezeichnet), deshalb nur dort.
- **Ente Front 7,8 px:** Die unteren Flanken der Glocke (Höhe 20…50 px) liegen innerhalb der Rumpf-Sichthülle (92 px), der
  Rumpf erreicht sie mit „mittel“ (weicher Kasten) aber nur bis 84 px. Der Überschuss gegen die tatsächliche Rumpfbreite
  füllte die Lücke, ließ die Flügelringe aber in Lücken über und unter dem Bauch springen (171°). Wege: Berühren „genau“ am
  Rumpf, oder die Dicke des Flügels aus der Front je Ringpunkt (Querschnitt aus der Sichthülle statt Ellipse).
- **Einfache Form (Ansatz 36°, Front 19,4, Top 17,2 px):** Die Stacheln hinten sind keine schlanken Teile, sondern ein großer
  Teil des Körpers (Wurzel 91 px, Dicke aus der Front bis 186 px). Eine Röhre mit 8 Punkten trägt das nicht. Florian hat die
  Einordnung als Paar bestätigt (S4); offen, ob sie als Paar gebaut oder in den Rumpf genommen werden (dann Top 77 px wie S5).
- **Zweihals Top 27 px, Front 16,5 px:** Die Brust unter den Hälsen reicht in der Seite bis x = −105, das Top zeigt zwischen
  den Hälsen aber nur bis −84 (Kerbe). Ob die Brust zum Rumpf oder zu den Hälsen gehört, sagen die Zeichnungen nicht
  eindeutig; die S4-Sehne legt sie in den Rumpf. Zeigt der Editor als Widerspruch.
- **Kappe mit 8 Punkten:** Eine Spitze ohne gezeichnete Ecke (Kopf oben) kann die Kappe aus einem Punkt nur rund nähern; mit
  Saum im Löser trifft sie das Ziel (Zweihals 14,5 → 3,8 px). Spitzen mit gezeichneter Ecke sind scharf (Zone Spitze, 47–67°).
- **Fisch-Bau 290–346 ms** über dem Tor 300 ms (5 Streifen + Röhre).


## Befunde aus S7/S8a und der Prüfung vom 20.10. (Plan „Vektorillustration“, eigene Befunde und sechs Code-Prüfungen)

Ausführlich im Plan [`2026-10-20-vektorillustration-bedienung.md`](2026-10-20-vektorillustration-bedienung.md), Abschnitt
„Ehrliche Bestandsaufnahme“; hier die offenen Punkte mit Schritt.
- **Umrisse binden nicht** (Front/Top nur weiche Ziele): Δ bis 12–14 px an einteiligen, bis 27 px an mehrteiligen Körpern
  → V4 (Umrisse als Käfigschleifen mit Silhouettenbedingung).
- **Netzlinien roh geschnitten** (lila/blaue „wilde“ Linie, flache Bänder aus „mittel“) → V2.
- **Linien nacheinander eingepasst** (S8a): parallele Linien verschieben die Haut abseits 4 px; Kante verschwindet im Zug;
  ≈ 0,8 s je Linie → V5. Tor „Kante ≤ 0,5 px“ bekannt rot.
- **Zwei Körperarten** mit verschiedenem Umfang (Reifen, Maul, Zähne, Formen folgen nur auf der Röhre) → V7.
- **Tore S5/S6 ≤ 20°** verfehlt (Ente 27°/25°, Fisch, Giraffe, Zweihals) — bekannt rot. Tor S3 einfache Form ≤ 2 px verfehlt
  (≈ 7,7/6,4 px) — bekannt rot. S7.2-Zug 24–62 ms über dem Tor 30 ms.
- **Ringverteilung der Startkugel** bleibt nach starkem Umformen eingefroren und passt dann nicht (Ente frisch Front 2,8 px,
  aus der Kugel 14,3 px) → V4 (Verteilung auch nach Front/Top) und V6 (Loops); bis dahin hilft „Neu ableiten“.
- **Kappen:** sehr dünne Stadionform (11:1) im Ablauf Kappe 112°, Würfel mit echten Ecken frisch 179° (gestuft 68°) → V4
  (Kappen nach Endform).
- **Diskrete Ringwahl in „berühren“:** Nach dem stetigen Übergang springt der Käfig beim Breiterziehen der Front noch um bis
  14 px (vorher 36 px), Ente-Haken 35 px → V4 ersetzt „berühren“.
- **Röhre baut nach jeder Geste zweimal:** Die eingefrorenen Enden (G2) werden nach dem Bau neu verankert und
  zurückgeschrieben; der zweite Bau hat eine leicht andere Form → in V1 messen (Nachrutschen nach dem Loslassen?).
- **Kopplung ohne Einfügen empfindlich:** Vierbeiner, Zug 14 der Zufallsreihe — 0,04 px Unterschied im Top ergeben 47 px
  anderes Ergebnis, die Seite wird an der Schwanzspitze unerreichbar. Mit Einfügen (Editor) gelöst → V1-Zufallsreihe.
- **Sporadisch rot unter Volllast:** `ringEinpassen` „Kugel, schräg“ (einmal, nicht wiederholbar) und die Tempo-Tests
  (lokal ohne Faktor) → beobachten. Dazu einmal nur auf CI (Lauf zu `d912d74b`): Versuch Flächenlinie, nach dem Verbreitern
  46 Lücken — lokal in sechs Läufen und im CI-Lauf davor grün; die Prüfung meldet jetzt Dreiecke und Front-Knoten.

## Bedienung 20.10. (Florians Wünsche und eigene Befunde)

- G/S/R wie Blender (G nach Kontext: Auswahl → Greifen, sonst Pinsel; S = Skalieren), proportionales Bearbeiten mit
  Einflusskreis am Mausrad, Esc bricht jede Geste bitgenau ab → V3 (Blätter), V6 (Bühne).
- ⌘R-Loops (einziehen, gleiten, vervielfachen) mit echten Knoten in Seite und Top → V6.
- Am 20.10. behoben (V0): ⌘R lud das Fenster neu; [ ] auf der deutschen Tastatur nie erreichbar; Rückgängig brachte
  eingefügte Punkte zurück; Punktsetzen glich alte Widersprüche still an; Wirbelsäulen fingen Klicks an Teilspitzen (der
  Stift begann eine P-Linie); der Baum wurde je Geste zweimal gebaut; Seitenknoten an Beinen lagen in der Luft; „Neu
  ableiten“ ohne Undo (samt Rennen mit einem laufenden Bau); Reifen auf „Teile“ ohne Wirkung und ohne Hinweis; Chips ohne
  Wirkung wählbar; `data-geist` doppelt belegt (Körperstatus und Posen-Geist).

## Befunde aus V1 „Prüfstand Extremreihe“ (20.10. abends, eigene Messungen)

Gemessen wie der Editor baut (Worker-Bau mit glatt + mittel, Florians Ablauf aus der Startkugel), 39 Körper in beiden
Körperarten; Tabelle, Kontaktbögen und Grundzahlen auf der Planseite 20.10., „Stand V1“. Je Punkt der Schritt, der ihn
angeht.
- **Röhre faltet und durchdringt sich** an Formen mit echten Ecken, Buckeln und Sicheln und an fast allen Mehrteilern:
  Würfel wie mit dem Stift frei 172° (Kappe 153°, 388 Durchdringungen; als Superellipse sauber, 8°), Seeschlange 179°/508,
  Sichel 180°/154, Vierbeiner 1190 Durchdringungen, Krake 157°/660, Flügel oben 56°/416, Hörner 146°/180, Augenstiele
  114°/338, Fisch 145°/76, Tigerkopf 38°/28 → V4 (Kappen nach Endform, Umrisse binden) und V7 (Teile als Standard).
- **Röhre lässt ganze Teile weg:** Katzenohren (Front 56 px), Krabbenscheren (Top 82 px), Seesternarme (Top 48 px),
  Zweihals (Front/Top 63/60 px), Hörner (Front 78 px), Flügel oben (Front 75 px) → V7.
- **Teile trägt die meisten Mehrteiler besser** (Hörner, Augenstiele, Flügel oben, Vierbeiner 16/4 px, Zweihals 15/27 px,
  Giraffe 1,8/1,7 px, Vase Top 2,2 px), **versagt aber** an Krabbe (frei 179°, 205 Durchdringungen), Krake (167°, 657;
  Seite 46 px), Pyramide (76°, 390 Kanten über 20°), Keil (42°), Blatt (33°, 614 Kanten), Seestern (Top 47 px), Ente-Haken
  (Ansatz 158°, 38 Durchdringungen), einfache Form (Front 71 px), Katze (Seite 17 px) → V7.
- **Einteilige Körper verfehlen Front/Top weiter:** Robbe Top 12,5, Vase Top 13,7 (Röhre), Rex Front 7,3, Florians Kegel
  Front 7,3 px, Hals 1:8 Front 32 px (der runde Körper unter dem Hals bleibt in der Front zu schmal) → V4.
- **Netzlinien rauschen** (Stücke/Knicke über 45°/Schleifen je Umriss, nach Vereinfachen auf ½ px): Florians Kegel Front
  4/8/10, Würfel bis 44/80/59, Bleistift Front 29/83/126, Keil 30/45/25 → V2.
- **Käfiggüte** weit vom Ziel (≥ 25°, ≤ 3): an vielen Körpern kleinste Winkel 1–8°, Seitenverhältnisse bis 65 (Röhre,
  Würfel) und 276 (Teile, Rex) → V4/V7.
- **P-Linien auf „Teile“:** Die Treppe liegt 6–67 px neben der gezeigten Linie; dort sucht sie die nächsten Käfigpunkte zur
  ungehobenen Kurve (die Röhre legt die Linie seit V1 erst auf die Haut) → V5/V7.
- **Sprung am Gestenende auf „Teile“:** 4–22 px je Zug (Editor-Szenario D; Grundsatz ≤ 0,5 px); die Röhre springt nicht
  (Szenario A: 0,00 px nach zwölf Zügen, auch nach dem zweiten Bau mit den neu verankerten Enden — die Frage „Nachrutschen
  nach dem Loslassen?“ aus V0 ist damit beantwortet: nein) → V4 (Zug ohne Neubau mit eingefrorenen Normalen) und V7.
- **Teil kommt und geht** (Szenario D, Knoten oben vorn auf der Kugel herausgezogen): erkannt nach 10 Zügen (≈ 230 px),
  geht beim Zurückziehen zwei Züge später, als es kam; der Baum nimmt das Teil in den Rumpfstreifen (ein Streifen) →
  beobachten (V7).
- **Florians Ablauf gegen frisch:** Ente Front 2,8 → 14,3 px (eingefrorene Ringe der Kugel), Würfel frei 150 → 172°,
  Pyramide Top 7,3 → 11,9 px; umgekehrt hilft der Ablauf dem Keil (frisch frei 179°, im Ablauf 18°) → V4/V6.
- **Kurze Querlinie am Kegel** (45 px) deckt weder eine ganze Reihe noch einen ganzen Ring: jetzt ehrlich Treppe (30 px
  neben der Linie) statt „Reihe“ ohne Kante → V5 (Einordnen nach dem Winkel, mehr Ringe mit Loops).
- **Zufallsreihe (200 Züge, 10–40 px, Florians Ablauf):** Röhre springt am Gestenende 8 von 114 Mal über 0,5 px (bis
  21,5 px), Teile 85 von 86 Mal (Median 16,5 px, bis 65 px) → V4/V7. 13 Züge klappen einen sauberen Körper neu um (Röhre 7:
  Langhals, Pilz, Überhang, Hals 1:8, Keil, Seestern, Flügel oben; Teile 6: Rex zweimal, Ente-Haken, Hammerhai, Seeschlange,
  Rochen) → V4/V7.
- **Kopplung erzeugt Selbstschnitte** in einem gekoppelten Blatt (4 von 200 Zügen; Top von Überhang, Seestern, Pyramide,
  Hammerhai: 2–8 Kreuzungen, die niemand gezeichnet hat); 9 weitere Züge kreuzten die eigene Linie (das Blatt meldet es
  seit V0) → V3 (Kopplung ohne Kreuzungen, Rückfall auf die nächste kreuzungsfreie Lage).
- **In V1 behoben** (je Test vorher rot): Querlinien, die eine Reihe nur auf einem Bruchteil eines Ringabstands berührten,
  wurden „Reihe“ ohne scharfe Kante (Kegel, Vierbeiner, Krake); Stiftlinien mit wenigen Knoten zogen den Körper auf die
  Sehne zwischen den Knoten (Kugel mit zwei gekreuzten Linien Δ 10,7 → 1,3 px, im Editor Falten 111° → 16°); die
  Durchdringungsprüfung lief an dünnen, langen Körpern über die Höchstgröße einer Menge.

## Befunde aus V2 „Saubere Linien“ (20.10. nachts, eigene Messungen)

**Florian (20.10. nachts): „Ich finde die Linien wirken immer noch sehr sehr wild. Da müssen wir auf jeden Fall nochmal ran,
aber vorerst weiter mit V3.“** V2 ist nicht abgenommen. Offen: welche Linien er meint (Umrisslinien in fremden Blättern,
innere Konturen, Faltenlinien, Teile-Umrisse, Linien auf faltenden Körpern) — an seinem Editor-Bild klären und die Messung
daran ausrichten; sie zählt Knicke und Schleifen, das genügt offenbar nicht (Kandidaten: viele kurze Stücke, Sprünge an
Teilgrenzen, Linien über Falten der Röhre, Wellen unter 45°, Dichte der Linien).

Gemessen an der ganzen Extremreihe in Florians Ablauf (alter und neuer Liniennetz-Code auf denselben Netzen); Tabelle und
Bögen auf der Planseite 20.10., „Stand V2“. Je Punkt der Schritt, der ihn angeht.
- **Tor V2 an 15 von 78 Fällen verfehlt** (Test `it.fails` in `extremreihe.extrem.ts`, der Stand von 63 sauberen Fällen ist
  gesichert):
  - **Knicke ohne gezeichnete Ecke und ohne Falte des Körpers** (18 an 10 Fällen): Zweihals Röhre Front 4, Ente Röhre und
    Teile Front je 2, Vierbeiner Röhre Front 2, Hammerhai Teile Top 2, Hörner Teile Top 2, Überhang Teile Front 1, Flügel
    oben Teile Top 1, Hörner und Augenstiele Röhre Seite je 1. Meist dort, wo Zeichnung und Körper weit auseinander liegen
    (die Silhouette macht eine Ecke, die die Zeichnung nicht hat, z. B. der Hammerkopf im Top oder ein Teil, das die Röhre
    nicht baut) oder an winzigen Spitzen der Silhouette → V4 (Umrisse binden, dann gibt es diese Ecken nicht mehr), V7.
  - **Linie 0,5–0,85 px neben der Silhouette** (7 Fälle): Fisch Röhre Seite 0,85, Vierbeiner Röhre Top 0,64, Sichel Röhre
    Seite 0,61, Tigerkopf Röhre Seite 0,56, Krake Teile Seite 0,54, Vase und Augenstiele Röhre 0,50 — Kerben und Spitzen der
    Silhouette unter 2 px, meist wo die Röhre selbst faltet → V4/V7; feiner abtasten wäre teurer als das Tor wert.
- **58 Knicke auf Falten des Körpers** (Würfel, Vierbeiner, Krake, Augenstiele u. a., fast alle Röhre): Die Silhouette
  knickt dort selbst, die Linie folgt ihr richtig → V4 (Kappen nach Endform) und V7.
- **Teile mit seitlichen Paaren sind nicht spiegelgleich:** Vierbeiner bis 3,5 px, Fisch 1,4 px, Ente 0,3 px zwischen
  linker und rechter Seite (gemessen: Spiegelbild jedes 7. Punkts gegen die Fläche). Die Umrisslinien suchen deshalb an
  Teilen die zweite Hälfte eigens (kostet die doppelte Zeit für Front und Top) → V7 (Paare einmal bauen und spiegeln).
- **Liniennetz an 7 Fällen 31–36 ms** (Tor 30 ms; Median 18 ms; vorher bis 48 ms): an Teilen mit großen Netzen (Fisch,
  Seeschlange, Seestern, Augenstiele 32–36 ms) kosten allein die drei Strahlraster 10–12 ms, die eigens gesuchte zweite
  Hälfte 3–4 ms → Raster je Bau einmal für Liniennetz, Δ und Saum teilen; mit spiegelgleichen Teilen (V7) halbiert sich die
  Linienarbeit.
- **Der oberste Front-Knoten folgt beim Ziehen im Seitenblatt nur zur Hälfte** (12 px Zeiger → 5 px): Die Kopplung der
  Außenmaße (S1c) bremst ihn, der Ring zeigt das richtig an (er folgt dem Knoten). Gewöhnliche Knoten folgen genau → V3
  (G/S/R und Kopplung).
- **Die Schleifen-Zählung aus V1 war zu grob:** Sie zählte jede kurze Kreuzung im Bild, also auch zwei Stücke einer glatten
  3D-Linie, die in einer fremden Ansicht übereinanderliegen (Hin- und Rückweg an der breitesten Stelle). So gezählt hatte
  der alte Code 2932 Schleifen, nach der neuen Zählung (die Linie berührt sich auch in der Tiefe) 4. Die wilden Linien waren
  Zacken in der Tiefe (1968 Knicke → 18).
- **In V2 behoben** (je Test vorher rot): die rauschenden Umrisslinien der fremden Blätter (Zickzack in flachen Bändern),
  Ringe fremder Knoten bis 10,6 px neben ihrer Linie (jetzt ≤ 0,5 px).


## Befunde aus V3 „G/S/R und proportionales Bearbeiten“ (20.10. nachts, eigene Befunde)

- **Spantpunkte unter deckungsgleichen Front-Knoten sind nicht greifbar** (altes Verhalten seit 12.10.): Wo ein Spant
  denselben Querschnitt hat wie die Front (an der breitesten Stelle, an der Startkugel überall), liegen seine Punkte genau
  unter den Front-Knoten, und der Klick trifft den Umriss. Weg: ⌥-Klick schaltet auch Spantpunkte durch, oder V6 (Loops
  ersetzen die Spanten). Das Prüfskript `proportional.mjs` sucht deshalb eine Stelle, an der ein Spantpunkt frei liegt.
- **`e2e/spanten.spec.ts` ist rot, unabhängig von V3:** Zeile 75 erwartet auf der Bühne die Beschriftung „Versuch: Kanten im
  Käfig“, Zeile 76 eine neue Eckenzahl nach dem ersten Spant — beides gilt nur in der alten Versuchs-Bauweise, seit der Kern
  Standard ist (14.10.) nicht mehr (bekannt: `apps/editor/CLAUDE.md`, Arbeitsweise — die Versuchs-Specs setzen die
  Loft-Bauweise voraus). Bis Zeile 73 (S ohne Auswahl setzt einen Spant, die Front zeigt ihn) läuft er. Nachziehen, wenn V6
  die Spanten durch Loops ersetzt (der Test muss dann ohnehin neu).
- Behoben: Der Einflussradius hing an der Höhe des während der Operation neu gebauten Netzes (Rad ×1,103 statt ×1,1) — die
  Körperhöhe wird jetzt am Anfang festgehalten.
- Gemessen ist die Zeit je Mausbewegung für Rechnung und Store (≤ 6,4 ms); das Zeichnen der Blätter und der schnelle Zug im
  Worker sind nicht enthalten. Fokusverlust ist mit einem künstlichen `blur` geprüft, nicht mit einem echten App-Wechsel.
- G/S/R in Posen fehlen (G und S behalten dort ihre alte Belegung, R gibt einen Hinweis) — mit B6/V6.

## Befunde aus V4 „Exakte Umrisse“ (20.10. nachts, Beweis angehalten)

- **Frontlinie nach drei Fehlanläufen angehalten** (Planseite „V4 — Beweis angehalten“): Ringstücke tragen nur, wo die
  breiteste Stelle auf einem Ring liegt; frei gewählte äußerste Punkte schaukeln sich auf. Ursache: Die Röhre hat keine
  Käfigkurve an der Front-Silhouette (zwischen Ringen, auf der Kappe, an kastigen Enden). Entscheidung A (Ring an die breiteste
  Stelle über die Loop-Maschine aus V6, Kappen nach Endform) oder B (Löser entlang der Normalen) steht aus.
- **Breitenlinie zerknittert Kappen** an kastigen, stehenden oder eingekerbten Enden (Tiger, Vase, einfache Form; Falten bis
  177°); an runden Enden trägt sie (Robbe Top 12,5 → 1,2 px, Kegel 2,6 → 0,6).
- Ohne gebundene Front wird die Front einfacher Körper etwas schlechter (Kugel 0,2 → 1,7 px), weil die Breitenpunkte und das
  Berühren von heute im exakten Weg wegfallen.
- Ungleichung mit hart gebundenen Einzelpunkten (1e5) destabilisiert den Ausgleich; braucht entweder Bindung entlang der
  Normalen (einseitig) oder Kurven im Käfig, an denen sie greift.
- Gewichte: Mit 1000 erreicht eine Lagebedingung ihr Ziel nur zu 90 % (Glättung 30, Naht 64 halten dagegen); 1e5 nötig.

## Befunde aus V4 zweiter Weg „Querschnitt aus der Sichthülle“ (20./21.10. nachts, gebaut, Abnahme offen)

- **Δ ≤ 0,5 px nicht erreicht** (außer Kugel, Ei): Die Vorlagen liegen auf der Hülle, die Grenzfläche wölbt sich zwischen den
  Käfigpunkten hinaus — längs der Ringe und zwischen ihnen etwa gleich (Robbe 3,3 bzw. 2,9 px über der Front an der Flanke;
  Tiger 5,4 px an der Kerbe Schnauze/Kopf, dort gleiten die Grenzlagen um 2–3 px in x, und das Top ist steil). Bindungen,
  höhere Gewichte und ein angehobener Glättungsbezug kosten Glätte (gemessen, Planseite) — der nächste Weg ist eine dichte
  Anpassung an die Vorlagen (feine Punkte längs der Ringe), keine stärkere Bindung.
- **Ecken-Körper schlechter** (Keil, Pilz, Blatt, Hammerhai, Seestern): Jeder Ring verteilt seine Reihen nach eigener
  Bogenlänge; wo sich das Seitenverhältnis längs des Körpers ändert, rutschen Reihen von Deckflächen auf Wände. Der Reihenplan
  hält Breitenlinie und gezeichnete Ecken fest; Schultern kastiger Rundungen als Anker helfen Kegel/Keil, schaden Hammerhai und
  Seestern (Schulter und Ecke nur in manchen Ringen) — abgeschaltet.
- **Faltenmaß übertreibt bei Mehrteilern** (Vierbeiner 163°, Fisch 170°, Krake 179°: einzelne scharfe Stellen am Übergang
  Bein/Bauch; im Bild glatter als heute). Für Urteile immer die Kontaktbögen ansehen.
- Tiger: zwei Ringe an derselben Station vorn an der Kastenschnauze (gewollt: Querfalte), dort 37° heute wie neu.
- Zug-Zeit mit dem Schalter nicht gemessen (der schnelle Weg nutzt dieselben Vorlagen, kein Sprung am Gestenende).

## Befunde aus V5 „Linien exakt“ (21.10., gebaut, Abnahme offen)

- **Tore nicht erreicht** (`it.fails` in `kern/linienSchleifen.test.ts`): jede Linie ≤ 0,3 px in ihrer Zeichenansicht (gemessen
  0,4–2,0 px: am größten an den Enden — die Falte endet an einem Käfigpunkt, dort gilt die glatte Regel — und zwischen weit
  stehenden Ringen am Hals); Haut an der Linie ≤ 0,5 px (Robbe 1,4, Kegel 1,0, Kugel mit Kreuz 0,7 px).
- ~~Schräge Linien bleiben Treppe~~ (21.10. nachts behoben für Linien, die nirgends längs einer Sprosse laufen: verzogene Reihe,
  über die Breitenlinie eingerastet). Offen: schräge Querlinien neben Ecken-Ringen (Krake) bleiben Treppe; echte Diagonalen
  über viele Reihen bräuchten Pole im Käfig (Plan 3.3).
- **Kreuzungen** sind Catmull–Clark-Ecken (vier scharfe Kanten). Aussetzen oder halbscharf an der Kreuzung ändert nichts
  (gemessen); die Haut liegt dank „Form zuerst“ trotzdem bei der Form (Kugel 0,7 px).
- **Zeit:** Zug mit Linien 42–57 ms (Form ohne Linien und Körper mit Linien je ein Löser), Bau 320–400 ms (zwei Bauten).
- **Würfel, Seeschlange, Fisch, Krake** sind schon ohne Linien kaputt (Falten 170–180°); ihre Linienwerte sagen wenig.
- Härte als Rundungsbreite (Plan 3.4), Grat (`Kante.tiefe`) und Linien auf „Teile“ fehlen noch.

## Befunde aus V6 „Loops“, Kern (21.10., gebaut, Abnahme offen)

- **Tor nicht erreicht** (`it.fails` in `kern/schleifen.test.ts`): Einfügen formneutral (Haut ≤ 0,1 px). Abseits des Loops
  (weiter als drei Ringe) bleibt die Haut ≤ 0,25 px, Kugel und Ei ändern sich überall ≤ 0,25 px; am Loop selbst rückt die
  Haut aber bis 1,8 px (heute) bzw. 4,5 px (Hülle, Langhals am Halsansatz) — zur Hülle hin (Hüllschnitt am Loop 3,9 → 1,0 px):
  Der Loop gibt Auflösung, wo die eingefrorene Ringverteilung der Startkugel dem umgeformten Körper Ringe fehlen lässt.
  Wege für Florians Urteil: so lassen (Loop = Auflösung), oder „neutral einfügen“ (der Loop merkt sich die alte Haut als
  Abweichung, bis man ihn auf die Hülle legt).
- **Vorher übersehen, jetzt behoben (je Test vorher rot):** Ein formneutral eingefügter Knoten — Stift, Kopplung, Loop —
  änderte den Körper: Langhals 1,8 px (eingefrorene Enden der Wirbelsäule galten nur bei gleicher Knotenzahl; an runden
  Spitzen kippte die Wahl der vordersten Probe), Tigerkopf 1,2 px und Schlange/Sichel/Augenstiele (eine Ecke an Ring 0 sprang
  beim Nachführen auf Ring 1 — **zwei Ringe lagen aufeinander**, Falten bis 180°), Vase 3,4 px (harte 95-%-Schwelle der
  Breitenpunkte), Ei 1,3 px (Breitenlinie sprang auf die Nachbarstufe ihres Rasters), Breiten aus Top/Front je Segment
  abgetastet. Rest ≤ 0,5 px (meist ≤ 0,2). Ein Knoten in der Front ändert mit Spanten deren Punktstruktur — das ist Absicht
  (Front und Spanten teilen die Knoten), nicht geprüft.
- **Grundzahlen nachgezogen** (Extremreihe, Röhre): Schlange freie Falten 178 → 4°, Sichel 180 → 25°, Augenstiele 114 → 78°
  (doppelte Ringe weg); schlechter: Sichel Durchdringungen 154 → 248 und Front 13,7 → 14,2 px, Schlange Kappe 170 → 178°,
  Augenstiele 1 → 4 Knicke; Flügel oben +6 Durchdringungen (von 416).
- Loop-Ringe nur auf der Röhre ohne Maul und Beine (Maul- und Beinbau rechnen mit 24 Ringen); kommen Maul oder Beine dazu,
  muss der Editor die Ringe herausnehmen (`ringLoeschen`) — noch nicht gebaut (⌘R zeigt dort nur einen Hinweis).
- **V6.3:** Der Kern selbst lässt einen allein stark skalierten Loop unter dichten Nachbarn knicken (Biegung am Langhals-Ansatz,
  175°); der Editor verhindert es mit dem Mindest-Einfluss (dreifache Verschiebung, glatt längs des Umrisses). In den Blättern
  (V3 auf den Loop-Knoten) gilt der Mindest-Einfluss nicht — dort kann man Knoten wie in Illustrator frei setzen.
- Loops auf „Teile“ (Baum), mit Maul oder Beinen: offen (V7).

## CI: nicht nachstellbare Fehler alter Versuchstests (20.10. nachts)

- Zwei Tests der alten Versuchsfläche S0 (Bauweise „bisher“, nicht der Kern) waren je einmal **nur auf CI** rot, bei
  unverändertem Code dazwischen grün (Lauf zu 7ab1bf0a):
  - `packages/shape/src/versuch/flaechenlinie.test.ts` „Seitenlinie … folgt dem Verbreitern“: 46 von 49 Lücken (f7f9e842,
    Node 24.21); schon einmal so aufgefallen (Kommentar im Test).
  - `apps/editor/src/kanten/kantenFlaeche.test.ts` „folgt der Form …“: −0,168 statt −0,15 (4ed99f26, Node 24.22) — derselbe
    Befund wie in V0.
- Geprüft: lokal 0 von 8 Läufen rot (mit parallelen schweren Tests); die Fläche S0 bleibt gleich, wenn man die Eingabe um
  1e-15 bis 1e-5 verwackelt; kein Merker, keine Zufallszahl, keine zeitabhängige Verzweigung auf dem Weg; Node-Version
  erklärt es nicht (grün und rot mit 24.22). Ursache unbekannt; Code nicht geändert (keine blinde Wiederholung). Tritt es
  wieder auf: den Lauf auf CI mit Protokoll der Rasterwerte (Zellen, Treffer je Probe) wiederholen (21.10. so umgesetzt, s. u.).
- 21.10. früh: „Seitenlinie … folgt dem Verbreitern“ erstmals **lokal** rot, in einem vollen Lauf unter Last (98 Dateien
  parallel); einzeln dreimal grün, der nächste volle Lauf grün. Also kein Plattform-, sondern ein Last-Effekt — der Test hängt
  vermutlich an einer Zeitschranke oder einem zeitbegrenzten Suchschritt. Nicht geändert; beim nächsten Auftreten die
  Zeitabhängigkeit im Versuch S0 suchen.
- 21.10. früh, wieder auf CI rot (Lauf zu 0367771b, wieder genau 46 von 49 Lücken, dieselben Front-Knoten). Gesucht und
  **keine Zeitabhängigkeit gefunden**: Der ganze Weg (`flaecheS0` → `tigerKaefig`/`ringKontext`/`vorlageBei`/`spantAbtasten`/
  `anZielAnpassen`/`unterteilenMehrfach`; `rasterAlle`/`strahlRaster`; `linie3d`/`aufFlaeche`/`treffer`) hat keine Zeit,
  keinen Zufall, keine Wiederholung bis zu einer Frist; die Merker (WeakMap) hängen an frisch erzeugten Objekten. Lokal 16
  parallele Läufe grün. Weil jede Probe für sich gesucht wird (ohne Bezug), sind 46 Lücken kein Folgefehler, sondern eine
  falsche Fläche oder ein falsches Raster in diesem Lauf. Übrig bleibt eine lastabhängige Ursache unterhalb unseres Codes
  (Zeitpunkt der Optimierung im Hintergrund). **Jetzt:** Der Test wiederholt sich bis zu zweimal (das Tor bleibt 0 Lücken) und
  schreibt beim Auftreten einen Befund ins Protokoll — Treffer mit und ohne Raster an der ersten Lücke, NaN in der Fläche,
  Rasterwerte, dieselbe Linie noch einmal und die Fläche neu im selben Prozess. Damit ist beim nächsten Mal sichtbar, ob
  Fläche, Raster oder Linie abweicht und ob es im Prozess wiederholbar ist.
- [x] **22.10.: Ursache gefunden und behoben — ein Fehler der JavaScript-Maschine V8, ausgelöst durch die Form von
  `strahlRaster`.** Wieder rot auf CI (Lauf zu 772b5c27, nur Doku geändert): T2 „Raster = Suche über alle Dreiecke“ (0 statt 2
  Treffer) und „Ziehen am Tiger“ (99,9 px); im selben Prozess baute T3 dieselbe Tiger-Fläche danach richtig.
  - **Nachgestellt:** S0 und Raster mehrmals im selben Prozess, 16–24 Prozesse gleichzeitig (Mac, Node 25.8). In 2–5 von 72
    bzw. 96 Prozessen kam ein Raster falsch zurück; die Fläche war jedes Mal bitgleich zur ersten Runde, u, v, t und die
    Zelllisten stimmten, nur **Ursprung und Zellgröße (x0, y0, zb, zh) gehörten zu einer anderen Ansicht** (Seite mit den
    Grenzen der Front: z statt x; einmal Seite und Front mit denen des Tops). `treffer` sucht dann in falschen Zellen →
    Lücken, falsche Treffer — genau die Bilder vom 20./21.10. und wohl auch `kantenFlaeche` (−0,168 statt −0,15), das dasselbe
    Raster nutzt.
  - **Eingegrenzt mit Schaltern der Maschine** (je 72 Prozesse, Standard 2): ohne Maglev 0, ohne Turbofan 0, ohne On-Stack-
    Replacement 0, ohne paralleles OSR 0, ohne paralleles Übersetzen 0. Mit `let` statt `const` ebenso falsch (5 von 96). Lesart:
    Wird eine lange Schleife mitten im Lauf von Maglev nach Turbofan übersetzt (im Hintergrund) und tritt danach ein *anderer*
    Aufruf in diesen Code ein, liest er den Funktionskontext des Aufrufs, für den übersetzt wurde. Im Kontext lagen x0, y0, zb,
    zh, weil die inneren Closures `spalte`/`zeile` sie fingen. Reine Raster-Schleifen ohne den Bau der Fläche dazwischen lösten
    es nicht aus (auch nicht mit `--always-osr`, `--stress-maglev`, Pausen) — es braucht Last und Hintergrund-Übersetzungen.
  - **Behoben:** `rasterZelle` außerhalb von `strahlRaster` (dieselbe Rechnung, bitgleich), die Funktion hält keine Variablen
    mehr in Closures. Gegenprobe unter gleicher Last (je Durchgang 12 Prozesse alt und 12 neu zugleich, 8 Durchgänge): **alt 5
    von 96, neu 0 von 96** (wäre die Korrektur wirkungslos, läge die Chance auf null Fehler unter 1 %). Prüfskript
    `apps/editor/scripts/pruefen/raster-gleichlauf.ts` (viele Prozesse, Fläche und Raster gegen Runde 0 und die wahren Grenzen);
    T2 prüft Ursprung und Zellgröße jetzt direkt. Die Wiederholung in T1 (`retry: 2`) ist entfernt, der Befund bleibt.
  - **Ehrlich offen:** Ein Test, der den Fehler ohne Korrektur sicher rot zeigt, war nicht zu bauen (er tritt nur unter Last
    auf); Beleg ist die Gegenprobe. `strahlRaster` ist kein reiner Versuch: Der Kern nutzt es für das Liniennetz
    (`netzSicht`), die Umrisslinien und die Zahnprüfung, der Editor für das Netz-Raster (`netz/netzRaster.ts`), die
    Kantenlinien und die Maulfläche — seltene, nicht wiederholbare Fehlgriffe dort sind damit wahrscheinlich ebenfalls weg.
  - **Gefahr anderswo:** Dieselbe Form — eine Funktion mit Closures über ihre lokalen Variablen, einer langen Schleife und
    vielen Aufrufen kurz hintereinander — kann denselben Fehler der Maschine treffen. Weg: eine Gleichlauf-Prüfung über die
    Hauptwege des Kerns (gleicher Bau mehrmals in einem Prozess, viele Prozesse, bitgleich), dann die gefundenen Stellen
    umbauen (Hilfsfunktionen nach außen, Werte als Argumente).

## Befunde aus der Messung „Spielstufe“ (02.11., eigene Messungen; `docs/progress/editor/spielstufe-2026-11-02.md`)

- [ ] **Käfigfehler, die Stufe 3 verdeckt:** Auf Stufe 1 knicken Nachbarflächen abseits aller gezeichneten Falten bis 133°
  (Rex, erstes Ringband an der Schnauze; Stufe 3 dort 14°), Langhals 53° (oben am Hals), Kegel 54° (Ecke des
  Dreiecks-Querschnitts ohne Falte), Teile 61–89°; auf der Grenzlage Rex 36°, Tigerkopf 30°. Mit „Käfig = Spielnetz“ wird
  die Käfiggüte ein Tor (Prüfplan P0a/P1/P3: abseits der Falten 95 % ≤ 20°, max ≤ 30°).
- [ ] **Mit Maul gibt es keine Stufe 1:** Der Einsatz auf K2 hat als Stufe 0 schon 18 928 (Rex) bzw. 25 958 (Kugel) Dreiecke
  (Budget 8 000) → Budget-Tor in P2 (Maulfeld ≤ 300 Käfigflächen, Wesen ≤ 1 000).
- [ ] **Flache Flanken kommen aus den gezeichneten Querschnitten, nicht aus „berühren mittel“:** Flachband (Normale < 5° zur
  Blickrichtung) Rex Seite 18,9 %, Robbe 21,8 %, Kegel 34,4 % (gezeichnet), Vierbeiner Front 31 % gegen 8,7 % an der Kugel;
  mittel | aus | rund unterscheiden sich um ≤ 3,2 Punkte. Die Erklärung der wilden Linien (Recherche 21.10., 3.6) gilt mit
  dieser Korrektur; Folge: runde Füllung statt Front-Lappen und Umriss als geplante Linie (P1).
- [ ] **Messfalle Δ:** `blattAbweichungen` ist an exakt achsparallelen Flächen auf 0,2 px empfindlich (Tigerkopf Front 2,29
  gegen 2,09 im Editor): `umrissStuecke` teilt Flächen nach dem Vorzeichen der Newell-Komponente, die bei Kastenflächen mit
  Rundungsfehlern kippt. Bei Toren um 0,5 px an Kästen eine Toleranz für die Zuordnung einbauen (P1).
- [ ] **Stufe 1 braucht Grenzlagen:** rohe Catmull-Clark-Lagen verschieben den Umriss um 0,9–4,8 px (Mittel 0,5–0,8), die
  Grenzlage (Halstead-Maske derselben Stufe) um 0,4–2,8 (Mittel 0,1–0,6) — eine Maske je Käfigpunkt beim Backen (P0a).

## Befunde aus P0a „Spielstufe im Editor“ (03.11., eigene Messungen; `packages/shape/src/kern/spielstufe.test.ts`)

Gebaut (Prüfplan P0a): Bauplan-Option `stufen` (Anzeige-Stufe; 1 = Spielnetz) und `stufenNormalen` (grenze | roh) im Kern
(`kern/spielstufe.ts`: Eckenwerte der Stufe 3 auf die Ecken der Stufe 1 umsortiert — Punkte auf der Grenzfläche, Normalen der
glatten Fläche an denselben Punkten, Deskriptoren, Atlas, Ruhelage; ohne Option bitgleich), Umschalter „Spiel“ auf der Bühne
und in der Tafel Spiel (Dreiecke gegen 8 000, Umriss Stufe 1 ↔ 3 in Gerätepixeln bei 300 px Höhe), Tore als Tests.
- [ ] **Umriss-Tor (≤ 1 Gerätepixel bei 300 px Höhe) an fünf von sieben Röhren-Körpern verfehlt:** Kugel 0,7 und Ei 0,8 ✓;
  Rex 2,8 (Seite; Höhe nur 0,356 Kacheln → Faktor 1,8), Langhals 1,1, Robbe 1,5, Tigerkopf 3,0 (Front), Kegel 3,0 (Front).
  Ursache: 16 Punkte je Ring und 24 Ringe sind für Stufe 1 bei Spielgröße zu grob (Sagitta); Kasten und Kegel in der Front am
  schlechtesten. Eingabe für die Dichteregel des neuen Baus (Gegenprüfung 3.6: ≥ 24 Punkte je Rumpfring, Ringe nach Krümmung
  auch aus Front und Top). `it.fails`.
- [ ] **Facetten-Tor (abseits gezeichneter Falten 95 % ≤ 12°, max ≤ 25°) an denselben fünf verfehlt:** Kugel 11,2°/11,6°, Ei
  11,9°/15,9° ✓; Rex 22°/88°, Langhals 22°/45°, Robbe 23°/53°, Tigerkopf 17°/74°, Kegel 20°/47° (Grenzlage). Das sind die
  Käfigfehler aus der Messung vom 02.11. (Rex: erstes Ringband an der Schnauze), die Stufe 3 verdeckt. `it.fails`.
- [ ] **Pose-Tor am Rex mit Maul verfehlt** (gemalte Augen; Höhe 0,356): Fressen 50 % Umriss S/F/T 1,5 / 1,6 / 2,1, 100 %
  1,7 / 1,7 / 2,1 Gerätepixel; 4 540 Dreiecke auf Stufe 1 (Körper samt Lippe, Tasche, Rachen des alten Maulbaus). Gleiche
  Ursache wie am Körper. `it.fails`.
- [ ] **Spielstufe mit Augapfel-Höhle oder Rundmaul noch nicht:** Der Aufsatz ändert die feinen Flächen (`hoehlenFein`), die
  Umsortierung gilt nur für die reine Unterteilung → Stufe 3 bleibt, das Spiel-Feld nennt den Grund (Library-Rex hat
  Augäpfel). Weg: Höhle auf Stufe 1 ebenfalls als Aufsatz bauen (`hoehlenTopologie` mit Stufenzahl 1) — oder im neuen Bau die
  Augenschleife als Linie des Netzes (P3).
- [ ] **Werkzeuge in der Spielstufe aus** (Treffer null): Anzeige, kein Pinsel, keine Augen per Klick. Für das Spiel-Bild
  gewollt; die Tafel sagt es.
- [x] Umschalten baut den Käfig nicht neu (gleicher Stand, Ableitung 0 ms): Rex erstes Mal 59 ms (mit Umrissvergleich),
  danach 15 ms (Kern); Budget-Tor an allen sieben Röhren-Körpern erreicht (3 200 Dreiecke), Teile 3 344–6 288.
- [ ] **Cel-Tor (≤ 1 % der Wesenpixel wechseln die Farbstufe zwischen Stufe 1 und 3) an dünnen Stellen knapp verfehlt:**
  Langhals 45° 2,0 %, Ente 45° 1,0 %, offenes Rex-Maul 45° 1,0 % (sonst 0,2–0,7 %; Bühnengröße, Earle-Look). Die Cel-Grenzen
  laufen dort längs über wenige Käfigpunkte (Hals, Lippe); mehr Punkte je Ring an dünnen Teilen (Dichteregel).
- [ ] **Umschalt-Tor (≤ 100 ms) im Editor beim ersten Mal verfehlt:** an 94–165 ms (Worker-Umlauf samt Umrissvergleich;
  Fisch 165, Ente 157, Tigerkopf 144), roh und zurück 33–89 ms. Weg: den Umrissvergleich nach dem Netz als eigenen
  Worker-Auftrag nachreichen (wie die Zahnprüfung), dann zählt nur der Umlauf.
- [ ] **Library-Rex mit Augapfel-Höhle hat auf Stufe 3 76 736 Dreiecke** (alter Maulbau mit Lippe, Tasche, Rachen, Höhlen);
  ohne Höhle 72 640 auf Stufe 3 → 4 540 auf Stufe 1. Die Spielstufe greift dort erst mit der Höhle auf Stufe 1 (oben).

## Befunde aus P1 Tag 1 „Umrissschleifen geplant“ (03.11., eigene Messungen; `packages/shape/src/kern/umrissPlan.test.ts`)

Gebaut (Prüfplan P1, Tag 1): `kern/umrissPlan.ts` (Schleifen je Ansicht aus den drei Zeichnungen: Tiefe aus der Sichthülle, kleinste
Biegung in den Intervallen, T-Stöße aus konkaven Ecken, Flächenbaum über Sehnen, verdeckte Fortsetzung und sichtbare
Schlusskontur als Vorschläge, SVG), Züge `plan-*` im Liniennetz, Chip „umrisse geplant“, Haken `__editor.umrissPlan/umrissSvg`.
- [ ] **Tiefe aus Vereinigungs-Intervallen:** Front und Top geben die Vereinigung aller Teile (Hals über dem Rumpf = ein
  Intervall vom Bauch bis zum Kopf); die Biegeminimierung legt den Hals in die Mitte (Ente Top: Hals 54–63 px, Rumpf 66–86).
  Die Zerlegung der anderen Ansichten (Seite zuerst) müsste die Intervalle je Teil liefern (P1 Tag 2–3 oder P3).
- [ ] **Tor (b) an der Robbe von oben wörtlich verfehlt:** [1 0 0 3] am Anstieg zum Kopf; keine konstante Tiefe passt in die
  17–50 px engen Intervalle, die Zeichnung erzwingt die Welle. Der Test lässt genau einen solchen Fall zu (`erzwungen ≤ 1`).
- [ ] **Jede konkave Ecke gilt als T-Stoß** (Herz von oben → zwei Teile). Florians Urteil an eigenen Wesen; weiche Kerben
  ohne Ecke bleiben ein Teil.
- [ ] **Schlusskontur nur interpoliert**, nicht auf der Haut des anderen Teils; die Kragenlinie (Schnitt zweier Teile) ist
  keine eigene Linie. Tag 2–3 (Käfigring).
- [ ] **Keine ganz verdeckten Schleifen** (Pilz-Stiel von oben, „Kragen-Schleife unter dem Hut“ des Prüfplans): nur Teile,
  die die Zeichnung berühren.
- [ ] **Widerspruch an Scheitelproben** trotz 2 px Innen-Abtastung: Langhals Seite 4,2 px, Ente Seite 2,7, Rex Front 6,6
  (Probe liegt in der anderen Ansicht außerhalb).
- [ ] **Umschalten „umrisse geplant“ 0,7–0,9 s:** der Bauschlüssel der Ruhewerte ändert sich, das ganze Liniennetz samt Δ
  wird neu gerechnet (Planung selbst 8–13 ms). Weg: Plan als eigenen Worker-Auftrag nachreichen.
- [x] V2-Linien zum Vergleich gemessen (Robbe, Käfig 20-mal um 0,1 px gewackelt): Median 0,07 px, 90 % 0,48 px, max 26 px,
  20 % der Linienpunkte über 0,2 px — die geplanten Schleifen 0 px.

## Befunde aus P1 Tag 2–3 „Körper aus den Schleifen“ (03.11., eigene Messungen; `packages/shape/src/kern/schleifenKoerper.test.ts`)

Gebaut (Prüfplan P1, Tag 2–3): `kern/schleifenKoerper.ts` (gekoppelter 3n-Löser: Naht, Top- und Front-Schleifen hart über die
nächsten feinen Punkte, Zielform des heutigen Baus als Füllung), Chip „Körper heute | aus den Schleifen (P1)“ in der Tafel
Körper, Front-Tiefe im Planer aus der berührenden Station. Tore nur an der Kugel gehalten; Abbruchkriterium des Prüfplans trifft.
- [ ] **Umgeklappte Flächen an sieben von zehn Körpern** (Robbe 248, Rex 210, Langhals 148, Tigerkopf 81, Vase 58, Würfel 54,
  Pilz 1 511), immer dort, wo die Röhre die Schleife nicht hat: Flossen (Robbe Ring 14–15), Hut-Überhang (Pilz), Brust unter
  dem Hals (Langhals Ring 17–19), Kasten-Kappen (Würfel). Der Plan sieht vor, dass Schleifen Ringe und Teile setzen — das ist
  nicht gebaut (Entscheidung A/B/C auf der Planseite).
- [ ] **Δ Seite wird schlechter** (Robbe 4,0 → 7,7, Rex 1,1 → 4,6, Langhals 1,5 → 4,1 px): Spitzen der Front/Top-Bindung
  stehen in der Seite über.
- [ ] **Δ ≤ 0,5 px** nur Kugel; Ei Front 1,1 (Überstand 1,1), Kegel 2,5/3,9, Vase Top 6,5 (13,8 heute), Robbe Top 5,1 (12,5).
- [ ] **Lösen 400–670 ms** statt ≤ 50 ms: sechs Runden mit je einer Zerlegung des 3n-Systems (Kugel: 387 ms Zerlegungen,
  Hülle 268 305). Wege: Zerlegung je Topologie behalten und nur die Zuordnung als Rang-Korrektur, weniger Runden, oder die
  Bindungen je Achse entkoppeln (dreimal n statt 3n — kostet die Skalarprodukte).
- [ ] **Umschalten im Editor 1,3–1,6 s** (Schleifenkörper + Liniennetz + Δ im selben Bau).
- [ ] **Ohne Zielform keine Form:** Ellipsen-Vorrang je Ring macht die Querschnitte zu Ellipsen (Robbe Front 45 px ohne
  Schleifen); reine Laplace-Glättung lässt sie zu Sehnen einsinken (Volumen −64 %). „Fairness ohne Zielform“ (Plan) trägt die
  Form zwischen den Schleifen nicht — die Front-Zeichnung muss als Zielform hinein (wie heute).
- [ ] **Front-Tiefe im Planer** jetzt aus der berührenden Station: Würfel sinkt an den gerundeten Ecken um 20 px ein
  (Plateau-Mitte springt), Rex/Langhals/Ente/Robbe Front mit 3–7 Krümmungswechseln je Stück (Tor b wörtlich verfehlt,
  `it.fails`); die Top-Schleifen halten (b) weiter (Robbe Top erzwungen).
- [ ] **Tag 4 (Bedienung, Widersprüche) und Tag 5 nicht gebaut** — hängen an der Entscheidung.
- [x] Was trägt: Kugel/Ei sauber, Kegel Front 7,3 → 3,9 px bei besseren Falten (14,1 → 11,6°), Robbe Front 6,2 → 1,0, Vase
  Top 13,8 → 6,5; Naht längs frei (Lehre), schrittweise Ziele (Sprünge über 10 px klappten um), weiche Bindung ferner Proben,
  Zielform als Füllung, Bezugslagen aus `abl.fein` (mit Pinsel-Deltas).

## Befunde aus P1 Tag 2–3, zweiter Anlauf „Schleifen-Käfig“ (03.11., eigene Messungen; `packages/shape/src/kern/schleifenKaefig.test.ts`)

Gebaut nach Florians Klärung („die gelbe Linie sollte die schwarze sein“): `kern/schleifenKaefig.ts` — die drei Umrissschleifen sind
Käfigreihen (Naht, Reihe N/4, ein Ring), Anker beim gleichen Bogenanteil, Inneres = gestreckte Ringschleife, Achse x oder y,
Falten aus Ecken-Knoten, ein Löser; Chip „Schleifen-Käfig (P1)“; Prüfkörper `pruefen/einteiler.ts`. Drei von acht halten alle Tore.
- [ ] **Dichte (16 Punkte je Ring):** Zylinder 0,7/1,0 px an den Randecken, runde Vase 1,3 px an Fuß und Hals, Ei Front 0,4 px
  (an der Grenze), Kegel-Rundungen ohne Ecken-Knoten (r ≈ 10 px bei 80 px je Punkt) — dieselbe Dichteregel wie in P0a; N je
  Ring aus der Zeichnung wählen (Röhre neu mit `roehre(R, N)`, dann Naht-Indizes neu).
- [ ] **Kippung:** Kegel 84 px (Bögen ab hinten 109/327/264 px), die gestreckte Vorlage trägt gekippte Ringe nicht (innen 13 px,
  vordere Kappe 492 Flächen nach innen, Knicke 38°). Weg: Vorlage je Ring aus der transfiniten Füllung des Felds (drei Bögen)
  statt der gestreckten Ringschleife, oder zweite Achse je Feld.
- [ ] **Kappen bei sehr ungleichen Bögen** (Kegel hinten: Quadratringe zwischen 7 px und 23 px vom Scheitel, Ring 0 kippt).
- [ ] **Rundung gegen Falte:** Stift-Würfel 1,7–2,2 px — Ecken-Knoten auf einer Rundung (r 14 px) legen die Falte auf den Scheitel
  der Rundung; die Zeichnung ist dort 4 px breiter als die Kante. Regel offen: Härte aus der Strichbreite (Florian) statt aus dem
  Knoten.
- [ ] **Messerkanten:** Vase aus der Kugel (Front = Ei, oben spitz; Rand 0,25 breit) — Front 6,3 px, Flachband 18 %; die
  Zeichnung verlangt eine Klinge, die Kappe kann sie nicht (Prüfkörper, keine echte Vase).
- [ ] **Bau ≤ 50 ms verfehlt:** Unterteilung mit neuen Falten ≈ 80 ms je Bau + Lösen ≈ 60 ms (Umschalten im Editor ≈ 1 s mit
  Liniennetz und Δ). Weg: Unterteilung nur bei geänderten Falten neu, Zerlegung je Topologie behalten.
- [ ] **Pinsel-Deltas wirken im Käfig nicht**; die eingefrorenen Stationen des Dokuments sind die des heutigen Baus (die Leiter
  spielt im Käfig keine Rolle). Mit dem Käfig als Standard müssen Pinsel (Relief auf dem Käfig) und „Stationen“ neu gedacht werden.
- [ ] **Kappenringe wackeln ≤ 1 px** (scharfer Würfel, weiches Inneres + Kappenglättung × 10; mit hartem Innerem eben).
- [ ] **Tag 4 (Griffe an den Schleifen, Widersprüche) und Tag 5 (Bögen) nicht gebaut**; Teile an der Naht als nächster Beweis.
- [x] Was trägt: Kugel 0,1, Ei 0,1/0,4/0,1, scharfer Würfel 0,3 px bei Falten 0° und Knicken 0°; Zylinder und runde Vase mit Achse y
  glatt (Knicke ≤ 12°, 0 nach innen) statt diagonaler Sprossen und gefaltetem Hals; Lehren: Tiefe ohne Soll-Zug (Vase/Würfel
  wanderten 80–100 px), Winkelhalbierende an Ecken (Splitter-Intervalle), Sehne statt Ableitung 0 an grifflosen Knoten, eine
  gemeinsame Dichte je Seite (Ringe kreuzten sich), Ecken gebündelt (sonst zwei Ringe je Kante), Extrem-Läufe 3 px.

## Befunde aus P1 Tag 4–5 „Teile an der Naht“ (03.11. nachts, eigene Messungen; `packages/shape/src/kern/schleifenTeile.test.ts`)

Gebaut: `kern/schleifenTeile.ts` — Rumpf als Einteiler aus seinen Schleifen (Seite mit Sehnen, Front/Top aus der Hülle über dem
Rumpfpolygon, ebene Ringe), Kinder als Röhren über ein Fenster (Streifen längs der Naht, auch über die Kappe; Fortsetzung über eine
Kappe), ein Löser. Langhals, Robbe, Ente, Pilz bauen; Seite Pilz 0,7, Langhals 1,3 px; keiner hält alle Tore.
- [ ] **Naht nicht glatt** (Tor 30° auf Stufe 1): Robbe 58°, Ente 41°, Pilz 85° (Flansch des Stiels am Hut: die Schulter blendet vom
  Fensterrand zur Ellipse, der Rand liegt auf dem Hut, die Ellipse darunter). Weg: Fensterrand als eigene Käfigreihe mit
  Silhouettenbedingung und Glättung über die Naht hinweg; Schulter über mehr Ringe oder keine (Rand = erster Ring).
- [ ] **Breite der Kinder aus der Hülle** (Front/Top 4–9 px): Ein Kind hat keine eigene Front-/Top-Schleife, seine Breite ist die
  Hülle am Ringmittelpunkt (im Rumpf: die Randbreite). Weg: Schleifen je Teil auch in Front und Top (Planer liefert sie, wo T-Stöße
  stehen: Langhals-Kopf), Silhouettenbedingung an ihnen; sonst bleibt Florians „Umrisse je Teil“ in Front/Top unerfüllt.
- [ ] **Ente:** S-Hals trägt (Seite 15,5 px nur am Schnabel), aber der Kopf ist flach und der Schnabel fehlt — Ellipsen mit 16–20
  Punkten können keinen Schnabel; die Flügel (seitliches Paar) sind nicht gebaut (Top 58 px). Weg: Paare als Streifen um N/4 mit
  Spiegel; Kopfteile mit eigener Topologie (P2/P3).
- [ ] **Kappen der Kinder:** Mit Cw = 2 Spalten hat die Kappe nur einen Grat (Ladder), der Kopf wird ein Dach mit First; auf Stufe 1
  Knicke bis 178° an den Gratenden. Weg: Fenster mindestens 4 Spalten breit (dann Dichteregel: N je Teil), oder die Kappe aus
  Quadratringen um die Spitze unabhängig vom Fenster.
- [ ] **Dichte je Kind:** Kindringe haben 2·(Rw + Cw) Punkte (Langhals 28, Robbe 32) bei bis zu R Ringen — der Hals des Langhalses
  ist dreimal dichter als der Rumpf (1 046 Punkte statt 402; Bau 1,1 s). Dieselbe Dichteregel wie in P0a, je Teil.
- [ ] **Ebene Ringe nur für Rümpfe mit Kindern:** `eben` setzt Bauch- und Seitenanker bei der Achskoordinate des Rückenankers; an
  Plateaus und senkrechten Stirnflächen (scharfer Würfel, Zylinder) fällt die Zuordnung zusammen (180°). Für Einteiler bleibt die
  Paarung nach Bogenanteil (Kippung Kegel 84 px bleibt offen). Weg: Anker nach Bogenanteil, lokal (± 1,5 Schritte) auf gleiche
  Achskoordinate gezogen.
- [ ] **Messungen:** Die Silhouettenmessung von vorn hält die flache Hutunterseite für eine Kante (Pilz Front 31 px an (0, 0,238));
  „nach innen“ gegen eine Teilachse aus Ringmitten ist bei gekrümmten Kindern unsicher (Fußpunkt, Kappen); „Kippung“ zählt
  Fensterpunkte mit (Langhals 106 px sind die Kappe des Kindes). Maße je Teil und je Zone fehlen.
- [ ] **Baum-Kinder nur auf liegendem Rumpf** (längs : quer ≥ 1,15, Sehne ± 45° zur Achse): Ein Hals auf einem stehenden oder runden
  Rumpf bleibt im Einteiler (Vase). Ein Kopf, der als Fortsetzung mit passendem Ring gebaut werden könnte, wird noch nicht erkannt,
  wenn der Rumpf liegt (Robbe → Streifen über die Kappe mit 58° Naht).
- [ ] **Tag 4 (Griffe an den Schleifen, Widersprüche rot) und Tag 5 (Bögen in Florians Ablauf) weiter nicht gebaut.**
- [x] Was trägt: Langhals Hals + Kopf als eigene Röhre (Seite 1,3 px, Naht 29°, Front/Top 4,5/4,7); Pilz als Hut mit Achse y und Stiel
  als Fortsetzung (Seite 0,7 px, konzentrische Ringe auf der Unterseite, flacher Boden mit Ecken als Grat); bitgleich ohne Option,
  Einteiler unverändert (Test „Einteiler bleiben Einteiler“). Lehren: Rumpfschleifen aus der Hülle über dem Rumpfpolygon, Tiefe
  durch Plateau-Intervalle (sonst springt sie 76 px); die gerade Sehne braucht Zwischenpunkte; Fenster über die Kappe als Reihen
  längs der Naht (λ); Fortsetzung nur mit beiden Enden klar vor der Spitze; die Paarung der Kindseiten als kürzeste monotone
  Zuordnung (Bogenanteil, Höhenschnitt und Innennormale scheitern je an einem Körper); Maße bei mehrteiligen Körpern je Teil.

**Nachtrag 03.11. abends (Naht weich, Hülle als Obergrenze, Hüllenringe, Flügel als Paar, Röhrenende am Ende der Wirbelsäule,
Silhouettenbedingung je Ring; Planseite „Nachtrag 03.11. abends“; `schleifenTeile.test.ts` 10 grün, 12 `it.fails`):**
- [x] **Naht** — Langhals frei 17,9°, Ente 20,2° (Tor 30°); gezeichnete Ecken getrennt gemessen (Ente Brust 36,1°, Langhals
  Rückenansatz 29,5°, Pilz-Stiel ringsum 33,9° — dort zeigt die Zeichnung die Kante).
- [ ] **Robbe: Falte längs der Fensterflanken 37,0°** — der Kopf sitzt als Streifen-Kind über die Brustkappe auf dem Rücken; an den
  Flanken des Fensters (z ± 0,13) steht die Kopfwand mit 37° auf der Rumpfhaut, die Zeichnung zeigt dort in keiner Ansicht eine
  Ecke. Weg: Kopf als Fortsetzung über die Brustkappe (passender Ring), oder Fenster breiter mit Schulter über mehr Ringe.
- [ ] **Breite der Kinder weiter aus der Hülle** (Front/Top: Pilz 0,8/2,0 ✓, Ente 3,7/2,7, Langhals 4,6/2,9, Robbe 7,4/5,4 px;
  Überstand über die Front bis 6,6 px bei der Robbe) — Hülle als Obergrenze und Hüllenringe helfen (Robbe Top 12,5 → 5,4), eine
  eigene Front-/Top-Schleife je Kind fehlt. Weg unverändert: Schleifen je Teil aus den Planer-T-Stößen.
- [x] **Ente:** Flügel als seitliches Paar gebaut (Top 57,7 → 2,7 px; Dicke aus Front bei z und Seite bei x, Klemme der Dicke);
  Kopf mit Schnabel, weil die Röhre am Ende der Wirbelsäule endet (Seite 15,5 → 2,9 px).
- [ ] **Fächer an der inneren Ecke Hals → Kopf (Ente):** 284 Flächen nach innen (0,7 % der Kindfläche; die Röhre heute 782, 8,2 %),
  alle am Fächer der kürzesten Zuordnung an der konkaven Ecke (wie G2b). Weg: Fächer über einen kurzen Bogen um die Ecke
  verteilen (Steigungsschranke der Zuordnung) oder die Ecke als Falte mit eigener Reihe; Kehrtwende Hals → Kopf bleibt offen.
- [ ] **Langhals Rest 1,3 px** (Seite 1,0 px, Rest-Tor 1 px) und **98 Rumpfflächen nach innen (0,3 %, Kappe)** — nicht untersucht.
- [ ] **Gratenden der Kinderkappen** weiter 90–176° auf Stufe 1 (unverändert, siehe „Kappen der Kinder“).
- [x] Lehren: Bänder (Silhouettenbedingung) nie in einer Ansicht, deren Blickrichtung in der Ringebene liegt — w = t × v entartet,
  der Ring faltet; die Röhre eines Naht-Kindes endet, wo die Wirbelsäule endet (nicht am von der Sehne fernsten Punkt); die
  Hüllen-Klemme klemmt die Dicke eines Paars, nicht seine seitliche Lage; Nahtknicke an gezeichneten Ecken sind kein Fehler.

**Nachtrag 03.11. nachts (Endstück; Planseite „Nachtrag 03.11. nachts“; `schleifenTeile.test.ts` 11 grün, 11 `it.fails`):**
- [x] **Robbe: Falte längs der Fensterflanken** — gelöst durch das Endstück (der Kopf ist die Fortsetzung des Röhrenendes: Rand = Ring
  11, die Ringe davor laufen als Kopfringe weiter): Naht 37,0 → 27,6°, Knicke max 141 → 68°, nach innen 0 / 6, Rest 3,6 → 0,2 px,
  Überstand 6,6 → 1,1 px.
- [ ] **Robbe Front/Top 12,4/9,6 px (vorher 7,4/5,4):** die schrägen Kopfringe mit 16 Punkten treffen die Bauchecken (Front ± 0,245/0,082)
  und die breiteste Stelle des Bauchs (Top x −0,045) nicht — zwischen zwei Ringpunkten rundet die Fläche ab. Weg: Dichteregel je Ring
  (Befund aus P0a) oder die Ringschleife als Vorlage der Punktverteilung statt der Ellipse.
- [ ] **„Breite der Kinder aus eigenen Front-/Top-Schleifen“ bringt an den vier Körpern nichts:** Planer-Flächen gibt es nur an
  T-Stößen (Langhals-Kopf, Ente vorderer Teil, Pilz-Stiel), und dort misst die Sichthülle schon die Schleife des Teils. Die
  Front-/Top-Fehler von Langhals (5,3 px) und Ente (3,7 px) liegen am Rumpfboden (Abtastung), nicht an der Kinderbreite. Der Punkt
  „Breite der Kinder weiter aus der Hülle“ oben ist damit kein Weg mehr; offen bleibt die Dichte.
- [ ] **Robbe Naht 27,6° an der Bauchflanke des Rands** (Ring 11 senkrecht, Ring 1 schon gekippt): Übergang über mehr Ringe oder der
  Rand selbst leicht gekippt.
- [x] **Messfehler „nach innen“ am Rumpf behoben:** die Rumpfmitte kommt aus den Rumpfflächen (die ersten nP Punkte liegen beim
  Endstück zum Teil im Kopf; 200 Schwanzflächen zählten falsch). Langhals Rumpf jetzt 86 (0,8 %), Ente 14, Pilz 22, Robbe 0.
- [x] Lehren: Ein dickes, gebogenes Röhrenende verträgt keine kürzeste Zuordnung (Fächer an der Kehle) und keine Röhrenringe als Pfad
  (schräg im ganzen Rumpf); der gleiche Bogenanteil beider Seiten trägt. Hüllenringe durch ein hohles Profil brauchen alle Punkte
  hart (sonst wölbt der Löser 36 px über die Schulter) und keine Silhouettenbänder (widersprechen schrägen Ringen, 35 px). Das
  Endstück braucht den Höhentest (Ring ≤ 1,5 Sehnen), sonst wird jeder Hals am Vorderende zum Endstück (Langhals Top 11,9 px).

**Nachtrag 03.11. spätabends (Dichte je Ring; Planseite „Nachtrag 03.11. spätabends“; `schleifenTeile.test.ts` 13 grün, 9 `it.fails`):**
- [x] **Robbe Front/Top 12,4/9,6 → 4,4/3,3 px, Naht 27,6 → 14,2°, 0 nach innen, Knicke 95 % 19,9° (Glätte hält):** Endstück-Ringe
  aus der Ringvorlage statt Hüllenschnitt-Ellipsen (`vorlagenRing`: Bauchhälfte Vorlage × Seitenbreite, auf dem Bauch zur Hülle
  geblendet; Rückenhälfte Vorlage → Halbellipse), Rumpf-Vorlage nach der Wurzel der Krümmung abgetastet (`ringDichteRumpf`).
- [x] **Langhals-Bauchecke 4,5 → 1,9 px, Form Seite hält (Rest 1,3 → 0,6):** Tiefe der Rumpf-Reihenschleife aus der Vorlage
  (`rumpfTiefe`) statt geglättet auf dem Plateau — die Vorlage wurde senkrecht gestreckt.
- [ ] **Front/Top-Tor (≤ 2 px) hält weiter keiner:** Robbe Bauchecke 4,4 px bei y 0,02 (die Hüllenecke liegt zwischen den
  Abtastpunkten; mit 16 Punkten je Ring trägt der Spline sie nicht — Weg: N 24 im Spielbudget, Gegenprüfung 3.6), Kopfkrone
  4,4 px bei y 0,49 (siehe nächster Punkt), Langhals 4,1 px an der Kopfkrone des Hals-Kinds (Kappe), Ente 4,5 px unter den
  Flügeln (Lobbenschnitt-Sehne als Rumpfumriss; Weg: verdeckte Fortsetzung des Rumpfs unter dem Flügel im Planer) und Naht
  20 → 25° (die Krümmungsdichte verschiebt die Spalten neben der Naht, an denen das Halsfenster hängt — Fenster nach Lage statt
  nach Spaltenindex).
- [ ] **Krümmungsdichte nur für Rümpfe mit Kindern:** Bei Einteilern ließ sie am Kegel die gerade Flanke neben der Kielrundung
  2,0 → 7,3 px überschwingen (zwei Punkte dicht an der Rundung; die Schärfe-Regel greift nicht, weil die Rundung über mehrere Proben
  läuft; mit `kippen` 0 dasselbe — Ursache ungeklärt), Zylinder Seite 0,7 → 0,9; Ei 0,4 → 0,3 und Würfel 2,2 → 1,7 besser. Einteiler
  bleiben deshalb nach Bogenlänge (`ringDichte: 'bogen'`). Das Spline-Fehlermaß (`'spline'`, Versuch) ist nicht besser (Robbe 5,7,
  Kegel 5,2). Weg: Dichte aus dem Fehlermaß des ganzen Baus (3D, mit weichen Punkten), oder N 24.
- [ ] **Front-Umriss ist die Vereinigung von Rumpf und Kopf:** Über der Seite ist die Rumpf-Vorlage die Silhouette des Kopfs
  (Robbe: der Rumpfring 11 bekommt ein flaches Rückendach statt eines Grats → Seite 1,5 → 2,5 px am Rand, verdeckt hinter dem
  Kopf), und die Kopfkrone (y > 0,45) trägt keine Ringreihe (Halbellipse = rundeste Form in der Hülle, 4,4 px innen). Weg: Schleifen
  je Teil mit verdeckter Fortsetzung (Monster Mash), auch für den Rumpf unter dem Kopf; der Kopf als eigener Einteiler an der Naht.
- [ ] **Überstand 1,1 → 4,7 px (Robbe):** harte Endstück-Punkte auf der Hüllenecke, der Spline schwingt daneben über die Zeichnung.
- [x] **Wendepunkt-Maß:** Punkte unter 1 px neben der Sehne ihrer Nachbarn zählen nicht mehr (Würfel: kurze Kanten an dichteren
  Ecken machten aus 0,8 px Wellenschlag vier „Wendepunkte“).
- [x] Lehren: Vorlage × Hülle je Stelle zählt die Front-Breite doppelt; die Krümmung einer Schleife in ihrer Ebene messen (die
  Kreuzungspunkte liegen in der dritten Koordinate daneben); Hüllenschnitte an Sehnen erzeugen Ecken, die keine sind (Endzonen
  höchstens Kreiskrümmung); ein steifes Inneres (`innen` 10–100) bricht die Naht; eine Dichte ohne Kappe lässt eine kleine
  Rundung alle Punkte schlucken; erst die Ziele gegen die Grenzlagen messen (Rest je Punkt), dann über die Abtastung reden.

**P1 abgeschlossen (03.11. nachts, Florians Entscheidung; Planseite „P1 — Abschluss“):** Prinzip bewiesen (Schleifen als
Käfigreihen, ein Löser, Teile ohne Nahtfalte), Genauigkeit der Mehrteiler nicht (Front/Top ≤ 2 px an keinem). Zwei Strukturstücke
bleiben offen und bekommen keine Regel mehr:
- [ ] **Verdeckte Fortsetzung je Teil** (Rumpf unter dem Kopf, Kopfkrone, Rumpf unter den Flügeln) — als bearbeitbare Linie im
  Editor, mit P3. Bis dahin raten Hülle, Fenster, Endstück und Vorlagenring; die Punkte „Kopfkrone/Rückengrat“, „Ente unter den
  Flügeln“ und „Fenster an Spaltenindizes“ oben hängen daran.
- [ ] **N je Ring aus dem Spielbudget** (24 statt 16) — Bauchecke der Robbe 4,4 px, Stufe-1-Polygone (P0a), Kegel-Rundungen.
- [x] **Abgeräumt:** Scheitelschub, Rumpfkippen, feste Spaltenzahl, Spline-Dichte, Krümmungsdichte für Einteiler,
  Krümmungsgewicht der Bogenlängen, Planer-Tiefe; die Alternativen zu Naht glatt, Hülle als Obergrenze, Hüllenringen, Endstück,
  harten Endstück-Punkten, Vorlagentiefe und Vorlagenring (alle gemessen schlechter) sind keine Schalter mehr. Der Punkt
  „Kegel-Flanke unter der Krümmungsdichte“ ist damit gegenstandslos (Einteiler nach Bogenlänge), die Ursache bleibt unbekannt.

## Befunde aus P2 Tag 1 „Linien → Stücke“ (03.11. nachts, eigene Messungen; `packages/shape/src/kern/einsatz/stuecke.test.ts`)

Gebaut: `kern/einsatz/stuecke.ts` — Linien (Feldrand, Naht, Schlitz, Verlängerung, Falten, Schnitte) → Stücke mit Ecken und Seiten;
alle zehn Fälle: Dreiecke je genau ein Stück, 2–5 Seiten, keine konkave Ecke, Mundwinkel in beiden Stücken glatt, Feldkanten und
Pole stimmen (Planseite „P2 — Start, Tag 1“). Offen für Tag 2–4:
- [ ] **Zweiecke hinter dem Haken** (J-Fälle): Schnitt + Haken + Verlängerung gegen den Feldrand, zwei Dreierpole in einer Linse.
  Das Muster (Takayama, N = 2) und Tutte müssen die Linsenform tragen; sonst der Arm davor als Fortsetzung (Dreieck vorn, Dreieck
  hinten — mit einem Dreierpol nahe der Lippe).
- [ ] **Robbe hoch: Keil zwischen Lippe und Naht.** Die Biegung von 81° wird verworfen (ihr Schnitt wäre 0,6 Feldkanten); das Stück
  Naht/Lippe/Schnitt ist ein Dreieck mit einem Dreierpol im Keil — dieselbe Stelle, an der der Kernring die Leiter brauchte.
  Prüfen, ob der Dreierpol die Haut dort unter 0,25 px hält (E2: 0,21 px/7,3° mit Leiter).
- [ ] **Birne S: der zweite Schnitt endet 9 px neben der Nahtecke** (er läuft dem vorderen Lippenstück voraus zur Naht). Die
  Fortsetzung „Arm davor“ endete auf dem Feldrand; eine Wahl nach der Luft war gemessen ein Münzwurf. Erst mit Muster und Haut
  entscheiden, ob es stört.
- [ ] **Feldrand-Pole 1–19 je Hälfte** (Treppe des Gitters, weil die Lippe schräg durch Reihen und Ringe läuft): der Preis jedes
  Einsatzes in ein festes Gitter — der Kernring hatte dieselben. Weg: keiner in P2; in P3 gibt es keinen Feldrand.
- [ ] **Zahnfleischreihe** noch keine Linie (Tag 2 als Reihe innerhalb der Lippe), **Tigerkopf** fehlt in der Einsatz-Reihe
  (`einsatzFall` kennt nur die Körper der Prüfreihe), **Bildkarte** ist die Kernring-Karte (der Haken erscheint flach; ab Tag 4
  je Stück eigene Karte).
- [x] **Verworfen (gemessen):** Winkelecken auf dem Feldrand (5–17 Seiten), freistehende Gitterecken als Stückecken (12–45° als
  90°), „der kürzere Arm läuft durch“ (Keil längs der Lippe an der S-Linie), Fortsetzung nach der Luft (0,6–1,7 Feldkanten).
- Fallen (`apps/editor/CLAUDE.md`): Drehung in der Fläche statt im Raum; Biegungen auf der gezeichneten Linie statt auf den
  Schlitzpunkten (die springen längs der Linie); Nullvektor am Linienende; Glättung h/2 statt 2 h (der Kugel-Haken verschwand);
  eine Biegung je Linie für beide Seiten; Doppel-Nachbar auf Ufer B; Dreiecke beiderseits der Endkante teilen; Pole am Seitenende
  zählen.

## Befunde aus P2 Tag 2–4 „Stücknetz: Ganzzahlen, Muster, Käfig, Haut“ (04.11., eigene Messungen; `packages/shape/src/kern/einsatz/stuecknetz.test.ts`)

Gebaut: `kern/einsatz/muster.ts` (Ganzzahlen, Muster 3/4/5 mit Teilungen) und `kern/einsatz/stuecknetz.ts` (Tutte je Stück,
Käfig, Übergabe an Lippe, Löser und Messung des Kernrings). Alle zehn Fälle bauen (Käfig geschlossen, außen bitgleich, Lippe
≤ 0,26 px); Haut ≤ 0,25 px 9 von 10, Mundwinkel ≤ A0 + 2° 8 von 10; Flächen ein Drittel des Kernrings (Planseite „P2 — Stand
Tag 2–4“, Bogen `docs/progress/editor/p2-stuecknetz-2026-11-04.jpg`).
- [ ] **Zwei Falten in der ersten Reihe neben der Lippe** (Robbe hoch J, Birne S; Zellen von 1 px², Knick 178°): Das Vieleck der
  Lage hat gerade Seiten, die Lippe biegt dort stark bzw. trifft die Naht spitz; die erste Reihe wird auf 0,2 px gestaucht, die
  Lippen-Kontrollpunkte (A6) kreuzen sie. Weg: formtreues Abflachen (LSCM/ARAP) statt Tutte auf das Vieleck. Keine Glättung und
  keine Startglättung hilft (gemessen).
- [ ] **Mundwinkel Kugel 3,7° (A0 1,3°), Langhals 7,8° (3,5°)**, Rex tief 4,9 (3,3) knapp im Tor: der Dreierpol des Dreiecks und die
  Lage der ersten Zellen um c. Weg: mit dem Abflachen neu messen; sonst Lage des Pols (Tutte-Gewichte) prüfen.
- [ ] **Knick am Feldrand** (Rex mittel gerade 31,5 gegen 27,1): die Treppenpole des Feldrands (19 Fünfer, 19 Dreier je Hälfte) —
  der Preis des Einsatzes in ein festes Gitter; P3 hat keinen Feldrand.
- [ ] **Budget und Genauigkeit treffen sich nicht:** K2 578–3 686 Flächen bei 0,07–0,46 px; K1 202–710 bei 0,16–2,95 px. Entscheidung
  (Florian): kleineres Feld, Dichte nur an der Lippe, oder Budget anders schneiden. Keine Regel.
- [ ] **Musterbibliothek:** Dreiecke vollständig, Vierecke die Hälfte, Fünfecke ein Sechstel der zulässigen Tupel. Reicht, solange
  die Stücke Dreiecke sind (ohne Biegungsecken). Streifen (Fünfeck mit einer langen festen Seite) brauchen Takayamas zusätzliche
  Dreier-Fünfer-Paare.
- [ ] **Robbe hoch gerade Haut 0,46 px** im Keil zwischen Lippe und Naht (Kernring 0,21 mit Leiter).
- [ ] Nicht gebaut: Stabilität ±2 px, Zahnfleischreihe, Tasche/Rachen/Öffnen, Tigerkopf, die ganze Reihe (54 Fälle).
- [x] **Verworfen (gemessen):** Biegungsecken mit Schnitt (Tag 1; Fünfeck-Streifen ohne Muster, Zweieck mit zwei Polen am
  Mundwinkel), Scheibe als Tutte-Gebiet, Startglättung an der Lippe.
- Fallen (`apps/editor/CLAUDE.md`): Seiten an allen Knoten beider Ufer teilen; Rand des Musters ab der ersten Ecke; Speichen ≥ 2;
  Feldrandpunkte = alte Käfigpunkte, Linienende auf dem Feldrand = Käfigpunkt davor; 190-MB-HTML bricht `html-shot`;
  Faltenmaß = Zellnormale gegen A0.

## Befunde aus P2 Tag 5 „Formtreue Lage, Lippe am Kontrollpolygon, ganze Reihe“ (04.11., eigene Messungen; `packages/shape/src/kern/einsatz/stuecknetz.extrem.ts`)

Gebaut: Lippe (A6) vor der Lage der inneren Punkte, Reihen am Kontrollpolygon; Stationen nach Dichte (h, √(6ε/κ), Merkmalsgröße);
konforme Abflachung mit Rückfall aufs Vieleck; ganze Reihe als Test. Ergebnis: 43 von 43 bauen, Mundwinkel 43 von 43, Haut-Tor 32 von
43 (Kernring 41), zehn Fälle: Haut 8, Mundwinkel 10, Knick 7, Lippe 0,02–0,13 px (Planseite „P2 — Stand Tag 5“, Bogen
`docs/progress/editor/p2-stuecknetz-tag5-2026-11-04.jpg`).
- [ ] **Knicke von 3,7–7,6° auf glatten Körpern** (A0 1,6°): Kugel hoch gerade, Kugel mittel S, Birne hoch S, Birne mittel gerade und S,
  Birne tief gerade. Ursache nicht gemessen; Vermutung: Speichen des Dreieckmusters quer zur Krümmung. Erst Florians Blick, ob sichtbar.
- [ ] **Robbe hoch J: Pol im Hals des J-Hakens** (2,3 px zur Naht; Zellen 0,1–0,9 px² klappen um, Knick 179°). Strukturell: ein Pol je
  Dreieck, Lage aus den Kantenzahlen. Weg: Schnitt am Hals (Schnittmaschine von Tag 1) + Muster für das ungleiche Viereck (Paare
  nach Takayama/Tarini). Kernring: derselbe Fall offen (E2.6).
- [ ] **Robbe Haut 0,44–0,62 px am Linienanfang** (hoch gerade, mittel gerade, mittel J): die Reihen laufen in den Keil zwischen Lippe
  und Naht; dichtere Stationen am Anfang halfen (0,16–0,19) — aber nur über die Kantenzahlen, keine Regel daraus gemacht.
- [ ] **Rex mittel gerade 32,3°** an der Falte von A0 (A0 27,1, Kernring 29,6): mit doppelter Lippendichte 14°, Ursache nicht gemessen.
- [ ] **Budget**: K2 578–3 686 Flächen gegen Tor 300 (ein Drittel des Kernrings); K1 war Tag 4 zu ungenau. Entscheidung (Florian).
- [ ] **Konforme Abflachung** nur noch als Option mit Rückfall (hilft an Rex, nicht an den Faltenfällen); eine Lage des Musters, die in
  einer nicht konvexen Ebene faltenfrei bleibt (Glätten mit Gültigkeitsprüfung), wäre der nächste Schritt — nicht gebaut.
- [x] **Verworfen (gemessen):** γ = 4-Parameter mit Spanne ≤ h (m und Flächen verdoppelt), gleichmäßig 0,75 h und 0,5 h (Robbe faltet
  weiter), Startglättung (Tag 4).
- Fallen (`apps/editor/CLAUDE.md`): Reihen nie an Abtastpunkten aufhängen, wenn der Käfig Kontrollpunkte trägt; Stationen auf der
  gezeichneten Linie, nicht auf dem feinen Zickzack; Tutte in einer nicht konvexen Ebene auf Falten **und** Punkte außerhalb
  prüfen; Python-Patches nach jedem `replace` neu suchen (Datei einmal zerstört); zsh expandiert `====`; vitest zeigt console.log
  bestandener Tests nur mit `--reporter=verbose`.

## Befunde aus P2 Tag 6 „Option B, Tag 1: Knicke und Robbe“ (04.11., eigene Messungen; `stuecknetz.extrem.ts`)

Gebaut: Glätte 0,1 als Löser-Vorgabe des Stücknetzes (der Startkäfig liegt auf A0; Knick am Dreierpol 3,7–7,6 → 2,3–3,5°);
Spitzen von A0 auf der Naht als Knoten der Nahtlinie (Robbe 0,57–0,69 → 0,10–0,18 px). Ganze Reihe: 41 von 43 wie der Kernring,
dieselben zwei offenen Fälle (Planseite „P2 — Tag 6“).
- [ ] **Rex mittel gerade Haut 0,27 px** (Tor 0,25) an der Falte von A0 nahe dem Feldrand; mit λ = 0,001 0,19 px, aber Knick 32°.
  Ursache nicht gemessen (die Falte von A0 kreuzt die Linie und läuft zur Naht; beim Kernring derselbe Fall offen).
- [ ] **Robbe hoch J: Pol im Hals** (unverändert; Weg: Schnitt an Engstellen + Muster mit Dreier-Fünfer-Paaren — Tag 2 von Option B,
  nach Florians Wort).
- [ ] **Valenz-3-Pole:** Catmull–Clark hat an ihnen keinen glatten Krümmungsverlauf; mit λ = 0,1 unter dem Tor, aber jeder Pol bleibt
  eine Stelle, an der der Löser wenig Spielraum hat. Weniger Pole (Vierecke mit Ecke an einer konvexen Treppenstufe des
  Feldrands) wären möglich, koppeln aber die Lippenzahl an den Feldrand — nicht gebaut.
- [ ] Robbe tief J 0,20 und Langhals 0,10 px (vorher 0,11/0,06): Preis der Glätte, im Tor.
- [x] Verworfen (gemessen): tangentiales Gewicht, Rundenzahl, Glätte 0,03/0,3/1.
- Fallen (`apps/editor/CLAUDE.md`): Knick immer am Startkäfig gegen gelöst messen (zeigt, ob Lage oder Löser); eine Punktschärfe von
  A0 darf nie auf den „nächsten“ Punkt springen — sie ist ein Knoten der Linie.
