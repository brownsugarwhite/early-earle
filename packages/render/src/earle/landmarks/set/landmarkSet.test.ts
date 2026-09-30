import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANDMARK_KINDS, landmarkBlueprint, swampWater } from '@ee/world';
import type { WorldPalette } from '../../palette';
import { GeoBuffer } from './buffers';
import { LANDMARK_ROLES, landmarkPaletteFromWorld, type LandmarkRows } from './palette';
import { ROCK_LAYOUT, addArcade, addPrisms } from './prismGeometry';
import { rockFamilyOf } from './rockMaterial';
import { contourTriangles, swampPrisms } from './swamp';

const ROWS = Object.fromEntries(LANDMARK_ROLES.map((r, i) => [r, i])) as LandmarkRows;
const FRAME = { x: 3, y: 1, z: -2, yaw: 0.7 };

function triArea(t: Array<[number, number]>): number {
  let a = 0;
  for (let k = 0; k < t.length; k += 3) {
    const [p, q, r] = [t[k]!, t[k + 1]!, t[k + 2]!];
    a += Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) / 2;
  }
  return a;
}

describe('landmark geometry', () => {
  it('fills a contour smoothly (marching squares): a disc of radius 3 has area ≈ 9π', () => {
    const tris = contourTriangles(-5, -5, 5, 5, 0.25, (x, z) => 3 - Math.hypot(x, z), 0);
    expect(tris.length % 3).toBe(0);
    expect(triArea(tris)).toBeGreaterThan(Math.PI * 9 * 0.985);
    expect(triArea(tris)).toBeLessThan(Math.PI * 9 * 1.005);
    // a ring (between two contours) as the bog carpet uses it
    const ring = contourTriangles(-5, -5, 5, 5, 0.25, (x, z) => Math.min(4 - Math.hypot(x, z), Math.hypot(x, z) - 2), 0);
    expect(triArea(ring)).toBeGreaterThan(Math.PI * 12 * 0.98);
    expect(triArea(ring)).toBeLessThan(Math.PI * 12 * 1.01);
  });

  it('builds every landmark with outward walls and upward caps, split into the two shader families', () => {
    for (const kind of LANDMARK_KINDS) {
      const bp = landmarkBlueprint(kind, 11);
      const prisms = [...bp.prisms, ...(bp.swamp ? swampPrisms(bp.swamp) : [])];
      for (const family of ['rock', 'stone'] as const) {
        const buf = new GeoBuffer(ROCK_LAYOUT);
        addPrisms(buf, prisms.filter((p) => rockFamilyOf(p.surface) === family), FRAME, ROWS);
        if (family === 'stone') for (const a of bp.arcades) addArcade(buf, a, FRAME, ROWS);
        if (buf.empty) continue;
        const pos = buf.attrs.get('position')!.data;
        const nor = buf.attrs.get('normal')!.data;
        const lb = buf.attrs.get('lb')!.data;
        expect(buf.index.length % 3).toBe(0);
        // every triangle's winding agrees with its vertex normal (front faces outward)
        for (let t = 0; t < buf.index.length; t += 3) {
          const [a, b, c] = [buf.index[t]!, buf.index[t + 1]!, buf.index[t + 2]!];
          const ux = pos[b * 3]! - pos[a * 3]!;
          const uy = pos[b * 3 + 1]! - pos[a * 3 + 1]!;
          const uz = pos[b * 3 + 2]! - pos[a * 3 + 2]!;
          const vx = pos[c * 3]! - pos[a * 3]!;
          const vy = pos[c * 3 + 1]! - pos[a * 3 + 1]!;
          const vz = pos[c * 3 + 2]! - pos[a * 3 + 2]!;
          const cx = uy * vz - uz * vy;
          const cy = uz * vx - ux * vz;
          const cz = ux * vy - uy * vx;
          const area = Math.hypot(cx, cy, cz);
          if (area < 1e-9) continue;
          const dot = (cx * nor[a * 3]! + cy * nor[a * 3 + 1]! + cz * nor[a * 3 + 2]!) / area;
          expect(dot, `${kind} ${family} triangle ${t / 3}`).toBeGreaterThan(-1e-6);
        }
        // caps face up; the family's surfaces only
        for (let v = 0; v < buf.vertices; v++) {
          if (lb[v * 4 + 1]! !== 0) expect(nor[v * 3 + 1]!, `${kind} cap normal`).toBeGreaterThan(0);
          const s = lb[v * 4]!;
          expect(family === 'stone' ? s >= 3 && s <= 5 : s <= 2 || s >= 6).toBe(true);
        }
      }
    }
  });

  it('keeps swamp props on the water: stepping stones rise just above the level, pads float in the ponds', () => {
    const bp = landmarkBlueprint('swamp', 5);
    const s = bp.swamp!;
    for (const p of swampPrisms(s).filter((q) => q.role === 'stone')) {
      expect(p.y1).toBeGreaterThan(s.level);
      expect(p.y1 - s.level).toBeLessThan(0.2);
      expect(p.y0).toBeLessThan(s.level - 0.3);
    }
    for (const pad of s.pads) expect(swampWater(s, pad.x, pad.z)).toBeGreaterThan(0.2);
  });
});

describe('landmark palette', () => {
  const worldsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../../../content/zones/worlds');
  const worlds = readdirSync(worldsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(worldsDir, f), 'utf8')) as { palette: WorldPalette });

  it('derives all roles (8 hex stops each) for every Earle world', () => {
    expect(worlds.length).toBe(10);
    for (const w of worlds) {
      const p = landmarkPaletteFromWorld(w.palette);
      for (const role of LANDMARK_ROLES) {
        expect(p[role], role).toHaveLength(8);
        for (const c of p[role]) expect(c, role).toMatch(/^#[0-9a-f]{6}$/i);
      }
      // the light stops of the rock and stone ramps get lighter than their ink
      const luma = (h: string) => {
        const v = parseInt(h.slice(1), 16);
        return ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
      };
      expect(luma(p.stone[4]!)).toBeGreaterThan(luma(p.stone[0]!));
      expect(luma(p.water[3]!)).toBeGreaterThan(luma(p.water[0]!));
    }
  });
});
