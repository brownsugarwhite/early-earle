// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 0: der Donut in Ozzy nach Florians neuer Regel („nach dem loslassen
// entsteht der edgeloop an der spiegelkante von selbst und ist ausgewählt. mit k macht man ihn smooth“).
// An einer gesicherten Form wird der Punkt, der am weitesten neben der Mitte liegt, im Raum an der Wand des Tops über die Mitte gezogen.
//   im Zug    die Anzeige schneidet jede Hälfte an der Spiegelebene ab (die Hälften verschmelzen, nichts wird gerechnet)
//   los       die Naht entsteht von selbst: ein Loop der Mitte mit Kante, gewählt; nichts liegt mehr hinter der Mitte
//   K         die Naht ist rund
//   ⌘Z ⌘Z     nimmt erst K, dann Zug und Naht zusammen zurück
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-donut-fenster.mjs
//   NAME=<Form aus wesen/> (Standard „strange bird“)   TIEF=<so weit hinter die Mitte> (Standard 40)   BILD=<pfad ohne Endung>
//   MATERIAL=solid|zebra (Standard Seifenhaut)   DICHTE=<Pixeldichte der Bilder> (Standard 1)   AUSSCHNITT=1 (Bilder: nur die Form)
//   KUGEL=1: statt einer gesicherten Form ein frisch aufgeblasener Kreis mit Linie der Mitte und zwei Ringen (mit P quer über die
//   Form gezeichnet); gezogen wird ihre Kreuzung an der Seite: der Donut wie im Prüffenster
import { auf } from './ozzy-teile.mjs';

const NAME = process.env.NAME ?? 'strange bird';
const TIEF = Number(process.env.TIEF ?? 40);
const BILD = process.env.BILD ?? '';
const MATERIAL = process.env.MATERIAL ?? '';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');

const KUGEL = process.env.KUGEL === '1';
const { browser, s, O, geladen, ruhig, klick, fehler } = await auf({ form: KUGEL ? '' : NAME, dichte: Number(process.env.DICHTE ?? 1), extra: KUGEL ? 'ohneLinie=0' : '' });
if (KUGEL) {
  // ein Kreis auf dem Blatt (Halbmesser 150), aufgeblasen; dann in der Seite zwei Striche mit P quer über die Form: zwei Ringe
  const [cx, cy, R, k] = [720, 450, 150, 0.5523 * 150];
  await O('form', [
    { x: cx + R, y: cy, ein: [0, -k], aus: [0, k] },
    { x: cx, y: cy + R, ein: [k, 0], aus: [-k, 0] },
    { x: cx - R, y: cy, ein: [0, k], aus: [0, -k] },
    { x: cx, y: cy - R, ein: [-k, 0], aus: [k, 0] },
  ]);
  await s.waitForTimeout(300);
  await O('aufblasen');
  await geladen();
  await s.keyboard.press('1');
  await s.waitForTimeout(1600);
  await ruhig();
  for (const [A, B] of [
    [
      [-250, 0],
      [250, 0],
    ],
    [
      [10, -250],
      [10, 250],
    ],
  ]) {
    await s.keyboard.press('p');
    const a = await O('flaecheHin', 'seite', A[0], A[1]);
    const b = await O('flaecheHin', 'seite', B[0], B[1]);
    await klick(a.x, a.y);
    await klick(b.x, b.y);
    await s.keyboard.press('Enter');
    await ruhig();
    await s.keyboard.press('v');
    await s.waitForTimeout(200);
  }
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  await ruhig();
} else await geladen();
if (MATERIAL) await O('material', MATERIAL);

// AUSSCHNITT=1: nur die Form in der Mitte des Raums (560 × 420 CSS-Pixel)
const foto = async (name) => {
  if (BILD) await s.screenshot({ path: `${BILD}-${name}.png`, ...(process.env.AUSSCHNITT === '1' ? { clip: { x: 440, y: 250, width: 560, height: 420 } } : {}) });
};
const linien = () => O('werkLinienDaten');
const hinter = (L) => L.filter((l) => l.art !== 'mitte').flatMap((l) => l.punkte.filter((q) => q.z < -1e-6)).length;

const L0 = await linien();
const w0 = await O('werk');
let p = null;
for (const l of L0) {
  if (l.art === 'mitte') continue;
  for (const q of l.punkte) if (q.sichtbar && (!p || Math.abs(q.z) > Math.abs(p.z))) p = { ...q, id: l.id };
}
console.log(`     ${KUGEL ? 'Kugel mit drei Linien' : `„${NAME}“`}: ${w0.punkte} Punkte, ${L0.length} Linien; gezogen wird Punkt ${p.id}.${p.i} bei (${z1(p.x)}, ${z1(p.y)}, ${z1(p.z)}) bis ${TIEF} hinter die Mitte`);
ok('vorher: nichts reicht über die Mitte', !w0.ueberDerMitte && !w0.spiegelSchnitt && hinter(L0) === 0);
await foto('0-vorher');

// ---------- im Zug: im Raum an der Wand des Tops ----------
const A = (await O('ankerImBild', p.id, p.i, 'top')).filter((a) => !a.m && a.sichtbar);
const a = A[0];
const ziel = await O('flaecheHin', 'top', p.x, -Math.sign(p.z) * TIEF);
if (!a || !ziel) {
  console.log('FEHL der Punkt ist an der Wand des Tops nicht zu greifen');
  await browser.close();
  process.exit(1);
}
await s.mouse.move(a.x, a.y, { steps: 3 });
await s.waitForTimeout(400);
await s.mouse.down();
const N = 40;
for (let k = 1; k <= N; k++) {
  await s.mouse.move(a.x + ((ziel.x - a.x) * k) / N, a.y + ((ziel.y - a.y) * k) / N);
  await s.waitForTimeout(20);
}
await s.waitForTimeout(600);
const wz = await O('werk');
ok('im Zug: die Hälfte reicht über die Mitte, die Anzeige schneidet sie dort ab', wz.ueberDerMitte && wz.spiegelSchnitt, `noch ${(await linien()).length} Linien, nichts gerechnet`);
await foto('1-im-zug');

// ---------- los: die Naht entsteht von selbst ----------
await s.mouse.up();
await ruhig();
const w1 = await O('werk');
const L1 = await linien();
const naht = L1.filter((l) => l.art === 'mitte' && l.kante === true && !L0.some((x) => x.id === l.id));
ok('los: die Naht ist da (ein Loop der Mitte mit Kante)', naht.length >= 1, `${naht.map((l) => `Loop ${l.id}, ${l.punkte.length} Punkte`).join('; ') || 'keine'} · ${L0.length} → ${L1.length} Linien`);
ok('los: die Naht ist gewählt', naht.length > 0 && naht.every((l) => ` ${w1.auswahl} `.includes(` ${l.id}.-1 `)), `Auswahl im Werk: ${w1.auswahl || '–'}; gezeigt: ${(await O('bearbeiten')).auswahl.length} Punkte`);
ok('los: nichts liegt mehr hinter der Mitte, die Anzeige schneidet nicht mehr', !w1.ueberDerMitte && !w1.spiegelSchnitt && hinter(L1) === 0);
ok('los: Meldung', w1.meldung.includes('Naht'), w1.meldung);
// (Wo die Hälften flach aufeinandertreffen, ist die Naht eine Schneide: Schmale Dreiecke direkt an ihr zählen gegen die gemittelten
// Normalen als umgeschlagen. Gezählt wird, was nicht an der Naht liegt, und was an ihr liegt, wird genannt.)
const anNaht = (u) => u.linien.filter((x) => x.split('+').some((k) => naht.some((l) => String(l.id) === k.replace("'", '')))).length >= 2;
const U1 = (await O('umgeschlagen')).liste ?? [];
const frei1 = U1.filter((u) => !anNaht(u));
ok('los: nichts umgeschlagen (außer schmalen Dreiecken an der Schneide der Naht)', frei1.length <= w0.umgeschlagen, `abseits der Naht ${frei1.length} (vorher ${w0.umgeschlagen}), an der Naht ${U1.length - frei1.length} (das größte ${z1(100 * Math.max(0, ...U1.filter(anNaht).map((u) => u.flaeche)))} % eines mittleren Dreiecks); ${w0.punkte} → ${w1.punkte} Punkte`);
await foto('2-naht');

// ---------- K: rund ----------
await s.keyboard.press('k');
await ruhig();
const L2 = await linien();
const rund = L2.filter((l) => naht.some((x) => x.id === l.id));
ok('K: die Naht ist rund (Kante aus)', rund.length === naht.length && rund.every((l) => l.kante !== true), (await O('werk')).meldung);
ok('K: nichts umgeschlagen', (await O('werk')).umgeschlagen <= w0.umgeschlagen, `umgeschlagen ${(await O('werk')).umgeschlagen}`);
await foto('3-rund');

// ---------- ⌘Z: erst K, dann Zug und Naht zusammen ----------
await s.keyboard.press('Meta+z');
await ruhig();
const L3 = await linien();
ok('⌘Z: die Naht ist wieder eine Kante', L3.filter((l) => naht.some((x) => x.id === l.id)).every((l) => l.kante === true) && L3.length === L1.length);
await s.keyboard.press('Meta+z');
await ruhig();
const L4 = await linien();
const q = L4.find((l) => l.id === p.id)?.punkte[p.i];
ok('⌘Z: Zug und Naht sind zusammen zurück', L4.length === L0.length && !!q && Math.abs(q.z - p.z) < 1e-6 && !(await O('werk')).ueberDerMitte, q ? `${L4.length} Linien, der Punkt liegt wieder bei z = ${z1(q.z)}` : `${L4.length} Linien`);
await foto('4-zurueck');

ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} Punkte FEHLEN` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
