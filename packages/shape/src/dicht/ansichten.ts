// Form zuerst (04.11.2026): Front und Top als Griffe auf dasselbe Modell.
//
// Die Seite gibt den Umriss in x/y. Front und Top sagen, wie breit (z) der Körper auf jeder Höhe bzw. an jeder Stelle längs
// ist: je ein halbes Profil, spiegelgleich zur Mittelebene, über der Ausdehnung der Seite (zieht Florian die Seite höher,
// streckt sich die Front mit). Der runde Körper aus der Seite wird in der Tiefe gestreckt, z → a(x) · b(y) · z, bis sein
// Front-Umriss die Front und sein Top-Umriss das Top trifft. So bleiben alle drei Ansichten Ansichten desselben Modells; die
// Seite ändert sich dabei nicht. Solange Florian eine Ansicht nicht angefasst hat, folgt sie dem Körper.

import { type UmrissPunkt, umrissAbtasten } from './umriss';

/** Ein Punkt eines halben Profils: `laengs` 0 … 1 über die Ausdehnung der Seite, `quer` die halbe Breite (≥ 0). */
export type BreitenPunkt = { laengs: number; quer: number; ecke?: boolean };

/** Umriss einer Ansicht als halbe Breite auf einem gleichmäßigen Raster längs der gemeinsamen Achse (ab r0, Schritt dr). */
export type Ansichtsbreite = { r0: number; dr: number; breite: Float64Array };

/** Streckung der Tiefe: Faktor a je Rasterspalte (x), b je Rasterzeile (y). */
export type Tiefenstreckung = { a: Float64Array; b: Float64Array; x0: number; y0: number; d: number };

/** Das ganze Profil (beide Hälften) als geschlossener Umriss: x = längs (a0 … a1, Welt-Einheiten), y = quer. */
export function profilUmriss(p: readonly BreitenPunkt[], a0: number, a1: number): UmrissPunkt[] {
  const L = a1 - a0;
  const welt: UmrissPunkt[] = p.map((q) => (q.ecke ? { x: a0 + q.laengs * L, y: q.quer, ecke: true } : { x: a0 + q.laengs * L, y: q.quer }));
  const spiegel = welt
    .slice(1, -1)
    .reverse()
    .map((q) => ({ ...q, y: -q.y }));
  return [...welt, ...spiegel];
}

/** Halbe Breite des Profils an den Rasterstellen r0 + i · dr (Welt-Einheiten längs); außerhalb des Profils 0. */
export function profilBreite(p: readonly BreitenPunkt[], a0: number, a1: number, r0: number, dr: number, n: number): Float64Array {
  const out = new Float64Array(n);
  if (p.length < 2 || !(a1 > a0)) return out;
  const { punkte } = umrissAbtasten(profilUmriss(p, a0, a1), Math.max((a1 - a0) / 600, dr / 3));
  for (let k = 0; k < punkte.length; k++) {
    const a = punkte[k]!;
    const b = punkte[(k + 1) % punkte.length]!;
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    const i0 = Math.max(0, Math.ceil((lo - r0) / dr));
    const i1 = Math.min(n - 1, Math.floor((hi - r0) / dr));
    for (let i = i0; i <= i1; i++) {
      const t = hi > lo ? (r0 + i * dr - a.x) / (b.x - a.x) : 0;
      const y = Math.abs(a.y + t * (b.y - a.y));
      if (y > out[i]!) out[i] = y;
    }
  }
  return out;
}

/**
 * Ein Profil mit möglichst wenigen Punkten, das dem Umriss einer Ansicht folgt: die Enden auf der Achse und die breiteste
 * Stelle, dann immer die Stelle, an der die Kurve am weitesten danebenliegt, bis sie höchstens `tol` abweicht oder das
 * Profil `maxPunkte` Punkte hat.
 */
export function profilAusBreite(w: Ansichtsbreite, a0: number, a1: number, tol: number, maxPunkte = 6): BreitenPunkt[] {
  const n = w.breite.length;
  const L = a1 - a0;
  if (!(L > 0)) return [];
  const innen = (i: number) => {
    const x = w.r0 + i * w.dr;
    return x > a0 && x < a1;
  };
  let iMax = -1;
  for (let i = 0; i < n; i++) if (innen(i) && (iMax < 0 || w.breite[i]! > w.breite[iMax]!)) iMax = i;
  const pk: BreitenPunkt[] = [{ laengs: 0, quer: 0 }];
  if (iMax >= 0) pk.push({ laengs: (w.r0 + iMax * w.dr - a0) / L, quer: w.breite[iMax]! });
  pk.push({ laengs: 1, quer: 0 });
  while (pk.length < maxPunkte) {
    const b = profilBreite(pk, a0, a1, w.r0, w.dr, n);
    let schlimm = 0;
    let wo = -1;
    for (let i = 0; i < n; i++) {
      if (!innen(i)) continue;
      const d = Math.abs(b[i]! - w.breite[i]!);
      if (d > schlimm) {
        schlimm = d;
        wo = i;
      }
    }
    if (schlimm <= tol || wo < 0) break;
    const l = (w.r0 + wo * w.dr - a0) / L;
    let k = 1;
    while (k < pk.length - 1 && pk[k]!.laengs < l) k++;
    pk.splice(k, 0, { laengs: l, quer: w.breite[wo]! });
  }
  return pk;
}

/** Faktoren füllen, wo sie fehlen (Lücken innen linear, an den Enden der letzte gültige), begrenzen und leicht glätten. */
function faktorenRichten(f: Float64Array, gueltig: Uint8Array): void {
  const n = f.length;
  let vorher = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && !gueltig[i]) continue;
    // Lücke zwischen vorher und i
    for (let k = vorher + 1; k < i; k++) {
      if (vorher < 0 && i >= n) f[k] = 1;
      else if (vorher < 0) f[k] = f[i]!;
      else if (i >= n) f[k] = f[vorher]!;
      else f[k] = f[vorher]! + ((f[i]! - f[vorher]!) * (k - vorher)) / (i - vorher);
    }
    vorher = i;
  }
  for (let i = 0; i < n; i++) f[i] = Math.max(0.05, Math.min(20, Number.isFinite(f[i]!) ? f[i]! : 1));
  const tmp = new Float64Array(n);
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < n; i++) tmp[i] = (f[Math.max(0, i - 1)]! + 2 * f[i]! + f[Math.min(n - 1, i + 1)]!) / 4;
    f.set(tmp);
  }
}

/**
 * Faktoren a (je Spalte) und b (je Zeile), mit denen der Körper (halbe Dicke √g auf dem Raster) die Zielbreiten trifft: F je
 * Zeile (Front), T je Spalte (Top); fehlt eines, bleibt sein Faktor 1. Abwechselnd angepasst, je Zeile bzw. Spalte über die
 * breiteste Stelle. Zeilen und Spalten mit weniger als zwei Zellen Dicke (die Spitzen) nehmen den Faktor ihrer Nachbarn.
 * Gibt auch die Umrisse von Front und Top des gestreckten Körpers zurück.
 */
export function tiefeAnpassen(
  G: Float64Array,
  nx: number,
  ny: number,
  x0: number,
  y0: number,
  d: number,
  F: Float64Array | null,
  T: Float64Array | null,
): { streckung: Tiefenstreckung; front: Float64Array; top: Float64Array } {
  const Z = new Float64Array(nx * ny);
  for (let k = 0; k < nx * ny; k++) Z[k] = G[k]! > 0 ? Math.sqrt(G[k]!) : 0;
  const a = new Float64Array(nx).fill(1);
  const b = new Float64Array(ny).fill(1);
  const gb = new Uint8Array(ny);
  const ga = new Uint8Array(nx);
  // abwechselnd steht nach wenigen Runden fest (mehr als 12 ändern nichts mehr); was dann bleibt, kann die Streckung
  // a(x) · b(y) nicht: Front und Top widersprechen sich jenseits der größten Breite
  const runden = F && T ? 12 : 1;
  for (let r = 0; r < runden; r++) {
    if (F) {
      for (let j = 0; j < ny; j++) {
        let m = 0;
        for (let i = 0; i < nx; i++) m = Math.max(m, Z[j * nx + i]! * a[i]!);
        gb[j] = m >= 2 * d ? 1 : 0;
        b[j] = gb[j] ? F[j]! / m : 1;
      }
      faktorenRichten(b, gb);
    }
    if (T) {
      for (let i = 0; i < nx; i++) {
        let m = 0;
        for (let j = 0; j < ny; j++) m = Math.max(m, Z[j * nx + i]! * b[j]!);
        ga[i] = m >= 2 * d ? 1 : 0;
        a[i] = ga[i] ? T[i]! / m : 1;
      }
      faktorenRichten(a, ga);
    }
  }
  const front = new Float64Array(ny);
  const top = new Float64Array(nx);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const z = Z[j * nx + i]! * a[i]! * b[j]!;
      if (z > front[j]!) front[j] = z;
      if (z > top[i]!) top[i] = z;
    }
  }
  return { streckung: { a, b, x0, y0, d }, front, top };
}

/** Catmull-Rom auf den Faktoren: Wert und Ableitung je Rasterschritt an der Stelle u (in Rasterschritten). */
function kubisch(f: Float64Array, u: number, aus: [number, number]): void {
  const n = f.length;
  if (n === 1) {
    aus[0] = f[0]!;
    aus[1] = 0;
    return;
  }
  const uu = Math.max(0, Math.min(n - 1, u));
  const i = Math.min(n - 2, Math.floor(uu));
  const t = uu - i;
  const p0 = f[Math.max(0, i - 1)]!;
  const p1 = f[i]!;
  const p2 = f[i + 1]!;
  const p3 = f[Math.min(n - 1, i + 2)]!;
  const c1 = -p0 + p2;
  const c2 = 2 * p0 - 5 * p1 + 4 * p2 - p3;
  const c3 = -p0 + 3 * p1 - 3 * p2 + p3;
  aus[0] = 0.5 * (2 * p1 + c1 * t + c2 * t * t + c3 * t * t * t);
  aus[1] = 0.5 * (c1 + 2 * c2 * t + 3 * c3 * t * t);
}

/** Streckung der Tiefe an der Stelle (x, y) der Seite (ohne Front und Top: 1). */
export function streckungBei(s: Tiefenstreckung | null, x: number, y: number): number {
  if (!s) return 1;
  const A: [number, number] = [0, 0];
  const B: [number, number] = [0, 0];
  kubisch(s.a, (x - s.x0) / s.d, A);
  kubisch(s.b, (y - s.y0) / s.d, B);
  return A[0] * B[0];
}

/**
 * Streckt die Tiefe: z → s · z mit s = a(x) · b(y). Normalen mit der inversen transponierten Ableitung der Abbildung:
 * n → (nx − sₓ z / s · nz, ny − s_y z / s · nz, nz / s).
 */
export function tiefeAnwenden(pos: Float32Array, nor: Float32Array | null, s: Tiefenstreckung): void {
  const A: [number, number] = [0, 0];
  const B: [number, number] = [0, 0];
  for (let v = 0; v < pos.length / 3; v++) {
    const x = pos[3 * v]!;
    const y = pos[3 * v + 1]!;
    const z = pos[3 * v + 2]!;
    kubisch(s.a, (x - s.x0) / s.d, A);
    kubisch(s.b, (y - s.y0) / s.d, B);
    const f = A[0] * B[0];
    pos[3 * v + 2] = f * z;
    if (!nor) continue;
    const fx = (A[1] / s.d) * B[0];
    const fy = (A[0] * B[1]) / s.d;
    const nz = nor[3 * v + 2]!;
    const mx = nor[3 * v]! - ((fx * z) / f) * nz;
    const my = nor[3 * v + 1]! - ((fy * z) / f) * nz;
    const mz = nz / f;
    const ml = Math.hypot(mx, my, mz) || 1;
    nor[3 * v] = mx / ml;
    nor[3 * v + 1] = my / ml;
    nor[3 * v + 2] = mz / ml;
  }
}
