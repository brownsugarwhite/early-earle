// Ozzy, Phase 5.2 (16.11.2026): Bilder an „strange bird“ (Raum mit Tropfen an der Wand, eingerastete Seite mit Nadel, Vier Ansichten)
// und ein Bogen daraus. Keine Probe: nur die Bilder für Florian.
// Aufruf aus apps/editor: node scripts/pruefen/ozzy-bearbeiten-bilder.mjs <ordner für die Einzelbilder> <bogen.png>
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const aus = process.argv[2];
const ziel = process.argv[3];
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await s.goto('http://localhost:5205/ozzy.html?form=strange%20bird&film=1');
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
};
await ruhig();
await s.waitForTimeout(800);
// 1 Raum: ein Punkt der Mitte an der Wand der Seite, der Tropfen hängt am Zeiger
let a = (await O('ankerImBild', 3, 5, 'seite'))[0];
await s.mouse.move(a.x + 40, a.y + 40);
await s.waitForTimeout(200);
await s.mouse.move(a.x + 1, a.y + 1, { steps: 8 });
await s.waitForTimeout(700);
await s.screenshot({ path: `${aus}/1-raum.png` });
await s.screenshot({ path: `${aus}/1-nah.png`, clip: { x: a.x - 150, y: a.y - 105, width: 300, height: 210 } });
// 2 eingerastete Seite: die Nadel an einem Punkt der Mitte, gedreht
await s.mouse.move(40, 860);
await s.keyboard.press('1');
await s.waitForTimeout(1400);
await s.mouse.move(720, 450);
await s.mouse.wheel(0, -460);
await s.waitForTimeout(900);
a = (await O('ankerImBild', 3, 5, 'seite'))[0];
const L = await O('werkLinienDaten');
console.log(JSON.stringify(a), L.find((l) => l.id === 3).punkte.length);
// Richtung zum nächsten Punkt der Linie suchen: auf dem Kreis um den Punkt, wo das Ziel „Richtung“ heißt
let beste = null;
for (let w = 0; w < 360 && !beste; w += 15) {
  const x = a.x + 14 * Math.cos((w * Math.PI) / 180);
  const y = a.y + 14 * Math.sin((w * Math.PI) / 180);
  await s.mouse.move(x, y);
  await s.waitForTimeout(160);
  const z = (await O('bearbeiten')).ziel;
  if (z.startsWith('Richtung')) beste = { w, x, y, z };
}
console.log(JSON.stringify(beste));
if (beste) {
  await s.mouse.down();
  await s.waitForTimeout(250);
  for (let k = 1; k <= 16; k++) {
    const w = ((beste.w + (k / 16) * 35) * Math.PI) / 180;
    await s.mouse.move(a.x + 14 * Math.cos(w), a.y + 14 * Math.sin(w));
    await s.waitForTimeout(35);
  }
  await s.waitForTimeout(400);
  await s.screenshot({ path: `${aus}/2-nadel.png`, clip: { x: a.x - 150, y: a.y - 105, width: 300, height: 210 } });
  await s.screenshot({ path: `${aus}/2-ganz.png` });
  await s.mouse.up();
  await ruhig();
  await s.keyboard.press('Meta+z');
  await ruhig();
}
// 3 Vier Ansichten
await s.mouse.move(40, 860);
await s.keyboard.press('0');
await s.waitForTimeout(1300);
await s.keyboard.press('Tab');
await s.waitForTimeout(1500);
await s.screenshot({ path: `${aus}/3-vier.png` });
// Bogen
const b = (n) => `data:image/png;base64,${readFileSync(`${aus}/${n}`).toString('base64')}`;
const bogen = await browser.newPage({ viewport: { width: 1800, height: 2100 }, deviceScaleFactor: 1 });
await bogen.setContent(`<html><body style="margin:0;background:#fff;font:16px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="padding:22px 28px 10px;font-size:22px">Ozzy, Phase 5.1 und 5.2: „strange bird“ geladen, Linien des Werks auf allen Flächen, Bedienung der Linien-Studie</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 28px">
<figure style="margin:0"><img src="${b('1-raum.png')}" style="width:100%;border:0.5px solid #ddd"><figcaption>1 Raum: an allen drei Wänden die Linien des Werks</figcaption></figure>
<figure style="margin:0"><img src="${b('1-nah.png')}" style="width:100%;border:0.5px solid #ddd"><figcaption>1 nah: an der Wand der Seite hängt der Tropfen an einem Punkt (dreifach vergrößert)</figcaption></figure>
<figure style="margin:0"><img src="${b('2-ganz.png')}" style="width:100%;border:0.5px solid #ddd"><figcaption>2 Seite eingerastet</figcaption></figure>
<figure style="margin:0"><img src="${b('2-nadel.png')}" style="width:100%;border:0.5px solid #ddd"><figcaption>2 nah: die Nadel dreht die Richtung, gerechnet als Griff des Werks; die Gegenseite dreht mit</figcaption></figure>
<figure style="margin:0;grid-column:span 2"><img src="${b('3-vier.png')}" style="width:100%;border:0.5px solid #ddd"><figcaption>3 Vier Ansichten: Seite, Front, Top mit allen Linien, bearbeitbar; ins Leere gezogen ein Rahmen</figcaption></figure>
</div></body></html>`);
await bogen.waitForTimeout(300);
await bogen.screenshot({ path: ziel, fullPage: true });
await browser.close();
