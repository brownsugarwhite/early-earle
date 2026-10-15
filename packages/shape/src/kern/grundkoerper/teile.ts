// Teil G, G4 (Beweis): Rumpf und Teile je Ansicht. Florian (15.10.): „Aus den Shapes lässt sich sehr genau ableiten, was
// verlangt ist … eine weiche Ente mit Flügeln.“ Die Röhre erklärt einen Rumpf mit einem Querschnitt je Stelle; was eine
// Ansicht darüber hinaus zeigt (Flügel, Flossen), sind Teile. Erkennung auf dem Raster: Die Silhouette wird geöffnet
// (Erosion, dann Dilatation mit einem Radius r aus der Rumpfdicke), dünne Teile fallen dabei weg; was übrig bleibt und
// seitlich liegt (nicht an den Enden der Wirbelsäule, die Röhre erklärt ihre Spitzen selbst), ist ein Teil. Ohne Teil bleibt
// alles beim Alten (bitgleich). DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument } from '../../dokument';
import { pfadAbtasten, vollerPfad } from '../../profil';

export type Raster = { W: number; H: number; ox: number; oy: number; h: number; innen: Uint8Array };

/** Polygon (geschlossen, Welt) auf ein Raster füllen (Zellmitten). */
export function rastern(poly: readonly V2[], zellen: number, rand = 4): Raster {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of poly) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const h = Math.max(x1 - x0, y1 - y0) / zellen || 1;
  const W = Math.ceil((x1 - x0) / h) + 2 * rand;
  const H = Math.ceil((y1 - y0) / h) + 2 * rand;
  const ox = x0 - rand * h;
  const oy = y0 - rand * h;
  const innen = new Uint8Array(W * H);
  for (let r = 0; r < H; r++) {
    const y = oy + (r + 0.5) * h;
    const xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const b = poly[j]!;
      if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k]! - ox) / h - 0.5));
      const c1 = Math.min(W - 1, Math.floor((xs[k + 1]! - ox) / h - 0.5));
      for (let c = c0; c <= c1; c++) innen[r * W + c] = 1;
    }
  }
  return { W, H, ox, oy, h, innen };
}

/** Quadrierter euklidischer Abstand je Zelle zur nächsten Zelle mit `ziel` (Felzenszwalb, zwei Durchgänge), in Zellen². */
function abstandQuadrat(R: Raster, ziel: (i: number) => boolean): Float64Array {
  const { W, H } = R;
  const INF = 1e20;
  const d = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = ziel(i) ? 0 : INF;
  const eins = (f: Float64Array, n: number): Float64Array => {
    const out = new Float64Array(n);
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      while (s <= z[k]!) {
        k--;
        s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1]! < q) k++;
      out[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
    }
    return out;
  };
  const spalte = new Float64Array(H);
  for (let c = 0; c < W; c++) {
    for (let r = 0; r < H; r++) spalte[r] = d[r * W + c]!;
    const o = eins(spalte, H);
    for (let r = 0; r < H; r++) d[r * W + c] = o[r]!;
  }
  const zeile = new Float64Array(W);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) zeile[c] = d[r * W + c]!;
    const o = eins(zeile, W);
    for (let c = 0; c < W; c++) d[r * W + c] = o[c]!;
  }
  return d;
}

/** Öffnen (Erosion, dann Dilatation) mit Radius r (Welt). */
export function oeffnen(R: Raster, r: number): Uint8Array {
  const rz = r / R.h;
  const dAussen = abstandQuadrat(R, (i) => !R.innen[i]);
  const kern = new Uint8Array(R.W * R.H);
  for (let i = 0; i < kern.length; i++) kern[i] = R.innen[i] && dAussen[i]! > rz * rz ? 1 : 0;
  const dKern = abstandQuadrat(R, (i) => !!kern[i]);
  const out = new Uint8Array(R.W * R.H);
  for (let i = 0; i < out.length; i++) out[i] = R.innen[i] && dKern[i]! <= rz * rz ? 1 : 0;
  return out;
}

export type TeilFleck = { flaeche: number; zellen: number[]; schwerpunkt: V2; ausdehnung: { x0: number; x1: number; y0: number; y1: number } };

/** Zusammenhängende Flecken (8er-Nachbarschaft) der Zellen mit `an`. */
export function flecken(R: Raster, an: Uint8Array): TeilFleck[] {
  const { W, H, h } = R;
  const gesehen = new Uint8Array(W * H);
  const out: TeilFleck[] = [];
  for (let s = 0; s < W * H; s++) {
    if (!an[s] || gesehen[s]) continue;
    const zellen: number[] = [];
    const stapel = [s];
    gesehen[s] = 1;
    while (stapel.length) {
      const i = stapel.pop()!;
      zellen.push(i);
      const r = Math.floor(i / W);
      const c = i - r * W;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue;
          const j = rr * W + cc;
          if (an[j] && !gesehen[j]) {
            gesehen[j] = 1;
            stapel.push(j);
          }
        }
    }
    let sx = 0;
    let sy = 0;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const i of zellen) {
      const r = Math.floor(i / W);
      const c = i - r * W;
      const x = R.ox + (c + 0.5) * h;
      const y = R.oy + (r + 0.5) * h;
      sx += x;
      sy += y;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    out.push({ flaeche: zellen.length * h * h, zellen, schwerpunkt: { x: sx / zellen.length, y: sy / zellen.length }, ausdehnung: { x0, x1, y0, y1 } });
  }
  return out;
}

export type AnsichtTeile = {
  raster: Raster;
  rumpf: Uint8Array;
  /** seitliche Teile (nicht an den Enden der Ansicht), groß genug */
  teile: TeilFleck[];
  radius: number;
  flaeche: number;
};

/** Mindestanteil der Silhouettenfläche, ab dem ein abgetrennter Fleck als Teil gilt */
const TEIL_ANTEIL = 0.015;
/** Öffnungsradius als Anteil der mittleren halben Rumpfdicke der Ansicht, höchstens OEFFNEN_MAX (Welt): Flügelspitzen und
 * Flossen sind 0,03–0,06 breit; ein größerer Radius (Ente: 0,067) nagte den Körper hinter den Flügeln an (Front Δ 11 px) */
const OEFFNEN_ANTEIL = 0.35;
const OEFFNEN_MAX = 0.03;

/**
 * Teile einer Ansicht: `quer` = Achse quer zur Wirbelsäule (Top: y = z der Welt, Front: x = z der Welt). Halbe Dicke
 * je Stelle längs = größter Abstand von der Achse; der Radius ist ein Anteil ihres Mittels.
 */
export function ansichtTeile(poly: readonly V2[], laengsX: boolean, zellen = 220): AnsichtTeile {
  const R = rastern(poly, zellen);
  const { W, H, h } = R;
  // mittlere halbe Dicke quer zur Längsrichtung (Top: längs x, quer y; Front: längs y, quer x)
  const halbe: number[] = [];
  if (laengsX)
    for (let c = 0; c < W; c++) {
      let m = 0;
      for (let r = 0; r < H; r++) if (R.innen[r * W + c]) m = Math.max(m, Math.abs(R.oy + (r + 0.5) * h));
      if (m > 0) halbe.push(m);
    }
  else
    for (let r = 0; r < H; r++) {
      let m = 0;
      for (let c = 0; c < W; c++) if (R.innen[r * W + c]) m = Math.max(m, Math.abs(R.ox + (c + 0.5) * h));
      if (m > 0) halbe.push(m);
    }
  halbe.sort((a, b) => a - b);
  const median = halbe[Math.floor(halbe.length / 2)] ?? 0;
  const radius = Math.min(OEFFNEN_MAX, OEFFNEN_ANTEIL * median);
  const rumpf = oeffnen(R, radius);
  let flaeche = 0;
  for (let i = 0; i < W * H; i++) flaeche += R.innen[i]!;
  flaeche *= h * h;
  const rest = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) rest[i] = R.innen[i] && !rumpf[i] ? 1 : 0;
  // Enden längs (Spitzen der Röhre) zählen nicht: Flecken, die über das Längsende des Rumpfs hinausragen
  let l0 = Infinity;
  let l1 = -Infinity;
  for (let i = 0; i < W * H; i++) {
    if (!rumpf[i]) continue;
    const r = Math.floor(i / W);
    const c = i - r * W;
    const l = laengsX ? R.ox + (c + 0.5) * h : R.oy + (r + 0.5) * h;
    l0 = Math.min(l0, l);
    l1 = Math.max(l1, l);
  }
  const teile = flecken(R, rest).filter((f) => {
    if (f.flaeche < TEIL_ANTEIL * flaeche) return false;
    const a = laengsX ? [f.ausdehnung.x0, f.ausdehnung.x1] : [f.ausdehnung.y0, f.ausdehnung.y1];
    return a[0]! >= l0 - 2 * h && a[1]! <= l1 + 2 * h;
  });
  return { raster: R, rumpf, teile, radius, flaeche };
}

/** Teile von Top und Front eines Dokuments (Welt). */
export function teileVon(dok: Dokument): { top: AnsichtTeile; front: AnsichtTeile } {
  const sk = dok.skalierung;
  const poly = (a: 'top' | 'front') => pfadAbtasten(vollerPfad(dok.profile[a]), 32).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  return { top: ansichtTeile(poly('top'), true), front: ansichtTeile(poly('front'), false) };
}
