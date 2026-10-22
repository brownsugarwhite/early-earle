// Phase 2 / M4 (15.10. nachts): Zähne im Kern (Plan 5.3). Das Zahnmodell (`zahnModell.ts`, aus dem Versuch vom 12.10.)
// hängt hier am Zahnfleisch des Kern-Mauls:
// - Zahnfleisch = erste Taschenreihe (`tasche.oben[0]` bzw. `tasche.unten[0]`, rechts und links), auf der Grenzfläche
//   Kante für Kante verfolgt (`feinKette`) bis zur Winkelsäule; t = 0 liegt auf der Naht (beide Seiten teilen ihn).
// - u (0 Mitte … 1 Mundwinkel) ist der Bogenanteil dieser Linie in der Ruhelage: eine feste Stelle des Käfigs, der Zahn
//   gleitet beim Öffnen nicht und folgt Knochen, Fressen-Pose und Pinsel.
// - Rahmen wie im Versuch: t = Tangente zum Mundwinkel, d = Beißrichtung (zum Zahnfleisch des Gegenkiefers an derselben
//   Stelle; außen: längs der Haut des Gegenkiefers), i = nach innen (zum Rachen). Links ist alles das Spiegelbild von rechts.
// - Das Dokument speichert die rechte Hälfte je Kiefer (bei ungerader Zahl zuerst der Mittelzahn); ohne Zahnreihen im
//   Dokument gilt die Automatik (`zaehneStandard`), als Werte ausgegeben, damit der Editor sie beim ersten Ändern übernimmt.

import type { Zaehne, ZahnEintrag, Zahnreihe } from '../dokument';
import { alleFlaechen } from '../kaefig/halbkanten';
import type { MaulErgebnis } from './maul';
import { kaefigNachbarn } from './pinsel';
import { feinKette } from './reifen';
import { type Kiefer, type RahmenQuelle, type Zahn, type ZahnAuf, type ZahnRahmen, zahnBei, zahnNetze } from './zahnModell';
import { type PruefOptionen, type ZahnAenderung, type ZahnBefund, zaehneEinpassen, zahnPruefenAuf } from './zahnPruefung';

type V3 = [number, number, number];

const PX = 461;
/** Tiefe (quer zum Zahnfleisch) fehlt im Dokument: ¾ der Breite. */
export const ZAHN_TIEFE = 0.75;
/** Unter diesem Abstand der beiden Zahnfleischlinien (0,5 px) gilt am Mundwinkel die Beißrichtung weiter vorn. */
const NAH_AM_WINKEL = 0.5 / PX;
/** Auflösung der Zahnnetze im Kern (Seiten je Ring, sichtbare Ringe) */
export const ZAHN_SEITEN = 12;
export const ZAHN_RINGE = 8;

const zahl = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const glatt = (x: number) => {
  const t = zahl(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const minus3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const plus3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mal3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const punkt3 = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const laenge3 = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
function normiert3(a: V3): V3 {
  const l = laenge3(a);
  return l > 1e-300 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}

/** Zahnfleisch eines Kiefers im Kern: Rahmen je Stelle, die Linie in der Pose und die Suche nach der nächsten Stelle. */
export type KernZahnfleisch = RahmenQuelle & {
  kiefer: Kiefer;
  /** Zahnfleischlinie in der Pose von links über die Mitte nach rechts (3 Floats je Punkt) */
  linie: Float32Array;
  /** u je Linienpunkt (links und rechts positiv, 0 in der Mitte) */
  uLinie: Float32Array;
  /** Nächste Stelle des Zahnfleischs zu einem Punkt (Ziehen eines Zahns); mit `seite` nur auf dieser Hälfte. */
  uVon: (p: V3, seite?: -1 | 1) => { u: number; seite: -1 | 1; abstand: number };
};

type Seite = {
  /** feine Punktindizes von der Mitte zum Mundwinkel: Zahnfleisch, Lippenrand, Zahnfleisch des Gegenkiefers */
  fleisch: number[];
  rand: number[];
  gegen: number[];
  /** je Käfigspalte k (= Stützstelle j = k · 2^L): Haut des Gegenkiefers am Lippenrand (Richtung für außen-Zähne) und Tasche innen */
  gegenHautRichtung: V3[];
  innen: V3[];
  /** Bogenanteil der Ruhelage je feinem Punkt */
  u: Float64Array;
};

/**
 * Zahnfleisch beider Kiefer aus der Maul-Ableitung: `fein` = Grenzlagen in der Pose (Öffnung, Fressen-Pose, Pinsel),
 * `ruhe` = Grenzlagen in Ruhe (für u). Die Ketten von Zahnfleisch, Lippenrand und Gegenkiefer laufen parallel (gleich viele
 * Käfigkanten, Spalte t ↔ Spalte t, Mundwinkel ↔ Winkelsäule), der feine Index j gehört in allen dreien zusammen.
 */
export function zahnfleischKern(abl: MaulErgebnis, fein: ArrayLike<number>, ruhe: ArrayLike<number> = abl.fein): Record<Kiefer, KernZahnfleisch> {
  const m = abl.maul;
  const M = m.lage.m;
  const P = (i: number, a: ArrayLike<number> = fein): V3 => [a[3 * i]!, a[3 * i + 1]!, a[3 * i + 2]!];
  const nb = kaefigNachbarn(abl.kaefig.fStart, abl.kaefig.fVerts, abl.kaefig.n);
  const feinZug = (kette: readonly number[]): number[] => {
    const out: number[] = [kette[0]!];
    for (let k = 0; k + 1 < kette.length; k++) {
      const f = feinKette(abl.unterteilung, abl.kaefig, kette[k]!, kette[k + 1]!);
      if (f.length) out.push(...f.slice(1));
      else throw new Error(`Zähne: keine Käfigkante ${kette[k]} → ${kette[k + 1]}`);
    }
    return out;
  };
  const K = m.tasche.oben.length;
  // Haut am Lippenrand eines Kiefers: der Hautnachbar, der am stärksten zu diesem Kiefer gehört
  const hautNachbar = (r: number, kiefer: Kiefer): number => {
    const eigen = kiefer === 'oben' ? m.gewichtOben : m.gewichtUnten;
    const fremd = kiefer === 'oben' ? m.gewichtUnten : m.gewichtOben;
    let best = -1;
    let wert = -Infinity;
    for (const j of nb[r] ?? []) {
      if (m.art[j] !== 0) continue;
      const w = (eigen[j] ?? 0) - (fremd[j] ?? 0);
      if (w > wert) {
        wert = w;
        best = j;
      }
    }
    return best;
  };
  const seiteBauen = (kiefer: Kiefer, links: boolean): Seite => {
    const reihe = (k: Kiefer, r: number) => (k === 'oben' ? (links ? m.tasche.obenLinks[r]! : m.tasche.oben[r]!) : links ? m.tasche.untenLinks[r]! : m.tasche.unten[r]!);
    const winkel = (r: number) => (links ? m.tasche.winkelLinks[r]! : m.tasche.winkel[r]!);
    const pfad = links ? m.pfadLinks : m.pfad;
    const unten = links ? m.untenLinks : m.unten;
    const randKaefig = (k: Kiefer) => (k === 'oben' ? pfad.slice(0, M + 1) : [...unten.slice(0, M), pfad[M]!]);
    const fleischKaefig = (k: Kiefer) => [...reihe(k, 0).slice(0, M), winkel(0)];
    const gegenK: Kiefer = kiefer === 'oben' ? 'unten' : 'oben';
    const fl = feinZug(fleischKaefig(kiefer));
    const rd = feinZug(randKaefig(kiefer));
    const gg = feinZug(fleischKaefig(gegenK));
    if (rd.length !== fl.length || gg.length !== fl.length) throw new Error('Zähne: Zahnfleisch, Rand und Gegenkiefer ungleich lang');
    // je Käfigspalte, in der Ruhelage (zu): Richtung längs der Haut des Gegenkiefers (Rand → Hautnachbar) und ein Punkt tief in der Tasche
    const gegenRand = randKaefig(gegenK);
    const tief = (t: number) => (t < M ? reihe(kiefer, Math.max(0, K - 1))[t]! : winkel(Math.max(0, K - 1)));
    const gegenHautRichtung: V3[] = [];
    const innen: V3[] = [];
    for (let t = 0; t <= M; t++) {
      const r = gegenRand[t]!;
      const h = hautNachbar(r, gegenK);
      gegenHautRichtung.push(h >= 0 ? minus3(P(h, ruhe), P(r, ruhe)) : [0, 0, 0]);
      innen.push(P(tief(t), ruhe));
    }
    // Bogenanteil der Ruhelage
    const u = new Float64Array(fl.length);
    for (let j = 1; j < fl.length; j++) u[j] = u[j - 1]! + laenge3(minus3(P(fl[j]!, ruhe), P(fl[j - 1]!, ruhe)));
    const gesamt = u[fl.length - 1]! || 1;
    for (let j = 0; j < fl.length; j++) u[j] = u[j]! / gesamt;
    return { fleisch: fl, rand: rd, gegen: gg, gegenHautRichtung, innen, u };
  };

  const bauen = (kiefer: Kiefer): KernZahnfleisch => {
    const S = { 1: seiteBauen(kiefer, false), [-1]: seiteBauen(kiefer, true) } as Record<-1 | 1, Seite>;
    const nF = S[1].fleisch.length;
    const proSpalte = M > 0 ? (nF - 1) / M : 1;
    const bei = (kette: readonly number[], j: number, A: ArrayLike<number> = fein): V3 => {
      const j0 = Math.min(kette.length - 2, Math.max(0, Math.floor(j)));
      const f = zahl(j - j0, 0, 1);
      const a = P(kette[j0]!, A);
      const b = P(kette[j0 + 1]!, A);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    };
    const spalte = (L: readonly V3[], j: number): V3 => {
      const k = j / proSpalte;
      const k0 = Math.min(L.length - 2, Math.max(0, Math.floor(k)));
      const f = zahl(k - k0, 0, 1);
      return plus3(mal3(L[k0]!, 1 - f), mal3(L[k0 + 1]!, f));
    };
    const jVon = (s: Seite, u: number): number => {
      const v = zahl(u, 0, 1);
      let lo = 0;
      let hi = nF - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (s.u[mid]! <= v) lo = mid;
        else hi = mid;
      }
      const d = s.u[hi]! - s.u[lo]!;
      return lo + (d > 1e-15 ? zahl((v - s.u[lo]!) / d, 0, 1) : 0);
    };
    const uAus = (s: Seite, j: number): number => {
      const j0 = Math.min(nF - 2, Math.max(0, Math.floor(j)));
      return zahl(s.u[j0]! + (j - j0) * (s.u[j0 + 1]! - s.u[j0]!), 0, 1);
    };
    // zentrale Differenz; an der Mitte über die Naht hinweg auf der anderen Seite (der Mittelzahn steht dann quer zur Naht)
    const tangente = (sk: -1 | 1, j: number, A: ArrayLike<number>): V3 => {
      const h = 0.5;
      const a = j - h >= 0 ? bei(S[sk].fleisch, j - h, A) : bei(S[sk === 1 ? -1 : 1].fleisch, h - j, A);
      const b = bei(S[sk].fleisch, Math.min(nF - 1, j + h), A);
      return normiert3(minus3(b, a));
    };
    const senkrecht = (t: V3, v: V3): V3 => minus3(v, mal3(t, punkt3(t, v)));
    /** Beißrichtung in der Ruhelage roh (senkrecht zu t) und ihre Länge */
    const zumGegen = (s: Seite, j: number, t: V3, aussen: boolean): { v: V3; l: number } => {
      if (aussen) {
        const v = senkrecht(t, spalte(s.gegenHautRichtung, j));
        return { v, l: laenge3(v) };
      }
      const v = senkrecht(t, minus3(bei(s.gegen, j, ruhe), bei(s.fleisch, j, ruhe)));
      return { v, l: laenge3(v) };
    };
    /**
     * Rahmen des eigenen Kiefers an der Stelle j: Tangente des Zahnfleischs, Richtung zur eigenen Lippe (senkrecht dazu),
     * Normale. Zahnfleisch und Lippe gehören demselben Kiefer — der Rahmen folgt Knochen, Haps und Fressen-Pose. Am
     * Mundwinkel laufen beide zusammen: dort gilt die Richtung weiter vorn.
     */
    const kieferRahmen = (sk: -1 | 1, j: number, A: ArrayLike<number>): { t: V3; w: V3; n: V3 } => {
      const s = S[sk];
      const t = tangente(sk, j, A);
      let jj = j;
      let w = senkrecht(t, minus3(bei(s.rand, jj, A), bei(s.fleisch, jj, A)));
      while (jj > 0 && laenge3(w) < NAH_AM_WINKEL) {
        jj = Math.max(0, jj - 0.25 * proSpalte);
        w = senkrecht(t, minus3(bei(s.rand, jj, A), bei(s.fleisch, jj, A)));
      }
      w = normiert3(w);
      return { t, w, n: kreuz3(t, w) };
    };
    const rahmen = (u: number, seite: -1 | 0 | 1, aussen = false): ZahnRahmen => {
      const sk: -1 | 1 = seite < 0 ? -1 : 1;
      const s = S[sk];
      const j = jVon(s, seite === 0 ? 0 : u);
      const rand = bei(s.rand, j);
      const p = aussen ? rand : bei(s.fleisch, j);
      // Beißrichtung und innen in der Ruhelage (zu): zum Zahnfleisch des Gegenkiefers an derselben Stelle (außen: längs
      // dessen Haut); am Mundwinkel treffen sich die Linien, dort gilt die Richtung der nächsten Stelle weiter vorn
      const tR = tangente(sk, j, ruhe);
      const g = zumGegen(s, j, tR, aussen);
      let dR: V3;
      if (g.l >= NAH_AM_WINKEL) dR = mal3(g.v, 1 / g.l);
      else {
        let jj = j;
        let h = g;
        while (jj > 0 && h.l < NAH_AM_WINKEL) {
          jj = Math.max(0, jj - 0.25 * proSpalte);
          h = zumGegen(s, jj, tR, aussen);
        }
        const zurueck = h.l > 1e-300 ? normiert3(senkrecht(tR, h.v)) : [0, kiefer === 'oben' ? -1 : 1, 0] as V3;
        const w = glatt(g.l / NAH_AM_WINKEL);
        dR = normiert3(plus3(mal3(g.l > 1e-300 ? mal3(g.v, 1 / g.l) : zurueck, w), mal3(zurueck, 1 - w)));
      }
      // nach innen: zum tiefen Teil der Tasche (Rachen)
      const k = kreuz3(tR, dR);
      const zuInnen = minus3(spalte(s.innen, j), aussen ? bei(s.rand, j, ruhe) : bei(s.fleisch, j, ruhe));
      const iR = punkt3(k, zuInnen) >= 0 ? k : mal3(k, -1);
      // starr im eigenen Kiefer: Anteile im Kieferrahmen der Ruhelage, in den Kieferrahmen der Pose übertragen (Florian:
      // die Zähne hängen fest am Kiefer; zum Gegenkiefer neu ausgerichtet schwenkten sie beim Öffnen um die halbe Öffnung)
      const fR = kieferRahmen(sk, j, ruhe);
      const fP = fein === ruhe ? fR : kieferRahmen(sk, j, fein);
      const mit = (v: V3): V3 => {
        const a = punkt3(v, fR.t);
        const b = punkt3(v, fR.w);
        const c = punkt3(v, fR.n);
        return normiert3(plus3(plus3(mal3(fP.t, a), mal3(fP.w, b)), mal3(fP.n, c)));
      };
      return { p, t: fP.t, d: mit(dR), i: mit(iR), rand };
    };
    // Linie links → Mitte → rechts in der Pose
    const linie = new Float32Array(3 * (2 * nF - 1));
    const uLinie = new Float32Array(2 * nF - 1);
    for (let j = nF - 1, o = 0; j >= 0; j--, o++) {
      linie.set(P(S[-1].fleisch[j]!), 3 * o);
      uLinie[o] = S[-1].u[j]!;
    }
    for (let j = 1; j < nF; j++) {
      linie.set(P(S[1].fleisch[j]!), 3 * (nF - 1 + j));
      uLinie[nF - 1 + j] = S[1].u[j]!;
    }
    const uVon = (q: V3, seite?: -1 | 1): { u: number; seite: -1 | 1; abstand: number } => {
      let best = Infinity;
      let bestU = 0;
      let bestS: -1 | 1 = 1;
      for (const sk of [1, -1] as const) {
        if (seite && sk !== seite) continue;
        const s = S[sk];
        for (let j = 0; j + 1 < nF; j++) {
          const a = P(s.fleisch[j]!);
          const b = P(s.fleisch[j + 1]!);
          const ab = minus3(b, a);
          const l2 = punkt3(ab, ab);
          const f = l2 > 1e-24 ? zahl(punkt3(minus3(q, a), ab) / l2, 0, 1) : 0;
          const dd = laenge3(minus3(q, plus3(a, mal3(ab, f))));
          if (dd < best) {
            best = dd;
            bestU = uAus(s, j + f);
            bestS = sk;
          }
        }
      }
      return { u: bestU, seite: bestS, abstand: best };
    };
    return Object.assign(rahmen, { kiefer, linie, uLinie, uVon });
  };
  return { oben: bauen('oben'), unten: bauen('unten') };
}

// ---------- Dokument ----------

/** Ein Zahn beider Seiten mit seinem Eintrag im Dokument (Kiefer, Index der rechten Hälfte). */
export type ZahnMitQuelle = { zahn: Zahn; kiefer: Kiefer; index: number };

function zahnAus(e: ZahnEintrag, kiefer: Kiefer, seite: -1 | 0 | 1): Zahn {
  const zahn: Zahn = {
    laenge: e.laenge,
    breite: e.breite,
    tiefe: e.breite * ZAHN_TIEFE,
    rundheit: e.rundheit,
    schaerfe: e.schaerfe,
    neigung: e.neigung,
    biegung: e.biegung,
    spreizung: e.spreizung,
    ...(e.drehung !== undefined ? { drehung: e.drehung } : {}),
    ...(e.groesse !== undefined ? { groesse: e.groesse } : {}),
    ...(e.vor !== undefined ? { vor: e.vor } : {}),
    aussen: e.aussen,
    kiefer,
    u: seite === 0 ? 0 : e.u,
    seite,
  };
  if (e.auf && Object.keys(e.auf).length) {
    const auf: ZahnAuf = { ...e.auf };
    if (e.auf.breite !== undefined) auf.tiefe = e.auf.breite * ZAHN_TIEFE;
    zahn.auf = auf;
  }
  return zahn;
}

/** Dokument (rechte Hälfte je Kiefer, bei ungerader Zahl zuerst der Mittelzahn) → Zähne beider Seiten, rechts vor links. */
export function zahnListe(z: Zaehne | undefined): ZahnMitQuelle[] {
  if (!z) return [];
  const reihe = (r: Zahnreihe, kiefer: Kiefer): ZahnMitQuelle[] =>
    r.zaehne.flatMap((e, index) =>
      r.anzahl % 2 === 1 && index === 0
        ? [{ zahn: zahnAus(e, kiefer, 0), kiefer, index }]
        : [
            { zahn: zahnAus(e, kiefer, 1), kiefer, index },
            { zahn: zahnAus(e, kiefer, -1), kiefer, index },
          ],
    );
  return [...reihe(z.oben, 'oben'), ...reihe(z.unten, 'unten')];
}

/** Grundwerte eines Zahns (rechte Hälfte), wie die Automatik bis M4: Länge nach Kopfhöhe und Maullänge, hinten kleiner. */
export const ZAHN_FORM_STANDARD = { rundheit: 0.7, schaerfe: 0.7, neigung: 0, biegung: 0.2, spreizung: 0, breiteAnteil: 0.42 } as const;

/**
 * Rechte Hälfte einer Zahnreihe, symmetrisch verteilt (ungerade Zahl: zuerst der Mittelzahn auf der Achse; die untere
 * Reihe steht in den Lücken der oberen). `laenge` = Länge vorn, hinten (u = 1) 45 % kürzer; vorhandene Einträge behalten
 * ihre Form und bekommen nur ein neues u, neue übernehmen die Form des letzten vorhandenen (samt Werten für offen).
 */
export function zahnreiheVerteilen(anzahl: number, kiefer: Kiefer, laenge: number, bisher?: Zahnreihe, uMax = 0.9): Zahnreihe {
  const n = Math.max(0, Math.min(31, Math.round(anzahl)));
  const ungerade = n % 2 === 1;
  const k = Math.floor(n / 2);
  const versatz = kiefer === 'unten' ? 0.5 : 0;
  const us: number[] = [];
  if (ungerade) {
    const d = uMax / (k + 0.5);
    us.push(0);
    for (let i = 1; i <= k; i++) us.push(zahl((i + versatz) * d, 0, 1));
  } else {
    const d = k ? uMax / k : 0;
    for (let i = 1; i <= k; i++) us.push(zahl((i - 0.5 + versatz) * d, 0, 1));
  }
  const vorlage = (u: number): ZahnEintrag => {
    const l = laenge * (1 - 0.45 * u);
    return { laenge: l, breite: ZAHN_FORM_STANDARD.breiteAnteil * l, rundheit: ZAHN_FORM_STANDARD.rundheit, schaerfe: ZAHN_FORM_STANDARD.schaerfe, neigung: 0, biegung: ZAHN_FORM_STANDARD.biegung, spreizung: 0, u, aussen: false };
  };
  const letzter = bisher?.zaehne[bisher.zaehne.length - 1];
  const zaehne = us.map((u, i) => {
    const alt = bisher?.zaehne[i] ?? letzter;
    return alt ? { ...alt, u } : vorlage(u);
  });
  return { anzahl: n, zaehne };
}

/** Länge der Automatik vorn: 7,5 % der Höhe, höchstens ein Drittel der Maullänge (kurze Mäuler wie der Tiger-Stern). */
export function zahnLaengeStandard(abl: MaulErgebnis, hoehe: number): number {
  return Math.min(0.075 * hoehe, 0.35 * abl.maul.laenge);
}

/** Geschlossen dieser Anteil der größten Länge, die gerade nicht stört (Abstand zur Grenze, damit kleine Änderungen nicht kippen) */
export const EINPASSEN_ANTEIL = 0.9;

/** Gemerkt je Ableitung (ohne Pinsel-Deltas) und Prüfsumme der Deltas: Öffnen und Posen passen nicht neu ein */
const standardSpeicher = new WeakMap<object, { schluessel: string; reihen: Zaehne }>();
/**
 * Einpassen der Automatik: so fein abgetastet wie die Prüfung (sonst meldete sie im Editor eingepasste Zähne, 0,3 px bei
 * einem 4,6-px-Zahn), 8 Halbierungsschritte (Grenze auf 0,4 % der Länge)
 */
const EINPASSEN_OPTIONEN = { alpha: 0, schritte: 8 } as const;

/**
 * Automatik (ohne Zahnreihen im Dokument): 6 oben, 5 unten je Seite, höchstens ein Zahn je Pfadspalte (kurze Mäuler);
 * Länge nach `zahnLaengeStandard` (Höhe der Ruhelage), hinten kleiner. Beim Überbiss stehen die oberen Zähne außen vor
 * dem schmaleren Unterkiefer (Bogen `06-rex-mit-maul`), beim Unterbiss die unteren vor dem Oberkiefer. Geschlossen ist
 * die Tasche nur wenige Pixel dick: jeder Zahn ist dort so lang, wie die Prüfung erlaubt (`zaehneEinpassen`, davon
 * `EINPASSEN_ANTEIL`), und wächst beim Öffnen auf die volle Länge (Florians Weg für Riesenzähne). Gemerkt je Ableitung.
 */
export function zaehneStandard(abl: MaulErgebnis, merken: { objekt: object; schluessel: string } = { objekt: abl, schluessel: '' }): Zaehne {
  const gemerkt = standardSpeicher.get(merken.objekt);
  if (gemerkt && gemerkt.schluessel === merken.schluessel) return gemerkt.reihen;
  let hoehe = 0;
  for (let i = 1; i < abl.fein.length; i += 3) hoehe = Math.max(hoehe, abl.fein[i]!);
  const jeSeite = Math.max(1, abl.maul.lage.m - 2);
  const L = zahnLaengeStandard(abl, hoehe);
  const reihen: Zaehne = { oben: zahnreiheVerteilen(2 * Math.min(6, jeSeite), 'oben', L), unten: zahnreiheVerteilen(2 * Math.min(5, jeSeite), 'unten', L) };
  const v = abl.maul.lage.versatz;
  const aussen: Record<Kiefer, boolean> = { oben: !!v && !v.oben, unten: !!v && v.oben };
  for (const kiefer of ['oben', 'unten'] as const) if (aussen[kiefer]) reihen[kiefer].zaehne = reihen[kiefer].zaehne.map((e) => ({ ...e, aussen: true }));
  // geschlossen einpassen: nur die rechte Hälfte und der Mittelzahn (links ist das Spiegelbild)
  const rechts = zahnListe(reihen).filter((q) => q.zahn.seite >= 0);
  const laengen = zaehneEinpassen(zahnPruefFlaeche(abl, abl.fein), zahnfleischKern(abl, abl.fein), rechts.map((q) => q.zahn), EINPASSEN_OPTIONEN);
  rechts.forEach((q, i) => {
    const e = reihen[q.kiefer].zaehne[q.index]!;
    const passt = laengen[i] ?? null;
    const zu = passt === null ? 0.05 * e.laenge : passt >= e.laenge ? e.laenge : EINPASSEN_ANTEIL * passt;
    if (zu < e.laenge) reihen[q.kiefer].zaehne[q.index] = { ...e, laenge: zu, auf: { laenge: e.laenge } };
  });
  standardSpeicher.set(merken.objekt, { schluessel: merken.schluessel, reihen });
  return reihen;
}

// ---------- Bau ----------

/**
 * Ein gebauter Zahn: Herkunft im Dokument, Seite, Stelle und Lage (für Auswahl, Prüfung und Anzeige); `vorn` = Richtung
 * „vor“ am Ansatz (zur Lippe, −i des Rahmens, posiert), für den Griff vor/zurück.
 */
export type ZahnInfo = { kiefer: Kiefer; index: number; seite: -1 | 0 | 1; u: number; fuss: V3; spitze: V3; vorn: V3 };

export type ZahnBau = {
  positionen: Float32Array;
  normalen: Float32Array;
  /** 0 am Zahnfleisch … 1 an der Spitze (Verlauf im Material) */
  anteil: Float32Array;
  /** Zahn je Ecke (Index in `liste`) */
  zahn: Uint16Array;
  liste: ZahnInfo[];
  /** wirksame Zahnreihen (Dokument oder Automatik) */
  reihen: Zaehne;
  /** ob die Reihen aus dem Dokument stammen */
  ausDokument: boolean;
  /** Zahnfleischlinien in der Pose (links → rechts) mit u je Punkt */
  fleisch: { oben: Float32Array; unten: Float32Array; uOben: Float32Array; uUnten: Float32Array };
};

/** Zähne am Zahnfleisch des posierten Käfigs (`fein` = Grenzlagen der Pose) bei Öffnung α. */
export function zaehneBauen(abl: MaulErgebnis, fein: ArrayLike<number>, dok: Zaehne | undefined, alpha: number, merken?: { objekt: object; schluessel: string }): ZahnBau {
  const fleisch = zahnfleischKern(abl, fein);
  const reihen = dok ?? zaehneStandard(abl, merken);
  const liste = zahnListe(reihen);
  const netz = zahnNetze(
    liste.map((q) => q.zahn),
    fleisch,
    alpha,
    ZAHN_SEITEN,
    ZAHN_RINGE,
  );
  const zahn = new Uint16Array(netz.positionen.length / 3);
  netz.bereiche.forEach((b, i) => zahn.fill(i, b.start, b.start + b.anzahl));
  const info: ZahnInfo[] = liste.map((q, i) => {
    const f = zahnBei(q.zahn, alpha);
    const r = fleisch[q.kiefer](f.u, q.zahn.seite, false);
    return { kiefer: q.kiefer, index: q.index, seite: q.zahn.seite, u: f.u, fuss: netz.gitter[i]!.wurzel, spitze: netz.gitter[i]!.spitze, vorn: [-r.i[0], -r.i[1], -r.i[2]] };
  });
  return {
    positionen: netz.positionen,
    normalen: netz.normalen,
    anteil: netz.anteil,
    zahn,
    liste: info,
    reihen,
    ausDokument: !!dok,
    fleisch: { oben: fleisch.oben.linie, unten: fleisch.unten.linie, uOben: fleisch.oben.uLinie, uUnten: fleisch.unten.uLinie },
  };
}

// ---------- Prüfung ----------

/** Taschenpunkte (Art 3 Tasche oben, 4 Tasche unten, 6 Winkelsäule, 8 Zahnfleischkante des Unterkiefers) */
const TASCHE_ART = new Set([3, 4, 6, 8]);

/**
 * Prüffläche des Kern-Mauls in einer Pose (`fein` = Grenzlagen): feine Flächen, Kiefer je Fläche aus dem Anteil des
 * Unterkiefergewichts (über die Unterteilungsmatrix je feinem Punkt, gemittelt je Fläche: ≥ 0,6 unten, ≤ 0,4 oben, sonst
 * Übergang), Tasche wie die Taschenpunkte. Das ganze Zahnfleisch liegt im sichtbaren Maul (kein Reißverschluss).
 */
export function zahnPruefFlaeche(abl: MaulErgebnis, fein: ArrayLike<number>): { netz: { punkte: [number, number, number][]; flaechen: number[][] }; kiefer: (Kiefer | 'mitte')[]; haut: boolean[]; sichtbarBis: number } {
  const m = abl.maul;
  const M = abl.unterteilung.matrix;
  const nF = M.start.length - 1;
  const wu = new Float64Array(nF);
  const ta = new Float64Array(nF);
  for (let i = 0; i < nF; i++) {
    let g = 0;
    let u = 0;
    let t = 0;
    for (let q = M.start[i]!; q < M.start[i + 1]!; q++) {
      const w = M.wert[q]!;
      const c = M.index[q]!;
      g += w;
      u += w * (m.gewichtUnten[c] ?? 0);
      if (TASCHE_ART.has(m.art[c] ?? 0)) t += w;
    }
    wu[i] = g > 0 ? u / g : 0;
    ta[i] = g > 0 ? t / g : 0;
  }
  const punkte: [number, number, number][] = [];
  for (let i = 0; i < fein.length / 3; i++) punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
  const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
  const kiefer = flaechen.map((f) => {
    let s = 0;
    for (const v of f) s += wu[v]!;
    const a = s / f.length;
    return a >= 0.6 ? 'unten' : a <= 0.4 ? 'oben' : 'mitte';
  });
  const haut = flaechen.map((f) => {
    let s = 0;
    for (const v of f) s += ta[v]!;
    return s / f.length < 0.5;
  });
  return { netz: { punkte, flaechen }, kiefer, haut, sichtbarBis: 1 };
}

/** Schwerster Befund je Dokument-Zahn (beide Seiten zusammen) bei einer Öffnung. */
export type ZahnMeldung = { kiefer: Kiefer; index: number; oeffnung: number; befund: ZahnBefund; listenIndizes: number[] };

/**
 * Prüft die Zähne in einer Pose (`fein` = Grenzlagen bei Öffnung α, wie im Bau mit Fressen-Pose) und fasst die Befunde
 * je Dokument-Zahn zusammen (der schwerste gilt, Spiegelpartner zusammen).
 */
export function zaehnePruefen(abl: MaulErgebnis, fein: ArrayLike<number>, liste: readonly ZahnMitQuelle[], alpha: number, opt: Partial<PruefOptionen> = {}): ZahnMeldung[] {
  if (!liste.length) return [];
  const fleisch = zahnfleischKern(abl, fein);
  const befunde = zahnPruefenAuf(zahnPruefFlaeche(abl, fein), fleisch, liste.map((q) => q.zahn), { ...opt, alpha });
  const je = new Map<string, ZahnMeldung>();
  for (const b of befunde) {
    const q = liste[b.zahn];
    if (!q || b.art === 'ok') continue;
    const k = `${q.kiefer}:${q.index}`;
    const alt = je.get(k);
    if (!alt) je.set(k, { kiefer: q.kiefer, index: q.index, oeffnung: alpha, befund: b, listenIndizes: [b.zahn] });
    else {
      if (!alt.listenIndizes.includes(b.zahn)) alt.listenIndizes.push(b.zahn);
      if (b.tiefe > alt.befund.tiefe) alt.befund = b;
    }
  }
  return [...je.values()];
}

/** Öffnungen der Prüfung (Plan 5.3: zu, 50 %, offen; dazu 25 %, wo sich Zähne beim Öffnen am ehesten treffen). */
export const PRUEF_OEFFNUNGEN = [0, 0.25, 0.5, 1] as const;

/** Prüfung in mehreren Lagen (Öffnung und Grenzlagen der Pose); je Dokument-Zahn gilt der schwerste Befund. */
export function zaehnePruefenBei(abl: MaulErgebnis, lagen: readonly { oeffnung: number; fein: ArrayLike<number> }[], liste: readonly ZahnMitQuelle[], opt: Partial<PruefOptionen> = {}): ZahnMeldung[] {
  const je = new Map<string, ZahnMeldung>();
  for (const l of lagen) {
    for (const m of zaehnePruefen(abl, l.fein, liste, l.oeffnung, opt)) {
      const k = `${m.kiefer}:${m.index}`;
      const alt = je.get(k);
      if (!alt || m.befund.tiefe > alt.befund.tiefe) je.set(k, m);
    }
  }
  return [...je.values()];
}

/** Vorschlag der Prüfung auf einen Dokument-Zahn anwenden (die Tiefe folgt im Dokument der Breite, sie entfällt). */
export function zahnAenderungAnwenden(e: ZahnEintrag, a: ZahnAenderung): ZahnEintrag {
  const neu: ZahnEintrag = { ...e };
  for (const k of ['laenge', 'breite', 'rundheit', 'schaerfe', 'neigung', 'biegung', 'spreizung', 'drehung', 'groesse', 'vor', 'u'] as const) {
    const v = a[k];
    if (v !== undefined) neu[k] = v;
  }
  if (a.aussen !== undefined) neu.aussen = a.aussen;
  if (a.auf) {
    const auf: Record<string, number | undefined> = { ...e.auf, ...a.auf };
    delete auf.tiefe;
    neu.auf = auf as NonNullable<ZahnEintrag['auf']>;
  }
  return neu;
}
