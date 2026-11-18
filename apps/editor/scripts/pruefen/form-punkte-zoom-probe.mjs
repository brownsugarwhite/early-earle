// Form zuerst (05.11.2026), Punkte wie in Illustrator und Zoom in den Blättern (`kurven.html`), mit der Maus:
// A. Drei Loops (Seite quer, Front waagerecht, Top Mitte). Die obere Kreuzung in der Seite 40 hoch: Wie weit bewegen sich die
//    Loops jenseits der Nachbarpunkte? (vorher drehten die Nachbarn ihre Richtung mit.) Bild Seite und 3D.
// B. Form ums Auge, in der Seite mit dem Rad zum Auge zoomen: Punkte und Körper liegen aufeinander, die Griffe in echter Länge
//    (Faktor 1); Griff ziehen, mittlere Taste verschiebt, Pos1 zeigt alles.
// Aufruf aus apps/editor: node scripts/pruefen/form-punkte-zoom-probe.mjs <ordner>
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
/**
 * Umgeklappte Dreiecke: Normale gegen die Normalen ihrer Ecken (Mittel der Nachbardreiecke). Seit dem Zusammenlegen zu kurzer Kanten
 * (06.11.) nummeriert das Verdichten die Punkte neu; ein Vergleich mit den Lagen vor dem Zug über die Nummern zählte dann fast alle.
 */
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
/** Abstand eines Punkts zur Linie (Strecken zwischen ihren Proben) */
const abstandZurLinie = (l, p) => {
  const n = l.ruhe.length / 3;
  const zu = l.art !== 'ring';
  let m = Infinity;
  for (let j = 0; j < (zu ? n : n - 1); j++) {
    const a = [0, 1, 2].map((c) => l.ruhe[3 * j + c]);
    const b = [0, 1, 2].map((c) => l.ruhe[3 * ((j + 1) % n) + c]);
    const ab = [0, 1, 2].map((c) => b[c] - a[c]);
    const ap = [0, 1, 2].map((c) => p[c] - a[c]);
    const ll = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1;
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ll));
    m = Math.min(m, Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]));
  }
  return m;
};
/** Lage einer Linie an der Stelle s (zwischen ihren Proben linear; das Verdichten kann Proben zusammenlegen, die Stellen bleiben) */
const lageBeiS = (l, s) => {
  const n = l.s.length;
  const zu = l.art !== 'ring';
  const t = zu ? ((s % l.laenge) + l.laenge) % l.laenge : Math.max(0, Math.min(l.laenge, s));
  let i = 0;
  while (i + 1 < n && l.s[i + 1] <= t) i++;
  const j = i + 1 < n ? i + 1 : zu ? 0 : i;
  const s0 = l.s[i];
  const s1 = j > i ? l.s[j] : zu ? l.laenge : s0;
  const f = s1 > s0 ? (t - s0) / (s1 - s0) : 0;
  return [0, 1, 2].map((c) => l.ruhe[3 * i + c] + f * (l.ruhe[3 * j + c] - l.ruhe[3 * i + c]));
};
const foto = async (name, a, mitte, breite) => {
  if (!a) {
    await seite.screenshot({ path: `${ordner}/form-punkte-${name}-2026-11-05.jpg`, type: 'jpeg', quality: 88 });
    return;
  }
  const m = await bild(a, mitte);
  await seite.screenshot({
    path: `${ordner}/form-punkte-${name}-2026-11-05.jpg`,
    type: 'jpeg',
    quality: 90,
    clip: { x: m.x - breite / 2, y: m.y - breite / 2, width: breite, height: breite },
  });
};

// ---------- A. Punkt ziehen: nur bis zu den Nachbarn ----------
await seite.keyboard.press('l');
await ziehen(xy(await bild('seite', { x: 0, y: 200, z: 0 })), xy(await bild('seite', { x: 0, y: -200, z: 0 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('front', { x: 0, y: 0, z: -200 })), xy(await bild('front', { x: 0, y: 0, z: 200 })), 6);
await seite.keyboard.press('l');
await ziehen(xy(await bild('top', { x: -200, y: 0, z: 0 })), xy(await bild('top', { x: 200, y: 0, z: 0 })), 6);
let L = await loops();
console.log(`A drei Loops: ${L.map((l) => `${l.art} ${l.punkte.length} P`).join(', ')}`);
const oben = L.flatMap((l) => l.punkte).find((p) => p.kreuzung !== null && p.ref.y > 100);
const vorher = L.map((l) => ({ ruhe: l.ruhe.slice(), s: l.s.slice() }));
await ziehen(xy(await bild('seite', oben.ref)), xy(await bild('seite', { ...oben.ref, y: oben.ref.y + 40 })));
L = await loops();
// je Loop: Bewegung der Proben jenseits der Nachbarpunkte des gezogenen Punkts (längs s)
for (const [li, l] of L.entries()) {
  const k = l.punkte.findIndex((p) => p.kreuzung === oben.kreuzung);
  if (k < 0) continue;
  // je alte Probe die Lage der Linie an ihrer Stelle s jetzt (Proben können zusammengelegt sein)
  const { ruhe: alt, s } = vorher[li];
  const n = s.length;
  const P = l.punkte;
  const zu = l.art !== 'ring';
  const s0 = k > 0 ? P[k - 1].s : zu ? P[P.length - 1].s - l.laenge : 0;
  const s1 = k < P.length - 1 ? P[k + 1].s : zu ? P[0].s + l.laenge : l.laenge;
  let jenseits = 0;
  let jenseitsLinie = 0;
  let innen = 0;
  for (let j = 0; j < n; j++) {
    const q = lageBeiS(l, s[j]);
    const d = Math.hypot(...[0, 1, 2].map((c) => q[c] - alt[3 * j + c]));
    const t = s[j];
    const drin = (t >= s0 - 1e-6 && t <= s1 + 1e-6) || (zu && (t - l.laenge >= s0 - 1e-6 || t + l.laenge <= s1 + 1e-6));
    if (drin) innen = Math.max(innen, d);
    else {
      jenseits = Math.max(jenseits, d);
      jenseitsLinie = Math.max(jenseitsLinie, abstandZurLinie(l, [alt[3 * j], alt[3 * j + 1], alt[3 * j + 2]]));
    }
  }
  // an derselben Stelle s; „zur Linie“: Abstand der alten Probe zur Linie jetzt (wo Proben zusammengelegt wurden, liegt an ihrer
  // Stelle die Sehne zwischen den Nachbarproben, die Linie selbst ist nicht gewandert)
  console.log(
    `  ${l.art}: zwischen den Nachbarpunkten bis ${innen.toFixed(1)}, jenseits bis ${jenseits.toFixed(2)} (zur Linie ${jenseitsLinie.toFixed(2)})`,
  );
}
console.log(`  Maße ${JSON.stringify(await K('masse'))} · umgeklappt ${await umgeklappt()} · schief ${(await K('symmetrie')).toExponential(1)}`);
await foto('a-oben-hoch-seite', 'seite', { x: 0, y: 120, z: 0 }, 420);
const f3 = (await K('felder')).drei;
await seite.screenshot({
  path: `${ordner}/form-punkte-a-oben-hoch-3d-2026-11-05.jpg`,
  type: 'jpeg',
  quality: 88,
  clip: { x: f3.x + f3.w * 0.12, y: f3.y + f3.h * 0.06, width: f3.w * 0.76, height: f3.h * 0.8 },
});

// ---------- B. Zoom in der Seite ----------
await seite.reload();
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
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
await seite.keyboard.press('Escape');
// mit dem Rad zum Auge zoomen (6 Rasten)
const mitte = await bild('seite', { x: -60, y: 45, z: 0 });
await seite.mouse.move(mitte.x, mitte.y);
for (let i = 0; i < 6; i++) {
  await seite.mouse.wheel(0, -100);
  await seite.waitForTimeout(40);
}
await seite.waitForTimeout(200);
const aus = await K('ausschnitt', 'seite');
const kopf = await seite.locator('#feld-seite header').textContent();
const mitteDanach = await bild('seite', { x: -60, y: 45, z: 0 });
console.log(`B Zoom: ${aus.zoom.toFixed(2)}×, Kopf „${kopf}“, Augenmitte unter dem Zeiger ${Math.hypot(mitteDanach.x - mitte.x, mitteDanach.y - mitte.y).toFixed(2)} px daneben`);
// Punkte im SVG genau dort, wo die Abbildung sie hinlegt
const kreise = await seite.evaluate(() =>
  [...document.querySelectorAll('#blatt-seite .kpunkt')].map((c) => {
    const r = c.getBoundingClientRect();
    return { l: Number(c.getAttribute('data-l')), i: Number(c.getAttribute('data-i')), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }),
);
let lage = 0;
for (const c of kreise) {
  const p = auge.punkte[c.i];
  if (!p || c.l !== auge.id) continue;
  const b = await bild('seite', p.ref);
  lage = Math.max(lage, Math.hypot(b.x - c.x, b.y - c.y));
}
console.log(`  Punkte im Blatt gegen die Abbildung: höchstens ${lage.toFixed(2)} px`);
await seite.mouse.click(...xy(await bild('seite', auge.punkte[oi].ref)));
await seite.waitForTimeout(200);
const g = await K('griffe', auge.id, oi);
console.log(`  Griffe gezoomt: Faktor ${g.faktor.toFixed(2)} (ungezoomt 3,5)`);
await foto('b-zoom-griffe', 'seite', { x: -60, y: 45, z: 0 }, 560);
await ziehen(xy(await bild('seite', g.aus)), xy(await bild('seite', { ...g.aus, y: g.aus.y + 12 })));
console.log(`  Griff gezogen gezoomt: Linie am Punkt ${(await K('knickAm', auge.id, oi)).toFixed(1)}°, umgeklappt ${await umgeklappt()}`);
await foto('b-zoom-griff-gezogen', 'seite', { x: -60, y: 45, z: 0 }, 560);
// mittlere Taste: 150 px nach rechts, 60 hoch
const vor = await K('ausschnitt', 'seite');
await seite.mouse.move(mitte.x, mitte.y);
await seite.mouse.down({ button: 'middle' });
for (let i = 1; i <= 10; i++) {
  await seite.mouse.move(mitte.x + 15 * i, mitte.y - 6 * i);
  await seite.waitForTimeout(15);
}
await seite.mouse.up({ button: 'middle' });
const nach = await K('ausschnitt', 'seite');
const s = (await K('felder')).seite;
console.log(`  mittlere Taste: Mitte ${((vor.cx - nach.cx) * aus.zoom).toFixed(1)}/${((nach.cy - vor.cy) * aus.zoom).toFixed(1)} (Einheiten × Zoom), Feld ${s.w.toFixed(0)}×${s.h.toFixed(0)}`);
await seite.keyboard.press('Home');
await seite.waitForTimeout(150);
console.log(`  Pos1: ${JSON.stringify(await K('ausschnitt', 'seite'))}, Kopf „${await seite.locator('#feld-seite header').textContent()}“`);
console.log('Fehler im Fenster:', fehler.length ? fehler : 'keine');
await browser.close();
