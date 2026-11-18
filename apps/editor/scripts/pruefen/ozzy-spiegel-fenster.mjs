// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 2: der Spiegel-Knopf mit drei Zuständen (Florian: „mirror an, mirror aus,
// mirror an mit clipping … Ich kann mirrorhälften erst ohne clipping ineinanderschieben und dann clipping einschalten um sie zu
// verschmelzen. Gerne mit einer schönen animation“; zu „aus“ an einer verschmolzenen Form: „Ja, so bauen“, sie wird ganz und frei).
// An einer frischen Kugel mit drei Linien, erster Teil (NUR=clip):
//   an        ohne Clipping: der Punkt an der Seite über die Mitte gezogen; losgelassen bleibt es dabei, die Hälften überragen sich
//             (keine Naht, die Anzeige schneidet nicht)
//   Clipping  eingeschaltet: Die Überschneidung zieht sich in die Ebene zurück (die Fahrt), dann steht die Naht und ist gewählt
//   ⌘Z        trennt wieder, der Knopf steht wieder auf „an“
//   noch einmal Clipping, K: der runde Donut
// zweiter Teil (NUR=aus), an einer zweiten frischen Kugel:
//   aus       die Form ist ein ganzes Netz ohne Spiegelpaare, jede Linie ein geschlossener Loop, keine Spiegelkopien mehr
//   einseitig der Punkt an der einen Seite 60 hinaus: Der an der anderen Seite bleibt, wo er ist; nichts umgeschlagen
//   an        das Spiegelbild ist da (die Anzeige zeigt doppelt so viele Punkte); aus: wieder weg
//   P         geht auch an der freien Form an (was es dort zeichnet: `ozzy-frei-linien-fenster.mjs`)
//   ⌘Z        zurück bis zur verschmolzenen Form: Der Knopf steht wieder auf Clipping
// dritter Teil (NUR=objekt), an einer dritten frischen Kugel: das ganze Objekt bewegen (V) und an der Ebene verschmelzen
//   aus, V    im Top am Objekt ziehen: Es liegt 200 neben der Spiegelebene (die Form ist dieselbe, nur verschoben)
//   an        das Spiegelbild steht gegenüber; die beiden überragen sich nicht
//   ziehen    zurück bis 60 neben die Ebene: Sie überragen sich, nichts verschmilzt
//   Clipping  die Fahrt, dann eine Form aus zwei Kugeln mit einer Naht in der Ebene; ⌘Z trennt wieder
//   wartend   weit weg geschoben, Clipping ein (nichts geschieht), zurückgeschoben: Beim Loslassen verschmilzt es von selbst
//   G S R     an der verschmolzenen Form: S skaliert, R dreht nur in der Seite, G mit X nur längs
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-spiegel-fenster.mjs
//   BILD=<pfad ohne Endung>   FILM=<ziel.mp4> (die Fahrt, Bild für Bild)   MATERIAL=solid|zebra   TIEF=<hinter die Mitte> (Standard 60)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auf, kugelMitRingen, punktAnDerWandZiehen, seitenPunkt, ueberDieMitteZiehen } from './ozzy-teile.mjs';

const BILD = process.env.BILD ?? '';
const FILM = process.env.FILM ?? '';
const TIEF = Number(process.env.TIEF ?? 60);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const NUR = process.env.NUR ?? '';
const t = await auf({ dichte: 2, extra: 'ohneLinie=0' });
const { browser, s, O, ruhig, fehler } = t;
await kugelMitRingen(t);
if (process.env.MATERIAL) await O('material', process.env.MATERIAL);
const AUSSCHNITT = { x: 440, y: 250, width: 560, height: 420 };
const foto = async (name) => {
  if (BILD) await s.screenshot({ path: `${BILD}-${name}.png`, clip: AUSSCHNITT });
};
const linien = () => O('werkLinienDaten');
const knopf = async (z) => {
  await s.click(`#spiegel [data-zustand="${z}"]`);
  await s.waitForTimeout(60);
};
const gedrueckt = () => s.getAttribute('#spiegel [aria-pressed="true"]', 'data-zustand');
const z1 = (x) => x.toFixed(1).replace('.', ',');
if (NUR === '' || NUR === 'clip') {

const L0 = await linien();
let sp = await O('spiegel');
ok('am Anfang: Spiegel an, mit Clipping', sp.zustand === 'clip' && sp.erlaubt && (await gedrueckt()) === 'clip');

// ---------- an, ohne Clipping: über die Mitte ziehen, es bleibt dabei ----------
await knopf('an');
sp = await O('spiegel');
ok('Klick: Spiegel an, ohne Clipping', sp.zustand === 'an' && (await gedrueckt()) === 'an' && !sp.frei);
const p = await ueberDieMitteZiehen(t, TIEF);
await ruhig();
let w = await O('werk');
let L = await linien();
ok('ohne Clipping: Die Hälften überragen sich, keine Naht, die Anzeige schneidet nicht', w.ueberDerMitte && !w.spiegelSchnitt && L.length === L0.length, `${L.length} Linien, umgeschlagen ${w.umgeschlagen}`);
await foto('1-ueberragt');
// die Maus weg vom Knopf-Weg (der Zeiger soll im Film nicht über der Form stehen)

// ---------- Clipping ein: die Fahrt, dann die Naht ----------
if (FILM) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'ozzy-spiegel-'));
  await s.mouse.move(300, 760);
  await O('film', true);
  let nr = 0;
  const bild = async () => {
    await O('bild', 1 / 60);
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), clip: AUSSCHNITT, type: 'jpeg', quality: 92 });
  };
  for (let i = 0; i < 20; i++) await bild();
  await O('spiegelSetzen', 'clip');
  for (let i = 0; i < 34; i++) await bild();
  await O('film', false);
  // das Werk setzt die Haut im Hintergrund: weiter in echter Zeit, alle 1/30 s ein Bild
  for (let i = 0; i < 45; i++) {
    await s.waitForTimeout(33);
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), clip: AUSSCHNITT, type: 'jpeg', quality: 92 });
    await s.screenshot({ path: path.join(ordner, `${String(nr++).padStart(5, '0')}.jpg`), clip: AUSSCHNITT, type: 'jpeg', quality: 92 });
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-i', path.join(ordner, '%05d.jpg'), '-vf', 'scale=1120:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', FILM]);
  fs.rmSync(ordner, { recursive: true, force: true });
  console.log(`     Film: ${FILM} (${nr} Bilder)`);
} else {
  await knopf('clip');
  await s.waitForTimeout(140);
  sp = await O('spiegel');
  w = await O('werk');
  ok('Clipping ein: Die Fahrt läuft, die Anzeige schneidet tief hinter der Ebene und wandert zu ihr', sp.zustand === 'clip' && sp.fahrt !== null && sp.fahrt > 0 && sp.fahrt < 1 && w.spiegelSchnitt && sp.rand > 2 * 0.02, sp.fahrt === null ? 'keine Fahrt' : `Fahrt ${sp.fahrt.toFixed(2)}, Rand ${sp.rand.toFixed(1)} Welteinheiten hinter der Ebene`);
  await foto('2-fahrt');
}
await s.waitForTimeout(700);
await ruhig();
w = await O('werk');
L = await linien();
const naht = L.filter((l) => l.art === 'mitte' && l.kante === true && !L0.some((x) => x.id === l.id));
ok('danach: Die Naht steht (Loop der Mitte mit Kante) und ist gewählt', naht.length >= 1 && naht.every((l) => ` ${w.auswahl} `.includes(` ${l.id}.-1 `)) && !w.ueberDerMitte && !w.spiegelSchnitt, `${naht.map((l) => `Loop ${l.id}, ${l.punkte.length} Punkte`).join('; ') || 'keine'}; gezeigt gewählt: ${(await O('bearbeiten')).auswahl.length} Punkte`);
await foto('3-naht');

// ---------- ⌘Z trennt wieder ----------
await s.keyboard.press('Meta+z');
await ruhig();
w = await O('werk');
sp = await O('spiegel');
ok('⌘Z: wieder getrennt, der Knopf steht auf „an“', w.ueberDerMitte && (await linien()).length === L0.length && sp.zustand === 'an', `Knopf: ${sp.zustand}`);

// ---------- noch einmal Clipping, dann K ----------
await knopf('clip');
await s.waitForTimeout(900);
await ruhig();
await s.keyboard.press('k');
await ruhig();
L = await linien();
w = await O('werk');
const rund = L.filter((l) => l.art === 'mitte' && !L0.some((x) => x.id === l.id));
ok('Clipping und K: die Naht ist rund, nichts umgeschlagen', rund.length >= 1 && rund.every((l) => l.kante !== true) && w.umgeschlagen === 0, `umgeschlagen ${w.umgeschlagen}`);
await foto('4-rund');
// ein Zug danach über die Mitte verschmilzt wieder von selbst (Etappe 0) – hier nur: der Knopf steht auf Clipping
ok('der Knopf steht auf Clipping', (await O('spiegel')).zustand === 'clip');
void p;
}

// ====================== zweiter Teil: Spiegel aus (die freie Form) ======================
if (NUR === '' || NUR === 'aus') {
  if (NUR !== 'aus') {
    await s.reload();
    await s.waitForFunction(() => !!window.__ozzy);
    await kugelMitRingen(t);
  }
  const K0 = await linien();
  const w0 = await O('werk');
  await knopf('aus');
  await ruhig();
  let sp = await O('spiegel');
  let L = await linien();
  const spiegelAnker = async () => {
    let n = 0;
    for (const l of await linien()) for (const q of l.punkte) n += (await O('ankerImBild', l.id, q.i)).filter((a) => a.m).length;
    return n;
  };
  ok('aus: die Form ist frei (ein ganzes Netz), jede Linie ein geschlossener Loop', sp.zustand === 'aus' && sp.frei && (await gedrueckt()) === 'aus' && L.every((l) => l.art === 'paar') && (await O('werk')).punkte === w0.punkte, `${L.map((l) => `${l.id} ${l.art} ${l.punkte.length}P`).join(', ')} (vorher ${K0.map((l) => `${l.id} ${l.art} ${l.punkte.length}P`).join(', ')})`);
  ok('aus: keine Spiegelkopien der Punkte mehr, kein Spiegelbild in der Anzeige', (await spiegelAnker()) === 0 && !sp.spiegelbild);
  await foto('5-aus');

  // einseitig: der Punkt an der Seite z > 0 hinaus; der an der Seite z < 0 bleibt
  const vorn = await seitenPunkt(t, 1);
  const hinten = await seitenPunkt(t, -1);
  ok('aus: an jeder Seite liegt ein eigener Punkt', !!vorn && !!hinten && Math.abs(vorn.z + hinten.z) < 1 && Math.abs(vorn.x - hinten.x) < 1, vorn && hinten ? `z = ${z1(vorn.z)} und ${z1(hinten.z)}` : '');
  await punktAnDerWandZiehen(t, vorn, vorn.z + 60);
  await ruhig();
  L = await linien();
  const v2 = L.find((l) => l.id === vorn.id)?.punkte[vorn.i];
  const h2 = L.find((l) => l.id === hinten.id)?.punkte[hinten.i];
  let w = await O('werk');
  ok('einseitig: der gezogene Punkt ist 60 hinaus, der auf der anderen Seite bleibt', !!v2 && !!h2 && Math.abs(v2.z - vorn.z - 60) < 2 && Math.abs(h2.z - hinten.z) < 0.5 && Math.abs(h2.x - hinten.x) < 0.5, v2 && h2 ? `vorn z ${z1(vorn.z)} → ${z1(v2.z)}, hinten z ${z1(hinten.z)} → ${z1(h2.z)}` : 'Punkt fehlt');
  ok('einseitig: nichts umgeschlagen, die Form bleibt frei', w.umgeschlagen === 0 && (await O('spiegel')).frei, `umgeschlagen ${w.umgeschlagen}, ${w0.punkte} → ${w.punkte} Punkte`);
  await foto('6-einseitig');

  // an: das Spiegelbild als Anzeige
  const einfach = (await O('spiegel')).gezeigt;
  await knopf('an');
  await s.waitForTimeout(500);
  sp = await O('spiegel');
  ok('an: das Spiegelbild ist da (nur Anzeige: doppelt so viele gezeigte Punkte, gerechnet wird ein Netz)', sp.zustand === 'an' && sp.frei && sp.spiegelbild && sp.gezeigt === 2 * einfach && (await O('werk')).punkte === w.punkte, `${einfach} → ${sp.gezeigt} gezeigte Punkte`);
  ok('an: die Linien haben ihre Spiegelkopien', (await spiegelAnker()) > 0);
  await foto('7-an');
  await knopf('aus');
  await s.waitForTimeout(400);
  sp = await O('spiegel');
  ok('aus: das Spiegelbild ist wieder weg', sp.zustand === 'aus' && !sp.spiegelbild && sp.gezeigt === einfach);

  // P geht auch an der freien Form an (seit dem zweiten Teil von 2b; was es dort zeichnet, prüft `ozzy-frei-linien-fenster.mjs`)
  await s.keyboard.press('p');
  await s.waitForTimeout(200);
  ok('P an der freien Form: das Werkzeug geht an', (await O('objekt')).werkzeug === 'p', (await O('objekt')).werkzeug);
  await s.keyboard.press('a');
  await s.waitForTimeout(200);

  // ⌘Z: der Zug, dann „aus“
  await s.keyboard.press('Meta+z');
  await ruhig();
  await s.keyboard.press('Meta+z');
  await ruhig();
  sp = await O('spiegel');
  L = await linien();
  ok('⌘Z ⌘Z: wieder die verschmolzene Form, der Knopf steht auf Clipping', !sp.frei && sp.zustand === 'clip' && L.length === K0.length && L.map((l) => l.art).join() === K0.map((l) => l.art).join(), `${L.map((l) => `${l.id} ${l.art}`).join(', ')}`);
}

// ====================== dritter Teil: das ganze Objekt bewegen und an der Ebene verschmelzen ======================
if (NUR === '' || NUR === 'objekt') {
  if (NUR !== 'objekt') {
    await s.reload();
    await s.waitForFunction(() => !!window.__ozzy);
    await kugelMitRingen(t);
  }
  /** das Werk rechnet nicht mehr (gilt auch im Objekt-Modus, in dem die Linien nicht bedient werden) */
  const still = async () => {
    await s.waitForTimeout(300);
    await s.waitForFunction(() => !window.__ozzy.werk().beschaeftigt && !window.__ozzy.werk().griffWartet, null, { timeout: 90000 });
    await s.waitForTimeout(250);
  };
  const grenzen = async () => {
    const r = await O('werkRoh');
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < r.pos.length; i++) {
      lo[i % 3] = Math.min(lo[i % 3], r.pos[i]);
      hi[i % 3] = Math.max(hi[i % 3], r.pos[i]);
    }
    return { lo, hi };
  };
  /** im Top am Objekt ziehen: von seiner Mitte um dz quer zur Spiegelebene (Einheiten des Werks) */
  const schieben = async (dz) => {
    const m = (await O('objekt')).mitte;
    const a = await O('flaecheHin', 'top', m.x, m.z);
    const b = await O('flaecheHin', 'top', m.x, m.z + dz);
    await t.ziehen(a.x, a.y, b.x, b.y, { schritte: 24, nach: 400 });
    await still();
  };
  const g0 = await grenzen();
  await knopf('aus');
  await still();
  await s.keyboard.press('v');
  await s.keyboard.press('7');
  await s.waitForTimeout(1600);
  await still();
  // ---------- zur Seite ----------
  await schieben(200);
  let o = await O('objekt');
  let g = await grenzen();
  ok('V, am Objekt gezogen: Es liegt 200 neben der Ebene, die Form ist dieselbe', o.modus && Math.abs(o.mitte.z - 200) < 4 && Math.abs(g.hi[2] - g.lo[2] - (g0.hi[2] - g0.lo[2])) < 0.01 && Math.abs(g.hi[0] - g0.hi[0]) < 0.01, `Mitte z = ${z1(o.mitte.z)}, Tiefe ${z1(g.hi[2] - g.lo[2])} (vorher ${z1(g0.hi[2] - g0.lo[2])})`);
  await knopf('an');
  await s.waitForTimeout(400);
  let sp = await O('spiegel');
  let w = await O('werk');
  ok('an: das Spiegelbild steht gegenüber', sp.zustand === 'an' && sp.frei && sp.spiegelbild && !w.ueberDerMitte);
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  await foto('8-paar');
  await s.keyboard.press('7');
  await s.waitForTimeout(1600);
  // ---------- ineinander, ohne Clipping ----------
  await schieben(-140);
  o = await O('objekt');
  w = await O('werk');
  ok('zurückgeschoben bis 60 neben die Ebene: Die beiden überragen sich, nichts verschmilzt', Math.abs(o.mitte.z - 60) < 5 && w.ueberDerMitte && !w.spiegelSchnitt && (await O('spiegel')).frei, `Mitte z = ${z1(o.mitte.z)}`);
  await s.keyboard.press('0');
  await s.waitForTimeout(1800);
  await foto('9-ueberragt');
  // ---------- Clipping: die Fahrt, dann eine Form ----------
  const L0 = (await linien()).length;
  await knopf('clip');
  await s.waitForTimeout(140);
  sp = await O('spiegel');
  ok('Clipping ein: Die Fahrt läuft', sp.fahrt !== null && sp.fahrt > 0 && sp.fahrt < 1 && (await O('werk')).spiegelSchnitt, sp.fahrt === null ? 'keine Fahrt' : `Fahrt ${sp.fahrt.toFixed(2)}, Rand ${sp.rand.toFixed(1)}`);
  await s.waitForTimeout(800);
  await still();
  sp = await O('spiegel');
  w = await O('werk');
  g = await grenzen();
  let L = await linien();
  let naht = L.filter((l) => l.art === 'mitte' && l.kante === true);
  ok('danach: eine Form aus zwei Kugeln, verschmolzen, mit einer Naht in der Ebene', !sp.frei && sp.zustand === 'clip' && naht.length === 1 && Math.abs(g.hi[2] + g.lo[2]) < 0.01 && g.hi[2] > 200 && w.umgeschlagen === 0, `${L.map((l) => `${l.id} ${l.art}`).join(', ')}; Tiefe ±${z1(g.hi[2])}; umgeschlagen ${w.umgeschlagen}`);
  ok('die Naht ist gewählt; P geht wieder', naht.every((l) => ` ${w.auswahl} `.includes(` ${l.id}.-1 `)) && !(await s.getAttribute('#leiste button[title^="Zeichenstift"]', 'disabled')));
  await foto('10-verschmolzen');
  // ---------- ⌘Z trennt wieder ----------
  await s.keyboard.press('Meta+z');
  await still();
  sp = await O('spiegel');
  ok('⌘Z: wieder zwei, die sich überragen (frei, Spiegel an)', sp.frei && sp.zustand === 'an' && (await linien()).length === L0, `Knopf: ${sp.zustand}`);
  // ---------- wartendes Clipping: erst weg, Clipping ein, dann zurück ----------
  await s.keyboard.press('7');
  await s.waitForTimeout(1600);
  await schieben(160);
  await knopf('clip');
  await s.waitForTimeout(600);
  sp = await O('spiegel');
  ok('weit weg, Clipping ein: nichts geschieht, es wartet', sp.frei && sp.zustand === 'clip' && sp.fahrt === null && !(await O('werk')).ueberDerMitte);
  await schieben(-150);
  sp = await O('spiegel');
  w = await O('werk');
  L = await linien();
  naht = L.filter((l) => l.art === 'mitte' && l.kante === true);
  ok('zurückgeschoben: Beim Loslassen verschmilzt es von selbst, die Naht ist gewählt', !sp.frei && naht.length === 1 && naht.every((l) => ` ${w.auswahl} `.includes(` ${l.id}.-1 `)) && w.umgeschlagen === 0, `${L.map((l) => `${l.id} ${l.art}`).join(', ')}; umgeschlagen ${w.umgeschlagen}; ${w.meldung.slice(0, 50)}`);
  await s.keyboard.press('Meta+z');
  await still();
  ok('ein ⌘Z nimmt Schieben und Naht zusammen zurück', (await O('spiegel')).frei && Math.abs((await O('objekt')).mitte.z - 220) < 6, `Mitte z = ${z1((await O('objekt')).mitte.z)}`);
  await schieben(-150);
  // ---------- G, S, R an der verschmolzenen Form ----------
  await s.keyboard.press('1');
  await s.waitForTimeout(1600);
  await still();
  const gs = await grenzen();
  const m = await O('flaecheHin', 'seite', 0, 0);
  await s.mouse.move(m.x + 40, m.y, { steps: 3 });
  await s.waitForTimeout(300);
  await s.keyboard.press('s');
  await s.mouse.move(m.x + 60, m.y, { steps: 6 });
  await s.waitForTimeout(200);
  ok('S läuft: das Objekt folgt dem Zeiger', (await O('objekt')).zug === 's');
  await s.keyboard.press('Enter');
  await still();
  g = await grenzen();
  ok('S: anderthalbmal so groß, spiegelgleich', Math.abs((g.hi[0] - g.lo[0]) / (gs.hi[0] - gs.lo[0]) - 1.5) < 0.05 && Math.abs((g.hi[2] - g.lo[2]) / (gs.hi[2] - gs.lo[2]) - 1.5) < 0.05 && Math.abs(g.hi[2] + g.lo[2]) < 0.01 && !(await O('spiegel')).frei, `Breite ${z1(gs.hi[0] - gs.lo[0])} → ${z1(g.hi[0] - g.lo[0])}, Tiefe ${z1(gs.hi[2] - gs.lo[2])} → ${z1(g.hi[2] - g.lo[2])}`);
  ok('S: nichts umgeschlagen, Linien und Haut passen noch', (await O('werk')).umgeschlagen === 0 && (await O('standPruefen')).ohne === 0);
  await s.keyboard.press('Meta+z');
  await still();
  g = await grenzen();
  ok('⌘Z: wieder so groß wie vorher', Math.abs(g.hi[0] - gs.hi[0]) < 0.01 && Math.abs(g.hi[2] - gs.hi[2]) < 0.01);
  // R in der Seite dreht; im Top nicht (verschmolzen)
  await s.mouse.move(m.x + 60, m.y, { steps: 3 });
  await s.waitForTimeout(250);
  await s.keyboard.press('r');
  await s.mouse.move(m.x, m.y + 60, { steps: 6 });
  await s.waitForTimeout(200);
  await s.keyboard.press('Enter');
  await still();
  g = await grenzen();
  ok('R in der Seite: gedreht, spiegelgleich geblieben', Math.abs(g.hi[2] + g.lo[2]) < 0.01 && Math.abs(g.hi[2] - gs.hi[2]) < 0.01 && !(await O('spiegel')).frei && (await O('werk')).umgeschlagen === 0);
  await s.keyboard.press('7');
  await s.waitForTimeout(1600);
  const mt = await O('flaecheHin', 'top', 0, 0);
  await s.mouse.move(mt.x + 30, mt.y, { steps: 3 });
  await s.waitForTimeout(250);
  await s.keyboard.press('r');
  await s.waitForTimeout(150);
  ok('R im Top an der verschmolzenen Form: Meldung, kein Zug', (await O('objekt')).zug === null && (await O('werk')).meldung.includes('nur in der Seite'), (await O('werk')).meldung.slice(0, 60));
  // G quer zur Ebene: die verschmolzene Form bleibt in der Ebene
  await s.keyboard.press('g');
  await s.mouse.move(mt.x + 30, mt.y + 70, { steps: 6 });
  await s.waitForTimeout(200);
  await s.keyboard.press('Enter');
  await still();
  g = await grenzen();
  ok('G im Top quer zur Ebene: Die verschmolzene Form bleibt in der Spiegelebene', Math.abs(g.hi[2] + g.lo[2]) < 0.01 && !(await O('spiegel')).frei);
}

ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} Punkte FEHLEN` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
