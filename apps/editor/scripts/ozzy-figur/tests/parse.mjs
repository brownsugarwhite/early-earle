// SVG-Pfade in absolute kubische Bézier-Stücke zerlegen und zählen
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = process.argv[2] ?? new URL('../../../../../docs/look/ozzy-figur/vorlagen', import.meta.url).pathname;
const HAUPT = process.argv[1].endsWith('parse.mjs');
function tokens(d) {
  const re = /([MmCcSsLlHhVvZzQqTtAa])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g;
  const out = []; let m;
  while ((m = re.exec(d))) out.push(m[1] ?? parseFloat(m[2]));
  return out;
}
export function parsePath(d) {
  const t = tokens(d); let i = 0; let cmd = null;
  let x = 0, y = 0, sx = 0, sy = 0, lcx = null, lcy = null;
  const subs = []; let cur = null;
  const num = () => t[i++];
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') { x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); sx = x; sy = y; cur = { start: [x, y], segs: [], closed: false }; subs.push(cur); cmd = rel ? 'l' : 'L'; lcx = null; continue; }
    if (C === 'Z') { if (Math.hypot(x - sx, y - sy) > 1e-6) cur.segs.push({ k: 'L', p: [[x, y], [x + (sx - x) / 3, y + (sy - y) / 3], [x + 2 * (sx - x) / 3, y + 2 * (sy - y) / 3], [sx, sy]], implicit: true }); cur.closed = true; x = sx; y = sy; lcx = null; continue; }
    if (C === 'C') { const a = [x + (rel ? 0 : -x) + num(), 0]; a[1] = y + (rel ? 0 : -y) + num(); const b = [(rel ? x : 0) + num(), 0]; b[1] = (rel ? y : 0) + num(); const e = [(rel ? x : 0) + num(), 0]; e[1] = (rel ? y : 0) + num(); cur.segs.push({ k: 'C', p: [[x, y], a, b, e] }); lcx = b[0]; lcy = b[1]; x = e[0]; y = e[1]; continue; }
    if (C === 'S') { const a = lcx === null ? [x, y] : [2 * x - lcx, 2 * y - lcy]; const b = [(rel ? x : 0) + num(), 0]; b[1] = (rel ? y : 0) + num(); const e = [(rel ? x : 0) + num(), 0]; e[1] = (rel ? y : 0) + num(); cur.segs.push({ k: 'S', p: [[x, y], a, b, e] }); lcx = b[0]; lcy = b[1]; x = e[0]; y = e[1]; continue; }
    if (C === 'L' || C === 'H' || C === 'V') { let nx = x, ny = y; if (C === 'L') { nx = (rel ? x : 0) + num(); ny = (rel ? y : 0) + num(); } else if (C === 'H') nx = (rel ? x : 0) + num(); else ny = (rel ? y : 0) + num(); cur.segs.push({ k: 'L', p: [[x, y], [x + (nx - x) / 3, y + (ny - y) / 3], [x + 2 * (nx - x) / 3, y + 2 * (ny - y) / 3], [nx, ny]] }); x = nx; y = ny; lcx = null; continue; }
    throw new Error('unbekannt ' + cmd);
  }
  return subs;
}
function polyToPath(pts, closed) { return 'M' + pts.map(p => p.join(',')).join('L') + (closed ? 'Z' : ''); }
if (HAUPT) {
const files = readdirSync(dir).filter(f => f.endsWith('.svg')).sort();
const all = {};
for (const f of files) {
  const s = readFileSync(dir + '/' + f, 'utf8');
  const vb = s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const els = [];
  const re = /<(path|polyline|polygon)([^>]*)\/>/g; let m;
  while ((m = re.exec(s))) {
    const attrs = m[2];
    const cls = (attrs.match(/class="([^"]+)"/) || [])[1] || 'schwarz';
    let d;
    if (m[1] === 'path') d = attrs.match(/ d="([^"]+)"/)[1];
    else { const pts = attrs.match(/points="([^"]+)"/)[1].trim().split(/\s+/).map(Number); const P = []; for (let k = 0; k < pts.length; k += 2) P.push([pts[k], pts[k + 1]]); d = polyToPath(P, true); }
    const subs = parsePath(d);
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const sp of subs) for (const sg of sp.segs) for (const q of sg.p) { minx = Math.min(minx, q[0]); miny = Math.min(miny, q[1]); maxx = Math.max(maxx, q[0]); maxy = Math.max(maxy, q[1]); }
    els.push({ tag: m[1], cls, d, subs, bbox: [minx, miny, maxx, maxy].map(v => +v.toFixed(1)), anker: subs.map(sp => sp.segs.length) });
  }
  all[f] = { viewBox: vb, els };
}
writeFileSync('parsed.json', JSON.stringify(all));
for (const [f, o] of Object.entries(all)) {
  console.log('==', f, 'viewBox', o.viewBox.join(' '));
  o.els.forEach((e, k) => console.log(String(k).padStart(2), e.tag.padEnd(8), e.cls.padEnd(8), 'Stücke', String(e.anker).padEnd(4), 'bbox', e.bbox.join(' '), '|', e.d.slice(0, 40)));
}
}
