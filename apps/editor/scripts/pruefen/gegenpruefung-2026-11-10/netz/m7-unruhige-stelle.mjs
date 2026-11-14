// Gegenprüfung, Schritt G3 (10.11.2026): die unruhige Stelle bei 23 400 Punkten im Fenster. Ohr ziehen wie form-loslassen-probe.mjs
// (mit Verfeinern im Zug), halten, dann 30 Runden einzeln (`weiterrechnen`): je Runde der Punkt mit der größten Bewegung längs der
// Normalen; am Ende die Umgebung des Punkts, der am weitesten gewandert ist (Kantenlängen, Nachbarzahl, kleinster Winkel). Dazu vor
// dem Zug und nach dem Halten: wie viele Kanten kürzer als die halbe und länger als 1,75 mittlere Kanten sind.
// Aufruf aus apps/editor: node scripts/pruefen/gegenpruefung-2026-11-10/netz/m7-unruhige-stelle.mjs   (KURVEN_URL, HALTEN; echte Grafikkarte)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie&dreiecke=30000';
const halten = Number(process.env.HALTEN ?? 2500);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const loops = () => K('loops');
const ziehen = async ([x, y], [x2, y2], n = 6) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(1500);
};
for (const [a, A, B] of [
  ['seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  await ziehen(xy(await bild(a, { ...A, z: 0 })), xy(await bild(a, { ...B, z: 0 })), 6);
}
await seite.keyboard.press('Escape');
const L0 = await loops();
const waagerecht = L0.find((l) => l.art === 'ring' && l.punkte.every((p) => Math.abs(p.ref.y) < 30));
const senkrecht = L0.find((l) => l.art === 'ring' && l !== waagerecht);
const ringVon = async () => (await loops()).find((l) => l.id === senkrecht.id);
for (const w of [40, 50, 60, 70]) {
  const l = await ringVon();
  const th = (w * Math.PI) / 180;
  let best = 0;
  const pr = (j) => [l.ruhe[3 * j], l.ruhe[3 * j + 1], l.ruhe[3 * j + 2]];
  for (let j = 0; j < l.s.length; j++) if (Math.abs(Math.atan2(pr(j)[2], pr(j)[1]) - th) < Math.abs(Math.atan2(pr(best)[2], pr(best)[1]) - th)) best = j;
  const j = Math.min(best, l.s.length - 2);
  const a = pr(j);
  const b = pr(j + 1);
  await seite.mouse.dblclick(...xy(await bild('front', { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2 })));
  await seite.waitForTimeout(500);
  await seite.keyboard.press('Escape');
}
const l = await ringVon();
const mitte = l.punkte.filter((p) => {
  const w = (Math.atan2(p.ref.z, p.ref.y) * 180) / Math.PI;
  return p.sichtbar && p.kreuzung === null && w > 45 && w < 65;
});
await seite.mouse.click(...xy(await bild('front', mitte[0].ref)));
await seite.waitForTimeout(300);
await seite.keyboard.down('Shift');
await seite.mouse.click(...xy(await bild('front', mitte[1].ref)));
await seite.keyboard.up('Shift');
await seite.waitForTimeout(300);
const start = mitte[0].ref;
const rich = { z: Math.sin((55 * Math.PI) / 180), y: Math.cos((55 * Math.PI) / 180) };
const ziel = { x: start.x, y: start.y + 70 * rich.y, z: start.z + 70 * rich.z };
await seite.waitForTimeout(1500);

// vor dem Zug: kurze und lange Kanten des Netzes (gegen die mittlere Kante)
const kanten = () =>
  seite.evaluate(() => {
    const P = window.__kurven.lagen();
    const T = window.__kurven.dreiecke();
    const L = [];
    for (let t = 0; t < T.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = T[t + e];
        const b = T[t + ((e + 1) % 3)];
        if (a < b) L.push(Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]));
      }
    L.sort((x, y) => x - y);
    const m = L.reduce((s, v) => s + v, 0) / L.length;
    return { n: P.length / 3, kanten: L.length, mittel: m, min: L[0], p01: L[Math.floor(0.001 * L.length)], p1: L[Math.floor(0.01 * L.length)], max: L[L.length - 1], unterHalb: L.filter((v) => v < 0.5 * m).length, ueber175: L.filter((v) => v > 1.75 * m).length };
  });
console.log('vor dem Zug:', JSON.stringify(await kanten()));
const P0 = await K('lagen');
const [x0, y0] = xy(await bild('front', start));
const [x1, y1] = xy(await bild('front', ziel));
await seite.mouse.move(x0, y0);
await seite.mouse.down();
for (let i = 1; i <= 30; i++) {
  await seite.mouse.move(x0 + ((x1 - x0) * i) / 30, y0 + ((y1 - y0) * i) / 30);
  await seite.waitForTimeout(16);
}
await seite.waitForTimeout(halten);
console.log('nach dem Halten:', JSON.stringify(await kanten()), JSON.stringify({ z: (({ offen, nachRunden, hintergrund, punkte }) => ({ offen, nachRunden, hintergrund, punkte }))(await K('zeiten')) }));
// je Runde: der Punkt mit der größten Bewegung längs der Normalen und seine Umgebung
const diag = await seite.evaluate(() => {
  const K2 = window.__kurven;
  const T = K2.dreiecke();
  const n = K2.lagen().length / 3;
  const nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < T.length; t += 3)
    for (let e = 0; e < 3; e++) {
      nb[T[t + e]].add(T[t + ((e + 1) % 3)]);
      nb[T[t + e]].add(T[t + ((e + 2) % 3)]);
    }
  const normalen = (P) => {
    const N = new Float64Array(P.length);
    for (let t = 0; t < T.length; t += 3) {
      const a = 3 * T[t];
      const b = 3 * T[t + 1];
      const c = 3 * T[t + 2];
      const ux = P[b] - P[a];
      const uy = P[b + 1] - P[a + 1];
      const uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a];
      const vy = P[c + 1] - P[a + 1];
      const vz = P[c + 2] - P[a + 2];
      const fx = uy * vz - uz * vy;
      const fy = uz * vx - ux * vz;
      const fz = ux * vy - uy * vx;
      for (const q of [a, b, c]) {
        N[q] += fx;
        N[q + 1] += fy;
        N[q + 2] += fz;
      }
    }
    for (let v = 0; v < N.length; v += 3) {
      const l = Math.hypot(N[v], N[v + 1], N[v + 2]) || 1;
      N[v] /= l;
      N[v + 1] /= l;
      N[v + 2] /= l;
    }
    return N;
  };
  const aus = [];
  const start = Float64Array.from(K2.lagen());
  let vor = start;
  for (let r = 0; r < 30; r++) {
    const N = normalen(vor);
    K2.weiterrechnen(1);
    const P = Float64Array.from(K2.lagen());
    let max = 0;
    let wo = 0;
    let ueber = 0;
    for (let v = 0; v < n; v++) {
      const d = (P[3 * v] - vor[3 * v]) * N[3 * v] + (P[3 * v + 1] - vor[3 * v + 1]) * N[3 * v + 1] + (P[3 * v + 2] - vor[3 * v + 2]) * N[3 * v + 2];
      if (Math.abs(d) > 0.05) ueber++;
      if (Math.abs(d) > Math.abs(max)) {
        max = d;
        wo = v;
      }
    }
    aus.push({ r, max: +max.toFixed(3), wo, ueber, p: [P[3 * wo], P[3 * wo + 1], P[3 * wo + 2]].map((x) => +x.toFixed(1)) });
    vor = P;
  }
  // Umgebung des Punkts, der insgesamt am weitesten gewandert ist
  const N = normalen(start);
  let wo = 0;
  let max = 0;
  const weit = [];
  for (let v = 0; v < n; v++) {
    const d = Math.abs((vor[3 * v] - start[3 * v]) * N[3 * v] + (vor[3 * v + 1] - start[3 * v + 1]) * N[3 * v + 1] + (vor[3 * v + 2] - start[3 * v + 2]) * N[3 * v + 2]);
    if (d > 0.5) weit.push(v);
    if (d > max) {
      max = d;
      wo = v;
    }
  }
  const P = vor;
  const kante = (a, b) => Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]);
  const umg = [...nb[wo]].map((j) => ({ j, l: +kante(wo, j).toFixed(2), val: nb[j].size }));
  // umgeklappte Dreiecke am Punkt
  let flip = 0;
  let winkelMin = 180;
  for (let t = 0; t < T.length; t += 3) {
    if (T[t] !== wo && T[t + 1] !== wo && T[t + 2] !== wo) continue;
    const a = 3 * T[t];
    const b = 3 * T[t + 1];
    const c = 3 * T[t + 2];
    const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]];
    const w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const Nn = normalen(P);
    if (f[0] * Nn[3 * wo] + f[1] * Nn[3 * wo + 1] + f[2] * Nn[3 * wo + 2] < 0) flip++;
    const ecken = [T[t], T[t + 1], T[t + 2]];
    for (let e = 0; e < 3; e++) {
      const o = ecken[e];
      const p1 = ecken[(e + 1) % 3];
      const p2 = ecken[(e + 2) % 3];
      const l1 = kante(o, p1);
      const l2 = kante(o, p2);
      const l3 = kante(p1, p2);
      const cw = (l1 * l1 + l2 * l2 - l3 * l3) / (2 * l1 * l2);
      winkelMin = Math.min(winkelMin, (Math.acos(Math.max(-1, Math.min(1, cw))) * 180) / Math.PI);
    }
  }
  return { aus, wo, max: +max.toFixed(2), p: [P[3 * wo], P[3 * wo + 1], P[3 * wo + 2]].map((x) => +x.toFixed(1)), valenz: nb[wo].size, umg, flip, winkelMin: +winkelMin.toFixed(1), weit: weit.length, n };
});
console.log(`30 Runden einzeln (Runde: größte Form-Bewegung, Punkt, Punkte über 0,05):`);
console.log('  ' + diag.aus.map((a) => `${a.r}: ${a.max} @${a.wo} (${a.p.join(',')}) ×${a.ueber}`).join('\n  '));
console.log(`am weitesten gewandert: Punkt ${diag.wo} um ${diag.max} bei (${diag.p.join(', ')}), Valenz ${diag.valenz}, umgeklappte Dreiecke am Punkt ${diag.flip}, kleinster Winkel dort ${diag.winkelMin}°, Punkte über 0,5 gewandert: ${diag.weit} von ${diag.n}`);
console.log(`  Nachbarn (Kantenlänge, Valenz): ${diag.umg.map((u) => `${u.l}/${u.val}`).join(' ')}`);
// war der Punkt schon im Startnetz da? (Lage vor dem Zug in der Nähe)
let naechst = Infinity;
for (let v = 0; v < P0.length; v += 3) naechst = Math.min(naechst, Math.hypot(P0[v] - diag.p[0], P0[v + 1] - diag.p[1], P0[v + 2] - diag.p[2]));
console.log(`  nächster Punkt des Netzes vor dem Zug: ${naechst.toFixed(2)} entfernt`);
if (fehler.length) console.log(`FEHLER: ${fehler.slice(0, 3).join(' | ')}`);
await seite.mouse.up();
await browser.close();
