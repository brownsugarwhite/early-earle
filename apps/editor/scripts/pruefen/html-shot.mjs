import { chromium } from '@playwright/test';
// Aufruf: node html-shot.mjs <html> <png> [breite]
const [html, png, breite] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(breite ?? 1200), height: 700 }, deviceScaleFactor: 1 });
await page.goto('file://' + html);
await page.screenshot({ path: png, fullPage: true });
await browser.close();
