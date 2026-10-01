import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, generatePlaneChunk, scatterPlaneTrees } from './chunks';
import { PlanePath } from './path';
import { AUTHORED_ROUTE, loadWorldFiles, testField } from './testWorlds';

/**
 * Welt 13 (Roter Monolith, Ebene 45) und Welt 14 (Stille Bucht, Ebene 29) auf der unendlichen Ebene: Routenabschnitte
 * der Level 149–160 und 161–172 (Route 15 + 1). Feld wie im Spiel.
 */
describe('Welten 13 und 14 (Level 149–172)', () => {
  const field = testField();
  const worlds = loadWorldFiles();
  const k13 = AUTHORED_ROUTE.findIndex((r) => worlds[r.world]?.id === 'w13');
  const k14 = AUTHORED_ROUTE.findIndex((r) => worlds[r.world]?.id === 'w14');
  const path = new PlanePath(field, { seed: 7 });

  it('liegen nach w11 und w12 auf der Route und tragen die Level 149–160 und 161–172', () => {
    // Reihenfolge: w11, w12 (Ebene 20/7), dann w13, w14, w15
    expect(k13).toBe(12);
    expect(k14).toBe(13);
    expect(field.layout.authoredLevels).toBe(184);
    expect(field.layout.segment(k13)).toMatchObject({ world: AUTHORED_ROUTE[k13]!.world, firstLevel: 149, levels: 12 });
    expect(field.layout.segment(k14)).toMatchObject({ world: AUTHORED_ROUTE[k14]!.world, firstLevel: 161, levels: 12 });
    const nodes = path.nodes(148, 171);
    for (const n of nodes.slice(0, 12)) expect(n.world, `Knoten ${n.index}`).toBe(AUTHORED_ROUTE[k13]!.world);
    for (const n of nodes.slice(12)) expect(n.world, `Knoten ${n.index}`).toBe(AUTHORED_ROUTE[k14]!.world);
  });

  it('kein Levelknoten der beiden Welten liegt im Wasser oder auf dem Fels', () => {
    for (const n of path.nodes(148, 171)) {
      if (n.landmark) continue;
      expect(field.isWater(n.position[0], n.position[2], 0.6), `Knoten ${n.index} im Wasser`).toBe(false);
      expect(field.rockAt(n.position[0], n.position[2], 0.6), `Knoten ${n.index} auf Fels`).toBeNull();
    }
  });

  it('Welt 13: ein Monolith, den die Schnecke des Pfads umrundet, mit Plateau-Ankern und sieben Pferden am Fuß', () => {
    const r = field.features.region(`p${k13}`);
    const monoliths = r.formations.filter((f) => f.kind === 'monolith');
    expect(monoliths).toHaveLength(1);
    const m = monoliths[0]!;
    // Makroform (W3): der Turm steht im Zentrum der Schnecke, die Mittellinie umläuft das Plateau mit Abstand
    const macro = field.layout.macro(k13);
    expect(macro.shape).toBe('spiral');
    expect(Math.hypot(m.cx - macro.centre![0], m.cz - macro.centre![1])).toBeLessThan(3);
    expect(field.layout.pathDistance(m.cx, m.cz)).toBeGreaterThan(11);
    // höher als alles andere in der Welt, mit Stufen (mehrere Säulen) und Anker auf dem Plateau
    expect(m.height - (m.ground ?? 0)).toBeGreaterThan(15);
    expect(m.columns.length).toBeGreaterThan(4);
    expect(r.ledges.some((a) => a.formation === m.id)).toBe(true);
    // Pferde: am Fuß auf trockenem Boden, klein gegen den Turm
    expect(m.herd).toHaveLength(7);
    for (const [a, b] of m.herd!) {
      const x = m.cx + a;
      const z = m.cz + b;
      expect(field.isWater(x, z, 0), `Pferd bei ${x.toFixed(1)}, ${z.toFixed(1)} im Wasser`).toBe(false);
      expect(Math.hypot(a, b)).toBeLessThan(m.footprint * 1.2);
    }
  });

  it('Welt 14: ein Meer auf der Pfadseite, Kräusel quer zum Blick der Komposition, trockener Pfad', () => {
    const r = field.features.region(`p${k14}`);
    expect(r.seas).toHaveLength(1);
    const sea = r.seas[0]!;
    expect(sea.side).toBe(1);
    expect(sea.ripple).toBeCloseTo((37 * Math.PI) / 180, 6);
    // die Küste liegt jenseits des Pfads, das Meer reicht bis an den Rand des Weltbands
    expect(sea.near).toBeGreaterThanOrEqual(7);
    expect(sea.outer).toBeGreaterThan(sea.far);
    // Wasser neben dem Pfad am Fokus der Komposition, der Pfad selbst trocken
    const seg = field.layout.segment(k14);
    const z = (seg.zStart + seg.zEnd) / 2;
    const xb = field.layout.backbone(z);
    expect(field.isWater(xb, z, 0)).toBe(false);
    expect(field.isWater(xb + sea.far + 4, z, 0)).toBe(true);
  });

  it('Welt 14: Windbäume stehen nur im Band hinter der Klippe (3,6–9 Einheiten landeinwärts)', () => {
    const seg = field.layout.segment(k14);
    const key = `p${k14}`;
    const zMid = (seg.zStart + seg.zEnd) / 2;
    const xb = field.layout.backbone(zMid);
    const cx0 = Math.floor((xb - 24) / CHUNK_SIZE);
    const cx1 = Math.floor((xb + 24) / CHUNK_SIZE);
    const cz0 = Math.floor(seg.zEnd / CHUNK_SIZE);
    const cz1 = Math.floor(seg.zStart / CHUNK_SIZE);
    let wind = 0;
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const mesh = generatePlaneChunk(field, cx, cz, 17);
        for (const t of scatterPlaneTrees(field, cx, cz, { mesh })) {
          if (t.kind !== 'wind') continue;
          if (field.layout.sample(t.position[0], t.position[2]).region.key !== key) continue;
          wind++;
          const d = field.features.seaDistance(key, t.position[0], t.position[2], true);
          expect(d, 'Windbaum ohne Meer').not.toBeNull();
          expect(d!).toBeLessThanOrEqual(-3.6 + 1e-6);
          expect(d!).toBeGreaterThanOrEqual(-9 - 1e-6);
          expect(field.isWater(t.position[0], t.position[2], 0)).toBe(false);
        }
      }
    }
    expect(wind).toBeGreaterThan(3);
  });
});
