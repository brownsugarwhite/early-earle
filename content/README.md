# content/

Alle Spielinhalte als JSON, versioniert im Repo, editierbar über die In-App-Editoren (`/editor/*`, im Dev-Modus über den Vite-Endpunkt `/__content/...`).

- `zones/*.json` — Zone: Palette, Vegetation, Set-Pieces, Levelbereich
- `levels/NNN.json` — Level (Raster, Maske, Elemente, Ziele, Züge, Spawn, Kappe, Spezial-Schwellen, Versuche-Ziel); Schema in `@ee/core`
- `genome/rules.json` — Stufen → Material/Assets/Paletten pro Zone; `genome/assets/*.glb` Blender-Module mit `SOCKET_<slot>`-Empties
- `rex/lines.json` — REX-Sprüche und Auftritte pro Anlass

Jede Datei trägt `schemaVersion`. Validierung: `pnpm test` (zod).
