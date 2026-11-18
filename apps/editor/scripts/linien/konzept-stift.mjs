// Konzeptbilder „Auswahl und Werkzeug P“ (15.11.2026): Standbilder im echten Look der Probe an Florians Fisch. Die neue Linie ist eine
// echte Linie im Netz (gleicher Look wie seine Linien); Tropfen an der Feder, Faden, Griffe, Ring, Welle, gewählte Punkte und Rahmen
// sind zusätzliche Kapseln in derselben flüssigen Anzeige. Verhalten ist das noch nicht. Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/konzept-stift.mjs [ziel.png]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ziel = process.argv[2] ?? '../../docs/progress/linien/konzept-stift-2d.png';
const URL = process.env.URL ?? 'http://localhost:5199';
const KB = 300;
const KH = 260;

/** Werkzeuge im Fenster (läuft dort) */
function bibliothek() {
  const L = window.__linien;
  const v = L.verhalten;
  const a = L.ansicht;
  const w = L.werte;
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
  const bez = (k, t) => {
    const u = 1 - t;
    return [u * u * u * k[0] + 3 * u * u * t * k[2] + 3 * u * t * t * k[4] + t * t * t * k[6], u * u * u * k[1] + 3 * u * u * t * k[3] + 3 * u * t * t * k[5] + t * t * t * k[7]];
  };
  K.bez = bez;
  const ACH = [Math.cos((56 * Math.PI) / 180), Math.sin((56 * Math.PI) / 180)];
  const rTropfen = () => w.punktRadius * w.tropfen;
  /** ein Punkt (f: Größe gegen den Punkt) */
  K.punkt = (x, y, f = 1) => K.kapsel(x, y, x, y, w.punktRadius * f, w.punktRadius * f, 0, 1, K.gruppe());
  /** der Tropfen an der Feder: sitzt an der Spitze des Zeigers, die Spitze knapp in seinem Rand; Ergebnis: seine Mitte */
  K.feder = (tx, ty, f = 1) => {
    const r = rTropfen() * f;
    const cx = tx - ACH[0] * 0.62 * r;
    const cy = ty - ACH[1] * 0.62 * r;
    K.kapsel(cx, cy, cx, cy, r, r, 0, 1, K.gruppe());
    // er hängt an der Spitze: weich zu ihr hin ausgezogen
    K.kapsel(cx, cy, tx, ty, r * 0.55, 0.12, 0, 1, K.gruppe());
    K.feld(cx, cy, 3.2 * r, 1);
    return [cx, cy];
  };
  /** Faden: die nächste Linie als Haarlinie längs der Bézier k; die letzten Stücke schwellen weich zum Tropfen hin an */
  K.faden = (k, rEnde = 0.55) => {
    const n = 60;
    const g = K.gruppe();
    const rh = w.innen / 2;
    let p0 = bez(k, 0);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const p1 = bez(k, t);
      K.kapsel(p0[0], p0[1], p1[0], p1[1], rh, rh, 0, 0, g);
      p0 = p1;
    }
    // Hals: das letzte Fünftel weich, von Haarlinie zu rEnde
    const m = 12;
    let q0 = bez(k, 0.8);
    for (let i = 1; i <= m; i++) {
      const t0 = 0.8 + (0.2 * (i - 1)) / m;
      const t1 = 0.8 + (0.2 * i) / m;
      const q1 = bez(k, t1);
      const f0 = Math.pow((t0 - 0.8) / 0.2, 2.2);
      const f1 = Math.pow((t1 - 0.8) / 0.2, 2.2);
      K.kapsel(q0[0], q0[1], q1[0], q1[1], rh + (rEnde - rh) * f0, rh + (rEnde - rh) * f1, 0, 1, K.gruppe());
      q0 = q1;
    }
  };
  /** Griff, solange er gezogen wird: Haarlinie mit weichem Fuß am Punkt und Perle an der Spitze */
  K.dorn = (hx, hy, tx, ty, perle = 0.8) => {
    const L0 = Math.hypot(tx - hx, ty - hy);
    if (L0 < 1e-6) return;
    const fuss = Math.min(L0, 4);
    const fx = hx + ((tx - hx) / L0) * fuss;
    const fy = hy + ((ty - hy) / L0) * fuss;
    K.kapsel(hx, hy, fx, fy, 0.55, w.innen / 2, 0, 1, K.gruppe());
    K.kapsel(fx, fy, tx, ty, w.innen / 2, w.innen / 2, 0, 0, K.gruppe());
    K.kapsel(tx, ty, tx, ty, w.punktRadius * perle, w.punktRadius * perle, 0, 1, K.gruppe());
    K.feld(tx, ty, 4, 1);
  };
  /** grüne Haarlinie (die alte oder gespiegelte Richtung) */
  K.geist = (x0, y0, x1, y1) => K.kapsel(x0, y0, x1, y1, w.innen / 2, w.innen / 2, 1, 0, K.gruppe());
  /** Ring (Haarlinie) um einen Punkt */
  K.ring = (x, y, rho, breite = w.innen / 2) => {
    const g = K.gruppe();
    const n = 96;
    for (let i = 0; i < n; i++) {
      const p = (2 * Math.PI * i) / n;
      const q = (2 * Math.PI * (i + 1)) / n;
      K.kapsel(x + rho * Math.cos(p), y + rho * Math.sin(p), x + rho * Math.cos(q), y + rho * Math.sin(q), breite, breite, 0, 0, g);
    }
  };
  /** Schwellung längs Linie li um die Bogenlänge s0 (zu jeder Seite reach weit, Höhen sl und sr) */
  K.schwell = (li, s0, reach, staerke, sl = 1, sr = 1) => {
    const P = v.proben[li];
    const l = v.netz.linien[li];
    const Lg = P.laenge;
    const pts = [];
    for (let k = 0; k < P.n; k++) {
      let ds = P.s[k] - s0;
      if (l.zu) {
        while (ds > Lg / 2) ds -= Lg;
        while (ds <= -Lg / 2) ds += Lg;
      }
      if (Math.abs(ds) >= reach) continue;
      const f = Math.pow(1 - Math.abs(ds) / reach, 1.6) * (ds >= 0 ? sr : sl);
      pts.push({ ds, x: P.x[k], y: P.y[k], r: P.halb[k] + 0.5 * w.schwellen * staerke * f, sch: P.schicht[k] });
    }
    pts.sort((p, q) => p.ds - q.ds);
    const g = K.gruppe();
    for (let i = 0; i + 1 < pts.length; i++) K.kapsel(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, pts[i].r, pts[i + 1].r, pts[i].sch, 0, g);
  };
  /** Bogenlänge eines Punkts auf einer Linie */
  K.sVon = (li, pi) => {
    const k = v.netz.linien[li].punkte.indexOf(pi);
    return k < 0 ? -1 : v.proben[li].stueckS[k];
  };
  /** gewählt: der Punkt bleibt ein Tropfen, seine Linien schwellen ruhig an (kleiner Stern); f: wie weit schon (0 … 1) */
  K.gewaehlt = (pi, f = 1) => {
    const p = v.netz.punkte[pi];
    v.netz.linien.forEach((_, li) => {
      const s = K.sVon(li, pi);
      if (s >= 0) K.schwell(li, s, 0.42 * w.reichweite, 0.3 * f);
    });
    K.punkt(p.x, p.y, 1 + 0.6 * f);
    K.feld(p.x, p.y, 3.5 * w.punktRadius, f);
  };
  /** Rahmen: Haarlinie mit runden Ecken */
  K.rahmen = (x0, y0, x1, y1, rc = 2.4) => {
    const g = K.gruppe();
    const b = w.innen * 0.75;
    const [xa, xb] = [Math.min(x0, x1), Math.max(x0, x1)];
    const [ya, yb] = [Math.min(y0, y1), Math.max(y0, y1)];
    K.kapsel(xa + rc, ya, xb - rc, ya, b, b, 0, 0, g);
    K.kapsel(xa + rc, yb, xb - rc, yb, b, b, 0, 0, g);
    K.kapsel(xa, ya + rc, xa, yb - rc, b, b, 0, 0, g);
    K.kapsel(xb, ya + rc, xb, yb - rc, b, b, 0, 0, g);
    const ecke = (cx, cy, w0) => {
      for (let i = 0; i < 12; i++) {
        const p = w0 + ((Math.PI / 2) * i) / 12;
        const q = w0 + ((Math.PI / 2) * (i + 1)) / 12;
        K.kapsel(cx + rc * Math.cos(p), cy + rc * Math.sin(p), cx + rc * Math.cos(q), cy + rc * Math.sin(q), b, b, 0, 0, g);
      }
    };
    ecke(xb - rc, yb - rc, 0);
    ecke(xa + rc, yb - rc, Math.PI / 2);
    ecke(xa + rc, ya + rc, Math.PI);
    ecke(xb - rc, ya + rc, (3 * Math.PI) / 2);
  };
  /** neue Linie ins Netz (echte Linie, gleicher Look); stuecke: je Stück [g1x, g1y, g2x, g2y] relativ zu Anfang und Ende */
  K.linie = (pts, stuecke, zu, art = 'innen') => {
    const n = v.netz;
    const pis = pts.map(([x, y]) => {
      n.punkte.push({ x, y, sichtbar: true, verdeckt: false });
      return n.punkte.length - 1;
    });
    n.linien.push({
      zu,
      punkte: pis,
      stuecke: stuecke.map(([g1x, g1y, g2x, g2y]) => ({ g1x, g1y, g2x, g2y, art })),
      knick: pis.map(() => false),
    });
    v.abtasten();
    return { li: n.linien.length - 1, pis };
  };
  /** Stellen, an denen Linie li andere Linien kreuzt */
  K.kreuzungen = (li) => {
    const A = v.proben[li];
    const out = [];
    v.proben.forEach((B, lj) => {
      if (lj === li) return;
      for (let i = 0; i + 1 < A.n; i++) {
        const ax = A.x[i];
        const ay = A.y[i];
        const ux = A.x[i + 1] - ax;
        const uy = A.y[i + 1] - ay;
        for (let j = 0; j + 1 < B.n; j++) {
          const bx = B.x[j];
          const by = B.y[j];
          const vx = B.x[j + 1] - bx;
          const vy = B.y[j + 1] - by;
          const d = ux * vy - uy * vx;
          if (Math.abs(d) < 1e-9) continue;
          const t = ((bx - ax) * vy - (by - ay) * vx) / d;
          const s = ((bx - ax) * uy - (by - ay) * ux) / d;
          if (t >= 0 && t < 1 && s >= 0 && s < 1) out.push([ax + ux * t, ay + uy * t, lj]);
        }
      }
    });
    return out;
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
  /** Ruhe: Netz wie am Anfang, Zeiger weg, Ansicht auf (cx, cy) */
  K.ruhe = (cx, cy, z) => {
    v.zuruecksetzen();
    v.zeigerWeg();
    v.tropfen = [];
    v.stift = false;
    a.wachsen = true;
    a.z = z;
    a.ox = 500 - cx * z;
    a.oy = 320 - cy * z;
    v.setzeAnsicht(a);
    v.abtasten();
    L.vorspulen(1500);
    K.neu();
  };
  window.__k = K;
}

// Der Loop unter dem Auge: ein Blatt mit Spitzen oben (Klick) und unten (Ziehen mit ⌥), glatt rechts und links (Ziehen)
const MITTE = [313, 203];
const Z = 3.5;
const P1 = [309, 176];
const P2 = [334, 203];
const P3 = [311, 230];
const P4 = [290, 203];
const G = 11;
const AUGE = [302, 150];

const BILDER = [
  {
    titel: '1 · P: an der Feder hängt ein Tropfen',
    tun: ({ MITTE, Z, P1 }) => {
      const K = window.__k;
      K.ruhe(MITTE[0], MITTE[1], Z);
      const z = [P1[0] - 3, P1[1] - 4];
      K.feder(z[0], z[1]);
      K.zeichnen([z[0], z[1]]);
    },
  },
  {
    titel: '2 · Klick: der Tropfen fällt als Punkt, ein Faden folgt dem Zeiger',
    tun: ({ MITTE, Z, P1, P2 }) => {
      const K = window.__k;
      K.ruhe(MITTE[0], MITTE[1], Z);
      K.punkt(P1[0], P1[1]);
      const z = [P2[0] - 1.5, P2[1] - 4.5];
      const [cx, cy] = K.feder(z[0], z[1]);
      K.faden([P1[0], P1[1], P1[0], P1[1], cx, cy, cx, cy]);
      K.zeichnen([z[0], z[1]]);
    },
  },
  {
    titel: '3 · Klicken und Ziehen: Schwung, die Griffe ziehen sich aus dem Punkt',
    tun: ({ MITTE, Z, P1, P2, G }) => {
      const K = window.__k;
      K.ruhe(MITTE[0], MITTE[1], Z);
      K.linie([P1, P2], [[0, 0, 0, -G]], false);
      const aus = [P2[0], P2[1] + G];
      const ein = [P2[0], P2[1] - G];
      K.dorn(P2[0], P2[1], aus[0], aus[1]);
      K.dorn(P2[0], P2[1], ein[0], ein[1], 0.7);
      K.punkt(P2[0], P2[1], 1.25);
      K.feld(P2[0], P2[1], 6, 1);
      K.zeichnen([aus[0], aus[1], 0.86]);
    },
  },
  {
    titel: '4 · mit ⌥: nur die neue Richtung folgt, am Punkt ein Knick',
    tun: ({ MITTE, Z, P1, P2, P3, G }) => {
      const K = window.__k;
      K.ruhe(MITTE[0], MITTE[1], Z);
      K.linie([P1, P2, P3], [[0, 0, 0, -G], [0, G, 8, -7]], false);
      const ein = [P3[0] + 8, P3[1] - 7];
      const vorher = [P3[0] - 8, P3[1] + 7];
      const aus = [P3[0] - 8, P3[1] - 7.5];
      K.geist(P3[0], P3[1], vorher[0], vorher[1]);
      K.dorn(P3[0], P3[1], ein[0], ein[1], 0.7);
      K.dorn(P3[0], P3[1], aus[0], aus[1]);
      // Knick: der Punkt sitzt hart als Fuge (kein weiches Feld)
      K.punkt(P3[0], P3[1], 1.15);
      K.zeichnen([aus[0], aus[1], 0.86]);
    },
  },
  {
    titel: '5 · am ersten Punkt öffnet er sich zum Ring: Klick schließt',
    tun: ({ MITTE, Z, P1, P2, P3, P4, G }) => {
      const K = window.__k;
      K.ruhe(MITTE[0], MITTE[1], Z);
      K.linie([P1, P2, P3, P4], [[0, 0, 0, -G], [0, G, 8, -7], [-8, -7.5, 0, G]], false);
      const z = [P1[0] + 1.3, P1[1] + 1.9];
      K.ring(P1[0], P1[1], 3.1, w0());
      K.faden([P4[0], P4[1], P4[0], P4[1] - G, P1[0], P1[1] + 3.1, P1[0], P1[1] + 3.1], 0.42);
      K.feld(P1[0], P1[1], 7, 1);
      K.zeichnen([z[0], z[1]]);
      function w0() {
        return window.__linien.werte.innen * 0.9;
      }
    },
  },
  {
    titel: '6 · geschlossen: eine Welle läuft einmal herum; wo er eine Linie kreuzt, teilen beide einen Punkt',
    tun: ({ MITTE, Z, P1, P2, P3, P4, G }) => {
      const K = window.__k;
      K.ruhe(MITTE[0], MITTE[1], Z);
      const { li } = K.linie([P1, P2, P3, P4], [[0, 0, 0, -G], [0, G, 8, -7], [-8, -7.5, 0, G], [0, -G, 0, 0]], true);
      const L = window.__linien.verhalten.proben[li].laenge;
      K.schwell(li, 0.34 * L, 0.2 * L, 0.65, 0.55, 1);
      for (const [x, y] of K.kreuzungen(li)) K.punkt(x, y);
      const z = [P2[0] + 9, P1[1] - 3];
      K.feder(z[0], z[1], 0.75);
      K.zeichnen([z[0], z[1]]);
    },
  },
  {
    titel: '7 · Klick auf einen Punkt: gewählt, er bleibt ein Tropfen, seine Linien schwellen ruhig an',
    tun: ({ AUGE, Z }) => {
      const K = window.__k;
      K.ruhe(AUGE[0], AUGE[1], Z);
      K.gewaehlt(54);
      const p = window.__linien.verhalten.netz.punkte[54];
      K.zeichnen([p.x + 7, p.y + 6]);
    },
  },
  {
    titel: '8 · Ziehen im Leeren: ein Rahmen, Punkte darin schwellen an',
    tun: ({ AUGE, Z }) => {
      const K = window.__k;
      K.ruhe(AUGE[0], AUGE[1], Z);
      const v = window.__linien.verhalten;
      const r = [AUGE[0] - 4, AUGE[1] - 22, AUGE[0] + 33, AUGE[1] + 10];
      K.rahmen(r[0], r[1], r[2], r[3]);
      v.netz.punkte.forEach((p, i) => {
        if (!p.sichtbar) return;
        const innen = p.x > r[0] && p.x < r[2] && p.y > r[1] && p.y < r[3];
        const rand = Math.min(p.x - r[0], r[2] - p.x, p.y - r[1], r[3] - p.y);
        if (innen) K.gewaehlt(i, Math.min(1, rand / 3));
      });
      K.zeichnen([r[2], r[3], 0.86]);
    },
  },
  {
    titel: '9 · Doppelklick auf eine Linie: der ganze Loop, eine Welle läuft entlang',
    tun: ({ AUGE, Z }) => {
      const K = window.__k;
      K.ruhe(AUGE[0], AUGE[1], Z);
      const v = window.__linien.verhalten;
      // der Loop des Auges: die geschlossene Linie durch Punkt 61
      const li = v.netz.linien.findIndex((l) => l.zu && l.punkte.includes(61));
      for (const pi of v.netz.linien[li].punkte) if (v.netz.punkte[pi].sichtbar) K.gewaehlt(pi);
      const L = v.proben[li].laenge;
      K.schwell(li, 0.62 * L, 0.16 * L, 0.7, 0.5, 1);
      const P = v.proben[li];
      let b = 0;
      for (let i = 0; i < P.n; i++) if (Math.abs(P.s[i] - 0.7 * L) < Math.abs(P.s[b] - 0.7 * L)) b = i;
      K.zeichnen([P.x[b] + 1, P.y[b] + 1.2]);
    },
  },
];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${URL}/linien.html?bild=1`);
await page.waitForFunction(() => window.__linien);
await new Promise((ok) => setTimeout(ok, 500));
await page.evaluate(bibliothek);
const ARG = { MITTE, Z, P1, P2, P3, P4, G, AUGE };
const teile = [];
for (const b of BILDER) {
  await page.evaluate(b.tun, ARG);
  const png = await page.screenshot({ clip: { x: 500 - KB / 2, y: 320 - KH / 2, width: KB, height: KH } });
  teile.push({ titel: b.titel, bild: png.toString('base64') });
}
const f = 1.25;
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
