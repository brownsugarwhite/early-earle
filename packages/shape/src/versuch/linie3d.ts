// VERSUCH (12.10.2026): 3D-Linien für Maul (später Kanten, Augen) wie in Florians Bögen: Jeder Knoten ist ein 3D-Punkt,
// jede Ansicht zeigt und bearbeitet zwei seiner Koordinaten (Seite x/y, Front z/y, Top x/z). Die gemeinsame Koordinate
// ist damit automatisch gekoppelt, die Linie erscheint in allen Ansichten.

import type { V2 } from '../bezier';
import type { Ansicht, Knoten3, Linie3, V3T } from '../dokument';
import { type Profil, pfadAbtasten, vollerPfad } from '../profil';

/** Weltkoordinaten (Index) je Ansicht: [waagerecht, senkrecht]. */
export const ANSICHT_ACHSEN: Record<Ansicht, [0 | 1 | 2, 0 | 1 | 2]> = { seite: [0, 1], front: [2, 1], top: [0, 2] };

export const inAnsicht2 = (p: V3T, a: Ansicht): V2 => ({ x: p[ANSICHT_ACHSEN[a][0]], y: p[ANSICHT_ACHSEN[a][1]] });

/** Ersetzt die zwei sichtbaren Koordinaten, die dritte bleibt. */
export function ausAnsicht2(p: V3T, a: Ansicht, q: V2): V3T {
  const out: V3T = [...p];
  out[ANSICHT_ACHSEN[a][0]] = q.x;
  out[ANSICHT_ACHSEN[a][1]] = q.y;
  return out;
}

const plus = (a: V3T, b: V3T): V3T => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const minus = (a: V3T, b: V3T): V3T => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mal = (a: V3T, s: number): V3T => [a[0] * s, a[1] * s, a[2] * s];
const lerp = (a: V3T, b: V3T, t: number): V3T => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export type Kubik3 = [V3T, V3T, V3T, V3T];

export function segmente3(l: Linie3): Kubik3[] {
  const out: Kubik3[] = [];
  for (let i = 0; i < l.knoten.length - 1; i++) {
    const a = l.knoten[i]!;
    const b = l.knoten[i + 1]!;
    out.push([a.p, plus(a.p, a.aus), plus(b.p, b.ein), b.p]);
  }
  return out;
}

export function punktAuf3(k: Kubik3, t: number): V3T {
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return [0, 1, 2].map((i) => a * k[0][i]! + b * k[1][i]! + c * k[2][i]! + d * k[3][i]!) as V3T;
}

/** Dichte Punktfolge der Linie (proSegment Teilstücke je Segment). */
export function abtasten3(l: Linie3, proSegment = 16): V3T[] {
  const out: V3T[] = [];
  segmente3(l).forEach((k, si) => {
    for (let j = si === 0 ? 0 : 1; j <= proSegment; j++) out.push(punktAuf3(k, j / proSegment));
  });
  return out;
}

/** Linie durch Punkte mit glatten Griffen (Catmull-Rom-Tangenten / 3), Start auf der Mittelebene. */
export function linieDurch(pts: readonly V3T[]): Linie3 {
  const n = pts.length;
  const knoten: Knoten3[] = pts.map((p, i) => {
    const vor = pts[Math.max(0, i - 1)]!;
    const nach = pts[Math.min(n - 1, i + 1)]!;
    let tang = mal(minus(nach, vor), 1 / 6);
    // Start: Griff quer zur Mittelebene (z = 0), damit die gespiegelte Linie glatt durchläuft
    if (i === 0) tang = [tang[0], tang[1], Math.max(0, tang[2])];
    return { p: [...p] as V3T, ein: i === 0 ? [0, 0, 0] : mal(tang, -1), aus: i === n - 1 ? [0, 0, 0] : tang, art: 'glatt' };
  });
  if (knoten[0]) knoten[0].p = [knoten[0].p[0], knoten[0].p[1], 0];
  return { knoten };
}

/** Glatte Linie durch Punkte ohne Bindung an die Mittelebene (Kantenlinien, Versuch 12.10. mittags). */
export function glatteLinie(pts: readonly V3T[]): Linie3 {
  const n = pts.length;
  return {
    knoten: pts.map((p, i) => {
      const tang = mal(minus(pts[Math.min(n - 1, i + 1)]!, pts[Math.max(0, i - 1)]!), 1 / 6);
      return { p: [...p] as V3T, ein: i === 0 ? [0, 0, 0] : mal(tang, -1), aus: i === n - 1 ? [0, 0, 0] : tang, art: 'glatt' };
    }),
  };
}

/** Knoten in einer Ansicht verschieben (zwei Koordinaten); Startknoten bleibt auf z = 0. */
export function knotenZiehen3(l: Linie3, i: number, a: Ansicht, q: V2): Linie3 {
  const knoten = l.knoten.map((k, j) => {
    if (j !== i) return k;
    let p = ausAnsicht2(k.p, a, q);
    if (i === 0) p = [p[0], p[1], 0];
    else p = [p[0], p[1], Math.max(0, p[2])];
    return { ...k, p };
  });
  return { knoten };
}

/** Mehrere Knoten um einen Versatz in einer Ansicht verschieben. */
export function knotenVerschieben3(l: Linie3, indizes: readonly number[], a: Ansicht, d: V2): Linie3 {
  return {
    knoten: l.knoten.map((k, j) => {
      if (!indizes.includes(j)) return k;
      const v = inAnsicht2(k.p, a);
      let p = ausAnsicht2(k.p, a, { x: v.x + d.x, y: v.y + d.y });
      p = j === 0 ? [p[0], p[1], 0] : [p[0], p[1], Math.max(0, p[2])];
      return { ...k, p };
    }),
  };
}

/** Griff in einer Ansicht ziehen: zwei Komponenten des Griffs; glatte Knoten halten den Gegengriff in Linie. */
export function griffZiehen3(l: Linie3, i: number, seite: 'ein' | 'aus', a: Ansicht, q: V2, brechen: boolean): Linie3 {
  const k = l.knoten[i]!;
  const v = ausAnsicht2(plus(k.p, k[seite]), a, q);
  const neu = minus(v, k.p);
  const gegen = seite === 'ein' ? 'aus' : 'ein';
  const knoten = l.knoten.slice();
  const lg = Math.hypot(...k[gegen]);
  const ln = Math.hypot(...neu);
  const g: V3T = brechen || k.art === 'ecke' || ln < 1e-9 ? k[gegen] : mal(neu, -lg / ln);
  knoten[i] = { ...k, [seite]: neu, [gegen]: g, art: brechen ? 'ecke' : k.art } as Knoten3;
  return { knoten };
}

/** Nächster Punkt auf der Linie in einer Ansicht (2D-Abstand): Segment, Parameter, Abstand. */
export function naechsterInAnsicht(l: Linie3, a: Ansicht, q: V2): { segment: number; t: number; abstand: number } | null {
  let best: { segment: number; t: number; abstand: number } | null = null;
  segmente3(l).forEach((k, s) => {
    for (let j = 0; j <= 48; j++) {
      const t = j / 48;
      const p = inAnsicht2(punktAuf3(k, t), a);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (!best || d < best.abstand) best = { segment: s, t, abstand: d };
    }
  });
  return best;
}

/** Knoten formtreu einfügen (De Casteljau in 3D). */
export function einfuegen3(l: Linie3, s: number, t: number): { linie: Linie3; index: number } {
  const k = segmente3(l)[s]!;
  const [p0, p1, p2, p3] = k;
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const m = lerp(d, e, t);
  const knoten = l.knoten.slice();
  knoten[s] = { ...knoten[s]!, aus: minus(a, p0) };
  knoten[s + 1] = { ...knoten[s + 1]!, ein: minus(c, p3) };
  knoten.splice(s + 1, 0, { p: m, ein: minus(d, m), aus: minus(e, m), art: 'glatt' });
  return { linie: { knoten }, index: s + 1 };
}

/** Knoten löschen (Start und Mundwinkel bleiben, mindestens zwei Knoten). */
export function loeschen3(l: Linie3, i: number): Linie3 {
  if (i <= 0 || i >= l.knoten.length - 1 || l.knoten.length <= 2) return l;
  const knoten = l.knoten.slice();
  knoten.splice(i, 1);
  return { knoten };
}

/** Linie um ein Stück in y verschoben (für „Kiefer getrennt“: Unterlippe leicht unter der Oberlippe). */
export function versetzt3(l: Linie3, dy: number, ab = 0): Linie3 {
  const n = l.knoten.length;
  return {
    knoten: l.knoten.map((k, i) => {
      // zum Mundwinkel hin weniger, damit beide Linien dort zusammenlaufen
      const w = i >= n - 1 ? 0 : 1 - (i / (n - 1)) ** 2;
      return { ...k, p: [k.p[0], k.p[1] + dy * w * (i >= ab ? 1 : 1), k.p[2]] as V3T };
    }),
  };
}

/** Drehung einer Linie um eine Achse parallel zu z durch (cx, cy) (Vorschlag für den offenen Zustand). */
export function gedreht3(l: Linie3, cx: number, cy: number, winkel: number): Linie3 {
  const c = Math.cos(winkel);
  const s = Math.sin(winkel);
  const dreh = (p: V3T): V3T => [cx + (p[0] - cx) * c - (p[1] - cy) * s, cy + (p[0] - cx) * s + (p[1] - cy) * c, p[2]];
  const drehV = (v: V3T): V3T => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  return { knoten: l.knoten.map((k) => ({ ...k, p: dreh(k.p), ein: drehV(k.ein), aus: drehV(k.aus) })) };
}

/**
 * Vorschlag für den offenen Zustand: Oberlippe bleibt, Unterlippe dreht 30° um den Mundwinkel. Der Mundwinkel bleibt
 * dabei ein gemeinsamer Punkt beider Kiefer (Florian 12.10.: „Die Kiefer müssen am schwarzen Punkt immer zusammenhängen“).
 */
export function offenVorschlag(zu: { oben: Linie3; unten?: Linie3 }, winkelGrad = 30): { oben: Linie3; unten: Linie3 } {
  const unten = zu.unten ?? zu.oben;
  const ecke = zu.oben.knoten[zu.oben.knoten.length - 1]!.p;
  // vorn ist −x: Kinn nach unten = Drehung im Uhrzeigersinn in der Seitenansicht (positiver Winkel bei x-Achse nach hinten)
  const gedreht = gedreht3(unten, ecke[0], ecke[1], (winkelGrad * Math.PI) / 180);
  return mundwinkelVerbinden({ oben: zu.oben, unten: gedreht }) as { oben: Linie3; unten: Linie3 };
}

const gleich3 = (a: V3T, b: V3T) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/**
 * Ober- und Unterlinie teilen den Mundwinkel (letzter Knoten): Lage gemeinsam, Griffe je Linie. Hat sich gegenüber
 * `vorher` nur der Mundwinkel der Unterlinie bewegt, folgt die Oberlinie; sonst gilt der Mundwinkel der Oberlinie.
 */
export function mundwinkelVerbinden<L extends { oben: Linie3; unten?: Linie3 }>(l: L, vorher?: { oben: Linie3; unten?: Linie3 } | null): L {
  if (!l.unten) return l;
  const o = l.oben.knoten.length - 1;
  const u = l.unten.knoten.length - 1;
  const po = l.oben.knoten[o]!.p;
  const pu = l.unten.knoten[u]!.p;
  if (gleich3(po, pu)) return l;
  const vo = vorher?.oben.knoten[vorher.oben.knoten.length - 1]?.p;
  const untenGezogen = !!vorher?.unten && !!vo && gleich3(vo, po);
  if (untenGezogen) return { ...l, oben: { knoten: l.oben.knoten.map((k, i) => (i === o ? { ...k, p: [...pu] as V3T } : k)) } };
  return { ...l, unten: { knoten: l.unten.knoten.map((k, i) => (i === u ? { ...k, p: [...po] as V3T } : k)) } };
}

/** Eingabe für den Maul-Käfig aus den 3D-Linien eines Dokuments. */
export function maulEingabeAus(maul: { zu: { oben: Linie3; unten?: Linie3 }; auf?: { oben: Linie3; unten?: Linie3 } }): {
  zu: { oben: V3T[]; unten?: V3T[] };
  auf: { oben: V3T[]; unten: V3T[] };
} {
  const zu = mundwinkelVerbinden(maul.zu);
  const auf = mundwinkelVerbinden(maul.auf ?? offenVorschlag(zu));
  return {
    zu: zu.unten ? { oben: abtasten3(zu.oben, 6), unten: abtasten3(zu.unten, 6) } : { oben: abtasten3(zu.oben, 6) },
    auf: { oben: abtasten3(auf.oben, 6), unten: abtasten3(auf.unten ?? auf.oben, 6) },
  };
}

/** Nächster Punkt eines geschlossenen Polygonzugs (Seitenkontur) zu q. */
function naechsterAufZug(zug: readonly V2[], q: V2): { p: V2; d: number } {
  let best = { p: zug[0] ?? q, d: Infinity };
  for (let i = 0; i < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % zug.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0;
    const p = { x: a.x + dx * t, y: a.y + dy * t };
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best.d) best = { p, d };
  }
  return best;
}

/**
 * Maul an der Form festhalten (Florian 12.10.: Kiefer und Shape sind ein Objekt): Liegt der Start einer geschlossenen
 * Lippenlinie auf der alten Seitenkontur (≤ `toleranz`), wandert er mit der Kontur; der offene Start derselben Linie
 * bekommt dieselbe Verschiebung. Verdeckte Starts im Inneren (Überbiss) bleiben.
 */
export function maulAnKontur<M extends { zu: { oben: Linie3; unten?: Linie3 }; auf?: { oben: Linie3; unten?: Linie3 } }>(
  maul: M,
  alt: Profil,
  neu: Profil,
  toleranz = 3 / 461,
): M {
  if (alt === neu) return maul;
  const zugAlt = pfadAbtasten(vollerPfad(alt), 32);
  const zugNeu = pfadAbtasten(vollerPfad(neu), 32);
  const versatz = (l: Linie3): V3T | null => {
    const p = l.knoten[0]!.p;
    // Maulanfang auf einem Umrissknoten (Florian 12.10. abends: gemeinsamer Punkt): genau mit dem Knoten gehen
    if (alt.knoten.length === neu.knoten.length) {
      const i = alt.knoten.findIndex((k) => Math.hypot(k.p.x - p[0], k.p.y - p[1]) <= 0.5 / 461);
      if (i >= 0) {
        const d: V3T = [neu.knoten[i]!.p.x - p[0], neu.knoten[i]!.p.y - p[1], 0];
        return Math.hypot(d[0], d[1]) < 1e-12 ? null : d;
      }
    }
    const vorher = naechsterAufZug(zugAlt, { x: p[0], y: p[1] });
    if (vorher.d > toleranz) return null;
    const jetzt = naechsterAufZug(zugNeu, { x: p[0], y: p[1] }).p;
    const d: V3T = [jetzt.x - p[0], jetzt.y - p[1], 0];
    return Math.hypot(d[0], d[1]) < 1e-12 ? null : d;
  };
  const schieben = (l: Linie3, d: V3T): Linie3 => ({ knoten: l.knoten.map((k, i) => (i === 0 ? { ...k, p: [k.p[0] + d[0], k.p[1] + d[1], 0] as V3T } : k)) });
  const dOben = versatz(maul.zu.oben);
  const dUnten = maul.zu.unten ? versatz(maul.zu.unten) : null;
  if (!dOben && !dUnten) return maul;
  const zu = { ...maul.zu, oben: dOben ? schieben(maul.zu.oben, dOben) : maul.zu.oben };
  if (maul.zu.unten) zu.unten = dUnten ? schieben(maul.zu.unten, dUnten) : maul.zu.unten;
  const out = { ...maul, zu };
  if (maul.auf) {
    const auf = { ...maul.auf, oben: dOben ? schieben(maul.auf.oben, dOben) : maul.auf.oben };
    const dU = maul.zu.unten ? dUnten : dOben;
    if (maul.auf.unten) auf.unten = dU ? schieben(maul.auf.unten, dU) : maul.auf.unten;
    out.auf = auf;
  }
  return out;
}
