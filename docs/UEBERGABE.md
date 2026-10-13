# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-13 nachts, nach Florians „Fixe die Punkte aus offen und ehrlich und dann weiter“ (er ist unterwegs). Der **Plan „Wesen-Editor 2“** ist freigegeben: [`docs/plans/2026-10-13-wesen-editor-2.md`](plans/2026-10-13-wesen-editor-2.md). **Beweis 1 (Kern-Tempo und Treue) ist bestanden**, die offenen Punkte sind nachgearbeitet: [`docs/research/2026-10-13-beweis1-kern.md`](research/2026-10-13-beweis1-kern.md) (Nachtrag am Ende). Editor-Tab „kern“ (`?versuch=kern&wesen=kugel|rex|langhals|ueberhang`, `&look=earle&palette=…`), Bilder `docs/progress/editor/kern-*.png`.

**Zahlen (Seite, px bei 461 px je Kachel):** Kugel 0,28 · Rex 0,33 (Ziel ≤ 0,5 ✓, Spitzen-Kappe) · Langhals 0,97 (Ringe nach Krümmung) · Ente 1,21 · Kasten-Kugel: Front 0,7 px und Längsfalten mit 93° Knick aus den Front-Ecken · Zugschritt ≈ 3 ms · Ableitung ≈ 90–140 ms. Breite nach der Projektionsregel (Top bei x, Front bei jeder Höhe, Poisson entfällt), Querschnitte aus Front-Lappen bzw. Spanten. **Beweis 4 begonnen:** Earle-Material live auf dem Kern-Netz (Paletten, Zonen, Schlitzaugen mit Blinzeln); Tiger-Kopf-Vergleich steht aus.

**Ehrlich offen:** Widersprüche zwischen Front und Top entscheidet der Kern still für die kleinere Breite (Rex Front 11 px, Langhals Top 16 px daneben; die Vorlagen sind so gezeichnet) und zeigt es nicht an (Saum/Δ nach Plan 9.8, Reifen). Überhang-Ente als Form nur mit Teilen. Hals-Übergang (liegender Rumpf gegen stehenden Hals) ohne Überblendung. Reifen nur über das Dokumentfeld `spanten`, kein Griff im 3D. Kein Worker, dichte LU.

**Kern des Plans (Kurzfassung in Abschnitt 0 des Plans):**
- Ein **Subdivision-Käfig** (Spiegelung, halbscharfe Falten) ist die einzige Wahrheit je Wesen. Florians Kurven (Seitenumriss, Spanten als Reifen, Kantenlinien, Wirbelsäule, Maullinie) sind **Griffe** auf diesem Körper; einmal ableiten, dann nur noch bearbeiten.
- Bausteine mit Automatik: Maul überall am Kopf (Längsschleife einrasten, Tasche, Kiefer-Rig, Fressen = Knochen + Körper-Blendshape), Zähne, drei Augenarten mit sechs Zuständen, Teile aus einer Bibliothek (verschmolzen oder angesteckt), Klingen (Fell, Mähnen, Kämme, Federn, Flossen, Flügelhaut), Zonen als Vektorformen im Ptex-Atlas, Stile fest/Jelly/Fell/Feuer/Gas, Posen als Käfig-Deltas, Export ins Spiel.
- Earle-Look (`packages/render/src/creature2`) von der ersten Sekunde an; eine Szene mit vier Kameras statt SVG-Editoren.
- UI (Abschnitt 9): Stamm mit neun Stufen, Bühne + drei Blätter (Layouts „Riss“ und „Bühne“), Tafel rechts, Glas-Dock; Ranken, Lupe mit Ringtext (drei Rollen), Reifen, Kieferknopf, Fächer; Illustrator in den Blättern, Blender auf der Bühne; neutrale Bühne (Papier/Nacht/Brett).
- Plattform: Electron **und** Browser, eine Codebasis, Rechenkern in Workern/Compute.

**Nächster Schritt: Phase 0 fortsetzen** (Plan 11.1):
1. ~~Kern-Tempo und Treue~~ bestanden. Rest: Überhang als Teil (→ 3), Reifen als Griffe, Hals-Übergang, Worker, dünn besetzte Zerlegung.
2. **Maul mit Haps** (vorn, unten, Hals; Längsschleife einrasten, Schlitz, Tasche, Kiefer, 0 Durchdringungen, Bohne, Umbau ≤ 200 ms; Vergleich `rex_mouth_detail`). **Jetzt dran.**
3. Teil nahtlos (Rex-Säulenbein verschmolzen und angesteckt, ±35°).
4. ~~Look live~~ Material läuft; fehlt: Zonen-Atlas, Zahnverlauf, Vergleichsbild Tiger-Kopf (Kastenschnauze über Spanten).
5. Feuer, Gas, Fell-Blob (Stufe 7 des Bogens, Standbild und 3-s-Schleife).

Scheitert 1 oder 2, wird nicht breit gebaut (Rückfälle in Plan 13).

## Stand je Bereich

| Bereich | Stand |
|---|---|
| **Plan** | freigegeben; Bestandsaufnahmen (Code, Look, Recherchen, Spiel-Pipeline) und UI-Entwurf sind eingearbeitet |
| **Editor-Gerüst** | bleibt: Layout mit Federn, `ansicht2d`, Blender-Navigation, `Renderer3D` (jetzt mit Earle-Material und `@ee/render`), Electron, Bibliothek, Undo, Tastatur, E2E-Muster |
| **Bauwege** (`packages/shape/src/versuch/`, Editor-Tabs creation/wirbelsäule/schnitte/rund) | Versuche, Wissen; werden nach dem Entscheidungstest entfernt. Vorher herauslösen: Poisson/CDT (`aufblasen.ts`, `dreiecke2d.ts`), `vereinigeNetze`, Surface Nets/Taubin/Felzenszwalb (`schnittLoft.ts`), `strahlRaster`, Kiefer-Mathe (`kiefer.ts`), Zahnmodell (`zaehne.ts`), Prüfstand (`umriss3d.ts`, `pruefen.ts`, Vorlagen) |
| **Kern (neu)** | `packages/shape/src/{kaefig,subdivision,loeser,kern}/` (`@ee/shape/kern`): Halbkanten-Käfig, Catmull-Clark als Matrix mit Falten (Orakel-gleich), Grenzflächen-Maske, LU-Löser mit Ausgleich, Röhre mit Kappen, Ableitung aus Seitenumriss + Silhouettenbreiten + Querschnitten (Front-Lappen/Spanten, Längsfalten), Griff Seitenumriss, Deskriptoren fürs Material; Tests `beweis1`, `varianten`, `diagnose`, `querschnitt` |
| **Look** | `creature2` im Editor-Tab „kern“ eingebunden (`apps/editor/src/three/wesenLook.ts`, `Renderer3D.setzeWesen`); fehlen Zonen-Atlas, Feuer, Gas, Fell-Klingen, Augen-Zustände X/Sichel/Spirale |
| **Spiel** | Brett zeichnet Prototyp-Körper; kein Editor-Wesen, keine Morph-Ziele; Weg in Plan 10 |

Zum Branch: `claude/editor-grundlayout`, gepusht. Nicht von uns: `assets/fonts/Hippie Movement.otf` (unverfolgt, nicht committen).

## Prüfen

- `pnpm typecheck`, `pnpm test`, `pnpm lint` (Kern allein: `npx vitest run src/kern --reporter=verbose --silent=false` in `packages/shape`)
- E2E mit echter GPU: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e`
- Editor: `pnpm editor`, Web-Modus `editor-web` (Port 5180); Bilder: Web-Modus auf 5192 starten, `EDITOR_URL=http://localhost:5192 node apps/editor/scripts/kern-bilder.mjs`
