// Form zuerst (05.11.2026), Härte: Braue als Augen-Form, oben hart und hochgezogen (`kurven.html`), mit der Maus.
// 1. F: Form ums Auge (Seite). 2. Oberen Punkt wählen, Taste 3 (hart). 3. In der Front den Punkt nach außen und etwas hoch ziehen.
// Bild, Knick quer über die Linie oben und unten. Dann ⌘Z (Zug und Härte), Taste 0 (weich), derselbe Zug: Bild, Knick.
// Aufruf aus apps/editor: node scripts/pruefen/form-loops-braue.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(300);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);

// 1. Form ums Auge
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
let auge = (await K('loops')).at(-1);
console.log('Form:', auge.art, auge.punkte.length, 'Punkte,', auge.proben, 'Proben · Meldung', JSON.stringify(await K('meldung')));

await K('setzeRadius', 45);
const versuch = async (taste, name) => {
  auge = (await K('loops')).at(-1);
  // die oberen drei Punkte wählen (⇧), hart oder weich stellen
  const drei = [...auge.punkte].sort((a, b) => b.ref.y - a.ref.y).slice(0, 3);
  const oben = drei[0];
  await seite.keyboard.press('Escape');
  await seite.keyboard.press('o');
  if (!(await seite.evaluate(() => document.getElementById('knopf-o').getAttribute('aria-pressed') === 'true'))) await seite.keyboard.press('o');
  for (const [k, p] of drei.entries()) {
    const q = await bild('seite', p.ref);
    if (k > 0) await seite.keyboard.down('Shift');
    await seite.mouse.click(q.x, q.y);
    if (k > 0) await seite.keyboard.up('Shift');
    await seite.waitForTimeout(80);
  }
  await seite.keyboard.press(taste);
  await seite.waitForTimeout(100);
  // in der Front nach außen (z) und etwas hoch (y)
  const a = await bild('front', oben.ref);
  const b = await bild('front', { ...oben.ref, z: oben.ref.z + 12, y: oben.ref.y + 5 });
  await seite.mouse.move(a.x, a.y);
  await seite.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await seite.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
    await seite.waitForTimeout(15);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(250);
  auge = (await K('loops')).at(-1);
  const kn = await K('knick', auge.id);
  let o = 0;
  let u = 0;
  for (let j = 0; j < kn.length; j++) {
    const y = auge.ruhe[3 * j + 1];
    if (y > oben.ref.y - 6) o = Math.max(o, kn[j]);
    if (y < 30) u = Math.max(u, kn[j]);
  }
  const z = await K('zeiten');
  console.log(`${name}: Knick oben ${o.toFixed(1)}°, unten ${u.toFixed(1)}° · zerlegen ${z.zerlegen} ms, Bereich ${z.bereich}`);
  await seite.screenshot({ path: `${ordner}/form-loops-braue-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 88 });
  // Nahbild Front: die Braue im Umriss
  const f = await K('felder');
  const mf = await bild('front', { ...oben.ref, z: oben.ref.z });
  await seite.screenshot({
    path: `${ordner}/form-loops-braue-${name}-front-2026-11-05.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: mf.x - 110, y: mf.y - 110, width: 220, height: 220 },
  });
  await seite.mouse.move(f.drei.x + f.drei.w / 2, f.drei.y + f.drei.h / 2);
  for (let i = 0; i < 5; i++) {
    await seite.mouse.wheel(0, -120);
    await seite.waitForTimeout(50);
  }
  await seite.waitForTimeout(150);
  await seite.screenshot({
    path: `${ordner}/form-loops-braue-${name}-nah-2026-11-05.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: f.drei.x + f.drei.w * 0.15, y: f.drei.y + f.drei.h * 0.1, width: f.drei.w * 0.7, height: f.drei.h * 0.85 },
  });
  for (let i = 0; i < 5; i++) await seite.mouse.wheel(0, 120);
};

await versuch('3', 'hart');
await seite.keyboard.press('Meta+z');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(200);
await versuch('0', 'weich');
console.log('Fehler im Fenster:', fehler.length ? fehler : 'keine');
await browser.close();
