// Probe 1 und 3 der Probe „Anfang einer Form“: Übergang vom Blatt in den Raum (px) und Bildtakt beim Aufblasen, je Fassung,
// mit GPU, 1440 × 900 bei doppelter Dichte. Aufruf aus apps/editor, Server auf 5203: node scripts/anfang/takt.mjs
import { chromium } from '@playwright/test';
import { FISCH } from './fisch.mjs';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5203/anfang.html?bild=1');
await page.waitForFunction(() => window.__anfang);
const erg = [];
for (const f of [0, 1, 2, 3]) {
  const r = await page.evaluate(async ([f, fisch]) => {
    const a = window.__anfang;
    a.fassung(f);
    a.form(fisch.map((p) => ({ ...p, x: p.x + 120, y: p.y + 50 })));
    const ueb = a.uebergang();
    await new Promise((r) => setTimeout(r, 300));
    const zeiten = [];
    let letzte = performance.now();
    let laeuft = true;
    const mess = (t) => { zeiten.push(t - letzte); letzte = t; if (laeuft) requestAnimationFrame(mess); };
    requestAnimationFrame(mess);
    a.aufblasen();
    await new Promise((r) => setTimeout(r, 2700));
    laeuft = false;
    zeiten.shift();
    zeiten.sort((x, y) => x - y);
    const s = a.stand();
    return { bilder: zeiten.length, median: zeiten[zeiten.length >> 1], p95: zeiten[Math.floor(zeiten.length * 0.95)], bildMs: s.bildMs, netzMs: s.netzMs, punkte: s.punkte, ueb };
  }, [f, FISCH]);
  erg.push({ fassung: f, ...r });
}
console.log(JSON.stringify(erg, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));
await browser.close();
