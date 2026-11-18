// Proben der Etappen A und B (Plan docs/plans/2026-11-18-ozzy-figur.md, Abschnitt 5). Startet einen eigenen Vite-Server auf
// PORT (Standard 5293, nicht Florians Fenster), öffnet ozzy-figur.html in Chrome (echte Grafikkarte) und WebKit und prüft:
//   A   alle sechs Vorlagen im exakten Modus: höchstens 0,3 % deutlich abweichende Bildpunkte (|Δ| > 0,5, bezogen auf die schwarzen
//       der Vorlage); dazu die Zahl der Kantenpixel, die nur durch andere Kantenglättung kippen
//   B1  freie Spitzen (Ohren, Schwanz, Haarspitzen) zwischen exakt und flüssig weniger als 0,5 Bildpunkte versetzt
//   B2  Drehblätter: nirgends mehr Weiß ohne Schwarz darunter als an den gezeichneten Enden (+ Kantensaum)
//   B3  Ohrspalt läuft nach innen spitz aus (ein Ende < 35 % der größten Breite) und deckt sich zur Hälfte mit dem sichtbaren Teil
//       von Florians Keil (Kriterium nach genauem Blick auf seinen Keil angepasst: er ist zum Hintergrund hin offen)
//   B4  Tempo je Bild (Szene bauen, zeichnen, warten) in Chrome und WebKit
//   aus apps/editor:  node scripts/ozzy-figur/proben.mjs [ausordner]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');

const PORT = Number(process.env.PORT ?? 5293);
const AUS = process.argv[2] ?? new URL('../../../../docs/progress/ozzy-figur/', import.meta.url).pathname;
mkdirSync(AUS, { recursive: true });
const URL_SEITE = `http://localhost:${PORT}/ozzy-figur.html?modus=exakt`;

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: new URL('../../', import.meta.url).pathname, env: { ...process.env, EDITOR_WEB: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let serverText = '';
server.stdout.on('data', (d) => (serverText += d));
server.stderr.on('data', (d) => (serverText += d));
const ende = () => server.kill('SIGTERM');
process.on('exit', ende);
for (let i = 0; i < 100 && !/Local:|ready in/.test(serverText); i++) await new Promise((r) => setTimeout(r, 200));
if (!/Local:|ready in/.test(serverText)) throw new Error('Vite startet nicht:\n' + serverText);

const ergebnis = { zeit: new Date().toISOString(), A: {}, B1: {}, B2: {}, B3: null, B4: {}, bestanden: {} };
const bildSpeichern = (url, datei) => writeFileSync(AUS + datei, Buffer.from(url.split(',')[1], 'base64'));

async function seiteOeffnen(motor) {
  const browser = motor === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await page.goto(URL_SEITE);
  await page.waitForFunction(() => window.__ozzyFigur, null, { timeout: 30000 });
  return { browser, page, fehler };
}

// ---- nur Rasterprobe für den Ohrspalt: SPALT=1 ----
if (process.env.SPALT === '1') {
  const { browser, page } = await seiteOeffnen('chrome');
  const zeilen = [];
  for (const breite of [2.8, 4, 5, 6, 7])
    for (const auslauf of [10, 16, 22, 30, 40]) {
      const r = await page.evaluate(([breite, auslauf]) => window.__ozzyFigur.spalt(1000, 1000, { verdecken: 16, spaltBreite: breite, spaltAuslauf: auslauf, art: 'winkel' }), [breite, auslauf]);
      zeilen.push({ breite, auslauf, deckung: Math.round(r.deckung * 100), bildpunkte: r.bildpunkte, keil: r.keilBildpunkte, enden: [r.breiten[0], r.breiten[r.breiten.length - 1]] });
    }
  zeilen.sort((a, b) => b.deckung - a.deckung);
  console.log(zeilen.slice(0, 8));
  await browser.close();
  ende();
  process.exit(0);
}
// ---- Chrome: A, B1, B2, B3, B4 und Bilder ----
{
  const { browser, page, fehler } = await seiteOeffnen('chrome');
  for (const a of ['front', 'back', 'logo', 'profil', 'lieg1', 'lieg2']) {
    const r = await page.evaluate((a) => window.__ozzyFigur.vergleichVorlage(a, 1000, 1000), a);
    bildSpeichern(r.diff, `2026-11-18-probe-a-${a}-diff.png`);
    delete r.diff;
    ergebnis.A[a] = r;
  }
  ergebnis.bestanden.A = Object.values(ergebnis.A).every((r) => r.deutlichAnteil <= 0.003);
  for (const a of ['logo', 'profil', 'front', 'back', 'lieg1', 'lieg2']) ergebnis.B1[a] = await page.evaluate((a) => window.__ozzyFigur.spitzen(a, 1000, 1000), a);
  ergebnis.bestanden.B1 = Object.values(ergebnis.B1).every((r) => r.groesster < 0.5);
  const T = Array.from({ length: 13 }, (_, i) => i / 12);
  for (const sz of ['kopf', 'koerper']) {
    const zahlen = [];
    for (const t of T) zahlen.push(await page.evaluate(([sz, t]) => window.__ozzyFigur.zaehlen(sz, t, true, 1, 800, 800), [sz, t]));
    const enden = Math.max(zahlen[0], zahlen[zahlen.length - 1]);
    ergebnis.B2[sz] = { zahlen, enden, schlimmstes: Math.max(...zahlen.slice(1, -1)) };
  }
  ergebnis.bestanden.B2 = Object.values(ergebnis.B2).every((r) => r.schlimmstes <= r.enden + 40);
  ergebnis.B3 = await page.evaluate(() => window.__ozzyFigur.spalt(1000, 1000));
  // Ohrspalt vergrößert: Florians Profil exakt neben dem automatischen Spalt (Logo-Rahmen, Ausschnitt zwischen den Ohren)
  for (const [sz, t, fl, datei] of [['profil', 0, false, 'spalt-vorlage'], ['kopf', 1, true, 'spalt-auto']]) {
    const a = await page.evaluate(([sz, t, fl]) => window.__ozzyFigur.zeigen(sz, t, fl, 0, 1000, 1000), [sz, t, fl]);
    const dy = sz === 'profil' ? 9.74 : 0;
    bildSpeichern(await page.evaluate(([a, dy]) => window.__ozzyFigur.ausschnitt(a, 150, -15 + dy, 340, 115 + dy, 3), [a, dy]), `2026-11-18-probe-b-${datei}.png`);
  }
  {
    const b = ergebnis.B3.breiten;
    const m = Math.max(...b);
    ergebnis.bestanden.B3 = Math.min(b[0], b[b.length - 1]) < 0.35 * m && ergebnis.B3.deckung >= 0.5;
  }
  ergebnis.B4.chrome = { logo: await page.evaluate(() => window.__ozzyFigur.tempo('logo', 0, true, 120, 1000, 1000)), kopf: await page.evaluate(() => window.__ozzyFigur.tempo('kopf', 0, true, 120, 1000, 1000)) };
  // Bilder für Florian: Drehblätter exakt und flüssig
  for (const sz of ['kopf', 'koerper'])
    for (const fl of [false, true]) {
      const bilder = [];
      for (const t of [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]) {
        await page.evaluate(([sz, t, fl]) => window.__ozzyFigur.zeigen(sz, t, fl, 0, 600, 640), [sz, t, fl]);
        bilder.push(await page.evaluate(() => window.__ozzyFigur.bild()));
      }
      const html = `<html><body style="margin:0;background:#fff;font:14px Helvetica"><div id="r" style="display:flex;gap:6px;padding:8px">${bilder.map((u, i) => `<div><img src="${u}" width="300" height="320" style="border:1px solid #eee"><div style="color:#888;text-align:center">${Math.round((i / 6) * 90)}°</div></div>`).join('')}</div></body></html>`;
      const p2 = await browser.newPage({ viewport: { width: 2200, height: 400 } });
      await p2.setContent(html);
      await (await p2.$('#r')).screenshot({ path: `${AUS}2026-11-18-probe-b-${sz}-${fl ? 'fluessig' : 'exakt'}.png` });
      await p2.close();
    }
  ergebnis.fehlerChrome = fehler;
  await browser.close();
}
// ---- WebKit: A (Stichprobe) und Tempo ----
{
  const { browser, page, fehler } = await seiteOeffnen('webkit');
  const r = await page.evaluate(() => window.__ozzyFigur.vergleichVorlage('logo', 1000, 1000));
  delete r.diff;
  ergebnis.A.logoWebKit = r;
  const r2 = await page.evaluate(() => window.__ozzyFigur.vergleichVorlage('front', 1000, 1000));
  delete r2.diff;
  ergebnis.A.frontWebKit = r2;
  ergebnis.B4.webkit = { logo: await page.evaluate(() => window.__ozzyFigur.tempo('logo', 0, true, 120, 1000, 1000)), kopf: await page.evaluate(() => window.__ozzyFigur.tempo('kopf', 0, true, 120, 1000, 1000)) };
  ergebnis.fehlerWebKit = fehler;
  await browser.close();
}
ende();
writeFileSync(AUS + '2026-11-18-proben-ab.json', JSON.stringify(ergebnis, null, 1));
const kurz = (x) => JSON.stringify(x);
console.log('A    ', Object.entries(ergebnis.A).map(([k, v]) => `${k} deutlich ${(v.deutlichAnteil * 100).toFixed(3)} % (Kanten ${(v.anteil * 100).toFixed(2)} %)`).join(' · '), ergebnis.bestanden.A ? '✓' : '✗');
console.log('B1   ', Object.entries(ergebnis.B1).map(([k, v]) => `${k} ${v.spitzen.length} Spitzen, größter Versatz ${v.groesster.toFixed(2)} px (${v.ausgelassen} in Kehlen)`).join(' · '), ergebnis.bestanden.B1 ? '✓' : '✗');
console.log('B2   ', Object.entries(ergebnis.B2).map(([k, v]) => `${k} Enden ${v.enden}, schlimmstes ${v.schlimmstes} [${v.zahlen.join(' ')}]`).join(' · '), ergebnis.bestanden.B2 ? '✓' : '✗');
console.log('B3   ', `Breiten ${kurz(ergebnis.B3.breiten)}, Länge ${ergebnis.B3.laenge.toFixed(1)}, Deckung mit Florians Keil ${(ergebnis.B3.deckung * 100).toFixed(0)} %`, ergebnis.bestanden.B3 ? '✓' : '✗');
console.log('B4   ', kurz(ergebnis.B4));
console.log('Fehler', kurz({ chrome: ergebnis.fehlerChrome, webkit: ergebnis.fehlerWebKit }));
process.exit(0);
