import { describe, expect, it } from 'vitest';
import { InstancedBufferAttribute, InstancedBufferGeometry, Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { PaletteAtlas } from '../palette';
import { PaletteLookup, createFogSettings } from '../tsl';
import type { BillboardUniforms } from './branches';
import { createCanopy, domeBandFamilies } from './canopy';
import { CANOPY_FAMILIES, addTreePalette, familyTone } from './palette';
import { computeTreeShape } from './shape';

function billboards(): BillboardUniforms {
  return {
    camRight: uniform(new Vector3(1, 0, 0)),
    camUp: uniform(new Vector3(0, 1, 0)),
    projScaleY: uniform(1),
    sunDirWorld: uniform(new Vector3(0, 1, 0)),
    collapsePx: uniform(0.8),
    crown: uniform(1),
    clock: uniform(0),
  };
}

describe('Krone v4: drei harte Farbbänder je Kuppel (Bild 02 / Ebene 3)', () => {
  it('jede Kuppel läuft kühl → Mitte → warm, in jedem Farbmodus', () => {
    for (const mode of CANOPY_FAMILIES) {
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const [cool, mid, warm] = domeBandFamilies(mode, t);
        expect(cool, `${mode} ${t}`).toBeLessThan(mid);
        expect(mid, `${mode} ${t}`).toBeLessThan(warm);
        expect(cool).toBeGreaterThanOrEqual(0);
        expect(warm).toBeLessThan(4);
      }
    }
  });

  it('Juwel: die oberen Kuppeln Rot oben → Violett → Blau unten, tiefe Randkuppeln kühler', () => {
    // Familien 0..4: Türkis, Blau, Violett, Magenta, Rot
    const [cool, mid, warm] = domeBandFamilies('jewel', 0.8);
    expect(warm).toBeGreaterThan(3.5);
    expect(mid).toBeGreaterThan(1.6);
    expect(mid).toBeLessThan(3);
    expect(cool).toBeGreaterThan(0.8);
    expect(cool).toBeLessThan(1.8);
    const low = domeBandFamilies('jewel', 0.15);
    expect(low[0]).toBeLessThan(cool);
    expect(low[2]).toBeLessThan(warm);
  });

  it('Geschwister (Drift) behalten ihren Ton: ein Türkisbaum bekommt keine rote Kappe', () => {
    const teal = domeBandFamilies('jewel', 0.1, 0.6);
    const red = domeBandFamilies('jewel', 0.9, 0.6);
    expect(teal[2]).toBeLessThan(3);
    expect(red[2]).toBeGreaterThan(3.5);
    expect(domeBandFamilies('jewel', 0.4, 1)[1]).toBeCloseTo(familyTone('jewel', 0.4), 6);
  });

  it('eine Instanz für alle Kuppeln + ein Randpunkt-Mesh; Bänder je Instanz, Randpunkte ×1,5', () => {
    const shape = computeTreeShape({ quality: 'mobil' });
    const atlas = new PaletteAtlas();
    const lookup = new PaletteLookup(atlas.texture, atlas.width, atlas.height);
    const rows = addTreePalette(atlas);
    const fog = createFogSettings({ row: rows.nofog, steps: 2, start: 1e6, range: 1 });
    const make = (dots: number) =>
      createCanopy({
        domes: shape.domes,
        lookup,
        fog,
        rows: { domes: rows.domes, motif: rows.motif },
        bands: uniform(3),
        family: 'jewel',
        quality: { dotsPerDome: [dots, dots], sphere: [18, 12], flowers: true },
        bb: billboards(),
        seed: 7,
      });
    const canopy = make(100);
    expect(canopy.counts.domes).toBe(shape.domes.length);
    expect(canopy.domes.count).toBe(shape.domes.length);
    // Randpunkte nur über der oberen Kugel (y ≥ −0,2): ≈ 1,5 × 100 je Kuppel
    expect(canopy.counts.dots / shape.domes.length).toBeGreaterThan(135);
    expect(canopy.counts.dots / shape.domes.length).toBeLessThan(165);
    const tone = (canopy.domes.geometry as InstancedBufferGeometry).getAttribute('domeTone') as InstancedBufferAttribute;
    for (let i = 0; i < tone.count; i++) {
      expect(tone.getX(i)).toBeLessThan(tone.getY(i));
      expect(tone.getY(i)).toBeLessThan(tone.getZ(i));
      expect(Math.abs(tone.getW(i))).toBeLessThanOrEqual(0.1);
    }
    // Farbmodus wechseln: dieselben Bänder wie domeBandFamilies, ohne Neubau
    canopy.setFamily('blue');
    const slot0 = tone.getZ(0);
    expect(shape.domes.some((d) => Math.abs(domeBandFamilies('blue', d.tone)[2] - slot0) < 1e-6)).toBe(true);
    canopy.dispose();
    atlas.dispose();
  });
});
