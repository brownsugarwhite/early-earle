// Form zuerst (09.11.2026), Beweis „Linien mit Richtung“ (Recherche docs/research/2026-11-09-fibermesh-monstermash-richtung.md):
// Jede Linie bekommt ihre Richtung (die Normale der Fläche an ihr) von selbst aus dem Liniennetz, ohne Einstellung:
// 1. Wo sich zwei Linien kreuzen, spannen sie die Fläche auf: Die Normale steht senkrecht auf beiden Tangenten.
// 2. Auf der Mittelebene liegt sie aus Symmetrie in der Ebene (senkrecht zur Linie).
// 3. Zwischen zwei solchen Stellen dreht sie sich gleichmäßig um die Linie: Ein Rahmen wird ohne unnötige Drehung längs der Linie
//    weitergereicht (Doppelspiegelung, Wang u. a. 2008), und der Winkel, um den er an der nächsten Stelle fehlt, wird nach der
//    Bogenlänge verteilt.
// 4. Eine Linie ohne solche Stelle behält die Richtung der Haut (im Beweis: beim Anfassen; gedacht ist: beim Zeichnen).
// Das Vorzeichen (außen) gibt die Haut.

import type { Haut } from './kurven';
import type { BindungsPlan, Loop } from './loops';

type V = [number, number, number];
const ab = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const skal = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** v um die Achse k (Einheitsvektor) um den Winkel φ drehen */
const drehen = (v: V, k: V, phi: number): V => {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const kv = kreuz(k, v);
  const d = skal(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * d, v[1] * c + kv[1] * s + k[1] * d, v[2] * c + kv[2] * s + k[2] * d];
};
/** kleinster Kreuzungswinkel (sin), unter dem zwei Tangenten noch eine Ebene geben */
const SIN_MIN = 0.2;

/**
 * Richtung je Punkt der Haut auf einer Linie (3 je Punkt, NaN: keine). `lagen`: Lagen der Proben je Loop jetzt (wie im Zug),
 * `normalen`: Normalen der Haut (nur für das Vorzeichen und für Linien ohne Kreuzung).
 */
export function linienRichtung(
  h: Haut,
  loops: readonly Loop[],
  plan: BindungsPlan,
  lagen: readonly Float64Array[],
  normalen: Float64Array,
): Float64Array {
  const aus = new Float64Array(3 * h.n).fill(Number.NaN);
  const m = plan.loop.length;
  // Punkt der Haut je (Loop, Probe), ohne Spiegel; und je Punkt der Haut die Loops, deren Probe dort liegt (ohne Spiegel)
  const punkt = loops.map((l) => new Int32Array(l.proben.length).fill(-1));
  const amPunkt = new Map<number, { li: number; pi: number }[]>();
  for (let j = 0; j < m; j++) {
    const e = plan.bind.ecken;
    const v = e[3 * j]!;
    if (e[3 * j + 1] !== v || e[3 * j + 2] !== v || plan.spiegel[j]) continue;
    const li = plan.loop[j]!;
    const pi = plan.probe[j]!;
    punkt[li]![pi] = v;
    const a = amPunkt.get(v);
    if (a) a.push({ li, pi });
    else amPunkt.set(v, [{ li, pi }]);
  }
  // Fenster der Tangente je Loop: eine mittlere Kantenlänge der Haut zu jeder Seite
  let kl = 0;
  let kz = 0;
  for (let t = 0; t < h.tri.length; t += 3) {
    const a = h.tri[t]!;
    const b = h.tri[t + 1]!;
    kl += Math.hypot(h.pos[3 * b]! - h.pos[3 * a]!, h.pos[3 * b + 1]! - h.pos[3 * a + 1]!, h.pos[3 * b + 2]! - h.pos[3 * a + 2]!);
    kz++;
  }
  const mk = kz ? kl / kz : 1;
  const fensterJe = loops.map(() => mk);
  const lage = (li: number, i: number): V => {
    const L = lagen[li]!;
    return [L[3 * i]!, L[3 * i + 1]!, L[3 * i + 2]!];
  };
  // Tangente je Probe (Ring: über die Enden in die Spiegelhälfte; Mitte und Paar: geschlossen)
  const tangente = (li: number, i: number): V => {
    const l = loops[li]!;
    const n = l.proben.length;
    const p = (k: number): V => {
      if (l.art === 'ring') {
        // hinter einem Ende auf der Mittelebene liegt das Spiegelbild; hinter einem Ende, das an einer anderen Linie hängt
        // (Abzweigung, `Loop.haengt`), nichts: Dort zählt das Ende selbst
        if (k < 0) {
          if (l.haengt?.[0]) return lage(li, 0);
          const q = lage(li, Math.min(-k, n - 1));
          return [q[0], q[1], -q[2]];
        }
        if (k > n - 1) {
          if (l.haengt?.[1]) return lage(li, n - 1);
          const q = lage(li, Math.max(2 * (n - 1) - k, 0));
          return [q[0], q[1], -q[2]];
        }
        return lage(li, k);
      }
      return lage(li, ((k % n) + n) % n);
    };
    // Ableitung einer Parabel nach der Bogenlänge über die Punkte bis `fenster` zu jeder Seite (kleinste Quadrate, Gewicht nach dem
    // Abstand): Die Punkte der Linie liegen bis 0,2 Einheiten neben der Fläche, oft dicht beieinander; aus drei Punkten kippte die
    // Tangente und mit ihr die Normale (auf der Kugel bis 1,8°), aus fünf noch bis 1,4°.
    const fenster = fensterJe[li]!;
    const vor: V[] = [];
    const nach: V[] = [];
    {
      let sum = 0;
      let alt = p(i);
      for (let k = 1; k <= 12; k++) {
        const q = p(i - k);
        sum += Math.hypot(...ab(alt, q));
        vor.push(q);
        alt = q;
        if (sum >= fenster) break;
      }
      sum = 0;
      alt = p(i);
      for (let k = 1; k <= 12; k++) {
        const q = p(i + k);
        sum += Math.hypot(...ab(q, alt));
        nach.push(q);
        alt = q;
        if (sum >= fenster) break;
      }
    }
    const pts: V[] = [...vor.reverse(), p(i), ...nach];
    const K = vor.length;
    const sk = new Float64Array(pts.length);
    for (let k = K + 1; k < pts.length; k++) sk[k] = sk[k - 1]! + Math.hypot(...ab(pts[k]!, pts[k - 1]!));
    for (let k = K - 1; k >= 0; k--) sk[k] = sk[k + 1]! - Math.hypot(...ab(pts[k + 1]!, pts[k]!));
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let s4 = 0;
    const r0: V = [0, 0, 0];
    const r1: V = [0, 0, 0];
    const r2: V = [0, 0, 0];
    for (let k = 0; k < pts.length; k++) {
      const t = sk[k]!;
      const g = Math.max(0.05, 1 - (t / (fenster * 1.2)) ** 2);
      s0 += g;
      s1 += g * t;
      s2 += g * t * t;
      s3 += g * t * t * t;
      s4 += g * t * t * t * t;
      for (let c = 0; c < 3; c++) {
        r0[c] = r0[c]! + g * pts[k]![c]!;
        r1[c] = r1[c]! + g * t * pts[k]![c]!;
        r2[c] = r2[c]! + g * t * t * pts[k]![c]!;
      }
    }
    // Normalgleichungen [s0 s1 s2; s1 s2 s3; s2 s3 s4] (c0, c1, c2) = (r0, r1, r2), gesucht c1
    const det = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
    if (!(Math.abs(det) > 1e-18)) return norm(ab(p(i + 1), p(i - 1)));
    const d: V = [0, 0, 0];
    for (let c = 0; c < 3; c++) d[c] = (s0 * (r1[c]! * s4 - s3 * r2[c]!) - r0[c]! * (s1 * s4 - s3 * s2) + s2 * (s1 * r2[c]! - r1[c]! * s2)) / det;
    return norm(d);
  };
  const vorzeichen = (v: number, n: V): V => (n[0] * normalen[3 * v]! + n[1] * normalen[3 * v + 1]! + n[2] * normalen[3 * v + 2]! < 0 ? [-n[0], -n[1], -n[2]] : n);
  // Anker je Loop: Probe → Normale (Kreuzungen; auf der Mittelebene jede Probe)
  const anker = loops.map(() => new Map<number, V>());
  for (const [v, liste] of amPunkt) {
    const verschieden = [...new Set(liste.map((x) => x.li))];
    if (verschieden.length < 2) continue;
    // das Paar mit dem größten Kreuzungswinkel
    let best: V | null = null;
    let bs = SIN_MIN;
    for (let a = 0; a < liste.length; a++)
      for (let b = a + 1; b < liste.length; b++) {
        if (liste[a]!.li === liste[b]!.li) continue;
        const c = kreuz(tangente(liste[a]!.li, liste[a]!.pi), tangente(liste[b]!.li, liste[b]!.pi));
        const s = Math.hypot(c[0], c[1], c[2]);
        if (s > bs) {
          bs = s;
          best = norm(c);
        }
      }
    if (!best) continue;
    const n = vorzeichen(v, best);
    for (const x of liste) anker[x.li]!.set(x.pi, n);
  }
  loops.forEach((l, li) => {
    if (l.art !== 'mitte') return;
    for (let i = 0; i < l.proben.length; i++) {
      const v = punkt[li]![i]!;
      if (v < 0 || anker[li]!.has(i)) continue;
      const t = tangente(li, i);
      anker[li]!.set(i, vorzeichen(v, norm(kreuz([0, 0, 1], t))));
    }
  });
  // je Loop zwischen den Ankern weiterreichen
  loops.forEach((l, li) => {
    const n = l.proben.length;
    const geschlossen = l.art !== 'ring';
    const nAus = new Array<V | null>(n).fill(null);
    const A = [...anker[li]!.keys()].sort((x, y) => x - y);
    if (A.length === 0) {
      // ohne Kreuzung: Richtung der Haut
      for (let i = 0; i < n; i++) {
        const v = punkt[li]![i]!;
        if (v < 0) continue;
        const t = tangente(li, i);
        const hn: V = [normalen[3 * v]!, normalen[3 * v + 1]!, normalen[3 * v + 2]!];
        nAus[i] = norm(ab(hn, [t[0] * skal(hn, t), t[1] * skal(hn, t), t[2] * skal(hn, t)]));
      }
    } else {
      for (const a of A) nAus[a] = anker[li]!.get(a)!;
      // von Anker a zum nächsten Anker b (geschlossen ringsum; offen bis zu den Enden mit gleichem Winkel)
      const strecke = (a: number, b: number, schritt: number, ziel: V | null) => {
        // Rahmen ab a weiterreichen
        const idx: number[] = [];
        for (let k = a; ; k += schritt) {
          const i = ((k % n) + n) % n;
          idx.push(i);
          if (geschlossen ? idx.length > 1 && i === ((b % n) + n) % n : i === b) break;
          if (idx.length > n + 1) break;
        }
        const r: V[] = [nAus[a]!];
        const s: number[] = [0];
        for (let q = 1; q < idx.length; q++) {
          const x0 = lage(li, idx[q - 1]!);
          const x1 = lage(li, idx[q]!);
          const t0 = tangente(li, idx[q - 1]!);
          const t1 = tangente(li, idx[q]!);
          const v1 = ab(x1, x0);
          const c1 = skal(v1, v1);
          s.push(s[q - 1]! + Math.sqrt(c1));
          if (c1 < 1e-18) {
            r.push(r[q - 1]!);
            continue;
          }
          const r0 = r[q - 1]!;
          const rL = ab(r0, [v1[0] * ((2 / c1) * skal(v1, r0)), v1[1] * ((2 / c1) * skal(v1, r0)), v1[2] * ((2 / c1) * skal(v1, r0))]);
          const tL = ab(t0, [v1[0] * ((2 / c1) * skal(v1, t0)), v1[1] * ((2 / c1) * skal(v1, t0)), v1[2] * ((2 / c1) * skal(v1, t0))]);
          const v2 = ab(t1, tL);
          const c2 = skal(v2, v2);
          const r1 = c2 < 1e-18 ? rL : ab(rL, [v2[0] * ((2 / c2) * skal(v2, rL)), v2[1] * ((2 / c2) * skal(v2, rL)), v2[2] * ((2 / c2) * skal(v2, rL))]);
          // in die Ebene senkrecht zur Tangente legen (Rundung)
          r.push(norm(ab(r1, [t1[0] * skal(r1, t1), t1[1] * skal(r1, t1), t1[2] * skal(r1, t1)])));
        }
        // fehlender Winkel am Ziel, nach der Bogenlänge verteilt
        let phi = 0;
        const last = idx.length - 1;
        if (ziel) {
          const tz = tangente(li, idx[last]!);
          phi = Math.atan2(skal(kreuz(r[last]!, ziel), tz), skal(r[last]!, ziel));
        }
        const L = s[last]! || 1;
        for (let q = 1; q < (ziel ? last : idx.length); q++) {
          const i = idx[q]!;
          if (nAus[i] && anker[li]!.has(i)) continue;
          nAus[i] = drehen(r[q]!, tangente(li, i), (phi * s[q]!) / L);
        }
      };
      if (geschlossen) for (let k = 0; k < A.length; k++) strecke(A[k]!, k + 1 < A.length ? A[k + 1]! : A[0]! + n, 1, anker[li]!.get(A[(k + 1) % A.length]!)!);
      else {
        for (let k = 0; k + 1 < A.length; k++) strecke(A[k]!, A[k + 1]!, 1, anker[li]!.get(A[k + 1]!)!);
        if (A[0]! > 0) strecke(A[0]!, 0, -1, null);
        if (A[A.length - 1]! < n - 1) strecke(A[A.length - 1]!, n - 1, 1, null);
      }
    }
    // auf die Punkte der Haut schreiben (Spiegelbilder gespiegelt)
    for (let j = 0; j < m; j++) {
      if (plan.loop[j] !== li) continue;
      const e = plan.bind.ecken;
      const v = e[3 * j]!;
      if (e[3 * j + 1] !== v || e[3 * j + 2] !== v) continue;
      const nn = nAus[plan.probe[j]!];
      if (!nn) continue;
      aus[3 * v] = nn[0];
      aus[3 * v + 1] = nn[1];
      aus[3 * v + 2] = plan.spiegel[j] ? -nn[2] : nn[2];
    }
  });
  return aus;
}
