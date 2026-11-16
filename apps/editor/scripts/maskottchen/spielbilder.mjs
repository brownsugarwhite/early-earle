// Bilder aus dem laufenden Spiel (echter Bildtakt): Ozzy ab VON, Pfeil rechts (EILEN=1: mit Umschalt) gehalten, je ABSTAND
// Sekunden ein Bildschirmfoto der Bühne, nebeneinander gesetzt.
//   VON=1100 BILDER=4 ABSTAND=0.7 [EILEN=1] node scripts/maskottchen/spielbilder.mjs <aus.png>
import { chromium } from '@playwright/test';

const aus = process.argv[2] ?? '/tmp/spiel.png';
const von = Number(process.env.VON ?? 1100);
const bilder = Number(process.env.BILDER ?? 4);
const abstand = Number(process.env.ABSTAND ?? 0.7);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const seite = await browser.newPage({ viewport: { width: 1500, height: 820 }, deviceScaleFactor: 1 });
await seite.goto('http://localhost:5207/maskottchen.html?reiter=spielen');
await seite.waitForFunction(() => window.__ozzy);
await seite.addStyleTag({ content: '#kopfzeile, #hud, #leiste, .steuerung { display: none !important; }' });
await seite.evaluate((von) => {
  const o = window.__ozzy;
  o.spiel.neustart();
  o.spiel.spieler.setzen(von, 1);
  o.spiel.hoehe = o.spiel.boden(von);
}, von);
await seite.waitForTimeout(400);
if (process.env.EILEN === '1') await seite.keyboard.down('Shift');
await seite.keyboard.down('ArrowRight');
const fotos = [];
for (let i = 0; i < bilder; i++) {
  await seite.waitForTimeout(abstand * 1000);
  const r = await seite.evaluate(() => {
    const b = window.__ozzy.buehne.grund.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  fotos.push((await seite.screenshot({ clip: { x: r.x + r.w * 0.12, y: r.y + r.h * 0.18, width: r.w * 0.62, height: r.h * 0.74 } })).toString('base64'));
}
await seite.keyboard.up('ArrowRight');
// nebeneinander
const png = await seite.evaluate(async (fotos) => {
  const imgs = await Promise.all(fotos.map((f) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${f}`; })));
  const c = document.createElement('canvas');
  c.width = imgs.reduce((s, i) => s + i.width, 0) + (imgs.length - 1) * 8;
  c.height = imgs[0].height;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  let x = 0;
  for (const i of imgs) {
    g.drawImage(i, x, 0);
    x += i.width + 8;
  }
  return c.toDataURL('image/png');
}, fotos);
const { writeFileSync } = await import('node:fs');
writeFileSync(aus, Buffer.from(png.split(',')[1], 'base64'));
await browser.close();
console.log(aus);
