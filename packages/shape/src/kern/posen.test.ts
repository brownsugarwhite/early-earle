// Posenliste (Plan 5.2 „Weitere Posen funktionieren identisch“; B3: Dokument v2 mit Posen, Bauplan mit Gewichten): die
// Ruhe-Deltas einer Pose mit ihrem Gewicht überblendet, ohne Umbau.
import { describe, expect, it } from 'vitest';
import { type Dokument, type KaefigDelta, neuesDokument } from '../dokument';
import { wesenBauen } from './wesen';

const mitForm = (dok: Dokument, id: string, form: KaefigDelta[]): Dokument => ({
  ...dok,
  posen: dok.posen.some((p) => p.id === id) ? dok.posen.map((p) => (p.id === id ? { ...p, form } : p)) : [...dok.posen, { id, name: id, art: 'frei', form }],
});

describe('Posenliste', () => {
  it('Pose „ruhen“: Deltas mit der Stärke überblendet, Stärke 0 = Grundform, kein Umbau', () => {
    const roh = neuesDokument('kugel');
    // ein Ringpunkt auf der rechten Seite (Ring 12, j 4) um 0,05 nach oben
    const punkt = 12 * 16 + 4;
    const dok = mitForm(roh, 'ruhen', [{ punkt, d: [0, 0.05, 0] }]);
    const plan = { maul: 'aus' as const, gewichte: {}, earle: false };
    const a = wesenBauen(dok, plan, null);
    const xyz0 = a.netz.treffer!.kaefig.xyz;
    const halb = wesenBauen(dok, { ...plan, gewichte: { ruhen: 0.5 } }, a.stand);
    expect(halb.netz.info.ableitung).toBe(0);
    const xyz1 = halb.netz.treffer!.kaefig.xyz;
    expect(xyz1[3 * punkt + 1]! - xyz0[3 * punkt + 1]!).toBeCloseTo(0.025, 6);
    const null0 = wesenBauen(dok, { ...plan, gewichte: { ruhen: 0 } }, halb.stand);
    let d = 0;
    for (let i = 0; i < a.netz.positionen.length; i++) d = Math.max(d, Math.abs(null0.netz.positionen[i]! - a.netz.positionen[i]!));
    expect(d).toBeLessThan(1e-9);
    // andere Pose ohne Deltas (Idle): Grundform
    const andere = wesenBauen(dok, { ...plan, gewichte: { idle: 1 } }, null0.stand);
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
      const dok = mitForm(roh, 'fressen', fressen);
      const plan = { maul: 'aus' as const, gewichte: {}, earle: true, ...extra };
      const zu = wesenBauen(dok, plan, null);
      const offen = wesenBauen(dok, { ...plan, gewichte: { fressen: 1 } }, zu.stand);
      const halb = wesenBauen(dok, { ...plan, gewichte: { fressen: 0.5 } }, offen.stand);
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
        const ohne = wesenBauen(roh, { ...plan, gewichte: { fressen: 1 } }, null);
        let d0 = 0;
        for (let i = 0; i < zu.netz.positionen.length; i++) d0 = Math.max(d0, Math.abs(ohne.netz.positionen[i]! - zu.netz.positionen[i]!));
        expect(d0).toBeLessThan(1e-9);
      }
    }
  }, 60_000);
});
