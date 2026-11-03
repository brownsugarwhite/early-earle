// Prüfplan P1 (Tag 2–3): Maße des Körpers für die Tore — Knicke der Stufe 1 (Grenzlagen, ohne scharfe Kanten), Flachband je
// Ansicht, Wendepunkte der Ringe, umgeklappte feine Flächen gegen einen Bezug. DOM-frei; Skript und Tests teilen sie.
import type { Ableitung } from '../ableiten';
import type { V3 } from '../../kaefig/halbkanten';
import { alleFlaechen } from '../../kaefig/halbkanten';

/** Knicke zwischen Nachbarflächen der Stufe 1 (Grad) aus den Grenzlagen `fein` (Käfig- und Stufe-1-Punkte behalten ihren Index), ohne scharfe Kanten. */
export function knickeStufe1(abl: Ableitung, fein: ArrayLike<number>): { p95: number; max: number } {
  const k1 = abl.unterteilung.stufen[0]!.kaefig;
  const fl = alleFlaechen(k1);
  const fn = new Float64Array(3 * fl.length);
  fl.forEach((f, fi) => {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      n0 += (fein[3 * a + 1]! - fein[3 * b + 1]!) * (fein[3 * a + 2]! + fein[3 * b + 2]!);
      n1 += (fein[3 * a + 2]! - fein[3 * b + 2]!) * (fein[3 * a]! + fein[3 * b]!);
      n2 += (fein[3 * a]! - fein[3 * b]!) * (fein[3 * a + 1]! + fein[3 * b + 1]!);
    }
    const s = 1 / (Math.hypot(n0, n1, n2) || 1);
    fn[3 * fi] = n0 * s;
    fn[3 * fi + 1] = n1 * s;
    fn[3 * fi + 2] = n2 * s;
  });
  const winkel: number[] = [];
  for (let e = 0; e < k1.nE; e++) {
    if (k1.eFlaechen[e] !== 2 || k1.eSchaerfe[e]! > 0) continue;
    const h = k1.eHalb[e]!;
    const t = k1.hTwin[h]!;
    if (t < 0) continue;
    const a = k1.hFace[h]!;
    const b = k1.hFace[t]!;
    const d = Math.max(-1, Math.min(1, fn[3 * a]! * fn[3 * b]! + fn[3 * a + 1]! * fn[3 * b + 1]! + fn[3 * a + 2]! * fn[3 * b + 2]!));
    winkel.push((Math.acos(d) * 180) / Math.PI);
  }
  winkel.sort((p, q) => p - q);
  return { p95: winkel[Math.floor(0.95 * (winkel.length - 1))] ?? 0, max: winkel[winkel.length - 1] ?? 0 };
}

/** Flachband je Ansicht: Flächenanteil (%) der feinen Dreiecke mit |n·Blick| < sin 5°. */
export function flachband(punkte: readonly V3[], flaechen: readonly (readonly number[])[]): Record<'seite' | 'front' | 'top', number> {
  const blick: Record<'seite' | 'front' | 'top', V3> = { seite: [0, 0, 1], front: [1, 0, 0], top: [0, 1, 0] };
  const grenze = Math.sin((5 * Math.PI) / 180);
  const out = { seite: 0, front: 0, top: 0 };
  let ganz = 0;
  for (const f of flaechen) {
    for (let i = 1; i + 1 < f.length; i++) {
      const a = punkte[f[0]!]!;
      const b = punkte[f[i]!]!;
      const c = punkte[f[i + 1]!]!;
      const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const nrm: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(nrm[0], nrm[1], nrm[2]);
      if (!l) continue;
      ganz += l;
      for (const a2 of ['seite', 'front', 'top'] as const) {
        const bl = blick[a2];
        if (Math.abs((nrm[0] * bl[0] + nrm[1] * bl[1] + nrm[2] * bl[2]) / l) < grenze) out[a2] += l;
      }
    }
  }
  return { seite: (100 * out.seite) / ganz, front: (100 * out.front) / ganz, top: (100 * out.top) / ganz };
}

/** Größte Zahl der Wendepunkte eines Rings (Käfigpolygon der Grenzlagen in der Ebene yz; Vorzeichenwechsel des Kreuzprodukts). */
export function wendepunkte(abl: Ableitung, fein: ArrayLike<number>): number {
  const { R, N } = abl.vorlage;
  let max = 0;
  for (let i = 0; i < R; i++) {
    let wechsel = 0;
    let letztes = 0;
    for (let j = 0; j < N; j++) {
      const p = (jj: number) => {
        const v = i * N + (((jj % N) + N) % N);
        return [fein[3 * v + 1]!, fein[3 * v + 2]!];
      };
      const a = p(j - 1);
      const b = p(j);
      const c = p(j + 1);
      const kreuz = (b[0]! - a[0]!) * (c[1]! - b[1]!) - (b[1]! - a[1]!) * (c[0]! - b[0]!);
      const sgn = Math.abs(kreuz) < 1e-9 ? 0 : Math.sign(kreuz);
      if (sgn && letztes && sgn !== letztes) wechsel++;
      if (sgn) letztes = sgn;
    }
    max = Math.max(max, wechsel);
  }
  return max;
}

/** Umgeklappte feine Flächen: Normale gegen die Normale des Bezugs (heutiger Bau); dazu ihre Lage (Ringband der Käfigfläche oder Kappe). */
export function umgeklappt(vor: readonly V3[], nach: readonly V3[], flaechen: readonly (readonly number[])[], abl: Ableitung): { zahl: number; wo: string } {
  const L = abl.unterteilung.stufen.length;
  const { R, N } = abl.vorlage;
  const orte = new Map<string, number>();
  let z = 0;
  const normale = (pts: readonly V3[], f: readonly number[]): V3 => {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    for (let i = 0; i < f.length; i++) {
      const a = pts[f[i]!]!;
      const b = pts[f[(i + 1) % f.length]!]!;
      n0 += (a[1] - b[1]) * (a[2] + b[2]);
      n1 += (a[2] - b[2]) * (a[0] + b[0]);
      n2 += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return [n0, n1, n2];
  };
  flaechen.forEach((f, fi) => {
    const a = normale(vor, f);
    const b = normale(nach, f);
    if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] >= 0) return;
    z++;
    const kf = Math.floor(fi / 4 ** L);
    const ort = kf < (R - 1) * N ? `Ring ${Math.floor(kf / N)}` : kf < (R - 1) * N + (N / 4) * (N / 4) ? 'Kappe vorn' : 'Kappe hinten';
    orte.set(ort, (orte.get(ort) ?? 0) + 1);
  });
  return { zahl: z, wo: [...orte.entries()].sort((p, q) => q[1] - p[1]).slice(0, 5).map(([o, n]) => `${o} ${n}`).join(', ') };
}

/** Feine Punkte (3 Werte je Punkt) als Liste. */
export function punkteVon(fein: ArrayLike<number>): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < fein.length / 3; i++) out.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  return out;
}
