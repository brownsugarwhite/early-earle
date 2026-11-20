/**
 * Studie „Maul, Zähne, Zunge“ (20.11.2026): das Maul als Schnitt.
 *
 * Die Form bleibt, wie sie ist: ein geschlossener Körper ohne Maul. Die Maullinie ist ein Profil in der Seitenebene (vom Mundwinkel
 * nach vorn). Längs dieses Profils wird die gezeigte Haut gerade von Seite zu Seite aufgeschnitten („durchgestanzt“), mit einem
 * Spalt, der schmaler ist, als man sehen kann. Die zwei Wände des Spalts sind Gaumen und Mundboden. Geöffnet wird nur durch Drehen
 * um den Mundwinkel: Jede Seite des Schnitts dreht mit ihrem Kiefer, starr; hinter dem Mundwinkel läuft die Drehung weich aus.
 *
 * Gerechnet wird der Schnitt mit derselben Bibliothek wie der Verbund (`manifold-3d`). Am Rechenkern und an der Form ändert sich
 * nichts.
 */
import type { Wasm } from '../form/naht';

export type V2 = { x: number; y: number };

const glattstufe = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Das Profil der Maullinie in der Seitenebene: Punkt 0 ist der Mundwinkel, die Linie läuft nach vorn */
export class Profil {
  readonly p: V2[];
  readonly s: number[] = [0];
  readonly laenge: number;
  constructor(punkte: readonly V2[]) {
    this.p = punkte.map((q) => ({ x: q.x, y: q.y }));
    for (let i = 1; i < this.p.length; i++) this.s.push(this.s[i - 1]! + Math.hypot(this.p[i]!.x - this.p[i - 1]!.x, this.p[i]!.y - this.p[i - 1]!.y));
    this.laenge = this.s[this.s.length - 1]!;
  }
  private stueck(s: number): [number, number] {
    const n = this.p.length;
    let i = 0;
    while (i < n - 2 && this.s[i + 1]! < s) i++;
    const l = this.s[i + 1]! - this.s[i]! || 1;
    return [i, (s - this.s[i]!) / l];
  }
  ort(s: number): V2 {
    const [i, u] = this.stueck(s);
    const a = this.p[i]!;
    const b = this.p[i + 1]!;
    return { x: a.x + u * (b.x - a.x), y: a.y + u * (b.y - a.y) };
  }
  /** Richtung nach vorn an der Stelle s, über die Ecken des Streckenzugs gemittelt (damit die Wand rund schattiert) */
  tangente(s: number): V2 {
    const n = this.p.length;
    const [i, u] = this.stueck(s);
    const r = (j: number): V2 => {
      const a = this.p[Math.max(0, Math.min(n - 2, j))]!;
      const b = this.p[Math.max(0, Math.min(n - 2, j)) + 1]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
    };
    const t0 = r(i);
    const t1 = u < 0.5 ? r(i - 1) : r(i + 1);
    const w = u < 0.5 ? 0.5 - u : u - 0.5;
    const x = t0.x * (1 - w) + t1.x * w;
    const y = t0.y * (1 - w) + t1.y * w;
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }
  /**
   * Der nächste Ort des Profils zu (x, y): die Stelle s, der Abstand mit Vorzeichen (+ links der Laufrichtung) und ob der Punkt
   * hinter dem Mundwinkel liegt. Nach vorn läuft das letzte Stück gerade weiter.
   */
  naechster(x: number, y: number): { s: number; d: number; hinten: boolean } {
    const n = this.p.length;
    let best = Infinity;
    let bs = 0;
    let bd = 0;
    let hinten = false;
    for (let i = 0; i < n - 1; i++) {
      const a = this.p[i]!;
      const b = this.p[i + 1]!;
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const l2 = ex * ex + ey * ey || 1;
      let u = ((x - a.x) * ex + (y - a.y) * ey) / l2;
      const frei = u;
      if (i === 0 && u < 0) u = 0;
      else if (i > 0 && u < 0) u = 0;
      if (i < n - 2 && u > 1) u = 1;
      const qx = a.x + u * ex;
      const qy = a.y + u * ey;
      const dx = x - qx;
      const dy = y - qy;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) {
        best = d2;
        const l = Math.sqrt(l2);
        bs = this.s[i]! + u * l;
        const kreuz = ex * (y - a.y) - ey * (x - a.x);
        bd = (kreuz >= 0 ? 1 : -1) * Math.sqrt(d2);
        hinten = i === 0 && frei < 0;
      }
    }
    return { s: bs, d: bd, hinten };
  }
}

export type KoerperNetz = { pos: Float32Array; nor: Float32Array; tri: Uint32Array };

export type MaulSchnitt = {
  profil: Profil;
  /** Mundwinkel, Richtung der Linie dort, und ob die linke Seite der Laufrichtung der Oberkiefer ist */
  C: V2;
  t0: V2;
  obenLinks: boolean;
  /** die Haut mit dem Schlitz; je Punkt die Seite (+1 links der Linie, −1 rechts) und wie weit er mit seinem Kiefer dreht (0 … 1) */
  haut: { pos: Float32Array; nor: Float32Array; index: Uint32Array; seite: Int8Array; gewicht: Float32Array };
  /** Gaumen und Mundboden; je Punkt die Stelle s am Profil und z, und seine Seite */
  wand: { pos: Float32Array; nor: Float32Array; index: Uint32Array; sz: Float32Array; seite: Int8Array };
  /** halbe Breite des Mauls an der Lippe über s (Tabelle über 0 … sVorn) */
  breite: Float32Array;
  /** die Stelle der Lippe ganz vorn und der Abstand Mundwinkel–Lippe vorn */
  sVorn: number;
  lang: number;
  /** so lange hat der Schnitt gedauert */
  ms: number;
};

export type SchnittOptionen = {
  /** halbe Dicke des Spalts (Standard: ein Zwanzigtausendstel der Größe der Form) */
  spalt?: number;
  /** wie weit der Kiefer reicht, in Längen der Lippe: bis `reichweite[0]` ganz, bis `reichweite[1]` läuft es aus */
  reichweite?: [number, number];
};

/** Wie weit ein Punkt der Seitenebene mit seinem Kiefer dreht, und auf welcher Seite der Linie er liegt */
export function kieferFeld(m: { profil: Profil; C: V2; t0: V2; lang: number }, x: number, y: number, reichweite: [number, number] = [1.35, 2.4]): { seite: 1 | -1; gewicht: number; s: number; d: number; hinten: boolean } {
  const n = m.profil.naechster(x, y);
  const dx = x - m.C.x;
  const dy = y - m.C.y;
  const r = Math.hypot(dx, dy);
  let g = 1 - glattstufe(reichweite[0] * m.lang, reichweite[1] * m.lang, r);
  if (n.hinten) {
    // hinter dem Mundwinkel: Die Drehung läuft über den Winkel um das Scharnier aus (95° … 165° gegen die Richtung der Linie)
    const cosw = r > 1e-9 ? (dx * m.t0.x + dy * m.t0.y) / r : 0;
    const w = Math.acos(Math.max(-1, Math.min(1, cosw)));
    g *= 1 - glattstufe((95 * Math.PI) / 180, (165 * Math.PI) / 180, w);
  }
  return { seite: n.d >= 0 ? 1 : -1, gewicht: g, s: n.s, d: n.d, hinten: n.hinten };
}

export const BREITE_N = 192;

/**
 * Die Haut längs der Maullinie aufschneiden. `linie`: das Profil in der Seitenebene, vom Mundwinkel nach vorn; es wird vorn
 * gerade bis vor die Form verlängert.
 */
export function maulSchneiden(w: Wasm, k: KoerperNetz, linie: readonly V2[], opt: SchnittOptionen = {}): MaulSchnitt | { fehler: string } {
  const t0ms = performance.now();
  if (linie.length < 2) return { fehler: 'die Maullinie braucht zwei Punkte' };
  const { Manifold, Mesh } = w;
  // Kasten der Form
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  let zMax = 0;
  for (let i = 0; i < k.pos.length; i += 3) {
    xMin = Math.min(xMin, k.pos[i]!);
    xMax = Math.max(xMax, k.pos[i]!);
    yMin = Math.min(yMin, k.pos[i + 1]!);
    yMax = Math.max(yMax, k.pos[i + 1]!);
    zMax = Math.max(zMax, Math.abs(k.pos[i + 2]!));
  }
  const gross = Math.hypot(xMax - xMin, yMax - yMin, 2 * zMax);
  // vorn gerade bis vor die Form verlängern
  const pkt = linie.map((q) => ({ x: q.x, y: q.y }));
  {
    const a = pkt[pkt.length - 2]!;
    const b = pkt[pkt.length - 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    pkt.push({ x: b.x + ((b.x - a.x) / l) * gross, y: b.y + ((b.y - a.y) / l) * gross });
  }
  const profil = new Profil(pkt);
  const m = pkt.length - 1;
  const C = pkt[0]!;
  const t0 = profil.tangente(0);
  const delta = opt.spalt ?? gross * 5e-5;

  // der Keil: links und rechts der Linie um `delta` versetzt, am Mundwinkel eine Spitze
  const nL = (i: number): V2 => {
    const t = (j: number): V2 => {
      const a = pkt[j]!;
      const b = pkt[j + 1]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
    };
    const ta = t(Math.max(0, i - 1));
    const tb = t(Math.min(m - 1, i));
    let x = ta.x + tb.x;
    let y = ta.y + tb.y;
    const l = Math.hypot(x, y) || 1;
    x /= l;
    y /= l;
    // Gehrung: an einer Ecke weiter hinaus, höchstens dreifach
    const c = Math.max(1 / 3, x * tb.x + y * tb.y);
    return { x: -y / c, y: x / c };
  };
  const N = 2 * m + 3;
  const P2 = new Float64Array(2 * N);
  P2[0] = C.x - t0.x * 2 * delta;
  P2[1] = C.y - t0.y * 2 * delta;
  for (let i = 0; i <= m; i++) {
    const n = nL(i);
    const q = pkt[i]!;
    P2[2 * (1 + i)] = q.x + n.x * delta;
    P2[2 * (1 + i) + 1] = q.y + n.y * delta;
    P2[2 * (2 + m + i)] = q.x - n.x * delta;
    P2[2 * (2 + m + i) + 1] = q.y - n.y * delta;
  }
  const W = zMax * 1.25 + gross * 0.02;
  const vp = new Float32Array(3 * 2 * N);
  for (let i = 0; i < N; i++) {
    vp[3 * i] = P2[2 * i]!;
    vp[3 * i + 1] = P2[2 * i + 1]!;
    vp[3 * i + 2] = -W;
    vp[3 * (N + i)] = P2[2 * i]!;
    vp[3 * (N + i) + 1] = P2[2 * i + 1]!;
    vp[3 * (N + i) + 2] = W;
  }
  const tv: number[] = [];
  const flaeche = (a: number, b: number, c: number): number => (P2[2 * b]! - P2[2 * a]!) * (P2[2 * c + 1]! - P2[2 * a + 1]!) - (P2[2 * b + 1]! - P2[2 * a + 1]!) * (P2[2 * c]! - P2[2 * a]!);
  // Deckel oben (z = +W, Normale +z) und unten
  const deckel = (a: number, b: number, c: number): void => {
    const f = flaeche(a, b, c);
    if (Math.abs(f) < 1e-18) return;
    if (f > 0) {
      tv.push(N + a, N + b, N + c);
      tv.push(a, c, b);
    } else {
      tv.push(N + a, N + c, N + b);
      tv.push(a, b, c);
    }
  };
  deckel(0, 1, 2 + m);
  for (let i = 0; i < m; i++) {
    deckel(1 + i, 2 + i, 3 + m + i);
    deckel(1 + i, 3 + m + i, 2 + m + i);
  }
  // Seiten: Die Normale zeigt von der Linie weg (Bezugspunkt innen: ix, iy)
  const seiteFl = (a: number, b: number, ix: number, iy: number): void => {
    const ex = P2[2 * b]! - P2[2 * a]!;
    const ey = P2[2 * b + 1]! - P2[2 * a + 1]!;
    const mx = 0.5 * (P2[2 * a]! + P2[2 * b]!) - ix;
    const my = 0.5 * (P2[2 * a + 1]! + P2[2 * b + 1]!) - iy;
    // (a unten, b unten, b oben) hat die Normale (ey, −ex)
    if (ey * mx - ex * my > 0) tv.push(a, b, N + b, a, N + b, N + a);
    else tv.push(b, a, N + a, b, N + a, N + b);
  };
  seiteFl(0, 1, C.x, C.y);
  seiteFl(0, 2 + m, C.x, C.y);
  for (let i = 0; i < m; i++) {
    const cx = 0.5 * (pkt[i]!.x + pkt[i + 1]!.x);
    const cy = 0.5 * (pkt[i]!.y + pkt[i + 1]!.y);
    seiteFl(1 + i, 2 + i, cx, cy);
    seiteFl(2 + m + i, 3 + m + i, cx, cy);
  }
  {
    const a = pkt[m - 1]!;
    const b = pkt[m]!;
    seiteFl(1 + m, 2 + 2 * m, 0.5 * (a.x + b.x), 0.5 * (a.y + b.y));
  }

  const idA = Manifold.reserveIDs(2);
  const idB = idA + 1;
  const nK = k.pos.length / 3;
  const kp = new Float32Array(6 * nK);
  for (let v = 0; v < nK; v++) {
    kp[6 * v] = k.pos[3 * v]!;
    kp[6 * v + 1] = k.pos[3 * v + 1]!;
    kp[6 * v + 2] = k.pos[3 * v + 2]!;
    kp[6 * v + 3] = k.nor[3 * v]!;
    kp[6 * v + 4] = k.nor[3 * v + 1]!;
    kp[6 * v + 5] = k.nor[3 * v + 2]!;
  }
  const mA = new Manifold(new Mesh({ numProp: 6, vertProperties: kp, triVerts: k.tri, runOriginalID: Uint32Array.of(idA) }));
  const mB = new Manifold(new Mesh({ numProp: 3, vertProperties: vp, triVerts: Uint32Array.from(tv), runOriginalID: Uint32Array.of(idB) }));
  const frei = (...x: { delete(): void }[]): void => {
    for (const q of x) q.delete();
  };
  if (mA.status() !== 'NoError' || mB.status() !== 'NoError') {
    const text = `ein Netz ist nicht geschlossen (Form: ${mA.status()}, Keil: ${mB.status()})`;
    frei(mA, mB);
    return { fehler: text };
  }
  const mU = mA.subtract(mB);
  if (mU.status() !== 'NoError' || mU.isEmpty()) {
    frei(mA, mB, mU);
    return { fehler: 'der Schnitt gab kein Netz' };
  }
  const M = mU.getMesh();
  const np = M.numProp;
  const nV = M.vertProperties.length / np;
  const nT = M.triVerts.length / 3;
  const vonKeil = new Uint8Array(nT);
  for (let r = 0; r < M.runOriginalID.length; r++) {
    if (M.runOriginalID[r] !== idB) continue;
    for (let i = M.runIndex[r]!; i < M.runIndex[r + 1]!; i += 3) vonKeil[i / 3] = 1;
  }
  frei(mA, mB, mU);

  // Haut: alle Dreiecke aus der Form
  const hv = new Int32Array(nV).fill(-1);
  const hpos: number[] = [];
  const hnor: number[] = [];
  const hidx: number[] = [];
  // Wand: die Dreiecke aus dem Keil, je Punkt und Seite ein eigener Punkt
  const wv = new Map<number, number>();
  const wpos: number[] = [];
  const wnor: number[] = [];
  const wsz: number[] = [];
  const wseite: number[] = [];
  const widx: number[] = [];
  const X = (v: number, d: number): number => M.vertProperties[np * v + d]!;
  let sVorn = 0;
  for (let t = 0; t < nT; t++) {
    const a = M.triVerts[3 * t]!;
    const b = M.triVerts[3 * t + 1]!;
    const c = M.triVerts[3 * t + 2]!;
    if (!vonKeil[t]) {
      for (const v of [a, b, c]) {
        let j = hv[v]!;
        if (j < 0) {
          j = hpos.length / 3;
          hv[v] = j;
          hpos.push(X(v, 0), X(v, 1), X(v, 2));
          const nx = np >= 6 ? X(v, 3) : 0;
          const ny = np >= 6 ? X(v, 4) : 1;
          const nz = np >= 6 ? X(v, 5) : 0;
          const l = Math.hypot(nx, ny, nz) || 1;
          hnor.push(nx / l, ny / l, nz / l);
        }
        hidx.push(j);
      }
      continue;
    }
    // Seite der Wand: der Schwerpunkt des Dreiecks gegen die Linie
    const sx = (X(a, 0) + X(b, 0) + X(c, 0)) / 3;
    const sy = (X(a, 1) + X(b, 1) + X(c, 1)) / 3;
    const seite = profil.naechster(sx, sy).d >= 0 ? 1 : -1;
    for (const v of [a, b, c]) {
      const key = 2 * v + (seite > 0 ? 1 : 0);
      let j = wv.get(key);
      if (j === undefined) {
        j = wpos.length / 3;
        wv.set(key, j);
        const x = X(v, 0);
        const y = X(v, 1);
        const z = X(v, 2);
        wpos.push(x, y, z);
        const o = profil.naechster(x, y);
        const tg = profil.tangente(o.s);
        // die Wand zeigt zur Linie hin: links der Linie nach rechts, rechts nach links
        wnor.push(seite * tg.y, -seite * tg.x, 0);
        wsz.push(o.s, z);
        wseite.push(seite);
        if (!o.hinten && o.s > sVorn) sVorn = o.s;
      }
      widx.push(j);
    }
  }
  if (!widx.length) return { fehler: 'die Linie trifft die Form nicht' };
  const lang = Math.hypot(profil.ort(sVorn).x - C.x, profil.ort(sVorn).y - C.y);

  // halbe Breite des Mauls über s: Alle Punkte der Wand liegen auf der Lippe
  const breite = new Float32Array(BREITE_N).fill(-1);
  for (let i = 0; i < wsz.length; i += 2) {
    const u = Math.max(0, Math.min(1, wsz[i]! / sVorn));
    const j = Math.min(BREITE_N - 1, Math.round(u * (BREITE_N - 1)));
    breite[j] = Math.max(breite[j]!, Math.abs(wsz[i + 1]!));
  }
  {
    // Lücken füllen (zwischen den besetzten Fächern gerade), vorn läuft die Breite auf null
    breite[BREITE_N - 1] = Math.max(0, breite[BREITE_N - 1]!);
    let letzter = -1;
    for (let j = 0; j < BREITE_N; j++) {
      if (breite[j]! < 0) continue;
      if (letzter < 0) for (let q = 0; q < j; q++) breite[q] = breite[j]!;
      else for (let q = letzter + 1; q < j; q++) breite[q] = breite[letzter]! + ((breite[j]! - breite[letzter]!) * (q - letzter)) / (j - letzter);
      letzter = j;
    }
  }

  const kopf = { profil, C, t0, lang };
  const hn = hpos.length / 3;
  const seite = new Int8Array(hn);
  const gewicht = new Float32Array(hn);
  const rw = opt.reichweite ?? [1.35, 2.4];
  for (let v = 0; v < hn; v++) {
    const f = kieferFeld(kopf, hpos[3 * v]!, hpos[3 * v + 1]!, rw);
    seite[v] = f.seite;
    gewicht[v] = f.gewicht;
  }
  // links der Laufrichtung ist oben, wenn die linke Normale der Linie nach oben zeigt (über die Lippe gemittelt)
  let ny = 0;
  for (let i = 0; i <= 8; i++) ny += profil.tangente((sVorn * i) / 8).x;
  return {
    profil,
    C,
    t0,
    obenLinks: ny > 0,
    haut: { pos: Float32Array.from(hpos), nor: Float32Array.from(hnor), index: Uint32Array.from(hidx), seite, gewicht },
    wand: { pos: Float32Array.from(wpos), nor: Float32Array.from(wnor), index: Uint32Array.from(widx), sz: Float32Array.from(wsz), seite: Int8Array.from(wseite) },
    breite,
    sVorn,
    lang,
    ms: performance.now() - t0ms,
  };
}

/** die Dreiecke der Haut, die im Auslauf liegen (ein Punkt dreht nur zum Teil mit): Dort wird die Haut gedehnt */
export function auslaufDreiecke(index: Uint32Array, gewicht: Float32Array): Uint32Array {
  const aus: number[] = [];
  const teil = (v: number): boolean => gewicht[v]! > 1e-3 && gewicht[v]! < 1 - 1e-3;
  for (let t = 0; t < index.length; t += 3) if (teil(index[t]!) || teil(index[t + 1]!) || teil(index[t + 2]!)) aus.push(t);
  return Uint32Array.from(aus);
}

/**
 * Im Auslauf die Normalen aus der gestellten Haut neu rechnen (dort schert die Drehung die Haut, die mitgedrehte Normale stimmt
 * nicht mehr); überall sonst bleibt die Normale der Form, mitgedreht.
 */
export function auslaufNormalen(pos: Float32Array, index: Uint32Array, dreiecke: Uint32Array, gewicht: Float32Array, nor: Float32Array, puffer: Float32Array): void {
  const teil = (v: number): boolean => gewicht[v]! > 1e-3 && gewicht[v]! < 1 - 1e-3;
  for (let i = 0; i < dreiecke.length; i++) {
    const t = dreiecke[i]!;
    for (let k = 0; k < 3; k++) {
      const v = index[t + k]!;
      puffer[3 * v] = puffer[3 * v + 1] = puffer[3 * v + 2] = 0;
    }
  }
  for (let i = 0; i < dreiecke.length; i++) {
    const t = dreiecke[i]!;
    const a = index[t]!;
    const b = index[t + 1]!;
    const c = index[t + 2]!;
    const ux = pos[3 * b]! - pos[3 * a]!;
    const uy = pos[3 * b + 1]! - pos[3 * a + 1]!;
    const uz = pos[3 * b + 2]! - pos[3 * a + 2]!;
    const wx = pos[3 * c]! - pos[3 * a]!;
    const wy = pos[3 * c + 1]! - pos[3 * a + 1]!;
    const wz = pos[3 * c + 2]! - pos[3 * a + 2]!;
    // (nach der Fläche gewichtet: Hier genügt es, das Netz ist dort gleichmäßig)
    const nx = uy * wz - uz * wy;
    const ny = uz * wx - ux * wz;
    const nz = ux * wy - uy * wx;
    for (const v of [a, b, c]) {
      puffer[3 * v]! += nx;
      puffer[3 * v + 1]! += ny;
      puffer[3 * v + 2]! += nz;
    }
  }
  for (let i = 0; i < dreiecke.length; i++) {
    const t = dreiecke[i]!;
    for (let k = 0; k < 3; k++) {
      const v = index[t + k]!;
      if (!teil(v)) continue;
      const l = Math.hypot(puffer[3 * v]!, puffer[3 * v + 1]!, puffer[3 * v + 2]!);
      if (l < 1e-12) continue;
      nor[3 * v] = puffer[3 * v]! / l;
      nor[3 * v + 1] = puffer[3 * v + 1]! / l;
      nor[3 * v + 2] = puffer[3 * v + 2]! / l;
    }
  }
}

/**
 * Die Kiefer stellen: Jeder Punkt dreht um den Mundwinkel, links der Linie gegen den Uhrzeigersinn, rechts mit ihm, um den Winkel
 * seines Kiefers mal sein Gewicht. `oben`, `unten` in Bogenmaß (positiv öffnet).
 */
export function kieferStellen(
  m: MaulSchnitt,
  oben: number,
  unten: number,
  ruhe: { pos: Float32Array; nor: Float32Array; seite: Int8Array; gewicht: Float32Array | null },
  ziel: { pos: Float32Array; nor: Float32Array },
): void {
  const links = m.obenLinks ? oben : unten;
  const rechts = m.obenLinks ? unten : oben;
  const n = ruhe.pos.length / 3;
  const cx = m.C.x;
  const cy = m.C.y;
  for (let v = 0; v < n; v++) {
    const g = ruhe.gewicht ? ruhe.gewicht[v]! : 1;
    const x = ruhe.pos[3 * v]!;
    const y = ruhe.pos[3 * v + 1]!;
    const nx = ruhe.nor[3 * v]!;
    const ny = ruhe.nor[3 * v + 1]!;
    if (g <= 0) {
      ziel.pos[3 * v] = x;
      ziel.pos[3 * v + 1] = y;
      ziel.nor[3 * v] = nx;
      ziel.nor[3 * v + 1] = ny;
      ziel.nor[3 * v + 2] = ruhe.nor[3 * v + 2]!;
      continue;
    }
    ziel.nor[3 * v + 2] = ruhe.nor[3 * v + 2]!;
    const a = (ruhe.seite[v]! > 0 ? links : -rechts) * g;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = x - cx;
    const dy = y - cy;
    ziel.pos[3 * v] = cx + c * dx - s * dy;
    ziel.pos[3 * v + 1] = cy + s * dx + c * dy;
    ziel.nor[3 * v] = c * nx - s * ny;
    ziel.nor[3 * v + 1] = s * nx + c * ny;
  }
}
