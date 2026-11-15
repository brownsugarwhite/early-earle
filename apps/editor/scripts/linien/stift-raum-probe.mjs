// Probe „Auswahl und Werkzeug P“ im Raum (15.11.2026, Kriterien im Plan docs/plans/2026-11-15-auswahl-und-stift.md, vorher festgelegt):
// echte Maus an „teat firefish“, ein Ring um den Schwanz von der Mitte über die Flanke zur Mitte, schräg von hinten gesehen (wie im
// Konzeptbild). Aufruf aus apps/editor, Server auf 5199:
//   node scripts/linien/stift-raum-probe.mjs [bilder.png]
import { chromium } from '@playwright/test';

const URL = process.env.URL ?? 'http://localhost:5199';
const bildPfad = process.argv[2];
const QUER = Number(process.env.QUER ?? 0.55);
const B = 1000;
const H = 640;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: B, height: H }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${URL}/raum.html?bild=1`);
await page.waitForFunction(() => window.__raum && window.__raum.raum.hautTri.length > 0);
await new Promise((r) => setTimeout(r, 400));

// Ansicht wie im Konzeptbild: schräg von hinten auf den Schnitt bei x = Mitte + QUER · Radius; dazu die Punkte des Rings
const plan = await page.evaluate(
  ({ QUER }) => {
    const Q = window.__raum;
    const R = Q.raum;
    Q.ansicht.massstab = Number(window.__mass ?? 1);
    R.zeigeAnsicht('schraeg');
    const c = R.mitte.x + QUER * R.radius;
    // Schnitt der Haut mit der Ebene x = c, Hälfte z ≥ 0
    const P = R.anzeigePos;
    const T = R.anzeigeTri;
    const pts = [];
    for (let t = 0; t < T.length; t += 3) {
      const e = [T[t], T[t + 1], T[t + 2]].map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
      const s = e.map((p) => p[0] - c);
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        if (s[i] < 0 !== s[j] < 0) {
          const f = s[i] / (s[i] - s[j]);
          const q = [c, e[i][1] + (e[j][1] - e[i][1]) * f, e[i][2] + (e[j][2] - e[i][2]) * f];
          if (q[2] >= 0) pts.push(q);
        }
      }
    }
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of pts) {
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    const ym = (y0 + y1) / 2;
    // nach dem Winkel um die Mitte des Schnitts: oben (z = 0) über die Flanke nach unten
    pts.sort((a, b) => Math.atan2(a[2], a[1] - ym) - Math.atan2(b[2], b[1] - ym));
    R.gier.ziel = 0.95;
    R.nick.ziel = 0.32;
    R.zielX.ziel = c;
    R.zielY.ziel = ym;
    R.zielZ.ziel = 0;
    R.abstand.ziel = (y1 - y0) * 8;
    Q.vorspulen(4000);
    const nehmen = (f) => pts[Math.min(pts.length - 1, Math.max(0, Math.round(f * (pts.length - 1))))];
    window.__schnitt = nehmen;
    return { c, ym, oben: nehmen(0), unten: nehmen(1), radius: R.radius };
  },
  { QUER },
);
await new Promise((r) => setTimeout(r, 300));
const schirm = (p) =>
  page.evaluate((p) => {
    const o = [0, 0, 0];
    window.__raum.raum.auf(p[0], p[1], p[2], o, 0);
    return o;
  }, p);
const warten = (ms = 160) => page.evaluate((m) => window.__raum.vorspulen(m), ms);
const hin = async (s, schritte = 12) => {
  await page.mouse.move(s[0], s[1], { steps: schritte });
  await warten();
};
/** Richtung auf dem Bildschirm, in die eine Richtung der Welt an p zeigt (Länge L Bildschirmpunkte) */
const richtung = async (p, d, L) => {
  const a = await schirm(p);
  const b = await schirm([p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [((b[0] - a[0]) / l) * L, ((b[1] - a[1]) / l) * L];
};
const ziehen = async (s, g) => {
  await hin(s);
  await page.mouse.down();
  await warten(40);
  await page.mouse.move(s[0] + g[0], s[1] + g[1], { steps: 10 });
  await warten(60);
  await page.mouse.up();
  await warten();
};
const bilder = [];
const KB = 300;
const KH = 255;
let blick = [B / 2, H / 2];
const bild = async (titel) => {
  if (!bildPfad) return;
  await page.evaluate(() => window.__raum.schritt(0));
  await new Promise((r) => setTimeout(r, 60));
  const x = Math.max(0, Math.min(B - KB, blick[0] - KB / 2));
  const y = Math.max(0, Math.min(H - KH, blick[1] - KH / 2));
  const png = await page.screenshot({ clip: { x, y, width: KB, height: KH } });
  bilder.push({ titel, bild: png.toString('base64') });
};
/** Faden auf der sichtbaren Seite: Proben hinter der Haut (wären grün), wie das Verhalten ihn gerade zeichnet */
const fadenGruen = () =>
  page.evaluate(() => {
    const Q = window.__raum;
    const R = Q.raum;
    const v = Q.verhalten;
    const zl = v.stiftZiel;
    if (!zl) return null;
    const ende =
      zl.art === 'schluss' ? { art: 'schluss' } : zl.art === 'punkt' ? { art: 'punkt', pi: zl.pi } : zl.art === 'linie' ? { art: 'linie', li: zl.li, si: zl.si, t: zl.t } : { art: 'frei', x: zl.x, y: zl.y };
    const F = R.faden(ende, [0, 0]);
    if (!F) return null;
    // grün ist eine Probe, wenn die Haut vor ihr liegt; ein Fehler ist das nur, wo die Haut an ihr zum Betrachter zeigt (dann läge der
    // Faden in der Haut statt auf ihr). Dazu: wie weit der Faden neben der Haut liegt.
    let gruen = 0;
    let falsch = 0;
    let neben = 0;
    const auge = R.kamera.auge;
    for (let i = 1; i < F.n - 1; i++) {
      const p = { x: F.welt[i * 3], y: F.welt[i * 3 + 1], z: F.welt[i * 3 + 2] };
      const auf = R.aufHaut(p);
      neben = Math.max(neben, Math.hypot(auf.p.x - p.x, auf.p.y - p.y, auf.p.z - p.z));
      const h = R.strahlTreffer(F.x[i], F.y[i]);
      if (!h) continue;
      const o = [0, 0, 0];
      R.auf(h.p.x, h.p.y, h.p.z, o, 0);
      if (F.z[i] <= o[2] + R.bias()) continue;
      gruen++;
      const n = auf.n;
      if (n.x * (auge.x - p.x) + n.y * (auge.y - p.y) + n.z * (auge.z - p.z) > 0) falsch++;
    }
    return { ziel: zl.art, n: F.n, gruen, falschGruen: falsch, nebenHautAnteil: neben / R.radius };
  });

await page.evaluate(() => window.__raum.verhalten.stiftSchalten(true));
const aus = { kriterien: {} };
const oben = await schirm(plan.oben);
const unten = await schirm(plan.unten);
/** eine Stelle des Schnitts nahe dem Anteil f, an der P frei setzt (keine Linie, kein Punkt in der Nähe) */
const freieStelle = async (f) => {
  for (const df of [0, 0.03, -0.03, 0.06, -0.06, 0.09, -0.09, 0.12, -0.12]) {
    const w = await page.evaluate((g) => window.__schnitt(g), f + df);
    const sp = await schirm(w);
    await hin(sp);
    const z = await page.evaluate(() => window.__raum.verhalten.stiftZiel);
    if (z && z.art === 'frei' && !z.mitte) return { w, s: sp };
  }
  throw new Error(`keine freie Stelle bei ${f}`);
};
const stellen = [await freieStelle(0.3), await freieStelle(0.65)];
await hin([oben[0] + 60, oben[1] - 40]);
const A = stellen[0].s;
const Bp = stellen[1].s;
plan.a = stellen[0].w;
plan.b = stellen[1].w;
// 1 · oben auf der Mitte beginnen, gezogen quer zur Mitte (in die Hälfte z > 0)
blick = oben;
await hin([oben[0] + 3, oben[1] - 4]);
await bild('1 · P nahe der Mitte: die Punktreihe, der Tropfen rastet ein');
await ziehen(oben, await richtung(plan.oben, [0, 0, 1], 34));
await hin([A[0] - 10, A[1] - 6]);
const gruen1 = await fadenGruen();
blick = [(oben[0] + A[0]) / 2, (oben[1] + A[1]) / 2];
await bild('2 · der Faden läuft über die Haut');
await ziehen(A, await richtung(plan.a, [0, plan.b[1] - plan.oben[1], plan.b[2] - plan.oben[2]], 26));
await hin([Bp[0] - 6, Bp[1] - 8]);
const gruen2 = await fadenGruen();
await ziehen(Bp, await richtung(plan.b, [0, plan.unten[1] - plan.a[1], plan.unten[2] - plan.a[2]], 26));
await hin([unten[0] + 4, unten[1] + 6]);
const gruen3 = await fadenGruen();
blick = [(Bp[0] + unten[0]) / 2, (Bp[1] + unten[1]) / 2];
await bild('3 · unten an der Mitte: einrasten');
// Verlauf aller vorhandenen Linien vor dem Fertigwerden (die Kreuzungen dürfen ihn nicht ändern)
const verlaufVorher = await page.evaluate(() => {
  const R = window.__raum.raum;
  return R.linien.map((l) => {
    if (l.aufHaut) return null;
    const pts = [];
    for (const st of l.stuecke) {
      const k = R.kontrolle(st);
      for (let i = 0; i <= 200; i++) {
        const t = i / 200;
        const u = 1 - t;
        const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
        pts.push(['x', 'y', 'z'].map((a) => b[0] * k[0][a] + b[1] * k[1][a] + b[2] * k[2][a] + b[3] * k[3][a]));
      }
    }
    return pts;
  });
});
await ziehen(unten, await richtung(plan.unten, [0, 0, -1], 34));
await page.evaluate(() => window.__raum.vorspulen(250));
blick = [(oben[0] + unten[0]) / 2, (oben[1] + unten[1]) / 2];
await bild('4 · ein Ring um den Körper, die Welle läuft um beide Hälften');
await page.evaluate(() => window.__raum.vorspulen(900));
await hin([unten[0] + 60, unten[1] + 40]);
await bild('5 · fertig');
const ergebnis = await page.evaluate((radius) => {
  const R = window.__raum.raum;
  const li = R.linien.length - 1;
  const l = R.linien[li];
  const an = l.anker;
  const lage = (i) => ({ x: R.anker[i * 3], y: R.anker[i * 3 + 1], z: R.anker[i * 3 + 2] });
  // Ring: die Hälfte (z ≥ 0) und ihr Spiegelbild; Enden auf der Mitte
  const mitte = an.filter((i) => Math.abs(lage(i).z) < radius * 1e-9);
  // je Anker der Hälfte z > 0 sein Spiegelanker in der Linie
  let spiegelAbw = 0;
  for (const i of an) {
    const p = lage(i);
    if (p.z <= 0) continue;
    let best = Infinity;
    for (const j of an) {
      const q = lage(j);
      best = Math.min(best, Math.hypot(q.x - p.x, q.y - p.y, q.z + p.z));
    }
    spiegelAbw = Math.max(spiegelAbw, best);
  }
  let hautAbw = 0;
  for (const i of an) hautAbw = Math.max(hautAbw, Math.hypot(...Object.values(((p) => { const h = R.aufHaut(p).p; return { x: h.x - p.x, y: h.y - p.y, z: h.z - p.z }; })(lage(i)))));
  return { zu: l.zu, aufHaut: !!l.aufHaut, anker: an.length, aufDerMitte: mitte.length, mitteZ: mitte.map((i) => lage(i).z), spiegelAbw, hautAbwAnteil: hautAbw / radius, linien: R.linien.length };
}, plan.radius);
// Kreuzungen: Punkte des Rings, die auch auf anderen Linien liegen; danach keine Kreuzung mehr ohne Punkt; die gekreuzten Linien
// behalten genau ihren Verlauf
const kreuz = await page.evaluate((vorher) => {
  const R = window.__raum.raum;
  const li = R.linien.findIndex((l) => l.aufHaut && l.zu);
  const ring = R.linien[li];
  // gemeinsame Punkte neben der Mitte (auf der Mitte hängen Anfang und Ende)
  const geteilt = ring.anker.filter((a) => Math.abs(R.anker[a * 3 + 2]) > R.radius * 1e-9 && R.linien.some((l, lj) => lj !== li && l.anker.includes(a)));
  const offen = R.kreuzungFinden(li, []);
  // Abstand jeder Probe der Linie jetzt vom Verlauf vorher (Polygon)
  let verlauf = 0;
  vorher.forEach((P, lj) => {
    if (!P) return;
    const l = R.linien[lj];
    for (const st of l.stuecke) {
      const k = R.kontrolle(st);
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const u = 1 - t;
        const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
        const p = ['x', 'y', 'z'].map((a) => b[0] * k[0][a] + b[1] * k[1][a] + b[2] * k[2][a] + b[3] * k[3][a]);
        let m = Infinity;
        for (let j = 0; j + 1 < P.length; j++) {
          const a = P[j];
          const v = [P[j + 1][0] - a[0], P[j + 1][1] - a[1], P[j + 1][2] - a[2]];
          const l2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
          const f = l2 > 0 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1] + (p[2] - a[2]) * v[2]) / l2)) : 0;
          m = Math.min(m, Math.hypot(p[0] - a[0] - v[0] * f, p[1] - a[1] - v[1] * f, p[2] - a[2] - v[2] * f));
        }
        verlauf = Math.max(verlauf, m);
      }
    }
  });
  return { geteilt: geteilt.length, offen, verlaufAnteil: verlauf / R.radius };
}, verlaufVorher);
const gruen = [gruen1, gruen2, gruen3];
aus.kriterien.ring = {
  ...ergebnis,
  kreuzungen: kreuz,
  fadenGruen: gruen,
  bestanden:
    ergebnis.zu &&
    kreuz.geteilt >= 2 &&
    kreuz.geteilt % 2 === 0 &&
    kreuz.offen === null &&
    kreuz.verlaufAnteil < 0.002 &&
    ergebnis.aufDerMitte === 2 &&
    ergebnis.mitteZ.every((z) => z === 0) &&
    ergebnis.spiegelAbw < 1e-6 * plan.radius &&
    ergebnis.hautAbwAnteil < 0.005 &&
    gruen.every((g) => g && g.falschGruen === 0 && g.nebenHautAnteil < 0.005),
};
// Auswahl im Raum: V, Rahmen um die beiden Punkte der Flanke, Ziehen, ⌫; dann ⌥ + Ziehen im Leeren dreht die Ansicht
await page.keyboard.press('v');
await warten();
const sa = await schirm(plan.a);
const sb = await schirm(plan.b);
const r0 = [Math.min(sa[0], sb[0]) - 14, Math.min(sa[1], sb[1]) - 14];
const r1 = [Math.max(sa[0], sb[0]) + 14, Math.max(sa[1], sb[1]) + 14];
// der Rahmen beginnt im Leeren
let start = null;
for (const [dx, dy] of [[0, 0], [-4, 0], [0, -4], [-4, -4], [-8, -2], [-2, -8], [-8, -8], [-12, -4], [-4, -12], [-12, -12]]) {
  await hin([r0[0] + dx, r0[1] + dy]);
  if (!(await page.evaluate(() => window.__raum.verhalten.haengt))) {
    start = [r0[0] + dx, r0[1] + dy];
    break;
  }
}
const sollRahmen = await page.evaluate(
  ([a, b]) => {
    const v = window.__raum.verhalten;
    const R = window.__raum.raum;
    return v.netz.punkte.flatMap((p, i) => (p.sichtbar && R.ankerZuSehen(i) && p.x >= a[0] && p.x <= b[0] && p.y >= a[1] && p.y <= b[1] ? [i] : [])).sort((x, y) => x - y);
  },
  [start ?? r0, r1],
);
await page.mouse.down();
await page.mouse.move(r1[0], r1[1], { steps: 14 });
await warten(80);
blick = [(r0[0] + r1[0]) / 2, (r0[1] + r1[1]) / 2];
await bild('6 · Auswahl: Rahmen im Leeren');
await page.mouse.up();
await warten(300);
const gewaehlt = await page.evaluate(() => [...window.__raum.verhalten.auswahl].sort((x, y) => x - y));
await bild('7 · gewählt');
// Ziehen an einem gewählten Punkt
const pa = await page.evaluate((i) => window.__raum.verhalten.netz.punkte[i], gewaehlt[gewaehlt.length - 1]);
const vorher = await page.evaluate((ids) => ids.map((i) => { const p = window.__raum.verhalten.netz.punkte[i]; return [p.x, p.y]; }), gewaehlt);
await hin([pa.x, pa.y]);
await page.mouse.down();
await warten(40);
const weg = [12, -8];
await page.mouse.move(pa.x + weg[0], pa.y + weg[1], { steps: 12 });
await warten(80);
await page.mouse.up();
await warten(200);
const nachher = await page.evaluate((ids) => ids.map((i) => { const p = window.__raum.verhalten.netz.punkte[i]; return [p.x, p.y]; }), gewaehlt);
const zugAbw = nachher.map((q, i) => Math.hypot(q[0] - vorher[i][0] - weg[0], q[1] - vorher[i][1] - weg[1]));
await bild('8 · zusammen gezogen');
const geteiltVor = await page.evaluate((ids) => {
  const R = window.__raum.raum;
  return ids.filter((a) => R.linien.filter((l) => l.anker.includes(a)).length >= 2);
}, gewaehlt);
await page.keyboard.press('Backspace');
await page.evaluate(() => window.__raum.vorspulen(500));
await bild('9 · ⌫: gelöscht, der Ring bleibt geschlossen, die Kreuzung bleibt');
const ringNach = await page.evaluate((geteilt) => {
  const R = window.__raum.raum;
  const v = window.__raum.verhalten;
  const l = R.linien.find((q) => q.aufHaut);
  return l ? { zu: l.zu, anker: l.anker.length, geteiltBleiben: geteilt.every((a) => l.anker.includes(a) && v.auswahl.has(a)), geteilt: geteilt.length } : null;
}, geteiltVor);
// ⌥ + Ziehen im Leeren dreht die Ansicht
const gier0 = await page.evaluate(() => window.__raum.raum.gier.ziel);
await hin([B - 60, 60]);
await page.keyboard.down('Alt');
await page.mouse.down();
await page.mouse.move(B - 160, 80, { steps: 10 });
await page.mouse.up();
await page.keyboard.up('Alt');
await warten(200);
const gier1 = await page.evaluate(() => window.__raum.raum.gier.ziel);
aus.kriterien.auswahl = {
  rahmenSoll: sollRahmen,
  gewaehlt,
  rahmenGenau: JSON.stringify(sollRahmen) === JSON.stringify(gewaehlt),
  zugAbweichungPx: zugAbw.map((d) => +d.toFixed(3)),
  ringNachLoeschen: ringNach,
  altDreht: +(gier1 - gier0).toFixed(4),
  bestanden: JSON.stringify(sollRahmen) === JSON.stringify(gewaehlt) && zugAbw[0] < 0.01 && Math.max(...zugAbw) < 1.5 && !!ringNach && ringNach.zu && ringNach.geteiltBleiben && Math.abs(gier1 - gier0) > 0.1,
};
aus.fehler = fehler;
console.log(JSON.stringify(aus, null, 1));

if (bildPfad) {
  const f = 1.6;
  const html = `<html><body style="margin:0;background:#fff;font:13px -apple-system,Helvetica,sans-serif;color:#1f1a17">
<div style="display:grid;grid-template-columns:repeat(3,${KB * f}px);gap:16px 12px;padding:14px">${bilder
    .map((t) => `<figure style="margin:0"><img src="data:image/png;base64,${t.bild}" style="width:${KB * f}px;height:${KH * f}px;border:1px solid #e4e0da;display:block"><figcaption style="margin-top:6px">${t.titel}</figcaption></figure>`)
    .join('')}</div></body></html>`;
  const p2 = await browser.newPage({ viewport: { width: 3 * KB * f + 2 * 12 + 28, height: 900 }, deviceScaleFactor: 2 });
  await p2.setContent(html);
  await p2.screenshot({ path: bildPfad, fullPage: true });
}
await browser.close();
