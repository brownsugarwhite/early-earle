// Plan „Objekte, Spiegel und Nähte“ (18.11.2026), Etappe 2, erster Teil: der Spiegel-Knopf mit den Zuständen „an mit Clipping“ und
// „an“ (Florian: „Ich kann mirrorhälften erst ohne clipping ineinanderschieben und dann clipping einschalten um sie zu verschmelzen.
// Gerne mit einer schönen animation“). An einer frischen Kugel mit drei Linien:
//   an        ohne Clipping: der Punkt an der Seite über die Mitte gezogen; losgelassen bleibt es dabei, die Hälften überragen sich
//             (keine Naht, die Anzeige schneidet nicht)
//   Clipping  eingeschaltet: Die Überschneidung zieht sich in die Ebene zurück (die Fahrt), dann steht die Naht und ist gewählt
//   ⌘Z        trennt wieder, der Knopf steht wieder auf „an“
//   noch einmal Clipping, K: der runde Donut
// Aufruf aus apps/editor: OZZY_URL=http://localhost:5211/ozzy.html node scripts/pruefen/ozzy-spiegel-fenster.mjs
//   BILD=<pfad ohne Endung>   FILM=<ziel.mp4> (die Fahrt, Bild für Bild)   MATERIAL=solid|zebra   TIEF=<hinter die Mitte> (Standard 60)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auf, kugelMitRingen, ueberDieMitteZiehen } from './ozzy-teile.mjs';

const BILD = process.env.BILD ?? '';
const FILM = process.env.FILM ?? '';
const TIEF = Number(process.env.TIEF ?? 60);
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const t = await auf({ dichte: 2, extra: 'ohneLinie=0' });
const { browser, s, O, ruhig, fehler } = t;
await kugelMitRingen(t);
if (process.env.MATERIAL) await O('material', process.env.MATERIAL);
const AUSSCHNITT = { x: 440, y: 250, width: 560, height: 420 };
const foto = async (name) => {
  if (BILD) await s.screenshot({ path: `${BILD}-${name}.png`, clip: AUSSCHNITT });
};
const linien = () => O('werkLinienDaten');
const knopf = async () => {
  await s.click('#spiegel-knopf');
  await s.waitForTimeout(60);
};

const L0 = await linien();
let sp = await O('spiegel');
ok('am Anfang: Spiegel an, mit Clipping', sp.zustand === 'clip' && sp.erlaubt && (await s.getAttribute('#spiegel-knopf', 'data-zustand')) === 'clip');

// ---------- an, ohne Clipping: über die Mitte ziehen, es bleibt dabei ----------
await knopf();
sp = await O('spiegel');
ok('Klick: Spiegel an, ohne Clipping', sp.zustand === 'an' && (await s.getAttribute('#spiegel-knopf', 'data-zustand')) === 'an');
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
  await O('spiegelWeiter');
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
  await knopf();
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
await knopf();
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

ok('keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} Punkte FEHLEN` : 'alles gut');
await browser.close();
process.exit(schlecht ? 1 : 0);
