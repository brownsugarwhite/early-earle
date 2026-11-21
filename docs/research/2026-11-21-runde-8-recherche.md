# Recherche für Shader-Runde 8 (21.11.2026)

Florian nach Runde 7: Schlangen und Drache gefallen ihm nicht, sie sollen viel besser und echter aussehen; Krokodil und
Chamäleon im Stil Echt sind nicht gut genug; „Es muss immer wunderschön und elegant aussehen.“ Die Drachenhaut soll „richtig
abgefahren und spektakulär“ sein, gern hyperrealistisch. Neu gewünscht: Schleim, Steine, Gaudí, der Zeichenstil der Oni-Maske
(„wunderschön“, „genauso als Shader“) und ASCII als „Matrix 2.0“.

**Rahmen für jede Empfehlung:** WebGL2, GLSL ES 3.0, `RawShaderMaterial`. Die meisten Shader sind Vollbild-Durchgänge über dem
G-Puffer (Normale, Lage, Tiefe, Rückseite, weiche Deckung). Es gibt keine UV-Koordinaten. Das Netz (rund 120 000 Ecken, es ändert
sich beim Bearbeiten) kann selbst gezeichnet werden. Eine gedrosselte Vorrechnung je Netzstand ist möglich (wie bei LEGO), ebenso
Texturen je Ecke (wie `eckMuster`). Tempo: flüssig auf dem M3 Pro, möglichst auch auf dem iPhone. **Alle Zeiten und Aufwände unten
sind Schätzungen; gemessen ist nichts.** Farbwerte sind Schätzwerte nach Fotos oder nach der Vorlage.

## Das Wichtigste vorweg: ein Gitterfeld auf der Haut

Die Schlangen wirken heute wie Kiesel, weil jede Schuppe eine Zelle eines zufällig verschobenen Rasters im Raum ist. Echte
Schlangenschuppen liegen in einem regelmäßigen Rautengitter aus schrägen Reihen. Ein regelmäßiges Gitter auf einer beliebig
gewölbten Form lässt sich **nicht** aus einer Funktion im Raum gewinnen: Wie viele Reihen um einen Körper passen, ist eine Frage der
ganzen Fläche, nicht des einzelnen Bildpunkts. Dazu kommt der Satz vom Igel: Auf einer geschlossenen Fläche hat jedes Richtungsfeld
Wirbel. Die Frage ist nur, wo sie liegen. Das bekannteste Verfahren dafür sind die Streifenmuster auf Flächen (Knöppel u. a. 2015),
eine schnelle örtliche Spielart steckt in Instant Meshes (Jakob u. a. 2015).

**Vorschlag: ein Gitterfeld.** Je Ecke eine Strichrichtung S und zwei Phasen (als komplexe Zahlen), im Worker gerechnet, nach dem
Bearbeiten neu (vom letzten Stand aus), an den Ecken haftend (beim Ziehen dehnen sich die Schuppen mit, danach ordnet sich das Gitter
neu). Im G-Puffer kommt ein Ziel `tGitter` mit den Gitterkoordinaten dazu. Nebenbei entsteht der **Abstand längs des Körpers** `d`
(vom Anfangspunkt des Strichs durch das Innere gemessen). Damit folgen Ringe und Bänder dem Körper auch in Biegungen und Fortsätzen
(heute laufen sie quer zur längsten Achse des Kastens; „was bleibt“ Punkte 9, 17, 22).

| Thema | Was das Gitterfeld bringt |
|---|---|
| 1 Schlange | schräge Reihen (Rautengitter), Bauchschilde mit fester Nummer, Ringe längs des Körpers |
| 2 Drache | Hierarchie aus einem Gitter (Platten = 2 × 2 Zellen), Stacheln auf der Mittellinie |
| 3 Krokodil, Chamäleon | Rechteckgitter (Rückenschilde, Bauchquadrate), Sechseckgitter (Körnchen) |
| 6 Gaudí | Sechseckfliesen (Panot), Schuppen der Casa Batlló |
| 7 Oni-Stil | Raster für Ornamente; Schraffurlinien mit gleichem Abstand auf der Haut |
| 8 Matrix 2.0 | Zeichen, die auf der Haut haften („Code-Haut“) |

Schleim, Steine, Trencadís und das Sagrada-Licht brauchen das Gitterfeld nicht.

---

## 1. Schlangenhaut

### 1.1 Anatomie: woran man eine Schlangenhaut erkennt

- **Dachziegel:** Die Körperschuppen überlappen; die freie hintere Kante liegt über dem Ansatz der folgenden Schuppe. Benachbarte
  Längsreihen sind um eine halbe Schuppe versetzt. So entstehen schräge Reihen in beiden Diagonalen (Rautengitter). Der Kopf ist
  die Ausnahme.
- **Zahl der Reihen um den Körper:** meist ungerade (eine Mittelreihe liegt über der Wirbelsäule). Nattern meist 15, 17 oder 19;
  Pythons 65 bis 75; Warzenschlangen (Acrochordus) 130 bis 150. Die Zahl ist in der Körpermitte am größten und nimmt zu Kopf und
  Schwanz ab: Reihen enden oder verschmelzen (Reihenreduktion).
- **Formen:** glatt und rundlich (Python, Boa: klein und flach), gekielt (ein Grat längs der Mitte; Vipern, Klapperschlangen, am
  Rücken am stärksten), lang und spitz (Baumschlangen), breit wie Blätter (Grüne Grubenottern), zweispitzig (manche Natrix-Arten).
- **Apikalgruben:** 0 bis 4 winzige Grübchen am hinteren Ende jeder Rückenschuppe, bei einem Tier überall gleich viele. Nur nah
  sichtbar, aber ein schönes Detail für die Nahsicht.
- **Größen am Körper:** Die unterste Reihe an den Flanken ist oft größer; manche Arten haben eine vergrößerte Mittelreihe. Am Kopf
  große Schilde (Nattern, Giftnattern) oder kleine, unregelmäßige Schuppen (Pythons, Boas, Vipern). Um das Maul und an den Seiten
  kleinere Schuppen (Dehnung beim Schlucken).
- **Bauchschilde:** breite Querplatten, vorne über hinten, glatt und glänzend, etwa eine je Wirbel; unter dem Schwanz einzeln oder
  paarig. Bei Pythons und Boas nur teilweise vergrößert.
- **Haut zwischen den Schuppen:** unter der Überlappung gefaltet; sichtbar, wo sich der Körper dehnt (oft heller oder dunkler als die
  Schuppen, bei manchen Arten eine Schreckfarbe).
- **Wachstum:** Eine Schlange schlüpft mit fester Zahl an Schuppen; sie werden nur größer. Zu Kopf und Schwanz hin werden die
  Schuppen kleiner und die Reihen weniger; auf dünnen Teilen sitzen also kleinere Schuppen.

### 1.2 Optik

- **Zwei Schichten:** Schuppen sind β-Keratin, fast durchsichtig; die Farbe sitzt darunter im Pigment. Blau und Grün sind
  Strukturfarben (die Feinstruktur streut; mit gelbem Pigment wird daraus Grün). Also eine klare, glatte Deckschicht mit scharfem
  Glanz über einem farbigen Grund.
- **Feinstruktur:** Die oberste Hautschicht trägt Nanostrukturen (gezackte Zellgrenzen, Rillen, Nanogitter; Arrigo u. a. 2019 haben
  sie an 353 Arten mit dem Elektronenmikroskop kartiert). Sie machen die Haut selbstreinigend und bei manchen Arten schillernd.
- **Schillern:** Regenbogenboa und Sunbeam-Schlange (Xenopeltis) zeigen breite Regenbogenbänder, die beim Drehen über den Körper
  wandern, am stärksten auf dunklem Grund. Bei der Indigonatter wirkt die gezähnte Oberfläche wie ein Beugungsgitter.
- **Samtschwarz:** Bei der Nashornviper (Bitis rhinoceros) liegen auf den schwarzen Schuppen blattförmige Mikrostrukturen (um
  30 µm) mit Nanorillen; die schwarzen Felder werfen rund viermal weniger Licht zurück als die hellen (Spinner u. a. 2013). Matt neben
  glänzend auf demselben Tier: ein starkes, elegantes Mittel.
- **Häutung:** Vorher wird die Haut stumpf und trocken, die Augen milchig blau; danach glänzt sie besonders.
- **Das Licht macht die Reihen sichtbar:** Ein großes, weiches Licht legt ein Glanzband quer über den Körper. In diesem Band blitzt
  jede Schuppe ein wenig anders auf (jede ist leicht anders geneigt). Das ist das Kennzeichen echter Schlangenfotos.

### 1.3 Muster und wie sie an den Schuppen hängen

- Das Muster liegt im Pigment unter den Schuppen; seine Grenzen laufen meist Schuppe für Schuppe (Zickzack). Also Farbe je Schuppe
  aus ihrer Mitte (wie heute `jeSchuppe`), dazu selten eine geteilte Schuppe an einer Grenze.
- **Arten, die sich lohnen:** Tigerpython (große Flecken mit dunklem Rand), Königspython (dunkelbraun mit hellen „Köpfen“), Netzpython
  (Netz aus schwarzen Linien, Rauten, weiße Punkte an den Flanken, starkes Schillern), Klapperschlange (dunkle Rauten mit heller
  Kante, eine Schuppe breit; Ringe am Schwanz), Korallenotter (Ringe Rot, Gelb, Schwarz mit schuppengenauen Grenzen), Gabunviper
  (geometrische Sanduhren in Beige, Rosa, Violett, Samtschwarz), Grüner Baumpython (leuchtendes Grün mit weißen Punkten auf der
  Rückenlinie), Regenbogenboa (Orangebraun mit dunklen Ringen und Regenbogenschimmer), Sunbeam (Dunkelbraun, stark schillernd).
- **Zellulärer Automat (Manukyan u. a. 2017, Labor Milinkovitch):** Bei der Perleidechse legt das fast sechseckige Gitter der
  Schuppen das Labyrinthmuster fest; jede Schuppe wird grün oder schwarz, je nach ihren Nachbarn. Die dünne Haut zwischen den
  Schuppen trennt die Reaktion und Diffusion in zwei Maßstäbe. Für uns: ein Rauschwert an der Mitte jeder Schuppe und ihrer sechs
  Nachbarn, dann eine Mehrheitsregel. Ergibt Labyrinthe Schuppe für Schuppe.

### 1.4 Wie Filme es machen

- **ILM, Anaconda (2025):** Die Schuppen wurden als Geometrie gebaut, weil Textur allein nicht reichte. Lange abgestimmt: Schon etwas
  größere oder gewölbtere Schuppen ließen die Schlange wie einen Drachen aussehen. **Lehre: Schlangenschuppen sind klein und flach;
  groß und gewölbt ist Drache.**
- **MPC, Nagini (Heiligtümer des Todes 1):** ein Python als Vorlage, neu texturiert; Bewegung nach Vipern, Kobras und Pythons.
- **MPC, Kaa (Dschungelbuch 2016):** nach eigener Aussage eine der schwierigsten Figuren; die Technik der Schuppen ist nicht
  veröffentlicht.
- **Üblicher Weg in Filmen:** Der Körper ist ein Schlauch mit UV längs, die Naht liegt am Bauch (unter den Bauchschilden versteckt);
  darauf Schuppenkarten, Verschiebung und Masken je Schuppe. Uns fehlt der Schlauch; das Gitterfeld ersetzt ihn für jede Form.
- **RepTile (Animal Logic, Walking with Dinosaurs 3D):** Mittelpunkte nach einer Radiuskarte, Voronoi auf der Fläche, Heldenschuppen
  und Faltenlinien von Hand, je Schuppe eine Unterteilungsfläche oder eine Verschiebung beim Rendern; die Schattierung kennt die
  Kennung jeder Schuppe. Für unregelmäßige Saurierschuppen (wie unser T-Rex), nicht für Reihen.
- **Landreneau und Schaefer 2010:** Der Nutzer zeichnet die Seitenlinie, ein Vektorfeld richtet die Schuppen, eine
  Voronoi-Relaxation verteilt sie gleichmäßig. Gleichmäßig, aber ohne strenge Reihen.

### 1.5 Regelmäßige schräge Reihen ohne UVs: die Wege im Vergleich

| Weg | Regelmäßige Reihen | Fehler | Vorrechnung | Kosten im Bild | Urteil |
|---|---|---|---|---|---|
| Heute: Schindeln im Raum (Zellen eines verschobenen Rasters) | nein, Kiesel | keine Naht | keine | 2 × 27 Zellen | nur für unregelmäßige Schuppen (T-Rex, Flanken, Körnchen) |
| Triplanar (drei Ebenen, überblendet) | nur auf flachen Stücken | Doppelbilder in den Übergängen; Reihen folgen nicht dem Körper | keine | 3 Abtastungen | nein |
| Raster im Raum längs des Strichs | an geraden Schläuchen | auf Wölbungen schiefe, ungleiche Zellen (wie bei der Diskokugel) | keine | gering | nein |
| Zylinderkoordinaten um die Körperachse, Naht im Bauch | an Schläuchen ja | scheitert an Fortsätzen, Gabelungen, starken Biegungen | Achse | gering | nur als schnelle Look-Probe |
| Texturbomben, Lapped Textures, Synthese auf Flächen | unregelmäßig oder in Flicken | Ränder der Flicken | Flicken | mittel | nicht für Reihen |
| Phasor-Rauschen in 3D (Tricard u. a. 2019) | Streifen längs eines Feldes | überall kleine Fehlstellen (wie Fingerabdrücke) | keine | mittel | für Fingerabdruck-Muster, nicht für Schuppen |
| **Streifenmuster auf Flächen (Knöppel u. a. 2015), zwei Scharen** | **ja**, Richtung und Abstand frei, auch örtlich verschieden | Wirbel nur, wo nötig (wie die Reihenreduktion beim Tier) | dünn besetztes Eigenwertproblem je Netzstand | 1 Lesezugriff | **ja** |
| Ortsfeld wie in Instant Meshes (Jakob u. a. 2015) | ja, das ganze Gitter auf einmal | wenige Wirbel | örtliche Glättung, mehrstufig; laut Autoren unter einer Sekunde für Hunderttausende Dreiecke (C++) | 1 Lesezugriff | gleichwertig; braucht keinen Gleichungslöser |
| Globale Parametrisierung (QuadCover, gemischt-ganzzahlig) | ja | Schnitte | schwer, langsam | 1 | zu schwer für den Editor |

Knöppel: Die Rechnung ist der kleinste Eigenvektor einer positiv definiten Matrix mit der Besetzung des Laplace-Operators. Auf groben
Netzen braucht es eine besondere Interpolation im Dreieck, sonst treppen die Streifen; mit ihr gehen Streifen feiner als das Netz.
Bei Ozzys 120 000 Ecken liegen bei üblicher Schuppengröße 10 bis 20 Kanten in einer Periode; dort reicht es, die komplexen Werte
linear zu interpolieren und den Winkel zu nehmen. Die Bibliothek geometry-central rechnet die Streifen (Werte je Dreiecksecke), hat aber die
Interpolation im Dreieck nicht; die Referenz der Autoren hat sie (C++). Für den Browser gibt es geometry-processing-js (Eigen nach
JavaScript übersetzt, mit dünn besetzter Cholesky-Zerlegung, Beispiele „Direction field design“ und „Geodesic distance“).

### 1.6 Der Weg für Ozzy: das Gitterfeld im Einzelnen

**Schritt 1, Strichrichtung S (je Ecke, im Worker):**
- Anfangspunkt: das Ende der längsten Achse auf der Spiegelebene (Regler „Richtung umkehren“). Keine Regel für Kopf oder Schwanz,
  nur der Anfang des Strichs.
- Netz in ein Raster legen (wie `gitterBauen` bei LEGO, 96³ bis 128³), innen und außen bestimmen, dann den Abstand vom Anfangspunkt
  **durch das Innere** (Dijkstra mit 26 Nachbarn). Sein Gefälle, in die Tangentialebene gelegt, ist S. Weil der Weg durch das
  Innere läuft, fließt S in jeden Fortsatz bis zur Spitze. Wirbel liegen am Anfangspunkt und an den Spitzen, also dort, wo auch beim
  Tier die Schuppen zusammenlaufen.
- Aus demselben Raster die Dicke r je Ecke (Abstand nach außen) und der Abstand längs des Körpers `d` als echte Zahl je Ecke.
- S glätten: einige Durchgänge Mittelwert der Nachbarn in der Tangentialebene.

**Schritt 2, Phasen:**
- Gitter mit Reihenabstand w (quer) und Schuppenabstand L (längs), benachbarte Reihen um L/2 versetzt. In Gitterkoordinaten (a, b):
  längs = (a + b)·L/2, quer = (a − b)·w. Daraus ∇a = S/L + Q/(2w) und ∇b = S/L − Q/(2w), mit Q = n × S. Die Linien a = ganz und
  b = ganz sind die beiden schrägen Reihen.
- w = 2π·r/N mit N Reihen um den Körper (Regler je Art; zur Lesbarkeit eher 25 bis 45 als die echten 70 eines Pythons), L = w mal
  Seitenverhältnis. Dünnere Teile bekommen so von selbst kleinere Schuppen.
- Je Kante der Sollsprung ω_ij = ½(k_i + k_j)·(x_j − x_i) mit k = 2π∇a. Gesucht ist ψ_i = e^(iφ_i) mit ψ_j ≈ e^(iω_ij)·ψ_i auf allen
  Kanten. Entweder nach Knöppel (kleinster Eigenvektor, inverse Iteration mit konjugierten Gradienten) oder wie Instant Meshes:
  Netz über das Raster zu groben Stufen zusammenfassen, dann von grob nach fein ψ_i ← Normierung(Σ_j w_ij·e^(−iω_ij)·ψ_j).
  Warmstart mit dem letzten Feld; Übertrag bei neuer Topologie über die nächste alte Ecke (Raster als Suchhilfe).
- **Spiegel:** φ_b(x) = φ_a(Spiegelbild von x). Nur eine Rechnung, das Gitter ist exakt spiegelgleich, und die Mittelreihe liegt auf
  der Mittellinie wie beim Tier. Zu prüfen: ob jede Ecke ihr Spiegelbild kennt; sonst über das Raster suchen.

**Schritt 3, Übergabe:** ψ_a, ψ_b als Textur je Ecke (wie `eckMuster`), dazu S und w. Der G-Puffer-Durchgang interpoliert die
komplexen Werte und schreibt (a, b) als Winkel/2π sowie die Sicherheit |ψ| in `tGitter` (RGBA16F). An Wirbeln ist |ψ| klein; dort
übernimmt das heutige Schuppenpflaster (kleine unregelmäßige Schuppen, wie am Kopf echter Schlangen).

**Schritt 4, die Schuppe im Bild:**
- (u, v) = fract(a, b). Vier Kandidaten: die eigene Zelle und die drei vorderen Nachbarn (−1, 0), (0, −1), (−1, −1).
- Je Kandidat die Form: abgerundete Raute, hinten spitz (Viper) oder rund (Python), um die Überlappung nach hinten verlängert. Oben
  liegt die vorderste, die den Punkt deckt (kleinstes a + b). Unter ihrer freien Kante ein Schatten auf die nächste.
- Höhe: flach, zur freien Kante leicht ansteigend, kleine Fase an der Kante; je Art ein Kiel; ganz nah zwei Apikalgrübchen.
- Normale aus dem Gefälle in den Gitterrichtungen E_a = (L/2)·S + w·Q und E_b = (L/2)·S − w·Q (analytisch, wie beim T-Rex).
- Kennung der Schuppe: ein Rauschwert an ihrer Mitte im Raum, x − (u − ½)·E_a − (v − ½)·E_b. Nicht `floor`: Die Phase kennt keine
  Nummer der Schuppe.
- **Bauchschilde:** wo die Haut nach unten zeigt (weiche Grenze, die `d` folgt): Querplatten mit der Nummer floor(d/L_B). `d` ist
  eine echte Zahl, also hat jede Platte eine feste Nummer.
- Unter etwa drei Bildpunkten treten die Schuppen zurück (Mittelwert in Farbe und Rauheit), wie beim T-Rex.

**Kosten (Schätzung):** im Worker Raster und Abstand 20 bis 60 ms, Richtung 10 bis 30 ms, Phasen kalt 0,2 bis 1 s, warm 30 bis
150 ms. Im Bild ein Lesezugriff und vier Kandidaten statt 2 × 27 Zellen: billiger als heute, auch für das iPhone.
**Aufwand (Schätzung):** Feld drei bis vier Tage; Schuppen und Bauch zwei Tage; Arten, Muster, Licht zwei Tage.

### 1.7 Licht und Material im Stil Echt

- Zwei Glanzschichten: eine scharfe Deckschicht (Rauheit 0,08 bis 0,15, Brechzahl um 1,55) und eine breitere (0,3 bis 0,4); der
  Grund diffus mit wenig Streuung.
- Je Schuppe ±2 bis 4° Neigung und ±10 % Rauheit: Das Glanzband glitzert Schuppe für Schuppe.
- Leichte Anisotropie längs der Schuppe (Mikrorillen).
- Schillern als Keule um das Glanzlicht: Beugungsgitter (Farbe aus dem Spektrum, `glsl.ts` hat CIE) oder Dünnschicht nach Belcour
  und Barla 2017 (echtzeitfähig, GLSL im Zusatzmaterial). Stark bei Regenbogenboa und Sunbeam, leicht beim Python, aus bei der
  Korallenotter.
- Samtschwarz als eigenes Material in Musterfeldern: ohne Glanzschicht, Rauheit 1.
- Haut zwischen den Schuppen: zeigt sich, wo sich die Haut dehnt (`dehnung` je Ecke gibt es schon) oder stark gebogen ist.
- Regler „Häutung“: von frisch (scharfer Glanz) bis kurz davor (stumpf, milchig).
- Bühne: ein großes, weiches Licht von vorn oben (Glanzband), Gegenlicht als Kante, Grund dunkel.

### 1.8 Fallen

- **Wirbel** sind unvermeidbar; ihr Ort muss ruhig sein (Anfangspunkt, Spitzen). Zwei unabhängig gerechnete Scharen hätten Wirbel an
  verschiedenen Stellen; der Spiegeltrick halbiert das Problem.
- **Ableitungen an Phasensprüngen:** `fwidth` von fract(a) springt; Breiten aus der Ableitung der komplexen Werte oder aus E_a, E_b
  rechnen.
- **Zeitliche Ruhe:** Ein Feld, das nach jeder Änderung von vorn gerechnet wird, lässt die Schuppen springen. Warmstart und Haften an
  den Ecken sind Pflicht.
- **Zu groß oder zu gewölbt** wirkt wie Drache (ILM), **zu unregelmäßig** wie Kiesel (heute), **zu glänzend** wie Plastik (siehe
  Reign of Fire im Abschnitt 2).
- **Zu kleine Schuppen** flimmern: Rückzug unter drei Bildpunkten.

### 1.9 Quellen

- [Wikipedia: Snake scale](https://en.wikipedia.org/wiki/Snake_scale) · [Whitman SnakeKey, Glossar](https://whitman.edu/snakekey/characterglossary.html)
- [Knöppel, Crane, Pinkall, Schröder 2015: Stripe Patterns on Surfaces](https://www.cs.cmu.edu/~kmcrane/Projects/StripePatterns/)
  · [geometry-central: Stripe patterns](https://geometry-central.net/surface/algorithms/stripes/)
  · [Globally Optimal Direction Fields](https://www.cs.cmu.edu/~kmcrane/Projects/GloballyOptimalDirectionFields/paper.pdf)
- [Jakob, Tarini, Panozzo, Sorkine-Hornung 2015: Instant Field-Aligned Meshes](https://mitsuba-renderer.org/~wenzel/papers/instant-meshes-sga15.pdf)
- [geometry-processing-js](https://geometrycollective.github.io/geometry-processing-js/) · [Heat Method](https://www.cs.cmu.edu/~kmcrane/Projects/HeatMethod/)
- [Tricard u. a. 2019: Procedural Phasor Noise](https://hal.archives-ouvertes.fr/hal-02118508/) · [Code 2D/3D](https://github.com/mfx-inria/phasornoise)
- [Praun, Finkelstein, Hoppe 2000: Lapped Textures](https://www.hhoppe.com/lapped.pdf)
- [Heckenberg, Hegarty, leBlanc: RepTile, How To Skin A Dinosaur](https://animallogic.com/wp-content/uploads/2023/06/RepTile-How-To-Skin-A-Dinosaur.pdf)
  · [Landreneau, Schaefer 2010: Scales and Scale-like Structures](https://people.engr.tamu.edu/schaefer/research/scales.pdf)
- [ILM: Anaconda (2025)](https://www.ilm.com/anaconda-ilm-vfx-interview/) · [MPC: Nagini (Heiligtümer des Todes 1)](https://www.mpcvfx.com/en/filmography/harry-potter-deathly-hallows-part-1/)
  · [CGW: Jungle Book](https://www.cgw.com/Publications/CGW/2016/Volume-39-Issue-2-Mar-Apr-2016-/Virtual-Verite-The-Jungle-Book.aspx)
- [Arrigo u. a. 2019: Phylogenetic mapping of scale nanostructure diversity in snakes](https://pmc.ncbi.nlm.nih.gov/articles/PMC6469093)
- [Spinner u. a. 2013: Snake velvet black](https://www.nature.com/articles/srep01846)
- [Manukyan u. a. 2017: A living mesoscopic cellular automaton made of skin scales](https://www.nature.com/news/how-lizards-get-their-spots-1.21817)
- [Belcour, Barla 2017: Microfacet theory with varying iridescence](https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html)
- Ältere eigene Recherche zu Schuppenmustern: `docs/research/2026-11-20-tiermuster-recherche.md`

### Empfehlung für Ozzy

1. **Gitterfeld bauen** (Worker, Richtung aus dem Abstand durch das Innere, eine Phase plus Spiegel, `tGitter` im G-Puffer). Es trägt
   die halbe Runde 8.
2. **Schuppen im Gitter:** vier Kandidaten, vorne deckt, flach und regelmäßig, Schatten unter der freien Kante, Kennung aus der Mitte
   im Raum. Die heutigen Schindeln bleiben für Wirbel und unregelmäßige Häute.
3. **Bauchschilde und Ringe aus `d`**, Muster Schuppe für Schuppe, Labyrinth als Mehrheitsregel der Nachbarn.
4. **Licht:** zwei Glanzschichten, Variation je Schuppe (Glitzern im Glanzband), Schillern als eigene Keule, Samtschwarz als
   eigenes Material, Regler Häutung.
5. **Arten:** Python, Klapperschlange und Korallenotter neu; dazu Regenbogenboa, Grüner Baumpython und Gabunviper (die drei
   elegantesten Häute).
6. **Probe zuerst (Look, ein halber Tag):** das Schuppenbild im Gitter auf einer schlauchförmigen Testform mit Zylinderkoordinaten,
   neben dem heutigen Python, gleiche Ansicht. Kriterium: Florian erkennt die schrägen Reihen und sagt „schön“. **Dann das Feld**
   auf „strange bird“. Kriterium: Reihen laufen ohne Naht über Körper und Fortsätze, höchstens eine Handvoll Wirbel an ruhigen
   Stellen, Neurechnen nach dem Loslassen unter 0,5 s auf dem M3 Pro.

---

## 2. Drachenhaut

### 2.1 Was die besten Filmdrachen spektakulär macht

- **Smaug (Weta, 2013):** fast eine Million einzelne Schuppen, teils Geometrie, teils Verschiebung. Der Rücken hart wie Schildpatt, der
  Bauch kleinschuppig wie eine Schlange; kleine Schuppen liegen in großen. Die Schuppen falten und gleiten bei Bewegung (eigene
  Simulation je Schuppe). **Jede Schuppe hat ihr eigenes Glanzverhalten**: Die Karte dafür sah aus wie ein Kirchenfenster; so gibt es
  keinen einheitlichen Glanz. Dazu Kratzer, Narben, fehlende Schuppen und Schichten abgestorbener, schuppiger Haut. Im Zorn wird eine
  Kugel im Bauch auf Feuertemperatur gebracht; ihr Licht scheint durch Knochen, Muskeln, Gewebe und Schuppen. Das Licht vom Gold
  färbt ihn von unten. Vorbilder: Schlangen, Leguane, Krokodile (Gesicht).
- **Game of Thrones (Pixomondo u. a.):** Haut nach dem Krokodil, Flügel nach der Fledermaus, Schuppen nach dem Riesengürtelschweif
  (Sungazer, stachelige Schuppenringe). Aufbau von innen nach außen (Knochen, Muskeln, Haut, Schuppen); jede Schuppe einzeln
  gestaltet, damit nichts künstlich wiederholt wirkt.
- **Reign of Fire (Secret Lab, 2002):** Schuppen ohne Verschiebungskarten, mit einem umgebauten Haar-Renderer gewachsen.
  **Schlangenschuppen wurden verworfen: Sie glänzen, und der Drache sah aus wie Plastikspielzeug.** Stattdessen wurden Krokodil- und
  Alligatorhäute fotografiert. Schuppen, die sich mit der Haut dehnen, wirken gummiartig; ein eigener Shader hielt sie starr.
- **Dragonheart (ILM, 1996):** Draco entstand mit ILMs eigener Software (Caricature); Farbe und Textur nach einem rundum
  fotografierten Modell.
- **Drachenzähmen leicht gemacht (Realfilm 2025, Framestore):** Vorbilder Salamander, Axolotl, Großkatzen, Schildkröten, Schlangen,
  Echsen; die Haut feiner gegliedert als im Trickfilm, damit der Drache in echte Umgebungen passt.
- **ILM, Anaconda:** größer und gewölbter ist Drache. Das ist die Trennlinie zur Schlange.

### 2.2 Die Zutaten

1. **Hierarchie** in drei bis vier Größen: Rückenplatten (groß, gewölbt, mit Grat und Anwachsringen wie Schildpatt), Flankenschuppen
   (mittel, in Reihen), Körnchen an Gelenken, Falten und Übergängen, Bauchplatten (quer).
2. **Kamm:** Stacheln und Dornen auf der Mittellinie, in der Größe abnehmend; kleine Dornen in Reihen an den Flanken.
3. **Variation je Schuppe** (Farbe, Glanz, Neigung, Schillern): das Glitzern in Bewegung.
4. **Abnutzung, die eine Geschichte erzählt:** Kratzer längs des Strichs, abgeplatzte Kanten, Ruß und Staub in den Fugen, polierte
   Höhen, einzelne fehlende oder neue (hellere) Schuppen, Narben.
5. **Licht:** Streuung in dünnen Teilen (Fortsätze, Ränder) in Rot, Randlicht, Glut von innen.
6. **Farbe:** dunkler Grund, wenige gesättigte Akzente (Smaug Rot und Gold, Drogon Schwarz und Rot, schillerndes Blau als dritte Art).
7. **Gegen den heutigen Eindruck „Tannenzapfen“:** flachere, breitere, rundere Schuppen (Breite zu Länge um 1,2 : 1), die Spitze nur an
   den Rückenplatten.

### 2.3 Abgefahrene Ideen, die elegant bleiben

| Idee | Was man sieht | Wie im Shader |
|---|---|---|
| **Glutkern** (Smaug) | im Atemtakt glüht der Drache von innen: dünne Teile rot durchscheinend, die Fugen zwischen den Schuppen wie Lava | Durchlicht nach der Dicke aus Vorder- und Rückseite (Beer), Farbe aus dem Schwarzkörper (`glsl.ts`), Glut nur in Fugen und dünnen Stellen, Puls, Leuchten (Bloom) |
| **Juwelenbauch** (Tolkien: Smaugs Bauch ist vom Liegen auf dem Schatz mit Edelsteinen und Gold besetzt, bis auf eine kahle Stelle) | Bauchplatten voller Steine und Goldsplitter, eine kahle Stelle | Bauchzone aus `d` und Normale, darin der Diamantbesatz und Gold; die kahle Stelle als Spiel |
| **Obsidian und Lava** | schwarze Glasschuppen mit scharfen Spiegelungen, Lava in den Fugen, aufsteigende Funken | Obsidian aus Abschnitt 5, Glut in den Fugen, Funken wie beim Staub-Shader |
| **Kintsugi** | weiße Porzellanschuppen, Risse mit Gold gefüllt | Gitter-Schuppen, Glasur, Risse als Voronoi-Kanten innerhalb der Schuppe, Gold metallisch |
| **Sternenhaut** | jede Schuppe ein Fenster in einen tiefen Sternenraum | Innenraum-Abbildung (interior mapping) je Schuppe: Strahl in die Schuppe, Sterne und Nebel in der Tiefe, Glas oben |
| **Anlauffarben** | Stahlschuppen in Stroh, Bronze, Violett, Blau, je nach „Hitze“ | Dünnschichtfarbe aus der Dicke des Oxids, Dicke aus der Glut |
| **Batlló-Keramik** | glasierte Kacheln mit Farbverlauf und Lüsterglanz, Kugeln auf dem Rückenkamm | siehe Abschnitt 6 |
| **Biolumineszenz** | Leuchtpunkte in den Schuppenreihen, Wellen laufen den Körper entlang | Punkte an Gittermitten, Phase aus `d` und Zeit |
| **Strukturfarbe** | jede Schuppe ein Juwel aus Öl-auf-Schwarz | Dünnschicht je Schuppe mit eigener Dicke |

### 2.4 In unserem Rahmen

- Grundlage ist das Gitterfeld aus Abschnitt 1, **mit größerem Abstand und rundem, gewölbtem Profil**.
- **Hierarchie aus einem Feld:** Das Feld wird in der Größe der Rückenplatten gerechnet. Die Flankenschuppen nehmen ψ² (das Quadrat
  einer komplexen Zahl verdoppelt ihre Phase, also exakt die halbe Zellgröße): In jeder Platte liegen genau 2 × 2 Schuppen, die Reihen
  laufen nahtlos weiter. Die Platten liegen in einem Band um die Mittellinie, daneben die mittleren Schuppen; in hohlen Stellen
  (Krümmung nach innen, Ansätze der Fortsätze) und an Wirbeln das Schuppenpflaster als Körnchen; Bauchplatten aus `d`. Kein zweites
  Feld nötig.
- **Kamm:** Stacheln als Kegel in den Schalen (wie die Flammen beim Fell), nur auf der Mittellinie, jede dritte Platte; Länge nach
  einem Verlauf über `d` (vorn klein, Mitte groß, hinten klein).
- **Variation je Schuppe** wie bei Smaug: Neigung ±3°, Rauheit ±0,1, Farbton ±3°, Dicke der Dünnschicht je Schuppe.
- **Abnutzung im Raum:** Kratzer als feine Linien längs S (an die Form gebunden, kein Flimmern), Kantenmaske aus dem Abstand zum
  Schuppenrand, Ruß aus der Fugentiefe.

### 2.5 Fallen

- Spitze, hohe Schuppen überall: Tannenzapfen. Einheitlicher Glanz: Plastik (Reign of Fire). Zu viele Farben und Rauschen: unruhig,
  nicht elegant.
- Glut überall gleich hell wirkt wie Neon; sie gehört in Fugen und dünne Stellen, mit Puls.
- Stacheln überall machen eine Comicfigur; der Kamm bleibt auf der Mittellinie.
- Schuppen dürfen sich beim Ziehen der Form nicht wie Gummi dehnen (Reign of Fire): nach dem Loslassen ordnet das Gitterfeld neu.

### 2.6 Quellen

- [CGW: The Hobbit Habit (Smaug)](https://www.cgw.com/Publications/CGW/2014/Volume-37-Issue-1-Jan-Feb-2014-/The-Hobbit-Habit.aspx)
  · [fxguide: Meet Smaug](https://www.fxguide.com/?p=48113) · [Tolkien Gateway: Smaug](https://tolkiengateway.net/wiki/Smaug)
- [USC Illumin: How to build a dragon (Game of Thrones)](https://illumin.usc.edu/how-to-build-a-dragon/)
  · [Creative Bloq: Game of Thrones dragons](https://www.creativebloq.com/vfx/game-of-thrones-dragons-61515457)
- [Monster Legacy: Reign of Fire](https://monsterlegacy.net/2013/06/28/reign-of-fire-dragons/) · [Wikipedia: Reign of Fire](https://en.wikipedia.org/wiki/Reign_of_Fire_(film))
- [ILM: Dragonheart](https://www.ilm.com/vfx/dragonheart/) · [Framestore: How to Train Your Dragon](https://www.framestore.com/news/bringing-dragons-life-visual-development)
  · [VFX Voice: How to Train Your Dragon](https://vfxvoice.com/digging-deeply-into-vfx-for-the-live-action-how-to-train-your-dragon/)
- [ILM: Anaconda](https://www.ilm.com/anaconda-ilm-vfx-interview/) · [Belcour, Barla 2017](https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html)
- Innenraum-Abbildung: van Dongen 2008, „Interior Mapping“ (CGI 2008)

### Empfehlung für Ozzy

1. **Drache neu auf dem Gitterfeld:** Rückenplatten (2 × 2 Zellen, Grat, Anwachsringe), Flankenschuppen flach und breit, Körnchen in
   hohlen Stellen, Bauchplatten aus `d`. Das löst „Tannenzapfen“.
2. **Kamm aus Kegeln** in den Schalen, nur auf der Mittellinie.
3. **Glanz je Schuppe** (Smaug) und **Abnutzung im Raum** (Kratzer längs S, Ruß in Fugen, polierte Höhen).
4. **Regler „Art“** mit vier Spielarten zuerst: **Glutkern**, **Juwelenbauch**, **Obsidian und Lava**, **Strukturfarbe**; später
   Kintsugi, Sternenhaut, Anlauffarben, Batlló.
5. **Probe:** drei Bilder (Echt, Glutkern, Juwelenbauch) in Ozzys Standardblick, dazu eine kurze Drehung. Kriterium: Florian sagt
   „spektakulär“ und nicht mehr „Tannenzapfen“.

---

## 3. Krokodil und Chamäleon, realistisch

### 3.1 Krokodil: was die Echtheit ausmacht

- **Rückenschild:** Knochenplatten (Osteoderme) unter verhornten Schilden, in **Querreihen** (je Reihe vier bis acht), jede mit einem
  Kiel längs; die Kiele reihen sich zu durchgehenden Längsgraten. Die Oberfläche der Platten ist grubig. Hinter dem Kopf
  Nackenschilde, bei vielen Arten als kleine Gruppe, durch weiche Haut vom Rückenschild getrennt. Auf dem Schwanz zwei Kämme hoher
  dreieckiger Schuppen, die etwa in der Mitte zu einem verschmelzen.
- **Flanken:** viel kleinere, rundliche, weniger regelmäßige Schuppen mit gefalteter, ledriger Haut dazwischen.
- **Bauch:** glatte, fast quadratische Schuppen in sehr regelmäßigen Querreihen (darum begehrt für Leder).
- **Sinnesorgane (ISO):** kleine dunkle Kuppeln, kaum einen Millimeter groß, mit einer Rille drumherum. Echte Krokodile und Gaviale
  tragen sie auf fast jeder Körperschuppe, Alligatoren und Kaimane nur am Kopf. Ein Punkt je Bauchschuppe ist ein starkes,
  unauffälliges Echtheitsdetail.
- **Kopf:** keine angelegten Schuppen, sondern Vielecke aus Furchen. Milinkovitch u. a. 2013 deuteten sie als Risse; Santos-Durán u. a.
  (Nature, Dezember 2024) zeigen, dass sie durch **Faltung unter Druck** entstehen (die Haut wächst schneller als der Schädel). Oben
  auf den Kiefern lang gestreckte Felder, an den Seiten kleinere Vielecke; Furchen enden manchmal offen, viele Treffpunkte im rechten
  Winkel; links und rechts nicht spiegelgleich.
- **Material:** trockenes Horn eher matt (Rauheit 0,55 bis 0,7), nass in Flecken mit dünnem Wasserfilm und Tropfen; Schlamm und Algen
  in den Furchen; Farbe oliv bis graugrün oben (etwa #4b5a37, Schatten #2a2f22), dunkle Querbänder am Schwanz, Bauch cremegelb (etwa
  #d9cfa8).
- **Licht:** tief stehende Sonne von der Seite zeigt Grate und Gruben; im Gegenlicht glänzen nur die nassen Stellen.

### 3.2 Chamäleon: was die Echtheit ausmacht

- **Körnchenschuppen** liegen nebeneinander (nicht überlappend), fein, aber ungleich groß; dazwischen größere flache Tuberkel, oft in
  Reihen oder Gruppen an den Flanken.
- **Kämme:** Rückenkamm aus kegelförmigen Schuppen, vorn am größten; Kehl- und Bauchkamm aus einzelnen hellen Kegeln (beim
  Jemenchamäleon sehr deutlich); beim Jemenchamäleon ein hoher Helm am Kopf.
- **Farbe je Körnchen:** Jede Schuppe hat eine Farbe; das Bild wirkt aus der Nähe wie Pointillismus. Weiche Verläufe über mehrere
  Körnchen hinweg sehen gemalt aus.
- **Farbwechsel (Teyssier u. a. 2015):** In den oberen Iridophoren liegen Guanin-Nanokristalle (um 127 nm) in einem Dreiecksgitter.
  In Ruhe ist der Abstand klein (Blau reflektiert, mit gelbem Pigment Grün); erregt wächst er (im Mittel um rund 30 %), die Farbe
  wandert nach Gelb, Orange, Rot. Eine tiefere Schicht reflektiert Nahinfrarot (Wärmeschutz). Dazu dunkle Melanophoren für Bänder.
- **Muster:** senkrechte Bänder (Sättel) an den Flanken, ein heller Seitenstreifen, Punkte. Pantherchamäleon nach Herkunft: Ambilobe
  (Rot, Grün, Gelb, Blau in einem Tier), Nosy Be (Türkisblau), Ambanja (Blaugrün mit blauvioletten Sätteln). Jemenchamäleon: Grün mit
  gelben und türkisen Bändern.
- **Material:** satin, nicht nass (Rauheit 0,35 bis 0,5), Körnchen als flache Kuppeln, Haut dazwischen etwas dunkler, Falten an
  Gelenken; in Blau und Türkis ein leichter Strukturglanz.

### 3.3 In unserem Rahmen

- **Krokodil auf dem Gitterfeld mit rechtem Winkel** (zwei Scharen längs S und längs Q statt schräg): Rückenschilde in Querreihen mit
  Kiel und Gruben, Bauchquadrate mit ISO-Punkt, Flanken aus dem Schuppenpflaster mit Falten, Schwanzkämme als Kegel in den Schalen
  (zwei Reihen, die in einer verschmelzen, gesteuert über `d`).
- **Kopf ohne Kopfwissen:** In der Nähe des Anfangspunkts (kleines `d`) die Furchen-Vielecke: Voronoi mit schmalen Furchen, längs S
  gestreckt, einzelne Furchen offen (eine Kante je Zelle per Zufall weglassen). Das ist keine Regel für einen Körperteil, sondern ein
  Verlauf über `d`.
- **Nässe** als eigener Regler: Filmzone (Rauschen und Unterseite), darin dunklere Farbe, scharfe Deckschicht und Tropfen (Kuppeln mit
  Brechung, wie beim Tropfen-Shader).
- **Chamäleon auf dem Gitterfeld mit 60°** (Sechseckgitter, sieben Kandidaten): Körnchen mit Größenstreuung; Tuberkel als einzelne
  vergrößerte Körnchen (nach ihrer Kennung), die ihre Nachbarn überdecken; Kegel als Kamm auf der Mittellinie oben und unten
  (Schalen). Farbe je Körnchen aus seiner Mitte.
- **Regler „Stimmung“:** verschiebt den Kristallabstand je Körnchen (Blau → Grün → Gelb → Orange), mit einer Welle über `d`, damit
  der Wechsel über den Körper läuft. Ein lebendiger, eleganter Effekt.

### 3.4 Fallen

- Kiesel gleicher Größe überall (heute) wirken nicht wie Krokodil; erst die Hierarchie Rücken, Flanke, Bauch, Kopf macht es echt.
- Gleichmäßiger Glanz macht Plastik; das Krokodil ist matt mit nassen Inseln.
- Kiele müssen sich zu Längsgraten reihen; zufällige Kiele wirken wie Kies.
- Chamäleon: zu nass, zu große Körnchen oder Farbverläufe über die Körnchen hinweg zerstören die Echtheit.

### 3.5 Quellen

- [Wikipedia: Crocodilian armor](https://en.wikipedia.org/wiki/Crocodilian_armor) · [Balaguera-Reina u. a. 2017: Scute patterns](https://bioone.org/journals/journal-of-herpetology/volume-51/issue-4/17-023/Scute-Patterns-as-an-Individual-Identification-Tool-in-an-American/10.1670/17-023.full)
- [Milinkovitch u. a. 2013: Crocodile head scales emerge from physical cracking](https://www.cs.umd.edu/~zwicker/projectpages/CrocodileHeadScales-Science13.html)
  · [Milinkovitch 2024: The mechanics of crocodile head scale development (zu Santos-Durán u. a., Nature 2024)](https://communities.springernature.com/posts/the-mechanics-of-crocodile-head-scale-development)
- [National Geographic: Crocodile faces more sensitive than fingertips (ISO)](https://www.nationalgeographic.com/science/article/crocodile-faces-are-more-sensitive-than-human-fingertips)
- [Teyssier u. a. 2015: Photonic crystals cause active colour change in chameleons](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4366488/)
- [Plazi: Chamaeleo (Beschuppung, Kämme)](https://tb.plazi.org/GgServer/html/03E487A63E21421B3385FC05FE334D36) · [Animal Diversity Web: Chamaeleo calyptratus](https://animaldiversity.org/accounts/Chamaeleo_calyptratus/)
  · [Chameleon Academy: Panther chameleon locales](https://chameleonacademy.com/panther-chameleon-locales-how-to-choose/)

### Empfehlung für Ozzy

1. **Krokodil in vier Zonen:** Rückenschilde in Querreihen mit durchgehenden Kielgraten, Flanken mit Falten, Bauchquadrate mit
   ISO-Punkt, Furchen-Vielecke nahe dem Anfangspunkt; Schwanzkämme als Kegel.
2. **Krokodil-Material:** matt, nasse Inseln mit Tropfen, Schlamm in Furchen, gedeckte Farben; Bühne mit tiefer Sonne.
3. **Chamäleon im Sechseckgitter:** Körnchen und Tuberkel, Farbe je Körnchen, Kämme aus Kegeln, Bänder und Seitenstreifen, vier
   Vorlagen (Ambilobe, Nosy Be, Ambanja, Jemen).
4. **Regler „Stimmung“** für den Farbwechsel über die Kristallabstände, als Welle über den Körper.
5. **Probe:** Krokodil in Seitenlicht und Chamäleon im Schatten, je neben dem heutigen Stand. Kriterium: Florian sagt „echt“.

---

## 4. Schleim, hyperrealistisch

### 4.1 Wie echter Schleim aussieht

- **Durchsicht:** fast nur Wasser mit langen Molekülen (Schleimstoffe, beim Spielzeugschleim PVA); Brechzahl 1,33 bis 1,40. Dünne Stellen
  sind fast klar, dicke satt gefärbt oder trüb (Beer: Licht nimmt mit dem Weg ab).
- **Glanz:** sehr glatte Oberfläche, scharfe Spiegelbilder der Lampen und Fenster, starker Fresnel-Rand. Typisch ist ein **zweites
  Glanzlicht innen** an der Rückseite (die Rückwand spiegelt nach innen).
- **Trübung und Streuung:** milchiger Schleim streut; die Ränder leuchten im Gegenlicht farbig.
- **Blasen:** eingeschlossene Luft, rund oder gestreckt, mit hellem Rand (Totalreflexion) und dunklem Saum; sie steigen sehr langsam.
- **Fäden:** Zieht man Schleim auseinander, entstehen Fäden; kurz vor dem Reißen bilden sie **Perlen an einer Schnur** (Bhat u. a. 2010:
  nur bei zähelastischen Flüssigkeiten, wie Speichel; die Elastizität verzögert das Abreißen, die Perlen halten lange).
- **Tropfen:** hängen, schnüren sich ein (Hals), reißen spät ab, lassen einen Faden zurück.
- **Durchhängen:** Schleim fließt langsam nach unten, bildet unten einen Wulst und am Boden einen Fuß mit Meniskus.
- **Am Boden:** ein farbiger Lichtfleck (Brennfleck), weil die Form das Licht bündelt; farbiger Schatten.

### 4.2 Wie Filme, Spiele und Programme es machen

- **Film:** Simulation mit zäher Flüssigkeit (Houdini FLIP), Fäden mit weichen Körpern (Vellum), gerendert mit Brechung, Absorption und
  Volumenstreuung. Pixar hat für Elio (2025) einen trüben „Glibber“ mit Volumenstreuung und leuchtenden Knoten im Inneren gebaut, die zur
  Oberfläche steigen und dabei heller werden.
- **Echtzeit:** Flüssigkeit im Bildraum (van der Laan, Green, Sainz 2009): Tiefe glätten, Normale aus der Tiefe, **Dicke** in einem
  eigenen Durchgang, damit Absorption und Brechung; Fresnel für die Spiegelung. Durchscheinen nach der Dicke (Barré-Brisebois und
  Bouchard 2011, Frostbite): ein Gegenlicht-Term mal örtliche Dicke.
- **Stil:** Slime Rancher (rund, weich, gesättigt), Splatoon (Farbe als Flüssigkeit).

### 4.3 Was in unserem Vollbild-Shader geht

Wir haben Vorder- und Rückseite je Bildpunkt; das ist genau die Dicke, die Echtzeit-Flüssigkeiten erst rechnen müssen.

1. **Absorption:** Dicke entlang des Blicks aus Vorder- und Rückseite, Farbe = e^(−σ·Dicke) je Kanal (Grün: Rot und Blau stark
   geschluckt).
2. **Brechung:** den Grund versetzt lesen (wie Flüssigglas), mit leichter Farbzerstreuung (drei Abtastungen).
3. **Spiegelung:** Fresnel (Brechzahl 1,35), Studio-Softboxen scharf (Rauheit 0,02 bis 0,05) plus eine weichere Keule; **das innere
   Glanzlicht** an der Rückseite (Rückseitennormale umgedreht) als Kennzeichen.
4. **Trübung:** Regler von klar bis milchig: Mischung mit der weichgezeichneten Beleuchtung, farbiger Rand im Gegenlicht.
5. **Blasen und Schwebstoffe:** Strahl von der Vorder- zur Rückseite in 16 bis 24 Schritten durch Zellen im Raum der Form (an der Form
   haftend, kein Flimmern); Kugeln mit Zufallsradius, steigen langsam; optional Glitzerplättchen (Spielzeugschleim).
6. **Tropfen und Fäden:** Tropfen-Shader mit Hals und Perlen; Fäden zwischen nahen Teilen der Form (aus dem Abstand in `tWeich`):
   dünne Brücken, die durchhängen und in Perlen zerfallen.
7. **Bewegung:** langsame, flache Wellen in der Normale (Wabbeln), Schlieren (Brechzahl wechselt leicht im Inneren).
8. **Bühne:** Pfütze unter der Form mit Brennfleck und farbigem Schatten.

Spielarten: Ekto-Grün, klarer Glibber, Honig (warm, zäh, wenig Blasen), Spielzeugschleim (Rosa mit Glitzer), schwarzer Glanz mit
Ranken.

### 4.4 Fallen

- Ohne Trübung, Blasen und Fäden sieht Schleim aus wie Glas (heute Flüssigglas).
- Die Rückseitennormale am selben Bildpunkt gehört nicht zum Austritt des Strahls (siehe Merke 9 der Übergabe); für die Brechung die
  Linse wie beim Flüssigglas.
- Blasen im Bildraum flimmern; sie müssen im Raum der Form liegen.
- Am iPhone ist der Strahlengang durch die Form teuer: Schritte nach Dicke staffeln, in Bewegung halbe Auflösung.

### 4.5 Quellen

- [van der Laan, Green, Sainz 2009: Screen Space Fluid Rendering with Curvature Flow](https://www.win.tue.nl/~wstahw/edu/2IV05/andrei/particle_rendering/provided/p91-van_der_laan.pdf)
- [Barré-Brisebois, Bouchard 2011: Approximating Translucency](https://ea.com/frostbite/news/approximating-translucency-for-a-fast-cheap-and-convincing-subsurface-scattering-look)
- [Bhat u. a. 2010: Formation of beads-on-a-string structures (Nature Physics)](https://www.nature.com/articles/nphys1682)
- Pixar, Elio: „Ooze Control“ (Technologiebibliothek von Pixar, 2025)
- Eigene Vorarbeit: Flüssigglas (Merke 9), Tropfen (Merke 4) in `docs/look/ozzy/shader/UEBERGABE.md`

### Empfehlung für Ozzy

1. **Ein Shader „Schleim“** auf Flüssigglas aufgebaut: Absorption nach Dicke, Brechung mit leichter Zerstreuung, Fresnel mit zwei
   Keulen und innerem Glanzlicht.
2. **Blasen und Schwebstoffe** per Strahl durch Zellen im Raum der Form, langsam steigend.
3. **Tropfen mit Hals und Perlen** und **Fäden** zwischen nahen Teilen (Perlen an einer Schnur).
4. **Bühne mit Pfütze**, Brennfleck und farbigem Schatten.
5. **Probe:** Ekto-Grün und klarer Glibber, ein Standbild und fünf Sekunden Bewegung. Kriterium: Florian sagt „nass, zäh, eklig schön“.

---

## 5. Steine

### 5.1 Was für alle Steine gilt

- **Ein Stein ist ein Block:** Muster im Raum der Form (Lage im Maß der Form, Perlin 1985) statt auf der Haut. Dann laufen die Adern
  durch die Form, als wäre sie aus einem Block gehauen. Keine UVs nötig, kein Flimmern.
- **Aufbau vor Rauschen** (LAPIDEO-Recherche): erst die große Ordnung (Hauptrichtung der Adern, ein paar Leitadern, viel freie Fläche),
  dann zwei bis drei feinere Stufen, die stellenweise verschwinden; Adern verzweigen sich, statt sich zu kreuzen; Adern sind Kurven,
  keine geschlossenen Schleifen aus geschwelltem Rauschen.
- **Durchscheinen ist Pflicht** bei Marmor, Jade, Achat, Onyx: sonst wirkt es wie ein Aufkleber. Günstig: Umlicht (wrap) plus
  Durchlicht nach der Dicke aus Vorder- und Rückseite; Adern aus Kalzit etwas durchscheinender und glänzender als der Grund; eine
  leichte Tiefe (die Adern liegen unter der Politur).
- **Politur gegen rau:** poliert = Deckschicht mit scharfem Spiegelbild über dem Muster; rau = keine Deckschicht, feine Normale aus
  Rauschen, Dunkel in Vertiefungen, helle frische Bruchstellen an Kanten. Ein Regler „Politur“ für alle.
- **Körner funkeln:** In Granit, Lapislazuli, Sandstein blitzen einzelne Körner auf, wenn ihr Winkel passt (wie beim Diamantbesatz:
  Neigung je Korn).
- **Werkzeuge aus `glsl.ts`:** Simplex, fBm, Curl, Voronoi; dazu Verzerren des Raums (Domain Warping nach Quilez), Gratfunktion
  (1 − |Rauschen|)^k, Voronoi F2 − F1 für Kanten, Bandmuster mit gleichmäßigem Abstand und Nummer je Band (Etienne und Lefebvre 2020).

### 5.2 Die Steine einzeln

| Stein | Was ihn ausmacht | Rezept | Farben (Schätzung) |
|---|---|---|---|
| **Marmor Carrara** | feine graue Adern auf hellem Weiß, netzartig | Gratfunktion über verzerrtem fBm längs einer Hauptrichtung, drei Stufen, feinste ausdünnen; Stylolithen (gezackte dunkle Nähte) selten; starkes Durchscheinen; poliert | #f2f0ec, Adern #8d9096 |
| **Marmor Calacatta** | wenige kräftige goldgraue Adern, viel Weiß | ein bis zwei Leitadern breit, Rand weich, Gold aus Eisen | #f4f1ea, Adern #b59a6a, #7d7a76 |
| **Nero Marquina** | schwarz mit scharfen weißen Adern, fast gezeichnet | Adern schmal, hart, verzweigt; Grund tiefschwarz mit leichtem Braun | #141313, Adern #e8e6e1 |
| **Granit** | keine Adern: Körner aus Quarz (grau, glasig), Feldspat (rosa oder weiß, Spaltflächen blitzen), Glimmer (schwarze Plättchen, glitzern) | Voronoi 1 bis 5 mm, drei bis vier Mineralklassen, Glanz je Korn; poliert oder geflammt (rau) | #c9b8ae, #e8e2dc, #2a2a2c, #8a8a8f |
| **Sandstein** | Schichtung und Schrägschichtung (gebogene Lagen wie „The Wave“), Liesegang-Ringe aus Eisen, sandig matt | Bandmuster über verzerrter Höhe, Sätze schräger Lagen, feines Korn als Normale | #d8b27a, #c0703f, #efe0c0 |
| **Basalt** | dunkelgrau, feinkörnig, Gasblasen als kleine Löcher; Säulen (Sechsecke) | Gruben aus Voronoi-Abständen; Säulenklüfte als Vielecke (Voronoi im Raum, längs einer Achse gestreckt) mit Fugen | #3a3b3d, #2a2b2c |
| **Obsidian** | vulkanisches Glas, schwarz, muscheliger Bruch, scharfe Spiegelung, dünne Ränder rauchig durchscheinend; Glanz-Obsidian (gold, silber) und Regenbogen-Obsidian (Bänder 300 bis 700 nm aus Magnetit-Nanokristallen) | große Muschelwellen als Normale (Ringe um Zufallspunkte), Durchlicht nach Dicke in Braun, Dünnschicht in Fließbändern | #0b0b0d, Rand #3b2a1e |
| **Jade** | durchscheinend grün, wachsig poliert, wolkige Einschlüsse, faserig | starkes Durchscheinen, Rauheit 0,2 bis 0,3, fBm-Wolken, feine Fasern längs einer Richtung | #4f8a5b, #9cc49a, #2f5e3e |
| **Lapislazuli** | tiefes Ultramarin (Lasurit), weiße Kalzitschlieren, goldene Pyritfunken | fBm-Schlieren, Pyrit als Punkte mit Metallglanz und Funkeln | #1e3a8a, #2b4fb3, Kalzit #d9d9d6, Pyrit #c9a54a |
| **Malachit** | Grün in Bändern, konzentrische „Augen“, scharf | Bandmuster um verzerrte Mittelpunkte (Abstand zu Zellmitten, Sinus), Bänder hell und dunkel im Wechsel | #0f5132, #1f7a4d, #5fbf8a |
| **Achat** | Festungsbänder, die einer Hohlform folgen, durchscheinend; innen oft Quarzkristalle | Abstand zu einer verzerrten Hohlform (Voronoi-Zelle), Bänder mit feinen Linien, Durchscheinen; innen Kristallfacetten | #8fa3b8, #f0ece4, Karneol #b5502f |
| **Travertin** | Creme und Beige, geschichtet, lang gezogene Poren entlang der Schichten | Voronoi in gestauchtem Raum für Poren (dunkel, rau), Schichtbänder | #e6d6b8, #cbb38c, Poren #8a7558 |
| **Schiefer** | dunkles Blaugrau, Spaltlagen, matt mit leichtem Schimmer, Rost | feine parallele Lagen als Normale, Schimmer anisotrop, Rostflecken aus Rauschen | #3d4450, #2c3038, Rost #8a5a33 |
| **Labradorit** | grau-dunkel, Flächen leuchten blau, gold, grün auf, nur in bestimmtem Winkel (Lamellen 128 bis 252 nm) | Bereiche mit eigener Lamellennormale; Farbe aus Dünnschicht, nur wenn die Halbvektor-Richtung zur Lamellennormale passt | #4a4f55, Leuchten #2f7fd6, #d6b84a |

Die schönsten für Ozzys Formen (rund, poliert, im Studio): Calacatta, Nero Marquina, Jade, Lapislazuli, Malachit, Labradorit,
Obsidian. Rau und erdig: Sandstein, Travertin, Basalt, Schiefer.

### 5.3 Vorbilder

- **Substance Designer:** Marmor mit verzerrten Adern, zufällige Leitadern per Flutfüllung und Histogramm-Schnitt (Norman Bishop),
  Malachit-Ringe bewusst nicht ganz konzentrisch (Adobe-Anleitung).
- **LAPIDEO-Recherche:** benannte Marmore (Carrara, Calacatta, Arabescato, Portoro, Nero Marquina, Cipollino), Stylolithen, Brekzien,
  Porphyr; Durchscheinen als Pflicht.
- **Klassiker:** Perlins Marmor (Streifen mit Turbulenz in der Phase, 1985), Quilez' Domain Warping (Farbe aus den Zwischenschritten),
  Jensen u. a. 2001 (Unterflächenstreuung, Marmor und Jade).

### 5.4 Fallen

- Marmor nur aus Rauschen sieht aus wie Wolken; Adern brauchen Richtung, Leitadern und freie Fläche.
- Geschwelltes Rauschen macht geschlossene Schleifen statt Adern.
- Muster in Weltlage rutschen, wenn die Form sich dreht; sie gehören in die Lage im Maß der Form.
- Politur ohne Tiefe wirkt lackiert; Durchscheinen ohne Dicke wirkt flach.
- Funkeln flimmert: Körner unter drei Bildpunkten zusammenfassen (wie beim Diamantbesatz).

### 5.5 Quellen

- [LAPIDEO Research (auriea.org)](https://auriea.org/LAPIDEO-Research)
- [80.lv: Norman Bishop, Marble Materials in Substance Designer](https://80.lv/articles/001agt-creating-textures-based-on-scientific-and-end-user-research)
  · [80.lv: Creating marble in Substance Designer](https://80.lv/articles/creating-marble-in-substance-designer)
  · [Adobe: Malachite breakdown](https://www.adobe.com/learn/substance-3d-designer/web/mdl-malachite-material-breakdown)
- [Etienne, Lefebvre 2020: Procedural band patterns](https://arxiv.org/abs/2003.01408v1) · [Quilez: Domain Warping](https://iquilezles.org/articles/warp/)
- [Agate geode shader (WGSL)](https://www.shadcn.io/shaders/agate-geode-shader)
- [GIA: Rainbow obsidian](https://www.gia.edu/gems-gemology/summer-2023-in-the-spotlight) · [Wikipedia: Labradorite](https://en.wikipedia.org/wiki/Labradorite)
- [Wikipedia: Granite](https://en.wikipedia.org/wiki/Granite), [Lapis lazuli](https://en.wikipedia.org/wiki/Lapis_lazuli), [Malachite](https://en.wikipedia.org/wiki/Malachite),
  [Agate](https://en.wikipedia.org/wiki/Agate), [Travertine](https://en.wikipedia.org/wiki/Travertine), [Slate](https://en.wikipedia.org/wiki/Slate),
  [Columnar jointing](https://en.wikipedia.org/wiki/Columnar_jointing), [Cross-bedding](https://en.wikipedia.org/wiki/Cross-bedding)
- Jensen, Marschner, Levoy, Hanrahan 2001: A Practical Model for Subsurface Light Transport

### Empfehlung für Ozzy

1. **Ein Shader „Stein“** mit Regler Art (14 Steine), Muster im Raum der Form, Regler Politur.
2. **Gemeinsame Teile:** Adern als Kurven mit Hierarchie, Bandmuster mit Nummer, Körner mit Glanz je Korn, Durchscheinen nach Dicke.
3. **Zuerst die sieben schönsten** für Ozzys runde Formen: Calacatta, Nero Marquina, Jade, Lapislazuli, Malachit, Labradorit, Obsidian.
4. **Zwei Bühnen:** Museum (dunkel, ein Spot, für Politur) und Tageslicht (für raue Steine).
5. **Probe:** ein Bildblatt mit sechs Steinen ohne Beschriftung. Kriterium: Florian benennt jeden.

---

## 6. Gaudí und Barcelona

### 6.1 Die drei starken Ideen

**1. Trencadís-Salamander (Park Güell, „El Drac“).** Der Salamander auf der Treppe des Park Güell ist ganz mit Trencadís bedeckt:
Scherben von Fliesen, Geschirr und Glas, zu Farbflächen gelegt. Farben laut Beschreibungen in Streifen von Mitternachtsblau über Türkis
bis Orange und Grün; die Bank (Jujol) mischt dazu Weiß, Gelb und bemalte Scherben mit Resten alter Fliesenmuster.
*Auf der Form:* Unser heutiges Schuppenpflaster (Zellen im Raum) ist genau richtig für Scherben, nur eckiger: jede Zelle durch ein bis
zwei Zufallsschnitte in Scherben teilen; jede Scherbe eine ebene Facette (Normale an ihrer Mitte, wie beim Diamanten), Glasur mit
Deckschicht und leichter Welligkeit, Kanten minimal gerundet; Fugen aus hellem Mörtel (etwa #d9d3c5, schmal); Farben in **Zonen**
(Streifen längs `d` oder große Rauschflecken), nicht zufällig je Scherbe; einige Scherben mit bemaltem Muster (Blüten, Streifen in
Kobaltblau auf Weiß) in der Ebene der Scherbe.
Palette (Schätzung nach Fotos): Kobalt #1f4e9c, Mitternachtsblau #1b2a55, Türkis #2aa3b8, Grün #4d8f3a, Ocker #e0b12f, Orange #e07a26,
Weiß #f2efe6.

**2. Der Drachenrücken der Casa Batlló.** Das Dach ist ein gewölbter Rücken aus großen glasierten Keramikschuppen in Rötlich, Grün und
Violett; auf dem First liegen große Kugeln, deren Farbe sich von einem Ende zum anderen ändert; der Turm trägt ein Kreuz mit vier Armen
(oft als Lanze des heiligen Georg gedeutet, die den Drachen trifft). Die Fassade ist mit Bruchglas und runden Keramikscheiben auf
Kalkputz besetzt (überwiegend Blau und Grün; rund 330 Scheiben), Säulen wie Knochen, Balkone wie Masken.
*Auf der Form:* große runde Schuppen im Gitterfeld (Abschnitt 1, großer Abstand), glasiert, Farbverlauf längs `d` von Grünblau über
Violett nach Rötlich-Gold, mit Lüsterglanz (Dünnschicht, blickabhängig); auf der Mittellinie oben Kugeln als Kegel-Ersatz in den
Schalen oder als gemalte Halbkugeln mit eigenem Farbverlauf. Fassaden-Spielart: Konfetti aus blaugrünem Bruchglas mit runden Scheiben
auf hellem Putz, alles funkelt.
Palette (Schätzung): Grünblau #3b8a7a, Violett #6c4f8f, Rötlich #b3523e, Gold-Lüster #c9a35a, Putz #e9e1cf.

**3. Das Licht der Sagrada Família.** Die Fenster der Ostseite (Geburt, Morgensonne) sind kühl, vor allem Blau; die der Westseite
(Passion, Abendsonne) Rot und Orange. Nur die unteren Fenster sind stark farbig, die oberen klar mit unregelmäßiger Dicke, damit das
Sonnenlicht weiß in die Gewölbe fällt. Um die Sonnenwenden werfen die Rosetten Farbflecken auf die gegenüberliegenden Säulen.
Joan Vila-Grau baute die Fenster ab 1999 über 20 Jahre in Bleiverglasung (H-Profile geben dem Bild Rhythmus); Gaudí selbst hatte eine
Dreifarbentechnik geplant (Gelb, Cyan, Magenta und Weiß übereinander).
*Auf der Form:* Die Form ist weißer Stein (hellgrauer Sandstein); zwei unsichtbare Fenster werfen farbiges Licht: von einer Seite
Blau-Grün, von der anderen Rot-Orange-Gelb, als weiche Flecken mit Bleilinien-Schatten (Fenstertextur aus Voronoi-Glas und Linien,
vom Licht aus auf die Form gelegt). Ein Regler „Tageszeit“ dreht die Sonne und verschiebt die Flecken. Spielart: die Form selbst als
Bleiglasfenster (durchscheinend nach Dicke, Bleilinien als Fugen).
Palette (Schätzung): Blau #1f4fbf, Cyan #18a3c9, Grün #3fae5a; Rot #c8312a, Orange #f07d1a, Gelb #f5c400; Stein #e8e4da.

### 6.2 Zwei weitere, wenn Zeit bleibt

- **Panot (Gaudís Sechseckfliese, 1904, Escofet):** für die Casa Batlló entworfen, dann in den Diensträumen der Casa Milà verlegt; seit
  1997 als Außenfassung auf dem Passeig de Gràcia. Grün wie Nephrit, einfarbig, Relief: Spirale eines Ammoniten, ein Schlangenstern,
  eine dreieckige Alge; erst sieben Fliesen zusammen ergeben das Meeresbild. *Auf der Form:* Sechseckgitter (Gitterfeld, 60°), je
  Fliese das Relief als Höhe (Spirale, Stern, Alge in drei Drehungen), einfarbig, Licht im Streiflicht. Sehr elegant.
- **La Pedrera (Casa Milà):** gewellte Kalksteinfassade wie Dünen oder Wellen, schmiedeeiserne Balkone wie Algen, Dachkamine als
  „Krieger“ mit Trencadís aus Flaschenglas und Marmor.

### 6.3 Fallen

- Trencadís aus runden Zellen wirkt wie Kiesel; Scherben brauchen gerade Bruchkanten.
- Zu dunkle oder breite Fugen machen ein Gitter statt eines Mosaiks.
- Zufällige Farbe je Scherbe ist Konfetti; Gaudí legt Farbzonen.
- Glasur ohne Spiegelung sieht aus wie Farbe.
- Farbverläufe linear in RGB werden matschig; besser in einem wahrnehmungsgleichen Farbraum (OKLab).
- Das Sagrada-Licht darf den Stein nicht ganz färben; der weiße Stein muss bleiben.

### 6.4 Quellen

- [Generalitat: Park Güell](https://patrimoni.gencat.cat/en/node/1367) · [Wikipedia: Park Güell](https://en.wikipedia.org/wiki/Park_G%C3%BCell)
- [Casa Batlló: Fassade und Dach](https://www.casabatllo.es/en/antoni-gaudi/casa-batllo/facade/) · [Wikipedia: Casa Batlló](https://en.wikipedia.org/wiki/Casa_Batll%C3%B3)
  · [Dezeen 2026: Casa Batlló](https://www.dezeen.com/2026/06/11/casa-batllo-antoni-gaudi-centenary/)
- [Sagrada Família: Licht und Farben der Fenster](https://blog.sagradafamilia.org/en/vitralls-llum-colors-creacio/)
- [Escofet: Die Geschichte des Panot](https://www.escofet.com/en/blog/true-story-gaudis-panot) · [La Pedrera: Böden](https://www.lapedrera.com/en/casa-mila/fun-facts/floors/)

### Empfehlung für Ozzy

1. **Trencadís** auf dem Schuppenpflaster: Scherben mit geraden Kanten, Facetten, Glasur, helle Fugen, Farbzonen, ein paar bemalte
   Scherben. Der schnellste Gaudí-Shader und ein natürlicher Drache.
2. **Batlló-Rücken:** große glasierte Schuppen mit Farbverlauf und Lüsterglanz, Kugeln auf dem Kamm (braucht das Gitterfeld).
3. **Sagrada-Licht:** weißer Stein mit zwei farbigen Fensterlichtern, Regler Tageszeit.
4. **Später:** Panot-Relief im Sechseckgitter.
5. **Probe:** drei Bilder, Ozzys Standardblick. Kriterium: Florian erkennt Barcelona ohne Erklärung.

---

## 7. Zeichenstil nach Vorlage (Oni-Maske)

Vorlage: `docs/look/ozzy/shader/vorlagen/2026-11-21-zeichenstil-oni.webp` (gemessen an einer Fassung mit 1125 × 902 Bildpunkten).
Farben unten aus der Vorlage gemessen (Mittel und Anteile heller und dunkler Bildpunkte in Ausschnitten).

### 7.1 Die Zutaten, genau

**Motiv:** eine Oni-Maske (rot) unter einem weißen Helm mit Hörnern, eine graue Mähne, Hauer, eine türkise Unterlippe, unten
cremeweiße Schnitzerei. Fast jede Fläche ist **geschnitztes Ornament**: Wolkenspiralen (C- und S-Spiralen, Ruyi-Wolken) und Ranken,
dicht, in zwei Größen (große Wirbel, dazwischen kleine Locken), hohes Relief mit tiefen Rillen.

**Linien:**
- Farbe: warmes Schwarzbraun (#1b130b bis #2e140a), nie reines Schwarz.
- Kontur außen und an Überdeckungen 2 bis 3 Bildpunkte (etwa 0,2 % der Bildbreite), innen 1 bis 2 Bildpunkte.
- Leicht zittrig, stellenweise doppelt (zwei Striche um etwa einen Bildpunkt versetzt, wie skizziert), Enden spitz auslaufend; auf der
  Lichtseite brechen Linien ab, auf der Schattenseite sind sie dicker.
- Gezogen werden: Umriss, Überdeckungen, die Ränder der erhabenen Ornamente, die Tiefen der Rillen, einige Grenzen zwischen Licht
  und Schatten.

**Tonstufen:** vier Stufen, mit weichem Pinselrand zwischen Licht und Mittelton (Lasur), härter zur Tiefe:
1. Licht: fast Papierweiß, flach.
2. Mittelton: eine durchsichtige Lasur, weich begrenzt, mit dunklerem Rand der Lasur (wie Aquarell).
3. Schatten: dunklere Lasur plus Schraffur.
4. Tiefe: fast Schwarzbraun in den tiefsten Rillen und Augenhöhlen, klein.
Dazu kleine weiße Lichtpunkte (Augen) und helle Grate auf erhabenen Kanten.

**Schraffur:** im Schatten parallele, dünne Striche (1 Bildpunkt, Abstand 3 bis 4 Bildpunkte), meist schräg um 45°, leicht gebogen
der Form folgend; Kreuzschraffur nur in den dunkelsten Stellen (Augenhöhlen, unter Überhängen). In der Mähne folgen die Striche dem
Fluss der Strähnen. Im Licht keine Schraffur.

**Farben (gemessen, gerundet):**

| Bereich | Licht | Mittelton | Schatten | Tiefe |
|---|---|---|---|---|
| Helm, Hörner, Hauer (kühles Weiß) | #cccfd6 | #bababa / #aeaaa7 | #7a6a58 | #484039 |
| Schnitzerei unten (Creme) | #cac9c9 / #c5c6c1 | #beb6b0 / #b3aa9b | #8a7358 | #594f43 |
| Maske (gedecktes Rot) | #bda39c / #b48e86 | #a47d71 / #976e61 | #704e42 / #57362d | #2e140a |
| dunkle rote Teile (Ohren, Tuch) | #a7928b | #5d3c31 | #3f2318 | #1e0f06 |
| Unterlippe (Türkisgrau) | #9baaa0 / #adbbbb | #849184 | #3c4132 | |
| Mähne (Grau) | #b8babd | #6b665a | #4c4235 | #1b170d |
| Augen | | | | #111007, Reflex #49483f |

Das ganze Bild ist **entsättigt** (etwa 60 bis 70 % einer normalen Darstellung), die Lichter leicht kühl, die Schatten warm: wie ein
alter Druck.

**Papier und Grund:** helles Blaugrau #c1c8ca, darauf ein flaches Muster in Grau #acafab (etwa 8 % dunkler): unregelmäßige Flecken (wie
Flechten oder vergrößerte Same-Komon-Punkte), die in Bögen um einen Punkt außerhalb des Bildes liegen, dazu lange, wellige, parallele
Bänder (wie Jahresringe oder Wasserringe). Ohne Linien, Ränder leicht rau, wie ein Schablonendruck (Katagami). Auf den Flächen ein
feines Papierkorn.

**Licht:** von links oben; gemalt, nicht berechnet: vereinfachte Schattenformen, kaum Schlagschatten, starke Verdunklung in Rillen
(Höhlenschatten), helle Grate.

### 7.2 Einordnung

Eine Mischung aus drei Traditionen: **Federzeichnung mit Schraffur** (westliche Illustration, Manga), **Gongbi-artiger Aufbau** (erst
die feine Linie, dann Farbe in durchsichtigen Lasuren) und **gerendertem 3D-Relief**. Bilder dieser Art entstehen häufig als Übermalung
einer ZBrush-Skulptur oder mit dessen NPR-Filtern (seit ZBrush 2019: Konturen, Schraffur in Schattenbereichen, Rasterfolie,
Posterisierung). Das Ornament ist ostasiatisch: Xiangyun (glückverheißende Wolken, aus C- und S-Spiralen; in Japan Zuiun) und Unkimon
(Wolkendampf-Muster).

### 7.3 Stand der Technik

**Linien aus 3D:**
- Umriss und Überdeckung (Normale steht quer zum Blick), Knicke, Grate und Täler (Extremwerte der Krümmung), **suggestive Konturen**
  (DeCarlo u. a. 2003: wären in nahen Ansichten Umriss), **scheinbare Grate** (Judd, Durand, Adelson 2007: blickabhängig).
  Übersicht: Bénard und Hertzmann 2019.
- **Im Bild aus dem G-Puffer:** Saito und Takahashi 1990 haben den G-Puffer genau dafür erfunden (Sprünge in Tiefe und Normale als
  Linien). **Linien aus abstrahierter Schattierung** (Lee u. a. 2007): Linien an den Tälern der weichgezeichneten Schattierung, auf
  der Grafikkarte; passt direkt zu unseren Vollbild-Durchgängen.
- **Linienstärke:** nach Isophotenabstand (Goodwin, Vollick, Hertzmann 2007: dicker, wo das Schattenband am Umriss breiter ist, mit
  Mindest- und Höchstbreite); nach Abstand zur Kamera (Pencil+ 4: Linien als gestempelte Pinselspur, Größe und Deckung nach Abstand).
- **Programme:** Blender Line Art (Kontur, Silhouette, Knick, Schnitt, Materialgrenze, Lichtkontur und Schlagschatten, Ebenen der
  Verdeckung), Pencil+ 4 (Max, Maya, Blender), ZBrush NPR, RenderMan Stylized Looks.

**Schraffur in Echtzeit:**
- **Tonal Art Maps** (Praun, Hoppe, Webb, Finkelstein 2001): Strichbilder je Tonstufe, ineinander geschachtelt, damit Striche beim
  Abdunkeln bleiben und nur neue dazukommen; über die Fläche gelegt nach einem Krümmungsfeld. Webb u. a. 2002: feinere Tonsteuerung
  im Pixel-Shader.
- **Schraffur längs der Hauptkrümmung** (Hertzmann und Zorin 2000), Kreuzschraffur im Dunklen.

**Tusche und Lasur:** Aquarell in Echtzeit (Montesdeoca u. a. 2016, 2017): Randabdunklung der Lasur, Pigmentballung, Papierkorn,
Trockenpinsel, Lücken und Überlappungen, örtlich steuerbar.

**Ornament aus dem Rechner:** Wong, Zongker, Salesin 1998 (Blumenornament in Regionen, erst Geometrie, dann Stil); Xu und Mould 2009
(Magnetkurven: ein Teilchen mit wechselnder Ladung zieht Kurven mit stetig wechselnder Krümmung; Beispiele Flammen, Haare, Bäume).

### 7.4 Ornament-Relief auf glatten Formen, dann gezeichnet

Unsere Formen sind glatt; die Vorlage lebt vom Relief. Also erzeugt der Shader das Relief selbst, als Höhe h im Raum der Form, und
zeichnet es dann.

1. **Raster der Motive:** Mitten aus dem Gitterfeld (Sechseck, regelmäßig wie geschnitzt) oder, ohne Gitterfeld, aus Zellen im Raum
   (unregelmäßig, wie die Vorlage). Jedes Motiv hat einen eigenen Rahmen aus S und Q.
2. **Motiv „Wolkenspirale“:** in örtlichen Koordinaten (x, y) um die Mitte: r = Länge, θ = Winkel; archimedische Spirale über
   s = r/a − θ/2π; Grat = Profil(fract(s)) für 1,5 bis 2,5 Windungen; ein Schwanz als Band, das tangential zum Nachbarn läuft; als
   Ruyi zwei gespiegelte Spiralen. Zweite Größe: kleine Locken (Drittel der Größe) in den Lücken, wo die großen niedrig sind.
3. **Verbinden:** weiche Vereinigung (smooth max) der Motive, Rillen zwischen ihnen.
4. **Normale** aus dem analytischen Gefälle von h (wie beim T-Rex), Höhlenschatten aus niedrigem h.
5. **Linien:** Umriss und Überdeckung aus dem G-Puffer (`kanteBei`); Ränder der erhabenen Ornamente als Höhenlinie h = ½; Rillen als
   Täler von h. Breite in Bildpunkten über `fwidth(h)`, damit sie bei jedem Zoom gleich dünn bleiben; auf der Schattenseite dicker
   (Näherung an den Isophotenabstand); Zittern und Doppelstrich über Rauschen **im Raum der Form** (sonst schwimmen sie).
6. **Ton:** vier Stufen aus Licht mal Höhlenschatten, weiche Grenze zur Lasur mit dunklem Lasurrand, harte zur Tiefe.
7. **Schraffur im Raum:** Schnittlinien der Form mit parallelen Ebenen (Phase = Lage · Richtung · Frequenz) sind genau die
   Querkonturen, die Zeichner um eine Form legen; Breite über `fwidth` konstant. Dichte nach Ton wie bei Tonal Art Maps: eine Schar im
   Schatten, die zweite (Kreuzschraffur) in der Tiefe. Mit dem Gitterfeld liegen die Linien sogar in gleichem Abstand auf der Haut.
8. **Farbzonen:** Ohne Teile der Form kann der Shader keine Maske und keinen Helm trennen. Vorschlag: Zonen nach der Höhe des Reliefs
   (erhaben Weiß oder Creme, Grund Rot) oder große Rauschflecken; Spielart **„Schnitzlack“**: roter Lack mit geschnitztem Relief
   (wie chinesischer Schnitzlack), das passt zur Vorlage.
9. **Papier und Druck:** Papierkorn, Entsättigung auf etwa 65 %, kühle Lichter, warme Schatten.
10. **Bühne „Zeichengrund“:** #c1c8ca mit dem Flecken- und Bändermuster in #acafab (Flecken: Voronoi mit verrauschtem Rand auf Ringen
    um einen Punkt außerhalb des Bildes; Bänder: Abstand zu verwellten Ringen).

### 7.5 Fallen

- Linien mit Rauschen im Bildraum schwimmen beim Drehen; alles Zittern gehört in den Raum der Form.
- Dünne Schraffur flimmert und bildet Moiré am Umriss: geglättete Linien, Dichte mit dem Zoom anpassen (neue Striche dazwischen,
  wie bei Tonal Art Maps).
- Linienbreiten in Weltmaß werden beim Zoomen fett oder verschwinden; Breiten in Bildpunkten rechnen.
- Zu gleichförmiges Ornament wirkt wie Tapete; zwei Größen und leichte Streuung.
- „Genauso“ heißt: gleiche Ansicht (Dreiviertel, Licht von links oben), gleiche Linienbreite in Bildpunkten, gleiche Entsättigung.

### 7.6 Quellen

- [Maxon: ZBrush NPR](https://help.maxon.net/zbr/en-us/Content/html/user-guide/materials-lights-rendering/rendering/npr/npr.html)
  · [Digital Production: NPR-Filter in ZBrush 2019](https://digitalproduction.com/2021/09/01/die-neuen-npr-filter-in-zbrush/)
- [Bénard, Hertzmann 2019: Line Drawings from 3D Models](https://arxiv.org/pdf/1810.01175) · [DeCarlo u. a. 2003: Suggestive Contours](https://gfx.cs.princeton.edu/proj/sugcon/)
  · [Judd 2007: Apparent Ridges (Masterarbeit)](https://people.csail.mit.edu/tjudd/TilkeJuddMasters.pdf)
- [Saito, Takahashi 1990: Comprehensible rendering of 3-D shapes](https://www.cs.princeton.edu/courses/archive/fall00/cs597b/papers/saito90.pdf)
  · [Lee u. a. 2007: Line drawings via abstracted shading](https://history.siggraph.org/?p=115327)
- [Goodwin, Vollick, Hertzmann 2007: Isophote Distance](https://www.dgp.toronto.edu/~todd/isophote) · [Pencil+ 4 Line](https://docs.psoft.co.jp/plb400w/en/4.0.0/reference/Line_LineSet.html)
  · [Blender: Line Art](https://docs.blender.org/manual/en/latest/grease_pencil/modifiers/generate/line_art.html)
- [Praun u. a. 2001: Real-Time Hatching](https://hhoppe.com/proj/hatching/) · [Webb u. a. 2002: Fine Tone Control](https://pixl.cs.princeton.edu/pubs/Webb_2002_FTC/Webb_2002_FTC.pdf)
  · [Hertzmann, Zorin 2000: Illustrating smooth surfaces](https://mrl.cs.nyu.edu/publications/illustrating-smooth/)
- [Montesdeoca u. a. 2016: Art-directed Watercolor Rendered Animation](https://diglib.eg.org/handle/10.2312/exp20161063)
  · [Montesdeoca u. a. 2017: Edge- and substrate-based effects](https://diglib.eg.org/handle/10.2312/npar2017a02)
- [Wong, Zongker, Salesin 1998: Computer-generated floral ornament](https://history.siggraph.org/?p=116574)
  · [Xu, Mould 2009: Magnetic Curves](https://diglib.eg.org/items/5da6061c-e7e8-4967-a2e1-f9c23978a92a/full)
- [Wikipedia: Xiangyun](https://en.wikipedia.org/wiki/Xiangyun_(Auspicious_clouds)) · [JAANUS: unkimon](https://projects.mcah.columbia.edu/jaanus/record/unkimon)

### Empfehlung für Ozzy

1. **Ein Shader „Tusche“** mit vier Teilen: Ornament-Relief (Wolkenspiralen in zwei Größen), Linien (Umriss, Ornamentränder, Rillen;
   Breite in Bildpunkten, auf der Schattenseite dicker, Zittern im Raum der Form), vier Tonstufen mit Lasur, Schraffur und
   Kreuzschraffur im Raum.
2. **Palette und Druck aus der Vorlage** (Tabelle oben), Entsättigung, Papierkorn; Bühne „Zeichengrund“ mit Flecken und Bändern.
3. **Farbzonen nach Reliefhöhe**, Spielart „Schnitzlack“.
4. **Regler:** Ornament (aus, fein, dicht), Schraffur, Linienstärke, Farbe (Rot, Weiß, Creme, Türkis, Grau).
5. **Probe:** gleicher Blick wie die Vorlage, nebeneinander, an „strange bird“. Kriterium: Florian sagt „genauso“; sonst nennt er,
   was fehlt.

---

## 8. ASCII, „Matrix 2.0“

### 8.1 Die Vorlage

`docs/look/ozzy/shader/vorlagen/2026-11-21-ascii-flow.webp`: „ASCII Flow“ aus einem Paket von three.js-Shadern in TSL (für WebGPU). Jede Zeichenzelle liest
ein fließendes Rauschen und zeichnet ein Zeichen aus einer Rampe mit neun Stufen (Leer . : - + x o # @), in Terminalgrün (Grund
#020604, dunkle Zeichen #0e5a2c, helle #b6ffc8) oder einem anderen Zweifarbverlauf, mit Phosphorglühen, Zeilen und einem Zeiger, der
den Text aufleuchten lässt (Stärke 0,80). Stile: Original, Brand Neon, Big Type, Amber Static. Der Ursprung des Pakets war nicht zu
finden. TSL läuft nicht in Ozzys `RawShaderMaterial`; die Idee wird in GLSL neu gebaut.

### 8.2 Stand der Technik

- **Acerola (ASCII-Shader in AcerolaFX, gelesen):** Kacheln von 8 × 8 Bildpunkten. Kanten aus Differenz zweier Gauß-Filter (und auf
  Wunsch aus Tiefe und Normale), dann Sobel, Winkel in vier Richtungen (senkrecht, waagrecht, zwei Diagonalen); je Kachel zählt eine
  Abstimmung, welche Richtung am häufigsten ist, und erst ab einer Mindestzahl wird ein Kantenzeichen (| _ / \) gesetzt. Sonst ein
  Füllzeichen aus zehn Helligkeitsstufen (Schriftbild als Textur), Farbe einstellbar, Nebel nach Tiefe.
- **Alex Harri, „ASCII characters are not pixels“:** Zeichen nach ihrer **Form** wählen, nicht nur nach Helligkeit. Je Zeichen ein
  Formvektor aus sechs versetzten Abtastkreisen (wie viel des Kreises das Zeichen deckt), normiert; je Zelle derselbe Vektor aus dem
  Bild; nächster Nachbar (k-d-Baum oder Zwischenspeicher mit 5 Bit je Wert). Dazu Kontrastverstärkung global (v' = (v/max)^e · max)
  und gerichtet (äußere Kreise in den Nachbarzellen gegen Treppen). Auf der Grafikkarte in sechs Durchgängen, viel schneller als auf
  dem Prozessor. Ergebnis: Umrisse werden scharf und glatt.
- **Schrift aus echten Zeichen:** Mehrkanal-Abstandsfelder (MSDF, msdfgen) halten Kanten und Ecken bei jeder Größe scharf.
- **Matrix-Regen:** Der Code im Film besteht aus gespiegelten Halbbreiten-Katakana, lateinischen Buchstaben und Ziffern (Schrift von
  Simon Whiteley). Beobachtung am Vorspann: Die Zeichen bleiben stehen, nur die Kette wächst nach unten; Zeichen wechseln nach drei
  Bildern mit einem Überblendbild; etwa jede fünfte Kette hat ein helles Kopfzeichen; manchmal stocken alle Köpfe gemeinsam.
  Rezmason/matrix (WebGL, WebGPU): Tropfen als Lichtwellen über feststehenden Zeichen, Abstand über eine Sägezahnfunktion mit
  wechselnder Breite, helle Köpfe, Zeichenwechsel als eigener Effekt, MSDF-Zeichen (klassischer Satz und der Satz aus „Resurrections“
  mit rund 135 Zeichen), Bloom, Farbverläufe, Spiegelung mit Wellen beim Klicken, ein 3D-Modus.
- **Röhrenbild:** Bloom und Halation, Zeilen, Maske (Streifenmaske ist bei niedriger Auflösung am leichtesten), Nachleuchten,
  Wölbung, Flimmern (crt-royale, Lottes).

### 8.3 Erweiterungen für eine 3D-Form („Matrix 2.0“)

1. **Echte Zeichen:** ein Atlas aus Matrix-Zeichen (gespiegelte Katakana, Ziffern, Zeichen) und ASCII als MSDF.
2. **Form statt Rauschen:** Die beleuchtete Form (Studio plus Randlicht) bestimmt die Helligkeit; innerhalb der Form wählt die Zelle das
   Zeichen nach dem Formvektor (Harri), damit Wölbungen und Umrisse gezeichnet wirken.
3. **Kanten aus dem G-Puffer statt aus dem Bild:** Richtung aus Sprüngen in Tiefe und Normale (Strukturtensor über die Zelle), dann
   gerichtete Zeichen am Umriss (| _ / \ oder Katakana mit passendem Strich). Schärfer und ruhiger als Differenz von Gauß-Filtern.
4. **Regen, der die Form kennt:** Spalten im Bild; außerhalb der Form schwacher Regen, innerhalb dichter und heller, Köpfe weiß; die
   Spur leuchtet nach dem Licht der Form. Spielart **„Code-Haut“** (mit Gitterfeld): Zeichen haften auf der Haut, ausgerichtet nach S
   und Q, der Regen fließt längs S über den Körper und bleibt beim Drehen an der Form.
5. **Tiefe:** Zellgröße nach Tiefe (nah große Zeichen, „Big Type“), Regenschichten im Hintergrund mit Parallaxe, Nebel nach Tiefe.
6. **Zeiger:** als Lampe auf der Form; dazu eine Welle, in der die Zeichen kurz zu lesbarem Text werden („Entschlüsseln“, etwa der Name
   der Form) und dann zurückfallen; Klick als Ring.
7. **Röhre:** Nachleuchten über einen Puffer, der jedes Bild abklingt (Drehen zieht grüne Spuren), Bloom über eine Mip-Kette, Zeilen,
   Streifenmaske, leichte Wölbung, Vignette, Flimmern.
8. **Stile:** Matrix-Grün, Bernstein (wie Amber Static), Weißphosphor, Neon, Big Type, „Resurrections“ (Türkis und Gold), dazu ein
   seltener Déjà-vu-Ruck (ein Bildstreifen wiederholt sich).

**Aufbau:** Durchgang 1 in Zellauflösung (bei 12 Bildpunkten je Zelle rund 15 000 Zellen in 1080p): Formvektor, Kantenrichtung,
Regenstand, Wahl des Zeichens (64 Zeichen durchsuchen ist auf der Grafikkarte billig). Durchgang 2 in voller Auflösung: Zeichen aus dem
Atlas, Farbe, Nachleuchten; dann Bloom und Röhre. Geschätzt 2 bis 3 ms auf dem M3 Pro, am iPhone Bloom in halber Auflösung.

### 8.4 Fallen

- Dünne Striche der Zeichen flimmern ohne Abstandsfeld und ohne Glättung.
- Zellraster und Zeilen der Röhre bilden Moiré; Zeilenabstand an die Zellhöhe koppeln.
- Zu viel Bloom macht Brei; die Zeichen müssen lesbar bleiben.
- Nachleuchten verschmiert beim Drehen; Abklingen kurz halten oder nur im Stand.
- Lizenz der Zeichensätze prüfen (Katakana-Schrift, Atlanten aus fremden Projekten).

### 8.5 Quellen

- [Alex Harri: ASCII characters are not pixels](https://alexharri.com/blog/ascii-rendering)
- [AcerolaFX: AcerolaFX_ASCII.fx](https://github.com/GarrettGunnell/AcerolaFX)
- [Rezmason/matrix](https://github.com/Rezmason/matrix) · [msdfgen](https://github.com/Chlumsky/msdfgen)
- [Wikipedia: Digital rain](https://en.wikipedia.org/wiki/Digital_rain) · [Analyse des Regens im Film](https://carlnewton.github.io/digital-rain-analysis)
  · [befores & afters: Secrets of the Matrix code](https://beforesandafters.com/2019/03/27/secrets-of-the-matrix-code/)
- [libretro: crt-royale](https://docs.libretro.com/shader/crt_royale/) · [Emulation Wiki: CRT shaders](https://emulation.gametechwiki.com/index.php/CRT_Shaders)

### Empfehlung für Ozzy

1. **„Matrix 2.0“ in GLSL neu**, mit MSDF-Atlas aus Matrix-Zeichen und ASCII.
2. **Zeichen nach Formvektor** (Harri) aus der beleuchteten Form, **Kanten aus dem G-Puffer** als gerichtete Zeichen.
3. **Regen, der die Form kennt** (innen dicht und hell nach Licht, außen schwach); später **Code-Haut** auf dem Gitterfeld.
4. **Zeiger als Lampe und Entschlüsseln-Welle**, Zellgröße nach Tiefe, Röhre mit Nachleuchten; Stile Grün, Bernstein, Neon, Big
   Type, Resurrections.
5. **Probe:** zehn Sekunden mit Drehung und Zeiger. Kriterium: Florian sagt „Matrix 2.0“.

---

## Vorschlag für die Reihenfolge

1. **Gitterfeld und Schlange** (Look-Probe zuerst, dann das Feld): der größte Hebel, trägt Drache, Krokodil, Chamäleon, Panot,
   Batlló und Code-Haut.
2. **Drache** auf dem Gitterfeld mit Glutkern und Juwelenbauch.
3. **Tusche (Oni-Stil):** Florian nannte die Vorlage „wunderschön“; braucht das Gitterfeld nicht zwingend.
4. **Matrix 2.0**, **Schleim**, **Steine**, **Trencadís und Sagrada-Licht**: unabhängig, in beliebiger Reihenfolge.
5. **Krokodil, Chamäleon, Batlló, Panot** nach dem Gitterfeld.

Jeder Schritt mit seiner Probe; was Florian nicht freigibt, wird nicht gebaut.
