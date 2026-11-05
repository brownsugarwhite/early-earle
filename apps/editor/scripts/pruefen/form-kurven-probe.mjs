// Form zuerst (05.11.2026), Schritt 1 „Nur Loops“ (`kurven.html`), mit der Maus aus der Kugel ohne Loops:
// 1. L in Seite (quer), Front (waagerecht) und Top (Mitte): drei Loops, ihre Kreuzungen werden Punkte.
// 2. Im Top die Kreuzung vorn-mitte nach innen: von oben schmaler, Höhe und Länge bleiben.
// 3. F: eine Form ums Auge zeichnen; Doppelklick setzt einen Punkt, ⌫ löscht ihn.
// 4. Die Form als Ganzes: S (größer), R (drehen), G (verschieben).
// 5. O an: die obere Kreuzung in der Seite hochziehen, Nachbarn gehen mit; ⌘Z bis zum Anfang, bitgleich.
// Nach jedem Schritt: Bild, Loops/Punkte, Maße, Zeiten, umgeklappte Dreiecke, Spiegelgleichheit.
// Aufruf aus apps/editor: node scripts/pruefen/form-kurven-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
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

const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const loops = () => K('loops');
const lagen = () => K('lagen');
const bild = (a, p) => K('bild', a, p);
const foto = (name) => seite.screenshot({ path: `${ordner}/form-loops-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 86 });
const xy = (p) => [p.x, p.y];
// (nur vergleichbar, solange das Netz nicht verdichtet wurde; sonst zählt `umgeschlagen` aus dem Fenster)
const umgeklappt = (vorher) =>
  seite.evaluate((v) => {
    const p = window.__kurven.lagen();
    const t = window.__kurven.dreiecke();
    if (p.length !== v.length) return 'n. v.';
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
const weg = (a, b) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};
const ziehen = async ([x, y], [x2, y2], schritte = 12) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / schritte, y + ((y2 - y) * i) / schritte);
    await seite.waitForTimeout(15);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(200);
};
const zeitenText = async () => {
  const z = await K('zeiten');
  const zug = z.zug.slice(-12);
  const m = zug.reduce((s, v) => s + v, 0) / Math.max(1, zug.length);
  return `je Mausbewegung ${m.toFixed(1)} ms (max ${Math.max(0, ...zug).toFixed(1)}), zerlegen ${z.zerlegen} ms, Bereich ${z.bereich}`;
};
const ueberblick = async () => {
  const L = await loops();
  const kreuz = new Set(L.flatMap((l) => l.punkte.filter((p) => p.kreuzung !== null).map((p) => p.kreuzung)));
  return `${L.length} Loops (${L.map((l) => `${l.art} ${l.punkte.length} P`).join(', ')}), ${kreuz.size} Kreuzungen`;
};

// 0. Start: Kugel ohne Loops
console.log('0 Start:', await ueberblick(), '· Maße', JSON.stringify(await K('masse')));
await foto('start');
const pos0 = await lagen();

// 1. drei Loops
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 0, y: 200, z: 0 })), xy(await bild('seite', { x: 0, y: -200, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('front', { x: 0, y: 0, z: -200 })), xy(await bild('front', { x: 0, y: 0, z: 200 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
console.log('1 drei Loops:', await ueberblick(), '· Haut bewegt', weg(pos0, await lagen()));
await foto('drei-loops');

// 2. Kreuzung vorn-mitte (z ≈ 150) im Top nach innen auf 100
let L = await loops();
const vorn = L.flatMap((l) => l.punkte).find((p) => p.kreuzung !== null && p.ref.z > 100);
const pos1 = await lagen();
await ziehen(xy(await bild('top', vorn.ref)), xy(await bild('top', { ...vorn.ref, z: 100 })));
console.log(
  '2 schmaler:',
  await zeitenText(),
  '· Maße',
  JSON.stringify(await K('masse')),
  '· schief',
  (await K('symmetrie')).toExponential(1),
  '· umgeklappt',
  await umgeklappt(pos1),
);
await foto('schmaler');

// 3. Form ums Auge (Seite), Punkt setzen und löschen
await seite.keyboard.press('f');
const kreisPunkte = [];
for (let i = 0; i <= 48; i++) kreisPunkte.push(await bild('seite', { x: -60 + 32 * Math.cos((2 * Math.PI * i) / 48), y: 45 + 32 * Math.sin((2 * Math.PI * i) / 48), z: 0 }));
await seite.mouse.move(kreisPunkte[0].x, kreisPunkte[0].y);
await seite.mouse.down();
for (const p of kreisPunkte.slice(1)) {
  await seite.mouse.move(p.x, p.y);
  await seite.waitForTimeout(8);
}
await seite.mouse.up();
await seite.waitForTimeout(300);
L = await loops();
const auge = L[L.length - 1];
console.log('3 Form:', await ueberblick(), '· Meldung', JSON.stringify(await K('meldung')));
await foto('form');
// Doppelklick zwischen zwei Punkten
const sMitte = (auge.punkte[0].s + auge.punkte[1].s) / 2;
const j = auge.ruhe.length / 3;
let bestJ = 0;
let ss = 0;
for (let k = 1; k < j; k++) {
  ss += Math.hypot(auge.ruhe[3 * k] - auge.ruhe[3 * k - 3], auge.ruhe[3 * k + 1] - auge.ruhe[3 * k - 2], auge.ruhe[3 * k + 2] - auge.ruhe[3 * k - 1]);
  if (Math.abs(ss - sMitte) < Math.abs(0)) bestJ = k;
  if (ss <= sMitte) bestJ = k;
}
const pDoppel = await bild('seite', { x: auge.ruhe[3 * bestJ], y: auge.ruhe[3 * bestJ + 1], z: auge.ruhe[3 * bestJ + 2] });
const vorPunkt = await lagen();
await seite.mouse.dblclick(pDoppel.x, pDoppel.y);
await seite.waitForTimeout(200);
const nachEinfuegen = (await loops()).find((l) => l.id === auge.id).punkte.length;
await seite.keyboard.press('Backspace');
await seite.waitForTimeout(200);
const nachLoeschen = (await loops()).find((l) => l.id === auge.id).punkte.length;
console.log('   Punkte', auge.punkte.length, '→ Doppelklick', nachEinfuegen, '→ ⌫', nachLoeschen, '· Haut bewegt', weg(vorPunkt, await lagen()));

// 4. Form als Ganzes: anklicken (Linie), S ×1,3, R 30° (mit `O_FORM=<Radius>` mit Einflusskreis)
const mitteAuge = { x: -60, y: 45 };
await seite.mouse.click(pDoppel.x, pDoppel.y);
await seite.waitForTimeout(150);
if (process.env.O_FORM) {
  await seite.keyboard.press('o');
  await K('setzeRadius', Number(process.env.O_FORM));
}
const cAuge = await bild('seite', { ...mitteAuge, z: 0 });
const pos4 = await lagen();
await seite.mouse.move(pDoppel.x, pDoppel.y);
await seite.keyboard.press('s');
for (let i = 1; i <= 8; i++) {
  await seite.mouse.move(cAuge.x + (pDoppel.x - cAuge.x) * (1 + (0.3 * i) / 8), cAuge.y + (pDoppel.y - cAuge.y) * (1 + (0.3 * i) / 8));
  await seite.waitForTimeout(15);
}
await seite.mouse.down();
await seite.mouse.up();
await seite.waitForTimeout(200);
console.log('4 S ×1,3:', await zeitenText(), '· umgeklappt', await umgeklappt(pos4), '· umgeschlagen', await K('umgeschlagen'), '· Punkte', (await K('zeiten')).punkte, '· schief', (await K('symmetrie')).toExponential(1));
const winkel = Math.PI / 6;
const dx = pDoppel.x - cAuge.x;
const dy = pDoppel.y - cAuge.y;
await seite.mouse.move(pDoppel.x, pDoppel.y);
await seite.keyboard.press('r');
for (let i = 1; i <= 8; i++) {
  const w = (winkel * i) / 8;
  await seite.mouse.move(cAuge.x + dx * Math.cos(w) - dy * Math.sin(w), cAuge.y + dx * Math.sin(w) + dy * Math.cos(w));
  await seite.waitForTimeout(15);
}
await seite.keyboard.press('Enter');
await seite.waitForTimeout(200);
console.log('  R 30°:', await zeitenText(), '· umgeklappt', await umgeklappt(pos4), '· umgeschlagen', await K('umgeschlagen'), '· Punkte', (await K('zeiten')).punkte);
await foto(process.env.O_FORM ? 'form-ganz-o' : 'form-ganz');

// 5. O an (Radius 80): obere Kreuzung in der Seite 40 hoch
await seite.keyboard.press('Escape');
if (!process.env.O_FORM) await seite.keyboard.press('o');
await K('setzeRadius', 80);
L = await loops();
const oben = L.flatMap((l) => l.punkte).find((p) => p.kreuzung !== null && p.ref.y > 100 && Math.abs(p.ref.z) < 1);
const pos5 = await lagen();
await ziehen(xy(await bild('seite', oben.ref)), xy(await bild('seite', { ...oben.ref, y: oben.ref.y + 40 })));
console.log(
  '5 O hoch:',
  await zeitenText(),
  '· Maße',
  JSON.stringify(await K('masse')),
  '· umgeklappt',
  await umgeklappt(pos5),
  '· schief',
  (await K('symmetrie')).toExponential(1),
);
await foto('o-kreis');

// ⌘Z bis zum Anfang
for (let i = 0; i < 12; i++) await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(200);
console.log('⌘Z bis zum Anfang:', await ueberblick(), '· Abweichung zur Startkugel', weg(pos0, await lagen()));
console.log('Fehler im Fenster:', fehler.length ? fehler : 'keine');
await browser.close();
