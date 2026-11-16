// Kubische Bézier-Stücke an eine dichte Polylinie anpassen, mit vorgegebenen Tangentenrichtungen an den Enden
// (Schneider, Graphics Gems 1990: kleinste Quadrate für die Grifflängen, Newton für die Parameter).
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
export const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
const bez = (c, t) => {
  const u = 1 - t;
  return add(add(mul(c[0], u * u * u), mul(c[1], 3 * u * u * t)), add(mul(c[2], 3 * u * t * t), mul(c[3], t * t * t)));
};
const bez1 = (c, t) => {
  const u = 1 - t;
  return add(add(mul(sub(c[1], c[0]), 3 * u * u), mul(sub(c[2], c[1]), 6 * u * t)), mul(sub(c[3], c[2]), 3 * t * t));
};
const bez2 = (c, t) => add(mul(add(sub(c[2], mul(c[1], 2)), c[0]), 6 * (1 - t)), mul(add(sub(c[3], mul(c[2], 2)), c[1]), 6 * t));

function chordParam(p) {
  const u = [0];
  for (let i = 1; i < p.length; i++) u.push(u[i - 1] + len(sub(p[i], p[i - 1])));
  const g = u[u.length - 1] || 1;
  return u.map((x) => x / g);
}
function erzeuge(p, u, t1, t2) {
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  const first = p[0];
  const last = p[p.length - 1];
  for (let i = 0; i < p.length; i++) {
    const t = u[i];
    const m = 1 - t;
    const a0 = mul(t1, 3 * m * m * t);
    const a1 = mul(t2, 3 * m * t * t);
    c00 += dot(a0, a0);
    c01 += dot(a0, a1);
    c11 += dot(a1, a1);
    const tmp = sub(p[i], add(mul(first, m * m * m + 3 * m * m * t), mul(last, 3 * m * t * t + t * t * t)));
    x0 += dot(a0, tmp);
    x1 += dot(a1, tmp);
  }
  const det = c00 * c11 - c01 * c01;
  let al = 0;
  let ar = 0;
  if (Math.abs(det) > 1e-9) {
    al = (x0 * c11 - x1 * c01) / det;
    ar = (c00 * x1 - c01 * x0) / det;
  }
  const seg = len(sub(last, first));
  // Grifflängen in vernünftigen Grenzen (nie negativ, nie länger als die Sehne)
  if (!(al > seg * 0.02) || !(ar > seg * 0.02) || al > seg * 1.2 || ar > seg * 1.2) {
    al = Math.min(Math.max(al, seg * 0.05), seg * 1.2);
    ar = Math.min(Math.max(ar, seg * 0.05), seg * 1.2);
    if (!Number.isFinite(al) || !Number.isFinite(ar)) al = ar = seg / 3;
  }
  return [first, add(first, mul(t1, al)), add(last, mul(t2, ar)), last];
}
function newton(c, pt, t) {
  const q = sub(bez(c, t), pt);
  const q1 = bez1(c, t);
  const q2 = bez2(c, t);
  const z = dot(q1, q1) + dot(q, q2);
  return z === 0 ? t : Math.min(1, Math.max(0, t - dot(q, q1) / z));
}
/** ein kubisches Stück durch p (dicht) mit Tangentenrichtungen t1 (am Anfang, nach vorn) und t2 (am Ende, nach hinten) */
export function einStueck(p, t1, t2) {
  if (p.length < 3) {
    const d = len(sub(p[p.length - 1], p[0])) / 3;
    return { c: [p[0], add(p[0], mul(t1, d)), add(p[p.length - 1], mul(t2, d)), p[p.length - 1]], fehler: 0 };
  }
  let u = chordParam(p);
  let c = erzeuge(p, u, t1, t2);
  for (let k = 0; k < 8; k++) {
    u = u.map((t, i) => newton(c, p[i], t));
    c = erzeuge(p, u, t1, t2);
  }
  let f = 0;
  for (let i = 0; i < p.length; i++) f = Math.max(f, len(sub(bez(c, u[i]), p[i])));
  return { c, fehler: f };
}
/** Richtung der Polylinie bei Index i, gemessen über ±weg Bildpunkte (einseitig, wenn vorn/hinten fehlt) */
export function richtung(p, i, weg = 8, seite = 0) {
  let a = i;
  let b = i;
  let s = 0;
  if (seite <= 0)
    while (a > 0 && s < weg) {
      s += len(sub(p[a], p[a - 1]));
      a--;
    }
  s = 0;
  if (seite >= 0)
    while (b < p.length - 1 && s < weg) {
      s += len(sub(p[b + 1], p[b]));
      b++;
    }
  return norm(sub(p[b], p[a]));
}
export { len, sub, add, mul };
