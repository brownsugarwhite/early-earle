// Form zuerst (06.11.2026), Kante (bis zum Abend Härte 0–3; Florian: „die Härte hat bei mir noch nicht die erwartete Wirkung … Ich glaube, die Härte
// funktioniert noch nicht, wie sie soll.“). Mit der Maus wie er: Kugel, drei Loops (Rand = Ring waagerecht, Mitte, Ring senkrecht),
// den Rand anklicken und mit K die Kante an- oder ausschalten.
// pilz-hart: Rand hart (3), dann die Unterseite hinauf (Pilz ohne Ecken). pilz-weich: dasselbe weich.
// nachher: erst die Unterseite hinauf, dann der Rand hart, dann ein winziger Zug.
// linse-hart / linse-weich: Rand hart bzw. weich, oben und unten zur Mitte gedrückt (eine Linse mit Kante am Rand).
// Je Schritt: Knick quer über den Rand (Median, kleinster, größter je Probe), Knicke über 60°, umgeklappt; Bilder.
// Aufruf aus apps/editor: node scripts/pruefen/form-haerte-probe.mjs <ordner> [fall …]
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const faelle = process.argv.length > 3 ? process.argv.slice(3) : ['pilz-hart', 'pilz-weich', 'nachher', 'linse-hart', 'linse-weich'];
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));

const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const loops = () => K('loops');
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 40) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  await seite.waitForTimeout(150);
};
/** Knick quer über einen Loop (Grad je Probe): Median, kleinster, größter; dazu Knicke über 60° und umgeklappte Dreiecke im Netz */
const messen = async (id) => {
  const k = (await K('knick', id)).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const netz = await seite.evaluate(() => {
    const P = window.__kurven.lagen();
    const T = window.__kurven.dreiecke();
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
    for (let t = 0; t < T.length / 3; t++)
      for (let e = 0; e < 3; e++) {
        const a = T[3 * t + e];
        const b = T[3 * t + ((e + 1) % 3)];
        const s = a < b ? `${a},${b}` : `${b},${a}`;
        const l = kanten.get(s);
        if (l) l.push(t);
        else kanten.set(s, [t]);
      }
    let ueber60 = 0;
    for (const ts of kanten.values()) {
      if (ts.length !== 2) continue;
      const [p, q] = [n[ts[0]], n[ts[1]]];
      if (p[0] * q[0] + p[1] * q[1] + p[2] * q[2] < 0.5) ueber60++;
    }
    return { ueber60, umgeklappt: window.__kurven.umgeschlagen(), masse: window.__kurven.masse() };
  });
  const q = (f) => (k.length ? k[Math.floor(f * (k.length - 1))].toFixed(1) : '-');
  return `Knick quer über den Rand: Median ${q(0.5)}°, 10 % ${q(0.1)}°, größter ${q(1)}° · über 60° ${netz.ueber60} · umgeklappt ${netz.umgeklappt} · Maße ${netz.masse.map((x) => x.toFixed(0)).join('/')}`;
};
const foto = async (name) => {
  await seite.screenshot({ path: `${ordner}/form-haerte-${name}-2026-11-06.jpg`, type: 'jpeg', quality: 85 });
};

/** Kugel, drei Loops; Rand = Ring waagerecht */
const aufbau = async () => {
  await seite.goto(basis);
  await seite.waitForFunction(() => window.__kurven !== undefined);
  await seite.waitForTimeout(400);
  await seite.keyboard.press('l');
  await ziehen(xy(await bild('seite', { x: -200, y: 0, z: 0 })), xy(await bild('seite', { x: 200, y: 0, z: 0 })), 6);
  await seite.keyboard.press('l');
  await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
  await seite.keyboard.press('l');
  await ziehen(xy(await bild('seite', { x: 10, y: 200, z: 0 })), xy(await bild('seite', { x: 10, y: -200, z: 0 })), 6);
  await seite.keyboard.press('Escape');
  const L = await loops();
  const rand = L.find((l) => l.art === 'ring' && l.punkte.every((p) => Math.abs(p.ref.y) < 30));
  const senkrecht = L.find((l) => l.art === 'ring' && l !== rand);
  return { rand, senkrecht };
};
/** den Rand anklicken (in der Seite auf der Linie zwischen zwei Kreuzungen) und die Kante an (`an`) oder aus stellen */
const haerte = async (rand, an) => {
  await seite.keyboard.press('Escape');
  await seite.mouse.click(...xy(await bild('seite', { x: -80, y: 0, z: 120 })));
  await seite.waitForTimeout(450);
  const a = await K('auswahl');
  const vorher = (await loops()).find((q) => q.id === rand.id);
  if (!!vorher.kante !== an) await seite.keyboard.press('k');
  await seite.waitForTimeout(150);
  const l = (await loops()).find((q) => q.id === rand.id);
  await seite.keyboard.press('Escape');
  return `Auswahl ${JSON.stringify(a)}, Kante des Rands ${l.kante} (Punkte ${l.punkte.map((p) => p.kante ?? '–').join(' ')})`;
};
const punktVon = async (id, wahl) => {
  const l = (await loops()).find((q) => q.id === id);
  return l.punkte.filter((p) => p.sichtbar !== false).reduce((b, p) => (wahl(p.ref) > wahl(b.ref) ? p : b));
};
const untenHinauf = async (senkrecht, d) => {
  const p = await punktVon(senkrecht.id, (r) => -r.y);
  await ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, y: p.ref.y + d })));
  await seite.keyboard.press('Escape');
};
const obenHinab = async (senkrecht, d) => {
  const p = await punktVon(senkrecht.id, (r) => r.y);
  await ziehen(xy(await bild('seite', p.ref)), xy(await bild('seite', { ...p.ref, y: p.ref.y - d })));
  await seite.keyboard.press('Escape');
};

for (const fall of faelle) {
  console.log(`######## ${fall}`);
  const { rand, senkrecht } = await aufbau();
  if (fall === 'pilz-hart' || fall === 'pilz-weich') {
    console.log(`  ${await haerte(rand, fall === 'pilz-hart')}`);
    console.log(`  vorher: ${await messen(rand.id)}`);
    await untenHinauf(senkrecht, 120);
    console.log(`  unten +120: ${await messen(rand.id)}`);
    await foto(fall);
  } else if (fall === 'nachher') {
    await untenHinauf(senkrecht, 120);
    console.log(`  weich, unten +120: ${await messen(rand.id)}`);
    console.log(`  ${await haerte(rand, true)}`);
    console.log(`  danach Rand hart (neu gerechnet in ${(await K('zeiten')).neuRechnen} ms): ${await messen(rand.id)}`);
    await foto('nachher-hart');
    await untenHinauf(senkrecht, 2);
    console.log(`  und unten +2: ${await messen(rand.id)}`);
    await foto('nachher-zug');
  } else if (fall === 'linse-hart' || fall === 'linse-weich') {
    console.log(`  ${await haerte(rand, fall === 'linse-hart')}`);
    await obenHinab(senkrecht, 70);
    await untenHinauf(senkrecht, 70);
    console.log(`  oben −70, unten +70: ${await messen(rand.id)}`);
    await foto(fall);
  } else if (fall === 'loeschen') {
    // eine Form auf der Seite (Kreis um (−60, 70), mit Abstand zu den anderen Loops), mit G in der Front 20 nach außen, dann löschen
    await seite.keyboard.press('f');
    const kreis = [];
    for (let i = 0; i <= 64; i++) kreis.push(xy(await bild('seite', { x: -60 + 35 * Math.cos((2 * Math.PI * i) / 64), y: 70 + 35 * Math.sin((2 * Math.PI * i) / 64), z: 0 })));
    await seite.mouse.move(...kreis[0]);
    await seite.mouse.down();
    for (const p of kreis.slice(1)) await seite.mouse.move(...p);
    await seite.mouse.up();
    await seite.waitForTimeout(400);
    const z0 = Math.sqrt(150 ** 2 - 60 ** 2 - 70 ** 2);
    const [ax, ay] = xy(await bild('front', { x: -60, y: 70, z: z0 }));
    const [bx, by] = xy(await bild('front', { x: -60, y: 70, z: z0 + 20 }));
    await seite.mouse.move(ax, ay);
    await seite.keyboard.press('g');
    for (let i = 1; i <= 20; i++) await seite.mouse.move(ax + ((bx - ax) * i) / 20, ay + ((by - ay) * i) / 20);
    await seite.mouse.click(bx, by);
    await seite.waitForTimeout(300);
    /** größter Abstand zur Kugel (Radius 150) um die Form */
    const beule = () =>
      seite.evaluate(() => {
        const P = window.__kurven.lagen();
        let m = 0;
        for (let v = 0; v < P.length / 3; v++) {
          const [x, y, z] = [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
          if (z > 0 && Math.hypot(x + 60, y - 70) < 45) m = Math.max(m, Math.abs(Math.hypot(x, y, z) - 150));
        }
        return m;
      });
    const vorher = await beule();
    const n0 = (await loops()).length;
    await seite.keyboard.press('Backspace');
    await seite.waitForTimeout(300);
    const z = await K('zeiten');
    console.log(`  Form 20 hinaus: Beule ${vorher.toFixed(1)} · gelöscht (${n0} → ${(await loops()).length} Loops): Beule ${(await beule()).toFixed(1)} · neu gerechnet in ${z.neuRechnen} ms (zerlegen ${z.zerlegen} ms, ${z.bereich} Punkte) · ${await messen(rand.id)}`);
    await foto('loeschen');
  }
}
console.log('Fehler im Fenster:', fehler.length ? fehler.slice(0, 5) : 'keine');
await browser.close();
