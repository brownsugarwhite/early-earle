import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseGenomeRules } from '../rules';
import { resolveCreature } from '../creature';
import { SPECIES, type Species } from '../types';
import { buildCustomCreature, customFromSpec, parseCustomCreature, sphereRolesOf, validateCustomCreature, type CustomCreatureInput } from './index';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../content/genome');
const rules = parseGenomeRules(JSON.parse(readFileSync(join(root, 'rules.json'), 'utf8')));
const customDir = join(root, 'custom');

const close = (a: readonly number[], b: readonly number[], eps = 2e-4): boolean => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]!) <= eps);

describe('custom creatures (Blender round trip)', () => {
  for (const species of SPECIES) {
    it(`${species}: game creature → custom JSON → the same body, skeleton and parts`, () => {
      const spec = resolveCreature({ zone: 'tjorizo', tier: 8, seed: 7, species }, rules);
      const json = customFromSpec(spec, { id: `test-${species}`, name: species });
      const def = parseCustomCreature(JSON.parse(JSON.stringify(json)));
      const { spec: back, warnings } = buildCustomCreature(def, rules);
      expect(warnings).toEqual([]);
      expect(back.species).toBe(spec.species);
      expect(back.bodyType).toBe(spec.bodyType);
      expect(back.body.spheres.length).toBe(spec.body.spheres.length);
      back.body.spheres.forEach((s, i) => {
        expect(close(s.center, spec.body.spheres[i]!.center)).toBe(true);
        expect(Math.abs(s.r - spec.body.spheres[i]!.r)).toBeLessThan(2e-4);
      });
      const a = spec.skeleton;
      const b = back.skeleton;
      expect(Math.abs(a.restLift - b.restLift)).toBeLessThan(2e-4);
      expect(b.legs.map((l) => [l.role, l.footSphere, l.kneeSphere, l.bend])).toEqual(a.legs.map((l) => [l.role, l.footSphere, l.kneeSphere, l.bend]));
      b.legs.forEach((l, i) => expect(close(l.hip, a.legs[i]!.hip)).toBe(true));
      expect(b.headSphere).toBe(a.headSphere);
      expect(b.trunk?.spheres ?? null).toEqual(a.trunk?.spheres ?? null);
      expect(b.mouth.jaw).toEqual(a.mouth.jaw);
      if (a.neckChain && spec.bodyType !== 'blob') {
        expect(b.neckChain).not.toBeNull();
        expect([...b.neckChain!.spheres].sort()).toEqual([...a.neckChain.spheres].sort());
        expect(new Set(b.neckChain!.head)).toEqual(new Set([...a.neckChain.head, ...(a.trunk?.spheres ?? [])].filter((i) => !a.neckChain!.spheres.includes(i))));
      }
      if (a.spine) {
        const order = (sp: number[]): number[] => sp.map((v, i) => ({ v, i })).filter((e) => e.v >= 0).sort((x, y) => x.v - y.v).map((e) => e.i);
        expect(order(b.spine!)).toEqual(order(a.spine));
      }
      const drawn = (s: typeof spec): string[] => s.parts.filter((p) => !p.sdf).map((p) => `${p.slot}:${p.asset}:${p.mirror}`).sort();
      expect(drawn(back)).toEqual(drawn(spec));
      for (const p of back.parts.filter((q) => !q.sdf)) {
        const o = spec.parts.find((q) => q.slot === p.slot && q.asset === p.asset && q.mirror === p.mirror && Math.abs(q.theta - p.theta) < 1e-3)!;
        expect(o).toBeDefined();
        expect(Math.abs(o.phi - p.phi)).toBeLessThan(1e-3);
        expect(Math.abs(o.scale - p.scale)).toBeLessThan(1e-3);
        if (spec.bodyType !== 'blob') expect(p.anchor).toBe(o.anchor);
      }
      expect(back.parts.filter((p) => p.sdf).length).toBe(spec.parts.filter((p) => p.sdf).length);
      expect(back.paintedEye).toBe(spec.paintedEye);
    });
  }

  it('names spheres in German with mirror suffixes', () => {
    const giraffe = resolveCreature({ zone: 'tjorizo', tier: 8, seed: 7, species: 'giraffe' as Species }, rules);
    const names = sphereRolesOf({ spheres: giraffe.body.spheres, skeleton: giraffe.skeleton, bodyType: giraffe.bodyType }).map((s) => s.name);
    expect(names).toContain('Körper');
    expect(names).toContain('Kopf');
    expect(names).toContain('Hals.01');
    expect(names).toContain('Fuß.vorn.L');
    expect(names).toContain('Fuß.hinten.R');
    expect(new Set(names).size).toBe(names.length);
  });

  it('rejects broken definitions with readable issues', () => {
    const bad: CustomCreatureInput = {
      schemaVersion: 1,
      id: 'kaputt',
      name: 'Kaputt',
      base: 'retriever',
      spheres: [
        { name: 'Körper', role: 'core', center: [0, 0, 0], r: 1 },
        { name: 'Fuß', role: 'foot', center: [0.3, -0.7, 0.3], r: 0.2, leg: 'FL' },
      ],
      parts: [{ slot: 'eye', asset: 'eye_round', anchor: 'Nase', theta: 0.3, phi: 0.3 }],
    };
    const v = validateCustomCreature(bad);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      const text = v.issues.map((i) => i.message).join('\n');
      expect(text).toContain('legs[]');
      expect(text).toContain('"Nase"');
    }
  });

  const files = (() => {
    try {
      return readdirSync(customDir).filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }
  })();
  for (const f of files) {
    it(`content/genome/custom/${f}: valid and buildable`, () => {
      const raw = JSON.parse(readFileSync(join(customDir, f), 'utf8'));
      const v = validateCustomCreature(raw);
      if (!v.ok) throw new Error(v.issues.map((i) => `${i.path}: ${i.message}`).join('\n'));
      expect(v.def.id).toBe(f.replace(/\.json$/, ''));
      const { spec, warnings } = buildCustomCreature(v.def, rules);
      expect(warnings).toEqual([]);
      expect(spec.body.spheres.length).toBe(v.def.spheres.length);
      for (const l of spec.skeleton.legs) expect(l.footSphere).toBeGreaterThanOrEqual(0);
    });
  }
});
