import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PlanetField, spiralPath, type PlanetLandmarkParams, type PlanetWorldParams } from '../planet';
import type { WorldFeatureSpec } from './types';

/**
 * Die echten Weltdateien (`content/zones/worlds/*.json`): Jedes Merkmal, das eine Welt verlangt, muss auch entstehen —
 * sonst verschwindet z. B. ein See still, wenn sich das Gelände ändert. Planet wie im Spiel (Radius 32, Seed 7,
 * 2.75 Umdrehungen, Fokus-Slots der Weltdateien).
 */
const contentDir = fileURLToPath(new URL('../../../../content/zones/', import.meta.url));

interface WorldFile {
  id: string;
  index: number;
  ref: string;
  zone: string;
  side: 'near' | 'far';
  half?: 0 | 1;
  terrain: PlanetWorldParams['terrain'];
  vegetation: PlanetWorldParams['vegetation'];
  props?: PlanetWorldParams['props'];
  features?: WorldFeatureSpec;
  focal?: { kind?: string; scale?: number; latFrac?: number; deltaDeg?: number; yawDeg?: number };
}

const zones = readdirSync(contentDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(contentDir + f, 'utf8')) as { id: string; levelRange: [number, number] })
  .sort((a, b) => a.levelRange[0] - b.levelRange[0]);
const worldFiles = readdirSync(contentDir + 'worlds')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(contentDir + 'worlds/' + f, 'utf8')) as WorldFile)
  .sort((a, b) => a.index - b.index);

function buildField(seed = 7): PlanetField {
  const worlds: PlanetWorldParams[] = worldFiles.map((w) => ({
    id: w.id,
    zone: zones.findIndex((z) => z.id === w.zone),
    side: w.side,
    ...(w.half !== undefined ? { half: w.half } : {}),
    terrain: w.terrain,
    vegetation: w.vegetation,
    props: w.props ?? {},
    ...(w.features ? { features: w.features } : {}),
  }));
  // Fokus-Slots wie `planetLandmarks()` im Spiel (apps/game/src/lab/earle/zones.ts)
  const landmarks: PlanetLandmarkParams[] = [];
  worldFiles.forEach((w, i) => {
    if (!w.focal) return;
    landmarks.push({
      id: `focal-${w.ref}`,
      world: i,
      latFrac: w.focal.latFrac ?? 0.5,
      deltaDeg: w.focal.deltaDeg ?? 40,
      yawDeg: w.focal.yawDeg ?? 0,
      scale: 1,
      clearRadius: !w.focal.kind ? 0 : w.focal.kind === 'barn' ? 4.5 : 3.2,
      ...(w.focal.kind ? { instance: { kind: w.focal.kind as NonNullable<PlanetLandmarkParams['instance']>['kind'], scale: w.focal.scale ?? 1 } } : {}),
    });
  });
  return new PlanetField({
    radius: 32,
    seed,
    chunksPerFace: 3,
    zones: zones.map((z) => ({ id: z.id, hillAmplitude: 1.5, vegetation: { density: 0.2, clumpiness: 0.5, kinds: { dome: 1 }, scale: [0.8, 1.2] } })),
    worlds,
    spiral: { turns: 2.75 },
    landmarks,
  });
}

describe('Geländemerkmale der Weltdateien', () => {
  const field = buildField();
  const f = field.features;

  it('jede Welt bekommt alle verlangten Seen, Flüsse und Felsformationen', () => {
    worldFiles.forEach((w, world) => {
      const spec = w.features;
      if (!spec) return;
      const lakes = f.lakes.filter((l) => l.world === world).length;
      const rivers = f.rivers.filter((r) => r.world === world).length;
      if (spec.rivers) expect(rivers, `${w.id} Flüsse`).toBe(spec.rivers.count);
      // Jeder Fluss mündet in einen eigenen See; `lakes.count` zählt diese mit
      const wantLakes = Math.max(spec.lakes?.count ?? 0, spec.rivers ? rivers : 0);
      expect(lakes, `${w.id} Seen`).toBe(wantLakes);
      for (const r of spec.rocks ?? []) {
        const made = f.formations.filter((x) => x.world === world && x.kind === r.kind);
        if (r.kind === 'wall') {
          // Wand = Segmente einer Formation (mindestens zwei)
          const walls = new Set(made.map((x) => x.id.replace(/-seg\d+$/, '')));
          expect(walls.size, `${w.id} Felswände`).toBe(r.count);
          expect(made.length, `${w.id} Wandsegmente`).toBeGreaterThanOrEqual(2 * r.count);
        } else expect(made.length, `${w.id} ${r.kind}`).toBe(r.count);
      }
      if (spec.snowFields) expect(f.snow[world], `${w.id} Schneefelder`).not.toBeNull();
    });
  });

  it('kein Levelknoten liegt im Wasser, auf einem Felsen oder direkt an einem Ufer', () => {
    const path = spiralPath(field, { nodesPerZone: 25 });
    for (const n of path.nodes) {
      const l = Math.hypot(...n.position);
      const d: [number, number, number] = [n.position[0] / l, n.position[1] / l, n.position[2] / l];
      expect(f.isWater(...d, 1.0), `Knoten ${n.index} im Wasser`).toBe(false);
      expect(f.rockAt(...d, 1.0), `Knoten ${n.index} auf Fels`).toBeNull();
    }
  });

  it('Felsanker der Weltdateien: jede Terrassen-, Turm- und Wandformation trägt Anker', () => {
    for (const form of f.formations) {
      if (form.kind === 'spires') continue;
      expect(f.ledges(form.world).some((a) => a.formation === form.id), `${form.id} ohne Anker`).toBe(true);
    }
  });
});
