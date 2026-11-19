// Setzt das Bildblatt zum Paint-Modus, Etappe 4 (weiche Kanten, zwei Fassungen der Bedienung): legt `paint-weich-bogen.html` neben
// die Szene (`szene.js` aus `paint-weich-szene.mjs`) und nimmt die Seite als Bild auf.
// Aufruf aus apps/editor: node scripts/ozzy/paint-weich-bogen.mjs <ordner mit szene.js> [ziel.jpg]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ordner = path.resolve(process.argv[2] ?? '.');
const ziel = process.argv[3] ?? path.resolve(hier, '../../../../docs/progress/ozzy/2026-11-19-paint-etappe-4-bedienung-bogen.jpg');
const schrift = `file://${path.resolve(hier, '../../../../assets/fonts/lobster/Lobster-Regular.ttf')}`;
fs.writeFileSync(path.join(ordner, 'bogen.html'), fs.readFileSync(path.join(hier, 'paint-weich-bogen.html'), 'utf-8').replace('LOBSTER', schrift));
const b = await chromium.launch();
const s = await b.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 1 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
await s.goto(`file://${path.join(ordner, 'bogen.html')}`);
await s.waitForFunction(() => document.body.dataset.fertig === '1', null, { timeout: 120000 });
await s.waitForTimeout(400);
await s.screenshot({ path: ziel, fullPage: true, type: 'jpeg', quality: 92 });
await b.close();
console.log(`Bildblatt: ${ziel}`, fehler.length ? fehler : '');
