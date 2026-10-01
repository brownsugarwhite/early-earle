import { describe, expect, it } from 'vitest';
import { uniform, uniformArray } from 'three/tsl';
import type { PlaneLake, PlaneRiver } from '@ee/world';
import { EarleMaterial } from '../EarleMaterial';
import { PaletteAtlas } from '../palette';
import { PaletteLookup, createFogSettings, type UniformArrayLike } from '../tsl';
import { TOXIC_STYLE_ORDER, TOXIC_WATER, toxicStyleCode } from '../trash/palette';
import { DEFAULT_WATER_MOTION, createWaterMaterial } from './waterSurface';
import { buildWaterGeometry, smoothBanks } from './waterMesh';
import { decodeShore, encodeShore, packTerrainFlags } from './shoreBand';

function options() {
  const atlas = new PaletteAtlas(64);
  const water = atlas.addRow({ name: 'w/water', steps: ['#0d5560', '#12707c', '#1f98a0', '#56c8bc', '#b8f0e0', '#e8fff4', '#0b4a50', '#9fe8d8'] });
  const fog = atlas.addRow({ name: 'w/fog', steps: ['#6a7066', '#4a5048', '#6a7064', '#8a8e7e', '#a8a894'], alphas: [0, 0.2, 0.4, 0.6, 0.8] });
  return {
    lookup: new PaletteLookup(atlas.texture, atlas.width, atlas.height),
    fog: createFogSettings({ row: fog, steps: 5, start: 10, range: 20 }),
    bands: uniform(3),
    waterRows: uniformArray([water, water], 'float') as unknown as UniformArrayLike,
    veil: () => uniform(0),
    warp: <T>(p: T): T => p,
    growth: () => uniform(0.2),
  };
}

const lake = (toxic: boolean): PlaneLake => ({
  id: toxic ? 'p0-lake-0' : 'p0-lake-1',
  world: 0,
  region: 'p0',
  cx: toxic ? 0 : 30,
  cz: 0,
  radius: 3,
  stretch: 1.5,
  axis: -Math.PI / 2,
  wobble: [0.05, 0, 0.1, 1, 0.02, 2],
  level: 0,
  shore: 1.1,
  frozen: false,
  reach: 6,
  ...(toxic ? { toxic: true } : {}),
  band: 2,
});

const river: PlaneRiver = {
  id: 'p0-river-0',
  world: 0,
  region: 'p0',
  points: Array.from({ length: 12 }, (_, i) => [-4 + Math.sin(i * 0.6), 12 - i] as [number, number]),
  levels: new Array<number>(12).fill(0),
  widths: new Array<number>(12).fill(1.4),
  shore: 1.1,
  frozen: false,
  lake: 0,
  along: Array.from({ length: 12 }, (_, i) => i),
  toxic: true,
  band: 1.6,
};

describe('Wasser W7: Bewegung, Giftwasser, Uferband', () => {
  it('das Wassermaterial baut mit Bewegung (Standard und eigene Werte) und hält die Uniforms', () => {
    const plain = createWaterMaterial(options());
    expect(plain).toBeInstanceOf(EarleMaterial);
    expect(plain.motion.period.value).toBe(DEFAULT_WATER_MOTION.period);
    expect(plain.motion.drift.value).toBeGreaterThanOrEqual(0.05);
    expect(plain.motion.drift.value).toBeLessThanOrEqual(0.1);
    const custom = createWaterMaterial({ ...options(), motion: { drift: 0.09, lissajous: { fx: 5, amp: 0.2 }, bands: 0.04, period: 45 } });
    expect(custom).toBeInstanceOf(EarleMaterial);
    expect(custom.motion.drift.value).toBe(0.09);
    expect(custom.motion.fx.value).toBe(5);
    expect(custom.motion.fz.value).toBe(DEFAULT_WATER_MOTION.lissajous.fz);
    expect(custom.motion.amp.value).toBe(0.2);
    expect(custom.motion.bands.value).toBe(0.04);
    expect(custom.motion.period.value).toBe(45);
    // zur Laufzeit regelbar, ohne neues Material
    custom.motion.period.value = 30;
    expect(custom.motion.period.value).toBe(30);
  });

  it('Gift-Code je Vertex: Giftsee und Giftfluss tragen den Müllstil der Welt, klares Wasser 0', () => {
    const data = buildWaterGeometry([{ lakes: [lake(true), lake(false)], rivers: [river], slot: 1, featureBase: 0, toxicStyle: toxicStyleCode('sirup') }], { x: 0, z: 0 });
    expect(data).not.toBeNull();
    const wg = data!.wg;
    const n = data!.positions.length / 3;
    expect(wg.length).toBe(n * 3);
    const byFeature = new Map<number, Set<number>>();
    for (let i = 0; i < n; i++) {
      const f = wg[i * 3]!;
      if (!byFeature.has(f)) byFeature.set(f, new Set());
      byFeature.get(f)!.add(wg[i * 3 + 2]!);
    }
    expect([...byFeature.get(0)!]).toEqual([2]); // Giftsee, Sirup
    expect([...byFeature.get(1)!]).toEqual([0]); // klarer See
    expect([...byFeature.get(2)!]).toEqual([2]); // Giftfluss
    // ohne Stil: Rost
    const rost = buildWaterGeometry([{ lakes: [lake(true)], rivers: [], slot: 0, featureBase: 0 }], { x: 0, z: 0 })!;
    expect(rost.wg[2]).toBe(1);
  });

  it('Müllstile: fünf Giftfarben je Stil, Codes 1…5, Unbekanntes zählt als Rost', () => {
    expect(TOXIC_STYLE_ORDER.map((s) => toxicStyleCode(s))).toEqual([1, 2, 3, 4, 5]);
    expect(toxicStyleCode(undefined)).toBe(1);
    expect(toxicStyleCode('gibtsnicht')).toBe(1);
    for (const s of TOXIC_STYLE_ORDER) {
      expect(TOXIC_WATER[s]).toHaveLength(5);
      for (const c of TOXIC_WATER[s]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
    // Rost leuchtet im Neongrün der Startwelt
    expect(TOXIC_WATER.rost[3]).toBe('#b8ff2a');
  });

  it('Uferband-Code: stetig am Bandrand, umkehrbar; Flaggen gepackt', () => {
    expect(encodeShore(1, 0)).toBe(encodeShore(1, 1));
    for (const s of [0, 0.2, 0.5, 0.99]) {
      expect(decodeShore(encodeShore(s, 0))).toEqual({ shore: s, toxic: 0 });
      const t = decodeShore(encodeShore(s, 1));
      expect(t.toxic).toBe(1);
      expect(t.shore).toBeCloseTo(s, 9);
    }
    expect(encodeShore(1.4, 0)).toBe(1);
    expect(Math.floor(packTerrainFlags(1, 1, 4) / 4)).toBe(4);
    expect(packTerrainFlags(1, 1, 4) % 4).toBe(3);
  });

  it('Böschungshöhen glätten: zyklisch für Seen, ohne Übergriff an Flussenden', () => {
    const v = [0, 0, 0, 3, 0, 0, 0, 0];
    const c = smoothBanks(v, 1, true);
    expect(c.reduce((a, b) => a + b, 0)).toBeCloseTo(3, 9);
    expect(c[3]).toBeLessThan(3);
    expect(c[2]).toBeGreaterThan(0);
    const open = smoothBanks([3, 0, 0, 0], 2, false);
    expect(open[0]).toBeGreaterThan(open[1]!);
    expect(open[3]).toBeCloseTo(0, 9);
  });
});
