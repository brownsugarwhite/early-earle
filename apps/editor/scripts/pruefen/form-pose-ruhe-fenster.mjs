// Plan vom 12.11.2026, Schritt 5, Etappe 1 (13.11.): die Form für den kleinen Beweis „Pose in ihrer Ruhe rechnen“ und das Ergebnis
// der Pose von heute zum Vergleich, beides aus dem Fenster.
//   1  Von der Kugel an: ein Ring hinten (Seite, x = 60), dann mit F die schmale Form ums Maul (Seite, vorn über den Umriss).
//   2  „Fressen“ an und wieder aus (legt Maul und Mundwinkel an), dann sichern: die Grundform mit Maul für die Probe im Kern.
//   3  Wieder „Fressen“ (Maul 30°). In der Pose, jeweils von demselben Stand aus (⌘Z dazwischen):
//        unten  der unterste Punkt der Unterlippe 25 nach unten
//        oben   derselbe Punkt 25 nach oben
//        fern   der oberste Punkt des Rings 40 nach oben
//      Je Zug die gezeigte Haut (`anzeige`: ohne die Öffnung des Mauls), die Linien und was das Fenster meldet.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/form-pose-ruhe-fenster.mjs <ausgabe.json>
//   KURVEN_URL (Standard http://localhost:5197/kurven.html?gewichte=geometrie)   NAME (Standard „probe pose maul kugel“, landet in wesen/)
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const aus = process.argv[2] ?? 'pose-heute.json';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5197/kurven.html?gewichte=geometrie';
const NAME = process.env.NAME ?? 'probe pose maul kugel';
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
const ziehen = async (a, von, nach, schritte = 30) => {
  const p = await bild(a, von);
  const q = await bild(a, nach);
  await seite.mouse.move(p.x, p.y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(p.x + ((q.x - p.x) * i) / schritte, p.y + ((q.y - p.y) * i) / schritte);
    await seite.waitForTimeout(20);
  }
  await seite.waitForTimeout(300);
  await seite.mouse.up();
  await ruhig();
};
const kurz = (L) => L.map((l) => `${l.id}:${l.art}/${l.punkte.length}`).join(' ');

console.log(`Anfang: ${(await K('lagen')).length / 3} Punkte, Loops ${kurz(await K('loops'))}`);
// 1. Ring hinten
await seite.keyboard.press('l');
{
  const a = await bild('seite', { x: 60, y: 200, z: 0 });
  const b = await bild('seite', { x: 60, y: -200, z: 0 });
  await seite.mouse.move(a.x, a.y);
  await seite.mouse.down();
  await seite.mouse.move(b.x, b.y, { steps: 8 });
  await seite.mouse.up();
  await ruhig();
  await seite.keyboard.press('Escape');
}
const ringId = (await K('loops')).at(-1).id;
// ein Punkt oben auf dem Ring (Doppelklick auf die Linie): Die Enden eines Rings sind nicht zu greifen
{
  const p = await bild('seite', { x: 60, y: 100, z: 0 });
  await seite.mouse.dblclick(p.x, p.y);
  await ruhig();
  await seite.keyboard.press('Escape');
}
// die schmale Form ums Maul
await seite.keyboard.press('f');
{
  const n = 64;
  const pkt = [];
  for (let i = 0; i <= n; i++) pkt.push(await bild('seite', { x: -115 + 60 * Math.cos((2 * Math.PI * i) / n), y: -20 + 9 * Math.sin((2 * Math.PI * i) / n), z: 0 }));
  await seite.mouse.move(pkt[0].x, pkt[0].y);
  await seite.mouse.down();
  for (const p of pkt.slice(1)) {
    await seite.mouse.move(p.x, p.y);
    await seite.waitForTimeout(6);
  }
  await seite.mouse.up();
  await ruhig();
}
// 2. Fressen an und aus, sichern
await seite.click('#knopf-pose');
await ruhig();
await seite.click('#knopf-pose');
await ruhig();
console.log(`Grundform mit Maul: ${(await K('lagen')).length / 3} Punkte, Loops ${kurz(await K('loops'))}; ${await K('meldung')}`);
console.log(`sichern: ${await seite.evaluate((n) => window.__kurven.ablage.sichern(n), NAME)}`);
const grundLagen = await K('lagen');
// 3. Fressen
await seite.click('#knopf-pose');
await ruhig();
const stand = async () => ({ lagen: await K('lagen'), dreiecke: await K('dreiecke'), anzeige: await K('anzeige'), loops: await K('loops'), pose: await K('pose'), maul: await K('maul'), umgeschlagen: await K('umgeschlagen'), meldung: await K('meldung') });
const ergebnis = { name: NAME, ringId, grundLagen, pose0: await stand(), zuege: {} };
const mund = ergebnis.pose0.loops.find((l) => l.punkte.some((p) => p.mundwinkel));
const sichtbar = (l) => l.punkte.map((p, i) => ({ ...p, i })).filter((p) => !p.mundwinkel && p.sichtbar !== false);
const unten = sichtbar(mund).sort((a, b) => a.ref.y - b.ref.y)[0];
const ring = ergebnis.pose0.loops.find((l) => l.id === ringId);
const hoch = sichtbar(ring).sort((a, b) => b.ref.y - a.ref.y)[0];
console.log(`Pose: ${JSON.stringify(ergebnis.pose0.pose)}; Maul-Loop ${mund.id}, Punkt ${unten.i} bei (${unten.ref.x.toFixed(1)}, ${unten.ref.y.toFixed(1)}, ${unten.ref.z.toFixed(1)}); Ring ${ring.id}, Punkt ${hoch.i} bei (${hoch.ref.x.toFixed(1)}, ${hoch.ref.y.toFixed(1)}, ${hoch.ref.z.toFixed(1)})`);
const zuege = [
  ['unten', mund.id, unten, { x: 0, y: -25, z: 0 }],
  ['oben', mund.id, unten, { x: 0, y: 25, z: 0 }],
  ['fern', ring.id, hoch, { x: 0, y: 40, z: 0 }],
];
for (const [name, lid, p, d] of zuege) {
  await ziehen('seite', p.ref, { x: p.ref.x + d.x, y: p.ref.y + d.y, z: p.ref.z + d.z });
  const s = await stand();
  let weit = 0;
  for (let i = 0; i < s.lagen.length; i++) weit = Math.max(weit, Math.abs(s.lagen[i] - ergebnis.pose0.lagen[i]));
  ergebnis.zuege[name] = { loop: lid, punkt: p.i, s: p.s, weg: d, ...s };
  console.log(`${name}: Haut bis ${weit.toFixed(1)} bewegt, umgeschlagen ${s.umgeschlagen}, Maul ${JSON.stringify(s.maul)}; ${s.meldung}`);
  await seite.keyboard.press('Meta+z');
  await ruhig();
  const zur = await K('lagen');
  let rest = 0;
  for (let i = 0; i < zur.length; i++) rest = Math.max(rest, Math.abs(zur[i] - ergebnis.pose0.lagen[i]));
  if (zur.length !== ergebnis.pose0.lagen.length || rest > 1e-9) console.log(`   ⌘Z: nicht genau zurück (${zur.length / 3} Punkte, Rest ${rest})`);
}
fs.writeFileSync(aus, JSON.stringify(ergebnis));
console.log(`geschrieben: ${aus}; Fehler in der Konsole: ${fehler.length}${fehler.length ? ` (${fehler.slice(0, 3).join(' | ')})` : ''}`);
await browser.close();
