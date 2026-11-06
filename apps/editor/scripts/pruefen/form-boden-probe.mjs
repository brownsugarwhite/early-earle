// Form zuerst (05.11.2026), Florians Boden (`kurven.html`), mit der Maus: Ring unten (hart), Ring senkrecht, Mitte; den Mittelpunkt
// unten auf die Höhe des Rings ziehen, dann an den Ecken (Kreuzungen mit dem Ring) den Griff zur Mitte hin waagerecht (Arme gerade).
// Mit `?kruemmung=0` behält jeder Punkt die Krümmung beim Anfassen (vorher: Höcker), sonst folgt sie den Loops (flach).
// Aufruf aus apps/editor: node scripts/pruefen/form-boden-probe.mjs <ordner>   (KURVEN_URL, TAG für die Bildnamen)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html');
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 14) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
    await seite.waitForTimeout(15);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(450);
};
const Y0 = -105;
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -200, y: Y0, z: 0 })), xy(await bild('seite', { x: 200, y: Y0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 0, y: 200, z: 0 })), xy(await bild('seite', { x: 0, y: -200, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('Escape');
let L = await K('loops');
const unten = L.find((l) => l.art === 'ring' && Math.abs(l.punkte[0].ref.y - Y0) < 3);
{
  const p = await bild('front', { x: 0, y: Y0, z: 70 });
  await seite.mouse.click(p.x, p.y);
  await seite.waitForTimeout(200);
  await seite.keyboard.press('k');
  await seite.waitForTimeout(200);
  await seite.keyboard.press('Escape');
  await seite.waitForTimeout(450);
}
L = await K('loops');
const mitte = L.find((l) => l.art === 'mitte');
const pu = mitte.punkte.reduce((b, q) => (q.ref.y < b.ref.y ? q : b));
await ziehen(xy(await bild('seite', pu.ref)), xy(await bild('seite', { ...pu.ref, y: Y0 })), 16);
await seite.keyboard.press('Escape');
await seite.waitForTimeout(450);

// Ecken: Punkte der Loops 2 und 3 auf der Höhe des Rings; je Ecke den Griff, dessen Spitze unter der Ebene liegt, waagerecht ziehen
const ansichtFuer = (p) => (Math.abs(p.z) > 50 ? 'front' : 'seite');
L = await K('loops');
for (const l of L) {
  if (l.id === unten.id) continue;
  for (let i = 0; i < l.punkte.length; i++) {
    const p = l.punkte[i];
    if (Math.abs(p.ref.y - Y0) > 2 || Math.hypot(p.ref.x, p.ref.z) < 50 || p.ref.z < -1) continue;
    const a = ansichtFuer(p.ref);
    // Punkt wählen (Klick, dann warten: kein Doppelklick)
    await seite.mouse.click(...xy(await bild(a, p.ref)));
    await seite.waitForTimeout(450);
    const g = await seite.evaluate(
      ([a2, id, i2]) =>
        [...document.querySelectorAll(`#blatt-${a2} rect.griff[data-l="${id}"][data-i="${i2}"]`)].map((e) => {
          const r = e.getBoundingClientRect();
          return { g: e.getAttribute('data-g'), x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }),
      [a, l.id, i],
    );
    const pp = await bild(a, p.ref);
    // der Griff zur Mitte: seine Spitze liegt unter dem Punkt (größeres y im Bild)
    const unter = g.filter((q) => q.y > pp.y + 2).sort((q1, q2) => q2.y - q1.y)[0];
    if (!unter) {
      console.log(`Ecke ${l.id}:${i} (${a}): kein Griff unter der Ebene`, JSON.stringify(g));
      continue;
    }
    await ziehen([unter.x, unter.y], [unter.x, pp.y], 10);
    await seite.waitForTimeout(450);
  }
}
await seite.keyboard.press('Escape');
await seite.waitForTimeout(300);
const messen = async () =>
  seite.evaluate((y0) => {
    const P = window.__kurven.lagen();
    let tief = 0;
    let n = 0;
    for (let v = 0; v < P.length / 3; v++) {
      const y = P[3 * v + 1];
      if (y < y0 - 0.05) n++;
      tief = Math.max(tief, y0 - y);
    }
    return { tief, n };
  }, Y0);
const m = await messen();
console.log(`Boden: tiefster Punkt ${m.tief.toFixed(2)} unter der Ebene, ${m.n} Punkte darunter · umgeschlagen ${await K('umgeschlagen')}`);
for (const l of await K('loops')) {
  if (l.id === unten.id) continue;
  let t = 0;
  for (let j = 0; j < l.ruhe.length / 3; j++) t = Math.max(t, Y0 - l.ruhe[3 * j + 1]);
  console.log(`  Loop ${l.id} (${l.art}): tiefste Probe ${t.toFixed(2)} unter der Ebene`);
}
const tag = process.env.TAG ?? 'x';
const f = (await K('felder')).front;
await seite.screenshot({ path: `${ordner}/form-boden-${tag}-front-2026-11-05.jpg`, type: 'jpeg', quality: 90, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
const d = (await K('felder')).drei;
await K('kamera', { x: 260, y: -420, z: 300 }, { x: 0, y: -100, z: 0 });
await seite.waitForTimeout(300);
await seite.screenshot({ path: `${ordner}/form-boden-${tag}-3d-2026-11-05.jpg`, type: 'jpeg', quality: 90, clip: { x: d.x, y: d.y + d.h * 0.1, width: d.w, height: d.h * 0.85 } });
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler');
await browser.close();
