// Plan vom 12.11.2026, Schritt 6, Etappe 2 (13.11. nachts): Kieferknochen am geformten Maul, im Fenster mit der Maus.
//   1  Kugel: mit F die schmale Form ums Maul, „Maul formen“. Oder NAME=<gesicherte Form>: laden, ihre Linie mit dem Mundwinkel wählen.
//   2  „Fressen“: die Pose geht an (nichts wird weggeschnitten, nichts eingesetzt); die Lippen sind vorn weiter auseinander, ihr Knick
//      bleibt, nichts schlägt zusätzlich um.
//   3  Regler „Maul“ auf 0: die Form wie in der Grundform. Auf 45: weit offen.
//   4  In der Pose an der Unterlippe ziehen (ein Zug wie sonst) und zurück mit ⌘Z.
//   5  „Fressen“ aus: die Grundform wie davor.
// Aufruf aus apps/editor: GPU=1 [NAME="simple_mouth_more simple"] [RING=<Nummer des Loops der Lippen>] node scripts/pruefen/form-kiefer-fenster.mjs [bild-ohne-endung]
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
const NAME = process.env.NAME ?? '';
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
const regler = async (id, w) => {
  await seite.evaluate(
    ([id2, v]) => {
      const el = document.getElementById(id2);
      el.dispatchEvent(new PointerEvent('pointerdown'));
      el.value = String(v);
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('change'));
    },
    [id, w],
  );
  await ruhig();
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const z2 = (x) => x.toFixed(2).replace('.', ',');
const knickText = (g) => (g ? `Knick an den Lippen ${g.enden.map((x) => `${z1(x)}°`).join(' und ')}, am Mundwinkel ${z1(g.mundwinkel)}°` : 'Knick nicht messbar');
const weit = (a, b) => {
  if (a.length !== b.length) return Infinity;
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};

// 1. die Form mit geformtem Maul
let maulId;
if (NAME) {
  await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
  await ruhig();
  await seite.keyboard.press('Home');
  await seite.waitForTimeout(300);
  const alle = await K('loops');
  const L0 = process.env.RING ? alle.find((l) => l.id === Number(process.env.RING)) : alle.find((l) => l.art === 'ring' && l.punkte.some((p) => p.mundwinkel));
  if (!L0) throw new Error(`in „${NAME}“ ist keine Linie mit einem Mundwinkel (RING=<Nummer des Loops> wählt eine)`);
  maulId = L0.id;
  // die Linie wählen: ein Klick auf sie, an einer Stelle ohne Punkt und ohne kreuzende Linie in der Nähe (mehrere Stellen versucht)
  for (const f of [0.3, 0.2, 0.4, 0.12, 0.6, 0.7, 0.85]) {
    let j = 0;
    for (let i = 1; i < L0.s.length; i++) if (Math.abs(L0.s[i] - f * L0.laenge) < Math.abs(L0.s[j] - f * L0.laenge)) j = i;
    const q = await K('bild', 'seite', { x: L0.ruhe[3 * j], y: L0.ruhe[3 * j + 1], z: L0.ruhe[3 * j + 2] });
    await seite.mouse.click(q.x, q.y);
    await seite.waitForTimeout(200);
    const g = await K('auswahl');
    if (g.length === 1 && g[0].l === maulId && g[0].i < 0) break;
    const leer = await K('bild', 'seite', { x: 0, y: 900, z: 0 });
    await seite.mouse.click(leer.x, leer.y);
    await seite.waitForTimeout(450);
  }
} else {
  await seite.keyboard.press('f');
  const n = 64;
  const pkt = [];
  for (let i = 0; i <= n; i++) pkt.push(await K('bild', 'seite', { x: -115 + 60 * Math.cos((2 * Math.PI * i) / n), y: -20 + 14 * Math.sin((2 * Math.PI * i) / n), z: 0 }));
  await seite.mouse.move(pkt[0].x, pkt[0].y);
  await seite.mouse.down();
  for (const p of pkt.slice(1)) {
    await seite.mouse.move(p.x, p.y);
    await seite.waitForTimeout(6);
  }
  await seite.mouse.up();
  await ruhig();
  maulId = (await K('loops')).at(-1).id;
  // ALT=1: ohne „Maul formen“ (die schmale Form bleibt eine weiche Linie: das Maul wie bisher, mit weggeschnittener Öffnung und
  // eingesetztem Inneren; zum Vergleich, dass sich daran nichts geändert hat)
  if (process.env.ALT !== '1') {
    await seite.click('#knopf-maul');
    await seite.waitForFunction(() => /^Maul geformt|geht so nicht|Fehler/.test(window.__kurven.meldung()), null, { timeout: 180000 });
    await ruhig();
  }
}
const gew = await K('auswahl');
ok('die Maullinie ist gewählt', gew.length === 1 && gew[0].l === maulId, JSON.stringify(gew));
const grundLagen = await K('lagen');
const loops0 = await K('loops');
const enden = (lagen, Ls) => {
  // die beiden Enden des Rings (die Lippen an der Mitte), wie sie jetzt liegen
  const l = Ls.find((x) => x.id === maulId);
  const a = [l.ruhe[0], l.ruhe[1]];
  const b = [l.ruhe[l.ruhe.length - 3], l.ruhe[l.ruhe.length - 2]];
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
};
const auf0 = enden(grundLagen, loops0);
const g0 = await K('knickGemessen', maulId);
const umg0 = await K('umgeschlagen');
console.log(`     Grundform: ${grundLagen.length / 3} Punkte; Lippen vorn ${z1(auf0)} auseinander; ${knickText(g0)}; umgeschlagen ${umg0}`);
if (BILD) await seite.screenshot({ path: `${BILD}-1-zu.jpg`, type: 'jpeg', quality: 88 });

// 2. „Fressen“
await seite.click('#knopf-pose');
await ruhig();
let p = await K('pose');
const m2 = await K('meldung');
ok('„Fressen“: die Pose ist an', p.an === true, `${m2 ? `Meldung „${m2}“; ` : ''}Unterkiefer ${p.kiefer}°, Schädel ${p.schaedel}°`);
{
  // gezeigt: am geformten Maul alle Dreiecke der Haut, am Maul bisher ohne die Öffnung
  const mz = await K('maul');
  const geschnitten = !!mz && mz.geschnitten !== false;
  const geformt = (await K('loops')).find((l) => l.id === maulId)?.geformt === true;
  ok(geformt ? 'geformtes Maul: nichts weggeschnitten' : 'Maul bisher: die Öffnung ist weggeschnitten', geformt ? !geschnitten : geschnitten, geformt ? 'geformt' : 'schmale Form');
}
{
  const Ls = await K('loops');
  const auf = enden(await K('lagen'), Ls);
  const g = await K('knickGemessen', maulId);
  const umg = await K('umgeschlagen');
  ok('die Lippen sind vorn weiter auseinander', auf > auf0 + 5, `${z1(auf0)} → ${z1(auf)}`);
  // (am Maul bisher ist die umschlossene Fläche verborgen; ihr Knick an der Lippe zählt nicht)
  if (process.env.ALT === '1') console.log(`     ${knickText(g)} (verborgene Fläche, nicht geprüft)`);
  else ok('der Knick an den Lippen bleibt', !!g && !!g0 && g.enden.every((x, i) => Math.abs(x - g0.enden[i]) < 5), knickText(g));
  ok('nichts schlägt zusätzlich um', umg <= umg0 + 2, `umgeschlagen ${umg} (Grundform ${umg0})`);
  const sym = await K('symmetrie');
  ok('spiegelgleich', sym < 1e-6, `Abweichung ${sym.toExponential(1)}`);
}
if (BILD) await seite.screenshot({ path: `${BILD}-2-offen.jpg`, type: 'jpeg', quality: 88 });

// 3. Regler „Maul“: 0 = wie die Grundform, 45 = weit offen
await regler('maul-oeffnung', 0);
ok('Regler „Maul“ auf 0: wie die Grundform', weit(await K('lagen'), grundLagen) < 1e-6, `größter Unterschied ${weit(await K('lagen'), grundLagen).toExponential(1)}`);
await regler('maul-oeffnung', 45);
{
  const Ls = await K('loops');
  const auf = enden(await K('lagen'), Ls);
  const umg = await K('umgeschlagen');
  const g = await K('knickGemessen', maulId);
  ok('Regler „Maul“ auf 45: weit offen, nichts schlägt zusätzlich um', auf > auf0 + 10 && umg <= umg0 + 4, `Lippen vorn ${z1(auf)} auseinander; umgeschlagen ${umg}; ${knickText(g)}`);
}
if (BILD) await seite.screenshot({ path: `${BILD}-3-weit.jpg`, type: 'jpeg', quality: 88 });
await regler('maul-oeffnung', 30);

// 4. in der Pose an der Unterlippe ziehen
{
  const Ls = await K('loops');
  const l = Ls.find((x) => x.id === maulId);
  const kand = l.punkte.filter((q) => q.sichtbar !== false && !q.mundwinkel && Math.abs(q.ref.z) > 1).sort((a, b) => a.ref.y - b.ref.y);
  const q = kand[0] ?? l.punkte.find((x) => x.mundwinkel);
  const a = await K('bild', 'seite', q.ref);
  const b = await K('bild', 'seite', { ...q.ref, y: q.ref.y - 15 });
  const vor = await K('lagen');
  await seite.mouse.move(a.x, a.y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await seite.mouse.move(a.x + ((b.x - a.x) * i) / 20, a.y + ((b.y - a.y) * i) / 20);
    await seite.waitForTimeout(18);
  }
  await seite.mouse.up();
  await ruhig();
  const nach = await K('lagen');
  const endlich = nach.every((x) => Number.isFinite(x));
  const g = await K('knickGemessen', maulId);
  const umg = await K('umgeschlagen');
  ok('in der Pose ziehen: die Form bleibt heil', endlich && umg <= umg0 + 6, `bewegt ${nach.length === vor.length ? z2(weit(nach, vor)) : 'andere Punktzahl'}; umgeschlagen ${umg}; ${knickText(g)}; ${(await K('pose')).blendshape.toFixed(1)} größte Verschiebung der Pose`);
  if (BILD) await seite.screenshot({ path: `${BILD}-4-zug.jpg`, type: 'jpeg', quality: 88 });
  await seite.keyboard.press('Meta+z');
  await ruhig();
}

// 5. „Fressen“ aus
await seite.click('#knopf-pose');
await ruhig();
p = await K('pose');
{
  const d = weit(await K('lagen'), grundLagen);
  ok('„Fressen“ aus: die Grundform wie davor', p.an === false && d < 1e-6, `Pose ${p.an ? 'an' : 'aus'}; größter Unterschied ${d === Infinity ? 'andere Punktzahl' : d.toExponential(1)}`);
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | ').slice(0, 300));
console.log(schlecht ? `${schlecht} Punkte nicht erfüllt` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
