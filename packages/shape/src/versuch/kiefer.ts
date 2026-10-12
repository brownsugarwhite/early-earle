// VERSUCH (12.10.2026): Kiefer = Knochen + Korrektur.
//
// Aus „zu“ und „auf“ (gleiche Punkte, andere Lage) wird je Kiefer die beste starre Bewegung geschätzt
// (Horn 1987, Quaternion-Verfahren). Daraus folgen Gelenkachse und Winkel. Was die starre Bewegung nicht
// erklärt, ist die Korrektur-Blendshape. Der Restfehler zeigt die Öffnungsart:
// - klein: „Kippen“ (Rex, Schnabel), die Knochen tragen die Bewegung
// - groß: „Ziehen“ (Robbe, Langhals), der Unterkiefer gleitet wie ein Vorhang; ein Knochen würde
//   durch den Körper fahren, die Blendshape trägt die Bewegung.

import type { Netz, V3 } from './catmullClark';
import { type M3, achsDrehung, drehe, kreuz3, laenge3, mal3, minus3, mittel3, normiert3, plus3, punkt3 } from './v3';

export type Starr = { R: M3; t: V3 };

/** Eigenwerte und -vektoren einer symmetrischen 4×4-Matrix (Jacobi-Verfahren). */
function jacobi4(a: number[][]): { werte: number[]; vektoren: number[][] } {
  const A = a.map((z) => [...z]);
  const V = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 4; p++) for (let q = p + 1; q < 4; q++) off += A[p]![q]! * A[p]![q]!;
    if (off < 1e-22) break;
    for (let p = 0; p < 4; p++) {
      for (let q = p + 1; q < 4; q++) {
        const apq = A[p]![q]!;
        if (Math.abs(apq) < 1e-30) continue;
        const theta = (A[q]![q]! - A[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 4; k++) {
          const akp = A[k]![p]!;
          const akq = A[k]![q]!;
          A[k]![p] = c * akp - s * akq;
          A[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < 4; k++) {
          const apk = A[p]![k]!;
          const aqk = A[q]![k]!;
          A[p]![k] = c * apk - s * aqk;
          A[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 4; k++) {
          const vkp = V[k]![p]!;
          const vkq = V[k]![q]!;
          V[k]![p] = c * vkp - s * vkq;
          V[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { werte: [0, 1, 2, 3].map((i) => A[i]![i]!), vektoren: [0, 1, 2, 3].map((i) => V.map((z) => z[i]!)) };
}

/** Beste starre Bewegung a_i → b_i (gewichtete kleinste Quadrate, Horn 1987). */
export function starreAnpassung(a: readonly V3[], b: readonly V3[], w?: readonly number[]): Starr {
  const gew = (i: number) => (w ? w[i]! : 1);
  let sw = 0;
  let ca: V3 = [0, 0, 0];
  let cb: V3 = [0, 0, 0];
  a.forEach((p, i) => {
    sw += gew(i);
    ca = plus3(ca, mal3(p, gew(i)));
    cb = plus3(cb, mal3(b[i]!, gew(i)));
  });
  ca = mal3(ca, 1 / sw);
  cb = mal3(cb, 1 / sw);
  const S = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  a.forEach((p, i) => {
    const A = minus3(p, ca);
    const B = minus3(b[i]!, cb);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r]![c]! += gew(i) * A[r]! * B[c]!;
  });
  const R = drehungAusKovarianz(S);
  return { R, t: minus3(cb, drehe(R, ca)) };
}

/** Beste Drehung zu einer Kovarianzmatrix S = Σ a·bᵀ (Horn, größter Eigenvektor der 4×4-Matrix). */
export function drehungAusKovarianz(S: number[][]): M3 {
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S as [[number, number, number], [number, number, number], [number, number, number]];
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ];
  const { werte, vektoren } = jacobi4(N);
  let best = 0;
  for (let i = 1; i < 4; i++) if (werte[i]! > werte[best]!) best = i;
  const [q0, q1, q2, q3] = vektoren[best] as [number, number, number, number];
  return [
    [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 - q0 * q3), 2 * (q1 * q3 + q0 * q2)],
    [2 * (q2 * q1 + q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 - q0 * q1)],
    [2 * (q3 * q1 - q0 * q2), 2 * (q3 * q2 + q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3],
  ];
}

export const anwenden = (s: Starr, p: V3): V3 => plus3(drehe(s.R, p), s.t);

/** Schraubachse: Richtung u, Winkel w (rad), Punkt c auf der Achse (nahe `nahe`), Gleiten entlang u. */
export type Gelenk = { u: V3; w: number; c: V3; gleiten: number };

export function gelenkAus(s: Starr, nahe: V3): Gelenk {
  const { R, t } = s;
  const spur = R[0][0] + R[1][1] + R[2][2];
  const w = Math.acos(Math.min(1, Math.max(-1, (spur - 1) / 2)));
  let u: V3 = [R[2][1] - R[1][2], R[0][2] - R[2][0], R[1][0] - R[0][1]];
  if (laenge3(u) < 1e-9) return { u: [0, 0, 1], w: 0, c: nahe, gleiten: laenge3(t) };
  u = normiert3(u);
  const gleiten = punkt3(u, t);
  const tq = minus3(t, mal3(u, gleiten));
  // Achspunkt in der Ebene durch den Ursprung: c = ½ (t⊥ + cot(w/2) · u × t⊥)
  let c = mal3(plus3(tq, mal3(kreuz3(u, tq), 1 / Math.tan(w / 2))), 0.5);
  c = plus3(c, mal3(u, punkt3(u, minus3(nahe, c))));
  return { u, w, c, gleiten };
}

/** Bewegung um das Gelenk mit Anteil α (Drehung α·w und Gleiten α·gleiten). */
export function gelenkBewegung(g: Gelenk, alpha: number): Starr {
  const R = achsDrehung(g.u, g.w * alpha);
  const t = plus3(minus3(g.c, drehe(R, g.c)), mal3(g.u, g.gleiten * alpha));
  return { R, t };
}

/** Relativer Restfehler: was die starre Bewegung nicht erklärt (0 = rein starr, 1 = gar nicht). */
export function restfehler(a: readonly V3[], b: readonly V3[], s: Starr): number {
  let rest = 0;
  let weg = 0;
  a.forEach((p, i) => {
    const r = minus3(anwenden(s, p), b[i]!);
    const d = minus3(b[i]!, p);
    rest += punkt3(r, r);
    weg += punkt3(d, d);
  });
  return weg > 1e-14 ? Math.sqrt(rest / weg) : 0;
}

export type Oeffnungsart = 'kippen' | 'ziehen' | 'gemischt';

export function oeffnungsart(rest: number): Oeffnungsart {
  return rest < 0.15 ? 'kippen' : rest > 0.35 ? 'ziehen' : 'gemischt';
}

/** Lineare Hautverformung (LBS) mit Gewichten je Knochen; der Rest bleibt stehen. */
export function posieren(punkte: readonly V3[], knochen: readonly { s: Starr; w: readonly number[] }[]): V3[] {
  return punkte.map((p, i) => {
    let q: V3 = [0, 0, 0];
    let summe = 0;
    for (const k of knochen) {
      const g = k.w[i]!;
      if (g <= 0) continue;
      q = plus3(q, mal3(anwenden(k.s, p), g));
      summe += g;
    }
    return summe >= 1 ? q : plus3(q, mal3(p, 1 - summe));
  });
}

/** Nachbarn je Käfigpunkt (über Kanten). */
export function nachbarn(netz: Netz): number[][] {
  const n: Set<number>[] = netz.punkte.map(() => new Set<number>());
  for (const f of netz.flaechen) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      n[a]!.add(b);
      n[b]!.add(a);
    }
  }
  return n.map((s) => [...s]);
}

/**
 * Harmonische Fortsetzung einer Verschiebung über den Käfig: Punkte in `fest` behalten ihre Verschiebung,
 * alle anderen werden zum Mittel ihrer Nachbarn (Jacobi), bis es sich setzt. `null` = frei.
 */
export function harmonisch(nb: readonly number[][], fest: readonly (V3 | null)[], iterationen = 400): V3[] {
  let d: V3[] = fest.map((f) => (f ? [...f] as V3 : [0, 0, 0]));
  for (let it = 0; it < iterationen; it++) {
    d = d.map((alt, i) => {
      const f = fest[i];
      if (f) return f;
      const ns = nb[i]!;
      if (!ns.length) return alt;
      return mittel3(ns.map((j) => d[j]!));
    });
  }
  return d;
}

/**
 * Möglichst starre Verformung (ARAP, Sorkine & Alexa 2007) auf dem Käfiggraphen: Punkte in `fest` gehen exakt an
 * ihr Ziel, alle anderen folgen so, dass jede Nachbarschaft sich nur dreht, nicht schert. Gleichgewichtete Kanten,
 * globaler Schritt per Gauß-Seidel. `start` = Anfangslage (z. B. die Knochenpose).
 */
export function arap(ruhe: readonly V3[], nb: readonly number[][], fest: readonly (V3 | null)[], start: readonly V3[], iterationen = 12, gs = 60): V3[] {
  const n = ruhe.length;
  const p: V3[] = start.map((q, i) => (fest[i] ? [...fest[i]!] as V3 : [...q] as V3));
  const R: M3[] = new Array(n);
  for (let it = 0; it < iterationen; it++) {
    // lokal: beste Drehung je Punkt aus seinen Kanten
    for (let i = 0; i < n; i++) {
      const S = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      for (const j of nb[i]!) {
        const e = minus3(ruhe[i]!, ruhe[j]!);
        const f = minus3(p[i]!, p[j]!);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r]![c]! += e[r]! * f[c]!;
      }
      R[i] = drehungAusKovarianz(S);
    }
    // global: Lage aus den gedrehten Ruhekanten (Gauß-Seidel)
    const b: V3[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let bi: V3 = [0, 0, 0];
      for (const j of nb[i]!) {
        const e = minus3(ruhe[i]!, ruhe[j]!);
        bi = plus3(bi, mal3(plus3(drehe(R[i]!, e), drehe(R[j]!, e)), 0.5));
      }
      b[i] = bi;
    }
    for (let k = 0; k < gs; k++) {
      for (let i = 0; i < n; i++) {
        if (fest[i]) continue;
        const ns = nb[i]!;
        if (!ns.length) continue;
        let s: V3 = [...b[i]!] as V3;
        for (const j of ns) s = plus3(s, p[j]!);
        p[i] = mal3(s, 1 / ns.length);
      }
    }
  }
  return p;
}
