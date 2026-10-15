// Posen B2 (Plan Teil B): Die neue Knochenrechnung muss die heutige Kieferpose exakt nachbilden, umkehrbar sein und
// alte Fressen-Deltas ohne Formänderung übernehmen — sonst würde die Umstellung Florians Posen verändern.
import { describe, expect, it } from 'vitest';
import type { Dokument, KaefigDelta } from '../../dokument';
import { type MaulErgebnis, ableitenMitMaul, maulOptionenVorlage, maulPose } from '../maul';
import { maulLinieAusDokument } from '../maulDokument';
import { deltasAddieren, spiegelIndex } from '../pinsel';
import { kugelMaulDokument } from '../pruefstand';
import { deltaFeld, poseAuswerten } from './auswerten';
import { ausBasis, inBasis, zellbasis } from './rahmen';
import { fressenDeltasInRuhe, hapsSaat } from './saat';
import { skinAnwenden, skinBerechnen, skinUmkehren, stellungAus, stellungMischen } from './skin';

function maulAbl(dok: Dokument, opt: Record<string, unknown> = {}): MaulErgebnis {
  const linie = maulLinieAusDokument(dok)!;
  return ableitenMitMaul(dok, linie, { stufen: 2 }, { ...maulOptionenVorlage('vorn'), ...opt });
}

const maxAbstand = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]! - b[i]!));
  return m;
};

const FAELLE: [string, () => MaulErgebnis][] = [
  ['Kugel gleich', () => maulAbl(kugelMaulDokument('gleich'))],
  ['Kugel Überbiss', () => maulAbl(kugelMaulDokument('ueberbiss'))],
  ['Kugel Unterbiss mit Kieferzug', () => maulAbl(kugelMaulDokument('unterbiss'), { kieferZug: [0.12, -0.06] })],
  ['Kugel ziehen', () => maulAbl(kugelMaulDokument('gleich'), { oeffnungsart: 'ziehen', zugWeite: 0.7 })],
];

describe('Posen B2: Skin', () => {
  for (const [name, bau] of FAELLE) {
    it(`${name}: Skin der Stellung w·θ = maulPose(w) ohne Haps (≤ 1e-12), Umkehrung exakt`, () => {
      const abl = bau();
      abl.maul.opt = { ...abl.maul.opt, haps: 0 };
      const theta = stellungAus(abl.maul.opt);
      for (const w of [0.3, 0.7, 1]) {
        const sk = skinBerechnen(abl, abl.maul.opt, stellungMischen([{ w, stellung: theta }]));
        const neu = skinAnwenden(sk, abl.kaefig.xyz);
        const alt = maulPose(abl, w).xyz;
        expect(maxAbstand(neu, alt)).toBeLessThan(1e-12);
        expect(maxAbstand(skinUmkehren(sk, neu), abl.kaefig.xyz)).toBeLessThan(1e-12);
      }
    });
  }
});

describe('Posen B2: Auswertung', () => {
  it('alle Gewichte 0 → der Ruhe-Käfig selbst (dasselbe Feld)', () => {
    const abl = FAELLE[0]![1]();
    const ruhe = new Float64Array(abl.kaefig.xyz);
    const d = new Float64Array(ruhe.length).fill(0.01);
    expect(poseAuswerten(ruhe, [{ w: 0, deltas: d, stellung: stellungAus(abl.maul.opt) }], () => null)).toBe(ruhe);
  });

  it('Haps als Saat + alte Fressen-Deltas in Ruhe = heutige volle Fressen-Pose (≤ 1e-9)', () => {
    const abl = maulAbl(kugelMaulDokument('ueberbiss'), { haps: 0.8 });
    const n = abl.kaefig.n;
    const theta = stellungAus(abl.maul.opt);
    // heutige Fressen-Pose: Knochen + Haps, danach die alten Deltas (Faktor 1 = volle Öffnung)
    const alt: KaefigDelta[] = [];
    for (let p = 0; p < Math.min(n, 300); p += 13) if (abl.kaefig.xyz[3 * p + 2]! >= 0) alt.push({ punkt: p, d: [0.004 * Math.sin(p), 0.003 * Math.cos(p), 0.002] });
    const heute = maulPose(abl, 1).xyz;
    deltasAddieren(heute, spiegelIndex(abl.kaefig.xyz, n), alt, 1);
    // neu: Ruhe + Haps-Saat + umgerechnete Deltas, dann die Knochen
    const sk = skinBerechnen(abl, abl.maul.opt, theta);
    const saat = hapsSaat(abl, sk, abl.maul.opt.haps);
    const benutzer = deltaFeld(fressenDeltasInRuhe(sk, alt), abl.kaefig.xyz, n);
    const summe = new Float64Array(3 * n);
    for (let k = 0; k < summe.length; k++) summe[k] = saat[k]! + benutzer[k]!;
    const neu = poseAuswerten(new Float64Array(abl.kaefig.xyz), [{ w: 1, deltas: summe, stellung: theta }], () => sk);
    expect(maxAbstand(neu, heute)).toBeLessThan(1e-9);
  });
});

describe('Posen B2: Zellbasis', () => {
  it('Welt → Basis → Welt exakt; die Basis streckt mit der Fläche', () => {
    const abl = FAELLE[0]![1]();
    const k = abl.kaefig;
    const z = zellbasis(k.xyz, k.fStart, k.fVerts, k.n);
    let m = 0;
    for (let i = 0; i < k.n; i += 7) {
      const d: [number, number, number] = [0.01, -0.02, 0.005];
      const w = ausBasis(z, i, inBasis(z, i, d));
      m = Math.max(m, Math.abs(w[0] - d[0]), Math.abs(w[1] - d[1]), Math.abs(w[2] - d[2]));
    }
    expect(m).toBeLessThan(1e-12);
    // doppelt so groß: dieselben Koordinaten ergeben den doppelten Versatz
    const gross = Float64Array.from(k.xyz, (x) => 2 * x);
    const z2 = zellbasis(gross, k.fStart, k.fVerts, k.n);
    const c = inBasis(z, 5, [0.01, 0.02, 0.03]);
    const w2 = ausBasis(z2, 5, c);
    expect(Math.hypot(w2[0] - 0.02, w2[1] - 0.04, w2[2] - 0.06)).toBeLessThan(1e-9);
  });
});
