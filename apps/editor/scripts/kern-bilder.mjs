// Wesen-Editor 2, Beweis 1: Bilder der Bauweise „kern“ je Prüfwesen (ganzer Editor mit Seitenleiste, 3D-Ausschnitt).
//   EDITOR_URL=http://localhost:5192 node scripts/kern-bilder.mjs [wesen,wesen,…] [ausgabeordner]   (Web-Modus muss laufen)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));
const wesenListe = (process.argv[2] ?? 'kugel,rex,langhals,ueberhang,tiger').split(',');
const aus = path.resolve(process.argv[3] ?? path.resolve(hier, '../../../docs/progress/editor'));
const url = process.env.EDITOR_URL ?? 'http://localhost:5180';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
for (const wesen of wesenListe) {
  for (const bauweise of ['kern', 'rund', 'earle']) {
    const look = bauweise === 'earle' ? `&look=earle&palette=${wesen === 'rex' ? 'rex' : wesen === 'kugel' ? 'blob' : wesen === 'langhals' ? 'giraffe' : 'tiger'}` : '';
    await page.goto(`${url}/?versuch=kern&wesen=${wesen}&bauweise=${bauweise === 'earle' ? 'kern' : bauweise}${look}`);
    await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    if (bauweise === 'kern') await page.screenshot({ path: path.join(aus, `kern-${wesen}.png`) });
    await page.screenshot({ path: path.join(aus, `kern-${wesen}-3d-${bauweise}.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    const text = await page.evaluate(() => document.querySelector('[data-bereich="kern"] dl')?.textContent ?? '');
    if (bauweise === 'kern') console.log(`${wesen}: ${text}`);
  }
}
// Beweis 2: Maul vorn/unten/hals, zu und auf, Earle-Look und Käfig (Röntgen), nur wenn MAUL gesetzt ist
if (process.env.MAUL) {
  const faelle = process.env.MAUL === '1' ? [['rex', 'vorn'], ['rex', 'unten'], ['langhals', 'hals'], ['kugel', 'vorn']] : process.env.MAUL.split(',').map((f) => f.split(':'));
  for (const [wesen, art] of faelle) {
    for (const [zustand, oeffnung] of [['zu', 0], ['halb', 0.5], ['auf', 1]]) {
      for (const kaefig of [0, 1]) {
        const palette = wesen === 'rex' ? 'rex' : wesen === 'kugel' ? 'blob' : wesen === 'langhals' ? 'giraffe' : 'tiger';
        await page.goto(`${url}/?versuch=kern&wesen=${wesen}&bauweise=kern&look=earle&palette=${palette}&maul=${art}&oeffnung=${oeffnung}&kaefig=${kaefig}`);
        await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1800);
        const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
        await page.screenshot({ path: path.join(aus, `kern-maul-${wesen}-${art}-${zustand}${kaefig ? '-kaefig' : ''}.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
        if (!kaefig) console.log(`${wesen} ${art} ${zustand}: ${await page.evaluate(() => document.querySelector('[data-bereich="kern"] dl')?.textContent ?? '')}`);
      }
    }
  }
}
// Beweis 3: Beine verschmolzen/angesteckt, Schwung −35/0/35, Zebra (Matcap) und Earle
if (process.env.BEINE) {
  for (const wesen of (process.env.BEINE === '1' ? 'rex,kugel' : process.env.BEINE).split(',')) {
    for (const art of ['verschmolzen', 'angesteckt']) {
      for (const schwung of [-35, 0, 35]) {
        for (const look of ['zebra', 'earle']) {
          const palette = wesen === 'rex' ? 'rex' : 'blob';
          const q = look === 'zebra' ? '&zebra=1' : `&look=earle&palette=${palette}`;
          await page.goto(`${url}/?versuch=kern&wesen=${wesen}&bauweise=kern&beine=${art}&schwung=${schwung}${q}`);
          await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(1800);
          const r = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
          await page.screenshot({ path: path.join(aus, `kern-beine-${wesen}-${art}-${schwung}-${look}.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
        }
      }
    }
  }
}
// Beweis 5: Feuer, Gas, Fell-Blob auf der Kugel: Standbild (Earle-Look bei Fell) und 3-s-Schleife als WebM
if (process.env.STIL) {
  for (const stil of (process.env.STIL === '1' ? 'feuer,gas,fell' : process.env.STIL).split(',')) {
    const q = stil === 'fell' ? '&look=earle&palette=tiger' : '';
    const ctx = await browser.newContext({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1, recordVideo: { dir: path.join(aus, 'video-roh'), size: { width: 1728, height: 1161 } } });
    const p2 = await ctx.newPage();
    await p2.goto(`${url}/?versuch=kern&wesen=kugel&bauweise=kern&stil=${stil}${q}`);
    await p2.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 60_000 });
    await p2.evaluate(() => document.fonts.ready);
    await p2.waitForTimeout(1500);
    const r = await p2.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    await p2.screenshot({ path: path.join(aus, `kern-stil-kugel-${stil}.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    await p2.waitForTimeout(3200);
    await p2.screenshot({ path: path.join(aus, `kern-stil-kugel-${stil}-2.png`), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    const video = p2.video();
    await ctx.close();
    if (video) {
      const roh = await video.path();
      fs.renameSync(roh, path.join(aus, `kern-stil-kugel-${stil}.webm`));
    }
    console.log(`${stil}: ${r.w}×${r.h}`);
  }
  fs.rmSync(path.join(aus, 'video-roh'), { recursive: true, force: true });
}
console.log(`geschrieben: ${aus}/kern-*.png`);
await browser.close();
