// Film aufnehmen: node film.cjs <name> <ausgabe.mp4> [breite] [hoehe] [fps] [maxSek] [zusatz-parameter]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
(async () => {
  const [name, aus, b = '960', h = '600', fps = '25', maxSek = '16', zusatz = ''] = process.argv.slice(2);
  const ordner = aus + '.bilder';
  fs.rmSync(ordner, { recursive: true, force: true });
  fs.mkdirSync(ordner, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: +b, height: +h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('file://' + path.resolve('dist/vision.html') + '?film=' + name + (zusatz ? '&' + zusatz : ''));
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { for (let i = 0; i < 6; i++) window.__film.schritt(1); });
  const max = +maxSek * +fps;
  let n = 0, nachlauf = Math.round(+fps * 0.6);
  for (; n < max; n++) {
    const laeuft = await page.evaluate((ms) => window.__film.schritt(ms), 1000 / +fps);
    await page.screenshot({ path: `${ordner}/b_${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (!laeuft && n > 10) { if (--nachlauf <= 0) break; }
  }
  await browser.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${fps} -i ${ordner}/b_%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 22 -movflags +faststart ${aus}`);
  console.log(aus, n + 1, 'Bilder');
})();
