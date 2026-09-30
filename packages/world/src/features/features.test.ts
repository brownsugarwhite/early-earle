import { describe, expect, it } from 'vitest';
import { PlanetField, chunkList, generateChunkMesh, scatterChunkProps, scatterChunkTrees, spiralPath, type PlanetParams, type PlanetWorldParams } from '../planet';
import { columnPeak, columnTopAt, localOf, NO_WATER, pathDistance, WATER_OVERLAP, type WorldFeatureSpec } from './index';
import { pointInPolygon } from './geometry';
import { lakeAt } from './lakes';

const veg = (density: number): PlanetWorldParams['vegetation'] => ({ density, clumpiness: 0.5, kinds: { dome: 1 }, scale: [0.8, 1.2] });

/** Merkmale wie in den Weltdateien (vereinfacht): Flüsse + Seen (nah), Felsen (nah und fern), Schnee, Eis, Wehen. */
const features: Record<string, WorldFeatureSpec> = {
  w02: { rivers: { count: 2, width: [1, 1.5], length: [14, 22], meander: 0.6, pathDistance: [2.4, 3.2] }, lakes: { count: 2, radius: [1.6, 2.4], stretch: 2.4 } },
  w03: { lakes: { count: 1, radius: [1.6, 2.2], stretch: 2.5, pathDistance: [2.4, 3.2] }, chisel: 0.6 },
  w04: {
    rocks: [
      { kind: 'terraces', count: 1, size: [8, 10], height: [3.4, 4.4], steps: 3, pathDistance: [2.6, 3.4] },
      { kind: 'wall', count: 1, size: [16, 22], height: [4, 5.5], steps: 3 },
      { kind: 'spires', count: 2, size: [2.4, 3.4], height: [3.4, 5], pathDistance: [2.6, 3.8] },
    ],
  },
  w05: { rocks: [{ kind: 'mesa', count: 1, size: [5.5, 7], height: [3.4, 4.4], focusDistance: [3, 9] }], lakes: { count: 1, radius: [2.3, 2.9], stretch: 0.55, frozen: true }, drifts: { trees: 1 } },
  w06: { snowFields: { cover: 0.45 }, rocks: [{ kind: 'wall', count: 1, size: [18, 24], height: [4, 5.5], steps: 3 }] },
  w09: { rocks: [{ kind: 'tower', count: 1, size: [1.7, 2], height: [7, 8.5], pathDistance: [2.8, 3.6] }] },
};

const base: Array<Omit<PlanetWorldParams, 'features'>> = [
  { id: 'w01', zone: 3, side: 'near', half: 0, terrain: { amplitude: 2.6, wavelength: 1.3, slope: 0.25 }, vegetation: veg(0.3) },
  { id: 'w02', zone: 2, side: 'near', terrain: { amplitude: 3.0, wavelength: 1.4, slope: 0.35 }, vegetation: veg(0.5) },
  { id: 'w03', zone: 3, side: 'near', half: 1, terrain: { amplitude: 1.8, wavelength: 1.8 }, vegetation: veg(0.2) },
  { id: 'w04', zone: 1, side: 'near', terrain: { amplitude: 4.4, wavelength: 1.6, slope: 0.6, ridge: 0.15 }, vegetation: veg(0.3) },
  { id: 'w05', zone: 1, side: 'far', half: 1, terrain: { amplitude: 2.8, wavelength: 1.5, slope: 0.3 }, vegetation: veg(0.1) },
  { id: 'w06', zone: 0, side: 'far', terrain: { amplitude: 3.8, wavelength: 1.2, ridge: 0.95 }, vegetation: veg(0.8) },
  { id: 'w07', zone: 2, side: 'far', terrain: { amplitude: 0.9, wavelength: 2.2 }, vegetation: veg(0.4) },
  { id: 'w08', zone: 3, side: 'far', terrain: { amplitude: 1.6, wavelength: 2.4, floor: 0.6 }, vegetation: veg(0.05), props: { barns: 0.004 } },
  { id: 'w09', zone: 0, side: 'near', terrain: { amplitude: 2.4, wavelength: 1.5, slope: 0.4 }, vegetation: veg(0.4), props: { trash: 0.05 } },
  { id: 'w10', zone: 1, side: 'far', half: 0, terrain: { amplitude: 0.7, wavelength: 2 }, vegetation: veg(0.3) },
];
const worlds: PlanetWorldParams[] = base.map((w) => (features[w.id] ? { ...w, features: features[w.id]! } : { ...w }));

const params: PlanetParams = {
  radius: 32,
  seed: 7,
  chunksPerFace: 3,
  zones: ['tjorizo', 'syrup', 'luzz', 'wooding'].map((id) => ({ id, hillAmplitude: 1.5, vegetation: veg(0.2) })),
  worlds,
  spiral: { turns: 2.75 },
  landmarks: [{ id: 'focal-05', world: 4, scale: 1, clearRadius: 0 }],
};

const unit = (p: readonly number[]): [number, number, number] => {
  const l = Math.hypot(p[0]!, p[1]!, p[2]!) || 1;
  return [p[0]! / l, p[1]! / l, p[2]! / l];
};

describe('PlanetFeatures', () => {
  const field = new PlanetField(params);
  const f = field.features;

  it('erzeugt Seen, Flüsse, Felsen und Anker deterministisch (gleicher Seed → gleiche Merkmale)', () => {
    const again = new PlanetField(params).features;
    expect(f.lakes.length).toBeGreaterThanOrEqual(3);
    expect(f.rivers.length).toBeGreaterThanOrEqual(1);
    expect(f.formations.length).toBeGreaterThanOrEqual(4);
    expect(f.ledgeAnchors.length).toBeGreaterThanOrEqual(3);
    expect(again.lakes.map((l) => [l.id, l.radius, l.level])).toEqual(f.lakes.map((l) => [l.id, l.radius, l.level]));
    expect(again.rivers.map((r) => r.points)).toEqual(f.rivers.map((r) => r.points));
    expect(again.formations.map((r) => r.columns.map((c) => [c.cx, c.cy, c.top]))).toEqual(f.formations.map((r) => r.columns.map((c) => [c.cx, c.cy, c.top])));
    // Anderer Seed → andere Merkmale
    const other = new PlanetField({ ...params, seed: 8 }).features;
    expect(other.lakes.map((l) => l.frame.c)).not.toEqual(f.lakes.map((l) => l.frame.c));
  });

  it('Merkmale liegen ganz in ihrer Welt (Mittelpunkt, Ufer, Grundriss)', () => {
    for (const l of f.lakes) expect(field.worldAt(...l.frame.c)).toBe(l.world);
    for (const r of f.rivers) for (const p of r.points) expect(field.worldAt(...p)).toBe(r.world);
    for (const form of f.formations) {
      for (const c of form.columns) {
        const d = unit([form.frame.c[0] * 32 + form.frame.east[0] * c.cx + form.frame.north[0] * c.cy, form.frame.c[1] * 32 + form.frame.east[1] * c.cx + form.frame.north[1] * c.cy, form.frame.c[2] * 32 + form.frame.east[2] * c.cx + form.frame.north[2] * c.cy]);
        expect(field.worldAt(...d)).toBe(form.world);
      }
    }
  });

  it('Seen sind flach: der Spiegel liegt über dem gegrabenen Becken, das Ufer über dem Spiegel', () => {
    const hit = { e: 0, theta: 0 };
    for (const lake of f.lakes) {
      const c = lake.frame.c;
      expect(field.heightAt(...c)).toBeLessThan(lake.level);
      expect(f.isWater(...c)).toBe(true);
      // Außerhalb der Böschung: Gelände nicht unter dem Spiegel (kein Überlaufen)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        for (let r = lake.radius * 0.4; r < lake.reach * 1.3; r += 0.4) {
          const px = lake.frame.c[0] * 32 + (lake.frame.east[0] * Math.cos(a) + lake.frame.north[0] * Math.sin(a)) * r;
          const py = lake.frame.c[1] * 32 + (lake.frame.east[1] * Math.cos(a) + lake.frame.north[1] * Math.sin(a)) * r;
          const pz = lake.frame.c[2] * 32 + (lake.frame.east[2] * Math.cos(a) + lake.frame.north[2] * Math.sin(a)) * r;
          const d = unit([px, py, pz]);
          if (!lakeAt(lake, 32, d[0], d[1], d[2], hit)) continue;
          // Unter dem Wasser-Mesh (bis zur Überlappung) liegt das Gelände unter dem Spiegel, dahinter der Uferwall darüber
          if (hit.e < 0) expect(field.heightAt(...d)).toBeLessThan(lake.level);
          if (hit.e > WATER_OVERLAP - 0.02 && hit.e < WATER_OVERLAP + 0.1) expect(field.heightAt(...d)).toBeGreaterThan(lake.level);
        }
      }
    }
  });

  it('Flüsse fließen bergab und münden auf Seehöhe', () => {
    for (const r of f.rivers) {
      for (let i = 1; i < r.levels.length; i++) expect(r.levels[i]!).toBeLessThanOrEqual(r.levels[i - 1]! + 1e-9);
      const lake = f.lakes[r.lake]!;
      expect(r.levels[r.levels.length - 1]).toBeCloseTo(lake.level, 6);
      expect(r.widths[r.widths.length - 1]!).toBeGreaterThan(r.widths[0]!);
    }
  });

  it('Wassermaske: Seen und Flüsse sind Wasser, Pfad und Knoten nie', () => {
    const path = spiralPath(field, { nodesPerZone: 25 });
    for (const n of path.nodes) expect(f.isWater(...unit(n.position), 0.8)).toBe(false);
    for (const d of path.dots) expect(field.isWater(...unit(d.position))).toBe(false);
    for (const r of f.rivers) expect(f.waterDepthAt(...r.points[Math.floor(r.points.length / 2)]!)).toBeGreaterThan(0);
    // Weit weg von allem: kein Wasser in Reichweite
    expect(f.waterDepthAt(0, 1, 0)).toBe(NO_WATER);
  });

  it('Felsen halten den Pfadkorridor frei (nahe Welten)', () => {
    const R = 32;
    for (const form of f.formations) {
      if (worlds[form.world]!.side !== 'near') continue;
      for (const c of form.columns) {
        for (const [x, y] of c.polygon) {
          const p = unit([form.frame.c[0] * R + form.frame.east[0] * x + form.frame.north[0] * y, form.frame.c[1] * R + form.frame.east[1] * x + form.frame.north[1] * y, form.frame.c[2] * R + form.frame.east[2] * x + form.frame.north[2] * y]);
          expect(pathDistance({ radius: 32, turns: field.turns, polarMargin: field.polarMargin }, ...p)).toBeGreaterThan(1.5);
        }
      }
    }
  });

  it('Felssäulen sind versenkt (Fuß unter dem Gelände) — nichts schwebt', () => {
    const xy: [number, number] = [0, 0];
    for (const form of f.formations) {
      for (const c of form.columns) {
        // Säulen, die auf einer anderen Säule stehen (Turmschaft, Krone), berühren den Boden nicht
        if (form.columns.some((o) => o !== c && pointInPolygon(o.polygon, c.cx, c.cy) && o.top >= c.base - 0.01)) continue;
        for (const [x, y] of [...c.polygon, [c.cx, c.cy] as [number, number]]) {
          const p = unit([form.frame.c[0] * 32 + form.frame.east[0] * x + form.frame.north[0] * y, form.frame.c[1] * 32 + form.frame.east[1] * x + form.frame.north[1] * y, form.frame.c[2] * 32 + form.frame.east[2] * x + form.frame.north[2] * y]);
          // Rahmenhöhe des Geländes an dieser Ecke
          localOf(form.frame, 32, p[0], p[1], p[2], xy);
          const cos = 32 / Math.sqrt(32 * 32 + xy[0] * xy[0] + xy[1] * xy[1]);
          const groundZ = (32 + field.heightAt(...p)) * cos - 32;
          expect(c.base).toBeLessThan(groundZ);
          expect(columnPeak(c)).toBeGreaterThan(groundZ);
        }
      }
    }
  });

  it('Anker liegen auf ihrer Deckfläche und zeigen nach oben', () => {
    const xy: [number, number] = [0, 0];
    for (const a of f.ledgeAnchors) {
      const form = f.formations.find((x) => x.id === a.formation)!;
      expect(form).toBeDefined();
      expect(a.world).toBe(form.world);
      expect(Math.hypot(...a.normal)).toBeCloseTo(1, 6);
      localOf(form.frame, 32, a.dir[0], a.dir[1], a.dir[2], xy);
      // Eine Säule der Formation trägt den Anker: die höchste Deckfläche an dieser Stelle liegt auf Ankerhöhe
      const tops = form.columns.filter((c) => pointInPolygon(c.polygon, xy[0], xy[1])).map((c) => columnTopAt(c, xy[0], xy[1]));
      expect(tops.length).toBeGreaterThan(0);
      expect(field.surfaceHeightAt(...a.dir)).toBeGreaterThan(field.heightAt(...a.dir) + 0.5);
      const z = a.position[0] * form.frame.c[0] + a.position[1] * form.frame.c[1] + a.position[2] * form.frame.c[2] - 32;
      expect(Math.abs(Math.max(...tops) - z)).toBeLessThan(0.05);
      expect(f.ledgeNear(a.dir, 0.01)?.id).toBe(a.id);
    }
    // Stufen aufsteigend je Formation
    const byForm = new Map<string, number[]>();
    for (const a of f.ledges()) byForm.set(a.formation, [...(byForm.get(a.formation) ?? []), a.step]);
    for (const steps of byForm.values()) expect([...steps].sort((x, y) => x - y)).toEqual(steps);
  });

  it('Streuung: keine Bäume im Wasser, auf Felsen oder im Schneefeld; kein Müll/Requisit im Wasser oder auf Felsen', () => {
    let trees = 0;
    let props = 0;
    for (const id of chunkList(3)) {
      for (const t of scatterChunkTrees(field, id, {})) {
        trees++;
        const d = unit(t.position);
        expect(f.isWater(...d)).toBe(false);
        expect(f.rockAt(...d)).toBeNull();
        const snow = f.snow[t.world];
        if (snow) expect(snow.value(d[0], d[1], d[2], field.heightNormAt(...d))).toBeLessThan(0);
      }
      for (const p of scatterChunkProps(field, id, {})) {
        props++;
        const d = unit(p.position);
        expect(f.isWater(...d)).toBe(false);
        expect(f.rockAt(...d)).toBeNull();
      }
    }
    expect(trees).toBeGreaterThan(200);
    expect(props).toBeGreaterThan(5);
  });

  it('Chunk-Merkmale je Vertex: Wasser im See, Schneefeld nur in Schneewelten', () => {
    let water = 0;
    let snow = 0;
    for (const id of chunkList(3)) {
      const m = generateChunkMesh(field, id, 16);
      for (let k = 0; k < m.vertexCount; k++) {
        if (m.feature[k * 4]! > 0) water++;
        if (m.feature[k * 4 + 1]! > 0) snow++;
        if (m.feature[k * 4 + 1]! > -1) expect(m.worldIndex >= 0).toBe(true);
      }
    }
    expect(water).toBeGreaterThan(0);
    expect(snow).toBeGreaterThan(0);
  });

  it('ohne Merkmale bleibt das Höhenfeld unverändert', () => {
    const plain = new PlanetField({ ...params, worlds: base.map((w) => ({ ...w })) });
    expect(plain.features.lakes.length + plain.features.rivers.length + plain.features.formations.length).toBe(0);
    for (let i = 0; i < 40; i++) {
      const d = unit([Math.sin(i * 1.7), Math.cos(i * 0.9), Math.sin(i * 0.4 + 1)]);
      expect(plain.surfaceHeightAt(...d)).toBeCloseTo(plain.heightAt(...d), 12);
    }
  });
});
