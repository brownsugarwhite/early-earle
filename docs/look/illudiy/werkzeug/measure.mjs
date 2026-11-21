// Subpixel-Kantenmessung: Profile quer zur Kante, 50%-Übergang zwischen Innen- und Außenfarbe, Geradenfit.
import { loadRaw } from './lib.mjs';
const { data, w, h } = await loadRaw();
const pix = (x, y) => { const p = (y * w + x) * 4; return [data[p], data[p+1], data[p+2]]; };
export function bil(x, y) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0; const a = pix(x0, y0), b = pix(x0+1, y0), c = pix(x0, y0+1), d = pix(x0+1, y0+1);
  return [0,1,2].map(k => (a[k]*(1-fx) + b[k]*fx)*(1-fy) + (c[k]*(1-fx) + d[k]*fx)*fy); }
// Querschnitt bei Punkt p mit Normale n: gibt Abstand s (in px) des 50%-Übergangs zurück, oder null
export function crossing(p, n, reach = 5) {
  const S = []; for (let s = -reach; s <= reach + 1e-9; s += 0.25) S.push([s, bil(p[0] + n[0]*s - 0.5, p[1] + n[1]*s - 0.5)]);
  const mean = arr => [0,1,2].map(k => arr.reduce((acc, v) => acc + v[1][k], 0) / arr.length);
  const cin = mean(S.slice(0, 5)), cout = mean(S.slice(-5)); const D = cout.map((v, k) => v - cin[k]); const DD = D.reduce((a, v) => a + v*v, 0);
  if (DD < 900) return null;
  const t = S.map(([s, c]) => [s, c.reduce((a, v, k) => a + (v - cin[k]) * D[k], 0) / DD]);
  for (let i = 1; i < t.length; i++) if ((t[i-1][1] - 0.5) * (t[i][1] - 0.5) <= 0 && t[i][1] !== t[i-1][1]) { const f = (0.5 - t[i-1][1]) / (t[i][1] - t[i-1][1]); return t[i-1][0] + f * (t[i][0] - t[i-1][0]); }
  return null;
}
// Gerade zwischen ungefähren Endpunkten messen (Pixelkoordinaten: Pixel i deckt [i, i+1])
export function measureLine(a, b, opt = {}) {
  const from = opt.from ?? 0.12, to = opt.to ?? 0.88; const L = Math.hypot(b[0]-a[0], b[1]-a[1]); const d = [(b[0]-a[0])/L, (b[1]-a[1])/L], n = [-d[1], d[0]];
  const pts = []; const steps = Math.max(6, Math.floor(L * (to - from)));
  for (let i = 0; i <= steps; i++) { const f = from + (to - from) * i / steps; const p = [a[0] + (b[0]-a[0])*f, a[1] + (b[1]-a[1])*f]; const s = crossing(p, n, opt.reach ?? 5); if (s !== null) pts.push([p[0] + n[0]*s, p[1] + n[1]*s]); }
  if (pts.length < 4) return null;
  let mx = 0, my = 0; for (const [x, y] of pts) { mx += x; my += y; } mx /= pts.length; my /= pts.length;
  let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of pts) { sxx += (x-mx)**2; syy += (y-my)**2; sxy += (x-mx)*(y-my); }
  const th = 0.5 * Math.atan2(2*sxy, sxx - syy); let dx = Math.cos(th), dy = Math.sin(th); if (dx*d[0] + dy*d[1] < 0) { dx = -dx; dy = -dy; }
  let r = 0; for (const [x, y] of pts) r = Math.max(r, Math.abs((x-mx)*dy - (y-my)*dx));
  return { mx, my, dx, dy, res: r, n: pts.length };
}
export const intersect = (L1, L2) => { const det = L1.dx*(-L2.dy) - L1.dy*(-L2.dx); if (Math.abs(det) < 1e-9) return null; const t = ((L2.mx-L1.mx)*(-L2.dy) - (L2.my-L1.my)*(-L2.dx)) / det; return [L1.mx + t*L1.dx, L1.my + t*L1.dy]; };
