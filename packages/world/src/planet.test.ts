import { describe, expect, it } from 'vitest';
import { PlanetField, chunkAngularRadius, chunkDirection, chunkList, generateChunkMesh, scatterChunkProps, scatterChunkTrees, spiralPath, type PlanetParams } from './planet';

const zones: PlanetParams['zones'] = [
  { id: 'tjorizo', hillAmplitude: 1.8, vegetation: { density: 0.2, clumpiness: 0.6, kinds: { dome: 0.7, cone: 0.3 }, scale: [0.7, 1.4], props: 'scrap', propDensity: 0.03, animalDensity: 0.012 } },
  { id: 'syrup', hillAmplitude: 1.2, vegetation: { density: 0.14, clumpiness: 0.4, kinds: { bulb: 0.7, dome: 0.3 }, scale: [0.8, 1.5], props: 'pool', propDensity: 0.02 } },
  { id: 'luzz', hillAmplitude: 2.4, vegetation: { density: 0.18, clumpiness: 0.3, kinds: { tall: 0.8, cone: 0.2 }, scale: [0.8, 1.3] } },
  { id: 'wooding', hillAmplitude: 1.6, vegetation: { density: 0.38, clumpiness: 0.75, kinds: { dome: 0.85, stacked: 0.15 }, scale: [0.7, 1.4] } },
];
const params: PlanetParams = { radius: 40, seed: 7, chunksPerFace: 3, zones };

describe('PlanetField', () => {
  const field = new PlanetField(params);
  it('Zonenkoordinate läuft von 0 (Nordpol) bis 4 (Südpol)', () => {
    expect(field.zoneIndex(0, 1, 0)).toBe(0);
    expect(field.zoneIndex(0, -1, 0)).toBe(3);
    expect(field.zoneIndex(1, 0.9, 0)).toBe(0);
    expect(field.zoneIndex(1, -0.9, 0)).toBe(3);
    for (let i = 0; i < 200; i++) {
      const a = (i / 200) * Math.PI * 2;
      const zc = field.zoneCoord(Math.cos(a) * 0.7, 0.71, Math.sin(a) * 0.7);
      expect(zc).toBeGreaterThanOrEqual(0);
      expect(zc).toBeLessThan(4);
    }
  });
  it('Grenzabstand ist 0 an der Grenze und wächst mit der Breite', () => {
    // Grenze Zone 0|1 liegt nominell bei 45° Breite (± Wobble)
    const nearBorder = field.borderAt(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4), 0);
    const midZone = field.borderAt(Math.cos((67.5 * Math.PI) / 180), Math.sin((67.5 * Math.PI) / 180), 0);
    expect(nearBorder.dist).toBeLessThan(6);
    expect(midZone.dist).toBeGreaterThan(nearBorder.dist);
    expect(field.borderAt(0, 1, 0).border).toBe(-1);
  });
  it('Höhe ist deterministisch, begrenzt und die Normale zeigt nach außen', () => {
    const f2 = new PlanetField(params);
    const pos: [number, number, number] = [0, 0, 0];
    const nor: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < 50; i++) {
      const d: [number, number, number] = [Math.sin(i), Math.cos(i * 1.3), Math.sin(i * 0.7)];
      const l = Math.hypot(...d);
      d[0] /= l;
      d[1] /= l;
      d[2] /= l;
      expect(field.heightAt(...d)).toBeCloseTo(f2.heightAt(...d), 10);
      expect(field.heightAt(...d)).toBeGreaterThanOrEqual(0);
      expect(field.heightAt(...d)).toBeLessThanOrEqual(field.hMax + 1e-6);
      field.surfaceAt(d[0], d[1], d[2], pos, nor);
      expect(nor[0] * d[0] + nor[1] * d[1] + nor[2] * d[2]).toBeGreaterThan(0.7);
    }
  });
});

describe('chunks', () => {
  const field = new PlanetField(params);
  it('54 Chunks, Richtungen sind Einheitsvektoren, Winkelradius plausibel', () => {
    const list = chunkList(3);
    expect(list.length).toBe(54);
    const d: [number, number, number] = [0, 0, 0];
    for (const id of list) {
      chunkDirection(id, 3, 0.3, -0.8, d);
      expect(Math.hypot(...d)).toBeCloseTo(1, 9);
    }
    const r = chunkAngularRadius(3);
    expect(r).toBeGreaterThan((15 * Math.PI) / 180);
    expect(r).toBeLessThan((30 * Math.PI) / 180);
  });
  it('Chunk-Mesh ist deterministisch und von außen gegen den Uhrzeigersinn gewickelt', () => {
    const a = generateChunkMesh(field, { face: 2, cx: 1, cy: 1 }, 16);
    const b = generateChunkMesh(field, { face: 2, cx: 1, cy: 1 }, 16);
    expect(a.positions).toEqual(b.positions);
    expect(a.zone).toEqual(b.zone);
    for (const id of chunkList(3)) {
      const m = generateChunkMesh(field, id, 6);
      let inward = 0;
      const p = m.positions;
      for (let i = 0; i < m.indices.length; i += 3) {
        const x = m.indices[i]! * 3;
        const y = m.indices[i + 1]! * 3;
        const z = m.indices[i + 2]! * 3;
        const abx = p[y]! - p[x]!, aby = p[y + 1]! - p[x + 1]!, abz = p[y + 2]! - p[x + 2]!;
        const acx = p[z]! - p[x]!, acy = p[z + 1]! - p[x + 1]!, acz = p[z + 2]! - p[x + 2]!;
        const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
        if (nx * p[x]! + ny * p[x + 1]! + nz * p[x + 2]! < -1e-9) inward++;
      }
      expect(inward).toBe(0);
    }
  });
  it('benachbarte Chunks teilen ihre Randvertices exakt (nahtlos), auch über Würfelkanten', () => {
    const res = 9;
    const a = generateChunkMesh(field, { face: 4, cx: 0, cy: 1 }, res); // +Z-Seite, linker Rand
    const b = generateChunkMesh(field, { face: 4, cx: 1, cy: 1 }, res);
    for (let j = 0; j < res; j++) {
      const ka = j * res + (res - 1);
      const kb = j * res;
      for (let c = 0; c < 3; c++) expect(a.positions[ka * 3 + c]).toBeCloseTo(b.positions[kb * 3 + c]!, 4);
    }
    // Würfelkante: +Z-Seite (cx=0 → fu=-1) trifft die -X-Seite (cx=2 → fu=+1) am Rand x=-1, z=+1
    const left = generateChunkMesh(field, { face: 4, cx: 0, cy: 1 }, res);
    const other = generateChunkMesh(field, { face: 1, cx: 2, cy: 1 }, res);
    for (let j = 0; j < res; j++) {
      const kl = j * res; // fu = -1 auf +Z
      const ko = j * res + (res - 1); // fu = +1 auf -X
      for (let c = 0; c < 3; c++) expect(left.positions[kl * 3 + c]).toBeCloseTo(other.positions[ko * 3 + c]!, 3);
    }
  });
  it('Streuung ist deterministisch, nutzt die Zonenfamilie und respektiert den Korridor', () => {
    const id = { face: 4, cx: 1, cy: 1 };
    const t1 = scatterChunkTrees(field, id, { densityScale: 1 });
    const t2 = scatterChunkTrees(field, id, { densityScale: 1 });
    expect(t1).toEqual(t2);
    expect(t1.length).toBeGreaterThan(10);
    for (let i = 0; i < t1.length; i++) expect(t1[i]!.rank).toBeCloseTo(i / t1.length, 9);
    const cleared = scatterChunkTrees(field, id, { densityScale: 1, clear: (p) => p[0] > 0 });
    expect(cleared.every((t) => t.position[0] <= 0)).toBe(true);
    expect(cleared.length).toBeLessThan(t1.length);
    // Chunk am Nordpol liegt in Zone 0 (tjorizo): Schrott + Tiere, keine Becken
    const polar = scatterChunkProps(field, { face: 2, cx: 1, cy: 1 }, {});
    expect(polar.some((p) => p.kind === 'scrap')).toBe(true);
    expect(polar.some((p) => p.kind === 'pool')).toBe(false);
    // Syrup-Chunk (Breite ≈ 22°): Becken
    const syrup = scatterChunkProps(field, { face: 4, cx: 1, cy: 2 }, {});
    expect(syrup.some((p) => p.kind === 'pool')).toBe(true);
  });
});

describe('spiralPath', () => {
  const field = new PlanetField(params);
  it('100 Knoten, 25 je Zone, Breite fällt monoton, alle im richtigen Zonenband', () => {
    const path = spiralPath(field, { nodesPerZone: 25, turns: 2.75 });
    expect(path.nodes.length).toBe(100);
    for (let z = 0; z < 4; z++) expect(path.nodes.filter((n) => n.zone === z).length).toBe(25);
    for (let i = 1; i < path.nodes.length; i++) expect(path.nodes[i]!.lat).toBeLessThan(path.nodes[i - 1]!.lat);
    for (const n of path.nodes) {
      const d = n.position;
      const l = Math.hypot(...d);
      expect(field.zoneIndex(d[0] / l, d[1] / l, d[2] / l)).toBe(n.zone);
      expect(l).toBeGreaterThanOrEqual(40 - 1e-4);
    }
    expect(path.dots.length).toBeGreaterThan(400);
    expect(path.length).toBeGreaterThan(300);
  });
  it('ist deterministisch', () => {
    const a = spiralPath(field, { nodesPerZone: 25 });
    const b = spiralPath(field, { nodesPerZone: 25 });
    expect(a.nodes).toEqual(b.nodes);
  });
});
