import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, scatterPlaneProps, scatterPlaneTrees } from './chunks';
import { PlanePath } from './path';
import { proceduralRecipe, proceduralWorldSpec } from './procedural';
import { authoredSpecs, loadWorldFiles, testField } from './testWorlds';
import { TREE_PROPORTIONS } from '../scatterTrees';

/**
 * Begleiter der Weltkomposition (Welt 08 „Rote Scheune“, Bild 01): der Bildanker trägt den Schnee-Ahorn und zwei
 * Scheunen mit festen Versätzen; die Streuung hält Abstand, prozedurale Welten erben nur eine Scheune.
 */
describe('Begleiter der Weltkomposition (Welt 08)', () => {
  const field = testField();
  const files = loadWorldFiles();
  const w08 = files.findIndex((w) => w.id === 'w08');
  const k = [...Array(10).keys()].find((i) => field.layout.segment(i).world === w08)!;
  const key = `p${k}`;
  const focal = field.focalSlot(key)!;
  const companions = field.companionSlots(key);
  const spec = files[w08]!.focal!;

  it('der Bildanker trägt den Schnee-Ahorn und zwei Scheunen an ihren Versätzen, alle in der Pfadwelt 08', () => {
    expect(focal).not.toBeNull();
    expect(focal.instance).toBeUndefined();
    // Ebene 6 (Ahorn, Pultdach-Scheune), ferne Scheune, Ebene 37 (drei Ahorne in einer Reihe, zwei Tintendach-Scheunen)
    expect(companions.map((c) => c.instance?.kind)).toEqual(spec.companions!.map((c) => c.kind));
    expect(companions.length).toBe(8);
    companions.forEach((c, i) => {
      const s = spec.companions![i]!;
      expect(c.position[0]).toBeCloseTo(focal.position[0] + s.dx, 9);
      expect(c.position[2]).toBeCloseTo(focal.position[2] + s.dz, 9);
      expect(c.world).toBe(w08);
      expect(c.region).toBe(key);
      expect(c.yawDeg).toBe(s.yawDeg ?? 0);
      expect(c.turnTree).toBe(true);
      // Fuß auf dem natürlichen Gelände
      expect(Number.isFinite(c.position[1])).toBe(true);
    });
    // Freiraum: Scheunen nach Angabe, der Ahorn nach Art (1,6 × Maßstab)
    expect(companions[1]!.clearRadius).toBe(spec.companions![1]!.clearRadius);
    expect(companions[0]!.clearRadius).toBeCloseTo(1.6 * (spec.companions![0]!.scale ?? 1), 9);
    // gleiche Abfrage → derselbe Zwischenspeicher
    expect(field.companionSlots(key)).toBe(companions);
  });

  it('Streuung: Ahorn und Scheunen stehen genau einmal, gedreht nach der Komposition; nichts wächst in ihnen', () => {
    const chunkOf = (x: number, z: number) => [Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE)] as const;
    const [mx, mz] = chunkOf(companions[0]!.position[0], companions[0]!.position[2]);
    const trees = scatterPlaneTrees(field, mx, mz, { densityScale: 1 });
    const maples = trees.filter((t) => t.kind === 'maple' && Math.hypot(t.position[0] - companions[0]!.position[0], t.position[2] - companions[0]!.position[2]) < 1e-6);
    expect(maples.length).toBe(1);
    expect(maples[0]!.position[0]).toBeCloseTo(companions[0]!.position[0], 6);
    expect(maples[0]!.yaw).toBeCloseTo(((spec.companions![0]!.yawDeg ?? 0) * Math.PI) / 180, 9);
    expect(maples[0]!.canopyRadius).toBeCloseTo(TREE_PROPORTIONS.maple.radius * (spec.companions![0]!.scale ?? 1), 9);
    companions.forEach((c, i) => {
      if (c.instance?.kind !== 'barn') return;
      const s = spec.companions![i]!;
      const [cx, cz] = chunkOf(c.position[0], c.position[2]);
      const props = scatterPlaneProps(field, cx, cz, { densityScale: 1 });
      const here = props.filter((p) => p.kind === 'barn' && Math.hypot(p.position[0] - c.position[0], p.position[2] - c.position[2]) < 1e-6);
      expect(here.length).toBe(1);
      // Variante der Komposition (Standard 0.37 = Pultdach-Scheune, Ebene 6), nie mit Anbau; Dach abweichend von der Welt
      expect(here[0]!.variant).toBe(s.variant ?? 0.37);
      expect(here[0]!.variant).toBeLessThan(0.45);
      expect(here[0]!.roof).toBe(s.roof);
      expect(here[0]!.yaw).toBeCloseTo(((c.yawDeg ?? 0) * Math.PI) / 180, 9);
      // kein gestreuter Baum im Freiraum der Scheune
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          for (const t of scatterPlaneTrees(field, cx + dx, cz + dz, { densityScale: 1 })) {
            if (t.kind === 'maple') continue;
            expect(Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2])).toBeGreaterThan(c.clearRadius);
          }
    });
    // Ebene 37: Tintendächer neben der Schneescheune
    expect(spec.companions!.filter((c) => c.kind === 'barn' && c.roof === 'ink').length).toBeGreaterThanOrEqual(2);
  });

  it('der Levelpfad hält Abstand zu Ahorn und Scheunen (Knoten und Punkte)', () => {
    const path = new PlanePath(field, { seed: 7 });
    const seg = path.segment(k);
    // Scheune: halbe Länge (1,55/2 · Maßstab) plus Rand; Ahorn: Schneesaum (≈ 2,35 H, H = 0,46 · 1,3 · Maßstab)
    const reach = companions.map((c, i) => (c.instance?.kind === 'maple' ? 2.35 * 0.46 * 1.3 : 0.8) * (spec.companions![i]!.scale ?? 1) + 1);
    for (const n of [...seg.nodes.map((q) => q.position), ...seg.dots.map((d) => d.position)]) {
      companions.forEach((c, i) => expect(Math.hypot(n[0] - c.position[0], n[2] - c.position[2])).toBeGreaterThan(reach[i]!));
    }
  });

  it('prozedurale Welten mit Welt 08 als Haupt-Elternteil erben eine Scheune als Fokus, keine Begleiter', () => {
    const authored = authoredSpecs();
    let found = 0;
    for (let id = authored.length; id < authored.length + 400 && found < 3; id++) {
      const r = proceduralRecipe(id, authored.length, 7);
      const dom = r.t < 0.5 ? r.parentA : r.parentB;
      if (dom !== w08) continue;
      const s = proceduralWorldSpec(id, authored, 7);
      expect(s.focal?.kind).toBe('barn');
      expect(s.focal?.companions).toBeUndefined();
      expect(Math.abs(s.focal!.lateral!)).toBeGreaterThanOrEqual(4);
      found++;
    }
    expect(found).toBeGreaterThan(0);
  });
});
