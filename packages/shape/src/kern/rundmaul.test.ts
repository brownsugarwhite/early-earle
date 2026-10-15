// Phase 2 M6, Schritt 2: Rundmaul an der Körperspitze — von vorn rund (Seitenverhältnis des Lippenrings ≥ 0,8), wird beim
// Öffnen weit (Radius offen ≥ 3 × zu), keine Durchdringung bei 0/25/50/75/100 %, und im Wesen-Bau mit Lippe und Rachen.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { selbstDurchdringungen } from '../versuch/pruefen';
import { alleFlaechen, pruefeKaefig } from '../kaefig/halbkanten';
import { ableiten } from './ableiten';
import { hoehlenFein, hoehlenLagen, hoehlenTopologie } from './augenHoehle';
import { RUNDMAUL_STANDARD, type RundmaulForm, rundmaulAchse, rundmaulDicke, rundmaulEintrag, rundmaulKandidaten, rundmaulPose, rundmaulSpitze, rundmaulZentrum } from './rundmaul';
import { anwenden3 } from '../subdivision/matrix';
import { type Bauplan, wesenBauen } from './wesen';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexRoh from '../versuch/vorlagen/rex.json';
import tigerRoh from '../versuch/vorlagen/tiger.json';
import langRoh from '../versuch/vorlagen/langhals.json';

declare const console: { log: (...a: unknown[]) => void };
type V3 = [number, number, number];
const punkteAus = (fein: Float64Array): V3[] => Array.from({ length: fein.length / 3 }, (_, i) => [fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!] as V3);

describe('Rundmaul', () => {
  it('Kugel: Lippenring rund, öffnet weit, keine Durchdringung bei fünf Öffnungen', () => {
    const abl = ableiten(neuesDokument('fisch'), { stufen: 2 });
    let H = 0;
    for (let i = 1; i < abl.fein.length; i += 3) H = Math.max(H, abl.fein[i]!);
    const c = rundmaulZentrum(abl);
    const zeilen: string[] = [];
    const radien: number[] = [];
    const runde: number[] = [];
    const paare: number[] = [];
    const paareAlle: number[] = [];
    for (const oe of [0, 0.25, 0.5, 0.75, 1]) {
      const e = rundmaulEintrag(abl, oe, H);
      const topo = hoehlenTopologie(abl.kaefig, 2, [e])!;
      expect(topo).not.toBeNull();
      expect(pruefeKaefig(topo.kaefig).fehler).toEqual([]);
      const xyz = rundmaulPose(abl, abl.kaefig.xyz, oe, H);
      const fein = hoehlenFein(topo, hoehlenLagen(topo, xyz, [e]));
      // Lippenring L1 (Grenzlagen der neuen Käfigpunkte), um die Achse durch die Spitze
      const sp: V3 = [fein[3 * c]!, fein[3 * c + 1]!, fein[3 * c + 2]!];
      const ring: V3[] = [];
      for (let k = 0; k < 8; k++) {
        const i = topo.nAlt + k;
        ring.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
      }
      const mitte: V3 = [0, 0, 0];
      for (const p of ring) for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! + p[d]! / 8;
      const ax: V3 = [mitte[0] - sp[0], mitte[1] - sp[1], mitte[2] - sp[2]];
      const la = Math.hypot(...ax) || 1;
      const r = ring.map((p) => {
        const d: V3 = [p[0] - mitte[0], p[1] - mitte[1], p[2] - mitte[2]];
        const dn = (d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]) / la;
        return Math.hypot(d[0] - (dn * ax[0]) / la, d[1] - (dn * ax[1]) / la, d[2] - (dn * ax[2]) / la);
      });
      const rund = Math.min(...r) / Math.max(...r);
      radien.push(Math.max(...r));
      runde.push(rund);
      paare.push(0);
      const dd = selbstDurchdringungen({ punkte: punkteAus(fein), flaechen: topo.feinFlaechen, schaerfe: new Map() }, 1e-4);
      paareAlle.push(dd.paare);
      zeilen.push(`offen ${oe}: Radius ${(Math.max(...r) / H).toFixed(3)} H, rund ${rund.toFixed(2)} (${r.map((x) => (x / H).toFixed(3)).join(' ')}), ${dd.paare} Paare`);
    }
    console.log(`Rundmaul Kugel: ${zeilen.join('\n')}`);
    for (const x of runde) expect(x).toBeGreaterThanOrEqual(0.8);
    for (const x of paareAlle) expect(x).toBe(0);
    expect(radien[4]! / radien[0]!).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it('im Wesen-Bau: Rundmaul aus der Ausstattung, Lippenband, Rachen innen, Ecken passen; ohne Ausstattung kein Aufsatz', () => {
    const d = neuesDokument('fisch');
    const plan = (rund: boolean, oeffnung: number): Bauplan => ({ maul: 'aus', oeffnung, beine: 'aus', schwung: 0, stil: 'fest', earle: true, kaefigLinien: false, ...(rund ? { rundmaul: {} } : {}) });
    const ohne = wesenBauen(d, plan(false, 0), null).netz;
    const zu = wesenBauen(d, plan(true, 0), null).netz;
    const offen = wesenBauen(d, plan(true, 1), null).netz;
    expect(zu.positionen.length).toBeGreaterThan(ohne.positionen.length);
    expect(offen.positionen.length).toBe(zu.positionen.length);
    expect(zu.deskriptoren!.length / 16).toBe(zu.positionen.length / 3);
    expect(zu.ruhe!.length).toBe(zu.positionen.length);
    expect(zu.lippenBand).toBeGreaterThan(0);
    // Rachen (region.x ≥ 0,25) kommt vor, Lippenkante (region.w) ebenso
    const D = offen.deskriptoren!;
    let rachen = 0;
    let kante = 0;
    for (let i = 0; i < D.length; i += 16) {
      if (D[i + 4]! >= 0.25) rachen++;
      if (D[i + 7]! > 0.5) kante++;
    }
    console.log(`Rundmaul im Bau: Ecken ${ohne.positionen.length / 3} → ${zu.positionen.length / 3}, Rachen-Ecken ${rachen}, Kanten-Ecken ${kante}, Lippenband ${zu.lippenBand.toFixed(4)}`);
    expect(rachen).toBeGreaterThan(100);
    expect(kante).toBeGreaterThan(50);
    expect(RUNDMAUL_STANDARD.auf).toBeGreaterThan(RUNDMAUL_STANDARD.zu);
  }, 120_000);

  it('Zähne rundum (Aal): Anzahl wie bestellt, Spitzen zur Ringmitte, wachsen mit der Öffnung mit', () => {
    const d = neuesDokument('aal');
    const plan = (oeffnung: number): Bauplan => ({ maul: 'aus', oeffnung, beine: 'aus', schwung: 0, stil: 'fest', earle: true, kaefigLinien: false, rundmaul: { zaehne: 12 } });
    for (const oe of [0.3, 1]) {
      const n = wesenBauen(d, plan(oe), null).netz;
      const z = n.zaehne!;
      expect(z).not.toBeNull();
      expect(z.liste.length).toBe(12);
      expect(z.anteil.length).toBe(z.positionen.length / 3);
      // Mitte des Rings aus den Fußpunkten; jede Spitze näher an der Mitte als ihr Fuß
      const m: V3 = [0, 0, 0];
      for (const q of z.liste) for (let k = 0; k < 3; k++) m[k] = m[k]! + q.fuss[k]! / 12;
      for (const q of z.liste) {
        const df = Math.hypot(q.fuss[0] - m[0], q.fuss[1] - m[1], q.fuss[2] - m[2]);
        const ds = Math.hypot(q.spitze[0] - m[0], q.spitze[1] - m[1], q.spitze[2] - m[2]);
        expect(ds).toBeLessThan(df);
      }
    }
    expect(wesenBauen(d, { ...plan(1), rundmaul: {} }, null).netz.zaehne).toBeNull();
  }, 120_000);

  /** Lippenring und Durchdringungen des Aufsatzes um den Käfigpunkt c bei den Öffnungen (wie der erste Test). */
  function ringPruefen(abl: ReturnType<typeof ableiten>, c: number, form: RundmaulForm, oeffnungen: readonly number[]) {
    let H = 0;
    for (let i = 1; i < abl.fein.length; i += 3) H = Math.max(H, abl.fein[i]!);
    const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
    return oeffnungen.map((oe) => {
      // wie im Bau: Rachen höchstens 0,6 der Körperdicke hinter dem Maul (posiert)
      const xyz = rundmaulPose(abl, abl.kaefig.xyz, oe, H, form, c);
      const dicke = rundmaulDicke(punkteAus(anwenden3(abl.unterteilung.grenze, xyz)), flaechen, c, rundmaulAchse(abl, xyz, c));
      const e = rundmaulEintrag(abl, oe, H, form, c, dicke);
      const topo = hoehlenTopologie(abl.kaefig, 2, [e])!;
      expect(pruefeKaefig(topo.kaefig).fehler).toEqual([]);
      const fein = hoehlenFein(topo, hoehlenLagen(topo, xyz, [e]));
      const ring: V3[] = Array.from({ length: 8 }, (_, k) => [fein[3 * (topo.nAlt + k)]!, fein[3 * (topo.nAlt + k) + 1]!, fein[3 * (topo.nAlt + k) + 2]!] as V3);
      const mitte: V3 = [0, 0, 0];
      for (const q of ring) for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! + q[d]! / 8;
      const sp: V3 = [fein[3 * c]!, fein[3 * c + 1]!, fein[3 * c + 2]!];
      const ax: V3 = [mitte[0] - sp[0], mitte[1] - sp[1], mitte[2] - sp[2]];
      const la = Math.hypot(...ax) || 1;
      const r = ring.map((q) => {
        const d: V3 = [q[0] - mitte[0], q[1] - mitte[1], q[2] - mitte[2]];
        const dn = (d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]) / la;
        return Math.hypot(d[0] - (dn * ax[0]) / la, d[1] - (dn * ax[1]) / la, d[2] - (dn * ax[2]) / la);
      });
      const paare = selbstDurchdringungen({ punkte: punkteAus(fein), flaechen: topo.feinFlaechen, schaerfe: new Map() }, 1e-4).paare;
      return { oe, radius: Math.max(...r) / H, rund: Math.min(...r) / Math.max(...r), paare, tiefe: Math.hypot(...ax) / H, mitte, dicke: dicke / H };
    });
  }

  it('Mitte wählbar (Florian 15.10.): Käfigpunkte der Spiegelebene vorn mit regelmäßigem Umfeld; jede Lage rund und ohne Durchdringung (Fisch, Rex, Tiger, Langhals)', () => {
    for (const [name, dok] of [
      ['fisch', neuesDokument('fisch')],
      ['rex', vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex')],
      ['tiger', vorlageDokument(tigerRoh as unknown as Vorlage, 'zu', 'tiger')],
      ['langhals', vorlageDokument(langRoh as unknown as Vorlage, 'zu', 'langhals')],
    ] as const) {
      const abl = ableiten(dok, { stufen: 2 });
      const kand = rundmaulKandidaten(abl);
      const sp = rundmaulSpitze(abl);
      const F = abl.fein;
      expect(kand.length).toBeGreaterThanOrEqual(3);
      for (const i of kand) expect(Math.abs(abl.kaefig.xyz[3 * i + 2]!)).toBeLessThan(1e-7);
      for (let k = 1; k < kand.length; k++) expect(F[3 * kand[k]! + 1]!).toBeLessThanOrEqual(F[3 * kand[k - 1]! + 1]!);
      const zeilen: string[] = [];
      for (const c of kand) {
        // Fisch geschlossen und offen, die anderen offen (größter Ring, tiefster Rachen); 15.10. waren alle 55 Lagen bei 0, 50
        // und 100 % frei — hier leichter, die Datei läuft neben den Tempo-Tests
        const z = ringPruefen(abl, c, RUNDMAUL_STANDARD, name === 'fisch' ? [0, 1] : [1]);
        zeilen.push(`${c}: ${z.map((x) => `${x.paare}/${x.rund.toFixed(2)}`).join(' ')} (Dicke ${z[z.length - 1]!.dicke.toFixed(2)} H)`);
        for (const x of z) {
          expect(x.paare, `${name} ${c} bei ${x.oe}`).toBe(0);
          expect(x.rund, `${name} ${c} bei ${x.oe}`).toBeGreaterThanOrEqual(0.75);
        }
      }
      console.log(`${name}: Kandidaten (Paare/rund) ${zeilen.join(' · ')}`);
      if (name !== 'fisch') continue;
      expect(kand).toContain(sp);
      // ohne Punkt die Kappenmitte, mit Punkt der nächste Kandidat; der Punkt darunter liegt tiefer
      expect(rundmaulZentrum(abl)).toBe(sp);
      const unter = kand[kand.indexOf(sp) + 1]!;
      expect(rundmaulZentrum(abl, [F[3 * unter]!, F[3 * unter + 1]! - 0.002, 0])).toBe(unter);
      expect(F[3 * unter + 1]!).toBeLessThan(F[3 * sp + 1]!);
      // eine Augapfel-Höhle sperrt ihre Flächen
      expect(rundmaulKandidaten(abl, [sp])).not.toContain(sp);
    }
  }, 300_000);

  it('geschlossen unsichtbar (Florian 15.10.): O zu = 0 lässt die Haut ganz (kein Aufsatz, kein Lippenband); offen wächst das O aus dem Punkt, rund und ohne Durchdringung', () => {
    const d = neuesDokument('fisch');
    const plan = (rundmaul: Bauplan['rundmaul'] | undefined, oeffnung: number): Bauplan => ({ maul: 'aus', oeffnung, beine: 'aus', schwung: 0, stil: 'fest', earle: true, kaefigLinien: false, ...(rundmaul ? { rundmaul } : {}) });
    const ohne = wesenBauen(d, plan(undefined, 0), null).netz;
    const zu = wesenBauen(d, plan({ zu: 0 }, 0), null).netz;
    expect(zu.positionen.length).toBe(ohne.positionen.length);
    let abw = 0;
    for (let i = 0; i < zu.positionen.length; i++) abw = Math.max(abw, Math.abs(zu.positionen[i]! - ohne.positionen[i]!));
    expect(abw).toBeLessThan(1e-9);
    expect(zu.lippenBand).toBe(0);
    expect(zu.rundmaul).not.toBeNull();
    expect(zu.rundmaul!.radius).toBe(0);
    expect(zu.rundmaul!.kandidaten.length).toBeGreaterThan(0);
    // offen: der Ring ist da, Radius wächst mit der Öffnung, Lippenband ab dem Standard-O voll
    const halb = wesenBauen(d, plan({ zu: 0 }, 0.5), null).netz;
    expect(halb.positionen.length).toBeGreaterThan(ohne.positionen.length);
    expect(halb.rundmaul!.radius / halb.hoehe).toBeGreaterThan(0.5 * 0.5 * RUNDMAUL_STANDARD.auf);
    expect(halb.lippenBand).toBeCloseTo(0.012 * halb.hoehe, 9);
    // Ring und Rachen aus dem Punkt: rund, ohne Durchdringung, auch knapp geöffnet; geschlossener Rachen 0
    const abl = ableiten(d, { stufen: 2 });
    const form: RundmaulForm = { ...RUNDMAUL_STANDARD, zu: 0 };
    const z = ringPruefen(abl, rundmaulSpitze(abl), form, [0.05, 0.25, 0.5, 1]);
    console.log(`O zu = 0: ${z.map((x) => `${x.oe}: r ${x.radius.toFixed(3)} H, Rachen ${x.tiefe.toFixed(3)} H, rund ${x.rund.toFixed(2)}, ${x.paare} Paare`).join(' · ')}`);
    for (const x of z) {
      expect(x.paare).toBe(0);
      expect(x.rund).toBeGreaterThanOrEqual(0.8);
    }
    expect(z[0]!.radius).toBeLessThan(0.02);
    expect(rundmaulEintrag(abl, 0, 1, form).mund!.tiefe).toBe(0);
  }, 120_000);
});

