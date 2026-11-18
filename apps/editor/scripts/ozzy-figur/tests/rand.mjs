// Wie breit ist der schwarze Rand zwischen Weiß und Hintergrund in Florians Vorlagen? (CPU, Polygone)
import { DATEIEN, ladeAnsicht, VORLAGEN } from './morph.mjs';
function flach(A, m = 24) { const pts = []; const n = A.length; for (let k = 0; k < n; k++) { const a = A[k], b = A[(k + 1) % n]; for (let j = 0; j < m; j++) { const t = j / m, u = 1 - t; pts.push([u * u * u * a.p[0] + 3 * u * u * t * a.o[0] + 3 * u * t * t * b.i[0] + t * t * t * b.p[0], u * u * u * a.p[1] + 3 * u * u * t * a.o[1] + 3 * u * t * t * b.i[1] + t * t * t * b.p[1]]); } } return pts; }
function innen(P, q) { let w = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[j], b = P[i]; if (a[1] <= q[1]) { if (b[1] > q[1] && (b[0] - a[0]) * (q[1] - a[1]) - (q[0] - a[0]) * (b[1] - a[1]) > 0) w++; } else if (b[1] <= q[1] && (b[0] - a[0]) * (q[1] - a[1]) - (q[0] - a[0]) * (b[1] - a[1]) < 0) w--; } return w !== 0; }
function abstSeg(q, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; const h = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(q[0] - a[0] - dx * h, q[1] - a[1] - dy * h); }
for (const [name, datei] of Object.entries(DATEIEN)) {
  const V = ladeAnsicht(VORLAGEN, datei);
  const schwarz = V.els.filter(e => !e.weiss).map(e => flach(e.form));
  const weiss = V.els.map((e, i) => ({ e, i })).filter(x => x.e.weiss);
  // Umriss der Vereinigung: Strecken schwarzer Teile, deren Mitte in keinem anderen schwarzen Teil liegt
  const umriss = [];
  schwarz.forEach((P, pi) => { for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; const n1 = [m[0] + dy / l * 1.2, m[1] - dx / l * 1.2], n2 = [m[0] - dy / l * 1.2, m[1] + dx / l * 1.2]; const draussen = innen(P, n1) ? n2 : n1; if (!schwarz.some((Q, qi) => qi !== pi && (innen(Q, m) || innen(Q, draussen)))) umriss.push([a, b]); } });
  const aus = [];
  for (const { e, i } of weiss) {
    const W = flach(e.form, 16); let min = 1e9, wo = null;
    for (const q of W) { if (!schwarz.some(P => innen(P, q))) continue; for (const [a, b] of umriss) { const d = abstSeg(q, a, b); if (d < min) { min = d; wo = q; } } }
    aus.push(`${i}:${min.toFixed(1)}@${wo ? wo.map(v => Math.round(v)).join(',') : '-'}`);
  }
  console.log(name.padEnd(7), 'kleinster schwarzer Rand je Weiß-Teil (Index:Breite@Ort):', aus.join('  '));
}
