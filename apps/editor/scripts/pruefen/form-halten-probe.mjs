// Plan vom 12.11.2026, Anhang A.3, „B als Schalter im Bau-Fenster“ (13.11.): die festgelegte Probe im Fenster.
// Eine gesicherte Form laden und am höchsten Punkt (am „strange bird“ die Hornspitze) greifen und ziehen wie mit der Maus:
//   1  greifen, ohne zu ziehen: wie weit bewegt sich die Haut?
//   2  den Punkt hinauf, halten, zurück, halten (ohne loszulassen): wie weit liegt die Haut neben der von vorher? Abstand der Bilder
//   3  noch einmal hinauf und loslassen: wie weit bewegt sich die Haut nach dem Loslassen noch?
// Aufruf aus apps/editor: GPU=1 NAME="teat firefish" node scripts/pruefen/form-halten-probe.mjs
//   HALTEN=1|0 (Schalter „Form halten“, Standard 1)   ZUG="0,70,0"   SCHRITTE=40   PAUSE=16   ZOOM=0.6
//   KURVEN_URL (Standard http://localhost:5197/kurven.html?gewichte=geometrie)   BILD=<pfad ohne Endung>
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5197/kurven.html?gewichte=geometrie';
const NAME = process.env.NAME ?? 'teat firefish';
const AN = process.env.HALTEN !== '0';
const [zx, zy, zz] = (process.env.ZUG ?? '0,70,0').split(',').map(Number);
const SCHRITTE = Number(process.env.SCHRITTE ?? 40);
const PAUSE = Number(process.env.PAUSE ?? 16);
const ZOOM = Number(process.env.ZOOM ?? 0.6);
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(300);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhig = (ms = 180000) => seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: ms });
const z2 = (x) => x.toFixed(2).replace('.', ',');

await K('halten', AN);
const text = await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
if (!text.startsWith('geladen')) {
  console.log(text);
  await browser.close();
  process.exit(1);
}
await seite.waitForTimeout(150);
await ruhig();
// (die Uhr zum Vorbereiten läuft 30 ms nach jeder Änderung an)
await seite.waitForTimeout(250);
await ruhig();
const vorbereitet = (await K('zeiten')).halten;
console.log(`${NAME}, Form halten ${AN ? 'an' : 'aus'}: ${text.slice(0, 90)} · ${(await K('zeiten')).punkte} Punkte${AN ? ` · Löser bereit: ${vorbereitet.bereit ? 'ja' : 'NEIN'} (Vorbereiten ${vorbereitet.bereiten} ms)` : ''}`);

// der höchste sichtbare Punkt
const L = await K('loops');
let p = null;
for (const l of L)
  l.punkte.forEach((q, i) => {
    if (q.sichtbar === false) return;
    if (!p || q.ref.y > p.ref.y) p = { l: l.id, i, ref: q.ref };
  });
const uv = (q) => [q.x, -q.y];
const ziel = { x: p.ref.x + zx, y: p.ref.y + zy, z: p.ref.z + zz };
await K('ausschnitt', 'seite', { cx: (uv(p.ref)[0] + uv(ziel)[0]) / 2, cy: (uv(p.ref)[1] + uv(ziel)[1]) / 2, zoom: ZOOM });
await seite.waitForTimeout(200);
const von = await K('bild', 'seite', p.ref);
const nach = await K('bild', 'seite', ziel);

/** die Haut von jetzt merken (im Fenster) bzw. den größten Weg jedes Punkts gegen die gemerkte messen (null: andere Punktzahl) */
const merken = (name) =>
  seite.evaluate((n) => {
    (window.__gemerkt ??= {})[n] = Float64Array.from(window.__kurven.roh().pos);
  }, name);
const weg = (name) =>
  seite.evaluate((n) => {
    const a = window.__gemerkt[n];
    const b = window.__kurven.roh().pos;
    // nach dem Verdichten stehen die Punkte, die bleiben, vorn in ihrer Reihenfolge (solange keiner zusammengelegt wurde)
    const m = Math.min(a.length, b.length);
    let w = 0;
    let s = 0;
    for (let i = 0; i < m; i += 3) {
      const d = Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]);
      s += d;
      if (d > w) w = d;
    }
    return { max: w, mittel: s / (m / 3), vorher: a.length / 3, jetzt: b.length / 3 };
  }, name);
const mitlesen = () =>
  seite.evaluate(() => {
    const m = { bilder: [], laeuft: true };
    window.__mitlesen = m;
    let letzte = performance.now();
    const bild = () => {
      const jetzt = performance.now();
      m.bilder.push(jetzt - letzte);
      letzte = jetzt;
      if (m.laeuft) requestAnimationFrame(bild);
    };
    requestAnimationFrame(bild);
  });
const gelesen = () =>
  seite.evaluate(() => {
    window.__mitlesen.laeuft = false;
    return window.__mitlesen.bilder.slice(2);
  });
const ziehen = async (a, b) => {
  for (let i = 1; i <= SCHRITTE; i++) {
    await seite.mouse.move(a.x + ((b.x - a.x) * i) / SCHRITTE, a.y + ((b.y - a.y) * i) / SCHRITTE);
    await seite.waitForTimeout(PAUSE);
  }
};
const quantil = (liste, f) => {
  const s = [...liste].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : NaN;
};

/** die Haut von jetzt als Fläche holen (Lagen und Dreiecke) */
const flaeche = () =>
  seite.evaluate(() => {
    const r = window.__kurven.roh();
    return { pos: Array.from(r.pos), tri: Array.from(r.tri) };
  });
/** Abstand eines Punkts zu einem Dreieck (Ericson, Real-Time Collision Detection 5.1.5) */
function punktDreieck(p, a, b, c) {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const q = (x) => Math.hypot(p[0] - x[0], p[1] - x[1], p[2] - x[2]);
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return q(a);
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return q(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return q([a[0] + (d1 / (d1 - d3)) * ab[0], a[1] + (d1 / (d1 - d3)) * ab[1], a[2] + (d1 / (d1 - d3)) * ab[2]]);
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return q(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return q([a[0] + (d2 / (d2 - d6)) * ac[0], a[1] + (d2 / (d2 - d6)) * ac[1], a[2] + (d2 / (d2 - d6)) * ac[2]]);
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return q([b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]);
  }
  const de = 1 / (va + vb + vc);
  const v = vb * de;
  const w = vc * de;
  return q([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}
/** Abstand der Punkte von `von` zur Fläche `zu` (Gitter über die Dreiecke, Zelle 30; gesucht wird bis zwei Zellen weit): Mittel, größter */
function abstandZurFlaeche(von, zu) {
  const Z = 30;
  const gitter = new Map();
  const P = zu.pos;
  const ecke = (i) => [P[3 * i], P[3 * i + 1], P[3 * i + 2]];
  for (let t = 0; t < zu.tri.length; t += 3) {
    const [a, b, c] = [ecke(zu.tri[t]), ecke(zu.tri[t + 1]), ecke(zu.tri[t + 2])];
    const lo = [0, 1, 2].map((k) => Math.floor(Math.min(a[k], b[k], c[k]) / Z));
    const hi = [0, 1, 2].map((k) => Math.floor(Math.max(a[k], b[k], c[k]) / Z));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const key = `${x},${y},${z}`;
      const l = gitter.get(key);
      if (l) l.push(t);
      else gitter.set(key, [t]);
    }
  }
  let max = 0;
  let summe = 0;
  let n = 0;
  for (let i = 0; i < von.pos.length; i += 3) {
    const p = [von.pos[i], von.pos[i + 1], von.pos[i + 2]];
    const g = p.map((v) => Math.floor(v / Z));
    let best = Infinity;
    for (let r = 0; r <= 2 && best > (r - 0.01) * Z; r++)
      for (let x = g[0] - r; x <= g[0] + r; x++) for (let y = g[1] - r; y <= g[1] + r; y++) for (let z = g[2] - r; z <= g[2] + r; z++) {
        if (Math.max(Math.abs(x - g[0]), Math.abs(y - g[1]), Math.abs(z - g[2])) !== r) continue;
        const l = gitter.get(`${x},${y},${z}`);
        if (!l) continue;
        for (const t of l) best = Math.min(best, punktDreieck(p, ecke(zu.tri[t]), ecke(zu.tri[t + 1]), ecke(zu.tri[t + 2])));
      }
    if (!Number.isFinite(best)) best = 2 * Z;
    max = Math.max(max, best);
    summe += best;
    n++;
  }
  return { max, mittel: summe / n };
}

// 1  greifen, ohne zu ziehen
await merken('anfang');
await seite.mouse.move(von.x, von.y);
await seite.waitForTimeout(100);
await seite.mouse.down();
await seite.waitForTimeout(400);
await seite.mouse.up();
await seite.waitForTimeout(200);
await ruhig();
const w1 = await weg('anfang');
console.log(`  1  gegriffen, nicht gezogen: Haut bewegt sich um höchstens ${z2(w1.max)} (Mittel ${z2(w1.mittel)})`);

// 2  hinauf, halten, zurück, halten (ohne loszulassen)
await seite.waitForTimeout(300);
await ruhig();
await merken('vorZug');
const tDruck = Date.now();
await seite.mouse.move(von.x, von.y);
await seite.mouse.down();
await mitlesen();
await ziehen(von, nach);
const bilderHin = await gelesen();
await seite.waitForTimeout(500);
if (process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}-${AN ? 'an' : 'aus'}-oben.jpg`, type: 'jpeg', quality: 85 });
const obenOffen = (await K('zeiten')).offen;
await merken('oben');
await mitlesen();
await ziehen(nach, von);
const bilderZurueck = await gelesen();
await seite.waitForTimeout(600);
const w2 = await weg('vorZug');
const zurueckOffen = (await K('zeiten')).offen;
const alle = [...bilderHin, ...bilderZurueck];
console.log(`  2  ${zy} hinauf und zurück, ohne loszulassen: Haut liegt höchstens ${z2(w2.max)} neben der von vorher (Mittel ${z2(w2.mittel)})${zurueckOffen ? ' (rechnet noch)' : ''}`);
console.log(`     Bilder im Zug: ${alle.length}, Abstand Median ${quantil(alle, 0.5).toFixed(0)} ms, 95 % ${quantil(alle, 0.95).toFixed(0)} ms, längster ${Math.max(...alle).toFixed(0)} ms${obenOffen ? ' · oben nach 0,5 s noch nicht in Ruhe' : ''}`);
const zeit2 = (await K('zeiten')).zug.slice(-80);
console.log(`     Rechnen je Bild (letzte 80): Median ${quantil(zeit2, 0.5).toFixed(1)} ms, 95 % ${quantil(zeit2, 0.95).toFixed(1)} ms`);

// 3  noch einmal hinauf und loslassen
await ziehen(von, nach);
await seite.waitForTimeout(500);
await merken('gehalten');
const flGehalten = await flaeche();
await seite.mouse.up();
const tLos = Date.now();
await seite.waitForTimeout(200);
let ruhe = '';
try {
  await ruhig(120000);
} catch {
  ruhe = ' (nach 120 s rechnet noch etwas)';
}
const sek = (Date.now() - tLos) / 1000;
const w3 = await weg('gehalten');
const z = await K('zeiten');
// gegen die Fläche gemessen (das Verdichten ordnet die Punkte um): die Punkte der gehaltenen Haut gegen die Fläche danach
const a3 = abstandZurFlaeche(flGehalten, await flaeche());
console.log(`  3  hinauf und losgelassen: danach liegt die Haut vom Halten höchstens ${z2(a3.max)} neben der Fläche in der Ruhe (Mittel ${z2(a3.mittel)}); Ruhe nach ${sek.toFixed(1)} s${ruhe}; Punkte ${w3.vorher} → ${w3.jetzt}${z.verdichtung ? ` (verdichtet +${z.verdichtung.neu} −${z.verdichtung.gelegt})` : ''}`);
if (AN) console.log(`     Löser für das nächste Greifen bereit: ${z.halten.bereit ? 'ja' : 'NEIN'} (Vorbereiten ${z.halten.bereiten} ms)`);
if (process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}-${AN ? 'an' : 'aus'}-ruhe.jpg`, type: 'jpeg', quality: 85 });
console.log(`     Statuszeile: ${(await seite.evaluate(() => document.getElementById('status').textContent)).slice(0, 140)}`);
console.log(`     Konsole: ${fehler.length ? fehler.slice(0, 3).join(' | ') : 'keine Fehler'}`);
void tDruck;
await browser.close();
