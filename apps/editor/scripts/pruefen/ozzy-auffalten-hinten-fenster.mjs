// Ozzy, S16 im Plan „wie es weitergeht“ (17.11.2026): Aufklappen von hinten und von unten, an „strange bird“ (NAME).
// Erst wird der Raum ins Leere gezogen (von hinten: 150° um die Hochachse; von unten: 84° nach unten), dann Tab hin und zurück, Bild für
// Bild (60 je Sekunde).
// Kriterien (je Lage):
//   1  Vorher ist Schwarz zu sehen (die Rückseite), und die Kamera steht nicht vorn rechts oben.
//   2  Kein Sprung: Das Schwarz ändert sich je Bild um höchstens 15 % der Bildfläche, hin und zurück; am Ende ist es weg.
//   3  Die Kiste beginnt erst aufzuklappen, wenn die Kamera vorn rechts oben steht (davor dreht der Raum).
//   4  Gleichmäßig: Nach dem Drehen steigt die Geschwindigkeit jedes Bezugspunkts beim Aufklappen einmal an und fällt einmal ab (wie die
//      Probe zu S10). Gezählt ab dem Ende der Drehung: Bis dahin bremst die Drehung, während das Aufklappen schon beginnt.
//   5  Zurück: im Raum, ohne Schwarz.
//   6  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-auffalten-hinten-fenster.mjs
import { chromium } from '@playwright/test';

const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
const ruhig = async () => {
  await s.waitForTimeout(250);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(250);
};
// ein Bild weiter; zurück: Stand, Schwarz (Anteil der Bildfläche, Raster 32 × 20) und die Bezugspunkte des Aufklappens
const bild = () =>
  s.evaluate(() => {
    const o = window.__ozzy;
    o.bild(1 / 60);
    const b = o.blick();
    let n = 0;
    for (let i = 0; i < 32; i++) for (let j = 0; j < 20; j++) if (o.dunkelBei(((i + 0.5) * innerWidth) / 32, ((j + 0.5) * innerHeight) / 20) > 0.5) n++;
    return { vier: b.vier, vorKiste: b.vorKiste, dreht: b.vorDreh, ansicht: b.ansicht, dunkel: n / 640, falt: o.faltPunkte() };
  });
const fahrt = async (ziel) => {
  const bilder = [];
  for (let i = 0; i < 300; i++) {
    const b = await bild();
    bilder.push(b);
    if (i > 2 && b.vier === ziel && bilder[i - 1].vier === ziel) break;
  }
  return bilder;
};
const gipfel = (bilder, j) => {
  const v = [];
  for (let i = 1; i < bilder.length; i++) v.push(Math.hypot(bilder[i].falt.punkte[j].x - bilder[i - 1].falt.punkte[j].x, bilder[i].falt.punkte[j].y - bilder[i - 1].falt.punkte[j].y));
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
  return n;
};
const LAGEN = [
  { name: 'von hinten', dx: 433, dy: -40 },
  { name: 'von unten', dx: 0, dy: -243 },
];
for (const lage of LAGEN) {
  await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
  await s.waitForFunction(() => !!window.__ozzy);
  await ruhig();
  // ins Leere ziehen, langsam loslassen (ohne Schwung)
  await s.mouse.move(200, 700);
  await s.mouse.down();
  for (let k = 1; k <= 40; k++) {
    await s.mouse.move(200 + (lage.dx * k) / 40, 700 + (lage.dy * k) / 40);
    await s.waitForTimeout(20);
  }
  await s.waitForTimeout(400);
  await s.mouse.up();
  await s.waitForTimeout(600);
  await ruhig();
  await s.mouse.move(1350, 850);
  await s.evaluate(() => window.__ozzy.film(true));
  const A = await bild();
  ok(`${lage.name} 1 vorher Schwarz, nicht vor der Kiste`, A.dunkel > 0.05 && !A.vorKiste, `Schwarz ${z2(A.dunkel)} der Fläche`);
  await s.keyboard.press('Tab');
  const hin = await fahrt(1);
  await s.keyboard.press('Tab');
  const zurueck = await fahrt(0);
  const alle = [A, ...hin, ...zurueck];
  let sprung = 0;
  for (let i = 1; i < alle.length; i++) sprung = Math.max(sprung, Math.abs(alle[i].dunkel - alle[i - 1].dunkel));
  const offen = hin[hin.length - 1];
  ok(`${lage.name} 2 kein Sprung im Schwarz`, sprung <= 0.15 && offen.vier >= 1 && offen.dunkel === 0, `größte Änderung je Bild ${z2(sprung)}, offen ${z2(offen.dunkel)}`);
  const erst = hin.findIndex((b) => b.vier > 0);
  ok(`${lage.name} 3 klappt erst vor der Kiste auf`, erst > 0 && hin[erst].vorKiste, `Drehen ${erst} Bilder, dann vor der Kiste: ${erst >= 0 && hin[erst].vorKiste}`);
  const nachDrehen = hin.findIndex((b) => b.vier > 0 && !b.dreht);
  const auf = hin.slice(Math.max(0, nachDrehen - 1)).filter((b) => b.falt);
  const g = [0, 1, 2, 3, 4, 5].map((j) => gipfel(auf, j));
  ok(`${lage.name} 4 gleichmäßig beim Aufklappen`, g.every((n) => n === 1), `Gipfel je Punkt ${g.join(' ')}, ${auf.length} Bilder (Drehen und Aufklappen überlappen ${nachDrehen - erst} Bilder)`);
  if (process.env.DIAG === '1')
    for (const j of [0, 2, 4])
      console.log(
        j,
        auf.map((b, i) => (i ? Math.hypot(b.falt.punkte[j].x - auf[i - 1].falt.punkte[j].x, b.falt.punkte[j].y - auf[i - 1].falt.punkte[j].y).toFixed(1) : '·')).join(' '),
      );
  const Z = zurueck[zurueck.length - 1];
  ok(`${lage.name} 5 zurück im Raum ohne Schwarz`, Z.vier === 0 && Z.ansicht === 'raum' && Z.dunkel === 0, `Schwarz ${z2(Z.dunkel)}`);
}
ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
