// Plan 20.10., V5 „Linien exakt“ mit dem Querschnitt aus der Sichthülle (`ausstattung.umrisseExakt`): P-Linien als
// Käfigschleifen — eine Längslinie bekommt eine Reihe im Reihenplan, eine Querlinie einen eigenen, in die Linie gedrehten
// Ring; gemessen wie der Editor baut (Florians Ablauf aus der Startkugel). Grenzen aus den Messungen vom 21.10.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import { kanteAbtasten } from './kanten';
import { ziehen } from './ableiten';
import { abstandFlaeche, extremMessen } from './pruefen/extremMessung';
import { type ExtremKoerper, extremKoerper } from './pruefen/extremreihe';

const PX = 461;
const HUELLE = { umrisseExakt: true } as const;

function mitLinien(name: string, auswahl?: number[], haerte?: number): ExtremKoerper {
  const k = extremKoerper(name);
  const linien = (auswahl ? auswahl.map((i) => k.linien![i]!) : k.linien!).map((l) => (haerte === undefined ? l : { ...l, haerte }));
  return { ...k, linien };
}
const messen = (k: ExtremKoerper) => extremMessen(k, 'roehre', 'kugel', { zug: false, durchdringung: false, plan: HUELLE });

/** Körper ohne und mit seinen Linien bauen wie der Editor (Linien aus der Zeichenansicht auf die Haut gelegt). */
function bauMitLinien(k: ExtremKoerper) {
  const r = messen(k);
  return { ohne: r.bau, mit: r.mitLinien! };
}

/** größter Abstand (px, Seite) der feinen Punkte der Linienfalten zur gezeichneten Linie */
function faltenAbstandSeite(abl: { linienFein?: { fein: Uint32Array; linie: Uint16Array }; fein: Float64Array }, dok: Dokument): number {
  const lf = abl.linienFein;
  if (!lf) return NaN;
  const zuege = (dok.kanten ?? []).map((ka) => kanteAbtasten(ka, dok.skalierung, 48).punkte);
  let max = 0;
  for (let q = 0; q < lf.fein.length; q++) {
    const p = lf.fein[q]!;
    const x = abl.fein[3 * p]!;
    const y = abl.fein[3 * p + 1]!;
    const z = zuege[lf.linie[q]!]!;
    let best = Infinity;
    for (let i = 0; i + 1 < z.length; i++) {
      const a = z[i]!;
      const b = z[i + 1]!;
      const ex = b[0]! - a[0]!;
      const ey = b[1]! - a[1]!;
      const l2 = ex * ex + ey * ey;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - a[0]!) * ex + (y - a[1]!) * ey) / l2)) : 0;
      best = Math.min(best, Math.hypot(a[0]! + t * ex - x, a[1]! + t * ey - y));
    }
    max = Math.max(max, best * PX);
  }
  return max;
}

describe('V5 Linien als Käfigschleifen (Querschnitt aus der Sichthülle)', () => {
  it('Längslinie auf der Kugel: eine Käfigreihe genau auf der Linie, die Haut bleibt', () => {
    const r = messen(mitLinien('kugel', [0]));
    const l = r.messung.linien!;
    expect(l.arten).toEqual(['reihe']);
    expect(r.mitLinien!.bau.netz.info.linien?.[0]?.schleife).toBe(true);
    expect(l.blick).toBeLessThanOrEqual(1.2);
    // die Breitenpunkte zogen eine Linienreihe nahe der breitesten Stelle 2 px unter ihre Vorlage
    expect(l.aufHaut).toBeLessThanOrEqual(1);
    expect(l.freiMax).toBeLessThanOrEqual(5);
  }, 60_000);

  it('Zwei parallele Linien (Ei): je eine eigene Reihe, ohne Falte', () => {
    const l = messen(mitLinien('ei')).messung.linien!;
    expect(l.arten).toEqual(['reihe', 'reihe']);
    expect(l.blick).toBeLessThanOrEqual(1.5);
    expect(l.aufHaut).toBeLessThanOrEqual(1);
    expect(l.freiMax).toBeLessThanOrEqual(8);
  }, 60_000);

  it('Linienende ohne Beule: die Haut um die Enden bleibt bei der Form ohne Linien (≤ 1 px)', () => {
    // vorher sprang die Reihe hinter dem Linienende in einem Ringabstand 10 px zurück, im Zebra eine Beule
    const r = messen(mitLinien('ei'));
    const g0 = r.gezeigt;
    const gL = r.mitLinien!.gezeigt;
    const enden = r.mitLinien!.kanten.flatMap((ka) => [ka.knoten[0]!.p, ka.knoten[ka.knoten.length - 1]!.p]);
    let max = 0;
    for (const p of gL.punkte) {
      if (!enden.some((e) => Math.hypot(p[0] - e[0]!, p[1] - e[1]!, p[2] - e[2]!) < 0.04)) continue;
      max = Math.max(max, abstandFlaeche(p, g0.punkte, g0.flaechen) * PX);
    }
    expect(max).toBeLessThanOrEqual(1);
  }, 60_000);

  it('Querlinie über die Robbe: eigener Ring, in die Linie gedreht; die Form bleibt (Höhenfeld), keine Falte', () => {
    const r = messen(mitLinien('robbe', [1]));
    const l = r.messung.linien!;
    expect(l.arten).toEqual(['ring']);
    expect(l.blick).toBeLessThanOrEqual(1.2);
    // jeder gedrehte Ring rundete seinen eigenen Schnitt: Haut 12 px neben der Linie
    expect(l.aufHaut).toBeLessThanOrEqual(6);
    expect(l.freiMax).toBeLessThanOrEqual(15);
  }, 60_000);

  it('Kurze Querlinie (Kegel): Reihen rücken auf ihre Enden, die Kante entsteht', () => {
    const r = messen(mitLinien('kegel'));
    const l = r.messung.linien!;
    expect(l.arten).toEqual(['ring']);
    expect(l.blick).toBeLessThanOrEqual(1.5);
    expect(l.freiMax).toBeLessThanOrEqual(16);
  }, 60_000);

  it('Schräge Linie (Vase): verzogene Reihe statt Treppe — deckt die Linie, die Form bleibt', () => {
    const r = messen(mitLinien('vase'));
    const l = r.messung.linien!;
    expect(l.arten).toEqual(['reihe']);
    expect(l.blick).toBeLessThanOrEqual(2.5);
    expect(l.aufHaut).toBeLessThanOrEqual(1.5);
    expect(l.freiMax).toBeLessThanOrEqual(r.messung.falten.frei.max + 1);
    // die Falte deckt mindestens 80 % der Linie (in x; die Linie liegt waagerecht über den Bauch)
    const abl = r.mitLinien!.bau.stand.abl;
    const lf = abl.linienFein!;
    let x0 = Infinity;
    let x1 = -Infinity;
    for (let q = 0; q < lf.fein.length; q++) {
      x0 = Math.min(x0, abl.fein[3 * lf.fein[q]!]!);
      x1 = Math.max(x1, abl.fein[3 * lf.fein[q]!]!);
    }
    const kn = r.mitLinien!.kanten[0]!.knoten;
    const lx = kn.map((k) => k.p[0]! * r.mitLinien!.bau.dok.skalierung);
    expect((x1 - x0) / (Math.max(...lx) - Math.min(...lx))).toBeGreaterThanOrEqual(0.8);
  }, 60_000);

  it('Härte 0 ändert nichts (bitgleich mit dem Körper ohne Linie)', () => {
    const { ohne, mit } = bauMitLinien(mitLinien('ei', undefined, 0));
    const a = ohne.stand.abl.fein;
    const b = mit.bau.stand.abl.fein;
    expect(b.length).toBe(a.length);
    let d = 0;
    for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i]! - b[i]!));
    expect(d).toBe(0);
  }, 60_000);

  it('Reihenfolge der Linien ändert nichts', () => {
    const k = extremKoerper('kugel');
    const ab = bauMitLinien(mitLinien('kugel', [0, 1])).mit.bau.stand.abl.fein;
    const ba = bauMitLinien({ ...k, linien: [k.linien![1]!, k.linien![0]!] }).mit.bau.stand.abl.fein;
    let d = 0;
    for (let i = 0; i < ab.length; i++) d = Math.max(d, Math.abs(ab[i]! - ba[i]!));
    expect(d * PX).toBeLessThanOrEqual(1e-6);
  }, 60_000);

  it('Im Zug bleibt die Kante auf der Linie (dieselbe Topologie, Falte folgt)', () => {
    const k = mitLinien('kugel', [0]);
    const { mit } = bauMitLinien(k);
    const abl = mit.bau.stand.abl;
    const dok = mit.bau.dok;
    // oberster Knoten der Seite 3 px höher (wie eine Mausbewegung)
    const s = dok.profile.seite;
    let oben = 0;
    s.knoten.forEach((kn, i) => {
      if (kn.p.y > s.knoten[oben]!.p.y) oben = i;
    });
    const knoten = s.knoten.map((kn, i) => (i === oben ? { ...kn, p: { x: kn.p.x, y: kn.p.y + 3 / PX } } : kn));
    const dokNeu: Dokument = { ...dok, skalierung: 1, profile: { ...dok.profile, seite: { ...s, knoten } } };
    const z = ziehen(abl, dokNeu);
    // dieselben scharfen Kanten
    let gleich = true;
    for (let e = 0; e < abl.kaefig.nE; e++) if (abl.kaefig.eSchaerfe[e] !== z.kaefig.eSchaerfe[e]) gleich = false;
    expect(gleich).toBe(true);
    expect(faltenAbstandSeite(z, dokNeu)).toBeLessThanOrEqual(1.5);
  }, 60_000);

  // Tore des Plans (V5), noch nicht erreicht — Register „Befunde aus V5“
  it.fails('Tor: jede Linie liegt in ihrer Zeichenansicht ≤ 0,3 px auf der Kante (Kugel, Ei, Rex, Robbe, Kegel, Vierbeiner)', () => {
    for (const name of ['kugel', 'ei', 'rex', 'robbe', 'kegel', 'vierbeiner']) expect(messen(mitLinien(name)).messung.linien!.blick, name).toBeLessThanOrEqual(0.3);
  }, 240_000);

  it.fails('Tor: die Haut an der Linie bleibt, wo sie war (≤ 0,5 px; Kugel mit Kreuzung, Robbe)', () => {
    for (const name of ['kugel', 'robbe']) expect(messen(mitLinien(name)).messung.linien!.aufHaut, name).toBeLessThanOrEqual(0.5);
  }, 120_000);
});
