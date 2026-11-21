// Pfad-Werkzeuge: Befehle [['M',p],['L',p],['C',c1,c2,p],['Z']], Kurven aus ref.json, Ecken säubern, Bézier teilen, SVG-Ausgabe.
import fs from 'node:fs';
import { crossing } from './measure.mjs';
export const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], add=(a,b)=>[a[0]+b[0],a[1]+b[1]], mul=(a,s)=>[a[0]*s,a[1]*s], dot=(a,b)=>a[0]*b[0]+a[1]*b[1], nrm=a=>{const l=Math.hypot(a[0],a[1])||1; return [a[0]/l,a[1]/l];}, dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const bez = (c, t) => { const u = 1-t; return [u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0], u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1]]; };
export const bezd = (c, t) => { const u = 1-t; return [3*(u*u*(c[1][0]-c[0][0])+2*u*t*(c[2][0]-c[1][0])+t*t*(c[3][0]-c[2][0])), 3*(u*u*(c[1][1]-c[0][1])+2*u*t*(c[2][1]-c[1][1])+t*t*(c[3][1]-c[2][1]))]; };
export function splitBez(c, t) { const l = (a, b) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; const p01 = l(c[0],c[1]), p12 = l(c[1],c[2]), p23 = l(c[2],c[3]), a = l(p01,p12), b = l(p12,p23), m = l(a,b); return [[c[0],p01,a,m],[m,b,p23,c[3]]]; }
const REF = JSON.parse(fs.readFileSync(SP + '/ref.json'));
export function refSegs(id, li = 0) { const c = REF.find(c => c.id === id); if (!c) throw new Error('kein Bereich ' + id); return c.loops[li].segs; }
// Segmentliste -> flache Liste von Teilstücken {t:'L',p0,p1} | {t:'C',c}
export function pieces(segs) { const out = []; for (const s of segs) { if (s.t === 'L') out.push({ t: 'L', p0: s.p0, p1: s.p1 }); else for (const c of s.cs) out.push({ t: 'C', c }); } return out; }
const pStart = q => q.t === 'L' ? q.p0 : q.c[0], pEnd = q => q.t === 'L' ? q.p1 : q.c[3];
// Teilstücke zwischen den Knoten nächst a und nächst b (vorwärts entlang der Schleife)
export function between(id, li, a, b) {
  const P = pieces(refSegs(id, li)); const n = P.length; let ia = 0, ib = 0, da = 1e9, db = 1e9;
  for (let i = 0; i < n; i++) { const s = pStart(P[i]), e = pEnd(P[i]); if (dist(s, a) < da) { da = dist(s, a); ia = i; } if (dist(e, b) < db) { db = dist(e, b); ib = i; } }
  if (da > 6 || db > 6) console.warn('between: Knoten weit weg', id, a, da.toFixed(1), b, db.toFixed(1));
  const out = []; for (let i = ia; ; i = (i + 1) % n) { out.push(P[i]); if (i === ib) break; } return out;
}
export function reversePieces(P) { return P.slice().reverse().map(q => q.t === 'L' ? { t: 'L', p0: q.p1, p1: q.p0 } : { t: 'C', c: [q.c[3], q.c[2], q.c[1], q.c[0]] }); }
// Teilstücke -> Befehle (setzt Anfang/Ende auf gegebene Punkte, falls angegeben)
export function cmdsOf(P, from, to) { const C = []; P.forEach((q, i) => { let s = pStart(q), e = pEnd(q); if (i === 0 && from) s = from; if (i === P.length-1 && to) e = to;
  if (i === 0) C.push(['M', s]); if (q.t === 'L') C.push(['L', e]); else { let c1 = q.c[1], c2 = q.c[2]; if (i === 0 && from) c1 = add(c1, sub(from, q.c[0])); if (i === P.length-1 && to) c2 = add(c2, sub(to, q.c[3])); C.push(['C', c1, c2, e]); } }); return C; }
// Kurve zwischen zwei Punkten aus Bildmessung neu fitten: Leitpunkte entlang alter Teilstücke, Querschnitte messen, Bézier mit Tangenten
export function refit(P, from, to, t0, t1, tol = 0.25) {
  const guide = []; for (const q of P) { if (q.t === 'L') { const L = dist(q.p0, q.p1), k = Math.max(2, Math.ceil(L/1.5)); const d = nrm(sub(q.p1, q.p0)); for (let i = 0; i < k; i++) guide.push([add(q.p0, mul(sub(q.p1, q.p0), i/k)), d]); }
    else { const L = dist(q.c[0], q.c[3]), k = Math.max(4, Math.ceil(L/1.5)); for (let i = 0; i < k; i++) { const t = i/k; guide.push([bez(q.c, t), nrm(bezd(q.c, t))]); } } }
  const pts = [from]; for (const [p, d] of guide) { if (dist(p, from) < 2.5 || dist(p, to) < 2.5) continue; const n = [-d[1], d[0]]; const s = crossing(p, n, 4); if (s !== null) pts.push(add(p, mul(n, s))); } pts.push(to);
  // Ausreißer glätten
  const out = []; fitCubic(pts, t0 || nrm(sub(pts[Math.min(3, pts.length-1)], pts[0])), t1 || nrm(sub(pts[Math.max(0, pts.length-4)], pts.at(-1))), tol, out);
  return out.map(c => ({ t: 'C', c }));
}
export function fitCubic(P, t1, t2, maxErr, out, depth = 0) {
  let u = [0]; for (let i = 1; i < P.length; i++) u.push(u[i-1] + dist(P[i], P[i-1])); const total = u.at(-1); u = u.map(v => v/total);
  const gen = u => { let C = [[0,0],[0,0]], X = [0,0]; const p0 = P[0], p3 = P.at(-1);
    for (let i = 0; i < P.length; i++) { const t = u[i], b1 = 3*t*(1-t)**2, b2 = 3*t*t*(1-t), A1 = mul(t1,b1), A2 = mul(t2,b2); C[0][0]+=dot(A1,A1); C[0][1]+=dot(A1,A2); C[1][1]+=dot(A2,A2); const tmp = sub(P[i], add(mul(p0,(1-t)**3+b1), mul(p3,b2+t**3))); X[0]+=dot(A1,tmp); X[1]+=dot(A2,tmp); }
    C[1][0]=C[0][1]; const det = C[0][0]*C[1][1]-C[0][1]*C[1][0]; let a1 = det ? (X[0]*C[1][1]-X[1]*C[0][1])/det : 0, a2 = det ? (C[0][0]*X[1]-C[1][0]*X[0])/det : 0;
    const seg = dist(p3,p0); if (a1 < seg*1e-3 || a2 < seg*1e-3) a1 = a2 = seg/3; return [p0, add(p0,mul(t1,a1)), add(p3,mul(t2,a2)), p3]; };
  let c = gen(u);
  for (let it = 0; it < 16; it++) { u = u.map((t, i) => { const q = bez(c,t), q1 = bezd(c,t); const d = sub(q, P[i]); const den = dot(q1,q1); return den ? Math.min(1, Math.max(0, t - dot(d,q1)/den)) : t; }); c = gen(u); }
  let me = 0, mi = 0; for (let i = 0; i < P.length; i++) { const e = dist(bez(c,u[i]), P[i]); if (e > me) { me = e; mi = i; } }
  if (me <= maxErr || P.length < 10 || depth > 5) { out.push(c); return; }
  mi = Math.max(4, Math.min(P.length-5, mi)); const tc = nrm(sub(P[mi-3], P[mi+3]));
  fitCubic(P.slice(0, mi+1), t1, tc, maxErr, out, depth+1); fitCubic(P.slice(mi), mul(tc,-1), t2, maxErr, out, depth+1);
}
// Säubern: kurze Kurvenstücke zwischen zwei Geraden mit Knick -> Ecke (Schnittpunkt)
export function clean(P) {
  const lines = P.map(q => q.t === 'L' ? { mx: q.p0[0], my: q.p0[1], dx: nrm(sub(q.p1,q.p0))[0], dy: nrm(sub(q.p1,q.p0))[1], len: dist(q.p0,q.p1) } : null);
  let out = P.slice(), changed = true;
  while (changed) { changed = false; const n = out.length;
    for (let i = 0; i < n; i++) { if (out[i].t !== 'C') continue; let j = i; let span = 0; while (out[j % n].t === 'C') { span += dist(out[j%n].c[0], out[j%n].c[3]); j++; if (j - i > n) break; }
      const prev = out[(i-1+n)%n], next = out[j%n]; if (prev.t !== 'L' || next.t !== 'L' || span > 12) continue;
      const d1 = nrm(sub(prev.p1, prev.p0)), d2 = nrm(sub(next.p1, next.p0)); if (Math.abs(d1[0]*d2[1]-d1[1]*d2[0]) < 0.25) continue;
      const det = d1[0]*(-d2[1]) - d1[1]*(-d2[0]); const t = ((next.p0[0]-prev.p0[0])*(-d2[1]) - (next.p0[1]-prev.p0[1])*(-d2[0]))/det; const X = [prev.p0[0]+t*d1[0], prev.p0[1]+t*d1[1]];
      const k = j - i; const np = { t: 'L', p0: prev.p0, p1: X }, nn = { t: 'L', p0: X, p1: next.p1 };
      const arr = []; for (let m = 0; m < n; m++) { const idx = (i + m) % n; if (m < k) continue; arr.push(out[idx]); }
      // arr beginnt bei next; prev ist arr.at(-1)
      arr[0] = nn; arr[arr.length-1] = np; out = arr; changed = true; break; } }
  return out;
}
export function loopCmds(P) { const C = cmdsOf(P); C.push(['Z']); return C; }
export const f2 = v => +v.toFixed(2);
export function svgD(cmds) { return cmds.map(k => k[0] === 'M' ? `M${f2(k[1][0])} ${f2(k[1][1])}` : k[0] === 'L' ? `L${f2(k[1][0])} ${f2(k[1][1])}` : k[0] === 'C' ? `C${f2(k[1][0])} ${f2(k[1][1])} ${f2(k[2][0])} ${f2(k[2][1])} ${f2(k[3][0])} ${f2(k[3][1])}` : 'Z').join(''); }
export function polyCmds(pts) { const C = [['M', pts[0]]]; for (let i = 1; i < pts.length; i++) C.push(['L', pts[i]]); C.push(['Z']); return C; }
