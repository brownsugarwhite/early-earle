// Form zuerst (06.11.2026), Florians Frage „ist Gedächtnis dann nicht besser?“: Tempo eines kleinen, örtlichen Zugs. Kugel mit drei
// Loops und einer kleinen Form ums Auge (F, Seite), dann den obersten Punkt der Form zweimal 15 hinauf, bei verschiedenen Netzdichten.
// Mit Gedächtnis rechnet der Zug nur im Bereich um die Form, aus den Kurven immer die ganze Haut. Je Zug: Drücken (bis die Seite wieder
// reagiert), Zerlegen, je Mausbewegung, Loslassen. Vergleich: KURVEN_URL mit ?haut=gedaechtnis.
// Aufruf aus apps/editor: node scripts/pruefen/form-tempo-oertlich.mjs [dreiecke …]
import { chromium } from '@playwright/test';

const dichten = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [6000, 20000];
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 6) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
};

for (const d of dichten) {
  await seite.goto(`${basis}${basis.includes('?') ? '&' : '?'}dreiecke=${d}`);
  await seite.waitForFunction(() => window.__kurven !== undefined, null, { timeout: 120000 });
  await seite.waitForTimeout(300);
  for (const [a, A, B] of [
    ['seite', { x: -200, y: 0, z: 0 }, { x: 200, y: 0, z: 0 }],
    ['top', { x: -200, y: 0, z: 0 }, { x: 200, y: 0, z: 0 }],
    ['seite', { x: 10, y: 200, z: 0 }, { x: 10, y: -200, z: 0 }],
  ]) {
    await seite.keyboard.press('l');
    await ziehen(xy(await bild(a, A)), xy(await bild(a, B)));
  }
  await seite.keyboard.press('Escape');
  // Form ums Auge wie in form-loops-braue.mjs
  await seite.keyboard.press('f');
  const kreis = [];
  for (let i = 0; i <= 48; i++) kreis.push(await bild('seite', { x: -60 + 32 * Math.cos((2 * Math.PI * i) / 48), y: 45 + 32 * Math.sin((2 * Math.PI * i) / 48), z: 0 }));
  await seite.mouse.move(kreis[0].x, kreis[0].y);
  await seite.mouse.down();
  for (const p of kreis.slice(1)) {
    await seite.mouse.move(p.x, p.y);
    await seite.waitForTimeout(6);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(300);
  await seite.keyboard.press('Escape');
  const auge = (await K('loops')).at(-1);
  const sAuge = auge.punkte.filter((p) => p.sichtbar !== false).reduce((b, p) => (p.ref.y > b.ref.y ? p : b)).s;
  const punkte = (await K('zeiten')).punkte;
  for (const runde of [1, 2]) {
    // Pause: das Fenster rechnet in der Ruhe vor (aus den Kurven)
    await seite.waitForTimeout(1500);
    const ref = (await K('loops')).find((l) => l.id === auge.id).punkte.find((p) => Math.abs(p.s - sAuge) < 1e-6).ref;
    const [x, y] = xy(await bild('seite', ref));
    await seite.mouse.move(x, y);
    const t0 = Date.now();
    await seite.mouse.down();
    await seite.mouse.move(x, y - 1);
    const druecken = Date.now() - t0;
    const zerlegen = (await K('zeiten')).zerlegen;
    const [, y2] = xy(await bild('seite', { ...ref, y: ref.y + 15 }));
    for (let i = 1; i <= 30; i++) await seite.mouse.move(x, y + ((y2 - y) * i) / 30);
    const t1 = Date.now();
    await seite.mouse.up();
    await seite.waitForTimeout(10);
    const loslassen = Date.now() - t1;
    const z = await K('zeiten');
    const zug = z.zug.slice(-30);
    const mittel = zug.reduce((s, v) => s + v, 0) / zug.length;
    console.log(
      `${d} bestellt, ${punkte} Punkte, Zug ${runde}: Drücken ${druecken} ms (Zerlegen ${Math.round(zerlegen)} ms) · je Bewegung ${mittel.toFixed(1)} ms (max ${Math.max(...zug).toFixed(1)}) · Loslassen ${loslassen} ms`,
    );
  }
}
console.log(fehler.length ? `Fehler im Fenster: ${fehler.join(' | ')}` : 'Fehler im Fenster: keine');
await browser.close();
