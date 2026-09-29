# ADR-0001: Engine- und Renderer-Stack — three.js + Capacitor vs. Godot 4.7

**Status:** Vorgeschlagen (proposed) — **Gate ausstehend.** Entschieden wird nach den Messungen aus P1/P1-G, P2/P2-G und P6 (Phase 0), nicht vorher.
**Datum:** 2026-09-29
**Entscheider:** Florian (Art Direction, Produkt). Beteiligt: Nicole (Test), KI-Agent (Umsetzung, Messung, Protokoll).
**Bezug:** Masterplan v0.1, Abschnitte 8, 8b, 11 (P6) und 16; [`RESEARCH.md`](../RESEARCH.md) Abschnitte 2 und 4; [`PRODUCTION.md`](../PRODUCTION.md).

## Kontext

early earle ist **app-first (iOS, Android) und läuft zusätzlich im Browser**. Es braucht echtes 3D (rotierbare Kugel-Map, zähflüssige Blobs mit Physik), echtes Rigging (Assets an Sockeln, Spring Bones, IK), 3D- und 2D-Partikel, Apple **Liquid Glass** mit Fallbacks, und touch-first Editoren, die auch auf dem Handy laufen. Das Team ist ein Grafiker (Florian), eine Testerin (Nicole) und ein KI-Agent als dritter Entwickler — deshalb zählen **Textbasiertheit, Iterationsgeschwindigkeit und Automatisierbarkeit** fast so viel wie Bildrate.

Der Look („Neo-Brutalismus trifft Eyvind Earle", [`STYLE.md`](../STYLE.md)) verlangt eigene Materialien: Quantisierung im Material, nachgeschärfte Shadow-Map, instanzierte Punkte, keine Post-Kette. Beide Kandidaten können das; die Frage ist, **wo** es schneller entsteht und **wo** es auf dem Gerät stabil läuft.

Die Technik-Recherche empfahl three.js + Capacitor als Top-Pick und Godot 4.7 als Runner-up. **Florians Entscheidung (2026-09-29): keine Vorab-Festlegung.** P1 und P2 werden **in beiden Kandidaten** gebaut und mit Messwerten entschieden. Der DOM-freie Kern (Regeln, Level-JSON, Genom-JSON, Solver) ist der gemeinsame Vertrag beider Tracks.

Randbedingungen, die die Antwort formen:
- **WKWebView ist auf dem iPhone auf 60 fps begrenzt** (WebKit-Bug 294338 offen); Workarounds nutzen private APIs und verstoßen gegen Review-Regel 2.5.1. Natives Glas-Overlay läuft trotzdem mit 120 Hz; Android-WebViews mit 90/120 Hz.
- WebGPU: in iOS 26 standardmäßig auch im WKWebView (Apple-Aussage, auf Gerät zu prüfen); Android-WebView unsicher (Samsung Xclipse erst ~Chrome 154) → WebGL2 bleibt Basis.
- Seit 28.04.2026 müssen Uploads mit Xcode 26 / iOS-26-SDK (oder neuer) gebaut sein — gilt für beide Tracks.
- Der Scaffold (P0) existiert bereits im Web-Track (`apps/game`, `packages/*`); das Godot-Projekt (`apps/godot/`) wird angelegt, sobald Godot 4.7 installiert ist.

## Entscheidung (vorläufig)

Bis zum Gate gilt: **three.js WebGPURenderer + TSL in Capacitor 8.5 ist der Arbeits-Track**, **Godot 4.7 der Vergleichs-Track**. Beide bauen dieselben Szenen (P1/P1-G, P2/P2-G) und werden nach dem Messprotokoll unten verglichen; P6 (Geräte-Builds beider Tracks) ist das Gate. Die endgültige Wahl folgt der Entscheidungsregel unten und wird in diesem ADR mit den Messwerten nachgetragen (Status → Angenommen).

## Kriterien (Entscheidungstreiber)

In der Reihenfolge ihres Gewichts:

| # | Kriterium | Warum es zählt | Messbar durch |
|---|---|---|---|
| 1 | **Stabile Bildrate auf dem Gerät** | Casual-Spiel, permanente Animation; iPhone-12-Klasse und Mittelklasse-Android sind die Zielgeräte | Gate P6 (fps, p99, 10 min, Wärme, Low-Power) |
| 2 | **Look-Abnahme durch Florian** | Screenshot 3 (pezenpez) und die Earle-Referenzen sind die Messlatte | P1/P2 vs. P1-G/P2-G, Screenshots in `docs/progress/` |
| 3 | **Iterationsgeschwindigkeit für den Agenten** | ein Grafiker + KI ersetzen ein Team; Zeit bis eine Änderung sichtbar ist, Screenshot-/Konsolen-Zugriff, Headless-Tests | Stoppuhr pro Änderung, Werkzeugzugriff |
| 4 | **Browser-Version** ist derselbe Code, kein Port | Anforderung „auch im Browser"; Editoren als Web-App | Startzeit, Stabilität in iOS-Safari, Feature-Parität |
| 5 | **Editoren auf dem Handy** | Level-, Creature-, Map-Editor touch-first | Web-UI vs. Control-Nodes/Xogot |
| 6 | **Liquid Glass + native Anforderungen** (Review 4.2, Game Center) | App Review und ggf. Apple Arcade | Plugin-Machbarkeit, Touch-Durchleitung, GPU-Kosten |
| 7 | **120 Hz** | Florians M3 Pro/120 Hz-Erwartung; auf dem iPhone nur nativ möglich | Wird als Pflicht empfunden oder nicht (Florian) |
| 8 | Speicher, Startzeit, Build-Größe | WKWebView-Prozess-Limit ~400 MB; Godot-WASM-Größe | Messung |
| 9 | Physik/Rigging/Partikel out-of-the-box | Softbodies, Spring Bones, IK, GPU-Partikel | Aufwand in P1/P1-G |

## Betrachtete Optionen

### Option A: three.js WebGPURenderer + TSL, Capacitor 8.5 (Web-Track)

| Schicht | Wahl | Begründung |
|---|---|---|
| Sprache/Build | TypeScript, Vite 7, pnpm-Workspace; Simulationskern ohne DOM-Abhängigkeit | textbasiert = der Agent kann alles selbst bauen und testen; Hot Reload aufs Handy |
| Renderer | **three.js WebGPURenderer + TSL**, automatischer WebGL2-Fallback, exakt `three@0.186.0` (r186, 08.09.2026) | TSL kompiliert nach WGSL *und* GLSL; Compute-Shader für Partikel; ein Code für Browser und App; TSL-APIs bewegen sich noch → pinnen. `SunLight`/CSM aus r186 **nicht** nutzen (weiche Kaskaden gegen Hartkanten-Look) |
| App-Hülle | **Capacitor 8.5** (SPM, UIScene) | WKWebView mit WebGPU ab iOS 26; ältere iOS über WebGL2; Android ab Chrome 121 mit Laufzeit-Check |
| Liquid Glass | natives **SwiftUI-Overlay** per eigenem Capacitor-Plugin (`glassEffect`, `GlassEffectContainer`, Touch-Durchleitung, Zustand als JSON); Fallback: TSL-Glas im Canvas + `backdrop-filter` | Web-Inhalte können das Material nicht nutzen; Community-Plugins zeigen das Muster |
| Physik | TypeScript-`SquashDriver` (SpringJiggle, ShapeMatching nach Müller 2005); **Rapier.js 0.36** nur als P1-Experiment hinter derselben Schnittstelle | Rapier-Softbodies sind Tage alt; TS-Physik hält die Expo-Absicherung offen |
| UI/Editoren | React 19 (DOM-Overlay), zustand, zod; Editor als Route derselben App, speichert JSON über Dev-Server-Endpunkt ins Repo | touch-first; für Review 4.2 kommen Haptik, Game Center, natives Chrome dazu |
| Assets | glTF aus Blender (headless `bpy`), Sockets als `SOCKET_<slot>`, `extras`, Morph Targets; glTF-Transform ab Phase 1 | Florian baut Module, Pipeline validiert |
| Partikel/2D | eigenes ~500-Zeilen-TSL-Partikelmodul (Compute, instanzierter CPU-Fallback); dotLottie oder Rive für UI | three.quarks ohne WebGPU, Three-VFX zu jung |
| Backend (später) | Firebase, PostHog, Sentry (Capacitor-SDK) | Free Tiers reichen zum Start |
| CI | GitHub Actions: Build → Pages; Playwright-Smoke; Bot-Kalibrierung; später TestFlight/Play | eingerichtet (`.github/workflows/web.yml`) |

| Dimension | Einschätzung |
|---|---|
| Komplexität | mittel — Materialien, Schattenfilter und Partikel entstehen selbst in TSL; Glas-Plugin in Swift |
| Kosten | keine Lizenzkosten; Rive optional ~9 $/Monat |
| Skalierung/Performance | 60 fps-Deckel im WKWebView; Web-View-Overhead (GC-Pausen, Draw-Call-Kosten, Speicherlimit); für 16–36 Blobs + Partikel + instanzierten Globus laut Recherche vertretbar — **zu messen** |
| Team-/Agenten-Fit | **sehr hoch**: reines TypeScript, Browser-Panel mit Screenshots und Konsole, Headless-Tests, Content in git |

**Pro:** Browser-Version ist derselbe Code; Editor ist eine weitere Route; Live-Reload aufs Handy ohne Build/Sign/Install; größte Trainingsdaten-Basis für den Agenten; Scaffold existiert bereits; Absicherung: derselbe three.js/TSL-Code kann nach **Expo + react-native-wgpu** (Dawn → Metal/Vulkan, native Bildraten, `expo-glass-effect`) umziehen, solange die Physik in TypeScript bleibt.
**Contra:** 60 fps auf dem iPhone (kein legaler Ausweg); WebGPURenderer-Reports (langsam bei vielen Einzel-Meshes → konsequent instanzieren; langsame erste Kompilierung → `compileAsync`); WebGPU im Android-WebView unsicher; Liquid Glass nur über natives Overlay; Softbodies/Spring Bones/IK nicht eingebaut (Rapier jung, three-vrm/CCDIK vorhanden).

### Option B: Godot 4.7 (GDScript), nativ Metal/Vulkan (Vergleichs-Track)

Setup laut Plan 8b: Godot 4.7 Standard-Build (GDScript) + Export-Templates; Projekt `apps/godot/` mit Text-Szenen; liest **dieselben `content/`-JSONs**. Automatisierung: `godot --headless --export-release`, optional Godot-MCP-Server (z. B. hi-godot/godot-ai) für den Agenten. iOS-Export braucht Xcode (vorhanden); Web-Export mit Compatibility-Renderer als Browser-Vergleich. P1-G: Spatial-Shader-Jiggle, SDF-Gesicht, Jolt-`SoftBody3D`-Quetschen, GPUParticles-Tropfen, Verschmelzung per SDF-Shader auf einer Box. P2-G: Spatial-Shader-Bänder, harte `DirectionalLight3D`-Schattenkante, `MultiMesh`-Punkte.

| Dimension | Einschätzung |
|---|---|
| Komplexität | mittel — Editor-Tooling nimmt Arbeit ab (Partikel, Shader, Physik); Kern muss nach GDScript portiert oder als WASM eingebunden werden; Editoren aus Control-Nodes |
| Kosten | keine Lizenzkosten (MIT) |
| Skalierung/Performance | nativ Metal/Vulkan, **120 Hz möglich**; Jolt Standard seit 4.6 inkl. SoftBody3D; SpringBoneSimulator3D; IK-System (4.6); GPUParticles (auch Compatibility) |
| Team-/Agenten-Fit | gut: GDScript, Text-`.tscn`, Headless-CLI, MCP-Server, Sentry-Godot-SDK; Xogot = Editor auf iPad/iPhone |

**Pro:** native Bildraten und 120 Hz; Softbodies, Spring Bones, IK und GPU-Partikel eingebaut; keine WebView-Limits (Speicher, GC, 60 Hz); Liquid Glass über natives iOS-Plugin-Overlay oder Shader (godot-liquid-glass braucht 4.7 mit Compatibility-Renderer).
**Contra:** **Web-Export nur WebGL2-Compatibility-Renderer** (single-threaded), kein C# im Web, WASM-Build-Größe und Safari-WebGL2-Eigenheiten, sichtbare Unterschiede zwischen Mobile- und Compatibility-Renderer; Kern-Port (GDScript oder WASM) statt geteiltem TypeScript; Editoren als Control-Nodes statt Web-UI; Agent iteriert über Godot-CLI/MCP statt Browser-Panel; noch nicht installiert.

### Verworfene Optionen (Kurzbegründung)

- **Babylon.js 9**: gleichwertig zu A, falls Florian visuelle Node-Editoren (Material, Partikel) bevorzugt — bisher nicht geäußert; Havok nur Rigid.
- **Unity 6.6**: sichere Wahl, wenn der Browser optional wäre; schwerer Web-Build, iOS-OOM-Berichte, YAML-Assets für den Agenten schlecht; Obi Softbody kostenpflichtig.
- **PlayCanvas**: Cloud-Editor nicht in die eigene App einbettbar. **Phaser 4 / PixiJS 8**: nur 2D. **Unreal 5**: kein Web-Export. **Defold**: 3D zu dünn. **Cocos, Bevy, Flutter Flame**: zu früh bzw. 3D-Preview. **Apple-nativ (SpriteKit/RealityKit)**: kein Web, nur für UI-Chrome.
- **Expo + react-native-wgpu**: keine eigenständige Option, sondern die **Absicherung** von A (unreif; WASM-Bibliotheken bräuchten native Bindings).

### Vergleichsmatrix

| Kriterium | A: three.js + Capacitor | B: Godot 4.7 |
|---|---|---|
| Bildrate iPhone | 60 fps (WebView-Deckel) | bis 120 Hz nativ |
| Bildrate Android | 90/120 Hz in WebViews möglich | nativ |
| WebGPU/Compute | ja (WebGPU), WebGL2-Fallback | Metal/Vulkan; Web nur WebGL2 |
| Browser-Version | **derselbe Code** | Compatibility-Export, kein C#, WASM-Größe |
| Eigene Shader | TSL → WGSL/GLSL | Godot Shader Language + Visual Shaders |
| Softbody/Spring Bones/IK | TS-Driver, Rapier (jung), three-vrm, CCDIK | Jolt SoftBody3D, SpringBoneSimulator3D, IK-System |
| Partikel | selbst (TSL-Compute) | GPUParticles mit Editor, Effekseer |
| Liquid Glass | natives Overlay per Capacitor-Plugin | natives iOS-Plugin-Overlay oder Shader |
| Editoren auf dem Handy | Web-UI, gleiche App | Control-Nodes / Xogot |
| Agenten-Fit | **sehr hoch** (TS, Browser-Panel, Headless) | gut (GDScript, CLI, MCP) |
| Speicher/Prozess | WKWebView-Limit ~400 MB | nativ |
| Stand im Repo | Scaffold vorhanden | Projekt anzulegen |

## Gemeinsamer Vertrag (gilt unabhängig vom Ausgang)

- `@ee/core` (Regeln, RNG, Solver, Level-Schema) ist **DOM-frei und ohne Abhängigkeiten**; `applyMove(state, dir) → MoveResult | null`; Ereignisse mit Phasenindex („Regeln im Detail", [`GDD.md`](../GDD.md) 5.3).
- **Content-Formate bleiben identisch**: `content/levels/*.json`, `zones/*.json`, `genome/rules.json`, `rex/lines.json`, alle mit `schemaVersion`, zod-validiert. Der Godot-Track liest dieselben Dateien.
- Blender-Pipeline (glTF mit `SOCKET_<slot>`, `extras`, Morph Targets) ist engine-neutral.
- Bei Godot-Wahl: Kern als GDScript-Port oder WASM; Content und Solver-Kalibrierung gehen nicht verloren.

## Messprotokoll

**Szenen** (gleich in beiden Tracks): Blob-Lab mit **1 / 9 / 36 Blobs**, gleiche Kamera, gleiche Palette, gleiche Sonne, Verschmelzanimation; Earle-Lab (Kappen-Patch, Riesenschatten, instanzierte Kuppeln + Sechseck-Punkte, Stämme, gestufter Nebel, Bandhimmel, Trackball-Drag, Wachstums-Regler). P6 zusätzlich: **36 Blobs + Partikel + Globus** als Capacitor-Build und Godot-iOS-Export.

**Umgebungen:**

| Gerät | Web-Track | Godot-Track |
|---|---|---|
| Mac (M3 Pro, 120 Hz) | three.js WebGPU **und** WebGL2-Fallback (`?backend=webgl`) im Browser-Panel | Godot nativ **und** Godot-Web-Export |
| iPhone (Florians) | Safari über **HTTPS** (WebGPU verlangt sicheren Kontext; Badge zeigt Backend) **und** WKWebView-Capacitor-Build | Godot-iOS-Export |
| Mittelklasse-Android (P6) | Capacitor-Build (WebGPU-Laufzeit-Check, WebGL2-Basis) | Godot-Android-Export (Zu verfeinern: Gerät beschaffen) |

**Messgrößen** (Perf-Badge zeigt Backend, FPS, Frametime-p99, Draw Calls; alles in `docs/progress/` protokolliert):

| Messgröße | Wie |
|---|---|
| Frametime p50/p99, fps | 10-Minuten-Lauf pro Szene und Umgebung |
| Speicher | Prozess-Speicher nach 10 min (WKWebView-Limit ~400 MB) |
| Wärme, Low-Power-Modus | nach 10 min; Lauf im Low-Power-Modus wiederholen |
| Startzeit | kalt bis erstes Bild |
| Draw Calls | Earle-Lab ≤ 100 |
| Schattenkanten | keine sichtbaren Treppen bei 2048er Map |
| **Look-Urteil** | Florian gegen Screenshot 3 und die Referenzen (P1/P1-G, P2/P2-G nebeneinander) |
| **Iterationsgeschwindigkeit** | Zeit bis eine Änderung sichtbar ist; Screenshot-/Konsolen-Zugriff des Agenten |
| Web-Qualität | Startzeit, Stabilität in iOS-Safari (three.js) bzw. Godot-Web-Export |
| Editor-Machbarkeit | Web-UI vs. Control-Nodes/Xogot (Einschätzung, kein Messwert) |
| Glas-Overlay (P6) | Touch-Durchleitung funktioniert; GPU-Kosten über animiertem Canvas |
| WebGL2-Pfad (P6) | WebGL2-Fallback des WebGPURenderers gegen klassischen WebGL-Renderer |

**Abnahmewerte je Prototyp:**

| Prototyp | Pass |
|---|---|
| P1 | 36 Blobs ≥ 60 fps auf dem Mac (DPR 2) für mindestens einen Kandidaten (a)/(b); iPhone-Safari-Werte vorläufig bis P6; Florian wählt den Kandidaten |
| P1-G | gleiche Messgrößen wie P1, nativ |
| P2 | Florian erkennt Earle + seinen Draft wieder; keine Treppen an Schattenkanten; ≤ 100 Draw Calls; 60 fps Mac, ≥ 40 fps iPhone-Safari |
| P2-G | gleiche Messgrößen wie P2, nativ |
| **P6 (Gate)** | 36 Blobs + Partikel + Globus: **10 Minuten stabil 60 fps, p99-Frametime < 20 ms, Speicher < ~400 MB**, Low-Power-Modus und Wärme geprüft, auf iPhone-12-Klasse **und** Mittelklasse-Android; WebGL2-Fallback gemessen; Glas-Overlay geprüft |

## Entscheidungsregel

1. **Erfüllt three.js auf dem Gerät die Gate-Kriterien (P6) und nimmt Florian den Look ab (P1/P2) → three.js + Capacitor.** Iteration und Web gewinnen; Godot-Track wird eingefroren (Projekt bleibt als Referenz im Repo).
2. **Ist nur Godot stabil, oder werden 120 Hz als Pflicht empfunden → Godot 4.7.** Der Kern bleibt der Vertrag (GDScript-Port oder WASM), Content-Formate bleiben identisch, Editoren werden als Control-Nodes/Xogot neu geplant, Web-Version über Compatibility-Export.
3. Erfüllt keiner das Gate: erst Budget-Maßnahmen im Web-Track (DPR 1,5, Low-End-Schattenstufe, Kandidat (b), weniger Partikel) und Godot-Optimierung, dann erneut messen; Absicherung Expo + react-native-wgpu prüfen. Kein Wechsel zu einer verworfenen Option ohne neues ADR.
4. Die Entscheidung wird mit den Messwerten in diesem ADR nachgetragen (Status → Angenommen, Datum, Tabelle der Werte).

## Konsequenzen

**Bei three.js (A):**
- Leichter: Browser-Version, Editoren, Live-Reload, Agenten-Iteration, Playwright-Smoke, ein Code für alles.
- Schwerer: 60 fps auf dem iPhone bleibt; Glas nur über das Swift-Plugin; Materialien, Schattenfilter und Partikel entstehen selbst; WebView-Speicherbudget überwachen; Android-WebGPU per Laufzeit-Check.
- Zu prüfen später: Expo + react-native-wgpu, falls native Bildraten nötig werden (Physik bleibt deshalb in TypeScript).

**Bei Godot (B):**
- Leichter: 120 Hz, Softbodies/Spring Bones/IK/Partikel eingebaut, keine WebView-Limits.
- Schwerer: Kern-Port oder WASM-Brücke; Editoren neu; Web-Version zweitklassig (Compatibility, kein C#); Agent verliert Browser-Panel-Workflow; Liquid Glass über natives Plugin.

**In jedem Fall:**
- Der Kern, die Content-Formate, der Solver, die Blender-Pipeline und die Stilregeln bleiben gültig.
- Beide Tracks kosten in Phase 0 Zeit: Godot-Track geschätzt +12–16 h Agentenarbeit zusätzlich zu ≈ 40–45 h für den Web-Track.
- P1-Werte aus iPhone-Safari sind **vorläufig** (Safari ≠ WKWebView, andere Prozess-Limits).

## Risiken und Unbekannte

- WebGPU im WKWebView/Android-WebView auf echten Geräten (nur per Gerät klärbar).
- Rapier 0.36 ist Tage alt (nur Experiment).
- three.js-`filterNode`-Hook für den Schattenfilter gegen r186 verifizieren.
- Godot: WASM-Größe, Safari-WebGL2, Renderer-Unterschiede Mobile/Compatibility.
- iOS-27-Änderungen an Liquid Glass *(unverifiziert)*.
- Mittelklasse-Android-Gerät für P6 ist noch nicht vorhanden.

## Aktionspunkte

1. [ ] Xcode-Lizenz akzeptieren (`sudo xcodebuild -license accept`), Apple Developer Program für Geräte-Builds.
2. [ ] Godot 4.7 + Export-Templates installieren; `apps/godot/` anlegen, Content-JSONs einlesen.
3. [ ] P1 (a)/(b) und P2 im Web-Track; P1-G/P2-G in Godot mit identischen Szenen.
4. [ ] Messläufe nach Protokoll; Screenshots und Tabellen in `docs/progress/`.
5. [ ] P6: Capacitor-Build und Godot-iOS-Export auf Florians iPhone; Mittelklasse-Android beschaffen.
6. [ ] Entscheidung nach Regel; ADR-Status auf „Angenommen" setzen, Messwerte eintragen; verlierenden Track einfrieren.

## Referenzen

Masterplan v0.1 (§8 Tech-Stack, §8b Vergleichs-Track, §11 P6, §16 Umsetzungsdesign); [`RESEARCH.md`](../RESEARCH.md) §2 (Plattform-Fakten, Engine-Matrix, Liquid Glass, Risiken) und §4 (Architektur-Review); Roh-Reports `docs/research/tech-stack.md`, `docs/research/architecture-review-p0-p3.md`.

## Messung auf dem Gerät (2026-09-29, iPhone 16, Safari 26.3, WebGPU aktiv)

Gemessen mit den Benchmark-Routen `/lab/blob?bench=1` und `/lab/earle?bench=1` über HTTPS im WLAN (Screenshots: `docs/progress/p6-iphone16-*.webp`). Das iPhone 16 hat ein 60-Hz-Display; 60 fps ist dort die Obergrenze, p99 ≈ 17–18 ms entspricht dem Vsync-Takt.

| Szene | Konfiguration | fps | p99 ms | Draw Calls | Gate (≥ 58 fps, p99 < 20 ms) |
|---|---|---|---|---|---|
| Blob-Lab | (a) Raymarch × 9, Hoch | 60 | 17,5 | 3 | ✓ |
| Blob-Lab | (a) Raymarch × 36, Hoch | 46 | 24 | 3 | ✗ |
| Blob-Lab | (b) Jiggle-Mesh × 9 | 60 | 17,5 | 3 | ✓ |
| Blob-Lab | (b) Jiggle-Mesh × 36 | 60 | 17 | 3 | ✓ |
| Blob-Lab | (a) Raymarch × 36, Mobil-Preset | 60 | 17 | 3 | ✓ |
| Earle-Lab | Hoch, Leerlauf (DPR 2, 786×1390) | 60 | 18 | 13 | ✓ |
| Earle-Lab | Hoch, rotierend | 60 | 19 | 18 | ✓ |
| Earle-Lab | Mobil, Leerlauf (DPR 1,5) | 60 | 19,5 | 11 | ✓ |
| Earle-Lab | Mobil, rotierend | 58 | 63,5 | 16 | ✗ (Hitch, vermutlich Pipeline-/Schattenkarten-Neuaufbau beim Preset-Wechsel; zu prüfen) |

Erste Messung vor dem Mobil-Preset: (a) Raymarch × 9 in Standardansicht 24 fps, p99 46 ms → das Preset (Schritte 20, innerer Marsch 4, DPR-Deckel 1,5, LOD) ist auf dem Gerät entscheidend.

**Zwischenfazit für das Gate**: Der Web-Track (three.js WebGPU) erfüllt auf dem iPhone 16 die Bildratenkriterien, wenn (b) Jiggle-Mesh der Standard im Raster ist und (a) Raymarch nur für Hero-Ansichten und Verschmelzmomente mit Mobil-Preset genutzt wird; die Map läuft in "Hoch" mit 60 fps. Offen: 10-Minuten-Stabilität, Wärme, Speicher, WKWebView-Build auf dem Gerät (Simulator liefert nur WebGL2), Godot-iOS-Export zum direkten Vergleich. Empfehlung: three.js bleibt Primärtrack, Godot bleibt als dokumentierter Fallback im Repo (`apps/godot/`).
