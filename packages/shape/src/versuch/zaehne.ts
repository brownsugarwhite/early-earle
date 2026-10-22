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
import { nachbarn } from './kiefer';
import type { MaulKaefig } from './maul';
import { bereichUnterteilen, ketteUnterteilen } from './pruefen';
import { kreuz3, laenge3, lerp3, mal3, minus3, normiert3, plus3, punkt3 } from './v3';
import { type Kiefer, type Zahn, type ZahnRahmen } from '../kern/zahnModell';
import { PRUEF_STANDARD, type PruefOptionen, type ZahnBefund, zahnPruefenAuf } from '../kern/zahnPruefung';

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

// Die Prüfung selbst (Innen-Test, nächstes Dreieck, Vorschläge) liegt seit 15.10. nachts im Kern
// (`kern/zahnPruefung.ts`); hier nur die Fläche des alten Maul-Käfigs mit Kiefer und Tasche je Fläche.
export { PRUEF_STANDARD, type PruefOptionen, type ZahnAenderung, type ZahnArt, type ZahnBefund, type ZahnVorschlag } from '../kern/zahnPruefung';

/** Bis hier (u) ist das Maul bei Öffnung α offen bzw. geschlossen sichtbar; dahinter liegt der Reißverschluss. */
export function offenBis(mk: MaulKaefig, alpha: number): number {
  return mk.sichtbar + (1 - mk.sichtbar) * zahl(alpha, 0, 1);
}

/**
 * Prüft die Zähne in einer Lage des Käfigs (meist geschlossen: `netz` = maulAnpassen(mk, 'zu'), α = 0); Regeln in
 * `kern/zahnPruefung.ts`. Kiefer je Fläche aus den Kiefergewichten, Tasche = Fläche mit einem Taschenpunkt; hinter dem
 * sichtbaren Mundwinkel (Reißverschluss) ist die geschlossene Tasche beim Tiger entartet: ihre Öffnungsrichtung (oben)
 * läuft fast längs der steil steigenden Naht, deshalb zählt dort nur der Durchstich der Haut.
 */
export function zahnPruefen(mk: MaulKaefig, netz: Netz, zaehne: readonly Zahn[], opt: Partial<PruefOptionen> = {}): ZahnBefund[] {
  const o: PruefOptionen = { ...PRUEF_STANDARD, ...opt };
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
  return zahnPruefenAuf({ netz: n, kiefer: kiefer as (Kiefer | 'mitte')[], haut: tasche.map((t) => t === 'haut'), sichtbarBis: offenBis(mk, o.alpha) }, fleisch, zaehne, o);
}
