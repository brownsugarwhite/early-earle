// Form zuerst (04.11.2026): die gezeichnete Linie durch Florians Punkte.
//
// Jeder Punkt ist glatt (die Linie läuft rund hindurch) oder eine Ecke (die Linie knickt dort). Zwischen zwei Punkten liegt
// ein kubisches Stück; die Griffe kommen von selbst aus den Nachbarn. Liegen die Punkte auf einem Kreis, ist die Linie ein
// Kreis: Die Grifflänge ist die eines Kreisbogens mit derselben Sehne und demselben Tangentenwinkel.

import type { V2 } from '../bezier';

/** Ein Punkt des Umrisses. */
export type UmrissPunkt = { x: number; y: number; ecke?: boolean };

/** Kubische Stücke der geschlossenen Linie durch alle Punkte. */
export function umrissStuecke(p: readonly UmrissPunkt[]): [V2, V2, V2, V2][] {
  const n = p.length;
  const tangente = (i: number): V2 | null => {
    const q = p[i]!;
    if (q.ecke) return null;
    const a = p[(i - 1 + n) % n]!;
    const b = p[(i + 1) % n]!;
    const tx = b.x - a.x;
    const ty = b.y - a.y;
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
  for (let i = 0; i < n; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % n]!;
    const sx = b.x - a.x;
    const sy = b.y - a.y;
    const c = Math.hypot(sx, sy);
    const ga = griff(tangente(i), sx, sy, c);
    const tb = tangente((i + 1) % n);
    const gb = griff(tb, sx, sy, c);
    out.push([{ x: a.x, y: a.y }, { x: a.x + ga.x, y: a.y + ga.y }, { x: b.x - gb.x, y: b.y - gb.y }, { x: b.x, y: b.y }]);
  }
  return out;
}

function punktAufStueck(k: readonly [V2, V2, V2, V2], t: number): V2 {
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
  stuecke.forEach((k, i) => {
    const grob = Math.hypot(k[1].x - k[0].x, k[1].y - k[0].y) + Math.hypot(k[2].x - k[1].x, k[2].y - k[1].y) + Math.hypot(k[3].x - k[2].x, k[3].y - k[2].y);
    const n = Math.max(2, Math.ceil(grob / s));
    for (let j = 0; j < n; j++) {
      punkte.push(punktAufStueck(k, j / n));
      ecken.push(j === 0 && !!p[i]!.ecke);
    }
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
