// Phase 2 / M4 (Plan 5.3): Zähne im Kern — Zahnfleisch, Rahmen, Wurzel, Netz, Dokument und Automatik. Sinngemäß die
// Tests des Versuchs vom 12.10. (`versuch/zaehne.test.ts`), hier auf dem Kern-Maul (Rex mit Überbiss, Kugel, Tiger-Platte)
// bei zu, halb und offen.

import { describe, expect, it } from 'vitest';
import type { Dokument, Zaehne } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexRoh from '../versuch/vorlagen/rex.json';
import tigerRoh from '../versuch/vorlagen/tiger.json';
import { type MaulErgebnis, ableitenMitMaul, maulOptionenVorlage, maulPose } from './maul';
import { maulLinieAusDokument } from './maulDokument';
import { kugelMaulDokument } from './pruefstand';
import { pruefwesenBauplan, wesenBauen } from './wesen';
import { ZAHN_RINGE, ZAHN_SEITEN, zaehnePruefenBei, zaehneStandard, zahnAenderungAnwenden, zahnfleischKern, zahnListe, zahnreiheVerteilen } from './zaehne';
import { type Zahn, zahnBei, zahnGitter, zahnNetz, zahnProfil, zahnRingHoehen } from './zahnModell';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now: () => number };

type V3 = [number, number, number];
const PX = 461;
const spiegel = (p: V3): V3 => [p[0], p[1], -p[2]];
const ab = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const kreuz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function rexDok(): Dokument {
  return { ...vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex'), ausstattung: pruefwesenBauplan('rex') };
}
function tigerDok(): Dokument {
  return { ...vorlageDokument(tigerRoh as unknown as Vorlage, 'zu', 'tiger'), ausstattung: pruefwesenBauplan('tiger') };
}
/** Maul-Ableitung wie im Bau (Ausstattungs- oder gezeichnete Linie). */
function maulAbl(d: Dokument): MaulErgebnis {
  const aus = d.ausstattung ?? {};
  const linie = aus.maulLinie ?? maulLinieAusDokument(d)!;
  const opt = { stufen: 2, ...(aus.ring ? { ring: aus.ring } : {}), ...(aus.kasten ? { kasten: aus.kasten } : {}) };
  return ableitenMitMaul(d, linie as never, opt as never, { ...maulOptionenVorlage('vorn'), ...(aus.maulOptionen ?? {}) });
}
/** Abstand eines Punkts zu einem Polygonzug (3 Floats je Punkt). */
function abstandZuLinie(p: V3, linie: Float32Array): number {
  let best = Infinity;
  for (let i = 0; i + 5 < linie.length; i += 3) {
    const a: V3 = [linie[i]!, linie[i + 1]!, linie[i + 2]!];
    const b: V3 = [linie[i + 3]!, linie[i + 4]!, linie[i + 5]!];
    const abv = minus(b, a);
    const l2 = dot(abv, abv);
    const f = l2 > 1e-24 ? Math.min(1, Math.max(0, dot(minus(p, a), abv) / l2)) : 0;
    best = Math.min(best, ab(p, [a[0] + abv[0] * f, a[1] + abv[1] * f, a[2] + abv[2] * f]));
  }
  return best;
}

describe('Zähne im Kern: Reihe und Dokument', () => {
  it('Verteilen: rechte Hälfte, Mittelzahn bei ungerader Zahl, untere Reihe in den Lücken der oberen, Form bleibt', () => {
    for (let n = 0; n <= 9; n++) {
      const r = zahnreiheVerteilen(n, 'oben', 0.04);
      expect(r.anzahl).toBe(n);
      expect(r.zaehne.length).toBe(Math.ceil(n / 2));
      if (n % 2 === 1) expect(r.zaehne[0]!.u).toBe(0);
      for (let i = 1; i < r.zaehne.length; i++) expect(r.zaehne[i]!.u).toBeGreaterThan(r.zaehne[i - 1]!.u);
      expect(r.zaehne.every((z) => z.u <= 0.9 + 1e-12)).toBe(true);
    }
    // gleiche Anzahl: unten genau zwischen oben
    const o = zahnreiheVerteilen(8, 'oben', 0.04).zaehne.map((z) => z.u);
    const u = zahnreiheVerteilen(8, 'unten', 0.04).zaehne.map((z) => z.u);
    for (let i = 0; i < 3; i++) expect(u[i]!).toBeCloseTo((o[i]! + o[i + 1]!) / 2, 12);
    // vorhandene Einträge behalten ihre Form
    const alt = zahnreiheVerteilen(4, 'oben', 0.04);
    alt.zaehne[0] = { ...alt.zaehne[0]!, rundheit: 0.1, aussen: true };
    const neu = zahnreiheVerteilen(6, 'oben', 0.04, alt);
    expect(neu.zaehne[0]!.rundheit).toBe(0.1);
    expect(neu.zaehne[0]!.aussen).toBe(true);
    // neue Zähne übernehmen die Form des letzten vorhandenen
    expect(neu.zaehne[2]!.rundheit).toBe(alt.zaehne[1]!.rundheit);
    expect(neu.zaehne[2]!.laenge).toBe(alt.zaehne[1]!.laenge);
    expect(neu.zaehne[2]!.u).toBeGreaterThan(neu.zaehne[1]!.u);
    // ohne Vorlage: Standardform
    expect(zahnreiheVerteilen(6, 'oben', 0.04).zaehne[2]!.rundheit).toBe(0.7);
  });

  it('Dokument → beide Seiten: Mittelzahn auf der Achse, Paare rechts und links, Tiefe ¾ der Breite, Größe und Drehung durchgereicht', () => {
    const z: Zaehne = { oben: zahnreiheVerteilen(5, 'oben', 0.04), unten: zahnreiheVerteilen(4, 'unten', 0.03) };
    z.oben.zaehne[1] = { ...z.oben.zaehne[1]!, groesse: 1.5, drehung: 30, auf: { laenge: 0.08, breite: 0.02 } };
    const l = zahnListe(z);
    expect(l.length).toBe(9);
    expect(l.filter((q) => q.zahn.seite === 0).length).toBe(1);
    expect(l[0]!.zahn.seite).toBe(0);
    const paar = l.filter((q) => q.kiefer === 'oben' && q.index === 1);
    expect(paar.map((q) => q.zahn.seite).sort()).toEqual([-1, 1]);
    expect(paar[0]!.zahn.groesse).toBe(1.5);
    expect(paar[0]!.zahn.drehung).toBe(30);
    expect(paar[0]!.zahn.tiefe).toBeCloseTo(0.75 * paar[0]!.zahn.breite, 12);
    expect(paar[0]!.zahn.auf?.tiefe).toBeCloseTo(0.015, 12);
    // Größe in zahnBei: offen überblendet, Mittelzahn ohne Drehung
    const w = zahnBei({ ...paar[0]!.zahn, auf: { groesse: 2.5 } }, 0.5);
    expect(w.groesse).toBeCloseTo(2, 12);
    expect(zahnBei({ ...l[0]!.zahn, drehung: 40 }, 0).drehung).toBe(0);
  });
});

describe('Zähne im Kern: Zahnfleisch und Rahmen (Rex, Kugel, Tiger)', () => {
  const faelle: [string, Dokument][] = [
    ['Rex', rexDok()],
    ['Kugel', kugelMaulDokument('gleich', true)],
    ['Tiger', tigerDok()],
  ];
  for (const [name, dok] of faelle) {
    const abl = maulAbl(dok);
    it(`${name}: Rahmen orthonormal, d zum Gegenkiefer, i in die Tasche, links = Spiegelbild, u zurück — zu, halb, offen`, () => {
      for (const alpha of [0, 0.5, 1]) {
        const fein = alpha === 0 ? abl.fein : maulPose(abl, alpha).fein;
        const zf = zahnfleischKern(abl, fein);
        let ortho = 0;
        let spiegelFehler = 0;
        let minD = Infinity;
        let minInnen = Infinity;
        let uFehler = 0;
        for (const kiefer of ['oben', 'unten'] as const) {
          const gegen = zf[kiefer === 'oben' ? 'unten' : 'oben'];
          for (let u = 0; u <= 0.9001; u += 0.05) {
            for (const s of [-1, 1] as const) {
              for (const aussen of [false, true]) {
                const r = zf[kiefer](u, s, aussen);
                for (const v of [r.t, r.d, r.i]) ortho = Math.max(ortho, Math.abs(Math.hypot(...v) - 1));
                ortho = Math.max(ortho, Math.abs(dot(r.t, r.d)), Math.abs(dot(r.t, r.i)), Math.abs(dot(r.d, r.i)));
              }
              const r = zf[kiefer](u, s);
              const g = gegen(u, s).p;
              if (ab(g, r.p) > 1 / PX) minD = Math.min(minD, dot(r.d, minus(g, r.p)) / ab(g, r.p));
              uFehler = Math.max(uFehler, Math.abs(zf[kiefer].uVon(r.p, s).u - u));
            }
            const R = zf[kiefer](u, 1);
            const L = zf[kiefer](u, -1);
            for (const [a, b] of [
              [R.p, L.p],
              [R.t, L.t],
              [R.d, L.d],
              [R.i, L.i],
              [R.rand, L.rand],
            ] as const) {
              spiegelFehler = Math.max(spiegelFehler, ab(spiegel(a), b));
            }
          }
          // i zeigt in den Mund: zur Mitte der tiefsten Taschenreihe hin (an einer mittleren Stelle)
          const r = zf[kiefer](0.4, 1);
          const reihe = kiefer === 'oben' ? abl.maul.tasche.oben : abl.maul.tasche.unten;
          const tief = reihe[reihe.length - 1]!;
          const t = Math.min(tief.length - 1, Math.round(0.4 * (tief.length - 1)));
          const q: V3 = [fein[3 * tief[t]!]!, fein[3 * tief[t]! + 1]!, fein[3 * tief[t]! + 2]!];
          minInnen = Math.min(minInnen, dot(r.i, minus(q, r.p)) / ab(q, r.p));
        }
        console.log(`${name} α=${alpha}: orthonormal bis ${ortho.toExponential(1)}; Spiegel ${spiegelFehler.toExponential(1)}; cos(d, Gegenkiefer) ≥ ${minD.toFixed(2)}; cos(i, Tasche) ≥ ${minInnen.toFixed(2)}; u zurück ${uFehler.toExponential(1)}`);
        expect(ortho).toBeLessThan(1e-9);
        expect(spiegelFehler).toBeLessThan(1e-9);
        // Der Rahmen wird zu festgelegt (d zum Gegenkiefer, i in die Tasche) und wandert dann starr mit dem eigenen
        // Kiefer: offen zeigt d nicht mehr zum weggedrehten Gegenkiefer (gewollt). d steht senkrecht zur
        // Zahnfleischlinie (Spreizung kippt längs), deshalb wie im Versuch nur: zum Gegenkiefer hin
        if (alpha === 0) {
          expect(minD).toBeGreaterThan(0);
          expect(minInnen).toBeGreaterThan(0);
        }
        expect(uFehler).toBeLessThan(1e-6);
      }
    });
  }

  it('starr im eigenen Kiefer: vorn dreht ein Zahn beim Öffnen genau mit dem Unterkiefer bzw. dem Schädel (Kugel, Knochen ohne Haps)', () => {
    const abl = maulAbl(kugelMaulDokument('gleich', true));
    const zu = zahnfleischKern(abl, abl.fein);
    const offen = zahnfleischKern(abl, maulPose(abl, 1).fein);
    const um = (v: V3, w: number): V3 => [v[0] * Math.cos(w) - v[1] * Math.sin(w), v[0] * Math.sin(w) + v[1] * Math.cos(w), v[2]];
    const winkel = (a: V3, b: V3) => (Math.acos(Math.min(1, Math.max(-1, dot(a, b)))) * 180) / Math.PI;
    for (const [kiefer, grad] of [
      ['unten', abl.maul.opt.winkelUnten],
      ['oben', abl.maul.opt.winkelOben],
    ] as const) {
      const d0 = zu[kiefer](0.15, 1).d;
      const d1 = offen[kiefer](0.15, 1).d;
      const w = (grad * Math.PI) / 180;
      const rest = Math.min(winkel(um(d0, w), d1), winkel(um(d0, -w), d1));
      console.log(`${kiefer}: Knochen ${grad}°, Zahn gedreht um ${winkel(d0, d1).toFixed(1)}°, Rest nach der Knochendrehung ${rest.toFixed(2)}°`);
      expect(rest).toBeLessThan(2);
    }
  });

  it('u ist eine feste Stelle des Käfigs: die Wurzel liegt zu, halb und offen auf dem Zahnfleisch (≤ 0,5 px), der Anteil der Ruhelage bleibt', () => {
    const abl = maulAbl(rexDok());
    const zaehne: Zahn[] = zahnListe(zaehneStandard(abl)).map((q) => q.zahn);
    for (const alpha of [0, 0.5, 1]) {
      const fein = maulPose(abl, alpha).fein;
      const zf = zahnfleischKern(abl, fein);
      let maxWurzel = 0;
      let maxRing = 0;
      let aussen = 0;
      for (const z of zaehne) {
        const g = zahnGitter(z, zf[z.kiefer], alpha);
        const ring = g.ringe[1]!;
        const m = [0, 1, 2].map((k) => ring.reduce((s, p) => s + p[k]!, 0) / ring.length) as V3;
        maxRing = Math.max(maxRing, ab(m, g.wurzel));
        const w = zahnBei(z, alpha);
        if (z.aussen) {
          // außen-Zahn (Rex: oben, Überbiss): Ansatz am Lippenrand, um halbe Tiefe plus 1,5 px nach außen
          const versatz = ab(g.wurzel, zf[z.kiefer](w.u, z.seite, true).rand) - (w.tiefe * w.groesse) / 2;
          expect(Math.abs(versatz * PX - 1.5)).toBeLessThan(1e-6);
          aussen++;
          continue;
        }
        maxWurzel = Math.max(maxWurzel, abstandZuLinie(g.wurzel, zf[z.kiefer].linie));
        // die Stelle der Ruhelage: uVon auf der Linie der Pose liefert dasselbe u
        expect(Math.abs(zf[z.kiefer].uVon(g.wurzel, z.seite === 0 ? 1 : z.seite).u - (z.seite === 0 ? 0 : w.u))).toBeLessThan(1e-6);
      }
      expect(aussen).toBe(12);
      console.log(`Rex α=${alpha}: Wurzel–Zahnfleisch ${(maxWurzel * PX).toFixed(4)} px, Ringmitte–Wurzel ${maxRing.toExponential(1)}`);
      expect(maxWurzel * PX).toBeLessThan(0.5);
      expect(maxRing).toBeLessThan(1e-9);
    }
  });

  it('Netz: jeder Zahn geschlossen und nach außen orientiert, Spiegelzahn = Spiegelbild, Mittelzahn spiegelgleich', () => {
    const abl = maulAbl(rexDok());
    const zf = zahnfleischKern(abl, abl.fein);
    const reihen: Zaehne = { oben: zahnreiheVerteilen(7, 'oben', 0.035), unten: zahnreiheVerteilen(6, 'unten', 0.03) };
    reihen.oben.zaehne[2] = { ...reihen.oben.zaehne[2]!, drehung: 50, spreizung: 10, neigung: 8, biegung: 0.5, aussen: true };
    const liste = zahnListe(reihen);
    for (const q of liste) {
      const { positionen: p, normalen: nn } = zahnNetz(q.zahn, zf[q.kiefer], 0, ZAHN_SEITEN, ZAHN_RINGE);
      // Volumen über die Divergenz (um die Wurzel als Ursprung): > 0 heißt außen gegen den Uhrzeigersinn
      const o0: V3 = [p[0]!, p[1]!, p[2]!];
      let vol = 0;
      let gleich = 0;
      for (let o = 0; o < p.length; o += 9) {
        const a = minus([p[o]!, p[o + 1]!, p[o + 2]!], o0);
        const b = minus([p[o + 3]!, p[o + 4]!, p[o + 5]!], o0);
        const c = minus([p[o + 6]!, p[o + 7]!, p[o + 8]!], o0);
        vol += dot(a, kreuz(b, c)) / 6;
        if (dot(kreuz(minus(b, a), minus(c, a)), [nn[o]!, nn[o + 1]!, nn[o + 2]!]) > 0) gleich++;
      }
      expect(vol, `${q.kiefer} ${q.index} ${q.zahn.seite}`).toBeGreaterThan(0);
      expect(gleich).toBe(p.length / 9);
    }
    // Spiegelpaar (auch der gedrehte außen-Zahn)
    for (const index of [1, 2]) {
      const r = liste.find((q) => q.kiefer === 'oben' && q.index === index && q.zahn.seite === 1)!;
      const l = liste.find((q) => q.kiefer === 'oben' && q.index === index && q.zahn.seite === -1)!;
      const gr = zahnGitter(r.zahn, zf.oben, 0);
      const gl = zahnGitter(l.zahn, zf.oben, 0);
      let fehler = 0;
      gr.ringe.forEach((ring, m) => ring.forEach((p, j) => (fehler = Math.max(fehler, ab(spiegel(p), gl.ringe[m]![j]!)))));
      expect(fehler).toBeLessThan(1e-9);
    }
    // Mittelzahn: die Punktmenge ist spiegelgleich (jeder gespiegelte Punkt hat einen Partner)
    const mz = zahnGitter(liste.find((q) => q.zahn.seite === 0)!.zahn, zf.oben, 0);
    const pts = mz.ringe.flat();
    let mFehler = 0;
    for (const p of pts) mFehler = Math.max(mFehler, Math.min(...pts.map((q) => ab(spiegel(p), q))));
    expect(mFehler).toBeLessThan(1e-9);
  });

  it('Größe und Drehung: Größe 2 verdoppelt die Länge, Drehung 90° biegt den Zahn längs des Zahnfleischs statt nach innen', () => {
    const abl = maulAbl(rexDok());
    const zf = zahnfleischKern(abl, abl.fein);
    const basis: Zahn = { laenge: 0.04, breite: 0.016, tiefe: 0.012, rundheit: 1, schaerfe: 0.6, neigung: 0, biegung: 0, spreizung: 0, aussen: false, kiefer: 'oben', u: 0.4, seite: 1 };
    const g1 = zahnGitter(basis, zf.oben, 0);
    const g2 = zahnGitter({ ...basis, groesse: 2 }, zf.oben, 0);
    expect(ab(g2.spitze, g2.wurzel) / ab(g1.spitze, g1.wurzel)).toBeCloseTo(2, 9);
    const r = zf.oben(0.4, 1);
    const krumm = { ...basis, biegung: 0.6 };
    const innen = zahnGitter(krumm, zf.oben, 0);
    const gedreht = zahnGitter({ ...krumm, drehung: 90 }, zf.oben, 0);
    const vi = minus(innen.spitze, innen.wurzel);
    const vg = minus(gedreht.spitze, gedreht.wurzel);
    // ohne Drehung weicht die Spitze nach innen (i) ab, mit 90° längs t (zum Mundwinkel oder zur Mitte), nicht mehr nach innen
    expect(dot(vi, r.i)).toBeGreaterThan(0.3 * Math.hypot(...vi));
    expect(Math.abs(dot(vg, r.i))).toBeLessThan(1e-6);
    expect(Math.abs(dot(vg, r.t))).toBeGreaterThan(0.3 * Math.hypot(...vg));
    expect(Math.abs(dot(vg, r.d) - dot(vi, r.d))).toBeLessThan(1e-9);
  });

  it('Blobzahn (Schärfe −1, Florian 15.10.): ganz ohne Spitze, runde Kappe mit dem Halbmesser des Querschnitts, darunter fast voll; bei 0 stetig', () => {
    const L = 0.02;
    const r = 0.005;
    for (let h = 0; h <= 1.0001; h += 0.05) {
      // stetig bei Schärfe 0, voller als die stumpfe Kuppe, fallend zur Spitze
      expect(zahnProfil(h, -1e-9, L, r)).toBeCloseTo(zahnProfil(h, 0, L, r), 6);
      expect(zahnProfil(h, -1, L, r)).toBeGreaterThanOrEqual(zahnProfil(h, -0.5, L, r) - 1e-12);
      expect(zahnProfil(h, -0.5, L, r)).toBeGreaterThanOrEqual(zahnProfil(h, 0, L, r) - 1e-12);
      expect(zahnProfil(h + 0.05, -1, L, r)).toBeLessThanOrEqual(zahnProfil(h, -1, L, r) + 1e-12);
    }
    // an der Spitze rund wie ein Kreis mit dem Halbmesser r̄: Halbmesser² ≈ 2·r̄·Δ (Δ = Abstand zur Spitze)
    for (const eps of [0.005, 0.01]) {
      const rad = r * zahnProfil(1 - eps, -1, L, r);
      const verh = (rad * rad) / (2 * r * eps * L);
      expect(verh).toBeGreaterThan(0.95);
      expect(verh).toBeLessThan(1.05);
    }
    // auf halber Länge fast voll (Kapsel), die stumpfe Kuppe nur 71 %
    expect(zahnProfil(0.5, -1, L, r)).toBeGreaterThan(0.99);
    expect(zahnProfil(0.5, 0, L, r)).toBeCloseTo(Math.SQRT1_2, 9);
    // Ringe: für Schärfe ≥ 0 unverändert, beim Blob liegen zwei der acht in der runden Kappe (oberstes r̄)
    expect(zahnRingHoehen(8, 0.6, L, r)).toEqual(Array.from({ length: 8 }, (_, k) => 1 - (1 - k / 8) ** 2));
    const hb = zahnRingHoehen(8, -1, L, r);
    expect(hb[0]).toBe(0);
    for (let k = 1; k < 8; k++) expect(hb[k]!).toBeGreaterThan(hb[k - 1]!);
    expect(hb.filter((h) => h * L > L - r).length).toBeGreaterThanOrEqual(2);
    // am Rex: der Blobzahn ist geschlossen, die Spitze liegt auf der Achse, der letzte Ring ist nicht mehr winzig
    const abl = maulAbl(rexDok());
    const zf = zahnfleischKern(abl, abl.fein);
    const blob: Zahn = { laenge: 0.02, breite: 0.016, tiefe: 0.012, rundheit: 1, schaerfe: -1, neigung: 0, biegung: 0, spreizung: 0, aussen: false, kiefer: 'oben', u: 0.4, seite: 1 };
    const spitz = zahnGitter({ ...blob, schaerfe: 0.6 }, zf.oben, 0, ZAHN_SEITEN, ZAHN_RINGE);
    const rund = zahnGitter(blob, zf.oben, 0, ZAHN_SEITEN, ZAHN_RINGE);
    const halb = (g: typeof rund, k: number) => Math.max(...g.ringe[k]!.map((p) => ab(p, g.ringe[k]!.reduce<V3>((m, q) => [m[0] + q[0] / ZAHN_SEITEN, m[1] + q[1] / ZAHN_SEITEN, m[2] + q[2] / ZAHN_SEITEN], [0, 0, 0]))));
    const R = rund.ringe.length - 1;
    console.log(`Blob: letzter Ring ${(halb(rund, R) * PX).toFixed(1)} px Halbmesser (spitz ${(halb(spitz, R) * PX).toFixed(2)} px), Länge ${(ab(rund.spitze, rund.wurzel) * PX).toFixed(1)} px`);
    expect(halb(rund, R)).toBeGreaterThan(0.3 * 0.008);
    expect(halb(spitz, R)).toBeLessThan(0.05 * 0.008);
    // Netz geschlossen und außen orientiert (Volumen > 0), voller als der spitze Zahn
    const volumen = (z: Zahn) => {
      const q = zahnNetz(z, zf.oben, 0, ZAHN_SEITEN, ZAHN_RINGE).positionen;
      const o0: V3 = [q[0]!, q[1]!, q[2]!];
      let v = 0;
      for (let o = 0; o < q.length; o += 9) v += dot(minus([q[o]!, q[o + 1]!, q[o + 2]!], o0), kreuz(minus([q[o + 3]!, q[o + 4]!, q[o + 5]!], o0), minus([q[o + 6]!, q[o + 7]!, q[o + 8]!], o0))) / 6;
      return v;
    };
    const vb = volumen(blob);
    const vs = volumen({ ...blob, schaerfe: 0.6 });
    console.log(`Volumen Blob/spitz ${(vb / vs).toFixed(2)}`);
    expect(vs).toBeGreaterThan(0);
    expect(vb).toBeGreaterThan(1.5 * vs);
  });

  it('vor/zurück (Florian 15.10.): der ganze Zahn wandert quer zum Zahnfleisch, + zur Lippe (−i), auch außen; offen über „auf“', () => {
    const abl = maulAbl(rexDok());
    const zf = zahnfleischKern(abl, abl.fein);
    const basis: Zahn = { laenge: 0.04, breite: 0.016, tiefe: 0.012, rundheit: 1, schaerfe: 0.6, neigung: 10, biegung: 0.3, spreizung: 5, aussen: false, kiefer: 'oben', u: 0.4, seite: 1 };
    for (const aussen of [false, true]) {
      for (const seite of [1, -1] as const) {
        const r = zf.oben(0.4, seite, aussen);
        const g0 = zahnGitter({ ...basis, aussen, seite }, zf.oben, 0);
        const g1 = zahnGitter({ ...basis, aussen, seite, vor: 0.01 }, zf.oben, 0);
        let fehler = 0;
        g0.ringe.forEach((ring, k) => ring.forEach((p, j) => (fehler = Math.max(fehler, ab(g1.ringe[k]![j]!, [p[0] - 0.01 * r.i[0], p[1] - 0.01 * r.i[1], p[2] - 0.01 * r.i[2]])))));
        fehler = Math.max(fehler, ab(g1.spitze, [g0.spitze[0] - 0.01 * r.i[0], g0.spitze[1] - 0.01 * r.i[1], g0.spitze[2] - 0.01 * r.i[2]]));
        expect(fehler).toBeLessThan(1e-12);
      }
    }
    // offen über „auf“: zu 0, offen −0,01 (zurück) → bei 50 % halb
    const r = zf.oben(0.4, 1);
    const z0 = zahnGitter(basis, zf.oben, 0.5);
    const zh = zahnGitter({ ...basis, auf: { vor: -0.01 } }, zf.oben, 0.5);
    expect(ab(zh.wurzel, [z0.wurzel[0] + 0.005 * r.i[0], z0.wurzel[1] + 0.005 * r.i[1], z0.wurzel[2] + 0.005 * r.i[2]])).toBeLessThan(1e-12);
    // im Dokument: vor wird durchgereicht, die Änderung der Prüfung kann es setzen
    const e = zahnreiheVerteilen(2, 'oben', 0.03).zaehne[0]!;
    expect(zahnListe({ oben: { anzahl: 2, zaehne: [{ ...e, vor: 0.004 }] }, unten: { anzahl: 0, zaehne: [] } })[0]!.zahn.vor).toBe(0.004);
    expect(zahnAenderungAnwenden(e, { vor: -0.002 }).vor).toBe(-0.002);
  });
});

describe('Zähne im Kern: Bau im Wesen', () => {
  it('Automatik ohne Dokument: Rex 6/5 je Seite, Tiger-Platte einer je Seite; Zahn je Ecke passt zu den Bereichen', () => {
    for (const [name, dok, oben, unten] of [
      ['Rex', rexDok(), 12, 10],
      ['Tiger', tigerDok(), 2, 2],
    ] as const) {
      const w = wesenBauen(dok, { maul: 'vorn', gewichte: {}, beine: 'aus', schwung: 0, stil: 'fest', earle: false, kaefigLinien: false, ...dok.ausstattung }, null);
      const z = w.netz.zaehne!;
      expect(z.ausDokument).toBe(false);
      expect(z.reihen.oben.anzahl, name).toBe(oben);
      expect(z.reihen.unten.anzahl, name).toBe(unten);
      expect(z.liste.length).toBe(oben + unten);
      expect(z.zahn.length).toBe(z.positionen.length / 3);
      expect(z.anteil.length).toBe(z.positionen.length / 3);
      // jede Ecke gehört zu einem Zahn, die Zähne kommen in Blöcken
      for (let i = 1; i < z.zahn.length; i++) expect(z.zahn[i]! - z.zahn[i - 1]!).toBeGreaterThanOrEqual(0);
      expect(z.zahn[z.zahn.length - 1]).toBe(z.liste.length - 1);
      // Anteil: 0 am Zahnfleisch … 1 an der Spitze
      let mx = 0;
      for (const a of z.anteil) mx = Math.max(mx, a);
      expect(mx).toBe(1);
      expect(z.fleisch.oben.length % 3).toBe(0);
      expect(z.fleisch.uOben.length).toBe(z.fleisch.oben.length / 3);
    }
  }, 60_000);

  it('Dokument: Zähne aus dem Dokument, Mittelzahn auf der Naht, offen größer (auf) wirkt mit der Öffnung', () => {
    const roh = rexDok();
    const reihen: Zaehne = { oben: zahnreiheVerteilen(7, 'oben', 0.03), unten: zahnreiheVerteilen(4, 'unten', 0.025) };
    reihen.oben.zaehne[1] = { ...reihen.oben.zaehne[1]!, auf: { laenge: 0.06 } };
    const dok: Dokument = { ...roh, zaehne: reihen };
    const plan = { maul: 'vorn' as const, gewichte: {}, beine: 'aus' as const, schwung: 0, stil: 'fest' as const, earle: false, kaefigLinien: false, ...dok.ausstattung };
    const zu = wesenBauen(dok, plan, null);
    const z = zu.netz.zaehne!;
    expect(z.ausDokument).toBe(true);
    expect(z.liste.length).toBe(11);
    const mitte = z.liste.find((q) => q.seite === 0)!;
    expect(Math.abs(mitte.fuss[2])).toBeLessThan(1e-9);
    const lang = (n: typeof z) => {
      const q = n.liste.find((x) => x.kiefer === 'oben' && x.index === 1 && x.seite === 1)!;
      return ab(q.spitze, q.fuss);
    };
    const offen = wesenBauen(dok, { ...plan, gewichte: { fressen: 1 } }, zu.stand).netz.zaehne!;
    const halb = wesenBauen(dok, { ...plan, gewichte: { fressen: 0.5 } }, zu.stand).netz.zaehne!;
    console.log(`Zahn oben 2: zu ${(lang(z) * PX).toFixed(1)} px, halb ${(lang(halb) * PX).toFixed(1)}, offen ${(lang(offen) * PX).toFixed(1)}`);
    expect(lang(offen) / lang(z)).toBeGreaterThan(1.8);
    expect(lang(halb)).toBeGreaterThan(lang(z));
    expect(lang(halb)).toBeLessThan(lang(offen));
    // Zähne ändern den Körper nicht: gleiche Ableitung, kein Umbau
    const ohne = wesenBauen(roh, plan, zu.stand);
    expect(ohne.netz.info.ableitung).toBe(0);
  }, 60_000);

  it('Tempo: Zähne des Rex (22) bauen < 15 ms', () => {
    const abl = maulAbl(rexDok());
    const fein = maulPose(abl, 0.5).fein;
    const reihen = zaehneStandard(abl);
    // warm laufen
    for (let k = 0; k < 3; k++) zahnListe(reihen).forEach((q) => zahnNetz(q.zahn, zahnfleischKern(abl, fein)[q.kiefer], 0.5, ZAHN_SEITEN, ZAHN_RINGE));
    // beste von fünf Messungen (die Tests laufen parallel, eine belegte Maschine misst sonst sich selbst)
    let best = Infinity;
    for (let k = 0; k < 5; k++) {
      const t0 = performance.now();
      const zf = zahnfleischKern(abl, fein);
      for (const q of zahnListe(reihen)) zahnNetz(q.zahn, zf[q.kiefer], 0.5, ZAHN_SEITEN, ZAHN_RINGE);
      best = Math.min(best, performance.now() - t0);
    }
    console.log(`Zahnfleisch und 22 Zahnnetze: beste von fünf ${best.toFixed(2)} ms`);
    expect(best).toBeLessThan(15);
  });
});

describe('Zähne im Kern: Prüfung gegen den Gegenkiefer (zu, 25 %, 50 %, offen)', () => {
  // Befunde entstehen geschlossen und beim Öffnen (25 %); offen (50 %, 100 %) gab es nie welche. Die Tests prüfen deshalb
  // direkt in diesen Lagen auf Stufe 2 (leicht, sie laufen parallel zu den Tempo-Tests); den vollen Weg über den Bauplan
  // (vier Öffnungen, Stufe des Editors) prüft der erste Test am Rex.
  const kugel = (art: Parameters<typeof kugelMaulDokument>[0]) => kugelMaulDokument(art, true);
  const pruefe = (abl: MaulErgebnis, liste: ReturnType<typeof zahnListe>, oeffnungen: readonly number[]) =>
    zaehnePruefenBei(
      abl,
      oeffnungen.map((o) => ({ oeffnung: o, fein: o === 0 ? abl.fein : maulPose(abl, o).fein })),
      liste,
    );

  it('voller Weg (Bauplan.zahnPruefung, vier Öffnungen): die Automatik des Rex ist ohne Befund, die Fänge stehen außen', () => {
    const d = rexDok();
    const w = wesenBauen(d, { maul: 'vorn', gewichte: {}, beine: 'aus', schwung: 0, stil: 'fest', earle: false, kaefigLinien: false, ...d.ausstattung, zahnPruefung: true }, null);
    expect(w.netz.zahnMeldungen).toEqual([]);
    expect(w.netz.zaehne!.reihen.oben.zaehne.every((e) => e.aussen)).toBe(true);
  }, 60_000);

  it('Automatik ohne Befund (zu, 25 %): Tiger-Platte, Kugel gleich, Überbiss, Unterbiss, Florians Kugel', () => {
    for (const [name, d] of [
      ['Tiger', tigerDok()],
      ['Kugel gleich', kugel('gleich')],
      ['Kugel Überbiss', kugel('ueberbiss')],
      ['Kugel Unterbiss', kugel('unterbiss')],
      ['Kugel Florian', kugel('florian')],
    ] as const) {
      const abl = maulAbl(d);
      const liste = zahnListe(zaehneStandard(abl));
      const mel = pruefe(abl, liste, [0, 0.25]);
      console.log(`${name}: ${liste.length} Zähne, ${mel.length} Befunde`);
      expect(mel, name).toEqual([]);
    }
  }, 120_000);

  it('zu langer Zahn: stößt geschlossen in den Gegenkiefer, „kürzen“ behebt es, nichts wird still geändert', () => {
    const abl = maulAbl(kugel('gleich'));
    const reihen: Zaehne = { oben: zahnreiheVerteilen(4, 'oben', 0.06), unten: zahnreiheVerteilen(0, 'unten', 0.03) };
    const vorher = JSON.stringify(reihen);
    const m = pruefe(abl, zahnListe(reihen), [0]).find((x) => x.kiefer === 'oben' && x.index === 0)!;
    expect(m.befund.art).toBe('durchKiefer');
    expect(m.oeffnung).toBe(0);
    expect(m.befund.tiefe * PX).toBeGreaterThan(5);
    // die Zahnreihen sind unverändert (die Verteilung kürzt nach hinten: Länge × (1 − 0,45 u))
    expect(JSON.stringify(reihen)).toBe(vorher);
    expect(reihen.oben.zaehne[0]!.laenge).toBeCloseTo(0.06 * (1 - 0.45 * reihen.oben.zaehne[0]!.u), 12);
    const kurz = m.befund.vorschlaege!.find((v) => v.text.startsWith('kürzen'))!;
    expect(kurz).toBeDefined();
    const neu: Zaehne = { ...reihen, oben: { ...reihen.oben, zaehne: reihen.oben.zaehne.map((e, i) => (i === 0 ? zahnAenderungAnwenden(e, kurz.aenderung) : e)) } };
    console.log(`zu lang: ${(m.befund.tiefe * PX).toFixed(1)} px, Vorschläge: ${m.befund.vorschlaege!.map((v) => v.text).join(' | ')}`);
    expect(pruefe(abl, zahnListe(neu), [0]).filter((x) => x.kiefer === 'oben' && x.index === 0)).toEqual([]);
  }, 60_000);

  it('Zähne dürfen sich überschneiden (Florian 15.10.: „das macht ein Maul erst aus“): breite Nachbarn und ein Zahn vor dem anderen geben keinen Befund', () => {
    const abl = maulAbl(kugel('gleich'));
    const zf = zahnfleischKern(abl, abl.fein);
    // 15 Zähne auf der großen Kugel: Abstand ≈ 24 px, Breite 37 px — benachbarte Zähne stecken ineinander
    const oben = zahnreiheVerteilen(15, 'oben', 0.012);
    const leer = { anzahl: 0, zaehne: [] };
    const breit = { ...oben, zaehne: oben.zaehne.map((e) => ({ ...e, breite: 0.08 })) };
    const rechts = zahnListe({ oben: breit, unten: leer })
      .filter((q) => q.zahn.seite >= 0)
      .map((q) => zahnGitter(q.zahn, zf.oben, 0).wurzel);
    const abstand = Math.min(...rechts.slice(1).map((w, i) => ab(w, rechts[i]!)));
    console.log(`Ansätze ${(abstand * PX).toFixed(1)} px auseinander, Breite ${(0.08 * PX).toFixed(1)} px`);
    // je Zahn ±½ Breite um den Ansatz: Abstand < Breite = sie überschneiden sich
    expect(abstand).toBeLessThan(0.7 * 0.08);
    const arten = (r: Zaehne) => pruefe(abl, zahnListe(r), [0, 0.25]).map((x) => `${x.kiefer}:${x.index}:${x.befund.art}`);
    expect(arten({ oben: breit, unten: leer })).toEqual(arten({ oben, unten: leer }));
    // ein Zahn halb vor seinem Nachbarn (vor/zurück): ebenfalls kein Befund
    const versetzt = { ...breit, zaehne: breit.zaehne.map((e, i) => (i === 2 ? { ...e, vor: 0.004 } : e)) };
    expect(arten({ oben: versetzt, unten: leer })).toEqual(arten({ oben, unten: leer }));
  }, 60_000);

  it('außen-Zahn: über der bündigen Unterlippe frei, 35° nach innen geneigt stößt er hinein (die Rex-Fänge hängen 17 px vor dem Unterkiefer und treffen ihn auch so nicht)', () => {
    const abl = maulAbl(kugel('gleich'));
    const mitNeigung = (n: number): Zaehne => {
      const oben = zahnreiheVerteilen(4, 'oben', 0.03);
      oben.zaehne = oben.zaehne.map((e, i) => (i === 0 ? { ...e, aussen: true, neigung: n } : e));
      return { oben, unten: { anzahl: 0, zaehne: [] } };
    };
    expect(pruefe(abl, zahnListe(mitNeigung(0)), [0]).find((x) => x.kiefer === 'oben' && x.index === 0)).toBeUndefined();
    const m = pruefe(abl, zahnListe(mitNeigung(35)), [0]).find((x) => x.kiefer === 'oben' && x.index === 0)!;
    console.log(`außen, 35° nach innen: ${m.befund.art} ${(m.befund.tiefe * PX).toFixed(1)} px → ${m.befund.vorschlaege?.map((v) => v.text).join(' | ')}`);
    expect(m.befund.art).toBe('durchKiefer');
    // ein Vorschlag (Neigung zurück oder kürzen) behebt es
    const v = m.befund.vorschlaege![0]!;
    const z = mitNeigung(35);
    z.oben.zaehne[0] = zahnAenderungAnwenden(z.oben.zaehne[0]!, v.aenderung);
    expect(pruefe(abl, zahnListe(z), [0]).find((x) => x.kiefer === 'oben' && x.index === 0)).toBeUndefined();
  }, 60_000);
});
