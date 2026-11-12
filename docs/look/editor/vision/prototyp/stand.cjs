// Standbilder für die Präsentation: node stand.cjs <ausgabeordner>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const AUS = process.argv[2];
fs.mkdirSync(AUS, { recursive: true });
const url = (q) => 'file://' + path.resolve('dist/vision.html') + '?film=leer&' + q;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const neu = async (w, h, q, dpr = 2) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('pageerror', e.message));
    await p.goto(url(q));
    await p.waitForTimeout(3500);
    await p.evaluate(() => { for (let i = 0; i < 4; i++) window.__film.schritt(30); });
    return p;
  };
  const schritte = (p, n = 8, ms = 40) => p.evaluate(([n, ms]) => { for (let i = 0; i < n; i++) window.__film.schritt(ms); }, [n, ms]);
  const bild = async (p, name) => { await p.screenshot({ path: path.join(AUS, name), type: 'jpeg', quality: 90 }); console.log(name); };
  const nur = process.argv[3] ? process.argv[3].split(',') : null;
  const soll = (n) => !nur || nur.includes(n);

  if (soll('vogel_raum')) {
    const p = await neu(1200, 760, 'form=vogel');
    await p.evaluate(() => { const a = window.__app, rs = a.raum.sichten.raum; rs.azimut = -0.78; rs.hoehe = 0.3; a.einpassen(true); rs.abstand *= 0.92; });
    await schritte(p, 10);
    await bild(p, 'vogel_raum.jpg');
    await p.close();
  }
  if (soll('vogel_blatt')) {
    const p = await neu(1200, 760, 'form=vogel&layout=blatt');
    await p.evaluate(() => { const a = window.__app; const L = a.linien.find((x) => x.art === 'mitte'); const P = L.punkte.reduce((x, y) => (y.p[1] > x.p[1] ? y : x)); a.auswahl.add(P.id); });
    await schritte(p, 10);
    await bild(p, 'vogel_blatt.jpg');
    await p.close();
  }
  if (soll('fisch_raum')) {
    const p = await neu(1200, 760, 'form=fisch');
    await p.evaluate(() => { const a = window.__app, rs = a.raum.sichten.raum; rs.azimut = -0.55; rs.hoehe = 0.34; a.einpassen(true); });
    await schritte(p, 10);
    await bild(p, 'fisch_raum.jpg');
    await p.close();
  }
  if (soll('falten')) {
    const p = await neu(900, 560, 'form=vogel', 1);
    for (const f of [0, 0.33, 0.66, 1]) {
      await p.evaluate((f) => { const a = window.__app, R = a.raum, rs = R.sichten.raum; if (!rs._faltStart) { rs.azimut = -0.62; rs.hoehe = 0.36; a.einpassen(true); rs.aktualisieren(); rs._faltStart = { pos: rs.kamera.position.toArray(), blick: rs.ziel.slice() }; } R.modus = f >= 1 ? 'blatt' : 'raum'; R.falte = f; R.falteZiel = f; if (f > 0 && f < 1) { R.modus = 'blatt'; } }, f);
      await schritte(p, 2, 1);
      await bild(p, `falten_${Math.round(f * 100)}.jpg`);
    }
    await p.close();
  }
  if (soll('telefon')) {
    const p = await neu(390, 760, 'form=vogel', 2);
    await p.evaluate(() => { const a = window.__app, rs = a.raum.sichten.raum; rs.azimut = -0.7; rs.hoehe = 0.32; a.einpassen(true); });
    await schritte(p, 10);
    await bild(p, 'telefon_raum.jpg');
    await p.close();
  }
  if (soll('schnitt')) {
    const p = await neu(1000, 640, 'form=kugel');
    await p.evaluate(() => {
      const a = window.__app, rs = a.raum.sichten.raum;
      const P = a.netz.pos; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i < P.length; i += 30) { const q = rs.projizieren([P[i], P[i + 1], P[i + 2]]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      const x = x0 + (x1 - x0) * 0.38;
      const ziel = a.treffer(x, y0 - 50);
      a.strichStart(ziel, x - 18, y0 - 50);
      for (let i = 1; i <= 30; i++) a.strichWeiter(x - 18 + i * 1.1, y0 - 50 + ((y1 - y0 + 60) * i) / 30);
      window.__film.finger(1, x - 18 + 33, y1 + 10);
      a.strich.letzteVorschau = 0; a.strichWeiter(x + 16, y1 + 12);
    });
    await schritte(p, 6);
    await bild(p, 'schnitt_vorschau.jpg');
    await p.close();
  }
  if (soll('zirkel')) {
    const p = await neu(1000, 640, 'form=vogel');
    await p.evaluate(() => {
      const a = window.__app, rs = a.raum.sichten.raum;
      rs.azimut = -0.7; rs.hoehe = 0.3; a.einpassen(true); rs.aktualisieren();
      const L = a.linien.find((x) => x.art === 'mitte');
      const P = L.punkte.reduce((x, y) => (y.p[1] > x.p[1] ? y : x));
      const s = rs.projizieren(P.p);
      const z = a.treffer(s[0], s[1]);
      a.zugStart(z, s[0], s[1]);
      a.einfluss = 0.55; a.einflussAnwenden();
      a.zugBewegen(s[0] + 10, s[1] - 60);
      window.__film.finger(1, s[0] + 10, s[1] - 60);
      const h = rs.projizieren([P.p[0] + 0.55, P.p[1] - 0.2, 0.2]);
      window.__film.finger(2, h[0], h[1]);
    });
    await schritte(p, 3, 20);
    await bild(p, 'zirkel.jpg');
    await p.close();
  }
  if (soll('roentgen')) {
    const p = await neu(1000, 640, 'form=vogel');
    await p.evaluate(() => {
      const a = window.__app, rs = a.raum.sichten.raum;
      rs.azimut = -0.7; rs.hoehe = 0.3; a.einpassen(true); rs.aktualisieren();
      const c = rs.projizieren([0.1, 0.0, 0]);
      a.haltenStart({ art: 'haut' }, c[0], c[1]);
      window.__film.finger(1, c[0], c[1]);
    });
    await schritte(p, 12, 40);
    await bild(p, 'roentgen.jpg');
    await p.close();
  }
  if (soll('pose')) {
    const p = await neu(1000, 640, 'form=kugel&layout=front');
    const c = await p.evaluate(() => {
      const a = window.__app; const s = a.raum.sichten.front;
      const c = s.projizieren([-1, -0.35, 0]);
      // Größe aus der Abbildung der Kugel (Halbmesser 1): Maul etwa 0,55 breit und 0,1 hoch
      const r = Math.abs(s.projizieren([-1, 0, 1])[0] - s.projizieren([-1, 0, 0])[0]);
      const pts = []; for (let i = 0; i <= 48; i++) { const t = (i / 48) * Math.PI * 2; pts.push([c[0] + Math.cos(t) * r * 0.55, c[1] + Math.sin(t) * r * 0.1]); }
      a.strichStart(a.treffer(pts[0][0], pts[0][1]), pts[0][0], pts[0][1]);
      for (const q of pts.slice(1)) a.strichWeiter(q[0], q[1]);
      a.strichEnde();
      a.maulAuf = 0.9; a.verformen(true);
      a.modusSetzen('raum', true); a.raum.falte = 0; a.raum.falteZiel = 0;
      const rs = a.raum.sichten.raum; rs.azimut = -0.95; rs.hoehe = 0.05; a.einpassen(true); rs.abstand *= 0.9;
      return { c, maul: a.linien.some((L) => L.maul), auf: a.maulAuf, linien: a.linien.map((L) => L.art).join(' ') };
    });
    console.log(JSON.stringify(c));
    await schritte(p, 8);
    await bild(p, 'pose_raum.jpg');
    await p.evaluate(() => { const a = window.__app; a.modusSetzen('blatt', true); });
    await schritte(p, 6);
    await bild(p, 'pose_blatt.jpg');
    await p.close();
  }
  await b.close();
})();
