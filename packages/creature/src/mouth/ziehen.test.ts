import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { buildCreature } from '../mesh/build';
import { jawPose, jawRig, posedPositions } from './pose';

/**
 * Florian: „Bei tiefem Maul muss der Oberkiefer beim Öffnen nach oben fahren statt nur nach hinten zu kippen“, und die
 * Öffnungsart soll einstellbar sein (Kippen oder Auseinanderziehen). Geprüft: beim reinen Ziehen trägt die Drehung
 * nichts, der Oberrand hebt sich um die Öffnung, der Unterrand senkt sich höchstens bis zum Boden; beim hohen Maul
 * senkt sich der Unterkiefer wirklich.
 */
describe('Öffnen durch Auseinanderziehen', () => {
  it('tiefes Maul: der Oberkiefer fährt nach oben, nichts kippt, nichts unter dem Boden', () => {
    const b = parseBauplan({ maul: { hoehe: 0.14, neigung: -0.2, form: 1, winkel: 0.7, breite: 0.9, oberkiefer: 1.3, unterkiefer: 0.6, oeffnung: 0.5, ziehen: 1, ziehenOben: 1 }, zaehne: { stil: 'keine' } });
    const r = buildCreature(b, { resolution: 40 });
    const rig = jawRig(r, b.maul);
    const pose = jawPose(rig, 1);
    expect(pose.lowerAngle).toBeCloseTo(0, 6);
    expect(pose.upperAngle).toBeCloseTo(0, 6);
    expect(pose.lowerDrop).toBeCloseTo(0, 6);
    expect(pose.upperRise).toBeCloseTo(rig.gapeMax * rig.form, 6);
    const auf = posedPositions(r, { openness: 1, maul: b.maul });
    // Oberrand (Randvertices der Oberseite, Kantenabstand 0) hebt sich um die Öffnung, Unterrand bleibt
    const hebung = (v: number) => auf[v * 3 + 1]! - r.positions[v * 3 + 1]!;
    let nO = 0, nU = 0, sO = 0, sU = 0;
    for (let v = 0; v < r.stats.vertexCount; v++) {
      if (r.descriptors.region[v * 4 + 1]! > 1e-3 || r.descriptors.region[v * 4]! > 0) continue;
      if (r.seite[v]! > 0.5) {
        nU++;
        sU += Math.abs(hebung(v));
      } else {
        nO++;
        sO += hebung(v);
      }
    }
    expect(nO).toBeGreaterThan(10);
    expect(nU).toBeGreaterThan(10);
    expect(sO / nO).toBeCloseTo(pose.upperRise, 1);
    expect(sU / nU).toBeLessThan(0.03);
    let minY = Infinity;
    for (let v = 0; v < r.stats.vertexCount; v++) minY = Math.min(minY, auf[v * 3 + 1]!);
    expect(minY).toBeGreaterThan(-0.03);
  });
  it('hohes Maul: der Unterkiefer senkt sich bis zur Bodenschranke, der Rest geht nach oben', () => {
    const b = parseBauplan({ maul: { hoehe: 0.82, neigung: 0.2, form: 1, winkel: 0.4, breite: 0.8, oberkiefer: 0.6, unterkiefer: 1.1, oeffnung: 0.8, ziehen: 1, ziehenOben: 0 }, zaehne: { stil: 'keine' } });
    const r = buildCreature(b, { resolution: 40 });
    const rig = jawRig(r, b.maul);
    const pose = jawPose(rig, 1);
    expect(r.lowerDropMax).toBeGreaterThan(0);
    expect(pose.lowerDrop).toBeGreaterThan(0);
    expect(pose.lowerDrop).toBeLessThanOrEqual(r.lowerDropMax + 1e-9);
    expect(pose.lowerDrop + pose.upperRise).toBeCloseTo(rig.gapeMax * rig.form, 6);
    const auf = posedPositions(r, { openness: 1, maul: b.maul });
    let minY = Infinity;
    for (let v = 0; v < r.stats.vertexCount; v++) minY = Math.min(minY, auf[v * 3 + 1]!);
    expect(minY).toBeGreaterThan(-0.03);
  });
  it('Mischung: halb Kippen, halb Ziehen — beide Anteile tragen', () => {
    const b = parseBauplan({ maul: { oeffnung: 0.8, ziehen: 0.5, ziehenOben: 0.5 }, zaehne: { stil: 'keine' } });
    const r = buildCreature(b, { resolution: 40 });
    const rig = jawRig(r, b.maul);
    const pose = jawPose(rig, 1);
    expect(pose.lowerAngle + -pose.upperAngle).toBeGreaterThan(0.05);
    expect(pose.upperRise + pose.lowerDrop).toBeCloseTo(0.5 * rig.gapeMax * rig.form, 6);
  });
});
