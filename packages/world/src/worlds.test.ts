import { describe, expect, it } from 'vitest';
import { PlanetField, generateChunkMesh, scatterChunkProps, scatterChunkTrees, spiralPath, type PlanetParams, type PlanetWorldParams } from './planet';
import { areaSplit, decideWorld, pathLongitude, wrapAngle } from './worldLayout';

const veg = (density: number): PlanetWorldParams['vegetation'] => ({ density, clumpiness: 0.5, kinds: { dome: 1 }, scale: [0.8, 1.2] });

/** Zehn Welten wie im Spiel: je Band eine nahe Welt, ferne Welten auf der Gegenseite (Band 1 und 3 halbiert). */
const worlds: PlanetWorldParams[] = [
  { id: 'w01', zone: 3, side: 'near', half: 0, terrain: { amplitude: 2.4 }, vegetation: veg(0.3), props: { animals: 0.01 } },
  { id: 'w02', zone: 2, side: 'near', terrain: { amplitude: 2.6 }, vegetation: veg(0.3) },
  { id: 'w03', zone: 3, side: 'near', half: 1, terrain: { amplitude: 1.8 }, vegetation: veg(0.2) },
  { id: 'w04', zone: 1, side: 'near', terrain: { amplitude: 4.2, slope: 0.5 }, vegetation: veg(0.2) },
  { id: 'w05', zone: 1, side: 'far', half: 1, terrain: { amplitude: 2.8 }, vegetation: veg(0.1), props: { rocks: 0.01 } },
  { id: 'w06', zone: 0, side: 'far', terrain: { amplitude: 3.6, ridge: 0.9 }, vegetation: veg(0.5) },
  { id: 'w07', zone: 2, side: 'far', terrain: { amplitude: 0.9 }, vegetation: veg(0.4) },
  { id: 'w08', zone: 3, side: 'far', terrain: { amplitude: 1.6, floor: 0.6, wavelength: 2 }, vegetation: veg(0.05), props: { barns: 0.004 } },
  { id: 'w09', zone: 0, side: 'near', terrain: { amplitude: 2.2 }, vegetation: veg(0.2), props: { trash: 0.05, pools: 0.01, animals: 0.01 } },
  { id: 'w10', zone: 1, side: 'far', half: 0, terrain: { amplitude: 0.7 }, vegetation: veg(0.3) },
];

const zones: PlanetParams['zones'] = ['tjorizo', 'syrup', 'luzz', 'wooding'].map((id, i) => ({ id, hillAmplitude: 1.5, vegetation: veg(0.2 + i * 0.01) }));
const params: PlanetParams = {
  radius: 36,
  seed: 7,
  chunksPerFace: 3,
  zones,
  worlds,
  spiral: { turns: 2.75, polarMarginDeg: 9 },
  landmarks: [{ id: 'hero-tree', world: 0, scale: 3, clearRadius: 5 }],
};

function randomDir(i: number): [number, number, number] {
  const u = ((i * 0.7548776662466927) % 1) * 2 - 1;
  const phi = ((i * 0.5698402909980532) % 1) * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(phi), u, r * Math.sin(phi)];
}

describe('worldLayout', () => {
  it('pathLongitude dreht `turns` mal über die Breite und ist in den Polkappen konstant', () => {
    const m = (9 * Math.PI) / 180;
    expect(pathLongitude(Math.PI / 2, 2.75, m)).toBeCloseTo(0, 9);
    expect(pathLongitude(Math.PI / 2 - m, 2.75, m)).toBeCloseTo(0, 9);
    expect(pathLongitude(-Math.PI / 2 + m, 2.75, m)).toBeCloseTo(2.75 * Math.PI * 2, 9);
    expect(pathLongitude(0, 2.75, m)).toBeCloseTo(2.75 * Math.PI, 9);
  });
  it('areaSplit teilt Bänder flächengleich (Polkappe: Grenze näher am Pol)', () => {
    const band = (a: number, b: number) => (Math.sin(a) - Math.sin(b)) / 2;
    const d = Math.PI / 180;
    for (const [hi, lo] of [[90, 45], [45, 0], [0, -45], [-45, -90]] as const) {
      const f = areaSplit(hi * d, lo * d);
      const mid = (hi + (lo - hi) * f) * d;
      expect(band(hi * d, mid)).toBeCloseTo(band(mid, lo * d), 9);
    }
    expect(areaSplit(-45 * d, -90 * d)).toBeCloseTo(0.3, 1);
    expect(areaSplit(45 * d, 0)).toBeCloseTo(0.54, 1);
  });
  it('wrapAngle liefert (-π, π]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(-Math.PI * 0.5)).toBeCloseTo(-Math.PI * 0.5, 9);
    expect(wrapAngle(Math.PI * 2.25)).toBeCloseTo(Math.PI * 0.25, 9);
  });
  it('decideWorld: nah → Story-Welt, fern → A/B nach Bandhälfte', () => {
    const t = { nearWorld: [8, 3, 1, 0], nearWorldB: [-1, -1, -1, 2], farWorldA: [5, 9, 6, 7], farWorldB: [-1, 4, -1, -1], farSplit: [0.5, 0.5, 0.5, 0.3] };
    const c = Math.cos((68 * Math.PI) / 180);
    expect(decideWorld(0.3, 1, c, t)).toBe(8);
    expect(decideWorld(0.3, -1, c, t)).toBe(5);
    expect(decideWorld(1.2, -1, c, t)).toBe(9);
    expect(decideWorld(1.7, -1, c, t)).toBe(4);
    expect(decideWorld(2.9, -0.5, c, t)).toBe(6);
    expect(decideWorld(3.6, -0.9, c, t)).toBe(7);
    expect(decideWorld(3.2, -0.9, c, t)).toBe(7);
    expect(decideWorld(3.1, 0.9, c, t)).toBe(0);
    expect(decideWorld(3.6, 0.9, c, t)).toBe(2);
  });
});

describe('PlanetField mit zehn Welten', () => {
  const field = new PlanetField(params);
  it('alle zehn Welten sind auf der Kugel vorhanden, jede mit plausiblem Flächenanteil', () => {
    const counts = new Array<number>(10).fill(0);
    const N = 6000;
    for (let i = 1; i <= N; i++) {
      const d = randomDir(i);
      counts[field.worldAt(d[0], d[1], d[2])]!++;
    }
    for (let w = 0; w < 10; w++) {
      const share = counts[w]! / N;
      expect(share, `world ${w}`).toBeGreaterThan(0.02);
      expect(share, `world ${w}`).toBeLessThan(0.3);
    }
  });
  it('die Pfadknoten liegen alle in der nahen Welt ihrer Zone', () => {
    const path = spiralPath(field, { nodesPerZone: 25 });
    expect(path.nodes.length).toBe(100);
    for (const n of path.nodes) {
      const d = n.position;
      const l = Math.hypot(...d);
      const w = field.worldAt(d[0] / l, d[1] / l, d[2] / l);
      expect(field.worlds[w]!.side).toBe('near');
      expect(field.worlds[w]!.zone).toBe(n.zone);
    }
  });
  it('Weltmittelpunkte liegen in ihrer Welt; Wahrzeichen-Slot liegt in Welt 0 auf der Oberfläche', () => {
    for (let w = 0; w < 10; w++) {
      const d = field.worldCenterDir(w);
      expect(Math.hypot(...d)).toBeCloseTo(1, 9);
      expect(field.worldAt(d[0], d[1], d[2])).toBe(w);
    }
    expect(field.landmarkSlots.length).toBe(1);
    const slot = field.landmarkSlots[0]!;
    expect(field.worldAt(...slot.dir)).toBe(0);
    expect(Math.hypot(...slot.position)).toBeGreaterThanOrEqual(36 - 1e-6);
    expect(Math.hypot(...slot.normal)).toBeCloseTo(1, 6);
  });
  it('Shader-Entscheidung aus den Vertex-Attributen stimmt mit worldAt überein', () => {
    const m = generateChunkMesh(field, { face: 4, cx: 1, cy: 1 }, 12);
    for (let k = 0; k < m.vertexCount; k++) {
      const gpu = decideWorld(m.zone[k]!, m.side[k * 2]!, field.cosHalfWidth, field.tables);
      const p = [m.positions[k * 3]!, m.positions[k * 3 + 1]!, m.positions[k * 3 + 2]!];
      const l = Math.hypot(...p);
      expect(gpu).toBe(field.worldAt(p[0]! / l, p[1]! / l, p[2]! / l));
    }
    expect(m.worldIndex).toBeGreaterThanOrEqual(0);
  });
  it('Höhe bleibt in [0, hMax], ist stetig über Weltgrenzen und deterministisch', () => {
    const f2 = new PlanetField(params);
    expect(field.hMax).toBeCloseTo(4.2, 9);
    for (let i = 1; i <= 400; i++) {
      const d = randomDir(i);
      const h = field.heightAt(d[0], d[1], d[2]);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(field.hMax + 1e-6);
      expect(h).toBeCloseTo(f2.heightAt(d[0], d[1], d[2]), 10);
      // Stetigkeit: benachbarter Punkt (0.5°) unterscheidet sich höchstens um einen Bruchteil der Amplitude
      const e = 0.0087;
      const d2 = [d[0] + e, d[1], d[2] - e];
      const l = Math.hypot(...d2);
      const h2 = field.heightAt(d2[0]! / l, d2[1]! / l, d2[2]! / l);
      expect(Math.abs(h2 - h)).toBeLessThan(1.2);
    }
  });
  it('Grat-Welt (06) ist rauer als die Ebene (10), die Scheunenwelt (08) ist überwiegend flach', () => {
    // Über die ganze Fläche jeder Welt messen (Zufallsrichtungen, nach worldAt gefiltert)
    const stats = new Map<number, { rough: number; flat: number; n: number }>();
    const e = 0.004;
    for (let i = 1; i <= 12000; i++) {
      const d = randomDir(i);
      const w = field.worldAt(d[0], d[1], d[2]);
      if (w !== 5 && w !== 9 && w !== 7) continue;
      const h = field.heightAt(d[0], d[1], d[2]);
      const d2 = [d[0] + e, d[1], d[2]];
      const l2 = Math.hypot(...d2);
      const h2 = field.heightAt(d2[0]! / l2, d2[1]! / l2, d2[2]! / l2);
      const s0 = stats.get(w) ?? { rough: 0, flat: 0, n: 0 };
      s0.rough += Math.abs(h2 - h);
      s0.flat += h < 0.15 ? 1 : 0;
      s0.n++;
      stats.set(w, s0);
    }
    const r = (w: number) => stats.get(w)!.rough / stats.get(w)!.n;
    expect(r(5)).toBeGreaterThan(r(9) * 2);
    expect(stats.get(7)!.flat / stats.get(7)!.n).toBeGreaterThan(0.5);
  });
  it('Streuung nimmt die Welt am Ort: Müll nur in Welt 09, Scheunen nur in Welt 08, Wahrzeichen frei', () => {
    const c9 = field.worldCenterDir(8);
    const c8 = field.worldCenterDir(7);
    const chunkOf = (dir: number[]) => {
      // Chunk suchen, dessen Mittelpunkt dem Ziel am nächsten liegt
      let best = { face: 0, cx: 0, cy: 0 };
      let bestDot = -2;
      for (let face = 0; face < 6; face++)
        for (let cy = 0; cy < 3; cy++)
          for (let cx = 0; cx < 3; cx++) {
            const m = generateChunkMesh(field, { face, cx, cy }, 2);
            const c = m.center;
            const l = Math.hypot(...c);
            const dot = (c[0] / l) * dir[0]! + (c[1] / l) * dir[1]! + (c[2] / l) * dir[2]!;
            if (dot > bestDot) {
              bestDot = dot;
              best = { face, cx, cy };
            }
          }
      return best;
    };
    const trashChunk = chunkOf(c9);
    const props9 = scatterChunkProps(field, trashChunk, { densityScale: 1 });
    expect(props9.some((p) => p.kind === 'mound' || p.kind === 'tire' || p.kind === 'pipe')).toBe(true);
    expect(props9.every((p) => p.kind === 'barn' ? p.world === 7 : true)).toBe(true);
    for (const p of props9) if (p.kind !== 'animal' && p.kind !== 'barn' && p.kind !== 'rock') expect(p.world).toBe(8);
    const barnChunk = chunkOf(c8);
    const props8 = scatterChunkProps(field, barnChunk, { densityScale: 1 });
    for (const p of props8) if (p.kind === 'barn') expect(p.world).toBe(7);
    // Müll-Regler: 0 → keine Müll-Requisiten
    const none = scatterChunkProps(field, trashChunk, { densityScale: 1, trashScale: 0 });
    expect(none.some((p) => p.kind === 'mound' || p.kind === 'monolith' || p.kind === 'vent')).toBe(false);
    // Wahrzeichen: kein Baum im Freihalteradius
    const slot = field.landmarkSlots[0]!;
    const lmChunk = chunkOf(slot.dir);
    const trees = scatterChunkTrees(field, lmChunk, { densityScale: 1 });
    for (const t of trees) {
      const dist = Math.hypot(t.position[0] - slot.position[0], t.position[1] - slot.position[1], t.position[2] - slot.position[2]);
      expect(dist).toBeGreaterThan(slot.clearRadius);
    }
    expect(trees.every((t) => t.world >= 0 && t.world < 10 && t.variant >= 0 && t.variant < 1)).toBe(true);
  });
});
