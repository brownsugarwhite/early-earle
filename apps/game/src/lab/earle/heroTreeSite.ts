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
import { createGrandTrees, grandSpec, layoutGrandTrees, type GrandTreeSite, type GrandTrees } from '@ee/render/earle/tree/grand.ts';
import type { EarlePlanet } from '@ee/render';
import type { PlaneLandmarkSlot } from '@ee/world';
import { TREE_RANGE } from './zones';

/**
 * Levels (1-based) whose nodes leave the ground path and climb the giant tree (trunk → ramp → crown rim): the route
 * entry with `tree` in `content/zones/route.json` (Route 15 + 1: levels 99–114).
 */
export { TREE_RANGE };
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
/**
 * Big siblings of the giant tree (Florian: "um den riesigen Baum auch noch ein paar mehr große Bäume in ähnlichem
 * Stil"): same style, about half the size, each with its own clearing on the plane.
 */
const GRAND_COUNT = 4;
/**
 * Ring of the siblings in giant crown radii (tree units; × 0.4 → ≈ 13–19 world units from the giant's foot): a little
 * further out than the lab's 1.8–2.7 — the map's rail cameras circle the giant at 20–43 tree units, the siblings stand
 * behind them, never between a camera and its node.
 */
const GRAND_RADII: readonly [number, number] = [2.2, 3.2];

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
  /** The big siblings around the giant (children of the tree group: same slot space and display warp); null = none fit. */
  grand: GrandTrees | null;
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
  const first = TREE_RANGE[0] - 1;
  const last = TREE_RANGE[1] - 1;
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
  const portraitTree = heroTreePath({ nodes: count, shape: tree.shape, rail: RAIL_PORTRAIT });
  const portraitPath = transformHeroTreePath(portraitTree, slotMatrix);
  const railPath = (portrait: boolean): HeroTreePath => (portrait ? portraitPath : path);

  // 3) The big siblings: sites in tree space around the giant, off the path start, the incoming and outgoing ground
  //    path and every rail camera (and its sight line); each gets a clearing on the plane (scattered trees, rocks, lakes,
  //    trash and landmarks keep off). Built into the tree group: same slot space, same display warp.
  const inverse = slotMatrix.clone().invert();
  const toTree = (p: readonly number[]): Vector3 => new Vector3(p[0]!, p[1]!, p[2]!).applyMatrix4(inverse);
  const ground: Vector3[] = [];
  for (let k = first - 7; k < first; k++) if (k >= 0) ground.push(toTree(world.path.node(k).position));
  for (let k = last + 1; k <= last + 6; k++) ground.push(toTree(world.path.node(k).position));
  const sites = planGrandSites({
    seed: options.seed,
    heroCrown: tree.shape.R,
    startAngle: plan.startAngle,
    rails: [tree.path, portraitTree],
    ground,
    groundAt,
    inWorld: (x, z) => {
      gp.set(x, 0, z).applyMatrix4(slotMatrix);
      return world.field.sample(gp.x, gp.z).world === options.worldIndex;
    },
  });
  let grand: GrandTrees | null = null;
  let grandReach = 0;
  // Horizon culling per tree (plane foot, top above the sphere, crown reach): the giant and each sibling
  const cullParts: Array<{ x: number; z: number; top: number; reach: number }> = [{ x: slot.position[0], z: slot.position[2], top: slot.position[1] + height, reach: planShape.R * 1.55 * TREE_SCALE }];
  if (sites.length > 0) {
    grand = createGrandTrees({
      sites,
      seed: options.seed,
      quality: options.quality === 'hoch' ? 'hoch' : 'mobil',
      groundAt,
      warp,
      lookup: tree.lookup,
      rows: tree.rows,
      billboard: tree.billboard,
      fog: world.fog,
      fogLookup: world.lookup,
    });
    tree.group.add(grand.group);
    grand.specs.forEach((spec, i) => {
      const site = sites[i]!;
      const reach = spec.crown * (spec.form === 'schirm' ? 1.6 : 1.7);
      grandReach = Math.max(grandReach, (Math.hypot(site.x, site.z) + reach) * TREE_SCALE);
      // Own clearing on the plane (the giant's clearing ends at ≈ 9 units, the siblings stand 11–16 units out)
      gp.set(site.x, 0, site.z).applyMatrix4(slotMatrix);
      world.setLandmark({ id: `hero-tree-grand-${i}`, world: options.worldIndex, x: gp.x, z: gp.z, yawDeg: 0, scale: TREE_SCALE, clearRadius: reach * TREE_SCALE * 0.8 });
      cullParts.push({ x: gp.x, z: gp.z, top: world.heightAt(gp.x, gp.z) + (grand!.tops[i]! + 1) * TREE_SCALE, reach: reach * TREE_SCALE });
    });
  }
  const grandIds = sites.map((_, i) => `hero-tree-grand-${i}`);

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
    grand,
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
      // Cull behind the horizon or outside the frustum (giant and siblings: 11 draw calls + 4 shadow casters per cascade
      // otherwise). The horizon test runs on the plane (arc from the camera's foot to each tree's foot, less its crown
      // reach): a tree of height H peeks up to acos(R / (R + H)) over the horizon — seen from world 07 the giant
      // 67 units ahead is still hidden. The display mapping only holds up to π·R from the focus — the tree 200 units ahead
      // would otherwise come round the globe once and stand next to the camera.
      const R = world.options.radius;
      world.mapping.toFlatCpu(cameraWorld, _v);
      const footX = _v.x + world.focus.x;
      const footZ = _v.z + world.focus.z;
      const horizon = Math.acos(Math.min(1, R / Math.max(R + 0.01, cameraWorld.length())));
      let peeks = false;
      for (const part of cullParts) {
        const arc = Math.hypot(part.x - footX, part.z - footZ) - part.reach;
        if (arc / R <= Math.min(Math.PI * 0.9, horizon + Math.acos(R / (R + Math.max(0, part.top))) + 0.05)) {
          peeks = true;
          break;
        }
      }
      if (!peeks) {
        holder.visible = false;
        return;
      }
      world.toDisplay(footPlane, _w);
      const up = _v.copy(_w).normalize();
      _sphere.center.copy(_w).addScaledVector(up, height * 0.5);
      _sphere.radius = Math.max(height * 0.8, grandReach) + 2;
      holder.visible = frustum.intersectsSphere(_sphere);
      if (!holder.visible) return;
      tree.updateCamera(camera);
      grand?.updateCamera(camera);
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
      for (const id of grandIds) world.removeLandmark(id);
      markers.dispose();
      grand?.dispose();
      tree.dispose();
    },
  };
}

/**
 * Sites of the big siblings (tree space, the giant's foot at the origin): `layoutGrandTrees` spreads them over the free
 * arc (off the path start at the root tip); a site that comes near a rail camera, blocks a rail camera's sight line to
 * its node, stands on the ground path before or after the stretch or outside the tree's world is taken out of the arc
 * and the layout runs again. Sites that never fit are dropped (fewer siblings rather than one in the way).
 */
function planGrandSites(o: {
  seed: number;
  heroCrown: number;
  startAngle: number;
  rails: HeroTreePath[];
  ground: Vector3[];
  groundAt: (x: number, z: number) => number;
  inWorld: (x: number, z: number) => boolean;
}): GrandTreeSite[] {
  // Rail cameras and their look points (tree space), finely sampled
  const probes: Array<{ p: Vector3; l: Vector3 }> = [];
  for (const rail of o.rails) {
    for (let i = 0; i <= 120; i++) {
      const p = new Vector3();
      const l = new Vector3();
      rail.sampleRail(i / 120, p, l);
      probes.push({ p, l });
    }
  }
  const avoid: Array<{ angle: number; width: number }> = [{ angle: o.startAngle, width: 0.7 }];
  // Incoming path (the nodes before the stretch) and the way on after it
  for (const g of o.ground) avoid.push({ angle: Math.atan2(g.z, g.x), width: Math.min(0.6, Math.max(0.18, 9 / Math.max(1, Math.hypot(g.x, g.z)))) });
  const centre = new Vector3();
  const conflicts = (site: GrandTreeSite, index: number): boolean => {
    const spec = grandSpec(index, o.seed, site.spec);
    const reach = spec.crown * (spec.form === 'schirm' ? 1.6 : 1.7);
    if (!o.inWorld(site.x, site.z)) return true;
    const foot = o.groundAt(site.x, site.z);
    centre.set(site.x, foot + spec.height + spec.crown * 0.5, site.z);
    const r = reach * 0.9;
    for (const g of o.ground) if (Math.hypot(g.x - site.x, g.z - site.z) < reach + 3) return true;
    for (const { p, l } of probes) {
      // Camera in (or right next to) the crown, or beside the trunk below it
      const lateral = Math.hypot(p.x - site.x, p.z - site.z);
      if (Math.hypot(lateral, (p.y - centre.y) / 1.2) < r + 4) return true;
      if (lateral < 4 && p.y < centre.y) return true;
      // Sight line camera → node through the crown
      if (segmentHitsSphere(p, l, centre, r * 0.85)) return true;
    }
    return false;
  };
  for (let iter = 0; iter < 24; iter++) {
    const sites = layoutGrandTrees({ count: GRAND_COUNT, seed: o.seed, heroCrown: o.heroCrown, minRadius: o.heroCrown * GRAND_RADII[0], maxRadius: o.heroCrown * GRAND_RADII[1], avoid });
    const bad = sites.findIndex((site, i) => conflicts(site, i));
    if (bad < 0) return sites;
    avoid.push({ angle: Math.atan2(sites[bad]!.z, sites[bad]!.x), width: 0.2 });
  }
  // No full set fits: keep the sites that do (their forms follow their original order)
  const sites = layoutGrandTrees({ count: GRAND_COUNT, seed: o.seed, heroCrown: o.heroCrown, minRadius: o.heroCrown * GRAND_RADII[0], maxRadius: o.heroCrown * GRAND_RADII[1], avoid });
  return sites.flatMap((site, i) => (conflicts(site, i) ? [] : [{ ...site, spec: { ...grandSpec(i, o.seed, site.spec) } }]));
}

/** Does the segment a → b pass through the sphere (centre c, radius r)? */
function segmentHitsSphere(a: Vector3, b: Vector3, c: Vector3, r: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len2 = dx * dx + dy * dy + dz * dz;
  const t = len2 > 1e-9 ? Math.min(1, Math.max(0, ((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / len2)) : 0;
  return Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y, a.z + dz * t - c.z) < r;
}
