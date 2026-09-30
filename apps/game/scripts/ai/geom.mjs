/**
 * Geometrie-Helfer für den AI-Konverter: Pfade abflachen, Ringe orientieren, Sterne umreißen, Pfade versetzen
 * (Kontur 160 pt mit Gehrung wie Illustrator), Schleifen entfernen, Lichtpunkt aus Schattenstrahlen schätzen.
 * Alle Punkte sind [x, y]-Paare; "Fläche" ist die Shoelace-Summe im jeweiligen Koordinatensystem.
 */

/** Abflachen: Segmente {op:'M'|'L'|'C'|'Z', pts} → Ringe. Kurven bis `tol` (Abstand Sehne ↔ Kurve, grob). */
export function flatten(path, tol = 0.15) {
  const rings = [];
  let ring = null;
  let cur = [0, 0];
  for (const s of path) {
    if (s.op === 'M') {
      if (ring && ring.length > 2) rings.push(ring);
      ring = [s.pts[0]];
      cur = s.pts[0];
    } else if (s.op === 'L') {
      ring.push(s.pts[0]);
      cur = s.pts[0];
    } else if (s.op === 'C') {
      const [p1, p2, p3] = s.pts;
      const p0 = cur;
      const len = dist(p0, p1) + dist(p1, p2) + dist(p2, p3);
      const n = Math.max(1, Math.ceil(Math.sqrt(len / tol) * 0.7));
      for (let i = 1; i <= n; i++) ring.push(bez(p0, p1, p2, p3, i / n));
      cur = p3;
    } else if (s.op === 'Z') {
      if (ring && ring.length > 2) rings.push(ring);
      cur = ring ? ring[0] : cur;
      ring = null;
    }
  }
  if (ring && ring.length > 2) rings.push(ring);
  return rings.map(dedupe);
}

export function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}

export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Doppelte Punkte (auch Anfang = Ende) entfernen. */
export function dedupe(ring) {
  const out = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || dist(last, p) > 1e-6) out.push(p);
  }
  if (out.length > 1 && dist(out[0], out[out.length - 1]) < 1e-6) out.pop();
  return out;
}

export function area(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a[1] > pt[1] !== b[1] > pt[1] && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/**
 * Ringe für die Schattenfläche normieren: Außenringe positive Fläche, Löcher negative (Verschachtelungstiefe
 * gerade = außen). Ergebnis im selben Koordinatensystem.
 */
export function orientRings(rings) {
  return rings.map((r, i) => {
    const probe = r[0];
    let depth = 0;
    rings.forEach((o, j) => {
      if (j !== i && Math.abs(area(o)) > Math.abs(area(r)) && pointInRing(probe, o)) depth++;
    });
    const hole = depth % 2 === 1;
    const a = area(r);
    return (hole ? a > 0 : a < 0) ? [...r].reverse() : r;
  });
}

/** Umriss eines Pentagramms (5 Spitzen, nonzero gefüllt) als 10-Punkt-Stern. */
export function starOutline(ring) {
  if (ring.length !== 5) throw new Error('Stern: 5 Punkte erwartet');
  const c = ring.reduce((s, p) => [s[0] + p[0] / 5, s[1] + p[1] / 5], [0, 0]);
  const tips = [...ring].sort((a, b) => Math.atan2(a[1] - c[1], a[0] - c[0]) - Math.atan2(b[1] - c[1], b[0] - c[0]));
  const out = [];
  for (let i = 0; i < 5; i++) {
    const t0 = tips[i];
    const t1 = tips[(i + 1) % 5];
    // Innenecke zwischen t0 und t1: Schnitt der Kanten t0→t(i+2) und t1→t(i−1)
    const inner = intersect(t0, tips[(i + 2) % 5], t1, tips[(i + 4) % 5]);
    out.push(t0, inner);
  }
  return out;
}

/** Schnittpunkt der Geraden a→b und c→d (null bei Parallelität). */
export function intersect(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

/** Schnitt der Strecken a–b und c–d (Parameter t auf a–b, u auf c–d) oder null. */
export function segHit(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null;
  return { t, u, p: [a[0] + t * r[0], a[1] + t * r[1]] };
}

/**
 * Außenumriss von "Füllung ∪ Kontur (Breite 2·h, Gehrung)" eines einfachen, geschlossenen Rings: jede Kante um h
 * nach außen versetzen, an konvexen Ecken die Gehrung (Schnitt der Versatzlinien, bis Grenze `miter`·h), an
 * konkaven Ecken ebenfalls schneiden; entstehende Schleifen (kurze Kurvenstücke an konkaven Ecken) entfernen.
 */
export function offsetOutline(ring, h, miter = 10) {
  const r = area(ring) > 0 ? ring : [...ring].reverse(); // positiv orientiert
  // Bei positiver Fläche (y nach oben: gegen den Uhrzeigersinn) liegt außen rechts der Laufrichtung.
  const n = r.length;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = r[i];
    const b = r[(i + 1) % n];
    const len = dist(a, b);
    const nx = (b[1] - a[1]) / len;
    const ny = -(b[0] - a[0]) / len;
    lines.push([
      [a[0] + nx * h, a[1] + ny * h],
      [b[0] + nx * h, b[1] + ny * h],
    ]);
  }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const L0 = lines[(i - 1 + n) % n];
    const L1 = lines[i];
    const v = r[i];
    const p = intersect(L0[0], L0[1], L1[0], L1[1]);
    if (!p) {
      pts.push(L1[0]);
      continue;
    }
    const d = dist(p, v);
    if (d > miter * Math.abs(h)) {
      // Gehrung zu lang: abschrägen (wie PDF: Bevel)
      pts.push(L0[1], L1[0]);
    } else pts.push(p);
  }
  return removeLoops(pts);
}

/** Entfernt Selbstschnitt-Schleifen (die kürzere Seite jedes Schnitts fliegt raus). */
export function removeLoops(pts) {
  let ring = pts;
  for (let guard = 0; guard < 200; guard++) {
    const n = ring.length;
    let hit = null;
    outer: for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const h = segHit(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n]);
        if (h) {
          hit = { i, j, p: h.p };
          break outer;
        }
      }
    }
    if (!hit) return ring;
    const { i, j, p } = hit;
    const inner = j - i; // Punkte i+1..j bilden die Schleife
    if (inner <= n - inner) ring = [...ring.slice(0, i + 1), p, ...ring.slice(j + 1)];
    else ring = [p, ...ring.slice(i + 1, j + 1)];
  }
  return ring;
}

/** Ring auf höchstens `step` lange Kanten unterteilen (Ecken bleiben erhalten). */
export function densify(ring, step) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const k = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  return out;
}

/** Ring vereinfachen: Punkte weglassen, solange die Abweichung unter `tol` bleibt (Douglas-Peucker, geschlossen). */
export function simplify(ring, tol) {
  if (ring.length < 8) return ring;
  // am weitesten entfernten Punkt vom Start als zweiten Anker wählen
  let far = 0;
  let best = -1;
  ring.forEach((p, i) => {
    const d = dist(ring[0], p);
    if (d > best) {
      best = d;
      far = i;
    }
  });
  const dp = (pts) => {
    if (pts.length < 3) return pts;
    const a = pts[0];
    const b = pts[pts.length - 1];
    let idx = 0;
    let dmax = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = segDist(pts[i], a, b);
      if (d > dmax) {
        dmax = d;
        idx = i;
      }
    }
    if (dmax <= tol) return [a, b];
    const left = dp(pts.slice(0, idx + 1));
    const right = dp(pts.slice(idx));
    return [...left.slice(0, -1), ...right];
  };
  const first = dp(ring.slice(0, far + 1));
  const second = dp([...ring.slice(far), ring[0]]);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

export function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** Punkt mit kleinster Quadratsumme der Abstände zu Geraden (je Punkt + Richtung). */
export function leastSquaresPoint(lines) {
  let a11 = 0;
  let a12 = 0;
  let a22 = 0;
  let b1 = 0;
  let b2 = 0;
  for (const [p, q] of lines) {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    // (n·x − n·p)² minimieren
    const c = nx * p[0] + ny * p[1];
    a11 += nx * nx;
    a12 += nx * ny;
    a22 += ny * ny;
    b1 += nx * c;
    b2 += ny * c;
  }
  const det = a11 * a22 - a12 * a12;
  return [(a22 * b1 - a12 * b2) / det, (a11 * b2 - a12 * b1) / det];
}

/** Zahl kompakt (höchstens `d` Nachkommastellen, ohne Nullen). */
export function fmt(v, d = 2) {
  const s = v.toFixed(d);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '').replace(/^-0$/, '0') : s;
}

/** SVG-Pfaddaten aus Segmenten (Punkte bereits im Zielraum). */
export function segmentsToD(path, d = 2) {
  let out = '';
  for (const s of path) {
    if (s.op === 'Z') out += 'Z';
    else out += s.op + s.pts.map((p) => `${fmt(p[0], d)} ${fmt(p[1], d)}`).join(' ');
  }
  return out;
}

export function ringsToD(rings, d = 1) {
  return rings.map((r) => 'M' + r.map((p) => `${fmt(p[0], d)} ${fmt(p[1], d)}`).join('L') + 'Z').join('');
}
