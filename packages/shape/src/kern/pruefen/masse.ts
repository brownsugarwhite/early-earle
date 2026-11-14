// Zufallsreihe (Plan Teil V2): Maße je Fall. Florians Anspruch (15.10.): „Das Maul soll perfekt sitzen und dabei das
// Grundmesh nicht beeinflussen … die Lippen sollen exakt der Mundlinie bzw. den beiden Kieferlinien folgen, ohne dass
// das Mesh dadurch seine Form verändert.“ Deshalb wird jedes Maul gegen denselben Körper ohne Maul gemessen
// (Formtreue, Δ je Blatt), die Lippen dicht über die ganze gezeichnete Linie (nicht nur an Käfigspalten), Falten,
// umgeklappte Flächen, Durchdringungen beim Öffnen und die Unabhängigkeit der Kiefer. DOM-frei.
import type { Dokument, Linie3 } from '../../dokument';
import type { V3 } from '../../versuch/catmullClark';
import { abtasten3 } from '../../versuch/linie3d';
import { selbstDurchdringungen } from '../../versuch/pruefen';
import { type Ableitung, ableiten } from '../ableiten';
import { blattAbweichungen } from '../abweichung';
import { type MaulErgebnis, ableitenMitMaul, kieferFlaechen, maulOptionenVorlage, maulPose } from '../maul';
import { maulLinieAusDokument } from '../maulDokument';
import { deltasAnwenden } from '../pinsel';
import { feinesNetz, regionen } from '../pruefstand';
import { feinKette } from '../reifen';
import type { FallDokumente } from './faelle';

export const PX = 461;
const STUFEN = 2;
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

type Dreiecke = { a: Float64Array; n: number; flaeche: Int32Array };

/** Dreiecke eines Vierecknetzes (je Viereck zwei) mit der Fläche, aus der sie stammen. */
export function dreiecke(punkte: readonly V3[], flaechen: readonly number[][]): Dreiecke {
  const tri: number[] = [];
  const herkunft: number[] = [];
  flaechen.forEach((f, fi) => {
    for (let k = 1; k + 1 < f.length; k++) {
      const p = punkte[f[0]!]!;
      const q = punkte[f[k]!]!;
      const r = punkte[f[k + 1]!]!;
      tri.push(p[0], p[1], p[2], q[0], q[1], q[2], r[0], r[1], r[2]);
      herkunft.push(fi);
    }
  });
  return { a: Float64Array.from(tri), n: tri.length / 9, flaeche: Int32Array.from(herkunft) };
}

/**
 * Faltenwinkel je feiner Fläche: größter Winkel zwischen ihrer Normalen und der einer Nachbarfläche über eine Kante
 * ohne Schärfe (wie `faltenMass`, aber je Fläche, damit Maul- und Grundkörper örtlich verglichen werden können).
 */
function flaechenWinkel(abl: Ableitung): Float64Array {
  const { punkte, kaefig } = feinesNetz(abl);
  const normalen = new Float64Array(3 * kaefig.nF);
  for (let f = 0; f < kaefig.nF; f++) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const a = kaefig.fStart[f]!;
    const b = kaefig.fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const p = punkte[kaefig.fVerts[h]!]!;
      const q = punkte[kaefig.fVerts[h + 1 < b ? h + 1 : a]!]!;
      nx += (p[1] - q[1]) * (p[2] + q[2]);
      ny += (p[2] - q[2]) * (p[0] + q[0]);
      nz += (p[0] - q[0]) * (p[1] + q[1]);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    normalen[3 * f] = nx / l;
    normalen[3 * f + 1] = ny / l;
    normalen[3 * f + 2] = nz / l;
  }
  const out = new Float64Array(kaefig.nF);
  for (let e = 0; e < kaefig.nE; e++) {
    if (kaefig.eFlaechen[e] !== 2 || kaefig.eSchaerfe[e]! > 0) continue;
    const h = kaefig.eHalb[e]!;
    const tw = kaefig.hTwin[h]!;
    if (tw < 0) continue;
    const f1 = kaefig.hFace[h]!;
    const f2 = kaefig.hFace[tw]!;
    const c = normalen[3 * f1]! * normalen[3 * f2]! + normalen[3 * f1 + 1]! * normalen[3 * f2 + 1]! + normalen[3 * f1 + 2]! * normalen[3 * f2 + 2]!;
    const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    if (w > out[f1]!) out[f1] = w;
    if (w > out[f2]!) out[f2] = w;
  }
  return out;
}

/** Nächster Punkt auf einem Dreieck (Ericson, Real-Time Collision Detection 5.1.5). */
function naechsterAufDreieck(p: V3, d: Float64Array, o: number): [number, number, number] {
  const ax = d[o]!, ay = d[o + 1]!, az = d[o + 2]!;
  const bx = d[o + 3]!, by = d[o + 4]!, bz = d[o + 5]!;
  const cx = d[o + 6]!, cy = d[o + 7]!, cz = d[o + 8]!;
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = p[0] - ax, apy = p[1] - ay, apz = p[2] - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return [ax, ay, az];
  const bpx = p[0] - bx, bpy = p[1] - by, bpz = p[2] - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return [bx, by, bz];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return [ax + v * abx, ay + v * aby, az + v * abz];
  }
  const cpx = p[0] - cx, cpy = p[1] - cy, cpz = p[2] - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return [cx, cy, cz];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return [ax + w * acx, ay + w * acy, az + w * acz];
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return [bx + w * (cx - bx), by + w * (cy - by), bz + w * (cz - bz)];
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return [ax + abx * v + acx * w, ay + aby * v + acy * w, az + abz * v + acz * w];
}

/** Abstandsabfrage gegen eine Fläche aus Dreiecken über ein gleichmäßiges Gitter. */
export function flaechenAbstand(tri: Dreiecke): (p: V3) => { d: number; dreieck: number } {
  let lo = [Infinity, Infinity, Infinity];
  let hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < tri.a.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k]!, tri.a[i + k]!);
      hi[k] = Math.max(hi[k]!, tri.a[i + k]!);
    }
  }
  lo = lo.map((x) => x - 1e-6);
  hi = hi.map((x) => x + 1e-6);
  const groesse = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!);
  const zellen = Math.max(8, Math.min(64, Math.round(Math.cbrt(tri.n) * 1.5)));
  const h = groesse / zellen;
  const nx = Math.ceil((hi[0]! - lo[0]!) / h) + 1;
  const ny = Math.ceil((hi[1]! - lo[1]!) / h) + 1;
  const nz = Math.ceil((hi[2]! - lo[2]!) / h) + 1;
  const gitter = new Map<number, number[]>();
  const zelle = (x: number, y: number, z: number) => (x * ny + y) * nz + z;
  for (let t = 0; t < tri.n; t++) {
    const o = 9 * t;
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      x0 = Math.min(x0, tri.a[o + 3 * k]!); x1 = Math.max(x1, tri.a[o + 3 * k]!);
      y0 = Math.min(y0, tri.a[o + 3 * k + 1]!); y1 = Math.max(y1, tri.a[o + 3 * k + 1]!);
      z0 = Math.min(z0, tri.a[o + 3 * k + 2]!); z1 = Math.max(z1, tri.a[o + 3 * k + 2]!);
    }
    for (let x = Math.floor((x0 - lo[0]!) / h); x <= Math.floor((x1 - lo[0]!) / h); x++)
      for (let y = Math.floor((y0 - lo[1]!) / h); y <= Math.floor((y1 - lo[1]!) / h); y++)
        for (let z = Math.floor((z0 - lo[2]!) / h); z <= Math.floor((z1 - lo[2]!) / h); z++) {
          const key = zelle(x, y, z);
          const l = gitter.get(key);
          if (l) l.push(t);
          else gitter.set(key, [t]);
        }
  }
  return (p) => {
    const cx = Math.floor((p[0] - lo[0]!) / h);
    const cy = Math.floor((p[1] - lo[1]!) / h);
    const cz = Math.floor((p[2] - lo[2]!) / h);
    let best = Infinity;
    let bestT = -1;
    const gesehen = new Set<number>();
    for (let r = 0; r <= Math.max(nx, ny, nz); r++) {
      for (let x = cx - r; x <= cx + r; x++)
        for (let y = cy - r; y <= cy + r; y++)
          for (let z = cz - r; z <= cz + r; z++) {
            if (Math.max(Math.abs(x - cx), Math.abs(y - cy), Math.abs(z - cz)) !== r) continue;
            if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) continue;
            const l = gitter.get(zelle(x, y, z));
            if (!l) continue;
            for (const t of l) {
              if (gesehen.has(t)) continue;
              gesehen.add(t);
              const q = naechsterAufDreieck(p, tri.a, 9 * t);
              const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
              if (d < best) {
                best = d;
                bestT = t;
              }
            }
          }
      // alle Dreiecke näher als r·h sind gesehen
      if (best <= r * h) break;
    }
    return { d: best, dreieck: bestT };
  };
}

function normaleDreieck(tri: Dreiecke, t: number): V3 {
  const o = 9 * t;
  const a = tri.a;
  const ux = a[o + 3]! - a[o]!, uy = a[o + 4]! - a[o + 1]!, uz = a[o + 5]! - a[o + 2]!;
  const vx = a[o + 6]! - a[o]!, vy = a[o + 7]! - a[o + 1]!, vz = a[o + 8]! - a[o + 2]!;
  const n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

function flaechenNormale(punkte: readonly V3[], f: readonly number[]): { n: V3; flaeche: number; mitte: V3 } {
  let nx = 0, ny = 0, nz = 0;
  const m: V3 = [0, 0, 0];
  for (let k = 0; k < f.length; k++) {
    const p = punkte[f[k]!]!;
    const q = punkte[f[(k + 1) % f.length]!]!;
    nx += (p[1] - q[1]) * (p[2] + q[2]);
    ny += (p[2] - q[2]) * (p[0] + q[0]);
    nz += (p[0] - q[0]) * (p[1] + q[1]);
    m[0] += p[0] / f.length;
    m[1] += p[1] / f.length;
    m[2] += p[2] / f.length;
  }
  const l = Math.hypot(nx, ny, nz);
  return { n: l > 0 ? [nx / l, ny / l, nz / l] : [0, 0, 0], flaeche: l / 2, mitte: m };
}

type P2 = [number, number];
type Blatt = 'seite' | 'front' | 'top';
const proj: Record<Blatt, (p: readonly number[]) => P2> = {
  seite: (p) => [p[0]!, p[1]!],
  front: (p) => [Math.abs(p[2]!), p[1]!],
  top: (p) => [p[0]!, Math.abs(p[2]!)],
};

function abstandZuZug(p: P2, zug: readonly P2[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const l2 = abx * abx + aby * aby || 1e-18;
    const u = Math.min(1, Math.max(0, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2));
    best = Math.min(best, Math.hypot(a[0] + abx * u - p[0], a[1] + aby * u - p[1]));
  }
  return best;
}

/** Beidseitige Hausdorff-Abweichung zweier Züge je Blatt (px). */
export function zugAbweichung(a: readonly (readonly number[])[], b: readonly (readonly number[])[], sk: number): Record<Blatt, number> {
  const out = { seite: 0, front: 0, top: 0 } as Record<Blatt, number>;
  for (const blatt of ['seite', 'front', 'top'] as const) {
    const pa = a.map(proj[blatt]);
    const pb = b.map(proj[blatt]);
    let m = 0;
    for (const p of pa) m = Math.max(m, abstandZuZug(p, pb));
    for (const p of pb) m = Math.max(m, abstandZuZug(p, pa));
    out[blatt] = (m * PX) / sk;
  }
  return out;
}

/** Feine Lippenkette (Grenzlagen) einer Kette von Käfigpunkten. */
function lippenZug(abl: MaulErgebnis, kette: readonly number[], fein: ArrayLike<number> = abl.fein): V3[] {
  const out: V3[] = [];
  for (let t = 0; t + 1 < kette.length; t++) {
    const f = feinKette(abl.unterteilung, abl.kaefig, kette[t]!, kette[t + 1]!);
    if (!f.length) return [];
    for (let i = t === 0 ? 0 : 1; i < f.length; i++) out.push([fein[3 * f[i]!]!, fein[3 * f[i]! + 1]!, fein[3 * f[i]! + 2]!]);
  }
  return out;
}

function linieWelt(l: Linie3, sk: number): V3[] {
  return abtasten3(l, 32).map((p) => [p[0] * sk, p[1] * sk, p[2] * sk] as V3);
}

export type FallMasse = {
  zeit: { ohneMaul: number; mitMaul: number };
  /** Abstand der Haut zum Körper ohne Maul (px): fern = mehr als eine Maullänge von der Linie, nah = dazwischen (ohne Lippenband) */
  formtreue: { fern: { max: number; p99: number }; nah: { max: number; p99: number } };
  /** Δ je Blatt (px) mit und ohne Maul (Maulfenster und Umweg ausgenommen) */
  delta: { mit: Record<Blatt, number>; ohne: Record<Blatt, number> };
  /** Lippenkante gegen die gezeichnete Linie, dicht über die ganze Linie (px je Blatt) */
  lippe: { oben: Record<Blatt, number>; unten: Record<Blatt, number> | null };
  /**
   * Faltenzuwachs je Hautfläche gegen die nächste Fläche des Körpers ohne Maul (Grad): fern / nah wie bei der Formtreue;
   * dazu die größten Faltenwinkel beider Körper (Haut bzw. ganzer Körper) zur Einordnung
   */
  falten: { fern: { max: number; p99: number }; nah: { max: number; p99: number }; mitMax: number; ohneMax: number };
  /** Hautflächen, deren Normale gegen den Körper ohne Maul umgeklappt ist; kleinste Fläche relativ zum Median */
  umgeklappt: number;
  kleinsteFlaeche: number;
  /** Durchdringungen je Öffnung: gesamt, mit Haut beteiligt (sichtbar möglich), nach Bereich */
  paare: { oeffnung: number; gesamt: number; haut: number; nachBereich: Record<string, number> }[];
  /** Kiefer getrennt: Verschiebung der Haut des anderen Kiefers, wenn eine Linie gezogen wird (px) */
  kiefer: { rotZiehtUnten: number; blauZiehtOben: number } | null;
};

function fertig(abl: Ableitung, dok: Dokument): Ableitung {
  const deltas = dok.kaefig?.deltas ?? [];
  return deltas.length ? deltasAnwenden(abl, deltas) : abl;
}

/** Wesen mit Maul wie im Worker bauen (eingefrorene Stationen des Dokuments, Vorlage „vorn“, Pinsel-Deltas danach). */
export function mitMaulBauen(dok: Dokument): MaulErgebnis {
  const linie = maulLinieAusDokument(dok);
  if (!linie) throw new Error('kein Maul');
  const g = dok.kaefig?.stationen;
  const abl = ableitenMitMaul(dok, linie, { stufen: STUFEN, ...(g ? { stationen: g } : {}) }, maulOptionenVorlage('vorn'));
  return fertig(abl, dok) as MaulErgebnis;
}

function quantil(werte: number[], q: number): number {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]!;
}

/** Haut des anderen Kiefers: wie weit bewegt sie sich, wenn die Mitte einer Linie um 10 px gezogen wird? */
function kieferUnabhaengig(fd: FallDokumente, abl: MaulErgebnis, flaechen: number[][], bereiche: string[]): FallMasse['kiefer'] {
  const zu = fd.dok.maul!.zu;
  if (!zu.unten) return null;
  const M = abl.unterteilung.matrix;
  const gewichtFein = (i: number) => {
    let g = 0;
    for (let p = M.start[i]!; p < M.start[i + 1]!; p++) g += M.wert[p]! * abl.maul.gewichtUnten[M.index[p]!]!;
    return g;
  };
  const sk = fd.dok.skalierung;
  const mess = (rolle: 'oben' | 'unten'): number => {
    const l = zu[rolle]!;
    const i = Math.floor(l.knoten.length / 2);
    if (i <= 0 || i >= l.knoten.length - 1) return NaN;
    const kn = l.knoten.map((k, j) => (j === i ? { ...k, p: [k.p[0], k.p[1] + 10 / PX / sk, k.p[2]] as [number, number, number] } : k));
    const dok2: Dokument = { ...fd.dok, maul: { zu: { ...zu, [rolle]: { knoten: kn } } } };
    let abl2: MaulErgebnis;
    try {
      abl2 = mitMaulBauen(dok2);
    } catch {
      return NaN;
    }
    // Haut des anderen Kiefers: Rot gezogen → Unterkiefer (Gewicht > 0,95), Blau gezogen → Oberkiefer (< 0,05)
    const anderer = (f: number) => {
      if (bereiche[f] !== 'haut') return false;
      const g = gewichtFein(flaechen[f]![0]!);
      return rolle === 'oben' ? g > 0.95 : g < 0.05;
    };
    if (abl2.fein.length === abl.fein.length) {
      let m = 0;
      for (let f = 0; f < flaechen.length; f++) {
        if (!anderer(f)) continue;
        for (const v of flaechen[f]!) m = Math.max(m, Math.hypot(abl2.fein[3 * v]! - abl.fein[3 * v]!, abl2.fein[3 * v + 1]! - abl.fein[3 * v + 1]!, abl2.fein[3 * v + 2]! - abl.fein[3 * v + 2]!));
      }
      return (m * PX) / sk;
    }
    // andere Topologie: Abstand der Flächenmitten zur alten Fläche
    const alt = feinesNetz(abl);
    const abstand = flaechenAbstand(dreiecke(alt.punkte, alt.flaechen));
    const neu = feinesNetz(abl2);
    const bereiche2 = regionen(abl2, neu.flaechen);
    const M2 = abl2.unterteilung.matrix;
    let m = 0;
    for (let f = 0; f < neu.flaechen.length; f++) {
      if (bereiche2[f] !== 'haut') continue;
      let g = 0;
      const i0 = neu.flaechen[f]![0]!;
      for (let p = M2.start[i0]!; p < M2.start[i0 + 1]!; p++) g += M2.wert[p]! * abl2.maul.gewichtUnten[M2.index[p]!]!;
      if (rolle === 'oben' ? g <= 0.95 : g >= 0.05) continue;
      m = Math.max(m, abstand(flaechenNormale(neu.punkte, neu.flaechen[f]!).mitte).d);
    }
    return (m * PX) / sk;
  };
  return { rotZiehtUnten: mess('oben'), blauZiehtOben: mess('unten') };
}

export type MassOptionen = { oeffnungen?: number[]; kiefer?: boolean };

/** Alle Maße eines Falls. Wirft, wenn das Maul nicht baut (der Aufrufer zählt das als Fehler des Falls). */
export function fallMessen(fd: FallDokumente, o: MassOptionen = {}): FallMasse {
  const sk = fd.dok.skalierung;
  const t0 = jetzt();
  const ohne = fertig(ableiten(fd.ohneMaul, { stufen: STUFEN, stationen: fd.stationenKoerper }), fd.ohneMaul);
  const t1 = jetzt();
  const abl = mitMaulBauen(fd.dok);
  const t2 = jetzt();
  const A = feinesNetz(abl);
  const A0 = feinesNetz(ohne);
  const bereiche = regionen(abl, A.flaechen);
  const tri0 = dreiecke(A0.punkte, A0.flaechen);
  const abstand = flaechenAbstand(tri0);
  // Linie(n) in Welt, für die Nähe zur Lippe
  const zu = fd.dok.maul!.zu;
  const linienPunkte = [...linieWelt(zu.oben, sk), ...(zu.unten ? linieWelt(zu.unten, sk) : [])];
  const L = Math.max(1e-3, fd.maul.laenge * sk);
  const naheLinie = (p: V3) => {
    let d = Infinity;
    for (const q of linienPunkte) d = Math.min(d, Math.hypot(q[0] - p[0], q[1] - p[1], Math.abs(q[2]) - Math.abs(p[2])));
    return d;
  };
  const winkelA = flaechenWinkel(abl);
  const winkelA0 = flaechenWinkel(ohne);
  const fern: number[] = [];
  const nah: number[] = [];
  const faltenFern: number[] = [];
  const faltenNah: number[] = [];
  let mitMax = 0;
  let umgeklappt = 0;
  const flaechenGroesse: number[] = [];
  for (let f = 0; f < A.flaechen.length; f++) {
    if (bereiche[f] !== 'haut') continue;
    const { n, flaeche, mitte } = flaechenNormale(A.punkte, A.flaechen[f]!);
    flaechenGroesse.push(flaeche);
    const r = abstand(mitte);
    const dl = naheLinie(mitte);
    const px = (r.d * PX) / sk;
    const zuwachs = r.dreieck >= 0 ? winkelA[f]! - winkelA0[tri0.flaeche[r.dreieck]!]! : 0;
    mitMax = Math.max(mitMax, winkelA[f]!);
    if (dl > L) {
      fern.push(px);
      faltenFern.push(zuwachs);
    } else if (dl > 0.12 * L) {
      nah.push(px);
      faltenNah.push(zuwachs);
    }
    if (dl > 0.12 * L && r.dreieck >= 0) {
      const n0 = normaleDreieck(tri0, r.dreieck);
      if (n[0] * n0[0] + n[1] * n0[1] + n[2] * n0[2] < 0) umgeklappt++;
    }
  }
  const median = quantil(flaechenGroesse, 0.5) || 1;
  const kleinste = flaechenGroesse.length ? Math.min(...flaechenGroesse) / median : 1;
  const dMit = blattAbweichungen(A.punkte, A.flaechen, fd.dok, 240, kieferFlaechen(abl, A.flaechen));
  const dOhne = blattAbweichungen(A0.punkte, A0.flaechen, fd.ohneMaul, 240);
  // Lippen: obere Kette gegen Rot (bzw. Türkis), untere gegen Blau; bei gleichen Kiefern beide gegen Türkis
  const lo = lippenZug(abl, abl.maul.pfad);
  const lu = lippenZug(abl, [...abl.maul.unten, abl.maul.pfad[abl.maul.pfad.length - 1]!]);
  const rot = linieWelt(zu.oben, sk);
  const blau = zu.unten ? linieWelt(zu.unten, sk) : rot;
  const leer = { seite: Infinity, front: Infinity, top: Infinity };
  const lippe = { oben: lo.length ? zugAbweichung(rot, lo, sk) : leer, unten: lu.length ? zugAbweichung(blau, lu, sk) : leer };
  const oeffnungen = o.oeffnungen ?? [0, 0.25, 0.5, 0.75, 1];
  const paare = oeffnungen.map((oeffnung) => {
    const pose = oeffnung === 0 ? abl.fein : maulPose(abl, oeffnung).fein;
    const pts: V3[] = [];
    for (let i = 0; i < pose.length / 3; i++) pts.push([pose[3 * i]!, pose[3 * i + 1]!, pose[3 * i + 2]!]);
    try {
      const d = selbstDurchdringungen({ punkte: pts, flaechen: A.flaechen, schaerfe: new Map() }, 1e-4, bereiche);
      let haut = 0;
      for (const [k, v] of Object.entries(d.nachBereich)) if (k.includes('haut')) haut += v;
      return { oeffnung, gesamt: d.paare, haut, nachBereich: d.nachBereich };
    } catch {
      // zerrissenes Netz: so viele Kandidatenpaare, dass die Prüfung ihre Grenze sprengt — zählt als unendlich
      return { oeffnung, gesamt: Infinity, haut: Infinity, nachBereich: { zerrissen: 1 } };
    }
  });
  return {
    zeit: { ohneMaul: t1 - t0, mitMaul: t2 - t1 },
    formtreue: { fern: { max: fern.length ? Math.max(...fern) : 0, p99: quantil(fern, 0.99) }, nah: { max: nah.length ? Math.max(...nah) : 0, p99: quantil(nah, 0.99) } },
    delta: { mit: { seite: dMit.seite.max, front: dMit.front.max, top: dMit.top.max }, ohne: { seite: dOhne.seite.max, front: dOhne.front.max, top: dOhne.top.max } },
    lippe: { oben: lippe.oben, unten: zu.unten || lu.length ? lippe.unten : null },
    falten: { fern: { max: faltenFern.length ? Math.max(...faltenFern) : 0, p99: quantil(faltenFern, 0.99) }, nah: { max: faltenNah.length ? Math.max(...faltenNah) : 0, p99: quantil(faltenNah, 0.99) }, mitMax, ohneMax: winkelA0.reduce((a, b) => Math.max(a, b), 0) },
    umgeklappt,
    kleinsteFlaeche: kleinste,
    paare,
    kiefer: o.kiefer === false ? null : kieferUnabhaengig(fd, abl, A.flaechen, bereiche),
  };
}

/** Schwellen der neuen Bauweise (Plan Teil A „Schwellen“) — die Ausgangslage wird daran gemessen, nicht abgenommen. */
export const SCHWELLEN = { formtreueFern: 0.25, formtreueNah: 0.25, deltaZuwachs: 0.5, lippe: 1, faltenZuwachs: 2, umgeklappt: 0, hautPaare: 0, kiefer: 1e-6, zeit: 150 };

export type Verstoss = { mass: string; wert: number; schwelle: number };

/** Verstöße eines Falls gegen die Schwellen; `formtreueNah` nur bei gleichen Kiefern (der kürzere Kiefer darf ausweichen). */
export function verstoesse(m: FallMasse, kieferGleich: boolean): Verstoss[] {
  const v: Verstoss[] = [];
  const pruefe = (mass: string, wert: number, schwelle: number) => {
    if (!(wert <= schwelle)) v.push({ mass, wert, schwelle });
  };
  pruefe('Formtreue fern', m.formtreue.fern.max, SCHWELLEN.formtreueFern);
  if (kieferGleich) pruefe('Formtreue nah', m.formtreue.nah.max, SCHWELLEN.formtreueNah);
  for (const b of ['seite', 'front', 'top'] as const) pruefe(`Δ ${b} mit − ohne`, m.delta.mit[b] - m.delta.ohne[b], SCHWELLEN.deltaZuwachs);
  for (const b of ['seite', 'front', 'top'] as const) pruefe(`Lippe oben ${b}`, m.lippe.oben[b], SCHWELLEN.lippe);
  if (m.lippe.unten) for (const b of ['seite', 'front', 'top'] as const) pruefe(`Lippe unten ${b}`, m.lippe.unten[b], SCHWELLEN.lippe);
  pruefe('Faltenzuwachs fern (°)', m.falten.fern.max, SCHWELLEN.faltenZuwachs);
  if (kieferGleich) pruefe('Faltenzuwachs nah (°)', m.falten.nah.max, SCHWELLEN.faltenZuwachs);
  pruefe('umgeklappte Hautflächen', m.umgeklappt, SCHWELLEN.umgeklappt);
  for (const p of m.paare) if (p.oeffnung > 0) pruefe(`Durchdringungen mit Haut bei ${Math.round(p.oeffnung * 100)} %`, p.haut, SCHWELLEN.hautPaare);
  if (m.kiefer) {
    pruefe('Rot ziehen bewegt Unterkiefer (px)', m.kiefer.rotZiehtUnten, SCHWELLEN.kiefer);
    pruefe('Blau ziehen bewegt Oberkiefer (px)', m.kiefer.blauZiehtOben, SCHWELLEN.kiefer);
  }
  pruefe('Bau mit Maul (ms)', m.zeit.mitMaul, SCHWELLEN.zeit);
  return v;
}

/** Schwere eines Falls: größtes Verhältnis Wert / Schwelle (Schwelle 0 → Wert + 1), gekappt bei 1000. */
export function schwere(v: readonly Verstoss[]): number {
  let s = 0;
  for (const x of v) s = Math.max(s, x.schwelle > 0 ? x.wert / x.schwelle : x.wert + 1);
  return Math.min(1000, Number.isFinite(s) ? s : 1000);
}
