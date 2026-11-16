// Bilder der gebauten Probe „Richtungen statt Griffe“ (15.11.2026): dieselben Ansichten wie die Konzeptbilder, aber vom echten
// Verhalten gerechnet (Zeiger, Drücken, Ziehen über die Test-Haken, Bild für Bild). Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/richtung-bilder.mjs [ziel-2d.png] [ziel-raum.png]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ziel2 = process.argv[2] ?? '../../docs/progress/linien/richtung-2d.png';
const ziel3 = process.argv[3] ?? '../../docs/progress/linien/richtung-raum.png';
const URL = process.env.URL ?? 'http://localhost:5199';

function zusammensetzen(teile, kb, kh, f) {
  return `<html><body style="margin:0;background:#fff;font:14px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="display:grid;grid-template-columns:repeat(3,${kb * f}px);gap:22px 18px;padding:18px">${teile
    .map(
      (t) =>
        `<figure style="margin:0"><img src="data:image/png;base64,${t.bild}" style="width:${kb * f}px;height:${kh * f}px;border:1px solid #e4e0da;display:block"><figcaption style="margin-top:8px;line-height:1.35">${t.titel}</figcaption></figure>`,
    )
    .join('')}</div></body></html>`;
}

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));

// ---------- 2D ----------
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien);
await page.evaluate(() => {
  const L = window.__linien;
  const v = L.verhalten;
  const a = L.ansicht;
  const PI = 55;
  const LI = 2;
  const Z = 3.5;
  const H = {};
  H.ruhe = () => {
    v.loslassen();
    v.alt = false;
    v.zuruecksetzen();
    v.zeigerWeg();
    v.tropfen = [];
    v.klick = null;
    a.wachsen = true;
    a.z = Z;
    const p = v.netz.punkte[PI];
    a.ox = 500 - p.x * Z;
    a.oy = 320 - p.y * Z;
    v.setzeAnsicht(a);
    v.abtasten();
    L.vorspulen(2500);
  };
  const schirm = (x, y) => [x * a.z + a.ox, y * a.z + a.oy];
  H.hin = (x, y, ms = 700) => {
    const [sx, sy] = schirm(x, y);
    L.zeigerHin(sx + 40, sy + 30, 16);
    L.vorspulen(80);
    for (let i = 1; i <= 12; i++) {
      L.zeigerHin(sx + 40 * (1 - i / 12), sy + 30 * (1 - i / 12), 16);
      L.vorspulen(16);
    }
    L.vorspulen(ms);
  };
  H.aufNadel = () => {
    const k = v.netz.linien[LI].punkte.indexOf(PI);
    const P = v.proben[LI];
    const ziel = P.stueckS[k] + 0.6 * v.nadelLaenge(LI, k, 'aus');
    let best = 0;
    for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - ziel) < Math.abs(P.s[best] - ziel)) best = i;
    H.hin(P.x[best], P.y[best]);
  };
  H.drehenUm = (wGrad) => {
    const sp = v.griff.spitze;
    const p = v.netz.punkte[PI];
    const dx = sp[0] - p.x;
    const dy = sp[1] - p.y;
    const c = Math.cos((wGrad * Math.PI) / 180);
    const s = Math.sin((wGrad * Math.PI) / 180);
    const zx = p.x + c * dx - s * dy;
    const zy = p.y + s * dx + c * dy;
    const n = 20;
    const [mx0, my0] = [v.zeiger.x, v.zeiger.y];
    const [mx1, my1] = [v.griff.mx + zx - sp[0], v.griff.my + zy - sp[1]];
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      const [sx, sy] = schirm(mx0 + (mx1 - mx0) * f, my0 + (my1 - my0) * f);
      L.zeigerHin(sx, sy, 16);
      L.vorspulen(16);
    }
    L.vorspulen(900);
  };
  H.PI = PI;
  window.__h = H;
});
const BILDER2 = [
  { titel: '1 · Ruhe: nur Linien und Punkte', tun: () => window.__h.ruhe() },
  {
    titel: '2 · am Punkt: Stern → verschieben',
    tun: () => {
      const H = window.__h;
      H.ruhe();
      const p = window.__linien.verhalten.netz.punkte[H.PI];
      H.hin(p.x + 2, p.y + 2.6, 1200);
    },
  },
  {
    titel: '3 · auf der Linie nahe am Punkt: Nadel → drehen',
    tun: () => {
      const H = window.__h;
      H.ruhe();
      H.aufNadel();
    },
  },
  {
    titel: '4 · gedrückt: Zeiger an der Griffspitze, Ring',
    tun: () => {
      const H = window.__h;
      H.ruhe();
      H.aufNadel();
      window.__linien.verhalten.druecken();
      window.__linien.vorspulen(900);
    },
  },
  {
    titel: '5 · gedreht um 30°: rund, die Linie dreht als Ganzes',
    tun: () => {
      const H = window.__h;
      H.ruhe();
      H.aufNadel();
      window.__linien.verhalten.druecken();
      window.__linien.vorspulen(300);
      H.drehenUm(-30);
    },
  },
  {
    titel: '6 · mit ⌥ um 45°: geknickt, Taille am Punkt',
    tun: () => {
      const H = window.__h;
      H.ruhe();
      H.aufNadel();
      const v = window.__linien.verhalten;
      v.druecken();
      window.__linien.vorspulen(300);
      v.alt = true;
      H.drehenUm(-45);
    },
  },
];
const teile2 = [];
for (const b of BILDER2) {
  await page.evaluate(b.tun);
  const png = await page.screenshot({ clip: { x: 350, y: 190, width: 300, height: 260 } });
  teile2.push({ titel: b.titel, bild: png.toString('base64') });
}

// ---------- Raum ----------
await page.goto(`${URL}/raum.html?bild=1`);
await page.waitForFunction(() => window.__raum && window.__raum.verhalten.netz.punkte.length > 0);
await page.evaluate(() => {
  const Q = window.__raum;
  const v = Q.verhalten;
  const R = Q.raum;
  const ANKER = 3;
  const LI = 1;
  const H = {};
  H.ausgang = async () => {
    v.loslassen();
    v.alt = false;
    v.kippen = false;
    await Q.formLaden('teat firefish');
    Q.ansicht.massstab = 2;
    v.zeigerWeg();
    v.tropfen = [];
    v.klick = null;
    R.zeigeAnsicht('schraeg');
    const h = { x: R.anker[ANKER * 3], y: R.anker[ANKER * 3 + 1], z: R.anker[ANKER * 3 + 2] };
    R.zielX.ziel = h.x;
    R.zielY.ziel = h.y;
    R.zielZ.ziel = h.z;
    R.abstand.ziel = 1250;
    Q.vorspulen(4000);
    await new Promise((ok) => setTimeout(ok, 400));
  };
  H.aufNadel = () => {
    const k = v.netz.linien[LI].punkte.indexOf(ANKER);
    const P = v.proben[LI];
    const ziel = P.stueckS[k] + 0.6 * v.nadelLaenge(LI, k, 'aus');
    let best = 0;
    for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - ziel) < Math.abs(P.s[best] - ziel)) best = i;
    Q.zeigerHin(P.x[best] + 40, P.y[best] + 30, 16);
    Q.vorspulen(80);
    for (let i = 1; i <= 12; i++) {
      Q.zeigerHin(P.x[best] + 40 * (1 - i / 12), P.y[best] + 30 * (1 - i / 12), 16);
      Q.vorspulen(16);
    }
    Q.vorspulen(700);
  };
  H.drehenUm = (wGrad) => {
    const D = R.dreh;
    const c = Math.cos((wGrad * Math.PI) / 180);
    const s = Math.sin((wGrad * Math.PI) / 180);
    const T = { x: D.H.x + D.rho0 * (c * D.e1.x + s * D.e2.x), y: D.H.y + D.rho0 * (c * D.e1.y + s * D.e2.y), z: D.H.z + D.rho0 * (c * D.e1.z + s * D.e2.z) };
    const ts = R.schirm(T);
    const [mx0, my0] = [v.zeiger.x, v.zeiger.y];
    const mx1 = v.griff.mx + ts[0] - D.s0[0];
    const my1 = v.griff.my + ts[1] - D.s0[1];
    for (let i = 1; i <= 20; i++) {
      Q.zeigerHin(mx0 + (mx1 - mx0) * (i / 20), my0 + (my1 - my0) * (i / 20), 16);
      Q.vorspulen(16);
    }
    Q.vorspulen(900);
  };
  window.__h = H;
});
const BILDER3 = [
  {
    titel: 'Raum · gedrückt: der Ring liegt auf der Haut',
    tun: async () => {
      const H = window.__h;
      await H.ausgang();
      H.aufNadel();
      window.__raum.verhalten.druecken();
      window.__raum.vorspulen(900);
    },
  },
  {
    titel: 'Raum · auf der Haut um 35° gedreht (alte Richtung grün)',
    tun: async () => {
      const H = window.__h;
      await H.ausgang();
      H.aufNadel();
      window.__raum.verhalten.druecken();
      window.__raum.vorspulen(300);
      H.drehenUm(35);
    },
  },
  {
    titel: 'Raum · mit ⇧ aus der Haut gekippt (25°)',
    tun: async () => {
      const H = window.__h;
      await H.ausgang();
      H.aufNadel();
      window.__raum.verhalten.kippen = true;
      window.__raum.verhalten.druecken();
      window.__raum.vorspulen(300);
      H.drehenUm(-25);
    },
  },
];
const teile3 = [];
for (const b of BILDER3) {
  await page.evaluate(b.tun);
  const png = await page.screenshot({ clip: { x: 330, y: 170, width: 340, height: 300 } });
  teile3.push({ titel: b.titel, bild: png.toString('base64') });
}

const seite = await browser.newPage({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 });
await seite.setContent(zusammensetzen(teile2, 300, 260, 1.25));
fs.writeFileSync(ziel2, await seite.screenshot({ fullPage: true }));
await seite.setContent(zusammensetzen(teile3, 340, 300, 1.1));
fs.writeFileSync(ziel3, await seite.screenshot({ fullPage: true }));
console.log('geschrieben', ziel2, ziel3, 'Fehler', JSON.stringify(fehler));
await browser.close();
