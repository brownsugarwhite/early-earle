// Tempo der Bühne: öffnet maskottchen.html in einer Fenstergröße wie auf dem Mac oder dem iPhone, lässt Ozzy laufen und misst
//   - die Abstände der Bilder (requestAnimationFrame) im echten Takt,
//   - je Schritt die Zeit auf dem Prozessor (Spieler, Figur rechnen, Bühne) und mit gl.finish die Zeit der Grafikkarte.
//   [MOTOR=chromium|webkit] [BREITE=1512 HOEHE=945 DPR=2] [REITER=bibliothek|spielen] node scripts/maskottchen/tempo.mjs
import { chromium, webkit } from '@playwright/test';

const motor = process.env.MOTOR ?? 'chromium';
const breite = Number(process.env.BREITE ?? 1512);
const hoehe = Number(process.env.HOEHE ?? 945);
const dpr = Number(process.env.DPR ?? 2);
const reiter = process.env.REITER ?? 'bibliothek';
const browser =
  motor === 'webkit'
    ? await webkit.launch()
    : await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const seite = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: dpr });
await seite.goto(`http://localhost:5207/maskottchen.html?reiter=${reiter}`);
await seite.waitForFunction(() => window.__ozzy);
await seite.waitForTimeout(800);
const erg = await seite.evaluate(async (reiter) => {
  const o = window.__ozzy;
  const b = o.buehne;
  const fl = b.fluessig;
  const gl = fl?.gl;
  const sp = reiter === 'spielen' ? o.spiel.spieler : o.bibSpieler;
  if (reiter === 'spielen') {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  } else sp.spiele('laufen', 0.3);
  // Prozessorzeit je Schritt im laufenden Takt
  const summe = {};
  const wickeln = (obj, name, key) => {
    const f = obj[name].bind(obj);
    obj[name] = (...a) => {
      const s = performance.now();
      const r = f(...a);
      summe[key] = (summe[key] ?? 0) + performance.now() - s;
      return r;
    };
  };
  wickeln(sp, 'update', 'spieler');
  wickeln(o.figur, 'zeichenteile', 'figurRechnen');
  wickeln(b, 'figur', 'buehneFigur');
  wickeln(b, 'anfangen', 'anfangen');
  if (fl) wickeln(fl, 'figur', 'gpuPass');
  // echte Bildabstände
  const abstaende = [];
  let letzte = performance.now();
  await new Promise((fertig) => {
    const t0 = performance.now();
    const schritt = (jetzt) => {
      abstaende.push(jetzt - letzte);
      letzte = jetzt;
      if (jetzt - t0 < 3000) requestAnimationFrame(schritt);
      else fertig();
    };
    requestAnimationFrame(schritt);
  });
  const n = abstaende.length;
  const sortiert = [...abstaende].slice(5).sort((a, c) => a - c);
  const q = (x) => +sortiert[Math.floor(x * (sortiert.length - 1))].toFixed(1);
  const jeBild = Object.fromEntries(Object.entries(summe).map(([k, v]) => [k, +(v / n).toFixed(2)]));
  // Grafikkarte: ganze Figur mit gl.finish
  const p = sp.update(1 / 60);
  const teile = o.figur.zeichenteile(p);
  const gpu = {};
  if (gl) {
    const messe = (name, f, k = 15) => {
      gl.finish();
      const s = performance.now();
      for (let i = 0; i < k; i++) f();
      gl.finish();
      gpu[name] = +((performance.now() - s) / k).toFixed(2);
    };
    messe('figurMitFinish', () => b.figur(teile));
    // wie bisher für Prüfblätter: in den Grund kopiert
    b.inGrund = true;
    messe('figurInGrund', () => b.figur(teile));
    b.inGrund = false;
  }
  return { leinwand: [b.grund.width, b.grund.height], massstab: +b.kamera.massstab.toFixed(3), bilder: n, median: q(0.5), p95: q(0.95), max: q(1), jeBild, gpu };
}, reiter);
console.log(JSON.stringify({ motor, breite, hoehe, dpr, reiter, ...erg }));
await browser.close();
