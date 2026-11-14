// Form zuerst (04.11.2026): alle Ansichten gleichwertig.
//
// Florian zeichnet Seite, Front und Top; keine Ansicht hat Vorrang. Jede gezeichnete Fläche bekommt ihre größten Kreise, wie
// die Seite bisher: An jeder Stelle des Umrisses sitzt der größte Kreis, der innen Platz hat. Jeder Kreis wird ein Körper im
// Raum, ein Ellipsoid: In seiner Ansicht ist er genau der Kreis, in der Tiefe so rund wie möglich — höchstens so tief wie
// breit, also eine Kugel — und nur so weit flach gedrückt, wie die beiden anderen Ansichten es verlangen: Er muss in beiden
// ganz innerhalb der gezeichneten Fläche liegen. In der Tiefe sitzt er dort, wo er am rundesten Platz hat; bei Gleichstand in
// der Mitte dessen, was die anderen Ansichten zulassen (für die Seite ist das die Mittelebene). Der Körper ist die Vereinigung
// aller Ellipsoide aus allen drei Ansichten, gespiegelt an der Mittelebene.
//
// Daraus folgt ohne weitere Regel: Jede Ansicht zeigt genau ihre Zeichnung (die Kreise einer Ansicht decken ihre Fläche, und
// kein Ellipsoid ragt aus einer Ansicht heraus). Drei Kreise geben eine Kugel. Zeigen Seite und Front je zwei Beine, stehen
// vier Beine da; Flossen, die Top und Front zeigen, werden flach; eine Kerbe im Top gibt zwei Lappen. Eine Ansicht, die nicht
// gezeichnet ist, schränkt nichts ein: Mit der Seite allein ist der Körper genau der runde aus `rund.ts`.
//
// Vernetzt wird wie dort mit Surface Nets auf einem in z spiegelgleichen Raster; danach liegen die Punkte auf dem Ellipsoid, das
// dort am weitesten reicht, und die Normalen sind seine.

import type { V2 } from '../bezier';
import { Umrissfeld } from './abstand';
import { kugelRadien } from './kugeln';
import { type UmrissPunkt, polygonFlaeche, umrissAbtasten } from './umriss';

/** Eine Ansicht: eine oder mehrere geschlossene Flächen in ihren eigenen Koordinaten. */
export type Zeichnung = readonly (readonly UmrissPunkt[])[];

/** Seite in (x, y), Front in (z, y), Top in (x, z); Front und Top spiegelgleich zu z = 0. Fehlt eine, schränkt sie nichts ein. */
export type Zeichnungen = { seite: Zeichnung; front?: Zeichnung | null; top?: Zeichnung | null };

export type GleichOptionen = {
  /** gewünschte Dreieckszahl (ungefähr); Standard 40 000 */
  dreiecke?: number;
  /** feste Rasterweite statt der Dreieckszahl */
  zelle?: number;
  /**
   * Die Ansicht, die Florian gerade bearbeitet, führt (Probe 04.11.): Ihre Kreise werden auch dort gebaut, wo eine andere
   * Ansicht keinen Platz für sie hat — eine Ansicht ohne Platz redet bei diesem Kreis nicht mit (so rund wie möglich) und zeigt
   * danach, was entstanden ist. Ohne führende Ansicht entscheidet die kleinere Zeichnung (Schnittmenge).
   */
  fuehrend?: AnsichtName | null;
};

export type AnsichtName = 'seite' | 'front' | 'top';

export type GleichesNetz = {
  positionen: Float32Array;
  normalen: Float32Array;
  indizes: Uint32Array;
  zelle: number;
  /** Ellipsoide je Ansicht (Spiegelbilder nicht mitgezählt) */
  ellipsoide: Record<AnsichtName, number>;
  /** abgetastete Flächen je Ansicht, in ihren eigenen Koordinaten (gegen den Uhrzeigersinn) */
  umrisse: Record<AnsichtName, V2[][]>;
  /** Ellipsoide als (Mitte x, y, z, Halbachsen x, y, z) je Eintrag, mit Spiegelbildern */
  liste: Float64Array;
};

type Achse = 0 | 1 | 2;
// Achsen jeder Ansicht im Raum (0 = x, 1 = y, 2 = z): waagerecht u, senkrecht v, Blickrichtung tiefe
const ACHSEN: Record<AnsichtName, { u: Achse; v: Achse; tiefe: Achse }> = {
  seite: { u: 0, v: 1, tiefe: 2 },
  front: { u: 2, v: 1, tiefe: 0 },
  top: { u: 0, v: 2, tiefe: 1 },
};
const NAMEN: readonly AnsichtName[] = ['seite', 'front', 'top'];
const LEER = new Float64Array(0);
/** Bei fast gleicher Tiefe bleibt ein Ellipsoid der Seite auf der Mittelebene (kein Paar dicht nebeneinander). */
const MITTE_VORRANG = 0.9;
/** Blickrichtung je Ansicht: +1 heißt, größere Tiefe liegt näher am Betrachter (Seite von +z, Front von −x, Top von +y). */
const VORNE: Record<AnsichtName, 1 | -1> = { seite: 1, front: -1, top: 1 };

/**
 * Abschnitte der Polygone auf einer Geraden: v fest (Abschnitte in u) oder u fest (Abschnitte in v); vereinigt oder je Fläche
 * für sich (überlappend, nach Anfang sortiert).
 */
function abschnitte(polygone: readonly V2[][], vFest: boolean, w: number, vereinigt = true): Float64Array {
  const paare: number[] = [];
  const xs: number[] = [];
  for (const P of polygone) {
    xs.length = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i]!;
      const b = P[(i + 1) % P.length]!;
      const av = vFest ? a.y : a.x;
      const bv = vFest ? b.y : b.x;
      if (av <= w === bv <= w) continue;
      const t = (w - av) / (bv - av);
      const au = vFest ? a.x : a.y;
      const bu = vFest ? b.x : b.y;
      xs.push(au + t * (bu - au));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) paare.push(xs[i]!, xs[i + 1]!);
  }
  if (paare.length === 0) return LEER;
  const ordnung = Array.from({ length: paare.length / 2 }, (_, i) => i).sort((p, q) => paare[2 * p]! - paare[2 * q]!);
  const aus: number[] = [];
  for (const i of ordnung) {
    const a = paare[2 * i]!;
    const b = paare[2 * i + 1]!;
    if (vereinigt && aus.length > 0 && a <= aus[aus.length - 1]!) aus[aus.length - 1] = Math.max(aus[aus.length - 1]!, b);
    else aus.push(a, b);
  }
  return new Float64Array(aus);
}

/** Eine Ansicht, geschnitten mit Zeilen (v fest) und Spalten (u fest) in feinem Abstand. */
class Schnitte {
  private readonly d: number;
  private readonly u0: number;
  private readonly v0: number;
  private readonly zeilen: Float64Array[];
  private readonly spalten: Float64Array[];
  // je Fläche für sich (nur bei mehreren Flächen)
  private readonly zeilenRoh: Float64Array[];
  private readonly spaltenRoh: Float64Array[];

  constructor(polygone: readonly V2[][], d: number) {
    let uMin = Infinity;
    let vMin = Infinity;
    let uMax = -Infinity;
    let vMax = -Infinity;
    for (const P of polygone) {
      for (const q of P) {
        uMin = Math.min(uMin, q.x);
        uMax = Math.max(uMax, q.x);
        vMin = Math.min(vMin, q.y);
        vMax = Math.max(vMax, q.y);
      }
    }
    this.d = d;
    this.u0 = uMin - d;
    this.v0 = vMin - d;
    const nz = Math.ceil((vMax - vMin) / d) + 3;
    const ns = Math.ceil((uMax - uMin) / d) + 3;
    this.zeilen = Array.from({ length: nz }, (_, k) => abschnitte(polygone, true, this.v0 + k * d));
    this.spalten = Array.from({ length: ns }, (_, k) => abschnitte(polygone, false, this.u0 + k * d));
    const mehrere = polygone.length > 1;
    this.zeilenRoh = mehrere ? Array.from({ length: nz }, (_, k) => abschnitte(polygone, true, this.v0 + k * d, false)) : this.zeilen;
    this.spaltenRoh = mehrere ? Array.from({ length: ns }, (_, k) => abschnitte(polygone, false, this.u0 + k * d, false)) : this.spalten;
  }

  private puffer = new Float64Array(64);

  /** Abschnitte in u bei v (`roh`: je Fläche für sich); gilt bis zum nächsten Aufruf */
  zeile(v: number, roh = false): Float64Array {
    return this.zwischen(roh ? this.zeilenRoh : this.zeilen, (v - this.v0) / this.d);
  }

  /** Abschnitte in v bei u (`roh`: je Fläche für sich); gilt bis zum nächsten Aufruf */
  spalte(u: number, roh = false): Float64Array {
    return this.zwischen(roh ? this.spaltenRoh : this.spalten, (u - this.u0) / this.d);
  }

  /**
   * Zwischen den beiden benachbarten Geraden linear (nahe einer Spitze der Zeichnung ändert sich die Breite schnell, die nächste
   * Gerade allein lag dort bis zu einer Viertelzelle daneben); ändert sich dazwischen die Zahl der Abschnitte, die nächste; ist
   * sie leer, eine nicht leere bis zwei Schritte daneben (am Rand der Zeichnung, Rasterweite).
   */
  private zwischen(liste: Float64Array[], f: number): Float64Array {
    const k0 = Math.floor(f);
    const a = liste[k0];
    const b = liste[k0 + 1];
    if (a && b && a.length > 0 && a.length === b.length) {
      if (this.puffer.length < a.length) this.puffer = new Float64Array(2 * a.length);
      const t = f - k0;
      for (let i = 0; i < a.length; i++) this.puffer[i] = a[i]! * (1 - t) + b[i]! * t;
      return this.puffer.subarray(0, a.length);
    }
    const k = Math.round(f);
    const g = liste[k] ?? LEER;
    if (g.length > 0) return g;
    for (const d of [1, -1, 2, -2]) {
      const n = liste[k + (f > k ? d : -d)];
      if (n && n.length > 0) return n;
    }
    return LEER;
  }
}

/** Schnitt zweier Abschnittslisten. */
function schneiden(a: Float64Array, b: Float64Array): number[] {
  const aus: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i]!, b[j]!);
    const hi = Math.min(a[i + 1]!, b[j + 1]!);
    if (lo < hi) aus.push(lo, hi);
    if (a[i + 1]! < b[j + 1]!) i += 2;
    else j += 2;
  }
  return aus;
}

/**
 * Der Abschnitt der Liste, der an [lo, hi] anschließt (−1: keiner); berühren mehrere, der nächste an der bevorzugten Tiefe z
 * (spaltet sich die Zeichnung, bleibt das Ellipsoid auf der Seite seiner Mitte).
 */
function bester(liste: Float64Array, lo: number, hi: number, z: number): number {
  let best = -1;
  let abstand = Infinity;
  let laenge = 0;
  for (let q = 0; q < liste.length; q += 2) {
    const a = liste[q]!;
    const b = liste[q + 1]!;
    const l = Math.min(hi, b) - Math.max(lo, a);
    if (l < 0) continue;
    const d = z < a ? a - z : z > b ? z - b : 0;
    if (d < abstand || (d === abstand && l > laenge)) {
      abstand = d;
      laenge = l;
      best = q;
    }
  }
  return best;
}

type Bedingungen = { a: number[]; b: number[]; s: number[] };

/** Größte Tiefe h ≤ hMax, für die ein m mit a + h·s ≤ m ≤ b − h·s für alle Bedingungen existiert (−1: nicht einmal flach). */
function groessteTiefe(c: Bedingungen, hMax: number): number {
  const passt = (h: number): boolean => {
    let lo = -Infinity;
    let hi = Infinity;
    for (let i = 0; i < c.a.length; i++) {
      lo = Math.max(lo, c.a[i]! + h * c.s[i]!);
      hi = Math.min(hi, c.b[i]! - h * c.s[i]!);
    }
    return lo <= hi;
  };
  if (!passt(0)) return -1;
  if (passt(hMax)) return hMax;
  let lo = 0;
  let hi = hMax;
  for (let it = 0; it < 40; it++) {
    const m = (lo + hi) / 2;
    if (passt(m)) lo = m;
    else hi = m;
  }
  return lo;
}

/** Bereich der Lagen m, die bei Tiefe h passen. */
function lagen(c: Bedingungen, h: number): [number, number] {
  let lo = -Infinity;
  let hi = Infinity;
  for (let i = 0; i < c.a.length; i++) {
    lo = Math.max(lo, c.a[i]! + h * c.s[i]!);
    hi = Math.min(hi, c.b[i]! - h * c.s[i]!);
  }
  return [lo, hi];
}

/** Rasterweite aus der Seitenfläche wie in `rund.ts` (Oberfläche ≈ 4 × Seitenfläche, zwei Dreiecke je Zelle), in 4-%-Stufen. */
function rasterweite(seite: Zeichnung, opt: GleichOptionen): number {
  if (opt.zelle !== undefined) return Math.max(0.25, opt.zelle);
  let flaeche = 0;
  for (const p of seite) flaeche += polygonFlaeche(umrissAbtasten(p, 4).punkte);
  const z = Math.sqrt((4 * Math.max(flaeche, 1)) / ((opt.dreiecke ?? 40000) / 2));
  return Math.max(0.25, 2 ** (Math.round(Math.log2(z) * 16) / 16));
}

/** Ellipsoide als flache Liste: Mitte (x, y, z), Halbachsen (x, y, z). */
class Liste {
  readonly w: number[] = [];
  neu(c: readonly number[], a: readonly number[]): void {
    this.w.push(c[0]!, c[1]!, c[2]!, a[0]!, a[1]!, a[2]!);
    // gespiegelt an der Mittelebene, wenn es nicht auf ihr sitzt
    if (c[2]! > 1e-9) this.w.push(c[0]!, c[1]!, -c[2]!, a[0]!, a[1]!, a[2]!);
  }
}

/**
 * Die Ellipsoide einer Ansicht: je größtem Kreis und je Abschnitt, den die beiden anderen Ansichten dort in der Tiefe
 * zulassen, eines — so tief wie möglich (höchstens der Radius), in beiden anderen Ansichten ganz innerhalb der Zeichnung.
 */
function ellipsoideVon(
  name: AnsichtName,
  flaechen: readonly V2[][],
  schnitte: Record<AnsichtName, Schnitte | null>,
  zelle: number,
  liste: Liste,
  vorne: ((u: number, v: number) => number) | null,
  fuehrt = false,
): number {
  const ax = ACHSEN[name];
  const D = ax.tiefe;
  // die beiden anderen Ansichten: welche Achse sie mit dieser teilen und wie sie längs der Tiefe geschnitten werden
  const alle = NAMEN.filter((w) => w !== name && schnitte[w]).map((w) => {
    const aw = ACHSEN[w];
    const zeilen = aw.u === D;
    const geteilt = zeilen ? aw.v : aw.u;
    const s = schnitte[w]!;
    return { geteilt, schnitt: (t: number, roh = false) => (zeilen ? s.zeile(t, roh) : s.spalte(t, roh)) };
  });
  type Andere = (typeof alle)[number];
  /** Hat die andere Ansicht an jeder Sehne des Kreises etwas gezeichnet? */
  const platz = (o: Andere, mitte: number, r: number, n: number): boolean => {
    for (let j = -n; j <= n; j++) if (o.schnitt(mitte + (j / n) * 0.98 * r).length === 0) return false;
    return true;
  };
  let anzahl = 0;
  const c = [0, 0, 0];
  const a = [0, 0, 0];
  const bed: Bedingungen = { a: [], b: [], s: [] };
  const sv = VORNE[name];
  const felder = flaechen.map((P) => (P.length >= 3 ? new Umrissfeld(P, 2 * zelle) : null));
  for (let ri = 0; ri < flaechen.length; ri++) {
    const P = flaechen[ri]!;
    const feld = felder[ri];
    if (!feld) continue;
    let uMin = Infinity;
    let uMax = -Infinity;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (const q of P) {
      uMin = Math.min(uMin, q.x);
      uMax = Math.max(uMax, q.x);
      vMin = Math.min(vMin, q.y);
      vMax = Math.max(vMax, q.y);
    }
    const R = kugelRadien(feld, Math.hypot(uMax - uMin, vMax - vMin), 0.75 * zelle, 0.05 * zelle, true);
    for (let i = 0; i < P.length; i += 2) {
      // eine Kontur innerhalb einer früher gezeichneten Fläche dieser Ansicht ist sichtbar (die spätere liegt obenauf): die
      // Fläche liegt dort vor allem anderen (erst im zweiten Durchgang, wenn das andere steht); eine Kontur unter einer später
      // gezeichneten ist verdeckt und bleibt, wo sie ohnehin läge
      let innen = false;
      for (let rj = 0; rj < ri && !innen; rj++) {
        if (felder[rj] && felder[rj]!.naechster(P[i]!.x, P[i]!.y).d > 0.5 * zelle) innen = true;
      }
      if (innen !== (vorne !== null)) continue;
      const r = R[i]!;
      const cu = P[i]!.x + r * feld.pn[2 * i]!;
      const cv = P[i]!.y + r * feld.pn[2 * i + 1]!;
      c[ax.u] = cu;
      c[ax.v] = cv;
      // spiegelgleich: nur Kreise mit z ≥ 0, die übrigen sind Spiegelbilder
      if (D !== 2 && c[2]! < -1e-9) continue;
      const n = Math.min(24, Math.max(4, Math.ceil(r / (zelle / 2))));
      // führt diese Ansicht, reden nur die anderen mit, die für den ganzen Kreis Platz haben
      const andere = fuehrt && !innen ? alle.filter((o) => platz(o, c[o.geteilt]!, r, n)) : alle;
      // Abschnitte der Tiefe an der Kreismitte; eine obenauf gezeichnete Fläche liegt vorn: in den anderen Ansichten zählt
      // dort je Fläche der vorderste Abschnitt (ihr eigener Teil, nicht der Körper dahinter)
      const VORN = sv * 1e9;
      let teile: number[] = [-Infinity, Infinity];
      for (const o of andere) {
        let liste = o.schnitt(c[o.geteilt]!, innen);
        if (innen && liste.length > 2) {
          const q = bester(liste, -Infinity, Infinity, VORN);
          liste = q < 0 ? LEER : liste.slice(q, q + 2);
        }
        teile = schneiden(new Float64Array(teile), liste);
      }
      // redet keine andere Ansicht mit, liegt der Kreis in der Tiefe dort, wo die anderen am nächsten etwas zeigen
      let ohne = 0;
      if (andere.length === 0 && D !== 2) {
        let summe = 0;
        let zahl = 0;
        for (const o of alle) {
          for (let s = 0; s <= 200; s++) {
            const t = c[o.geteilt]! + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * (zelle / 2);
            const l = o.schnitt(t);
            if (l.length === 0) continue;
            summe += (l[0]! + l[l.length - 1]!) / 2;
            zahl++;
            break;
          }
        }
        if (zahl > 0) ohne = summe / zahl;
      }
      for (let k = 0; k < teile.length; k += 2) {
        const lo = teile[k]!;
        const hi = teile[k + 1]!;
        if (D === 2 && hi <= 0) continue;
        // Bedingungen: jede Sehne längs der Tiefe muss in ihrem Abschnitt liegen
        bed.a.length = 0;
        bed.b.length = 0;
        bed.s.length = 0;
        let frei = true;
        for (const o of andere) {
          const mitte = c[o.geteilt]!;
          // von der Mitte des Kreises nach außen: je Sehne der Abschnitt, der an den der vorigen anschließt (spaltet sich die
          // Zeichnung weiter außen, bleibt das Ellipsoid in dem Teil, in dem es angefangen hat); in der Tiefe z zählt nur die
          // Hälfte z ≥ 0, die andere ist ihr Spiegelbild
          const zMitte = innen ? VORN : D === 2 && lo < 0 ? 0 : Number.isFinite(lo + hi) ? (lo + hi) / 2 : 0;
          for (const richtung of [1, -1]) {
            let a0 = D === 2 ? Math.max(lo, 0) : lo;
            let b0 = hi;
            for (let j = richtung > 0 ? 0 : -1; Math.abs(j) <= n && frei; j += richtung) {
              const f = (j / n) * 0.98;
              const liste = o.schnitt(mitte + f * r, innen);
              const q = bester(liste, a0, b0, zMitte);
              if (q < 0) {
                frei = false;
                break;
              }
              bed.a.push(liste[q]!);
              bed.b.push(liste[q + 1]!);
              bed.s.push(Math.sqrt(1 - f * f));
              a0 = D === 2 ? Math.max(liste[q]!, 0) : liste[q]!;
              b0 = liste[q + 1]!;
            }
          }
        }
        if (!frei) continue;
        if (innen) {
          // sichtbar: die Kontur liegt vor dem, was schon steht
          const vor = vorne!(P[i]!.x, P[i]!.y);
          if (Number.isFinite(vor)) {
            bed.a.push(sv > 0 ? vor : -Infinity);
            bed.b.push(sv > 0 ? Infinity : vor);
            bed.s.push(0);
          }
        }
        let h = groessteTiefe(bed, r);
        if (h < 0.3 * zelle) continue;
        const zentral = D === 2 && lo < 0 && !innen;
        const vorzug = zentral ? 0 : !Number.isFinite(lo + hi) ? ohne : (lo + hi) / 2;
        let m: number;
        const [l0, u0] = lagen(bed, h);
        if (h >= r) m = Math.min(Math.max(vorzug, l0), u0);
        else m = (l0 + u0) / 2;
        if (zentral) {
          // auf der Mittelebene bleiben, wenn es dort fast so tief passt
          const [lm, um] = lagen(bed, 0);
          if (lm <= 0 && um >= 0) {
            let h0 = r;
            for (let q = 0; q < bed.a.length; q++) h0 = Math.min(h0, Math.min(-bed.a[q]!, bed.b[q]!) / bed.s[q]!);
            if (h0 >= MITTE_VORRANG * h) {
              h = h0;
              m = 0;
            }
          }
        }
        if (D === 2) m = Math.abs(m);
        if (!Number.isFinite(m)) m = Number.isFinite(vorzug) ? vorzug : 0;
        c[D] = m;
        a[ax.u] = r;
        a[ax.v] = r;
        a[D] = h;
        liste.neu(c, a);
        anzahl++;
      }
    }
  }
  return anzahl;
}

/** Tiefe der vordersten Fläche der Ellipsoide auf dem Sehstrahl einer Ansicht bei (u, v) (keine: ∓∞). */
function vorderste(L: Float64Array, name: AnsichtName): (u: number, v: number) => number {
  const ax = ACHSEN[name];
  const sv = VORNE[name];
  return (u, v) => {
    let best = -sv * Infinity;
    for (let o = 0; o < L.length; o += 6) {
      const tu = (u - L[o + ax.u]!) / L[o + 3 + ax.u]!;
      const tv = (v - L[o + ax.v]!) / L[o + 3 + ax.v]!;
      const t = 1 - tu * tu - tv * tv;
      if (t <= 0) continue;
      const d = L[o + ax.tiefe]! + sv * L[o + 3 + ax.tiefe]! * Math.sqrt(t);
      best = sv > 0 ? Math.max(best, d) : Math.min(best, d);
    }
    return best;
  };
}

// Richtungen, in denen geprüft wird, ob ein Ellipsoid in einem anderen liegt: Achsen, Flächen- und Raumdiagonalen
const RICHTUNGEN: readonly (readonly [number, number, number])[] = (() => {
  const r: [number, number, number][] = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        const l = Math.hypot(i, j, k);
        if (l > 0) r.push([i / l, j / l, k / l]);
      }
    }
  }
  return r;
})();

/**
 * Ellipsoide, die (bis auf eine Viertelzelle) ganz in einem größeren liegen, tragen nichts zur Vereinigung bei — benachbarte
 * Kreise einer Zeichnung geben oft fast dasselbe Ellipsoid (an der Kugel dreihundertmal dasselbe).
 */
function beschneiden(L: Float64Array, zelle: number): Float64Array {
  const n = L.length / 6;
  const ord = Array.from({ length: n }, (_, i) => i).sort(
    (p, q) => L[6 * q + 3]! * L[6 * q + 4]! * L[6 * q + 5]! - L[6 * p + 3]! * L[6 * p + 4]! * L[6 * p + 5]!,
  );
  const tol = 0.25 * zelle;
  const behalten: number[] = [];
  for (const i of ord) {
    const o = 6 * i;
    let drin = false;
    for (const j of behalten) {
      const u = 6 * j;
      // Hüllquader zuerst
      let quader = true;
      for (let k = 0; k < 3 && quader; k++) {
        if (L[o + k]! - L[o + 3 + k]! < L[u + k]! - L[u + 3 + k]! - tol) quader = false;
        else if (L[o + k]! + L[o + 3 + k]! > L[u + k]! + L[u + 3 + k]! + tol) quader = false;
      }
      if (!quader) continue;
      drin = true;
      for (const d of RICHTUNGEN) {
        const x = L[o]! + L[o + 3]! * d[0];
        const y = L[o + 1]! + L[o + 4]! * d[1];
        const z = L[o + 2]! + L[o + 5]! * d[2];
        if (abstandZu(L, j, x, y, z) < -tol) {
          drin = false;
          break;
        }
      }
      if (drin) break;
    }
    if (!drin) behalten.push(i);
  }
  const aus = new Float64Array(6 * behalten.length);
  behalten.forEach((i, k) => aus.set(L.subarray(6 * i, 6 * i + 6), 6 * k));
  return aus;
}

/** Vorzeichenbehafteter Abstand (genähert, innen positiv) eines Punkts zum Ellipsoid e. */
function abstandZu(L: Float64Array, e: number, x: number, y: number, z: number): number {
  const o = 6 * e;
  const ax = L[o + 3]!;
  const ay = L[o + 4]!;
  const az = L[o + 5]!;
  const qx = (x - L[o]!) / ax;
  const qy = (y - L[o + 1]!) / ay;
  const qz = (z - L[o + 2]!) / az;
  const gx = qx / ax;
  const gy = qy / ay;
  const gz = qz / az;
  const g = 2 * Math.sqrt(gx * gx + gy * gy + gz * gz);
  const gMin = 0.5 / Math.max(ax, ay, az);
  return (1 - qx * qx - qy * qy - qz * qz) / Math.max(g, gMin);
}

/** Körper aus allen drei Ansichten, keine bevorzugt. */
export function formAusAnsichten(z: Zeichnungen, opt: GleichOptionen = {}): GleichesNetz {
  const zelle = rasterweite(z.seite, opt);
  const liste = new Liste();
  const { ellipsoide, umrisse } = ellipsoideAus(z, zelle, opt, liste);
  const L = beschneiden(new Float64Array(liste.w), zelle);
  const { positionen, normalen, indizes } = vernetzen(L, zelle);
  return { positionen, normalen, indizes, zelle, ellipsoide, umrisse, liste: L };
}

/**
 * Teile (Form zuerst, 05.11.): Jedes Teil bekommt seine Ellipsoide nur aus seinen eigenen Zeichnungen (Seite, Front, Top), und
 * alle zusammen werden ein Netz. So verschmilzt ein Kopf, der über dem Bauch hängt oder auf ihm liegt, nicht mit ihm: Die
 * größten Kreise eines Umrisses reichen nie über einen anderen; wo Teile ineinander stecken, ist das innere verdeckt.
 * `umrisse` gilt für alle Teile zusammen (die Flächen in der Reihenfolge der Teile).
 */
export function formAusTeilen(teile: readonly Zeichnungen[], opt: GleichOptionen = {}): GleichesNetz {
  const zelle = rasterweite(
    teile.flatMap((t) => t.seite),
    opt,
  );
  const liste = new Liste();
  const ellipsoide: Record<AnsichtName, number> = { seite: 0, front: 0, top: 0 };
  const umrisse: Record<AnsichtName, V2[][]> = { seite: [], front: [], top: [] };
  for (const t of teile) {
    const e = ellipsoideAus(t, zelle, opt, liste);
    for (const name of NAMEN) {
      ellipsoide[name] += e.ellipsoide[name];
      umrisse[name].push(...e.umrisse[name]);
    }
  }
  const L = beschneiden(new Float64Array(liste.w), zelle);
  const { positionen, normalen, indizes } = vernetzen(L, zelle);
  return { positionen, normalen, indizes, zelle, ellipsoide, umrisse, liste: L };
}

/** Die Ellipsoide eines Körpers aus seinen Zeichnungen (in `liste`), samt seinen abgetasteten Flächen. */
function ellipsoideAus(
  z: Zeichnungen,
  zelle: number,
  opt: GleichOptionen,
  liste: Liste,
): { ellipsoide: Record<AnsichtName, number>; umrisse: Record<AnsichtName, V2[][]> } {
  const umrisse: Record<AnsichtName, V2[][]> = { seite: [], front: [], top: [] };
  const schnitte: Record<AnsichtName, Schnitte | null> = { seite: null, front: null, top: null };
  for (const name of NAMEN) {
    const zeichnung = name === 'seite' ? z.seite : z[name];
    if (!zeichnung || zeichnung.length === 0) continue;
    umrisse[name] = zeichnung.filter((p) => p.length >= 3).map((p) => umrissAbtasten(p, zelle / 2).punkte);
    if (umrisse[name].length > 0) schnitte[name] = new Schnitte(umrisse[name], zelle / 4);
  }
  const ellipsoide: Record<AnsichtName, number> = { seite: 0, front: 0, top: 0 };
  for (const name of NAMEN) {
    if (schnitte[name]) ellipsoide[name] = ellipsoideVon(name, umrisse[name], schnitte, zelle, liste, null, opt.fuehrend === name);
  }
  // innere Konturen: vor den Körper, der aus allen äußeren Umrissen steht
  const fest = new Float64Array(liste.w);
  for (const name of NAMEN) {
    if (!schnitte[name] || umrisse[name].length < 2) continue;
    ellipsoide[name] += ellipsoideVon(name, umrisse[name], schnitte, zelle, liste, vorderste(fest, name));
  }
  return { ellipsoide, umrisse };
}

/** Eimer über (x, y): je Eimer die Ellipsoide, deren Grundriss (mit Rand) ihn berührt. */
class Eimer {
  readonly x0: number;
  readonly y0: number;
  readonly e: number;
  readonly nx: number;
  readonly ny: number;
  private readonly start: Int32Array;
  private readonly liste: Int32Array;

  constructor(L: Float64Array, x0: number, y0: number, x1: number, y1: number, e: number, rand: number) {
    this.x0 = x0;
    this.y0 = y0;
    this.e = e;
    this.nx = Math.max(1, Math.ceil((x1 - x0) / e) + 1);
    this.ny = Math.max(1, Math.ceil((y1 - y0) / e) + 1);
    const zaehler = new Int32Array(this.nx * this.ny + 1);
    const n = L.length / 6;
    const bereich = (k: number): [number, number, number, number] => {
      const o = 6 * k;
      return [
        this.ix(L[o]! - L[o + 3]! - rand),
        this.ix(L[o]! + L[o + 3]! + rand),
        this.iy(L[o + 1]! - L[o + 4]! - rand),
        this.iy(L[o + 1]! + L[o + 4]! + rand),
      ];
    };
    for (let k = 0; k < n; k++) {
      const [i0, i1, j0, j1] = bereich(k);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) zaehler[j * this.nx + i + 1]!++;
    }
    for (let q = 1; q < zaehler.length; q++) zaehler[q] = zaehler[q]! + zaehler[q - 1]!;
    this.start = zaehler.slice();
    this.liste = new Int32Array(zaehler[zaehler.length - 1]!);
    const lauf = zaehler.slice(0, -1);
    for (let k = 0; k < n; k++) {
      const [i0, i1, j0, j1] = bereich(k);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const b = j * this.nx + i;
          this.liste[lauf[b]!++] = k;
        }
      }
    }
  }

  ix(x: number): number {
    return Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.x0) / this.e)));
  }

  iy(y: number): number {
    return Math.max(0, Math.min(this.ny - 1, Math.floor((y - this.y0) / this.e)));
  }

  /** Ellipsoide im Eimer von (x, y) als [Anfang, Ende) in `inhalt` */
  bei(x: number, y: number): [number, number] {
    const b = this.iy(y) * this.nx + this.ix(x);
    return [this.start[b]!, this.start[b + 1]!];
  }

  get inhalt(): Int32Array {
    return this.liste;
  }
}

/** Surface Nets über der Vereinigung der Ellipsoide; Punkte danach auf das Ellipsoid, das dort am weitesten reicht. */
function vernetzen(L: Float64Array, e: number): { positionen: Float32Array; normalen: Float32Array; indizes: Uint32Array } {
  const n = L.length / 6;
  if (n === 0) return { positionen: new Float32Array(0), normalen: new Float32Array(0), indizes: new Uint32Array(0) };
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  let zMax = 0;
  for (let k = 0; k < n; k++) {
    const o = 6 * k;
    xMin = Math.min(xMin, L[o]! - L[o + 3]!);
    xMax = Math.max(xMax, L[o]! + L[o + 3]!);
    yMin = Math.min(yMin, L[o + 1]! - L[o + 4]!);
    yMax = Math.max(yMax, L[o + 1]! + L[o + 4]!);
    zMax = Math.max(zMax, Math.abs(L[o + 2]!) + L[o + 5]!);
  }
  const rand = 2 * e;
  const x0 = xMin - rand;
  const y0 = yMin - rand;
  const nx = Math.ceil((xMax - xMin + 2 * rand) / e) + 1;
  const ny = Math.ceil((yMax - yMin + 2 * rand) / e) + 1;
  const nz = 2 * Math.ceil((zMax + rand) / e) + 2;
  const kc = (nz - 1) / 2;
  const zk = (k: number) => (k - kc) * e;
  const eimer = new Eimer(L, x0, y0, x0 + (nx - 1) * e, y0 + (ny - 1) * e, 4 * e, 2 * e);
  const inhalt = eimer.inhalt;

  // 1. je Spalte (x, y) die Vereinigung der Abschnitte in z
  const spalten: Float64Array[] = new Array(nx * ny);
  const ab: number[] = [];
  const ord: number[] = [];
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * e;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * e;
      const [s0, s1] = eimer.bei(x, y);
      ab.length = 0;
      for (let q = s0; q < s1; q++) {
        const o = 6 * inhalt[q]!;
        const tx = (x - L[o]!) / L[o + 3]!;
        const ty = (y - L[o + 1]!) / L[o + 4]!;
        const t = 1 - tx * tx - ty * ty;
        if (t <= 0) continue;
        const h = L[o + 5]! * Math.sqrt(t);
        ab.push(L[o + 2]! - h, L[o + 2]! + h);
      }
      if (ab.length === 0) {
        spalten[j * nx + i] = LEER;
        continue;
      }
      ord.length = 0;
      for (let q = 0; q < ab.length / 2; q++) ord.push(q);
      ord.sort((p, q) => ab[2 * p]! - ab[2 * q]!);
      const aus: number[] = [];
      for (const q of ord) {
        const lo = ab[2 * q]!;
        const hi = ab[2 * q + 1]!;
        if (aus.length > 0 && lo <= aus[aus.length - 1]!) aus[aus.length - 1] = Math.max(aus[aus.length - 1]!, hi);
        else aus.push(lo, hi);
      }
      spalten[j * nx + i] = new Float64Array(aus);
    }
  }

  // 2. Feld: Vorzeichen aus den Abschnitten, nahe den Enden (auch der Nachbarspalten) der genäherte Abstand
  const BIG = 1e6;
  const F = new Float32Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  const gerechnet = new Uint8Array(nz);
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * e;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * e;
      const sp = spalten[j * nx + i]!;
      let q = 0;
      for (let k = 0; k < nz; k++) {
        const z = zk(k);
        while (q < sp.length && sp[q + 1]! < z) q += 2;
        F[idx(i, j, k)] = q < sp.length && sp[q]! <= z ? BIG : -BIG;
      }
      gerechnet.fill(0);
      let irgendwo = false;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
          const nb = spalten[jj * nx + ii]!;
          for (let r = 0; r < nb.length; r++) {
            const kk = nb[r]! / e + kc;
            const k0 = Math.max(0, Math.floor(kk - 2.5));
            const k1 = Math.min(nz - 1, Math.ceil(kk + 2.5));
            for (let k = k0; k <= k1; k++) gerechnet[k] = 1;
            irgendwo = true;
          }
        }
      }
      if (!irgendwo) continue;
      const [s0, s1] = eimer.bei(x, y);
      for (let k = 0; k < nz; k++) {
        if (!gerechnet[k]) continue;
        const z = zk(k);
        let best = -Infinity;
        for (let s = s0; s < s1; s++) {
          const kk = inhalt[s]!;
          const o = 6 * kk;
          if (Math.abs(z - L[o + 2]!) > L[o + 5]! + 3 * e) continue;
          const d = abstandZu(L, kk, x, y, z);
          if (d > best) best = d;
        }
        // das Vorzeichen bleibt das genaue aus den Abschnitten
        const v = F[idx(i, j, k)]!;
        if (best === -Infinity) continue;
        F[idx(i, j, k)] = v > 0 ? Math.max(best, 1e-4 * e) : Math.min(best, -1e-4 * e);
      }
    }
  }

  // 3. Surface Nets
  const ECKEN = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ] as const;
  const KANTEN = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ] as const;
  const punktVon = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const zid = (i: number, j: number, k: number) => (k * (ny - 1) + j) * (nx - 1) + i;
  const pos: number[] = [];
  const zellen: number[] = [];
  const ecke = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let neg = 0;
        for (let c = 0; c < 8; c++) {
          const w = ECKEN[c]!;
          const f = F[idx(i + w[0], j + w[1], k + w[2])]!;
          ecke[c] = f;
          if (f < 0) neg++;
        }
        if (neg === 0 || neg === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let m = 0;
        for (const [p, q] of KANTEN) {
          const fa = ecke[p]!;
          const fb = ecke[q]!;
          if (fa < 0 === fb < 0) continue;
          const t = fa / (fa - fb);
          const ea = ECKEN[p]!;
          const eb = ECKEN[q]!;
          sx += ea[0] + t * (eb[0] - ea[0]);
          sy += ea[1] + t * (eb[1] - ea[1]);
          sz += ea[2] + t * (eb[2] - ea[2]);
          m++;
        }
        punktVon[zid(i, j, k)] = pos.length / 3;
        pos.push(x0 + (i + sx / m) * e, y0 + (j + sy / m) * e, zk(k) + (sz / m) * e);
        zellen.push(i, j, k);
      }
    }
  }
  const ind: number[] = [];
  const viereck = (a: number, b: number, c: number, d: number) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const dist = (u: number, v: number) => Math.hypot(pos[3 * u]! - pos[3 * v]!, pos[3 * u + 1]! - pos[3 * v + 1]!, pos[3 * u + 2]! - pos[3 * v + 2]!);
    if (dist(a, c) <= dist(b, d)) ind.push(a, b, c, a, c, d);
    else ind.push(a, b, d, b, c, d);
  };
  const p = (i: number, j: number, k: number) => (i < 0 || j < 0 || k < 0 ? -1 : punktVon[zid(i, j, k)]!);
  for (let v = 0; v < zellen.length / 3; v++) {
    const i = zellen[3 * v]!;
    const j = zellen[3 * v + 1]!;
    const k = zellen[3 * v + 2]!;
    const f0 = F[idx(i, j, k)]! < 0;
    if (j >= 1 && k >= 1 && f0 !== F[idx(i + 1, j, k)]! < 0) viereck(p(i, j - 1, k - 1), p(i, j, k - 1), p(i, j, k), p(i, j - 1, k));
    if (i >= 1 && k >= 1 && f0 !== F[idx(i, j + 1, k)]! < 0) viereck(p(i - 1, j, k - 1), p(i, j, k - 1), p(i, j, k), p(i - 1, j, k));
    if (i >= 1 && j >= 1 && f0 !== F[idx(i, j, k + 1)]! < 0) viereck(p(i - 1, j - 1, k), p(i, j - 1, k), p(i, j, k), p(i - 1, j, k));
  }

  // 4. Punkte auf das Ellipsoid, das dort am weitesten reicht; Normale = seine
  const nv = pos.length / 3;
  const positionen = new Float32Array(pos);
  const normalen = new Float32Array(3 * nv);
  for (let v = 0; v < nv; v++) {
    let x = positionen[3 * v]!;
    let y = positionen[3 * v + 1]!;
    let z = positionen[3 * v + 2]!;
    let wahl = -1;
    for (let runde = 0; runde < 3; runde++) {
      const [s0, s1] = eimer.bei(x, y);
      let best = -Infinity;
      let neu = -1;
      for (let s = s0; s < s1; s++) {
        const d = abstandZu(L, inhalt[s]!, x, y, z);
        if (d > best) {
          best = d;
          neu = inhalt[s]!;
        }
      }
      if (neu < 0 || neu === wahl || (wahl >= 0 && best < 0.02 * e)) break;
      wahl = neu;
      const o = 6 * wahl;
      for (let it = 0; it < 4; it++) {
        const qx = (x - L[o]!) / L[o + 3]!;
        const qy = (y - L[o + 1]!) / L[o + 4]!;
        const qz = (z - L[o + 2]!) / L[o + 5]!;
        const f = qx * qx + qy * qy + qz * qz - 1;
        const gx = (2 * qx) / L[o + 3]!;
        const gy = (2 * qy) / L[o + 4]!;
        const gz = (2 * qz) / L[o + 5]!;
        const gg = gx * gx + gy * gy + gz * gz;
        if (gg < 1e-18) break;
        let s = f / gg;
        const schritt = Math.abs(s) * Math.sqrt(gg);
        if (schritt > e) s *= e / schritt;
        x -= s * gx;
        y -= s * gy;
        z -= s * gz;
      }
    }
    if (wahl >= 0) {
      const o = 6 * wahl;
      const gx = (x - L[o]!) / (L[o + 3]! * L[o + 3]!);
      const gy = (y - L[o + 1]!) / (L[o + 4]! * L[o + 4]!);
      const gz = (z - L[o + 2]!) / (L[o + 5]! * L[o + 5]!);
      const l = Math.hypot(gx, gy, gz) || 1;
      normalen[3 * v] = gx / l;
      normalen[3 * v + 1] = gy / l;
      normalen[3 * v + 2] = gz / l;
    }
    positionen[3 * v] = x;
    positionen[3 * v + 1] = y;
    positionen[3 * v + 2] = z;
  }

  // Dreiecke nach außen drehen, Normalen über die Nachbarn mitteln
  const indizes = new Uint32Array(ind);
  for (let t = 0; t < indizes.length; t += 3) {
    const a = indizes[t]!;
    const b = indizes[t + 1]!;
    const c = indizes[t + 2]!;
    const abx = positionen[3 * b]! - positionen[3 * a]!;
    const aby = positionen[3 * b + 1]! - positionen[3 * a + 1]!;
    const abz = positionen[3 * b + 2]! - positionen[3 * a + 2]!;
    const acx = positionen[3 * c]! - positionen[3 * a]!;
    const acy = positionen[3 * c + 1]! - positionen[3 * a + 1]!;
    const acz = positionen[3 * c + 2]! - positionen[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    const sx = normalen[3 * a]! + normalen[3 * b]! + normalen[3 * c]!;
    const sy = normalen[3 * a + 1]! + normalen[3 * b + 1]! + normalen[3 * c + 1]!;
    const sz = normalen[3 * a + 2]! + normalen[3 * b + 2]! + normalen[3 * c + 2]!;
    if (fx * sx + fy * sy + fz * sz < 0) {
      indizes[t + 1] = c;
      indizes[t + 2] = b;
    }
  }
  normalenMitteln(normalen, indizes, 2);
  return { positionen, normalen, indizes };
}

/** Normalen über die Netznachbarn mitteln (an den Nähten zweier Ellipsoide springt die Normale). */
function normalenMitteln(nor: Float32Array, ind: Uint32Array, durchgaenge: number): void {
  const n = nor.length / 3;
  const summe = new Float32Array(3 * n);
  for (let d = 0; d < durchgaenge; d++) {
    summe.set(nor);
    for (let t = 0; t < ind.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const p = ind[t + e]!;
        const q = ind[t + ((e + 1) % 3)]!;
        for (let i = 0; i < 3; i++) {
          summe[3 * p + i] = summe[3 * p + i]! + nor[3 * q + i]!;
          summe[3 * q + i] = summe[3 * q + i]! + nor[3 * p + i]!;
        }
      }
    }
    for (let v = 0; v < n; v++) {
      const l = Math.hypot(summe[3 * v]!, summe[3 * v + 1]!, summe[3 * v + 2]!) || 1;
      nor[3 * v] = summe[3 * v]! / l;
      nor[3 * v + 1] = summe[3 * v + 1]! / l;
      nor[3 * v + 2] = summe[3 * v + 2]! / l;
    }
  }
}
