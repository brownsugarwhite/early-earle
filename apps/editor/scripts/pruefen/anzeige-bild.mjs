// Bild der Vergleichsseite `anzeige.html` (Plan vom 12.11., Schritt 1). Aufruf aus apps/editor:
//   node scripts/pruefen/anzeige-bild.mjs <ziel.png|.jpg> ['name=strange bird&z1=…'] 
// Umgebung: URL (Standard http://localhost:5197), BREITE, HOEHE (Standard 2400 × 1400), DPR (2), AUSSCHNITT="x,y,b,h" (in Seitenpunkten)
import { chromium } from '@playwright/test';
const [ziel, frage = ''] = process.argv.slice(2);
if (!ziel) throw new Error('Ziel fehlt');
const breite = Number(process.env.BREITE ?? 2400);
const hoehe = Number(process.env.HOEHE ?? 1400);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: Number(process.env.DPR ?? 2) });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${process.env.URL ?? 'http://localhost:5197'}/anzeige.html?${frage}`);
await page.waitForFunction(() => window.__anzeige !== undefined, null, { timeout: 60000 });
const stand = await page.evaluate(() => ({ bereit: window.__anzeige.bereit, text: window.__anzeige.text, fehler: window.__anzeige.fehler }));
if (!stand.bereit) throw new Error(`Seite meldet: ${stand.fehler}`);
await page.waitForTimeout(300);
const clip = process.env.AUSSCHNITT ? (([x, y, width, height]) => ({ x, y, width, height }))(process.env.AUSSCHNITT.split(',').map(Number)) : undefined;
await page.screenshot({ path: ziel, ...(ziel.endsWith('.jpg') ? { type: 'jpeg', quality: 90 } : {}), ...(clip ? { clip } : {}) });
console.log(stand.text.join('\n'));
if (fehler.length) console.log('Fehler der Seite:', fehler.join(' | '));
await browser.close();
