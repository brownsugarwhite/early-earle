// Probe des Werkzeugs (Stufe 1) mit echten Maus- und Tastenereignissen gegen den laufenden Dev-Server (Port 5213): node scripts/ozzy-figur/werkzeug-probe.mjs
// Arbeitet mit leerer Schlüsseldatei (docs/look/ozzy-figur/schluessel.json); Florians Schlüssel werden vorher gelesen und am Ende zurückgeschrieben.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
const SEITE = 'http://localhost:5213/ozzy-figur.html?szene=kopf360&t=';
const leeren = () => p.evaluate(() => fetch('/__ozzy-figur/schluessel', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"version":1,"kopf":[]}\n' }).then((r) => r.status));
const oeffnen = async (theta) => { await p.goto(SEITE + theta / 360); await p.waitForFunction(() => window.__ozzyWerkzeug && window.__ozzyFigur, null, { timeout: 60000 }); await p.waitForTimeout(700); };
const ort = async (teil, j, wo = 'p') => { const r = await p.evaluate(([t, j, w]) => { const q = window.__ozzyWerkzeug.ankerImBild(t, j, w); const k = document.getElementById('oben').getBoundingClientRect(); return q && [q[0] + k.left, q[1] + k.top]; }, [teil, j, wo]); return r; };
const ziehen = async (von, nach, mod) => { if (mod) await p.keyboard.down(mod); await p.mouse.move(von[0], von[1]); await p.mouse.down(); for (let i = 1; i <= 6; i++) await p.mouse.move(von[0] + ((nach[0] - von[0]) * i) / 6, von[1] + ((nach[1] - von[1]) * i) / 6); await p.mouse.up(); if (mod) await p.keyboard.up(mod); await p.waitForTimeout(250); };
const keys = () => p.evaluate(() => window.__ozzyWerkzeug.schluessel().map((k) => `${k.teil}@${k.w}`).join(' ') || '–');
const anker = (teil, j, th) => p.evaluate(([t, j, th]) => { const a = window.__ozzyFigur.lageTeile({ psi: 90, theta: th, nurKopf: true }).find((x) => x.name === t).form[j]; return { p: a.p.map((v) => +v.toFixed(2)), i: a.i.map((v) => +v.toFixed(2)), o: a.o.map((v) => +v.toFixed(2)) }; }, [teil, j, th]);
const glatt = (a) => { const e = [a.p[0] - a.i[0], a.p[1] - a.i[1]], u = [a.o[0] - a.p[0], a.o[1] - a.p[1]]; const le = Math.hypot(...e), lu = Math.hypot(...u); return le < 0.01 || lu < 0.01 ? 'ohne Griff' : ((Math.acos(Math.min(1, (e[0] * u[0] + e[1] * u[1]) / (le * lu))) * 180) / Math.PI).toFixed(1) + '°'; };
const zeile = (t) => console.log(t);
await oeffnen(150);
const gesichert = await p.evaluate(() => fetch('/__ozzy-figur/schluessel', { cache: 'no-store' }).then((r) => r.text()));
zeile(`leeren: ${await leeren()}`);
await oeffnen(150);
await p.keyboard.press('b');
await p.waitForTimeout(200);
// 1 Anker ziehen
const t0 = await anker('ohrB', 2, 150);
let a = await ort('ohrB', 2);
await ziehen(a, [a[0] + 15, a[1] - 10]);
const t1 = await anker('ohrB', 2, 150);
zeile(`1 Anker: Schlüssel ${await keys()}; Spitze ${t0.p} → ${t1.p}`);
// 2 Griff eines glatten Ankers: Gegengriff dreht mit
zeile(`  Knick vorher ${glatt(t1)}`);
a = await ort('ohrB', 2, 'o');
await ziehen(a, [a[0] + 4, a[1] + 14]);
const t2 = await anker('ohrB', 2, 150);
zeile(`2 Griff glatt: Knick ${glatt(t2)} (o ${t1.o} → ${t2.o}, i ${t1.i} → ${t2.i})`);
// 3 mit ⌥: Ecke
a = await ort('ohrB', 2, 'i');
await ziehen(a, [a[0] - 12, a[1] + 12], 'Alt');
const t3 = await anker('ohrB', 2, 150);
zeile(`3 Griff mit ⌥: Knick ${glatt(t3)} (o bleibt ${JSON.stringify(t2.o) === JSON.stringify(t3.o)})`);
// 4 Ankerpunkt umwandeln: Klick → ohne Griffe, Klick → glatt
await p.keyboard.press('Shift+C');
a = await ort('ohrB', 2);
await p.mouse.click(a[0], a[1]);
await p.waitForTimeout(250);
const t4 = await anker('ohrB', 2, 150);
await p.mouse.click(a[0], a[1]);
await p.waitForTimeout(250);
const t5 = await anker('ohrB', 2, 150);
zeile(`4 Ankerpunkt: Klick ${glatt(t4)}, zweiter Klick ${glatt(t5)}`);
// 5 Auswahl: Nase als Ganzes verschieben
await p.keyboard.press('v');
const n0 = await anker('nase', 0, 150);
a = await ort('nase', 0);
const n3 = await ort('nase', 3);
const mitte = [(a[0] + n3[0]) / 2, (a[1] + n3[1]) / 2];
await ziehen(mitte, [mitte[0] - 20, mitte[1] + 6]);
const n1 = await anker('nase', 0, 150);
zeile(`5 Auswahl (Nase): Anker 0 ${n0.p} → ${n1.p}; Schlüssel ${await keys()}`);
// 6 Pfeiltasten: ein Anker der Maske A, 3 nach rechts
await p.keyboard.press('a');
a = await ort('kopfA', 3);
await p.mouse.click(a[0], a[1]);
const k0 = await anker('kopfA', 3, 150);
for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight');
await p.waitForTimeout(300);
const k1 = await anker('kopfA', 3, 150);
zeile(`6 Pfeiltasten: Maske A Anker 3 ${k0.p} → ${k1.p}`);
// 7 Rahmen um zwei Anker der Maske A
const r1 = await ort('kopfA', 1), r2 = await ort('kopfA', 2);
const x0 = Math.min(r1[0], r2[0]) - 6, y0 = Math.min(r1[1], r2[1]) - 6, x1 = Math.max(r1[0], r2[0]) + 6, y1 = Math.max(r1[1], r2[1]) + 6;
await p.keyboard.press('Escape');
await ziehen([x0, y0], [x1, y1]);
zeile(`7 Rahmen: gewählt ${await p.evaluate(() => [...window.__ozzyWerkzeug.gewaehlt].join(','))} in ${await p.evaluate(() => window.__ozzyWerkzeug.teil)}`);
// 8 Winkel mit . und ,
await p.keyboard.press('.');
await p.waitForTimeout(200);
const w1 = await p.evaluate(() => document.querySelector('output[for=winkel]').textContent);
await p.keyboard.press(',');
await p.waitForTimeout(200);
const w2 = await p.evaluate(() => document.querySelector('output[for=winkel]').textContent);
zeile(`8 Winkel: . → ${w1}, , → ${w2}`);
// 9 zweite Hälfte: bei 210° das linke Ohr (ohrA) ziehen → Schlüssel des Partners bei 150°
await oeffnen(210);
await p.keyboard.press('b');
const z0 = await anker('ohrA', 2, 210);
a = await ort('ohrA', 2);
await ziehen(a, [a[0] - 10, a[1] + 8]);
const z1 = await anker('ohrA', 2, 210);
const gespiegelt = await anker('ohrB', 2, 150);
zeile(`9 bei 210°: Schlüssel ${await keys()}; Ohr A ${z0.p} → ${z1.p}; Ohr B bei 150° ${gespiegelt.p} (gespiegelt um die Halsachse)`);
// 10 Zoom
await p.keyboard.press('Meta+Equal');
await p.waitForTimeout(150);
const zoomText = await p.evaluate(() => window.__ozzyWerkzeug['zoom'].z);
await p.click('#werkzeugGanz');
const zoomNach = await p.evaluate(() => window.__ozzyWerkzeug['zoom'].z);
zeile(`10 Zoom: ⌘= → ${zoomText}, Ganze Figur → ${zoomNach}`);
// 11 Datei
const datei = await p.evaluate(() => fetch('/__ozzy-figur/schluessel', { cache: 'no-store' }).then((r) => r.text()));
zeile(`11 Datei: ${datei.split('\n').length - 3} Schlüssel-Zeilen`);
// 12 aufräumen: leeren und prüfen, dass ohne Schlüssel alles wie vorher ist
zeile(`12 leeren: ${await leeren()}`);
await oeffnen(150);
const leer = await anker('ohrB', 2, 150);
zeile(`   ohne Schlüssel Spitze bei 150° ${leer.p} (vorher ${t0.p})`);
const zurueck = await p.evaluate((t) => fetch('/__ozzy-figur/schluessel', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: t }).then((r) => r.status), gesichert);
zeile(`Florians Schlüssel zurückgeschrieben: ${zurueck}`);
const fehler = [];
p.on('pageerror', (e) => fehler.push(e.message));
zeile(`Fehler auf der Seite: ${fehler.length ? fehler.join('; ') : 'keine'}`);
await b.close();
