import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { RexPart } from './rexPalette';
import { RexBone, atBone, type Vec3 } from './rexSkeleton';

/**
 * REX's body as ONE skinned geometry (one draw call): procedural lofts, cones, domes and fins, authored in
 * bone-local coordinates, rigid or blended between two bones. The head, snout and jaw are faceted (flat
 * normals, the logo's big planes); torso, tail and limbs are smooth so the banded light draws Earle contour
 * bands on them. Eyes, mouth, teeth, crest, halo stars and the sweat drop are parts of the same mesh
 * (`rexPart`), hidden accessories collapse through their bone's scale. No outline geometry anywhere.
 */

/** Weight (1 − w) on bone `a`, w on bone `b`. */
export interface Skin {
  a: number;
  b: number;
  w: number;
}

const rigid = (bone: number): Skin => ({ a: bone, b: bone, w: 0 });
const blend = (a: number, b: number, w: number): Skin => ({ a, b, w: Math.min(1, Math.max(0, w)) });

interface ProtoVertex {
  p: Vec3;
  s: Skin;
  uv: [number, number];
}

interface ProtoFace {
  i: [number, number, number];
  /** Point inside the solid: the face is flipped if its normal points toward it. */
  center?: Vec3 | undefined;
}

interface Proto {
  verts: ProtoVertex[];
  faces: ProtoFace[];
}

type PartFn = number | ((normal: Vec3, centroid: Vec3) => number);

interface EmitOptions {
  smooth: boolean;
  part: PartFn;
  doubleSided?: boolean;
}

// ------------------------------------------------------------------------------------------ vector helpers

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Any unit vector perpendicular to `n`. */
function perpendicular(n: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return norm(cross(ref, n));
}

// ------------------------------------------------------------------------------------------ builder

class RexMeshBuilder {
  private readonly pos: number[] = [];
  private readonly nor: number[] = [];
  private readonly si: number[] = [];
  private readonly sw: number[] = [];
  private readonly part: number[] = [];
  private readonly uv: number[] = [];

  emit(proto: Proto, opts: EmitOptions): void {
    const { verts, faces } = proto;
    const vn: Vec3[] = verts.map(() => [0, 0, 0]);
    const oriented: Array<{ i: [number, number, number]; n: Vec3; c: Vec3 }> = [];
    for (const f of faces) {
      const a = f.i[0];
      let [b, c] = [f.i[1], f.i[2]];
      const pa = verts[a]!.p;
      const pb = verts[b]!.p;
      const pc = verts[c]!.p;
      let n = cross(sub(pb, pa), sub(pc, pa));
      const area = len(n);
      if (area < 1e-10) continue;
      const centroid = scale(add(add(pa, pb), pc), 1 / 3);
      if (f.center && dot(n, sub(centroid, f.center)) < 0) {
        [b, c] = [c, b];
        n = scale(n, -1);
      }
      for (const k of [a, b, c]) {
        const acc = vn[k]!;
        acc[0] += n[0];
        acc[1] += n[1];
        acc[2] += n[2];
      }
      oriented.push({ i: [a, b, c], n: norm(n), c: centroid });
    }
    for (const f of oriented) {
      const part = typeof opts.part === 'number' ? opts.part : opts.part(f.n, f.c);
      this.pushFace(verts, f.i, opts.smooth ? f.i.map((k) => norm(vn[k]!)) : [f.n, f.n, f.n], part);
      if (opts.doubleSided) {
        const back: [number, number, number] = [f.i[0], f.i[2], f.i[1]];
        const nb = scale(f.n, -1);
        this.pushFace(verts, back, [nb, nb, nb], part);
      }
    }
  }

  private pushFace(verts: ProtoVertex[], idx: [number, number, number], normals: Vec3[], part: number): void {
    for (let j = 0; j < 3; j++) {
      const v = verts[idx[j]!]!;
      const n = normals[j]!;
      this.pos.push(v.p[0], v.p[1], v.p[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.si.push(v.s.a, v.s.b, 0, 0);
      this.sw.push(1 - v.s.w, v.s.w, 0, 0);
      this.part.push(part);
      this.uv.push(v.uv[0], v.uv[1]);
    }
  }

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    g.setAttribute('skinIndex', new Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new Float32BufferAttribute(this.sw, 4));
    g.setAttribute('rexPart', new Float32BufferAttribute(this.part, 1));
    g.setAttribute('rexUv', new Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ------------------------------------------------------------------------------------------ primitives

/** One cross-section of a loft: superellipse (exponent `e`, 2 = ellipse) in the plane (u, v) around `c`. */
interface Ring {
  c: Vec3;
  u: Vec3;
  v: Vec3;
  rx: number;
  ry: number;
  e?: number;
  skin: Skin;
}

function sePoint(theta: number, e: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const p = 2 / e;
  return [Math.sign(c) * Math.pow(Math.abs(c), p), Math.sign(s) * Math.pow(Math.abs(s), p)];
}

/**
 * Loft through rings with `sides` vertices each; open ends are capped with a fan (flat caps on faceted
 * parts, a slight dome when `capBulge` > 0). `angleOffset` = π / sides puts a flat face on top.
 */
function loft(rings: Ring[], sides: number, opts: { angleOffset?: number; capStart?: boolean; capEnd?: boolean; capBulge?: number } = {}): Proto {
  const verts: ProtoVertex[] = [];
  const faces: ProtoFace[] = [];
  const off = opts.angleOffset ?? 0;
  const nR = rings.length;
  for (let r = 0; r < nR; r++) {
    const ring = rings[r]!;
    for (let k = 0; k < sides; k++) {
      const [x, y] = sePoint(off + (k / sides) * Math.PI * 2, ring.e ?? 2);
      const p = add(ring.c, add(scale(ring.u, x * ring.rx), scale(ring.v, y * ring.ry)));
      verts.push({ p, s: ring.skin, uv: [k / sides, r / Math.max(1, nR - 1)] });
    }
  }
  for (let r = 0; r < nR - 1; r++) {
    const center = lerp3(rings[r]!.c, rings[r + 1]!.c, 0.5);
    for (let k = 0; k < sides; k++) {
      const a = r * sides + k;
      const b = r * sides + ((k + 1) % sides);
      const c = (r + 1) * sides + ((k + 1) % sides);
      const d = (r + 1) * sides + k;
      faces.push({ i: [a, b, c], center }, { i: [a, c, d], center });
    }
  }
  const cap = (r: number, inward: Vec3): void => {
    const ring = rings[r]!;
    const bulge = opts.capBulge ?? 0;
    const axisOut = scale(inward, -1);
    const tip = add(ring.c, scale(axisOut, bulge * Math.min(ring.rx, ring.ry)));
    const ci = verts.length;
    verts.push({ p: tip, s: ring.skin, uv: [0.5, r / Math.max(1, nR - 1)] });
    const center = add(ring.c, scale(inward, Math.max(0.004, Math.min(ring.rx, ring.ry) * 0.5)));
    for (let k = 0; k < sides; k++) faces.push({ i: [ci, r * sides + k, r * sides + ((k + 1) % sides)], center });
  };
  if (opts.capStart !== false && nR > 1) cap(0, norm(sub(rings[1]!.c, rings[0]!.c)));
  if (opts.capEnd !== false && nR > 1) cap(nR - 1, norm(sub(rings[nR - 2]!.c, rings[nR - 1]!.c)));
  return { verts, faces };
}

/** Pyramid/cone from `base` along `dir` (teeth, claws). */
function cone(base: Vec3, dir: Vec3, height: number, radius: number, skin: Skin, sides = 4, squash = 1): Proto {
  const d = norm(dir);
  const u = perpendicular(d);
  const v = cross(d, u);
  const verts: ProtoVertex[] = [];
  const faces: ProtoFace[] = [];
  for (let k = 0; k < sides; k++) {
    const t = (k / sides) * Math.PI * 2 + Math.PI / sides;
    verts.push({ p: add(base, add(scale(u, Math.cos(t) * radius), scale(v, Math.sin(t) * radius * squash))), s: skin, uv: [k / sides, 0] });
  }
  const tip = verts.length;
  verts.push({ p: add(base, scale(d, height)), s: skin, uv: [0.5, 1] });
  const center = add(base, scale(d, height * 0.25));
  for (let k = 0; k < sides; k++) faces.push({ i: [k, (k + 1) % sides, tip], center });
  const bottom = verts.length;
  verts.push({ p: base, s: skin, uv: [0.5, 0] });
  for (let k = 0; k < sides; k++) faces.push({ i: [bottom, (k + 1) % sides, k], center });
  return { verts, faces };
}

/**
 * Eye dome: a low cap over a disc of radius `r` facing `n`, bulging `h`; uv = disc coordinates / r with +x
 * toward the outer corner (mirrored for the right eye) and +y toward the eye's top (the lids' side).
 */
function eyeDome(center: Vec3, n: Vec3, up: Vec3, r: number, h: number, outward: number, skin: Skin, segments = 14, rings = 3): Proto {
  const N = norm(n);
  const upP = norm(sub(up, scale(N, dot(up, N))));
  const right = norm(cross(upP, N)); // +x in the eye frame
  const verts: ProtoVertex[] = [];
  const faces: ProtoFace[] = [];
  // Rim ring sits slightly below the disc plane so the dome seats into the head.
  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * (Math.PI / 2); // 0 = rim, π/2 = top
    const rr = Math.cos(phi);
    const hh = Math.sin(phi) * h - (j === 0 ? h * 0.35 : 0);
    for (let k = 0; k < segments; k++) {
      const t = (k / segments) * Math.PI * 2;
      const x = Math.cos(t) * rr;
      const y = Math.sin(t) * rr;
      const p = add(center, add(add(scale(right, x * r), scale(upP, y * r)), scale(N, hh)));
      verts.push({ p, s: skin, uv: [x * outward, y] });
    }
  }
  const top = verts.length;
  verts.push({ p: add(center, scale(N, h)), s: skin, uv: [0, 0] });
  const inner = sub(center, scale(N, r));
  for (let j = 0; j < rings; j++) {
    for (let k = 0; k < segments; k++) {
      const a = j * segments + k;
      const b = j * segments + ((k + 1) % segments);
      const c = (j + 1) * segments + ((k + 1) % segments);
      const d = (j + 1) * segments + k;
      faces.push({ i: [a, b, c], center: inner }, { i: [a, c, d], center: inner });
    }
  }
  for (let k = 0; k < segments; k++) faces.push({ i: [rings * segments + k, rings * segments + ((k + 1) % segments), top], center: inner });
  return { verts, faces };
}

/** Flat disc (nostrils), facing `n`, ellipse rx × ry. */
function disc(center: Vec3, n: Vec3, up: Vec3, rx: number, ry: number, skin: Skin, segments = 8): Proto {
  const N = norm(n);
  const upP = norm(sub(up, scale(N, dot(up, N))));
  const right = norm(cross(upP, N));
  const verts: ProtoVertex[] = [{ p: add(center, scale(N, 0.002)), s: skin, uv: [0, 0] }];
  const faces: ProtoFace[] = [];
  for (let k = 0; k < segments; k++) {
    const t = (k / segments) * Math.PI * 2;
    verts.push({ p: add(center, add(scale(right, Math.cos(t) * rx), scale(upP, Math.sin(t) * ry))), s: skin, uv: [Math.cos(t), Math.sin(t)] });
  }
  const inner = sub(center, scale(N, 0.05));
  for (let k = 0; k < segments; k++) faces.push({ i: [0, 1 + k, 1 + ((k + 1) % segments)], center: inner });
  return { verts, faces };
}

/** Crest fin: a flat-shaded wedge standing on `base` along `up`, `along` the spine; uv.x = spine position. */
function fin(base: Vec3, up: Vec3, along: Vec3, length: number, height: number, thick: number, skin: Skin, spine: number): Proto {
  const U = norm(up);
  const A = norm(sub(along, scale(U, dot(along, U))));
  const S = norm(cross(A, U));
  const uv: [number, number] = [spine, 0];
  const p = (a: number, s: number, h: number): ProtoVertex => ({ p: add(base, add(add(scale(A, a), scale(S, s)), scale(U, h))), s: skin, uv });
  // Base quad (slightly sunk), apex ridge leaning back like a shark fin.
  const verts = [
    p(length * 0.5, thick, -0.01),
    p(length * 0.5, -thick, -0.01),
    p(-length * 0.5, -thick, -0.01),
    p(-length * 0.5, thick, -0.01),
    p(-length * 0.18, thick * 0.35, height),
    p(-length * 0.18, -thick * 0.35, height),
  ];
  const center = add(base, scale(U, height * 0.2));
  const faces: ProtoFace[] = [
    { i: [0, 4, 3], center },
    { i: [1, 2, 5], center },
    { i: [0, 1, 5], center },
    { i: [0, 5, 4], center },
    { i: [3, 4, 5], center },
    { i: [3, 5, 2], center },
    { i: [0, 3, 2], center },
    { i: [0, 2, 1], center },
  ];
  return { verts, faces };
}

/** Flat four-point star (double-sided). */
function star4(center: Vec3, n: Vec3, up: Vec3, size: number, skin: Skin): Proto {
  const N = norm(n);
  const upP = norm(sub(up, scale(N, dot(up, N))));
  const right = norm(cross(upP, N));
  const verts: ProtoVertex[] = [{ p: center, s: skin, uv: [0, 0] }];
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2;
    const r = k % 2 === 0 ? size : size * 0.34;
    verts.push({ p: add(center, add(scale(right, Math.cos(t) * r), scale(upP, Math.sin(t) * r))), s: skin, uv: [Math.cos(t), Math.sin(t)] });
  }
  const faces: ProtoFace[] = [];
  for (let k = 0; k < 8; k++) faces.push({ i: [0, 1 + k, 1 + ((k + 1) % 8)] });
  return { verts, faces };
}

/** Low-poly ball (gas puffs, palms). */
function ball(center: Vec3, r: number, skin: Skin, sides = 7, rings = 4, squashY = 1): Proto {
  const rs: Ring[] = [];
  for (let j = 0; j <= rings; j++) {
    const phi = -Math.PI / 2 + (j / rings) * Math.PI;
    const rr = Math.max(1e-4, Math.cos(phi) * r);
    rs.push({ c: add(center, [0, Math.sin(phi) * r * squashY, 0]), u: [1, 0, 0], v: [0, 0, 1], rx: rr, ry: rr, skin });
  }
  return loft(rs, sides, { capStart: false, capEnd: false });
}

// ------------------------------------------------------------------------------------------ REX

/** Parameters the rig and shader need to know about the model (all in model space, rest pose). */
export interface RexModelInfo {
  vertexCount: number;
  /** Mouth tip (snout front, jaw line) — the speech-bubble anchor. */
  mouth: Vec3;
  /** Top of the head (for placement). */
  headTop: number;
  /** Height of the rim cut used by map placement (belly height). */
  belly: number;
  /** Skull spot centres (model space, x ≥ 0; mirrored in the shader). */
  spots: Vec3[];
  /** Tongue stars (model space, rest). */
  stars: Vec3[];
  /** Belly ellipse: centre and radii (model space). */
  bellyCenter: Vec3;
  bellyRadius: [number, number];
}

interface HeadRing {
  z: number;
  yc: number;
  rx: number;
  ry: number;
  e: number;
}

// Head (head-bone local): long boxy snout, rounded skull; faceted like the logo's planes.
const HEAD_RINGS: HeadRing[] = [
  { z: -0.165, yc: 0.085, rx: 0.045, ry: 0.04, e: 2 },
  { z: -0.145, yc: 0.088, rx: 0.105, ry: 0.095, e: 2.2 },
  { z: -0.105, yc: 0.092, rx: 0.148, ry: 0.132, e: 2.4 },
  { z: -0.035, yc: 0.096, rx: 0.167, ry: 0.152, e: 2.6 },
  { z: 0.045, yc: 0.09, rx: 0.162, ry: 0.146, e: 3.0 },
  { z: 0.135, yc: 0.074, rx: 0.147, ry: 0.12, e: 3.4 },
  { z: 0.235, yc: 0.062, rx: 0.137, ry: 0.105, e: 3.6 },
  { z: 0.315, yc: 0.056, rx: 0.126, ry: 0.096, e: 3.6 },
];

// Lower jaw (jaw-bone local, hinge at the origin): a big friendly U under the snout.
const JAW_RINGS: HeadRing[] = [
  { z: -0.05, yc: -0.03, rx: 0.1, ry: 0.048, e: 2.4 },
  { z: 0.02, yc: -0.058, rx: 0.134, ry: 0.07, e: 2.8 },
  { z: 0.13, yc: -0.07, rx: 0.136, ry: 0.075, e: 3.2 },
  { z: 0.24, yc: -0.066, rx: 0.124, ry: 0.066, e: 3.2 },
  { z: 0.33, yc: -0.056, rx: 0.106, ry: 0.052, e: 3.0 },
  { z: 0.368, yc: -0.056, rx: 0.07, ry: 0.034, e: 2.6 },
];

/** Flat top face of the faceted head at head-local z (the octagon's top edge sits at sin(3π/8)^(2/e) · ry). */
function headTopAt(z: number): { y: number; rx: number } {
  const topOf = (r: HeadRing): number => r.yc + r.ry * Math.pow(Math.sin((3 * Math.PI) / 8), 2 / r.e);
  for (let i = 0; i < HEAD_RINGS.length - 1; i++) {
    const a = HEAD_RINGS[i]!;
    const b = HEAD_RINGS[i + 1]!;
    if (z >= a.z && z <= b.z) {
      const t = (z - a.z) / (b.z - a.z);
      return { y: topOf(a) + (topOf(b) - topOf(a)) * t, rx: a.rx + (b.rx - a.rx) * t };
    }
  }
  const last = HEAD_RINGS[HEAD_RINGS.length - 1]!;
  return { y: topOf(last), rx: last.rx };
}

/** Skin weight along the tail chain by model z (hips → tail0..tail3). */
function tailSkin(z: number): Skin {
  const chain: Array<[number, number]> = [
    [RexBone.hips, -0.06],
    [RexBone.tail0, -0.13],
    [RexBone.tail1, -0.28],
    [RexBone.tail2, -0.41],
    [RexBone.tail3, -0.52],
  ];
  if (z >= chain[0]![1]) return rigid(chain[0]![0]);
  for (let i = 0; i < chain.length - 1; i++) {
    const [ba, za] = chain[i]!;
    const [bb, zb] = chain[i + 1]!;
    if (z <= za && z >= zb) return blend(ba, bb, (za - z) / (za - zb));
  }
  return rigid(RexBone.tail3);
}

/** Skin weight along the torso by model y (hips → chest → neck → head). */
function torsoSkin(y: number): Skin {
  if (y < 0.3) return rigid(RexBone.hips);
  if (y < 0.44) return blend(RexBone.hips, RexBone.chest, (y - 0.3) / 0.14);
  if (y < 0.55) return rigid(RexBone.chest);
  if (y < 0.64) return blend(RexBone.chest, RexBone.neck, (y - 0.55) / 0.09);
  if (y < 0.69) return rigid(RexBone.neck);
  return blend(RexBone.neck, RexBone.head, Math.min(1, (y - 0.69) / 0.05));
}

/** Builds the whole REX geometry and the model facts the rig/shader need. */
export function createRexGeometry(): { geometry: BufferGeometry; info: RexModelInfo } {
  const b = new RexMeshBuilder();
  const X: Vec3 = [1, 0, 0];
  const Y: Vec3 = [0, 1, 0];
  const Z: Vec3 = [0, 0, 1];
  const H = RexBone.head;
  const J = RexBone.jaw;

  // ---- torso + neck (smooth, round sections along +y)
  const torso: Array<[number, number, number, number]> = [
    // y, zc, rx, rz
    [0.085, 0.0, 0.03, 0.03],
    [0.105, 0.0, 0.12, 0.1],
    [0.16, 0.006, 0.182, 0.156],
    [0.24, 0.016, 0.21, 0.186],
    [0.33, 0.026, 0.206, 0.18],
    [0.42, 0.037, 0.186, 0.16],
    [0.5, 0.052, 0.156, 0.136],
    [0.57, 0.066, 0.127, 0.112],
    [0.64, 0.081, 0.107, 0.097],
    [0.71, 0.096, 0.097, 0.09],
    [0.77, 0.104, 0.085, 0.08],
  ];
  b.emit(
    loft(
      torso.map(([y, zc, rx, rz]) => ({ c: [0, y, zc], u: X, v: Z, rx, ry: rz, skin: torsoSkin(y) })),
      16,
      { capStart: true, capEnd: true, capBulge: 0.4 },
    ),
    { smooth: true, part: RexPart.skin },
  );

  // ---- head: skull + snout (faceted); palate faces are pink
  const headRest = atBone(H, [0, 0, 0]);
  const headRings: Ring[] = HEAD_RINGS.map((r) => ({ c: add(headRest, [0, r.yc, r.z]), u: X, v: Y, rx: r.rx, ry: r.ry, e: r.e, skin: rigid(H) }));
  b.emit(loft(headRings, 8, { angleOffset: Math.PI / 8, capStart: true, capEnd: true }), {
    smooth: false,
    part: (n, c) => (n[1] < -0.72 && c[2] - headRest[2] > -0.07 ? RexPart.mouth : RexPart.skin),
  });

  // ---- lower jaw (faceted); the flat top is the tongue
  const jawRest = atBone(J, [0, 0, 0]);
  const jawRings: Ring[] = JAW_RINGS.map((r) => ({ c: add(jawRest, [0, r.yc, r.z]), u: X, v: Y, rx: r.rx, ry: r.ry, e: r.e, skin: rigid(J) }));
  b.emit(loft(jawRings, 8, { angleOffset: Math.PI / 8, capStart: true, capEnd: true }), {
    smooth: false,
    part: (n, c) => (n[1] > 0.72 && c[2] - jawRest[2] > -0.03 ? RexPart.mouth : RexPart.skin),
  });

  // ---- throat wall (stretches between palate and tongue when the jaw drops) and cheek membranes
  {
    const top = [-0.1, 0.1].map((x) => ({ p: atBone(H, [x, -0.03, -0.06]), s: rigid(H), uv: [0, 1] as [number, number] }));
    const bot = [-0.09, 0.09].map((x) => ({ p: atBone(J, [x, 0.0, -0.005]), s: rigid(J), uv: [0, 0] as [number, number] }));
    const verts: ProtoVertex[] = [top[0]!, top[1]!, bot[1]!, bot[0]!];
    const center = atBone(H, [0, -0.03, -0.2]);
    b.emit({ verts, faces: [{ i: [0, 1, 2], center }, { i: [0, 2, 3], center }] }, { smooth: false, part: RexPart.throat, doubleSided: true });
    for (const side of [1, -1]) {
      const up0 = { p: atBone(H, [side * 0.128, -0.04, -0.07]), s: rigid(H), uv: [0, 1] as [number, number] };
      const up1 = { p: atBone(H, [side * 0.138, -0.042, 0.07]), s: rigid(H), uv: [1, 1] as [number, number] };
      const lo0 = { p: atBone(J, [side * 0.1, 0.0, -0.02]), s: rigid(J), uv: [0, 0] as [number, number] };
      const lo1 = { p: atBone(J, [side * 0.122, 0.006, 0.06]), s: rigid(J), uv: [1, 0] as [number, number] };
      const inner = atBone(H, [0, -0.05, 0.0]);
      const proto: Proto = { verts: [up0, up1, lo1, lo0], faces: [{ i: [0, 1, 2], center: inner }, { i: [0, 2, 3], center: inner }] };
      // Skin on both sides: while the mouth is closed the membrane folds inside out and must never flash pink.
      b.emit(proto, { smooth: false, part: RexPart.skin, doubleSided: true });
    }
  }

  // ---- teeth: two overbite fangs outside the lower lip, two tiny front teeth, two lower teeth (friendly, not spiky)
  for (const side of [1, -1]) {
    b.emit(cone(atBone(H, [side * 0.106, -0.036, 0.262]), [side * 0.06, -1, 0.14], 0.055, 0.02, rigid(H), 4), { smooth: false, part: RexPart.tooth });
    b.emit(cone(atBone(H, [side * 0.045, -0.038, 0.3]), [0, -1, 0.12], 0.024, 0.012, rigid(H), 4), { smooth: false, part: RexPart.tooth });
    b.emit(cone(atBone(J, [side * 0.062, -0.012, 0.3]), [0, 1, 0.06], 0.026, 0.012, rigid(J), 4), { smooth: false, part: RexPart.tooth });
  }

  // ---- nostrils on the front plane
  const front = HEAD_RINGS[HEAD_RINGS.length - 1]!;
  for (const side of [1, -1]) {
    b.emit(disc(atBone(H, [side * 0.06, front.yc + 0.05, front.z + 0.001]), Z, Y, 0.013, 0.008, rigid(H)), { smooth: false, part: RexPart.ink });
  }

  // ---- eyes: two spiral domes lying on the sloping top plane (like the logo), the left one a bit bigger
  const eyeZ = 0.085;
  const brow = headTopAt(eyeZ);
  const slope = (headTopAt(eyeZ + 0.02).y - headTopAt(eyeZ - 0.02).y) / 0.04;
  const eyes: Array<{ side: number; r: number; part: number }> = [
    { side: 1, r: 0.07, part: RexPart.eyeL },
    { side: -1, r: 0.062, part: RexPart.eyeR },
  ];
  for (const e of eyes) {
    // Surface normal of the top plane (tilted forward by the slope), turned a little outward.
    const n = norm([e.side * 0.3, 1, -slope * 1.15]);
    const c = atBone(H, [e.side * 0.083, brow.y - 0.008, eyeZ]);
    b.emit(eyeDome(c, n, Y, e.r, e.r * 0.52, e.side, rigid(H)), { smooth: true, part: e.part });
  }

  // ---- arms: tiny T-rex arms, two claws each
  for (const side of [1, -1]) {
    const a1 = side > 0 ? RexBone.armL1 : RexBone.armR1;
    const a2 = side > 0 ? RexBone.armL2 : RexBone.armR2;
    const shoulder: Vec3 = [side * 0.135, 0.475, 0.115];
    const elbow: Vec3 = [side * 0.19, 0.42, 0.19];
    const wrist: Vec3 = [side * 0.205, 0.435, 0.262];
    const armRing = (c: Vec3, dir: Vec3, r: number, skin: Skin): Ring => {
      const d = norm(dir);
      const u = norm(cross(Y, d));
      return { c, u, v: norm(cross(d, u)), rx: r, ry: r, skin };
    };
    const upDir = sub(elbow, shoulder);
    b.emit(
      loft([armRing(shoulder, upDir, 0.042, blend(RexBone.chest, a1, 0.6)), armRing(lerp3(shoulder, elbow, 0.55), upDir, 0.038, rigid(a1)), armRing(elbow, upDir, 0.034, blend(a1, a2, 0.5))], 7),
      { smooth: true, part: RexPart.skin },
    );
    const foreDir = sub(wrist, elbow);
    b.emit(loft([armRing(elbow, foreDir, 0.033, blend(a1, a2, 0.5)), armRing(wrist, foreDir, 0.03, rigid(a2))], 7), { smooth: true, part: RexPart.skin });
    b.emit(ball(add(wrist, [0, -0.004, 0.012]), 0.033, rigid(a2), 7, 4, 0.85), { smooth: true, part: RexPart.skin });
    for (const f of [-1, 1]) {
      b.emit(cone(add(wrist, [side * 0.004 + f * 0.016, -0.012, 0.03]), [f * 0.15, -0.55, 1], 0.036, 0.012, rigid(a2), 4), { smooth: false, part: RexPart.tooth });
    }
  }

  // ---- legs: stumpy thighs under the belly, round feet with three toe claws
  for (const side of [1, -1]) {
    const leg = side > 0 ? RexBone.legL : RexBone.legR;
    const foot = side > 0 ? RexBone.footL : RexBone.footR;
    b.emit(
      loft(
        [
          { c: [side * 0.105, 0.25, 0.0], u: X, v: Z, rx: 0.085, ry: 0.085, skin: rigid(RexBone.hips) },
          { c: [side * 0.112, 0.16, 0.005], u: X, v: Z, rx: 0.078, ry: 0.078, skin: blend(RexBone.hips, leg, 0.7) },
          { c: [side * 0.118, 0.09, 0.012], u: X, v: Z, rx: 0.064, ry: 0.066, skin: rigid(leg) },
          { c: [side * 0.12, 0.055, 0.018], u: X, v: Z, rx: 0.058, ry: 0.06, skin: blend(leg, foot, 0.8) },
        ],
        10,
        { capStart: false, capEnd: true },
      ),
      { smooth: true, part: RexPart.skin },
    );
    const footRings: Array<[number, number, number, number]> = [
      // z, rx, ry, yc
      [-0.045, 0.045, 0.03, 0.03],
      [-0.02, 0.058, 0.038, 0.038],
      [0.04, 0.065, 0.042, 0.042],
      [0.1, 0.06, 0.035, 0.035],
      [0.135, 0.038, 0.022, 0.024],
    ];
    b.emit(
      loft(
        footRings.map(([z, rx, ry, yc]) => ({ c: [side * 0.122, yc, z], u: X, v: Y, rx, ry, e: 2.3, skin: rigid(foot) })),
        10,
        { capStart: true, capEnd: true, capBulge: 0.5 },
      ),
      { smooth: true, part: RexPart.skin },
    );
    for (const t of [-1, 0, 1]) {
      b.emit(cone([side * 0.122 + t * 0.03, 0.022, 0.126 - Math.abs(t) * 0.012], [t * 0.25, -0.25, 1], 0.03, 0.013, rigid(foot), 4), { smooth: false, part: RexPart.tooth });
    }
  }

  // ---- tail: thick base tapering to a point, blended along the chain
  const tailPath: Array<[Vec3, number]> = [
    [[0, 0.25, -0.08], 0.13],
    [[0, 0.215, -0.19], 0.112],
    [[0, 0.175, -0.3], 0.088],
    [[0, 0.14, -0.4], 0.066],
    [[0, 0.118, -0.49], 0.046],
    [[0, 0.108, -0.57], 0.028],
    [[0, 0.105, -0.63], 0.01],
  ];
  {
    const rings: Ring[] = tailPath.map(([c, r], i) => {
      const prev = tailPath[Math.max(0, i - 1)]![0];
      const next = tailPath[Math.min(tailPath.length - 1, i + 1)]![0];
      const t = norm(sub(next, prev));
      const u = X;
      const v = norm(cross(u, t));
      return { c, u, v, rx: r * 0.92, ry: r, skin: tailSkin(c[2]) };
    });
    b.emit(loft(rings, 12, { capStart: false, capEnd: true }), { smooth: true, part: RexPart.skin });
  }

  // ---- crest: fins from the skull over the back to the tail tip (violet → pink)
  const crest: Array<{ base: Vec3; up: Vec3; along: Vec3; l: number; h: number; skin: Skin }> = [
    { base: atBone(H, [0, headTopAt(-0.09).y - 0.008, -0.09]), up: [0, 1, -0.35], along: Z, l: 0.06, h: 0.04, skin: rigid(RexBone.crestHead) },
    { base: atBone(H, [0, 0.2, -0.12]), up: [0, 0.8, -0.6], along: Z, l: 0.065, h: 0.058, skin: rigid(RexBone.crestHead) },
    { base: atBone(H, [0, 0.135, -0.16]), up: [0, 0.4, -0.92], along: Z, l: 0.055, h: 0.052, skin: rigid(RexBone.crestHead) },
    { base: [0, 0.62, -0.012], up: [0, 0.25, -1], along: [0, 1, 0], l: 0.06, h: 0.055, skin: rigid(RexBone.neck) },
    { base: [0, 0.515, -0.078], up: [0, 0.3, -1], along: [0, 1, 0.1], l: 0.065, h: 0.06, skin: rigid(RexBone.chest) },
    { base: [0, 0.405, -0.13], up: [0, 0.2, -1], along: [0, 1, 0.15], l: 0.065, h: 0.06, skin: blend(RexBone.hips, RexBone.chest, 0.6) },
    { base: [0, 0.31, -0.16], up: [0, 0.35, -1], along: [0, 1, 0.1], l: 0.06, h: 0.055, skin: rigid(RexBone.hips) },
    { base: [0, 0.3, -0.24], up: [0, 1, -0.25], along: [0, -0.3, -1], l: 0.06, h: 0.05, skin: tailSkin(-0.24) },
    { base: [0, 0.238, -0.36], up: [0, 1, -0.2], along: [0, -0.35, -1], l: 0.05, h: 0.042, skin: tailSkin(-0.36) },
    { base: [0, 0.18, -0.47], up: [0, 1, -0.15], along: [0, -0.25, -1], l: 0.042, h: 0.034, skin: tailSkin(-0.47) },
    { base: [0, 0.14, -0.56], up: [0, 1, -0.1], along: [0, -0.1, -1], l: 0.034, h: 0.026, skin: tailSkin(-0.56) },
  ];
  crest.forEach((c, i) => b.emit(fin(c.base, c.up, c.along, c.l, c.h, 0.016, c.skin, i / (crest.length - 1)), { smooth: false, part: RexPart.crest }));

  // ---- dizzy halo: three stars and three lavender gas puffs on a ring (collapsed unless dizzy)
  const haloC = atBone(RexBone.halo, [0, 0, 0]);
  for (let k = 0; k < 3; k++) {
    const t = (k / 3) * Math.PI * 2;
    const dir: Vec3 = [Math.cos(t), 0, Math.sin(t)];
    b.emit(star4(add(haloC, scale(dir, 0.2)), add(dir, [0, 0.6, 0]), Y, 0.058, rigid(RexBone.halo)), { smooth: false, part: RexPart.star, doubleSided: true });
    const t2 = t + Math.PI / 3;
    const dir2: Vec3 = [Math.cos(t2), 0, Math.sin(t2)];
    b.emit(ball(add(haloC, add(scale(dir2, 0.19), [0, 0.012, 0])), 0.034, rigid(RexBone.halo), 6, 3), { smooth: true, part: RexPart.gas });
    b.emit(ball(add(haloC, add(scale(dir2, 0.235), [0, 0.035, 0])), 0.022, rigid(RexBone.halo), 6, 3), { smooth: true, part: RexPart.gas });
  }

  // ---- celebration sparkles: six stars on a wide ring (collapsed unless celebrating)
  const sparkC = atBone(RexBone.sparkle, [0, 0, 0]);
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * Math.PI * 2 + 0.3;
    const dir: Vec3 = [Math.cos(t), 0, Math.sin(t)];
    const h = (k % 2 === 0 ? 0.18 : -0.05) + 0.05 * Math.sin(k * 2.1);
    b.emit(star4(add(sparkC, add(scale(dir, 0.46), [0, h, 0])), add(dir, [0, 0.3, 0.6]), Y, k % 2 === 0 ? 0.055 : 0.04, rigid(RexBone.sparkle)), { smooth: false, part: RexPart.star, doubleSided: true });
  }

  // ---- sweat drop (collapsed unless despairing)
  {
    const c = atBone(RexBone.sweat, [0, 0, 0]);
    const rings: Ring[] = [
      [-0.032, 0.004],
      [-0.026, 0.017],
      [-0.012, 0.025],
      [0.004, 0.021],
      [0.018, 0.011],
      [0.034, 0.002],
    ].map(([y, r]) => ({ c: add(c, [0, y!, 0]), u: X, v: Z, rx: r!, ry: r!, skin: rigid(RexBone.sweat) }));
    b.emit(loft(rings, 8), { smooth: true, part: RexPart.sweat });
  }

  const geometry = b.build();
  const info: RexModelInfo = {
    vertexCount: b.vertexCount,
    mouth: atBone(H, [0, -0.045, front.z + 0.01]),
    headTop: headRest[1] + headTopAt(-0.02).y + 0.07,
    belly: 0.4,
    spots: [atBone(H, [0.138, 0.17, -0.115]), atBone(H, [0.155, 0.12, -0.1]), atBone(H, [0.118, 0.13, -0.14]), atBone(H, [0.09, 0.2, -0.135])],
    stars: [atBone(J, [0.0, 0.0, 0.2]), atBone(J, [0.058, 0.0, 0.1]), atBone(J, [-0.052, 0.0, 0.07])],
    bellyCenter: [0, 0.3, 0.2],
    bellyRadius: [0.14, 0.2],
  };
  return { geometry, info };
}
