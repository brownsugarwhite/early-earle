// Form zuerst (05.11.2026), Griffe an einer Kreuzung (`kurven.html`), mit der Maus, Florians Fall in der Front: Ring waagerecht und
// Ring senkrecht (in der Front der Umriss) kreuzen sich an der Seite. Den Punkt dort wählen und hart stellen (3): der andere Loop wird
// dort von selbst eine Ecke. Erwartet, in beiden Reihenfolgen der Loops:
// A. Die Kreuzung ist als Ecke ◆ zu sehen.
// B. Der sichtbare Griff (des Umrisses) seitlich gezogen knickt die Linie (vorher je nach Reihenfolge 0,5° oder 41°).
// C. Doppelklick auf die Kreuzung: beide Loops dort glatt, die Linie wieder gerade; ⌘Z bis nach der 3 bitgleich.
// Aufruf aus apps/editor: node scripts/pruefen/form-kreuzung-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
// seit G4.4 (10.11.) rechnet der Hintergrund nach Kante und Löschen: warten, bis nichts mehr rechnet und nichts ansteht
const ruhigK = () => seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 60000 });
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 12) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
    await seite.waitForTimeout(15);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(450);
};
const oben = (p) =>
  seite.evaluate(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    return e ? e.tagName : null;
  }, xy(p));
const weg = (a, b) => {
  if (a.length !== b.length) return Infinity;
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};

for (const folge of ['waagerecht zuerst', 'senkrecht zuerst']) {
  await seite.goto(basis);
  await seite.waitForFunction(() => window.__kurven !== undefined);
  await seite.waitForTimeout(400);
  const schnitte = [
    [{ x: -200, y: 0 }, { x: 200, y: 0 }],
    [{ x: 0, y: 200 }, { x: 0, y: -200 }],
  ];
  if (folge === 'senkrecht zuerst') schnitte.reverse();
  for (const [a, b] of schnitte) {
    await seite.keyboard.press('l');
    await ziehen(xy(await bild('seite', { ...a, z: 0 })), xy(await bild('seite', { ...b, z: 0 })), 6);
  }
  await seite.keyboard.press('Escape');
  await seite.waitForTimeout(450);
  const q = await bild('front', { x: 0, y: 0, z: 150 });
  await seite.mouse.click(q.x, q.y);
  await seite.waitForTimeout(450);
  await seite.keyboard.press('k');
  await ruhigK();
  await seite.waitForTimeout(450);
  const nach3 = await K('lagen');
  console.log(`${folge}: nach 3 an der Kreuzung zu sehen als ${(await oben(q)) === 'polygon' ? 'Ecke ◆' : 'glatt ●'}`);
  // B. sichtbaren Griff (am weitesten vom Punkt) seitlich ziehen
  const griffe = await seite.evaluate(() =>
    [...document.querySelectorAll('#blatt-front rect.griff')].map((e) => {
      const r = e.getBoundingClientRect();
      return { l: Number(e.getAttribute('data-l')), i: Number(e.getAttribute('data-i')), x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }),
  );
  const g = griffe.sort((u, v) => Math.hypot(v.x - q.x, v.y - q.y) - Math.hypot(u.x - q.x, u.y - q.y))[0];
  await ziehen([g.x, g.y], [g.x + 60, g.y], 12);
  console.log(`  B Griff des Umrisses 60 px nach außen: Linie am Punkt ${(await K('knickAm', g.l, g.i)).toFixed(1)}° · umgeschlagen ${await K('umgeschlagen')}`);
  const name = folge.startsWith('waag') ? 'waag' : 'senk';
  const f = (await K('felder')).front;
  await seite.screenshot({ path: `${ordner}/form-kreuzung-${name}-geknickt-2026-11-05.jpg`, type: 'jpeg', quality: 90, clip: { x: q.x - 230, y: q.y - 260, width: 360, height: 520 } });
  void f;
  // C. Doppelklick auf die Kreuzung: glatt
  await seite.mouse.click(q.x, q.y);
  await seite.waitForTimeout(60);
  await seite.mouse.click(q.x, q.y);
  await seite.waitForTimeout(600);
  const L = await K('loops');
  const ecken = L.flatMap((l) => l.punkte.filter((p) => Math.hypot(p.ref.x, p.ref.y, p.ref.z - 150) < 30).map((p) => p.ecke));
  console.log(
    `  C Doppelklick: Punkte an der Kreuzung Ecke ${JSON.stringify(ecken)} · zu sehen als ${(await oben(q)) === 'polygon' ? 'Ecke ◆' : 'glatt ●'} · ` +
      `Linie am Punkt ${(await K('knickAm', g.l, g.i)).toFixed(1)}° · Meldung ${JSON.stringify(await K('meldung'))}`,
  );
  await seite.screenshot({ path: `${ordner}/form-kreuzung-${name}-glatt-2026-11-05.jpg`, type: 'jpeg', quality: 90, clip: { x: q.x - 230, y: q.y - 260, width: 360, height: 520 } });
  for (let k = 0; k < 2; k++) {
    await seite.keyboard.press('Meta+z');
    await seite.waitForTimeout(300);
  }
  console.log(`  ⌘Z ×2: wie nach der 3 ${weg(nach3, await K('lagen')).toExponential(1)}`);
}
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler in der Konsole');
await browser.close();
