import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const parsed = JSON.parse(readFileSync('parsed.json', 'utf8'));
const order = ['ozzy_laydown01.svg', 'ozzy_laydown02.svg', 'ozzy_stand02.svg', 'ozzy_stand01_logo.svg', 'ozzy_front.svg', 'ozzy_back.svg'];
const S = Number(process.env.S ?? 1.6);
function svgFor(f, mode) {
  const o = parsed[f]; const [, , w, h] = o.viewBox;
  let body = '';
  o.els.forEach((e, k) => {
    let fill = e.cls === 'schwarz' ? '#000' : '#fff';
    let extra = '';
    if (mode === 'bunt') { const hue = (k * 47) % 360; fill = `hsla(${hue},80%,${e.cls === 'schwarz' ? 40 : 75}%,0.55)`; extra = ` stroke="hsl(${hue},80%,30%)" stroke-width="1"`; }
    body += `<path d="${e.d}" fill="${fill}"${extra}/>`;
  });
  if (mode === 'bunt') o.els.forEach((e, k) => { const [a, b, c, d] = e.bbox; body += `<text x="${(a + c) / 2}" y="${(b + d) / 2}" font-size="16" font-family="Helvetica" font-weight="bold" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="middle">${k}</text>`; });
  if (mode === 'anker') o.els.forEach((e) => { for (const sp of e.subs) for (const sg of sp.segs) { const [p0, p1, p2] = sg.p; body += `<line x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}" stroke="#e33" stroke-width="0.6"/><line x1="${sg.p[3][0]}" y1="${sg.p[3][1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#e33" stroke-width="0.6"/><circle cx="${p0[0]}" cy="${p0[1]}" r="2" fill="#09f"/>`; } });
  return `<div class="z"><svg width="${w * S}" height="${h * S}" viewBox="-12 -6 ${w + 24} ${h + 6}" style="overflow:visible">${body}</svg><div class="n">${f.replace('ozzy_', '').replace('.svg', '')}</div></div>`;
}
const browser = await chromium.launch();
for (const mode of (process.env.MODI ?? 'normal,bunt').split(',')) {
  const html = `<html><body style="margin:0;background:#fff"><style>.r{display:flex;flex-wrap:wrap;width:2000px;align-items:flex-end;gap:${20 * S}px;padding:20px}.z{display:flex;flex-direction:column;align-items:center}.n{font:14px Helvetica;color:#888;margin-top:6px}</style><div class="r">${order.map(f => svgFor(f, mode)).join('')}</div></body></html>`;
  const page = await browser.newPage({ viewport: { width: 2100, height: 1800 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  const el = await page.$('.r');
  await el.screenshot({ path: `vorlagen-${mode}.png` });
  await page.close();
}
await browser.close();
console.log('ok');
