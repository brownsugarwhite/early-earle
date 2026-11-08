// Form zuerst (08.11.2026), Florian: „Die Performance ist momentan beim Ziehen ganz gut, aber beim Loslassen springt das Mesh teilweise
// ziemlich zwischen den Punkten.“ Gemessen wird, wie weit und wann sich die Haut nach dem Loslassen noch bewegt: Stand nach der letzten
// Mausbewegung (A), gleich nach dem Loslassen (B: Runden am Ende, Verdichten), dann alle Änderungen in der Ruhe bis zum Stillstand
// (Setzen des neuen Netzes, Nachverfeinern). Abstand je Punkt des späteren Stands zur Fläche von A (Punkt zu Dreieck).
// FALL=ohr: Ohr aus dem senkrechten Ring (wie form-detail-probe). FALL=hals: obere Kreuzung in der Seite 160 hoch (Flasche).
// FALL=ruessel: neuer Punkt auf der Mitte, weit hinaus (+320/−70). SCHRITTE: Mausschritte des Zugs (Standard 30).
// Varianten über KURVEN_URL (z. B. ?verdichten=0, ?genau=0).
// Aufruf aus apps/editor: node scripts/pruefen/form-loslassen-probe.mjs
import { chromium } from '@playwright/test';

const fall = process.env.FALL ?? 'hals';
const schritte = Number(process.env.SCHRITTE ?? 30);
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
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
const schnapp = () => seite.evaluate(() => ({ P: window.__kurven.lagen(), T: window.__kurven.dreiecke(), z: window.__kurven.zeiten() }));
const gleich = (a, b) => a.P.length === b.P.length && a.P.every((v, i) => v === b.P[i]);

// ---------- Abstand Punkt → Fläche (Raster über die Dreiecke) ----------
const punktDreieck = (p, a, b, c) => {
  // nächster Punkt auf dem Dreieck (Ericson)
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  let q;
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b);
    const d3 = dot(ab, bp);
    const d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) q = b;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        q = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
      } else {
        const cp = sub(p, c);
        const d5 = dot(ab, cp);
        const d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) q = c;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            q = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])];
            } else {
              const den = 1 / (va + vb + vc);
              const v = vb * den;
              const w = vc * den;
              q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
            }
          }
        }
      }
    }
  }
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const flaeche = (S) => {
  const { P, T } = S;
  let kante = 0;
  for (let i = 0; i < T.length; i += 3) kante += Math.hypot(P[3 * T[i]] - P[3 * T[i + 1]], P[3 * T[i] + 1] - P[3 * T[i + 1] + 1], P[3 * T[i] + 2] - P[3 * T[i + 1] + 2]);
  const h = (2 * kante) / (T.length / 3);
  const zellen = new Map();
  const key = (i, j, k) => `${i},${j},${k}`;
  for (let t = 0; t < T.length / 3; t++) {
    const v = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...v.map((w) => P[3 * w + c])) / h));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...v.map((w) => P[3 * w + c])) / h));
    for (let i = lo[0]; i <= hi[0]; i++)
      for (let j = lo[1]; j <= hi[1]; j++)
        for (let k = lo[2]; k <= hi[2]; k++) {
          const s = key(i, j, k);
          const l = zellen.get(s);
          if (l) l.push(t);
          else zellen.set(s, [t]);
        }
  }
  const ecke = (w) => [P[3 * w], P[3 * w + 1], P[3 * w + 2]];
  return (p) => {
    const c = [0, 1, 2].map((k) => Math.floor(p[k] / h));
    let best = Infinity;
    for (let r = 1; r <= 12; r++) {
      const gesehen = new Set();
      for (let i = c[0] - r; i <= c[0] + r; i++)
        for (let j = c[1] - r; j <= c[1] + r; j++)
          for (let k = c[2] - r; k <= c[2] + r; k++) {
            const l = zellen.get(key(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (gesehen.has(t)) continue;
              gesehen.add(t);
              best = Math.min(best, punktDreieck(p, ecke(T[3 * t]), ecke(T[3 * t + 1]), ecke(T[3 * t + 2])));
            }
          }
      if (best <= (r - 0.5) * h) return best;
    }
    return best;
  };
};
/** wie weit sich die Fläche von A nach B bewegt hat: je Punkt von B der Abstand zur Fläche von A (größter, 99 %, Mittel, Ort) */
const bewegung = (A, B) => {
  const d = flaeche(A);
  const w = [];
  let wo = null;
  let max = 0;
  for (let v = 0; v < B.P.length / 3; v++) {
    const p = [B.P[3 * v], B.P[3 * v + 1], B.P[3 * v + 2]];
    const x = d(p);
    w.push(x);
    if (x > max) {
      max = x;
      wo = p;
    }
  }
  w.sort((a, b) => a - b);
  return { max, p99: w[Math.floor(0.99 * (w.length - 1))], mittel: w.reduce((s, x) => s + x, 0) / w.length, wo, ueber1: w.filter((x) => x > 1).length };
};
const f2 = (x) => x.toFixed(2);

// ---------- Aufbau: Ring waagerecht (Seite), Mitte (Top), Ring senkrecht (Seite) ----------
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
const mitteLoop = L0.find((l) => l.art === 'mitte');

// ---------- der Zug, dessen Loslassen gemessen wird ----------
let start;
let ziel;
let ansicht = 'seite';
if (fall === 'hals') {
  const l = (await loops()).find((q) => q.id === senkrecht.id);
  const p = l.punkte.filter((q) => q.sichtbar !== false).reduce((b, q) => (q.ref.y > b.ref.y ? q : b));
  start = p.ref;
  ziel = { ...p.ref, y: p.ref.y + 160 };
} else if (fall === 'ruessel') {
  const q = { x: 150 * Math.SQRT1_2, y: 150 * Math.SQRT1_2, z: 0 };
  const [cx, cy] = xy(await bild('seite', q));
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(60);
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(400);
  await seite.keyboard.press('Escape');
  const l = (await loops()).find((r) => r.id === mitteLoop.id);
  const p = l.punkte.filter((r) => r.sichtbar !== false).reduce((b, r) => (Math.hypot(r.ref.x - q.x, r.ref.y - q.y) < Math.hypot(b.ref.x - q.x, b.ref.y - q.y) ? r : b));
  start = p.ref;
  ziel = { ...p.ref, x: p.ref.x + 320, y: p.ref.y - 70 };
} else if (fall === 'ohr') {
  ansicht = 'front';
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
  start = mitte[0].ref;
  const rich = { z: Math.sin((55 * Math.PI) / 180), y: Math.cos((55 * Math.PI) / 180) };
  ziel = { x: start.x, y: start.y + 70 * rich.y, z: start.z + 70 * rich.z };
}
await seite.waitForTimeout(1500);

const [x0, y0] = xy(await bild(ansicht, start));
const [x1, y1] = xy(await bild(ansicht, ziel));
await seite.mouse.move(x0, y0);
await seite.mouse.down();
const tz0 = Date.now();
for (let i = 1; i <= schritte; i++) await seite.mouse.move(x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte);
const zugMs = Date.now() - tz0;
await seite.waitForTimeout(150);
const A = await schnapp();
const t0 = Date.now();
await seite.mouse.up();
const B = await schnapp();
const tB = Date.now() - t0;
const verlauf = [];
let letzt = B;
let ruhig = 0;
while (Date.now() - t0 < 8000) {
  await seite.waitForTimeout(30);
  const S = await schnapp();
  if (gleich(S, letzt)) {
    if (++ruhig > 30 && Date.now() - t0 > 2000) break;
    continue;
  }
  ruhig = 0;
  verlauf.push({ t: Date.now() - t0, S });
  letzt = S;
}
const C = letzt;

// px je Einheit im Blatt bei 100 %
const a0 = await bild('front', { x: 0, y: 0, z: 0 });
const a1 = await bild('front', { x: 0, y: 0, z: 1 });
const px = Math.hypot(a1.x - a0.x, a1.y - a0.y) / ((await K('ausschnitt', 'front')).zoom || 1);

const zz = A.z.zug.slice(-schritte);
console.log(`${fall} (${basis.split('?')[1] ?? 'Standard'}): ${schritte} Mausschritte in ${zugMs} ms, je Bewegung ${f2(zz.reduce((s, v) => s + v, 0) / zz.length)} ms (max ${Math.max(...zz).toFixed(0)}), ${A.P.length / 3} Punkte vor dem Loslassen · ${px.toFixed(2)} px je Einheit bei 100 %`);
const zeile = (name, X, Y, t) => {
  const m = bewegung(X, Y);
  console.log(
    `  ${name}${t !== undefined ? ` (nach ${t} ms)` : ''}: ${Y.P.length / 3} Punkte · Haut bewegt bis ${f2(m.max)} (99 % ${f2(m.p99)}, Mittel ${f2(m.mittel)}, ${m.ueber1} Punkte über 1) ` +
      `bei (${m.wo.map((v) => v.toFixed(0)).join(', ')})`,
  );
};
zeile('Loslassen sofort (Runden am Ende + Verdichten)', A, B, tB);
verlauf.forEach((v, k) => zeile(`danach Änderung ${k + 1}`, k === 0 ? B : verlauf[k - 1].S, v.S, v.t));
zeile('Endstand gegen vor dem Loslassen', A, C);
// NACH=<Runden>: danach noch so viele Runden über die ganze Haut — ist der Endstand fertig gerechnet?
if (process.env.NACH) {
  await seite.evaluate((n) => window.__kurven.nachrechnen(n), Number(process.env.NACH));
  zeile(`noch ${process.env.NACH} Runden`, C, await schnapp());
}
const zC = C.z;
console.log(`  Zeiten: Verdichten ${zC.verdichtung?.ms ?? '–'} ms (${zC.verdichtung?.neu ?? 0} neu, ${zC.verdichtung?.gelegt ?? 0} gelegt) · Zerlegen in der Ruhe ${zC.vorrechnen} ms · Setzen samt Nachverfeinern ${zC.nachLoesen} ms`);
if (fehler.length) console.log(`Fehler: ${fehler.slice(0, 3).join(' | ')}`);
await browser.close();
