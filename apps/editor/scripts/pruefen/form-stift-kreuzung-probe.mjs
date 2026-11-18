// Form zuerst (08.11.2026), Florian mit zwei Bildern: „Wenn ich z. B. eine Form mit P erstelle und diese über die vorhandenen Linien
// ziehe, ist die Form sehr ungenau und wird von den auf den Kreuzungen stehenden Punkten verzogen. Die Form soll exakt wie eingezeichnet
// direkt auf der Haut liegen, ohne diese zu verändern.“ Nachgestellt wie in seinem Bild: Kugel, drei Loops (Ring waagerecht, Mitte,
// Ring senkrecht), in der Seite mit dem Stift ein Kreis (Radius R, vier glatte Anker auf den Diagonalen, Griffe wie ein Kreis) um die
// Kreuzung der beiden Ringe; er kreuzt beide Ringe je zweimal. Gemessen: Linie im Blatt gegen die gezeichnete Form (px), wie weit sich
// die Haut bewegt hat (Abstand jedes Punkts zur Fläche vorher), umgeklappte Dreiecke, Griffe an den Ankern gegen die gezeichneten.
// ECKEN=1: die vier Anker geklickt (Ecken, gerade Stücke) statt glatt. Aufruf aus apps/editor:
// node scripts/pruefen/form-stift-kreuzung-probe.mjs [ordner für Bild]   (R=78, ECKEN=1, KURVEN_URL)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? null;
const R = Number(process.env.R ?? 78);
const ECKEN = process.env.ECKEN === '1';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const loops = () => K('loops');
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 6) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(1500);
};
const schnapp = () => seite.evaluate(() => ({ P: window.__kurven.lagen(), T: window.__kurven.dreiecke() }));

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
await seite.waitForTimeout(800);
const vorher = await schnapp();
const loopsVorher = (await loops()).length;

// ---------- Stift: Kreis um die Kreuzung (10, 0), Anker auf den Diagonalen ----------
const C = { x: 10, y: 0 };
const h = 0.5523 * R;
const A = [45, 135, 225, 315].map((w) => {
  const t = (w * Math.PI) / 180;
  return { p: { x: C.x + R * Math.cos(t), y: C.y + R * Math.sin(t), z: 0 }, g: ECKEN ? { x: 0, y: 0, z: 0 } : { x: -h * Math.sin(t), y: h * Math.cos(t), z: 0 } };
});
await seite.keyboard.press('p');
for (const { p, g } of A) {
  const a = await bild('seite', p);
  const b = await bild('seite', { x: p.x + g.x, y: p.y + g.y, z: 0 });
  await seite.mouse.move(a.x, a.y);
  await seite.mouse.down();
  if (!ECKEN) for (let i = 1; i <= 6; i++) await seite.mouse.move(a.x + ((b.x - a.x) * i) / 6, a.y + ((b.y - a.y) * i) / 6);
  await seite.mouse.up();
  await seite.waitForTimeout(120);
}
const p0 = await bild('seite', A[0].p);
await seite.mouse.click(p0.x, p0.y);
await seite.waitForTimeout(1500);
const nachher = await schnapp();
const L = await loops();
const l = L.at(-1);
console.log(`Stift-${ECKEN ? 'Raute (Ecken)' : 'Kreis'} R ${R} um die Kreuzung: ${L.length - loopsVorher} neuer Loop (${l.art}), Punkte ${l.punkte.filter((p) => p.sichtbar !== false).length} (davon Kreuzungen ${l.punkte.filter((p) => p.kreuzung !== null).length})`);

// ---------- Linie im Blatt gegen die Zeichnung ----------
const zeichnung = [];
for (let i = 0; i < A.length; i++) {
  const p = A[i];
  const q = A[(i + 1) % A.length];
  const c = [p.p, { x: p.p.x + p.g.x, y: p.p.y + p.g.y }, { x: q.p.x - q.g.x, y: q.p.y - q.g.y }, q.p];
  for (let k = 0; k < 200; k++) {
    const t = k / 200;
    const u = 1 - t;
    const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    zeichnung.push({ x: b.reduce((s, w, j) => s + w * c[j].x, 0), y: b.reduce((s, w, j) => s + w * c[j].y, 0) });
  }
}
const linie = Array.from({ length: l.proben }, (_, j) => ({ x: l.ruhe[3 * j], y: l.ruhe[3 * j + 1], z: l.ruhe[3 * j + 2] }));
const abstandZu = (q, poly) => {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy));
  }
  return m;
};
const px = (await bild('seite', { x: 1, y: 0, z: 0 })).x - (await bild('seite', { x: 0, y: 0, z: 0 })).x;
let weit = 0;
let wo = null;
for (const q of linie) {
  const d = abstandZu(q, zeichnung);
  if (d > weit) {
    weit = d;
    wo = q;
  }
}
console.log(`  Linie im Blatt neben der Zeichnung: bis ${weit.toFixed(2)} Einheiten = ${(weit * px).toFixed(1)} px bei 100 % (bei x ${wo.x.toFixed(0)}, y ${wo.y.toFixed(0)})`);

// ---------- Griffe an den Ankern gegen die gezeichneten (Länge im Blatt) ----------
for (const { p, g } of A) {
  const q = l.punkte.find((r) => Math.hypot(r.ref.x - p.x, r.ref.y - p.y) < 4 && r.ref.z > 0);
  if (!q || !q.aus) {
    console.log(`  Anker (${p.x.toFixed(0)}, ${p.y.toFixed(0)}): ${q ? 'ohne Griff' : 'kein Punkt'}`);
    continue;
  }
  console.log(`  Anker (${p.x.toFixed(0)}, ${p.y.toFixed(0)}): Griff im Blatt ${Math.hypot(q.aus.x, q.aus.y).toFixed(1)} lang (gezeichnet ${Math.hypot(g.x, g.y).toFixed(1)} für das ganze Stück bis zum nächsten Anker)`);
}

// ---------- Haut: wie weit hat sie sich bewegt? ----------
const punktDreieck = (p, a, b, c) => {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const nn = dot(n, n) || 1;
  const ap = sub(p, a);
  const dn = dot(ap, n) / nn;
  const q = [p[0] - dn * n[0], p[1] - dn * n[1], p[2] - dn * n[2]];
  // baryzentrisch prüfen, sonst Abstand zu den Kanten
  const v0 = ab;
  const v1 = ac;
  const v2 = sub(q, a);
  const d00 = dot(v0, v0);
  const d01 = dot(v0, v1);
  const d11 = dot(v1, v1);
  const d20 = dot(v2, v0);
  const d21 = dot(v2, v1);
  const den = d00 * d11 - d01 * d01 || 1;
  const v = (d11 * d20 - d01 * d21) / den;
  const w = (d00 * d21 - d01 * d20) / den;
  if (v >= 0 && w >= 0 && v + w <= 1) return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const seg = (s0, s1) => {
    const d = sub(s1, s0);
    const t = Math.max(0, Math.min(1, dot(sub(p, s0), d) / (dot(d, d) || 1)));
    return Math.hypot(p[0] - s0[0] - t * d[0], p[1] - s0[1] - t * d[1], p[2] - s0[2] - t * d[2]);
  };
  return Math.min(seg(a, b), seg(b, c), seg(c, a));
};
const { P: P0, T: T0 } = vorher;
const ecke = (v) => [P0[3 * v], P0[3 * v + 1], P0[3 * v + 2]];
const zelle = 20;
const raster = new Map();
for (let t = 0; t < T0.length / 3; t++) {
  const vs = [T0[3 * t], T0[3 * t + 1], T0[3 * t + 2]];
  const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...vs.map((v) => P0[3 * v + c])) / zelle));
  const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...vs.map((v) => P0[3 * v + c])) / zelle));
  for (let i = lo[0]; i <= hi[0]; i++)
    for (let j = lo[1]; j <= hi[1]; j++)
      for (let k = lo[2]; k <= hi[2]; k++) {
        const s = `${i},${j},${k}`;
        if (!raster.has(s)) raster.set(s, []);
        raster.get(s).push(t);
      }
}
let haut = 0;
let hautWo = null;
let ueber = 0;
for (let v = 0; v < nachher.P.length / 3; v++) {
  const p = [nachher.P[3 * v], nachher.P[3 * v + 1], nachher.P[3 * v + 2]];
  const c = p.map((x) => Math.floor(x / zelle));
  let best = Infinity;
  for (let i = c[0] - 1; i <= c[0] + 1; i++)
    for (let j = c[1] - 1; j <= c[1] + 1; j++)
      for (let k = c[2] - 1; k <= c[2] + 1; k++)
        for (const t of raster.get(`${i},${j},${k}`) ?? []) best = Math.min(best, punktDreieck(p, ecke(T0[3 * t]), ecke(T0[3 * t + 1]), ecke(T0[3 * t + 2])));
  if (best > haut) {
    haut = best;
    hautWo = p;
  }
  if (best > 0.5) ueber++;
}
console.log(`  Haut bewegt bis ${haut.toFixed(2)} Einheiten (${ueber} Punkte über 0,5) bei (${hautWo.map((x) => x.toFixed(0)).join(', ')}) · umgeklappt ${await K('umgeschlagen')}`);
if (ordner) {
  await K('ausschnitt', 'seite', { cx: C.x, cy: -C.y, zoom: 2 });
  await seite.waitForTimeout(300);
  const f = (await K('felder')).seite;
  await seite.screenshot({ path: `${ordner}/form-stift-kreuzung${ECKEN ? '-ecken' : ''}${R !== 78 ? `-r${R}` : ''}-2026-11-08.jpg`, type: 'jpeg', quality: 88, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
}
if (fehler.length) console.log(`Fehler: ${fehler.slice(0, 3).join(' | ')}`);
await browser.close();
