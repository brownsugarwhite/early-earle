// Verfeinert die Schleifen aus vec.json auf Subpixel: Geraden neu gemessen, Kurven aus gemessenen Randpunkten neu gefittet.
import fs from 'node:fs';
import { crossing, measureLine, intersect } from './measure.mjs';
const V = JSON.parse(fs.readFileSync(SP + '/vec.json'));
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], addv=(a,b)=>[a[0]+b[0],a[1]+b[1]], mul=(a,s)=>[a[0]*s,a[1]*s], dot=(a,b)=>a[0]*b[0]+a[1]*b[1], nrm=a=>{const l=Math.hypot(a[0],a[1])||1; return [a[0]/l,a[1]/l];};
const bez = (c, t) => { const u = 1-t; return [u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0], u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]]; };
const bezd = (c, t) => { const u = 1-t; return [3*(u*u*(c[1][0]-c[0][0])+2*u*t*(c[2][0]-c[1][0])+t*t*(c[3][0]-c[2][0])), 3*(u*u*(c[1][1]-c[0][1])+2*u*t*(c[2][1]-c[1][1])+t*t*(c[3][1]-c[2][1]))]; };
function fitCubic(P, t1, t2, maxErr, out, depth = 0) {
  let u = [0]; for (let i = 1; i < P.length; i++) u.push(u[i-1] + Math.hypot(...sub(P[i],P[i-1]))); const total = u.at(-1); u = u.map(v => v/total);
  const gen = u => { let C = [[0,0],[0,0]], X = [0,0]; const p0 = P[0], p3 = P.at(-1);
    for (let i = 0; i < P.length; i++) { const t = u[i], b1 = 3*t*(1-t)**2, b2 = 3*t*t*(1-t), A1 = mul(t1,b1), A2 = mul(t2,b2); C[0][0]+=dot(A1,A1); C[0][1]+=dot(A1,A2); C[1][1]+=dot(A2,A2); const tmp = sub(P[i], addv(mul(p0,(1-t)**3+b1), mul(p3,b2+t**3))); X[0]+=dot(A1,tmp); X[1]+=dot(A2,tmp); }
    C[1][0]=C[0][1]; const det = C[0][0]*C[1][1]-C[0][1]*C[1][0]; let a1 = det ? (X[0]*C[1][1]-X[1]*C[0][1])/det : 0, a2 = det ? (C[0][0]*X[1]-C[1][0]*X[0])/det : 0;
    const seg = Math.hypot(...sub(p3,p0)); if (a1 < seg*1e-3 || a2 < seg*1e-3) a1 = a2 = seg/3; return [p0, addv(p0,mul(t1,a1)), addv(p3,mul(t2,a2)), p3]; };
  let c = gen(u);
  for (let it = 0; it < 12; it++) { u = u.map((t, i) => { const q = bez(c,t), q1 = bezd(c,t); const d = sub(q, P[i]); const den = dot(q1,q1); return den ? Math.min(1, Math.max(0, t - dot(d,q1)/den)) : t; }); c = gen(u); }
  let me = 0, mi = 0; for (let i = 0; i < P.length; i++) { const e = Math.hypot(...sub(bez(c,u[i]), P[i])); if (e > me) { me = e; mi = i; } }
  if (me <= maxErr || P.length < 8 || depth > 6) { out.push(c); return; }
  mi = Math.max(3, Math.min(P.length-4, mi)); const tc = nrm(sub(P[mi-2], P[mi+2]));
  fitCubic(P.slice(0, mi+1), t1, tc, maxErr, out, depth+1); fitCubic(P.slice(mi), mul(tc,-1), t2, maxErr, out, depth+1);
}
// Kurve verfeinern: Punkte entlang der alten Kurve, Querschnitt messen
function refineCurvePts(cs) {
  const pts = [];
  for (const c of cs) { const len = Math.max(4, Math.ceil(Math.hypot(...sub(c[3], c[0])) / 1.5));
    for (let i = 0; i < len; i++) { const t = i / len; const p = bez(c, t), d = nrm(bezd(c, t)); const n = [-d[1], d[0]]; const s = crossing(p, n, 4); pts.push(s === null ? p : addv(p, mul(n, s))); } }
  return pts;
}
export function refineLoop(cmds) {
  // Läufe: L einzeln, aufeinanderfolgende C zusammen
  const runs = []; for (const k of cmds) { if (k[0] === 'L') runs.push({ t: 'L', a: k[1], b: k[2] }); else { if (runs.length && runs.at(-1).t === 'C') runs.at(-1).cs.push(k.slice(1)); else runs.push({ t: 'C', cs: [k.slice(1)] }); } }
  if (runs.length > 1 && runs[0].t === 'C' && runs.at(-1).t === 'C') { const last = runs.pop(); runs[0].cs = [...last.cs, ...runs[0].cs]; }
  for (const r of runs) if (r.t === 'L') { const len = Math.hypot(...sub(r.b, r.a)); r.M = len > 6 ? measureLine(r.a, r.b, { from: len > 20 ? 0.15 : 0.25, to: len > 20 ? 0.85 : 0.75 }) : null; if (!r.M) { const d = nrm(sub(r.b, r.a)); r.M = { mx: r.a[0], my: r.a[1], dx: d[0], dy: d[1], res: -1 }; } }
  const K = runs.length; const nodes = [];
  for (let i = 0; i < K; i++) { const A = runs[i], B = runs[(i+1)%K];
    if (A.t === 'L' && B.t === 'L') { const X = intersect(A.M, B.M); nodes.push(X && Math.hypot(...sub(X, A.b)) < 8 ? X : A.b); }
    else if (A.t === 'L') { const p = B.cs[0][0]; const t = (p[0]-A.M.mx)*A.M.dx + (p[1]-A.M.my)*A.M.dy; nodes.push([A.M.mx + t*A.M.dx, A.M.my + t*A.M.dy]); }
    else if (B.t === 'L') { const p = A.cs.at(-1)[3]; const t = (p[0]-B.M.mx)*B.M.dx + (p[1]-B.M.my)*B.M.dy; nodes.push([B.M.mx + t*B.M.dx, B.M.my + t*B.M.dy]); }
    else nodes.push(A.cs.at(-1)[3]); }
  const segs = [];
  for (let i = 0; i < K; i++) { const r = runs[i], beg = nodes[(i-1+K)%K], end = nodes[i];
    if (r.t === 'L') { segs.push({ t: 'L', p0: beg, p1: end, res: r.M.res }); continue; }
    const P = [beg, ...refineCurvePts(r.cs).slice(2, -2), end];
    const prev = runs[(i-1+K)%K], next = runs[(i+1)%K];
    let t1 = nrm(sub(P[Math.min(4, P.length-1)], P[0])), t2 = nrm(sub(P[Math.max(0, P.length-5)], P.at(-1)));
    if (prev.t === 'L') { const d = [prev.M.dx, prev.M.dy]; if (Math.abs(dot(d, t1)) > 0.95) t1 = mul(d, Math.sign(dot(d, t1))); }
    if (next.t === 'L') { const d = [next.M.dx, next.M.dy]; if (Math.abs(dot(d, t2)) > 0.95) t2 = mul(d, Math.sign(dot(d, t2))); }
    const out = []; fitCubic(P, t1, t2, 0.35, out); segs.push({ t: 'C', cs: out }); }
  const f = v => +v.toFixed(2);
  let d = `M${f(nodes[K-1][0])} ${f(nodes[K-1][1])}`;
  for (const s of segs) { if (s.t === 'L') d += `L${f(s.p1[0])} ${f(s.p1[1])}`; else for (const c of s.cs) d += `C${f(c[1][0])} ${f(c[1][1])} ${f(c[2][0])} ${f(c[2][1])} ${f(c[3][0])} ${f(c[3][1])}`; }
  return { d: d + 'Z', segs, nodes };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = [];
  for (const c of V) { const loops = c.loops.map(L => ({ area: L.area, ...refineLoop(L.cmds) })); out.push({ id: c.id, cls: c.cls, n: c.n, box: c.box, loops: loops.map(l => ({ area: l.area, d: l.d, segs: l.segs })) }); }
  fs.writeFileSync(SP + '/ref.json', JSON.stringify(out));
  // SVG wie auto.svg, nur verfeinert
  const LIGHT = [[232,[0xff,0x73,0xac]],[520,[0xff,0x85,0xbc]],[760,[0xff,0x95,0xcc]],[1000,[0xff,0xa0,0xda]],[1240,[0xf3,0xa9,0xe4]],[1480,[0xd8,0xb2,0xf3]],[1600,[0xca,0xb8,0xfb]]];
  const DARK = [[328,[0xde,0x4b,0x86]],[520,[0xe1,0x54,0x96]],[808,[0xe5,0x60,0xad]],[1000,[0xc8,0x65,0xc9]],[1240,[0xaa,0x6b,0xe6]],[1480,[0x95,0x71,0xfb]],[1600,[0x93,0x6f,0xfa]]];
  const stops = S => S.map(([x, c]) => `<stop offset="${(x/2000).toFixed(4)}" stop-color="rgb(${c.join(',')})"/>`).join('');
  const fills = { BG: '#17131b', TEAL: '#003f4e', WHITE: '#ffffff', LIGHT: 'url(#gl)', DARK: 'url(#gd)', PINK: '#ff73a9' };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="937" viewBox="0 0 2000 937"><defs><linearGradient id="gl" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2000" y2="0">${stops(LIGHT)}</linearGradient><linearGradient id="gd" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2000" y2="0">${stops(DARK)}</linearGradient></defs><rect width="2000" height="937" fill="#17131b"/>`;
  for (const k of ['LIGHT','DARK','TEAL','PINK','WHITE','BG']) for (const c of out.filter(c => c.cls === k)) svg += `<path fill="${fills[k]}" fill-rule="evenodd" d="${c.loops.map(l => l.d).join('')}"/>`;
  fs.writeFileSync(new URL('./ref.svg', import.meta.url), svg + '</svg>');
  console.log('ok', out.length);
}
