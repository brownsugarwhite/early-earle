// Konzeptbilder „Richtungen statt Griffe“ im Raum (15.11.2026): an einer Kreuzung auf der Flanke seiner Form (teat firefish) der
// Drehring auf der Haut (drehen auf der Haut) und mit ⇧ aufgestellt (kippen aus der Haut). Standbilder im echten Look der 3D-Probe;
// Zunge, Dorn, Ring und alte Richtung sind zusätzliche Kapseln, nach Tiefe verdeckt. Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/konzept-raum.mjs [ziel.png]      (ANKER=<Nummer>, LINIE=<Nummer> wählen Kreuzung und Linie)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ziel = process.argv[2] ?? '../../docs/progress/linien/konzept-raum.png';
const URL = process.env.URL ?? 'http://localhost:5199';
const ANKER = Number(process.env.ANKER ?? 3);
const LINIE = Number(process.env.LINIE ?? 1);
const ABSTAND = Number(process.env.ABSTAND ?? 1250);
const MASS = Number(process.env.MASS ?? 2);
const KB = 340;
const KH = 300;

function bibliothek({ ANKER, LINIE, ABSTAND, MASS }) {
  const Q = window.__raum;
  const R = Q.raum;
  const v = Q.verhalten;
  const a = Q.ansicht;
  const w = Q.werte;
  a.massstab = MASS;
  const D = a.dpr;
  const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const mul = (p, f) => [p[0] * f, p[1] * f, p[2] * f];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const kreuz = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const norm = (p) => mul(p, 1 / Math.hypot(...p));
  const drehe = (g, k, th) => add(add(mul(g, Math.cos(th)), mul(kreuz(k, g), Math.sin(th))), mul(k, dot(k, g) * (1 - Math.cos(th))));
  const K = { extra: [], felder: [] };
  let gruppe = 100000;
  const lage = (arr, i) => [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]];
  const setze = (arr, i, p) => {
    arr[i * 3] = p[0];
    arr[i * 3 + 1] = p[1];
    arr[i * 3 + 2] = p[2];
  };
  K.auf = (p) => {
    const o = [0, 0, 0];
    R.auf(p[0], p[1], p[2], o, 0);
    return o;
  };
  K.neu = () => {
    K.extra = [];
    K.felder = [];
  };
  K.gruppe = () => ++gruppe;
  /** Kapsel aus Bildschirmpunkten mit Tiefe; schicht 2: nach Tiefe, 1: immer grün */
  K.kapsel = (p, q, r0, r1, schicht, form, g) => K.extra.push([p[0] * D, p[1] * D, q[0] * D, q[1] * D, r0 * MASS * D, r1 * MASS * D, g, schicht + 4 * form, p[2], q[2], 0, 0]);
  K.feld = (p, r, st = 1) => K.felder.push([p[0] * D, p[1] * D, r * MASS * D, st]);
  /** Arme der Linie am Anker: das Stück, das dort beginnt (aus), und das, das dort endet (ein) */
  K.arme = () => {
    const l = R.linien[LINIE];
    const aus = l.stuecke.findIndex((s) => s.a === ANKER);
    const ein = l.stuecke.findIndex((s) => s.b === ANKER);
    return { aus, ein };
  };
  K.H = () => lage(R.anker, ANKER);
  K.griffAus = () => {
    const { aus } = K.arme();
    return sub(lage(R.griffe, R.linien[LINIE].stuecke[aus].g1), K.H());
  };
  /** Senkrechte der Haut an der Kreuzung: aus den Richtungen beider Linien, zum Betrachter hin */
  K.normale = () => {
    const H = K.H();
    let andere = null;
    R.linien.forEach((l, li) => {
      if (li === LINIE || andere) return;
      const s = l.stuecke.find((x) => x.a === ANKER);
      if (s) andere = sub(lage(R.griffe, s.g1), H);
    });
    let n = norm(kreuz(K.griffAus(), andere));
    const vm = R.ansicht;
    const blick = [vm[2], vm[6], vm[10]];
    if (dot(n, blick) < 0) n = mul(n, -1);
    return n;
  };
  /** beide Arme der Linie (rund) oder nur „aus“ (Knick) um die Achse k drehen */
  K.drehen = (k, th, beide = true) => {
    const H = K.H();
    const { aus, ein } = K.arme();
    const l = R.linien[LINIE];
    const g1 = l.stuecke[aus].g1;
    setze(R.griffe, g1, add(H, drehe(sub(lage(R.griffe, g1), H), k, th)));
    if (beide && ein >= 0) {
      const g2 = l.stuecke[ein].g2;
      setze(R.griffe, g2, add(H, drehe(sub(lage(R.griffe, g2), H), k, th)));
    }
  };
  /** Zunge auf der projizierten Linie vom Anker aus (Bildschirmpunkte), mit Tiefe */
  K.zunge = (seite, laenge, staerke) => {
    const P = v.proben[LINIE];
    const l = R.linien[LINIE];
    const { aus, ein } = K.arme();
    const s0 = seite === 'aus' ? P.stueckS[aus] : P.stueckS[ein + 1];
    const Lg = P.laenge;
    const pts = [];
    for (let k = 0; k < P.n; k++) {
      let ds = seite === 'aus' ? P.s[k] - s0 : s0 - P.s[k];
      if (l.zu) ds = ((ds % Lg) + Lg + 1e-6) % Lg;
      if (ds < -1e-4 || ds > laenge) continue;
      pts.push({ ds, p: [P.x[k], P.y[k], P.z[k]], h: P.halb[k] });
    }
    pts.sort((p, q) => p.ds - q.ds);
    const g = K.gruppe();
    const rad = (p) => p.h + 0.5 * w.schwellen * staerke * Math.pow(1 - Math.min(1, p.ds / laenge), 1.6);
    for (let i = 0; i + 1 < pts.length; i++) K.kapsel(pts[i].p, pts[i + 1].p, rad(pts[i]), rad(pts[i + 1]), 2, 0, g);
  };
  /** Ring um H in der Ebene (e1, e2), Radius rho (Welt) */
  K.ring = (e1, e2, rho) => {
    const H = K.H();
    const g = K.gruppe();
    const n = 180;
    let alt = null;
    for (let i = 0; i <= n; i++) {
      const p = (2 * Math.PI * i) / n;
      const q = K.auf(add(H, add(mul(e1, rho * Math.cos(p)), mul(e2, rho * Math.sin(p)))));
      if (alt) K.kapsel(alt, q, w.innen / 2, w.innen / 2, 2, 0, g);
      alt = q;
    }
  };
  K.geist = (richtung, rho) => {
    const H = K.H();
    K.kapsel(K.auf(H), K.auf(add(H, mul(richtung, rho))), w.innen / 2, w.innen / 2, 1, 0, K.gruppe());
  };
  K.dorn = (richtung, rho) => {
    const H = K.H();
    const h = K.auf(H);
    const t = K.auf(add(H, mul(richtung, rho)));
    const L0 = Math.hypot(t[0] - h[0], t[1] - h[1]);
    const f = [h[0] + ((t[0] - h[0]) / L0) * 4 * MASS, h[1] + ((t[1] - h[1]) / L0) * 4 * MASS, h[2] + ((t[2] - h[2]) * 4 * MASS) / L0];
    K.kapsel(h, f, 0.55, w.innen / 2, 0, 1, K.gruppe());
    K.kapsel(f, t, w.innen / 2, w.innen / 2, 0, 0, K.gruppe());
    K.kapsel(t, t, w.punktRadius * 0.8, w.punktRadius * 0.8, 0, 1, K.gruppe());
    K.feld(t, 4);
    return t;
  };
  K.nabe = (r) => {
    const h = K.auf(K.H());
    K.kapsel(h, h, r, r, 0, 1, K.gruppe());
    K.feld(h, 9);
  };
  K.zeichnen = (zeiger) => {
    const r = document.getElementById('buehne').getBoundingClientRect();
    const { netz, proben } = R.projizieren(r.width, r.height, w, MASS, null);
    v.setzeNetz(netz, proben);
    v.setzeAnsicht(a);
    const sz = v.szene(a);
    sz.koerper = R.koerper(D, MASS, w.umriss);
    sz.bias = R.bias();
    const n0 = sz.anzahl;
    const buf = new Float32Array((n0 + K.extra.length) * 12);
    buf.set(sz.prim.subarray(0, n0 * 12));
    K.extra.forEach((e, i) => buf.set(e, (n0 + i) * 12));
    sz.prim = buf;
    sz.anzahl = n0 + K.extra.length;
    sz.felder = sz.felder.slice(0, 4).concat(K.felder.flat()).slice(0, 32);
    if (zeiger) {
      const Lz = w.zeigerGroesse * D * 0.86;
      const ax = zeiger[0] * D;
      const ay = zeiger[1] * D;
      const w1 = (32 * Math.PI) / 180;
      const w2 = (80 * Math.PI) / 180;
      sz.zeiger = { ax, ay, bx: ax + Lz * Math.cos(w1), by: ay + Lz * Math.sin(w1), cx: ax + Lz * Math.cos(w2), cy: ay + Lz * Math.sin(w2), linie: w.zeigerLinie * D };
    } else sz.zeiger = null;
    Q.anzeige.zeichnen(sz);
  };
  /** Ausgang: Form frisch geladen, Kamera schräg auf die Kreuzung */
  K.ausgang = async () => {
    await Q.formLaden('teat firefish');
    v.zeigerWeg();
    v.tropfen = [];
    R.zeigeAnsicht('schraeg');
    const H = K.H();
    R.zielX.ziel = H[0];
    R.zielY.ziel = H[1];
    R.zielZ.ziel = H[2];
    R.abstand.ziel = ABSTAND;
    Q.vorspulen(4000);
    // die Bildschleife der Seite auslaufen lassen, sonst zeichnet sie über die Konzeptbilder
    await new Promise((ok) => setTimeout(ok, 400));
  };
  K.ziehen = () => ({ H: K.H(), u: norm(K.griffAus()), n: K.normale(), rho: Math.hypot(...K.griffAus()) });
  K.mathe = { add, sub, mul, dot, kreuz, norm, drehe };
  window.__konzept = K;
}

const ARG = { ANKER, LINIE, ABSTAND, MASS };
const BILDER = [
  {
    titel: 'Raum · gegriffen: der Ring liegt auf der Haut, gedreht wird auf ihr',
    tun: async () => {
      const K = window.__konzept;
      await K.ausgang();
      K.neu();
      const { u, n } = K.ziehen();
      const v = K.mathe.kreuz(n, u);
      const rho = Math.hypot(...K.griffAus());
      K.zunge('aus', 70, 1);
      K.zunge('ein', 70, 0.7);
      K.ring(u, v, rho);
      const t = K.dorn(u, rho);
      K.nabe(1.5);
      K.zeichnen(t);
    },
  },
  {
    titel: 'Raum · gedreht auf der Haut: die Linie gleitet über die Haut (alte Richtung grün)',
    tun: async () => {
      const K = window.__konzept;
      await K.ausgang();
      K.neu();
      const { u, n } = K.ziehen();
      const v = K.mathe.kreuz(n, u);
      const rho = Math.hypot(...K.griffAus());
      const th = (38 * Math.PI) / 180;
      K.drehen(n, th);
      K.zeichnen(null);
      K.neu();
      const u1 = K.mathe.drehe(u, n, th);
      K.zunge('aus', 70, 1);
      K.zunge('ein', 70, 0.7);
      K.ring(u, v, rho);
      K.geist(u, rho);
      const t = K.dorn(u1, rho);
      K.nabe(1.5);
      K.zeichnen(t);
    },
  },
  {
    titel: 'Raum · mit ⇧: der Ring steht auf, die Richtung kippt aus der Haut',
    tun: async () => {
      const K = window.__konzept;
      await K.ausgang();
      K.neu();
      const { u, n } = K.ziehen();
      const b = K.mathe.norm(K.mathe.kreuz(u, n));
      const rho = Math.hypot(...K.griffAus());
      const th = (-30 * Math.PI) / 180;
      K.drehen(b, th);
      K.zeichnen(null);
      K.neu();
      const u1 = K.mathe.drehe(u, b, th);
      K.zunge('aus', 70, 1);
      K.zunge('ein', 70, 0.7);
      K.ring(u, n, rho);
      K.geist(u, rho);
      const t = K.dorn(u1, rho);
      K.nabe(1.5);
      K.zeichnen(t);
    },
  },
];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
await page.goto(`${URL}/raum.html?bild=1`);
await page.waitForFunction(() => window.__raum && window.__raum.verhalten.netz.punkte.length > 0);
await page.evaluate(bibliothek, ARG);
const teile = [];
for (const b of BILDER) {
  await page.evaluate(b.tun);
  const png = await page.screenshot({ clip: { x: 500 - KB / 2, y: 320 - KH / 2, width: KB, height: KH } });
  teile.push({ titel: b.titel, bild: png.toString('base64') });
}
const html = `<html><body style="margin:0;background:#fff;font:14px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="display:grid;grid-template-columns:repeat(3,${KB * 1.1}px);gap:22px 18px;padding:18px">${teile
  .map(
    (t) =>
      `<figure style="margin:0"><img src="data:image/png;base64,${t.bild}" style="width:${KB * 1.1}px;height:${KH * 1.1}px;border:1px solid #e4e0da;display:block"><figcaption style="margin-top:8px;line-height:1.35">${t.titel}</figcaption></figure>`,
  )
  .join('')}</div></body></html>`;
const seite = await browser.newPage({ viewport: { width: Math.round(KB * 1.1 * 3 + 18 * 4), height: 400 }, deviceScaleFactor: 2 });
await seite.setContent(html);
fs.writeFileSync(ziel, await seite.screenshot({ fullPage: true }));
console.log('geschrieben', ziel);
await browser.close();
