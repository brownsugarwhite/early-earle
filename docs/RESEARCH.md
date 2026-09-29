# Recherche (kondensiert) — Stand 2026-09-29

> Kondensierte Fassung der vier Roh-Reports in `docs/research/` (dort auf Englisch, mit allen ~150 Quellen). Hier stehen die Kernaussagen und Zahlen, die in Masterplan, [`GDD.md`](GDD.md), [`STYLE.md`](STYLE.md) und [`ADR/0001-engine.md`](ADR/0001-engine.md) eingeflossen sind, plus die wichtigsten Quellen je Bereich. Aussagen mit *(unverifiziert)* sind nicht belegt; Engineering-Meinungen der Recherche-Agenten sind als **Meinung** gekennzeichnet.

| Bereich | Roh-Report | Leitfrage | Kernergebnis |
|---|---|---|---|
| Stil | `research/style-eyvind-earle-realtime.md` | Wie rendert man Eyvind Earle in Echtzeit auf Mobilgeräten? | Bänder sind werktreu; Sonne 9–12°; nachgeschärfte Shadow-Map; Punkte als Instanzen; keine Post-Kette |
| Technik | `research/tech-stack.md` | Welcher Stack für app-first + Browser mit einem Grafiker und einem KI-Agenten? | three.js WebGPU/TSL + Capacitor als Top-Pick, Godot 4.7 als Runner-up; WKWebView auf 60 fps begrenzt; Liquid Glass nur nativ |
| Gamedesign | `research/gamedesign-merge-levels.md` | Wie wird 2048 levelbasiert — mit Map, Guide und Charity? | Marktlücke ist echt; Ecken-Strategie und exponentielle Kosten lösen; Kings Blocker-Framework; Versuche statt Gewinnrate; Studio spendet selbst |
| Architektur-Review | `research/architecture-review-p0-p3.md` | Ist der Plan für P0–P3 umsetzbar, was fehlt? | Widersprüche, Versionsfehler, unrealistische Annahmen und fehlende Regeldetails — alle in Plan v0.1 eingearbeitet |

---

## 1. Stil: Eyvind Earle in Echtzeit

### 1.1 Kernaussagen

Vier Punkte tragen das Rezept:

1. **Earles Serigrafien (ab 1974) sind Stapel flacher, opaker, hartkantiger Farbschichten** — er machte seine Farbauszüge selbst; *Fire Magic* brauchte 200 Siebe. Gebänderte, palettenindizierte Schattierung ist deshalb werktreu, kein Kompromiss. Die oft genannten „30+ Farben pro Druck" sind *(unverifiziert)*.
2. **Seine Schatten sind 5–6× so lang wie der Werfer** (in einem untersuchten Bild ≈ 5×) → Sonne **≈ 11°** über dem Horizont; im Plan als Bereich **9–12°**, 60–80° seitlich zur Blickachse.
3. **Bestes Vorbild**: die Texas-A&M-Arbeit von Murphy & Galanter (SIGGRAPH 2014/15) — L-System-Bäume, Toon-Shading, Punkte und Linien als echte Geometrie, **eigene glatte Schattengeometrie pro Baum**, LOD.
4. **Punkte sind echte instanzierte Formen**, kein Screen-Space-Muster.

Weitere belegte Merkmale: Kompositionen aus horizontalen und vertikalen Flächen (Giaimo); für *Sleeping Beauty* wollte Earle „stylized, simplified Gothic" — begradigte Bäume, Büsche als Tapisserie-Muster (Millefleurs-Vorbild). **Van-Eyck-Regel** (Interview 1979): Vordergrund und meilenweit entfernter Baum gleich scharf; Tiefe aus Überlappung, relativer Größe und Linienstärke, nicht aus Perspektive oder Unschärfe. Methode: dunkle Untermalung, starke Silhouetten, dann immer kleinere kalligrafische Details („ein Klecks für einen Busch, dann Blätter"); Schichten von dunkel nach hell innerhalb eines Farbtons; in den späten Ölbildern Zehntausende winziger heller Punkte. Laub reduziert sich auf Cézanne-Würfel, -Pyramiden und -Kugeln; Bäume werden dünne Fäden. Schatten: messerscharf, tintendunkel, über weichen Feldern; im vollen Licht verschwindet Detail. Farbe: juwelenartig, analoge Töne (Lapis, Gelbgrün, Muschelrosa, Hellblau aus den *Très Riches Heures*); oft streng begrenzte Paletten; ein Hintergrund brauchte bis zu 10 Tage (statt einem).

### 1.2 Prior Art

| Projekt | Was übertragbar ist |
|---|---|
| *The Banner Saga* | Earle-Schatten („Sonne geht immer unter") als Weltbau; Palette um Fast-Schwarz verankert; Formdisziplin schlägt Technologie |
| Murphy & Galanter (Texas A&M) | Proxy-Schattenwerfer und geometrische Punkte |
| *Open Season* | Kiefern als gestapelte Kegel, Nadelbüschel auf Karten → funktioniert auf Mobile |
| *Röki* | keine Lichter, nur Farbwahl; Näherungs-Tönung als Pseudolicht; Rauschen gegen Banding nur in Verläufen |
| *Firewatch* | Nebelfarbe aus 1D-Rampe nach Tiefe → gestapelte Silhouetten, ein Texturzugriff |
| *Sable*-Nachbauten | Zweiton-Shading + Screen-Space-Kanten — der Kantenfilter kostet Bandbreite auf Mobile (und widerspricht unserer Konturen-Regel) |
| *Pentiment*, *Cuphead* | flache Perspektive durch Kamera-Beschränkung; der Look lebt in den Assets |

### 1.3 Techniken und Zahlen

**Schatten bei flacher Sonne.** Schattenlänge `h / tan θ`; Shadow-Map-Texel strecken sich um ≈ `1/sin θ` (≈ 5×) *entlang* der Lichtrichtung, nicht quer — lange Seiten bleiben scharf, nur die Spitze wird grob; streifende Winkel erzeugen Acne (Slope-Scaled Bias + Normal Offset).

| Technik | Kante | Kosten Mobile | Einsatz |
|---|---|---|---|
| Shadow-Map, nach dem Filtern nachgeschärft | sauber, anti-aliasiert, „wie gezeichnet" | ein Tiefenpass, ein Vergleichs-Read | **Standard** |
| Horizon-Map | hart | zwei RGBA8-Texturen, einmal gebacken; bewegte Sonne ok | Terrain-Eigenschatten, Low-End |
| Analytische Proxys (Kugel/Ellipsoid/Kapsel, Quilez) | exakt | Arithmetik pro getestetem Werfer + Raster | Baumschatten, Low-End |
| Planare Projektion (`ShadowMesh`) | exakt | sehr billig | nur flacher Boden |
| Stencil-Volumes | pixelgenau | sehr hohe Füllrate bei flacher Sonne | vermeiden |
| SDF-Raymarch | einstellbar | viele Auswertungen pro Pixel | Offline-Baking |

Rezept: Lichtfrustum eng fitten + Rand `h_max / tan θ`, texelweise snappen; ein Read über Vergleichs-Sampler (`sampler2DShadow` / `textureSampleCompare`, 2×2 Hardware-PCF); dann `smoothstep(0.5 ± fwidth)` → gerade Segmente ohne Treppen und ohne Blur. three.js: `BasicShadowMap` ist ungefiltert, PCF Standard; der WebGPU-Renderer implementiert Filter als austauschbare Shader-Nodes → Nachschärfen ist ein kleiner Custom-Node. **Eine Tintenform**: `lit = min(aaStep(N·L), shadow)`.

**Punkte (Pointillismus).** WebGPU zeichnet Punkte nur 1 px breit → instanzierte Quads; WebGL `gl_PointSize` garantiert nur 1, Apple M1/M2 deckeln bei 64. **Meinung**: opake Sechseck-Meshes statt alpha-getesteter Sprites (`discard` schaltet Hidden-Surface-Removal aus). Alternativen: gebackene SDF-Punkttexturen (bleiben rund beim Vergrößern), prozedurale Halftone mit `fwidth` (unter ~2 px Zelle zur Mittelfarbe ausblenden), Dither3D (surface-stable, MPL-2.0, Godot/Unreal-Ports; 1 3D-Texturzugriff + pow/exp2/log2/sqrt pro Pixel → nur ausgewählte Flächen), Screen-Space-Blue-Noise (schwimmt bei Kamerabewegung).

**Posterisierung.** Pro Kanal quantisieren verschiebt Farbtöne → Helligkeit quantisieren und nachschlagen; Palette in **OKLab** wählen; **im Material** quantisieren (kein Extra-Pass, MSAA-Kanten bleiben glatt). Toon-Rampen: `MeshToonMaterial` braucht `NearestFilter`; Matcaps sind blickrelativ und passen nicht zu festen Sonnenschatten (nur Props/UI). Furchen: `fract(höhe·k)` mit AA.

**Neo-Brutalismus (NN/g)**: hoher Kontrast, blockige Raster, 2–3 kräftige Farben, dicke Ränder, keine Verläufe, schwarze Versatzschatten (~4 px), klobige Grotesk-Überschriften, 24–32 px Padding, sichtbare Fokus-Zustände, WCAG-Kontrast. Fusion laut Report: Ränder/Schatten in getönter Tinte, Schattenrichtung = Sonnenrichtung, nur gestufte Verläufe, höchstens ein gotischer Akzent. (Ränder sind bei uns gestrichen — Abschnitt 5.)

**Blender**: Shader-to-RGB + Constant-Color-Ramp gibt Toon-Bänder, aber nur in EEVEE; Baking nur in Cycles, wo Shader-to-RGB nicht funktioniert → **Datenmaps backen** (AO, Krümmung, Höhe, Schatten-/Punktmasken), Rampen im Spiel-Shader. Punkte: Geometry Nodes „Distribute Points on Faces" (Poisson-Disk) → Instanzdaten exportieren. Kronen-Normalen: Data-Transfer-Modifier. Grease-Pencil-Line-Art für Referenzlinien. Malt/BEER: nur Windows/Linux. Blenders NPR-Projekt (Multi-Stage-Compositing, Start nach 5.0 im November 2025, mit Dillon Goo Studio): Stand September 2026 nicht geprüft.

**Rezept-Budget** (Meinung, zu profilen): DPR ≤ 2 (1,5 Low-End); eine `InstancedMesh` pro Baumtyp; ~100 Draw Calls; Shadow-Map 2048² (1024² Low-End), nur bei Bewegung; 4× MSAA ohne Post-Kette (utsubo: MSAA fallen lassen, sobald Post-Effekte laufen — wir haben keine); Palette 16–24 Töne, Himmel 8–12 Stufen, Nebel 4–6; 60–200 Punkte pro Baum, Kollaps < 0,75 px; gekrümmte Welt nur in der finalen Projektion biegen.

### 1.4 Lücken

ArtStation-Studie, Thesis-PDF und Artsy-Artikel konnten nicht geöffnet werden (Earle-Zitat via Snippets); „30+ Farben" *(unverifiziert)*; Mobile-Empfehlungen sind Meinung; Blender-NPR-Stand ungeprüft. Gelegenheit: überarbeitete Earle-Ausstellung im Walt Disney Family Museum, 23.10.2026–18.04.2027 (~200 Werke).

### 1.5 Quellen (Stil)

- https://eyvindearle.com/about-serigraphs/ — Earle über Serigrafie als eigenes Medium
- https://eyvindearle.com/glossary/ — Farbauszüge, 200 Siebe für *Fire Magic*
- https://elisesigh.substack.com/p/eyvind-earle-the-artist-behind-sleeping — van-Eyck-Regel (Interview 1979)
- https://joshuaelek.com/water-color/master-study-eyvind-earle/ — Schatten ≈ 5× Höhe, Tiefe aus Überlappung
- https://hifructose.com/2026/03/12/uncanny-valley-the-oil-paintings-of-the-late-eyvind-earle-still-have-a-resounding-influence-on-artists-viewers-today/ — Technik der späten Öle, Punkte, Schatten
- https://www.disneyhistory101.com/disneyhistory101guidedtours/tag/Eyvind+Earle — Giaimo: Horizontalen/Vertikalen, Juwelenfarben
- https://www.polygon-treehouse.com/blog/2018/3/7/inspiration-corner-eyvind-earle — *The Banner Saga* und Earle
- https://history.siggraph.org/experience/developing-stylized-trees-and-landscapes-inspired-by-eyvind-earle-by-murphy-and-galanter/ — Murphy & Galanter, Texas A&M
- https://www.polygon-treehouse.com/blog/2017/6/23/the-art-style-of-roki-part-one — *Röki*: Shading nur durch Farbwahl
- https://halisavakis.com/my-take-on-shaders-firewatch-multi-colored-fog/ — Firewatch-Nebel aus 1D-Rampe
- https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps — Shadow-Map-Techniken (Fitting, Snapping, Bias)
- https://github.com/oneilltomhq/three-rs/issues/168 — ShadowFilterNode im WebGPU-Renderer
- https://dasilvagf.github.io/posts/2020/08/fun-with-horizon-maps/ — Horizon-Maps
- https://webgpufundamentals.org/webgpu/lessons/webgpu-points.html — Punkte in WebGPU (1 px → Quads)
- https://lettier.github.io/3d-game-shaders-for-beginners/posterization.html — Posterisierung ohne Farbverschiebung
- https://www.nngroup.com/articles/neobrutalism/ — Neo-Brutalismus-Regeln
- https://alastaira.wordpress.com/2013/10/25/animal-crossing-curved-world-shader/ — gekrümmte Welt (Rolling Log)
- https://docs.blender.org/manual/en/latest/render/shader_nodes/color/shader_to_rgb.html — Shader to RGB nur in EEVEE

---

## 2. Technik: Stack für App-first + Browser

### 2.1 Plattform-Fakten (September 2026)

| Thema | Stand |
|---|---|
| WebGPU in Safari 26 | ausgeliefert auf macOS, iOS, iPadOS, visionOS; three.js, Babylon, PlayCanvas, Unity laufen |
| WebGPU in WKWebView | laut Apple-Ingenieur verfügbar, sobald standardmäßig aktiv — das ist iOS 26; **auf echtem Gerät prüfen** |
| Chrome Android | seit Chrome 121 (Android 12+, Qualcomm/ARM), Imagination seit 139, **Samsung Xclipse erst ~154** |
| Android WebView | in Chromium-Notizen als WebGPU-Plattform genannt (M139, Compat-Modus WebView 146); Capacitor-Nutzer melden trotzdem Fehlen → **Laufzeit-Check, WebGL2 als Basis** |
| Firefox | Windows seit 141, macOS 145/147; Linux/Android 2026 geplant |
| Bildrate WKWebView | **auf iPhone bei 60 Hz gedeckelt**; WebKit-Bug 294338 offen; Workarounds nur mit privaten APIs („not zero risk", verstößt gegen Review 2.5.1); CSS-Transform/Opacity laufen mit 120 Hz |
| JavaScript-Tempo | WKWebView hat JIT; JavaScriptCore direkt in der App ohne JIT ≈ 12–15× langsamer |
| three.js WebGPURenderer | Import-and-go seit r171 mit WebGL2-Fallback; bekannte Reports: langsamer als klassischer WebGLRenderer bei vielen Einzel-Meshes, sehr langsame erste Material-Kompilierung → **vorher benchmarken**; aktuell r186 (08.09.2026) |

### 2.2 Engine-Matrix (Kurzform)

| Option | Stärken | Schwächen | Urteil |
|---|---|---|---|
| **three.js** (WebGPURenderer + TSL; R3F 9, v10 alpha mit WebGPU) | reines TypeScript, meiste Trainingsdaten, Headless-Tests, Web nativ, Editor = HTML-Overlay; TSL → WGSL und GLSL; Compute-Partikel (500k im Demo) | Partikel selbst bauen (three.quarks nur WebGL); 60 Hz auf iOS im WebView | **Top-Pick** |
| **Babylon.js 9** (März 2026) | GPU-Partikel, Node Material/Particle Editor, Flow Maps | Havok nur Rigid; Babylon React Native begrenzt | gleichwertig, falls visuelle Node-Editoren gewünscht |
| PlayCanvas | reifes WebGPU, Cloud-Editor mit MCP | Editor nicht in die eigene App einbettbar | gangbar |
| **Godot 4.7** (Juni 2026) | nativ Metal/Vulkan, 120 Hz; GPUParticles mit Editor; Jolt Standard seit 4.6 inkl. SoftBody3D; SpringBoneSimulator3D; neues IK-System; Text-`.tscn`, Headless-CLI, MCP-Server; Xogot = Editor auf iPad | **Web nur WebGL2-Compatibility-Renderer, kein C# im Web** | **Runner-up** |
| Unity 6.6 (Sept 2026) | bestes Tooling; WebGPU produktionsreif | Web-Build schwer, iOS-OOM-Berichte; YAML-Assets mit GUIDs für KI schlecht; Obi Softbody kostenpflichtig; Runtime Fee abgeschafft, frei < 200 k$ | sicher, wenn Browser optional wäre |
| Unreal 5 | AAA | kein gepflegter Web-Export | nein |
| Defold 1.13 | ~1 MB Web-Build, Editor-HTTP-API | 3D dünn, keine Softbodies | für 2D |
| Cocos, Bevy 0.19, Flutter Flame, Apple-nativ | — | neuer Editor / kein Editor / 3D Preview / kein Web | beobachten bzw. nur UI-Chrome |
| **Expo + react-native-wgpu** | derselbe three.js/TSL-Code nativ über Dawn (Metal/Vulkan), natives `expo-glass-effect` | WASM-Bibliotheken bräuchten native Bindings (Hermes ohne JIT) | **Absicherung**, unreif |

Wrapper: **Capacitor 8** (SPM-Standard, 8.5 mit UIScene; Plugins für Firebase/Capawesome, Sentry, Liquid Glass) — empfohlen; Tauri 2 ohne Vorteil; Cordova Legacy.

### 2.3 Liquid Glass (iOS 26)

Translucentes Material (WWDC 2025), Varianten *regular* und *clear* (clear braucht Dimm-Ebene); Apple: nur für die Navigationsebene, kein Glas auf Glas; Reduce Transparency/Contrast/Motion automatisch. SwiftUI: `.glassEffect(_:in:)`, `GlassEffectContainer`, `glassEffectID` (Morph); UIKit: `UIGlassEffect`, `UIGlassContainerEffect`. **Web-Inhalte können das Material nicht nutzen** → native Ebene über dem WebView (Community: capacitor-liquid-glass fällt auf iOS 15–25 auf Blur zurück, nichts auf Android; stay-liquid; Expo `expo-glass-effect`). Empfehlung: eigenes Capacitor-Plugin mit SwiftUI-HUD, Zustand als JSON, Touch-Durchleitung. Fallback Android/Web: Glas als Shader im Canvas (Rundrechteck-Normale, Squircle-Profil, Snell, Farbsplit, Randlicht); HTML `backdrop-filter` (SVG-Refraktion nur Chromium). Store: seit **28.04.2026** Uploads mit Xcode 26 / iOS-26-SDK; `UIDesignRequiresCompatibility` war temporär, iOS-27-SDK ignoriert es laut Berichten *(unverifiziert)*; relevante Regeln **2.5.1** (keine privaten APIs), **4.2** (mehr als eine Website), 2.5.2, 5.2.5.

### 2.4 Softbody / Jelly

Slime-Rancher-Rezept: gemeinsames 238-Vertex-Mesh, per Vertex auf der CPU verformt; Gesichter als SDF-Texturen (~64×64); „Extra Bits" als eigene Meshes; Largos kombinieren zwei Arten (= Merge). Schichten, billigste zuerst: (1) Mesh + prozedurales Jiggle (volumenerhaltend, wenige Moden; Fresnel-Rim, Wrap-Diffuse, Glanz, innerer Gradient, Refraktion); (2) physische Quetschung über groben Käfig — **Rapier 0.36** (Blog 25.09.2026; im Review „24.09.") mit Shape Matching, XPBD, FEM, Druckblobs, Plastizität, Reißen, Cage-Skinning, auch JS/WASM; Alternative in TS: Shape Matching (Müller 2005) oder XPBD; Obi Softbody: 722 Partikel / 33,5k Vertices ≈ 2,2 ms Desktop; (3) Verschmelzmoment ~300 ms als SDF-Smooth-Min im Bounding-Quad, 2D-SDF mit Höhen-Normale fast gratis; (4) MLS-MPM-Fluid nur für Feiern (~100k Partikel auf integrierten GPUs). Anker: Richtung vom Zentrum oder Dreieck + Baryzentrik; stabiler Orientierungsrahmen; Spring Bones; **eine SDF-Definition auf CPU und GPU**.

### 2.5 Prozedurale Charaktere

Spore: Metaball-Haut entlang Wirbelsäule, vorgefertigte „Rigblocks", UV-Layout in ~10 ms, Animation einmal semantisch autorisiert und per Partikel-IK auf jede Form übertragen. Modern: Rig im Code (Root, Kern, Oben, Unten, radial); VRM-Spring-Bones (three-vrm, wiggle bones, Godot-Port); IK (three CCDIKSolver; Godot TwoBoneIK/FABRIK/CCDIK). Genom `{tier, bodyShape, palette, pattern, material, eyes, mouth, accessories[], motion}` aus `hash(seed, tier, id)`, Kompatibilitätstabellen, Kind erbt kosmetische Gene beider Eltern. Blender: Bibliotheks-`.blend`, `SOCKET_<slot>`-Empties, Custom Properties → glTF-`extras`, Shape Keys → Morph Targets; headless Export; glTF-Transform. **Blender Lab MCP** (v1.0.3, Blender 5.1+) führt KI-Code ohne Schutz aus → Sandbox.

### 2.6 Partikel und 2D

three.js: TSL-Compute-Partikel; three.quarks reif, **ohne WebGPU**; Three-VFX WebGPU-first, jung → eigenes ~500-Zeilen-TSL-Modul mit CPU-Fallback. Babylon 9: beste Out-of-the-box-VFX. Godot: GPUParticles (auch Compatibility), Effekseer-Plugin. Rive: MIT-Runtimes, aber **Free-Plan exportiert nicht**; Cadet ~9 $/Seat/Monat (jährlich; ~17 $ monatlich), Voyager 32–39 $. dotLottie: frei, ThorVG, WebGL2/WebGPU. Spine: Essential 69 $, Professional 379 $.

### 2.7 Planet / unendliche Map

Fake-Krümmung `y -= k·(x²+z²)` (billig, unendlich; Bounding-Boxen, Schatten-/Tiefenpässe und Tap-Raycasts müssen mitbiegen). Echte kleine Kugel: Cube-Sphere mit 6 Quadtrees; oder geodätisches Gitter (Stålbergs *Planet*, WFC nicht nötig); gleichmäßige Punkte per Fibonacci-Gitter (Tweak: bis 8,3 % bessere Abstände) + Delaunay/Voronoi. Empfohlener Hybrid: Pfad als Spirale Pol zu Pol, Biome aus 3D-Simplex-Noise (nahtlos), Set-Pieces alle ~10 Level, Trackball mit Trägheit, Auto-Rotation zum nächsten Level, Zoom → gekrümmte Ebene. Vorbilder: Mario Odyssey (Globus als Menü), Mario Galaxy, *Planet*, *Before We Leave*; große Casual-Puzzler scrollen vertikal → Globus differenziert. „Weiter"-Knopf immer einen Daumen-Tipp entfernt.

### 2.8 Backend (Solo-Entwickler)

Game-Center-Saves brauchen iCloud (Apple-only); CloudKit zwänge Android-Spieler zu Apple-ID → **Firebase**: Auth frei bis 50k MAU, Firestore 1 GiB / 50k Reads / 20k Writes pro Tag; lokal zuerst speichern, „Fortschritt nur vorwärts"; anonym → Sign in with Apple/Google (Guideline 4.8). Supabase: 500 MB, 50k MAU, **pausiert nach 7 Tagen Inaktivität**. PostHog frei: 1M Events, 1M Flag-Requests, 5k Replays, 100k Fehler. Crashlytics nativ-only (Web angekündigt, I/O 2026); **Sentry** Developer-Plan ~5k Fehler/Monat, Capacitor-SDK mit nativen Crashes, Godot-SDK vorhanden.

### 2.9 Risiken mit Pass/Fail-Gates (aus dem Report)

1. WKWebView-Bildrate: 60 fps stabil, p99 < 20 ms, 10 Minuten, 36 Blobs + Partikel + Globus, iPhone-12-Klasse + Mittelklasse-Android, Low-Power-Modus, Wärme.
2. WebGL2-Fallback des WebGPURenderers vs. klassischer WebGLRenderer; Shader-Compile-Stalls (`compileAsync`).
3. WebGPU in Android-WebViews (Samsung Exynos/Xclipse) → Laufzeit-Check.
4. Rapier-Softbodies sind Tage alt → API-Änderungen; TS-Fallback bereithalten.
5. Glas-Overlay: Touch-Durchleitung, Sync mit Canvas, GPU-Kosten, iOS-27-Änderungen.
6. Speicher < ~400 MB (WKWebView-Prozess-Limit), 30-Minuten-Sitzungen.
7. App Review 4.2 / 2.5.x → native Funktionen von Anfang an.
8. Globus-Usability und Seiteneffekte der Krümmung.
9. Pipeline/Lizenzen (Sockets, MCP-Sandbox, Rive/Spine, Ad-/IAP-SDKs als Capacitor-Plugins — nicht recherchiert).
10. Bei Godot: WASM-Größe, Safari-WebGL2-Eigenheiten, Unterschiede Mobile- vs. Compatibility-Renderer.

### 2.10 Quellen (Technik)

- https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ — WebGPU in Safari 26
- https://github.com/gpuweb/gpuweb/wiki/Implementation-Status — WebGPU-Status je Plattform/GPU
- https://developer.apple.com/forums/thread/770862 — WebGPU in WKWebView
- https://www2.webkit.org/show_bug.cgi?id=294338 — 60-Hz-Deckel in WKWebView (offen)
- https://www.utsubo.com/blog/threejs-2026-what-changed — three.js 2026, WebGPURenderer
- https://ionic.io/blog/capacitor-8-5-released — Capacitor 8.5 (UIScene)
- https://80.lv/articles/godot-4-7-has-been-released — Godot 4.7
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html — Godot Web-Export (Compatibility, kein C#)
- https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views — `glassEffect`, `GlassEffectContainer`
- https://kube.io/blog/liquid-glass-css-svg/ — Glas-Nachbildung (Squircle, Snell)
- https://stora.sh/blog/2026-04-01-ios-26-sdk-deadline-liquid-glass-ready — Xcode-26-Pflicht ab 28.04.2026
- https://developer.apple.com/app-store/review/guidelines/ — Review-Richtlinien (2.5.1, 4.2, 3.2.2)
- https://pixelalchemy.dev/posts/a-frame-of-slime-rancher/ — Slime-Rancher-Frame-Analyse
- https://dimforge.com/blog/2026/09/25/advanced-soft-bodies-for-games-in-the-rapier-physics-engine/ — Rapier 0.36 Softbodies
- https://iquilezles.org/articles/smin/ — Smooth Minimum
- https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst — glTF-Export (extras, Morph Targets)
- https://www.blender.org/lab/mcp-server/ — Blender Lab MCP
- https://firebase.google.com/pricing — Firebase Free Tier

---

## 3. Gamedesign: levelbasiertes 2048, Map, Guide, Charity

Einschränkungen des Reports: Das Suchbudget war zwischendurch erschöpft; Fandom-Wikis, TV Tropes und viele Medium-Posts lieferten 402/403.

### 3.1 Referenzspiele

| Spiel | Was wir daraus nehmen |
|---|---|
| **2048** (2014) | 4×4, Spawns 90 % „2" / 10 % „4"; endlos; Threes-Team: „braucht keine besondere Fähigkeit" |
| **Threes!** (2014, Metacritic 92) | Vorschau des nächsten Steins, Züge um eine Zelle, Spawns nur in bewegten Reihen → echtes Planen; Kacheln mit Gesichtern |
| **2048 Variants** | Level = Parametersatz (Rastergröße, Spawn, **Maximalstufe verschwindet**, Spezialblöcke) — winziges Publikum |
| Monster Meld, Evolution 2048 u. a. | Evolutions-Reveal als Hook, werbegetrieben |
| **Triple Town** (2010) | Evolutionskette; **Bären wandern und blockieren, eingekesselt werden sie nützlich**; Kristall = Joker |
| **Pudding Monsters** (2012) | Wisch-Blobs, 75+ Level; Charme gelobt, Puzzles als flach kritisiert; Februar 2026 delisted |
| **Merge Dragons** (2017) | Levelziel „totes Land heilen"; Zomblins; Spieler hängen an großen Meta-Aufgaben |
| **Merge Mansion** (2020) | 69 % D1, 22 % D60 (Q4 2020); Kritik: Energie, Brettplatz, dünne Story, Flaschenhals-Bestellungen |
| **Suika Game** (2023), Merge Fellas (2025) | Physik-Merge, nächste Frucht sichtbar; 11M+ bzw. 11,3M Downloads über Streamer/VTuber |
| **World of Goo** | Mindestzahl Goo-Bälle in die Röhre = Rettungsziel; Überschuss speist Meta-Turm |

Nicht verifizierbar: Cell Connect (Details), Puzzle Blossom, Imagine 2048.

### 3.2 Zwei Strukturprobleme von 2048 und die Takeaways

1. **Dominante Strategie** (Ecke) → unregelmäßige Bretter, Innenfelsen, **Ziele in der Mitte**.
2. **Exponentielle Kosten**: ~930 Züge bis 2048 (1.024 Basiseinheiten bei ~1,1 pro Spawn) → Ziele bei Stufe 5–8, vorplatzierte Blobs.

Weitere: Threes-Vorschau und gerichtete Spawns übernehmen; Top-Stufen „graduieren" lassen (2048 Variants, World of Goo); vermeiden, was Kritiker bestrafen (Energie-Wände, flache Puzzles, stockende Meta). Naavik: erzwungene „innovative" Levelmodi erhöhen die kognitive Last — Royal Kingdom ≈ 15 $ Umsatz pro Download gegen Royal Match ≈ 25 $.

### 3.3 Kings Blocker-Framework (Lucien Chen, GDC 2020)

16 Merkmale in 4 Gruppen: **Natur** (farblos/farbig/geschichtet/einfach/Raum), **Bewegung** (stationär/gesperrt/beweglich), **Entdeckung** (verkettet/versteckt/dynamisch), **Zerstörung** (entfernbar/unentfernbar/daneben/darauf/undurchdringlich). Häufigster Satz: *stationär, farblos, geschichtet, entfernbar, Match daneben*; Lagen geben Fortschritts-Feedback; „daneben" ist viel erreichbarer als „darauf" (**104 vs. 44** Konfigurationen). Vier Hebel: Blocker, **Spawn-Rate**, **Designstil** (explosiv/präzise/Reise/knobelig/fleißig), **Layout**. Candy-Crush-Erstauftritte (ungefähr, King ordnet um): Meringue ~2, Jelly 6, Zutaten/Marmelade 11, Lakritz-Schloss 21, Lakritz-Wirbel 36, Bombe 96, Schokolade 141 (früher 51), Kuchenbombe (2×2, 8 Treffer) 441.

### 3.4 Pacing-Daten

| Quelle | Zahlen |
|---|---|
| Royal Match | normal ≈ 1,2 Versuche; hart ≈ 1,6 (Level 39/45/49/55/65/75/85/95); sehr hart ≈ 2,5 (59/69/79/89/99); Züge 30–38 (1–20), 25–30 (21–60), 23–27 (61–100); neue Gebiete 1/10/21/41/61/81; Booster 8/14/17/19; Ehrenrunde alle 10 Level; neues Hindernis alle 10 Level ab 21 („lernen → prüfen → feiern"); harte Level markiert; kein Power-up wird erzwungen |
| Candy Crush | Episoden zu 15 Leveln; 5 Leben, eines alle 30 Minuten |
| Two Dots | Welt 1 = 10 Level, später 25+ |
| Plants vs. Zombies (George Fan) | neues Feature etwa alle 5 Level; ~8 Wörter auf dem Bildschirm; Spieler tut es, statt zu lesen |
| Playrix | Gardenscapes: 16 Mechaniken über 300 Level beim Soft-Launch; ≤ 3–4 Elementtypen pro Level; jedes Level braucht „eine Idee"; ohne Booster schaffbar; nie mehrere Level in Folge bei 92–95 % Schwierigkeit; Level 77 mit 2,29 % Abbruch → A/B-Ersatz |
| King | Spaß getrennt von Schwierigkeit messen (Zeit bis Abbruch / bis Sieg); „hart ⇒ kurz"; die 100 schwächsten Level werden überarbeitet; Bots testen jedes Level vor |
| Room 8 | Median-Versuche statt Pass-Rate; Idee nicht innerhalb ~50 Leveln wiederholen; Typen Tutorial/„fuu"/Komfort/Können |
| Lily's Garden (arXiv) | ≈ 3,2 Versuche im Mittel nach dem Tutorial, Long Tail 30+ |
| Sägezahn (arXiv) | 5 Level steigend, das 6. fällt |
| Nintendo (Hayashida) | Kishōtenketsu in einem Level |

Das „60–65 %-Gewinnraten-Ziel" wurde **nicht als veröffentlichte Zahl gefunden**; 1,6 Versuche ≈ 62 % Gewinnrate pro Versuch, normal ≈ 83 %, sehr hart ≈ 40 %.

### 3.5 Guide, Globus, Regeneration

Guide-Kadenz (Candy Crush, Best Fiends, Royal Match, Homescapes): Mikro-Sätze ≤ 8 Wörter bei neuen Mechaniken; kurze Szene alle 5–10 Level; Kapitel-Szene alle 10–15 Level; großer Beat am Kapitelfinale. Saga Adventures (Candy Crush): 60 Level, 4 Story-Meilensteine, **level-first** — ein Schwierigkeitssprung wird zum „Boss-Kapitel". Best Fiends: Levelziel auf der Map vor dem Level; Energie-System (20 „Jolts", > 3 h Nachfüllen) wurde gehasst. Globen: Mario Odyssey (Kugel als Königreich-Menü), Before We Leave, TerraGenesis, Planet Picker; große Puzzler scrollen vertikal. Regenerations-Erzählungen: Terra Nil (keine Spur), Alba, Flower (ohne Text), Spiritfarer (Abschied als Beat), Botanicula, Cloud Gardens, Islanders, Merge Dragons → Mittel: entsättigt → gesättigt, Tiere kehren zurück, persistentes Fenster, Freilassung.

### 3.6 Charity: Regeln und Präzedenzfälle

Apple **3.2.2(iv)**: Spenden in der App sammeln ist unzulässig (außer zugelassene Non-Profits); solche Apps müssen kostenlos sein und dürfen nur außerhalb der App sammeln. **3.2.1(vi)**: zugelassene Non-Profits mit Apple Pay, Offenlegung, Steuerquittungen. **2.3**: Metadaten dürfen nicht irreführen. Apple Pay für Non-Profits: Candid Seal (USA) bzw. Benevity; keine Apple-Gebühr. Eine Plattform, die nur Off-App-Spenden erlaubte, wurde trotzdem unter 3.2.2 abgelehnt. **Google Play**: Play Billing darf nicht für steuerbefreite Spenden genutzt werden.

| Präzedenz | Modell |
|---|---|
| Terra Nil | 8 % des Gewinns an den Endangered Wildlife Trust, > 100 k$; 45.528 Bäume |
| Alba | ein Baum pro Download (Ecologi); 1 Mio. bis Dezember 2021 |
| Children of Morta: Paws & Claws | 100 % des DLC-Gewinns an Humane World for Animals; 546 k£ |
| Avia „Play for Paws" | Spieler füttern echte Tierheim-Tiere, Studio zahlt 0,05 $ pro Fütterung |
| Tab for a Cause | ≥ 30 % der Einnahmen, Quartalsberichte |
| Humble Bundle (2021) | Deckel bei 15 % nach Aufschrei zurückgenommen → **nie ein Versprechen kürzen** |
| 1 % for the Planet / Pledge 1 % / Founders Pledge | zertifizierte Pledge-Modelle |
| Playing for the Planet | 56 Mitglieder; Green Game Jam 2025: 284 k$, June's Journey 25 % über Plan; 2026: 70 Spiele |

Umsetzung (in den Plan übernommen): Versprechen auf **Nettoeinnahmen** (prüfbarer als Gewinn; nach Store-Gebühren ein sehr großer Anteil → durchrechnen); IAP sind normale digitale Güter, Hinweistext „keine Spende, nicht absetzbar"; Partnerverträge in den Review-Notizen; Transparenzberichte; Fürsorge-Punkte, Meilenstein-Kosmetik, Feldtagebuch, Globus-Overlay; später Partner-Link (nur bei Gratis-App). Partner-Kandidaten: Humane World for Animals, Nevada SPCA, Best Friends, WWF, EWT, ACE-Empfehlungen; Deutscher Tierschutzbund und Vier Pfoten *(unverifiziert)*. Recht: BGH 2005 erlaubt Cause-Related Marketing, keine Irreführung → Rechts-/Steuerprüfung.

### 3.7 Monetarisierung und Benchmarks

Apple Arcade: 6,99 $/Monat, keine Werbung/IAP, Vorabfinanzierung + Engagement-Topf, Auszahlungen seit 2020 gesunken, Spiele ohne Wachstum werden entfernt. Ethisches F2P (Royal Match): keine erzwungene Werbung, Großzügigkeit zuerst, kein früher Kaufdruck, Beinahe-Siege zeigen — trotzdem Glücksspiel-Sammelklage 2024; keine Lootboxen, keine Energie. Benchmarks: GameAnalytics 2025 Puzzle-Median D1 ≈ 20 %, D7 ≈ 4,5 %, D28 ≈ 1,2 %; Top 25 % genreübergreifend D1 ≈ 27 %, D7 7–8 %, D28 ≈ 3 %; GA 2026 Top 10 % D1 ≈ 40 %, D7 11–12 %; Match-3 D7 > 20 % „gut", Zahlerquote ≥ 1,69 %, Top 3,5–4 %, Candy Crush 2,3 %; Sitzungen ≈ 5,6 min. **Empfehlung des Reports**: gratis starten, dann Einmal-Freischaltung + Kosmetik-/Kapitelpakete, keine Leben, Booster erspielbar — der Plan hält stattdessen drei Modelle offen (Abschnitt 5).

### 3.8 Quellen (Gamedesign)

- https://en.wikipedia.org/wiki/2048_(video_game) — 2048, Kritik des Threes-Teams
- https://en.wikipedia.org/wiki/Triple_Town — Bären als Blocker, Kristall als Joker
- https://en.wikipedia.org/wiki/World_of_Goo — Rettungsziel per Röhre
- https://www.gamigion.com/a-not-so-brief-history-of-the-merge-genre/ — Merge-Genre, Merge Mansion, Merge Dragons
- https://media.gdcvault.com/gdcsummer2020/presentations/GDC2020%20Final%20PPT.pdf — Kings Blocker-Framework
- https://www.gamigion.com/royal-match-level-design-insights/ — Royal-Match-Pacing
- https://gameworldobserver.com/2019/09/27/playrix-levels-elements-match-3 — Playrix-Regeln
- https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/ — King: Spaß vs. Schwierigkeit
- https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/ — Room 8: Versuche, Leveltypen
- https://naavik.co/f2p-mobile/why-innovative-match-3-levels-is-not-a-usp/ — Naavik: innovative Modi
- https://notes.hamatti.org/sources/talks/how-i-got-my-mom-to-play-through-plants-vs.-zombies — George Fan, Tutorial-Regeln
- https://www.gamedeveloper.com/design/the-structure-of-fun-learning-from-i-super-mario-3d-land-i-s-director — Kishōtenketsu
- https://support.google.com/googleplay/android-developer/answer/9858738?hl=en — Play Billing und Spenden
- https://gameworldobserver.com/2023/04/06/terra-nil-300000-players-free-lives-tree-planting — Terra Nil
- https://www.appspy.com/solitaire-clash/play-for-paws/ — Play for Paws
- https://www.goodgoodgood.co/articles/tab-for-a-cause — Tab for a Cause
- https://www.gamedeveloper.com/business/humble-bundle-redesign-axes-sliders-limits-charity-donations-to-15- — Humble-Bundle-Lektion
- https://en.wikipedia.org/wiki/Apple_Arcade — Apple Arcade
- https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks — Benchmarks 2025
- https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks — Benchmarks 2026
- https://www.gameanalytics.com/blog/match-3-games-metrics-guide — Match-3-Kennzahlen

---

## 4. Architektur-Review P0–P3

### 4.1 Kritikpunkte und wie Plan v0.1 sie aufnimmt

| Befund | Aufnahme im Plan |
|---|---|
| §5 (Jiggle-Mesh Standard) vs. §8 (Raymarching-Rezept) | zwei Kandidaten (a)/(b), Entscheidung in P1; (a) zuerst, weil (b) es für den Blend braucht |
| Rapier (WASM) vs. Expo-Absicherung („Physik in TS") | TS-`SquashDriver` Standard, Rapier 0.36 als P1-Experiment hinter derselben Schnittstelle |
| Firebase vs. „später Supabase" | Firebase |
| „keine Post-Kette" vs. `render … Post` | „Post" gestrichen |
| P3 mit „Sprengspore"/„Kruste" (nicht Tjorizo) | P3 = exakt das Tjorizo-Set + Fossilwand/Käfig fürs Datenmodell |
| „r160 (Feb 2026)" falsch | `three@0.186.0` exakt gepinnt (r186, 08.09.2026); TSL bewusst upgraden |
| Node 25 ohne corepack, kein pnpm | `npm i -g pnpm`; CI Node 24 LTS |
| P1-Abnahme über `http://` im LAN misst WebGL2 | HTTPS-Dev-Server, Backend-Badge; Safari ≠ WKWebView → P1-Werte „vorläufig bis P6" |
| „Bot ersetzt Testteam" | drei Bot-Stufen + Abbildung auf Versuche, gefittet an Nicoles Daten; bis dahin Bänder |
| Playwright-Screenshots in CI (keine GPU) | CI nur Smoke; Golden-Vergleiche lokal |
| Strahl-Blob bei fest 2 Verschmelzungen | Schwellen pro Level Daten, Solver meldet Häufigkeit |
| KTX2/meshopt in Phase 0 | erst ab Phase 1 |
| fehlende Regeldetails | Phasenreihenfolge, Rohr/Strom/Öl-Kanten, Amöbe+Amöbe, gefrorene Blobs als Pfeiler, Spawn-Fallback, Verlustbedingung, Vorschau+Rückspulen, Eingabe-Policy, Score/`schemaVersion`/IDs/Invariante — alles im „Regeln im Detail"-Vertrag |
| Reihenfolge P1 vor P3 | P3-Kern parallel zu P1; `MoveEvent`-Vertrag vor P1 |

### 4.2 Kernzahlen des Umsetzungsdesigns

Solver: Hot Path auf `Uint8Array`, Ziel ≥ 200k Züge/s/Thread (Benchmark-Abnahme ≥ 150k); Expectimax 4 Aktionen × Zufallsknoten; Bots `novice` (Tiefe 1, 15 % Zufall), `average` (Tiefe 2, 4 gesampelte Knoten), `strong` (Tiefe 3 + Zobrist); Budget 100 Level × 2 Bots × ≤ 200 Seeds ≈ 1–2 min mit 4 Workern und Abbruch bei Wilson-Intervall < ±0,05; Cache nach `hash(levelJSON, solverVersion)`. Blob (a): 36 Blobs × ~150² px × DPR 2 ≈ 3,2 M Fragmente × ~12 Schritte × 8 Kugeln ≈ **0,3 G SDF-Auswertungen/Frame** → grenzwertig auf iPhone-12-Klasse. P2: Kappen-Patch R ≈ 40, ~40°, 96²; Sonne Höhe 10°, Azimut 70° als Kind der Kamera; Trägheit τ ≈ 0,4 s; `filterNode`-Hook gegen r186 prüfen. Toolchain: TS `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`, Vite 7 + basic-ssl, `resolve.dedupe: ['three']`, `?backend=webgl`.

### 4.3 Quellen (Architektur)

- https://github.com/mrdoob/three.js/releases — three.js-Releases (r186)
- https://rapier.rs/docs/user_guides/javascript/soft_bodies/ — Rapier-JS-Softbody-Guide

---

## 5. Bewusste Abweichungen des Plans von der Recherche

| Recherche | Plan / Entscheidung | Grund |
|---|---|---|
| Stil-Report: UI mit „3 px Tintenrand"; NN/g: dicke Ränder; Inverted-Hull-Outlines „billig, falls nötig" | **keine Konturen** (außer eine fette Verlaufskontur an Hero-Elementen) | Florians Konturen-Regel, verbindlich |
| Technik-Report: „halbauflösendes Bloom" | **keine Post-Kette** | van-Eyck-Regel des Stil-Reports; Widerspruch zwischen den beiden Reports zugunsten des Stils entschieden |
| Technik-Report: KTX2 im Basis-Stack | KTX2/meshopt ab Phase 1 | in Phase 0 nur Paletten-Atlas und 64²-SDFs |
| Gamedesign-Report: 10 Kapitel × 10 Level, Planeten als Kapitel | 4 Zonen × 25 Level auf **einer** Erde | Plot (Risse, Heilung der Erde) |
| Gamedesign-Report: Empfehlung Einmal-Freischaltung | Erlösmodell **offen** (Einmalkauf, faires F2P, Apple Arcade) | Florians Entscheidung 2026-09-29 |
| Technik-Report: three.js + Capacitor als Entscheidung | **Vergleich** beider Tracks mit Gate | Florians Entscheidung 2026-09-29 |
| Royal Match: H ≈ 1,6 | H = 1,6–2,0, SH ≤ 2,5 | Band statt Punktwert |
| Rapier-Datum 24.09. (Review) vs. 25.09. (Technik-Report, Blog) | 25.09.2026 | Blog-Datum |

## 6. Offene Recherchefragen

- Ad- und IAP-SDKs als Capacitor-Plugins (nicht recherchiert; nur bei F2P relevant).
- Apple-Arcade-Vertragsbedingungen (Exklusivität, Web-/Android-Version).
- Blender-NPR-Projekt: was ist bis September 2026 tatsächlich erschienen?
- WebGPU in WKWebView und Android-WebView auf echten Geräten (P6).
- Rapier-0.36-Stabilität (P1-Experiment).
- Kosten und Laufzeit des Liquid-Glass-Overlays über animiertem Canvas (P6).
- Deutsche Tierschutz-Partner und Prozentbasis (Rechts-/Steuerprüfung).
