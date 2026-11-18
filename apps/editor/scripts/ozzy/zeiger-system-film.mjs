// Film zu B1 (Plan „Ozzy stabil und schnell“, 17.11.2026): der gezeichnete Zeiger (wie heute) gegen den Zeiger des Systems
// (`?zeiger=system`), an „strange bird“ (NAME) in der Seite. Dieselbe Handbewegung in zwei Fenstern, Bild für Bild (60 je Sekunde):
// frei über die Form, auf einen Punkt, greifen und ziehen, loslassen, weg. Oben wie heute, unten der Vorschlag; erst in echter
// Geschwindigkeit, dann viermal langsamer.
//
// Es ist eine NACHSTELLUNG, kein Mitschnitt des Bildschirms (ein Bildschirmfoto der Seite enthält den Zeiger des Systems nicht):
//   - Der rote Kreis ist die Hand (der Ort der Maus zu diesem Zeitpunkt).
//   - Ein Bild, das Ozzy rechnet, steht NACH Bilder später auf dem Schirm, als der Zeiger des Systems dort wäre (Maus → Bild rechnen →
//     der Browser setzt zusammen → Bildschirm). NACH = 2 ist die Annahme (33 ms bei 60 Bildern je Sekunde; üblich sind zwei bis drei),
//     gemessen ist sie hier nicht. Der Zeiger des Systems steht je Bildwechsel am Ort der Hand.
//   - Verpasste Bilder (dann ruckt der gezeichnete Zeiger zusätzlich) kommen nicht vor: Im Testbrowser hält Ozzy beim Zeigen seine Bilder.
// Wie es sich anfühlt, zeigt nur der Schalter im eigenen Fenster.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/ozzy/zeiger-system-film.mjs [ziel.mp4]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auf, GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = process.argv[2] ?? path.join(hier, '../../../../docs/progress/ozzy/2026-11-17-zeiger-system.mp4');
const NAME = process.env.NAME ?? 'strange bird';
const DT = 1 / 60;
const NACH = Number(process.env.NACH ?? 2);
const LUPE = 4;
/** der Ausschnitt (CSS-Punkte) und der Punkt, der gegriffen wird (der nächste der Mittellinie) */
const AUS = { x: 445, y: 325, width: 440, height: 248 };
const PUNKT = { x: 650, y: 419 };
// BEHALTEN=1 lässt die Einzelbilder liegen; BILDER=<ordner> setzt aus solchen Einzelbildern nur neu zusammen (Titel, Fuß, Schnitt)
const ordner = process.env.BILDER ?? fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-zeiger-system-'));

/** der Weg der Hand: Stücke mit sanftem Anfang und Ende (kleinster Ruck), leicht gebogen; `p` ist der Punkt */
const wegBauen = (p) => {
  const an = [p.x + 2, p.y + 2];
  const zug = [p.x - 28, p.y - 32];
  return {
    stuecke: [
      { t0: 0, t1: 0.25, von: [470, 352], nach: [470, 352], bogen: 0 },
      { t0: 0.25, t1: 0.95, von: [470, 352], nach: [838, 540], bogen: 26 },
      { t0: 0.95, t1: 1.55, von: [838, 540], nach: [522, 522], bogen: 22 },
      { t0: 1.55, t1: 2.15, von: [522, 522], nach: an, bogen: -18 },
      { t0: 2.15, t1: 2.55, von: an, nach: an, bogen: 0 },
      { t0: 2.55, t1: 3.25, von: an, nach: zug, bogen: 6 },
      { t0: 3.25, t1: 3.75, von: zug, nach: zug, bogen: 0 },
      { t0: 3.75, t1: 4.45, von: zug, nach: [792, 468], bogen: -20 },
      { t0: 4.45, t1: 5, von: [792, 468], nach: [792, 468], bogen: 0 },
    ],
    druecken: 2.45,
    loslassen: 3.4,
    ende: 5,
  };
};
const hand = (W, t) => {
  const S = W.stuecke.find((s) => t < s.t1) ?? W.stuecke[W.stuecke.length - 1];
  const u = Math.max(0, Math.min(1, (t - S.t0) / (S.t1 - S.t0)));
  const s = u * u * u * (10 - 15 * u + 6 * u * u);
  const dx = S.nach[0] - S.von[0];
  const dy = S.nach[1] - S.von[1];
  const l = Math.hypot(dx, dy) || 1;
  const b = S.bogen * Math.sin(Math.PI * s);
  return [S.von[0] + dx * s - (dy / l) * b, S.von[1] + dy * s + (dx / l) * b];
};

const aufnehmen = async (name, extra) => {
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: NAME, extra });
  await geladen();
  await s.keyboard.press('1');
  await s.waitForTimeout(900);
  await ruhig();
  await s.mouse.move(720, 450);
  for (let k = 0; k < 3; k++) {
    await s.mouse.wheel(0, -120);
    await s.waitForTimeout(80);
  }
  await s.waitForTimeout(900);
  await ruhig();
  // der Punkt der Mittellinie, der PUNKT am nächsten liegt
  const L = await O('werkLinienDaten');
  let p = null;
  for (const l of L.filter((q) => q.art === 'mitte'))
    for (const q of l.punkte) {
      if (!q.sichtbar) continue;
      for (const a of await O('ankerImBild', l.id, q.i, 'seite')) {
        const d = Math.hypot(a.x - PUNKT.x, a.y - PUNKT.y);
        if (!a.m && a.sichtbar && (!p || d < p.d)) p = { x: a.x, y: a.y, d };
      }
    }
  const W = wegBauen(p);
  // die Zutaten der Nachstellung liegen über der Seite: Kreis der Hand, Zeiger des Systems (sein Bild), ein Wort zum Stand
  await s.evaluate((mitStand) => {
    const hand = document.createElement('div');
    hand.id = 'film-hand';
    hand.style.cssText = 'position:fixed;left:0;top:0;width:17px;height:17px;margin:-8.5px 0 0 -8.5px;border:1.25px solid rgba(228,87,46,.95);border-radius:50%;box-sizing:border-box;pointer-events:none;z-index:9999';
    const zeiger = document.createElement('img');
    zeiger.id = 'film-zeiger';
    zeiger.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:9998;display:none';
    const stand = document.createElement('div');
    stand.id = 'film-stand';
    stand.style.cssText = 'position:fixed;font:11px/1 -apple-system,Helvetica,Arial,sans-serif;color:rgba(31,26,23,.62);pointer-events:none;z-index:9999;letter-spacing:.01em';
    if (!mitStand) stand.style.display = 'none';
    document.body.append(zeiger, hand, stand);
  }, extra.includes('zeiger=system'));
  const [x0, y0] = hand(W, 0);
  await s.mouse.move(x0, y0);
  await s.waitForTimeout(600);
  await O('film', true);
  await s.waitForTimeout(100);
  const N = Math.round(W.ende / DT);
  let unten = false;
  const staende = [];
  for (let k = 0; k < N; k++) {
    const t = k * DT;
    const [x, y] = hand(W, t);
    await s.mouse.move(x, y);
    if (!unten && t >= W.druecken && t < W.loslassen) {
      await s.mouse.down();
      unten = true;
    } else if (unten && t >= W.loslassen) {
      await s.mouse.up();
      unten = false;
    }
    const z = await s.evaluate((dt) => {
      window.__ozzy.bild(dt);
      return window.__ozzy.zeiger();
    }, DT);
    staende.push(z.system ? 'S' : z.gezeichnet ? 'g' : '-');
    // dieses Bild steht NACH Bilder später auf dem Schirm; dort ist die Hand schon weiter, der Zeiger des Systems mit ihr
    const tn = t + NACH * DT;
    const [sx, sy] = hand(W, tn);
    for (let j = 0; j < LUPE; j++) {
      const [hx, hy] = hand(W, tn + (j * DT) / LUPE);
      await s.evaluate(
        async ({ hx, hy, sx, sy, wert, system, aus }) => {
          document.getElementById('film-hand').style.transform = `translate(${hx}px, ${hy}px)`;
          const el = document.getElementById('film-zeiger');
          const urls = [...wert.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
          const heiss = wert.match(/\)\s+(\d+)\s+(\d+)\s*,/);
          if (urls.length && heiss) {
            const u = urls[urls.length - 1];
            if (el.dataset.u !== u) {
              el.dataset.u = u;
              el.src = u;
              await el.decode();
              el.style.width = `${el.naturalWidth / urls.length}px`;
            }
            // wie ein Zeiger des Systems: auf ganzen Bildpunkten des Geräts
            const d = window.devicePixelRatio;
            el.style.transform = `translate(${Math.round((sx - Number(heiss[1])) * d) / d}px, ${Math.round((sy - Number(heiss[2])) * d) / d}px)`;
            el.style.display = 'block';
          } else el.style.display = 'none';
          const st = document.getElementById('film-stand');
          st.style.left = `${aus.x + 10}px`;
          st.style.top = `${aus.y + aus.height - 20}px`;
          st.textContent = system ? 'Zeiger: System' : 'Zeiger: gezeichnet';
        },
        { hx, hy, sx, sy, wert: z.bild, system: z.system, aus: AUS },
      );
      const datei = path.join(ordner, `${name}-lupe-${String(k * LUPE + j).padStart(5, '0')}.jpg`);
      await s.screenshot({ path: datei, type: 'jpeg', quality: 95, clip: AUS });
      if (j === 0) fs.copyFileSync(datei, path.join(ordner, `${name}-echt-${String(k).padStart(5, '0')}.jpg`));
    }
  }
  await browser.close();
  return { bilder: N, staende: staende.join(''), fehler };
};

/** Titel und Fuß als Bilder (die Schrift des Projekts), ffmpeg setzt hier keinen Text */
const schilder = async () => {
  const lobster = fs.readFileSync(path.join(hier, '../../../../assets/fonts/lobster/Lobster-Regular.ttf')).toString('base64');
  const browser = await chromium.launch({ args: GPU_ARGS });
  const s = await browser.newPage({ viewport: { width: 1080, height: 400 }, deviceScaleFactor: 1 });
  const fuss = (wort) =>
    `<div class="fuss"><div class="reihe"><div><span class="kreis"></span>Roter Kreis: dort ist die Hand.</div><div class="wort">${wort}</div></div><div>Nachstellung: Was Ozzy zeichnet, steht ${NACH} Bilder (${Math.round(NACH * DT * 1000)} ms) später auf dem Schirm als der Zeiger des Systems.</div></div>`;
  await s.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Lobster; src: url(data:font/ttf;base64,${lobster}); }
    body { margin: 0; background: #fff; color: #1f1a17; font: 21px/1.35 -apple-system, Helvetica, Arial, sans-serif; }
    .titel { width: 1080px; height: 64px; box-sizing: border-box; padding: 12px 28px 0; font: 34px/1.15 Lobster; white-space: nowrap; }
    .titel small { font: 21px/1 -apple-system, Helvetica, Arial, sans-serif; color: rgba(31,26,23,.6); margin-left: 14px; }
    .fuss { width: 1080px; height: 96px; box-sizing: border-box; padding: 12px 28px 0; overflow: hidden; white-space: nowrap; font-size: 20px; color: rgba(31,26,23,.72); }
    .reihe { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .wort { font: 30px/1.1 Lobster; color: #1f1a17; }
    .kreis { display: inline-block; width: 15px; height: 15px; border: 1.5px solid #e4572e; border-radius: 50%; box-sizing: border-box; margin-right: 9px; vertical-align: -2px; }
  </style>
  <div class="titel" id="t1">Heute: der Zeiger wird im Bild gezeichnet</div>
  <div class="titel" id="t2">Vorschlag: der Zeiger des Systems<small>gezeichnet nur beim Greifen und auf dem Rückweg</small></div>
  <div id="f1">${fuss('echte Geschwindigkeit')}</div>
  <div id="f2">${fuss('viermal langsamer')}</div>`);
  await s.waitForTimeout(300);
  for (const id of ['t1', 't2', 'f1', 'f2']) await s.locator(`#${id}`).screenshot({ path: path.join(ordner, `${id}.png`) });
  await browser.close();
};

const leer = { bilder: 0, staende: '(aus vorhandenen Einzelbildern)', fehler: [] };
const heute = process.env.BILDER ? leer : await aufnehmen('heute', '');
const system = process.env.BILDER ? leer : await aufnehmen('system', 'zeiger=system');
await schilder();
const teil = (art, fuss, aus) =>
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', '60', '-i', path.join(ordner, `heute-${art}-%05d.jpg`),
    '-framerate', '60', '-i', path.join(ordner, `system-${art}-%05d.jpg`),
    '-loop', '1', '-framerate', '60', '-i', path.join(ordner, 't1.png'),
    '-loop', '1', '-framerate', '60', '-i', path.join(ordner, 't2.png'),
    '-loop', '1', '-framerate', '60', '-i', path.join(ordner, `${fuss}.png`),
    '-filter_complex',
    '[0]scale=1080:608:flags=lanczos,tpad=stop_mode=clone:stop_duration=0.8,format=rgb24[a];[1]scale=1080:608:flags=lanczos,tpad=stop_mode=clone:stop_duration=0.8,format=rgb24[b];[2]format=rgb24[t1];[3]format=rgb24[t2];[4]format=rgb24[f];[t1][a][t2][b][f]vstack=inputs=5:shortest=1,format=yuv420p',
    '-c:v', 'libx264', '-crf', '17', '-r', '60', '-movflags', '+faststart', aus,
  ]);
teil('echt', 'f1', path.join(ordner, 'teil1.mp4'));
teil('lupe', 'f2', path.join(ordner, 'teil2.mp4'));
fs.writeFileSync(path.join(ordner, 'liste.txt'), `file '${path.join(ordner, 'teil1.mp4')}'\nfile '${path.join(ordner, 'teil2.mp4')}'\n`);
fs.mkdirSync(path.dirname(ziel), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(ordner, 'liste.txt'), '-c', 'copy', '-movflags', '+faststart', ziel]);
const behalten = process.env.BEHALTEN === '1' || !!process.env.BILDER;
if (!behalten) fs.rmSync(ordner, { recursive: true, force: true });
console.log(`${heute.bilder} Bilder je Fenster; geschrieben: ${ziel}${behalten ? ` (Einzelbilder in ${ordner})` : ''}`);
console.log(`heute:  ${heute.staende}`);
console.log(`System: ${system.staende}`);
for (const f of [...heute.fehler, ...system.fehler].slice(0, 3)) console.log(`Fehler: ${f}`);
