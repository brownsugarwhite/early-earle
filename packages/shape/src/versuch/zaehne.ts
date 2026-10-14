// VERSUCH (12.10.2026): Zähne am Zahnfleisch (D4 im Plan Maul, Zähne, Rig).
//
// Florians Zahn-Tab: Anzahl je Kiefer, zuerst symmetrisch gesetzt; jeder Zahn einzeln wählbar und längs des
// Zahnfleischs verschiebbar; Zahnmenü mit Rundheit, Schärfe, Neigung (dazu Länge, Breite, Tiefe, Biegung, Spreizung,
// „außen“). Riesige Zähne, die geschlossen stören, macht er im offenen Zustand größer: Jeder Zahn hat optionale Werte
// für „auf“, die mit der Öffnung α stufenlos überblendet werden (Wert(α) = zu + (auf − zu)·α).
//
// Bauweise:
// - Zahnfleisch = Mitte zwischen Lippenrand (Taschenreihe 0 bzw. 6) und innerer Lippe (Reihe 1 bzw. 5) auf der
//   Grenzfläche des Käfigs im jeweiligen Zustand (zu, auf oder jede Zwischenstufe aus `maulZwischen`).
// - u (0 Mitte … 1 Mundwinkel) ist eine feste Stelle des Käfigs: an den Nahtspalten der Bogenanteil der entworfenen
//   Naht (`nahtAnteile`), dazwischen linear in der Unterteilung. Der Zahn rutscht deshalb beim Öffnen nicht.
// - Rahmen aus der Fläche: t = Tangente des Zahnfleischs (zum Mundwinkel), d = Beißrichtung (zum Zahnfleisch des
//   Gegenkiefers an derselben Stelle), i = nach innen (zum Rachen). Links ist der Rahmen das Spiegelbild von rechts.
//   So folgt der Zahn Knochen und Korrektur, ohne selbst verformt zu werden (starr bis auf die Werte für „auf“).
//   Versuch 12.10.: Die Hautrichtung über den Lippenrand (Lippenband → Rand) kippte offen um bis zu 180°, weil sich
//   die offene Haut am Lippenrand faltet; die Richtung zum Gegenkiefer ist in jedem Zustand eindeutig.
// - Zahn = gebogener Kegel: Querschnitt Superellipse (Rundheit), Spitze r(h) = r0·(1 − h)^(0,5 + 1,5·Schärfe),
//   Mittellinie ein Kreisbogen (Biegung), Wurzel 15 % der Länge im Zahnfleisch.
// - „außen“: Der Zahn setzt am Lippenrand an, um seine halbe Tiefe plus 1,5 px nach außen versetzt, und hängt über
//   der Gegenlippe (Hauer, Rex-Fänge). Seine Wurzel taucht schräg in die eigene Lippe.
// - Prüfung (`zahnPruefen`): kein Zahn im Gegenkiefer (Punkt-in-Fläche per Strahlparität, Mehrheit aus drei Achsen;
//   Gegenkiefer = nächste Fläche gehört dem anderen Kiefer), außen-Zähne mit ≥ 1 px Luft, Zähne nicht ineinander;
//   hinter dem sichtbaren Mundwinkel (Reißverschluss) nur: nicht aus dem Kopf stechen.
//   Vorschläge werden nur gemeldet, nie still angewandt: neigen, kürzen, außen, offen größer, schmaler, nach vorn.

import { type Netz, type V3, unterteilen } from './catmullClark';
import { type Dreiecksflaeche, dreiecksFlaeche, inAnsicht, rasterAlle, tiefeIn, treffer } from './flaechenlinie';
import { nachbarn } from './kiefer';
import type { MaulKaefig } from './maul';
import { bereichUnterteilen, ketteUnterteilen } from './pruefen';
import { kreuz3, laenge3, lerp3, mal3, minus3, normiert3, plus3, punkt3 } from './v3';
import { type Kiefer, type Zahn, type ZahnAuf, type ZahnRahmen, zahnBei, zahnGitter, zahnModell } from '../kern/zahnModell';

/** Kachel in Bildpunkten in der Grundansicht */
const PX = 461;

// Zahnmodell (Typen, Reihe, Überblenden, Ringgitter, Netz): seit 15.10. nachts im Kern (`kern/zahnModell.ts`), hier nur
// noch weitergereicht; dieser Versuch liefert das Zahnfleisch des alten Maul-Käfigs und die Prüfung.
export {
  AUSSEN_LUFT,
  WURZEL_ANTEIL,
  ZAHN_STANDARD,
  type Kiefer,
  type Zahn,
  type ZahnAuf,
  type ZahnForm,
  type ZahnGitter,
  type ZahnNetz,
  type ZahnRahmen,
  rundheitExponent,
  zahnBei,
  zahnGitter,
  zahnNetz,
  zahnNetze,
  zahnreihe,
} from '../kern/zahnModell';

const zahl = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const px = (x: number) => (x * PX).toFixed(1);
/** weicher Übergang 0 → 1 auf [0, 1] */
const glatt = (x: number) => {
  const t = zahl(x, 0, 1);
  return t * t * (3 - 2 * t);
};
/** Unter diesem Abstand der beiden Zahnfleischlinien (0,5 px) zählt am Mundwinkel die Streifennormale. */
const NAH_AM_WINKEL = 0.5 / PX;

// ---------- Zahnfleisch ----------

/**
 * Käfigketten je Kiefer, von links nach rechts (über beide Mundwinkel):
 * - rand: Mundwinkel, Lippenrand je Nahtspalte (Taschenreihe 0 bzw. 6), Mundwinkel
 * - innen: Taschenpol, innere Lippe (Reihe 1 bzw. 5), Taschenpol
 * - haut: je Randpunkt sein Nachbar auf der Haut desselben Kiefers (Lippenband); nur für außen-Zähne
 * Alle laufen parallel (gleich viele Käfigkanten), auf jeder Unterteilungsstufe gehört Index j zusammen; die Ketten
 * von Ober- und Unterkiefer ebenso (gleiche Nahtspalte).
 */
export type ZahnfleischKette = { rand: number[]; innen: number[]; haut: number[] };
export type ZahnfleischKetten = Record<Kiefer, ZahnfleischKette>;

export function zahnfleischKetten(mk: MaulKaefig): ZahnfleischKetten {
  const nb = nachbarn(mk.netz);
  const pol = (e: number): number => {
    const q = nb[e]!.find((j) => mk.bereiche[j] === 'tasche');
    if (q === undefined) throw new Error('Zähne: kein Taschenpol am Mundwinkel');
    return q;
  };
  const q0 = pol(mk.ecken[0]);
  const q1 = pol(mk.ecken[1]);
  const kette = (kiefer: Kiefer): ZahnfleischKette => {
    const r0 = kiefer === 'oben' ? 0 : 6;
    const r1 = kiefer === 'oben' ? 1 : 5;
    const eigen = kiefer === 'oben' ? mk.gewichtOben : mk.gewichtUnten;
    const fremd = kiefer === 'oben' ? mk.gewichtUnten : mk.gewichtOben;
    const rand = [mk.ecken[0], ...mk.tasche.map((r) => r[r0]!), mk.ecken[1]];
    // Hautnachbar: kein Naht- und kein Taschenpunkt, am stärksten am eigenen Kiefer
    const haut = rand.map((v) => {
      let best = -1;
      let wert = -Infinity;
      for (const j of nb[v]!) {
        const b = mk.bereiche[j];
        if (b === 'naht' || b === 'tasche') continue;
        const w = eigen[j]! - fremd[j]!;
        if (w > wert) {
          wert = w;
          best = j;
        }
      }
      if (best < 0) throw new Error(`Zähne: Randpunkt ${v} ohne Hautnachbar`);
      return best;
    });
    return { rand, innen: [q0, ...mk.tasche.map((r) => r[r1]!), q1], haut };
  };
  return { oben: kette('oben'), unten: kette('unten') };
}

function kettenWeiter(netz: Netz, k: ZahnfleischKetten): ZahnfleischKetten {
  const w = (c: ZahnfleischKette): ZahnfleischKette => ({ rand: ketteUnterteilen(netz, c.rand), innen: ketteUnterteilen(netz, c.innen), haut: ketteUnterteilen(netz, c.haut) });
  return { oben: w(k.oben), unten: w(k.unten) };
}

/**
 * Ketten auf Stufe `stufen` verfolgen. Das Ergebnis hängt nur von der Topologie ab: Die Indizes gelten für jede Lage
 * desselben Käfigs (zu, auf, Zwischenstufen), solange gleich oft unterteilt wird.
 */
export function grenzKetten(netz: Netz, ketten: ZahnfleischKetten, stufen = 3): { netz: Netz; ketten: ZahnfleischKetten } {
  let n = netz;
  let k = ketten;
  for (let s = 0; s < stufen; s++) {
    k = kettenWeiter(n, k);
    n = unterteilen(n);
  }
  return { netz: n, ketten: k };
}

export type Zahnfleisch = ((u: number, seite: -1 | 0 | 1, aussen?: boolean) => ZahnRahmen) & {
  kiefer: Kiefer;
  /** Zahnfleischlinie von links nach rechts (Punkte der Unterteilung) */
  linie: V3[];
  /** Nächste Stelle des Zahnfleischs zu einem Punkt (Ziehen eines Zahns); mit `seite` nur auf dieser Hälfte. */
  uVon: (p: V3, seite?: -1 | 1) => { u: number; seite: -1 | 1; abstand: number };
};

/**
 * Zahnfleisch eines Kiefers auf der unterteilten Fläche `grenze` (Ketten von `grenzKetten` auf derselben Stufe).
 * Die Fläche kann jede Lage des Käfigs sein: zu, auf oder eine Zwischenstufe aus `maulZwischen`.
 */
export function zahnfleisch(mk: MaulKaefig, grenze: Netz, ketten: ZahnfleischKetten, kiefer: Kiefer): Zahnfleisch {
  const P = grenze.punkte;
  const linie = (k: ZahnfleischKette) => k.rand.map((r, j) => lerp3(P[r]!, P[k.innen[j]!]!, 0.5));
  const k = ketten[kiefer];
  const kg = ketten[kiefer === 'oben' ? 'unten' : 'oben'];
  const R = k.rand.map((i) => P[i]!);
  const I = k.innen.map((i) => P[i]!);
  const G = linie(k);
  const gegen = linie(kg);
  const gegenHaut = kg.haut.map((i) => P[i]!);
  const n = G.length;
  if (gegen.length !== n || gegenHaut.length !== n) throw new Error('Zähne: Zahnfleisch oben und unten ungleich lang');
  const vz = kiefer === 'oben' ? 1 : -1;
  const T = G.map((_, j) => minus3(G[Math.min(n - 1, j + 1)]!, G[Math.max(0, j - 1)]!));
  const a = mk.nahtAnteile;
  const K = a.length - 2;
  const fak = (n - 1) / (2 * (K + 1)); // Punkte je Käfigkante (2^Stufen)
  const mitte = (n - 1) / 2;
  if (!Number.isInteger(fak) || fak < 1) throw new Error('Zähne: Kette passt nicht zu den Nahtspalten');

  const jVon = (u: number, s: -1 | 1): number => {
    const v = zahl(u, 0, 1);
    let kk = 0;
    while (kk < K && a[kk + 1]! < v) kk++;
    const f = (v - a[kk]!) / Math.max(1e-12, a[kk + 1]! - a[kk]!);
    return mitte + s * (kk + f) * fak;
  };
  const uAus = (j: number): number => {
    const kappa = Math.abs(j - mitte) / fak;
    const kk = Math.min(K, Math.floor(kappa));
    const f = zahl(kappa - kk, 0, 1);
    return zahl(a[kk]! + f * (a[kk + 1]! - a[kk]!), 0, 1);
  };
  const bei = (L: readonly V3[], j: number): V3 => {
    const j0 = Math.min(n - 2, Math.max(0, Math.floor(j)));
    return lerp3(L[j0]!, L[j0 + 1]!, zahl(j - j0, 0, 1));
  };

  const rahmen = (u: number, seite: -1 | 0 | 1, aussen = false): ZahnRahmen => {
    const s: -1 | 1 = seite < 0 ? -1 : 1;
    const j = jVon(seite === 0 ? 0 : u, s);
    const rand = bei(R, j);
    const p = aussen ? rand : bei(G, j);
    const t = normiert3(mal3(bei(T, j), s));
    const senkrecht = (v: V3) => minus3(v, mal3(t, punkt3(t, v)));
    // Beißrichtung: zum Zahnfleisch des Gegenkiefers an derselben Stelle (außen: zu dessen Lippenband, also längs
    // seiner Haut), senkrecht zur Tangente. Am Mundwinkel treffen sich die Linien; dort zählt die Normale des
    // Streifens Rand → innere Lippe (zur Tasche hin).
    const zumGegen = senkrecht(minus3(bei(aussen ? gegenHaut : gegen, j), p));
    const streifen = mal3(kreuz3(t, normiert3(senkrecht(minus3(bei(I, j), rand)))), -vz * s);
    const lg = laenge3(zumGegen);
    const w = glatt(lg / NAH_AM_WINKEL);
    const d = normiert3(plus3(mal3(zumGegen, w / Math.max(lg, 1e-300)), mal3(streifen, 1 - w)));
    // nach innen: oben rechts t × d, unten und links gespiegelt (Rahmen links = Spiegelbild von rechts)
    const i = mal3(kreuz3(t, d), vz * s);
    return { p, t, d, i, rand };
  };

  const uVon = (q: V3, seite?: -1 | 1): { u: number; seite: -1 | 1; abstand: number } => {
    let best = Infinity;
    let bestJ = mitte;
    const von = seite === 1 ? Math.floor(mitte) : 0;
    const bis = seite === -1 ? Math.ceil(mitte) : n - 1;
    for (let j = von; j < bis; j++) {
      const ab = minus3(G[j + 1]!, G[j]!);
      const l2 = punkt3(ab, ab);
      const f = l2 > 1e-24 ? zahl(punkt3(minus3(q, G[j]!), ab) / l2, 0, 1) : 0;
      const dd = laenge3(minus3(q, lerp3(G[j]!, G[j + 1]!, f)));
      if (dd < best) {
        best = dd;
        bestJ = j + f;
      }
    }
    return { u: uAus(bestJ), seite: seite ?? (bestJ < mitte ? -1 : 1), abstand: best };
  };

  return Object.assign(rahmen, { kiefer, linie: G, uVon });
}

/** Bequem: Zahnfleisch beider Kiefer für eine Lage des Käfigs (unterteilt selbst). */
export function zahnfleischAusKaefig(mk: MaulKaefig, netz: Netz, stufen = 3): { grenze: Netz; ketten: ZahnfleischKetten } & Record<Kiefer, Zahnfleisch> {
  const g = grenzKetten(netz, zahnfleischKetten(mk), stufen);
  return { grenze: g.netz, ketten: g.ketten, oben: zahnfleisch(mk, g.netz, g.ketten, 'oben'), unten: zahnfleisch(mk, g.netz, g.ketten, 'unten') };
}

// ---------- Prüfung ----------

export type ZahnAenderung = Partial<Omit<Zahn, 'kiefer' | 'seite'>>;
export type ZahnVorschlag = { text: string; aenderung: ZahnAenderung };

/**
 * - durchKiefer: Zahn steckt im Gegenkiefer (sichtbarer Teil des Mauls)
 * - durchHaut: Zahn hinter dem sichtbaren Mundwinkel (Reißverschluss, geschlossen verdeckt) sticht aus dem Kopf
 * - zuNah: außen-Zahn hat weniger als `luft` Abstand zum Gegenkiefer
 * - zahnZahn: zwei Zähne überlappen
 */
export type ZahnArt = 'durchKiefer' | 'durchHaut' | 'zuNah' | 'zahnZahn' | 'ok';

export type ZahnBefund = {
  zahn: number;
  art: ZahnArt;
  /** Eindringtiefe (durchKiefer, durchHaut: Abstand zur Fläche; zahnZahn: Überlappung) bzw. fehlende Luft (zuNah), Kachel */
  tiefe: number;
  /** anderer Zahn bei zahnZahn */
  mit?: number;
  /** bester Vorschlag als Text */
  vorschlag?: string;
  vorschlaege?: ZahnVorschlag[];
};

export type PruefOptionen = {
  /** Öffnung für die Werte „auf“ und den Reißverschluss (der Käfig muss dazu passen) */
  alpha: number;
  stufen: number;
  /** Mindestluft der außen-Zähne zum Gegenkiefer (Kachel) */
  luft: number;
  /** kleinere Eindringtiefen zählen nicht (Kachel) */
  toleranz: number;
  seiten: number;
  ringe: number;
};

export const PRUEF_STANDARD: PruefOptionen = { alpha: 0, stufen: 3, luft: 1 / PX, toleranz: 0.25 / PX, seiten: 8, ringe: 6 };

/** Bis hier (u) ist das Maul bei Öffnung α offen bzw. geschlossen sichtbar; dahinter liegt der Reißverschluss. */
export function offenBis(mk: MaulKaefig, alpha: number): number {
  return mk.sichtbar + (1 - mk.sichtbar) * zahl(alpha, 0, 1);
}

/** Nächster Punkt eines Dreiecks (Ericson, Real-Time Collision Detection 5.1.5). */
function naechsterAufDreieck(p: V3, a: V3, b: V3, c: V3): V3 {
  const ab = minus3(b, a);
  const ac = minus3(c, a);
  const ap = minus3(p, a);
  const d1 = punkt3(ab, ap);
  const d2 = punkt3(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = minus3(p, b);
  const d3 = punkt3(ab, bp);
  const d4 = punkt3(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return plus3(a, mal3(ab, d1 / (d1 - d3)));
  const cp = minus3(p, c);
  const d5 = punkt3(ab, cp);
  const d6 = punkt3(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return plus3(a, mal3(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return plus3(b, mal3(minus3(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  const den = 1 / (va + vb + vc);
  return plus3(a, plus3(mal3(ab, vb * den), mal3(ac, vc * den)));
}

/** Nächstes Dreieck (nur solche mit `nur(d)`); weiter als `bis` entfernt zählt nicht (Abstand dann ≥ bis, ggf. ∞). */
type Naehe = (p: V3, nur?: (d: number) => boolean, bis?: number) => { abstand: number; dreieck: number };

/** Nächstes Dreieck über ein gleichmäßiges 3D-Raster, nur für Dreiecke im Bereich [lo, hi]. */
function naeheRaster(fl: Dreiecksflaeche, lo: V3, hi: V3, zellen = 32): Naehe {
  const P = fl.punkte;
  const D = fl.dreiecke;
  const nD = D.length / 3;
  const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], 1e-6);
  const h = ext / zellen;
  const nn = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k]! - lo[k]!) / h))) as [number, number, number];
  const zelle = (x: number, y: number, z: number) => x + nn[0] * (y + nn[1] * z);
  const zIndex = (x: number, k: number) => zahl(Math.floor((x - lo[k]!) / h), 0, nn[k]! - 1);
  const listen = new Map<number, number[]>();
  const ecke = (d: number, k: number): V3 => {
    const i = 3 * D[3 * d + k]!;
    return [P[i]!, P[i + 1]!, P[i + 2]!];
  };
  for (let d = 0; d < nD; d++) {
    const e = [ecke(d, 0), ecke(d, 1), ecke(d, 2)];
    const mn = [0, 1, 2].map((k) => Math.min(e[0]![k]!, e[1]![k]!, e[2]![k]!));
    const mx = [0, 1, 2].map((k) => Math.max(e[0]![k]!, e[1]![k]!, e[2]![k]!));
    if ([0, 1, 2].some((k) => mx[k]! < lo[k]! || mn[k]! > hi[k]!)) continue;
    for (let z = zIndex(mn[2]!, 2); z <= zIndex(mx[2]!, 2); z++) {
      for (let y = zIndex(mn[1]!, 1); y <= zIndex(mx[1]!, 1); y++) {
        for (let x = zIndex(mn[0]!, 0); x <= zIndex(mx[0]!, 0); x++) {
          const key = zelle(x, y, z);
          const l = listen.get(key);
          if (l) l.push(d);
          else listen.set(key, [d]);
        }
      }
    }
  }
  const stempel = new Uint32Array(nD);
  let runde = 0;
  return (p, nur, bis = Infinity) => {
    runde++;
    const c = [zIndex(p[0], 0), zIndex(p[1], 1), zIndex(p[2], 2)];
    let best = Infinity;
    let bestD = -1;
    const maxR = Math.max(...nn);
    for (let r = 0; r <= maxR; r++) {
      for (let z = c[2]! - r; z <= c[2]! + r; z++) {
        if (z < 0 || z >= nn[2]) continue;
        for (let y = c[1]! - r; y <= c[1]! + r; y++) {
          if (y < 0 || y >= nn[1]) continue;
          // im Inneren der Schale nur die beiden Randzellen in x
          const schale = r === 0 || Math.abs(z - c[2]!) === r || Math.abs(y - c[1]!) === r;
          for (let x = c[0]! - r; x <= c[0]! + r; x += schale ? 1 : 2 * r) {
            if (x < 0 || x >= nn[0]) continue;
            for (const d of listen.get(zelle(x, y, z)) ?? []) {
              if (stempel[d] === runde) continue;
              stempel[d] = runde;
              if (nur && !nur(d)) continue;
              const ab = laenge3(minus3(p, naechsterAufDreieck(p, ecke(d, 0), ecke(d, 1), ecke(d, 2))));
              if (ab < best) {
                best = ab;
                bestD = d;
              }
            }
          }
        }
      }
      // alle Zellen weiter außen liegen mindestens r·h entfernt
      if (best <= r * h || r * h > bis) break;
    }
    return { abstand: best, dreieck: bestD };
  };
}

/** Punkt-in-Fläche: Strahlparität in drei Achsen, Mehrheit (robust gegen Strahlen durch Kanten). */
function innenTest(fl: Dreiecksflaeche): (p: V3) => boolean {
  const raster = rasterAlle(fl, 96);
  const ansichten = ['seite', 'front', 'top'] as const;
  return (p) => {
    let ja = 0;
    for (let a = 0; a < 3; a++) {
      const ans = ansichten[a]!;
      const t = tiefeIn(p, ans);
      let n = 0;
      for (const h of treffer(raster[ans], inAnsicht(p, ans))) if (h.tiefe < t) n++;
      if (n % 2 === 1) ja++;
      if (ja >= 2 || ja + (2 - a) < 2) break;
    }
    return ja >= 2;
  };
}

type Probe = { m: V3; x: V3; z: V3; a: number; c: number; p: number };

/** Radius der Superellipse in Richtung w (nur der Anteil in der Querschnittsebene zählt). */
function radiusIn(q: Probe, w: V3): number {
  const wx = punkt3(w, q.x);
  const wz = punkt3(w, q.z);
  const n = Math.hypot(wx, wz);
  if (n < 1e-12) return Math.min(q.a, q.c);
  const s = Math.pow(Math.abs(wx / n / q.a), q.p) + Math.pow(Math.abs(wz / n / q.c), q.p);
  return Math.pow(s, -1 / q.p);
}

/** Feld so setzen, dass der wirksame Wert bei α `wert` ist (zu + (auf − zu)·α = wert). */
function setze(z: Zahn, feld: keyof ZahnAuf, wert: number, alpha: number): { zahn: Zahn; aenderung: ZahnAenderung } {
  const auf = z.auf?.[feld];
  if (auf !== undefined && alpha >= 1) {
    const neu: ZahnAuf = { ...z.auf, [feld]: wert };
    return { zahn: { ...z, auf: neu }, aenderung: { auf: neu } };
  }
  const zu = auf === undefined ? wert : (wert - auf * alpha) / (1 - alpha);
  const aenderung = { [feld]: zu } as ZahnAenderung;
  return { zahn: { ...z, ...aenderung }, aenderung };
}

/**
 * Prüft die Zähne in einer Lage des Käfigs (meist geschlossen: `netz` = maulAnpassen(mk, 'zu'), α = 0).
 * Geprüft werden die Punkte ab Höhe des Zahnfleischs (Ring 1 bis Spitze); die Wurzel steckt absichtlich im Kiefer.
 * - Im sichtbaren Maul (u ≤ `offenBis`): durchKiefer, wenn ein Punkt im Körper liegt (Haut + Tasche) und die nächste
 *   Fläche zum Gegenkiefer gehört (Bereich aus den Kiefergewichten); zuNah für außen-Zähne mit < `luft`.
 * - Hinter dem sichtbaren Mundwinkel (Reißverschluss) ist der Zahn verdeckt und darf nur nicht aus dem Kopf stechen
 *   (durchHaut, Strahlparität gegen die Haut allein). Die geschlossene Tasche ist dort beim Tiger entartet: ihre
 *   Öffnungsrichtung (oben) läuft fast längs der steil steigenden Naht.
 * - zahnZahn: Querschnitte entlang der Mittellinien überlappen.
 * Jeder Zahn bekommt mindestens einen Eintrag (sonst „ok“). Vorschläge ändern nichts, sie werden nur gemeldet.
 */
export function zahnPruefen(mk: MaulKaefig, netz: Netz, zaehne: readonly Zahn[], opt: Partial<PruefOptionen> = {}): ZahnBefund[] {
  const o: PruefOptionen = { ...PRUEF_STANDARD, ...opt };
  const { alpha, seiten, ringe, toleranz, luft } = o;
  if (!zaehne.length) return [];

  // Fläche mit Kiefer und Tasche je Fläche (aus dem Käfig weitergereicht), Zahnfleisch auf derselben Stufe
  let n = netz;
  let k = zahnfleischKetten(mk);
  let kiefer: string[] = netz.flaechen.map((f) => {
    let wo = 0;
    let wu = 0;
    for (const i of f) {
      wo += mk.gewichtOben[i]!;
      wu += mk.gewichtUnten[i]!;
    }
    return wo > wu + 0.05 * f.length ? 'oben' : wu > wo + 0.05 * f.length ? 'unten' : 'mitte';
  });
  let tasche: string[] = netz.flaechen.map((f) => (f.some((i) => mk.bereiche[i] === 'tasche') ? 'tasche' : 'haut'));
  for (let s = 0; s < o.stufen; s++) {
    k = kettenWeiter(n, k);
    kiefer = bereichUnterteilen(n, kiefer);
    tasche = bereichUnterteilen(n, tasche);
    n = unterteilen(n);
  }
  const fleisch: Record<Kiefer, Zahnfleisch> = { oben: zahnfleisch(mk, n, k, 'oben'), unten: zahnfleisch(mk, n, k, 'unten') };
  const fl = dreiecksFlaeche(n);
  const dKiefer: string[] = [];
  const dHaut: boolean[] = [];
  n.flaechen.forEach((f, fi) => {
    for (let t = 1; t < f.length - 1; t++) {
      dKiefer.push(kiefer[fi]!);
      dHaut.push(tasche[fi] === 'haut');
    }
  });
  const imKoerper = innenTest(fl);
  const flHaut = dreiecksFlaeche({ punkte: n.punkte, flaechen: n.flaechen.filter((_, fi) => tasche[fi] === 'haut'), schaerfe: new Map() });
  const imKopf = innenTest(flHaut);
  const sigma = offenBis(mk, alpha);

  // Nähe-Raster um alle Zähne, mit Rand für die Vorschläge
  let lo: V3 = [Infinity, Infinity, Infinity];
  let hi: V3 = [-Infinity, -Infinity, -Infinity];
  let groesste = 0;
  for (const z of zaehne) {
    const g = zahnGitter(z, fleisch[z.kiefer], alpha, seiten, ringe);
    for (const p of [...g.ringe.flat(), g.spitze]) {
      lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1]), Math.min(lo[2], p[2])];
      hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1]), Math.max(hi[2], p[2])];
    }
    groesste = Math.max(groesste, z.laenge, z.auf?.laenge ?? 0, z.breite, z.tiefe);
  }
  const rand = groesste + 4 / PX;
  const naehe = naeheRaster(fl, minus3(lo, [rand, rand, rand]), plus3(hi, [rand, rand, rand]));

  type Messung = { durch: number; haut: number; nah: number };
  /** Messung eines Zahns; `frueh`: abbrechen, sobald etwas stört (für die Suche nach Vorschlägen). */
  const messen = (z: Zahn, frueh: boolean): Messung => {
    const g = zahnGitter(z, fleisch[z.kiefer], alpha, seiten, ringe);
    const f = zahnBei(z, alpha);
    const gegen = z.kiefer === 'oben' ? 'unten' : 'oben';
    const verdeckt = f.u > sigma;
    const m: Messung = { durch: 0, haut: 0, nah: 0 };
    // von der Spitze zum Zahnfleisch (Ring 1)
    const pts: V3[] = [g.spitze];
    for (let r = g.ringe.length - 1; r >= 1; r--) pts.push(...g.ringe[r]!);
    for (const p of pts) {
      if (verdeckt) {
        if (!imKopf(p)) m.haut = Math.max(m.haut, naehe(p, (d) => dHaut[d]!).abstand);
      } else if (imKoerper(p)) {
        const q = naehe(p);
        if (dKiefer[q.dreieck] === gegen) m.durch = Math.max(m.durch, q.abstand);
      } else if (f.aussen) {
        m.nah = Math.max(m.nah, luft - naehe(p, (d) => dKiefer[d] === gegen, luft).abstand);
      }
      if (frueh && Math.max(m.durch, m.haut, m.nah) > toleranz) break;
    }
    return m;
  };
  const stoert = (z: Zahn) => Math.max(...Object.values(messen(z, true))) > toleranz;

  // Zahn gegen Zahn: Querschnitte entlang der Mittellinien
  const probenVon = (z: Zahn): Probe[] => {
    const m = zahnModell(z, fleisch[z.kiefer], alpha);
    const out: Probe[] = [];
    for (let s = 0; s < 10; s++) out.push({ ...m.quer((m.laenge * s) / 10), p: m.p });
    return out;
  };
  const proben = zaehne.map(probenVon);
  const ueberlapp = (A: readonly Probe[], B: readonly Probe[]): number => {
    let tief = 0;
    for (const a of A) {
      for (const b of B) {
        const w = minus3(b.m, a.m);
        const d = laenge3(w);
        const e = d > 1e-12 ? mal3(w, 1 / d) : a.x;
        tief = Math.max(tief, radiusIn(a, e) + radiusIn(b, e) - d);
      }
    }
    return tief;
  };
  const zahnZahn = new Map<number, [number, number][]>();
  for (let a = 0; a < zaehne.length; a++) {
    for (let b = a + 1; b < zaehne.length; b++) {
      const t = ueberlapp(proben[a]!, proben[b]!);
      if (t <= toleranz) continue;
      zahnZahn.set(a, [...(zahnZahn.get(a) ?? []), [b, t]]);
      zahnZahn.set(b, [...(zahnZahn.get(b) ?? []), [a, t]]);
    }
  }

  // Vorschläge (gesucht, nie angewandt)
  const kuerzen = (z: Zahn): number | null => {
    const L = zahnBei(z, alpha).laenge;
    const mit = (f: number) => setze(z, 'laenge', L * f, alpha).zahn;
    if (stoert(mit(0.05))) return null;
    let a = 0.05;
    let b = 1;
    for (let it = 0; it < 14; it++) {
      const m = (a + b) / 2;
      if (stoert(mit(m))) b = m;
      else a = m;
    }
    return L * a;
  };
  const neigen = (z: Zahn, nurNachAussen: boolean): number | null => {
    const nu = zahnBei(z, alpha).neigung;
    for (let s = 1; s <= 8; s++) {
      for (const v of nurNachAussen ? [-1] : [1, -1]) {
        const w = nu + v * 2.5 * s;
        if (!stoert(setze(z, 'neigung', w, alpha).zahn)) return w;
      }
    }
    return null;
  };
  const vorschlaegeFuer = (z: Zahn, art: 'durchKiefer' | 'durchHaut' | 'zuNah'): ZahnVorschlag[] => {
    const jetzt = zahnBei(z, alpha);
    const w = neigen(z, art === 'zuNah');
    const L = kuerzen(z);
    const neig = w === null ? null : { text: `Neigung ${w.toFixed(1)}° statt ${jetzt.neigung.toFixed(1)}°`, aenderung: setze(z, 'neigung', w, alpha).aenderung };
    const kurz = L === null ? null : { text: `kürzen auf ${px(L)} px (statt ${px(jetzt.laenge)} px)`, aenderung: setze(z, 'laenge', L, alpha).aenderung };
    const vorn: ZahnVorschlag[] = [];
    const hinten: ZahnVorschlag[] = [];
    // kleine Änderungen zuerst: wenig Neigung, wenig kürzer; große am Ende
    if (neig) (Math.abs(w! - jetzt.neigung) <= 10 ? vorn : hinten).push(neig);
    if (kurz) (L! >= 0.6 * jetzt.laenge ? vorn : hinten).push(kurz);
    if (art === 'durchKiefer' && !jetzt.aussen && !stoert({ ...z, aussen: true })) vorn.push({ text: 'außen über die Gegenlippe stellen', aenderung: { aussen: true } });
    if (art === 'durchHaut') {
      // hinter dem Mundwinkel: außen-Zahn stünde an der Backe; nach innen nehmen oder ins sichtbare Maul schieben
      if (jetzt.aussen && !stoert({ ...z, aussen: false })) vorn.push({ text: 'nach innen nehmen (nicht außen)', aenderung: { aussen: false } });
      const vor = setze(z, 'u', 0.98 * sigma, alpha);
      if (!stoert(vor.zahn)) vorn.push({ text: `nach vorn ins sichtbare Maul (u ${(0.98 * sigma).toFixed(2)} statt ${jetzt.u.toFixed(2)})`, aenderung: vor.aenderung });
    }
    if (art !== 'zuNah' && L !== null && alpha <= 0) {
      // Florians Weg für Riesenzähne: geschlossen klein, offen groß (wächst beim Öffnen hinein)
      const offen = Math.max(z.auf?.laenge ?? z.laenge, z.laenge);
      vorn.push({ text: `geschlossen ${px(L)} px, offen ${px(offen)} px (wächst beim Öffnen)`, aenderung: { laenge: L, auf: { ...z.auf, laenge: offen } } });
    }
    return [...vorn, ...hinten];
  };
  const schmaler = (z: Zahn, andere: Zahn, mitIndex: number): ZahnVorschlag[] => {
    const B = zahnBei(z, alpha).breite;
    const pb = probenVon(andere);
    const passt = (f: number) => ueberlapp(probenVon(setze(z, 'breite', B * f, alpha).zahn), pb) <= toleranz;
    if (!passt(0.2)) return [];
    let a = 0.2;
    let b = 1;
    for (let it = 0; it < 12; it++) {
      const m = (a + b) / 2;
      if (passt(m)) a = m;
      else b = m;
    }
    return [{ text: `schmaler: ${px(B * a)} px statt ${px(B)} px (oder weiter weg von Zahn ${mitIndex})`, aenderung: setze(z, 'breite', B * a, alpha).aenderung }];
  };

  const befunde: ZahnBefund[] = [];
  zaehne.forEach((z, zi) => {
    const m = messen(z, false);
    const eintraege: ZahnBefund[] = [];
    const mitVorschlag = (e: ZahnBefund, v: ZahnVorschlag[]): ZahnBefund => (v.length ? { ...e, vorschlag: v[0]!.text, vorschlaege: v } : e);
    if (m.durch > toleranz) eintraege.push(mitVorschlag({ zahn: zi, art: 'durchKiefer', tiefe: m.durch }, vorschlaegeFuer(z, 'durchKiefer')));
    if (m.haut > toleranz) eintraege.push(mitVorschlag({ zahn: zi, art: 'durchHaut', tiefe: m.haut }, vorschlaegeFuer(z, 'durchHaut')));
    if (m.nah > toleranz) eintraege.push(mitVorschlag({ zahn: zi, art: 'zuNah', tiefe: m.nah }, vorschlaegeFuer(z, 'zuNah')));
    for (const [j, t] of zahnZahn.get(zi) ?? []) eintraege.push(mitVorschlag({ zahn: zi, art: 'zahnZahn', tiefe: t, mit: j }, schmaler(z, zaehne[j]!, j)));
    befunde.push(...(eintraege.length ? eintraege : [{ zahn: zi, art: 'ok' as const, tiefe: 0 }]));
  });
  return befunde;
}
