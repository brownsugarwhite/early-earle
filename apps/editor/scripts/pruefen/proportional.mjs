// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V3: proportionales Bearbeiten in den Blättern im echten Editor
// (eigener Vite über run-check.sh, nie 5180). Florians Ablauf: Startkugel, dann die Umrisse des Langhalses. Echte Tasten,
// Maus und Rad:
// - O schaltet ein (Dock), G mit Zeiger: Nachbarn gehen mit, Knoten außerhalb des Einflusses bleiben bitgleich, Kreis im Blatt;
// - Mausrad während G vergrößert den Einfluss (×1,1 je Raste, Kreis wächst), ⇧O wechselt den Abfall;
// - „nur verbunden“ (⌥O) am Langhals: ein Knoten, der in Luftlinie nah, längs der Kurve aber fern ist (Hals ↔ Brust), geht
//   mit O mit, mit ⌥O nicht;
// - Knotenzug mit der Maus bei O: proportional, Rad im Zug ändert den Einfluss, ein Undo-Schritt; Esc im Zug stellt her.
// Umgebung: AUSGABE (Bilder), NAME (Zusatz im Bildnamen), KOERPER (Standard langhals).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/proportional.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v3');
mkdirSync(out, { recursive: true });
const name = process.env.NAME ?? 'nachher';
const koerper = process.env.KOERPER ?? 'langhals';
const reihe = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/extremreihe.ts`;
const abbildung = `/@fs${WURZEL}/apps/editor/src/editing/modal/abbildung.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
  if (!ok) fehler++;
};
async function ruhig() {
  let v = await page.evaluate(() => window.__editor.netzVersion());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const w = await page.evaluate(() => window.__editor.netzVersion());
    if (w === v) return;
    v = w;
  }
}
const dok = () => page.evaluate(() => window.__stores.editor.getState().dok);
const ui = () => page.evaluate(() => ({ p: window.__stores.ui.getState().proportional, r: window.__stores.ui.getState().pinselRadius, verlauf: window.__stores.editor.getState().verlauf.length, modal: window.__modal.aktiv() }));
const mitte = async (sel) => {
  const b = await page.locator(sel).first().boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
};
const knoten = (i) => mitte(`.vp-ober[data-view="seite"] [data-knoten="${i}"] .knoten-punkt`);
const einfluss = async () => Number((await page.locator('.vp-ober[data-view="seite"] [data-einfluss]').first().getAttribute('data-einfluss').catch(() => null)) ?? NaN);
/** welche Seitenknoten sich gegenüber `a` geändert haben */
const bewegt = (a, b) => a.profile.seite.knoten.flatMap((k, i) => (JSON.stringify(k) === JSON.stringify(b.profile.seite.knoten[i]) ? [] : [i]));

await page.goto(`${url}/?look=earle&palette=blob`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
await page.evaluate(() => {
  window.__stores.ui.getState().libraryUmschalten(false);
  window.__stores.ui.getState().setzeEbene('form');
  window.__stores.ui.getState().maximieren(null);
});
await ruhig();
await page.evaluate(
  async ({ reihe, koerper }) => {
    const m = await import(reihe);
    const d = m.extremKoerper(koerper).dok();
    const st = window.__stores.editor.getState();
    st.setzeDokument({ ...st.dok, profile: d.profile });
  },
  { reihe, koerper },
);
await ruhig();

// Fall suchen: gewählter Knoten i, Knoten j in Luftlinie nah (Gewicht > 0,05), längs der Kurve fern (Gewicht 0), mit dem
// Einfluss als Anteil der Körperhöhe (wie der Pinsel)
const fall = await page.evaluate(
  async ({ abbildung }) => {
    const m = await import(abbildung);
    const d = window.__stores.editor.getState().dok;
    const kn = d.profile.seite.knoten;
    let best = null;
    for (let i = 0; i < kn.length; i++) {
      for (const r of [0.04, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2]) {
        const k = { knoten: kn, geschlossen: true, gewaehlt: new Set([i]) };
        const luft = m.gewichte([k], { an: true, abfall: 'glatt', radius: r, verbunden: false })[0];
        const verb = m.gewichte([k], { an: true, abfall: 'glatt', radius: r, verbunden: true })[0];
        for (let j = 0; j < kn.length; j++) {
          if (j === i || luft[j].p < 0.05 || verb[j].p !== 0 || verb[j].ein !== 0 || verb[j].aus !== 0) continue;
          const nachbar = verb.findIndex((w, n) => n !== i && w.p > 0.05);
          const fern = luft.findIndex((w) => w.p === 0 && w.ein === 0 && w.aus === 0);
          if (nachbar < 0 || fern < 0) continue;
          if (!best || luft[j].p > best.w) best = { i, j, r, w: luft[j].p, nachbar, fern };
        }
      }
    }
    return { best };
  },
  { abbildung },
);
pruefe(!!fall.best, `Fall gefunden: ${JSON.stringify(fall.best)}`);
if (!fall.best) {
  await browser.close();
  process.exit(1);
}
const { i, j, r, nachbar } = fall.best;
// Einfluss wie der Pinsel (Anteil der Körperhöhe): erst bei 25 % am Kreis im Blatt nachmessen, dann auf r stellen
await page.evaluate(() => window.__stores.ui.getState().setzePinselRadius(0.25));

console.log('O an, G mit Zeiger');
await page.mouse.move(400, 300);
await page.keyboard.press('o');
let u = await ui();
pruefe(u.p.an, 'O schaltet proportional ein');
const dockText = await page.locator('[data-dock]').innerText();
pruefe(/proportional glatt/.test(dockText), `Dock zeigt den Zustand („${dockText.replace(/\s+/g, ' ').slice(0, 90)}…“)`);
const ki = await knoten(i);
await page.mouse.click(ki.x, ki.y);
await ruhig();
// Radius in Profil-Einheiten über den Kreis im Blatt kalibrieren: Kreisradius (px) / Pixel je Profil-Einheit
await page.mouse.move(ki.x + 5, ki.y + 5);
await page.keyboard.press('g');
const kreis0 = await einfluss();
await page.keyboard.press('Escape');
const pxJeEinheit = await page.evaluate(() => {
  const d = window.__stores.editor.getState().dok;
  const a = document.querySelector('.vp-ober[data-view="seite"] [data-knoten="0"] .knoten-punkt').getBoundingClientRect();
  const b = document.querySelector('.vp-ober[data-view="seite"] [data-knoten="1"] .knoten-punkt').getBoundingClientRect();
  const k = d.profile.seite.knoten;
  return Math.hypot(a.x - b.x, a.y - b.y) / Math.hypot(k[0].p.x - k[1].p.x, k[0].p.y - k[1].p.y);
});
const radius0 = kreis0 / pxJeEinheit;
pruefe(Number.isFinite(radius0) && radius0 > 0, `Einflusskreis im Blatt sichtbar (${kreis0.toFixed(1)} px = ${radius0.toFixed(4)} Einheiten bei Pinsel 25 %)`);
// auf r stellen
await page.evaluate(({ r, radius0 }) => window.__stores.ui.getState().setzePinselRadius((0.25 * r) / radius0), { r, radius0 });

const start = await dok();
await page.mouse.move(ki.x + 2, ki.y + 2);
await page.keyboard.press('g');
for (let k = 1; k <= 10; k++) await page.mouse.move(ki.x + 2 + 3 * k, ki.y + 2 - 2 * k);
let jetzt = await dok();
let b = bewegt(start, jetzt);
pruefe(b.includes(i) && b.includes(j) && b.includes(nachbar), `Luftlinie: gewählter Knoten ${i}, Nachbar ${nachbar} und der nahe Knoten ${j} gehen mit (bewegt: ${b.join(', ')})`);
pruefe(!b.includes(fall.best.fern), `Knoten ${fall.best.fern} außerhalb des Einflusses bleibt bitgleich`);
const kreis = await einfluss();
await page.screenshot({ path: `${out}/v3-proportional-${koerper}-${name}.png` });
// Rad während G: Einfluss wächst um 10 % je Raste
await page.mouse.wheel(0, -100);
await page.waitForTimeout(100);
const kreis2 = await einfluss();
u = await ui();
pruefe(Math.abs(kreis2 / kreis - 1.1) < 0.01 && u.modal, `Mausrad während G: Kreis ${kreis.toFixed(1)} → ${kreis2.toFixed(1)} px (×${(kreis2 / kreis).toFixed(3)}), G läuft weiter`);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
pruefe(JSON.stringify(await dok()) === JSON.stringify(start), 'Esc: Dokument wie vorher');
await page.evaluate(({ r, radius0 }) => window.__stores.ui.getState().setzePinselRadius((0.25 * r) / radius0), { r, radius0 });

console.log('⌥O „nur verbunden“');
await page.keyboard.press('Alt+o');
u = await ui();
pruefe(u.p.verbunden, '⌥O schaltet „nur verbunden“ ein');
await page.mouse.move(ki.x + 2, ki.y + 2);
await page.keyboard.press('g');
for (let k = 1; k <= 10; k++) await page.mouse.move(ki.x + 2 + 3 * k, ki.y + 2 - 2 * k);
jetzt = await dok();
b = bewegt(start, jetzt);
pruefe(b.includes(i) && b.includes(nachbar) && !b.includes(j), `verbunden: Nachbar ${nachbar} geht mit, der in Luftlinie nahe Knoten ${j} bleibt (bewegt: ${b.join(', ')})`);
const verlauf0 = (await ui()).verlauf;
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
pruefe((await ui()).verlauf === verlauf0 + 1, 'Enter: ein Undo-Schritt');
await ruhig();
await page.keyboard.press('Meta+z');
await page.waitForTimeout(300);
pruefe(JSON.stringify((await dok()).profile) === JSON.stringify(start.profile), '⌘Z stellt her');
await ruhig();
await page.keyboard.press('Alt+o');

console.log('⇧O Abfall');
await page.keyboard.press('Shift+o');
u = await ui();
pruefe(u.p.abfall === 'kugel', `⇧O wechselt den Abfall (glatt → ${u.p.abfall})`);
await page.keyboard.press('Shift+o');
await page.keyboard.press('Shift+o');
await page.keyboard.press('Shift+o');
await page.keyboard.press('Shift+o');
await page.keyboard.press('Shift+o');
u = await ui();
pruefe(u.p.abfall === 'glatt', `sechs Abfälle, dann wieder glatt (${u.p.abfall})`);

console.log('Knotenzug mit der Maus bei O');
{
  const st = await dok();
  const v0 = (await ui()).verlauf;
  const k = await knoten(i);
  await page.mouse.move(k.x, k.y);
  await page.mouse.down();
  for (let s = 1; s <= 6; s++) await page.mouse.move(k.x + 2 * s, k.y - 3 * s);
  const imZug = await dok();
  const b1 = bewegt(st, imZug);
  const kreisZug = await einfluss();
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(100);
  const kreisZug2 = await einfluss();
  await page.mouse.move(k.x + 14, k.y - 20);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const nach = await dok();
  pruefe(b1.length > 1 && b1.includes(nachbar), `Zug mit der Maus wirkt proportional (bewegt: ${b1.join(', ')})`);
  pruefe(Math.abs(kreisZug2 / kreisZug - 1.1) < 0.01, `Rad im Zug: Kreis ${kreisZug.toFixed(1)} → ${kreisZug2.toFixed(1)} px`);
  pruefe((await ui()).verlauf === v0 + 1 && !(await ui()).modal, 'Loslassen: ein Undo-Schritt, Operation beendet');
  pruefe(JSON.stringify(nach) !== JSON.stringify(st), 'Zug übernommen');
  await ruhig();
  // Esc im Zug
  const st2 = await dok();
  const k2 = await knoten(i);
  await page.mouse.move(k2.x, k2.y);
  await page.mouse.down();
  for (let s = 1; s <= 5; s++) await page.mouse.move(k2.x - 2 * s, k2.y + 2 * s);
  await page.keyboard.press('Escape');
  await page.mouse.move(k2.x - 30, k2.y + 30);
  await page.mouse.up();
  await page.waitForTimeout(200);
  pruefe(JSON.stringify(await dok()) === JSON.stringify(st2) && (await ui()).verlauf === v0 + 1, 'Esc im Zug: Dokument wie vorher, kein Undo-Schritt');
}
console.log('P-Linie und Spant: Zug mit der Maus bei O');
{
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__stores.ui.getState().setzePinselRadius(0.6));
  // P-Linie mit vier Knoten über den Bauch (unteres Fünftel des Rahmens der Seitenknoten)
  const kz = await page.locator('.vp-ober[data-view="seite"] [data-knoten] .knoten-punkt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })));
  const x0 = Math.min(...kz.map((p) => p.x));
  const x1 = Math.max(...kz.map((p) => p.x));
  const y0 = Math.min(...kz.map((p) => p.y));
  const y1 = Math.max(...kz.map((p) => p.y));
  const c = { x: (x0 + x1) / 2 + 0.1 * (x1 - x0), y: y0 + 0.8 * (y1 - y0) };
  await page.keyboard.press('p');
  for (const dx of [-36, -12, 12, 36]) await page.mouse.click(c.x + dx, c.y);
  await page.keyboard.press('Enter');
  await page.keyboard.press('a');
  await ruhig();
  const st = await dok();
  const ki = (st.kanten?.length ?? 0) - 1;
  const k1 = ki >= 0 ? await mitte(`.vp-ober[data-view="seite"] [data-kantenknoten="${ki}:1"] .kanten-punkt`) : null;
  if (!k1) pruefe(false, `P-Linie gezeichnet (${ki + 1} Linien)`);
  else {
    const v0 = (await ui()).verlauf;
    await page.mouse.move(k1.x, k1.y);
    await page.mouse.down();
    for (let s = 1; s <= 6; s++) await page.mouse.move(k1.x, k1.y - 3 * s);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const neu = await dok();
    const b = st.kanten[ki].knoten.flatMap((k, i) => (JSON.stringify(k.p) === JSON.stringify(neu.kanten[ki].knoten[i].p) ? [] : [i]));
    pruefe(b.includes(1) && (b.includes(0) || b.includes(2)) && (await ui()).verlauf === v0 + 1, `P-Linie: Zug am Knoten 1 nimmt Nachbarn mit (bewegt: ${b.join(', ')}), ein Undo-Schritt`);
    await ruhig();
  }
  // Spant: S ohne Auswahl, Klick in der Seite, dann in der Front einen Spantpunkt ziehen. Wo der Spant denselben Querschnitt
  // hat wie die Front, liegen seine Punkte genau unter den Front-Knoten und der Klick träfe den Umriss (altes Verhalten,
  // Register „Befunde aus V3“) — deshalb eine Stelle suchen, an der ein Spantpunkt frei liegt
  let frei = null;
  for (const fx of [0.25, 0.75, 0.15, 0.85, 0.4, 0.6]) {
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    const x = x0 + fx * (x1 - x0);
    await page.mouse.move(x, (y0 + y1) / 2);
    await page.keyboard.press('s');
    await page.mouse.click(x, (y0 + y1) / 2);
    await ruhig();
    if (!(await dok()).spanten?.length) continue;
    frei = await page.evaluate(() =>
      [...document.querySelectorAll('.vp-ober[data-view="front"] [data-spantknoten]')]
        .map((g) => {
          const b = g.querySelector('circle').getBoundingClientRect();
          const m = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
          const oben = document.elementFromPoint(m.x, m.y)?.closest('[data-spantknoten]');
          return oben === g ? { id: g.getAttribute('data-spantknoten'), ...m } : null;
        })
        .find((x) => x && !x.id.endsWith(':0')) ?? null,
    );
    if (frei) break;
    await page.keyboard.press('Meta+z');
    await ruhig();
  }
  if (!frei) pruefe(false, 'Spant mit einem frei liegenden Punkt in der Front');
  else {
    const sp0 = await dok();
    const j = Number(frei.id.split(':')[1]);
    const v0 = (await ui()).verlauf;
    await page.mouse.move(frei.x, frei.y);
    await page.mouse.down();
    for (let s = 1; s <= 6; s++) await page.mouse.move(frei.x + 3 * s, frei.y);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const neu = await dok();
    const b = sp0.spanten[0].profil.knoten.flatMap((k, i) => (JSON.stringify(k) === JSON.stringify(neu.spanten[0].profil.knoten[i]) ? [] : [i]));
    pruefe(b.includes(j) && b.length > 1 && (await ui()).verlauf === v0 + 1, `Spant: Zug am Punkt ${j} nimmt Nachbarn mit (bewegt: ${b.join(', ')}), ein Undo-Schritt`);
  }
}

await page.keyboard.press('o');
pruefe(!(await ui()).p.an, 'O schaltet wieder aus');

await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alle Prüfungen ok');
process.exit(fehler ? 1 : 0);
