// Vergleichsbilder der Probe „Anfang einer Form“ (15.11.2026): dieselbe Form, dieselbe Ansicht, je Fassung eine Reihe von Momenten
// des Aufblasens (Zeit fest gesetzt, Bilder genau wiederholbar), dazu die vier Fassungen in Ruhe groß nebeneinander.
// Aufruf aus apps/editor, Server auf 5203 (Eintrag `anfang`):
//   node scripts/anfang/bilder.mjs [ziel-ordner] [präfix]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { FISCH } from './fisch.mjs';

const URL = process.env.URL ?? 'http://localhost:5203';
const ziel = process.argv[2] ?? '../../docs/progress/anfang';
const praefix = process.argv[3] ?? '2026-11-15';
const B = 1200;
const H = 800;
const NAMEN = ['Seifenhaut', 'Irisdruck', 'Horizont', 'Höhenlinien'];
const MOMENTE = (process.env.MOMENTE ?? '0,0.3,0.6,0.8,0.88,0.95,1.1,1.4,2.0,3.2').split(',').map(Number);
const LISTE = (process.env.FASSUNGEN ?? '0,3').split(',').map(Number);
const GRUENDE = (process.env.GRUND ?? 'papier,nacht').split(',');

fs.mkdirSync(ziel, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
page.on('console', (m) => {
  if (m.type() === 'error') console.error('Seite:', m.text());
});
await page.goto(`${URL}/anfang.html?bild=1`);
await page.waitForFunction(() => window.__anfang);

const zelle = { x: 0, y: 0, width: 1200, height: 800 };
const bilder = {};
for (const grund of GRUENDE) {
  await page.evaluate((n) => window.__anfang.nacht(n), grund === 'nacht');
  for (const f of LISTE) {
    await page.evaluate(
      ([f, fisch]) => {
        window.__anfang.fassung(f);
        window.__anfang.form(fisch);
      },
      [f, FISCH],
    );
    for (const T of MOMENTE) {
      await page.evaluate((T) => {
        if (T === 0) {
          window.__anfang.zeit(null);
          window.__anfang.vorspulen(700);
        } else window.__anfang.zeit(T);
        window.__anfang.bild();
      }, T);
      await page.waitForTimeout(60);
      const buf = await page.screenshot({ clip: zelle, scale: 'css' });
      bilder[`${grund}-${f}-${T}`] = buf.toString('base64');
    }
    // groß in Ruhe
    await page.evaluate(() => {
      window.__anfang.zeit(2.6);
      window.__anfang.bild();
    });
    await page.waitForTimeout(60);
    const gross = await page.screenshot({ clip: { x: 150, y: 100, width: 900, height: 600 } });
    bilder[`${grund}-${f}-gross`] = gross.toString('base64');
  }
}
await page.evaluate(() => window.__anfang.zeit(null));

// Blätter zusammensetzen
const blatt = async (html, b, h, datei) => {
  const p = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.waitForTimeout(200);
  await p.screenshot({ path: datei, fullPage: true });
  await p.close();
  console.log('geschrieben:', datei);
};
const stil = `body{margin:0;padding:24px;font:15px/1.35 -apple-system,system-ui,sans-serif;color:#1f1a17;background:#fff}
  .reihe{display:flex;gap:10px;margin-bottom:6px}.z{display:flex;flex-direction:column;gap:4px}
  img{display:block;border:1px solid #e6e3df}.t{color:#6d6560;font-size:13px;margin:2px 0 14px}h2{font-size:15px;margin:10px 0 6px}`;
for (const grund of GRUENDE) {
  let html = `<style>${stil}</style>`;
  for (const f of LISTE) {
    html += `<h2>${f + 1} · ${NAMEN[f]}</h2><div class="reihe" style="flex-wrap:wrap;width:${5 * (360 + 10)}px">`;
    for (const T of MOMENTE)
      html += `<div class="z"><img width="360" src="data:image/png;base64,${bilder[`${grund}-${f}-${T}`]}"><div class="t">${T === 0 ? 'geschlossen, vor ↩' : `${T.toFixed(1).replace('.', ',')} s`}</div></div>`;
    html += '</div>';
  }
  await blatt(html, 48 + 5 * 370, 800, path.join(ziel, `${praefix}-ablauf-${grund}.png`));
  let gross = `<style>${stil}</style><div class="reihe" style="flex-wrap:wrap;width:${2 * 610}px">`;
  for (const f of LISTE)
    gross += `<div class="z"><img width="600" src="data:image/png;base64,${bilder[`${grund}-${f}-gross`]}"><div class="t">${f + 1} · ${NAMEN[f]}, in Ruhe</div></div>`;
  gross += '</div>';
  await blatt(gross, 2 * 610 + 48, 900, path.join(ziel, `${praefix}-ruhe-${grund}.png`));
}
await browser.close();
