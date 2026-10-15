// Pose-Deltas an die Maullinie gebunden (Phase 2 M3): Nach einer neuen Maultopologie wandert ein Delta mit Anker zum
// Punkt gleicher Rolle und Reihe mit dem nächsten Anteil entlang der Lippe.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import { ableitenMitMaul, maulOptionenVorlage } from './maul';
import { maulLinieAusDokument } from './maulDokument';
import { ankerVon, maulAnker, posenUmhaengen } from './posenAnker';
import { kugelMaulDokument } from './pruefstand';
import { wesenBauen } from './wesen';

const bauen = (d: Dokument) => ableitenMitMaul(d, maulLinieAusDokument(d)!, { stufen: 1 }, maulOptionenVorlage('vorn'));

describe('Pose-Deltas an die Maullinie gebunden', () => {
  const a = kugelMaulDokument('gleich', true);
  // Mundwinkel weit nach hinten: längerer Pfad (andere Topologie)
  const oben = a.maul!.zu.oben;
  const ecke = oben.knoten[oben.knoten.length - 1]!;
  const b: Dokument = { ...a, maul: { zu: { oben: { knoten: [...oben.knoten.slice(0, -1), { ...ecke, p: [ecke.p[0] + 0.09, ecke.p[1] - 0.02, ecke.p[2]] }] } } } };
  const ablA = bauen(a);
  const ablB = bauen(b);
  const n0 = ablA.vorlage.kaefig.n;
  const ankerA = maulAnker(ablA.maul, ablA.kaefig.n, n0);
  const ankerB = maulAnker(ablB.maul, ablB.kaefig.n, n0);

  it('Anker: Unterlippe, Tasche und Winkelsäule bekommen Rolle und Anteil; Vorlagenpunkte keinen', () => {
    expect(ankerVon(ankerA, 0)).toBeUndefined();
    const t = Math.floor(ablA.maul.lage.m / 2);
    const p = ablA.maul.unten[t]!;
    expect(p).toBeGreaterThanOrEqual(n0);
    expect(ankerVon(ankerA, p)).toEqual({ rolle: 1, reihe: 0, u: expect.closeTo(t / ablA.maul.lage.m, 5) });
    expect(ankerVon(ankerA, ablA.maul.tasche.oben[0]![t]!)?.rolle).toBe(3);
  });

  it('neue Topologie: das Delta wandert auf die Unterlippe beim selben Anteil; ohne Änderung bleibt die Nummer', () => {
    expect(ablB.maul.lage.m).not.toBe(ablA.maul.lage.m);
    const t = Math.floor(ablA.maul.lage.m / 2);
    const p = ablA.maul.unten[t]!;
    const delta = { punkt: p, d: [0, -0.03, 0] as [number, number, number], anker: ankerVon(ankerA, p)! };
    expect(posenUmhaengen([delta], ankerA, n0)[0]!.punkt).toBe(p);
    const neu = posenUmhaengen([delta], ankerB, n0);
    expect(neu).toHaveLength(1);
    const q = neu[0]!.punkt;
    expect(ankerB.rolle[q]).toBe(1);
    expect(Math.abs(ankerB.u[q]! - delta.anker.u)).toBeLessThanOrEqual(0.5 / ablB.maul.lage.m + 1e-6);
    // ohne Anker bliebe es bei der alten Nummer — dort liegt jetzt etwas anderes
    expect(ankerB.rolle[p] === 1 && Math.abs(ankerB.u[p]! - delta.anker.u) < 1e-4).toBe(false);
  });

  it('im Bau (wie der Editor, gezeichnete Linie im Bauplan): eine Fressen-Pose mit Anker wirkt nach dem Umbau an der Unterlippe beim selben Anteil', () => {
    const plan = (d: Dokument) => ({ maul: 'vorn' as const, gewichte: { fressen: 1 }, earle: false, maulLinie: maulLinieAusDokument(d)! });
    const wa = wesenBauen(a, plan(a), null);
    const ankA = wa.netz.anker!;
    // ein Unterlippenpunkt in der Mitte des Pfads von A
    let p = -1;
    for (let i = 0; i < ankA.rolle.length; i++) if (ankA.rolle[i] === 1 && (p < 0 || Math.abs(ankA.u[i]! - 0.5) < Math.abs(ankA.u[p]! - 0.5))) p = i;
    const fressen = [{ punkt: p, d: [0, -0.03, 0] as [number, number, number], anker: ankerVon(ankA, p)! }];
    const ohne = wesenBauen(b, plan(b), null);
    const mit = wesenBauen({ ...b, posen: b.posen.map((q) => (q.id === 'fressen' ? { ...q, form: fressen, formAlt: 'nachKnochen' as const } : q)) }, plan(b), ohne.stand);
    const ankB = mit.netz.anker!;
    expect(ankB.rolle.length).not.toBe(ankA.rolle.length);
    const xa = ohne.netz.treffer!.kaefig.xyz;
    const xb = mit.netz.treffer!.kaefig.xyz;
    let best = -1;
    let dMax = 0;
    for (let i = 0; i < xa.length / 3; i++) {
      const d = xb[3 * i + 1]! - xa[3 * i + 1]!;
      if (-d > dMax && ankB.rolle[i] !== 2) {
        dMax = -d;
        best = i;
      }
    }
    expect(dMax).toBeCloseTo(0.03, 4);
    // an der Unterlippe beim selben Anteil (± halber Ankerabstand); ohne Umhängen läge die Beule woanders
    const us = Array.from(ankB.rolle)
      .map((r, i) => (r === 1 ? ankB.u[i]! : NaN))
      .filter((x) => !Number.isNaN(x))
      .sort((x, y) => x - y);
    let abstand = Infinity;
    for (let i = 1; i < us.length; i++) abstand = Math.min(abstand, us[i]! - us[i - 1]!);
    expect(ankB.rolle[best]).toBe(1);
    expect(Math.abs(ankB.u[best]! - fressen[0]!.anker.u)).toBeLessThanOrEqual(0.5 * abstand + 1e-6);
  });
});
