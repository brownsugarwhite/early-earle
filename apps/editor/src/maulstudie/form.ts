/**
 * Studie „Maul, Zähne, Zunge“ (20.11.2026): eine gesicherte Form laden und für die Studie glatt machen.
 *
 * Die Studie steht neben Ozzy. Sie liest eine Datei aus `wesen/` (Haut des Rechennetzes und Linien), rechnet nichts an der Form
 * und ändert nichts an ihr. Die Haut wird zweimal verfeinert (Loop), damit der Umriss rund ist; harte Kanten der Form sind dabei
 * weich (Ozzy zeigt sie hart). Für den Beweis „ein Maul aus einer Linie“ genügt das.
 */
import { entpacken } from '../form/ablage';

export type Linie = { id: number; art: 'mitte' | 'ring' | 'paar'; kante: boolean; pos: Float32Array };
export type Form = {
  name: string;
  /** geschlossenes Netz: Punkte, Normalen (je Punkt, glatt), Dreiecke */
  pos: Float32Array;
  nor: Float32Array;
  tri: Uint32Array;
  /** die Linien der Form als Streckenzüge auf der Haut (beide Hälften) */
  linien: Linie[];
  /** Kasten der Form */
  min: [number, number, number];
  max: [number, number, number];
};

/** eine Stufe Loop: jedes Dreieck wird vier, die Fläche wird rund */
export function loopStufe(pos: Float64Array, tri: Uint32Array): { pos: Float64Array; tri: Uint32Array } {
  const n = pos.length / 3;
  const nT = tri.length / 3;
  const kante = new Map<number, number>();
  const ea: number[] = [];
  const eb: number[] = [];
  const eo1: number[] = [];
  const eo2: number[] = [];
  const triK = new Uint32Array(3 * nT);
  for (let t = 0; t < nT; t++) {
    for (let k = 0; k < 3; k++) {
      const a = tri[3 * t + k]!;
      const b = tri[3 * t + ((k + 1) % 3)]!;
      const c = tri[3 * t + ((k + 2) % 3)]!;
      const key = a < b ? a * n + b : b * n + a;
      let e = kante.get(key);
      if (e === undefined) {
        e = ea.length;
        kante.set(key, e);
        ea.push(a);
        eb.push(b);
        eo1.push(c);
        eo2.push(-1);
      } else eo2[e] = c;
      triK[3 * t + k] = e;
    }
  }
  const E = ea.length;
  const val = new Uint32Array(n);
  const sum = new Float64Array(3 * n);
  for (let e = 0; e < E; e++) {
    const a = ea[e]!;
    const b = eb[e]!;
    val[a]!++;
    val[b]!++;
    for (let k = 0; k < 3; k++) {
      sum[3 * a + k]! += pos[3 * b + k]!;
      sum[3 * b + k]! += pos[3 * a + k]!;
    }
  }
  const aus = new Float64Array(3 * (n + E));
  for (let v = 0; v < n; v++) {
    const k = val[v]!;
    const beta = k === 3 ? 3 / 16 : 3 / (8 * k);
    for (let d = 0; d < 3; d++) aus[3 * v + d] = (1 - k * beta) * pos[3 * v + d]! + beta * sum[3 * v + d]!;
  }
  for (let e = 0; e < E; e++) {
    const a = ea[e]!;
    const b = eb[e]!;
    const o1 = eo1[e]!;
    const o2 = eo2[e]!;
    for (let d = 0; d < 3; d++) {
      aus[3 * (n + e) + d] = o2 < 0 ? 0.5 * (pos[3 * a + d]! + pos[3 * b + d]!) : 0.375 * (pos[3 * a + d]! + pos[3 * b + d]!) + 0.125 * (pos[3 * o1 + d]! + pos[3 * o2 + d]!);
    }
  }
  const neu = new Uint32Array(12 * nT);
  for (let t = 0; t < nT; t++) {
    const a = tri[3 * t]!;
    const b = tri[3 * t + 1]!;
    const c = tri[3 * t + 2]!;
    const ab = n + triK[3 * t]!;
    const bc = n + triK[3 * t + 1]!;
    const ca = n + triK[3 * t + 2]!;
    neu.set([a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca], 12 * t);
  }
  return { pos: aus, tri: neu };
}

/** Normalen je Punkt, nach dem Winkel gewichtet (nicht nach der Fläche: Das kippt auf ungleichem Netz zur dichteren Seite) */
export function normalen(pos: ArrayLike<number>, tri: ArrayLike<number>): Float32Array {
  const n = pos.length / 3;
  const N = new Float32Array(3 * n);
  const p = (v: number, d: number): number => pos[3 * v + d]!;
  for (let t = 0; t < tri.length; t += 3) {
    const v = [tri[t]!, tri[t + 1]!, tri[t + 2]!];
    const ux = p(v[1]!, 0) - p(v[0]!, 0);
    const uy = p(v[1]!, 1) - p(v[0]!, 1);
    const uz = p(v[1]!, 2) - p(v[0]!, 2);
    const wx = p(v[2]!, 0) - p(v[0]!, 0);
    const wy = p(v[2]!, 1) - p(v[0]!, 1);
    const wz = p(v[2]!, 2) - p(v[0]!, 2);
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    for (let k = 0; k < 3; k++) {
      const a = v[k]!;
      const b = v[(k + 1) % 3]!;
      const c = v[(k + 2) % 3]!;
      const e1x = p(b, 0) - p(a, 0);
      const e1y = p(b, 1) - p(a, 1);
      const e1z = p(b, 2) - p(a, 2);
      const e2x = p(c, 0) - p(a, 0);
      const e2y = p(c, 1) - p(a, 1);
      const e2z = p(c, 2) - p(a, 2);
      const l1 = Math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z) || 1;
      const l2 = Math.sqrt(e2x * e2x + e2y * e2y + e2z * e2z) || 1;
      const w = Math.acos(Math.max(-1, Math.min(1, (e1x * e2x + e1y * e2y + e1z * e2z) / (l1 * l2))));
      N[3 * a]! += w * nx;
      N[3 * a + 1]! += w * ny;
      N[3 * a + 2]! += w * nz;
    }
  }
  for (let v = 0; v < n; v++) {
    const l = Math.sqrt(N[3 * v]! ** 2 + N[3 * v + 1]! ** 2 + N[3 * v + 2]! ** 2) || 1;
    N[3 * v]! /= l;
    N[3 * v + 1]! /= l;
    N[3 * v + 2]! /= l;
  }
  return N;
}

export async function formLaden(name: string, stufen = 2): Promise<Form> {
  const antwort = await fetch(`/__wesen/${encodeURIComponent(name)}`);
  if (!antwort.ok) throw new Error(`„${name}“ ließ sich nicht laden (${antwort.status})`);
  const stand = entpacken(await antwort.arrayBuffer());
  // in der Pose gesichert: Die Grundform steht daneben
  const haut = stand.grund ? stand.grund.haut : stand.haut;
  const loops = stand.grund ? stand.grund.loops : stand.loops;
  const P0 = haut.pos;
  // die Linien: jede Probe ist ein Ort in einem Dreieck der Haut
  const linien: Linie[] = [];
  for (const l of loops) {
    const m = l.proben.length;
    if (m < 2) continue;
    const zu = l.art !== 'ring';
    const q = new Float32Array(3 * (m + (zu ? 1 : 0)));
    for (let i = 0; i < m; i++) {
      const pr = l.proben[i]!;
      for (let d = 0; d < 3; d++) q[3 * i + d] = pr.b[0]! * P0[3 * pr.ecken[0]! + d]! + pr.b[1]! * P0[3 * pr.ecken[1]! + d]! + pr.b[2]! * P0[3 * pr.ecken[2]! + d]!;
    }
    if (zu) for (let d = 0; d < 3; d++) q[3 * m + d] = q[d]!;
    const kante = !!l.kante;
    linien.push({ id: l.id, art: l.art, kante, pos: q });
    // Ring und Paar gehören zur Hälfte z ≥ 0: das Spiegelbild dazu
    if (l.art !== 'mitte') {
      const s = q.slice();
      for (let i = 2; i < s.length; i += 3) s[i] = -s[i]!;
      linien.push({ id: l.id, art: l.art, kante, pos: s });
    }
  }
  let netz: { pos: Float64Array; tri: Uint32Array } = { pos: Float64Array.from(haut.pos.subarray(0, 3 * haut.n)), tri: Uint32Array.from(haut.tri) };
  // ohne Angabe: so fein, dass der Umriss rund ist, höchstens rund 250 000 Dreiecke
  const n = stufen >= 0 ? stufen : netz.tri.length / 3 > 20000 ? 1 : 2;
  for (let s = 0; s < n; s++) netz = loopStufe(netz.pos, netz.tri);
  const pos = Float32Array.from(netz.pos);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let d = 0; d < 3; d++) {
      min[d] = Math.min(min[d]!, pos[i + d]!);
      max[d] = Math.max(max[d]!, pos[i + d]!);
    }
  }
  return { name, pos, nor: normalen(pos, netz.tri), tri: netz.tri, linien, min, max };
}
