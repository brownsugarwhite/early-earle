import { Group, Matrix3, Matrix4, Quaternion, Sphere, Vector3 } from 'three/webgpu';
import type { Camera, Frustum, Node } from 'three/webgpu';
import {
  computeTreeShape,
  createHeroPathMarkers,
  createHeroTree,
  heroTreePath,
  transformHeroTreePath,
  type HeroPathMarkers,
  type HeroTree,
  type HeroTreePath,
  type TreeQuality,
} from '@ee/render/earle/tree/index.ts';
import type { EarlePlanet } from '@ee/render';
import type { PlaneLandmarkSlot } from '@ee/world';

/** Levels (1-based) whose nodes leave the ground path and climb the giant tree (trunk → ramp → crown rim). */
export const TREE_LEVELS: readonly [number, number] = [80, 95];
/** Tree size on the map: 0.4 × the tree lab size → ≈ 10 units tall, crown ≈ 12 wide (3–6× the other trees). */
export const TREE_SCALE = 0.4;
/** Distance puck ↔ bark in world units (the path is computed in tree units: 0.9 / scale). */
const PUCK_CLEARANCE = 0.9;
/**
 * Marker sizes on the map (tree units, relative to the tree lab): the shelf fungi are large enough for the hero to sit
 * on (≈ 1.2 world units wide, ≈ 0.5 deep), the flower stones and dots match the ground path.
 */
const MARKER_SCALES = { fungus: 1.45, stone: 0.9, dot: 0.95 } as const;
/**
 * Camera rail distances (tree units). Landscape: hero, the next nodes and the tree read together. Portrait (phones,
 * ≈ 30° horizontal field of view): further out, so the trunk takes about half the width instead of more than all of it.
 */
const RAIL_LANDSCAPE = { trunkDistance: 18, crownDistance: 28 } as const;
const RAIL_PORTRAIT = { trunkDistance: 30, crownDistance: 38, clearSight: true } as const;
/** Radius (world units) of the sight disc around the current node that the hanging twigs keep clear. */
const SIGHT_RADIUS = 1.8;

export interface TreeRail {
  position: Vector3;
  lookAt: Vector3;
}

/**
 * The giant Earle tree as the landmark of world 01 (Flechtenbaum) plus the level-path stretch that climbs it
 * (ADR 0002: on the infinite plane). `createHeroTreeSite` places the tree a little ahead of the last ground node before
 * the stretch (root tip facing it) and keeps the tree path and camera rails in plane coordinates (x, h, z) — the flow
 * maps them onto the display sphere. The flow's level path (`FlowPath`) splices the tree nodes into the ground path.
 */
export interface HeroTreeSite {
  tree: HeroTree;
  holder: Group;
  /** Tree path in plane coordinates (nodes, dots, rail). */
  path: HeroTreePath;
  /** Node indices (0-based) of the stretch on the tree. */
  first: number;
  last: number;
  /** Slot matrix tree space → plane (absolute coordinates). */
  matrix: Matrix4;
  slot: PlaneLandmarkSlot;
  /** Tree height above its foot in world units (shadow fit, culling). */
  height: number;
  /**
   * The level path ON the tree (shelf fungi on the bark, flower stones on roots, limbs and domes, flush dots, the ring
   * of the current node) — child of the tree group, mapped with the tree (same warp).
   */
  markers: HeroPathMarkers;
  /** Camera rail for node `index` (plane); false outside the stretch. `portrait`: the wider phone rail. */
  railFor(index: number, outPos: Vector3, outLook: Vector3, portrait?: boolean): boolean;
  /** Continuous rail sample 0..1 over the whole stretch (plane). */
  sampleRail(t: number, outPos: Vector3, outLook: Vector3, portrait?: boolean): void;
  /**
   * Where a figure of `radius` world units stands on node `index` (global): on its shelf fungus or flower stone, in
   * plane coordinates with its up axis (the fungus seat on the bark). False outside the stretch.
   */
  seatFor(index: number, radius: number, outPos: Vector3, outUp: Vector3): boolean;
  /** Current node and completed count (global node indices) → ring, colours, light wave, bloom of reached nodes. */
  setPathState(current: number, done: number): void;
  /** Hide the marker of node `index` (global; its level plateau stands there) or none. */
  setHiddenNode(index: number | null): void;
  /** The point the hanging twigs keep clear (plane; e.g. the level plateau under the tree), `null` = the current node. */
  setSightOverride(point: Vector3 | null, radius: number): void;
  /** Once per frame: culling, billboards, sun, clock. */
  update(dt: number, camera: Camera, sunDirWorld: Vector3, cameraWorld: Vector3, frustum: Frustum): void;
  /** Completed nodes → bloom (Wooding heals). */
  setProgress(done: number): void;
  dispose(): void;
}

const _v = new Vector3();
const _w = new Vector3();
const _sphere = new Sphere();

/**
 * Builds the site: creates the tree (shared world atlas and fog), places its slot from the ground path (a little ahead
 * of node `first − 1`, root tip facing it), sets the landmark (clearing around the trunk, the region re-plans its
 * features, the path is re-routed around it) and prepares rails and markers.
 */
export function createHeroTreeSite(world: EarlePlanet, options: { worldIndex: number; quality: TreeQuality; seed: number }): HeroTreeSite {
  const first = TREE_LEVELS[0] - 1;
  const last = TREE_LEVELS[1] - 1;
  const count = last - first + 1;
  const before = world.path.node(first - 1);

  // 1) Plan the slot with the pure form (no GPU objects): the root tip (path start) must face the last ground node
  const treeOptions = { seed: options.seed, pathClearance: PUCK_CLEARANCE / TREE_SCALE };
  const planShape = computeTreeShape({ ...treeOptions, quality: options.quality });
  const plan = planShape.plan;
  const height = (planShape.crownTop + 3) * TREE_SCALE;

  // Foot: ahead of the last ground node along the path's backbone (forward = −z), so the root tip faces it
  const gap = plan.startRadius * TREE_SCALE + 2.2;
  const zb = before.position[2];
  const slope = world.layout.backboneSlope(zb);
  const fl = Math.hypot(slope, 1);
  const fx = before.position[0] + (-slope / fl) * gap;
  const fz = zb + (-1 / fl) * gap;
  const tip = new Vector3(Math.cos(plan.startAngle) * plan.startRadius, 0, Math.sin(plan.startAngle) * plan.startRadius);
  const target = new Vector3(before.position[0], before.position[1], before.position[2]);
  const probe = { position: [fx, world.heightAt(fx, fz), fz] as [number, number, number], yawDeg: 0, scale: TREE_SCALE } as PlaneLandmarkSlot;
  let bestYaw = 0;
  let bestD = Infinity;
  const m = new Matrix4();
  for (let yaw = 0; yaw < 360; yaw += 2) {
    world.landmarkMatrix({ ...probe, yawDeg: yaw }, m);
    const d = _v.copy(tip).applyMatrix4(m).distanceTo(target);
    if (d < bestD) {
      bestD = d;
      bestYaw = yaw;
    }
  }
  const slot = world.setLandmark({ id: 'hero-tree', world: options.worldIndex, x: fx, z: fz, yawDeg: bestYaw, scale: TREE_SCALE, clearRadius: planShape.R * 1.55 * TREE_SCALE });
  const slotMatrix = world.landmarkMatrix(slot, new Matrix4());

  // 2) The tree on the real terrain of the slot: roots, snow drift and the first nodes follow the ground (nothing
  //    floats over a dip, nothing hangs in the air at the rim of the foot)
  const gp = new Vector3();
  const groundAt = (x: number, z: number): number => {
    gp.set(x, 0, z).applyMatrix4(slotMatrix);
    return (world.heightAt(gp.x, gp.z) - slot.position[1]) / TREE_SCALE;
  };
  // Every tree vertex goes onto the display sphere like terrain, vegetation and path stones (the holder is anchored in
  // the plane group: model matrix = slot − focus, the warp maps the flat position)
  type V3 = Node<'vec3'>;
  const warp = (p: V3): V3 => world.mapping.warp(p as never) as unknown as V3;
  const tree = createHeroTree({
    ...treeOptions,
    groundAt,
    warp,
    atlas: world.atlas,
    lookup: world.lookup,
    fog: world.fog,
    fogLookup: world.lookup,
    quality: options.quality,
    nodes: count,
    meadow: false,
    // map framing: hero, the next nodes and the tree together (≈ 7 / 11 world units from the node)
    rail: RAIL_LANDSCAPE,
  });
  const holder = world.addLandmark(tree.group, 'hero-tree')!;
  const path = transformHeroTreePath(tree.path, slotMatrix);
  // The phone rail (same nodes, a wider camera band that keeps its view of the node clear of limbs); built here, not
  // on first use (≈ 16 ms on an M3 — no hitch at the start of a camera move onto the tree)
  const portraitPath = transformHeroTreePath(heroTreePath({ nodes: count, shape: tree.shape, rail: RAIL_PORTRAIT }), slotMatrix);
  const railPath = (portrait: boolean): HeroTreePath => (portrait ? portraitPath : path);

  // The level path on the tree: fungi on the bark, stones on roots, limbs and domes, dots flush on the surface (tree
  // space, same warp as the tree) — the flow's NodePath leaves these nodes to the markers
  const sunLocal = new Vector3(0.5, 0.2, 0.5).normalize();
  const markers = createHeroPathMarkers({
    path: tree.path,
    warp,
    sunDirLocal: sunLocal,
    scales: MARKER_SCALES,
    fog: { settings: world.fog, lookup: world.lookup },
    // The tree's way down (ground limb) leads away from the next ground node: the hero glides from the crown instead,
    // and the trail resumes at the edge of the clearing (FlowPath)
    exitDots: false,
  });
  tree.group.add(markers.group);
  const normalMatrix = new Matrix3().getNormalMatrix(slotMatrix);
  const _qInv = new Quaternion();
  const _sun = new Vector3();
  const _focus = new Vector3();
  const _up = new Vector3();
  let clock = 0;
  let currentLocal = -1;
  let lastDone = -1;
  let sightOverride: { point: Vector3; radius: number } | null = null;
  let lastBloom = -1;
  const footPlane = new Vector3(slot.position[0], slot.position[1], slot.position[2]);

  return {
    tree,
    holder,
    path,
    first,
    last,
    matrix: slotMatrix,
    slot,
    height,
    markers,
    railFor(index, outPos, outLook, portrait = false) {
      if (index < first || index > last) return false;
      const p = railPath(portrait);
      p.sampleRail(p.railTForNode(index - first), outPos, outLook);
      return true;
    },
    sampleRail(t, outPos, outLook, portrait = false) {
      railPath(portrait).sampleRail(t, outPos, outLook);
    },
    seatFor(index, radius, outPos, outUp) {
      if (index < first || index > last) return false;
      if (!markers.seat(index - first, outPos, outUp, radius / TREE_SCALE)) return false;
      outPos.applyMatrix4(slotMatrix);
      outUp.applyMatrix3(normalMatrix).normalize();
      return true;
    },
    setPathState(current, done) {
      const cur = current >= first && current <= last ? current - first : -1;
      if (cur === currentLocal && done === lastDone) return;
      currentLocal = cur;
      lastDone = done;
      markers.setProgress(cur, Math.min(count, Math.max(0, done - first)));
    },
    setHiddenNode(index) {
      markers.setHidden(index !== null && index >= first && index <= last ? index - first : null);
    },
    setSightOverride(point, radius) {
      sightOverride = point ? { point: point.clone(), radius } : null;
    },
    update(dt, camera, sunDirWorld, cameraWorld, frustum) {
      // Cull behind the horizon or outside the frustum (7 draw calls + 3 shadow casters otherwise): the foot on the
      // display sphere, a sphere around the whole tree
      world.toDisplay(footPlane, _w);
      const R = world.options.radius;
      const up = _v.copy(_w).normalize();
      const horizon = Math.acos(Math.min(1, R / Math.max(R + 0.01, cameraWorld.length())));
      const facing = up.dot(_sphere.center.copy(cameraWorld).normalize());
      const reach = Math.cos(Math.min(Math.PI, horizon + (height + 8) / R));
      _sphere.center.copy(_w).addScaledVector(up, height * 0.5);
      _sphere.radius = height * 0.8 + 2;
      holder.visible = facing > reach && frustum.intersectsSphere(_sphere);
      if (!holder.visible) return;
      tree.updateCamera(camera);
      tree.setSunDirection(sunDirWorld);
      tree.update(dt);
      // Markers: clock, and the contact shadows of the stones follow the sun in tree space
      clock += dt;
      markers.update(clock);
      tree.group.getWorldQuaternion(_qInv).invert();
      _sun.copy(sunDirWorld).applyQuaternion(_qInv).normalize();
      if (_sun.dot(sunLocal) < 0.99995) {
        sunLocal.copy(_sun);
        markers.setSunDirection(sunLocal);
      }
      // The current node on the tree stays in sight: lace and needle stars in front of it fade (the rail camera looks
      // through the curtain of hanging twigs); a level plateau under the tree takes over while it is played
      if (sightOverride) {
        tree.setSightFocus(world.toDisplay(sightOverride.point, _focus), sightOverride.radius);
      } else if (currentLocal >= 0 && markers.seat(currentLocal, _focus, _up, 0)) {
        _focus.applyMatrix4(slotMatrix).addScaledVector(_up.applyMatrix3(normalMatrix).normalize(), 0.35);
        tree.setSightFocus(world.toDisplay(_focus, _focus), SIGHT_RADIUS);
      } else tree.setSightFocus(null);
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
      markers.dispose();
      tree.dispose();
    },
  };
}

