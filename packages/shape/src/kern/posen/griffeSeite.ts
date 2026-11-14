// Posen (Plan Teil B, B4; B6: auch Front und Top): Griffe der schwarzen Linie in einem Blatt der Pose. Die Linie ist der
// posierte Umriss des Körpers in diesem Blatt (wie der Lichtsaum: Kern-Koordinaten ohne Hebung, Raster 240; Seite (x, y),
// Front (z, y), Top (x, z)); Florians Knoten des Profils sitzen auf Hautpunkten (der feine Punkt am Ruhe-Umriss, der dem
// Knoten am nächsten liegt) und wandern mit der Pose — in Front und Top auch die gespiegelten Knoten (Posen dürfen schief
// sein). Für Züge an der Linie gehen die feinen Punkte nahe dem posierten Umriss mit, je Punkt seine Zeile der Grenzmatrix
// — damit löst der Editor (`loeser/posenLoeser.ts`) ohne Worker-Umweg.
import type { Dokument } from '../../dokument';
import type { DuennMatrix } from '../../subdivision/matrix';
import { type Ansicht3, umrissAusNetz } from '../../versuch/umriss3d';

type V3 = [number, number, number];

/** Achsen eines Blatts (Seite x, y; Front z, y; Top x, z) */
const ACHSEN: Record<Ansicht3, [number, number]> = { seite: [0, 1], front: [2, 1], top: [0, 2] };

export type PoseSeite = {
  /** Blatt (B6) */
  ansicht: Ansicht3;
  /** posierter Umriss im Blatt (zwei Koordinaten je Punkt), Kern-Koordinaten ohne Hebung */
  umriss: Float32Array;
  /** feine Punkte: je Umrisspunkt die Haut am posierten Umriss, dazu die Hautpunkte der Knoten */
  punkte: Int32Array;
  /** posierte Lage (x, y, z) je Punkt */
  lage: Float32Array;
  /** je Knoten des Profils (Front/Top: erst die Knoten, dann ihre Spiegelbilder) die Nummer in `punkte` (−1 = keiner) */
  knoten: Int32Array;
  /** Zeilen der Grenzmatrix je Punkt (CSR über `punkte`) */
  zeilenStart: Int32Array;
  zeilenIndex: Int32Array;
  zeilenWert: Float64Array;
  /** Rasterweite des Umrisses (Kern-Einheiten) */
  zelle: number;
};

const ZELLEN = 240;

function alsPunkte(fein: ArrayLike<number>): V3[] {
  const p: V3[] = [];
  for (let i = 0; i < fein.length / 3; i++) p.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  return p;
}

/** Längster Zug eines Umrisses (der äußere) und die Rasterweite. */
function aussenUmriss(punkte: V3[], flaechen: readonly number[][], ansicht: Ansicht3): { zug: { x: number; y: number }[]; zelle: number } {
  const zuege = umrissAusNetz({ punkte, flaechen: flaechen as number[][], schaerfe: new Map() }, ansicht, ZELLEN);
  const [a0, a1] = ACHSEN[ansicht];
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of punkte) {
    x0 = Math.min(x0, p[a0]!);
    x1 = Math.max(x1, p[a0]!);
    y0 = Math.min(y0, p[a1]!);
    y1 = Math.max(y1, p[a1]!);
  }
  const zelle = Math.max(x1 - x0, y1 - y0, 1e-6) / ZELLEN;
  let zug = zuege[0] ?? [];
  let laenge = -1;
  for (const z of zuege) {
    let l = 0;
    for (let k = 1; k < z.length; k++) l += Math.hypot(z[k]!.x - z[k - 1]!.x, z[k]!.y - z[k - 1]!.y);
    if (l > laenge) {
      laenge = l;
      zug = z;
    }
  }
  return { zug, zelle };
}

/**
 * Je Punkt des Umrisses der feine Punkt mit der nächsten Projektion (x, y) — die Haut am Umriss (doppelte entfernt).
 * Alle Punkte nahe dem Umriss zu nehmen gab tausende: Nahe der Silhouette projizieren ganze Streifen auf den Umriss.
 */
function amZug(punkte: V3[], zug: readonly { x: number; y: number }[], zelle: number, ansicht: Ansicht3): number[] {
  const [a0, a1] = ACHSEN[ansicht];
  const g = 2 * zelle;
  const gitter = new Map<string, number[]>();
  const schl = (i: number, j: number) => `${i}:${j}`;
  for (let p = 0; p < punkte.length; p++) {
    const s = schl(Math.floor(punkte[p]![a0]! / g), Math.floor(punkte[p]![a1]! / g));
    (gitter.get(s) ?? gitter.set(s, []).get(s)!).push(p);
  }
  const gesehen = new Set<number>();
  const out: number[] = [];
  for (const q of zug) {
    const i0 = Math.floor(q.x / g);
    const j0 = Math.floor(q.y / g);
    let best = -1;
    let bd = Infinity;
    for (let r = 1; r <= 4 && best < 0; r++)
      for (let i = i0 - r; i <= i0 + r; i++)
        for (let j = j0 - r; j <= j0 + r; j++)
          for (const p of gitter.get(schl(i, j)) ?? []) {
            const d = Math.hypot(punkte[p]![a0]! - q.x, punkte[p]![a1]! - q.y);
            if (d < bd) {
              bd = d;
              best = p;
            }
          }
    if (best >= 0 && !gesehen.has(best)) {
      gesehen.add(best);
      out.push(best);
    }
  }
  return out;
}

/**
 * Äußerer Umriss eines feinen Netzes in einem Blatt (B7: Geist und Zwischenbilder), zwei Koordinaten je Punkt wie
 * `PoseSeite.umriss` (Seite (x, y), Front (z, y), Top (x, z)).
 */
export function blattUmriss(fein: ArrayLike<number>, flaechen: readonly number[][], ansicht: Ansicht3): Float32Array {
  const { zug } = aussenUmriss(alsPunkte(fein), flaechen, ansicht);
  const out = new Float32Array(2 * zug.length);
  zug.forEach((q, k) => {
    out[2 * k] = q.x;
    out[2 * k + 1] = q.y;
  });
  return out;
}

/** Ruhe-Umriss und Kandidaten je Ableitung und Blatt merken (hängen nur an der Ruhelage). */
const ruheMerk = new WeakMap<ArrayLike<number>, Partial<Record<Ansicht3, { kandidaten: number[] }>>>();

/** Griffdaten der schwarzen Linie in einem Blatt der Pose (B6: Seite, Front, Top). */
export function poseBlattGriffe(ansicht: Ansicht3, ruheFein: Float64Array, poseFein: ArrayLike<number>, flaechen: readonly number[][], grenze: DuennMatrix, dok: Dokument): PoseSeite {
  const [a0, a1] = ACHSEN[ansicht];
  const pose = alsPunkte(poseFein);
  const { zug, zelle } = aussenUmriss(pose, flaechen, ansicht);
  const kandidaten = amZug(pose, zug, zelle, ansicht);
  const merk = ruheMerk.get(ruheFein) ?? {};
  let ruhe = merk[ansicht];
  if (!ruhe) {
    const rp = alsPunkte(ruheFein);
    const r = aussenUmriss(rp, flaechen, ansicht);
    ruhe = { kandidaten: amZug(rp, r.zug, r.zelle, ansicht) };
    merk[ansicht] = ruhe;
    ruheMerk.set(ruheFein, merk);
  }
  // Knoten des Profils → nächster feiner Punkt am Ruhe-Umriss (Profil-Einheiten · Skalierung = Kern); Front und Top:
  // Halbprofile, dazu die gespiegelten Knoten (Achsknoten nur einmal)
  const sk = dok.skalierung;
  const knotenLagen: { x: number; y: number }[] = [];
  const profil = dok.profile[ansicht];
  for (const k of profil.knoten) knotenLagen.push({ x: k.p.x * sk, y: k.p.y * sk });
  if (ansicht === 'front') for (const k of profil.knoten) if (Math.abs(k.p.x) > 1e-9) knotenLagen.push({ x: -k.p.x * sk, y: k.p.y * sk });
  if (ansicht === 'top') for (const k of profil.knoten) if (Math.abs(k.p.y) > 1e-9) knotenLagen.push({ x: k.p.x * sk, y: -k.p.y * sk });
  const knotenPunkt = knotenLagen.map(({ x, y }) => {
    let best = -1;
    let bd = Infinity;
    for (const p of ruhe!.kandidaten) {
      const d = Math.hypot(ruheFein[3 * p + a0]! - x, ruheFein[3 * p + a1]! - y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  });
  const alle: number[] = [];
  const nummer = new Map<number, number>();
  const nimm = (p: number) => {
    if (p < 0 || nummer.has(p)) return;
    nummer.set(p, alle.length);
    alle.push(p);
  };
  for (const p of kandidaten) nimm(p);
  for (const p of knotenPunkt) nimm(p);
  const lage = new Float32Array(3 * alle.length);
  const zeilenStart = new Int32Array(alle.length + 1);
  const idx: number[] = [];
  const wert: number[] = [];
  alle.forEach((p, k) => {
    lage[3 * k] = poseFein[3 * p]!;
    lage[3 * k + 1] = poseFein[3 * p + 1]!;
    lage[3 * k + 2] = poseFein[3 * p + 2]!;
    for (let t = grenze.start[p]!; t < grenze.start[p + 1]!; t++) {
      idx.push(grenze.index[t]!);
      wert.push(grenze.wert[t]!);
    }
    zeilenStart[k + 1] = idx.length;
  });
  const umriss = new Float32Array(2 * zug.length);
  zug.forEach((q, k) => {
    umriss[2 * k] = q.x;
    umriss[2 * k + 1] = q.y;
  });
  return { ansicht, umriss, punkte: Int32Array.from(alle), lage, knoten: Int32Array.from(knotenPunkt.map((p) => (p >= 0 ? nummer.get(p)! : -1))), zeilenStart, zeilenIndex: Int32Array.from(idx), zeilenWert: Float64Array.from(wert), zelle };
}
