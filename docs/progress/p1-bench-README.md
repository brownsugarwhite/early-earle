# P1 Blob-Lab — Benchmark (`/lab/blob?bench=1`)

Ein Tap auf dem Handy: `https://<mac-ip>:5174/lab/blob?bench=1` öffnen, ~25 s warten, Tabelle ablesen
(sie steht auch als `console.table` in der Konsole und als `window.__eeBench` als JSON).

## Was der Bench macht

Nach dem Shader-Compile (erstes Perf-Sample) werden fünf Konfigurationen nacheinander gefahren, je
1 s Aufwärmen + 3,5 s Messung. Gemessen wird aus dem Perf-Store der App (`fps`, `frameP99Ms`,
`drawCalls`), den der `CanvasHost` einmal pro Sekunde aus dem Frame-Loop schreibt. Das erste
1-s-Fenster nach dem Umschalten wird verworfen (enthält den Umbau der Blob-Liste).

| Spalte | Bedeutung |
|---|---|
| **fps** | Median der 1-s-Fenster; `min` = schlechtestes Fenster |
| **p99 ms** | Median der p99-Frametimes (99. Perzentil je Fenster); `max` = schlechtestes Fenster |
| **dc** | Draw Calls (Platte + Instanz-Meshes) |
| **Ziel** | `OK` wenn fps ≥ 58 **und** p99 < 20 ms (Mediane). Sonst `zu langsam`. |

Kopfzeile: Backend (WebGPU/WebGL2), `DPR gerät → effektiv` (der Mobil-Preset deckelt auf 1,5),
CSS-Größe und tatsächliche Canvas-Pixel; Fußzeile: User-Agent.

**Pass-Kriterien aus dem Plan (§8/§11):** 36 Blobs, stabil 60 fps, p99 < 20 ms, DPR ≤ 2 auf dem
Mac; iPhone-Safari-Werte gelten bis P6 als vorläufig. Der Bench meldet `OK` je Zeile; entscheidend
ist die Zeile mit 36 Blobs des gewählten Kandidaten. Auf 120-Hz-Geräten zeigt Safari maximal
60 fps im WKWebView, im Browser bis 120.

Konfigurationen:

| Zeile | Kandidat | Blobs | Preset |
|---|---|---|---|
| (a) Raymarch × 9 · Hoch | a | 9 | Hoch (32 Schritte, 8 Innen-Schritte, 2 Oktaven, alle Kugeln, DPR bis 2) |
| (a) Raymarch × 36 · Hoch | a | 36 | Hoch |
| (b) Jiggle-Mesh × 9 | b | 9 | — (ein opaker Instanz-Draw) |
| (b) Jiggle-Mesh × 36 | b | 36 | — |
| (a) Raymarch × 36 · Mobil | a | 36 | Mobil (siehe unten) |

## Qualitäts-Presets (Regler „Qualität: Hoch / Mobil / Auto“)

`Auto` = Mobil auf Touch-Geräten oder bei DPR ≥ 2,5, sonst Hoch. Alle Knöpfe sind Uniforms bzw.
CPU-Parameter, es wird nichts neu kompiliert.

| Knopf | Hoch | Mobil | Kosten / Wirkung |
|---|---|---|---|
| Pixel-Ratio | Geräte-DPR, max 2 | max 1,5 | Fragmente ∝ DPR²: iPhone DPR 3 → 1,5 = 4× weniger Pixel. Größter Hebel, leicht weicher. |
| Trace-Schritte | 32 | 20 | Obergrenze pro Pixel; typische Treffer nach 8–14 Schritten, 20 reicht. |
| Innen-Schritte | 8 | 4 | Organe/Bläschen entlang des gebrochenen Strahls; 4 findet beide Organformen, Bläschen etwas seltener. |
| Noise-Oktaven | 2 | 1 | Jede Oktave ≈ 370 ALU (8 lookup3-Hashes) pro SDF-Auswertung, d. h. pro Schritt. Halbiert die Noise-Kosten; Silhouette verliert Feindetail. |
| Kugeln pro Blob | alle (≤ 8) | ≤ 5 | Jede Kugel = ein dynamisch indizierter Uniform-Load pro Schritt (auf Apple-GPUs teurer als die ALU). Stufe ≤ 4 unverändert. |
| LOD Innen-Marsch | unter 24 px | unter 64 px | Blobs kleiner als N Gerätepixel überspringen Organe/Bläschen komplett (Uniform-Branch pro Instanz). |
| Enge Boxen | immer | immer | Instanz-Box pro Achse an die Kugeln gefittet, am Boden abgeschnitten: nur echte Blob-Pixel betreten die Schleife. |

Experimente per URL (ändern die Shader, deshalb nur beim Laden): `?core=1` (Sphere-Tracing auf dem
kugel-only-Kern mit Noise-Schranke, Noise nur nahe der Oberfläche — auf dem Mac langsamer, auf dem
Handy testen), `?oct=const` (Oktaven fest eingebrannt), `?steps=const` (Schrittzahl fest).

## Mac-Referenz (M3 Pro, headless Chromium WebGPU/Metal, 1280×800 CSS bei DPR 2, VSync aus, Production-Build)

| Konfig | fps (min) | p99 ms (max) | dc | Ziel |
|---|---|---|---|---|
| (a) Raymarch × 9 · Hoch | 258 (255) | 7,8 (7,9) | 3 | OK |
| (a) Raymarch × 36 · Hoch | 140 (140) | 15,7 (96,7)¹ | 3 | OK (Median) |
| (b) Jiggle-Mesh × 9 | 1143 (1121) | 5,7 (5,8) | 3 | OK |
| (b) Jiggle-Mesh × 36 | 978 (967) | 6,0 (6,2) | 3 | OK |
| (a) Raymarch × 36 · Mobil | 425 (417) | 7,2 (7,8) | 3 | OK |

¹ Einzelner 90-ms-Frame beim Umschalten / Swap ohne VSync; mit VSync nicht reproduziert. Zweiter
Durchlauf: 274 / 147 / 1184 / 1060 / 431 fps. Vollbild-Einzelblob (Screenshot-3-Pose, Hoch) ≈ 220 fps,
Mobil ≈ 525 fps. Während einer Verschmelzung im (b)-Modus (zwei Blobs raymarched, 4 dc) ≈ 440 fps.
Zum Vergleich der erste Handy-Wert des Designers: (a) × 9 Hoch = 24 fps, p99 46 ms (DPR 3).

Reproduzieren: `NO_SSL=1 pnpm --filter @ee/game exec vite build --outDir <dist>`,
`NO_SSL=1 pnpm --filter @ee/game exec vite preview --port 5177 --outDir <dist>`, dann
`http://localhost:5177/lab/blob?bench=1` in Chromium mit `--enable-unsafe-webgpu --use-angle=metal
--disable-gpu-vsync --disable-frame-rate-limit`. Auf dem Dev-Server (5174) stören HMR-Reloads
anderer Agenten die p99-Werte.

## Bilder

`p1-bench-mac.png` (Tabelle auf dem Mac), `p1-blob-webgpu-a-36.png` / `p1-blob-webgpu-a-36-mobil.png`
(Hoch vs. Mobil), `p1-blob-webgpu-pose3.png` / `p1-blob-webgpu-pose3-mobil.png` (Screenshot-3-Pose in
beiden Presets).
