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
`raymarch: true` for snake, giraffe, REX, elephant (not star-shaped from the box centre — draw them with
candidate a); retriever, mouse, duck and blob are mesh-safe (tested).

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
space (giraffe patches) turn via `pattern.rotation += motion.patternYaw(pose)`.
