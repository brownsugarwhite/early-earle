import { BufferAttribute, BufferGeometry, Group, Mesh, Vector2, Vector3 } from 'three/webgpu';
import { abs, attribute, mix, modelViewMatrix, normalGeometry, positionGeometry, select, uniform, vec3, vec4 } from 'three/tsl';
import { BoardSurfaceMaterial, hexNode, stripes, type BoardFog } from './boardMaterial';
import type { BoardPalette } from './boardPalette';
import { aaStep, type FloatNode, type Vec2Node, type Vec3Node } from '../earle/tsl';

export interface PlateauShape {
  /** Half extents of the flat top (world units) and its centre offset along z. */
  halfX: number;
  halfZ: number;
  centerZ: number;
  /** Distance from the top down to the foot of the skirt (reaches under the terrain). */
  depth: number;
}

/** Profile of the stepped skirt: radial offset from the top outline and height below the top, top → foot. */
const PROFILE: ReadonlyArray<{ out: number; y: number; band: number; wall: boolean }> = [
  { out: 0, y: 0, band: 0, wall: false },
  { out: 0, y: -0.22, band: 1, wall: true },
  { out: 0.2, y: -0.22, band: 1, wall: false },
  { out: 0.2, y: -0.5, band: 2, wall: true },
  { out: 0.42, y: -0.5, band: 2, wall: false },
  { out: 0.42, y: -0.86, band: 3, wall: true },
  { out: 0.62, y: -0.86, band: 3, wall: false },
  { out: 0.62, y: -1, band: 3, wall: true }, // y = -depth (patched at build time)
  { out: 0.78, y: -1, band: 3, wall: false },
];
const SEGMENTS = 96;
/** Superellipse exponent of the top outline: 4.5 = a rounded hilltop, not a tray. */
const SUPER_N = 4.5;
/** Height of the hill hump the plateau morphs from (above the top level). */
const HILL_HEIGHT = 1.0;
/** Wall striations per world unit along the ring (Earle's cliff hatching). */
const STRIATIONS_PER_UNIT = 9;

/** Organic wobble of the outline (≥ 0, so the grid clearance computed for the smooth shape still holds). */
function wobble(theta: number): number {
  return 0.035 * (1 + Math.sin(3 * theta + 1.1)) + 0.018 * (1 + Math.sin(7 * theta + 2.3)) + 0.01 * (1 + Math.sin(13 * theta + 0.4));
}

/**
 * The level plateau: a flattened hill top cut out of the terrain. Flat top (the zone's meadow), a stepped
 * skirt of value bands with fine vertical striations on the walls, an ink offset shadow at the foot. The
 * geometry carries a second shape — the smooth hill it rises from — and `morph` blends between them in the
 * vertex stage (0 = hill, 1 = plateau), so the board appears by heaving out of the ground and flattening.
 */
export class BoardPlateau {
  readonly group = new Group();
  readonly mesh: Mesh;
  readonly morph = uniform(1);
  /** Offset of the ink slab (away from the sun, lift-local xz). */
  private readonly slabOffset = uniform(new Vector3(-0.25, 0, 0.14));
  /** Cell grid (lift-local): half extents and centre z — painted as the ink bed the plates are set into. */
  readonly gridHalf = uniform(vec2Of(1.6, 1.6));
  readonly gridCenterZ = uniform(0);
  private readonly material: BoardSurfaceMaterial;
  private geometry: BufferGeometry | null = null;
  shape: PlateauShape = { halfX: 2, halfZ: 2, centerZ: 0, depth: 1.4 };
  /** Direction (xz, unit) the offset shadow moves toward: away from the sun. */
  readonly shadowDir = new Vector3(-0.7, 0, 0.4);

  constructor(palette: BoardPalette, fog?: BoardFog) {
    this.group.name = 'board-plateau';
    const morph = this.morph;
    const hillPos = attribute('hillPos', 'vec3') as Vec3Node;
    const hillNrm = attribute('hillNrm', 'vec3') as Vec3Node;
    const band = attribute('band', 'float') as FloatNode;
    const striate = attribute('striate', 'float') as FloatNode;
    const along = attribute('along', 'float') as FloatNode;
    const m = morph.smoothstep(0, 1);
    // The ink slab (slab = 1) shares the mesh: pushed away from the sun, and sunk into the ground while the
    // plateau is still a round hill.
    const slab = attribute('slab', 'float') as FloatNode;
    const off = this.slabOffset as unknown as Vec3Node;
    const slabShift = vec3(off.x, m.sub(1).mul(1.6), off.z).mul(slab);
    const positionNode = mix(hillPos, positionGeometry, m).add(slabShift) as unknown as Vec3Node;
    const nLocal = mix(hillNrm, normalGeometry, m).normalize();
    const normalNode = modelViewMatrix.mul(vec4(nLocal, 0)).xyz.normalize() as unknown as Vec3Node;

    const top = hexNode(palette.top);
    const s0 = hexNode(palette.skirt[0] ?? palette.top);
    const s1 = hexNode(palette.skirt[1] ?? palette.top);
    const s2 = hexNode(palette.skirt[2] ?? palette.top);
    const s3 = hexNode(palette.skirt[3] ?? palette.ink);
    let base = select(band.lessThan(0.5), top, s0) as unknown as Vec3Node;
    base = select(band.lessThan(1.5), base, s1) as unknown as Vec3Node;
    base = select(band.lessThan(2.5), base, s2) as unknown as Vec3Node;
    base = select(band.lessThan(3.5), base, s3) as unknown as Vec3Node;
    base = select(band.lessThan(4.5), base, hexNode(palette.ink)) as unknown as Vec3Node;
    // Hill form has no terraces: blend the bands toward one meadow tone while the hill is still round.
    base = mix(mix(top, s1, band.mul(0.2).clamp(0, 1)), base, m) as unknown as Vec3Node;
    // Walls: fine vertical striations (Earle's cliff hatching), integer count around the ring (no seam).
    const lines = stripes(along, 1, 0.1).mul(striate).mul(m);
    let albedo = mix(base, base.mul(0.7), lines) as unknown as Vec3Node;
    // Top: an untextured golden meadow (Earle's fields are flat value planes). Under the cell grid the meadow
    // is cut: an ink bed the plates are set into, so seams, rifts and dips read as crisp ink.
    const isTop = band.lessThan(0.5).select(1, 0).mul(m) as unknown as FloatNode;
    const pg = positionGeometry as unknown as Vec3Node;
    const half = this.gridHalf as unknown as Vec2Node;
    const inX = aaStep(half.x, abs(pg.x)).oneMinus();
    const inZ = aaStep(half.y, abs(pg.z.sub(this.gridCenterZ))).oneMinus();
    const bed = inX.mul(inZ).mul(isTop);
    const ink = hexNode(palette.ink);
    albedo = mix(albedo, ink, bed) as unknown as Vec3Node;
    this.material = new BoardSurfaceMaterial({
      albedo,
      shade: mix(hexNode(palette.plateauShade), ink, bed.max(slab)) as unknown as Vec3Node,
      terminator: 0.02,
      facet: { threshold: 0.55, amount: 0.7 },
      positionNode,
      normalNode,
      fog,
    });
    this.mesh = new Mesh(new BufferGeometry(), this.material);
    this.mesh.name = 'plateau';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;

    this.group.add(this.mesh);
    this.build();
  }

  /** Radius of the top outline around (0, centerZ) in direction (cos θ, sin θ) of the x/z plane. */
  rimRadius(cos: number, sin: number): number {
    return this.outline(cos, sin);
  }

  /** Radius of the organic top outline in direction (cos θ, sin θ) (rounded superellipse + wobble). */
  private outline(cos: number, sin: number): number {
    const { halfX, halfZ } = this.shape;
    const a = Math.pow(Math.abs(cos / halfX), SUPER_N) + Math.pow(Math.abs(sin / halfZ), SUPER_N);
    const r = 1 / Math.pow(Math.max(1e-6, a), 1 / SUPER_N);
    return r * (1 + wobble(Math.atan2(sin, cos)));
  }

  /**
   * Points along the top rim every ~`spacing` units (lift-local x/z, outward unit normal, angle θ where +z,
   * the camera side, is θ = π/2). Used to plant the dome bushes that frame the meadow.
   */
  rimPoints(spacing: number, jitter: (k: number) => number): Array<{ x: number; z: number; nx: number; nz: number; theta: number }> {
    const out: Array<{ x: number; z: number; nx: number; nz: number; theta: number }> = [];
    const { centerZ } = this.shape;
    const steps = 720;
    let acc = 0;
    let next = spacing * (0.5 + jitter(0));
    let px = 0;
    let pz = 0;
    for (let j = 0; j <= steps; j++) {
      const th = (j / steps) * Math.PI * 2;
      const r = this.outline(Math.cos(th), Math.sin(th));
      const x = Math.cos(th) * r;
      const z = Math.sin(th) * r + centerZ;
      if (j > 0) acc += Math.hypot(x - px, z - pz);
      px = x;
      pz = z;
      if (acc >= next) {
        out.push({ x, z, nx: Math.cos(th), nz: Math.sin(th), theta: th });
        next = acc + spacing * (0.75 + 0.5 * jitter(out.length));
      }
    }
    return out;
  }

  /** The ink bed under the plates: grid half extents (lift-local) and its centre z. */
  setGrid(halfX: number, halfZ: number, centerZ = 0): void {
    (this.gridHalf.value as { x: number; y: number }).x = halfX;
    (this.gridHalf.value as { x: number; y: number }).y = halfZ;
    this.gridCenterZ.value = centerZ;
  }

  setShape(shape: PlateauShape): void {
    this.shape = { ...shape, depth: Math.max(1.05, shape.depth) };
    this.build();
  }

  private build(): void {
    const { centerZ, depth } = this.shape;
    const profile = PROFILE.map((p, i) => ({ ...p, y: i >= 7 ? -depth : p.y }));
    const outMax = profile[profile.length - 1]!.out;
    const rings = profile.length + 1; // ring 0 = centre
    const seg = SEGMENTS;
    // Per ring/segment vertex data (shared), then expanded to flat-shaded triangles.
    const rp: number[][] = []; // plateau positions
    const hp: number[][] = []; // hill positions
    const hn: number[][] = []; // hill normals (smooth, analytic)
    const bandOf: number[] = [];
    // Perimeter of the top outline → an integer number of wall striations around the ring (no seam).
    let perimeter = 0;
    for (let j = 0; j < seg; j++) {
      const a0 = (j / seg) * Math.PI * 2;
      const a1 = ((j + 1) / seg) * Math.PI * 2;
      const r0 = this.outline(Math.cos(a0), Math.sin(a0));
      const r1 = this.outline(Math.cos(a1), Math.sin(a1));
      perimeter += Math.hypot(Math.cos(a1) * r1 - Math.cos(a0) * r0, Math.sin(a1) * r1 - Math.sin(a0) * r0);
    }
    const striations = Math.max(8, Math.round(perimeter * STRIATIONS_PER_UNIT));
    const alongAt: number[] = [0];
    {
      let acc = 0;
      for (let j = 0; j < seg; j++) {
        const a0 = (j / seg) * Math.PI * 2;
        const a1 = ((j + 1) / seg) * Math.PI * 2;
        const r0 = this.outline(Math.cos(a0), Math.sin(a0));
        const r1 = this.outline(Math.cos(a1), Math.sin(a1));
        acc += Math.hypot(Math.cos(a1) * r1 - Math.cos(a0) * r0, Math.sin(a1) * r1 - Math.sin(a0) * r0);
        alongAt.push((acc / perimeter) * striations);
      }
    }
    for (let i = 0; i < rings; i++) {
      const prof = i === 0 ? profile[0]! : profile[i - 1]!;
      bandOf.push(prof.band);
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const rho = this.outline(c, s);
        const r = i === 0 ? 0.001 : rho + prof.out;
        const R = rho + outMax;
        const x = c * r;
        const z = s * r + centerZ;
        rp.push([x, prof.y, z]);
        const q = Math.min(1, r / R);
        const k = Math.pow(Math.max(0, 1 - q * q), 1.4);
        const yHill = -depth + (HILL_HEIGHT + depth) * k;
        hp.push([x, yHill, z]);
        const dk = q > 0 ? (HILL_HEIGHT + depth) * 1.4 * Math.pow(Math.max(0, 1 - q * q), 0.4) * (-2 * q) : 0;
        const dydr = dk / R;
        const nx = -dydr * c;
        const nz = -dydr * s;
        const nl = Math.hypot(nx, 1, nz) || 1;
        hn.push([nx / nl, 1 / nl, nz / nl]);
      }
    }
    const idx = (i: number, j: number): number => i * (seg + 1) + j;
    const pos: number[] = [];
    const nrm: number[] = [];
    const hpos: number[] = [];
    const hnrm: number[] = [];
    const band: number[] = [];
    const striate: number[] = [];
    const along: number[] = [];

    const va = new Vector3();
    const vb = new Vector3();
    const vc = new Vector3();
    const pushTri = (a: number, b: number, c: number, bandV: number, wall: number) => {
      const pa = rp[a]!;
      const pb = rp[b]!;
      const pc = rp[c]!;
      va.set(pa[0]!, pa[1]!, pa[2]!);
      vb.set(pb[0]!, pb[1]!, pb[2]!);
      vc.set(pc[0]!, pc[1]!, pc[2]!);
      vb.sub(va);
      vc.sub(va);
      const n = vb.cross(vc);
      if (n.lengthSq() < 1e-10) return;
      n.normalize();
      for (const v of [a, b, c]) {
        const p = rp[v]!;
        const h = hp[v]!;
        const hnv = hn[v]!;
        pos.push(p[0]!, p[1]!, p[2]!);
        nrm.push(n.x, n.y, n.z);
        hpos.push(h[0]!, h[1]!, h[2]!);
        hnrm.push(hnv[0]!, hnv[1]!, hnv[2]!);
        band.push(bandV);
        striate.push(wall);
        // Arc length along the ring in striation units.
        const j = v % (seg + 1);
        along.push(alongAt[j] ?? 0);

      }
    };
    for (let i = 0; i < rings - 1; i++) {
      const prof = profile[i]!; // the ring below ring i (profile index i ↔ ring i+1)
      const wall = prof.wall ? 1 : 0;
      const bandV = prof.wall ? prof.band : bandOf[i + 1]!;
      for (let j = 0; j < seg; j++) {
        const a = idx(i, j);
        const b = idx(i, j + 1);
        const c = idx(i + 1, j + 1);
        const d = idx(i + 1, j);
        // Counter-clockwise seen from outside/above: outward (walls) and upward (top, ledges) normals.
        pushTri(a, b, c, bandV, wall);
        pushTri(a, c, d, bandV, wall);
      }
    }
    const slabFlag: number[] = new Array<number>(pos.length / 3).fill(0);
    // Ink offset slab (neo-brutalist Versatzschatten, one-sided): the *top* outline extruded from just below the
    // rim down to the foot; the vertex stage pushes it away from the sun. On the lit side it hides inside the
    // skirt, on the shadow side it peeks out under the rim as a hard ink band — like the UI's 8px 3px 0 ink.
    {
      const yTop = -0.13;
      const yBot = -depth;
      const ring: Array<[number, number]> = [];
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2;
        const r = this.outline(Math.cos(th), Math.sin(th));
        ring.push([Math.cos(th) * r, Math.sin(th) * r + centerZ]);
      }
      const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
        pos.push(x, y, z);
        nrm.push(nx, ny, nz);
        hpos.push(x, y, z);
        hnrm.push(nx, ny, nz);
        band.push(5);
        striate.push(0);
        along.push(0);
        slabFlag.push(1);
      };
      for (let j = 0; j < seg; j++) {
        const [x0, z0] = ring[j]!;
        const [x1, z1] = ring[j + 1]!;
        put(0, yTop, centerZ, 0, 1, 0);
        put(x1, yTop, z1, 0, 1, 0);
        put(x0, yTop, z0, 0, 1, 0);
        const tx = x1 - x0;
        const tz = z1 - z0;
        const tl = Math.hypot(tx, tz) || 1;
        const nx = tz / tl;
        const nz = -tx / tl;
        put(x0, yTop, z0, nx, 0, nz);
        put(x1, yTop, z1, nx, 0, nz);
        put(x1, yBot, z1, nx, 0, nz);
        put(x0, yTop, z0, nx, 0, nz);
        put(x1, yBot, z1, nx, 0, nz);
        put(x0, yBot, z0, nx, 0, nz);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('slab', new BufferAttribute(new Float32Array(slabFlag), 1));
    geo.setAttribute('normal', new BufferAttribute(new Float32Array(nrm), 3));
    geo.setAttribute('hillPos', new BufferAttribute(new Float32Array(hpos), 3));
    geo.setAttribute('hillNrm', new BufferAttribute(new Float32Array(hnrm), 3));
    geo.setAttribute('band', new BufferAttribute(new Float32Array(band), 1));
    geo.setAttribute('striate', new BufferAttribute(new Float32Array(striate), 1));
    geo.setAttribute('along', new BufferAttribute(new Float32Array(along), 1));

    geo.computeBoundingSphere();
    this.geometry?.dispose();
    this.geometry = geo;
    this.mesh.geometry = geo;

    this.setShadowDir(this.shadowDir);
  }

  /** Pushes the ink offset slab away from the sun (`dir` = direction away from the sun, board-local xz). */
  setShadowDir(dir: Vector3): void {
    this.shadowDir.set(dir.x, 0, dir.z);
    if (this.shadowDir.lengthSq() < 1e-6) this.shadowDir.set(-0.7, 0, 0.4);
    this.shadowDir.normalize();
    (this.slabOffset.value as Vector3).set(this.shadowDir.x * 0.36, 0, this.shadowDir.z * 0.36);
  }

  /**
   * Surface height (lift-local y) at board-local (x, z) for the current morph: the flat top inside the
   * outline blended with the round hill (same formula and smoothstep as the vertex stage).
   */
  heightAt(x: number, z: number): number {
    const { centerZ, depth } = this.shape;
    const dz = z - centerZ;
    const r = Math.hypot(x, dz);
    const th = Math.atan2(dz, x);
    const rho = this.outline(Math.cos(th), Math.sin(th));
    const outMax = PROFILE[PROFILE.length - 1]!.out;
    const q = Math.min(1, r / (rho + outMax));
    const k = Math.pow(Math.max(0, 1 - q * q), 1.4);
    const hill = -depth + (HILL_HEIGHT + depth) * k;
    const flat = r <= rho ? 0 : -depth;
    const m0 = Math.min(1, Math.max(0, this.morph.value));
    const m = m0 * m0 * (3 - 2 * m0);
    return hill + (flat - hill) * m;
  }

  /** Total radial extent of the skirt beyond the top outline (for camera framing and terrain probes). */
  static get skirtOut(): number {
    return PROFILE[PROFILE.length - 1]!.out;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }
}

export { HILL_HEIGHT };

function vec2Of(x: number, y: number): Vector2 {
  return new Vector2(x, y);
}
