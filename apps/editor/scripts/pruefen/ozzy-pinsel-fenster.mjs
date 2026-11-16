// Ozzy, Phase 6 (16.11.2026): der Pinsel „Ziehen“ an der Blase. Er fasst den nächsten Punkt einer Linie im Pinsel und zieht ihn mit dem
// Einfluss O des Werks (Punkte und Griffspitzen im Radius gehen weich mit), im Blatt der Achse, die der Kamera am meisten zugewandt ist.
// An einer gezeichneten Kugel (nur die Linie der Mitte) und an „teat firefish“ (NAME); dort derselbe Zug im Prüffenster.
// Kriterien (je Form):
//   1  Über der Haut nahe einer Linie zeigt der Hauch den Pinsel, und es gibt einen Punkt, den er fassen würde.
//   2  Drücken und 20 Bildpunkte nach oben ziehen: der Punkt bewegt sich, ein Schritt; O danach wieder aus. (Die Höhenlinien beim
//      Ziehen hat Florian am 16.11. wieder herausgenommen: „too much“, nur die Seifenhaut mit ihrem Regenbogen.)
//   3  ⌘Z: die Haut genau wie vorher.
//   4  (nur „teat firefish“) Derselbe Zug im Prüffenster (derselbe Punkt gewählt, O an, derselbe Radius, dieselbe Verschiebung im Blatt):
//      dieselben Linien (höchstens 0,01) und gleich viele umgeschlagene Dreiecke.
//   5  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-pinsel-fenster.mjs [ordner für Bilder]
//   OZZY_URL (Standard http://localhost:5205/ozzy.html), KURVEN_URL (Standard http://localhost:5205/kurven.html?gewichte=geometrie&behalten=0)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const ozzyUrl = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const kurvenUrl = process.env.KURVEN_URL ?? 'http://localhost:5205/kurven.html?gewichte=geometrie&behalten=0';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const fehler = [];
const neueSeite = async () => {
  const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  s.on('pageerror', (e) => fehler.push(String(e)));
  return s;
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => x.toFixed(2).replace('.', ',');
const ze = (x) => (Number.isFinite(x) ? x.toExponential(1).replace('.', ',') : 'andere Zahl');
const groesster = (A, B) => {
  if (!A || !B || A.length !== B.length) return Infinity;
  let m = 0;
  for (let i = 0; i < A.length; i += 3) m = Math.max(m, Math.hypot(A[i] - B[i], A[i + 1] - B[i + 1], A[i + 2] - B[i + 2]));
  return m;
};
const blatt = (a, p) => (a === 'seite' ? [p.x, -p.y] : a === 'front' ? [p.z, -p.y] : [p.x, p.z]);
const unterschied = (A, B) => {
  if (A.length !== B.length) return Infinity;
  let m = 0;
  for (let k = 0; k < A.length; k++) {
    if (A[k].punkte.length !== B[k].punkte.length) return Infinity;
    A[k].punkte.forEach((p, i) => {
      const q = B[k].punkte[i];
      m = Math.max(m, Math.hypot(p.ref.x - q.ref.x, p.ref.y - q.ref.y, p.ref.z - q.ref.z));
    });
  }
  return m;
};

const oz = await neueSeite();
const O = (f, ...a) => oz.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const ruhigO = async () => {
  await oz.waitForTimeout(250);
  await oz.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await oz.waitForTimeout(150);
  await oz.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
};
const linienO = async () => (await O('werkLinienDaten')).map((l) => ({ id: l.id, punkte: l.punkte.map((p) => ({ ref: { x: p.x, y: p.y, z: p.z } })) }));

/** der Pinsel an einer Form: über den Punkt mit dem größten z (vorn), drücken, 20 px nach oben, loslassen, ⌘Z */
async function pinselProbe(name, mitPruefung) {
  // die Punkte von vorn nach hinten (größtes z zuerst); der erste, den der Pinsel von hier aus fasst (die Kamera sieht schräg)
  const L0 = await O('werkLinienDaten');
  const kandidaten = L0.flatMap((l) => l.punkte.filter((p) => p.sichtbar).map((p) => ({ l, p }))).sort((u, w) => w.p.z - u.p.z);
  let x = 0;
  let y = 0;
  let p1 = null;
  for (const k of kandidaten.slice(0, 16)) {
    const q = await O('werkImBild', { x: k.p.x, y: k.p.y, z: k.p.z });
    // etwas neben dem Punkt auf der Haut
    x = q.x + 3;
    y = q.y + 2;
    await oz.mouse.move(x - 30, y + 30);
    await oz.waitForTimeout(150);
    await oz.mouse.move(x, y, { steps: 6 });
    await oz.waitForTimeout(450);
    p1 = await O('pinsel');
    if (p1.ziel) break;
  }
  ok(`${name} 1 über der Haut: der Hauch zeigt den Pinsel, ein Punkt zum Fassen`, p1.hauch > 0.5 && !!p1.ziel, `Hauch ${z2(p1.hauch)}, Radius ${z2(p1.radius)}, Punkt ${p1.ziel ? `${p1.ziel.id}.${p1.ziel.i}${p1.ziel.m ? ' (Spiegelbild)' : ''}` : 'keiner'}`);
  if (!p1.ziel) return null;
  const hautVor = (await O('werkRoh')).pos;
  const Lv = await linienO();
  const s0 = (await O('bearbeiten')).schritte;
  await oz.mouse.down();
  await oz.waitForTimeout(80);
  for (let k = 1; k <= 20; k++) {
    await oz.mouse.move(x, y - k);
    await oz.waitForTimeout(30);
  }
  await oz.waitForTimeout(300);
  const imZug = await O('pinsel');
  if (ordner) await oz.screenshot({ path: `${ordner}/ozzy-pinsel-${name}-zug.png` });
  await oz.mouse.up();
  await ruhigO();
  await oz.waitForTimeout(500);
  const nach = await O('pinsel');
  const Ln = await linienO();
  const s1 = (await O('bearbeiten')).schritte;
  const vorP = Lv.find((l) => l.id === p1.ziel.id).punkte[p1.ziel.i].ref;
  const nachP = Ln.find((l) => l.id === p1.ziel.id).punkte[p1.ziel.i].ref;
  const weg = Math.hypot(nachP.x - vorP.x, nachP.y - vorP.y, nachP.z - vorP.z);
  const umO = (await O('werk')).umgeschlagen;
  ok(
    `${name} 2 gezogen: der Punkt bewegt sich, ein Schritt, O danach aus`,
    weg > 1 && s1 === s0 + 1 && imZug.zug && !nach.oAn,
    `Punkt ${z2(weg)} Einheiten im Blatt ${imZug.blatt}, Schritte ${s0} → ${s1}; umgeschlagen ${umO}`,
  );
  if (ordner) await oz.screenshot({ path: `${ordner}/ozzy-pinsel-${name}-nach.png` });
  // für den Vergleich: was das Prüffenster tun soll
  const vergleich = { id: p1.ziel.id, i: p1.ziel.i, m: p1.ziel.m, a: imZug.blatt, radius: p1.radius, vor: vorP, nach: nachP, Ln, umO };
  await oz.keyboard.press('Meta+z');
  await ruhigO();
  const hautZ = (await O('werkRoh')).pos;
  const d3 = groesster(hautZ, hautVor);
  ok(`${name} 3 ⌘Z: die Haut genau wie vorher`, d3 <= 1e-9 && (await O('bearbeiten')).schritte === s0, `größter Unterschied ${ze(d3)}`);
  return mitPruefung ? vergleich : null;
}

// ---------- eine gezeichnete Kugel ----------
await oz.goto(ozzyUrl);
await oz.waitForFunction(() => !!window.__ozzy);
await oz.evaluate(() => document.fonts.ready);
await oz.evaluate(() => {
  const o = window.__ozzy;
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const r = 150;
  const k = 0.5523 * r;
  o.form([
    { x: cx + r, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + r, ein: [k, 0], aus: [-k, 0] },
    { x: cx - r, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - r, ein: [-k, 0], aus: [k, 0] },
  ]);
  o.aufblasen();
});
await oz.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 60000 });
await ruhigO();
await oz.waitForTimeout(800);
await pinselProbe('Kugel', false);

// ---------- „teat firefish“, dazu das Prüffenster ----------
await oz.goto(`${ozzyUrl}?form=${encodeURIComponent(NAME)}`);
await oz.waitForFunction(() => !!window.__ozzy);
await ruhigO();
await oz.waitForTimeout(800);
const v = await pinselProbe(NAME.replace(/\s+/g, '-'), true);

if (v) {
  const pf = await neueSeite();
  await pf.goto(kurvenUrl);
  await pf.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
  const K = (f, ...a) => pf.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
  const ruhigP = async () => {
    await pf.waitForTimeout(250);
    await pf.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
    await pf.waitForTimeout(150);
    await pf.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 120000 });
  };
  await pf.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
  await ruhigP();
  await pf.keyboard.press('Home');
  await pf.waitForTimeout(300);
  const sp = (p) => (v.m ? { x: p.x, y: p.y, z: -p.z } : p);
  const vor = sp(v.vor);
  const nach = sp(v.nach);
  const [X0, Y0] = blatt(v.a, vor);
  const [X1, Y1] = blatt(v.a, nach);
  // Maßstab des Blatts aus zwei Bildern
  const s0 = await K('bild', v.a, vor);
  const e1 = v.a === 'seite' ? { x: vor.x + 1, y: vor.y, z: vor.z } : v.a === 'front' ? { x: vor.x, y: vor.y, z: vor.z + 1 } : { x: vor.x + 1, y: vor.y, z: vor.z };
  const e2 = v.a === 'seite' ? { x: vor.x, y: vor.y - 1, z: vor.z } : v.a === 'front' ? { x: vor.x, y: vor.y - 1, z: vor.z } : { x: vor.x, y: vor.y, z: vor.z + 1 };
  const s1 = await K('bild', v.a, e1);
  const s2 = await K('bild', v.a, e2);
  const sx = s1.x - s0.x;
  const sy = s2.y - s0.y;
  // den Punkt wählen (Klick), O an, Radius wie in Ozzy, ziehen
  await pf.mouse.click(s0.x, s0.y);
  await pf.waitForTimeout(300);
  await ruhigP();
  await pf.keyboard.press('o');
  await K('setzeRadius', v.radius);
  await pf.mouse.move(s0.x, s0.y);
  await pf.waitForTimeout(200);
  await pf.mouse.down();
  for (let k = 1; k <= 20; k++) {
    await pf.mouse.move(s0.x + ((X1 - X0) * sx * k) / 20, s0.y + ((Y1 - Y0) * sy * k) / 20);
    await pf.waitForTimeout(30);
  }
  await pf.waitForTimeout(300);
  await pf.mouse.up();
  await ruhigP();
  const P = (await K('loops')).map((l) => ({ id: l.id, punkte: l.punkte.map((p) => ({ ref: p.ref })) }));
  const umP = await K('umgeschlagen');
  const d4 = unterschied(v.Ln, P);
  ok(`${NAME} 4 derselbe Zug im Prüffenster: dieselben Linien, gleich viele umgeschlagene Dreiecke`, d4 <= 0.01 && umP === v.umO, `größter Unterschied ${ze(d4)}; umgeschlagen Ozzy ${v.umO}, Prüffenster ${umP}`);
}
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
