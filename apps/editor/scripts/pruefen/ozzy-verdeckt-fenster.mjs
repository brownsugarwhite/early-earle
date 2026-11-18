// Ozzy, S7 im Plan „wie es weitergeht“ (16.11.2026): Verdecktes grün, an „strange bird“ (NAME).
// Kriterien:
//   1  Front und Top: Ein Teil der Linien liegt hinter der Haut (grün, fein), der Rest davor; Seite: fast alles davor.
//   2  Raum: an den Wänden ebenso (verdeckt und vorn).
//   3  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-verdeckt-fenster.mjs [ordner für Bilder]
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
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(500);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const zahl = {};
for (const [taste, name] of [['1', 'seite'], ['3', 'front'], ['7', 'top'], ['0', 'raum']]) {
  await s.keyboard.press(taste);
  await s.waitForTimeout(1600);
  zahl[name] = await O('verdecktZahl');
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-verdeckt-${name}.png` });
}
const t = (n) => `${zahl[n][0]} hinten, ${zahl[n][1]} vorn`;
ok('1 Front und Top: ein Teil hinten, der Rest vorn; Seite fast alles vorn', zahl.front[0] > 0.15 * (zahl.front[0] + zahl.front[1]) && zahl.front[1] > 0 && zahl.top[0] > 0.15 * (zahl.top[0] + zahl.top[1]) && zahl.top[1] > 0 && zahl.seite[0] < 0.25 * (zahl.seite[0] + zahl.seite[1]), `Seite ${t('seite')}; Front ${t('front')}; Top ${t('top')}`);
ok('2 Raum: an den Wänden verdeckt und vorn', zahl.raum[0] > 0 && zahl.raum[1] > 0, t('raum'));
ok('3 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
