// Form zuerst (10.11.2026), Gegenprüfung Schritt G3: Was macht die Haut in den ersten Bildern eines Zugs?
// Drei Loops wie in form-loslassen-probe.mjs (Ring waagerecht, Mitte, Ring senkrecht). Die obere Kreuzung wird in der Seite gegriffen
// und in SCHRITTE Mausschritten nur WEIT Einheiten bewegt (Standard 3: gerade genug, dass der Zug beginnt), dann HALTEN ms gehalten.
// Je Bild im Fenster: wie weit die Haut vom Stand beim Greifen entfernt ist, überall und fern vom gegriffenen Punkt (über FERN
// Einheiten weg; dort dürfte sich bei einem Zug um 3 Einheiten fast nichts tun).
// Aufruf aus apps/editor: node scripts/pruefen/form-anlauf-probe.mjs
//   KURVEN_URL (Standard http://localhost:5193/kurven.html?gewichte=geometrie)   WEIT=3   SCHRITTE=6   PAUSE=16   HALTEN=600   FERN=100
//   GPU=1 echte Grafikkarte   ZWEIMAL=1: danach loslassen, 1,5 s warten und denselben Punkt noch einmal greifen
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const weit = Number(process.env.WEIT ?? 3);
const schritte = Number(process.env.SCHRITTE ?? 6);
const pause = Number(process.env.PAUSE ?? 16);
const halten = Number(process.env.HALTEN ?? 600);
const fern = Number(process.env.FERN ?? 100);
const browser = await chromium.launch(process.env.GPU ? { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : {});
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
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
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
  await ziehen(await bild(a, { ...A, z: 0 }), await bild(a, { ...B, z: 0 }), 6);
}
await seite.keyboard.press('Escape');
await seite.waitForTimeout(1500);

const greifen = async (name) => {
  const L = await K('loops');
  const senkrecht = L.find((l) => l.art === 'ring' && !l.punkte.every((p) => Math.abs(p.ref.y) < 30));
  const p = senkrecht.punkte.filter((q) => q.sichtbar !== false).reduce((b, q) => (q.ref.y > b.ref.y ? q : b));
  const [x0, y0] = await bild('seite', p.ref);
  const [x1, y1] = await bild('seite', { ...p.ref, y: p.ref.y + weit });
  // Aufzeichnung je Bild im Fenster, ab dem Drücken
  await seite.evaluate(
    ([q, r]) => {
      const K2 = window.__kurven;
      const P0 = Float64Array.from(K2.lagen());
      const istFern = new Uint8Array(P0.length / 3);
      for (let v = 0; v < istFern.length; v++) istFern[v] = Math.hypot(P0[3 * v] - q.x, P0[3 * v + 1] - q.y, Math.abs(P0[3 * v + 2]) - Math.abs(q.z)) > r ? 1 : 0;
      const rec = (window.__anlauf = { bilder: [], aus: false });
      let vor = P0;
      const t0 = performance.now();
      const tick = () => {
        if (rec.aus) return;
        const P = K2.lagen();
        if (P.length === P0.length) {
          let alle = 0;
          let weg = 0;
          let je = 0;
          for (let v = 0; v < istFern.length; v++) {
            const d = Math.hypot(P[3 * v] - P0[3 * v], P[3 * v + 1] - P0[3 * v + 1], P[3 * v + 2] - P0[3 * v + 2]);
            if (d > alle) alle = d;
            if (istFern[v] && d > weg) weg = d;
            const e = Math.hypot(P[3 * v] - vor[3 * v], P[3 * v + 1] - vor[3 * v + 1], P[3 * v + 2] - vor[3 * v + 2]);
            if (e > je) je = e;
          }
          if (je > 0) rec.bilder.push({ t: Math.round(performance.now() - t0), alle, fern: weg, je });
          vor = Float64Array.from(P);
        } else rec.bilder.push({ t: Math.round(performance.now() - t0), netz: P.length / 3 });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [p.ref, fern],
  );
  await seite.mouse.move(x0, y0);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte);
    if (pause) await seite.waitForTimeout(pause);
  }
  await seite.waitForTimeout(halten);
  const rec = await seite.evaluate(() => {
    window.__anlauf.aus = true;
    return window.__anlauf.bilder;
  });
  const z = await K('zeiten');
  console.log(`${name} (${basis.split('/').pop()}): ${z.punkte} Punkte, gegriffen bei (${[p.ref.x, p.ref.y, p.ref.z].map((v) => v.toFixed(0)).join(', ')}), ${weit} Einheiten in ${schritte} Mausschritten, dann ${halten} ms gehalten`);
  console.log(`  Bilder, in denen sich die Haut bewegt hat: ${rec.length}; je Bild „Zeit: überall / fern (> ${fern} weg) / gegen das Bild davor“ (Einheiten; 0,18 = ½ px bei 300 %)`);
  console.log(
    `  ${rec
      .slice(0, 24)
      .map((b) => (b.netz ? `${b.t} ms: neues Netz ${b.netz}` : `${b.t} ms: ${b.alle.toFixed(2)} / ${b.fern.toFixed(2)} / ${b.je.toFixed(2)}`))
      .join('\n  ')}`,
  );
  const fernMax = Math.max(0, ...rec.filter((b) => !b.netz).map((b) => b.fern));
  const ende = rec.filter((b) => !b.netz).pop();
  console.log(`  größter Ausschlag fern vom Griff: ${fernMax.toFixed(2)}; am Ende fern ${ende ? ende.fern.toFixed(2) : '–'}, überall ${ende ? ende.alle.toFixed(2) : '–'}`);
  await seite.mouse.up();
  await seite.waitForTimeout(1500);
};
await greifen('erstes Greifen');
if (process.env.ZWEIMAL) await greifen('zweites Greifen');
if (fehler.length) console.log(`FEHLER in der Konsole: ${fehler.slice(0, 3).join(' | ')}`);
await browser.close();
