// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V3 „G/S/R in den Blättern“ im echten Editor (eigener Vite über
// run-check.sh, nie 5180). Florians Ablauf: Startkugel, dann die Umrisse des Kegels der Extremreihe. Echte Tasten und Maus:
// - G Y 20 Enter (Seite): ein Knoten genau 20 px nach oben, ein Undo-Schritt, ⌘Z stellt her;
// - S 2 Enter (Front, ganze Front mit dem Rahmen gewählt): Knoten und Griffe exakt um die Mitte auf der Achse (≤ 1e-9);
// - R 90 Enter (Seite, drei Knoten): exakt gedreht, glatte Griffe auf einer Geraden;
// - G mit Zeigerbewegung, dann Esc / Rechtsklick / ⌘Z / Fokusverlust: Dokument und Auswahl JSON-gleich, kein Verlaufseintrag,
//   kein Kontextmenü; Pfeile, Tab und Rad tun während G nichts; Zeit je Mausbewegung ≤ 16 ms;
// - P-Linie (mit P gezeichnet): G X 10 Enter verschiebt ihre Knoten auf der Haut um 10 px;
// - Spant (S ohne Auswahl = Spant-Werkzeug, Klick in der Seite): zwei Punkte mit S 1,5 Enter;
// - fremder Ring (Front-Knoten im Seitenblatt): G 15 Enter verschiebt den Front-Knoten um 15 px in y; R gibt einen Hinweis;
// - ohne Auswahl: G = Pinsel, R = Hinweis; ⌘R lädt nicht neu.
// Umgebung: AUSGABE (Bilder), NAME (Zusatz im Bildnamen).
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/modal-2d.mjs
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v3');
mkdirSync(out, { recursive: true });
const name = process.env.NAME ?? 'nachher';
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/extremreihe.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const pruefe = (ok, text) => {
  console.log(`  ${ok ? 'ok  ' : 'FEHL'} ${text}`);
  if (!ok) fehler++;
};

/** bis eine Sekunde lang kein neues Netz kam */
async function ruhig() {
  let v = await page.evaluate(() => window.__editor.netzVersion());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const w = await page.evaluate(() => window.__editor.netzVersion());
    if (w === v) return;
    v = w;
  }
}
const zustand = () =>
  page.evaluate(() => {
    const e = window.__stores.editor.getState();
    const u = window.__stores.ui.getState();
    return { dok: JSON.stringify(e.dok), verlauf: e.verlauf.length, auswahl: JSON.stringify([u.auswahl, u.kantenAuswahl, u.spantAuswahl]), menue: !!u.menue, modal: window.__modal.aktiv() };
  });
const dok = () => page.evaluate(() => window.__stores.editor.getState().dok);
const mitte = async (sel) => {
  const b = await page.locator(sel).first().boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
};
const knoten = (blatt, i) => mitte(`.vp-ober[data-view="${blatt}"] [data-knoten="${i}"] .knoten-punkt`);
const blatt = async (b) => {
  const r = await page.locator(`.vp-ober[data-view="${b}"] svg.view2d`).boundingBox();
  return { ...r, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
};
const tasten = async (...ks) => {
  for (const k of ks) await page.keyboard.press(k);
};

await page.goto(`${url}/?look=earle&palette=blob`);
await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
await page.evaluate(() => {
  window.__stores.ui.getState().libraryUmschalten(false);
  window.__stores.ui.getState().setzeEbene('form');
  window.__stores.ui.getState().maximieren(null);
  window.__nichtNeuGeladen = true;
});
await ruhig();
// Florians Ablauf: die Startkugel ist eingefroren, dann kommen die Umrisse des Kegels (ein Undo-Schritt)
await page.evaluate(
  async ({ modul }) => {
    const m = await import(modul);
    const d = m.extremKoerper('kegel').dok();
    const st = window.__stores.editor.getState();
    st.setzeDokument({ ...st.dok, profile: d.profile });
  },
  { modul },
);
await ruhig();
const sk = (await dok()).skalierung;
const PX = 461 * sk;

// ---------- G Y 20 Enter (Seite) ----------
console.log('G Y 20 Enter in der Seite');
{
  const k = await knoten('seite', 1);
  await page.mouse.click(k.x, k.y);
  await ruhig();
  const vorher = await zustand();
  const alt = (await dok()).profile.seite.knoten[1].p;
  const s = await blatt('seite');
  await page.mouse.move(s.cx + 60, s.cy + 40);
  await tasten('g');
  pruefe(await page.evaluate(() => window.__modal.aktiv() && window.__modal.ziel() === 'umriss'), 'G startet die Operation auf dem gewählten Umrissknoten');
  await tasten('y', '2', '0');
  const text = await page.locator('[data-modal-text]').getAttribute('data-modal-text');
  pruefe(/G · Y · 20/.test(text ?? ''), `Dock zeigt „${text}“`);
  const achse = await page.locator('.vp-ober[data-view="seite"] [data-achsenlinie="y"]').count();
  pruefe(achse === 1, 'grüne Achsenlinie Y im Seitenblatt');
  await page.screenshot({ path: `${out}/v3-g-y-${name}.png` });
  await tasten('Enter');
  const nach = await zustand();
  const neu = (await dok()).profile.seite.knoten[1].p;
  pruefe(!nach.modal, 'Enter beendet die Operation');
  pruefe(neu.x === alt.x && neu.y === alt.y + 20 / PX, `Knoten genau 20 px nach oben (Δy ${((neu.y - alt.y) * PX).toFixed(9)} px, Δx ${((neu.x - alt.x) * PX).toFixed(9)} px)`);
  pruefe(nach.verlauf === vorher.verlauf + 1, `ein Undo-Schritt (${vorher.verlauf} → ${nach.verlauf})`);
  await ruhig();
  await tasten('Meta+z');
  await page.waitForTimeout(300);
  const zurueck = await zustand();
  pruefe(zurueck.dok === vorher.dok, '⌘Z stellt den Stand vor G her');
  await ruhig();
}

// ---------- S 2 Enter (Front, ganze Front) ----------
console.log('S 2 Enter in der Front (ganze Front gewählt)');
{
  const f = await blatt('front');
  await page.mouse.move(f.x + 6, f.y + 6);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width - 6, f.y + f.height - 6, { steps: 8 });
  await page.mouse.up();
  const start = await dok();
  const sel = await page.evaluate(() => window.__stores.ui.getState().auswahl.front);
  pruefe(sel.length === start.profile.front.knoten.length, `Rahmen wählt alle ${sel.length} Front-Knoten`);
  await page.mouse.move(f.cx + 50, f.cy - 30);
  await tasten('s', '2', 'Enter');
  const neu = (await dok()).profile.front;
  const ys = start.profile.front.knoten.map((k) => k.p.y);
  const c = { x: 0, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  let maxP = 0;
  let maxG = 0;
  start.profile.front.knoten.forEach((k, i) => {
    const n = neu.knoten[i];
    maxP = Math.max(maxP, Math.abs(n.p.x - (c.x + 2 * (k.p.x - c.x))), Math.abs(n.p.y - (c.y + 2 * (k.p.y - c.y))));
    maxG = Math.max(maxG, Math.abs(n.ein.x - 2 * k.ein.x), Math.abs(n.ein.y - 2 * k.ein.y), Math.abs(n.aus.x - 2 * k.aus.x), Math.abs(n.aus.y - 2 * k.aus.y));
  });
  pruefe(neu.knoten.length === start.profile.front.knoten.length && maxP <= 1e-9 && maxG <= 1e-9, `Front exakt verdoppelt um die Mitte auf der Achse (Knoten ${maxP.toExponential(1)}, Griffe ${maxG.toExponential(1)})`);
  await ruhig();
  await tasten('Meta+z');
  await page.waitForTimeout(300);
  pruefe((await zustand()).dok === JSON.stringify(start), '⌘Z stellt die Front her');
  await ruhig();
}

// ---------- R 90 Enter (Seite, drei Knoten) ----------
console.log('R 90 Enter in der Seite (drei Knoten)');
{
  const ks = [await knoten('seite', 1), await knoten('seite', 2), await knoten('seite', 3)];
  await page.mouse.click(ks[0].x, ks[0].y);
  await page.keyboard.down('Shift');
  await page.mouse.click(ks[1].x, ks[1].y);
  await page.mouse.click(ks[2].x, ks[2].y);
  await page.keyboard.up('Shift');
  await ruhig();
  const start = await dok();
  const sel = await page.evaluate(() => window.__stores.ui.getState().auswahl.seite);
  pruefe(sel.length === 3, `drei Knoten gewählt (${sel.join(', ')})`);
  const s = await blatt('seite');
  await page.mouse.move(s.cx - 40, s.cy - 50);
  await tasten('r', '9', '0', 'Enter');
  const neu = (await dok()).profile.seite;
  const pk = sel.map((i) => start.profile.seite.knoten[i].p);
  const c = { x: (Math.min(...pk.map((p) => p.x)) + Math.max(...pk.map((p) => p.x))) / 2, y: (Math.min(...pk.map((p) => p.y)) + Math.max(...pk.map((p) => p.y))) / 2 };
  let maxP = 0;
  let kollinear = 0;
  for (const i of sel) {
    const a = start.profile.seite.knoten[i];
    const n = neu.knoten[i];
    maxP = Math.max(maxP, Math.abs(n.p.x - (c.x - (a.p.y - c.y))), Math.abs(n.p.y - (c.y + (a.p.x - c.x))), Math.abs(n.aus.x + a.aus.y), Math.abs(n.aus.y - a.aus.x));
    if (n.art === 'glatt') kollinear = Math.max(kollinear, Math.abs(n.ein.x * n.aus.y - n.ein.y * n.aus.x) / (Math.hypot(n.ein.x, n.ein.y) * Math.hypot(n.aus.x, n.aus.y) || 1));
  }
  pruefe(maxP <= 1e-9, `drei Knoten exakt um 90° gedreht (${maxP.toExponential(1)})`);
  pruefe(kollinear <= 1e-9, `glatte Griffe auf einer Geraden (${kollinear.toExponential(1)})`);
  const unberuehrt = start.profile.seite.knoten.every((k, i) => sel.includes(i) || JSON.stringify(k) === JSON.stringify(neu.knoten[i]));
  pruefe(unberuehrt, 'nicht gewählte Knoten bitgleich');
  await ruhig();
}

// ---------- Abbrechen: Esc, Rechtsklick, ⌘Z, Fokusverlust; Pfeile, Tab, Rad ----------
console.log('Abbrechen und gesperrte Tasten während G');
await page.evaluate(() => window.__modal.zuruecksetzen());
for (const art of ['Esc', 'Rechtsklick', '⌘Z', 'Fokusverlust']) {
  const k = await knoten('seite', 2);
  await page.mouse.click(k.x, k.y);
  await ruhig();
  const vorher = await zustand();
  const ansicht = await page.evaluate(() => JSON.stringify([window.__stores.ui.getState().ansichten, window.__stores.ui.getState().maximiert]));
  await tasten('g');
  for (let i = 1; i <= 12; i++) await page.mouse.move(k.x + 3 * i, k.y - 2 * i);
  const imZug = await zustand();
  pruefe(imZug.dok !== vorher.dok, `${art}: G folgt dem Zeiger ohne Maustaste`);
  if (art === 'Esc') {
    // während G: Pfeile, Tab und Rad tun nichts
    await tasten('ArrowLeft', 'Tab', 'Delete');
    await page.mouse.wheel(0, -240);
    const z = await zustand();
    const ansicht2 = await page.evaluate(() => JSON.stringify([window.__stores.ui.getState().ansichten, window.__stores.ui.getState().maximiert]));
    pruefe(z.dok === imZug.dok && ansicht2 === ansicht && z.modal, 'Pfeil, Tab, Entf und Mausrad ändern während G nichts (kein Zoom, kein Layoutwechsel)');
    await tasten('Escape');
  } else if (art === 'Rechtsklick') {
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
  } else if (art === '⌘Z') await tasten('Meta+z');
  else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(200);
  const nach = await zustand();
  pruefe(!nach.modal && nach.dok === vorher.dok && nach.verlauf === vorher.verlauf && nach.auswahl === vorher.auswahl && !nach.menue, `${art} bricht ab: Dokument, Verlauf und Auswahl wie vorher${nach.menue ? ' (Kontextmenü offen!)' : ''}`);
}
const zeit = await page.evaluate(() => ({ max: window.__modal.max, zuege: window.__modal.zuege }));
pruefe(zeit.max <= 16, `Zeit je Mausbewegung höchstens ${zeit.max.toFixed(1)} ms über ${zeit.zuege} Bewegungen (Tor 16 ms)`);
await ruhig();

// ---------- P-Linie: G X 10 Enter ----------
console.log('P-Linie: G X 10 Enter');
{
  await tasten('Escape', 'Escape');
  const s = await blatt('seite');
  // drei Punkte innerhalb des Körpers: um die Mitte des Rahmens der Knoten
  const kz = await page.locator('.vp-ober[data-view="seite"] [data-knoten] .knoten-punkt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })));
  const c = { x: (Math.min(...kz.map((p) => p.x)) + Math.max(...kz.map((p) => p.x))) / 2, y: (Math.min(...kz.map((p) => p.y)) + Math.max(...kz.map((p) => p.y))) / 2 };
  await tasten('p');
  for (const [dx, dy] of [[-25, 0], [0, -4], [25, 0]]) await page.mouse.click(c.x + dx, c.y + dy);
  await tasten('Enter', 'a');
  await ruhig();
  const start = await dok();
  const ki = (start.kanten?.length ?? 0) - 1;
  const ka = await page.evaluate(() => window.__stores.ui.getState().kantenAuswahl);
  pruefe(ki >= 0 && ka?.kante === ki && ka.indizes.length === 3, `P-Linie mit drei Knoten gezeichnet und gewählt (${JSON.stringify(ka)})`);
  if (ki >= 0) {
    await page.mouse.move(s.cx + 80, s.cy + 60);
    await tasten('g');
    pruefe(await page.evaluate(() => window.__modal.ziel() === 'kante'), 'G greift die Knoten der P-Linie');
    await tasten('x', '1', '0', 'Enter');
    const neu = (await dok()).kanten[ki];
    const d = start.kanten[ki].knoten.map((k, i) => [(neu.knoten[i].p[0] - k.p[0]) * PX, (neu.knoten[i].p[1] - k.p[1]) * PX]);
    pruefe(d.every(([dx, dy]) => Math.abs(dx - 10) <= 1e-6 && Math.abs(dy) <= 1e-6), `alle Knoten 10 px nach hinten, auf der Haut (${d.map(([dx, dy]) => `${dx.toFixed(4)}|${dy.toFixed(4)}`).join(', ')})`);
    await ruhig();
    await tasten('Meta+z');
    await page.waitForTimeout(300);
    pruefe(JSON.stringify((await dok()).kanten) === JSON.stringify(start.kanten), '⌘Z stellt die P-Linie her');
    await ruhig();
  }
}

// ---------- Spant: S ohne Auswahl = Spant-Werkzeug; zwei Punkte S 1,5 ----------
console.log('Spant: S ohne Auswahl, dann S 1,5 Enter auf zwei Punkten');
{
  await tasten('Escape', 'Escape');
  const s = await blatt('seite');
  await page.mouse.move(s.cx - 20, s.cy + 10);
  await tasten('s');
  const wz = await page.evaluate(() => window.__stores.ui.getState().werkzeug);
  pruefe(wz === 'spant', `S ohne Auswahl wählt weiter das Spant-Werkzeug („${wz}“)`);
  const k1 = await knoten('seite', 1);
  await page.mouse.click(s.cx - 30, (k1.y + s.cy) / 2);
  await tasten('a');
  await ruhig();
  const d0 = await dok();
  pruefe((d0.spanten?.length ?? 0) === 1, `Spant gesetzt (${d0.spanten?.length ?? 0})`);
  if (d0.spanten?.length) {
    const a = await mitte('.vp-ober[data-view="front"] [data-spantknoten="0:1"] circle');
    const b = await mitte('.vp-ober[data-view="front"] [data-spantknoten="0:2"] circle');
    if (!a || !b) pruefe(false, 'Spantpunkte 1 und 2 in der Front');
    else {
      await page.mouse.click(a.x, a.y);
      await page.keyboard.down('Shift');
      await page.mouse.click(b.x, b.y);
      await page.keyboard.up('Shift');
      const sa = await page.evaluate(() => window.__stores.ui.getState().spantAuswahl);
      const start = await dok();
      const f = await blatt('front');
      await page.mouse.move(f.cx + 70, f.cy);
      await tasten('s');
      pruefe(await page.evaluate(() => window.__modal.ziel() === 'spant'), `S greift die Spantpunkte (${JSON.stringify(sa)})`);
      await tasten('1', ',', '5', 'Enter');
      const alt = start.spanten[0].profil.knoten;
      const neu = (await dok()).spanten[0].profil.knoten;
      const [i, j] = sa.knoten;
      const c = { x: (alt[i].p.x + alt[j].p.x) / 2, y: (alt[i].p.y + alt[j].p.y) / 2 };
      const fehlerMax = Math.max(...[i, j].flatMap((n) => [Math.abs(neu[n].p.x - (c.x + 1.5 * (alt[n].p.x - c.x))), Math.abs(neu[n].p.y - (c.y + 1.5 * (alt[n].p.y - c.y)))]));
      const front = JSON.stringify(start.profile.front) === JSON.stringify((await dok()).profile.front);
      pruefe(fehlerMax <= 1e-9 && front, `zwei Spantpunkte exakt um 1,5 auseinander (${fehlerMax.toExponential(1)}), Front unverändert`);
      await ruhig();
    }
  }
}

// ---------- fremder Ring: G 15 Enter in der Seite ----------
console.log('Fremder Ring: Front-Knoten im Seitenblatt');
{
  await tasten('Escape', 'Escape');
  const r = await mitte('.vp-ober[data-view="seite"] [data-netz-knoten="front:1"] circle');
  if (!r) pruefe(false, 'Ring des Front-Knotens 1 im Seitenblatt');
  else {
    await page.mouse.click(r.x, r.y);
    await ruhig();
    const start = await dok();
    const s = await blatt('seite');
    await page.mouse.move(s.cx + 90, s.cy - 70);
    await tasten('r');
    const hinweis = await page.evaluate(() => window.__stores.ui.getState().hinweis?.text ?? '');
    pruefe(!(await page.evaluate(() => window.__modal.aktiv())) && /R dreht nur/.test(hinweis), `R auf einem fremden Ring: Hinweis „${hinweis.slice(0, 60)}…“`);
    await tasten('g');
    pruefe(await page.evaluate(() => window.__modal.ziel() === 'fremd'), 'G greift den fremden Ring');
    await tasten('1', '5', 'Enter');
    const alt = start.profile.front.knoten[1].p;
    const neu = (await dok()).profile.front.knoten[1].p;
    pruefe(neu.x === alt.x && Math.abs((neu.y - alt.y) * PX - 15) <= 1e-9, `Front-Knoten 1 genau 15 px in y (Δy ${((neu.y - alt.y) * PX).toFixed(9)}, Δx ${((neu.x - alt.x) * PX).toFixed(9)})`);
    await ruhig();
  }
}

// ---------- ohne Auswahl; ⌘R ----------
console.log('Ohne Auswahl und ⌘R');
{
  await tasten('Escape', 'Escape');
  const s = await blatt('seite');
  await page.mouse.move(s.cx, s.cy);
  await tasten('g');
  pruefe((await page.evaluate(() => window.__stores.ui.getState().werkzeug)) === 'ziehen' && !(await page.evaluate(() => window.__modal.aktiv())), 'G ohne Auswahl wählt den Pinsel „Ziehen“');
  await tasten('a', 'r');
  const h = await page.evaluate(() => window.__stores.ui.getState().hinweis?.text ?? '');
  pruefe(/R dreht die Auswahl/.test(h), `R ohne Auswahl: Hinweis „${h}“`);
  await tasten('Meta+r');
  await page.waitForTimeout(800);
  pruefe(await page.evaluate(() => window.__nichtNeuGeladen === true), '⌘R lädt das Fenster nicht neu');
}

await page.screenshot({ path: `${out}/v3-ende-${name}.png` });
await browser.close();
console.log(fehler ? `${fehler} Fehler` : 'alle Prüfungen ok');
process.exit(fehler ? 1 : 0);
