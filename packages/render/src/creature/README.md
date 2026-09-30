# Kreaturen v3 — API (P4)

Owner: P4 agent (`packages/genome/src/**`, `packages/render/src/creature/**`, the creature lab/editor).
Consumers: the board (`packages/render/src/board`), the lab (`/lab/creature`), the editor. Everything
renders **without outlines** (STYLE §3). Design reference: Florian's top-down sketch
`assets/ref-florian/08-blob-animation-draft.png` — the lab view **Skizze** stages it live.

```
resolveCreature(genome, rules, { archetypes })  →  CreatureSpec (species, body spheres, skeleton, parts, skin)
CreaturePool(library, uniforms) ─ createRig(spec) → CreatureRig    (parts + traced mouth, one draw call per part type)
CreatureMotion(spec, rig, { seed, scale })        → MotionController (@ee/genome) + posed body params
   └ pounceTo / leapToCamera / devour / coilSwallow / stompMerge / splashMerge   (merge moves)
CreatureMeshBodies(block, { uniforms })           → species bodies as skinned meshes (board / iPhone path, §7)
```

## 1. Species (genome)

`SPECIES = blob, snake, retriever, mouse, giraffe, rex, duck, elephant` — each belongs to one archetype
(`SPECIES_BODY`: retriever/mouse/giraffe → quadruped, rex/duck → biped, elephant → heavy). `BODY_TYPES`
is unchanged (the locomotion classes). A line picks its species per (zone, seed) by the species weights
(`rules.species`, defaults `DEFAULT_SPECIES_RULES`); `genome.species` forces one (implies the archetype).

Silhouettes are built to read **from above** (the ~65° board camera): distinct heads on a neck pinch,
eyes on the upper face, big shapes sideways (elephant ear flaps, REX frills, giraffe neck on the ground,
trunk, tails). Species parts are **procedural modules** (`ProceduralModules.ts`, always registered by
every `ModuleLibrary`): `ear_flap, ear_dog, ear_mouse, horn_ossicone, crest_frill, nose_dot, beak_duck,
tail_rope, tail_mouse, tail_plume, tail_duck` and the virtual `leg_sdf`. Species skins map to the
Materials patterns (`elephant 7, rex 8, retriever 9, mouse 10`, giraffe patches).

`spec.skeleton` (v3 fields): `species`, `legs: SkeletonLeg[]` (kneaded legs), `neckChain` (the head
leads turns), `trunk` (elephant), `mouth: MouthDef`, `sockets` (species placements), `spineArc` (snake).
`raymarch: true` for snake, giraffe, REX, elephant: not star-shaped from the box centre, so the *traced
icosphere* (candidate b for blobs) cannot draw them. Every species draws on the skinned **mesh path**
(§7); the raymarcher is only needed for hero close-ups.

## 2. Kneaded legs

`spec.legStyle`: `'sdf'` (default) — 2 or 4 stumps are **spheres of the body** (foot + knee for the
taller legs, smooth-unioned with the torso), placed every frame on the gait's feet; `'module'` — the leg
assets (now fitted to the species' stance height, thickened, body-coloured). Legs still appear as parts
(`slot 'leg'`, `asset 'leg_sdf'`, `sdf: true`, roles FL/FR/BL/BR or L/R) so `legDefsFor(spec, rig)` and
fall-back checks keep working; nothing is drawn for them.

**Board:** to make the stumps step, pass the feet into your `BodyPose` before `poseSpheres`:

```ts
bodyPose.feet = pose.feet.map((f) => [(f.pos[0] - x) / s, (f.pos[1] - (ground + lift)) / s, (f.pos[2] - z) / s]); // blob units, world axes
bodyPose.footSwing = pose.feet.map((f) => (f.planted ? 0 : f.swing));
bodyPose.footSplat = pose.feet.map((f) => f.splat);   // landing splat (FootState.splat, decays)
bodyPose.neckBend = pose.neckBend ?? 0;               // head leads turns (optional)
```

Without `feet` the stumps stand at rest (they slide with the body — acceptable, not pretty).
`CreatureMotion.posedParams(pose)` does all of this.

## 3. Motion (`@ee/genome` MotionController)

* **Timing** is weightier: longer anticipation (0.22 s × mass^0.35), splat hold, recovery; lower base
  speeds; turn rates fall with mass; jump arcs grow with distance.
* `faceDirection(yawOrPoint, { timeScale })` → duration: a small counter-turn (wind-up), the turn with a
  ~10 % overshoot (capped at 0.32 rad) that settles; walkers shuffle their feet; the head leads. A
  standing creature never turns on its own. `turnProfile(u, delta)` is exported for custom drivers.
* **Snake**: follow-the-leader — `PathHistory` stores the head's trail; every spine sphere sits on it
  at its arc distance (`pose.spinePoints`), so S-curves, tail lag and turns come for free; the head
  weaves (phase by distance); resting snakes slither into a coil (`planCoil`/`coilPoint`), moving on
  unwinds it (`MotionConfig.coilAtRest`, `coilNow()` for static layouts).
* **Mouth** (`MouthDriver`): `openMouth(amount)`, `closeMouth()`, `chew(n)`, `roar()`, `yawn()`,
  `bite()`; pose fields `mouth`, `mouthRound`, `squint`, `jaw`. Jumps open the mouth toward the motion
  in the second half of the flight; blobs trail droplets from their stretched tail.

## 4. Mouth rendering

The rig traces a crescent (upper lip arch, deep lower-lip bulge; round for yawn/roar) onto the body SDF
around `skeleton.mouth.dir` every frame the mouth is open — one draw call for all mouths
(`CreaturePool.mouths`). Lower jaws open as SDF spheres (REX), bills as a `_jaw` module segment (duck),
teeth sit on the upper jaw and show when the jaw drops. `rig.mouthOverride = { open, round }` freezes it.

## 5. Merge moves (pure, deterministic, time-scaled)

```ts
const move = pounceTo(ctx, [x, z]);                  // or leapToCamera(ctx, height, { camera, partner })
                                                     //    devour(ctx, partner) · coilSwallow(ctx, partner, thickness)
                                                     //    stompMerge(ctx, partner?) · splashMerge(ctx, partner?)
ctx: MoveContext = { from: [x, z], yaw, scale /* world size */, mass, bounce?, bodyType?, timeScale?, gravity? }
partner: MovePartner = { x, z, radius }

move.duration, move.events           // [{ type, t, strength }] sorted: anticipate, launch, apex, mouthOpen,
                                     //   contact, bite, swallow, chew, stomp, splash, land, coil, settle, done
move.sample(t, out?) → MoveSample    // x, z, lift, yaw, pitch, roll, squashAxis, squash, crouch, mouth,
                                     //   mouthRound, squint, coil, bulge, trumpet, jiggle, airborne,
                                     //   partner: { x, z, lift, scale, squash, visible } (null for pounce)
move.forEachEvent(t0, t1, cb)        // events with t0 < t ≤ t1 (t0 < 0 includes t = 0)
move.timeOf('contact'), move.end     // e.g. start the body blend (MergeTimeline) at `contact`
defaultMergeMove(bodyType)           // snake → coilSwallow, heavy → stompMerge, biped → leapToCamera,
                                     // quadruped → devour, blob → splashMerge
```

Durations scale with distance and mass and with `timeScale` (a duration multiplier: 0.5 = twice as fast
for board combos). Same context → same timeline on every device. With `MotionController.play(move, onEvent)`
or `CreatureMotion.devour(partnerMotion, { timeScale, onEvent })` the controller follows the move (feet
step with it, the snake's body wraps the partner, landing splats, droplets) and ends idle at `move.end`;
read `controller.moveSample.partner` to draw the partner being pulled into the mouth.

## 6. Face mask, patterns

`CreatureMotion.faceMask(pose)` → `{ dir, radius, strength }` for `BlobDynamics.face` (from the eye
sockets, turned with the pose and the neck lead); `faceCapFor(spec)` is the rest-space version. Module
eyes shrink the painted slit to nothing but keep it pointing at the face: the body shader's forward axis
for stripes, lattices and fur flow (`posedParams` turns it with the body). Patterns laid out in raw rest
space (giraffe patches) turn via `pattern.rotation += motion.patternYaw(pose)` on the raymarch path; the
mesh path (§7) sets forward axis, face mask and pattern rotation itself.

## 7. Mesh path — species as skinned meshes (board, iPhone)

`CreatureMeshBodies` draws every species body as **one instanced mesh per species shape and tier**,
skinned on the GPU to the posed spheres; shading is the shared `shadeBlob` on the same block slot, so
materials, species skins, the face mask, ripples, fur/feather coats and the rig's eyes, ears and mouth
crescent look like the other paths. Raymarch (candidate a) stays for hero close-ups only.

```ts
const bodies = new CreatureMeshBodies(block, { uniforms });   // block: its own BlobParamBlock (≤ 36 slots)
scene.add(bodies.group);
for (const spec of levelSpecs) bodies.prepare(spec);            // at load: ≈ 10–30 ms per species+tier (Mac)
// every frame
bodies.begin();
const params = motion.posedParams(pose);                        // exactly as for a raymarched body
block.write(slot, params, { center: motion.center(pose), scale }, dyn);
bodies.add(slot, { spec, params, rotation: pose.rotation });   // after block.write; lod: 'near' for close-ups
bodies.end();
```

* **Eligible:** `meshBodyEligible(spec)` — animals with a solid body (jelly, liquid; coats on top). Gas
  and fire keep the raymarcher. Pass the same block to the coat passes (fur/fins/feathers read the slot).
* **Meshes:** `meshBody` = surface nets on the rest SDF, projected onto the surface, closed 2-manifold
  (the grid shifts until no vertex pinches two sheets). Key `species|legStyle|spheres|tier|lod`
  (`meshBodyKey`); per-seed proportions become skin deltas (≤ 0.05 blob units off, tested). Budgets
  `MESH_BODY_BUDGET`: `board` 900 vertices (default — finer meshes only multiply the 2×2-quad
  over-shading of tiny triangles), `near` 2 600.
* **Skinning** (per vertex ≤ 4 spheres, weights over the smooth-union fillet): each sphere moves, turns
  about its centre and changes its radius (+ breathing); then the body rotation, the jiggle wave and the
  squash. Chains turn their spheres (`skinChainsFor` / `chainRotations`, parallel-transported so a coil
  never pinches): snake spine (+ rigid snout), giraffe neck (+ head), elephant trunk (sway + curl), the
  REX jaw as a lever about its hinge. Kneaded legs step and splat with their foot spheres (droplets stay
  separate one-sphere blobs). `skinVertex` is the CPU reference (tests, parts debugging).
* **Patterns and face:** patterns are **body-fixed** (they ride along a bending snake instead of swimming
  through it). `add` owns the slot's pattern frame — bare bodies shade in rest space, coats in the rigidly
  turned rest frame the fur/feather passes use (`meshBodyFrame`) — and rewrites forward axis, face mask
  (`faceCapFor`) and pattern rotation (`skin.patternRotation`), so callers write the block as usual and
  never add `patternYaw` or frame arguments.
* **Limits:** opaque (no alpha-to-coverage: keeps the tile GPU's hidden-surface removal); an opening jaw
  stretches the skin instead of opening a gap (the mouth crescent covers it); the inside of very tight
  coils folds into the body (hidden). Uniforms: skin 12 KB + rotations 9 KB per 36 slots (WebGL2-safe).
* **Lifetime:** species meshes without instances leave the render list; `prune(maxIdleFrames)` frees the
  idle ones (level change).
* **Cost** (M3 Pro, 36 × tier 6 on the zoo board `/lab/creature` → "36 × Arten", Arten-Mesh on, GPU
  timestamps while the GPU was shared with the iOS simulator): 31 k vertices, 7 draws; whole frame
  (stage, bodies, parts, coats) 1.9–3.1 ms at 2560×1600 (bodies 0.4–1.3 ms) vs 11.5 ms raymarched;
  iPhone-sized Mobil view (589×1278) 1.05 ms vs 3.5–4.4 ms. CPU: 1.4 µs per creature for the skin data.
  Lab: "b Jiggle-Mesh" + **Arten-Mesh** toggles the path; the HUD shows `Mesh N × (Xk Vertices)`.
