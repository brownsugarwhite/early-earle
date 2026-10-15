// Phase 2 M6, Schritt 2: Rundmaul (Fisch, Aal) — ein O-Maul an der Körperspitze statt eines Schlitzes. Es nutzt den Aufsatz
// der Augenhöhle (`augenHoehle.ts`): Die vier Käfigflächen um die Mitte der vorderen Kappe werden ersetzt durch den
// Lippenring L1 (äußere Kante, gewölbt), die innere Lippenkante L2 (scharf) und die Kappenmitte als Rachenboden. Öffnen ist
// eine Pose: Der Ring wird weiter, der Rachen tiefer, und die Haut um das Maul dehnt sich radial mit (sonst stieße der Ring
// an die Feldgrenze). Der alte Käfig bleibt die Wahrheit; der Aufsatz ersetzt nur das gezeichnete Netz.

import type { Ableitung } from './ableiten';
import type { HoehlenAuge } from './augenHoehle';
import type { ZahnBau } from './zaehne';
import { type RahmenQuelle, type Zahn, ZAHN_STANDARD, zahnNetze } from './zahnModell';

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

/**
 * Zähne rundum (Aal, `fish_round mouth`): `anzahl` gleiche Zähne am Ring-Zahnfleisch knapp innerhalb der inneren
 * Lippenkante, Beißrichtung zur Ringmitte, nach innen zum Rachen; Länge als Anteil des Lippenradius. `fein` = feine Lagen
 * des Aufsatzes (posiert), `l2` = Index des ersten Punkts der inneren Lippenkante, `boden` = Rachenboden. Für die Anzeige
 * (kein Wählen, keine Prüfung: Die Zahn-Werkzeuge hängen am Schlitzmaul).
 */
export function rundmaulZaehne(fein: ArrayLike<number>, l2: number, boden: number, anzahl: number, laengeAnteil = 0.42): ZahnBau | null {
  const n = Math.max(0, Math.min(40, Math.round(anzahl)));
  if (n === 0) return null;
  const P = (i: number): V3 => [fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!];
  const ring = Array.from({ length: 8 }, (_, k) => P(l2 + k));
  const mitte: V3 = [0, 0, 0];
  for (const p of ring) for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! + p[d]! / 8;
  let r = 0;
  for (const p of ring) r += Math.hypot(p[0] - mitte[0], p[1] - mitte[1], p[2] - mitte[2]) / 8;
  const b = P(boden);
  const ax0: V3 = [mitte[0] - b[0], mitte[1] - b[1], mitte[2] - b[2]];
  const la = Math.hypot(...ax0) || 1;
  const ax: V3 = [ax0[0] / la, ax0[1] / la, ax0[2] / la];
  const e0: V3 = [ring[0]![0] - mitte[0], ring[0]![1] - mitte[1], ring[0]![2] - mitte[2]];
  const dn = e0[0] * ax[0] + e0[1] * ax[1] + e0[2] * ax[2];
  const e1r: V3 = [e0[0] - dn * ax[0], e0[1] - dn * ax[1], e0[2] - dn * ax[2]];
  const l1 = Math.hypot(...e1r) || 1;
  const e1: V3 = [e1r[0] / l1, e1r[1] / l1, e1r[2] / l1];
  const e2: V3 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]];
  const rg = 0.9 * r;
  const tief = 0.12 * r;
  // Rahmen am Ring: u = Anteil des Umfangs; d zur Ringmitte (leicht nach vorn), i zum Rachen, t = d × i (rechtshändig)
  const quelle: RahmenQuelle = (u) => {
    const w = 2 * Math.PI * u;
    const rad: V3 = [e1[0] * Math.cos(w) + e2[0] * Math.sin(w), e1[1] * Math.cos(w) + e2[1] * Math.sin(w), e1[2] * Math.cos(w) + e2[2] * Math.sin(w)];
    const p: V3 = [mitte[0] + rad[0] * rg - ax[0] * tief, mitte[1] + rad[1] * rg - ax[1] * tief, mitte[2] + rad[2] * rg - ax[2] * tief];
    const d0: V3 = [-rad[0] + 0.25 * ax[0], -rad[1] + 0.25 * ax[1], -rad[2] + 0.25 * ax[2]];
    const ld = Math.hypot(...d0);
    const d: V3 = [d0[0] / ld, d0[1] / ld, d0[2] / ld];
    // i: zum Rachen (−Achse), senkrecht zu d
    const di = -(ax[0] * d[0] + ax[1] * d[1] + ax[2] * d[2]);
    const i0: V3 = [-ax[0] - di * d[0], -ax[1] - di * d[1], -ax[2] - di * d[2]];
    const li = Math.hypot(...i0) || 1;
    const i: V3 = [i0[0] / li, i0[1] / li, i0[2] / li];
    const t: V3 = [d[1] * i[2] - d[2] * i[1], d[2] * i[0] - d[0] * i[2], d[0] * i[1] - d[1] * i[0]];
    return { p, t, d, i, rand: p };
  };
  const L = laengeAnteil * r;
  const zaehne: Zahn[] = Array.from({ length: n }, (_, k) => ({ ...ZAHN_STANDARD, laenge: L, breite: 0.42 * L, tiefe: 0.32 * L, schaerfe: 0.75, biegung: 0.1, kiefer: 'oben' as const, u: (k + 0.25) / n, seite: 1 as const }));
  const netz = zahnNetze(zaehne, { oben: quelle, unten: quelle }, 0, 10, 6);
  const zahn = new Uint16Array(netz.positionen.length / 3);
  netz.bereiche.forEach((b2, k) => zahn.fill(k, b2.start, b2.start + b2.anzahl));
  const linie = new Float32Array(3 * 33);
  for (let k = 0; k <= 32; k++) linie.set(quelle(k / 32, 1).p, 3 * k);
  return {
    positionen: netz.positionen,
    normalen: netz.normalen,
    anteil: netz.anteil,
    zahn,
    liste: zaehne.map((z, k) => {
      const r = quelle(z.u, 1);
      return { kiefer: 'oben' as const, index: k, seite: 1 as const, u: z.u, fuss: r.p, spitze: netz.gitter[k]!.spitze, vorn: [-r.i[0], -r.i[1], -r.i[2]] as V3 };
    }),
    reihen: { oben: { anzahl: 0, zaehne: [] }, unten: { anzahl: 0, zaehne: [] } },
    ausDokument: false,
    fleisch: { oben: linie, unten: new Float32Array(0), uOben: Float32Array.from({ length: 33 }, (_, k) => k / 32), uUnten: new Float32Array(0) },
  };
}
