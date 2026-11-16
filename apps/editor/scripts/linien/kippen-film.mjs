// Film „⇧ während des Drehens“ (Florian, 15.11.2026: „dynamisch, auch wenn ich das handle schon im griff habe“) an „teat firefish“:
// Richtung greifen, auf der Haut drehen, ⇧ (der Ring schwenkt aus der Haut), aufrichten, ⇧ los (der Ring legt sich, die Neigung
// bleibt), um die Senkrechte weiterdrehen. Bild für Bild aus dem echten Verhalten, dann ffmpeg. Aufruf aus apps/editor, Server 5199:
//   node scripts/linien/kippen-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/linien/2026-11-15-kippen-film.mp4';
const URL = process.env.URL ?? 'http://localhost:5199';
const FPS = 60;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
await page.goto(`${URL}/raum.html?bild=1`);
await page.waitForFunction(() => window.__raum && window.__raum.verhalten.netz.punkte.length > 0);
// Ansicht schräg, Stelle auf der Nadel von Anker 3 (Linie 1, Seite „aus“) wie in richtung-probe.mjs
const start = await page.evaluate(() => {
  const Q = window.__raum;
  const R = Q.raum;
  const v = Q.verhalten;
  R.zeigeAnsicht('schraeg');
  Q.vorspulen(3000);
  // nah an den Punkt
  const A = { x: R.anker[9], y: R.anker[10], z: R.anker[11] };
  R.zielX.ziel = A.x;
  R.zielY.ziel = A.y;
  R.zielZ.ziel = A.z;
  R.abstand.ziel = R.radius * 0.9;
  Q.vorspulen(3000);
  const l = v.netz.linien[1];
  const k = l.punkte.indexOf(3);
  const P = v.proben[1];
  const s = P.stueckS[k] + 0.6 * v.nadelLaenge(1, k, 'aus');
  let b = 0;
  for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - s) < Math.abs(P.s[b] - s)) b = i;
  const H = v.netz.punkte[3];
  return { nadel: [P.x[b], P.y[b]], nabe: [H.x, H.y] };
});
const ease = (f) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);
// Abschnitte: Zeiger gehen (nach), Ring drehen (um Grad), Ereignisse am Anfang
const ablauf = [
  { dauer: 0.4 },
  { dauer: 0.9, nach: start.nadel },
  { dauer: 0.5 },
  { dauer: 0.3, tun: ['druecken'] },
  { dauer: 1.2, dreh: 25 },
  { dauer: 0.5 },
  { dauer: 0.8, tun: ['kippenAn'] },
  { dauer: 1.2, dreh: 28 },
  { dauer: 0.5 },
  { dauer: 0.8, tun: ['kippenAus'] },
  { dauer: 1.6, dreh: 45 },
  { dauer: 0.5 },
  { dauer: 1.0, tun: ['loslassen'] },
];
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'kippen-film-'));
let maus = [start.nadel[0] + 40, start.nadel[1] + 30];
let n = 0;
const clip = { x: Math.max(0, Math.min(1000 - 520, start.nabe[0] - 260)), y: Math.max(0, Math.min(640 - 400, start.nabe[1] - 200)), width: 520, height: 400 };
for (const a of ablauf) {
  const von = maus;
  const bilder = Math.round(a.dauer * FPS);
  // Drehen: Winkel auf dem Ring von hier aus (der Ring kann nach ⇧ ein anderer sein: jeweils am Anfang des Abschnitts lesen)
  let ring = null;
  for (let i = 1; i <= bilder; i++) {
    const f = ease(i / bilder);
    if (a.dreh !== undefined && !ring) ring = await page.evaluate(() => {
      const R = window.__raum.raum;
      const D = R.dreh;
      const v = window.__raum.verhalten;
      return { m: D.mitte, e1: D.e1, e2: D.e2, r: D.rho0 * D.faktor, w0: D.winkel, mx: v.griff.mx, my: v.griff.my, sp: v.griff.spitze };
    });
    if (a.nach) maus = [von[0] + (a.nach[0] - von[0]) * f, von[1] + (a.nach[1] - von[1]) * f];
    await page.evaluate(
      ({ maus, tun, dt, ring, w }) => {
        const Q = window.__raum;
        const v = Q.verhalten;
        let [x, y] = maus;
        if (ring) {
          const c = Math.cos(ring.w0 + w);
          const s = Math.sin(ring.w0 + w);
          const T = { x: ring.m.x + ring.r * (c * ring.e1.x + s * ring.e2.x), y: ring.m.y + ring.r * (c * ring.e1.y + s * ring.e2.y), z: ring.m.z + ring.r * (c * ring.e1.z + s * ring.e2.z) };
          const ts = Q.raum.schirm(T);
          x = ring.mx + ts[0] - ring.sp[0];
          y = ring.my + ts[1] - ring.sp[1];
        }
        Q.zeigerHin(x, y, dt);
        for (const t of tun) {
          if (t === 'druecken') {
            v.kippen = false;
            v.druecken();
          } else if (t === 'loslassen') v.loslassen();
          else if (t === 'kippenAn') v.kippen = true;
          else if (t === 'kippenAus') v.kippen = false;
        }
        Q.vorspulen(dt);
        return [x, y];
      },
      { maus, tun: i === 1 ? (a.tun ?? []) : [], dt: 1000 / FPS, ring, w: a.dreh !== undefined ? ((a.dreh * Math.PI) / 180) * f : 0 },
    ).then((p) => (maus = p));
    await page.screenshot({ path: path.join(ordner, `b${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92, clip });
    n++;
  }
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(ordner, 'b%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log('Film:', ziel, n, 'Bilder');
