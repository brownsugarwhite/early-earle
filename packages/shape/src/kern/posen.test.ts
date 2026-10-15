// Posenliste (Plan 5.2 „Weitere Posen funktionieren identisch“, Phase 2 M3): Käfig-Deltas einer Pose mit der Stärke
// überblendet, ohne Umbau; Fressen läuft weiter über die Öffnung.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { wesenBauen } from './wesen';

describe('Posenliste', () => {
  it('Pose „ruhen“: Deltas mit der Stärke überblendet, Stärke 0 = Grundform, kein Umbau', () => {
    const roh = neuesDokument('kugel');
    // ein Ringpunkt auf der rechten Seite (Ring 12, j 4) um 0,05 nach oben
    const punkt = 12 * 16 + 4;
    const dok = { ...roh, kaefig: { deltas: [], posen: { ruhen: [{ punkt, d: [0, 0.05, 0] as [number, number, number] }] } } };
    const plan = { maul: 'aus' as const, oeffnung: 0, earle: false };
    const a = wesenBauen(dok, plan, null);
    const xyz0 = a.netz.treffer!.kaefig.xyz;
    const halb = wesenBauen(dok, { ...plan, pose: { name: 'ruhen', staerke: 0.5 } }, a.stand);
    expect(halb.netz.info.ableitung).toBe(0);
    const xyz1 = halb.netz.treffer!.kaefig.xyz;
    expect(xyz1[3 * punkt + 1]! - xyz0[3 * punkt + 1]!).toBeCloseTo(0.025, 6);
    const null0 = wesenBauen(dok, { ...plan, pose: { name: 'ruhen', staerke: 0 } }, halb.stand);
    let d = 0;
    for (let i = 0; i < a.netz.positionen.length; i++) d = Math.max(d, Math.abs(null0.netz.positionen[i]! - a.netz.positionen[i]!));
    expect(d).toBeLessThan(1e-9);
    // andere Pose ohne Deltas: Grundform
    const andere = wesenBauen(dok, { ...plan, pose: { name: 'laufen', staerke: 1 } }, null0.stand);
    let d2 = 0;
    for (let i = 0; i < a.netz.positionen.length; i++) d2 = Math.max(d2, Math.abs(andere.netz.positionen[i]! - a.netz.positionen[i]!));
    expect(d2).toBeLessThan(1e-9);
  });

  it('Fressen-Pose ohne Schlitzmaul (Florian 15.10.): Kugel und Fisch mit Rundmaul — die Deltas wirken mit der Öffnung, zu = Grundform, kein Umbau', () => {
    const roh = neuesDokument('kugel');
    const punkt = 12 * 16 + 4;
    const fressen = [{ punkt, d: [0, 0.05, 0] as [number, number, number] }];
    for (const [name, extra] of [
      ['Kugel', {}],
      ['Fisch (Rundmaul)', { rundmaul: {} }],
    ] as const) {
      const dok = { ...roh, kaefig: { deltas: [], posen: { fressen } } };
      const plan = { maul: 'aus' as const, oeffnung: 0, earle: true, ...extra };
      const zu = wesenBauen(dok, plan, null);
      const offen = wesenBauen(dok, { ...plan, oeffnung: 1 }, zu.stand);
      const halb = wesenBauen(dok, { ...plan, oeffnung: 0.5 }, offen.stand);
      expect(offen.netz.info.ableitung, name).toBe(0);
      const y = (n: typeof zu) => n.netz.treffer!.kaefig.xyz[3 * punkt + 1]!;
      expect(y(offen) - y(zu), name).toBeCloseTo(0.05, 6);
      expect(y(halb) - y(zu), name).toBeCloseTo(0.025, 6);
      // das gezeichnete Netz folgt (der Punkt liegt weit hinter dem Rundmaul)
      let d = 0;
      for (let i = 0; i < Math.min(zu.netz.positionen.length, offen.netz.positionen.length); i++) d = Math.max(d, Math.abs(offen.netz.positionen[i]! - zu.netz.positionen[i]!));
      expect(d, name).toBeGreaterThan(0.01);
      // ohne Fressen-Deltas bleibt die Kugel offen wie zu
      if (name === 'Kugel') {
        const ohne = wesenBauen({ ...roh, kaefig: { deltas: [] } }, { ...plan, oeffnung: 1 }, null);
        let d0 = 0;
        for (let i = 0; i < zu.netz.positionen.length; i++) d0 = Math.max(d0, Math.abs(ohne.netz.positionen[i]! - zu.netz.positionen[i]!));
        expect(d0).toBeLessThan(1e-9);
      }
    }
  }, 60_000);
});
