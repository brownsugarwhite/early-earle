import { BufferAttribute, BufferGeometry, Group, Mesh, Vector2, Vector3 } from 'three/webgpu';
import { abs, attribute, float, fract, length, mix, modelViewMatrix, normalGeometry, positionGeometry, select, smoothstep, uniform, vec3, vec4 } from 'three/tsl';
import { hexToLinear } from '../common/tsl';
import { BoardSurfaceMaterial, stripes, type BoardFog } from './boardMaterial';
import type { BoardPalette } from './boardPalette';
import { aaStep, type FloatNode, type Vec2Node, type Vec3Node } from '../earle/tsl';
import { earleGradients, mixInk } from '../earle/gradients';

export interface PlateauShape {
  /** Half extents of the flat top (world units) and its centre offset along z. */
  halfX: number;
  halfZ: number;
  centerZ: number;
  /** Distance from the top down to the foot of the skirt (reaches under the terrain). */
  depth: number;
  /** Lift-local height of the lowest ground under the footprint (the pool's water level at a shore). */
  ground?: number;
}

/**
 * Skirt families — the plateau takes the form of the place it stands in:
 * `meadow` a low, stepped hilltop cut (the default), `ledge` a rock ledge with tall striated walls and deep
 * terraces, `crown` the rounded shoulder of a crown dome, `bar` a flat sand bar that slopes into its pool,
 * `drift` a soft snow drift.
 */
export type PlateauKind = 'meadow' | 'ledge' | 'crown' | 'bar' | 'drift';

/** Top ornament (fragment stage): none, snow lines, scrap hatch, dotted dome skin, perspective rays. */
export type PlateauPattern = 'none' | 'snow' | 'hatch' | 'dots' | 'rays';

/** Rim decoration the board plants around the top (see BoardRenderer). */
export interface PlateauRim {
  family: 'dome' | 'spire' | 'shard' | 'box' | 'none';
  /** Body colours (two alternating) and the light dots on lit edges. */
  body: string;
  light: string;
  /** Count along the rim relative to the default (1 = a closed hedge, 0.3 = a few). */
  density: number;
  /** Height multiplier. */
  height: number;
  /** Colour of the dots on the lit edges (domes); default: the board palette's bush dots. */
  dot?: string;
}

/** How a level's plateau looks where it stands (colours sRGB hex). */
export interface PlateauStyle {
  kind: PlateauKind;
  top: string;
  /** Skirt bands from the top ledge down. */
  skirt: [string, string, string, string];
  /** In the sun's shadow / beyond the terminator. */
  shade: string;
  ink: string;
  pattern?: PlateauPattern;
  patternColor?: string;
  /** Wall striations (Earle's cliff hatching): density multiplier (1 = default) and depth 0..1. */
  striation?: number;
  rim?: PlateauRim;
  /** A pool around the foot (shore sites): water ink and its light band. */
  pool?: { water: string; band: string } | null;
}

interface ProfileStep {
  out: number;
  y: number;
  band: number;
  wall: boolean;
}

/** Profiles: radial offset from the top outline and height below the top, top → foot (last two = foot, patched). */
const PROFILES: Record<PlateauKind, ProfileStep[]> = {
  meadow: [
    { out: 0, y: 0, band: 0, wall: false },
    { out: 0, y: -0.22, band: 1, wall: true },
    { out: 0.2, y: -0.22, band: 1, wall: false },
    { out: 0.2, y: -0.5, band: 2, wall: true },
    { out: 0.42, y: -0.5, band: 2, wall: false },
    { out: 0.42, y: -0.86, band: 3, wall: true },
    { out: 0.62, y: -0.86, band: 3, wall: false },
    { out: 0.62, y: -1, band: 3, wall: true },
    { out: 0.78, y: -1, band: 3, wall: false },
  ],
  // Rock ledge: a thin grass lip, then tall striated walls with two narrow terraces.
  ledge: [
    { out: 0, y: 0, band: 0, wall: false },
    { out: 0, y: -0.12, band: 1, wall: true },
    { out: 0.08, y: -0.12, band: 1, wall: false },
    { out: 0.1, y: -0.78, band: 2, wall: true },
    { out: 0.3, y: -0.78, band: 2, wall: false },
    { out: 0.34, y: -1.35, band: 3, wall: true },
    { out: 0.5, y: -1.35, band: 3, wall: false },
    { out: 0.56, y: -1, band: 3, wall: true },
    { out: 0.72, y: -1, band: 3, wall: false },
  ],
  // Crown dome shoulder: rounded bands bulging out, no hard terraces.
  crown: [
    { out: 0, y: 0, band: 0, wall: false },
    { out: 0.14, y: -0.08, band: 1, wall: false },
    { out: 0.3, y: -0.24, band: 1, wall: true },
    { out: 0.42, y: -0.46, band: 2, wall: true },
    { out: 0.48, y: -0.7, band: 2, wall: true },
    { out: 0.46, y: -0.92, band: 3, wall: true },
    { out: 0.4, y: -1.1, band: 3, wall: true },
    { out: 0.34, y: -1, band: 3, wall: true },
    { out: 0.3, y: -1, band: 3, wall: false },
  ],
  // Sand bar: a gentle bevel into the water.
  bar: [
    { out: 0, y: 0, band: 0, wall: false },
    { out: 0.18, y: -0.04, band: 1, wall: false },
    { out: 0.42, y: -0.12, band: 1, wall: false },
    { out: 0.62, y: -0.22, band: 2, wall: false },
    { out: 0.78, y: -0.3, band: 2, wall: true },
    { out: 0.86, y: -0.5, band: 3, wall: true },
    { out: 0.9, y: -0.7, band: 3, wall: true },
    { out: 0.92, y: -1, band: 3, wall: true },
    { out: 1.0, y: -1, band: 3, wall: false },
  ],
  // Snow drift: soft rounded steps.
  drift: [
    { out: 0, y: 0, band: 0, wall: false },
    { out: 0.12, y: -0.06, band: 0, wall: false },
    { out: 0.26, y: -0.2, band: 1, wall: false },
    { out: 0.36, y: -0.4, band: 1, wall: true },
    { out: 0.5, y: -0.52, band: 2, wall: false },
    { out: 0.6, y: -0.74, band: 2, wall: true },
    { out: 0.7, y: -0.86, band: 3, wall: false },
    { out: 0.74, y: -1, band: 3, wall: true },
    { out: 0.86, y: -1, band: 3, wall: false },
  ],
};
const PATTERN_CODE: Record<PlateauPattern, number> = { none: 0, snow: 1, hatch: 2, dots: 3, rays: 4 };
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

function colorUniform(hex: string) {
  const [r, g, b] = hexToLinear(hex);
  return uniform(new Vector3(r, g, b));
}

function setColor(u: { value: Vector3 }, hex: string): void {
  const [r, g, b] = hexToLinear(hex);
  u.value.set(r, g, b);
}

/** The board palette's plateau as a style (the meadow of the zone — the look before the sites existed). */
export function defaultPlateauStyle(palette: BoardPalette): PlateauStyle {
  return {
    kind: 'meadow',
    top: palette.top,
    skirt: [palette.skirt[0] ?? palette.top, palette.skirt[1] ?? palette.top, palette.skirt[2] ?? palette.top, palette.skirt[3] ?? palette.ink],
    shade: palette.plateauShade,
    ink: palette.ink,
    pattern: 'none',
    striation: 1,
    rim: { family: 'dome', body: palette.bush, light: palette.bushLight, density: 1, height: 1 },
    pool: null,
  };
}

/**
 * The level plateau: a flattened piece of the place it stands in, cut out of the terrain. Flat top, a skirt of value
 * bands (its family and colours follow the site: meadow, rock ledge, crown dome, sand bar, snow drift — see
 * `setStyle`), fine vertical striations on the walls, an ink offset shadow at the foot and, at a shore, a pool ring
 * around the foot. The geometry carries a second shape — the smooth hill it rises from — and `morph` blends between
 * them in the vertex stage (0 = hill, 1 = plateau), so the board appears by heaving out of the ground and flattening.
 * Colours are uniforms: a new site costs a geometry rebuild, never a shader compile.
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
  style: PlateauStyle;
  private readonly uTop;
  private readonly uSkirt;
  private readonly uShade;
  private readonly uInk;
  private readonly uPattern = uniform(0);
  private readonly uPatternColor;
  private readonly uStriation = uniform(1);
  private readonly uWater;
  private readonly uWaterBand;
  private readonly uTime = uniform(0);

  constructor(palette: BoardPalette, fog?: BoardFog) {
    this.group.name = 'board-plateau';
    this.style = defaultPlateauStyle(palette);
    this.uTop = colorUniform(this.style.top);
    this.uSkirt = this.style.skirt.map((c) => colorUniform(c));
    this.uShade = colorUniform(this.style.shade);
    this.uInk = colorUniform(this.style.ink);
    this.uPatternColor = colorUniform(palette.paper);
    this.uWater = colorUniform('#10202a');
    this.uWaterBand = colorUniform('#5f8fa0');
    const morph = this.morph;
    const hillPos = attribute('hillPos', 'vec3') as Vec3Node;
    const hillNrm = attribute('hillNrm', 'vec3') as Vec3Node;
    const band = attribute('band', 'float') as FloatNode;
    const striate = attribute('striate', 'float') as FloatNode;
    const along = attribute('along', 'float') as FloatNode;
    const m = morph.smoothstep(0, 1);
    // The ink slab (slab = 1) shares the mesh: pushed away from the sun, and sunk into the ground while the
    // plateau is still a round hill. The pool ring (slab = 2) lies flat at the foot and never moves sideways.
    const slabAttr = attribute('slab', 'float') as FloatNode;
    const slab = slabAttr.lessThan(1.5).select(slabAttr, float(0)) as unknown as FloatNode;
    const isPool = slabAttr.greaterThan(1.5).select(float(1), float(0)) as unknown as FloatNode;
    const off = this.slabOffset as unknown as Vec3Node;
    const slabShift = vec3(off.x, m.sub(1).mul(1.6), off.z).mul(slab);
    const poolSink = vec3(0, m.sub(1).mul(2.2), 0).mul(isPool);
    const positionNode = mix(hillPos, positionGeometry, m).add(slabShift).add(poolSink) as unknown as Vec3Node;
    const nLocal = mix(hillNrm, normalGeometry, m).normalize();
    const normalNode = modelViewMatrix.mul(vec4(nLocal, 0)).xyz.normalize() as unknown as Vec3Node;

    const top = this.uTop as unknown as Vec3Node;
    const s0 = this.uSkirt[0] as unknown as Vec3Node;
    const s1 = this.uSkirt[1] as unknown as Vec3Node;
    const s2 = this.uSkirt[2] as unknown as Vec3Node;
    const s3 = this.uSkirt[3] as unknown as Vec3Node;
    const ink = this.uInk as unknown as Vec3Node;
    let base = select(band.lessThan(0.5), top, s0) as unknown as Vec3Node;
    base = select(band.lessThan(1.5), base, s1) as unknown as Vec3Node;
    base = select(band.lessThan(2.5), base, s2) as unknown as Vec3Node;
    base = select(band.lessThan(3.5), base, s3) as unknown as Vec3Node;
    base = select(band.lessThan(4.5), base, ink) as unknown as Vec3Node;
    // Hill form has no terraces: blend the bands toward one meadow tone while the hill is still round.
    base = mix(mix(top, s1, band.mul(0.2).clamp(0, 1)), base, m) as unknown as Vec3Node;
    // Earle gradient inside the hard bands (like the rocks): the skirt deepens from its lip to its foot and the top a
    // touch toward its rim — the same shift on both sides of a band edge, so every edge keeps its full jump.
    const soft = earleGradients.surface;
    const pgy = (positionGeometry as unknown as Vec3Node).y;
    const footward = smoothstep(0.0, -1.3, pgy).mul(band.greaterThan(0.5).select(float(1), float(0)));
    const half0 = this.gridHalf as unknown as Vec2Node;
    const pg0 = positionGeometry as unknown as Vec3Node;
    const rimward = smoothstep(0.75, 1.5, length(vec3(pg0.x.div(half0.x.add(0.8)), 0, pg0.z.sub(this.gridCenterZ).div(half0.y.add(0.8)))));
    const deepen = footward.mul(0.42).add(rimward.mul(band.lessThan(0.5).select(float(0.14), float(0)))).mul(soft);
    base = mixInk(base, mixInk(base, ink, 0.55), deepen);
    // Walls: fine vertical striations (Earle's cliff hatching), integer count around the ring (no seam).
    const lines = stripes(along, this.uStriation.max(0.25), 0.1).mul(striate).mul(m).mul(this.uStriation.min(1).max(0.35));
    let albedo = mix(base, base.mul(0.7), lines) as unknown as Vec3Node;
    // Top: a flat value plane of the place (meadow, rock lip, sand, snow, dome skin). Under the cell grid the top is
    // cut: an ink bed the plates are set into, so seams, rifts and dips read as crisp ink.
    const isTop = band.lessThan(0.5).select(1, 0).mul(m) as unknown as FloatNode;
    const pg = positionGeometry as unknown as Vec3Node;
    // Ornament on the top (outside the bed): snow lines, scrap hatch, dotted dome skin, perspective rays.
    const pat = this.uPattern as unknown as FloatNode;
    const pcol = this.uPatternColor as unknown as Vec3Node;
    const snow = stripes(pg.z.mul(1.0).add(pg.x.mul(0.18)), 5, 0.06);
    const hatch = stripes(pg.x.mul(0.7).add(pg.z), 11, 0.08);
    const cell = vec3(fract(pg.x.mul(3.2)).sub(0.5), 0, fract(pg.z.mul(3.2).add(pg.x.mul(1.6).floor().mul(0.5))).sub(0.5));
    const dots = aaStep(0.17, length(cell)).oneMinus();
    const rays = stripes(abs(pg.x).div(pg.z.sub(this.gridCenterZ).abs().add(2.5)), 9, 0.06);
    let ornament = select(pat.lessThan(0.5), float(0), snow) as unknown as FloatNode;
    ornament = select(pat.lessThan(1.5), ornament, hatch) as unknown as FloatNode;
    ornament = select(pat.lessThan(2.5), ornament, dots) as unknown as FloatNode;
    ornament = select(pat.lessThan(3.5), ornament, rays) as unknown as FloatNode;
    const half = this.gridHalf as unknown as Vec2Node;
    const inX = aaStep(half.x, abs(pg.x)).oneMinus();
    const inZ = aaStep(half.y, abs(pg.z.sub(this.gridCenterZ))).oneMinus();
    const bed = inX.mul(inZ).mul(isTop);
    albedo = mix(albedo, pcol, ornament.mul(isTop).mul(bed.oneMinus()).mul(0.85)) as unknown as Vec3Node;
    albedo = mix(albedo, ink, bed) as unknown as Vec3Node;
    // Pool: water ink with two slow drifting light bands (Earle's flat reflections).
    const drift = (this.uTime as unknown as FloatNode).mul(0.05);
    const bandA = stripes(pg.z.mul(0.9).add(pg.x.mul(0.25)).add(drift), 1, 0.05);
    const bandB = stripes(pg.z.mul(0.9).add(pg.x.mul(0.25)).add(drift).add(0.33), 1, 0.025);
    const water = mix(this.uWater as unknown as Vec3Node, this.uWaterBand as unknown as Vec3Node, bandA.max(bandB).mul(0.9));
    albedo = mix(albedo, water, isPool) as unknown as Vec3Node;
    this.material = new BoardSurfaceMaterial({
      albedo,
      shade: mix(mix(this.uShade as unknown as Vec3Node, ink, bed.max(slab)), mix(this.uWater as unknown as Vec3Node, ink, 0.35), isPool) as unknown as Vec3Node,
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

  /**
   * The place the plateau stands in: skirt family, colours, top ornament, wall hatching and the pool ring. Colours
   * are uniforms; the geometry is rebuilt only when the family or the pool changes.
   */
  setStyle(style: PlateauStyle): void {
    const rebuild = style.kind !== this.style.kind || !!style.pool !== !!this.style.pool;
    this.style = style;
    setColor(this.uTop, style.top);
    style.skirt.forEach((c, i) => setColor(this.uSkirt[i]!, c));
    setColor(this.uShade, style.shade);
    setColor(this.uInk, style.ink);
    this.uPattern.value = PATTERN_CODE[style.pattern ?? 'none'];
    setColor(this.uPatternColor, style.patternColor ?? style.top);
    this.uStriation.value = style.striation ?? 1;
    if (style.pool) {
      setColor(this.uWater, style.pool.water);
      setColor(this.uWaterBand, style.pool.band);
    }
    if (rebuild) this.build();
  }

  /** Board clock (pool bands drift). */
  setTime(t: number): void {
    this.uTime.value = t;
  }

  private get profile(): ProfileStep[] {
    return PROFILES[this.style.kind] ?? PROFILES.meadow;
  }

  /** Total radial extent of the current skirt beyond the top outline. */
  get skirtExtent(): number {
    const p = this.profile;
    return Math.max(...p.map((s) => s.out));
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
    const src = this.profile;
    const last = src.length - 1;
    // The last two steps reach the foot (−depth); the ledge's lower terraces scale with the depth.
    const deep = this.style.kind === 'ledge' ? Math.max(1, depth / 1.6) : 1;
    const profile = src.map((p, i) => ({ ...p, y: i >= last - 1 ? -depth : Math.max(-depth + 0.05, p.y * (p.y < -0.2 ? deep : 1)) }));
    const outMax = Math.max(...profile.map((p) => p.out));
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
      const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, flag = 1) => {
        pos.push(x, y, z);
        nrm.push(nx, ny, nz);
        hpos.push(x, y, z);
        hnrm.push(nx, ny, nz);
        band.push(5);
        striate.push(0);
        along.push(0);
        slabFlag.push(flag);
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
      // Pool ring (shore sites): flat water around the foot, from inside the skirt out to a wobbly shore line.
      if (this.style.pool) {
        // Water fills to the lowest ground under the plateau (a depression, never a sheet over a slope).
        const yW = (this.shape.ground ?? -depth + 0.4) + 0.03;
        for (let j = 0; j < seg; j++) {
          const a0 = (j / seg) * Math.PI * 2;
          const a1 = ((j + 1) / seg) * Math.PI * 2;
          const r0 = this.outline(Math.cos(a0), Math.sin(a0));
          const r1 = this.outline(Math.cos(a1), Math.sin(a1));
          const w0 = 1.2 + 0.35 * (0.5 + 0.5 * Math.sin(a0 * 3 + 0.7)) + 0.15 * Math.sin(a0 * 7);
          const w1 = 1.2 + 0.35 * (0.5 + 0.5 * Math.sin(a1 * 3 + 0.7)) + 0.15 * Math.sin(a1 * 7);
          const i0: [number, number] = [Math.cos(a0) * (r0 + 0.3), Math.sin(a0) * (r0 + 0.3) + centerZ];
          const i1: [number, number] = [Math.cos(a1) * (r1 + 0.3), Math.sin(a1) * (r1 + 0.3) + centerZ];
          const o0: [number, number] = [Math.cos(a0) * (r0 + outMax + w0), Math.sin(a0) * (r0 + outMax + w0) + centerZ];
          const o1: [number, number] = [Math.cos(a1) * (r1 + outMax + w1), Math.sin(a1) * (r1 + outMax + w1) + centerZ];
          put(i0[0], yW, i0[1], 0, 1, 0, 2);
          put(i1[0], yW, i1[1], 0, 1, 0, 2);
          put(o1[0], yW, o1[1], 0, 1, 0, 2);
          put(i0[0], yW, i0[1], 0, 1, 0, 2);
          put(o1[0], yW, o1[1], 0, 1, 0, 2);
          put(o0[0], yW, o0[1], 0, 1, 0, 2);
        }
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
    const outMax = this.skirtExtent;
    const q = Math.min(1, r / (rho + outMax));
    const k = Math.pow(Math.max(0, 1 - q * q), 1.4);
    const hill = -depth + (HILL_HEIGHT + depth) * k;
    const flat = r <= rho ? 0 : -depth;
    const m0 = Math.min(1, Math.max(0, this.morph.value));
    const m = m0 * m0 * (3 - 2 * m0);
    return hill + (flat - hill) * m;
  }

  /** Total radial extent of the default skirt beyond the top outline (for camera framing and terrain probes). */
  static get skirtOut(): number {
    return Math.max(...PROFILES.meadow.map((p) => p.out));
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
