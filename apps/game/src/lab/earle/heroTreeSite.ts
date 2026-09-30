import { Group, Matrix4, Sphere, Vector3 } from 'three/webgpu';
import type { Camera, Frustum, Node } from 'three/webgpu';
import { uniform, vec4 } from 'three/tsl';
import { createHeroTree, transformHeroTreePath, type HeroTree, type HeroTreePath, type TreeQuality } from '@ee/render/earle/tree/index.ts';
import type { EarlePlanet } from '@ee/render';
import type { PlanetLandmarkParams, SpiralNode, SpiralPath, Vec3 } from '@ee/world';

/** Levels (1-based) whose nodes leave the ground spiral and climb the giant tree (trunk → ramp → crown rim). */
export const TREE_LEVELS: readonly [number, number] = [80, 95];
/** Tree size on the planet: 0.4 × the tree lab size → ≈ 10 units tall, crown ≈ 12 wide (3–6× the other trees). */
export const TREE_SCALE = 0.4;
/** Distance puck ↔ bark in world units (the path is computed in tree units: 0.9 / scale). */
const PUCK_CLEARANCE = 0.9;
const DOT_SPACING = 0.6;

export interface TreeRail {
  position: Vector3;
  lookAt: Vector3;
}

/**
 * The giant Earle tree as the landmark of world 01 (Flechtenbaum) plus the level-path stretch that climbs it.
 * `createHeroTreeSite` places the tree next to the last ground node before the stretch (root tip facing it), splices
 * the tree nodes into the spiral (levels 80–95) with dotted connectors (short walk in, a gliding arc back down to the
 * spiral) and keeps the camera rail of the stretch in planet space.
 */
export interface HeroTreeSite {
  tree: HeroTree;
  holder: Group;
  /** Tree path in planet space (nodes, dots, rail). */
  path: HeroTreePath;
  /** Node indices (0-based) of the stretch on the tree. */
  first: number;
  last: number;
  /** Spliced level path (ground spiral + tree stretch + connectors). */
  levelPath: SpiralPath;
  /** Tree height above its foot in world units (shadow fit, culling). */
  height: number;
  /** Camera rail for node `index` (planet space); false outside the stretch. */
  railFor(index: number, outPos: Vector3, outLook: Vector3): boolean;
  /** Continuous rail sample 0..1 over the whole stretch (planet space). */
  sampleRail(t: number, outPos: Vector3, outLook: Vector3): void;
  /** Once per frame: culling, curvature follow, billboards, sun, clock. */
  update(dt: number, camera: Camera, sunDirWorld: Vector3, cameraWorld: Vector3, planetMatrixWorld: Matrix4, frustum: Frustum): void;
  /** Completed nodes → bloom (Wooding heals). */
  setProgress(done: number): void;
  dispose(): void;
}

const _v = new Vector3();
const _w = new Vector3();
const _sphere = new Sphere();

function slerpDir(a: Vec3, b: Vec3, t: number): Vec3 {
  const va = new Vector3(a[0], a[1], a[2]).normalize();
  const vb = new Vector3(b[0], b[1], b[2]).normalize();
  const cos = Math.min(1, Math.max(-1, va.dot(vb)));
  const ang = Math.acos(cos);
  if (ang < 1e-6) return [va.x, va.y, va.z];
  const s = Math.sin(ang);
  const r = va.multiplyScalar(Math.sin((1 - t) * ang) / s).add(vb.multiplyScalar(Math.sin(t * ang) / s));
  return [r.x, r.y, r.z];
}

/**
 * Builds the site: creates the tree (shared world atlas and fog), computes its slot from the ground spiral, sets the
 * landmark (clearing around the trunk), splices the level path and hands it to the planet (corridor + growth).
 */
export function createHeroTreeSite(world: EarlePlanet, options: { worldIndex: number; quality: TreeQuality; seed: number; landmarks: PlanetLandmarkParams[] }): HeroTreeSite {
  const ground = world.path;
  const first = TREE_LEVELS[0] - 1;
  const last = TREE_LEVELS[1] - 1;
  const count = last - first + 1;
  const before = ground.nodes[first - 1]!;
  const after = ground.nodes[last + 1]!;
  const R = world.options.radius;

  // The tree bends with the planet's curvature boost exactly like terrain, vegetation and path stones: every tree
  // vertex goes slot space → planet space → bendNode → back (the slot matrix is filled once the slot is known)
  const slotU = uniform(new Matrix4());
  const slotInvU = uniform(new Matrix4());
  type V3 = Node<'vec3'>;
  const warp = (p: V3): V3 => {
    const planetPos = slotU.mul(vec4(p, 1)).xyz as unknown as V3;
    return slotInvU.mul(vec4(world.bendNode(planetPos), 1)).xyz as unknown as V3;
  };
  const tree = createHeroTree({
    warp,
    atlas: world.atlas,
    lookup: world.lookup,
    fog: world.fog,
    fogLookup: world.lookup,
    quality: options.quality,
    seed: options.seed,
    nodes: count,
    meadow: false,
    pathClearance: PUCK_CLEARANCE / TREE_SCALE,
    // roots, drift and the first node follow the planet's curvature (nothing floats at the rim of the foot)
    groundRadius: world.options.radius / TREE_SCALE,
  });
  const plan = tree.shape.plan;
  const height = (tree.shape.crownTop + 3) * TREE_SCALE;

  // Foot: a little ahead of the last ground node along its latitude circle (the spiral runs east there), so the tree
  // stays inside world 01 and its root tip faces the spiral
  const gap = plan.startRadius * TREE_SCALE + 2.2;
  const bDir = new Vector3(...before.position).normalize();
  const cosLat = Math.max(0.2, Math.hypot(bDir.x, bDir.z));
  const turn = gap / (R * cosLat);
  // Spiral longitude grows along the path (lon = s·turns·2π) → rotate towards +lon (three: +angle about Y is −lon)
  const fDir = bDir.clone().applyAxisAngle(new Vector3(0, 1, 0), -turn);
  const foot: Vec3 = [fDir.x, fDir.y, fDir.z];
  void slerpDir;
  const base: PlanetLandmarkParams = { id: 'hero-tree', world: options.worldIndex, dir: foot, scale: TREE_SCALE, clearRadius: tree.shape.R * 1.55 * TREE_SCALE };
  // Yaw: the root tip (path start) points at the last ground node
  world.setLandmarks([...options.landmarks, base]);
  let slot = world.getLandmarkSlot('hero-tree')!;
  const tip = new Vector3(Math.cos(plan.startAngle) * plan.startRadius, 0, Math.sin(plan.startAngle) * plan.startRadius);
  const target = new Vector3(...before.position);
  let bestYaw = 0;
  let bestD = Infinity;
  const m = new Matrix4();
  for (let yaw = 0; yaw < 360; yaw += 2) {
    world.landmarkMatrix({ ...slot, yawDeg: yaw }, m);
    const d = _v.copy(tip).applyMatrix4(m).distanceTo(target);
    if (d < bestD) {
      bestD = d;
      bestYaw = yaw;
    }
  }
  world.setLandmarks([...options.landmarks, { ...base, yawDeg: bestYaw }]);
  slot = world.getLandmarkSlot('hero-tree')!;

  const holder = world.addLandmark(tree.group, 'hero-tree')!;
  const slotMatrix = world.landmarkMatrix(slot, new Matrix4());
  slotU.value.copy(slotMatrix);
  slotInvU.value.copy(slotMatrix).invert();
  const path = transformHeroTreePath(tree.path, slotMatrix);

  // --- Splice: ground nodes [0, first) + tree nodes + ground nodes (last, end]; dots with connectors --------------
  const toSpiralNode = (index: number, zone: number, position: Vec3, normal: Vec3): SpiralNode => {
    const l = Math.hypot(position[0], position[1], position[2]) || 1;
    return {
      index,
      zone,
      position,
      normal,
      lat: (Math.asin(position[1] / l) * 180) / Math.PI,
      lon: (Math.atan2(position[2], position[0]) * 180) / Math.PI,
    };
  };
  const nodes: SpiralNode[] = [];
  for (const n of ground.nodes) {
    if (n.index < first) nodes.push(n);
    else if (n.index <= last) {
      const tn = path.nodes[n.index - first]!;
      nodes.push(toSpiralNode(n.index, n.zone, tn.position, tn.normal));
    } else nodes.push(n);
  }
  // Ground dots outside the stretch (latitude falls monotonically along the spiral)
  const latBefore = before.lat;
  const latAfter = after.lat;
  const dots: SpiralPath['dots'] = ground.dots.filter((d) => {
    const l = Math.hypot(d.position[0], d.position[1], d.position[2]) || 1;
    const lat = (Math.asin(d.position[1] / l) * 180) / Math.PI;
    return lat >= latBefore || lat <= latAfter;
  });
  // Tree dots (trunk spiral, ramp, crown rim)
  for (const d of path.dots) dots.push({ position: d.position, normal: d.normal });
  // Connectors: ground node → root tip (on the ground), crown end → next ground node (gliding arc)
  const connect = (from: Vec3, to: Vec3, lift: number): void => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const dist = a.distanceTo(b);
    const n = Math.floor(dist / DOT_SPACING);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      const up = p.clone().normalize();
      // Ground-following (surface radius) plus an arc lift that fades in/out
      const r = world.surfaceRadius(up);
      const onGround = up.clone().multiplyScalar(r);
      const direct = a.clone().lerp(b, t);
      const hDirect = direct.length() - r;
      const arc = Math.sin(Math.PI * t) * lift;
      const hh = Math.max(0.12, hDirect * (1 - t) * (lift > 0 ? 1 : 0) + arc);
      const pos = onGround.addScaledVector(up, lift > 0 ? hh : 0.12);
      if (Math.hypot(pos.x - a.x, pos.y - a.y, pos.z - a.z) < 0.9 || Math.hypot(pos.x - b.x, pos.y - b.y, pos.z - b.z) < 0.9) continue;
      dots.push({ position: [pos.x, pos.y, pos.z], normal: [up.x, up.y, up.z] });
    }
  };
  const firstTree = path.nodes[0]!;
  const lastTree = path.nodes[path.nodes.length - 1]!;
  connect(before.position, firstTree.position, 0);
  if (path.exit) {
    // the way down lies on the tree too: over the canopy and along the ground limb to the ground, then on the ground
    for (const d of path.exit.dots) dots.push({ position: d.position, normal: d.normal });
    connect(path.exit.ground, after.position, 0);
  } else connect(lastTree.position, after.position, Math.min(6, 1.5 + 0.12 * new Vector3(...lastTree.position).distanceTo(new Vector3(...after.position))));
  let length = 0;
  for (let i = 1; i < nodes.length; i++) length += new Vector3(...nodes[i]!.position).distanceTo(new Vector3(...nodes[i - 1]!.position));
  const levelPath: SpiralPath = { nodes, dots, length };
  world.setPath(levelPath);

  const slotPos = new Vector3(...slot.position);
  let lastBloom = -1;
  return {
    tree,
    holder,
    path,
    first,
    last,
    levelPath,
    height,
    railFor(index, outPos, outLook) {
      if (index < first || index > last) return false;
      path.sampleRail(path.railTForNode(index - first), outPos, outLook);
      return true;
    },
    sampleRail(t, outPos, outLook) {
      path.sampleRail(t, outPos, outLook);
    },
    update(dt, camera, sunDirWorld, cameraWorld, planetMatrixWorld, frustum) {
      // the curvature bend happens per vertex (warp); the holder stays at the unbent slot
      // Cull when behind the horizon or outside the frustum (7 draw calls + 3 shadow casters otherwise)
      _w.copy(slotPos).applyMatrix4(planetMatrixWorld);
      const camDir = _v.copy(cameraWorld).normalize();
      const up = _w.clone().normalize();
      const Rr = R;
      const horizon = Math.acos(Math.min(1, Rr / Math.max(Rr + 0.01, cameraWorld.length())));
      const facing = up.dot(camDir);
      const reach = Math.cos(Math.min(Math.PI, horizon + (height + 8) / Rr));
      _sphere.center.copy(_w).addScaledVector(up, height * 0.5);
      _sphere.radius = height * 0.8 + 2;
      holder.visible = facing > reach && frustum.intersectsSphere(_sphere);
      if (!holder.visible) return;
      tree.updateCamera(camera);
      tree.setSunDirection(sunDirWorld);
      tree.update(dt);
    },
    setProgress(done) {
      const bloom = Math.min(1, Math.max(0, (done - (first - 6)) / (last - first + 6)));
      if (Math.abs(bloom - lastBloom) > 1e-3) {
        tree.setBloom(0.15 + 0.85 * bloom);
        lastBloom = bloom;
      }
    },
    dispose() {
      world.removeLandmark('hero-tree');
      tree.dispose();
    },
  };
}
