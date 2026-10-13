// VERSUCH (13.10.2026 nachmittags, Meilenstein 2): Spanten je Teil, quer zur Körperachse, für die Bauweise „rund“.
//
// Florian: „Es sollten wirklich 2 getrennte Spanten bearbeitbar sein. So etwas wie eine Acht, die in die andere
// Spiegelhälfte ragt, darf gar nicht existieren.“ und „… der vertikale Spant für Hälse“.
//
// - Ein Spant ist ein Querschnitt quer zur örtlichen Körperachse. In der Seite ist er eine Strecke über **ein** Teil, von
//   Umriss zu Umriss, und darf schräg liegen; bei einem senkrechten Hals liegt sie waagerecht. Ein Klick setzt ihn quer
//   über das Teil (kürzeste Sehne durch den Punkt); eine gezogene Linie über zwei Teile (Schnauze über Bauch) gibt zwei
//   getrennte Spanten.
// - Gespeichert wird ein Punkt der Strecke und ihre Richtung; die Enden liegen immer auf dem Umriss (wandern mit ihm).
// - Der Querschnitt ist ein Halbprofil wie die Front (Achse senkrecht, rechte Hälfte): u = Breite (1 = Breite des runden
//   Körpers an der dicksten Stelle der Strecke), v = Lage auf der Strecke (0 am einen, 1 am anderen Ende). Punkte können
//   die Achse nicht überschreiten; ausgewertet wird u ≥ 0. Eine Acht über die Achse gibt es nicht.
// - Wirkung: Der Spant ersetzt den runden Querschnitt auf seiner Strecke genau. Zwischen zwei Spanten desselben Teils
//   wird Punkt für Punkt überblendet (gleiche Punktstruktur, wie „Angleichen“ in Illustrator), Ecken laufen als Kante
//   weiter. Außerhalb klingt die Wirkung über etwa eine Spantlänge zum runden Körper aus.
//   Jeder Punkt bekommt seine Lage v auf dem Querschnitt aus seiner runden Höhe (auf seiner Seite der dicksten Stelle):
//   Der Umriss (Höhe 0) liegt so genau auf v = 0 bzw. 1, der neue Querschnitt schließt dort, die Seite bleibt genau.

import type { V2 } from '../bezier';
import { punktAuf } from '../bezier';
import type { Profil } from '../profil';
import { segmente } from '../profil';
import { mischeProfile } from '../spanten';

export type RundSpant = {
  /** Punkt auf der Strecke (Seite) */
  p: V2;
  /** Richtung der Strecke (Einheitsvektor; zeigt nach oben bzw. bei waagerechten Strecken nach hinten) */
  richtung: V2;
  /** Halbprofil (Achse senkrecht): Knoten von oben (v = 1) über die rechte Seite nach unten (v = 0) */
  profil: Profil;
};

export type Strecke = { a: V2; b: V2; laenge: number; d: V2; n: V2 };

/** Richtung vereinheitlichen: nach oben, waagerecht nach hinten (+x). */
export function richtungNormal(d: V2): V2 {
  const l = Math.hypot(d.x, d.y) || 1;
  let x = d.x / l;
  let y = d.y / l;
  if (y < -1e-9 || (Math.abs(y) <= 1e-9 && x < 0)) {
    x = -x;
    y = -y;
  }
  return { x, y };
}

/** Strecke eines Spants: Gerade durch p in Richtung d, bis zum Umriss in beide Richtungen. null, wenn p außen liegt. */
export function spantStrecke(umriss: readonly V2[], p: V2, richtung: V2): Strecke | null {
  const d = richtungNormal(richtung);
  let tMin = -Infinity;
  let tMax = Infinity;
  let kreuz = 0;
  for (let i = 0; i < umriss.length; i++) {
    const a = umriss[i]!;
    const b = umriss[(i + 1) % umriss.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-14) continue;
    const wx = a.x - p.x;
    const wy = a.y - p.y;
    const t = (wx * ey - wy * ex) / den;
    const s = (wx * d.y - wy * d.x) / den;
    if (s < 0 || s >= 1) continue;
    if (t > 0) {
      kreuz++;
      tMax = Math.min(tMax, t);
    } else tMin = Math.max(tMin, t);
  }
  if (kreuz % 2 === 0 || !Number.isFinite(tMin) || !Number.isFinite(tMax)) return null;
  const a = { x: p.x + tMin * d.x, y: p.y + tMin * d.y };
  const b = { x: p.x + tMax * d.x, y: p.y + tMax * d.y };
  return { a, b, laenge: tMax - tMin, d, n: { x: -d.y, y: d.x } };
}

/** Kürzeste Sehne durch p (quer über das Teil, in dem p liegt): Richtung in 2°-Schritten gesucht. */
export function kuerzesteSehne(umriss: readonly V2[], p: V2): Strecke | null {
  let best: Strecke | null = null;
  for (let k = 0; k < 90; k++) {
    const w = (k / 90) * Math.PI;
    const s = spantStrecke(umriss, p, { x: Math.cos(w), y: Math.sin(w) });
    if (s && (!best || s.laenge < best.laenge)) best = s;
  }
  return best;
}

/** Gezogene Linie a → b: je Innenstück ein Spant (Mitte des Stücks, Richtung der Linie). */
export function spantenAusLinie(umriss: readonly V2[], a: V2, b: V2): { p: V2; richtung: V2 }[] {
  const d = { x: b.x - a.x, y: b.y - a.y };
  const L = Math.hypot(d.x, d.y);
  if (L < 1e-6) return [];
  const ts: number[] = [];
  for (let i = 0; i < umriss.length; i++) {
    const p = umriss[i]!;
    const q = umriss[(i + 1) % umriss.length]!;
    const ex = q.x - p.x;
    const ey = q.y - p.y;
    const den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-14) continue;
    const wx = p.x - a.x;
    const wy = p.y - a.y;
    const t = (wx * ey - wy * ex) / den;
    const s = (wx * d.y - wy * d.x) / den;
    if (s >= 0 && s < 1) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const out: { p: V2; richtung: V2 }[] = [];
  for (let i = 0; i + 1 < ts.length; i += 2) {
    const m = (ts[i]! + ts[i + 1]!) / 2;
    out.push({ p: { x: a.x + m * d.x, y: a.y + m * d.y }, richtung: d });
  }
  return out;
}

// ---------- Profil auswerten ----------

/** Halbprofil als Zug (u, v), u ≥ 0 (über die Achse hinaus wird abgeschnitten). */
export function profilZug(pr: Profil, proSegment = 24): V2[] {
  const out: V2[] = [];
  segmente(pr).forEach((seg, si) => {
    for (let i = si === 0 ? 0 : 1; i <= proSegment; i++) {
      const p = punktAuf(seg, i / proSegment);
      out.push({ x: Math.max(0, p.x), y: p.y });
    }
  });
  return out;
}

/** u bei Höhe v (äußere Hülle des Zugs: größtes u aller Schnittpunkte; 0 außerhalb). */
export function uBei(zug: readonly V2[], v: number): number {
  let u = 0;
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    if ((a.y <= v && b.y >= v) || (a.y >= v && b.y <= v)) {
      const t = Math.abs(b.y - a.y) > 1e-12 ? (v - a.y) / (b.y - a.y) : 0.5;
      u = Math.max(u, a.x + t * (b.x - a.x));
    }
  }
  return u;
}

/** Tabelle u(v) an n + 1 gleichmäßigen Stellen. */
export function uTabelle(pr: Profil, n = 64): Float64Array {
  const zug = profilZug(pr);
  const t = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) t[k] = uBei(zug, k / n);
  return t;
}

const tabWert = (t: Float64Array, v: number) => {
  const n = t.length - 1;
  const g = Math.min(n, Math.max(0, v * n));
  const i = Math.min(n - 1, Math.floor(g));
  const f = g - i;
  return t[i]! * (1 - f) + t[i + 1]! * f;
};

// ---------- Startprofil aus dem runden Querschnitt ----------

/**
 * Halbprofil mit `knoten` Knoten (≥ 3) nach dem runden Querschnitt u(v) (Tabelle, normiert auf max 1): Knoten gleichmäßig
 * nach Bogenlänge, Griffe tangential mit einem Drittel des Nachbarabstands. Achsknoten oben (v = 1) und unten (v = 0).
 */
export function profilAusTabelle(u: Float64Array, knoten = 3): Profil {
  const n = u.length - 1;
  // Zug von oben (v = 1) über die rechte Seite nach unten (v = 0)
  const zug: V2[] = [];
  for (let k = n; k >= 0; k--) zug.push({ x: u[k]!, y: k / n });
  const bogen = [0];
  for (let i = 1; i < zug.length; i++) bogen.push(bogen[i - 1]! + Math.hypot(zug[i]!.x - zug[i - 1]!.x, zug[i]!.y - zug[i - 1]!.y));
  const L = bogen[bogen.length - 1]!;
  const bei = (s: number): { p: V2; i: number } => {
    let i = 0;
    while (i < zug.length - 2 && bogen[i + 1]! < s) i++;
    const f = bogen[i + 1]! > bogen[i]! ? (s - bogen[i]!) / (bogen[i + 1]! - bogen[i]!) : 0;
    return { p: { x: zug[i]!.x + f * (zug[i + 1]!.x - zug[i]!.x), y: zug[i]!.y + f * (zug[i + 1]!.y - zug[i]!.y) }, i };
  };
  const m = Math.max(3, knoten);
  const pts: V2[] = [];
  for (let k = 0; k < m; k++) pts.push(bei((k / (m - 1)) * L).p);
  pts[0] = { x: 0, y: 1 };
  pts[m - 1] = { x: 0, y: 0 };
  const kn = pts.map((p, k) => {
    // Tangente aus dem Zug (Nachbarn ± 2 % der Länge), an den Achsknoten waagerecht
    let tx: number;
    let ty: number;
    if (k === 0 || k === m - 1) {
      tx = 1;
      ty = 0;
    } else {
      const s = (k / (m - 1)) * L;
      const a = bei(Math.max(0, s - 0.02 * L)).p;
      const b = bei(Math.min(L, s + 0.02 * L)).p;
      tx = b.x - a.x;
      ty = b.y - a.y;
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
    }
    const lEin = k > 0 ? Math.hypot(p.x - pts[k - 1]!.x, p.y - pts[k - 1]!.y) / 3 : 0;
    const lAus = k < m - 1 ? Math.hypot(pts[k + 1]!.x - p.x, pts[k + 1]!.y - p.y) / 3 : 0;
    // Laufrichtung: oben → unten; am oberen Achsknoten zeigt „aus“ nach rechts, am unteren „ein“ nach rechts
    if (k === 0) return { p, ein: { x: lAus, y: 0 }, aus: { x: lAus, y: 0 }, art: 'glatt' as const };
    if (k === m - 1) return { p, ein: { x: lEin, y: 0 }, aus: { x: lEin, y: 0 }, art: 'glatt' as const };
    // Tangente in Laufrichtung (v nimmt ab)
    if (ty > 0) {
      tx = -tx;
      ty = -ty;
    }
    return { p, ein: { x: -tx * lEin, y: -ty * lEin }, aus: { x: tx * lAus, y: ty * lAus }, art: 'glatt' as const };
  });
  // Grifflängen je Segment nach kleinsten Quadraten an den Zug anpassen (Richtungen bleiben): der neue Spant soll die
  // Form nicht ändern
  for (let k = 0; k + 1 < m; k++) {
    const s0 = (k / (m - 1)) * L;
    const s1 = ((k + 1) / (m - 1)) * L;
    const proben: V2[] = [];
    for (let q = 1; q < 16; q++) proben.push(bei(s0 + (q / 16) * (s1 - s0)).p);
    const p0 = kn[k]!.p;
    const p3 = kn[k + 1]!.p;
    const lA = Math.hypot(kn[k]!.aus.x, kn[k]!.aus.y) || 1;
    const lB = Math.hypot(kn[k + 1]!.ein.x, kn[k + 1]!.ein.y) || 1;
    const dA = { x: kn[k]!.aus.x / lA, y: kn[k]!.aus.y / lA };
    const dB = { x: kn[k + 1]!.ein.x / lB, y: kn[k + 1]!.ein.y / lB };
    let a11 = 0;
    let a12 = 0;
    let a22 = 0;
    let r1 = 0;
    let r2 = 0;
    proben.forEach((pp, q) => {
      const t = (q + 1) / 16;
      const w = 1 - t;
      const b0 = w * w * w + 3 * w * w * t;
      const b3 = 3 * w * t * t + t * t * t;
      const b1 = 3 * w * w * t;
      const b2 = 3 * w * t * t;
      const cx = pp.x - b0 * p0.x - b3 * p3.x;
      const cy = pp.y - b0 * p0.y - b3 * p3.y;
      const A1x = dA.x * b1;
      const A1y = dA.y * b1;
      const A2x = dB.x * b2;
      const A2y = dB.y * b2;
      a11 += A1x * A1x + A1y * A1y;
      a12 += A1x * A2x + A1y * A2y;
      a22 += A2x * A2x + A2y * A2y;
      r1 += A1x * cx + A1y * cy;
      r2 += A2x * cx + A2y * cy;
    });
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-14) continue;
    const alpha = (r1 * a22 - r2 * a12) / det;
    const beta = (a11 * r2 - a12 * r1) / det;
    if (!(alpha > 1e-4 && beta > 1e-4)) continue;
    kn[k] = { ...kn[k]!, aus: { x: dA.x * alpha, y: dA.y * alpha } };
    kn[k + 1] = { ...kn[k + 1]!, ein: { x: dB.x * beta, y: dB.y * beta } };
    // Achsknoten: Spiegelgriff gleich
    if (k === 0) kn[0] = { ...kn[0]!, ein: { ...kn[0]!.aus } };
    if (k + 1 === m - 1) kn[m - 1] = { ...kn[m - 1]!, aus: { ...kn[m - 1]!.ein } };
  }
  return { art: 'halb', achse: 'senkrecht', knoten: kn };
}

// ---------- Wirkung auf die runde Dicke ----------

/** Runde Dicke an einem Punkt der Seite (Auswertung im 2D-Netz). */
export type DickeBei = (p: V2) => number;

type SpantDaten = {
  s: Strecke;
  /** runde Dicke entlang der Strecke, normiert (max 1), und ihr Maximum */
  rund: Float64Array;
  zMax: number;
  profil: Profil;
  tabelle: Float64Array;
};

/** Ein Paar benachbarter Spanten desselben Teils und gemischte Tabellen über s (für die Überblendung Punkt für Punkt). */
type Paar = { i: number; j: number; gemischt: Float64Array[] };

const STUFEN = 32;

export type SpantWirkung = {
  /** neue halbe Dicke je Punkt der Seite aus der runden (unverändert, wo kein Spant wirkt) */
  dicke: (p: V2, zRund: number) => number;
  /** Strecken der Spanten (für Anzeige und Tests) */
  strecken: (Strecke | null)[];
  /** größte runde Dicke je Spant (für die Normierung der Breite) */
  zMax: number[];
};

/** Wirkung der Spanten auf den runden Körper. `umriss` = Seitenumriss (Polygon), `dicke` = runde halbe Dicke. */
export function spantWirkung(spanten: readonly RundSpant[], umriss: readonly V2[], dicke: DickeBei, innen: (p: V2) => boolean): SpantWirkung {
  const daten: (SpantDaten | null)[] = spanten.map((sp) => {
    const s = spantStrecke(umriss, sp.p, sp.richtung);
    if (!s || s.laenge < 1e-4) return null;
    const n = 64;
    const rund = new Float64Array(n + 1);
    let zMax = 0;
    for (let k = 0; k <= n; k++) {
      const v = k / n;
      const z = k === 0 || k === n ? 0 : dicke({ x: s.a.x + v * (s.b.x - s.a.x), y: s.a.y + v * (s.b.y - s.a.y) });
      rund[k] = z;
      zMax = Math.max(zMax, z);
    }
    if (zMax <= 1e-9) return null;
    for (let k = 0; k <= n; k++) rund[k] = rund[k]! / zMax;
    return { s, rund, zMax, profil: sp.profil, tabelle: uTabelle(sp.profil, n) };
  });
  // Nachbarn: Verbindung der Mitten liegt innen, kein anderer Spant dazwischen, gleiche Punktstruktur
  const mitte = (s: Strecke) => ({ x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 });
  const paare: Paar[] = [];
  for (let i = 0; i < daten.length; i++) {
    for (let j = i + 1; j < daten.length; j++) {
      const di = daten[i];
      const dj = daten[j];
      if (!di || !dj || di.profil.knoten.length !== dj.profil.knoten.length) continue;
      const mi = mitte(di.s);
      const mj = mitte(dj.s);
      let frei = true;
      for (let k = 1; k < 12 && frei; k++) {
        const t = k / 12;
        if (!innen({ x: mi.x + t * (mj.x - mi.x), y: mi.y + t * (mj.y - mi.y) })) frei = false;
      }
      if (!frei) continue;
      // kein anderer Spant dazwischen (seine Mitte nahe der Verbindung, zwischen den beiden)
      const dazwischen = daten.some((dk, k) => {
        if (!dk || k === i || k === j) return false;
        const mk = mitte(dk.s);
        const ex = mj.x - mi.x;
        const ey = mj.y - mi.y;
        const l2 = ex * ex + ey * ey;
        const t = ((mk.x - mi.x) * ex + (mk.y - mi.y) * ey) / l2;
        if (t <= 0 || t >= 1) return false;
        const ab = Math.hypot(mi.x + t * ex - mk.x, mi.y + t * ey - mk.y);
        return ab < 0.5 * Math.max(di.s.laenge, dj.s.laenge);
      });
      if (dazwischen) continue;
      // nicht verdreht: die Verbindungen a_i–a_j und b_i–b_j kreuzen sich nicht (sonst gehören sie nicht zusammen)
      const kreuzen = (p1: V2, p2: V2, q1: V2, q2: V2) => {
        const o = (a: V2, b: V2, c: V2) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        return o(p1, p2, q1) * o(p1, p2, q2) < 0 && o(q1, q2, p1) * o(q1, q2, p2) < 0;
      };
      if (kreuzen(di.s.a, dj.s.a, di.s.b, dj.s.b)) continue;
      // Abstand der Mitten nicht größer als das Vierfache der längeren Strecke (sonst eigene Teile)
      if (Math.hypot(mj.x - mi.x, mj.y - mi.y) > 4 * Math.max(di.s.laenge, dj.s.laenge)) continue;
      const gemischt: Float64Array[] = [];
      for (let k = 0; k <= STUFEN; k++) gemischt.push(uTabelle(mischeProfile(di.profil, dj.profil, k / STUFEN), 64));
      paare.push({ i, j, gemischt });
    }
  }

  /** (s, v) im Viereck zweier Strecken: P(s, v) = (1 − s)·(a_i + v (b_i − a_i)) + s·(a_j + v (b_j − a_j)) (Newton). */
  const viereck = (si: Strecke, sj: Strecke, p: V2): { s: number; v: number } | null => {
    let s = 0.5;
    let v = 0.5;
    for (let it = 0; it < 12; it++) {
      const ax = si.a.x + v * (si.b.x - si.a.x);
      const ay = si.a.y + v * (si.b.y - si.a.y);
      const bx = sj.a.x + v * (sj.b.x - sj.a.x);
      const by = sj.a.y + v * (sj.b.y - sj.a.y);
      const fx = (1 - s) * ax + s * bx - p.x;
      const fy = (1 - s) * ay + s * by - p.y;
      // Ableitungen
      const dsx = bx - ax;
      const dsy = by - ay;
      const dvx = (1 - s) * (si.b.x - si.a.x) + s * (sj.b.x - sj.a.x);
      const dvy = (1 - s) * (si.b.y - si.a.y) + s * (sj.b.y - sj.a.y);
      const det = dsx * dvy - dsy * dvx;
      if (Math.abs(det) < 1e-14) return null;
      const ds = (fx * dvy - fy * dvx) / det;
      const dv = (dsx * fy - dsy * fx) / det;
      s -= ds;
      v -= dv;
      if (Math.abs(ds) + Math.abs(dv) < 1e-10) break;
    }
    return Number.isFinite(s) && Number.isFinite(v) ? { s, v } : null;
  };

  /**
   * Lage v auf dem Querschnitt aus der runden Höhe: Auf der Seite (vor oder hinter der dicksten Stelle), auf der der Punkt
   * liegt, ist die runde Dicke monoton; die Stelle mit derselben runden Höhe ist seine Lage. So landet der Umriss
   * (runde Höhe 0) genau auf v = 0 bzw. 1 und der neue Querschnitt schließt dort, und auf der Spantstrecke ist v genau
   * die Lage auf der Strecke.
   */
  const lageAusHoehe = (rund: (v: number) => number, vMax: number, r: number, vGerade: number): number => {
    if (r >= 1) return vMax;
    const unten = vGerade <= vMax;
    let lo = unten ? 0 : vMax;
    let hi = unten ? vMax : 1;
    for (let it = 0; it < 24; it++) {
      const m = (lo + hi) / 2;
      const w = rund(m);
      // unten steigt die runde Dicke mit v, oben fällt sie
      if (unten ? w < r : w > r) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  };
  const argMax = (t: (v: number) => number) => {
    let best = 0.5;
    let bw = -1;
    for (let k = 1; k < 64; k++) {
      const w = t(k / 64);
      if (w > bw) {
        bw = w;
        best = k / 64;
      }
    }
    return best;
  };
  const vMaxSpant = daten.map((d) => (d ? argMax((v) => tabWert(d.rund, v)) : 0.5));

  /** neue halbe Dicke an p aus der runden (zRund); unverändert, wo kein Spant wirkt */
  const neueDicke = (p: V2, zRund: number): number => {
    // zwischen zwei Nachbarn: Punkt für Punkt überblendet
    for (const pr of paare) {
      const di = daten[pr.i]!;
      const dj = daten[pr.j]!;
      const sv = viereck(di.s, dj.s, p);
      if (!sv || sv.s < 0 || sv.s > 1 || sv.v < -0.25 || sv.v > 1.25) continue;
      const s = sv.s;
      const zM = (1 - s) * di.zMax + s * dj.zMax;
      const rund = (v: number) => (1 - s) * tabWert(di.rund, v) + s * tabWert(dj.rund, v);
      const vM = (1 - s) * vMaxSpant[pr.i]! + s * vMaxSpant[pr.j]!;
      const v = lageAusHoehe(rund, vM, Math.max(0, zRund / zM), sv.v);
      const g = s * STUFEN;
      const k = Math.min(STUFEN - 1, Math.floor(g));
      const f = g - k;
      const u = (1 - f) * tabWert(pr.gemischt[k]!, v) + f * tabWert(pr.gemischt[k + 1]!, v);
      return zM * u;
    }
    // sonst: einzelne Spanten, Wirkung klingt über eine Spantlänge aus
    let summeW = 0;
    let summe = 0;
    daten.forEach((d, i) => {
      if (!d) return;
      const wx = p.x - d.s.a.x;
      const wy = p.y - d.s.a.y;
      const vG = (wx * d.s.d.x + wy * d.s.d.y) / d.s.laenge;
      if (vG < -0.25 || vG > 1.25) return;
      const abst = Math.abs(wx * d.s.n.x + wy * d.s.n.y);
      const reichweite = 0.75 * d.s.laenge;
      if (abst >= reichweite) return;
      const x = 1 - abst / reichweite;
      const w = x * x * (3 - 2 * x);
      // Querschnitt des Spants auf die runde Höhe hier übertragen (Breite des runden Körpers an dieser Stelle)
      const v = lageAusHoehe((q) => tabWert(d.rund, q), vMaxSpant[i]!, Math.max(0, zRund / d.zMax), vG);
      summe += w * d.zMax * tabWert(d.tabelle, v);
      summeW += w;
    });
    if (summeW <= 0) return zRund;
    const w = Math.min(1, summeW);
    return (1 - w) * zRund + w * (summe / summeW);
  };
  return { dicke: neueDicke, strecken: daten.map((d) => d?.s ?? null), zMax: daten.map((d) => d?.zMax ?? 0) };
}

/**
 * Neuer Spant an p mit Richtung (oder kürzeste Sehne): Profil = der Querschnitt, den der Körper dort jetzt hat (die Form
 * ändert sich nicht). `dicke` = jetzige halbe Dicke, `dickeRund` = runde (ohne Spanten): Breite 1 = runder Körper.
 */
export function rundSpantNeu(umriss: readonly V2[], dicke: DickeBei, p: V2, richtung: V2 | null, knoten = 3, dickeRund: DickeBei = dicke): RundSpant | null {
  const s = richtung ? spantStrecke(umriss, p, richtung) : kuerzesteSehne(umriss, p);
  if (!s) return null;
  const n = 64;
  const u = new Float64Array(n + 1);
  let m = 0;
  for (let k = 1; k < n; k++) {
    const v = k / n;
    const q = { x: s.a.x + v * (s.b.x - s.a.x), y: s.a.y + v * (s.b.y - s.a.y) };
    u[k] = dicke(q);
    m = Math.max(m, dickeRund(q));
  }
  if (m <= 1e-9) return null;
  for (let k = 0; k <= n; k++) u[k] = u[k]! / m;
  const mitte = { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
  return { p: mitte, richtung: s.d, profil: profilAusTabelle(u, knoten) };
}
