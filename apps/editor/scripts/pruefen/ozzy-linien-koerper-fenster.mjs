// Ozzy, S20 im Plan „wie es weitergeht“ (17.11.2026): Linienansichten wie in der Studie (weißer Körper mit Tiefe, Umriss als Hülle,
// Verdecktes je Bildpunkt), an Florians Form „teat firefish“ (NAME) von vorn wie in seinem Bild, vorher (`?koerper=0`) und nachher.
// Kriterien:
//   1  Eingerastete Front: Die Bögen hinter der Form sind weg (Tinte in der Form höchstens 85 % von vorher), dahinter wird mehr grün
//      (mindestens 1,3-mal so viel).
//   2  Kommt die Ansicht zur Ruhe, blendet der Körper weich ein (in höchstens 20 Bildern ganz, jedes Bild mehr).
//   3  Vier Ansichten: der Körper in den drei flachen Feldern (drei Ansichten), das Feld des Raums zeigt die Seifenhaut (dort keine Tinte
//      des Körpers: das Bild des Raums wie vorher).
//   4  Tempo: Rechnen je Bild mit und ohne Körper (Mittel aus 30 Bildern), höchstens 2 ms mehr.
//   5  Keine Fehler in der Konsole.
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
ok('1 Front: Bögen weg, mehr grün', zn.tinte <= 0.85 * zv.tinte && zn.gruen >= 1.3 * zv.gruen, `Tinte ${zv.tinte} → ${zn.tinte} (${z1((100 * zn.tinte) / zv.tinte)} %), Grün ${zv.gruen} → ${zn.gruen} (${z1(zn.gruen / Math.max(1, zv.gruen))}-fach)`);

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

// 3: Vier Ansichten
await sn.keyboard.press('Tab');
for (let i = 0; i < 90; i++) await sn.evaluate(() => window.__ozzy.bild(1 / 60));
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
