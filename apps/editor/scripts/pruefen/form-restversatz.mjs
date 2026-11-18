// Form zuerst (06.11.2026), Florians Frage: Nach mehrfachem Hin- und Herziehen entstehen zwischen zwei Punkten Biegungen, die
// sich mit den Griffen nicht glätten lassen. Gemessen: Restversatz = Abstand der Linie (Proben auf der Haut) zu ihrem Bézier-Pfad
// (Punkte + gespeicherte Griffe) je Loop, und der Winkel zwischen Griff und Linie an den sichtbaren Punkten.
// Aufruf aus apps/editor: node scripts/pruefen/form-restversatz.mjs (KURVEN_URL für ?verdichten=0 usw., RUNDEN)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const runden = Number(process.env.RUNDEN ?? 3);
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 40) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(1500);
};

await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -200, y: 0, z: 0 })), xy(await bild('seite', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 10, y: 200, z: 0 })), xy(await bild('seite', { x: 10, y: -200, z: 0 })), 6);
await seite.keyboard.press('Escape');

/** je Loop: größter Abstand Linie ↔ Pfad, Ort; Winkel Griff ↔ Linie an sichtbaren Punkten (Sehne bis t ≈ 0,15) */
const versatz = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const out = [];
    const bern = (t) => [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3];
    for (const l of k.loops()) {
      if (!l.pfad) continue;
      const P = l.punkte;
      const m = P.length;
      const zu = l.art !== 'ring';
      const st = zu
        ? P.map((p, i) => ({ a: i, b: (i + 1) % m, s0: p.s, s1: i + 1 < m ? P[i + 1].s : P[0].s + l.laenge }))
        : P.slice(0, -1).map((p, i) => ({ a: i, b: i + 1, s0: p.s, s1: P[i + 1].s }));
      const R = l.ruhe;
      const n = l.s.length;
      const pfad = (q, t) => {
        const a = P[q.a];
        const b = P[q.b];
        const [b0, b1, b2, b3] = bern(t);
        const f = (c) => (b0 + b1) * a.ref[c] + b1 * a.aus[c] + b2 * b.ein[c] + (b2 + b3) * b.ref[c];
        return [f('x'), f('y'), f('z')];
      };
      let max = 0;
      let wo = null;
      let winkel = 0;
      let geo = 0;
      let woGeo = null;
      for (const q of st) {
        const a = P[q.a];
        const b = P[q.b];
        if (!a.aus || !b.ein) continue;
        const h = q.s1 - q.s0;
        if (!(h > 1e-9)) continue;
        let nahA = null;
        let nahB = null;
        for (let j = 0; j < n; j++) {
          const x = zu && l.s[j] < q.s0 ? l.s[j] + l.laenge : l.s[j];
          if (x <= q.s0 + 1e-9 || x >= q.s1 - 1e-9) continue;
          const t = (x - q.s0) / h;
          const p = pfad(q, t);
          const d = Math.hypot(R[3 * j] - p[0], R[3 * j + 1] - p[1], R[3 * j + 2] - p[2]);
          let g = Infinity;
          for (let u = 0; u <= 400; u++) {
            const c = pfad(q, u / 400);
            g = Math.min(g, Math.hypot(R[3 * j] - c[0], R[3 * j + 1] - c[1], R[3 * j + 2] - c[2]));
          }
          if (g > geo) {
            geo = g;
            woGeo = { x: R[3 * j], y: R[3 * j + 1], z: R[3 * j + 2] };
          }
          if (d > max) {
            max = d;
            wo = { x: R[3 * j], y: R[3 * j + 1], z: R[3 * j + 2], t, punkte: [q.a, q.b] };
          }
          if (Math.abs(t - 0.15) < Math.abs((nahA?.t ?? 9) - 0.15)) nahA = { j, t, p };
          if (Math.abs(t - 0.85) < Math.abs((nahB?.t ?? 9) - 0.85)) nahB = { j, t, p };
        }
        const w = (anker, z) => {
          if (!z) return 0;
          const u = [R[3 * z.j] - anker.x, R[3 * z.j + 1] - anker.y, R[3 * z.j + 2] - anker.z];
          const v = [z.p[0] - anker.x, z.p[1] - anker.y, z.p[2] - anker.z];
          const c = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
          return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
        };
        if (a.sichtbar !== false) winkel = Math.max(winkel, w(a.ref, nahA));
        if (b.sichtbar !== false) winkel = Math.max(winkel, w(b.ref, nahB));
      }
      out.push({ id: l.id, art: l.art, max, wo, winkel, geo, woGeo, proben: n, punkte: m });
    }
    return out;
  });
const zeile = (v) =>
  v
    .map((l) => `${l.art}#${l.id} gleiche Stelle ${l.max.toFixed(2)}, neben der Kurve ${l.geo.toFixed(2)}${l.woGeo ? ` bei (${l.woGeo.x.toFixed(0)}, ${l.woGeo.y.toFixed(0)}, ${l.woGeo.z.toFixed(0)})` : ''}, Griff ↔ Linie ${l.winkel.toFixed(1)}°`)
    .join(' · ');
console.log(`angelegt: ${zeile(await versatz())}`);

const loops = () => K('loops');
const mitte = (await loops()).find((l) => l.art === 'mitte');
const oben = mitte.punkte.filter((p) => p.sichtbar !== false).reduce((b, p) => (p.ref.y > b.ref.y ? p : b));
const p0 = { ...oben.ref };
const finde = async (sOderKreuzung) => {
  const m = (await loops()).find((l) => l.art === 'mitte');
  return m.punkte.find((p) => (typeof sOderKreuzung === 'number' ? Math.abs(p.s - sOderKreuzung) < 1e-6 : p.kreuzung === sOderKreuzung.k))?.ref;
};
const orte = [
  { x: p0.x + 110, y: p0.y + 40 },
  { x: p0.x - 120, y: p0.y + 90 },
  { x: p0.x + 60, y: p0.y - 50 },
];
for (const o of orte) {
  await ziehen(xy(await bild('seite', await finde({ k: oben.kreuzung }))), xy(await bild('seite', { ...p0, ...o })));
  console.log(`oben nach (${(o.x - p0.x).toFixed(0)}, ${(o.y - p0.y).toFixed(0)}): ${zeile(await versatz())}`);
}
await ziehen(xy(await bild('seite', await finde({ k: oben.kreuzung }))), xy(await bild('seite', p0)));
console.log(`oben wieder am Anfang: ${zeile(await versatz())}`);
for (let r = 1; r <= runden; r++) {
  await ziehen(xy(await bild('seite', await finde({ k: oben.kreuzung }))), xy(await bild('seite', { ...p0, y: p0.y + 120 })));
  console.log(`oben +120 (${r}): ${zeile(await versatz())}`);
  await ziehen(xy(await bild('seite', await finde({ k: oben.kreuzung }))), xy(await bild('seite', p0)));
  const p = await finde({ k: oben.kreuzung });
  console.log(`oben zurück (${r}, Punkt ${Math.hypot(p.x - p0.x, p.y - p0.y).toFixed(2)} daneben): ${zeile(await versatz())}`);
}

// neuer Punkt bei 135°, mehrfach an verschiedene Orte
const w = (135 * Math.PI) / 180;
const q0 = { x: 150 * Math.cos(w), y: 150 * Math.sin(w), z: 0 };
await seite.mouse.click(...xy(await bild('seite', q0)));
await seite.waitForTimeout(450);
await seite.mouse.dblclick(...xy(await bild('seite', q0)));
await seite.waitForTimeout(450);
await seite.keyboard.press('Escape');
const neu = (await loops()).find((l) => l.art === 'mitte').punkte.reduce((b, p) => (Math.hypot(p.ref.x - q0.x, p.ref.y - q0.y) < Math.hypot(b.ref.x - q0.x, b.ref.y - q0.y) ? p : b));
console.log(`neuer Punkt: ${zeile(await versatz())}`);
const sNeu = neu.s;
const ziele = [
  { x: q0.x - 70, y: q0.y + 70 },
  { x: q0.x - 30, y: q0.y + 110 },
  { x: q0.x - 90, y: q0.y + 20 },
  { x: q0.x, y: q0.y },
];
for (let r = 1; r <= runden; r++)
  for (const [i, z] of ziele.entries()) {
    const von = await finde(sNeu);
    if (!von) {
      console.log('Punkt nicht gefunden');
      break;
    }
    await ziehen(xy(await bild('seite', von)), xy(await bild('seite', { ...z, z: 0 })));
    if (i === ziele.length - 1) console.log(`neuer Punkt, Runde ${r} zurück: ${zeile(await versatz())}`);
  }
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler im Fenster');
await browser.close();
