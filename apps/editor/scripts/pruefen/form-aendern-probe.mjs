// Form zuerst (10.11.2026), Gegenprüfung Schritt G4.4: Was halten die Änderungen ohne Zug an, und was macht der erste Griff danach?
// Ablauf auf der Kugel: drei Loops schneiden (Ring waagerecht, Mitte, Ring senkrecht), erster und zweiter Griff (ein Zug um wenige
// Einheiten), ein weiter Zug, Kante an, Kante aus, Punkt setzen (Doppelklick auf eine Linie), Punkt löschen, zweimal ⌘Z, zuletzt ein
// vierter Loop und sofort danach ein Griff (ohne zu warten, bis der Hintergrund die Haut gesetzt hat).
// Je Schritt, im Fenster mitgelesen:
//   - die längsten Abstände zwischen zwei Bildern ab dem Auslösen (hält das Fenster an, wie lange, wann?)
//   - Netzwechsel und Bewegung der Haut bei gleichem Netz (wann, wie viel je Bild)
//   - wie weit die Haut am Ende von der Fläche davor entfernt ist, und wie lange es bis zur Ruhe dauert
//   - beim Griff: wie lange das Drücken dauert, wie weit die Haut fern vom Griff je Bild ausschlägt und was dort bleibt. „Fern“ ist
//     die untere Hälfte (y unter −40): Der Griff zieht die obere Kreuzung, mit ihr bewegen sich die oberen Bögen der Mitte und des
//     senkrechten Rings bis zu ihren nächsten Punkten bei y = 0; darunter soll ein Zug um 6 Einheiten fast nichts tun.
// Aufruf aus apps/editor: node scripts/pruefen/form-aendern-probe.mjs
//   KURVEN_URL (Standard http://localhost:5193/kurven.html?gewichte=geometrie; dichter mit &dreiecke=14000 bzw. 30000)
//   GPU=0: Software-Renderer (Standard ist die echte Grafikkarte)   FERN=-40: unter dieser Höhe zählt „fern“
//   NUR=loops|griff|kante|punkt: nur bis zu diesem Abschnitt; NUR=sofort: nur die drei Loops und „Loop und sofort greifen“
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const fernAb = Number(process.env.FERN ?? -40);
const nur = process.env.NUR ?? '';
const browser = await chromium.launch(process.env.GPU === '0' ? {} : { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(600);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
const schnapp = () =>
  seite.evaluate(() => {
    const r = window.__kurven.roh();
    return { P: Array.from(r.pos), T: Array.from(r.tri) };
  });

// ---------- im Fenster mitlesen: je Bild Zeit, Bewegung (überall und fern vom Griff), Netzwechsel ----------
await seite.evaluate(() => {
  const K2 = window.__kurven;
  const rec = (window.__rec = { bild: [], bewegt: [], wechsel: [], letzte: performance.now(), fern: null });
  let { pos, tri } = K2.roh();
  let vor = Float64Array.from(pos);
  let vorTri = tri;
  let tVor = performance.now();
  const tick = () => {
    const t = performance.now();
    rec.bild.push(t);
    if (t - tVor > 50) rec.letzte = t;
    tVor = t;
    ({ pos, tri } = K2.roh());
    if (pos.length !== vor.length || tri !== vorTri) {
      rec.wechsel.push({ t, von: vor.length / 3, nach: pos.length / 3 });
      rec.letzte = t;
      vor = Float64Array.from(pos);
      vorTri = tri;
    } else {
      let weg = 0;
      let wegFern = 0;
      const f = rec.fern;
      for (let i = 0; i < pos.length; i += 3) {
        const d = Math.hypot(pos[i] - vor[i], pos[i + 1] - vor[i + 1], pos[i + 2] - vor[i + 2]);
        if (d > weg) weg = d;
        if (f && d > wegFern && vor[i + 1] < f.unter) wegFern = d;
      }
      if (weg > 0) {
        rec.bewegt.push({ t, weg, fern: wegFern });
        rec.letzte = t;
        vor.set(pos);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// ---------- Abstand Punkt → Fläche (Raster über die Dreiecke), wie in form-loslassen-probe.mjs ----------
const punktDreieck = (p, a, b, c) => {
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
/** wie weit die Fläche B von der Fläche A entfernt ist (je Punkt von B); `fern`: nur Punkte unter der Höhe `fern.unter` */
const bewegung = (A, B, fern = null) => {
  const d = flaeche(A);
  const w = [];
  let wo = null;
  let max = 0;
  for (let v = 0; v < B.P.length / 3; v++) {
    const p = [B.P[3 * v], B.P[3 * v + 1], B.P[3 * v + 2]];
    if (fern && p[1] >= fern.unter) continue;
    const x = d(p);
    w.push(x);
    if (x > max) {
      max = x;
      wo = p;
    }
  }
  w.sort((a, b) => a - b);
  return { max, p99: w[Math.floor(0.99 * (w.length - 1))] ?? 0, mittel: w.length ? w.reduce((s, x) => s + x, 0) / w.length : 0, wo };
};
const f2 = (x) => x.toFixed(2);
const weit = (m) => `bis ${f2(m.max)} (99 % ${f2(m.p99)}, Mittel ${f2(m.mittel)})${m.wo && m.max > 0.3 ? ` bei (${m.wo.map((v) => v.toFixed(0)).join(', ')})` : ''}`;

// ---------- ein Schritt: auslösen, bis zur Ruhe warten, auswerten ----------
const ruhig = async () => {
  for (let k = 0; k < 400; k++) {
    await seite.waitForTimeout(100);
    const s = await seite.evaluate(() => {
      const z = window.__kurven.zeiten();
      return { still: performance.now() - window.__rec.letzte, laeuft: z.beschaeftigt ?? (!!z.nachlauf || !!z.aufraeumen || !!z.offen) };
    });
    if (!s.laeuft && s.still > 1500) return;
  }
};
const punkte = async () => (await K('zeiten')).punkte;
/**
 * `tun` löst aus und gibt zurück, was es selbst gemessen hat (Text). `fern`: dazu die Auswertung fern vom Griff (untere Hälfte).
 */
const schritt = async (name, tun, fern = null) => {
  const vor = await schnapp();
  const n0 = vor.P.length / 3;
  const t0 = await seite.evaluate((f) => {
    window.__rec.fern = f;
    return performance.now();
  }, fern);
  const eigenes = (await tun()) ?? '';
  const t1 = await seite.evaluate(() => performance.now());
  await ruhig();
  const rec = await seite.evaluate((t) => {
    const r = window.__rec;
    r.fern = null;
    return { bild: r.bild.filter((x) => x >= t - 40), bewegt: r.bewegt.filter((b) => b.t >= t), wechsel: r.wechsel.filter((w) => w.t >= t), letzte: r.letzte };
  }, t0);
  const z = await K('zeiten');
  const nach = await schnapp();
  if (!nach.P.every(Number.isFinite)) {
    console.log(`${name}: DIE HAUT IST NICHT ENDLICH (${nach.P.length / 3} Punkte) — Abbruch`);
    await browser.close();
    process.exit(1);
  }
  const ende = Math.max(rec.letzte, t1);
  const gaps = [];
  for (let i = 1; i < rec.bild.length && rec.bild[i] <= ende + 60; i++) gaps.push({ g: rec.bild[i] - rec.bild[i - 1], t: rec.bild[i] - t0 });
  const lang = gaps.filter((x) => x.g > 50).sort((a, b) => b.g - a.g);
  const summe = lang.reduce((s, x) => s + x.g, 0);
  console.log(`${name} (${n0} → ${nach.P.length / 3} Punkte)${eigenes ? `: ${eigenes}` : ''}`);
  console.log(
    `    Fenster: ${lang.length ? `${lang.length} Halte über 50 ms, zusammen ${Math.round(summe)} ms: ${lang.slice(0, 5).map((x) => `${Math.round(x.g)} ms (endet nach ${Math.round(x.t)} ms)`).join(', ')}` : `kein Halt über 50 ms (längster Abstand ${Math.round(Math.max(0, ...gaps.map((x) => x.g)))} ms)`}` +
      ` · ${rec.letzte > t0 ? `Ruhe nach ${Math.round(rec.letzte - t0)} ms` : 'nichts bewegt sich'}`,
  );
  const w = rec.bewegt;
  console.log(
    `    Haut: ${rec.wechsel.length} Netzwechsel${rec.wechsel.length ? ` (${rec.wechsel.map((x) => `nach ${Math.round(x.t - t0)} ms ${x.von} → ${x.nach}`).join(', ')})` : ''}, ` +
      `Bewegung bei gleichem Netz in ${w.length} Bildern${w.length ? ` (größte je Bild ${f2(Math.max(...w.map((b) => b.weg)))}, von ${Math.round(w[0].t - t0)} bis ${Math.round(w[w.length - 1].t - t0)} ms)` : ''}` +
      ` · am Ende gegen vorher ${weit(bewegung(vor, nach))}`,
  );
  if (fern) {
    const wf = w.map((b) => b.fern).filter((x) => x > 0);
    console.log(
      `    fern vom Griff (untere Hälfte, y unter ${fern.unter}): Ausschlag je Bild ${wf.length ? `bis ${f2(Math.max(...wf))}, in ${wf.filter((x) => x > 0.18).length} Bildern über 0,18 (Folge: ${wf.slice(0, 14).map((x) => x.toFixed(2)).join(' ')}${wf.length > 14 ? ' …' : ''})` : 'keiner'}` +
        ` · es bleibt ${weit(bewegung(vor, nach, fern))}`,
    );
  }
  const um = await K('umgeschlagen');
  console.log(
    `    Hintergrund: ${z.zwischen && z.zwischen.nr > (schritt.zw ?? -1) ? `gesetzte Haut nach ${z.zwischen.gesamt} ms (${z.zwischen.runden} Runden), ` : ''}` +
      `${z.auftrag && z.auftrag.nr > (schritt.au ?? -1) ? `Auftrag ${z.auftrag.nr} ${z.auftrag.angewendet ? 'angewendet' : 'verfallen'}${z.auftrag.vorstufe === 'verworfen' ? ' (Setzen verworfen: kam nicht zur Ruhe)' : ''}${z.auftrag.abgebrochen ? ' (ABGEBROCHEN)' : ''} [verdichten/Zeilen/zerlegen/setzen ${z.auftrag.ms.join('/')}] nach ${z.auftrag.gesamt} ms` : 'kein neuer Auftrag'}` +
      ` · im Fenster: neu gerechnet ${z.neuRechnen}, vorgerechnet ${z.vorrechnen}, zerlegt ${z.zerlegen} ms · umgeschlagene Dreiecke ${typeof um === 'number' ? um : JSON.stringify(um)}`,
  );
  schritt.zw = z.zwischen?.nr ?? schritt.zw;
  schritt.au = z.auftrag?.nr ?? schritt.au;
  return { vor, nach };
};

const ziehen = async ([x, y], [x2, y2], n, pause = 0) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
    if (pause) await seite.waitForTimeout(pause);
  }
  await seite.mouse.up();
};
const oben = async () => {
  const L = await K('loops');
  const senkrecht = L.find((l) => l.art === 'ring' && !l.punkte.every((p) => Math.abs(p.ref.y) < 30));
  return senkrecht.punkte.filter((q) => q.sichtbar !== false).reduce((b, q) => (q.ref.y > b.ref.y ? q : b)).ref;
};
/** ein Griff: drücken, in vier Schritten `hoch` Einheiten hinauf, 600 ms halten, loslassen */
const griff = async (hoch) => {
  const p = await oben();
  const [x, y] = await bild('seite', p);
  const [x2, y2] = await bild('seite', { ...p, y: p.y + hoch });
  await seite.mouse.move(x, y);
  const td = Date.now();
  await seite.mouse.down();
  const druecken = Date.now() - td;
  for (let i = 1; i <= 4; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / 4, y + ((y2 - y) * i) / 4);
    await seite.waitForTimeout(16);
  }
  await seite.waitForTimeout(600);
  const zerlegt = (await K('zeiten')).zerlegen;
  await seite.mouse.up();
  return `Drücken ${druecken} ms, dabei zerlegt ${zerlegt} ms`;
};

const px = await (async () => {
  const a = await bild('front', { x: 0, y: 0, z: 0 });
  const b = await bild('front', { x: 0, y: 0, z: 1 });
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
})();
console.log(`${basis.split('/').pop()} · ${await punkte()} Punkte am Anfang · ${px.toFixed(2)} px je Einheit bei 100 %`);

// ---------- 1. drei Loops ----------
for (const [name, a, A, B] of [
  ['Loop 1 schneiden (Ring waagerecht)', 'seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['Loop 2 schneiden (Mitte)', 'top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['Loop 3 schneiden (Ring senkrecht)', 'seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  const von = await bild(a, { ...A, z: 0 });
  const bis = await bild(a, { ...B, z: 0 });
  await schritt(name, async () => {
    await ziehen(von, bis, 6);
  });
}
await seite.keyboard.press('Escape');
await seite.waitForTimeout(300);

if (nur !== 'loops' && nur !== 'sofort') {
  // ---------- 2. erster und zweiter Griff ----------
  let p;
  await schritt('Erster Griff nach den Loops (6 Einheiten hinauf)', () => griff(6), { unter: fernAb });
  await schritt('Zweiter Griff (noch einmal 6 Einheiten)', () => griff(6), { unter: fernAb });

  if (nur !== 'griff') {
    // ---------- 3. weiter Zug, Kante an, Kante aus ----------
    p = await oben();
    const von = await bild('seite', p);
    const bis = await bild('seite', { ...p, y: p.y + 60 });
    await schritt('Weiter Zug (60 Einheiten hinauf, 20 Mausschritte)', async () => {
      await ziehen(von, bis, 20, 16);
    });
    await schritt('Kante an (K am gezogenen Punkt)', async () => {
      await seite.keyboard.press('k');
    });
    await schritt('Erster Griff nach der Kante (6 Einheiten hinauf)', () => griff(6), { unter: fernAb });
    await schritt('Kante aus (K)', async () => {
      await seite.keyboard.press('k');
    });

    if (nur !== 'kante') {
      // ---------- 4. Punkt setzen, Punkt löschen, zweimal zurück ----------
      const stelle = await bild('seite', { x: 80, y: 0, z: 0 });
      const zahl = async () => (await K('loops')).reduce((s, l) => s + l.punkte.filter((q) => q.sichtbar !== false).length, 0);
      const z0 = await zahl();
      await schritt('Punkt setzen (Doppelklick auf den waagerechten Ring)', async () => {
        await seite.mouse.dblclick(stelle[0], stelle[1]);
        await seite.waitForTimeout(200);
        return `Punkte der Loops ${z0} → ${await zahl()}`;
      });
      await schritt('Punkt löschen (Entf)', async () => {
        await seite.keyboard.press('Delete');
        await seite.waitForTimeout(200);
        return `Punkte der Loops → ${await zahl()}`;
      });
      await schritt('Rückgängig (⌘Z: das Löschen)', async () => {
        await seite.keyboard.press('Meta+z');
      });
      await schritt('Rückgängig (⌘Z: den Punkt)', async () => {
        await seite.keyboard.press('Meta+z');
      });
    }
  }
}
if (nur === '' || nur === 'sofort') {
  // ---------- 5. ein neuer Loop und sofort greifen ----------
  const p = await oben();
  const [gx, gy] = await bild('seite', p);
  const [gx2, gy2] = await bild('seite', { ...p, y: p.y + 6 });
  const von = await bild('seite', { x: -220, y: -60, z: 0 });
  const bis = await bild('seite', { x: 220, y: -60, z: 0 });
  await seite.keyboard.press('l');
  await schritt(
    'Loop 4 schneiden und sofort greifen (obere Kreuzung, 6 Einheiten hinauf)',
    async () => {
      await ziehen(von, bis, 6);
      await seite.mouse.move(gx, gy);
      const tDruck = await seite.evaluate(() => performance.now());
      const td = Date.now();
      await seite.mouse.down();
      const druecken = Date.now() - td;
      const z1 = await K('zeiten');
      for (let i = 1; i <= 4; i++) {
        await seite.mouse.move(gx + ((gx2 - gx) * i) / 4, gy + ((gy2 - gy) * i) / 4);
        await seite.waitForTimeout(16);
      }
      // halten, bis der Griff begonnen hat, dann noch 800 ms
      const tw = Date.now();
      for (let k = 0; k < 160 && (await K('zeiten')).griffWartet; k++) await seite.waitForTimeout(50);
      const gewartet = Date.now() - tw;
      await seite.waitForTimeout(800);
      const z2 = await K('zeiten');
      await seite.mouse.up();
      const fern = await seite.evaluate((t) => window.__rec.bewegt.filter((b) => b.t >= t).map((b) => b.fern), tDruck);
      return (
        `Drücken ${druecken} ms, zerlegt beim Greifen ${z2.zerlegen} ms; der Griff ${z1.griffWartet ? `wartete auf die gesetzte Haut (noch ${gewartet} ms nach den Mausschritten)` : 'begann sofort'}; ` +
        `fern vom Griff je Bild ab dem Drücken: ${fern.length ? fern.slice(0, 14).map((x) => x.toFixed(2)).join(' ') : 'nichts'}${fern.length > 14 ? ' …' : ''} (größter ${fern.length ? Math.max(...fern).toFixed(2) : '0'})`
      );
    },
    { unter: fernAb },
  );
}
const sym = await K('symmetrie');
console.log(`Spiegelgleichheit ${typeof sym === 'number' ? sym.toExponential(1) : JSON.stringify(sym)} · Konsole: ${fehler.length ? fehler.slice(0, 3).join(' | ') : 'keine Fehler'}`);
await browser.close();
