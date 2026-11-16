// Spurt das Logo nach: Isolinie der Helligkeit bei 50 % (Marching Squares, auf den Bruchteil eines Bildpunkts genau, weil die
// geglätteten Kanten des Bilds die Lage verraten), dann Bézier-Stücke nach Schneider (Graphics Gems, 1990) zwischen Ecken.
// Ausgabe: JSON mit allen Umrissen (je Umriss eine Liste kubischer Stücke) und ein SVG zum Ansehen.
//   node scripts/maskottchen/spur.mjs [bild] [ausgabe-ohne-endung]
import fs from 'node:fs';
import { lesePng } from './png.mjs';

const datei = process.argv[2] ?? '../../docs/look/maskottchen/ozzy-logo.png';
const aus = process.argv[3] ?? '../../docs/look/maskottchen/spur';
const FEHLER = Number(process.env.FEHLER ?? 0.45); // erlaubte Abweichung in Bildpunkten
const ECKE_GRAD = Number(process.env.ECKE ?? 42); // ab diesem Knick (über ±ECKE_WEG gemessen) ist ein Punkt eine Ecke
const ECKE_WEG = Number(process.env.ECKE_WEG ?? 5);

const { breite: W, hoehe: H, rgba } = lesePng(datei);
// Dunkelheit 0..1, mit einem hellen Rand von einem Punkt, damit jeder Umriss schließt
const GW = W + 2;
const GH = H + 2;
const d = new Float32Array(GW * GH);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    const a = rgba[o + 3] / 255;
    const l = (((rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3) * a + 255 * (1 - a)) / 255;
    d[(y + 1) * GW + (x + 1)] = 1 - l;
  }
const v = (x, y) => d[y * GW + x];
const innen = (x, y) => v(x, y) > 0.5;

// Kanten: h(x,y) zwischen (x,y)-(x+1,y), v(x,y) zwischen (x,y)-(x,y+1). Punkt in Bildkoordinaten (Pixelmitte = +0,5, Rand -1).
const punkte = new Map();
const nachbarn = new Map();
function kantenPunkt(k) {
  let p = punkte.get(k);
  if (p) return p;
  const art = k[0];
  const [xs, ys] = k.slice(1).split(',');
  const x = Number(xs);
  const y = Number(ys);
  const a = v(x, y);
  const b = art === 'h' ? v(x + 1, y) : v(x, y + 1);
  const t = (0.5 - a) / (b - a);
  p = art === 'h' ? [x + t - 1 + 0.5, y - 1 + 0.5] : [x - 1 + 0.5, y + t - 1 + 0.5];
  punkte.set(k, p);
  return p;
}
function verbinde(a, b) {
  kantenPunkt(a);
  kantenPunkt(b);
  (nachbarn.get(a) ?? nachbarn.set(a, []).get(a)).push(b);
  (nachbarn.get(b) ?? nachbarn.set(b, []).get(b)).push(a);
}
for (let y = 0; y < GH - 1; y++)
  for (let x = 0; x < GW - 1; x++) {
    const tl = innen(x, y);
    const tr = innen(x + 1, y);
    const br = innen(x + 1, y + 1);
    const bl = innen(x, y + 1);
    const fall = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    if (fall === 0 || fall === 15) continue;
    const T = `h${x},${y}`;
    const B = `h${x},${y + 1}`;
    const L = `v${x},${y}`;
    const R = `v${x + 1},${y}`;
    const mitteInnen = (v(x, y) + v(x + 1, y) + v(x + 1, y + 1) + v(x, y + 1)) / 4 > 0.5;
    switch (fall) {
      case 1: case 14: verbinde(L, B); break;
      case 2: case 13: verbinde(B, R); break;
      case 3: case 12: verbinde(L, R); break;
      case 4: case 11: verbinde(T, R); break;
      case 6: case 9: verbinde(T, B); break;
      case 7: case 8: verbinde(L, T); break;
      case 5:
        if (mitteInnen) { verbinde(L, T); verbinde(B, R); } else { verbinde(T, R); verbinde(L, B); }
        break;
      case 10:
        if (mitteInnen) { verbinde(T, R); verbinde(L, B); } else { verbinde(L, T); verbinde(B, R); }
        break;
    }
  }

// Umrisse ablaufen
const besucht = new Set();
const umrisse = [];
for (const start of nachbarn.keys()) {
  if (besucht.has(start)) continue;
  const ring = [];
  let vorher = null;
  let k = start;
  for (;;) {
    besucht.add(k);
    ring.push(punkte.get(k));
    const nb = nachbarn.get(k);
    const weiter = nb[0] !== vorher || nb.length === 1 ? nb[0] : nb[1];
    const naechster = weiter === vorher ? nb[1] : weiter;
    vorher = k;
    k = naechster;
    if (k === start || k === undefined || besucht.has(k)) break;
  }
  if (ring.length > 12) umrisse.push(ring);
}

// Fläche mit Vorzeichen (y nach unten: positiv = im Uhrzeigersinn auf dem Bildschirm)
const flaeche = (r) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};

// --- Bézier nach Schneider ---------------------------------------------------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const norm = (a) => {
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
  const a0 = [];
  const a1 = [];
  for (const t of u) {
    const m = 1 - t;
    a0.push(mul(t1, 3 * m * m * t));
    a1.push(mul(t2, 3 * m * t * t));
  }
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  const first = p[0];
  const last = p[p.length - 1];
  for (let i = 0; i < p.length; i++) {
    c00 += dot(a0[i], a0[i]);
    c01 += dot(a0[i], a1[i]);
    c11 += dot(a1[i], a1[i]);
    const t = u[i];
    const m = 1 - t;
    const tmp = sub(p[i], add(mul(first, m * m * m + 3 * m * m * t), mul(last, 3 * m * t * t + t * t * t)));
    x0 += dot(a0[i], tmp);
    x1 += dot(a1[i], tmp);
  }
  const det = c00 * c11 - c01 * c01;
  let al = 0;
  let ar = 0;
  if (Math.abs(det) > 1e-12) {
    al = (x0 * c11 - x1 * c01) / det;
    ar = (c00 * x1 - c01 * x0) / det;
  }
  const seg = len(sub(last, first));
  const eps = 1e-6 * seg;
  if (al < eps || ar < eps) {
    al = ar = seg / 3;
  }
  return [first, add(first, mul(t1, al)), add(last, mul(t2, ar)), last];
}
function maxFehler(p, c, u) {
  let m = 0;
  let wo = (p.length / 2) | 0;
  for (let i = 1; i < p.length - 1; i++) {
    const e = len(sub(bez(c, u[i]), p[i]));
    if (e > m) {
      m = e;
      wo = i;
    }
  }
  return [m, wo];
}
function newton(c, pt, t) {
  const q = sub(bez(c, t), pt);
  const q1 = bez1(c, t);
  const q2 = bez2(c, t);
  const z = dot(q1, q1) + dot(q, q2);
  return z === 0 ? t : Math.min(1, Math.max(0, t - dot(q, q1) / z));
}
function fitte(p, t1, t2, fehler, out) {
  if (p.length === 2) {
    const dd = len(sub(p[1], p[0])) / 3;
    out.push([p[0], add(p[0], mul(t1, dd)), add(p[1], mul(t2, dd)), p[1]]);
    return;
  }
  let u = chordParam(p);
  let c = erzeuge(p, u, t1, t2);
  let [e, wo] = maxFehler(p, c, u);
  if (e < fehler) {
    out.push(c);
    return;
  }
  if (e < fehler * 6) {
    for (let k = 0; k < 6; k++) {
      u = u.map((t, i) => newton(c, p[i], t));
      c = erzeuge(p, u, t1, t2);
      [e, wo] = maxFehler(p, c, u);
      if (e < fehler) {
        out.push(c);
        return;
      }
    }
  }
  wo = Math.max(1, Math.min(p.length - 2, wo));
  const tm = norm(sub(p[Math.max(0, wo - 2)], p[Math.min(p.length - 1, wo + 2)]));
  fitte(p.slice(0, wo + 1), t1, tm, fehler, out);
  fitte(p.slice(wo), mul(tm, -1), t2, fehler, out);
}
// Tangente am Anfang/Ende eines Laufs: Richtung zum Punkt etwa `weg` Bildpunkte entfernt (robust gegen das Pixelrauschen)
function tangente(p, vonVorn, weg = 3) {
  const a = vonVorn ? p[0] : p[p.length - 1];
  let s = 0;
  if (vonVorn) {
    for (let i = 1; i < p.length; i++) {
      s += len(sub(p[i], p[i - 1]));
      if (s >= weg || i === p.length - 1) return norm(sub(p[i], a));
    }
  } else {
    for (let i = p.length - 2; i >= 0; i--) {
      s += len(sub(p[i + 1], p[i]));
      if (s >= weg || i === 0) return norm(sub(p[i], a));
    }
  }
  return [1, 0];
}

// Ecken: Knick zwischen der Richtung ECKE_WEG davor und danach, lokales Maximum
function ecken(r) {
  const n = r.length;
  // kumulierte Länge für Nachbarn im Abstand
  const knick = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    let a = i;
    while (s < ECKE_WEG) {
      const j = (a - 1 + n) % n;
      s += len(sub(r[a], r[j]));
      a = j;
      if (a === i) break;
    }
    s = 0;
    let b = i;
    while (s < ECKE_WEG) {
      const j = (b + 1) % n;
      s += len(sub(r[j], r[b]));
      b = j;
      if (b === i) break;
    }
    const v1 = norm(sub(r[i], r[a]));
    const v2 = norm(sub(r[b], r[i]));
    knick[i] = (Math.acos(Math.max(-1, Math.min(1, dot(v1, v2)))) * 180) / Math.PI;
  }
  const liste = [];
  for (let i = 0; i < n; i++) {
    if (knick[i] < ECKE_GRAD) continue;
    let max = true;
    for (let k = -4; k <= 4; k++) if (k && knick[(i + k + n) % n] > knick[i]) max = false;
    if (max) liste.push(i);
  }
  // Nachbarn zusammenlegen
  return liste.filter((i, k) => k === 0 || i - liste[k - 1] > 3);
}

const ergebnis = [];
for (const r of umrisse) {
  const a = flaeche(r);
  const e = ecken(r);
  const stuecke = [];
  const laeufe = [];
  if (e.length === 0) {
    // ohne Ecke: am Punkt ganz oben beginnen, einmal herum
    let top = 0;
    for (let i = 1; i < r.length; i++) if (r[i][1] < r[top][1]) top = i;
    const p = r.slice(top).concat(r.slice(0, top + 1));
    const t = norm(sub(p[2], p[p.length - 3]));
    fitte(p, t, mul(t, -1), FEHLER, stuecke);
    laeufe.push(p.length);
  } else {
    for (let k = 0; k < e.length; k++) {
      const i0 = e[k];
      const i1 = e[(k + 1) % e.length];
      const p = i1 > i0 ? r.slice(i0, i1 + 1) : r.slice(i0).concat(r.slice(0, i1 + 1));
      fitte(p, tangente(p, true), tangente(p, false), FEHLER, stuecke);
      laeufe.push(p.length);
    }
  }
  const rund = (q) => [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100];
  ergebnis.push({
    flaeche: Math.round(a),
    punkte: r.length,
    ecken: e.length,
    stuecke: stuecke.map((c) => c.map(rund)),
  });
}
ergebnis.sort((x, y) => Math.abs(y.flaeche) - Math.abs(x.flaeche));
const pfad = (s) =>
  s.stuecke.map((c, i) => (i === 0 ? `M${c[0][0]},${c[0][1]}` : '') + `C${c[1][0]},${c[1][1]} ${c[2][0]},${c[2][1]} ${c[3][0]},${c[3][1]}`).join('') + 'Z';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><path fill="#000" fill-rule="evenodd" d="${ergebnis.map(pfad).join('')}"/></svg>`;
fs.writeFileSync(aus + '.svg', svg);
fs.writeFileSync(aus + '.json', JSON.stringify({ breite: W, hoehe: H, umrisse: ergebnis }));
let gesamt = 0;
for (const u of ergebnis) {
  gesamt += u.stuecke.length;
  const xs = u.stuecke.flatMap((c) => c.map((q) => q[0]));
  const ys = u.stuecke.flatMap((c) => c.map((q) => q[1]));
  console.log(
    `Umriss Fläche ${u.flaeche} Punkte ${u.punkte} Ecken ${u.ecken} Stücke ${u.stuecke.length} Rahmen ${Math.round(Math.min(...xs))},${Math.round(Math.min(...ys))}–${Math.round(Math.max(...xs))},${Math.round(Math.max(...ys))}`,
  );
}
console.log('Stücke gesamt', gesamt);
