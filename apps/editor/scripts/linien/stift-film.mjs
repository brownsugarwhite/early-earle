// Filme „Auswahl und Werkzeug P“ (15.11.2026): das echte Verhalten Bild für Bild (60 je Sekunde), dann ffmpeg.
//   node scripts/linien/stift-film.mjs 2d <ziel.mp4>     an Florians Fisch: Loop mit P, Abzweigung, ↩, Auswahl, Ziehen, ⌫
//   node scripts/linien/stift-film.mjs raum <ziel.mp4>   an „teat firefish“: Ring um den Schwanz, Auswahl, ⌫, ⌥ + Ziehen dreht
// Aufruf aus apps/editor, Server auf 5199.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const art = process.argv[2] ?? '2d';
const ziel = process.argv[3] ?? `../../docs/progress/linien/stift-film-${art}.mp4`;
const URL = process.env.URL ?? 'http://localhost:5199';
const FPS = 60;
const B = 1000;
const H = 640;
const raum = art === 'raum';

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));

/** Zeiger in Bildschirmpunkten; Ereignisse direkt am Verhalten (wie die Tasten und die Maus in main.ts) */
const haken = raum ? '__raum' : '__linien';
const ease = (f) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);

let ablauf = [];
let ausschnitt = { x: 0, y: 0, width: B, height: H };
let start = [B - 40, H / 2];

if (!raum) {
  await page.goto(`${URL}/linien.html?bild=1`);
  await page.waitForFunction(() => window.__linien);
  const Z = 4;
  const M = [312, 182];
  const OX = B / 2 - M[0] * Z;
  const OY = H / 2 - M[1] * Z;
  await page.evaluate(
    ([z, ox, oy]) => {
      const L = window.__linien;
      L.ansicht.z = z;
      L.ansicht.ox = ox;
      L.ansicht.oy = oy;
      L.verhalten.setzeAnsicht(L.ansicht);
      L.verhalten.abtasten();
      L.verhalten.stiftSchalten(true);
      L.vorspulen(50);
    },
    [Z, OX, OY],
  );
  const S = (p) => [p[0] * Z + OX, p[1] * Z + OY];
  const P1 = [309, 176];
  const P2 = [334, 203];
  const P3 = [311, 230];
  const P4 = [290, 203];
  const G = 11;
  // zwei Punkte am Auge (Abzweigung) und einer außerhalb des Rahmens, der nur auf einer Linie liegt (geteilte bleiben beim Löschen)
  const eye = await page.evaluate(() => {
    const v = window.__linien.verhalten;
    const einmal = (i) => v.netz.linien.filter((l) => l.punkte.includes(i)).length === 1;
    const i = v.netz.punkte.findIndex((p, i) => p.sichtbar && einmal(i) && !(p.x >= 290 && p.x <= 336 && p.y >= 120 && p.y <= 164) && Math.hypot(p.x - 313, p.y - 150) < 48);
    return [54, 61, i].map((k) => [v.netz.punkte[k].x, v.netz.punkte[k].y]);
  });
  const plus = (p, d) => [p[0] + d[0], p[1] + d[1]];
  // der Rahmen beginnt im Leeren: nahe der Ecke die Stelle, die am weitesten von allen Linien und Punkten weg ist (auch jenseits des
  // Haltens, sonst hängt der Tropfen der zuletzt überquerten Linie noch am Zeiger, und Drücken zieht die Linie)
  const leer = (p) =>
    page.evaluate((p) => {
      const v = window.__linien.verhalten;
      let best = p;
      let bd = -1;
      for (let dx = -8; dx <= 8; dx += 0.5)
        for (let dy = -8; dy <= 8; dy += 0.5) {
          const q = [p[0] + dx, p[1] + dy];
          let d = Infinity;
          for (const P of v.proben) for (let k = 0; k < P.n; k++) d = Math.min(d, Math.hypot(P.x[k] - q[0], P.y[k] - q[1]));
          if (d > bd) {
            bd = d;
            best = q;
          }
        }
      return best;
    }, p);
  const rahmenAnfang = await leer([294, 126]);
  const geh = (p, dauer = 0.8) => ({ dauer, zu: S(p) });
  const klick = (p) => [geh(p), { dauer: 0.12, tun: ['druecken'] }, { dauer: 0.25, tun: ['loslassen'] }];
  const zieh = (p, g, dauer = 0.6) => [geh(p), { dauer: 0.12, tun: ['druecken'] }, { dauer, zu: S(plus(p, g)) }, { dauer: 0.25, tun: ['loslassen'] }];
  start = S([352, 150]);
  ablauf = [
    { dauer: 0.5 },
    ...klick(P1),
    geh(plus(P2, [-8, -10]), 0.9),
    ...zieh(P2, [0, G]),
    geh(plus(P3, [8, -6]), 0.8),
    geh(P3, 0.35),
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.5, zu: S(plus(P3, [-8, 7])) },
    { dauer: 0.2, tun: ['altAn'] },
    { dauer: 0.6, zu: S(plus(P3, [-8, -7.5])) },
    { dauer: 0.15, tun: ['loslassen'] },
    { dauer: 0.2, tun: ['altAus'] },
    ...zieh(P4, [0, -G]),
    geh(plus(P1, [-6, 6]), 0.9),
    geh(plus(P1, [1, 1.5]), 0.5),
    { dauer: 0.4 },
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.6, zu: S(plus(P1, [7, 2])) },
    { dauer: 1.3, tun: ['loslassen'] },
    // Abzweigung von Punkt zu Punkt, an beiden Enden gezogen
    ...zieh(eye[0], [-6, -5]),
    geh(plus(eye[1], [-10, -6]), 0.8),
    ...zieh(eye[1], [-5, 6]),
    { dauer: 1.0 },
    // frei begonnen, zwei Punkte, ↩
    ...klick([345, 162]),
    ...zieh([360, 174], [3, 6]),
    { dauer: 0.5 },
    { dauer: 1.2, tun: ['enter'] },
    // Auswahl: V, Rahmen, ⇧-Klick, Ziehen, ⌫
    { dauer: 0.3, tun: ['v'] },
    geh(rahmenAnfang, 0.9),
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.9, zu: S([330, 158]) },
    { dauer: 0.8, tun: ['loslassen'] },
    geh(eye[2], 0.8),
    { dauer: 0.15, tun: ['umschaltAn'] },
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.2, tun: ['loslassen'] },
    { dauer: 0.3, tun: ['umschaltAus'] },
    geh(eye[1], 0.8),
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.8, zu: S(plus(eye[1], [6, -4])) },
    { dauer: 0.6, tun: ['loslassen'] },
    { dauer: 1.4, tun: ['loeschen'] },
    geh([352, 150], 0.9),
    { dauer: 0.5 },
  ];
  ausschnitt = { x: B / 2 - 300, y: 76, width: 600, height: 452 };
} else {
  await page.goto(`${URL}/raum.html?bild=1`);
  await page.waitForFunction(() => window.__raum && window.__raum.raum.hautTri.length > 0);
  await new Promise((r) => setTimeout(r, 400));
  const plan = await page.evaluate(() => {
    const Q = window.__raum;
    const R = Q.raum;
    R.zeigeAnsicht('schraeg');
    const c = R.mitte.x + 0.55 * R.radius;
    const P = R.anzeigePos;
    const T = R.anzeigeTri;
    const pts = [];
    for (let t = 0; t < T.length; t += 3) {
      const e = [T[t], T[t + 1], T[t + 2]].map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
      const s = e.map((p) => p[0] - c);
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        if (s[i] < 0 !== s[j] < 0) {
          const f = s[i] / (s[i] - s[j]);
          const q = [c, e[i][1] + (e[j][1] - e[i][1]) * f, e[i][2] + (e[j][2] - e[i][2]) * f];
          if (q[2] >= 0) pts.push(q);
        }
      }
    }
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    const ym = (y0 + y1) / 2;
    pts.sort((a, b) => Math.atan2(a[2], a[1] - ym) - Math.atan2(b[2], b[1] - ym));
    R.gier.ziel = 0.95;
    R.nick.ziel = 0.32;
    R.zielX.ziel = c;
    R.zielY.ziel = ym;
    R.zielZ.ziel = 0;
    R.abstand.ziel = (y1 - y0) * 8;
    Q.vorspulen(4000);
    window.__schnitt = (f) => pts[Math.min(pts.length - 1, Math.max(0, Math.round(f * (pts.length - 1))))];
    Q.verhalten.stiftSchalten(true);
    return { oben: window.__schnitt(0), unten: window.__schnitt(1) };
  });
  const schirm = (p) =>
    page.evaluate((p) => {
      const o = [0, 0, 0];
      window.__raum.raum.auf(p[0], p[1], p[2], o, 0);
      return [o[0], o[1]];
    }, p);
  const probeZiel = async (s) => {
    await page.evaluate(([x, y]) => {
      window.__raum.zeigerHin(x, y, 16);
      window.__raum.vorspulen(160);
    }, s);
    return page.evaluate(() => window.__raum.verhalten.stiftZiel);
  };
  const frei = async (f) => {
    for (const df of [0, 0.03, -0.03, 0.06, -0.06, 0.09, -0.09, 0.12, -0.12]) {
      const w = await page.evaluate((g) => window.__schnitt(g), f + df);
      const s = await schirm(w);
      const z = await probeZiel(s);
      if (z && z.art === 'frei' && !z.mitte) return { w, s };
    }
    throw new Error('keine freie Stelle');
  };
  const oben = await schirm(plan.oben);
  const unten = await schirm(plan.unten);
  const A = await frei(0.3);
  const Bp = await frei(0.65);
  const richtung = async (p, d, L) => {
    const a = await schirm(p);
    const b = await schirm([p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [((b[0] - a[0]) / l) * L, ((b[1] - a[1]) / l) * L];
  };
  const gO = await richtung(plan.oben, [0, 0, 1], 34);
  const gA = await richtung(A.w, [0, Bp.w[1] - plan.oben[1], Bp.w[2] - plan.oben[2]], 26);
  const gB = await richtung(Bp.w, [0, plan.unten[1] - A.w[1], plan.unten[2] - A.w[2]], 26);
  const gU = await richtung(plan.unten, [0, 0, -1], 34);
  await page.evaluate(() => {
    window.__raum.verhalten.zeigerWeg();
    window.__raum.vorspulen(300);
  });
  const plus = (p, d) => [p[0] + d[0], p[1] + d[1]];
  const geh = (p, dauer = 0.8) => ({ dauer, zu: p });
  const zieh = (p, g, dauer = 0.6) => [geh(p), { dauer: 0.12, tun: ['druecken'] }, { dauer, zu: plus(p, g) }, { dauer: 0.25, tun: ['loslassen'] }];
  const r0 = [Math.min(A.s[0], Bp.s[0]) - 16, Math.min(A.s[1], Bp.s[1]) - 16];
  const r1 = [Math.max(A.s[0], Bp.s[0]) + 16, Math.max(A.s[1], Bp.s[1]) + 16];
  start = plus(oben, [70, -50]);
  ablauf = [
    { dauer: 0.5 },
    geh(plus(oben, [12, -14]), 0.9),
    geh(plus(oben, [3, -4]), 0.6),
    { dauer: 0.4 },
    ...zieh(oben, gO),
    geh(plus(A.s, [-14, -8]), 1.0),
    ...zieh(A.s, gA),
    geh(plus(Bp.s, [-8, -10]), 0.9),
    ...zieh(Bp.s, gB),
    geh(plus(unten, [6, 8]), 0.9),
    { dauer: 0.4 },
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.6, zu: plus(unten, gU) },
    { dauer: 1.6, tun: ['loslassen'] },
    // Auswahl: V, Rahmen um die beiden Punkte der Flanke, Ziehen, ⌫
    { dauer: 0.3, tun: ['v'] },
    geh(r0, 0.9),
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.9, zu: r1 },
    { dauer: 0.8, tun: ['loslassen'] },
    geh(Bp.s, 0.8),
    { dauer: 0.12, tun: ['druecken'] },
    { dauer: 0.8, zu: plus(Bp.s, [14, -6]) },
    { dauer: 0.6, tun: ['loslassen'] },
    { dauer: 1.4, tun: ['loeschen'] },
    // ⌥ + Ziehen im Leeren dreht die Ansicht
    geh([B / 2 + 230, H / 2 - 170], 0.9),
    { dauer: 0.2, tun: ['altAn'] },
    { dauer: 1.6, zu: [B / 2 + 90, H / 2 - 150], drehen: true },
    { dauer: 0.3, tun: ['altAus'] },
    { dauer: 0.8 },
  ];
  ausschnitt = { x: Math.max(0, (oben[0] + unten[0]) / 2 - 300), y: Math.max(0, Math.min(H - 420, (oben[1] + unten[1]) / 2 - 210)), width: 600, height: 420 };
}

// Ablauf abspielen: Bild für Bild den Zeiger setzen, Ereignisse geben, die Zeit vorspulen, fotografieren
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'stift-film-'));
let maus = start;
let n = 0;
for (const schritt of ablauf) {
  const von = maus;
  const nach = schritt.zu ?? maus;
  const bilder = Math.max(1, Math.round(schritt.dauer * FPS));
  for (let i = 1; i <= bilder; i++) {
    const f = ease(i / bilder);
    const neu = [von[0] + (nach[0] - von[0]) * f, von[1] + (nach[1] - von[1]) * f];
    const dreh = schritt.drehen ? [neu[0] - maus[0], neu[1] - maus[1]] : null;
    maus = neu;
    await page.evaluate(
      ({ haken, x, y, tun, dt, dreh }) => {
        const Q = window[haken];
        const v = Q.verhalten;
        Q.zeigerHin(x, y, dt);
        for (const t of tun) {
          if (t === 'druecken') v.druecken();
          else if (t === 'loslassen') v.loslassen();
          else if (t === 'altAn') v.alt = true;
          else if (t === 'altAus') v.alt = false;
          else if (t === 'umschaltAn') v.umschalt = true;
          else if (t === 'umschaltAus') v.umschalt = false;
          else if (t === 'v') v.stiftSchalten(false);
          else v.eingabe(t);
        }
        if (dreh) Q.raum.drehen(-dreh[0] * 0.0075, dreh[1] * 0.0075);
        Q.vorspulen(dt);
      },
      { haken, x: maus[0], y: maus[1], tun: i === 1 ? (schritt.tun ?? []) : [], dt: 1000 / FPS, dreh },
    );
    await page.screenshot({ path: path.join(ordner, `b${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92, clip: ausschnitt });
    n++;
  }
}
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(ordner, 'b%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', ziel]);
fs.rmSync(ordner, { recursive: true, force: true });
console.log('Film:', ziel, n, 'Bilder', fehler.length ? fehler : '');
