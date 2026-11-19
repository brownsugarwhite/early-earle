// Gemeinsame Teile für Film und Bildblatt zum Paint-Modus, Etappe 5 (Ebenen): Florians Form „strange bird“ auf Wachs, von der Seite,
// in einem kleinen Fenster (760 × 560: Leiste, Form und der Stapel der Ebenen am rechten Rand stehen zusammen im Bild).
// Ebene 1 trägt den Verlauf (der Körper blau, ein heller Fleck mit weicher Kante), Ebene 2 die Punkte darüber.
import { chromium } from '@playwright/test';
import { GPU_ARGS } from '../pruefen/ozzy-teile.mjs';

export const FENSTER = { width: 760, height: 560 };
export const BLAU = [0x3f / 255, 0x7f / 255, 0xd0 / 255];
export const HELL = [0xfb / 255, 0xf6 / 255, 0xea / 255];
export const GELB = [0xf6 / 255, 0xc4 / 255, 0x45 / 255];
export const GRUEN = [0x3c / 255, 0x9d / 255, 0x7a / 255];
/** der helle Fleck auf Ebene 1 (Mitte und Halbmesser im Bild, CSS-Pixel) */
export const FLECK = { x: 330, y: 312, r: 40 };
/** die Punkte auf Ebene 2: über dem Fleck, über seinem Verlauf und daneben auf dem Blau */
export const PUNKTE = [
  [306, 296],
  [338, 328],
  [372, 298],
  [404, 330],
];
export const PUNKT_R = 9;

/** das Fenster öffnen (mit `film`: den Mitschnitt in diesen Ordner), die Form laden, den Blick setzen, den Paint-Modus einschalten */
export async function oeffnen({ film = null, fuellen = '0', dichte = 2 } = {}) {
  const browser = await chromium.launch({ args: GPU_ARGS });
  const kontext = await browser.newContext({ viewport: FENSTER, deviceScaleFactor: dichte, ...(film ? { recordVideo: { dir: film, size: FENSTER } } : {}) });
  const s = await kontext.newPage();
  const t0 = Date.now();
  const fehler = [];
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  await s.goto(`${process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html'}?form=${encodeURIComponent('strange bird')}&material=wachs&fuellen=${fuellen}`);
  await s.waitForFunction(() => !!window.__ozzy);
  const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
  await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
  await s.waitForTimeout(2500);
  await O('blickSetzen', { gier: -0.62, neigung: 0, zoom: 2.6 });
  await s.waitForTimeout(1200);
  await s.keyboard.press('b');
  await s.waitForTimeout(700);
  return { browser, kontext, s, O, t0, fehler };
}

/** die Handgriffe mit der Maus: klicken, ziehen (ein gezogener Punkt wird rund) */
export function maus(s, { ruhig = false } = {}) {
  const klick = async (x, y, schritte = ruhig ? 16 : 5, vor = ruhig ? 300 : 200) => {
    await s.mouse.move(x, y, { steps: schritte });
    await s.waitForTimeout(vor);
    await s.mouse.down();
    await s.waitForTimeout(60);
    await s.mouse.up();
    await s.waitForTimeout(ruhig ? 300 : 220);
  };
  const zieh = async (x, y, dx, dy, schritte = ruhig ? 12 : 5) => {
    await s.mouse.move(x, y, { steps: schritte });
    await s.waitForTimeout(ruhig ? 160 : 200);
    await s.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await s.mouse.move(x + (dx * i) / 6, y + (dy * i) / 6);
      await s.waitForTimeout(22);
    }
    await s.mouse.up();
    await s.waitForTimeout(ruhig ? 160 : 220);
  };
  /** ein runder Fleck mit P: vier gezogene Punkte, auf dem ersten geschlossen (P muss gewählt sein) */
  const fleck = async (x, y, r) => {
    for (let i = 0; i < 4; i++) {
      const w = (Math.PI / 2) * i - 0.4;
      await zieh(x + r * Math.cos(w), y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
    }
    await klick(x + r * Math.cos(-0.4), y + 1.15 * r * Math.sin(-0.4), ruhig ? 8 : 4, 220);
  };
  return { klick, zieh, fleck };
}

/** Ebene 1: der Körper blau, der Fleck hell, seine Kante rundum weich (`weit`: Pixel im Bild zu jeder Seite). Danach gilt A. */
export async function ebeneEins({ s, O }, weit = 13) {
  const { fleck } = maus(s);
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  for (const [x, y] of [[FLECK.x, FLECK.y], [FLECK.x + FLECK.r + 60, FLECK.y + 10], ...PUNKTE]) if (!(await O('farbOrtFrei', x, y))) throw new Error(`Vorbereitung: bei ${x}; ${y} liegt die Form nicht`);
  await fleck(FLECK.x, FLECK.y, FLECK.r);
  await s.waitForTimeout(400);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  const f = await O('farbe');
  if (f.linien !== 1) throw new Error(`Vorbereitung: ${f.linien} Farblinien (erwartet 1)`);
  await O('farbFuellen', FLECK.x + FLECK.r + 60, FLECK.y + 10, BLAU);
  await O('farbFuellen', FLECK.x, FLECK.y, HELL);
  // die Breite: so viele Einheiten, dass der Verlauf im Bild `weit` Pixel zu jeder Seite reicht
  await s.keyboard.press('Meta+a');
  await s.waitForTimeout(300);
  const je = (await O('farbWeichGriffe'))[0]?.jeEinheit ?? 1;
  await s.keyboard.press('Escape');
  await s.waitForTimeout(200);
  await O('farbBreite', 0, -1, weit / je);
  await s.waitForTimeout(300);
  return { je };
}

/** Ebene 2: die Punkte, gelb gefüllt (über dem Fleck, über seinem Verlauf und daneben auf dem Blau). Danach gilt A. */
export async function ebeneZwei({ s, O }) {
  const { fleck } = maus(s);
  const id = await O('farbEbene', 'neu');
  await s.waitForTimeout(300);
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  for (const [x, y] of PUNKTE) await fleck(x, y, PUNKT_R);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  for (const [x, y] of PUNKTE) await O('farbFuellen', x, y, GELB);
  await s.waitForTimeout(300);
  return id;
}

/** der Fleck auf Ebene 3 (Etappe 6): orange, mit weicher Kante; wo er liegt, wird ausprobiert (links neben dem hellen Fleck) */
export const WANGE = { r: 22, wo: [[240, 300], [228, 312], [250, 306], [470, 330], [452, 326]] };
export const ORANGE = [0xf0 / 255, 0x8a / 255, 0x3c / 255];
/**
 * Ebene 3: ein oranger Fleck mit weicher Kante (`weit`: Pixel im Bild zu jeder Seite). Er liegt an der ersten Stelle aus `WANGE.wo`,
 * an der er schließt (über eine Falte oder einen Überhang gezeichnet liefe die Füllung über die ganze Form: Dann steht das Orange
 * auch mitten im hellen Fleck, beides wird zurückgenommen und die nächste Stelle versucht). Danach gilt A. Zurück: die Kennung der
 * Ebene und die Stelle.
 */
export async function ebeneDrei({ s, O }, weit = 7) {
  const { fleck } = maus(s);
  const id = await O('farbEbene', 'neu');
  await s.waitForTimeout(300);
  const r = WANGE.r;
  let wo = null;
  for (const [x, y] of WANGE.wo) {
    await s.keyboard.press('p');
    await s.waitForTimeout(400);
    let frei = true;
    for (let i = 0; i < 12 && frei; i++) frei = await O('farbOrtFrei', x + 1.2 * r * Math.cos((Math.PI * i) / 6), y + 1.35 * r * Math.sin((Math.PI * i) / 6));
    if (frei) await fleck(x, y, r);
    await s.keyboard.press('a');
    await s.waitForTimeout(400);
    if (!frei) continue;
    const linien = (await O('farbe')).linien;
    if (linien === 1) {
      await O('farbFuellen', x, y, ORANGE);
      await s.waitForTimeout(250);
      // (was mitten im hellen Fleck zu sehen ist: Steht dort das Orange, ist die Füllung ausgelaufen)
      const ausgelaufen = String(await O('farbUnter', FLECK.x, FLECK.y)).toLowerCase() === '#f08a3c';
      if (!ausgelaufen) {
        wo = [x, y];
        break;
      }
      await s.keyboard.press('Meta+z');
      await s.waitForTimeout(350);
    }
    for (let i = 0; i < linien; i++) {
      await s.keyboard.press('Meta+z');
      await s.waitForTimeout(350);
    }
  }
  if (!wo) throw new Error('Vorbereitung: An keiner Stelle schließt der Fleck der dritten Ebene');
  await s.keyboard.press('Meta+a');
  await s.waitForTimeout(300);
  const je = (await O('farbWeichGriffe'))[0]?.jeEinheit ?? 1;
  await s.keyboard.press('Escape');
  await s.waitForTimeout(200);
  await O('farbBreite', 0, -1, weit / je);
  await s.waitForTimeout(300);
  return { id, wo };
}

/** die Mitte der Linse einer Ebene im Stapel, die ihres Punkts und die des Plus; dazu die Höhe einer Zeile (CSS-Pixel) */
export const imStapel = (s, id) =>
  s.evaluate((id) => {
    const mitte = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };
    const li = document.querySelector(`#ebenen li[data-id="${id}"]`);
    return { linse: mitte(li?.querySelector('.linse')), auge: mitte(li?.querySelector('.auge')), plus: mitte(document.querySelector('#ebenen .ebene.neu .linse')), hoch: li?.offsetHeight ?? 0 };
  }, id);

/** die Mitte eines Knopfs der Leiste (Anfang seines Namens) und die eines Farbtropfens darunter */
export const knopfBei = (s, anfang) =>
  s.evaluate((n) => {
    const r = [...document.querySelectorAll('#leiste button.werkzeug')].find((b) => b.title.startsWith(n)).getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }, anfang);
export const tropfenBei = (s, i) =>
  s.evaluate((i) => {
    const r = document.querySelectorAll('#farbleiste .reihe button.farbe')[i].getBoundingClientRect();
    return [r.left + r.width / 2, r.top + 10];
  }, i);
