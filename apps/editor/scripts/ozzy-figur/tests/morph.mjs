// Ozzy-Teile aus Florians SVGs: einlesen, säubern, morphen, als SVG ausgeben
import { readFileSync } from 'node:fs';
import { parsePath } from './parse.mjs';
// Florians Vorlagen im Repo
export const VORLAGEN = new URL('../../../../../docs/look/ozzy-figur/vorlagen', import.meta.url).pathname;

export const DATEIEN = { front: 'ozzy_front.svg', back: 'ozzy_back.svg', logo: 'ozzy_stand01_logo.svg', profil: 'ozzy_stand02.svg', lieg1: 'ozzy_laydown01.svg', lieg2: 'ozzy_laydown02.svg' };
// Teil → Index je Datei (Reihenfolge in der Datei), abgelesen am farbigen Blatt
export const TEILE = {
  ohrA:     { front: 0, back: 6, logo: 10, profil: 2, lieg1: 9, lieg2: 11 },   // im Frontbild links (Ozzys rechtes Ohr)
  ohrB:     { front: 1, back: 7, logo: 11, profil: 0, lieg1: 10, lieg2: 9 },   // im Frontbild rechts
  ohrSpalt: { profil: 1, lieg2: 10 },
  kopfA:    { front: 11, back: 9, logo: 13, profil: 14, lieg1: 12, lieg2: 13 },
  kopfB:    { front: 9, back: 8, logo: 12, profil: 3, lieg1: 11, lieg2: 12 },
  bartA:    { front: 12, logo: 15, profil: 16, lieg1: 13, lieg2: 14 },
  bartB:    { front: 13, logo: 16, profil: 17, lieg1: 14, lieg2: 15 },
  nase:     { front: 14, back: 10, logo: 17, profil: 18, lieg1: 15, lieg2: 16 },
  bohne:    { front: 2, back: 0, logo: 1, profil: 5, lieg1: 1, lieg2: 1 },
  schwanz:  { back: 13, logo: 0, profil: 4, lieg1: 0, lieg2: 0 },
  schwanzW: { back: 14, logo: 2, profil: 6, lieg1: 2, lieg2: 2 },
};

export function ladeAnsicht(dir, datei) {
  const s = readFileSync(dir + '/' + datei, 'utf8');
  const vb = s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const els = [];
  const re = /<(path|polyline|polygon)([^>]*)\/>/g; let m;
  while ((m = re.exec(s))) {
    const attrs = m[2];
    const weiss = /class="cls-[12]"/.test(attrs);
    let d;
    if (m[1] === 'path') d = attrs.match(/ d="([^"]+)"/)[1];
    else { const pts = attrs.match(/points="([^"]+)"/)[1].trim().split(/\s+/).map(Number); const P = []; for (let k = 0; k < pts.length; k += 2) P.push([pts[k], pts[k + 1]]); d = 'M' + P.map(p => p.join(',')).join('L') + 'Z'; }
    els.push({ weiss, form: ausSegmenten(parsePath(d)[0]) });
  }
  return { vb, els };
}

// Segmente → Anker mit Griffen; winzige Schlusslinie (< 0,1) wird mit dem Start verschmolzen
export function ausSegmenten(sp) {
  let segs = sp.segs.slice();
  const last = segs[segs.length - 1];
  if (last.implicit && Math.hypot(last.p[3][0] - last.p[0][0], last.p[3][1] - last.p[0][1]) < 0.1) segs.pop();
  const n = segs.length; const A = [];
  for (let k = 0; k < n; k++) {
    const s = segs[k], prev = segs[(k - 1 + n) % n];
    A.push({ p: s.p[0].slice(), i: prev.p[2].slice(), o: s.p[1].slice() });
  }
  return A;
}
export const verschiebe = (A, dx, dy) => A.map(a => ({ p: [a.p[0] + dx, a.p[1] + dy], i: [a.i[0] + dx, a.i[1] + dy], o: [a.o[0] + dx, a.o[1] + dy] }));
export const spiegle = (A, achse) => A.map(a => ({ p: [2 * achse - a.p[0], a.p[1]], i: [2 * achse - a.i[0], a.i[1]], o: [2 * achse - a.o[0], a.o[1]] }));
export function zuPfad(A) {
  let d = `M${A[0].p[0].toFixed(2)},${A[0].p[1].toFixed(2)}`;
  for (let k = 0; k < A.length; k++) { const a = A[k], b = A[(k + 1) % A.length]; d += `C${a.o[0].toFixed(2)},${a.o[1].toFixed(2)},${b.i[0].toFixed(2)},${b.i[1].toFixed(2)},${b.p[0].toFixed(2)},${b.p[1].toFixed(2)}`; }
  return d + 'Z';
}
const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
function winkelLerp(a, b, t) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
function polarGriff(anker, griff) { const dx = griff[0] - anker[0], dy = griff[1] - anker[1]; return [Math.atan2(dy, dx), Math.hypot(dx, dy)]; }
// L: alles linear. W: Griffe nach Winkel und Länge. S: Ähnlichkeit (Drehung, Größe, Lage) je Teil + linearer Rest, Griffe nach Winkel/Länge
export function morph(A0, B0, t, art = 'W') {
  const [A, B] = abgleichen(A0, B0);
  if (A.length !== B.length) throw new Error(`Ankerzahl ${A.length} ≠ ${B.length}`);
  if (art === 'L') return A.map((a, k) => ({ p: lerp2(a.p, B[k].p, t), i: lerp2(a.i, B[k].i, t), o: lerp2(a.o, B[k].o, t) }));
  if (art === 'W') return A.map((a, k) => {
    const b = B[k]; const p = lerp2(a.p, b.p, t);
    const g = (ga, gb) => { const [wa, la] = polarGriff(a.p, ga), [wb, lb] = polarGriff(b.p, gb); if (la < 0.05 && lb < 0.05) return p.slice(); const w = la < 0.05 ? wb : lb < 0.05 ? wa : winkelLerp(wa, wb, t); const l = lerp(la, lb, t); return [p[0] + Math.cos(w) * l, p[1] + Math.sin(w) * l]; };
    return { p, i: g(a.i, b.i), o: g(a.o, b.o) };
  });
  if (art === 'S') {
    // Procrustes: B ≈ s R A + T (auf Ankern)
    const ca = schwer(A), cb = schwer(B);
    let sxx = 0, sxy = 0, na = 0;
    for (let k = 0; k < A.length; k++) { const ax = A[k].p[0] - ca[0], ay = A[k].p[1] - ca[1], bx = B[k].p[0] - cb[0], by = B[k].p[1] - cb[1]; sxx += ax * bx + ay * by; sxy += ax * by - ay * bx; na += ax * ax + ay * ay; }
    const th = Math.atan2(sxy, sxx), s = Math.hypot(sxx, sxy) / na;
    // B in A-Rahmen zurückholen
    const inv = (q) => { const x = q[0] - cb[0], y = q[1] - cb[1]; const c = Math.cos(-th), sn = Math.sin(-th); return [(c * x - sn * y) / s + ca[0], (sn * x + c * y) / s + ca[1]]; };
    const Bl = B.map(b => ({ p: inv(b.p), i: inv(b.i), o: inv(b.o) }));
    const mitte = morph(A, Bl, t, 'W');
    const tht = th * t, st = Math.exp(Math.log(s) * t), ct = lerp2(ca, cb, t);
    const fwd = (q) => { const x = q[0] - ca[0], y = q[1] - ca[1]; const c = Math.cos(tht), sn = Math.sin(tht); return [(c * x - sn * y) * st + ct[0], (sn * x + c * y) * st + ct[1]]; };
    return mitte.map(a => ({ p: fwd(a.p), i: fwd(a.i), o: fwd(a.o) }));
  }
}
export function schwer(A) { let x = 0, y = 0; for (const a of A) { x += a.p[0]; y += a.p[1]; } return [x / A.length, y / A.length]; }

// Ankerabgleich: fehlt der kürzeren Form ein Anker, wird das passende Stück formtreu geteilt (de Casteljau)
export function teile(A, j, t) {
  const n = A.length, a = A[j], b = A[(j + 1) % n];
  const P0 = a.p, P1 = a.o, P2 = b.i, P3 = b.p;
  const L = (u, v) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
  const Q0 = L(P0, P1), Q1 = L(P1, P2), Q2 = L(P2, P3), R0 = L(Q0, Q1), R1 = L(Q1, Q2), S = L(R0, R1);
  const neu = A.map(x => ({ p: x.p.slice(), i: x.i.slice(), o: x.o.slice() }));
  neu[j].o = Q0; neu[(j + 1) % n].i = Q2;
  neu.splice(j + 1, 0, { p: S, i: R0, o: R1 });
  return neu;
}
export function abgleichen(A, B) {
  if (A.length === B.length) return [A, B];
  const kurz = A.length < B.length ? A : B, lang = kurz === A ? B : A;
  if (lang.length - kurz.length !== 1) throw new Error('mehr als ein Anker Unterschied');
  const sa = schwer(kurz), sb = schwer(lang);
  let best = null;
  for (let j = 0; j < kurz.length; j++) for (let t = 0.1; t < 0.95; t += 0.05) {
    const K = teile(kurz, j, t); let c = 0;
    for (let k = 0; k < K.length; k++) c += Math.hypot(K[k].p[0] - sa[0] - lang[k].p[0] + sb[0], K[k].p[1] - sa[1] - lang[k].p[1] + sb[1]);
    if (!best || c < best.c) best = { c, K, j, t };
  }
  return kurz === A ? [best.K, B] : [A, best.K];
}
