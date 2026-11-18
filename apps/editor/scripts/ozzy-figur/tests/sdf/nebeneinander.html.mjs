// Bilder nebeneinander setzen (mit Beschriftung), optional Ausschnitt: node nebeneinander.html.mjs aus.png 'x,y,w,h' a.png:Titel b.png:Titel …
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const [aus, aussch, ...rest] = process.argv.slice(2);
const [x, y, w, h] = aussch.split(',').map(Number);
const skal = Number(process.env.SKAL ?? 1);
const bilder = rest.map(r => { const [f, t] = r.split(':'); return { url: 'data:image/png;base64,' + readFileSync(f).toString('base64'), t }; });
const B = Math.round(w * skal), Hh = Math.round(h * skal);
const html = `<html><body style="margin:0;background:#fff;font:15px Helvetica"><div id="r" style="display:flex;gap:12px;padding:10px;background:#fff">${bilder.map(b => `<div><div style="width:${B}px;height:${Hh}px;overflow:hidden;position:relative;border:1px solid #ddd"><img src="${b.url}" style="position:absolute;left:${-x * skal}px;top:${-y * skal}px;transform-origin:0 0;transform:scale(${skal});image-rendering:${skal > 1.5 ? 'pixelated' : 'auto'}"></div><div style="color:#666;margin-top:4px">${b.t}</div></div>`).join('')}</div></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: (B + 14) * bilder.length + 20, height: Hh + 60 } });
await page.setContent(html); await page.waitForTimeout(200);
await (await page.$('#r')).screenshot({ path: aus });
await browser.close();
