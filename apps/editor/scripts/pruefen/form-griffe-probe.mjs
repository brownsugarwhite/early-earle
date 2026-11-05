// Form zuerst (05.11.2026), Bézier-Griffe an den Punkten der Loops (`kurven.html`), mit der Maus:
// A. Form ums Auge, oberen Punkt wählen: Griffe zu sehen. Griff ziehen (glatt: der andere dreht mit, nur die zwei Stücke am
//    Punkt bewegen sich, die Punkte bleiben). Doppelklick: Ecke, Griff ziehen → Knick. Doppelklick: wieder glatt (ausgerichtet).
// B. Ring waagerecht (Front) und Ring senkrecht (Seite), der waagerechte hart (3): Der Punkt des senkrechten an der Kreuzung wird
//    von selbst eine Ecke. Der harte Ring mit S größer: Grat quer über ihn an der Kreuzung, mit der Ecke und von Hand glatt.
// Aufruf aus apps/editor: node scripts/pruefen/form-griffe-probe.mjs <ordner>
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 3 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
const laden = async () => {
  await seite.goto(basis);
  await seite.waitForFunction(() => window.__kurven !== undefined);
  await seite.waitForTimeout(400);
};
await laden();

const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const loops = () => K('loops');
const lagen = () => K('lagen');
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const umgeklappt = (vorher) =>
  seite.evaluate((v) => {
    const p = window.__kurven.lagen();
    const t = window.__kurven.dreiecke();
    const n = (q, a, b, c) => {
      const ab = [q[3 * b] - q[3 * a], q[3 * b + 1] - q[3 * a + 1], q[3 * b + 2] - q[3 * a + 2]];
      const ac = [q[3 * c] - q[3 * a], q[3 * c + 1] - q[3 * a + 1], q[3 * c + 2] - q[3 * a + 2]];
      return [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    };
    let z = 0;
    for (let i = 0; i < t.length; i += 3) {
      const a = n(v, t[i], t[i + 1], t[i + 2]);
      const b = n(p, t[i], t[i + 1], t[i + 2]);
      if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < 0) z++;
    }
    return z;
  }, vorher);
const weg = (a, b) => {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
};
const ziehen = async ([x, y], [x2, y2], schritte = 12) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / schritte, y + ((y2 - y) * i) / schritte);
    await seite.waitForTimeout(15);
  }
  await seite.mouse.up();
  await seite.waitForTimeout(250);
};
const doppelklick = async ([x, y]) => {
  await seite.mouse.click(x, y);
  await seite.waitForTimeout(60);
  await seite.mouse.click(x, y);
  await seite.waitForTimeout(250);
};
const zeitenText = async () => {
  const z = await K('zeiten');
  const zug = z.zug.slice(-12);
  const m = zug.reduce((s, v) => s + v, 0) / Math.max(1, zug.length);
  return `je Mausbewegung ${m.toFixed(1)} ms, zerlegen ${z.zerlegen} ms, Bereich ${z.bereich}`;
};
const grad = (a, b) => {
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
};
/** Knick der Griffe eines Punkts: Winkel zwischen Richtung hinein (−ein) und hinaus (aus) */
const griffKnick = async (id, i) => {
  const L = (await loops()).find((l) => l.id === id);
  const p = L.punkte[i].ref;
  const g = await K('griffe', id, i);
  const ein = { x: p.x - g.ein.x, y: p.y - g.ein.y, z: p.z - g.ein.z };
  const aus = { x: g.aus.x - p.x, y: g.aus.y - p.y, z: g.aus.z - p.z };
  return grad(ein, aus);
};
const ausschnitt = async (name, a, mitte, breite = 300) => {
  const m = await bild(a, mitte);
  await seite.screenshot({
    path: `${ordner}/form-griffe-${name}-2026-11-05.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: m.x - breite / 2, y: m.y - breite / 2, width: breite, height: breite },
  });
};
const nah3d = async (name, ziel, richtung, abstand) => {
  const f = (await K('felder')).drei;
  const l = Math.hypot(richtung.x, richtung.y, richtung.z);
  await K('kamera', { x: ziel.x + (abstand * richtung.x) / l, y: ziel.y + (abstand * richtung.y) / l, z: ziel.z + (abstand * richtung.z) / l }, ziel);
  await seite.waitForTimeout(250);
  await seite.screenshot({
    path: `${ordner}/form-griffe-${name}-2026-11-05.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: f.x + f.w * 0.1, y: f.y + f.h * 0.08, width: f.w * 0.8, height: f.h * 0.86 },
  });
};

// ---------- A. Griffe an der Form ums Auge ----------
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
await seite.waitForTimeout(300);
let auge = (await loops()).at(-1);
const oi = auge.punkte.reduce((b, p, i) => (p.ref.y > auge.punkte[b].ref.y ? i : b), 0);
console.log(`A Form: ${auge.art}, ${auge.punkte.length} Punkte; oberer Punkt ${oi}`);
await seite.keyboard.press('Escape');
await seite.mouse.click(...xy(await bild('seite', auge.punkte[oi].ref)));
await seite.waitForTimeout(200);
const mitteAuge = { x: -60, y: 45, z: auge.punkte[oi].ref.z };
await ausschnitt('a1-griffe', 'seite', mitteAuge, 170);
console.log(`  gewählt: Griffe zu sehen ${await seite.locator('#blatt-seite .griff').count()}, Linie am Punkt ${(await K('knickAm', auge.id, oi)).toFixed(1)}°`);

// Griff „aus“ 14 nach oben ziehen (glatt)
let g = await K('griffe', auge.id, oi);
const ruhe0 = auge.ruhe.slice();
const punkte0 = auge.punkte.map((p) => p.ref);
let pos = await lagen();
await ziehen(xy(await bild('seite', g.aus)), xy(await bild('seite', { ...g.aus, y: g.aus.y + 60 })));
auge = (await loops()).find((l) => l.id === auge.id);
const pBewegt = Math.max(...auge.punkte.map((p, i) => Math.hypot(p.ref.x - punkte0[i].x, p.ref.y - punkte0[i].y, p.ref.z - punkte0[i].z)));
let bewegteProben = 0;
for (let j = 0; j < ruhe0.length / 3; j++) if (Math.hypot(auge.ruhe[3 * j] - ruhe0[3 * j], auge.ruhe[3 * j + 1] - ruhe0[3 * j + 1], auge.ruhe[3 * j + 2] - ruhe0[3 * j + 2]) > 0.3) bewegteProben++;
console.log(
  `A1 Griff glatt 60 hoch (Faktor ${g.faktor.toFixed(2)}): ${await zeitenText()} · Punkte bewegt ${pBewegt.toFixed(2)} · Proben > 0,3 bewegt ${bewegteProben} von ${ruhe0.length / 3} · ` +
    `Linie am Punkt danach ${(await K('knickAm', auge.id, oi)).toFixed(1)}° · umgeklappt ${await umgeklappt(pos)} · schief ${(await K('symmetrie')).toExponential(1)}`,
);
await ausschnitt('a2-glatt-gezogen', 'seite', mitteAuge, 170);

// zurück zur frischen Form; Doppelklick: Ecke; Griff „aus“ um 40° nach außen drehen → Knick
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(200);
await doppelklick(xy(await bild('seite', auge.punkte[oi].ref)));
auge = (await loops()).find((l) => l.id === auge.id);
console.log(`A2 Doppelklick: Ecke ${auge.punkte[oi].ecke} · Meldung ${JSON.stringify(await K('meldung'))}`);
g = await K('griffe', auge.id, oi);
pos = await lagen();
{
  // den Griff um 40° im Uhrzeigersinn drehen (in der Seite um den Punkt): Die Form läuft gegen den Uhrzeigersinn, nach außen
  const p0 = auge.punkte[oi].ref;
  const w = (-40 * Math.PI) / 180;
  const vx = g.aus.x - p0.x;
  const vy = g.aus.y - p0.y;
  const zielSpitze = { ...g.aus, x: p0.x + vx * Math.cos(w) - vy * Math.sin(w), y: p0.y + vx * Math.sin(w) + vy * Math.cos(w) };
  await ziehen(xy(await bild('seite', g.aus)), xy(await bild('seite', zielSpitze)));
}
auge = (await loops()).find((l) => l.id === auge.id);
const knickEcke = await griffKnick(auge.id, oi);
console.log(
  `  Ecke, Griff gezogen: Knick der Griffe ${knickEcke.toFixed(1)}° · Linie am Punkt ${(await K('knickAm', auge.id, oi)).toFixed(1)}° · umgeklappt ${await umgeklappt(pos)}`,
);
await ausschnitt('a3-ecke-gezogen', 'seite', mitteAuge, 170);
await nah3d('a3-ecke-3d', auge.punkte[oi].ref, { x: -0.3, y: 0.4, z: 1 }, 170);

// Doppelklick: wieder glatt (Griffe ausgerichtet, die Haut folgt)
pos = await lagen();
await doppelklick(xy(await bild('seite', auge.punkte[oi].ref)));
auge = (await loops()).find((l) => l.id === auge.id);
console.log(
  `A3 Doppelklick: Ecke ${auge.punkte[oi].ecke} · Meldung ${JSON.stringify(await K('meldung'))} · ` +
    `Linie am Punkt ${(await K('knickAm', auge.id, oi)).toFixed(1)}° · umgeklappt ${await umgeklappt(pos)}`,
);
await ausschnitt('a4-wieder-glatt', 'seite', mitteAuge, 170);
for (let i = 0; i < 3; i++) await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(200);
auge = (await loops()).find((l) => l.id === auge.id);
console.log(`  ⌘Z ×3 (+1 nach A1): Form wie gezeichnet ${weg(ruhe0, auge.ruhe).toExponential(1)}, Ecke ${auge.punkte[oi].ecke}`);

// ---------- B. Automatische Ecke an der Kreuzung mit einem harten Ring ----------
await laden();
await seite.keyboard.press('l');
await ziehen(xy(await bild('front', { x: 0, y: 0, z: -200 })), xy(await bild('front', { x: 0, y: 0, z: 200 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 0, y: 200, z: 0 })), xy(await bild('seite', { x: 0, y: -200, z: 0 })), 6);
let L = await loops();
const [A, B] = L;
const kB = B.punkte.findIndex((p) => p.kreuzung !== null);
console.log(`B Ringe: ${A.art} ${A.punkte.length} P, ${B.art} ${B.punkte.length} P · Kreuzung bei ${JSON.stringify(B.punkte[kB].ref)} · Ecke ${B.punkte[kB].ecke}`);
// den waagerechten Ring wählen (in der Front auf seiner Linie, abseits der Kreuzung) und hart stellen
const aufA = await bild('front', { x: 0, y: 0, z: 70 });
await seite.mouse.click(aufA.x, aufA.y);
await seite.waitForTimeout(150);
await seite.keyboard.press('3');
await seite.waitForTimeout(200);
L = await loops();
console.log(`  waagerecht hart (${L[0].haerte}): Punkt des senkrechten an der Kreuzung Ecke ${L[1].punkte[kB].ecke} (von selbst ${L[1].punkte[kB].autoEcke})`);
await ausschnitt('b1-auto-ecke', 'seite', L[1].punkte[kB].ref, 200);

const groesser = async (name) => {
  const p0 = await lagen();
  const a0 = await bild('front', { x: 0, y: 0, z: 100 });
  const ziel = await bild('front', { x: 0, y: 0, z: 115 });
  await seite.mouse.click(aufA.x, aufA.y);
  await seite.waitForTimeout(150);
  await seite.mouse.move(a0.x, a0.y);
  await seite.keyboard.press('s');
  for (let i = 1; i <= 10; i++) {
    await seite.mouse.move(a0.x + ((ziel.x - a0.x) * i) / 10, a0.y + ((ziel.y - a0.y) * i) / 10);
    await seite.waitForTimeout(20);
  }
  await seite.keyboard.press('Enter');
  await seite.waitForTimeout(300);
  const LL = await loops();
  const kn = await K('knick', LL[0].id);
  const q = LL[1].punkte[kB].ref;
  // Knick quer über den harten Ring: an der Kreuzung gegen den Median abseits
  const n = kn.length;
  let jk = 0;
  const P = (j) => ({ x: LL[0].ruhe[3 * j], y: LL[0].ruhe[3 * j + 1], z: LL[0].ruhe[3 * j + 2] });
  for (let j = 0; j < n; j++) if (Math.hypot(P(j).x - q.x, P(j).z - q.z) < Math.hypot(P(jk).x - q.x, P(jk).z - q.z)) jk = j;
  const sonst = kn.filter((_, j) => Math.hypot(P(j).x - q.x, P(j).z - q.z) > 60 && j > 3 && j < n - 4).sort((a, b) => a - b);
  console.log(
    `  ${name}: S ×1,15 · ${await zeitenText()} · Grat an der Kreuzung ${kn[jk].toFixed(1)}° (sonst Median ${sonst[sonst.length >> 1].toFixed(1)}°) · ` +
      `senkrechter Ring knickt dort ${(await K('knickAm', LL[1].id, kB)).toFixed(1)}° · umgeklappt ${await umgeklappt(p0)} · schief ${(await K('symmetrie')).toExponential(1)}`,
  );
  await seite.keyboard.press('Escape');
  await nah3d(`b-${name}`, q, { x: -0.45, y: 0.55, z: 1 }, 230);
  await ausschnitt(`b-${name}-seite`, 'seite', q, 260);
};
await groesser('ecke');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(200);
// von Hand glatt: Doppelklick auf den Punkt des senkrechten Rings an der Kreuzung
await doppelklick(xy(await bild('seite', (await loops())[1].punkte[kB].ref)));
L = await loops();
console.log(`  Doppelklick auf die Kreuzung: Ecke ${L[1].punkte[kB].ecke} (von selbst ${L[1].punkte[kB].autoEcke})`);
await groesser('glatt');

console.log('Fehler im Fenster:', fehler.length ? fehler : 'keine');
await browser.close();
