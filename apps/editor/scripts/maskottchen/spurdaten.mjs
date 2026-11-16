// Gemeinsame Werkzeuge für die Nachzeichnungen: Umrisse dicht abtasten, Punkte suchen, Wege längs eines Umrisses.
import fs from 'node:fs';

const dir = new URL('../../../../docs/look/maskottchen/', import.meta.url);

/** Bézier-Stück dicht abtasten (Schritt etwa `schritt` Bildpunkte) */
function abtasten(c, schritt) {
  const l = Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]) + Math.hypot(c[2][0] - c[1][0], c[2][1] - c[1][1]) + Math.hypot(c[3][0] - c[2][0], c[3][1] - c[2][1]);
  const n = Math.max(2, Math.ceil(l / schritt));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
      u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1],
    ]);
  }
  return out;
}

/** Lädt eine Nachzeichnung (spur*.json) als Liste dichter, geschlossener Polylinien */
export function ladeSpur(name, schritt = 0.75) {
  const spur = JSON.parse(fs.readFileSync(new URL(name, dir), 'utf8'));
  return spur.umrisse.map((u) => u.stuecke.flatMap((c) => abtasten(c, schritt)));
}

/** nächster Punkt auf allen Umrissen: { u, i, p, d } */
export function naechster(umrisse, q) {
  let best = { u: -1, i: -1, p: null, d: Infinity };
  umrisse.forEach((r, u) => {
    for (let i = 0; i < r.length; i++) {
      const d = Math.hypot(r[i][0] - q[0], r[i][1] - q[1]);
      if (d < best.d) best = { u, i, p: r[i], d };
    }
  });
  return best;
}

/** Weg längs eines Umrisses von Index a nach b; Richtung +1/-1 oder über einen Punkt entschieden */
export function wegLaengs(r, a, b, richtung) {
  const n = r.length;
  const out = [];
  let i = a;
  out.push(r[i]);
  while (i !== b) {
    i = (i + richtung + n) % n;
    out.push(r[i]);
    if (out.length > n + 1) throw new Error('Weg findet sein Ende nicht');
  }
  return out;
}

export function laenge(p) {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return s;
}

/** Extrempunkt eines Umrisses in einem Kasten: art = 'oben' | 'unten' | 'links' | 'rechts' */
export function extrem(umrisse, kasten, art) {
  const [x0, y0, x1, y1] = kasten;
  let best = null;
  for (const r of umrisse)
    for (const p of r) {
      if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue;
      const wert = art === 'oben' ? -p[1] : art === 'unten' ? p[1] : art === 'links' ? -p[0] : p[0];
      if (!best || wert > best.w) best = { w: wert, p };
    }
  return best?.p ?? null;
}
