// Form zuerst (10.11.2026), G5: Probewesen mit der Maus bauen und sichern, immer dieselben Züge (zum Messen der Netzgüte mit
// `form-netzguete.ts`, vor und nach einer Änderung am Verdichten). Kein Ersatz für Florians Wesen: wenige Linien, wenige Züge.
//   Stufe 1  „…-kugel“: die Kugel mit drei Loops (Ring waagerecht, Mitte, Ring senkrecht)
//   Stufe 2  „…-hals“:  der obere Punkt 160 hinauf (Hals), ein Ring um den Hals, dessen vorderer Punkt 70 nach vorn (Kopf)
//   Stufe 3  „…-wesen“: vorn ein Rüssel (110 hinaus), auf dem senkrechten Ring ein Punkt bei 55° und 60 hinaus (Ohr), dort Kante
//   Stufe 4  „…-spiel“: mit dem Ohr und dem Kopf gespielt, je sechsmal hinaus und zurück an dieselbe Stelle (wächst das Netz,
//            wenn die Form am Ende dieselbe ist?)
// Gesichert wird wie von Hand über das Fenster (in wesen/); danach wandern die Dateien nach `ZIEL` (Standard
// apps/editor/pruefen-ausgabe/probewesen, nicht im Repo), damit Florians Liste von „Laden“ nur seine Wesen zeigt.
// Aufruf aus apps/editor: node scripts/pruefen/form-probewesen.mjs
//   KURVEN_URL (Standard …/kurven.html?gewichte=geometrie; dichter mit &dreiecke=14000 bzw. 30000)   NAME=probe (Vorsilbe der Namen)
//   SPIEL=6: so oft je Punkt hinaus und zurück in Stufe 4 (die Zahl der Punkte nach jedem Mal steht in der Ausgabe)
// Messen: cd ../../packages/shape && ORDNER=../../apps/editor/pruefen-ausgabe/probewesen npx vite-node ../../apps/editor/scripts/pruefen/form-netzguete.ts
import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const vorsilbe = process.env.NAME ?? 'probe';
const ablage = fileURLToPath(new URL('../../../../wesen/', import.meta.url));
const ziel = path.resolve(process.env.ZIEL ?? fileURLToPath(new URL('../../pruefen-ausgabe/probewesen/', import.meta.url)));
const gesichert = [];
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
const ruhig = async () => {
  await seite.waitForTimeout(150);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
};
const ziehen = async (a, von, nach, n = 30) => {
  const [x, y] = await bild(a, von);
  const [x2, y2] = await bild(a, nach);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
    await seite.waitForTimeout(16);
  }
  await seite.waitForTimeout(150);
  await seite.mouse.up();
  await ruhig();
};
const schneiden = async (a, P, Q) => {
  await seite.keyboard.press('l');
  const [x, y] = await bild(a, { ...P, z: 0 });
  const [x2, y2] = await bild(a, { ...Q, z: 0 });
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x2, y2, { steps: 8 });
  await seite.mouse.up();
  await ruhig();
};
const sichtbar = (l) => l.punkte.filter((q) => q.sichtbar !== false);
const sichern = async (stufe) => {
  const name = `${vorsilbe}-${stufe}`;
  const text = await seite.evaluate((n) => window.__kurven.ablage.sichern(n), name);
  console.log(`${name}: ${text}`);
  if (text.startsWith('gesichert')) gesichert.push(name);
};

// ---------- Stufe 1: Kugel mit drei Loops ----------
await schneiden('seite', { x: -200, y: 0 }, { x: 200, y: 0 });
await schneiden('top', { x: -200, y: 0 }, { x: 200, y: 0 });
await schneiden('seite', { x: 10, y: 200 }, { x: 10, y: -200 });
await seite.keyboard.press('Escape');
await sichern('kugel');

// ---------- Stufe 2: Hals, Ring um den Hals, Kopf ----------
let L = await K('loops');
const oben = sichtbar(L[2]).reduce((b, q) => (q.ref.y > b.ref.y ? q : b)).ref;
await ziehen('seite', oben, { ...oben, y: oben.y + 160 }, 50);
await schneiden('seite', { x: -170, y: 235 }, { x: 190, y: 235 });
await seite.keyboard.press('Escape');
L = await K('loops');
if (L.length < 4) console.log('FEHL: der Ring um den Hals ist nicht entstanden');
else {
  const vorn = sichtbar(L[3]).reduce((b, q) => (q.ref.x < b.ref.x ? q : b)).ref;
  await ziehen('seite', vorn, { ...vorn, x: vorn.x - 70, y: vorn.y + 10 }, 30);
}
await sichern('hals');

// ---------- Stufe 3: Rüssel, Ohr, Kante ----------
L = await K('loops');
const schnauze = sichtbar(L[0]).reduce((b, q) => (q.ref.x < b.ref.x ? q : b)).ref;
await ziehen('seite', schnauze, { ...schnauze, x: schnauze.x - 110 }, 40);
L = await K('loops');
{
  // eine Stelle des senkrechten Rings bei 55° von oben (am Rumpf, unter dem Hals), in der Front
  const R = L[2].ruhe;
  let best = null;
  for (let j = 0; j < R.length / 3; j++) {
    const p = { x: R[3 * j], y: R[3 * j + 1], z: R[3 * j + 2] };
    if (p.z <= 0 || p.y > 135 || p.y < 0) continue;
    const w = Math.abs((Math.atan2(p.z, p.y) * 180) / Math.PI - 55);
    if (!best || w < best.w) best = { p, w };
  }
  const [x, y] = await bild('front', best.p);
  const vorher = sichtbar(L[2]).length;
  await seite.mouse.dblclick(x, y);
  await ruhig();
  L = await K('loops');
  if (sichtbar(L[2]).length !== vorher + 1) console.log(`FEHL: der Punkt für das Ohr ist nicht entstanden (${vorher} → ${sichtbar(L[2]).length})`);
  const ohr = sichtbar(L[2]).reduce((b, q) => (Math.hypot(q.ref.y - best.p.y, q.ref.z - best.p.z) < Math.hypot(b.ref.y - best.p.y, b.ref.z - best.p.z) ? q : b)).ref;
  await ziehen('front', ohr, { ...ohr, y: ohr.y + 35, z: ohr.z + 49 }, 30);
  await seite.keyboard.press('k');
  await ruhig();
}
await sichern('wesen');

// ---------- Stufe 4: gespielt (hinaus und zurück, die Form am Ende wie vorher) ----------
{
  const mal = Number(process.env.SPIEL ?? 6);
  const spielen = async (name, a, wer, weg) => {
    const verlauf = [(await K('zeiten')).punkte];
    for (let i = 0; i < mal; i++) {
      const p = (await wer()).ref;
      const q = { x: p.x + weg.x, y: p.y + weg.y, z: p.z + weg.z };
      await ziehen(a, p, q, 20);
      await ziehen(a, (await wer()).ref, p, 20);
      verlauf.push((await K('zeiten')).punkte);
    }
    console.log(`  ${name}, ${mal}-mal hinaus und zurück, Punkte im Netz nach jedem Mal: ${verlauf.join(' ')}`);
  };
  // das Ohr: der Punkt des senkrechten Rings, der am weitesten außen liegt
  await spielen('Ohr', 'front', async () => sichtbar((await K('loops'))[2]).reduce((b, q) => (q.ref.z > b.ref.z ? q : b)), { x: 0, y: 30, z: 45 });
  // der Kopf: der vordere Punkt des Rings um den Hals
  await spielen('Kopf', 'seite', async () => sichtbar((await K('loops'))[3]).reduce((b, q) => (q.ref.x < b.ref.x ? q : b)), { x: -50, y: 25, z: 0 });
}
await sichern('spiel');
const zt = await K('zeiten');
console.log(`am Ende ${zt.punkte} Punkte, ${(await K('loops')).length} Loops · Konsole: ${fehler.length ? fehler.slice(0, 3).join(' | ') : 'keine Fehler'}`);
await browser.close();
await mkdir(ziel, { recursive: true });
for (const name of gesichert) await rename(path.join(ablage, `${name}.eewesen`), path.join(ziel, `${name}.eewesen`));
console.log(`die Dateien liegen in ${ziel}`);
