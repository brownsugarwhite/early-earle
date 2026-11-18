// Plan vom 12.11.2026, Schritt 6 (14.11.): das Maul aus nur einer Linie im Fenster, mit der Maus.
//   1  Von der Kugel an: mit F ein offener Strich in der Seite, vom Umriss vorn (er beginnt vor dem Körper) bis zum Mundwinkel.
//      Daraus wird ein Ring (die Unterlippe ist das gedrehte Abbild der Linie), und das Maul formt sich gleich, in Schritten.
//   2  Geprüft: Meldung, ein Loop mit `maulLinie`, Kante, geformt; die Lippen sind Abbilder; Knick an den Lippen und am Mundwinkel;
//      umgeschlagen, spiegelgleich, keine Fehler in der Konsole.
//   3  „Fressen“: Der Regler zählt von „zu“. Ganz links liegen die Lippen aufeinander; nach rechts öffnet es.
//   4  „Fressen“ aus: die Grundform wie davor.
//   5  Doppelklick auf die Oberlippe: ein Punkt, die Unterlippe bekommt seinen Zwilling. An ihm ziehen: Die Unterlippe geht mit,
//      die Lippen bleiben Abbilder, und zu liegen sie wieder aufeinander.
//   6  Am Mundwinkel ziehen: ebenso.
//   7  ⌘Z bis zum Anfang: die Kugel ohne Linie.
// Aufruf aus apps/editor: GPU=1 node scripts/pruefen/form-maul-linie-fenster.mjs [bild-ohne-endung]
//   KURVEN_URL (Standard http://localhost:5197/kurven.html?gewichte=geometrie)
//   ANSICHT=front: der Strich in der Front, über die Mitte gezogen (von z = −130 nach +130); dann nur die Schritte 1 bis 4
//   MITTE=1: vorher die Mittellinie schneiden (L, senkrecht auf der Mitte); dann nur die Schritte 1 bis 4
import { chromium } from '@playwright/test';

const BILD = process.argv[2] ?? '';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5197/kurven.html?gewichte=geometrie';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const ruhig = async () => {
  await seite.waitForTimeout(250);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
  await seite.waitForTimeout(120);
  await seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 180000 });
};
const bild = (a, p) => K('bild', a, p);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const z2 = (x) => x.toFixed(2).replace('.', ',');
const regler = async (wert) => {
  await seite.$eval(
    '#maul-oeffnung',
    (el, v) => {
      el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    wert,
  );
  await ruhig();
};
/** die gezeichnete Linie in der Seite: von vor dem Umriss (x = −178) zum Mundwinkel (x = −55), leicht geschwungen */
const linie = (f) => ({ x: -178 + f * 123, y: -20 + 6 * Math.sin(Math.PI * Math.max(0, (f - 0.24) / 0.76)), z: 0 });
const ziehen = async (von, nach, schritte = 20) => {
  await seite.mouse.move(von.x, von.y);
  await seite.waitForTimeout(80);
  await seite.mouse.down();
  for (let i = 1; i <= schritte; i++) {
    await seite.mouse.move(von.x + ((nach.x - von.x) * i) / schritte, von.y + ((nach.y - von.y) * i) / schritte);
    await seite.waitForTimeout(18);
  }
  await seite.mouse.up();
  await ruhig();
};

const FRONT = process.env.ANSICHT === 'front';
const MITTE = process.env.MITTE === '1';
if (MITTE) {
  // die Mittellinie: L, in der Front senkrecht auf der Mitte
  await seite.keyboard.press('l');
  const a = await bild('front', { x: 0, y: 190, z: 0 });
  const b = await bild('front', { x: 0, y: -190, z: 0 });
  await seite.mouse.move(a.x, a.y);
  await seite.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await seite.mouse.move(a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12);
    await seite.waitForTimeout(10);
  }
  await seite.mouse.up();
  await ruhig();
  const Lm = await K('loops');
  console.log(`     vorher die Mittellinie: ${Lm.length} Loop (${Lm.map((l) => l.art).join(', ')})`);
}
const loopsDavor = (await K('loops')).length;

// 1. der offene Strich; das Fenster formt gleich
const lagenAnfang = await K('lagen');
const anfang = lagenAnfang.length / 3;
/** die hintere Hälfte der Form (x > 0, fern vom Maul): kleinster und größter Abstand ihrer Punkte von der Mitte */
const hinten = (P) => {
  let klein = Infinity;
  let gross = 0;
  for (let i = 0; i < P.length; i += 3) {
    if (P[i] <= 0) continue;
    const r = Math.hypot(P[i], P[i + 1], P[i + 2]);
    klein = Math.min(klein, r);
    gross = Math.max(gross, r);
  }
  return { klein, gross };
};
await seite.keyboard.press('f');
const filmP = seite.evaluate(
  () =>
    new Promise((fertig) => {
      let bilder = 0;
      let bewegt = 0;
      let letzte = '';
      const t0 = performance.now();
      const schauen = () => {
        const L = window.__kurven.lagen();
        let s = 0;
        for (let i = 0; i < L.length; i += 7) s += L[i] * (1 + (i % 13));
        const jetzt = `${L.length}:${s.toFixed(3)}`;
        bilder++;
        if (jetzt !== letzte) bewegt++;
        letzte = jetzt;
        if (/^Maul aus einer Linie|^Maul geformt|geht so nicht|Fehler/.test(window.__kurven.meldung()) || performance.now() - t0 > 120000) fertig({ bilder, bewegt, ms: performance.now() - t0 });
        else requestAnimationFrame(schauen);
      };
      requestAnimationFrame(schauen);
    }),
);
{
  const n = 40;
  const pkt = [];
  for (let i = 0; i <= n; i++) pkt.push(FRONT ? await bild('front', { x: -150, y: -20, z: -130 + (260 * i) / n }) : await bild('seite', linie(i / n)));
  await seite.mouse.move(pkt[0].x, pkt[0].y);
  await seite.mouse.down();
  for (const p of pkt.slice(1)) {
    await seite.mouse.move(p.x, p.y);
    await seite.waitForTimeout(6);
  }
  await seite.mouse.up();
}
if (BILD) {
  await seite.waitForTimeout(500);
  await seite.screenshot({ path: `${BILD}-1-unterwegs.jpg`, type: 'jpeg', quality: 88 });
}
const film = await filmP;
const meldung = await K('meldung');
await ruhig();

// 2. was entstanden ist
const nach = { lagen: await K('lagen'), loops: await K('loops') };
ok('offener Strich: Maul aus einer Linie, gleich geformt', /^Maul aus einer Linie \(/.test(meldung), meldung);
ok('animiert: Das Fenster zeigt das Formen in Schritten', film.bewegt >= 20, `${film.bewegt} von ${film.bilder} Bildern mit Bewegung in ${z1(film.ms / 1000)} s`);
const L = nach.loops.at(-1);
ok('ein Loop dazu: ein Ring mit Kante, geformt, als Maul aus einer Linie (20° gerechnet)', nach.loops.length === loopsDavor + 1 && L?.art === 'ring' && L.kante === true && L.geformt === true && L.maulLinie === 20, `${nach.loops.length} Loop${nach.loops.length === 1 ? '' : 's'}, ${nach.lagen.length / 3} Punkte (vorher ${anfang})`);
const ml = await K('maulLinie');
ok('die Lippen sind Abbilder voneinander (Punkte paarweise)', !!ml && ml.paare >= 1 && ml.fehler !== null && ml.fehler < 1e-6, ml ? `${ml.paare} Paare, Abweichung ${ml.fehler?.toExponential(1)}; vorn ${z1(ml.vorn)} auseinander` : 'kein Maul aus einer Linie');
{
  const W = L?.punkte.find((p) => p.mundwinkel);
  ok('der Mundwinkel liegt am Ende des Strichs und ist eine Ecke', !!W && W.ecke === true && (FRONT ? Math.abs(W.ref.z - 130) < 3 : Math.hypot(W.ref.x + 55, W.ref.y + 20) < 2.5), W ? `(${z1(W.ref.x)} ${z1(W.ref.y)} ${z1(W.ref.z)})` : 'kein Mundwinkel');
  if (!MITTE) {
    const angaben = L ? [L.punkte[0].knick, W?.knick, L.punkte.at(-1).knick] : [];
    ok('die Angaben: 95° an beiden Lippen, 70° am Mundwinkel', angaben.length === 3 && Math.abs(angaben[0] - 95) < 1e-6 && Math.abs(angaben[1] - 70) < 1e-6 && Math.abs(angaben[2] - 95) < 1e-6, angaben.map((x) => `${z1(x ?? NaN)}°`).join(', '));
  }
}
const gemessen = L ? await K('knickGemessen', L.id) : null;
ok('gemessen: an den Lippen 88 bis 102°', !!gemessen && gemessen.enden.every((x) => x > 88 && x < 102), gemessen ? `${gemessen.enden.map((x) => `${z1(x)}°`).join(' und ')}; am Mundwinkel ${z1(gemessen.mundwinkel)}°` : 'nicht messbar');
const umg = await K('umgeschlagen');
/** wo umgeschlagene Dreiecke liegen (gegen die Summe der Normalen ihrer Ecken): Mitte, Fläche, Abstand vom Mundwinkel */
const woUmgeschlagen = async () => {
  const P = await K('lagen');
  const T = await K('dreiecke');
  const Wp = (await K('loops')).at(-1)?.punkte.find((p) => p.mundwinkel)?.ref;
  const nor = new Float64Array(P.length);
  const fl = [];
  for (let t = 0; t < T.length; t += 3) {
    const [a, b, c] = [T[t], T[t + 1], T[t + 2]];
    const u = [P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]];
    const v = [P[3 * c] - P[3 * a], P[3 * c + 1] - P[3 * a + 1], P[3 * c + 2] - P[3 * a + 2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    fl.push(n);
    for (const w of [a, b, c]) for (let k = 0; k < 3; k++) nor[3 * w + k] += n[k];
  }
  const aus = [];
  for (let t = 0; t < T.length; t += 3) {
    let s = 0;
    for (const w of [T[t], T[t + 1], T[t + 2]]) for (let k = 0; k < 3; k++) s += fl[t / 3][k] * nor[3 * w + k];
    if (s >= 0) continue;
    const m = [0, 1, 2].map((k) => (P[3 * T[t] + k] + P[3 * T[t + 1] + k] + P[3 * T[t + 2] + k]) / 3);
    aus.push(`(${z1(m[0])} ${z1(m[1])} ${z1(m[2])}) Fläche ${z2(Math.hypot(...fl[t / 3]) / 2)}${Wp ? `, ${z1(Math.hypot(m[0] - Wp.x, m[1] - Wp.y, Math.abs(m[2]) - Wp.z))} vom Mundwinkel` : ''}`);
  }
  return aus;
};
// (diese Zählung misst jedes Dreieck gegen die Normalen seiner Ecken, außen und Tasche gemischt: Die steile Wand der Tasche am
// Mundwinkel zählt mit, an Florians Modellen 6; außen und Tasche getrennt gezählt ist es 0, Kern-Probe `form-maul-linie.ts`)
ok('umgeschlagen: höchstens die Wand der Tasche am Mundwinkel (2)', umg <= 2, `umgeschlagen ${umg}${umg ? `: ${(await woUmgeschlagen()).join('; ')}` : ''}`);
ok('spiegelgleich', (await K('symmetrie')) < 1e-6, `Abweichung ${(await K('symmetrie')).toExponential(1)}`);
{
  // eine Form ohne weitere Linien hält ihre Größe nur, weil „Maul formen“ die Haut fern vom Maul an ihrem Ort hält
  const a = hinten(lagenAnfang);
  const b = hinten(nach.lagen);
  ok('fern vom Maul bleibt die Form (hintere Hälfte, Abstand von der Mitte)', Math.abs(b.klein - a.klein) < 1.5 && Math.abs(b.gross - a.gross) < 1.5, `${z1(a.klein)} bis ${z1(a.gross)} → ${z1(b.klein)} bis ${z1(b.gross)}`);
}
if (BILD) await seite.screenshot({ path: `${BILD}-2-gerechnet.jpg`, type: 'jpeg', quality: 88 });

// 3. „Fressen“: der Regler zählt von „zu“
await seite.click('#knopf-pose');
await ruhig();
{
  const p = await K('pose');
  const m30 = await K('maulLinie');
  ok('„Fressen“ an: 30° von zu', p.an === true && !!m30 && m30.vorn > (FRONT ? 25 : 40), `Regler ${p.kiefer}°, Lippen vorn ${z1(m30?.vorn ?? NaN)} auseinander; ${await K('meldung')}`);
  if (BILD) await seite.screenshot({ path: `${BILD}-3-offen-30.jpg`, type: 'jpeg', quality: 88 });
  await regler(0);
  const zu = await K('maulLinie');
  const uZu = await K('umgeschlagen');
  ok('Regler ganz links: zu, die Lippen liegen aufeinander', !!zu && zu.vorn < 0.01 && zu.spalt < 0.6, `vorn ${z2(zu?.vorn ?? NaN)}, größter Spalt ${z2(zu?.spalt ?? NaN)}; umgeschlagen ${uZu} (die zusammengefaltete Tasche zählt mit)`);
  ok('zu: spiegelgleich', (await K('symmetrie')) < 1e-6);
  if (BILD) await seite.screenshot({ path: `${BILD}-4-zu.jpg`, type: 'jpeg', quality: 88 });
  await regler(55);
  const weit = await K('maulLinie');
  ok('Regler ganz rechts: weit offen', !!weit && weit.vorn > (FRONT ? 45 : 75), `Lippen vorn ${z1(weit?.vorn ?? NaN)} auseinander; umgeschlagen ${await K('umgeschlagen')}`);
  if (BILD) await seite.screenshot({ path: `${BILD}-5-offen-55.jpg`, type: 'jpeg', quality: 88 });
  await regler(30);
}

// 4. „Fressen“ aus: die Grundform wie davor
await seite.click('#knopf-pose');
await ruhig();
{
  const z = await K('lagen');
  let rest = z.length === nach.lagen.length ? 0 : Infinity;
  if (rest === 0) for (let i = 0; i < z.length; i++) rest = Math.max(rest, Math.abs(z[i] - nach.lagen[i]));
  ok('„Fressen“ aus: die Grundform wie davor', !(await K('pose')).an && rest < 1e-6, `Rest ${rest === Infinity ? 'andere Punktzahl' : rest.toExponential(1)}`);
}

// 5. ein Punkt auf der Oberlippe (Doppelklick), sein Zwilling kommt dazu; an ihm ziehen
if (!FRONT && !MITTE) {
  const vor = await K('maulLinie');
  const o = linie(0.55);
  const a = await bild('seite', o);
  await seite.mouse.dblclick(a.x, a.y);
  await ruhig();
  const dann = await K('maulLinie');
  ok('Doppelklick auf die Oberlippe: ein Punkt und sein Zwilling auf der Unterlippe', !!dann && dann.paare === vor.paare + 1 && dann.fehler < 1e-6, `${dann?.paare} Paare (vorher ${vor.paare}), Abweichung ${dann?.fehler?.toExponential(1)}`);
  const Lv = (await K('loops')).at(-1);
  // der neue Punkt: der sichtbare Punkt der Maullinie, der der Stelle am nächsten liegt
  const neu = [...Lv.punkte].filter((q) => q.sichtbar && !q.mundwinkel).sort((p, q) => Math.hypot(p.ref.x - o.x, p.ref.y - o.y) - Math.hypot(q.ref.x - o.x, q.ref.y - o.y))[0];
  const zwilling = [...Lv.punkte].filter((q) => q.sichtbar && !q.mundwinkel && q !== neu).sort((p, q) => p.ref.y - q.ref.y)[0];
  const von = await bild('seite', neu.ref);
  const ziel = await bild('seite', { ...neu.ref, y: neu.ref.y + 12 });
  await ziehen(von, ziel);
  const Ln = (await K('loops')).at(-1);
  const neuDanach = [...Ln.punkte].filter((q) => q.sichtbar && !q.mundwinkel).sort((p, q) => q.ref.y - p.ref.y)[0];
  const zwDanach = [...Ln.punkte].filter((q) => q.sichtbar && !q.mundwinkel).sort((p, q) => p.ref.y - q.ref.y)[0];
  const m5 = await K('maulLinie');
  ok('an der Oberlippe gezogen: der Punkt ist 12 höher', Math.abs(neuDanach.ref.y - (neu.ref.y + 12)) < 1.5, `y ${z1(neu.ref.y)} → ${z1(neuDanach.ref.y)}`);
  ok('die Unterlippe geht mit (ihr Zwilling hat sich bewegt), die Lippen bleiben Abbilder', Math.hypot(zwDanach.ref.x - zwilling.ref.x, zwDanach.ref.y - zwilling.ref.y) > 8 && !!m5 && m5.fehler < 1e-6, `Zwilling um ${z1(Math.hypot(zwDanach.ref.x - zwilling.ref.x, zwDanach.ref.y - zwilling.ref.y))} bewegt; Abweichung ${m5?.fehler?.toExponential(1)}`);
  ok('nach dem Zug: nichts umgeschlagen, spiegelgleich', (await K('umgeschlagen')) === 0 && (await K('symmetrie')) < 1e-6, `umgeschlagen ${await K('umgeschlagen')}`);
  if (BILD) await seite.screenshot({ path: `${BILD}-6-gezogen.jpg`, type: 'jpeg', quality: 88 });
  await seite.click('#knopf-pose');
  await ruhig();
  await regler(0);
  const zu = await K('maulLinie');
  ok('danach zu: die Lippen liegen wieder aufeinander', !!zu && zu.vorn < 0.01 && zu.spalt < 0.6, `vorn ${z2(zu?.vorn ?? NaN)}, größter Spalt ${z2(zu?.spalt ?? NaN)}`);
  if (BILD) await seite.screenshot({ path: `${BILD}-7-gezogen-zu.jpg`, type: 'jpeg', quality: 88 });
  await regler(30);
  await seite.click('#knopf-pose');
  await ruhig();
}

// 6. am Mundwinkel ziehen
if (!FRONT && !MITTE) {
  const Lv = (await K('loops')).at(-1);
  const W = Lv.punkte.find((q) => q.mundwinkel);
  const von = await bild('seite', W.ref);
  const ziel = await bild('seite', { ...W.ref, x: W.ref.x + 10, y: W.ref.y + 6 });
  await ziehen(von, ziel);
  const Ln = (await K('loops')).at(-1);
  const Wn = Ln.punkte.find((q) => q.mundwinkel);
  const m6 = await K('maulLinie');
  ok('am Mundwinkel gezogen: er ist dort, die Lippen bleiben Abbilder', Math.hypot(Wn.ref.x - W.ref.x - 10, Wn.ref.y - W.ref.y - 6) < 1.5 && !!m6 && m6.fehler < 1e-6, `(${z1(W.ref.x)} ${z1(W.ref.y)}) → (${z1(Wn.ref.x)} ${z1(Wn.ref.y)}); Abweichung ${m6?.fehler?.toExponential(1)}; umgeschlagen ${await K('umgeschlagen')}`);
  await seite.click('#knopf-pose');
  await ruhig();
  await regler(0);
  const zu = await K('maulLinie');
  ok('danach zu: die Lippen liegen aufeinander', !!zu && zu.vorn < 0.01 && zu.spalt < 0.6, `vorn ${z2(zu?.vorn ?? NaN)}, größter Spalt ${z2(zu?.spalt ?? NaN)}`);
  await regler(30);
  await seite.click('#knopf-pose');
  await ruhig();
}

// 7. zurück bis zum Anfang
{
  for (let k = 0; k < 12 && (await K('loops')).length > 0; k++) {
    await seite.keyboard.press('Meta+z');
    await ruhig();
  }
  const z = await K('lagen');
  if (!MITTE) ok('⌘Z bis zum Anfang: die Kugel ohne Linie', (await K('loops')).length === 0 && z.length / 3 === anfang, `${z.length / 3} Punkte, ${(await K('loops')).length} Loops`);
}
ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht === 0 ? 'alle Punkte erfüllt' : `${schlecht} Punkt${schlecht === 1 ? '' : 'e'} nicht erfüllt`);
await browser.close();
process.exit(schlecht === 0 ? 0 : 1);
