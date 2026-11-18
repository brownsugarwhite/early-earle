// Form zuerst (06.11.2026), Greifen bei vielen Punkten (`kurven.html`), mit der Maus. Florian: „Greifen auch bei vielen Punkten
// schnell machen“. Kugel mit drei Loops (Ring waagerecht, Mitte, Ring senkrecht) bei verschiedenen Netzdichten (`?dreiecke=`): die
// vordere Kreuzung in der Seite zweimal ziehen. Je Zug: Zeit des Drückens (bis die Seite wieder reagiert), Zerlegen beim Greifen,
// je Mausbewegung, Loslassen (samt Verdichten und Nachlösen). Zwischen den Zügen eine Pause, in der das Fenster vorrechnet.
// Aufruf aus apps/editor: node scripts/pruefen/form-greifen-probe.mjs [dreiecke …]   (KURVEN_URL ohne Parameter)
import { chromium } from '@playwright/test';

const dichten = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [6000, 20000, 36000];
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
  const punkte = (await K('zeiten')).punkte;
  const mitte = (await K('loops')).find((l) => l.art === 'mitte');
  const vorn = mitte.punkte.reduce((b, p) => (p.ref.x < b.ref.x ? p : b));
  let ref = vorn.ref;
  for (const runde of [1, 2]) {
    await seite.waitForTimeout(runde === 1 ? 400 : 1500);
    const [x, y] = xy(await bild('seite', ref));
    await seite.mouse.move(x, y);
    const t0 = Date.now();
    await seite.mouse.down();
    await seite.mouse.move(x - 1, y);
    const druecken = Date.now() - t0;
    const zerlegen = (await K('zeiten')).zerlegen;
    for (let i = 1; i <= 30; i++) await seite.mouse.move(x - 2 * i, y - i);
    const t1 = Date.now();
    await seite.mouse.up();
    await seite.waitForTimeout(10);
    const loslassen = Date.now() - t1;
    const z = await K('zeiten');
    const zug = z.zug.slice(-30);
    const mittel = zug.reduce((s, v) => s + v, 0) / zug.length;
    console.log(
      `${d} bestellt, ${punkte} Punkte, Zug ${runde}: Drücken ${druecken} ms (Zerlegen ${Math.round(zerlegen)} ms) · je Bewegung ${mittel.toFixed(1)} ms (max ${Math.max(...zug).toFixed(1)}) · ` +
        `Loslassen ${loslassen} ms (Nachlösen ${z.nachLoesen} ms, danach ${z.punkte} Punkte) · Vorrechnen zuletzt ${z.vorrechnen} ms`,
    );
    ref = (await K('loops')).find((l) => l.art === 'mitte').punkte.reduce((b, p) => (p.ref.x < b.ref.x ? p : b)).ref;
  }
}
console.log('Fehler im Fenster:', fehler.length ? fehler.slice(0, 3) : 'keine');
await browser.close();
