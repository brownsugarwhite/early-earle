// Probe des 3D-Beweises (Plan docs/plans/2026-11-19-ozzy-figur-3d.md, Abschnitt 4) gegen das laufende Fenster ozzy-raum.html:
//   1  Deckung des Schwarz mit Florians Zeichnungen bei 0° (Front), 90° (Seite), 180° (Rücken); Ziel mindestens 97 %
//   2  Bilder: Schlüsselwinkel neben seinen Zeichnungen (45° neben seinem 3/4), Umlauf in 20°-Schritten, Bildfolge in 5°-Schritten
//   3  Tempo je Bild (Chrome und WebKit, 1000 × 1000)
//   aus apps/editor:  node scripts/ozzy-figur/raum-probe.mjs [ausordner]   (Adresse über RAUM_URL, Standard Port 5213)
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');
const URL_SEITE = process.env.RAUM_URL ?? 'http://localhost:5213/ozzy-raum.html';
const AUS = process.argv[2] ?? new URL('../../../../docs/progress/ozzy-figur/', import.meta.url).pathname;
const TAG = process.env.TAG ?? '2026-11-19-raum';
mkdirSync(AUS, { recursive: true });

async function oeffnen(art) {
  const browser = await (art === 'webkit' ? webkit : chromium).launch(art === 'webkit' ? {} : { channel: 'chrome', args: ['--use-angle=metal'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await page.goto(URL_SEITE);
  await page.waitForFunction(() => window.__ozzyRaum, null, { timeout: 60000 });
  await page.evaluate(() => window.__ozzyRaum.bereit());
  return { browser, page, fehler };
}

async function blatt(browser, bilder, breite, datei) {
  const html = `<html><body style="margin:0;background:#fff;font:13px Helvetica"><div id="r" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px;width:${breite}px">${bilder.map(([titel, u, w]) => `<div><img src="${u}" width="${w}" style="border:1px solid #eee;display:block"><div style="color:#888;text-align:center">${titel}</div></div>`).join('')}</div></body></html>`;
  const q = await browser.newPage({ viewport: { width: breite + 20, height: 1400 } });
  await q.setContent(html);
  await q.waitForTimeout(150);
  await (await q.$('#r')).screenshot({ path: AUS + datei });
  await q.close();
}

const ergebnis = { zeit: new Date().toISOString(), deckung: {}, tempo: {}, bau: null, fehler: {} };
{
  const { browser, page, fehler } = await oeffnen('chrome');
  ergebnis.bau = await page.evaluate(() => window.__ozzyRaum.zeiten());
  // 1 Deckung, dazu Unterschiedsbilder (rot nur 3D, blau nur Zeichnung)
  const vergleiche = [];
  for (const [psi, ansicht, spiegeln] of [[0, 'front', false], [90, 'profil', false], [180, 'back', false]]) {
    const r = await page.evaluate(([p, a, s]) => window.__ozzyRaum.vergleich(p, a, 800, 800, s), [psi, ansicht, spiegeln]);
    ergebnis.deckung[`${psi}°=${ansicht}`] = { deckung: Number((r.deckung * 100).toFixed(1)), nur3D: r.nur3D, nurZeichnung: r.nurVorlage };
    vergleiche.push([`${psi}°: ${(r.deckung * 100).toFixed(1)} % (rot nur 3D, blau nur Zeichnung)`, r.bild, 380]);
  }
  await blatt(browser, vergleiche, 3 * 392, `${TAG}-deckung.png`);
  // 2 Schlüsselwinkel neben seinen Zeichnungen
  const paare = [];
  for (const [psi, ansicht, spiegeln] of [[0, 'front', false], [45, 'viertel', false], [90, 'profil', false], [180, 'back', false]]) {
    await page.evaluate(([p]) => window.__ozzyRaum.zeigen(p, 600, 600), [psi]);
    paare.push([`${psi}° 3D`, await page.evaluate(() => window.__ozzyRaum.bild()), 300]);
    const z = await page.evaluate(async ([p, a, s]) => (await window.__ozzyRaum.vergleich(p, a, 600, 600, s, true)).zeichnung, [psi, ansicht, spiegeln]);
    if (z) paare.push([`Florian ${ansicht}`, z, 300]);
  }
  await blatt(browser, paare, 4 * 312, `${TAG}-ansichten.png`);
  // Umlauf in 20°-Schritten und Bildfolge in 5°-Schritten
  for (const [schritt, groesse, datei] of [[20, 260, 'umlauf'], [5, 150, 'bildfolge']]) {
    const bilder = [];
    for (let psi = 0; psi < 360; psi += schritt) {
      await page.evaluate(([p, g]) => window.__ozzyRaum.zeigen(p, g * 2, g * 2), [psi, groesse]);
      bilder.push([`${psi}°`, await page.evaluate(() => window.__ozzyRaum.bild()), groesse]);
    }
    await blatt(browser, bilder, Math.min(1900, (groesse + 12) * (schritt === 20 ? 6 : 12)), `${TAG}-${datei}.png`);
  }
  ergebnis.tempo.chrome = await page.evaluate(() => window.__ozzyRaum.tempo(120, 1000, 1000));
  ergebnis.fehler.chrome = fehler;
  await browser.close();
}
{
  const { browser, page, fehler } = await oeffnen('webkit');
  ergebnis.tempo.webkit = await page.evaluate(() => window.__ozzyRaum.tempo(120, 1000, 1000));
  ergebnis.fehler.webkit = fehler;
  await browser.close();
}
writeFileSync(`${AUS}${TAG}-probe.json`, JSON.stringify(ergebnis, null, 1));
const f = (v) => `${v.deckung} % (nur 3D ${v.nur3D}, nur Zeichnung ${v.nurZeichnung})`;
console.log('Deckung', Object.entries(ergebnis.deckung).map(([k, v]) => `${k}: ${f(v)}`).join(' · '));
console.log('Tempo  ', JSON.stringify(ergebnis.tempo), 'Bau', JSON.stringify(ergebnis.bau));
console.log('Fehler ', JSON.stringify(ergebnis.fehler));
