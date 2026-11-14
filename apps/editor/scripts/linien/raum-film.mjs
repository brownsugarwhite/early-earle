// Film der Probe im Raum (raum.html): Form drehen, an eine Kreuzung heran (Stern, Tropfen), greifen und ziehen (die Haut geht mit),
// loslassen, an einer Linie entlang, weiterdrehen. Bild für Bild gerechnet (60 je Sekunde), ffmpeg zu MP4. Aufruf aus apps/editor:
//   node scripts/linien/raum-film.mjs <ziel.mp4> [Form]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/linien/raum-film.mp4';
const form = process.argv[3] ?? 'teat firefish';
const URL = process.env.URL ?? 'http://localhost:5199';
const FPS = 60;
const B = 1280;
const H = 800;
const MASS = Number(process.env.MASS ?? 2);

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'linien-raum-'));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${URL}/raum.html?bild=1&form=${encodeURIComponent(form)}`);
await page.waitForFunction(() => window.__raum && window.__raum.raum.linien.length > 0, null, { timeout: 60000 });
// Ablauf im Fenster: Kamera, Zeiger, Ereignisse je Bild; die Ziele werden gesucht, wenn es so weit ist
await page.evaluate(
  ({ MASS }) => {
    const R = window.__raum;
    R.ansicht.massstab = MASS;
    R.raum.gier.setzen(0);
    R.raum.nick.setzen(0);
    R.raum.abstand.setzen(R.raum.abstand.x * 0.52);
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const zwischen = (a, b, t0, t1, t) => a + (b - a) * ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
    const sichtbarerPunkt = (cx, cy) => {
      const pk = R.verhalten.netz.punkte;
      let best = null;
      for (const p of pk) {
        if (!p.sichtbar) continue;
        const s = R.anzeige.tiefeBei(p.x * R.ansicht.dpr, p.y * R.ansicht.dpr, 1);
        if (!s || p.z > s.tiefe[0] + R.raum.bias()) continue;
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (!best || d < best.d) best = { x: p.x, y: p.y, d };
      }
      return best;
    };
    const plan = { a: null, l: null };
    window.__film = (t) => {
      const c = R.raum;
      // Kamera: von der Seite ins Schräge und am Ende weiter
      c.gier.setzen(zwischen(0, -0.62, 0.2, 2.4, t) + zwischen(0, -0.5, 10.2, 12.4, t));
      c.nick.setzen(zwischen(0, 0.28, 0.2, 2.4, t) + zwischen(0, -0.12, 10.2, 12.4, t));
      const ereignisse = [];
      let x = 1200;
      let y = 140;
      if (t >= 2.5 && !plan.a) {
        const p = sichtbarerPunkt(640, 420);
        plan.a = p;
      }
      const a = plan.a;
      if (a) {
        // Anflug von rechts unten, kurz verweilen, greifen, ziehen, loslassen
        x = zwischen(1200, a.x + 9, 2.5, 3.6, t);
        y = zwischen(140, a.y + 7, 2.5, 3.6, t);
        if (t >= 4.4) {
          x = a.x + 9 + zwischen(0, 70, 5.0, 6.4, t);
          y = a.y + 7 + zwischen(0, -55, 5.0, 6.4, t);
        }
        if (t >= 4.4 && t < 4.4 + 1 / 60) ereignisse.push('druecken');
        if (t >= 6.6 && t < 6.6 + 1 / 60) ereignisse.push('loslassen');
        if (t >= 6.9) {
          if (!plan.l) {
            // eine Stelle auf einer Linie, nicht zu nah an Punkten
            const P = R.verhalten.proben;
            const pk = R.verhalten.netz.punkte;
            let best = null;
            P.forEach((Q) => {
              for (let k = 2; k < Q.n - 2; k += 2) {
                const dp = Math.min(...pk.map((p) => Math.hypot(p.x - Q.x[k], p.y - Q.y[k])));
                const dc = Math.hypot(Q.x[k] - 560, Q.y[k] - 470);
                if (dp < 40 || dc > 260) continue;
                const s = R.anzeige.tiefeBei(Q.x[k] * R.ansicht.dpr, Q.y[k] * R.ansicht.dpr, 1);
                if (!s || Q.z[k] > s.tiefe[0] + R.raum.bias()) continue;
                const g = dp - dc * 0.2;
                if (!best || g > best.g) best = { x: Q.x[k], y: Q.y[k], g, nx: -(Q.y[k + 1] - Q.y[k - 1]), ny: Q.x[k + 1] - Q.x[k - 1] };
              }
            });
            if (best) {
              const l = Math.hypot(best.nx, best.ny) || 1;
              best.nx /= l;
              best.ny /= l;
            }
            plan.l = best ?? { x: 600, y: 500, nx: 0, ny: 1 };
            plan.l.x0 = x;
            plan.l.y0 = y;
          }
          const l = plan.l;
          x = zwischen(l.x0, l.x + l.nx * 9, 6.9, 8.0, t);
          y = zwischen(l.y0, l.y + l.ny * 9, 6.9, 8.0, t);
          // entlang der Linie gleiten
          x += zwischen(0, -l.ny * 30, 8.4, 9.6, t);
          y += zwischen(0, l.nx * 30, 8.4, 9.6, t);
          if (t > 10.0) {
            x = zwischen(x, 1220, 10.0, 11.0, t);
            y = zwischen(y, 120, 10.0, 11.0, t);
          }
        }
      }
      R.zeigerHin(x, y, 1000 / 60);
      for (const e of ereignisse) e === 'druecken' ? R.verhalten.druecken() : R.verhalten.loslassen();
      R.schritt(1 / 60);
    };
  },
  { MASS },
);
const ENDE = 13;
let n = 0;
for (let t = 0; t <= ENDE; t += 1 / FPS) {
  await page.evaluate((t) => window.__film(t), t);
  await page.screenshot({ path: path.join(ordner, `b${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  n++;
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(ordner, 'b%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log('Film:', ziel, n, 'Bilder', fehler.length ? `Fehler: ${fehler.join(' | ')}` : '');
