import { describe, expect, it } from 'vitest';
import { LABEL_MAX_TIER, LABEL_UNKNOWN, labelIndexForTier } from './BoardLabels';

describe('labelIndexForTier', () => {
  it('hat Schilder bis Stufe 15 (32768), darüber und darunter "?"', () => {
    expect(LABEL_MAX_TIER).toBe(15);
    expect(LABEL_UNKNOWN).toBe(15);
    for (let t = 1; t <= 15; t++) expect(labelIndexForTier(t)).toBe(t - 1);
    for (const t of [0, -1, 16, 20]) expect(labelIndexForTier(t)).toBe(LABEL_UNKNOWN);
  });
});
