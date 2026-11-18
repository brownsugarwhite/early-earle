// Ozzy, C4 im Plan „Ozzy stabil und schnell“ (18.11.2026): Felder wählen und bearbeiten. Ein Feld ist die Haut zwischen Linien (wie
// eine Fläche in Blender); gewählt meint es die Punkte der Linien auf seinem Rand. An „strange bird“, Seite eingerastet (dazu Front, Top
// und das Feld der Seite in den Vier Ansichten):
//   1  Ein Klick in ein Feld wählt es: ein Feld, mindestens zwei Punkte auf seinem Rand, sie sind die Auswahl des Werks; die Haut
//      ist dort getönt (vorher weiß).
//   2  Am gewählten Feld ziehen bewegt es: Alle Punkte auf seinem Rand gehen um denselben Weg mit, kein anderer Punkt bewegt sich
//      (außer denen, die eine Kreuzung mit einem von ihnen teilen); das Feld bleibt gewählt und getönt, auch nach dem Aufräumen.
//   3  ⌘Z nimmt den Zug zurück (danach ist nichts gewählt, wie nach ⌘Z an Punkten).
//   4  G verschiebt die Auswahl mit dem Zeiger, der Klick beendet; Esc nimmt zurück.
//   5  S skaliert um die Mitte der Auswahl (doppelter Abstand des Zeigers: doppelter Abstand der Punkte).
//   6  R dreht um die Mitte der Auswahl (Zeiger um 30°: Punkte um 30°, die Abstände zur Mitte bleiben).
//   7  ⇧ + Klick nimmt ein zweites Feld dazu, noch einmal nimmt es wieder heraus; ⇧ + Doppelklick wendet die Ansicht wie bisher, die
//      Auswahl bleibt dabei, wie sie war.
//   8  Ziehen an einer nicht gewählten Stelle dreht wie bisher (die Ansicht löst sich), nichts wird gewählt.
//   9  Esc leert die Auswahl, die Tönung ist weg.
//  10  In Front und Top und in der Seite von hinten wählt der Klick ebenso ein Feld; ebenso im Feld der Seite in den Vier Ansichten.
//  11  G verschiebt auch einen einzelnen Punkt (nur ihn) und alle gewählten Punkte (⌘A).
//  12  Keine Fehler in der Konsole.
// Aufruf aus apps/editor, Ozzy auf 5205: node scripts/pruefen/ozzy-felder-fenster.mjs [ordner für drei Bilder]
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');

const { browser, s, O, geladen, ruhig, fehler } = await auf({ form: 'strange bird', dichte: 1 });
await geladen();

/** mittlere Farbe um einen Ort (CSS-Pixel, 3 × 3) */
const farbeBei = async (x, y) => {
  const b64 = (await s.screenshot({ clip: { x: x - 1, y: y - 1, width: 3, height: 3 } })).toString('base64');
  return s.evaluate(async (d) => {
    const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${d}`)).blob());
    const c = new OffscreenCanvas(bild.width, bild.height);
    const g = c.getContext('2d');
    g.drawImage(bild, 0, 0);
    const px = g.getImageData(0, 0, bild.width, bild.height).data;
    const m = [0, 0, 0];
    for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) m[k] += px[i + k] / (px.length / 4);
    return m;
  }, b64);
};
const istWeiss = (f) => f[0] > 244 && f[1] > 244 && f[2] > 244;
const istGetoent = (f) => f[1] > f[0] + 6 && f[1] > f[2] + 6 && f[0] < 242;
/** die Punkte aller Linien: „Loop.Punkt“ → Lage im Werk und Kreuzung */
const punkte = async () => {
  const P = new Map();
  for (const l of await O('werkLinienDaten')) for (const p of l.punkte) P.set(`${l.id}.${p.i}`, p);
  return P;
};
/** Orte auf der Haut (Raster), an denen ein Feld liegt */
const orteSuchen = async (schritt = 30) => {
  const orte = [];
  for (let y = 110; y < 830; y += schritt)
    for (let x = 120; x < 1320; x += schritt) {
      const f = await O('feldBei', x, y);
      if (f) orte.push({ x, y, ...f });
    }
  return orte;
};
/** der erste Ort ab `ab`, an dem nichts am Zeiger hängt (kein Punkt, keine Linie) und für den `passt` gilt; der Zeiger steht dann dort */
const freierOrt = async (orte, ab = 0, passt = () => true) => {
  for (let i = Math.max(0, Math.floor(ab)); i < orte.length; i++) {
    const o = orte[i];
    const f = await O('feldBei', o.x, o.y);
    if (!f || !passt(f, o)) continue;
    await s.mouse.move(o.x - 14, o.y - 14, { steps: 2 });
    await s.mouse.move(o.x, o.y, { steps: 3 });
    await s.waitForTimeout(350);
    if (!(await O('bearbeiten')).ziel) return o;
  }
  return null;
};
const druecken = async (umschalt = false) => {
  if (umschalt) await s.keyboard.down('Shift');
  await s.mouse.down();
  await s.waitForTimeout(70);
  await s.mouse.up();
  if (umschalt) await s.keyboard.up('Shift');
  await s.waitForTimeout(500);
};
const zurueck = async () => {
  await s.keyboard.press('Meta+z');
  await ruhig();
};
/** größter Unterschied der Lagen zweier Stände, über die Punkte `welche` (oder alle) */
const unterschied = (A, B, welche = null) => {
  let m = 0;
  for (const [k, p] of A) {
    if (welche && !welche.has(k)) continue;
    const q = B.get(k);
    if (!q) return Infinity;
    m = Math.max(m, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z));
  }
  return m;
};
const mitteVon = (P, welche) => {
  const m = { x: 0, y: 0, z: 0 };
  for (const k of welche) {
    const p = P.get(k);
    m.x += p.x / welche.size;
    m.y += p.y / welche.size;
    m.z += p.z / welche.size;
  }
  return m;
};

// Seite, eingerastet, etwas näher
await s.keyboard.press('1');
await s.waitForTimeout(1800);
await ruhig();
for (let k = 0; k < 6; k++) {
  await s.mouse.move(720, 450);
  await s.mouse.wheel(0, -120);
  await s.waitForTimeout(120);
}
await s.waitForTimeout(900);
if (ordner) await s.screenshot({ path: `${ordner}/feld-1-vorher.png` });
let orte = await orteSuchen();

// 1 Klick wählt
const A = await freierOrt(orte, orte.length * 0.5);
if (!A) throw new Error('kein freier Ort auf der Haut');
// (die Farbe ohne den Zeiger darüber)
await s.mouse.move(40, 860, { steps: 2 });
await s.waitForTimeout(400);
const farbeVor = await farbeBei(A.x, A.y);
await s.mouse.move(A.x - 14, A.y - 14, { steps: 2 });
await s.mouse.move(A.x, A.y, { steps: 3 });
await s.waitForTimeout(350);
const P0 = await punkte();
await druecken();
let F = await O('felder');
const wahl = new Set(F[0]?.punkte ?? []);
const auswahlWerk = new Set(String((await O('werk')).auswahl).split(' ').filter(Boolean));
await s.mouse.move(40, 860, { steps: 2 });
await s.waitForTimeout(400);
const farbeNach = await farbeBei(A.x, A.y);
if (ordner) await s.screenshot({ path: `${ordner}/feld-2-gewaehlt.png` });
ok(
  '1 ein Klick in ein Feld wählt es, die Haut ist dort getönt',
  F.length === 1 && wahl.size >= 2 && wahl.size === auswahlWerk.size && [...wahl].every((k) => auswahlWerk.has(k)) && istWeiss(farbeVor) && istGetoent(farbeNach),
  `${F.length} Feld, ${wahl.size} Punkte auf dem Rand (${[...wahl].join(' ')}), Auswahl des Werks ${auswahlWerk.size}; Farbe vorher ${farbeVor.map((x) => x.toFixed(0)).join('/')}, nachher ${farbeNach.map((x) => x.toFixed(0)).join('/')}`,
);
// wer mitgeht, ohne gewählt zu sein: Punkte, die eine Kreuzung mit einem gewählten teilen
const kreuz = new Set([...wahl].map((k) => P0.get(k)?.kreuzung).filter((k) => k !== null && k !== undefined));
const mit = new Set([...P0].filter(([k, p]) => wahl.has(k) || (p.kreuzung !== null && kreuz.has(p.kreuzung))).map(([k]) => k));
const andere = new Set([...P0.keys()].filter((k) => !mit.has(k)));

// 2 am gewählten Feld ziehen
await s.mouse.move(A.x - 10, A.y - 10, { steps: 2 });
await s.mouse.move(A.x, A.y, { steps: 3 });
await s.waitForTimeout(300);
await s.mouse.down();
for (let k = 1; k <= 12; k++) {
  await s.mouse.move(A.x + 3 * k, A.y - 1.5 * k);
  await s.waitForTimeout(25);
}
await s.waitForTimeout(120);
await s.mouse.up();
await ruhig();
const P1 = await punkte();
{
  const d = [...wahl].map((k) => ({ x: P1.get(k).x - P0.get(k).x, y: P1.get(k).y - P0.get(k).y, z: P1.get(k).z - P0.get(k).z }));
  const m = { x: d.reduce((a, q) => a + q.x, 0) / d.length, y: d.reduce((a, q) => a + q.y, 0) / d.length };
  const streu = Math.max(...d.map((q) => Math.hypot(q.x - m.x, q.y - m.y)));
  const weg = Math.hypot(m.x, m.y);
  const fremd = unterschied(P0, P1, andere);
  F = await O('felder');
  await s.mouse.move(40, 860, { steps: 2 });
  await s.waitForTimeout(400);
  const farbe = await farbeBei(A.x + 36, A.y - 18);
  if (ordner) await s.screenshot({ path: `${ordner}/feld-3-gezogen.png` });
  ok(
    '2 am gewählten Feld ziehen bewegt es (alle Punkte auf dem Rand um denselben Weg, sonst keiner); es bleibt gewählt und getönt',
    weg > 5 && streu < 0.05 * weg + 0.5 && fremd < 1e-6 && F.length === 1 && istGetoent(farbe),
    `Weg ${z1(weg)} Einheiten (nach rechts ${z1(m.x)}, nach oben ${z1(m.y)}), größte Abweichung davon ${z1(streu)}; andere Punkte ${fremd.toExponential(1)}; ${F.length} Feld gewählt, Farbe am neuen Ort ${farbe.map((x) => x.toFixed(0)).join('/')}`,
  );
}

// 3 ⌘Z
await zurueck();
{
  const P = await punkte();
  // (nach ⌘Z ist nichts gewählt, wie nach ⌘Z an Punkten: Das Verhalten räumt die Auswahl auf)
  const f = await O('felder');
  const aw = String((await O('werk')).auswahl);
  ok('3 ⌘Z nimmt den Zug zurück (danach ist nichts gewählt, wie bei Punkten)', unterschied(P0, P) < 1e-6 && f.length === 0 && aw === '', `größter Unterschied zu vorher ${unterschied(P0, P).toExponential(1)}; ${f.length} Feld gewählt, Auswahl des Werks „${aw}“`);
}

/** das Feld bei A wählen (falls es das nicht mehr ist); der Zeiger steht danach auf A */
const feldWaehlen = async () => {
  await s.mouse.move(A.x - 10, A.y - 10, { steps: 2 });
  await s.mouse.move(A.x, A.y, { steps: 3 });
  await s.waitForTimeout(300);
  if (!(await O('feldBei', A.x, A.y))?.gewaehlt) await druecken();
  return (await O('felder')).length === 1;
};

// 4 G: verschieben, Klick beendet; Esc nimmt zurück
{
  const da = await feldWaehlen();
  await s.keyboard.press('g');
  await s.waitForTimeout(200);
  const laeuft = await O('tastenZug');
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(A.x - 2 * k, A.y - 3 * k);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(150);
  await s.mouse.down();
  await s.mouse.up();
  await ruhig();
  const P = await punkte();
  const d = [...wahl].map((k) => Math.hypot(P.get(k).x - P0.get(k).x, P.get(k).y - P0.get(k).y));
  const fertig = (await O('tastenZug')) === null;
  await zurueck();
  // Esc
  await feldWaehlen();
  await s.keyboard.press('g');
  await s.waitForTimeout(200);
  for (let k = 1; k <= 8; k++) {
    await s.mouse.move(A.x + 4 * k, A.y);
    await s.waitForTimeout(25);
  }
  await s.keyboard.press('Escape');
  await ruhig();
  const Pe = await punkte();
  ok(
    '4 G verschiebt die Auswahl mit dem Zeiger, der Klick beendet; Esc nimmt zurück',
    da && laeuft === 'g' && fertig && Math.min(...d) > 5 && Math.max(...d) - Math.min(...d) < 0.05 * Math.max(...d) + 0.5 && unterschied(P0, Pe) < 1e-6 && (await O('tastenZug')) === null,
    `Zug ${laeuft}; Weg der Punkte ${z1(Math.min(...d))} bis ${z1(Math.max(...d))}; nach Esc Unterschied ${unterschied(P0, Pe).toExponential(1)}`,
  );
}

// 5 S: skalieren um die Mitte der Auswahl; 6 R: drehen
{
  await feldWaehlen();
  const M = mitteVon(P0, wahl);
  // die Mitte der Auswahl im Bild: aus zwei Ankern die Abbildung Werk → Bild (Seite: x nach rechts, y nach oben)
  const an = [...wahl].map((k) => k.split('.').map(Number));
  const bilder = [];
  for (const [id, i] of an) {
    const q = (await O('ankerImBild', id, i, 'seite'))[0];
    if (q) bilder.push({ k: `${id}.${i}`, x: q.x, y: q.y });
  }
  let mass = 0;
  let zahl = 0;
  for (let a = 0; a < bilder.length; a++)
    for (let b = a + 1; b < bilder.length; b++) {
      const pa = P0.get(bilder[a].k);
      const pb = P0.get(bilder[b].k);
      const dw = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (dw < 20) continue;
      mass += Math.hypot(bilder[a].x - bilder[b].x, bilder[a].y - bilder[b].y) / dw;
      zahl++;
    }
  mass /= Math.max(1, zahl);
  const p0 = P0.get(bilder[0].k);
  const mx = bilder[0].x + (M.x - p0.x) * mass;
  const my = bilder[0].y - (M.y - p0.y) * mass;
  // S: der Zeiger 60 Bildpunkte neben der Mitte, dann auf 120
  await s.mouse.move(mx + 50, my + 20, { steps: 2 });
  await s.mouse.move(mx + 60, my, { steps: 3 });
  await s.waitForTimeout(300);
  await s.keyboard.press('s');
  await s.waitForTimeout(200);
  const laeuftS = await O('tastenZug');
  for (let k = 1; k <= 10; k++) {
    await s.mouse.move(mx + 60 + 6 * k, my);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(150);
  await s.keyboard.press('Enter');
  await ruhig();
  const Ps = await punkte();
  const Ms = mitteVon(Ps, wahl);
  const faktoren = [...wahl]
    .map((k) => ({ a: Math.hypot(P0.get(k).x - M.x, P0.get(k).y - M.y), b: Math.hypot(Ps.get(k).x - Ms.x, Ps.get(k).y - Ms.y) }))
    .filter((q) => q.a > 10)
    .map((q) => q.b / q.a);
  ok(
    '5 S skaliert um die Mitte der Auswahl (Zeiger auf doppelten Abstand: Punkte auf doppelten Abstand)',
    laeuftS === 's' && faktoren.length > 0 && Math.min(...faktoren) > 1.8 && Math.max(...faktoren) < 2.2,
    `Zug ${laeuftS}; Abstände zur Mitte mal ${z1(Math.min(...faktoren))} bis ${z1(Math.max(...faktoren))}; die Mitte wandert um ${z1(Math.hypot(Ms.x - M.x, Ms.y - M.y))}`,
  );
  await zurueck();
  // R: um 90° um die Mitte
  await feldWaehlen();
  await s.mouse.move(mx + 70, my + 20, { steps: 2 });
  await s.mouse.move(mx + 80, my, { steps: 3 });
  await s.waitForTimeout(300);
  await s.keyboard.press('r');
  await s.waitForTimeout(200);
  const laeuftR = await O('tastenZug');
  for (let k = 1; k <= 12; k++) {
    const w = (k / 12) * (Math.PI / 6);
    await s.mouse.move(mx + 80 * Math.cos(w), my - 80 * Math.sin(w));
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(150);
  await s.keyboard.press('Enter');
  await ruhig();
  const meldungR = String((await O('werk')).meldung ?? '');
  const Pr = await punkte();
  const Mr = mitteVon(Pr, wahl);
  const drehung = [...wahl]
    .map((k) => {
      const a = { x: P0.get(k).x - M.x, y: P0.get(k).y - M.y };
      const b = { x: Pr.get(k).x - Mr.x, y: Pr.get(k).y - Mr.y };
      return { laenge: Math.hypot(b.x, b.y) / Math.max(1e-9, Math.hypot(a.x, a.y)), winkel: (Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180) / Math.PI, weit: Math.hypot(a.x, a.y) };
    })
    .filter((q) => q.weit > 10);
  ok(
    '6 R dreht um die Mitte der Auswahl (Zeiger um 30°: Punkte um 30°, Abstände bleiben)',
    laeuftR === 'r' && drehung.length > 0 && drehung.every((q) => Math.abs(Math.abs(q.winkel) - 30) < 3 && Math.abs(q.laenge - 1) < 0.03),
    `Zug ${laeuftR}; Winkel ${z1(Math.min(...drehung.map((q) => q.winkel)))}° bis ${z1(Math.max(...drehung.map((q) => q.winkel)))}°, Abstände mal ${Math.min(...drehung.map((q) => q.laenge)).toFixed(2)} bis ${Math.max(...drehung.map((q) => q.laenge)).toFixed(2)}${meldungR ? `; Meldung: ${meldungR.slice(0, 120)}` : ''}; je Punkt: ${[...wahl].map((k) => `${k} ${(Math.hypot(Pr.get(k).x - P0.get(k).x, Pr.get(k).y - P0.get(k).y)).toFixed(0)}/${(Pr.get(k).z - P0.get(k).z).toFixed(0)}`).join(' ')}`,
  );
  await zurueck();
}

// 7 ⇧ + Klick: ein zweites Feld dazu, wieder weg
{
  await feldWaehlen();
  const B = await freierOrt(orte, 0, (f) => !f.gewaehlt);
  let zwei = 0;
  let eins = 0;
  if (B) {
    await druecken(true);
    zwei = (await O('felder')).length;
    await s.mouse.move(B.x - 6, B.y - 6, { steps: 2 });
    await s.mouse.move(B.x, B.y, { steps: 3 });
    // (mehr als ein Doppelklick auseinander: Der wendete die Ansicht)
    await s.waitForTimeout(600);
    await druecken(true);
    eins = (await O('felder')).length;
  }
  const b = await O('blick');
  // ⇧ + Doppelklick wendet die Ansicht wie bisher; das Feld unter dem Zeiger bleibt, wie es war
  let nachDoppel = -1;
  let gewendet = false;
  if (B) {
    await s.waitForTimeout(600);
    await s.keyboard.down('Shift');
    await s.mouse.down();
    await s.mouse.up();
    await s.waitForTimeout(90);
    await s.mouse.down();
    await s.mouse.up();
    await s.keyboard.up('Shift');
    await s.waitForTimeout(2200);
    nachDoppel = (await O('felder')).length;
    gewendet = (await O('blick')).gewendet;
    await s.keyboard.press('1');
    await s.waitForTimeout(2200);
    await ruhig();
  }
  ok(
    '7 ⇧ + Klick nimmt ein zweites Feld dazu, noch einmal nimmt es wieder heraus; ⇧ + Doppelklick wendet nur',
    !!B && zwei === 2 && eins === 1 && b.ansicht === 'seite' && !b.gewendet && nachDoppel === 1 && gewendet,
    `gewählt danach ${zwei}, dann ${eins}; Ansicht ${b.ansicht}${b.gewendet ? ', gewendet' : ''}; nach ⇧ + Doppelklick ${nachDoppel} Feld, ${gewendet ? 'gewendet' : 'nicht gewendet'}`,
  );
}

// 8 Ziehen an einer nicht gewählten Stelle dreht wie bisher
{
  const C = await freierOrt(orte, orte.length * 0.2, (f) => !f.gewaehlt);
  const vor = await O('blick');
  const fVor = (await O('felder')).length;
  let nach = vor;
  if (C) {
    await s.mouse.down();
    for (let k = 1; k <= 10; k++) {
      await s.mouse.move(C.x + 6 * k, C.y + 2 * k);
      await s.waitForTimeout(25);
    }
    // (vor dem Loslassen gelesen: Nach einem kurzen Weg rastet die Ansicht wieder ein)
    nach = await O('blick');
    await s.mouse.up();
    await s.waitForTimeout(400);
  }
  ok('8 Ziehen an einer nicht gewählten Stelle dreht wie bisher, nichts wird gewählt', !!C && Math.abs(nach.gier - vor.gier) > 0.05 && (await O('felder')).length <= fVor, `Gier ${vor.gier.toFixed(2)} → ${nach.gier.toFixed(2)}; Felder ${fVor} → ${(await O('felder')).length}`);
  await s.keyboard.press('1');
  await s.waitForTimeout(1800);
  await ruhig();
}

// 9 Esc leert
{
  await feldWaehlen();
  const da = (await O('felder')).length;
  await s.mouse.move(40, 860, { steps: 2 });
  await s.keyboard.press('Escape');
  await s.waitForTimeout(500);
  const farbe = await farbeBei(A.x, A.y);
  const b = await O('blick');
  ok('9 Esc leert die Auswahl, die Tönung ist weg', da === 1 && (await O('felder')).length === 0 && String((await O('werk')).auswahl) === '' && istWeiss(farbe) && b.ansicht === 'seite', `Felder ${da} → ${(await O('felder')).length}; Farbe ${farbe.map((x) => x.toFixed(0)).join('/')}; Ansicht ${b.ansicht}`);
}

// 10 Front, Top, Vier Ansichten
{
  const befund = [];
  let alle = true;
  for (const [taste, name] of [
    ['3', 'front'],
    ['7', 'top'],
  ]) {
    await s.keyboard.press(taste);
    await s.waitForTimeout(1800);
    await ruhig();
    const o2 = await orteSuchen(40);
    const D = await freierOrt(o2, o2.length * 0.4);
    if (D) await druecken();
    const f = await O('felder');
    const gut = !!D && D.flaeche === name && f.length === 1 && f[0].punkte.length >= 2;
    alle = alle && gut;
    befund.push(`${name}: ${o2.length} Orte, ${f.length} Feld mit ${f[0]?.punkte.length ?? 0} Punkten`);
    await s.keyboard.press('Escape');
    await s.waitForTimeout(300);
  }
  // die Seite von hinten: das Feld der Rückseite (die Form ist dort gespiegelt zu sehen)
  await s.keyboard.press('Shift+Digit1');
  await s.waitForTimeout(2200);
  await ruhig();
  {
    const oh = await orteSuchen(40);
    const H = await freierOrt(oh, oh.length * 0.5);
    if (H) await druecken();
    const f = await O('felder');
    const bh = await O('blick');
    await s.mouse.move(40, 860, { steps: 2 });
    await s.waitForTimeout(400);
    const farbe = H ? await farbeBei(H.x, H.y) : [0, 0, 0];
    // (auf der Rückseite tauschen Tinte und Papier: Das getönte Feld ist dort ein dunkles Grün)
    const gut = !!H && bh.ansicht === 'seite' && bh.gewendet && f.length === 1 && f[0].punkte.length >= 2 && farbe[1] > farbe[0] + 3 && farbe[1] > farbe[2] + 6 && farbe[1] > 60;
    alle = alle && gut;
    befund.push(`Seite von hinten: ${oh.length} Orte, ${f.length} Feld mit ${f[0]?.punkte.length ?? 0} Punkten, Farbe ${farbe.map((x) => x.toFixed(0)).join('/')}`);
    await s.keyboard.press('Escape');
    await s.waitForTimeout(300);
  }
  await s.keyboard.press('0');
  await s.waitForTimeout(1500);
  await s.keyboard.press('Tab');
  await s.waitForTimeout(3500);
  await ruhig();
  const o4 = (await orteSuchen(30)).filter((o) => o.flaeche === 'seite');
  const E = await freierOrt(o4, o4.length * 0.5);
  if (E) await druecken();
  const f4 = await O('felder');
  const b4 = await O('blick');
  const gut4 = !!E && f4.length === 1 && f4[0].punkte.length >= 2 && b4.vier > 0.9;
  alle = alle && gut4;
  befund.push(`Vier Ansichten, Feld der Seite: ${o4.length} Orte, ${f4.length} Feld mit ${f4[0]?.punkte.length ?? 0} Punkten${b4.vier > 0.9 ? '' : ', die Vier Ansichten sind zugeklappt'}`);
  ok('10 in Front, Top, der Seite von hinten und im Feld der Seite der Vier Ansichten wählt der Klick ebenso ein Feld', alle, befund.join(' · '));
}

// 11 G an einem einzelnen Punkt und an einer ganzen Linie (Seite, eingerastet)
{
  await s.keyboard.press('Escape');
  await s.waitForTimeout(600);
  await s.keyboard.press('1');
  await s.waitForTimeout(2200);
  await ruhig();
  const Pv = await punkte();
  const L = await O('werkLinienDaten');
  // ein sichtbarer Punkt einer Linie, die nicht die Mitte ist (an einer Kreuzung gehen die Punkte der anderen Linien dort mit)
  let ziel = null;
  let gesehen = 0;
  for (const l of L) {
    if (l.art === 'mitte' || ziel) continue;
    for (const p of l.punkte) {
      if (!p.sichtbar || ziel) continue;
      const q = (await O('ankerImBild', l.id, p.i, 'seite')).find((x) => x.sichtbar);
      if (!q) continue;
      gesehen++;
      await s.mouse.move(q.x + 20, q.y + 20, { steps: 2 });
      await s.mouse.move(q.x, q.y, { steps: 4 });
      await s.waitForTimeout(400);
      if (/^Punkt /.test((await O('bearbeiten')).ziel)) ziel = { k: `${l.id}.${p.i}`, x: q.x, y: q.y, id: l.id, kreuzung: p.kreuzung };
    }
  }
  let wegPunkt = 0;
  let fremdPunkt = Infinity;
  let wegLinie = 0;
  if (ziel) {
    await druecken();
    await s.keyboard.press('g');
    await s.waitForTimeout(200);
    for (let k = 1; k <= 8; k++) {
      await s.mouse.move(ziel.x + 2 * k, ziel.y - 2 * k);
      await s.waitForTimeout(25);
    }
    await s.waitForTimeout(150);
    await s.keyboard.press('Enter');
    await ruhig();
    const Pn = await punkte();
    wegPunkt = Math.hypot(Pn.get(ziel.k).x - Pv.get(ziel.k).x, Pn.get(ziel.k).y - Pv.get(ziel.k).y);
    fremdPunkt = unterschied(Pv, Pn, new Set([...Pv].filter(([k, p]) => k !== ziel.k && !(ziel.kreuzung !== null && p.kreuzung === ziel.kreuzung)).map(([k]) => k)));
    await zurueck();
    // die ganze Linie: ⌘A wählt alle Punkte; G nimmt sie alle mit
    await s.keyboard.press('Meta+a');
    await s.waitForTimeout(300);
    await s.mouse.move(700, 430, { steps: 3 });
    await s.keyboard.press('g');
    await s.waitForTimeout(200);
    for (let k = 1; k <= 8; k++) {
      await s.mouse.move(700 + 3 * k, 430);
      await s.waitForTimeout(25);
    }
    await s.waitForTimeout(150);
    await s.keyboard.press('Enter');
    await ruhig();
    const Pa = await punkte();
    const wege = [...Pv.keys()].filter((k) => Pv.get(k).sichtbar).map((k) => Math.hypot(Pa.get(k).x - Pv.get(k).x, Pa.get(k).y - Pv.get(k).y));
    wegLinie = Math.min(...wege);
    await zurueck();
  }
  ok('11 G verschiebt auch einen einzelnen Punkt (nur ihn) und alle gewählten Punkte (⌘A)', !!ziel && wegPunkt > 5 && fremdPunkt < 1e-6 && wegLinie > 5, `Punkt ${ziel?.k ?? `keiner (${gesehen} Anker gesehen, Ansicht ${(await O('blick')).ansicht})`}: Weg ${z1(wegPunkt)}, andere ${fremdPunkt.toExponential(1)}; alle gewählt: kleinster Weg ${z1(wegLinie)}`);
}

ok('12 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 2).join(' | ').slice(0, 300));
await browser.close();
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
