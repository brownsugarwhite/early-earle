// Nimmt die Bilder der Studie „Maul, Zähne, Zunge“ (maul.html) auf: alle echt aus dem Fenster, über die Haken `window.__maul`.
// Aufruf aus apps/editor: node scripts/ozzy/maul-studie-bilder.mjs <zielordner>   (MAUL_URL=… für ein anderes Fenster)
// Danach setzt `maul-studie-bogen.mjs` daraus die Bildblätter.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const BASIS = process.env.MAUL_URL ?? 'http://localhost:5205/maul.html';
const ziel = path.resolve(process.argv[2] ?? '.');
fs.mkdirSync(ziel, { recursive: true });
const B = 1100;
const H = 760;
const browser = await chromium.launch({ args: GPU_ARGS });
const fehler = [];

async function seite(form) {
  const s = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  await s.goto(`${BASIS}?ruhe=1&form=${encodeURIComponent(form)}`);
  await s.waitForFunction(() => window.__maul?.bereit || window.__maul?.fehler, null, { timeout: 90000 });
  // die Meldung vom Start soll nicht in jedem Bild stehen
  await s.addStyleTag({ content: '#meldung{display:none!important}' });
  return s;
}
const M = (s, f, ...a) => s.evaluate(([f2, a2]) => window.__maul[f2](...a2), [f, a]);
async function bild(s, name, clip) {
  await s.waitForTimeout(450);
  const p = path.join(ziel, `${name}.jpg`);
  await s.screenshot({ path: p, type: 'jpeg', quality: 90, ...(clip ? { clip } : {}) });
  console.log(name);
}

// ---------- „teat firefish“ ----------
const K = [-695, 148, 0];
const NAH = [-705, 140, 0];
{
  const s = await seite('teat firefish');
  const zahlen = {};
  // 1 die Form, wie sie ist
  await M(s, 'maul', false);
  await M(s, 'blick', -0.75, 0.22, 1.15);
  await bild(s, 'a1-form');
  // 2 eine Linie: zu
  await M(s, 'maul', true);
  await M(s, 'kiefer', 0, 0);
  await M(s, 'blick', 0, 0, 5, K);
  await bild(s, 'a2-zu-seite');
  // gemessen: zu gegen die Form ohne Maul
  for (const [n, g, ne] of [
    ['seite', 0, 0],
    ['schraeg', -0.95, 0.14],
    ['front', -Math.PI / 2, 0.05],
  ]) {
    await M(s, 'blickMaul', g, ne);
    zahlen[n] = await M(s, 'vergleich');
  }
  await s.addStyleTag({ content: '.pille.quillt{animation:none!important}' });
  // 3 bis 5 offen: Seite, schräg, Front
  await M(s, 'kiefer', 10, 34);
  await M(s, 'blick', 0, 0, 5, K);
  await bild(s, 'a3-offen-seite');
  await M(s, 'blick', -0.95, 0.14, 5, K);
  await bild(s, 'a4-offen-schraeg');
  await M(s, 'blick', -Math.PI / 2 + 0.1, 0.2, 5, K);
  await bild(s, 'a5-offen-front');
  // 6, 7 jeder Kiefer für sich
  await M(s, 'blick', -0.6, 0.1, 5, K);
  await M(s, 'kiefer', 0, 40);
  await bild(s, 'a6-nur-unten');
  await M(s, 'kiefer', 28, 0);
  await bild(s, 'a7-nur-oben');
  // 8 die Linien der Form reißen an der Lippe
  await M(s, 'zunge', false);
  await M(s, 'kiefer', 9, 26);
  await M(s, 'blick', -1.25, 0.32, 8, [-735, 150, 0]);
  await bild(s, 'a8-linien');
  await M(s, 'zunge', true);
  // 9 weit offen
  await M(s, 'kiefer', 22, 70);
  await M(s, 'blick', -0.8, 0.12, 4, K);
  await bild(s, 'a9-weit');
  zahlen.kieferMs = await M(s, 'kieferZeit', 40);
  zahlen.schnitt = (await M(s, 'info')).schnitt;

  // ---------- Zähne ----------
  await M(s, 'kiefer', 12, 42);
  await M(s, 'blick', -1.0, 0.2, 6.5, NAH);
  // sprießen: ein Bild mittendrin
  await M(s, 'zaehne', true, false);
  await s.waitForTimeout(330);
  await s.screenshot({ path: path.join(ziel, 'b0-spriessen.jpg'), type: 'jpeg', quality: 90 });
  await s.waitForTimeout(900);
  await M(s, 'zaehne', true, true);
  await bild(s, 'b1-zaehne');
  // die Reihe gewählt: die Linse geht auf
  await M(s, 'blick', -1.0, 0.2, 4.2, [-640, 170, 0]);
  await M(s, 'waehlen', 'oben');
  await s.waitForTimeout(800);
  await bild(s, 'b2-linse');
  const linse = { x: B - 360, y: 0, width: 360, height: 364 };
  await bild(s, 'b3-linse-nah', linse);
  // der Drehregler: wirklich gedreht (die Zahl steht nur, solange man dreht)
  const mx = B - 4 - 178;
  const my = 4 + 178;
  await s.mouse.move(mx + 166, my);
  await s.mouse.down();
  for (let i = 1; i <= 12; i++) {
    const w = (i / 12) * (Math.PI / 3);
    await s.mouse.move(mx + 166 * Math.cos(w), my + 166 * Math.sin(w));
    await s.waitForTimeout(16);
  }
  await s.screenshot({ path: path.join(ziel, 'b4-rad-dreht.jpg'), type: 'jpeg', quality: 90, clip: linse });
  await s.mouse.up();
  zahlen.nachDrehen = (await M(s, 'info')).zaehne;
  await s.waitForTimeout(500);
  await M(s, 'blick', -1.0, 0.2, 6.5, NAH);
  await M(s, 'waehlen', null);
  await bild(s, 'b5-mehr-zaehne');
  // Vorlagen: beide Kiefer
  const beide = async (i) => {
    for (const k of ['oben', 'unten']) {
      await M(s, 'waehlen', k);
      await M(s, 'vorlage', i);
    }
    await M(s, 'waehlen', null);
  };
  for (const k of ['oben', 'unten']) {
    await M(s, 'waehlen', k);
    await M(s, 'perle', '#', k === 'oben' ? 12 : 11);
  }
  await beide(2);
  await bild(s, 'b6-saebel');
  await beide(4);
  await bild(s, 'b7-blob');
  for (const k of ['oben', 'unten']) {
    await M(s, 'waehlen', k);
    await M(s, 'perle', '#', 8);
    await M(s, 'perle', 'V', 0.1);
  }
  await beide(6);
  await bild(s, 'b8-backe');
  // wenige große, viele kleine
  for (const k of ['oben', 'unten']) {
    await M(s, 'waehlen', k);
    await M(s, 'perle', 'V', 0.45);
    await M(s, 'perle', '#', k === 'oben' ? 26 : 25);
  }
  await beide(3);
  await bild(s, 'b9-viele');
  // ein einzelner Zahn: gewählt, groß, eigene Form (mit der Linse)
  for (const k of ['oben', 'unten']) {
    await M(s, 'waehlen', k);
    await M(s, 'perle', '#', k === 'oben' ? 12 : 11);
  }
  await beide(0);
  await M(s, 'blick', -1.0, 0.2, 4.2, [-640, 170, 0]);
  await M(s, 'waehlen', 'oben');
  await M(s, 'waehlen', 'oben', 4);
  await M(s, 'vorlage', 7);
  await M(s, 'perle', 'G', 1.7);
  await s.waitForTimeout(600);
  await bild(s, 'b10-einzeln');
  await bild(s, 'b11-linse-einzeln', linse);
  // Zähne außen, über der geschlossenen Lippe
  await M(s, 'waehlen', 'oben');
  await M(s, 'perle', '#', 6);
  await M(s, 'vorlage', 1);
  await M(s, 'perle', 'G', 1.25);
  await M(s, 'perle', 'V', 0.55);
  await M(s, 'perle', 'S', -0.9);
  await M(s, 'perle', 'N', 0.05);
  await M(s, 'waehlen', null);
  await M(s, 'zaehne', true, true);
  await M(s, 'kiefer', 0, 0);
  await M(s, 'blick', -0.7, 0.1, 4.6, K);
  await bild(s, 'b12-aussen-zu');
  await s.close();

  // ---------- Zunge ----------
  const t = await seite('teat firefish');
  await M(t, 'kiefer', 14, 46);
  await M(t, 'blick', -1.0, 0.2, 6.5, NAH);
  await bild(t, 'c1-zunge-liegt');
  await M(t, 'zungeZiehen', -0.9, 0.25, 0.3, true);
  await bild(t, 'c2-zunge-gezogen');
  await M(t, 'zungeZiehen', -0.12, -0.5, 0.0, true);
  await bild(t, 'c3-zunge-haengt');
  await t.close();
  fs.writeFileSync(path.join(ziel, 'zahlen.json'), JSON.stringify(zahlen, null, 2));
  console.log(JSON.stringify(zahlen));
}

// ---------- „strange bird“: eine Linie zeichnen ----------
{
  const s = await seite('strange bird');
  const strich = [
    { x: -548, y: 124 },
    { x: -510, y: 122 },
    { x: -470, y: 128 },
    { x: -430, y: 140 },
    { x: -395, y: 150 },
  ];
  await M(s, 'stift', true);
  await s.waitForTimeout(300);
  await M(s, 'blick', 0, 0, 2.6, [-430, 90, 0]);
  await M(s, 'strich', strich);
  await s.waitForTimeout(700);
  await bild(s, 'd1-strich');
  await M(s, 'strich', strich, true);
  await s.waitForTimeout(2200);
  await M(s, 'kiefer', 10, 30);
  await M(s, 'blick', -0.8, 0.15, 3.2, [-470, 90, 0]);
  await bild(s, 'd2-maul');
  await s.close();
}

await browser.close();
if (fehler.length) console.log('Fehler:', fehler.slice(0, 8));
