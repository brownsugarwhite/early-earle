// Ein Bildblatt aus mehreren PNG (20.11.2026, Shader): je Bild eine Kachel mit Namen darunter, im Testbrowser zusammengesetzt (kein
// Bildprogramm nötig).
// Aufruf: node scripts/ozzy/bildblatt.mjs <ziel.png> <spalten> <kachelbreite> <bild.png> …
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const [ziel, spaltenText, breiteText, ...bilder] = process.argv.slice(2);
const spalten = Number(spaltenText ?? 3);
const breite = Number(breiteText ?? 600);
const daten = bilder.map((b) => ({ name: path.basename(b, '.png'), url: `data:image/png;base64,${fs.readFileSync(b).toString('base64')}` }));
const browser = await chromium.launch();
const s = await browser.newPage();
const png = await s.evaluate(
  async ({ daten, spalten, breite }) => {
    const bilder = await Promise.all(daten.map(async (d) => ({ name: d.name, bild: await createImageBitmap(await (await fetch(d.url)).blob()) })));
    const hoehe = Math.round((breite * bilder[0].bild.height) / bilder[0].bild.width);
    const zeilen = Math.ceil(bilder.length / spalten);
    const c = document.createElement('canvas');
    c.width = spalten * breite;
    c.height = zeilen * (hoehe + 26);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.font = '15px system-ui, sans-serif';
    g.fillStyle = '#1f1a17';
    bilder.forEach((b, i) => {
      const x = (i % spalten) * breite;
      const y = Math.floor(i / spalten) * (hoehe + 26);
      g.drawImage(b.bild, x, y, breite, hoehe);
      g.fillText(b.name, x + 8, y + hoehe + 18);
    });
    return c.toDataURL('image/png');
  },
  { daten, spalten, breite },
);
fs.writeFileSync(ziel, Buffer.from(png.split(',')[1], 'base64'));
await browser.close();
console.log(`${ziel}: ${daten.length} Bilder`);
