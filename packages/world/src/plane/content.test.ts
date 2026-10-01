import { describe, expect, it } from 'vitest';
import { AUTHORED_ROUTE, ROUTE, loadWorldFiles, testField } from './testWorlds';
import { PlanePath } from './path';
import { lakeAt } from './features/lakes';

/**
 * Wasserbudget je Welt (W7, Florians Entscheidungen 5 und Punkt 11; Plan „Wasserbudget“): Seen (einschließlich der
 * Mündungsseen der Flüsse), Flüsse, davon giftig, Meer. Welten ohne Eintrag haben kein Wasser.
 */
const WATER_BUDGET: Record<string, { lakes: number; rivers: number; toxicLakes?: number; toxicRivers?: number; sea?: boolean }> = {
  w09: { lakes: 2, rivers: 2, toxicLakes: 2, toxicRivers: 2 },
  w04: { lakes: 2, rivers: 0, toxicLakes: 1 },
  w10: { lakes: 2, rivers: 1 },
  w05: { lakes: 2, rivers: 1 },
  w02: { lakes: 3, rivers: 2 },
  w07: { lakes: 1, rivers: 1 },
  w03: { lakes: 1, rivers: 0 },
  w13: { lakes: 1, rivers: 0 },
  w14: { lakes: 0, rivers: 0, sea: true },
  w15: { lakes: 1, rivers: 1 },
};

/**
 * Die echten Weltdateien (`content/zones/worlds/*.json`) auf der unendlichen Ebene (ADR 0002): Jedes Merkmal, das eine
 * Welt verlangt, entsteht in ihrem Pfadabschnitt — sonst verschwindet z. B. ein See still, wenn sich das Gelände ändert.
 * Feld wie im Spiel (Seed 7, Autorenroute).
 */
describe('Geländemerkmale der Weltdateien (Ebene)', () => {
  const field = testField();
  const worlds = loadWorldFiles();
  const regions = AUTHORED_ROUTE.map((r, k) => ({ world: r.world, features: field.features.region(`p${k}`) }));

  it('jede Welt bekommt in ihrem Pfadabschnitt alle verlangten Seen, Flüsse und Felsformationen', () => {
    for (const { world, features } of regions) {
      const w = worlds[world]!;
      const spec = w.features;
      if (!spec) continue;
      const rivers = features.rivers.length;
      if (spec.rivers) expect(rivers, `${w.id} Flüsse`).toBe(spec.rivers.count);
      // Jeder Fluss mündet in einen eigenen See; `lakes.count` zählt diese mit
      const wantLakes = Math.max(spec.lakes?.count ?? 0, spec.rivers ? rivers : 0);
      expect(features.lakes.length, `${w.id} Seen`).toBe(wantLakes);
      // je Art die Summe der verlangten Anzahl (eine Welt darf dieselbe Art mehrfach verlangen, z. B. Welt 12)
      const wanted = new Map<string, number>();
      for (const r of spec.rocks ?? []) wanted.set(r.kind, (wanted.get(r.kind) ?? 0) + r.count);
      for (const [kind, count] of wanted) {
        const made = features.formations.filter((x) => x.kind === kind);
        if (kind === 'wall') {
          // Wand = Segmente einer Formation (mindestens zwei)
          const walls = new Set(made.map((x) => x.id.replace(/-seg\d+$/, '')));
          expect(walls.size, `${w.id} Felswände`).toBe(count);
          expect(made.length, `${w.id} Wandsegmente`).toBeGreaterThanOrEqual(2 * count);
        } else expect(made.length, `${w.id} ${kind}`).toBe(count);
      }
      if (spec.snowFields) expect(features.snow, `${w.id} Schneefelder`).not.toBeNull();
    }
  });

  it('kein Levelknoten liegt im Wasser oder auf einem Felsen (außer auf den Plateaus der Wahrzeichen)', () => {
    const path = new PlanePath(field, { seed: 7 });
    // alle spielbaren Level der Route (1–184) und der Torknoten
    for (const n of path.nodes(0, ROUTE.lastNode)) {
      if (n.landmark) continue;
      expect(field.isWater(n.position[0], n.position[2], 0.6), `Knoten ${n.index} im Wasser`).toBe(false);
      expect(field.rockAt(n.position[0], n.position[2], 0.6), `Knoten ${n.index} auf Fels`).toBeNull();
    }
  });

  it('Wasserbudget: Seen, Flüsse, Gift und Meer je Welt wie geplant; Giftflüsse münden in Giftseen', () => {
    for (const { world, features } of regions) {
      const w = worlds[world]!;
      const want = WATER_BUDGET[w.id] ?? { lakes: 0, rivers: 0 };
      expect(features.lakes.length, `${w.id} Seen`).toBe(want.lakes);
      expect(features.rivers.length, `${w.id} Flüsse`).toBe(want.rivers);
      expect(features.lakes.filter((l) => l.toxic).length, `${w.id} Giftseen`).toBe(want.toxicLakes ?? 0);
      expect(features.rivers.filter((r) => r.toxic).length, `${w.id} Giftflüsse`).toBe(want.toxicRivers ?? 0);
      expect(features.seas.length > 0, `${w.id} Meer`).toBe(want.sea === true);
      for (const river of features.rivers) {
        if (!river.toxic) continue;
        const mouth = features.lakes[river.lake];
        expect(mouth?.toxic, `${river.id} mündet nicht in einen Giftsee`).toBe(true);
        const end = river.points[river.points.length - 1]!;
        const hit = { e: 0, theta: 0 };
        expect(lakeAt(mouth!, end[0], end[1], hit) && hit.e < 0.5, `${river.id} endet nicht im See`).toBe(true);
      }
    }
  });

  it('je Welt (Makroform, W3): kein Punkt des Wegs im Wasser oder auf Fels, die Route hält Wasser und Fels fern', () => {
    const path = new PlanePath(field, { seed: 7 });
    for (let k = 0; k < AUTHORED_ROUTE.length; k++) {
      const seg = path.segment(k);
      const id = worlds[AUTHORED_ROUTE[k]!.world]!.id;
      // Knoten auf einem Wahrzeichen: ihre Treppen und Stufen gehören dem Wahrzeichen
      const onLandmark = new Set(seg.nodes.filter((n) => n.landmark).flatMap((n) => [n.index - 1, n.index]));
      for (const d of seg.dots) {
        if (onLandmark.has(d.seg)) continue;
        expect(field.isWater(d.position[0], d.position[2], 0), `${id}: Punkt nach Knoten ${d.seg} im Wasser`).toBe(false);
        expect(field.rockAt(d.position[0], d.position[2], 0), `${id}: Punkt nach Knoten ${d.seg} auf Fels`).toBeNull();
      }
    }
  });

  it('je Welt: Felsen stehen ≥ 2,2 von der Mittellinie, Held-Wahrzeichen und Sümpfe im verlangten Pfadabstand', () => {
    const layout = field.layout;
    for (let k = 0; k < AUTHORED_ROUTE.length; k++) {
      const id = worlds[AUTHORED_ROUTE[k]!.world]!.id;
      const r = field.features.region(`p${k}`);
      for (const f of r.formations) {
        for (const c of f.columns) {
          for (const [a, b] of c.polygon) {
            expect(layout.pathDistance(f.cx + a, f.cz + b), `${id} ${f.id}`).toBeGreaterThanOrEqual(2.2 - 1e-6);
          }
        }
      }
      for (const inst of field.landmarks!.regionInstances(layout.pathRegionOf(k))) {
        const p = inst.placement;
        const want = field.landmarks!.plan.kinds[p.kind]?.pathDistance?.[0] ?? 0;
        // Korridorabstand = Abstand zur Mittellinie − Spielraum 3,2
        expect(layout.pathDistance(p.x, p.z) - 3.2, `${id} ${p.id}`).toBeGreaterThanOrEqual(Math.max(2.2, want) - 1e-6);
      }
    }
  });

  it('je Welt: Flüsse schneiden den Pfad nicht', () => {
    const path = new PlanePath(field, { seed: 7 });
    let rivers = 0;
    for (let k = 0; k < AUTHORED_ROUTE.length; k++) {
      const r = field.features.region(`p${k}`);
      const samples = path.segment(k).samples;
      for (const river of r.rivers) {
        rivers++;
        river.points.forEach(([x, z], i) => {
          let d = Infinity;
          for (const s of samples) d = Math.min(d, Math.hypot(s.position[0] - x, s.position[2] - z));
          expect(d, `${river.id} Punkt ${i}`).toBeGreaterThan(river.widths[i]! * 0.5 + 0.3);
        });
      }
    }
    expect(rivers).toBeGreaterThan(0);
  });

  it('Felsanker: jede Terrassen-, Turm- und Wandformation trägt Anker', () => {
    for (const { features } of regions) {
      for (const form of features.formations) {
        if (form.kind === 'spires') continue;
        expect(
          features.ledges.some((a) => a.formation === form.id),
          `${form.id} ohne Anker`,
        ).toBe(true);
      }
    }
  });
});
