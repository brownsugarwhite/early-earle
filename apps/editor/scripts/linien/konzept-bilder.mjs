// Konzeptbilder „Richtungen statt Griffe“ (15.11.2026): Standbilder im echten Look der Probe an Florians Fisch. Die Elemente des
// Konzepts (Zunge, Dorn, Drehring, Taille, alte Richtung in Grün) werden als zusätzliche Kapseln in dieselbe flüssige Anzeige gelegt;
// Verhalten der Probe ist davon noch nichts. Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/konzept-bilder.mjs [ziel.png]      (PUNKT=<Nummer>, LINIE=<Nummer> wählen die Kreuzung und die Linie)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ziel = process.argv[2] ?? '../../docs/progress/linien/konzept-2d.png';
const URL = process.env.URL ?? 'http://localhost:5199';
const PI = Number(process.env.PUNKT ?? 55);
const LINIE = Number(process.env.LINIE ?? 2);
const Z = Number(process.env.ZOOM ?? 3.5);
const KB = 300;
const KH = 260;
const MX = 500;
const MY = 320;

/** Werkzeuge im Fenster (als Funktion übergeben, läuft dort) */
function bibliothek() {
  const L = window.__linien;
  const v = L.verhalten;
  const a = L.ansicht;
  const w = L.werte;
  const glatt = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const K = { extra: [], felder: [] };
  const X = (x) => (x * a.z + a.ox) * a.dpr;
  const Y = (y) => (y * a.z + a.oy) * a.dpr;
  const R = (r) => r * a.z * a.dpr;
  let gruppe = 100000;
  K.neu = () => {
    K.extra = [];
    K.felder = [];
  };
  K.gruppe = () => ++gruppe;
  K.kapsel = (x0, y0, x1, y1, r0, r1, schicht, form, g) => K.extra.push([X(x0), Y(y0), X(x1), Y(y1), R(r0), R(r1), g, schicht + 4 * form, 0, 0, 0, 0]);
  K.feld = (x, y, r, st = 1) => K.felder.push([X(x), Y(y), R(r), st]);
  K.arme = (pi) => {
    const out = [];
    v.netz.linien.forEach((l, li) => {
      const m = l.punkte.length;
      l.punkte.forEach((q, k) => {
        if (q !== pi) return;
        if (l.zu || k < m - 1) out.push({ li, k, seite: 'aus', si: k });
        if (l.zu || k > 0) out.push({ li, k, seite: 'ein', si: (k - 1 + m) % m });
      });
    });
    return out;
  };
  K.griff = (arm) => {
    const s = v.netz.linien[arm.li].stuecke[arm.si];
    return arm.seite === 'aus' ? [s.g1x, s.g1y] : [s.g2x, s.g2y];
  };
  K.drehen = (arm, winkel) => {
    const s = v.netz.linien[arm.li].stuecke[arm.si];
    const [gx, gy] = K.griff(arm);
    const c = Math.cos(winkel);
    const n = Math.sin(winkel);
    const g = [c * gx - n * gy, n * gx + c * gy];
    if (arm.seite === 'aus') [s.g1x, s.g1y] = g;
    else [s.g2x, s.g2y] = g;
  };
  /** Zunge: die Linie schwillt vom Punkt aus in Richtung des Arms an, so lang wie sein Schwung; mit Taille am Punkt (Knick) */
  K.zunge = (arm, laenge, staerke, taille = false) => {
    const P = v.proben[arm.li];
    const l = v.netz.linien[arm.li];
    const Lg = P.laenge;
    const s0 = P.stueckS[arm.k];
    const g = K.gruppe();
    const pts = [];
    for (let k = 0; k < P.n; k++) {
      let ds = arm.seite === 'aus' ? P.s[k] - s0 : s0 - P.s[k];
      if (l.zu) ds = ((ds % Lg) + Lg + 1e-6) % Lg;
      if (ds < -1e-4 || ds > laenge) continue;
      pts.push({ ds, x: P.x[k], y: P.y[k], h: P.halb[k] });
    }
    pts.sort((p, q) => p.ds - q.ds);
    const rad = (p) => {
      const x = Math.min(1, p.ds / laenge);
      let f = Math.pow(1 - x, 1.6);
      if (taille) f *= glatt(0.05, 0.32, x);
      return p.h + 0.5 * w.schwellen * staerke * f;
    };
    for (let i = 0; i + 1 < pts.length; i++) K.kapsel(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, rad(pts[i]), rad(pts[i + 1]), 0, 0, g);
  };
  /** Dorn: der Griff, solange er gehalten wird, vom Punkt bis zur Spitze, dort eine kleine Perle */
  K.dorn = (hx, hy, tx, ty) => {
    // Haarlinie mit flüssigem Fuß am Punkt und einer Perle an der Spitze (der Fuß verschmilzt weich mit der Nabe)
    const L0 = Math.hypot(tx - hx, ty - hy);
    const fx = hx + ((tx - hx) / L0) * 4;
    const fy = hy + ((ty - hy) / L0) * 4;
    K.kapsel(hx, hy, fx, fy, 0.55, w.innen / 2, 0, 1, K.gruppe());
    K.kapsel(fx, fy, tx, ty, w.innen / 2, w.innen / 2, 0, 0, K.gruppe());
    K.kapsel(tx, ty, tx, ty, w.punktRadius * 0.8, w.punktRadius * 0.8, 0, 1, K.gruppe());
    K.feld(tx, ty, 4, 1);
  };
  /** Drehring: Haarlinie um den Punkt in der Ebene, in der gedreht wird */
  K.ring = (hx, hy, rho, schicht = 0) => {
    const g = K.gruppe();
    const n = 160;
    for (let i = 0; i < n; i++) {
      const p = (2 * Math.PI * i) / n;
      const q = (2 * Math.PI * (i + 1)) / n;
      K.kapsel(hx + rho * Math.cos(p), hy + rho * Math.sin(p), hx + rho * Math.cos(q), hy + rho * Math.sin(q), w.innen / 2, w.innen / 2, schicht, 0, g);
    }
  };
  /** die Richtung vor dem Drehen, grün bis an den Ring */
  K.geist = (hx, hy, winkel, rho) => {
    K.kapsel(hx, hy, hx + rho * Math.cos(winkel), hy + rho * Math.sin(winkel), w.innen / 2, w.innen / 2, 1, 0, K.gruppe());
  };
  /** Nabe: der Punkt, um den gedreht wird; weich (rund: alles fließt durch ihn) oder hart (Knick: eine Fuge) */
  K.nabe = (hx, hy, r, weich = true) => {
    K.kapsel(hx, hy, hx, hy, r, r, 0, 1, K.gruppe());
    if (weich) K.feld(hx, hy, 9, 1);
  };
  K.zeichnen = (zeiger) => {
    v.setzeAnsicht(a);
    const sz = v.szene(a);
    const n0 = sz.anzahl;
    const buf = new Float32Array((n0 + K.extra.length) * 12);
    buf.set(sz.prim.subarray(0, n0 * 12));
    K.extra.forEach((e, i) => buf.set(e, (n0 + i) * 12));
    sz.prim = buf;
    sz.anzahl = n0 + K.extra.length;
    sz.felder = sz.felder.slice(0, 4).concat(K.felder.flat()).slice(0, 32);
    if (zeiger) {
      const D = a.dpr;
      const Lz = w.zeigerGroesse * D * (zeiger[2] ?? 1);
      const ax = (zeiger[0] * a.z + a.ox) * D;
      const ay = (zeiger[1] * a.z + a.oy) * D;
      const w1 = (32 * Math.PI) / 180;
      const w2 = (80 * Math.PI) / 180;
      sz.zeiger = { ax, ay, bx: ax + Lz * Math.cos(w1), by: ay + Lz * Math.sin(w1), cx: ax + Lz * Math.cos(w2), cy: ay + Lz * Math.sin(w2), linie: w.zeigerLinie * D };
    } else sz.zeiger = null;
    L.anzeige.zeichnen(sz);
  };
  /** Ruhe: Netz wie am Anfang, Zeiger weg, alle Federn still; Ansicht auf den Punkt */
  K.ruhe = (pi, z, mx, my) => {
    v.zuruecksetzen();
    v.zeigerWeg();
    v.tropfen = [];
    a.wachsen = true;
    a.z = z;
    const p = v.netz.punkte[pi];
    a.ox = mx - p.x * z;
    a.oy = my - p.y * z;
    v.setzeAnsicht(a);
    v.abtasten();
    L.vorspulen(2500);
  };
  window.__konzept = K;
}

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien);
await page.evaluate(bibliothek);

const ARG = { PI, LINIE, Z, MX, MY };
const BILDER = [
  {
    titel: '1 · Ruhe: nur Linien und Punkte, keine Griffe',
    tun: ({ PI, Z, MX, MY }) => {
      const K = window.__konzept;
      K.ruhe(PI, Z, MX, MY);
      K.neu();
      K.zeichnen(null);
    },
  },
  {
    titel: '2 · am Punkt: Stern, Tropfen am Zeiger → verschieben',
    tun: ({ PI, Z, MX, MY }) => {
      const K = window.__konzept;
      const L = window.__linien;
      K.ruhe(PI, Z, MX, MY);
      const p = L.verhalten.netz.punkte[PI];
      for (let i = 0; i <= 24; i++) {
        const f = i / 24;
        L.zeigerHin((p.x + 2.4 + 14 * (1 - f)) * Z + L.ansicht.ox, (p.y + 3 + 10 * (1 - f)) * Z + L.ansicht.oy, 16);
        L.vorspulen(16);
      }
      L.vorspulen(1400);
    },
  },
  {
    titel: '3 · auf der Linie am Punkt: Nadel → drehen (rund: beide Seiten)',
    tun: ({ PI, LINIE, Z, MX, MY }) => {
      const K = window.__konzept;
      const v = window.__linien.verhalten;
      K.ruhe(PI, Z, MX, MY);
      K.neu();
      const arme = K.arme(PI).filter((x) => x.li === LINIE);
      const aus = arme.find((x) => x.seite === 'aus');
      const ein = arme.find((x) => x.seite === 'ein');
      const len = (arm) => Math.max(14, Math.hypot(...K.griff(arm)));
      K.zunge(aus, len(aus), 1);
      K.zunge(ein, len(ein), 0.7);
      const p = v.netz.punkte[PI];
      K.nabe(p.x, p.y, 1.5);
      const [gx, gy] = K.griff(aus);
      const u = Math.hypot(gx, gy);
      K.zeichnen([p.x + (gx / u) * 9 + (-gy / u) * 0.6, p.y + (gy / u) * 9 + (gx / u) * 0.6]);
    },
  },
  {
    titel: '4 · gedrückt: Zeiger gleitet zur Griffspitze, Ring zeigt die Ebene',
    tun: ({ PI, LINIE, Z, MX, MY }) => {
      const K = window.__konzept;
      const v = window.__linien.verhalten;
      K.ruhe(PI, Z, MX, MY);
      K.neu();
      const arme = K.arme(PI).filter((x) => x.li === LINIE);
      const aus = arme.find((x) => x.seite === 'aus');
      const ein = arme.find((x) => x.seite === 'ein');
      const len = (arm) => Math.max(14, Math.hypot(...K.griff(arm)));
      K.zunge(aus, len(aus), 1);
      K.zunge(ein, len(ein), 0.7);
      const p = v.netz.punkte[PI];
      const [gx, gy] = K.griff(aus);
      const u = Math.hypot(gx, gy);
      const rho = Math.max(u, 22);
      K.ring(p.x, p.y, rho);
      K.dorn(p.x, p.y, p.x + (gx / u) * rho, p.y + (gy / u) * rho);
      K.nabe(p.x, p.y, 1.5);
      K.zeichnen([p.x + (gx / u) * rho, p.y + (gy / u) * rho, 0.86]);
    },
  },
  {
    titel: '5 · gedreht: die Linie dreht als Ganzes um den Punkt (alte Richtung grün)',
    tun: ({ PI, LINIE, Z, MX, MY }) => {
      const K = window.__konzept;
      const v = window.__linien.verhalten;
      K.ruhe(PI, Z, MX, MY);
      K.neu();
      const arme = K.arme(PI).filter((x) => x.li === LINIE);
      const aus = arme.find((x) => x.seite === 'aus');
      const ein = arme.find((x) => x.seite === 'ein');
      const [gx0, gy0] = K.griff(aus);
      const u = Math.hypot(gx0, gy0);
      const rho = Math.max(u, 22);
      const w0 = Math.atan2(gy0, gx0);
      const th = (-30 * Math.PI) / 180;
      K.drehen(aus, th);
      K.drehen(ein, th);
      v.abtasten();
      const len = (arm) => Math.max(14, Math.hypot(...K.griff(arm)));
      K.zunge(aus, len(aus), 1);
      K.zunge(ein, len(ein), 0.7);
      const p = v.netz.punkte[PI];
      K.ring(p.x, p.y, rho);
      K.geist(p.x, p.y, w0, rho);
      K.geist(p.x, p.y, w0 + Math.PI, Math.max(14, Math.hypot(...K.griff(ein))));
      const w1 = w0 + th;
      K.dorn(p.x, p.y, p.x + Math.cos(w1) * rho, p.y + Math.sin(w1) * rho);
      K.nabe(p.x, p.y, 1.5);
      K.zeichnen([p.x + Math.cos(w1) * rho, p.y + Math.sin(w1) * rho, 0.86]);
    },
  },
  {
    titel: '6 · mit ⌥ geknickt: nur diese Seite dreht, am Punkt eine Taille',
    tun: ({ PI, LINIE, Z, MX, MY }) => {
      const K = window.__konzept;
      const v = window.__linien.verhalten;
      K.ruhe(PI, Z, MX, MY);
      K.neu();
      const arme = K.arme(PI).filter((x) => x.li === LINIE);
      const aus = arme.find((x) => x.seite === 'aus');
      const [gx0, gy0] = K.griff(aus);
      const u = Math.hypot(gx0, gy0);
      const rho = Math.max(u, 22);
      const w0 = Math.atan2(gy0, gx0);
      const th = (-48 * Math.PI) / 180;
      K.drehen(aus, th);
      v.abtasten();
      K.zunge(aus, Math.max(14, u), 1, true);
      const p = v.netz.punkte[PI];
      K.ring(p.x, p.y, rho);
      K.geist(p.x, p.y, w0, rho);
      const w1 = w0 + th;
      K.dorn(p.x, p.y, p.x + Math.cos(w1) * rho, p.y + Math.sin(w1) * rho);
      K.nabe(p.x, p.y, 1.35, false);
      K.zeichnen([p.x + Math.cos(w1) * rho, p.y + Math.sin(w1) * rho, 0.86]);
    },
  },
];

const teile = [];
for (const b of BILDER) {
  await page.evaluate(b.tun, ARG);
  const png = await page.screenshot({ clip: { x: MX - KB / 2, y: MY - KH / 2, width: KB, height: KH } });
  teile.push({ titel: b.titel, bild: png.toString('base64') });
}
const html = `<html><body style="margin:0;background:#fff;font:14px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="display:grid;grid-template-columns:repeat(3,${KB * 1.25}px);gap:22px 18px;padding:18px">${teile
  .map(
    (t) =>
      `<figure style="margin:0"><img src="data:image/png;base64,${t.bild}" style="width:${KB * 1.25}px;height:${KH * 1.25}px;border:1px solid #e4e0da;display:block"><figcaption style="margin-top:8px;line-height:1.35">${t.titel}</figcaption></figure>`,
  )
  .join('')}</div></body></html>`;
const seite = await browser.newPage({ viewport: { width: Math.round(KB * 1.25 * 3 + 18 * 4), height: 400 }, deviceScaleFactor: 2 });
await seite.setContent(html);
fs.writeFileSync(ziel, await seite.screenshot({ fullPage: true }));
console.log('geschrieben', ziel);
await browser.close();
