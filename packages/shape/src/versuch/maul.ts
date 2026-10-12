// VERSUCH (12.10.2026): Maul im Netz. Florians Ablauf: Körper → Maullinie (Start auf der Achse bzw. Kontur,
// Ende im Mundwinkel) → Kiefer gleich oder getrennt → offener Zustand mit roter Ober- und blauer Unterlippe.
//
// Bauweise (feste Topologie für jedes Wesen und jeden Zustand, damit Blendshapes und Mischen gehen):
// - Röhrenkäfig wie beim Tiger (Ringe vorn → hinten, 4×4-Kappe vorn, Pol hinten), j = 0 oben, 4 rechts (+z).
// - Naht: mittlere Kappenzeile (Mitte = Start auf der Achse) und Ringpunkt j = 4 (links j = 12) von Ring 1 bis
//   zum Winkelring K. Jeder Nahtpunkt außer dem Mundwinkel gibt es zweimal: oben (O) und unten (U).
// - Die Naht hat die OFFENE Länge: Der Mundwinkel wandert beim Öffnen nach hinten (beim Tiger 58 px). Hinter dem
//   sichtbaren geschlossenen Mundwinkel liegen O und U aufeinander (Reißverschluss).
// - Die Ringe werden so verteilt, dass ihre Nahtpunkte genau auf der Linie liegen (keine Zickzack-Kante), und
//   bekommen ein Lippenband (j = 3 und 5) in festem Abstand.
// - Maultasche: 7 Reihen je Nahtspalte (0 Oberrand, 1 innere Oberlippe, 2 Gaumen, 3 Rachen, 4 Boden,
//   5 innere Unterlippe, 6 Unterrand), an jedem Mundwinkel ein versteckter Pol. Die Tasche wird offen entworfen
//   und mit den Kieferbewegungen in den geschlossenen Zustand zurückgerechnet (dann bleibt die Korrektur klein).

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import { type Netz, type V3, kante, unterteilenMehrfach } from './catmullClark';
import { type Starr, anwenden, harmonisch, nachbarn, posieren, starreAnpassung } from './kiefer';
import { TIGER_STANDARD, type TigerOptionen, kappenRandJ, ringKontext } from './tigerKaefig';
import { abstand3, drehe, lerp3, mal3, minus3, mittel3, normiert3, plus3, punkt3, spiegelZ, zugLaenge, zugPunkt } from './v3';

/** Lippenlinien der rechten Hälfte, je vom Start auf der Mittelebene (z = 0) zum Mundwinkel (Florians Punkte). */
export type Lippen3 = { oben: V3[]; unten?: V3[] };
/** `dokAuf`: Profile des offenen Zustands (Fressen); die offene Haut legt sich an deren Seitensilhouette. */
export type MaulEingabe = { zu: Lippen3; auf?: { oben: V3[]; unten: V3[] }; dokAuf?: Dokument };

export type MaulOptionen = TigerOptionen & {
  /** Ringe von Ring 1 bis zum Mundwinkel */
  nahtRinge: number;
  /** Breite des Lippenbands (Bogenlänge auf dem Querschnitt, Kachel) */
  lippenband: number;
  /** Schärfe der Lippenkante (≥ Stufenzahl = pixelscharf) */
  lippenSchaerfe: number;
  /** Tiefe der Tasche als Anteil des Abstands Maulmitte → Gelenk */
  taschenTiefe: number;
};

export const MAUL_STANDARD: MaulOptionen = {
  ...TIGER_STANDARD,
  ringe: 18,
  ring: 16,
  kastenBis: 0,
  uebergang: 0.01,
  nahtRinge: 6,
  lippenband: 0.012,
  lippenSchaerfe: 3,
  taschenTiefe: 0.8,
};

export type Bereich = 'haut' | 'naht' | 'lippenband' | 'tasche';

export type MaulKaefig = {
  /** Topologie mit den Zielen für „zu“ als Startpunkten */
  netz: Netz;
  zielZu: V3[];
  zielAuf: V3[] | null;
  bereiche: Bereich[];
  /** Kiefergewichte je Käfigpunkt */
  gewichtOben: number[];
  gewichtUnten: number[];
  /** Nahtspalten von links nach rechts (13): Indizes der oberen und unteren Kopie, dazu die Mundwinkel */
  nahtOben: number[];
  nahtUnten: number[];
  ecken: [number, number];
  /** Taschenpunkte [Spalte][Reihe 0…6] (Reihe 0 = nahtOben, 6 = nahtUnten) */
  tasche: number[][];
  /** Anteil der Naht, der geschlossen sichtbar ist (dahinter Reißverschluss) */
  sichtbar: number;
  /** Bogenanteile der Nahtpunkte v0…vK+1 auf der Naht */
  nahtAnteile: number[];
  stationen: number[];
  /** Kieferbewegungen aus den gezeichneten Punktpaaren (zu → auf) */
  kiefer: { oben: Starr; unten: Starr } | null;
  /** Hinweise (z. B. „Naht läuft nicht monoton nach hinten“) */
  hinweise: string[];
};

const glattStufe = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Catmull-Rom durch die Punkte (zentripetal), n Teilstücke je Abschnitt. */
export function glatterZug(pts: readonly V3[], n = 12): V3[] {
  if (pts.length < 3) {
    if (pts.length < 2) return pts.map((p) => [...p] as V3);
    const out: V3[] = [];
    for (let k = 0; k <= n; k++) out.push(lerp3(pts[0]!, pts[1]!, k / n));
    return out;
  }
  const P = [plus3(pts[0]!, minus3(pts[0]!, pts[1]!)), ...pts, plus3(pts[pts.length - 1]!, minus3(pts[pts.length - 1]!, pts[pts.length - 2]!))];
  const out: V3[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1]!, P[i]!, P[i + 1]!, P[i + 2]!];
    const t0 = 0;
    const t1 = t0 + Math.sqrt(Math.max(1e-9, abstand3(p0, p1)));
    const t2 = t1 + Math.sqrt(Math.max(1e-9, abstand3(p1, p2)));
    const t3 = t2 + Math.sqrt(Math.max(1e-9, abstand3(p2, p3)));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = t1 + ((t2 - t1) * k) / n;
      const A1 = lerp3(p0, p1, (t - t0) / (t1 - t0));
      const A2 = lerp3(p1, p2, (t - t1) / (t2 - t1));
      const A3 = lerp3(p2, p3, (t - t2) / (t3 - t2));
      const B1 = lerp3(A1, A2, (t - t0) / (t2 - t0));
      const B2 = lerp3(A2, A3, (t - t1) / (t3 - t1));
      out.push(lerp3(B1, B2, (t - t1) / (t2 - t1)));
    }
  }
  return out;
}

/** Bogenlängen-Parametrisierung der rechten Querschnittshälfte (oben → unten). */
type Halbring = { pkt: V3[]; s: number[]; laenge: number };

function halbring(ring: V3[]): Halbring {
  const R = ring.length;
  const pkt = ring.slice(0, R / 2 + 1);
  const s = [0];
  for (let i = 1; i < pkt.length; i++) s.push(s[i - 1]! + abstand3(pkt[i - 1]!, pkt[i]!));
  return { pkt, s, laenge: s[s.length - 1]! };
}

function aufHalbring(h: Halbring, s: number): V3 {
  const z = Math.min(h.laenge, Math.max(0, s));
  let i = 1;
  while (i < h.s.length - 1 && h.s[i]! < z) i++;
  const d = h.s[i]! - h.s[i - 1]!;
  return lerp3(h.pkt[i - 1]!, h.pkt[i]!, d > 1e-12 ? (z - h.s[i - 1]!) / d : 0);
}

/** Bogenposition des nächsten Punkts auf dem Halbring (in der y-z-Ebene). */
function bogenVon(h: Halbring, p: V3): number {
  let best = Infinity;
  let bestS = 0;
  for (let i = 1; i < h.pkt.length; i++) {
    const a = h.pkt[i - 1]!;
    const b = h.pkt[i]!;
    const ab = [b[1] - a[1], b[2] - a[2]] as const;
    const l2 = ab[0] * ab[0] + ab[1] * ab[1];
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p[1] - a[1]) * ab[0] + (p[2] - a[2]) * ab[1]) / l2)) : 0;
    const d = Math.hypot(a[1] + ab[0] * t - p[1], a[2] + ab[1] * t - p[2]);
    if (d < best) {
      best = d;
      bestS = h.s[i - 1]! + t * (h.s[i]! - h.s[i - 1]!);
    }
  }
  return bestS;
}

/** Liegt (y, z) im Querschnitt? (Strahltest gegen das Polygon) */
function imRing(ring: readonly V3[], y: number, z: number): boolean {
  let innen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a[2] > z !== b[2] > z && y < ((b[1] - a[1]) * (z - a[2])) / (b[2] - a[2] || 1e-12) + a[1]) innen = !innen;
  }
  return innen;
}

export function maulKaefig(dok: Dokument, eingabe: MaulEingabe, opt: MaulOptionen = MAUL_STANDARD): MaulKaefig {
  const R = opt.ring;
  const N = opt.ringe;
  const K = opt.nahtRinge;
  if (R !== 16) throw new Error('Maul-Käfig: Ring mit 16 Punkten erwartet (Kappe 4×4)');
  const F = 96; // feine Querschnitte
  const rk = ringKontext(dok, opt);
  const { xMin, xMax } = rk;
  const fVon = (x: number) => Math.min(1, Math.max(0, (x - xMin) / (xMax - xMin)));
  const hinweise: string[] = [];

  // --- Projektion auf die Körperfläche S0 (Querschnitte als Fläche) ---
  const fein = new Map<number, V3[]>();
  const feinRing = (f: number) => {
    const key = Math.round(f * 4000) / 4000;
    let r = fein.get(key);
    if (!r) {
      r = rk.ring(key, F);
      fein.set(key, r);
    }
    return r;
  };
  /** Vorderfläche: kleinstes x, bei dem (y, z) im Querschnitt liegt (Bisektion). */
  const xVorn = (y: number, z: number, fBis: number): number | null => {
    if (!imRing(feinRing(fBis), y, z)) return null;
    let lo = 0;
    let hi = fBis;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2;
      if (imRing(feinRing(m), y, z)) hi = m;
      else lo = m;
    }
    return xMin + (xMax - xMin) * hi;
  };
  /** Punkt auf S0: seitlich (y-z im Querschnitt bei x) oder vorn (x bei y, z), was näher liegt. */
  const aufFlaeche = (p: V3): V3 => {
    const f = fVon(p[0]);
    const h = halbring(feinRing(f));
    const q = aufHalbring(h, bogenVon(h, [p[0], p[1], Math.abs(p[2])]));
    const seitlich: V3 = [p[0], q[1], Math.sign(p[2] || 1) * Math.abs(q[2])];
    const xv = xVorn(p[1], p[2], Math.min(1, f + 0.25));
    if (xv === null) return seitlich;
    const vorn: V3 = [xv, p[1], p[2]];
    return abstand3(vorn, p) < abstand3(seitlich, p) ? vorn : seitlich;
  };

  // --- Naht im geschlossenen Zustand ---
  const zuOben = glatterZug(eingabe.zu.oben, 16).map(aufFlaeche);
  zuOben[0] = [zuOben[0]![0], zuOben[0]![1], 0];
  let kiefer: MaulKaefig['kiefer'] = null;
  let naht = zuOben;
  const sichtbarLaenge = zugLaenge(zuOben);
  if (eingabe.auf) {
    // Kieferbewegung aus Florians Punktpaaren (türkis → rot bzw. blau), Mundwinkel ausgenommen (Reißverschluss);
    // gespiegelte Paare dazu, damit die Achse symmetrisch bleibt
    const paare = (a: V3[], b: V3[]) => {
      const n = Math.min(a.length, b.length) - 1;
      const A: V3[] = [];
      const B: V3[] = [];
      for (let i = 0; i < n; i++) {
        A.push(a[i]!, spiegelZ(a[i]!));
        B.push(b[i]!, spiegelZ(b[i]!));
      }
      return { A, B };
    };
    const po = paare(eingabe.zu.oben, eingabe.auf.oben);
    const pu = paare(eingabe.zu.unten ?? eingabe.zu.oben, eingabe.auf.unten);
    kiefer = { oben: starreAnpassung(po.A, po.B), unten: starreAnpassung(pu.A, pu.B) };
    // offener Mundwinkel, zurück in den geschlossenen Zustand gerechnet (Mittel beider Kiefer)
    const eckeAuf = eingabe.auf.oben[eingabe.auf.oben.length - 1]!;
    const zurueck = (s: Starr, p: V3): V3 => {
      const R0 = s.R;
      const RT: Starr['R'] = [
        [R0[0][0], R0[1][0], R0[2][0]],
        [R0[0][1], R0[1][1], R0[2][1]],
        [R0[0][2], R0[1][2], R0[2][2]],
      ];
      return drehe(RT, minus3(p, s.t));
    };
    // Der Mundwinkel liegt am Gelenk, dort bewegt sich kaum etwas: Wo er offen sitzt, endet geschlossen die Naht
    void zurueck;
    const eckeZu = aufFlaeche(eckeAuf);
    const ende = zuOben[zuOben.length - 1]!;
    const tang = normiert3(minus3(ende, zuOben[zuOben.length - 2]!));
    const weg = abstand3(eckeZu, ende);
    if (weg > 0.08 * sichtbarLaenge && eckeZu[0] > ende[0]) {
      // Reißverschluss: Hermite-Kurve vom geschlossenen zum zurückgerechneten offenen Mundwinkel, auf S0
      const t1 = normiert3(minus3(eckeZu, ende));
      const verl: V3[] = [];
      for (let k = 1; k <= 16; k++) {
        const t = k / 16;
        const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
        const h10 = t ** 3 - 2 * t ** 2 + t;
        const h01 = -2 * t ** 3 + 3 * t ** 2;
        const h11 = t ** 3 - t ** 2;
        const p = plus3(plus3(mal3(ende, h00), mal3(tang, h10 * weg)), plus3(mal3(eckeZu, h01), mal3(t1, h11 * weg)));
        verl.push(aufFlaeche(p));
      }
      naht = [...zuOben, ...verl];
    }
  }
  const nahtLaenge = zugLaenge(naht);
  const sichtbar = sichtbarLaenge / nahtLaenge;

  // Nahtpunkte v0 … vK+1: v0 Mitte, v1/v2 auf der Stirn (bis die Linie nach hinten abbiegt), v2 = Ring 1,
  // v3 … vK+1 gleichmäßig auf dem Rest (vK+1 = Mundwinkel = Ring K)
  let sStirn = 0;
  {
    let s = 0;
    for (let i = 1; i < naht.length; i++) {
      const d = minus3(naht[i]!, naht[i - 1]!);
      s += Math.hypot(d[0], d[1], d[2]);
      if (d[0] >= Math.abs(d[2]) && s > 0.04 * nahtLaenge) break;
      sStirn = s;
    }
  }
  sStirn = Math.min(0.6 * nahtLaenge, Math.max(0.1 * nahtLaenge, sStirn));
  const nahtAnteile = [0, sStirn / 2, sStirn];
  for (let k = 1; k <= K - 1; k++) nahtAnteile.push(sStirn + ((nahtLaenge - sStirn) * k) / (K - 1));
  const anteile = nahtAnteile.map((s) => s / nahtLaenge);
  const v: V3[] = anteile.map((a) => zugPunkt(naht, a));
  v[0] = [v[0]![0], v[0]![1], 0];

  // --- Stationen: Ringe 1 … K auf den Nahtpunkten v2 … vK+1, dahinter nach Krümmung ---
  const stationen: number[] = [];
  for (let i = 1; i <= K; i++) stationen.push(fVon(v[i + 1]![0]));
  for (let i = 1; i < K; i++) {
    if (stationen[i]! <= stationen[i - 1]! + 0.004) {
      hinweise.push(`Naht läuft bei Ring ${i + 1} nicht nach hinten (x nicht monoton)`);
      stationen[i] = stationen[i - 1]! + 0.004;
    }
  }
  stationen[0] = Math.max(0.004, stationen[0]!);
  {
    const fK = stationen[K - 1]!;
    const rest = N - K;
    // Dichte: Krümmung der Seitensilhouette, geglättet; dichter zum Ende hin wie beim Tiger
    const B = 160;
    const dichte = new Array<number>(B).fill(1);
    const seite = rk.seite;
    for (let i = 1; i < seite.length - 1; i++) {
      const a = seite[i - 1]!;
      const p = seite[i]!;
      const c = seite[i + 1]!;
      let dw = Math.abs(Math.atan2(c.y - p.y, c.x - p.x) - Math.atan2(p.y - a.y, p.x - a.x));
      if (dw > Math.PI) dw = 2 * Math.PI - dw;
      const f = fVon(p.x);
      if (f <= fK) continue;
      const k = Math.min(B - 1, Math.floor(((f - fK) / (1 - fK)) * B));
      dichte[k] = dichte[k]! + dw * 6;
    }
    const kum = [0];
    for (let k = 0; k < B; k++) {
      let sum = 0;
      let n = 0;
      for (let d = -4; d <= 4; d++) {
        const w = dichte[k + d];
        if (w === undefined) continue;
        sum += w;
        n++;
      }
      kum.push(kum[k]! + sum / n);
    }
    for (let i = 1; i <= rest; i++) {
      const ziel = (kum[B]! * i) / (rest + 1);
      let k = 0;
      while (k < B && kum[k + 1]! < ziel) k++;
      const g = (k + (ziel - kum[k]!) / (kum[k + 1]! - kum[k]! || 1)) / B;
      stationen.push(fK + (1 - fK) * g);
    }
  }

  // --- Ringziele: Bogenlängen-Verteilung, Nahtpunkt und Lippenband fest ---
  const ringPunkt = (i: number, j: number) => (i - 1) * R + (((j % R) + R) % R);
  const ziel: V3[] = [];
  const q = R / 4; // j des Nahtpunkts rechts
  let fracK = 0.5;
  for (let i = 1; i <= N; i++) {
    const f = stationen[i - 1]!;
    const h = halbring(feinRing(f));
    let sNaht: number;
    let lb = opt.lippenband;
    if (i <= K) {
      sNaht = bogenVon(h, v[i + 1]!);
      if (i === K) fracK = sNaht / h.laenge;
    } else {
      // hinter dem Mundwinkel weich zurück zur Standardverteilung
      const w = glattStufe(0, 3, i - K);
      sNaht = h.laenge * (fracK + (0.5 - fracK) * w);
      lb *= 1 - w;
    }
    lb = Math.min(lb, sNaht / 3, (h.laenge - sNaht) / 3);
    const sj: number[] = new Array(R / 2 + 1);
    sj[0] = 0;
    sj[R / 2] = h.laenge;
    sj[q] = sNaht;
    if (lb > 1e-6) {
      sj[q - 1] = sNaht - lb;
      sj[q + 1] = sNaht + lb;
      for (let j = 1; j < q - 1; j++) sj[j] = ((sNaht - lb) * j) / (q - 1);
      for (let j = q + 2; j < R / 2; j++) sj[j] = sNaht + lb + ((h.laenge - sNaht - lb) * (j - q - 1)) / (R / 2 - q - 1);
    } else {
      for (let j = 1; j < q; j++) sj[j] = (sNaht * j) / q;
      for (let j = q + 1; j < R / 2; j++) sj[j] = sNaht + ((h.laenge - sNaht) * (j - q)) / (R / 2 - q);
    }
    const halb = sj.map((s) => aufHalbring(h, s));
    for (let j = 0; j < R; j++) ziel.push(j <= R / 2 ? halb[j]! : spiegelZ(halb[R - j]!));
    if (i <= K) {
      // Nahtpunkt exakt (auf S0 projiziert)
      ziel[ringPunkt(i, q)] = [...v[i + 1]!] as V3;
      ziel[ringPunkt(i, R - q)] = spiegelZ(v[i + 1]!);
    }
  }
  // hinterer Pol
  const vEnde = rk.seite.filter((p) => p.x > xMax - (xMax - xMin) * 0.01);
  ziel.push([xMax, vEnde.length ? vEnde.reduce((a, p) => a + p.y, 0) / vEnde.length : 0, 0]);
  const pol = ziel.length - 1;

  // --- Kappe: zwei Coons-Flächen (über und unter der Nahtzeile), dann nach vorn auf die Fläche ---
  const n4 = R / 4;
  const rand = (a: number, b: number): number => ringPunkt(1, kappenRandJ(R, a, b));
  const gitter: number[][] = Array.from({ length: n4 + 1 }, () => new Array<number>(n4 + 1).fill(-1));
  for (let b = 0; b <= n4; b++) for (let a = 0; a <= n4; a++) if (a === 0 || b === 0 || a === n4 || b === n4) gitter[b]![a] = rand(a, b);
  const mb = n4 / 2; // Nahtzeile
  const nahtKappe: V3[] = [spiegelZ(v[2]!), spiegelZ(v[1]!), v[0]!, v[1]!, v[2]!];
  for (let a = 1; a < n4; a++) {
    ziel.push([...nahtKappe[a]!] as V3);
    gitter[mb]![a] = ziel.length - 1;
  }
  const P = (b: number, a: number) => ziel[gitter[b]![a]!]!;
  const coons = (b0: number, b1: number) => {
    for (let b = b0 + 1; b < b1; b++) {
      for (let a = 1; a < n4; a++) {
        const u = a / n4;
        const w = (b - b0) / (b1 - b0);
        const T = P(b0, a);
        const Bt = P(b1, a);
        const L = P(b, 0);
        const Rr = P(b, n4);
        const c00 = P(b0, 0);
        const c10 = P(b0, n4);
        const c01 = P(b1, 0);
        const c11 = P(b1, n4);
        const p: V3 = [0, 0, 0];
        for (let k = 0; k < 3; k++) {
          p[k] = (1 - w) * T[k]! + w * Bt[k]! + (1 - u) * L[k]! + u * Rr[k]! - ((1 - u) * (1 - w) * c00[k]! + u * (1 - w) * c10[k]! + (1 - u) * w * c01[k]! + u * w * c11[k]!);
        }
        const xv = xVorn(p[1], p[2], stationen[0]!);
        if (xv !== null) p[0] = Math.min(p[0], xv);
        ziel.push(p);
        gitter[b]![a] = ziel.length - 1;
      }
    }
  };
  coons(0, mb);
  coons(mb, n4);

  // --- Flächen der Haut ---
  const flaechen: number[][] = [];
  const unten: boolean[] = []; // Fläche liegt unter der Naht (Unterkiefer)
  for (let b = 0; b < n4; b++) {
    for (let a = 0; a < n4; a++) {
      flaechen.push([gitter[b]![a]!, gitter[b + 1]![a]!, gitter[b + 1]![a + 1]!, gitter[b]![a + 1]!]);
      unten.push(b >= mb);
    }
  }
  for (let i = 1; i < N; i++) {
    for (let j = 0; j < R; j++) {
      flaechen.push([ringPunkt(i, j), ringPunkt(i, j + 1), ringPunkt(i + 1, j + 1), ringPunkt(i + 1, j)]);
      unten.push(i < K && j >= q && j < R - q);
    }
  }
  for (let j = 0; j < R; j++) {
    flaechen.push([ringPunkt(N, j), ringPunkt(N, j + 1), pol]);
    unten.push(false);
  }

  // --- Naht aufschneiden: Spalten links → rechts (vK … v1 links, v0, v1 … vK rechts), Mundwinkel = Ring K ---
  const spalten: number[] = [];
  for (let k = K; k >= 1; k--) spalten.push(k >= 2 ? ringPunkt(k - 1, R - q) : gitter[mb]![mb - 1]!);
  spalten.push(gitter[mb]![mb]!);
  for (let k = 1; k <= K; k++) spalten.push(k >= 2 ? ringPunkt(k - 1, q) : gitter[mb]![mb + 1]!);
  const ecken: [number, number] = [ringPunkt(K, R - q), ringPunkt(K, q)];
  const nahtUnten: number[] = spalten.map((o) => {
    ziel.push([...ziel[o]!] as V3);
    return ziel.length - 1;
  });
  const zuUnten = new Map(spalten.map((o, c) => [o, nahtUnten[c]!]));
  flaechen.forEach((f, fi) => {
    if (!unten[fi]) return;
    for (let k = 0; k < f.length; k++) {
      const u = zuUnten.get(f[k]!);
      if (u !== undefined) f[k] = u;
    }
  });

  // --- Maultasche: Reihen 1 … 5 je Spalte, Pole an den Mundwinkeln ---
  const C = spalten.length;
  const tasche: number[][] = [];
  for (let c = 0; c < C; c++) {
    const reihe = [spalten[c]!];
    for (let r = 1; r <= 5; r++) {
      ziel.push([0, 0, 0]);
      reihe.push(ziel.length - 1);
    }
    reihe.push(nahtUnten[c]!);
    tasche.push(reihe);
  }
  for (let c = 0; c < C - 1; c++) {
    for (let r = 0; r < 6; r++) flaechen.push([tasche[c + 1]![r]!, tasche[c]![r]!, tasche[c]![r + 1]!, tasche[c + 1]![r + 1]!]);
  }
  ziel.push([0, 0, 0], [0, 0, 0]);
  const pole: [number, number] = [ziel.length - 2, ziel.length - 1];
  {
    // rechts
    const [O, P1, P2, P3, P4, P5, U] = tasche[C - 1]! as [number, number, number, number, number, number, number];
    const Q = pole[1];
    const E = ecken[1];
    flaechen.push([O, P1, Q, E], [Q, P5, U, E], [Q, P1, P2], [Q, P2, P3], [Q, P3, P4], [Q, P4, P5]);
  }
  {
    // links
    const [O, P1, P2, P3, P4, P5, U] = tasche[0]! as [number, number, number, number, number, number, number];
    const Q = pole[0];
    const E = ecken[0];
    flaechen.push([E, Q, P1, O], [E, U, P5, Q], [Q, P2, P1], [Q, P3, P2], [Q, P4, P3], [Q, P5, P4]);
  }

  // --- Lippenkante scharf ---
  const schaerfe = new Map<string, number>();
  const rimO = [ecken[0], ...spalten, ecken[1]];
  const rimU = [ecken[0], ...nahtUnten, ecken[1]];
  for (const rim of [rimO, rimU]) for (let i = 0; i < rim.length - 1; i++) schaerfe.set(kante(rim[i]!, rim[i + 1]!), opt.lippenSchaerfe);

  // --- Bereiche und Kiefergewichte ---
  const nP = ziel.length;
  const bereiche: Bereich[] = new Array(nP).fill('haut');
  const gO = new Array<number>(nP).fill(0);
  const gU = new Array<number>(nP).fill(0);
  const fadeO = (i: number) => (i <= K ? 1 : 1 - glattStufe(0, 4, i - K));
  const fadeU = (i: number) => (i <= K ? 1 : 1 - glattStufe(0, 2, i - K));
  for (let i = 1; i <= N; i++) {
    for (let j = 0; j < R; j++) {
      const p = ringPunkt(i, j);
      const oben = j < q || j > R - q;
      const mitte = j === q || j === R - q;
      if (mitte && i >= K) {
        gO[p] = 0.5 * fadeO(i);
        gU[p] = 0.5 * fadeU(i);
      } else if (oben || mitte) gO[p] = fadeO(i);
      else gU[p] = fadeU(i);
      if (i <= K && (j === q - 1 || j === q + 1 || j === R - q - 1 || j === R - q + 1)) bereiche[p] = 'lippenband';
    }
  }
  for (let b = 0; b <= n4; b++) {
    for (let a = 0; a <= n4; a++) {
      const p = gitter[b]![a]!;
      if (a === 0 || a === n4 || b === 0 || b === n4) continue;
      if (b < mb) gO[p] = 1;
      else if (b > mb) gU[p] = 1;
      else gO[p] = 1;
      if (b === mb - 1 || b === mb + 1) bereiche[p] = 'lippenband';
    }
  }
  for (let c = 0; c < C; c++) {
    const r = tasche[c]!;
    r.forEach((p, k) => {
      if (k === 0 || k === 6) bereiche[p] = 'naht';
      else bereiche[p] = 'tasche';
      if (k <= 2) gO[p] = 1;
      else if (k >= 4) gU[p] = 1;
      else {
        gO[p] = 0.5;
        gU[p] = 0.5;
      }
      if (k === 0) gO[p] = 1;
      if (k === 6) {
        gO[p] = 0;
        gU[p] = 1;
      }
    });
  }
  for (const p of pole) {
    bereiche[p] = 'tasche';
    gO[p] = 0.5;
    gU[p] = 0.5;
  }
  for (const e of ecken) {
    bereiche[e] = 'naht';
    gO[e] = 0.5;
    gU[e] = 0.5;
  }

  // --- Zielpunkte der Tasche: offen entworfen, für „zu“ mit den Kiefern zurückgerechnet ---
  const kieferJetzt = kiefer ?? standardKiefer(v, R);
  const zielZu = ziel.map((p) => [...p] as V3);
  const zielAuf: V3[] | null = eingabe.auf ? new Array(nP) : null;

  // offene Lippen (rechte Hälfte), an den Bogenanteilen der Naht
  const aufOben = eingabe.auf ? glatterZug(eingabe.auf.oben, 16) : null;
  const aufUnten = eingabe.auf ? glatterZug(eingabe.auf.unten, 16) : null;
  if (aufOben) aufOben[0] = [aufOben[0]![0], aufOben[0]![1], 0];
  if (aufUnten) aufUnten[0] = [aufUnten[0]![0], aufUnten[0]![1], 0];
  const randAuf = (zug: V3[] | null, rim: 'oben' | 'unten'): { spalten: V3[]; ecke: V3 } => {
    const out: V3[] = [];
    for (let c = 0; c < C; c++) {
      const k = Math.abs(c - (C - 1) / 2); // 0 Mitte … K Mundwinkel
      const seite = c < (C - 1) / 2 ? -1 : 1;
      let p: V3;
      if (zug) p = zugPunkt(zug, anteile[k]!);
      else {
        const zu = v[k]!;
        p = anwenden(rim === 'oben' ? kieferJetzt.oben : kieferJetzt.unten, zu);
      }
      out.push(seite < 0 ? spiegelZ(p) : p);
    }
    const ecke = zug ? zug[zug.length - 1]! : anwenden(kieferJetzt.unten, v[K + 1]!);
    return { spalten: out, ecke };
  };
  const offenO = randAuf(aufOben, 'oben');
  const offenU = randAuf(aufUnten, 'unten');
  const eckeAuf = mittel3([offenO.ecke, offenU.ecke]);

  // Gelenkpunkt des Unterkiefers (für die Taschentiefe): Mitte zwischen den Mundwinkeln, etwas hinten
  const mitteMaul = mittel3([...offenO.spalten, ...offenU.spalten]);
  const maulLaenge = Math.max(0.03, abstand3(v[0]!, v[K + 1]!));
  const throatAuf: V3 = [eckeAuf[0] + 0.35 * maulLaenge, eckeAuf[1], 0];
  const tiefe0 = opt.taschenTiefe * Math.max(0.02, abstand3(mitteMaul, throatAuf));
  const halbBreite = Math.max(...offenO.spalten.map((p) => Math.abs(p[2])), 1e-3);
  const taschenAuf: V3[][] = [];
  for (let c = 0; c < C; c++) {
    const O = offenO.spalten[c]!;
    const U = offenU.spalten[c]!;
    const t = (c - (C - 1) / 2) / ((C - 1) / 2); // −1 … 1
    const M = mittel3([O, U]);
    const T: V3 = [throatAuf[0], throatAuf[1], t * 0.35 * halbBreite];
    const e1 = normiert3(minus3(T, M));
    const offen = minus3(O, U);
    let e2 = minus3(offen, mal3(e1, punkt3(offen, e1)));
    e2 = abstand3(e2, [0, 0, 0]) > 1e-9 ? normiert3(e2) : [0, 1, 0];
    const d = tiefe0 * Math.sqrt(Math.max(0.05, 1 - 0.9 * t * t));
    const hO = 0.3 * abstand3(O, U) + 0.15 * d;
    const hU = 0.3 * abstand3(O, U) + 0.15 * d;
    const lip = Math.min(opt.lippenband * 1.5, 0.3 * d);
    taschenAuf.push([
      O,
      plus3(O, mal3(e1, lip)),
      plus3(plus3(M, mal3(e1, d * 0.55)), mal3(e2, hO)),
      plus3(M, mal3(e1, d)),
      plus3(plus3(M, mal3(e1, d * 0.55)), mal3(e2, -hU)),
      plus3(U, mal3(e1, lip)),
      U,
    ]);
  }

  // Taschenpunkte für „zu“: eine flache Linse von der Naht zum Rachen (Gaumen leicht nach oben, Boden nach unten).
  // Versuch 12.10.: Die offene Tasche über die Kiefer zurückzurechnen, ließ die Spalten beim Tiger (Kopf kippt weit)
  // einander kreuzen. Die Linse wird deshalb direkt gebaut; den Übergang trägt die Korrektur-Blendshape.
  const eckeZuPos = zielZu[ecken[1]]!;
  const halbBreiteZu = Math.max(...spalten.map((o) => Math.abs(zielZu[o]![2])), 1e-3);
  const throatZu: V3 = [eckeZuPos[0] + 0.35 * maulLaenge, eckeZuPos[1], 0];
  for (let c = 0; c < C; c++) {
    const r = tasche[c]!;
    const O = zielZu[r[0]!]!;
    const U = zielZu[r[6]!]!;
    const t = (c - (C - 1) / 2) / ((C - 1) / 2);
    const M = mittel3([O, U]);
    const T: V3 = [throatZu[0], throatZu[1], t * 0.35 * halbBreiteZu];
    const e1 = normiert3(minus3(T, M));
    const offen = minus3(O, U);
    let e2: V3 = abstand3(O, U) > 1e-6 ? minus3(offen, mal3(e1, punkt3(offen, e1))) : minus3([0, 1, 0], mal3(e1, e1[1]));
    e2 = normiert3(e2);
    const d = 0.9 * abstand3(T, M) * Math.sqrt(Math.max(0.05, 1 - 0.9 * t * t));
    const h = 0.12 * d + 0.5 * abstand3(O, U);
    const lip = Math.min(opt.lippenband * 1.5, 0.3 * d);
    const reihen: V3[] = [
      plus3(plus3(O, mal3(e1, lip)), mal3(e2, 0.3 * h)),
      plus3(plus3(M, mal3(e1, d * 0.5)), mal3(e2, h)),
      plus3(M, mal3(e1, d)),
      plus3(plus3(M, mal3(e1, d * 0.5)), mal3(e2, -h)),
      plus3(plus3(U, mal3(e1, lip)), mal3(e2, -0.3 * h)),
    ];
    for (let k = 1; k <= 5; k++) {
      zielZu[r[k]!] = reihen[k - 1]!;
      if (zielAuf) zielAuf[r[k]!] = taschenAuf[c]![k]!;
    }
  }
  void drehe;
  // Pole: knapp hinter dem Mundwinkel, Richtung Rachen
  pole.forEach((Q, s) => {
    const E = zielZu[ecken[s]!]!;
    const innen = normiert3(minus3([throatAuf[0], throatAuf[1], 0], E));
    zielZu[Q] = plus3(E, mal3(innen, tiefe0 * 0.2));
  });
  // geschlossener Zustand: Taschenpunkte, die aus der Haut ragen, zur Naht hin einziehen
  for (let c = 0; c < C; c++) {
    const r = tasche[c]!;
    const anker = zielZu[r[0]!]!;
    for (let k = 1; k <= 5; k++) {
      const p = zielZu[r[k]!]!;
      let s = 1;
      const innen = (x: V3) => imRing(feinRing(fVon(x[0])), x[1], x[2]) && x[0] > xMin;
      if (!innen(p)) {
        let lo = 0;
        let hi = 1;
        for (let it = 0; it < 20; it++) {
          const m = (lo + hi) / 2;
          if (innen(lerp3(anker, p, m))) lo = m;
          else hi = m;
        }
        s = lo * 0.8;
      }
      zielZu[r[k]!] = lerp3(anker, p, s);
    }
  }

  // --- offener Zustand: Haut mit den Kiefern bewegt, Naht exakt auf den Linien, Rest harmonisch nachgezogen ---
  if (zielAuf) {
    const posiert = posieren(zielZu, [
      { s: kieferJetzt.oben, w: gO },
      { s: kieferJetzt.unten, w: gU },
    ]);
    const fest: (V3 | null)[] = new Array(nP).fill(null);
    for (let c = 0; c < C; c++) {
      const r = tasche[c]!;
      fest[r[0]!] = minus3(offenO.spalten[c]!, posiert[r[0]!]!);
      fest[r[6]!] = minus3(offenU.spalten[c]!, posiert[r[6]!]!);
    }
    fest[ecken[1]] = minus3(eckeAuf, posiert[ecken[1]]!);
    fest[ecken[0]] = minus3(spiegelZ(eckeAuf), posiert[ecken[0]]!);
    // weit weg vom Maul bleibt alles, wie die Knochen es stellen
    for (let i = K + 4; i <= N; i++) for (let j = 0; j < R; j++) fest[ringPunkt(i, j)] = [0, 0, 0];
    fest[pol] = [0, 0, 0];
    const netzTopo: Netz = { punkte: zielZu, flaechen, schaerfe };
    const nb = nachbarn(netzTopo);
    const korrektur = harmonisch(nb, fest, 300);
    for (let p = 0; p < nP; p++) zielAuf[p] = plus3(posiert[p]!, korrektur[p]!);

    // Seitensilhouette des offenen Zustands: Punkte der Mittellinie (z = 0) auf Florians offenen Umriss legen,
    // den Rest harmonisch mitnehmen. Umrissstellen an den Lippen gehören zur Naht, nicht zur Haut.
    if (eingabe.dokAuf) {
      const umriss = pfadAbtasten(vollerPfad(eingabe.dokAuf.profile.seite), 24);
      const lippen2d: V2[] = [...(aufOben ?? []), ...(aufUnten ?? [])].map((p) => ({ x: p[0], y: p[1] }));
      const naechster = (x: number, y: number): V2 => {
        let best = Infinity;
        let bp: V2 = { x, y };
        for (let i = 0; i < umriss.length; i++) {
          const a = umriss[i]!;
          const b = umriss[(i + 1) % umriss.length]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const l2 = dx * dx + dy * dy;
          const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
          const q = { x: a.x + dx * t, y: a.y + dy * t };
          const d = Math.hypot(q.x - x, q.y - y);
          if (d < best) {
            best = d;
            bp = q;
          }
        }
        return bp;
      };
      const mittellinie: number[] = [pol];
      for (let i = 1; i <= N; i++) mittellinie.push(ringPunkt(i, 0), ringPunkt(i, R / 2));
      for (let b = 1; b < n4; b++) if (b !== mb) mittellinie.push(gitter[b]![mb]!);
      const naheLippe = maulLaenge * 0.12;
      for (let durchgang = 0; durchgang < 2; durchgang++) {
        const fest2: (V3 | null)[] = new Array(nP).fill(null);
        for (let c = 0; c < C; c++) {
          fest2[tasche[c]![0]!] = [0, 0, 0];
          fest2[tasche[c]![6]!] = [0, 0, 0];
        }
        fest2[ecken[0]] = [0, 0, 0];
        fest2[ecken[1]] = [0, 0, 0];
        for (const p of mittellinie) {
          const z = zielAuf[p]!;
          const q = naechster(z[0], z[1]);
          if (lippen2d.some((l) => Math.hypot(l.x - q.x, l.y - q.y) < naheLippe)) continue;
          fest2[p] = [q.x - z[0], q.y - z[1], 0];
        }
        const k2 = harmonisch(nb, fest2, 300);
        for (let p = 0; p < nP; p++) zielAuf[p] = plus3(zielAuf[p]!, k2[p]!);
      }
    }
    for (let c = 0; c < C; c++) {
      const r = tasche[c]!;
      for (let k = 1; k <= 5; k++) zielAuf[r[k]!] = taschenAuf[c]![k]!;
    }
    pole.forEach((Q, s) => {
      const E = zielAuf[ecken[s]!]!;
      const innen = normiert3(minus3([throatAuf[0], throatAuf[1], 0], E));
      zielAuf[Q] = plus3(E, mal3(innen, tiefe0 * 0.2));
    });
  }

  return {
    netz: { punkte: zielZu.map((p) => [...p] as V3), flaechen, schaerfe },
    zielZu,
    zielAuf,
    bereiche,
    gewichtOben: gO,
    gewichtUnten: gU,
    nahtOben: spalten,
    nahtUnten,
    ecken,
    tasche,
    sichtbar,
    nahtAnteile: anteile,
    stationen,
    kiefer,
    hinweise,
  };
}

/** Ohne offenen Zustand: Unterkiefer 35° um ein Gelenk knapp hinter dem Mundwinkel, Oberkiefer bleibt. */
function standardKiefer(v: V3[], _R: number): { oben: Starr; unten: Starr } {
  const ecke = v[v.length - 1]!;
  const gelenk: V3 = [ecke[0] + 0.02, ecke[1], 0];
  const w = (35 * Math.PI) / 180;
  const c = Math.cos(w);
  const s = Math.sin(w);
  // Drehung um z (Kinn nach unten): vorn ist −x
  const R: Starr['R'] = [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
  const t = minus3(gelenk, drehe(R, gelenk));
  return { oben: { R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [0, 0, 0] }, unten: { R, t } };
}

/** Wie `anZielAnpassen`, aber mit Dämpfung je Punkt (Tasche weicher, damit sie nicht überschwingt). */
export function anZielAnpassenGewichtet(netz: Netz, ziel: readonly V3[], daempfung: readonly number[], iterationen = 10, stufen = 3): Netz {
  let punkte = netz.punkte.map((p) => [...p] as V3);
  for (let it = 0; it < iterationen; it++) {
    const grenze = unterteilenMehrfach({ ...netz, punkte }, stufen).punkte;
    punkte = punkte.map((p, i) => {
      const g = daempfung[i]!;
      return [p[0] + g * (ziel[i]![0] - grenze[i]![0]), p[1] + g * (ziel[i]![1] - grenze[i]![1]), p[2] + g * (ziel[i]![2] - grenze[i]![2])];
    });
  }
  return { ...netz, punkte };
}

export function daempfungAus(mk: MaulKaefig): number[] {
  return mk.bereiche.map((b) => (b === 'tasche' ? 0.35 : b === 'lippenband' ? 0.7 : 1));
}

/** Käfig für einen Zustand anpassen (Grenzfläche trifft die Ziele). */
export function maulAnpassen(mk: MaulKaefig, zustand: 'zu' | 'auf', iterationen = 10, stufen = 3): Netz {
  const ziel = zustand === 'zu' ? mk.zielZu : mk.zielAuf ?? mk.zielZu;
  return anZielAnpassenGewichtet({ ...mk.netz, punkte: ziel.map((p) => [...p] as V3) }, ziel, daempfungAus(mk), iterationen, stufen);
}
