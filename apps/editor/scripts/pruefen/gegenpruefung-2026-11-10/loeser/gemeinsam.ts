 
// Gegenprüfung „Löser-Mathematik“ (10.11.2026): gemeinsame Teile der Messskripte. Aufbau wie
// apps/editor/scripts/pruefen/form-netzunabhaengig.ts (Kugel, drei Loops, Zug Hals/Ohr/Rüssel), nichts im Arbeitsbaum wird geändert.
import { loopEinsetzen } from '../../../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, type V3, hautAus } from '../../../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  griffeAnlegen,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  verschiebungLaengs,
} from '../../../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../../../packages/shape/src/dicht/rund';

export type Stand = { h: Haut; loops: Loop[] };

export const kugel = (dreiecke: number): Haut => {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  return hautAus(n.positionen, n.indizes);
};

/** Kugel mit drei Loops (Ring waagerecht, Mitte, Ring senkrecht), Kreuzungen als Punkte, Griffe angelegt */
export function dreiLoops(dreiecke = 6000): Stand {
  let h = kugel(dreiecke);
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

/** Kugel mit einem Ring (Äquator) */
export function einRing(dreiecke = 6000): Stand {
  let h = kugel(dreiecke);
  const ring = loopAusSchnitt(h, 'seite', [-200, 0], [200, 0], 1, 8)!;
  const r = loopEinsetzen(h, [ring], 0)!;
  h = r.haut;
  griffeAnlegen(r.loops[0]!);
  return { h, loops: r.loops };
}

const punktZug = (l: Loop, i: number, D: V3): Float64Array => {
  const d = verschiebungLaengs(
    l,
    l.punkte.map((_, k) => (k === i ? D : { x: 0, y: 0, z: 0 })),
  );
  if (l.art === 'mitte') for (let j = 0; j < l.proben.length; j++) d[3 * j + 2] = 0;
  return d;
};

/** Verschiebung je Loop für den Anteil 0…1 des Zugs (wie form-netzunabhaengig.ts) */
export function zugFuer(st: Stand, fall: string): (anteil: number) => (Float64Array | null)[] {
  const mitteNr = () => st.loops.findIndex((l) => l.art === 'mitte');
  if (fall === 'hals') {
    const m = st.loops[mitteNr()]!;
    const oben = m.punkte.reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).kreuzung!;
    return (anteil) =>
      st.loops.map((l) => {
        const i = l.punkte.findIndex((p) => p.kreuzung === oben);
        return i < 0 ? null : punktZug(l, i, { x: 0, y: 160 * anteil, z: 0 });
      });
  }
  if (fall === 'ohr') {
    const ring = st.loops.find((l) => l.art === 'ring' && l.punkte.some((p) => Math.abs(p.ref.y) > 100))!;
    for (const w of [40, 50, 60, 70]) {
      const th = (w * Math.PI) / 180;
      let best = 0;
      for (let j = 0; j < ring.s.length; j++) {
        const a = Math.atan2(ring.ruhe[3 * j + 2]!, ring.ruhe[3 * j + 1]!);
        const b = Math.atan2(ring.ruhe[3 * best + 2]!, ring.ruhe[3 * best + 1]!);
        if (Math.abs(a - th) < Math.abs(b - th)) best = j;
      }
      const j = Math.min(best, ring.s.length - 2);
      punktEinfuegen(ring, 0.5 * (ring.s[j]! + ring.s[j + 1]!));
    }
    const wahl = ring.punkte
      .map((p, i) => ({ i, w: (Math.atan2(p.ref.z, p.ref.y) * 180) / Math.PI, k: p.kreuzung }))
      .filter((q) => q.k === undefined && q.w > 45 && q.w < 65)
      .map((q) => q.i);
    const r = (55 * Math.PI) / 180;
    return (anteil) =>
      st.loops.map((l) => {
        if (l !== ring) return null;
        const D = { x: 0, y: 70 * Math.cos(r) * anteil, z: 70 * Math.sin(r) * anteil };
        return verschiebungLaengs(
          l,
          l.punkte.map((_, k) => (wahl.includes(k) ? D : { x: 0, y: 0, z: 0 })),
        );
      });
  }
  // Rüssel
  const m = st.loops[mitteNr()]!;
  let s0 = 0;
  let best = Infinity;
  for (let j = 0; j < m.proben.length; j++) {
    const d = Math.hypot(m.ruhe[3 * j]! - 106, m.ruhe[3 * j + 1]! - 106);
    if (d < best) {
      best = d;
      s0 = m.s[j]!;
    }
  }
  punktEinfuegen(m, s0);
  const i = m.punkte.findIndex((p) => Math.abs(p.s - s0) < 1e-9);
  return (anteil) => st.loops.map((l) => (l === m ? punktZug(l, i, { x: 320 * anteil, y: -70 * anteil, z: 0 }) : null));
}

// ---------- Abstand Punkt → Fläche (aus form-netzunabhaengig.ts) ----------
function punktDreieck(p: number[], a: number[], b: number[], c: number[]): number {
  const sub = (u: number[], v: number[]) => [u[0]! - v[0]!, u[1]! - v[1]!, u[2]! - v[2]!];
  const dot = (u: number[], v: number[]) => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  let q: number[];
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b);
    const d3 = dot(ab, bp);
    const d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) q = b;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        q = [a[0]! + v * ab[0]!, a[1]! + v * ab[1]!, a[2]! + v * ab[2]!];
      } else {
        const cp = sub(p, c);
        const d5 = dot(ab, cp);
        const d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) q = c;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            q = [a[0]! + w * ac[0]!, a[1]! + w * ac[1]!, a[2]! + w * ac[2]!];
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              q = [b[0]! + w * (c[0]! - b[0]!), b[1]! + w * (c[1]! - b[1]!), b[2]! + w * (c[2]! - b[2]!)];
            } else {
              const den = 1 / (va + vb + vc);
              const v = vb * den;
              const w = vc * den;
              q = [a[0]! + ab[0]! * v + ac[0]! * w, a[1]! + ab[1]! * v + ac[1]! * w, a[2]! + ab[2]! * v + ac[2]! * w];
            }
          }
        }
      }
    }
  }
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}
export type Schnapp = { P: Float64Array; T: Uint32Array };
export const schnapp = (h: Haut): Schnapp => ({ P: Float64Array.from(h.pos), T: Uint32Array.from(h.tri) });
function flaeche(S: Schnapp): (p: number[]) => number {
  const { P, T } = S;
  let kante = 0;
  for (let i = 0; i < T.length; i += 3) kante += Math.hypot(P[3 * T[i]!]! - P[3 * T[i + 1]!]!, P[3 * T[i]! + 1]! - P[3 * T[i + 1]! + 1]!, P[3 * T[i]! + 2]! - P[3 * T[i + 1]! + 2]!);
  const h = (2 * kante) / (T.length / 3);
  const zellen = new Map<string, number[]>();
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  for (let t = 0; t < T.length / 3; t++) {
    const v = [T[3 * t]!, T[3 * t + 1]!, T[3 * t + 2]!];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...v.map((w) => P[3 * w + c]!)) / h));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...v.map((w) => P[3 * w + c]!)) / h));
    for (let i = lo[0]!; i <= hi[0]!; i++)
      for (let j = lo[1]!; j <= hi[1]!; j++)
        for (let k = lo[2]!; k <= hi[2]!; k++) {
          const s = key(i, j, k);
          const l = zellen.get(s);
          if (l) l.push(t);
          else zellen.set(s, [t]);
        }
  }
  const ecke = (w: number) => [P[3 * w]!, P[3 * w + 1]!, P[3 * w + 2]!];
  return (p) => {
    const c = [0, 1, 2].map((k) => Math.floor(p[k]! / h));
    let best = Infinity;
    for (let r = 1; r <= 12; r++) {
      const gesehen = new Set<number>();
      for (let i = c[0]! - r; i <= c[0]! + r; i++)
        for (let j = c[1]! - r; j <= c[1]! + r; j++)
          for (let k = c[2]! - r; k <= c[2]! + r; k++) {
            const l = zellen.get(key(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (gesehen.has(t)) continue;
              gesehen.add(t);
              best = Math.min(best, punktDreieck(p, ecke(T[3 * t]!), ecke(T[3 * t + 1]!), ecke(T[3 * t + 2]!)));
            }
          }
      if (best <= (r - 0.5) * h) return best;
    }
    return best;
  };
}
/** wie weit die Fläche B von der Fläche A liegt (beide Richtungen): größter Abstand, 99 %, Mittel */
export function flaechenAbstand(A: Schnapp, B: Schnapp): { max: number; p99: number; mittel: number } {
  const w: number[] = [];
  let max = 0;
  for (const [X, Y] of [
    [A, B],
    [B, A],
  ] as const) {
    const d = flaeche(X);
    for (let v = 0; v < Y.P.length / 3; v++) {
      const x = d([Y.P[3 * v]!, Y.P[3 * v + 1]!, Y.P[3 * v + 2]!]);
      w.push(x);
      if (x > max) max = x;
    }
  }
  w.sort((a, b) => a - b);
  return { max, p99: w[Math.floor(0.99 * (w.length - 1))]!, mittel: w.reduce((s, x) => s + x, 0) / w.length };
}
/** Verschiebung Punkt für Punkt (gleiches Netz): größte, quadratisches Mittel */
export function punktAbstand(a: Float64Array, b: Float64Array): { max: number; rms: number } {
  let max = 0;
  let s = 0;
  const n = a.length / 3;
  for (let v = 0; v < n; v++) {
    const d = Math.hypot(a[3 * v]! - b[3 * v]!, a[3 * v + 1]! - b[3 * v + 1]!, a[3 * v + 2]! - b[3 * v + 2]!);
    if (d > max) max = d;
    s += d * d;
  }
  return { max, rms: Math.sqrt(s / n) };
}
export const f2 = (x: number) => x.toFixed(2);
export const f3 = (x: number) => x.toFixed(3);
