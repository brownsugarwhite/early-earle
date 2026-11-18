// Proben der Etappen A, B und C (Plan docs/plans/2026-11-18-ozzy-figur.md). Startet einen eigenen Vite-Server auf PORT (Standard
// 5293, nicht Florians Fenster), öffnet ozzy-figur.html in Chrome (echte Grafikkarte) und WebKit und prüft:
//   A   alle Vorlagen im exakten Modus: höchstens 0,3 % deutlich abweichende Bildpunkte (|Δ| > 0,5, bezogen auf die schwarzen der
//       Vorlage); dazu die Kantenpixel, die nur durch andere Kantenglättung kippen
//   B1  freie Spitzen (Ohren, Schwanz, Haarspitzen) zwischen exakt und flüssig weniger als 0,5 Bildpunkte versetzt
//   B2  Drehungen: nirgends mehr Weiß ohne Schwarz darunter als an den gezeichneten Enden (+ Kantensaum)
//   C1  Raster an den Schlüsselwinkeln genau Florians Vorlagen (wie A, Drehung in Körperkoordinaten); D1: ebenso an den Haltungen
//       Sitzen und Liegen (Kopf vorn und im Profil)
//   D2  Haltungswechsel (Hinsetzen über die Hocke, Hinlegen, Umlegen) ohne Sprung: an Anfang, Ende, Hocke und Wechsel der führenden
//       Haltung klappt ein Schritt von 1/1000 des Wegs höchstens 20 Bildpunkte um (600 × 600)
//   B4  Tempo je Bild (Szene bauen, zeichnen, warten) in Chrome und WebKit
//   aus apps/editor:  node scripts/ozzy-figur/proben.mjs [ausordner]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');

const PORT = Number(process.env.PORT ?? 5293);
const AUS = process.argv[2] ?? new URL('../../../../docs/progress/ozzy-figur/', import.meta.url).pathname;
const TAG = process.env.TAG ?? '2026-11-18';
mkdirSync(AUS, { recursive: true });
const URL_SEITE = `http://localhost:${PORT}/ozzy-figur.html?modus=exakt`;
const ANSICHTEN = ['front', 'back', 'logo', 'profil', 'viertel', 'lieg1', 'lieg2', 'sitz1', 'sitz2'];
const DREHUNGEN = ['drehen', 'kopf', 'koerper', 'haltung', 'haltungP'];
const SCHLUESSEL = [['drehen', 0, 'front'], ['drehen', 0.5, 'viertel'], ['drehen', 1, 'profil'], ['kopf', 0, 'logo'], ['kopf', 1, 'profil'], ['koerper', 0, 'front'], ['koerper', 1, 'logo'], ['haltung', 0.5, 'sitz1'], ['haltung', 1, 'lieg1'], ['haltungP', 0.5, 'sitz2'], ['haltungP', 1, 'lieg2']];
const istHaltung = (sz) => sz.startsWith('haltung');
const marke = (sz, t) => (istHaltung(sz) ? `h${(t * 2).toFixed(1)}` : `${Math.round(t * 90)}`);

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: new URL('../../', import.meta.url).pathname, env: { ...process.env, EDITOR_WEB: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let serverText = '';
server.stdout.on('data', (d) => (serverText += d));
server.stderr.on('data', (d) => (serverText += d));
const ende = () => server.kill('SIGTERM');
process.on('exit', ende);
for (let i = 0; i < 100 && !/Local:|ready in/.test(serverText); i++) await new Promise((r) => setTimeout(r, 200));
if (!/Local:|ready in/.test(serverText)) throw new Error('Vite startet nicht:\n' + serverText);

const ergebnis = { zeit: new Date().toISOString(), A: {}, B1: {}, B2: {}, C1: {}, B4: {}, bestanden: {} };
const bildSpeichern = (url, datei) => writeFileSync(AUS + datei, Buffer.from(url.split(',')[1], 'base64'));

async function seiteOeffnen(motor) {
  const browser = motor === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && fehler.push(m.text()));
  await page.goto(URL_SEITE);
  await page.waitForFunction(() => window.__ozzyFigur, null, { timeout: 30000 });
  // das erste Bild der Seite selbst abwarten (es zeichnet sonst über das erste Prüfbild)
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  return { browser, page, fehler };
}

async function blatt(browser, page, sz, fl, datei) {
  const bilder = [];
  for (const t of [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]) {
    await page.evaluate(([sz, t, fl]) => window.__ozzyFigur.zeigen(sz, t, fl, 0, 600, 640), [sz, t, fl]);
    bilder.push(await page.evaluate(() => window.__ozzyFigur.bild()));
  }
  const html = `<html><body style="margin:0;background:#fff;font:14px Helvetica"><div id="r" style="display:flex;gap:6px;padding:8px">${bilder.map((u, i) => `<div><img src="${u}" width="300" height="320" style="border:1px solid #eee"><div style="color:#888;text-align:center">${istHaltung(sz) ? ((i / 6) * 2).toFixed(2) : Math.round((i / 6) * 90) + '°'}</div></div>`).join('')}</div></body></html>`;
  const p2 = await browser.newPage({ viewport: { width: 2200, height: 400 } });
  await p2.setContent(html);
  await (await p2.$('#r')).screenshot({ path: AUS + datei });
  await p2.close();
}

// ---- Chrome ----
{
  const { browser, page, fehler } = await seiteOeffnen('chrome');
  for (const a of ANSICHTEN) {
    const r = await page.evaluate((a) => window.__ozzyFigur.vergleichVorlage(a, 1000, 1000), a);
    delete r.diff;
    ergebnis.A[a] = r;
  }
  ergebnis.bestanden.A = Object.values(ergebnis.A).every((r) => r.deutlichAnteil <= 0.003);
  for (const a of ANSICHTEN) ergebnis.B1[a] = await page.evaluate((a) => window.__ozzyFigur.spitzen(a, 1000, 1000), a);
  ergebnis.bestanden.B1 = Object.values(ergebnis.B1).every((r) => r.groesster < 0.5);
  const T = Array.from({ length: 13 }, (_, i) => i / 12);
  for (const sz of DREHUNGEN) {
    const zahlen = [];
    for (const t of T) zahlen.push(await page.evaluate(([sz, t]) => window.__ozzyFigur.zaehlen(sz, t, true, 1, 800, 800), [sz, t]));
    const enden = Math.max(zahlen[0], zahlen[zahlen.length - 1], sz === 'drehen' || istHaltung(sz) ? zahlen[6] : 0);
    ergebnis.B2[sz] = { zahlen, enden, schlimmstes: Math.max(...zahlen.slice(1, -1)) };
  }
  ergebnis.bestanden.B2 = Object.values(ergebnis.B2).every((r) => r.schlimmstes <= r.enden + 40);
  for (const [sz, t, a] of SCHLUESSEL) {
    const r = await page.evaluate(([sz, t, a]) => window.__ozzyFigur.vergleichVorlage(a, 1000, 1000, { szene: sz, t }), [sz, t, a]);
    bildSpeichern(r.diff, `${TAG}-c-${sz}-${marke(sz, t)}-unterschied.png`);
    delete r.diff;
    ergebnis.C1[`${sz}@${marke(sz, t)}=${a}`] = r;
  }
  ergebnis.bestanden.C1 = Object.values(ergebnis.C1).every((r) => r.deutlichAnteil <= 0.003);
  // D2: Haltungswechsel ohne Sprung. An Anfang, Ende, Wegpunkten (Hocke) und dort, wo die führende Haltung wechselt, ein Schritt von
  // 1/1000 des Wegs: Was stetig läuft, klappt dabei kaum einen Bildpunkt um; ein Sprung (Malreihenfolge, Teil taucht auf) bliebe groß
  const STELLEN = { hinsetzen: [0, 0.125, 0.25, 0.375, 0.5, 0.75, 1], hinlegen: [0, 0.5, 1], umlegen: [0, 0.5, 1] };
  ergebnis.D2 = {};
  for (const [sz, ts] of Object.entries(STELLEN)) {
    const zahlen = [];
    for (const t of ts) zahlen.push(await page.evaluate(([sz, a, b]) => window.__ozzyFigur.sprung(sz, a, b, 600, 600), [sz, Math.max(0, t - 0.0005), Math.min(1, t + 0.0005)]));
    ergebnis.D2[sz] = { stellen: ts, zahlen };
  }
  ergebnis.bestanden.D2 = Object.values(ergebnis.D2).every((r) => Math.max(...r.zahlen) <= 20);
  ergebnis.B4.chrome = { logo: await page.evaluate(() => window.__ozzyFigur.tempo('logo', 0, true, 120, 1000, 1000)), drehen: await page.evaluate(() => window.__ozzyFigur.tempo('drehen', 0, true, 120, 1000, 1000)) };
  for (const sz of DREHUNGEN) for (const fl of [false, true]) await blatt(browser, page, sz, fl, `${TAG}-c-${sz}-${fl ? 'fluessig' : 'exakt'}.png`);
  ergebnis.fehlerChrome = fehler;
  await browser.close();
}
// ---- WebKit: Stichproben und Tempo ----
{
  const { browser, page, fehler } = await seiteOeffnen('webkit');
  for (const a of ['logo', 'viertel']) {
    const r = await page.evaluate((a) => window.__ozzyFigur.vergleichVorlage(a, 1000, 1000), a);
    delete r.diff;
    ergebnis.A[`${a}WebKit`] = r;
  }
  ergebnis.B4.webkit = { logo: await page.evaluate(() => window.__ozzyFigur.tempo('logo', 0, true, 120, 1000, 1000)), drehen: await page.evaluate(() => window.__ozzyFigur.tempo('drehen', 0, true, 120, 1000, 1000)) };
  ergebnis.fehlerWebKit = fehler;
  await browser.close();
}
ende();
writeFileSync(`${AUS}${TAG}-proben.json`, JSON.stringify(ergebnis, null, 1));
const pz = (v) => `deutlich ${(v.deutlichAnteil * 100).toFixed(3)} % (Kanten ${(v.anteil * 100).toFixed(2)} %)`;
console.log('A    ', Object.entries(ergebnis.A).map(([k, v]) => `${k} ${pz(v)}`).join(' · '), ergebnis.bestanden.A ? '✓' : '✗');
console.log('B1   ', Object.entries(ergebnis.B1).map(([k, v]) => `${k} ${v.spitzen.length}/${v.groesster.toFixed(2)} px`).join(' · '), ergebnis.bestanden.B1 ? '✓' : '✗');
console.log('B2   ', Object.entries(ergebnis.B2).map(([k, v]) => `${k} Enden ${v.enden}, schlimmstes ${v.schlimmstes} [${v.zahlen.join(' ')}]`).join(' · '), ergebnis.bestanden.B2 ? '✓' : '✗');
console.log('C1   ', Object.entries(ergebnis.C1).map(([k, v]) => `${k} ${pz(v)}`).join(' · '), ergebnis.bestanden.C1 ? '✓' : '✗');
console.log('D2   ', Object.entries(ergebnis.D2).map(([k, v]) => `${k} [${v.zahlen.join(' ')}]`).join(' · '), ergebnis.bestanden.D2 ? '✓' : '✗');
console.log('B4   ', JSON.stringify(Object.fromEntries(Object.entries(ergebnis.B4).map(([m, x]) => [m, Object.fromEntries(Object.entries(x).map(([s, v]) => [s, `${v.median.toFixed(1)}/${v.p95.toFixed(1)} ms`]))]))));
console.log('Fehler', JSON.stringify({ chrome: ergebnis.fehlerChrome, webkit: ergebnis.fehlerWebKit }));
process.exit(0);
