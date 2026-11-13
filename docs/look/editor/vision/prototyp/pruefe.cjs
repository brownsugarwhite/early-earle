// Prüfbilder mit echten Mauszügen: node pruefe.cjs <seite> <ausgabeordner> <schritte.js> [breite] [hoehe]
// Die Seite läuft mit der Filmuhr (?film=leer); zwischen den Mauszügen wird die Uhr weitergeschaltet.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [seite, aus, skript, b = '1280', h = '800', zusatz = ''] = process.argv.slice(2);
  fs.mkdirSync(aus, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: +b, height: +h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fehler.push(m.type() + ': ' + m.text()); else console.log('log:', m.text()); });
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(seite) + '?film=leer' + (zusatz ? '&' + zusatz : ''));
  await page.waitForTimeout(2500);
  const schritt = (n = 1, ms = 1000 / 30) => page.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__film.schritt(ms); }, [n, ms]);
  await schritt(8);
  let nr = 0;
  const bild = async (name) => { const f = path.join(aus, String(++nr).padStart(2, '0') + '_' + name + '.jpg'); await page.screenshot({ path: f, type: 'jpeg', quality: 88 }); console.log(f); };
  const t0 = Date.now();
  const api = { page, schritt, bild, app: (fn, arg) => page.evaluate(fn, arg) };
  await require(path.resolve(skript))(api);
  console.log('Dauer', ((Date.now() - t0) / 1000).toFixed(1), 's');
  if (fehler.length) console.log(fehler.slice(0, 20).join('\n'));
  await browser.close();
})();
