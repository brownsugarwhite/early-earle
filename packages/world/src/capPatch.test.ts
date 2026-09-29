import { describe, expect, it } from 'vitest';
import { createCapField, generateCapPatch, generateDisplacedSphere } from './capPatch';

const params = { radius: 40, arcDeg: 40, res: 32, seed: 1234 };

describe('generateCapPatch', () => {
  it('ist deterministisch: gleicher Seed → identische Arrays', () => {
    const a = generateCapPatch(params);
    const b = generateCapPatch({ ...params });
    expect(a.positions).toEqual(b.positions);
    expect(a.normals).toEqual(b.normals);
    expect(a.indices).toEqual(b.indices);
    expect(a.height).toEqual(b.height);
    expect(a.biome).toEqual(b.biome);
  });

  it('anderer Seed → andere Höhen', () => {
    const a = generateCapPatch(params);
    const b = generateCapPatch({ ...params, seed: 99 });
    let diff = 0;
    for (let i = 0; i < a.height.length; i++) if (a.height[i] !== b.height[i]) diff++;
    expect(diff).toBeGreaterThan(a.height.length / 2);
  });

  it('liefert res² Vertices, (res-1)²·6 Indizes und Werte im gültigen Bereich', () => {
    const p = generateCapPatch(params);
    expect(p.vertexCount).toBe(32 * 32);
    expect(p.positions.length).toBe(32 * 32 * 3);
    expect(p.indices.length).toBe(31 * 31 * 6);
    for (let i = 0; i < p.indices.length; i++) expect(p.indices[i]).toBeLessThan(p.vertexCount);
    for (let i = 0; i < p.vertexCount; i++) {
      const r = Math.hypot(p.positions[i * 3]!, p.positions[i * 3 + 1]!, p.positions[i * 3 + 2]!);
      expect(r).toBeGreaterThanOrEqual(40 - 1e-4);
      expect(r).toBeLessThanOrEqual(40 + p.hMax + 1e-4);
      expect(p.height[i]).toBeGreaterThanOrEqual(0);
      expect(p.height[i]).toBeLessThanOrEqual(1);
      expect(p.biome[i]).toBeGreaterThanOrEqual(0);
      expect(p.biome[i]).toBeLessThanOrEqual(1);
      const nl = Math.hypot(p.normals[i * 3]!, p.normals[i * 3 + 1]!, p.normals[i * 3 + 2]!);
      expect(nl).toBeCloseTo(1, 4);
    }
  });

  it('Normalen zeigen nach außen und sind glatt (keine Grate)', () => {
    const p = generateCapPatch({ ...params, res: 96 });
    const res = p.params.res;
    const inner = Math.floor(res * 0.3);
    let maxAngleAll = 0;
    let maxAngleInner = 0;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const k = j * res + i;
        const dot =
          p.normals[k * 3]! * p.positions[k * 3]! +
          p.normals[k * 3 + 1]! * p.positions[k * 3 + 1]! +
          p.normals[k * 3 + 2]! * p.positions[k * 3 + 2]!;
        expect(dot).toBeGreaterThan(0);
        if (i + 1 < res) {
          const m = k + 1;
          const d =
            p.normals[k * 3]! * p.normals[m * 3]! +
            p.normals[k * 3 + 1]! * p.normals[m * 3 + 1]! +
            p.normals[k * 3 + 2]! * p.normals[m * 3 + 2]!;
          const a = Math.acos(Math.min(1, d));
          maxAngleAll = Math.max(maxAngleAll, a);
          if (i >= inner && i < res - inner && j >= inner && j < res - inner) maxAngleInner = Math.max(maxAngleInner, a);
        }
      }
    }
    // benachbarte Normalen (Vertexabstand ≈ 0.3) drehen sich im Inneren höchstens ~12°, im Randauslauf ~20°
    expect(maxAngleInner).toBeLessThan((12 * Math.PI) / 180);
    expect(maxAngleAll).toBeLessThan((20 * Math.PI) / 180);
  });

  it('Rand läuft auf die Kugel aus (Höhe 0 an den Kanten)', () => {
    const p = generateCapPatch(params);
    const res = p.params.res;
    for (let i = 0; i < res; i++) {
      expect(p.height[i]).toBeCloseTo(0, 5);
      expect(p.height[(res - 1) * res + i]).toBeCloseTo(0, 5);
    }
  });

  it('createCapField.surface stimmt mit den Patch-Vertices überein', () => {
    const p = generateCapPatch(params);
    const f = createCapField(params);
    const pos: [number, number, number] = [0, 0, 0];
    const nor: [number, number, number] = [0, 0, 0];
    const res = p.params.res;
    const k = 5 * res + 7;
    f.surface(p.uvs[k * 2]!, p.uvs[k * 2 + 1]!, pos, nor);
    expect(pos[0]).toBeCloseTo(p.positions[k * 3]!, 4);
    expect(pos[1]).toBeCloseTo(p.positions[k * 3 + 1]!, 4);
    expect(pos[2]).toBeCloseTo(p.positions[k * 3 + 2]!, 4);
  });
});

describe('generateDisplacedSphere', () => {
  it('ist deterministisch und liegt im Höhenband der Kappe', () => {
    const a = generateDisplacedSphere({ ...params, widthSegments: 32, heightSegments: 16, radiusOffset: -0.03 });
    const b = generateDisplacedSphere({ ...params, widthSegments: 32, heightSegments: 16, radiusOffset: -0.03 });
    expect(a.positions).toEqual(b.positions);
    expect(a.normals).toEqual(b.normals);
    expect(a.vertexCount).toBe(33 * 17);
    for (let i = 0; i < a.vertexCount; i++) {
      const r = Math.hypot(a.positions[i * 3]!, a.positions[i * 3 + 1]!, a.positions[i * 3 + 2]!);
      expect(r).toBeGreaterThanOrEqual(40 - 0.03 - 1e-4);
      expect(r).toBeLessThanOrEqual(40 - 0.03 + 1.8 + 1e-4);
      const dot =
        a.normals[i * 3]! * a.positions[i * 3]! + a.normals[i * 3 + 1]! * a.positions[i * 3 + 1]! + a.normals[i * 3 + 2]! * a.positions[i * 3 + 2]!;
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('Dreiecke sind von außen gegen den Uhrzeigersinn gewickelt (Front = außen)', () => {
    for (const geo of [
      generateDisplacedSphere({ ...params, widthSegments: 24, heightSegments: 12 }),
      generateCapPatch({ ...params, res: 16 }),
    ]) {
      let outward = 0;
      let inward = 0;
      const p = geo.positions;
      for (let i = 0; i < geo.indices.length; i += 3) {
        const a = geo.indices[i]! * 3;
        const b = geo.indices[i + 1]! * 3;
        const c = geo.indices[i + 2]! * 3;
        const abx = p[b]! - p[a]!, aby = p[b + 1]! - p[a + 1]!, abz = p[b + 2]! - p[a + 2]!;
        const acx = p[c]! - p[a]!, acy = p[c + 1]! - p[a + 1]!, acz = p[c + 2]! - p[a + 2]!;
        const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
        const d = nx * p[a]! + ny * p[a + 1]! + nz * p[a + 2]!;
        if (d > 1e-9) outward++;
        else if (d < -1e-9) inward++;
      }
      expect(inward).toBe(0);
      expect(outward).toBeGreaterThan(0);
    }
  });

  it('stimmt am Scheitel mit dem Höhenfeld des Patches überein (nahtlos)', () => {
    const f = createCapField(params);
    const s = generateDisplacedSphere({ ...params, widthSegments: 64, heightSegments: 32 });
    // Vertex j=0 ist der Nordpol (0, R+h, 0)
    const y = s.positions[1]!;
    expect(y).toBeCloseTo(40 + f.heightAt(0, 1, 0), 3);
  });
});
