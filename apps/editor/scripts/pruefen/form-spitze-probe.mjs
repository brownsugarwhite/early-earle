// Form zuerst (10.11.2026): Florians Fehler „der oberste Punkt nach oben: der Kopf bläst sich auf, explodiert, ist weg, die Seite
// hängt“ (zwei Bilder: Zacken am Umriss, dann keine Haut mehr; ein drittes: dünne Spitze mit einer Ecke oben, ein riesiges schwarzes
// Dreieck quer durchs Bild). Nachgestellt mit der Maus:
//   Kugel, drei Loops (Ring waagerecht, Mitte, Ring senkrecht) → der obere Punkt 160 hinauf (Hals) → (RING=1) ein Ring um den Hals
//   → (ECKE=1) der obere Punkt wird Ecke, (GRIFFE=<Anteil>) seine Griffe auf diesen Anteil gekürzt → der obere Punkt in ZUEGE
//   Zügen je WEIT hinauf (SCHRITTE Mausschritte je PAUSE ms, am Ende HALTEN ms gehalten).
// Mitgelesen wird in jedem Bild des Fensters: größte Koordinate, nicht endliche Lagen, Zahl der Punkte. Läuft die Haut davon
// (größte Koordinate über dem Zehnfachen der Linien, nicht endliche Lagen, viermal so viele Punkte), steht das mit dem Zeitpunkt in
// der Ausgabe, die Maus lässt los, und die Probe prüft, ob das Fenster danach noch antwortet.
// Aufruf aus apps/editor: node scripts/pruefen/form-spitze-probe.mjs <ordner für Bilder>
//   RING=1 ECKE=1 GRIFFE=0.3 ZUEGE=5 WEIT=120 SCHRITTE=40 PAUSE=16 HALTEN=600 ANSICHT=seite|front   QUER=<x>: jeder Zug dazu x zur Seite
//   KURVEN_URL (Standard http://localhost:5193/kurven.html?gewichte=geometrie; dichter mit &dreiecke=14000)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const RING = process.env.RING !== '0';
const ECKE = process.env.ECKE !== '0';
const GRIFFE = process.env.GRIFFE === undefined ? null : Number(process.env.GRIFFE);
const ZUEGE = Number(process.env.ZUEGE ?? 5);
const WEIT = Number(process.env.WEIT ?? 120);
const QUER = Number(process.env.QUER ?? 0);
const SCHRITTE = Number(process.env.SCHRITTE ?? 40);
const PAUSE = Number(process.env.PAUSE ?? 16);
const HALTEN = Number(process.env.HALTEN ?? 600);
const ansicht = process.env.ANSICHT ?? 'seite';
const name = process.env.NAME ?? 'spitze';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
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
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
const ruhig = async (ms = 120000) => {
  await seite.waitForTimeout(150);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: ms });
};
const schneiden = async (a, P, Q) => {
  await seite.keyboard.press('l');
  const [x, y] = await bild(a, { ...P, z: 0 });
  const [x2, y2] = await bild(a, { ...Q, z: 0 });
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  await seite.mouse.move(x2, y2, { steps: 8 });
  await seite.mouse.up();
  await ruhig();
};
/** im Fenster in jedem Bild mitlesen: Zeit, größte Koordinate, nicht endliche Lagen, Punkte */
const mitlesenAn = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const m = { bilder: [], laeuft: true };
    window.__mitlesen = m;
    const bild = () => {
      const p = k.roh().pos;
      let max = 0;
      let kaputt = 0;
      for (let i = 0; i < p.length; i++) {
        const v = p[i];
        if (v !== v || v === Infinity || v === -Infinity) kaputt++;
        else if ((v < 0 ? -v : v) > max) max = v < 0 ? -v : v;
      }
      m.bilder.push({ t: performance.now(), max, kaputt, punkte: p.length / 3 });
      if (m.laeuft) requestAnimationFrame(bild);
    };
    requestAnimationFrame(bild);
  });
const mitlesenAus = () =>
  seite.evaluate(() => {
    window.__mitlesen.laeuft = false;
    return window.__mitlesen.bilder;
  });
const heil = () =>
  seite.evaluate(() => {
    const p = window.__kurven.roh().pos;
    let max = 0;
    let kaputt = 0;
    for (let i = 0; i < p.length; i++) {
      if (!Number.isFinite(p[i])) kaputt++;
      else if (Math.abs(p[i]) > max) max = Math.abs(p[i]);
    }
    return { punkte: p.length / 3, max: Math.round(max), kaputt };
  });
/** größte Ausdehnung der Linien (daran misst sich, ob die Haut davonläuft) */
const linienMax = async () => {
  let m = 0;
  for (const l of await K('loops')) for (const v of l.ruhe) m = Math.max(m, Math.abs(v));
  return m;
};
/** ziehen wie mit der Maus; bricht ab, wenn die Haut davonläuft. Zurück: null oder was geschah */
const ziehen = async (a, von, nach, n = SCHRITTE, halten = HALTEN) => {
  const [x, y] = await bild(a, von);
  const [x2, y2] = await bild(a, nach);
  const grenze = 10 * Math.max(300, await linienMax());
  const p0 = (await heil()).punkte;
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  let los = null;
  for (let i = 1; i <= n && !los; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
    await seite.waitForTimeout(PAUSE);
    if (i % 4 === 0 || i === n) {
      const h = await heil();
      if (h.kaputt > 0 || h.max > grenze || h.punkte > 4 * p0) los = { schritt: i, ...h };
    }
  }
  const t0 = Date.now();
  while (!los && Date.now() - t0 < halten) {
    await seite.waitForTimeout(50);
    const h = await heil();
    if (h.kaputt > 0 || h.max > grenze || h.punkte > 4 * p0) los = { schritt: n, beimHalten: Date.now() - t0, ...h };
  }
  await seite.mouse.up();
  return los;
};
const foto = (was) => seite.screenshot({ path: `${ordner}/form-${name}-${was}-2026-11-10.jpg`, type: 'jpeg', quality: 85 });
const zeile = async (was) => {
  const z = await K('zeiten');
  const h = await heil();
  console.log(`${was}: ${h.punkte} Punkte, größte Koordinate ${h.max}, nicht endlich ${h.kaputt}, umgeklappt ${await K('umgeschlagen')} · Maße ${(await K('masse')).join('/')} · ${(await seite.evaluate(() => document.getElementById('status').textContent)).slice(0, 110)}`);
  return z;
};

// ---------- Aufbau ----------
await schneiden('seite', { x: -200, y: 0 }, { x: 200, y: 0 });
await schneiden('top', { x: -200, y: 0 }, { x: 200, y: 0 });
await schneiden('seite', { x: 10, y: 200 }, { x: 10, y: -200 });
await seite.keyboard.press('Escape');
const obenVon = async () => {
  let best = null;
  for (const l of await K('loops')) for (const [i, q] of l.punkte.entries()) if (q.sichtbar !== false && (!best || q.ref.y > best.ref.y)) best = { l: l.id, i, ref: q.ref, ecke: q.ecke, ein: q.ein, aus: q.aus, kreuzung: q.kreuzung };
  return best;
};
let oben = await obenVon();
let los = await ziehen('seite', oben.ref, { ...oben.ref, y: oben.ref.y + 160 }, 50, 150);
await ruhig();
if (RING) {
  await schneiden('seite', { x: -170, y: 235 }, { x: 190, y: 235 });
  await seite.keyboard.press('Escape');
}
oben = await obenVon();
// die Blätter so weit herauszoomen, dass alle Züge hineinpassen (bei 100 % reicht ein Blatt nur bis ±280)
{
  const yMax = oben.ref.y + ZUEGE * WEIT + 60;
  const yMin = -170;
  const sicht = { cx: 0, cy: -(yMax + yMin) / 2, zoom: Math.min(1, (0.95 * 560) / (yMax - yMin)) };
  await K('ausschnitt', 'seite', sicht);
  await K('ausschnitt', 'front', sicht);
  await seite.waitForTimeout(150);
}
if (ECKE) {
  const [x, y] = await bild(ansicht, oben.ref);
  await seite.keyboard.down('Alt');
  await seite.mouse.click(x, y);
  await seite.keyboard.up('Alt');
  await ruhig();
  // (ein Druck auf denselben Punkt innerhalb von 400 ms wäre ein Doppelklick: Ecke wieder aus)
  await seite.waitForTimeout(500);
  oben = await obenVon();
}
if (GRIFFE !== null) {
  // die Griffe des oberen Punkts kürzen (in der Seite am Loop der Mitte): jede Griffspitze zum Punkt hin
  for (const seiteG of ['ein', 'aus']) {
    const L = await K('loops');
    const l = L.find((q) => q.art === 'mitte');
    const i = l.punkte.reduce((b, q, j) => (q.ref.y > l.punkte[b].ref.y ? j : b), 0);
    const p = l.punkte[i];
    const g = p[seiteG];
    if (!g) continue;
    const spitze = { x: p.ref.x + g.x, y: p.ref.y + g.y, z: p.ref.z + g.z };
    const ziel = { x: p.ref.x + GRIFFE * g.x, y: p.ref.y + GRIFFE * g.y, z: p.ref.z + GRIFFE * g.z };
    // erst wählen (die Griffe zeigen sich am gewählten Punkt)
    const [px, py] = await bild('seite', p.ref);
    await seite.mouse.click(px, py);
    await ruhig();
    los = (await ziehen('seite', spitze, ziel, 16, 150)) ?? los;
    await ruhig();
  }
  oben = await obenVon();
}
const anfang = await zeile(`Aufbau (${RING ? 'mit Ring um den Hals' : 'ohne Ring'}${ECKE ? `, oben Ecke: ${oben.ecke}` : ''}${GRIFFE !== null ? `, Griffe auf ${GRIFFE}` : ''})`);
void anfang;
await foto('0-aufbau');

// ---------- der obere Punkt hinauf ----------
for (let zugNr = 1; zugNr <= ZUEGE && !los; zugNr++) {
  oben = await obenVon();
  const ziel = ansicht === 'front' ? { x: oben.ref.x, y: oben.ref.y + WEIT, z: oben.ref.z + QUER } : { x: oben.ref.x + QUER, y: oben.ref.y + WEIT, z: oben.ref.z };
  await mitlesenAn();
  const t0 = await seite.evaluate(() => performance.now());
  los = await ziehen(ansicht, oben.ref, ziel);
  const tLos = await seite.evaluate(() => performance.now());
  let antwortet = true;
  try {
    await ruhig(60000);
  } catch {
    antwortet = false;
  }
  const b = await mitlesenAus();
  const groesste = b.reduce((m, q) => Math.max(m, q.max), 0);
  const ersteKaputt = b.find((q) => q.kaputt > 0);
  const lange = b.filter((q, i) => i > 0 && q.t - b[i - 1].t > 250).length;
  console.log(
    `Zug ${zugNr} (+${WEIT}${QUER ? `, quer ${QUER}` : ''} in der ${ansicht}; ${((tLos - t0) / 1000).toFixed(1)} s): größte Koordinate im Verlauf ${Math.round(groesste)}` +
      `${ersteKaputt ? `, NICHT ENDLICHE LAGEN ab ${((ersteKaputt.t - t0) / 1000).toFixed(2)} s (${ersteKaputt.kaputt})` : ''}, Bilder mit über 250 ms Abstand ${lange}` +
      `${los ? ` · DAVONGELAUFEN bei Schritt ${los.schritt}${los.beimHalten !== undefined ? ` (beim Halten nach ${los.beimHalten} ms)` : ''}: ${los.punkte} Punkte, größte Koordinate ${los.max}, nicht endlich ${los.kaputt}` : ''}` +
      `${antwortet ? '' : ' · DAS FENSTER KOMMT NICHT ZUR RUHE (60 s)'}`,
  );
  await zeile(`  nach Zug ${zugNr}`);
  await foto(`${zugNr}`);
  if (!antwortet) break;
}
if (los) {
  // antwortet das Fenster noch? Rückgängig, dann ein neuer Griff
  const t = Date.now();
  let ok = true;
  try {
    await seite.keyboard.press('Meta+z');
    await ruhig(30000);
    await zeile('  nach Rückgängig');
  } catch (e) {
    ok = false;
    console.log(`  das Fenster antwortet nicht mehr (${String(e).slice(0, 80)})`);
  }
  if (ok) console.log(`  das Fenster antwortet (${Date.now() - t} ms bis zur Ruhe nach ⌘Z)`);
}
console.log(`\nKonsole: ${fehler.length ? fehler.slice(0, 4).join(' | ').slice(0, 600) : 'keine Fehler'}`);
await browser.close();
