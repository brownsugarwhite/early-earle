// Probe der Zeitleiste im Werkzeug (alle Schlüssel mit Herkunft, Klick, J/K, Zeiger, Ziehen) mit echten Maus- und Tastenereignissen gegen den
// laufenden Dev-Server (Port 5213): node scripts/ozzy-figur/zeitleiste-probe.mjs  [SEITE=ozzy-figur.html] [BILD=<ordner>]
// Schreibt nie in Florians Schlüsseldatei: Die Seite bekommt seine Schlüssel (nur gelesen), Speichern landet in einer Attrappe (page.route).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const seine = readFileSync(new URL('../../../../docs/look/ozzy-figur/schluessel.json', import.meta.url), 'utf8');
const SEITE = `http://localhost:5213/${process.env.SEITE ?? 'ozzy-figur.html'}`;
const BILD = process.env.BILD ?? null;
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
let gespeichert = null;
await p.route('**/__ozzy-figur/schluessel', (r) => {
  if (r.request().method() === 'PUT') {
    gespeichert = r.request().postData();
    return r.fulfill({ status: 200, body: 'ok' });
  }
  return r.fulfill({ status: 200, contentType: 'application/json', body: gespeichert ?? seine });
});
const fehler = [];
p.on('pageerror', (e) => fehler.push(e.message));
const oeffnen = async (szene, t) => {
  await p.goto(`${SEITE}?szene=${szene}&t=${t}`);
  await p.waitForFunction(() => window.__ozzyWerkzeug && window.__ozzyFigur, null, { timeout: 60000 });
  await p.waitForTimeout(800);
};
const W = (f, a) => p.evaluate(f, a);
const status = () => W(() => window.__ozzyWerkzeug.statusText());
const winkel = () => W(() => document.querySelector('output[for=winkel]').textContent);
const ort = (teil, w) => W(([t, x]) => window.__ozzyWerkzeug.zeitleisteOrt(t, x), [teil, w]);
const leiste = () => W(() => document.getElementById('zeitleiste').getBoundingClientRect().toJSON());
const zeile = (t) => console.log(t);

await oeffnen('kopf360', 150 / 360);
await p.keyboard.press('b');
await p.waitForTimeout(300);
const u = await W(() => window.__ozzyWerkzeug.uebersicht().map((e) => ({ ...e })));
const arten = {};
for (const e of u) arten[e.art] = (arten[e.art] ?? 0) + 1;
const r0 = await leiste();
zeile(`1 Übersicht: ${u.length} Schlüssel ${JSON.stringify(arten)}; Zeitleiste oben ${r0.top}, hoch ${r0.height}`);
zeile(`  Bart A: ${u.filter((e) => e.teil === 'bartA').map((e) => `${e.w}${e.art[0]}`).join(' ')}`);
// 2 Klick auf meinen Schlüssel (Bart A bei 152°)
let q = await ort('bartA', 152);
await p.mouse.click(q[0], q[1]);
await p.waitForTimeout(300);
zeile(`2 Klick auf Bart A 152°: Winkel ${await winkel()}, Teil ${await W(() => window.__ozzyWerkzeug.teil)}; ${await status()}`);
// 3 J und K (Bart A)
await p.mouse.move(700, 300);
await p.keyboard.press('k');
await p.waitForTimeout(200);
const k1 = await winkel();
await p.keyboard.press('j');
await p.waitForTimeout(200);
const j1 = await winkel();
await p.keyboard.press('j');
await p.waitForTimeout(200);
const j2 = await winkel();
zeile(`3 K → ${k1}, J → ${j1}, J → ${j2}; ${await status()}`);
// 4 Zeiger über einem Schlüssel: Maske B bei 112° (gebaut)
q = await ort('kopfB', 112);
await p.mouse.move(q[0], q[1]);
await p.waitForTimeout(250);
zeile(`4 Zeiger über Maske B 112°: ${await status()}`);
if (BILD) await p.screenshot({ path: `${BILD}/zeitleiste-ganz.png` });
// 5 ein gespiegelter: Maske A bei 248° (aus Maske B bei 112°)
q = await ort('kopfA', 248);
await p.mouse.move(q[0], q[1]);
await p.waitForTimeout(250);
zeile(`5 Zeiger über Maske A 248°: ${await status()}`);
// 6 im Lineal ziehen: von 100° nach 125,3°
const a = await ort('nase', 100);
const c = await ort('nase', 125.3);
const yl = r0.top + 12;
await p.mouse.move(a[0], yl);
await p.mouse.down();
for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + ((c[0] - a[0]) * i) / 8, yl);
await p.mouse.up();
await p.waitForTimeout(250);
zeile(`6 Ziehen im Lineal 100° → 125,3°: Winkel ${await winkel()}; ${await status()}`);
// 7 Ziehen in einer Zeile rastet an den Schlüsseln ein: Bart A, bis 1° vor 130°
const d = await ort('bartA', 129.2);
await p.mouse.move(a[0], d[1]);
await p.mouse.down();
for (let i = 1; i <= 8; i++) await p.mouse.move(a[0] + ((d[0] - a[0]) * i) / 8, d[1]);
await p.mouse.up();
await p.waitForTimeout(250);
zeile(`7 Ziehen in der Zeile Bart A bis 129,2°: Winkel ${await winkel()} (rastet bei 130° ein)`);
// 8 bei 150° einen Anker von Bart A ziehen (Speichern in der Attrappe): Zeitleiste zeigt den neuen Schlüssel, meiner bei 152° fällt weg
q = await ort('bartA', 150);
await p.mouse.click(q[0], r0.top + 12);
await p.waitForTimeout(250);
zeile(`8 Klick ins Lineal bei 150°, vorher: ${await status()}`);
const ak = await W(() => {
  const k = document.getElementById('oben').getBoundingClientRect();
  const r = window.__ozzyWerkzeug.ankerImBild('bartA', 4);
  return r && [r[0] + k.left, r[1] + k.top];
});
await p.mouse.move(ak[0], ak[1]);
await p.mouse.down();
for (let i = 1; i <= 6; i++) await p.mouse.move(ak[0] + i * 2, ak[1] + i * 1.5);
await p.mouse.up();
await p.waitForTimeout(700);
const u2 = await W(() => window.__ozzyWerkzeug.uebersicht().map((e) => ({ ...e })));
const bartA = u2.filter((e) => e.teil === 'bartA' && e.w > 140 && e.w < 160).map((e) => `${e.w}${e.art[0]}`).join(' ');
const spiegel = u2.find((e) => e.teil === 'bartB' && e.w === 210);
zeile(`  nachher: Bart A 140°–160°: ${bartA}; Bart B 210°: ${spiegel ? `${spiegel.art} von ${JSON.stringify(spiegel.von)}` : '–'}; ${await status()}`);
zeile(`  gespeichert (Attrappe): ${gespeichert ? JSON.parse(gespeichert).kopf.length : 0} Schlüssel, Florians Datei unberührt: ${readFileSync(new URL('../../../../docs/look/ozzy-figur/schluessel.json', import.meta.url), 'utf8') === seine}`);
await p.keyboard.press('Meta+z');
await p.waitForTimeout(600);
zeile(`  ⌘Z: Bart A 140°–160°: ${(await W(() => window.__ozzyWerkzeug.uebersicht().map((e) => ({ ...e })))).filter((e) => e.teil === 'bartA' && e.w > 140 && e.w < 160).map((e) => `${e.w}${e.art[0]}`).join(' ')}`);
// 8b Klick auf den Namen einer Zeile wählt nur das Teil
const vorherW = await winkel();
q = await ort('ohrB', 0);
await p.mouse.click(r0.left + 20, q[1]);
await p.waitForTimeout(250);
zeile(`8b Klick auf „Ohr B“: Teil ${await W(() => window.__ozzyWerkzeug.teil)}, Winkel ${vorherW} → ${await winkel()}`);
// 9 „Kopf dreht“ (0°–90°): Klick auf Florians Schlüssel Bart B bei 75,5°
gespeichert = null;
await oeffnen('kopf', 0.2);
await p.keyboard.press('b');
await p.waitForTimeout(300);
q = await ort('bartB', 75.5);
await p.mouse.click(q[0], q[1]);
await p.waitForTimeout(300);
zeile(`9 Kopf dreht, Klick auf Bart B 75,5°: ${await status()}`);
if (BILD) await p.screenshot({ path: `${BILD}/zeitleiste-90.png` });
// 10 klein (iPhone hochkant): knappe Zeitleiste
await p.setViewportSize({ width: 393, height: 852 });
await p.waitForTimeout(500);
const r1 = await leiste();
zeile(`10 iPhone hochkant: Zeitleiste hoch ${r1.height}, Bühne hoch ${await W(() => document.getElementById('buehne').clientHeight)}`);
if (BILD) await p.screenshot({ path: `${BILD}/zeitleiste-iphone.png` });
zeile(`Fehler auf der Seite: ${fehler.length ? fehler.join('; ') : 'keine'}`);
await b.close();
