// Form zuerst (10.11.2026), Gegenprüfung Schritt G2: Was ändert sich im Blatt, wenn man einen Griff loslässt?
// Ablauf mit der Maus: zwei Loops schneiden (Ring rundum, Loop der Seitenlinie), im Top einen Punkt nahe an der Kreuzung auf den Ring
// setzen (er hat einen kurzen Griff), den kurzen Griff ziehen. Gemessen mit gedrückter Maus und nach dem Loslassen:
//   Griffspitze gegen Maus · Sprung der Griffspitze beim Loslassen · Linie im Zug gegen die Linie danach · Bewegung der Haut danach
// Aufruf aus apps/editor: node scripts/pruefen/form-griff-loslassen.mjs <ordner>
//   KURVEN_URL=<Adresse> (Standard http://localhost:5193/kurven.html?gewichte=geometrie; zum Vergleich …&griffe=mindest)
//   NAME=<Zusatz für die Bildnamen>   WINKEL=<Grad neben der Kreuzung, Standard 12>
//   ZUG=punkt: statt des Griffs den Punkt selbst 40 px nach außen ziehen (Linie im Zug gegen die Linie danach)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie';
const name = process.env.NAME ?? 'wahr';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);

const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
const ziehen = async ([x, y], [x2, y2], schritte = 12, loslassen = true) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / schritte, y + ((y2 - y) * i) / schritte);
    await seite.waitForTimeout(20);
  }
  if (loslassen) {
    await seite.mouse.up();
    await seite.waitForTimeout(250);
  }
};
const abstand = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : null);
/** Mitte der Griffspitze im Blatt (Seitenpixel) */
const spitze = (id, i, g) =>
  seite.evaluate(
    ([id2, i2, g2]) => {
      const e = document.querySelector(`#blatt-top rect.griff[data-l="${id2}"][data-i="${i2}"][data-g="${g2}"]`);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    },
    [id, i, g],
  );
/** die Linie eines Loops im Top als Punktfolge in Seitenpixeln (gespeicherte Hälfte) */
const linie = (id) =>
  seite.evaluate((id2) => {
    const e = document.querySelector(`#blatt-top path.kurve-treffer[data-l="${id2}"]:not([data-m])`);
    if (!e) return [];
    const m = e.getScreenCTM();
    const n = 400;
    const L = e.getTotalLength();
    const out = [];
    for (let k = 0; k <= n; k++) {
      const p = e.getPointAtLength((L * k) / n);
      out.push([m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f]);
    }
    return out;
  }, id);
/** größter Abstand zweier Punktfolgen (jeder Punkt der einen zur nächsten Strecke der anderen) */
const linienAbstand = (A, B) => {
  const zurStrecke = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const einseitig = (P, Q) => {
    let m = 0;
    for (const p of P) {
      let d = Infinity;
      for (let k = 0; k + 1 < Q.length; k++) d = Math.min(d, zurStrecke(p, Q[k], Q[k + 1]));
      m = Math.max(m, d);
    }
    return m;
  };
  return Math.max(einseitig(A, B), einseitig(B, A));
};
const hautWeg = (a, b) => {
  if (a.length !== b.length) return null;
  let m = 0;
  for (let i = 0; i < a.length; i += 3) m = Math.max(m, Math.hypot(a[i] - b[i], a[i + 1] - b[i + 1], a[i + 2] - b[i + 2]));
  return m;
};
const feldTop = await seite.evaluate(() => {
  const r = document.getElementById('feld-top').getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

// zwei Loops: Ring rundum (waagerecht über die Mitte der Front), Loop der Seitenlinie (senkrecht auf der Mitte)
await seite.keyboard.press('l');
await ziehen(await bild('front', { x: 0, y: 0, z: -190 }), await bild('front', { x: 0, y: 0, z: 190 }));
await seite.waitForTimeout(900);
await seite.keyboard.press('l');
await ziehen(await bild('front', { x: 0, y: 190, z: 0 }), await bild('front', { x: 0, y: -190, z: 0 }));
await seite.waitForTimeout(1200);
let L = await K('loops');
const ring = L.find((l) => l.art === 'ring');
if (!ring) throw new Error(`kein Ring unter den Loops (${L.map((l) => l.art).join(', ')})`);

// neuer Punkt auf dem Ring, WINKEL (Standard 12°) neben der Kreuzung vorn: sein Griff zur Kreuzung hin ist kurz. Mit der
// Mindestlänge landet die gestreckte Spitze bei 12° genau auf dem Kreuzungspunkt und ist nicht zu greifen: dort WINKEL=20
const w = (Number(process.env.WINKEL ?? 12) * Math.PI) / 180;
const ort = { x: 150 * Math.cos(w), y: 0, z: 150 * Math.sin(w) };
const [ox, oy] = await bild('top', ort);
await seite.mouse.click(ox, oy);
await seite.waitForTimeout(60);
await seite.mouse.click(ox, oy);
await seite.waitForTimeout(1500);
L = await K('loops');
const R = L.find((l) => l.id === ring.id);
let i = -1;
let best = Infinity;
R.punkte.forEach((p, k) => {
  const d = Math.hypot(p.ref.x - ort.x, p.ref.y - ort.y, p.ref.z - ort.z);
  if (p.sichtbar && d < best) {
    best = d;
    i = k;
  }
});
if (i < 0 || best > 12) throw new Error(`kein neuer Punkt nahe der Stelle (nächster ${best.toFixed(1)} Einheiten entfernt)`);
const P = R.punkte[i];
const lang = (v) => Math.hypot(v.x, v.y, v.z);
const g = lang(P.ein) < lang(P.aus) ? 'ein' : 'aus';
const [px, py] = await bild('top', P.ref);
// wählen (ein einzelner Klick, mit Abstand zum Doppelklick davor)
const wahl = await K('auswahl');
if (!wahl.some((x) => x.l === ring.id && x.i === i)) {
  await seite.mouse.click(px, py);
  await seite.waitForTimeout(900);
}
const s0 = await spitze(ring.id, i, g);
if (!s0) throw new Error('Griff des neuen Punkts ist nicht zu sehen');
const pxJeEinheit = abstand(await bild('top', { x: 0, y: 0, z: 0 }), await bild('top', { x: 100, y: 0, z: 0 })) / 100;
console.log(
  `${basis}\nRing ${ring.id}, neuer Punkt ${i}: Griffe ${lang(P.ein).toFixed(1)} und ${lang(P.aus).toFixed(1)} Einheiten ` +
    `(${(lang(P.ein) * pxJeEinheit).toFixed(1)} und ${(lang(P.aus) * pxJeEinheit).toFixed(1)} px bei ${pxJeEinheit.toFixed(2)} px je Einheit); ` +
    `gezogen wird „${g}“, gezeigt ${abstand(s0, [px, py]).toFixed(1)} px lang`,
);

// den kurzen Griff 60 px in seiner Richtung hinausziehen (ZUG=punkt: den Punkt 40 px von der Mitte weg), Maus bleibt gedrückt
const r = abstand(s0, [px, py]);
const punktZug = process.env.ZUG === 'punkt';
const mitte = await bild('top', { x: 0, y: 0, z: 0 });
const rm = abstand([px, py], mitte);
const ziel = punktZug ? [px + (40 * (px - mitte[0])) / rm, py + (40 * (py - mitte[1])) / rm] : [s0[0] + (60 * (s0[0] - px)) / r, s0[1] + (60 * (s0[1] - py)) / r];
await ziehen(punktZug ? [px, py] : s0, ziel, 14, false);
await seite.waitForTimeout(150);
const imZug = { spitze: await spitze(ring.id, i, g), linie: await linie(ring.id), haut: await K('lagen') };
if (!imZug.spitze) {
  const liste = await seite.evaluate(() =>
    [...document.querySelectorAll('#blatt-top rect.griff')].map((e) => `${e.getAttribute('data-l')}:${e.getAttribute('data-i')}:${e.getAttribute('data-g')}`),
  );
  console.log(`Griff im Zug nicht gefunden; im Blatt: ${liste.join(' ') || 'keine Griffe'}; Auswahl ${JSON.stringify(await K('auswahl'))}`);
}
await seite.screenshot({ path: `${ordner}/form-griff-loslassen-${name}-im-zug.png`, clip: feldTop });
await seite.mouse.up();
await seite.waitForTimeout(120);
const gleich = { spitze: await spitze(ring.id, i, g), linie: await linie(ring.id) };
await seite.waitForTimeout(2500);
const danach = { spitze: await spitze(ring.id, i, g), linie: await linie(ring.id), haut: await K('lagen') };
await seite.screenshot({ path: `${ordner}/form-griff-loslassen-${name}-danach.png`, clip: feldTop });

const f = (x) => (x === null ? '–' : x.toFixed(2));
if (punktZug) console.log('Zug am Punkt (40 px nach außen); die Griffspitze geht mit dem Punkt mit');
else console.log(`Griffspitze ↔ Maus mit gedrückter Maus: ${f(abstand(imZug.spitze, ziel))} px`);
console.log(
  `Sprung der Griffspitze beim Loslassen: ${f(abstand(imZug.spitze, gleich.spitze))} px sofort, ${f(abstand(imZug.spitze, danach.spitze))} px nach 2,5 s`,
);
console.log(
  `Linie im Zug ↔ nach dem Loslassen: ${f(linienAbstand(imZug.linie, gleich.linie))} px sofort, ${f(linienAbstand(imZug.linie, danach.linie))} px nach 2,5 s`,
);
const hw = hautWeg(imZug.haut, danach.haut);
const z = await K('zeiten');
console.log(
  hw === null
    ? `Haut: Netz nach dem Loslassen geändert (${imZug.haut.length / 3} → ${danach.haut.length / 3} Punkte), Endrunden bewegten ${f(z.endrunden)} Einheiten`
    : `Haut nach dem Loslassen: bis ${f(hw)} Einheiten bewegt (${imZug.haut.length / 3} Punkte), Endrunden ${f(z.endrunden)} Einheiten`,
);
console.log(`je Mausbewegung (nur Löser): ${z.zug.slice(-12).map((t) => t.toFixed(1)).join(' ')} ms`);
if (fehler.length) console.log(`FEHLER in der Konsole:\n${fehler.join('\n')}`);
await browser.close();
