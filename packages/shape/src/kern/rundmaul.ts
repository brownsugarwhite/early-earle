// Phase 2 M6, Schritt 2: Rundmaul (Fisch, Aal) — ein O-Maul an der Körperspitze statt eines Schlitzes. Es nutzt den Aufsatz
// der Augenhöhle (`augenHoehle.ts`): Die vier Käfigflächen um die Mitte der vorderen Kappe werden ersetzt durch den
// Lippenring L1 (äußere Kante, gewölbt), die innere Lippenkante L2 (scharf) und die Kappenmitte als Rachenboden. Öffnen ist
// eine Pose: Der Ring wird weiter, der Rachen tiefer, und die Haut um das Maul dehnt sich radial mit (sonst stieße der Ring
// an die Feldgrenze). Der alte Käfig bleibt die Wahrheit; der Aufsatz ersetzt nur das gezeichnete Netz.

import type { Ableitung } from './ableiten';
import type { HoehlenAuge } from './augenHoehle';

type V3 = [number, number, number];

/** Maße als Anteil der Körperhöhe; Lippe als Anteil des Lippenradius. */
export type RundmaulForm = {
  /** Lippenradius zu (kleines O) und offen */
  zu: number;
  auf: number;
  /** Lippendicke: innere Kante bei (1 − lippe) · Radius */
  lippe: number;
  /** Wölbung der Lippe nach vorn (Anteil des Radius) */
  wulst: number;
  /** Rachentiefe zu und offen */
  tiefeZu: number;
  tiefeAuf: number;
  /** Dehnung der Haut beim Öffnen (Anteil der Radiuszunahme) und ihre Reichweite um die Spitze */
  dehnung: number;
  reichweite: number;
};

export const RUNDMAUL_STANDARD: RundmaulForm = { zu: 0.035, auf: 0.17, lippe: 0.24, wulst: 0.18, tiefeZu: 0.1, tiefeAuf: 0.32, dehnung: 1.15, reichweite: 0.45 };

/** Käfigpunkt in der Mitte der vorderen Kappe (die Spitze des Körpers), dort sitzt das Rundmaul. */
export function rundmaulZentrum(abl: Ableitung): number {
  const v = abl.vorlage;
  return v.kappe('vorn', v.c / 2, v.c / 2);
}

/** Achse der Spitze: Mittel der Normalen der Käfigflächen um die Mitte (zeigt nach vorn, aus dem Körper). */
function achse(abl: Ableitung, xyz: Float64Array, c: number): V3 {
  const k = abl.kaefig;
  const n: V3 = [0, 0, 0];
  for (let i = k.vFStart[c]!; i < k.vFStart[c + 1]!; i++) {
    const f = k.vFlaechen[i]!;
    const a = k.fStart[f]!;
    const b = k.fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const p = k.fVerts[h]!;
      const q = k.fVerts[h + 1 < b ? h + 1 : a]!;
      n[0] += (xyz[3 * p + 1]! - xyz[3 * q + 1]!) * (xyz[3 * p + 2]! + xyz[3 * q + 2]!);
      n[1] += (xyz[3 * p + 2]! - xyz[3 * q + 2]!) * (xyz[3 * p]! + xyz[3 * q]!);
      n[2] += (xyz[3 * p]! - xyz[3 * q]!) * (xyz[3 * p + 1]! + xyz[3 * q + 1]!);
    }
  }
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Lippenradius bei der Öffnung (Welt). */
export const rundmaulRadius = (form: RundmaulForm, oeffnung: number, hoehe: number) => (form.zu + (form.auf - form.zu) * Math.max(0, Math.min(1, oeffnung))) * hoehe;

/**
 * Pose des Rundmauls auf dem alten Käfig: Punkte der Vorlage um die Spitze (Ruhelage näher als `reichweite`) wandern radial
 * von der Achse weg, um die Radiuszunahme mal `dehnung`, weich abfallend (smoothstep). Die Spitze selbst bleibt.
 */
export function rundmaulPose(abl: Ableitung, xyz: Float64Array, oeffnung: number, hoehe: number, form: RundmaulForm = RUNDMAUL_STANDARD): Float64Array {
  const out = new Float64Array(xyz);
  if (oeffnung <= 0) return out;
  const c = rundmaulZentrum(abl);
  const R0 = abl.kaefig.xyz;
  const n = achse(abl, R0, c);
  const zuwachs = (rundmaulRadius(form, oeffnung, hoehe) - rundmaulRadius(form, 0, hoehe)) * form.dehnung;
  const reich = form.reichweite * hoehe;
  const cx = R0[3 * c]!;
  const cy = R0[3 * c + 1]!;
  const cz = R0[3 * c + 2]!;
  const nV = abl.vorlage.kaefig.n;
  for (let i = 0; i < nV; i++) {
    if (i === c) continue;
    const d: V3 = [R0[3 * i]! - cx, R0[3 * i + 1]! - cy, R0[3 * i + 2]! - cz];
    const dist = Math.hypot(...d);
    if (dist >= reich) continue;
    const dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
    const t: V3 = [d[0] - dn * n[0], d[1] - dn * n[1], d[2] - dn * n[2]];
    const lt = Math.hypot(...t);
    if (lt < 1e-9) continue;
    const x = 1 - dist / reich;
    const w = x * x * (3 - 2 * x);
    for (let k = 0; k < 3; k++) out[3 * i + k] = out[3 * i + k]! + (t[k]! / lt) * zuwachs * w;
  }
  return out;
}

/** Eintrag für den Aufsatz (`hoehlenTopologie`/`hoehlenLagen`): Rundmaul an der Spitze bei der Öffnung. */
export function rundmaulEintrag(abl: Ableitung, oeffnung: number, hoehe: number, form: RundmaulForm = RUNDMAUL_STANDARD): HoehlenAuge {
  const r1 = rundmaulRadius(form, oeffnung, hoehe);
  const o = Math.max(0, Math.min(1, oeffnung));
  return {
    c: rundmaulZentrum(abl),
    radius: r1,
    oben: [0, 1, 0],
    mund: { r1, r2: r1 * (1 - form.lippe), wulst: form.wulst * r1, tiefe: (form.tiefeZu + (form.tiefeAuf - form.tiefeZu) * o) * hoehe },
    schaerfe: { l1: 2, l2: 2 },
  };
}

/**
 * Regionen für die Deskriptoren: L1 ist die Lippenkante (Kante 1, Abstand 0), L2 der Lippensaum innen (Rachen 0,5), der
 * Boden die Rachenwand (Rachen 1); die Haut bekommt ihren Abstand zum Lippenring (Ruhelage, in Körperhöhen), so malt das
 * Material das Lippenband ums O.
 */
export function rundmaulRegion(abl: Ableitung, eintrag: number, nAlt: number, hoehe: number, form: RundmaulForm = RUNDMAUL_STANDARD): (i: number) => { rachen?: number; abstand?: number; kante?: number } | null {
  const c = rundmaulZentrum(abl);
  const R0 = abl.kaefig.xyz;
  const r1 = rundmaulRadius(form, 0, hoehe);
  const l1 = nAlt + 16 * eintrag;
  const l2 = l1 + 8;
  return (i) => {
    if (i === c) return { rachen: 1, abstand: 0, kante: 0 };
    if (i >= l1 && i < l1 + 8) return { rachen: 0, abstand: 0, kante: 1 };
    if (i >= l2 && i < l2 + 8) return { rachen: 0.5, abstand: 0, kante: 0 };
    if (i >= nAlt) return null;
    const d = Math.hypot(R0[3 * i]! - R0[3 * c]!, R0[3 * i + 1]! - R0[3 * c + 1]!, R0[3 * i + 2]! - R0[3 * c + 2]!);
    return { abstand: Math.max(0, d - r1) / hoehe };
  };
}
