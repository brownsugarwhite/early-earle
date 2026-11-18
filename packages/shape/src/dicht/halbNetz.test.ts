import { describe, expect, it } from 'vitest';
import { FISCH } from './eineLinie.fisch';
import { halbNetzVon, intrinsischeGewichte, intrinsischeGewichteHalb } from './intrinsisch';
import { type Haut, gewichteAus, hautAus, vermessen } from './kurven';
import { dreiLoops } from './kurvenFaelle';
import { type Loop, LoopZug } from './loops';

// D1 im Plan „Ozzy stabil und schnell“ (18.11.2026): Gewichte nach der Geometrie und Vermessen auf der Hälfte. Wo der Löser auf der
// Hälfte rechnet, sind die Kanten der Mittelebene in der intrinsischen Triangulierung fest (C1); jede Hälfte ist dann für sich
// trianguliert, beide gleich. Also reicht es, eine Hälfte zu triangulieren und zu vermessen: dieselben Werte mit der halben Arbeit.
// Prüfkörper: die Kugel mit drei Linien, gestreckt und gestaucht (so klappt die Triangulierung viele Kanten), genau spiegelgleich.

function koerper(): { h: Haut; loops: Loop[] } {
  const { h, loops } = dreiLoops();
  const pos = Float64Array.from(h.pos);
  for (let v = 0; v < h.n; v++) {
    const w = h.spiegel[v]!;
    const q = w >= v ? v : w;
    // gestreckt längs x, gestaucht längs y, dazu eine Welle: schmale Dreiecke
    const x = h.pos[3 * q]!;
    const y = h.pos[3 * q + 1]!;
    const z = w === v ? 0 : Math.abs(h.pos[3 * q + 2]!) * (h.pos[3 * v + 2]! < 0 ? -1 : 1);
    pos[3 * v] = 1.8 * x + 12 * Math.sin(y / 30);
    pos[3 * v + 1] = 0.45 * y;
    pos[3 * v + 2] = z;
  }
  const g: Haut = { ...h, pos };
  for (const l of loops)
    l.ruhe = Float64Array.from(
      l.proben.flatMap((p) => [0, 1, 2].map((x) => p.b[0]! * pos[3 * p.ecken[0] + x]! + p.b[1]! * pos[3 * p.ecken[1] + x]! + p.b[2]! * pos[3 * p.ecken[2] + x]!)),
    );
  return { h: g, loops };
}

describe('die Hälfte des Netzes (D1, 18.11.2026)', () => {
  it('ein spiegelgleiches Netz hat eine Hälfte: die halben Dreiecke, jeder Punkt oder sein Spiegelbild', () => {
    const { h } = koerper();
    const H = halbNetzVon(h)!;
    expect(H).not.toBeNull();
    expect(H.V.length).toBe(h.tri.length / 2);
    const drin = new Uint8Array(h.n);
    for (const v of H.punkte) drin[v] = 1;
    let mitte = 0;
    for (let v = 0; v < h.n; v++) {
      const w = h.spiegel[v]!;
      if (w === v) {
        mitte++;
        expect(drin[v]).toBe(1);
      } else expect(drin[v]! + drin[w]!).toBe(1);
    }
    expect(mitte).toBeGreaterThan(10);
    expect(H.punkte.length).toBe((h.n + mitte) / 2);
    // Halbkanten ohne Zwilling in der Hälfte liegen in der Mittelebene (das Netz ist geschlossen)
    for (let x = 0; x < H.V.length; x++) {
      if (H.zwilling[x]! >= 0) continue;
      const a = H.V[x]!;
      const b = H.V[x - (x % 3) + ((x % 3) + 1) % 3]!;
      expect(h.spiegel[a]).toBe(a);
      expect(h.spiegel[b]).toBe(b);
    }
  });

  it('keine Hälfte: ein Punkt ohne Spiegelbild, eine Kante quer über die Mittelebene, ein verkehrt herum gespeichertes Dreieck', () => {
    const { h } = koerper();
    const sp = Int32Array.from(h.spiegel);
    const v = sp.findIndex((w, i) => w !== i);
    sp[v] = -1;
    expect(halbNetzVon({ ...h, tri: Uint32Array.from(h.tri), spiegel: sp })).toBeNull();
    // ein Tetraeder aus zwei Punkten der Mittelebene und einem Paar: Die Kante des Paars läuft quer über die Ebene
    const quer = hautAus([0, 0, 0, 2, 0, 0, 1, 1, 1, 1, 1, -1], [0, 1, 2, 1, 0, 3, 0, 2, 3, 1, 3, 2]);
    expect(quer.spiegel[2]).toBe(3);
    expect(halbNetzVon(quer)).toBeNull();
    // der Fisch aus dem Fenster (`eineLinie.fisch.ts`): An der Spitze seiner Flosse durchlaufen zwei Dreiecke eine Kante im selben
    // Sinn. Dort bleibt die Rechnung über die ganze Haut (wie in C1 geprüft)
    expect(halbNetzVon(hautAus(FISCH.pos, FISCH.tri))).toBeNull();
  });

  it('die Gewichte nach der Geometrie: auf der Hälfte gerechnet dieselben wie über die ganze Haut mit festen Kanten der Mitte', () => {
    const { h } = koerper();
    const H = halbNetzVon(h)!;
    const sp = h.spiegel;
    const ganz = intrinsischeGewichte(h, (a, b) => sp[a] === a && sp[b] === b);
    const halb = intrinsischeGewichteHalb(h, H);
    expect(ganz.flips).toBeGreaterThan(50);
    // Verglichen wird, was der Löser liest: je Punkt und Nachbar die Summe der Gewichte und, mit den Gewichten gewogen, das
    // Kantenquadrat. (Welche Kante geklappt ist, kann sich unterscheiden, wo vier Punkte auf einem Kreis liegen: Dort ist das Gewicht
    // beider Diagonalen null.)
    const zeilen = (g: typeof ganz): { w: Map<number, number>[]; e2: Float64Array } => {
      const w: Map<number, number>[] = [];
      const e2 = new Float64Array(h.n);
      for (let v = 0; v < h.n; v++) {
        const z = new Map<number, number>();
        for (let k = g.start[v]!; k < g.start[v + 1]!; k++) {
          z.set(g.nb[k]!, (z.get(g.nb[k]!) ?? 0) + g.w[k]!);
          e2[v] = e2[v]! + g.w[k]! * g.l2[k]!;
        }
        w.push(z);
      }
      return { w, e2 };
    };
    const A = zeilen(ganz);
    const B = zeilen(halb);
    let weit = 0;
    let summe = 0;
    for (let v = 0; v < h.n; v++) {
      for (const j of new Set([...A.w[v]!.keys(), ...B.w[v]!.keys()])) {
        weit = Math.max(weit, Math.abs((A.w[v]!.get(j) ?? 0) - (B.w[v]!.get(j) ?? 0)));
        summe += A.w[v]!.get(j) ?? 0;
      }
      weit = Math.max(weit, Math.abs(A.e2[v]! - B.e2[v]!) / Math.max(1, A.e2[v]!));
    }
    expect(summe).toBeGreaterThan(h.n);
    expect(weit).toBeLessThan(1e-9);
  });

  it('das Vermessen: auf der Hälfte dieselben Normalen, Krümmungen und Kantenmaße', () => {
    const { h } = koerper();
    const H = halbNetzVon(h)!;
    const gew = gewichteAus(h, null);
    const ganz = vermessen(h, gew);
    const halb = vermessen(h, gew, undefined, H);
    const weit = (A: Float64Array, B: Float64Array): number => A.reduce((m, x, i) => Math.max(m, Math.abs(x - B[i]!)), 0);
    expect(weit(ganz.nor, halb.nor)).toBeLessThan(1e-12);
    expect(weit(ganz.kap, halb.kap)).toBeLessThan(1e-12);
    expect(weit(ganz.kante2, halb.kante2)).toBeLessThan(1e-9);
    expect(weit(ganz.tang, halb.tang)).toBeLessThan(1e-9);
  });

  it('der Löser: Gewichte und Vermessen auf der Hälfte geben dieselbe Haut wie über die ganze Haut gerechnet', () => {
    const lauf = (opt: Record<string, unknown>): Float64Array => {
      const { h, loops } = koerper();
      const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { halb: true, ...opt });
      z.schritt(
        loops.map(() => null),
        12,
      );
      return h.pos;
    };
    const A = lauf({ gewichteGanz: true });
    const B = lauf({});
    const start = koerper().h.pos;
    let weit = 0;
    let weg = 0;
    for (let i = 0; i < A.length; i++) {
      weit = Math.max(weit, Math.abs(A[i]! - B[i]!));
      weg = Math.max(weg, Math.abs(B[i]! - start[i]!));
    }
    // (die Haut hat sich in den zwölf Runden wirklich bewegt)
    expect(weg).toBeGreaterThan(1);
    expect(weit).toBeLessThan(1e-6);
  });
});
