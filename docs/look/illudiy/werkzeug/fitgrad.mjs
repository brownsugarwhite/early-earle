// Verläufe fitten: Rand hell/dunkel (waagrecht, 3 Stopps), Weiß global (senkrecht), D-Vorderfläche (schräg, geklemmt).
import { loadRaw } from './lib.mjs';
const { data, w } = await loadRaw();
const px = (x, y) => { const p = (Math.round(y) * w + Math.round(x)) * 4; return [data[p], data[p+1], data[p+2]]; };
const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const near = (a, b, t) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]) < t;
// --- Rand: je Spalte Lauf-Mitte oben (hell) und unten (dunkel)
const BG = [0x17,0x13,0x1b], TEAL = [0,0x3f,0x4e];
const light = [], dark = [];
for (let x = 152; x <= 1738; x += 4) {
  const runs = []; let s = -1;
  for (let y = 100; y < 800; y++) { const c = px(x, y); const b = !near(c, BG, 40) && !near(c, TEAL, 40); if (b && s < 0) s = y; if (!b && s >= 0) { runs.push([s, y-1]); s = -1; } }
  for (const [a, b] of runs) { if (b - a < 8) continue; const isEdge = near(px(x, a-2), BG, 30) || near(px(x, b+2), BG, 30); if (!isEdge) continue;
    const S = []; for (let y = a + 3; y <= b - 3; y++) S.push(px(x, y)); const m = [0,1,2].map(i => S.reduce((q, c) => q + c[i], 0) / S.length);
    const lum = m[0]*0.3 + m[1]*0.59 + m[2]*0.11; { const isLight = (a < 400 && x < 1700) || (x < 300 && a > 400); const isDark = (a > 400 && x > 345) || x > 1718; if (isLight) light.push([x, m]); else if (isDark) dark.push([x, m]); } }
}
function fit3(D, name) {
  let best = null;
  for (let x0 = 150; x0 <= 400; x0 += 10) for (let x1 = 700; x1 <= 1200; x1 += 10) for (let x2 = 1300; x2 <= 1700; x2 += 10) {
    // Farben je Stopp per kleinsten Quadraten (stückweise linear, geklemmt)
    const basis = x => { if (x <= x0) return [1,0,0]; if (x <= x1) { const t = (x-x0)/(x1-x0); return [1-t,t,0]; } if (x <= x2) { const t = (x-x1)/(x2-x1); return [0,1-t,t]; } return [0,0,1]; };
    const A = [[0,0,0],[0,0,0],[0,0,0]], B = [[0,0,0],[0,0,0],[0,0,0]];
    for (const [x, c] of D) { const v = basis(x); for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) A[i][j] += v[i]*v[j]; for (let k = 0; k < 3; k++) B[i][k] += v[i]*c[k]; } }
    const det3 = M => M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1]) - M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0]) + M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
    const d = det3(A); if (Math.abs(d) < 1e-6) continue; const C = [];
    for (let k = 0; k < 3; k++) { const sol = []; for (let i = 0; i < 3; i++) { const M = A.map(r => r.slice()); for (let r = 0; r < 3; r++) M[r][i] = B[r][k]; sol.push(det3(M)/d); } C.push(sol); }
    const stops = [0,1,2].map(i => [C[0][i], C[1][i], C[2][i]]);
    let err = 0, mx = 0; for (const [x, c] of D) { const v = basis(x); for (let k = 0; k < 3; k++) { const e = Math.abs(c[k] - (v[0]*stops[0][k] + v[1]*stops[1][k] + v[2]*stops[2][k])); err += e*e; mx = Math.max(mx, e); } }
    if (!best || err < best.err) best = { err, mx, xs: [x0, x1, x2], stops };
  }
  console.log(name, 'stops', best.xs.map((x, i) => `${x}:${hex(best.stops[i])}`).join(' '), 'max', best.mx.toFixed(1), 'rms', Math.sqrt(best.err / D.length / 3).toFixed(2));
}
fit3(light, 'Rand hell'); fit3(dark, 'Rand dunkel');
// --- Weiß global: Spalten der Verlaufsflächen
const cols = [[330,365],[590,620],[790,830],[900,935],[1530,1570],[1475,1520]]; const W = [];
for (let y = 380; y <= 618; y++) for (const [a, b] of cols) for (let x = a; x <= b; x += 3) { const c = px(x, y); if (c[0] > 225 && c[1] > 215 && c[2] > 225 && Math.max(...c) - Math.min(...c) < 25) W.push([y, c]); }
let bestW = null;
for (let y0 = 380; y0 <= 440; y0 += 1) { const y1 = 622; // c(y) = 255 + (c1-255)*clamp((y-y0)/(y1-y0))
  const c1 = [0,1,2].map(k => { let num = 0, den = 0; for (const [y, c] of W) { const t = Math.max(0, Math.min(1, (y-y0)/(y1-y0))); num += t*(c[k]-255); den += t*t; } return 255 + num/den; });
  let err = 0, mx = 0; for (const [y, c] of W) { const t = Math.max(0, Math.min(1, (y-y0)/(y1-y0))); for (let k = 0; k < 3; k++) { const e = Math.abs(c[k] - (255 + (c1[k]-255)*t)); err += e*e; mx = Math.max(mx, e); } }
  if (!bestW || err < bestW.err) bestW = { y0, y1, c1, err, mx }; }
console.log('Weiß global y0', bestW.y0, 'y1', bestW.y1, 'c1', hex(bestW.c1), 'max', bestW.mx.toFixed(1), 'rms', Math.sqrt(bestW.err / W.length / 3).toFixed(2));
// --- D-Vorderfläche: Punkte rechts von x=1056, oberhalb der B-Linie durch (1121,471.5) Steigung -0.5, nicht im Gegenraum, weiß-lila
const Dp = [];
for (let y = 300; y <= 600; y += 2) for (let x = 1058; x <= 1232; x += 2) { const yB = 471.5 + (1121 - x) * 0.5; if (y > yB - 3) continue; const c = px(x, y); if (!(c[0] > 225 && c[2] > 225 && Math.max(...c) - Math.min(...c) < 25)) continue;
  let ok = true; for (const [dx, dy] of [[-3,0],[3,0],[0,-3],[0,3]]) { const q = px(x+dx, y+dy); if (!(q[0] > 225 && q[2] > 225)) ok = false; } if (ok) Dp.push([x, y, c]); }
let bestD = null;
for (let th = 28; th <= 50; th += 0.5) { const d = [Math.cos(th*Math.PI/180), Math.sin(th*Math.PI/180)];
  for (let a = -40; a <= 20; a += 1) for (let b = a + 30; b <= a + 140; b += 2) {
    // Farbe = c0 + (255-c0)*clamp((s-a)/(b-a)), s = (p - (1128,402))·d ; c0 per kleinsten Quadraten
    const c0 = [0,1,2].map(k => { let num = 0, den = 0; for (const [x, y, c] of Dp) { const s = (x-1128)*d[0] + (y-402)*d[1]; const t = Math.max(0, Math.min(1, (s-a)/(b-a))); num += (1-t)*(c[k] - 255*t); den += (1-t)**2; } return den ? num/den : 255; });
    let err = 0; for (const [x, y, c] of Dp) { const s = (x-1128)*d[0] + (y-402)*d[1]; const t = Math.max(0, Math.min(1, (s-a)/(b-a))); for (let k = 0; k < 3; k++) { const e = c[k] - (c0[k] + (255 - c0[k])*t); err += e*e; } }
    if (!bestD || err < bestD.err) bestD = { th, a, b, c0, err }; } }
{ const d = [Math.cos(bestD.th*Math.PI/180), Math.sin(bestD.th*Math.PI/180)]; let mx = 0; for (const [x, y, c] of Dp) { const s = (x-1128)*d[0] + (y-402)*d[1]; const t = Math.max(0, Math.min(1, (s-bestD.a)/(bestD.b-bestD.a))); for (let k = 0; k < 3; k++) mx = Math.max(mx, Math.abs(c[k] - (bestD.c0[k] + (255 - bestD.c0[k])*t))); }
  const p0 = [1128 + d[0]*bestD.a, 402 + d[1]*bestD.a], p1 = [1128 + d[0]*bestD.b, 402 + d[1]*bestD.b];
  console.log('D vorne Winkel', bestD.th, 'von', p0.map(v => v.toFixed(1)).join(','), hex(bestD.c0), 'bis', p1.map(v => v.toFixed(1)).join(','), '#ffffff', 'max', mx.toFixed(1), 'rms', Math.sqrt(bestD.err / Dp.length / 3).toFixed(2), 'n', Dp.length); }
