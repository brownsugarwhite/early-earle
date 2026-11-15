/**
 * Raum der Probe „Linien, Punkte, Zeiger“ (Florian, 14.11.2026: „Kannst du es auf ein 3D-Modell übertragen, damit ich es im Raum testen
 * kann?“): eine gesicherte Form aus `wesen/` mit ihrer Haut und ihren Linien, drehbar. Jedes Bild werden die Linien (Bézier-Pfade
 * durch ihre Punkte, wie im Editor, samt Spiegelhälfte) auf den Bildschirm projiziert; das Verhalten (Anflug, Tropfen, Greifen) läuft
 * darauf wie in 2D, die Anzeige entscheidet je Bildpunkt nach der Tiefe, was verdeckt ist.
 *
 * Ziehen: Die Stelle folgt der Maus in der Bildebene. Haut, Punkte und Griffe gehen mit einem weichen Feld um die Stelle mit
 * (spiegelgleich, Punkte der Mitte bleiben auf der Mitte). Das ist nur der Ersatz für den Löser des Editors: Im Editor rechnet die Haut
 * wie gewohnt aus den Linien.
 */

import { hautSeiten, kanteBei, type Loop, type LoopPunkt } from '@ee/shape/dicht';
import type { WesenStand } from '../form/ablage';
import { hautAusFlach } from '../form/verfeinern';
import { Feder1 } from './feder';
import type { Koerper } from './fluessig';
import type { Art, Linie, LinienProben, Netz, Seite } from './netz';
import { type DrehBild, RASTEN, type RichtungZiel, schwungFaktor, winkelDiff } from './richtung';
import type { EntwurfInfo, FadenEnde, FadenProben, StiftOrt, StiftWerk, V2 } from './stift';
import type { Raum, Werte, Ziel } from './verhalten';

type V3 = { x: number; y: number; z: number };

interface Stueck3 {
  a: number;
  b: number;
  g1: number;
  g2: number;
  kante: boolean;
}
interface Linie3 {
  zu: boolean;
  /** Anker der Reihe nach (geschlossen: je Stück sein Anfang; offen dazu das Ende) */
  anker: number[];
  stuecke: Stueck3[];
  /** mit P gezeichnet: gezeigt wird sie auf die Haut gelegt (sie läuft über die Haut, nie durch sie) */
  aufHaut?: boolean;
}
/** Gitter über die Punkte der gezeigten Haut, Dreiecke je Punkt, Kugeln je Dreieck (für Strahlen) */
interface Gitter {
  stand: number;
  zelle: number;
  karte: Map<number, number[]>;
  anfang: Int32Array;
  liste: Int32Array;
  kugel: Float32Array;
}
/** Zustand der Linie, die P gerade zeichnet: sie und ihr Spiegelbild, Griffe als Vektoren in der Welt */
interface Entwurf3 {
  li: number;
  zw: number;
  erster: number;
  letzter: number;
  anzahl: number;
  haengt: boolean;
  mitteAnfang: boolean;
  aus: V3;
  einErster: V3;
  knickErster: boolean;
  start: StiftOrt['art'];
}
/** ein Schritt fürs Zurück: Geometrie und Aufbau der Linien (Werkzeug P ändert ihn) */
interface Stand3 {
  haut: Float32Array;
  anker: Float64Array;
  griffe: Float64Array;
  sichtbar: Uint8Array;
  linien: Linie3[];
  knick: boolean[][];
}

// ---------- Vektoren ----------

const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
const plus3 = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const minus3 = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mal3 = (a: V3, f: number): V3 => v3(a.x * f, a.y * f, a.z * f);
const punkt3 = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const kreuz3 = (a: V3, b: V3): V3 => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const laenge3 = (a: V3): number => Math.hypot(a.x, a.y, a.z);
const einheit3 = (a: V3): V3 => mal3(a, 1 / (laenge3(a) || 1));
const spiegel3 = (a: V3): V3 => v3(a.x, a.y, -a.z);
/** a um die Achse k (Einheit) um den Winkel w drehen (Rodrigues) */
const drehe3 = (a: V3, k: V3, w: number): V3 => {
  const c = Math.cos(w);
  const s = Math.sin(w);
  return plus3(plus3(mal3(a, c), mal3(kreuz3(k, a), s)), mal3(k, punkt3(k, a) * (1 - c)));
};
const linienKopie = (ls: readonly Linie3[]): Linie3[] =>
  ls.map((l) => ({ zu: l.zu, anker: l.anker.slice(), stuecke: l.stuecke.map((s) => ({ ...s })), ...(l.aufHaut ? { aufHaut: true } : {}) }));
/** Anker einer Linie aus ihren Stücken */
const ankerVon = (l: Linie3): number[] => (l.zu || !l.stuecke.length ? l.stuecke.map((s) => s.a) : [...l.stuecke.map((s) => s.a), l.stuecke[l.stuecke.length - 1]!.b]);
const zellSchluessel = (ix: number, iy: number, iz: number): number => ((ix + 2048) * 4096 + (iy + 2048)) * 4096 + (iz + 2048);
/** nächster Punkt des Dreiecks abc zu p (Ericson, „Real-Time Collision Detection“, 5.1.5) */
function naechsterAufDreieck(p: V3, a: V3, b: V3, c: V3): V3 {
  const ab = minus3(b, a);
  const ac = minus3(c, a);
  const ap = minus3(p, a);
  const d1 = punkt3(ab, ap);
  const d2 = punkt3(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = minus3(p, b);
  const d3 = punkt3(ab, bp);
  const d4 = punkt3(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return plus3(a, mal3(ab, d1 / (d1 - d3)));
  const cp = minus3(p, c);
  const d5 = punkt3(ab, cp);
  const d6 = punkt3(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return plus3(a, mal3(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return plus3(b, mal3(minus3(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return plus3(a, plus3(mal3(ab, vb * den), mal3(ac, vc * den)));
}
/** ein Stück durch die Proben (3D), Griffe in den Richtungen tA und tB, Längen nach den kleinsten Quadraten (wie `stueckAnpassen`) */
function stueckAnpassen3(pts: readonly V3[], tA: V3, tB: V3): [number, number] {
  const N = pts.length;
  const A = pts[0]!;
  const B = pts[N - 1]!;
  const sehne = laenge3(minus3(B, A));
  const u = new Float64Array(N);
  for (let i = 1; i < N; i++) u[i] = u[i - 1]! + laenge3(minus3(pts[i]!, pts[i - 1]!));
  const L = u[N - 1]! || 1;
  for (let i = 0; i < N; i++) u[i] = u[i]! / L;
  let c00 = 0;
  let c01 = 0;
  let c11 = 0;
  let x0 = 0;
  let x1 = 0;
  for (let i = 0; i < N; i++) {
    const t = u[i]!;
    const v = 1 - t;
    const b0 = v * v * v;
    const b1 = 3 * v * v * t;
    const b2 = 3 * v * t * t;
    const b3 = t * t * t;
    const a1 = mal3(tA, b1);
    const a2 = mal3(tB, b2);
    c00 += punkt3(a1, a1);
    c01 += punkt3(a1, a2);
    c11 += punkt3(a2, a2);
    const r = minus3(pts[i]!, plus3(mal3(A, b0 + b1), mal3(B, b2 + b3)));
    x0 += punkt3(r, a1);
    x1 += punkt3(r, a2);
  }
  const det = c00 * c11 - c01 * c01;
  let a = sehne / 3;
  let b = sehne / 3;
  if (Math.abs(det) > 1e-12) {
    a = (x0 * c11 - x1 * c01) / det;
    b = (c00 * x1 - c01 * x0) / det;
  }
  if (!(a > 1e-6 * sehne) || !(b > 1e-6 * sehne)) a = b = sehne / 3;
  return [a, b];
}
function anhaengen(a: Float64Array, p: V3): Float64Array {
  const n = new Float64Array(a.length + 3);
  n.set(a);
  n[a.length] = p.x;
  n[a.length + 1] = p.y;
  n[a.length + 2] = p.z;
  return n;
}

// ---------- Matrizen (Spalten, wie WebGL) ----------

function mal(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + i]! * b[j * 4 + k]!;
      o[j * 4 + i] = s;
    }
  return o;
}

function perspektive(fovy: number, aspekt: number, nah: number, fern: number): Float32Array {
  const f = 1 / Math.tan(fovy / 2);
  const o = new Float32Array(16);
  o[0] = f / aspekt;
  o[5] = f;
  o[10] = (fern + nah) / (nah - fern);
  o[11] = -1;
  o[14] = (2 * fern * nah) / (nah - fern);
  return o;
}

function blick(auge: V3, ziel: V3, oben: V3): Float32Array {
  let zx = auge.x - ziel.x;
  let zy = auge.y - ziel.y;
  let zz = auge.z - ziel.z;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl;
  zy /= zl;
  zz /= zl;
  let xx = oben.y * zz - oben.z * zy;
  let xy = oben.z * zx - oben.x * zz;
  let xz = oben.x * zy - oben.y * zx;
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl;
  xy /= xl;
  xz /= xl;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  const o = new Float32Array(16);
  o[0] = xx;
  o[4] = xy;
  o[8] = xz;
  o[1] = yx;
  o[5] = yy;
  o[9] = yz;
  o[2] = zx;
  o[6] = zy;
  o[10] = zz;
  o[12] = -(xx * auge.x + xy * auge.y + xz * auge.z);
  o[13] = -(yx * auge.x + yy * auge.y + yz * auge.z);
  o[14] = -(zx * auge.x + zy * auge.y + zz * auge.z);
  o[15] = 1;
  return o;
}

const glocke = (x: number): number => {
  if (x >= 1) return 0;
  const u = 1 - x * x;
  return u * u;
};
const glatt = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Raum3D implements Raum, StiftWerk {
  /** Geometrie (verformbar): Anker (Punkte der Linien, Kreuzungen geteilt), Griffspitzen absolut, Haut */
  anker: Float64Array = new Float64Array(0);
  ankerSichtbar: Uint8Array = new Uint8Array(0);
  griffe: Float64Array = new Float64Array(0);
  linien: Linie3[] = [];
  hautPos = new Float32Array(0);
  hautTri = new Uint32Array(0);
  /**
   * Gezeigt wird wie im Editor (`anzeigeZ`): Jede Hälfte ist an der Spiegelebene abgeschnitten (ein Punkt, der hinüberreicht, liegt
   * auf der Ebene), Dreiecke ganz auf der Ebene fallen weg. Die Haut darf sonst an der Mitte durch sich selbst laufen.
   */
  private seite: Int8Array | null = null;
  anzeigePos = new Float32Array(0);
  anzeigeTri = new Uint32Array(0);
  hautNormal = new Float32Array(0);
  private normalVz = 1;
  mitte: V3 = { x: 0, y: 0, z: 0 };
  radius = 1;
  private netzNr = 0;
  private geaendert = true;
  // Kamera: Drehung um die Hochachse (gier), Neigung (nick), Abstand, Mitte; alles mit Federn
  gier = new Feder1(0);
  nick = new Feder1(0);
  abstand = new Feder1(1);
  zielX = new Feder1(0);
  zielY = new Feder1(0);
  zielZ = new Feder1(0);
  readonly fov = (30 * Math.PI) / 180;
  private ansicht: Float32Array = new Float32Array(16);
  private projektion: Float32Array = new Float32Array(16);
  private pv: Float32Array = new Float32Array(16);
  private b = 1;
  private h = 1;
  /** Ziehen */
  einfluss = 0.3;
  private zug: {
    p0: V3;
    seite: number;
    rechts: V3;
    oben: V3;
    massProPunkt: number;
    skala: number;
    haut0: Float32Array;
    anker0: Float64Array;
    griffe0: Float64Array;
  } | null = null;
  private schritte: Stand3[] = [];
  /** je Linie und Stelle (Anfang des Stücks): Knick der Linie an diesem Punkt, erst aus der Form erkannt, dann von Hand */
  knick: boolean[][] = [];
  private kamera = { auge: v3(0, 0, 1), vor: v3(0, 0, -1), rechts: v3(1, 0, 0), oben: v3(0, 1, 0), tan: 0.27, aspekt: 1 };
  /** Drehen einer Richtung (siehe `richtung.ts`): Nabe, Griffe, Ebene (Achse, e1, e2), Hebel, Zustand */
  private dreh: {
    z: RichtungZiel;
    H: V3;
    /** Griffe am Anfang dieser Ebene (nach einem Wechsel mit ⇧ der Stand beim Wechsel) und beim Drücken */
    A0: V3;
    P0: V3;
    A0start: V3;
    P0start: V3;
    rhoStart: number;
    armG: number;
    gegenG: number;
    armZw: number;
    gegenZw: number;
    /** Senkrechte der Haut am Punkt; Ebene des Rings: Achse, Grundrichtungen, Mitte (auf der Haut am Punkt, beim Kegel darüber) */
    n: V3;
    achse: V3;
    e1: V3;
    e2: V3;
    mitte: V3;
    rho0: number;
    flach: boolean;
    hs: [number, number];
    s0: [number, number];
    vz: number;
    /** ⇧: aus der Haut (Ebene aus Richtung und Senkrechter); sonst um die Senkrechte */
    kippen: boolean;
    /** der Ring schwenkt nach einem Wechsel mit ⇧ von seiner alten Lage in die neue */
    schwenk: { mitte: V3; e1: V3; e2: V3; r: number; f: Feder1 } | null;
    knick0: boolean;
    los: boolean;
    partner: Feder1;
    winkel: number;
    faktor: number;
    eingerastet: boolean;
  } | null = null;
  private ausr: { armG: number; armZw: number; H: V3; A0: V3; achse: V3; winkel: number } | null = null;
  /** Werkzeug P hat eben einen Punkt gesetzt: Setzen und das Ziehen danach sind ein Schritt fürs Zurück */
  private gesetzt = false;
  schattierung = 0;

  laden(stand: WesenStand): void {
    const quelle = stand.grund ?? { haut: stand.haut, loops: stand.loops };
    const haut = quelle.haut;
    const loops = quelle.loops;
    this.hautPos = Float32Array.from(haut.pos);
    this.hautTri = Uint32Array.from(haut.tri);
    // Mitte und Größe
    let x0 = Infinity;
    let y0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let z1 = -Infinity;
    for (let i = 0; i < haut.n; i++) {
      const x = haut.pos[i * 3]!;
      const y = haut.pos[i * 3 + 1]!;
      const z = haut.pos[i * 3 + 2]!;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    this.mitte = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: 0 };
    this.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2;
    // Richtung der Normalen: nach außen (Vorzeichen des Volumens)
    let vol = 0;
    const T = this.hautTri;
    const P = this.hautPos;
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t]! * 3;
      const b = T[t + 1]! * 3;
      const c = T[t + 2]! * 3;
      vol +=
        P[a]! * (P[b + 1]! * P[c + 2]! - P[b + 2]! * P[c + 1]!) -
        P[a + 1]! * (P[b]! * P[c + 2]! - P[b + 2]! * P[c]!) +
        P[a + 2]! * (P[b]! * P[c + 1]! - P[b + 1]! * P[c]!);
    }
    this.normalVz = vol >= 0 ? 1 : -1;
    this.seite = hautSeiten(hautAusFlach(haut));
    this.anzeigePos = new Float32Array(this.hautPos.length);
    this.hautNormal = new Float32Array(this.hautPos.length);
    this.anzeigeRechnen();
    // Dreiecke, die ganz auf der Ebene liegen, zeigt der Editor nicht
    const behalten: number[] = [];
    const Z = this.anzeigePos;
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t]!;
      const b = T[t + 1]!;
      const c = T[t + 2]!;
      if (Z[a * 3 + 2] === 0 && Z[b * 3 + 2] === 0 && Z[c * 3 + 2] === 0) continue;
      behalten.push(a, b, c);
    }
    this.anzeigeTri = Uint32Array.from(behalten);
    this.linienBauen(loops);
    this.schritte = [];
    this.zug = null;
    this.netzNr++;
    this.geaendert = true;
    this.zielX.setzen(this.mitte.x);
    this.zielY.setzen(this.mitte.y);
    this.zielZ.setzen(this.mitte.z);
    this.abstand.setzen(this.passenderAbstand());
    this.gier.setzen(0);
    this.nick.setzen(0);
  }

  /** so weit weg, dass die Form ins Fenster passt (auch in ein schmales) */
  private passenderAbstand(): number {
    const aspekt = this.b / this.h;
    const fovB = 2 * Math.atan(Math.tan(this.fov / 2) * aspekt);
    return (this.radius / Math.sin(Math.min(this.fov, fovB) / 2)) * 1.02;
  }

  /** Fenstergröße (Bildschirmpunkte), bevor eine Form geladen wird */
  setzeFenster(b: number, h: number): void {
    this.b = b;
    this.h = h;
  }

  /** gezeigte Lagen (jede Hälfte an der Ebene abgeschnitten) und ihre Normalen */
  private anzeigeRechnen(): void {
    this.hautStand++;
    const P = this.hautPos;
    const A = this.anzeigePos;
    const S = this.seite;
    for (let v = 0; v < P.length / 3; v++) {
      const z = P[v * 3 + 2]!;
      const s = S ? S[v]! : 0;
      A[v * 3] = P[v * 3]!;
      A[v * 3 + 1] = P[v * 3 + 1]!;
      A[v * 3 + 2] = s > 0 ? (z < 0 ? 0 : z) : s < 0 ? (z > 0 ? 0 : z) : z;
    }
    this.normalenRechnen();
  }

  private normalenRechnen(): void {
    const N = this.hautNormal;
    const P = this.anzeigePos;
    const T = this.hautTri;
    N.fill(0);
    for (let t = 0; t < T.length; t += 3) {
      const a = T[t]! * 3;
      const b = T[t + 1]! * 3;
      const c = T[t + 2]! * 3;
      const ux = P[b]! - P[a]!;
      const uy = P[b + 1]! - P[a + 1]!;
      const uz = P[b + 2]! - P[a + 2]!;
      const vx = P[c]! - P[a]!;
      const vy = P[c + 1]! - P[a + 1]!;
      const vz = P[c + 2]! - P[a + 2]!;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const i of [a, b, c]) {
        N[i] = N[i]! + nx;
        N[i + 1] = N[i + 1]! + ny;
        N[i + 2] = N[i + 2]! + nz;
      }
    }
    for (let i = 0; i < N.length; i += 3) {
      const l = Math.hypot(N[i]!, N[i + 1]!, N[i + 2]!) || 1;
      const f = this.normalVz / l;
      N[i] = N[i]! * f;
      N[i + 1] = N[i + 1]! * f;
      N[i + 2] = N[i + 2]! * f;
    }
  }

  /** Linien aus den Loops: Bézier-Pfade durch ihre Punkte; Ring = Hälfte und gespiegelte Hälfte, Paar = Loop und Zwilling */
  private linienBauen(loops: readonly Loop[]): void {
    const ankerIdx = new Map<string, number>();
    const ankerPos: number[] = [];
    const ankerSicht: number[] = [];
    const griffPos: number[] = [];
    const eps = this.radius * 1e-4;
    const anker = (schluessel: string, p: V3, sichtbar: boolean): number => {
      let i = ankerIdx.get(schluessel);
      if (i === undefined) {
        i = ankerSicht.length;
        ankerIdx.set(schluessel, i);
        ankerPos.push(p.x, p.y, p.z);
        ankerSicht.push(sichtbar ? 1 : 0);
      } else if (sichtbar) ankerSicht[i] = 1;
      return i;
    };
    const griff = (p: V3): number => {
      griffPos.push(p.x, p.y, p.z);
      return griffPos.length / 3 - 1;
    };
    const sp = (v: V3): V3 => ({ x: v.x, y: v.y, z: -v.z });
    const plus = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
    const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const mal3 = (a: V3, f: number): V3 => ({ x: a.x * f, y: a.y * f, z: a.z * f });
    this.linien = [];
    for (const l of loops) {
      const P = l.punkte;
      const m = P.length;
      if (m < 2) continue;
      const zu = l.art !== 'ring';
      // Griffe; fehlen sie, aus den Nachbarn (wie Catmull-Rom)
      const nach = (i: number): LoopPunkt | undefined => (zu ? P[(i + 1) % m] : P[i + 1]);
      const vor = (i: number): LoopPunkt | undefined => (zu ? P[(i - 1 + m) % m] : P[i - 1]);
      const aus = (i: number): V3 => {
        const p = P[i]!;
        if (p.aus) return p.aus;
        const n = nach(i);
        const v = vor(i);
        if (n && v) return mal3(minus(n.ref, v.ref), 1 / 6);
        if (n) return mal3(minus(n.ref, p.ref), 1 / 3);
        return { x: 0, y: 0, z: 0 };
      };
      const ein = (i: number): V3 => {
        const p = P[i]!;
        if (p.ein) return p.ein;
        const n = nach(i);
        const v = vor(i);
        if (n && v) return mal3(minus(v.ref, n.ref), 1 / 6);
        if (v) return mal3(minus(v.ref, p.ref), 1 / 3);
        return { x: 0, y: 0, z: 0 };
      };
      // Kante je Stück: die Mehrheit der Proben zwischen seinen Punkten
      const k = kanteBei(l, loops);
      const kanteStueck = (i: number): boolean => {
        const sa = P[i]!.s;
        let sb = (zu ? P[(i + 1) % m]! : P[i + 1]!).s;
        if (sb <= sa) sb += l.laenge;
        let an = 0;
        let alle = 0;
        for (let j = 0; j < l.s.length; j++) {
          let s = l.s[j]!;
          if (s < sa) s += l.laenge;
          if (s < sa || s > sb) continue;
          alle++;
          if (k[j]) an++;
        }
        return alle > 0 && an * 2 > alle;
      };
      const schl = (i: number, spiegel: boolean): string => {
        const p = P[i]!;
        const basis = p.kreuzung !== undefined ? `k${p.kreuzung}` : `l${l.id}:${i}`;
        return spiegel && Math.abs(p.ref.z) > eps ? `${basis}~` : basis;
      };
      const lage = (i: number, spiegel: boolean): V3 => (spiegel ? sp(P[i]!.ref) : P[i]!.ref);
      const sichtbar = (i: number): boolean => !P[i]!.vonSelbst;
      // vorwärts: Stück i von P[i] nach P[i+1]
      const vorwaerts = (spiegel: boolean, linie: Linie3): void => {
        const anzahl = zu ? m : m - 1;
        for (let i = 0; i < anzahl; i++) {
          const j = (i + 1) % m;
          const a = anker(schl(i, spiegel), lage(i, spiegel), sichtbar(i));
          const b = anker(schl(j, spiegel), lage(j, spiegel), sichtbar(j));
          const g1 = griff(spiegel ? sp(plus(P[i]!.ref, aus(i))) : plus(P[i]!.ref, aus(i)));
          const g2 = griff(spiegel ? sp(plus(P[j]!.ref, ein(j))) : plus(P[j]!.ref, ein(j)));
          linie.stuecke.push({ a, b, g1, g2, kante: kanteStueck(i) });
          if (i === 0 || !zu || i < anzahl) linie.anker.push(a);
        }
        if (!zu) linie.anker.push(anker(schl(m - 1, spiegel), lage(m - 1, spiegel), sichtbar(m - 1)));
      };
      if (l.art === 'ring') {
        // Hälfte und gespiegelte Hälfte rückwärts: ein geschlossener Ring
        const linie: Linie3 = { zu: true, anker: [], stuecke: [] };
        for (let i = 0; i < m - 1; i++) {
          const a = anker(schl(i, false), lage(i, false), sichtbar(i));
          const b = anker(schl(i + 1, false), lage(i + 1, false), sichtbar(i + 1));
          linie.anker.push(a);
          linie.stuecke.push({ a, b, g1: griff(plus(P[i]!.ref, aus(i))), g2: griff(plus(P[i + 1]!.ref, ein(i + 1))), kante: kanteStueck(i) });
        }
        for (let i = m - 1; i >= 1; i--) {
          const a = anker(schl(i, true), lage(i, true), sichtbar(i));
          const b = anker(schl(i - 1, true), lage(i - 1, true), sichtbar(i - 1));
          linie.anker.push(a);
          linie.stuecke.push({ a, b, g1: griff(sp(plus(P[i]!.ref, ein(i)))), g2: griff(sp(plus(P[i - 1]!.ref, aus(i - 1)))), kante: kanteStueck(i - 1) });
        }
        this.linien.push(linie);
      } else {
        const linie: Linie3 = { zu: true, anker: [], stuecke: [] };
        vorwaerts(false, linie);
        this.linien.push(linie);
        if (l.art === 'paar') {
          const zwilling: Linie3 = { zu: true, anker: [], stuecke: [] };
          vorwaerts(true, zwilling);
          this.linien.push(zwilling);
        }
      }
    }
    // Knick je Linie und Punkt aus der Form: die beiden Griffe nicht auf einer Geraden (mehr als 10° daneben)
    const grenze = Math.cos((10 * Math.PI) / 180);
    const lageAus = (arr: number[], i: number): V3 => v3(arr[i * 3]!, arr[i * 3 + 1]!, arr[i * 3 + 2]!);
    this.knick = this.linien.map((l) =>
      l.stuecke.map((st, k) => {
        const vor = l.stuecke[(k - 1 + l.stuecke.length) % l.stuecke.length]!;
        const H = lageAus(ankerPos, st.a);
        const a = minus3(lageAus(griffPos, st.g1), H);
        const e = minus3(lageAus(griffPos, vor.g2), H);
        const la = laenge3(a);
        const le = laenge3(e);
        if (la < 1e-9 || le < 1e-9) return true;
        return -punkt3(a, e) / (la * le) < grenze;
      }),
    );
    // Anker je Linie: genau einer je Stück (Anfang des Stücks)
    for (const l of this.linien) l.anker = l.stuecke.map((s) => s.a);
    this.anker = Float64Array.from(ankerPos);
    this.ankerSichtbar = Uint8Array.from(ankerSicht);
    this.griffe = Float64Array.from(griffPos);
  }

  // ---------- Kamera ----------

  /** Hausansichten wie im Editor: Seite von +z, Front von −x, Top von +y */
  zeigeAnsicht(art: 'seite' | 'front' | 'top' | 'schraeg'): void {
    const [g, n] = art === 'seite' ? [0, 0] : art === 'front' ? [-Math.PI / 2, 0] : art === 'top' ? [0, Math.PI / 2 - 1e-3] : [-0.55, 0.32];
    // auf dem kurzen Weg drehen
    let ziel = g;
    while (ziel - this.gier.x > Math.PI) ziel -= 2 * Math.PI;
    while (this.gier.x - ziel > Math.PI) ziel += 2 * Math.PI;
    this.gier.ziel = ziel;
    this.nick.ziel = n;
    this.zielX.ziel = this.mitte.x;
    this.zielY.ziel = this.mitte.y;
    this.zielZ.ziel = this.mitte.z;
    this.abstand.ziel = this.passenderAbstand();
  }

  drehen(dGier: number, dNick: number): void {
    this.gier.ziel += dGier;
    this.nick.ziel = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.nick.ziel + dNick));
  }

  zoomen(f: number): void {
    this.abstand.ziel = Math.max(this.radius * 0.3, Math.min(this.radius * 12, this.abstand.ziel * f));
  }

  /** verschieben um Bildschirmpunkte */
  schieben(dx: number, dy: number): void {
    const k = (2 * this.abstand.ziel * Math.tan(this.fov / 2)) / this.h;
    const v = this.ansicht;
    // rechts und oben aus der Ansichtsmatrix (Zeilen)
    const r = { x: v[0]!, y: v[4]!, z: v[8]! };
    const o = { x: v[1]!, y: v[5]!, z: v[9]! };
    this.zielX.ziel -= (r.x * dx - o.x * dy) * k;
    this.zielY.ziel -= (r.y * dx - o.y * dy) * k;
    this.zielZ.ziel -= (r.z * dx - o.z * dy) * k;
  }

  kameraSchritt(dt: number): boolean {
    let bewegt = false;
    for (const f of [this.gier, this.nick, this.abstand, this.zielX, this.zielY, this.zielZ]) {
      f.schritt(dt, 7, 1);
      if (!f.ruhig(1e-4 * (f === this.abstand ? this.radius : 1))) bewegt = true;
    }
    return bewegt;
  }

  private matrizen(b: number, h: number): void {
    this.b = b;
    this.h = h;
    const g = this.gier.x;
    const n = this.nick.x;
    const d = this.abstand.x;
    const ziel = { x: this.zielX.x, y: this.zielY.x, z: this.zielZ.x };
    const auge = { x: ziel.x + d * Math.cos(n) * Math.sin(g), y: ziel.y + d * Math.sin(n), z: ziel.z + d * Math.cos(n) * Math.cos(g) };
    this.ansicht = blick(auge, ziel, { x: 0, y: 1, z: 0 });
    // für Strahlen durch den Bildschirm (Drehen auf einer Ebene)
    const vor = einheit3(minus3(ziel, auge));
    const rechts = einheit3(kreuz3(vor, v3(0, 1, 0)));
    this.kamera = { auge, vor, rechts, oben: kreuz3(rechts, vor), tan: Math.tan(this.fov / 2), aspekt: b / h };
    const nah = Math.max(this.radius * 0.02, d - this.radius * 3);
    this.projektion = perspektive(this.fov, b / h, nah, d + this.radius * 3);
    this.pv = mal(this.projektion, this.ansicht);
  }

  /** Bildschirmpunkte und Tiefe eines Punkts der Welt */
  private auf(x: number, y: number, z: number, aus: number[], o: number): void {
    const m = this.pv;
    const cx = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    const cy = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    const cw = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
    const v = this.ansicht;
    const vz = v[2]! * x + v[6]! * y + v[10]! * z + v[14]!;
    const w = Math.max(cw, 1e-6);
    aus[o] = (cx / w * 0.5 + 0.5) * this.b;
    aus[o + 1] = (1 - (cy / w * 0.5 + 0.5)) * this.h;
    aus[o + 2] = -vz;
  }

  // ---------- jedes Bild: projizieren ----------

  /**
   * Das Netz für das Verhalten (Bildschirmpunkte) und die Proben der Linien. `sicht`: Tiefe der Haut um den Zeiger (aus dem letzten
   * Bild), damit nur Sichtbares gegriffen wird.
   */
  projizieren(
    b: number,
    h: number,
    werte: Werte,
    massstab: number,
    sicht: { x0: number; y0: number; b: number; h: number; tiefe: Float32Array; dpr: number } | null,
  ): { netz: Netz; proben: LinienProben[] } {
    this.matrizen(b, h);
    this.bildNr++;
    const tmp = [0, 0, 0];
    const bias = this.bias();
    const verdecktBei = (x: number, y: number, z: number): boolean => {
      if (!sicht) return false;
      const px = Math.floor(x * sicht.dpr) - sicht.x0;
      const py = Math.floor(y * sicht.dpr) - sicht.y0;
      if (px < 0 || py < 0 || px >= sicht.b || py >= sicht.h) return false;
      return z > sicht.tiefe[py * sicht.b + px]! + bias;
    };
    // Punkte
    const punkte: Netz['punkte'] = [];
    const nA = this.ankerSichtbar.length;
    for (let i = 0; i < nA; i++) {
      this.auf(this.anker[i * 3]!, this.anker[i * 3 + 1]!, this.anker[i * 3 + 2]!, tmp, 0);
      punkte.push({ x: tmp[0]!, y: tmp[1]!, z: tmp[2]!, sichtbar: !!this.ankerSichtbar[i], verdeckt: verdecktBei(tmp[0]!, tmp[1]!, tmp[2]!) });
    }
    // Linien mit ihren Griffen auf dem Bildschirm (für die Länge der Nadeln) und dem Knick je Punkt
    const linien: Linie[] = this.linien.map((l, li) => ({
      zu: l.zu,
      punkte: l.anker.slice(),
      stuecke: l.stuecke.map((st) => {
        const a = punkte[st.a]!;
        const b = punkte[st.b]!;
        this.auf(this.griffe[st.g1 * 3]!, this.griffe[st.g1 * 3 + 1]!, this.griffe[st.g1 * 3 + 2]!, tmp, 0);
        const g1x = tmp[0]! - a.x;
        const g1y = tmp[1]! - a.y;
        this.auf(this.griffe[st.g2 * 3]!, this.griffe[st.g2 * 3 + 1]!, this.griffe[st.g2 * 3 + 2]!, tmp, 0);
        const art: Art = st.kante ? 'kante' : 'innen';
        return { g1x, g1y, g2x: tmp[0]! - b.x, g2y: tmp[1]! - b.y, art };
      }),
      knick: this.knick[li]?.slice() ?? [],
    }));
    // Proben je Linie
    const proben: LinienProben[] = this.linien.map((l) => {
      const xs: number[] = [];
      const ys: number[] = [];
      const zs: number[] = [];
      const ss: number[] = [];
      const sis: number[] = [];
      const ts: number[] = [];
      const s3: number[] = [];
      const kante: number[] = [];
      const stueckS: number[] = [];
      let s = 0;
      let s3d = 0;
      let px = 0;
      let py = 0;
      let p3 = [0, 0, 0];
      const K = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      l.stuecke.forEach((st, si) => {
        stueckS.push(s);
        // mit P gezeichnet: auf die Haut gelegt
        const D = l.aufHaut ? this.stueckAufHaut(st) : null;
        const A = st.a * 3;
        const B = st.b * 3;
        const G1 = st.g1 * 3;
        const G2 = st.g2 * 3;
        for (let c = 0; c < 3; c++) {
          K[c] = this.anker[A + c]!;
          K[3 + c] = this.griffe[G1 + c]!;
          K[6 + c] = this.griffe[G2 + c]!;
          K[9 + c] = this.anker[B + c]!;
        }
        // so viele Proben, dass auf dem Bildschirm rund 3 Punkte dazwischen liegen
        let laenge = 0;
        let qx = 0;
        let qy = 0;
        for (let j = 0; j < 4; j++) {
          this.auf(K[j * 3]!, K[j * 3 + 1]!, K[j * 3 + 2]!, tmp, 0);
          if (j) laenge += Math.hypot(tmp[0]! - qx, tmp[1]! - qy);
          qx = tmp[0]!;
          qy = tmp[1]!;
        }
        const n = Math.max(3, Math.min(80, Math.ceil(laenge / 3)));
        for (let j = si === 0 ? 0 : 1; j <= n; j++) {
          const t = j / n;
          const u = 1 - t;
          const b0 = u * u * u;
          const b1 = 3 * u * u * t;
          const b2 = 3 * u * t * t;
          const b3 = t * t * t;
          let x = b0 * K[0]! + b1 * K[3]! + b2 * K[6]! + b3 * K[9]!;
          let y = b0 * K[1]! + b1 * K[4]! + b2 * K[7]! + b3 * K[10]!;
          let z = b0 * K[2]! + b1 * K[5]! + b2 * K[8]! + b3 * K[11]!;
          if (D) {
            const m = D.length / 3 - 1;
            const f = t * m;
            const i0 = Math.min(m - 1, Math.floor(f));
            const r = f - i0;
            x = D[i0 * 3]! + (D[i0 * 3 + 3]! - D[i0 * 3]!) * r;
            y = D[i0 * 3 + 1]! + (D[i0 * 3 + 4]! - D[i0 * 3 + 1]!) * r;
            z = D[i0 * 3 + 2]! + (D[i0 * 3 + 5]! - D[i0 * 3 + 2]!) * r;
          }
          this.auf(x, y, z, tmp, 0);
          if (xs.length) {
            s += Math.hypot(tmp[0]! - px, tmp[1]! - py);
            s3d += Math.hypot(x - p3[0]!, y - p3[1]!, z - p3[2]!);
          }
          px = tmp[0]!;
          py = tmp[1]!;
          p3 = [x, y, z];
          xs.push(tmp[0]!);
          ys.push(tmp[1]!);
          zs.push(tmp[2]!);
          ss.push(s);
          s3.push(s3d);
          sis.push(si);
          ts.push(t);
          kante.push(st.kante ? 1 : 0);
        }
      });
      stueckS.push(s);
      const n = xs.length;
      // Breite: innen 0,25; Kanten 1 px, längs ihres Laufs auf 0,25 verjüngt (im Raum gemessen)
      const halb = new Float32Array(n);
      let k0 = -1;
      for (let k = 0; k <= n; k++) {
        const an = k < n && kante[k] === 1;
        if (an && k0 < 0) k0 = k;
        if (!an && k0 >= 0) {
          const L = s3[k - 1]! - s3[k0]!;
          const T = Math.min(L * 0.5, this.radius * 0.15);
          for (let q = k0; q < k; q++) {
            const f = glatt(0, T, s3[q]! - s3[k0]!) * glatt(0, T, s3[k - 1]! - s3[q]!);
            halb[q] = (werte.kanteMin + (werte.kanteMax - werte.kanteMin) * f) / 2;
          }
          k0 = -1;
        }
        if (k < n && !an) halb[k] = werte.innen / 2;
      }
      const schicht = new Uint8Array(n);
      for (let k = 0; k < n; k++) schicht[k] = verdecktBei(xs[k]!, ys[k]!, zs[k]!) ? 1 : 0;
      return {
        n,
        x: Float32Array.from(xs),
        y: Float32Array.from(ys),
        z: Float32Array.from(zs),
        s: Float32Array.from(ss),
        si: Int32Array.from(sis),
        t: Float32Array.from(ts),
        halb,
        schicht,
        laenge: s,
        stueckS: Float32Array.from(stueckS),
      };
    });
    void massstab;
    return { netz: { punkte, linien }, proben };
  }

  /** wie weit eine Linie hinter der Haut liegen darf, ohne verdeckt zu sein (Linien liegen nur ungefähr auf der Haut) */
  bias(): number {
    return this.radius * 0.02;
  }

  koerper(dpr: number, massstab: number, umriss: number): Koerper {
    const k: Koerper = {
      pos: this.anzeigePos,
      normal: this.hautNormal,
      index: this.anzeigeTri,
      projektion: this.pv,
      ansicht: this.ansicht,
      schattierung: this.schattierung,
      umriss: umriss * massstab * dpr,
      geaendert: this.geaendert,
      netz: this.netzNr,
      wicklung: this.normalVz,
    };
    this.geaendert = false;
    return k;
  }

  // ---------- Ziehen ----------

  private bezier3(li: number, si: number, t: number): V3 {
    const st = this.linien[li]!.stuecke[si]!;
    const u = 1 - t;
    const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    const q = [st.a * 3, st.g1 * 3, st.g2 * 3, st.b * 3];
    const quelle = [this.anker, this.griffe, this.griffe, this.anker];
    const o = [0, 0, 0];
    for (let j = 0; j < 4; j++) for (let c = 0; c < 3; c++) o[c] = o[c]! + b[j]! * quelle[j]![q[j]! + c]!;
    return { x: o[0]!, y: o[1]!, z: o[2]! };
  }

  private stelle3(ziel: Ziel): V3 {
    if (ziel.art === 'linie') return this.bezier3(ziel.li, ziel.si, ziel.t);
    return { x: this.anker[ziel.pi * 3]!, y: this.anker[ziel.pi * 3 + 1]!, z: this.anker[ziel.pi * 3 + 2]! };
  }

  /** Gewicht des Felds an einem Punkt der Welt (auf die Seite z ≥ 0 gefaltet) */
  private gewicht(x: number, y: number, z: number): number {
    const zg = this.zug!;
    return glocke(Math.hypot(x - zg.p0.x, y - zg.p0.y, Math.abs(z) - zg.p0.z) / (this.einfluss * this.radius));
  }

  ziehenBeginnen(ziel: Ziel): void {
    const p = this.stelle3(ziel);
    const seite = p.z < 0 ? -1 : 1;
    const v = this.ansicht;
    const tiefe = -(v[2]! * p.x + v[6]! * p.y + v[10]! * p.z + v[14]!);
    if (!this.gesetzt) this.standMerken();
    this.gesetzt = false;
    this.zug = {
      p0: { x: p.x, y: p.y, z: Math.abs(p.z) },
      seite,
      rechts: { x: v[0]!, y: v[4]!, z: v[8]! },
      oben: { x: v[1]!, y: v[5]!, z: v[9]! },
      massProPunkt: (2 * tiefe * Math.tan(this.fov / 2)) / this.h,
      skala: 1,
      haut0: this.hautPos.slice(),
      anker0: this.anker.slice(),
      griffe0: this.griffe.slice(),
    };
    // an einer Stelle der Linie: so stark ziehen, dass die Stelle genau mitgeht
    if (ziel.art === 'linie') {
      const st = this.linien[ziel.li]!.stuecke[ziel.si]!;
      const t = ziel.t;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      const q = [st.a * 3, st.g1 * 3, st.g2 * 3, st.b * 3];
      const quelle = [this.anker, this.griffe, this.griffe, this.anker];
      let W = 0;
      for (let j = 0; j < 4; j++) W += b[j]! * this.gewicht(quelle[j]![q[j]!]!, quelle[j]![q[j]! + 1]!, quelle[j]![q[j]! + 2]!);
      this.zug.skala = 1 / Math.max(W, 0.3);
    }
  }

  ziehen(dx: number, dy: number): void {
    const zg = this.zug;
    if (!zg) return;
    const k = zg.massProPunkt * zg.skala;
    // Bewegung in der Bildebene, auf die Seite z ≥ 0 gefaltet; an der Mitte nur in der Ebene
    const D = {
      x: (zg.rechts.x * dx - zg.oben.x * dy) * k,
      y: (zg.rechts.y * dx - zg.oben.y * dy) * k,
      z: (zg.rechts.z * dx - zg.oben.z * dy) * k * zg.seite,
    };
    const mitteBreite = this.radius * 0.02;
    if (zg.p0.z < mitteBreite) D.z = 0;
    const feld = (quelle: ArrayLike<number>, ziel: Float32Array | Float64Array): void => {
      for (let i = 0; i < quelle.length; i += 3) {
        const x = quelle[i]!;
        const y = quelle[i + 1]!;
        const z = quelle[i + 2]!;
        const w = this.gewicht(x, y, z);
        if (w <= 0) {
          ziel[i] = x;
          ziel[i + 1] = y;
          ziel[i + 2] = z;
          continue;
        }
        const vz = z >= 0 ? 1 : -1;
        ziel[i] = x + D.x * w;
        ziel[i + 1] = y + D.y * w;
        ziel[i + 2] = z + D.z * w * vz * glatt(0, mitteBreite, Math.abs(z));
      }
    };
    feld(zg.haut0, this.hautPos);
    feld(zg.anker0, this.anker);
    feld(zg.griffe0, this.griffe);
    this.anzeigeRechnen();
    this.geaendert = true;
  }

  ziehenEnden(): void {
    this.zug = null;
  }

  stelle(ziel: Ziel): [number, number] | null {
    const p = this.stelle3(ziel);
    const o = [0, 0, 0];
    this.auf(p.x, p.y, p.z, o, 0);
    return [o[0]!, o[1]!];
  }

  // ---------- Werkzeug P ----------

  private standKopie(): Stand3 {
    return {
      haut: this.hautPos.slice(),
      anker: this.anker.slice(),
      griffe: this.griffe.slice(),
      sichtbar: this.ankerSichtbar.slice(),
      linien: linienKopie(this.linien),
      knick: this.knick.map((k) => k.slice()),
    };
  }

  private standMerken(): void {
    this.schritte.push(this.standKopie());
    if (this.schritte.length > 40) this.schritte.shift();
  }

  private standLaden(z: Stand3): void {
    this.hautPos.set(z.haut);
    this.anker = z.anker.slice();
    this.griffe = z.griffe.slice();
    this.ankerSichtbar = z.sichtbar.slice();
    this.linien = linienKopie(z.linien);
    this.knick = z.knick.map((k) => k.slice());
    this.anzeigeRechnen();
    this.geaendert = true;
  }

  private lage(a: Float64Array, i: number): V3 {
    return { x: a[i * 3]!, y: a[i * 3 + 1]!, z: a[i * 3 + 2]! };
  }

  /** die vier Kontrollpunkte eines Stücks */
  private kontrolle(st: Stueck3): V3[] {
    return [this.lage(this.anker, st.a), this.lage(this.griffe, st.g1), this.lage(this.griffe, st.g2), this.lage(this.anker, st.b)];
  }

  /** das Spiegelbild eines Stücks (gleiche oder umgekehrte Richtung); liegt es selbst auf der Mitte, keins */
  private zwilling(li: number, si: number): { li: number; si: number; rueckwaerts: boolean } | null {
    const k = this.kontrolle(this.linien[li]!.stuecke[si]!);
    const eps = this.radius * 1e-5;
    const gespiegelt = (p: V3, q: V3): boolean => Math.abs(p.x - q.x) < eps && Math.abs(p.y - q.y) < eps && Math.abs(p.z + q.z) < eps;
    for (let lj = 0; lj < this.linien.length; lj++) {
      const L = this.linien[lj]!;
      for (let sj = 0; sj < L.stuecke.length; sj++) {
        if (lj === li && sj === si) continue;
        const q = this.kontrolle(L.stuecke[sj]!);
        if (k.every((p, j) => gespiegelt(p, q[j]!))) return { li: lj, si: sj, rueckwaerts: false };
        if (k.every((p, j) => gespiegelt(p, q[3 - j]!))) return { li: lj, si: sj, rueckwaerts: true };
      }
    }
    return null;
  }

  /** Stück si der Linie li beim Parameter t teilen (de Casteljau, der Verlauf bleibt); Ergebnis: der neue Anker */
  private teilen(li: number, si: number, t: number): number {
    const l = this.linien[li]!;
    const st = l.stuecke[si]!;
    const [P0, P1, P2, P3] = this.kontrolle(st) as [V3, V3, V3, V3];
    const m = (a: V3, b: V3): V3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
    const A = m(P0, P1);
    const B = m(P1, P2);
    const C = m(P2, P3);
    const D = m(A, B);
    const E = m(B, C);
    const M = m(D, E);
    const pi = this.ankerSichtbar.length;
    this.anker = anhaengen(this.anker, M);
    const sicht = new Uint8Array(pi + 1);
    sicht.set(this.ankerSichtbar);
    sicht[pi] = 1;
    this.ankerSichtbar = sicht;
    const setzen = (i: number, p: V3): void => {
      this.griffe[i * 3] = p.x;
      this.griffe[i * 3 + 1] = p.y;
      this.griffe[i * 3 + 2] = p.z;
    };
    setzen(st.g1, A);
    setzen(st.g2, C);
    const gD = this.griffe.length / 3;
    this.griffe = anhaengen(anhaengen(this.griffe, D), E);
    l.stuecke.splice(si, 1, { a: st.a, b: pi, g1: st.g1, g2: gD, kante: st.kante }, { a: pi, b: st.b, g1: gD + 1, g2: st.g2, kante: st.kante });
    l.anker = ankerVon(l);
    this.knick[li]?.splice(si + 1, 0, false);
    return pi;
  }

  /** Werkzeug P: einen Punkt auf die Linie setzen, spiegelgleich auch auf ihr Spiegelbild */
  punktEinsetzen(li: number, si: number, t: number): number | null {
    if (!this.linien[li]?.stuecke[si]) return null;
    this.standMerken();
    this.gesetzt = true;
    const zw = this.zwilling(li, si);
    const pi = this.teilen(li, si, t);
    if (zw) this.teilen(zw.li, zw.li === li && zw.si > si ? zw.si + 1 : zw.si, zw.rueckwaerts ? 1 - t : t);
    return pi;
  }

  // ---------- Haut: treffen, nächster Punkt, Mitte (für P im Raum) ----------

  /** zählt jede Änderung der gezeigten Haut (Gitter, Mitte und aufgelegte Linien rechnen danach neu) */
  private hautStand = 0;
  private gitter: Gitter | null = null;
  private mitteCache: { stand: number; stuecke: Float64Array; normalen: Float32Array } | null = null;
  /** je Stück einer aufgelegten Linie: die Kurve auf der Haut (Proben bei gleichen Parametern) */
  private aufgelegt = new WeakMap<Stueck3, { schluessel: string; p: Float64Array }>();

  private gitterBauen(): Gitter {
    const G = this.gitter;
    if (G && G.stand === this.hautStand) return G;
    const P = this.anzeigePos;
    const T = this.anzeigeTri;
    const nv = P.length / 3;
    const h = this.radius / 40;
    const karte = new Map<number, number[]>();
    for (let v = 0; v < nv; v++) {
      const k = zellSchluessel(Math.floor(P[v * 3]! / h), Math.floor(P[v * 3 + 1]! / h), Math.floor(P[v * 3 + 2]! / h));
      const liste = karte.get(k);
      if (liste) liste.push(v);
      else karte.set(k, [v]);
    }
    const nt = T.length / 3;
    const anfang = new Int32Array(nv + 1);
    for (let i = 0; i < T.length; i++) anfang[T[i]! + 1] = anfang[T[i]! + 1]! + 1;
    for (let v = 0; v < nv; v++) anfang[v + 1] = anfang[v + 1]! + anfang[v]!;
    const fuell = anfang.slice(0, nv);
    const liste = new Int32Array(T.length);
    for (let t = 0; t < nt; t++)
      for (let j = 0; j < 3; j++) {
        const v = T[t * 3 + j]!;
        liste[fuell[v]!] = t;
        fuell[v] = fuell[v]! + 1;
      }
    const kugel = new Float32Array(nt * 4);
    for (let t = 0; t < nt; t++) {
      const a = T[t * 3]! * 3;
      const b = T[t * 3 + 1]! * 3;
      const c = T[t * 3 + 2]! * 3;
      const mx = (P[a]! + P[b]! + P[c]!) / 3;
      const my = (P[a + 1]! + P[b + 1]! + P[c + 1]!) / 3;
      const mz = (P[a + 2]! + P[b + 2]! + P[c + 2]!) / 3;
      let r = 0;
      for (const q of [a, b, c]) r = Math.max(r, Math.hypot(P[q]! - mx, P[q + 1]! - my, P[q + 2]! - mz));
      kugel.set([mx, my, mz, r * 1.001], t * 4);
    }
    this.gitter = { stand: this.hautStand, zelle: h, karte, anfang, liste, kugel };
    return this.gitter;
  }

  /** erster Treffer des Strahls durch den Bildschirmpunkt mit der gezeigten Haut: Lage, Senkrechte (nach außen) */
  private strahlTreffer(sx: number, sy: number): { p: V3; n: V3 } | null {
    const { o, d } = this.strahl(sx, sy);
    const G = this.gitterBauen();
    const P = this.anzeigePos;
    const T = this.anzeigeTri;
    const K = G.kugel;
    const N = this.hautNormal;
    let best = Infinity;
    let bi = -1;
    let bu = 0;
    let bv = 0;
    const nt = T.length / 3;
    for (let i = 0; i < nt; i++) {
      const cx = K[i * 4]! - o.x;
      const cy = K[i * 4 + 1]! - o.y;
      const cz = K[i * 4 + 2]! - o.z;
      const r = K[i * 4 + 3]!;
      const tc = cx * d.x + cy * d.y + cz * d.z;
      if (tc + r < 0 || tc - r > best) continue;
      if (cx * cx + cy * cy + cz * cz - tc * tc > r * r) continue;
      const a = T[i * 3]! * 3;
      const b = T[i * 3 + 1]! * 3;
      const c = T[i * 3 + 2]! * 3;
      const e1x = P[b]! - P[a]!;
      const e1y = P[b + 1]! - P[a + 1]!;
      const e1z = P[b + 2]! - P[a + 2]!;
      const e2x = P[c]! - P[a]!;
      const e2y = P[c + 1]! - P[a + 1]!;
      const e2z = P[c + 2]! - P[a + 2]!;
      const px = d.y * e2z - d.z * e2y;
      const py = d.z * e2x - d.x * e2z;
      const pz = d.x * e2y - d.y * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-14) continue;
      const inv = 1 / det;
      const tx = o.x - P[a]!;
      const ty = o.y - P[a + 1]!;
      const tz = o.z - P[a + 2]!;
      const u = (tx * px + ty * py + tz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = ty * e1z - tz * e1y;
      const qy = tz * e1x - tx * e1z;
      const qz = tx * e1y - ty * e1x;
      const v = (d.x * qx + d.y * qy + d.z * qz) * inv;
      if (v < 0 || u + v > 1) continue;
      const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (t > 1e-9 && t < best) {
        best = t;
        bi = i;
        bu = u;
        bv = v;
      }
    }
    if (bi < 0) return null;
    const ia = T[bi * 3]! * 3;
    const ib = T[bi * 3 + 1]! * 3;
    const ic = T[bi * 3 + 2]! * 3;
    const w = 1 - bu - bv;
    const n = einheit3(v3(w * N[ia]! + bu * N[ib]! + bv * N[ic]!, w * N[ia + 1]! + bu * N[ib + 1]! + bv * N[ic + 1]!, w * N[ia + 2]! + bu * N[ib + 2]! + bv * N[ic + 2]!));
    return { p: plus3(o, mal3(d, best)), n };
  }

  /** nächster Punkt der gezeigten Haut zu q (über das Gitter, dann genau auf den Dreiecken um den nächsten Punkt) und die Senkrechte */
  private aufHaut(q: V3): { p: V3; n: V3 } {
    const G = this.gitterBauen();
    const P = this.anzeigePos;
    const h = G.zelle;
    const ix = Math.floor(q.x / h);
    const iy = Math.floor(q.y / h);
    const iz = Math.floor(q.z / h);
    let bv = -1;
    let bd = Infinity;
    const pruefen = (v: number): void => {
      const d = (P[v * 3]! - q.x) ** 2 + (P[v * 3 + 1]! - q.y) ** 2 + (P[v * 3 + 2]! - q.z) ** 2;
      if (d < bd) {
        bd = d;
        bv = v;
      }
    };
    for (let s = 0; s <= 12; s++) {
      for (let dx = -s; dx <= s; dx++)
        for (let dy = -s; dy <= s; dy++)
          for (let dz = -s; dz <= s; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== s) continue;
            const liste = G.karte.get(zellSchluessel(ix + dx, iy + dy, iz + dz));
            if (liste) for (const v of liste) pruefen(v);
          }
      if (bv >= 0 && Math.sqrt(bd) <= s * h) break;
    }
    if (bv < 0) for (let v = 0; v < P.length / 3; v++) pruefen(v);
    const T = this.anzeigeTri;
    let best = this.lage(P as unknown as Float64Array, bv);
    let bestD = Math.sqrt(bd);
    for (let k = G.anfang[bv]!; k < G.anfang[bv + 1]!; k++) {
      const t = G.liste[k]!;
      const c = naechsterAufDreieck(q, this.lage(P as unknown as Float64Array, T[t * 3]!), this.lage(P as unknown as Float64Array, T[t * 3 + 1]!), this.lage(P as unknown as Float64Array, T[t * 3 + 2]!));
      const d = laenge3(minus3(c, q));
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    const N = this.hautNormal;
    return { p: best, n: einheit3(v3(N[bv * 3]!, N[bv * 3 + 1]!, N[bv * 3 + 2]!)) };
  }

  /** Schnitt der Haut mit der Spiegelebene (z = 0): Stücke (je sechs Werte) und je Stück die Senkrechte der Haut dort */
  private mitteStuecke(): { stuecke: Float64Array; normalen: Float32Array } {
    const M = this.mitteCache;
    if (M && M.stand === this.hautStand) return M;
    const P = this.hautPos;
    const T = this.hautTri;
    const N = this.hautNormal;
    const aus: number[] = [];
    const nor: number[] = [];
    for (let t = 0; t < T.length; t += 3) {
      const ecken = [T[t]!, T[t + 1]!, T[t + 2]!];
      const pts: number[] = [];
      for (let j = 0; j < 3; j++) {
        const a = ecken[j]!;
        const b = ecken[(j + 1) % 3]!;
        const za = P[a * 3 + 2]!;
        const zb = P[b * 3 + 2]!;
        if (za < 0 === zb < 0) continue;
        const f = za / (za - zb);
        pts.push(P[a * 3]! + (P[b * 3]! - P[a * 3]!) * f, P[a * 3 + 1]! + (P[b * 3 + 1]! - P[a * 3 + 1]!) * f, 0);
      }
      if (pts.length !== 6) continue;
      aus.push(...pts);
      const a = ecken[0]! * 3;
      nor.push(N[a]!, N[a + 1]!, 0);
    }
    this.mitteCache = { stand: this.hautStand, stuecke: Float64Array.from(aus), normalen: Float32Array.from(nor) };
    return this.mitteCache;
  }

  /** die Mitte auf dem Bildschirm (einmal je Bild): je Stück x, y, Tiefe beider Enden */
  private bildNr = 0;
  private mitteSchirmCache: { bild: number; stand: number; xy: Float64Array } | null = null;
  private mitteSchirm(): Float64Array {
    const c = this.mitteSchirmCache;
    if (c && c.bild === this.bildNr && c.stand === this.hautStand) return c.xy;
    const { stuecke } = this.mitteStuecke();
    const xy = new Float64Array(stuecke.length);
    const o = [0, 0, 0];
    for (let i = 0; i < stuecke.length; i += 3) {
      this.auf(stuecke[i]!, stuecke[i + 1]!, stuecke[i + 2]!, o, 0);
      xy[i] = o[0]!;
      xy[i + 1] = o[1]!;
      xy[i + 2] = o[2]!;
    }
    this.mitteSchirmCache = { bild: this.bildNr, stand: this.hautStand, xy };
    return xy;
  }

  /** nächster sichtbarer Punkt der Mitte zum Bildschirmpunkt, höchstens `r` entfernt (Bildschirmpunkte) */
  private mitteNahe(sx: number, sy: number, r: number): { p: V3; sx: number; sy: number } | null {
    const { stuecke } = this.mitteStuecke();
    const S = this.mitteSchirm();
    let best: { p: V3; sx: number; sy: number; d: number } | null = null;
    for (let i = 0; i < stuecke.length; i += 6) {
      const ax = S[i]!;
      const ay = S[i + 1]!;
      const vx = S[i + 3]! - ax;
      const vy = S[i + 4]! - ay;
      if (Math.min(ax, ax + vx) > sx + r || Math.max(ax, ax + vx) < sx - r || Math.min(ay, ay + vy) > sy + r || Math.max(ay, ay + vy) < sy - r) continue;
      const l2 = vx * vx + vy * vy;
      const f = l2 > 0 ? Math.min(1, Math.max(0, ((sx - ax) * vx + (sy - ay) * vy) / l2)) : 0;
      const qx = ax + vx * f;
      const qy = ay + vy * f;
      const d = Math.hypot(qx - sx, qy - sy);
      if (d < r && (!best || d < best.d)) {
        const A = v3(stuecke[i]!, stuecke[i + 1]!, stuecke[i + 2]!);
        const B = v3(stuecke[i + 3]!, stuecke[i + 4]!, stuecke[i + 5]!);
        best = { p: plus3(A, mal3(minus3(B, A), f)), sx: qx, sy: qy, d };
      }
    }
    if (!best) return null;
    // sichtbar: Der Strahl dorthin trifft die Haut dort, nicht davor
    const h = this.strahlTreffer(best.sx, best.sy);
    if (!h || laenge3(minus3(h.p, best.p)) > this.radius * 0.03) return null;
    return best;
  }

  /** Ort auf der Haut unter dem Bildschirmpunkt; nahe der Mitte rastet er auf ihr ein */
  private ortAufHaut(sx: number, sy: number): { p: V3; n: V3; mitte: boolean; sx: number; sy: number } | null {
    const m = this.mitteNahe(sx, sy, this.fangMitte);
    if (m) return { p: v3(m.p.x, m.p.y, 0), n: this.aufHaut(m.p).n, mitte: true, sx: m.sx, sy: m.sy };
    const t = this.strahlTreffer(sx, sy);
    if (!t) return null;
    return { p: t.p, n: t.n, mitte: false, sx, sy };
  }

  /** so nah (Bildschirmpunkte) rastet P auf der Mitte ein */
  fangMitte = 9;

  /** ein Anker ist zu sehen: Der Strahl zu ihm trifft die Haut nicht weit vor ihm (für den Rahmen; die Anzeige misst nur am Zeiger) */
  ankerZuSehen(ai: number): boolean {
    const p = this.lage(this.anker, ai);
    const s = this.schirm(p);
    const h = this.strahlTreffer(s[0], s[1]);
    if (!h) return true;
    const t = this.schirm(h.p);
    return s[2] <= t[2] + this.bias();
  }

  ortFrei(x: number, y: number): { x: number; y: number; mitte: boolean } | null {
    const o = this.ortAufHaut(x, y);
    return o ? { x: o.sx, y: o.sy, mitte: o.mitte } : null;
  }

  /** Punktreihe der Mitte nahe am Zeiger (nur, was zum Betrachter zeigt): je Punkt x, y, Tiefe, Gewicht */
  mittePunkte(sx: number, sy: number, r: number): number[] {
    const { stuecke, normalen } = this.mitteStuecke();
    const S = this.mitteSchirm();
    const aus: number[] = [];
    const auge = this.kamera.auge;
    for (let i = 0, j = 0; i < stuecke.length; i += 6, j += 3) {
      const qx = (S[i]! + S[i + 3]!) / 2;
      const qy = (S[i + 1]! + S[i + 4]!) / 2;
      const d = Math.hypot(qx - sx, qy - sy);
      if (d >= r) continue;
      const M = v3((stuecke[i]! + stuecke[i + 3]!) / 2, (stuecke[i + 1]! + stuecke[i + 4]!) / 2, 0);
      const n = v3(normalen[j]!, normalen[j + 1]!, normalen[j + 2]!);
      if (punkt3(n, minus3(auge, M)) <= 0) continue;
      aus.push(qx, qy, (S[i + 2]! + S[i + 5]!) / 2, 1 - d / r);
    }
    return aus;
  }

  /** ein Griff aus einem Vektor auf dem Bildschirm (vom Anker aus): in der Ebene der Haut am Anker, wohin der Zeiger zeigt */
  private griffVektor(A: V3, v: V2): V3 {
    if (Math.hypot(v[0], v[1]) < 1e-9) return v3(0, 0, 0);
    const n = this.aufHaut(A).n;
    const s = this.schirm(A);
    const { o, d } = this.strahl(s[0] + v[0], s[1] + v[1]);
    const nenner = punkt3(d, n);
    if (Math.abs(nenner) > 0.15) {
      const t = punkt3(minus3(A, o), n) / nenner;
      if (t > 0) return minus3(plus3(o, mal3(d, t)), A);
    }
    // fast von der Kante gesehen: auf dem Bildschirm verschoben, in die Ebene gelegt
    const k = this.kamera;
    const mpp = (2 * s[2] * Math.tan(this.fov / 2)) / this.h;
    const D = mal3(minus3(mal3(k.rechts, v[0]), mal3(k.oben, v[1])), mpp);
    return minus3(D, mal3(n, punkt3(D, n)));
  }

  /** die Kurve eines Stücks auf der Haut (Enden bleiben die Anker), bei gleichen Parametern */
  private aufHautLegen(k: readonly V3[], n: number): Float64Array {
    const aus = new Float64Array((n + 1) * 3);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      let q = v3(0, 0, 0);
      for (let j = 0; j < 4; j++) q = plus3(q, mal3(k[j]!, b[j]!));
      if (i > 0 && i < n) q = this.aufHaut(q).p;
      aus[i * 3] = q.x;
      aus[i * 3 + 1] = q.y;
      aus[i * 3 + 2] = q.z;
    }
    return aus;
  }

  private stueckAufHaut(st: Stueck3): Float64Array {
    const k = this.kontrolle(st);
    const schluessel = `${this.hautStand}|${k.map((p) => `${p.x},${p.y},${p.z}`).join('|')}`;
    const c = this.aufgelegt.get(st);
    if (c && c.schluessel === schluessel) return c.p;
    const p = this.aufHautLegen(k, 32);
    this.aufgelegt.set(st, { schluessel, p });
    return p;
  }

  // ---------- Werkzeug P wie in Illustrator (im Raum: auf der Haut, spiegelgleich) ----------

  private ent: Entwurf3 | null = null;
  private entStapel: { stand: Stand3; ent: Entwurf3 }[] = [];
  private entVorher: Stand3 | null = null;

  private ankerNeu(p: V3, sichtbar = true): number {
    const i = this.ankerSichtbar.length;
    this.anker = anhaengen(this.anker, p);
    const s = new Uint8Array(i + 1);
    s.set(this.ankerSichtbar);
    s[i] = sichtbar ? 1 : 0;
    this.ankerSichtbar = s;
    return i;
  }

  private griffNeu(p: V3): number {
    this.griffe = anhaengen(this.griffe, p);
    return this.griffe.length / 3 - 1;
  }

  private aufMitte(ai: number): boolean {
    return Math.abs(this.anker[ai * 3 + 2]!) < this.radius * 1e-5;
  }

  /** Spiegelbild eines Ankers (auf der Mitte: er selbst); fehlt es, entsteht es */
  private spiegelAnker(ai: number): number {
    if (this.aufMitte(ai)) return ai;
    const p = this.lage(this.anker, ai);
    const eps = this.radius * 1e-5;
    const A = this.anker;
    for (let j = 0; j < A.length / 3; j++) {
      if (j !== ai && Math.abs(A[j * 3]! - p.x) < eps && Math.abs(A[j * 3 + 1]! - p.y) < eps && Math.abs(A[j * 3 + 2]! + p.z) < eps) return j;
    }
    return this.ankerNeu(spiegel3(p), !!this.ankerSichtbar[ai]);
  }

  private entKopie(e: Entwurf3): Entwurf3 {
    return { ...e, aus: { ...e.aus }, einErster: { ...e.einErster } };
  }

  entwurf(): EntwurfInfo | null {
    const e = this.ent;
    if (!e) return null;
    const vek = (ai: number, v: V3): V2 => {
      const A = this.lage(this.anker, ai);
      const a = this.schirm(A);
      const b = this.schirm(plus3(A, v));
      return [b[0] - a[0], b[1] - a[1]];
    };
    return { li: e.li, zwilling: e.zw, erster: e.erster, letzter: e.letzter, anzahl: e.anzahl, haengt: e.haengt, aus: vek(e.letzter, e.aus), einErster: vek(e.erster, e.einErster) };
  }

  /** einen Punkt auf eine Linie setzen, ohne eigenen Schritt fürs Zurück */
  private einsetzenStill(li: number, si: number, t: number): number {
    const zw = this.zwilling(li, si);
    const pi = this.teilen(li, si, t);
    if (zw) this.teilen(zw.li, zw.li === li && zw.si > si ? zw.si + 1 : zw.si, zw.rueckwaerts ? 1 - t : t);
    this.geaendert = true;
    return pi;
  }

  beginnen(o: StiftOrt): number | null {
    let a: number;
    let mitte = false;
    if (o.art === 'frei') {
      const t = this.ortAufHaut(o.x, o.y);
      if (!t) return null;
      this.standMerken();
      this.entVorher = this.standKopie();
      a = t.mitte ? this.ankerNeu(t.p) : this.ankerNeu(t.p);
      if (!t.mitte) this.spiegelAnker(a);
      mitte = t.mitte;
    } else if (o.art === 'punkt') {
      this.standMerken();
      this.entVorher = this.standKopie();
      a = o.pi;
      mitte = this.aufMitte(a);
    } else {
      this.standMerken();
      a = this.einsetzenStill(o.li, o.si, o.t);
      this.entVorher = this.standKopie();
      mitte = this.aufMitte(a);
    }
    this.ent = { li: -1, zw: -1, erster: a, letzter: a, anzahl: 1, haengt: o.art !== 'frei' || mitte, mitteAnfang: mitte, aus: v3(0, 0, 0), einErster: v3(0, 0, 0), knickErster: true, start: o.art };
    this.entStapel = [];
    return a;
  }

  weiter(o: StiftOrt): number | null {
    const e = this.ent;
    if (!e) return null;
    const vorher = { stand: this.standKopie(), ent: this.entKopie(e) };
    let p: number;
    if (o.art === 'frei') {
      const t = this.ortAufHaut(o.x, o.y);
      if (!t) return null;
      p = this.ankerNeu(t.p);
      if (!t.mitte) this.spiegelAnker(p);
    } else if (o.art === 'punkt') p = o.pi;
    else p = this.einsetzenStill(o.li, o.si, o.t);
    this.entStapel.push(vorher);
    const A = this.lage(this.anker, e.letzter);
    const B = this.lage(this.anker, p);
    const st: Stueck3 = { a: e.letzter, b: p, g1: this.griffNeu(plus3(A, e.aus)), g2: this.griffNeu(B), kante: false };
    const stS: Stueck3 = {
      a: this.spiegelAnker(e.letzter),
      b: this.spiegelAnker(p),
      g1: this.griffNeu(spiegel3(plus3(A, e.aus))),
      g2: this.griffNeu(spiegel3(B)),
      kante: false,
    };
    if (e.li < 0) {
      const l: Linie3 = { zu: false, anker: [], stuecke: [st], aufHaut: true };
      const z: Linie3 = { zu: false, anker: [], stuecke: [stS], aufHaut: true };
      l.anker = ankerVon(l);
      z.anker = ankerVon(z);
      this.linien.push(l, z);
      this.knick.push([e.knickErster, true], [e.knickErster, true]);
      e.li = this.linien.length - 2;
      e.zw = this.linien.length - 1;
    } else {
      for (const [li, s] of [
        [e.li, st],
        [e.zw, stS],
      ] as const) {
        const l = this.linien[li]!;
        l.stuecke.push(s);
        l.anker = ankerVon(l);
        this.knick[li]!.push(true);
      }
    }
    e.letzter = p;
    e.anzahl++;
    e.aus = v3(0, 0, 0);
    this.geaendert = true;
    return p;
  }

  /** Griff `g` (Nummer) auf die Lage p, und sein Spiegelbild in der Spiegellinie */
  private griffMitSpiegel(li: number, zw: number, si: number, ende: 'g1' | 'g2', p: V3): void {
    const st = this.linien[li]?.stuecke[si];
    const sp = this.linien[zw]?.stuecke[si];
    if (st) this.griffSetzen(st[ende], p);
    if (sp) this.griffSetzen(sp[ende], spiegel3(p));
  }

  griffeLetzter(aus: V2 | null, ein: V2 | null): void {
    const e = this.ent;
    if (!e) return;
    const A = this.lage(this.anker, e.letzter);
    if (aus) e.aus = this.griffVektor(A, aus);
    if (ein) {
      const v = this.griffVektor(A, ein);
      if (e.li < 0 || e.anzahl === 1) e.einErster = v;
      else this.griffMitSpiegel(e.li, e.zw, this.linien[e.li]!.stuecke.length - 1, 'g2', plus3(A, v));
    }
  }

  griffeErster(aus: V2 | null, ein: V2 | null): void {
    const e = this.ent;
    if (!e) return;
    const A = this.lage(this.anker, e.erster);
    if (aus) {
      const v = this.griffVektor(A, aus);
      if (e.li >= 0) this.griffMitSpiegel(e.li, e.zw, 0, 'g1', plus3(A, v));
      else e.aus = v;
    }
    if (ein) {
      e.einErster = this.griffVektor(A, ein);
      const l = e.li >= 0 ? this.linien[e.li] : undefined;
      if (l?.zu) this.griffMitSpiegel(e.li, e.zw, l.stuecke.length - 1, 'g2', plus3(A, e.einErster));
    }
  }

  knickSetzen(erster: boolean, an: boolean): void {
    const e = this.ent;
    if (!e) return;
    if (erster && e.li < 0) {
      e.knickErster = an;
      return;
    }
    for (const li of [e.li, e.zw]) {
      const k = this.knick[li];
      const l = this.linien[li];
      if (k && l) k[erster ? 0 : l.anker.length - 1] = an;
    }
  }

  letztenVerschieben(x: number, y: number): void {
    const e = this.ent;
    if (!e) return;
    const t = this.ortAufHaut(x, y);
    if (!t) return;
    const alt = this.lage(this.anker, e.letzter);
    const d = minus3(t.p, alt);
    const setzeAnker = (ai: number, p: V3): void => {
      this.anker[ai * 3] = p.x;
      this.anker[ai * 3 + 1] = p.y;
      this.anker[ai * 3 + 2] = p.z;
    };
    const sp = this.spiegelAnker(e.letzter);
    setzeAnker(e.letzter, t.p);
    if (sp !== e.letzter) setzeAnker(sp, spiegel3(t.p));
    if (e.li >= 0 && e.anzahl > 1) {
      const si = this.linien[e.li]!.stuecke.length - 1;
      const g = this.lage(this.griffe, this.linien[e.li]!.stuecke[si]!.g2);
      this.griffMitSpiegel(e.li, e.zw, si, 'g2', plus3(g, d));
    }
  }

  schliessen(): void {
    const e = this.ent;
    if (!e || e.li < 0) return;
    const A = this.lage(this.anker, e.letzter);
    const P0 = this.lage(this.anker, e.erster);
    const st: Stueck3 = { a: e.letzter, b: e.erster, g1: this.griffNeu(plus3(A, e.aus)), g2: this.griffNeu(plus3(P0, e.einErster)), kante: false };
    const stS: Stueck3 = {
      a: this.spiegelAnker(e.letzter),
      b: this.spiegelAnker(e.erster),
      g1: this.griffNeu(spiegel3(plus3(A, e.aus))),
      g2: this.griffNeu(spiegel3(plus3(P0, e.einErster))),
      kante: false,
    };
    for (const [li, s] of [
      [e.li, st],
      [e.zw, stS],
    ] as const) {
      const l = this.linien[li]!;
      l.stuecke.push(s);
      l.zu = true;
      l.anker = ankerVon(l);
    }
    e.aus = v3(0, 0, 0);
    this.geaendert = true;
  }

  fertig(): number {
    const e = this.ent;
    this.ent = null;
    this.entStapel = [];
    this.entVorher = null;
    if (!e || e.li < 0) return -1;
    // wo die neue Linie andere kreuzt, teilen beide einen Punkt (spiegelgleich); eine nach der anderen, jede frisch gesucht
    for (let runde = 0; runde < 60; runde++) {
      const k = this.kreuzungFinden(e.li, [e.zw]);
      if (!k) break;
      this.kreuzungTeilen(e.li, e.zw, k);
    }
    const l = this.linien[e.li]!;
    const z = this.linien[e.zw]!;
    const ende = l.stuecke[l.stuecke.length - 1]!.b;
    if (!l.zu && e.mitteAnfang && this.aufMitte(ende)) {
      // Ring um den Körper: die Hälfte vorwärts, ihr Spiegelbild rückwärts, ein geschlossener Zug
      const rueck = z.stuecke
        .slice()
        .reverse()
        .map((s) => ({ a: s.b, b: s.a, g1: s.g2, g2: s.g1, kante: s.kante }));
      const ring: Linie3 = { zu: true, anker: [], stuecke: [...l.stuecke, ...rueck], aufHaut: true };
      ring.anker = ankerVon(ring);
      const kl = this.knick[e.li] ?? [];
      const m = l.stuecke.length;
      // Knick je Anker: der Hälfte wie gezeichnet; an der Mitte, ob die beiden Griffe in einer Flucht liegen
      const knick = ring.anker.map((ai, k) => {
        if (k > 0 && k < m) return kl[k] ?? false;
        if (k > m) return kl[2 * m - k] ?? false;
        const H = this.lage(this.anker, ai);
        const vor = ring.stuecke[(k - 1 + ring.stuecke.length) % ring.stuecke.length]!;
        const a = minus3(this.lage(this.griffe, ring.stuecke[k]!.g1), H);
        const b = minus3(this.lage(this.griffe, vor.g2), H);
        const la = laenge3(a);
        const lb = laenge3(b);
        if (la < 1e-9 || lb < 1e-9) return true;
        return -punkt3(a, b) / (la * lb) < Math.cos((10 * Math.PI) / 180);
      });
      this.linien.splice(e.zw, 1);
      this.knick.splice(e.zw, 1);
      this.linien[e.li] = ring;
      this.knick[e.li] = knick;
    }
    this.geaendert = true;
    return e.li;
  }

  abbrechen(): void {
    const e = this.ent;
    if (e && this.entVorher) {
      this.standLaden(this.entVorher);
      // ein Schritt fürs Zurück nur, wenn P einen Punkt auf eine Linie gesetzt hat
      if (e.start !== 'linie') this.schritte.pop();
    }
    this.ent = null;
    this.entStapel = [];
    this.entVorher = null;
  }

  zurueck(): boolean {
    if (!this.ent) return false;
    const s = this.entStapel.pop();
    if (!s) {
      this.abbrechen();
      return false;
    }
    this.standLaden(s.stand);
    this.ent = s.ent;
    return true;
  }

  faden(ende: FadenEnde, gEnde: V2): FadenProben | null {
    const e = this.ent;
    if (!e) return null;
    void gEnde;
    const A = this.lage(this.anker, e.letzter);
    let E: V3;
    let gE = v3(0, 0, 0);
    if (ende.art === 'schluss') {
      E = this.lage(this.anker, e.erster);
      gE = e.einErster;
    } else if (ende.art === 'punkt') E = this.lage(this.anker, ende.pi);
    else if (ende.art === 'linie') E = this.bezier3(ende.li, ende.si, ende.t);
    else {
      const t = this.ortAufHaut(ende.x, ende.y);
      if (!t) return null;
      E = t.p;
    }
    const k = [A, plus3(A, e.aus), plus3(E, gE), E];
    const p = this.aufHautLegen(k, 40);
    const proben = (spiegel: boolean): FadenProben => {
      const n = p.length / 3;
      const x = new Float32Array(n);
      const y = new Float32Array(n);
      const z = new Float32Array(n);
      const s = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const q = this.schirm(v3(p[i * 3]!, p[i * 3 + 1]!, spiegel ? -p[i * 3 + 2]! : p[i * 3 + 2]!));
        x[i] = q[0];
        y[i] = q[1];
        z[i] = q[2];
        if (i) s[i] = s[i - 1]! + Math.hypot(x[i]! - x[i - 1]!, y[i]! - y[i - 1]!);
      }
      return { n, x, y, z, s, laenge: s[n - 1]! };
    };
    const F = proben(false);
    F.spiegel = proben(true);
    F.welt = p;
    return F;
  }

  // ---------- Kreuzungen im Raum ----------

  /** Proben eines Stücks so, wie es gezeigt wird (mit P gezeichnet: auf der Haut), bei gleichen Parametern */
  private stueckProben(l: Linie3, st: Stueck3): Float64Array {
    if (l.aufHaut) return this.stueckAufHaut(st);
    const k = this.kontrolle(st);
    const n = 24;
    const aus = new Float64Array((n + 1) * 3);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      for (let c = 0; c < 3; c++) {
        const ach = c === 0 ? 'x' : c === 1 ? 'y' : 'z';
        aus[i * 3 + c] = b[0]! * k[0]![ach] + b[1]! * k[1]![ach] + b[2]! * k[2]![ach] + b[3]! * k[3]![ach];
      }
    }
    return aus;
  }

  /**
   * Erste Kreuzung der Linie li (ohne die Linien in `ohne`) mit einer anderen, auf der Haut gesucht: Stücke, die sich näher als
   * 3 % des Radius kommen, deren Haut in dieselbe Richtung zeigt (nicht über eine dünne Stelle hinweg) und die sich in der Ebene der
   * Haut dort schneiden; genau mit Newton in dieser Ebene. Kreuzungen an den Enden eines Stücks zählen nicht (dort hängt es schon).
   */
  kreuzungFinden(li: number, ohne: readonly number[]): { si: number; t: number; lj: number; sj: number; u: number } | null {
    const l = this.linien[li];
    if (!l) return null;
    const tol = this.radius * 0.03;
    const rand = this.radius * 0.006;
    const box = (P: Float64Array): number[] => {
      const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let i = 0; i < P.length; i += 3)
        for (let c = 0; c < 3; c++) {
          b[c] = Math.min(b[c]!, P[i + c]!);
          b[c + 3] = Math.max(b[c + 3]!, P[i + c]!);
        }
      return b;
    };
    const ueber = (a: number[], b: number[]): boolean => a[0]! - tol <= b[3]! && b[0]! - tol <= a[3]! && a[1]! - tol <= b[4]! && b[1]! - tol <= a[4]! && a[2]! - tol <= b[5]! && b[2]! - tol <= a[5]!;
    const andere: { lj: number; sj: number; Q: Float64Array; b: number[] }[] = [];
    this.linien.forEach((L, lj) => {
      if (lj === li || ohne.includes(lj)) return;
      L.stuecke.forEach((st, sj) => {
        const Q = this.stueckProben(L, st);
        andere.push({ lj, sj, Q, b: box(Q) });
      });
    });
    const lage = (P: Float64Array, i: number): V3 => v3(P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!);
    for (let si = 0; si < l.stuecke.length; si++) {
      const st = l.stuecke[si]!;
      const D = this.stueckProben(l, st);
      const bD = box(D);
      const nD = D.length / 3 - 1;
      const kA = this.kontrolle(st);
      const A0 = this.lage(this.anker, st.a);
      const A1 = this.lage(this.anker, st.b);
      for (const o of andere) {
        if (!ueber(bD, o.b)) continue;
        const nQ = o.Q.length / 3 - 1;
        for (let i = 0; i < nD; i++) {
          const p0 = lage(D, i);
          const p1 = lage(D, i + 1);
          for (let j = 0; j < nQ; j++) {
            const q0 = lage(o.Q, j);
            const q1 = lage(o.Q, j + 1);
            if (Math.min(p0.x, p1.x) - tol > Math.max(q0.x, q1.x) || Math.min(q0.x, q1.x) - tol > Math.max(p0.x, p1.x)) continue;
            if (Math.min(p0.y, p1.y) - tol > Math.max(q0.y, q1.y) || Math.min(q0.y, q1.y) - tol > Math.max(p0.y, p1.y)) continue;
            if (Math.min(p0.z, p1.z) - tol > Math.max(q0.z, q1.z) || Math.min(q0.z, q1.z) - tol > Math.max(p0.z, p1.z)) continue;
            // Ebene der Haut am Stück der neuen Linie
            const mitte = mal3(plus3(p0, p1), 0.5);
            const n = this.aufHaut(mitte).n;
            let e1 = minus3(p1, p0);
            e1 = minus3(e1, mal3(n, punkt3(e1, n)));
            if (laenge3(e1) < 1e-12) continue;
            e1 = einheit3(e1);
            const e2 = kreuz3(n, e1);
            const pr = (p: V3): [number, number] => [punkt3(p, e1), punkt3(p, e2)];
            const [ax, ay] = pr(p0);
            const [bx, by] = pr(p1);
            const [cx, cy] = pr(q0);
            const [dx, dy] = pr(q1);
            const ux = bx - ax;
            const uy = by - ay;
            const vx = dx - cx;
            const vy = dy - cy;
            const det = ux * vy - uy * vx;
            if (Math.abs(det) < 1e-12) continue;
            const a = ((cx - ax) * vy - (cy - ay) * vx) / det;
            const b = ((cx - ax) * uy - (cy - ay) * ux) / det;
            if (a < 0 || a >= 1 || b < 0 || b >= 1) continue;
            const pa = plus3(p0, mal3(minus3(p1, p0), a));
            const qb = plus3(q0, mal3(minus3(q1, q0), b));
            if (laenge3(minus3(pa, qb)) > tol) continue;
            // nicht über eine dünne Stelle: die Haut am anderen Stück zeigt dorthin, wohin sie hier zeigt
            if (punkt3(this.aufHaut(qb).n, n) < 0.3) continue;
            let t = (i + a) / nD;
            let u = (j + b) / nQ;
            // genau: Newton auf beiden Kurven in der Ebene der Haut
            const kB = this.kontrolle(this.linien[o.lj]!.stuecke[o.sj]!);
            const bez = (k: V3[], s: number): V3 => {
              const w = 1 - s;
              return plus3(plus3(mal3(k[0]!, w * w * w), mal3(k[1]!, 3 * w * w * s)), plus3(mal3(k[2]!, 3 * w * s * s), mal3(k[3]!, s * s * s)));
            };
            const abl = (k: V3[], s: number): V3 => {
              const w = 1 - s;
              return plus3(plus3(mal3(minus3(k[1]!, k[0]!), 3 * w * w), mal3(minus3(k[2]!, k[1]!), 6 * w * s)), mal3(minus3(k[3]!, k[2]!), 3 * s * s));
            };
            for (let it = 0; it < 12; it++) {
              const F = minus3(bez(kA, t), bez(kB, u));
              const f1 = punkt3(F, e1);
              const f2 = punkt3(F, e2);
              if (f1 * f1 + f2 * f2 < 1e-18 * this.radius * this.radius) break;
              const d1 = abl(kA, t);
              const d2 = abl(kB, u);
              const j11 = punkt3(d1, e1);
              const j12 = -punkt3(d2, e1);
              const j21 = punkt3(d1, e2);
              const j22 = -punkt3(d2, e2);
              const dj = j11 * j22 - j12 * j21;
              if (Math.abs(dj) < 1e-12) break;
              t = Math.min(1, Math.max(0, t - (f1 * j22 - j12 * f2) / dj));
              u = Math.min(1, Math.max(0, u - (j11 * f2 - j21 * f1) / dj));
            }
            const Q = bez(kB, u);
            if (laenge3(minus3(Q, A0)) < rand || laenge3(minus3(Q, A1)) < rand) continue;
            if (laenge3(minus3(bez(kA, t), pa)) > tol * 3) continue;
            return { si, t, lj: o.lj, sj: o.sj, u };
          }
        }
      }
    }
    return null;
  }

  /** ein Anker einer Linie wird ein anderer (der gemeinsame der Kreuzung); seine Griffe gehen um den Unterschied mit */
  private ankerErsetzen(li: number, alt: number, neu: number): void {
    const l = this.linien[li];
    if (!l || alt === neu) return;
    const d = minus3(this.lage(this.anker, neu), this.lage(this.anker, alt));
    for (const st of l.stuecke) {
      if (st.a === alt) {
        st.a = neu;
        this.griffSetzen(st.g1, plus3(this.lage(this.griffe, st.g1), d));
      }
      if (st.b === alt) {
        st.b = neu;
        this.griffSetzen(st.g2, plus3(this.lage(this.griffe, st.g2), d));
      }
    }
    l.anker = ankerVon(l);
    this.ankerSichtbar[alt] = 0;
  }

  /**
   * Eine Kreuzung einsetzen (wie im Editor ein gemeinsamer Punkt): auf der gekreuzten Linie ein Punkt (oder einer, der schon fast dort
   * liegt), ebenso auf ihrem Spiegelbild; die neue Linie und ihr Spiegelbild werden dort geteilt und teilen diese Punkte.
   */
  private kreuzungTeilen(li: number, zw: number, k: { si: number; t: number; lj: number; sj: number; u: number }): void {
    const Lj = this.linien[k.lj]!;
    const Q = this.bezier3(k.lj, k.sj, k.u);
    const nahe = this.radius * 0.006;
    let q = Lj.anker.find((a) => this.ankerSichtbar[a] && laenge3(minus3(this.lage(this.anker, a), Q)) < nahe) ?? -1;
    let qS: number;
    if (q < 0) {
      const sp = this.zwilling(k.lj, k.sj);
      q = this.teilen(k.lj, k.sj, k.u);
      if (sp) qS = this.teilen(sp.li, sp.li === k.lj && sp.si > k.sj ? sp.si + 1 : sp.si, sp.rueckwaerts ? 1 - k.u : k.u);
      else qS = q;
    } else qS = this.spiegelAnker(q);
    const m = this.teilen(li, k.si, k.t);
    this.ankerErsetzen(li, m, q);
    if (zw >= 0) {
      const mS = this.teilen(zw, k.si, k.t);
      this.ankerErsetzen(zw, mS, qS);
    }
  }

  // ---------- Auswahl im Raum ----------

  private mehrZug: {
    zentren: V3[];
    fest: Set<number>;
    seite: number;
    rechts: V3;
    oben: V3;
    massProPunkt: number;
    haut0: Float32Array;
    anker0: Float64Array;
    griffe0: Float64Array;
  } | null = null;

  punkteZiehenBeginnen(pis: number[]): void {
    if (!pis.length) return;
    this.standMerken();
    const v = this.ansicht;
    const p0 = this.lage(this.anker, pis[0]!);
    const tiefe = -(v[2]! * p0.x + v[6]! * p0.y + v[10]! * p0.z + v[14]!);
    const fest = new Set<number>();
    for (const p of pis) {
      fest.add(p);
      fest.add(this.spiegelAnker(p));
    }
    this.mehrZug = {
      zentren: pis.map((p) => {
        const q = this.lage(this.anker, p);
        return v3(q.x, q.y, Math.abs(q.z));
      }),
      fest,
      seite: p0.z < 0 ? -1 : 1,
      rechts: { x: v[0]!, y: v[4]!, z: v[8]! },
      oben: { x: v[1]!, y: v[5]!, z: v[9]! },
      massProPunkt: (2 * tiefe * Math.tan(this.fov / 2)) / this.h,
      haut0: this.hautPos.slice(),
      anker0: this.anker.slice(),
      griffe0: this.griffe.slice(),
    };
  }

  /** alle gewählten gehen genau um den Mausweg mit (in der Bildebene, spiegelgleich), Haut und Griffe mit weichem Feld um jeden */
  punkteZiehen(dx: number, dy: number): void {
    const zg = this.mehrZug;
    if (!zg) return;
    const k = zg.massProPunkt;
    const D = {
      x: (zg.rechts.x * dx - zg.oben.x * dy) * k,
      y: (zg.rechts.y * dx - zg.oben.y * dy) * k,
      z: (zg.rechts.z * dx - zg.oben.z * dy) * k * zg.seite,
    };
    const mitteBreite = this.radius * 0.02;
    const R = this.einfluss * this.radius;
    const gewicht = (x: number, y: number, z: number): number => {
      let w = 0;
      for (const c of zg.zentren) w = Math.max(w, glocke(Math.hypot(x - c.x, y - c.y, Math.abs(z) - c.z) / R));
      return w;
    };
    const feld = (quelle: ArrayLike<number>, ziel: Float32Array | Float64Array, festeAnker: boolean): void => {
      for (let i = 0; i < quelle.length; i += 3) {
        const x = quelle[i]!;
        const y = quelle[i + 1]!;
        const z = quelle[i + 2]!;
        const w = festeAnker && zg.fest.has(i / 3) ? 1 : gewicht(x, y, z);
        const vz = z >= 0 ? 1 : -1;
        const aufMitte = Math.abs(z) < this.radius * 1e-5;
        ziel[i] = x + D.x * w;
        ziel[i + 1] = y + D.y * w;
        ziel[i + 2] = aufMitte ? z : z + D.z * w * vz * glatt(0, mitteBreite, Math.abs(z));
      }
    };
    feld(zg.haut0, this.hautPos, false);
    feld(zg.anker0, this.anker, true);
    feld(zg.griffe0, this.griffe, false);
    this.anzeigeRechnen();
    this.geaendert = true;
  }

  punkteZiehenEnden(): void {
    this.mehrZug = null;
  }

  /** Punkte löschen (mit ihren Spiegelbildern): Die Linie läuft durch die Nachbarn weiter, so nah am alten Verlauf wie möglich */
  punkteLoeschen(pis: number[]): boolean {
    if (!pis.length) return false;
    this.standMerken();
    const weg = new Set<number>();
    for (const p of pis) {
      weg.add(p);
      weg.add(this.spiegelAnker(p));
    }
    const linien: Linie3[] = [];
    const knicke: boolean[][] = [];
    this.linien.forEach((l, li) => {
      const an = ankerVon(l);
      const np = an.length;
      const raus = an.map((a) => weg.has(a));
      const kn = this.knick[li] ?? [];
      if (!raus.some(Boolean)) {
        linien.push(l);
        knicke.push(kn);
        return;
      }
      if (raus.filter((r) => !r).length < 2) return;
      const neu: Linie3 = { zu: l.zu, anker: [], stuecke: [], ...(l.aufHaut ? { aufHaut: true } : {}) };
      const nk: boolean[] = [];
      const m = l.stuecke.length;
      const zusammen = (i: number, j: number): Stueck3 => {
        const pts: V3[] = [];
        for (let q = i; q < j; q++) {
          const k = this.kontrolle(l.stuecke[q % m]!);
          for (let r = q === i ? 0 : 1; r <= 16; r++) {
            const t = r / 16;
            const u = 1 - t;
            const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
            let p = v3(0, 0, 0);
            for (let c = 0; c < 4; c++) p = plus3(p, mal3(k[c]!, b[c]!));
            pts.push(p);
          }
        }
        const erstes = l.stuecke[i % m]!;
        const letztes = l.stuecke[(j - 1) % m]!;
        const A = pts[0]!;
        const B = pts[pts.length - 1]!;
        let tA = minus3(this.lage(this.griffe, erstes.g1), A);
        if (laenge3(tA) < 1e-9) tA = minus3(pts[1]!, A);
        let tB = minus3(this.lage(this.griffe, letztes.g2), B);
        if (laenge3(tB) < 1e-9) tB = minus3(pts[pts.length - 2]!, B);
        tA = einheit3(tA);
        tB = einheit3(tB);
        const [a, b] = stueckAnpassen3(pts, tA, tB);
        return { a: erstes.a, b: letztes.b, g1: this.griffNeu(plus3(A, mal3(tA, a))), g2: this.griffNeu(plus3(B, mal3(tB, b))), kante: erstes.kante };
      };
      if (l.zu) {
        const start = raus.indexOf(false);
        let i = start;
        do {
          let j = i + 1;
          while (raus[j % np]) j++;
          nk.push(kn[i % np] ?? false);
          neu.stuecke.push(j === i + 1 ? { ...l.stuecke[i % m]! } : zusammen(i, j));
          i = j;
        } while (i % np !== start);
      } else {
        const a = raus.indexOf(false);
        const b = raus.lastIndexOf(false);
        let i = a;
        nk.push(kn[a] ?? false);
        while (i < b) {
          let j = i + 1;
          while (raus[j]) j++;
          neu.stuecke.push(j === i + 1 ? { ...l.stuecke[i]! } : zusammen(i, j));
          nk.push(kn[j] ?? false);
          i = j;
        }
      }
      neu.anker = ankerVon(neu);
      linien.push(neu);
      knicke.push(nk);
    });
    this.linien = linien;
    this.knick = knicke;
    // Anker ohne Linie sind nicht mehr zu sehen
    const benutzt = new Set<number>();
    for (const l of linien) for (const a of l.anker) benutzt.add(a);
    const s = this.ankerSichtbar.slice();
    for (let i = 0; i < s.length; i++) if (!benutzt.has(i)) s[i] = 0;
    this.ankerSichtbar = s;
    this.geaendert = true;
    return true;
  }

  // ---------- Richtungen drehen (Konzept „Richtungen statt Griffe“) ----------

  /** Strahl vom Auge durch einen Bildschirmpunkt */
  private strahl(sx: number, sy: number): { o: V3; d: V3 } {
    const k = this.kamera;
    const nx = (2 * sx) / this.b - 1;
    const ny = 1 - (2 * sy) / this.h;
    return { o: k.auge, d: einheit3(plus3(k.vor, plus3(mal3(k.rechts, nx * k.tan * k.aspekt), mal3(k.oben, ny * k.tan)))) };
  }

  private schirm(p: V3): [number, number, number] {
    const o = [0, 0, 0];
    this.auf(p.x, p.y, p.z, o, 0);
    return [o[0]!, o[1]!, o[2]!];
  }

  /** Griffe einer Richtung (Linie li, Stelle k): ihr eigener, der ihrer Gegenseite und der Anker */
  private armGriffe(li: number, k: number, seite: Seite): { arm: number; gegen: number; anker: number } | null {
    const l = this.linien[li];
    if (!l) return null;
    const m = l.stuecke.length;
    const st = l.stuecke[k];
    const vor = l.stuecke[(k - 1 + m) % m];
    if (!st || !vor) return null;
    return seite === 'aus' ? { arm: st.g1, gegen: vor.g2, anker: st.a } : { arm: vor.g2, gegen: st.g1, anker: st.a };
  }

  /** Spiegelbild eines Griffs oder −1 (liegt er auf der Mitte, ist er sein eigenes) */
  private griffZwilling(gi: number): number {
    const p = this.lage(this.griffe, gi);
    const eps = this.radius * 1e-5;
    if (Math.abs(p.z) < eps) return -1;
    const G = this.griffe;
    for (let j = 0; j < G.length / 3; j++) {
      if (j !== gi && Math.abs(G[j * 3]! - p.x) < eps && Math.abs(G[j * 3 + 1]! - p.y) < eps && Math.abs(G[j * 3 + 2]! + p.z) < eps) return j;
    }
    return -1;
  }

  /** zu welcher Linie und Stelle ein Griff als Richtung gehört */
  private armVon(gi: number): { li: number; k: number } | null {
    for (let li = 0; li < this.linien.length; li++) {
      const l = this.linien[li]!;
      const m = l.stuecke.length;
      for (let k = 0; k < m; k++) {
        if (l.stuecke[k]!.g1 === gi) return { li, k };
        if (l.stuecke[k]!.g2 === gi) return { li, k: (k + 1) % m };
      }
    }
    return null;
  }

  private griffSetzen(gi: number, p: V3): void {
    this.griffe[gi * 3] = p.x;
    this.griffe[gi * 3 + 1] = p.y;
    this.griffe[gi * 3 + 2] = p.z;
  }

  private knickRichtung(li: number, k: number, an: boolean, zwilling: number): void {
    if (this.knick[li]) this.knick[li]![k] = an;
    const z = zwilling >= 0 ? this.armVon(zwilling) : null;
    if (z && this.knick[z.li]) this.knick[z.li]![z.k] = an;
  }

  /** Senkrechte der Haut an einem Anker: an einer Kreuzung aus den Richtungen beider Linien, sonst vom nächsten Punkt der Haut */
  private normaleBei(anker: number, li: number, d: V3): V3 {
    const H = this.lage(this.anker, anker);
    const P = this.anzeigePos;
    const N = this.hautNormal;
    let best = -1;
    let bd = Infinity;
    for (let v = 0; v < P.length / 3; v++) {
      const q = (P[v * 3]! - H.x) ** 2 + (P[v * 3 + 1]! - H.y) ** 2 + (P[v * 3 + 2]! - H.z) ** 2;
      if (q < bd) {
        bd = q;
        best = v;
      }
    }
    const haut = best >= 0 ? einheit3(v3(N[best * 3]!, N[best * 3 + 1]!, N[best * 3 + 2]!)) : v3(0, 0, 1);
    for (let lj = 0; lj < this.linien.length; lj++) {
      if (lj === li) continue;
      const st = this.linien[lj]!.stuecke.find((s) => s.a === anker);
      if (!st) continue;
      const n = kreuz3(d, minus3(this.lage(this.griffe, st.g1), H));
      if (laenge3(n) < 1e-9 * laenge3(d) * laenge3(d)) continue;
      const e = einheit3(n);
      return punkt3(e, haut) < 0 ? mal3(e, -1) : e;
    }
    return haut;
  }

  drehenBeginnen(z: RichtungZiel, kippen: boolean, hebel: number): [number, number] | null {
    const g = this.armGriffe(z.li, z.k, z.seite);
    if (!g) return null;
    const H = this.lage(this.anker, g.anker);
    const A0 = this.lage(this.griffe, g.arm);
    const d = minus3(A0, H);
    const len = laenge3(d);
    if (len < this.radius * 1e-6) return null;
    const n = this.normaleBei(g.anker, z.li, d);
    // auf der Haut: um die Senkrechte; aus der Haut (⇧): in der Ebene aus Richtung und Senkrechter
    let e1 = minus3(d, mal3(n, punkt3(d, n)));
    e1 = laenge3(e1) > 1e-9 * len ? einheit3(e1) : einheit3(kreuz3(n, v3(1, 0, 0)));
    const achse = kippen ? einheit3(kreuz3(e1, n)) : n;
    const e2 = kippen ? n : kreuz3(n, e1);
    const tiefe = this.schirm(H)[2];
    const mpp = (2 * tiefe * Math.tan(this.fov / 2)) / this.h;
    const rho0 = Math.max(len, hebel * mpp);
    const ansicht = this.ringAufSchirm(H, achse, e1, e2, rho0);
    this.standMerken();
    const P0 = this.lage(this.griffe, g.gegen);
    this.dreh = {
      z,
      H,
      A0,
      P0,
      A0start: A0,
      P0start: P0,
      rhoStart: rho0,
      armG: g.arm,
      gegenG: g.gegen,
      armZw: this.griffZwilling(g.arm),
      gegenZw: this.griffZwilling(g.gegen),
      n,
      achse,
      e1,
      e2,
      mitte: H,
      rho0,
      ...ansicht,
      kippen,
      schwenk: null,
      knick0: this.knick[z.li]?.[z.k] ?? false,
      los: false,
      partner: new Feder1(0),
      winkel: 0,
      faktor: 1,
      eingerastet: false,
    };
    return ansicht.s0;
  }

  /** wie der Ring auf dem Bildschirm liegt: fast von der Kante gesehen misst das Drehen den Winkel auf dem Bildschirm */
  private ringAufSchirm(mitte: V3, achse: V3, e1: V3, e2: V3, rho: number): { flach: boolean; hs: [number, number]; s0: [number, number]; vz: number } {
    const hs3 = this.schirm(mitte);
    const s03 = this.schirm(plus3(mitte, mal3(e1, rho)));
    const hs: [number, number] = [hs3[0], hs3[1]];
    const s0: [number, number] = [s03[0], s03[1]];
    const blickRichtung = einheit3(minus3(mitte, this.kamera.auge));
    const flach = Math.abs(punkt3(blickRichtung, achse)) < Math.sin((20 * Math.PI) / 180);
    const e = 0.05;
    const s1 = this.schirm(plus3(mitte, mal3(plus3(mal3(e1, Math.cos(e)), mal3(e2, Math.sin(e))), rho)));
    const vz = Math.sign(winkelDiff(Math.atan2(s1[1] - hs[1], s1[0] - hs[0]), Math.atan2(s0[1] - hs[1], s0[0] - hs[0]))) || 1;
    return { flach, hs, s0, vz };
  }

  /**
   * ⇧ während des Drehens (Florian, 15.11.: „dynamisch, auch wenn ich das handle schon im griff habe“): Der Ring wechselt die Ebene
   * am jetzigen Stand, ohne dass der Griff springt; er schwenkt sichtbar um die Linie des Griffs. Mit ⇧ steht er aus der Haut (Ebene
   * aus Richtung und Senkrechter); ohne ⇧ dreht der Griff um die Senkrechte der Haut und behält seine Neigung (ein Kegel).
   */
  private ebeneWechseln(kippen: boolean): void {
    const D = this.dreh;
    if (!D) return;
    const A = minus3(this.lage(this.griffe, D.armG), D.H);
    const la = laenge3(A);
    if (la < this.radius * 1e-9) return;
    const dir = einheit3(A);
    const L = D.rho0 * D.faktor;
    const S = plus3(D.H, mal3(dir, L));
    const n = D.n;
    let achse: V3;
    let e1: V3;
    let e2: V3;
    let mitte: V3;
    let rho: number;
    if (kippen) {
      // aus der Haut: die Ebene aus der Richtung des Griffs und der Senkrechten
      e1 = dir;
      let q = minus3(n, mal3(dir, punkt3(n, dir)));
      if (laenge3(q) < 1e-6) q = kreuz3(dir, v3(1, 0, 0));
      e2 = einheit3(q);
      achse = einheit3(kreuz3(e1, e2));
      mitte = D.H;
      rho = L;
    } else {
      // auf der Haut: um die Senkrechte, die Neigung bleibt (der Ring liegt auf der Höhe der Spitze)
      const quer = minus3(dir, mal3(n, punkt3(dir, n)));
      if (laenge3(quer) < 0.1) return;
      e1 = einheit3(quer);
      e2 = kreuz3(n, e1);
      achse = n;
      mitte = plus3(D.H, mal3(n, punkt3(dir, n) * L));
      rho = L * laenge3(quer);
    }
    D.schwenk = { mitte: D.mitte, e1: einheit3(minus3(S, D.mitte)), e2: kreuz3(D.achse, einheit3(minus3(S, D.mitte))), r: laenge3(minus3(S, D.mitte)), f: new Feder1(0) };
    D.schwenk.f.ziel = 1;
    const knick = D.knick0 || D.los;
    D.A0 = plus3(D.H, A);
    // rund dreht die Gegenseite mit (vom jetzigen Stand aus); geknickt steht sie, wo sie beim Drücken stand
    D.P0 = knick ? D.P0start : this.lage(this.griffe, D.gegenG);
    D.partner.setzen(0);
    D.achse = achse;
    D.e1 = e1;
    D.e2 = e2;
    D.mitte = mitte;
    D.rho0 = rho;
    D.winkel = 0;
    D.faktor = 1;
    D.kippen = kippen;
    Object.assign(D, this.ringAufSchirm(mitte, achse, e1, e2, rho));
  }

  drehenZiehen(cx: number, cy: number, alt: boolean, dt: number, kippen?: boolean): void {
    const D = this.dreh;
    if (!D) return;
    if (kippen !== undefined && kippen !== D.kippen) this.ebeneWechseln(kippen);
    if (D.schwenk) {
      D.schwenk.f.schritt(dt, 5, 0.9);
      if (D.schwenk.f.ruhig(0.002)) D.schwenk = null;
    }
    let phi: number;
    let r: number;
    if (!D.flach) {
      // der Zeiger auf der Ebene des Rings: Die Richtung zeigt genau auf ihn
      const { o, d } = this.strahl(cx, cy);
      const nenner = punkt3(d, D.achse);
      if (Math.abs(nenner) < 1e-9) return;
      const v = minus3(plus3(o, mal3(d, punkt3(minus3(D.mitte, o), D.achse) / nenner)), D.mitte);
      phi = Math.atan2(punkt3(v, D.e2), punkt3(v, D.e1));
      r = Math.hypot(punkt3(v, D.e1), punkt3(v, D.e2));
    } else {
      const a = winkelDiff(Math.atan2(cy - D.hs[1], cx - D.hs[0]), Math.atan2(D.s0[1] - D.hs[1], D.s0[0] - D.hs[0]));
      phi = a * D.vz;
      r = (D.rho0 * Math.hypot(cx - D.hs[0], cy - D.hs[1])) / (Math.hypot(D.s0[0] - D.hs[0], D.s0[1] - D.hs[1]) || 1);
    }
    D.winkel = phi;
    D.faktor = schwungFaktor(r / D.rho0);
    if (alt && !D.knick0) D.los = true;
    const knick = D.knick0 || D.los;
    if (knick) {
      D.partner.ziel = 0;
      D.partner.schritt(dt, 7, 0.75);
    } else D.partner.setzen(phi);
    let A = mal3(drehe3(minus3(D.A0, D.H), D.achse, phi), D.faktor);
    const Pv = drehe3(minus3(D.P0, D.H), D.achse, D.partner.x);
    D.eingerastet = false;
    if (knick && !alt) {
      const c = -punkt3(einheit3(A), einheit3(Pv));
      if (Math.acos(Math.min(1, Math.max(-1, c))) < RASTEN) {
        A = mal3(einheit3(Pv), -laenge3(A));
        D.eingerastet = true;
      }
    }
    const An = plus3(D.H, A);
    const Pn = plus3(D.H, Pv);
    this.griffSetzen(D.armG, An);
    this.griffSetzen(D.gegenG, Pn);
    // spiegelgleich; am Spiegelpunkt ist die Gegenseite das Spiegelbild der Richtung
    if (D.armZw >= 0) this.griffSetzen(D.armZw, spiegel3(An));
    if (D.gegenZw >= 0 && D.gegenZw !== D.armG) this.griffSetzen(D.gegenZw, spiegel3(Pn));
  }

  drehenEnden(): void {
    const D = this.dreh;
    if (!D) return;
    if (D.eingerastet) this.knickRichtung(D.z.li, D.z.k, false, D.armZw);
    else if (D.los) {
      this.knickRichtung(D.z.li, D.z.k, true, D.armZw);
      // die Gegenseite steht wieder, wo sie war (ihre Feder ist vielleicht noch unterwegs)
      this.griffSetzen(D.gegenG, D.P0start);
      if (D.gegenZw >= 0 && D.gegenZw !== D.armG) this.griffSetzen(D.gegenZw, spiegel3(D.P0start));
    }
    this.dreh = null;
  }

  drehBild(): DrehBild | null {
    const D = this.dreh;
    if (!D) return null;
    const R = D.rho0 * D.faktor;
    const auf = (c: number, s: number, rr: number): V3 => plus3(D.mitte, plus3(mal3(D.e1, c * rr), mal3(D.e2, s * rr)));
    const ring: number[] = [];
    const n = 120;
    // nach einem Wechsel mit ⇧ schwenkt der Ring von seiner alten Lage in die neue (Mitte, Ebene und Radius gleiten)
    const S = D.schwenk;
    const f = S ? Math.min(1, Math.max(0, S.f.x)) : 1;
    const spitzeNeu = auf(Math.cos(D.winkel), Math.sin(D.winkel), R);
    const rm = S ? plus3(S.mitte, mal3(minus3(D.mitte, S.mitte), f)) : D.mitte;
    const rr = S ? S.r + (R - S.r) * f : R;
    let u = D.e1;
    let w2 = D.e2;
    if (S) {
      // die Spitze bleibt auf dem Ring; die Ebene dreht sich um sie
      u = einheit3(minus3(spitzeNeu, rm));
      const zw = plus3(mal3(S.e2, 1 - f), mal3(kreuz3(D.achse, u), f));
      w2 = einheit3(minus3(zw, mal3(u, punkt3(zw, u))));
    }
    for (let i = 0; i <= n; i++) {
      const w = (2 * Math.PI * i) / n;
      ring.push(...this.schirm(plus3(rm, plus3(mal3(u, Math.cos(w) * rr), mal3(w2, Math.sin(w) * rr)))));
    }
    const rund = !(D.knick0 || D.los) || D.eingerastet;
    const alt = [...this.schirm(D.H), ...this.schirm(plus3(D.H, mal3(einheit3(minus3(D.A0start, D.H)), D.rhoStart)))];
    if (rund) alt.push(...this.schirm(D.H), ...this.schirm(plus3(D.H, mal3(einheit3(minus3(D.P0start, D.H)), D.rhoStart))));
    return {
      ring,
      nabe: this.schirm(D.H),
      spitze: this.schirm(auf(Math.cos(D.winkel), Math.sin(D.winkel), R)),
      alt,
      rund,
      eingerastet: D.eingerastet,
    };
  }

  knickUmschalten(z: RichtungZiel): boolean | null {
    const g = this.armGriffe(z.li, z.k, z.seite);
    if (!g) return null;
    this.standMerken();
    const war = this.knick[z.li]?.[z.k] ?? false;
    const armZw = this.griffZwilling(g.arm);
    this.knickRichtung(z.li, z.k, !war, armZw);
    this.ausr = null;
    if (!war) return false;
    // jetzt rund: die Richtung dreht sich (animiert) in die Flucht ihrer Gegenseite
    const H = this.lage(this.anker, g.anker);
    const A0 = minus3(this.lage(this.griffe, g.arm), H);
    const ziel = mal3(einheit3(minus3(this.lage(this.griffe, g.gegen), H)), -1);
    const ax = kreuz3(einheit3(A0), ziel);
    const s = laenge3(ax);
    const winkel = Math.atan2(s, punkt3(einheit3(A0), ziel));
    const achse = s > 1e-9 ? mal3(ax, 1 / s) : einheit3(kreuz3(ziel, v3(0, 0, 1)));
    this.ausr = { armG: g.arm, armZw, H, A0, achse, winkel };
    return true;
  }

  ausrichten(t: number): void {
    const a = this.ausr;
    if (!a) return;
    const p = plus3(a.H, drehe3(a.A0, a.achse, a.winkel * Math.min(1, t)));
    this.griffSetzen(a.armG, p);
    if (a.armZw >= 0) this.griffSetzen(a.armZw, spiegel3(p));
    if (t >= 1) this.ausr = null;
  }

  rueckgaengig(): boolean {
    const z = this.schritte.pop();
    if (!z) return false;
    this.mehrZug = null;
    this.hautPos.set(z.haut);
    this.anker = z.anker;
    this.griffe = z.griffe;
    this.ankerSichtbar = z.sichtbar;
    this.linien = z.linien;
    this.knick = z.knick;
    this.gesetzt = false;
    this.dreh = null;
    this.ausr = null;
    this.anzeigeRechnen();
    this.geaendert = true;
    this.zug = null;
    return true;
  }
}
