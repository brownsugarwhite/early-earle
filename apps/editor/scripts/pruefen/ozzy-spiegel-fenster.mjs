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
//   P         an der freien Form lassen sich noch keine Linien zeichnen (Meldung, das Werkzeug bleibt)
//   ⌘Z        zurück bis zur verschmolzenen Form: Der Knopf steht wieder auf Clipping
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
if (NUR !== 'aus') {

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
if (NUR !== 'clip') {
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

  // P: an der freien Form noch nicht
  await s.keyboard.press('p');
  await s.waitForTimeout(200);
  ok('P an der freien Form: Meldung, das Werkzeug bleibt', (await O('objekt')).werkzeug === 'auswahl' && (await O('werk')).meldung.includes('freien Form'), (await O('werk')).meldung.slice(0, 70));

  // ⌘Z: der Zug, dann „aus“
  await s.keyboard.press('Meta+z');
  await ruhig();
  await s.keyboard.press('Meta+z');
  await ruhig();
  sp = await O('spiegel');
  L = await linien();
  ok('⌘Z ⌘Z: wieder die verschmolzene Form, der Knopf steht auf Clipping', !sp.frei && sp.zustand === 'clip' && L.length === K0.length && L.map((l) => l.art).join() === K0.map((l) => l.art).join(), `${L.map((l) => `${l.id} ${l.art}`).join(', ')}`);
}

ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} Punkte FEHLEN` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
