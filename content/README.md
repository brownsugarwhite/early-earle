# content/

Alle Spielinhalte als JSON, versioniert im Repo, editierbar über die In-App-Editoren (`/editor/*`, im Dev-Modus über den Vite-Endpunkt `/__content/...`).

- `zones/*.json` — Zone: Palette, Vegetation, Set-Pieces, Levelbereich
- `levels/NNN.json` — Level (Raster, Maske, Elemente, Ziele, Züge, Spawn, Kappe, Spezial-Schwellen, Versuche-Ziel); Schema in `@ee/core`
- `klassik/formats.json` — Rasterformate des Klassik-Modus (freies 2048): Maske und Freischaltung nach Level N; Schema `KlassikFormatsSchema` in `@ee/core`
- `genome/rules.json` — Stufen → Material/Assets/Paletten pro Zone; `genome/assets/*.glb` Blender-Module mit `SOCKET_<slot>`-Empties
- `rex/lines.json` — REX-Sprüche und Auftritte pro Anlass
- `creatures/vorlagen/<id>.json` — Wesen-Vorlagen der Wesen-Werkstatt (Bauplan), `creatures/stil.json` — Stil-Vorgabe aller Wesen; siehe `creatures/README.md`

Jede Datei trägt `schemaVersion`. Validierung: `pnpm test` (zod).
