# Blob-Materialien v2 — API (P1b)

Owner: P1b agent (`packages/render/src/blob/**`, `packages/render/src/materials/**`). Consumers: the
creature rig/pool (Creatures v2), the flow (`LevelBoard`, `Hero`), the blob lab. Everything here renders
**without outlines** (STYLE.md §3): edges come from value steps, patterns are ornament *inside* the body.

```
BlobParamBlock ──► createRaymarchBlobMesh   (candidate a, hero / close-ups)
   (main + style ├─► createJiggleBlobMesh     (candidate b, boards, 36 creatures)
    uniform      ├─► createFurShellMesh       (fur shells, Hoch preset)
    buffers)     ├─► createFeatherCardMesh    (feather cards, Hoch preset)
                 └─► createBlobParticleMesh   (gas wisps · fire embers · liquid drips)
```

All five meshes read the **same** `BlobParamBlock` (one slot per creature body): write a slot once per
frame, every pass follows it (shape, squash, jiggle, ripple, material, pattern). Each is **one draw call**.

## 1. Material kinds

```ts
type BlobMaterialKind = MaterialKind | 'fur' | 'feather';        // 'jelly' | 'liquid' | 'gas' | 'fire' | 'fur' | 'feather'
BLOB_MATERIAL_KIND_ID = { jelly: 0, liquid: 1, gas: 2, fire: 3, fur: 4, feather: 5 };  // MISC.w on the GPU
BLOB_MATERIAL_KINDS, BLOB_MATERIAL_LABELS                         // UI lists ("Fell", "Federn", …)
```

`@ee/genome`'s `MaterialKind` (jelly/liquid/gas/fire) is untouched; fur and feather live here until the
genome adopts them. Set the kind either on the params (`BlobRenderParams.material`) or per frame via
`BlobDynamics.material` (overrides a plain genome `BlobParams`). Kinds are integers per instance — every
shader branches coherently on them, so a blob pays only for its own look.

| kind | look (both candidates) | extra pass (Hoch) | Mobil preset |
|---|---|---|---|
| jelly | banded wrap light, organs, bubbles, arc highlight, damped ripple rings | – | same |
| liquid | flatter light, wet highlight, **meniscus band** at the floor, **posterised ripple rings** + foam dots | drips (particles) | same |
| gas | **a small fog creature** (Ebene_19/20/25): a calm pale body with 2–3 long, thin, soft-edged white horizontal bands sliding slowly sideways; the **outline itself is eroded** by two-scale noise that breathes, peels more at the crown and the wind side, thin areas see-through — alpha in (a), **alpha-to-coverage dither** in (b) (MSAA, one opaque draw) | long thin white fog streaks peel off the upper surface and drift with the wind (particles, dithered ends) | same |
| fire | **flame crown** (5 swaying tongues + ridged noise in the SDF), 4 hard bands core→crimson tips, cream heart, no glow | embers (particles) | same |
| fur | single pass: a dark mass with **hair strokes combed along a flow field** (from the head/eye direction backwards and down the sides), clumped into locks, lit tips on the light side, lighter belly/chest; the coat/pattern colour lives in the strokes. **Fur fins** give the tufted silhouette | **fins** (128 camera-facing lock cards: contour tufts + inner locks) + **6 shells** | fins at the silhouette only + single pass |
| feather | single pass: overlapping scallops on the pole-safe row lattice, ink arcs, rachis, dotted lit crests | **feather cards** | single pass only |

**Highlights:** the glassy crescent + dot highlight is only drawn on *unpatterned* jelly/liquid. Fur,
feather, gas-free solids with a pattern and fire get **Earle rim light** instead: one hard light band
along the sunlit edge (a value step, not a line); gas keeps its soft Fresnel fog edge.

## 2. Patterns (`patterns.ts`)

```ts
type PatternKind = 'none' | 'tiger' | 'giraffe' | 'zebra' | 'snake' | 'spots' | 'diamonds';
PATTERN_KIND_ID = { none: 0, tiger: 1, giraffe: 2, zebra: 3, snake: 4, spots: 5, diamonds: 6 };

interface PatternParams {
  kind: PatternKind;
  scale: number;        // feature density (1 = default)
  ink: string;          // dark marks, sRGB hex
  light: string;        // light marks (dots, crescents, seams)
  light2?: string;      // second light tone (mosaics)
  contrast: number;     // 0..1 coverage + value distance
  stipple?: number;     // 0..1 Earle stipple: the lit band becomes dots that grow toward the light
  rimDots?: number;     // 0..1 light dots along the sunlit Fresnel rim (fur 0.8 / feather 0.5 by default)
  rotation?: number;    // radians around the body's up axis
  ground?: string;      // species coat (tiger saffron, giraffe cream, zebra paper …) — replaces the body ramp
  recolor?: number;     // 0 = species colours, 1 = fully harmonised into the body palette (OKLCh hue walk)
}
makePattern(kind, baseColor, overrides?)   // species kinds: speciesPalette + recolor 0.25; diamonds/none: patternPalette
speciesPalette(kind)                       // { ground?, ink, light, light2 } — the animal's own (Earle-toned) colours
patternPalette(kind, baseColor)            // { ink, light, light2 } harmonised with the body ramp (recolor target)
SPECIES_PATTERNS                           // ['tiger','giraffe','zebra','snake','spots']
NO_PATTERN, EARLE_TEST_STYLE               // presets (Earle test = lapis body, diamond mosaic, stipple, dotted rim)
```

`recolor` is applied in `BlobParamBlock.write` (CPU, linear RGB via OKLCh: lightness and chroma blend,
the hue walks the short way round — saffron pulled toward a teal body becomes gold/olive, not grey).
The ground replaces base/shadow/rim of solid bodies (jelly, liquid, fur, feather, fur shells, feather
cards); organs and the crescent disappear under a coat. Stripes are oriented by the body axes: the
forward axis is the eye direction (`EYE` slot), so they wrap perpendicular to the spine.

| pattern | technique | Earle reference |
|---|---|---|
| tiger | saffron coat; stripes wrap perpendicular to the spine (bent back on the flanks), thick on the back, tapering to points toward the belly, ~half of them forked; face cap clear; cream belly | – |
| giraffe | cream ground; large 3-D Voronoi patches in rust/ochre with thick cream seams | lichen mosaic 01 / Ebene_35 |
| zebra | paper ground; bold regular stripes perpendicular to the spine, chevrons on the flanks, narrowing toward the belly | – |
| snake | jewel green scales (square rhombi on a **pole-safe row lattice**, L1-Voronoi over 3 rows), dark seams, yellow belly scales, a **dorsal chain of dark diamonds** with yellow borders | – |
| spots | tawny coat; **leopard rosettes** on the row lattice (irregular broken rings, 3–5 gaps, darker centres), small solid spots between | – |
| diamonds | 4-dot diamonds / 5-dot crosses on the row lattice, denser and lighter toward the light, red/cyan/cream | ref 10, Ebene_3 |
| stipple / rimDots | object-space halftone (14 cells/unit) and rim dots; fade to their average below ≈ 3 px per cell (no moiré) | 01, 03, 06 (dots only where light hits) |

All patterns live in **rest space** (unsquashed, relative to the main sphere), so they ride on the body
while it squashes, breathes and jiggles; nothing is screen-space. Apply a pattern with
`BlobRenderParams.pattern` or `BlobDynamics.pattern` — both candidates, the fur shells (marks only) and
the lab render it; there is nothing else to wire.

## 3. Parameter block

`BlobParamBlock(capacity)` holds two uniform buffers: the main block (`BLOB_STRIDE = 28` vec4 per slot,
unchanged layout, `MISC.w` now 0..5) and the **style block** (`BLOB_STYLE_STRIDE = 8`):

| `BlobStyleField` | x | y | z | w |
|---|---|---|---|---|
| `MAT` (0) | pattern id | scale | contrast | rotation |
| `PATTERN_INK` (1) | ink rgb (linear) | | | stipple |
| `PATTERN_LIGHT` (2) | light rgb | | | rimDots |
| `PATTERN_LIGHT2` (3) | light2 rgb | | | – |
| `RIPPLE` (4) | impact dir (rest space, unit) | | | age s (< 0 = none) |
| `FUR` (5) | length | density | sway | comb |
| `FX` (6) | particle seed | ripple strength | feather size | feather ruffle |
| `GROUND` (7) | species ground rgb (linear, already recoloured) | | | weight (1 = coat, 0 = body colours) |

`BLOB_STYLE_STRIDE` grew from 7 to 8 (pass 2) — always index with the constant.

`write(slot, params, placement, dyn)` fills both. New `BlobDynamics` fields:

```ts
material?: BlobMaterialKind;          // overrides params.material
pattern?: PatternParams;              // overrides params.pattern
fur?: Partial<FurParams>;             // { length 0.16, density 1, sway 0.5, comb 0.65 }
feather?: Partial<FeatherParams>;     // { size 1, ruffle 0.5 }
ripple?: RippleImpulse;               // { dir (blob-local), age (s since impact), strength? } — send every frame until ~3 s
detail?: number;                      // 1 = full; < 0.5 = LOD: no inner march (a), fur keeps the inner half of its shells
```

`BlobRenderParams = Omit<BlobParams,'material'> & { material: BlobMaterialKind } & { pattern?, fur?, feather? }`
— every genome `BlobParams` is a valid `BlobRenderParams`. Fire widens the instance box for its tongues
automatically.

## 4. Extra passes

```ts
const uniforms = createBlobShadingUniforms();           // share with the body meshes
const quality = createBlobQualityUniforms();
const body = createJiggleBlobMesh(block, { uniforms, quality });
const fur = createFurShellMesh(block, { uniforms, quality, shells: 10 });     // mesh.count = slots in use (0 = off)
const feathers = createFeatherCardMesh(block, { uniforms, quality, cards: 64 }); // mesh.count = slots × cards
const particles = createBlobParticleMesh(block, { uniforms, quality, perBlob: 12 }); // mesh.count = slots × perBlob
scene.add(body.mesh, fur.mesh, feathers.mesh, particles.mesh);
```

* **Fur fins** (`createFurFinMesh(block, { cards: 128 })`, `mesh.count = slots × cards`): camera-facing
  lock cards rooted on the body (Fibonacci roots traced onto the SDF). Each lock points along the combed
  flow and turns its face to the camera about that axis: at the contour the locks stand out as rounded,
  forked tufts (a fluffy, scalloped silhouette, the designer's retriever/mouse creatures), facing the
  camera they lie flat as locks. Locks are flat, rounded tear/leaf scallops in the body's own fur colour
  (one light/shade step, slightly lighter tip, no dark cone, no specular), longer and wavier on the
  back and sides, sparser toward the face, overlapping into one scalloped fringe. **Mobil**: `fins.silhouetteOnly.value = 1`
  (contour tufts only) and no shells.
* **Fur shells**: `shells` (8–12) copies of the body icosphere traced onto the same SDF, pushed out,
  combed down (`comb`), swayed by wind and the jiggle; the fragment alpha-tests a hashed strand lattice
  in rest space (strands thin to dots at the tips — Earle's dotted rims). Non-fur slots collapse in the
  vertex stage. **Mobil**: set `fur.mesh.count = 0`; the body's single-pass fur look remains.
* **Feather cards**: Fibonacci-distributed roots traced onto the SDF, lying on the body pointing down
  with a hashed twist, tips lifted by a ruffle wave; the card fragment draws a feather glyph (outline,
  rachis, barbs, light dots on the sunlit edge) and discards outside. **Mobil**: `count = 0`.
* **Particles**: gas wisps (flat cream streaks rising from the crown, 3 size steps), fire embers (three
  colour bands by age), liquid drips (form on the flank in 3 steps, fall, 0.25 s splash). Opaque hexagon
  billboards, procedural from (slot, index, time) — no CPU simulation. Jelly/fur/feather slots collapse.

## 5. Costs (M3 Pro, WebGPU, 2800×1800 px, 36 bodies, candidate b)

Measured in `/lab/blob?gpu=1` with `BlobLabScene.measureFrameCost(n)` (n extra renders timed to
`queue.onSubmittedWorkDone`, minimum of interleaved rounds) and WebGPU pass timestamps (`?gpu=1`,
bench column "GPU ms"). **Caveat:** measured while other agents' headless browsers shared the GPU;
the minima are the best available numbers, the ordering is reliable, single rows can be off by
±0.5 ms. Re-measure on a quiet machine with `/lab/blob?bench=1` (table rows "Fell/Federn/Gas").

Frame cost for 36 bodies, candidate (b), tier 3, board view (each blob ≈ 100–130 px), minimum of 4
interleaved rounds, every config rebuilt (pass 2; the pass-1 table measured a dead board for some rows).
"+" = over the empty board (plate, clear, MSAA resolve ≈ 1.0 ms).

| config | frame (+) | timestamps (+) | note |
|---|---|---|---|
| jelly | +0.94 ms | +1.70 ms | 36 jiggle bodies |
| + tiger / giraffe / spots | +1.42 / +1.50 / +1.01 ms | +2.3 / +0.3 / +1.6 ms | species coats: +0.1…0.6 ms over jelly |
| gas + wisps | +1.93 ms | +3.06 ms | fog streaks, alpha-to-coverage, dithered wisps |
| fur single pass (Mobil) | +0.90 ms | +1.55 ms | Earle canopy strokes ≈ jelly cost |
| **fur + 10 shells (Hoch)** | **+1.82 ms** | **+3.04 ms** | shells **+0.92 ms** (+1.5 ms ts) over single pass → **≤ 2 ms for 36 ✓** |
| feather single pass (Mobil) | +0.82 ms | +1.24 ms | |
| **feather + 64 cards (Hoch)** | **+0.70 ms** | **+1.29 ms** | cards within noise over single pass |

Standard bench (`/lab/blob?bench=1`, vsync, WebGPU timestamps, medians — `docs/progress/p1b-bench.png`):
(b) × 36 jelly 1.57 ms · fur + shells 2.84 ms (**+1.27**) · feathers + cards 2.07 ms (+0.5) · gas +
wisps 6.0 ms (+4.4, the heaviest look; medians include other GPU load). All rows 60 fps, p99 < 20 ms.

Candidate (a) (hero, 1–9 bodies) at 36 bodies for reference: jelly 13.2 ms, fur 13.4 ms, gas 23 ms,
fire 32 ms (the flame crown box grows upward only; rays between tongues march all steps).

## 6. Gotchas

* **TSL `If` chains**: a node shared by several branches (or used after the chain) must be declared
  *before* the chain with `.toVar()` — otherwise TSL may cache it into a variable at its first use
  inside one branch and every other branch reads an unassigned 0 (this broke four patterns once).
* **Kinds are integers**: `kindWeight()` still exists for blends, but branches assume `MISC.w` is exact.
  The merge timeline switches material at the midpoint, so this holds during merges.
* **Poles**: cylindrical `atan` unwraps converge into rosettes at the top pole — use `rowLattice()` /
  `snakeScales()` (pole-safe) or 3-D fields (`dotField`, `dotFieldTangent`, `voronoi3`).
* **Derivatives**: lattice AA widths come from `fwidth(lat)` computed outside branches (`sphereFrame`),
  never from `fract()` coordinates (they jump at cell borders).
* Fire's SDF uses a pragmatic Lipschitz bound (overshoot only thins a tongue tip).

## 7. Modules (Blender)

The module library (`content/genome/assets`, 32 GLBs) follows `tools/blender/README.md`: eyes carry a
gaze-following `<id>_pupil` mesh (iris + pupil + glint), a `<id>_lid` mesh and `SOCKET_lid`; legs are
`<id>` (thigh) → `<id>_shin` → `<id>_foot` with `SOCKET_knee` / `SOCKET_foot`; materials
`Tint | Ink | Bone | Iris | Accent`. Contract test: `packages/render/src/materials/moduleAssets.test.ts`.
