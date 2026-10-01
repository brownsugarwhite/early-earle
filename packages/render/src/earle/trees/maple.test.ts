import { describe, expect, it } from 'vitest';
import { Vector3, type InstancedBufferAttribute } from 'three/webgpu';
import { uniform } from 'three/tsl';
import type { PlaneTree as PlanetTree, TreeFamily } from '@ee/world';
import { PaletteAtlas, type WorldPalette } from '../palette';
import { WorldSlots } from '../worldSlots';
import { PaletteLookup, createFogSettings } from '../tsl';
import { PlanetVegetation } from '../planetVegetation';
import { MAPLE_SNOW_LEVEL, MAPLE_SNOW_RIM, MAPLE_WEATHER_U, createMapleTrunk } from './maple';
import { treeQuaternion } from './treeLayer';
import { Quaternion } from 'three/webgpu';

const maple = createMapleTrunk(8);
const pos = maple.geometry.getAttribute('position').array as Float32Array;
const bark = maple.geometry.getAttribute('bark').array as Float32Array;
const count = pos.length / 3;

/** Vertices einer Rinden-Ebene (0 Stamm, 1 Ast, 2 Zweig, 5 … 5.4 Schneesaum innen → Rand). */
function vertsOf(level: number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  const hi = level === MAPLE_SNOW_LEVEL ? level + MAPLE_SNOW_RIM + 1e-6 : level;
  for (let i = 0; i < count; i++) {
    const l = bark[i * 4 + 2]!;
    if (l >= level && l <= hi) out.push([pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!]);
  }
  return out;
}

describe('Schnee-Ahorn (Welt 08, Bild 01)', () => {
  it('ist deterministisch je Seed', () => {
    expect(Array.from(createMapleTrunk(8).geometry.getAttribute('position').array)).toEqual(Array.from(pos));
    expect(Array.from(createMapleTrunk(9).geometry.getAttribute('position').array)).not.toEqual(Array.from(pos));
  });

  it('trägt Rinde, Normalen, gültige Indizes, keine NaN und bleibt im Vertex-Budget', () => {
    const g = maple.geometry;
    expect(g.getAttribute('bark').itemSize).toBe(4);
    expect(g.getAttribute('normal').count).toBe(count);
    for (const name of Object.keys(g.attributes)) {
      const a = g.getAttribute(name).array as ArrayLike<number>;
      for (let i = 0; i < a.length; i++) expect(Number.isFinite(a[i]!)).toBe(true);
    }
    const idx = g.getIndex()!;
    for (let i = 0; i < idx.count; i++) expect(idx.getX(i)).toBeLessThan(count);
    // ein einziger Riese je Welt-Komposition, aber im Haupt- und Schattenpass gezeichnet
    expect(count).toBeLessThanOrEqual(9000);
  });

  it('ist ein Riese: massiger Stamm, weit ausladende Äste, hoch über der Verzweigung', () => {
    expect(maple.spread).toBeGreaterThan(2.2);
    expect(maple.top).toBeGreaterThan(4.5);
    const trunk = vertsOf(0);
    // Stamm bis über die doppelte Asthöhe, am Fuß fast so breit wie die erste Asthöhe (Bild 01)
    expect(Math.max(...trunk.map((p) => p[1]))).toBeGreaterThan(2);
    const foot = trunk.filter((p) => p[1] > 0.1 && p[1] < 0.3).map((p) => Math.hypot(p[0], p[2]));
    expect(Math.max(...foot)).toBeGreaterThan(0.7);
  });

  it('nichts schwebt und nichts taucht in den Schnee: Stamm und Saum stecken im Boden, Äste und Zweige bleiben oben', () => {
    expect(Math.min(...vertsOf(0).map((p) => p[1]))).toBeLessThan(-0.2);
    // der Rand des Schneesaums liegt rundum unter dem Boden
    const skirt = vertsOf(MAPLE_SNOW_LEVEL);
    expect(skirt.length).toBeGreaterThan(200);
    const rim = skirt.filter((p) => Math.hypot(p[0], p[2]) > 1.6);
    expect(rim.length).toBeGreaterThan(20);
    for (const p of rim.filter((q) => Math.hypot(q[0], q[2]) > 1.95)) expect(p[1]).toBeLessThan(0);
    // die Rinden-Ebene des Saums läuft von innen (5) nach außen (5.4): Verlauf vom Weiß am Stamm zum Ton des Felds
    const levels = Array.from({ length: count }, (_, i) => bark[i * 4 + 2]!).filter((l) => l >= MAPLE_SNOW_LEVEL - 0.01);
    expect(Math.min(...levels)).toBeCloseTo(MAPLE_SNOW_LEVEL, 6);
    expect(Math.max(...levels)).toBeCloseTo(MAPLE_SNOW_LEVEL + MAPLE_SNOW_RIM, 6);
    for (const level of [1, 2]) expect(Math.min(...vertsOf(level).map((p) => p[1])), `Ebene ${level}`).toBeGreaterThan(0.6);
  });

  it('der Schneesaum deckt die Wurzelanläufe: kein Stamm-Vertex nahe dem Boden steht außerhalb über dem Saum', () => {
    const skirt = vertsOf(MAPLE_SNOW_LEVEL);
    // Höhe des Saums je Richtung und Abstand (gröbste Näherung: höchster Saum-Vertex im selben Sektor weiter außen)
    const sector = (p: readonly number[]) => Math.round((Math.atan2(p[2]!, p[0]!) / (Math.PI * 2)) * 56);
    for (const p of vertsOf(0)) {
      const r = Math.hypot(p[0], p[2]);
      if (p[1] < 0 || p[1] > 0.12 || r < 1.0) continue;
      const cover = skirt.filter((q) => sector(q) === sector(p) && Math.hypot(q[0], q[2]) >= r - 0.02);
      expect(Math.max(...cover.map((q) => q[1])), `Wurzel bei r ${r.toFixed(2)}`).toBeGreaterThan(p[1] - 0.02);
    }
  });

  it('jeder Ast hängt am Baum: sein Ansatz liegt im Stamm oder auf einem früheren Ast', () => {
    const trunkAxisR = (y: number) => 0.65 * (1 + 0.85 * Math.exp(-Math.max(0, y + 0.02) / 0.16));
    const distToPath = (q: readonly number[], path: ReadonlyArray<readonly number[]>): number => {
      let best = Infinity;
      for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i]!;
        const b = path[i + 1]!;
        const ab = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
        const aq = [q[0]! - a[0]!, q[1]! - a[1]!, q[2]! - a[2]!];
        const t = Math.max(0, Math.min(1, (aq[0]! * ab[0]! + aq[1]! * ab[1]! + aq[2]! * ab[2]!) / Math.max(1e-9, ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2)));
        best = Math.min(best, Math.hypot(aq[0]! - ab[0]! * t, aq[1]! - ab[1]! * t, aq[2]! - ab[2]! * t));
      }
      return best;
    };
    maple.paths.forEach((path, k) => {
      const s = path[0]!;
      const onTrunk = Math.hypot(s[0], s[2]) < trunkAxisR(s[1]) && s[1] > 0.5 && s[1] < 2.4;
      const onLimb = maple.paths.slice(0, k).some((p) => distToPath(s, p) < 1e-3);
      expect(onTrunk || onLimb, `Pfad ${k}`).toBe(true);
    });
  });

  it('der Schnee türmt sich auf der Wetterseite: dort ist der Saum am höchsten', () => {
    const az = Math.atan2(-Math.cos(2 * Math.PI * MAPLE_WEATHER_U), -Math.sin(2 * Math.PI * MAPLE_WEATHER_U));
    const skirt = vertsOf(MAPLE_SNOW_LEVEL);
    const top = skirt.reduce((a, b) => (b[1] > a[1] ? b : a));
    let d = Math.atan2(top[2], top[0]) - az;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    expect(Math.abs(d)).toBeLessThan(0.6);
    // Lee: niedrig (die Wurzelanläufe stecken trotzdem darin)
    const lee = skirt.filter((p) => {
      let e = Math.atan2(p[2], p[0]) - az - Math.PI;
      e = Math.atan2(Math.sin(e), Math.cos(e));
      return Math.abs(e) < 0.3;
    });
    expect(Math.max(...lee.map((p) => p[1]))).toBeLessThan(top[1] - 0.15);
  });
});

describe('Schnee-Ahorn in der Baumschicht', () => {
  const palette: WorldPalette = {
    ink: '#0c0c0e',
    terrain: ['#f3ede0', '#faf4e6', '#fcf7ea', '#fdf9ef', '#fefbf3'],
    canopy: ['#141416', '#222226', '#c8c8c8', '#e8e8e8', '#f8f8f8', '#d81c1c', '#f4f2ec'],
    sky: ['#646468', '#58585c', '#4c4c50', '#403f44', '#2c2a2e', '#1c1a1c'],
    sun: '#6e6e74',
    sunRing: '#66666c',
    fog: ['#5a5a60', '#4c4c52', '#56565c', '#5c5c62', '#626268', '#66666c'],
    fogAlpha: [0, 0.12, 0.26, 0.5, 0.82, 0.92],
    accent: ['#f4f0e6', '#34343a', '#8e0e0e', '#0c0c0e', '#e8e8e8', '#f8f8f8', '#c8c8cc', '#f4f2ec'],
  };
  const family: TreeFamily = { density: 0.3, clumpiness: 0, kinds: { bare: 1 }, scale: [1.2, 2.4], bark: 'calligraphy', snow: 1 };

  function tree(kind: 'maple' | 'oak', yaw?: number): PlanetTree {
    const p = new Vector3(0, 32, 0);
    return {
      position: [p.x, p.y, p.z],
      normal: [0, 1, 0],
      kind,
      scale: 2.4,
      canopyRadius: 3.12,
      trunkHeight: 1.44,
      hullCenter: [0, 35, 0],
      growth: 0,
      zone: 0,
      world: 0,
      rank: 0,
      variant: 0.37,
      ...(yaw !== undefined ? { yaw } : {}),
    };
  }

  it('landet im eigenen Stamm-Mesh, ohne Krone und ohne Punkte; die Höhe meldet er der Schattenkamera', () => {
    const atlas = new PaletteAtlas(512);
    const slots = new WorldSlots(atlas, () => palette, () => {});
    const rows = slots.rowsOfWorld(0);
    const veg = new PlanetVegetation({
      lookup: new PaletteLookup(atlas.texture, atlas.width, atlas.height),
      fog: createFogSettings({ row: rows.fog, steps: 5, start: 10, range: 20 }),
      bands: uniform(3),
      slots,
      family: () => family,
      capacity: { trees: 50, dots: 2000, props: 8, animals: 8 },
      dotsPerTree: [60, 200],
      collapsePx: 0.75,
    });
    veg.setContent([{ tree: tree('maple'), slot: 0, withDots: true }], []);
    const t = veg.trees;
    expect(t.trunks.maple.count).toBe(1);
    for (const k of ['dome', 'domeHi', 'column', 'pine'] as const) expect(t.crowns[k].count).toBe(0);
    expect(t.dotCountTotal).toBe(0);
    // H = 0.46 · 3.12 ≈ 1.44; der höchste Zweig steht über 4.5 H
    expect(t.hMax).toBeGreaterThan(6);
    // Achse Fuß → Spitze (treeB) über dem Fuß
    const b = t.trunks.maple.geometry.getAttribute('treeB') as InstancedBufferAttribute;
    expect(b.getY(0)).toBeGreaterThan(32 + 6);
    veg.dispose();
  });

  it('dreht sich nach der Weltkomposition (yaw), sonst nach dem Hash der Lage', () => {
    const q0 = treeQuaternion(tree('maple', 1.2), new Quaternion());
    const q1 = treeQuaternion(tree('maple', 2.4), new Quaternion());
    const qh = treeQuaternion(tree('maple'), new Quaternion());
    expect(q0.angleTo(q1)).toBeGreaterThan(1);
    expect(q0.angleTo(qh)).toBeGreaterThan(1e-3);
  });
});
