// Prüfblatt aus der laufenden Seite (flüssig, wie auf der Bühne): öffnet maskottchen.html im Browser, zeichnet ein Raster aus
// Posen und fotografiert es.
//   ART=kopf|koerper|clip|posen  [WINKEL=0,15,…] [CLIP=laufen BILDER=12 ABSTAND=0.1] [POSEN='[{"theta":40}]'] [GLAETTE=14]
//   node scripts/maskottchen/seitenblatt.mjs <aus.png>
import { chromium } from '@playwright/test';

const aus = process.argv[2] ?? '/tmp/blatt.png';
const url = process.env.URL ?? 'http://localhost:5207/maskottchen.html?reiter=drehen';
const art = process.env.ART ?? 'kopf';
const breite = Number(process.env.BREITE ?? 1800);
const hoehe = Number(process.env.HOEHE ?? 900);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const seite = await browser.newPage({ viewport: { width: breite + 320, height: hoehe }, deviceScaleFactor: 1 });
await seite.goto(url);
await seite.waitForFunction(() => (window).__ozzy);
await seite.addStyleTag({ content: '#kopfzeile, #hud { display: none !important; }' });
const box = await seite.evaluate(
  ({ art, env }) => {
    const o = window.__ozzy;
    o.buehne.glaette = Number(env.GLAETTE ?? 14);
    // zur Fehlersuche: weiße Teile durchscheinend färben (z. B. WEISS='rgba(255,0,0,0.45)')
    if (env.WEISS) o.buehne.farben = { ...o.buehne.farben, weiss: env.WEISS };
    // zur Fehlersuche: Teile ausblenden (z. B. OHNE=schopf,ohrV)
    if (env.OHNE) o.figur.ausblenden = new Set(env.OHNE.split(','));
    if (env.BUNT) o.buehne.bunt = true;
    let posen = [];
    let texte = [];
    let rahmen = [380, -20, 1880, 1640];
    let spalten = Number(env.SPALTEN ?? 6);
    if (art === 'kopf') {
      const w = (env.WINKEL ?? '0,15,30,45,60,75,90,105,120,135,150,180').split(',').map(Number);
      posen = w.map((t) => ({ ...o.RUHE, theta: t }));
      texte = w.map((t) => `θ ${t}°`);
      rahmen = [380, -20, 1880, 1300];
    } else if (art === 'koerper') {
      const w = (env.WINKEL ?? '90,60,30,0,-30,-60,-90').split(',').map(Number);
      posen = w.map((psi) => ({ ...o.RUHE, psi, theta: Math.abs(psi) <= 90 ? psi / 6 : psi }));
      texte = w.map((t) => `ψ ${t}°`);
      rahmen = [-150, -20, 1750, 1640];
    } else if (art === 'clip') {
      const n = Number(env.BILDER ?? 12);
      const a = Number(env.ABSTAND ?? 0.1);
      posen = o.clipPosen(env.CLIP ?? 'laufen', n, a, env.VON ?? 'stehen');
      texte = posen.map((_, i) => `${env.CLIP ?? 'laufen'} ${(i * a).toFixed(2)} s`);
      rahmen = [-250, -60, 2050, 1640];
    } else {
      posen = JSON.parse(env.POSEN ?? '[{}]').map((p) => ({ ...o.RUHE, ...p }));
      texte = posen.map((p, i) => env.TEXTE?.split('|')[i] ?? '');
    }
    if (env.RAHMEN) rahmen = JSON.parse(env.RAHMEN);
    for (const p of posen) if (p.boden > 0 && art !== 'clip') o.figur.boden(p, 0);
    o.blattZeichnen(posen, texte, Math.min(spalten, posen.length), rahmen);
    const r = o.buehne.grund.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  },
  { art, env: process.env },
);
await seite.waitForTimeout(150);
await seite.screenshot({ path: aus, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
await browser.close();
console.log(aus);
