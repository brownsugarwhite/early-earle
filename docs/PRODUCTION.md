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
