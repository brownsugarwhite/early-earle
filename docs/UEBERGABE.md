# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-13 abends. Florian hat die Versuchsphase am Wesen-Editor (11.–13.10.) als „sehr durchwachsen“ bewertet und den **Plan „Wesen-Editor 2“** freigegeben: [`docs/plans/2026-10-13-wesen-editor-2.md`](plans/2026-10-13-wesen-editor-2.md).

**Kern des Plans (Kurzfassung in Abschnitt 0 des Plans):**
- Ein **Subdivision-Käfig** (Spiegelung, halbscharfe Falten) ist die einzige Wahrheit je Wesen. Florians Kurven (Seitenumriss, Spanten als Reifen, Kantenlinien, Wirbelsäule, Maullinie) sind **Griffe** auf diesem Körper; einmal ableiten (Umriss → Poisson-Aufblasen → Ringe), dann nur noch bearbeiten.
- Bausteine mit Automatik: Maul überall am Kopf (Längsschleife einrasten, Tasche, Kiefer-Rig, Fressen = Knochen + Körper-Blendshape), Zähne, drei Augenarten mit sechs Zuständen, Teile aus einer Bibliothek (verschmolzen oder angesteckt), Klingen (Fell, Mähnen, Kämme, Federn, Flossen, Flügelhaut), Zonen als Vektorformen im Ptex-Atlas, Stile fest/Jelly/Fell/Feuer/Gas, Posen als Käfig-Deltas, Export ins Spiel.
- Earle-Look (`packages/render/src/creature2`) von der ersten Sekunde an; eine Szene mit vier Kameras statt SVG-Editoren.
- UI (Abschnitt 9): Stamm mit neun Stufen, Bühne + drei Blätter (Layouts „Riss“ und „Bühne“), Tafel rechts, Glas-Dock; Ranken, Lupe mit Ringtext (drei Rollen), Reifen, Kieferknopf, Fächer; Illustrator in den Blättern, Blender auf der Bühne; neutrale Bühne (Papier/Nacht/Brett).
- Plattform: Electron **und** Browser, eine Codebasis, Rechenkern in Workern/Compute.

**Nächster Schritt: Phase 0, fünf Beweise mit harten Kriterien** (Plan 11.1), Reihenfolge 1 und 4 zuerst:
1. Kern-Tempo und Treue (Käfig, Matrix-Subdivision Stufe 3 im Worker, Seitenumriss als Griff mit Grenzflächen-Interpolation; Kugel/Rex ≤ 0,5 px, Zugschritt ≤ 5 ms Käfig / ≤ 16 ms fein, Überhang-Ente ≤ 2 px).
2. Maul mit Haps (vorn, unten, Hals; 0 Durchdringungen, Bohne, ≤ 200 ms).
3. Teil nahtlos (Rex-Säulenbein verschmolzen und angesteckt, ±35°).
4. Look live (`createCreatureMaterial` auf dem neuen Netz, Zonen-Atlas, Tiger-Streifen, gemaltes Auge, Zahnverlauf; Vergleichsbild Tiger-Kopf).
5. Feuer, Gas, Fell-Blob (Stufe 7 des Bogens, Standbild und 3-s-Schleife).

Scheitert 1 oder 2, wird nicht breit gebaut (Rückfälle in Plan 13).

## Stand je Bereich

| Bereich | Stand |
|---|---|
| **Plan** | freigegeben; Bestandsaufnahmen (Code, Look, Recherchen, Spiel-Pipeline) und UI-Entwurf sind eingearbeitet |
| **Editor-Gerüst** | bleibt: Layout mit Federn, `ansicht2d`, Blender-Navigation, `Renderer3D`, Electron, Bibliothek, Undo, Tastatur, E2E-Muster |
| **Bauwege** (`packages/shape/src/versuch/`, Editor-Tabs creation/wirbelsäule/schnitte/rund) | Versuche, Wissen; werden nach dem Entscheidungstest entfernt. Vorher herauslösen: Poisson/CDT (`aufblasen.ts`, `dreiecke2d.ts`), `vereinigeNetze`, Surface Nets/Taubin/Felzenszwalb (`schnittLoft.ts`), `strahlRaster`, Kiefer-Mathe (`kiefer.ts`), Zahnmodell (`zaehne.ts`), Prüfstand (`umriss3d.ts`, `pruefen.ts`, Vorlagen) |
| **Catmull-Clark** | `versuch/catmullClark.ts` ist Spezifikation und Orakel; Neubau als Halbkanten auf Typed Arrays mit Matrix und Grenzflächen-Masken |
| **Look** | `creature2` vorhanden (Material, Muster, Zonen, Jelly, Augen, Zähne); im Editor noch nicht eingebunden; fehlen Feuer, Gas, Fell-Klingen, Augen-Zustände X/Sichel/Spirale |
| **Spiel** | Brett zeichnet Prototyp-Körper; kein Editor-Wesen, keine Morph-Ziele; Weg in Plan 10 |

Zum Branch: `claude/editor-grundlayout`, gepusht. Nicht von uns: `assets/fonts/Hippie Movement.otf` (unverfolgt, nicht committen).

## Prüfen

- `pnpm typecheck`, `pnpm test`, `pnpm lint`
- E2E mit echter GPU: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e`
- Editor: `pnpm editor`, Web-Modus `editor-web` (Port 5180)
