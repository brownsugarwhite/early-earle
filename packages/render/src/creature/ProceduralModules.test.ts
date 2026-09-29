import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { parseGenomeRules } from '@ee/genome';
import { ModuleLibrary } from './ModuleLibrary';
import { PROCEDURAL_MODULE_IDS, proceduralModules } from './ProceduralModules';

const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../content/genome/rules.json');
const rules = parseGenomeRules(JSON.parse(readFileSync(rulesPath, 'utf8')));

describe('procedural species modules', () => {
  it('cover every procedural asset of the rules (same slot) and the virtual kneaded leg', () => {
    const defs = new Map(proceduralModules().map((d) => [d.id, d]));
    expect([...defs.keys()].sort()).toEqual([...PROCEDURAL_MODULE_IDS].sort());
    for (const [id, a] of Object.entries(rules.assets)) {
      if (!a.procedural) continue;
      const d = defs.get(id);
      expect(d, id).toBeDefined();
      expect(d!.slot, id).toBe(a.slot);
      expect(!!d!.extras['chain'], id).toBe(a.chain);
    }
    expect(defs.get('leg_sdf')!.segments).toHaveLength(0);
  });

  it('follow the module conventions: root at the origin growing along +Y, valid chains, ≤ 800 triangles, known materials', () => {
    for (const d of proceduralModules()) {
      if (d.id === 'leg_sdf') continue;
      expect(d.faces, d.id).toBeLessThanOrEqual(800);
      expect(d.faces, d.id).toBeGreaterThan(8);
      d.segments.forEach((s, i) => {
        expect(s.parent, `${d.id} seg ${i}`).toBe(i === 0 ? -1 : d.extras['chain'] ? i - 1 : s.parent);
        for (const p of s.prims) {
          expect(['Tint', 'Ink', 'Bone', 'Accent'], d.id).toContain(p.materialName);
          expect(p.geometry.getAttribute('normal'), d.id).toBeDefined();
        }
      });
      // The root segment grows away from the body (+Y) and stays near the socket (no floating parts).
      const box = new Box3().setFromBufferAttribute(d.segments[0]!.prims[0]!.geometry.getAttribute('position') as never);
      const c = box.getCenter(new Vector3());
      expect(c.y, d.id).toBeGreaterThan(-0.05);
      expect(box.min.y, d.id).toBeLessThan(0.12);
    }
  });

  it('the duck bill has a lower half that swings with the mouth; the frill fans at least three spikes', () => {
    const defs = new Map(proceduralModules().map((d) => [d.id, d]));
    const bill = defs.get('beak_duck')!;
    expect(bill.segments.map((s) => s.jaw)).toEqual([false, true]);
    const frill = defs.get('crest_frill')!.segments[0]!.prims[0]!.geometry;
    const box = new Box3().setFromBufferAttribute(frill.getAttribute('position') as never);
    // Spikes fan from outward (+Y) toward backward (+X).
    expect(box.max.y).toBeGreaterThan(0.5);
    expect(box.max.x).toBeGreaterThan(0.4);
  });

  it('every ModuleLibrary registers them (the board gets them too); opt-out for tests', async () => {
    const lib = new ModuleLibrary({});
    for (const id of PROCEDURAL_MODULE_IDS) expect(lib.get(id), id).toBeDefined();
    expect(await lib.load('ear_flap')).toBe(lib.get('ear_flap'));
    expect(new ModuleLibrary({}, undefined, { procedural: false }).get('ear_flap')).toBeUndefined();
  });
});
