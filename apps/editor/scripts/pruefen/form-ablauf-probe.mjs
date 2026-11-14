// Form zuerst (11.11.2026): einen Ablauf an einer gesicherten Form nachspielen wie mit der Maus und nach jedem Schritt festhalten,
// wie es der Haut geht. Anlass: Florians `test_kaputt` („wenn du in der Front den mittleren obersten Punkt bewegst und damit spielst,
// bläst sich das Mesh auf und wird irgendwann zerrissen … sobald ich die Mittelachse kreuze und dann wieder zurückfahre, wobbelt
// das Mesh und kommt oft nur sehr zerrissen mit schwarzen Rissen zur Ruhe“).
// Ein Schritt (durch ; getrennt):
//   zug <ansicht> <loop>:<i> <dx,dy,dz>[><dx,dy,dz>…]     den Punkt über Wegpunkte ziehen (je Versatz gegen seinen Anfang), loslassen
//                                                         (<i>: Nummer des Punkts oder oben|unten|vorn|hinten|aussen)
//   griff <ansicht> <loop>:<i> <ein|aus> <dx,dy,dz>[>…]   den Punkt wählen, dann die Griffspitze über Wegpunkte ziehen, loslassen
//   warte <ms>
//   (ein Schritt kann mit @<zoom> enden: der Zoom des Blatts für diesen Schritt, z. B. um nahe der Mitte den richtigen Punkt zu greifen)
// Nach jedem Schritt: Punkte im Netz, größte Koordinate, Rauminhalt, umgeschlagene Dreiecke, umgestülpte Stellen (die Außenseite zeigt
// ins Innere: schwarz im Fenster, auch wo die Hälften an der Spiegelkante durcheinander laufen), flachste Stelle (kleinster Winkel
// zwischen Nachbardreiecken über 150°), wie lange bis alles ruht, was der Schutz getan hat, Meldung in der Statuszeile.
// Aufruf aus apps/editor: NAME=test_kaputt ABLAUF="zug front 4:1 0,40,0>0,-40,0>0,0,0" node scripts/pruefen/form-ablauf-probe.mjs
//   SCHRITTE=12 (Mausschritte je Wegstück)   PAUSE=16 (ms je Mausschritt)   HALTEN=300 (ms vor dem Loslassen)
//   ZOOM=0.5   BILD=<pfad ohne Endung> (ein Bild nach jedem Schritt)   WARTEN=60 (s höchstens bis zur Ruhe)   KURVEN_URL
//   ORTE=1 (wo die Knicke über 150° liegen)   LINIEN=1 (Punkte, Kreuzungen und Lage der Linien nach jedem Schritt)
import { chromium } from '@playwright/test';
import { geo, umgestuelpt } from './lib-umgestuelpt.mjs';

const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const NAME = process.env.NAME ?? 'test_kaputt';
const SCHRITTE = Number(process.env.SCHRITTE ?? 12);
const PAUSE = Number(process.env.PAUSE ?? 16);
const HALTEN = Number(process.env.HALTEN ?? 300);
const ZOOM = Number(process.env.ZOOM ?? 0.5);
const WARTEN = Number(process.env.WARTEN ?? 60);
const ablauf = (process.env.ABLAUF ?? 'zug front 4:1 0,40,0>0,-40,0>0,0,0')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);
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
const ruhig = async () => {
  const t = Date.now();
  await seite.waitForTimeout(120);
  try {
    await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: WARTEN * 1000 });
    return (Date.now() - t) / 1000;
  } catch {
    return Infinity;
  }
};
/** wie es der Haut geht (im Fenster gerechnet, ohne die Felder zu kopieren) */
const zustandSeite = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const { pos: P, tri: T } = k.roh();
    let max = 0;
    let kaputt = 0;
    for (let i = 0; i < P.length; i++) {
      if (!Number.isFinite(P[i])) kaputt++;
      else if (Math.abs(P[i]) > max) max = Math.abs(P[i]);
    }
    let inhalt = 0;
    let flaeche = 0;
    // Kanten: Winkel zwischen den Normalen der beiden Dreiecke
    const kanten = new Map();
    const nor = new Float64Array(T.length);
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
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz);
      flaeche += l / 2;
      nor[t] = nx / (l || 1);
      nor[t + 1] = ny / (l || 1);
      nor[t + 2] = nz / (l || 1);
      for (let e = 0; e < 3; e++) {
        const p = T[t + e];
        const q = T[t + ((e + 1) % 3)];
        const key = p < q ? p * 1e7 + q : q * 1e7 + p;
        const alt = kanten.get(key);
        if (alt === undefined) kanten.set(key, t);
        else kanten.set(key, -1 - (alt * 1e7 + t));
      }
    }
    let scharf = 0;
    let spitz = 0;
    const orte = [];
    for (const [key, v] of kanten) {
      if (v >= 0) continue;
      const w = -1 - v;
      const t1 = Math.floor(w / 1e7);
      const t2 = w % 1e7;
      const c = nor[t1] * nor[t2] + nor[t1 + 1] * nor[t2 + 1] + nor[t1 + 2] * nor[t2 + 2];
      if (c < Math.cos((60 * Math.PI) / 180)) scharf++;
      if (c < Math.cos((150 * Math.PI) / 180)) {
        spitz++;
        // Mitte der Kante und ihre Länge
        const p = Math.floor(key / 1e7);
        const q = key % 1e7;
        if (orte.length < 40) orte.push([(P[3 * p] + P[3 * q]) / 2, (P[3 * p + 1] + P[3 * q + 1]) / 2, (P[3 * p + 2] + P[3 * q + 2]) / 2, Math.hypot(P[3 * p] - P[3 * q], P[3 * p + 1] - P[3 * q + 1], P[3 * p + 2] - P[3 * q + 2])]);
      }
    }
    const z = k.zeiten();
    return {
      punkte: P.length / 3,
      max: Math.round(max),
      kaputt,
      inhalt: inhalt / 6,
      flaeche,
      scharf,
      spitz,
      umgeschlagen: k.umgeschlagen(),
      orte,
      davon: z.davon,
      fehler: z.fehler,
      unruhe: z.unruhe,
      meldung: k.meldung(),
      status: document.getElementById('status')?.textContent ?? '',
    };
  });
/** der Zustand der Haut, dazu die umgestülpten Stellen (schwarz im Fenster), in Node aus Lagen und Dreiecken gerechnet */
const zustand = async () => {
  const z = await zustandSeite();
  // gemessen wird die Haut, wie sie gezeigt wird (seit dem 11.11. schneidet die Anzeige jede Hälfte an der Spiegelebene ab); auf
  // älteren Ständen die Haut selbst
  const [P, T] = await seite.evaluate(() => {
    const a = window.__kurven.anzeige?.();
    return a ? [a.lagen, a.dreiecke] : [Array.from(window.__kurven.lagen()), Array.from(window.__kurven.dreiecke())];
  });
  z.schwarz = umgestuelpt(P, T, geo(P, T));
  return z;
};
const zeile = (z, z0) =>
  `${z.punkte} Punkte · größte Koordinate ${z.max}${z.kaputt ? ` · NICHT ENDLICH ${z.kaputt}` : ''} · Rauminhalt ${(z.inhalt / z0.inhalt * 100).toFixed(1)} % · Fläche ${(z.flaeche / z0.flaeche * 100).toFixed(1)} % · Knicke über 60° ${z.scharf}, über 150° ${z.spitz} · umgeschlagen ${z.umgeschlagen} · umgestülpt (schwarz) ${z.schwarz.zahl}, ${(100 * z.schwarz.anteil).toFixed(1)} % der Fläche · Schutz: zurückgenommen ${z.davon}, Fehler ${z.fehler}, Schritt verkleinert ${z.unruhe}${z.meldung ? ` · Meldung: ${z.meldung.slice(0, 110)}` : ''}`;

const text = await seite.evaluate((n) => window.__kurven.ablage.laden(n), NAME);
console.log(text);
if (!text.startsWith('geladen')) {
  await browser.close();
  process.exit(1);
}
await ruhig();
const z0 = await zustand();
console.log(`Anfang: ${zeile(z0, z0)}`);
const uv = (a, q) => (a === 'seite' ? [q.x, -q.y] : a === 'front' ? [q.z, -q.y] : [q.x, q.z]);
const v3 = (s) => {
  const [x, y, z] = s.split(',').map(Number);
  return { x, y, z };
};
const plus = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
/** von einem Bildschirmpunkt über Wegpunkte ziehen (alle in der Welt), halten, loslassen */
const ziehen = async (a, start, wege, zoom = ZOOM) => {
  // der Ausschnitt so, dass Anfang und alle Wegpunkte im Blatt liegen
  const alle = [start, ...wege].map((q) => uv(a, q));
  const us = alle.map((q) => q[0]);
  const vs = alle.map((q) => q[1]);
  await K('ausschnitt', a, { cx: (Math.min(...us) + Math.max(...us)) / 2, cy: (Math.min(...vs) + Math.max(...vs)) / 2, zoom });
  await seite.waitForTimeout(150);
  let von = await K('bild', a, start);
  await seite.mouse.move(von.x, von.y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (const w of wege) {
    const nach = await K('bild', a, w);
    for (let i = 1; i <= SCHRITTE; i++) {
      await seite.mouse.move(von.x + ((nach.x - von.x) * i) / SCHRITTE, von.y + ((nach.y - von.y) * i) / SCHRITTE);
      await seite.waitForTimeout(PAUSE);
    }
    von = nach;
  }
  await seite.waitForTimeout(HALTEN);
  const gehalten = await zustand();
  await seite.mouse.up();
  return gehalten;
};

const linien0 = process.env.LINIEN === '1' ? await K('loops') : [];
if (process.env.LINIEN === '1') {
  const f3 = (w) => (w ? `(${w.x.toFixed(1)}, ${w.y.toFixed(1)}, ${w.z.toFixed(1)})` : '–');
  for (const x of linien0) console.log(`   Loop ${x.id}:${x.art} ${x.punkte.length} Punkte: ${x.punkte.map((q, i) => `${i} ${f3(q.ref)} ein ${f3(q.ein)} aus ${f3(q.aus)}${q.ecke ? ' Ecke' : ''}${q.kreuzung !== null ? ` K${q.kreuzung}` : ''}`).join(' | ')}`);
}
let nr = 0;
for (const schritt of ablauf) {
  nr++;
  const teile = schritt.split(/\s+/);
  let zoom = ZOOM;
  if (teile[teile.length - 1].startsWith('@')) zoom = Number(teile.pop().slice(1));
  if (teile[0] === 'warte') {
    await seite.waitForTimeout(Number(teile[1]));
    continue;
  }
  const a = teile[1];
  const [lidText, piText] = teile[2].split(':');
  const lid = Number(lidText);
  const L = await K('loops');
  const loop = L.find((x) => x.id === lid);
  // der Punkt nach seiner Nummer oder nach seiner Lage im Loop: oben, unten, vorn, hinten, aussen (die Nummern hängen am Stand)
  const wert = { oben: (q) => q.y, unten: (q) => -q.y, vorn: (q) => -q.x, hinten: (q) => q.x, aussen: (q) => q.z }[piText];
  let pi = Number(piText);
  if (wert && loop) {
    pi = 0;
    loop.punkte.forEach((q, i) => {
      if (q.sichtbar !== false && wert(q.ref) > wert(loop.punkte[pi].ref)) pi = i;
    });
  }
  const p = loop?.punkte[pi];
  if (!p) {
    console.log(`Schritt ${nr} „${schritt}“: Punkt ${teile[2]} gibt es nicht`);
    break;
  }
  let gehalten;
  if (teile[0] === 'zug') {
    const wege = teile[3].split('>').map((s) => plus(p.ref, v3(s)));
    gehalten = await ziehen(a, p.ref, wege, zoom);
  } else if (teile[0] === 'griff') {
    // den Punkt wählen (Klick), dann die Griffspitze ziehen
    const [u, v] = uv(a, p.ref);
    await K('ausschnitt', a, { cx: u, cy: v, zoom });
    await seite.waitForTimeout(150);
    const b = await K('bild', a, p.ref);
    await seite.mouse.click(b.x, b.y);
    await seite.waitForTimeout(250);
    await ruhig();
    await seite.waitForTimeout(450);
    const g = await K('griffe', lid, pi);
    const spitze = g[teile[3]];
    if (!spitze) {
      console.log(`Schritt ${nr} „${schritt}“: kein Griff ${teile[3]}`);
      break;
    }
    const wege = teile[4].split('>').map((s) => plus(spitze, v3(s)));
    gehalten = await ziehen(a, spitze, wege, zoom);
  } else {
    console.log(`Schritt ${nr}: „${schritt}“ nicht verstanden`);
    break;
  }
  const dauer = await ruhig();
  const z = await zustand();
  console.log(`\nSchritt ${nr} „${schritt}“\n   gehalten:  ${zeile(gehalten, z0)}\n   in Ruhe (${Number.isFinite(dauer) ? `nach ${dauer.toFixed(1)} s` : `NICHT nach ${WARTEN} s`}): ${zeile(z, z0)}`);
  if (process.env.LINIEN === '1') {
    // die Linien nach dem Schritt: Punkte und Kreuzungen je Loop, wie weit die Linie von ihrer Lage am Anfang liegt, der gezogene Punkt
    const L2 = await K('loops');
    const zeilen = L2.map((x) => {
      const x0 = linien0.find((y) => y.id === x.id);
      let weit = NaN;
      if (x0 && x0.ruhe.length === x.ruhe.length) {
        weit = 0;
        for (let j = 0; j < x.ruhe.length; j += 3) weit = Math.max(weit, Math.hypot(x.ruhe[j] - x0.ruhe[j], x.ruhe[j + 1] - x0.ruhe[j + 1], x.ruhe[j + 2] - x0.ruhe[j + 2]));
      }
      return `${x.id}:${x.art} ${x.punkte.length} Punkte (${x.punkte.filter((q) => q.kreuzung !== null).length} Kreuzungen, ${x.punkte.filter((q) => q.ecke).length} Ecken), ${x.proben} Proben${x.eingesetzt ? '' : ' LOSE'}, gegen den Anfang ${Number.isNaN(weit) ? 'andere Probenzahl' : weit.toFixed(2)}`;
    });
    console.log(`   Linien: ${zeilen.join(' · ')}`);
    const q = L2.find((x) => x.id === lid)?.punkte[pi];
    const f3 = (w) => (w ? `(${w.x.toFixed(1)}, ${w.y.toFixed(1)}, ${w.z.toFixed(1)})` : '–');
    if (q) console.log(`   Punkt ${lid}:${pi} bei ${f3(q.ref)}, Griff ein ${f3(q.ein)}, aus ${f3(q.aus)}, ${q.ecke ? 'Ecke' : 'glatt'}`);
  }
  if (process.env.ORTE === '1' && z.orte.length) console.log(`   Knicke über 150° bei (Mitte der Kante x, y, z · Länge): ${z.orte.map((o) => `(${o[0].toFixed(0)}, ${o[1].toFixed(0)}, ${o[2].toFixed(0)} · ${o[3].toFixed(1)})`).join(' ')}`);
  if (process.env.BILD) {
    // alle Blätter so, dass die Form hineinpasst
    const m = await K('masse');
    const zoom = (w, h) => Math.min(1.5, (0.9 * 560) / Math.max(w, h, 1));
    await K('ausschnitt', 'seite', { cx: (m[0] + m[1]) / 2, cy: -(m[2] + m[3]) / 2, zoom: zoom(m[1] - m[0], m[3] - m[2]) });
    await K('ausschnitt', 'front', { cx: (m[4] + m[5]) / 2, cy: -(m[2] + m[3]) / 2, zoom: zoom(m[5] - m[4], m[3] - m[2]) });
    await K('ausschnitt', 'top', { cx: (m[0] + m[1]) / 2, cy: (m[4] + m[5]) / 2, zoom: zoom(m[1] - m[0], m[5] - m[4]) });
    await seite.waitForTimeout(300);
    await seite.screenshot({ path: `${process.env.BILD}-${String(nr).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 85 });
  }
  if (z.kaputt) break;
}
console.log(`\nKonsole: ${fehler.length ? `${fehler.length} Fehler: ${fehler.slice(0, 3).join(' | ').slice(0, 300)}` : 'keine Fehler'}`);
await browser.close();
