// Ozzy, S20 im Plan „wie es weitergeht“ (17.11.2026): Linienansichten wie in der Studie (weißer Körper mit Tiefe, Umriss als Hülle,
// Verdecktes je Bildpunkt), an Florians Form „teat firefish“ (NAME) von vorn wie in seinem Bild, vorher (`?koerper=0`) und nachher.
// Kriterien:
//   1  Eingerastete Front: Die Bögen hinter der Form sind weg (Tinte in der Form höchstens 85 % von vorher), dahinter wird mehr grün
//      (mindestens 1,2-mal so viel; seit dem weichen Übergang verjüngt sich eine Linie knapp hinter der Haut erst, bevor sie grün ist,
//      darum etwas weniger als die 1,3 vom ersten Stand).
//   2  Kommt die Ansicht zur Ruhe, blendet der Körper weich ein (in höchstens 20 Bildern ganz, jedes Bild mehr).
//   3  Vier Ansichten: der Körper in den drei flachen Feldern (drei Ansichten), das Feld des Raums zeigt die Seifenhaut (dort keine Tinte
//      des Körpers: das Bild des Raums wie vorher).
//   4  Tempo: Rechnen je Bild mit und ohne Körper (Mittel aus 30 Bildern), höchstens 2 ms mehr.
//   5  Keine Fehler in der Konsole.
// Nachgeschärft (17.11., Florian: „Erst S20 nachschärfen“):
//   6  Keine kurzen Striche: an den beiden Stellen unter dem Kinn, wo die Hülle an flachen Knicken stückweise hervorschaute, keine Tinte.
//   7  Beim Aufklappen liegt der Körper schon auf den Wänden (drei Ansichten), seine Deckung wächst mit dem Stand; am Ende kein Sprung
//      (das Bild der Felder im letzten Bild der Fahrt und im ersten danach gleicht sich, höchstens 1 % der Bildpunkte anders).
//   8  Beim Einrasten wächst die Deckung mit der Fahrt (jedes Bild mehr) und ist mit ihrem Ende voll; kein Sprung danach.
// Aufruf aus apps/editor: GPU=1 [NAME=…] node scripts/pruefen/ozzy-linien-koerper-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';

const NAME = process.env.NAME ?? 'teat firefish';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const ordner = process.argv[2];
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const fehler = [];
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z1 = (x) => x.toFixed(1).replace('.', ',');
const zaehlen = (s, png, box) =>
  s.evaluate(
    async ([b64, B]) => {
      const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(bild.width, bild.height);
      const g = c.getContext('2d');
      g.drawImage(bild, 0, 0);
      const px = g.getImageData(B.x, B.y, B.w, B.h).data;
      let tinte = 0;
      let gruen = 0;
      for (let i = 0; i < px.length; i += 4) {
        const [r, gg, bb] = [px[i], px[i + 1], px[i + 2]];
        if (r + gg + bb < 300) tinte++;
        else if (gg > r + 6 && gg > bb + 2 && r + gg + bb < 700) gruen++;
      }
      return { tinte, gruen };
    },
    [png.toString('base64'), box],
  );
const seite = async (zusatz) => {
  const s = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  await s.goto(`${basis}?form=${encodeURIComponent(NAME)}${zusatz}`);
  await s.waitForFunction(() => !!window.__ozzy);
  await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt, null, { timeout: 90000 });
  await s.mouse.move(1190, 890);
  return s;
};
const O = (s, f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
const front = async (s) => {
  await s.keyboard.press('3');
  await s.waitForTimeout(1600);
  await s.mouse.move(600, 450);
  for (let i = 0; i < 8; i++) {
    await s.mouse.wheel(0, -120);
    await s.waitForTimeout(40);
  }
  await s.mouse.move(1190, 890);
  await s.waitForTimeout(900);
};
// 1: Front vorher und nachher
const box = { x: 760, y: 420, w: 900, h: 900 };
const sv = await seite('&koerper=0');
await front(sv);
const bv = await sv.screenshot();
const zv = await zaehlen(sv, bv, box);
// 4 (vorher): Rechnen je Bild ohne Körper
await sv.evaluate(() => window.__ozzy.film(true));
let msOhne = 0;
for (let i = 0; i < 30; i++) {
  await sv.evaluate(() => window.__ozzy.bild(1 / 60));
  msOhne += (await O(sv, 'koerper')).bildMs / 30;
}
await sv.keyboard.press('Tab');
await sv.evaluate(() => window.__ozzy.film(false));
await sv.waitForTimeout(1800);
const R = (await O(sv, 'felderJetzt')).raum;
const raumVorher = await zaehlen(sv, await sv.screenshot(), { x: Math.round(R.x * 2), y: Math.round(R.y * 2), w: Math.round(R.w * 2), h: Math.round(R.h * 2) });
await sv.close();
const sn = await seite('');
await front(sn);
const bn = await sn.screenshot();
const zn = await zaehlen(sn, bn, box);
if (ordner) {
  const fs = await import('node:fs');
  fs.writeFileSync(`${ordner}/front-vorher.png`, bv);
  fs.writeFileSync(`${ordner}/front-nachher.png`, bn);
}
ok('1 Front: Bögen weg, mehr grün', zn.tinte <= 0.85 * zv.tinte && zn.gruen >= 1.2 * zv.gruen, `Tinte ${zv.tinte} → ${zn.tinte} (${z1((100 * zn.tinte) / zv.tinte)} %), Grün ${zv.gruen} → ${zn.gruen} (${(zn.gruen / Math.max(1, zv.gruen)).toFixed(2).replace('.', ',')}-fach)`);
// 6: die Stellen der kurzen Striche (Gerätepunkte des Bilds, Fenster 1200 × 900, doppelte Dichte)
const s6a = await zaehlen(sn, bn, { x: 1128, y: 1036, w: 28, h: 16 });
const s6b = await zaehlen(sn, bn, { x: 1240, y: 1036, w: 32, h: 16 });
ok('6 keine kurzen Striche unter dem Kinn', s6a.tinte + s6b.tinte <= 2, `Tinte links ${s6a.tinte}, rechts ${s6b.tinte}`);

// 4 (nachher): Rechnen je Bild mit Körper
await sn.evaluate(() => window.__ozzy.film(true));
let msMit = 0;
for (let i = 0; i < 30; i++) {
  await sn.evaluate(() => window.__ozzy.bild(1 / 60));
  msMit += (await O(sn, 'koerper')).bildMs / 30;
}

// 2: weich einblenden: aus dem Raum in die Seite, Bild für Bild
await sn.keyboard.press('0');
for (let i = 0; i < 60; i++) await sn.evaluate(() => window.__ozzy.bild(1 / 60));
await sn.keyboard.press('1');
const verlauf = [];
for (let i = 0; i < 90; i++) {
  await sn.evaluate(() => window.__ozzy.bild(1 / 60));
  verlauf.push((await O(sn, 'koerper')).deckung);
}
const erst = verlauf.findIndex((d) => d > 0);
const voll = verlauf.findIndex((d) => d >= 1);
let steigt = true;
for (let i = Math.max(1, erst); i <= voll && i > 0; i++) if (verlauf[i] < verlauf[i - 1]) steigt = false;
ok('2 Körper blendet weich ein', erst > 0 && voll > erst && voll - erst <= 20 && steigt, `ab Bild ${erst}, ganz nach ${voll - erst} Bildern`);

// 8: Einrasten (der Verlauf von oben): mit der Fahrt, am Ende voll, danach kein Sprung
const fahrtEnde = verlauf.findIndex((d, i) => d >= 1 && i > 0);
ok('8 Einrasten: Körper mit der Fahrt', erst > 0 && steigt && fahrtEnde > 0 && verlauf.slice(fahrtEnde).every((d) => d >= 1), `ab Bild ${erst}, voll ab Bild ${fahrtEnde}`);

// 3 und 7: Vier Ansichten, Bild für Bild aufgeklappt
await sn.keyboard.press('0');
for (let i = 0; i < 60; i++) await sn.evaluate(() => window.__ozzy.bild(1 / 60));
await sn.keyboard.press('Tab');
const auf = [];
let letztesFahrtBild = null;
let erstesRuheBild = null;
for (let i = 0; i < 120; i++) {
  await sn.evaluate(() => window.__ozzy.bild(1 / 60));
  const b = await O(sn, 'blick');
  const k = await O(sn, 'koerper');
  auf.push({ vier: b.vier, deckung: k.deckung, ansichten: k.ansichten });
  if (b.vier > 0.5 && b.vier < 1) letztesFahrtBild = await sn.screenshot();
  if (b.vier >= 1 && !erstesRuheBild) {
    erstesRuheBild = await sn.screenshot();
    break;
  }
}
const mitte = auf.filter((a) => a.vier > 0.3 && a.vier < 0.95);
let waechst = true;
for (let i = 1; i < auf.length; i++) if (auf[i].vier > auf[i - 1].vier && auf[i].deckung < auf[i - 1].deckung - 1e-6) waechst = false;
let sprung7 = 1;
if (letztesFahrtBild && erstesRuheBild) {
  const F7 = await O(sn, 'felderJetzt');
  const rect = { x: Math.round(F7.seite.x * 2), y: Math.round(F7.seite.y * 2), w: Math.round(F7.seite.w * 2), h: Math.round(F7.seite.h * 2) };
  sprung7 = await sn.evaluate(
    async ([a, b, B]) => {
      const lesen = async (b64) => {
        const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const c = new OffscreenCanvas(bild.width, bild.height);
        const g = c.getContext('2d');
        g.drawImage(bild, 0, 0);
        return g.getImageData(B.x, B.y, B.w, B.h).data;
      };
      const A = await lesen(a);
      const C = await lesen(b);
      let n = 0;
      for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - C[i]) + Math.abs(A[i + 1] - C[i + 1]) + Math.abs(A[i + 2] - C[i + 2]) > 60) n++;
      return n / (A.length / 4);
    },
    [letztesFahrtBild.toString('base64'), erstesRuheBild.toString('base64'), rect],
  );
}
ok('7 Aufklappen: Körper auf den Wänden, kein Sprung am Ende', mitte.length > 0 && mitte.every((a) => a.ansichten === 3 && a.deckung > 0) && waechst && sprung7 <= 0.01, `${mitte.length} Bilder mittendrin mit Körper, Deckung wächst: ${waechst}, am Ende ${z1(100 * sprung7)} % der Seite anders`);
await sn.evaluate(() => window.__ozzy.film(false));
await sn.waitForTimeout(600);
const k3 = await O(sn, 'koerper');
const R3 = (await O(sn, 'felderJetzt')).raum;
const raumNachher = await zaehlen(sn, await sn.screenshot(), { x: Math.round(R3.x * 2), y: Math.round(R3.y * 2), w: Math.round(R3.w * 2), h: Math.round(R3.h * 2) });
ok('3 Vier Ansichten: drei Felder mit Körper, der Raum wie vorher', k3.an && k3.ansichten === 3 && Math.abs(raumNachher.tinte - raumVorher.tinte) <= 0.1 * Math.max(50, raumVorher.tinte), `${k3.ansichten} Ansichten, Tinte im Feld des Raums ${raumVorher.tinte} → ${raumNachher.tinte}`);
ok('4 Tempo: Rechnen je Bild', msMit - msOhne <= 2, `ohne Körper ${z1(msOhne)} ms, mit ${z1(msMit)} ms`);
ok('5 keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} nicht erfüllt` : 'alles gut');
await browser.close();
