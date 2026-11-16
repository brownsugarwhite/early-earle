// Ozzy, S5 im Plan „wie es weitergeht“ (16.11.2026): Lasso (L), an „strange bird“ (NAME).
// Kriterien:
//   1  Seite: L, eine Schlinge um die linke Hälfte der Form: gewählt sind genau die sichtbaren Punkte darin (wie das Verhalten sie
//      sieht), das Werk hat dieselbe Auswahl (nicht leer).
//   2  ⇧ + Schlinge um die rechte Hälfte: dazu (alle); ⌥ + Schlinge um das obere Stück: weg.
//   3  Raum, an der Wand der Seite: gewählt sind genau die Punkte in der Schlinge.
//   4  Vier Ansichten, im Feld der Front: dasselbe.
//   5  Mit dem Lasso dreht Ziehen nicht; V: zurück, ins Leere ziehen dreht wieder.
//   6  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-lasso-fenster.mjs [ordner für Bilder]
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
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-lasso-${name}.png` });
};
const ruhig = async () => {
  await s.waitForTimeout(300);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 30000 });
};
/** eine Schlinge längs eines Streckenzugs (CSS), dicht abgetastet; mitte: Bild in der Mitte des Zugs */
const schlinge = async (pfad, taste = null, mitte = null) => {
  const dicht = [];
  for (let i = 0; i + 1 < pfad.length; i++) {
    const [a, b] = [pfad[i], pfad[i + 1]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
    for (let k = 0; k < n; k++) dicht.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  dicht.push(pfad[pfad.length - 1]);
  await s.mouse.move(dicht[0][0], dicht[0][1]);
  await s.waitForTimeout(150);
  if (taste) await s.keyboard.down(taste);
  await s.mouse.down();
  for (let k = 1; k < dicht.length; k++) {
    await s.mouse.move(dicht[k][0], dicht[k][1]);
    await s.waitForTimeout(18);
    if (mitte && k === Math.floor(dicht.length * 0.7)) await bild(mitte);
  }
  await s.waitForTimeout(250);
  await s.mouse.up();
  if (taste) await s.keyboard.up(taste);
  await s.waitForTimeout(700);
};
/** sichtbare Punkte in einem Vieleck (wie das Verhalten: gerade-ungerade) */
const drin = (P, poly) =>
  P.map((p, i) => ({ ...p, i }))
    .filter((p) => p.sichtbar)
    .filter((p) => {
      let d = false;
      for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
        const [xa, ya] = poly[a];
        const [xb, yb] = poly[b];
        if (ya > p.y !== yb > p.y && p.x < ((xb - xa) * (p.y - ya)) / (yb - ya) + xa) d = !d;
      }
      return d;
    })
    .map((p) => p.i);
/** die Punkte des Werks (Kennung.Nummer) zu Punkten im Netz; und die gewählten des Werks */
const werkVon = (P, idx) => [...new Set(idx.flatMap((i) => P[i].w.slice(0, 1)))];
const werkGewaehlt = (b) => b.werkAuswahl.filter((w) => w.i >= 0).map((w) => `${w.l}.${w.i}`);
const gleichS = (a, b) => a.length === b.length && [...a].sort().every((v, k) => v === [...b].sort()[k]);
const gleich = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, k) => v === [...b].sort((x, y) => x - y)[k]);
/** Rechteck als Schlinge (im Uhrzeigersinn von oben rechts) */
const rechteck = (x0, y0, x1, y1) => [[x1, y0], [x0, y0], [x0, y1], [x1, y1], [x1, y0 + 6]];
/** eine Lücke in den Werten nahe der Mitte (für eine Schnittlinie, die keinen Punkt streift) */
const luecke = (werte) => {
  const v = [...werte].sort((a, b) => a - b);
  const m = (v[0] + v[v.length - 1]) / 2;
  let best = null;
  for (let i = 0; i + 1 < v.length; i++) {
    const g = v[i + 1] - v[i];
    if (g < 10) continue;
    const c = (v[i] + v[i + 1]) / 2;
    const w = g - Math.abs(c - m) * 0.2;
    if (!best || w > best.w) best = { c, w };
  }
  return best?.c ?? m;
};
const rand = 34;
const kasten = (P) => {
  const xs = P.map((p) => p.x);
  const ys = P.map((p) => p.y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

// 1 und 2: Seite
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
await s.keyboard.press('l');
await s.waitForTimeout(300);
{
  const P = await O('netzPunkte');
  const sicht = P.filter((p) => p.sichtbar);
  const [x0, y0, x1, y1] = kasten(sicht);
  const cut = luecke(sicht.map((p) => p.x));
  const poly1 = rechteck(x0 - rand, y0 - rand, cut, y1 + rand);
  await schlinge(poly1, null, '1-seite-im-zug');
  await bild('2-seite-gewaehlt');
  const b1 = await O('bearbeiten');
  const soll1 = drin(P, poly1);
  ok('1 Seite: genau die Punkte in der Schlinge, das Werk hat sie', soll1.length > 0 && gleich(b1.auswahl, soll1) && b1.werkAuswahl.length > 0, `soll ${soll1.length}, gewählt ${b1.auswahl.length}, im Werk ${b1.werkAuswahl.length}`);
  const poly2 = rechteck(cut, y0 - rand, x1 + rand, y1 + rand).map(([x, y]) => [x, y]);
  await schlinge(poly2, 'Shift');
  const b2 = await O('bearbeiten');
  const soll2 = [...new Set([...soll1, ...drin(P, poly2)])];
  const ycut = luecke(sicht.map((p) => p.y));
  const poly3 = rechteck(x0 - rand, y0 - rand, x1 + rand, ycut);
  await schlinge(poly3, 'Alt');
  const b3 = await O('bearbeiten');
  const weg = new Set(drin(P, poly3));
  const soll3 = soll2.filter((i) => !weg.has(i));
  ok('2 ⇧ nimmt dazu, ⌥ nimmt weg', gleich(b2.auswahl, soll2) && gleich(b3.auswahl, soll3) && soll3.length > 0 && soll3.length < soll2.length, `⇧: soll ${soll2.length}, gewählt ${b2.auswahl.length}; ⌥: soll ${soll3.length}, gewählt ${b3.auswahl.length}`);
}
// 3: Raum, Wand der Seite
await s.keyboard.press('0');
await s.waitForTimeout(1600);
await ruhig();
{
  const P = await O('netzPunkte');
  const wand = P.filter((p) => p.sichtbar && p.a === 'seite');
  const [x0, y0, x1, y1] = kasten(wand);
  const poly = rechteck(x0 - 14, y0 - 14, x1 + 14, y1 + 14);
  await schlinge(poly, null, '3-wand-im-zug');
  const b = await O('bearbeiten');
  const soll = werkVon(P, drin(P, poly));
  const ist = werkGewaehlt(b);
  ok('3 Raum, Wand der Seite: genau die Punkte in der Schlinge (im Werk; gezeigt auf allen Wänden)', soll.length > 0 && gleichS(ist, soll), `soll ${soll.length} Punkte des Werks, gewählt ${ist.length} (im Netz auf allen Flächen ${b.auswahl.length})`);
}
// 4: Vier Ansichten, Feld der Front
await s.keyboard.press('Tab');
await s.waitForTimeout(1800);
await ruhig();
{
  const P = await O('netzPunkte');
  const feld = P.filter((p) => p.sichtbar && p.a === 'front');
  const [x0, y0, x1, y1] = kasten(feld);
  const poly = rechteck(x0 - 12, y0 - 12, x1 + 12, y1 + 12);
  await schlinge(poly, null, '4-feld-im-zug');
  const b = await O('bearbeiten');
  const soll = werkVon(P, drin(P, poly));
  const ist = werkGewaehlt(b);
  ok('4 Vier Ansichten, Feld der Front: genau die Punkte in der Schlinge (im Werk)', soll.length > 0 && gleichS(ist, soll), `soll ${soll.length} Punkte des Werks, gewählt ${ist.length} (im Netz ${b.auswahl.length})`);
}
await s.keyboard.press('Tab');
await s.waitForTimeout(1800);
// 5: Lasso dreht nicht; V: Drehen wieder
{
  const v0 = await O('blick');
  await schlinge([[1300, 820], [1200, 700], [1100, 820]]);
  const v1 = await O('blick');
  await s.keyboard.press('v');
  await s.waitForTimeout(200);
  await s.mouse.move(1300, 820);
  await s.mouse.down();
  for (let k = 1; k <= 20; k++) {
    await s.mouse.move(1300 - 6 * k, 820);
    await s.waitForTimeout(20);
  }
  await s.mouse.up();
  await s.waitForTimeout(400);
  const v2 = await O('blick');
  ok('5 mit dem Lasso dreht Ziehen nicht; nach V dreht es wieder', Math.abs(v1.gier - v0.gier) < 1e-6 && Math.abs(v2.gier - v1.gier) > 0.1, `Gier ${v0.gier.toFixed(3)} → ${v1.gier.toFixed(3)} (Lasso) → ${v2.gier.toFixed(3)} (V)`);
}
ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
