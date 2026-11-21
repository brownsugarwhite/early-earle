// Baut das exakte Vektormodell des Logos (Flächen in Zeichenreihenfolge) und schreibt model.json + logo.svg.
import fs from 'node:fs';
import { E, X, F, M } from './lines.mjs';
import { crossing, measureLine, intersect } from './measure.mjs';
import { refineLoop } from './refine.mjs';
import { sub, add, mul, nrm, dist, between, reversePieces, refit, clean, pieces, cmdsOf, loopCmds, svgD, polyCmds, splitBez, bez, f2 } from './pathlib.mjs';
const shift = (L, d) => ({ ...L, mx: L.mx - L.dy * d, my: L.my + L.dx * d }); // Parallelverschiebung (nach rechts der Richtung)
const vline = x => ({ mx: x, my: 0, dx: 0, dy: 1 });
const at = (L, x) => [x, L.my + (x - L.mx) * L.dy / L.dx];       // Punkt einer Geraden bei x
const B = 1.2; // Überlappung unter Nachbarflächen

// ---------- Pfad an x = x0 teilen: liefert linke und rechte Teilschleife (Befehle)
function splitAtX(cmds, x0) {
  const segs = []; let cur = null, start = null;
  for (const k of cmds) { if (k[0] === 'M') { cur = k[1]; start = k[1]; } else if (k[0] === 'L') { segs.push({ t: 'L', a: cur, b: k[1] }); cur = k[1]; } else if (k[0] === 'C') { segs.push({ t: 'C', c: [cur, k[1], k[2], k[3]] }); cur = k[3]; } else if (k[0] === 'Z') { if (dist(cur, start) > 1e-6) segs.push({ t: 'L', a: cur, b: start }); } }
  const pieces = []; // in Teile zerlegen an Schnittpunkten
  for (const sg of segs) {
    if (sg.t === 'L') { const [a, b] = [sg.a, sg.b]; if ((a[0] - x0) * (b[0] - x0) < 0) { const t = (x0 - a[0]) / (b[0] - a[0]); const m = [x0, a[1] + (b[1]-a[1]) * t]; pieces.push({ t: 'L', a, b: m, cut: true }, { t: 'L', a: m, b }); } else pieces.push(sg); }
    else { const c = sg.c; const xs = t => bez(c, t)[0] - x0; let ts = []; for (let i = 0; i < 200; i++) { const t0 = i/200, t1 = (i+1)/200; if (xs(t0) * xs(t1) < 0) { let lo = t0, hi = t1; for (let k = 0; k < 50; k++) { const mid = (lo+hi)/2; if (xs(lo) * xs(mid) <= 0) hi = mid; else lo = mid; } ts.push((lo+hi)/2); } }
      if (!ts.length) { pieces.push(sg); continue; } let rest = c, prevT = 0; for (const t of ts) { const tt = (t - prevT) / (1 - prevT); const [p, q] = splitBez(rest, tt); pieces.push({ t: 'C', c: p, cut: true }); rest = q; prevT = t; } pieces.push({ t: 'C', c: rest }); } }
  const endOf = p => p.t === 'L' ? p.b : p.c[3], startOf = p => p.t === 'L' ? p.a : p.c[0];
  const cutIdx = pieces.map((p, i) => p.cut ? i : -1).filter(i => i >= 0); if (cutIdx.length !== 2) throw new Error('splitAtX: Schnitte ' + cutIdx.length);
  const ring = (from, to) => { const out = []; for (let i = (from + 1) % pieces.length; ; i = (i + 1) % pieces.length) { out.push(pieces[i]); if (i === to) break; } return out; };
  const A = ring(cutIdx[0], cutIdx[1]), Bp = ring(cutIdx[1], cutIdx[0]);
  const toC = arr => { const C = [['M', startOf(arr[0])]]; for (const p of arr) C.push(p.t === 'L' ? ['L', p.b] : ['C', p.c[1], p.c[2], p.c[3]]); C.push(['Z']); return C; };
  const meanX = arr => arr.reduce((s, p) => s + startOf(p)[0], 0) / arr.length;
  return meanX(A) < meanX(Bp) ? { left: toC(A), right: toC(Bp) } : { left: toC(Bp), right: toC(A) };
}
// ---------- Kreise
function fitCircle(c0, r0, skip = () => false) {
  const P = []; for (let a = 0; a < 360; a += 1.5) { const th = a * Math.PI / 180, n = [Math.cos(th), Math.sin(th)]; const p = add(c0, mul(n, r0)); if (skip(p, a)) continue; const s = crossing(p, n, 4); if (s !== null) P.push(add(p, mul(n, s))); }
  // Kasa-Fit
  let sx=0,sy=0,sxx=0,syy=0,sxy=0,sxz=0,syz=0,sz=0; const n=P.length; for (const [x,y] of P) { const z=x*x+y*y; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sxz+=x*z; syz+=y*z; sz+=z; }
  const A=[[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,n]], b=[sxz,syz,sz]; const det3=M=>M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0]);
  const D=det3(A); const sol=[0,1,2].map(i=>{const Mx=A.map(r=>r.slice()); for(let k=0;k<3;k++) Mx[k][i]=b[k]; return det3(Mx)/D;});
  const cx=sol[0]/2, cy=sol[1]/2, r=Math.sqrt(sol[2]+cx*cx+cy*cy); let mx=0; for (const p of P) mx=Math.max(mx, Math.abs(dist(p,[cx,cy])-r)); return { cx, cy, r, n, maxres: mx };
}
const dot1 = fitCircle([312, 313], 72);
const dot2 = (() => { const P = []; for (let a = 0; a < 360; a += 1.5) { if (a > 15 && a < 165) continue; const th = a*Math.PI/180, n = [Math.cos(th), Math.sin(th)]; const p = add([1309, 312], mul(n, 72)); const s = crossing(p, n, 4); if (s !== null) P.push(add(p, mul(n, s))); }
  let c = [1308.6, 312]; const r = dot1.r; for (let it = 0; it < 30; it++) { let J = [[0,0],[0,0]], g = [0,0]; for (const p of P) { const d = dist(p, c); const res = d - r; const jx = -(p[0]-c[0])/d, jy = -(p[1]-c[1])/d; J[0][0]+=jx*jx; J[0][1]+=jx*jy; J[1][1]+=jy*jy; g[0]+=jx*res; g[1]+=jy*res; } J[1][0]=J[0][1]; const det = J[0][0]*J[1][1]-J[0][1]*J[1][0]; c = [c[0] - (J[1][1]*g[0]-J[0][1]*g[1])/det, c[1] - (-J[1][0]*g[0]+J[0][0]*g[1])/det]; }
  let mx = 0; for (const p of P) mx = Math.max(mx, Math.abs(dist(p, c) - r)); return { cx: c[0], cy: c[1], r, n: P.length, maxres: mx }; })();
console.log('Punkt pink', dot1.cx.toFixed(2), dot1.cy.toFixed(2), 'r', dot1.r.toFixed(2), 'res', dot1.maxres.toFixed(2), '| Punkt weiß', dot2.cx.toFixed(2), dot2.cy.toFixed(2), 'r', dot2.r.toFixed(2), 'res', dot2.maxres.toFixed(2));
const circleCmds = (c, k = 0.5522847498) => { const { cx, cy, r } = c, q = r * k; return [['M',[cx+r,cy]],['C',[cx+r,cy+q],[cx+q,cy+r],[cx,cy+r]],['C',[cx-q,cy+r],[cx-r,cy+q],[cx-r,cy]],['C',[cx-r,cy-q],[cx-q,cy-r],[cx,cy-r]],['C',[cx+q,cy-r],[cx+r,cy-q],[cx+r,cy]],['Z']]; };
// ---------- Hilfsfunktion: Befehle aus gemischten Teilen
const L_ = p => ({ t: 'L', p }); // Ziel-Punkt
function build(start, parts) { const C = [['M', start]]; for (const q of parts) { if (q.t === 'L') C.push(['L', q.p]); else C.push(['C', q.c[1], q.c[2], q.c[3]]); } C.push(['Z']); return C; }
// ---------- i1
const i1 = {};
i1.TL = X(E.i1_left, E.i1_top); i1.TF = X(E.i1_top, E.i1_front); i1.BF = X(E.i1_front, E.i1_botL); i1.BL = X(E.i1_botL, E.i1_left);
i1.RT = X(E.i1R_top, E.i1R_right); i1.RB = X(E.i1R_right, E.i1R_bot); i1.FT2 = X(E.i1_front, E.i1R_top); i1.FB2 = X(E.i1R_bot, E.i1_front);
const fB = shift(E.i1_front, -B); // nach rechts (Richtung zeigt nach unten -> rechts der Richtung ist -x... prüfen unten)
const i1Lpts = [i1.TL, X(E.i1_top, fB), X(fB, E.i1_botL), i1.BL];
const i1Rpts = [i1.FT2, i1.RT, i1.RB, i1.FB2];
const back = add(i1.TL, sub(i1.RT, i1.FT2));
// ---------- ll
const ll = {};
const Sl = shift(E.S_left, +B), Sr = shift(E.S_right, -B), Sb = shift(E.S_bot, +B);
ll.sliver = [X(Sl, E.S_top), X(E.S_top, Sr), X(Sr, Sb), X(Sb, Sl)];
const SbA = shift(E.S_bot, +B);
ll.barA = [X(E.A_left, E.A_top), X(E.A_top, E.A_right), X(E.A_right, SbA), X(SbA, E.Ft_left), X(E.Ft_left, E.A_bot), X(E.A_bot, E.A_left)];
const Bb = shift(E.B_bot, +B);
ll.barB = [X(E.S_right, E.B_top), X(E.B_top, E.B_right), X(E.B_right, Bb), X(Bb, E.B_leftLow)];
const f1r = X(E.Ft_bot, E.F1_br); const footR = vline(f1r[0]); const FtB = shift(E.Ft_bot, +B);
ll.foot = [X(E.S_bot, E.Ft_left), X(E.S_bot, footR), X(footR, FtB), X(FtB, E.Ft_left)];
ll.floor1 = [X(E.F1_bl, E.F1_tl), X(E.F1_tl, E.Ft_bot), f1r, X(E.F1_br, E.F1_bl)];
ll.floor2 = [X(E.B_bot, E.F2_bl), X(E.B_bot, E.F2_tr), X(E.F2_tr, E.F2_br), X(E.F2_br, E.F2_bl)];
// ---------- u
const u = {};
u.LT = X(E.u_Lleft, E.u_Ltop); u.LTR = X(E.u_Ltop, E.u_Lright); u.RTL = X(E.u_Rleft, E.u_Rtop); u.RT = X(E.u_Rtop, E.u_Rright);
const uBowlStart = [E.u_Rright.mx + (485.5 - E.u_Rright.my) * E.u_Rright.dx / E.u_Rright.dy, 485.5], uBowlEnd = [E.u_Lleft.mx + (572.5 - E.u_Lleft.my) * E.u_Lleft.dx / E.u_Lleft.dy, 572.5];
const uCtrStart = [E.u_Lright.mx, 511], uCtrEnd = [E.u_Rleft.mx, 497];
const uBowl = refit(between(1414, 0, [950.22, 485.5], [777.16, 572.5]), uBowlStart, uBowlEnd, [0, 1], [0, 1]);
const uCtr = refit(between(1414, 0, [846.91, 517.77], [881.08, 501.5]), uCtrStart, uCtrEnd, [0, 1], [0, 1]);
u.front = build(uBowlEnd, [L_(u.LT), L_(u.LTR), L_(uCtrStart), ...uCtr, L_(u.RTL), L_(u.RT), L_(uBowlStart), ...uBowl]);
// u hinten (pink, links): sichtbarer Rand + verdeckter Teil unter u vorne
const ubJ = (() => { // Schnitt der Unterkante ub_bot2 mit der Schale: erster Punkt der Schale (uBowl, rückwärts), der unterhalb der Linie liegt
  let best = null; for (const q of uBowl) for (let t = 0; t <= 1; t += 0.01) { const p = bez(q.c, t); const ly = at(E.ub_bot2, p[0])[1]; if (p[0] < 820 && p[0] > 780 && Math.abs(p[1] - ly) < 0.6 && (!best || p[0] > best[0])) best = p; } return best || [793.5, 605]; })();
u.backTop = polyCmds([X(E.ub_left, E.ub_top1), X(E.ub_top1, E.ub_top2), X(E.ub_top2, E.u_Lright), u.LT]);
const bowlTail = (() => { const pts = []; for (const q of uBowl) for (let t = 0; t <= 1.0001; t += 0.05) { const p = bez(q.c, t); if (p[0] <= ubJ[0] + 0.5 && p[0] >= uBowlEnd[0] - 0.01) pts.push([p[0] - 0.6, p[1] - 1.1]); } return pts.sort((a, b) => a[0] - b[0]); })();
u.backSide = build(X(E.ub_left, E.ub_top1), [L_([u.LT[0] + 1.2, u.LT[1] - 0.6]), L_([uBowlEnd[0] + 1.2, uBowlEnd[1] - 2]), ...bowlTail.map(p => L_(p)), L_(ubJ), L_(X(E.ub_step, E.ub_bot2)), L_(X(E.ub_step, E.ub_bot1)), L_(X(E.ub_bot1, E.ub_left))]);
u.back = build(X(E.ub_left, E.ub_top1), [L_(X(E.ub_top1, E.ub_top2)), L_(X(E.ub_top2, E.u_Lright)), L_([E.u_Lright.mx - 1.4, 360]), L_([E.u_Lright.mx - 1.4, 540]), L_([812, 600]), L_(ubJ), L_(X(E.ub_step, E.ub_bot2)), L_(X(E.ub_step, E.ub_bot1)), L_(X(E.ub_bot1, E.ub_left))]);
// u Seite (pink, rechts): versetzte Schale sichtbar, oben und hinter dem D verdeckt
const usCurve = refit(between(1386, 0, [986.97, 593.48], [876.65, 645.7]), [987.2, 593.2], X(E.us_tan, { mx: 876.65, my: 645.7, dx: 0.45, dy: -0.89 }), null, [E.us_tan.dx, E.us_tan.dy]);
const usTanEnd = X(E.us_tan, { mx: 816.5, my: 616.3, dx: 0.45, dy: -0.89 });
u.side = build(X(E.us_top, shift(E.u_Rright, B)), [L_(at(E.us_top, 1018)), L_([1018, 560]), L_([1004, 571.6]), L_([1000.9, 573.2]), ...usCurve, L_(usTanEnd), L_([832, 607]), L_([948.6, 488]), L_([948.6, 303])]);
// ---------- D
const D = {};
D.TL = X(E.D_left, E.D_top); D.bl = X(E.D_left, E.D_bot);
D.frLeft = M([1052.6, 335], [1052.6, 495]);
D.tl2 = M([1056, 316.6], [1080.5, 305.0]);
D.TR = X(E.D_top, D.tl2);                                  // Ecke Stamm/Schale oben
D.rv = M([1235.45, 436], [1235.45, 482]);
const DcStart = [D.rv.mx, 428.5], DcEnd = [D.rv.mx, 489.5];
const DtopCurve = refit(between(1387, 0, [1085.35, 302.69], [1235.57, 428.51]), at(D.tl2, 1085.35), DcStart, [D.tl2.dx, D.tl2.dy], [0, -1]);
const DbotAnchor = at(E.D_bot, 1025.46);
const DbotCurve = refit(between(1387, 0, [1234.78, 489.51], [1025.46, 586.07]), DcEnd, DbotAnchor, [0, 1], [E.D_bot.dx, E.D_bot.dy]);
D.outer = [D.TL, ['L', D.TR], ['L', at(D.tl2, 1085.35)], ...DtopCurve.map(q => ['C', q.c[1], q.c[2], q.c[3]]), ['L', DcEnd], ...DbotCurve.map(q => ['C', q.c[1], q.c[2], q.c[3]]), ['L', D.bl]];
// Gegenform (Loch): linke Kante, B-Kante bis Spitze, untere Kurve, rechte Senkrechte, obere Kurve
D.cr = M([1157.2, 438], [1157.2, 466]);
const cTip = (() => { // Spitze: Schnitt der B-Kante mit der unteren Kurve -> aus Refit der unteren Kurve, Anfang auf Dc_b
  return at(E.Dc_b, 1057.6); })();
const cBot = refit(between(1437, 0, [1157.05, 472.5], [1057.75, 503.52]), [D.cr.mx, 472.5], cTip, [0, 1], null);
const cTopStart = [D.cr.mx, 431.5], cTopEnd = [E.Dc_left.mx, 393.5];
const cTop = refit(between(1437, 0, [1139.38, 389.92], [1157.32, 431.5]).length ? reversePieces(between(1437, 0, [1121.03, 392.85], [1157.32, 431.5])) : [], cTopStart, cTopEnd, [0, -1], null);
D.counter = [cTopEnd, ['L', X(E.Dc_left, E.Dc_b)], ['L', cTip], ...reversePieces(cBot).map(q => ['C', q.c[1], q.c[2], q.c[3]]), ['L', cTopStart], ...cTop.map(q => ['C', q.c[1], q.c[2], q.c[3]])];
const toCmds = arr => { const C = [['M', arr[0]]]; for (const k of arr.slice(1)) C.push(k); C.push(['Z']); return C; };
D.shape = [...toCmds(D.outer), ...toCmds(D.counter)];
// D oben (pink)
D.ttl = X(E.D_left, E.Dt_top1);
const DtUp = refit(between(1172, 0, [1006.64, 272.28], [1097.48, 264.04]), at(E.Dt_top1, 1006.64), at(E.Dt_r, 1097.48), [E.Dt_top1.dx, E.Dt_top1.dy].map(v => v * Math.sign(E.Dt_top1.dx)), [-E.Dt_r.dx, -E.Dt_r.dy]);
const DtR = (() => { let prev = null; for (const q of DtopCurve) for (let t = 0; t <= 1; t += 0.001) { const p = bez(q.c, t); if (p[0] < 1120) continue; const g = p[1] - at(E.Dt_r, p[0])[1]; if (prev && prev.g < 0 && g >= 0) { const f = -prev.g / (g - prev.g); return [prev.p[0] + (p[0]-prev.p[0])*f, prev.p[1] + (p[1]-prev.p[1])*f]; } prev = { p, g }; } return [1167, 299.5]; })();
console.log('D oben Spitze', DtR.map(f2));
D.top = build(D.TL, [L_(at(E.Dt_top1, 1006.64)), ...DtUp, L_(DtR), L_([DtR[0] - 6, DtR[1] + 6]), L_([1090, 308]), L_([D.TR[0], D.TR[1] + 3.5]), L_([D.TL[0] + 1.6, D.TL[1] + 4])]);
// ---------- i2
const i2 = {};
const W1r = E.W1_right, x1185 = vline(1185);
const W1L = M([1236, 393.9], [1270, 377.7]);
i2.left = polyCmds([X(W1L, x1185), at(W1L, 1274.0), at(E.W1_top, 1276.5), X(E.W1_top, W1r), X(W1r, E.W1_bot), X(E.W1_bot, E.W1_step), X(E.W1_step, E.W1_bot2), X(E.W1_bot2, x1185)]);
const stTop = F(at(E.St_top, 1307.82), at(E.St_top2, 1380));
const stL = vline(W1r.mx - B), stR = vline(E.W2_left.mx);
const stBot = F(X(W1r, E.W1_bot), add(X(W1r, E.W1_bot), [72.2, 36.4]));
i2.stem = polyCmds([X(stL, stTop), X(stTop, stR), X(stR, stBot), X(stBot, stL)]);
const x1336 = vline(1336), x1470 = vline(1470);
const w2bl = X(E.W2_bot, E.W2_left), stBotR = X(stBot, stR);
const yTL = X(E.y_left, E.y_top1);
i2.right = polyCmds([X(E.W2_top, x1336), yTL, [yTL[0] + 1.4, yTL[1] + 2.4], [1470, 330], X(x1470, E.W2_bot), w2bl, [E.W2_left.mx, stBotR[1] - 1.2], [E.W2_left.mx - B, stBotR[1] - 1.2], [E.W2_left.mx - B, 400], [1336, 380]]);
// ---------- y
const y = {};
y.TL = X(E.y_left, E.y_top1); y.T1R = X(E.y_top1, E.y_ArmR); y.T2L = X(E.y_ArmL2, E.y_top2); y.TR = X(E.y_top2, E.y_right);
const yCtrS = [E.y_ArmR.mx, 439.5], yCtrE = X(E.y_ArmL2, { mx: 1515.7, my: 458.4, dx: 1, dy: 0 });
const yCtr = refit(between(1354, 0, [1482.67, 439.5], [1515.77, 458.35]), yCtrS, yCtrE, [0, 1], null);
const yBRs = [E.y_right.mx, 507.5], yBRe = at(E.y_shoulder, 1549.5);
const yBR = refit(between(1354, 0, [1585.93, 507.5], [1549.51, 554.21]), yBRs, yBRe, [0, 1], [-E.y_shoulder.dx, -E.y_shoulder.dy].map(v => v * -1));
const ySh = X(E.y_shoulder, E.y_stemR), yBotR = X(E.y_stemR, E.y_bot), yBotL = X(E.y_bot, E.y_stemL);
const yArmS = [E.y_stemL.mx, 518.57], yArmE = [E.y_left.mx, 432.5];
const yArm = refit(between(1354, 0, [1460.74, 518.57], [1412.9, 432.5]), yArmS, yArmE, null, [0, 1]);
y.front = build(y.TL, [L_(y.T1R), L_(yCtrS), ...yCtr, L_(y.T2L), L_(y.TR), L_(yBRs), ...yBR, L_(ySh), L_(yBotR), L_(yBotL), L_(yArmS), ...yArm]);
y.RTR = X(E.yr_top, E.yr_right);
const yrS = [E.yr_right.mx + (474.5 - E.yr_right.my) * E.yr_right.dx / E.yr_right.dy, 474.5], yrE = at(E.yr_bot, 1611.2);
const yrCurve = refit(between(1421, 0, [1653.95, 474.5], [1611.19, 523.37]), yrS, yrE, [0, 1], [-E.yr_bot.dx, -E.yr_bot.dy].map(v => v * -1));
y.right = build(X(E.yr_top, shift(E.y_right, B)), [L_(y.RTR), L_(yrS), ...yrCurve, L_(at(E.yr_bot, 1566)), L_([1566, 540]), L_([E.y_right.mx - 1.6, 369])]);
// ---------- Rahmen
const rimRef = refineLoop(JSON.parse(fs.readFileSync(SP + '/vec_rim.json'))[0].loops[0].cmds);
const rimP = clean(pieces(rimRef.segs)); const plateP = clean(pieces(JSON.parse(fs.readFileSync(SP + '/ref.json')).find(c => c.id === 55).loops[0].segs));
const P1 = [310.12, 697.45], P2 = [1716.87, 300.05];
const ext1 = measureLine([314.5, 700], [333.5, 711]), ext2 = measureLine([1720.5, 302.2], [1737, 310.8]);
const e1 = [ext1.dx, ext1.dy], e2 = [ext2.dx, ext2.dy];
console.log('Grenze hell/dunkel unten', (Math.atan2(ext1.dy, ext1.dx)*180/Math.PI).toFixed(2), '° res', ext1.res.toFixed(2), '| oben rechts', (Math.atan2(ext2.dy, ext2.dx)*180/Math.PI).toFixed(2), '° res', ext2.res.toFixed(2));
const footOn = (L, P) => { const t = (P[0]-L.mx)*L.dx + (P[1]-L.my)*L.dy; return [L.mx + t*L.dx, L.my + t*L.dy]; };
const p1 = add(footOn(ext1, P1), mul(e1, -4)), p2 = add(footOn(ext2, P2), mul(e2, -4));
console.log('Strahl unten ab', p1.map(f2), 'Abstand zur Ecke', dist(footOn(ext1, P1), P1).toFixed(2), '| oben ab', p2.map(f2), 'Abstand', dist(footOn(ext2, P2), P2).toFixed(2));
const darkPoly = (o) => { const n1 = [-e1[1], e1[0]], n2 = [-e2[1], e2[0]]; const a = add(p1, mul(n1, -o)), b = add(p2, mul(n2, o));
  return polyCmds([a, add(a, mul(e1, 90)), [2100, 1100], [2100, 250], add(b, mul(e2, 90)), b, [1600, 450], [400, 450]]); };
const darkClip = darkPoly(0), lightClip = [['M',[-20,-20]],['L',[2020,-20]],['L',[2020,960]],['L',[-20,960]],['Z'], ...darkPoly(3)];
// ---------- Modell
const G = {
  rimLight: { x1: 210, y1: 0, x2: 1630, y2: 0, stops: [[0, '#fe73aa'], [(1090-210)/(1630-210), '#ffa5dd'], [1, '#c9b8fb']] },
  rimDark: { x1: 400, y1: 0, x2: 1400, y2: 0, stops: [[0, '#df508d'], [(780-400)/1000, '#e55fac'], [1, '#946ff9']] },
  white: { x1: 0, y1: 404, x2: 0, y2: 622, stops: [[0, '#ffffff'], [1, '#efe8f2']] },
  dFront: { x1: 1117.3, y1: 393.0, x2: 1193.9, y2: 457.3, stops: [[0, '#eee5ef'], [1, '#ffffff']] },
};
const C = { bg: '#17131b', teal: '#003f4e', pink: '#ff73a9', white: '#ffffff', reg: '#cbbdfb' };
const faces = [];
const face = (id, group, fill, cmds, extra = {}) => faces.push({ id, group, fill, cmds, ...extra });
face('rimLight', 'frame', 'url(rimLight)', loopCmds(rimP), { clip: 'lightClip' });
face('rimDark', 'frame', 'url(rimDark)', loopCmds(rimP), { clip: 'darkClip' });
face('plate', 'frame', C.teal, loopCmds(plateP));
face('i1.top', 'i1', C.teal, polyCmds([i1.TL, i1.TF, i1.RT, back]), { hiddenFinal: true });
face('i1.left', 'i1', C.pink, polyCmds(i1Lpts));
face('i1.right', 'i1', 'url(white)', polyCmds(i1Rpts));
face('i1.dot', 'i1dot', C.pink, circleCmds(dot1), { circle: { cx: dot1.cx, cy: dot1.cy, r: dot1.r } });
face('ll.sliver', 'll', C.pink, polyCmds(ll.sliver));
face('ll.barA', 'll', 'url(white)', polyCmds(ll.barA));
face('ll.barB', 'll', 'url(white)', polyCmds(ll.barB));
face('ll.floor2', 'll', C.pink, polyCmds(ll.floor2));
face('ll.foot', 'll', C.white, polyCmds(ll.foot));
face('ll.floor1', 'll', C.pink, polyCmds(ll.floor1));
face('u.backSide', 'u', C.pink, u.backSide);
face('u.backTop', 'u', C.pink, u.backTop);
face('u.side', 'u', C.pink, u.side);
face('u.front', 'u', 'url(white)', u.front);
face('i2.right', 'i2', C.pink, i2.right);
face('i2.dot', 'i2dot', C.white, circleCmds(dot2), { circle: { cx: dot2.cx, cy: dot2.cy, r: dot2.r } });
face('i2.stem', 'i2', C.teal, i2.stem);
face('i2.left', 'i2', C.pink, i2.left);
face('D.top', 'D', C.pink, D.top);
const Dsplit = splitAtX(toCmds(D.outer), D.frLeft.mx);
const DfrontPoly = [...Dsplit.right, ...toCmds(D.counter)];
const DleftPoly = splitAtX(toCmds(D.outer), D.frLeft.mx + B).left; // Überlappung: linke Fläche reicht 1,2 px unter die Vorderfläche? nein: linke liegt oben
face('D.front', 'D', 'url(dFront)', [...splitAtX(toCmds(D.outer), D.frLeft.mx - B).right, ...toCmds(D.counter)], { evenodd: true });
face('D.left', 'D', C.white, splitAtX(toCmds(D.outer), D.frLeft.mx).left);
face('D.bottom', 'D', C.white, D.shape, { evenodd: true, clip: 'dBottom' });
face('y.right', 'y', C.pink, y.right);
face('y.front', 'y', 'url(white)', y.front);
const clips = { lightClip: { cmds: lightClip, evenodd: true }, darkClip: { cmds: darkClip },
  dLeft: { cmds: polyCmds([[900, 200], [D.frLeft.mx, 200], [D.frLeft.mx, 700], [900, 700]]) },
  dBottom: { cmds: polyCmds([at(E.Dc_b, 1040), X(E.Dc_b, E.Dc_left), [E.Dc_left.mx, 700], [1040, 700]]) } };
// ® Ring und R
const RG = { cx: 1713.5, cy: 216.3, ro: 23.6, ri: 19.23 };
const circ = (cx, cy, r) => circleCmds({ cx, cy, r });
const R = [['M',[1704,227.8]],['L',[1704,204.4]],['L',[1715.5,204.4]],['C',[1719.97,204.4],[1723.6,207.94],[1723.6,212.3]],['C',[1723.6,215.0],[1722.0,219.0],[1719.4,220.6]],['L',[1724.2,227.8]],['L',[1719.2,227.8]],['L',[1713.9,221.1]],['L',[1708.55,221.1]],['L',[1708.55,227.8]],['Z'],
  ['M',[1708.55,208.4]],['L',[1715.2,208.4]],['C',[1717.4,208.4],[1718.5,209.6],[1718.5,211.4]],['L',[1718.5,213.8]],['C',[1718.5,215.9],[1717.3,217.2],[1715.0,217.2]],['L',[1708.55,217.2]],['Z']];
face('reg', 'reg', C.reg, [...circ(RG.cx, RG.cy, RG.ro), ...circ(RG.cx, RG.cy, RG.ri).map(k => k), ...R], { evenodd: true });
const pts = { i1BF: i1.BF, i1TF: i1.TF, i1RT: i1.RT, barA_BL: X(E.A_bot, E.A_left), barA_TL: X(E.A_left, E.A_top), sl_BL: X(E.S_bot, E.S_left), sl_TL: X(E.S_left, E.S_top),
  barB_BL: X(Bb, E.B_leftLow), barB_TL: X(E.S_right, E.B_top), foot_BL: X(E.Ft_bot, E.Ft_left), f1R: f1r, barB_BR: X(E.B_right, E.B_bot), uLT: u.LT, uRx: E.u_Rright.mx, uLx: E.u_Lleft.mx, Dfx: D.frLeft.mx, DTL: D.TL,
  w1B: [1272.03, 595.41], stBL: X(W1r, E.W1_bot), w2B: [1406.64, 611.39], yB: yBotR, yRx: E.y_right.mx, p1, p2, e1, e2, reg: [1713.5, 216.3] };
const r2 = v => Array.isArray(v) ? v.map(r2) : typeof v === 'number' ? +v.toFixed(2) : v;
const model = { size: [2000, 937], colors: C, gradients: G, clips, faces: faces.map(fc => ({ ...fc, cmds: r2(fc.cmds) })), dots: { pink: dot1, white: dot2 }, pts: r2(pts) };
fs.writeFileSync(SP + '/model.json', JSON.stringify(model));
// ---------- SVG
const grad = (id, g) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${g.stops.map(([o, c]) => `<stop offset="${f2(o)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="937" viewBox="0 0 2000 937"><defs>${Object.entries(G).map(([k, g]) => grad(k, g)).join('')}${Object.entries(clips).map(([k, c]) => `<clipPath id="${k}"><path${c.evenodd ? ' clip-rule="evenodd"' : ''} d="${svgD(c.cmds)}"/></clipPath>`).join('')}</defs><rect width="2000" height="937" fill="${C.bg}"/>`;
for (const fc of faces) { const fill = fc.fill.startsWith('url(') ? `url(#${fc.fill.slice(4, -1)})` : fc.fill; const p = `<path fill="${fill}"${fc.evenodd ? ' fill-rule="evenodd"' : ''} d="${svgD(fc.cmds)}"/>`; svg += fc.clip ? `<g clip-path="url(#${fc.clip})">${p}</g>` : p; }
fs.writeFileSync(SP + '/logo.svg', svg + '</svg>');
console.log('Flächen', faces.length, 'SVG', svg.length);
