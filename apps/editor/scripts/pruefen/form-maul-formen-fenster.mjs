// Plan vom 12.11.2026, Schritt 6, Etappe 1 (13.11.): der Knopf „Maul formen“ im Fenster, mit der Maus.
//   1  Von der Kugel an: mit F die schmale Form ums Maul (Seite, vorn über den Umriss); sie ist danach gewählt.
//   2  „Maul formen“: Die Linie wird eine Kante, Mittellinie und Querlinie durch die Mundwinkel kommen dazu, die Mittellinie bekommt im
//      Maul die Form der Maullinie von der Seite. Geprüft: Meldung, nichts umgeschlagen, spiegelgleich, die Mittellinie im Maul liegt
//      in der Seite auf der Maullinie, keine Fehler in der Konsole.
//   3  „Fressen“ an der geformten Linie: eine Meldung statt der alten Anzeige-Fassung.
//   4  An der Unterlippe ziehen (ein gewöhnlicher Zug am geformten Maul) und wieder zurück mit ⌘Z.
//   5  ⌘Z: die Form wie vor dem Formen.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs [bild-ohne-endung]
//   KURVEN_URL (Standard http://localhost:5197/kurven.html?gewichte=geometrie)   NAME=<gesicherte Form> RING=<Nummer des Loops> statt der Kugel
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5197/kurven.html?gewichte=geometrie';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
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
const kurz = (L) => L.map((l) => `${l.id}:${l.art}${l.kante ? ' Kante' : ''}/${l.punkte.length}`).join(' ');

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
console.log(`vor dem Formen: ${vorher.lagen.length / 3} Punkte, Loops ${kurz(vorher.loops)}`);
const maulId = vorher.loops.at(-1).id;
if (BILD) await seite.screenshot({ path: `${BILD}-1-vorher.jpg`, type: 'jpeg', quality: 88 });

// 2. Maul formen
await seite.click('#knopf-maul');
await seite.waitForFunction(() => /^Maul geformt|geht so nicht/.test(window.__kurven.meldung()), null, { timeout: 120000 });
const meldung = await K('meldung');
await ruhig();
const nach = { lagen: await K('lagen'), loops: await K('loops') };
ok('Maul formen: Meldung', meldung.startsWith('Maul geformt'), meldung);
console.log(`     nach dem Formen: ${nach.lagen.length / 3} Punkte, Loops ${kurz(nach.loops)}`);
const L = nach.loops.find((l) => l.id === maulId);
ok('die Maullinie ist eine Kante', L?.kante === true);
const M = nach.loops.find((l) => l.art === 'mitte');
const Q = nach.loops.find((l) => l.id !== maulId && l.art === 'ring');
ok('Mittellinie und Querlinie sind da', !!M && !!Q, `${nach.loops.length} Loops`);
ok('nichts umgeschlagen', (await K('umgeschlagen')) === 0, `umgeschlagen ${await K('umgeschlagen')}`);
// hinter dem Maul bleibt die Form (die Kugel bleibt eine Kugel: Halbmesser 150)
{
  let weit = 0;
  for (let i = 0; i < nach.lagen.length; i += 3) {
    if (nach.lagen[i] < -40) continue;
    weit = Math.max(weit, Math.abs(Math.hypot(nach.lagen[i], nach.lagen[i + 1], nach.lagen[i + 2]) - 150));
  }
  ok('hinter dem Maul bleibt die Form', weit < 8, `größte Abweichung von der Kugel ${z2(weit)}`);
}
ok('spiegelgleich', (await K('symmetrie')) < 1e-6, `Abweichung ${(await K('symmetrie')).toExponential(1)}`);
// die Mittellinie im Maul: in der Seite auf der Maullinie
if (L && M) {
  const lip = [];
  for (let j = 0; j < L.proben; j++) lip.push([L.ruhe[3 * j], L.ruhe[3 * j + 1]]);
  const d = (x, y) => {
    let best = Infinity;
    for (let k = 0; k + 1 < lip.length; k++) {
      const [ax, ay] = lip[k];
      const [bx, by] = lip[k + 1];
      const l2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2));
      best = Math.min(best, Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)));
    }
    return best;
  };
  // Stellen der Mittellinie, die im Maul liegen: zwischen ihren beiden Punkten an den Lippen, auf dem Weg über den Punkt zwischen
  // den Mundwinkeln
  const W = L.punkte.find((p) => p.mundwinkel);
  const kA = L.punkte[0].kreuzung;
  const kB = L.punkte.at(-1).kreuzung;
  const iA = M.punkte.findIndex((p) => p.kreuzung === kA);
  const iB = M.punkte.findIndex((p) => p.kreuzung === kB);
  const n = M.punkte.length;
  const vor = (iB - iA + n) % n;
  const zwischenWinkeln = (i) => Math.hypot(M.punkte[i].ref.x - W.ref.x, M.punkte[i].ref.y - W.ref.y) < 1;
  const vorwaerts = Array.from({ length: vor + 1 }, (_, k) => (iA + k) % n).some(zwischenWinkeln);
  const sA = M.punkte[vorwaerts ? iA : iB].s;
  const sB = M.punkte[vorwaerts ? iB : iA].s;
  let weit = 0;
  let zahl = 0;
  for (let j = 0; j < M.proben; j++) {
    const sj = M.s[j];
    if (!(sA <= sB ? sj >= sA && sj <= sB : sj >= sA || sj <= sB)) continue;
    zahl++;
    weit = Math.max(weit, d(M.ruhe[3 * j], M.ruhe[3 * j + 1]));
  }
  ok('durchgestanzt: die Mittellinie hat im Maul die Form der Maullinie von der Seite', zahl > 3 && weit < 1.5, `${zahl} Stellen, höchstens ${z2(weit)} daneben`);
}
if (BILD) await seite.screenshot({ path: `${BILD}-2-geformt.jpg`, type: 'jpeg', quality: 88 });
await K('kamera', { x: -560, y: 60, z: 420 }, { x: -60, y: -20, z: 0 });
await seite.waitForTimeout(300);
if (BILD) await seite.screenshot({ path: `${BILD}-3-geformt-nah.jpg`, type: 'jpeg', quality: 88 });

// 3. „Fressen“ an der geformten Linie (sie ist nach dem Formen gewählt): Meldung
await seite.click('#knopf-pose');
await seite.waitForTimeout(300);
const m4 = await K('meldung');
ok('„Fressen“ am geformten Maul: Meldung statt der alten Anzeige', /geformt/.test(m4) && !(await K('pose')).an, m4);

// 4. ein gewöhnlicher Zug an der Unterlippe
{
  const lp = nach.loops.find((l) => l.id === maulId);
  const p = [...lp.punkte].filter((q) => !q.mundwinkel && q.sichtbar !== false && Math.abs(q.ref.z) > 1).sort((a, b) => a.ref.y - b.ref.y)[0];
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
  ok('an der Unterlippe ziehen: nichts umgeschlagen', (await K('umgeschlagen')) === 0, `umgeschlagen ${await K('umgeschlagen')}; ${(await K('lagen')).length / 3} Punkte`);
  if (BILD) await seite.screenshot({ path: `${BILD}-4-lippe.jpg`, type: 'jpeg', quality: 88 });
  await seite.keyboard.press('Meta+z');
  await ruhig();
}

// 5. ⌘Z bis vor das Formen
for (let i = 0; i < 6 && (await K('loops')).length > vorher.loops.length; i++) {
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
