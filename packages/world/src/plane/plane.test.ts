import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, chunkMeshHeightAt, generatePlaneChunk, scatterPlaneProps, scatterPlaneTrees } from './chunks';
import { LATERAL_WORLD_BASE, PROLOGUE_WORLD_BASE, WorldLayout } from './layout';
import { GradientNoise2 } from './noise2';
import { PlanePath } from './path';
import { proceduralWorldSpec } from './procedural';
import { AUTHORED_ROUTE, ROUTE, authoredSpecs, testField } from './testWorlds';

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
  const beyond = ROUTE.beyondWorld;

  it('lays the route of content/zones/route.json along −z: 15 authored worlds, then the gate of the hinted zone 16', () => {
    const order = AUTHORED_ROUTE.map((r) => r.world);
    for (let k = 0; k < order.length; k++) expect(layout.segment(k).world).toBe(order[k]);
    // spielbar: bis zum ersten angedeuteten Eintrag (Zone 16 trägt nur den Torknoten)
    let playable = 0;
    for (const r of AUTHORED_ROUTE) {
      if (r.state === 'hinted') break;
      playable += r.levels;
    }
    expect(layout.authoredLevels).toBe(playable);
    expect(layout.authoredLevels).toBe(184);
    expect(layout.lastLevel).toBe(185);
    expect(layout.gateLevel).toBe(185);
    expect(layout.treeRange).toEqual([99, 114]);
    expect(layout.lastSegment).toBe(AUTHORED_ROUTE.length - 1);
    expect(layout.segmentOfLevel(1)).toBe(0);
    expect(layout.segmentOfLevel(14)).toBe(0);
    expect(layout.segmentOfLevel(15)).toBe(1);
    expect(layout.segmentOfLevel(99)).toBe(8);
    expect(layout.segmentOfLevel(114)).toBe(8);
    expect(layout.segmentOfLevel(115)).toBe(9);
    expect(layout.segmentOfLevel(184)).toBe(14);
    expect(layout.segmentOfLevel(185)).toBe(15);
    // hinter dem Tor gibt es keine Level: geklemmt auf den Torabschnitt
    expect(layout.segmentOfLevel(5000)).toBe(15);
    // Abschnitte schließen lückenlos aneinander, vorwärts = −z
    for (let k = -3; k < 30; k++) {
      const a = layout.segment(k);
      const b = layout.segment(k + 1);
      expect(a.zEnd).toBeCloseTo(b.zStart, 9);
      expect(a.zEnd).toBeLessThan(a.zStart);
    }
    // vor dem Start, am Tor und dahinter: die angedeutete Welt (keine prozeduralen Welten)
    expect(layout.segment(-1)).toMatchObject({ world: beyond, levels: 0, hinted: true });
    expect(layout.segment(15)).toMatchObject({ world: beyond, firstLevel: 185, levels: 1, hinted: true });
    expect(layout.segment(16)).toMatchObject({ world: beyond, levels: 0, hinted: true });
    expect(layout.segment(40)).toMatchObject({ world: beyond, levels: 0, hinted: true });
    expect(layout.segment(3).hinted).toBe(false);
    expect(layout.isHinted(beyond)).toBe(true);
    expect(layout.isHinted(AUTHORED_ROUTE[3]!.world)).toBe(false);
  });

  it('counts hinted route entries for the layout, not as playable levels', () => {
    const playable = AUTHORED_ROUTE.filter((r) => r.state !== 'hinted');
    const route = [...playable, { world: 4, levels: 10, state: 'hinted' as const }, { world: 6, levels: 10, state: 'hinted' as const }];
    const withHinted = new WorldLayout({ seed: 7, route, authored: 16, beyondWorld: beyond });
    // spielbar bleiben die Level 1–184; die angedeuteten Abschnitte tragen die Level 185–204, danach nichts mehr
    expect(withHinted.authoredLevels).toBe(184);
    expect(withHinted.gateLevel).toBe(185);
    expect(withHinted.lastLevel).toBe(204);
    expect(withHinted.segment(15)).toMatchObject({ world: 4, firstLevel: 185, levels: 10, hinted: true });
    expect(withHinted.segment(16)).toMatchObject({ world: 6, firstLevel: 195, levels: 10, hinted: true });
    expect(withHinted.segment(17)).toMatchObject({ world: beyond, levels: 0 });
    expect(withHinted.segmentOfLevel(190)).toBe(15);
    expect(withHinted.segmentOfLevel(200)).toBe(16);
    // Lage der Autorenabschnitte unverändert
    for (let k = 0; k < 15; k++) expect(withHinted.segment(k)).toEqual(layout.segment(k));
    // Ab dem ersten angedeuteten Eintrag zählt nichts mehr mit (auch ein späterer Eintrag ohne Flag nicht)
    const mixed = new WorldLayout({ seed: 7, route: [...playable, { world: 4, levels: 10, state: 'hinted' as const }, { world: 6, levels: 10 }], authored: 16 });
    expect(mixed.authoredLevels).toBe(184);
  });

  it('puts the path world in the band and only the hinted zone left and right — no cracks between hinted cells', () => {
    const k = 3;
    const seg = layout.segment(k);
    const z = (seg.zStart + seg.zEnd) / 2;
    const xb = layout.backbone(z);
    expect(layout.sample(xb, z).world).toBe(seg.world);
    const seen = new Set<number>();
    for (let x = -1500; x <= 1500; x += 30) seen.add(layout.sample(xb + x, z).world);
    expect([...seen].sort((a, b) => a - b)).toEqual([seg.world, beyond].sort((a, b) => a - b));
    // gleich neben dem Band: die angedeutete Zone, mit Riss am Bandrand
    const edge = layout.sample(xb + layout.bandHalf(z) + 0.3, z);
    expect(edge.world).toBe(beyond);
    expect(edge.neighbor).toBe(seg.world);
    expect(edge.border).toBeLessThan(1);
    // weit draußen: Zellen der angedeuteten Welt grenzen nur an sich selbst → kein Riss
    for (const x of [-900, -300, 300, 900]) {
      const s = layout.sample(xb + x, z);
      expect(s.world).toBe(beyond);
      expect(s.border).toBeGreaterThan(100);
    }
    // hinter dem Tor: keine Abschnittsgrenze zwischen Torabschnitt und Zone dahinter
    const g = layout.segment(16);
    const gz = g.zStart - 0.2;
    expect(layout.sample(layout.backbone(gz), gz).border).toBeGreaterThan(1);
  });

  it('with the lab flag `procedural`: procedural worlds behind the route and in far cells, authored neighbours near it', () => {
    const p = testField(7, { procedural: true }).layout;
    const n = AUTHORED_ROUTE.length;
    expect(p.procedural).toBe(true);
    expect(p.segment(n).world).toBe(p.authored);
    expect(p.segment(n + 9).world).toBe(p.authored + 9);
    expect(p.segment(-1).world).toBe(PROLOGUE_WORLD_BASE + 1);
    expect(p.segmentOfLevel(5000)).toBe(n + Math.floor((5000 - 186) / 10));
    const k = 3;
    const seg = p.segment(k);
    const z = (seg.zStart + seg.zEnd) / 2;
    const xb = p.backbone(z);
    const seen = new Set<number>();
    for (let x = -1500; x <= 1500; x += 30) seen.add(p.sample(xb + x, z).world);
    expect([...seen].filter((w) => w >= LATERAL_WORLD_BASE).length).toBeGreaterThan(40);
    const near = p.sample(xb + p.bandHalf(z) + 6, z).world;
    expect(near).toBeLessThan(p.authored);
    expect(near).not.toBe(seg.world);
    // die angedeutete Zone (Weltdatei `lateral: false`) wird nie Nachbarwelt
    for (let j = -20; j <= 20; j++) for (const c of [-2, -1, 1, 2]) expect(p.cellWorld(c, j)).not.toBe(ROUTE.beyondWorld);
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
  const last = ROUTE.levelCount - 1;

  it('has nodes 1–184 on the authored route, in order, about one spacing apart', () => {
    const nodes = path.nodes(0, last);
    expect(nodes).toHaveLength(184);
    nodes.forEach((n, i) => {
      expect(n.index).toBe(i);
      if (i > 0) {
        expect(n.s).toBeGreaterThan(nodes[i - 1]!.s);
        // der Riesenbaum-Abschnitt (99–114) ist kurz, dort liegen die Knoten dichter; Level auf einem Wahrzeichen liegen
        // neben der Route oben auf dem Plateau (bis ≈ 22 Einheiten)
        const d = Math.hypot(n.position[0] - nodes[i - 1]!.position[0], n.position[2] - nodes[i - 1]!.position[2]);
        const onLandmark = !!n.landmark || !!nodes[i - 1]!.landmark;
        expect(d).toBeLessThan(onLandmark ? 26 : 8);
        expect(d).toBeGreaterThan(0.8);
      }
    });
    expect(nodes[0]!.world).toBe(AUTHORED_ROUTE[0]!.world);
    expect(nodes[last]!.world).toBe(AUTHORED_ROUTE[14]!.world);
  });

  it('climbs landmarks: some levels stand on a plateau, the dots go up the steps and down again', () => {
    const nodes = path.nodes(0, last);
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

  it('ends at the gate node of the hinted zone: clamped nodes, no path behind it, the ribbon stops 1.5 after it', () => {
    expect(path.lastNode).toBe(184);
    const gate = path.node(184);
    expect(gate.world).toBe(ROUTE.beyondWorld);
    expect(gate.segment).toBe(15);
    // ein Stein knapp über dem Nebelmeer der angedeuteten Zone
    expect(gate.site).toBe('ledge');
    const sea = field.spec(ROUTE.beyondWorld).mist?.sea;
    if (sea) expect(gate.position[1]).toBeGreaterThan(sea.height ?? sea.level * field.spec(ROUTE.beyondWorld).terrain.amplitude);
    // geklemmt: hinter dem Tor gibt es keine Knoten
    expect(path.node(5000)).toBe(gate);
    expect(path.nodes(180, 400).map((n) => n.index)).toEqual([180, 181, 182, 183, 184]);
    // die Punkte des letzten Abschnitts (w15) führen bis zum Tor, am Tor beginnt kein Übergang mehr
    const w15 = path.segment(14);
    const bridge = w15.dots.filter((d) => d.seg === last);
    expect(bridge.length).toBeGreaterThan(3);
    const end = bridge[bridge.length - 1]!;
    expect(Math.hypot(end.position[0] - gate.position[0], end.position[2] - gate.position[2])).toBeLessThan(1.2);
    const gateSeg = path.segment(15);
    expect(gateSeg.nodes).toHaveLength(1);
    expect(gateSeg.dots).toHaveLength(0);
    // das Lichtband endet 1,5 hinter dem Torknoten
    const tail = gateSeg.ribbon[gateSeg.ribbon.length - 1]!;
    const dTail = Math.hypot(tail.position[0] - gate.position[0], tail.position[2] - gate.position[2]);
    expect(dTail).toBeGreaterThan(1.0);
    expect(dTail).toBeLessThan(1.5 + 0.3);
    // dahinter: keine Knoten, Punkte oder Bänder
    for (const k of [16, 17, 30]) {
      const seg = path.segment(k);
      expect(seg.nodes.length + seg.dots.length + seg.ribbon.length).toBe(0);
    }
    // deterministisch
    expect(new PlanePath(testField(), { seed: 7 }).node(184).position).toEqual(gate.position);
  });

  it('continues forever only with the lab flag `procedural`: random access far along the path, deterministic', () => {
    const p = new PlanePath(testField(7, { procedural: true }), { seed: 7 });
    const far = p.node(4999);
    const again = new PlanePath(testField(7, { procedural: true }), { seed: 7 }).node(4999);
    expect(far.position).toEqual(again.position);
    expect(far.position[2]).toBeLessThan(-15000);
    // Übergang zwischen Abschnitten: Punkte führen vom letzten Knoten eines Abschnitts zum ersten des nächsten
    const seg = p.segment(20);
    const lastNode = seg.nodes[seg.nodes.length - 1]!;
    const next = p.segment(21).nodes[0]!;
    const bridge = seg.dots.filter((d) => d.seg === lastNode.index);
    expect(bridge.length).toBeGreaterThan(3);
    const end = bridge[bridge.length - 1]!;
    expect(Math.hypot(end.position[0] - next.position[0], end.position[2] - next.position[2])).toBeLessThan(1.2);
  });

  it('keeps the route near its macro centreline and off the lateral cracks', () => {
    for (let k = 0; k < 16; k++) {
      const seg = path.segment(k);
      for (const o of seg.offsets) expect(Math.abs(o)).toBeLessThanOrEqual(3.2 + 1e-6);
      // die Probe liegt um ihren Versatz neben der Mittellinie der Makroform
      const m = field.layout.macro(k);
      seg.samples.forEach((s, i) => {
        if (i % 7 !== 0) return;
        expect(m.distance(s.position[0], s.position[2])).toBeLessThanOrEqual(3.2 + 0.05);
      });
    }
  });

  it('folds the serpentine: z runs back and forth along the route, the arc length s of the nodes only forward', () => {
    const k = AUTHORED_ROUTE.findIndex((r) => r.shape === 'serpentine');
    const seg = path.segment(k);
    let back = 0;
    for (let i = 1; i < seg.samples.length; i++) back = Math.max(back, seg.samples[i]!.position[2] - seg.samples[i - 1]!.position[2]);
    expect(back).toBeGreaterThan(0.05);
    // auch die Knoten selbst: mindestens einer liegt hinter (+z) seinem Vorgänger oder läuft quer
    const nodes = seg.nodes;
    expect(nodes.some((n, i) => i > 0 && Math.abs(n.position[2] - nodes[i - 1]!.position[2]) < 2)).toBe(true);
    for (let i = 1; i < nodes.length; i++) expect(nodes[i]!.s).toBeGreaterThan(nodes[i - 1]!.s);
  });

  it('finds every node from its own position (nearestNode) — folded sections included', () => {
    for (const n of path.nodes(0, path.lastNode)) {
      if (n.landmark) continue;
      expect(path.nearestNode(n.position[0], n.position[2]), `Knoten ${n.index}`).toBe(n.index);
    }
  });

  it('covers every node of a chunk with the chunk node range (growth by node rectangles)', () => {
    for (const n of path.nodes(0, path.lastNode)) {
      const cx = Math.floor(n.position[0] / CHUNK_SIZE);
      const cz = Math.floor(n.position[2] / CHUNK_SIZE);
      const r = path.nodeRangeInRect(cx * CHUNK_SIZE, cz * CHUNK_SIZE, (cx + 1) * CHUNK_SIZE, (cz + 1) * CHUNK_SIZE, 12);
      expect(r, `Knoten ${n.index}`).not.toBeNull();
      expect(n.index).toBeGreaterThanOrEqual(r![0]);
      expect(n.index).toBeLessThanOrEqual(r![1]);
      // der Bereich bleibt örtlich (eine Handvoll Knoten, nicht der ganze Abschnitt quer über die Ebene)
      expect(r![1] - r![0]).toBeLessThan(24);
    }
    // weit neben dem Pfad: keine Knoten im Rechteck, auf seiner Höhe schon
    const n = path.node(40);
    const far = n.position[0] + 200;
    expect(path.nodeRangeInRect(far, n.position[2], far + CHUNK_SIZE, n.position[2] + CHUNK_SIZE, 12)).toBeNull();
    const row = path.nodeRangeInRect(-Infinity, n.position[2], Infinity, n.position[2] + CHUNK_SIZE, 12)!;
    expect(row[0]).toBeLessThanOrEqual(40);
    expect(row[1]).toBeGreaterThanOrEqual(40);
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
