# early earle

Produktionstitel. Ein levelbasiertes 2048/Merge-Spiel mit Jelly-Blob-Wesen, Guide-Dino REX und einer rotierbaren Planeten-Map im Stil **"Neo-Brutalismus trifft Eyvind Earle"**. Von illudiy.

- Plan und Gamedesign: `docs/` (GDD, STYLE, RESEARCH, ADR, PRODUCTION), Roh-Recherchen in `docs/research/`
- Inhalte (Level, Zonen, Genom, REX): `content/` als JSON
- Code: pnpm-Workspace — `packages/core` (Regeln + Solver, ohne Abhängigkeiten), `genome`, `physics`, `world`, `render` (three.js WebGPU/TSL), `apps/game` (Vite + React, Routen `/play`, `/lab/*`, `/editor/*`)
- Referenzbilder liegen lokal in `ref/eyvind earle/` und sind nicht im Repository.

## Entwicklung

```bash
pnpm install
pnpm dev          # HTTPS-Dev-Server (WebGPU braucht einen sicheren Kontext), im LAN auch fürs iPhone
pnpm typecheck
pnpm test         # vitest (Regeln, Solver, Schemas)
pnpm e2e          # Playwright-Smoke (ohne GPU)
```

`?backend=webgl` an eine Route hängen, um den WebGL2-Fallback zu erzwingen. Der Perf-Badge zeigt Backend, FPS, Frametime-p99 und Draw Calls.

## Testen (Stand 2026-09-29)

Dev-Server starten (`pnpm dev`), dann im Browser auf dem Mac `https://localhost:5173` bzw. auf dem iPhone im gleichen WLAN `https://<Mac-IP>:5173` (Zertifikat einmal bestätigen). Ohne HTTPS gibt es kein WebGPU.

| Adresse | Was | Ausprobieren |
|---|---|---|
| `/` | Splash → Hüpfer → Map → Level → Aufbruch in einem Take | Antippen, "Spielen", wischen; Entwickler-Leiste oben links springt zwischen Zuständen |
| `/play` | Direkt auf der Map | Knoten antippen, Planeten ziehen |
| `/lab/grid` | Spielkern mit allen 100 Leveln als Klötze | Level-Wähler, Pfeiltasten/Wischen, Z = Rückspulen, R = Neustart |
| `/lab/blob` | Blob-Kandidaten (a Raymarch / b Jiggle-Mesh), Materialien, Verschmelzen | "Screenshot-3-Pose", "Zwei verschmelzen", Qualität Hoch/Mobil |
| `/lab/blob?bench=1` | Automatischer Blob-Benchmark | 30 s warten, Tabelle ablesen (grün = Ziel erreicht) |
| `/lab/earle` | Earle-Planetenkappe | Ziehen rollt, Regler für Sonne, Bänder, Wachstum, Qualität |
| `/lab/earle?bench=1` | Automatischer Map-Benchmark | 30 s warten, Tabelle ablesen |
| `/lab/creature` | Genom-Lab: Module an Sockeln, Vererbung (in Arbeit) | Stufen 1–8, Verben, Verschmelzen |
| `/editor/levels` | Level-Editor mit Solver | Level wählen, Maske malen, Solver "Bots laufen lassen", rote Seeds nachspielen, als `_name.json` speichern |
| `/editor/creatures` | Creature-Editor (in Arbeit) | Freischaltungen pro Stufe, Sockel, Paletten |

Der Perf-Badge oben rechts zeigt Backend (WebGPU/WebGL2), fps, Frametime-p99, Draw Calls und die Qualitätsstufe (antippen: Auto → Hoch → Mobil). Godot-Vergleich: `/Applications/Godot.app/Contents/MacOS/Godot --path apps/godot`.
