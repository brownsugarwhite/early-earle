// Form zuerst (06.11.2026), Florians Explosion (`kurven.html`): Bei einfachen Formen verknittert die Haut, „explodiert“, und die Seite
// hängt sich auf. Nachgestellt mit der Maus: Kugel, drei Loops (Ring waagerecht, Mitte, Ring senkrecht), dann weite Züge an den
// Kreuzungen wie in seinen Bildern, mit vielen Mausschritten (jede Bewegung ist ein Schritt des Lösers).
// FALL=a: hintere Kreuzung weit nach hinten und Ecke, vordere nach vorn, obere weit nach vorn (Bild „Ei mit Überhang“).
// FALL=b: neuer Punkt auf der Mitte zwischen oben und vorn, weit nach vorn gezogen, dann der Rücken nach hinten (Bild „Schnabel“).
// FALL=c: Schnabel wie b, dann die Griffe an der Spitze herumgedreht: die Linie schlägt eine Schlaufe (erstes Bild, Explosion).
// FALL=d: Stauchen. FALL=e: Rüssel mit Ring, Spitze weiter hinaus, mit GRIFF=<Grad> (in der Seite, wie mit der Maus) der Griff an
// der Spitze gedreht (Florians Bild: die Spitze stülpte sich um). FALL=f: Rüssel kurz, Ring um den Ansatz, Spitze weit hinaus.
// FALL=g: Hammer, nur in der Seite gezogen (Ecken oben vorn und vorn unten, Unterkante hohl); HAMMER=lang: der Kopf weit vorn.
// FALL=p: Pilz (Florians Bild vom 06.11.): Ecken an den vier Kreuzungen des Rands, dort knicken die kreuzenden Linien (KNICK=0: nur
// Ecken, ohne Knick), dann die Unterseite hinauf. Vorher blähte sich der Rand zwischen den Ecken zu Polstern auf.
// Zusammenlegen zu kurzer Kanten zum Vergleich aus: KURVEN_URL='http://localhost:5193/kurven.html?kurz=0'.
// Ohne Verdichten: KURVEN_URL='http://localhost:5193/kurven.html?verdichten=0'. WO=1 nennt die Orte der Knicke über 60°. NAH=x,y,zoom
// mit NAH_BEI=<Bildname>: Seite und Top beim Bild auf diese Stelle.
// Je Zug: Dauer, Punkte, Stufen, Zerlegen, Bereich, größter Knick, Knicke über 60°, umgeklappte Dreiecke, Ausdehnung.
// Aufruf aus apps/editor: node scripts/pruefen/form-explosion-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const fall = process.env.FALL ?? 'a';
const schritte = Number(process.env.SCHRITTE ?? 60);
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
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
const loops = () => K('loops');
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = schritte) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(100);
};

/** Knicke zwischen Nachbardreiecken (Grad): größter, 99 %, Zahl über 60°; dazu umgeklappte Dreiecke und Ausdehnung */
const vermessen = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const P = k.lagen();
    const T = k.dreiecke();
    const n = [];
    for (let i = 0; i < T.length; i += 3) {
      const [a, b, c] = [T[i], T[i + 1], T[i + 2]];
      const ab = [P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]];
      const ac = [P[3 * c] - P[3 * a], P[3 * c + 1] - P[3 * a + 1], P[3 * c + 2] - P[3 * a + 2]];
      const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const l = Math.hypot(...f) || 1;
      n.push(f.map((x) => x / l));
    }
    const kanten = new Map();
    for (let t = 0; t < T.length / 3; t++) {
      for (let e = 0; e < 3; e++) {
        const a = T[3 * t + e];
        const b = T[3 * t + ((e + 1) % 3)];
        const s = a < b ? `${a},${b}` : `${b},${a}`;
        const l = kanten.get(s);
        if (l) l.push(t);
        else kanten.set(s, [t]);
      }
    }
    const w = [];
    const wo = [];
    for (const ts of kanten.values()) {
      if (ts.length !== 2) continue;
      const [p, q] = [n[ts[0]], n[ts[1]]];
      const g = (Math.acos(Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]))) * 180) / Math.PI;
      w.push(g);
      if (g > 60) {
        const t = T.slice(3 * ts[0], 3 * ts[0] + 3);
        wo.push(t.reduce((s2, v) => [s2[0] + P[3 * v] / 3, s2[1] + P[3 * v + 1] / 3, s2[2] + Math.abs(P[3 * v + 2]) / 3], [0, 0, 0]).map((x) => Math.round(x / 20) * 20));
      }
    }
    w.sort((x, y) => x - y);
    return {
      max: w[w.length - 1],
      p99: w[Math.floor(0.99 * (w.length - 1))],
      ueber60: w.filter((x) => x > 60).length,
      umgeschlagen: k.umgeschlagen(),
      masse: k.masse(),
      wo: [...new Set(wo.map((q) => q.join(',')))].slice(0, 12),
    };
  });

const zeile = async (name, ms) => {
  const z = await K('zeiten');
  const m = await vermessen();
  const zug = z.zug.slice(-schritte);
  const mittel = zug.reduce((s, v) => s + v, 0) / Math.max(1, zug.length);
  console.log(
    `${name}: ${ms} ms gesamt · Punkte ${z.punkte} · Stufen ${z.stufen} (letzte ${z.stufeMs} ms) · zerlegen ${z.zerlegen} ms · Bereich ${z.bereich} · ` +
      `je Bewegung ${mittel.toFixed(1)} ms (max ${Math.max(...zug).toFixed(0)}) · Knick max ${m.max.toFixed(0)}°, p99 ${m.p99.toFixed(1)}°, über 60° ${m.ueber60} · ` +
      `umgeklappt ${m.umgeschlagen} · Maße ${m.masse.join('/')}`,
  );
  if (process.env.WO && m.wo.length) console.log(`  Knicke über 60° bei (x, y, |z|, auf 20 gerundet): ${m.wo.join(' | ')}`);
};
const schnell = async (name, f) => {
  const t0 = Date.now();
  await f();
  await zeile(name, Date.now() - t0);
  // RUHE=<ms>: danach noch einmal messen, wenn sich das verdichtete Netz in der Ruhe gesetzt hat
  if (process.env.RUHE) {
    await seite.waitForTimeout(Number(process.env.RUHE));
    await zeile(`  nach ${process.env.RUHE} ms Ruhe (setzen ${(await K('zeiten')).nachLoesen} ms)`, 0);
  }
};
const foto = async (name) => {
  // NAH=x,y,zoom: Seite und Top auf diese Stelle (Top bei z = 0), nur beim Bild NAH_BEI (sonst zielen die folgenden Züge daneben)
  if (process.env.NAH && name === (process.env.NAH_BEI ?? name)) {
    const [nx, ny, nz] = process.env.NAH.split(',').map(Number);
    await K('ausschnitt', 'seite', { cx: nx, cy: -ny, zoom: nz });
    await K('ausschnitt', 'top', { cx: nx, cy: 0, zoom: nz });
  }
  await seite.screenshot({ path: `${ordner}/form-explosion-${fall}-${name}-2026-11-06.jpg`, type: 'jpeg', quality: 85 });
};

// ---------- Aufbau: Ring waagerecht (Seite), Mitte (Top), Ring senkrecht (Seite) ----------
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: -200, y: 0, z: 0 })), xy(await bild('seite', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 10, y: 200, z: 0 })), xy(await bild('seite', { x: 10, y: -200, z: 0 })), 6);
await seite.keyboard.press('Escape');
await zeile('Aufbau', 0);

const L0 = await loops();
const waagerecht = L0.find((l) => l.art === 'ring' && l.punkte.every((p) => Math.abs(p.ref.y) < 30));
const senkrecht = L0.find((l) => l.art === 'ring' && l !== waagerecht);
const punktVon = async (id, wahl) => {
  const l = (await loops()).find((q) => q.id === id);
  // nur Punkte, die man sieht (die Enden eines Rings ohne Kreuzung halten nur Griffe)
  return l.punkte.filter((p) => p.sichtbar !== false).reduce((b, p) => (wahl(p.ref) > wahl(b.ref) ? p : b));
};

if (fall === 'a') {
  // hintere Kreuzung (+x) weit nach hinten, dann Ecke
  let p = await punktVon(waagerecht.id, (q) => q.x);
  await schnell('hinten +150', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x + 150 }))));
  p = await punktVon(waagerecht.id, (q) => q.x);
  await seite.keyboard.down('Alt');
  await seite.mouse.click(...xy(await bild('seite', p.ref)));
  await seite.keyboard.up('Alt');
  await seite.waitForTimeout(150);
  await seite.keyboard.press('Escape');
  await zeile('hinten Ecke', 0);
  // vordere Kreuzung (−x) nach vorn
  p = await punktVon(waagerecht.id, (q) => -q.x);
  await schnell('vorn −100', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x - 100 }))));
  await seite.keyboard.press('Escape');
  // obere Kreuzung weit nach vorn (über die vordere hinaus)
  p = await punktVon(senkrecht.id, (q) => q.y);
  await schnell('oben −300', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x - 300, y: p.ref.y - 20 }))));
  await foto('1');
  // und noch einmal zurück und wieder hin (Florian zieht mehrmals)
  p = await punktVon(senkrecht.id, (q) => q.y);
  await schnell('oben +120', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x + 120 }))));
  p = await punktVon(senkrecht.id, (q) => q.y);
  await schnell('oben −150', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x - 150, y: p.ref.y + 30 }))));
  await foto('2');
} else if (fall === 'e') {
  // Rüssel (Florians Bild vom 06.11.): neuer Punkt auf der Mitte zwischen oben und vorn, weit nach vorn gezogen (lang und dünn),
  // dann ein Ring quer um den Rüssel. Im Top zeigte sich ein schwarzes, umgestülptes Ende.
  const mitte = L0.find((l) => l.art === 'mitte');
  const q = { x: 150 * Math.SQRT1_2, y: 150 * Math.SQRT1_2, z: 0 };
  const [cx, cy] = xy(await bild('seite', q));
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(60);
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(300);
  await seite.keyboard.press('Escape');
  const p = await punktVon(mitte.id, (r) => -Math.hypot(r.x - q.x, r.y - q.y));
  await schnell('Rüssel +320/−70', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x + 320, y: p.ref.y - 70 }))));
  await foto('1');
  await seite.keyboard.press('l');
  await schnell('Ring um den Rüssel', async () => ziehen(xy(await bild('seite', { x: 230, y: 160, z: 0 })), xy(await bild('seite', { x: 220, y: -60, z: 0 })), 6));
  await seite.keyboard.press('Escape');
  await foto('2');
  // danach die Spitze weiter hinaus und den Rüssel unten flach (wie in Florians Bild: Unterkante gerade bis zur Spitze)
  let s = await punktVon(mitte.id, (r) => r.x);
  await schnell('Spitze +120', async () => ziehen(xy(await bild('seite', s.ref)), xy(await bild('seite', { ...s.ref, x: s.ref.x + 120, y: s.ref.y - 20 }))));
  s = await punktVon(mitte.id, (r) => r.x);
  await schnell('Spitze +80/−20', async () => ziehen(xy(await bild('seite', s.ref)), xy(await bild('seite', { ...s.ref, x: s.ref.x + 80, y: s.ref.y - 20 }))));
  await foto('3');
  // die Griffe an der Spitze senkrecht stellen (wie in Florians Bild): Punkt wählen, den Griff „aus“ nach oben drehen
  if (process.env.GRIFF) {
    await K('ausschnitt', 'seite', { cx: 380, cy: -60, zoom: 1.6 });
    const m1 = (await loops()).find((l) => l.id === mitte.id);
    const i = m1.punkte.reduce((b, r, k) => (r.sichtbar !== false && (b < 0 || r.ref.x > m1.punkte[b].ref.x) ? k : b), -1);
    await seite.mouse.click(...xy(await bild('seite', m1.punkte[i].ref)));
    await seite.waitForTimeout(450);
    for (const g of ['aus', 'ein']) {
      const pos = await seite.evaluate(
        ([id2, i2, g2]) => {
          const e = document.querySelector(`#blatt-seite rect.griff[data-l="${id2}"][data-i="${i2}"][data-g="${g2}"]`);
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return [r.left + r.width / 2, r.top + r.height / 2];
        },
        [mitte.id, i, g],
      );
      console.log(`Griff ${g} an der Spitze: ${pos ? pos.map((v) => v.toFixed(0)).join(', ') : 'fehlt'}`);
    }
    const tip = xy(await bild('seite', m1.punkte[i].ref));
    const aus = await seite.evaluate(
      ([id2, i2]) => {
        const e = document.querySelector(`#blatt-seite rect.griff[data-l="${id2}"][data-i="${i2}"][data-g="aus"]`);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      },
      [mitte.id, i],
    );
    if (aus) {
      const len = Math.hypot(aus[0] - tip[0], aus[1] - tip[1]);
      // GRIFF=oben|unten: senkrecht nach oben bzw. herumgeklappt nach unten; GRIFF=<Grad>: um so viel gedreht (wie mit der Maus)
      const grad = Number(process.env.GRIFF);
      let ziel;
      if (Number.isFinite(grad)) {
        const a = Math.atan2(aus[1] - tip[1], aus[0] - tip[0]) + (grad * Math.PI) / 180;
        ziel = [tip[0] + len * Math.cos(a), tip[1] + len * Math.sin(a)];
      } else ziel = process.env.GRIFF === 'oben' ? [tip[0], tip[1] - len] : [tip[0], tip[1] + len];
      await schnell(`Griff aus ${process.env.GRIFF}`, async () => ziehen(aus, ziel));
      const L2 = (await loops()).find((l) => l.id === mitte.id);
      console.log(`  Mitte: ${L2.punkte.length} Punkte`);
    }
    await foto('4');
  }
} else if (fall === 'f') {
  // Rüssel anders herum: erst kurz herausziehen, dann der Ring um den Ansatz, dann die Spitze weit hinaus (die Haut zwischen Ring
  // und Spitze wird lang gedehnt)
  const mitte = L0.find((l) => l.art === 'mitte');
  const q = { x: 150 * Math.SQRT1_2, y: 150 * Math.SQRT1_2, z: 0 };
  const [cx, cy] = xy(await bild('seite', q));
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(60);
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(300);
  await seite.keyboard.press('Escape');
  let p = await punktVon(mitte.id, (r) => -Math.hypot(r.x - q.x, r.y - q.y));
  await schnell('Rüssel kurz +120/−50', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x + 120, y: p.ref.y - 50 }))));
  await seite.keyboard.press('l');
  await schnell('Ring um den Ansatz', async () => ziehen(xy(await bild('seite', { x: 175, y: 140, z: 0 })), xy(await bild('seite', { x: 170, y: -40, z: 0 })), 6));
  await seite.keyboard.press('Escape');
  p = await punktVon(mitte.id, (r) => r.x);
  await schnell('Spitze weit +330/−10', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x + 330, y: p.ref.y - 10 }))));
  await K('ausschnitt', 'seite', { cx: 300, cy: -60, zoom: 0.9 });
  await K('ausschnitt', 'top', { cx: 300, cy: 0, zoom: 0.9 });
  await foto('1');
} else if (fall === 'g') {
  // Hammer (Florians Bild vom 06.11.): nur in der Seite gezogen — Oberkante und Vorderkante gerade (Ecken), Unterkante hohl. Im Top
  // schnürte sich der Kopf zur Mittelachse ein und stülpte sich vorn um, ohne dass dort etwas gezogen wurde. HAMMER=lang: der Kopf
  // weit vor dem Körper (lange gerade Kanten, die Ringe reichen nicht hin).
  const lang = process.env.HAMMER === 'lang';
  const mitte = L0.find((l) => l.art === 'mitte');
  // zwei neue Punkte auf der Mitte, oben vorn und unten vorn (am Anfang: auf großem Bereich zerlegt der erste Klick so lange,
  // dass Playwright den zweiten zu spät schickt)
  const neuerPunkt = async (q) => {
    const [cx, cy] = xy(await bild('seite', q));
    await seite.mouse.click(cx, cy);
    await seite.waitForTimeout(60);
    await seite.mouse.click(cx, cy);
    await seite.waitForTimeout(300);
    await seite.keyboard.press('Escape');
  };
  const oben = { x: -150 * Math.SQRT1_2, y: 150 * Math.SQRT1_2, z: 0 };
  const unten = { x: -150 * Math.SQRT1_2, y: -150 * Math.SQRT1_2, z: 0 };
  await neuerPunkt(oben);
  await neuerPunkt(unten);
  const nah = (z) => (r) => -Math.hypot(r.x - z.x, r.y - z.y);
  const ecke = async (p) => {
    await seite.keyboard.down('Alt');
    await seite.mouse.click(...xy(await bild('seite', p.ref)));
    await seite.keyboard.up('Alt');
    await seite.waitForTimeout(150);
    await seite.keyboard.press('Escape');
  };
  // Ecke oben vorn weit nach vorn, Oberkante gerade
  let p = await punktVon(mitte.id, nah(oben));
  console.log(`Punkte: oben vorn (${p.ref.x.toFixed(0)}, ${p.ref.y.toFixed(0)}), unten vorn (${(await punktVon(mitte.id, nah(unten))).ref.x.toFixed(0)}, ${(await punktVon(mitte.id, nah(unten))).ref.y.toFixed(0)})`);
  const obenZiel = { x: p.ref.x - (lang ? 300 : 130), y: p.ref.y + (lang ? 10 : 20), z: 0 };
  await schnell('oben vorn', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', obenZiel))));
  await ecke(await punktVon(mitte.id, nah(obenZiel)));
  // vordere Kreuzung nach vorn und etwas hinunter (Vorderkante gerade)
  p = await punktVon(mitte.id, nah({ x: -150, y: 0 }));
  const vornZiel = { x: p.ref.x - (lang ? 260 : 90), y: p.ref.y - 30, z: 0 };
  await schnell('vorn', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', vornZiel))));
  await ecke(await punktVon(mitte.id, nah(vornZiel)));
  if (lang) {
    await K('ausschnitt', 'top', { cx: -150, cy: 0, zoom: 0.7 });
    await K('ausschnitt', 'seite', { cx: -150, cy: 0, zoom: 0.7 });
    await foto('lang-vorn');
  }
  // der Punkt unten vorn hinauf (und mit dem Kopf nach vorn): die Unterkante unter dem Kopf wird hohl
  p = await punktVon(mitte.id, nah(unten));
  await schnell('unten vorn hinauf', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { x: lang ? -200 : -120, y: -40, z: 0 }))));
  await K('ausschnitt', 'top', { cx: lang ? -150 : -60, cy: 0, zoom: lang ? 0.7 : 0.9 });
  await K('ausschnitt', 'seite', { cx: lang ? -150 : -60, cy: 0, zoom: lang ? 0.7 : 0.9 });
  await foto(lang ? 'lang' : '1');
} else if (fall === 'p') {
  // Pilz (Florians Bild vom 06.11.): Ecken an den vier Kreuzungen des waagerechten Rings (Rand des Huts), dann die untere Kreuzung
  // hinauf (die Unterseite wird flach). Zwischen den vier Ecken blähte sich der Rand zu Polstern auf.
  const eckeBei = async (a, p) => {
    await seite.keyboard.down('Alt');
    await seite.mouse.click(...xy(await bild(a, p)));
    await seite.keyboard.up('Alt');
    await seite.waitForTimeout(200);
    await seite.keyboard.press('Escape');
  };
  const rand = (await loops()).find((l) => l.id === waagerecht.id);
  for (const p of rand.punkte.filter((q) => q.kreuzung !== null)) {
    const a = Math.abs(p.ref.z) > 50 ? 'top' : 'seite';
    await eckeBei(a, p.ref);
  }
  const r2 = (await loops()).find((l) => l.id === waagerecht.id);
  console.log(`Rand: ${r2.punkte.map((p) => `${p.ecke ? '◆' : '●'}(${p.ref.x.toFixed(0)},${p.ref.y.toFixed(0)},${p.ref.z.toFixed(0)})`).join(' ')}`);
  // an jeder Ecke den unteren Griff der Linie, die den Rand kreuzt, waagerecht nach innen drehen: dort knickt die Linie wirklich
  // (wie in Florians Bild); Mitte in der Seite (vorn, hinten), der senkrechte Ring in der Front (seitlich)
  const griffPos = async (blatt, id, i, g) =>
    seite.evaluate(
      ([b2, id2, i2, g2]) => {
        const e = document.querySelector(`#blatt-${b2} rect.griff[data-l="${id2}"][data-i="${i2}"][data-g="${g2}"]`);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      },
      [blatt, id, i, g],
    );
  if (process.env.KNICK !== '0') {
    const mitte = L0.find((l) => l.art === 'mitte');
    for (const [blatt, id, ziel] of [
      ['seite', mitte.id, { x: -150, y: 0, z: 0 }],
      ['seite', mitte.id, { x: 150, y: 0, z: 0 }],
      ['front', senkrecht.id, { x: 10, y: 0, z: 150 }],
    ]) {
      const l = (await loops()).find((q) => q.id === id);
      const i = l.punkte.reduce((b, r, k) => (Math.hypot(r.ref.x - ziel.x, r.ref.y - ziel.y, r.ref.z - ziel.z) < Math.hypot(l.punkte[b].ref.x - ziel.x, l.punkte[b].ref.y - ziel.y, l.punkte[b].ref.z - ziel.z) ? k : b), 0);
      const pp = xy(await bild(blatt, l.punkte[i].ref));
      await seite.mouse.click(...pp);
      await seite.waitForTimeout(450);
      const ein = await griffPos(blatt, id, i, 'ein');
      const aus = await griffPos(blatt, id, i, 'aus');
      const unten = [ein, aus].filter(Boolean).sort((a, b) => b[1] - a[1])[0];
      if (!unten) {
        console.log(`kein Griff an Punkt ${i} von Loop ${id}`);
        continue;
      }
      const len = Math.hypot(unten[0] - pp[0], unten[1] - pp[1]);
      const mitteBild = xy(await bild(blatt, { x: 10, y: 0, z: 0 }));
      const innen = Math.sign(mitteBild[0] - pp[0]);
      await schnell(`Griff ${blatt} Loop ${id} nach innen`, async () => ziehen(unten, [pp[0] + innen * len, pp[1]]));
      await seite.keyboard.press('Escape');
    }
  }
  let p = await punktVon(senkrecht.id, (r) => -r.y);
  await schnell('unten +120', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, y: p.ref.y + 120 }))));
  await seite.keyboard.press('Escape');
  await foto('1');
} else if (fall === 'd') {
  // Stauchen: die untere Kreuzung weit nach oben in den Körper, dann die obere nach unten (die Haut dazwischen wird gestaucht)
  let p = await punktVon(senkrecht.id, (r) => -r.y);
  await schnell('unten +150', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, y: p.ref.y + 150 }))));
  p = await punktVon(senkrecht.id, (r) => r.y);
  await schnell('oben −100', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, y: p.ref.y - 100 }))));
  await foto('1');
} else if (fall === 'c') {
  // Schnabel wie b, dann die Griffe an der Spitze weit herumdrehen: die Linie schlägt eine Schlaufe (Florians erstes Bild)
  const mitte = L0.find((l) => l.art === 'mitte');
  const q = { x: -150 * Math.SQRT1_2, y: 150 * Math.SQRT1_2, z: 0 };
  const [cx, cy] = xy(await bild('seite', q));
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(60);
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(300);
  await seite.keyboard.press('Escape');
  const p = await punktVon(mitte.id, (r) => -Math.hypot(r.x - q.x, r.y - q.y));
  await schnell('Schnabel −200/−50', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x - 200, y: p.ref.y - 50 }))));
  const griffMitte = async (id, i, g) =>
    seite.evaluate(
      ([id2, i2, g2]) => {
        const e = document.querySelector(`#blatt-seite rect.griff[data-l="${id2}"][data-i="${i2}"][data-g="${g2}"]`);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      },
      [id, i, g],
    );
  for (const [g, dx, dy] of [
    ['aus', 160, 140],
    ['ein', -60, 160],
  ]) {
    const m1 = (await loops()).find((l) => l.id === mitte.id);
    const i = m1.punkte.reduce((b, r, k) => (r.sichtbar !== false && (b < 0 || r.ref.x < m1.punkte[b].ref.x) ? k : b), -1);
    await seite.mouse.click(...xy(await bild('seite', m1.punkte[i].ref)));
    await seite.waitForTimeout(450);
    const pos = await griffMitte(mitte.id, i, g);
    if (!pos) {
      console.log(`Griff ${g} an Punkt ${i} nicht gefunden`);
      continue;
    }
    await schnell(`Griff ${g} herum`, async () => ziehen(pos, [pos[0] + dx, pos[1] + dy]));
    await seite.waitForTimeout(450);
  }
  await foto('1');
} else {
  // neuer Punkt auf der Mitte zwischen oben und vorn (Doppelklick auf die Linie), weit nach vorn und unten gezogen
  const mitte = L0.find((l) => l.art === 'mitte');
  const q = { x: -150 * Math.SQRT1_2, y: 150 * Math.SQRT1_2, z: 0 };
  const [cx, cy] = xy(await bild('seite', q));
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(60);
  await seite.mouse.click(cx, cy);
  await seite.waitForTimeout(300);
  await seite.keyboard.press('Escape');
  let p = await punktVon(mitte.id, (r) => -Math.hypot(r.x - q.x, r.y - q.y));
  console.log(`neuer Punkt auf der Mitte bei (${p.ref.x.toFixed(0)}, ${p.ref.y.toFixed(0)})`);
  await schnell('Schnabel −200/−50', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x - 200, y: p.ref.y - 50 }))));
  await foto('1');
  p = await punktVon(mitte.id, (r) => -r.x);
  await schnell('Schnabel −60/+40', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x - 60, y: p.ref.y + 40 }))));
  // hintere Kreuzung oben (Rücken) nach hinten
  p = await punktVon(senkrecht.id, (r) => r.y);
  await schnell('oben +120', async () => ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, x: p.ref.x + 120 }))));
  await foto('2');
}
console.log(fehler.length ? `Fehler: ${fehler.slice(0, 3).join(' | ')}` : 'keine Fehler in der Konsole');
await browser.close();
