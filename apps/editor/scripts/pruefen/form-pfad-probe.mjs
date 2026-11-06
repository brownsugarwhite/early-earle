// Form zuerst (06.11.2026), Teil A „Linien als Bézier-Pfade“ (`kurven.html`), mit der Maus: gespeicherte Griffe, Einfügen und Löschen
// wie in Illustrator.
// A. Form ums Auge mit F: Die Punkte haben gespeicherte Griffe.
// B. Doppelklick auf die Linie zwischen zwei Punkten: neuer Punkt, die Linie bleibt, der Punkt ist glatt, die Nachbargriffe behalten
//    ihre Richtung.
// C. Den oberen Punkt löschen (⌫): Die Nachbarn verbinden sich über ihre Griffe (Richtung bleibt), die Linie bewegt sich nur
//    zwischen ihnen.
// D. ⌘Z bis vor B: alles wie vorher.
// Aufruf aus apps/editor: node scripts/pruefen/form-pfad-probe.mjs <ordner für Bilder>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
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
const loops = () => K('loops');
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const betrag = (v) => Math.hypot(v.x, v.y, v.z);
const winkel = (a, b) => {
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (betrag(a) * betrag(b));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};
/** Lage einer Linie an der Stelle s (zwischen den Proben linear) */
const lageBeiS = (l, s) => {
  const n = l.s.length;
  let i = 0;
  while (i + 1 < n && l.s[i + 1] <= s) i++;
  const j = (i + 1) % n;
  const s1 = j > i ? l.s[j] : l.laenge;
  const f = s1 > l.s[i] ? (s - l.s[i]) / (s1 - l.s[i]) : 0;
  return [0, 1, 2].map((k) => l.ruhe[3 * i + k] + f * (l.ruhe[3 * j + k] - l.ruhe[3 * i + k]));
};
/** wie weit sich die Linie bewegt hat: in (s0, s1) und sonst */
const linieBewegt = (vorher, nachher, bereich) => {
  let innen = 0;
  let aussen = 0;
  for (let j = 0; j < vorher.s.length; j++) {
    const s = vorher.s[j];
    const a = [0, 1, 2].map((k) => vorher.ruhe[3 * j + k]);
    const b = lageBeiS(nachher, s);
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (bereich && s > bereich[0] && s < bereich[1]) innen = Math.max(innen, d);
    else aussen = Math.max(aussen, d);
  }
  return { innen, aussen };
};
/** Umgeklappte Dreiecke: Normale gegen die Normalen ihrer Ecken */
const umgeklappt = () =>
  seite.evaluate(() => {
    const p = window.__kurven.lagen();
    const t = window.__kurven.dreiecke();
    const fn = [];
    const vn = new Float64Array(p.length);
    for (let i = 0; i < t.length; i += 3) {
      const [a, b, c] = [t[i], t[i + 1], t[i + 2]];
      const ab = [p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]];
      const ac = [p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]];
      const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      fn.push(f);
      for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] += f[k];
    }
    let z = 0;
    for (let i = 0; i < t.length; i += 3) {
      const f = fn[i / 3];
      const m = [0, 1, 2].map((k) => vn[3 * t[i] + k] + vn[3 * t[i + 1] + k] + vn[3 * t[i + 2] + k]);
      if (f[0] * m[0] + f[1] * m[1] + f[2] * m[2] < 0) z++;
    }
    return z;
  });
const ausschnitt = async (name) => {
  await K('ausschnitt', 'seite', { cx: -60, cy: -45, zoom: 2.4 });
  await seite.waitForTimeout(150);
  const f = (await K('felder')).seite;
  await seite.screenshot({ path: `${ordner}/form-pfad-${name}-2026-11-06.jpg`, type: 'jpeg', quality: 88, clip: { x: f.x, y: f.y, width: f.w, height: f.h } });
  await K('ausschnitt', 'seite', { cx: 0, cy: 0, zoom: 1 });
  await seite.waitForTimeout(100);
};

// ---------- A. Form ums Auge ----------
await seite.keyboard.press('f');
const kreis = [];
for (let i = 0; i <= 48; i++) kreis.push(await bild('seite', { x: -60 + 32 * Math.cos((2 * Math.PI * i) / 48), y: 45 + 32 * Math.sin((2 * Math.PI * i) / 48), z: 0 }));
await seite.mouse.move(kreis[0].x, kreis[0].y);
await seite.mouse.down();
for (const p of kreis.slice(1)) {
  await seite.mouse.move(p.x, p.y);
  await seite.waitForTimeout(6);
}
await seite.mouse.up();
await seite.waitForTimeout(400);
await seite.keyboard.press('Escape');
let auge = (await loops()).at(-1);
console.log(`A Form: ${auge.art}, ${auge.punkte.length} Punkte, Griffe gespeichert ${auge.pfad}, an allen Punkten ${auge.punkte.every((p) => p.ein && p.aus)}`);
console.log(`  glatte Punkte: Griffe bis ${Math.max(...auge.punkte.map((p) => 180 - winkel(p.ein, p.aus))).toFixed(4)}° neben einer Geraden`);

// ---------- B. Doppelklick auf die Linie: neuer Punkt ----------
const vorB = auge;
const a = auge.punkte[1];
const b = auge.punkte[2];
const mitte = lageBeiS(auge, (a.s + b.s) / 2);
const [mx, my] = xy(await bild('seite', { x: mitte[0], y: mitte[1], z: mitte[2] }));
await seite.mouse.dblclick(mx, my);
await seite.waitForTimeout(400);
auge = (await loops()).find((l) => l.id === auge.id);
const neu = auge.punkte.find((p) => !vorB.punkte.some((q) => Math.abs(q.s - p.s) < 1e-6));
const a2 = auge.punkte.find((p) => Math.abs(p.s - a.s) < 1e-6);
const b2 = auge.punkte.find((p) => Math.abs(p.s - b.s) < 1e-6);
console.log(
  `B Doppelklick: ${vorB.punkte.length} → ${auge.punkte.length} Punkte · Linie bewegt ${linieBewegt(vorB, auge).aussen.toExponential(1)} · ` +
    `neuer Punkt ${neu ? `glatt bis ${(180 - winkel(neu.ein, neu.aus)).toFixed(4)}°` : 'fehlt'} · Nachbargriffe gedreht ${winkel(a.aus, a2.aus).toFixed(4)}° / ` +
    `${winkel(b.ein, b2.ein).toFixed(4)}°, Länge ×${(betrag(a2.aus) / betrag(a.aus)).toFixed(2)} / ×${(betrag(b2.ein) / betrag(b.ein)).toFixed(2)}`,
);

// ---------- C. Oberen Punkt löschen ----------
await seite.keyboard.press('Escape');
const vorC = auge;
const Q = auge.punkte;
const oi = Q.reduce((bi, p, i) => (p.ref.y > Q[bi].ref.y ? i : bi), 0);
const m = Q.length;
const vor = Q[(oi - 1 + m) % m];
const nach = Q[(oi + 1) % m];
await ausschnitt('loeschen-vorher');
await seite.mouse.click(...xy(await bild('seite', Q[oi].ref)));
await seite.waitForTimeout(250);
await seite.keyboard.press('Backspace');
await seite.waitForTimeout(800);
auge = (await loops()).find((l) => l.id === auge.id);
const v2 = auge.punkte.find((p) => Math.abs(p.s - vor.s) < 1e-6);
const n2 = auge.punkte.find((p) => Math.abs(p.s - nach.s) < 1e-6);
const bew = linieBewegt(vorC, auge, vor.s < nach.s ? [vor.s, nach.s] : null);
console.log(
  `C ⌫ oberer Punkt: ${vorC.punkte.length} → ${auge.punkte.length} Punkte · Linie zwischen den Nachbarn bis ${bew.innen.toFixed(2)} bewegt, sonst ${bew.aussen.toFixed(3)} · ` +
    `Nachbargriffe gedreht ${winkel(vor.aus, v2.aus).toFixed(4)}° / ${winkel(nach.ein, n2.ein).toFixed(4)}° · umgeklappt ${await umgeklappt()}`,
);
await ausschnitt('loeschen-nachher');

// ---------- D. ⌘Z ----------
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
let l = (await loops()).find((x) => x.id === auge.id);
const zurC = linieBewegt(vorC, l).aussen;
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
l = (await loops()).find((x) => x.id === auge.id);
console.log(`D ⌘Z: wie vor dem Löschen ${zurC.toExponential(1)}, wie vor dem Einfügen ${linieBewegt(vorB, l).aussen.toExponential(1)}, Punkte ${l.punkte.length}`);
console.log(fehler.length ? `Fehler: ${fehler.join(' | ')}` : 'keine Fehler in der Konsole');
await browser.close();
