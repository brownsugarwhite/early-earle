// Bilder des Prototyps: node schau.cjs <ausgabe-präfix> [schritte als JSON]
const path = require('path');
const { createRequire } = require('module');
const req = createRequire(require('path').join(__dirname, '../../../../apps/editor/'));
const { chromium } = req('@playwright/test');

(async () => {
  const dpr = Number(process.env.DPR || 2);
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const seite = await browser.newPage({ viewport: { width: Number(process.env.B || 1500), height: Number(process.env.H || 940) }, deviceScaleFactor: dpr });
  const meldungen = [];
  seite.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') meldungen.push(m.type() + ': ' + m.text().slice(0, 600)); });
  seite.on('pageerror', (e) => meldungen.push('pageerror: ' + String(e).slice(0, 600)));
  const html = require('fs').readFileSync(path.join(__dirname, 'blaupause.html'), 'utf8');
  await seite.setContent('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>', { waitUntil: 'load' });
  await seite.waitForFunction(() => !!window.__blaupause, null, { timeout: 20000 }).catch(() => meldungen.push('kein __blaupause'));
  await seite.evaluate(() => document.fonts && document.fonts.ready);
  const aus = process.argv[2] || 'bild';
  const schritte = JSON.parse(process.argv[3] || '[{"n":"1"}]');
  for (const s of schritte) {
    await seite.evaluate((s) => {
      const p = window.__blaupause; if (!p) return;
      if (s.blatt) p.blatt(s.blatt);
      if (s.setze) p.setze(s.setze);
      if (s.farbe) p.farbe(s.farbe);
      if (s.zoom) for (const z of s.zoom) p.fenster[z[0]].zoom = z[1];
      if (s.ansicht) for (const a of s.ansicht) p.ansicht(a[0], a[1], a[2]);
      if (s.waehle !== undefined) p.waehle(s.waehle);
      if (s.feld !== undefined) p.feld(s.feld);
    }, s);
    await seite.waitForTimeout(s.warte || 500);
    const opt = { path: `${aus}-${s.n}.png` };
    if (s.clip) opt.clip = s.clip;
    await seite.screenshot(opt);
  }
  const info = await seite.evaluate(() => {
    const c = document.getElementById('gl'); const gl = c.getContext('webgl2');
    const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return { ms: window.__blaupause ? Math.round(window.__blaupause.zeit() * 10) / 10 : -1, gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?', fehler: document.getElementById('fehler').textContent, punkte: window.__blaupause ? window.__blaupause.punkte.length : -1 };
  });
  console.log(JSON.stringify(info));
  if (process.env.LISTE) console.log(await seite.evaluate(() => window.__blaupause.punkte.map((q, i) => i + ' ' + (q.kreuz ? 'X' : '-') + ' hart ' + q.hart + ' pt ' + q.pt.map((x) => Math.round(x * 100) / 100).join('/') + ' griffe ' + q.griffe.map((g) => g.linie + ':' + g.len.toFixed(2)).join(' ')).join('\n')));
  console.log(meldungen.join('\n') || 'keine Meldungen');
  await browser.close();
})();
