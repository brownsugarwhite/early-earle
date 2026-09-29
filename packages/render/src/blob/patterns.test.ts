import { describe, expect, it } from 'vitest';
import { genomeFor } from '@ee/genome';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobParamBlock, BlobStyleField } from './blobParamsUniforms';
import { BLOB_MATERIAL_KIND_ID, BLOB_MATERIAL_KINDS, EARLE_TEST_STYLE, NO_PATTERN, PATTERN_KINDS, PATTERN_KIND_ID, SPECIES_PATTERNS, makePattern, patternPalette, speciesPalette, type BlobRenderParams } from './patterns';
import { hexToLinear } from '../common/tsl';
import { createFurFinMesh } from '../materials/FurFinMaterial';
import { createFeatherCardMesh, featherLayout } from '../materials/FeatherCardMaterial';

const style = (b: BlobParamBlock, slot: number, field: number): number[] => Array.from(b.styleData.slice((slot * BLOB_STYLE_STRIDE + field) * 4, (slot * BLOB_STYLE_STRIDE + field) * 4 + 4));
const main = (b: BlobParamBlock, slot: number, field: number): number[] => Array.from(b.data.slice((slot * BLOB_STRIDE + field) * 4, (slot * BLOB_STRIDE + field) * 4 + 4));

describe('material kinds', () => {
  it('extends the genome ids with fur 4 and feather 5', () => {
    expect(BLOB_MATERIAL_KINDS).toEqual(['jelly', 'liquid', 'gas', 'fire', 'fur', 'feather']);
    expect(BLOB_MATERIAL_KIND_ID).toEqual({ jelly: 0, liquid: 1, gas: 2, fire: 3, fur: 4, feather: 5 });
  });
});

describe('patterns', () => {
  it('ids are stable (0 none … 6 diamonds, 7 elephant … 10 mouse appended)', () => {
    expect(PATTERN_KINDS.map((k) => PATTERN_KIND_ID[k])).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(PATTERN_KIND_ID).toMatchObject({ elephant: 7, rex: 8, retriever: 9, mouse: 10 });
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

  it('species patterns carry their own coat and default to recolor 0.25', () => {
    expect(SPECIES_PATTERNS).toEqual(['tiger', 'giraffe', 'zebra', 'snake', 'spots', 'elephant', 'rex', 'retriever', 'mouse']);
    for (const kind of SPECIES_PATTERNS) expect(speciesPalette(kind).ground).toMatch(/^#[0-9a-f]{6}$/);
    const tiger = makePattern('tiger', '#7ce6d5');
    expect(tiger.ground).toBe(speciesPalette('tiger').ground);
    expect(tiger.recolor).toBe(0.25);
    expect(tiger.ink).toBe(speciesPalette('tiger').ink);
    // The Earle mosaic keeps the body palette (no coat, no recolor).
    const dia = makePattern('diamonds', '#7ce6d5');
    expect(dia.ground).toBeUndefined();
    expect(dia.recolor).toBeUndefined();
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

  it('recolor pulls the species coat into the body palette (write time, linear)', () => {
    const block = new BlobParamBlock(2);
    const g = genomeFor('tjorizo', 1, 1); // pezenpez teal body
    block.write(0, { ...g, pattern: makePattern('tiger', g.baseColor, { recolor: 0 }) }, { center: [0, 0, 0], scale: 1 });
    block.write(1, { ...g, pattern: makePattern('tiger', g.baseColor, { recolor: 1 }) }, { center: [0, 0, 0], scale: 1 });
    const saffron = hexToLinear(speciesPalette('tiger').ground!);
    const teal = hexToLinear(g.baseColor);
    const g0 = style(block, 0, BlobStyleField.GROUND);
    const g1 = style(block, 1, BlobStyleField.GROUND);
    expect(g0[0]).toBeCloseTo(saffron[0], 5);
    expect(g0[3]).toBeCloseTo(1); // full species coat
    expect(g1[1]).toBeCloseTo(teal[1], 3); // coat pulled onto the body colour
    expect(g1[3]).toBeCloseTo(1);
    // Halfway keeps the chroma (hue walks the OKLCh circle): not a grey average.
    block.write(1, { ...g, pattern: makePattern('tiger', g.baseColor, { recolor: 0.5 }) }, { center: [0, 0, 0], scale: 1 });
    const mid = style(block, 1, BlobStyleField.GROUND);
    const spread = Math.max(mid[0]!, mid[1]!, mid[2]!) - Math.min(mid[0]!, mid[1]!, mid[2]!);
    expect(spread).toBeGreaterThan(0.12);
    // Unpatterned bodies keep their colours (weight 0).
    block.write(0, g, { center: [0, 0, 0], scale: 1 });
    expect(style(block, 0, BlobStyleField.GROUND)[3]).toBe(0);
  });

  it('face mask: derived from the eyes by default (FACE slot + strength), dyn.face / params.faceMask override', () => {
    const block = new BlobParamBlock(3);
    const g = genomeFor('tjorizo', 3, 5); // two eyes
    block.write(0, g, { center: [0, 0, 0], scale: 1 });
    const face = style(block, 0, BlobStyleField.FACE);
    const e = g.eye.dir;
    const el = Math.hypot(e[0], e[1], e[2]);
    expect(face[0]).toBeCloseTo(e[0] / el, 5);
    expect(face[1]).toBeCloseTo(e[1] / el, 5);
    expect(face[2]).toBeCloseTo(e[2] / el, 5);
    expect(face[3]).toBeCloseTo(Math.hypot(g.eye.spacing + g.eye.size * 0.15, g.eye.size * 0.85) + 0.16, 5);
    expect(style(block, 0, BlobStyleField.PATTERN_LIGHT2)[3]).toBe(1); // strength
    // Creature code sets the mask from its eye sockets (dynamics win over params).
    block.write(1, { ...g, faceMask: { dir: [0, 1, 0], radius: 0.3 } }, { center: [0, 0, 0], scale: 1 }, { face: { dir: [0, 0, 2], radius: 0.7, strength: 0.5 } });
    expect(style(block, 1, BlobStyleField.FACE)).toEqual([0, 0, 1, expect.closeTo(0.7, 5)]);
    expect(style(block, 1, BlobStyleField.PATTERN_LIGHT2)[3]).toBeCloseTo(0.5);
    block.write(2, { ...g, faceMask: { dir: [0, 2, 0], radius: 0.3, strength: 0 } }, { center: [0, 0, 0], scale: 1 });
    expect(style(block, 2, BlobStyleField.FACE)).toEqual([0, 1, 0, expect.closeTo(0.3, 5)]);
    expect(style(block, 2, BlobStyleField.PATTERN_LIGHT2)[3]).toBe(0); // mask off
    block.hide(2);
    expect(style(block, 2, BlobStyleField.FACE)).toEqual([0, 0, 1, 0]);
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

describe('fur fins', () => {
  it('build one instanced draw per block, off until the caller sets the count', () => {
    const block = new BlobParamBlock(4);
    const fins = createFurFinMesh(block, { cards: 64 });
    expect(fins.cards).toBe(64);
    expect(fins.mesh.count).toBe(0);
    expect(fins.mesh.instanceMatrix.count).toBe(4 * 64);
    expect(fins.silhouetteOnly.value).toBe(0); // Hoch: the wider contour band
  });
});

describe('feather cards', () => {
  it('plumage layout: equal-size feathers in rings, within the budget, top and sides only', () => {
    for (const cards of [32, 64, 96, 128]) {
      const { cells, rows, dTheta } = featherLayout(cards);
      expect(cells).toHaveLength(cards);
      const used = cells.filter((c) => c.w > 0.5);
      expect(used.length).toBeLessThanOrEqual(cards);
      expect(used.length).toBeGreaterThan(cards * 0.8);
      expect(new Set(used.map((c) => c.x.toFixed(4))).size).toBe(rows);
      for (const c of used) {
        expect(Math.abs(c.y)).toBeLessThanOrEqual(1.75 + c.z / 2 + 1e-6);
        // Width of a feather (sin θ · φ step) stays close to the ring spacing: no crowding at the poles.
        const w = Math.sin(c.x) * c.z;
        expect(w).toBeGreaterThan(dTheta * 0.45);
        expect(w).toBeLessThan(dTheta * 2.2);
      }
    }
  });

  it('build one instanced draw per block (96 cards by default), off until the caller sets the count', () => {
    const block = new BlobParamBlock(2);
    const f = createFeatherCardMesh(block);
    expect(f.cards).toBe(96);
    expect(f.mesh.count).toBe(0);
    expect(f.mesh.instanceMatrix.count).toBe(2 * 96);
  });
});
