// Treiber: Szenen zeichnen, gegen Florians SVG vergleichen, Tempo messen
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../../package.json', import.meta.url));
const pw = require('@playwright/test');
const motor = process.env.MOTOR ?? 'chrome';
const daten = JSON.parse(readFileSync('szenen.json', 'utf8'));
const logoSvg = readFileSync(new URL('../../../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand01_logo.svg', import.meta.url), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
const S = Number(process.env.S ?? 2.5), X0 = -10, Y0 = -10, W = Math.round((386.63 + 20) * S), H = Math.round((413.2 + 20) * S);
const browser = motor === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: motor === 'chrome' ? 'chrome' : undefined, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W + 40, height: H + 40 }, deviceScaleFactor: 1 });
await page.setContent(`<html><body style="margin:0;background:#fff"><canvas id="c"></canvas><script>${readFileSync(new URL('./fluessig.js', import.meta.url), 'utf8')}</script></body></html>`);
const info = await page.evaluate(({ W, H }) => { window.F = Fluessig(document.getElementById('c')); F.groesse(W, H); return F.info(); }, { W, H });
console.log(motor, info);
const EXAKT = { kBein: 0, kKopf: 0, kOhr: 0, kSchwanz: 0, rand: 0, kKlemm: 0, spaltB: 0, spaltL: 1, nahA: 1, mitSpalt: 0, nurSchwarz: 0 };
const FLUESSIG = { kBein: 12 * S, kKopf: 10 * S, kOhr: 8 * S, kSchwanz: 10 * S, rand: 0, kKlemm: 4 * S, spaltB: 7 * S, spaltL: 22 * S, nahA: 1, mitSpalt: 1, nurSchwarz: 0, fernRand: 0 };
// Abgewandte Seite: Rand wächst mit sin(2·Winkel) – an den gezeichneten Posen 0° und 90° genau null
const mitDrehung = (t) => ({ ...FLUESSIG, fernRand: 16 * S * Math.sin(Math.PI * t), kopfMitte: [253 + 60 * t, 175], fernRichtung: [1, 0], kopfRadius: 130 });
async function bild(szene, par, datei) {
  await page.evaluate(({ teile, par, S, X0, Y0 }) => { F.zeichne(teile, { s: S, x0: X0, y0: Y0 }, par); }, { teile: daten.szenen[szene], par, S, X0, Y0 });
  const url = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  writeFileSync(datei, Buffer.from(url.split(',')[1], 'base64'));
  return url;
}
// Vergleich mit SVG im selben Rahmen
async function vergleich(urlA, datei) {
  const svg = logoSvg.replace(/viewBox="[^"]+"/, `viewBox="${X0} ${Y0} ${W / S} ${H / S}" width="${W}" height="${H}"`);
  return await page.evaluate(async ({ urlA, svg, W, H }) => {
    const lade = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
    const a = await lade(urlA), b = await lade('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.drawImage(b, 0, 0, W, H); const B = c.getImageData(0, 0, W, H).data;
    c.fillRect(0, 0, W, H); c.drawImage(a, 0, 0); const A = c.getImageData(0, 0, W, H).data;
    const out = c.createImageData(W, H); let nur1 = 0, nur2 = 0, schwarzRef = 0, summe = 0;
    for (let i = 0; i < A.length; i += 4) {
      const la = A[i] / 255, lb = B[i] / 255; summe += Math.abs(la - lb); if (lb < 0.5) schwarzRef++;
      const g = 255 - Math.round(Math.min(la, lb) * 40 + 215);
      out.data[i] = 235 - g; out.data[i + 1] = 235 - g; out.data[i + 2] = 235 - g; out.data[i + 3] = 255;
      if (la < 0.5 && lb >= 0.5) { nur1++; out.data[i] = 220; out.data[i + 1] = 30; out.data[i + 2] = 30; }
      else if (lb < 0.5 && la >= 0.5) { nur2++; out.data[i] = 30; out.data[i + 1] = 90; out.data[i + 2] = 230; }
    }
    c.putImageData(out, 0, 0);
    return { url: cv.toDataURL('image/png'), nurNeu: nur1, nurVorlage: nur2, schwarzRef, mittlererUnterschied: summe / (W * H) };
  }, { urlA, svg, W, H }).then(r => { writeFileSync(datei, Buffer.from(r.url.split(',')[1], 'base64')); delete r.url; return r; });
}
const tag = motor;
const uExakt = await bild('logo', EXAKT, `logo-exakt-${tag}.png`);
console.log('Logo exakt gegen Vorlage:', await vergleich(uExakt, `diff-logo-exakt-${tag}.png`));
const uFl = await bild('logo', FLUESSIG, `logo-fluessig-${tag}.png`);
console.log('Logo flüssig gegen Vorlage:', await vergleich(uFl, `diff-logo-fluessig-${tag}.png`));
const TW = { kopf30: 1 / 3, kopf45: 0.5, kopf60: 2 / 3, profil: 1 };
for (const sz of ['kopf30', 'kopf45', 'kopf60', 'profil']) { await bild(sz, EXAKT, `${sz}-exakt-${tag}.png`); await bild(sz, FLUESSIG, `${sz}-fluessig-${tag}.png`); await bild(sz, mitDrehung(TW[sz]), `${sz}-verdeckt-${tag}.png`); }
await bild('logo', mitDrehung(0), `logo-verdeckt-${tag}.png`);
// Tempo: Teile je Bild neu abflachen und hochladen, wie beim Animieren
const zeitenOhne = await page.evaluate(async ({ teile, par, S, X0, Y0 }) => { window.OHNE_UMRISS = true;
  const z = []; for (let i = 0; i < 160; i++) { const t0 = performance.now(); F.zeichne(teile, { s: S, x0: X0, y0: Y0 }, par); F.warte(); z.push(performance.now() - t0); }
  window.OHNE_UMRISS = false; z.sort((a, b) => a - b); return { median: z[80].toFixed(2), p95: z[152].toFixed(2) };
}, { teile: daten.szenen.kopf45, par: FLUESSIG, S, X0, Y0 });
console.log('ohne Außenkanten-Suche auf der CPU:', zeitenOhne);
const zeiten = await page.evaluate(async ({ teile, par, S, X0, Y0 }) => {
  const z = []; for (let i = 0; i < 160; i++) { const t0 = performance.now(); F.zeichne(teile, { s: S, x0: X0, y0: Y0 }, par); F.warte(); z.push(performance.now() - t0); }
  z.sort((a, b) => a - b); return { median: z[80].toFixed(2), p95: z[152].toFixed(2), max: z[159].toFixed(2) };
}, { teile: daten.szenen.kopf45, par: FLUESSIG, S, X0, Y0 });
console.log('Zeit je Bild (ms) bei', W, '×', H, ':', zeiten);
await browser.close();
