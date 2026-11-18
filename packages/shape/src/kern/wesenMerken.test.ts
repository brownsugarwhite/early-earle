// B7: Ein reiner Gewichtswechsel (Vorschau, Überblenden, Abspielen) nimmt die Werte der Ruhelage aus dem Stand (Naht, Δ je
// Blatt, Lippenabweichung, Ruhe je Ecke, Deskriptoren) und die Zusatz-Umrisse. Das Netz muss bitgleich zu einem frischen
// Bau sein; eine Änderung der Grundform (Pinsel) oder der Posen rechnet neu.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import { koerperDokument } from './pruefen/koerper';
import { zufall } from './pruefen/zufall';
import { type Bauplan, type WesenNetz, pruefwesenBauplan, wesenBauen } from './wesen';

const gleich = (a: ArrayLike<number> | null | undefined, b: ArrayLike<number> | null | undefined) => {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  // Object.is: der Saum trennt Züge mit NaN
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
};

function vergleiche(a: WesenNetz, b: WesenNetz): void {
  expect(gleich(a.positionen, b.positionen)).toBe(true);
  expect(gleich(a.normalen, b.normalen)).toBe(true);
  expect(gleich(a.deskriptoren, b.deskriptoren)).toBe(true);
  expect(gleich(a.ruhe, b.ruhe)).toBe(true);
  expect(a.info.nahtMax).toBe(b.info.nahtMax);
  expect(JSON.stringify(a.info.blatt)).toBe(JSON.stringify(b.info.blatt));
  expect(JSON.stringify(a.info.maul ?? null)).toBe(JSON.stringify(b.info.maul ?? null));
  for (const k of ['seite', 'front', 'top'] as const) expect(gleich(a.saum?.[k], b.saum?.[k])).toBe(true);
}

const FAELLE: [string, () => Dokument, Partial<Bauplan>][] = [
  ['Rex mit Maul', () => koerperDokument('rex', zufall(1)), { maul: 'vorn' }],
  ['Kugel ohne Maul', () => koerperDokument('kugel', zufall(1)), { maul: 'aus' }],
  ['Tiger (Wangen, Kasten, Zonen)', () => ({ ...koerperDokument('kasten', zufall(1)), name: 'tiger' }), { ...pruefwesenBauplan('tiger') }],
];

describe('B7: Werte der Ruhelage gemerkt', () => {
  for (const [name, dokVon, plan] of FAELLE) {
    it(`${name}: Gewichtswechsel aus dem Stand = frischer Bau (bitgleich)`, () => {
      const dok = dokVon();
      const g = { fressen: 0.5 };
      const frisch = wesenBauen(dok, { ...plan, gewichte: g }, null, false).netz;
      const erst = wesenBauen(dok, { ...plan, gewichte: {} }, null, false);
      expect(erst.stand.ruheWerte).toBeDefined();
      const aus = wesenBauen(dok, { ...plan, gewichte: g }, erst.stand, false);
      vergleiche(aus.netz, frisch);
      // der Stand behält dieselben Ruhewerte (kein Neurechnen)
      expect(aus.stand.ruheWerte).toBe(erst.stand.ruheWerte);
    }, 120_000);
  }

  it('Pinsel der Grundform rechnet die Ruhewerte neu (Δ und Saum folgen)', () => {
    const dok = koerperDokument('kugel', zufall(1));
    const erst = wesenBauen(dok, { maul: 'aus', gewichte: {} }, null, false);
    const n0 = erst.stand.abl.vorlage.kaefig.n;
    const xyz = erst.stand.abl.kaefig.xyz;
    let p = 0;
    for (let i = 0; i < n0; i++) if (xyz[3 * i + 2]! > 0.05 && xyz[3 * i + 1]! > xyz[3 * p + 1]!) p = i;
    const mitPinsel: Dokument = { ...dok, kaefig: { ...(dok.kaefig ?? { deltas: [] }), deltas: [{ punkt: p, d: [0, 0.05, 0] }] } };
    const aus = wesenBauen(mitPinsel, { maul: 'aus', gewichte: {} }, erst.stand, false);
    const frisch = wesenBauen(mitPinsel, { maul: 'aus', gewichte: {} }, null, false).netz;
    expect(aus.stand.ruheWerte).not.toBe(erst.stand.ruheWerte);
    vergleiche(aus.netz, frisch);
  }, 120_000);

  it('Zusatz-Umrisse: gemerkt bei anderen Gewichten, neu bei geänderter Pose', () => {
    const dok = koerperDokument('rex', zufall(1));
    const umrisse = [{ id: 'geist', gewichte: { fressen: 1 } }];
    const a = wesenBauen(dok, { maul: 'vorn', gewichte: {}, umrisse }, null, false);
    expect(a.netz.umrisse?.length).toBe(1);
    expect(a.netz.umrisse![0]!.seite.length).toBeGreaterThan(20);
    const b = wesenBauen(dok, { maul: 'vorn', gewichte: { idle: 0.4 }, umrisse }, a.stand, false);
    expect(b.netz.umrisse).toBe(a.netz.umrisse);
    // Fressen mit eigener Stellung (Kiefer weiter auf): der Geist ändert sich
    const dok2: Dokument = { ...dok, posen: dok.posen.map((q) => (q.id === 'fressen' ? { ...q, stellung: { kiefer: { winkel: 45 }, schaedel: { winkel: 10 } } } : q)) };
    const c = wesenBauen(dok2, { maul: 'vorn', gewichte: {}, umrisse }, b.stand, false);
    expect(c.netz.umrisse).not.toBe(a.netz.umrisse);
    expect(gleich(c.netz.umrisse![0]!.seite, a.netz.umrisse![0]!.seite)).toBe(false);
    // derselbe Umriss wie ein frischer Bau
    const frisch = wesenBauen(dok2, { maul: 'vorn', gewichte: {}, umrisse }, null, false);
    expect(gleich(c.netz.umrisse![0]!.seite, frisch.netz.umrisse![0]!.seite)).toBe(true);
    expect(gleich(c.netz.umrisse![0]!.front, frisch.netz.umrisse![0]!.front)).toBe(true);
  }, 120_000);
});
