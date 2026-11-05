// Form zuerst (04.11.2026): die gezeichnete Linie durch Florians Punkte.
//
// Jeder Punkt ist glatt (die Linie läuft rund hindurch) oder eine Ecke (die Linie knickt dort). Zwischen zwei Punkten liegt
// ein kubisches Stück; die Griffe kommen von selbst aus den Nachbarn. Liegen die Punkte auf einem Kreis, ist die Linie ein
// Kreis: Die Grifflänge ist die eines Kreisbogens mit derselben Sehne und demselben Tangentenwinkel.

import type { V2 } from '../bezier';

/**
 * Ein Punkt des Umrisses. `lippe`: Hier beginnt die Maullinie bzw. Oberlippe (`oben`) oder die Unterlippe (`unten`); der Kiefer
 * ist dort ein echter Punkt des Umrisses (getrennte Kiefer, 05.11.). `richtung`: Die Linie läuft in dieser Richtung durch den
 * Punkt, wohin er auch gezogen wird (die Anfänge getrennter Kiefer: die Richtung beim Trennen).
 */
export type UmrissPunkt = { x: number; y: number; ecke?: boolean; lippe?: 'oben' | 'unten'; richtung?: V2 };

/** Kubische Stücke der geschlossenen Linie durch alle Punkte. */
export function umrissStuecke(p: readonly UmrissPunkt[]): [V2, V2, V2, V2][] {
  return stuecke(p, false);
}

/** Kubische Stücke einer offenen Linie durch die Punkte (an den Enden gerade auf den Nachbarn zu). */
export function linienStuecke(p: readonly UmrissPunkt[]): [V2, V2, V2, V2][] {
  return stuecke(p, true);
}

function stuecke(p: readonly UmrissPunkt[], offen: boolean): [V2, V2, V2, V2][] {
  const n = p.length;
  // Getrennte Kiefer: Ober- und Unterlippe beginnen an zwei benachbarten Punkten. Für die Tangenten gelten sie als ein Punkt
  // (liegen sie aufeinander, ist die Linie genau die mit einem Punkt dort), zwischen ihnen liegt ein gerades Stück, die Front
  // des Mauls.
  const partner = (i: number): number => {
    const l = p[i]!.lippe;
    if (offen || !l || n < 4) return -1;
    for (const j of [(i + 1) % n, (i - 1 + n) % n]) {
      const m = p[j]!.lippe;
      if (m && m !== l) return j;
    }
    return -1;
  };
  const tangente = (i: number): V2 | null => {
    const q = p[i]!;
    if (q.ecke || (offen && (i === 0 || i === n - 1))) return null;
    const pa = partner(i);
    let ia = (i - 1 + n) % n;
    let ib = (i + 1) % n;
    if (ia === pa) ia = (ia - 1 + n) % n;
    if (ib === pa) ib = (ib + 1) % n;
    const a = p[ia]!;
    const b = p[ib]!;
    const r = q.richtung;
    const rl = r ? Math.hypot(r.x, r.y) : 0;
    if (r && rl > 1e-12) {
      // feste Richtung, im Sinn der Nummern
      const s = r.x * (b.x - a.x) + r.y * (b.y - a.y) < 0 ? -1 : 1;
      return { x: (s * r.x) / rl, y: (s * r.y) / rl };
    }
    // Richtung der Parabel durch die drei Punkte nach ihren Abständen (bei gleichen Abständen die von Nachbar zu Nachbar): Ein
    // Punkt dicht neben einem anderen knickt die Linie nicht (die Richtung von Nachbar zu Nachbar drehte dort um bis zu einen
    // halben Bogen weg, 05.11.)
    const ax = q.x - a.x;
    const ay = q.y - a.y;
    const bx = b.x - q.x;
    const by = b.y - q.y;
    const da = Math.hypot(ax, ay);
    const db = Math.hypot(bx, by);
    const tx = da > 1e-9 && db > 1e-9 ? (ax * db) / da + (bx * da) / db : b.x - a.x;
    const ty = da > 1e-9 && db > 1e-9 ? (ay * db) / da + (by * da) / db : b.y - a.y;
    const l = Math.hypot(tx, ty);
    return l > 1e-12 ? { x: tx / l, y: ty / l } : null;
  };
  const griff = (t: V2 | null, sx: number, sy: number, c: number): V2 => {
    if (!t) return { x: sx / 3, y: sy / 3 };
    // Kreisbogen mit Sehne c und Winkel θ zwischen Tangente und Sehne: Griff = 2c / (3 (1 + cos θ))
    const cos = Math.max(0, Math.min(1, (t.x * sx + t.y * sy) / (c || 1)));
    const l = (2 * c) / (3 * (1 + cos));
    return { x: t.x * l, y: t.y * l };
  };
  const out: [V2, V2, V2, V2][] = [];
  for (let i = 0; i < (offen ? n - 1 : n); i++) {
    const a = p[i]!;
    const b = p[(i + 1) % n]!;
    const sx = b.x - a.x;
    const sy = b.y - a.y;
    const c = Math.hypot(sx, sy);
    const front = partner(i) === (i + 1) % n;
    const ga = griff(front ? null : tangente(i), sx, sy, c);
    const gb = griff(front ? null : tangente((i + 1) % n), sx, sy, c);
    out.push([{ x: a.x, y: a.y }, { x: a.x + ga.x, y: a.y + ga.y }, { x: b.x - gb.x, y: b.y - gb.y }, { x: b.x, y: b.y }]);
  }
  return out;
}

export function punktAufStueck(k: readonly [V2, V2, V2, V2], t: number): V2 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * k[0].x + b * k[1].x + c * k[2].x + d * k[3].x, y: a * k[0].y + b * k[1].y + c * k[2].y + d * k[3].y };
}

/**
 * Die Linie als geschlossenes Polygon gegen den Uhrzeigersinn, Punktabstand ≈ s. `ecken[i]` sagt, ob Polygonpunkt i ein
 * Eckpunkt der Zeichnung ist.
 */
export function umrissAbtasten(p: readonly UmrissPunkt[], s: number): { punkte: V2[]; ecken: boolean[] } {
  const punkte: V2[] = [];
  const ecken: boolean[] = [];
  const stuecke = umrissStuecke(p);
  // ein Stück ohne Länge (Ober- und Unterlippe beginnen am selben Punkt) gibt keine Punkte; seine Ecke gilt am nächsten
  let ecke = false;
  stuecke.forEach((k, i) => {
    const grob = Math.hypot(k[1].x - k[0].x, k[1].y - k[0].y) + Math.hypot(k[2].x - k[1].x, k[2].y - k[1].y) + Math.hypot(k[3].x - k[2].x, k[3].y - k[2].y);
    ecke ||= !!p[i]!.ecke;
    if (grob < 1e-9) return;
    const n = Math.max(2, Math.ceil(grob / s));
    for (let j = 0; j < n; j++) {
      punkte.push(punktAufStueck(k, j / n));
      ecken.push(j === 0 && ecke);
    }
    ecke = false;
  });
  let flaeche = 0;
  for (let i = 0; i < punkte.length; i++) {
    const a = punkte[i]!;
    const b = punkte[(i + 1) % punkte.length]!;
    flaeche += a.x * b.y - b.x * a.y;
  }
  if (flaeche < 0) {
    punkte.reverse();
    ecken.reverse();
  }
  return { punkte, ecken };
}

/** Fläche des Polygons (Betrag). */
export function polygonFlaeche(p: readonly V2[]): number {
  let f = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % p.length]!;
    f += a.x * b.y - b.x * a.y;
  }
  return Math.abs(f) / 2;
}
