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
import { maulLageBei } from '../wesen';
import { fressenRuheDeltas, maulLageRuhe } from './lage';
import { deltasUebertragen, umgebung } from './uebertrag';
import { fressenDeltasInRuhe, hapsSaat } from './saat';
import { STELLUNG_NULL, knochenPunkte, skinAnwenden, skinBerechnen, skinUmkehren, stellungAus, stellungMischen } from './skin';

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
  it('maulLageRuhe: bei 1 gleich maulLageBei (Haps + Deltas), bei 0 die Ruhe selbst', () => {
    const abl = maulAbl(kugelMaulDokument('gleich'), { haps: 1 });
    const n = abl.kaefig.n;
    const alt: KaefigDelta[] = [];
    for (let p = 0; p < n; p++) if (abl.kaefig.xyz[3 * p + 2]! >= 0 && abl.maul.art[p]! > 0) alt.push({ punkt: p, d: [0.002, -0.006, 0.001] });
    expect(maxAbstand(maulLageRuhe(abl, 1, alt).fein, maulLageBei(abl, 1, alt).fein)).toBeLessThan(1e-9);
    expect(maulLageRuhe(abl, 0, alt).xyz).toBe(abl.kaefig.xyz);
  });

  it('alle Gewichte 0 → der Ruhe-Käfig selbst (dasselbe Feld)', () => {
    const abl = FAELLE[0]![1]();
    const ruhe = new Float64Array(abl.kaefig.xyz);
    const d = new Float64Array(ruhe.length).fill(0.01);
    expect(poseAuswerten(ruhe, [{ w: 0, deltas: d, stellung: stellungAus(abl.maul.opt) }], () => null)).toBe(ruhe);
  });

  for (const art of ['ueberbiss', 'gleich'] as const) it(`Haps als Saat + alte Fressen-Deltas in Ruhe = heutige volle Fressen-Pose (${art}, ≤ 1e-9)`, () => {
    const abl = maulAbl(kugelMaulDokument(art), { haps: 0.8 });
    const n = abl.kaefig.n;
    const theta = stellungAus(abl.maul.opt);
    // heutige Fressen-Pose: Knochen + Haps, danach die alten Deltas (Faktor 1 = volle Öffnung)
    const alt: KaefigDelta[] = [];
    // jeder 13. Punkt und alle Lippen- und Taschenpunkte (bei Kiefer gleich liegen Ober- und Unterlippe aufeinander)
    for (let p = 0; p < n; p++) if (abl.kaefig.xyz[3 * p + 2]! >= 0 && (p % 13 === 0 || abl.maul.art[p]! > 0)) alt.push({ punkt: p, d: [0.004 * Math.sin(p), 0.003 * Math.cos(p), 0.002] });
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

describe('Posen B3b: Knochen in 3D (Gieren, Rollen, Seite)', () => {
  const abl = maulAbl(kugelMaulDokument('ueberbiss'));
  abl.maul.opt = { ...abl.maul.opt, haps: 0 };
  const n = abl.kaefig.n;
  const A = abl.kaefig.xyz;
  const sp = spiegelIndex(A, n);
  const st3 = { ...stellungAus(abl.maul.opt), gierenUnten: 9, rollenUnten: -12, seitUnten: 0.06, gierenOben: -4, rollenOben: 15 };
  it('jede Transformation ist eine Drehung (RᵀR = 1, det = 1) und exakt umkehrbar', () => {
    const sk = skinBerechnen(abl, abl.maul.opt, st3);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const R = sk.r.subarray(9 * i, 9 * i + 9);
      for (let a = 0; a < 3; a++)
        for (let b = 0; b < 3; b++) {
          let d = 0;
          for (let k = 0; k < 3; k++) d += R[3 * k + a]! * R[3 * k + b]!;
          m = Math.max(m, Math.abs(d - (a === b ? 1 : 0)));
        }
      const det = R[0]! * (R[4]! * R[8]! - R[5]! * R[7]!) - R[1]! * (R[3]! * R[8]! - R[5]! * R[6]!) + R[2]! * (R[3]! * R[7]! - R[4]! * R[6]!);
      m = Math.max(m, Math.abs(det - 1));
    }
    expect(m).toBeLessThan(1e-12);
    expect(maxAbstand(skinUmkehren(sk, skinAnwenden(sk, A)), A)).toBeLessThan(1e-12);
  });
  const spiegelFehler = (X: ArrayLike<number>) => {
    let m = 0;
    for (let p = 0; p < n; p++) {
      const q = sp[p]!;
      if (q < 0 || q === p) continue;
      m = Math.max(m, Math.abs(X[3 * p]! - X[3 * q]!), Math.abs(X[3 * p + 1]! - X[3 * q + 1]!), Math.abs(X[3 * p + 2]! + X[3 * q + 2]!));
    }
    return m;
  };
  it('eben bleibt die Pose spiegelgleich; Rollen und Gieren machen sie asymmetrisch', () => {
    const eben = skinAnwenden(skinBerechnen(abl, abl.maul.opt, stellungAus(abl.maul.opt)), A);
    expect(spiegelFehler(eben)).toBeLessThan(1e-12);
    const schief = skinAnwenden(skinBerechnen(abl, abl.maul.opt, { ...stellungAus(abl.maul.opt), rollenOben: 15 }), A);
    expect(spiegelFehler(schief)).toBeGreaterThan(1e-3);
  });
  it('reines Rollen lässt die Knochenachse stehen (Spitze und Gelenk), Gieren schwenkt die Spitze nach +z', () => {
    const ruhe = knochenPunkte(abl, abl.maul.opt, STELLUNG_NULL);
    const roll = knochenPunkte(abl, abl.maul.opt, { ...STELLUNG_NULL, rollenUnten: 25, rollenOben: -30 });
    expect(maxAbstand(roll.kieferSpitze, ruhe.kieferSpitze)).toBeLessThan(1e-12);
    expect(maxAbstand(roll.schaedelSpitze, ruhe.schaedelSpitze)).toBeLessThan(1e-12);
    expect(maxAbstand(roll.kieferRolle, ruhe.kieferRolle)).toBeGreaterThan(1e-3);
    const gier = knochenPunkte(abl, abl.maul.opt, { ...STELLUNG_NULL, gierenUnten: 20 });
    expect(gier.kieferSpitze[2]).toBeGreaterThan(1e-3);
    // seitlicher Versatz: Basis und Spitze wandern gleich weit nach +z
    const seit = knochenPunkte(abl, abl.maul.opt, { ...STELLUNG_NULL, seitUnten: 0.1 });
    expect(seit.kieferBasis[2]).toBeCloseTo(0.1 * abl.maul.laenge, 12);
    expect(seit.kieferSpitze[2]).toBeCloseTo(0.1 * abl.maul.laenge, 12);
  });
  it('gemischte Stellung ist linear in allen Werten', () => {
    const m = stellungMischen([{ w: 0.25, stellung: st3 }, { w: 0.5, stellung: { ...STELLUNG_NULL, kieferZug: [0, 0], rollenOben: 8 } }]);
    expect(m.rollenOben).toBeCloseTo(0.25 * 15 + 0.5 * 8, 12);
    expect(m.gierenUnten).toBeCloseTo(0.25 * 9, 12);
    expect(m.seitUnten).toBeCloseTo(0.25 * 0.06, 12);
  });
});

describe('Spiegel bei aufeinanderliegenden Punkten', () => {
  it('Kiefer gleich: jeder Spiegelpartner hat dieselbe Art und dieselben Kiefergewichte', () => {
    const abl = maulAbl(kugelMaulDokument('gleich'));
    const n = abl.kaefig.n;
    const sp = spiegelIndex(abl.kaefig.xyz, n);
    let doppelt = 0;
    const lagen = new Set<string>();
    for (let p = 0; p < n; p++) {
      const k = `${abl.kaefig.xyz[3 * p]!.toFixed(9)}:${abl.kaefig.xyz[3 * p + 1]!.toFixed(9)}:${abl.kaefig.xyz[3 * p + 2]!.toFixed(9)}`;
      if (lagen.has(k)) doppelt++;
      lagen.add(k);
      const q = sp[p]!;
      expect(q).toBeGreaterThanOrEqual(0);
      expect(abl.maul.art[q]).toBe(abl.maul.art[p]);
      expect(abl.maul.gewichtUnten[q]).toBeCloseTo(abl.maul.gewichtUnten[p]!, 12);
    }
    expect(doppelt).toBeGreaterThan(0);
  });
});

describe('Posen B2: Übertrag aus der Umgebung (K6)', () => {
  const abl = maulAbl(kugelMaulDokument('ueberbiss'), { haps: 1 });
  const n = abl.kaefig.n;
  const A = new Float64Array(abl.kaefig.xyz);
  const D = fressenRuheDeltas(abl, []);
  const u = umgebung(A, n);
  it('gleicher Käfig → dieselben Deltas', () => {
    expect(maxAbstand(deltasUebertragen(u, A, A, D), D)).toBeLessThan(1e-12);
  });
  it('Drehung um 40° mit Größe 1,3 und Versatz → exakt mitgedreht und gestreckt', () => {
    const c = Math.cos(0.7);
    const s = Math.sin(0.7);
    const T = (p: number[]) => [1.3 * (c * p[0]! - s * p[1]!) + 0.2, 1.3 * (s * p[0]! + c * p[1]!) - 0.1, 1.3 * p[2]!];
    const A2 = new Float64Array(3 * n);
    const soll = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      A2.set(T([A[3 * i]!, A[3 * i + 1]!, A[3 * i + 2]!]), 3 * i);
      soll.set([1.3 * (c * D[3 * i]! - s * D[3 * i + 1]!), 1.3 * (s * D[3 * i]! + c * D[3 * i + 1]!), 1.3 * D[3 * i + 2]!], 3 * i);
    }
    let dMax = 0;
    for (let k = 0; k < D.length; k++) dMax = Math.max(dMax, Math.abs(D[k]!));
    expect(maxAbstand(deltasUebertragen(u, A, A2, D), soll)).toBeLessThan(1e-5 * dMax);
  });
  it('spiegeltreu: gespiegelte Punkte bekommen gespiegelte Deltas', () => {
    const A2 = Float64Array.from(A, (x, k) => (k % 3 === 1 ? x + 0.3 * x * x : x));
    const D2 = deltasUebertragen(u, A, A2, D);
    const sp = spiegelIndex(A, n);
    let m = 0;
    for (let p = 0; p < n; p++) {
      const q = sp[p]!;
      if (q < 0 || q === p) continue;
      m = Math.max(m, Math.abs(D2[3 * p]! - D2[3 * q]!), Math.abs(D2[3 * p + 1]! - D2[3 * q + 1]!), Math.abs(D2[3 * p + 2]! + D2[3 * q + 2]!));
    }
    expect(m).toBeLessThan(1e-9);
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
