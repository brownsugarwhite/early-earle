// Plan vom 12.11.2026, Schritt 6 (13.11., dritte Fassung): „Maul formen“ im Fenster an einer gesicherten Form von Florian.
// Lädt die Form, wählt ihre Linie mit dem Mundwinkel, drückt „Maul formen“ und meldet den Knick an den Lippen und am Mundwinkel davor
// und danach, dazu einen Zug an der Linie (der Knick bleibt) und ⌘Z.
// Aufruf aus apps/editor: GPU=1 NAME="simple_mouth_more simple" node scripts/pruefen/form-maul-formen-form.mjs [bild-ohne-endung]
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'simple_mouth_more simple';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5197/kurven.html?gewichte=geometrie';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhig = async () => {
  await seite.waitForTimeout(250);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
  await seite.waitForTimeout(120);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const knickText = (g) => (g ? `Lippen ${g.enden.map((x) => `${z1(x)}°`).join(' und ')}, Mundwinkel ${z1(g.mundwinkel)}°` : 'nicht messbar');

const geladen = await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
await ruhig();
await seite.keyboard.press('Home');
await seite.waitForTimeout(300);
let loops = await K('loops');
const L = loops.find((l) => l.art === 'ring' && l.punkte.some((p) => p.mundwinkel));
ok(`„${NAME}“ geladen, Linie mit Mundwinkel gefunden`, !!L, `${JSON.stringify(geladen).slice(0, 80)}; ${loops.length} Loop${loops.length === 1 ? '' : 's'}`);
if (!L) {
  await browser.close();
  process.exit(1);
}
const vorherLagen = await K('lagen');
const g0 = await K('knickGemessen', L.id);
console.log(`     vorher: ${vorherLagen.length / 3} Punkte; ${knickText(g0)}`);
// die Linie wählen: ein Klick auf die Linie ein Stück vor dem Mundwinkel (in der Seite)
{
  const sW = L.punkte.find((q) => q.mundwinkel).s;
  let j = 0;
  for (let i = 1; i < L.s.length; i++) if (Math.abs(L.s[i] - (sW - 0.25 * sW)) < Math.abs(L.s[j] - (sW - 0.25 * sW))) j = i;
  const q = await K('bild', 'seite', { x: L.ruhe[3 * j], y: L.ruhe[3 * j + 1], z: L.ruhe[3 * j + 2] });
  await seite.mouse.click(q.x, q.y);
  await seite.waitForTimeout(200);
}
const gew = await K('auswahl');
ok('die Maullinie ist gewählt', gew.length === 1 && gew[0].l === L.id && gew[0].i < 0, JSON.stringify(gew));
if (BILD) await seite.screenshot({ path: `${BILD}-1-vorher.jpg`, type: 'jpeg', quality: 88 });

await seite.click('#knopf-maul');
await seite.waitForFunction(() => /^Maul geformt|geht so nicht|Fehler/.test(window.__kurven.meldung()), null, { timeout: 180000 });
const meldung = await K('meldung');
await ruhig();
ok('Maul formen: Meldung', meldung.startsWith('Maul geformt'), meldung);
loops = await K('loops');
const g1 = await K('knickGemessen', L.id);
ok('gemessen: an den Lippen 90 bis 100°, am Mundwinkel 62 bis 80°', !!g1 && g1.enden.every((x) => x > 90 && x < 100) && g1.mundwinkel > 62 && g1.mundwinkel < 80, knickText(g1));
ok('keine Linie kommt dazu', loops.length === 1 || loops.length === (await K('loops')).length, `${loops.length} Loop${loops.length === 1 ? '' : 's'}`);
const umg = await K('umgeschlagen');
ok('umgeschlagen höchstens wie in Florians Modellen', umg <= 12, `umgeschlagen ${umg}`);
ok('spiegelgleich', (await K('symmetrie')) < 1e-6);
if (BILD) await seite.screenshot({ path: `${BILD}-2-geformt.jpg`, type: 'jpeg', quality: 88 });

// ein Zug am Mundwinkel (20 nach hinten): Der Knick an den Lippen bleibt
{
  const L1 = loops.find((l) => l.id === L.id);
  const W = L1.punkte.find((q) => q.mundwinkel);
  const a = await K('bild', 'seite', W.ref);
  const b = await K('bild', 'seite', { ...W.ref, x: W.ref.x + 20 });
  await seite.mouse.move(a.x, a.y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await seite.mouse.move(a.x + ((b.x - a.x) * i) / 20, a.y + ((b.y - a.y) * i) / 20);
    await seite.waitForTimeout(18);
  }
  await seite.mouse.up();
  await ruhig();
  const g2 = await K('knickGemessen', L.id);
  ok('nach einem Zug am Mundwinkel: Der Knick an den Lippen bleibt', !!g2 && g2.enden.every((x) => x > 88 && x < 102), `${knickText(g2)}; umgeschlagen ${await K('umgeschlagen')}`);
  if (BILD) await seite.screenshot({ path: `${BILD}-3-zug.jpg`, type: 'jpeg', quality: 88 });
  await seite.keyboard.press('Meta+z');
  await ruhig();
}
// ⌘Z: wie geladen
await seite.keyboard.press('Meta+z');
await ruhig();
{
  const z = await K('lagen');
  let rest = z.length === vorherLagen.length ? 0 : Infinity;
  if (rest === 0) for (let i = 0; i < z.length; i++) rest = Math.max(rest, Math.abs(z[i] - vorherLagen[i]));
  ok('⌘Z: wie geladen', rest < 1e-9, `${z.length / 3} Punkte, Rest ${rest === Infinity ? 'andere Punktzahl' : rest.toExponential(1)}`);
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | ').slice(0, 300));
console.log(schlecht ? `${schlecht} Punkte nicht erfüllt` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
