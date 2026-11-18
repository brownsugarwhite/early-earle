// Form zuerst (06.11.2026): Wie örtlich wirkt ein Zug mit „Haut aus den Kurven“? Kugel, drei Loops, oberster Punkt der Mitte 60
// hinauf; gemessen, wie weit sich Hautpunkte unterhalb des waagerechten Rings (y < −10) bewegen (ohne Verdichten, damit die Nummern
// bleiben), und die Form statt des Gleitens: Abstand zur Kugel unten vorher/nachher. Zum Vergleich KURVEN_URL mit &haut=gedaechtnis.
// Aufruf aus apps/editor: node scripts/pruefen/form-oertlich.mjs
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?verdichten=0';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 40) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(1500);
};
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -200, y: 0, z: 0 })), xy(await bild('seite', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 10, y: 200, z: 0 })), xy(await bild('seite', { x: 10, y: -200, z: 0 })), 6);
await seite.keyboard.press('Escape');
const vorher = await K('lagen');
const m = (await K('loops')).find((l) => l.art === 'mitte');
const oben = m.punkte.filter((p) => p.sichtbar !== false).reduce((b, p) => (p.ref.y > b.ref.y ? p : b));
await ziehen(xy(await bild('seite', oben.ref)), xy(await bild('seite', { ...oben.ref, y: oben.ref.y + Number(process.env.HOCH ?? 60) })));
const nachher = await K('lagen');
const n = Math.min(vorher.length, nachher.length) / 3;
let unten = 0;
let oberhalb = 0;
let zahl = 0;
for (let v = 0; v < n; v++) {
  const d = Math.hypot(nachher[3 * v] - vorher[3 * v], nachher[3 * v + 1] - vorher[3 * v + 1], nachher[3 * v + 2] - vorher[3 * v + 2]);
  if (vorher[3 * v + 1] < -10) {
    unten = Math.max(unten, d);
    zahl++;
  } else oberhalb = Math.max(oberhalb, d);
}
const baender = [[-10, -40], [-40, -80], [-80, -200]].map(([a, b]) => {
  let mx = 0;
  for (let v = 0; v < n; v++) {
    const y = vorher[3 * v + 1];
    if (y >= a || y < b) continue;
    mx = Math.max(mx, Math.hypot(nachher[3 * v] - vorher[3 * v], nachher[3 * v + 1] - vorher[3 * v + 1], nachher[3 * v + 2] - vorher[3 * v + 2]));
  }
  return `y ${a}…${b}: ${mx.toFixed(2)}`;
});
console.log(baender.join(' · '));
// Form statt Gleiten: Abstand zur Kugel (r − 150) unten, vorher und nachher
const kugel = (P) => {
  let mx = 0;
  for (let v = 0; v < P.length / 3; v++) {
    if (P[3 * v + 1] >= -40) continue;
    mx = Math.max(mx, Math.abs(Math.hypot(P[3 * v], P[3 * v + 1], P[3 * v + 2]) - 150));
  }
  return mx.toFixed(2);
};
console.log(`unten (y < −40) neben der Kugel: vorher ${kugel(vorher)}, nachher ${kugel(nachher)}`);
console.log(`${basis}: Punkte ${vorher.length / 3} → ${nachher.length / 3}; unter dem Ring (${zahl}) bewegt bis ${unten.toFixed(3)}, darüber bis ${oberhalb.toFixed(1)}`);
await browser.close();
