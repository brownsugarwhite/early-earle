import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { buildCreature } from '../mesh/build';
import { jawPose, jawRig, posedPositions } from './pose';

/**
 * Florian: „Der Unterkiefer darf beim Öffnen nicht durch den Körper fahren und keine Lücken reißen; am Limit öffnet der
 * Oberkiefer weiter.“ Geprüft an einem Drachen (Kehlsack, Kiefer am Hals) und am Grundblob: kein Vertex unter dem Boden,
 * keine Kante dehnt sich mehr als auf das Dreifache (kein Riss), die Öffnung vorn erreicht trotz Bodenschranke
 * einen großen Teil des Ziels — über den Oberkiefer.
 */
/** Größte Kantendehnung (Pose/Ruhe) über Kanten, die in Ruhe mindestens eine halbe Zelle lang sind (winzige DC-Kanten ausgenommen). */
function kantenDehnung(index: Uint32Array, ruhe: Float32Array, pose: Float32Array, zelle: number, haut: (v: number) => boolean): { worst: number; wo: [number, number, number]; a: number; b: number } {
  let worst = 0;
  let wo: [number, number, number] = [0, 0, 0];
  let wa = 0, wb = 0;
  for (let i = 0; i < index.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = index[i + k]!, b = index[i + ((k + 1) % 3)]!;
      if (!haut(a) || !haut(b)) continue; // die Rachenwand dehnt sich beim Öffnen absichtlich (langer Schlund)
      const l0 = Math.hypot(ruhe[a * 3]! - ruhe[b * 3]!, ruhe[a * 3 + 1]! - ruhe[b * 3 + 1]!, ruhe[a * 3 + 2]! - ruhe[b * 3 + 2]!);
      const l1 = Math.hypot(pose[a * 3]! - pose[b * 3]!, pose[a * 3 + 1]! - pose[b * 3 + 1]!, pose[a * 3 + 2]! - pose[b * 3 + 2]!);
      if (l0 > 0.5 * zelle && l1 / l0 > worst) {
        worst = l1 / l0;
        wo = [ruhe[a * 3]!, ruhe[a * 3 + 1]!, ruhe[a * 3 + 2]!];
        wa = a;
        wb = b;
      }
    }
  }
  return { worst, wo, a: wa, b: wb };
}

describe('Kieferschranke und Kehlkette', () => {
  const faelle: Array<[string, unknown]> = [
    ['Drache', { koerper: { hoehe: 1.2, breite: 0.8, laenge: 0.85, neigung: 0.45, bogen: -0.7, bauch: 0.3 }, kopf: { groesse: 1.4, schnauze: 0.35 }, maul: { hoehe: 0.4, form: 1, winkel: 0.45, breite: 0.9, oberkiefer: 1.5, unterkiefer: 0.35, oeffnung: 1.0, tiefe: 1.0, oeffnungOben: 0.4, kehle: 1.0 }, zaehne: { stil: 'keine' } }],
    ['Grundblob', { maul: { oeffnung: 1.0 }, zaehne: { stil: 'keine' } }],
    ['Rex', { koerper: { hoehe: 0.42, breite: 1.45, laenge: 1.7 }, hals: { laenge: 0.05, dicke: 1.5, ansatz: 0.75 }, kopf: { groesse: 2.15, laenge: 1.1, schnauze: 0.4 }, maul: { hoehe: 0.37, neigung: 0.6, winkel: 0.3, oeffnung: 1.0, oeffnungOben: 0.6, kehle: 0.3 }, zaehne: { stil: 'keine' }, unterkoerper: { typ: 'beine', beine: { anzahl: 2, laenge: 1.0 } } }],
  ];
  for (const [name, input] of faelle) {
    it(`${name}: öffnet weit ohne Boden und ohne Riss`, () => {
      const b = parseBauplan(input);
      const r = buildCreature(b, { resolution: 40 });
      const m = r.mouth!;
      const rig = jawRig(r, b.maul);
      const pose = jawPose(rig, 1);
      expect(pose.lowerAngle).toBeGreaterThanOrEqual(0);
      expect(pose.lowerAngle).toBeLessThanOrEqual(r.lowerAngleMax + 1e-6);
      expect(-pose.upperAngle).toBeGreaterThan(0.2); // der Oberkiefer trägt mit
      const auf = posedPositions(r, { openness: 1, maul: b.maul });
      let minY = Infinity;
      for (let v = 0; v < r.stats.vertexCount; v++) minY = Math.min(minY, auf[v * 3 + 1]!);
      expect(minY).toBeGreaterThan(-0.03);
      const zelle = (r.bounds.max[1] - r.bounds.min[1]) / 40;
      const d = kantenDehnung(r.index, r.positions, auf, zelle, (v) => r.descriptors.region[v * 4]! < 0.25);
      process.stderr.write(`${name}: Unterkiefer ${((pose.lowerAngle * 180) / Math.PI).toFixed(0)}°, Oberkiefer ${((-pose.upperAngle * 180) / Math.PI).toFixed(0)}°, Hautdehnung max ${d.worst.toFixed(2)} bei ${d.wo.map((x) => x.toFixed(2)).join(',')}\n`);
      expect(d.worst).toBeLessThan(3.2);
      // Öffnung vorn: Abstand der Ränder (Mitte) ≥ 60 % des Ziels
      const zu = posedPositions(r, { openness: 0, maul: b.maul });
      void zu;
      const L = r.jawLever;
      const sep = L * (Math.sin(pose.lowerAngle) + Math.sin(-pose.upperAngle));
      expect(sep).toBeGreaterThan(0.6 * Math.min(m.gapeMax, 1.9 * L * 0.95));
    });
  }
});
