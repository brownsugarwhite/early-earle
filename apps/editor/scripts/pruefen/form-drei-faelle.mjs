// Form zuerst (08.11.2026), Florians drei Fälle nachgestellt und gemessen (Bilder docs/progress/editor/form-ohren-aufblasen-florian-
// 2026-11-08.webp und form-detail-grob-florian-2026-11-08.webp; das mit den schwarzen Stellen nur im Chat): „Beim Herausziehen von
// Hörnern, wenn man etwas mit dem Handle spielt, bläst sich manchmal eine Seite noch sehr auf, und nach dem Loslassen bläst sie sich
// noch mehr auf in 2–3 kleinen Schritten“, „schwarzes Loch … jetzt ist die Performance auch ganz schlecht“, „warum ist das Mesh an
// kleinen Details gröber, auch nach dem Loslassen?“
// FALL=hoerner (Standard): Kugel, drei Loops; auf dem senkrechten Ring in der Front zwei Punkte weit nach oben außen (Hörner, gespiegelt),
//   dann mit dem Griff an der äußeren Spitze gespielt (länger, gedreht, wie mit der Maus), jeder Zug einzeln losgelassen. Je Zug: Zeit je
//   Bewegung, Punkte, Knicke über 60°, umgeklappte Dreiecke (gegen ihre Ecken) und umgestülpte (die Außenseite zeigt ins Innere = schwarz,
//   Strahl-Parität), ob die Linie selbst faltet, und jede Änderung nach dem Loslassen (wie weit, wo, Volumen: Aufblasen in Stufen).
// FALL=detail: Ohr aus dem senkrechten Ring (wie form-detail-probe), dann schmaler gezogen; am Ohr gegen den Rumpf: Punkte, Kantenlänge,
//   Drehung der Normale über eine Kante, vor und nach dem Loslassen.
// Varianten über KURVEN_URL (?gewichte=geometrie, ?genauHaut=1). BILDER=<name>: Bilder nach docs/progress/editor.
// Seit 10.11. (Gegenprüfung G3): HALTEN=<ms> hält die Maus vor dem Loslassen so lange still (Standard 150); dabei je Bild im Fenster
// die Bewegung der Haut gegen das Bild davor und der Rauminhalt (rechnet die Haut beim Halten weiter, und kommt sie zur Ruhe?). Der
// Stand vor dem Loslassen und der gleich danach werden im Fenster festgehalten, genau vor und nach der Behandlung des Loslassens.
// GPU=1: echte Grafikkarte.
// Aufruf aus apps/editor: node scripts/pruefen/form-drei-faelle.mjs
import { chromium } from '@playwright/test';

const fall = process.env.FALL ?? 'hoerner';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const variante = basis.split('?')[1] ?? 'Standard';
const bilder = process.env.BILDER ?? null;
const halten = Number(process.env.HALTEN ?? 150);
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
const schnapp = () =>
  seite.evaluate(() => ({ P: window.__kurven.lagen(), T: window.__kurven.dreiecke(), z: window.__kurven.zeiten(), u: window.__kurven.umgeschlagen() }));
const gleich = (a, b) => a.P.length === b.P.length && a.P.every((v, i) => v === b.P[i]);
const f1 = (x) => x.toFixed(1);
const f2 = (x) => x.toFixed(2);

// ---------- Geometrie der Haut (Normalen, Flächen, Volumen, Knicke) ----------
const geo = (P, T) => {
  const n = P.length / 3;
  const m = T.length / 3;
  const FN = new Float64Array(3 * m);
  const FA = new Float64Array(m);
  const FC = new Float64Array(3 * m);
  const VN = new Float64Array(3 * n);
  let kante = 0;
  let vol = 0;
  for (let t = 0; t < m; t++) {
    const [a, b, c] = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
    const A = [P[3 * a], P[3 * a + 1], P[3 * a + 2]];
    const B = [P[3 * b], P[3 * b + 1], P[3 * b + 2]];
    const C = [P[3 * c], P[3 * c + 1], P[3 * c + 2]];
    const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const ac = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const l = Math.hypot(...f) || 1e-12;
    for (let k = 0; k < 3; k++) {
      FN[3 * t + k] = f[k] / l;
      FC[3 * t + k] = (A[k] + B[k] + C[k]) / 3;
      for (const v of [a, b, c]) VN[3 * v + k] += f[k];
    }
    FA[t] = l / 2;
    kante += Math.hypot(...ab);
    vol += (A[0] * (B[1] * C[2] - B[2] * C[1]) + A[1] * (B[2] * C[0] - B[0] * C[2]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6;
  }
  for (let v = 0; v < n; v++) {
    const l = Math.hypot(VN[3 * v], VN[3 * v + 1], VN[3 * v + 2]) || 1;
    for (let k = 0; k < 3; k++) VN[3 * v + k] /= l;
  }
  return { n, m, FN, FA, FC, VN, h: kante / m, vol };
};
/** Knicke zwischen Nachbardreiecken: Zahl über 60° */
const knicke = (T, G) => {
  const kanten = new Map();
  for (let t = 0; t < T.length / 3; t++)
    for (let e = 0; e < 3; e++) {
      const a = T[3 * t + e];
      const b = T[3 * t + ((e + 1) % 3)];
      const s = a < b ? a * 1e7 + b : b * 1e7 + a;
      const l = kanten.get(s);
      if (l) l.push(t);
      else kanten.set(s, [t]);
    }
  let ueber60 = 0;
  for (const ts of kanten.values()) {
    if (ts.length !== 2) continue;
    const [p, q] = ts;
    const c = G.FN[3 * p] * G.FN[3 * q] + G.FN[3 * p + 1] * G.FN[3 * q + 1] + G.FN[3 * p + 2] * G.FN[3 * q + 2];
    if (c < 0.5) ueber60++;
  }
  return ueber60;
};
/**
 * Umgestülpt: Die Außenseite eines Dreiecks zeigt ins Innere des Körpers (so sieht man im Fenster schwarze Stellen). Ein Punkt knapp vor
 * dem Dreieck (längs seiner Normale) liegt im Körper: Strahl-Parität längs der drei Achsen, Mehrheit. Fläche, Anteil, Orte (auf 40 gerundet).
 */
const umgestuelpt = (P, T, G) => {
  const zelle = 2 * G.h;
  const raster = [0, 1, 2].map((ax) => {
    const u = (ax + 1) % 3;
    const v = (ax + 2) % 3;
    const map = new Map();
    for (let t = 0; t < G.m; t++) {
      const w = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
      const lu = Math.floor(Math.min(...w.map((x) => P[3 * x + u])) / zelle);
      const hu = Math.floor(Math.max(...w.map((x) => P[3 * x + u])) / zelle);
      const lv = Math.floor(Math.min(...w.map((x) => P[3 * x + v])) / zelle);
      const hv = Math.floor(Math.max(...w.map((x) => P[3 * x + v])) / zelle);
      for (let i = lu; i <= hu; i++)
        for (let j = lv; j <= hv; j++) {
          const k = `${i},${j}`;
          const l = map.get(k);
          if (l) l.push(t);
          else map.set(k, [t]);
        }
    }
    return { u, v, map };
  });
  const innen = (q) => {
    let stimmen = 0;
    for (let ax = 0; ax < 3; ax++) {
      const { u, v, map } = raster[ax];
      const l = map.get(`${Math.floor(q[u] / zelle)},${Math.floor(q[v] / zelle)}`) ?? [];
      let k = 0;
      for (const t of l) {
        const [a, b, c] = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
        const au = P[3 * a + u];
        const av = P[3 * a + v];
        const bu = P[3 * b + u] - au;
        const bv = P[3 * b + v] - av;
        const cu = P[3 * c + u] - au;
        const cv = P[3 * c + v] - av;
        const d = bu * cv - cu * bv;
        if (Math.abs(d) < 1e-12) continue;
        const qu = q[u] - au;
        const qv = q[v] - av;
        const w1 = (qu * cv - cu * qv) / d;
        const w2 = (bu * qv - qu * bv) / d;
        if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue;
        const x = (1 - w1 - w2) * P[3 * a + ax] + w1 * P[3 * b + ax] + w2 * P[3 * c + ax];
        if (x > q[ax]) k++;
      }
      if (k % 2 === 1) stimmen++;
    }
    return stimmen >= 2;
  };
  let zahl = 0;
  let flaeche = 0;
  let gesamt = 0;
  const orte = new Map();
  const eps = 0.1 * G.h;
  for (let t = 0; t < G.m; t++) {
    gesamt += G.FA[t];
    const q = [0, 1, 2].map((k) => G.FC[3 * t + k] + eps * G.FN[3 * t + k] + 1e-4 * G.h * Math.sin(7.3 * t + 1.9 * k));
    if (!innen(q)) continue;
    zahl++;
    flaeche += G.FA[t];
    const o = [0, 1, 2].map((k) => Math.round(G.FC[3 * t + k] / 40) * 40).join(',');
    orte.set(o, (orte.get(o) ?? 0) + G.FA[t]);
  }
  return {
    zahl,
    anteil: flaeche / gesamt,
    orte: [...orte.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([o]) => o),
  };
};

// ---------- Abstand Punkt → Fläche (wie form-loslassen-probe) ----------
const punktDreieck = (p, a, b, c) => {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return Math.hypot(p[0] - a[0] - v * ab[0], p[1] - a[1] - v * ab[1], p[2] - a[2] - v * ab[2]);
  }
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return Math.hypot(p[0] - a[0] - w * ac[0], p[1] - a[1] - w * ac[1], p[2] - a[2] - w * ac[2]);
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return Math.hypot(p[0] - b[0] - w * (c[0] - b[0]), p[1] - b[1] - w * (c[1] - b[1]), p[2] - b[2] - w * (c[2] - b[2]));
  }
  const den = 1 / (va + vb + vc);
  const v = vb * den;
  const w = vc * den;
  return Math.hypot(p[0] - a[0] - ab[0] * v - ac[0] * w, p[1] - a[1] - ab[1] * v - ac[1] * w, p[2] - a[2] - ab[2] * v - ac[2] * w);
};
const flaeche = (S) => {
  const { P, T } = S;
  const G = geo(P, T);
  const h = 2 * G.h;
  const zellen = new Map();
  for (let t = 0; t < T.length / 3; t++) {
    const v = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...v.map((w) => P[3 * w + c])) / h));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...v.map((w) => P[3 * w + c])) / h));
    for (let i = lo[0]; i <= hi[0]; i++)
      for (let j = lo[1]; j <= hi[1]; j++)
        for (let k = lo[2]; k <= hi[2]; k++) {
          const s = `${i},${j},${k}`;
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
            const l = zellen.get(`${i},${j},${k}`);
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
/** wie weit sich die Fläche von A nach B bewegt hat (je Punkt von B der Abstand zur Fläche von A): größter, Ort */
const bewegung = (A, B) => {
  const d = flaeche(A);
  let max = 0;
  let wo = [0, 0, 0];
  for (let v = 0; v < B.P.length / 3; v++) {
    const p = [B.P[3 * v], B.P[3 * v + 1], B.P[3 * v + 2]];
    const x = d(p);
    if (x > max) {
      max = x;
      wo = p;
    }
  }
  return { max, wo };
};

// ---------- je Stand: eine Zeile ----------
const stand = (S) => {
  const G = geo(S.P, S.T);
  const u = umgestuelpt(S.P, S.T, G);
  return { G, u, knicke: knicke(S.T, G) };
};
const standText = (S, x) =>
  `${S.P.length / 3} Punkte · Volumen ${(x.G.vol / 1e6).toFixed(3)} Mio · Knicke über 60° ${x.knicke} · umgeklappt ${S.u} · ` +
  `umgestülpt ${x.u.zahl} Dreiecke (${f1(100 * x.u.anteil)} % der Fläche${x.u.zahl ? `, bei ${x.u.orte.join(' | ')}` : ''})`;
/** ob die Linie selbst faltet: größte Drehung von Probe zu Probe (Grad) und Selbstkreuzungen in der Front (z, y) */
const linieFaltet = (l) => {
  const R = l.ruhe;
  const n = R.length / 3;
  let dreh = 0;
  for (let i = 1; i < n - 1; i++) {
    const a = [R[3 * i] - R[3 * i - 3], R[3 * i + 1] - R[3 * i - 2], R[3 * i + 2] - R[3 * i - 1]];
    const b = [R[3 * i + 3] - R[3 * i], R[3 * i + 4] - R[3 * i + 1], R[3 * i + 5] - R[3 * i + 2]];
    const la = Math.hypot(...a);
    const lb = Math.hypot(...b);
    if (la < 1e-9 || lb < 1e-9) continue;
    dreh = Math.max(dreh, (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb)))) * 180) / Math.PI);
  }
  const p = (i) => [R[3 * i + 2], R[3 * i + 1]];
  const schneiden = (a, b, c, d) => {
    const k = (o, q, r) => (q[0] - o[0]) * (r[1] - o[1]) - (q[1] - o[1]) * (r[0] - o[0]);
    return k(a, b, c) * k(a, b, d) < 0 && k(c, d, a) * k(c, d, b) < 0;
  };
  let kreuz = 0;
  for (let i = 0; i < n - 1; i++) for (let j = i + 2; j < n - 1; j++) if (schneiden(p(i), p(i + 1), p(j), p(j + 1))) kreuz++;
  return { dreh, kreuz };
};

/** ein Zug (Maus), losgelassen, dann jede Änderung bis zur Ruhe */
const zugMessen = async (name, [x0, y0], [x1, y1], schritte = 30) => {
  const S0 = await schnapp();
  await seite.mouse.move(x0, y0);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) await seite.mouse.move(x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte);
  // im Fenster: je Bild des Haltens Bewegung und Rauminhalt; der Stand genau vor (Erfassungsphase) und nach dem Loslassen
  await seite.evaluate(() => {
    const K2 = window.__kurven;
    const snap = () => ({ P: K2.lagen(), T: K2.dreiecke(), z: K2.zeiten(), u: K2.umgeschlagen() });
    const inhalt = (P, T) => {
      let v = 0;
      for (let t = 0; t < T.length; t += 3) {
        const a = 3 * T[t];
        const b = 3 * T[t + 1];
        const c = 3 * T[t + 2];
        v += (P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) + P[a + 1] * (P[b + 2] * P[c] - P[b] * P[c + 2]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c])) / 6;
      }
      return v;
    };
    const rec = (window.__halten = { bilder: [], aus: false, vorLos: null, nachLos: null });
    let vor = Float64Array.from(K2.lagen());
    const t0 = performance.now();
    const tick = () => {
      if (rec.aus) return;
      const P = K2.lagen();
      if (P.length !== vor.length) rec.bilder.push({ t: Math.round(performance.now() - t0), netz: P.length / 3 });
      else {
        let weg = 0;
        for (let v = 0; v < P.length; v += 3) {
          const e = Math.hypot(P[v] - vor[v], P[v + 1] - vor[v + 1], P[v + 2] - vor[v + 2]);
          if (e > weg) weg = e;
        }
        if (weg > 0) rec.bilder.push({ t: Math.round(performance.now() - t0), weg, vol: inhalt(P, K2.dreiecke()) });
      }
      vor = Float64Array.from(P);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.addEventListener(
      'pointerup',
      () => {
        rec.aus = true;
        rec.vorLos = snap();
      },
      { capture: true, once: true },
    );
    window.addEventListener('pointerup', () => (rec.nachLos = snap()), { once: true });
  });
  await seite.waitForTimeout(halten);
  const t0 = Date.now();
  await seite.mouse.up();
  const { A, B, haltBilder } = await seite.evaluate(() => ({ A: window.__halten.vorLos, B: window.__halten.nachLos, haltBilder: window.__halten.bilder }));
  const verlauf = [{ t: Date.now() - t0, S: B }];
  let letzt = B;
  let ruhig = 0;
  while (Date.now() - t0 < 10000) {
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
  const zz = A.z.zug.slice(-schritte);
  {
    let gross = 0;
    let unendlich = 0;
    for (const x of A.P) {
      if (!Number.isFinite(x)) unendlich++;
      else gross = Math.max(gross, Math.abs(x));
    }
    console.log(
      `  (Netz vor dem Loslassen: ${A.P.length / 3} Punkte, ${A.T.length / 3} Dreiecke, größte Koordinate ${gross.toFixed(1)}, nicht endlich ${unendlich}; Endstand: ${letzt.P.length / 3} Punkte)`,
    );
    if (unendlich > 0 || gross > 5000) {
      console.log('  ABBRUCH: Haut nicht endlich oder weit draußen');
      await browser.close();
      process.exit(1);
    }
  }
  const xA = stand(A);
  console.log(`\n${name}: je Mausbewegung ${f1(zz.reduce((s, v) => s + v, 0) / zz.length)} ms (max ${Math.max(...zz).toFixed(0)})`);
  console.log(`  vor dem Loslassen: ${standText(A, xA)} · im Zug bewegt bis ${f1(bewegung(S0, A).max)}`);
  {
    const w = haltBilder.filter((b) => !b.netz);
    const vol = w.map((b) => b.vol);
    const spanne = vol.length ? (100 * (Math.max(...vol) - Math.min(...vol))) / Math.abs(vol[0]) : 0;
    console.log(
      `  beim Halten (${halten} ms${A.z.offen === undefined ? '' : `; Haut rechnet am Ende noch ${A.z.offen ? 'ja' : 'nein'}, ${A.z.nachRunden} Runden`}): ${w.length} Bilder mit Bewegung, ` +
        `größte je Bild ${f1(Math.max(0, ...w.map((b) => b.weg)))}, über 1 Einheit ${w.filter((b) => b.weg > 1).length}, Summe ${f1(w.reduce((a, b) => a + b.weg, 0))}; ` +
        `Rauminhalt schwankt um ${f2(spanne)} %; Netzwechsel ${haltBilder.filter((b) => b.netz).length}`,
    );
    if (w.length) console.log(`    je Bild: ${w.slice(0, 40).map((b) => b.weg.toFixed(1)).join(' ')}${w.length > 40 ? ' …' : ''}`);
  }
  let vor = A;
  let xVor = xA;
  for (const [k, v] of verlauf.entries()) {
    const x = stand(v.S);
    const b = bewegung(vor, v.S);
    const dv = (100 * (x.G.vol - xVor.G.vol)) / xVor.G.vol;
    console.log(
      `  ${k === 0 ? 'beim Loslassen' : `Änderung ${k} nach ${v.t} ms`}: Haut bewegt bis ${f1(b.max)} bei (${b.wo.map((q) => q.toFixed(0)).join(', ')}), ` +
        `Volumen ${dv >= 0 ? '+' : ''}${f2(dv)} % · ${standText(v.S, x)}`,
    );
    vor = v.S;
    xVor = x;
  }
  const C = verlauf[verlauf.length - 1].S;
  console.log(`  Endstand gegen vor dem Loslassen: bewegt bis ${f1(bewegung(A, C).max)}, Volumen ${f2((100 * (geo(C.P, C.T).vol - xA.G.vol)) / xA.G.vol)} %`);
  return { A, C };
};
const foto = async (name) => {
  if (!bilder) return;
  await seite.waitForTimeout(300);
  const ordner = process.env.ORDNER ?? '../../docs/progress/editor';
  await seite.screenshot({ path: `${ordner}/form-drei-${bilder}-${name}-2026-11-08.jpg`, type: 'jpeg', quality: 85 });
};

// ---------- Aufbau: Ring waagerecht (Seite), Mitte (Top), Ring senkrecht (Seite) ----------
const ziehen = async ([x, y], [x2, y2], n = 6) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(1500);
};
for (const [a, A, B] of [
  ['seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  await ziehen(xy(await bild(a, { ...A, z: 0 })), xy(await bild(a, { ...B, z: 0 })));
}
await seite.keyboard.press('Escape');
const L0 = await loops();
const senkrecht = L0.find((l) => l.art === 'ring' && !l.punkte.every((p) => Math.abs(p.ref.y) < 30));
const ringVon = async () => (await loops()).find((l) => l.id === senkrecht.id);
console.log(`${fall} (${variante})`);

// zwei Punkte auf dem senkrechten Ring (Front, Winkel vom Scheitel zur Seite) per Doppelklick, dann die zwei zwischen 45° und 65°
const ohrAnlegen = async (weit, winkel) => {
  for (const w of [40, 50, 60, 70]) {
    const l = await ringVon();
    const th = (w * Math.PI) / 180;
    const pr = (j) => [l.ruhe[3 * j], l.ruhe[3 * j + 1], l.ruhe[3 * j + 2]];
    let best = 0;
    for (let j = 0; j < l.s.length; j++) if (Math.abs(Math.atan2(pr(j)[2], pr(j)[1]) - th) < Math.abs(Math.atan2(pr(best)[2], pr(best)[1]) - th)) best = j;
    const j = Math.min(best, l.s.length - 2);
    const a = pr(j);
    const b = pr(j + 1);
    await seite.mouse.dblclick(...xy(await bild('front', { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2 })));
    await seite.waitForTimeout(500);
    await seite.keyboard.press('Escape');
  }
  const l = await ringVon();
  const mitte = l.punkte
    .map((p, i) => ({ ...p, i }))
    .filter((p) => {
      const w = (Math.atan2(p.ref.z, p.ref.y) * 180) / Math.PI;
      return p.sichtbar && p.kreuzung === null && w > 45 && w < 65;
    });
  await seite.mouse.click(...xy(await bild('front', mitte[0].ref)));
  await seite.waitForTimeout(450);
  await seite.keyboard.down('Shift');
  await seite.mouse.click(...xy(await bild('front', mitte[1].ref)));
  await seite.keyboard.up('Shift');
  await seite.waitForTimeout(450);
  const rich = { z: Math.sin((winkel * Math.PI) / 180), y: Math.cos((winkel * Math.PI) / 180) };
  const start = mitte[0].ref;
  const ziel = { x: start.x, y: start.y + weit * rich.y, z: start.z + weit * rich.z };
  return { rich, start: xy(await bild('front', start)), ziel: xy(await bild('front', ziel)) };
};

if (fall === 'hoerner') {
  // DICK=1: mit Einfluss O (Radius 90) gezogen, die Hörner werden breit wie in Florians Bild
  const o = await ohrAnlegen(Number(process.env.WEIT ?? 170), 40);
  if (process.env.DICK) await seite.keyboard.press('o');
  await zugMessen(`Hörner hinaus (${process.env.WEIT ?? 170} nach oben außen${process.env.DICK ? ', mit O' : ''})`, o.start, o.ziel);
  if (process.env.DICK) await seite.keyboard.press('o');
  await seite.keyboard.press('Escape');
  await foto('1-hoerner');
  // die äußere Spitze wählen (am weitesten in Zugrichtung), dann mit ihrem Griff spielen
  const spitze = async () => {
    const l = await ringVon();
    return l.punkte
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.sichtbar && p.kreuzung === null && p.ref.z > 0)
      .reduce((b, p) => (p.ref.y * o.rich.y + p.ref.z * o.rich.z > b.ref.y * o.rich.y + b.ref.z * o.rich.z ? p : b));
  };
  const griffPos = async (i, ansicht) =>
    seite.evaluate(
      ([id2, i2, a2]) => {
        const e = document.querySelector(`#blatt-${a2} rect.griff[data-l="${id2}"][data-i="${i2}"][data-g="aus"]`);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      },
      [senkrecht.id, i, ansicht],
    );
  // Griffspiel wie mit der Maus: länger, gedreht hin und her (Grad im Uhrzeigersinn auf dem Bildschirm), in der Front und in der Seite
  // (dort bewegt der Griff die Linie nach vorn oder hinten), jeder Zug einzeln losgelassen. SPIEL=kurz: nur die ersten sechs.
  const spiel = [
    ['front', 'länger ×2,5', 2.5, 0],
    ['front', 'gedreht +45°', 1, 45],
    ['front', 'gedreht −90°', 1, -90],
    ['front', 'länger ×1,6, +30°', 1.6, 30],
    ['front', 'gedreht +60°', 1, 60],
    ['front', 'gedreht +60°', 1, 60],
    ['seite', 'länger ×3, −90°', 3, -90],
    ['seite', 'gedreht +45°', 1, 45],
    ['seite', 'länger ×1,5, +45°', 1.5, 45],
    ['front', 'länger ×1,5, −120°', 1.5, -120],
    ['seite', 'gedreht −90°', 1, -90],
    ['front', 'gedreht +120°', 1, 120],
  ].slice(0, process.env.SPIEL === 'kurz' ? 6 : undefined);
  const blatt = (ansicht) =>
    seite.evaluate((a2) => {
      const r = document.getElementById(`blatt-${a2}`).getBoundingClientRect();
      return [r.left, r.top, r.right, r.bottom];
    }, ansicht);
  const drin = ([x, y], r) => x > r[0] + 12 && x < r[2] - 12 && y > r[1] + 12 && y < r[3] - 12;
  for (const [k, [ansicht, name, faktor, grad]] of spiel.entries()) {
    // Griff und Ziel müssen im Blatt liegen (ein langer Griff ragt sonst hinaus und die Maus trifft nichts): sonst herauszoomen
    let p;
    let tip;
    let g;
    let ziel;
    for (let versuch = 0; versuch < 6; versuch++) {
      await seite.keyboard.press('Escape');
      p = await spitze();
      // gewählt wird in der Front (in der Seite liegt die Spitze auf dem Umriss, der Klick träfe ihn)
      await seite.mouse.click(...xy(await bild('front', p.ref)));
      await seite.waitForTimeout(450);
      tip = xy(await bild(ansicht, p.ref));
      g = await griffPos(p.i, ansicht);
      if (!g) break;
      const len = Math.hypot(g[0] - tip[0], g[1] - tip[1]) * faktor;
      const a = Math.atan2(g[1] - tip[1], g[0] - tip[0]) + (grad * Math.PI) / 180;
      ziel = [tip[0] + len * Math.cos(a), tip[1] + len * Math.sin(a)];
      const r = await blatt(ansicht);
      if (drin(g, r) && drin(ziel, r) && drin(tip, r)) break;
      const aus = await K('ausschnitt', ansicht);
      await K('ausschnitt', ansicht, { ...aus, zoom: aus.zoom * 0.7 });
      await seite.waitForTimeout(200);
    }
    if (!g) {
      console.log(`\nGriff der Spitze nicht gefunden (Punkt ${p.i}, ${ansicht}), Ende`);
      break;
    }
    const w0 = await K('griffe', senkrecht.id, p.i);
    await zugMessen(`Griff ${k + 1} (${ansicht}): ${name}`, g, ziel);
    const w1 = await K('griffe', senkrecht.id, p.i);
    const lang = (w) => (w.aus ? Math.hypot(w.aus.x - p.ref.x, w.aus.y - p.ref.y, w.aus.z - p.ref.z) / w.faktor : NaN);
    const f = linieFaltet(await ringVon());
    console.log(
      `  Griff (Welt) ${f1(lang(w0))} → ${f1(lang(w1))} lang · Linie: größte Drehung von Probe zu Probe ${f1(f.dreh)}°, Selbstkreuzungen in der Front ${f.kreuz}`,
    );
    await seite.keyboard.press('Escape');
    await foto(`${k + 2}-griff`);
  }
} else if (fall === 'detail') {
  const o = await ohrAnlegen(70, 55);
  const { A, C } = await zugMessen('Ohr hinaus (70)', o.start, o.ziel);
  /** am Ohr (über 165 in Zugrichtung) gegen den Rumpf (untere Hälfte): Punkte, mittlere Kante, Drehung der Punktnormale je Kante */
  const dichte = (S, name) => {
    const G = geo(S.P, S.T);
    const proj = (v) => S.P[3 * v + 1] * o.rich.y + S.P[3 * v + 2] * o.rich.z;
    const zonen = { Ohr: (v) => proj(v) > 165, Rumpf: (v) => S.P[3 * v + 1] < -60 };
    const teile = [];
    for (const [zn, drin] of Object.entries(zonen)) {
      let pk = 0;
      for (let v = 0; v < G.n; v++) if (drin(v)) pk++;
      const L = [];
      const W = [];
      const T = S.T;
      for (let t = 0; t < G.m; t++)
        for (let e = 0; e < 3; e++) {
          const a = T[3 * t + e];
          const b = T[3 * t + ((e + 1) % 3)];
          if (a > b || !drin(a) || !drin(b)) continue;
          L.push(Math.hypot(S.P[3 * a] - S.P[3 * b], S.P[3 * a + 1] - S.P[3 * b + 1], S.P[3 * a + 2] - S.P[3 * b + 2]));
          const c = G.VN[3 * a] * G.VN[3 * b] + G.VN[3 * a + 1] * G.VN[3 * b + 1] + G.VN[3 * a + 2] * G.VN[3 * b + 2];
          W.push((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
        }
      W.sort((x, y) => x - y);
      teile.push(
        `${zn}: ${pk} Punkte, Kante im Mittel ${f1(L.reduce((s, x) => s + x, 0) / Math.max(1, L.length))}, ` +
          `Normale je Kante 90 % ≤ ${f1(W[Math.floor(0.9 * (W.length - 1))] ?? 0)}°, größte ${f1(W[W.length - 1] ?? 0)}°`,
      );
    }
    console.log(`  ${name}: ${teile.join(' · ')}`);
  };
  dichte(A, 'vor dem Loslassen');
  dichte(C, 'nach dem Loslassen');
  await seite.keyboard.press('Escape');
  await foto('detail-1');
  // NAH=1: das Ohr in 3D von nah (Bild nur vom 3D-Blatt)
  if (process.env.NAH && bilder) {
    await K('kamera', { x: -230, y: 210, z: 330 }, { x: 10, y: 125, z: 175 });
    await seite.waitForTimeout(600);
    const r = await seite.evaluate(() => {
      const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0].getBoundingClientRect();
      return { x: c.left + c.width / 2, y: c.top + c.height / 2, width: c.width / 2, height: c.height / 2 };
    });
    const ordner = process.env.ORDNER ?? '../../docs/progress/editor';
    await seite.screenshot({ path: `${ordner}/form-drei-${bilder}-ohr-nah-2026-11-08.jpg`, type: 'jpeg', quality: 90, clip: r });
  }
  // schmaler: der äußere der zwei Ohrpunkte zum inneren hin (60 % ihres Abstands)
  const l = await ringVon();
  const zwei = l.punkte
    .map((p, i) => ({ ...p, i }))
    .filter((p) => p.sichtbar && p.kreuzung === null && p.ref.z > 0)
    .sort((a, b) => b.ref.y * o.rich.y + b.ref.z * o.rich.z - (a.ref.y * o.rich.y + a.ref.z * o.rich.z))
    .slice(0, 2)
    .sort((a, b) => Math.atan2(a.ref.z, a.ref.y) - Math.atan2(b.ref.z, b.ref.y));
  const [p, q] = zwei;
  const ziel = { x: q.ref.x, y: q.ref.y + 0.6 * (p.ref.y - q.ref.y), z: q.ref.z + 0.6 * (p.ref.z - q.ref.z) };
  await seite.mouse.click(...xy(await bild('front', q.ref)));
  await seite.waitForTimeout(450);
  const r = await zugMessen('Ohr schmaler (äußerer Punkt 60 % zum inneren)', xy(await bild('front', q.ref)), xy(await bild('front', ziel)));
  dichte(r.A, 'vor dem Loslassen');
  dichte(r.C, 'nach dem Loslassen');
  await seite.keyboard.press('Escape');
  await foto('detail-2');
}
if (fehler.length) console.log(`Fehler: ${fehler.slice(0, 3).join(' | ')}`);
await browser.close();
