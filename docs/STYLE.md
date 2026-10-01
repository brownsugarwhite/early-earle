# Stilbibel: Neo-Brutalismus trifft Eyvind Earle (v0.1)

> **Status:** v0.3, Stand 2026-09-30 (Verläufe korrigiert nach Florians Rückmeldung: „Earle benutzt Cel-Shading zusammen mit den Verläufen“ — die harten Siebdruckstufen bleiben, große gleichfarbige Flächen verlaufen zusätzlich *innerhalb* ihrer Stufe). Quelle: Masterplan v0.1 (Stilanalyse, Rendering-Regeln, Paletten) und der Stil-Report `docs/research/style-eyvind-earle-realtime.md` (kondensiert in [`RESEARCH.md`](RESEARCH.md)). Referenzbilder: 45 PNGs in `ref/eyvind earle/` (lokal, nicht im Repo).
>
> **Für wen:** Florian gibt hiermit den Look frei und ab; der Agent setzt die Regeln in Shader, Generatoren und UI um; Nicole prüft im Lab gegen die Do/Don't-Liste.
>
> **Legende:** **Offen** / **Zu verfeinern** wie im GDD. *(unverifiziert)* = ohne belastbare Quelle.

---

## 1. Leitsatz

**Earle liefert Welt, Licht und Ornament. Neo-Brutalismus liefert Raster, HUD-Chrome und Typografie. Liquid Glass ist gefärbtes Glas über Earle-Bändern.**

Earles Serigrafien sind Stapel flacher, hartkantiger Farbschichten (ein Druck, *Fire Magic*, brauchte 200 Siebe) — Cel-Shading im Wortsinn: jede Lichtstufe, jedes Himmelsband, jede Wertstufe der Luft ist eine eigene Schicht mit messerscharfer Kante. *Innerhalb* dieser Schichten laufen die Farben oft als **Verlauf** (Irisdruck/Split Fountain, Airbrush): die Wiese von Grün nach Gelb (Ebene 20), die rote Facette des Monolithen von Orange nach Tiefrot (Ebene 45), das Wasser hinten hell und vorn tief (Ebene 29), die Nebelbank hell an ihrem Fuß. Daraus folgt der wichtigste Satz dieser Bibel: **Harte Stufen, Verlauf in der Stufe.** Die Kanten — Silhouette, Terminator, Schlagschatten, jede Stufenkante — sind messerscharf; der Verlauf läuft nie über eine Kante und ersetzt nie eine Stufe. Wir bauen keinen „Toon-Filter" über eine realistische Szene, wir bauen die Szene aus Schichten.

Zweiter Grundsatz (Earle nach van Eyck): **vorne und hinten gleich scharf**. Tiefe entsteht nur aus Wertstufen und Überlappung — nie aus Unschärfe.

## 2. Was die Referenzen zeigen

Neun Beobachtungen aus den 45 Bildern, jeweils mit ihrer Übersetzung ins Spiel.

| # | Beobachtung | Referenz (Ebene) | Übersetzung |
|---|---|---|---|
| 1 | **Horizontale Bänder.** Himmel, Nebel und Hügel sind gestapelte Streifen; Nebel liegt als weiße Horizontalbank *über* den Hügeln — hell und dicht an ihrem Fuß, nach oben verlaufend | 19, 20, 29, 36, 45 | Luftperspektive als harte Wertstufen (4–6), jede mit Verlauf in sich; Nebelbänke mit Verlauf; Himmelsdom in harten Bändern, jedes mit eigenem Verlauf; flache Kamera |
| 2 | **Gemeißelte Hügel + Riesenschatten.** Glatte, fast texturlose Hügelflächen, die vom hellen Kamm ins tiefere Tal verlaufen; Schatten von Baumgruppen sind harte, tief getönte Flächen, die sich extrem in Sonnenrichtung strecken und dem Relief folgen | 7, 16, 20, 43, 49, Screenshot 5 | Sonne sehr flach (9–12°), harte, nachgeschärfte Schattenkanten, 3–4 harte Lichtstufen im Material, in jeder ein Verlauf (Kamm hell → Tal tief) |
| 3 | **Bäume als Kuppel-Cluster mit Punktrand.** Kronen sind übereinander gelegte dunkle Kuppeln; nur die lichtzugewandte Kante trägt helle Punkte. Innen kleine repetitive Motive (Rauten, Kreuze, Blüten) wie Tapisserie | 1, 16, 37, 49; Muster: 3, 23, 29 | Krone = dunkles Primitiv, Punkte = instanzierte Geometrie sonnenseitig, Innenmuster = Instanzen mit anderer Form |
| 4 | **Dünne senkrechte Stämme.** Überlange, hauchdünne, gerade Stämme; kahle Bäume als feine fraktale Linienzeichnungen | 8, 13, 14, 21, 24, 40 | Stämme als dünne Quads („Fäden"), Äste als L-System-Linien (Ornament, kein Umriss) |
| 5 | **Felsen/Türme.** Vertikale Striche, harte Facetten, geometrische Schraffur-Motive; monumentale rote/pinke Monolithe in extremer Untersicht | 22, 25, 30, 33, 35, 46 | prozedurale Schraffur (`fract(höhe·k)` mit `fwidth`-AA), Set-Piece-Monolithe von Florian |
| 6 | **Farbe.** Gesättigte Juwelentöne (Türkis, Neongrün, Violett, Magenta, Rot) gegen Fast-Schwarz; Himmel als Verlauf (oft in Bändern), Kuppeln drehen innerhalb einer Form von Rot über Violett nach Blau; ein einziger Akzent (rote Scheune, pinker Turm) | überall, Bild 02 | 16–24 Töne pro Zone in OKLab als harte Stufen (der Verlauf läuft in einer Stufe zur Nachbarstufe hin), getönte Tinte statt Schwarz, genau ein Akzent pro Bild |
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
| Horizontale Bänder, gotische Vertikalen | Luftperspektive in harten Wertstufen mit Verlauf innen, gerade dünne Stämme, flache Kamera |
| Vorne wie hinten scharf | kein Depth of Field, kein Bloom, kein Blur; Tiefe nur über Wertstufen |
| Silhouette zuerst, dann Punkte | dunkle einfache Kronenform + instanzierte helle Punkte |
| Messerscharfe lange Schatten | Sonne 9–12°; anti-aliasierte harte Schatten, mit dem Terminator zu einer Form verschmolzen |
| Juwelentöne und Fast-Schwarz | 16–24 Farben pro Zone; getönte Tinte, nie reines Schwarz |
| Serigrafie-Schichten mit Irisdruck | harte Stufen (Cel-Shading), in jeder Stufe ein Verlauf nach großräumigen Koordinaten (`stepRamp`), nie über eine Kante |

### 5.1 Licht

**Eine Richtungssonne**, relativ zum Blickpunkt definiert: Höhe **9–12°** über dem Horizont (Earles Schatten sind 5–6× so lang wie der Werfer; aus einem Bild abgeleitet ≈ 11°), **60–80° seitlich** zur Blickachse, damit Schatten als horizontale Bänder über den Bildschirm laufen. Für P2 konkret: Höhe 10°, Azimut 70°, Sonne als Kind der Kamera (Schatten bleiben horizontal, während die Kugel sich dreht — seit ADR 0002 gleitet dabei der Fokus über die unendliche Ebene, die Sonne dreht mit dem Blick). **Kein Ambient, kein Specular, kein Environment-Licht.** In voll beleuchteten Flächen verschwindet Detail in flachem Licht; große Lichtflächen verlaufen innerhalb ihrer Stufe (siehe 5.10).

### 5.2 Palette

- **16–24 Juwelentöne pro Zone**, in **OKLab** gewählt. Die Palettenstufen sind **harte Siebdruckstufen**: jede Stufe steht in ihrer exakten Farbe, der Verlauf in ihr schiebt sie höchstens 30–45 % des Abstands zur Nachbarstufe. Flächen mischen wie Druckfarbe (nicht im zu hellen Linearlicht); Himmel und Luft linear (nahe Stufen, viele Pixel, billiger).
- Ablage als **Nearest-Filter-Atlas**: Zeile = Zone bzw. Nebel-Rampe; x = Tinte (Index 0), dann **3–4 Lichtstufen**. Himmel **6 Stufen**, Nebel **4–6 Stufen**; freie Stufen tragen Linienfarben (z. B. `groundLine` der Bodenlinien).
- **Nie reines Schwarz**: getönte „Tinte" pro Zone (siehe Tabelle in Abschnitt 6); Schatten dürfen je Welt getönt sein (`shadowTint`, 5.4).
- `?verlauf=0` (Lab-Regler „Verläufe“ auf 0) zeigt den reinen Siebdruck — die Stufen allein, genau wie vor v0.2; `?verlauf=1` die Stufen plus Verlauf innen. Die Stufen und ihre Kanten (1 px, `fwidth`) sind bei jedem Reglerstand dieselben.

### 5.3 Terrain

Glatte Meshes, **harte Lichtstufen im Material** (Lichtwert → Stufe → exakte Palettenfarbe), **keine Post-Kette**, 4× MSAA für saubere Kanten. Höhenfeld aus glattem Low-Frequency-Noise: „gemeißelte Hügel", keine Grate. In jeder Stufe läuft ein Verlauf nach einer **großräumigen Koordinate**: vorn tief → zum Horizont hell (Bildhöhe), Hang zur Sonne heller (Kugelnormale), Kamm hell → Tal tief (Höhe) — bis 45 % zur Nachbarstufe. Weil die Koordinate auf beiden Seiten einer Stufenkante fast gleich ist, bleibt jede Kante ein voller Sprung; große Flächen (Wiese, Schnee, Wüste) zeigen den Verlauf deutlich, kleine Formen nur ein Stück davon. Meißelschichten sind Sägezähne mit 1-px-Kante.

### 5.4 Schatten

- Shadow-Map mit Hardware-Vergleichs-Sampler (WebGL2 `sampler2DShadow`, WebGPU `textureSampleCompare`), danach per **`smoothstep(0.5 ± fwidth)` nachgeschärft** → gerade, anti-aliasierte Kanten ohne Treppen und ohne Weichzeichnung. Auflösung 2048² (1024² Low-End).
- Lichtfrustum eng an das Sichtbare gefittet plus Rand `h_max / tan θ` Richtung Sonne, texelweise gesnappt (kein Flimmern), Slope-Scaled Bias + Normal Offset.
- **`lit = min(aaStep(Terminator), Schatten)`** → Eigenschatten und Schlagschatten verschmelzen zu **einer Tintenform**, wie bei Earle. Diese Kante wird **nie** weich; Verläufe gibt es nur innerhalb der Lichtstufen, die Schattenform bleibt flach.
- **Schattentönung je Welt** (`SunRig.shadowTint`, Weltdatei `shadowTint: { color, amount, lift? }`): Earles Schatten auf Schnee sind blau (Bild 05), im Winterdunst grau-blau (Bild 01). Die Tintenform wird flach zur Tönung gemischt — Gelände, Wehen und Pfad bleiben eine Schattenform. `lift` (Standard 0) hellt sie höchstens einen Hauch zur Sonne hin auf, geführt von der Hochachse der Ebene (ADR 0002). Die Tönungen liegen je Welt-Slot. Standard: ungetönte Tinte.
- Schattenpass nur mit **Terrain und glatten Proxy-Formen pro Baumtyp** (nie mit den Punkten); nur bei Bewegung (Schwenken, Wachstum) neu rendern.
- **Ebene (ADR 0002, Karte v5):** Schatten rechnen in der Ebene, nicht auf der angezeigten Kugel. Der **Schattenraum ist eben** (Standard): Schatten sind translationsinvariant — dieselbe Form überall im Bild wie in Earles Gemälden, lang bis zum Horizont, und sie atmen beim Schwenken nicht. Die **Tintenkugel** `k_t` (`earleLight.ink`, Standard 0, `?tintenkugel=`, Earle-Lab) biegt Schattenraum (`y − (x² + z²) · k_t / 2R`), Terminator und Werfer-Discard gemeinsam zurück zur alten Kugel (1 = Nachtseite 5,6 Einheiten neben dem Fokus, kurze Schatten, Atmen). Das Gelände wirft über Stellvertreter je 3 × 3 Chunks (nur Schattenkamera), kleine Werfer (Müll, Requisiten, Tiere, Sockel, Büsche, Stämme) nur in den zwei feinen Kaskaden; Kronen, Gelände, Felsen, Scheunen und Wahrzeichen in allen. Werfer **sonnenwärts außerhalb des Bildes** bleiben geladen, solange ihre Schattenbahn (bis Werferhöhe / tan θ, höchstens 40 Einheiten) das Bild erreichen kann.
- **Gitter an der Ebene (Karte v5):** das Texelgitter der Kaskaden ist in **Ebenenkoordinaten** gesnappt (`originPlane`), nicht am Rig. Beim Schwenken gleiten die Kaskaden (`CascadedShadows.slide`: Lichtkamera mitschieben, Karte behalten) statt neu zu fitten; jede Kaskade trägt einen Rand (fein 0,1 / mittel 0,2 / fern 0,3 der Empfängerausdehnung je Seite) und snappt erst neu, wenn die sichtbaren Empfänger ihn aufgebraucht haben — nur sie zeichnet dann. Ein voller Refit läuft bei Posewechsel, nach 2 Einheiten Fokusweg (Bodenschätzung) oder wenn sich das Höhenband der Chunks im Bild ändert. Ergebnis: keine Treppen, die an den Kanten „laufen“; die Schatten kleben am Gelände (`/lab/shadow?debug=2`: das Schachbrett bleibt beim Ziehen auf dem Boden). Die Empfängerebene des Kontakt-Bias kann von der flachen Facette zur Schattierungsnormale geglättet werden (`?planeSmooth=`, Schatten-Lab „Empfängerebene glätten“) — gegen Knicke an Hügelgraten.
- **Low-End-Stufe**: kein Schattenpass, sondern Horizon-Maps (überleben das Rollen des Planeten) + analytische Ellipsoid-Schatten (Quilez-Formel).
- Nicht verwenden: three.js `SunLight`/CSM (weiche Kaskaden bekämpfen den Hartkanten-Look), Stencil-Volumes.

### 5.5 Vegetation

- **Krone** = Cézanne-Primitiv (Kegel, Ellipsoid, gestapelte Kegel) mit von einer Hüllkugel kopierten Normalen → leuchtet als eine Masse; Tinte + harte Lichtstufen (Facetten), in jeder Facette ein Verlauf **von oben nach unten** (Scheitel heller, Unterseite tiefer); Juwelenkuppeln drehen ihren Farbton zur Unterseite (Rot → Violett, Bild 02) — nur den Farbton, die Facettenkanten bleiben Wertsprünge. Die Punkte sind eine Stufe heller als ihre Facette.
- **Punkte**: **60–200 instanzierte, opake Sechseck-Punkte** pro Baum aus in Blender gebackenen Poisson-Disk-Positionen (Geometry Nodes), getönt nach `dot(N_sphere, L)`: Lichtseite die zwei hellsten Stufen, Schattenseite spärlich und dunkel. Punkte **< 0,75 px** kollabieren im Vertex-Shader. Opak statt alpha-getestet (`discard` schaltet Hidden-Surface-Removal mobiler GPUs aus).
- **Stämme** als dünne senkrechte „Fäden" (Quads in Tinte).
- **Innenmuster** (Rauten, Kreuze) als Instanzen mit anderer Form.
- **Wachstum** = Instanzdichte (`mesh.count`) und Skalierung, Palettenmischung von verdorrt nach satt.

### 5.6 Nebel und Himmel

Luftperspektive als **harte Wertstufen nach Distanz** (**4–6 Stufen**, Firewatch-Prinzip), jede mit einem Verlauf in sich (Sägezahn: vorn klarer, hinten dunstiger, dann der Sprung zur nächsten Stufe — 60 % des Stufenabstands bleiben als Kante). Silhouetten zwischen nahem und fernem Hügel bleiben harte Wertsprünge. Dazu 3–5 langsam ziehende **Nebelbänke** *über* den Hügeln, weich wie Airbrush (Ebene 20): am Fuß hell und dicht mit klarer, welliger Unterkante, nach oben als langer Verlauf ausdünnend; optional **Talnebel** je Welt (`valleyMist`): helle Nebelbank am Talgrund des Geländes. **Himmel in harten Bändern** vom hellen Horizont zum tiefen Zenit, jedes Band mit eigenem senkrechten Verlauf (unten heller, oben tiefer, dann der Sprung ins nächste Band); dezent ein Airbrush-Schein zur Sonne, optional ein **leuchtender Horizont** je Welt (`skyGlow`, Ebene 16: Licht hinter den Baumreihen); Sonnenscheibe und Ring flach. Nirgends Blur. Gegen 8-Bit-Treppen in großen Verläufen liegt ein unsichtbares Rauschen von ±½ LSB im Himmel (kein sichtbares Korn — Earles Korn sind Punkte, und die bleiben Ornament). Die Himmelskuppel wird nach allen deckenden Objekten gezeichnet (Tiefentest spart die verdeckten Pixel).

### 5.7 Gekrümmte Welt

Bei Vertex-Shader-Krümmung (regionale Ansicht) nur die **finale Projektion** biegen; Schattenkoordinaten, Bounding-Boxen und Tap-Raycasts aus der **ungebogenen** Position rechnen.

Seit ADR 0002 ist die Welt eine **unendliche Ebene**, angezeigt als Kugel (R = 32, Krümmungs-Boost 0,14) um den Blickpunkt (azimutal, abstandstreu: `packages/render/src/earle/display.ts`). Licht (flache Normalen, eine Sonne) und Schatten rechnen in der Ebene, jede Stelle sieht die Sonne gleich flach — keine Nachtseite, lange Schatten bis zum Horizont. Die Abbildung gilt nur bis π · R vom Fokus: Fernes wird über den **Bogen auf der Ebene** gekullt, nie über seine Anzeigeposition.

**Lichtkugel und Tintenkugel (Karte v5, `packages/render/src/earle/lightCurvature.ts`).** Damit die Lichtbänder beim Schwenken wieder „wie Flüssigkeiten“ über die Kugel wandern (Florian, Punkt 8), wird die Lichtrichtung je Fragment mit dem Anzeige-Rahmen am Ort gedreht (Rodrigues um `n̂ × up`, Winkel `k · acos(n̂ · up)`; bei k = 1 sieht die Ebene die Sonne genau wie die alte Kugel). Zwei geteilte Uniforms: **Lichtkugel** `k_b` (Standard 0,4) krümmt nur Bänder, Verlauf und Schattentönung — nach unten auf Stufe 0 geklemmt, also keine Nachtseite; **Tintenkugel** `k_t` (Standard 0) krümmt Terminator, Schattenraum und den Werfer-Discard gemeinsam, damit Eigen- und Schlagschatten eine Form bleiben. Beide im Earle-Lab als Regler („Lichtkugel“, „Tintenkugel“) und als `?lichtkugel=` / `?tintenkugel=`; `?verlauf=0` bleibt reiner Siebdruck, die Stufen bleiben gleich hart. Der Vordergrund bleibt ruhig: unter der Kamera treten Bäume weg und Felsen, Scheunen und Wehen sinken in den Boden (Lichtung 4,5 Einheiten), die langen Schatten der Mittelgrund-Elemente fallen hinein.

### 5.8 Budget

DPR ≤ 2 (1,5 auf Low-End) · eine `InstancedMesh` pro Baumtyp · **≤ 100 Draw Calls** (Karte, Hoch: in Ruhe 36–50, beim Schwenken mit Schattenpass 63–112) · Schattenpass nur bei Bewegung · KTX2-Texturen erst ab Phase 1 (in Phase 0 gibt es nur den Paletten-Atlas und 64²-Gesichts-SDFs) · Material-Kompilierung beim Laden (`compileAsync`).

### 5.9 Keine Post-Kette

Kein Depth of Field, kein Bloom, kein Blur, kein Screen-Space-Kantenfilter, keine LUT-Post-Quantisierung. Alles, was der Look braucht, passiert in den Materialien. (Die Technik-Recherche schlug ein halbauflösendes Bloom vor; das widerspricht der van-Eyck-Regel und ist gestrichen.)

### 5.10 Verläufe (seit v0.2, korrigiert in v0.3)

Florian, 2026-09-30: *„Earle arbeitet bei seinen Flächen oft oder fast immer mit Verläufen … das lässt alles noch etwas sanfter wirken.“* Und nach dem ersten Versuch, der die Stufen durch Verläufe ersetzt hatte: *„Earle benutzt Cel-Shading zusammen mit den Verläufen. Nicht nur das coole Shading davor durch Verläufe ersetzen. Ich dachte eher, dass es so bleibt, wie es ist, aber große gleichfarbige Flächen wie Wiesen und Schnee und Wüste auch wie bei Earle einen zusätzlichen Verlauf bekommen.“*

**Merksatz: harte Stufe, Verlauf in der Stufe.** Die Siebdruckstufen — Lichtbänder, Himmelsbänder, Wertstufen der Luft, Terminator, Schlagschatten — bleiben genau so hart wie ohne Verlauf. Innerhalb jeder Stufe läuft die Farbe höchstens 30–45 % des Abstands zur Nachbarstufe, **nie über eine Stufenkante**; jede Kante bleibt ein sichtbarer Sprung. Große gleichfarbige Flächen zeigen den Verlauf deutlich, kleine Formen kaum.

| Wo ein Verlauf hingehört | Wie (Referenz) |
|---|---|
| Wiese, Schnee, Wüste (Gelände) | in jeder Lichtstufe vorn tief → zum Horizont hell, Hang zur Sonne heller, Kamm hell → Tal tief; bis 45 % (Ebene 20: die Wiese läuft in ihrer harten Form von Grün nach Gelb) |
| Himmel | jedes Band unten heller, oben tiefer, dann der harte Sprung ins nächste Band; dezent ein Schein zur Sonne, optional leuchtender Horizont (Ebene 16, 19) |
| Luft | jede Wertstufe verläuft in sich (vorn klarer → hinten dunstiger), dann der Sprung (Ebene 19, 20) |
| Nebelbänke | weich wie Airbrush: hell und dicht am Fuß, nach oben ausdünnend; Talnebel am Talgrund (Ebene 20) |
| Kuppelkronen | Facetten hart, in jeder Facette oben hell → unten tief; Juwelenkuppeln drehen den Farbton innerhalb der Facetten (Bild 02) |
| Fels, Monolith | Facetten hart, in jeder oben hell → Fuß tiefer (Ebene 45: die rote Fläche verläuft in der harten Facette) |
| Wasser | über die ganze Fläche hinten hell → vorn tief, die Wellenformen behalten ihre Kanten (Ebene 29) |
| Schnee | Creme bis Hellblau in den Lichtstufen verlaufend; Schatten flach blau (Bild 05) |
| Scheune | harte Glut-Ellipse in der Wandmitte, in ihr zur Mitte heller (Bild 01) |
| Pfad, Plateau, Müll | dezent: Pfad zur Mitte heller, Plateau-Sockel zum Fuß tiefer, Müllberge und Monolithe oben hell |

| Was hart bleibt | Warum |
|---|---|
| Lichtstufen, Himmelsbänder, Wertstufen der Luft | Earles Cel-Shading: jede Stufe ein eigenes Sieb |
| Silhouetten, Terminator, Schlagschatten | eine Tintenform — Earles Grafik lebt von dieser Kante |
| Wertsprung naher Hügel ↔ ferner Hügel | gestaffelte Kulissen statt Dunst |
| Schattenflächen | flache (je Welt getönte) Tinte, kein Verlauf innen |
| Sonnenscheibe und Ring | flach |
| Ornamente (Linien, Punkte, Rauten, Glyphen) | Muster in der Form, mit 1-px-AA |
| Spielbrett (Platte, Felder, Blobs) | Lesbarkeit geht vor |

**Technik** (`packages/render/src/earle/gradients.ts`, alles ALU, keine Pässe, keine neuen Texturen): `stepRamp` (exakte Palettenstufe mit 1-px-Kante wie `PaletteLookup.bands`, dazu der Verlauf innen: eine großräumige Koordinate g ∈ [−1, 1] schiebt die Farbe um g · Stärke zur helleren bzw. dunkleren Nachbarstufe; g ist auf beiden Seiten einer Kante gleich, der Sprung bleibt voll — oder als Sägezahn je Stufe für Himmel und Luft), `shiftTone` (Farbe einer Musterfläche zum Nachbarton schieben: Wasser), `mixInk` (Mischen wie Druckfarbe), `aaSaw` (Meißelschichten), `glow` (Airbrush-Schein), `hueRotate` (Farbton-Drehung der Juwelenkuppeln), `dither` (±½ LSB gegen 8-Bit-Treppen). `EarleMaterial` nimmt `gradient` (Koordinate oder Funktion der Lichtrichtung) und `gradientAmount` (Standard 0,4 × Flächen-Regler). Kosten: dieselben zwei Paletten-Lookups wie die harten Bänder plus ein paar ALU-Operationen (M3 Pro, gegen denselben Stand ohne Verläufe gemessen: Mobil 590×1278 +0–0,2 ms, Hoch 786×1704 +0,13–0,31 ms GPU-Zeit je Bild). Drei geteilte Regler ohne Neukompilieren: `earleGradients.surface` (Flächen), `.air` (Himmel, Luft, Nebel), `.dither`; im Earle-Lab der Regler „Verläufe“, überall `?verlauf=0` (reiner Siebdruck, wie vor v0.2) bis `?verlauf=1` (Stufen plus Verlauf innen).

**Weltdatei-Schlüssel** (`content/zones/worlds/*.json`): `shadowTint { color, amount, lift? }` (`lift` Standard 0), `valleyMist` (0..1), `skyGlow` (0..1), `palette.groundLine` (Farbe der Bodenlinien).

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
| keine Verläufe | **Serigrafie-Verläufe** innerhalb harter Stufen (Irisdruck), nie über eine Kante |
| schwarzer Versatzschatten ~4 px | **getönte Tinte**, `8px 3px 0 var(--ink)`, **in Sonnenrichtung** |

Verläufe in der UI folgen derselben Regel wie in der Welt: Flächen dürfen innen verlaufen (Himmelsfarben, Glas), Kanten und Versatzschatten bleiben hart.

**Tokens** (im Scaffold: `apps/game/src/styles/tokens.css`): `--ink #0f1c22`, `--ink-soft #242c0b`, `--paper #f7f6d8`, Zonenfarben (`--sky-1 #7ce6d5`, `--sky-2 #caf5e4`, `--neon #b8ff2a`, `--teal #22baa9`, `--khaki #b3bb6d`, `--khaki-deep #606e4f`, `--rust #c8542a`, `--pink #e5aed4`, `--violet #937cc2`, `--cyan #2de5f8`), `--sun-shadow: 8px 3px 0`, `--radius: 0`, Grotesk-Display-Font.

**Regeln:**
- UI-Schatten **echoen die Weltschatten**: Richtung = Sonnenrichtung auf den Bildschirm projiziert, überwiegend horizontal.
- Juwelenton-Füllungen; **filigrane Musterlinien** als Trenner und Hintergründe (langsam animiert); höchstens **ein gotischer Akzent** (z. B. eine Initiale).
- Die **fette Verlaufskontur** nur an Level-Platte, REX-Emblem, Hauptaktion, Zonen-Portal.
- **Fette Display-Schrift: Caprasimo** (SIL OFL, an Cooper Black angelehnt; Florian 2026-09-30, Cooper Black Std aus Adobe Fonts ist nicht einbettbar). CSS-Familie `'EE Heavy'`, Token `--font-heavy`, nativ registriert im Glas-HUD. **Nur** für Zahlen, Prozent, Punkte, kurze Titel (höchstens drei Wörter) und Stempel: Loader-Prozent, „Tippen“, Zugzahl und Punkte im HUD, Sieg-/Verloren-Banner, Stufen-Badges, „NEU!“, „Bestwert!“, Setzkasten-Zähler, Klassik-Punkte. **Nie** für REX-Sätze, Knöpfe, Ziele, Labs und Werkstatt. Die Mathe-Zeichen der Schrift (∞, π …) sind Platzhalter und fallen per `unicode-range` auf die Ersatzschrift zurück.
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
- Harte Stufen, Verlauf in der Stufe: große Flächen verlaufen innen (Wiese, Schnee, Wüste, Himmelsbänder, Kuppeln, Fels, Wasser), jede Stufenkante bleibt ein harter Sprung. Tinte getönt. Ein Akzent pro Bild.
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
- Keine weichen *Kanten* (kein Verlauf über eine Silhouette, einen Terminator, eine Schattenkante oder eine Stufenkante hinweg); die Stufen nie durch Verläufe ersetzen; keine Verläufe in Schattenflächen; kein sichtbares Rauschen (nur ±½ LSB gegen Treppen im Himmel).
- Keine Screen-Space-Punktmuster (sie schwimmen beim Rollen).
- Keine alpha-getesteten Punkt-Sprites auf Mobile.
- Kein Apple-Standard-Glas ungetönt; kein Glas auf Glas.
- Kein Matcap auf Welt-Objekten (passt nicht zu festen Sonnenschatten; nur Props/UI).
- Keine `SunLight`-Kaskaden, keine Stencil-Volumes.
- Kein Text, wo ein Bild reicht; nie mehr als 8 Wörter auf dem Bildschirm.

## 11. Abnahme im Lab

- **P1 (Blob-Lab)**: Florian erkennt Screenshot 3 wieder (Glanz, Organe, Bläschen, Auge); keine Kontur; Verschmelzung liest sich zähflüssig; Materialien Jelly/Flüssig/Gas/Feuer unterscheidbar.
- **P2 (Earle-Lab)**: Florian erkennt Earle **und** seinen Draft wieder; keine sichtbaren Treppen an Schattenkanten (2048-Map); Schatten und Terminator eine Form; die Siebdruckstufen sind bei jedem Stand des Reglers „Verläufe“ gleich hart, große Flächen verlaufen innen ohne Treppen und ohne matschig zu wirken (Vergleich 0 ↔ 100 %); Punkte nur sonnenseitig hell; ≤ 100 Draw Calls.
- **UI**: kein Tintenrand irgendwo; Schattenrichtung stimmt mit der Sonne überein; genau eine Hero-Kontur-Sorte.
- Screenshots je Stand in `docs/progress/`.

## 12. Offen / Zu verfeinern

- **Paletten** in OKLab (k-Means ist der Start), Bandanzahl je Zone, Nebelstufen — nach P2-Feedback.
- **Verläufe**: Stärke je Welt feinjustieren (Talnebel, Horizontschein, Schattentönung weiterer Welten), Landmarken-Felsen (Ruine, Felswände) mit Verlauf in den Facetten, Verläufe in der UI (Glas-HUD) nach Florians Blick auf dem iPhone.
- **Hero-Kontur**: exakter Zweifarb-Verlauf pro Zone, Breite innerhalb 8–12 %.
- **Schriften**: fette Display-Schrift entschieden (Caprasimo, §8); eine Grotesk für Überschriften/Knöpfe ist weiter offen (heute Systemschrift).
- **Blob-Render-Kandidat** (a)/(b) — P1.
- „30+ Farben pro Serigrafie" ist *(unverifiziert)*; belegt sind nur die 200 Siebe von *Fire Magic*.
- Blenders NPR-Projekt (Multi-Stage-Compositing): Stand September 2026 nicht geprüft.
- Gelegenheit: Die überarbeitete Earle-Ausstellung des Walt Disney Family Museum läuft 23.10.2026–18.04.2027 (~200 Werke).
