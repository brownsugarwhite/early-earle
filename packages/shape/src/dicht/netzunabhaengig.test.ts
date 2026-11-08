// Form zuerst (08.11.2026), Beweis „Form unabhängig vom Netz“ (Florian: „Form unabhängig vom Netz, Kriterien Sprung beim Loslassen
// höchstens ein halber Bildpunkt, je Mausbewegung höchstens 16 ms“). Derselbe Zug auf zwei Startnetzen (6 000 und 12 000 bestellte
// Dreiecke): Kugel mit drei Loops, die obere Kreuzung 160 hoch (ein Hals). Mit gleichen Gewichten hängt die Form am Netz (gemessen
// 3,6 Einheiten zwischen 12 000 und 24 000, 0,9 zwischen 6 000 und 24 000, ohne Ordnung); nach der Geometrie wird der Unterschied mit
// jeder Verdopplung des Netzes etwa halb so groß (6 000 gegen 24 000: 0,51, 12 000 gegen 24 000: 0,26). Messreihe mit allen Fällen:
// `apps/editor/scripts/pruefen/form-netzunabhaengig.ts`.
import { describe, expect, it } from 'vitest';
import type { HautGewichte } from './ausKurven';
import { loopEinsetzen } from './einsetzen';
import { type Haut, type V3, hautAus } from './kurven';
import { type Loop, LoopZug, griffeAnlegen, kreuzungenZwischen, loopAusSchnitt, mittlereKante, punktEinfuegen, verschiebungLaengs } from './loops';
import { rundAusSeite } from './rund';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);

/** Kugel mit drei Loops (Ring waagerecht, Mitte, Ring senkrecht), Kreuzungen als Punkte, wie im Fenster */
function dreiLoops(dreiecke: number): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  let h = hautAus(n.positionen, n.indizes);
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
  for (let j = 0; j < loops.length; j++) {
    for (let i = 0; i < j; i++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
    griffeAnlegen(loops[j]!);
  }
  return { h, loops };
}

/** Hals: die obere Kreuzung 160 hoch, in Mausschritten mit je zwei Runden über die ganze Haut, danach zehn Runden */
function hals(dreiecke: number, gewichte: HautGewichte): Haut {
  const { h, loops } = dreiLoops(dreiecke);
  const mitte = loops.find((l) => l.art === 'mitte')!;
  const oben = mitte.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
  const z = new LoopZug(h, loops, null, true, 'kurven', gewichte);
  const verschiebung = (anteil: number) =>
    loops.map((l) => {
      const i = l.punkte.findIndex((p) => p.kreuzung === oben);
      if (i < 0) return null;
      const d = verschiebungLaengs(
        l,
        l.punkte.map((_, k) => (k === i ? { x: 0, y: 160 * anteil, z: 0 } : { x: 0, y: 0, z: 0 })),
      );
      if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
      return d;
    });
  const SCHRITTE = 30;
  for (let k = 1; k <= SCHRITTE; k++) z.schritt(verschiebung(k / SCHRITTE), 2);
  z.schritt(verschiebung(1), 10);
  return h;
}

/** nächster Punkt eines Dreiecks (Ericson), Abstand */
function punktDreieck(p: V3, a: V3, b: V3, c: V3): number {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const dot = (u: V3, v: V3) => u.x * v.x + u.y * v.y + u.z * v.z;
  const sub = (u: V3, v: V3) => ({ x: u.x - v.x, y: u.y - v.y, z: u.z - v.z });
  const auf = (o: V3, u: V3, s: number) => ({ x: o.x + s * u.x, y: o.y + s * u.y, z: o.z + s * u.z });
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  let q: V3;
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b);
    const d3 = dot(ab, bp);
    const d4 = dot(ac, bp);
    const vc = d1 * d4 - d3 * d2;
    const cp = sub(p, c);
    const d5 = dot(ab, cp);
    const d6 = dot(ac, cp);
    const vb = d5 * d2 - d1 * d6;
    const va = d3 * d6 - d5 * d4;
    if (d3 >= 0 && d4 <= d3) q = b;
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) q = auf(a, ab, d1 / (d1 - d3));
    else if (d6 >= 0 && d5 <= d6) q = c;
    else if (vb <= 0 && d2 >= 0 && d6 <= 0) q = auf(a, ac, d2 / (d2 - d6));
    else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) q = auf(b, sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6)));
    else {
      const den = 1 / (va + vb + vc);
      q = auf(auf(a, ab, vb * den), ac, vc * den);
    }
  }
  return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
}

/** größter Abstand der Punkte von A zur Fläche von B (Raster über die Dreiecke von B) */
function abstand(A: Haut, B: Haut): number {
  const P = B.pos;
  const T = B.tri;
  const zelle = 2 * mittlereKante(B);
  const lage = (v: number): V3 => ({ x: P[3 * v]!, y: P[3 * v + 1]!, z: P[3 * v + 2]! });
  const raster = new Map<string, number[]>();
  for (let t = 0; t < T.length; t += 3) {
    const e = [lage(T[t]!), lage(T[t + 1]!), lage(T[t + 2]!)];
    const lo = (k: 'x' | 'y' | 'z') => Math.floor(Math.min(...e.map((q) => q[k])) / zelle);
    const hi = (k: 'x' | 'y' | 'z') => Math.floor(Math.max(...e.map((q) => q[k])) / zelle);
    for (let i = lo('x'); i <= hi('x'); i++)
      for (let j = lo('y'); j <= hi('y'); j++)
        for (let k = lo('z'); k <= hi('z'); k++) {
          const s = `${i},${j},${k}`;
          const l = raster.get(s);
          if (l) l.push(t);
          else raster.set(s, [t]);
        }
  }
  let max = 0;
  for (let v = 0; v < A.n; v++) {
    const p = { x: A.pos[3 * v]!, y: A.pos[3 * v + 1]!, z: A.pos[3 * v + 2]! };
    const c = [p.x, p.y, p.z].map((x) => Math.floor(x / zelle));
    let best = Infinity;
    for (let r = 1; r <= 6 && best > (r - 1) * zelle; r++)
      for (let i = c[0]! - r; i <= c[0]! + r; i++)
        for (let j = c[1]! - r; j <= c[1]! + r; j++)
          for (let k = c[2]! - r; k <= c[2]! + r; k++)
            for (const t of raster.get(`${i},${j},${k}`) ?? []) best = Math.min(best, punktDreieck(p, lage(T[t]!), lage(T[t + 1]!), lage(T[t + 2]!)));
    max = Math.max(max, best);
  }
  return max;
}

describe('Form unabhängig vom Netz (08.11.)', () => {
  it('derselbe Hals auf zwei Startnetzen: nach der Geometrie gleich, mit gleichen Gewichten nicht', () => {
    const unterschied = (g: HautGewichte) => {
      const a = hals(6000, g);
      const b = hals(12000, g);
      return Math.max(abstand(a, b), abstand(b, a));
    };
    const geo = unterschied('geometrie');
    const gleich = unterschied('gleich');
    log(`Hals 6 000 gegen 12 000 Dreiecke: nach der Geometrie bis ${geo.toFixed(2)}, mit gleichen Gewichten bis ${gleich.toFixed(2)}`);
    // gemessen 0,52 (an der Spitze des Halses, wo sich Mitte und Ring kreuzen) gegen 2,52
    expect(geo).toBeLessThan(0.7);
    expect(gleich).toBeGreaterThan(2);
  }, 120000);
});
