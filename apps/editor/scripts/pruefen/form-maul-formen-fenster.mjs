// Plan vom 12.11.2026, Schritt 6 (13.11., dritte Fassung: die Maullinie trägt ihren Knick selbst): der Knopf „Maul formen“ im
// Fenster, mit der Maus.
//   1  Von der Kugel an: mit F die schmale Form ums Maul (Seite, vorn über den Umriss); sie ist danach gewählt.
//   2  „Maul formen“: Die Linie wird eine Kante und gibt ihren Knick vor (95° an den Lippen, 70° am Mundwinkel). Keine Linie und kein
//      Punkt im Maul kommen dazu. Das Fenster zeigt das Formen in Schritten (nicht als Sprung). Geprüft: Zwischenbilder, Meldung,
//      Zahl der Loops, die Angaben, der gemessene Knick, die Kugel hinter dem Maul, spiegelgleich, keine Fehler in der Konsole.
//   3  „Fressen“ an der geformten Linie: eine Meldung statt der alten Anzeige-Fassung.
//   4  An der Unterlippe ziehen (ein gewöhnlicher Zug): Der Knick an den Lippen bleibt (jede Rechnung des Fensters hält ihn).
//   5  K an der gewählten Maullinie: rund (die Linie gibt keinen Knick mehr vor); zurück mit ⌘Z.
//   6  ⌘Z: die Form wie vor dem Formen.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs [bild-ohne-endung]
//   KURVEN_URL (Standard http://localhost:5197/kurven.html?gewichte=geometrie)
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
const z1 = (x) => x.toFixed(1).replace('.', ',');
const z2 = (x) => x.toFixed(2).replace('.', ',');
const kurz = (L) => L.map((l) => `${l.id}:${l.art}${l.kante ? ' Kante' : ''}/${l.punkte.filter((p) => p.sichtbar).length}`).join(' ');

// 1. die schmale Form ums Maul
await seite.keyboard.press('f');
{
  const n = 64;
  const pkt = [];
  for (let i = 0; i <= n; i++) pkt.push(await bild('seite', { x: -115 + 60 * Math.cos((2 * Math.PI * i) / n), y: -20 + 14 * Math.sin((2 * Math.PI * i) / n), z: 0 }));
  await seite.mouse.move(pkt[0].x, pkt[0].y);
  await seite.mouse.down();
  for (const p of pkt.slice(1)) {
    await seite.mouse.move(p.x, p.y);
    await seite.waitForTimeout(6);
  }
  await seite.mouse.up();
  await ruhig();
}
const vorher = { lagen: await K('lagen'), loops: await K('loops') };
console.log(`vor dem Formen: ${vorher.lagen.length / 3} Punkte, Loops ${kurz(vorher.loops)} (Art/sichtbare Punkte)`);
const maulId = vorher.loops.at(-1).id;
if (BILD) await seite.screenshot({ path: `${BILD}-1-vorher.jpg`, type: 'jpeg', quality: 88 });

// 2. Maul formen: Das Fenster zeigt die Schritte. Gezählt wird im Fenster, je Bild, ob sich die Haut gegen das Bild davor bewegt hat.
const filmP = seite.evaluate(
  () =>
    new Promise((fertig) => {
      let bilder = 0;
      let bewegt = 0;
      let letzte = '';
      const t0 = performance.now();
      const schauen = () => {
        const L = window.__kurven.lagen();
        let s = 0;
        for (let i = 0; i < L.length; i += 7) s += L[i] * (1 + (i % 13));
        const jetzt = `${L.length}:${s.toFixed(3)}`;
        bilder++;
        if (jetzt !== letzte) bewegt++;
        letzte = jetzt;
        if (/^Maul geformt|geht so nicht|Fehler/.test(window.__kurven.meldung()) || performance.now() - t0 > 120000) fertig({ bilder, bewegt, ms: performance.now() - t0 });
        else requestAnimationFrame(schauen);
      };
      requestAnimationFrame(schauen);
    }),
);
await seite.click('#knopf-maul');
if (BILD) {
  // zwei Bilder aus dem Lauf
  await seite.waitForTimeout(350);
  await seite.screenshot({ path: `${BILD}-2a-unterwegs.jpg`, type: 'jpeg', quality: 88 });
  await seite.waitForTimeout(500);
  await seite.screenshot({ path: `${BILD}-2b-unterwegs.jpg`, type: 'jpeg', quality: 88 });
}
const film = await filmP;
const meldung = await K('meldung');
await ruhig();
const nach = { lagen: await K('lagen'), loops: await K('loops') };
ok('Maul formen: Meldung', meldung.startsWith('Maul geformt'), meldung);
ok('animiert: Das Fenster zeigt das Formen in Schritten', film.bewegt >= 20, `${film.bewegt} von ${film.bilder} Bildern mit Bewegung in ${z1(film.ms / 1000)} s`);
console.log(`     nach dem Formen: ${nach.lagen.length / 3} Punkte, Loops ${kurz(nach.loops)}`);
const L = nach.loops.find((l) => l.id === maulId);
ok('die Maullinie ist eine Kante', L?.kante === true);
ok('keine Linie kommt dazu, kein Punkt im Maul', nach.loops.length === vorher.loops.length, `${nach.loops.length} Loop${nach.loops.length === 1 ? '' : 's'}`);
{
  const W = L?.punkte.find((p) => p.mundwinkel);
  const angaben = L ? [L.punkte[0].knick, W?.knick, L.punkte.at(-1).knick] : [];
  ok('die Angaben: 95° an beiden Lippen, 70° am Mundwinkel', angaben.length === 3 && Math.abs(angaben[0] - 95) < 1e-6 && Math.abs(angaben[1] - 70) < 1e-6 && Math.abs(angaben[2] - 95) < 1e-6, angaben.map((x) => (x === null || x === undefined ? '–' : `${z1(x)}°`)).join(', '));
}
const gemessen = await K('knickGemessen', maulId);
ok('gemessen: an den Lippen 90 bis 100°, am Mundwinkel 62 bis 80°', !!gemessen && gemessen.enden.every((x) => x > 90 && x < 100) && gemessen.mundwinkel > 62 && gemessen.mundwinkel < 80, gemessen ? `${gemessen.enden.map((x) => `${z1(x)}°`).join(' und ')}; Mundwinkel ${z1(gemessen.mundwinkel)}°` : 'nicht messbar');
{
  const k0 = L ? [await K('knickAm', L.id, 0), await K('knickAm', L.id, L.punkte.length - 1)] : [];
  ok('die Lippenlinie läuft an der Mitte rund durch', k0.length === 2 && k0.every((x) => !(x > 0.5)), k0.map((x) => `${z1(x || 0)}°`).join(' und '));
}
const umg = await K('umgeschlagen');
ok('umgeschlagen höchstens wie in Florians Modellen', umg <= 12, `umgeschlagen ${umg}`);
ok('spiegelgleich', (await K('symmetrie')) < 1e-6, `Abweichung ${(await K('symmetrie')).toExponential(1)}`);
{
  // hinter dem Maul bleibt die Kugel eine Kugel (Halbmesser 150): keine Mittellinie, keine Zitrone
  let weit = 0;
  for (let i = 0; i < nach.lagen.length; i += 3) {
    if (nach.lagen[i] < -40) continue;
    weit = Math.max(weit, Math.abs(Math.hypot(nach.lagen[i], nach.lagen[i + 1], nach.lagen[i + 2]) - 150));
  }
  ok('hinter dem Maul bleibt die Kugel', weit < 8, `größte Abweichung von der Kugel ${z2(weit)}`);
}
if (BILD) await seite.screenshot({ path: `${BILD}-3-geformt.jpg`, type: 'jpeg', quality: 88 });

// 3. „Fressen“ an der geformten Linie (sie ist nach dem Formen gewählt): Meldung
await seite.click('#knopf-pose');
await seite.waitForTimeout(300);
const m4 = await K('meldung');
ok('„Fressen“ am geformten Maul: Meldung statt der alten Anzeige', /geformt/.test(m4) && !(await K('pose')).an, m4);

// 4. ein gewöhnlicher Zug an der Unterlippe
{
  const p = [...L.punkte].filter((q) => !q.mundwinkel && q.sichtbar !== false && Math.abs(q.ref.z) > 1).sort((a, b) => a.ref.y - b.ref.y)[0];
  const a = await bild('seite', p.ref);
  const b = await bild('seite', { ...p.ref, y: p.ref.y - 25 });
  await seite.mouse.move(a.x, a.y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (let i = 1; i <= 25; i++) {
    await seite.mouse.move(a.x + ((b.x - a.x) * i) / 25, a.y + ((b.y - a.y) * i) / 25);
    await seite.waitForTimeout(18);
  }
  await seite.mouse.up();
  await ruhig();
  const u = await K('umgeschlagen');
  ok('an der Unterlippe ziehen: umgeschlagen höchstens wie davor', u <= Math.max(umg, 12), `umgeschlagen ${u}; ${(await K('lagen')).length / 3} Punkte`);
  const g2 = await K('knickGemessen', maulId);
  ok('nach dem Zug: Der Knick an den Lippen bleibt', !!g2 && g2.enden.every((x) => x > 88 && x < 102), g2 ? `${g2.enden.map((x) => `${z1(x)}°`).join(' und ')}; Mundwinkel ${z1(g2.mundwinkel)}°` : 'nicht messbar');
  if (BILD) await seite.screenshot({ path: `${BILD}-4-lippe.jpg`, type: 'jpeg', quality: 88 });
  await seite.keyboard.press('Meta+z');
  await ruhig();
}

// 5. K an der Maullinie: rund; ⌘Z zurück
{
  const t = await bild('seite', L.punkte.find((q) => q.mundwinkel).ref);
  // die Maullinie wählen: ein Klick neben ihren Mundwinkel auf die Linie (ein Stück Richtung Oberlippe)
  const sW = L.punkte.find((q) => q.mundwinkel).s;
  let j = 0;
  for (let i = 1; i < L.s.length; i++) if (Math.abs(L.s[i] - (sW - 40)) < Math.abs(L.s[j] - (sW - 40))) j = i;
  const q = await bild('seite', { x: L.ruhe[3 * j], y: L.ruhe[3 * j + 1], z: L.ruhe[3 * j + 2] });
  await seite.mouse.click(q.x, q.y);
  await seite.waitForTimeout(150);
  const gew = await K('auswahl');
  if (gew.length === 1 && gew[0].l === maulId && gew[0].i < 0) {
    await seite.keyboard.press('k');
    await ruhig();
    const Ls = await K('loops');
    const L2 = Ls.find((l) => l.id === maulId);
    const g3 = await K('knickGemessen', maulId);
    const lagen3 = await K('lagen');
    const endlich = lagen3.every((x) => Number.isFinite(x));
    const mk = await K('meldung');
    ok('K an der Maullinie: rund (keine Kante, kein vorgegebener Knick), die Form bleibt heil', L2?.kante !== true && L2.punkte.every((q) => q.knick === null) && endlich && (await K('umgeschlagen')) <= Math.max(umg, 12), `Meldung „${mk}“; Knick an den Lippen jetzt ${g3 ? g3.enden.map((x) => `${z1(x)}°`).join(' und ') : '–'}; umgeschlagen ${await K('umgeschlagen')}`);
    if (BILD) await seite.screenshot({ path: `${BILD}-5-k.jpg`, type: 'jpeg', quality: 88 });
    await seite.keyboard.press('Meta+z');
    await ruhig();
  } else ok('K an der Maullinie: die Linie wählen', false, `gewählt ${JSON.stringify(gew)} (Klick bei ${z1(q.x)}, ${z1(q.y)}; Mundwinkel bei ${z1(t.x)}, ${z1(t.y)})`);
}

// 6. ⌘Z bis vor das Formen
for (let i = 0; i < 6 && (await K('loops')).find((l) => l.id === maulId)?.kante === true; i++) {
  await seite.keyboard.press('Meta+z');
  await ruhig();
}
{
  const z = await K('lagen');
  let rest = z.length === vorher.lagen.length ? 0 : Infinity;
  if (rest === 0) for (let i = 0; i < z.length; i++) rest = Math.max(rest, Math.abs(z[i] - vorher.lagen[i]));
  const lz = await K('loops');
  ok('⌘Z: wie vor dem Formen', rest < 1e-9 && lz.length === vorher.loops.length && !lz.find((l) => l.id === maulId)?.kante, `${z.length / 3} Punkte, Rest ${rest === Infinity ? 'andere Punktzahl' : rest.toExponential(1)}, Loops ${kurz(lz)}`);
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | ').slice(0, 300));
console.log(schlecht ? `${schlecht} Punkte nicht erfüllt` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
