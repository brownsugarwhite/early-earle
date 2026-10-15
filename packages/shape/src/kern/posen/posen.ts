// Posen (Plan Teil B, B3): die Posen eines Dokuments mit Gewichten auswerten. Je Pose: Knochenstellung θ, Ruhe-Deltas D
// (Haps-Saat bei Fressen + Florians Form), Mischung X(w) = Skin(A + Σ wᵢ·Dᵢ ; Σ wᵢ·θᵢ) (`poseAuswerten`).
// Florians Form einer Pose:
// - neues Format: Ruhe-Deltas mit Bezugs-Käfig; sie folgen Änderungen der Grundform über die örtliche Verformung der
//   Umgebung (`uebertrag.ts`, K6);
// - altes Format (`formAlt: 'nachKnochen'`, Fressen-Deltas nach den Knochen): bei jeder Auswertung mit Rᵀ der vollen Pose
//   in Ruhe-Deltas gedreht (exakt dieselbe Form bei voller Pose), bis die Pose wieder bearbeitet wird;
// - ohne Bezug oder bei anderer Punktzahl: Weltversätze je Punkt wie bisher.
// Ohne Schlitzmaul gibt es keine Knochen: X = A + Σ wᵢ·Dᵢ.
import type { KaefigDelta, Pose, PoseStellung } from '../../dokument';
import type { MaulErgebnis, MaulOptionen } from '../maul';
import { type AnkerFeld, posenUmhaengen } from '../posenAnker';
import { deltaFeld, poseAuswerten } from './auswerten';
import { fressenDeltasInRuhe, hapsSaat } from './saat';
import { type KnochenPunkte, type Skin, type Stellung, STELLUNG_NULL, knochenPunkte, skinBerechnen, stellungMischen } from './skin';
import { type Umgebung, deltasUebertragen, umgebung } from './uebertrag';

/** Stellung der Knochen einer Pose (Grad, Maullängen) für die Skin; fehlende Knochen und Werte stehen in Ruhe. */
export function stellungVon(s: PoseStellung | undefined): Stellung {
  if (!s) return { ...STELLUNG_NULL, kieferZug: [0, 0] };
  const k = s.kiefer;
  const o = s.schaedel;
  return {
    winkelUnten: k?.winkel ?? 0,
    winkelOben: o?.winkel ?? 0,
    kieferZug: [k?.zug?.[0] ?? 0, k?.zug?.[1] ?? 0],
    zugWeite: k?.ziehen ?? 0,
    gierenUnten: k?.gieren ?? 0,
    rollenUnten: k?.rollen ?? 0,
    seitUnten: k?.seit ?? 0,
    gierenOben: o?.gieren ?? 0,
    rollenOben: o?.rollen ?? 0,
  };
}

/** Umgebungen je Bezugs-Käfig merken (≈ 50 ms je Aufbau); Worker-Nachrichten sind Kopien, deshalb ein Wert-Schlüssel. */
const umgebungen = new Map<string, Umgebung>();
function bezugSchluessel(b: readonly number[]): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ Math.round(b[i]! * 1e6), 0x01000193) >>> 0;
  return `${b.length}:${h.toString(16)}`;
}
function umgebungFuer(bezug: readonly number[], n: number): Umgebung {
  const k = bezugSchluessel(bezug);
  let u = umgebungen.get(k);
  if (!u) {
    u = umgebung(bezug, n);
    if (umgebungen.size > 12) umgebungen.delete(umgebungen.keys().next().value!);
    umgebungen.set(k, u);
  }
  return u;
}

/** Florians Form einer Pose als volles Ruhe-Deltafeld auf dem aktuellen Ruhe-Käfig A (ohne Saat). */
export function formRuhe(A: Float64Array, n: number, pose: Pose, vollSkin: Skin | null): Float64Array {
  const form = pose.form;
  if (!form.length) return new Float64Array(3 * n);
  if (pose.formAlt === 'nachKnochen') return deltaFeld(fressenDeltasInRuhe(vollSkin, form), A, n);
  const D = deltaFeld(form, A, n);
  if (pose.bezug && pose.bezug.length === 3 * n) return deltasUebertragen(umgebungFuer(pose.bezug, n), pose.bezug, A, D);
  return D;
}

export type PoseAuswertung = {
  xyz: Float64Array;
  /** gemischte Stellung Σ w·θ (die Knochen, wie sie gezeigt werden) */
  stellung: Stellung;
  /** Knochen posiert in 3D (mit Schlitzmaul), für Zeichnung und Griffe */
  knochen: KnochenPunkte | null;
  /** die bearbeitete Pose (genau eine mit Gewicht 1): Daten für den Pinsel in der Pose */
  bearbeitung: PoseBearbeitung | null;
};

/**
 * Daten der Pose, die gerade bearbeitet wird: Ruhe-Käfig A (neuer Bezug), Drehung je Punkt (3×3 zeilenweise, 9 Werte) der
 * vollen Pose (posierte Zuwächse → Ruhe-Deltas: Rᵀ·ΔX), ihre Form als Ruhe-Deltas auf A (ohne Saat).
 */
export type PoseBearbeitung = { id: string; ruhe: Float64Array; dreh: Float32Array; form: Float64Array };

/**
 * Posen mit Gewichten auswerten. `abl` = Ableitung mit Ruhe-Käfig A (`abl.kaefig.xyz`, samt Pinsel-Deltas der Grundform);
 * `maul` nur mit Schlitzmaul (dann Knochen und Haps-Saat), `opt` dessen wirksame Optionen. Alle Gewichte 0 → A selbst.
 */
export function posenAuswerten(abl: { kaefig: { n: number; xyz: Float64Array } }, maul: MaulErgebnis | null, opt: MaulOptionen | null, posen: readonly Pose[], gewichte: Readonly<Record<string, number>>): PoseAuswertung {
  const A = abl.kaefig.xyz;
  const n = abl.kaefig.n;
  const aktiv = posen.filter((p) => (gewichte[p.id] ?? 0) !== 0);
  const knochenRuhe = maul && opt ? knochenPunkte(maul, opt, { ...STELLUNG_NULL, kieferZug: [0, 0] }) : null;
  if (!aktiv.length) return { xyz: A, stellung: { ...STELLUNG_NULL, kieferZug: [0, 0] }, knochen: knochenRuhe, bearbeitung: null };
  const skinFuer = (st: Stellung): Skin | null => (maul && opt ? skinBerechnen(maul, opt, st) : null);
  const eingaben = aktiv.map((p) => {
    const st = stellungVon(p.stellung);
    const voll = skinFuer(st);
    const D = formRuhe(A, n, p, voll);
    const form = D;
    let summe = D;
    const haps = p.art === 'fressen' ? (p.saat?.haps ?? 0) : 0;
    if (maul && voll && haps > 0) {
      summe = hapsSaat(maul, voll, haps);
      for (let k = 0; k < summe.length; k++) summe[k] = summe[k]! + D[k]!;
    }
    return { pose: p, w: gewichte[p.id]!, st, voll, form, summe };
  });
  const xyz = poseAuswerten(A, eingaben.map((e) => ({ w: e.w, deltas: e.summe, stellung: e.st })), skinFuer);
  const stellung = stellungMischen(eingaben.map((e) => ({ w: e.w, stellung: e.st })));
  const knochen = maul && opt ? knochenPunkte(maul, opt, stellung) : null;
  let bearbeitung: PoseBearbeitung | null = null;
  if (eingaben.length === 1 && eingaben[0]!.w === 1) {
    const e = eingaben[0]!;
    const dreh = new Float32Array(9 * n);
    for (let i = 0; i < n; i++) {
      if (e.voll) for (let k = 0; k < 9; k++) dreh[9 * i + k] = e.voll.r[9 * i + k]!;
      else dreh.set([1, 0, 0, 0, 1, 0, 0, 0, 1], 9 * i);
    }
    bearbeitung = { id: e.pose.id, ruhe: new Float64Array(A), dreh, form: e.form };
  }
  return { xyz, stellung, knochen, bearbeitung };
}

/** Pose-Form aus einem vollen Ruhe-Deltafeld: rechte Hälfte und Naht (z = 0 auf der Naht), ohne Nullen. */
export function formAusFeld(A: ArrayLike<number>, n: number, D: ArrayLike<number>, eps = 1e-9): KaefigDelta[] {
  const out: KaefigDelta[] = [];
  for (let i = 0; i < n; i++) {
    const z = A[3 * i + 2]!;
    if (z < -1e-9) continue;
    const d: [number, number, number] = [D[3 * i]!, D[3 * i + 1]!, Math.abs(z) < 1e-9 ? 0 : D[3 * i + 2]!];
    if (Math.abs(d[0]) > eps || Math.abs(d[1]) > eps || Math.abs(d[2]) > eps) out.push({ punkt: i, d });
  }
  return out;
}

/** Bezugs-Käfig fürs Dokument: Ruhe-Lagen auf 1e-6 gerundet (≈ 0,0005 px). */
export function bezugAus(A: ArrayLike<number>): number[] {
  return Array.from(A, (x) => Math.round(x * 1e6) / 1e6);
}

/**
 * Posen für den Bau: Formen auf die aktuelle Maultopologie umgehängt (Anker), Fressen ohne eigene Stellung bzw. Haps mit
 * den Werten der Maul-Optionen (wie bisher, solange Florian die Knochen in der Pose nicht bewegt hat).
 */
export function posenFuerBau(posen: readonly Pose[], anker: AnkerFeld | null, n0: number, opt: MaulOptionen | null): Pose[] {
  return posen.map((p) => {
    const form = posenUmhaengen(p.form, anker, n0);
    let q: Pose = form === p.form ? p : { ...p, form };
    if (p.art === 'fressen' && opt) {
      if (!p.stellung) q = { ...q, stellung: { kiefer: { winkel: opt.winkelUnten, zug: [opt.kieferZug?.[0] ?? 0, opt.kieferZug?.[1] ?? 0], ziehen: opt.zugWeite }, schaedel: { winkel: opt.winkelOben } } };
      if (p.saat?.haps === undefined) q = { ...q, saat: { ...(p.saat ?? {}), haps: opt.haps } };
    }
    return q;
  });
}
