// SVG-Skizze als PNG: node skizze.cjs <svg> <png>
const fs = require('fs');
const { createRequire } = require('module');
const req = createRequire(require('path').join(__dirname, '../../../../apps/editor/'));
const { chromium } = req('@playwright/test');

(async () => {
  const svg = fs.readFileSync(process.argv[2], 'utf8');
  const m = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: Number(m[1]), height: Number(m[2]) }, deviceScaleFactor: 2 });
  await seite.setContent('<!doctype html><html><body style="margin:0">' + svg + '</body></html>');
  await seite.screenshot({ path: process.argv[3] });
  await browser.close();
})();
