import { describe, expect, it } from 'vitest';
import { genomeFor } from '@ee/genome';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobParamBlock, BlobStyleField } from './blobParamsUniforms';
import { BLOB_MATERIAL_KIND_ID, BLOB_MATERIAL_KINDS, EARLE_TEST_STYLE, NO_PATTERN, PATTERN_KINDS, PATTERN_KIND_ID, makePattern, patternPalette, type BlobRenderParams } from './patterns';

const style = (b: BlobParamBlock, slot: number, field: number): number[] => Array.from(b.styleData.slice((slot * BLOB_STYLE_STRIDE + field) * 4, (slot * BLOB_STYLE_STRIDE + field) * 4 + 4));
const main = (b: BlobParamBlock, slot: number, field: number): number[] => Array.from(b.data.slice((slot * BLOB_STRIDE + field) * 4, (slot * BLOB_STRIDE + field) * 4 + 4));

describe('material kinds', () => {
  it('extends the genome ids with fur 4 and feather 5', () => {
    expect(BLOB_MATERIAL_KINDS).toEqual(['jelly', 'liquid', 'gas', 'fire', 'fur', 'feather']);
    expect(BLOB_MATERIAL_KIND_ID).toEqual({ jelly: 0, liquid: 1, gas: 2, fire: 3, fur: 4, feather: 5 });
  });
});

describe('patterns', () => {
  it('ids are stable (0 none … 6 diamonds)', () => {
    expect(PATTERN_KINDS.map((k) => PATTERN_KIND_ID[k])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('palette harmonises with the body: marks derived from the base colour, lights from the Earle set', () => {
    for (const kind of PATTERN_KINDS) {
      const p = patternPalette(kind, '#7ce6d5');
      for (const c of [p.ink, p.light, p.light2]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(patternPalette('zebra', '#7ce6d5')).toEqual({ ink: '#12141c', light: '#eeecd6', light2: '#eeecd6' });
    expect(patternPalette('diamonds', '#7ce6d5').light).toBe('#e07380');
    // Tiger ink follows the base hue (different bases → different inks).
    expect(patternPalette('tiger', '#7ce6d5').ink).not.toBe(patternPalette('tiger', '#e8552a').ink);
  });

  it('makePattern fills defaults and keeps overrides', () => {
    const p = makePattern('spots', '#7ce6d5', { scale: 1.5, stipple: 0.4 });
    expect(p.kind).toBe('spots');
    expect(p.scale).toBe(1.5);
    expect(p.stipple).toBe(0.4);
    expect(p.contrast).toBe(0.8);
    expect(p.rimDots).toBeUndefined(); // material default (fur 0.8 / feather 0.5) applies
  });
});

describe('BlobParamBlock style block', () => {
  it('writes pattern, material, ripple, fur and feather knobs per instance', () => {
    const block = new BlobParamBlock(4);
    const params: BlobRenderParams = { ...genomeFor('tjorizo', 2, 7), material: 'fur', pattern: makePattern('tiger', '#7ce6d5', { contrast: 0.6, stipple: 0.3, rimDots: 0 }), fur: { length: 0.2 } };
    block.write(1, params, { center: [0, 0, 0], scale: 1 }, { ripple: { dir: [0, 0, 2], age: 0.5, strength: 0.8 }, seed: 10 });
    expect(main(block, 1, BlobField.MISC)[3]).toBe(4); // fur
    const mat = style(block, 1, BlobStyleField.MAT);
    expect(mat[0]).toBe(PATTERN_KIND_ID.tiger);
    expect(mat[1]).toBeCloseTo(1);
    expect(mat[2]).toBeCloseTo(0.6);
    expect(style(block, 1, BlobStyleField.PATTERN_INK)[3]).toBeCloseTo(0.3); // stipple
    expect(style(block, 1, BlobStyleField.PATTERN_LIGHT)[3]).toBeCloseTo(0); // explicit rimDots 0 wins over the fur default
    expect(style(block, 1, BlobStyleField.RIPPLE)).toEqual([0, 0, 1, 0.5]); // normalised dir, age
    const fur = style(block, 1, BlobStyleField.FUR);
    expect(fur[0]).toBeCloseTo(0.2);
    expect(fur[1]).toBeCloseTo(1);
    const fx = style(block, 1, BlobStyleField.FX);
    expect(fx[1]).toBeCloseTo(0.8); // ripple strength
    expect(fx[2]).toBeCloseTo(1); // feather size default
  });

  it('dynamics override the params (material, pattern) and hide() clears the style', () => {
    const block = new BlobParamBlock(2);
    const genome = genomeFor('tjorizo', 1, 3);
    block.write(0, genome, { center: [0, 0, 0], scale: 1 }, { material: 'feather', pattern: EARLE_TEST_STYLE.pattern });
    expect(main(block, 0, BlobField.MISC)[3]).toBe(5);
    expect(style(block, 0, BlobStyleField.MAT)[0]).toBe(PATTERN_KIND_ID.diamonds);
    expect(style(block, 0, BlobStyleField.RIPPLE)[3]).toBe(-1); // no ripple
    block.hide(0);
    expect(style(block, 0, BlobStyleField.MAT)[0]).toBe(0);
    expect(main(block, 0, BlobField.BOX)).toEqual([0, 0, 0, 0]);
  });

  it('fur keeps its dotted-rim default unless the pattern sets rimDots', () => {
    const block = new BlobParamBlock(1);
    block.write(0, { ...genomeFor('tjorizo', 2, 1), material: 'fur', pattern: makePattern('tiger', '#7ce6d5') }, { center: [0, 0, 0], scale: 1 });
    expect(style(block, 0, BlobStyleField.PATTERN_LIGHT)[3]).toBeCloseTo(0.8);
  });

  it('genome params without style fields render as before (no pattern)', () => {
    const block = new BlobParamBlock(1);
    block.write(0, genomeFor('tjorizo', 3, 1), { center: [0, 0, 0], scale: 1 });
    expect(style(block, 0, BlobStyleField.MAT)[0]).toBe(PATTERN_KIND_ID[NO_PATTERN.kind]);
    expect(style(block, 0, BlobStyleField.PATTERN_INK)[3]).toBe(0);
  });

  it('fire widens the instance box for the flame tongues', () => {
    const a = new BlobParamBlock(1);
    const b = new BlobParamBlock(1);
    const g = genomeFor('tjorizo', 8, 2, 'fire');
    a.write(0, { ...g, material: 'jelly' }, { center: [0, 0, 0], scale: 1 });
    b.write(0, g, { center: [0, 0, 0], scale: 1 });
    expect(main(b, 0, BlobField.BOX)[1]!).toBeGreaterThan(main(a, 0, BlobField.BOX)[1]!);
  });
});
