// Was das Zeichnen je Bild kostet (Plan vom 12.11., Schritt 1): alle vier Felder und jedes Feld für sich, grob (`&anzeige=grob`,
// die Anzeige bis zum 12.11.) und glatt (Standard), an gesicherten Formen. Gemessen mit Warten auf die Grafikkarte
// (`__kurven.zeichnenMs`). Aufruf aus apps/editor:
//   node scripts/pruefen/anzeige-zeichnen-zeit.mjs ["strange bird,teat firefish"]
// Umgebung: URL (Standard http://localhost:5197), BREITE, HOEHE (1600 × 1000), DPR (2), FEIN (legt die Stufen fest, z. B. 0, 1, 2)
import { chromium } from '@playwright/test';

const liste = (process.argv[2] ?? 'strange bird').split(',');
const basis = process.env.URL ?? 'http://localhost:5197';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const fein = process.env.FEIN ? `&fein=${process.env.FEIN}` : '';
for (const name of liste) {
  for (const [titel, frage] of [
    ['grobe Anzeige', '&anzeige=grob'],
    ['glatte Anzeige', fein],
  ]) {
    const seite = await browser.newPage({
      viewport: { width: Number(process.env.BREITE ?? 1600), height: Number(process.env.HOEHE ?? 1000) },
      deviceScaleFactor: Number(process.env.DPR ?? 2),
    });
    await seite.goto(`${basis}/kurven.html?gewichte=geometrie${frage}`);
    await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
    await seite.evaluate((n) => window.__kurven.ablage.laden(n), name);
    await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
    await seite.waitForFunction(() => !window.__kurven.glatt() || !window.__kurven.glatt().wirdFeiner, null, { timeout: 20000 });
    await seite.waitForTimeout(400);
    const m = await seite.evaluate(() => {
      const k = window.__kurven;
      const g = k.glatt();
      return {
        dreiecke: g ? g.dreiecke : k.dreiecke().length / 3,
        alle: k.zeichnenMs(20),
        seite: k.zeichnenMs(20, 'seite'),
        front: k.zeichnenMs(20, 'front'),
        top: k.zeichnenMs(20, 'top'),
        drei: k.zeichnenMs(20, 'drei'),
      };
    });
    const f = (x) => x.toFixed(1);
    console.log(
      `„${name}“ ${titel}: ${Math.round(m.dreiecke).toLocaleString('de-DE')} Dreiecke · alle vier Felder ${f(m.alle)} ms · Seite ${f(m.seite)} · Front ${f(m.front)} · Top ${f(m.top)} · 3D ${f(m.drei)} ms`,
    );
    await seite.close();
  }
}
await browser.close();
