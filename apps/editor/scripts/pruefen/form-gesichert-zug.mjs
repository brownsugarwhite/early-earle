// Form zuerst (10.11.2026, G5): eine gesicherte Form laden (wesen/<Name>.eewesen) und an ihr ziehen wie mit der Maus. Gemessen:
//   - wie lange das Laden dauert, bis der Hintergrund für den Stand fertig ist (Zerlegung für das erste Greifen)
//   - beim Greifen: wie lange das Drücken anhält und wie lange der Griff wartet
//   - im Zug: Abstand von Bild zu Bild, Runden und ms je Runde, wie viele Runden die Haut am Ende noch braucht
//   - nach dem Loslassen: Nachlauf, Auftrag im Hintergrund (Teile in ms), wann eingewechselt wird, wann alles ruht
//   - ob die Haut heil bleibt: größte Koordinate, nicht endliche Lagen, Zahl der Punkte (läuft sie auseinander, bricht die Probe ab)
// Aufruf aus apps/editor: NAME="teat firefish" node scripts/pruefen/form-gesichert-zug.mjs
//   PUNKT=oben|unten|vorn|hinten|<loop>:<i> (welcher Punkt; Standard oben)   ZUG="0,120,0" (um wie viel, in Einheiten x,y,z)
//   ANSICHT=seite|front|top (Standard seite)   SCHRITTE=40   PAUSE=16 (ms je Mausschritt)   HALTEN=400 (ms vor dem Loslassen)
//   KANTE=1 (statt zu ziehen: den Punkt wählen, K drücken, noch einmal K; je der Stillstand des Fensters)
//   ECKE=1 (der Punkt wird vorher eine Ecke)   NEU=1 (erst mit Doppelklick einen neuen Punkt auf die Linie setzen, dann gleich ihn ziehen)   BILD=<pfad ohne Endung> (Bilder beim Halten und in der Ruhe)
//   MAL=1 (so oft hintereinander derselbe Zug)   ZOOM=0.6 (Zoom des Blatts, mittig auf dem Zug)   KURVEN_URL (Standard http://localhost:5193/kurven.html?gewichte=geometrie)
import { chromium } from '@playwright/test';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const NAME = process.env.NAME ?? 'teat firefish';
const ansicht = process.env.ANSICHT ?? 'seite';
const [zx, zy, zz] = (process.env.ZUG ?? '0,120,0').split(',').map(Number);
const SCHRITTE = Number(process.env.SCHRITTE ?? 40);
const PAUSE = Number(process.env.PAUSE ?? 16);
const HALTEN = Number(process.env.HALTEN ?? 400);
const MAL = Number(process.env.MAL ?? 1);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(300);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhig = (ms = 180000) => seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: ms });
/** Zustand der Haut: Punkte, größte Koordinate, nicht endliche Lagen */
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

// ---------- laden ----------
let t0 = Date.now();
const text = await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
console.log(`${text}`);
if (!text.startsWith('geladen')) {
  await browser.close();
  process.exit(1);
}
await seite.waitForTimeout(100);
await ruhig();
const anfang = await heil();
console.log(`geladen und Hintergrund fertig nach ${((Date.now() - t0) / 1000).toFixed(1)} s · ${anfang.punkte} Punkte, größte Koordinate ${anfang.max} · Auftrag: ${JSON.stringify((await K('zeiten')).auftrag)}`);
const ZOOM = Number(process.env.ZOOM ?? 0.6);

// ---------- den Punkt wählen ----------
const punkt = async () => {
  const L = await K('loops');
  const wahl = process.env.PUNKT ?? 'oben';
  if (wahl.includes(':')) {
    const [l, i] = wahl.split(':').map(Number);
    const loop = L.find((x) => x.id === l);
    return { l, i, ref: loop.punkte[i].ref };
  }
  const wert = { oben: (p) => p.y, unten: (p) => -p.y, vorn: (p) => -p.x, hinten: (p) => p.x }[wahl];
  let best = null;
  for (const l of L)
    l.punkte.forEach((p, i) => {
      if (p.sichtbar === false) return;
      if (!best || wert(p.ref) > wert(best.ref)) best = { l: l.id, i, ref: p.ref, kreuzung: p.kreuzung, ecke: p.ecke };
    });
  return best;
};

/** NEU=1: erst mit Doppelklick einen neuen Punkt auf die Linie setzen (halbwegs zum nächsten Punkt des Loops), dann gleich ihn ziehen */
const neuerPunkt = async (p) => {
  const L = await K('loops');
  const loop = L.find((x) => x.id === p.l);
  const n = loop.punkte.length;
  const s0 = loop.punkte[p.i].s;
  let s1 = loop.punkte[(p.i + 1) % n].s;
  if (s1 <= s0) s1 += loop.laenge;
  const sm = ((s0 + s1) / 2) % loop.laenge;
  // die Probe der Linie, die dieser Stelle am nächsten liegt
  let j = 0;
  for (let q = 0; q < loop.s.length; q++) if (Math.abs(loop.s[q] - sm) < Math.abs(loop.s[j] - sm)) j = q;
  const ort = { x: loop.ruhe[3 * j], y: loop.ruhe[3 * j + 1], z: loop.ruhe[3 * j + 2] };
  const uvO = ansicht === 'seite' ? [ort.x, -ort.y] : ansicht === 'front' ? [ort.z, -ort.y] : [ort.x, ort.z];
  await K('ausschnitt', ansicht, { cx: uvO[0], cy: uvO[1], zoom: ZOOM });
  await seite.waitForTimeout(150);
  const b = await K('bild', ansicht, ort);
  const was = await seite.evaluate(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    return e ? `${e.tagName} l=${e.getAttribute('data-l')} i=${e.getAttribute('data-i')}` : 'nichts';
  }, [b.x, b.y]);
  const t = Date.now();
  await seite.mouse.click(b.x, b.y);
  await seite.waitForTimeout(60);
  await seite.mouse.click(b.x, b.y);
  await seite.waitForTimeout(Number(process.env.NEU_PAUSE ?? 500));
  const danach = await K('loops');
  const lNeu = danach.find((x) => x.id === p.l);
  const wahl = await K('auswahl');
  console.log(`\nneuer Punkt auf Loop ${p.l} (unter der Maus: ${was}): ${n} → ${lNeu.punkte.length} Punkte, gewählt ${JSON.stringify(wahl)}, ${Date.now() - t} ms nach dem ersten Klick · beschäftigt ${JSON.stringify((await K('zeiten')).beschaeftigt)}`);
  if (lNeu.punkte.length === n || !wahl.length) return null;
  const w = wahl[0];
  return { l: w.l, i: w.i, ref: lNeu.punkte[w.i].ref };
};

/** KANTE=1: statt zu ziehen den Punkt wählen und K drücken (Kante an), dann noch einmal K (Kante aus); je wie lange das Fenster stillsteht */
if (process.env.KANTE === '1') {
  const p = await punkt();
  const uvK = ansicht === 'seite' ? [p.ref.x, -p.ref.y] : ansicht === 'front' ? [p.ref.z, -p.ref.y] : [p.ref.x, p.ref.z];
  await K('ausschnitt', ansicht, { cx: uvK[0], cy: uvK[1], zoom: ZOOM });
  await seite.waitForTimeout(150);
  const b = await K('bild', ansicht, p.ref);
  await seite.mouse.click(b.x, b.y);
  await seite.waitForTimeout(200);
  await ruhig();
  for (const was of ['Kante an', 'Kante aus']) {
    await seite.evaluate(() => {
      const m = { bilder: [], laeuft: true };
      window.__mitlesen = m;
      let letzte = performance.now();
      const bild = () => {
        const jetzt = performance.now();
        m.bilder.push({ t: jetzt, ab: jetzt - letzte });
        letzte = jetzt;
        if (m.laeuft) requestAnimationFrame(bild);
      };
      requestAnimationFrame(bild);
    });
    await seite.waitForTimeout(200);
    const t0 = await seite.evaluate(() => performance.now());
    await seite.keyboard.press('k');
    await seite.waitForTimeout(200);
    await ruhig();
    const t1 = await seite.evaluate(() => performance.now());
    const bilder = await seite.evaluate(() => {
      window.__mitlesen.laeuft = false;
      return window.__mitlesen.bilder;
    });
    const danach = bilder.filter((x) => x.t > t0);
    const still = danach.reduce((x, q) => Math.max(x, q.ab), 0);
    const h = await heil();
    console.log(`${was} (Punkt ${p.l}:${p.i}): das Fenster steht höchstens ${still.toFixed(0)} ms still, alles ruht nach ${((t1 - t0) / 1000).toFixed(1)} s · ${h.punkte} Punkte, nicht endlich ${h.kaputt} · ${(await seite.evaluate(() => document.getElementById('status').textContent)).slice(0, 90)}`);
  }
  console.log(`\nKonsole: ${fehler.length ? fehler.slice(0, 3).join(' | ') : 'keine Fehler'}`);
  await browser.close();
  process.exit(0);
}

for (let mal = 1; mal <= MAL; mal++) {
  let p = await punkt();
  if (process.env.NEU === '1') {
    const q = await neuerPunkt(p);
    if (!q) {
      console.log('kein neuer Punkt gesetzt');
      break;
    }
    p = q;
  }
  // ECKE=1: der Punkt wird vor dem ersten Zug eine Ecke (⌥-Klick; danach kurz warten, sonst wäre der Druck ein Doppelklick)
  if (process.env.ECKE === '1' && mal === 1) {
    const uvE = ansicht === 'seite' ? [p.ref.x, -p.ref.y] : ansicht === 'front' ? [p.ref.z, -p.ref.y] : [p.ref.x, p.ref.z];
    await K('ausschnitt', ansicht, { cx: uvE[0], cy: uvE[1], zoom: ZOOM });
    await seite.waitForTimeout(150);
    const e = await K('bild', ansicht, p.ref);
    await seite.keyboard.down('Alt');
    await seite.mouse.click(e.x, e.y);
    await seite.keyboard.up('Alt');
    await seite.waitForTimeout(200);
    await ruhig();
    await seite.waitForTimeout(500);
    const L = await K('loops');
    console.log(`Ecke gesetzt: ${JSON.stringify(L.find((x) => x.id === p.l).punkte[p.i].ecke)} · ${(await seite.evaluate(() => document.getElementById('status').textContent)).slice(0, 80)}`);
  }
  // den Ausschnitt des Blatts auf den Zug legen (die gesicherte Form kann viel größer sein als das Blatt bei 100 %)
  // Blattkoordinaten wie im Fenster (`imBlatt`: y nach unten)
  const uv = (q) => (ansicht === 'seite' ? [q.x, -q.y] : ansicht === 'front' ? [q.z, -q.y] : [q.x, q.z]);
  const [u0, v0] = uv(p.ref);
  const [u1, v1] = uv({ x: p.ref.x + zx, y: p.ref.y + zy, z: p.ref.z + zz });
  await K('ausschnitt', ansicht, { cx: (u0 + u1) / 2, cy: (v0 + v1) / 2, zoom: ZOOM });
  await seite.waitForTimeout(150);
  const von = await K('bild', ansicht, p.ref);
  const nach = await K('bild', ansicht, { x: p.ref.x + zx, y: p.ref.y + zy, z: p.ref.z + zz });
  console.log(`\nZug ${mal}: Punkt ${p.l}:${p.i} bei (${p.ref.x.toFixed(0)}, ${p.ref.y.toFixed(0)}, ${p.ref.z.toFixed(0)})${p.kreuzung !== null && p.kreuzung !== undefined ? ', Kreuzung' : ''}${p.ecke ? ', Ecke' : ''} um (${zx}, ${zy}, ${zz}) in der ${ansicht}, ${SCHRITTE} Schritte je ${PAUSE} ms, halten ${HALTEN} ms`);
  // im Fenster mitlesen: je Bild Zeit und ob sich die Haut bewegt hat (ein Streuwert weniger Punkte)
  await seite.evaluate(() => {
    const k = window.__kurven;
    const m = { bilder: [], laeuft: true };
    window.__mitlesen = m;
    let letzte = performance.now();
    const probe = () => {
      const p = k.roh().pos;
      let s = 0;
      for (let i = 0; i < p.length; i += 97) s += p[i];
      return s;
    };
    let vorher = probe();
    const bild = () => {
      const jetzt = performance.now();
      const s = probe();
      m.bilder.push({ t: jetzt, ab: jetzt - letzte, bewegt: s !== vorher, punkte: k.roh().pos.length / 3 });
      vorher = s;
      letzte = jetzt;
      if (m.laeuft) requestAnimationFrame(bild);
    };
    requestAnimationFrame(bild);
  });
  await seite.mouse.move(von.x, von.y);
  await seite.waitForTimeout(100);
  const tDruck = await seite.evaluate(() => performance.now());
  await seite.mouse.down();
  let geplatzt = null;
  for (let i = 1; i <= SCHRITTE; i++) {
    await seite.mouse.move(von.x + ((nach.x - von.x) * i) / SCHRITTE, von.y + ((nach.y - von.y) * i) / SCHRITTE);
    await seite.waitForTimeout(PAUSE);
    if (i % 5 === 0 || i === SCHRITTE) {
      const h = await heil();
      if (h.kaputt > 0 || h.max > 20 * Math.max(300, anfang.max) || h.punkte > 4 * anfang.punkte) {
        geplatzt = { schritt: i, ...h };
        break;
      }
    }
  }
  const tEnde = await seite.evaluate(() => performance.now());
  if (!geplatzt) await seite.waitForTimeout(HALTEN);
  if (process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}-zug${mal}-gehalten.jpg`, type: 'jpeg', quality: 85 });
  const vorLos = await K('zeiten');
  // glatte Anzeige (`&anzeige=glatt`): was sie im Zug je Bild kostet
  const glattImZug = await seite.evaluate(() => window.__kurven.glatt?.() ?? null);
  const hVor = await heil();
  await seite.mouse.up();
  const tLos = await seite.evaluate(() => performance.now());
  let ruhe = 'ja';
  try {
    await seite.waitForTimeout(150);
    await ruhig(120000);
  } catch {
    ruhe = 'NEIN (nach 120 s rechnet noch etwas)';
  }
  const tRuhe = await seite.evaluate(() => performance.now());
  const m = await seite.evaluate(() => {
    window.__mitlesen.laeuft = false;
    return window.__mitlesen.bilder;
  });
  const z = await K('zeiten');
  const hNach = await heil();
  const imZug = m.filter((b) => b.t >= tDruck && b.t <= tLos);
  const erste = imZug.find((b) => b.bewegt);
  const ab = imZug.map((b) => b.ab).sort((a, b) => a - b);
  const q = (f) => (ab.length ? ab[Math.min(ab.length - 1, Math.floor(f * ab.length))] : NaN);
  const nachLos = m.filter((b) => b.t > tLos);
  const letzteBewegung = [...nachLos].reverse().find((b) => b.bewegt);
  // wie lange das Fenster nach dem Loslassen höchstens stillsteht (Abstand von Bild zu Bild)
  const still = nachLos.reduce((x, b) => Math.max(x, b.ab), 0);
  const wechsel = [];
  for (let i = 1; i < m.length; i++) if (m[i].punkte !== m[i - 1].punkte) wechsel.push(`${m[i - 1].punkte} → ${m[i].punkte} nach ${((m[i].t - tLos) / 1000).toFixed(1)} s`);
  const runden = z.zug.slice(-200);
  const mittel = runden.length ? runden.reduce((s, v) => s + v, 0) / runden.length : NaN;
  if (geplatzt) console.log(`  GEPLATZT bei Schritt ${geplatzt.schritt}: ${geplatzt.punkte} Punkte, größte Koordinate ${geplatzt.max}, nicht endliche Lagen ${geplatzt.kaputt}`);
  console.log(`  Greifen: erste Bewegung der Haut ${erste ? `${Math.round(erste.t - tDruck)} ms nach dem Drücken` : 'keine'}`);
  console.log(`  im Zug (${((tLos - tDruck) / 1000).toFixed(1)} s): ${imZug.length} Bilder, Abstand Median ${q(0.5).toFixed(0)} ms, 95 % ${q(0.95).toFixed(0)} ms, längster ${(ab[ab.length - 1] ?? NaN).toFixed(0)} ms · je Runde ${mittel.toFixed(1)} ms`);
  if (glattImZug) console.log(`  glatte Anzeige im Zug: ${glattImZug.stufen} Stufen, ${glattImZug.dreiecke} Dreiecke, ${glattImZug.ms.toFixed(1)} ms je Bild, Linienbänder ${glattImZug.baenderMs.toFixed(1)} ms`);
  console.log(`  beim Loslassen: Haut steht ${vorLos.offen ? 'NICHT' : ''} (Runden seit der letzten Mausbewegung ${vorLos.nachRunden}) · ${hVor.punkte} Punkte, größte Koordinate ${hVor.max}`);
  console.log(`  nach dem Loslassen: das Fenster steht höchstens ${still.toFixed(0)} ms still (Bilder über 100 ms Abstand: ${nachLos.filter((b) => b.ab > 100).length}) · letzte Bewegung der Haut nach ${letzteBewegung ? ((letzteBewegung.t - tLos) / 1000).toFixed(1) : '0'} s, alles ruht nach ${((tRuhe - tLos) / 1000).toFixed(1)} s (${ruhe}) · Netzwechsel: ${wechsel.length ? wechsel.join(', ') : 'keiner'}`);
  console.log(`  Auftrag im Hintergrund: ${JSON.stringify(z.auftrag)}`);
  console.log(`  Schutz: Zug zurückgenommen ${z.davon ?? '-'}-mal, Fehler beim Rechnen ${z.fehler ?? '-'}, Löser vorsichtig ${z.unruhe ?? '-'}-mal (zuletzt ${JSON.stringify(z.letzteUnruhe ?? null)}) · Meldung: ${JSON.stringify(await K('meldung'))}`);
  console.log(`  am Ende: ${hNach.punkte} Punkte, größte Koordinate ${hNach.max}, nicht endliche Lagen ${hNach.kaputt} · Statuszeile: ${(await seite.evaluate(() => document.getElementById('status').textContent)).slice(0, 150)}`);
  void tEnde;
  if (process.env.BILD) await seite.screenshot({ path: `${process.env.BILD}-zug${mal}-ruhe.jpg`, type: 'jpeg', quality: 85 });
  if (geplatzt || hNach.kaputt > 0) break;
}
console.log(`\nKonsole: ${fehler.length ? fehler.slice(0, 3).join(' | ') : 'keine Fehler'}`);
await browser.close();
