// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: Ablauf-Szenarien im echten Editor (eigener Vite über
// run-check.sh, nie 5180), mit echten Maus- und Tastenzügen; jedes Szenario misst Geometrie (Δ der Blätter, Falten des
// gezeigten Netzes, Sprung am Gestenende, Lage der Linien auf der Haut), nicht nur Hashes, und läuft nach jedem späteren
// Schritt wieder.
//   A  Kugel → Wurst in vielen kleinen Zügen (statt eines Sprungs), dann „Neu ableiten“ und „Teile“
//   B  Rückgängig/Wiederholen nach eingefügten Punkten (Ente-Haken: Front angleichen, Kopf im Top breiter)
//   C  Körperart umschalten mit Pinsel: Röhre → Teile → Röhre, der Pinsel der Röhre bleibt (Netz gleich)
//   D  Teile: ein Teil kommt (Knoten mit dem Stift, schrittweise herausziehen) und geht (zurückziehen)
//   E  P-Linien setzen (Stift), härten (⇧W) und kreuzen; „genau“ in der Kantenliste, Linie auf der Haut
// FEHL zählt nur Fehler der Bedienung (Undo, Umschalten, Werkzeuge); Messwerte gegen die Grundsätze des Plans (Sprung
// ≤ 0,5 px, Linie ≤ 0,3 px, keine neuen Falten) stehen als „Befund“ im Bericht. Umgebung: SZENARIEN (z. B. A,C), AUSGABE.
// Aufruf: apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/v1-ablauf.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const url = process.env.EDITOR_URL ?? 'http://localhost:5192';
const out = process.env.AUSGABE ?? resolve(WURZEL, 'apps/editor/pruefen-ausgabe/v1');
mkdirSync(out, { recursive: true });
const szenarien = (process.env.SZENARIEN ?? 'A,B,C,D,E').split(',');
const modul = `/@fs${WURZEL}/packages/shape/src/kern/pruefen/grundkoerper.ts`;

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const page = await browser.newPage({ viewport: { width: 1728, height: 1161 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
let fehler = 0;
const bericht = [];
const pruefe = (ok, text) => {
  const z = `${ok ? '  ok  ' : '  FEHL'} ${text}`;
  console.log(z);
  bericht.push(z);
  if (!ok) fehler++;
};
const befund = (text) => {
  const z = `  Befund ${text}`;
  console.log(z);
  bericht.push(z);
};
const titel = (t) => {
  console.log(t);
  bericht.push(`\n${t}`);
};

// ---------- Hilfen im Seitenkontext ----------
await page.addInitScript(() => {
  /** Geometrie des gezeigten Netzes: größter Knick zwischen benachbarten Dreiecken (Grad), Zahl der Knicke über 20°. */
  window.__falten = () => {
    const P = window.__editor.netzLagen();
    if (!P) return null;
    const schl = (i) => `${Math.round(P[i] * 1e5)},${Math.round(P[i + 1] * 1e5)},${Math.round(P[i + 2] * 1e5)}`;
    const kanten = new Map();
    let max = 0;
    let ueber20 = 0;
    for (let t = 0; t + 8 < P.length; t += 9) {
      const ux = P[t + 3] - P[t], uy = P[t + 4] - P[t + 1], uz = P[t + 5] - P[t + 2];
      const vx = P[t + 6] - P[t], vy = P[t + 7] - P[t + 1], vz = P[t + 8] - P[t + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-14) continue;
      nx /= l; ny /= l; nz /= l;
      const k = [schl(t), schl(t + 3), schl(t + 6)];
      for (let e = 0; e < 3; e++) {
        const a = k[e], b = k[(e + 1) % 3];
        const id = a < b ? `${a}|${b}` : `${b}|${a}`;
        const n0 = kanten.get(id);
        if (!n0) kanten.set(id, [nx, ny, nz]);
        else {
          const w = (Math.acos(Math.max(-1, Math.min(1, n0[0] * nx + n0[1] * ny + n0[2] * nz))) * 180) / Math.PI;
          max = Math.max(max, w);
          if (w > 20) ueber20++;
        }
      }
    }
    return { max, ueber20 };
  };
  /** Größter Abstand zweier Netze (Lagen, beide Richtungen, jede dritte Ecke), px bei 461 je Kachel. */
  window.__sprung = (A, B) => {
    if (!A || !B) return null;
    const h = 0.02;
    const raster = (P) => {
      const m = new Map();
      for (let i = 0; i < P.length; i += 3) {
        const k = `${Math.floor(P[i] / h)},${Math.floor(P[i + 1] / h)},${Math.floor(P[i + 2] / h)}`;
        (m.get(k) ?? m.set(k, []).get(k)).push(i);
      }
      return m;
    };
    const eins = (P, Q, rq) => {
      let max = 0;
      for (let i = 0; i < P.length; i += 9) {
        let best = Infinity;
        const cx = Math.floor(P[i] / h), cy = Math.floor(P[i + 1] / h), cz = Math.floor(P[i + 2] / h);
        for (let r = 1; r <= 4 && best === Infinity; r++)
          for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++)
            for (const j of rq.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) best = Math.min(best, Math.hypot(Q[j] - P[i], Q[j + 1] - P[i + 1], Q[j + 2] - P[i + 2]));
        max = Math.max(max, best === Infinity ? 4 * h : best);
      }
      return max;
    };
    return Math.max(eins(A, B, raster(B)), eins(B, A, raster(A))) * 461;
  };
  window.__delta = () => Object.fromEntries([...document.querySelectorAll('[data-view]')].map((v) => [v.getAttribute('data-view'), Number(v.querySelector('[data-delta]')?.getAttribute('data-delta') ?? NaN)]).filter(([, d]) => Number.isFinite(d)));
});

async function nachBau(version) {
  await page.waitForFunction((v) => window.__editor.netzVersion() > v && document.querySelectorAll('[data-delta]').length >= 3, version, { timeout: 90_000 });
  await page.waitForTimeout(700);
}
/** bis eine Sekunde lang kein neues Netz kam */
async function ruhig() {
  let v = await page.evaluate(() => window.__editor.netzVersion());
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const w = await page.evaluate(() => window.__editor.netzVersion());
    if (w === v) return;
    v = w;
  }
}
async function neueKugel() {
  await page.goto(`${url}/?look=earle&palette=blob`);
  await page.waitForFunction(() => window.__stores && window.__editor && window.__editor.vertices() > 0 && document.querySelectorAll('[data-delta]').length >= 3, null, { timeout: 90_000 });
  await page.waitForFunction(() => (window.__stores.editor.getState().dok.kaefig?.stationen?.ringe.length ?? 0) > 0, null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.__stores.ui.getState().libraryUmschalten(false);
    window.__stores.ui.getState().setzeEbene('form');
  });
  await ruhig();
}
const stand = () => page.evaluate(() => ({ delta: window.__delta(), falten: window.__falten(), knoten: Object.fromEntries(['seite', 'front', 'top'].map((a) => [a, window.__stores.editor.getState().dok.profile[a].knoten.length])) }));
const dmax = (d) => Math.max(...Object.values(d));
/** Bildschirmlage eines Umrissknotens */
const knotenLage = (blatt, i) =>
  page.evaluate(({ blatt, i }) => {
    const el = document.querySelector(`.vp-ober[data-view="${blatt}"] [data-knoten="${i}"] .knoten-punkt`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, { blatt, i });
/**
 * Eine Geste mit echter Maus: von (x, y) um (dx, dy) in Schritten; vor dem Loslassen werden die Lagen des schnellen Netzes
 * gemerkt, danach wird bis zum genauen Bau gewartet und der Sprung gemessen.
 */
async function geste(x, y, dx, dy, schritte = 6) {
  const v0 = await page.evaluate(() => window.__editor.netzVersion());
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let s = 1; s <= schritte; s++) await page.mouse.move(x + (dx * s) / schritte, y + (dy * s) / schritte);
  await page.waitForTimeout(250);
  await page.evaluate(() => (window.__vorLos = window.__editor.netzLagen()));
  await page.mouse.up();
  await nachBau(v0);
  await ruhig();
  return page.evaluate(() => window.__sprung(window.__vorLos, window.__editor.netzLagen()));
}

// ---------- A: Kugel → Wurst in vielen kleinen Zügen ----------
if (szenarien.includes('A')) {
  titel('A  Kugel → Wurst in zwölf kleinen Zügen (Röhre), dann „Neu ableiten“ und „Teile“');
  await neueKugel();
  const zeilen = [];
  for (const [knoten, richtung] of [[1, 1], [3, -1]]) {
    for (let k = 0; k < 6; k++) {
      const p = await knotenLage('seite', knoten);
      const sprung = await geste(p.x, p.y, 22 * richtung, 0);
      const s = await stand();
      zeilen.push({ knoten, k, sprung, s });
      console.log(`    Knoten ${knoten} Zug ${k + 1}: Sprung ${sprung?.toFixed(2)} px · Δ ${JSON.stringify(s.delta)} · Falten ${s.falten?.max.toFixed(1)}° (${s.falten?.ueber20} über 20°)`);
    }
  }
  const ende = zeilen[zeilen.length - 1].s;
  const sprungMax = Math.max(...zeilen.map((z) => z.sprung ?? 0));
  befund(`zwölf Züge: größter Sprung am Gestenende ${sprungMax.toFixed(2)} px (Grundsatz ≤ 0,5), Ende Δ max ${dmax(ende.delta).toFixed(1)} px, Falten ${ende.falten.max.toFixed(1)}° (${ende.falten.ueber20} über 20°)`);
  await page.screenshot({ path: `${out}/v1-ablauf-a-wurst.png` });
  let v = await page.evaluate(() => window.__editor.netzVersion());
  await page.locator('[data-neu-ableiten]').click();
  await nachBau(v);
  await ruhig();
  const neu = await stand();
  befund(`„Neu ableiten“: Δ max ${dmax(ende.delta).toFixed(1)} → ${dmax(neu.delta).toFixed(1)} px, Falten ${ende.falten.max.toFixed(1)}° → ${neu.falten.max.toFixed(1)}° (eingefrorene Ringe der Kugel gegen frisch gewählte)`);
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.locator('[data-koerper="teile"]').click();
  await nachBau(v);
  await ruhig();
  const teile = await stand();
  befund(`auf „Teile“: Δ max ${dmax(teile.delta).toFixed(1)} px, Falten ${teile.falten.max.toFixed(1)}° (${teile.falten.ueber20} über 20°)`);
  await page.screenshot({ path: `${out}/v1-ablauf-a-teile.png` });
  pruefe(Object.keys(ende.delta).length === 3, 'drei Blätter mit Δ nach jedem Zug');
}

// ---------- B: Rückgängig/Wiederholen nach eingefügten Punkten ----------
if (szenarien.includes('B')) {
  titel('B  Rückgängig/Wiederholen nach eingefügten Punkten (Ente-Haken: Front angleichen, Kopf im Top breiter ziehen)');
  await neueKugel();
  let v = await page.evaluate(() => window.__editor.netzVersion());
  await page.evaluate(async (m) => {
    const g = await import(m);
    window.__stores.editor.getState().laden(g.s0KoerperDokument('ente-haken'), null);
  }, modul);
  await nachBau(v);
  await page.evaluate(() => window.__stores.ui.getState().setzeEbene('form'));
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.locator('[data-angleichen="front"]').click();
  await nachBau(v);
  await ruhig();
  const griff = await page.evaluate(() => {
    const kn = window.__stores.editor.getState().dok.profile.top.knoten;
    let i = -1;
    kn.forEach((k, j) => {
      if (k.p.x < -0.15 && Math.abs(k.p.y) > 0.02 && (i < 0 || Math.abs(k.p.y) > Math.abs(kn[i].p.y))) i = j;
    });
    const svg = document.querySelector('.vp-ober[data-view="top"] svg.view2d');
    const el = svg.querySelector(`[data-knoten="${i}"] .knoten-punkt`);
    const r = el.getBoundingClientRect();
    const a0 = svg.querySelector('[data-knoten="0"] .knoten-punkt').getBoundingClientRect();
    return { i, x: r.x + r.width / 2, y: r.y + r.height / 2, weg: Math.sign(r.y - a0.y) || 1 };
  });
  const vorher = await page.evaluate(() => ({ profile: JSON.stringify(window.__stores.editor.getState().dok.profile), lagen: window.__editor.netzLagen() }));
  await page.evaluate((l) => (window.__vorher = l), vorher.lagen);
  await geste(griff.x, griff.y, 0, griff.weg * 36, 12);
  const nachZug = await page.evaluate(() => ({ profile: JSON.stringify(window.__stores.editor.getState().dok.profile), front: window.__stores.editor.getState().dok.profile.front.knoten.length }));
  await page.evaluate(() => (window.__nachZug = window.__editor.netzLagen()));
  const vorFront = JSON.parse(vorher.profile).front.knoten.length;
  befund(`Kopf 36 px breiter: Front ${vorFront} → ${nachZug.front} Knoten (eingefügt: ${nachZug.front - vorFront})`);
  // ⌘Z mit der echten Taste
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.mouse.move(5, 300);
  await page.keyboard.press('Meta+z');
  await nachBau(v).catch(() => {});
  await ruhig();
  const zurueck = await page.evaluate(() => ({ profile: JSON.stringify(window.__stores.editor.getState().dok.profile), sprung: window.__sprung(window.__vorher, window.__editor.netzLagen()) }));
  pruefe(zurueck.profile === vorher.profile, '⌘Z: Profile wie vor dem Zug (JSON gleich)');
  pruefe(zurueck.sprung !== null && zurueck.sprung < 0.01, `⌘Z: Netz wie vor dem Zug (${zurueck.sprung?.toFixed(4)} px)`);
  v = await page.evaluate(() => window.__editor.netzVersion());
  await page.keyboard.press('Meta+Shift+z');
  await nachBau(v).catch(() => {});
  await ruhig();
  const wieder = await page.evaluate(() => ({ profile: JSON.stringify(window.__stores.editor.getState().dok.profile), sprung: window.__sprung(window.__nachZug, window.__editor.netzLagen()) }));
  pruefe(wieder.profile === nachZug.profile, '⇧⌘Z: Profile wie nach dem Zug (JSON gleich, eingefügte Punkte wieder da)');
  pruefe(wieder.sprung !== null && wieder.sprung < 0.01, `⇧⌘Z: Netz wie nach dem Zug (${wieder.sprung?.toFixed(4)} px)`);
}

// ---------- C: Körperart umschalten mit Pinsel ----------
if (szenarien.includes('C')) {
  titel('C  Körperart umschalten mit Pinsel: Röhre (Pinselstrich) → Teile → Röhre');
  await neueKugel();
  const r = await page.evaluate(() => {
    const b = document.querySelector('[data-view="creation"]').getBoundingClientRect();
    return { x0: b.x, y0: b.y, x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  // Treffer auf dem Körper suchen (Mitte der Bühne nach rechts; `treffen` rechnet in Feldpixeln)
  let start = null;
  for (let dx = 0; dx <= 120 && !start; dx += 20) if (await page.evaluate(({ x, y }) => !!window.__editor.treffen(x, y), { x: r.x + dx - r.x0, y: r.y - r.y0 })) start = { x: r.x + dx, y: r.y };
  if (!start) pruefe(false, 'kein Treffer auf dem Körper in der Bühne');
  else {
    await page.mouse.move(start.x, start.y);
    await page.keyboard.press('g');
    const wz = await page.evaluate(() => window.__stores.ui.getState().werkzeug);
    pruefe(wz === 'ziehen', `G auf der Bühne: Werkzeug „${wz}“`);
    await geste(start.x, start.y, 30, -20, 8);
    await page.keyboard.press('a');
    const mitPinsel = await page.evaluate(() => ({ deltas: JSON.stringify(window.__stores.editor.getState().dok.kaefig?.deltas ?? []), posen: JSON.stringify(window.__stores.editor.getState().dok.posen), lagen: window.__editor.netzLagen() }));
    await page.evaluate((l) => (window.__roehre = l), mitPinsel.lagen);
    pruefe(JSON.parse(mitPinsel.deltas).length > 0, `Pinselstrich auf der Röhre: ${JSON.parse(mitPinsel.deltas).length} Käfig-Deltas`);
    let v = await page.evaluate(() => window.__editor.netzVersion());
    await page.locator('[data-koerper="teile"]').click();
    await nachBau(v);
    await ruhig();
    const hinweis = await page.evaluate(() => window.__stores.ui.getState().hinweis?.text ?? '');
    pruefe(/Pinsel|Röhre/.test(hinweis), `Umschalten auf „Teile“ sagt, was auf der Röhre liegt: „${hinweis}“`);
    v = await page.evaluate(() => window.__editor.netzVersion());
    await page.locator('[data-koerper="roehre"]').click();
    await nachBau(v);
    await ruhig();
    const zurueck = await page.evaluate(() => ({ deltas: JSON.stringify(window.__stores.editor.getState().dok.kaefig?.deltas ?? []), posen: JSON.stringify(window.__stores.editor.getState().dok.posen), sprung: window.__sprung(window.__roehre, window.__editor.netzLagen()) }));
    pruefe(zurueck.deltas === mitPinsel.deltas && zurueck.posen === mitPinsel.posen, 'zurück auf der Röhre: Pinsel-Deltas und Posen unverändert');
    pruefe(zurueck.sprung !== null && zurueck.sprung < 0.01, `zurück auf der Röhre: Netz wie vor dem Umschalten (${zurueck.sprung?.toFixed(4)} px)`);
  }
}

// ---------- D: ein Teil kommt und geht ----------
if (szenarien.includes('D')) {
  titel('D  Teile: Knoten mit dem Stift oben vorn auf die Kugel, schrittweise herausziehen, bis ein Teil kommt, dann zurück');
  await neueKugel();
  let v = await page.evaluate(() => window.__editor.netzVersion());
  await page.locator('[data-koerper="teile"]').click();
  await nachBau(v);
  await ruhig();
  // Stift auf die schwarze Linie oben vorn (Mitte des Bogens von Knoten 3 nach 0)
  const ziel = await page.evaluate(() => {
    const svg = document.querySelector('.vp-ober[data-view="seite"] svg.view2d');
    const p3 = svg.querySelector('[data-knoten="3"] .knoten-punkt').getBoundingClientRect();
    const p0 = svg.querySelector('[data-knoten="0"] .knoten-punkt').getBoundingClientRect();
    // Mitte des Viertelkreises: vom Kreismittelpunkt (x von Knoten 0, y von Knoten 3) unter 45°
    const cx = p0.x + p0.width / 2;
    const cy = p3.y + p3.height / 2;
    const r = cx - (p3.x + p3.width / 2);
    return { x: cx - r * Math.SQRT1_2, y: cy - r * Math.SQRT1_2, r };
  });
  await page.mouse.move(ziel.x, ziel.y);
  await page.keyboard.press('p');
  await page.mouse.click(ziel.x, ziel.y);
  await page.waitForTimeout(400);
  await page.keyboard.press('a');
  const nKnoten = await page.evaluate(() => window.__stores.editor.getState().dok.profile.seite.knoten.length);
  pruefe(nKnoten === 5, `Stift auf der Kugel oben vorn: Seite 4 → ${nKnoten} Knoten`);
  await ruhig();
  const neuIdx = await page.evaluate(() => {
    const kn = window.__stores.editor.getState().dok.profile.seite.knoten;
    let i = 0;
    kn.forEach((k, j) => {
      if (k.p.x < 0 && k.p.y > 0.4 && Math.abs(k.p.x) > 0.1) i = j;
    });
    return i;
  });
  // Teile: Streifen des Baums (Mittelteile) und seitliche Röhren; dazu die Erkennung (Anzeige) und die Lage des Knotens
  const teileZahl = () => page.evaluate(() => (window.__editor.koerperBaum()?.streifen ?? 0) + (window.__editor.koerperBaum()?.seiten ?? 0));
  const erkannt = () => page.evaluate((i) => ({ teile: (window.__editor.teile()?.teile ?? []).map((t) => t.art).join('+'), p: window.__stores.editor.getState().dok.profile.seite.knoten[i]?.p }), neuIdx);
  const schritte = [];
  let kam = -1;
  for (let k = 0; k < 14; k++) {
    const p = await knotenLage('seite', neuIdx);
    const sprung = await geste(p.x, p.y, -16, -16, 4);
    const s = await stand();
    const e = await erkannt();
    const n = e.teile.split('+').length;
    schritte.push({ k, sprung, n, s });
    console.log(`    hinaus ${k + 1}: erkannt ${e.teile} (Baum ${await teileZahl()} Streifen/Röhren) · Knoten (${(e.p.x * 461).toFixed(0)}, ${(e.p.y * 461).toFixed(0)}) px · Sprung ${sprung?.toFixed(2)} px · Δ max ${dmax(s.delta).toFixed(1)} px · Falten ${s.falten?.max.toFixed(1)}°`);
    if (n > 1 && kam < 0) {
      kam = k;
      break;
    }
  }
  befund(kam >= 0 ? `Teil erkannt nach ${kam + 1} Zügen (je 23 px): Sprung in diesem Zug ${schritte[kam].sprung?.toFixed(1)} px, sonst bis ${Math.max(0, ...schritte.slice(0, kam).map((s) => s.sprung ?? 0)).toFixed(1)} px` : 'kein Teil nach 14 Zügen');
  await page.screenshot({ path: `${out}/v1-ablauf-d-teil.png` });
  if (kam >= 0) {
    let ging = -1;
    for (let k = 0; k <= kam + 2; k++) {
      const p = await knotenLage('seite', neuIdx);
      const sprung = await geste(p.x, p.y, 16, 16, 4);
      const e = await erkannt();
      const n = e.teile.split('+').length;
      const s = await stand();
      console.log(`    zurück ${k + 1}: erkannt ${e.teile} (Baum ${await teileZahl()} Streifen/Röhren) · Sprung ${sprung?.toFixed(2)} px · Δ max ${dmax(s.delta).toFixed(1)} px · Falten ${s.falten?.max.toFixed(1)}°`);
      if (n === 1 && ging < 0) ging = k;
    }
    befund(ging >= 0 ? `Teil geht beim Zurückziehen im ${ging + 1}. Zug (Hysterese: ${ging} Züge = ${ging * 23} px länger als auf dem Hinweg)` : `Teil bleibt, auch zurück an der Kugelstelle (Ratsche der eingefrorenen Teile)`);
  }
}

// ---------- E: P-Linien setzen, härten, kreuzen ----------
if (szenarien.includes('E')) {
  titel('E  P-Linien: Stift setzt eine Linie quer über die Kugel, ⇧W härtet, eine zweite kreuzt');
  await neueKugel();
  await page.evaluate(() => window.__stores.ui.getState().setzeKantenSicht?.('zeigen'));
  const vorher = await stand();
  const box = await page.evaluate(() => {
    const svg = document.querySelector('.vp-ober[data-view="seite"] svg.view2d');
    const r = svg.querySelector('[data-kurve]').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const linie = async (punkte) => {
    await page.mouse.move(punkte[0][0], punkte[0][1]);
    await page.keyboard.press('p');
    for (const [x, y] of punkte) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(150);
    }
    const v = await page.evaluate(() => window.__editor.netzVersion());
    await page.keyboard.press('Enter');
    await nachBau(v).catch(() => {});
    await ruhig();
  };
  const haerten = async (ki) => {
    await page.keyboard.press('Shift+W');
    const n = await page.evaluate((ki) => window.__stores.editor.getState().dok.kanten?.[ki]?.knoten.length ?? 0, ki);
    for (let i = 0; i < n; i++) {
      const p = await page.evaluate(({ ki, i }) => {
        const el = document.querySelector(`.vp-ober[data-view="seite"] [data-kantenknoten="${ki}:${i}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, { ki, i });
      if (!p) continue;
      await geste(p.x, p.y, 0, -45, 5);
    }
    await page.keyboard.press('a');
    await ruhig();
  };
  const y0 = box.y + box.h * 0.4;
  await linie([[box.x + box.w * 0.22, y0], [box.x + box.w * 0.5, y0], [box.x + box.w * 0.78, y0]]);
  let k = await page.evaluate(() => (window.__stores.editor.getState().dok.kanten ?? []).map((q) => ({ n: q.knoten.length, h: q.haerte })));
  pruefe(k.length === 1 && k[0].n >= 3, `Stift: eine Linie mit ${k[0]?.n} Knoten`);
  await haerten(0);
  k = await page.evaluate(() => (window.__stores.editor.getState().dok.kanten ?? []).map((q) => ({ n: q.knoten.length, h: q.haerte })));
  pruefe(k[0]?.h.every((h) => h > 0.95), `⇧W: Härte je Knoten ${k[0]?.h.map((h) => Math.round(h * 100)).join('/')} %`);
  const x0 = box.x + box.w * 0.5;
  await linie([[x0, box.y + box.h * 0.2], [x0, box.y + box.h * 0.75]]);
  await haerten(1);
  const art = await page.evaluate(() => [...document.querySelectorAll('[data-kanten-art]')].map((e) => e.getAttribute('data-kanten-art')));
  pruefe(art.length === 2, `Kantenliste: ${art.join(', ')}`);
  befund(`Einpassung: ${art.join(', ')} (Ziel: beide „genau“)`);
  // Lage der Linien auf der Haut: Abstand der Linienproben zur nächsten Ecke des gezeigten Netzes
  // die Linien, wie das Liniennetz sie zeigt (auf die Haut gelegt), gegen die Ecken des gezeigten Netzes
  const lage = await page.evaluate(() => {
    const P = window.__editor.netzLagen();
    const sk = window.__stores.editor.getState().dok.skalierung;
    const ns = window.__editor.netzSicht();
    const out = [];
    for (const z of (ns?.zuege ?? []).filter((q) => q.art === 'linie' && !q.id.endsWith('s'))) {
      let max = 0;
      for (let i = 0; i < z.punkte.length; i += 3) {
        let best = Infinity;
        for (let j = 0; j < P.length; j += 3) best = Math.min(best, Math.hypot(P[j] - z.punkte[i] * sk, P[j + 1] - z.punkte[i + 1] * sk, P[j + 2] - z.punkte[i + 2] * sk));
        max = Math.max(max, best);
      }
      out.push(max * 461);
    }
    return out;
  });
  befund(`gezeigte Linien zur nächsten Netzecke: ${lage.map((x) => x.toFixed(2)).join(' / ')} px (Ecken liegen ≈ 1–3 px auseinander; genauer misst die Extremreihe im Kern)`);
  const nach = await stand();
  befund(`Δ max ohne → mit Linien: ${dmax(vorher.delta).toFixed(1)} → ${dmax(nach.delta).toFixed(1)} px; Falten ${vorher.falten.max.toFixed(1)}° → ${nach.falten.max.toFixed(1)}° (die Kante selbst zählt mit)`);
  await page.screenshot({ path: `${out}/v1-ablauf-e-linien.png` });
}

await browser.close();
writeFileSync(`${out}/v1-ablauf.txt`, bericht.join('\n') + '\n');
console.log(fehler ? `${fehler} Fehler` : 'alles grün (Befunde siehe oben)');
process.exit(fehler ? 1 : 0);
