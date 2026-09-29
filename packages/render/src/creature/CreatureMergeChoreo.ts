import { makeRng, type Vec3 } from '@ee/genome';
import { MERGE_BLEND_MS, MERGE_MORPH_MS } from '../blob/MergeTimeline';
import type { CreatureRig, PartChoreo } from './CreatureRig';

/** Extra settle time after the body pop so the child's springs finish their follow-through. */
export const MERGE_SETTLE_MS = 180;
export const CREATURE_MERGE_TOTAL_MS = MERGE_BLEND_MS + MERGE_MORPH_MS + MERGE_SETTLE_MS;

interface Detach {
  rig: CreatureRig;
  id: string;
  dir: Vec3;
  spin: number;
  delay: number;
  reach: number;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Accessory choreography of a merge, timed to `MergeTimeline`: 0–300 ms the parents' parts detach
 * (fly out along their normals with a wobble, sag, spin and shrink), 300–450 ms the child's parts pop
 * onto their sockets with an overshoot while the body morphs, then the springs settle. The lab drives
 * it with the same clock as the body timeline; pure state on the rigs (`setChoreo`).
 */
export class CreatureMergeChoreo {
  private readonly detach: Detach[] = [];
  private readonly childIds: string[];
  private poked = false;
  private finished = false;

  constructor(
    readonly a: CreatureRig,
    readonly b: CreatureRig,
    readonly child: CreatureRig,
    opts: { seed?: number } = {},
  ) {
    const rng = makeRng((opts.seed ?? 3) * 104729 + 7);
    for (const rig of [a, b]) {
      for (const p of rig.parts) {
        const side: Vec3 = [rng.range(-0.5, 0.5), rng.range(0.2, 0.9), rng.range(-0.5, 0.5)];
        this.detach.push({ rig, id: p.spec.id, dir: side, spin: rng.range(-2.5, 2.5), delay: rng.range(0, 0.18), reach: rng.range(0.25, 0.5) });
      }
    }
    this.childIds = child.parts.map((p) => p.spec.id);
    // The child starts invisible until the pop.
    for (const id of this.childIds) child.setChoreo(id, { offset: [0, 0, 0], scale: 0, spin: 0 });
  }

  get durationMs(): number {
    return CREATURE_MERGE_TOTAL_MS;
  }

  get done(): boolean {
    return this.finished;
  }

  sample(tMs: number): void {
    const t = Math.max(0, tMs);
    // --- parents: detach --------------------------------------------------------------------------
    const u = clamp01(t / MERGE_BLEND_MS);
    for (const d of this.detach) {
      // Parts stay on the surface while the bodies start bridging (first ≈ 30 %), then fly off with a
      // small per-part delay and shrink away in the last stretch of the blend.
      const start = 0.3 + d.delay * 0.6;
      const v = clamp01((u - start) / (1 - start));
      if (u >= 1) {
        d.rig.setChoreo(d.id, { offset: [0, 0, 0], scale: 0, spin: 0 });
        continue;
      }
      const fly = Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.15)), 0.7); // out and back toward the seam
      const sag = 0.35 * v * v;
      const wobble = Math.sin(v * 22) * 0.04 * (1 - v);
      const c: PartChoreo = {
        offset: [d.dir[0] * d.reach * fly + wobble, d.dir[1] * d.reach * fly - sag, d.dir[2] * d.reach * fly],
        scale: 1 - smooth(clamp01((v - 0.6) / 0.4)),
        spin: d.spin * v,
      };
      d.rig.setChoreo(d.id, c);
    }
    // --- child: pop in ------------------------------------------------------------------------------
    const v = (t - MERGE_BLEND_MS) / MERGE_MORPH_MS;
    if (v < 0) return;
    if (!this.poked) {
      this.poked = true;
      this.child.poke(0.7);
      this.child.trigger('blink', 1);
    }
    const w = clamp01(v);
    const overshoot = 1 + 0.32 * Math.sin(Math.PI * w) * (1 - 0.4 * w);
    const scale = smooth(w) * overshoot;
    const reach = 0.18 * (1 - smooth(w));
    for (const id of this.childIds) this.child.setChoreo(id, { offset: [0, reach, 0], scale, spin: (1 - w) * 0.8 });
    if (t >= CREATURE_MERGE_TOTAL_MS && !this.finished) {
      this.finished = true;
      this.child.clearChoreo();
    }
  }

  /** Restores every rig (parents visible again) — for cancelling in the lab. */
  reset(): void {
    this.a.clearChoreo();
    this.b.clearChoreo();
    this.child.clearChoreo();
    this.finished = false;
    this.poked = false;
  }
}
