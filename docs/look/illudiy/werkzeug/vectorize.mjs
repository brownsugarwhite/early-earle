// Vektorisiert alle Zusammenhangsbereiche: Geraden (Schnittpunkte gefitteter Linien) und Kurven (kubische Béziers, Schneider).
import { loadRaw, SP } from './lib.mjs';
import fs from 'node:fs';
const { data, w, h } = await loadRaw();
const refs = [['BG',[0x17,0x13,0x1b]],['TEAL',[0x00,0x3f,0x4e]],['WHITE',[0xff,0xff,0xff]],['WHITE',[0xea,0xe5,0xee]],['COLOR',[0xff,0x73,0xa9]],['COLOR',[0x93,0x70,0xfa]],['COLOR',[0xcc,0xbb,0xfe]],['COLOR',[0xfd,0xa4,0xdd]],['COLOR',[0xe2,0x58,0xa1]],['COLOR',[0xb0,0x68,0xdc]],['COLOR',[0xd8,0x4c,0x8a]],['COLOR',[0xa0,0x6c,0xec]]];
const CL = { BG: 0, TEAL: 1, WHITE: 2, COLOR: 3 };
const cls = new Uint8Array(w*h);
for (let i = 0; i < w*h; i++) { const r = data[i*4], g = data[i*4+1], b = data[i*4+2]; let best = 1e9, bc = 0; for (const [n,[R,G,B]] of refs) { const d = (r-R)**2+(g-G)**2+(b-B)**2; if (d < best) { best = d; bc = CL[n]; } } cls[i] = bc; }
// Kleine Fehlklassen (Kantenglättung Weiß/Petrol -> COLOR) entfernen: COLOR-Pixel mit <2 COLOR-Nachbarn in 3x3 -> Nachbarmehrheit
for (let pass = 0; pass < 2; pass++) for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) { const i = y*w+x; const cnt = [0,0,0,0]; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (j||k) cnt[cls[i+j*w+k]]++; if (cnt[cls[i]] <= 1) { let m = 0; for (let c = 1; c < 4; c++) if (cnt[c] > cnt[m]) m = c; cls[i] = m; } }
// Rand (größte COLOR-Komponente außerhalb Petrol) in hell (3) und dunkel (4) teilen; Buchstaben-Pink bleibt 3 -> später 5
const LIGHT = [[232,[0xff,0x73,0xac]],[520,[0xff,0x85,0xbc]],[760,[0xff,0x95,0xcc]],[1000,[0xff,0xa0,0xda]],[1240,[0xf3,0xa9,0xe4]],[1480,[0xd8,0xb2,0xf3]],[1600,[0xca,0xb8,0xfb]]];
const DARK = [[328,[0xde,0x4b,0x86]],[520,[0xe1,0x54,0x96]],[808,[0xe5,0x60,0xad]],[1000,[0xc8,0x65,0xc9]],[1240,[0xaa,0x6b,0xe6]],[1480,[0x95,0x71,0xfb]],[1600,[0x93,0x6f,0xfa]]];
const lerpStops = (S, x) => { if (x <= S[0][0]) return S[0][1]; for (let i = 1; i < S.length; i++) if (x <= S[i][0]) { const t = (x - S[i-1][0]) / (S[i][0] - S[i-1][0]); return S[i-1][1].map((v, k) => v + t * (S[i][1][k] - v)); } return S.at(-1)[1]; };
globalThis.LIGHT = LIGHT; globalThis.DARK = DARK;
{ const cc = new Int32Array(w*h).fill(-1); let best = -1, bestN = 0, id = 0;
  for (let s0 = 0; s0 < w*h; s0++) { if (cls[s0] !== 3 || cc[s0] >= 0) continue; const st = [s0]; cc[s0] = id; let n = 0; while (st.length) { const p = st.pop(); n++; const x = p % w, y = (p/w)|0; for (const q of [x>0?p-1:-1, x<w-1?p+1:-1, y>0?p-w:-1, y<h-1?p+w:-1]) if (q >= 0 && cc[q] < 0 && cls[q] === 3) { cc[q] = id; st.push(q); } } if (n > bestN) { bestN = n; best = id; } id++; }
  for (let i = 0; i < w*h; i++) { if (cls[i] !== 3) continue; if (cc[i] !== best) { cls[i] = 5; continue; } const x = i % w; const r = data[i*4], g = data[i*4+1], b = data[i*4+2]; const L = lerpStops(LIGHT, x), D = lerpStops(DARK, x); const dl = (r-L[0])**2+(g-L[1])**2+(b-L[2])**2, dd = (r-D[0])**2+(g-D[1])**2+(b-D[2])**2; cls[i] = dl <= dd ? 3 : 4; } }
const comp = new Int32Array(w*h).fill(-1); const comps = [];
for (let s = 0; s < w*h; s++) { if (comp[s] >= 0) continue; const c = cls[s], id = comps.length; const st = [s]; comp[s] = id; let n = 0, x0=w,y0=h,x1=0,y1=0;
  while (st.length) { const p = st.pop(); n++; const x = p % w, y = (p/w)|0; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    for (const q of [x>0?p-1:-1, x<w-1?p+1:-1, y>0?p-w:-1, y<h-1?p+w:-1]) if (q >= 0 && comp[q] < 0 && cls[q] === c) { comp[q] = id; st.push(q); } }
  comps.push({ id, cls: c, n, box: [x0,y0,x1,y1] }); }
function loopsOf(id) {
  const out = new Map(); const ins = (x,y) => x>=0&&y>=0&&x<w&&y<h&&comp[y*w+x]===id;
  const add = (ax,ay,bx,by,d) => { const k = ay*(w+1)+ax; if (!out.has(k)) out.set(k, []); out.get(k).push([bx,by,d]); };
  const c = comps[id];
  for (let y = c.box[1]; y <= c.box[3]; y++) for (let x = c.box[0]; x <= c.box[2]; x++) { if (!ins(x,y)) continue;
    if (!ins(x,y-1)) add(x,y,x+1,y,0); if (!ins(x+1,y)) add(x+1,y,x+1,y+1,1); if (!ins(x,y+1)) add(x+1,y+1,x,y+1,2); if (!ins(x-1,y)) add(x,y+1,x,y,3); }
  const loops = [];
  for (const [k0, lst0] of out) while (lst0.length) {
    const pts = []; let k = k0, prevd = lst0[0][2], ax = k0%(w+1), ay = (k0/(w+1))|0;
    for (let g = 0; g < 1e7; g++) { const lst = out.get(k); if (!lst || !lst.length) break; let idx = 0;
      if (lst.length > 1) for (const wd of [(prevd+1)%4, prevd, (prevd+3)%4]) { const j = lst.findIndex(e => e[2] === wd); if (j >= 0) { idx = j; break; } }
      const [bx,by,d] = lst.splice(idx,1)[0]; pts.push([ax,ay]); ax = bx; ay = by; prevd = d; k = by*(w+1)+bx; if (k === k0) break; }
    let A = 0; for (let i = 0; i < pts.length; i++) { const [x1,y1] = pts[i], [x2,y2] = pts[(i+1)%pts.length]; A += x1*y2-x2*y1; }
    loops.push({ pts, area: A/2 }); }
  return loops;
}
const fitLine = P => { let mx=0,my=0; for (const [x,y] of P) { mx+=x; my+=y; } mx/=P.length; my/=P.length; let sxx=0,syy=0,sxy=0; for (const [x,y] of P) { sxx+=(x-mx)**2; syy+=(y-my)**2; sxy+=(x-mx)*(y-my); } const th = 0.5*Math.atan2(2*sxy, sxx-syy); const dx = Math.cos(th), dy = Math.sin(th); let md = 0; for (const [x,y] of P) md = Math.max(md, Math.abs((x-mx)*dy-(y-my)*dx)); return { mx, my, dx, dy, md }; };
const inter = (L1, L2) => { const det = L1.dx*(-L2.dy) - L1.dy*(-L2.dx); if (Math.abs(det) < 1e-9) return null; const t = ((L2.mx-L1.mx)*(-L2.dy) - (L2.my-L1.my)*(-L2.dx))/det; return [L1.mx+t*L1.dx, L1.my+t*L1.dy]; };
const proj = (L, p) => { const t = (p[0]-L.mx)*L.dx + (p[1]-L.my)*L.dy; return [L.mx+t*L.dx, L.my+t*L.dy]; };
// Douglas-Peucker offen
function dpOpen(P, eps) { const keep = [0, P.length-1]; const rec = (a,b) => { const A = P[a], B = P[b]; const len = Math.hypot(B[0]-A[0], B[1]-A[1]) || 1; let md = -1, mi = -1; for (let i = a+1; i < b; i++) { const d = Math.abs((B[0]-A[0])*(A[1]-P[i][1]) - (A[0]-P[i][0])*(B[1]-A[1]))/len; if (d > md) { md = d; mi = i; } } if (md > eps) { keep.push(mi); rec(a, mi); rec(mi, b); } }; rec(0, P.length-1); return keep.sort((a,b)=>a-b); }
// Bézier-Fit (Schneider)
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], addv=(a,b)=>[a[0]+b[0],a[1]+b[1]], mul=(a,s)=>[a[0]*s,a[1]*s], dot=(a,b)=>a[0]*b[0]+a[1]*b[1], nrm=a=>{const l=Math.hypot(a[0],a[1])||1; return [a[0]/l,a[1]/l];};
const bez = (c, t) => { const u = 1-t; return [u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0], u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]]; };
function fitCubic(P, t1, t2, maxErr, out) {
  if (P.length === 2) { const d = Math.hypot(...sub(P[1],P[0]))/3; out.push([P[0], addv(P[0], mul(t1,d)), addv(P[1], mul(t2,d)), P[1]]); return; }
  let u = [0]; for (let i = 1; i < P.length; i++) u.push(u[i-1] + Math.hypot(...sub(P[i],P[i-1]))); u = u.map(v => v/u.at(-1));
  const gen = u => { let C = [[0,0],[0,0]], X = [0,0]; const p0 = P[0], p3 = P.at(-1);
    for (let i = 0; i < P.length; i++) { const t = u[i], b1 = 3*t*(1-t)**2, b2 = 3*t*t*(1-t), A1 = mul(t1,b1), A2 = mul(t2,b2);
      C[0][0]+=dot(A1,A1); C[0][1]+=dot(A1,A2); C[1][1]+=dot(A2,A2); const tmp = sub(P[i], addv(mul(p0,(1-t)**3+b1), mul(p3,b2+t**3))); X[0]+=dot(A1,tmp); X[1]+=dot(A2,tmp); }
    C[1][0]=C[0][1]; const det = C[0][0]*C[1][1]-C[0][1]*C[1][0]; let a1 = det ? (X[0]*C[1][1]-X[1]*C[0][1])/det : 0, a2 = det ? (C[0][0]*X[1]-C[1][0]*X[0])/det : 0;
    const seg = Math.hypot(...sub(p3,p0)); if (a1 < seg*1e-3 || a2 < seg*1e-3) a1 = a2 = seg/3; return [p0, addv(p0,mul(t1,a1)), addv(p3,mul(t2,a2)), p3]; };
  let c = gen(u);
  for (let it = 0; it < 6; it++) { // Newton
    u = u.map((t, i) => { const q = bez(c,t), q1 = [3*((1-t)**2*(c[1][0]-c[0][0])+2*(1-t)*t*(c[2][0]-c[1][0])+t*t*(c[3][0]-c[2][0])), 3*((1-t)**2*(c[1][1]-c[0][1])+2*(1-t)*t*(c[2][1]-c[1][1])+t*t*(c[3][1]-c[2][1]))];
      const q2 = [6*((1-t)*(c[2][0]-2*c[1][0]+c[0][0])+t*(c[3][0]-2*c[2][0]+c[1][0])), 6*((1-t)*(c[2][1]-2*c[1][1]+c[0][1])+t*(c[3][1]-2*c[2][1]+c[1][1]))];
      const d = sub(q, P[i]); const den = dot(q1,q1)+dot(d,q2); return den ? Math.min(1, Math.max(0, t - dot(d,q1)/den)) : t; });
    c = gen(u); }
  let me = 0, mi = 0; for (let i = 0; i < P.length; i++) { const e = Math.hypot(...sub(bez(c,u[i]), P[i])); if (e > me) { me = e; mi = i; } }
  if (me <= maxErr || P.length < 6) { out.push(c); return; }
  mi = Math.max(2, Math.min(P.length-3, mi)); const tc = nrm(sub(P[mi-1], P[mi+1]));
  fitCubic(P.slice(0, mi+1), t1, tc, maxErr, out); fitCubic(P.slice(mi), mul(tc,-1), t2, maxErr, out);
}
const R = v => +v.toFixed(2);
function vectorizeLoop(pts) {
  const n = pts.length; const M = pts.map((p,i) => { const q = pts[(i+1)%n]; return [(p[0]+q[0])/2, (p[1]+q[1])/2]; });
  // Start an einer markanten Ecke: Punkt mit größtem Richtungswechsel über 6 Punkte
  let best = 0, bi = 0; for (let i = 0; i < n; i++) { const a = M[(i-6+n)%n], b = M[i], c = M[(i+6)%n]; const v1 = nrm(sub(b,a)), v2 = nrm(sub(c,b)); const tw = 1 - dot(v1,v2); if (tw > best) { best = tw; bi = i; } }
  const P = []; for (let i = 0; i <= n; i++) P.push(M[(bi+i)%n]);
  let far = 0, fd = -1; for (let i = 0; i < P.length; i++) { const d = Math.hypot(...sub(P[i], P[0])); if (d > fd) { fd = d; far = i; } }
  const idx = [...dpOpen(P.slice(0, far+1), 0.9), ...dpOpen(P.slice(far), 0.9).map(i => i + far)].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const trim = pts => { const A = pts[0], B = pts.at(-1); const r = pts.filter(p => Math.hypot(...sub(p, A)) > 3 && Math.hypot(...sub(p, B)) > 3); return r.length >= 4 ? r : pts; };
  const rms = (L, pts) => Math.sqrt(pts.reduce((s, [x, y]) => s + ((x-L.mx)*L.dy-(y-L.my)*L.dx)**2, 0) / pts.length);
  const segs = []; for (let s = 0; s+1 < idx.length; s++) { const a = idx[s], b = idx[s+1]; const pts = P.slice(a, b+1); const len = Math.hypot(...sub(pts.at(-1), pts[0])); const inner = trim(pts); const L = fitLine(inner); segs.push({ a, b, len, L, ok: len >= 8 && rms(L, inner) <= 0.45 && L.md <= 1.0 }); }
  // Gerade nur, wenn lang oder an beiden Enden ein deutlicher Knick (sonst Teil einer Kurve)
  const dirOf = s => { const A = P[s.a], B = P[s.b]; return nrm(sub(B, A)); };
  for (let i = 0; i < segs.length; i++) { const s = segs[i], pv = segs[(i-1+segs.length)%segs.length], nx = segs[(i+1)%segs.length];
    const a1 = Math.acos(Math.max(-1, Math.min(1, dot(dirOf(pv), dirOf(s))))) * 180/Math.PI, a2 = Math.acos(Math.max(-1, Math.min(1, dot(dirOf(s), dirOf(nx))))) * 180/Math.PI;
    s.line = s.ok && (s.len >= 40 || Math.min(a1, a2) >= 30 || (s.len >= 18 && Math.max(a1, a2) >= 40)); }
  // kollineare Geraden zusammenlegen
  for (let i = 0; i+1 < segs.length; i++) { const s = segs[i], t = segs[i+1]; if (s.line && t.line && Math.abs(s.L.dx*t.L.dy - s.L.dy*t.L.dx) < 0.03) { const pts = P.slice(s.a, t.b+1); const L = fitLine(pts.slice(1,-1)); if (L.md <= 0.9) { segs.splice(i, 2, { a: s.a, b: t.b, len: s.len+t.len, L, line: true }); i--; } } }
  // Läufe bauen: Geraden und Kurvenstücke
  const runs = []; for (const s of segs) { if (s.line) runs.push({ type: 'L', a: s.a, b: s.b, L: s.L }); else if (runs.length && runs.at(-1).type === 'C') runs.at(-1).b = s.b; else runs.push({ type: 'C', a: s.a, b: s.b }); }
  // sehr kurze Kurvenstücke zwischen zwei Geraden entfernen (abgerundete Ecken durch Kantenglättung)
  for (let i = 0; i < runs.length; i++) { const r = runs[i]; if (r.type !== 'C') continue; const pl = runs[(i-1+runs.length)%runs.length], nx = runs[(i+1)%runs.length];
    const span = Math.hypot(...sub(P[Math.min(r.b, P.length-1)], P[Math.max(0, r.a)])); if (pl.type === 'L' && nx.type === 'L' && span < 10 && Math.abs(pl.L.dx*nx.L.dy - pl.L.dy*nx.L.dx) > 0.2) { runs.splice(i, 1); i--; } }
  // zyklisch: erstes und letztes Kurvenstück verbinden
  if (runs.length > 1 && runs[0].type === 'C' && runs.at(-1).type === 'C') { const last = runs.pop(); runs[0] = { type: 'C', a: last.a - P.length + 1, b: runs[0].b }; }
  const at = i => P[((i % (P.length-1)) + (P.length-1)) % (P.length-1)];
  // Knoten: zwischen zwei Geraden = Schnittpunkt; Gerade->Kurve = Projektion
  const K = runs.length; const nodes = [];
  for (let r = 0; r < K; r++) { const A = runs[r], B = runs[(r+1)%K];
    if (A.type === 'L' && B.type === 'L') { const X = inter(A.L, B.L); nodes.push(X && Math.hypot(...sub(X, at(A.b))) < 6 ? X : at(A.b)); }
    else if (A.type === 'L') nodes.push(proj(A.L, at(A.b))); else if (B.type === 'L') nodes.push(proj(B.L, at(B.a))); else nodes.push(at(A.b)); }
  // Pfad: Knoten r ist Ende von Lauf r
  let d = ''; const startNode = nodes[K-1]; d += `M${R(startNode[0])} ${R(startNode[1])}`; const cmds = [];
  for (let r = 0; r < K; r++) { const run = runs[r], end = nodes[r], beg = nodes[(r-1+K)%K];
    if (run.type === 'L') { d += `L${R(end[0])} ${R(end[1])}`; cmds.push(['L', beg, end]); }
    else { const pts = [beg]; for (let i = run.a+1; i < run.b; i++) pts.push(at(i)); pts.push(end);
      const prev = runs[(r-1+K)%K], next = runs[(r+1)%K];
      let t1 = nrm(sub(pts[Math.min(3, pts.length-1)], pts[0])), t2 = nrm(sub(pts[Math.max(0, pts.length-4)], pts.at(-1)));
      if (prev.type === 'L') { const dir = [prev.L.dx, prev.L.dy]; const s = dot(dir, t1) >= 0 ? 1 : -1; if (Math.abs(dot(dir, t1)) > 0.93) t1 = mul(dir, s); }
      if (next.type === 'L') { const dir = [next.L.dx, next.L.dy]; const s = dot(dir, t2) >= 0 ? 1 : -1; if (Math.abs(dot(dir, t2)) > 0.93) t2 = mul(dir, s); }
      const sm = pts.map((p, i) => { if (i === 0 || i === pts.length-1) return p; let sx = 0, sy = 0, sw = 0; for (let k = -3; k <= 3; k++) { const j = Math.max(0, Math.min(pts.length-1, i+k)); const wk = Math.exp(-k*k/4.5); sx += pts[j][0]*wk; sy += pts[j][1]*wk; sw += wk; } return [sx/sw, sy/sw]; }); const out = []; fitCubic(sm, t1, t2, 0.6, out); for (const c of out) { d += `C${R(c[1][0])} ${R(c[1][1])} ${R(c[2][0])} ${R(c[2][1])} ${R(c[3][0])} ${R(c[3][1])}`; cmds.push(['C', ...c]); } } }
  return { d: d + 'Z', cmds, nodes: nodes.map(p => p.map(R)) };
}
const res = [];
for (const c of comps) { if (c.n < 300) continue;  if (c.cls === 0 && c.n > 500000) continue;
  const loops = loopsOf(c.id).filter(l => Math.abs(l.area) > 150).map(l => ({ area: l.area, ...vectorizeLoop(l.pts) }));
  res.push({ id: c.id, cls: ['BG','TEAL','WHITE','LIGHT','DARK','PINK'][c.cls], n: c.n, box: c.box, loops }); }
fs.writeFileSync(`${SP}/vec.json`, JSON.stringify(res, null, 0));
for (const c of res) { console.log(`#${c.id} ${c.cls} n=${c.n} box=${c.box}`); for (const L of c.loops) console.log(`  area=${L.area} cmds=${L.cmds.length} L=${L.cmds.filter(x=>x[0]==='L').length}`); }

const fills = { BG: '#17131b', TEAL: '#003f4e', WHITE: '#ffffff', LIGHT: 'url(#gl)', DARK: 'url(#gd)', PINK: '#ff73a9' };
const stops = S => S.map(([x, c]) => `<stop offset="${(x/2000).toFixed(4)}" stop-color="rgb(${c.map(Math.round).join(',')})"/>`).join('');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="937" viewBox="0 0 2000 937"><defs><linearGradient id="gl" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2000" y2="0">${stops(LIGHT)}</linearGradient><linearGradient id="gd" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2000" y2="0">${stops(DARK)}</linearGradient></defs><rect width="2000" height="937" fill="#17131b"/>`;
const order = ['LIGHT','DARK','TEAL','PINK','WHITE','BG'];
for (const k of order) for (const c of res.filter(c => c.cls === k)) svg += `<path fill="${fills[k]}" fill-rule="evenodd" d="${c.loops.map(l => l.d).join('')}"/>`;
svg += '</svg>'; fs.writeFileSync(`${SP}/auto.svg`, svg); console.log('svg', svg.length);
