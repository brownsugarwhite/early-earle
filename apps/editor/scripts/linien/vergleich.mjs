// Vergleichsbilder der Probe „Linien, Punkte, Zeiger“ zu Florians Entwurf (14.11.2026). Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/vergleich.mjs <zielordner> [name]
// Rechnet an den vier Stellen, an denen im Entwurf ein Zeiger steht, je ein Bild (Zeiger dort, Animation ausgeschwungen) und legt
// sie übereinander (dunkler gewinnt); die Zeiger kommen danach obenauf. Zwei Ausschnitte: ganz (wie das erste Entwurfsbild, 2000 ×
// 1155) und nah (wie das zweite, 2000 × 1640). Daneben jeweils Florians Entwurf.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [ordner = '../../docs/progress/linien', name = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);
const URL = process.env.URL ?? 'http://localhost:5199';
// Spitzen der Zeiger im Entwurf (Punkte des Entwurfs; aus dem Nahbild abgelesen)
const SPITZEN = [
  [573.9, 280.8],
  [657.7, 271.7],
  [701.8, 316.5],
  [637.6, 348.9],
].map(([x, y]) => [(x * 2) / 3, (y * 2) / 3]);
// Woher der Zeiger jeweils kommt (in Punkten des Entwurfs, relativ zur Spitze)
const ANFLUG = [
  [12, 15],
  [15, 4],
  [7, 17],
  [13, 12],
];
// Florians Entwürfe über den Dev-Server (Vite liefert Dateien im Arbeitsbaum unter /@fs/)
const ENTWURF = (datei) => `/@fs${path.resolve('../../docs/look/linien', datei)}`;
const AUSSCHNITTE = [
  { name: 'gesamt', x0: 0, y0: 0, breite: 666.67, hoehe: 385, entwurf: ENTWURF('2026-11-14-florian-fisch-entwurf.webp') },
  { name: 'nah', x0: 346.67, y0: 140.4, breite: 173.13, hoehe: 142, entwurf: ENTWURF('2026-11-14-florian-fisch-entwurf-nah.webp') },
];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const a of AUSSCHNITTE) {
  const z = 1000 / a.breite;
  const hoehe = Math.round(a.hoehe * z);
  const page = await browser.newPage({ viewport: { width: 1000, height: hoehe }, deviceScaleFactor: 2 });
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  await page.goto(`${URL}/linien.html?bild=1`);
  await page.waitForFunction(() => window.__linien !== undefined);
  await page.evaluate(
    ({ z, x0, y0 }) => {
      const L = window.__linien;
      L.ansicht.z = z;
      L.ansicht.ox = -x0 * z;
      L.ansicht.oy = -y0 * z;
      L.verhalten.zeigerZeigen = false;
      L.vorspulen(50);
    },
    { z, x0: a.x0, y0: a.y0 },
  );
  const bilder = [];
  for (let i = 0; i < SPITZEN.length; i++) {
    const [tx, ty] = SPITZEN[i];
    const [ax, ay] = ANFLUG[i];
    // Anflug in Schritten (wie eine echte Bewegung), dann ausschwingen lassen
    await page.evaluate(
      ({ tx, ty, ax, ay, z, x0, y0 }) => {
        const L = window.__linien;
        const n = 24;
        for (let k = 0; k <= n; k++) {
          const f = k / n;
          const x = tx + ax * (1 - f);
          const y = ty + ay * (1 - f);
          L.zeigerHin((x - x0) * z, (y - y0) * z, 16);
          L.vorspulen(16);
        }
        L.vorspulen(900);
      },
      { tx, ty, ax, ay, z, x0: a.x0, y0: a.y0 },
    );
    bilder.push((await page.screenshot({ type: 'png' })).toString('base64'));
    // Zeiger weg, alles zurück in Ruhe
    await page.evaluate(() => {
      const L = window.__linien;
      L.verhalten.zeigerWeg();
      L.vorspulen(1500);
    });
  }
  // übereinanderlegen, Zeiger obenauf, daneben der Entwurf
  const ergebnis = await page.evaluate(
    async ({ bilder, spitzen, z, x0, y0, entwurf }) => {
      const laden = (src) =>
        new Promise((ok, nein) => {
          const im = new Image();
          im.onload = () => ok(im);
          im.onerror = nein;
          im.src = src;
        });
      const ims = await Promise.all(bilder.map((b) => laden(`data:image/png;base64,${b}`)));
      const W = ims[0].width;
      const H = ims[0].height;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'darken';
      for (const im of ims) g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'source-over';
      const D = W / 1000;
      const L = 9.5 * z * D;
      for (const [tx, ty] of spitzen) {
        const x = (tx - x0) * z * D;
        const y = (ty - y0) * z * D;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + L * Math.cos((32 * Math.PI) / 180), y + L * Math.sin((32 * Math.PI) / 180));
        g.lineTo(x + L * Math.cos((80 * Math.PI) / 180), y + L * Math.sin((80 * Math.PI) / 180));
        g.closePath();
        g.fillStyle = '#fff';
        g.fill();
        g.lineWidth = 0.5 * z * D;
        g.strokeStyle = '#1f1a17';
        g.stroke();
      }
      const ent = await laden(entwurf);
      // nebeneinander: links Entwurf, rechts Probe, gleich groß
      const out = document.createElement('canvas');
      out.width = W * 2 + 40;
      out.height = H;
      const o = out.getContext('2d');
      o.fillStyle = '#fff';
      o.fillRect(0, 0, out.width, out.height);
      o.drawImage(ent, 0, 0, W, H);
      o.drawImage(c, W + 40, 0);
      o.fillStyle = 'rgba(31,26,23,0.12)';
      o.fillRect(W + 19, 0, 2, H);
      return { probe: c.toDataURL('image/png').split(',')[1], beide: out.toDataURL('image/jpeg', 0.9).split(',')[1] };
    },
    { bilder, spitzen: SPITZEN, z, x0: a.x0, y0: a.y0, entwurf: a.entwurf },
  );
  fs.writeFileSync(path.join(ordner, `${name}-probe-${a.name}.png`), Buffer.from(ergebnis.probe, 'base64'));
  fs.writeFileSync(path.join(ordner, `${name}-vergleich-${a.name}.jpg`), Buffer.from(ergebnis.beide, 'base64'));
  console.log('geschrieben:', a.name, fehler.length ? `Fehler: ${fehler.join(' | ')}` : '');
  await page.close();
}
await browser.close();
