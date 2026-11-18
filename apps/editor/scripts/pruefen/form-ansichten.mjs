// Form zuerst (04.11.2026): Front und Top mit der Maus — Kugel, in der Front den breitesten Punkt nach unten und innen ziehen
// (Birne von vorn), im Top den breitesten Punkt nach vorn (Ei von oben). Misst Bauzeiten, prüft, dass die Seite bleibt, sammelt
// Konsolenfehler und schreibt ein Bild. Aufruf aus apps/editor: node scripts/pruefen/form-ansichten.mjs <ausgabe.jpg>
import { chromium } from '@playwright/test';

const ausgabe = process.argv[2] ?? 'form-ansichten.jpg';
const kugel = [{ x: 150, y: 0 }, { x: 0, y: 150 }, { x: -150, y: 0 }, { x: 0, y: -150 }];

const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(process.env.FORM_URL ?? 'http://localhost:5193/form.html');
await seite.waitForFunction(() => window.__form?.fein === true);
await seite.evaluate((p) => window.__formSetzen(p, []), kugel);
await seite.waitForFunction(() => window.__form?.fein === true && window.__form.front === null);
await seite.waitForTimeout(200);

const ziehen = async (wahl, dx, dy) => {
  const box = await seite.locator(wahl).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  const grob = [];
  for (let i = 1; i <= 12; i++) {
    await seite.mouse.move(x + (dx * i) / 12, y + (dy * i) / 12);
    await seite.waitForTimeout(40);
    const f = await seite.evaluate(() => ({ ms: window.__form.ms, fein: window.__form.fein }));
    if (!f.fein) grob.push(f.ms);
  }
  await seite.mouse.up();
  await seite.waitForFunction(() => window.__form?.fein === true);
  await seite.waitForTimeout(250);
  grob.sort((a, b) => a - b);
  return grob.length ? Math.round(grob[grob.length >> 1]) : null;
};

// der breiteste Punkt eines Profils (gezeichnet oder vom Körper abgeleitet): der am weitesten von der Achse
const breitester = async (blatt) =>
  seite.evaluate((b) => {
    const svg = document.getElementById(`profil-${b}`);
    const achse = svg.getBoundingClientRect();
    let best = null;
    let weit = -1;
    for (const e of svg.querySelectorAll('[data-ppunkt]')) {
      const r = e.getBoundingClientRect();
      const d = b === 'front' ? r.x + r.width / 2 - (achse.x + achse.width / 2) : r.y + r.height / 2 - (achse.y + achse.height / 2);
      if (d > weit) {
        weit = d;
        best = e.dataset.ppunkt;
      }
    }
    return `[data-ppunkt="${best}"]`;
  }, blatt);

// Front: breitester Punkt nach unten und innen; Top: breitester Punkt nach vorn (links)
const zugFront = await ziehen(await breitester('front'), -40, 70);
const zugTop = await ziehen(await breitester('top'), -30, 12);
const ende = await seite.evaluate(() => ({
  ms: Math.round(window.__form.ms),
  dreiecke: window.__form.dreiecke,
  front: window.__form.front?.map((p) => [Number(p.laengs.toFixed(3)), Number(p.quer.toFixed(1))]),
  top: window.__form.top?.map((p) => [Number(p.laengs.toFixed(3)), Number(p.quer.toFixed(1))]),
  seite: window.__form.punkte,
}));
await seite.screenshot({ path: ausgabe, type: 'jpeg', quality: 88 });
console.log(JSON.stringify({ zugFrontMs: zugFront, zugTopMs: zugTop, ...ende, fehler }));
await browser.close();
