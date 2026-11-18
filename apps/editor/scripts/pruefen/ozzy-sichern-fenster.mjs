// Ozzy, S11 im Plan „wie es weitergeht“ (16.11.2026): Sichern, an „strange bird“ (NAME), in zwei Probedateien (am Ende gelöscht).
// Kriterien:
//   1  Sichern unter einem neuen Namen (Menü, Feld, ↩), zweimal: Die Dateien liegen in der Ablage, die Form heißt wie zuletzt gesichert.
//   2  Ein fremder Name, den es schon gibt: Der erste Druck fragt (Knopf „Überschreiben“, Datei unverändert), der zweite überschreibt.
//   3  ⌘S nach einem Zug (ein Punkt der Seite 30 px nach oben): sichert unter dem Namen der Form, ohne Frage.
//   4  Neu laden: Linien, Punkte, Griffe und Haut genau wie vor ⌘S.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-sichern-fenster.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ablage = fileURLToPath(new URL('../../../../wesen/', import.meta.url));
const PA = 'ozzy-probe-a';
const PB = 'ozzy-probe-b';
const datei = (n) => `${ablage}${n}.eewesen`;
const zeit = (n) => (fs.existsSync(datei(n)) ? fs.statSync(datei(n)).mtimeMs : null);
const aufraeumen = () => {
  for (const n of [PA, PB]) if (fs.existsSync(datei(n))) fs.unlinkSync(datei(n));
};
aufraeumen();
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
try {
  const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const fehler = [];
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
  const ruhig = async () => {
    await s.waitForTimeout(250);
    await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
    await s.waitForTimeout(150);
  };
  const gesichert = async (n) => {
    try {
      await s.waitForFunction((x) => String(window.__ozzy.werk().meldung).startsWith(`gesichert: „${x}“`), n, { timeout: 30000 });
    } catch (e) {
      console.log(`nicht gesichert: Meldung „${(await O('werk')).meldung}“`);
      throw e;
    }
  };
  /** Menü auf, Feld „Sichern“ auf (es belegt sich dann mit dem Namen der Form vor), Name hinein */
  const feld = async (n) => {
    // das Menü schließt sich als Tropfen (einen Augenblick): erst ganz zu, dann auf
    await s.waitForFunction(() => document.getElementById('marke').getAttribute('aria-expanded') === 'true' || document.getElementById('regler').hidden);
    if ((await s.getAttribute('#marke', 'aria-expanded')) !== 'true') await s.click('#marke');
    if (!(await s.locator('#sichern').evaluate((d) => d.open))) await s.click('#sichern > summary');
    await s.waitForTimeout(250);
    await s.fill('#sichern-name', n);
  };
  await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
  await s.waitForFunction(() => !!window.__ozzy);
  await ruhig();
  // 1 zweimal unter einem neuen Namen
  await feld(PA);
  await s.press('#sichern-name', 'Enter');
  await gesichert(PA);
  await feld(PB);
  await s.press('#sichern-name', 'Enter');
  await gesichert(PB);
  const w1 = await O('werk');
  ok('1 unter neuen Namen sichern', zeit(PA) !== null && zeit(PB) !== null && w1.name === PB, `Dateien ${zeit(PA) !== null ? 'a' : '–'} ${zeit(PB) !== null ? 'b' : '–'}, Name der Form „${w1.name}“, Meldung „${w1.meldung}“`);
  // 2 ein fremder Name, den es schon gibt
  const za0 = zeit(PA);
  await feld(PA);
  await s.press('#sichern-name', 'Enter');
  await s.waitForTimeout(600);
  const knopf1 = await s.textContent('#sichern-knopf');
  const frage = (await O('werk')).meldung;
  const za1 = zeit(PA);
  await s.press('#sichern-name', 'Enter');
  await gesichert(PA);
  const za2 = zeit(PA);
  ok(
    '2 fremder Name: erst die Frage, dann überschrieben',
    knopf1 === 'Überschreiben' && za1 === za0 && za2 !== null && za2 > za0 && (await O('werk')).name === PA,
    `Knopf „${knopf1}“, Meldung „${frage}“; Datei beim ersten Druck ${za1 === za0 ? 'unverändert' : 'GEÄNDERT'}, beim zweiten ${za2 > za0 ? 'neu' : 'unverändert'}`,
  );
  // 3 einen Punkt der Seite ziehen, dann ⌘S
  await s.keyboard.press('1');
  await s.waitForTimeout(1500);
  await ruhig();
  const linien0 = await O('werkLinienDaten');
  const A = { id: 2, i: 1 };
  const c = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
  await s.mouse.move(c.x, c.y);
  await s.waitForTimeout(300);
  await s.mouse.down();
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(c.x, c.y - 3 * k);
    await s.waitForTimeout(30);
  }
  await s.mouse.up();
  await ruhig();
  await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt, null, { timeout: 60000 });
  const linien1 = await O('werkLinienDaten');
  const p0 = linien0.find((l) => l.id === A.id).punkte[A.i];
  const p1 = linien1.find((l) => l.id === A.id).punkte[A.i];
  const vorher = { linien: linien1, haut: (await O('pose', true)).haut };
  const za3 = zeit(PA);
  const stand = await O('standPruefen');
  await s.mouse.move(1300, 820);
  await s.keyboard.press('Meta+s');
  // gesichert oder abgelehnt (die Prüfung der Ablage lehnt einen Stand ab, in dem ein Punkt der Haut keinen Spiegelpartner hat)
  await s.waitForFunction((x) => /^(gesichert: „|Sichern geht so nicht|Sichern fehlgeschlagen|Sichern: )/.test(String(window.__ozzy.werk().meldung)) && !String(window.__ozzy.werk().meldung).startsWith('sichere'), PA, { timeout: 30000 });
  const m3 = (await O('werk')).meldung;
  const za4 = zeit(PA);
  ok(
    '3 ⌘S nach einem Zug: unter dem Namen der Form, ohne Frage',
    za4 > za3 && Math.hypot(p1.x - p0.x, p1.y - p0.y) > 1,
    `Punkt um ${Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(1)} gezogen; Datei ${za4 > za3 ? 'neu' : 'unverändert'}; Meldung „${m3}“; Haut ${stand.n} Punkte, ohne Spiegelpartner ${stand.ohne}`,
  );
  if (!(za4 > za3)) throw new Error('ohne Sichern kein Neuladen');
  // 4 neu laden
  await s.goto(`${basis}?form=${encodeURIComponent(PA)}`);
  await s.waitForFunction(() => !!window.__ozzy);
  await ruhig();
  const nachher = { linien: await O('werkLinienDaten'), haut: (await O('pose', true)).haut };
  let d = 0;
  const zahlen = (o, f) => {
    if (typeof o === 'number') f(o);
    else if (Array.isArray(o)) o.forEach((x) => zahlen(x, f));
    else if (o && typeof o === 'object') Object.keys(o).sort().forEach((k) => zahlen(o[k], f));
  };
  const a = [];
  const b = [];
  zahlen(vorher.linien, (x) => a.push(x));
  zahlen(nachher.linien, (x) => b.push(x));
  for (let i = 0; i < Math.max(a.length, b.length); i++) d = Math.max(d, Math.abs((a[i] ?? NaN) - (b[i] ?? NaN)) || (a[i] === b[i] ? 0 : Infinity));
  let dh = 0;
  for (let i = 0; i < Math.max(vorher.haut.length, nachher.haut.length); i++) dh = Math.max(dh, Math.abs(vorher.haut[i] - nachher.haut[i]) || 0);
  ok(
    '4 neu geladen: Linien, Punkte, Griffe und Haut wie vor ⌘S',
    a.length === b.length && d <= 1e-9 && vorher.haut.length === nachher.haut.length && dh <= 1e-6,
    `${a.length} / ${b.length} Zahlen der Linien, größter Unterschied ${d.toExponential(1)}; Haut ${vorher.haut.length / 3} / ${nachher.haut.length / 3} Punkte, größter Unterschied ${dh.toExponential(1)}`,
  );
  ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
} finally {
  aufraeumen();
  await browser.close();
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
