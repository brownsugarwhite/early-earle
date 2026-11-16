// Ozzy, S6 im Plan „wie es weitergeht“ (16.11.2026): Richtungen wie in der Studie, an „strange bird“ (NAME), in der eingerasteten Seite.
// Kriterien:
//   1  ⌥ während des Drehens: Eine Richtung (glatter Punkt) wird gedreht, beide Richtungen drehen mit; mitten im Zug ⌥: Der Punkt wird
//      eine Ecke, die Gegenrichtung bleibt ab da stehen (±1°), die gezogene dreht weiter (über 10°).
//   2  Ein ⌘Z nimmt die ganze Geste zurück: Punkt und Griffe wie vorher (die Ecke ist wieder weg).
//   3  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-richtung-fenster.mjs [ordner für Bilder]
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
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 60000 });
  await s.waitForTimeout(150);
};
await ruhig();
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const A = { id: 2, i: 1 };
const punkt = async () => (await O('werkLinienDaten')).find((l) => l.id === A.id).punkte[A.i];
const wi = (g) => (Math.atan2(g.y, g.x) * 180) / Math.PI;
const dw = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const p0 = await punkt();
const c0 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
// erst den Punkt wählen (dann zeigt er seine Richtungen), dann die Nadel 10 px darunter greifen
await s.mouse.move(c0.x, c0.y);
await s.waitForTimeout(400);
await s.mouse.down();
await s.waitForTimeout(60);
await s.mouse.up();
await s.waitForTimeout(300);
await ruhig();
await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 60000 });
await s.waitForTimeout(200);
// Nadel des Griffs „aus“: in der Seite zeigt er im Bild wie im Blatt (x nach rechts, y nach oben)
const phi = (-Math.atan2(p0.aus.y, p0.aus.x) * 180) / Math.PI;
const R = 12;
await s.mouse.move(c0.x + R * Math.cos((phi * Math.PI) / 180), c0.y + R * Math.sin((phi * Math.PI) / 180));
const R2 = 40;
await s.waitForTimeout(400);
const ziel = (await O('bearbeiten')).ziel;
await s.mouse.down();
await s.waitForTimeout(200);
const dreh = async (von, bis, n) => {
  for (let k = 1; k <= n; k++) {
    const w = ((phi + von + ((bis - von) * k) / n) * Math.PI) / 180;
    const r = R + (R2 - R) * Math.min(1, (von + ((bis - von) * k) / n) / 10);
    await s.mouse.move(c0.x + r * Math.cos(w), c0.y + r * Math.sin(w));
    await s.waitForTimeout(30);
  }
};
await dreh(0, 45, 30);
await s.waitForTimeout(900);
const pv = await punkt();
if (process.env.DIAG === '1') console.log('vor ⌥:', JSON.stringify({ ein: wi(pv.ein).toFixed(1), aus: wi(pv.aus).toFixed(1), werk: await O('werk') }));
await s.keyboard.down('Alt');
await dreh(45, 47, 2);
await s.waitForTimeout(400);
const pm = await punkt();
await dreh(47, 85, 20);
await s.waitForTimeout(250);
if (ordner) await s.screenshot({ path: `${ordner}/ozzy-richtung-alt.png` });
await s.mouse.up();
await s.keyboard.up('Alt');
await ruhig();
const p1 = await punkt();
ok(
  '1 ⌥ während des Drehens: der Punkt wird eine Ecke, die Gegenrichtung bleibt stehen, die gezogene dreht weiter',
  !p0.ecke && p1.ecke && dw(wi(pm.ein), wi(p1.ein)) <= 1 && dw(wi(pm.aus), wi(p1.aus)) > 10 && dw(wi(p0.ein), wi(pm.ein)) > 3,
  `Ziel „${ziel}“; vorher Ecke ${p0.ecke}, danach ${p1.ecke}; Gegenrichtung vor ⌥ ${z1(wi(p0.ein))}° → bei ⌥ ${z1(wi(pm.ein))}° → danach ${z1(wi(p1.ein))}°; gezogene bei ⌥ ${z1(wi(pm.aus))}° → danach ${z1(wi(p1.aus))}°`,
);
const schritte = (await O('bearbeiten')).schritte;
await s.keyboard.press('Meta+z');
await ruhig();
const p2 = await punkt();
const d2 = Math.max(Math.abs(p2.x - p0.x), Math.abs(p2.y - p0.y), Math.abs(p2.z - p0.z), ...['x', 'y', 'z'].flatMap((k) => [Math.abs((p2.ein?.[k] ?? 0) - (p0.ein?.[k] ?? 0)), Math.abs((p2.aus?.[k] ?? 0) - (p0.aus?.[k] ?? 0))]));
ok('2 ein ⌘Z: wie vorher', schritte === 1 && !p2.ecke && d2 <= 1e-6, `Schritte der Geste ${schritte}, danach Ecke ${p2.ecke}, größter Unterschied ${d2.toExponential(1)}`);
// 4 (S6b): ⇧ kippt die Richtung aus der Ebene: erst in der Ebene drehen, dann ⇧ halten und quer zum Griff ziehen
{
  // den Punkt wieder wählen (nach ⌘Z zeigt er seine Richtungen sonst nicht)
  const c1 = (await O('ankerImBild', A.id, A.i, 'seite')).find((q) => !q.m);
  await s.mouse.move(c1.x, c1.y);
  await s.waitForTimeout(400);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(300);
  await ruhig();
  await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 60000 });
  const q0 = await punkt();
  const phi2 = (-Math.atan2(q0.aus.y, q0.aus.x) * 180) / Math.PI;
  const R3 = 40;
  const an = (w, r) => [c0.x + r * Math.cos((w * Math.PI) / 180), c0.y + r * Math.sin((w * Math.PI) / 180)];
  let [mx, my] = an(phi2, 12);
  await s.mouse.move(mx, my);
  await s.waitForTimeout(400);
  await s.mouse.down();
  await s.waitForTimeout(200);
  for (let k = 1; k <= 25; k++) {
    [mx, my] = an(phi2 + (45 * k) / 25, 12 + ((R3 - 12) * Math.min(1, k / 5)));
    await s.mouse.move(mx, my);
    await s.waitForTimeout(30);
  }
  await s.waitForTimeout(700);
  await s.keyboard.down('Shift');
  await s.mouse.move(mx + 0.5, my);
  await s.waitForTimeout(500);
  const qs = await punkt();
  // quer zum Griff (im Bild) um 30 Punkte
  const w = (phi2 + 45 + 90) * (Math.PI / 180);
  for (let k = 1; k <= 12; k++) {
    await s.mouse.move(mx + 0.5 + 30 * Math.cos(w) * (k / 12), my + 30 * Math.sin(w) * (k / 12));
    await s.waitForTimeout(30);
  }
  await s.waitForTimeout(400);
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-richtung-kippen.png` });
  await s.mouse.up();
  await s.keyboard.up('Shift');
  await ruhig();
  const q1 = await punkt();
  const lang = (g) => Math.hypot(g.x, g.y, g.z);
  const ebene = (g) => (Math.atan2(g.y, g.x) * 180) / Math.PI;
  const schritte4 = (await O('bearbeiten')).schritte;
  ok(
    '4 ⇧ kippt die Richtung aus der Ebene: Tiefe kommt dazu, Länge und Richtung in der Ebene bleiben',
    dw(ebene(qs.aus), ebene(q0.aus)) > 20 && Math.abs(q1.aus.z - qs.aus.z) > 0.3 * lang(qs.aus) && Math.abs(lang(q1.aus) / lang(qs.aus) - 1) < 0.03 && dw(ebene(q1.aus), ebene(qs.aus)) < 3,
    `vorher in der Ebene ${z1(ebene(q0.aus))}°, Tiefe ${z1(q0.aus.z)}; bei ⇧: Länge ${z1(lang(qs.aus))}, in der Ebene ${z1(ebene(qs.aus))}°, Tiefe ${z1(qs.aus.z)}; danach Länge ${z1(lang(q1.aus))}, in der Ebene ${z1(ebene(q1.aus))}°, Tiefe ${z1(q1.aus.z)}; Schritte ${schritte4}`,
  );
  await s.keyboard.press('Meta+z');
  await ruhig();
  const q2 = await punkt();
  const d4 = Math.max(...['x', 'y', 'z'].flatMap((k) => [Math.abs((q2.aus?.[k] ?? 0) - (q0.aus?.[k] ?? 0)), Math.abs((q2.ein?.[k] ?? 0) - (q0.ein?.[k] ?? 0))]));
  ok('5 ein ⌘Z nimmt Drehen und Kippen zurück', schritte4 === 1 && d4 <= 1e-6, `Schritte ${schritte4}, größter Unterschied ${d4.toExponential(1)}`);
}
ok('3 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
