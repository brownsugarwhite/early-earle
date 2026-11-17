// Film zu B3 (Plan „Ozzy stabil und schnell“, 17.11.2026): das Kurvennetz im Raum, an „strange bird“ (NAME). Bild für Bild (60 je
// Sekunde): die Seifenhaut wie bisher, W blendet das Kurvennetz ein (weißer Körper mit Umriss, Linien und Punkte auf der Form), die
// Ansicht dreht ein Stück und zurück, ein Punkt auf der Form wird gezogen, W schaltet zurück.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/raum-netz-film.mjs [ziel.mp4]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auf, GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = process.argv[2] ?? path.join(hier, '../../../../docs/progress/ozzy/2026-11-17-kurvennetz-im-raum.mp4');
const NAME = process.env.NAME ?? 'strange bird';
const DT = 1 / 60;
const AUS = { x: 400, y: 250, width: 640, height: 400 };
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-raum-netz-'));
const sanft = (u) => u * u * (3 - 2 * u);

const { browser, s, O, geladen, fehler } = await auf({ form: NAME });
await geladen();
await s.waitForTimeout(2500);
const leer = [470, 300];
await s.mouse.move(leer[0], leer[1]);
await s.waitForTimeout(400);
await O('film', true);
let nr = 0;
const bild = async (n = 1, speichern = true) => {
  for (let i = 0; i < n; i++) {
    await s.evaluate((dt) => window.__ozzy.bild(dt), DT);
    if (speichern) await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95, clip: AUS });
  }
};
/** die Maus sanft von a nach b in n Bildern */
const fahren = async (a, b, n, speichern = true) => {
  for (let k = 1; k <= n; k++) {
    const u = sanft(k / n);
    await s.mouse.move(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u);
    await bild(1, speichern);
  }
};
// 1 die Seifenhaut wie bisher
await bild(36);
// 2 W: das Kurvennetz
await s.keyboard.press('w');
await bild(66);
// 3 drehen: ins Leere ziehen, hin und zurück
await s.mouse.down();
await fahren(leer, [leer[0] + 55, leer[1]], 50);
await bild(10);
await fahren([leer[0] + 55, leer[1]], leer, 50);
await s.mouse.up();
await bild(30);
// 4 einen Punkt der Flanke suchen, der sich greifen lässt (ohne Bilder), dann von der freien Stelle aus anfahren und ziehen
const L = await O('werkLinienDaten');
const anker = [];
for (const l of L)
  for (const p of l.punkte) {
    if (!p.sichtbar) continue;
    for (const a of await O('ankerImBild', l.id, p.i)) if (a.sichtbar) anker.push({ id: l.id, i: p.i, z: p.z, art: l.art, x: a.x, y: a.y, m: a.m });
  }
let punkt = null;
for (const a of anker.filter((q) => q.art !== 'mitte' && Math.abs(q.z) > 10).sort((p, q) => Math.abs(q.z) - Math.abs(p.z))) {
  if (a.x < AUS.x + 60 || a.x > AUS.x + AUS.width - 90 || a.y < AUS.y + 70 || a.y > AUS.y + AUS.height - 60) continue;
  if (anker.some((b) => Math.hypot(b.x - a.x, b.y - a.y) > 1 && Math.hypot(b.x - a.x, b.y - a.y) < 14)) continue;
  await s.mouse.move(a.x + 1, a.y + 1);
  await bild(12, false);
  if (/^Punkt /.test((await O('bearbeiten')).ziel)) {
    punkt = a;
    break;
  }
}
await s.mouse.move(leer[0], leer[1]);
await bild(20, false);
if (punkt) {
  const an = [punkt.x + 1, punkt.y + 1];
  await fahren(leer, an, 40);
  await bild(18);
  await s.mouse.down();
  await bild(8);
  const hin = [an[0] + 34, an[1] - 22];
  await fahren(an, hin, 42);
  await bild(12);
  await s.mouse.up();
  await bild(30);
  await fahren(hin, leer, 36);
}
// 5 W: zurück zur Seifenhaut
await s.keyboard.press('w');
await bild(54);
await browser.close();

// Titel als Bild (die Schrift des Projekts), ffmpeg setzt hier keinen Text
const lobster = fs.readFileSync(path.join(hier, '../../../../assets/fonts/lobster/Lobster-Regular.ttf')).toString('base64');
const b2 = await chromium.launch({ args: GPU_ARGS });
const t = await b2.newPage({ viewport: { width: 1080, height: 200 }, deviceScaleFactor: 1 });
await t.setContent(`<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: Lobster; src: url(data:font/ttf;base64,${lobster}); }
  body { margin: 0; background: #fff; color: #1f1a17; }
  .titel { width: 1080px; height: 64px; box-sizing: border-box; padding: 12px 28px 0; font: 34px/1.15 Lobster; white-space: nowrap; }
  .titel small { font: 21px/1 -apple-system, Helvetica, Arial, sans-serif; color: rgba(31,26,23,.6); margin-left: 14px; }
</style><div class="titel" id="t1">Kurvennetz im Raum<small>Taste W · Linien und Punkte auf der Form, wie auf den Flächen</small></div>`);
await t.waitForTimeout(300);
await t.locator('#t1').screenshot({ path: path.join(ordner, 't1.png') });
await b2.close();
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'),
  '-loop', '1', '-framerate', '60', '-i', path.join(ordner, 't1.png'),
  '-filter_complex', '[0]scale=1080:676:flags=lanczos,format=rgb24[a];[1]format=rgb24[t1];[t1][a]vstack=inputs=2:shortest=1,format=yuv420p',
  '-c:v', 'libx264', '-crf', '21', '-preset', 'slow', '-r', '60', '-movflags', '+faststart', ziel,
]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${nr} Bilder; Punkt ${punkt ? `${punkt.id}.${punkt.i} (${punkt.m ? 'Spiegelhälfte' : 'Hälfte z > 0'})` : 'keiner gefunden'}; geschrieben: ${ziel}`);
for (const f of fehler.slice(0, 3)) console.log(`Fehler: ${f}`);
