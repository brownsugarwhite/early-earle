import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANDMARK_KINDS, landmarkBlueprint, swampWater } from '@ee/world';
import type { WorldPalette } from '../../palette';
import { GeoBuffer } from './buffers';
import { LANDMARK_ROLES, landmarkPaletteFromWorld, type LandmarkRows } from './palette';
import { FACE_WALL, ROCK_LAYOUT, addPrisms, addWalls } from './prismGeometry';
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
        if (family === 'stone') addWalls(buf, bp.walls, FRAME, ROWS, bp.height);
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

  it('gives every stone facet its own gradient (foot 0 → head 1) and one key and step, walls and lancets included', () => {
    for (const seed of [1, 7, 42]) {
      const bp = landmarkBlueprint('ruin', seed);
      const buf = new GeoBuffer(ROCK_LAYOUT);
      addPrisms(buf, bp.prisms.filter((p) => rockFamilyOf(p.surface) === 'stone'), FRAME, ROWS, bp.height);
      addWalls(buf, bp.walls, FRAME, ROWS, bp.height);
      const lb = buf.attrs.get('lb')!.data;
      const lc = buf.attrs.get('lc')!.data;
      const ld = buf.attrs.get('ld')!.data;
      let lancets = 0;
      for (let t = 0; t < buf.index.length; t += 3) {
        const v = [buf.index[t]!, buf.index[t + 1]!, buf.index[t + 2]!];
        // one facet = one step (centre) and one key on all of its corners (no soft transition across its edge)
        for (const k of [2, 3]) expect(new Set(v.map((i) => lc[i * 4 + k]!.toFixed(6))).size, `seed ${seed} tri ${t / 3} lc.${'xyzw'[k]}`).toBe(1);
        for (const i of v) {
          expect(lc[i * 4 + 1]!).toBeGreaterThanOrEqual(0);
          expect(lc[i * 4 + 1]!).toBeLessThanOrEqual(1);
          expect(lc[i * 4 + 2]!).toBeGreaterThanOrEqual(0);
          expect(lc[i * 4 + 2]!).toBeLessThanOrEqual(1);
        }
        if (lb[v[0]! * 4 + 1] === FACE_WALL && ld[v[0]! * 4 + 1]! > 0) lancets++;
      }
      // the walls' gradient runs from the foot (0) to the head (1) of each face
      const gf = Array.from({ length: buf.vertices }, (_, i) => lc[i * 4 + 1]!);
      expect(Math.min(...gf)).toBe(0);
      expect(Math.max(...gf)).toBe(1);
      // painted windows: portal, slits, eight belfry lancets (two triangles per face)
      expect(lancets).toBeGreaterThanOrEqual(2 * (8 + 4 + 1));
    }
  });

  it('extrudes the tracery walls closed: front, back and every side face point away from the stone', () => {
    const bp = landmarkBlueprint('ruin', 5);
    for (const w of bp.walls) {
      const buf = new GeoBuffer(ROCK_LAYOUT);
      addWalls(buf, [w], { x: 0, y: 0, z: 0, yaw: 0 }, ROWS, bp.height);
      const pos = buf.attrs.get('position')!.data;
      const nor = buf.attrs.get('normal')!.data;
      // centre of the slab's foot line at mid-height: every face normal points away from the slab's mid-plane or along it
      const mx = (w.from[0] + w.to[0]) / 2;
      const mz = (w.from[1] + w.to[1]) / 2;
      let front = 0;
      let back = 0;
      for (let v = 0; v < buf.vertices; v++) {
        const along = nor[v * 3]! * w.normal[0] + nor[v * 3 + 2]! * w.normal[1];
        if (along > 0.9) front++;
        if (along < -0.9) back++;
      }
      expect(front).toBeGreaterThan(2);
      expect(back).toBe(front);
      // the slab's volume (divergence theorem over the closed surface) is positive and about depth × area
      let vol = 0;
      for (let t = 0; t < buf.index.length; t += 3) {
        const [a, b, c] = [buf.index[t]!, buf.index[t + 1]!, buf.index[t + 2]!].map((i) => [pos[i * 3]! - mx, pos[i * 3 + 1]!, pos[i * 3 + 2]! - mz]);
        vol += (a![0]! * (b![1]! * c![2]! - b![2]! * c![1]!) - a![1]! * (b![0]! * c![2]! - b![2]! * c![0]!) + a![2]! * (b![0]! * c![1]! - b![1]! * c![0]!)) / 6;
      }
      let area = 0;
      for (let i = 0; i < w.outline.length; i++) {
        const p = w.outline[i]!;
        const q = w.outline[(i + 1) % w.outline.length]!;
        area += (p[0] * q[1] - q[0] * p[1]) / 2;
      }
      for (const hole of w.holes) {
        let ha = 0;
        for (let i = 0; i < hole.length; i++) {
          const p = hole[i]!;
          const q = hole[(i + 1) % hole.length]!;
          ha += (p[0] * q[1] - q[0] * p[1]) / 2;
        }
        area -= Math.abs(ha);
      }
      expect(vol, w.role).toBeGreaterThan(0);
      expect(vol / (Math.abs(area) * w.depth), w.role).toBeCloseTo(1, 1);
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
    // die zehn Welten der Route und die späteren Autorenwelten (11, 12, …)
    expect(worlds.length).toBeGreaterThanOrEqual(10);
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
