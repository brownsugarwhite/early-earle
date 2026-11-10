// Form zuerst (08.11.2026), Florian: „Die Performance ist momentan beim Ziehen ganz gut, aber beim Loslassen springt das Mesh teilweise
// ziemlich zwischen den Punkten.“ Gemessen wird, wie weit und wann sich die Haut nach dem Loslassen noch bewegt: Stand nach der letzten
// Mausbewegung (A), gleich nach dem Loslassen (B: Runden am Ende, Verdichten), dann alle Änderungen in der Ruhe bis zum Stillstand
// (Setzen des neuen Netzes, Nachverfeinern). Abstand je Punkt des späteren Stands zur Fläche von A (Punkt zu Dreieck).
// FALL=ohr: Ohr aus dem senkrechten Ring (wie form-detail-probe). FALL=hals: obere Kreuzung in der Seite 160 hoch (Flasche).
// FALL=ruessel: neuer Punkt auf der Mitte, weit hinaus (+320/−70). SCHRITTE: Mausschritte des Zugs (Standard 30).
// Varianten über KURVEN_URL (z. B. ?verdichten=0, ?genau=0).
// Seit 10.11. (Gegenprüfung G3): HALTEN=<ms> hält die Maus nach der letzten Bewegung so lange still (Standard 150, 0 = sofort loslassen),
// PAUSE=<ms> wartet zwischen den Mausschritten (16 ≈ ein Schritt je Bild), GPU=1 nimmt die echte Grafikkarte (sonst rechnet der
// Software-Renderer jedes Bild ≈ 100 ms lang, und die Maus kommt nur zehnmal je Sekunde an). Der Stand vor dem Loslassen (A) und der
// gleich danach (B) werden im Fenster festgehalten, genau vor und nach der Behandlung des Loslassens. REST=<Runden>: nach dem Halten,
// vor dem Loslassen noch so viele Runden im laufenden Zug (wie weit ist die Haut von der Ruhe entfernt, wenn der Löser aufhört?).
// FERN=<Einheiten>: je Bild des Zugs, wie weit sich die Haut fern vom Griff (weiter als so viele Einheiten vom Anfang des Zugs) gegen
// das Bild davor bewegt (Ausschläge der ganzen Haut, wenn ein Löser neu anfängt).
// SICHERN=<datei>: den Stand vor dem Loslassen und den Endstand als JSON ablegen; VERGLEICH=<datei>: beide gegen einen abgelegten
// Lauf messen (hängt die Form am Weg, z. B. an der Geschwindigkeit des Zugs?).
// Aufruf aus apps/editor: node scripts/pruefen/form-loslassen-probe.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const fall = process.env.FALL ?? 'hals';
const schritte = Number(process.env.SCHRITTE ?? 30);
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const halten = Number(process.env.HALTEN ?? 150);
const pause = Number(process.env.PAUSE ?? 0);
const browser = await chromium.launch(process.env.GPU ? { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] } : {});
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const loops = () => K('loops');
const ziehen = async ([x, y], [x2, y2], n = 6) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(1500);
};
const schnapp = () => seite.evaluate(() => ({ P: window.__kurven.lagen(), T: window.__kurven.dreiecke(), z: window.__kurven.zeiten() }));
const gleich = (a, b) => a.P.length === b.P.length && a.P.every((v, i) => v === b.P[i]);

// ---------- Abstand Punkt → Fläche (Raster über die Dreiecke) ----------
const punktDreieck = (p, a, b, c) => {
  // nächster Punkt auf dem Dreieck (Ericson)
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  let q;
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b);
    const d3 = dot(ab, bp);
    const d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) q = b;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        q = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
      } else {
        const cp = sub(p, c);
        const d5 = dot(ab, cp);
        const d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) q = c;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            q = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])];
            } else {
              const den = 1 / (va + vb + vc);
              const v = vb * den;
              const w = vc * den;
              q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
            }
          }
        }
      }
    }
  }
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const flaeche = (S) => {
  const { P, T } = S;
  let kante = 0;
  for (let i = 0; i < T.length; i += 3) kante += Math.hypot(P[3 * T[i]] - P[3 * T[i + 1]], P[3 * T[i] + 1] - P[3 * T[i + 1] + 1], P[3 * T[i] + 2] - P[3 * T[i + 1] + 2]);
  const h = (2 * kante) / (T.length / 3);
  const zellen = new Map();
  const key = (i, j, k) => `${i},${j},${k}`;
  for (let t = 0; t < T.length / 3; t++) {
    const v = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...v.map((w) => P[3 * w + c])) / h));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...v.map((w) => P[3 * w + c])) / h));
    for (let i = lo[0]; i <= hi[0]; i++)
      for (let j = lo[1]; j <= hi[1]; j++)
        for (let k = lo[2]; k <= hi[2]; k++) {
          const s = key(i, j, k);
          const l = zellen.get(s);
          if (l) l.push(t);
          else zellen.set(s, [t]);
        }
  }
  const ecke = (w) => [P[3 * w], P[3 * w + 1], P[3 * w + 2]];
  return (p) => {
    const c = [0, 1, 2].map((k) => Math.floor(p[k] / h));
    let best = Infinity;
    for (let r = 1; r <= 12; r++) {
      const gesehen = new Set();
      for (let i = c[0] - r; i <= c[0] + r; i++)
        for (let j = c[1] - r; j <= c[1] + r; j++)
          for (let k = c[2] - r; k <= c[2] + r; k++) {
            const l = zellen.get(key(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (gesehen.has(t)) continue;
              gesehen.add(t);
              best = Math.min(best, punktDreieck(p, ecke(T[3 * t]), ecke(T[3 * t + 1]), ecke(T[3 * t + 2])));
            }
          }
      if (best <= (r - 0.5) * h) return best;
    }
    return best;
  };
};
/** wie weit sich die Fläche von A nach B bewegt hat: je Punkt von B der Abstand zur Fläche von A (größter, 99 %, Mittel, Ort) */
const bewegung = (A, B) => {
  const d = flaeche(A);
  const w = [];
  let wo = null;
  let max = 0;
  for (let v = 0; v < B.P.length / 3; v++) {
    const p = [B.P[3 * v], B.P[3 * v + 1], B.P[3 * v + 2]];
    const x = d(p);
    w.push(x);
    if (x > max) {
      max = x;
      wo = p;
    }
  }
  w.sort((a, b) => a - b);
  return { max, p99: w[Math.floor(0.99 * (w.length - 1))], mittel: w.reduce((s, x) => s + x, 0) / w.length, wo, ueber1: w.filter((x) => x > 1).length };
};
const f2 = (x) => x.toFixed(2);

// ---------- Aufbau: Ring waagerecht (Seite), Mitte (Top), Ring senkrecht (Seite) ----------
for (const [a, A, B] of [
  ['seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  await ziehen(xy(await bild(a, { ...A, z: 0 })), xy(await bild(a, { ...B, z: 0 })), 6);
}
await seite.keyboard.press('Escape');
const L0 = await loops();
const waagerecht = L0.find((l) => l.art === 'ring' && l.punkte.every((p) => Math.abs(p.ref.y) < 30));
const senkrecht = L0.find((l) => l.art === 'ring' && l !== waagerecht);
const mitteLoop = L0.find((l) => l.art === 'mitte');

// ---------- der Zug, dessen Loslassen gemessen wird ----------
let start;
let ziel;
let ansicht = 'seite';
if (fall === 'hals') {
  const l = (await loops()).find((q) => q.id === senkrecht.id);
  const p = l.punkte.filter((q) => q.sichtbar !== false).reduce((b, q) => (q.ref.y > b.ref.y ? q : b));
  start = p.ref;
  ziel = { ...p.ref, y: p.ref.y + 160 };
} else if (fall === 'ruessel') {
  const q = { x: 150 * Math.SQRT1_2, y: 150 * Math.SQRT1_2, z: 0 };
  const [cx, cy] = xy(await bild('seite', q));
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(60);
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(400);
  await seite.keyboard.press('Escape');
  const l = (await loops()).find((r) => r.id === mitteLoop.id);
  const p = l.punkte.filter((r) => r.sichtbar !== false).reduce((b, r) => (Math.hypot(r.ref.x - q.x, r.ref.y - q.y) < Math.hypot(b.ref.x - q.x, b.ref.y - q.y) ? r : b));
  start = p.ref;
  ziel = { ...p.ref, x: p.ref.x + 320, y: p.ref.y - 70 };
} else if (fall === 'ohr') {
  ansicht = 'front';
  const ringVon = async () => (await loops()).find((l) => l.id === senkrecht.id);
  for (const w of [40, 50, 60, 70]) {
    const l = await ringVon();
    const th = (w * Math.PI) / 180;
    let best = 0;
    const pr = (j) => [l.ruhe[3 * j], l.ruhe[3 * j + 1], l.ruhe[3 * j + 2]];
    for (let j = 0; j < l.s.length; j++) if (Math.abs(Math.atan2(pr(j)[2], pr(j)[1]) - th) < Math.abs(Math.atan2(pr(best)[2], pr(best)[1]) - th)) best = j;
    const j = Math.min(best, l.s.length - 2);
    const a = pr(j);
    const b = pr(j + 1);
    await seite.mouse.dblclick(...xy(await bild('front', { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2 })));
    await seite.waitForTimeout(500);
    await seite.keyboard.press('Escape');
  }
  const l = await ringVon();
  const mitte = l.punkte.filter((p) => {
    const w = (Math.atan2(p.ref.z, p.ref.y) * 180) / Math.PI;
    return p.sichtbar && p.kreuzung === null && w > 45 && w < 65;
  });
  await seite.mouse.click(...xy(await bild('front', mitte[0].ref)));
  await seite.waitForTimeout(300);
  await seite.keyboard.down('Shift');
  await seite.mouse.click(...xy(await bild('front', mitte[1].ref)));
  await seite.keyboard.up('Shift');
  await seite.waitForTimeout(300);
  start = mitte[0].ref;
  const rich = { z: Math.sin((55 * Math.PI) / 180), y: Math.cos((55 * Math.PI) / 180) };
  ziel = { x: start.x, y: start.y + 70 * rich.y, z: start.z + 70 * rich.z };
}
await seite.waitForTimeout(1500);

const [x0, y0] = xy(await bild(ansicht, start));
const [x1, y1] = xy(await bild(ansicht, ziel));
// Stand genau vor und genau nach der Behandlung des Loslassens: Der erste Listener (Fenster, Erfassungsphase) läuft vor dem des Blatts,
// der zweite (Fenster, Blasenphase) danach.
await seite.evaluate(() => {
  const K = window.__kurven;
  const schnapp = () => ({ P: K.lagen(), T: K.dreiecke(), z: K.zeiten() });
  const probe = (window.__probe = { schnapp, nachZug: null, vorLos: null, nachLos: null, bilder: 0, zaehlt: true, zeit: [] });
  window.addEventListener('pointerup', () => (probe.vorLos = schnapp()), { capture: true, once: true });
  window.addEventListener('pointerup', () => ((probe.nachLos = schnapp()), (probe.zaehlt = false)), { once: true });
  const bild = () => {
    if (!probe.zaehlt) return;
    probe.bilder++;
    probe.zeit.push(performance.now());
    requestAnimationFrame(bild);
  };
  requestAnimationFrame(bild);
});
if (process.env.FERN)
  await seite.evaluate(
    ([q, r]) => {
      const K2 = window.__kurven;
      const rec = (window.__fern = { bilder: [], aus: false });
      let vor = Float64Array.from(K2.lagen());
      const t0 = performance.now();
      const tick = () => {
        if (rec.aus) return;
        const P = K2.lagen();
        if (P.length !== vor.length) rec.bilder.push({ t: Math.round(performance.now() - t0), netz: P.length / 3 });
        else {
          let weg = 0;
          for (let v = 0; v < P.length; v += 3) {
            if (Math.hypot(vor[v] - q.x, vor[v + 1] - q.y, Math.abs(vor[v + 2]) - Math.abs(q.z)) <= r) continue;
            const e = Math.hypot(P[v] - vor[v], P[v + 1] - vor[v + 1], P[v + 2] - vor[v + 2]);
            if (e > weg) weg = e;
          }
          if (weg > 0) rec.bilder.push({ t: Math.round(performance.now() - t0), weg });
        }
        vor = Float64Array.from(P);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [start, Number(process.env.FERN)],
  );
await seite.mouse.move(x0, y0);
await seite.mouse.down();
const bilder0 = await seite.evaluate(() => window.__probe.bilder);
const tz0 = Date.now();
for (let i = 1; i <= schritte; i++) {
  await seite.mouse.move(x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte);
  if (pause) await seite.waitForTimeout(pause);
}
const zugMs = Date.now() - tz0;
// Bilder des Zugs (ab dem Drücken bis nach der letzten Mausbewegung): Abstände von Bild zu Bild
const bildZeiten = await seite.evaluate((ab) => window.__probe.zeit.slice(Math.max(0, ab - 1)), bilder0);
if (halten) {
  await seite.evaluate(() => (window.__probe.nachZug = window.__probe.schnapp()));
  await seite.waitForTimeout(halten);
}
const bilderZug = (await seite.evaluate(() => window.__probe.bilder)) - bilder0;
const fernBilder = process.env.FERN
  ? await seite.evaluate(() => {
      window.__fern.aus = true;
      return window.__fern.bilder;
    })
  : null;
const vorRest = process.env.REST ? await seite.evaluate(() => ({ offen: window.__kurven.zeiten().offen, nachRunden: window.__kurven.zeiten().nachRunden })) : null;
// REST=40 (vierzig Runden auf einmal) oder REST=1x40 (vierzigmal eine Runde, jede Bewegung einzeln)
const [restJe, restMal] = (process.env.REST ?? '').includes('x') ? process.env.REST.split('x').map(Number) : [Number(process.env.REST ?? 0), 1];
const restFolge = [];
const vorDemRest = process.env.REST ? await schnapp() : null;
if (process.env.REST) for (let k = 0; k < restMal; k++) restFolge.push(await seite.evaluate((n) => window.__kurven.weiterrechnen?.(n) ?? null, restJe));
const rest = process.env.REST ? (restFolge.some((v) => v === null) ? null : restFolge.reduce((a, v) => a + v, 0)) : null;
const nachDemRest = process.env.REST ? await schnapp() : null;
const t0 = Date.now();
await seite.mouse.up();
const { A0, A, B } = await seite.evaluate(() => ({ A0: window.__probe.nachZug, A: window.__probe.vorLos, B: window.__probe.nachLos }));
const tB = Date.now() - t0;
const verlauf = [];
let letzt = B;
let ruhig = 0;
while (Date.now() - t0 < 8000) {
  await seite.waitForTimeout(30);
  const S = await schnapp();
  if (gleich(S, letzt)) {
    if (++ruhig > 30 && Date.now() - t0 > 2000) break;
    continue;
  }
  ruhig = 0;
  verlauf.push({ t: Date.now() - t0, S });
  letzt = S;
}
const C = letzt;

// px je Einheit im Blatt bei 100 %
const a0 = await bild('front', { x: 0, y: 0, z: 0 });
const a1 = await bild('front', { x: 0, y: 0, z: 1 });
const px = Math.hypot(a1.x - a0.x, a1.y - a0.y) / ((await K('ausschnitt', 'front')).zoom || 1);

const zz = A.z.zug.slice(-schritte);
console.log(
  `${fall} (${basis.split('/').pop()}): ${schritte} Mausschritte in ${zugMs} ms (Pause ${pause} ms), ${bilderZug} Bilder bis zum Loslassen, gehalten ${halten} ms · ` +
    `Löser je Bewegung bzw. Bild ${f2(zz.reduce((s, v) => s + v, 0) / zz.length)} ms (max ${Math.max(...zz).toFixed(0)}), ${A.P.length / 3} Punkte vor dem Loslassen · ${px.toFixed(2)} px je Einheit bei 100 %`,
);
if (A.z.offen !== undefined) console.log(`  vor dem Loslassen: Haut rechnet noch ${A.z.offen ? 'ja' : 'nein'}, ${A.z.nachRunden} Runden seit der letzten Mausbewegung`);
{
  // Ruckeln im Zug: Abstand von Bild zu Bild (16,7 ms = 60 Bilder je Sekunde) und was den Hauptthread dabei aufhält
  const d = [];
  for (let i = 1; i < bildZeiten.length; i++) d.push(bildZeiten[i] - bildZeiten[i - 1]);
  const sortiert = [...d].sort((a, b) => a - b);
  const q = (p) => (sortiert.length ? sortiert[Math.min(sortiert.length - 1, Math.floor(p * sortiert.length))] : 0);
  const mittel = (L) => (L.length ? L.reduce((a, b) => a + b, 0) / L.length : 0);
  const liste = (L) => (L.length ? L.map((v) => v.toFixed(0)).join(' ') : '–');
  console.log(
    `  Bilder im Zug: ${d.length}, Abstand im Mittel ${mittel(d).toFixed(1)} ms (Mitte ${q(0.5).toFixed(1)}, 95 % ${q(0.95).toFixed(1)}, längster ${(sortiert[sortiert.length - 1] ?? 0).toFixed(0)}) · ` +
      `über 33 ms: ${d.filter((v) => v > 33).length}, über 50 ms: ${d.filter((v) => v > 50).length}, über 100 ms: ${d.filter((v) => v > 100).length}`,
  );
  const m = A.z.messung;
  if (m)
    console.log(
      `    Arbeit im Hauptthread: je Bild ${mittel(m.bild).toFixed(1)} ms (längste ${Math.max(0, ...m.bild).toFixed(0)}), davon Löser ${mittel(zz).toFixed(1)}; je Mausbewegung ${mittel(m.maus).toFixed(1)} ms (längste ${Math.max(0, ...m.maus).toFixed(0)}); ` +
        `Auslösen des Verfeinerns: ${liste(m.ausloesen)} ms; Einwechseln: ${liste(m.einwechseln)} ms` +
        (A.z.einwechslungTeile ? ` (das letzte: Auspacken ${A.z.auspacken}, dann [${A.z.einwechslungTeile.join('/')}]; im Hintergrund [${(A.z.hintergrundTeile ?? []).join('/')}])` : ''),
    );
}
console.log(
  `  Stufen im Zug: ${A.z.stufen ?? 0} im Vordergrund (letzte ${A.z.stufeMs ?? 0} ms), ${A.z.hintergrund ?? 0} eingewechselt aus dem Hintergrund ` +
    `(Auslösen ${A.z.ausloesung ?? 0} ms [${(A.z.ausloesungTeile ?? []).join('/')}], Einwechseln ${A.z.einwechslung ?? 0} ms, Auslösen bis Einwechseln ${A.z.hintergrundMs ?? 0} ms)`,
);
const nachEnde = await seite.evaluate(() => window.__kurven.zeiten().endrunden);
const zeile = (name, X, Y, t) => {
  const m = bewegung(X, Y);
  console.log(
    `  ${name}${t !== undefined ? ` (nach ${t} ms)` : ''}: ${Y.P.length / 3} Punkte · Haut bewegt bis ${f2(m.max)} (99 % ${f2(m.p99)}, Mittel ${f2(m.mittel)}, ${m.ueber1} Punkte über 1) ` +
      (m.wo ? `bei (${m.wo.map((v) => v.toFixed(0)).join(', ')})` : '(nichts bewegt)'),
  );
};
if (fernBilder) {
  const w = fernBilder.filter((b) => !b.netz).map((b) => b.weg);
  console.log(
    `  fern vom Griff (> ${process.env.FERN} Einheiten) je Bild gegen das Bild davor: ${w.length} Bilder mit Bewegung, größte ${f2(Math.max(0, ...w))}, ` +
      `über 0,5: ${w.filter((x) => x > 0.5).length}, über 0,18: ${w.filter((x) => x > 0.18).length}; Netzwechsel ${fernBilder.filter((b) => b.netz).length}`,
  );
  console.log(`    Folge (ms: Einheiten, N = neues Netz): ${fernBilder.map((b) => (b.netz ? `${b.t}:N` : `${b.t}:${b.weg.toFixed(2)}`)).join(' ')}`);
}
if (A0) zeile(`während des Haltens (${halten} ms)`, A0, A);
if (rest !== null)
  console.log(
    `  Rest zur Ruhe: nach dem Halten (Löser ${vorRest.offen ? 'rechnet noch' : 'steht'}, ${vorRest.nachRunden} Runden) bewegen ${process.env.REST} weitere Runden die Punkte um ${f2(rest)}` +
      (restMal > 1 ? ` (Summe der Runden; je Runde: ${restFolge.map((v) => v.toFixed(3)).join(' ')})` : '') +
      ' (mit dem Gleiten längs der Fläche); die Form:',
  );
if (rest !== null) zeile('  Form nach diesen Runden gegen vorher', vorDemRest, nachDemRest);
console.log(`  davon die Runden am Ende (Nachhinken): bis ${nachEnde?.toFixed(2)}`);
zeile('Loslassen sofort (Runden am Ende + Verdichten)', A, B, tB);
verlauf.forEach((v, k) => zeile(`danach Änderung ${k + 1}`, k === 0 ? B : verlauf[k - 1].S, v.S, v.t));
zeile('Endstand gegen vor dem Loslassen', A, C);
if (process.env.SICHERN) writeFileSync(process.env.SICHERN, JSON.stringify({ A: { P: A.P, T: A.T }, C: { P: C.P, T: C.T } }));
if (process.env.VERGLEICH) {
  const V = JSON.parse(readFileSync(process.env.VERGLEICH, 'utf8'));
  zeile('gegen den abgelegten Lauf, vor dem Loslassen', V.A, A);
  zeile('gegen den abgelegten Lauf, Endstand', V.C, C);
}
// NACH=<Runden>: danach noch so viele Runden über die ganze Haut — ist der Endstand fertig gerechnet?
if (process.env.NACH) {
  // NACH=40 oder NACH=5x8 (achtmal fünf Runden, jede Bewegung einzeln)
  const [je, mal] = process.env.NACH.includes('x') ? process.env.NACH.split('x').map(Number) : [Number(process.env.NACH), 1];
  let vor = C;
  for (let k = 0; k < mal; k++) {
    await seite.evaluate((n) => window.__kurven.nachrechnen(n), je);
    const S = await schnapp();
    zeile(`noch ${je} Runden (${k + 1})`, vor, S);
    vor = S;
  }
}
const zC = C.z;
console.log(`  Zeiten: Verdichten ${zC.verdichtung?.ms ?? '–'} ms (${zC.verdichtung?.neu ?? 0} neu, ${zC.verdichtung?.gelegt ?? 0} gelegt) · Zerlegen in der Ruhe ${zC.vorrechnen} ms · Setzen samt Nachverfeinern ${zC.nachLoesen} ms`);
if (fehler.length) console.log(`Fehler: ${fehler.slice(0, 3).join(' | ')}`);
await browser.close();
