import { describe, expect, it } from 'vitest';
import { kantenTeilenMit, loopEinsetzen } from './einsetzen';
import { knickBruecken } from './kantenWinkel';
import { falten } from './kurvenFaelle';
import { type Haut, type V3, hautAus } from './kurven';
import { type Loop, griffeAnlegen, griffeNach, mittlereKante, pfadLagen, punktEinfuegen } from './loops';
import { maulFormen } from './maulFormen';
import { MAUL_LINIE_WINKEL, istMaulLinie, maulLinieAusZeichnung, obereLippe, zwillinge, zwillingeAngleichen, zwillingeFestlegen, zwillingeSetzen, zwillingsFehler, zwillingsWinkel } from './maulLinie';
import { maulGeformtAmLoop } from './maulLoop';
import { knochenDrehen, knochenWinkel } from './poseLoop';
import { rundAusSeite } from './rund';
import type { UmrissPunkt } from './umriss';

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const lage = (P: ArrayLike<number>, v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
const kugel = (dreiecke = 2000): Haut => {
  const netz = rundAusSeite(kreis(150), { dreiecke });
  return hautAus(netz.positionen, netz.indizes);
};
/** eine Linie in der Seite: von vor dem Umriss (x = −178) bis zum Mundwinkel (x = −55), leicht geschwungen; `knoten`: ein Punkt in der Mitte */
function linieSeite(): { uv: [number, number][]; knoten: number[] } {
  const N = 24;
  const uv = Array.from({ length: N + 1 }, (_, i): [number, number] => {
    const f = i / N;
    return [-178 + f * 123, -20 + 6 * Math.sin(Math.PI * Math.max(0, (f - 0.24) / 0.76))];
  });
  return { uv, knoten: [Math.round(0.6 * N)] };
}
/** die Linie anlegen, einsetzen, Griffe anlegen und die Unterlippe genau als Abbild der Oberlippe setzen */
function maulAusLinie(h0: Haut, a: 'seite' | 'front' = 'seite'): { haut: Haut; loops: Loop[]; l: Loop; mk: number } {
  const mk = mittlereKante(h0);
  const z =
    a === 'seite'
      ? linieSeite()
      : // in der Front über die Mitte gezogen: von z = −130 nach z = +130 (um die Kugel herum bis weit auf die Seite)
        { uv: Array.from({ length: 53 }, (_, i): [number, number] => [-130 + 5 * i, -20]), knoten: [] as number[] };
  const neu = maulLinieAusZeichnung(h0, a, z.uv, z.knoten, 1, mk);
  if ('fehler' in neu) throw new Error(neu.fehler);
  const r = loopEinsetzen(h0, [neu], 0);
  if (!r) throw new Error('lässt sich nicht einsetzen');
  const l = r.loops[0]!;
  griffeAnlegen(l, l.ruhe, true);
  if (zwillingeFestlegen(l, obereLippe(l)) === null) throw new Error('keine Zwillinge');
  return { haut: r.haut, loops: r.loops, l, mk };
}

describe('Das Maul aus nur einer Linie', () => {
  it('aus der Linie in der Seite wird ein Ring: Mundwinkel als Ecke, Kante, Punkte paarweise, die Unterlippe das gedrehte Abbild', () => {
    const { l } = maulAusLinie(kugel());
    expect(istMaulLinie(l)).toBe(true);
    expect(l.maulLinie).toBe(MAUL_LINIE_WINKEL);
    expect(l.kante).toBe(true);
    const z = zwillinge(l)!;
    expect(z).not.toBeNull();
    // Enden, ein Punkt je Lippe, der Mundwinkel
    expect(l.punkte.length).toBe(5);
    expect(z.iW).toBe(2);
    const W = l.punkte[z.iW]!;
    expect(W.mundwinkel).toBe(true);
    expect(W.ecke).toBe(true);
    // der Mundwinkel liegt am freien Ende der Linie
    expect(Math.hypot(W.ref.x + 55, W.ref.y + 20)).toBeLessThan(1.5);
    expect(zwillingsFehler(l, obereLippe(l))!).toBeLessThan(1e-9);
    // die Enden des Rings: beide auf der Mittelebene, um den Winkel auseinander, die geführte Lippe unten
    const A = l.punkte[0]!.ref;
    const B = l.punkte[4]!.ref;
    expect(Math.abs(A.z)).toBeLessThan(1e-9);
    expect(Math.abs(B.z)).toBeLessThan(1e-9);
    const [oben, unten] = obereLippe(l) === 'erste' ? [A, B] : [B, A];
    expect(unten.y).toBeLessThan(oben.y - 20);
    const w = (p: V3) => Math.atan2(p.y - W.ref.y, p.x - W.ref.x);
    let d = Math.abs(w(A) - w(B));
    if (d > Math.PI) d = 2 * Math.PI - d;
    expect((d * 180) / Math.PI).toBeCloseTo(MAUL_LINIE_WINKEL, 6);
    expect(Math.abs(zwillingsWinkel(l)!)).toBeCloseTo((MAUL_LINIE_WINKEL * Math.PI) / 180, 12);
    // die beiden Lippen sind als Kurven Abbilder: jede Stelle des Pfads der einen liegt gedreht auf dem der anderen
    const pfad = pfadLagen(l)!;
    const n = l.proben.length;
    const a = zwillingsWinkel(l)!;
    const dreh = (p: V3, s: number): V3 => {
      const c = Math.cos(s);
      const si = Math.sin(s);
      const dx = p.x - W.ref.x;
      const dy = p.y - W.ref.y;
      return { x: W.ref.x + c * dx - si * dy, y: W.ref.y + si * dx + c * dy, z: p.z };
    };
    const erste: V3[] = [];
    const zweite: V3[] = [];
    for (let j = 0; j < n; j++) (l.s[j]! <= W.s ? erste : zweite).push(lage(pfad, j));
    const zur = (q: V3, Z: readonly V3[]): number => {
      let best = Infinity;
      for (let i = 0; i + 1 < Z.length; i++) {
        const u = Z[i]!;
        const v = Z[i + 1]!;
        const uv = { x: v.x - u.x, y: v.y - u.y, z: v.z - u.z };
        const t = Math.max(0, Math.min(1, ((q.x - u.x) * uv.x + (q.y - u.y) * uv.y + (q.z - u.z) * uv.z) / (uv.x * uv.x + uv.y * uv.y + uv.z * uv.z || 1)));
        best = Math.min(best, Math.hypot(q.x - u.x - t * uv.x, q.y - u.y - t * uv.y, q.z - u.z - t * uv.z));
      }
      return best;
    };
    const kette = [...erste, lage(pfad, erste.length)];
    for (const q of zweite) expect(zur(dreh(q, -a), kette)).toBeLessThan(0.5);
  });

  it('in der Front über die Mitte gezogen: dieselbe Art Ring, der Mundwinkel auf der Seite z > 0', () => {
    const { l } = maulAusLinie(kugel(), 'front');
    expect(istMaulLinie(l)).toBe(true);
    const z = zwillinge(l)!;
    expect(z).not.toBeNull();
    const W = l.punkte[z.iW]!;
    expect(Math.abs(W.ref.z - 130)).toBeLessThan(2);
    expect(zwillingsFehler(l, obereLippe(l))!).toBeLessThan(1e-9);
  });

  it('in der Front nur kurz über die Schnauze gezogen: Fehler (von der Seite gesehen fehlt dem Kiefer der Hebel)', () => {
    const h = kugel();
    const uv = Array.from({ length: 25 }, (_, i): [number, number] => [-60 + 5 * i, -20]);
    const r = maulLinieAusZeichnung(h, 'front', uv, [], 1, mittlereKante(h));
    expect('fehler' in r).toBe(true);
  });

  it('Fehler statt einer falschen Form: Linie ganz auf dem Körper, ganz davor, zu kurz', () => {
    const h = kugel();
    const mk = mittlereKante(h);
    const strecke = (x0: number, x1: number): [number, number][] => Array.from({ length: 20 }, (_, i): [number, number] => [x0 + ((x1 - x0) * i) / 19, -20]);
    expect('fehler' in maulLinieAusZeichnung(h, 'seite', strecke(-120, -40), [], 1, mk)).toBe(true);
    expect('fehler' in maulLinieAusZeichnung(h, 'seite', strecke(-260, -180), [], 1, mk)).toBe(true);
    expect('fehler' in maulLinieAusZeichnung(h, 'seite', strecke(-160, -140), [], 1, mk)).toBe(true);
  });

  it('ein dünner Keil lässt sich einsetzen: Die Kette reicht bis zum Mundwinkel, nichts ist umgeschlagen, das Netz bleibt spiegelgleich', () => {
    for (const [dreiecke, winkel] of [
      [2000, 20],
      [2000, 8],
      [3000, 12],
      [6000, 20],
    ] as const) {
      const h = kugel(dreiecke);
      const mk = mittlereKante(h);
      const z = linieSeite();
      const neu = maulLinieAusZeichnung(h, 'seite', z.uv, [], 1, mk, winkel);
      if ('fehler' in neu) throw new Error(neu.fehler);
      const r = loopEinsetzen(h, [neu], 0);
      expect(r, `${dreiecke} Dreiecke, ${winkel}°`).not.toBeNull();
      const H = r!.haut;
      const l = r!.loops[0]!;
      // die Kette reicht bis zum Mundwinkel (höchstens ein Stück eines Dreiecks daneben; vorher war die Spitze bis 14 abgeschnitten)
      const W = l.punkte.find((p) => p.mundwinkel)!.ref;
      let nah = Infinity;
      for (const p of l.proben) nah = Math.min(nah, Math.hypot(H.pos[3 * p.ecken[0]]! - W.x, H.pos[3 * p.ecken[0] + 1]! - W.y, H.pos[3 * p.ecken[0] + 2]! - W.z));
      expect(nah, `${dreiecke} Dreiecke, ${winkel}°`).toBeLessThan(0.35 * mk);
      expect(falten(H).umgeklappt, `${dreiecke} Dreiecke, ${winkel}°`).toBe(0);
      expect(H.spiegel.every((v) => v >= 0)).toBe(true);
      for (let v = 0; v < H.n; v++) {
        const sp = H.spiegel[v]!;
        expect(Math.abs(H.pos[3 * v]! - H.pos[3 * sp]!) + Math.abs(H.pos[3 * v + 1]! - H.pos[3 * sp + 1]!) + Math.abs(H.pos[3 * v + 2]! + H.pos[3 * sp + 2]!)).toBeLessThan(1e-6);
      }
    }
  });

  it('Kanten teilen mit den Linien: alte Punkte bleiben, die Kette einer Linie bekommt den neuen Punkt, das Netz bleibt spiegelgleich', () => {
    const { haut, loops, l } = maulAusLinie(kugel());
    // eine Kante der Linie selbst und eine Kante daneben
    const k0 = l.proben[5]!.ecken[0];
    const k1 = l.proben[6]!.ecken[0];
    const neben = haut.nachbarn[k0]!.find((v) => !l.proben.some((p) => p.ecken[0] === v) && haut.pos[3 * v + 2]! > 1)!;
    const r = kantenTeilenMit(haut, loops, [
      { u: k0, v: k1, f: 0.5 },
      { u: k0, v: neben, f: 0.3 },
    ])!;
    expect(r).not.toBeNull();
    for (let k = 0; k < haut.pos.length; k++) expect(r.haut.pos[k]).toBe(haut.pos[k]);
    // je Kante ein Punkt und sein Spiegelbild
    expect(r.haut.n).toBe(haut.n + 4);
    expect(r.haut.spiegel.every((v) => v >= 0)).toBe(true);
    expect(falten(r.haut).umgeklappt).toBe(0);
    const kette = r.loops[0]!.proben.map((p) => p.ecken[0]);
    expect(kette.length).toBe(l.proben.length + 1);
    expect(kette[5]).toBe(k0);
    expect(kette[7]).toBe(k1);
    expect(kette[6]).toBeGreaterThanOrEqual(haut.n);
    // die Stellen der alten Proben bleiben, die neue liegt dazwischen
    expect(r.loops[0]!.s[5]).toBe(l.s[5]);
    expect(r.loops[0]!.s[7]).toBe(l.s[6]);
    expect(r.loops[0]!.s[6]!).toBeGreaterThan(l.s[5]!);
    expect(r.loops[0]!.s[6]!).toBeLessThan(l.s[6]!);
  });

  it('Brücken: Nach dem Einsetzen verbindet innen keine Kante beide Lippen direkt; entstehen welche, lassen sie sich teilen', () => {
    const { haut, loops, l } = maulAusLinie(kugel());
    expect(knickBruecken(haut, l).length).toBe(0);
    // (Brücken entstehen erst, wenn später kurze Kanten zusammengelegt werden; „Maul formen“ teilt sie dann so)
    let h = haut;
    let L = loops;
    for (let g = 0; g < 4; g++) {
      const b = knickBruecken(h, L[0]!);
      if (b.length === 0) break;
      const r = kantenTeilenMit(h, L, b)!;
      expect(r).not.toBeNull();
      h = r.haut;
      L = r.loops;
    }
    expect(knickBruecken(h, L[0]!).length).toBe(0);
  });

  it('die Zwillingsregel im Zug: Ein Punkt der einen Lippe zieht seinen Zwilling mit, der Mundwinkel dreht die geführte Lippe um sich', () => {
    const { l } = maulAusLinie(kugel());
    const z = zwillinge(l)!;
    const a = zwillingsWinkel(l)!;
    const [i, j] = z.paare[0]!;
    const D = l.punkte.map(() => ({ x: 0, y: 0, z: 0 }));
    D[i] = { x: 3, y: 8, z: -2 };
    const orte = l.punkte.map((p, k) => ({ x: p.ref.x + D[k]!.x, y: p.ref.y + D[k]!.y, z: p.ref.z + D[k]!.z }));
    const griffe = griffeNach(l, D);
    expect(zwillingeSetzen(l, orte, griffe, 'erste')).toBe(true);
    const W = l.punkte[z.iW]!.ref;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const soll = { x: W.x + c * (orte[i]!.x - W.x) - s * (orte[i]!.y - W.y), y: W.y + s * (orte[i]!.x - W.x) + c * (orte[i]!.y - W.y), z: orte[i]!.z };
    expect(Math.hypot(orte[j]!.x - soll.x, orte[j]!.y - soll.y, orte[j]!.z - soll.z)).toBeLessThan(1e-9);
    // von der zweiten Lippe geführt: zurück auf die erste
    const orte2 = l.punkte.map((p) => ({ ...p.ref }));
    orte2[j] = { x: orte2[j]!.x + 5, y: orte2[j]!.y - 4, z: orte2[j]!.z + 1 };
    const griffe2 = griffeNach(
      l,
      l.punkte.map(() => ({ x: 0, y: 0, z: 0 })),
    );
    expect(zwillingeSetzen(l, orte2, griffe2, 'zweite')).toBe(true);
    const zurueck = { x: W.x + c * (orte2[j]!.x - W.x) + s * (orte2[j]!.y - W.y), y: W.y - s * (orte2[j]!.x - W.x) + c * (orte2[j]!.y - W.y), z: orte2[j]!.z };
    expect(Math.hypot(orte2[i]!.x - zurueck.x, orte2[i]!.y - zurueck.y, orte2[i]!.z - zurueck.z)).toBeLessThan(1e-9);
  });

  it('ein neuer Punkt auf einer Lippe bekommt seinen Zwilling an derselben Stelle; die Linie bleibt', () => {
    const { l } = maulAusLinie(kugel());
    const vorher = Float64Array.from(pfadLagen(l)!);
    const z0 = zwillinge(l)!;
    // ein Punkt auf der ersten Lippe, zwischen ihrem Ende und ihrem Punkt
    const P = l.punkte;
    const s = 0.4 * P[0]!.s + 0.6 * P[1]!.s;
    punktEinfuegen(l, s, undefined, true);
    expect(zwillinge(l)).toBeNull();
    expect(zwillingeAngleichen(l)).toBe(1);
    const z = zwillinge(l)!;
    expect(z).not.toBeNull();
    expect(l.punkte.length).toBe(2 * z0.iW + 3);
    expect(zwillingsFehler(l, 'erste')!).toBeLessThan(1e-6);
    const nachher = pfadLagen(l)!;
    let weit = 0;
    for (let k = 0; k < vorher.length; k++) weit = Math.max(weit, Math.abs(vorher[k]! - nachher[k]!));
    expect(weit).toBeLessThan(1e-6);
    // noch einmal: nichts mehr zu tun
    expect(zwillingeAngleichen(l)).toBe(0);
  });

  it('geformt und mit dem Kiefer zurückgedreht liegen die Lippen aufeinander; ohne `zuBis` schließt der Kiefer nicht unter die gerechnete Lage', () => {
    const { haut: h0, loops: L0, mk } = maulAusLinie(kugel());
    const r = maulFormen(h0, L0, 1, { naechsteId: 2, naechsteKreuzung: 1, verdichten: { maxKante: 1.75 * mk, opt: { kurz: 0.5 * mk, genau: mk / 40, genauHaut: true, genauFlaeche: mk / 16, flachSchutz: true } } });
    if ('fehler' in r) throw new Error(r.fehler);
    const l = r.loops.find((x) => x.id === 1)!;
    expect(l.maulGeformt).toBe(true);
    // die Kugel hat keine weitere Linie: Gerechnet wird nur im Umkreis des Mauls, hinten bleibt sie, wie sie war (über die ganze Haut
    // gerechnet blies sie sich beim Formen auf: nach zwei Stufen von 150 auf 200)
    let hinten = 0;
    let vorher = 0;
    for (let v = 0; v < h0.n; v++) if (h0.pos[3 * v]! > 60) vorher = Math.max(vorher, Math.abs(Math.hypot(h0.pos[3 * v]!, h0.pos[3 * v + 1]!, h0.pos[3 * v + 2]!) - 150));
    for (let v = 0; v < r.haut.n; v++) if (r.haut.pos[3 * v]! > 60) hinten = Math.max(hinten, Math.abs(Math.hypot(r.haut.pos[3 * v]!, r.haut.pos[3 * v + 1]!, r.haut.pos[3 * v + 2]!) - 150));
    expect(hinten).toBeLessThan(vorher + 0.5);
    // „Maul formen“ lässt die Lippen Abbilder voneinander
    expect(zwillingsFehler(l, obereLippe(l))!).toBeLessThan(1e-6);
    const W = l.punkte.find((p) => p.mundwinkel)!;
    let ecke = 1;
    for (let j = 1; j < l.proben.length - 1; j++) if (Math.abs(l.s[j]! - W.s) < Math.abs(l.s[ecke]! - W.s)) ecke = j;
    const m = maulGeformtAmLoop(r.haut, l, ecke, { zelle: mk / 2 })!;
    expect(knochenWinkel(m, { kiefer: -MAUL_LINIE_WINKEL, schaedel: 0 }).every((x) => x === 0)).toBe(true);
    const zu = knochenDrehen(r.haut.pos, knochenWinkel(m, { kiefer: -MAUL_LINIE_WINKEL, schaedel: 0 }, MAUL_LINIE_WINKEL), m.gelenk);
    const K = l.proben.map((p) => lage(zu, p.ecken[0]));
    // vorn aufeinander (so genau, wie die Rechnung die Enden auf ihrer Linie hält)
    expect(Math.hypot(K[0]!.x - K[K.length - 1]!.x, K[0]!.y - K[K.length - 1]!.y, K[0]!.z - K[K.length - 1]!.z)).toBeLessThan(1e-3);
    // und längs der ganzen Lippe so genau, wie das Netz die Linie wiedergibt
    const eine = K.slice(0, ecke + 1);
    const andere = K.slice(ecke);
    let spalt = 0;
    for (const q of andere) {
      let best = Infinity;
      for (let i = 0; i + 1 < eine.length; i++) {
        const u = eine[i]!;
        const v = eine[i + 1]!;
        const uv = { x: v.x - u.x, y: v.y - u.y, z: v.z - u.z };
        const t = Math.max(0, Math.min(1, ((q.x - u.x) * uv.x + (q.y - u.y) * uv.y + (q.z - u.z) * uv.z) / (uv.x * uv.x + uv.y * uv.y + uv.z * uv.z || 1)));
        best = Math.min(best, Math.hypot(q.x - u.x - t * uv.x, q.y - u.y - t * uv.y, q.z - u.z - t * uv.z));
      }
      spalt = Math.max(spalt, best);
    }
    expect(spalt).toBeLessThan(mk / 40 + 0.05);
  }, 120_000);
});
