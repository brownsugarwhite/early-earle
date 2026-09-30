# Stilbibel: Neo-Brutalismus trifft Eyvind Earle (v0.1)

> **Status:** v0.2, Stand 2026-09-30 (Verläufe nach Florians Hinweis: „Earle arbeitet bei seinen Flächen fast immer mit Verläufen“). Quelle: Masterplan v0.1 (Stilanalyse, Rendering-Regeln, Paletten) und der Stil-Report `docs/research/style-eyvind-earle-realtime.md` (kondensiert in [`RESEARCH.md`](RESEARCH.md)). Referenzbilder: 45 PNGs in `ref/eyvind earle/` (lokal, nicht im Repo).
>
> **Für wen:** Florian gibt hiermit den Look frei und ab; der Agent setzt die Regeln in Shader, Generatoren und UI um; Nicole prüft im Lab gegen die Do/Don't-Liste.
>
> **Legende:** **Offen** / **Zu verfeinern** wie im GDD. *(unverifiziert)* = ohne belastbare Quelle.

---

## 1. Leitsatz

**Earle liefert Welt, Licht und Ornament. Neo-Brutalismus liefert Raster, HUD-Chrome und Typografie. Liquid Glass ist gefärbtes Glas über Earle-Bändern.**

Earles Serigrafien sind Stapel flacher, hartkantiger Farbschichten (ein Druck, *Fire Magic*, brauchte 200 Siebe) — und innerhalb dieser Formen laufen die Farben fast immer als **Verlauf** (Irisdruck/Split Fountain, Airbrush): der Himmel vom hellen Horizont in den tiefen Zenit, der Hügel vom hellen Kamm ins tiefere Tal, die Nebelbank hell an ihrem Fuß, die Scheunenwand glühend aus der Mitte. Daraus folgt der wichtigste Satz dieser Bibel: **Harte Formen, weiche Flächen.** Die Kanten — Silhouette, Terminator, Schlagschatten — sind messerscharf und bilden eine Tintenform; *in* der Form verläuft die Farbe weich durch die Palettenstufen. Wir bauen keinen „Toon-Filter" über eine realistische Szene, wir bauen die Szene aus Schichten.

Zweiter Grundsatz (Earle nach van Eyck): **vorne und hinten gleich scharf**. Tiefe entsteht nur aus Wertstufen und Überlappung — nie aus Unschärfe.

## 2. Was die Referenzen zeigen

Neun Beobachtungen aus den 45 Bildern, jeweils mit ihrer Übersetzung ins Spiel.

| # | Beobachtung | Referenz (Ebene) | Übersetzung |
|---|---|---|---|
| 1 | **Horizontale Bänder.** Himmel, Nebel und Hügel sind gestapelte Streifen; Nebel liegt als weiße Horizontalbank *über* den Hügeln — hell und dicht an ihrem Fuß, nach oben verlaufend | 19, 20, 29, 36, 45 | Luftperspektive als Wertstufen, die in sich verlaufen (4–6 Stufen), Nebelbänke mit Verlauf, Himmelsdom als Irisdruck, flache Kamera |
| 2 | **Gemeißelte Hügel + Riesenschatten.** Glatte, fast texturlose Hügelflächen, die vom hellen Kamm ins tiefere Tal verlaufen; Schatten von Baumgruppen sind harte, tief getönte Flächen, die sich extrem in Sonnenrichtung strecken und dem Relief folgen | 7, 16, 20, 43, 49, Screenshot 5 | Sonne sehr flach (9–12°), harte, nachgeschärfte Schattenkanten, Verlauf durch 3–4 Lichtstufen im Material |
| 3 | **Bäume als Kuppel-Cluster mit Punktrand.** Kronen sind übereinander gelegte dunkle Kuppeln; nur die lichtzugewandte Kante trägt helle Punkte. Innen kleine repetitive Motive (Rauten, Kreuze, Blüten) wie Tapisserie | 1, 16, 37, 49; Muster: 3, 23, 29 | Krone = dunkles Primitiv, Punkte = instanzierte Geometrie sonnenseitig, Innenmuster = Instanzen mit anderer Form |
| 4 | **Dünne senkrechte Stämme.** Überlange, hauchdünne, gerade Stämme; kahle Bäume als feine fraktale Linienzeichnungen | 8, 13, 14, 21, 24, 40 | Stämme als dünne Quads („Fäden"), Äste als L-System-Linien (Ornament, kein Umriss) |
| 5 | **Felsen/Türme.** Vertikale Striche, harte Facetten, geometrische Schraffur-Motive; monumentale rote/pinke Monolithe in extremer Untersicht | 22, 25, 30, 33, 35, 46 | prozedurale Schraffur (`fract(höhe·k)` mit `fwidth`-AA), Set-Piece-Monolithe von Florian |
| 6 | **Farbe.** Gesättigte Juwelentöne (Türkis, Neongrün, Violett, Magenta, Rot) gegen Fast-Schwarz; Himmel als weicher Verlauf, Kuppeln drehen innerhalb einer Form von Rot über Violett nach Blau; ein einziger Akzent (rote Scheune, pinker Turm) | überall, Bild 02 | 16–24 Töne pro Zone in OKLab als Stützstellen der Verläufe, getönte Tinte statt Schwarz, genau ein Akzent pro Bild |
| 7 | **Maßstabsfiguren.** Winzige schwarze Silhouetten (Kühe, Pferde) mit langen Schatten | 7, 20, 30, 45 | Blobs und Level-Knoten auf der Map, gerettete Tiere als Silhouetten |
| 8 | **Wasser.** Flache, geschichtete Wellen-Silhouetten, Reflexe als Flächen | 27, 37 | Wellen als Bandebenen, Reflexe als Flächen, Lissajous/Moiré-Muster langsam animiert |
| 9 | **Sleeping-Beauty-Hintergründe.** Gotische Vertikalität, eckige Baumkronen, Tapisserie-Muster, Kulissen in klaren Tiefenebenen | 4, 10, 11, 17, 32, 41, 42, 44 | Kulissen-Tiefenebenen über Nebelstufen; höchstens ein gotischer Akzent in der UI |

**Florians Draft (Screenshot 6)** übersetzt das bereits richtig: Neon-Himmel, khaki Hügel mit schwarzen Schattenkeilen, kleine dunkle Marker, Level-Pfad als Punktlinie mit pinken Knoten. Das ist die Basis der Map-Palette (Tjorizo).

**pezenpez (Screenshot 3)** ist die Referenz für Figuren: Jelly mit Glanzlicht, innere dunklere Formen als halbtransparente „Organe", Bläschen, ein dunkler Schlitz als Auge — und **keine Kontur**.

## 3. Die Konturen-Regel (Florian, verbindlich)

Es gibt genau zwei Zustände. Einen dritten gibt es nicht.

**Zustand 1 — keine Kontur.** Standard für alles: Figuren, Terrain, Pflanzen, Raster, Typo, Buttons, Karten, Sheets. Kanten entstehen ausschließlich aus **Wertkontrast** (Tinte gegen Licht, Band gegen Band, Rim gegen Hintergrund). Verboten sind: Inverted-Hull-Outlines, Screen-Space-Kantenfilter (Tiefe/Normalen), CSS-`border`, SVG-`stroke` als Umriss, dünne oder mittlere Linien um irgendetwas herum. Wo eine Figur vor gleichfarbigem Grund verschwindet, ist die Antwort ein Wertsprung oder ein Rim-Licht — keine Linie.

**Zustand 2 — eine einzige, komplett übertrieben fette Verlaufskontur.** Vorbild: die pinke Kontur des illudiy-„i" im Splashscreen. Maße: Breite **~8–12 % der Elementgröße**, **Zweifarb-Verlauf**, **hart abgesetzt** (keine weiche Kante nach innen oder außen). Reserviert für wenige Hero-Elemente: **Level-Platte, REX-Emblem, Hauptaktion, Zonen-Portal.** Wenn zwei Hero-Elemente gleichzeitig sichtbar sind, ist das bereits viel.

**Der Gegenpol: filigrane Linien und Muster.** Was Florian liebt und was Earle ausmacht — fraktale Astzeichnungen, vertikale Striche und Schraffuren auf Monolithen, Punkt- und Rautenmuster in den Kronen, dazu mathematische Ornamente (Phyllotaxis-Spiralen, Lissajous-Bahnen, Truchet-Kacheln, Moiré-Streifen) — ist ausdrücklich erwünscht: **als Ornament und Textur, nie als Umriss**, und immer lebendig (Zeit-Uniforms).

Merksatz für jede Abnahme: *Linie um etwas herum = falsch. Linie in etwas drin = Ornament.*

## 4. Linien und Muster

- **Kahle Bäume und Äste**: L-System-Linien als instanzierte Segmente oder SDF-Linientexturen — bleiben in jeder Größe haarfein.
- **Schraffuren** auf Felsen und Monolithen: prozedural, Streifen aus `fract(höhe·k)` mit `fwidth`-Antialiasing.
- **Punkt-, Rauten- und Kreuzmuster**: Instanzen, keine Screen-Space-Muster (sie würden beim Rollen der Kugel „schwimmen").
- **Mathematische Muster** (Phyllotaxis, Lissajous, Truchet, Moiré): auf Böden, Wasser und HUD-Hintergründen, langsam animiert.
- **Wachstum lässt Muster dichter werden** (Instanzdichte, Skalierung).
- **Auf der Haut der Blobs**: feine Linien nur als Muster je nach Material (Adern, Schraffur, Punktreihen).

## 5. Rendering-Regeln

Abgeglichen mit der Stil-Recherche (Quellen in `RESEARCH.md`). Vorbilder: *The Banner Saga* (Earle-Schatten als Weltbau), Murphy & Galanter (Texas A&M, SIGGRAPH 2014: L-System-Bäume mit **eigener glatter Schattengeometrie pro Baum**), *Röki* (Shading nur durch Farbwahl), *Open Season* (Kronen aus Karten-Clustern), *Firewatch* (Nebel aus einer 1D-Rampe nach Tiefe).

| Earle-Merkmal | Echtzeit-Übersetzung |
|---|---|
| Horizontale Bänder, gotische Vertikalen | Luftperspektive in verlaufenden Wertstufen, gerade dünne Stämme, flache Kamera |
| Vorne wie hinten scharf | kein Depth of Field, kein Bloom, kein Blur; Tiefe nur über Wertstufen |
| Silhouette zuerst, dann Punkte | dunkle einfache Kronenform + instanzierte helle Punkte |
| Messerscharfe lange Schatten | Sonne 9–12°; anti-aliasierte harte Schatten, mit dem Terminator zu einer Form verschmolzen |
| Juwelentöne und Fast-Schwarz | 16–24 Farben pro Zone; getönte Tinte, nie reines Schwarz |
| Serigrafie-Schichten mit Irisdruck | harte Formen, innen Verläufe durch die Palettenstufen (`fountain`), Himmel als Verlauf |

### 5.1 Licht

**Eine Richtungssonne**, relativ zum Blickpunkt definiert: Höhe **9–12°** über dem Horizont (Earles Schatten sind 5–6× so lang wie der Werfer; aus einem Bild abgeleitet ≈ 11°), **60–80° seitlich** zur Blickachse, damit Schatten als horizontale Bänder über den Bildschirm laufen. Für P2 konkret: Höhe 10°, Azimut 70°, Sonne als Kind der Kamera (Schatten bleiben horizontal, während der Planet rotiert). **Kein Ambient, kein Specular, kein Environment-Licht.** In voll beleuchteten Flächen verschwindet Detail in flachem Licht; die Lichtfläche selbst verläuft weich (siehe 5.10).

### 5.2 Palette

- **16–24 Juwelentöne pro Zone**, in **OKLab** gewählt. Die Palettenstufen sind die **Stützstellen der Verläufe**: in der Mitte jeder Stufe liegt exakt ihre Farbe, dazwischen läuft der Ton zur Nachbarstufe (gemischt wie Druckfarbe, nicht im zu hellen Linearlicht).
- Ablage als **Nearest-Filter-Atlas**: Zeile = Zone bzw. Nebel-Rampe; x = Tinte (Index 0), dann **3–4 Lichtstufen**. Himmel **6 Stufen**, Nebel **4–6 Stufen**; freie Stufen tragen Linienfarben (z. B. `groundLine` der Bodenlinien).
- **Nie reines Schwarz**: getönte „Tinte" pro Zone (siehe Tabelle in Abschnitt 6); Schatten dürfen je Welt getönt sein (`shadowTint`, 5.4).
- Harte Stufen gibt es weiter — als Regler-Stellung 0 (`?verlauf=0`, Lab-Regler „Verläufe“) und automatisch dort, wo eine Stufe auf dem Bildschirm schmaler als ≈ 10 px wird (ferner Boden, kleine Kronen): ein zusammengedrückter Verlauf sähe wie Unschärfe aus. Stufenkanten bleiben dort 1 px breit (`fwidth`).

### 5.3 Terrain

Glatte Meshes, **Verlauf im Material** (Lichtwert → Stufenwert → Irisdruck durch die Palettenstufen), **keine Post-Kette**, 4× MSAA für saubere Kanten. Höhenfeld aus glattem Low-Frequency-Noise: „gemeißelte Hügel", keine Grate. Der Verlauf folgt einer **breiten Verlaufsnormale** (Geländenormale zur Kugelnormale gemischt) plus der Höhe: ein ruhiger Verlauf über den ganzen Hügel — Kamm hell, Tal tiefer —, kleine Dellen und Uferrinnen zeigen keine Dreiecke; die Tintenform (Terminator) folgt weiter dem echten Relief. Meißelschichten sind Sägezähne: jede Schicht verläuft in sich, die Stufe zur nächsten ist eine 1-px-Kante.

### 5.4 Schatten

- Shadow-Map mit Hardware-Vergleichs-Sampler (WebGL2 `sampler2DShadow`, WebGPU `textureSampleCompare`), danach per **`smoothstep(0.5 ± fwidth)` nachgeschärft** → gerade, anti-aliasierte Kanten ohne Treppen und ohne Weichzeichnung. Auflösung 2048² (1024² Low-End).
- Lichtfrustum eng an das Sichtbare gefittet plus Rand `h_max / tan θ` Richtung Sonne, texelweise gesnappt (kein Flimmern), Slope-Scaled Bias + Normal Offset.
- **`lit = min(aaStep(Terminator), Schatten)`** → Eigenschatten und Schlagschatten verschmelzen zu **einer Tintenform**, wie bei Earle. Diese Kante wird **nie** weich — Verläufe gibt es nur innerhalb von Licht- und Schattenform.
- **Schattentönung je Welt** (`SunRig.shadowTint`, Weltdatei `shadowTint: { color, amount, lift }`): Earles Schatten auf Schnee sind blau (Bild 05), im Winterdunst grau-blau (Bild 01). Die Tintenform wird zur Tönung gemischt; `lift` gibt ihr einen Verlauf *innen* (zur Sonne gewandte Hänge heller, abgewandte tief), geführt von der Kugelnormale, damit Gelände, Wehen und Pfad eine Schattenform bleiben. Standard: ungetönte Tinte.
- Schattenpass nur mit **Terrain und glatten Proxy-Formen pro Baumtyp** (nie mit den Punkten); nur bei Bewegung (Rotation, Wachstum) neu rendern.
- **Low-End-Stufe**: kein Schattenpass, sondern Horizon-Maps (überleben das Rollen des Planeten) + analytische Ellipsoid-Schatten (Quilez-Formel).
- Nicht verwenden: three.js `SunLight`/CSM (weiche Kaskaden bekämpfen den Hartkanten-Look), Stencil-Volumes.

### 5.5 Vegetation

- **Krone** = Cézanne-Primitiv (Kegel, Ellipsoid, gestapelte Kegel) mit von einer Hüllkugel kopierten Normalen → leuchtet als eine Masse; Tinte + Verlauf durch die Lichtstufen, **von oben beleuchtet** (Scheitel heller, Unterseite tiefer); Juwelenkuppeln drehen ihren Farbton zur Unterseite (Rot → Violett → Blau, Bild 02). Die Punkte folgen dem Verlauf unter ihnen (eine Stufe heller), nie als Stufensprung.
- **Punkte**: **60–200 instanzierte, opake Sechseck-Punkte** pro Baum aus in Blender gebackenen Poisson-Disk-Positionen (Geometry Nodes), getönt nach `dot(N_sphere, L)`: Lichtseite die zwei hellsten Stufen, Schattenseite spärlich und dunkel. Punkte **< 0,75 px** kollabieren im Vertex-Shader. Opak statt alpha-getestet (`discard` schaltet Hidden-Surface-Removal mobiler GPUs aus).
- **Stämme** als dünne senkrechte „Fäden" (Quads in Tinte).
- **Innenmuster** (Rauten, Kreuze) als Instanzen mit anderer Form.
- **Wachstum** = Instanzdichte (`mesh.count`) und Skalierung, Palettenmischung von verdorrt nach satt.

### 5.6 Nebel und Himmel

Luftperspektive als **Wertstufen nach Distanz** (**4–6 Stufen**, Firewatch-Prinzip), die in sich zur nächsten verlaufen; die fernste Stufe bleibt flach (Horizont und Nachbarwelten als ruhiges Band). Silhouetten zwischen nahem und fernem Hügel bleiben harte Wertsprünge. Dazu 3–5 langsam ziehende **Nebelbänke** *über* den Hügeln: am Fuß hell und dicht mit klarer, welliger Unterkante, nach oben als langer Verlauf ausdünnend; optional **Talnebel** je Welt (`valleyMist`): helle Nebelbank am Talgrund des Geländes. **Himmel als Irisdruck**: weicher Verlauf vom hellen Horizont in den tiefen Zenit, ein breiter Airbrush-Schein zur Sonne hin, optional ein **leuchtender Horizont** je Welt (`skyGlow`, Ebene 16: Licht hinter den Baumreihen); harte Kanten am Himmel haben nur Sonnenscheibe und Ring. Nirgends Blur. Gegen 8-Bit-Treppen in großen Verläufen liegt ein unsichtbares Rauschen von ±½ LSB im Himmel (kein sichtbares Korn — Earles Korn sind Punkte, und die bleiben Ornament). Die Himmelskuppel wird nach allen deckenden Objekten gezeichnet (Tiefentest spart die verdeckten Pixel).

### 5.7 Gekrümmte Welt

Bei Vertex-Shader-Krümmung (regionale Ansicht) nur die **finale Projektion** biegen; Schattenkoordinaten, Bounding-Boxen und Tap-Raycasts aus der **ungebogenen** Position rechnen.

### 5.8 Budget

DPR ≤ 2 (1,5 auf Low-End) · eine `InstancedMesh` pro Baumtyp · **≤ 100 Draw Calls** · Schattenpass nur bei Bewegung · KTX2-Texturen erst ab Phase 1 (in Phase 0 gibt es nur den Paletten-Atlas und 64²-Gesichts-SDFs) · Material-Kompilierung beim Laden (`compileAsync`).

### 5.9 Keine Post-Kette

Kein Depth of Field, kein Bloom, kein Blur, kein Screen-Space-Kantenfilter, keine LUT-Post-Quantisierung. Alles, was der Look braucht, passiert in den Materialien. (Die Technik-Recherche schlug ein halbauflösendes Bloom vor; das widerspricht der van-Eyck-Regel und ist gestrichen.)

### 5.10 Verläufe (seit v0.2)

Florian, 2026-09-30: *„Earle arbeitet bei seinen Flächen oft oder fast immer mit Verläufen … das lässt alles noch etwas sanfter wirken.“*

**Merksatz: harte Form, weiche Fläche.** Wo Earle eine Kante zieht, bleibt sie messerscharf; innerhalb der Form läuft die Farbe.

| Wo ein Verlauf hingehört | Wie (Referenz) |
|---|---|
| Himmel | heller Horizont → tiefer Zenit, Schein zur Sonne, optional leuchtender Horizont (Ebene 19, 16, 27) |
| Hügel und Wiesen | Kamm hell → Tal tiefer, Hang zur Sonne heller; Meißelschichten verlaufen je Schicht (Bild 03, Ebene 36) |
| Luft | Wertstufen nach Distanz, jede Stufe läuft zur nächsten; die fernste bleibt flach (Ebene 19, 20) |
| Nebelbänke | hell und dicht am Fuß, nach oben ausdünnend; Talnebel am Talgrund (Ebene 20, Bild 03) |
| Kuppelkronen | oben hell → Unterseite tief; Juwelenkuppeln Rot → Violett → Blau in einer Form (Bild 02) |
| Fels | Kopf hell → Fuß dunkler, Facetten laufen in sich (Ebene 27, 45, 46) |
| Wasser | Ufer hell → Tiefe dunkler, unter den Wellen-Silhouetten (Ebene 29, 38) |
| Schnee | Creme im Licht; Schatten blau, zur Sonne hin heller (Bild 05) |
| Scheune | Glut aus der Wandmitte als Airbrush, Ränder tiefrot (Bild 01) |
| Pfad, Plateau, Müll | dezent: Pfad in der Mitte heller, Plateau-Sockel zum Fuß tiefer, Müll wie Fels |

| Was hart bleibt | Warum |
|---|---|
| Silhouetten, Terminator, Schlagschatten | eine Tintenform — Earles Grafik lebt von dieser Kante |
| Sonnenscheibe und Ring | die einzigen Kanten im Himmel |
| Ornamente (Linien, Punkte, Rauten, Glyphen) | Muster in der Form, mit 1-px-AA |
| Wertsprung naher Hügel ↔ ferner Hügel | gestaffelte Kulissen statt Dunst |
| Stufen, die auf dem Bildschirm < ≈ 10 px schmal sind | ein gestauchter Verlauf sähe unscharf aus |

**Technik** (`packages/render/src/earle/gradients.ts`, alles ALU, keine Pässe, keine neuen Texturen): `fountain` (Irisdruck durch die Palettenstufen, Mitte jeder Stufe = Palettenfarbe, Platzregel), `mixInk` (Mischen wie Druckfarbe), `aaSaw` (Stufen, die in sich verlaufen), `glow` (Airbrush-Schein), `hueTurn` (Farbton-Drehung der Juwelenkuppeln), `dither` (±½ LSB gegen 8-Bit-Treppen). Drei geteilte Regler ohne Neukompilieren: `earleGradients.surface` (Flächen), `.air` (Himmel, Luft, Nebel), `.dither`; im Earle-Lab der Regler „Verläufe“, überall `?verlauf=0` (alter Siebdruck) bis `?verlauf=1`.

**Weltdatei-Schlüssel** (`content/zones/worlds/*.json`): `shadowTint { color, amount, lift }`, `valleyMist` (0..1), `skyGlow` (0..1), `palette.groundLine` (Farbe der Bodenlinien).

## 6. Paletten

Startpaletten, per k-Means aus den Referenzen extrahiert, **in OKLab zu verfeinern** (Zu verfeinern: Florians Runde nach P2).

| Zone | Himmel | Terrain hell / dunkel | Schatten-Schwarz (Tinte) | Akzent |
|---|---|---|---|---|
| **Tjorizo** | `#7ce6d5` → `#caf5e4` (plus Neongrün `#b8ff2a` aus Florians Draft) | `#b3bb6d` / `#606e4f` | `#242c0b` | Rost `#c8542a`, Türkis `#22baa9` |
| **Syrup** | `#e5aed4` → `#937cc2` | `#b08fcb` / `#7567a8` | `#1a131b` | Orange `#f17023`, Rot `#db292f` |
| **Luzz** | `#dbf8fa` → `#84c9df` | `#5fadb9` / `#2d4455` | `#191b2f` | Neon-Cyan `#2de5f8`, Blau `#15afd1` |
| **Wooding** | `#f7f6d8` → `#e0e6bb` | `#98b392` / `#41422b` | `#252d08` | Gelb `#ddd042`, Rot `#d66e78` |

**Blobs** bleiben als Akzent obendrauf: Start-Jelly `#7ce6d5` / `#22baa9`, Innenformen `#2f7f7a`, Auge `#0f1c22` (aus Screenshot 3). Blob-Paletten pro Zone/Stufe (Basis, Innen, Glanz, Bläschen) liegen in `content/genome/rules.json`.

**Regeln:** genau **ein Akzent** pro Bild (die rote Scheune, der pinke Turm); Tinte ist immer getönt, nie `#000`; Akzentfarben gehören den Hero-Elementen, Level-Knoten und der fetten Verlaufskontur.

## 7. Figuren (Blobs)

- **Keine Kontur.** Kanten aus Fresnel-Rim, Glanzlicht und Wertkontrast gegen die Rasterplatte.
- **Jelly** (Start): Glanzlicht, innere dunklere „Organe" halbtransparent, Bläschen, Wrap-Diffuse als Fake-Subsurface, leichte Refraktion.
- **Flüssig**: flacher, spritzt. **Gas**: Volumen-Wirbel, weiche Kante (die einzige „weiche" Kante im Spiel, und sie ist Materialeigenschaft, kein Blur). **Feuer**: Flammen-Partikel + Emission. **Fell**: später (Shell/Fin).
- **Gesichter** als SDF-Texturen (≈ 64×64), bleiben in jeder Größe scharf.
- **Immer in Bewegung**: Atmung, Noise-Idle, Jiggle aus Impulsen; Assets folgen mit Federphysik.
- **Verschmelzen** ist der spektakulärste Moment: Smooth-Min-Blend, Tropfen, Assets docken um, Material-Effekt, Squash-Pop; große Stufen dürfen aus dem Raster ragen.
- Zwei Render-Kandidaten in P1 (Raymarching vs. Jiggle-Mesh) — die Stilregeln gelten für beide; Florian entscheidet gegen Screenshot 3.

## 8. UI-Regeln: Neo-Brutalismus × Earle

Ausgangspunkt sind die Neo-Brutalismus-Regeln von Nielsen Norman (hoher Kontrast, blockige Raster, 2–3 kräftige Farben, klobige Grotesk-Überschriften, 24–32 px Padding, sichtbare Fokus-Zustände, WCAG-Kontrast) — mit **drei bewussten Abweichungen**, die aus Earle und der Konturen-Regel folgen:

| NN/g-Regel | Bei uns |
|---|---|
| dicke Ränder | **kein Tintenrand** — die Konturen-Regel gilt auch für UI |
| keine Verläufe | **Serigrafie-Verläufe** innerhalb harter Formen (Irisdruck), nie weiche Kanten |
| schwarzer Versatzschatten ~4 px | **getönte Tinte**, `8px 3px 0 var(--ink)`, **in Sonnenrichtung** |

Verläufe in der UI folgen derselben Regel wie in der Welt: Flächen dürfen innen verlaufen (Himmelsfarben, Glas), Kanten und Versatzschatten bleiben hart.

**Tokens** (im Scaffold: `apps/game/src/styles/tokens.css`): `--ink #0f1c22`, `--ink-soft #242c0b`, `--paper #f7f6d8`, Zonenfarben (`--sky-1 #7ce6d5`, `--sky-2 #caf5e4`, `--neon #b8ff2a`, `--teal #22baa9`, `--khaki #b3bb6d`, `--khaki-deep #606e4f`, `--rust #c8542a`, `--pink #e5aed4`, `--violet #937cc2`, `--cyan #2de5f8`), `--sun-shadow: 8px 3px 0`, `--radius: 0`, Grotesk-Display-Font.

**Regeln:**
- UI-Schatten **echoen die Weltschatten**: Richtung = Sonnenrichtung auf den Bildschirm projiziert, überwiegend horizontal.
- Juwelenton-Füllungen; **filigrane Musterlinien** als Trenner und Hintergründe (langsam animiert); höchstens **ein gotischer Akzent** (z. B. eine Initiale).
- Die **fette Verlaufskontur** nur an Level-Platte, REX-Emblem, Hauptaktion, Zonen-Portal.
- **Liquid Glass** (iOS 26+) als gefärbtes Glas in Zonentönung über der Content-Ebene: HUD-Pille, Pause, Booster-Leiste, Sheets. Kein Glas auf Glas. Android/Web: TSL-Glas im Canvas (Rundrechteck-Normale, Snell-Brechung, Farbsplit, Randlicht), `backdrop-filter` für HTML-Menüs.
- ≤ 8 Wörter auf dem Bildschirm; große Touch-Ziele; Bottom-Sheets; Undo.
- 2D-Animationen für UI-Schmuck (dotLottie oder Rive) folgen denselben Regeln: flache Füllungen, keine Umrisse.

## 9. Blender-Pipeline-Regeln

- **Datenmaps backen, nicht Farben**: AO, Krümmung, Höhe, Schatten- und Punktmasken. Die Farbrampen liegen im Spiel-Shader (Shader-to-RGB funktioniert nur in EEVEE und lässt sich nicht backen).
- **Punkte per Geometry Nodes**: „Distribute Points on Faces" im Poisson-Disk-Modus (Mindestabstand) → als Instanzdaten (glTF/JSON) exportieren oder in Texturen backen.
- **Kronen-Normalen per Data-Transfer-Modifier** von einer Hüllkugel.
- **Grease-Pencil-Line-Art** nur als Referenz für Linienführung (Äste, Schraffur) — wird nie als Outline ausgeliefert.
- **Module**: eine Bibliotheks-`.blend`, Sockel als `SOCKET_<slot>`-Empties, Custom Properties als glTF-`extras` (Include → Custom Properties), Shape Keys als Morph Targets; Export headless (`blender -b parts.blend -P export.py -- …`, `tools/blender/export_assets.py`), glTF-Transform (meshopt/KTX2) ab Phase 1.
- **Blender MCP** (Port 9876, N-Panel → MCP → Start) für den Agenten; der Server führt generierten Code ohne Schutz aus — nur mit Bibliotheksdateien arbeiten, die im Git liegen.
- Malt/BEER laufen nicht auf macOS — irrelevant, wir rendern im Spiel-Shader.

## 10. Do / Don't

**Do**
- Harte Formen, weiche Flächen: innen Verläufe (Himmel, Hügel, Nebel, Kuppeln, Fels, Wasser, Schnee), außen messerscharfe Kanten. Tinte getönt. Ein Akzent pro Bild.
- Sonne flach (9–12°), Schatten lang, hart und nachgeschärft; Eigen- und Schlagschatten eine Form.
- Punkte, Rauten, Kreuze als echte Instanzen, sonnenseitig gewichtet.
- Stämme hauchdünn und gerade; Äste als feine L-System-Linien.
- Muster überall, langsam animiert, dichter mit dem Wachstum.
- Versatzschatten in Sonnenrichtung; klobige Grotesk; große Touch-Ziele.
- Fette Verlaufskontur — genau eine Sorte, an höchstens vier Elementtypen.
- Glas getönt in der Zonenpalette, nur als Navigationsebene.

**Don't**
- Keine Kontur um irgendetwas (auch nicht „nur ganz dünn", auch nicht in der UI, auch nicht `border: 1px`).
- Kein Bloom, kein Depth of Field, kein Blur, kein Screen-Space-Kantenfilter, keine Post-Kette.
- Kein reines Schwarz, kein reines Weiß als Fläche.
- Kein Ambient-, Specular- oder Environment-Licht auf Terrain und Vegetation.
- Keine weichen *Kanten* (kein Verlauf über eine Silhouette, einen Terminator oder eine Schattenkante hinweg); kein sichtbares Rauschen (nur ±½ LSB gegen Treppen im Himmel).
- Keine Screen-Space-Punktmuster (sie schwimmen beim Rollen).
- Keine alpha-getesteten Punkt-Sprites auf Mobile.
- Kein Apple-Standard-Glas ungetönt; kein Glas auf Glas.
- Kein Matcap auf Welt-Objekten (passt nicht zu festen Sonnenschatten; nur Props/UI).
- Keine `SunLight`-Kaskaden, keine Stencil-Volumes.
- Kein Text, wo ein Bild reicht; nie mehr als 8 Wörter auf dem Bildschirm.

## 11. Abnahme im Lab

- **P1 (Blob-Lab)**: Florian erkennt Screenshot 3 wieder (Glanz, Organe, Bläschen, Auge); keine Kontur; Verschmelzung liest sich zähflüssig; Materialien Jelly/Flüssig/Gas/Feuer unterscheidbar.
- **P2 (Earle-Lab)**: Florian erkennt Earle **und** seinen Draft wieder; keine sichtbaren Treppen an Schattenkanten (2048-Map); Schatten und Terminator eine Form; Flächen verlaufen weich, ohne Banding-Stufen und ohne matschig zu wirken (Vergleich mit dem Regler „Verläufe“ 0 ↔ 100 %); Punkte nur sonnenseitig hell; ≤ 100 Draw Calls.
- **UI**: kein Tintenrand irgendwo; Schattenrichtung stimmt mit der Sonne überein; genau eine Hero-Kontur-Sorte.
- Screenshots je Stand in `docs/progress/`.

## 12. Offen / Zu verfeinern

- **Paletten** in OKLab (k-Means ist der Start), Bandanzahl je Zone, Nebelstufen — nach P2-Feedback.
- **Verläufe**: Stärke je Welt feinjustieren (Talnebel, Horizontschein, Schattentönung weiterer Welten), Verläufe in der UI (Glas-HUD) nach Florians Blick auf dem iPhone.
- **Hero-Kontur**: exakter Zweifarb-Verlauf pro Zone, Breite innerhalb 8–12 %.
- **Schriften**: Display-Grotesk noch nicht gewählt (Scaffold nutzt Systemschrift).
- **Blob-Render-Kandidat** (a)/(b) — P1.
- „30+ Farben pro Serigrafie" ist *(unverifiziert)*; belegt sind nur die 200 Siebe von *Fire Magic*.
- Blenders NPR-Projekt (Multi-Stage-Compositing): Stand September 2026 nicht geprüft.
- Gelegenheit: Die überarbeitete Earle-Ausstellung des Walt Disney Family Museum läuft 23.10.2026–18.04.2027 (~200 Werke).
