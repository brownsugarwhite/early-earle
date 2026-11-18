// VERSUCH (13.10.2026 nachmittags, Meilenstein 1b): Haken im Top als automatische Seitenteile.
//
// Florian: Kerben bzw. Haken im Top sollen gleich mit eingebaut werden, als automatische Seitenteile; er zeichnet nur den
// Top-Umriss. Die aus der Seite aufgeblasene Form reicht im Top an jeder Stelle lückenlos von der Mitte bis zur breitesten
// Stelle; ein Widerhaken neben dem Körper (Luft dazwischen) geht so nicht.
//
// 1. Erkennen: Läuft der Top-Umriss (Halbprofil von Achse zu Achse) ein Stück rückwärts (x nimmt ab), umschließt er dort
//    eine Schleife. Ist sie Stoff (gleicher Umlaufsinn wie der ganze Umriss), ist sie ein Widerhaken; sonst ist sie die
//    Kerbe (Luft) eines nach vorn zeigenden Hakens, und der Haken liegt auf der anderen Seite des Rückwärtsstücks.
// 2. Hauptkörper: Sein Top ist der Umriss ohne die Schleife; an ihrem Ansatz springt er senkrecht (Brücke). Die Kerbe
//    bleibt Luft.
// 3. Widerhaken: eigenes Teil, rund aufgeblasen aus seinem Top-Bereich (Poisson mit Wurzelprofil). Die Dicke in y kommt
//    aus Seite und Front (der Bereich, den beide an dieser Stelle zulassen) und läuft zum Rand rund aus (`aufblasen.ts`).
// 4. Ansatz: Der Haken reicht über die Brücke ein Stück in den Körper hinein. Körper und Haken werden als genaue
//    Abstandsfelder ihrer Netze weich vereinigt (glattes Minimum) und gemeinsam vernetzt (Surface Nets). Abseits des
//    Übergangs werden die Punkte auf die genauen Flächen zurückgelegt (Normalen von dort): ein Netz ohne Naht, und der
//    Körper bleibt so genau und glatt wie ohne Haken.
//
// Weltkoordinaten wie im Körper: x = hinten, y = oben, z = Front-u; das Top wird auf die Länge der Seite gestreckt.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, segmente, vollerPfad } from '../profil';
import { netzAusgeben, surfaceNets, taubin } from './schnittLoft';

export type Seitenteil = {
  /** geschlossener Umriss des Teils im Top (x Welt, z), ohne Verlängerung */
  umriss: V2[];
  /** Brücke zum Körper: senkrechte Strecke im Top bei x, von z0 bis z1; `richtung` zeigt vom Teil in den Körper (±1) */
  bruecke: { x: number; z0: number; z1: number; richtung: number };
};

export type TopZerlegung = {
  /** Top-Halbprofil des Hauptkörpers (x Welt, z ≥ 0), Schleifen durch Brücken ersetzt */
  haupt: V2[];
  teile: Seitenteil[];
};

function flaeche(p: readonly V2[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i]!;
    const r = p[(i + 1) % p.length]!;
    a += q.x * r.y - r.x * q.y;
  }
  return a / 2;
}

/** Punkt, an dem der Zug zwischen i und i+1 die Senkrechte x kreuzt. */
function kreuzung(p: readonly V2[], i: number, x: number): V2 {
  const a = p[i]!;
  const b = p[i + 1]!;
  const t = b.x !== a.x ? (x - a.x) / (b.x - a.x) : 0;
  return { x, y: a.y + t * (b.y - a.y) };
}

/**
 * Top in Hauptkörper und Seitenteile zerlegen. `pfad` = Halbprofil des Tops von Achse zu Achse (x bereits auf die Seite
 * gestreckt, y = z ≥ 0). Kleine Rückläufe (unter `mindest` in x) zählen nicht.
 */
export function topZerlegen(pfad: readonly V2[], mindest = 0.004): TopZerlegung {
  const P = pfad.slice();
  const teile: Seitenteil[] = [];
  const gesamt = flaeche([...P, { x: P[P.length - 1]!.x, y: 0 }, { x: P[0]!.x, y: 0 }]);
  let haupt = P;
  for (let runde = 0; runde < 8; runde++) {
    // erstes Rückwärtsstück: i1 = örtliches Maximum von x, i2 = folgendes Minimum
    let i1 = -1;
    let i2 = -1;
    for (let i = 1; i + 1 < haupt.length; i++) {
      if (haupt[i]!.x > haupt[i + 1]!.x && haupt[i]!.x >= haupt[i - 1]!.x) {
        let j = i;
        while (j + 1 < haupt.length && haupt[j + 1]!.x <= haupt[j]!.x) j++;
        if (haupt[i]!.x - haupt[j]!.x >= mindest) {
          i1 = i;
          i2 = j;
          break;
        }
        i = j;
      }
    }
    if (i1 < 0) break;
    const xMax = haupt[i1]!.x;
    const xMin = haupt[i2]!.x;
    // A: Widerhaken nach hinten (Schleife von der Kreuzung vor i1 bei x = xMin bis i2)
    let i0 = -1;
    for (let i = i1 - 1; i >= 0; i--) {
      if (haupt[i]!.x <= xMin && haupt[i + 1]!.x > xMin) {
        i0 = i;
        break;
      }
    }
    // B: Haken nach vorn (Schleife von i1 bis zur Kreuzung nach i2 bei x = xMax)
    let i3 = -1;
    for (let i = i2; i + 1 < haupt.length; i++) {
      if (haupt[i]!.x < xMax && haupt[i + 1]!.x >= xMax) {
        i3 = i;
        break;
      }
    }
    const kandidaten: { umriss: V2[]; haupt: V2[]; bruecke: Seitenteil['bruecke'] }[] = [];
    if (i0 >= 0) {
      const k = kreuzung(haupt, i0, xMin);
      const umriss = [k, ...haupt.slice(i0 + 1, i2 + 1)];
      kandidaten.push({
        umriss,
        haupt: [...haupt.slice(0, i0 + 1), k, ...haupt.slice(i2)],
        bruecke: { x: xMin, z0: Math.min(k.y, haupt[i2]!.y), z1: Math.max(k.y, haupt[i2]!.y), richtung: -1 },
      });
    }
    if (i3 >= 0) {
      const k = kreuzung(haupt, i3, xMax);
      const umriss = [...haupt.slice(i1, i3 + 1), k];
      kandidaten.push({
        umriss,
        haupt: [...haupt.slice(0, i1 + 1), k, ...haupt.slice(i3 + 1)],
        bruecke: { x: xMax, z0: Math.min(k.y, haupt[i1]!.y), z1: Math.max(k.y, haupt[i1]!.y), richtung: 1 },
      });
    }
    // Stoff hat denselben Umlaufsinn wie das ganze Top (Luft den umgekehrten)
    const stoff = kandidaten.filter((c) => Math.sign(flaeche(c.umriss)) === Math.sign(gesamt) && Math.abs(flaeche(c.umriss)) > 1e-7);
    if (!stoff.length) {
      // nur Luft gefunden: das Rückwärtsstück glätten, damit die Suche weitergeht
      haupt = [...haupt.slice(0, i1 + 1), ...haupt.slice(i2 + 1)];
      continue;
    }
    stoff.sort((a, b) => Math.abs(flaeche(a.umriss)) - Math.abs(flaeche(b.umriss)));
    const wahl = stoff[0]!;
    teile.push({ umriss: wahl.umriss, bruecke: wahl.bruecke });
    haupt = wahl.haupt;
  }
  return { haupt, teile };
}

/** Top-Halbprofil des Dokuments in Weltkoordinaten (x auf die Länge der Seite gestreckt). */
export function topWelt(dok: Dokument, proSegment = 48): V2[] {
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 24);
  const xMin = Math.min(...seite.map((p) => p.x));
  const xMax = Math.max(...seite.map((p) => p.x));
  const top = pfadAbtasten(segmente(dok.profile.top), proSegment);
  const tMin = Math.min(...top.map((p) => p.x));
  const tMax = Math.max(...top.map((p) => p.x));
  return top.map((p) => ({ x: xMin + ((p.x - tMin) / (tMax - tMin || 1)) * (xMax - xMin), y: Math.abs(p.y) }));
}

// ---------- Vereinigen: geschlossene Netze als Abstandsfelder, ein Netz ----------

export type Netz3 = { positionen: Float32Array; normalen: Float32Array; indizes: Uint32Array };

export type VereinigtOptionen = {
  /** Rasterabstand (Kachel) */
  h: number;
  /** Rundung des Übergangs (Kachel) */
  uebergang: number;
};

/** Nächster Punkt auf dem Dreieck (Ericson), als Schwerpunktkoordinaten (u, v, w) zu a, b, c. */
function naechsterPunkt(px: number, py: number, pz: number, P: Float32Array, a: number, b: number, c: number, aus: Float64Array): void {
  const ax = P[3 * a]!;
  const ay = P[3 * a + 1]!;
  const az = P[3 * a + 2]!;
  const abx = P[3 * b]! - ax;
  const aby = P[3 * b + 1]! - ay;
  const abz = P[3 * b + 2]! - az;
  const acx = P[3 * c]! - ax;
  const acy = P[3 * c + 1]! - ay;
  const acz = P[3 * c + 2]! - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  const setze = (u: number, v: number, w: number) => {
    aus[0] = u;
    aus[1] = v;
    aus[2] = w;
  };
  if (d1 <= 0 && d2 <= 0) return setze(1, 0, 0);
  const bpx = px - P[3 * b]!;
  const bpy = py - P[3 * b + 1]!;
  const bpz = pz - P[3 * b + 2]!;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return setze(0, 1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return setze(1 - v, v, 0);
  }
  const cpx = px - P[3 * c]!;
  const cpy = py - P[3 * c + 1]!;
  const cpz = pz - P[3 * c + 2]!;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return setze(0, 0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return setze(1 - w, 0, w);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return setze(0, 1 - w, w);
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return setze(1 - v - w, v, w);
}

/** Raster mit Abstandsfeld eines Netzes (schmales Band, außerhalb nur das Vorzeichen) und dem nächsten Dreieck je Punkt. */
class Feld {
  readonly F: Float32Array;
  /** nächstes Dreieck (Versatz in den Indizes) je Rasterpunkt im Band, sonst −1 */
  readonly tri: Int32Array;
  private readonly bw = new Float64Array(3);
  constructor(
    readonly netz: Netz3,
    private readonly g: { x0: number; y0: number; z0: number; h: number; NX: number; NY: number; NZ: number },
    band: (t: number) => number,
  ) {
    const { NX, NY, NZ, h, x0, y0, z0 } = g;
    const P = netz.positionen;
    const Nn = netz.normalen;
    const I = netz.indizes;
    const N = NX * NY * NZ;
    const F = new Float32Array(N).fill(Infinity);
    const tri = new Int32Array(N).fill(-1);
    const bw = this.bw;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t]!;
      const b = I[t + 1]!;
      const c = I[t + 2]!;
      const r = band(t / 3);
      const ax = P[3 * a]!;
      const ay = P[3 * a + 1]!;
      const az = P[3 * a + 2]!;
      const bx = P[3 * b]!;
      const by = P[3 * b + 1]!;
      const bz = P[3 * b + 2]!;
      const cx = P[3 * c]!;
      const cy = P[3 * c + 1]!;
      const cz = P[3 * c + 2]!;
      const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - r - x0) / h));
      const i1 = Math.min(NX - 1, Math.floor((Math.max(ax, bx, cx) + r - x0) / h));
      const j0 = Math.max(0, Math.ceil((Math.min(ay, by, cy) - r - y0) / h));
      const j1 = Math.min(NY - 1, Math.floor((Math.max(ay, by, cy) + r - y0) / h));
      const k0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - r - z0) / h));
      const k1 = Math.min(NZ - 1, Math.floor((Math.max(az, bz, cz) + r - z0) / h));
      // Ebene des Dreiecks: Punkte weiter als r davon können nicht im Band liegen (schneller Ausschluss)
      let ex = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
      let ey = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      let ez = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const el = Math.hypot(ex, ey, ez);
      if (el < 1e-20) continue;
      ex /= el;
      ey /= el;
      ez /= el;
      for (let i = i0; i <= i1; i++) {
        const px = x0 + i * h;
        for (let j = j0; j <= j1; j++) {
          const py = y0 + j * h;
          const o0 = (i * NY + j) * NZ;
          const ebene0 = (px - ax) * ex + (py - ay) * ey;
          for (let k = k0; k <= k1; k++) {
            const pz = z0 + k * h;
            const ebene = ebene0 + (pz - az) * ez;
            if (ebene > r || ebene < -r) continue;
            naechsterPunkt(px, py, pz, P, a, b, c, bw);
            const u = bw[0]!;
            const v = bw[1]!;
            const w = bw[2]!;
            const dx = px - (u * ax + v * bx + w * cx);
            const dy = py - (u * ay + v * by + w * cy);
            const dz = pz - (u * az + v * bz + w * cz);
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d > r) continue;
            const o = o0 + k;
            if (d >= Math.abs(F[o]!)) continue;
            // Vorzeichen über die (geglättete) Normale am nächsten Punkt
            const nx = u * Nn[3 * a]! + v * Nn[3 * b]! + w * Nn[3 * c]!;
            const ny = u * Nn[3 * a + 1]! + v * Nn[3 * b + 1]! + w * Nn[3 * c + 1]!;
            const nz = u * Nn[3 * a + 2]! + v * Nn[3 * b + 2]! + w * Nn[3 * c + 2]!;
            F[o] = dx * nx + dy * ny + dz * nz >= 0 ? d : -d;
            tri[o] = t;
          }
        }
      }
    }
    // Außerhalb des Bands: im Kasten des Netzes von dessen Rand aus als außen fluten, der Rest ist innen; außerhalb des
    // Kastens ist alles außen
    let bi0 = NX;
    let bi1 = -1;
    let bj0 = NY;
    let bj1 = -1;
    let bk0 = NZ;
    let bk1 = -1;
    for (let v = 0; v < P.length; v += 3) {
      bi0 = Math.min(bi0, Math.floor((P[v]! - x0) / h));
      bi1 = Math.max(bi1, Math.ceil((P[v]! - x0) / h));
      bj0 = Math.min(bj0, Math.floor((P[v + 1]! - y0) / h));
      bj1 = Math.max(bj1, Math.ceil((P[v + 1]! - y0) / h));
      bk0 = Math.min(bk0, Math.floor((P[v + 2]! - z0) / h));
      bk1 = Math.max(bk1, Math.ceil((P[v + 2]! - z0) / h));
    }
    bi0 = Math.max(0, bi0 - 1);
    bj0 = Math.max(0, bj0 - 1);
    bk0 = Math.max(0, bk0 - 1);
    bi1 = Math.min(NX - 1, bi1 + 1);
    bj1 = Math.min(NY - 1, bj1 + 1);
    bk1 = Math.min(NZ - 1, bk1 + 1);
    const weit = 4 * h + 1;
    const aussen = new Uint8Array(N);
    const stapel = new Int32Array((bi1 - bi0 + 1) * (bj1 - bj0 + 1) * (bk1 - bk0 + 1));
    let oben = 0;
    const rein = (o: number) => {
      if (aussen[o] === 0 && F[o] === Infinity) {
        aussen[o] = 1;
        stapel[oben++] = o;
      }
    };
    for (let i = bi0; i <= bi1; i++) {
      for (let j = bj0; j <= bj1; j++) {
        for (let k = bk0; k <= bk1; k++) {
          if (i === bi0 || i === bi1 || j === bj0 || j === bj1 || k === bk0 || k === bk1) rein((i * NY + j) * NZ + k);
        }
      }
    }
    const sY = NZ;
    const sX = NY * NZ;
    while (oben > 0) {
      const o = stapel[--oben]!;
      const k = o % NZ;
      const j = ((o - k) / NZ) % NY;
      const i = (o - k - j * NZ) / sX;
      if (k > bk0) rein(o - 1);
      if (k < bk1) rein(o + 1);
      if (j > bj0) rein(o - sY);
      if (j < bj1) rein(o + sY);
      if (i > bi0) rein(o - sX);
      if (i < bi1) rein(o + sX);
    }
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const o0 = (i * NY + j) * NZ;
        const imKasten = i >= bi0 && i <= bi1 && j >= bj0 && j <= bj1;
        for (let k = 0; k < NZ; k++) {
          const o = o0 + k;
          if (F[o] !== Infinity) continue;
          F[o] = !imKasten || k < bk0 || k > bk1 || aussen[o] ? weit : -weit;
        }
      }
    }
    this.F = F;
    this.tri = tri;
  }

  /** Nächster Punkt auf dem Netz unter den nächsten Dreiecken der umliegenden Rasterpunkte, mit Normale. */
  naechster(px: number, py: number, pz: number, aus: Float64Array): number {
    const { x0, y0, z0, h, NX, NY, NZ } = this.g;
    const P = this.netz.positionen;
    const Nn = this.netz.normalen;
    const I = this.netz.indizes;
    const i0 = Math.max(0, Math.floor((px - x0) / h));
    const j0 = Math.max(0, Math.floor((py - y0) / h));
    const k0 = Math.max(0, Math.floor((pz - z0) / h));
    let best = Infinity;
    let letztes = -2;
    for (let i = i0; i <= Math.min(NX - 1, i0 + 1); i++) {
      for (let j = j0; j <= Math.min(NY - 1, j0 + 1); j++) {
        for (let k = k0; k <= Math.min(NZ - 1, k0 + 1); k++) {
          const t = this.tri[(i * NY + j) * NZ + k]!;
          if (t < 0 || t === letztes) continue;
          letztes = t;
          const a = I[t]!;
          const b = I[t + 1]!;
          const c = I[t + 2]!;
          naechsterPunkt(px, py, pz, P, a, b, c, this.bw);
          const u = this.bw[0]!;
          const v = this.bw[1]!;
          const w = this.bw[2]!;
          const qx = u * P[3 * a]! + v * P[3 * b]! + w * P[3 * c]!;
          const qy = u * P[3 * a + 1]! + v * P[3 * b + 1]! + w * P[3 * c + 1]!;
          const qz = u * P[3 * a + 2]! + v * P[3 * b + 2]! + w * P[3 * c + 2]!;
          const d = Math.hypot(px - qx, py - qy, pz - qz);
          if (d >= best) continue;
          best = d;
          const nx = u * Nn[3 * a]! + v * Nn[3 * b]! + w * Nn[3 * c]!;
          const ny = u * Nn[3 * a + 1]! + v * Nn[3 * b + 1]! + w * Nn[3 * c + 1]!;
          const nz = u * Nn[3 * a + 2]! + v * Nn[3 * b + 2]! + w * Nn[3 * c + 2]!;
          const l = Math.hypot(nx, ny, nz) || 1;
          aus[0] = qx;
          aus[1] = qy;
          aus[2] = qz;
          aus[3] = nx / l;
          aus[4] = ny / l;
          aus[5] = nz / l;
        }
      }
    }
    return best;
  }
}

/**
 * Geschlossene Netze weich vereinigen: genaue Abstandsfelder (schmales Band), glattes Minimum, Surface Nets. Abseits der
 * Übergänge liegen die Punkte danach wieder genau auf ihrem Netz (Normale von dort); im Übergang aus dem Feld.
 * `nah(i, t)`: Dreieck t von Netz i liegt nahe an einem anderen Netz (dort braucht das Feld ein breiteres Band).
 */
export function vereinigeNetze(netze: readonly Netz3[], nah: (i: number, t: number) => boolean, opt: VereinigtOptionen): Netz3 & { zeiten: { felder: number; netz: number } } {
  const t0 = jetzt();
  const { h, uebergang: r } = opt;
  let x0 = Infinity;
  let y0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let z1 = -Infinity;
  for (const n of netze) {
    const P = n.positionen;
    for (let v = 0; v < P.length; v += 3) {
      x0 = Math.min(x0, P[v]!);
      x1 = Math.max(x1, P[v]!);
      y0 = Math.min(y0, P[v + 1]!);
      y1 = Math.max(y1, P[v + 1]!);
      z0 = Math.min(z0, P[v + 2]!);
      z1 = Math.max(z1, P[v + 2]!);
    }
  }
  const rand = 3;
  const g = {
    x0: x0 - rand * h,
    y0: y0 - rand * h,
    z0: z0 - rand * h,
    h,
    NX: Math.ceil((x1 - x0) / h) + 2 * rand + 1,
    NY: Math.ceil((y1 - y0) / h) + 2 * rand + 1,
    NZ: Math.ceil((z1 - z0) / h) + 2 * rand + 1,
  };
  const schmal = 1.6 * h;
  const breit = r + 1.6 * h;
  const felder = netze.map((n, i) => new Feld(n, g, (t) => (nah(i, t) ? breit : schmal)));
  const N = g.NX * g.NY * g.NZ;
  const D = new Float32Array(N);
  const Fs = felder.map((f) => f.F);
  for (let o = 0; o < N; o++) {
    let a = Infinity;
    let b = Infinity;
    for (let q = 0; q < Fs.length; q++) {
      const v = Fs[q]![o]!;
      if (v < a) {
        b = a;
        a = v;
      } else if (v < b) b = v;
    }
    // glattes Minimum der beiden kleinsten (polynomisch)
    const hh = b < Infinity ? Math.max(r - (b - a), 0) / r : 0;
    D[o] = a - (r * hh * hh) / 4;
  }
  const t1 = jetzt();
  const roh = surfaceNets(D, g.NX, g.NY, g.NZ, g.x0, g.y0, g.z0, h);
  taubin(roh, 2);
  const netz = netzAusgeben(roh);
  // Zurücklegen: Wo ein Netz klar am nächsten liegt (Abstand zum zweiten > Übergang), auf seine genaue Fläche
  const treffer = new Float64Array(6);
  const P = netz.positionen;
  const Nn = netz.normalen;
  const wert = (A: Float32Array, px: number, py: number, pz: number) => {
    const fx = Math.min(g.NX - 1.001, Math.max(0, (px - g.x0) / h));
    const fy = Math.min(g.NY - 1.001, Math.max(0, (py - g.y0) / h));
    const fz = Math.min(g.NZ - 1.001, Math.max(0, (pz - g.z0) / h));
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const k = Math.floor(fz);
    const tx = fx - i;
    const ty = fy - j;
    const tz = fz - k;
    let s = 0;
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++)
        for (let c = 0; c < 2; c++) s += (a ? tx : 1 - tx) * (b ? ty : 1 - ty) * (c ? tz : 1 - tz) * A[((i + a) * g.NY + j + b) * g.NZ + k + c]!;
    return s;
  };
  for (let v = 0; v < P.length / 3; v++) {
    const px = P[3 * v]!;
    const py = P[3 * v + 1]!;
    const pz = P[3 * v + 2]!;
    // welches Netz liegt am nächsten, und wie klar?
    let bestI = -1;
    let bestW = Infinity;
    let zweitW = Infinity;
    felder.forEach((f, i) => {
      const w = wert(f.F, px, py, pz);
      if (w < bestW) {
        zweitW = bestW;
        bestW = w;
        bestI = i;
      } else if (w < zweitW) zweitW = w;
    });
    if (bestI >= 0 && zweitW - bestW >= r) {
      const d = felder[bestI]!.naechster(px, py, pz, treffer);
      if (d < 2 * h) {
        for (let e = 0; e < 3; e++) {
          P[3 * v + e] = treffer[e]!;
          Nn[3 * v + e] = treffer[3 + e]!;
        }
        continue;
      }
    }
    // im Übergang: Normale aus dem Feld
    const e = 0.5 * h;
    const gx = wert(D, px + e, py, pz) - wert(D, px - e, py, pz);
    const gy = wert(D, px, py + e, pz) - wert(D, px, py - e, pz);
    const gz = wert(D, px, py, pz + e) - wert(D, px, py, pz - e);
    const l = Math.hypot(gx, gy, gz);
    if (l > 1e-12) {
      Nn[3 * v] = gx / l;
      Nn[3 * v + 1] = gy / l;
      Nn[3 * v + 2] = gz / l;
    }
  }
  return { ...groessteKomponente(netz), zeiten: { felder: t1 - t0, netz: jetzt() - t1 } };
}

/** Nur die größte zusammenhängende Fläche behalten (Surface Nets lässt sonst kleine Splitter stehen). */
function groessteKomponente(n: Netz3): Netz3 {
  const I = n.indizes;
  const nv = n.positionen.length / 3;
  const eltern = new Int32Array(nv);
  for (let v = 0; v < nv; v++) eltern[v] = v;
  const wurzel = (v: number): number => {
    while (eltern[v] !== v) {
      eltern[v] = eltern[eltern[v]!]!;
      v = eltern[v]!;
    }
    return v;
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = wurzel(I[t]!);
    const b = wurzel(I[t + 1]!);
    const c = wurzel(I[t + 2]!);
    eltern[b] = a;
    eltern[wurzel(c)] = a;
  }
  const zahl = new Map<number, number>();
  for (let t = 0; t < I.length; t += 3) {
    const r = wurzel(I[t]!);
    zahl.set(r, (zahl.get(r) ?? 0) + 1);
  }
  let best = -1;
  let bestN = -1;
  for (const [r, z] of zahl) {
    if (z > bestN) {
      bestN = z;
      best = r;
    }
  }
  if (zahl.size <= 1) return n;
  const neu = new Int32Array(nv).fill(-1);
  let m = 0;
  const idx: number[] = [];
  for (let t = 0; t < I.length; t += 3) {
    if (wurzel(I[t]!) !== best) continue;
    for (let e = 0; e < 3; e++) {
      const v = I[t + e]!;
      if (neu[v]! < 0) neu[v] = m++;
      idx.push(neu[v]!);
    }
  }
  const positionen = new Float32Array(3 * m);
  const normalen = new Float32Array(3 * m);
  for (let v = 0; v < nv; v++) {
    const q = neu[v]!;
    if (q < 0) continue;
    for (let e = 0; e < 3; e++) {
      positionen[3 * q + e] = n.positionen[3 * v + e]!;
      normalen[3 * q + e] = n.normalen[3 * v + e]!;
    }
  }
  return { positionen, normalen, indizes: Uint32Array.from(idx) };
}

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = (): number => (uhr ? uhr.now() : Date.now());
