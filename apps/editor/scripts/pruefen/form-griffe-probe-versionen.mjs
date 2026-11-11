// Form zuerst (11.11.2026): Griffe drehen, verdrehen und zurückdrehen – so gemessen, dass es auf jedem Stand von kurven.html seit dem
// 05.11. läuft (nur die alten Haken: loops, griffe, bild, ausschnitt, lagen, dreiecke, meldung). Anlass: Florian nach dem Schritt
// „Stabilität an der Spiegelachse“: „Die aktuelle Lösung trägt nicht und auch wenn ich andere Griffe ziehe, sehe ich, wie das Mesh
// lange nachwobbelt, es gibt komische Wölbungen, und es reißt/verdreht sich. Auch dass ich nicht einfach den Handle wieder
// zurückdrehen kann … Ich weiß, dass in einigen Versionen vor dieser Session Schleifen einfach schwarze Löcher waren und diese dann
// … bei erneutem Zurückdrehen einfach verschwanden, ohne das Mesh zu beschädigen.“
//
// FORM=kugel-a   von der Kugel an, Florians Reihenfolge: zwei Loops rundum, der Loop auf einer Seite (dreimal hinausgezogen), dann
//                erst der Loop der Mitte
// FORM=kugel-b   dieselben Loops, aber die Mitte zuerst
// FORM=kugel-c   wie kugel-a, aber vor dem Loop der Mitte erst VORHER=15 Zufallsschritte (lässt er sich danach noch einsetzen?)
// FORM=<name>    eine gesicherte Form laden (nur Stände mit Sichern und Laden)
// TEST=dreh      am obersten Punkt der Mitte in der Seite: spielen, Griff um 40° drehen und zurück, Griff verdrehen (auf die
//                Gegenseite), loslassen, zurückdrehen, danach weiterarbeiten (Punkt hinauf und zurück, zweimal)
// TEST=alle      jeden Griff jedes Punkts (nur Stände, die Griffe in wahrer Länge zeigen): 40° drehen und zurück, verdrehen und
//                zurück; jeder Fall beginnt auf der frisch geladenen Form (braucht FORM=<name>)
// TEST=sprung    Sprung nach dem Loslassen: vier gewöhnliche Züge um 60 (braucht FORM=<name>); Haut kurz vor dem Loslassen gegen in Ruhe
// TEST=zufall    eine Zufallsfolge wie beim Herumspielen (SAAT=<Zahl>, SCHRITTE=40): Punkte ziehen, Griffe drehen, verdrehen und
//                zurückdrehen; auffällige Schritte sind markiert (◀); mit BILD ein Bild je auffälligem Schritt, mit BILD_ALLE=1 je Schritt
// Je Schritt: wie lange sich die Haut nach dem Loslassen noch bewegt (Abfrage alle 100 ms; „sichtbar“ = mehr als 0,5 Einheiten je
// Abfrage), Punkte im Netz, Rauminhalt gegen den Anfang, Knicke über 60° und über 150°, umgeschlagene Dreiecke; dazu, wie viele der
// umgeschlagenen Dreiecke und der Knicke über 150° an der Mittelkante liegen (eine Ecke genau in der Spiegelebene) bzw. nah an ihr
// (bis zwei mittlere Kantenlängen daneben).
// Aufruf aus apps/editor: FORM=kugel-a TEST=dreh node scripts/pruefen/form-griffe-probe-versionen.mjs   (KURVEN_URL, BILD=<pfad ohne Endung>)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const FORM = process.env.FORM ?? 'kugel-a';
const TEST = process.env.TEST ?? 'dreh';
const WARTEN = Number(process.env.WARTEN ?? 30);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(800);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);

/** eine Abfrage: Punkte im Netz und wie weit sich die Haut seit der letzten Abfrage bewegt hat (NaN: anderes Netz) */
const abfrage = () =>
  seite.evaluate(() => {
    const P = window.__kurven.lagen();
    const alt = window.__probeAlt;
    // dasselbe Netz? (ein neues kann gleich viele Punkte haben: an den Dreiecken geprüft)
    const T = window.__kurven.dreiecke();
    let kenn = T.length;
    for (let i = 0; i < T.length; i += 97) kenn = (kenn * 31 + T[i]) % 2147483647;
    const gleich = window.__probeNetz === kenn;
    window.__probeNetz = kenn;
    let weg = NaN;
    if (gleich && alt && alt.length === P.length) {
      weg = 0;
      for (let i = 0; i < P.length; i += 3) {
        const d = Math.hypot(P[i] - alt[i], P[i + 1] - alt[i + 1], P[i + 2] - alt[i + 2]);
        if (d > weg) weg = d;
      }
    }
    window.__probeAlt = P;
    // rechnet das Fenster noch (Nachlauf, Aufräumen im Hintergrund)? Auf Ständen ohne diese Angabe: nein
    const beschaeftigt = window.__kurven.zeiten().beschaeftigt === true;
    return { n: P.length / 3, weg, beschaeftigt };
  });
/**
 * warten, bis die Haut steht (0,6 s lang keine Bewegung über 0,02 und kein Netzwechsel). Zurück: wie lange sie sich noch bewegt hat,
 * wie lange sichtbar (über 0,5 je Abfrage), die größte Bewegung je Abfrage, wie oft das Netz gewechselt hat.
 */
const ruhe = async () => {
  const t0 = Date.now();
  await abfrage();
  let zuletzt = t0;
  let sichtbar = t0;
  let groesste = 0;
  let wechsel = 0;
  for (;;) {
    await seite.waitForTimeout(100);
    const a = await abfrage();
    const jetzt = Date.now();
    if (a.beschaeftigt) zuletzt = jetzt;
    if (Number.isNaN(a.weg)) {
      wechsel++;
      zuletzt = jetzt;
    } else {
      if (a.weg > 0.02) zuletzt = jetzt;
      if (a.weg > 0.5) sichtbar = jetzt;
      groesste = Math.max(groesste, a.weg);
    }
    if (jetzt - zuletzt > 600 && jetzt - t0 > 700) break;
    if (jetzt - t0 > WARTEN * 1000) return { dauer: Infinity, sichtbar: (sichtbar - t0) / 1000, groesste, wechsel };
  }
  return { dauer: (zuletzt - t0) / 1000, sichtbar: (sichtbar - t0) / 1000, groesste, wechsel };
};
/** wie es der Haut geht (aus Lagen und Dreiecken gerechnet, auf jedem Stand gleich) */
const zustand = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const P = k.lagen();
    const T = k.dreiecke();
    let inhalt = 0;
    const kanten = new Map();
    const fn = new Float64Array(T.length);
    const vn = new Float64Array(P.length);
    for (let t = 0; t < T.length; t += 3) {
      const a = 3 * T[t];
      const b = 3 * T[t + 1];
      const c = 3 * T[t + 2];
      inhalt += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]);
      const ux = P[b] - P[a];
      const uy = P[b + 1] - P[a + 1];
      const uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a];
      const vy = P[c + 1] - P[a + 1];
      const vz = P[c + 2] - P[a + 2];
      fn[t] = uy * vz - uz * vy;
      fn[t + 1] = uz * vx - ux * vz;
      fn[t + 2] = ux * vy - uy * vx;
      for (const v of [a, b, c]) {
        vn[v] += fn[t];
        vn[v + 1] += fn[t + 1];
        vn[v + 2] += fn[t + 2];
      }
      for (let e = 0; e < 3; e++) {
        const p = T[t + e];
        const q = T[t + ((e + 1) % 3)];
        const key = p < q ? p * 1e7 + q : q * 1e7 + p;
        const alt = kanten.get(key);
        if (alt === undefined) kanten.set(key, t);
        else kanten.set(key, -1 - (alt * 1e7 + t));
      }
    }
    // mittlere Kantenlänge: „nah an der Mittelkante“ heißt bis zwei Kantenlängen neben der Spiegelebene (z = 0)
    let laenge = 0;
    for (const key of kanten.keys()) {
      const p = 3 * Math.floor(key / 1e7);
      const q = 3 * (key % 1e7);
      laenge += Math.hypot(P[p] - P[q], P[p + 1] - P[q + 1], P[p + 2] - P[q + 2]);
    }
    const nah = (2 * laenge) / Math.max(1, kanten.size);
    let scharf = 0;
    let spitz = 0;
    // davon an der Mittelkante (ein Ende genau in der Spiegelebene) und nah an ihr
    let spitzM = 0;
    let spitzN = 0;
    for (const [key, v] of kanten) {
      if (v >= 0) continue;
      const w = -1 - v;
      const t1 = Math.floor(w / 1e7);
      const t2 = w % 1e7;
      const l1 = Math.hypot(fn[t1], fn[t1 + 1], fn[t1 + 2]) || 1;
      const l2 = Math.hypot(fn[t2], fn[t2 + 1], fn[t2 + 2]) || 1;
      const c = (fn[t1] * fn[t2] + fn[t1 + 1] * fn[t2 + 1] + fn[t1 + 2] * fn[t2 + 2]) / (l1 * l2);
      if (c < 0.5) scharf++;
      if (c < Math.cos((150 * Math.PI) / 180)) {
        spitz++;
        const z = Math.min(Math.abs(P[3 * Math.floor(key / 1e7) + 2]), Math.abs(P[3 * (key % 1e7) + 2]));
        if (z < 1e-6) spitzM++;
        if (z < nah) spitzN++;
      }
    }
    let umg = 0;
    let umgM = 0;
    let umgN = 0;
    for (let t = 0; t < T.length; t += 3) {
      const a = 3 * T[t];
      const b = 3 * T[t + 1];
      const c = 3 * T[t + 2];
      if (fn[t] * (vn[a] + vn[b] + vn[c]) + fn[t + 1] * (vn[a + 1] + vn[b + 1] + vn[c + 1]) + fn[t + 2] * (vn[a + 2] + vn[b + 2] + vn[c + 2]) < 0) {
        umg++;
        const z = Math.min(Math.abs(P[a + 2]), Math.abs(P[b + 2]), Math.abs(P[c + 2]));
        if (z < 1e-6) umgM++;
        if (z < nah) umgN++;
      }
    }
    return { punkte: P.length / 3, inhalt: inhalt / 6, scharf, spitz, umg, spitzM, spitzN, umgM, umgN, meldung: k.meldung() };
  });
let z0 = null;
const zeile = (z, r) =>
  `${r ? `bewegt sich noch ${Number.isFinite(r.dauer) ? r.dauer.toFixed(1) : `über ${WARTEN}`} s (sichtbar ${r.sichtbar.toFixed(1)} s, größte Bewegung ${r.groesste.toFixed(1)}${r.wechsel ? `, Netz ${r.wechsel}-mal gewechselt` : ''}) · ` : ''}${z.punkte} Punkte · Rauminhalt ${((z.inhalt / z0.inhalt) * 100).toFixed(1)} % · Knicke über 60° ${z.scharf}, über 150° ${z.spitz} · umgeschlagen ${z.umg}${z.umg + z.spitz ? ` · davon an der Mittelkante ${z.umgM} und ${z.spitzM} (nah an ihr ${z.umgN} und ${z.spitzN})` : ''}${z.meldung ? ` · Meldung: ${z.meldung.slice(0, 90)}` : ''}`;

const uv = (a, q) => (a === 'seite' ? [q.x, -q.y] : a === 'front' ? [q.z, -q.y] : [q.x, q.z]);
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
/** im Blatt a von der Weltlage `von` über die Weltlagen `wege` ziehen, halten, loslassen; danach warten, bis die Haut steht */
const ziehen = async (a, von, wege, zoom = 0.5) => {
  const alle = [von, ...wege].map((q) => uv(a, q));
  const us = alle.map((q) => q[0]);
  const vs = alle.map((q) => q[1]);
  await K('ausschnitt', a, { cx: (Math.min(...us) + Math.max(...us)) / 2, cy: (Math.min(...vs) + Math.max(...vs)) / 2, zoom });
  await seite.waitForTimeout(150);
  let [x, y] = await bild(a, von);
  await seite.mouse.move(x, y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (const w of wege) {
    const [x2, y2] = await bild(a, w);
    for (let s = 1; s <= 12; s++) {
      await seite.mouse.move(x + ((x2 - x) * s) / 12, y + ((y2 - y) * s) / 12);
      await seite.waitForTimeout(16);
    }
    [x, y] = [x2, y2];
  }
  await seite.waitForTimeout(300);
  const gehalten = await zustand();
  await seite.mouse.up();
  const r = await ruhe();
  return { gehalten, r, z: await zustand() };
};
const schneiden = async (a, P, Q) => {
  await seite.keyboard.press('l');
  const [x, y] = await bild(a, P);
  const [x2, y2] = await bild(a, Q);
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x2, y2, { steps: 8 });
  await seite.mouse.up();
  await ruhe();
  await seite.keyboard.press('Escape');
};
const loopsJetzt = () => K('loops');
/** Nummer des Punkts von Loop lid, der in der Richtung `wie` am weitesten liegt */
const punktNr = async (lid, wie) => {
  const l = (await loopsJetzt()).find((x) => x.id === lid);
  let best = 0;
  l.punkte.forEach((p, i) => {
    if (p.sichtbar !== false && wie(p.ref) > wie(l.punkte[best].ref)) best = i;
  });
  return best;
};
const plus = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const minus = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
/** den Vektor g in der Ebene des Blatts a um w Grad drehen */
const gedreht = (a, g, w) => {
  const c = Math.cos((w * Math.PI) / 180);
  const s = Math.sin((w * Math.PI) / 180);
  if (a === 'seite') return { x: c * g.x - s * g.y, y: s * g.x + c * g.y, z: g.z };
  if (a === 'front') return { x: g.x, y: s * g.z + c * g.y, z: c * g.z - s * g.y };
  return { x: c * g.x - s * g.z, y: g.y, z: s * g.x + c * g.z };
};
/** das Blatt, in dessen Ebene der Griff g am besten liegt */
const blattFuer = (g) => {
  const ax = Math.abs(g.x);
  const ay = Math.abs(g.y);
  const az = Math.abs(g.z);
  return az <= ax && az <= ay ? 'seite' : ax <= ay ? 'front' : 'top';
};
/**
 * Den Punkt wählen und die Spitze seines Griffs `s` (ein | aus) nach `wohin(g)` ziehen (g: Griff als Vektor vom Punkt zur gezeigten
 * Spitze). Zurück: Messung, und ob sich der gemeinte Griff geändert hat.
 */
const griffZiehen = async (lid, pi, s, wohin, a0 = null) => {
  const p = (await loopsJetzt()).find((x) => x.id === lid).punkte[pi];
  let g0 = await K('griffe', lid, pi);
  if (!g0[s]) return null;
  const a = a0 ?? blattFuer(minus(g0[s], p.ref));
  // so nah heran, dass der Griff im Blatt mindestens 60 Pixel lang ist (sonst greift die Maus den Punkt statt der Spitze)
  const imBlatt = (g) => Math.hypot(...uv(a, g));
  const zoom = Math.max(0.5, Math.min(8, 60 / Math.max(1e-6, imBlatt(minus(g0[s], p.ref)))));
  const [u, v] = uv(a, p.ref);
  await K('ausschnitt', a, { cx: u, cy: v, zoom });
  await seite.waitForTimeout(150);
  const [bx, by] = await bild(a, p.ref);
  await seite.mouse.click(bx, by);
  await seite.waitForTimeout(250);
  await ruhe();
  g0 = await K('griffe', lid, pi);
  const spitze = g0[s];
  const g = minus(spitze, p.ref);
  const vorher = (await loopsJetzt()).find((x) => x.id === lid).punkte[pi];
  const m = await ziehen(a, spitze, [plus(p.ref, wohin(g, a))], zoom);
  const nachher = (await loopsJetzt()).find((x) => x.id === lid)?.punkte[pi];
  // getroffen: Der gemeinte Griff hat sich geändert, und der Punkt selbst liegt, wo er lag
  const punktBlieb = !!nachher && Math.hypot(nachher.ref.x - vorher.ref.x, nachher.ref.y - vorher.ref.y, nachher.ref.z - vorher.ref.z) < 1e-6;
  return { ...m, getroffen: punktBlieb && JSON.stringify(vorher[s]) !== JSON.stringify(nachher?.[s]), blatt: a };
};

/**
 * Zufallsfolge wie beim Herumspielen (Zufallszahlen aus SAAT, damit ein Lauf wiederholbar ist): Punkte ziehen, Griffe drehen, Griffe
 * verdrehen und (meist) wieder zurückdrehen. Nach jedem Schritt der Zustand; auffällig ist: mehr umgeschlagene Dreiecke als davor,
 * obwohl sich keine Linie selbst kreuzt; ein Loop, der nur aufliegt; Bewegung länger als 2 s.
 */
let saat = Number(process.env.SAAT ?? 1) >>> 0;
const zufall = () => {
  saat = (saat + 0x6d2b79f5) >>> 0;
  let t = saat;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
async function zufallsSchritte(N, marke = '') {
  let vorher = await zustand();
  let verdreht = null;
  let auffaellig = 0;
  for (let nr = 1; nr <= N; nr++) {
    const L = await loopsJetzt();
    const l = L[Math.floor(zufall() * L.length)];
    const sichtbare = l.punkte.map((p, i) => ({ p, i })).filter((x) => x.p.sichtbar !== false);
    const { p, i } = sichtbare[Math.floor(zufall() * sichtbare.length)];
    const w = zufall();
    let name;
    let m;
    if (verdreht && w < 0.6) {
      // den verdrehten Griff zurückdrehen
      name = `Griff ${verdreht.s} von ${verdreht.lid}:${verdreht.i} zurückdrehen`;
      m = await griffZiehen(verdreht.lid, verdreht.i, verdreht.s, (g) => ({ x: -g.x, y: -g.y, z: -g.z }), verdreht.blatt);
      verdreht = null;
    } else if (w < 0.45) {
      // Punkt ziehen: 20 bis 80 Einheiten in einem Blatt, in dem er gut zu sehen ist
      const a = ['seite', 'front', 'top'][Math.floor(zufall() * 3)];
      const r = 20 + 60 * zufall();
      const phi = 2 * Math.PI * zufall();
      const d = a === 'seite' ? { x: r * Math.cos(phi), y: r * Math.sin(phi), z: 0 } : a === 'front' ? { x: 0, y: r * Math.sin(phi), z: r * Math.cos(phi) } : { x: r * Math.cos(phi), y: 0, z: r * Math.sin(phi) };
      name = `Punkt ${l.id}:${i} in ${a} um (${d.x.toFixed(0)}, ${d.y.toFixed(0)}, ${d.z.toFixed(0)})`;
      m = await ziehen(a, p.ref, [plus(p.ref, d)]);
    } else if (w < 0.85) {
      const s = zufall() < 0.5 ? 'ein' : 'aus';
      const grad = (zufall() < 0.5 ? -1 : 1) * (20 + 50 * zufall());
      name = `Griff ${s} von ${l.id}:${i} um ${grad.toFixed(0)}° drehen`;
      m = await griffZiehen(l.id, i, s, (g, a) => gedreht(a, g, grad));
    } else {
      const s = zufall() < 0.5 ? 'ein' : 'aus';
      name = `Griff ${s} von ${l.id}:${i} verdrehen`;
      m = await griffZiehen(l.id, i, s, (g) => ({ x: -g.x, y: -g.y, z: -g.z }));
      if (m?.getroffen) verdreht = { lid: l.id, i, s, blatt: m.blatt };
    }
    if (!m) {
      console.log(`${marke}${nr} ${name}: kein Griff`);
      continue;
    }
    const L2 = await loopsJetzt();
    const lose = L2.filter((x) => x.eingesetzt === false).map((x) => x.id);
    const kreuzt = /kreuzt sich selbst/.test(m.z.meldung ?? '');
    const marken = [];
    if (lose.length) marken.push(`LOOP ${lose.join(', ')} LIEGT NUR AUF`);
    if (m.z.umg > vorher.umg && !kreuzt) marken.push(`UMGEKLAPPT ${vorher.umg} → ${m.z.umg}`);
    if (m.z.spitz > vorher.spitz + 4 && !kreuzt) marken.push(`KNICKE ${vorher.spitz} → ${m.z.spitz}`);
    if (!(m.r.dauer <= 2)) marken.push(`BEWEGT SICH ${Number.isFinite(m.r.dauer) ? m.r.dauer.toFixed(1) : 'über ' + WARTEN} s`);
    if (marken.length) auffaellig++;
    console.log(`${marke}${nr} ${name}${m.getroffen === false ? ' (Griff nicht getroffen)' : ''}: ${zeile(m.z, m.r)}${marken.length ? ` ◀ ${marken.join(' · ')}` : ''}`);
    if ((marken.length || process.env.BILD_ALLE === '1') && process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}-${String(nr).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 80 });
    vorher = m.z;
  }
  console.log(`${marke}${auffaellig} von ${N} Schritten auffällig`);
}

// ---------- die Form ----------
let geladen = false;
const laden = async () => {
  const text = await seite.evaluate((n) => window.__kurven.ablage.laden(n), FORM);
  await ruhe();
  return text;
};
if (FORM === 'kugel-a' || FORM === 'kugel-b' || FORM === 'kugel-c') {
  z0 = await zustand();
  const mitte = () => schneiden('front', { x: 0, y: 260, z: 0 }, { x: 0, y: -260, z: 0 });
  if (FORM === 'kugel-b') await mitte();
  await schneiden('front', { x: 0, y: 8, z: -200 }, { x: 0, y: 8, z: 200 });
  await schneiden('seite', { x: -10, y: 200, z: 0 }, { x: -10, y: -200, z: 0 });
  await schneiden('front', { x: 0, y: 200, z: 43 }, { x: 0, y: -200, z: 43 });
  const paar = (await loopsJetzt()).find((l) => l.art === 'paar');
  if (!paar) {
    console.log(`kein Loop auf einer Seite entstanden: ${(await loopsJetzt()).map((l) => `${l.id} ${l.art}`).join(', ')}`);
    await browser.close();
    process.exit(1);
  }
  for (let mal = 0; mal < 3; mal++) {
    const i = await punktNr(paar.id, (p) => p.y);
    const p = (await loopsJetzt()).find((x) => x.id === paar.id).punkte[i];
    await ziehen('front', p.ref, [plus(p.ref, { x: 0, y: -10, z: 70 })]);
  }
  if (FORM === 'kugel-c') {
    // wie kugel-a, aber vor dem Loop der Mitte wird erst gespielt (VORHER Zufallsschritte): Danach muss er sich noch einsetzen lassen
    await zufallsSchritte(Number(process.env.VORHER ?? 15), 'vor der Mitte ');
    await mitte();
  }
  if (FORM === 'kugel-a') await mitte();
} else {
  const text = await laden();
  geladen = true;
  console.log(text);
  z0 = await zustand();
}
{
  const L = await loopsJetzt();
  const inMitte = (await K('lagen')).filter((v, i) => i % 3 === 2 && v === 0).length;
  console.log(
    `${basis.replace('http://localhost:', 'Port ')} · FORM=${FORM} · ${L.map((l) => `${l.id}:${l.art} ${l.punkte.length} Punkte, ${l.proben} Proben${l.art === 'mitte' ? ` (${inMitte} Punkte des Netzes in der Mittelebene${l.proben !== inMitte ? ': LIEGT NUR AUF' : ''})` : ''}`).join(' · ')}`,
  );
}
const zA = await zustand();
console.log(`Anfang: ${zeile(zA, null)}`);
const M = (await loopsJetzt()).find((l) => l.art === 'mitte');

if (TEST === 'dreh' && M) {
  const schritt = async (name, m) => {
    if (!m) return console.log(`${name}: kein Griff`);
    console.log(`${name}${m.getroffen === false ? ' (GRIFF NICHT GETROFFEN)' : ''}\n   gehalten: ${zeile(m.gehalten, null)}\n   danach:   ${zeile(m.z, m.r)}`);
  };
  const oben = () => punktNr(M.id, (p) => p.y);
  const vorn = () => punktNr(M.id, (p) => -p.x);
  const punktZug = async (wie, wege) => {
    const i = await wie();
    const p = (await loopsJetzt()).find((x) => x.id === M.id).punkte[i];
    return ziehen('front', p.ref, wege.map((w) => plus(p.ref, w)));
  };
  await schritt('1 spielen: oberster Punkt der Mitte 50 hinauf, 30 hinunter, 60 hinauf, zurück', await punktZug(oben, [{ x: 0, y: 50, z: 0 }, { x: 0, y: -30, z: 0 }, { x: 0, y: 60, z: 0 }, { x: 0, y: 0, z: 0 }]));
  await schritt('2 anderer Griff: vorderster Punkt der Mitte, Griff aus um 40° gedreht', await griffZiehen(M.id, await vorn(), 'aus', (g, a) => gedreht(a, g, 40), 'seite'));
  await schritt('3 derselbe Griff zurück (−40°)', await griffZiehen(M.id, await vorn(), 'aus', (g, a) => gedreht(a, g, -40), 'seite'));
  const zVor = await zustand();
  await schritt('4 Griff aus am obersten Punkt der Mitte verdreht (auf die Gegenseite) und losgelassen', await griffZiehen(M.id, await oben(), 'aus', (g) => ({ x: -g.x, y: -g.y, z: -g.z }), 'seite'));
  await schritt('5 zurückgedreht (wieder auf die Gegenseite)', await griffZiehen(M.id, await oben(), 'aus', (g) => ({ x: -g.x, y: -g.y, z: -g.z }), 'seite'));
  const zNach = await zustand();
  console.log(`   gegen vor dem Verdrehen: Rauminhalt ${((zNach.inhalt / zVor.inhalt) * 100).toFixed(1)} %, Knicke über 150° ${zVor.spitz} → ${zNach.spitz}, umgeschlagen ${zVor.umg} → ${zNach.umg}`);
  await schritt('6 weiterarbeiten: oberster Punkt 40 hinauf und zurück', await punktZug(oben, [{ x: 0, y: 40, z: 0 }, { x: 0, y: 0, z: 0 }]));
  await schritt('7 noch einmal: 40 hinunter und zurück', await punktZug(oben, [{ x: 0, y: -40, z: 0 }, { x: 0, y: 0, z: 0 }]));
  if (process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}.jpg`, type: 'jpeg', quality: 85 });
}

if (TEST === 'alle' && geladen) {
  const L0 = await loopsJetzt();
  const faelle = [];
  for (const l of L0) l.punkte.forEach((p, i) => p.sichtbar !== false && ['ein', 'aus'].forEach((s) => p[s] && faelle.push({ lid: l.id, art: l.art, i, s, ref: p.ref })));
  console.log(`${faelle.length} Griffe; je Griff: 40° drehen und zurück, verdrehen und zurück (jeder Fall auf der frisch geladenen Form)`);
  const kurz = (m) => (m ? `${Number.isFinite(m.r.dauer) ? m.r.dauer.toFixed(1) : '>' + WARTEN} s (sichtbar ${m.r.sichtbar.toFixed(1)}), ${((m.z.inhalt / z0.inhalt) * 100).toFixed(1)} %, Knicke ${m.z.scharf}/${m.z.spitz}, umg ${m.z.umg}${m.getroffen ? '' : ' NICHT GETROFFEN'}` : 'kein Griff');
  for (const f of faelle) {
    const zeilen = [];
    for (const [name, hin, her] of [
      ['40°', (g, a) => gedreht(a, g, 40), (g, a) => gedreht(a, g, -40)],
      ['verdreht', (g) => ({ x: -g.x, y: -g.y, z: -g.z }), (g) => ({ x: -g.x, y: -g.y, z: -g.z })],
    ]) {
      await laden();
      const a = await griffZiehen(f.lid, f.i, f.s, hin);
      const b = a ? await griffZiehen(f.lid, f.i, f.s, her, a.blatt) : null;
      zeilen.push(`   ${name.padEnd(8)} hin: ${kurz(a)} · zurück: ${kurz(b)}`);
    }
    console.log(`Loop ${f.lid} (${f.art}) Punkt ${f.i} bei (${f.ref.x.toFixed(0)}, ${f.ref.y.toFixed(0)}, ${f.ref.z.toFixed(0)}), Griff ${f.s}\n${zeilen.join('\n')}`);
  }
}
if (TEST === 'sprung' && geladen) {
  // Sprung nach dem Loslassen: vier gewöhnliche Züge (der oberste, der unterste, der vorderste und der äußerste Punkt je 60 hinaus),
  // jeder auf der frisch geladenen Form. Verglichen wird die Haut kurz vor dem Loslassen mit der Haut in Ruhe: Rauminhalt und
  // Ausdehnung (größte Änderung einer der sechs Grenzen), dazu wie lange sie sich noch bewegt.
  const richtungen = [
    ['oben', (q) => q.y, { x: 0, y: 60, z: 0 }, 'front'],
    ['unten', (q) => -q.y, { x: 0, y: -60, z: 0 }, 'front'],
    ['vorn', (q) => -q.x, { x: -60, y: 0, z: 0 }, 'seite'],
    ['außen', (q) => q.z, { x: 0, y: 0, z: 60 }, 'front'],
  ];
  for (const [name, wie, d, a] of richtungen) {
    await laden();
    const L = await loopsJetzt();
    let best = null;
    for (const l of L) l.punkte.forEach((q) => q.sichtbar !== false && (!best || wie(q.ref) > wie(best.ref)) && (best = q));
    // Vorzug: derselbe Punkt 5 hin und zurück, dann Ruhe. So steht die Haut in der Rechnung dieses Fensters, bevor gemessen wird
    // (eine Form, die mit der anderen Rechnung gesichert wurde, setzt sich beim ersten Zug einmal um).
    const vor = await ziehen(a, best.ref, [plus(best.ref, { x: d.x / 12, y: d.y / 12, z: d.z / 12 }), best.ref]);
    const m0 = await K('masse');
    const z1 = await zustand();
    // ziehen wie `ziehen`, aber die Ausdehnung kurz vor dem Loslassen merken
    const alle = [best.ref, plus(best.ref, d)].map((q) => uv(a, q));
    await K('ausschnitt', a, { cx: (alle[0][0] + alle[1][0]) / 2, cy: (alle[0][1] + alle[1][1]) / 2, zoom: 0.5 });
    await seite.waitForTimeout(150);
    const [x, y] = await bild(a, best.ref);
    const [x2, y2] = await bild(a, plus(best.ref, d));
    await seite.mouse.move(x, y);
    await seite.waitForTimeout(80);
    await seite.mouse.down();
    for (let s2 = 1; s2 <= 12; s2++) {
      await seite.mouse.move(x + ((x2 - x) * s2) / 12, y + ((y2 - y) * s2) / 12);
      await seite.waitForTimeout(16);
    }
    await seite.waitForTimeout(300);
    const gehalten = await zustand();
    const mG = await K('masse');
    await seite.mouse.up();
    const r = await ruhe();
    const z2 = await zustand();
    const mR = await K('masse');
    const grenze = Math.max(...mG.map((v, i) => Math.abs(v - mR[i])));
    console.log(
      `${name} (${best.ref.x.toFixed(0)}, ${best.ref.y.toFixed(0)}, ${best.ref.z.toFixed(0)}) um 60 (Vorzug: ${Number.isFinite(vor.r.dauer) ? vor.r.dauer.toFixed(1) : 'über ' + WARTEN} s, sichtbar ${vor.r.sichtbar.toFixed(1)} s): nach dem Loslassen bewegt sich die Haut noch ${Number.isFinite(r.dauer) ? r.dauer.toFixed(1) : 'über ' + WARTEN} s (sichtbar ${r.sichtbar.toFixed(1)} s${r.wechsel ? `, Netz ${r.wechsel}-mal gewechselt` : ''}) · Rauminhalt gehalten ${((gehalten.inhalt / z1.inhalt) * 100).toFixed(1)} % → in Ruhe ${((z2.inhalt / z1.inhalt) * 100).toFixed(1)} % · Ausdehnung ändert sich danach um ${grenze.toFixed(1)} · Punkte ${gehalten.punkte} → ${z2.punkte} · Knicke über 150° ${z1.spitz} → ${z2.spitz}, umgeschlagen ${z1.umg} → ${z2.umg}`,
    );
    void m0;
  }
}
if (TEST === 'zufall') await zufallsSchritte(Number(process.env.SCHRITTE ?? 40));
console.log(fehler.length ? `Konsole: ${fehler.slice(0, 3).join(' | ').slice(0, 300)}` : 'Konsole: keine Fehler');
await browser.close();
