import { describe, expect, it } from 'vitest';
import { Vector3, type BufferGeometry } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { TREE_PROPORTIONS, type PlaneTree as PlanetTree, type TreeFamily, type TreeKind } from '@ee/world';
import { PaletteAtlas, type WorldPalette } from '../palette';
import { WorldSlots } from '../worldSlots';
import { PaletteLookup, createFogSettings } from '../tsl';
import { PlanetVegetation } from '../planetVegetation';
import { PARASOL_CAP, createParasolCrown, createParasolTrunk } from './parasol';
import { SHRUB_BASE, SHRUB_TOP, createShrubCrown } from './shrub';
import { FIR_HEIGHT, createFirCrown } from './fir';
import { TREE_FORMS } from './treeLayer';

/**
 * Baumarten der Welten 11/12 (Ebene 20, Ebene 7): Schirmbaum mit Pilzhut, Buschröschen, Earle-Tanne. Geometrie ohne NaN,
 * Indizes gültig, Formen wie im Bild (flacher Hut, breiter als hoch; Busch rund und flach; Tanne schmal und hoch).
 */

function positions(g: BufferGeometry): Float32Array {
  return g.getAttribute('position').array as Float32Array;
}

function bounds(g: BufferGeometry): { min: Vector3; max: Vector3 } {
  const p = positions(g);
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (let i = 0; i < p.length; i += 3) {
    min.min(new Vector3(p[i]!, p[i + 1]!, p[i + 2]!));
    max.max(new Vector3(p[i]!, p[i + 1]!, p[i + 2]!));
  }
  return { min, max };
}

function sane(g: BufferGeometry): void {
  for (const name of Object.keys(g.attributes)) {
    const a = g.getAttribute(name).array as ArrayLike<number>;
    for (let i = 0; i < a.length; i++) expect(Number.isFinite(a[i]!), name).toBe(true);
  }
  const n = g.getAttribute('position').count;
  const idx = g.getIndex()!;
  expect(idx.count % 3).toBe(0);
  for (let i = 0; i < idx.count; i++) expect(idx.getX(i)).toBeLessThan(n);
  const nor = g.getAttribute('normal').array as Float32Array;
  for (let i = 0; i < nor.length; i += 3) expect(Math.hypot(nor[i]!, nor[i + 1]!, nor[i + 2]!)).toBeCloseTo(1, 3);
}

describe('Welten 11/12: Kronen und Stamm', () => {
  it('Schirmbaum: flacher Pilzhut, deutlich breiter als hoch, unten fast gerade; Punkte am Rand', () => {
    for (const detail of ['ultra', 'hoch', 'mobil'] as const) {
      const t = createParasolCrown(detail);
      sane(t.geometry);
      const b = bounds(t.geometry);
      const width = b.max.x - b.min.x;
      const height = b.max.y - b.min.y;
      expect(width, detail).toBeGreaterThan(1.9);
      expect(width / height, detail).toBeGreaterThan(2.2);
      expect(b.max.y, detail).toBeCloseTo(PARASOL_CAP.height, 1);
      // Fransen hängen höchstens knapp unter den Rand
      expect(b.min.y, detail).toBeGreaterThan(-0.6);
      // Punktrand: die meisten Proben nahe der Hutkante
      const s = t.samples;
      let rim = 0;
      for (let i = 0; i < s.length; i += 6) if (Math.hypot(s[i]!, s[i + 2]!) > 0.75) rim++;
      expect(rim / (s.length / 6)).toBeGreaterThan(0.6);
      expect(t.sampleCast.length).toBe(s.length / 6);
    }
  });

  it('Schirmbaum-Stamm: kurz, dünn, gegabelt; die Äste enden unter dem Hut, der Fuß sinkt ein', () => {
    const hat = TREE_PROPORTIONS.parasol.trunk;
    const t = createParasolTrunk(hat);
    sane(t.geometry);
    const b = bounds(t.geometry);
    expect(b.min.y).toBeLessThan(-0.05);
    expect(t.top).toBeLessThan(hat + 0.15);
    expect(t.top).toBeGreaterThan(hat - 0.1);
    expect(t.spread).toBeLessThan(0.95);
    expect(t.geometry.getAttribute('position').count).toBeLessThanOrEqual(900);
  });

  it('Buschröschen: rund und flach, Fuß im Boden; Schuppenbögen in Ringen', () => {
    for (const detail of ['hoch', 'mobil'] as const) {
      const t = createShrubCrown(detail);
      sane(t.geometry);
      const b = bounds(t.geometry);
      expect(b.min.y, detail).toBeCloseTo(-SHRUB_BASE, 2);
      expect(b.max.y, detail).toBeGreaterThan(SHRUB_TOP * 0.95);
      expect(b.max.x - b.min.x, detail).toBeGreaterThan(1.8);
      expect(t.rims.length / 6, detail).toBeGreaterThan(30);
      expect(t.geometry.getAttribute('position').count, detail).toBeLessThanOrEqual(140);
    }
  });

  it('Earle-Tanne: schmal und hoch (Höhe ≥ 4 × Breite), hängende Etagen, Spitze als Dorn', () => {
    for (const detail of ['hoch', 'mobil'] as const) {
      const t = createFirCrown(detail);
      sane(t.geometry);
      const b = bounds(t.geometry);
      const width = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      expect(b.max.y, detail).toBeCloseTo(FIR_HEIGHT, 3);
      expect(b.max.y / width, detail).toBeGreaterThan(2.3);
      expect(b.min.y, detail).toBeGreaterThan(-0.4);
      expect(t.geometry.getAttribute('position').count, detail).toBeLessThanOrEqual(1200);
    }
  });

  it('Formen passen zu den Proportionen der Streuung (Schatten, Ausblendung, Kronenmitte)', () => {
    expect(TREE_FORMS.parasol.crown).toBe('parasol');
    expect(TREE_FORMS.parasol.crownY).toBe(TREE_PROPORTIONS.parasol.trunk);
    expect(TREE_FORMS.shrub.trunk).toBeNull();
    expect(TREE_FORMS.fir.crown).toBe('fir');
    // Die Tanne reicht bis zur Oberkante der Streuung (Schattenkamera, Nähe-Ausblendung)
    expect(TREE_FORMS.fir.crownY + FIR_HEIGHT).toBeLessThanOrEqual(TREE_PROPORTIONS.fir.top / TREE_PROPORTIONS.fir.radius + 0.4);
  });
});

const palette: WorldPalette = {
  ink: '#0b0c06',
  terrain: ['#0e1108', '#161b0b', '#77821d', '#b5ad2e', '#d9cf4a'],
  canopy: ['#0c0f07', '#11160a', '#1d2a12', '#a6a52a', '#dcd550', '#7fb52a', '#e6d24a'],
  canopyVariants: [['#4a1216', '#8c262e', '#b8434b', '#e0868c', '#f7cccb', '#ffeae2', '#d9a0a0']],
  sky: ['#bcc466', '#cacd62', '#d8d56b', '#e4db77', '#efe387', '#f8eb9c'],
  sun: '#fbf3b8',
  sunRing: '#f3eaa4',
  fog: ['#12301f', '#1f5a41', '#3c8866', '#5fae98', '#a6dccb', '#e6f3dc'],
  fogAlpha: [0, 0.3, 0.5, 0.66, 0.8, 0.9],
  accent: ['#c1b532', '#1a200d', '#0b0c06', '#0b0c06', '#4f5a14', '#c1b532', '#6a3a1a', '#e9dd5c'],
};

const family = { density: 1, clumpiness: 0, kinds: { shrub: 1 }, scale: [0.5, 0.9], rowVariants: 2, kindRows: { fir: 1, shrub: 0 } } as unknown as TreeFamily;

function tree(kind: TreeKind, i: number): PlanetTree {
  const r = TREE_PROPORTIONS[kind].radius * 1.2;
  return {
    position: [i * 2.5, 0, 0],
    normal: [0, 1, 0],
    kind,
    scale: 1.2,
    canopyRadius: r,
    trunkHeight: TREE_PROPORTIONS[kind].trunk * r,
    hullCenter: [i * 2.5, TREE_PROPORTIONS[kind].hull * r, 0],
    growth: 0,
    zone: 0,
    world: 0,
    rank: i / 10,
    variant: 0.9,
  };
}

describe('Welten 11/12: Baumschicht', () => {
  it('legt Schirmbaum, Busch und Tanne in eigene Kronen- und Stamm-Meshes, Kronenzeile je Art', () => {
    const atlas = new PaletteAtlas(512);
    const slots = new WorldSlots(atlas, () => palette, () => {});
    const rows = slots.rowsOfWorld(0);
    const veg = new PlanetVegetation({
      lookup: new PaletteLookup(atlas.texture, atlas.width, atlas.height),
      fog: createFogSettings({ row: rows.fog, steps: 5, start: 10, range: 20 }),
      bands: uniform(3),
      slots,
      family: () => family,
      capacity: { trees: 64, dots: 8000, props: 8, animals: 8 },
      dotsPerTree: [60, 200],
      collapsePx: 0.75,
    });
    const list = [tree('parasol', 0), tree('parasol', 1), tree('shrub', 2), tree('shrub', 3), tree('shrub', 4), tree('fir', 5)];
    veg.setContent(
      list.map((t) => ({ tree: t, slot: 0, withDots: true })),
      [],
    );
    const layer = veg.trees;
    expect(layer.crowns.parasol.count).toBe(2);
    expect(layer.crowns.shrub.count).toBe(3);
    expect(layer.crowns.fir.count).toBe(1);
    expect(layer.trunks.parasol.count).toBe(2);
    // Tanne: schlanker Gabel-Schaft in der untersten Etage; Busch ohne Stamm
    expect(layer.trunks.fork.count).toBe(1);
    // kindRows: Tanne in Zeile 1 (Variante), Busch in der Hauptzeile — trotz Zufallsvariante 0.9
    expect(layer.canopyRow(list[5]!)).toBe(rows.canopyRows[1]);
    expect(layer.canopyRow(list[2]!)).toBe(rows.canopyRows[0]);
    // Punkte: Schirmbaum-Rand und Buschbögen (die Tanne trägt keine Kronenpunkte)
    expect(layer.dotCountTotal).toBeGreaterThan(30);
    expect(layer.hMax).toBeGreaterThanOrEqual(TREE_PROPORTIONS.fir.top * list[5]!.canopyRadius - 1e-6);
    veg.dispose();
  });
});
