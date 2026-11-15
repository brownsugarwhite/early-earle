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
  anker: number[];
  stuecke: Stueck3[];
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
const linienKopie = (ls: readonly Linie3[]): Linie3[] => ls.map((l) => ({ zu: l.zu, anker: l.anker.slice(), stuecke: l.stuecke.map((s) => ({ ...s })) }));
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

export class Raum3D implements Raum {
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
  private zurueck: Stand3[] = [];
  /** je Linie und Stelle (Anfang des Stücks): Knick der Linie an diesem Punkt, erst aus der Form erkannt, dann von Hand */
  knick: boolean[][] = [];
  private kamera = { auge: v3(0, 0, 1), vor: v3(0, 0, -1), rechts: v3(1, 0, 0), oben: v3(0, 1, 0), tan: 0.27, aspekt: 1 };
  /** Drehen einer Richtung (siehe `richtung.ts`): Nabe, Griffe, Ebene (Achse, e1, e2), Hebel, Zustand */
  private dreh: {
    z: RichtungZiel;
    H: V3;
    A0: V3;
    P0: V3;
    armG: number;
    gegenG: number;
    armZw: number;
    gegenZw: number;
    achse: V3;
    e1: V3;
    e2: V3;
    rho0: number;
    flach: boolean;
    hs: [number, number];
    s0: [number, number];
    vz: number;
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
    this.zurueck = [];
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
          const x = b0 * K[0]! + b1 * K[3]! + b2 * K[6]! + b3 * K[9]!;
          const y = b0 * K[1]! + b1 * K[4]! + b2 * K[7]! + b3 * K[10]!;
          const z = b0 * K[2]! + b1 * K[5]! + b2 * K[8]! + b3 * K[11]!;
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

  private standMerken(): void {
    this.zurueck.push({
      haut: this.hautPos.slice(),
      anker: this.anker.slice(),
      griffe: this.griffe.slice(),
      sichtbar: this.ankerSichtbar.slice(),
      linien: linienKopie(this.linien),
      knick: this.knick.map((k) => k.slice()),
    });
    if (this.zurueck.length > 40) this.zurueck.shift();
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
    l.anker = l.stuecke.map((s) => s.a);
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

  private knickSetzen(li: number, k: number, an: boolean, zwilling: number): void {
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
    const hs3 = this.schirm(H);
    const s03 = this.schirm(plus3(H, mal3(e1, rho0)));
    const hs: [number, number] = [hs3[0], hs3[1]];
    const s0: [number, number] = [s03[0], s03[1]];
    // fast von der Kante gesehen: den Winkel auf dem Bildschirm messen (gleiche Achse, Drehsinn wie auf dem Bild)
    const blickRichtung = einheit3(minus3(H, this.kamera.auge));
    const flach = Math.abs(punkt3(blickRichtung, achse)) < Math.sin((20 * Math.PI) / 180);
    const e = 0.05;
    const s1 = this.schirm(plus3(H, mal3(plus3(mal3(e1, Math.cos(e)), mal3(e2, Math.sin(e))), rho0)));
    const vz = Math.sign(winkelDiff(Math.atan2(s1[1] - hs[1], s1[0] - hs[0]), Math.atan2(s0[1] - hs[1], s0[0] - hs[0]))) || 1;
    this.standMerken();
    this.dreh = {
      z,
      H,
      A0,
      P0: this.lage(this.griffe, g.gegen),
      armG: g.arm,
      gegenG: g.gegen,
      armZw: this.griffZwilling(g.arm),
      gegenZw: this.griffZwilling(g.gegen),
      achse,
      e1,
      e2,
      rho0,
      flach,
      hs,
      s0,
      vz,
      knick0: this.knick[z.li]?.[z.k] ?? false,
      los: false,
      partner: new Feder1(0),
      winkel: 0,
      faktor: 1,
      eingerastet: false,
    };
    return s0;
  }

  drehenZiehen(cx: number, cy: number, alt: boolean, dt: number): void {
    const D = this.dreh;
    if (!D) return;
    let phi: number;
    let r: number;
    if (!D.flach) {
      // der Zeiger auf der Ebene des Rings: Die Richtung zeigt genau auf ihn
      const { o, d } = this.strahl(cx, cy);
      const nenner = punkt3(d, D.achse);
      if (Math.abs(nenner) < 1e-9) return;
      const v = minus3(plus3(o, mal3(d, punkt3(minus3(D.H, o), D.achse) / nenner)), D.H);
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
    if (D.eingerastet) this.knickSetzen(D.z.li, D.z.k, false, D.armZw);
    else if (D.los) {
      this.knickSetzen(D.z.li, D.z.k, true, D.armZw);
      // die Gegenseite steht wieder, wo sie war (ihre Feder ist vielleicht noch unterwegs)
      this.griffSetzen(D.gegenG, D.P0);
      if (D.gegenZw >= 0 && D.gegenZw !== D.armG) this.griffSetzen(D.gegenZw, spiegel3(D.P0));
    }
    this.dreh = null;
  }

  drehBild(): DrehBild | null {
    const D = this.dreh;
    if (!D) return null;
    const R = D.rho0 * D.faktor;
    const auf = (c: number, s: number, rr: number): V3 => plus3(D.H, plus3(mal3(D.e1, c * rr), mal3(D.e2, s * rr)));
    const ring: number[] = [];
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const w = (2 * Math.PI * i) / n;
      ring.push(...this.schirm(auf(Math.cos(w), Math.sin(w), R)));
    }
    const rund = !(D.knick0 || D.los) || D.eingerastet;
    const alt = [...this.schirm(D.H), ...this.schirm(auf(1, 0, D.rho0))];
    if (rund) alt.push(...this.schirm(D.H), ...this.schirm(plus3(D.H, mal3(einheit3(minus3(D.P0, D.H)), D.rho0))));
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
    this.knickSetzen(z.li, z.k, !war, armZw);
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

  // ---------- Auswahl (vorläufig: einzeln wie bisher) ----------

  punkteZiehenBeginnen(pis: number[]): void {
    if (pis[0] !== undefined) this.ziehenBeginnen({ art: 'punkt', pi: pis[0] });
  }

  punkteZiehen(dx: number, dy: number): void {
    this.ziehen(dx, dy);
  }

  punkteZiehenEnden(): void {
    this.ziehenEnden();
  }

  punkteLoeschen(_pis: number[]): boolean {
    return false;
  }

  rueckgaengig(): boolean {
    const z = this.zurueck.pop();
    if (!z) return false;
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
