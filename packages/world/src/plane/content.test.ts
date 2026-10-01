import { describe, expect, it } from 'vitest';
import { AUTHORED_ROUTE, ROUTE, loadWorldFiles, testField } from './testWorlds';
import { PlanePath } from './path';

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
