// Ozzy als Modell (Florian, 19.11.: „Front ist am wichtigsten. seite und 3/4 sind angenähert … Ich verlange ja nicht dass es 100%
// trifft. aber es war ja komplett daneben und unschön“). Ein Teil wird aus seinem Umriss in der Hauptansicht aufgeblasen wie ein Ballon:
// Poisson-Gleichung im Umriss (Δu = −1, am Rand 0), Höhe 2·√u (ein Kreis wird so genau eine Kugel, jede andere Form ebenso rund). Von
// vorn ist das genau sein Umriss. Die Tiefe nimmt das Teil Zeile für Zeile aus der zweiten Ansicht, geglättet: angenähert, ohne Schnitte
// und Kanten. Daraus ein Feld (innen negativ) und ein glattes Netz (Surface Nets, Ecken auf die Fläche gezogen). Ohne DOM.
import type { Form } from '../form';
import { abstandsfeld, fuellen, type Gitter, gitterUm, lesen, linienzug } from '../raum/gitter';

/** Fläche einer Ansicht: Abstandsfeld (innen negativ) auf einem feinen Gitter */
export interface Flaeche {
  g: Gitter;
  abstand: Float32Array;
  kasten: [number, number, number, number];
}

export function flaecheAus(formen: Form[], s = 0.5, rand = 16): Flaeche {
  const zuege = formen.map((f) => linienzug(f, 6));
  const k: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const z of zuege)
    for (let i = 0; i < z.length; i += 2) {
      k[0] = Math.min(k[0], z[i]!);
      k[1] = Math.min(k[1], z[i + 1]!);
      k[2] = Math.max(k[2], z[i]!);
      k[3] = Math.max(k[3], z[i + 1]!);
    }
  const g = gitterUm(k, s, rand);
  return { g, abstand: weich(abstandsfeld(fuellen(zuege, g), g), g), kasten: k };
}

/**
 * Abstandsfeld leicht weichgezeichnet (Gauß, σ = 1 Einheit): Aus der Maske gerechnet hat es Treppen von einer halben Zelle; am Umriss
 * ließen sie die Richtung der Fläche von Zelle zu Zelle springen (Streifen, und der schwarze Rand stach durch die Fläche)
 */
export function weich(f: Float32Array, g: Gitter, sigma = 1): Float32Array {
  const r = Math.ceil((2.5 * sigma) / g.s);
  const k = new Float32Array(2 * r + 1);
  let sk = 0;
  for (let i = -r; i <= r; i++) sk += k[i + r] = Math.exp(-0.5 * ((i * g.s) / sigma) ** 2);
  for (let i = 0; i < k.length; i++) k[i] = k[i]! / sk;
  const a = new Float32Array(f.length);
  const out = new Float32Array(f.length);
  for (let j = 0; j < g.h; j++)
    for (let i = 0; i < g.b; i++) {
      let v = 0;
      for (let q = -r; q <= r; q++) v += k[q + r]! * f[j * g.b + Math.max(0, Math.min(g.b - 1, i + q))]!;
      a[j * g.b + i] = v;
    }
  for (let j = 0; j < g.h; j++)
    for (let i = 0; i < g.b; i++) {
      let v = 0;
      for (let q = -r; q <= r; q++) v += k[q + r]! * a[Math.max(0, Math.min(g.h - 1, j + q)) * g.b + i]!;
      out[j * g.b + i] = v;
    }
  return out;
}

/** Fläche aus Formen auf einem gegebenen Gitter (mehrere Flächen auf demselben Gitter lassen sich Zelle für Zelle verknüpfen) */
export function flaecheAufGitter(formen: Form[], g: Gitter): Flaeche {
  const zuege = formen.map((f) => linienzug(f, 6));
  return flaecheAusMaske(fuellen(zuege, g), g);
}

/** Fläche aus einer Maske (Zellen innen = 1) */
export function flaecheAusMaske(m: Uint8Array, g: Gitter): Flaeche {
  const k: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let j = 0; j < g.h; j++)
    for (let i = 0; i < g.b; i++) {
      if (!m[j * g.b + i]) continue;
      k[0] = Math.min(k[0], g.x0 + i * g.s);
      k[1] = Math.min(k[1], g.y0 + j * g.s);
      k[2] = Math.max(k[2], g.x0 + (i + 1) * g.s);
      k[3] = Math.max(k[3], g.y0 + (j + 1) * g.s);
    }
  return { g, abstand: weich(abstandsfeld(m, g), g), kasten: k };
}

/** Zellen, deren Abstand kleiner ist als `unter` (−r: um r verkleinert, +r: um r vergrößert) */
export function maskeUnter(f: Flaeche, unter: number): Uint8Array {
  const m = new Uint8Array(f.abstand.length);
  for (let i = 0; i < m.length; i++) m[i] = f.abstand[i]! < unter ? 1 : 0;
  return m;
}

/** Abstand (innen negativ) einer Fläche an (x, y), um `um` nach innen versetzt (positiv: kleiner) */
export const abstandVon =
  (f: Flaeche, um = 0) =>
  (x: number, y: number): number =>
    lesen(f.abstand, f.g, x, y) + um;

/** Lösung der Poisson-Gleichung im Umriss: u je Zelle (außen negativ fortgesetzt), g = mittleres Gefälle am Rand */
export interface Hoehe {
  g: Gitter;
  u: Float32Array;
  /** Gefälle von u am Rand (für die Fortsetzung nach außen und den Maßstab des Felds) */
  gefaelle: number;
  /** größte Höhe 2·√u */
  hoechste: number;
}

export function aufblasen(abstand: (x: number, y: number) => number, kasten: [number, number, number, number], S = 1, runden = 3000): Hoehe {
  const g = gitterUm(kasten, S, 3 * S);
  const { b, h } = g;
  const N = b * h;
  const d = new Float32Array(N);
  for (let j = 0; j < h; j++) for (let i = 0; i < b; i++) d[j * b + i] = abstand(g.x0 + (i + 0.5) * S, g.y0 + (j + 0.5) * S);
  // Shortley–Weller: je Richtung die Armlänge (1 Zelle, am Rand der Anteil bis zum Umriss), daraus die Gewichte
  const innen: number[] = [];
  const w = new Float32Array(N * 4);
  const A = new Float32Array(N);
  const NB = [1, -1, b, -b];
  let R = 0;
  for (let j = 1; j + 1 < h; j++)
    for (let i = 1; i + 1 < b; i++) {
      const n = j * b + i;
      if (d[n]! >= 0) continue;
      R = Math.max(R, -d[n]!);
      innen.push(n);
      const arm = NB.map((o) => {
        const dn = d[n + o]!;
        return dn < 0 ? 1 : Math.max(0.02, -d[n]! / (dn - d[n]!));
      });
      const cx = 2 / (arm[0]! + arm[1]!);
      const cy = 2 / (arm[2]! + arm[3]!);
      let a = 0;
      for (let k = 0; k < 4; k++) {
        const wk = (k < 2 ? cx : cy) / arm[k]!;
        a += wk;
        w[4 * n + k] = d[n + NB[k]!]! < 0 ? wk : 0;
      }
      A[n] = a;
    }
  // Start: wie ein Kreis mit dem größten Innenradius, dann SOR
  const u = new Float32Array(N);
  for (const n of innen) u[n] = (-d[n]! * (2 * R + d[n]!)) / 4;
  const om = 2 / (1 + Math.sin(Math.PI / Math.max(b, h)));
  const S2 = S * S;
  for (let r = 0; r < runden; r++) {
    let gross = 0;
    for (const n of innen) {
      const neu = (w[4 * n]! * u[n + 1]! + w[4 * n + 1]! * u[n - 1]! + w[4 * n + 2]! * u[n + b]! + w[4 * n + 3]! * u[n - b]! + S2) / A[n]!;
      const du = om * (neu - u[n]!);
      u[n] = u[n]! + du;
      gross = Math.max(gross, Math.abs(du));
    }
    if (gross < 1e-5 * R * R) break;
  }
  // Gefälle am Rand: u / Abstand in den Zellen knapp innen
  let sg = 0;
  let ng = 0;
  let um = 0;
  for (const n of innen) {
    um = Math.max(um, u[n]!);
    if (d[n]! > -1.5 * S && d[n]! < -0.25 * S) {
      sg += u[n]! / -d[n]!;
      ng++;
    }
  }
  const gefaelle = ng ? sg / ng : R / 2;
  for (let n = 0; n < N; n++) if (d[n]! >= 0) u[n] = -gefaelle * d[n]!;
  return { g, u, gefaelle, hoechste: 2 * Math.sqrt(um) };
}

/** Catmull-Rom zwischen p1 und p2 (stetig differenzierbar: glatte Flächenrichtungen, kein Flackern von Zelle zu Zelle) */
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

/** u an (x, y), bikubisch; außerhalb des Gitters weiter fallend */
export function uBei(hh: Hoehe, x: number, y: number): number {
  const g = hh.g;
  const fx = (x - g.x0) / g.s - 0.5;
  const fy = (y - g.y0) / g.s - 0.5;
  const cx = Math.max(0, Math.min(g.b - 1.001, fx));
  const cy = Math.max(0, Math.min(g.h - 1.001, fy));
  const i = Math.floor(cx);
  const j = Math.floor(cy);
  const tx = cx - i;
  const ty = cy - j;
  const u = hh.u;
  const zeile = (jj: number): number => {
    const r = Math.max(0, Math.min(g.h - 1, jj)) * g.b;
    return cr(u[r + Math.max(0, i - 1)]!, u[r + i]!, u[r + i + 1]!, u[r + Math.min(g.b - 1, i + 2)]!, tx);
  };
  const w = cr(zeile(j - 1), zeile(j), zeile(j + 1), zeile(j + 2), ty);
  return w - hh.gefaelle * Math.hypot((fx - cx) * g.s, (fy - cy) * g.s);
}

/** Tiefe je Zeile (y = y0 + j·s): Mitte in z und Maß (Halbtiefe = Maß · Höhe) */
export interface Tiefe {
  y0: number;
  s: number;
  /** Lage der dicksten Stelle in z */
  mitte: Float32Array;
  /** Maß nach vorn und nach hinten (Halbtiefe = Maß · Höhe) */
  mass: Float32Array;
  massHinten: Float32Array;
}

export function tiefeBei(t: Tiefe, y: number): [number, number, number] {
  const n = t.mitte.length;
  const f = Math.max(0, Math.min(n - 1.0001, (y - t.y0) / t.s));
  const j = Math.floor(f);
  const a = f - j;
  const k = (q: number): number => Math.max(0, Math.min(n - 1, q));
  const w = (v: Float32Array): number => cr(v[k(j - 1)]!, v[j]!, v[j + 1]!, v[k(j + 2)]!, a);
  return [w(t.mitte), w(t.mass), w(t.massHinten)];
}

/**
 * Tiefe aus der zweiten Ansicht: je Zeile das Intervall [hinten, vorn] ihrer Fläche (um `rand` verkleinert, wo ein Rand dazukommt),
 * daraus Mitte und Maß; beides in der Höhe geglättet, nach der Breite der Zeile gewichtet (an den Enden eines Teils ist die Zeile
 * schmal, ihr Verhältnis unsicher: dort tragen die Nachbarn). `vorn`/`hinten`: Verkleinerung an der jeweiligen Seite.
 */
export function tiefeAusSeite(
  hh: Hoehe,
  seite: Flaeche,
  opt: {
    glatt?: number;
    glattMass?: number;
    vorn?: number;
    hinten?: number;
    massMax?: number;
    /** Lage der dicksten Stelle je Höhe (sonst die Mitte des Intervalls); null: keine Angabe in dieser Höhe */
    mitte?: ((y: number) => number | null) | undefined;
  } = {},
): Tiefe {
  const glatt = opt.glatt ?? 10;
  // Das Maß ändert sich nur langsam (sonst würden schmale Zeilen, etwa die Zacken am Bart, zu flachen Finnen statt runder Spitzen)
  const glattMass = opt.glattMass ?? 4 * glatt;
  const S = hh.g.s;
  const n = hh.g.h;
  const y0 = hh.g.y0 + 0.5 * S;
  const breit = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    let m = 0;
    for (let i = 0; i < hh.g.b; i++) m = Math.max(m, hh.u[j * hh.g.b + i]!);
    breit[j] = 2 * Math.sqrt(m);
  }
  const ds = abstandVon(seite);
  const roh: { y: number; c: number; a: number; b: number; w: number }[] = [];
  for (let j = 0; j < n; j++) {
    const y = y0 + j * S;
    if (breit[j]! < 1) continue;
    let zb = Infinity;
    let zf = -Infinity;
    for (let z = seite.kasten[0] - 1; z <= seite.kasten[2] + 1; z += 0.5)
      if (ds(z, y) < 0) {
        zb = Math.min(zb, z);
        zf = Math.max(zf, z);
      }
    if (!(zf > zb)) continue;
    zf -= opt.vorn ?? 0;
    zb += opt.hinten ?? 0;
    if (zf - zb < 2) continue;
    const gewuenscht = opt.mitte?.(y);
    const c = gewuenscht == null ? (zf + zb) / 2 : Math.max(zb + 0.2 * (zf - zb), Math.min(zf - 0.3 * (zf - zb), gewuenscht));
    roh.push({ y, c, a: (zf - c) / breit[j]!, b: (c - zb) / breit[j]!, w: breit[j]! ** 2 });
  }
  const massMax = opt.massMax ?? 1.8;
  const wMax = Math.max(1e-9, ...roh.map((r) => r.w));
  /** gewichtet geglättet (Gauß); wo zu wenig Zeilen in der Nähe liegen, mit vierfacher Breite */
  const glaetten = (wert: (r: (typeof roh)[number]) => number, sigma: number, leer: number): Float32Array => {
    const out = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      const y = y0 + j * S;
      let sw = 0;
      let sv = 0;
      for (const s of [sigma, 4 * sigma]) {
        for (const r of roh) {
          const q = Math.exp(-0.5 * ((r.y - y) / s) ** 2) * r.w;
          sw += q;
          sv += q * wert(r);
        }
        if (sw > 1e-3 * wMax) break;
      }
      out[j] = sw > 0 ? sv / sw : leer;
    }
    return out;
  };
  const mitte = glaetten((r) => r.c, glatt, 0);
  const mass = glaetten((r) => Math.min(massMax, r.a), glattMass, 1);
  const massHinten = glaetten((r) => Math.min(massMax, r.b), glattMass, 1);
  return { y0, s: S, mitte, mass, massHinten };
}

/** ein aufgeblasenes Teil: Feld ≈ Abstand (innen negativ) */
export interface Teil3 {
  hoehe: Hoehe;
  tiefe: Tiefe;
}

export function feld(t: Teil3, x: number, y: number, z: number): number {
  const [c, a, b] = tiefeBei(t.tiefe, y);
  const q = (z - c) / (z >= c ? a : b);
  return (q * q - 4 * uBei(t.hoehe, x, y)) / (4 * t.hoehe.gefaelle);
}

/** Quader eines Teils [x0, y0, z0, x1, y1, z1] */
export function quader(t: Teil3): [number, number, number, number, number, number] {
  const g = t.hoehe.g;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (let j = 0; j < t.tiefe.mitte.length; j++) {
    z0 = Math.min(z0, t.tiefe.mitte[j]! - t.tiefe.massHinten[j]! * t.hoehe.hoechste);
    z1 = Math.max(z1, t.tiefe.mitte[j]! + t.tiefe.mass[j]! * t.hoehe.hoechste);
  }
  return [g.x0, g.y0, z0, g.x0 + g.b * g.s, g.y0 + g.h * g.s, z1];
}

export interface Netz3 {
  /** Ecken (x, y, z), Körperkoordinaten (y nach unten, z nach vorn) */
  lagen: Float32Array;
  dreiecke: Uint32Array;
  normalen: Float32Array;
}

/** Netz der Fläche f = 0 (Surface Nets auf dem Gitter mit Abstand h, Ecken mit Newton auf die Fläche gezogen) */
export function netzAus(f: (x: number, y: number, z: number) => number, q: [number, number, number, number, number, number], h = 1.5): Netz3 {
  const R = 2 * h;
  const ox = Math.floor((q[0] - R) / h) * h;
  const oy = Math.floor((q[1] - R) / h) * h;
  const oz = Math.floor((q[2] - R) / h) * h;
  const nx = Math.ceil((q[3] + R - ox) / h) + 1;
  const ny = Math.ceil((q[4] + R - oy) / h) + 1;
  const nz = Math.ceil((q[5] + R - oz) / h) + 1;
  const id = (i: number, j: number, k: number): number => (k * ny + j) * nx + i;
  const wert = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) wert[id(i, j, k)] = f(ox + i * h, oy + j * h, oz + k * h);
  const ecke = new Int32Array(nx * ny * nz).fill(-1);
  const lagen: number[] = [];
  const KANTEN: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float64Array(8);
  for (let k = 0; k + 1 < nz; k++)
    for (let j = 0; j + 1 < ny; j++)
      for (let i = 0; i + 1 < nx; i++) {
        let innen = 0;
        for (let c = 0; c < 8; c++) {
          v[c] = wert[id(i + (c & 1), j + ((c >> 1) & 1), k + (c >> 2))]!;
          if (v[c]! < 0) innen++;
        }
        if (innen === 0 || innen === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, b] of KANTEN) {
          if (v[a]! < 0 === v[b]! < 0) continue;
          const t = v[a]! / (v[a]! - v[b]!);
          sx += (a & 1) + ((b & 1) - (a & 1)) * t;
          sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
          sz += (a >> 2) + ((b >> 2) - (a >> 2)) * t;
          n++;
        }
        ecke[id(i, j, k)] = lagen.length / 3;
        lagen.push(ox + (i + sx / n) * h, oy + (j + sy / n) * h, oz + (k + sz / n) * h);
      }
  const dreiecke: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, umdrehen: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (umdrehen) dreiecke.push(a, c, b, a, d, c);
    else dreiecke.push(a, b, c, a, c, d);
  };
  for (let k = 1; k + 1 < nz; k++)
    for (let j = 1; j + 1 < ny; j++)
      for (let i = 1; i + 1 < nx; i++) {
        const p = wert[id(i, j, k)]! < 0;
        if (p !== wert[id(i + 1, j, k)]! < 0) quad(ecke[id(i, j - 1, k - 1)]!, ecke[id(i, j, k - 1)]!, ecke[id(i, j, k)]!, ecke[id(i, j - 1, k)]!, !p);
        if (p !== wert[id(i, j + 1, k)]! < 0) quad(ecke[id(i - 1, j, k - 1)]!, ecke[id(i - 1, j, k)]!, ecke[id(i, j, k)]!, ecke[id(i, j, k - 1)]!, !p);
        if (p !== wert[id(i, j, k + 1)]! < 0) quad(ecke[id(i - 1, j - 1, k)]!, ecke[id(i, j - 1, k)]!, ecke[id(i, j, k)]!, ecke[id(i - 1, j, k)]!, !p);
      }
  const nE = lagen.length / 3;
  const L = new Float32Array(lagen);
  const normalen = new Float32Array(nE * 3);
  const e = 0.2;
  const grad = (x: number, y: number, z: number): [number, number, number] => [
    (f(x + e, y, z) - f(x - e, y, z)) / (2 * e),
    (f(x, y + e, z) - f(x, y - e, z)) / (2 * e),
    (f(x, y, z + e) - f(x, y, z - e)) / (2 * e),
  ];
  for (let n = 0; n < nE; n++) {
    let x = L[3 * n]!;
    let y = L[3 * n + 1]!;
    let z = L[3 * n + 2]!;
    for (let s = 0; s < 4; s++) {
      const d = f(x, y, z);
      const [gx, gy, gz] = grad(x, y, z);
      const g2 = gx * gx + gy * gy + gz * gz;
      if (g2 < 1e-8) break;
      const sch = Math.max(-h, Math.min(h, d / g2));
      x -= gx * sch;
      y -= gy * sch;
      z -= gz * sch;
    }
    L[3 * n] = x;
    L[3 * n + 1] = y;
    L[3 * n + 2] = z;
    const [gx, gy, gz] = grad(x, y, z);
    const gl = Math.hypot(gx, gy, gz) || 1;
    normalen[3 * n] = gx / gl;
    normalen[3 * n + 1] = gy / gl;
    normalen[3 * n + 2] = gz / gl;
  }
  return { lagen: L, dreiecke: new Uint32Array(dreiecke), normalen };
}
