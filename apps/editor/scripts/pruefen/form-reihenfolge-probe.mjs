// Form zuerst (11.11.2026): Florians Ablauf von der Kugel an („nur wenn ich erst die beiden Loops daneben ziehe und dann erst den in
// der Mitte“). Zwei Loops rundum, dann der Loop auf einer Seite (Paar), dessen obersten Punkt weit hinausziehen (danach räumt der
// Hintergrund das Netz auf), dann erst der Loop der Mitte. Geprüft wird:
//   - Der Loop der Mitte ist ins Netz eingesetzt (bis zum 11.11. hatte das Aufräumen Kanten der Mittelebene quer gedreht; er lag
//     dann nur auf der Haut, und um ihn kam die Haut nie zur Ruhe).
//   - Der oberste Punkt der Mitte lässt sich in der Front hin und her ziehen, ohne dass Dreiecke umklappen; am Ende liegt die Haut
//     wieder, wo sie war.
//   - Ein Punkt des Paars über die Mittelebene gezogen und zurück: nichts klappt um, der Punkt liegt wieder an seinem Ort.
// Aufruf aus apps/editor: node scripts/pruefen/form-reihenfolge-probe.mjs   (KURVEN_URL, BILD=<pfad ohne Endung>, ZUEGE=3)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const ZUEGE = Number(process.env.ZUEGE ?? 3);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
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
  await seite.waitForTimeout(200);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
/** Loop schneiden: im Blatt a von P nach Q (Welt) ziehen */
const schneiden = async (a, P, Q) => {
  await seite.keyboard.press('l');
  const [x, y] = await bild(a, P);
  const [x2, y2] = await bild(a, Q);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x2, y2, { steps: 8 });
  await seite.mouse.up();
  await ruhig();
  await seite.keyboard.press('Escape');
};
/** einen Punkt über Wegpunkte ziehen (Versatz gegen seinen Anfang), halten, loslassen */
const ziehen = async (a, lid, i, wege, zoom = 0.5) => {
  const L = await K('loops');
  const p = L.find((x) => x.id === lid).punkte[i];
  const uv = (q) => (a === 'seite' ? [q.x, -q.y] : a === 'front' ? [q.z, -q.y] : [q.x, q.z]);
  const alle = [p.ref, ...wege.map((w) => ({ x: p.ref.x + w[0], y: p.ref.y + w[1], z: p.ref.z + w[2] }))];
  const us = alle.map((q) => uv(q)[0]);
  const vs = alle.map((q) => uv(q)[1]);
  await K('ausschnitt', a, { cx: (Math.min(...us) + Math.max(...us)) / 2, cy: (Math.min(...vs) + Math.max(...vs)) / 2, zoom });
  await seite.waitForTimeout(150);
  let [x, y] = await bild(a, p.ref);
  await seite.mouse.move(x, y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (const q of alle.slice(1)) {
    const [x2, y2] = await bild(a, q);
    for (let s = 1; s <= 12; s++) {
      await seite.mouse.move(x + ((x2 - x) * s) / 12, y + ((y2 - y) * s) / 12);
      await seite.waitForTimeout(16);
    }
    [x, y] = [x2, y2];
  }
  await seite.waitForTimeout(300);
  await seite.mouse.up();
  await ruhig();
};
const zustand = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const z = k.zeiten();
    return { punkte: z.punkte, umg: k.umgeschlagen(), davon: z.davon, unruhe: z.unruhe, meldung: k.meldung(), lagen: k.lagen() };
  });
const weit = (a, b) => (a.length !== b.length ? NaN : a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0));
const punkt = async (lid, wie) => {
  const L = await K('loops');
  const l = L.find((x) => x.id === lid);
  let best = 0;
  l.punkte.forEach((p, i) => {
    if (p.sichtbar !== false && wie(p.ref) > wie(l.punkte[best].ref)) best = i;
  });
  return best;
};

// ---------- Florians Reihenfolge ----------
// zwei Loops rundum: waagerecht (in der Front über die Mitte) und senkrecht quer (in der Seite)
await schneiden('front', { x: 0, y: 8, z: -200 }, { x: 0, y: 8, z: 200 });
await schneiden('seite', { x: -10, y: 200, z: 0 }, { x: -10, y: -200, z: 0 });
// der Loop auf einer Seite (in der Front neben der Mitte): das Paar
await schneiden('front', { x: 0, y: 200, z: 43 }, { x: 0, y: -200, z: 43 });
let L = await K('loops');
// (ein Stand vor dem 11.11. meldet `eingesetzt` nicht: Dort sagt es die Statuszeile nach dem Schneiden)
ok('drei Loops', L.length === 3 && L[2].art === 'paar' && L.every((l) => l.eingesetzt !== false), L.map((l) => `${l.id} ${l.art}${l.eingesetzt === false ? ' (liegt nur auf)' : ''}`).join(', '));
// den obersten Punkt des Paars weit hinaus (mehrmals; danach räumt der Hintergrund das Netz jedes Mal auf)
for (let mal = 0; mal < ZUEGE; mal++) {
  const i = await punkt(3, (p) => p.y);
  await ziehen('front', 3, i, [[0, -10, 70]]);
}
const vorMitte = await zustand();
// (umgeschlagene Dreiecke schon hier sind kein Fehler dieser Probe: gemeldet, und die Schritte danach dürfen keine dazutun)
ok('nach den Zügen am Paar', vorMitte.davon === 0, `${vorMitte.punkte} Punkte, umgeschlagen ${vorMitte.umg}${vorMitte.umg ? ' (schon vor dem Loop der Mitte)' : ''}`);
// jetzt erst der Loop der Mitte (in der Front senkrecht auf der Mitte)
await schneiden('front', { x: 0, y: 260, z: 0 }, { x: 0, y: -260, z: 0 });
L = await K('loops');
const mitte = L.find((l) => l.art === 'mitte');
// (ein Stand vor dem 11.11. meldet `eingesetzt` nicht: Eingesetzt hat der Loop der Mitte genau so viele Proben, wie das Netz Punkte
// in der Mittelebene hat)
const inMitte = (await K('lagen')).filter((v, i) => i % 3 === 2 && v === 0).length;
const mitteDrin = !!mitte && (mitte.eingesetzt ?? mitte.proben === inMitte);
ok('Loop der Mitte eingesetzt', mitteDrin, mitte ? `${mitte.proben} Proben, ${inMitte} Punkte des Netzes in der Mittelebene${mitteDrin ? '' : ': liegt nur auf der Haut'}` : 'kein Loop der Mitte');
if (process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}-1-loops.jpg`, type: 'jpeg', quality: 85 });
if (mitte) {
  // der oberste Punkt der Mitte in der Front hin und her (wie Florian: „damit spielen“)
  const S0 = await zustand();
  for (let mal = 0; mal < 2; mal++) {
    const i = await punkt(mitte.id, (p) => p.y);
    await ziehen('front', mitte.id, i, [[0, 50, 0], [0, -30, 0], [0, 60, 0], [0, 0, 0]]);
  }
  const S1 = await zustand();
  ok('Hin und Her am obersten Punkt der Mitte', S1.umg <= S0.umg && S1.davon === 0, `umgeschlagen ${S0.umg} → ${S1.umg}, zurückgenommen ${S1.davon}, Schritt verkleinert ${S1.unruhe - S0.unruhe}-mal, ${S0.punkte} → ${S1.punkte} Punkte${S1.punkte === S0.punkte ? `, Haut gegen vorher bis ${weit(S0.lagen, S1.lagen).toFixed(2)}` : ''}`);
  // ein Punkt des Paars über die Mittelebene und zurück
  const j = await punkt(3, (p) => -p.y);
  const L2 = await K('loops');
  const vorher = L2.find((x) => x.id === 3).punkte[j].ref;
  await ziehen('front', 3, j, [[0, 0, -vorher.z - 40], [0, 0, 0]]);
  const S2 = await zustand();
  const L3 = await K('loops');
  const nachher = L3.find((x) => x.id === 3).punkte[j].ref;
  ok('Punkt des Paars über die Mitte und zurück', S2.umg <= S1.umg && S2.davon === 0 && Math.abs(nachher.z - vorher.z) < 0.5, `umgeschlagen ${S1.umg} → ${S2.umg}, zurückgenommen ${S2.davon}, Punkt z ${vorher.z.toFixed(1)} → ${nachher.z.toFixed(1)}`);
  if (process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}-2-danach.jpg`, type: 'jpeg', quality: 85 });
}
ok('Konsole', fehler.length === 0, fehler.length ? fehler.slice(0, 3).join(' | ').slice(0, 300) : 'keine Fehler');
console.log(schlecht ? `${schlecht} FEHLER` : 'alles gut');
await browser.close();
