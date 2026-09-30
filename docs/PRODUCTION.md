# Produktionsplan v0.1

> Stand 2026-09-29. Quelle: Masterplan v0.1 (Abschnitte 11–16). Gamedesign: [`GDD.md`](GDD.md), Stil: [`STYLE.md`](STYLE.md), Engine-Gate: [`ADR/0001-engine.md`](ADR/0001-engine.md), Recherche: [`RESEARCH.md`](RESEARCH.md). Fortschritt wird als Screenshot je Prototyp-Stand in `docs/progress/` abgelegt.

## 1. Phasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **0 — jetzt** | Plan, GDD v0.1 im Repo, Scaffold, Prototypen P0–P6 inklusive Godot-Vergleichstrack (P1-G, P2-G), Stack-Entscheidung am Gate. Florian gibt visuelle Rückmeldung im Lab, liefert erste Module (Auge, Horn, Flügel als glTF; REX-Posen als Illustration) | Stack entschieden, Look bestätigt, erstes echtes Level spielbar |
| **1 — Vertical Slice** | Zone Tjorizo (Level 1–25) komplett, Evolution Stufen 1–8, Map-Segment, REX-Auftritte, Splash-Flow, ~80 % Grafik; Android Studio + JDK | spielbarer Slice mit Daten für die Erlösmodell-Entscheidung |
| **2 — Content** | 100 Level, 4 Zonen, Editoren komplett, Telemetrie (PostHog, Sentry, Firebase), TestFlight-/Android-Build, Nicole testet strukturiert (Versuche-Zielbänder, Fit der Bot-Abbildung) | kalibrierte 100 Level |
| **3 — Politur & Release-Konzept** | Grafik → 100 %, Audio, DE/EN, Store-Assets, Tierschutz-Partner, Soft-Launch-Plan, **Entscheidung Erlösmodell** (Einmalkauf, faires F2P oder Apple-Arcade-Pitch) auf Basis der Slice-Daten | Release-Kandidat |

## 2. Prototypen P0–P6 (jeweils im `/lab` sichtbar)

| # | Prototyp | Beweist | Abnahme |
|---|---|---|---|
| **P0** | Scaffold: pnpm-Workspace, Vite + TS + three.js WebGPU (HTTPS-Dev-Server, Backend-Badge, `?backend=webgl`), React-Overlay, Store/Bus, Routen, Content-Endpunkt, CI + Pages-Deploy; parallel Godot-4.7-Projekt anlegen | Toolchain | läuft im Browser-Panel und per HTTPS auf dem iPhone (Safari zeigt „WebGPU"); Pages-URL lädt; `pnpm -r typecheck && pnpm test` grün; ungültiges PUT an `/__content/…` → 400 |
| **P1** | **Blob-Lab**: zwei Kandidaten nebeneinander — (a) raymarchter SDF-Körper, (b) Jiggle-Mesh + SDF-Gesicht — je Idle-Wabbeln, Quetschen per TS-`SquashDriver` (SpringJiggle, ShapeMatching; Rapier 0.36 als Experiment), Verschmelzung per Smooth-Min, Materialien Jelly/Flüssig/Gas/Feuer | Figuren-Look (Screenshot 3) und Kosten | 36 Blobs ≥ 60 fps auf dem Mac (DPR 2) für mindestens einen Kandidaten; iPhone-Safari-Werte vorläufig bis P6; **Florian wählt den Kandidaten** |
| **P1-G** | Blob-Lab in Godot 4.7: dieselbe Szene (1/9/36 Blobs, gleiche Kamera) mit Spatial-Shader-Jiggle, SDF-Gesicht, Jolt-`SoftBody3D`, GPUParticles-Tropfen, SDF-Verschmelzung | Vergleichswerte nativ | gleiche Messgrößen wie P1 (ADR-Messprotokoll) |
| **P2** | **Earle-Lab**: sphärisches Kappen-Patch mit Hügeln, nachgeschärften Riesenschatten, instanzierten Kuppeln + Sechseck-Punkten, dünnen Stämmen, gestuftem Nebel, Bandhimmel; Trackball-Drag mit Trägheit; Wachstums-Regler | Map-Look | **Florian erkennt Earle + seinen Draft wieder**; keine sichtbaren Treppen an Schattenkanten; ≤ 100 Draw Calls; 60 fps Mac, ≥ 40 fps iPhone-Safari |
| **P2-G** | Earle-Lab in Godot 4.7: Spatial-Shader-Bänder, harte `DirectionalLight3D`-Schattenkante, `MultiMesh`-Punkte | Vergleichswerte nativ | gleiche Messgrößen wie P2 |
| **P3** | **Grid-Lab**: `@ee/core` mit exakt dem Tjorizo-Set (Pfeiler, Schrott, Spore, Amöbe, Kappe/Aufbruch, Verdorrt, Strahl-Blob) plus Fossilwand und Käfig für das Datenmodell; Ziele + Züge; Solver mit drei Bot-Stufen; 10 generierte Tjorizo-Level | Kernspaß, Vertrag `MoveEvent` für den Renderer | alle 10 Level von `strong` lösbar; Tutorial-Level `p_novice ≥ 0,9`; Strahl-Blobs auf ≤ 40 % der Wische; **Florian/Nicole spielen 5 Level** |
| **P4** | **Genom-Lab**: Sockel + 3 Blender-Assets (Auge, Horn, Flügel), prozedurales Jiggle/Idle, Vererbung beim Verschmelzen | Automatisierbarkeit | neue Stufe entsteht ohne Handanimation |
| **P5** | **Flow-Lab**: Splash → Hüpfer → Map → Kamerafahrt → Rasterplatte; Glas-HUD (CSS-Fallback) | Übergänge | ein Take ohne Schnitt |
| **P6** | Geräte-Builds **beider Tracks** (Capacitor-WKWebView und Godot-iOS-Export) auf Florians iPhone — in Phase 0, jetzt möglich, da Xcode installiert ist | Performance auf Gerät | **Entscheidungs-Gate Stack**: 36 Blobs + Partikel + Globus, 10 min stabil 60 fps, p99 < 20 ms, Speicher < ~400 MB, Low-Power und Wärme; WebGL2-Fallback gemessen; Glas-Overlay geprüft (Kriterien im ADR) |

## 3. Reihenfolge der ersten Umsetzungssitzung

≈ 40–45 h Agentenarbeit für den Web-Track; Godot-Track (P1-G, P2-G) geschätzt +12–16 h, sobald Godot installiert ist; P6 sobald Xcode einsatzbereit ist. **Feedback-Punkte fett.**

1. `docs/` (dieses Set) + `content/`-Schemas + `MoveEvent`-Vertrag — der Vertrag steht **vor** P1, weil die Verschmelzanimation ihn konsumiert.
2. P0 Scaffold, CanvasHost, Store/Bus, Content-Endpunkt, CI/Pages (3–4 h); Godot-Projekt anlegen, sobald installiert.
3. P3-Kern: Typen, zod, RNG, `applyMove` + Tests für das Tjorizo-Set (4–5 h); `/lab/grid` minimal mit flachen Klötzen (2 h) → **Florian/Nicole spielen 5 Level** (Eingabe-Timing, Spezialteil-Häufigkeit).
4. Solver + Kalibrierwerkzeug + 10 generierte Tjorizo-Level (4 h) → **Nicoles Versuche vs. Bot**.
5. P1 (a) Material + `BlobParams` + Genom-Stub + `SpringJiggle` (5–6 h), Verschmelz-Timeline (2 h), (b) (3 h), Rapier-Experiment (2 h) → **Florian wählt (a)/(b) gegen Screenshot 3**, 1–2 Runden Palette/Innenformen.
6. P2 Terrain + Material + Schattenfilter (4 h), Vegetation + Himmel/Nebel + Drag/Wachstum (3–4 h) → **Florian beurteilt Schattenform, Bänder, Palette**.
7. P1-G / P2-G in Godot.
8. P1-Blobs in `/lab/grid` verdrahten (2 h) → **erstes echtes Level**.
9. P4 / P5.
10. 100 Level generieren und kalibrieren.
11. P6 auf dem Gerät → **Stack-Entscheidung** (ADR nachtragen).

Schritte 3–4 laufen parallel zu Wartezeiten auf P1-Feedback. Nach jedem Prototyp: Screenshot in `docs/progress/`, Rückmeldung von Florian im Lab. Florian testet live im Preview — Änderungen des Agenten während seiner Sitzung erzeugen Interferenz; Test-Fenster absprechen.

## 4. Rollen

| Wer | Was |
|---|---|
| **Florian** | Art Direction, Blender-Module (Auge, Horn, Flügel, Set-Pieces), Illustration (REX-Posen), Paletten, Look-Abnahmen, Entscheidungen (Kandidat (a)/(b), Stack, Erlösmodell) |
| **Nicole** | Tests (Versuche pro Level, Spaß vs. Schwierigkeit), Kalibrierdaten für den Bot-Fit, Content (Level-Nachjustierung im Editor, REX-Sprüche) |
| **KI-Agent** | Code, Generatoren, Level, Solver, Kalibrierung, Docs, Messungen, Godot-Vergleichstrack |

## 5. Feedback-Punkte (Übersicht)

| Wann | Wer | Was wird beurteilt |
|---|---|---|
| nach P3-Minimal | Florian + Nicole | 5 Level: Eingabe-Timing (140/300 ms), Spezialteil-Häufigkeit, Verlustgefühl |
| nach Solver | Nicole | ihre Versuche pro Level vs. Bot-Bänder |
| nach P1 | Florian | Kandidat (a)/(b) gegen Screenshot 3; Palette, Innenformen (1–2 Runden) |
| nach P2 | Florian | Schattenform, Bandanzahl, Palette, Wiedererkennung von Earle und Draft |
| nach P1-G/P2-G | Florian + Agent | Look- und Messvergleich beider Tracks |
| erstes echtes Level | Florian + Nicole | Blobs im Raster, Verschmelzung im Spiel |
| P6 | Florian | Gerätegefühl (Bildrate, Wärme, Glas), Stack-Entscheidung |

## 6. Werkzeuge und Installationen

Stand 2026-09-29 auf Florians Mac (M3 Pro, 120 Hz Retina). *(Der Plan nennt macOS 15.4.1; die Shell meldet Darwin 27 = macOS 26 — bitte prüfen.)*

| Werkzeug | Status | Nächster Schritt |
|---|---|---|
| **Xcode 27** | **installiert** (erfüllt die Store-Pflicht „mit Xcode 26 / iOS-26-SDK oder neuer gebaut") | **Lizenz akzeptieren:** `sudo xcodebuild -license accept`; danach Simulator, Capacitor-iOS-Projekt, Godot-iOS-Export möglich |
| Apple Developer Program | offen (99 $/Jahr) | nötig für Geräte-Builds, TestFlight, Liquid Glass auf dem Gerät |
| **Godot 4.7** + Export-Templates | **nicht installiert** | installieren, `apps/godot/` anlegen (Vergleichstrack P1-G/P2-G); optional Godot-MCP-Server |
| **Blender 5.1.1** | installiert; MCP-Addon-Server **nicht gestartet** | in Blender: N-Panel → MCP → Start (Port 9876); zusätzlich headless `bpy`-Skripte (`tools/blender/export_assets.py`). Der MCP-Server führt generierten Code ohne Schutz aus — nur mit Bibliotheksdateien im Git arbeiten |
| **pnpm** | installiert (`pnpm@12.6.0` laut `package.json`) | — |
| Node | lokal Node 25 (kein LTS, kein corepack); CI läuft auf **Node 24 LTS** | — |
| GitHub-Repo, `gh`, Actions | eingerichtet (Account brownsugarwhite); Web-Deploy nach Pages | — |
| Android Studio + JDK | fehlen | Phase 1 |
| Firebase (Capawesome-Plugin), PostHog, Sentry-Capacitor, App Store Connect | später | Phase 2 |
| Figma-Connector | nur falls Florian dort UI entwerfen will | das Lab ersetzt Mockups |
| KI-Asset-Beschleuniger (Tripo/Rodin/Hunyuan3D) | optional | schnelle Blockouts aus Illustrationen, Retopo in Blender |
| Skills | `engineering:architecture` (ADR), `engineering:testing-strategy` (Solver-/Regel-Tests), `design:design-system` (UI-Tokens) | bei Bedarf |

Die Web-Version braucht von alledem nichts außer pnpm und Node.

## 7. Verifikation

- **Visuell**: jeder Prototyp im eingebauten Browser-Panel neben den Referenzen; FPS-Overlay (Backend, FPS, p99, Draw Calls); Screenshots in `docs/progress/`.
- **Gerät**: Safari auf dem iPhone im lokalen Netz **per HTTPS** (WebGPU verlangt einen sicheren Kontext, sonst stiller WebGL2-Fallback; das Overlay zeigt das aktive Backend); Capacitor-Build und Godot-iOS-Export auf dem Gerät.
- **Automatisch**: vitest-Tabellentests je Element (Brett + Richtung → erwartetes Brett + Ereignisse); Property-Tests (Blob-Erhaltung `vorher = nachher + 2·Verschmelzungen − Spawns`, Determinismus pro Seed, `applyMove` liefert `null` genau dann, wenn nichts passiert); Solver-Benchmark ≥ 150k Züge/s; Kalibrierlauf über alle Level (CI scheitert bei 0/200 für `strong` oder außerhalb des Bands); zod validiert alle Content-Dateien. Playwright in CI nur als Smoke (kleiner Canvas, WebGL2, keine GPU auf GitHub-Runnern); Golden-Screenshot-Vergleiche laufen lokal auf dem Mac.

## 8. Risiken

| Risiko | Umgang |
|---|---|
| **Name** „early earle" (Eyvind Earle Publishing hält Marke und Rechte) | Produktionstitel; vor Release prüfen |
| **Erlösmodell** bewusst offen | Leitplanken im GDD (keine Leben/Energie/Werbung im Kernloop, `Storefront`-Adapter, „Zone 1 frei" konfigurierbar, Game Center von Anfang an); Entscheidung Phase 3 |
| **Stack** | Vergleich beider Tracks, Gate P6 (ADR-0001) |
| **60 fps im WKWebView**, WebGPU auf Android unsicher | messen; Godot als Ausweg; Expo + react-native-wgpu als Absicherung |
| **Spendenmodell** | gelöst (Studio spendet aus Nettoeinnahmen); offen: Rechts-/Steuerprüfung, Partner, Prozentbasis — ein Versprechen wird nie gekürzt |
| **Solver ≠ Mensch** | Versuche-Schätzung erst nach Fit an Nicoles Daten belastbar; bis dahin Bänder |
| **Rapier 0.36** Tage alt | nur Experiment; TS-Physik Standard |
| **Speicher** im WKWebView (~400 MB) | P6-Messung, 30-Minuten-Sitzungen |
| **Beide Tracks kosten Zeit** (+12–16 h) | Godot-Track nur für P1-G/P2-G; verlierender Track wird eingefroren |
| **Interferenz** beim Live-Testen | Test-Fenster absprechen |
| Blender-MCP ohne Sandbox | nur Bibliotheksdateien im Git |
| Mittelklasse-Android für P6 fehlt | beschaffen (Zu verfeinern) |

## 9. Release-Konzept (Skelett, Phase 3)

Grafik 100 %, Audio, DE/EN, Store-Assets (Screenshots im Lab erzeugt), Tierschutz-Partner mit Verträgen und Formulierung des Drittel-Versprechens je Modell, Transparenzbericht-Vorlage, Soft-Launch-Plan mit Telemetrie-Zielen (Versuche-Bänder, Abbruch < 2 %, Retention-Benchmarks aus dem GDD), App-Review-Vorbereitung (4.2: Game Center, Haptik, natives Chrome; 2.5.1: keine privaten APIs; 3.2.2: keine In-App-Spenden), Entscheidung Erlösmodell. **Offen** bis dahin.

## Nachtrag 2026-09-29 (Abend): Stand P0–P6

- P0 ✓ (WebGPU/WebGL2 im Panel, CI grün mit Smoke-Suite in ~2 min). P3 ✓ (Kern, Solver, Level 001–025 kalibriert, Grid-Lab spielbar). P1 ✓ (beide Kandidaten, Mobil-Preset, Bench). P2 ✓ (Earle-Slice, Mobil-Preset, Bench). P1-G/P2-G ✓ (Godot 4.7, Mac-Messwerte in `apps/godot/README.md`). P5 in Arbeit. P4 offen.
- P6 teilweise: Capacitor-iOS-Projekt gebaut und im Simulator gestartet (nur WebGL2 dort); Gerätemessung über Safari auf dem iPhone 16 siehe ADR-0001 → Gate-Kriterien mit (b)-Standard und Mobil-Preset erfüllt. Noch offen: WKWebView-Build auf dem Gerät (Signatur mit Apple-ID), Langzeit-/Wärmetest, Godot-iOS-Export.
- Nächste Schritte: adaptive Qualitätsstufe (Start Hoch, Rückstufung bei p99 > 20 ms über drei Fenster), (b) als Raster-Standard verdrahten, P4 Genom-Lab mit Blender-Modulen, P5 Flow-Lab abnehmen, Level 26–50 (Syrup) generieren.

## Nachtrag 2026-09-29 (Nacht): Iteration 2 nach Florians Feedback

Richtung laut `docs/FEEDBACK.md` (Hauptreferenz: ganzer Ordner `ref/eyvind earle/`). Sechs parallele Baustellen mit getrennten Zuständigkeiten:

| Baustelle | Umfang | Zuständigkeit (Pfade) |
|---|---|---|
| Kreaturen v2 | Körpertypen (Blob, Schlange, Vierbeiner, REX-Zweibeiner, schwer), Gang mit Schrittzyklus + IK, Schlängeln, physikalischer Schleimsprung, Rüssel-/Bein-Animationen, Editor-Usability | `packages/genome`, `packages/physics`, `packages/render/src/creature`, `apps/game/src/lab/creature`, Editor Creatures |
| Materialien v2 | Fell, Federn, Muster (Tiger, Giraffe, Zebra, Schuppen, Rauten), Gas/Flüssig/Feuer neu, reichere Module | `packages/render/src/blob`, `packages/render/src/materials`, `tools/blender`, `content/genome/assets`, Blob-Lab |
| Zehn Welten | je ein Gemälde als Stil, Höhe + übertriebene Perspektive, Müll der Anfangswelt, feine Vektortexturen | `packages/world`, `packages/render/src/earle` (ohne tree/blossom), `content/zones`, Earle-Lab, `flow/MapWorld.ts` |
| Riesenbaum | Flechtenstamm, Wurzeln, Kuppelkrone, Blüten mit Zen-Loops, Kronenpfad | `packages/render/src/earle/tree`, `earle/blossom`, `/lab/tree` |
| Spielfeld v2 | Earle-Plateau, Element-Visualisierungen, Partikel, wandzeitbasierte Tweens, Morph Map→Brett | `packages/render/src/board`, `flow/LevelBoard.ts`, `flow/FlowScene.ts` (Choreografie), Grid-Lab |
| iPhone | lokales Capacitor-Plugin Liquid Glass (SwiftUI-Overlay), Haptik, Icon/Splash, Simulator, `docs/IOS.md` | `apps/game/ios`, `apps/game/plugins`, `apps/game/src/native`, `flow/FlowHud.tsx` |

Integration danach durch die Leitung: Baum in den Planeten (LandmarkSlot), Kreaturen v2 + Materialien verdrahten, Kreaturen aufs Brett, natives Glas im Flow; anschließend Sichtung gegen die Gemälde und erneute iPhone-Messung.

## Nachtrag 2026-09-30 (früh): Stand Iteration 2

Committet und gepusht (jeweils isoliert geprüft: Typecheck, Unit-Tests, betroffene E2E):
- **Schatten v2** (`/lab/shadow`): Kaskaden eng auf die Planetensicht, B-Spline/quintische Kante, Silhouettenregeln → glatte Vektorkanten ohne Treppen; in Map, Earle-, Baum- und Grid-Lab verdrahtet.
- **Zehn Welten** (Pass 2): Gemälde-Kompositionen je Welt, Müll der Startwelt, Vektortexturen, Riesenbaum auf dem Planeten, Level 80–95 klettern Stamm und Krone.
- **Riesenbaum** (`/lab/tree`, Pass 2), **Materialien** (Muster, Fell, Federn, Gas/Flüssig/Feuer, Gesichtsmaske), **Kreaturen v3** (Arten nach Florians Draufsicht-Skizze, geknetete Beine, Schlange mit Kopfspur, Maul, Merge-Moves), **Spielfeld** (Earle-Wiese, alle Elemente, Draufsicht ~65°, entfernungsabhängiges Timing, spektakuläre Merges mit Splash), **Level-Editor v2** (iPhone-first, Kette mit Schwierigkeitskurve), **iOS-Layer** (Liquid-Glass-Plugin, Haptik, `pnpm ios:sim`).

In Arbeit: alle Arten auf dem Mesh-Weg (iPhone/Mobil), Spielfeld Pass 4 (Schritte der Stampfbeine, Mobil-Check, Map-Kamera MAP_VIEW + Baum-Schiene im Flow).
Sicherheitsnetz: geplante Aufgabe `early-earle-weiterarbeiten` (alle 3 h, nur wenn das Projekt 2 h ruht).

## Nachtrag 2026-09-30 (Morgen): Stand Nacht 2 und Simulator-Prüfung

Neu seit dem letzten Nachtrag (alles committet, jeweils isoliert geprüft):
- **REX als 3D-Wesen** (`/lab/rex`): türkiser Dino nach dem illudiy-Logo, Spiralaugen im Shader, Kiefer spricht Silben, Jubeln, Verzweifeln, Zeigen, Spähen, Schwindel, Feiern. Auf der Map schaut er über die Sprechblase, im Level steht er neben dem Plateau.
- **Klang** (`/lab/audio`): prozedurale Merge-Töne (Zonen-Pentatonik), Material-Landungen, Sprung-zur-Kamera, REX-Kauderwelsch, Ambiente für alle zehn Welten, ruhige Musik; Ton-Schalter im HUD und nativ.
- **Alle Arten als Mesh-Körper** (Hoch und Mobil) mit Vorab-Kompilierung; Stress-Brett „Herde“ mit 21 Arten bei 60 fps.
- **Fortschritt** bleibt gespeichert (Level, Bestwerte, zuletzt gewählter Knoten); Hochformat-Kamera für das iPhone.

Simulator-Durchlauf (iPhone Air, Splash → Map → Level 1 → Sieg → Level 2) und Prüfung im Chrome-WebGPU fanden vier Fehler, alle behoben:

| Fehler | Ursache | Behebung |
|---|---|---|
| **WebGPU: Plateau und Wesen unsichtbar** (nur Schatten) | three.js baut TSL-Layout-Funktionen einmal pro Backend und gibt den Code an spätere Pipelines weiter, ohne deren Puffer zu deklarieren (WGSL: „unresolved value NodeBuffer“) | Funktions-Cache pro Builder (`packages/render/src/common/tslFunctionCache.ts`); neuer E2E-Test `webgpu.spec.ts` mit echter GPU (lokal; auf CI übersprungen) |
| Native Knopfleiste im Level zeigte nur „…“ und stieß an den Rand | vier Pillen mit Mindestbreite passten nicht aufs iPhone | eine Entscheidung für die ganze Leiste: Beschriftung, wenn sie passt, sonst gleich breite Symbol-Pillen |
| REX auf der Map unten hart abgeschnitten | im Web-View fehlt die DOM-Sprechblase, REX nahm eine feste Ersatzkante | natives Layout-Ereignis meldet Sprechblase und Knopfleiste; REX nutzt diese Maße |
| Web-Knopfleiste brach auf Handybreite in zwei Zeilen um | Beschriftungen zu breit | unter 480 px nur Symbole in einer Zeile |

Außerdem: lokale Wartezeiten im Flow-E2E an SwiftShader angepasst, ESLint ignoriert iOS-Build-Ausgaben.

Offen: Test auf Florians iPhone als native App (Signatur mit Apple-ID, siehe `docs/IOS.md`), dort läuft WebGPU; REX springt beim Sieg kurz über den Brettrand (bewusst gelassen, das Level ist dann vorbei); Zielanzeige „Stufe 8“ zeigt den 2048-Wert statt der Stufe (Designfrage).

## Nachtrag 2026-09-30 (Tag): Iteration 3 nach Florians Morgen-Feedback

Florian hat die App erstmals auf seinem iPhone 16 getestet („Alles sieht schon gut aus. Der Ansatz passt.“) und mit fünf Earle-Bildern präzisiert (lokal in `ref/eyvind earle/feedback-2026-09-30/`). Acht Baustellen liefen parallel in eigenen Git-Arbeitsbäumen, danach zusammengeführt und gemeinsam geprüft:

| Baustelle | Ergebnis | Wo ansehen |
|---|---|---|
| Bäume v3 | organische Stämme/Äste, Rinde als Filigran (weiße Linien, Flechten, Glasfenster, Schnee), Kuppelkronen mit Blütenpunkten, Earle-Eiche, Tannen aus Punkten, Haine entlang der Hügel, Punkte skalieren weich aus 0 | `/lab/earle?gallery=1&world=05`, `/play` |
| Landschaft | Felswände, Felsnadeln, Turm und Tafelfels, Flüsse, Seen (auch gefroren), Schneefelder, Schneewehen, rote Scheune, Nebelbänke | `/lab/earle?world=06`, `?world=08` |
| Müll v2 | kleinteiliger Neon-Müll, Ruinen, Müllberge, Neon-Nebelschleier, der mit jedem Sieg heilt | `/lab/earle?world=9&progress=0` |
| Riesenbaum v3 | größer, knorrig, Juwelenkrone, Levelpunkte als Baumpilze an der Rinde und Blütensteine auf den Kuppeln (liegen an, schweben nicht) | `/lab/tree?view=path` |
| Levelpfad | Wegband durch die Landschaft, Knoten auf ihren Elementen, Animationen, Level am Ort, großes Spielfeld, REX mobil oben rechts | `/play` |
| Schatten v3 | Kontakt bis zum Gegenstand, Kaskaden am sichtbaren Boden (etwa doppelt so fein), `shadowFactor`, Schattentönung je Welt | `/lab/shadow?debug=3` |
| Werkstatt | Labs und Editoren in der App, Einstellungs-Sheet, Speichern auf den Mac im WLAN, Map-Editor | Schraubenschlüssel auf der Map |
| Blender-Bibliothek | `assets/blender/early-earle-bibliothek.blend`: Map, 108 Wesen mit Rig, REX, Module, Materialien, Vorlage „Eigenes Wesen“ mit Rückweg ins Spiel | `docs/BLENDER.md` |

Integration durch die Leitung: Pfad meidet Wasser und Felsfüße, Müll meidet Wasser und Felsen, Kronen-Level in der Kuppelfarbe, Blender-Export auf die neuen Paletten, GPU-Tests auf Desktopbreite; eine eigene Integrations-Baustelle verdrahtet die Baumpilze im Spiel, `shadowFactor` für die Kronenpunkte, Kronen als Schattenempfänger, blaue Schatten auf Schnee und schwebende Reste.

Werkzeuge: `E2E_PORT` für parallele Testläufe (Fetch-Sperrports wie 4190 meiden), `pnpm assets:blender -- --bilder` erneuert die Blender-Datei (≈ 2 min), `IOS_TEAM_ID=R67BLW649H IOS_DEVICE="eyePhone (2)" pnpm --filter @ee/game ios:device` spielt auf Florians iPhone.

## Nachtrag 2026-09-30 (Abend): Iteration 4 nach Florians neun Punkten

Florian schickte nach dem iPhone-Test neun Wünsche mit zwei Referenzbildern (Loader „23 %“, fertiger Splash). Entscheidungen der Fragerunde: Ton bleibt, wie er ist (Lautlos-Schalter schaltet stumm), fette Schrift **Caprasimo** (OFL) statt Cooper Black Std (Adobe-Fonts-Lizenz), Logo aus seiner AI-Datei `ref/loader and splash.ai`, Möwenklänge synthetisch. Nachtrag: Der echte Modus scrollt begrenzt, erreichbar sind nur freigespielte Level. Ein Fundament (Caprasimo, Fortschritt v2, Klang-IDs, Brett-Hooks, Verträge) ging zuerst auf main, dann liefen sieben Baustellen parallel in eigenen Arbeitsbäumen; parallel baute eine zweite Session die unendliche Kugel (ADR 0002), mit ihr abgestimmt über Nahtstellen (`flow/choreo/stage.ts`).

| Baustelle | Ergebnis | Wo ansehen |
|---|---|---|
| B1 Loader & Splash | Balken = i-Stamm mit echtem Ladefortschritt (neun gewichtete Schritte bis Karten-Shader und ruhige Bilder), Prozent in Caprasimo; bei 100 % Möwenschatten, Blob fällt mit Flatsch, Kontur/Flamme/®/Sterne bauen sich neo-brutal mit langen Punktlicht-Schatten auf, „Tippen“; Auszeichnen und Übergabe an den 3D-Helden; iOS-Startbild = erstes Loader-Bild; eine Tinte `#081b25` | `/`, `?splash=manual|fast|final|overlay` |
| B2 Möwe im Spiel | alle 3–5 Züge (Level 1: erster Zug) bringt eine nur als Schatten sichtbare, rufende Möwe den neuen kleinsten/zweitkleinsten Blob: Silbermöwen-Schatten mit Flügelschlag, Flatsch mit Krone, Spritzern, Plattenwelle; rein darstellend, deterministisch | `/lab/grid?gull=always`, `/play` |
| B3 Tutorial & Kern | Raster ab 1×N, `spawn.script`, Level 1–6 auf Mini-Brettern (Level 1 = 1×3, beweisbar unverlierbar), Einführungslevel 11/14/16/18/21 auf 3×3, neue REX-Zeilen | Grid-Lab, GDD §6.6 |
| B4 Flow & Fortschritt | erster Start: „Tippen“ → direkt Level 1 mit Wisch-Pfeil; nach dem Sieg Landung auf dem geschafften Knoten, Hüpfen über die Pfadpunkte, Freischaltung beim Ankommen; REX-Szene nach Level 1; echter Modus (gesperrte Knoten, Scroll-Grenze mit Gummiband) und freier Modus; Werkstatt-Karte „Fortschritt“ | `/`, `/play`, `?mode=real|free` |
| B5 Sammlung | Katalog 253 Wesen, „NEU!“-Stempel, Setzkasten als Overlay-Szene (Fächer je Stufe × Art, Silhouetten, Deckel), neu erspielte Wesen wohnen auf der Map, Brett nutzt die Zone des Levels | Setzkasten-Knopf auf der Karte |
| B6 Klassik-2048 | endloses 2048 am Knoten des Helden, sieben Formate mit Freischaltung (4×4 ab L5 …), bestes gesammeltes Wesen je Stufe, Bestwerte, „Kein Zug mehr“ | „2048“-Knopf auf der Karte |
| B7 Audio & iOS | 14 synthetische Klänge (Möwenruf als Formantstimme, Flatsch, Stempel, Flamme, Sterne …) im Pegel-Soll, Ton-Freischaltung robuster (native Pillen, Wachhund, Start ohne Geste in der App), Caprasimo im nativen HUD, neue Pillen-Regel | `/lab/audio` → Iteration 4 |

Integration durch die Leitung: Map-Wesen auf dem echten Boden (`flow/mapGround.ts`), Sperrzone ums Plateau, „Sammlung füllen“ mit dem Katalog, `unicode-range` für Caprasimo (Mathe-Zeichen sind Platzhalter), Klassik-Spielende-Klang, „Kein Zug mehr“ im nativen HUD, gemeinsamer Stil der Karten-Einstiege, E2E an Loader und SwiftShader angepasst. Geprüft: Typecheck, 713 Unit-Tests, Lint, Build; Erststart komplett auf echter GPU ohne Konsolenfehler (Video); E2E einzeln (Flow, Fortschritt, Möwe, Tutorial, Audio, Editor, Wesen …).

Offen für Florians Blick: Der Möwenschatten ist im Flow-Level so dunkel wie jeder Schatten und verschwindet unter Blobs — darf er dunkler sein, oder sollen die Wesen ihn empfangen (analytische Maske)? Setzkasten im Querformat eine Zone je Seite; Größe der Map-Wesen (0,48 × Stufenfaktor); „Tippen“-Farbe/Größe; die Loader-Zahl ist so klein wie im Mockup. iPhone-Deploy aller Stände macht die Parallel-Session am Ende (Florians Ansage).
