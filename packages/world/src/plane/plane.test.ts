import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, chunkMeshHeightAt, generatePlaneChunk, scatterPlaneProps, scatterPlaneTrees } from './chunks';
import { LATERAL_WORLD_BASE, PROLOGUE_WORLD_BASE } from './layout';
import { GradientNoise2 } from './noise2';
import { PlanePath } from './path';
import { proceduralWorldSpec } from './procedural';
import { AUTHORED_ROUTE, authoredSpecs, testField } from './testWorlds';

describe('GradientNoise2', () => {
  it('is deterministic, bounded and never repeats on the old 256-cell period', () => {
    const a = new GradientNoise2(42);
    const b = new GradientNoise2(42);
    let maxAbs = 0;
    let sum = 0;
    let sum2 = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const x = i * 0.731;
      const y = i * 0.417 - 20;
      const v = a.fbm(x, y, 2);
      expect(v).toBe(b.fbm(x, y, 2));
      maxAbs = Math.max(maxAbs, Math.abs(v));
      sum += v;
      sum2 += v * v;
    }
    expect(maxAbs).toBeLessThan(1.3);
    const std = Math.sqrt(sum2 / N - (sum / N) ** 2);
    expect(std).toBeGreaterThan(0.12);
    // Keine Periode 256 wie die alte Permutationstabelle
    let same = 0;
    for (let i = 0; i < 200; i++) if (Math.abs(a.sample(i * 0.37, 3.1) - a.sample(i * 0.37 + 256, 3.1)) < 1e-9) same++;
    expect(same).toBeLessThan(5);
  });
});

describe('WorldLayout', () => {
  const field = testField();
  const layout = field.layout;

  it('lays the authored route along −z: worlds 09, 06, 04, 10, 05, 02, 07, 08, 01, 03 for levels 1–100', () => {
    const order = AUTHORED_ROUTE.map((r) => r.world);
    for (let k = 0; k < order.length; k++) expect(layout.segment(k).world).toBe(order[k]);
    expect(layout.authoredLevels).toBe(100);
    expect(layout.segmentOfLevel(1)).toBe(0);
    expect(layout.segmentOfLevel(80)).toBe(8);
    expect(layout.segmentOfLevel(95)).toBe(8);
    expect(layout.segmentOfLevel(96)).toBe(9);
    expect(layout.segmentOfLevel(101)).toBe(10);
    expect(layout.segmentOfLevel(5000)).toBe(10 + Math.floor((5000 - 101) / 10));
    // Abschnitte schließen lückenlos aneinander, vorwärts = −z
    for (let k = -3; k < 30; k++) {
      const a = layout.segment(k);
      const b = layout.segment(k + 1);
      expect(a.zEnd).toBeCloseTo(b.zStart, 9);
      expect(a.zEnd).toBeLessThan(a.zStart);
    }
    expect(layout.segment(-1).world).toBe(PROLOGUE_WORLD_BASE + 1);
    expect(layout.segment(10).world).toBe(10);
    expect(layout.segment(25).world).toBe(25);
  });

  it('puts the path world in the band and neighbour worlds left and right — new ones as far as you pan', () => {
    const k = 3;
    const seg = layout.segment(k);
    const z = (seg.zStart + seg.zEnd) / 2;
    const xb = layout.backbone(z);
    expect(layout.sample(xb, z).world).toBe(seg.world);
    const seen = new Set<number>();
    for (let x = -1500; x <= 1500; x += 30) seen.add(layout.sample(xb + x, z).world);
    // Weit draußen nur prozedurale Welten, und viele verschiedene
    const far = [...seen].filter((w) => w >= LATERAL_WORLD_BASE);
    expect(far.length).toBeGreaterThan(40);
    // Seitlich neben den Autorenwelten stehen Autorenwelten (die alten „fernen“ Welten)
    const near = layout.sample(xb + layout.bandHalf(z) + 6, z).world;
    expect(near).toBeLessThan(10);
    expect(near).not.toBe(seg.world);
  });

  it('is deterministic and independent of the query order', () => {
    const a = testField(7).layout;
    const b = testField(7).layout;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 300; i++) pts.push([Math.sin(i * 1.7) * 400, -i * 13 + 200]);
    const wa = pts.map(([x, z]) => a.sample(x, z).world);
    const wb = [...pts].reverse().map(([x, z]) => b.sample(x, z).world).reverse();
    expect(wa).toEqual(wb);
  });

  it('reports borders: distance ≥ 0, neighbour world across, closable path cracks with ids ≥ 0', () => {
    let pathBorders = 0;
    for (let i = 0; i < 400; i++) {
      const z = -i * 1.3;
      const s = layout.sample(layout.backbone(z) + ((i % 7) - 3), z);
      expect(s.border).toBeGreaterThanOrEqual(0);
      if (s.borderId >= 0) pathBorders++;
    }
    expect(pathBorders).toBeGreaterThan(50);
  });
});

describe('PlaneField and chunks', () => {
  const field = testField();

  it('generates identical chunks for the same seed and seamless edges between neighbours', () => {
    const a = generatePlaneChunk(field, 0, -2, 17);
    const b = generatePlaneChunk(testField(), 0, -2, 17);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    // Nachbar rechts: dessen linke Kante = unsere rechte Kante (Welt-Koordinaten, Höhe, Normale)
    const right = generatePlaneChunk(field, 1, -2, 17);
    const n = a.n;
    for (let j = 0; j < n; j++) {
      const ia = j * n + (n - 1);
      const ib = j * n;
      expect(a.positions[ia * 3]! + a.ox).toBeCloseTo(right.positions[ib * 3]! + right.ox, 6);
      expect(a.positions[ia * 3 + 1]!).toBeCloseTo(right.positions[ib * 3 + 1]!, 5);
      expect(a.positions[ia * 3 + 2]! + a.oz).toBeCloseTo(right.positions[ib * 3 + 2]! + right.oz, 6);
      expect(a.normals[ia * 3 + 1]!).toBeCloseTo(right.normals[ib * 3 + 1]!, 5);
      expect(a.own[ia]).toBe(right.own[ib]);
    }
    // Schürze: 4 (n − 1) Punkte unter dem Rand
    expect(a.vertexCount).toBe(n * n + 4 * (n - 1));
  });

  it('answers the drawn mesh height exactly at grid points and in between', () => {
    const m = generatePlaneChunk(field, -1, -3, 17);
    const step = CHUNK_SIZE / (m.n - 1);
    for (let j = 0; j < m.n; j += 3) {
      for (let i = 0; i < m.n; i += 3) {
        const h = chunkMeshHeightAt(m, m.ox + i * step, m.oz + j * step)!;
        expect(h).toBeCloseTo(m.positions[(j * m.n + i) * 3 + 1]!, 5);
      }
    }
    const mid = chunkMeshHeightAt(m, m.ox + 0.3 * step, m.oz + 0.2 * step)!;
    expect(Number.isFinite(mid)).toBe(true);
    expect(chunkMeshHeightAt(m, m.ox - 1, m.oz)).toBeNull();
  });

  it('scatters trees and props deterministically, standing exactly on the drawn mesh', () => {
    const m = generatePlaneChunk(field, 0, -4, 33);
    const t1 = scatterPlaneTrees(field, 0, -4, { mesh: m });
    const t2 = scatterPlaneTrees(testField(), 0, -4, { mesh: generatePlaneChunk(testField(), 0, -4, 33) });
    expect(t1.length).toBeGreaterThan(0);
    expect(t1.map((t) => t.position)).toEqual(t2.map((t) => t.position));
    for (const t of t1) {
      expect(t.position[0]).toBeGreaterThanOrEqual(m.ox);
      expect(t.position[0]).toBeLessThan(m.ox + CHUNK_SIZE);
      expect(t.position[1]).toBeCloseTo(chunkMeshHeightAt(m, t.position[0], t.position[2])!, 5);
    }
    const props = scatterPlaneProps(field, 0, -4, { mesh: m });
    for (const p of props) expect(p.position[1]).toBeCloseTo(chunkMeshHeightAt(m, p.position[0], p.position[2])!, 5);
  });

  it('plans features per region: lakes carve the height field and stay inside their region', () => {
    let lakes = 0;
    for (let k = 0; k < 10; k++) {
      const key = `p${k}`;
      const r = field.features.region(key);
      for (const l of r.lakes) {
        lakes++;
        expect(field.layout.sample(l.cx, l.cz).region.key).toBe(key);
        // Spiegel unter dem Gelände am Ufer, Becken darunter
        expect(field.heightAt(l.cx, l.cz)).toBeLessThanOrEqual(l.level + 1e-6);
      }
    }
    expect(lakes).toBeGreaterThan(0);
  });
});

describe('PlanePath', () => {
  const field = testField();
  const path = new PlanePath(field, { seed: 7 });

  it('has nodes 1–100 on the authored route, in order, about one spacing apart', () => {
    const nodes = path.nodes(0, 99);
    expect(nodes).toHaveLength(100);
    nodes.forEach((n, i) => {
      expect(n.index).toBe(i);
      if (i > 0) {
        expect(n.s).toBeGreaterThan(nodes[i - 1]!.s);
        // der Riesenbaum-Abschnitt (80–95) ist kurz, dort liegen die Knoten dichter; Level auf einem Wahrzeichen liegen
        // neben der Route oben auf dem Plateau (bis ≈ 22 Einheiten)
        const d = Math.hypot(n.position[0] - nodes[i - 1]!.position[0], n.position[2] - nodes[i - 1]!.position[2]);
        const onLandmark = !!n.landmark || !!nodes[i - 1]!.landmark;
        expect(d).toBeLessThan(onLandmark ? 26 : 8);
        expect(d).toBeGreaterThan(0.8);
      }
    });
    expect(nodes[0]!.world).toBe(AUTHORED_ROUTE[0]!.world);
    expect(nodes[99]!.world).toBe(AUTHORED_ROUTE[9]!.world);
  });

  it('climbs landmarks: some levels stand on a plateau, the dots go up the steps and down again', () => {
    const nodes = path.nodes(0, 99);
    const on = nodes.filter((n) => n.landmark);
    expect(on.length).toBeGreaterThan(2);
    for (const n of on) {
      const a = n.landmark!.anchor;
      expect(n.position[1]).toBeCloseTo(a.position[1], 5);
      expect(a.radius).toBeGreaterThanOrEqual(4.5);
      // Punkte vor und nach dem Knoten erreichen die Höhe des Plateaus (Treppe hinauf und hinab)
      const seg = path.segment(n.segment);
      const up = seg.dots.filter((d) => d.seg === n.index - 1);
      const down = seg.dots.filter((d) => d.seg === n.index);
      expect(up.length).toBeGreaterThan(3);
      expect(down.length).toBeGreaterThan(3);
      expect(Math.max(...up.map((d) => d.position[1]))).toBeGreaterThan(a.position[1] - a.height * 0.6);
    }
  });

  it('continues forever: random access far along the path, deterministic', () => {
    const far = path.node(4999);
    const again = new PlanePath(testField(), { seed: 7 }).node(4999);
    expect(far.position).toEqual(again.position);
    expect(far.position[2]).toBeLessThan(-15000);
    // Übergang zwischen Abschnitten: Punkte führen vom letzten Knoten eines Abschnitts zum ersten des nächsten
    const seg = path.segment(12);
    const last = seg.nodes[seg.nodes.length - 1]!;
    const next = path.segment(13).nodes[0]!;
    const bridge = seg.dots.filter((d) => d.seg === last.index);
    expect(bridge.length).toBeGreaterThan(3);
    const end = bridge[bridge.length - 1]!;
    expect(Math.hypot(end.position[0] - next.position[0], end.position[2] - next.position[2])).toBeLessThan(1.2);
  });

  it('keeps the route near its backbone and off the lateral cracks', () => {
    for (let k = 0; k < 12; k++) {
      const seg = path.segment(k);
      for (const o of seg.offsets) expect(Math.abs(o)).toBeLessThanOrEqual(3.2 + 1e-6);
    }
  });
});

describe('procedural worlds', () => {
  it('differ from each other and from their parents, deterministically', () => {
    const authored = authoredSpecs();
    const specs = [10, 11, 12, 13, LATERAL_WORLD_BASE + 5].map((id) => proceduralWorldSpec(id, authored, 7));
    const again = proceduralWorldSpec(11, authored, 7);
    expect(again).toEqual(specs[1]);
    const keys = new Set(specs.map((s) => JSON.stringify([s.terrain, s.vegetation.density, s.vegetation.kinds])));
    expect(keys.size).toBe(specs.length);
    for (const s of specs) {
      expect(s.terrain.amplitude).toBeGreaterThan(0.5);
      expect(Object.keys(s.vegetation.kinds).length).toBeGreaterThan(0);
    }
  });
});
