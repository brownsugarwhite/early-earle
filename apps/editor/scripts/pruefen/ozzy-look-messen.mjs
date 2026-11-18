// Die Messlatte für den Look (Plan 2026-11-18-ozzy-nach-dem-ersten-test.md, Schritt 4): dieselbe Form gleich groß in der Vorlage
// (`raum.html` der Linien-Studie, Florian: „die exakte vorlage“) und in Ozzy: eingerastete Seite, Feld der Seite in den Vier
// Ansichten, Wand der Seite im Raum, Kurvennetz im Raum. Je Bild die Breite des Umrisses (Gerätepunkte): von außen her je Zeile und
// Spalte die Tinte bis zum Papier aufsummiert, um die Schräge des Umrisses berichtigt; Median, 10 % und 90 %.
// Kein Kriterium, eine Messung; mit einem Ordner dazu die Ausschnitte als Bilder (für ein Blatt).
// Aufruf aus apps/editor: node scripts/pruefen/ozzy-look-messen.mjs [ordner]
//   FORM (Standard „strange bird“)   VORLAGE_URL (Standard http://localhost:5199/raum.html; Eintrag `linien-look`)   FLICKEN wie `ozzy-teile.mjs`
import { chromium } from '@playwright/test';
import { auf, GPU_ARGS } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const FORM = process.env.FORM ?? 'strange bird';
const VORLAGE = process.env.VORLAGE_URL ?? 'http://localhost:5199/raum.html';
const B = 1440;
const H = 900;
const D = 2;
const z1 = (x) => x.toFixed(1).replace('.', ',');

/** im Browser: Kasten der Tinte und Breite des Umrisses eines Bilds (PNG als Base64) */
const messenImBild = async (seite, b64) =>
  seite.evaluate(async (daten) => {
    const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${daten}`)).blob());
    const c = new OffscreenCanvas(bild.width, bild.height);
    const g = c.getContext('2d');
    g.drawImage(bild, 0, 0);
    const P = g.getImageData(0, 0, bild.width, bild.height).data;
    const w = bild.width;
    const h = bild.height;
    // Tinte je Bildpunkt (0 Papier … 1 Tinte): Die feinen grünen Linien zählen kaum
    const d = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) d[i] = Math.max(0, 1 - Math.min(P[4 * i], P[4 * i + 1], P[4 * i + 2]) / 225);
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[y * w + x] > 0.6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    // von außen her: Anfang und aufsummierte Tinte des ersten Strichs je Zeile (dx = ±1) oder Spalte
    const lauf = (laenge, an) => {
      const anfang = new Float32Array(laenge).fill(NaN);
      const tinte = new Float32Array(laenge).fill(NaN);
      for (let k = 0; k < laenge; k++) {
        let i = 0;
        while (i < 4000 && an(k, i) !== null && an(k, i) < 0.3) i++;
        if (an(k, i) === null || i >= 4000) continue;
        let s = 0, j = i - 1, leer = 0;
        // (ein Bildpunkt davor gehört zur weichen Kante)
        if (j >= 0 && an(k, j) !== null) s += an(k, j);
        for (j = i; j < i + 40; j++) {
          const v = an(k, j);
          if (v === null) break;
          s += v;
          leer = v < 0.08 ? leer + 1 : 0;
          if (leer >= 2) break;
        }
        anfang[k] = i;
        tinte[k] = s;
      }
      return { anfang, tinte };
    };
    const breiten = [];
    const sammeln = ({ anfang, tinte }) => {
      for (let k = 4; k + 4 < anfang.length; k += 2) {
        const a = anfang[k - 3], b = anfang[k + 3], m0 = anfang[k];
        if (!(a === a) || !(b === b) || !(m0 === m0)) continue;
        if (Math.abs(a - m0) > 5 || Math.abs(b - m0) > 5) continue;
        const m = (b - a) / 6;
        if (Math.abs(m) > 1.2) continue;
        const t = tinte[k] / Math.sqrt(1 + m * m);
        if (t > 0.2 && t < 30) breiten.push(t);
      }
    };
    const bei = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : d[y * w + x]);
    sammeln(lauf(y1 - y0 + 1, (k, i) => bei(x0 - 3 + i, y0 + k)));
    sammeln(lauf(y1 - y0 + 1, (k, i) => bei(x1 + 3 - i, y0 + k)));
    sammeln(lauf(x1 - x0 + 1, (k, i) => bei(x0 + k, y0 - 3 + i)));
    sammeln(lauf(x1 - x0 + 1, (k, i) => bei(x0 + k, y1 + 3 - i)));
    breiten.sort((p, q) => p - q);
    const q = (f) => breiten[Math.min(breiten.length - 1, Math.floor(f * breiten.length))] ?? NaN;
    return { kasten: [x0, y0, x1, y1], breite: x1 - x0, hoehe: y1 - y0, median: q(0.5), p10: q(0.1), p90: q(0.9), zahl: breiten.length };
  }, b64);

const ergebnis = [];
const zeile = (wort, m) => {
  ergebnis.push([wort, m]);
  console.log(m ? `${wort.padEnd(40)} Form im Bild ${m.breite} × ${m.hoehe} · Umriss ${z1(m.median)} (10 %: ${z1(m.p10)}, 90 %: ${z1(m.p90)}) Gerätepunkte, ${m.zahl} Stellen` : `${wort.padEnd(40)} nichts gefunden`);
};
const aufnehmen = async (seite, name, clip) => {
  const png = await seite.screenshot(clip ? { clip } : {});
  if (ordner) (await import('node:fs')).writeFileSync(`${ordner}/look-${name}.png`, png);
  return png.toString('base64');
};

// ---------- die Vorlage ----------
let zielBreite = 0;
{
  const b = await chromium.launch({ args: GPU_ARGS });
  const s = await b.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: D });
  await s.goto(`${VORLAGE}?form=${encodeURIComponent(FORM)}`);
  await s.waitForTimeout(3500);
  await s.keyboard.press('1');
  await s.waitForTimeout(2000);
  await s.mouse.move(40, 20);
  await s.waitForTimeout(500);
  const m = await messenImBild(s, await aufnehmen(s, 'vorlage-seite', { x: 0, y: 0, width: B, height: 800 }));
  zeile('Vorlage, Seite', m);
  zielBreite = m?.breite ?? 0;
  await s.keyboard.press('4');
  await s.waitForTimeout(2000);
  zeile('Vorlage, schräg', await messenImBild(s, await aufnehmen(s, 'vorlage-schraeg', { x: 0, y: 0, width: B, height: 800 })));
  await b.close();
}

// ---------- Ozzy ----------
{
  const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: FORM, b: B, h: H, dichte: D });
  await geladen();
  await s.waitForTimeout(1500);
  /** an (x, y) zoomen, bis die Form so breit ist wie in der Vorlage: erst messen, dann ein Dreh am Rad mit genau dem fehlenden Faktor */
  const gleichGross = async (x, y, clip) => {
    for (let k = 0; k < 3; k++) {
      await s.mouse.move(40, 20);
      await s.waitForTimeout(400);
      const m = await messenImBild(s, (await s.screenshot({ clip })).toString('base64'));
      if (!m || !zielBreite) return;
      const f = zielBreite / m.breite;
      if (Math.abs(f - 1) < 0.01) return;
      await s.mouse.move(x, y);
      await s.mouse.wheel(0, -Math.log(f) / 0.0015);
      await s.waitForTimeout(900);
    }
  };
  const bereich = { x: 70, y: 96, width: B - 190, height: H - 170 };
  // eingerastete Seite
  await s.keyboard.press('1');
  await s.waitForTimeout(2200);
  await ruhig();
  await gleichGross(B / 2, H / 2, bereich);
  await s.mouse.move(40, 20);
  await s.waitForTimeout(500);
  zeile('Ozzy, eingerastete Seite', await messenImBild(s, await aufnehmen(s, 'ozzy-seite', bereich)));
  await s.keyboard.press('Home');
  await s.waitForTimeout(600);
  // Wand der Seite im Raum: ihr Kasten aus den Orten der Linie der Mitte auf der Wand
  await s.keyboard.press('0');
  await s.waitForTimeout(2200);
  await ruhig();
  const wandKasten = async () => {
    const L = await O('werkLinienDaten');
    const xs = [], ys = [];
    for (const l of L) for (const p of l.punkte) {
      const q = await O('flaecheHin', 'seite', p.x, -p.y);
      if (q) { xs.push(q.x); ys.push(q.y); }
    }
    const r = 46;
    const x = Math.max(0, Math.min(...xs) - r), y = Math.max(0, Math.min(...ys) - r);
    return { x, y, width: Math.min(B, Math.max(...xs) + r) - x, height: Math.min(H, Math.max(...ys) + r) - y };
  };
  let wk = await wandKasten();
  await gleichGross(wk.x + wk.width / 2, wk.y + wk.height / 2, wk);
  wk = await wandKasten();
  await s.mouse.move(40, 20);
  await s.waitForTimeout(500);
  zeile('Ozzy, Wand der Seite im Raum', await messenImBild(s, await aufnehmen(s, 'ozzy-wand-seite', wk)));
  if (ordner) await aufnehmen(s, 'ozzy-raum', null);
  await s.keyboard.press('Home');
  await s.waitForTimeout(800);
  // Kurvennetz im Raum (W)
  await s.keyboard.press('w');
  await s.waitForTimeout(1200);
  await gleichGross(B / 2, H / 2, bereich);
  await s.mouse.move(40, 20);
  await s.waitForTimeout(500);
  zeile('Ozzy, Kurvennetz im Raum', await messenImBild(s, await aufnehmen(s, 'ozzy-kurvennetz', bereich)));
  await s.keyboard.press('w');
  await s.keyboard.press('Home');
  await s.waitForTimeout(800);
  // Feld der Seite in den Vier Ansichten
  await s.mouse.move(B - 10, H - 10);
  await s.keyboard.press('Tab');
  await s.waitForTimeout(2600);
  await ruhig();
  const F = await O('felderJetzt');
  const fs = { x: F.seite.x + 4, y: F.seite.y + 4, width: F.seite.w - 8, height: F.seite.h - 8 };
  await gleichGross(F.seite.x + F.seite.w / 2, F.seite.y + F.seite.h / 2, fs);
  await s.mouse.move(40, 20);
  await s.waitForTimeout(500);
  zeile('Ozzy, Feld der Seite (Vier Ansichten)', await messenImBild(s, await aufnehmen(s, 'ozzy-feld-seite', fs)));
  if (fehler.length) console.log(`Konsole: ${[...new Set(fehler)].slice(0, 4).join(' | ')}`);
  await browser.close();
}
const v = ergebnis[0]?.[1];
if (v) for (const [wort, m] of ergebnis.slice(2)) if (m) console.log(`   ${wort}: Umriss ${z1(m.median - v.median)} Gerätepunkte ${m.median >= v.median ? 'breiter' : 'schmaler'} als die Vorlage (${z1(m.median / v.median)}-fach)`);
