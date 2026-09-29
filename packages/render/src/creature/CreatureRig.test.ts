import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SDF_LEG_ASSET, SPECIES, parseGenomeRules, resolveCreature, type Species } from '@ee/genome';
import { createBlobShadingUniforms } from '../blob/blobShading';
import { CreatureMotion, legDefsFor } from './CreatureMotion';
import { CreaturePool } from './CreaturePool';
import { ModuleLibrary } from './ModuleLibrary';

const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../content/genome/rules.json');
const rules = parseGenomeRules(JSON.parse(readFileSync(rulesPath, 'utf8')));

/** A library with the procedural modules only (the GLB parts are simply missing — skipped by the rig). */
function pool(): CreaturePool {
  return new CreaturePool(new ModuleLibrary({}), createBlobShadingUniforms(), { capacity: 64, mouths: 16 });
}

describe('CreatureRig + CreatureMotion (v3 species through the normal rig path)', () => {
  it('kneaded legs are virtual rig parts: legDefsFor steps them, the rig never draws or crashes on them', () => {
    const p = pool();
    for (const species of SPECIES.filter((s): s is Exclude<Species, 'blob' | 'snake'> => s !== 'blob' && s !== 'snake')) {
      const spec = resolveCreature({ zone: 'tjorizo', tier: 7, seed: 5, species }, rules);
      const rig = p.createRig(spec);
      const legs = rig.parts.filter((q) => q.spec.slot === 'leg');
      expect(legs.length, species).toBe(spec.skeleton.legs.length);
      expect(legs.every((q) => q.spec.asset === SDF_LEG_ASSET && q.instances.length === 0), species).toBe(true);
      expect(legDefsFor(spec, rig).map((l) => l.role).sort(), species).toEqual(legs.map((q) => q.spec.role!).sort());
      const motion = new CreatureMotion(spec, rig, { seed: 1, scale: spec.worldScale });
      motion.controller.walkTo(1.5, 0.5);
      let t = 0;
      for (let i = 0; i < 90; i++) {
        const pose = motion.step(1 / 60);
        t += 1 / 60;
        const params = motion.posedParams(pose);
        rig.setBody({ params, center: motion.center(pose), scale: spec.worldScale, squash: pose.squash, time: t, rotation: pose.rotation, pose });
        expect(() => rig.update(1 / 60), species).not.toThrow();
        // The foot spheres follow the gait's feet (kneaded legs step with the body).
        for (let li = 0; li < spec.skeleton.legs.length; li++) {
          const leg = spec.skeleton.legs[li]!;
          const foot = pose.feet[li]!;
          const c = params.spheres[leg.footSphere]!.center;
          const o = motion.center(pose);
          expect(Math.abs(o[0] + c[0] * spec.worldScale - foot.pos[0]), species).toBeLessThan(1e-6);
          expect(Math.abs(o[2] + c[2] * spec.worldScale - foot.pos[2]), species).toBeLessThan(1e-6);
        }
      }
      p.commit();
      rig.dispose();
    }
    p.dispose();
  });

  it('mouths open through the rig (a traced crescent in the batch) and merge moves play to their end', () => {
    const p = pool();
    for (const species of ['blob', 'rex', 'snake'] as const) {
      const spec = resolveCreature({ zone: 'tjorizo', tier: 6, seed: 3, species }, rules);
      const rig = p.createRig(spec);
      const motion = new CreatureMotion(spec, rig, { seed: 2, scale: spec.worldScale, coilAtRest: false });
      const events: string[] = [];
      const move = species === 'snake' ? motion.coilSwallow({ x: 1, z: 0.4, radius: 0.3 }, { onEvent: (e) => events.push(e.type) }) : motion.devour({ x: 1, z: 0.4, radius: 0.3 }, { onEvent: (e) => events.push(e.type) });
      let opened = false;
      let t = 0;
      for (let i = 0; i < Math.ceil((move.duration + 0.3) * 60); i++) {
        const pose = motion.step(1 / 60);
        t += 1 / 60;
        const params = motion.posedParams(pose);
        rig.setBody({ params, center: motion.center(pose), scale: spec.worldScale, squash: pose.squash, time: t, rotation: pose.rotation, pose });
        rig.update(1 / 60);
        if ((pose.mouth ?? 0) > 0.5) opened = true;
      }
      expect(opened, species).toBe(true);
      expect(events, species).toContain('bite');
      expect(events[events.length - 1], species).toBe('done');
      expect(motion.controller.currentMode, species).toBe('idle');
      // A frozen mouth writes the batch (visible, non-degenerate triangles).
      rig.mouthOverride = { open: 1, round: 0.2 };
      rig.update(1 / 60);
      const pos = p.mouths.mesh.geometry.getAttribute('position').array as Float32Array;
      let spread = 0;
      for (let k = 3; k < pos.length; k += 3) spread = Math.max(spread, Math.abs(pos[k]! - pos[0]!) + Math.abs(pos[k + 2]! - pos[2]!));
      expect(spread, species).toBeGreaterThan(0.01);
      rig.dispose();
    }
    p.dispose();
  });
});
