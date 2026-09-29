import { boundingRadius, cloneParams, makeRng, mixHex, type BlobParams, type SpherePrim, type Vec3 } from '@ee/genome';
import { BLOB_MAX_SPHERES_GPU } from './blobParamsUniforms';

export const MERGE_BLEND_MS = 300;
export const MERGE_MORPH_MS = 150;
export const MERGE_TOTAL_MS = MERGE_BLEND_MS + MERGE_MORPH_MS;

export interface MergeParty {
  params: BlobParams;
  /** World/object-space centre of the blob's local origin. */
  center: Vec3;
  scale: number;
}

export interface MergeFrame {
  /** Parameters to draw in A's slot (spheres may exceed 8, never 16). */
  params: BlobParams;
  /** Half extents of A's instance box in A's blob units (covers B and the droplets). */
  boxHalf: Vec3;
  /** B is hidden for the whole sequence. */
  hideB: true;
  /** 0..1 squash pop along +y during the morph. */
  pop: number;
  phase: 'blend' | 'morph' | 'done';
  done: boolean;
}

export interface MergeOptions {
  droplets?: number;
  /** 0..1, from the genome: thick blobs bridge later and re-absorb slower. */
  viscosity?: number;
  seed?: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (t: number): number => t * t * (3 - 2 * t);
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * Generated merge animation (no keyframes): 0–300 ms A's box grows to cover both, its sphere list is
 * A ∪ B with B's centres pulled toward A along a viscosity curve while sminK swells (the bridge), and a
 * few droplet spheres are flung out and re-absorbed; 300–450 ms the sphere set and palette crossfade to
 * the child genome with a squash pop. Pure data: the scene writes the frame into the parameter block.
 */
export class MergeTimeline {
  private readonly bSpheres: SpherePrim[]; // B's spheres in A's frame
  private readonly bOffset: Vec3; // B's origin in A's frame
  private readonly droplets: Array<{ dir: Vec3; dist: number; r: number; delay: number }>;
  private readonly viscosity: number;
  private readonly kA: number;

  constructor(private readonly a: MergeParty, b: MergeParty, private readonly child: BlobParams, opts: MergeOptions = {}) {
    const ratio = b.scale / a.scale;
    this.bOffset = [(b.center[0] - a.center[0]) / a.scale, (b.center[1] - a.center[1]) / a.scale, (b.center[2] - a.center[2]) / a.scale];
    this.bSpheres = b.params.spheres.map((s) => ({
      center: [this.bOffset[0] + s.center[0] * ratio, this.bOffset[1] + s.center[1] * ratio, this.bOffset[2] + s.center[2] * ratio],
      r: s.r * ratio,
    }));
    this.viscosity = opts.viscosity ?? a.params.viscosity;
    this.kA = a.params.sminK;
    const rng = makeRng((opts.seed ?? 1) * 7919 + 13);
    const n = Math.max(0, Math.min(8, opts.droplets ?? 6));
    // Droplets leave the contact point mostly upward/sideways, perpendicular to the A→B axis.
    const axis = this.bOffset;
    const al = Math.hypot(...axis) || 1;
    this.droplets = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const up = rng.range(0.35, 1);
      const side: Vec3 = [Math.cos(ang), up, Math.sin(ang)];
      // remove the component along the merge axis so droplets fly out of the seam
      const d = (side[0] * axis[0] + side[1] * axis[1] + side[2] * axis[2]) / (al * al);
      const dir: Vec3 = [side[0] - axis[0] * d, side[1] - axis[1] * d + 0.4, side[2] - axis[2] * d];
      const dl = Math.hypot(...dir) || 1;
      this.droplets.push({ dir: [dir[0] / dl, dir[1] / dl, dir[2] / dl], dist: rng.range(0.9, 1.6), r: rng.range(0.1, 0.18), delay: rng.range(0, 0.15) });
    }
  }

  get durationMs(): number {
    return MERGE_TOTAL_MS;
  }

  sample(tMs: number): MergeFrame {
    const t = Math.max(0, tMs);
    if (t >= MERGE_TOTAL_MS) {
      return { params: cloneParams(this.child), boxHalf: this.boxFor(this.child.spheres, this.child), hideB: true, pop: 0, phase: 'done', done: true };
    }
    const a = this.a.params;
    const contact: Vec3 = [this.bOffset[0] * 0.5, this.bOffset[1] * 0.5 + 0.2, this.bOffset[2] * 0.5];

    if (t < MERGE_BLEND_MS) {
      const u = t / MERGE_BLEND_MS;
      const e = smooth(u);
      const pull = Math.pow(e, 1 + 1.5 * this.viscosity); // viscosity curve: thick = late
      const out = cloneParams(a);
      const main = a.spheres[0]!.center;
      const spheres: SpherePrim[] = a.spheres.map((s, i) => ({ center: [...s.center] as Vec3, r: i === 0 ? s.r * (1 + 0.22 * pull) : s.r }));
      for (const s of this.bSpheres) {
        spheres.push({ center: lerp3(s.center, [main[0], main[1] + 0.1, main[2]], pull), r: s.r * (1 - 0.35 * pull) });
      }
      // Droplets: fly out and back (sin curve), radius fades at both ends.
      for (const d of this.droplets) {
        const v = Math.max(0, Math.min(1, (u - d.delay) / (1 - d.delay)));
        const f = Math.sin(Math.PI * v);
        if (f < 0.05) continue;
        const gravity = 0.55 * v * v;
        spheres.push({ center: [contact[0] + d.dir[0] * d.dist * f, contact[1] + d.dir[1] * d.dist * f - gravity, contact[2] + d.dir[2] * d.dist * f], r: d.r * Math.sqrt(f) });
      }
      out.spheres = this.capSpheres(spheres, a.spheres.length + this.bSpheres.length);
      out.sminK = this.kA + (this.kA * 2.2) * Math.sin(Math.PI * u);
      out.noiseAmp = a.noiseAmp * (1 + 0.6 * Math.sin(Math.PI * u));
      out.morph = 0;
      return { params: out, boxHalf: this.boxFor(out.spheres, out), hideB: true, pop: 0, phase: 'blend', done: false };
    }

    // Morph: crossfade the collapsed union toward the child sphere set and palette.
    const v = (t - MERGE_BLEND_MS) / MERGE_MORPH_MS;
    const e = smooth(v);
    const from = this.sample(MERGE_BLEND_MS - 0.001).params.spheres;
    const to = this.child.spheres;
    const n = Math.max(from.length, to.length);
    const spheres: SpherePrim[] = [];
    for (let i = 0; i < n; i++) {
      const src = from[Math.min(i, from.length - 1)]!;
      const dst = to[Math.min(i, to.length - 1)]!;
      const shrink = i >= to.length ? 1 - e : 1; // surplus union spheres vanish into the child's main body
      spheres.push({ center: lerp3(src.center, dst.center, e), r: lerp(src.r, dst.r, e) * shrink });
    }
    const out = cloneParams(this.child);
    out.spheres = spheres;
    out.sminK = lerp(this.kA, this.child.sminK, e);
    out.noiseAmp = lerp(a.noiseAmp, this.child.noiseAmp, e);
    out.noiseFreq = lerp(a.noiseFreq, this.child.noiseFreq, e);
    out.baseColor = mixHex(a.baseColor, this.child.baseColor, e);
    out.innerColor = mixHex(a.innerColor, this.child.innerColor, e);
    out.rimColor = mixHex(a.rimColor, this.child.rimColor, e);
    out.highlightColor = mixHex(a.highlightColor, this.child.highlightColor, e);
    out.bubbleColor = mixHex(a.bubbleColor, this.child.bubbleColor, e);
    out.gloss = lerp(a.gloss, this.child.gloss, e);
    out.translucency = lerp(a.translucency, this.child.translucency, e);
    out.bubbleDensity = lerp(a.bubbleDensity, this.child.bubbleDensity, e);
    out.eye = { ...this.child.eye, size: lerp(a.eye.size, this.child.eye.size, e), spacing: e > 0.5 ? this.child.eye.spacing : a.eye.spacing };
    out.material = e > 0.5 ? this.child.material : a.material;
    out.morph = e;
    return { params: out, boxHalf: this.boxFor(out.spheres, out), hideB: true, pop: Math.sin(Math.PI * v), phase: 'morph', done: false };
  }

  /** Keeps ≤ 16 spheres: droplets go first, then B's smallest spheres. */
  private capSpheres(spheres: SpherePrim[], unionCount: number): SpherePrim[] {
    if (spheres.length <= BLOB_MAX_SPHERES_GPU) return spheres;
    const union = spheres.slice(0, unionCount);
    const droplets = spheres.slice(unionCount);
    const room = Math.max(0, BLOB_MAX_SPHERES_GPU - union.length);
    if (union.length <= BLOB_MAX_SPHERES_GPU) return union.concat(droplets.slice(0, room));
    return union.sort((p, q) => q.r - p.r).slice(0, BLOB_MAX_SPHERES_GPU);
  }

  private boxFor(spheres: SpherePrim[], params: BlobParams): Vec3 {
    const r = boundingRadius({ ...params, spheres });
    return [r, r, r];
  }
}
