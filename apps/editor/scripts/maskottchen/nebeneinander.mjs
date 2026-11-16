// Bilder nebeneinander, mit Titel, optional ein Ausschnitt (gleich für alle):
//   [AUSSCHNITT=x,y,w,h] [MASSSTAB=1] node scripts/maskottchen/nebeneinander.mjs <aus.png> "Vorher=<a.png>" "Nachher=<b.png>" …
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [aus, ...paare] = process.argv.slice(2);
const bilder = paare.map((p) => {
  const i = p.indexOf('=');
  return { titel: p.slice(0, i), daten: `data:image/png;base64,${readFileSync(p.slice(i + 1)).toString('base64')}` };
});
const ausschnitt = process.env.AUSSCHNITT?.split(',').map(Number) ?? null;
const massstab = Number(process.env.MASSSTAB ?? 1);
const browser = await chromium.launch();
const seite = await browser.newPage();
const png = await seite.evaluate(
  async ({ bilder, ausschnitt, massstab }) => {
    const geladen = await Promise.all(
      bilder.map(
        (b) =>
          new Promise((fertig) => {
            const img = new Image();
            img.onload = () => fertig({ ...b, img });
            img.src = b.daten;
          }),
      ),
    );
    const [x, y, w, h] = ausschnitt ?? [0, 0, geladen[0].img.width, geladen[0].img.height];
    const bw = Math.round(w * massstab);
    const bh = Math.round(h * massstab);
    const kopf = 44;
    const luecke = 16;
    const c = document.createElement('canvas');
    c.width = geladen.length * bw + (geladen.length - 1) * luecke;
    c.height = bh + kopf;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    geladen.forEach((b, i) => {
      const ox = i * (bw + luecke);
      g.drawImage(b.img, x, y, w, h, ox, kopf, bw, bh);
      g.strokeStyle = 'rgba(31,26,23,0.25)';
      g.strokeRect(ox + 0.5, kopf + 0.5, bw - 1, bh - 1);
      g.fillStyle = '#1f1a17';
      g.font = '600 24px system-ui';
      g.fillText(b.titel, ox + 6, 30);
    });
    return c.toDataURL('image/png');
  },
  { bilder, ausschnitt, massstab },
);
const { writeFileSync } = await import('node:fs');
writeFileSync(aus, Buffer.from(png.split(',')[1], 'base64'));
await browser.close();
console.log(aus);
