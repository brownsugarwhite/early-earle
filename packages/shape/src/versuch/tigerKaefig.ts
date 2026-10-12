// VERSUCH (12.10.2026): Käfig für den Tiger aus seinen Silhouetten, Schritt für Schritt nachvollziehbar.
//
// 1. Ringe entlang vorn → hinten. Je Ring: Höhe aus der Seite, Breite aus dem Top, Form aus einer Vorlage
//    (vorn ein Kasten für die Schnauze, dahinter der Querschnitt aus der Front).
// 2. Vorn schließt eine flache Kappe (Stirnfläche des Schnauzenkastens), hinten ein Pol.
// 3. Kanten: Kappenrand und die oberen Kastenkanten bekommen Schärfe, die nach hinten ausläuft.
// 4. Anpassen: Käfig so lange nachschieben, bis die unterteilte Fläche die Zielpunkte trifft.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { querschnitt, schnitte } from '../platzhalter/loft';
import { pfadAbtasten, vollerPfad } from '../profil';
import { type Netz, type V3, kante, unterteilenMehrfach } from './catmullClark';

export type TigerOptionen = {
  ringe: number;
  /** Punkte je Ring (durch 8 teilbar, damit die Kastenecken auf Punkten liegen) */
  ring: number;
  /** bis hier (Anteil der Länge) ist der Querschnitt ein Kasten, danach Übergang zur Front-Form */
  kastenBis: number;
  uebergang: number;
  /** Exponent der Kastenform (2 = Kreis, 6 = abgerundetes Quadrat) */
  kastenExponent: number;
  /** Schärfe vorn (Kappenrand) und an den oberen Kastenkanten, läuft bis `kanteBis` auf 0 aus */
  schaerfe: number;
  kanteBis: number;
  /** Ringe an die Form anpassen: auf Eckpunkte der Silhouetten setzen und nach Krümmung verteilen */
  angepasst?: boolean;
};

export const TIGER_STANDARD: TigerOptionen = { ringe: 14, ring: 16, kastenBis: 0.13, uebergang: 0.14, kastenExponent: 7, schaerfe: 3, kanteBis: 0.3 };

type QPunkt = { zn: number; yn: number };

function superellipse(R: number, p: number): QPunkt[] {
  const out: QPunkt[] = [];
  for (let j = 0; j < R; j++) {
    const t = (2 * Math.PI * j) / R;
    const s = Math.sin(t);
    const c = Math.cos(t);
    out.push({ zn: Math.sign(s) * Math.pow(Math.abs(s), 2 / p), yn: 0.5 + 0.5 * Math.sign(c) * Math.pow(Math.abs(c), 2 / p) });
  }
  return out;
}

function frontVorlage(dok: Dokument, R: number): QPunkt[] {
  const q = querschnitt(dok, R / 2);
  const out: QPunkt[] = [];
  for (let j = 0; j < R; j++) {
    const p = j <= R / 2 ? q[j]! : q[R - j]!;
    out.push({ zn: (j <= R / 2 ? 1 : -1) * p.x, yn: p.y });
  }
  return out;
}

const glatt = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type TigerKaefig = {
  netz: Netz;
  ziel: V3[];
  stationen: number[];
  opt: TigerOptionen;
  ringPunkt: (i: number, j: number) => number;
};

export function tigerKaefig(dok: Dokument, opt: TigerOptionen = TIGER_STANDARD): TigerKaefig {
  const { ringe: N, ring: R } = opt;
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 24);
  const top = pfadAbtasten(vollerPfad(dok.profile.top), 24);
  const ausdehnung = (pts: V2[]) => [Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x))] as const;
  const [xMin, xMax] = ausdehnung(seite);
  const [tMin, tMax] = ausdehnung(top);
  const kasten = superellipse(R, opt.kastenExponent);
  const front = frontVorlage(dok, R);

  // Stationen: dicht an beiden Enden; die erste fast ganz vorn (dort sitzt die Kappe)
  let stationen: number[] = [];
  for (let i = 1; i <= N; i++) stationen.push((1 - Math.cos((Math.PI * i) / (N + 1))) / 2);
  if (opt.angepasst) stationen = formStationen(dok, N, xMin, xMax, tMin, tMax);
  stationen[0] = 0.004;

  const ringPunkt = (i: number, j: number) => (i - 1) * R + (((j % R) + R) % R);
  const ziel: V3[] = [];
  stationen.forEach((f) => {
    const x = xMin + (xMax - xMin) * f;
    const vs = schnitte(seite, x);
    const ws = schnitte(top, tMin + (tMax - tMin) * f);
    const yLo = Math.min(...vs);
    const yHi = Math.max(...vs);
    const w = ws.length ? Math.max(...ws.map(Math.abs)) : 0;
    const t = glatt(opt.kastenBis, opt.kastenBis + opt.uebergang, f);
    for (let j = 0; j < R; j++) {
      const zn = kasten[j]!.zn * (1 - t) + front[j]!.zn * t;
      const yn = kasten[j]!.yn * (1 - t) + front[j]!.yn * t;
      ziel.push([x, yLo + yn * (yHi - yLo), zn * w]);
    }
  });
  // hinterer Pol
  const xEnde = xMax;
  const vEnde = schnitte(seite, xMax - (xMax - xMin) * 1e-4);
  ziel.push([xEnde, vEnde.length ? (Math.min(...vEnde) + Math.max(...vEnde)) / 2 : 0, 0]);
  const pol = ziel.length - 1;

  const flaechen: number[][] = [];
  // Kappe vorn (Stirnfläche des Schnauzenkastens) als 4×4-Vierecksgitter wie in Blender modelliert:
  // Rand = erster Ring (je Seite R/4 Kanten), innen eine Coons-Fläche aus den Randpunkten.
  const n = R / 4;
  const rand = (a: number, b: number): number => {
    if (b === 0) return ringPunkt(1, -n / 2 + a); // oben, links → rechts
    if (a === n) return ringPunkt(1, n / 2 + b); // rechts, oben → unten
    if (b === n) return ringPunkt(1, (3 * n) / 2 + (n - a)); // unten, rechts → links
    return ringPunkt(1, (5 * n) / 2 + (n - b)); // links, unten → oben
  };
  const gitter: number[][] = [];
  for (let b = 0; b <= n; b++) {
    const zeile: number[] = [];
    for (let a = 0; a <= n; a++) {
      if (a === 0 || b === 0 || a === n || b === n) {
        zeile.push(rand(a, b));
        continue;
      }
      const u = a / n;
      const v = b / n;
      const P = (i: number) => ziel[i]!;
      const T = P(rand(a, 0));
      const B = P(rand(a, n));
      const L = P(rand(0, b));
      const Rr = P(rand(n, b));
      const c00 = P(rand(0, 0));
      const c10 = P(rand(n, 0));
      const c01 = P(rand(0, n));
      const c11 = P(rand(n, n));
      const q: V3 = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        q[k] = (1 - v) * T[k]! + v * B[k]! + (1 - u) * L[k]! + u * Rr[k]! - ((1 - u) * (1 - v) * c00[k]! + u * (1 - v) * c10[k]! + (1 - u) * v * c01[k]! + u * v * c11[k]!);
      }
      ziel.push(q);
      zeile.push(ziel.length - 1);
    }
    gitter.push(zeile);
  }
  for (let b = 0; b < n; b++) {
    for (let a = 0; a < n; a++) flaechen.push([gitter[b]![a]!, gitter[b + 1]![a]!, gitter[b + 1]![a + 1]!, gitter[b]![a + 1]!]);
  }
  for (let i = 1; i < N; i++) {
    for (let j = 0; j < R; j++) flaechen.push([ringPunkt(i, j), ringPunkt(i, j + 1), ringPunkt(i + 1, j + 1), ringPunkt(i + 1, j)]);
  }
  for (let j = 0; j < R; j++) flaechen.push([ringPunkt(N, j), ringPunkt(N, j + 1), pol]);

  // Kanten: Kappenrand (unten etwas weicher, dort geht es ins Maul) und die oberen Kastenecken
  const schaerfe = new Map<string, number>();
  for (let j = 0; j < R; j++) {
    const unten = Math.abs(j + 0.5 - R / 2) < R / 8;
    schaerfe.set(kante(ringPunkt(1, j), ringPunkt(1, j + 1)), unten ? opt.schaerfe * 0.4 : opt.schaerfe);
  }
  for (const ecke of [R / 8, (7 * R) / 8]) {
    for (let i = 1; i < N; i++) {
      const fm = (stationen[i - 1]! + stationen[i]!) / 2;
      const s = opt.schaerfe * Math.max(0, 1 - fm / opt.kanteBis);
      if (s > 0) schaerfe.set(kante(ringPunkt(i, ecke), ringPunkt(i + 1, ecke)), s);
    }
  }

  return { netz: { punkte: ziel.map((p) => [...p] as V3), flaechen, schaerfe }, ziel, stationen, opt, ringPunkt };
}

/** Prüft, dass jede Kante genau zwei Flächen hat (geschlossenes Netz). */
export function geschlossen(netz: Netz): boolean {
  const z = new Map<string, number>();
  for (const f of netz.flaechen) for (let i = 0; i < f.length; i++) {
    const k = kante(f[i]!, f[(i + 1) % f.length]!);
    z.set(k, (z.get(k) ?? 0) + 1);
  }
  return [...z.values()].every((c) => c === 2);
}

/**
 * Ringe an die Form angepasst (wie ein Modellierer die Edgeloops setzt):
 * - Dichte folgt der Krümmung von Seite und Top: wo die Silhouette stark biegt, liegen die Ringe enger.
 * - Eckpunkte der Zeichnung (Ecken der Bézier-Kurven) bekommen einen Ring genau an ihrer Stelle,
 *   damit Kanten dort scharf sitzen können.
 */
export function formStationen(dok: Dokument, N: number, xMin: number, xMax: number, tMin: number, tMax: number): number[] {
  const B = 200;
  const dichte = new Array<number>(B).fill(1);
  const kruemmung = (pts: V2[], lo: number, hi: number) => {
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1]!;
      const p = pts[i]!;
      const c = pts[i + 1]!;
      const w1 = Math.atan2(p.y - a.y, p.x - a.x);
      const w2 = Math.atan2(c.y - p.y, c.x - p.x);
      let dw = Math.abs(w2 - w1);
      if (dw > Math.PI) dw = 2 * Math.PI - dw;
      const f = (p.x - lo) / (hi - lo);
      const k = Math.min(B - 1, Math.max(0, Math.floor(f * B)));
      dichte[k] = dichte[k]! + dw * 6;
    }
  };
  kruemmung(pfadAbtasten(vollerPfad(dok.profile.seite), 32), xMin, xMax);
  kruemmung(pfadAbtasten(vollerPfad(dok.profile.top), 32), tMin, tMax);
  // leicht glätten, damit Ringe nicht klumpen
  const glatt2 = dichte.map((_, k) => {
    let sum = 0;
    let n = 0;
    for (let d = -4; d <= 4; d++) {
      const w = dichte[k + d];
      if (w === undefined) continue;
      sum += w;
      n++;
    }
    return sum / n;
  });
  const kum = [0];
  for (const d of glatt2) kum.push(kum[kum.length - 1]! + d);
  const ges = kum[B]!;
  const st: number[] = [];
  for (let i = 1; i <= N; i++) {
    const ziel = (ges * i) / (N + 1);
    let k = 0;
    while (k < B && kum[k + 1]! < ziel) k++;
    st.push((k + (ziel - kum[k]!) / (kum[k + 1]! - kum[k]! || 1)) / B);
  }
  // Ecken der Zeichnung: nächsten Ring genau auf die Ecke schieben
  const ecken: number[] = [];
  for (const kn of dok.profile.seite.knoten) if (kn.art === 'ecke') ecken.push((kn.p.x - xMin) / (xMax - xMin));
  for (const kn of dok.profile.top.knoten) if (kn.art === 'ecke') ecken.push((kn.p.x - tMin) / (tMax - tMin));
  for (const e of ecken) {
    if (e < 0.02 || e > 0.98) continue;
    let best = 0;
    st.forEach((f, i) => Math.abs(f - e) < Math.abs(st[best]! - e) && (best = i));
    st[best] = e;
  }
  return st.sort((a, b) => a - b);
}

/** Inverse Unterteilung: Käfig += Ziel − Grenzlage, bis die Fläche an den Käfigpunkten die Ziele trifft. */
export function anZielAnpassen(netz: Netz, ziel: V3[], iterationen = 8, stufen = 3): Netz {
  let punkte = netz.punkte.map((p) => [...p] as V3);
  for (let it = 0; it < iterationen; it++) {
    const grenze = unterteilenMehrfach({ ...netz, punkte }, stufen).punkte;
    punkte = punkte.map((p, i) => [p[0] + ziel[i]![0] - grenze[i]![0], p[1] + ziel[i]![1] - grenze[i]![1], p[2] + ziel[i]![2] - grenze[i]![2]]);
  }
  return { ...netz, punkte };
}

/** Umriss einer Fläche in einer Ansicht (Ober-/Unterkante je Streifen), für den Abgleich mit der Zeichnung. */
export function umriss(netz: Netz, ansicht: 'seite' | 'front' | 'top', streifen = 120): V2[] {
  const proj = (p: V3): V2 => (ansicht === 'seite' ? { x: p[0], y: p[1] } : ansicht === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] });
  const pts = netz.punkte.map(proj);
  // Front: Streifen über die Höhe (Breite je Höhe), sonst über die Länge
  const quer = ansicht === 'front';
  const a = quer ? pts.map((p) => p.y) : pts.map((p) => p.x);
  const lo = Math.min(...a);
  const hi = Math.max(...a);
  const oben: V2[] = [];
  const unten: V2[] = [];
  for (let k = 0; k < streifen; k++) {
    const s0 = lo + ((hi - lo) * k) / streifen;
    const s1 = lo + ((hi - lo) * (k + 1)) / streifen;
    let mn = Infinity;
    let mx = -Infinity;
    for (const p of pts) {
      const s = quer ? p.y : p.x;
      if (s < s0 || s >= s1) continue;
      const v = quer ? p.x : p.y;
      mn = Math.min(mn, v);
      mx = Math.max(mx, v);
    }
    if (mn === Infinity) continue;
    const m = (s0 + s1) / 2;
    if (quer) {
      oben.push({ x: mx, y: m });
      unten.push({ x: mn, y: m });
    } else {
      oben.push({ x: m, y: mx });
      unten.push({ x: m, y: mn });
    }
  }
  return [...oben, ...unten.reverse()];
}
