// Probe Werkzeug P (Florian, 15.11.): ohne P nur die Schwellung, mit P Tropfen und Punkt setzen, Linie unverändert, Zurück.
// Aufruf aus apps/editor, Server auf 5199: node scripts/linien/stift-probe.mjs
import { chromium } from '@playwright/test';
const URL = 'http://localhost:5199';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 2 });
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto(`${URL}/linien.html`);
await page.waitForFunction(() => window.__linien);
const r2 = await page.evaluate(() => {
  const L = window.__linien;
  const v = L.verhalten;
  const a = L.ansicht;
  // eine Stelle auf einer Linie weit weg von allen Punkten
  let best = null;
  v.proben.forEach((P, li) => {
    for (let k = 0; k < P.n; k += 3) {
      if (P.schicht[k]) continue;
      let d = Infinity;
      for (const p of v.netz.punkte) if (p.sichtbar) d = Math.min(d, Math.hypot(p.x - P.x[k], p.y - P.y[k]));
      if (!best || d > best.d) best = { li, k, d, x: P.x[k], y: P.y[k] };
    }
  });
  const sx = best.x * a.z + a.ox;
  const sy = best.y * a.z + a.oy;
  const zustand = () => {
    const t = v.tropfen.find((q) => q.zustand !== 'zurueck');
    return t ? { art: t.ziel.art, r: +t.r.x.toFixed(3), hals: +t.hals.x.toFixed(3), schwell: +v.schwell[best.li].st.x.toFixed(3) } : { art: null, schwell: +v.schwell[best.li].st.x.toFixed(3) };
  };
  const out = { stelle: best };
  // ohne P: nur die Schwellung
  L.zeigerHin(sx + 1, sy + 1, 16);
  L.vorspulen(700);
  out.ohneP = zustand();
  // ohne P greifen und ziehen: die Linie geht mit, kein Tropfen
  const n0 = v.netz.punkte.length;
  v.druecken();
  L.zeigerHin(sx + 1 + 12, sy + 1 + 6, 16);
  L.vorspulen(300);
  out.ohnePgezogen = { ...zustand(), punkte: v.netz.punkte.length - n0 };
  v.loslassen();
  v.rueckgaengig();
  L.zeigerHin(sx + 1, sy + 1, 16);
  L.vorspulen(700);
  // mit P: Tropfen
  v.stift = true;
  L.vorspulen(700);
  out.mitP = zustand();
  // Linie vorher (Proben), dann Punkt setzen
  const P0 = v.proben[best.li];
  const vorher = Array.from({ length: P0.n }, (_, k) => [P0.x[k], P0.y[k]]);
  const stuecke0 = v.netz.linien[best.li].stuecke.length;
  v.druecken();
  const P1 = v.proben[best.li];
  let abw = 0;
  for (let k = 0; k < P1.n; k++) {
    let d = Infinity;
    for (let j = 0; j + 1 < vorher.length; j++) {
      const [ax, ay] = vorher[j];
      const [bx, by] = vorher[j + 1];
      const ux = bx - ax, uy = by - ay;
      const t = Math.max(0, Math.min(1, ((P1.x[k] - ax) * ux + (P1.y[k] - ay) * uy) / (ux * ux + uy * uy || 1)));
      d = Math.min(d, Math.hypot(P1.x[k] - ax - ux * t, P1.y[k] - ay - uy * t));
    }
    abw = Math.max(abw, d);
  }
  const pi = v.netz.punkte.length - 1;
  const p0 = { ...v.netz.punkte[pi] };
  out.gesetzt = { punkteDazu: v.netz.punkte.length - n0, stueckeDazu: v.netz.linien[best.li].stuecke.length - stuecke0, abweichungLinie: +abw.toFixed(4), tropfen: zustand() };
  // gleich weiterziehen: der neue Punkt folgt genau
  L.zeigerHin(sx + 1 + 10, sy + 1 - 8, 16);
  L.vorspulen(400);
  const p1 = v.netz.punkte[pi];
  out.gezogen = { dx: +((p1.x - p0.x) * a.z).toFixed(3), dy: +((p1.y - p0.y) * a.z).toFixed(3), soll: [10, -8] };
  v.loslassen();
  L.vorspulen(300);
  v.rueckgaengig();
  out.zurueck = { punkte: v.netz.punkte.length - n0, stuecke: v.netz.linien[best.li].stuecke.length - stuecke0 };
  L.vorspulen(300);
  return out;
});
console.log('2D', JSON.stringify(r2, null, 1));
// 3D
await page.goto(`${URL}/raum.html`);
await page.waitForFunction(() => window.__raum && window.__raum.verhalten.netz.punkte.length > 0);
await page.waitForTimeout(300);
const r3 = await page.evaluate(() => {
  const R = window.__raum;
  const v = R.verhalten;
  R.vorspulen(1500);
  let best = null;
  v.proben.forEach((P, li) => {
    for (let k = 0; k < P.n; k += 3) {
      let d = Infinity;
      for (const p of v.netz.punkte) if (p.sichtbar) d = Math.min(d, Math.hypot(p.x - P.x[k], p.y - P.y[k]));
      // vorn liegend: kleine Tiefe
      const g = d - 0.02 * (P.z?.[k] ?? 0);
      // eine Linie mit Spiegelbild (nicht die Linie auf der Mitte), damit auch das Spiegelbild einen Punkt bekommt
      if (d > 25 && R.raum.zwilling(li, P.si[k]) && (!best || g > best.g)) best = { li, k, d, g, x: P.x[k], y: P.y[k] };
    }
  });
  const out = { stelle: { li: best.li, d: +best.d.toFixed(1) } };
  const a0 = R.raum.ankerSichtbar.length;
  const s0 = R.raum.linien.map((l) => l.stuecke.length).reduce((x, y) => x + y, 0);
  R.zeigerHin(best.x + 1, best.y + 1, 16);
  R.vorspulen(700);
  const t0 = v.tropfen.find((q) => q.zustand !== 'zurueck');
  out.ohneP = t0 ? { art: t0.ziel.art, r: +t0.r.x.toFixed(3) } : null;
  v.stift = true;
  R.vorspulen(700);
  const t1 = v.tropfen.find((q) => q.zustand !== 'zurueck');
  out.mitP = t1 ? { art: t1.ziel.art, r: +t1.r.x.toFixed(3) } : null;
  v.druecken();
  R.vorspulen(100);
  const a1 = R.raum.ankerSichtbar.length;
  const s1 = R.raum.linien.map((l) => l.stuecke.length).reduce((x, y) => x + y, 0);
  out.gesetzt = { ankerDazu: a1 - a0, stueckeDazu: s1 - s0, tropfen: v.tropfen.find((q) => q.zustand === 'gegriffen')?.ziel };
  // Spiegelgleich: der neue Anker und sein Spiegelbild
  const A = R.raum.anker;
  if (a1 - a0 === 2) out.spiegel = [0, 1, 2].map((c) => +(A[(a0) * 3 + c] - (c === 2 ? -1 : 1) * A[(a0 + 1) * 3 + c]).toExponential(2));
  v.loslassen();
  R.vorspulen(100);
  v.rueckgaengig();
  R.vorspulen(100);
  out.zurueck = { anker: R.raum.ankerSichtbar.length - a0, stuecke: R.raum.linien.map((l) => l.stuecke.length).reduce((x, y) => x + y, 0) - s0 };
  return out;
});
console.log('3D', JSON.stringify(r3, null, 1));
console.log('Fehler', fehler);
await browser.close();
