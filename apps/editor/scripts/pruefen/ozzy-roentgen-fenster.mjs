// Ozzy, S14 im Plan „wie es weitergeht“ (17.11.2026): Röntgen, an „strange bird“ (NAME), in der eingerasteten Seite.
// Kriterien:
//   1  Ohne ⌥: Über einem Punkt hinter der Form greift die Bedienung ihn nicht; ein Klick wählt ihn nicht.
//   2  Mit ⌥ (gehalten): Er ist das Ziel; ziehen (25 px) bewegt ihn im Werk.
//   3  Ein ⌘Z nimmt den Zug zurück.
//   4  Der Knopf „Röntgen“ (iPad) schaltet es an und wieder aus.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-roentgen-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(250);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(200);
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
await ruhig();
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
// ein Punkt hinter der Form, weit weg von allen sichtbaren Punkten (sonst greift man den)
const P = await O('netzPunkte');
const vorn = P.filter((p) => p.sichtbar && !p.verdeckt);
const kandidaten = P.map((p, i) => ({ ...p, i }))
  .filter((p) => p.sichtbar && p.verdeckt && p.w.length)
  .map((p) => ({ ...p, frei: Math.min(...vorn.map((q) => Math.hypot(q.x - p.x, q.y - p.y))) }))
  .sort((a, b) => b.frei - a.frei);
const H = kandidaten[0];
if (!H) {
  console.log('FEHL kein Punkt hinter der Form in der Seite');
  process.exit(1);
}
const [lid, pid] = H.w[0].split('.').map(Number);
const lage = async () => (await O('werkLinienDaten')).find((l) => l.id === lid).punkte[pid];
const p0 = await lage();
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-roentgen-ohne.png` });
// 1 ohne ⌥
await s.mouse.move(H.x, H.y, { steps: 4 });
await s.waitForTimeout(500);
const ziel1 = (await O('bearbeiten')).ziel;
await s.mouse.down();
await s.waitForTimeout(60);
await s.mouse.up();
await s.waitForTimeout(400);
const wahl1 = (await O('bearbeiten')).werkAuswahl;
ok('1 ohne ⌥ greift man ihn nicht', ziel1 !== `Punkt ${H.i}` && !wahl1.some((w) => w.l === lid && w.i === pid), `Ziel „${ziel1}“, gewählt ${wahl1.map((w) => `${w.l}.${w.i}`).join(' ') || '–'}; frei ${z1(H.frei)} px`);
await s.keyboard.press('Escape');
await s.waitForTimeout(200);
// 2 mit ⌥
await s.keyboard.down('Alt');
await s.mouse.move(H.x + 1, H.y, { steps: 2 });
await s.waitForTimeout(500);
const r2 = await O('roentgen');
const ziel2 = (await O('bearbeiten')).ziel;
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-roentgen-mit.png` });
await s.mouse.down();
await s.waitForTimeout(250);
for (let k = 1; k <= 10; k++) {
  await s.mouse.move(H.x + 1, H.y - 2.5 * k);
  await s.waitForTimeout(30);
}
await s.waitForTimeout(300);
await s.mouse.up();
await s.keyboard.up('Alt');
await ruhig();
await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt, null, { timeout: 60000 });
const p2 = await lage();
const weg = Math.hypot(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z);
ok('2 mit ⌥ ist er das Ziel und wird gezogen', r2.greifbar && ziel2 === `Punkt ${H.i}` && weg > 5, `Röntgen ${z1(r2.wert)}, Ziel „${ziel2}“, im Werk um ${z1(weg)} Einheiten bewegt`);
await s.keyboard.press('Meta+z');
await ruhig();
const p3 = await lage();
const zurueck = Math.hypot(p3.x - p0.x, p3.y - p0.y, p3.z - p0.z);
ok('3 ⌘Z nimmt den Zug zurück', zurueck < 1e-6, `${zurueck.toExponential(1)} vom Anfang`);
// 4 der Knopf
await s.evaluate(() => document.querySelector('[data-roentgen]').click());
await s.waitForTimeout(500);
const r4a = await O('roentgen');
await s.evaluate(() => document.querySelector('[data-roentgen]').click());
await s.waitForTimeout(500);
const r4b = await O('roentgen');
ok('4 der Knopf schaltet es an und aus', r4a.greifbar && r4a.fest && !r4b.greifbar && !r4b.fest, `an: ${r4a.greifbar}, aus: ${!r4b.greifbar}`);
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
