import { describe, expect, it } from 'vitest';
import { genomeFor, scaleForTier } from '@ee/genome';
import { MERGE_BLEND_MS, MERGE_TOTAL_MS, MergeTimeline } from './MergeTimeline';
import { BLOB_MAX_SPHERES_GPU } from './blobParamsUniforms';

function timeline(tier = 1) {
  const a = genomeFor('tjorizo', tier, 1);
  const b = genomeFor('tjorizo', tier, 2);
  const child = genomeFor('tjorizo', tier + 1, 3);
  const s = scaleForTier(tier);
  return { tl: new MergeTimeline({ params: a, center: [0, 0, 0], scale: s }, { params: b, center: [1, 0, 0], scale: s }, child, { seed: 4 }), a, b, child };
}

describe('MergeTimeline', () => {
  it('never exceeds the GPU sphere budget and keeps values finite', () => {
    for (const tier of [1, 4, 7]) {
      const { tl } = timeline(tier);
      for (let t = 0; t <= MERGE_TOTAL_MS; t += 10) {
        const f = tl.sample(t);
        expect(f.params.spheres.length).toBeLessThanOrEqual(BLOB_MAX_SPHERES_GPU);
        for (const s of f.params.spheres) expect([...s.center, s.r].every(Number.isFinite)).toBe(true);
        expect(f.boxHalf[0]).toBeGreaterThan(0);
        expect(f.hideB).toBe(true);
      }
    }
  });

  it('contains A ∪ B at the start and covers B with the box', () => {
    const { tl, a, b } = timeline();
    const f = tl.sample(0);
    expect(f.params.spheres.length).toBeGreaterThanOrEqual(a.spheres.length + b.spheres.length);
    // B sits one world unit to the right = 1/scale blob units; the box must reach it.
    expect(f.boxHalf[0]).toBeGreaterThan(1 / scaleForTier(1));
  });

  it('pulls B in, swells sminK mid-way and re-absorbs droplets by the end of the blend', () => {
    const { tl, a } = timeline();
    const mid = tl.sample(MERGE_BLEND_MS / 2);
    expect(mid.params.sminK).toBeGreaterThan(a.sminK);
    const end = tl.sample(MERGE_BLEND_MS - 1);
    const far = end.params.spheres.filter((s) => Math.hypot(...s.center) > 1.6 && s.r > 0.05);
    expect(far.length).toBe(0);
    expect(end.params.sminK).toBeCloseTo(a.sminK, 1);
  });

  it('morphs to the child genome with a pop and finishes', () => {
    const { tl, child } = timeline();
    const pop = tl.sample(MERGE_BLEND_MS + 75);
    expect(pop.phase).toBe('morph');
    expect(pop.pop).toBeGreaterThan(0.9);
    expect(pop.params.morph).toBeGreaterThan(0.4);
    const done = tl.sample(MERGE_TOTAL_MS);
    expect(done.done).toBe(true);
    expect(done.params.spheres).toEqual(child.spheres);
    expect(done.params.baseColor).toBe(child.baseColor);
    expect(done.params.material).toBe(child.material);
  });
});
