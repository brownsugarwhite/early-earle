// Ozzy, S12 im Plan „wie es weitergeht“ (16.11.2026), erster Schritt: Stift und Finger, nachgestellt in Chromium (Berührung über das
// Protokoll des Browsers, Stift als Zeiger der Art „pen“), an „strange bird“ (NAME), in der eingerasteten Seite.
// Kriterien:
//   1  Stift = Zeiger: Ein Zug mit dem Stift an einem Punkt der Seite zieht ihn (wie die Maus).
//   2  Nach dem Stift: Ein Finger über denselben Punkt zieht ihn nicht, er dreht (Gier ändert sich).
//   3  Zwei Finger auseinander: zoomt (mindestens 1,4-fach), die Stelle zwischen den Fingern bleibt unter ihnen (höchstens 6 px).
//   4  Zwei Finger gemeinsam verschoben: schwenkt (das Bild folgt den Fingern, höchstens 3 px daneben).
//   5  Zwei Finger verdreht (30°): dreht um die Hochachse; beim Loslassen rastet es nahe einer Ansicht ein oder bleibt gedreht.
//   6  Knöpfe: Sie sind da; „Seite“ rastet ein (gedrückt angezeigt), „Zurück“ nimmt den Zug von 1 zurück, „Einpassen“ setzt Zoom und
//      Schwenk zurück.
//   7  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-ipad-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'strange bird';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const kontext = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
const s = await kontext.newPage();
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
const cdp = await kontext.newCDPSession(s);
await s.goto(`${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhig = async () => {
  await s.waitForTimeout(250);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.waitForTimeout(150);
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const pause = (ms) => s.waitForTimeout(ms);
/** Stift: drücken, ziehen, abheben (Zeiger der Art „pen“) */
const stiftZug = async (von, nach, n = 12) => {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: von.x, y: von.y, pointerType: 'pen' });
  await pause(300);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: von.x, y: von.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'pen' });
  await pause(200);
  for (let i = 1; i <= n; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: von.x + ((nach.x - von.x) * i) / n, y: von.y + ((nach.y - von.y) * i) / n, button: 'left', buttons: 1, pointerType: 'pen' });
    await pause(30);
  }
  await pause(150);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: nach.x, y: nach.y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'pen' });
};
/** Finger: je Schritt die Lagen aller Finger (Liste von Listen) */
const fingerZug = async (schritte) => {
  const punkte = (lagen) => lagen.map((p, i) => ({ x: p.x, y: p.y, id: i + 1, radiusX: 4, radiusY: 4, force: 1 }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: punkte(schritte[0]) });
  await pause(60);
  for (const lagen of schritte.slice(1)) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: punkte(lagen) });
    await pause(30);
  }
  await pause(100);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(300);
};
const reihe = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
await ruhig();
await s.keyboard.press('1');
await pause(1500);
await ruhig();
const A = { id: 2, i: 1 };
const punkt = async () => (await O('werkLinienDaten')).find((l) => l.id === A.id).punkte[A.i];
// 1 Stift zieht einen Punkt
const p0 = await punkt();
const c0 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
await stiftZug(c0, { x: c0.x, y: c0.y - 40 });
await ruhig();
await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt, null, { timeout: 60000 });
const p1 = await punkt();
const schritte1 = (await O('werk')).schritte;
ok('1 Stift = Zeiger: zieht den Punkt', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 5 && (await O('blick')).stift, `Punkt um ${z1(Math.hypot(p1.x - p0.x, p1.y - p0.y))} Einheiten, Schritte ${schritte1}`);
// 2 ein Finger über demselben Punkt: dreht, zieht nicht
const c1 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
const g0 = (await O('blick')).gier;
await fingerZug(reihe(12, (t) => [{ x: c1.x + 60 * t, y: c1.y }]));
const p2 = await punkt();
const g1 = (await O('blick')).gier;
ok('2 nach dem Stift: ein Finger dreht und zieht keinen Punkt', Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1e-9 && Math.abs(g1 - g0) > 0.05, `Punkt um ${z1(Math.hypot(p2.x - p1.x, p2.y - p1.y))}, Gier ${z1((g0 * 180) / Math.PI)}° → ${z1((g1 * 180) / Math.PI)}°`);
await s.keyboard.press('1');
await pause(1500);
await ruhig();
// 3 zwei Finger auseinander: zoomt zu den Fingern hin
const m = { x: 640, y: 380 };
const b0 = await O('blick');
const q0 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
await fingerZug(reihe(16, (t) => [{ x: m.x - 60 - 60 * t, y: m.y }, { x: m.x + 60 + 60 * t, y: m.y }]));
await pause(200);
const b1 = await O('blick');
const q1 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
// die Stelle q0 lag (q0 − m) von der Mitte; nach dem Zoom um k soll sie bei m + k (q0 − m) liegen
const k = b1.zoom / b0.zoom;
const soll = { x: m.x + k * (q0.x - m.x), y: m.y + k * (q0.y - m.y) };
const d3 = Math.hypot(q1.x - soll.x, q1.y - soll.y);
ok('3 zwei Finger auseinander: zoomt zu den Fingern hin', k >= 1.4 && d3 <= 6, `Zoom ${z1(b0.zoom)} → ${z1(b1.zoom)} (×${z1(k)}), Punkt ${z1(d3)} px neben der Stelle unter den Fingern`);
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-ipad-zoom.png` });
// 4 zwei Finger gemeinsam verschieben: schwenkt
const r0 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
await fingerZug(reihe(14, (t) => [{ x: 500 + 80 * t, y: 420 + 50 * t }, { x: 700 + 80 * t, y: 420 + 50 * t }]));
await pause(200);
const r1 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
const d4 = Math.hypot(r1.x - r0.x - 80, r1.y - r0.y - 50);
ok('4 zwei Finger verschoben: schwenkt mit', d4 <= 3, `Punkt um ${z1(r1.x - r0.x)} / ${z1(r1.y - r0.y)} px (Finger 80 / 50), ${z1(d4)} px daneben; Schwenk ${(await O('blick')).schwenk.map(z1).join(' / ')}`);
// 5 zwei Finger verdreht: dreht um die Hochachse
const v0 = await O('blick');
await fingerZug(
  reihe(16, (t) => {
    const w = (30 * Math.PI) / 180 * t;
    return [
      { x: 640 - 120 * Math.cos(w), y: 400 - 120 * Math.sin(w) },
      { x: 640 + 120 * Math.cos(w), y: 400 + 120 * Math.sin(w) },
    ];
  }),
);
const v1 = await O('blick');
await pause(1200);
const v2 = await O('blick');
ok(
  '5 zwei Finger verdreht: dreht um die Hochachse',
  Math.abs(v1.gier - v0.gier) > 0.2 && Math.abs(v1.neigung - v0.neigung) < 1e-6,
  `Gier ${z1((v0.gier * 180) / Math.PI)}° → ${z1((v1.gier * 180) / Math.PI)}°, Neigung gleich; danach Ansicht „${v2.ansicht}“`,
);
// 6 Knöpfe
const sichtbar = await s.locator('#tasten').isVisible();
await s.locator('#tasten button[data-ansicht="seite"]').click();
await pause(1500);
await ruhig();
const n6 = await O('blick');
const gedrueckt = await s.locator('#tasten button[data-ansicht="seite"]').getAttribute('aria-pressed');
const sz0 = (await O('werk')).schritte;
await s.locator('#tasten button[data-taste="z"]').click();
await ruhig();
const p6 = await punkt();
const sz1 = (await O('werk')).schritte;
await s.locator('#tasten button[data-taste="Home"]').click();
await pause(300);
const e6 = await O('blick');
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-ipad-knoepfe.png` });
ok(
  '6 Knöpfe: Seite rastet ein, Zurück nimmt den Zug zurück, Einpassen setzt zurück',
  sichtbar && n6.ansicht === 'seite' && gedrueckt === 'true' && sz1 === sz0 - 1 && Math.hypot(p6.x - p0.x, p6.y - p0.y) < 1e-6 && e6.zoom === 1 && e6.schwenk[0] === 0 && e6.schwenk[1] === 0,
  `sichtbar ${sichtbar}, Ansicht „${n6.ansicht}“ (gedrückt ${gedrueckt}); Schritte ${sz0} → ${sz1}, Punkt ${z1(Math.hypot(p6.x - p0.x, p6.y - p0.y))} vom Anfang; Zoom ${e6.zoom}, Schwenk ${e6.schwenk.join(' / ')}`,
);
ok('7 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
