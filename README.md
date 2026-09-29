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
