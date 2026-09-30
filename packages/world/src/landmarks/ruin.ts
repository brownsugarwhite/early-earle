import { hash32, mulberry32 } from '../rng';
import { MIN_PLATEAU_RADIUS, clearPlateau, finishBlueprint } from './rock';
import { FOOT_SINK, TAU, ccw, clamp, lerp, lowestGround, prism, scalePoly } from './shapes';
import type { ArcadeSpec, BushSpec, LandmarkBlueprint, LandmarkWaypoint, LocalGround, P2, P3, Prism, VineSpec } from './types';

export interface RuinOptions {
  ground?: LocalGround;
  /** Terrace height above the reference ground. */
  height?: number;
  /** Usable terrace radius (≥ MIN_PLATEAU_RADIUS). */
  plateau?: number;
  /** Tower crown: broken (jagged) or a gothic spire roof. Default: from the seed. */
  spire?: boolean;
  mirror?: boolean;
  /** Detail 0..1 (vines, bushes, rubble). */
  detail?: number;
}

const UP: P3 = [0, 1, 0];
const FLAT: LocalGround = () => 0;

/** Axis-aligned box polygon (x0..x1, z0..z1). */
function box(x0: number, z0: number, x1: number, z1: number): P2[] {
  return ccw([
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ]);
}

/** Box rotated by `a` about its centre. */
function rotatedBox(cx: number, cz: number, hx: number, hz: number, a: number): P2[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const pts: P2[] = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ];
  return ccw(pts.map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c] as P2));
}

/** Regular polygon. */
function ngon(cx: number, cz: number, r: number, n: number, phase = 0): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return ccw(out);
}

/** A climbing vine on a wall: meandering stem from the foot upward plus curls (Ebene 22's thorn creepers). */
function vineOnWall(rand: () => number, origin: P3, up: P3, across: P3, normal: P3, height: number, out: VineSpec[]): void {
  const pts: P3[] = [];
  const n = 14;
  const amp = 0.25 + rand() * 0.35;
  const freq = 1.2 + rand() * 1.4;
  const phase = rand() * TAU;
  let lastSide = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const h = t * height;
    const s = Math.sin(t * freq * TAU + phase) * amp * (0.4 + t * 0.6);
    pts.push([origin[0] + up[0] * h + across[0] * s, origin[1] + up[1] * h + across[1] * s, origin[2] + up[2] * h + across[2] * s]);
    // curls branch off at the swings
    const side = Math.sign(Math.cos(t * freq * TAU + phase));
    if (i > 2 && side !== lastSide && rand() < 0.7) {
      const curl: P3[] = [];
      const base = pts[pts.length - 1]!;
      const r0 = 0.18 + rand() * 0.16;
      const dir = side >= 0 ? 1 : -1;
      for (let k = 0; k < 9; k++) {
        const u = k / 8;
        const a = u * TAU * 0.95;
        const rr = r0 * (1 - u * 0.75);
        const x = dir * (r0 - Math.cos(a) * rr);
        const y = Math.sin(a) * rr + u * 0.08;
        curl.push([base[0] + across[0] * x + up[0] * y, base[1] + across[1] * x + up[1] * y, base[2] + across[2] * x + up[2] * y]);
      }
      out.push({ path: curl, normal, width: 0.045 });
    }
    lastSide = side;
  }
  out.push({ path: pts, normal, width: 0.07 });
}

/**
 * **Hohe Ruine** (Ebene 22, Sleeping-Beauty backgrounds): a raised stone terrace (the level stands on it) with a
 * grand stair climbing along its facade from the right, a lancet arcade along the back edge (one bay broken), a tall
 * tower at the back-right corner (broken crown or a gothic spire), a small turret at the back-left, broken wall stubs
 * on the flanks, a rubble slope down the left side (descent), thorn vines on the walls and Earle dome bushes at the
 * foot.
 */
export function buildRuin(seed: number, o: RuinOptions = {}): LandmarkBlueprint {
  const rand = mulberry32(hash32('landmark-ruin', seed));
  const ground = o.ground ?? FLAT;
  const detail = o.detail ?? 1;
  const Ht = o.height ?? 4.2 + rand() * 1.3;
  const usable = Math.max(MIN_PLATEAU_RADIUS, o.plateau ?? 4.8 + rand() * 0.35);
  const S = usable + 0.6;
  const back = S + 1.35;
  const cut = 1.5;
  const prisms: Prism[] = [];

  // terrace: cut-corner square, deeper at the back (the arcade stands outside the board circle), battered walls
  const terraceTop: P2[] = ccw([
    [S, -back + cut],
    [S, S - cut],
    [S - cut, S],
    [-S + cut, S],
    [-S, S - cut],
    [-S, -back + cut],
    [-S + cut, -back],
    [S - cut, -back],
  ]);
  const batter = 1.05;
  const terraceBase = scalePoly(terraceTop, batter);
  prisms.push({
    base: terraceBase,
    top: terraceTop,
    y0: lowestGround(terraceBase, ground) - FOOT_SINK,
    y1: Ht,
    tilt: [0, 0],
    apex: 0,
    apexOffset: [0, 0],
    jag: [],
    surface: 'stone',
    cap: 'cut',
    role: 'terrace',
    variant: rand(),
  });

  // grand stair along the facade: from the front-right corner (ground) leftward up to the top
  const rise = 0.36;
  const steps = Math.max(8, Math.ceil(Ht / rise));
  const run = 0.62;
  const depth = 1.9;
  const zWall = S * batter - 0.25;
  const xStart = S + 0.9;
  const stairWay: LandmarkWaypoint[] = [];
  for (let k = 0; k < steps; k++) {
    const x1 = xStart - k * run;
    const x0 = x1 - run - (k === steps - 1 ? 0.6 : 0.02);
    const top = Ht * ((k + 1) / steps);
    prisms.push(prism(box(x0, zWall - 0.4, x1, zWall + depth), top, 'stair', ground, { surface: 'stone', cap: 'cut', variant: rand() }));
    stairWay.push({ position: [(x0 + x1) / 2, top, zWall + depth * 0.55], normal: UP, kind: 'stair', width: depth * 0.9 });
  }
  const xEnd = xStart - steps * run;
  // balustrade: a low wall on the stair's outer edge, one block per two steps (gothic silhouette)
  for (let k = 0; k < steps; k += 2) {
    const x1 = xStart - k * run;
    const x0 = x1 - run * 2;
    const top = Ht * ((k + 1) / steps) + 0.55;
    prisms.push(prism(box(x0, zWall + depth - 0.28, x1, zWall + depth), top, 'balustrade', ground, { surface: 'stone', cap: rand() < 0.3 ? 'broken' : 'cut', jag: rand() < 0.3 ? [0, -0.3, 0.1, -0.2] : [], variant: rand() }));
  }

  // The low sun stands to the right of the viewer: everything tall stands left (tower back-left, arcade on the left
  // edge, turret front-left), so its long shadows fall away from the terrace. Tower at the back-left corner.
  const towerR = 1.7 + rand() * 0.35;
  const towerC: P2 = [-S + 0.5, -back + 0.5];
  const towerTop = Ht + 6 + rand() * 2.5;
  const spire = o.spire ?? rand() < 0.4;
  const towerPoly = ngon(towerC[0], towerC[1], towerR, 8, rand() * 0.3);
  const towerJag = spire ? [] : towerPoly.map((_, i) => (i % 2 === 0 ? 0.35 + rand() * 0.9 : -0.2 - rand() * 0.9));
  prisms.push(prism(towerPoly, towerTop, 'tower', ground, { taper: 0.93, surface: 'stone', cap: spire ? 'cut' : 'broken', jag: towerJag, variant: rand() }));
  if (spire) {
    // gothic spire roof: overhanging octagon, steep cone
    const roofBase = ngon(towerC[0], towerC[1], towerR * 1.08, 8, 0.2);
    prisms.push(prism(roofBase, towerTop + 0.25, 'roof', ground, { y0: towerTop - 0.2, surface: 'roof', cap: 'facet', apex: towerR * 3.2, taper: 0.98, variant: rand() }));
  }
  // corbel ring below the crown (a wider band of stone)
  prisms.push(prism(ngon(towerC[0], towerC[1], towerR * 1.02, 8, 0.1), towerTop - 0.9, 'tower-band', ground, { y0: towerTop - 1.5, surface: 'stone', cap: 'cut', variant: rand() }));
  // a broken turret on the front-left corner (left of the stair's top), its shadow falls toward the viewer
  const turretR = 1.05 + rand() * 0.25;
  const turretC: P2 = [-S + 0.45, S - 0.45];
  const turretTop = Ht + 1.4 + rand() * 1.3;
  const turretPoly = ngon(turretC[0], turretC[1], turretR, 6, rand());
  prisms.push(prism(turretPoly, turretTop, 'turret', ground, { taper: 0.95, surface: 'stone', cap: 'broken', jag: turretPoly.map(() => (rand() - 0.6) * 1.2), variant: rand() }));

  // lancet arcade along the left edge (between tower and turret), one bay broken
  const arcX = -usable - 0.62;
  const arcade: ArcadeSpec = {
    from: [arcX, -back + towerR + 1.0],
    to: [arcX, S - turretR - 0.9],
    y: Ht,
    pierHeight: 2.5 + rand() * 0.6,
    rise: 1.5 + rand() * 0.4,
    depth: 0.55,
    pier: 0.52,
    bays: 3,
    broken: { [rand() < 0.5 ? 0 : 2]: 0.35 + rand() * 0.3 },
  };

  // a low broken wall on the back edge (low enough that its shadow ends before the board)
  {
    const z = -back + 0.26;
    const x0 = -S + towerR + 0.9 + rand() * 0.6;
    const x1 = x0 + 2.2 + rand() * 1.6;
    prisms.push(prism(box(x0, z - 0.24, x1, z + 0.24), Ht + 0.35 + rand() * 0.25, 'wall', ground, { y0: Ht - 0.4, surface: 'stone', cap: 'broken', jag: [0, -0.25, 0.1, -0.15], variant: rand() }));
  }

  // rubble slope down the right side toward the back (descent), below the terrace height (no shadow on the board)
  const rubbleWay: LandmarkWaypoint[] = [];
  const nR = 6;
  const from: P2 = [S - 0.2, -S * 0.3];
  const to: P2 = [S + 4.4, -S * 0.3 - 3.4];
  for (let k = 0; k < nR; k++) {
    const t = (k + 0.5) / nR;
    const cx = lerp(from[0], to[0], t) + (rand() - 0.5) * 0.3;
    const cz = lerp(from[1], to[1], t) + (rand() - 0.5) * 0.3;
    const top = lerp(Ht - 0.45, 0.55, t) + (rand() - 0.5) * 0.12;
    const a = rand() * TAU;
    const hx = 0.62 + rand() * 0.25;
    const hz = 0.55 + rand() * 0.25;
    const block = prism(rotatedBox(cx, cz, hx, hz, a), Math.max(top, ground(cx, cz) + 0.3), 'rubble', ground, { surface: 'rubble', cap: 'cut', tilt: [(rand() - 0.5) * 0.18, (rand() - 0.5) * 0.18], variant: rand() });
    prisms.push(block);
    rubbleWay.push({ position: [cx, block.y1, cz], normal: UP, kind: 'rubble', width: 1.1 });
    // a smaller tumbled block beside it
    if (detail > 0.3) {
      const bx = cx + Math.cos(a) * 0.9;
      const bz = cz + Math.sin(a) * 0.9;
      prisms.push(prism(rotatedBox(bx, bz, 0.35, 0.3, rand() * TAU), Math.max(0.35, top - 0.5 - rand() * 0.6), 'rubble', ground, { surface: 'rubble', cap: 'cut', tilt: [(rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3], variant: rand() }));
    }
  }

  // vines on the facade and the tower
  const vines: VineSpec[] = [];
  const nFacade = Math.round(2 + 3 * detail);
  for (let i = 0; i < nFacade; i++) {
    const x = lerp(-S + 1.2, S - 1.2, (i + 0.3 + rand() * 0.4) / nFacade);
    // under the stair the wall is hidden: vines only on the part left of the stair's upper steps or right of it
    const wallZ = S * lerp(batter, 1, 0) + 0.03;
    vineOnWall(rand, [x, lowestGround([[x, wallZ]], ground) - 0.2, wallZ], [0, 1, 0], [1, 0, 0], [0, 0, 1], Ht * (0.55 + rand() * 0.45), vines);
  }
  for (let i = 0; i < Math.round(1 + 2 * detail); i++) {
    const a = Math.PI * (0.35 + rand() * 0.5);
    const r = towerR * 1.0 + 0.04;
    const dir: P3 = [Math.cos(a), 0, Math.sin(a)];
    vineOnWall(rand, [towerC[0] + dir[0] * r, lowestGround([[towerC[0] + dir[0] * r, towerC[1] + dir[2] * r]], ground) - 0.2, towerC[1] + dir[2] * r], [0, 1, 0], [-dir[2], 0, dir[0]], dir, (towerTop - 1.6) * (0.5 + rand() * 0.4), vines);
  }
  for (const s of [-1, 1]) {
    const z = lerp(-back + cut + 0.4, S - cut - 0.4, rand());
    vineOnWall(rand, [s * (S * batter + 0.03), lowestGround([[s * S * batter, z]], ground) - 0.2, z], [0, 1, 0], [0, 0, 1], [s, 0, 0], Ht * (0.6 + rand() * 0.4), vines);
  }

  // Earle dome bushes at the foot, on the terrace behind the arcade, beside the stair
  const bushes: BushSpec[] = [];
  const addBush = (x: number, z: number, r: number, onTop = false) => {
    const y = (onTop ? Ht : ground(x, z)) + r * 0.18;
    bushes.push({ center: [x, y, z], radius: r, squash: 0.62 + rand() * 0.12, tone: rand() });
  };
  const nFoot = Math.round(6 + 8 * detail);
  for (let i = 0; i < nFoot; i++) {
    const a = rand() * TAU;
    const x = Math.cos(a) * (S * batter + 0.8 + rand() * 1.8);
    const z = Math.sin(a) * (S * batter + 0.8 + rand() * 1.8) - 0.6;
    if (z > S && x > xEnd - 0.5 && x < xStart + 1.8) continue; // the stair stays free
    if (x > S && z < 0 && z > -S - 5) continue; // the rubble slope stays free
    addBush(x, z, 0.7 + rand() * 0.9);
  }
  addBush(xStart + 1.6, zWall + depth * 0.4, 1.0 + rand() * 0.3);
  addBush(towerC[0] - towerR - 0.6, towerC[1] + 1.0, 1.1 + rand() * 0.4);
  addBush(arcX + 0.05, arcade.from[1] - 0.45, 0.55, true);
  addBush(arcX + 0.05, arcade.to[1] + 0.5, 0.5, true);

  const top: LandmarkWaypoint = { position: [0, Ht, 0], normal: UP, kind: 'top', width: usable * 2 };
  const ascent: LandmarkWaypoint[] = [
    { position: [xStart + 1.3, ground(xStart + 1.3, zWall + depth * 0.6), zWall + depth * 0.6], normal: UP, kind: 'ground', width: 1.6 },
    ...stairWay,
    { position: [xEnd + 0.3, Ht, S - 0.9], normal: UP, kind: 'landing', width: 1.8 },
    top,
  ];
  const endX = to[0] + 1.3;
  const endZ = to[1] - 1.0;
  const descent: LandmarkWaypoint[] = [{ ...top }, { position: [S - 1.0, Ht, from[1] + 0.2], normal: UP, kind: 'landing', width: 1.6 }, ...rubbleWay, { position: [endX, ground(endX, endZ), endZ], normal: UP, kind: 'ground', width: 1.6 }];

  clearPlateau(prisms, usable, Ht);
  return finishBlueprint(
    'ruin',
    seed,
    {
      prisms,
      falls: [],
      pools: [],
      mist: [],
      arcades: [arcade],
      vines,
      bushes,
      anchors: [{ id: 'terrace', kind: 'terrace', position: [0, Ht, 0], normal: UP, radius: usable, height: Ht, facing: [0, 1], site: 'ruin' }],
      route: { ascent, descent },
      carves: [],
      connections: [],
    },
    // tall parts stay left of the board (the sun comes from the right): mirror only on request
    o.mirror ?? false,
  );
}

/** Height of the arcade's pointed arch (intrados) at `u` ∈ [0, 1] across a bay of span `w`, above the springing line. */
export function lancetHeight(u: number, span: number, rise: number): number {
  // two circle arcs meeting at the apex (equilateral-ish lancet): centre of the left arc on the right springing point
  const x = clamp(u, 0, 1) * span;
  const left = x <= span / 2;
  const R = (span * span * 0.25 + rise * rise) / span; // radius through springing point and apex
  const cx = left ? R : span - R;
  const dx = x - cx;
  return Math.sqrt(Math.max(0, R * R - dx * dx));
}
