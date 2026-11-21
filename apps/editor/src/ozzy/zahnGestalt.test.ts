// Ozzy, ein Zahn als kleine Form (Etappe 7): die Rechnung in `zahnGestalt.ts`.
import { describe, expect, it } from 'vitest';
import { punktAufStueck, stueckZwischen } from '@ee/shape/zeichnen';
import { punktEinsetzen } from '../linien/netz';
import { ZAHN_FORMEN, zahnNetz } from '../maulstudie/zahn';
import { type Abbildung, type ZahnGestalt, gestaltAlsNetz, gestaltAngleichen, gestaltAusForm, gestaltAusNetz, gestaltBau, gestaltNetz, gestaltOhneAnker, gestaltUmriss, netzGemischt } from './zahnGestalt';

/** Abstand eines Punkts von einem Dreieck (nächster Punkt nach Ericson) */
function abstandDreieck(p: number[], a: number[], b: number[], c: number[]): number {
  const sub = (u: number[], v: number[]): number[] => [u[0]! - v[0]!, u[1]! - v[1]!, u[2]! - v[2]!];
  const dot = (u: number[], v: number[]): number => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  const zu = (q: number[]): number => Math.hypot(...sub(p, q));
  if (d1 <= 0 && d2 <= 0) return zu(a);
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return zu(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3 || 1);
    return zu([a[0]! + v * ab[0]!, a[1]! + v * ab[1]!, a[2]! + v * ab[2]!]);
  }
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return zu(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6 || 1);
    return zu([a[0]! + w * ac[0]!, a[1]! + w * ac[1]!, a[2]! + w * ac[2]!]);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6) || 1);
    return zu([b[0]! + w * (c[0]! - b[0]!), b[1]! + w * (c[1]! - b[1]!), b[2]! + w * (c[2]! - b[2]!)]);
  }
  const de = 1 / (va + vb + vc || 1);
  const v = vb * de;
  const w = vc * de;
  return zu([a[0]! + ab[0]! * v + ac[0]! * w, a[1]! + ab[1]! * v + ac[1]! * w, a[2]! + ab[2]! * v + ac[2]! * w]);
}
/** der größte Abstand der Punkte von `P` zur Fläche (`Q`, `idx`) */
function nebenFlaeche(P: ArrayLike<number>, Q: ArrayLike<number>, idx: ArrayLike<number>): number {
  let max = 0;
  const q = (i: number): number[] => [Q[3 * i]!, Q[3 * i + 1]!, Q[3 * i + 2]!];
  for (let i = 0; i < P.length; i += 3) {
    const p = [P[i]!, P[i + 1]!, P[i + 2]!];
    let best = Infinity;
    for (let t = 0; t < idx.length; t += 3) best = Math.min(best, abstandDreieck(p, q(idx[t]!), q(idx[t + 1]!), q(idx[t + 2]!)));
    max = Math.max(max, best);
  }
  return max;
}
const vorlage = (nr: number): { pos: Float32Array; idx: number[] } => {
  const geo = zahnNetz(ZAHN_FORMEN[nr]!.form, false);
  const r = { pos: Float32Array.from(geo.getAttribute('position').array), idx: Array.from(geo.getIndex()!.array) };
  geo.dispose();
  return r;
};

describe('ein Zahn als kleine Form (Etappe 7)', () => {
  it('jede Vorlage als Linien: gleich viele Punkte und Dreiecke, höchstens 0,03 neben ihrem Netz, mit wenigen Ankern', () => {
    for (let nr = 0; nr < ZAHN_FORMEN.length; nr++) {
      const g = gestaltAusForm(ZAHN_FORMEN[nr]!.form);
      const v = vorlage(nr);
      const n = gestaltNetz(g);
      expect(n.pos.length, ZAHN_FORMEN[nr]!.name).toBe(v.pos.length);
      expect(n.idx.length).toBe(v.idx.length);
      expect(Array.from(n.pos).every(Number.isFinite)).toBe(true);
      expect(nebenFlaeche(n.pos, v.pos, v.idx), `${ZAHN_FORMEN[nr]!.name}: Gestalt neben der Vorlage`).toBeLessThan(0.03);
      expect(nebenFlaeche(v.pos, n.pos, n.idx), `${ZAHN_FORMEN[nr]!.name}: Vorlage neben der Gestalt`).toBeLessThan(0.03);
      // wenige Anker (er will die allernötigsten): von vorn und von der Seite höchstens sieben, quer höchstens acht
      expect(g.vorn.length, `${ZAHN_FORMEN[nr]!.name}: Anker von vorn`).toBeLessThanOrEqual(7);
      expect(g.seite.length).toBeLessThanOrEqual(7);
      expect(g.quer.length).toBeLessThanOrEqual(8);
      // die Länge der Krone und ihre Tiefe wie bei der Vorlage (danach richten sich Spalt und Körper)
      expect(Math.abs(n.laenge - Math.max(...Array.from(v.pos).filter((_, i) => i % 3 === 1)))).toBeLessThan(0.03);
    }
  });

  /** eine Gestalt, die keine Vorlage kann: die Spitze als Haken nach rechts unten, links eine Zacke, quer eine Niere */
  const haken = (): ZahnGestalt => {
    const g = gestaltAusForm(ZAHN_FORMEN[1]!.form);
    const vorn = g.vorn.map((a) => ({ ...a }));
    vorn[g.spitzeV] = { x: 0.55, y: 1.1, ein: { x: -0.5, y: 0.55 }, aus: { x: -0.05, y: -0.2 }, ecke: true };
    vorn.splice(g.spitzeV, 0, { x: -0.5, y: 1.2, ein: { x: 0.05, y: -0.1 }, aus: { x: 0.1, y: 0.15 }, ecke: true });
    return gestaltAngleichen({ ...g, vorn, spitzeV: g.spitzeV + 1 }, 'vorn');
  };

  it('alle drei Linien liegen auf der Haut (auch mit Haken und Zacke), und das Zahnfleisch ist eben', () => {
    for (const g of [gestaltAusForm(ZAHN_FORMEN[2]!.form), haken()]) {
      const b = gestaltBau(g, 24, 40);
      expect(Array.from(b.pos).every(Number.isFinite)).toBe(true);
      const an = (i: number, k: number): number[] => [b.pos[3 * (i * b.seg + k)]!, b.pos[3 * (i * b.seg + k) + 1]!, b.pos[3 * (i * b.seg + k) + 2]!];
      // die Linie von vorn: Die Punkte links und rechts jedes Rings liegen (in x und y) auf ihr; die von der Seite in z und y
      const aufLinie = (anker: ZahnGestalt['vorn'], x: number, y: number): number => {
        let best = Infinity;
        for (let i = 0; i + 1 < anker.length; i++) {
          const s = stueckZwischen(anker[i]!, anker[i + 1]!);
          for (let k = 0; k <= 2000; k++) {
            const p = punktAufStueck(s, k / 2000);
            best = Math.min(best, Math.hypot(p.x - x, p.y - y));
          }
        }
        return best;
      };
      for (let i = 0; i < b.ringe; i++) {
        const l = an(i, b.seg / 2);
        const r = an(i, 0);
        const v = an(i, b.seg / 4);
        const h = an(i, (3 * b.seg) / 4);
        expect(aufLinie(g.vorn, l[0]!, l[1]!)).toBeLessThan(2e-3);
        expect(aufLinie(g.vorn, r[0]!, r[1]!)).toBeLessThan(2e-3);
        expect(aufLinie(g.seite, v[2]!, v[1]!)).toBeLessThan(2e-3);
        expect(aufLinie(g.seite, h[2]!, h[1]!)).toBeLessThan(2e-3);
      }
      // der erste Ring ist die Linie quer, in der Ebene des Zahnfleischs; der letzte liegt in der Spitze
      for (let k = 0; k < b.seg; k++) {
        expect(Math.abs(an(0, k)[1]!)).toBeLessThan(1e-9);
        expect(Math.hypot(an(b.ringe - 1, k)[0]! - g.vorn[g.spitzeV]!.x, an(b.ringe - 1, k)[1]! - g.vorn[g.spitzeV]!.y)).toBeLessThan(1e-6);
      }
      const [r, v, l, h] = g.ecken;
      expect(an(0, 0)[0]).toBeCloseTo(g.quer[r]!.x, 6);
      expect(an(0, b.seg / 4)[2]).toBeCloseTo(g.quer[v]!.y, 6);
      expect(an(0, b.seg / 2)[0]).toBeCloseTo(g.quer[l]!.x, 6);
      expect(an(0, (3 * b.seg) / 4)[2]).toBeCloseTo(g.quer[h]!.y, 6);
    }
    // der Haken ragt über das Zahnfleisch hinaus zur Seite und hat eine Zacke: Das kann keine Vorlage
    const n = gestaltNetz(haken());
    let rechts = -Infinity;
    for (let i = 0; i < n.pos.length; i += 3) rechts = Math.max(rechts, n.pos[i]!);
    expect(rechts).toBeGreaterThan(0.5);
  });

  it('die geteilten Punkte: Die geänderte Linie gibt vor, die anderen folgen; die Punkte am Zahnfleisch bleiben auf seiner Höhe', () => {
    const g = gestaltAusForm(ZAHN_FORMEN[0]!.form);
    // die Spitze von vorn höher und ein Punkt am Zahnfleisch nach außen und nach oben gezogen
    const vorn = g.vorn.map((a) => ({ ...a }));
    vorn[g.spitzeV] = { ...vorn[g.spitzeV]!, y: 2.2 };
    vorn[0] = { ...vorn[0]!, x: -0.7, y: 0.3 };
    const a = gestaltAngleichen({ ...g, vorn }, 'vorn');
    expect(a.seite[a.spitzeS]!.y).toBe(2.2);
    expect(a.vorn[0]!.y).toBe(0);
    expect(a.quer[a.ecken[2]]!.x).toBe(-0.7);
    // von der Seite: die Spitze niedriger, vorn am Zahnfleisch weiter zur Lippe
    const seite = a.seite.map((q) => ({ ...q }));
    seite[a.spitzeS] = { ...seite[a.spitzeS]!, y: 1.0 };
    seite[seite.length - 1] = { ...seite[seite.length - 1]!, x: 0.6 };
    const b = gestaltAngleichen({ ...a, seite }, 'seite');
    expect(b.vorn[b.spitzeV]!.y).toBe(1.0);
    expect(b.quer[b.ecken[1]]!.y).toBe(0.6);
    // quer: der linke Anker nach innen: Die Linie von vorn folgt
    const quer = b.quer.map((q) => ({ ...q }));
    quer[b.ecken[2]] = { ...quer[b.ecken[2]]!, x: -0.3 };
    const c = gestaltAngleichen({ ...b, quer }, 'quer');
    expect(c.vorn[0]!.x).toBe(-0.3);
    // nichts wird am Ort geändert
    expect(g.vorn[0]!.x).not.toBe(-0.7);
    // die geteilten Anker lassen sich nicht löschen, andere schon
    expect(gestaltOhneAnker(c, 'vorn', c.spitzeV)).toBeNull();
    expect(gestaltOhneAnker(c, 'vorn', 0)).toBeNull();
    expect(gestaltOhneAnker(c, 'quer', c.ecken[0])).toBeNull();
    const frei = c.vorn.findIndex((_, i) => i > 0 && i < c.vorn.length - 1 && i !== c.spitzeV);
    if (frei > 0) {
      const d = gestaltOhneAnker(c, 'vorn', frei)!;
      expect(d.vorn.length).toBe(c.vorn.length - 1);
      expect(d.vorn[d.spitzeV]!.y).toBe(c.vorn[c.spitzeV]!.y);
    }
  });

  it('als Netz der Linien-Anzeige und zurück: dieselbe Gestalt; ein Punkt mit P bleibt, die Spitze behält ihre Nummer', () => {
    const g = gestaltAusForm(ZAHN_FORMEN[5]!.form);
    // (gespiegelt und gestreckt, wie die Linse die Linie von der Seite zeigt)
    const A: Abbildung = { ax: -40, ay: 0, bx: 0, by: -40, ox: 120, oy: 180 };
    for (const linie of ['vorn', 'seite', 'quer'] as const) {
      const { netz, fest } = gestaltAlsNetz(g, linie, A);
      const z = gestaltAusNetz(g, linie, netz, fest, A)!;
      const alt = linie === 'vorn' ? g.vorn : linie === 'seite' ? g.seite : g.quer;
      const neu = linie === 'vorn' ? z.vorn : linie === 'seite' ? z.seite : z.quer;
      expect(neu.length).toBe(alt.length);
      for (let i = 0; i < alt.length; i++) {
        expect(neu[i]!.x).toBeCloseTo(alt[i]!.x, 9);
        expect(neu[i]!.y).toBeCloseTo(alt[i]!.y, 9);
        expect(neu[i]!.ecke).toBe(alt[i]!.ecke);
      }
      // dieselbe Haut
      const a = gestaltNetz(g).pos;
      const b = gestaltNetz(z).pos;
      let max = 0;
      for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i]! - b[i]!));
      expect(max, linie).toBeLessThan(1e-6);
      // P setzt einen Punkt auf das erste Stück: ein Anker mehr, die Linie bleibt, die geteilten Punkte bleiben die geteilten
      punktEinsetzen(netz, 0, 0, 0.4);
      const p = gestaltAusNetz(g, linie, netz, fest, A)!;
      const mit = linie === 'vorn' ? p.vorn : linie === 'seite' ? p.seite : p.quer;
      expect(mit.length).toBe(alt.length + 1);
      if (linie === 'vorn') expect(p.vorn[p.spitzeV]!.y).toBeCloseTo(g.vorn[g.spitzeV]!.y, 9);
      if (linie === 'quer') expect(p.quer[p.ecken[2]]!.x).toBeCloseTo(g.quer[g.ecken[2]]!.x, 9);
      // (durch den neuen Anker geht ein Ring: Die Ringe rücken auf der Haut, die Haut bleibt bis auf die Abtastung)
      const c = gestaltNetz(p);
      expect(nebenFlaeche(c.pos, a, gestaltNetz(g).idx), `${linie} mit Punkt`).toBeLessThan(0.02);
    }
  });

  it('der weiche Wechsel zwischen Vorlage und eigener Form und das Zeichen am Formenring', () => {
    const g = gestaltAusForm(ZAHN_FORMEN[3]!.form);
    const a = gestaltNetz(g);
    const b = gestaltNetz(gestaltAusForm(ZAHN_FORMEN[6]!.form));
    const m = netzGemischt(a, b, 0.5);
    expect(m.pos.length).toBe(a.pos.length);
    expect(m.laenge).toBeCloseTo(0.5 * (a.laenge + b.laenge), 9);
    expect(netzGemischt(a, b, 0).pos[4]).toBeCloseTo(a.pos[4]!, 9);
    expect(gestaltUmriss(g, 17)).toMatch(/^M-?[\d.]+,-?[\d.]+C.*Z$/);
  });
});
