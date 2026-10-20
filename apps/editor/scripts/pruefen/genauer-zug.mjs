// Plan „Genauer Zug“ (20.10.): Pinsel „Ziehen“ weich gegen genau mit echten Mauszügen auf der Bühne. Je Modus und Radius:
// neue Kugel, Strich von einem Hautpunkt aus, dann Abstand des gegriffenen Hautpunkts zum Zeiger (Feldpixel der Bühne),
// vor und nach „Formen folgen“. Bilder mit Marken (Kreuz = Zeiger am Ende, Punkt = gegriffener Hautpunkt) und Käfig.
// Aufruf: EDITOR_URL=http://localhost:5192 node apps/editor/scripts/pruefen/genauer-zug.mjs (eigener Vite, nie 5180).
// Umgebung: CHROMIUM=<Pfad> (Cloud: /opt/pw-browsers/chromium-1194/chrome-linux/chrome), RADIEN=0.12,0.25, KOERPER=roehre|teile (Startkugel als Röhre bzw. als Körper aus Teilen)
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const AUSGABE = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe');
mkdirSync(AUSGABE, { recursive: true });
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const radien = (process.env.RADIEN ?? '0.12,0.25').split(',').map(Number);
const koerper = process.env.KOERPER ?? 'roehre';
// Mac: echte GPU (Metal); Cloud (CHROMIUM gesetzt): SwiftShader, WebGL2-Rückfall des Renderers
const browser = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
  args: process.env.CHROMIUM ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'],
});
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[browser]', m.text().slice(0, 160));
});

/** Hautpunkt (Dreieck + baryzentrische Gewichte) aus den angezeigten Lagen. */
const hautpunkt = (lagen, dreieck, bary) => [0, 1, 2].map((k) => bary[0] * lagen[9 * dreieck + k] + bary[1] * lagen[9 * dreieck + 3 + k] + bary[2] * lagen[9 * dreieck + 6 + k]);

const ergebnisse = [];
for (const radius of radien) {
  for (const modus of ['weich', 'genau']) {
    await page.goto(`${url}/?bauweise=kern&look=earle&palette=blob${modus === 'genau' ? '&genau=1' : ''}`);
    await page.waitForFunction(() => window.__editor && window.__editor.vertices() > 0, null, { timeout: 90_000 });
    await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 }).catch(() => console.log('keine Stationen nach 30 s'));
    if (koerper === 'teile') {
      // Körper aus Teilen (Tafel Körper → „Teile“): dieselbe Startkugel als Baum, danach genauer Bau
      await page.evaluate(() => {
        const s = window.__stores.editor.getState();
        s.setzeDokument({ ...s.dok, ausstattung: { ...(s.dok.ausstattung ?? {}), koerper: 'teile' } });
      });
      await page.waitForTimeout(3000);
    }
    await page.evaluate((r) => window.__stores.ui.getState().setzePinselRadius(r), radius);
    await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('ziehen'));
    const c = await page.evaluate(() => window.__stores.rahmen.getState().rects.creation);
    // Startpunkt: rechts der Mitte der Bühne auf der Haut (Feldpixel), Zug nach rechts oben
    const px = Math.round(c.w * 0.56);
    const py = Math.round(c.h * 0.52);
    const dx = 46;
    const dy = -38;
    const t0 = await page.evaluate(([x, y]) => window.__editor.treffen(x, y), [px, py]);
    if (!t0 || t0.flaeche < 0) {
      console.log(`${modus} r ${radius}: kein Körpertreffer bei (${px}, ${py})`);
      continue;
    }
    const vorher = await page.evaluate(() => window.__editor.netzLagen());
    const bary = await page.evaluate(({ lagen, d, p }) => {
      const o = 9 * d;
      const a = lagen.slice(o, o + 3), b = lagen.slice(o + 3, o + 6), cc = lagen.slice(o + 6, o + 9);
      const v0 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v1 = [cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]], v2 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      const d00 = dot(v0, v0), d01 = dot(v0, v1), d11 = dot(v1, v1), d20 = dot(v2, v0), d21 = dot(v2, v1);
      const n = d00 * d11 - d01 * d01;
      const v = (d11 * d20 - d01 * d21) / n, w = (d00 * d21 - d01 * d20) / n;
      return [1 - v - w, v, w];
    }, { lagen: vorher, d: t0.dreieck, p: t0.punkt });
    const start = await page.evaluate((p) => window.__editor.projizieren('creation', p), hautpunkt(vorher, t0.dreieck, bary));
    // Strich wie mit der Maus: schweben, drücken, zehn Schritte, kurz halten (der letzte Zug ist gebaut), loslassen
    await page.mouse.move(c.x + px, c.y + py);
    await page.waitForTimeout(150);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(c.x + px + (dx * i) / 10, c.y + py + (dy * i) / 10);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1500);
    const imZug = await page.evaluate(() => window.__editor.netzLagen());
    await page.mouse.up();
    await page.evaluate(() => window.__stores.ui.getState().setzeWerkzeug('auswahl'));
    await page.mouse.move(c.x + 4, c.y + 4);
    await page.waitForTimeout(3500);
    const nachher = await page.evaluate(() => window.__editor.netzLagen());
    const ziel = [px + dx, py + dy];
    const messen = async (lagen) => {
      if (!lagen || lagen.length !== vorher.length) return { px: null, punkt: null };
      const q = await page.evaluate((p) => window.__editor.projizieren('creation', p), hautpunkt(lagen, t0.dreieck, bary));
      return { px: q ? Math.hypot(q[0] - ziel[0], q[1] - ziel[1]) : null, punkt: q };
    };
    const a = await messen(imZug);
    const b = await messen(nachher);
    const weg = start ? Math.hypot(ziel[0] - start[0], ziel[1] - start[1]) : null;
    const zeile = { koerper, modus, radius, startPx: start, zielPx: ziel, zeigerweg: weg, abstandImZug: a.px, abstandNachFolgen: b.px, ecken: vorher.length / 3 };
    ergebnisse.push(zeile);
    console.log(`${koerper} ${modus} r ${radius}: Zeigerweg ${weg?.toFixed(1)} px, Hautpunkt → Zeiger im Zug ${a.px?.toFixed(2)} px, nach „Formen folgen“ ${b.px?.toFixed(2)} px`);
    // Bild: Marken über der Bühne, Käfig eingeblendet
    await page.evaluate(() => window.__stores.kernAnzeige?.getState().setzeKaefig?.(true));
    await page.waitForTimeout(2500);
    await page.evaluate(({ c, ziel, p, start }) => {
      for (const e of document.querySelectorAll('.genau-marke')) e.remove();
      const marke = (x, y, farbe, form) => {
        const m = document.createElement('div');
        m.className = 'genau-marke';
        m.style.cssText = `position:fixed;left:${c.x + x - 7}px;top:${c.y + y - 7}px;width:14px;height:14px;z-index:99999;pointer-events:none;${form === 'kreuz' ? `background:linear-gradient(45deg,transparent 45%,${farbe} 45%,${farbe} 55%,transparent 55%),linear-gradient(-45deg,transparent 45%,${farbe} 45%,${farbe} 55%,transparent 55%)` : `border-radius:50%;background:${farbe};border:2px solid white`}`;
        document.body.appendChild(m);
      };
      if (start) marke(start[0], start[1], '#2b50d8', 'punkt');
      marke(ziel[0], ziel[1], '#d81b60', 'kreuz');
      if (p) marke(p[0], p[1], '#00a37a', 'punkt');
    }, { c, ziel, p: b.punkt ?? a.punkt, start });
    await page.screenshot({ path: `${AUSGABE}/genauer-zug-${koerper}-${modus}-r${radius}.png`, clip: { x: c.x, y: c.y, width: c.w, height: c.h }, timeout: 180_000 });
  }
}
writeFileSync(`${AUSGABE}/genauer-zug-${koerper}.json`, JSON.stringify(ergebnisse, null, 1));
await browser.close();
