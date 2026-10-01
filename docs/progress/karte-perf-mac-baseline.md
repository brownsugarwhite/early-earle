# Karte · Leistung am Mac — Baseline vor R4.2–R4.7 (R4.1 „Messen zuerst“)

Erste Messung der Karte seit ADR 0002 (unendliche Ebene), als Vergleichsbasis für DPR-Deckel, Karten-Governor,
Schatten-Slide, Punkte-Taps, Instanz-Kulling und Depth16. Werkzeug: `apps/game/src/flow/mapBench.ts`
(`/play?bench=karte` oder `__flow.bench()`), Lauf über `apps/game/e2e/karte-perf-webgpu.spec.ts`. Gegenstück fürs
Telefon: `karte-perf-iphone16.md`.

| | |
|---|---|
| Stand | `r4/messung` auf main 4bf845b — nur die Messung, kein Eingriff ins Rendern |
| Rechner | Apple M3 Pro (12 Kerne), Chromium der Playwright-Installation (Headless Chrome 153, UA als Desktop-Chrome) mit `--use-angle=metal --enable-gpu --ignore-gpu-blocklist --enable-unsafe-webgpu`, WebGPU |
| Bild | 393 × 852 CSS (iPhone-Hochformat), MSAA 4; DPR von der Messung gesetzt: 2 → 786 × 1704 (= iPhone 16 mit `MAX_DPR 2`), 1,75 → 687 × 1491, 1,5 → 589 × 1278 |
| Seiten | `/play?mode=free&reset=free&level=1\|66&quality=hoch\|mobil` — Level 1 (Blickwelt w09, Schwenk-Strecke bis w04) und Level 66 (w07, Strecke bis w11) |
| Befehl | `E2E_PORT=4351 node scripts/e2e.mjs e2e/karte-perf-webgpu.spec.ts` (in `apps/game`, ≈ 5 min, schreibt die JSONs) |
| Gemessen | 2026-10-01, 15:18–15:23 (Lauf 1, diese Tabellen) und 15:24–15:30 (Lauf 2, Vergleich unten) |
| Last | **hoch**: Load-Mittel 22–32 (Lauf 1) bzw. 20–42 (Lauf 2) — parallel liefen eine Level-Kalibrierung mit 6 Workern, `mediaanalysisd` und ein zweiter Headless-Chromium anderer Agenten auf derselben GPU |

**Achtung Last:** Die CPU-Mediane sind dadurch eher zu hoch (frühere Läufe derselben Reihe bei Load ≈ 10–15:
Hoch w09 Schwenken CPU 14–17 ms statt 16,4) und die p99-Werte empfindlich; die GPU-Werte litten in Lauf 2
sichtbar unter der fremden GPU-Last (2–3 × höher, siehe Vergleich). Lauf 1 deckt sich mit den ruhigeren Probeläufen
und ist deshalb die Baseline. Für eine saubere Basis den Befehl auf ruhigem Mac wiederholen.

## Wie gemessen wird (kurz)

- **Reihen** je ≥ 120 Bilder: Leerlauf und Schwenken (0,8 Einheiten je Bild vorwärts entlang der Blickrichtung, jede
  Reihe ab demselben Fokus über dieselbe Strecke von ≈ 110 Einheiten; „kalt“ = erster Durchgang mit Chunk-Bau), je
  *alles* / *ohne Schattenpässe* (Fit läuft, die Pässe werden gestrichen) / *ohne Punkte* (`dots.visible = false`) /
  *ohne Vegetation* (ganze Gruppe inkl. Punkte), dazu *alles* bei DPR 1,75 und 1,5 und eine Kontrollreihe am Ende.
- **Bild** (seriell): ein Bild startet erst bei leerer GPU-Warteschlange; Start → `onSubmittedWorkDone`. Enthält die
  **Rückmeldezeit L** (Chrome/Metal ≈ 2–4 ms je Warten, Spalte „L“) und den Hochlauf einer GPU, die zwischen den
  Bildern ruht (Probe: nach 10 ms Pause + ≈ 3,5 ms). Also konservativ — Bild ≈ CPU + GPU + L, nicht die Bildrate.
- **CPU**: Hauptthread des Bildes mit Marken (`world.update` ohne Bau/Inhalt, Chunk-Bau, `rebuildContent`, Fit =
  `beforeRender` der Kaskaden, Encode = `renderer.render` ohne Fit, Szene = Rest).
- **GPU** (Replay): dasselbe Bild 2 × und 8 × am Stück, Gerade `T(B) = B·g + L` → Kosten je Bild bei voll getakteter
  GPU ohne L. Schwenken: jedes Replay-Bild mit Schattenpass.
- **Posten** = A/B-Differenz zu „alles“ (Mittel aus Start und Kontrolle). Die GPU-Anteile der Varianten und DPR-Stufen
  werden **gepaart** gemessen: das Replay der Reihe wechselt Probe für Probe mit „alles“ bei DPR 2 am selben Bild —
  Drift (Wärme, Takt, fremde GPU-Last) fällt heraus. Rauschen der gepaarten GPU-Posten hier ≈ ± 0,3 ms.
- Schattenpässe/s = Bilder mit mindestens einer neu gezeichneten Kaskade × 60; in Klammern die Kaskaden/s.

## Ergebnis auf einen Blick (DPR 2, „alles“, Lauf 1)

| Fall | Leerlauf GPU / CPU | Schwenken GPU / CPU med / CPU p99 / Bild p99 | dc Schwenken med / max | Schattenpässe/s Schwenken |
|---|---|---|---|---|
| Hoch w09 | 2,3 / 1,9 | 3,6 / 16,4 / 26,5 / 37,3 | 111 / 129 | 60 (180 Kaskaden) |
| Hoch w07 | 2,8 / 2,2 | 5,7 / 23,3 / 48,1 / 66,0 | 137 / 150 | 60 (180) |
| Mobil w09 | 1,3 / 1,8 | 2,4 / 11,1 / 19,5 / 29,6 | 98 / 111 | 60 (120) |
| Mobil w07 | 1,7 / 2,0 | 2,9 / 13,2 / 27,5 / 34,8 | 113 / 130 | 60 (120) |

Gegen das Bild-Budget aus dem Plan (Hoch am M3): **GPU ≤ 7 ms erfüllt** (3,6–6,3 beim Schwenken), **Hauptthread
≤ 5 ms verfehlt** (16–23 ms beim Schwenken; im Leerlauf 2 ms), **p99 ≤ 12 ms verfehlt**, **Draw Calls ≤ 80 / 100
verfehlt** (98–137 / 111–150 beim Schwenken; Leerlauf 46–54). Im Leerlauf laufen keine Schattenpässe.

## Wo die Zeit hingeht (Top 3, Mac)

1. **`rebuildContent` beim Schwenken (Hauptthread)** — in 56–63 % der Schwenk-Bilder ein kompletter Neubau der
   Vegetations-Pools: Median 5,7 (Mobil w09) bis 16,4 ms (Hoch w07), Spitzen 12–46 ms; das ist der größte Teil des
   CPU-„Rests“ und der p99. Ursache laut `EarlePlanet.update` (`planet.ts` ≈ 1300–1335): jedes geladene/entladene
   Chunk und jede Änderung der nahen Chunks setzt `contentDirty`, und bei 0,8 Einheiten je Bild ändert sich das
   jedes zweite Bild. → **R4.6** (Inhalt nur aus sichtbaren Chunks + sonnenwärtigem Band, inkrementell/mit
   Hysterese) ist der größte Hebel für Hauptthread und p99.
2. **Schattenpässe beim Schwenken** — jedes Bild ein Refit (1,0 je Bild) und alle Kaskaden neu (60 Runden/s, 180
   bzw. 120 Kaskaden/s): GPU 0,9–2,0 ms, Hauptthread 1,5–2,9 ms (Encode der Kaskaden + Fit 0,9–1,6 ms Median, p99
   bis 15 ms in w07), und sie **verdoppeln die Draw Calls** (ohne Schatten 52–67). → **R1.3 Slide / R4.4**.
3. **Vegetation** — größter GPU-Posten: 1,3–3,0 ms beim Schwenken (Hoch w07 2,95), 0,4–2,0 ms im Leerlauf; dazu
   1,5–4 ms Hauptthread (Encode der Instanz-Meshes in Haupt- und Schattenpässen). → **R4.6** Instanz-Kulling.

Weitere Befunde:
- **Punkte** (Kronenpunkte, Vertex-Taps): auf dem M3 klein, −0,3…+0,7 ms GPU (im Rauschen); die 9 Taps × Kaskaden
  kosten erst auf dem Telefon — iPhone-Messung abwarten (R4.5).
- **DPR**: auf dem M3 spart 2 → 1,5 meist ≤ 0,5 ms GPU, oft im Rauschen (einmal 1,5 ms bei starker Drift) — der M3
  ist bei 786 × 1704 nicht füllratenbegrenzt. Ob DPR 1,75 aufs iPhone gehört, entscheidet erst die Gerätemessung.
- **Kalter Schwenk** (neue Strecke): Chunk-Bau-Spitzen bis 30 ms (Hoch w09), CPU p99 46–65 ms.
- Die erste Leerlauf-Reihe hat in 3 von 4 Fällen einzelne Ausreißer (Bild p99 36–42 ms bei CPU p99 ≈ 5 ms):
  GPU-seitig, vermutlich Restarbeit nach dem Aufwärmen; die folgenden Leerlauf-Reihen liegen meist bei 9–15 ms.
- Mobil braucht beim Schwenken ≈ 30–45 % weniger CPU und ≈ 35–50 % weniger GPU als Hoch (weniger Bäume/Punkte,
  2 statt 3 Kaskaden).

## Reihen (Lauf 1)

### Hoch · Level 1 — Blickwelt w09, Schwenk-Strecke bis w04 (`karte-perf-hoch.json`)

| Szene | Variante | DPR | Canvas | Bild med / p99 | CPU med / p99 | GPU (Replay) | L | dc med / max | Schattenpässe/s (Kaskaden/s) |
|---|---|---|---|---|---|---|---|---|---|
| Leerlauf | alles | 2 | 786×1704 | 9,6 / 36,0 | 1,9 / 4,5 | 2,31 | 3,4 | 54 / 54 | 0 (0) |
| Leerlauf | ohne Schatten | 2 | 786×1704 | 9,3 / 13,4 | 1,9 / 5,3 | 2,25 | 2,7 | 54 / 54 | 0 (0) |
| Leerlauf | ohne Punkte | 2 | 786×1704 | 5,7 / 10,9 | 1,9 / 5,3 | 2,38 | 2,9 | 53 / 53 | 0 (0) |
| Leerlauf | ohne Vegetation | 2 | 786×1704 | 6,7 / 9,6 | 1,5 / 3,8 | 1,10 | 2,5 | 42 / 42 | 0 (0) |
| Leerlauf | alles | 1,75 | 687×1491 | 7,0 / 13,0 | 1,9 / 4,5 | 2,32 | 3,4 | 54 / 54 | 0 (0) |
| Leerlauf | alles | 1,5 | 589×1278 | 7,1 / 13,0 | 1,9 / 4,7 | 1,98 | 2,5 | 54 / 54 | 0 (0) |
| Leerlauf | alles (Kontrolle) | 2 | 786×1704 | 9,1 / 13,4 | 1,8 / 4,9 | 2,21 | 3,0 | 54 / 54 | 0 (0) |
| Schwenken kalt | alles | 2 | 786×1704 | 22,8 / 61,4 | 18,0 / 54,3 | 3,84 | 2,2 | 111 / 127 | 60 (180) |
| Schwenken | alles | 2 | 786×1704 | 22,1 / 37,3 | 16,4 / 26,5 | 3,57 | 2,9 | 111 / 129 | 60 (180) |
| Schwenken | ohne Schatten | 2 | 786×1704 | 21,1 / 32,2 | 14,9 / 25,8 | 2,54 | 2,4 | 53 / 59 | 0 (0) |
| Schwenken | ohne Punkte | 2 | 786×1704 | 21,5 / 32,3 | 15,9 / 24,9 | 3,61 | 2,4 | 110 / 128 | 60 (180) |
| Schwenken | ohne Vegetation | 2 | 786×1704 | 18,6 / 29,8 | 13,8 / 23,3 | 1,38 | 2,5 | 75 / 87 | 60 (180) |
| Schwenken | alles | 1,75 | 687×1491 | 22,6 / 36,3 | 16,3 / 25,4 | 3,33 | 2,9 | 111 / 129 | 60 (180) |
| Schwenken | alles | 1,5 | 589×1278 | 22,1 / 33,7 | 16,4 / 26,1 | 3,38 | 2,7 | 111 / 129 | 60 (180) |
| Schwenken | alles (Kontrolle) | 2 | 786×1704 | 23,1 / 36,6 | 16,4 / 29,1 | 3,68 | 2,7 | 111 / 129 | 60 (180) |

### Hoch · Level 66 — Blickwelt w07, Schwenk-Strecke bis w11 (`karte-perf-hoch-w07.json`)

| Szene | Variante | DPR | Canvas | Bild med / p99 | CPU med / p99 | GPU (Replay) | L | dc med / max | Schattenpässe/s (Kaskaden/s) |
|---|---|---|---|---|---|---|---|---|---|
| Leerlauf | alles | 2 | 786×1704 | 8,4 / 41,5 | 2,2 / 4,6 | 2,77 | 3,1 | 48 / 48 | 0 (0) |
| Leerlauf | ohne Schatten | 2 | 786×1704 | 8,9 / 11,6 | 1,9 / 4,3 | 2,86 | 2,7 | 48 / 48 | 0 (0) |
| Leerlauf | ohne Punkte | 2 | 786×1704 | 8,9 / 11,9 | 1,8 / 4,2 | 2,58 | 3,0 | 47 / 47 | 0 (0) |
| Leerlauf | ohne Vegetation | 2 | 786×1704 | 6,2 / 10,5 | 1,6 / 6,7 | 0,87 | 1,9 | 35 / 35 | 0 (0) |
| Leerlauf | alles | 1,75 | 687×1491 | 8,8 / 15,0 | 2,0 / 7,5 | 2,73 | 3,2 | 48 / 48 | 0 (0) |
| Leerlauf | alles | 1,5 | 589×1278 | 8,6 / 10,9 | 1,8 / 4,1 | 2,57 | 2,9 | 48 / 48 | 0 (0) |
| Leerlauf | alles (Kontrolle) | 2 | 786×1704 | 8,9 / 12,5 | 2,0 / 6,0 | 3,05 | 2,5 | 48 / 48 | 0 (0) |
| Schwenken kalt | alles | 2 | 786×1704 | 30,7 / 70,7 | 25,6 / 65,3 | 4,82 | 3,3 | 137 / 150 | 60 (180) |
| Schwenken | alles | 2 | 786×1704 | 30,4 / 66,0 | 23,3 / 48,1 | 5,71 | 2,3 | 137 / 150 | 60 (180) |
| Schwenken | ohne Schatten | 2 | 786×1704 | 26,9 / 59,7 | 19,9 / 50,5 | 3,72 | 3,7 | 67 / 72 | 0 (0) |
| Schwenken | ohne Punkte | 2 | 786×1704 | 28,0 / 56,7 | 21,6 / 47,7 | 5,20 | 4,2 | 136 / 149 | 60 (180) |
| Schwenken | ohne Vegetation | 2 | 786×1704 | 23,6 / 60,0 | 18,7 / 55,3 | 2,03 | 3,1 | 92 / 107 | 60 (180) |
| Schwenken | alles | 1,75 | 687×1491 | 27,9 / 50,5 | 22,6 / 44,4 | 4,98 | 2,5 | 137 / 150 | 60 (180) |
| Schwenken | alles | 1,5 | 589×1278 | 28,1 / 54,5 | 21,5 / 47,0 | 4,62 | 2,9 | 137 / 150 | 60 (180) |
| Schwenken | alles (Kontrolle) | 2 | 786×1704 | 27,9 / 62,0 | 22,2 / 51,8 | 6,92 | 3,4 | 137 / 150 | 60 (180) |

### Mobil · Level 1 — Blickwelt w09, Schwenk-Strecke bis w04 (`karte-perf-mobil.json`)

| Szene | Variante | DPR | Canvas | Bild med / p99 | CPU med / p99 | GPU (Replay) | L | dc med / max | Schattenpässe/s (Kaskaden/s) |
|---|---|---|---|---|---|---|---|---|---|
| Leerlauf | alles | 2 | 786×1704 | 6,9 / 12,6 | 1,8 / 4,5 | 1,31 | 3,2 | 53 / 53 | 0 (0) |
| Leerlauf | ohne Schatten | 2 | 786×1704 | 7,8 / 11,8 | 1,8 / 4,7 | 1,49 | 2,5 | 53 / 53 | 0 (0) |
| Leerlauf | ohne Punkte | 2 | 786×1704 | 6,2 / 13,1 | 1,8 / 8,8 | 1,79 | 1,8 | 52 / 52 | 0 (0) |
| Leerlauf | ohne Vegetation | 2 | 786×1704 | 5,8 / 11,3 | 1,5 / 7,3 | 1,38 | 2,4 | 41 / 41 | 0 (0) |
| Leerlauf | alles | 1,75 | 687×1491 | 7,8 / 12,1 | 2,1 / 6,6 | 1,51 | 3,6 | 53 / 53 | 0 (0) |
| Leerlauf | alles | 1,5 | 589×1278 | 6,6 / 12,1 | 1,7 / 4,6 | 1,10 | 2,5 | 53 / 53 | 0 (0) |
| Leerlauf | alles (Kontrolle) | 2 | 786×1704 | 7,5 / 11,3 | 1,7 / 4,3 | 1,41 | 2,5 | 53 / 53 | 0 (0) |
| Schwenken kalt | alles | 2 | 786×1704 | 17,6 / 53,3 | 11,6 / 46,0 | 2,03 | 2,5 | 98 / 111 | 60 (120) |
| Schwenken | alles | 2 | 786×1704 | 15,4 / 29,6 | 11,1 / 19,5 | 2,35 | 2,1 | 98 / 111 | 60 (120) |
| Schwenken | ohne Schatten | 2 | 786×1704 | 13,7 / 22,8 | 9,6 / 16,5 | 1,43 | 3,2 | 52 / 58 | 0 (0) |
| Schwenken | ohne Punkte | 2 | 786×1704 | 16,4 / 36,1 | 11,6 / 22,3 | 2,60 | 3,8 | 97 / 110 | 60 (120) |
| Schwenken | ohne Vegetation | 2 | 786×1704 | 14,1 / 25,6 | 9,8 / 20,3 | 1,41 | 2,4 | 67 / 76 | 60 (120) |
| Schwenken | alles | 1,75 | 687×1491 | 16,6 / 28,0 | 11,4 / 20,5 | 2,19 | 2,3 | 98 / 111 | 60 (120) |
| Schwenken | alles | 1,5 | 589×1278 | 15,8 / 35,9 | 11,9 / 29,7 | 2,19 | 3,8 | 98 / 111 | 60 (120) |
| Schwenken | alles (Kontrolle) | 2 | 786×1704 | 16,4 / 31,3 | 11,6 / 26,4 | 2,09 | 4,0 | 98 / 111 | 60 (120) |

### Mobil · Level 66 — Blickwelt w07, Schwenk-Strecke bis w11 (`karte-perf-mobil-w07.json`)

| Szene | Variante | DPR | Canvas | Bild med / p99 | CPU med / p99 | GPU (Replay) | L | dc med / max | Schattenpässe/s (Kaskaden/s) |
|---|---|---|---|---|---|---|---|---|---|
| Leerlauf | alles | 2 | 786×1704 | 8,2 / 39,7 | 2,0 / 5,0 | 1,68 | 2,6 | 46 / 46 | 0 (0) |
| Leerlauf | ohne Schatten | 2 | 786×1704 | 7,6 / 20,6 | 2,0 / 9,1 | 1,58 | 4,0 | 46 / 46 | 0 (0) |
| Leerlauf | ohne Punkte | 2 | 786×1704 | 6,0 / 12,0 | 1,8 / 6,5 | 1,51 | 3,6 | 45 / 45 | 0 (0) |
| Leerlauf | ohne Vegetation | 2 | 786×1704 | 4,2 / 8,9 | 1,5 / 3,7 | 1,73 | 0,9 | 34 / 34 | 0 (0) |
| Leerlauf | alles | 1,75 | 687×1491 | 5,5 / 9,3 | 1,8 / 4,0 | 1,54 | 3,1 | 46 / 46 | 0 (0) |
| Leerlauf | alles | 1,5 | 589×1278 | 5,2 / 9,6 | 1,9 / 5,1 | 1,83 | 2,6 | 46 / 46 | 0 (0) |
| Leerlauf | alles (Kontrolle) | 2 | 786×1704 | 7,2 / 12,8 | 1,9 / 7,3 | 1,81 | 3,7 | 46 / 46 | 0 (0) |
| Schwenken kalt | alles | 2 | 786×1704 | 20,6 / 66,8 | 15,5 / 51,2 | 3,13 | 4,9 | 112 / 130 | 60 (120) |
| Schwenken | alles | 2 | 786×1704 | 18,2 / 34,8 | 13,2 / 27,5 | 2,92 | 4,0 | 113 / 130 | 60 (120) |
| Schwenken | ohne Schatten | 2 | 786×1704 | 15,9 / 39,0 | 12,2 / 31,9 | 2,63 | 2,8 | 64 / 71 | 0 (0) |
| Schwenken | ohne Punkte | 2 | 786×1704 | 19,1 / 45,1 | 13,8 / 38,6 | 2,78 | 3,1 | 112 / 129 | 60 (120) |
| Schwenken | ohne Vegetation | 2 | 786×1704 | 16,8 / 43,4 | 12,5 / 37,0 | 1,90 | 3,2 | 81 / 93 | 60 (120) |
| Schwenken | alles | 1,75 | 687×1491 | 20,1 / 41,6 | 13,9 / 30,2 | 3,31 | 3,0 | 113 / 130 | 60 (120) |
| Schwenken | alles | 1,5 | 589×1278 | 21,8 / 42,7 | 17,1 / 36,4 | 3,73 | 6,4 | 113 / 130 | 60 (120) |
| Schwenken | alles (Kontrolle) | 2 | 786×1704 | 20,9 / 35,1 | 15,7 / 29,7 | 5,12 | 3,1 | 113 / 130 | 60 (120) |

## Posten (A/B bei DPR 2, ms; GPU = Δ Replay gepaart, CPU = Δ Hauptthread-Median)

Der CPU-„Rest“ enthält `rebuildContent` — es läuft unabhängig davon, ob die Vegetation sichtbar ist.

### Schwenken

| Posten | Hoch w09 GPU / CPU | Hoch w07 GPU / CPU | Mobil w09 GPU / CPU | Mobil w07 GPU / CPU |
|---|---|---|---|---|
| gesamt (alles) | 3,63 / 16,35 | 6,32 / 22,75 | 2,22 / 11,35 | 4,02 / 14,43 |
| Schattenpässe | 1,29 / 1,45 | 1,98 / 2,85 | 0,87 / 1,75 | 0,95 / 2,18 |
| Punkte | -0,15 / 0,45 | 0,66 / 1,15 | -0,26 / -0,25 | 0,26 / 0,63 |
| Vegetation inkl. Punkte | 2,22 / 2,60 | 2,95 / 4,05 | 1,31 / 1,55 | 1,27 / 1,93 |
| Vegetation ohne Punkte | 2,37 / 2,15 | 2,29 / 2,90 | 1,57 / 1,80 | 1,01 / 1,30 |
| Rest (Gelände, Himmel, Nebel, Weg, Held …) | 0,12 / 12,30 | 1,39 / 15,85 | 0,04 / 8,05 | 1,80 / 10,32 |
| DPR 2 → 1,75 (Ersparnis) | 0,22 / 0,05 | 0,16 / 0,10 | 0,11 / -0,10 | -0,15 / 0,53 |
| DPR 2 → 1,5 (Ersparnis) | 0,06 / -0,10 | 0,52 / 1,25 | 0,16 / -0,60 | 1,53 / -2,62 |
| Drift (Kontrolle − Start) | 0,11 / 0,00 | 1,21 / -1,10 | -0,26 / 0,50 | 2,20 / 2,55 |

### Leerlauf

| Posten | Hoch w09 GPU / CPU | Hoch w07 GPU / CPU | Mobil w09 GPU / CPU | Mobil w07 GPU / CPU |
|---|---|---|---|---|
| gesamt (alles) | 2,26 / 1,85 | 2,91 / 2,10 | 1,36 / 1,75 | 1,75 / 1,95 |
| Schattenpässe | -0,04 / -0,05 | -0,13 / 0,20 | -0,03 / -0,05 | 0,18 / -0,05 |
| Punkte | 0,01 / -0,05 | 0,22 / 0,30 | -0,17 / -0,05 | 0,17 / 0,15 |
| Vegetation inkl. Punkte | 1,10 / 0,35 | 1,99 / 0,50 | 0,55 / 0,25 | 0,39 / 0,45 |
| Vegetation ohne Punkte | 1,09 / 0,40 | 1,77 / 0,20 | 0,72 / 0,30 | 0,22 / 0,30 |
| Rest (Gelände, Himmel, Nebel, Weg, Held …) | 1,20 / 1,55 | 1,05 / 1,40 | 0,84 / 1,55 | 1,18 / 1,55 |
| DPR 2 → 1,75 (Ersparnis) | -0,14 / -0,05 | 0,10 / 0,10 | 0,38 / -0,35 | 0,18 / 0,15 |
| DPR 2 → 1,5 (Ersparnis) | 0,09 / -0,05 | 0,28 / 0,30 | 0,29 / 0,05 | 0,27 / 0,05 |
| Drift (Kontrolle − Start) | -0,10 / -0,10 | 0,28 / -0,20 | 0,10 / -0,10 | 0,13 / -0,10 |

## Hauptthread beim Schwenken (DPR 2, „alles“; med / p99 ms)

| Fall | Szene | update | Chunk-Bau (max) | Inhalt `rebuildContent` (max; Anteil der Bilder) | Fit | Encode | Szene (Held, Weg …) | CPU gesamt | Refits/Bild |
|---|---|---|---|---|---|---|---|---|---|
| Hoch w09 | Schwenken kalt | 1,1 / 11,2 | 0,0 / 11,6 (29,7) | 9,8 / 19,7 (22,9; 56 %) | 1,3 / 4,5 | 3,8 / 16,3 | 0,3 | 18,0 / 54,3 | 1,00 |
| Hoch w09 | Schwenken | 1,0 / 3,2 | 0,0 / 0,3 (0,3) | 9,8 / 15,6 (18,1; 56 %) | 1,4 / 4,4 | 3,9 / 6,0 | 0,3 | 16,4 / 26,5 | 1,00 |
| Hoch w07 | Schwenken kalt | 0,4 / 5,6 | 0,0 / 11,4 (11,6) | 16,2 / 36,0 (46,0; 61 %) | 1,6 / 12,9 | 4,2 / 6,5 | 0,3 | 25,6 / 65,3 | 1,00 |
| Hoch w07 | Schwenken | 0,4 / 1,0 | 0,0 / 0,5 (0,5) | 16,4 / 34,0 (36,3; 62 %) | 0,9 / 14,7 | 4,1 / 7,2 | 0,3 | 23,3 / 48,1 | 1,00 |
| Mobil w09 | Schwenken kalt | 0,8 / 8,0 | 0,0 / 9,2 (27,8) | 5,7 / 11,4 (18,3; 57 %) | 1,3 / 4,2 | 2,9 / 10,7 | 0,3 | 11,6 / 46,0 | 1,00 |
| Mobil w09 | Schwenken | 0,7 / 1,6 | 0,0 / 0,2 (0,4) | 5,7 / 11,7 (12,3; 58 %) | 1,3 / 3,6 | 3,0 / 4,8 | 0,3 | 11,1 / 19,5 | 1,00 |
| Mobil w07 | Schwenken kalt | 0,5 / 4,2 | 0,0 / 8,0 (9,9) | 8,3 / 21,4 (29,8; 63 %) | 1,4 / 10,6 | 3,4 / 8,3 | 0,3 | 15,5 / 51,2 | 1,00 |
| Mobil w07 | Schwenken | 0,4 / 0,9 | 0,0 / 0,3 (0,4) | 8,4 / 18,5 (26,3; 63 %) | 1,2 / 9,6 | 3,2 / 6,4 | 0,3 | 13,2 / 27,5 | 1,00 |

## Vergleich Lauf 1 ↔ Lauf 2 (Reproduzierbarkeit unter Last)

Lauf 2 direkt danach, Load bis 42 und ein zweiter Headless-Chromium auf der GPU: CPU meist +20–35 %, GPU-Replay
1,4–2,7 ×. Auch gepaarte GPU-Posten verschieben sich, wenn sich die GPU mit einem fremden Prozess teilt (Schatten Hoch
w09 1,3 → 5,7 ms) — die GPU-Rangfolge ist unter fremder GPU-Last also nicht belastbar. Die CPU-Rangfolge
(`rebuildContent` vorn) bleibt gleich.

| Fall | Reihe | Lauf | Bild med / p99 | CPU med / p99 | Inhalt med (max) | GPU (Replay) | Schatten Δ GPU | Vegetation inkl. Punkte Δ GPU |
|---|---|---|---|---|---|---|---|---|
| Hoch w09 | Leerlauf | 1 | 9,6 / 36,0 | 1,9 / 4,5 | 0,0 (0,0) | 2,31 | -0,04 | 1,10 |
| Hoch w09 | Leerlauf | 2 | 6,3 / 8,9 | 2,5 / 5,4 | 0,0 (0,0) | 3,14 | 0,35 | 1,06 |
| Hoch w09 | Schwenken | 1 | 22,1 / 37,3 | 16,4 / 26,5 | 9,8 (18,1) | 3,57 | 1,29 | 2,22 |
| Hoch w09 | Schwenken | 2 | 27,6 / 46,9 | 19,9 / 36,0 | 11,8 (26,5) | 9,73 | 5,66 | 3,79 |
| Hoch w07 | Leerlauf | 1 | 8,4 / 41,5 | 2,2 / 4,6 | 0,0 (0,0) | 2,77 | -0,13 | 1,99 |
| Hoch w07 | Leerlauf | 2 | 11,7 / 19,8 | 2,9 / 9,1 | 0,0 (0,0) | 5,84 | 0,26 | 4,09 |
| Hoch w07 | Schwenken | 1 | 30,4 / 66,0 | 23,3 / 48,1 | 16,4 (36,3) | 5,71 | 1,98 | 2,95 |
| Hoch w07 | Schwenken | 2 | 41,6 / 78,5 | 31,2 / 65,0 | 19,8 (45,3) | 13,57 | 5,91 | 5,85 |
| Mobil w09 | Leerlauf | 1 | 6,9 / 12,6 | 1,8 / 4,5 | 0,0 (0,0) | 1,31 | -0,03 | 0,55 |
| Mobil w09 | Leerlauf | 2 | 8,2 / 11,6 | 2,4 / 7,5 | 0,0 (0,0) | 2,16 | -0,46 | 1,16 |
| Mobil w09 | Schwenken | 1 | 15,4 / 29,6 | 11,1 / 19,5 | 5,7 (12,3) | 2,35 | 0,87 | 1,31 |
| Mobil w09 | Schwenken | 2 | 20,8 / 44,6 | 14,2 / 31,6 | 7,2 (19,2) | 5,33 | 1,06 | 1,58 |
| Mobil w07 | Leerlauf | 1 | 8,2 / 39,7 | 2,0 / 5,0 | 0,0 (0,0) | 1,68 | 0,18 | 0,39 |
| Mobil w07 | Leerlauf | 2 | 7,1 / 18,2 | 2,8 / 9,0 | 0,0 (0,0) | 3,23 | 0,59 | 1,54 |
| Mobil w07 | Schwenken | 1 | 18,2 / 34,8 | 13,2 / 27,5 | 8,4 (26,3) | 2,92 | 0,95 | 1,27 |
| Mobil w07 | Schwenken | 2 | 16,1 / 33,9 | 12,8 / 28,1 | 7,9 (20,4) | 7,38 | 0,87 | 2,09 |

## Messfallen (für R4.2–R4.7 und das Telefon)

- `onSubmittedWorkDone` direkt nach `requestAnimationFrame` wartet hinter dem gerade abgegebenen Bild der App (≈ 7 ms
  für eine leere Abgabe); ohne eigene Abgabe antwortet es sofort. Jedes Warten nach echter Arbeit kostet die feste
  Rückmeldezeit L. Deshalb: Bild = konservativ, GPU nur aus der Replay-Geraden.
- three r186 zählt `frameId` nur in der Animationsschleife weiter; `ShadowNode` zeichnet höchstens einmal je
  frameId und Kamera. Mehrere `render()` in einer Aufgabe zeichnen den Schatten also nur im ersten (geprüft: 119 vs.
  54 Draw Calls). Der Replay schaltet deshalb `nodeFrame` je Bild weiter. **Nebenbefund:** `benchShadowPass` im
  Schatten-Lab (`ShadowLabScene.ts` ≈ 663) stapelt 8 Renders ohne das — seine „ms je Schattenpass“ sind rund
  8 × zu klein.
- Die Messung schaltet das Gummiband des echten Modus ab, setzt DPR, Sichtbarkeiten und Fokus danach zurück und
  hängt sich nur während der Messung in `update`, `world.update`, `rebuildContent`, `beforeRender` und
  `renderer.render` (Normalbetrieb unverändert, `e2e/webgpu.spec.ts` grün).

## Regressionswächter

`karte-perf-webgpu.spec.ts` prüft vorerst nur: ≥ 13 Reihen à ≥ 120 Bilder und **p99 Bild beim Schwenken ≤ 80 ms**
(`EE_PERF_P99`); das Planziel 20 ms steht als Anmerkung („Ziel verfehlt“). Nach R4.6 auf 20 ms, nach R4.2–R4.7 auf
12 ms senken; dann auch Schattenpässe/s ≤ 10 prüfen.

## Dateien

`karte-perf-hoch.json`, `karte-perf-hoch-w07.json`, `karte-perf-mobil.json`, `karte-perf-mobil-w07.json` (Lauf 1;
ein neuer Lauf der Spec überschreibt sie).

## Nach R4 (R4.4 Schatten-Kadenz, R4.6 Inhalt) — `r4/leistung`, 2026-10-01

Stand: main edaa026 + `69d69de` (hash32 ohne Allokation), `b2c529f` (R4.4), `312e792` (R4.6). Gleicher Befehl
(`E2E_PORT=4441`), JSONs dieses Ordners = Lauf „nachher“. „Vorher“ = derselbe Befehl auf edaa026 kurz zuvor
(16:15–16:21, Load 10–36). **Last:** nachher 16:47–16:54, Load 10–16, dazu fremde Headless-Chromium-Läufe auf derselben
GPU — die GPU-Replays lagen nachher 2–4 × über vorher (Leerlauf Hoch w09 3,6 → 6,1 ms, ohne Änderung am Leerlauf):
**Bild-p99 und GPU sind diesmal nicht vergleichbar, Hauptthread, Draw Calls und Schattenpässe schon.**

Schwenken · alles · DPR 2 (vorher → nachher):

| Fall | CPU med / p99 | Inhalt-Neubau (Anteil der Bilder; p99) | Schattenpässe/s (Kaskaden/s) | dc med / max | Bild med / p99 |
|---|---|---|---|---|---|
| Hoch w09 | 7,3 / 21,8 → **3,9 / 9,0** | 68 % (12,4) → 17 % (2,0) | 60 (180) → **22,5 (57,5)** | 82 / 96 → **39 / 92** | 10,5 / 27,6 → 13,3 / 37,7 |
| Hoch w07 | 16,6 / 29,4 → **3,3 / 18,6** | 66 % (21,3) → 17 % (7,8) | 50,5 (151,5) → **21 (44,5)** | 93 / 121 → **50 / 119** | 23,9 / 38,0 → 10,9 / 35,8 |
| Mobil w09 | 6,7 / 18,2 → **3,7 / 6,7** | 69 % (7,7) → 17 % (1,3) | 60 (119,5) → **19,5 (36)** | 72 / 82 → **38 / 79** | 11,2 / 24,7 → 10,8 / 16,1 |
| Mobil w07 | 12,2 / 23,9 → **4,2 / 14,8** | 71 % (15,4) → 17 % (7,3) | 55 (108,5) → **15,5 (27,5)** | 81 / 102 → **41 / 99** | 18,2 / 29,6 → 14,7 / 33,4 |

Je Hebel (Diagnose-Schwenk 150 Bilder à 0,8 Einheiten, Welt 07 Hoch, CPU-Profil/Zähler, Mac unter Last):

| Hebel | Messwert |
|---|---|
| `hash32` ohne Allokation (je Zahl kein Float64Array mehr; identische Werte) | `TreeLayer.setContent` 18,0 → 3,2 ms je Aufruf, `rebuildContent` 21,0 → 6,4 ms |
| R4.4 Schatten-Kadenz (kein Pass beim Schwenken/Gleiten/Gieren, Regionen geänderter Werfer ≤ 10/s, Lichtungszone, Snap-Pause 6 Bilder für feine Kaskaden, ψ/Texel-Schlüssel mit Toleranz) | Runden 140 → 52 je 150 Bilder, Kaskaden 413 → 114 |
| R4.6 Inhalt nur aus gewollten Chunks, höchstens alle 6 Bilder, Regionsschlüssel je Baum gecacht | Neubauten 98 → 25, Summe 464 → 122 ms, Instanzen 945 → 346 |

Planziele (Hoch am M3): Hauptthread-Median ≤ 5 ms **erfüllt** (3,3–3,9); Draw Calls Median ≤ 80 **erfüllt**, Max ≤ 100
in w07 nicht (119/121: Bilder mit Schattenrunde); Schattenpässe ≤ 10/s **nicht** (15–23/s); CPU-p99 ≤ 12 in w07 nicht
(18,6: Inhalt-Neubau bis 12 ms + Fit-Spitzen). Rest der Pässe (`dirtyCauses`): Refits der Kamera-Nachführung über
Hindernissen (w09: Pose-Refit jedes Bild) und der Empfänger-Volumen (w07: ≈ 1 von 3 Bildern), Regionen vom Rand.
Nicht umgesetzt: DPR-Deckel und Karten-Governor (R4.1–R4.3), Instanz-Kulling der Pools (Grenzkugeln), Depth16 (R4.7).
