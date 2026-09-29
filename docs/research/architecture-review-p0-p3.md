# Architektur-Review und Umsetzungsdesign P0–P3 (Agent-Report, 2026-09-29)

> Roh-Report eines Recherche-Agenten. Sprache: Englisch. Aussagen mit *(unverified)* sind nicht belegt. Kondensierte Fassung: `docs/RESEARCH.md`.

I now have everything needed: the full plan, the empty repo state, the local toolchain (Node 25.8, npm 11, `gh` 2.97, Playwright 1.63 available via npx, **no pnpm, no corepack**), and current facts on the three load-bearing dependencies (three.js is at r186 as of 2026-09-08; Rapier 0.36 soft bodies shipped 2026-09-24; WebGPU is default in iOS 26 WKWebView). Below is the critique and design.

---

## 1. Critique of the plan

**Contradictions**

- **§5 vs §8 (blob rendering)**: §5 "Render-Strategie" declares the jiggle mesh the standard and raymarching only for the ~300 ms merge; §8 "Rendering-Rezepte" declares "SDF-Raymarching pro Figur … ≤32 Schritte" the recipe. P1 is supposed to decide this. Mark §8 as "candidate (a), pending P1". Note that candidate (b) needs (a) anyway for the merge blend, so (a) must be built first regardless.
- **§8 Physik vs §8 Absicherung**: the escape hatch to Expo/react-native-wgpu requires "Physik bleibt in TypeScript", yet Rapier (WASM) is the primary choice. Make the TS shape-matching/jiggle driver the default and Rapier a P1 experiment behind an interface.
- **§8 Backend (Firebase) vs §10 ("später Supabase")** for content storage. Pick one; irrelevant before Phase 2.
- **§2 "keine Post-Kette" vs §13b `packages/render … Post`**. Drop "Post".
- **§11 P3 vs §6/§7**: P3 lists "Sprengspore" (does not exist in §6; the spore is a collect goal) and "Kruste" (introduced at level 41, Syrup), while the sequence (§13b step 5) pairs P3 with the Tjorizo generator. P3 should implement exactly the Tjorizo set: Pfeiler, Schrott, Spore, Amöbe, Kappe/Aufbruch, Verdorrt, Strahl-Blob, plus Fossilwand/Käfig since they shape the data model.

**Factual/version issues**

- §8: "seit r160 (Feb 2026)" is wrong; r160 was Dec 2023. Current is r186 (2026-09-08), which adds `SunLight` with cascaded shadows and `compileComputeAsync()`. Pin `three@0.186.0`; TSL APIs still move between releases, so pin exactly and upgrade deliberately.
- Rapier 0.36 soft bodies are 5 days old (confirmed). Treat as experiment, not dependency.
- Node 25 is non-LTS and no longer bundles corepack; pnpm is not installed. CI should pin Node 24 LTS; local bootstrap needs `npm i -g pnpm`.

**Unrealistic assumptions**

- **§11 P0/P1 acceptance on iPhone Safari over LAN**: WebGPU requires a secure context. `http://192.168.x.x:5173` silently falls back to WebGL2, so P1's "36 Blobs bei 60 fps" would measure the wrong backend. Fix: HTTPS dev server (`@vitejs/plugin-basic-ssl`) and a backend badge in the FPS overlay. Also Safari ≠ WKWebView (different process limits); label P1 numbers "preliminary until P6".
- **§7/§10 "Bot ersetzt Testteam"**: a bot yields win probability under its own policy, not human attempts. The plan lacks the mapping. Need 2–3 bot skill levels and a fitted mapping against Nicole's data; until then, report bands, not absolutes.
- **§14 Playwright screenshot comparison in CI**: GitHub runners have no GPU; SwiftShader renders raymarching at seconds per frame and pixel output differs from Metal. CI screenshots must be smoke-level (small canvas, WebGL2, loose perceptual threshold); golden comparisons run locally on the Mac.
- **§6 Strahl-Blob at "2 Verschmelzungen in einem Wisch"**: in 2048 two merges per swipe is routine, so specials would flood the board. Make thresholds data-driven per level and let the solver report special frequency before fixing the rule.
- **§2 KTX2/meshopt** in Phase 0 is overengineering; the only textures are a palette atlas and 64² face SDFs.

**Missing pieces** (all needed before P3 is "spielbar")

- Phase order within a move (slide → merges → side effects → currents/threats → graduation → spawn → goal check); portal/current/oil edge cases (occupied exit, chained currents); whether Amöbe+Amöbe merges; whether frozen/caged blobs block lanes (they should act as pillars).
- Spawn placement when all source-adjacent cells are full (proposed: `spawn.fallback: 'none' | 'anyEmpty'`), and the loss condition as "no swipe changes the board", not "board full".
- Preview + rewind interaction: the next spawn must be pre-drawn and stored in the snapshot, and rewind must not reroll it.
- Input policy during animation (proposed: accept input after the slide phase, queue depth 1; slide 140 ms, merge blend 300 ms overlapping).
- Score formula, `schemaVersion` on all content, stable blob IDs for animation, invariant `cap ≥ goal.tier`.

**Sequencing**: §13b puts P1 (highest uncertainty, needs designer feedback) before P3 (zero rendering dependency, fully machine-verifiable). Run P3-core in parallel with P1, and define the `MoveEvent` contract *before* P1, since the merge animation consumes it.

---

## 2. Implementation design

### P0 scaffold

```
pnpm-workspace.yaml     packages: [packages/*, apps/*, tools/*]
packages/core     @ee/core     rules, RNG, solver, level zod schema; zero deps
packages/genome   @ee/genome   genome eval → BlobParams, SdfProgram (CPU eval); deps: core
packages/physics  @ee/physics  SquashDriver: SpringJiggle, ShapeMatching (TS); optional peer rapier3d-compat
packages/world    @ee/world    chunk generator → typed arrays (heights, instance transforms); deps: core
packages/render   @ee/render   three/webgpu + three/tsl: blob materials, SdfProgram→TSL compiler, Earle material, shadow filter, instancing helpers
apps/game                      Vite 7 + React 19 + react-router; routes /play, /lab/{blob,earle,grid}, /editor/{levels,creatures,map}
content/{levels,zones,genome,rex}
tools/levels/{generate,calibrate}.ts   (tsx, worker_threads)
```

- Tooling: TS 5.x `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`; vitest workspace (one project per package, `bench` for solver); Playwright in `apps/game/e2e`; ESLint 9 flat + typescript-eslint + react-hooks; Prettier. Vite: `resolve.dedupe: ['three']`, `server.host: true`, basic-ssl, `?backend=webgl` query → `new WebGPURenderer({ forceWebGL: true })` for A/B.
- **Canvas/React state**: one `WebGPURenderer` created once in `<CanvasHost>` (`await renderer.init()`, `setAnimationLoop`, `ResizeObserver`). Routes provide a `SceneController { mount(ctx), update(dt), dispose() }` so labs swap scenes without recreating the renderer. State: zustand vanilla `createStore` (`gameStore`: `LevelState` snapshot, `phase`, HUD-derived values); React subscribes via `useStore(selector)`, the render loop reads `getState()` and `subscribe`s to slices. One-shot messages go over a typed `mitt` bus: `move(result)`, `animationDone`, `ui/*`. Rules: render never imports React; React never touches three objects; `GameSession` (app layer) orchestrates input → `core.applyMove` → store + bus → renderer timeline → `animationDone` → terminal check.
- **Content endpoint**: Vite plugin `contentApi()` active only in `serve`: `GET /__content/:dir`, `GET/PUT /__content/:dir/:file.json`. PUT: resolve path, reject unless inside `<repo>/content/<dir>` and `.json`; parse; zod-validate with the schema for `dir`; write atomically (tmp + rename), stable key order, 2-space; 400 with zod issues on failure. Vite's JSON HMR reloads the game. In production builds editors fall back to download/Share-Sheet + localStorage drafts. Game loads content via `import.meta.glob('/content/levels/*.json', { eager: true })`.
- **Deploy**: `.github/workflows/web.yml` on push to main: `pnpm/action-setup`, `setup-node@24` with pnpm cache, `install --frozen-lockfile`, `-r typecheck`, `-r test`, `--filter game build` with `VITE_BASE=/early-earle/`, `upload-pages-artifact` + `deploy-pages`. Separate jobs: `e2e` (Playwright Chromium, WebGL2 smoke), later `calibrate`.

### P3 core rules engine (`packages/core`)

**Model** (types mirrored by zod):

- `LevelDef`: `id, zone, schemaVersion, grid{w,h,mask: string[]}` (`.` cell, `#` rift/void, `P` pillar), `fences[{a,b}]` (edge between adjacent cells), `floors[{at, kind: oil|current|withered|deepWithered|spore|portal, dir?, portalId?}]`, `blockers[{at, kind: scrap|scrapMound|crust|sleeper|cage|fog, layers?, size?, content?}]`, `threats[{at, kind: rot|toxic|stray, period?}]`, `start[{at, blob}]`, `spawn{sources[], table[{tier,weight,kind?}], preview, fallback}`, `goals[]` (discriminated union: `reachTier|release|heal|collectSpores|rescue|clearScrap|deliver|score`), `moves`, `cap`, `specials{lineAt,burstAt}`, `difficulty{targetAttempts:[min,max]}`.
- `Blob { id, tier, material, kind: normal|amoeba|line|burst|stray, frozen?, sleeper?, caged?, hidden? }`; IDs monotonically increasing per level, never reused (renderer keys on them).
- `LevelState`: `cells: (Blob|null)[]` (w·h), blocker/floor layers, `movesLeft`, `score`, `rng: number` (32-bit state), `spawnQueue` (pre-drawn, for preview + rewind), `goalProgress`, `blobSeq`. Immutable API for the game (`applyMove(state, dir) → MoveResult | null`); rewind = keep snapshots (36 cells, trivial).
- **RNG**: `mulberry32` as a pure `(state) → [u32, state]`; `seed = hash32(levelId, attempt)`. Solver never uses RNG; it enumerates chance nodes.

**Algorithm** (`applyMove`): precompute per direction the lane segments (rows/columns split at void/pillar/fence). Use *per-blob stepping* rather than array compression so modifiers compose: for each segment, from the wall side, each blob steps forward while the next cell is empty and unfenced; **oil** stops it (liquid ignores); **gas** may pass over void/fence but not stop there; **portal**: stepping onto A teleports to B and continues, blocked if B is occupied; frozen/caged/sleeper blobs never move and act as pillars. After stepping, merge with the settled blob ahead if tiers equal or either is `amoeba` (Amöbe+Amöbe → tier 2), neither merged this move. If no blob moved or merged → return `null` (no move consumed).

Phase order, each emitting events with a `phase` index:
1. `slide{id,from,to,path}`, `merge{ids,at,tier,resultId}`
2. Merge side effects at landing cell L: heal (deep → withered → healed), collect spore; 4-neighbours: scrap −1 layer, crust thaws, sleeper wakes, cage −1/opens, fog reveals, rot marked immune; fire merges burn adjacent crust/rot.
3. Specials: `mergeCount ≥ burstAt` → last result becomes `burst`; `≥ lineAt` → `line` (axis = swipe axis). Specials fire when they next merge (`special{kind,at,cells}`); both special → combo table.
4. Dynamics: currents push one cell (downstream-first, no merging), stray moves, rot grows every `period`, toxic countdown.
5. Graduation: `tier ≥ cap` → `release`; two in one move → `tierBomb`.
6. Spawn: pop `spawnQueue[0]`, place at a random empty source-adjacent cell (or `fallback`), draw the next into the queue.
7. Goals/score, `movesLeft−−`, win if all goals met, lose if `movesLeft = 0` or no direction changes the board.

The renderer builds a timeline from phases: slides parallel (140 ms), merges smooth-min (300 ms) starting at slide end, side effects and spawn pop after.

**Solver/bot**: hot path on `Uint8Array` tiers + flags with preallocated scratch (target ≥ 200k moves/s/thread; a 36-cell step is ~1 µs). Expectimax: 4 actions × chance nodes (spawn cell × tier; sources keep branching ≤ ~8×3). Heuristic: goal-progress term per goal type (e.g. `maxTier`, layers removed, cells healed, spores), empty cells, monotonicity/smoothness, merge potential adjacent to blockers, penalties for oil/fragmentation, progress-per-remaining-move. Skill levels: `novice` = depth 1, noisy weights, 15 % random; `average` = depth 2 with sampled chance nodes (k = 4); `strong` = depth 3 + Zobrist transposition table. Budget: 100 levels × 2 bots × ≤200 seeds × 30 moves × 256 evals ≈ 3×10⁸ evals ≈ 5 min single-thread; with 4 `worker_threads` and sequential stopping (stop a level once its Wilson interval is < ±0.05, typically ~80 seeds) ≈ 1–2 min in CI. Cache results keyed by `hash(levelJSON, solverVersion)`. Outputs per level: `p_win` per bot, `attempts_est = 1/p_avg`, special frequency, mean moves used; CI fails on unsolvable (0/200 for `strong`) or out-of-band levels.

### P1 blob rendering (`packages/render`, `genome`, `physics`)

**Shared parameter block** `BlobParams` (per-instance attributes or a `uniformArray` struct): `spheres[8]: vec4(center, r), sphereCount, sminK, noiseAmp, noiseFreq, breathHz, squash: vec4(axis, amount), morph, baseColor, innerColor, rimColor, gloss, translucency, bubbleDensity, materialKind`. `@ee/genome` produces `Genome → SdfProgram → BlobParams`; the same `SdfProgram` is evaluated on CPU (sockets, physics particles) and compiled to TSL by `render/sdf/compileSdf.ts`, so shape is defined once.

**(a) Raymarched**: `InstancedMesh` of unit boxes (real depth via `depthNode`, so blobs sit on the plate). Vertex passes local-space ray origin/direction (camera transformed by inverse instance matrix). Fragment `Fn`: `p` → inverse volume-preserving squash → `smin` over spheres → `mx_fractal_noise_float(p·freq + t·breath)·amp`; sphere-trace `Loop(32)` with `Break` on hit/exit, `Discard` on miss; 4-tap normal; wrap diffuse, Blinn spec, Fresnel rim; inner "organs": ≤ 8-step second march along the refracted view ray through an inner SDF accumulating Beer–Lambert tint (`innerColor`, `translucency`); bubbles as hashed-grid micro-spheres tested in that inner march. `MeshBasicNodeMaterial`, opaque, `depthWrite`.

**(b) Jiggle mesh**: shared icosphere (~400 verts); vertex node sphere-traces each vertex along its normal onto the *same* SDF (≤ 6 steps) so both candidates share shape; jiggle = 2–3 damped low-frequency modes from impulses + `squash`; shading as (a) minus the inner march (view-dependent inner gradient instead); face = 64² R8 SDF glyphs, `smoothstep(0.5 ± fwidth)`, projected via the eye socket frame. Merge switches to (a) for the blend window.

**Merge sequence** (`MergeTimeline`, driven by `merge` events): 0–300 ms: A's instance box grows to cover both, its sphere list = A ∪ B (B's centres lerp toward A), `sminK` ramps by the viscosity curve, B hidden, 4–8 droplet spheres flung and re-absorbed (they are just extra spheres); 300–450 ms: `morph` 0→1 crossfades sphere set + palette to the child genome with a squash pop; then (b) fades back in if it is the runtime candidate.

**Physics**: `SquashDriver { impulse(id, dir, strength); step(dt) → {axis, amount, offset}[] }`. Default `SpringJiggle` (3 damped springs/blob, stiffness from genome viscosity). `ShapeMatching` fallback: 12–20 particles per blob, Müller shape matching (centroid + polar-decomposed rotation, stiffness α, volume constraint), ellipsoid fit → squash axis/amount; ~O(20)/blob/substep. `RapierSoft` experiment: one shape-matching cluster per blob pinned to a kinematic frame at the cell. Grid coupling: `slide` events → velocity impulse; stop → counter-impulse; wall/pillar stop → 2×.

**Cost check**: 36 blobs × ~150² px × DPR 2 ≈ 3.2 M fragments × ~12 average steps × 8 spheres ≈ 0.3 G SDF evals/frame; borderline on iPhone 12-class, plausible with tight boxes and early exit. That is exactly why (b) exists; measure both.

### P2 Earle map slice (`packages/world`, `render`)

- **Geometry**: spherical cap patch (R ≈ 40, ~40° arc, 96² grid) with radial displacement from 2-octave low-frequency fbm (no ridges); this avoids bending math now, and the real cube-sphere/quadtree comes in P5.
- **Material**: `class EarleMaterial extends NodeMaterial` with `lights = true` and a custom `LightingModel.direct()`: `lit = min(aaStep(NdotL), shadow)` where `shadow` arrives in `lightColor`; quantise to 3–4 bands; colour from a nearest-filter palette atlas `(inkIndex + band, zoneRow)`; stepped fog by `floor(dist/step)` from the atlas fog row. No ambient, no specular.
- **Shadow filter**: `light.shadow.filterNode = Fn(({depthTexture, shadowCoord}) => smoothstep(0.5 − w, 0.5 + w, texture(depthTexture, shadowCoord.xy).compare(shadowCoord.z)))` with `w` from the texel footprint (`fwidth(shadowCoord.xy · mapSize)`). Verify the `filterNode` hook name against r186 (`ShadowNode`); avoid `SunLight` CSM, which fights the hard-edge look. Sun is a child of the camera (elevation 10°, azimuth 70°) so shadows stay horizontal while the planet rotates; shadow camera fitted to the chunk bounds + `h_max/tan θ`; `shadow.autoUpdate = false`, `needsUpdate` only while rotating or when growth changes. Casters: terrain + canopy primitives only.
- **Vegetation**: `InstancedMesh` per canopy primitive (cone, ellipsoid, stacked cones) with per-instance hull centre → `normal = normalize(worldPos − hullCentre)`; hex dots: one `InstancedMesh` of a 6-vertex billboard, 60–200 per tree, Poisson positions on the hull biased to the sun side (procedural now, Blender-baked later), tint by `dot(N_hull, L)`, vertex-collapse when < 0.75 px; trunks: instanced thin quads in ink. Sky dome with banded ramp and flat sun disc; 3–5 fog stripe planes slowly scrolling.
- **Camera/drag**: fixed camera, `fov 70`, planet centre below screen centre; pointer delta → angular velocity about camera right/up axes applied to `planet.quaternion`; inertia `ω ·= exp(−dt/τ)`, τ ≈ 0.4 s.
- **Growth** (0–1 uniform + per chunk): instances sorted by priority so `mesh.count = floor(growth·N)`; scale `mix(0.3, 1, growth)`; palette row blend toward the withered ramp; dot density.

### Schemas (zod field lists)

`LevelSchema`: `schemaVersion: literal(1); id: string; zone: enum; name?; grid: {w: 3..8, h: 3..8, mask: string[] (h rows of w chars in [.#P])}; fences: {a:[x,y], b:[x,y]}[] (adjacent); floors: discriminatedUnion(kind)[]; blockers: discriminatedUnion(kind)[] (scrap layers 1..3, scrapMound size [2,2] layers 4..8); threats[]; start: {at, blob:{tier, material?, kind?}}[]; spawn: {sources: [x,y][], table: {tier 1..3, weight > 0, kind?}[], preview: boolean, fallback: enum}; goals: discriminatedUnion(type)[] (min 1); moves: int 1..99; cap: int 3..12; specials: {lineAt, burstAt}; difficulty: {targetAttempts: [number, number], style?: enum}`. `.superRefine`: all `at` inside mask `.` cells, `cap ≥ reachTier goal`, portals paired, sources non-void, ≤ 4 element kinds.

`GenomeRulesSchema`: `schemaVersion; zones: record(zoneId, { palette: {base, inner, gloss, bubble, ink}[] (per tier ramp, hex), materialThresholds: {fromTier, material}[], body: {sphereCount:[min,max], elongation, lobes, viscosity, breathHz} ranges, assetUnlocks: {tier, slot, assetId, inherit: boolean}[], sockets: {slot, theta, phi, normalAlign}[] }); assets: {id, file, slot, scale:[min,max], tintable}[]; compat: {slot, forbids: slot[]}[]; personality: {idleTempo, skittish, curiosity, squashHardness} ranges; inheritance: {mergeRule: enum}`.

---

## 3. Verification per prototype

- **P0**: `pnpm -r typecheck && test` green; Playwright smoke opens `/play`, `/lab/blob`, `/lab/earle`, `/lab/grid`, `/editor/levels`, asserts a canvas and no console errors; iPhone Safari over HTTPS LAN shows the badge `WebGPU`; PUT to `/__content/levels/000.json` with an invalid body returns 400, valid body lands in `content/` and hot-reloads; Pages deploy URL loads. Pass = all of the above.
- **P3**: vitest table tests for every element (given board + direction → expected board + events), property tests (blob count conservation: `before = after + 2·merges − spawns`, determinism: same seed → same trace, `applyMove` returns null iff nothing changes); solver bench ≥ 150k moves/s; 10 Tjorizo levels playable in `/lab/grid` with keyboard and swipe; calibration report with `p_win` per bot and special frequency; pass = all 10 solvable by `strong`, tutorial levels `p_novice ≥ 0.9`, and no level has line specials on > 40 % of swipes.
- **P1**: `/lab/blob` with side-by-side (a)/(b), 1/9/36 blobs, seeded genome; FPS/backend overlay; screenshots at 1, 9, 36 into `docs/progress/`; measure frame time p50/p99 on the Mac (both backends) and iPhone Safari (HTTPS); merge sequence recorded as a frame strip (0/100/200/300/450 ms). Pass = 36 blobs ≥ 60 fps on Mac at DPR 2 for at least one candidate, and Florian picks a candidate.
- **P2**: `/lab/earle` next to reference images; screenshot at growth 0/0.5/1 and three rotations; verify zero visible stair-stepping on shadow edges at 2048 map, ≤ 100 draw calls (renderer.info), shadow pass skipped when idle. Pass = Florian recognises Earle + his draft; 60 fps on Mac, ≥ 40 fps iPhone Safari.

## 4. Sequencing (first session, hours for a strong agent)

1. P0 scaffold, CanvasHost, routes, store/bus, content endpoint, CI/Pages — **3–4 h**. Feedback point: none (agent verifies).
2. P3 core types + zod + RNG + `applyMove` with tests for the Tjorizo set — **4–5 h**; `/lab/grid` minimal renderer (flat boxes, no blobs) — **2 h**. Feedback point: Florian/Nicole play 5 levels for feel (input timing, specials frequency).
3. Solver + calibration tool + 10 generated Tjorizo levels — **4 h**. Feedback: Nicole's attempts vs bot estimate.
4. P1 candidate (a) raymarched material + `BlobParams` + genome stub + SpringJiggle — **5–6 h**; merge timeline — **2 h**; candidate (b) — **3 h**; Rapier experiment — **2 h**. **Feedback point (major)**: Florian compares (a)/(b) against Screenshot 3 and picks; iterate palette/inner shapes 1–2 rounds.
5. P2 Earle slice: terrain + material + shadow filter — **4 h**; vegetation instancing + sky/fog + drag/growth — **3–4 h**. **Feedback point (major)**: Florian judges shadow shape, band count, palette; iterate.
6. Wire P1 blobs into `/lab/grid` (real merge events driving the material) — **2 h**. Feedback: first "real" level play.

Total ≈ 40–45 h; steps 2–3 and 4 can be interleaved so the agent progresses on P3 while waiting on P1 feedback.

Sources: [three.js releases](https://github.com/mrdoob/three.js/releases), [What's New in Three.js 2026](https://www.utsubo.com/blog/threejs-2026-what-changed), [Rapier soft bodies blog (2026-09-25)](https://dimforge.com/blog/2026/09/25/advanced-soft-bodies-for-games-in-the-rapier-physics-engine/), [Rapier JS soft-bodies guide](https://rapier.rs/docs/user_guides/javascript/soft_bodies/), [WebGPU in WKWebView (Apple forums)](https://developer.apple.com/forums/thread/770862).

### Critical Files for Implementation
- /Users/bsw/Projekte/playground/early-earle/packages/core/src/engine/applyMove.ts — slide/merge phases, event generation, the contract every other package depends on
- /Users/bsw/Projekte/playground/early-earle/packages/core/src/schema/level.ts — zod `LevelSchema` shared by editor, generator, solver and content endpoint
- /Users/bsw/Projekte/playground/early-earle/packages/core/src/solver/expectimax.ts — bot skill levels, heuristics, calibration output
- /Users/bsw/Projekte/playground/early-earle/packages/render/src/blob/blobMaterial.ts — TSL raymarch/mesh candidates sharing `BlobParams` and the merge blend
- /Users/bsw/Projekte/playground/early-earle/apps/game/vite.config.ts — HTTPS dev server, `contentApi()` plugin, three dedupe, base path for Pages
