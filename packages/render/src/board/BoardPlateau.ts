import { BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicNodeMaterial, Vector3 } from 'three/webgpu';
import { attribute, fract, length, mix, modelViewMatrix, normalGeometry, positionGeometry, select, uniform, vec2, vec4 } from 'three/tsl';
import { BoardSurfaceMaterial, hexNode, stripes, type BoardFog } from './boardMaterial';
import type { BoardPalette } from './boardPalette';
import { aaStep, type FloatNode, type Vec3Node } from '../earle/tsl';

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
const SEGMENTS = 72;
const SUPER_N = 7;
/** Height of the hill hump the plateau morphs from (above the top level). */
const HILL_HEIGHT = 1.0;
/** Rim ornament: dots per world unit along the top edge; wall striations per dot. */
const RIM_DOTS_PER_UNIT = 3;
const STRIATIONS_PER_DOT = 3;

/**
 * The level plateau: a flattened hill top cut out of the terrain. Flat top (the zone's meadow), a stepped
 * skirt of value bands with fine vertical striations on the walls, an ink offset shadow at the foot. The
 * geometry carries a second shape — the smooth hill it rises from — and `morph` blends between them in the
 * vertex stage (0 = hill, 1 = plateau), so the board appears by heaving out of the ground and flattening.
 */
export class BoardPlateau {
  readonly group = new Group();
  readonly mesh: Mesh;
  readonly shadow: Mesh;
  readonly morph = uniform(1);
  private readonly material: BoardSurfaceMaterial;
  private readonly shadowMaterial: MeshBasicNodeMaterial;
  private geometry: BufferGeometry | null = null;
  private shadowGeometry: BufferGeometry | null = null;
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
    const positionNode = mix(hillPos, positionGeometry, m) as unknown as Vec3Node;
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
    // Hill form has no terraces: blend the bands toward one meadow tone while the hill is still round.
    base = mix(mix(top, s1, band.mul(0.2).clamp(0, 1)), base, m) as unknown as Vec3Node;
    // Walls: fine vertical striations (Earle's cliff hatching), integer count around the ring (no seam).
    const lines = stripes(along, STRIATIONS_PER_DOT, 0.1).mul(striate).mul(m);
    let albedo = mix(base, base.mul(0.7), lines) as unknown as Vec3Node;
    // Top: three fine contour lines echo the rim, a row of light dots sits just inside it (Punktrand).
    const rim = attribute('rim', 'float') as FloatNode;
    const isTop = band.lessThan(0.5).select(1, 0).mul(m) as unknown as FloatNode;
    const contourBand = aaStep(0.2, rim).mul(aaStep(0.62, rim).oneMinus());
    const contour = stripes(rim, 7, 0.08).mul(contourBand).mul(isTop);
    albedo = mix(albedo, albedo.mul(0.84), contour) as unknown as Vec3Node;
    const u = fract(along).sub(0.5);
    const v = rim.sub(0.1).mul(RIM_DOTS_PER_UNIT);
    const dot = aaStep(0.17, length(vec2(u, v))).oneMinus().mul(isTop);
    albedo = mix(albedo, hexNode(palette.paper), dot.mul(0.85)) as unknown as Vec3Node;
    this.material = new BoardSurfaceMaterial({
      albedo,
      shade: hexNode(palette.plateauShade),
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

    this.shadowMaterial = new MeshBasicNodeMaterial();
    this.shadowMaterial.colorNode = hexNode(palette.ink);
    this.shadow = new Mesh(new BufferGeometry(), this.shadowMaterial);
    this.shadow.name = 'plateau-ink-shadow';
    this.shadow.frustumCulled = false;
    this.shadow.castShadow = false;
    this.shadow.receiveShadow = false;
    this.group.add(this.shadow, this.mesh);
    this.build();
  }

  /** Radius of the rounded-rectangle top outline in direction (cos θ, sin θ). */
  private outline(cos: number, sin: number): number {
    const { halfX, halfZ } = this.shape;
    const a = Math.pow(Math.abs(cos / halfX), SUPER_N) + Math.pow(Math.abs(sin / halfZ), SUPER_N);
    return 1 / Math.pow(Math.max(1e-6, a), 1 / SUPER_N);
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
    const rimOf: number[] = []; // distance to the top rim (top fan only)
    const bandOf: number[] = [];
    // Perimeter of the top outline → an integer number of rim dots (and striations) around the ring.
    let perimeter = 0;
    for (let j = 0; j < seg; j++) {
      const a0 = (j / seg) * Math.PI * 2;
      const a1 = ((j + 1) / seg) * Math.PI * 2;
      const r0 = this.outline(Math.cos(a0), Math.sin(a0));
      const r1 = this.outline(Math.cos(a1), Math.sin(a1));
      perimeter += Math.hypot(Math.cos(a1) * r1 - Math.cos(a0) * r0, Math.sin(a1) * r1 - Math.sin(a0) * r0);
    }
    const dots = Math.max(8, Math.round(perimeter * RIM_DOTS_PER_UNIT));
    const alongAt: number[] = [0];
    {
      let acc = 0;
      for (let j = 0; j < seg; j++) {
        const a0 = (j / seg) * Math.PI * 2;
        const a1 = ((j + 1) / seg) * Math.PI * 2;
        const r0 = this.outline(Math.cos(a0), Math.sin(a0));
        const r1 = this.outline(Math.cos(a1), Math.sin(a1));
        acc += Math.hypot(Math.cos(a1) * r1 - Math.cos(a0) * r0, Math.sin(a1) * r1 - Math.sin(a0) * r0);
        alongAt.push((acc / perimeter) * dots);
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
        rimOf.push(i === 0 ? rho : 0);
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
    const rimD: number[] = [];
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
        // Arc length along the ring in rim-dot units (walls: striations, top: dot cells).
        const j = v % (seg + 1);
        along.push(alongAt[j] ?? 0);
        rimD.push(rimOf[v] ?? 0);
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
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('normal', new BufferAttribute(new Float32Array(nrm), 3));
    geo.setAttribute('hillPos', new BufferAttribute(new Float32Array(hpos), 3));
    geo.setAttribute('hillNrm', new BufferAttribute(new Float32Array(hnrm), 3));
    geo.setAttribute('band', new BufferAttribute(new Float32Array(band), 1));
    geo.setAttribute('striate', new BufferAttribute(new Float32Array(striate), 1));
    geo.setAttribute('along', new BufferAttribute(new Float32Array(along), 1));
    geo.setAttribute('rim', new BufferAttribute(new Float32Array(rimD), 1));
    geo.computeBoundingSphere();
    this.geometry?.dispose();
    this.geometry = geo;
    this.mesh.geometry = geo;

    // Ink offset shadow (neo-brutalist Versatzschatten, one-sided): the *top* outline extruded from just below
    // the rim down to the foot and pushed away from the sun (`setShadowDir`). On the lit side it hides inside the
    // skirt; on the shadow side it peeks out under the rim as a hard ink band — like the UI's 8px 3px 0 ink.
    const sPos: number[] = [];
    const yTop = -0.13;
    const yBot = -depth;
    const ring: Array<[number, number]> = [];
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const r = this.outline(Math.cos(th), Math.sin(th));
      ring.push([Math.cos(th) * r, Math.sin(th) * r + centerZ]);
    }
    for (let j = 0; j < seg; j++) {
      const [x0, z0] = ring[j]!;
      const [x1, z1] = ring[j + 1]!;
      // top cap (fan, counter-clockwise from above)
      sPos.push(0, yTop, centerZ, x1, yTop, z1, x0, yTop, z0);
      // wall (outward)
      sPos.push(x0, yTop, z0, x1, yTop, z1, x1, yBot, z1);
      sPos.push(x0, yTop, z0, x1, yBot, z1, x0, yBot, z0);
    }
    const sGeo = new BufferGeometry();
    sGeo.setAttribute('position', new BufferAttribute(new Float32Array(sPos), 3));
    sGeo.computeBoundingSphere();
    this.shadowGeometry?.dispose();
    this.shadowGeometry = sGeo;
    this.shadow.geometry = sGeo;
    this.setShadowDir(this.shadowDir);
  }

  /** Pushes the ink offset shadow away from the sun (`dir` = direction away from the sun, board-local xz). */
  setShadowDir(dir: Vector3): void {
    this.shadowDir.set(dir.x, 0, dir.z);
    if (this.shadowDir.lengthSq() < 1e-6) this.shadowDir.set(-0.7, 0, 0.4);
    this.shadowDir.normalize();
    this.applyShadowPose();
  }

  /** The slab only exists for the finished plateau: it sinks into the ground while the hill morphs. */
  applyShadowPose(): void {
    const m0 = Math.min(1, Math.max(0, this.morph.value));
    const m = m0 * m0 * (3 - 2 * m0);
    this.shadow.visible = m > 0.02;
    this.shadow.position.set(this.shadowDir.x * 0.36, -(1 - m) * 1.6, this.shadowDir.z * 0.36);
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
    this.shadowGeometry?.dispose();
    this.material.dispose();
    this.shadowMaterial.dispose();
    this.group.removeFromParent();
  }
}

export { HILL_HEIGHT };
