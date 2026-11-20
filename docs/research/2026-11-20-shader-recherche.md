# Recherche: Shader für Ozzy (20.11.2026)

Auftrag (Florian, 20.11.): 20 spektakuläre Shader als Voreinstellungen für Ozzy, völlig verschiedene Stile, von hyperrealistisch bis
zur animierten Simulation, brennend und tropfend, Flüssigkeit, Rauch und Feuer, experimentelle Visualisierungen. Zehn davon nach
„Spider-Man: Across the Spider-Verse“ (dazu, was über den nächsten Teil bekannt ist), zehn frei. Dazu ein Shader aus nur einer Linie,
die sich ständig flüssig verformt, sodass das Shading entsteht (Vorlage: `docs/look/ozzy/shader/2026-11-20-florian-vorlage-eine-linie.webp`).

## 1. Across the Spider-Verse (Sony Pictures Imageworks, 2023)

Was die Fachartikel und die Vorträge der SIGGRAPH 2023 über die Welten sagen (Quellen unten). Zahlen zu Rasterweiten, Winkeln und
Farben nennt keine Quelle; die setzen wir selbst.

**Für alle Welten**
- Der Look entsteht zum großen Teil im Compositing (Nuke) über den Renderpässen: teure 3D-Technik durch eine Lösung im Comp ersetzt.
- Farben mischen subtraktiv wie Pigment („PigmentMerge“), nicht additiv zu Weiß hin.
- Animation auf Einern, Zweiern, Dreiern „bis zu Sechsern“ (24, 12, 8 … 4 Bilder je Sekunde); „StepSets“ rechnet Stoff, Haar und
  Effekte im selben Takt neu. Auch die Linien müssen dem Takt folgen.
- Linien („Kismet“, Houdini): 3D-Kurven, etwas vom Körper abgesetzt, „nicht perfekt mit der Kante verheiratet“; sie zeichnen sich
  laufend an und radieren sich aus, damit sie bei jeder Ansicht stimmen. Von klar und architektonisch bis skizzenhaft. Rund hundert
  Millionen Linien im Film, ein eigenes Tusche-Team. Der Autor lehnt Kantenerkennung im Comp ab („so zeichnen Künstler nicht“).

**Earth-1610 (Miles):** Schraffur ist Licht: Schraffurlinien bauen die Schatten (Werkzeuge „Hatcher“ und „Thresher“: Punkte und
Linien dick oder dünn nach dem Shading; Rastergröße, Winkel und Abstand von Hand). Halbtonpunkte im Randlicht laufen mit der Figur
mit, sonst „schwimmt er durch ein Muster“. Glanz und Glühen aus gestreuten Punkten. „ChromaShifter“: Farbversatz statt Tiefenunschärfe
(Fehlpasser statt Defokus); mit Bewegungsvektoren gefüttert entstehen Bewegungsspuren. „Separator“: CMYK-Druck mit Fehlpasser und
Verzerrungen. Linien im Gesicht aus einem gelernten Werkzeug.

**Scarlet Spider (Schraffur-Methode):** Die Richtung der Schraffur folgt der Wölbung der Muskeln und reagiert auf Licht und
Verformung (Fließkarten aus Mari, Verdeckung und Fresnel aus Katana, im Comp zur Schraffur verrechnet).

**Earth-65 (Gwen):** lockere Pinselführung nach Jason Latour, Cover von Robbi Rodriguez mit senkrechten Streifen; die nasse
Aquarell-Idee („wet on wet“) ist neu für den Film. Echte Farbe gemalt und eingescannt (Diffusion, Reiben, ein Pinsel, der Farben
aufnimmt und verschmiert). Pinselstriche sitzen im Raum, folgen der Fläche, wechseln die Richtung und halten bei Kamerafahrten. Die
Welt „ändert sich ständig, fast wie ein Stimmungsring“. Rebelle (Malprogramm mit Aquarell-Löser: Nässe, Schwerkraft, Saugen) liefert
Elemente, die in Houdini animiert werden.

**Mumbattan (Pavitr, Earth-50101):** Indrajal Comics der Siebziger: billig, eilig, vereinfacht, Hintergründe lösen sich in Umrisse
auf. Pulpiges Papier, Druck außer Register, begrenzte Palette, die Linien tragen die Details; lockere Linien laufen über die Kanten
hinaus. Licht: warme Farbfamilie (Rot, Gelb) gegen kalte (Blau, Grün) nach Entfernung; Figuren immer dunkel auf hell oder hell auf
dunkel.

**Spider-Punk (Hobie, Earth-138):** Jeder Teil steppt in seinem eigenen Takt: Jacke auf Vierern, Körper auf Dreiern, Gitarre noch
langsamer (auch Sechser genannt). Renderings mit den Spuren von Druck und Fotokopie alter Punk-Poster. Collage aus Schichten.

**Nueva York 2099 (Miguel, Earth-928):** nach Syd Mead: „weniger Pinselstrich, mehr Marker“. Markertinte ist durchsichtig, Überlagerungen
werden dunkler, nur wenige Schichten, kontrollierte Strichlage. Weiße Glanzlichter gemalt; oben die helle, saubere Stadt, darunter
die dunkle, neonbeleuchtete Unterwelt. Aus der Ferne Rot, Schwarz, Blau, von nahem mesoamerikanische Muster im Anzug.

**The Spot:** skizzenhafte Bleistiftlinien, weiße Acrylfarbe, Massen von Tintenflecken; Ziel: fließendes Aquarell, tropfende Farbe,
blutende Tinte. „MaskToInk“ macht aus einer Maske nasse Tinte; wie weit sie sich ausbreitet, hängt von der Nässe der Fläche ab. Er
hinterlässt Tintentropfen, wenn er sich bewegt.

**Vulture (Renaissance):** Skizze auf Pergament über einem voll geriggten 3D-Modell, etwa vier Schichten Linien, auch außerhalb des
Körpers; Papier aus überblendeten Projektionen, damit es nicht aufgeklebt wirkt; Flügel flackern wie ein Daumenkino, leicht von
hinten durchleuchtet.

**Glitch:** Figuren in der falschen Welt flackern zwischen Looks (schon im ersten Film beim Collider). Technik nicht beschrieben.

## 2. Beyond the Spider-Verse (angekündigt für Juni 2027)

- Erste Szene und Standbilder auf der CinemaCon (13.04.2026): Miles auf Earth-42 bei seinem Gegenstück, dem Prowler; Miles gegen
  Spider-Man 2099 in einem Dimensionsportal.
- Lord und Miller (Herbst 2026): Die Looks folgen nicht den Regeln der 3D-Animation, sondern sind „viel mehr im Stil eines
  2D-Multiplane“; die Kamera läuft wie beim Realfilm, mit Kameraleuten, die virtuell aus der Hand drehen.
- Was wir davon nehmen: **Multiplane** (die Form in flachen, gemalten Ebenen hintereinander, mit Parallaxe und Handkamera) und
  **Earth-42** (die Welt, in der der Film spielt: dunkel, Grün und Violett, Sprühfarbe).

## 3. Was in den letzten Jahren für Staunen gesorgt hat

- **Liquid Glass** (Apple, 2025): Glas mit Lichtbrechung, Rand-Glanz, Linsenwirkung; seit 2026 viele Nachbauten in WebGPU/TSL.
- **Flüssigkeits-Simulation im Browser** (WebGL-Fluid nach Stam, MLS-MPM in WebGPU), Rauch und Feuer mit Auftrieb und Wirbeln.
- **ASCII- und Dither-Shader** (2025/2026 eine Welle von Tutorials; „formbewusstes“ ASCII statt Helligkeitsrampe).
- **Kuwahara-Malerei**, **Moebius-Linien**, **Partikel-Auflösung** („Gommage“: Text zerfällt zu Staub, Codrops 01/2026).
- **Differential Growth** (Inconvergent, Jason Webb): eine Linie, die wächst, sich faltet und nie schneidet. Damit lässt sich Florians
  Vorlage bauen: Der Abstand der Linie zu sich selbst folgt der Helligkeit, dunkel ist dicht, hell ist weit.

## Quellen

- Before & After, Inking-Team: https://beforesandafters.com/2023/06/28/this-was-the-first-cg-animated-movie-ive-ever-heard-of-that-actually-had-a-dedicated-inking-team/
- Before & After, Hand-made quality (Kismet): https://beforesandafters.com/2024/01/10/giving-spider-man-across-the-spider-verse-that-crucial-hand-made-quality/
- Before & After, Hobies Bildraten: https://beforesandafters.com/2023/06/17/the-across-the-spider-verse-spider-punk-character-hobie-was-animated-with-different-frame-rates-for-different-parts-of-his-own-body-and-accessories/
- Motion Picture Association, Bret St. Clair: https://www.motionpictures.org/2023/06/spider-man-across-the-spider-verse-look-of-picture-supervisor-bret-st-clair-on-spider-punk-mumbattan-more/
- Foundry, Nuke, Mari, Katana: https://foundry.com/insights/film-tv/across-the-spider-verse-nuke-mari-katana
- Foundry, Graphic look in comp (erster Film): https://foundry.com/insights/film-tv/graphic-look-in-comp-spiderman
- VFX Voice: https://vfxvoice.com/diversity-reigns-supreme-in-spider-man-across-the-spider-verse/
- SIGGRAPH 2023: „Linework in Spider-Man Across the Spider-Verse“ https://history.siggraph.org/learning/linework-in-spider-man-across-the-spider-verse-by-grochola-maccari-lee-and-boulet-gilly ; „Repainting the Spider-Verse“ https://history.siggraph.org/learning/repainting-the-spider-verse-by-maccari-grochola-nicol-blaskovic-and-fapso ; „Non-photorealistic compositing of the Spider-Verse“ https://history.siggraph.org/learning/non-photorealistic-compositing-of-the-spider-verse-by-davignon-and-st-clair/
- Escape Motions (Rebelle): https://escapemotions.com/blog/from-brush-to-big-screen-role-of-rebelle-in-crafting-spider-man-across-the-spider-verse
- Beyond, CinemaCon: https://www.thewrap.com/creative-content/movies/spider-man-beyond-the-spider-verse-footage-description-cinemacon/ ; https://www.cinemablend.com/superheroes/spider-man/how-spider-man-beyond-the-spider-verses-first-footage-picked-up-miles-morales-cliffhanger
- Beyond, Multiplane und Kamera: https://www.comingsoon.net/movies/news/2212480-spider-man-beyond-the-spider-verse-new-animation-technology-lord-miller ; https://toonado.com/movies/beyond-the-spider-verse-goes-2d-multiplane-with-handheld-virtual-cameras-a10443
- Liquid Glass in TSL (Codrops 09/2026): https://tympanus.net/codrops/2026/09/08/building-an-infinite-liquid-glass-grid-with-three-js-webgpu-and-tsl/
- ASCII formbewusst (Codrops 09/2026): https://tympanus.net/codrops/2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js/
- Gommage (Codrops 01/2026): https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/
- Differential Growth: https://medium.com/@jason.webb/2d-differential-growth-in-js-1843fd51b0ce ; https://github.com/inconvergent/differential-line
