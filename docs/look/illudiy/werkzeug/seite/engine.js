/* illudiy Intro-Engine: exakte Vektorflächen, je Fläche eine Ebene im Raum, Kamera mit Dolly-Zoom, Federn, Ballphysik. */
(function () {
'use strict';
const M = window.ILLUDIY_MODEL;
const K = Math.SQRT1_2, SZ = Math.sqrt(3) / 2, D2R = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
// Gedämpfte Feder: Lage bei Zeit t (s) für Sprung 0 -> 1, Anfangsgeschwindigkeit v0 (Einheiten/s)
function spring(t, zeta, omega, v0 = 0) {
  if (t <= 0) return 0;
  const x0 = -1; // Abweichung vom Ziel
  if (zeta < 1) { const wd = omega * Math.sqrt(1 - zeta * zeta); const A = x0, B = (v0 + zeta * omega * x0) / wd; return 1 + Math.exp(-zeta * omega * t) * (A * Math.cos(wd * t) + B * Math.sin(wd * t)); }
  const A = x0, B = v0 + omega * x0; return 1 + Math.exp(-omega * t) * (A + B * t);
}
// Ball: Fall aus Höhe h0 über der Ruhelage, Schwerkraft g, Stoßzahl e. Liefert Höhe, Geschwindigkeit, Stauchung.
function ball(t, h0, g, e, hops = 3) {
  if (t <= 0) return { z: h0, v: 0, sq: 0 };
  const t1 = Math.sqrt(2 * h0 / g); let v = g * t1;
  if (t < t1) return { z: h0 - 0.5 * g * t * t, v: -g * t, sq: 0 };
  let T = t1; const impacts = [[t1, v]];
  for (let k = 0; k < hops; k++) { v *= e; const d = 2 * v / g; if (t < T + d) { const tau = t - T; impacts.push(null); return { z: v * tau - 0.5 * g * tau * tau, v: v - g * tau, sq: squash(t, impacts.filter(Boolean)) }; } T += d; impacts.push([T, v]); }
  return { z: 0, v: 0, sq: squash(t, impacts.filter(Boolean)) };
  function squash(t, imps) { let s = 0; for (const [ti, vi] of imps) { const d = t - ti; if (d >= 0) s += clamp(vi / 2600, 0, 0.34) * Math.exp(-d * 13) * Math.cos(d * 34); } return s; }
}
// ---------- Projektion der Endkamera (Azimut 45°, Höhe 30°) und Heben auf Ebenen
const proj0 = P => [K * (P[0] + P[1]), K / 2 * (P[0] - P[1]) - SZ * P[2]];
const liftA = (x, y, b0) => { const a = x / K - b0; return [a, b0, (K / 2 * (a - b0) - y) / SZ]; };
const liftB = (x, y, a0) => { const b = x / K - a0; return [a0, b, (K / 2 * (a0 - b) - y) / SZ]; };
const liftH = (x, y, z0) => { const s = x / K, d = (y + SZ * z0) / (K / 2); return [(s + d) / 2, (s - d) / 2, z0]; };
const floorA = (x, y) => (x / K - 2 * y / K) / 2;
const floorB = (x, y) => (x / K + 2 * y / K) / 2;
const bez = (c, t) => { const u = 1 - t; return [u*u*u*c[0][0] + 3*u*u*t*c[1][0] + 3*u*t*t*c[2][0] + t*t*t*c[3][0], u*u*u*c[0][1] + 3*u*u*t*c[1][1] + 3*u*t*t*c[2][1] + t*t*t*c[3][1]]; };
function samplePath(cmds) { const out = []; let cur = null; for (const k of cmds) { if (k[0] === 'M') { cur = k[1]; out.push(cur); } else if (k[0] === 'L') { cur = k[1]; out.push(cur); } else if (k[0] === 'C') { for (let i = 1; i <= 10; i++) out.push(bez([cur, k[1], k[2], k[3]], i / 10)); cur = k[3]; } } return out; }
const lowest = cmds => samplePath(cmds).reduce((m, p) => p[1] > m[1] ? p : m, [0, -1e9]);
const F = Object.fromEntries(M.faces.map(f => [f.id, f])), P = M.pts;
// ---------- Ebenen je Fläche
const twist = (top, bot, y0, y1) => (x, y) => { const s = smooth((y - y0) / (y1 - y0)); const A = top(x, y), B = bot(x, y); return [mix(A[0], B[0], s), mix(A[1], B[1], s), mix(A[2], B[2], s)]; };
const S = {};
const bI1 = floorA(...P.i1BF), aI1 = floorB(...P.i1BF), zI1 = liftA(P.i1TF[0], P.i1TF[1], bI1)[2];
S['i1.left'] = { body: 'i1', lift: (x, y) => liftA(x, y, bI1) }; S['i1.right'] = { body: 'i1', lift: (x, y) => liftB(x, y, aI1) }; S['i1.top'] = { body: 'i1', lift: (x, y) => liftH(x, y, zI1) };
S['ll.barA'] = { body: 'll', lift: twist((x, y) => liftA(x, y, floorA(...P.barA_BL)), (x, y) => liftB(x, y, floorB(...P.barA_BL)), P.barA_TL[1], P.barA_BL[1]), twisted: true };
S['ll.sliver'] = { body: 'll', lift: twist((x, y) => liftB(x, y, floorB(...P.sl_BL)), (x, y) => liftA(x, y, floorA(...P.sl_BL)), P.sl_TL[1], P.sl_BL[1]), twisted: true };
S['ll.barB'] = { body: 'll', lift: twist((x, y) => liftA(x, y, floorA(...P.barB_BL)), (x, y) => liftB(x, y, floorB(...P.barB_BL)), P.barB_TL[1], P.barB_BL[1]), twisted: true };
S['ll.foot'] = { body: 'll', lift: (x, y) => liftA(x, y, floorA(...P.foot_BL)) };
S['ll.floor1'] = { body: 'll', lift: (x, y) => liftH(x, y, 0), hinge: [liftH(...P.foot_BL, 0), liftH(...P.f1R, 0)] };
S['ll.floor2'] = { body: 'll', lift: (x, y) => liftH(x, y, 0), hinge: [liftH(...P.barB_BL, 0), liftH(...P.barB_BR, 0)] };
const aU = floorB(...lowest(F['u.front'].cmds)), zU = liftB(P.uLT[0], P.uLT[1], aU)[2];
S['u.front'] = { body: 'u', lift: (x, y) => liftB(x, y, aU) }; S['u.backTop'] = { body: 'u', lift: (x, y) => liftH(x, y, zU) };
S['u.backSide'] = { body: 'u', lift: (x, y) => liftA(x, y, P.uLx / K - aU) }; S['u.side'] = { body: 'u', lift: (x, y) => liftA(x, y, P.uRx / K - aU) };
const aD = floorB(...lowest(F['D.front'].cmds)), bD = P.Dfx / K - aD, zD = liftA(P.DTL[0], P.DTL[1], bD)[2];
S['D.front'] = { body: 'D', lift: (x, y) => liftB(x, y, aD) }; S['D.bottom'] = S['D.front']; S['D.left'] = { body: 'D', lift: (x, y) => liftA(x, y, bD) }; S['D.top'] = { body: 'D', lift: (x, y) => liftH(x, y, zD) };
const a1 = floorB(...P.w1B), b2 = floorA(...P.stBL), a2 = floorB(...P.w2B);
S['i2.left'] = { body: 'i2', lift: (x, y) => liftB(x, y, a1) }; S['i2.stem'] = { body: 'i2', lift: (x, y) => liftA(x, y, b2) }; S['i2.right'] = { body: 'i2', lift: (x, y) => liftB(x, y, a2) };
const bY = floorA(...P.yB);
S['y.front'] = { body: 'y', lift: (x, y) => liftA(x, y, bY) }; S['y.right'] = { body: 'y', lift: (x, y) => liftB(x, y, P.yRx / K - bY) };
// Punkte als Kugeln
const d1 = M.dots.pink, d2 = M.dots.white;
const topPts = samplePath(F['i1.top'].cmds); const tc = topPts.reduce((s, p) => [s[0] + p[0] / topPts.length, s[1] + p[1] / topPts.length], [0, 0]);
const T1 = liftH(tc[0], tc[1], zI1); const dot1C = (() => { const s = d1.cx / K, dd = T1[0] - T1[1]; const a = (s + dd) / 2, b = (s - dd) / 2; return [a, b, (K / 2 * (a - b) - d1.cy) / SZ]; })();
const dot2C = (() => { const A = liftB(d2.cx, d2.cy, a1), B = liftB(d2.cx, d2.cy, a2); return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]; })();
// Flächen vorbereiten: 3D-Kontrollpunkte
const LET = []; const BODIES = {};
for (const f of M.faces) {
  if (f.group === 'frame' || f.group === 'reg') continue;
  if (f.id === 'i1.dot' || f.id === 'i2.dot') { LET.push({ f, dot: f.id === 'i1.dot' ? { C: dot1C, r: d1.r, body: 'i1dot' } : { C: dot2C, r: d2.r, body: 'i2dot' } }); continue; }
  const sp = S[f.id]; if (!sp) { console.warn('ohne Ebene', f.id); continue; }
  const c3 = f.cmds.map(k => k[0] === 'Z' ? ['Z'] : [k[0], ...k.slice(1).map(p => sp.lift(p[0], p[1]))]);
  const pts2 = samplePath(f.cmds); const xs = pts2.map(p => p[0]), ys = pts2.map(p => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const g = {}; if (f.fill === 'url(white)') { const cx = (box[0] + box[2]) / 2; g.white = [404, 622].map(yy => sp.lift(cx, yy)); g.cx = cx; }
  if (f.fill === 'url(dFront)') { const gg = M.gradients.dFront; g.d = [[gg.x1, gg.y1], [gg.x2, gg.y2]]; }
  let clip3 = null; if (f.clip === 'dBottom') clip3 = M.clips.dBottom.cmds.map(k => k[0] === 'Z' ? ['Z'] : [k[0], ...k.slice(1).map(p => sp.lift(p[0], p[1]))]);
  LET.push({ f, sp, c3, box, g, clip3 });
  (BODIES[sp.body] ||= []).push(...samplePath(f.cmds).map(p => sp.lift(p[0], p[1])));
}
const centroid3 = pts => pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length], [0, 0, 0]);
const ALL = Object.values(BODIES).flat(); const PIV = centroid3(ALL); const PIV2 = proj0(PIV);
const BODY2D = {}; for (const [k, pts] of Object.entries(BODIES)) { const c = centroid3(pts); BODY2D[k] = proj0([c[0], c[1], 0]); BODY2D[k][1] = proj0(c)[1]; }
// ---------- Rahmen (2D)
const P2 = d => new Path2D(d);
const svgD = cmds => cmds.map(k => k[0] === 'M' ? `M${k[1][0]} ${k[1][1]}` : k[0] === 'L' ? `L${k[1][0]} ${k[1][1]}` : k[0] === 'C' ? `C${k[1][0]} ${k[1][1]} ${k[2][0]} ${k[2][1]} ${k[3][0]} ${k[3][1]}` : 'Z').join('');
const RIM = P2(svgD(F.rimLight.cmds)), PLATE = P2(svgD(F.plate.cmds)), LIGHTCLIP = P2(svgD(M.clips.lightClip.cmds)), DARKCLIP = P2(svgD(M.clips.darkClip.cmds)), REG = P2(svgD(F.reg.cmds));
const plateSegs = (() => { const out = []; let cur, start; for (const k of F.plate.cmds) { if (k[0] === 'M') { cur = k[1]; start = cur; } else if (k[0] === 'L') { out.push(['L', cur, k[1]]); cur = k[1]; } else if (k[0] === 'C') { out.push(['C', cur, k[1], k[2], k[3]]); cur = k[3]; } else if (k[0] === 'Z') { out.push(['L', cur, start]); cur = start; } } return out; })();
const SWEEP = (() => { const e1 = P.e1, e2 = P.e2; const v = [(e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l]; })();
function sweepPath(d) { // Platte, verschoben entlang SWEEP um 0..d (Minkowski-Summe), alle Teilwege positiv orientiert
  const p = new Path2D(PLATE); const v = [SWEEP[0] * d, SWEEP[1] * d]; const add = (a) => [a[0] + v[0], a[1] + v[1]];
  const mt = new DOMMatrix([1, 0, 0, 1, v[0], v[1]]); p.addPath(PLATE, mt);
  for (const s of plateSegs) { const p0 = s[1], p1 = s.at(-1); const q = new Path2D(); let area;
    const pts = s[0] === 'L' ? [p0, p1] : samplePath([['M', p0], ['C', s[2], s[3], s[4]]]);
    const poly = [...pts, ...pts.slice().reverse().map(add)]; area = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const seq = area >= 0 ? poly : poly.slice().reverse(); q.moveTo(...seq[0]); for (const pt of seq.slice(1)) q.lineTo(...pt); q.closePath(); p.addPath(q); }
  return p; }
function diamonds(seeds, r) { const p = new Path2D(); for (const [cx, cy, k] of seeds) { const rr = Math.max(0, r * (k || 1)); if (rr <= 0) continue; p.moveTo(cx - 2 * rr, cy); p.lineTo(cx, cy - rr); p.lineTo(cx + 2 * rr, cy); p.lineTo(cx, cy + rr); p.closePath(); } return p; }
const SEEDS = ['i1', 'll', 'u', 'D', 'i2', 'y'].map(k => [...BODY2D[k], 1]);
// ---------- Kamera
function camera(st) {
  const ph = st.phi * D2R, el = st.el * D2R;
  const c = [Math.cos(el) * Math.cos(ph), -Math.cos(el) * Math.sin(ph), Math.sin(el)];
  const r = [Math.sin(ph), Math.cos(ph), 0], u = [-Math.cos(ph) * Math.sin(el), Math.sin(ph) * Math.sin(el), Math.cos(el)];
  const cr = Math.cos(st.roll * D2R), sr = Math.sin(st.roll * D2R);
  const fn = (W) => { const Q = [W[0] - PIV[0], W[1] - PIV[1], W[2] - PIV[2]]; const dep = c[0] * Q[0] + c[1] * Q[1] + c[2] * Q[2]; const f = 1 / Math.max(0.2, 1 - dep * st.persp);
    const x = (r[0] * Q[0] + r[1] * Q[1] + r[2] * Q[2]) * f * st.zoom, y = -(u[0] * Q[0] + u[1] * Q[1] + u[2] * Q[2]) * f * st.zoom; return [PIV2[0] + x * cr - y * sr + st.pan[0], PIV2[1] + x * sr + y * cr + st.pan[1]]; };
  fn.scaleAt = (W) => { const Q = [W[0] - PIV[0], W[1] - PIV[1], W[2] - PIV[2]]; const dep = c[0] * Q[0] + c[1] * Q[1] + c[2] * Q[2]; return st.zoom / Math.max(0.2, 1 - dep * st.persp); };
  return fn;
}
const FINAL = { phi: 45, el: 30, persp: 0, zoom: 1, roll: 0, pan: [0, 0] };
const FRAMEPTS = ALL.filter((_, i) => i % 3 === 0);
const TARGET = (() => { const ps = FRAMEPTS.map(proj0); const xs = ps.map(p => p[0]), ys = ps.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; })();
function framed(st) { // liefert Kamera mit weicher Bildführung: früh wird das Wort in die Zielbox eingepasst, am Ende gilt die Endabbildung
  const cam = camera(st); const w = st.frameW ?? 1; if (w >= 1) return cam;
  const ps = FRAMEPTS.map(cam); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of ps) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const tw = TARGET[2] - TARGET[0], th = TARGET[3] - TARGET[1]; const z = Math.min(tw * (st.fit ?? 1) / (x1 - x0), th * (st.fit ?? 1) * 1.25 / (y1 - y0), 1.6);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, tx = (TARGET[0] + TARGET[2]) / 2, ty = (TARGET[1] + TARGET[3]) / 2 + (st.lift ?? 0);
  const fn = (W) => { const p = cam(W); const q = [tx + (p[0] - cx) * z, ty + (p[1] - cy) * z]; return [mix(q[0], p[0], w), mix(q[1], p[1], w)]; };
  fn.scaleAt = (W) => cam.scaleAt(W) * mix(z, 1, w); return fn;
}
// ---------- Zeichnen
const C = M.colors, G = M.gradients;
function gradLin(ctx, p0, p1, stops) { const g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); for (const [o, c] of stops) g.addColorStop(o, c); return g; }
function drawScene(ctx, st) {
  const cam = framed(st.cam);
  const xf = (b) => { const h = st.rise[b] ?? 1; const off = st.off?.[b]; return (W) => [W[0] + (off ? off[0] : 0), W[1] + (off ? off[1] : 0), W[2] * h + (off ? off[2] : 0)]; };
  ctx.fillStyle = C.bg; ctx.fillRect(-4000, -4000, 10000, 10000);
  drawFrame(ctx, st);
  const passes = [{ swap: false, clip: null }]; if (st.wave) passes.push({ swap: true, clip: st.wave });
  for (const pass of passes) {
    ctx.save(); if (pass.clip) { ctx.clip(pass.clip); }
    for (const L of LET) drawLetterFace(ctx, L, cam, xf, st, pass.swap);
    ctx.restore();
  }
  if (st.reg > 0) { const s = st.reg, [cx, cy] = P.reg; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); ctx.fillStyle = C.reg; ctx.fill(REG, 'evenodd'); ctx.restore(); }
}
const KIND = { 'i1.left': 'A', 'i1.right': 'B', 'i1.top': 'H', 'll.barA': 'AB', 'll.sliver': 'BA', 'll.barB': 'AB', 'll.foot': 'A', 'll.floor1': 'H', 'll.floor2': 'H', 'u.front': 'B', 'u.backTop': 'H', 'u.backSide': 'A', 'u.side': 'A',
  'D.front': 'B', 'D.bottom': 'B', 'D.left': 'A', 'D.top': 'H', 'i2.left': 'B', 'i2.stem': 'A', 'i2.right': 'B', 'y.front': 'A', 'y.right': 'B' };
const KC = { A: '#58a6ff', B: '#ffad4a', H: '#62d987' };
function fillFor(ctx, L, cam, xf, st, swap) {
  const f = L.f; let fill = f.fill;
  if (st.analysis) { const k = KIND[f.id]; if (k === 'AB' || k === 'BA') { const pr = (p) => cam(xf(L.sp.body)(L.sp.lift(p[0], p[1]))); const cx = (L.box[0] + L.box[2]) / 2;
      return gradLin(ctx, pr([cx, L.box[1]]), pr([cx, L.box[3]]), k === 'AB' ? [[0, KC.A], [0.35, KC.A], [0.65, KC.B], [1, KC.B]] : [[0, KC.B], [0.35, KC.B], [0.65, KC.A], [1, KC.A]]); }
    return KC[k] || '#888'; }
  if (swap) { if (fill === C.pink) fill = 'url(white)'; else if (fill === 'url(white)' || fill === 'url(dFront)' || fill === C.white) fill = C.pink; }
  if (fill === 'url(white)') { const pr = (p) => cam(xf(L.sp.body)(p)); let a, b; const dy = st.sheen || 0;
    const src = L.g.white || [L.sp.lift((L.box[0] + L.box[2]) / 2, 404), L.sp.lift((L.box[0] + L.box[2]) / 2, 622)];
    if (dy) { const cx = (L.box[0] + L.box[2]) / 2; a = pr(L.sp.lift(cx, 404 + dy)); b = pr(L.sp.lift(cx, 622 + dy)); } else { a = pr(src[0]); b = pr(src[1]); }
    return gradLin(ctx, a, b, G.white.stops); }
  if (fill === 'url(dFront)') { const pr = (p) => cam(xf(L.sp.body)(L.sp.lift(p[0], p[1]))); const s = st.sheenD || 0; const d = [G.dFront.x2 - G.dFront.x1, G.dFront.y2 - G.dFront.y1]; const l = Math.hypot(...d);
    const o = [d[0] / l * s, d[1] / l * s]; return gradLin(ctx, pr([G.dFront.x1 + o[0], G.dFront.y1 + o[1]]), pr([G.dFront.x2 + o[0], G.dFront.y2 + o[1]]), G.dFront.stops); }
  return fill;
}
function tracePath(ctx, c3, pr) { ctx.beginPath(); for (const k of c3) { if (k[0] === 'M') ctx.moveTo(...pr(k[1])); else if (k[0] === 'L') ctx.lineTo(...pr(k[1])); else if (k[0] === 'C') { const a = pr(k[1]), b = pr(k[2]), c = pr(k[3]); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]); } else ctx.closePath(); } }
function drawLetterFace(ctx, L, cam, xf, st, swap) {
  if (L.dot) { const d = st.dots?.[L.dot.body]; if (!d || d.hide) return; const W = [L.dot.C[0], L.dot.C[1], L.dot.C[2] + (d.z || 0)]; const p = cam(W); const s = cam.scaleAt(W); const r = L.dot.r * s;
    const sq = d.sq || 0, sy = 1 - sq, sx = 1 / Math.max(0.3, sy); ctx.fillStyle = st.analysis ? '#9a95a3' : swap ? (L.f.fill === C.pink ? C.white : C.pink) : L.f.fill;
    ctx.beginPath(); ctx.ellipse(p[0], p[1] + r * (1 - sy), r * sx, r * sy, 0, 0, Math.PI * 2); ctx.fill(); return; }
  const tr0 = xf(L.sp.body); let tr = tr0; const hg = L.sp.hinge; const hh = st.rise[L.sp.body] ?? 1;
  if (hg && hh < 1) { const [A, B] = hg; const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]]; const dl = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    tr = (W) => { const t = ((W[0] - A[0]) * d[0] + (W[1] - A[1]) * d[1] + (W[2] - A[2]) * d[2]) / dl; const Q = [A[0] + d[0] * t, A[1] + d[1] * t, A[2] + d[2] * t]; const k = Math.max(0, hh); return tr0([Q[0] + (W[0] - Q[0]) * k, Q[1] + (W[1] - Q[1]) * k, Q[2] + (W[2] - Q[2]) * k]); }; }
  const pr = (W) => cam(tr(W));
  if ((st.rise[L.sp.body] ?? 1) <= 0.0005) return;
  ctx.save();
  if (L.clip3) { tracePath(ctx, L.clip3, pr); ctx.clip(); }
  tracePath(ctx, L.c3, pr); ctx.fillStyle = fillFor(ctx, L, cam, xf, st, swap); ctx.fill(L.f.evenodd ? 'evenodd' : 'nonzero');
  ctx.restore();
}
function drawFrame(ctx, st) {
  const fr = st.frame; if (!fr) return; const { plate = 0, rim = 0, shadow = 0, pulse = 1 } = fr; if (plate <= 0 && rim <= 0) return;
  ctx.save(); const [cx, cy] = PIV2; ctx.translate(cx, cy); ctx.scale(pulse, pulse); ctx.translate(-cx, -cy);
  const full = 1e4;
  if (rim > 0) { ctx.save(); ctx.clip(diamonds(SEEDS, rim >= 0.999 ? full : rim * 700)); ctx.save(); ctx.clip(LIGHTCLIP, 'evenodd'); ctx.fillStyle = gradLin(ctx, [G.rimLight.x1, 0], [G.rimLight.x2, 0], G.rimLight.stops); ctx.fill(RIM); ctx.restore();
    if (shadow > 0) { ctx.save(); ctx.clip(DARKCLIP); if (shadow < 0.999) ctx.clip(sweepPath(shadow * 230)); ctx.fillStyle = gradLin(ctx, [G.rimDark.x1, 0], [G.rimDark.x2, 0], G.rimDark.stops); ctx.fill(RIM); ctx.restore(); }
    ctx.restore(); }
  if (plate > 0) { ctx.save(); ctx.clip(diamonds(SEEDS, plate >= 0.999 ? full : plate * 560)); ctx.fillStyle = C.teal; ctx.fill(PLATE); ctx.restore(); }
  ctx.restore();
}
// ---------- Abläufe
function bandPoly(c0, w) { const p = new Path2D(); const y = (x, c) => -0.5 * x + c; p.moveTo(-200, y(-200, c0)); p.lineTo(2200, y(2200, c0)); p.lineTo(2200, y(2200, c0 + w)); p.lineTo(-200, y(-200, c0 + w)); p.closePath(); return p; }
const BODY_ORDER = ['i1', 'll', 'u', 'D', 'i2', 'y'];
function riseAll(t, t0, gap, zeta, omega) { const r = {}; BODY_ORDER.forEach((b, i) => { r[b] = Math.max(0, spring(t - t0 - i * gap, zeta, omega)); }); return r; }
const g = 2600; // Schwerkraft in Logo-Einheiten/s²
function dropDot(t, t0, h0, e, hops) { if (t < t0) return { hide: true }; const b = ball(t - t0, h0, g, e, hops); return { z: b.z, sq: b.sq + (b.z > 2 ? -clamp(Math.abs(b.v) / 9000, 0, 0.12) : 0) }; }
function settle(t, t1, t2, over) { // 0 -> 1: zuerst mit Schwung (ease-out) bis 1+over, dann weich zurück auf 1
  if (t <= 0) return 0; if (t < t1) return (1 + over) * easeOut(t / t1); return 1 + over * (1 - ease((t - t1) / (t2 - t1))); }
function camOrbit(t, o) { // Kamerafahrt mit Dolly-Zoom und Einrasten bei 45°/30°
  const u = t - (o.t0 || 0);
  return { phi: mix(o.phi0, 45, settle(u, o.t1 ?? 1.45, o.t2 ?? 2.05, o.over ?? 0.035)), el: mix(o.el0, 30, settle(u, (o.t1 ?? 1.45) - 0.1, (o.t2 ?? 2.05) - 0.1, o.overE ?? 0.015)),
    persp: o.p0 * (1 - ease(u / (o.flat ?? 1.9))), zoom: 1, roll: o.r0 * (1 - ease(u / 1.8)), pan: [0, 0], frameW: ease((u - (o.fw0 ?? 0.9)) / (o.fw1 ?? 1.0)), fit: o.fit ?? 0.92 };
}
const SEQ = {
  A: { name: 'Intro A · Einrasten', dur: 4.7, fn: (t, extra) => {
    const st = { cam: camOrbit(t, { phi0: 74, el0: 0, p0: 1 / 1300, r0: -3.5, fit: 0.96 }), rise: riseAll(t, 0.05, 0.075, 0.58, 8.2) };
    st.dots = { i1dot: dropDot(t, 1.45, 720, 0.42, 2), i2dot: dropDot(t, 1.715, 760, 0.38, 2) };
    st.frame = { plate: t > 2.35 ? Math.min(1, spring(t - 2.35, 0.9, 7.2)) : 0, rim: t > 2.56 ? Math.min(1, spring(t - 2.56, 0.9, 6.6)) : 0, shadow: t > 2.86 ? ease((t - 2.86) / 0.75) : 0, pulse: t > 2.78 ? 1 + 0.012 * Math.exp(-(t - 2.78) * 6) * Math.sin((t - 2.78) * 15) : 1 };
    st.sheen = 150 * (1 - easeOut((t - 3.0) / 1.15)); st.sheenD = -70 * (1 - easeOut((t - 3.0) / 1.15));
    st.reg = t > 3.85 ? Math.max(0, spring(t - 3.85, 0.5, 14)) : 0;
    if (extra) extra(t, st); return st; } },
  B: { name: 'Intro B · mit Kippwelle', dur: 5.3, fn: (t) => SEQ.A.fn(Math.min(t, 4.7), (tt, st) => { const w = t - 3.95; if (w > 0 && w < 1.2) { const c = mix(-160, 1900, ease(w / 1.15)); st.wave = bandPoly(c - 150, 150); } }) },
  K: { name: 'Kurzfassung', dur: 2.0, fn: (t) => { const st = { cam: FINAL, rise: riseAll(t, 0.0, 0.045, 0.6, 13) };
    st.dots = { i1dot: dropDot(t, 0.2, 720, 0.4, 2), i2dot: dropDot(t, 0.33, 760, 0.36, 2) };
    st.frame = { plate: t > 0.32 ? Math.min(1, spring(t - 0.32, 0.9, 11)) : 0, rim: t > 0.46 ? Math.min(1, spring(t - 0.46, 0.9, 10)) : 0, shadow: t > 0.7 ? ease((t - 0.7) / 0.55) : 0 };
    st.reg = t > 1.15 ? Math.max(0, spring(t - 1.15, 0.5, 15)) : 0; return st; } },
  T1: { name: 'Test 1 · Magischer Blickwinkel', dur: 3.6, fn: (t) => ({ cam: camOrbit(t, { phi0: 76, el0: 12, p0: 1 / 1500, r0: -2, t1: 1.9, t2: 2.7, over: 0.04, fw0: 1.2, fw1: 1.3, flat: 2.4, fit: 0.92 }), rise: {}, dots: { i1dot: {}, i2dot: {} } }) },
  T2: { name: 'Test 2 · Aus dem Boden', dur: 2.3, fn: (t) => ({ cam: FINAL, rise: riseAll(t, 0.05, 0.09, 0.55, 8), dots: { i1dot: dropDot(t, 0.75, 720, 0.42, 3), i2dot: dropDot(t, 0.92, 760, 0.38, 3) } }) },
  T3: { name: 'Test 3 · Kippwelle (Licht von oben)', dur: 2.4, fn: (t) => { const st = { cam: FINAL, rise: {}, dots: { i1dot: {}, i2dot: {} }, frame: { plate: 1, rim: 1, shadow: 1 }, reg: 1 }; const w = t - 0.3; if (w > 0 && w < 1.9) { const c = mix(-200, 1950, ease(w / 1.8)); st.wave = bandPoly(c - 260, 260); } return st; } },
  T4: { name: 'Test 4 · Figur und Grund', dur: 2.6, fn: (t) => { const p = t < 1.3 ? (t > 0.35 ? Math.min(1, spring(t - 0.35, 0.85, 8)) : 0) : Math.max(0, 1 - ease((t - 1.9) / 0.5)); return { cam: FINAL, rise: {}, dots: { i1dot: {}, i2dot: {} }, frame: { plate: p, rim: 0, shadow: 0 } }; } },
  T5: { name: 'Test 5 · Punkte mit Physik', dur: 2.4, fn: (t) => ({ cam: FINAL, rise: {}, dots: { i1dot: dropDot(t, 0.05, 720, 0.42, 3), i2dot: dropDot(t, 0.3, 760, 0.38, 3) }, frame: { plate: 1, rim: 1, shadow: 1 }, reg: 1 }) },
  T6: { name: 'Test 6 · Platte, Rand, Schatten', dur: 2.4, fn: (t) => ({ cam: FINAL, rise: {}, dots: { i1dot: {}, i2dot: {} }, frame: { plate: t > 0.15 ? Math.min(1, spring(t - 0.15, 0.9, 7.2)) : 0, rim: t > 0.37 ? Math.min(1, spring(t - 0.37, 0.9, 6.6)) : 0, shadow: t > 0.65 ? ease((t - 0.65) / 0.8) : 0, pulse: 1 + 0.012 * Math.exp(-(t - 0.58) * 6) * Math.sin(Math.max(0, t - 0.58) * 15) * (t > 0.58 ? 1 : 0) }, reg: t > 1.4 ? Math.max(0, spring(t - 1.4, 0.5, 14)) : 0 }) },
  END: { name: 'Endbild', dur: 0.001, fn: () => ({ cam: FINAL, rise: {}, dots: { i1dot: {}, i2dot: {} }, frame: { plate: 1, rim: 1, shadow: 1 }, reg: 1 }) },
};
function render(ctx, W, H, seqKey, t, opt = {}) {
  const seq = SEQ[seqKey]; const st = seq.fn(Math.min(t, seq.dur)); if (opt.analysis) st.analysis = true;
  const box = [149, 130, 1742, 772], m = opt.margin ?? 0.06; const bw = box[2] - box[0], bh = box[3] - box[1];
  let s = Math.min(W * (1 - 2 * m) / bw, H * (1 - 2 * m) / bh); let ox = (W - bw * s) / 2 - box[0] * s, oy = (H - bh * s) / 2 - box[1] * s; if (opt.identity) { s = 1; ox = 0; oy = 0; }
  ctx.setTransform(s, 0, 0, s, ox, oy); drawScene(ctx, st);
  if (opt.overlay) { ctx.globalAlpha = opt.overlayAlpha ?? 0.5; ctx.drawImage(opt.overlay, 0, 0, 2000, 937); ctx.globalAlpha = 1; }
  return { s, ox, oy };
}
window.ILLUDIY = { SEQ, render, PIV, PIV2 };
})();
