// Kanten je Punkt mit Übergang (13.11., Florian: „wenn man einzelne Punkte knickt, kann es sein, dass auf einer Linie auch ein
// Übergang zwischen zwei Punkten von hart zu rund ist […] Dargestellt ist das dann durch eine Verjüngung. Knicke sollen immer 3px
// Breite haben, Linien an runden Punkten sollen so dünn und fein wie möglich sein“).
//   1  Von der Kugel an: mit L ein Ring quer um den Körper (in der Seite senkrecht gezogen), drei Punkte darauf (Doppelklick).
//   2  Den mittleren Punkt wählen, K: Die Linie ist an ihm hart und wird zu beiden Nachbarn hin schmaler.
// Geprüft: Im Blatt „Front“ gibt es die Fläche der Kante; ihre Breite ist am Punkt rund 3 Bildpunkte und an den Nachbarn rund ½.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/form-kante-verjuengung-fenster.mjs [bild-ohne-endung]
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
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
const bild = (a, p) => K('bild', a, p);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');

// 1. ein Ring quer um den Körper, drei Punkte darauf
await seite.keyboard.press('l');
{
  const a = await bild('seite', { x: 20, y: 220, z: 0 });
  const b = await bild('seite', { x: 20, y: -220, z: 0 });
  await seite.mouse.move(a.x, a.y);
  await seite.mouse.down();
  await seite.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 6 });
  await seite.mouse.move(b.x, b.y, { steps: 6 });
  await seite.mouse.up();
  await ruhig();
}
await seite.keyboard.press('l');
let loops = await K('loops');
const ring = loops.at(-1);
const stelle = (l, f) => {
  const j = Math.round(f * (l.proben - 1));
  return { x: l.ruhe[3 * j], y: l.ruhe[3 * j + 1], z: l.ruhe[3 * j + 2] };
};
const zahlSichtbar = async () => (await K('loops')).find((l) => l.id === ring.id).punkte.filter((p) => p.sichtbar).length;
for (const f of [0.25, 0.5, 0.75, 0.62, 0.38]) {
  if ((await zahlSichtbar()) >= 3) break;
  // erst abwählen (ein Klick ins Leere), dann der Doppelklick auf die Linie
  const leer = await bild('front', { x: 0, y: 260, z: 260 });
  await seite.mouse.click(leer.x, leer.y);
  await seite.waitForTimeout(450);
  const p = await bild('front', stelle(ring, f));
  await seite.mouse.click(p.x, p.y);
  await seite.waitForTimeout(90);
  await seite.mouse.click(p.x, p.y);
  await ruhig();
}
loops = await K('loops');
const r2 = loops.find((l) => l.id === ring.id);
const sichtbar = r2.punkte.filter((p) => p.sichtbar);
ok('drei Punkte auf dem Ring', sichtbar.length === 3, `${sichtbar.length} sichtbare Punkte`);

// 2. den mittleren wählen, K
{
  const p = await bild('front', sichtbar[1]?.ref ?? sichtbar[0].ref);
  await seite.mouse.click(p.x, p.y);
  await seite.waitForTimeout(150);
  await seite.keyboard.press('k');
  await ruhig();
}
const m = await K('meldung');
// die Fläche der Kante im Blatt „Front“: ihre Breite quer zur Linie an drei Stellen (am Punkt, auf halbem Weg, am Nachbarn)
const breiten = await seite.evaluate(() => {
  const el = document.querySelector('#blatt-front .kante-band:not(.spiegel)');
  if (!el) return null;
  const skala = el.ownerSVGElement.getScreenCTM().a;
  const zahlen = el.getAttribute('d').match(/-?\d+\.?\d*/g).map(Number);
  // Umriss: erst die linke Seite (M … L …), dann nach dem Bogen die rechte zurück; die Breite an einer Stelle ist der Abstand der
  // beiden Seiten
  const d = el.getAttribute('d');
  const [links, rest] = d.split(' A ');
  const L = links.replace('M ', '').split(' L ').map((t) => t.split(' ').map(Number));
  const R = [rest.split(' L ')[0].split(' ').slice(-2).map(Number), ...d.split(' A ')[1].split(' L ').slice(1).map((t) => t.split(' ').slice(0, 2).map(Number))].reverse();
  const n = Math.min(L.length, R.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push(Math.hypot(L[i][0] - R[i][0], L[i][1] - R[i][1]) * skala);
  return { n, breit: Math.max(...out), schmal: Math.min(...out), erste: out[0], letzte: out[n - 1], zahlen: zahlen.length };
});
ok('K am Punkt: Meldung', m === 'Kante', m);
ok('die Kante ist im Blatt eine Fläche', !!breiten, breiten ? `${breiten.n} Stellen` : 'keine Fläche gefunden');
if (breiten) ok('am Knick 3 Bildpunkte breit, am runden Nachbarn ein halber', Math.abs(breiten.breit - 3) < 0.15 && breiten.schmal < 0.75, `breiteste Stelle ${z2(breiten.breit)} px, schmalste ${z2(breiten.schmal)} px`);
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | ').slice(0, 300));
if (BILD) await seite.screenshot({ path: `${BILD}.jpg`, type: 'jpeg', quality: 90 });
console.log(schlecht ? `${schlecht} Punkte nicht erfüllt` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
