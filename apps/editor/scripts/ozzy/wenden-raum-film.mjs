// Film zu B2 (Plan „Ozzy stabil und schnell“, 17.11.2026): ⇧ + Ziehen wendet das Feld der Seite in den Vier Ansichten, an „strange
// bird“ (NAME). Oben wie bis zum 17.11. (die Zeichnung wird gestaucht: ein flaches Blatt), unten räumlich. Dieselbe Bewegung, Bild für
// Bild (60 je Sekunde): eine halbe Drehung, loslassen, und zurück.
// „Vorher“ ist für diesen Lauf im ausgelieferten Modul nachgestellt (die Tiefe zählt nicht, die Seite zeigt eine Hälfte), der
// Arbeitsbaum bleibt dabei, wie er ist.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/wenden-raum-film.mjs [ziel.mp4]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auf, GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = process.argv[2] ?? path.join(hier, '../../../../docs/progress/ozzy/2026-11-17-feld-wenden-raeumlich.mp4');
const NAME = process.env.NAME ?? 'strange bird';
const DT = 1 / 60;
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-wenden-raum-'));
const FLACH = {
  '**/src/ozzy/main.ts*': [
    ['const sn = Math.sin(phi);\n\tconst R = n === "front"', 'const sn = 0;\n\tconst R = n === "front"'],
    ['const raeumlich = t > .999 && Math.abs(Math.sin(feldWende[n].phi)) > 1e-4;', 'const raeumlich = false;'],
  ],
};
/** sanft an und aus */
const sanft = (u) => u * u * (3 - 2 * u);

const aufnehmen = async (name, flicken) => {
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME, flicken });
  await geladen();
  await s.keyboard.press('Tab');
  await s.waitForTimeout(1800);
  await ruhig();
  const F = (await O('felderJetzt')).seite;
  // der Ausschnitt: die Mitte des Felds der Seite
  const aus = { x: Math.round(F.x + F.w / 2 - 320), y: Math.round(F.y + F.h / 2 - 200), width: 640, height: 400 };
  const x0 = F.x + F.w - 40;
  const y0 = F.y + 40;
  await s.mouse.move(x0, y0);
  await s.waitForTimeout(400);
  await O('film', true);
  let nr = 0;
  const bild = async () => {
    await s.evaluate((dt) => window.__ozzy.bild(dt), DT);
    await s.screenshot({ path: path.join(ordner, `${name}-${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95, clip: aus });
  };
  for (let k = 0; k < 20; k++) await bild();
  // hin: eine halbe Drehung (520 Punkte) in 3 s, kurz vor dem Ende loslassen (es dreht von selbst fertig)
  for (const richtung of [-1, 1]) {
    const von = richtung < 0 ? x0 : x0 - 500;
    await s.mouse.move(von, y0);
    await s.keyboard.down('Shift');
    await s.mouse.down();
    const N = 180;
    for (let k = 1; k <= N; k++) {
      await s.mouse.move(von + richtung * 500 * sanft(k / N), y0);
      await bild();
    }
    await s.mouse.up();
    await s.keyboard.up('Shift');
    for (let k = 0; k < 45; k++) await bild();
  }
  await browser.close();
  return { bilder: nr, fehler };
};

/** Titel als Bilder (die Schrift des Projekts), ffmpeg setzt hier keinen Text */
const schilder = async () => {
  const lobster = fs.readFileSync(path.join(hier, '../../../../assets/fonts/lobster/Lobster-Regular.ttf')).toString('base64');
  const browser = await chromium.launch({ args: GPU_ARGS });
  const s = await browser.newPage({ viewport: { width: 1080, height: 300 }, deviceScaleFactor: 1 });
  await s.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Lobster; src: url(data:font/ttf;base64,${lobster}); }
    body { margin: 0; background: #fff; color: #1f1a17; }
    .titel { width: 1080px; height: 64px; box-sizing: border-box; padding: 12px 28px 0; font: 34px/1.15 Lobster; white-space: nowrap; }
    .titel small { font: 21px/1 -apple-system, Helvetica, Arial, sans-serif; color: rgba(31,26,23,.6); margin-left: 14px; }
  </style>
  <div class="titel" id="t1">Vorher: das Feld dreht sich wie ein Blatt</div>
  <div class="titel" id="t2">Jetzt: räumlich<small>⇧ + Ziehen im Feld der Seite, Vier Ansichten</small></div>`);
  await s.waitForTimeout(300);
  for (const id of ['t1', 't2']) await s.locator(`#${id}`).screenshot({ path: path.join(ordner, `${id}.png`) });
  await browser.close();
};

const vorher = await aufnehmen('vorher', FLACH);
const jetzt = await aufnehmen('jetzt', {});
await schilder();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', '60', '-i', path.join(ordner, 'vorher-%05d.jpg'),
  '-framerate', '60', '-i', path.join(ordner, 'jetzt-%05d.jpg'),
  '-loop', '1', '-framerate', '60', '-i', path.join(ordner, 't1.png'),
  '-loop', '1', '-framerate', '60', '-i', path.join(ordner, 't2.png'),
  '-filter_complex',
  '[0]scale=1080:676:flags=lanczos,format=rgb24[a];[1]scale=1080:676:flags=lanczos,format=rgb24[b];[2]format=rgb24[t1];[3]format=rgb24[t2];[t1][a][t2][b]vstack=inputs=4:shortest=1,format=yuv420p',
  '-c:v', 'libx264', '-crf', '17', '-r', '60', '-movflags', '+faststart', ziel,
]);
if (process.env.BEHALTEN !== '1') fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${vorher.bilder} Bilder je Fenster; geschrieben: ${ziel}${process.env.BEHALTEN === '1' ? ` (Einzelbilder in ${ordner})` : ''}`);
for (const f of [...vorher.fehler, ...jetzt.fehler].slice(0, 4)) console.log(`Fehler: ${f}`);
