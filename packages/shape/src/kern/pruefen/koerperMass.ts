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

/**
 * Größte Zahl der Wendepunkte eines Rings (Käfigpolygon der Grenzlagen in der Ringebene quer zur Achse: yz bei Achse x, xz bei
 * Achse y; Vorzeichenwechsel des Kreuzprodukts).
 */
export function wendepunkte(abl: Ableitung, fein: ArrayLike<number>, achse: 'x' | 'y' = 'x'): number {
  const { R, N } = abl.vorlage;
  const [k0, k1] = achse === 'x' ? [1, 2] : [0, 2];
  let max = 0;
  for (let i = 0; i < R; i++) {
    let wechsel = 0;
    let letztes = 0;
    for (let j = 0; j < N; j++) {
      const p = (jj: number) => {
        const v = i * N + (((jj % N) + N) % N);
        return [fein[3 * v + k0]!, fein[3 * v + k1]!];
      };
      const a = p(j - 1);
      const b = p(j);
      const c = p(j + 1);
      const kreuz = (b[0]! - a[0]!) * (c[1]! - b[1]!) - (b[1]! - a[1]!) * (c[0]! - b[0]!);
      // gerade Stücke (Kasten, Zylinder) zählen nicht: Drehungen unter 2° sind der Wellenschlag des Lösers (≤ 1 px an den
      // Kappenringen des scharfen Würfels) oder die gezeichnete Bogung einer Kante, kein Wendepunkt eines Rings
      const l1 = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!);
      const l2 = Math.hypot(c[0]! - b[0]!, c[1]! - b[1]!);
      const sgn = Math.abs(kreuz) < 3.5e-2 * l1 * l2 ? 0 : Math.sign(kreuz);
      if (sgn && letztes && sgn !== letztes) wechsel++;
      if (sgn) letztes = sgn;
    }
    max = Math.max(max, wechsel);
  }
  return max;
}

/**
 * Nach innen gekehrte feine Flächen (absolut, ohne Bezug): Normale gegen die Richtung von der Achse (Gerade durch die Mitte
 * der Punkte, längs x oder y) zum Flächenmittelpunkt, deutlich (cos < −0,2 — Messerkanten mit Normalen quer zur Achse zählen
 * nicht). Dazu die Lage (Ringband oder Kappe) wie `umgeklappt`.
 */
export function nachInnen(punkte: readonly V3[], flaechen: readonly (readonly number[])[], abl: Ableitung, achse: 'x' | 'y' = 'x'): { zahl: number; wo: string } {
  const L = abl.unterteilung.stufen.length;
  const { R, N } = abl.vorlage;
  const mitte: V3 = [0, 0, 0];
  for (const p of punkte) {
    mitte[0] += p[0] / punkte.length;
    mitte[1] += p[1] / punkte.length;
    mitte[2] += p[2] / punkte.length;
  }
  const orte = new Map<string, number>();
  let z = 0;
  flaechen.forEach((f, fi) => {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    const m: V3 = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = punkte[f[i]!]!;
      const b = punkte[f[(i + 1) % f.length]!]!;
      n0 += (a[1] - b[1]) * (a[2] + b[2]);
      n1 += (a[2] - b[2]) * (a[0] + b[0]);
      n2 += (a[0] - b[0]) * (a[1] + b[1]);
      m[0] += a[0] / f.length;
      m[1] += a[1] / f.length;
      m[2] += a[2] / f.length;
    }
    // radial von der Achse: Komponente längs der Achse weglassen
    const r: V3 = [m[0] - mitte[0], m[1] - mitte[1], m[2] - mitte[2]];
    if (achse === 'x') r[0] = 0;
    else r[1] = 0;
    const ln = Math.hypot(n0, n1, n2);
    const lr = Math.hypot(r[0], r[1], r[2]);
    if (!(ln > 1e-18) || !(lr > 1e-9)) return;
    if ((n0 * r[0] + n1 * r[1] + n2 * r[2]) / (ln * lr) >= -0.2) return;
    z++;
    const kf = Math.floor(fi / 4 ** L);
    const ort = kf < (R - 1) * N ? `Ring ${Math.floor(kf / N)}` : kf < (R - 1) * N + (N / 4) * (N / 4) ? 'Kappe vorn' : kf < (R - 1) * N + 2 * (N / 4) * (N / 4) ? 'Kappe hinten' : 'Teil';
    orte.set(ort, (orte.get(ort) ?? 0) + 1);
  });
  return { zahl: z, wo: [...orte.entries()].sort((p, q) => q[1] - p[1]).slice(0, 5).map(([o, n]) => `${o} ${n}`).join(', ') };
}

/**
 * Nach innen gekehrte feine Flächen je Teil (Rumpf mit Kindern): Rumpfflächen gegen die Rumpfachse (Gerade durch die Mitte der
 * Rumpfpunkte, längs x oder y), Kindflächen gegen die Kindachse (Fuß → Spitze). `teilVonFlaeche` je Käfigfläche (−1 = Rumpf).
 */
export function nachInnenTeile(punkte: readonly V3[], flaechen: readonly (readonly number[])[], abl: Ableitung, achse: 'x' | 'y', teilVonFlaeche: ArrayLike<number>, kinder: readonly { fuss: V3; spitze: V3; achse?: V3[] }[]): { zahl: number; wo: string; rumpf: number; kinder: number[] } {
  const L = abl.unterteilung.stufen.length;
  const nP = abl.vorlage.kaefig.n;
  const mitte: V3 = [0, 0, 0];
  let z0 = 0;
  for (let i = 0; i < Math.min(nP, punkte.length); i++) {
    const p = punkte[i]!;
    mitte[0] += p[0];
    mitte[1] += p[1];
    mitte[2] += p[2];
    z0++;
  }
  for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! / Math.max(1, z0);
  const orte = new Map<string, number>();
  let z = 0;
  let rumpf = 0;
  const jeKind = kinder.map(() => 0);
  flaechen.forEach((f, fi) => {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    const m: V3 = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = punkte[f[i]!]!;
      const b = punkte[f[(i + 1) % f.length]!]!;
      n0 += (a[1] - b[1]) * (a[2] + b[2]);
      n1 += (a[2] - b[2]) * (a[0] + b[0]);
      n2 += (a[0] - b[0]) * (a[1] + b[1]);
      m[0] += a[0] / f.length;
      m[1] += a[1] / f.length;
      m[2] += a[2] / f.length;
    }
    const kf = Math.floor(fi / 4 ** L);
    const teil = teilVonFlaeche[kf] ?? -1;
    const kind = teil >= 0 ? kinder[teil] : undefined;
    let r: V3;
    if (kind) {
      // radial von der Kindachse (Polygonzug Fuß → Ringmitten → Spitze): vom nächsten Achsenpunkt zum Flächenmittelpunkt
      const achseK = kind.achse ?? [kind.fuss, kind.spitze];
      let best: V3 = achseK[0]!;
      let bd = Infinity;
      for (const q of achseK) {
        const dd = (q[0] - m[0]) ** 2 + (q[1] - m[1]) ** 2 + (q[2] - m[2]) ** 2;
        if (dd < bd) {
          bd = dd;
          best = q;
        }
      }
      r = [m[0] - best[0], m[1] - best[1], m[2] - best[2]];
    } else {
      r = [m[0] - mitte[0], m[1] - mitte[1], m[2] - mitte[2]];
      if (achse === 'x') r[0] = 0;
      else r[1] = 0;
    }
    const ln = Math.hypot(n0, n1, n2);
    const lr = Math.hypot(r[0], r[1], r[2]);
    if (!(ln > 1e-18) || !(lr > 1e-9)) return;
    if ((n0 * r[0] + n1 * r[1] + n2 * r[2]) / (ln * lr) >= -0.2) return;
    z++;
    if (kind) jeKind[teil] = jeKind[teil]! + 1;
    else rumpf++;
    const ort = kind ? `Kind ${teil}` : kf < (abl.vorlage.R - 1) * abl.vorlage.N ? `Ring ${Math.floor(kf / abl.vorlage.N)}` : 'Kappe';
    orte.set(ort, (orte.get(ort) ?? 0) + 1);
  });
  return { zahl: z, wo: [...orte.entries()].sort((p, q) => q[1] - p[1]).slice(0, 5).map(([o, n]) => `${o} ${n}`).join(', '), rumpf, kinder: jeKind };
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
    const ort = kf < (R - 1) * N ? `Ring ${Math.floor(kf / N)}` : kf < (R - 1) * N + (N / 4) * (N / 4) ? 'Kappe vorn' : kf < (R - 1) * N + 2 * (N / 4) * (N / 4) ? 'Kappe hinten' : 'Teil';
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
