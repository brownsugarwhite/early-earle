// HTML/SVG-Dateien als PNG oder JPG (Playwright, ohne Server). Aufruf aus apps/editor:
// node scripts/pruefen/html-shot.mjs [--jpg] <datei.html> [weitere …]; mit `--jpg` als JPEG (Qualität 86), AUSGABE = Zielordner,
// BREITE und HOEHE = Größe des Fensters (Standard 1600 × 1200; die ganze Seite wird aufgenommen, mindestens aber diese Höhe)
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { chromium } from '@playwright/test';
const args = process.argv.slice(2);
const jpg = args.includes('--jpg');
const browser = await chromium.launch();
for (const datei of args.filter((a) => a !== '--jpg')) {
  const page = await browser.newPage({ viewport: { width: Number(process.env.BREITE ?? 1600), height: Number(process.env.HOEHE ?? 1200) }, deviceScaleFactor: 1 });
  await page.setContent(readFileSync(datei, 'utf8'));
  await page.waitForTimeout(200);
  const name = basename(datei).replace(/\.(html|svg)$/, jpg ? '.jpg' : '.png');
  const pfad = process.env.AUSGABE ? resolve(process.env.AUSGABE, name) : datei.replace(/\.(html|svg)$/, jpg ? '.jpg' : '.png');
  await page.screenshot({ path: pfad, fullPage: true, ...(jpg ? { type: 'jpeg', quality: 86 } : {}) });
  console.log(pfad);
  await page.close();
}
await browser.close();
