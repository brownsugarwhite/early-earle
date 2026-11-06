// Form zuerst (06.11.2026), Florians Explosion: „teilweise passiert bei den einfachsten Formen schon das. Das Mesh explodiert und
// die Seite hängt sich auf.“ Nachgestellt an der Kugel mit drei Loops (Ring quer, Ring waagerecht, Mitte), wie das Fenster es tut:
// ein Zug in Stufen (je Stufe festlegen, Krümmung weitertragen, verdichten), dann ein neuer Zug von dort.
// A. Hinten weit nach hinten (Ecke), vorn nach vorn, dann die obere Kreuzung über die vordere hinaus (Überhang): vorher 150 Knicke
//    über 60° und 22 umgeklappte Dreiecke.
// B. Schnabel aus einem neuen Punkt der Mitte, dann seine Griffe herumgedreht, bis die Linie eine Schlaufe schlägt: vorher knickte
//    schon der Schnabel, an der Schlaufe 263 Knicke. Im Fenster flog die Haut dort bis 10⁴⁰ auseinander, das Verdichten machte
//    daraus 1,7 Millionen Punkte, die Seite hing zwei Minuten (`apps/editor/scripts/pruefen/form-explosion-probe.mjs`, FALL=c).
import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, type V3, hautAus } from './kurven';
import {
  type GriffVersatz,
  type Loop,
  LoopZug,
  bereichUm,
  festlegen,
  griffZiehen,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  verschiebungLaengs,
} from './loops';
import { rundAusSeite } from './rund';
import { verdichten } from './verdichten';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);
const kugel = () =>
  hautAus(
    ...((n) => [n.positionen, n.indizes] as const)(
      rundAusSeite(
        [
          { x: 150, y: 0 },
          { x: 0, y: 150 },
          { x: -150, y: 0 },
          { x: 0, y: -150 },
        ],
        { dreiecke: 6000 },
      ),
    ),
  );

/** drei Loops wie im Fenster (Seite waagerecht = Ring, Top = Mitte, Seite senkrecht = Ring), eingesetzt, Kreuzungen als Punkte */
function dreiLoops(): { h: Haut; loops: Loop[] } {
  let h = kugel();
  let loops: Loop[] = [];
  for (const [a, A, B] of [
    ['seite', [-200, 0], [200, 0]],
    ['top', [-200, 0], [200, 0]],
    ['seite', [10, 200], [10, -200]],
  ] as const) {
    loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
    const r = loopEinsetzen(h, loops, loops.length - 1)!;
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
  return { h, loops };
}

type Stand = { h: Haut; loops: Loop[] };
const lage = (L: Float64Array, j: number): V3 => ({ x: L[3 * j]!, y: L[3 * j + 1]!, z: L[3 * j + 2]! });
const abstand = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/**
 * Einflussbereich wie im Fenster: die Stücke um die bewegten Punkte bis zu ihren Nachbarpunkten, Radius mindestens der halbe
 * Abstand zum ferneren Nachbarn und so weit, wie der Zug schon reicht.
 */
function bereich(st: Stand, punkte: readonly { li: number; k: number }[], weite: number, MK: number): Uint8Array {
  let r = Math.max(2 * MK, weite);
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  for (const { li, k } of punkte) {
    const l = st.loops[li]!;
    const P = l.punkte;
    const zu = l.art !== 'ring';
    const s0 = k > 0 ? P[k - 1]!.s : zu ? P[P.length - 1]!.s - l.laenge : 0;
    const s1 = k < P.length - 1 ? P[k + 1]!.s : zu ? P[0]!.s + l.laenge : l.laenge;
    for (let j = 0; j < l.proben.length; j++) {
      const sj = l.s[j]!;
      if (!((sj > s0 && sj < s1) || (zu && (sj - l.laenge > s0 || sj + l.laenge < s1)))) continue;
      if (j % 2 === 0) bewegt.push(lage(l.ruhe, j));
      for (const v of l.proben[j]!.ecken) ecken.add(v);
    }
    const vor = k > 0 ? P[k - 1]!.ref : zu ? P[P.length - 1]!.ref : lage(l.ruhe, 0);
    const nach = k < P.length - 1 ? P[k + 1]!.ref : zu ? P[0]!.ref : lage(l.ruhe, l.proben.length - 1);
    r = Math.max(r, 0.5 * Math.max(abstand(P[k]!.ref, vor), abstand(P[k]!.ref, nach)));
  }
  return bereichUm(st.h, bewegt, r, ecken);
}

/**
 * Ein Zug wie im Fenster: `verschiebung` liefert je Loop die Verschiebung seiner Proben für einen Anteil des Zugs, `punkte` die
 * bewegten Punkte (für den Einflussbereich); gelöst in `stufen` Stufen, je Stufe vier Mausschritte (zwei Runden), am Ende vier
 * Runden, dann festlegen, Krümmung weitertragen, verdichten. Der Bereich wächst mit dem Zug.
 */
function zug(
  st: Stand,
  punkte: (loops: Loop[]) => { li: number; k: number }[],
  verschiebung: (loops: Loop[], anteil: number) => (Float64Array | null)[],
  stufen: number,
  weg: number,
  MK: number,
): void {
  for (let s = 0; s < stufen; s++) {
    const z = new LoopZug(st.h, st.loops, bereich(st, punkte(st.loops), (weg * s) / stufen, MK));
    const ziel = verschiebung(st.loops, 1 / stufen);
    for (let k = 1; k <= 4; k++) z.schritt(ziel.map((d) => d && d.map((x) => (x * k) / 4)), 2);
    z.schritt(ziel, 4);
    z.kruemmungFestlegen(st.loops);
    for (const l of st.loops) festlegen(st.h, l);
    const v = verdichten(st.h, st.loops, 1.75 * MK);
    if (v) {
      st.h = v.haut;
      st.loops = v.loops;
    }
  }
}

/** Knicke zwischen Nachbardreiecken über 60°, umgeklappte Dreiecke (gegen die Normale ihrer Ecken), größte Koordinate */
function vermessen(h: Haut): { ueber60: number; umgeklappt: number; weit: number } {
  const P = h.pos;
  const T = h.tri;
  const fn: number[][] = [];
  const vn = new Float64Array(P.length);
  for (let t = 0; t < T.length; t += 3) {
    const [a, b, c] = [T[t]!, T[t + 1]!, T[t + 2]!];
    const ab = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
    const ac = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
    const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    fn.push(f);
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + f[k]!;
  }
  let umgeklappt = 0;
  for (let t = 0; t < T.length; t += 3) {
    const f = fn[t / 3]!;
    const m = [0, 1, 2].map((k) => vn[3 * T[t]! + k]! + vn[3 * T[t + 1]! + k]! + vn[3 * T[t + 2]! + k]!);
    if (f[0]! * m[0]! + f[1]! * m[1]! + f[2]! * m[2]! < 0) umgeklappt++;
  }
  const kanten = new Map<number, number[]>();
  for (let t = 0; t < T.length / 3; t++)
    for (let e = 0; e < 3; e++) {
      const a = T[3 * t + e]!;
      const b = T[3 * t + ((e + 1) % 3)]!;
      const k = Math.min(a, b) * h.n + Math.max(a, b);
      kanten.set(k, [...(kanten.get(k) ?? []), t]);
    }
  let ueber60 = 0;
  const einheit = (f: number[]) => {
    const l = Math.hypot(f[0]!, f[1]!, f[2]!) || 1;
    return f.map((x) => x / l);
  };
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const p = einheit(fn[ts[0]!]!);
    const q = einheit(fn[ts[1]!]!);
    if (p[0]! * q[0]! + p[1]! * q[1]! + p[2]! * q[2]! < 0.5) ueber60++;
  }
  let weit = 0;
  for (let i = 0; i < P.length; i++) weit = Math.max(weit, Math.abs(P[i]!));
  return { ueber60, umgeklappt, weit };
}

/** Verschiebung der Proben eines Loops, wenn Punkt i um D geht (die anderen bleiben) */
const punktZug = (l: Loop, i: number, D: V3): Float64Array => {
  const d = verschiebungLaengs(
    l,
    l.punkte.map((_, k) => (k === i ? D : { x: 0, y: 0, z: 0 })),
  );
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  return d;
};

describe('Weite Züge: die Haut verknittert nicht und fliegt nicht auseinander', () => {
  it('A: hinten weit nach hinten (Ecke), vorn nach vorn, dann die obere Kreuzung über die vordere hinaus (Überhang)', () => {
    const MK = mittlereKante(kugel());
    const st: Stand = dreiLoops();
    /** eine Kreuzung um D ziehen (in allen Loops, die sie tragen), in Stufen */
    const kreuzungZiehen = (kreuzung: number, D: V3, stufen: number) =>
      zug(
        st,
        (loops) => loops.flatMap((l, li) => l.punkte.flatMap((p, k) => (p.kreuzung === kreuzung ? [{ li, k }] : []))),
        (loops, anteil) =>
          loops.map((l) => {
            const i = l.punkte.findIndex((p) => p.kreuzung === kreuzung);
            return i < 0 ? null : punktZug(l, i, { x: D.x * anteil, y: D.y * anteil, z: 0 });
          }),
        stufen,
        Math.hypot(D.x, D.y),
        MK,
      );
    const mitte = () => st.loops.find((l) => l.art === 'mitte')!;
    const kreuzungBei = (wahl: (p: V3) => number) => mitte().punkte.reduce((b, p) => (wahl(p.ref) > wahl(b.ref) ? p : b)).kreuzung!;
    const hinten = kreuzungBei((p) => p.x);
    kreuzungZiehen(hinten, { x: 150, y: 0, z: 0 }, 2);
    for (const l of st.loops) for (const p of l.punkte) if (p.kreuzung === hinten) p.ecke = true;
    kreuzungZiehen(kreuzungBei((p) => -p.x), { x: -100, y: 0, z: 0 }, 2);
    // die obere Kreuzung: Mitte und senkrechter Ring treffen sich oben
    kreuzungZiehen(kreuzungBei((p) => p.y), { x: -300, y: -20, z: 0 }, 5);
    const m = vermessen(st.h);
    log(`A Überhang: ${st.h.n} Punkte, Knicke über 60° ${m.ueber60}, umgeklappt ${m.umgeklappt}, größte Koordinate ${m.weit.toFixed(0)}`);
    expect(m.weit).toBeLessThan(400);
    expect(m.umgeklappt).toBeLessThanOrEqual(2);
    expect(m.ueber60).toBeLessThanOrEqual(6);
  });

  it('B: Schnabel, dann seine Griffe herumgedreht, bis die Linie eine Schlaufe schlägt', () => {
    const MK = mittlereKante(kugel());
    const st: Stand = dreiLoops();
    const mitte = st.loops.find((l) => l.art === 'mitte')!;
    // neuer Punkt auf der Mitte zwischen oben und vorn, weit nach vorn gezogen
    let s0 = 0;
    let best = Infinity;
    for (let j = 0; j < mitte.proben.length; j++) {
      const d = Math.hypot(mitte.ruhe[3 * j]! + 106, mitte.ruhe[3 * j + 1]! - 106);
      if (d < best) {
        best = d;
        s0 = mitte.s[j]!;
      }
    }
    punktEinfuegen(mitte, s0);
    // die Spitze ist der neue Punkt (Verdichten lässt die Stellen der Punkte, wie sie sind)
    const spitze = (l: Loop) => l.punkte.findIndex((p) => Math.abs(p.s - s0) < 1e-9);
    const mitteNr = (loops: Loop[]) => loops.findIndex((l) => l.art === 'mitte');
    zug(
      st,
      (loops) => [{ li: mitteNr(loops), k: spitze(loops[mitteNr(loops)]!) }],
      (loops, anteil) => loops.map((l) => (l.art === 'mitte' ? punktZug(l, spitze(l), { x: -200 * anteil, y: -50 * anteil, z: 0 }) : null)),
      3,
      Math.hypot(200, 50),
      MK,
    );
    const nachSchnabel = vermessen(st.h);
    // die Griffe an der Spitze herumdrehen (wie mit der Maus: erst „aus“, dann „ein“)
    for (const [seite, D] of [
      ['aus', { x: 160, y: -140, z: 0 }],
      ['ein', { x: -60, y: -160, z: 0 }],
    ] as const) {
      const l = st.loops.find((q) => q.art === 'mitte')!;
      const i = spitze(l);
      const v: GriffVersatz = griffZiehen(l, l.ruhe, i, seite, D);
      zug(
        st,
        (loops) => [{ li: mitteNr(loops), k: spitze(loops[mitteNr(loops)]!) }],
        (loops, anteil) =>
          loops.map((q) => {
            if (q.art !== 'mitte') return null;
            const teil: GriffVersatz = {};
            for (const g of ['ein', 'aus'] as const) {
              const w = v[g];
              if (w) teil[g] = { x: w.x * anteil, y: w.y * anteil, z: w.z * anteil };
            }
            const d = verschiebungLaengs(
              q,
              q.punkte.map(() => ({ x: 0, y: 0, z: 0 })),
              q.punkte.map((_, k) => (k === spitze(q) ? teil : undefined)),
            );
            for (let j = 0; j < q.proben.length; j++) d[3 * j + 2] = 0;
            return d;
          }),
        1,
        0,
        MK,
      );
    }
    const m = vermessen(st.h);
    log(
      `B Schnabel: Knicke über 60° ${nachSchnabel.ueber60}, umgeklappt ${nachSchnabel.umgeklappt}; ` +
        `Schlaufe: ${st.h.n} Punkte, Knicke über 60° ${m.ueber60}, umgeklappt ${m.umgeklappt}, größte Koordinate ${m.weit.toFixed(0)}`,
    );
    expect(nachSchnabel.ueber60).toBe(0);
    expect(nachSchnabel.umgeklappt).toBe(0);
    // eine Schlaufe faltet die Haut, wo die Linie sich kreuzt (vorher 263 Knicke über 60°, 68 umgeklappt); auseinanderfliegen darf
    // sie nicht
    expect(m.ueber60).toBeLessThanOrEqual(30);
    expect(m.weit).toBeLessThan(500);
    expect(st.h.n).toBeLessThan(12000);
  });
});
