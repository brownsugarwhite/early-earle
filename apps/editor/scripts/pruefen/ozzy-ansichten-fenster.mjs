// Ozzy, S4 im Plan „wie es weitergeht“ (16.11.2026): Drehen und Einrasten in jeder Ansicht, an „strange bird“ (NAME).
// Kriterien:
//   1  Raum → nahe der Seite gedreht und losgelassen: Die Seite rastet ein (genau parallel), der Maßstab bleibt (±2 %).
//   2  In der eingerasteten Seite ins Leere gezogen: Sie löst sich und dreht (die Drehung folgt der Maus); nahe der Front losgelassen:
//      die Front rastet ein.
//   3  Gegenseiten: nahe der Front von hinten und der Seite von rechts rastet es dort ein, gewendet.
//   4  Schwung: kurz angeschoben, bevor die Ansicht erreicht ist; der Schwung trägt hinein, und sie rastet ein.
//   5  Wenden (S4b): In der eingerasteten Seite ⇧ + Ziehen um gut 50°: das Blatt dreht sich, beim Loslassen gleitet es zurück (nicht
//      gewendet, die Mitte hell). ⇧ + Ziehen über die Hälfte (gut 110°): Die harte Kante ist schon im Zug über die Mitte gewandert,
//      losgelassen rastet die Seite von rechts ein (gewendet, die Mitte dunkel). ⇧ + Doppelklick wendet zurück; ⇧ + 3: die Front von hinten.
//   6  Keine Fehler in der Konsole.
//   7  Wenden in jede Richtung (Florian, 16.11. abends): ⇧ + schräg ziehen, gut 50° weit: zurück in die Seite (hell); schräg weit über die
//      Hälfte: auf die Rückseite (gewendet, dunkel).
//   8  Raum (Florian, 16.11. abends: „dass die entsprechenden projektionen auch schwarze wände haben wenn ich dahin gedreht habe“; Front
//      und Rückseite der Front getauscht): In der Hausansicht ist keine Wand dunkel. Nahe der Front von hinten (noch nicht eingerastet)
//      ist ihre Wand dunkel, eingerastet bleibt es dunkel (nichts kehrt sich um). Von unten ist die Decke dunkel, die Wand der Seite hell.
// Seit dem Tausch schaut die Front nach −x: Von Hand liegt sie bei Gier +50°, die Front von hinten bei −130°.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-ansichten-fenster.mjs [ordner für Bilder]
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
const grad = (r) => (r * 180) / Math.PI;
const z1 = (x) => x.toFixed(1).replace('.', ',');
const lage = (b) => `${b.ansicht}${b.gewendet ? ' gewendet' : ''}, flach ${z1(b.flach)}, Gier ${z1(grad(b.gier))}°, Neigung ${z1(grad(b.neigung))}°`;
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-ansichten-${name}.png` });
};
/** ins Leere ziehen (unten rechts, dort liegt nichts), Schritte mit Pause; zurück: der Blick während des Zugs (Mitte) */
const ziehe = async (dx, dy, n = 30, ms = 30, halten = 200) => {
  const x0 = 1300;
  const y0 = 820;
  await s.mouse.move(x0, y0);
  await s.waitForTimeout(120);
  await s.mouse.down();
  let mitte = null;
  for (let k = 1; k <= n; k++) {
    await s.mouse.move(x0 + (dx * k) / n, y0 + (dy * k) / n);
    await s.waitForTimeout(ms);
    if (k === Math.round(n / 2)) mitte = await O('blick');
  }
  await s.waitForTimeout(halten);
  await s.mouse.up();
  await s.waitForTimeout(1300);
  return mitte;
};
/** so ziehen, dass Gier und Neigung von Hand bei (Grad) landen */
const zu = async (gZiel, nZiel, opt = {}) => {
  const b = await O('blick');
  const px = (-((gZiel * Math.PI) / 180 - b.gier) * 520) / Math.PI;
  const py = (((nZiel * Math.PI) / 180 - b.neigung) * 520) / Math.PI;
  return ziehe(px, py, opt.n, opt.ms, opt.halten);
};
// die Kamera steht im Raum bei Gier 40°, Neigung 24°: Die Seite ist Gier von Hand −40°, Neigung −24°
const G0 = -40;
const N0 = -24;
const b0 = await O('blick');
await bild('1-raum');
await zu(G0 + 3, N0);
const b1 = await O('blick');
await bild('2-seite');
ok('1 Raum → nahe der Seite gedreht: die Seite rastet ein, der Maßstab bleibt', b1.ansicht === 'seite' && !b1.gewendet && b1.flach > 0.99 && Math.abs(b1.massstab / b0.massstab - 1) <= 0.02, `${lage(b1)}, Maßstab ${b0.massstab.toFixed(3)} → ${b1.massstab.toFixed(3)}`);
const m2 = await zu(G0 + 90 - 2, N0);
const b2 = await O('blick');
await bild('3-front');
ok('2 aus der Seite heraus gedreht (im Zug gelöst, die Drehung folgt), nahe der Front: die Front rastet ein', !!m2 && m2.ansicht === 'raum' && Math.abs(grad(m2.gier) - G0) > 20 && b2.ansicht === 'front' && !b2.gewendet && b2.flach > 0.99, `im Zug ${m2 ? lage(m2) : '–'}; danach ${lage(b2)}`);
await zu(G0 - 90 + 3, N0 + 2);
const b3a = await O('blick');
await bild('4-front-hinten');
await zu(G0 + 180 + 2, N0);
const b3b = await O('blick');
await bild('5-seite-rechts');
ok('3 Gegenseiten: Front von hinten und Seite von rechts rasten gewendet ein', b3a.ansicht === 'front' && b3a.gewendet && b3a.flach > 0.99 && b3b.ansicht === 'seite' && b3b.gewendet && b3b.flach > 0.99, `${lage(b3a)}; ${lage(b3b)}`);
// Schwung: aus der Seite von rechts kurz Richtung Seite (links) anschieben, nur 60 % des Wegs gezogen, schnell
{
  await zu(G0 + 180 - 60, N0);
  const b = await O('blick');
  const rest = ((G0 + 90) * Math.PI) / 180 - b.gier;
  const px = (-(rest * 0.55) * 520) / Math.PI;
  await ziehe(px, 0, 6, 16, 0);
  const b4 = await O('blick');
  ok('4 Schwung: kurz angeschoben, die Front rastet ein', b4.ansicht === 'front' && !b4.gewendet && b4.flach > 0.99, `vor dem Anschieben ${lage(b)}; danach ${lage(b4)}`);
}
// 5 Wenden mit ⇧ (in der Seite)
{
  await s.keyboard.press('1');
  await s.waitForTimeout(1400);
  const wende = async (dx, n = 25) => {
    await s.mouse.move(700, 820);
    await s.keyboard.down('Shift');
    await s.mouse.down();
    let mitte = null;
    for (let k = 1; k <= n; k++) {
      await s.mouse.move(700 + (dx * k) / n, 820);
      await s.waitForTimeout(30);
      if (k === n) {
        await s.waitForTimeout(350);
        mitte = await O('blick');
        if (Math.abs(dx) > 200) await bild('6-wenden-im-zug');
      }
    }
    await s.mouse.up();
    await s.keyboard.up('Shift');
    await s.waitForTimeout(1500);
    return mitte;
  };
  const w1 = await wende(150);
  const a1 = await O('blick');
  const w2 = await wende(330);
  const a2 = await O('blick');
  await bild('7-gewendet');
  // ⇧ + Doppelklick: zurück
  await s.keyboard.down('Shift');
  await s.mouse.dblclick(700, 820);
  await s.keyboard.up('Shift');
  await s.waitForTimeout(1500);
  const a3 = await O('blick');
  await s.keyboard.press('Shift+Digit3');
  await s.waitForTimeout(1500);
  const a4 = await O('blick');
  await bild('8-front-hinten');
  ok(
    '5 Wenden: halb gedreht gleitet zurück; über die Hälfte rastet die Gegenseite schwarz ein; ⇧ + Doppelklick zurück; ⇧ + 3 Front von hinten',
    !!w1 && w1.wendet && a1.ansicht === 'seite' && !a1.gewendet && a1.schwarz < 0.01 && !!w2 && w2.rueckseite && w2.schwarz > 0.5 && a2.ansicht === 'seite' && a2.gewendet && a2.schwarz > 0.99 && !a3.gewendet && a3.schwarz < 0.01 && a4.ansicht === 'front' && a4.gewendet && a4.schwarz > 0.99,
    `halb: im Zug Gier ${z1(grad(w1?.gier ?? 0))}°, danach ${lage(a1)}, Schwarz ${z1(a1.schwarz)}; über die Hälfte: im Zug Rückseite ${w2?.rueckseite}, Schwarz ${z1(w2?.schwarz ?? 0)}, danach ${lage(a2)}, Schwarz ${z1(a2.schwarz)}; ⇧ + Doppelklick: ${lage(a3)}; ⇧ + 3: ${lage(a4)}`,
  );
}
// 7 Wenden in jede Richtung
{
  await s.keyboard.press('1');
  await s.waitForTimeout(1500);
  const schraeg = async (dx, dy, name) => {
    await s.mouse.move(700, 600);
    await s.keyboard.down('Shift');
    await s.mouse.down();
    for (let k = 1; k <= 25; k++) {
      await s.mouse.move(700 + (dx * k) / 25, 600 + (dy * k) / 25);
      await s.waitForTimeout(30);
    }
    await s.waitForTimeout(350);
    const im = await O('blick');
    if (name) await bild(name);
    await s.mouse.up();
    await s.keyboard.up('Shift');
    await s.waitForTimeout(1500);
    return { im, da: await O('blick') };
  };
  const k1 = await schraeg(150, 100, '9-schraeg-halb');
  const k2 = await schraeg(400, -120, '10-schraeg-weit');
  ok('7 ⇧ + schräg ziehen: bis zur Hälfte zurück, weit darüber auf die Rückseite', k1.da.ansicht === 'seite' && !k1.da.gewendet && k1.da.schwarz < 0.01 && k2.im.rueckseite && k2.da.ansicht === 'seite' && k2.da.gewendet && k2.da.schwarz > 0.99, `schräg halb: im Zug Gier ${z1(grad(k1.im.gier))}°, Neigung ${z1(grad(k1.im.neigung))}°, danach ${lage(k1.da)}, dunkel ${z1(k1.da.schwarz)}; schräg weit: im Zug Rückseite ${k2.im.rueckseite}, danach ${lage(k2.da)}, dunkel ${z1(k2.da.schwarz)}`);
}
// 8 Raum: Wände der Projektionen von hinten dunkel, beim Einrasten bleibt die Farbe
{
  await s.keyboard.press('0');
  await s.waitForTimeout(1600);
  const h0 = await O('blick');
  await bild('11-raum-haus');
  await zu(G0 - 90 + 14, N0 + 8);
  const v = await O('blick');
  const wx = await O('wandMitte', 0);
  const dx = await O('dunkelBei', wx.x, wx.y);
  await bild('12-raum-vor-front-hinten');
  await zu(G0 - 90 + 2, N0);
  const e = await O('blick');
  await s.keyboard.press('0');
  await s.waitForTimeout(1600);
  await zu(0, -100);
  const u = await O('blick');
  const wy = await O('wandMitte', 1);
  const wz = await O('wandMitte', 2);
  const dy = await O('dunkelBei', wy.x, wy.y);
  const dz = await O('dunkelBei', wz.x, wz.y);
  await bild('13-raum-unten');
  ok(
    '8 Raum: Hausansicht ohne dunkle Wand; vor der Front von hinten ihre Wand dunkel, eingerastet bleibt es dunkel; von unten die Decke dunkel, die Seite hell',
    h0.ansicht === 'raum' && h0.hinten === 0 && v.ansicht === 'raum' && dx > 0.99 && e.ansicht === 'front' && e.gewendet && e.schwarz > 0.99 && u.ansicht === 'raum' && dy > 0.99 && dz < 0.01,
    `Hausansicht: dunkle Flächen ${h0.hinten}; vor der Front von hinten: ${lage(v)}, Wand der Front dunkel ${z1(dx)}, Mitte ${z1(v.schwarz)}; eingerastet ${lage(e)}, dunkel ${z1(e.schwarz)}; von unten: Decke ${z1(dy)}, Wand der Seite ${z1(dz)}`,
  );
}
ok('6 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
