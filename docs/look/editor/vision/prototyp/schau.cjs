// Bilder aufnehmen: node schau.cjs <html> <ausgabe.png> [breite] [hoehe] [wartenMs] [skript.js]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const [html, aus, b = '1280', h = '800', warten = '1500', skript] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +b, height: +h }, deviceScaleFactor: 1 });
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fehler.push(m.type() + ': ' + m.text()); else console.log('log:', m.text()); });
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  await page.goto('file://' + require('path').resolve(html));
  await page.waitForTimeout(+warten);
  if (skript) { const fn = require(require('path').resolve(skript)); await fn(page); }
  await page.screenshot({ path: aus });
  if (fehler.length) console.log(fehler.slice(0, 20).join('\n'));
  await browser.close();
})();
