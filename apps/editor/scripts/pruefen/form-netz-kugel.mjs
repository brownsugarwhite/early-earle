// Form zuerst (04.11.2026), Probe „Linien aus dem Netz“ im Ablauf aus der Startkugel: mit `?netz` die Seite oben höher ziehen,
// dann in der Front einen Punkt hinaus, dann im Top einen Punkt hinein, dann ⌘Z — nach jedem Schritt der größte Abstand je
// Ansicht zwischen Linie und Umriss des Meshes und die Punktzahlen. Schreibt ein Bild des letzten Stands.
// Aufruf aus apps/editor: node scripts/pruefen/form-netz-kugel.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.FORM_URL ?? 'http://localhost:5193/form.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
const fertig = async () => {
  await seite.waitForFunction(() => window.__form?.fein === true);
  await seite.waitForTimeout(300);
};
const rund = (o) => (o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 10) / 10])) : o);
const stand = async (name) => {
  const info = await seite.evaluate(() => ({
    abstand: window.__formAbstand?.(),
    punkte: { seite: window.__form.punkte.length, front: window.__form.front?.length ?? null, top: window.__form.top?.length ?? null },
    nachgefuehrt: Object.fromEntries(Object.entries(window.__form.nachgefuehrt).map(([k, v]) => [k, `${v.neu} neu, ${v.behalten} behalten`])),
  }));
  console.log(name, JSON.stringify({ ...info, abstand: rund(info.abstand) }));
};
const punktMitte = (sel) =>
  seite.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, sel);
const skala = () =>
  seite.evaluate(() => {
    const r = document.getElementById('feld-seite').getBoundingClientRect();
    return Math.min(r.width, r.height) / 560;
  });
const ziehen = async (sel, dx, dy) => {
  const [x, y] = await punktMitte(sel);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await seite.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
    await seite.waitForTimeout(30);
  }
  await seite.mouse.up();
  await fertig();
};

await seite.goto(`${basis}?netz`);
await fertig();
await stand('kugel');
const k = await skala();
// Seite: der obere Punkt (Index 1 der Startkugel) 60 Einheiten höher
await ziehen('[data-punkt="1"]', 0, -60 * k);
await stand('seite-hoeher');
// Front: der mittlere Punkt der Hälfte 60 hinaus (rechts)
const nf = await seite.evaluate(() => (window.__form.front ?? []).length);
const fsel = nf ? `[data-ppunkt="front:${Math.floor(nf / 2)}"]` : '[data-ppunkt="front:1"]';
await ziehen(fsel, 60 * k, 0);
await stand('front-breiter');
// Top: der mittlere Punkt der Hälfte 40 hinein (im Top liegt +z unten, hinein = nach oben)
const nt = await seite.evaluate(() => window.__form.top.length);
await ziehen(`[data-ppunkt="top:${Math.floor(nt / 2)}"]`, 0, -40 * k);
await stand('top-schmaler');
await seite.screenshot({ path: `${ordner}/form-netz-kugel.jpg`, type: 'jpeg', quality: 88 });
// ⌘Z: zurück zum Stand davor, ohne Führung neu gebaut
await seite.keyboard.press('Meta+z');
await fertig();
await stand('zurueck');
if (fehler.length) console.log('Fehler:', fehler);
await browser.close();
