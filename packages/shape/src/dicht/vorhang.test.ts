import { describe, expect, it } from 'vitest';
import { loopEinsetzen } from './einsetzen';
import { type Haut, hautAus } from './kurven';
import { type Ansicht, blickUV, griffeAnlegen, griffeAufStrich, loopAusVorhang, mittlereKante, pfadLagen, punktEinfuegen, stelleImBlatt, vorhangWeg, wendeStellen } from './loops';
import { rundAusSeite } from './rund';

// C2 im Plan „Ozzy stabil und schnell“ (18.11.2026): ein gebogener Strich quer über die Form gibt einen Loop rundum, der in der
// Ansicht auf dem Strich liegt (`loopAusVorhang`); die gezeichneten Punkte werden Punkte des Loops (`stelleImBlatt`), sein Pfad
// folgt im Blatt dem Strich (`wendeStellen`, `griffeAufStrich`).

type UV = [number, number];
const kugel = (): Haut =>
  ((n) => hautAus(n.positionen, n.indizes))(
    rundAusSeite(
      [
        { x: 150, y: 0 },
        { x: 0, y: 150 },
        { x: -150, y: 0 },
        { x: 0, y: -150 },
      ],
      { dreiecke: 2000 },
    ),
  );
/** zwei Kurvenstücke A → M → B mit der Richtung g an M (A und B Ecken), jedes für sich gleichmäßig abgetastet */
function strich(A: UV, M: UV, g: UV, B: UV, schritt: number): UV[] {
  const stueck = (p: UV, c1: UV, c2: UV, q: UV): UV[] => {
    const lang = Math.hypot(c1[0] - p[0], c1[1] - p[1]) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(q[0] - c2[0], q[1] - c2[1]);
    const n = Math.max(4, Math.ceil(lang / schritt));
    return Array.from({ length: n }, (_, k) => {
      const t = k / n;
      const u = 1 - t;
      return [u * u * u * p[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * q[0], u * u * u * p[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * q[1]] as UV;
    });
  };
  return [...stueck(A, A, [M[0] - g[0], M[1] - g[1]], M), ...stueck(M, [M[0] + g[0], M[1] + g[1]], B, B), B];
}
const zumWeg = (W: readonly UV[], u: number, v: number): number => {
  let best = Infinity;
  for (let i = 0; i + 1 < W.length; i++) {
    const p = W[i]!;
    const q = W[i + 1]!;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const t = Math.max(0, Math.min(1, ((u - p[0]) * dx + (v - p[1]) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(u - p[0] - t * dx, v - p[1] - t * dy));
  }
  return best;
};
const spiegelFehler = (h: Haut): number => {
  let n = 0;
  for (let v = 0; v < h.n; v++) if (!(h.spiegel[v]! >= 0 && h.spiegel[h.spiegel[v]!] === v)) n++;
  return n;
};
/** je Ansicht ein Bogen quer über die Kugel: in der Seite quer; in Front und Top einmal über die Mitte, einmal auf einer Seite */
const FAELLE: { a: Ansicht; was: string; art: 'ring' | 'paar'; A: UV; M: UV; g: UV; B: UV }[] = [
  { a: 'seite', was: 'quer', art: 'ring', A: [-200, 30], M: [10, -25], g: [30, 6], B: [200, 10] },
  { a: 'front', was: 'über die Mitte', art: 'ring', A: [-200, 20], M: [0, 55], g: [40, 0], B: [200, 20] },
  { a: 'front', was: 'auf einer Seite', art: 'paar', A: [70, -200], M: [90, 0], g: [3, 30], B: [60, 200] },
  { a: 'top', was: 'über die Mitte', art: 'ring', A: [20, -200], M: [45, 0], g: [0, 40], B: [20, 200] },
  { a: 'top', was: 'auf einer Seite', art: 'paar', A: [-200, 75], M: [0, 90], g: [30, 3], B: [200, 68] },
];

describe('Loop aus einem gebogenen Strich quer über die Form', () => {
  it('liegt in der Ansicht auf dem Strich, vorn und hinten, und lässt sich einsetzen', () => {
    for (const f of FAELLE) {
      const h = kugel();
      const mk = mittlereKante(h);
      const S = strich(f.A, f.M, f.g, f.B, 0.3 * mk);
      const W = vorhangWeg(f.a, S, 0.6 * mk)!;
      const l = loopAusVorhang(h, f.a, S, 1, 0.6 * mk)!;
      expect(l, `${f.a}, ${f.was}`).not.toBeNull();
      expect(l.art, `${f.a}, ${f.was}`).toBe(f.art);
      // jede Probe liegt im Blatt auf dem Strich, wie er gilt (über die Mitte: aus einer Hälfte und ihrem Spiegelbild)
      let neben = 0;
      let vorn = -Infinity;
      let hinten = Infinity;
      for (let j = 0; j < l.proben.length; j++) {
        const p = { x: l.ruhe[3 * j]!, y: l.ruhe[3 * j + 1]!, z: l.ruhe[3 * j + 2]! };
        const [u, v] = blickUV(f.a, p);
        neben = Math.max(neben, zumWeg(W.weg, u, v));
        const t = f.a === 'seite' ? p.z : f.a === 'front' ? -p.x : p.y;
        vorn = Math.max(vorn, t);
        hinten = Math.min(hinten, t);
      }
      expect(neben, `${f.a}, ${f.was}: neben dem Strich`).toBeLessThan(1e-6);
      // rundum: Der Loop reicht nach vorn und (außer als Hälfte eines Rings in der Seite) nach hinten
      expect(vorn, `${f.a}, ${f.was}: vorn`).toBeGreaterThan(50);
      if (f.a !== 'seite') expect(hinten, `${f.a}, ${f.was}: hinten`).toBeLessThan(-50);
      const r = loopEinsetzen(h, [l], 0)!;
      expect(r, `${f.a}, ${f.was}: eingesetzt`).not.toBeNull();
      expect(spiegelFehler(r.haut), `${f.a}, ${f.was}: Spiegelpaare`).toBe(0);
    }
  });

  it('der gezeichnete Punkt wird ein Punkt des Loops, und sein Pfad folgt im Blatt dem Strich', () => {
    for (const f of FAELLE) {
      const h0 = kugel();
      const mk = mittlereKante(h0);
      const S = strich(f.A, f.M, f.g, f.B, 0.3 * mk);
      const fein = strich(f.A, f.M, f.g, f.B, 0.04 * mk);
      const W = vorhangWeg(f.a, S, 0.6 * mk)!;
      const r = loopEinsetzen(h0, [loopAusVorhang(h0, f.a, S, 1, 0.6 * mk)!], 0)!;
      const l = r.loops[0]!;
      griffeAnlegen(l, l.ruhe, true, 0);
      // der Punkt: vorn, und wo der Loop hinten über denselben Strich läuft, auch hinten
      const stellen: number[] = [];
      for (const hinten of [false, true]) {
        const st = stelleImBlatt(l, f.a, f.M[0], f.M[1], 0.5 * mk, l.ruhe, hinten);
        if (st !== null && !stellen.some((x) => Math.abs(x - st) < 1e-3 * l.laenge)) stellen.push(st);
      }
      expect(stellen.length, `${f.a}, ${f.was}: Stellen des Punkts`).toBe(f.a === 'seite' ? 1 : 2);
      const punkte = stellen.map((st) => punktEinfuegen(l, st));
      for (const p of punkte) {
        const [u, v] = blickUV(f.a, p.ref);
        expect(Math.hypot(u - f.M[0], v - f.M[1]), `${f.a}, ${f.was}: Punkt am gezeichneten`).toBeLessThan(0.5 * mk);
      }
      // wo der Loop im Blatt umkehrt, ein verdeckter Punkt (in der Seite sind es die Enden des Rings)
      const wenden = wendeStellen(l, f.a, W.weg);
      expect(wenden.length, `${f.a}, ${f.was}: Umkehrstellen`).toBe(f.a === 'seite' ? 0 : f.art === 'paar' ? 2 : 1);
      for (const st of wenden) punktEinfuegen(l, st).vonSelbst = true;
      griffeAnlegen(l, l.ruhe, true, 0);
      const fehler = (): number => {
        const L = pfadLagen(l)!;
        let max = 0;
        for (let j = 0; j + 2 < L.length; j += 3) {
          const [u, v] = blickUV(f.a, { x: L[j]!, y: L[j + 1]!, z: L[j + 2]! });
          // über die Mitte gilt der Strich als eine Hälfte und ihr Spiegelbild; die gespeicherte Hälfte liegt auf z ≥ 0
          max = Math.max(max, Math.min(zumWeg(fein, u, v), zumWeg(W.weg, u, v)));
        }
        return max;
      };
      const ausLinie = fehler();
      griffeAufStrich(l, f.a, W.weg);
      const ausStrich = fehler();
      // gemessen (Einheiten; die Kugel hat den Radius 150): Griffe aus der Linie 2,3 bis 4,6, aus dem Strich 0,6 bis 0,8
      expect(ausStrich, `${f.a}, ${f.was}: Pfad neben dem Strich (aus der Linie ${ausLinie.toFixed(2)})`).toBeLessThan(1.5);
      expect(ausStrich, `${f.a}, ${f.was}`).toBeLessThanOrEqual(ausLinie + 1e-9);
    }
  });

  it('in Front und Top: ein Strich, der die Mitte mehrmals kreuzt, gibt keinen Loop', () => {
    const h = kugel();
    const mk = mittlereKante(h);
    // längs der Form, die Mitte zweimal gekreuzt (im Top ist z die zweite Koordinate)
    const S = strich([-200, 15], [0, -50], [40, 0], [200, 15], 0.3 * mk);
    expect(vorhangWeg('top', S, 0.6 * mk)).toBeNull();
    expect(loopAusVorhang(h, 'top', S, 1, 0.6 * mk)).toBeNull();
    // in der Seite ist derselbe Strich ein Ring (dort gibt es keine Mitte zu kreuzen)
    expect(loopAusVorhang(h, 'seite', S, 1, 0.6 * mk)?.art).toBe('ring');
  });

  it('ein gerader Strich: Der Pfad liegt im Blatt genau auf der Geraden', () => {
    const h0 = kugel();
    const mk = mittlereKante(h0);
    const A: UV = [-200, 40];
    const B: UV = [200, -20];
    const S: UV[] = Array.from({ length: 81 }, (_, k) => [A[0] + ((B[0] - A[0]) * k) / 80, A[1] + ((B[1] - A[1]) * k) / 80] as UV);
    const r = loopEinsetzen(h0, [loopAusVorhang(h0, 'seite', S, 1, 0.6 * mk)!], 0)!;
    const l = r.loops[0]!;
    griffeAnlegen(l, l.ruhe, true, 0);
    for (const u of [-60, 30]) punktEinfuegen(l, stelleImBlatt(l, 'seite', u, A[1] + ((B[1] - A[1]) * (u - A[0])) / (B[0] - A[0]), 0.5 * mk)!);
    griffeAnlegen(l, l.ruhe, true, 0);
    griffeAufStrich(l, 'seite', vorhangWeg('seite', S, 0.6 * mk)!.weg);
    const L = pfadLagen(l)!;
    let max = 0;
    // zwischen den zwei gesetzten Punkten (die Stücke an den Enden des Rings behalten die Griffe der Enden)
    for (let j = 0; j + 2 < L.length; j += 3) if (L[j]! > -60 && L[j]! < 30) max = Math.max(max, zumWeg(S, L[j]!, L[j + 1]!));
    expect(max).toBeLessThan(1e-6);
  });
});
