// Form zuerst (11.11.2026): an Florians Form `test_kaputt` den Griff des obersten Punkts der Mitte in einem Zug 160 Einheiten auf die
// falsche Seite und zurück, Schritt für Schritt: Punkte im Netz, Verfeinerungen, umgeschlagene Dreiecke.
// Aufruf aus apps/editor: node scripts/pruefen/form-griff-spur.mjs   (KURVEN_URL)
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
seite.on('console', (m) => { if (m.type() === 'error') console.log('KONSOLE', m.text().slice(0, 200)); });
await seite.goto(process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie');
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
console.log(await seite.evaluate((n) => window.__kurven.ablage.laden(n), 'test_kaputt'));
const ruhig = async () => { await seite.waitForTimeout(200); await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 }); };
await ruhig();
const stand = () => seite.evaluate(() => { const k = window.__kurven; const z = k.zeiten(); return { punkte: z.punkte, umg: k.umgeschlagen(), hint: z.hintergrund, stufen: z.stufen, offen: z.offen, auf: z.aufraeumen, nachlauf: z.nachlauf, unruhe: z.unruhe }; });
// 1. oberster mittlerer Punkt 40 nach unten
{
  const L = await K('loops');
  const p = L.find((x) => x.id === 4).punkte.reduce((b, q) => (q.ref.y > b.ref.y ? q : b));
  await K('ausschnitt', 'front', { cx: p.ref.z, cy: -p.ref.y + 20, zoom: 0.5 });
  await seite.waitForTimeout(150);
  const a = await K('bild', 'front', p.ref);
  const b = await K('bild', 'front', { ...p.ref, y: p.ref.y - 40 });
  await seite.mouse.move(a.x, a.y); await seite.waitForTimeout(80); await seite.mouse.down();
  for (let s = 1; s <= 12; s++) { await seite.mouse.move(a.x, a.y + ((b.y - a.y) * s) / 12); await seite.waitForTimeout(16); }
  await seite.waitForTimeout(300); await seite.mouse.up(); await ruhig();
  console.log('nach Zug 1', JSON.stringify(await stand()));
}
// 2. Punkt 3:1 wählen, Griff aus umdrehen und zurück
{
  const L = await K('loops');
  const p = L.find((x) => x.id === 3).punkte[1];
  await K('ausschnitt', 'seite', { cx: p.ref.x, cy: -p.ref.y, zoom: 0.5 });
  await seite.waitForTimeout(150);
  const b = await K('bild', 'seite', p.ref);
  await seite.mouse.click(b.x, b.y);
  await ruhig(); await seite.waitForTimeout(450);
  console.log('nach dem Wählen', JSON.stringify(await stand()), JSON.stringify(await K('auswahl')));
  const g = await K('griffe', 3, 1);
  const sp = g.aus;
  let von = await K('bild', 'seite', sp);
  await seite.mouse.move(von.x, von.y); await seite.waitForTimeout(80); await seite.mouse.down();
  for (const w of [[-160, -13], [0, 0]]) {
    const nach = await K('bild', 'seite', { x: sp.x + w[0], y: sp.y + w[1], z: sp.z });
    for (let s = 1; s <= 12; s++) {
      await seite.mouse.move(von.x + ((nach.x - von.x) * s) / 12, von.y + ((nach.y - von.y) * s) / 12);
      await seite.waitForTimeout(16);
      console.log(`  Griff ${w.join(',')} Schritt ${s}: ${JSON.stringify(await stand())}`);
    }
    von = nach;
  }
  await seite.waitForTimeout(300);
  console.log('gehalten', JSON.stringify(await stand()));
  await seite.mouse.up(); await ruhig();
  console.log('in Ruhe', JSON.stringify(await stand()), await K('meldung'));
}
await browser.close();
