// Ozzy, Maul, Feinschlifflauf (20.11.2026), Block A: Zähne und Zunge auf jedem Material, an „teat firefish“ (NAME).
// In „Fressen“ (Unterkiefer 50°), von vorn unten ins Maul gesehen; je Material ein Bild (mit Ordner) und ein Blatt aller Bilder.
// Kriterien:
//   M1 Auf jedem Material (Seifenhaut, Solid, Zebra, Wachs, Jelly, Helles Solid, Grün) stehen Zähne und Zunge im Maul: Ihre Netze
//      sind da und endlich, die Zunge ruht.
//   M2 Im Bild ist im Maul etwas zu sehen: Der Ausschnitt um die Zunge ist nicht einfarbig.
//   M3 Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] node scripts/pruefen/ozzy-maul-material-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const MATERIALIEN = [null, 'Solid', 'Zebra', 'Wachs', 'Jelly', 'Helles Solid', 'Grün'];
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
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: 120000 });
  await s.waitForTimeout(200);
};
const zungeRuht = async () => {
  for (let i = 0; i < 80; i++) {
    await s.waitForTimeout(100);
    const z = await O('zunge');
    if (!z.kette || (!z.laeuftNach && !z.kette.bewegt)) return true;
  }
  return false;
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
await ruhig();
await O('material', 'wachs');
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
await s.keyboard.press('p');
await s.waitForTimeout(300);
for (const [x, y] of LINIE) {
  const q = await O('werkImBild', { x, y, z: 0 });
  await s.mouse.move(q.x, q.y);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
}
await s.keyboard.press('Enter');
await s.waitForTimeout(500);
await s.click('#maul-tropfen');
await s.waitForFunction(() => !window.__ozzy.maulStrich(), null, { timeout: 60000 }).catch(() => {});
await ruhig();
await s.waitForTimeout(2500);
await ruhig();
await s.keyboard.press('a');
await s.waitForTimeout(300);
await s.keyboard.press('Escape');
await s.waitForTimeout(300);
await s.keyboard.press('0');
await s.waitForTimeout(1800);
await O('zaehne', 'anfang');
// (eine lange Zunge: Sie liegt über den Zähnen und hängt vor der Lippe)
await O('zunge', { laenge: 1.22, breite: 0.68, dicke: 0.07, rille: 0.3, spitz: 0.15, gabel: 0, form: 3 });
await s.waitForTimeout(800);
await s.click('#fressen-knopf');
await s.waitForTimeout(1500);
await ruhig();
await s.evaluate(() => {
  const r = document.getElementById('fressen-maul');
  r.value = '50';
  r.dispatchEvent(new Event('input', { bubbles: true }));
  r.dispatchEvent(new Event('change', { bubbles: true }));
});
await s.waitForTimeout(1200);
await O('blickSetzen', { gier: -2.3, neigung: -0.45, zoom: 5 });
await s.waitForTimeout(1500);
await zungeRuht();
const zeilen = [];
const bilder = [];
let alleDa = true;
let alleBunt = true;
for (const m of MATERIALIEN) {
  const name = m ?? 'Seifenhaut';
  const gesetzt = await O('material', m);
  await s.waitForTimeout(m === 'Jelly' || m === 'Helles Solid' || m === 'Grün' ? 4500 : 1800);
  const ruht = await zungeRuht();
  const z = await O('zunge');
  const za = await O('zaehne');
  const mitte = z.knoten?.[6] ?? z.mitte;
  const clip = { x: Math.max(0, Math.min(1440 - 560, mitte[0] - 280)), y: Math.max(0, Math.min(900 - 420, mitte[1] - 210)), width: 560, height: 420 };
  const png = await s.screenshot({ clip });
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-maul-material-${name.replace(/ /g, '-')}.png`, png);
  bilder.push([name, png.toString('base64')]);
  // (wie viele verschiedene Farben der Ausschnitt hat: grob, an einem verkleinerten Bild im Fenster gezählt)
  const farben = await s.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const k = document.createElement('canvas');
    k.width = 56;
    k.height = 42;
    const c = k.getContext('2d');
    c.drawImage(img, 0, 0, 56, 42);
    const d = c.getImageData(0, 0, 56, 42).data;
    const menge = new Set();
    for (let i = 0; i < d.length; i += 4) menge.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    return menge.size;
  }, png.toString('base64'));
  const da = !!z.netz && z.netz.endlich && !!za.netz && za.netz.endlich && za.plaetze.length === 23 && ruht;
  if (!da) alleDa = false;
  if (farben < 12) alleBunt = false;
  zeilen.push(`${name} (gesetzt: ${gesetzt}): Zähne ${za.plaetze.length}, Zunge ${z.netz ? `${z.netz.punkte} Punkte` : 'kein Netz'}, ${ruht ? 'ruht' : 'RUHT NICHT'}, Farben im Ausschnitt ${farben}`);
}
ok('M1 auf jedem Material stehen Zähne und Zunge im Maul (Netze da und endlich, die Zunge ruht)', alleDa, zeilen.join(' | '));
ok('M2 im Bild ist im Maul etwas zu sehen (der Ausschnitt ist nicht einfarbig)', alleBunt);
ok('M3 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
if (ordner) {
  // ein Blatt mit allen Materialien
  const b = await browser.newPage({ viewport: { width: 1340, height: 700 }, deviceScaleFactor: 1 });
  await b.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f4f1ea;font:500 15px/1.2 -apple-system,Helvetica,sans-serif;color:#1f1a17}.r{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px}img{width:100%;display:block;border-radius:8px}p{margin:5px 0 2px;text-align:center}</style><div class="r">${bilder.map(([n, d]) => `<div><img src="data:image/png;base64,${d}"><p>${n}</p></div>`).join('')}</div>`);
  await b.waitForTimeout(400);
  await b.screenshot({ path: `${ordner}/ozzy-maul-material-blatt.jpg`, type: 'jpeg', quality: 84, fullPage: true });
}
await browser.close();
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
