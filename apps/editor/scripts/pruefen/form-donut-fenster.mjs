// Plan vom 12.11.2026, Schritt 4a: der Donut im Bau-Fenster nach Florians zweiter Regel (13.11.), die sichtbare Probe der Etappen 2–4.
// Von der Kugel an: zwei Ringe und die Mittellinie; der Punkt an der Seite (Kreuzung der Ringe) wird in der Front über die Mitte gezogen.
//   lose     an den Kreuzungen der Linien mit der Mitte stehen Punkte, der gezogene Punkt ist markiert, die Statuszeile sagt es
//   zurück   zurückgezogen: keine Punkte an der Mitte mehr, nichts umgeschlagen
//   fest     wieder hinüber und den markierten Punkt löschen: geschnitten, der Rand ein Loop mit Kante und Punkten an den Kreuzungen;
//            wie weit liegt die gezeigte Haut neben der von vorher?
//   rund     K am Rand (Kante aus): Knick quer über den Rand
//   ⌘Z ⌘Z    führt zum losen Stand zurück
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/form-donut-fenster.mjs
//   KURVEN_URL (Standard http://localhost:5197/kurven.html?gewichte=geometrie)   TIEF=190   BILD=<pfad ohne Endung> (drei Bilder)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5197/kurven.html?gewichte=geometrie';
const TIEF = Number(process.env.TIEF ?? 190);
const BILD = process.env.BILD ?? '';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhig = async () => {
  await seite.waitForTimeout(250);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
  await seite.waitForTimeout(120);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const z2 = (x) => x.toFixed(2).replace('.', ',');
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
/** Loop schneiden: im Blatt a von P nach Q (Welt) ziehen */
const schneiden = async (a, P, Q) => {
  await seite.keyboard.press('l');
  const [x, y] = await bild(a, P);
  const [x2, y2] = await bild(a, Q);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x2, y2, { steps: 8 });
  await seite.mouse.up();
  await ruhig();
  await seite.keyboard.press('Escape');
};
/** einen Punkt im Blatt a um `weg` ziehen, halten, loslassen */
const ziehen = async (a, lid, i, weg, zoom = 0.5) => {
  const L = await K('loops');
  const p = L.find((x) => x.id === lid).punkte[i];
  const uv = (q) => (a === 'seite' ? [q.x, -q.y] : a === 'front' ? [q.z, -q.y] : [q.x, q.z]);
  const ziel = { x: p.ref.x + weg[0], y: p.ref.y + weg[1], z: p.ref.z + weg[2] };
  await K('ausschnitt', a, { cx: (uv(p.ref)[0] + uv(ziel)[0]) / 2, cy: (uv(p.ref)[1] + uv(ziel)[1]) / 2, zoom });
  await seite.waitForTimeout(150);
  const [x, y] = await bild(a, p.ref);
  const [x2, y2] = await bild(a, ziel);
  await seite.mouse.move(x, y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (let s = 1; s <= 40; s++) {
    await seite.mouse.move(x + ((x2 - x) * s) / 40, y + ((y2 - y) * s) / 40);
    await seite.waitForTimeout(16);
  }
  await seite.waitForTimeout(300);
  await seite.mouse.up();
  await ruhig();
};
const zaehle = (klasse) => seite.evaluate((k) => document.querySelectorAll(`.blatt ${k}`).length, klasse);
const status = () => seite.evaluate(() => document.querySelector('#status')?.textContent ?? '');
/** der Punkt an der Seite: die Kreuzung zweier Ringe mit dem größten |z| (Loop, Index, Ort) */
const seitenPunkt = async () => {
  const L = await K('loops');
  let p = null;
  for (const l of L) {
    if (l.art !== 'ring') continue;
    l.punkte.forEach((q, i) => {
      if (q.kreuzung === null || q.sichtbar === false) return;
      const andere = L.some((m) => m.id !== l.id && m.art === 'ring' && m.punkte.some((r) => r.kreuzung === q.kreuzung));
      if (andere && (!p || Math.abs(q.ref.z) > Math.abs(p.ref.z))) p = { l: l.id, i, ref: q.ref, kreuzung: q.kreuzung };
    });
  }
  return p;
};
/** die gezeigte Haut (jede Hälfte bis zur Mitte) als Fläche */
const gezeigt = () => K('anzeige');
/** Abstand eines Punkts zu einem Dreieck (Ericson, Real-Time Collision Detection 5.1.5) */
function punktDreieck(p, a, b, c) {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const q = (x) => Math.hypot(p[0] - x[0], p[1] - x[1], p[2] - x[2]);
  const auf = (x, f, d) => q([x[0] + f * d[0], x[1] + f * d[1], x[2] + f * d[2]]);
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
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return auf(a, d1 / (d1 - d3), ab);
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return q(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return auf(a, d2 / (d2 - d6), ac);
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return auf(b, (d4 - d3) / (d4 - d3 + (d5 - d6)), sub(c, b));
  const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return Math.abs(dot(ap, n)) / l;
}
/** wie weit die Punkte der Fläche `neu` neben der Fläche `alt` liegen (größter Abstand, Mittel) */
function neben(neu, alt) {
  if (!neu.lagen.every(Number.isFinite) || !alt.lagen.every(Number.isFinite)) return { max: NaN, mittel: NaN };
  const P = (L, i) => [L[3 * i], L[3 * i + 1], L[3 * i + 2]];
  const drei = [];
  for (let t = 0; t + 2 < alt.dreiecke.length; t += 3) {
    const [a, b, c] = [P(alt.lagen, alt.dreiecke[t]), P(alt.lagen, alt.dreiecke[t + 1]), P(alt.lagen, alt.dreiecke[t + 2])];
    // (die Anzeige legt abgeschnittene Dreiecke zusammen: ohne Fläche zählen sie nicht)
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-9 || Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) < 1e-9) continue;
    drei.push([a, b, c]);
  }
  const benutzt = new Set(neu.dreiecke);
  let max = 0;
  let summe = 0;
  let zahl = 0;
  for (const v of benutzt) {
    const p = P(neu.lagen, v);
    let d = Infinity;
    for (const [a, b, c] of drei) {
      // grob vorab: weiter als der beste Abstand von einer Ecke entfernt und das Dreieck klein
      const g = Math.abs(p[0] - a[0]) + Math.abs(p[1] - a[1]) + Math.abs(p[2] - a[2]);
      if (g > d + 120) continue;
      d = Math.min(d, punktDreieck(p, a, b, c));
    }
    max = Math.max(max, d);
    summe += d;
    zahl++;
  }
  return { max, mittel: zahl ? summe / zahl : 0 };
}
const mittel = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const foto = async (name) => {
  if (!BILD) return;
  await K('kamera', { x: 330, y: 250, z: 640 }, { x: 0, y: 0, z: 0 });
  for (const a of ['seite', 'front', 'top']) await K('ausschnitt', a, { cx: 0, cy: 0, zoom: 1 });
  await seite.waitForTimeout(400);
  await seite.screenshot({ path: `${BILD}-${name}.png` });
};

// ---------- von der Kugel an: zwei Ringe und die Mittellinie ----------
await schneiden('seite', { x: -200, y: 0, z: 0 }, { x: 200, y: 0, z: 0 });
await schneiden('front', { x: 0, y: 200, z: 0 }, { x: 0, y: -200, z: 0 });
await schneiden('seite', { x: 10, y: 200, z: 0 }, { x: 10, y: -200, z: 0 });
let L = await K('loops');
ok('drei Loops', L.length === 3 && L.filter((l) => l.art === 'ring').length === 2 && L.some((l) => l.art === 'mitte') && L.every((l) => l.eingesetzt), L.map((l) => `${l.id} ${l.art}`).join(', '));
ok('vorher nichts an der Mitte', (await zaehle('.mitte-kreuz')) === 0 && (await zaehle('.kpunkt.hinter')) === 0);

// ---------- lose: der Punkt an der Seite über die Mitte ----------
let p = await seitenPunkt();
const richtung = p.ref.z > 0 ? -1 : 1;
await ziehen('front', p.l, p.i, [0, 0, richtung * TIEF]);
const kreuze = await zaehle('.mitte-kreuz');
const markiert = await zaehle('.kpunkt.hinter');
const st = await status();
ok('lose: Punkte an den Kreuzungen mit der Mitte', kreuze === 12, `${kreuze} in den drei Blättern (je Blatt vier)`);
ok('lose: der gezogene Punkt ist markiert', markiert > 0 && st.includes('hinter der Mitte'), `${markiert} markierte Punkte gezeichnet; Status: „${st.slice(0, 70)}…“`);
ok('lose: nichts umgeschlagen', (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6);
await foto('lose');

// ---------- zurück ----------
p = await seitenPunkt();
await ziehen('front', p.l, p.i, [0, 0, -richtung * TIEF]);
ok('zurückgezogen: keine Punkte an der Mitte, kein Punkt markiert', (await zaehle('.mitte-kreuz')) === 0 && (await zaehle('.kpunkt.hinter')) === 0 && !(await status()).includes('hinter der Mitte'));
ok('zurückgezogen: nichts umgeschlagen', (await K('umgeschlagen')) === 0);

// ---------- fest: wieder hinüber, den markierten Punkt löschen ----------
p = await seitenPunkt();
await ziehen('front', p.l, p.i, [0, 0, richtung * TIEF]);
const gewaehlt = await K('auswahl');
p = await seitenPunkt();
L = await K('loops');
// (die Kreuzung ist ein Punkt beider Ringe: gewählt ist der des Rings, an dem gegriffen wurde)
ok('der gezogene Punkt ist gewählt', gewaehlt.some((w) => w.i >= 0 && L.find((l) => l.id === w.l)?.punkte[w.i]?.kreuzung === p.kreuzung), JSON.stringify(gewaehlt));
await foto('vor-dem-loeschen');
const vorher = await gezeigt();
const punkteVorher = (await K('zeiten')).punkte;
await seite.keyboard.press('Backspace');
await seite.waitForTimeout(60);
const gleichDanach = await gezeigt();
const sprung = neben(gleichDanach, vorher);
await ruhig();
const danach = await gezeigt();
const gesetzt = neben(danach, vorher);
L = await K('loops');
const rand = L.find((l) => l.art === 'mitte' && l.kante === true);
ok('fest: Meldung', (await K('meldung')).includes('fest'), await K('meldung'));
ok('fest: vier Linienstücke, zwei Loops der Mitte', L.filter((l) => l.art === 'ring').length === 4 && L.filter((l) => l.art === 'mitte').length === 2, L.map((l) => `${l.id} ${l.art}${l.kante ? ' Kante' : ''}`).join(', '));
ok('fest: der Rand ist ein Loop mit Kante und vier Punkten an den Kreuzungen', !!rand && rand.punkte.length === 4 && rand.punkte.every((q) => q.kreuzung !== null) && rand.eingesetzt, rand ? `Loop ${rand.id}, ${rand.punkte.length} Punkte` : 'kein Rand');
ok('fest: nichts mehr lose', (await zaehle('.mitte-kreuz')) === 0 && (await zaehle('.kpunkt.hinter')) === 0);
ok('fest: der Rand ist gewählt', (await K('auswahl')).some((w) => rand && w.l === rand.id && w.i < 0));
ok('fest: nichts umgeschlagen, spiegelgleich', (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6, `umgeschlagen ${await K('umgeschlagen')}, Symmetrie ${(await K('symmetrie')).toExponential(1)}`);
const knickFest = rand ? await K('knick', rand.id) : [];
console.log(`     die gezeigte Haut liegt gleich nach dem Löschen höchstens ${z2(sprung.max)} (im Mittel ${z2(sprung.mittel)}) neben der von vorher, nach dem Setzen ${z2(gesetzt.max)} (im Mittel ${z2(gesetzt.mittel)}); ${punkteVorher} → ${(await K('zeiten')).punkte} Punkte; Knick quer über den Rand im Mittel ${z1(mittel(knickFest))}°, größter ${z1(Math.max(0, ...knickFest))}°`);
ok('fest: die Haut bleibt, wo sie gezeigt war', gesetzt.max < 12 && Number.isFinite(gesetzt.max), `höchstens ${z2(gesetzt.max)}`);
await foto('fest');

// ---------- rund: Kante aus am Rand ----------
await seite.keyboard.press('k');
await ruhig();
L = await K('loops');
const rund = L.find((l) => rand && l.id === rand.id);
const knickRund = rund ? await K('knick', rund.id) : [];
ok('rund: Kante aus', !!rund && rund.kante !== true && (await K('meldung')).includes('keine Kante'), await K('meldung'));
ok('rund: der Rand ist glatt', knickRund.length > 0 && mittel(knickRund) < 0.5 * mittel(knickFest), `Knick quer über den Rand im Mittel ${z1(mittel(knickRund))}°, größter ${z1(Math.max(0, ...knickRund))}° (mit Kante ${z1(mittel(knickFest))}°)`);
ok('rund: nichts umgeschlagen, spiegelgleich', (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6);
await foto('rund');
// und wieder an: kantig
await seite.keyboard.press('k');
await ruhig();
const knickWieder = rund ? await K('knick', rund.id) : [];
ok('Kante wieder an: kantig', mittel(knickWieder) > 1.5 * mittel(knickRund), `Knick im Mittel ${z1(mittel(knickWieder))}°`);

// ---------- ⌘Z führt zurück (Kante an, Kante aus, fest) ----------
for (let i = 0; i < 3; i++) {
  await seite.keyboard.press('Meta+z');
  await ruhig();
}
L = await K('loops');
ok('⌘Z: wieder lose', L.length === 3 && (await zaehle('.mitte-kreuz')) === 12 && (await zaehle('.kpunkt.hinter')) > 0, `${L.length} Loops`);

ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} Punkte FEHLEN` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
