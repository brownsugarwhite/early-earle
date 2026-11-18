// Ozzy, Linien an einer freien Form (Plan „Objekte, Spiegel und Nähte“, Etappe 2b, 18.11.2026): eine frische Kugel mit drei Linien,
// Spiegel aus. An einer freien Form ist jede neue Linie eine für sich: Sie entsteht, wo sie gezeichnet ist, ohne Gegenstück.
// Kriterien:
//   1  Front, P: ein Strich senkrecht neben der Mitte, ↩: genau ein neuer Loop, nur auf der gezeichneten Seite; die Form bleibt frei.
//   2  Ein Punkt dieses Loops, nach außen gezogen: Die Form wächst nur auf dieser Seite. Zwei ⌘Z führen zurück.
//   3  Seite, P: ein Strich senkrecht, ↩: ein Loop rundum über beide Seiten (ein Loop, kein Ring mit Spiegelhälfte).
//   4  Seite, P: eine geschlossene Form auf dem Körper: Sie liegt auf der Seite, die man sieht.
//   5  Die Seite von hinten (⇧ + Doppelklick), dieselbe Form: Sie liegt auf der anderen Seite. K gibt nur ihr die Kante; ⌫ an einem
//      ihrer Punkte löscht nur den Punkt (die Form bleibt frei, nichts verschmilzt).
//   6  Abzweigung mit P von einem Punkt einer Linie zu einem Punkt einer anderen: eine offene Linie, sie hängt an beiden.
//   7  Spiegel an (das Spiegelbild ist gezeigt): Ein Strich in der Front, der nur das Spiegelbild trifft, legt den Loop an der Form an.
//   8  Nichts umgeschlagen, kein Punkt mit Spiegelpartner, keine Fehler in der Konsole.
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-frei-linien-fenster.mjs [ordner für Bilder]
import { auf, kugelMitRingen, punktAnDerWandZiehen, z1 } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const t = await auf({ extra: 'ohneLinie=0' });
const { browser, s, O, ruhig, klick, fehler } = t;
await kugelMitRingen(t);
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/${name}.png` });
};
const linien = () => O('werkLinienDaten');
/** z aller Proben eines Loops (Werk) */
const zVon = async (id) => {
  const L = await O('werkLinieLage', id);
  const z = [];
  for (let j = 2; j < L.length; j += 3) z.push(L[j]);
  return { min: Math.min(...z), max: Math.max(...z) };
};
/** eine Ansicht einrasten und warten */
const ansicht = async (taste) => {
  await s.keyboard.press(taste);
  await s.waitForTimeout(1700);
  await ruhig();
};
/** mit P klicken: Orte im Blatt der Ansicht `a` (Werk), dann ↩ (oder auf dem ersten schließen) */
const strich = async (a, orte, { zu = false } = {}) => {
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  const im = [];
  for (const [X, Y] of orte) im.push(await O('flaecheHin', a, X, Y));
  for (const q of im) await klick(q.x, q.y);
  if (zu) await klick(im[0].x, im[0].y);
  else await s.keyboard.press('Enter');
  await ruhig();
  await s.keyboard.press('a');
  await s.waitForTimeout(200);
};
/** wie weit die Haut des Werks längs z reicht */
const tiefe = async () => {
  const r = await O('werkRoh');
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 2; i < r.pos.length; i += 3) {
    zMin = Math.min(zMin, r.pos[i]);
    zMax = Math.max(zMax, r.pos[i]);
  }
  return { zMin, zMax };
};
const meldung = async () => (await O('werk')).meldung ?? '';
const umg = async () => (await O('werk')).umgeschlagen;
/** das neueste ⌘Z */
const zurueck = async () => {
  await s.keyboard.press('Meta+z');
  await ruhig();
};

await O('spiegelSetzen', 'aus');
await ruhig();
const sp0 = await O('spiegel');
const L0 = await linien();
ok('0 Spiegel aus: die Form ist frei', sp0.zustand === 'aus' && sp0.frei === true && L0.every((l) => l.art === 'paar'), `${sp0.zustand}, frei ${sp0.frei}, Linien ${L0.map((l) => l.art).join(' ')}`);

// ---------- 1 Front: ein Strich senkrecht bei z = 70 ----------
await ansicht('3');
await strich('front', [
  [70, -250],
  [70, 250],
]);
const L1 = await linien();
const neu1 = L1.length === L0.length + 1 ? L1[L1.length - 1] : null;
const z1b = neu1 ? await zVon(neu1.id) : { min: NaN, max: NaN };
const w1 = await O('werk');
await bild('frei-linien-1-front');
ok(
  '1 Front: ein neuer Loop, nur auf der gezeichneten Seite',
  !!neu1 && neu1.art === 'paar' && z1b.min > 65 && z1b.max < 75 && (await O('spiegel')).frei === true,
  `Linien ${L0.length} → ${L1.length}${neu1 ? `, ${neu1.art}, z ${z1(z1b.min)} bis ${z1(z1b.max)}, ${neu1.punkte.filter((p) => p.sichtbar).length} Punkte` : ''}; umgeschlagen ${w1.umgeschlagen}`,
);

// ---------- 2 ein Punkt dieses Loops nach außen: nur diese Seite wächst ----------
await ansicht('0');
const aus0 = await tiefe();
let gezogen = false;
if (neu1) {
  // der Punkt des neuen Loops, der im Top am weitesten vorn liegt (eine Kreuzung mit dem Ring in der Ebene y = 0)
  const P = (await linien()).find((l) => l.id === neu1.id).punkte.filter((p) => p.sichtbar);
  const p = P.reduce((a, b) => (Math.abs(b.y) < Math.abs(a.y) || (Math.abs(b.y) === Math.abs(a.y) && b.x > a.x) ? b : a));
  gezogen = await punktAnDerWandZiehen(t, { ...p, id: neu1.id }, p.z + 90, { halten: 300 });
  await ruhig();
}
const aus1 = await tiefe();
await bild('frei-linien-2-gezogen');
ok(
  '2 einseitig gezogen: die Form wächst nur auf dieser Seite',
  gezogen && aus1.zMax > aus0.zMax + 20 && Math.abs(aus1.zMin - aus0.zMin) < 6,
  `z ${z1(aus0.zMin)} … ${z1(aus0.zMax)} → ${z1(aus1.zMin)} … ${z1(aus1.zMax)}; umgeschlagen ${(await O('werk')).umgeschlagen}`,
);
await zurueck();
await zurueck();
const L2 = await linien();
ok('2b zwei ⌘Z führen zurück', L2.length === L0.length && (await O('spiegel')).frei === true, `Linien ${L2.length}`);

// ---------- 3 Seite: ein Strich senkrecht bei x = −60 ----------
await ansicht('1');
await strich('seite', [
  [-60, -250],
  [-60, 250],
]);
const L3 = await linien();
const neu3 = L3.length === L0.length + 1 ? L3[L3.length - 1] : null;
const z3 = neu3 ? await zVon(neu3.id) : { min: NaN, max: NaN };
await bild('frei-linien-3-seite');
ok('3 Seite: ein Loop rundum über beide Seiten', !!neu3 && neu3.art === 'paar' && z3.min < -120 && z3.max > 120, neu3 ? `${neu3.art}, z ${z1(z3.min)} bis ${z1(z3.max)}; umgeschlagen ${await umg()}` : `Linien ${L3.length}`);

// ---------- 4 Seite: eine geschlossene Form auf dem Körper ----------
const form = [
  [40, -90],
  [95, -60],
  [80, -25],
  [35, -40],
];
const vorn = await O('flaecheVorn', 'seite');
await strich('seite', form, { zu: true });
const L4 = await linien();
const neu4 = L4.length === L3.length + 1 ? L4[L4.length - 1] : null;
const z4 = neu4 ? await zVon(neu4.id) : { min: NaN, max: NaN };
await bild('frei-linien-4-form');
ok(
  '4 Seite: die Form liegt auf der Seite, die man sieht',
  !!neu4 && neu4.art === 'paar' && (vorn > 0 ? z4.min > 40 : z4.max < -40),
  neu4 ? `Blick von ${vorn > 0 ? '+z' : '−z'}, z ${z1(z4.min)} bis ${z1(z4.max)}, ${neu4.punkte.filter((p) => p.sichtbar).length} Punkte; umgeschlagen ${await umg()}` : `Linien ${L3.length} → ${L4.length}`,
);

// ---------- 5 von hinten: dieselbe Form liegt auf der anderen Seite ----------
await s.keyboard.down('Shift');
await s.mouse.click(1250, 760);
await s.waitForTimeout(90);
await s.mouse.click(1250, 760);
await s.keyboard.up('Shift');
await s.waitForTimeout(1700);
await ruhig();
const vornH = await O('flaecheVorn', 'seite');
await strich('seite', form, { zu: true });
const L5 = await linien();
const neu5 = L5.length === L4.length + 1 ? L5[L5.length - 1] : null;
const z5 = neu5 ? await zVon(neu5.id) : { min: NaN, max: NaN };
await bild('frei-linien-5-hinten');
ok(
  '5 von hinten: die Form liegt auf der anderen Seite',
  vornH === -vorn && !!neu5 && (vornH > 0 ? z5.min > 40 : z5.max < -40),
  `Blick von ${vornH > 0 ? '+z' : '−z'}${neu5 ? `, z ${z1(z5.min)} bis ${z1(z5.max)}` : `, Linien ${L4.length} → ${L5.length}`}; umgeschlagen ${await umg()}`,
);
// K und ⌫ am neuen Loop: die Kante nur an ihm (er ist nach dem Zeichnen gewählt); ⌫ löscht einen gewählten Punkt
{
  await s.keyboard.press('k');
  await ruhig();
  const k5 = neu5 ? (await linien()).find((l) => l.id === neu5.id) : null;
  const andere = (await linien()).filter((l) => l.id !== neu5?.id && l.kante === true).length;
  ok('5b K am neuen Loop: nur er bekommt die Kante, die Form bleibt frei', !!k5 && k5.kante === true && andere === 0 && (await O('spiegel')).frei === true, `Kante ${k5?.kante}, andere Linien mit Kante ${andere}, umgeschlagen ${await umg()}`);
  // ein Punkt dieses Loops (er liegt bei z < 0), gewählt und gelöscht: Nur der Punkt geht. (Bis zum 18.11. galt dort die Donut-Regel
  // vom 13.11.: „Punkt hinter der Mitte löschen macht den Schnitt fest“, die freie Form wurde an der Ebene verschmolzen.)
  let geloescht = false;
  const sichtbar = (l) => l.punkte.filter((q) => q.sichtbar).length;
  const P5 = k5?.punkte.find((q) => q.sichtbar);
  const A5 = P5 ? (await O('ankerImBild', neu5.id, P5.i, 'seite')).find((x) => !x.m && x.sichtbar) : null;
  if (A5) {
    await klick(A5.x, A5.y);
    if ((await O('bearbeiten')).auswahl.length === 1) {
      await s.keyboard.press('Backspace');
      await ruhig();
      geloescht = true;
    }
  }
  const nach = await linien();
  const n5 = nach.find((l) => l.id === neu5?.id);
  ok(
    '5c ⌫ an einem Punkt auf der Seite z < 0: nur der Punkt geht, die Form bleibt frei',
    geloescht && nach.length === L5.length && !!n5 && !!k5 && sichtbar(n5) === sichtbar(k5) - 1 && (await O('spiegel')).frei === true,
    `${geloescht ? '' : 'kein Punkt gewählt; '}Linien ${L5.length} → ${nach.length}, Punkte des Loops ${k5 ? sichtbar(k5) : '–'} → ${n5 ? sichtbar(n5) : '–'}, frei ${(await O('spiegel')).frei}`,
  );
  if (geloescht) await zurueck();
  await zurueck();
  const wieder = await linien();
  const w5 = wieder.find((l) => l.id === neu5?.id);
  ok('5d ⌘Z: der Punkt ist wieder da, die Kante wieder aus', wieder.length === L5.length && !!w5 && w5.kante !== true && sichtbar(w5) === 4, `Linien ${wieder.length}, Punkte ${w5 ? sichtbar(w5) : '–'}, umgeschlagen ${await umg()}`);
}
// zurück nach vorn
await s.keyboard.down('Shift');
await s.mouse.click(1250, 760);
await s.waitForTimeout(90);
await s.mouse.click(1250, 760);
await s.keyboard.up('Shift');
await s.waitForTimeout(1700);
await ruhig();

// ---------- 6 Abzweigung: vom Punkt einer Linie zum Punkt einer anderen ----------
// zwei sichtbare Punkte verschiedener Linien auf der Seite, die man sieht, die keine Linie gemeinsam haben
let ab = null;
{
  const L = await linien();
  const v = await O('flaecheVorn', 'seite');
  const P = [];
  for (const l of L) for (const p of l.punkte) if (p.sichtbar && Math.sign(p.z) === Math.sign(v) && Math.abs(p.z) > 30) P.push({ ...p, id: l.id });
  const linienAm = (p) => new Set(P.filter((q) => (p.kreuzung !== null && q.kreuzung === p.kreuzung) || (q.id === p.id && q.i === p.i)).map((q) => q.id));
  aussen: for (const a of P)
    for (const b of P) {
      if (a === b) continue;
      const la = linienAm(a);
      const lb = linienAm(b);
      if ([...la].some((x) => lb.has(x))) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 40 || d > 140) continue;
      ab = { a, b };
      break aussen;
    }
}
let neu6 = null;
const L5b = await linien();
if (ab) {
  const A = (await O('ankerImBild', ab.a.id, ab.a.i, 'seite')).find((x) => !x.m && x.sichtbar);
  const B = (await O('ankerImBild', ab.b.id, ab.b.i, 'seite')).find((x) => !x.m && x.sichtbar);
  if (A && B) {
    await s.keyboard.press('p');
    await s.waitForTimeout(300);
    await klick(A.x, A.y);
    await klick(B.x, B.y);
    await ruhig();
    await s.keyboard.press('a');
    await s.waitForTimeout(200);
    const L6 = await linien();
    neu6 = L6.length === L5b.length + 1 ? L6[L6.length - 1] : null;
  }
}
await bild('frei-linien-6-abzweigung');
const st6 = await meldung();
ok(
  '6 Abzweigung: eine offene Linie, sie hängt an beiden Punkten',
  !!neu6 && neu6.art === 'ring' && Array.isArray(neu6.haengt) && neu6.haengt[0] && neu6.haengt[1] && (await O('spiegel')).frei === true,
  neu6 ? `${neu6.art}, hängt ${neu6.haengt}, ${neu6.punkte.length} Punkte; umgeschlagen ${await umg()}` : `kein Paar von Punkten oder keine Linie (${ab ? 'Punkte gefunden' : 'keine Punkte'}; Meldung: ${st6 ?? ''})`,
);
if (neu6) await zurueck();

// ---------- 7 Spiegel an: ein Strich nur über das Spiegelbild ----------
// die Form zur Seite schieben (V, G längs Z), dann zeigt „an“ ihr Spiegelbild gegenüber
await ansicht('0');
await s.keyboard.press('v');
await s.waitForTimeout(300);
{
  const m = (await O('objekt')).mitte;
  const a = await O('werkImBild', m);
  const b = await O('werkImBild', { x: m.x, y: m.y, z: m.z + 260 });
  await s.mouse.move(a.x, a.y, { steps: 4 });
  await s.waitForTimeout(300);
  await s.keyboard.press('g');
  await s.keyboard.press('z');
  for (let k = 1; k <= 20; k++) {
    await s.mouse.move(a.x + ((b.x - a.x) * k) / 20, a.y + ((b.y - a.y) * k) / 20);
    await s.waitForTimeout(25);
  }
  await s.keyboard.press('Enter');
  await s.waitForTimeout(600);
}
await O('spiegelSetzen', 'an');
await s.waitForTimeout(600);
await s.keyboard.press('a');
await ansicht('3');
const m7 = (await O('objekt')).mitte;
const L6c = await linien();
const umg7 = await umg();
// ein Strich senkrecht durch das Spiegelbild, 60 neben seiner Mitte: Er trifft die Form nicht (genau durch die Mitte liefe er auf der
// Linie, die dort schon liegt)
const ZIEL = m7.z + 60;
await strich('front', [
  [-ZIEL, -260],
  [-ZIEL, 260],
]);
const L7 = await linien();
const neu7 = L7.length === L6c.length + 1 ? L7[L7.length - 1] : null;
const z7 = neu7 ? await zVon(neu7.id) : { min: NaN, max: NaN };
await bild('frei-linien-7-spiegelbild');
ok(
  '7 am Spiegelbild gezeichnet: der Loop entsteht an der Form',
  !!neu7 && Math.abs(z7.min - ZIEL) < 6 && Math.abs(z7.max - ZIEL) < 6,
  `vor dem Strich umgeschlagen ${umg7}; Mitte der Form z ${z1(m7.z)}${neu7 ? `, Loop z ${z1(z7.min)} bis ${z1(z7.max)}` : `, Linien ${L6c.length} → ${L7.length}, Meldung: ${await meldung()}`}`,
);

const w = await O('werk');
ok('8 nichts umgeschlagen, die Form ist frei, keine Fehler', w.umgeschlagen === 0 && (await O('spiegel')).frei === true && fehler.length === 0, `umgeschlagen ${w.umgeschlagen}, ${w.punkte} Punkte; ${fehler.slice(0, 3).join(' | ')}`);
await browser.close();
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
