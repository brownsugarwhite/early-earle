// Plan vom 12.11., Schritt 1: Bild vorher und nachher im Fenster `kurven.html` (links wie heute, rechts `&anzeige=glatt`), je
// gesicherter Form ein JPG. Aufruf aus apps/editor:
//   node scripts/pruefen/anzeige-vorher-nachher.mjs <zielordner> ["strange bird,teat firefish,test_kaputt"]
// Umgebung: URL (Standard http://localhost:5197), BREITE, HOEHE (Fenster je Seite, Standard 1500 × 940), DPR (1.6)
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const [ziel, liste = 'strange bird,teat firefish,test_kaputt'] = process.argv.slice(2);
if (!ziel) throw new Error('Zielordner fehlt');
const basis = process.env.URL ?? 'http://localhost:5197';
const breite = Number(process.env.BREITE ?? 1500);
const hoehe = Number(process.env.HOEHE ?? 940);
const dpr = Number(process.env.DPR ?? 1.6);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function bild(name, frage) {
  const seite = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: dpr });
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(String(e)));
  await seite.goto(`${basis}/kurven.html?gewichte=geometrie${frage}`);
  await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
  const meldung = await seite.evaluate((n) => window.__kurven.ablage.laden(n), name);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
  // die glatte Anzeige bekommt ihre zweite Stufe erst in der Ruhe
  await seite.waitForFunction(() => !window.__kurven.glatt() || !window.__kurven.glatt().wirdFeiner, null, { timeout: 20000 });
  await seite.waitForTimeout(400);
  const stand = await seite.evaluate(() => ({ glatt: window.__kurven.glatt(), punkte: window.__kurven.zeiten().punkte }));
  const daten = (await seite.screenshot({ type: 'jpeg', quality: 92 })).toString('base64');
  await seite.close();
  if (fehler.length) console.log(`  Fehler der Seite (${name}${frage}): ${fehler.join(' | ')}`);
  return { daten, stand, meldung };
}

for (const name of liste.split(',')) {
  const vorher = await bild(name, '');
  const nachher = await bild(name, '&anzeige=glatt');
  const g = nachher.stand.glatt;
  const unter = g ? `${g.rechenpunkte.toLocaleString('de-DE')} Rechenpunkte, ${g.dreiecke.toLocaleString('de-DE')} Dreiecke gezeigt (${g.stufen} Stufen)` : '';
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#efe9dd;font:15px/1.3 -apple-system,'Helvetica Neue',sans-serif;color:#1f1a17}
    .reihe{display:flex;gap:6px;padding:6px}
    figure{margin:0;flex:1}
    figcaption{padding:4px 2px 6px;font-weight:600}
    figcaption small{font-weight:400;opacity:.7;margin-left:8px}
    img{display:block;width:100%;border:1px solid rgba(31,26,23,.3)}
  </style><div class="reihe">
    <figure><figcaption>„${name}“ wie heute<small>${vorher.stand.punkte.toLocaleString('de-DE')} Punkte gerechnet und gezeigt</small></figcaption><img src="data:image/jpeg;base64,${vorher.daten}"></figure>
    <figure><figcaption>mit glatter Anzeige<small>${unter}</small></figcaption><img src="data:image/jpeg;base64,${nachher.daten}"></figure>
  </div>`;
  const blatt = await browser.newPage({ viewport: { width: Math.round(2 * breite * dpr) + 18, height: 400 }, deviceScaleFactor: 1 });
  await blatt.setContent(html);
  await blatt.waitForTimeout(300);
  const pfad = resolve(ziel, `anzeige-fenster-${name.replace(/\s+/g, '-')}-2026-11-12.jpg`);
  await blatt.screenshot({ path: pfad, type: 'jpeg', quality: 88, fullPage: true });
  await blatt.close();
  console.log(`${pfad}\n  ${unter}`);
}
await browser.close();
