import { describe, expect, it } from 'vitest';
import { InstancedBufferGeometry, Vector3 } from 'three/webgpu';
import { GRAND_FORMS, createGrandTree, createGrandTrees, grandSpec, layoutGrandTrees } from './grand';
import { wrapAngle } from './curve';

describe('Geschwister des Riesenbaums', () => {
  it('Standorte: Ring um den Riesenbaum, freie Sektoren bleiben frei, deterministisch', () => {
    const avoid = [{ angle: 1.0, width: 0.6 }];
    const a = layoutGrandTrees({ count: 5, seed: 3, heroCrown: 15, avoid });
    expect(a).toEqual(layoutGrandTrees({ count: 5, seed: 3, heroCrown: 15, avoid }));
    expect(a.length).toBe(5);
    for (const s of a) {
      const r = Math.hypot(s.x, s.z);
      expect(r).toBeGreaterThanOrEqual(15 * 1.8 - 1e-6);
      expect(r).toBeLessThanOrEqual(15 * 2.7 + 1e-6);
      expect(Math.abs(wrapAngle(Math.atan2(s.z, s.x) - 1.0))).toBeGreaterThanOrEqual(0.6 - 1e-6);
    }
  });

  it('Formen: alle vier kommen vor, jede kleiner als der Riesenbaum, Farbbänder im Juwelenverlauf', () => {
    const specs = Array.from({ length: 8 }, (_, i) => grandSpec(i, 7));
    expect(new Set(specs.map((s) => s.form)).size).toBeGreaterThanOrEqual(3);
    for (const s of specs) {
      expect(GRAND_FORMS).toContain(s.form);
      expect(s.height).toBeLessThan(14);
      expect(s.crown).toBeLessThan(15);
      expect(s.tones[0]).toBeGreaterThanOrEqual(0);
      expect(s.tones[1]).toBeLessThanOrEqual(1);
      expect(s.tones[1]).toBeGreaterThan(s.tones[0]);
    }
    expect(grandSpec(2, 7)).toEqual(grandSpec(2, 7));
  });

  it('jede Form baut Holz, Kuppeln, Schleier und Sterne ohne NaN; der Fuß steht auf dem Boden', () => {
    for (const form of GRAND_FORMS) {
      const g = createGrandTree(11, { form }, { quality: 'mobil', groundAt: (x, z) => 0.02 * x - 0.01 * z });
      const pos = g.parts.wood.geometry.getAttribute('position').array as Float32Array;
      let minY = Infinity;
      for (let i = 0; i < pos.length; i++) expect(Number.isFinite(pos[i]!)).toBe(true);
      for (let i = 1; i < pos.length; i += 3) minY = Math.min(minY, pos[i]!);
      // Wurzeln und Stammfuß sinken in den Boden (nichts schwebt)
      expect(minY).toBeLessThan(-0.2);
      expect(g.stats.domes, form).toBeGreaterThan(8);
      expect(g.stats.twigs, form).toBeGreaterThan(40);
      expect(g.stats.stars, form).toBeGreaterThan(10);
      expect(g.feet[0]!.y).toBeCloseTo(0, 5);
      expect(g.tops[0]!).toBeGreaterThan(g.specs[0]!.height);
      console.info(`Geschwister ${form}: Holz ${g.stats.woodVertices} Vertices, ${g.stats.domes} Kuppeln, ${g.stats.dots} Randpunkte, ${g.stats.twigs} Zweige, ${g.stats.stars} Sterne`);
      g.dispose();
    }
  });

  it('eine Gruppe: ein Satz Meshes (5 Draw Calls) für alle Bäume, Zweige und Sterne um ihre Standorte', () => {
    const sites = layoutGrandTrees({ count: 4, seed: 5 });
    const g = createGrandTrees({ sites, seed: 5, quality: 'mobil' });
    expect(g.stats.trees).toBe(4);
    expect(g.group.children.length).toBe(5);
    expect(g.shadowCasters.length).toBe(2);
    // jeder Zweig beginnt nahe an einem der Standorte (Kronenweite) — nichts hängt in der Luft zwischen den Bäumen
    const lace = g.parts.lace.geometry as InstancedBufferGeometry;
    const a = lace.getAttribute('twigA');
    const feet = g.feet;
    for (let i = 0; i < a.count; i++) {
      const p = new Vector3(a.getX(i), a.getY(i), a.getZ(i));
      const d = Math.min(...feet.map((f, k) => Math.hypot(p.x - f.x, p.z - f.z) / g.specs[k]!.crown));
      expect(d).toBeLessThan(2.1);
    }
    g.dispose();
  });
});
