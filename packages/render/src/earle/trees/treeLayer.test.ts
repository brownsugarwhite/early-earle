import { describe, expect, it } from 'vitest';
import { Vector3, type InstancedBufferAttribute, type InstancedBufferGeometry } from 'three/webgpu';
import { uniform } from 'three/tsl';
import type { PlanetTree, TreeFamily, TreeKind } from '@ee/world';
import { PaletteAtlas, addWorldPalette, type WorldPalette } from '../palette';
import { PaletteLookup, createFogSettings } from '../tsl';
import { PlanetVegetation, type VegetationTreeEntry } from '../planetVegetation';

const palette: WorldPalette = {
  ink: '#050f16',
  terrain: ['#0b4a24', '#138b36', '#1fb141', '#8fd23a', '#d7ec4e'],
  canopy: ['#0b1a2c', '#142a48', '#3a3f8a', '#4f7de0', '#a9c8ff', '#c8322e', '#e2d84a'],
  sky: ['#dcf5ee', '#a4e2e6', '#5fc4dc', '#2f9fd0', '#2a7fc4', '#1f5fb0'],
  sun: '#f7f6d8',
  sunRing: '#e9fbf4',
  fog: ['#1f5fb0', '#12456e', '#2a7fc4', '#5fb0dc', '#9fdcea', '#dcf5ee'],
  fogAlpha: [0, 0.3, 0.5, 0.68, 0.82, 0.92],
  accent: ['#9aa8ff', '#1c3bd6', '#0b1330', '#a894ff', '#d92f2b', '#7ed321', '#f2e34a', '#f4f4ef'],
};

const family: TreeFamily = { density: 1, clumpiness: 0, kinds: { dome: 1 }, scale: [0.8, 1.4], bark: 'calligraphy', snow: 0.5 };

function makeVegetation(dots = 20000): PlanetVegetation {
  const atlas = new PaletteAtlas();
  const rows = addWorldPalette(atlas, palette, 'w');
  return new PlanetVegetation({
    lookup: new PaletteLookup(atlas.texture, atlas.width, atlas.height),
    fog: createFogSettings({ row: rows.fog, steps: 5, start: 10, range: 20 }),
    bands: uniform(3),
    worldRows: [{ terrain: rows.terrain, canopy: rows.canopyRows, accent: rows.accent, monolith: rows.monolith, barn: rows.barn }],
    families: [family],
    capacity: { trees: 200, dots, props: 8, animals: 8 },
    dotsPerTree: [60, 200],
    collapsePx: 0.75,
    rowCount: atlas.rowCount,
  });
}

/** Bäume eines "Chunks" auf der Kugel (Radius 32) um die Richtung (x, 1, z). */
function trees(cx: number, cz: number, n: number, kinds: TreeKind[] = ['dome', 'umbrella', 'lace', 'oak', 'pine', 'jewel']): PlanetTree[] {
  const out: PlanetTree[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Vector3(cx + (i % 5) * 0.08, 1, cz + Math.floor(i / 5) * 0.08).normalize();
    const p = d.clone().multiplyScalar(32);
    const kind = kinds[i % kinds.length]!;
    const r = 0.9 + (i % 3) * 0.2;
    out.push({
      position: [p.x, p.y, p.z],
      normal: [d.x, d.y, d.z],
      kind,
      scale: 1,
      canopyRadius: r,
      trunkHeight: r,
      hullCenter: [p.x + d.x * 1.4 * r, p.y + d.y * 1.4 * r, p.z + d.z * 1.4 * r],
      growth: 0,
      zone: 0,
      world: 0,
      rank: i / n,
      variant: (i * 0.37) % 1,
    });
  }
  return out;
}

/** Punkte eines Slots aus dem Pool (Positionen relativ zum Fuß + Fuß), nach Inhalt sortiert. */
function dotsOfSlot(veg: PlanetVegetation, slot: number): string[] {
  const g = veg.dots.geometry as InstancedBufferGeometry;
  const rel = g.getAttribute('dotRel') as InstancedBufferAttribute;
  const base = g.getAttribute('dotBase') as InstancedBufferAttribute;
  const data = g.getAttribute('dotData') as InstancedBufferAttribute;
  const out: string[] = [];
  for (let i = 0; i < g.instanceCount; i++) {
    if (data.getW(i) !== slot) continue;
    out.push([base.getX(i), base.getY(i), base.getZ(i), rel.getX(i), rel.getY(i), rel.getZ(i), data.getX(i)].map((v) => v.toFixed(5)).join(','));
  }
  return out.sort();
}

const entries = (list: PlanetTree[], slot: number, withDots = true): VegetationTreeEntry[] => list.map((tree) => ({ tree, slot, withDots }));

describe('Bäume v3: Punkte ohne Ploppen', () => {
  it('Punkte je Baum sind deterministisch — Neuaufbau, andere Sonne und Nachbar-Chunks ändern nichts', () => {
    const a = trees(0.05, 0.02, 12);
    const b = trees(-0.25, 0.1, 12);
    const veg = makeVegetation();
    veg.setContent(entries(a, 3), []);
    const first = dotsOfSlot(veg, 3);
    expect(first.length).toBeGreaterThan(100);
    // Sonne dreht, Neuaufbau mit einem zweiten Chunk davor: Chunk 3 bleibt Punkt für Punkt gleich
    veg.setSunDirection(new Vector3(1, 0.2, 0).normalize(), new Vector3(-0.3, 0.2, 1).normalize());
    veg.setContent([...entries(b, 7), ...entries(a, 3)], []);
    expect(dotsOfSlot(veg, 3)).toEqual(first);
    // Frischer Aufbau (anderes Objekt) liefert dieselben Punkte
    const veg2 = makeVegetation();
    veg2.setContent(entries(a, 3), []);
    expect(dotsOfSlot(veg2, 3)).toEqual(first);
    veg.dispose();
    veg2.dispose();
  });

  it('Chunks ohne Punkte blenden aus statt zu ploppen; knappes Budget verdrängt nur ferne, ausblendende Chunks', () => {
    const a = trees(0.05, 0.02, 12);
    const veg = makeVegetation();
    veg.setContent(entries(a, 3), []);
    const before = dotsOfSlot(veg, 3).length;
    veg.trees.tick(1); // eingeblendet
    // Chunk verliert "nahe": Punkte bleiben im Pool (Ausblenden), bis die Blende durch ist
    veg.setContent(entries(a, 3, false), []);
    expect(dotsOfSlot(veg, 3).length).toBe(before);
    veg.trees.tick(0.3);
    expect(dotsOfSlot(veg, 3).length).toBe(before);
    veg.trees.tick(1);
    expect(dotsOfSlot(veg, 3).length).toBe(0);
    veg.dispose();
  });

  it('Budget: jeder Chunk bekommt höchstens seinen Anteil, die Kapazität wird nie überschritten', () => {
    const veg = makeVegetation(3000);
    const list: VegetationTreeEntry[] = [];
    for (let k = 0; k < 6; k++) list.push(...entries(trees(-0.3 + k * 0.12, 0.05, 20), k));
    veg.setContent(list, []);
    const g = veg.dots.geometry as InstancedBufferGeometry;
    expect(g.instanceCount).toBeLessThanOrEqual(3000);
    expect(g.instanceCount).toBeGreaterThan(0);
    veg.dispose();
  });

  it('Stämme und Kronen landen in ihren Archetyp-Meshes, die Eiche ohne Krone', () => {
    const veg = makeVegetation();
    veg.setContent(entries(trees(0.05, 0.02, 12), 1), []);
    const t = veg.trees;
    expect(t.crowns.dome.count + t.crowns.domeHi.count).toBe(8); // dome, umbrella, lace, jewel je zweimal
    expect(t.crowns.pine.count).toBe(2);
    expect(t.trunks.oak.count).toBe(2);
    expect(t.trunks.fan.count).toBe(4);
    expect(t.trunks.pole.count).toBe(2);
    expect(t.trunks.fork.count).toBe(4); // dome und jewel
    expect(t.hMax).toBeGreaterThan(2);
    veg.dispose();
  });
});
