// Prüfblatt: viele Posen in einem Raster als SVG und PNG (über Playwright).
//   npx vite-node scripts/maskottchen/blatt.ts <name> [art]
//   art: kopf (Kopf rundherum, Körper seitlich), koerper (Körper rundherum, Kopf mit), …
import fs from 'node:fs';
import { chromium } from '@playwright/test';
import { Figur } from '../../src/maskottchen/figur';
import { type Pose, RUHE } from '../../src/maskottchen/pose';
import { svgPfad } from '../../src/maskottchen/zeichnen';

const name = process.argv[2] ?? 'blatt';
const art = process.argv[3] ?? 'kopf';
const ordner = process.env.ORDNER ?? '/tmp';
const figur = new Figur();

interface Feld {
  pose: Partial<Pose>;
  text: string;
}
let felder: Feld[] = [];
let rahmen: [number, number, number, number] = [80, -20, 1780, 1640]; // Ausschnitt je Feld (Welt)
let spalten = 6;
if (art === 'kopf') {
  const liste = process.env.WINKEL ? process.env.WINKEL.split(',').map(Number) : Array.from({ length: 24 }, (_, k) => k * 15);
  for (const w of liste) felder.push({ pose: { theta: w > 180 ? w - 360 : w }, text: `θ ${w > 180 ? w - 360 : w}°` });
  rahmen = [380, -20, 1880, 1300];
  spalten = Number(process.env.SPALTEN ?? 8);
} else if (art === 'koerper') {
  for (let w = 90; w > -270; w -= 22.5) {
    const psi = w <= -180 ? w + 360 : w;
    felder.push({ pose: { psi, theta: Math.abs(psi) <= 90 ? psi / 6 : psi }, text: `ψ ${psi}°` });
  }
  rahmen = [-150, -20, 1750, 1640];
  spalten = 8;
} else if (art === 'ausdruck') {
  felder = [
    { pose: {}, text: 'Ruhe' },
    { pose: { brauen: 14 }, text: 'Brauen hoch' },
    { pose: { brauenKipp: 14 }, text: 'entschlossen' },
    { pose: { brauenKipp: -14 }, text: 'besorgt' },
    { pose: { ohrH: 25, ohrV: 25 }, text: 'Ohren hängen' },
    { pose: { ohrH: -18, ohrV: -18 }, text: 'Ohren spitz' },
    { pose: { kopfNeigen: 22, brauen: 10 }, text: 'Kopf schief' },
    { pose: { nase: 1 }, text: 'schnüffeln' },
  ];
  rahmen = [380, -20, 1880, 1300];
  spalten = 4;
} else if (art === 'beine') {
  felder = [
    { pose: {}, text: 'Ruhe' },
    { pose: { beinVN: 20, beinHN: 20, beinVF: -20, beinHF: -20 }, text: 'Passgang' },
    { pose: { beinVN: 20, beinHF: 20, beinVF: -20, beinHN: -20 }, text: 'Trab' },
    { pose: { beinVN: -25, beinVF: -25, beinHN: 25, beinHF: 25 }, text: 'Beine zusammen' },
    { pose: { beinVN: 25, beinVF: 25, beinHN: -25, beinHF: -25 }, text: 'Beine gespreizt' },
    { pose: { nicken: 18 }, text: 'vorn kippen' },
    { pose: { nicken: -18 }, text: 'hinten kippen' },
    { pose: { beinHN: 70, beinHF: 70, nicken: -24 }, text: 'Sitzen' },
  ];
  spalten = 4;
}
// art 'clip': ein Clip über den Mischer abgespielt, Einzelbilder in festen Abständen (CLIP=name, BILDER=n, ABSTAND=s)
const posenFest: Pose[] = [];
if (art === 'clip') {
  const { Spieler } = await import('../../src/maskottchen/spieler');
  const { CLIP } = await import('../../src/maskottchen/clips');
  const name = process.env.CLIP ?? 'laufen';
  const bilder = Number(process.env.BILDER ?? 12);
  const abstand = Number(process.env.ABSTAND ?? (CLIP[name]!.dauer / bilder));
  const sp = new Spieler(figur, process.env.VON ?? 'stehen');
  sp.update(0.016);
  sp.spiele(name, Number(process.env.BLEND ?? 0.01));
  let t = 0;
  const schritt = 1 / 120;
  for (let i = 0; i < bilder; i++) {
    while (t < i * abstand - 1e-9) {
      sp.update(schritt);
      t += schritt;
    }
    const p = { ...sp.update(0.0001) };
    p.x = p.x - (sp.x - 800) * (process.env.MITLAUFEN ? 1 : 0);
    posenFest.push(p);
    felder.push({ pose: {}, text: `${name} ${(i * abstand).toFixed(2)} s` });
  }
  rahmen = [-200, -60, 2000, 1640];
  spalten = Number(process.env.SPALTEN ?? 6);
}
const [rx, ry, rw, rh] = [rahmen[0], rahmen[1], rahmen[2] - rahmen[0], rahmen[3] - rahmen[1]];
const zeilen = Math.ceil(felder.length / spalten);
const S = Number(process.env.MASSSTAB ?? 0.22);
const fw = rw * S;
const fh = rh * S + 26;
let inhalt = '';
felder.forEach((f, i) => {
  const x = (i % spalten) * fw;
  const y = Math.floor(i / spalten) * fh;
  const pose: Pose = posenFest[i] ?? { ...RUHE, ...f.pose };
  if (!posenFest[i]) figur.boden(pose, art === 'beine' ? 1 : 0);
  const teile = figur.zeichenteile(pose);
  inhalt += `<g transform="translate(${x},${y}) scale(${S}) translate(${-rx},${-ry})">`;
  inhalt += `<line x1="${rx}" y1="1573" x2="${rx + rw}" y2="1573" stroke="#ddd" stroke-width="4"/>`;
  for (const t of teile) inhalt += `<path fill="${t.farbe === 'schwarz' ? '#1f1a17' : '#fff'}" d="${svgPfad(t)}"/>`;
  inhalt += `</g><text x="${x + 8}" y="${y + fh - 8}" font-family="system-ui" font-size="15" fill="#1f1a17">${f.text}</text>`;
  inhalt += `<rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="none" stroke="#eee"/>`;
});
const W = Math.ceil(fw * spalten);
const H = Math.ceil(fh * zeilen);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>${inhalt}</svg>`;
fs.writeFileSync(`${ordner}/${name}.svg`, svg);
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: W, height: H } });
await seite.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await seite.screenshot({ path: `${ordner}/${name}.png`, clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
console.log(`${ordner}/${name}.png`, W, H);
