// Vorher und nachher (15.11.2026, Florian: „kann der Cursor nach dem Klick auf dem Punkt bleiben“, „der Übergang von normaler
// Verdickung zur Nadel noch smoother […] es soll immer fließen und nicht springen“). Derselbe Weg an seinem Fisch, Kreuzung Punkt 55,
// Linie 2, zweimal gerechnet: links das Verhalten vom Stand VORHER (Standard fcfe5b04, aus git geholt und im Fenster geladen), rechts
// das heutige. Film nebeneinander, Bildstreifen und Messwerte (JSON):
//   - Fließen: je Bild auf der Linie nahe am Punkt die Zahl der Buckel der Schwellung, ihre größte Höhe und wie weit ihr dickster
//     Punkt von Bild zu Bild wandert.
//   - Zeiger: nach Klick und Loslassen der Abstand des gezeichneten Zeigers vom Punkt, in Ruhe und nach 50 px Mausweg.
// Aufruf aus apps/editor, Server auf 5199:  node scripts/linien/fliessen-film.mjs [film.mp4] [streifen.png]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const zielFilm = process.argv[2] ?? '../../docs/progress/linien/fliessen-film.mp4';
const zielStreifen = process.argv[3] ?? '../../docs/progress/linien/fliessen-streifen.png';
const URL = process.env.URL ?? 'http://localhost:5199';
const VORHER = process.env.VORHER ?? 'fcfe5b04';
const FPS = 60;
const Z = 3;
const PI = 55;
const LI = 2;
const KB = 360;
const KH = 250;

// das Verhalten von damals als Modul im Fenster (die übrigen Module sind unverändert und kommen vom Server)
const quelle = execFileSync('git', ['show', `${VORHER}:apps/editor/src/linien/verhalten.ts`], { encoding: 'utf8' }).replace(
  /from '\.\/(\w+)'/g,
  "from '/src/linien/$1.ts'",
);
const altJs = ts.transpileModule(quelle, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.route('**/__vorher/verhalten.js', (r) => r.fulfill({ body: altJs, contentType: 'text/javascript' }));
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien);
await new Promise((ok) => setTimeout(ok, 500));

const start = await page.evaluate(
  async ({ Z, PI, LI }) => {
    const M = await import('/__vorher/verhalten.js');
    const L = window.__linien;
    const neu = L.verhalten;
    neu.zuruecksetzen();
    neu.tropfen = [];
    neu.zeigerWeg();
    const alt = new M.Verhalten(JSON.parse(JSON.stringify(neu.ursprung)), L.werte);
    const a = L.ansicht;
    a.wachsen = false;
    a.z = Z;
    const p = neu.netz.punkte[PI];
    a.ox = 500 - p.x * Z;
    a.oy = 320 - p.y * Z;
    for (const v of [alt, neu]) {
      v.setzeAnsicht(a);
      v.abtasten();
    }
    // Nadeln an Punkt PI auf Linie LI: der Weg beginnt 14 Einheiten jenseits der Nadel; die Ansicht mittig zwischen Punkt und Anfang
    const kk0 = neu.netz.linien[LI].punkte.indexOf(PI);
    const na = neu.nadelLaenge(LI, kk0, 'aus');
    const ne = neu.nadelLaenge(LI, kk0, 'ein');
    // Schild oben links im Ausschnitt
    const schild = document.createElement('div');
    schild.style.cssText = 'position:fixed;left:336px;top:206px;font:600 13px -apple-system,Helvetica,sans-serif;color:#1f1a17;z-index:9;letter-spacing:.02em';
    document.body.append(schild);
    const P = neu.proben[LI];
    const k = neu.netz.linien[LI].punkte.indexOf(PI);
    /** Lage auf Linie LI bei Bogenlänge s (Punkte des Entwurfs) */
    const stelle = (s) => {
      let i = 0;
      while (i + 2 < P.n && P.s[i + 1] < s) i++;
      const f = Math.min(1, Math.max(0, (s - P.s[i]) / (P.s[i + 1] - P.s[i] || 1)));
      return [P.x[i] + (P.x[i + 1] - P.x[i]) * f, P.y[i] + (P.y[i + 1] - P.y[i]) * f];
    };
    /** Breite über der Grundbreite je Probe von Linie LI aus der Szene (die Linien liegen vorn im Puffer, je Linie n − 1 Kapseln) */
    const profil = (v, sz) => {
      let o = 0;
      for (let li = 0; li < LI; li++) o += v.proben[li].n - 1;
      const Q = v.proben[LI];
      const extra = new Float32Array(Q.n);
      let c = o;
      for (const sch of [0, 1])
        for (let kk = 0; kk + 1 < Q.n; kk++) {
          if (Q.schicht[kk] !== sch) continue;
          extra[kk] = sz.prim[c * 12 + 4] / a.dpr - Q.halb[kk];
          c++;
        }
      return { extra, s: Q.s };
    };
    window.__vn = {
      alt,
      neu,
      sP: P.stueckS[k],
      stelle,
      bild(v, x, y, dt, aktionen) {
        v.setzeAnsicht(a);
        v.zeigerSetzen(x, y, x * a.z + a.ox, y * a.z + a.oy, dt);
        for (const q of aktionen) {
          if (q === 'druecken') v.druecken();
          else if (q === 'loslassen') v.loslassen();
        }
        v.schritt(dt);
        const sz = v.szene(a);
        L.anzeige.zeichnen(sz);
        schild.textContent = v === alt ? 'vorher' : 'nachher';
        // Messen: Buckel der Schwellung nahe am Punkt (über 5 % der größten Höhe), Höhe und Lage des dicksten Punkts
        const { extra, s } = profil(v, sz);
        const sP = P.stueckS[k];
        let best = 0;
        let bs = 0;
        for (let i = 0; i < extra.length; i++)
          if (Math.abs(s[i] - sP) < 60 && extra[i] > best) {
            best = extra[i];
            bs = s[i];
          }
        let buckel = 0;
        for (let i = 1; i + 1 < extra.length; i++) {
          if (Math.abs(s[i] - sP) >= 60) continue;
          if (extra[i] > 0.05 * best && extra[i] > 0.02 && extra[i] > extra[i - 1] && extra[i] >= extra[i + 1]) buckel++;
        }
        const pz = v.netz.punkte[PI];
        const gx = v.zeiger.x + (v.versatz?.x ?? 0);
        const gy = v.zeiger.y + (v.versatz?.y ?? 0);
        return { hoehe: best, lage: bs, buckel, zeigerAmPunkt: Math.hypot(gx - pz.x, gy - pz.y) * a.z, versatz: Math.hypot(v.versatz.x, v.versatz.y) * a.z, ziel: v.stat.ziel };
      },
    };
    // Klickstelle: neben dem Punkt in der Richtung, die am weitesten von allen Linien durch ihn weg liegt
    const winkel = [];
    neu.netz.linien.forEach((l, li) => {
      const Q = neu.proben[li];
      l.punkte.forEach((q, kk) => {
        if (q !== PI) return;
        const s0 = Q.stueckS[kk];
        for (const ds of [-1.5, 1.5]) {
          let b = 0;
          for (let i = 0; i < Q.n; i++) if (Math.abs(Q.s[i] - (s0 + ds)) < Math.abs(Q.s[b] - (s0 + ds))) b = i;
          if (Math.abs(Q.s[b] - s0) > 0.5) winkel.push(Math.atan2(Q.y[b] - p.y, Q.x[b] - p.x));
        }
      });
    });
    let bw = 0;
    let bAbst = -1;
    for (let i = 0; i < 360; i++) {
      const w = (i * Math.PI) / 180;
      const d = Math.min(...winkel.map((u) => Math.abs(Math.atan2(Math.sin(w - u), Math.cos(w - u)))));
      if (d > bAbst) {
        bAbst = d;
        bw = w;
      }
    }
    const r = 0.75 * (L.werte.fangPunkt / Z);
    const [ax, ay] = stelle(P.stueckS[k] + na + 14);
    a.ox = 500 - ((p.x + ax) / 2) * Z;
    a.oy = 330 - ((p.y + ay) / 2) * Z;
    for (const v of [alt, neu]) v.setzeAnsicht(a);
    return { sP: P.stueckS[k], na, ne, p: [p.x, p.y], klick: [p.x + r * Math.cos(bw), p.y + r * Math.sin(bw)], laenge: P.laenge };
  },
  { Z, PI, LI },
);

// Weg (Punkte des Entwurfs): neben der Linie herein, auf ihr zum Punkt, über ihn hinweg, zurück, weg; dann Klick auf den Punkt
const sP = start.sP;
const auf = async (s) => page.evaluate((s) => window.__vn.stelle(s), s);
const K = start.klick;
const sA = sP + start.na + 14;
const sB = sP + 0.4 * start.na;
const sC = sP - 0.5 * start.ne;
const A = await auf(sA);
const neben = [A[0] + 9, A[1] - 7];
const weg = [
  { t0: 0, t1: 0.7, von: neben, nach: A },
  { t0: 0.7, t1: 1.0 },
  { t0: 1.0, t1: 2.6, s0: sA, s1: sB },
  { t0: 2.6, t1: 3.0 },
  { t0: 3.0, t1: 3.9, s0: sB, s1: sC },
  { t0: 3.9, t1: 4.2 },
  { t0: 4.2, t1: 5.9, s0: sC, s1: sA },
  { t0: 5.9, t1: 6.3, von: A, nach: neben },
  { t0: 6.3, t1: 7.0, von: neben, nach: K },
  { t0: 7.0, t1: 8.3 },
  // 50 Bildschirmpunkte weg (diagonal)
  { t0: 8.3, t1: 9.3, von: K, nach: [K[0] + 50 / Z / Math.SQRT2, K[1] + 50 / Z / Math.SQRT2] },
  { t0: 9.3, t1: 9.9 },
];
const ereignisse = [
  { t: 7.25, art: 'druecken' },
  { t: 7.4, art: 'loslassen' },
];
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
let maus = neben;
let abschnitt = -1;
let von = maus;
const lage = async (t) => {
  const i = Math.max(0, weg.findIndex((q) => t <= q.t1));
  const q = weg[i] ?? weg[weg.length - 1];
  if (i !== abschnitt) {
    abschnitt = i;
    von = q.von ?? maus;
  }
  const f = ease(Math.min(1, Math.max(0, (t - q.t0) / (q.t1 - q.t0))));
  if (q.s0 !== undefined) maus = await auf(q.s0 + (q.s1 - q.s0) * f);
  else if (q.nach) maus = [von[0] + (q.nach[0] - von[0]) * f, von[1] + (q.nach[1] - von[1]) * f];
  return maus;
};

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'fliessen-'));
const ende = weg[weg.length - 1].t1;
const mess = { alt: [], neu: [] };
const clip = { x: 500 - KB / 2, y: 320 - KH / 2 + 10, width: KB, height: KH };
const bildDatei = (seite, i) => path.join(ordner, `${seite}-${String(i).padStart(5, '0')}.jpg`);
let n = 0;
for (let t = 0; t <= ende + 1e-9; t += 1 / FPS) {
  const [x, y] = await lage(t);
  const jetzt = ereignisse.filter((e) => !e.fertig && e.t <= t);
  for (const e of jetzt) e.fertig = true;
  for (const seite of ['alt', 'neu']) {
    const m = await page.evaluate(
      ({ seite, x, y, dt, aktionen }) => window.__vn.bild(window.__vn[seite], x, y, dt, aktionen),
      { seite, x, y, dt: 1 / FPS, aktionen: jetzt.map((e) => e.art) },
    );
    mess[seite].push({ t, ...m });
    await page.screenshot({ clip, path: bildDatei(seite, n), type: 'jpeg', quality: 94 });
  }
  n++;
}
// Bildstreifen: rund um den ersten Wechsel von der Spindel zur Nadel (nachher gemessen), dazu nach dem Klick
const wechsel = mess.neu.findIndex((m) => m.t > 0.7 && m.ziel.startsWith('Richtung'));
const losIdx = mess.neu.findIndex((m) => m.t >= 7.4);
const streifenIdx = [wechsel - 2, wechsel + 1, wechsel + 4, wechsel + 7, wechsel + 11, wechsel + 18, losIdx + 12, losIdx + 40];
const streifen = { alt: [], neu: [] };
for (const seite of ['alt', 'neu'])
  for (const i of streifenIdx) streifen[seite].push({ t: mess[seite][i].t, bild: fs.readFileSync(bildDatei(seite, i)).toString('base64') });

// Auswertung
function auswerten(liste) {
  const schwell = liste.filter((m) => m.t >= 1.0 && m.t <= 5.9);
  let doppelt = 0;
  let sprung = 0;
  for (let i = 0; i < schwell.length; i++) {
    if (schwell[i].buckel > 1) doppelt++;
    if (i > 0 && schwell[i].hoehe > 0.3 && schwell[i - 1].hoehe > 0.3) sprung = Math.max(sprung, Math.abs(schwell[i].lage - schwell[i - 1].lage) * Z);
  }
  const hoehen = schwell.map((m) => m.hoehe);
  const voll = Math.max(...hoehen);
  const tiefste = Math.min(...schwell.filter((m) => m.t >= 1.3).map((m) => m.hoehe)) / voll;
  const nachKlick = liste.find((m) => m.t >= 8.25);
  const vorWeg = liste.find((m) => m.t >= 7.6);
  const nachWeg = liste.find((m) => m.t >= 9.85);
  return {
    bilderMitZweiBuckeln: doppelt,
    weitesterSprungDesDickstenPunkts_px: +sprung.toFixed(2),
    tiefsteHoeheImVerhaeltnis: +tiefste.toFixed(3),
    zeigerAmPunktNachKlick_px: +nachKlick.zeigerAmPunkt.toFixed(3),
    versatzInRuhe_px: [+vorWeg.versatz.toFixed(3), +nachKlick.versatz.toFixed(3)],
    versatzNach50pxWeg_anteil: +(nachWeg.versatz / Math.max(1e-6, nachKlick.versatz)).toFixed(3),
  };
}
console.log(JSON.stringify({ vorher: auswerten(mess.alt), nachher: auswerten(mess.neu), fehler }, null, 1));

// Film: links vorher, rechts nachher
const filmAlt = path.join(ordner, 'alt.mp4');
const filmNeu = path.join(ordner, 'neu.mp4');
for (const [s, f] of [
  ['alt', filmAlt],
  ['neu', filmNeu],
])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(ordner, `${s}-%05d.jpg`), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', f]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', filmAlt, '-i', filmNeu, '-filter_complex', '[0:v]pad=iw+12:ih:0:0:white[l];[l][1:v]hstack', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', zielFilm]);

// Bildstreifen: oben vorher, unten nachher
const zeile = (teile, titel) =>
  `<div style="margin:6px 0 4px">${titel}</div><div style="display:flex;gap:8px">${teile
    .map((q) => `<figure style="margin:0"><img src="data:image/jpeg;base64,${q.bild}" style="width:${KB * 0.62}px;border:1px solid #e4e0da;display:block"><figcaption style="font-size:11px;color:#8a817a">${q.t.toFixed(2)} s</figcaption></figure>`)
    .join('')}</div>`;
const seite = await browser.newPage({ viewport: { width: Math.round(KB * 0.62 * 8 + 8 * 9 + 24), height: 300 }, deviceScaleFactor: 2 });
await seite.setContent(
  `<html><body style="margin:0;padding:12px;background:#fff;font:13px -apple-system,Helvetica,sans-serif;color:#1f1a17">${zeile(streifen.alt, 'vorher: die Spindel verschwindet am Zeiger, die Nadel erscheint am Punkt; nach dem Klick gleitet der Zeiger zurück')}${zeile(streifen.neu, 'nachher: die Spindel fließt in die Nadel; nach dem Klick bleibt der Zeiger auf dem Punkt')}</body></html>`,
);
fs.writeFileSync(zielStreifen, await seite.screenshot({ fullPage: true }));
fs.rmSync(ordner, { recursive: true, force: true });
await browser.close();
console.log('Film', zielFilm, n, 'Bilder je Seite; Streifen', zielStreifen);
