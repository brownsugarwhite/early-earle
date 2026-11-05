// Form zuerst (05.11.2026), Beweis „Kurven als Wahrheit“ (`kurven.html?form=bohne`), mit der Maus:
// 1. Start: der Startumriss ist der erste Loop (Bézier-Punkte).
// 2. L, quer über den Kopf ziehen: Loop um den Kopf. 3. L, quer über den Bauch: Loop um den Bauch.
// 4. Im Top den tiefsten Punkt des Kopf-Loops nach innen: Kopf schmaler, Höhe und Bauch bleiben.
// 5. O an, Kopfpunkt oben im Umriss hochziehen: Nachbarn gehen mit (Einflusskreis); ⌘Z muss bitgleich zurück.
// 6. Kopf in den Bauch: Kopfpunkte des Umrisses und den Kopf-Loop wählen (⇧) und 50 nach unten ziehen.
// Nach jedem Schritt: Bild, Maße, Zeiten (je Mausbewegung, Zerlegen), umgeklappte Dreiecke, Bewegung außerhalb des Bereichs.
// Aufruf aus apps/editor: node scripts/pruefen/form-kurven-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?form=bohne';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);

const stand = () => seite.evaluate(() => window.__kurven.stand());
const lagen = () => seite.evaluate(() => window.__kurven.lagen());
const bild = (a, p) => seite.evaluate(([a2, p2]) => window.__kurven.bild(a2, p2), [a, p]);
const zeiten = () => seite.evaluate(() => window.__kurven.zeiten());
const foto = (name) => seite.screenshot({ path: `${ordner}/form-kurven-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 86 });

/** umgeklappte Dreiecke gegen einen früheren Stand */
const umgeklappt = async (vorher) =>
  seite.evaluate((v) => {
    const p = window.__kurven.lagen();
    const t = window.__kurven.dreiecke();
    const n = (q, a, b, c) => {
      const ab = [q[3 * b] - q[3 * a], q[3 * b + 1] - q[3 * a + 1], q[3 * b + 2] - q[3 * a + 2]];
      const ac = [q[3 * c] - q[3 * a], q[3 * c + 1] - q[3 * a + 1], q[3 * c + 2] - q[3 * a + 2]];
      return [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    };
    let z = 0;
    for (let i = 0; i < t.length; i += 3) {
      const a = n(v, t[i], t[i + 1], t[i + 2]);
      const b = n(p, t[i], t[i + 1], t[i + 2]);
      if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < 0) z++;
    }
    return z;
  }, vorher);

/** größte Tiefe |z| und Höhe in einem Fenster der Seite */
const masse = (pos, x0, x1, y0, y1) => {
  let z = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1];
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    z = Math.max(z, Math.abs(pos[i + 2]));
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return { tiefe: Math.round(z * 10) / 10, hoehe: [Math.round(lo * 10) / 10, Math.round(hi * 10) / 10] };
};
const weg = (a, b, sel) => {
  let m = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (!sel(a[i], a[i + 1], a[i + 2])) continue;
    m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]));
  }
  return Math.round(m * 1000) / 1000;
};

const ziehen = async ([x, y], [x2, y2], schritte = 12) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / schritte, y + ((y2 - y) * i) / schritte);
    await seite.waitForTimeout(20);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(250);
};
const klick = async ([x, y], shift = false) => {
  if (shift) await seite.keyboard.down('Shift');
  await seite.mouse.click(x, y);
  if (shift) await seite.keyboard.up('Shift');
  await seite.waitForTimeout(80);
};
const zeitenText = async () => {
  const z = await zeiten();
  const zug = z.zug.slice(-12);
  const mittel = zug.reduce((s, v) => s + v, 0) / Math.max(1, zug.length);
  return `je Mausbewegung ${mittel.toFixed(1)} ms (max ${Math.max(...zug).toFixed(1)}), zerlegen ${z.zerlegen} ms, Bereich ${z.bereich}`;
};
const xy = (p) => [p.x, p.y];

// 1. Start
let s = await stand();
console.log('1 Start:', s.punkte, 'Punkte,', s.dreiecke, 'Dreiecke, Startumriss mit', s.kurven[0].punkte.length, 'Bézier-Punkten');
await foto('start');
const pos0 = await lagen();
const kopf0 = masse(pos0, -158, -142, 28, 200);
const bauch0 = masse(pos0, -128, -112, -200, 0);
console.log('  Kopf bei x −150:', JSON.stringify(kopf0), ' Bauch bei x −120:', JSON.stringify(bauch0));

// 2. Loop um den Kopf, 3. Loop um den Bauch
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -150, y: 185, z: 0 })), xy(await bild('seite', { x: -150, y: 12, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -122, y: 10, z: 0 })), xy(await bild('seite', { x: -122, y: -215, z: 0 })), 6);
s = await stand();
const kopfLoop = s.kurven[1];
const bauchLoop = s.kurven[2];
console.log('2/3 Loops:', s.kurven.length - 1, '· Kopf-Loop', kopfLoop?.punkte.length, 'Punkte, Bauch-Loop', bauchLoop?.punkte.length, 'Punkte');
const pos1 = await lagen();
console.log('  Haut beim Schneiden bewegt:', weg(pos0, pos1, () => true));
await foto('loops');

// 4. Im Top: tiefsten Punkt des Kopf-Loops nach innen (60 %)
let iMax = 1;
kopfLoop.punkte.forEach((q, i) => {
  if (q.z > kopfLoop.punkte[iMax].z) iMax = i;
});
const qk = kopfLoop.punkte[iMax];
const a4 = await bild('top', qk);
const b4 = await bild('top', { ...qk, z: qk.z * 0.6 });
await ziehen(xy(a4), xy(b4));
const pos2 = await lagen();
const kopf2 = masse(pos2, -158, -142, 28, 200);
const bauch2 = masse(pos2, -128, -112, -200, 0);
console.log('4 Kopf im Top schmaler:', JSON.stringify(kopf0), '→', JSON.stringify(kopf2), '· Bauch', JSON.stringify(bauch0), '→', JSON.stringify(bauch2));
console.log('  ', await zeitenText(), '· umgeklappt', await umgeklappt(pos1), '· Bauch bewegt', weg(pos1, pos2, (x, y) => y < -40 && x > -140));
await foto('kopf-schmal');

// 5. O an, Radius 90: den oberen Kopfpunkt des Umrisses 40 hoch; dann ⌘Z
await seite.keyboard.press('o');
await seite.evaluate(() => window.__kurven.setzeRadius(90));
const k3 = (await stand()).kurven[0].punkte[3];
await ziehen(xy(await bild('seite', k3)), xy(await bild('seite', { ...k3, y: k3.y + 40 })));
const vorO = s;
s = await stand();
const mitgegangen = s.kurven
  .flatMap((k, ki) =>
    k.punkte.map((q, i) => {
      const p = vorO.kurven[ki].punkte[i];
      return { name: `${ki}:${i}`, d: Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) };
    }),
  )
  .filter((m) => m.d > 0.05)
  .map((m) => `${m.name} ${m.d.toFixed(1)}`);
console.log('5 O-Kreis:', await zeitenText(), '· umgeklappt', await umgeklappt(pos2));
console.log('  mitgegangene Punkte (Kurve:Punkt Weg):', mitgegangen.join(', '));
await foto('o-kreis');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(200);
const pos4 = await lagen();
console.log('  ⌘Z: Haut zurück auf den Stand davor, größte Abweichung', weg(pos2, pos4, () => true));
await seite.keyboard.press('o');

// 5b. Bézier-Griff: die Schnauzenspitze (Punkt 4) wählen und ihren unteren Griff länger ziehen
s = await stand();
await klick(xy(await bild('seite', s.kurven[0].punkte[4])));
const griffe = await seite.evaluate(() =>
  [...document.querySelectorAll('#blatt-seite rect.griff')].map((e) => {
    const r = e.getBoundingClientRect();
    return { g: e.getAttribute('data-g'), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }),
);
const gAus = griffe.find((q) => q.g === 'aus');
if (gAus) {
  const vorG = await lagen();
  await ziehen([gAus.x, gAus.y], [gAus.x + 10, gAus.y + 40]);
  console.log('5b Griff gezogen:', await zeitenText(), '· umgeklappt', await umgeklappt(vorG));
  await foto('griff');
  await seite.keyboard.press('Meta+z');
  await seite.waitForTimeout(200);
  console.log('   ⌘Z: größte Abweichung', weg(vorG, await lagen(), () => true));
} else console.log('5b kein Griff gefunden');

// 6. Kopf in den Bauch: Kopfpunkte des Umrisses (3–6) und die inneren Punkte des Kopf-Loops wählen, 50 nach unten
s = await stand();
const wahl = [...[3, 4, 5, 6].map((i) => s.kurven[0].punkte[i]), ...s.kurven[1].punkte.slice(1, -1)];
await klick(xy(await bild('seite', wahl[0])));
for (const q of wahl.slice(1)) await klick(xy(await bild('seite', q)), true);
s = await stand();
console.log('6 gewählt:', s.auswahl.length, 'Punkte');
const pos5 = await lagen();
const g = wahl[0];
await ziehen(xy(await bild('seite', g)), xy(await bild('seite', { ...g, y: g.y - 50 })), 15);
const pos6 = await lagen();
console.log(
  '  Kopf in den Bauch:',
  await zeitenText(),
  '· umgeklappt',
  await umgeklappt(pos5),
  '· Rücken/Bauch hinten bewegt',
  weg(pos5, pos6, (x) => x > 20),
  '· Bauch-Loop-Gegend bewegt',
  weg(pos5, pos6, (x, y) => x < -100 && y < -60),
);
await foto('kopf-in-bauch');
// Nahbild im 3D: näher heran (Mausrad), etwas von unten
const f = await seite.evaluate(() => window.__kurven.felder());
await seite.mouse.move(f.drei.x + f.drei.w / 2, f.drei.y + f.drei.h / 2);
for (let i = 0; i < 4; i++) {
  await seite.mouse.wheel(0, -120);
  await seite.waitForTimeout(60);
}
await ziehen([f.drei.x + f.drei.w / 2, f.drei.y + f.drei.h / 2], [f.drei.x + f.drei.w / 2 - 60, f.drei.y + f.drei.h / 2 - 50], 8);
await seite.screenshot({
  path: `${ordner}/form-kurven-kopf-in-bauch-nah-2026-11-05.jpg`,
  type: 'jpeg',
  quality: 88,
  clip: { x: f.drei.x, y: f.drei.y + 30, width: f.drei.w, height: f.drei.h - 30 },
});

// 7. Kugel: der Startumriss hat 4 Punkte, ein Zug ändert den halben Körper (Bereich = alles)
await seite.goto(basis.replace('form=bohne', 'form=kugel'));
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(300);
s = await stand();
const oben = s.kurven[0].punkte[1];
const posK = await lagen();
await ziehen(xy(await bild('seite', oben)), xy(await bild('seite', { ...oben, y: oben.y + 60 })));
console.log('7 Kugel oben 60 hoch:', await zeitenText(), '· umgeklappt', await umgeklappt(posK));
console.log(
  '  Ausdehnung x/y/z vorher→nachher: (−150…150) →',
  JSON.stringify(await seite.evaluate(() => window.__kurven.masse())),
  '· Abweichung vom Spiegelbild',
  (await seite.evaluate(() => window.__kurven.symmetrie())).toExponential(2),
);
await foto('kugel-zug');

console.log('Fehler im Fenster:', fehler.length ? fehler : 'keine');
await browser.close();
