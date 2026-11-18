// Form zuerst (07.11.2026), die Linie ist ihr Pfad: Bild für Florians Wahl „ohne Zusatzpunkte“ gegen „Punkte wo nötig“. Kugel, drei
// Loops (Ring waagerecht, Mitte, Ring senkrecht), dann die obere Kreuzung 80 hinauf (danach rechnet der Löser die ganze Haut aus den
// Kurven). Gemessen: Punkte je Loop, wie weit die Haut vorher und nachher neben der Kugel liegt (unten: neben der Kugel, wo der Zug
// nichts ändern sollte); Bild des ganzen Fensters.
// Aufruf aus apps/editor: node scripts/pruefen/form-linie-pfad-bild.mjs <ordner> [name]   (KURVEN_URL, z. B. mit ?punkte=noetig)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const name = process.argv[3] ?? 'ohne';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
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
const kugel = async () => {
  const P = await K('lagen');
  let max = 0;
  let unten = 0;
  let s = 0;
  for (let v = 0; v < P.length / 3; v++) {
    const d = Math.abs(Math.hypot(P[3 * v], P[3 * v + 1], P[3 * v + 2]) - 150);
    max = Math.max(max, d);
    s += d;
    if (P[3 * v + 1] < -40) unten = Math.max(unten, d);
  }
  return `Kugel bis ${max.toFixed(2)} (Mittel ${(s / (P.length / 3)).toFixed(2)}), unten bis ${unten.toFixed(2)}`;
};
for (const [a, A, B] of [
  ['seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  await ziehen(xy(await bild(a, { ...A, z: 0 })), xy(await bild(a, { ...B, z: 0 })), 6);
}
await seite.keyboard.press('Escape');
const L = await K('loops');
console.log(`${name}: Punkte ${L.map((l) => l.punkte.filter((p) => p.sichtbar !== false).length).join(' / ')} · angelegt: ${await kugel()}`);
const mitte = L.find((l) => l.art === 'mitte');
const oben = mitte.punkte.filter((p) => p.kreuzung !== null).reduce((b, p) => (p.ref.y > b.ref.y ? p : b));
await ziehen(xy(await bild('seite', oben.ref)), xy(await bild('seite', { ...oben.ref, y: oben.ref.y + 80 })));
await seite.keyboard.press('Escape');
await seite.waitForTimeout(500);
console.log(`${name}: obere Kreuzung 80 hinauf: ${await kugel()} · umgeklappt ${await K('umgeschlagen')}`);
await seite.screenshot({ path: `${ordner}/form-linie-pfad-${name}-2026-11-07.jpg`, type: 'jpeg', quality: 85 });
console.log(fehler.length ? `Fehler im Fenster: ${fehler.join(' | ')}` : 'keine Fehler im Fenster');
await browser.close();
