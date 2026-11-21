# Recherche für Shader-Runde 9 (21.11.2026)

Florian nach Runde 8 (Plan `docs/plans/2026-11-21-ozzy-shader-runde-9.md`): Der Schleim gefällt noch gar nicht, beim Stein meinte er
Felsen und echte Natursteine, Barcelona soll rau werden („lass dir hier etwas richtig cooles einfallen“), von Gaudí gefiel nur
Trencadís; dazu mehr Gaudí, Ghetto, Punk, Neon, Natur, der Nachtschatten „noch besser“ und drei Materialien nach Sin City.
**Weniger Kombinationen, lieber einzelne ausgefeilte Shader, je Stil eine eigene Fassung.** Vorlagen:
`docs/look/ozzy/shader/vorlagen/2026-11-21-r9-*.webp`.

**Rahmen jeder Empfehlung:** WebGL2, GLSL ES 3.0, Vollbild-Durchgang über dem G-Puffer (Normale, Lage, Tiefe, Rückseite und damit
Dicke, weiche Deckung `tWeich`), keine UVs, Muster im Raum der Form (`uMitte`, `uHalb`). Wiederverwendet wird, wo es passt: Schalen
(`schalen.ts`), Tropfen (Merke 4), Staub (Merke 5), Strömung (`stroemung.ts`), Flüssigglas-Linse (Merke 9), LEGO-Raster (Merke 13),
Pflaster des T-Rex (Merke 17), Würfelraster der Diskokugel (`rasterKachel`, Merke 21), Phasenfeld (`schuppenFeld.ts`, Merke 24).
**Farbwerte sind Schätzungen nach Fotos oder nach den Vorlagen, Aufwände sind Schätzungen; gemessen ist nichts.** Aussagen aus
Fan-Wikis oder nur aus Suchauszügen sind als solche markiert. Schleim (Etappe 1) und Fels mit Mauer (Etappe 2) sind schon gebaut;
für sie steht unten jeweils ein Abgleich mit dem Stand.

---

## Vorweg: fünf Bausteine für viele Shader dieser Runde

1. **Lauf-Feld (Schwerkraft auf der Haut).** Abwärts auf der Fläche ist `t = normalize(g - n * dot(n, g))` mit `g = (0, -1, 0)` im
   Raum der Form. Zwei Wege zu senkrechten Spuren: (a) **Säulen im Raum** (senkrechte Achsen in einem Raster über x und z, Abstand
   in x und z zur Achse; so läuft der Tropfschleim schon, und auf steilen Flächen werden Spuren von selbst länger); (b) für alles,
   was 2D-Koordinaten braucht (Schrift, Tartan, Mauerschichten), eine **senkrechte Projektion** auf eine von vier Ebenen um die
   Hochachse (0°, 45°, 90°, 135°), gewählt nach der Richtung der Normale mit verrauschter Grenze, ohne Überblendung (sonst
   Doppelspuren). In jeder Ebene bleibt y senkrecht, die Dehnung bleibt unter 8 %. Verzweigte Rinnen: der Erosionsfilter von
   Johansen (2026): Streifen je Zelle längs des Gefälles, jede Oktave nimmt das Gefälle der vorigen; er braucht nur Höhe und
   Gefälle, hier y und t. *Für:* Tropfschleim, Tintenstriche und Rillenkarren am Fels, Schmutzfahnen der Mauer, Rost unter Nieten
   und an der Persiana, Farbläufer im Graffiti, Satinglanz (Sin City Rot), Regenrinnsale (Nachtschatten).
2. **Innenabstand (3D-Textur `tInnen`).** Ein Belegungsgitter der Form (64³ über ihren Kasten, für dünne Fortsätze 96³) nach dem
   Verfahren von `gitterBauen` (Säulen schneiden die Haut), daraus die euklidische Abstandstransformation getrennt je Achse
   (Felzenszwalb und Huttenlocher 2012, linear in der Zahl der Zellen; Schätzung: wenige Millisekunden), als R16F-Textur, je
   Netzstand gedrosselt wie LEGO. Dazu ein Maximumfilter (Radius rund vier Zellen) als zweiter Kanal. Liefert: die größte
   Innenkugel (ihre Mitte ist Herz und Kern), die innerste Röhre jedes Fortsatzes (wo der Abstand D größer ist als 0,75 mal das
   örtliche Maximum: Knochen) und sichere Orte für Blasen. *Für:* Schleimgeist, Leuchtgas, Walrippen.
3. **Reliefschatten.** Prozedurale Reliefs wirken erst echt, wenn sie sich selbst beschatten: vom Bildpunkt aus 8 bis 12 Schritte
   in der Tangentialebene zum Licht, die Höhe abfragen, weicher Schatten wie bei Parallax Occlusion Mapping (Tatarchuk 2006). Für
   den Schattenlauf eine billige Höhe ohne Feinrauschen nehmen. Dazu Verdeckung in Fugen aus der Höhe selbst. Licht als
   **Streiflicht** (15° bis 30° über der Fläche). *Für:* Fels, Mauer, Panot, Persiana, Nieten, Rinde, Gaudís Steine.
4. **Kacheln ohne UVs.** Quadrate aus dem Würfelraster der Diskokugel (`rasterKachel`): Fuge, wo die Fläche eine Rasterebene kreuzt,
   örtliche 2D-Lage aus der vorherrschenden Ebene. Regelmäßige Reihen längs des Körpers (Rippen, Spiralen) aus dem Phasenfeld.
   *Für:* Panot, Pop-Art-Blume, Studentenblumen, Nieten, Walrippen, Palmspirale.
5. **Mittellinie.** Die Formen sind spiegelgleich; die Mittellinie oben ist, wo der Betrag von x klein ist und die Normale nach oben
   zeigt. Ein Band um sie trägt Rückenflossen, Iro, Nähte. Was aus der Kontur ragen soll, wächst als Schalen (wie Fell, „Büschel als
   Flammen“, nur im Band) oder wird im Bild über der Oberkante gezeichnet, wie die Tropfen unter der Unterkante. *Für:*
   Nachtschatten, Punk.

---

## 1. Nachtschatten (Ohnezahn)

### 1.1 Befund

- **Entwurf:** Nico Marlet. Regisseur Dean DeBlois: Ausgang war das Foto eines schwarzen Panthers auf einem Ast, gemischt „75 %
  Panther, 25 % Salamander“ (Interview 2025, nur Suchauszug). Die Augen sind größer als bei jedem Tier, die Pupillen katzenhaft
  (Schlitz, der sich weitet).
- **Haut im Trickfilm (2010 bis 2019):** fast schwarz, fein gekörnt statt geschuppt. Ein Fan-Wiki gibt das Team so wieder: eher wie
  Hai- oder Rochenhaut als wie ein Reptil, auch von der Fledermaus angeregt (nur Suchauszug). Nach Filmbildern: größere glatte
  Platten an Kopf und Hals, eine Reihe kurzer, flossenartiger Rückenstacheln bis zum Schwanz, Ohrlappen, Schwanzflossen.
- **Alpha:** Rückenstacheln, die Leiste zwischen den Augen, Nüstern und Maul leuchten durchscheinend blau, während er lädt, und
  klingen danach aus; im Spiel-Wiki ist die Alpha-Form ein eigenes Modell mit geteilten Rückenstacheln (Fan-Quellen). Der
  Plasmaschuss ist blau bis violett; im Realfilm 2025 „Toothless has purple fire“.
- **Realfilm 2025 (Framestore):** Eine schlangenhafte Haut wurde getestet und verworfen, sie machte ihn „very unfriendly“
  (Christian Manz); gestimmt wurden Proportionen, Augengröße und „thickness of scales“. Bezug: Salamander, Axolotl, Großkatzen,
  Schildkröten, Schlangen, Echsen. Owen Jackson: Ein glänzend schwarzes Wesen wirkt schnell künstlich; dagegen „bumps, dings and
  imperfections“, die das Glanzlicht brechen. Geprüft wurde vor echten Hintergründen mit HDRI, nicht im grauen Raum.
- **Tagschatten (Light Fury, Teil 3):** weiß mit Perlmuttschimmer, hellblaue Augen; Fan-Quellen nennen Rosa, Hellblau und Violett im
  Schimmer und Tarnung durch erhitzte Schuppen. Vorbilder laut Animationschef Simon Otto: Schneeleopard, Serval, Seeschwalben.

### 1.2 Was ihn schön macht (Einordnung)

1. **Schwarz, das die Form trotzdem zeigt.** Kaum Eigenfarbe; die Form lebt von großen, weich verlaufenden Spiegelungen und einem
   kühlen Randlicht, wie schwarzer Autolack.
2. **Zwei Maßstäbe, nichts dazwischen.** Eine sehr feine, ruhige Körnung, die man nur im Glanz sieht (Samt), und wenige große, klare
   Formen (Kopfplatten, Stachelreihe, Ohrlappen). Keine unruhigen Schuppen.
3. **Ein einziger Farbakzent:** das Blau der Stacheln (dazu das Gelbgrün der Augen), kühl gegen die warmen Abendhimmel des Films.
4. **Zurückhaltung:** Selbst der Realfilm hält die Gebrauchsspuren leise.

### 1.3 Rezept, besser als im Film

- **Grund:** Rücken #1b1d23, Flanken #23262e, Bauch eine Spur wärmer #272421 (linear rund 0,012 bis 0,02, nie 0). F0 0,035.
- **Drei Glanzkeulen:** Satin auf der Körnung (Rauheit 0,45), Platten (0,12), Nüstern und Maul nass (0,05). Samtschimmer an den
  Rändern #3a4866. Das Licht macht den Look: große Softbox-Streifen und ein kühles Randlicht #8fb4ff.
- **Perlhaut:** winzige, nicht überlappende, flach gewölbte Körnchen (das Pflaster des T-Rex, drei- bis fünfmal feiner, rund 1/150
  der Formgröße; am Kopf feiner, am Rücken gröber). Sie erscheinen nur im Glanzlicht als Glitzern; unter zwei Bildpunkten treten sie
  zurück.
- **Platten:** beiderseits der Mittellinie eine Reihe größerer glatter Platten, zum Schwanz hin kleiner; vorn oben (Kopf) größere.
  Kanten minimal heller und rauer (abgegriffen).
- **Rückenflossen:** kurze, flache, nach hinten geneigte Zacken im Band um die Mittellinie (Baustein 5), im Alpha-Shader in zwei
  Reihen.
- **Alpha-Leuchten:** Kern #eafcff, Glut #3fc8ff, Saum #1f5fff. Das Licht dringt in die Haut daneben: Emission #12305f mal
  `exp(-Abstand / (0,03 · Formgröße))`; so wird die schwarze Haut um die Stacheln herum von innen blau (das ist der schönste Teil).
  Laden als Welle vom Schwanz zum Kopf (rund 1,2 s), Blitz, Ausklingen (rund 2 s), dazwischen ruhiges Atmen. Bloom im Bild.
- **Was der Film nicht hat (eigene Ideen):**
  1. **Geisterflecken:** ein verborgenes Muster wie die Rosetten eines schwarzen Panthers, nur in Rauheit und Glanz, nie in der
     Farbe; man sieht es nur, wenn das Glanzlicht darüber läuft.
  2. **Rabenschimmer:** Dünnschicht nur im Streiflicht und nur auf den Platten (5 bis 10 % des Glanzes, Blauviolett nach Grün).
  3. **Sternenhaut:** In der Mondnacht glitzern einzelne Körnchen wie Sterne (selten, scharf, je Körnchen entschieden, ohne Flimmern).
  4. **Spuren mit Geschichte:** feine helle Kratzer auf den Platten (gleichgerichtet wie von Ästen), kleine Dellen, Staub in Mulden
     #57524b.
- **Augen** (falls Formen Augen bekommen): Iris gelbgrün #c2d62e, zur Pupille #8aa51c, Rand #3f5210, Schlitzpupille, Hornhaut mit
  scharfem Fensterglanz.
- **Bühnen:** „Wolken im Abendlicht“ (Gegenlicht #ffb36b, Himmel #7fa6d9 nach #f2c79a) und „Mondnacht“ (#0b1630 nach #24406b, der Mond
  als kleine harte Lampe). Schwarz braucht große, verlaufende Lichtflächen zum Spiegeln.

### 1.4 Fallen

- Reines Schwarz frisst die Form; ein Glanz ohne Bruch wirkt wie Plastik (Framestore).
- Deutliche Schuppen machen eine Schlange („unfriendly“).
- Leuchten ohne Durchschein in die Haut wirkt aufgeklebt; zu viel Bloom wird Nebel.
- Geisterflecken und Schimmer dürfen die Farbe nie tönen.

### 1.5 Quellen

- [Framestore: Bringing dragons to life (Owen Jackson)](https://www.framestore.com/news/bringing-dragons-life-visual-development)
- [SYFY: Live-Action changed Toothless](https://www.syfy.com/syfy-wire/how-to-train-your-dragon-live-action-changed-toothless)
  · [TVBEurope: thickness of scales](https://www.tvbeurope.com/production-post/creating-an-authentic-connection-between-human-and-dragon)
  · [VFX Voice: purple fire](https://vfxvoice.com/digging-deeply-into-vfx-for-the-live-action-how-to-train-your-dragon/)
  · [80.lv: Salamander und Panther](https://80.lv/articles/see-inside-toothless-from-how-to-train-your-dragon-live-action-movie-in-behind-the-scenes-footage)
- [Gold Derby 2025: Toothless original design](https://www.goldderby.com/article/2025/how-to-train-your-dragon-toothless-original-design/) (nur Suchauszug)
  · [Cartoon Brew: DeBlois und Otto](https://cartoonbrew.com/interviews/interview-dean-deblois-and-simon-otto-talk-about-the-animation-evolution-in-how-to-train-your-dragon-trilogy-185385.html)
- Fan-Wikis: [How to Train Your Dragon Wiki: Night Fury](https://howtotrainyourdragon.fandom.com/wiki/Night_Fury) (nur Suchauszug)
  · [School of Dragons Wiki: Toothless](https://schoolofdragons.wiki.gg/wiki/Toothless)
- [Sideshow: Light Fury, Perlmuttweiß](https://www.sideshow.com/collectibles/how-to-train-your-dragon-light-fury-statue-sideshow-collectibles-200616)

### Empfehlung für Ozzy

1. **„Nachtschatten“** (eigene Datei, Stil Echt): Perlhaut, Platten, drei Glanzkeulen, Samt, Spuren, Geisterflecken; Bühne Wolken im
   Abendlicht.
2. **„Nachtschatten Alpha“:** derselbe mit Rückenflossen in zwei Reihen, Leuchten mit Durchschein und Ladewelle, Sternenhaut; Bühne
   Mondnacht.
3. **Versuch „Tagschatten“:** Perlmuttweiß mit Dünnschicht (Rosa, Hellblau, Violett); Tarnung als Welle, in der die Form den Grund
   bricht wie Flüssigglas.
4. **Probe:** Seite und Dreiviertel an „strange bird“, Standbild und 4 s Ladewelle. Kriterium: Florian sagt ohne Erklärung
   „Ohnezahn“, und der Glanz wirkt nirgends wie Plastik.

---

## 2. Sin City

### 2.1 Befund

- **Comic (Frank Miller, ab 1991):** nur Schwarz und Weiß, keine Grautöne; Miller zeichnet die Schatten und lässt das Papier als Licht
  stehen. Figuren oft nur als Silhouette oder Umriss vor dem Gegengrund, viel Negativraum. Werkzeug: Tusche, Bristolkarton,
  Rotmarderpinsel; die Pinselführung studierte er an Hugo Pratts Corto Maltese.
- **Film (2005):** digital in Farbe gedreht, fast alles vor Grün, dann schwarzweiß; Schwarz hart zugedrückt, Lichter ausgebrannt;
  anders als der Comic mit etwas Grau und schattierten Hauttönen. Leduc (Hybride): Farbe nur als Gegenstand, „the bed, a red dress,
  an eye“. Blut ist mal rot, mal schwarz, mal „glows white in the shadows“. Der Yellow Bastard hat eine „sickly mustard-colored
  pallor“ und gelbes Blut (laut Berichten mit blauer Schminke gedreht, danach zu Gelb gedreht). Goldies Haar ist golden, das ihrer
  Zwillingsschwester schwarzweiß; dazu grüne Augen, rote Lippen, ein rotes Bett. In einer Verfolgung sind nur die Polizeilichter
  farbig, als rote und blaue Streifen.
- **Regen und Schnee:** weiße Striche im Schwarz (Hybride wird der weiße Regen zugeschrieben, nur Suchauszug); im Schnee von „That
  Yellow Bastard“ 500 000 Teilchen in einem Kasten, der mit der Kamera wandert (The Orphanage).
- **Licht:** hart, gerichtet, Randlicht (die Laterne auf der Hutkrempe), kein weiches Umlicht.

### 2.2 Die Grammatik als Regeln für einen Shader

1. **Zwei Werte:** Papier #f4f1e8 und Tusche #0a0a0a. Die Schwelle liegt auf dem Licht, nicht auf der Farbe; Kante höchstens 1 px
   geglättet.
2. **Ein hartes Licht, ein Randlicht.** Die Schattenseite verschmilzt mit dem schwarzen Grund; die Form trennt eine **weiße Kontur**
   (1,5 bis 3 px, im Bild gleich breit, aus dem Abstand in `tWeich`) und weiße Linien an inneren Konturen (Tiefensprung im G-Puffer).
3. **Die Linie ist das Gegenteil des Grundes:** über Schwarz weiß, über Weiß schwarz. So zeichnet sich ein Arm vor dem Körper ohne
   Grau.
4. **Pinselkante:** die Schwelle mit Rauschen stören, das längs der Lichtgrenze gestreckt ist (ausgefranst wie ein trockener Pinsel),
   dazu wenige Spritzer.
5. **Regen im Bild:** schräge Striche (75° bis 80°), weiß über Schwarz und per Umkehr (XOR) schwarz über Weiß; Spritzkronen, wo die
   Normale nach oben zeigt; Dichte in Schauern, Längen gestreut.
6. **Schmuckfarbe:** höchstens eine je Shader, flach oder in zwei Stufen, immer auf einem Gegenstand (Haut, Kleid, Blut), nie als
   Tönung des Bilds.
7. **Licht ohne Quelle:** Weißes leuchtet im Schatten (Blut, Brillengläser) mit kleinem Schein.

### 2.3 Drei Materialien

- **A „Regen“ (The Hard Goodbye).** Die Form schwarz, hartes Schlaglicht von oben seitlich, weiße Kontur, Pinselkante, Regen mit
  Umkehr und Spritzkronen. Zwei, drei weiße Pflasterkreuze auf der Haut (Marv). Weiß leuchtende Tropfen an der Unterkante
  (Tropfen-Shader in Weiß, kleiner Schein). Grund schwarz.
- **B „Gelb“ (That Yellow Bastard).** Die Haut ist die Schmuckfarbe: im Licht #e6c61f (im Comic heller, #f2d41c), Schatten tiefschwarz,
  Glanz als harte Flecken #fff6c2 (fettig). Große, flache Beulen in der Normale machen sie unheimlich, nicht hässlich. Gelbe Tropfen.
  Grund schwarzweiß mit Schnee (nah groß und unscharf).
- **C „Rot“ (das rote Kleid, Goldies Bett).** Roter Satin als einzige Farbe: Licht #d0021b, Mitte #8e0014, Schatten Schwarz; der Glanz
  als lange weiße Bahnen längs der Schwerkraft (anisotrop, Faser längs des Lauf-Felds) mit scharfen schwarzen Faltenlinien, wie ein
  fallender Stoff. Spielart „Blaulicht“: die Form schwarzer Lack, Licht von links Rot #ff1a1a und von rechts Blau #1f6bff im Wechsel
  (rund 2 Hz), Farbe nur in Glanz und Rand.

### 2.4 Fallen

- Grau schleicht sich über Glättung, Bloom und ACES ein: am Ende hart auf zwei Werte plus Schmuckfarbe setzen.
- Ohne weiße Kontur verschwindet die Form im Grund.
- Farbe als Tönung wirkt wie ein Fotofilter.
- Gleich dichter Regen wirkt wie Rauschen.

### 2.5 Quellen

- [CGW 2005: The Devil's in the Details](https://www.cgw.com/Publications/CGW/2005/Volume-28-Issue-4-April-2005-/The-Devils-in-the-Details.aspx)
  (Farbe als Gegenstand, weißes Blut, Senf-Blässe, Polizeilichter, Schnee)
- [Color Culture: Sin City cinematography](https://colorculture.org/sin-city-cinematography-analysis/)
  · [Post Magazine 2005](https://www.postmagazine.com/Publications/Post-Magazine/2005/April-1-2005/COVER-STORY-SIN-CITY.aspx) (nur Suchauszug)
  · [AWN: Sin City](https://www.awn.com/articles/production/isin-cityi-bringing-graphic-novel-screen-literally) (nur Suchauszug)
  · [Roger Ebert: Sin City](https://www.rogerebert.com/reviews/sin-city-2005)
- [Tim Ferriss: Frank Miller (Werkzeug, Corto Maltese)](https://tim.blog/2025/10/20/frank-miller/)
  · [Cannon Hill Comics: Expressionism in Comics](https://cannonhillcomics.substack.com/p/expressionism-in-comics)

### Empfehlung für Ozzy

1. Ein gemeinsamer Kern „Tusche“ (Schwelle, Pinselkante, weiße Kontur, Linie als Gegenteil, Regen mit Umkehr), darauf drei eigene
   Shader: **„Sin City Regen“, „Sin City Gelb“, „Sin City Rot“**.
2. Reihenfolge A, B, C; A zeigt die Grammatik.
3. **Probe:** drei Bilder im Standardblick, A mit 3 s Regen. Kriterium: Florian erkennt Sin City ohne Erklärung; außer der
   Schmuckfarbe gibt es im Bild nur zwei Werte (Histogramm zählen).

---

## 3. Schleim

Die Physik echten Schleims steht in der Recherche der Runde 8 (Abschnitt 4). Diesmal sind beide Vorlagen gestaltet, nicht Physik.

### 3.1 Vorlage a: Schleimgeist (Befund aus dem Bild)

- Körper limettengrün und durchscheinend: Ränder satter und dunkler (#4caf1c, #3c9a16), die Mitte hell gelbgrün (#c4ec4a), weil der
  Kern sie von innen beleuchtet; oben ein großes weiches Glanzlicht und kleine scharfe.
- Innen Schädel (groß, runde Augenhöhlen) und Brustkorb mit Wirbelsäule, olivgrün (#8e9a1c), von hinten unten angestrahlt, also als
  Silhouetten vor dem Glühen; die Augenhöhlen leuchten (#e6ff8c).
- Kern: gelbgrünes Glühen (#d6ff4f, Mitte #f4ffb0) in Brusthöhe.
- Blasen: Kugeln mit Radius rund 0,015 bis 0,035 R, dunkler grün (#4ea71b) mit Lichtpunkt; einige als Buckel an der Oberfläche.
- Dampf: graugrüne Schwaden (#6e8672, Deckung 0,2 bis 0,35) an den Seiten und oben. Funken: leuchtende grüne Punkte (#86ff4a).
- Unten breitet sich der Körper in Lappen aus (das macht die Form). Grund Schiefergrau #3b3f4c, Ecken #262931.

### 3.2 Bauweise Schleimgeist

1. **Strahl durch den Körper** längs des gebrochenen Blicks (Brechzahl 1,35, Austritt per Linse wie beim Flüssigglas) bis zur
   Rückseite, 24 bis 44 Schritte, in Bewegung halb so viele.
2. **Absorption je Kanal** (Beer): σ ≈ (1,6; 0,25; 4,5) je Formradius; dünn wird gelbgrün, dick sattgrün.
3. **Kern als Licht im Volumen:** Dichte `exp(-|x - K|² / r²)`, längs des Strahls mit Absorption aufsummiert. An der Oberfläche Licht
   von innen: Kernfarbe mal `exp(-σ · Abstand zum Kern)`.
4. **Skelett als Abstandsfeld**, spiegelgleich (Schädel mit Augenhöhlen und Nase, Kiefer, Kapselkette, vier bis fünf Rippenpaare,
   glatt vereinigt). Trifft der Strahl einen Knochen: Knochenfarbe, vom Kern beleuchtet (zwei, drei Schritte zum Kern als Schatten der
   Rippen), Strahl endet; je tiefer, desto weicher.
5. **Blasen** in Zellen im Raum der Form, langsam steigend, Schnitt Strahl–Kugel analytisch; dunkler Kern, heller Rand.
6. **Haut:** zwei Glanzkeulen (Rauheit 0,03 und 0,2), F0 0,02, Fresnel-Rand, langsames Wabbeln der Normale.
7. **Dampf** im Bild außerhalb der Form (Curl-Rauschen mit dem Abstand zur Kontur aus `tWeich`, oder `stroemung.ts` mit kalter
   Quelle an der Oberkante), **Funken** wie Staub (Merke 5) in Grün, additiv, steigend.

### 3.3 Vorlage b: Tropfschleim (Befund aus dem Bild)

- Eine bucklige Schicht über der ganzen Kugel mit waagerechten Wülsten (Lippen), aus denen senkrechte Spuren laufen; jede endet in
  einem dickeren Tropfenkopf. Mehrere Lagen überdecken sich. Halbe Spurbreite w rund 1 bis 1,5 % R, Kopf 1,4 bis 1,8 w, Länge 0,08
  bis 0,45 R.
- Neongrün #3dff1f bis #2bdc12, in dicken Spuren satt #0f9e0a, gelbliche Stellen #c8f53a an dünnen, hohen, belichteten Stellen.
- Sehr glänzend: viele kleine harte Lichtpunkte, leicht bläulich weiß #e6ffff; jeder Tropfenkopf hat sein eigenes Glanzlicht.

### 3.4 Bauweise Tropfschleim

1. **Lauf-Feld:** Säulen im Raum (so gebaut). Oben (n.y > 0,8) eine Lache aus Buckeln ohne Spuren; unten (n.y < −0,6) hängende Tropfen
   (Tropfen-Shader an der Unterkante).
2. **Lagen:** y in drei bis fünf wellige Lagen teilen (Grenze y + 0,04 R mal Rauschen); jede Lage endet unten in einer Lippe
   (gerundeter Wulst); die Spuren starten an der Lippe, nicht irgendwo.
3. **Querschnitt rund:** Höhe `h = w · sqrt(1 - (dx/w)²)`, am Hals schmaler, Kopf als Kugel; zwei Größen, Maximum.
4. **Farbe nach Dicke der Schicht** (Beer): dünn #d2f53c, mittel #39e61a, dick #10a00c. Rauheit 0,04, Deckschicht. Die Umgebung
   braucht mehrere kleine helle Fenster; erst daraus entstehen die vielen kleinen Lichter der Vorlage.
5. **Bewegung:** Spuren wachsen langsam (dann ausblenden), Köpfe schwellen, unten lösen sich Tropfen.

### 3.5 Abgleich mit dem Stand (Etappe 1)

Gebaut: Skelett mittig und zur Front gedreht, Kern, Blasen nach Tiefe, Dampf, Funken; Tropfschleim aus Säulen mit zwei Spuren je
Säule. Was die Vorlagen darüber hinaus zeigen:
1. **Skelett aus dem Innenabstand** setzen (Schädel in die größte Innenkugel, Radius rund 0,6 D, Rippen darunter); so stößt es bei
   keiner Form durch die Haut. Mehr als die Vorlage: Knochen auch in jedem Fortsatz (innerste Röhre).
2. **Lippen und Lagen** im Tropfschleim: Die Spuren der Vorlage kommen aus waagerechten Wülsten; das liest sich als „fließt“.
3. **Jeder Tropfenkopf mit eigenem Glanzlicht** und mehrere kleine Fenster in der Umgebung.
4. **Gelb nur, wo die Schicht dünn ist**, Sattgrün in dicken Spuren (Farbe aus der Schichtdicke, nicht aus Rauschen).

### 3.6 Fallen

- Ohne Kern und Innenleben wird (a) grünes Glas (der Schleim der Runde 8).
- Spuren aus 3D-Rauschen laufen nicht senkrecht; gleich lange Spuren wirken wie ein Vorhang.
- Neongrün braucht dunklen Grund.

### 3.7 Quellen

- Recherche Runde 8, Abschnitt 4 (`docs/research/2026-11-21-runde-8-recherche.md`)
- [80.lv: Unity slime shader (eingeschlossene Dinge verzerrt wie im Eis)](https://80.lv/articles/check-out-this-cool-unity-slime-shader)
  · [80.lv: Volumetric slime cube (Volumen, falsche Brechung, Klarlack)](https://80.lv/articles/volumetric-slime-cube-shader-set-up-in-unity)
- [Quilez: Abstandsfunktionen](https://iquilezles.org/articles/distfunctions/)
  · [Felzenszwalb, Huttenlocher 2012: Distance Transforms of Sampled Functions](https://cs.brown.edu/people/pfelzens/papers/dt-final.pdf)
- [Polycount: Laufspuren mit der Hochachse statt UVs](https://polycount.com/discussion/comment/2217286)
  · [Rainy Surface Shader, Teil 2](https://deepspacebanana.github.io/blog/shader/art/unreal%20engine/Rainy-Surface-Shader-Part-2)

### Empfehlung für Ozzy

1. **Innenabstand** bauen und den **Schleimgeist** daran setzen (Skelett, Kern, Blasen nie durch die Haut).
2. **Tropfschleim** mit Lippen, Lagen, Köpfen mit Glanzlicht und Farbe aus der Schichtdicke nachschärfen.
3. **Probe:** beide an „strange bird“ und an einer Kugel neben der Vorlage, Standbild und 5 s. Kriterium: Florian legt Bild und
   Vorlage nebeneinander und sagt ja.

---

## 4. Felsen und Natursteinmauer

### 4.1 Was Felsen echt macht

1. **Kanten statt Rauschen.** Fels bricht an Klüften in ebene Flächen: große Zellen, je Zelle eine leicht gekippte Facette, die Ränder
   gerundet und heller (verwittert). Ohne das wird jeder Fels eine Kartoffel.
2. **Schichtung:** Bänder längs einer gekippten Ebene (Einfallen 5° bis 30°), leicht verbogen; harte Lagen stehen vor, weiche treten
   zurück, jede Lage mit eigenem Ton.
3. **Risse folgen den Klüften:** einige Zellränder (nicht alle) als V-förmige Risse, innen dunkel, oben verzweigt.
4. **Verwitterung nach Lage:** konvexe Kanten heller und gerundet, Mulden dunkler und feucht, frische Bruchflächen heller und wärmer,
   alte grauer (in Substance-Breakdowns treibt die Krümmung die Verwitterung; Moos wird in die Risse gedrückt, statt die Kuppen zu
   decken).
5. **Wasser nach der Schwerkraft** (Lauf-Feld): Auf Kalkfels entstehen **Tintenstriche**, schwarze Streifen aus Cyanobakterien, wo
   Wasser abläuft, und **Rillenkarren**, parallele Rillen längs des Hangs, durch saures Regenwasser gelöst.
6. **Leben nach Licht und Feuchte:** Flechten auf belichteten freien Flächen, Moos oben, in Rissen und auf der Schattenseite. Die
   **Gelbflechte** (Xanthoria parietina) ist in der Sonne orange, im Schatten grünlich grau, nass grünlicher: ihre Farbe kann am Licht
   des Shaders hängen. Die **Landkartenflechte** (Rhizocarpon geographicum) bildet gelbgrüne eckige Felder auf schwarzem Vorlager, das
   am Rand vorsteht, in runden Kolonien, rund 0,1 mm im Jahr.
7. **Farbstreuung auf drei Maßstäben**, wenig Sättigung.
8. **Licht:** Streiflicht, Reliefschatten, Verdeckung in Rissen. Das macht mehr als jede Textur.

Farben (Schätzung): Kalkfels #c2bfb4, #a9a69b, hell #d9d5c9, Tintenstrich #2b2b28, Eisen #a8743f · Gelbflechte Sonne #e8a41f,
Schatten #a8ad82 · Landkartenflechte #c9d23d auf #1b1b19 · graue Krustenflechte #cfd0c5 mit hellerem Rand · Moos #3f5a19, #6f8f26,
Spitzen #b2c84a.

### 4.2 Bruchsteinmauer nach der Vorlage

**Befund:** Kalksteine, kaum bearbeitet, Kanten gerundet, in fast waagerechten Lagerfugen mit wechselnder Schichthöhe
(Bruchstein-Schichtenmauerwerk), Größen stark gestreut, kleine Füllsteine in den Zwickeln. Fugen breit (rund 1/8 bis 1/5 der
Steinhöhe), heller Kalkmörtel bündig bis leicht zurück, stellenweise über die Steinkanten gestrichen. Steine grauweiß (#c9c5ba,
#b3afa4), einige honig- bis ockerfarben (#c7a265, #b28c55), Rostflecken (#a8743f), weiße Kristallpunkte, dunkle Poren; Mörtel #dacda9
bis #e5d9b9, sandig.

**Bauweise:**
1. **Schichten** in y (Raum der Form): Höhe je Schicht 0,6 bis 1,4 H; selten ein Binder über zwei Schichten.
2. **Steine je Schicht:** 2D-Voronoi in der waagerechten Ebene (x, z), gültig über die ganze Schichthöhe. So laufen die Lagerfugen
   durch, die Stoßfugen stehen senkrecht und versetzt; Steinlänge höchstens vier- bis fünfmal die Höhe, keine hochkant gestellten
   Steine (Regeln des Natursteinmauerwerks).
3. **Steinform:** Abstand zum Zellrand und zur Schichtgrenze, weich vereinigt (Rundung 0,15 bis 0,3 H), Rand mit Rauschen verzerrt.
   Zwickel: ein zweites, feines Voronoi nur in breiten Fugen.
4. **Höhe:** Kissenprofil, Neigung je Stein, raues fBm, Grübchen, Abplatzer an den Kanten; Mörtel tiefer, mit Kellenstrich und
   Sandkorn, stellenweise über die Kante gezogen.
5. **Farbe je Stein** aus einer gewichteten Palette (rund 70 % grau, 20 % honig, 10 % ocker und rostig), darin Eisenflecken,
   Kristallpunkte, Poren.
6. **Licht:** Streiflicht, Reliefschatten, Verdeckung am Fugenrand, leichte Schmutzfahnen unter vorstehenden Steinen.

Oben auf der Form werden die Schichten Ringe wie bei einem Trullo; das passt. Spielart **Zyklopenmauer:** reines 3D-Voronoi ohne
Schichten (vieleckige Steine).

### 4.3 Abgleich mit dem Stand (Etappe 2)

Gebaut: Fels mit Bruchflächen, Rissen, Graten, Korn, Rostspuren, Flechtenkreisen, Moos oben; Mauer aus waagerecht gestreckten Zellen
im Raum; Licht bei leicht bedecktem Himmel, Normalen aus der Höhe. Was die Recherche darüber hinaus nahelegt:
1. **Streiflicht und Reliefschatten** (Baustein 3): unter bedecktem Himmel fehlen die harten kleinen Schatten, die Stein erst echt
   machen.
2. **Schichten mit durchlaufenden Lagerfugen** in der Mauer statt gestreckter Zellen (die Vorlage hat Lagen); dazu Zwickelsteine und
   Mörtel über den Kanten.
3. **Schichtung** im Fels und, für Kalkfels, **Tintenstriche** und Rillenkarren aus dem Lauf-Feld.
4. **Gelbflechte nach dem Licht** (orange in der Sonne, grünlich grau im Schatten) und Landkartenflechte mit schwarzen Grenzlinien.

### 4.4 Fallen

- Rauschen ohne Richtung wird Beton; Fels ohne Kanten wird Kartoffel.
- Grün überall wirkt wie Schimmel: Flechten brauchen freie Flächen, Moos Schatten.
- Zu satte Farben, zu harte Kontraste.
- Mauer ohne Reliefschatten wirkt aufgedruckt; Kreuzfugen und gleiche Steine wirken wie Tapete.

### 4.5 Quellen

- [Johansen 2026: Advanced Terrain Erosion Filter](https://blog.runevision.com/2026/03/)
  · [80.lv dazu](https://80.lv/articles/fast-terrain-erosion-filter-that-emulates-erosion-without-simulation)
- [British Lichen Society: Xanthoria parietina](https://britishlichensociety.org.uk/resources/species-accounts/xanthoria-parietina)
  · [MarLIN: Farbe nach Licht](https://www.marlin.ac.uk/species/detail/1798)
  · [Irish Lichens: Rhizocarpon geographicum](https://irishlichens.ie/pages-lichen/l-112.html)
  · [NZPCN: Landkartenflechte](https://nzpcn.org.nz/flora/species/rhizocarpon-geographicum-subsp-geographicum)
- [Frontiers in Microbiology 2024: Tintenstriche](https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2024.1430059/text)
  · [Geoweg Achensee: Rillenkarren](https://geoweg.achensee.com/en/karst-above-ground/)
- [80.lv: Mark Foreman (Moos in die Risse)](https://80.lv/articles/building-materials-in-substance-designer-with-mark-foreman)
  · [Searock Cliff (Flechten in drei Tönen)](https://gamesartist.co.uk/searock-cliff/)
  · [80.lv: Felswände in Substance Designer](https://80.lv/articles/001agt-creating-varied-rock-walls-in-substance-designer)
- [Wikipedia: Natursteinmauerwerk](https://de.wikipedia.org/wiki/Natursteinmauerwerk)
- Tatarchuk 2006: Practical Parallax Occlusion Mapping with Approximate Soft Shadows (SIGGRAPH-Kurs)

### Empfehlung für Ozzy

1. **Streiflicht und Reliefschatten** für Fels und Mauer (größter Schritt zur Echtheit).
2. **Mauer in Lagen** nach der Vorlage, mit Zwickeln und Mörtel über den Kanten.
3. **Fels:** Schichtung, Tintenstriche, Gelbflechte nach dem Licht.
4. Später, als eigener Shader und nicht als Regler: **„Granitfindling“** (rund geschliffen, Flechtenkolonien, Glimmer funkelt).
5. **Probe:** Vorlage neben Bild bei Streiflicht. Kriterium: Florian hält die Mauer einen Augenblick für ein Foto.

---

## 5. Barcelonas raue Straßen

### 5.1 Befund

- **Panot:** Außenplatte aus Zementguss, seit der Ausschreibung von 1906 (10 000 m², 18 Entwürfe, fünf gewählt: Blume, vier Tafeln,
  vier Tafeln mit vier Kreisen, konzentrische Kreise, Raute mit vier Kreisen; heute vor allem Blume und vier Tafeln). Hersteller
  Escofet. Bis 2010 rund 5 Mio. m². Die Blume ist ein flaches Relief nur an den Umrissen („shallowly outlined“); die Herleitung aus
  dem Boden der Casa Amatller ist nicht belegt (dort Naturstein, ganz im Flachrelief). Üblich 20 × 20 cm (nicht belegt).
- **Geometrie der Blume** (aus beiden Vorlagen geschätzt, Kachel von −0,5 bis 0,5): Mittelring außen 0,205, innen 0,125; vier
  Blütenringe auf den Diagonalen bei (±0,185; ±0,185), außen 0,185, innen 0,10; der Mittelring liegt oben und schneidet die
  Blütenringe mit einer Lücke von rund 0,02. Beim Panot sind die Ringe flache Rillen und die Scheiben erhaben, in der Pop-Art sind es
  farbige Ringe. Eine Geometrie für beide Shader.
- **Barri Gòtic:** Sandstein vom Montjuïc (golden bis ocker), von der Römerzeit bis ins 20. Jahrhundert fast der einzige Baustein der
  Stadt (Kathedrale, Santa Maria del Mar).
- **Raval:** bemalte Rollläden (Festival Ravaleart), Tags als Kommentar, Paste-ups, seit rund 30 Jahren die Aufkleber „El Xupet Negre“
  (schwarzer Schnuller), Keith Harings Wandbild von 1989, die Plaça dels Àngels am MACBA, die legale Wand an den Tres Xemeneies.
- **Nässe:** Poröses wird dunkler, gesättigter und etwas glatter, stehendes Wasser spiegelt (Jensen u. a. 1999; Lagarde).
  Faustwerte aus der Spielpraxis: Grundfarbe poröser Stoffe auf 0,5 bis 0,7 abdunkeln, Rauheit um ein Drittel senken, Pfützen als
  Spiegel (F0 0,02, Rauheit 0,02).

### 5.2 Vier raue Shader, je einer eigenständig

1. **„Panot nach dem Regen“** (Vorlage): Zementgrau #8e8d89, Zuschlag fein gesprenkelt (#b8b5ad, #5f5d59), Rillen flach, Fugen dunkel
   #2c2a27 mit Schmutz; Kacheln aus dem Würfelraster, Kachel rund 1/8 der Form. **Echt wird es durch Unordnung:** jede Platte leicht
   gekippt (die Spiegelungen brechen an den Fugen), Lauflinien glatter mit gerundeten Reliefkanten und freigelegtem Zuschlag,
   gesprungene Platten mit abgesackter Ecke, ersetzte hellere Platten #a9a8a2, Asphaltflicken #2a2a2a, Kaugummi (flache Scheiben 1 bis
   2 cm, #3d3b38 bis #5a5650, grauer Hof, gehäuft, verschieden groß), Flecken mit dunklerem Rand, Taubenkot. **Nässe:** Wasser steht in
   Rillen und Fugen (Spiegel), der Rest ist nur dunkler; Regenringe in den Rillen. Nachts Natriumlicht #ffae42 von oben, kühles
   Ladenlicht von der Seite, Neon in den Pfützen.
2. **„Pop-Art-Blume“** (Vorlage, Spider-Verse-Druck): Kacheln mit weißen Lücken (rund 3 % der Kachel), jede flach in einem der zwölf
   Paare der Vorlage (Grund/Blume): #00a5a8/#0d4597, #7b79b9/#94c560, #e7e50b/#e5007d, #0d4597/#f7941d, #94c560/#00adee,
   #231f20/#ffffff, #94c560/#e5007d, #f7941d/#ffffff, #00adee/#d8e30a, #7b79b9/#0d4597, #e5007d/#f7941d, #94c560/#7b79b9. Druck:
   Schatten als Punktraster in einem dunkleren Ton der Kachel, die Blumenplatte 1 bis 2 px versetzt (Passerfehler, Überdruck
   dunkler), Papierkorn, dicke schwarze Kontur der Form, Glanz als weiße Sterne. Spielart: Die Paare wechseln im Takt wie bei Warhol.
3. **„Persiana“** (Rollladen im Raval): waagerechte Lamellen (Periode rund 1/30 der Formhöhe, gerundetes Profil), verzinkter Stahl
   #9aa0a3 mit Zinkblumen (große Kristallflecken, hell und dunkel), anisotroper Glanz längs der Lamellen; darüber ein Wandbild aus
   großen flachen Farbflächen, darüber Tags; unten Rost #8b4a1f mit Rostfahnen (Lauf-Feld), Dellen, Schmutz in den Rillen.
4. **„Gòtic-Mauer“** (Schichten der Stadt): Sandsteinquader (#c8a26a, verwittert #9c7f55, schwarze Kruste in geschützten Ecken
   #3a342c), darüber Kalkputz in Ocker #cfa96e, Terrakotta #b9663f, Altrosa #d8b4a0 und Creme #e6dbc4, in Lagen abplatzend (jede Lage
   mit Kante und Schattenlinie), darauf Plakatreste (Papier #efe8d8, verblasster Druck, Falten, Risse), Tags, Aufkleber (ein schwarzer
   Schnuller als Gruß an El Xupet Negre), unten ein dunkler Spritzsockel mit weißen Salzausblühungen #f0eee8, Rostfahnen unter
   Eisenankern.

Gemeinsam: ein Baustein „Graffiti“ (Tags, Throw-ups, Overspray, Farbläufer; Abschnitt 7.1) für Persiana, Gòtic-Mauer und Ghetto.

### 5.3 Fallen

- Ein perfektes Raster mit perfekten Platten wirkt wie ein Badezimmer.
- Zu tiefes Relief wird ein Keks; das Original ist flach.
- Überall nass wirkt wie Plastik: Wasser nur in Rillen, Fugen und Senken.
- Gleich große runde Kaugummis werden ein Muster.
- Pop-Art ohne Druckfehler wirkt wie Vektorgrafik.

### 5.4 Quellen

- [Wikipedia: Panot](https://en.wikipedia.org/wiki/Panot)
  · [3Cat: El panot de la flor (Esparza)](https://www.3cat.cat/3catinfo/el-panot-de-la-flor-nova-vida-per-a-un-simbol-historic-de-barcelona/noticia/3163212/)
  · [Escofet: Geschichte](https://www.escofet.com/en/about-en/history/)
  · [Culture Trip: Panot](https://theculturetrip.com/europe/spain/articles/how-barcelonas-panot-tiles-became-a-symbol-for-the-city)
  · [Barcelona Secreta](https://barcelonasecreta.com/panot-flor-barcelona/)
- [Montjuïc-Sandstein (Studie)](https://dissem.in/p/93004622/montjuic-sandstone-petrophysical-properties-decay-and-treatment)
  · [Santa Maria del Mar](https://blog.msc-sahc.org/the-fire-in-barcelonlas-santa-maria-del-mar/)
- [Ara: Ravaleart](https://en.ara.cat/images/ravaleart-the-urban-art-festival-that-brings-color-to-the-shutters-of-raval_3_5556345.html)
  · [Barcelona Metròpolis: Urban Art](https://barcelona.cat/metropolis/en/node/2286)
  · [MURAL: Barcelona](https://muralfestival.com/traveltuesday-barcelone/)
- [Jensen, Legakis, Dorsey 1999: Rendering of Wet Materials](https://groups.csail.mit.edu/graphics/pubs/wet_materials_egwr99.pdf)
  · [Lagarde: Water drop (Übersicht)](https://3dvf.com/actualite-5676-sebastien-lagarde-simulation-pluie-en-jeu-video-html/)
  · [Gist nach Lagarde: Abdunkeln nach Porosität](https://gist.github.com/eviltak/e04b83ffdb91aa3d477bbfe0ca370da7)

### Empfehlung für Ozzy

1. **„Panot nach dem Regen“** und **„Pop-Art-Blume“** zuerst (beide Vorlagen, dieselbe Blumengeometrie).
2. Dann **„Persiana“**, danach **„Gòtic-Mauer“**.
3. **Probe:** beide Vorlagen neben den Bildern; Panot nass bei Nacht und trocken bei Tag. Kriterium: Florian sagt „Barcelona“ und
   „rau“.

---

## 6. Gaudí neu gedacht

### 6.1 Befund

- **Park Güell:** Wege auf Säulengängen, Stützmauern und Viadukten aus rohem Stein vom Gelände, ohne große Abgrabungen; schräge
  Säulen in Parabelform. Der Pòrtic de la Bugadera: außen senkrechte Säulen wie Palmen, innen schräge, zusammen eine Welle; eine
  Säule trägt die Figur einer Wäscherin. Die schräge Säule kehrt in der Krypta der Colònia Güell wieder.
- **La Pedrera (Casa Milà), Dach:** „Garten der Krieger“ (Pere Gimferrer); Kamine spiralig gedreht, in Gruppen zu drei oder vier;
  Treppenhäuser teils mit Kalkputz, teils mit Trencadís aus Stein, Marmor oder Keramik, einfarbig; manche Kamine mit Scherben von
  Cava-Flaschen. **Dachboden:** rund 270 Kettenbögen aus Ziegel; Besucher vergleichen sie mit dem Brustkorb eines Wals.
- **Casa Vicens:** eine einzige Fliese mit drei Blüten, zwei Knospen und Blättern der Studentenblume (Tagetes), in jede Richtung
  nahtlos, dazu glatte weiße und grüne Fliesen; Sockel aus Naturstein, darüber Ziegel und Fliesen; Tor mit Zwergpalmen; im
  Rauchzimmer eine bemalte Muqarnas-Decke.

### 6.2 Sechs Ideen

1. **„Kaminwächter“** (La Pedrera): weißer Kalkputz #ece5d6 (Schatten #cfc6b4) mit Kellenwellen und Sandkorn, spiralige Rillen um die
   längste Achse; Felder aus Trencadís in weißem Marmor (#f2efe8, Adern #9c9a95) und grünem Flaschenglas (#2f5e2b bis #6c9a3b, an den
   Kanten heller #9fd16a; Absorption nach der Glasdicke, scharfe Glanzpunkte, darunter heller Mörtel). Bühne: Mittelmeerhimmel #3d7fd0
   nach #a9cdf0, harte Sonne. Weiße Masse, grünes Funkeln.
2. **„Studentenblumen“** (Casa Vicens): Bänder nach der Höhe: unten Bruchstein (#9b7b56, #b49770), darüber Ziegel #a8532f mit hellen
   Fugen #d9cdb5, grün-weiß gewürfelte Bänder (#1f6b45, #f1ede2, nach Fotos), Bänder mit der Tagetes-Fliese (Grund #f3efe4, Blüten
   Orange #f08519 und Gelb #f6c12e, Blätter #2e6b37); Fliesen glasiert und leicht wellig. Die Blüten sitzen an den Kachelecken, so
   laufen sie nahtlos über die Fugen wie im Original.
3. **„Walrippen“** (Dachboden der Pedrera): Rippen als Ringe um die längste Achse (Phasenfeld oder Abstand längs der Achse), jede
   Rippe aus schmalen Ziegeln (#c98c5c, #b8764a, #d9a074) mit hellen Fugen; zwischen den Rippen ist die Form offen und zeigt ihre
   warm beleuchtete Innenseite (Rückseite der Form, dunkler, Licht #ffb36b). Knochenformen, aber nicht Batlló.
4. **„Wäscherin“** (Park Güell): rohe Bruchsteine (#7e6a52, #9c8466, #b39d7d, #5f4f3e) mit tiefen dunklen Fugen #4e4337, vorstehend wie
   Knollen, als Spirale um die Achse gelegt wie Palmrinde (Phasenfeld), oben sonnengebleicht, Grasbüschel und Agaven in einigen
   Fugen (#4f7a36). Starkes Seitenlicht. Nutzt den Motor der Mauer.
5. **Versuch „Klinker-Krypta“** (Colònia Güell, nach Fotos): überbrannte Klinker in Violettschwarz und Braun (#2f2328, #4a2f33,
   #5b3b2e), verglaste Stellen mit Schillern (#7a6a9a), verzogene Formate, Schlackenbrocken; dämmriges warmes Licht.
6. **Versuch „Seetang-Eisen“** (Balkone der Pedrera, nach Fotos): Schmiedeeisen wie Seetang: Bänder dort, wo zwei Rauschfelder nahe
   null sind (wie die Fasern der Zuckerwatte), dazwischen offen; Eisen #1a1918, Rost #7a3b1c in den Winkeln, blanke Kanten #6b6b6b.

Dazu laut Plan **Trencadís im Spider-Verse-Stil:** Scherben als Flächen in zwei Tönen je Facette, schwarze Tuschekontur mit wechselnder
Breite, Punktraster nur im dunklen Ton, die Farbplatte 1 px versetzt, Glanz als weiße Vierstrahl-Sterne, Fugen papierweiß #fbf7ec;
Farbzonen wie bisher.

### 6.3 Fallen

- Zu viele Farben werden Kitsch; La Pedrera ist fast einfarbig.
- Putz ohne Kellenwellen wirkt wie Plastik; Glas ohne Dicke und Glanz wie Farbe.
- Walrippen mit schwarzen Lücken sind nur Streifen; die Tiefe dahinter macht sie.
- Blüten, die an den Fugen abbrechen, verraten das Raster.

### 6.4 Quellen

- [Park Güell: Wege und Viadukte](https://parkguell.barcelona/en/park-guell/emblematic-features/roadways-paths-viaducts)
  · [La Pedrera: Park Güell](https://www.lapedrera.com/en/work-antoni-gaudi/park-guell/)
  · [Pòrtic de la Bugadera](https://www.barcelona.com/barcelona-tickets/park-guell-ticket/portico-of-the-washerwoman)
- [La Pedrera: Dach](https://www.lapedrera.com/en/casa-mila/fun-facts/roof-terrace/)
  · [La Pedrera Blog: Dach](https://lapedrera.com/en/blog/the-roof-terrace-at-la-pedrera-casa-mila)
  · [Generalitat: La Pedrera](https://patrimoni.gencat.cat/en/collection/la-pedrera) (Dachboden: nur Suchauszug)
- [La Pedrera: Casa Vicens](https://www.lapedrera.com/en/work-antoni-gaudi/casa-vicens/)
  · [Dezeen 2026: Casa Vicens](https://www.dezeen.com/2026/06/18/casa-vicens-antoni-gaudi-centenary/amp/)

### Empfehlung für Ozzy

1. **„Kaminwächter“, „Studentenblumen“, „Walrippen“** als drei neue Gaudí-Shader statt Casa Batlló und Sagrada Família.
2. **„Wäscherin“** danach (mit dem Motor der Mauer).
3. **Trencadís Spider-Verse** als eigene Fassung.
4. Klinker und Seetang-Eisen als Versuche, wenn Zeit bleibt.
5. **Probe:** drei Bilder im Standardblick. Kriterium: Florian findet sie überraschend und erkennt trotzdem Gaudí.

---

## 7. Ghetto, Punk, Neon, Natur

### 7.1 Ghetto

1. **„Hall of Fame“** (Graffiti in Lagen auf Ziegel): Grund Ziegel (#9a4b33, #b0603f, #7e3e2b; Mörtel #b9b1a3). Darüber **Buff-Flächen**:
   Rechtecke in nicht ganz passendem Grau und Beige (#b9b3a7, #a59f93, #cfc9bd, #8d8f8a) mit Rollenstruktur, unter denen alte Tags
   schwach durchscheinen (ein Kurzfilm von 2001, „The Subconscious Art of Graffiti Removal“, vergleicht sie mit Rothko). Darauf
   **Throw-ups**: Blasenbuchstaben als Vereinigung von drei bis sechs Kugeln je Zelle, schwarze Kontur, Füllung Chrom #c8ccd1 (oben
   heller) oder Weiß, farbiger Schattenblock (#1d4fa0 oder #d01f2f), weiße Glanzhäkchen. **Tags:** einzeilige Striche (fünf bis neun
   Punkte, geglättet, gleiche Neigung), Schwarz #111111 oder Silber, Läufer an den Enden. **Was es echt macht:** Overspray (feiner
   Punktnebel um jeden Strich, Gaußabfall), Farbläufer (Lauf-Feld), Farbe nur auf den hohen Stellen des Grundes (Poren und Fugen
   bleiben frei), Ausbleichen auf der Sonnenseite. Senkrechte Projektion (Baustein 1), damit die Schrift aufrecht steht.
2. **„Sticker-Bomb“:** Aufkleber in Zellen im Raum (je Zelle einer, in der Tangentialebene zufällig gedreht, drei Lagen, der oberste
   gewinnt wie bei der Gouache): Rechteck, Kreis, abgerundet, Stanzform; flache Grafik (Streifen, Kreis, Schriftbalken, „HELLO my name
   is“ mit rotem Band #d71920 und einem Tag), weißer Stanzrand. Vinyl glänzt (Rauheit 0,15), Papier ist matt (0,7). **Was es echt
   macht:** abgelöste Ecken (umgeklappt, weiße Rückseite, Schatten darunter), abgerissene Reste (weiße Papierfasern, Kleberreste),
   Ausbleichen (Faustregel: Rot und Gelb zuerst, Verblichenes wird bläulich).

### 7.2 Punk

1. **„Nietenleder“:** schwarzes Rindleder #15110f, abgerieben auf Höhen und Kanten #4a3d35, Narbung (feine Voronoi-Buckel),
   Knautschfalten quer zur Schwerkraft, in Mulden stärker, Rauheit zwischen 0,4 und 0,65 wechselnd. **Pyramidennieten** in Reihen
   (Würfelraster oder Phasenfeld): quadratischer Fuß, vier Facetten, Nickel #d9dbde (Metall, Rauheit 0,15), angelaufen in den Ecken;
   **Kegelnieten** auf der Mittellinie. Ziernähte als Strichellinien; auf dem Rücken ein Feld weißer Farbe mit Krakelee. **Was es echt
   macht:** die Spiegelung der Umgebung in jeder Niete und dunkle Schmutzringe um ihren Fuß; ohne Umgebung werden Nieten graue Punkte.
2. **„Tartan, zerrissen“:** Royal Stewart (Grund Rot #c8102e, Bänder Dunkelblau #1b2a5e und Grün #0b5d3e, schmale Linien Gelb #f5c400,
   Weiß #f4f2ea und Schwarz; die genaue Fadenfolge aus dem schottischen Tartan-Register), gewebt als 2/2-Köper: Faden (i, j) zeigt die
   Kettfarbe, wenn (i + j) mod 4 < 2, sonst die Schussfarbe; daraus die schrägen Rippen und die Mischfarben an den Kreuzungen.
   Wollflaum als Samtschimmer, Fäden unter 2 px gemittelt. Sicherheitsnadeln (silbern, Abstandsfeld je Zelle), Risse mit
   ausgefransten Fäden, darunter schwarzes Netz. Senkrechte Projektion (der Stoff hängt).
   **Versuch „Iro“:** Haarspitzen auf der Mittellinie (Schalen, Büschel als Flammen), Neongrün #39ff14 oder Pink #ff2fa8, Spitzen
   heller, Haarspray-Glanz.

### 7.3 Neon

Befund: Reines Neon leuchtet orange bis rot; Argon mit Quecksilberdampf und Leuchtstoff gibt Blau und die meisten anderen Farben;
Röhren 9 bis 25 mm, an jedem Ende eine Elektrode.

1. **„Leuchtgas“:** Die Form ist ein Glasgefäß voll leuchtendem Gas. Emission = Farbe mal `(1 - exp(-k · Dicke))` aus Vorder- und
   Rückseite (oder dichter um die Mittelachse aus dem Innenabstand); wo es hell wird, geht die Farbe ins Weiße (überbelichteter Kern),
   am Rand bleibt sie satt. Darüber das Glas mit dünnen, scharfen Spiegelungen (F0 0,04). Zwei eigene Fassungen statt eines Reglers:
   **„Neon Rot“** (#ff4a1c, Kern #ffd3b0) und **„Argon Blau“** (#3a6bff, Kern #dce6ff). Seltenes Flackern (alle 5 bis 15 s zwei, drei
   Bilder dunkel), Zünden beim Anwählen, großer weicher Schein, farbiges Licht auf der Bühne. **Bühne „Nasse Straße nachts“:** dunkler
   Asphalt #0e0f12 mit Pfützen, Spiegelbilder senkrecht gestreckt.
2. **„Neonröhren“:** Die Form wird schwarzer nasser Lack (#0b0b0d, Deckschicht) und trägt Röhren auf der Haut: Mittellinie, einige
   waagerechte Ringe, die Kontur im Profil; am schönsten wären die eigenen Linien der Form (Loops als Punktliste in einer Textur,
   Abstand zum nächsten Abschnitt in 3D). Röhre: Kernlinie fast weiß, farbiges Glas, Glanz, alle zehn Röhrenbreiten ein grauer Halter
   mit Schatten; das Licht der Röhre auf dem Lack (exp-Abfall) und ihr Spiegelbild. Farben: Rot-Orange #ff3b1d, Pink #ff3fbf, Blau
   #2f6bff, Grün #7dff3a, Warmweiß #fff1d6. Einzelne Stücke schwarz abgedeckt wie bei echten Schildern (eigene Beobachtung).
   **Versuch „Schwarzlicht“:** dunkles Violett #1a0f2e, Leuchtfarbe als Spritzer und Läufer (#39ff14, #ff2bd6, #00f0ff, #fff200);
   Weißes leuchtet bläulich #b9c7ff.

### 7.4 Natur

1. **„Moos“:** Polster oben und in Mulden (Normale nach oben, Verdeckung, Rauschen), als Schalen wie Fell: kurze dicke Triebe mit
   sternförmigen Spitzen, Höhe 0,5 bis 2 % R, Polster als Kuppeln (`kuppel`). Farben: Grund #3c5718, Mitte #6b8c24, Spitzen #a9c43f, im
   Gegenlicht durchscheinend #d4e86b. **Was es echt macht:** Sporenkapseln auf dünnen rotbraunen Stielen (#8a3a1c, Kapsel #a5602a),
   zwei- bis viermal so hoch wie das Polster, selten und schräg; Tautropfen an den Spitzen; nackter Stein dazwischen.
2. **„Platane“** (Barcelonas häufigster Straßenbaum, 27 bis 29 % aller Bäume): Rinde als Flickenteppich aus abblätternden Platten
   (verzerrtes 3D-Voronoi, senkrecht leicht gestreckt), jede Platte mit eigenem Alter: frisch #d9d6a6 und #e8dfc6, mittel #9a9566 und
   #8b8463, alt #6f6a5c und #7a7f68; ältere Platten liegen oben, ihre Ränder heben sich leicht (Schattenlinie, heller Bruchrand).
   Grünlicher Algenschimmer auf der Schattenseite, unten rissige dunkle Borke #5a5145. Ein Tarnmuster der Natur, Barcelona ohne
   Klischee (Farben nach Fotos).

### 7.5 Fallen

- Graffiti aus Rauschen wird Matsch: wenige große Throw-ups mit Kontur, viele dünne Tags; Overspray und Läufer machen die Echtheit.
- Leder zu glänzend wird Latex, zu matt Gummi.
- Neon ohne weißen Kern wirkt billig, ein zu großer Schein wird Nebel, ohne Flackern ist es tot.
- Moos in gleichmäßigem Grün wird Teppich; Rinde aus regelmäßigen Zellen wird Giraffe.

### 7.6 Quellen

- [Wikipedia: The Subconscious Art of Graffiti Removal](https://en.wikipedia.org/wiki/The_Subconscious_Art_of_Graffiti_Removal)
- [Wikipedia: Neon lighting](https://en.wikipedia.org/wiki/Neon_lighting) · [Wikipedia: Neon sign](https://en.wikipedia.org/wiki/Neon_sign)
- [Ajuntament de Barcelona: Platanen](https://ajuntament.barcelona.cat/espaisverds/en/management-and-maintenance/management-green-spaces/types-vegetation)
- Lengyel u. a. 2001 (Schalen); eigene Vorarbeit `schalen.ts`, `fell.ts`, `flausch.ts`, `gouache.ts`

### Empfehlung für Ozzy

1. Je Thema zuerst einer: **„Hall of Fame“, „Nietenleder“, „Leuchtgas“, „Moos“**; dann **„Sticker-Bomb“, „Tartan“, „Neonröhren“,
   „Platane“**.
2. Versuche: Iro, Schwarzlicht.
3. Ein Baustein „Graffiti“ für Hall of Fame, Persiana und Gòtic-Mauer.
4. **Probe:** je Shader ein Bild an „strange bird“, nah und fern. Kriterium: Florian sortiert aus.

---

## Vorschlag für die Reihenfolge

1. Bausteine: Reliefschatten mit Streiflicht (hilft sofort Fels und Mauer), dann Innenabstand (Schleimgeist), die senkrechte
   Projektion des Lauf-Felds mit dem ersten Shader, der Schrift oder Stoff braucht.
2. Weiter wie im Plan: Barcelona (Panot nach dem Regen, Pop-Art-Blume, Persiana), Ghetto, Punk, Neon, Natur, dann Nachtschatten und
   Sin City, dazu die Gaudí-Ideen.
3. Jeder Shader eine eigene Datei mit festem Look; Regler nur dort, wo sie den Stil nicht wechseln.
