// Wandelt ein Bild (webp, jpg …) im Browser in PNG um, in voller Größe.  node scripts/maskottchen/wandeln.mjs <ein> <aus.png>
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const [ein, aus] = process.argv.slice(2);
const art = ein.endsWith('.webp') ? 'image/webp' : ein.endsWith('.jpg') || ein.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
const url = `data:${art};base64,${fs.readFileSync(ein).toString('base64')}`;
const browser = await chromium.launch();
const seite = await browser.newPage();
const png = await seite.evaluate(async (u) => {
  const img = new Image();
  img.src = u;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0);
  return [c.width, c.height, c.toDataURL('image/png')];
}, url);
await browser.close();
fs.writeFileSync(aus, Buffer.from(png[2].split(',')[1], 'base64'));
console.log('Größe', png[0], png[1]);
