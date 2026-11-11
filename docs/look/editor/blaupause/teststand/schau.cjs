/* eslint-disable @typescript-eslint/no-require-imports -- Node-Skript (CommonJS) */
// Bilder des Teststands: node schau.cjs <ausgabe-präfix> '[schritte als JSON]'
// Lädt dist/blaupause-teststand.html (vorher `node bau.mjs`) in Chromium, wie das Artefakt sie zeigt (in einem Gerüst), und macht je
// Schritt ein Bild. Je Schritt (alles freiwillig):
//   n        Name des Bilds
//   form     Form laden ("kugel", "strange bird", …)
//   setze    Schalter der Leiste, z. B. {"durchsicht":true,"umschalt":true}
//   ansicht  [[fenster, azimut, höhe]]   fenster: "seite" | "front" | "top" | "drei"
//   zoom     [[fenster, zoom]]           1 = 100 %
//   waehle   [l, i] Punkt wählen (Kennung des Loops, Nummer), [-1] = nichts
//   wahlNahe {"fenster":"seite","x":0.3,"y":0.5}  den sichtbaren Punkt wählen, der im Fenster dieser Stelle (Anteil) am nächsten liegt
//   zieh     {"fenster":"seite","griff":"aus","dx":40,"dy":-20,"shift":true}  Griff des gewählten Punkts ziehen (Bildpunkte)
//            {"fenster":"seite","punkt":true,"dx":30,"dy":0}  den gewählten Punkt ziehen
//   shift    true/false: Umschalt halten / loslassen (vor dem Bild)
//   menue    true: Einstellungen aufklappen
//   clip     {x,y,width,height}
//   warte    ms nach dem Schritt (Standard 500; nach einem Zug wird gewartet, bis die Haut steht)
// Umgebung: B, H (Fenstergröße), DPR (Standard 2), LISTE=1 (Punkte ausgeben).
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createRequire } = require('module');
const req = createRequire(path.join(__dirname, '../../../../../apps/editor/'));
const { chromium } = req('@playwright/test');

(async () => {
  const dpr = Number(process.env.DPR || 2);
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const seite = await browser.newPage({ viewport: { width: Number(process.env.B || 1500), height: Number(process.env.H || 940) }, deviceScaleFactor: dpr });
  const meldungen = [];
  seite.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') meldungen.push(m.type() + ': ' + m.text().slice(0, 600));
  });
  seite.on('pageerror', (e) => meldungen.push('pageerror: ' + String(e).slice(0, 600)));
  const html = fs.readFileSync(path.join(__dirname, 'dist/blaupause-teststand.html'), 'utf8');
  const huelle = path.join(os.tmpdir(), 'blaupause-teststand-huelle.html');
  fs.writeFileSync(
    huelle,
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>' +
      html +
      '</body></html>',
  );
  await seite.goto('file://' + huelle, { waitUntil: 'load' });
  await seite.waitForFunction(() => !!window.__teststand, null, { timeout: 30000 }).catch(() => meldungen.push('kein __teststand'));
  await seite.evaluate(() => document.fonts && document.fonts.ready);
  const ruhe = async (max = 20000) => {
    await seite.waitForTimeout(150);
    await seite.waitForFunction(() => !window.__teststand.rechnet(), null, { timeout: max }).catch(() => meldungen.push('rechnet noch nach ' + max + ' ms'));
    await seite.waitForTimeout(250);
  };
  // die Startform lädt von selbst
  await seite.waitForTimeout(800);
  await ruhe(30000);
  const aus = process.argv[2] || 'bild';
  const schritte = JSON.parse(process.argv[3] || '[{"n":"1"}]');
  for (const s of schritte) {
    if (s.form) {
      await seite.evaluate((n) => window.__teststand.form(n), s.form);
      await ruhe(30000);
    }
    await seite.evaluate((s) => {
      const t = window.__teststand;
      if (s.setze) t.setze(s.setze);
      if (s.ansicht) for (const a of s.ansicht) t.ansicht(a[0], a[1], a[2]);
      if (s.zoom) for (const z of s.zoom) t.zoom(z[0], z[1], z[2] ?? 0, z[3] ?? 0);
      if (s.waehle) t.waehle(s.waehle[0], s.waehle[1] ?? -1);
      if (s.menue !== undefined) {
        const m = document.getElementById('menue');
        if (m.hidden === !!s.menue) document.getElementById('menue-knopf').click();
      }
    }, s);
    if (s.wahlNahe) {
      const w = await seite.evaluate((w) => {
        const t = window.__teststand;
        const f = document.getElementById(w.fenster === 'drei' ? 'feld-3d' : 'feld-' + w.fenster).getBoundingClientRect();
        const zx = f.left + w.x * f.width;
        const zy = f.top + w.y * f.height;
        let best = null;
        let bd = Infinity;
        for (const q of t.punkte()) {
          for (const p of [q.p, { ...q.p, z: -q.p.z }]) {
            if (!t.sichtbar(w.fenster, p)) continue;
            const b = t.bildpunkt(w.fenster, p);
            const d = Math.hypot(b.x - zx, b.y - zy);
            if (d < bd) {
              bd = d;
              best = q;
            }
          }
        }
        if (best) t.waehle(best.l, best.i);
        return best;
      }, s.wahlNahe);
      console.log('gewählt', JSON.stringify(w));
    }
    if (s.shift === true) await seite.keyboard.down('Shift');
    if (s.drehe) {
      // auf leerem Grund ziehen (rechts unten im Fenster): das Fenster dreht sich; los=false: Bild vor dem Loslassen
      const d = s.drehe;
      const f = await seite.evaluate((a) => {
        const r = document.getElementById(a === 'drei' ? 'feld-3d' : 'feld-' + a).getBoundingClientRect();
        return { x: r.left + 0.92 * r.width, y: r.top + 0.9 * r.height };
      }, d.fenster);
      await seite.mouse.move(f.x, f.y);
      await seite.mouse.down();
      const n = 10;
      for (let k = 1; k <= n; k++) {
        await seite.mouse.move(f.x + (d.dx * k) / n, f.y + (d.dy * k) / n);
        await seite.waitForTimeout(25);
      }
      if (d.los !== false) {
        await seite.mouse.up();
        await seite.waitForTimeout(400);
      }
    }
    if (s.taste) {
      for (const t of [].concat(s.taste)) await seite.keyboard.press(t);
      await seite.waitForTimeout(200);
    }
    if (s.strich) {
      // mit der Maus eine Linie ziehen (Anteile des Fensters), z. B. für L (Loop schneiden)
      const st = s.strich;
      const r = await seite.evaluate((a) => {
        const q = document.getElementById(a === 'drei' ? 'feld-3d' : 'feld-' + a).getBoundingClientRect();
        return { x: q.left, y: q.top, w: q.width, h: q.height };
      }, st.fenster);
      const A = { x: r.x + st.von[0] * r.w, y: r.y + st.von[1] * r.h };
      const B = { x: r.x + st.nach[0] * r.w, y: r.y + st.nach[1] * r.h };
      await seite.mouse.move(A.x, A.y);
      await seite.mouse.down();
      for (let k = 1; k <= 12; k++) {
        await seite.mouse.move(A.x + ((B.x - A.x) * k) / 12, A.y + ((B.y - A.y) * k) / 12);
        await seite.waitForTimeout(20);
      }
      await seite.mouse.up();
      await ruhe(30000);
    }
    if (s.wenden) {
      await seite.evaluate((a) => document.querySelector('#' + (a === 'drei' ? 'feld-3d' : 'feld-' + a) + ' .wenden').click(), s.wenden);
      await seite.waitForTimeout(s.wendenHalb ? 450 : 1100);
    }
    if (s.zieh) {
      const z = s.zieh;
      const start = await seite.evaluate((z) => {
        const t = window.__teststand;
        if (z.griff) {
          const h = t.handles()[z.nr || 0];
          return h ? t.bildpunkt(z.fenster, h[z.griff]) : null;
        }
        const g = t.gewaehlt();
        const q = g ? t.punkte().find((p) => p.l === g.l && p.i === g.i) : null;
        return q ? t.bildpunkt(z.fenster, z.spiegel ? { ...q.p, z: -q.p.z } : q.p) : null;
      }, z);
      if (!start) meldungen.push('Zug: nichts zu greifen');
      else {
        if (z.shift) await seite.keyboard.down('Shift');
        await seite.mouse.move(start.x, start.y);
        await seite.mouse.down();
        const n = 12;
        for (let k = 1; k <= n; k++) {
          await seite.mouse.move(start.x + (z.dx * k) / n, start.y + (z.dy * k) / n);
          await seite.waitForTimeout(30);
        }
        await seite.waitForTimeout(200);
        if (z.bildImZug) await seite.screenshot({ path: `${aus}-${s.n}-imzug.png` });
        await seite.mouse.up();
        if (z.shift) await seite.keyboard.up('Shift');
        await ruhe(30000);
      }
    }
    await seite.waitForTimeout(s.warte || 500);
    const opt = { path: `${aus}-${s.n}.png` };
    if (s.clip) opt.clip = s.clip;
    await seite.screenshot(opt);
    if (s.drehe && s.drehe.los === false) {
      await seite.mouse.up();
      await seite.waitForTimeout(400);
    }
    if (s.shift === false || s.shift === true) {
      if (s.shift === true) await seite.keyboard.up('Shift');
    }
  }
  const info = await seite.evaluate(() => {
    const c = document.getElementById('leinwand');
    const gl = c.getContext('webgl2');
    const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return { zeichnenMs: window.__teststand ? Math.round(window.__teststand.zeit() * 10) / 10 : -1, gpu: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?', status: window.__teststand ? window.__teststand.status() : '', punkte: window.__teststand ? window.__teststand.punkte().length : -1 };
  });
  console.log(JSON.stringify(info));
  if (process.env.LISTE) console.log(JSON.stringify(await seite.evaluate(() => window.__teststand.punkte()), null, 0));
  console.log(meldungen.join('\n') || 'keine Meldungen');
  await browser.close();
})();
