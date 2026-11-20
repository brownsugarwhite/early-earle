# Plan: 20 Shader als Voreinstellungen für Ozzy (20.11.2026)

Auftrag (Florian, 20.11.): „verschiedene shader und materialien als voreinstellungen für ozzy … die ersten 20 … absolut spektakulär
… völlig verschiedene styles … von hyperrealistisch zu animierten simulationen. Brennend und tropfend … flüssigkeitssimulationen und
rauch/feuersimulationen, experimentelle visualisierungen“. Zehn nach „Across the Spider-Verse“ (mit dem, was über den nächsten Teil
bekannt ist), zehn frei; einer davon „aus nur einer linie … die sich ständig flüssig so verformt, dass das eigentliche shading
entsteht … kurven … in verschiedenen größen wechselnd und sich dabei nicht berühren“ (Vorlage
`docs/look/ozzy/shader/2026-11-20-florian-vorlage-eine-linie.webp`). Recherche: `docs/research/2026-11-20-shader-recherche.md`.

**Wo:** eigener Zweig `claude/ozzy-shader` (von `claude/ozzy-maul`), Arbeitsbaum `.claude/worktrees/ozzy-shader`, Fenster **5219**
(Eintrag `ozzy-shader`). Florians Fenster 5205 und die Sitzung „Maul“ bleiben unberührt; zusammengeführt wird erst auf sein Wort.

## Aufbau

- **Ein Renderer für alle Shader** (`apps/editor/src/ozzy/shader/`): `ShaderHaut` zeichnet die Haut des Werks (dieselbe glatte
  Anzeige wie Solid und Wachs) mit Ozzys WebGL-Renderer, in eigene Ziele, und legt das Ergebnis über den Grund. Jeder Shader ist eine
  Voreinstellung in einer eigenen Datei: Durchgänge über das Netz (Daten, Vorder- und Rückseite, Tiefe), Durchgänge über das ganze
  Bild (Druck, Linien, Simulation), am Ende ein Bild mit Deckung.
- **Gemeinsame Bausteine:** Rauschen (Simplex, fBm, Curl, Voronoi), Farbe (Spektrum, Schwarzkörper, CMYK, Tonemapping), Druck
  (Halbton, Schraffur, Papier), ein Studio-Licht, ein 2D-Strömungslöser (Navier–Stokes nach Stam, mit Wirbeln und Auftrieb), ein
  Partikelsystem auf der Grafikkarte.
- **Bühne:** Ein Shader darf seinen eigenen Grund mitbringen (dunkel für Feuer, Sterne für den Ereignishorizont, Studio für Glas),
  abschaltbar; ohne Bühne steht die Form auf Ozzys Weiß.
- **Takt:** Ein bewegter Shader hält das Bild am Laufen, solange er zu sehen ist; ein ruhender zeichnet nur bei Änderungen. Was in
  Spider-Verse auf Zweiern oder Dreiern läuft, steppt hier ebenso.
- **In Ozzy:** Knopf „Shader“ neben den Materialien, eine Wahl mit allen 20 (zwei Gruppen), Taste ⇧M für den nächsten, Feinregler je
  Shader (Tempo, Stärke, Farbe …), `?shader=<name>` für Proben. Schnitt beim Einrasten, Spiegelschnitt und Röntgen wie bei den
  anderen Materialien.
- **Technik:** WebGL 2 mit GLSL ES 3.0 (Ozzys Renderer; läuft auf Mac, iPhone, iPad und in den Proben). Simulationen in halber oder
  viertel Auflösung. Die eine Linie rechnet in einem Worker.

## Die zehn nach Spider-Verse

1. **Comicdruck** (Miles, Earth-1610): Licht als Schraffur und Ben-Day-Punkte, CMYK in vier Rastern mit eigenem Winkel, Fehlpasser
   statt Unschärfe (je weiter vor oder hinter der Mitte, desto mehr), Randlicht aus Punkten, die mit der Form laufen, Tuschelinien
   abgesetzt von der Kante, Linien auf Zweiern.
2. **Aquarell** (Gwen, Earth-65): nasse Lasuren in wenigen Stufen, Pigmentränder, Granulation im Papier, Farbe blutet über den Umriss,
   senkrechte Streifen und Tropfen, die nach unten laufen; die Farben wandern wie ein Stimmungsring.
3. **Indrajal** (Pavitr, Mumbattan): Siebziger-Comicdruck auf vergilbtem Papier, Gravur-Schraffur, die der Wölbung folgt, wenige
   satte Farben (Safran, Magenta, Türkis, Gold), Druck außer Register, lockere Linien über die Kante.
4. **Punk-Collage** (Hobie, Earth-138): ausgerissene Papierstücke mit weißem Rand, Fotokopie mit Toner-Rauschen, grobe Raster,
   Zeitungstext, Rot, Blau, Schwarz; jede Schicht steppt in eigenem Takt (Dreier, Vierer, Sechser).
5. **Marker 2099** (Miguel, Earth-928): Syd-Mead-Marker: durchsichtige Striche, die sich zu Dunkel überlagern, Chrom-Horizont im Glanz,
   weiße Gouache-Lichter, Neonkanten; aus der Nähe ein mesoamerikanisches Stufenmuster.
6. **Tintenfleck** (The Spot): weiße Form mit Bleistiftlinien, die zittern; Tintenflecken als Portale, deren Rand wie nasse Tinte
   ausläuft und tropft; in den Flecken flackert eine andere Welt; Tintenspritzer bei Bewegung.
7. **Da Vinci** (Vulture): Sepia auf Pergament, linkshändige Schraffur, Kreuzschraffur in der Tiefe, Konstruktionslinien und
   Spiegelschrift um die Form, Daumenkino-Flackern, von hinten durchleuchtetes Papier.
8. **Glitch** (Anomalie): die Form springt zwischen Welten: verschobene Streifen, getrennte Farbkanäle, Pixelblöcke, kurze Blitze in
   anderen Looks.
9. **Earth-42** (Prowler, die Welt von Beyond): Nacht, Violett und Säuregrün im Randlicht, Sprühfarbe mit Overspray und Läufern, die
   tropfen, grobes Korn.
10. **Multiplane** (Beyond the Spider-Verse: „2D-Multiplane“, Handkamera): die Form in flachen, gemalten Ebenen hintereinander wie
    Cels auf Glas, mit eigenem Umriss und Schlagschatten, übertriebene Parallaxe beim Drehen, Handkamera und Schärfe, die zieht.

## Die zehn freien

11. **Eine Linie** (Florians Vorlage): eine einzige geschlossene Linie, die im Bild wächst, sich faltet und sich nie berührt
    (Differential Growth). Ihr Abstand zu sich selbst folgt der Helligkeit der Form: dunkel dicht, hell weit. Sie fließt ständig, mit
    der Form beim Drehen und mit einem langsamen Atmen, sodass Kurven in wechselnden Größen entstehen. (Neu: eine Linie, die einem
    bewegten 3D-Körper in Echtzeit folgt.)
12. **Feuer:** Die Form brennt wie Papier: eine Glutfront frisst sich durch, verkohlter Rand, Funken; aus der Front steigen Flammen
    einer echten Strömungssimulation (Auftrieb, Wirbel, Schwarzkörperfarben, Rauch). Danach wächst die Form wieder nach.
13. **Tropfen:** flüssiges Metall (Chrom, Gold, Farbe wählbar): Die Haut fließt nach unten, an der Unterkante hängen Tropfen, wachsen,
    reißen ab und fallen.
14. **Rauch:** Die Form ist ein Körper aus Rauch (Volumen, durch die Form gerechnet, mit Licht und Selbstschatten); Fahnen lösen sich
    und steigen in einer Strömungssimulation auf.
15. **Tinte:** Die Form ist ein Glas mit Wasser; Tinte in drei Farben wirbelt darin (Navier–Stokes im Umriss), mischt subtraktiv, und
    schwappt, wenn man die Form dreht.
16. **Flüssigglas:** hyperreales Glas: Brechung mit Dispersion (Spektrum in mehreren Wellenlängen), Dicke färbt, Fresnel, Studiolicht,
    Rand-Glanz wie Liquid Glass.
17. **Opal:** schwarzer Opal: Farbspiel aus Beugung in Körnern, die je nach Blick in Spektralfarben aufblitzen, milchiger Körper.
18. **Staub:** Die Form zerfällt von einer Seite her in hunderttausende Teilchen, die im Wind wirbeln und sich wieder zur Form setzen.
19. **Ereignishorizont:** Die Form wird zum schwarzen Loch: Sie krümmt das Licht der Sterne um ihren eigenen Umriss, ein Photonenring
    liegt auf der Kante, eine Akkretionsscheibe glüht und wird hinter der Form nach oben gebogen. (Neu: Linsenwirkung einer beliebigen
    Form statt einer Kugel.)
20. **Turing-Haut:** Reaktion–Diffusion (Gray–Scott) in einem Volumen um die Form: Muster wachsen lebendig über die Haut, Flecken und
    Streifen je nach Stelle, glänzend wie die Haut eines Pfeilgiftfroschs.

## Etappen

0. Plan, Recherche, Vorlage im Repo (dieser Stand).
1. Gerüst: `ShaderHaut`, Bausteine, Einbau in Ozzy (Wahl, Taste, Adresse, Takt), erster Shader (Comicdruck) an „strange bird“.
2. Die zehn nach Spider-Verse.
3. Die zehn freien, „Eine Linie“ zuerst.
4. Ein Bild je Shader an seinen Formen (`docs/progress/ozzy/shader/`), Übergabe, Feinschliff gesammelt in
   `docs/plans/2026-11-20-ozzy-shader-was-bleibt.md`.

Prüfen: Typen, die Konsole ohne Fehler, ein Bild je Shader im Fenster 5219; Kosten je Bild gemessen (Ziel: auf dem M3 Pro flüssig).
Sein Auge entscheidet über jeden Look.
