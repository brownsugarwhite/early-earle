// Form zuerst (04.11.2026), Probe „Linien aus dem Netz“: Florians Vierbeiner aus dem Screenshot (Kopf in der Seite höher als
// die gezeichnete Front), einmal wie heute und einmal mit `?netz`. Mit der Maus wie Florian: Kopfpunkt der Seite kurz ziehen
// (die Seite führt), dann im Top eine Flosse hinausziehen (das Top führt), dann den Kopf tiefer (die Seite führt). Nach jedem
// Schritt Bild und der größte Abstand je Ansicht zwischen Linie und Umriss des Meshes.
// Aufruf aus apps/editor: node scripts/pruefen/form-netz-probe.mjs <ordner>
// Erwartet den Vite-Server des Arbeitsbaums (FORM_URL, Standard http://localhost:5193/form.html).
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.FORM_URL ?? 'http://localhost:5193/form.html';
const p = (x, y, ecke = false) => (ecke ? { x, y, ecke } : { x, y });
// aus dem Screenshot abgelesen (Welt-Einheiten, Schnauze links)
const SEITE = [
  p(-380.6, 188.3), p(-84.5, 195.1), p(150.5, 142.7), p(362.1, 148.5), p(432.0, 83.5), p(182.5, 81.6), p(141.7, 31.1),
  p(111.7, 20.4, true), p(111.7, -98.1, true), p(59.2, -98.1, true), p(59.2, 8.7, true), p(-62.1, 8.7, true),
  p(-62.1, -98.1, true), p(-113.6, -98.1, true), p(-113.6, 20.4, true), p(-144.7, 31.1), p(-185.4, 81.6),
];
const FRONT = [
  p(0, 196.1), p(78.6, 135), p(112.6, 81.6), p(102.9, 44.7), p(86.4, 33.0, true), p(86.4, -98.1, true), p(35.0, -98.1, true),
  p(35.0, 8.7, true), p(0, 8.7),
];

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
    nachgefuehrt: window.__form.nachgefuehrt,
    ms: Math.round(window.__form.ms),
  }));
  console.log(name, JSON.stringify({ ...info, abstand: rund(info.abstand) }));
  await seite.screenshot({ path: `${ordner}/form-netz-${name}.jpg`, type: 'jpeg', quality: 88 });
};
/** Bildschirmpunkt eines Punkts (Seite: data-punkt, Front/Top: data-ppunkt) */
const punktMitte = (sel) =>
  seite.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, sel);
/** Welt-Einheiten → Bildschirm-Pixel */
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

// heute: alle Ansichten begrenzen, die Seite zeigt die gezeichnete Linie
await seite.goto(basis);
await fertig();
await seite.evaluate(([s, f]) => window.__formSetzen(s, [], f, null), [SEITE, FRONT]);
await fertig();
await stand('heute');

// Probe: Linien aus dem Netz
await seite.goto(`${basis}?netz`);
await fertig();
await seite.evaluate(([s, f]) => window.__formSetzen(s, [], f, null), [SEITE, FRONT]);
await fertig();
await stand('vorher');
const k = await skala();
// Florian zieht den Kopfpunkt der Seite (hier um 2 px): die Seite führt
await ziehen('[data-punkt="0"]', 0, -2);
await stand('seite-fuehrt');
// im Top den mittleren Punkt 70 Einheiten hinaus (im Top liegt +z unten): das Top führt
const top = await seite.evaluate(() => window.__form.top.length);
await ziehen(`[data-ppunkt="top:${Math.floor(top / 2)}"]`, 0, 70 * k);
await stand('top-fuehrt');
// den Kopf in der Seite wieder 60 Einheiten tiefer: die Front gibt ihn wieder her
await ziehen('[data-punkt="0"]', 0, 60 * k);
await stand('kopf-tiefer');
if (fehler.length) console.log('Fehler:', fehler);
await browser.close();
