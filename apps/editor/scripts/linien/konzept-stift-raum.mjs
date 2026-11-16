// Konzeptbilder „Werkzeug P im Raum: ein Ring um den Körper über die Mitte“ (15.11.2026), an „teat firefish“, um den Schwanz. Der Ring folgt dem
// Schnitt der Haut mit einer Ebene quer zum Körper (so liegt er genau auf der Haut); Punkte, Faden, Tropfen an der Feder, die Mitte als
// Punktreihe und die Welle sind zusätzliche Kapseln in der Anzeige der 3D-Probe, nach Tiefe verdeckt (dahinter grün). Verhalten ist
// das noch nicht. Kamera schräg von hinten (GIER). Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/konzept-stift-raum.mjs [ziel.png]      (QUER=<Anteil am Radius> wählt die Stelle des Rings)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ziel = process.argv[2] ?? '../../docs/progress/linien/konzept-stift-raum.png';
const URL = process.env.URL ?? 'http://localhost:5199';
const QUER = Number(process.env.QUER ?? 0.55);
const MASS = 2;
const GIER = Number(process.env.GIER ?? 0.95);
const KB = 340;
const KH = 300;

function bibliothek({ QUER, MASS, GIER }) {
  const Q = window.__raum;
  const R = Q.raum;
  const v = Q.verhalten;
  const a = Q.ansicht;
  const w = Q.werte;
  a.massstab = MASS;
  const D = a.dpr;
  const K = { extra: [], felder: [] };
  let gruppe = 100000;
  K.neu = () => {
    K.extra = [];
    K.felder = [];
  };
  K.gruppe = () => ++gruppe;
  K.auf = (p) => {
    const o = [0, 0, 0];
    R.auf(p[0], p[1], p[2], o, 0);
    return o;
  };
  /** Kapsel aus Bildschirmpunkten mit Tiefe; schicht 2: nach Tiefe, 0: immer vorn (Tinte), 1: immer grün */
  K.kapsel = (p, q, r0, r1, schicht, form, g) => K.extra.push([p[0] * D, p[1] * D, q[0] * D, q[1] * D, r0 * MASS * D, r1 * MASS * D, g, schicht + 4 * form, p[2], q[2], 0, 0]);
  K.feld = (p, r, st = 1) => K.felder.push([p[0] * D, p[1] * D, r * MASS * D, st]);
  /** Schnitt der gezeigten Haut mit der Ebene n·x = d: Strecken (Welt) */
  K.schnitt = (n, d) => {
    const P = R.anzeigePos;
    const T = R.anzeigeTri;
    const segs = [];
    const lage = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
    for (let t = 0; t < T.length; t += 3) {
      const e = [lage(T[t]), lage(T[t + 1]), lage(T[t + 2])];
      const s = e.map((p) => n[0] * p[0] + n[1] * p[1] + n[2] * p[2] - d);
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        if (s[i] < 0 !== s[j] < 0) {
          const f = s[i] / (s[i] - s[j]);
          pts.push([e[i][0] + (e[j][0] - e[i][0]) * f, e[i][1] + (e[j][1] - e[i][1]) * f, e[i][2] + (e[j][2] - e[i][2]) * f]);
        }
      }
      if (pts.length === 2) segs.push(pts);
    }
    return segs;
  };
  /**
   * Halber Ring quer bei x = c: die Schnittpunkte mit z ≥ 0, nach dem Winkel um die Mitte des Schnitts geordnet (oben auf der Mitte,
   * über die Flanke, unten auf der Mitte); Ergebnis: Zug von Weltpunkten, Anfang und Ende genau auf z = 0
   */
  K.halbring = (c) => {
    const segs = K.schnitt([1, 0, 0], c);
    const pts = [];
    for (const s of segs) for (const p of s) if (p[2] >= -1e-6) pts.push(p);
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    const yc = (y0 + y1) / 2;
    const w0 = (p) => Math.atan2(Math.max(0, p[2]), p[1] - yc);
    pts.sort((p, q) => w0(p) - w0(q));
    const zug = [];
    for (const p of pts) if (!zug.length || Math.hypot(p[0] - zug[zug.length - 1][0], p[1] - zug[zug.length - 1][1], p[2] - zug[zug.length - 1][2]) > R.radius * 0.004) zug.push(p);
    zug[0] = [zug[0][0], zug[0][1], 0];
    zug[zug.length - 1] = [zug[zug.length - 1][0], zug[zug.length - 1][1], 0];
    return zug;
  };
  /** Zug von Weltpunkten als Linie (Haarlinie), nach Tiefe; spiegel: z → −z */
  K.zug = (zug, i0, i1, r = w.innen / 2, spiegel = false) => {
    const g = K.gruppe();
    const s = spiegel ? -1 : 1;
    for (let i = i0; i < i1; i++) {
      const p = zug[i];
      const q = zug[i + 1];
      K.kapsel(K.auf([p[0], p[1], s * p[2]]), K.auf([q[0], q[1], s * q[2]]), r, r, 2, 0, g);
    }
  };
  /** Stelle im Zug beim Anteil f der Bogenlänge */
  K.beiAnteil = (zug, f) => {
    const L = [0];
    for (let i = 1; i < zug.length; i++) L.push(L[i - 1] + Math.hypot(zug[i][0] - zug[i - 1][0], zug[i][1] - zug[i - 1][1], zug[i][2] - zug[i - 1][2]));
    const ziel = f * L[L.length - 1];
    let i = 0;
    while (i + 1 < L.length - 1 && L[i + 1] < ziel) i++;
    return i;
  };
  K.punkt = (p3, f = 1, schicht = 2) => {
    const s = K.auf(p3);
    K.kapsel(s, s, w.punktRadius * f, w.punktRadius * f, schicht, 1, K.gruppe());
    return s;
  };
  const ACH = [Math.cos((56 * Math.PI) / 180), Math.sin((56 * Math.PI) / 180)];
  /** Tropfen an der Feder (Bildschirm), die Spitze des Zeigers knapp in seinem Rand; er hängt an ihr */
  K.feder = (tx, ty, f = 1) => {
    const r = w.punktRadius * w.tropfen * f;
    const c = [tx - ACH[0] * 0.62 * r * MASS, ty - ACH[1] * 0.62 * r * MASS, 0];
    K.kapsel(c, c, r, r, 0, 1, K.gruppe());
    K.kapsel(c, [tx, ty, 0], r * 0.55, 0.2, 0, 1, K.gruppe());
    K.feld(c, 3.2 * r, 1);
    return c;
  };
  /** Faden über die Haut: Zug von i0 bis i1, die letzten Stücke weich zum Tropfen hin */
  K.faden = (zug, i0, i1, spiegel = false) => {
    K.zug(zug, i0, i1, w.innen / 2, spiegel);
    if (spiegel) return;
    const n = Math.max(1, Math.round((i1 - i0) * 0.25));
    for (let i = i1 - n; i < i1; i++) {
      const f0 = Math.pow((i - (i1 - n)) / n, 2);
      const f1 = Math.pow((i + 1 - (i1 - n)) / n, 2);
      K.kapsel(K.auf(zug[i]), K.auf(zug[i + 1]), w.innen / 2 + 0.45 * f0, w.innen / 2 + 0.45 * f1, 2, 1, K.gruppe());
    }
  };
  /** Schwellung auf dem Zug um Index i (Welle), nach Tiefe */
  K.welle = (zug, i, reich, staerke, spiegel = false) => {
    const g = K.gruppe();
    const s = spiegel ? -1 : 1;
    for (let j = Math.max(0, i - reich); j < Math.min(zug.length - 1, i + reich); j++) {
      const f0 = Math.pow(1 - Math.min(1, Math.abs(j - i) / reich), 1.6);
      const f1 = Math.pow(1 - Math.min(1, Math.abs(j + 1 - i) / reich), 1.6);
      const p = zug[j];
      const q = zug[j + 1];
      K.kapsel(K.auf([p[0], p[1], s * p[2]]), K.auf([q[0], q[1], s * q[2]]), w.innen / 2 + 0.5 * w.schwellen * staerke * f0, w.innen / 2 + 0.5 * w.schwellen * staerke * f1, 2, 0, g);
    }
  };
  /** die Mitte als Punktreihe auf der Haut, nur nahe an der Stelle p (Bildschirm), zum Rand hin kleiner */
  K.mitte = (p, reich = 70, abstand = 6.5) => {
    const segs = K.schnitt([0, 0, 1], R.radius * 0.0015);
    const pts = [];
    for (const s of segs)
      for (const q of s) {
        const sq = K.auf(q);
        const d = Math.hypot(sq[0] - p[0], sq[1] - p[1]);
        if (d < reich) pts.push({ sq, d });
      }
    pts.sort((u, v2) => u.d - v2.d);
    const gesetzt = [];
    for (const q of pts) {
      if (gesetzt.some((g) => Math.hypot(g[0] - q.sq[0], g[1] - q.sq[1]) < abstand)) continue;
      gesetzt.push(q.sq);
      const f = Math.pow(1 - q.d / reich, 0.8);
      K.kapsel(q.sq, q.sq, w.punktRadius * 0.7 * f, w.punktRadius * 0.7 * f, 2, 1, K.gruppe());
    }
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
      const Lz = w.zeigerGroesse * D * (zeiger[2] ?? 1);
      const ax = zeiger[0] * D;
      const ay = zeiger[1] * D;
      const w1 = (32 * Math.PI) / 180;
      const w2 = (80 * Math.PI) / 180;
      sz.zeiger = { ax, ay, bx: ax + Lz * Math.cos(w1), by: ay + Lz * Math.sin(w1), cx: ax + Lz * Math.cos(w2), cy: ay + Lz * Math.sin(w2), linie: w.zeigerLinie * D };
    } else sz.zeiger = null;
    Q.anzeige.zeichnen(sz);
  };
  /** Ausgang: Form frisch, Kamera schräg auf die Mitte des Rings */
  K.ausgang = async () => {
    await Q.formLaden('teat firefish');
    a.massstab = MASS;
    v.zeigerWeg();
    v.tropfen = [];
    R.zeigeAnsicht('schraeg');
    const c = R.mitte.x + QUER * R.radius;
    K.ring = K.halbring(c);
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of K.ring) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    // von vorn oben schräg (etwa 60° neben der Seite), damit man in den Ring hineinsieht
    R.gier.ziel = Number(window.__gier ?? GIER);
    R.nick.ziel = Number(window.__nick ?? 0.32);
    R.zielX.ziel = c;
    R.zielY.ziel = (y0 + y1) / 2;
    R.zielZ.ziel = 0;
    R.abstand.ziel = (y1 - y0) * Number(window.__weite ?? 8);
    Q.vorspulen(4000);
    await new Promise((ok) => setTimeout(ok, 400));
    K.neu();
  };
  window.__k = K;
}

const BILDER = [
  {
    titel: 'Raum · P auf der Haut: nahe der Mitte zeigt sie sich als Punktreihe, der Tropfen rastet auf ihr ein',
    tun: async () => {
      const K = window.__k;
      await K.ausgang();
      const oben = K.auf(K.ring[0]);
      K.mitte(oben, 80);
      const z = [oben[0] + 1.5, oben[1] + 2.5];
      K.feder(z[0], z[1]);
      K.zeichnen([z[0], z[1]]);
    },
  },
  {
    titel: 'Raum · von der Mitte über die Flanke: Punkte auf der Haut, der Faden liegt auf ihr; das Spiegelbild zeichnet mit (dahinter grün)',
    tun: async () => {
      const K = window.__k;
      await K.ausgang();
      const z = K.ring;
      const i1 = K.beiAnteil(z, 0.36);
      const i2 = K.beiAnteil(z, 0.7);
      const iz = K.beiAnteil(z, 0.93);
      K.zug(z, 0, i2);
      K.zug(z, 0, iz, undefined, true);
      K.faden(z, i2, iz);
      for (const i of [0, i1, i2]) K.punkt(z[i]);
      for (const i of [i1, i2]) K.punkt([z[i][0], z[i][1], -z[i][2]]);
      const unten = K.auf(z[z.length - 1]);
      K.mitte(unten, 70);
      const sp = K.auf(z[iz]);
      K.feder(sp[0], sp[1]);
      K.zeichnen([sp[0], sp[1]]);
    },
  },
  {
    titel: 'Raum · wieder an der Mitte: Klick, und mit dem Spiegelbild ist es ein Ring um den Körper; die Welle läuft herum',
    tun: async () => {
      const K = window.__k;
      await K.ausgang();
      const z = K.ring;
      const n = z.length - 1;
      const i1 = K.beiAnteil(z, 0.36);
      const i2 = K.beiAnteil(z, 0.7);
      K.zug(z, 0, n);
      K.zug(z, 0, n, undefined, true);
      K.welle(z, K.beiAnteil(z, 0.5), Math.round(n * 0.2), 0.8);
      for (const i of [0, i1, i2, n]) K.punkt(z[i]);
      for (const i of [i1, i2]) K.punkt([z[i][0], z[i][1], -z[i][2]]);
      const unten = K.auf(z[n]);
      K.feder(unten[0] + 26, unten[1] + 10, 0.75);
      K.zeichnen([unten[0] + 26, unten[1] + 10]);
    },
  },
];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${URL}/raum.html?bild=1`);
await page.waitForFunction(() => window.__raum && window.__raum.verhalten.netz.punkte.length > 0);
await page.evaluate(bibliothek, { QUER, MASS, GIER });
const teile = [];
for (const b of BILDER) {
  await page.evaluate(b.tun);
  const png = await page.screenshot({ clip: { x: 500 - KB / 2, y: 320 - KH / 2, width: KB, height: KH } });
  teile.push({ titel: b.titel, bild: png.toString('base64') });
}
const f = 1.1;
const html = `<html><body style="margin:0;background:#fff;font:14px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="display:grid;grid-template-columns:repeat(3,${KB * f}px);gap:22px 18px;padding:18px">${teile
  .map(
    (t) =>
      `<figure style="margin:0"><img src="data:image/png;base64,${t.bild}" style="width:${KB * f}px;height:${KH * f}px;border:1px solid #e4e0da;display:block"><figcaption style="margin-top:8px;line-height:1.35">${t.titel}</figcaption></figure>`,
  )
  .join('')}</div></body></html>`;
const seite = await browser.newPage({ viewport: { width: Math.round(KB * f * 3 + 18 * 4), height: 400 }, deviceScaleFactor: 2 });
await seite.setContent(html);
fs.writeFileSync(ziel, await seite.screenshot({ fullPage: true }));
console.log('geschrieben', ziel, 'Fehler', JSON.stringify(fehler));
await browser.close();
