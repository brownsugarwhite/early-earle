// B7 (Plan Teil B, Maße M1/M3): Überblenden zwischen Grundform und Posen und zwischen zwei Posen. Für t = 0 … 1 in Zehnteln:
// M1 das Überblenden bringt keine Durchdringung mit Haut, die nicht schon an einem Ende besteht (gemessen: die Fressen-Pose
// des heutigen Maulbaus hat selbst 2 Paare, der geschlossene Überbiss seine erlaubte verdeckte Überlappung — beides gehört
// zu Teil A); M3 Bahnen der Hautpunkte ohne Umkehr und ohne Knick (Winkel zwischen zwei Schritten). Dazu: die Gewichte
// 1 − t / t treffen bei t = 0 und 1 genau die beiden Enden.
import { describe, expect, it } from 'vitest';
import type { Dokument, Pose } from '../../dokument';
import { anwenden3 } from '../../subdivision/matrix';
import { selbstDurchdringungen } from '../../versuch/pruefen';
import { MAUL_STANDARD, type MaulErgebnis, ableitenMitMaul, kieferGewichteSetzen, maulOptionenVorlage } from '../maul';
import { maulLinieAusDokument } from '../maulDokument';
import { type KugelMaulArt, feinesNetz, kugelMaulDokument, regionen } from '../pruefstand';
import { posenAuswerten, posenFuerBau } from './posen';

declare const console: { log: (...a: unknown[]) => void };

const PX = 461;

/** Kugel mit Maul und einer weiteren Pose „Brüllen“ (Kiefer weiter auf, Schädel gekippt, Kiefer seitlich gegiert). */
function dokMitPosen(art: KugelMaulArt): Dokument {
  const d = kugelMaulDokument(art);
  const bruellen: Pose = { id: 'p_b', name: 'Brüllen', art: 'frei', form: [], stellung: { kiefer: { winkel: 34, gieren: 8 }, schaedel: { winkel: 14 } } };
  return { ...d, posen: [...d.posen, bruellen] };
}

/** Gewichte der Überblendung (wie im Editor: Grundform trägt kein Gewicht). */
function gewichte(von: string, nach: string, t: number): Record<string, number> {
  const g: Record<string, number> = {};
  if (von !== 'editor' && 1 - t > 0) g[von] = (g[von] ?? 0) + 1 - t;
  if (nach !== 'editor' && t > 0) g[nach] = (g[nach] ?? 0) + t;
  return g;
}

const PAARE: [string, string][] = [
  ['editor', 'fressen'],
  ['editor', 'p_b'],
  ['fressen', 'p_b'],
  ['idle', 'fressen'],
];

describe('B7: Überblenden (M1 Durchdringungen, M3 Bahnen)', () => {
  for (const art of ['gleich', 'ueberbiss'] as const) {
    it(`Kugel ${art}: Editor/Idle → Pose und Pose → Pose in Zehnteln`, () => {
      const dok = dokMitPosen(art);
      const linie = maulLinieAusDokument(dok)!;
      const opt = { ...MAUL_STANDARD, ...maulOptionenVorlage('vorn') };
      const abl = ableitenMitMaul(dok, linie, { stufen: 2 }, opt) as MaulErgebnis;
      abl.maul.opt = opt;
      kieferGewichteSetzen(abl.maul, opt);
      const posen = posenFuerBau(dok.posen, null, abl.vorlage.kaefig.n, opt);
      const { flaechen } = feinesNetz(abl);
      const bereiche = regionen(abl, flaechen);
      // Hautpunkte: Ecken von Hautflächen
      const haut = new Set<number>();
      flaechen.forEach((f, i) => {
        if (bereiche[i] === 'haut') for (const p of f) haut.add(p);
      });
      const fein = (g: Record<string, number>) => {
        const r = posenAuswerten(abl, abl, opt, posen, g, dok);
        return r.xyz === abl.kaefig.xyz ? abl.fein : anwenden3(abl.unterteilung.grenze, r.xyz);
      };
      const ergebnisse: { name: string; e0: number; e1: number; umkehr: number; knick: number; enden: number; innen: number }[] = [];
      for (const [von, nach] of PAARE) {
        const bahnen: Float64Array[] = [];
        const paare: number[] = [];
        for (let k = 0; k <= 10; k++) {
          const f = fein(gewichte(von, nach, k / 10));
          bahnen.push(f);
          const pts: [number, number, number][] = [];
          for (let i = 0; i < f.length / 3; i++) pts.push([f[3 * i]!, f[3 * i + 1]!, f[3 * i + 2]!]);
          const d = selbstDurchdringungen({ punkte: pts, flaechen, schaerfe: new Map() }, 1e-4, bereiche);
          let h = 0;
          for (const [b, v] of Object.entries(d.nachBereich)) if (b.includes('haut')) h += v;
          paare.push(h);
        }
        // Enden: t = 0 ist „von“, t = 1 ist „nach“ (bitgleich zur Auswertung mit Gewicht 1 bzw. der Grundform)
        const ende = (id: string) => (id === 'editor' ? abl.fein : fein({ [id]: 1 }));
        let e0 = 0;
        let e1 = 0;
        const a0 = ende(von);
        const a1 = ende(nach);
        for (let i = 0; i < abl.fein.length; i++) {
          e0 = Math.max(e0, Math.abs(bahnen[0]![i]! - a0[i]!));
          e1 = Math.max(e1, Math.abs(bahnen[10]![i]! - a1[i]!));
        }
        // Bahnen: Umkehr (Skalarprodukt zweier Schritte < 0) und größter Knick zwischen Schritten, nur bei Bewegung ≥ 0,25 px je Schritt
        let umkehr = 0;
        let knick = 0;
        let bewegt = 0;
        for (const p of haut) {
          for (let k = 1; k < 10; k++) {
            const a = [0, 1, 2].map((c) => bahnen[k]![3 * p + c]! - bahnen[k - 1]![3 * p + c]!);
            const b = [0, 1, 2].map((c) => bahnen[k + 1]![3 * p + c]! - bahnen[k]![3 * p + c]!);
            const la = Math.hypot(a[0]!, a[1]!, a[2]!);
            const lb = Math.hypot(b[0]!, b[1]!, b[2]!);
            if (la * PX < 0.25 || lb * PX < 0.25) continue;
            bewegt++;
            const c = (a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!) / (la * lb);
            if (c < 0) umkehr++;
            knick = Math.max(knick, (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI);
          }
        }
        const enden = Math.max(paare[0]!, paare[10]!);
        const innen = Math.max(...paare.slice(1, 10));
        console.log(`Kugel ${art} ${von} → ${nach}: Hautpaare je Zehntel ${paare.join(' ')}, Enden ${e0.toExponential(1)}/${e1.toExponential(1)}, Bahnen: ${bewegt} Schritte bewegt, Umkehr ${umkehr}, größter Knick ${knick.toFixed(1)}°`);
        ergebnisse.push({ name: `${von} → ${nach}`, e0, e1, umkehr, knick, enden, innen });
      }
      for (const r of ergebnisse) {
        expect(r.e0, r.name).toBeLessThanOrEqual(1e-12);
        expect(r.e1, r.name).toBeLessThanOrEqual(1e-12);
        expect(r.umkehr, r.name).toBe(0);
        expect(r.knick, r.name).toBeLessThan(30);
        expect(r.innen, r.name).toBeLessThanOrEqual(r.enden);
      }
    }, 600_000);
  }
});

describe('B7: „Aus der Vorschau“ — Mischung als eine Pose', () => {
  for (const art of ['gleich', 'ueberbiss'] as const) {
    it(`Kugel ${art}: neue Pose mit Gewicht 1 zeigt genau die Vorschau`, async () => {
      const { wesenBauen } = await import('../wesen');
      const dok0 = dokMitPosen(art);
      // Fressen mit eigener Form, damit die Mischung Form, Haps und Knochen enthält
      const n0 = 40;
      const dok: Dokument = { ...dok0, posen: dok0.posen.map((q) => (q.id === 'fressen' ? { ...q, form: Array.from({ length: n0 }, (_, i) => ({ punkt: 3 * i + 1, d: [0, 0.004 * Math.sin(i), 0.002] as [number, number, number] })) } : q)) };
      const linie = maulLinieAusDokument(dok)!;
      for (const g of [{ fressen: 0.6, p_b: 0.3 }, { idle: 0.5, fressen: 0.5 }]) {
        const vorschau = wesenBauen(dok, { maul: 'vorn', maulLinie: linie, gewichte: g, mischung: true }, null, false).netz;
        const m = vorschau.mischung!;
        expect(m).not.toBeNull();
        const neu: Pose = { id: 'p_m', name: 'Mischung', art: 'frei', form: m.form, bezug: m.bezug, stellung: m.stellung };
        const dok2: Dokument = { ...dok, posen: [...dok.posen, neu] };
        const nachher = wesenBauen(dok2, { maul: 'vorn', maulLinie: linie, gewichte: { p_m: 1 } }, null, false).netz;
        let d = 0;
        for (let i = 0; i < vorschau.positionen.length; i++) d = Math.max(d, Math.abs(vorschau.positionen[i]! - nachher.positionen[i]!));
        console.log(`Kugel ${art} ${JSON.stringify(g)}: neue Pose gegen Vorschau ${(d * PX).toFixed(4)} px, ${m.form.length} Käfigpunkte, Stellung ${JSON.stringify(m.stellung)}`);
        expect(vorschau.positionen.length).toBe(nachher.positionen.length);
        expect(d * PX).toBeLessThan(0.01);
      }
    }, 120_000);
  }
});
