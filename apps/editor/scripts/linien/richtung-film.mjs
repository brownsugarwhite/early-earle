// Film „Richtungen statt Griffe“ (15.11.2026) an Florians Fisch, Kreuzung Punkt 55: Anflug und Stern, Nadel, Drücken (Zeiger an
// der Griffspitze, Ring), rund 30° drehen, mit ⌥ allein weiter (Knick, Taille), zurück in die Flucht (Einrasten), wegziehen. Bild für
// Bild aus dem echten Verhalten (60 je Sekunde), dann ffmpeg. Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/richtung-film.mjs <ziel.mp4>
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ziel = process.argv[2] ?? '../../docs/progress/linien/richtung-film.mp4';
const URL = process.env.URL ?? 'http://localhost:5199';
const FPS = 60;
const B = 1000;
const H = 640;
const Z = 3.2;
const PI = 55;
const LI = 2;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien !== undefined);
// Lagen in Punkten des Entwurfs: Punkt, Stelle auf der Nadel (60 %), Spitze des Hebels
const L0 = await page.evaluate(
  ({ Z, B, H, PI, LI }) => {
    const L = window.__linien;
    const v = L.verhalten;
    const a = L.ansicht;
    const p = v.netz.punkte[PI];
    a.wachsen = true;
    a.z = Z;
    a.ox = B / 2 - p.x * Z;
    a.oy = H / 2 - p.y * Z + 40;
    v.setzeAnsicht(a);
    v.abtasten();
    L.vorspulen(50);
    const l = v.netz.linien[LI];
    const k = l.punkte.indexOf(PI);
    const P = v.proben[LI];
    const ziel = P.stueckS[k] + 0.6 * v.nadelLaenge(LI, k, 'aus');
    let b = 0;
    for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - ziel) < Math.abs(P.s[b] - ziel)) b = i;
    const g = l.stuecke[k];
    const len = Math.hypot(g.g1x, g.g1y);
    const rho = Math.max(len, 22);
    return { hub: [p.x, p.y], stelle: [P.x[b], P.y[b]], spitze: [p.x + (g.g1x / len) * rho, p.y + (g.g1y / len) * rho], ox: a.ox, oy: a.oy };
  },
  { Z, B, H, PI, LI },
);
const [hx, hy] = L0.hub;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** die Stelle auf der Nadel der Seite „aus“ (60 %), aus dem Stand im Fenster */
const nadel = () =>
  page.evaluate(
    ({ PI, LI }) => {
      const v = window.__linien.verhalten;
      const l = v.netz.linien[LI];
      const k = l.punkte.indexOf(PI);
      const P = v.proben[LI];
      const ziel = P.stueckS[k] + 0.6 * v.nadelLaenge(LI, k, 'aus');
      let b = 0;
      for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - ziel) < Math.abs(P.s[b] - ziel)) b = i;
      return [P.x[b], P.y[b]];
    },
    { PI, LI },
  );
// Ablauf: gehen (nach: Punkt oder „nadel“), drehen (um w Grad gegen den letzten Druck), Ereignisse
const weg = [
  { t0: 0, t1: 1.1, nach: [hx + 2, hy + 2.5], von: [hx + 45, hy - 30] },
  { t0: 1.1, t1: 2.0 },
  { t0: 2.0, t1: 2.9, nach: 'nadel' },
  { t0: 2.9, t1: 4.0 },
  { t0: 4.0, t1: 5.1, w: -30 },
  { t0: 5.1, t1: 5.6 },
  { t0: 5.6, t1: 6.6, nach: 'nadel' },
  { t0: 6.6, t1: 7.3 },
  { t0: 7.3, t1: 8.5, w: -45 },
  { t0: 8.5, t1: 9.1 },
  { t0: 9.1, t1: 10.0, nach: 'nadel' },
  { t0: 10.0, t1: 10.5 },
  { t0: 10.5, t1: 11.6, w: 43 },
  { t0: 11.6, t1: 12.2 },
  { t0: 12.2, t1: 13.4, nach: [hx + 50, hy - 35] },
  { t0: 13.4, t1: 14.6 },
];
const ereignisse = [
  { t: 3.6, art: 'druecken' },
  { t: 5.6, art: 'loslassen' },
  { t: 7.0, art: 'alt' },
  { t: 7.3, art: 'druecken' },
  { t: 9.1, art: 'loslassen' },
  { t: 9.15, art: 'altAus' },
  { t: 10.5, art: 'druecken' },
  { t: 12.2, art: 'loslassen' },
].map((e) => ({ ...e, fertig: false }));
let maus = weg[0].von;
let druck = null;
let aktiv = -1;
let von = maus;
let nach = maus;
/** Lage der Maus zur Zeit t; beim Eintritt in einen Abschnitt werden seine Ziele aus dem Stand gelesen */
const lage = async (t) => {
  const i = Math.max(0, weg.findIndex((q) => t <= q.t1));
  const s = weg[i] ?? weg[weg.length - 1];
  if (i !== aktiv) {
    aktiv = i;
    von = s.von ?? maus;
    nach = s.nach === 'nadel' ? await nadel() : (s.nach ?? von);
  }
  const f = ease(Math.min(1, Math.max(0, (t - s.t0) / (s.t1 - s.t0))));
  if (s.w !== undefined && druck) {
    // die Spitze des Hebels auf ihrem Ring um w gedreht; die Maus geht denselben Weg
    const c = Math.cos((s.w * f * Math.PI) / 180);
    const n = Math.sin((s.w * f * Math.PI) / 180);
    const dx = druck.sp[0] - hx;
    const dy = druck.sp[1] - hy;
    maus = [druck.m0[0] + hx + c * dx - n * dy - druck.sp[0], druck.m0[1] + hy + n * dx + c * dy - druck.sp[1]];
  } else maus = [von[0] + (nach[0] - von[0]) * f, von[1] + (nach[1] - von[1]) * f];
  return maus;
};

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'richtung-film-'));
const ende = weg[weg.length - 1].t1;
// Doppelklick-Gedächtnis: Die Drücke im Film liegen Sekunden auseinander, im Fenster aber nur Millisekunden
await page.evaluate(() => {
  const v = window.__linien.verhalten;
  const druecken = v.druecken.bind(v);
  v.druecken = () => {
    v.klick = null;
    return druecken();
  };
});
let n = 0;
for (let t = 0; t <= ende; t += 1 / FPS) {
  const [x, y] = await lage(t);
  const jetzt = ereignisse.filter((e) => !e.fertig && e.t <= t);
  for (const e of jetzt) e.fertig = true;
  const gedrueckt = await page.evaluate(
    ({ x, y, Z, ox, oy, arten, dt }) => {
      const L = window.__linien;
      L.zeigerHin(x * Z + ox, y * Z + oy, dt);
      let sp = null;
      for (const a of arten) {
        if (a === 'druecken') {
          L.verhalten.druecken();
          sp = L.verhalten.griff?.spitze ?? null;
        } else if (a === 'loslassen') L.verhalten.loslassen();
        else L.verhalten.alt = a === 'alt';
      }
      L.vorspulen(dt);
      return sp;
    },
    { x, y, Z, ox: L0.ox, oy: L0.oy, arten: jetzt.map((e) => e.art), dt: 1000 / FPS },
  );
  if (gedrueckt) druck = { m0: [x, y], sp: gedrueckt };
  await page.screenshot({ path: path.join(ordner, `b${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  n++;
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(ordner, 'b%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log('Film:', ziel, n, 'Bilder');
