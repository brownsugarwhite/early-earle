// VERSUCH (12.10.2026): Kanten im Käfig. Florians Rückmeldung 12.10. mittags (Plan docs/plans/2026-10-12-kanten-ansichten.md):
// - Überall in einer 2D-Ansicht eine Linie setzen. Härte 0 = mögliche Kante, Übergang ganz glatt; 1 = ganz scharf.
//   Die Härte darf entlang der Linie wechseln (die Kante läuft weich aus).
// - Bildet er mit den Griffen einer Silhouette eine Ecke, ist sie eine Kante im 3D und erscheint in den anderen Ansichten.
//
// Bauweise (Shapes → Loft → Käfig):
// 1. Loft S(f, u): Station f ∈ [0, 1] von vorn nach hinten (Höhe aus der Seite, Breite aus dem Top, auf die Länge der
//    Seite gestreckt), u = Stützstelle der Front-Hälfte (0 oben … `halb` unten). Ecken der Front liegen auf ganzen u.
//    Entspricht `ringKontext` mit `kastenBis = 0` (überall der Front-Querschnitt).
// 2. `eckKanten`: abgeleitete Kanten für die 2D-Anzeige. Front-Ecke → Längslinie S(f, u_Ecke), zu den Polen auslaufend;
//    Ecke in Seite oder Top → Ring bei x_Ecke, gewichtet nach der Ringnormale gegen die Außenrichtung der Ecke.
// 3. `kantenKaefig`: Röhrenkäfig wie beim Tiger (4×4-Kappe vorn, Pol hinten). Ringe gleichmäßig nach der Bogenlänge der
//    Umrisse (wahlweise nach `formStationen`), genau auf Ecken, Querlinien und Linienenden. Front-Ecken und Längslinien
//    belegen feste Ringindizes (Ringpunkt genau auf der Linie), die freien Punkte liegen gleichmäßig nach Bogenlänge
//    dazwischen; eine Querlinie bekommt einen gekippten Ring, freie Nachbarringe neigen sich mit. Schärfe = Härte · Stufen
//    je Käfigkante, entlang der Linie verlaufend; dann `anZielAnpassen`. Was die Ringbauweise nicht trägt (schräge Linien,
//    Linien über die Kappe), steht in `hinweise`; der Käfig bleibt dabei geschlossen und faltet nicht.
//
// Koordinaten wie im Editor: x = hinten (vorn ist −x), y = oben, z = rechts in der Front; Linien und Kanten liegen auf
// der rechten Hälfte (z ≥ 0), die linke ist ihr Spiegelbild. Einheit Kachel, ohne `skalierung` (wie Tiger und Maul).

import { type Kubik, type V2, bogenlaenge, laengeV, normiert, punktAuf } from '../bezier';
import { ANSICHTEN, type Ansicht, type Blick, type Dokument, type Kante } from '../dokument';
import { schnitte } from '../platzhalter/loft';
import { type Profil, istAchsKnoten, pfadAbtasten, segmente, spiegeln, vollerPfad } from '../profil';
import { vorlageBei } from '../spanten';
import { type Netz, type V3, kante, unterteilen } from './catmullClark';
import { abtasten3 } from './linie3d';
import { ketteUnterteilen } from './pruefen';
import { anZielAnpassen, formStationen, kappenRandJ } from './tigerKaefig';

export type KantenOptionen = {
  /** Grundzahl der Ringe; sie wächst nur, wenn mehr Ringe fest vergeben sind, als Platz ist */
  ringe: number;
  /** Punkte je Ring (durch 4 teilbar: 4×4-Kappe vorn) */
  ring: number;
  /** Unterteilungsstufen S: Härte h → Schärfe h · S (1 = scharf bis in die letzte Stufe) */
  stufen: number;
  /** Durchgänge der inversen Unterteilung (`anZielAnpassen`) */
  iterationen: number;
  /** Stützstellen eines feinen Querschnitts (ganzer Ring; die Hälfte trägt die Front-Ecken) */
  fein: number;
  /** kleinster sichtbarer Knick einer Profilecke (Grad) */
  minKnick: number;
  /**
   * Freie Linienenden: Anteil der Schärfe auf der letzten Käfigkante (1 = volle Härte bis zum Ende; kleiner = die Kante
   * klingt auf dem letzten Ringabstand aus, ohne die Kerbe, die eine scharf endende Kante in Catmull-Clark macht)
   */
  endKante: number;
  /**
   * Verteilung der Ringe: 'form' = `formStationen` (Krümmung, Ring 1 bei 0,4 % wie beim Tiger), 'bogen' = gleichmäßig
   * nach der Bogenlänge der Umrisse (an runden Enden dichter, Kappe über zwei Ringabstände), 'misch' = Mittel aus beiden.
   */
  verteilung: 'form' | 'bogen' | 'misch';
};

export const KANTEN_STANDARD: KantenOptionen = { ringe: 18, ring: 16, stufen: 3, iterationen: 8, fein: 96, minKnick: 5, endKante: 0.5, verteilung: 'bogen' };

/** Ecken näher als 2 % der Länge an einem Ende sitzen am Pol (wie in `formStationen`). */
const POL = 0.02;
/** Station des vordersten Rings (Rand der Kappe) wie beim Tiger; hinten entsprechend für Ecken am Pol. */
const KAPPE = 0.004;
/** Zwangsstationen, die näher beieinander liegen, teilen sich einen Ring. */
const ZUSAMMEN = 0.008;
/** Gewicht einer Ringkante aus Seite/Top: glatt(a, b, Ringnormale · Außenrichtung). */
const GEWICHT_A = 0.15;
const GEWICHT_B = 0.85;
/** Längskanten der Front laufen aus, wenn der Querschnitt kleiner als dieser Anteil des größten wird. */
const AUSLAUF = 0.5;
/** Längslinien klingen über so viele Ringe hinter ihrem Ende zur freien Verteilung aus. */
const NACHLAUF = 2;

const glatt = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- Ecken der Profile ----------

export type ProfilEcke = {
  ansicht: Ansicht;
  knoten: number;
  /** Lage in der Ansicht (Seite x/y, Front z/y, Top x/z) */
  p: V2;
  /** Knick der Tangenten in Grad (0 = glatt) */
  knick: number;
  /** Härte als Kante im 3D (Knoten.haerte, Standard 1) */
  haerte: number;
  /** Außenrichtung (Winkelhalbierende der Außennormalen beider Seiten) in Ansichtskoordinaten */
  aussen: V2;
  /** Achsknoten eines Halbprofils (Knick zwischen Hälfte und Spiegelbild) */
  achse: boolean;
  /**
   * Front mit Spanten: Härte an der Stelle f (Ecke im Spant überblendet; glatter Punkt = 0). Fehlt = überall `haerte`.
   * Ecken, die nur in Spanten stehen, kommen so ebenfalls als Längskante.
   */
  haerteBei?: (f: number) => number;
};

/** Härte einer Ecke an der Stelle f (mit Spanten verlaufend). */
const haerteAn = (e: ProfilEcke, f: number) => (e.haerteBei ? e.haerteBei(f) : e.haerte);

function richtungEnde(seg: Kubik): V2 {
  const [p0, p1, p2, p3] = seg;
  for (const q of [p2, p1, p0]) {
    const d = { x: p3.x - q.x, y: p3.y - q.y };
    if (laengeV(d) > 1e-9) return normiert(d);
  }
  return { x: 0, y: 0 };
}

function richtungStart(seg: Kubik): V2 {
  const [p0, p1, p2, p3] = seg;
  for (const q of [p1, p2, p3]) {
    const d = { x: q.x - p0.x, y: q.y - p0.y };
    if (laengeV(d) > 1e-9) return normiert(d);
  }
  return { x: 0, y: 0 };
}

/** Ankunfts- und Abfahrtsrichtung der Kurve am Knoten k (Achsknoten: zwischen Hälfte und Spiegelbild). */
function knotenTangenten(pr: Profil, k: number): { rein: V2; raus: V2 } {
  const segs = segmente(pr);
  const n = pr.knoten.length;
  if (pr.art === 'geschlossen') return { rein: richtungEnde(segs[(k - 1 + n) % n]!), raus: richtungStart(segs[k]!) };
  const gegen = (v: V2): V2 => {
    const m = spiegeln(v, pr.achse);
    return { x: -m.x, y: -m.y };
  };
  if (k === 0) {
    const raus = richtungStart(segs[0]!);
    return { rein: gegen(raus), raus };
  }
  if (k === n - 1) {
    const rein = richtungEnde(segs[n - 2]!);
    return { rein, raus: gegen(rein) };
  }
  return { rein: richtungEnde(segs[k - 1]!), raus: richtungStart(segs[k]!) };
}

/** Umlaufsinn des ganzen Umrisses (Halbprofile mit Spiegelbild): true = gegen den Uhrzeigersinn. */
function gegenUhr(pr: Profil): boolean {
  const pts = pfadAbtasten(vollerPfad(pr), 8);
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a > 0;
}

/**
 * Sichtbare Ecken der drei Profile: Knoten, an denen die Tangenten um mehr als `minKnick` Grad abknicken. Achsknoten der
 * Halbprofile zählen (z. B. spitzer First oben auf der Front = Grat entlang des Rückens).
 */
export function profilEcken(dok: Dokument, minKnick = KANTEN_STANDARD.minKnick): ProfilEcke[] {
  const out: ProfilEcke[] = [];
  for (const ansicht of ANSICHTEN) {
    const pr = dok.profile[ansicht];
    const ccw = gegenUhr(pr);
    const aussenVon = (t: V2): V2 => (ccw ? { x: t.y, y: -t.x } : { x: -t.y, y: t.x });
    pr.knoten.forEach((kn, k) => {
      const t = knotenTangenten(pr, k);
      if (laengeV(t.rein) < 0.5 || laengeV(t.raus) < 0.5) return;
      const c = Math.min(1, Math.max(-1, t.rein.x * t.raus.x + t.rein.y * t.raus.y));
      const knick = (Math.acos(c) * 180) / Math.PI;
      if (!(knick > minKnick)) return;
      const a1 = aussenVon(t.rein);
      const a2 = aussenVon(t.raus);
      let aussen = normiert({ x: a1.x + a2.x, y: a1.y + a2.y });
      if (laengeV(aussen) < 0.5) aussen = a1;
      const haerte = Math.min(1, Math.max(0, kn.art === 'ecke' ? kn.haerte ?? 1 : 1));
      out.push({ ansicht, knoten: k, p: { x: kn.p.x, y: kn.p.y }, knick, haerte, aussen, achse: istAchsKnoten(pr, k) });
    });
  }
  // Spanten (Versuch 12.10.): Ecken eines Spants laufen längs durch die Spanten; ihre Härte überblendet von Spant zu
  // Spant (glatter Punkt = 0). Die Front zählt als Hauptspant.
  if (dok.spanten?.length) {
    const front = dok.profile.front;
    const haerteBei = (k: number) => (f: number) => vorlageBei(dok, f, 8).haerte[k] ?? 0;
    for (const e of out) if (e.ansicht === 'front') e.haerteBei = haerteBei(e.knoten);
    for (let k = 0; k < front.knoten.length; k++) {
      if (out.some((e) => e.ansicht === 'front' && e.knoten === k)) continue;
      // sichtbare Ecke in einem Spant (Knick in seinem normierten Profil)?
      let best: { sp: Profil; knick: number } | null = null;
      for (const sp of dok.spanten) {
        if (sp.profil.knoten.length !== front.knoten.length || sp.profil.knoten[k]?.art !== 'ecke') continue;
        const t = knotenTangenten(sp.profil, k);
        if (laengeV(t.rein) < 0.5 || laengeV(t.raus) < 0.5) continue;
        const knick = (Math.acos(Math.min(1, Math.max(-1, t.rein.x * t.raus.x + t.rein.y * t.raus.y))) * 180) / Math.PI;
        if (knick > minKnick && (!best || knick > best.knick)) best = { sp: sp.profil, knick };
      }
      if (!best) continue;
      const t = knotenTangenten(best.sp, k);
      const ccw = gegenUhr(best.sp);
      const aussenVon = (v: V2): V2 => (ccw ? { x: v.y, y: -v.x } : { x: -v.y, y: v.x });
      const a1 = aussenVon(t.rein);
      const a2 = aussenVon(t.raus);
      let aussen = normiert({ x: a1.x + a2.x, y: a1.y + a2.y });
      if (laengeV(aussen) < 0.5) aussen = a1;
      const kn = front.knoten[k]!;
      out.push({ ansicht: 'front', knoten: k, p: { x: kn.p.x, y: kn.p.y }, knick: best.knick, haerte: 1, aussen, achse: istAchsKnoten(front, k), haerteBei: haerteBei(k) });
    }
  }
  return out;
}

// ---------- Loft ----------

/** Front-Hälfte als normierte Stützstellen (x = Breite 0…1, y = Höhe 0…1) und Stützstelle jedes Knotens. */
export type FrontVorlage = { q: V2[]; knoten: number[] };

/**
 * Wie `querschnitt` (gleiche Verteilung, gleiche Normierung), dazu die Stützstelle jedes Front-Knotens: Bei höchstens
 * `n` Segmenten liegen Knoten (und damit Ecken) genau auf Stützstellen. Der Test prüft die Gleichheit mit `querschnitt`.
 */
export function frontVorlage(dok: Dokument, n: number): FrontVorlage {
  const segs = segmente(dok.profile.front);
  const pts: V2[] = [];
  const knoten: number[] = [];
  if (segs.length > n) {
    for (let k = 0; k <= n; k++) {
      const g = (k / n) * segs.length;
      const si = Math.min(segs.length - 1, Math.floor(g));
      pts.push(punktAuf(segs[si]!, g - si));
    }
    for (let i = 0; i <= segs.length; i++) knoten.push((i * n) / segs.length);
  } else {
    const laengen = segs.map(bogenlaenge);
    const summe = laengen.reduce((a, b) => a + b, 0) || 1;
    const ideal = laengen.map((l) => (n * l) / summe);
    const anteile = ideal.map((x) => Math.max(1, Math.round(x)));
    let diff = anteile.reduce((a, b) => a + b, 0) - n;
    while (diff !== 0) {
      let wahl = -1;
      let best = -Infinity;
      anteile.forEach((a, i) => {
        const gewinn = diff > 0 ? (a > 1 ? a - ideal[i]! : -Infinity) : ideal[i]! - a;
        if (gewinn > best) {
          best = gewinn;
          wahl = i;
        }
      });
      anteile[wahl]! += diff > 0 ? -1 : 1;
      diff += diff > 0 ? -1 : 1;
    }
    knoten.push(0);
    segs.forEach((seg, si) => {
      const m = anteile[si]!;
      for (let k = si === 0 ? 0 : 1; k <= m; k++) pts.push(punktAuf(seg, k / m));
      knoten.push(pts.length - 1);
    });
  }
  let uMax = 0;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const p of pts) {
    uMax = Math.max(uMax, p.x);
    vMin = Math.min(vMin, p.y);
    vMax = Math.max(vMax, p.y);
  }
  const hoehe = vMax - vMin || 1;
  return { q: pts.map((p) => ({ x: uMax > 1e-9 ? p.x / uMax : 0, y: (p.y - vMin) / hoehe })), knoten };
}

/** Querschnitt (rechte Hälfte) bei Station f, fein abgetastet: Punkte u = 0 … halb, Bogenlänge je Punkt. */
export type HalbRing = { f: number; x: number; pts: V3[]; s: number[]; L: number };

export type Loft = {
  xMin: number;
  xMax: number;
  tMin: number;
  tMax: number;
  /** Stützstellen der halben Vorlage (u läuft von 0 bis halb) */
  halb: number;
  vorlage: FrontVorlage;
  /** +1, wenn die Vorlage oben beginnt (dann zeigen die Normalen aus `normaleInEbene` nach außen) */
  lauf: 1 | -1;
  mass: (f: number) => { x: number; yLo: number; yHi: number; w: number };
  punkt: (f: number, u: number) => V3;
  ring: (f: number) => HalbRing;
  fVon: (x: number) => number;
  /** Liegt (y, z) im Querschnitt bei f? */
  innen: (f: number, y: number, z: number) => boolean;
};

function imPolygon(poly: readonly V2[], px: number, py: number): boolean {
  let innen = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) innen = !innen;
  }
  return innen;
}

export function loftAus(dok: Dokument, halb = KANTEN_STANDARD.fein / 2): Loft {
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 24);
  const top = pfadAbtasten(vollerPfad(dok.profile.top), 24);
  const ausdehnung = (pts: V2[]) => [Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x))] as const;
  const [xMin, xMax] = ausdehnung(seite);
  const [tMin, tMax] = ausdehnung(top);
  const vorlage = frontVorlage(dok, halb);
  const q = vorlage.q;
  const lauf: 1 | -1 = q[0]!.y >= q[halb]!.y ? 1 : -1;
  // Spanten (Versuch 12.10.): Querschnitt je Station, gleiche Stützstellen je Knoten wie die Front
  const qBei = (f: number): V2[] => (dok.spanten?.length ? vorlageBei(dok, f, halb).q : q);
  const mass = (f0: number) => {
    let f = Math.min(1, Math.max(0, f0));
    let vs: number[] = [];
    let ws: number[] = [];
    for (let versuch = 0; versuch < 3; versuch++) {
      vs = schnitte(seite, xMin + (xMax - xMin) * f);
      ws = schnitte(top, tMin + (tMax - tMin) * f);
      if (vs.length) break;
      f = f < 0.5 ? f + 1e-6 : f - 1e-6;
    }
    const yLo = vs.length ? Math.min(...vs) : 0;
    const yHi = vs.length ? Math.max(...vs) : 0;
    const w = ws.length ? Math.max(...ws.map(Math.abs)) : 0;
    return { x: xMin + (xMax - xMin) * f, yLo, yHi, w };
  };
  const vorlageAn = (f: number, u: number): V2 => {
    const qf = qBei(f);
    const i = Math.min(halb - 1, Math.max(0, Math.floor(u)));
    const t = Math.min(1, Math.max(0, u - i));
    const a = qf[i]!;
    const b = qf[i + 1]!;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const punkt = (f: number, u: number): V3 => {
    const m = mass(f);
    const v = vorlageAn(f, u);
    return [m.x, m.yLo + v.y * (m.yHi - m.yLo), v.x * m.w];
  };
  const ringe = new Map<number, HalbRing>();
  const ring = (f: number): HalbRing => {
    let h = ringe.get(f);
    if (h) return h;
    const m = mass(f);
    const pts: V3[] = qBei(f).map((v) => [m.x, m.yLo + v.y * (m.yHi - m.yLo), v.x * m.w]);
    const s = [0];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1]! + Math.hypot(pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]));
    h = { f, x: m.x, pts, s, L: s[s.length - 1]! };
    ringe.set(f, h);
    return h;
  };
  const fVon = (x: number) => (x - xMin) / (xMax - xMin || 1);
  const innen = (f: number, y: number, z: number) => {
    const m = mass(f);
    const H = m.yHi - m.yLo;
    if (!(H > 1e-12) || !(m.w > 1e-12)) return false;
    return imPolygon(qBei(f), Math.abs(z) / m.w, (y - m.yLo) / H);
  };
  return { xMin, xMax, tMin, tMax, halb, vorlage, lauf, mass, punkt, ring, fVon, innen };
}

/** Bogenlänge bis zur (gebrochenen) Stützstelle u. */
export function bogenBei(h: HalbRing, u: number): number {
  const i = Math.min(h.pts.length - 2, Math.max(0, Math.floor(u)));
  const t = Math.min(1, Math.max(0, u - i));
  return h.s[i]! + t * (h.s[i + 1]! - h.s[i]!);
}

/** Stützstelle u zur Bogenlänge s. */
export function uBeiBogen(h: HalbRing, s: number): number {
  if (s <= 0) return 0;
  if (s >= h.L) return h.pts.length - 1;
  let lo = 0;
  let hi = h.pts.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (h.s[m]! <= s) lo = m;
    else hi = m;
  }
  const d = h.s[hi]! - h.s[lo]!;
  return lo + (d > 1e-15 ? (s - h.s[lo]!) / d : 0);
}

export function punktBei(h: HalbRing, u: number): V3 {
  const i = Math.min(h.pts.length - 2, Math.max(0, Math.floor(u)));
  const t = Math.min(1, Math.max(0, u - i));
  const a = h.pts[i]!;
  const b = h.pts[i + 1]!;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Nächster Punkt der Ringhälfte zu (y, z) in der Querschnittsebene. */
function naechstesU(h: HalbRing, y: number, z: number): { u: number; d: number } {
  let best = Infinity;
  let bu = 0;
  for (let i = 0; i < h.pts.length - 1; i++) {
    const a = h.pts[i]!;
    const b = h.pts[i + 1]!;
    const ey = b[1] - a[1];
    const ez = b[2] - a[2];
    const l2 = ey * ey + ez * ez;
    const t = l2 > 1e-24 ? Math.min(1, Math.max(0, ((y - a[1]) * ey + (z - a[2]) * ez) / l2)) : 0;
    const d = Math.hypot(a[1] + ey * t - y, a[2] + ez * t - z);
    if (d < best) {
      best = d;
      bu = i + t;
    }
  }
  return { u: bu, d: best };
}

/** Stellen u, an denen die Ringhälfte die Höhe y (achse 1) bzw. die Breite z (achse 2) kreuzt. */
function kreuzungen(h: HalbRing, achse: 1 | 2, wert: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < h.pts.length - 1; i++) {
    const a = h.pts[i]![achse] - wert;
    const b = h.pts[i + 1]![achse] - wert;
    if (a === 0) out.push(i);
    else if (a * b < 0) out.push(i + a / (a - b));
  }
  if (h.pts[h.pts.length - 1]![achse] === wert) out.push(h.pts.length - 1);
  return out;
}

/** Normale des Querschnitts in seiner Ebene (ny, nz), nach außen; an Ecken die Winkelhalbierende. */
function normaleInEbene(h: HalbRing, u: number, lauf: 1 | -1): [number, number] {
  const n = h.pts.length - 1;
  const r = Math.round(u);
  let a: V3;
  let b: V3;
  if (Math.abs(u - r) < 1e-6) {
    a = h.pts[Math.max(0, r - 1)]!;
    b = h.pts[Math.min(n, r + 1)]!;
  } else {
    const i = Math.min(n - 1, Math.max(0, Math.floor(u)));
    a = h.pts[i]!;
    b = h.pts[i + 1]!;
  }
  const ty = b[1] - a[1];
  const tz = b[2] - a[2];
  const l = Math.hypot(ty, tz) || 1;
  return [(lauf * tz) / l, (-lauf * ty) / l];
}

/** Stationen f, an denen der Strahl entlang x durch (y, z) in den Körper ein- oder austritt. */
function xKandidaten(loft: Loft, y: number, z: number): number[] {
  const K = 64;
  const out: number[] = [];
  let vorher = loft.innen(0, y, z);
  for (let k = 1; k <= K; k++) {
    const f = k / K;
    const jetzt = loft.innen(f, y, z);
    if (jetzt !== vorher) {
      let lo = (k - 1) / K;
      let hi = f;
      for (let it = 0; it < 24; it++) {
        const m = (lo + hi) / 2;
        if (loft.innen(m, y, z) === vorher) lo = m;
        else hi = m;
      }
      out.push((lo + hi) / 2);
    }
    vorher = jetzt;
  }
  return out;
}

/** Vorderfläche: kleinstes f ≤ fBis, bei dem (y, z) im Querschnitt liegt (für die Kappe). */
function fVorn(loft: Loft, y: number, z: number, fBis: number): number | null {
  if (!loft.innen(fBis, y, z)) return null;
  let lo = 0;
  let hi = fBis;
  for (let it = 0; it < 30; it++) {
    const m = (lo + hi) / 2;
    if (loft.innen(m, y, z)) hi = m;
    else lo = m;
  }
  return hi;
}

/**
 * Punkt einer Linie auf den Loft legen, entlang der Blickrichtung ihrer Heimat: In der Heimat bleibt die Linie, wie sie
 * gezeichnet ist (Seite x/y, Front und Back z/y, Top und Bottom x/z), die Tiefe kommt von der Fläche. Von mehreren
 * Treffern gilt der nächste zur gespeicherten Tiefe (stetig, auch für verdeckte Stellen).
 */
export function aufLoft(loft: Loft, p0: V3, blick: Blick): { p: V3; f: number; u: number } {
  const p: V3 = [p0[0], p0[1], Math.abs(p0[2])];
  if (blick === 'front' || blick === 'hinten') {
    const kand = xKandidaten(loft, p[1], p[2]);
    const fp = loft.fVon(p[0]);
    let f = Math.min(1 - 1e-4, Math.max(1e-4, fp));
    if (kand.length) f = kand.reduce((best, k) => (Math.abs(k - fp) < Math.abs(best - fp) ? k : best));
    const h = loft.ring(f);
    const u = naechstesU(h, p[1], p[2]).u;
    return { p: punktBei(h, u), f, u };
  }
  const f = Math.min(1 - 1e-4, Math.max(1e-4, loft.fVon(p[0])));
  const h = loft.ring(f);
  const fest: 1 | 2 = blick === 'seite' ? 1 : 2;
  const tiefe: 1 | 2 = blick === 'seite' ? 2 : 1;
  const us = kreuzungen(h, fest, p[fest]);
  let u: number;
  if (us.length) u = us.reduce((best, x) => (Math.abs(punktBei(h, x)[tiefe] - p[tiefe]) < Math.abs(punktBei(h, best)[tiefe] - p[tiefe]) ? x : best));
  else u = naechstesU(h, p[1], p[2]).u;
  return { p: punktBei(h, u), f, u };
}

// ---------- abgeleitete Eckkanten ----------

export type EckQuelle = { ansicht: Ansicht; knoten: number };

/** Kante aus einer Profilecke als 3D-Linie der rechten Hälfte (z ≥ 0) mit Härte je Punkt. */
export type EckKante = {
  quelle: EckQuelle;
  /** laengs: Ecke der Front (vorn → hinten); quer: Ecke in Seite oder Top (Ring bei x der Ecke, oben → unten) */
  art: 'laengs' | 'quer';
  punkte: V3[];
  haerte: number[];
};

type EckRing = {
  ecke: ProfilEcke;
  /** Station des Rings (Ecken am Pol: Rand der Kappe bzw. letzter Ring) */
  f: number;
  /** Richtung in der Querschnittsebene (ny, nz), gegen die die Ringnormale gewichtet wird; null = rundum */
  richtung: [number, number] | null;
};

/**
 * Wo eine Ecke aus Seite oder Top im Loft sitzt (null: nicht auf dem Umriss des Lofts, z. B. eine innere Falte).
 * Ecken am Pol (Spitze vorn oder hinten) liegen auf dem Kappenrand bzw. einem Ring knapp vor dem hinteren Pol.
 */
function eckRing(loft: Loft, e: ProfilEcke): EckRing | null {
  const fRoh = e.ansicht === 'seite' ? loft.fVon(e.p.x) : (e.p.x - loft.tMin) / (loft.tMax - loft.tMin || 1);
  const amPol = fRoh < POL || fRoh > 1 - POL;
  const f = fRoh < POL ? KAPPE : fRoh > 1 - POL ? 1 - KAPPE : fRoh;
  const m = loft.mass(fRoh);
  if (e.ansicht === 'seite') {
    const tol = 0.02 * Math.max(1e-6, m.yHi - m.yLo);
    const dO = Math.abs(e.p.y - m.yHi);
    const dU = Math.abs(e.p.y - m.yLo);
    if (!amPol && Math.min(dO, dU) > tol) return null;
    if (Math.abs(e.aussen.y) >= 0.3) return { ecke: e, f, richtung: [Math.sign(e.aussen.y), 0] };
    // Außenrichtung fast waagerecht: an der Spitze rundum, sonst oben oder unten nach dem Umriss des Lofts
    if (amPol) return { ecke: e, f, richtung: null };
    return { ecke: e, f, richtung: dO <= dU ? [1, 0] : [-1, 0] };
  }
  // Top: Ecke auf der Flanke (z ≥ 0)
  if (!amPol && Math.abs(Math.abs(e.p.y) - m.w) > 0.02 * Math.max(1e-6, m.w)) return null;
  return { ecke: e, f, richtung: [0, 1] };
}

/** Gewicht eines Ringpunkts für eine Ringkante aus Seite/Top (1 = volle Härte). */
function ringGewicht(h: HalbRing, u: number, er: EckRing, lauf: 1 | -1): number {
  if (!er.richtung) return 1;
  const n = normaleInEbene(h, u, lauf);
  return glatt(GEWICHT_A, GEWICHT_B, n[0] * er.richtung[0] + n[1] * er.richtung[1]);
}

/** Bereich [a, b] der Gewichte über 0 (um je einen Punkt erweitert, damit die Linie auf 0 ausläuft); [-1, -1] = leer. */
function ausdehnung(w: readonly number[]): [number, number] {
  const a = w.findIndex((x) => x > 1e-3);
  if (a < 0) return [-1, -1];
  const b = w.length - 1 - [...w].reverse().findIndex((x) => x > 1e-3);
  return [Math.max(0, a - 1), Math.min(w.length - 1, b + 1)];
}

/** Größe des Querschnitts bei f (geometrisches Mittel aus Höhe und Breite). */
function groesse(loft: Loft, f: number): number {
  const m = loft.mass(f);
  return Math.sqrt(Math.max(0, m.yHi - m.yLo) * Math.max(0, m.w));
}

/**
 * Abgeleitete Kanten aus den sichtbaren Ecken der Profile, für die Anzeige in den anderen Ansichten (Punkte auf dem
 * Loft, rechte Hälfte). Front-Ecke → Längslinie über die ganze Länge, zu den Polen auslaufend; Ecke in Seite/Top →
 * Querlinie entlang des Rings bei x der Ecke, auf dem Teil, der zur Ecke zeigt (weich auslaufend).
 */
export function eckKanten(dok: Dokument, opt: Partial<KantenOptionen> = {}): EckKante[] {
  const o = { ...KANTEN_STANDARD, ...opt };
  const loft = loftAus(dok, o.fein / 2);
  return eckKantenAus(loft, profilEcken(dok, o.minKnick));
}

function eckKantenAus(loft: Loft, ecken: readonly ProfilEcke[]): EckKante[] {
  const out: EckKante[] = [];
  const K = 96;
  const fs: number[] = [];
  for (let k = 0; k <= K; k++) fs.push((1 - Math.cos((Math.PI * k) / K)) / 2);
  let gMax = 0;
  const gs = fs.map((f) => {
    const g = groesse(loft, f);
    gMax = Math.max(gMax, g);
    return g;
  });
  for (const e of ecken) {
    if (e.ansicht === 'front') {
      const u = loft.vorlage.knoten[e.knoten];
      if (u === undefined) continue;
      out.push({
        quelle: { ansicht: e.ansicht, knoten: e.knoten },
        art: 'laengs',
        punkte: fs.map((f) => loft.punkt(f, u)),
        haerte: gs.map((g, k) => haerteAn(e, fs[k]!) * glatt(0, AUSLAUF, g / (gMax || 1))),
      });
      continue;
    }
    const er = eckRing(loft, e);
    if (!er) continue;
    const h = loft.ring(er.f);
    // Ausdehnung nach dem Gewicht (auch Härte 0 ist eine mögliche Kante und wird gezeigt), Härte = Härte der Ecke · Gewicht
    const w = h.pts.map((_, i) => ringGewicht(h, i, er, loft.lauf));
    const [a, b] = ausdehnung(w);
    if (a < 0) continue;
    out.push({ quelle: { ansicht: e.ansicht, knoten: e.knoten }, art: 'quer', punkte: h.pts.slice(a, b + 1).map((p) => [...p] as V3), haerte: w.slice(a, b + 1).map((x) => e.haerte * x) });
  }
  return out;
}

// ---------- Linien ----------

type Probe = { p: V3; f: number; u: number; h: number };
type LinieInfo = {
  index: number;
  art: 'laengs' | 'quer';
  /** laengs: nach f aufsteigend; quer: nach u aufsteigend */
  proben: Probe[];
};

function haerteBei(k: Kante, i: number): number {
  const h = k.haerte[i] ?? k.haerte[k.haerte.length - 1] ?? 1;
  return Math.min(1, Math.max(0, h));
}

/** Probe einer sortierten Folge bei Wert `wert` der Größe `nach` (linear zwischen den Nachbarn, am Rand geklemmt). */
function probeBei(proben: readonly Probe[], nach: 'f' | 'u', wert: number): { f: number; u: number; h: number } {
  const n = proben.length;
  if (wert <= proben[0]![nach]) return proben[0]!;
  if (wert >= proben[n - 1]![nach]) return proben[n - 1]!;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (proben[m]![nach] <= wert) lo = m;
    else hi = m;
  }
  const a = proben[lo]!;
  const b = proben[hi]!;
  const t = (wert - a[nach]) / (b[nach] - a[nach] || 1);
  return { f: lerp(a.f, b.f, t), u: lerp(a.u, b.u, t), h: lerp(a.h, b.h, t) };
}

function linieVorbereiten(loft: Loft, k: Kante, index: number, snapU: number, hinweise: string[]): LinieInfo | null {
  if (k.knoten.length < 2) return null;
  const proSegment = 16;
  const pts = abtasten3(k, proSegment);
  const hs: number[] = [];
  for (let s = 0; s < k.knoten.length - 1; s++) for (let j = s === 0 ? 0 : 1; j <= proSegment; j++) hs.push(lerp(haerteBei(k, s), haerteBei(k, s + 1), j / proSegment));
  let proben: Probe[] = pts.map((p, i) => ({ ...aufLoft(loft, p, k.blick), h: hs[i] ?? 1 }));
  let lx = 0;
  let l = 0;
  for (let i = 1; i < proben.length; i++) {
    const a = proben[i - 1]!.p;
    const b = proben[i]!.p;
    lx += Math.abs(b[0] - a[0]);
    l += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  if (!(l > 1e-9)) return null;
  const art: LinieInfo['art'] = lx / l >= 0.5 ? 'laengs' : 'quer';
  const nach = art === 'laengs' ? 'f' : 'u';
  if (proben[proben.length - 1]![nach] < proben[0]![nach]) proben.reverse();
  const monoton: Probe[] = [proben[0]!];
  for (const pr of proben.slice(1)) if (pr[nach] > monoton[monoton.length - 1]![nach] + 1e-9) monoton.push(pr);
  if (monoton.length < proben.length - 2) hinweise.push(`Linie ${index + 1}: läuft nicht stetig ${art === 'laengs' ? 'nach hinten' : 'um den Querschnitt'}, Rückläufe ausgelassen`);
  proben = monoton;
  if (art === 'laengs') {
    // auf den Bereich zwischen Kappe und Pol kürzen (Linien über die Kappe trägt der Käfig nicht)
    const a = proben[0]!.f;
    const b = proben[proben.length - 1]!.f;
    if (a < POL || b > 1 - POL) {
      hinweise.push(`Linie ${index + 1}: über die Kappe bzw. den Pol hinaus, gekürzt`);
      const lo = Math.max(POL, a);
      const hi = Math.min(1 - POL, b);
      if (!(hi > lo)) return null;
      const innen = proben.filter((p) => p.f > lo && p.f < hi);
      const rand = (f: number): Probe => {
        const q = probeBei(proben, 'f', f);
        return { p: loft.punkt(q.f, q.u), f: q.f, u: q.u, h: q.h };
      };
      proben = [rand(lo), ...innen, rand(hi)];
    }
  } else {
    const erste = proben[0]!;
    const letzte = proben[proben.length - 1]!;
    if (erste.u < snapU) proben[0] = { ...erste, u: 0, p: loft.punkt(erste.f, 0) };
    if (letzte.u > loft.halb - snapU) proben[proben.length - 1] = { ...letzte, u: loft.halb, p: loft.punkt(letzte.f, loft.halb) };
  }
  if (proben.length < 2) return null;
  return { index, art, proben };
}

// ---------- Stationen ----------

/**
 * Ringe gleichmäßig nach der Bogenlänge der Umrisse (Ober- und Unterkante der Seite, Breite aus dem Top): An runden
 * Enden liegen sie dichter, eine flache Stirn zählt mit ihrer Fläche. Die Kappe vorn reicht über zwei Ringabstände,
 * der Fächer hinten über einen (wie bei einer Würfelkugel).
 */
function bogenStationen(loft: Loft, N: number): number[] {
  const K = 600;
  const dx = (loft.xMax - loft.xMin) / K;
  const C = [0];
  const m0 = loft.mass(0);
  // Stirn und Heck: Fläche des Endquerschnitts (von seiner Mitte zum Rand)
  const stirn = (m: { yLo: number; yHi: number; w: number }) => (Math.max(0, m.yHi - m.yLo) + 2 * Math.max(0, m.w)) / 4;
  let vor = m0;
  for (let k = 1; k <= K; k++) {
    const m = loft.mass(k / K);
    const ds = (Math.hypot(dx, m.yHi - vor.yHi) + Math.hypot(dx, m.yLo - vor.yLo) + 2 * Math.hypot(dx, m.w - vor.w)) / 4;
    C.push(C[k - 1]! + ds + (k === 1 ? stirn(m0) : 0) + (k === K ? stirn(loft.mass(1)) : 0));
    vor = m;
  }
  const ges = C[K]!;
  const st: number[] = [];
  for (let i = 1; i <= N; i++) {
    const ziel = (ges * (i + 1)) / (N + 2);
    let k = 0;
    while (k < K && C[k + 1]! < ziel) k++;
    st.push(Math.min(1 - KAPPE, Math.max(KAPPE, (k + (ziel - C[k]!) / (C[k + 1]! - C[k]! || 1)) / K)));
  }
  return st;
}

type Zwang = { f: number; rang: number };

/**
 * Stationen (Ring 1 … N) aus der Grundverteilung `basis` (Bogenlänge oder `formStationen`) mit festen Stationen `zwang`:
 * Jede feste Station bekommt den Ring, der ihr in der Verteilung am nächsten liegt; die freien Ringe dazwischen folgen
 * der Verteilung. Ring 1 bleibt der Kappenrand (Station `kappe`). Reicht die Zahl nicht, kommen Ringe dazu.
 */
function stationenMitZwang(basis: readonly number[], zwang: readonly Zwang[], kappe: number): { st: number[]; ring: Map<number, number> } {
  const N0 = basis.length;
  const g = [0, ...[...basis].sort((a, b) => a - b), 1];
  for (let i = 1; i < g.length; i++) if (g[i]! <= g[i - 1]!) g[i] = g[i - 1]! + 1e-6;
  const kappa = (c: number) => {
    for (let i = 0; i < g.length - 1; i++) if (c <= g[i + 1]!) return i + (c - g[i]!) / (g[i + 1]! - g[i]!);
    return g.length - 1;
  };
  const gBei = (k: number) => {
    const i = Math.min(g.length - 2, Math.max(0, Math.floor(k)));
    return g[i]! + (k - i) * (g[i + 1]! - g[i]!);
  };
  // zusammenlegen (höherer Rang gewinnt)
  const sortiert = [...zwang].sort((a, b) => a.f - b.f);
  const gruppen: { f: number; rang: number; mitglieder: number[] }[] = [];
  for (const z of sortiert) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && z.f - letzte.f < ZUSAMMEN) {
      letzte.mitglieder.push(z.f);
      if (z.rang > letzte.rang) {
        letzte.f = z.f;
        letzte.rang = z.rang;
      }
    } else gruppen.push({ f: z.f, rang: z.rang, mitglieder: [z.f] });
  }
  const M = gruppen.length;
  let N = Math.max(N0, M + 2);
  let k: number[] = [];
  for (;;) {
    k = [];
    let ok = true;
    for (let m = 0; m < M; m++) {
      const unten = m === 0 ? 2 : k[m - 1]! + 1;
      const oben = N - (M - 1 - m);
      if (unten > oben) {
        ok = false;
        break;
      }
      k.push(Math.min(oben, Math.max(unten, Math.round(kappa(gruppen[m]!.f)))));
    }
    if (ok) break;
    N++;
  }
  // Ringindex i (1 … N) ↔ Verteilungsindex κ: Ring i liegt ohne Zwang bei g(i) (g[0] = 0 ist kein Ring). Ring 1 ist
  // der Kappenrand (wie beim Tiger überschrieben), zählt für die Verteilung aber als g(1).
  const anker: { i: number; kappa: number; f: number }[] = [{ i: 1, kappa: 1, f: Math.min(kappe, gruppen.length ? gruppen[0]!.f - ZUSAMMEN : 1) }];
  gruppen.forEach((gr, m) => anker.push({ i: k[m]!, kappa: kappa(gr.f), f: gr.f }));
  anker.push({ i: N + 1, kappa: g.length - 1, f: 1 });
  const st: number[] = [];
  let a = 0;
  for (let i = 1; i <= N; i++) {
    while (a < anker.length - 2 && anker[a + 1]!.i <= i) a++;
    const A = anker[a]!;
    const B = anker[a + 1]!;
    if (A.i === i) {
      st.push(A.f);
      continue;
    }
    const kap = A.kappa + ((i - A.i) / (B.i - A.i)) * (B.kappa - A.kappa);
    st.push(gBei(kap));
  }
  for (let i = 1; i < st.length; i++) if (st[i]! <= st[i - 1]! + 1e-5) st[i] = st[i - 1]! + 1e-5;
  const ring = new Map<number, number>();
  gruppen.forEach((gr, m) => {
    for (const f of gr.mitglieder) ring.set(f, k[m]!);
  });
  return { st, ring };
}

// ---------- Käfig ----------

export type KantenQuelle = { art: 'linie'; index: number } | { art: 'ecke'; ansicht: Ansicht; knoten: number };

/** Käfigpunkte entlang einer Kante (für die 3D-Anzeige und die Messung). */
export type KantenWeg = {
  quelle: KantenQuelle;
  art: 'laengs' | 'quer';
  /** rechte Hälfte (z ≥ 0), laengs vorn → hinten, quer von oben nach unten */
  punkte: number[];
  /** Spiegelbild auf der linken Hälfte (leer, wenn die Kante auf der Mittelebene liegt) */
  spiegel: number[];
  /** Härte je Weg-Punkt */
  haerte: number[];
};

export type KantenKaefig = {
  /** angepasst: die Grenzfläche trifft die Ziele */
  netz: Netz;
  /** Käfig vor dem Anpassen (Punkte = Ziele) */
  roh: Netz;
  ziel: V3[];
  wege: KantenWeg[];
  /** Station (Anteil der Länge) je Ring 1 … N */
  stationen: number[];
  ringe: number;
  ring: number;
  stufen: number;
  ringPunkt: (i: number, j: number) => number;
  pol: number;
  hinweise: string[];
};

type Spur = { j: number; u: (i: number) => number | null };

/**
 * Käfig aus den Profilen mit Kanten aus `dok.kanten` und aus den sichtbaren Ecken der Profile. Geschlossenes Netz:
 * Ringe vorn → hinten (j = 0 oben, ring/4 rechts), 4×4-Kappe vorn, Pol hinten.
 */
export function kantenKaefig(dok: Dokument, opt: Partial<KantenOptionen> = {}): KantenKaefig {
  const o = { ...KANTEN_STANDARD, ...opt };
  const R = o.ring;
  const H2 = R / 2;
  const S = o.stufen;
  if (R % 4 !== 0 || R < 8) throw new Error('Kanten-Käfig: Punkte je Ring durch 4 teilbar und mindestens 8');
  const loft = loftAus(dok, o.fein / 2);
  const halb = loft.halb;
  const hinweise: string[] = [];
  const ecken = profilEcken(dok, o.minKnick);
  /** Linien, die näher als ein Drittel eines Ringabstands an der Mittelebene liegen, liegen auf ihr */
  const snapU = (0.3 * halb) / H2;

  // --- Ecken aus Seite und Top: Ringe ---
  const eckRinge = ecken.filter((e) => e.ansicht !== 'front').map((e) => {
    const er = eckRing(loft, e);
    if (!er) hinweise.push(`Ecke ${e.ansicht} ${e.knoten}: nicht auf dem Umriss des Lofts, ohne Kante`);
    return er;
  });
  // --- Linien ---
  const linien: LinieInfo[] = [];
  (dok.kanten ?? []).forEach((k, i) => {
    const l = linieVorbereiten(loft, k, i, snapU, hinweise);
    if (l) linien.push(l);
    else hinweise.push(`Linie ${i + 1}: nicht darstellbar`);
  });

  // --- Stationen ---
  const zwang: Zwang[] = [];
  for (const er of eckRinge) if (er && er.f > KAPPE) zwang.push({ f: er.f, rang: 2 });
  const querF = new Map<LinieInfo, number>();
  for (const l of linien) {
    if (l.art === 'laengs') {
      zwang.push({ f: l.proben[0]!.f, rang: 1 }, { f: l.proben[l.proben.length - 1]!.f, rang: 1 });
    } else {
      // Station in der Mitte des x-Bereichs der Linie: so kippt der Ring nach beiden Seiten gleich weit
      const fs = l.proben.map((p) => p.f);
      const f = Math.min(1 - POL, Math.max(POL, (Math.min(...fs) + Math.max(...fs)) / 2));
      querF.set(l, f);
      zwang.push({ f, rang: 3 });
    }
  }
  const form = () => formStationen(dok, o.ringe, loft.xMin, loft.xMax, loft.tMin, loft.tMax);
  let basis: number[];
  if (o.verteilung === 'form') basis = form();
  else if (o.verteilung === 'bogen') basis = bogenStationen(loft, o.ringe);
  else {
    const a = form();
    const b = bogenStationen(loft, o.ringe);
    basis = a.map((f, i) => (f + b[i]!) / 2);
  }
  // Ring 1 = Kappenrand: beim Tiger ganz vorn; nach Bogenlänge dort, wo die Verteilung ihn hinlegt (runde Stirn),
  // aber ganz vorn, wenn eine Ecke am vorderen Pol sitzt (die Kappe ist dann die Stirnfläche)
  const eckeVorn = eckRinge.some((er) => er !== null && er.f <= KAPPE);
  let kappe = o.verteilung === 'form' || eckeVorn ? KAPPE : Math.max(KAPPE, basis[0]!);
  // feste Stationen dicht am Kappenrand legen Ring 1 fest (sonst stünden zwei Ringe dicht hintereinander)
  const amRand = zwang.filter((z) => z.f < kappe + ZUSAMMEN);
  if (amRand.length) {
    const wahl = amRand.reduce((a, b) => (b.rang > a.rang || (b.rang === a.rang && b.f < a.f) ? b : a));
    kappe = Math.max(KAPPE, Math.min(wahl.f, eckeVorn ? KAPPE : wahl.f));
  }
  const aufRing1 = new Set(amRand.map((z) => z.f));
  const { st, ring: zwangRing } = stationenMitZwang(
    basis,
    zwang.filter((z) => !aufRing1.has(z.f)),
    kappe,
  );
  const N = st.length;
  const ringVon = (f: number): number =>
    aufRing1.has(f) || f <= KAPPE ? 1 : zwangRing.get(f) ?? 1 + st.reduce((best, s, i) => (Math.abs(s - f) < Math.abs(st[best]! - f) ? i : best), 0);

  // gekippte Ringe (Querlinien): ein Ring je Linie; Ringe mit festen Stationen (Ecken, Linienenden) bleiben eben, der
  // Kappenrand nur, wenn eine Ecke oder ein Linienende auf ihm sitzt
  const zwangsRinge = new Set<number>([...(eckeVorn || amRand.length ? [1] : []), ...zwangRing.values()]);
  const querRing = new Map<number, LinieInfo>();
  for (const l of linien) {
    if (l.art !== 'quer') continue;
    const i = ringVon(querF.get(l)!);
    if (querRing.has(i)) {
      hinweise.push(`Linie ${l.index + 1}: teilt den Ring mit einer anderen Querlinie, ohne Kante`);
      continue;
    }
    querRing.set(i, l);
    zwangsRinge.add(i);
  }
  const ringe = st.map((f) => loft.ring(f));

  // --- feste Ringindizes: Front-Ecken ---
  let iRef = 0;
  st.forEach((f, i) => groesse(loft, f) > groesse(loft, st[iRef]!) && (iRef = i));
  const hRef = ringe[iRef]!;
  const frontEcken = ecken.filter((e) => e.ansicht === 'front').sort((a, b) => a.knoten - b.knoten);
  const letzterFront = dok.profile.front.knoten.length - 1;
  const spuren: Spur[] = [];
  const frontSpur: { ecke: ProfilEcke; j: number }[] = [];
  {
    let vorher = 0;
    frontEcken.forEach((e, m) => {
      const u = loft.vorlage.knoten[e.knoten]!;
      let j: number;
      if (u <= 1e-9) j = 0;
      else if (u >= halb - 1e-9) j = H2;
      else {
        const rest = frontEcken.slice(m + 1).filter((x) => loft.vorlage.knoten[x.knoten]! < halb - 1e-9).length;
        j = Math.min(H2 - 1 - rest, Math.max(vorher + 1, Math.round((bogenBei(hRef, u) / hRef.L) * H2)));
        if (j <= vorher || j >= H2) {
          hinweise.push(`Ecke front ${e.knoten}: kein freier Ringpunkt`);
          return;
        }
      }
      if (e.knoten === letzterFront && j !== H2) j = H2;
      vorher = Math.max(vorher, j);
      frontSpur.push({ ecke: e, j });
      if (j !== 0 && j !== H2) spuren.push({ j, u: () => u });
    });
  }

  // --- feste Ringindizes: Längslinien ---
  /** feste Punkte (j → u) je Ring 1 … N */
  const festBei = (i: number, ohne?: Spur): Map<number, number> => {
    const m = new Map<number, number>([
      [0, 0],
      [H2, halb],
    ]);
    for (const s of spuren) {
      if (s === ohne) continue;
      const u = s.u(i);
      if (u !== null && !m.has(s.j)) m.set(s.j, u);
    }
    return m;
  };
  /** freie Verteilung nach Bogenlänge zwischen den festen Punkten (u je j = 0 … H2) */
  const verteilen = (h: HalbRing, fest: Map<number, number>): number[] => {
    const liste = [...fest.entries()].sort((a, b) => a[0] - b[0]);
    // Reihenfolge erzwingen (eine Kreuzung würde den Ring falten)
    for (let k = 1; k < liste.length; k++) if (liste[k]![1] <= liste[k - 1]![1] + 1e-3) liste[k] = [liste[k]![0], Math.min(halb, liste[k - 1]![1] + 1e-3)];
    const u = new Array<number>(H2 + 1).fill(0);
    for (let k = 0; k < liste.length - 1; k++) {
      const [ja, ua] = liste[k]!;
      const [jb, ub] = liste[k + 1]!;
      u[ja] = ua;
      u[jb] = ub;
      const sa = bogenBei(h, ua);
      const sb = bogenBei(h, ub);
      for (let j = ja + 1; j < jb; j++) u[j] = uBeiBogen(h, sa + ((sb - sa) * (j - ja)) / (jb - ja));
    }
    return u;
  };
  /** Ringindex für einen Punkt u: derselbe feste Punkt oder der nächste freie Index in der Lücke, in der u liegt */
  const freierIndex = (h: HalbRing, fest: Map<number, number>, u: number): number | null => {
    for (const [j, uf] of fest) if (Math.abs(uf - u) < 1e-6) return j;
    const liste = [...fest.entries()].sort((a, b) => a[0] - b[0]);
    let lo = liste[0]!;
    let hi = liste[liste.length - 1]!;
    for (let k = 0; k < liste.length - 1; k++) {
      if (liste[k]![1] <= u && u <= liste[k + 1]![1]) {
        lo = liste[k]!;
        hi = liste[k + 1]!;
        break;
      }
    }
    if (hi[0] - lo[0] < 2) return null;
    const frei = verteilen(h, fest);
    let j = lo[0] + 1;
    for (let c = lo[0] + 1; c < hi[0]; c++) if (Math.abs(frei[c]! - u) < Math.abs(frei[j]! - u)) j = c;
    return j;
  };
  const laengsSpur = new Map<LinieInfo, { spur: Spur; iA: number; iB: number; achse: boolean }>();
  const laengsLinien = linien.filter((l) => l.art === 'laengs').sort((a, b) => b.proben[b.proben.length - 1]!.f - b.proben[0]!.f - (a.proben[a.proben.length - 1]!.f - a.proben[0]!.f));
  for (const l of laengsLinien) {
    const iA = ringVon(l.proben[0]!.f);
    const iB = ringVon(l.proben[l.proben.length - 1]!.f);
    if (iB <= iA) {
      hinweise.push(`Linie ${l.index + 1}: zu kurz für zwei Ringe, ohne Kante`);
      continue;
    }
    const uBei = (i: number) => probeBei(l.proben, 'f', st[i - 1]!).u;
    let uMin = Infinity;
    let uMax = -Infinity;
    for (let i = iA; i <= iB; i++) {
      uMin = Math.min(uMin, uBei(i));
      uMax = Math.max(uMax, uBei(i));
    }
    if (uMax < snapU || uMin > halb - snapU) {
      // auf der Mittelebene: die Linie liegt auf dem Achspunkt j = 0 bzw. H2
      const j = uMax < snapU ? 0 : H2;
      laengsSpur.set(l, { spur: { j, u: () => null }, iA, iB, achse: true });
      continue;
    }
    // schräge Linie: wandert über mehrere Ringpunkte (die freien Punkte werden gestaucht, die Fläche kann wellig werden)
    const wandert = (uMax - uMin) / (halb / H2);
    if (wandert > 2) hinweise.push(`Linie ${l.index + 1}: läuft schräg über ${wandert.toFixed(1)} Ringpunkte, Fläche kann sich wellen`);
    // Lücke zwischen den festen Punkten am mittleren Ring, darin der nächste freie Index
    const iM = Math.round((iA + iB) / 2);
    const fest = festBei(iM);
    const j = freierIndex(ringe[iM - 1]!, fest, uBei(iM));
    if (j === null || fest.has(j)) {
      hinweise.push(`Linie ${l.index + 1}: kein freier Ringpunkt (Ring hat zu wenige Punkte), ohne Kante`);
      continue;
    }
    // Kreuzt die Linie an einem anderen Ring einen festen Punkt?
    for (let i = iA; i <= iB; i++) {
      const fi = festBei(i);
      const u = uBei(i);
      const kreuzt = [...fi.entries()].some(([jf, uf]) => (jf < j && uf >= u) || (jf > j && uf <= u));
      if (kreuzt) {
        hinweise.push(`Linie ${l.index + 1}: kreuzt eine andere Kante (Ring ${i}), dort an den Nachbarn geklemmt`);
        break;
      }
    }
    const spur: Spur = { j, u: (i) => (i >= iA && i <= iB ? uBei(i) : null) };
    spuren.push(spur);
    laengsSpur.set(l, { spur, iA, iB, achse: false });
  }
  // Ausklingen hinter den Linienenden (zur freien Verteilung)
  const auslauf: { j: number; i: number; u: number }[] = [];
  for (const [l, ls] of laengsSpur) {
    if (ls.achse) continue;
    for (const [ende, richtung] of [
      [ls.iA, -1],
      [ls.iB, 1],
    ] as const) {
      const uEnde = probeBei(l.proben, 'f', st[ende - 1]!).u;
      for (let k = 1; k <= NACHLAUF; k++) {
        const i = ende + richtung * k;
        if (i < 1 || i > N) break;
        const fest = festBei(i, ls.spur);
        if (fest.has(ls.spur.j)) break;
        const frei = verteilen(ringe[i - 1]!, fest)[ls.spur.j]!;
        auslauf.push({ j: ls.spur.j, i, u: lerp(uEnde, frei, glatt(0, NACHLAUF + 1, k)) });
      }
    }
  }
  for (const a of auslauf) spuren.push({ j: a.j, u: (i) => (i === a.i ? a.u : null) });

  // --- Ringziele ---
  const ringPunkt = (i: number, j: number) => (i - 1) * R + (((j % R) + R) % R);
  const ziel: V3[] = new Array(N * R);
  /** u je Ringpunkt (rechte Hälfte) und Station je Ringpunkt (gekippte Ringe) */
  const ringU: number[][] = [];
  const ringF: number[][] = [];
  const querIndex = new Map<LinieInfo, { i: number; jA: number; jB: number }>();
  // 1. Verteilung je Ring (Querlinien: ihre Enden sind feste Punkte ihres Rings)
  for (let i = 1; i <= N; i++) {
    const h = ringe[i - 1]!;
    const fest = festBei(i);
    const ql = querRing.get(i);
    if (ql) {
      const uA = ql.proben[0]!.u;
      const uB = ql.proben[ql.proben.length - 1]!.u;
      const a = freierIndex(h, fest, uA);
      if (a !== null) fest.set(a, uA);
      const b = freierIndex(h, fest, uB);
      if (a === null || b === null || b <= a) {
        hinweise.push(`Linie ${ql.index + 1}: Querlinie zu kurz oder ohne freie Ringpunkte, ohne Kante`);
        if (a !== null && !festBei(i).has(a)) fest.delete(a);
      } else {
        fest.set(b, uB);
        querIndex.set(ql, { i, jA: a, jB: b });
      }
    }
    ringU.push(verteilen(h, fest));
  }
  // 2. Querlinien kippen ihren Ring: Versatz der Station je u (auf der Linie ihre Station, jenseits der Enden über zwei
  //    Ringpunkte zurück). Freie Nachbarringe neigen sich mit (0,5 und 0,2), damit die Bänder gleichmäßig breit bleiben;
  //    Ringe mit festen Stationen bleiben eben. Der Versatz ist auf 1,4 Ringabstände begrenzt (zum festen Nachbarn 0,7),
  //    wo er greift, liegt die Kante neben der Linie (Hinweis).
  const MITNEIGEN = [1, 0.5, 0.2];
  const versatz: { gewicht: number; d: (u: number) => number }[][] = Array.from({ length: N + 1 }, () => []);
  for (const [l, qi] of querIndex) {
    const i = qi.i;
    const u = ringU[i - 1]!;
    const uA = u[qi.jA]!;
    const uB = u[qi.jB]!;
    const rueck = (2 * halb) / H2;
    const frei = (k: number) => k >= 1 && k <= N && !zwangsRinge.has(k);
    const lucke = (k: number) => (k >= 1 && k <= N ? Math.abs(st[k - 1]! - st[i - 1]!) / Math.abs(k - i) : 0);
    const grenzeLo = i > 1 ? (frei(i - 1) ? 1.4 : 0.7) * lucke(i - 1) : st[i - 1]! - KAPPE / 2;
    const grenzeHi = i < N ? (frei(i + 1) ? 1.4 : 0.7) * lucke(i + 1) : 1 - KAPPE / 2 - st[i - 1]!;
    let klemmung = 0;
    const d = (uj: number) => {
      const fl = probeBei(l.proben, 'u', uj).f;
      const weg = uj < uA ? uA - uj : uj > uB ? uj - uB : 0;
      const roh = lerp(fl, st[i - 1]!, glatt(0, rueck, weg)) - st[i - 1]!;
      return Math.min(grenzeHi, Math.max(-grenzeLo, roh));
    };
    for (let j = qi.jA; j <= qi.jB; j++) {
      const roh = probeBei(l.proben, 'u', u[j]!).f - st[i - 1]!;
      if (Math.abs(roh - d(u[j]!)) > 1e-9) {
        const a = loft.punkt(st[i - 1]! + roh, u[j]!);
        const b = loft.punkt(st[i - 1]! + d(u[j]!), u[j]!);
        klemmung = Math.max(klemmung, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
    }
    if (klemmung > 0) hinweise.push(`Linie ${l.index + 1}: Querlinie zu schräg für die Ringabstände, Kante bis ${(klemmung * 461).toFixed(1)} px neben der Linie`);
    // schräg zu den Ringen (z. B. eine Linie im Gesicht, die keinem Ring um die Schnauze folgt): Sprung der Station
    // zwischen benachbarten Ringpunkten, gemessen in Ringabständen
    let sprung = 0;
    const abstand = Math.max(1e-6, Math.min(i > 1 ? st[i - 1]! - st[i - 2]! : Infinity, i < N ? st[i]! - st[i - 1]! : Infinity));
    for (let j = qi.jA + 1; j <= qi.jB; j++) sprung = Math.max(sprung, Math.abs(d(u[j]!) - d(u[j - 1]!)) / abstand);
    if (sprung > 0.5) hinweise.push(`Linie ${l.index + 1}: läuft schräg zu den Ringen (${sprung.toFixed(1)} Ringabstände je Ringpunkt), Fläche kann sich falten`);
    versatz[i]!.push({ gewicht: 1, d });
    for (const richtung of [-1, 1]) {
      for (let k = 1; k < MITNEIGEN.length; k++) {
        const nb = i + richtung * k;
        if (!frei(nb)) break;
        versatz[nb]!.push({ gewicht: MITNEIGEN[k]!, d });
      }
    }
  }
  // 3. Ringziele; die Stationen bleiben je Ringpunkt geordnet (kein Ring überholt seinen Nachbarn)
  for (let i = 1; i <= N; i++) {
    const u = ringU[i - 1]!;
    const fJ = u.map((uj) => st[i - 1]! + versatz[i]!.reduce((s, v) => s + v.gewicht * v.d(uj), 0));
    if (i > 1) {
      const vorher = ringF[i - 2]!;
      const lucke = st[i - 1]! - st[i - 2]!;
      for (let j = 0; j <= H2; j++) fJ[j] = Math.min(1 - KAPPE / 2, Math.max(fJ[j]!, vorher[j]! + 0.2 * lucke));
    }
    ringF.push(fJ);
    for (let j = 0; j <= H2; j++) {
      const p = loft.punkt(fJ[j]!, u[j]!);
      ziel[ringPunkt(i, j)] = p;
      if (j > 0 && j < H2) ziel[ringPunkt(i, R - j)] = [p[0], p[1], -p[2]];
    }
  }
  // hinterer Pol
  const mEnde = loft.mass(1 - 1e-4);
  ziel.push([loft.xMax, (mEnde.yLo + mEnde.yHi) / 2, 0]);
  const pol = ziel.length - 1;
  // Kappe vorn: 4×4-Gitter (Coons-Fläche aus Ring 1), innen auf die Vorderfläche gelegt
  const n4 = R / 4;
  const rand = (a: number, b: number): number => ringPunkt(1, kappenRandJ(R, a, b));
  const gitter: number[][] = [];
  for (let b = 0; b <= n4; b++) {
    const zeile: number[] = [];
    for (let a = 0; a <= n4; a++) {
      if (a === 0 || b === 0 || a === n4 || b === n4) {
        zeile.push(rand(a, b));
        continue;
      }
      const uu = a / n4;
      const vv = b / n4;
      const P = (k: number) => ziel[k]!;
      const T = P(rand(a, 0));
      const B = P(rand(a, n4));
      const L = P(rand(0, b));
      const Rr = P(rand(n4, b));
      const c00 = P(rand(0, 0));
      const c10 = P(rand(n4, 0));
      const c01 = P(rand(0, n4));
      const c11 = P(rand(n4, n4));
      const q: V3 = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        q[k] = (1 - vv) * T[k]! + vv * B[k]! + (1 - uu) * L[k]! + uu * Rr[k]! - ((1 - uu) * (1 - vv) * c00[k]! + uu * (1 - vv) * c10[k]! + (1 - uu) * vv * c01[k]! + uu * vv * c11[k]!);
      }
      const fv = fVorn(loft, q[1], q[2], st[0]!);
      if (fv !== null) q[0] = Math.min(q[0], loft.mass(fv).x);
      ziel.push(q);
      zeile.push(ziel.length - 1);
    }
    gitter.push(zeile);
  }

  // --- Flächen (wie der Tiger-Käfig) ---
  const flaechen: number[][] = [];
  for (let b = 0; b < n4; b++) for (let a = 0; a < n4; a++) flaechen.push([gitter[b]![a]!, gitter[b + 1]![a]!, gitter[b + 1]![a + 1]!, gitter[b]![a + 1]!]);
  for (let i = 1; i < N; i++) for (let j = 0; j < R; j++) flaechen.push([ringPunkt(i, j), ringPunkt(i, j + 1), ringPunkt(i + 1, j + 1), ringPunkt(i + 1, j)]);
  for (let j = 0; j < R; j++) flaechen.push([ringPunkt(N, j), ringPunkt(N, j + 1), pol]);

  // --- Schärfe und Wege ---
  const schaerfe = new Map<string, number>();
  const setze = (a: number, b: number, s: number) => {
    if (!(s > 1e-6)) return;
    const k = kante(a, b);
    schaerfe.set(k, Math.max(schaerfe.get(k) ?? 0, s));
  };
  const wege: KantenWeg[] = [];
  const spiegelJ = (j: number) => (j === 0 || j === H2 ? null : R - j);
  /** Schärfe der Kante zwischen Weg-Punkt k − 1 und k (n Punkte); freie Enden klingen auf der letzten Kante aus */
  const kantenSchaerfe = (hA: number, hB: number, k: number, n: number, freiA: boolean, freiB: boolean) =>
    ((S * (hA + hB)) / 2) * ((freiA && k === 1) || (freiB && k === n - 1) ? o.endKante : 1);
  /** Längsweg auf Ringindex j von Ring iA bis iB mit Härte je Ring */
  const laengsWeg = (quelle: KantenQuelle, j: number, iA: number, iB: number, h: (i: number) => number, frei: boolean) => {
    const punkte: number[] = [];
    const haerte: number[] = [];
    const sj = spiegelJ(j);
    for (let i = iA; i <= iB; i++) {
      punkte.push(ringPunkt(i, j));
      haerte.push(h(i));
      if (i > iA) {
        const s = kantenSchaerfe(h(i - 1), h(i), i - iA, iB - iA + 1, frei, frei);
        setze(ringPunkt(i - 1, j), ringPunkt(i, j), s);
        if (sj !== null) setze(ringPunkt(i - 1, sj), ringPunkt(i, sj), s);
      }
    }
    wege.push({ quelle, art: 'laengs', punkte, spiegel: sj === null ? [] : punkte.map((_, k) => ringPunkt(iA + k, sj)), haerte });
  };
  /** Querweg auf Ring i von jA bis jB (rechte Hälfte) mit Härte je Ringpunkt; Enden auf der Mittelebene sind nicht frei */
  const querWeg = (quelle: KantenQuelle, i: number, jA: number, jB: number, h: (j: number) => number, frei: boolean) => {
    const punkte: number[] = [];
    const spiegel: number[] = [];
    const haerte: number[] = [];
    for (let j = jA; j <= jB; j++) {
      punkte.push(ringPunkt(i, j));
      spiegel.push(ringPunkt(i, R - j));
      haerte.push(h(j));
      if (j > jA) {
        const s = kantenSchaerfe(h(j - 1), h(j), j - jA, jB - jA + 1, frei && jA !== 0, frei && jB !== H2);
        setze(ringPunkt(i, j - 1), ringPunkt(i, j), s);
        setze(ringPunkt(i, R - j + 1), ringPunkt(i, R - j), s);
      }
    }
    wege.push({ quelle, art: 'quer', punkte, spiegel: spiegel.every((p, k) => p === punkte[k]) ? [] : spiegel, haerte });
  };

  // Front-Ecken: Längskante über die ganze Länge, zu den Polen auslaufend
  let gMax = 0;
  for (let k = 0; k <= 64; k++) gMax = Math.max(gMax, groesse(loft, k / 64));
  for (const fs of frontSpur) {
    const h = (i: number) => haerteAn(fs.ecke, st[i - 1]!) * glatt(0, AUSLAUF, groesse(loft, st[i - 1]!) / (gMax || 1));
    laengsWeg({ art: 'ecke', ansicht: 'front', knoten: fs.ecke.knoten }, fs.j, 1, N, h, false);
  }
  // Ecken aus Seite und Top: Ringkante mit Verlauf nach der Ringnormale
  for (const er of eckRinge) {
    if (!er) continue;
    const i = er.f <= KAPPE ? 1 : ringVon(er.f);
    const h = ringe[i - 1]!;
    const w = ringU[i - 1]!.map((u) => ringGewicht(h, u, er, loft.lauf));
    const [a, b] = ausdehnung(w);
    if (a < 0) continue;
    querWeg({ art: 'ecke', ansicht: er.ecke.ansicht, knoten: er.ecke.knoten }, i, a, b, (j) => er.ecke.haerte * w[j]!, false);
  }
  // Linien
  for (const l of linien) {
    if (l.art === 'laengs') {
      const ls = laengsSpur.get(l);
      if (!ls) continue;
      laengsWeg({ art: 'linie', index: l.index }, ls.spur.j, ls.iA, ls.iB, (i) => probeBei(l.proben, 'f', st[i - 1]!).h, true);
    } else {
      const qi = querIndex.get(l);
      if (!qi) continue;
      querWeg({ art: 'linie', index: l.index }, qi.i, qi.jA, qi.jB, (j) => probeBei(l.proben, 'u', ringU[qi.i - 1]![j]!).h, true);
    }
  }

  const roh: Netz = { punkte: ziel.map((p) => [...p] as V3), flaechen, schaerfe };
  const netz = anZielAnpassen(roh, ziel, o.iterationen, S);
  return { netz, roh, ziel, wege, stationen: st, ringe: N, ring: R, stufen: S, ringPunkt, pol, hinweise };
}

/**
 * Unterteilte Fläche (Stufen wie beim Anpassen) mit den Wegen als Punktketten der feinen Fläche: Die Kanten in 3D
 * folgen diesen Ketten (rechte Hälfte, Spiegelbilder als eigene Ketten hinten angehängt).
 */
export function kantenFlaeche(kk: KantenKaefig, stufen = kk.stufen): { netz: Netz; ketten: { weg: number; spiegel: boolean; punkte: number[] }[] } {
  let netz = kk.netz;
  let ketten = kk.wege.flatMap((w, i) => [
    { weg: i, spiegel: false, punkte: w.punkte },
    ...(w.spiegel.length ? [{ weg: i, spiegel: true, punkte: w.spiegel }] : []),
  ]);
  for (let s = 0; s < stufen; s++) {
    const n = netz;
    ketten = ketten.map((k) => ({ ...k, punkte: k.punkte.length > 1 ? ketteUnterteilen(n, k.punkte) : k.punkte }));
    netz = unterteilen(netz);
  }
  return { netz, ketten };
}
