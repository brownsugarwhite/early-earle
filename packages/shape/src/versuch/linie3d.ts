// VERSUCH (12.10.2026): 3D-Linien für Maul (später Kanten, Augen) wie in Florians Bögen: Jeder Knoten ist ein 3D-Punkt,
// jede Ansicht zeigt und bearbeitet zwei seiner Koordinaten (Seite x/y, Front z/y, Top x/z). Die gemeinsame Koordinate
// ist damit automatisch gekoppelt, die Linie erscheint in allen Ansichten.

import type { V2 } from '../bezier';
import type { Ansicht, Knoten3, Linie3, V3T } from '../dokument';

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

/** Vorschlag für den offenen Zustand: Oberlippe bleibt, Unterlippe dreht 30° um ein Gelenk knapp hinter dem Mundwinkel. */
export function offenVorschlag(zu: { oben: Linie3; unten?: Linie3 }, winkelGrad = 30): { oben: Linie3; unten: Linie3 } {
  const unten = zu.unten ?? zu.oben;
  const ecke = unten.knoten[unten.knoten.length - 1]!.p;
  const start = unten.knoten[0]!.p;
  const laenge = Math.hypot(ecke[0] - start[0], ecke[1] - start[1]);
  // vorn ist −x: Kinn nach unten = Drehung im Uhrzeigersinn in der Seitenansicht (positiver Winkel bei x-Achse nach hinten)
  const gedreht = gedreht3(unten, ecke[0] + 0.15 * laenge, ecke[1], (winkelGrad * Math.PI) / 180);
  return { oben: zu.oben, unten: gedreht };
}

/** Eingabe für den Maul-Käfig aus den 3D-Linien eines Dokuments. */
export function maulEingabeAus(maul: { zu: { oben: Linie3; unten?: Linie3 }; auf?: { oben: Linie3; unten?: Linie3 } }): {
  zu: { oben: V3T[]; unten?: V3T[] };
  auf: { oben: V3T[]; unten: V3T[] };
} {
  const auf = maul.auf ?? offenVorschlag(maul.zu);
  return {
    zu: maul.zu.unten ? { oben: abtasten3(maul.zu.oben, 6), unten: abtasten3(maul.zu.unten, 6) } : { oben: abtasten3(maul.zu.oben, 6) },
    auf: { oben: abtasten3(auf.oben, 6), unten: abtasten3(auf.unten ?? auf.oben, 6) },
  };
}
