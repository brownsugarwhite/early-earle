// Ozzy, S10 im Plan „wie es weitergeht“ (16.11.2026): das Auffalten als Kistennetz (seit Florians „ja standard“ der Weg in die Vier
// Ansichten), an „strange bird“ (NAME).
// Sechs Bezugspunkte der Zeichnungen (je Wand die Mitte der Form und ein Punkt daneben), Bild für Bild (60 je Sekunde) hin und zurück.
// Kriterien:
//   1  Anfang: Im ersten Bild nach Tab liegt jede Zeichnung noch auf ihrer Wand (höchstens 2 px weg).
//   2  Ende: Das letzte Bild der Fahrt liegt höchstens 3 px vor dem Feld (kein Nachschieben).
//   3  Gleichmäßig: Die Geschwindigkeit jedes Bezugspunkts steigt einmal an und fällt einmal ab (ein Gipfel), hin und zurück.
//   4  Zurück: alles wieder genau auf den Wänden (höchstens 0,5 px).
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-auffalten-fenster.mjs
import { chromium } from '@playwright/test';

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
await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
await s.waitForTimeout(600);
await s.mouse.move(1300, 820);
await s.evaluate(() => window.__ozzy.film(true));
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const lesen = () => s.evaluate(() => window.__ozzy.faltPunkte());
const abstand = (a, b) => Math.max(...a.punkte.map((p, i) => Math.hypot(p.x - b.punkte[i].x, p.y - b.punkte[i].y)));
const fahrt = async () => {
  const bilder = [];
  for (let i = 0; i < 120; i++) {
    await s.evaluate(() => window.__ozzy.bild(1 / 60));
    const b = await lesen();
    bilder.push(b);
    if (i > 2 && (b.vier >= 1 || b.vier <= 0) && bilder[i - 1].vier === b.vier) break;
  }
  return bilder;
};
// Gipfel der Geschwindigkeit je Punkt (Anstieg und Abfall erst ab 3 % der größten Geschwindigkeit gezählt)
const gipfel = (bilder, j) => {
  const v = [];
  for (let i = 1; i < bilder.length; i++) v.push(Math.hypot(bilder[i].punkte[j].x - bilder[i - 1].punkte[j].x, bilder[i].punkte[j].y - bilder[i - 1].punkte[j].y));
  const max = Math.max(...v);
  const tol = Math.max(0.05, 0.03 * max);
  let n = 0;
  let steigt = true;
  let ref = v[0];
  for (const x of v) {
    if (steigt && x < ref - tol) {
      n++;
      steigt = false;
      ref = x;
    } else if (!steigt && x > ref + tol) {
      steigt = true;
      ref = x;
    } else ref = steigt ? Math.max(ref, x) : Math.min(ref, x);
  }
  return { n, max };
};
const A0 = await lesen();
await s.keyboard.press('Tab');
const hin = await fahrt();
const d1 = abstand(hin[0], A0);
ok('1 Anfang: im ersten Bild noch auf den Wänden', d1 <= 2, `größter Abstand ${z1(d1)} px (Stand ${hin[0].e?.toFixed(4)})`);
const ende = hin[hin.length - 1];
const vorEnde = hin.findLast((b) => b.vier < 1) ?? hin[hin.length - 2];
const d2 = abstand(vorEnde, ende);
ok('2 Ende: kein Nachschieben', ende.vier >= 1 && d2 <= 3, `letztes Bild der Fahrt ${z1(d2)} px vor dem Feld, ${hin.length} Bilder`);
const gh = hin.map((_, j) => j).slice(0, 6).map((j) => gipfel(hin, j));
await s.keyboard.press('Tab');
const zurueck = await fahrt();
const gz = [0, 1, 2, 3, 4, 5].map((j) => gipfel(zurueck, j));
const namen = ['Seite Mitte', 'Seite daneben', 'Front Mitte', 'Front daneben', 'Top Mitte', 'Top daneben'];
ok(
  '3 gleichmäßig: ein Gipfel der Geschwindigkeit je Punkt, hin und zurück',
  gh.every((g) => g.n === 1) && gz.every((g) => g.n === 1),
  namen.map((nm, j) => `${nm} ${gh[j].n}/${gz[j].n} (bis ${z1(gh[j].max)} px je Bild)`).join(', '),
);
const A1 = zurueck[zurueck.length - 1];
const d4 = abstand(A1, A0);
ok('4 zurück: wieder auf den Wänden', A1.vier <= 0 && d4 <= 0.5, `größter Abstand ${z1(d4)} px`);
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
if (process.env.DIAG === '1') {
  for (const j of [0, 2, 4])
    console.log(
      namen[j],
      hin.map((b, i) => (i ? Math.hypot(b.punkte[j].x - hin[i - 1].punkte[j].x, b.punkte[j].y - hin[i - 1].punkte[j].y).toFixed(1) : '0')).join(' '),
    );
}
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
