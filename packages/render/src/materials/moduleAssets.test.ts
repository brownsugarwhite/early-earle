import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { moduleFromScene } from '../creature/ModuleLibrary';

/**
 * Contract test for the exported module library (content/genome/assets, built by
 * tools/blender/make_starter_parts.py): every GLB parses into a ModuleDef, stays within the triangle
 * budget and follows the v2 conventions the creature rig relies on (gaze-following `*_pupil`
 * segments, `*_lid` + SOCKET_lid on eyes, SOCKET_knee/SOCKET_foot on legs, chain segments).
 */
const assetsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../content/genome/assets');
const manifest = JSON.parse(readFileSync(join(assetsDir, '_manifest.json'), 'utf8')) as {
  exported: Array<{ asset: string; sockets: string[]; extras: Record<string, unknown> }>;
  skipped: unknown[];
};

async function load(id: string): Promise<Object3D> {
  const buf = readFileSync(join(assetsDir, `${id}.glb`));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new GLTFLoader().parseAsync(ab, '');
  return gltf.scene;
}

function names(root: Object3D): string[] {
  const out: string[] = [];
  root.traverse((o) => out.push(typeof o.userData['name'] === 'string' ? (o.userData['name'] as string) : o.name));
  return out;
}

const socketBase = (s: string): string => s.replace(/\.\d+$/, '');

describe('module library (content/genome/assets)', () => {
  it('manifest lists every GLB and nothing was skipped', () => {
    const glbs = readdirSync(assetsDir).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')).sort();
    expect(manifest.skipped).toEqual([]);
    expect(manifest.exported.map((e) => e.asset).sort()).toEqual(glbs);
    expect(glbs.length).toBeGreaterThanOrEqual(32);
  });

  for (const entry of manifest.exported) {
    it(`${entry.asset}: parses, ≤ 800 triangles, conventions`, async () => {
      const scene = await load(entry.asset);
      const def = moduleFromScene(entry.asset, scene);
      expect(def.faces).toBeLessThanOrEqual(800);
      expect(def.slot).toBe(entry.extras['slot']);
      const sockets = entry.sockets.map(socketBase);
      expect(sockets).toContain('SOCKET_root');
      const all = names(scene);
      if (def.slot === 'eye' && sockets.includes('SOCKET_lid')) {
        expect(def.segments.some((s) => s.pupil)).toBe(true);
        expect(def.segments.some((s) => /_lid$/.test(s.name))).toBe(true);
        expect(all.some((n) => socketBase(n) === 'SOCKET_lid')).toBe(true);
        // Iris ring, pupil and glint travel together in one gaze-following segment.
        const pupil = def.segments.find((s) => s.pupil)!;
        expect(pupil.prims.map((p) => p.materialName)).toContain('Ink');
      }
      if (def.slot === 'leg') {
        expect(sockets).toEqual(expect.arrayContaining(['SOCKET_knee', 'SOCKET_foot', 'SOCKET_tip']));
        expect(def.segments.map((s) => s.name)).toEqual([entry.asset, `${entry.asset}_shin`, `${entry.asset}_foot`]);
        expect(def.segments[1]!.parent).toBe(0);
        expect(def.segments[2]!.parent).toBe(1);
      }
      if (entry.extras['chain'] === true) {
        expect(def.segments.length).toBeGreaterThan(1);
        def.segments.forEach((s, i) => expect(s.parent).toBe(i - 1));
      }
      const mats = new Set(def.segments.flatMap((s) => s.prims.map((p) => p.materialName)));
      for (const m of mats) expect(['Tint', 'Ink', 'Bone', 'Iris', 'Accent']).toContain(m);
    });
  }
});
