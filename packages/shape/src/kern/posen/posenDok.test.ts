// Posen B3 (Plan Teil B): Posen eines Dokuments mit Gewichten. Migration exakt, Knochen je Pose, Pinsel in der Pose
// (posierte Zuwächse → Ruhe-Deltas) als Rundweg, Bezugs-Käfig, ohne Maul nur Deltas.
import { describe, expect, it } from 'vitest';
import { type KaefigDelta, type Pose, standardPosen } from '../../dokument';
import { MAUL_STANDARD, type MaulErgebnis, ableitenMitMaul, kieferGewichteSetzen, maulOptionenVorlage } from '../maul';
import { maulLinieAusDokument } from '../maulDokument';
import { kugelMaulDokument } from '../pruefstand';
import { maulLageBei } from '../wesen';
import { deltaFeld } from './auswerten';
import { maulLageRuhe } from './lage';
import { bezugAus, formAusFeld, posenAuswerten, posenFuerBau } from './posen';

const OPT = { ...MAUL_STANDARD, ...maulOptionenVorlage('vorn'), haps: 0.7 };
function maulAbl(art: 'gleich' | 'ueberbiss'): MaulErgebnis {
  const dok = kugelMaulDokument(art);
  const abl = ableitenMitMaul(dok, maulLinieAusDokument(dok)!, { stufen: 2 }, OPT);
  abl.maul.opt = OPT;
  kieferGewichteSetzen(abl.maul, OPT);
  return abl;
}
const maxAbstand = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]! - b[i]!));
  return m;
};
const lippenDeltas = (abl: MaulErgebnis): KaefigDelta[] => {
  const out: KaefigDelta[] = [];
  for (let p = 0; p < abl.kaefig.n; p++) if (abl.kaefig.xyz[3 * p + 2]! >= 0 && (abl.maul.art[p]! > 0 || p % 11 === 0)) out.push({ punkt: p, d: [0.003 * Math.sin(p), -0.004, 0.001 * Math.cos(p)] });
  return out;
};
const mit = (posen: Pose[], id: string, p: Partial<Pose>): Pose[] => posen.map((q) => (q.id === id ? { ...q, ...p } : q));

describe('Posen B3: Dokument-Posen mit Gewichten', () => {
  for (const art of ['gleich', 'ueberbiss'] as const) {
    it(`${art}: migrierte Fressen-Pose (alte Deltas nach den Knochen, Stellung und Haps aus den Maul-Optionen) = heutige Pose bei 100 %, B2-Ruhe bei 50 %`, () => {
      const abl = maulAbl(art);
      const alt = lippenDeltas(abl);
      const posen = posenFuerBau(mit(standardPosen(), 'fressen', { form: alt, formAlt: 'nachKnochen' }), null, abl.vorlage.kaefig.n, OPT);
      expect(maxAbstand(posenAuswerten(abl, abl, OPT, posen, { fressen: 1 }).xyz, maulLageBei(abl, 1, alt).xyz)).toBeLessThan(1e-9);
      expect(maxAbstand(posenAuswerten(abl, abl, OPT, posen, { fressen: 0.5 }).xyz, maulLageRuhe(abl, 0.5, alt).xyz)).toBeLessThan(1e-12);
      // keine Gewichte: der Ruhe-Käfig selbst
      expect(posenAuswerten(abl, abl, OPT, posen, {}).xyz).toBe(abl.kaefig.xyz);
    });
  }

  it('Knochen je Pose: Idle mit eigener Kieferstellung öffnet, Fressen mit eigener Stellung weiter; Idle ohne alles = Ruhe', () => {
    const abl = maulAbl('ueberbiss');
    const A = abl.kaefig.xyz;
    let posen = posenFuerBau(standardPosen(), null, abl.vorlage.kaefig.n, OPT);
    expect(maxAbstand(posenAuswerten(abl, abl, OPT, posen, { idle: 1 }).xyz, A)).toBe(0);
    posen = mit(posen, 'idle', { stellung: { kiefer: { winkel: 8 } } });
    const idle = posenAuswerten(abl, abl, OPT, posen, { idle: 1 }).xyz;
    expect(maxAbstand(idle, A)).toBeGreaterThan(1e-3);
    const fressenStandard = posenAuswerten(abl, abl, OPT, posen, { fressen: 1 }).xyz;
    const weiter = posenAuswerten(abl, abl, OPT, mit(posen, 'fressen', { stellung: { kiefer: { winkel: OPT.winkelUnten + 15 }, schaedel: { winkel: OPT.winkelOben } } }), { fressen: 1 }).xyz;
    expect(maxAbstand(weiter, fressenStandard)).toBeGreaterThan(1e-3);
    // Stellung und Form der einen Pose ändern die andere nicht
    expect(maxAbstand(posenAuswerten(abl, abl, OPT, mit(posen, 'fressen', { form: lippenDeltas(abl) }), { idle: 1 }).xyz, idle)).toBe(0);
  });

  it('Pinsel in der Pose: posierter Zuwachs ΔX → Ruhe-Delta Rᵀ·ΔX; danach trägt die Pose genau X + ΔX (Rundweg)', () => {
    const abl = maulAbl('gleich');
    const n = abl.kaefig.n;
    const posen = posenFuerBau(mit(standardPosen(), 'fressen', { form: lippenDeltas(abl), formAlt: 'nachKnochen' }), null, abl.vorlage.kaefig.n, OPT);
    const vor = posenAuswerten(abl, abl, OPT, posen, { fressen: 1 });
    const b = vor.bearbeitung!;
    expect(b.id).toBe('fressen');
    // Zuwachs an allen Punkten der rechten Hälfte (posiert), gespiegelt für die linke
    const dX = new Float64Array(3 * n);
    const form = new Float64Array(b.form);
    for (let i = 0; i < n; i++) {
      if (b.ruhe[3 * i + 2]! < -1e-9) continue;
      const d = [0.002 * Math.cos(i), 0.003, Math.abs(b.ruhe[3 * i + 2]!) < 1e-9 ? 0 : 0.001];
      dX.set(d, 3 * i);
      const c = b.dreh[2 * i]!;
      const s = b.dreh[2 * i + 1]!;
      form[3 * i] = form[3 * i]! + c * d[0]! + s * d[1]!;
      form[3 * i + 1] = form[3 * i + 1]! - s * d[0]! + c * d[1]!;
      form[3 * i + 2] = form[3 * i + 2]! + d[2]!;
    }
    const neu = mit(posen, 'fressen', { form: formAusFeld(b.ruhe, n, form), bezug: bezugAus(b.ruhe) });
    delete (neu.find((q) => q.id === 'fressen') as Pose).formAlt;
    const nach = posenAuswerten(abl, abl, OPT, neu, { fressen: 1 }).xyz;
    const soll = new Float64Array(vor.xyz);
    const voll = deltaFeld(formAusFeld(b.ruhe, n, dX), b.ruhe, n);
    for (let k = 0; k < soll.length; k++) soll[k] = soll[k]! + voll[k]!;
    // die Drehung je Punkt ist Float32 (≈ 1e-7 relativ), der Bezug auf 1e-6 gerundet
    expect(maxAbstand(nach, soll)).toBeLessThan(2e-6);
  });

  it('Bezug = aktuelle Grundform: Übertrag ändert nichts; ohne Maul gilt X = A + w·D', () => {
    const abl = maulAbl('ueberbiss');
    const n = abl.kaefig.n;
    const form = lippenDeltas(abl);
    const ohneBezug = posenFuerBau(mit(standardPosen(), 'idle', { form }), null, abl.vorlage.kaefig.n, OPT);
    const mitBezug = posenFuerBau(mit(standardPosen(), 'idle', { form, bezug: Array.from(abl.kaefig.xyz) }), null, abl.vorlage.kaefig.n, OPT);
    expect(maxAbstand(posenAuswerten(abl, abl, OPT, mitBezug, { idle: 1 }).xyz, posenAuswerten(abl, abl, OPT, ohneBezug, { idle: 1 }).xyz)).toBeLessThan(1e-12);
    const r = posenAuswerten(abl, null, null, ohneBezug, { idle: 0.5 }).xyz;
    const soll = new Float64Array(abl.kaefig.xyz);
    const D = deltaFeld(form, abl.kaefig.xyz, n);
    for (let k = 0; k < soll.length; k++) soll[k] = soll[k]! + 0.5 * D[k]!;
    expect(maxAbstand(r, soll)).toBeLessThan(1e-15);
  });
});
