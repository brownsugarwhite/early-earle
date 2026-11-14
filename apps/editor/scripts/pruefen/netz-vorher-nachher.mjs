// Plan vom 12.11., Schritt 2 „kleines Rechennetz“: die Form vorher und nachher übereinander. Je gesicherter Form ein JPG mit drei
// Bildern des Fensters `kurven.html`: links mit dem Netz bis zum 12.11. (`&netz=dicht`), in der Mitte mit dem kleinen Rechennetz
// (Standard), rechts das neue Bild, darüber in Magenta Umriss und Linien des alten, wo sie nicht auf denen des neuen liegen.
// Aufruf aus apps/editor:
//   node scripts/pruefen/netz-vorher-nachher.mjs <zielordner> ["strange bird,teat firefish,test_kaputt"]
// Umgebung: URL (Standard http://localhost:5197), BREITE, HOEHE (Fenster je Bild, Standard 1500 × 940), DPR (1.6),
//   SETZEN=1 (beide Formen vor dem Bild einmal neu rechnen, wie es der erste Griff täte), ALT / NEU (Schalter der zwei Seiten,
//   Standard "&netz=dicht" und ""), ZUSATZ (Schalter für beide, z. B. "&anzeige=grob"), ALLES=1 (jedes Blatt zeigt die ganze
//   Form statt des gesicherten Ausschnitts)
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const [ziel, liste = 'strange bird,teat firefish,test_kaputt'] = process.argv.slice(2);
if (!ziel) throw new Error('Zielordner fehlt');
const basis = process.env.URL ?? 'http://localhost:5197';
const breite = Number(process.env.BREITE ?? 1500);
const hoehe = Number(process.env.HOEHE ?? 940);
const dpr = Number(process.env.DPR ?? 1.6);
const ALT = process.env.ALT ?? '&netz=dicht';
const NEU = process.env.NEU ?? '';
const ZUSATZ = process.env.ZUSATZ ?? '';
const SETZEN = process.env.SETZEN === '1';
const ALLES = process.env.ALLES === '1';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function bild(name, frage) {
  const seite = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: dpr });
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(String(e)));
  await seite.goto(`${basis}/kurven.html?gewichte=geometrie${frage}${ZUSATZ}`);
  await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
  const t0 = Date.now();
  const meldung = await seite.evaluate((n) => window.__kurven.ablage.laden(n), name);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
  const laden = Date.now() - t0;
  let weg = null;
  if (SETZEN) {
    // 40 Runden über die ganze Haut (`nachrechnen`): der größte Weg eines Punkts dabei
    weg = await seite.evaluate(() => {
      const k = window.__kurven;
      const vor = Float64Array.from(k.lagen());
      k.nachrechnen(40);
      const nach = k.lagen();
      let w = 0;
      for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(nach[i] - vor[i], nach[i + 1] - vor[i + 1], nach[i + 2] - vor[i + 2]));
      return Math.round(100 * w) / 100;
    });
    await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
  }
  if (ALLES)
    for (const [x, y] of [[0.25, 0.3], [0.75, 0.3], [0.25, 0.8], [0.75, 0.8]]) {
      await seite.mouse.move(x * breite, y * hoehe);
      await seite.keyboard.press('Home');
    }
  await seite.waitForFunction(() => !window.__kurven.glatt() || !window.__kurven.glatt().wirdFeiner, null, { timeout: 20000 });
  await seite.waitForTimeout(400);
  const punkte = await seite.evaluate(() => window.__kurven.zeiten().punkte);
  const daten = (await seite.screenshot({ type: 'png' })).toString('base64');
  await seite.close();
  if (fehler.length) console.log(`  Fehler der Seite (${name}${frage}): ${fehler.join(' | ')}`);
  return { daten, punkte, meldung, laden, weg };
}

for (const name of liste.split(',')) {
  const vorher = await bild(name, ALT);
  const nachher = await bild(name, NEU);
  const zahl = (n) => n.toLocaleString('de-DE');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#efe9dd;font:15px/1.3 -apple-system,'Helvetica Neue',sans-serif;color:#1f1a17}
    .reihe{display:flex;gap:6px;padding:6px}
    figure{margin:0;flex:1}
    figcaption{padding:4px 2px 6px;font-weight:600}
    figcaption small{font-weight:400;opacity:.7;margin-left:8px}
    img,canvas{display:block;width:100%;border:1px solid rgba(31,26,23,.3)}
  </style><div class="reihe">
    <figure><figcaption>„${name}“ vorher<small>${zahl(vorher.punkte)} Punkte gerechnet</small></figcaption><img id="a" src="data:image/png;base64,${vorher.daten}"></figure>
    <figure><figcaption>mit kleinem Rechennetz<small>${zahl(nachher.punkte)} Punkte gerechnet (${Math.round((100 * nachher.punkte) / vorher.punkte)} %)</small></figcaption><img id="b" src="data:image/png;base64,${nachher.daten}"></figure>
    <figure><figcaption>übereinander<small>Magenta: Umriss und Linien von vorher, wo sie neben den neuen liegen</small></figcaption><canvas id="c"></canvas></figure>
  </div>`;
  const blatt = await browser.newPage({ viewport: { width: Math.round(3 * breite * dpr) + 24, height: 400 }, deviceScaleFactor: 1 });
  await blatt.setContent(html);
  await blatt.waitForFunction(() => document.getElementById('a').complete && document.getElementById('b').complete);
  // dunkle Bildpunkte (Umriss, Linien) des alten Bilds, die im neuen in einem Umkreis von einem Bildpunkt nicht dunkel sind
  const neben = await blatt.evaluate(() => {
    const a = document.getElementById('a');
    const b = document.getElementById('b');
    const c = document.getElementById('c');
    const w = (c.width = a.naturalWidth);
    const h = (c.height = a.naturalHeight);
    const g = c.getContext('2d');
    g.drawImage(a, 0, 0);
    const A = g.getImageData(0, 0, w, h).data;
    g.drawImage(b, 0, 0);
    const bild = g.getImageData(0, 0, w, h);
    const B = bild.data;
    const dunkel = (D, i) => D[i] + D[i + 1] + D[i + 2] < 210;
    let zahl = 0;
    const aus = new Uint8ClampedArray(B);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = 4 * (y * w + x);
        if (!dunkel(A, i)) continue;
        let nah = false;
        for (let dy = -1; dy <= 1 && !nah; dy++) for (let dx = -1; dx <= 1 && !nah; dx++) nah = dunkel(B, i + 4 * (dy * w + dx));
        if (nah) continue;
        aus[i] = 225;
        aus[i + 1] = 0;
        aus[i + 2] = 140;
        zahl++;
      }
    bild.data.set(aus);
    g.putImageData(bild, 0, 0);
    return zahl;
  });
  await blatt.waitForTimeout(200);
  const pfad = resolve(ziel, `netz-klein-${name.replace(/\s+/g, '-')}-2026-11-12.jpg`);
  await blatt.screenshot({ path: pfad, type: 'jpeg', quality: 88, fullPage: true });
  await blatt.close();
  console.log(`${pfad}`);
  console.log(`  „${name}“: ${zahl(vorher.punkte)} → ${zahl(nachher.punkte)} Punkte · Laden bis zur Ruhe ${vorher.laden} ms → ${nachher.laden} ms · ${zahl(neben)} dunkle Bildpunkte von vorher liegen neben den neuen${SETZEN ? ` · beim Neurechnen gegangen: vorher ${JSON.stringify(vorher.weg)}, nachher ${JSON.stringify(nachher.weg)}` : ''}`);
  console.log(`  ${nachher.meldung}`);
}
await browser.close();
