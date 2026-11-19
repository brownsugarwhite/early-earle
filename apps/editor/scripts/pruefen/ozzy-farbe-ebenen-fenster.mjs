// Ozzy, Paint-Modus, Etappe 5 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 16): Ebenen. An einer frischen
// Kugel, ohne Einlaufen: unten eine Ebene ganz in Blau, darüber eine Ebene mit einem runden Fleck in Rot (aus Rot und Blau lässt sich
// der Anteil der zwei Farben an jedem Bildpunkt lesen, gleich wie hell das Wachs dort ist).
//   60  Eine leere oder ausgeblendete Ebene ändert keinen Bildpunkt, auf Wachs und auf hellem Solid.
//   61  Oben deckt unten: Im Fleck steht die Farbe der oberen Ebene rein, als läge nichts darunter (Wachs und helles Solid).
//   62  Ordnen: Liegt die Ebene mit dem Fleck unten, deckt die andere ihn zu; ⌘Z legt sie zurück.
//   63  Aus- und einblenden: ausgeblendet steht das Bild ohne die Ebene, eingeblendet wieder das mit ihr, Bildpunkt für Bildpunkt.
//   64  Muster über Verläufen: Eine weiche Kante der oberen Ebene läuft in die Farbe der unteren aus; an der Farblinie zur
//       Hälfte, so breit wie eingestellt (höchstens 1 Gerätepunkt oder 5 % daneben), gemischt wie innerhalb einer Ebene.
//   65  Gemalt wird auf der aktiven Ebene: P und Füllen kommen dort an, bedient werden nur ihre Farblinien.
//   66  ⌘Z nimmt Anlegen und Löschen zurück; Sichern und Laden halten Ebenen, Reihenfolge und was ausgeblendet ist.
//   67  Der Stapel am Rand mit echten Klicks: Plus legt an, Tippen wählt, der Punkt blendet aus und ein, Ziehen ordnet, auf dem
//       Mülleimer ist die Ebene gelöscht.
//   68  Tempo an „strange bird“ mit drei Ebenen: Ein Handgriff rechnet nur seine Ebene neu (höchstens 30 ms); beim Drehen kostet
//       die Bemalung je Bild im Median höchstens 1 ms, auf Wachs kein Bild über 16,7 ms.
//   69  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-ebenen-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auf, quantil } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const ablage = fileURLToPath(new URL('../../../../wesen/', import.meta.url));
const PROBE = 'ozzy-probe-ebenen';
const datei = `${ablage}${PROBE}.eewesen`;
if (fs.existsSync(datei)) fs.unlinkSync(datei);
const ROT = [1, 0, 0];
const BLAU = [0, 0, 1];
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
const fehlerAlle = [];

/** was eine Seite an Helfern braucht */
const helfer = (t) => {
  const { s, O } = t;
  const zieh = async (x, y, dx, dy, schritte = 6) => {
    await s.mouse.move(x, y, { steps: 5 });
    await s.waitForTimeout(250);
    await s.mouse.down();
    for (let i = 1; i <= schritte; i++) {
      await s.mouse.move(x + (dx * i) / schritte, y + (dy * i) / schritte);
      await s.waitForTimeout(22);
    }
    await s.mouse.up();
    await s.waitForTimeout(250);
  };
  /**
   * Ein Bild rechnen und an den Stellen (CSS-Pixel) den Anteil von Rot lesen (0 … 1; null: dort steht keine der zwei Farben).
   * Gemischt wird in Bildschirmwerten, dann erst hell und dunkel (auch zwischen zwei Ebenen: Sie werden erst gesammelt).
   */
  const rot = (punkte) =>
    s.evaluate((punkte) => {
      const o = window.__ozzy;
      o.film(true);
      o.bild(1 / 60);
      const haut = document.getElementById('haut');
      const c = new OffscreenCanvas(haut.width, haut.height);
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(haut, 0, 0);
      o.film(false);
      const k = haut.width / window.innerWidth;
      const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return punkte.map(([x, y]) => {
        const d = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
        const [R, G, B] = [lin(d[0] / 255), lin(d[1] / 255), lin(d[2] / 255)];
        const [r, b] = [Math.max(0, R - G), Math.max(0, B - G)];
        if (r + b < 0.004) return null;
        // (r : b = lin(t) : lin(1 − t))
        const q = r / (r + b);
        let [lo, hi] = [0, 1];
        for (let i = 0; i < 30; i++) {
          const m = (lo + hi) / 2;
          if (lin(m) / (lin(m) + lin(1 - m)) < q) lo = m;
          else hi = m;
        }
        return (lo + hi) / 2;
      });
    }, punkte);
  /** der Ausschnitt um die Kugel, wie er auf dem Schirm steht (samt hellem Solid, das auf eigener Fläche liegt) */
  const AUS = { x: 520, y: 250, width: 400, height: 400 };
  const bilder = {};
  const schirm = async (name) => {
    await s.mouse.move(1380, 80);
    await s.waitForTimeout(350);
    bilder[name] = (await s.screenshot({ clip: AUS })).toString('base64');
    if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-ebenen-${name}.png`, Buffer.from(bilder[name], 'base64'));
  };
  /**
   * Zwei gemerkte Bilder vergleichen: der größte Unterschied eines Kanals (0 … 255) und wie viele Bildpunkte sich um mehr als 2
   * unterscheiden. `kreis`: nur in diesem Kreis (CSS-Pixel der Seite: Mitte und Halbmesser).
   */
  const unterschied = (a, b, kreis = null) =>
    s.evaluate(
      async ({ a, b, kreis, aus }) => {
        const lade = async (d) => createImageBitmap(await (await fetch(`data:image/png;base64,${d}`)).blob());
        const [A, B] = await Promise.all([lade(a), lade(b)]);
        const c = new OffscreenCanvas(A.width, A.height);
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(A, 0, 0);
        const p = g.getImageData(0, 0, A.width, A.height).data;
        g.clearRect(0, 0, A.width, A.height);
        g.drawImage(B, 0, 0);
        const q = g.getImageData(0, 0, A.width, A.height).data;
        const k = A.width / aus.width;
        let groesst = 0;
        let zahl = 0;
        let geprueft = 0;
        for (let y = 0; y < A.height; y++)
          for (let x = 0; x < A.width; x++) {
            if (kreis && Math.hypot(x / k + aus.x - kreis[0], y / k + aus.y - kreis[1]) > kreis[2]) continue;
            geprueft++;
            const i = 4 * (y * A.width + x);
            const d = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]), Math.abs(p[i + 3] - q[i + 3]));
            if (d > groesst) groesst = d;
            if (d > 2) zahl++;
          }
        return { groesst, zahl, geprueft };
      },
      { a: bilder[a], b: bilder[b], kreis, aus: AUS },
    );
  /** die mittlere Farbe eines gemerkten Bilds in einem Kreis (CSS-Pixel der Seite) */
  const farbeIm = (a, kreis) =>
    s.evaluate(
      async ({ a, kreis, aus }) => {
        const A = await createImageBitmap(await (await fetch(`data:image/png;base64,${a}`)).blob());
        const c = new OffscreenCanvas(A.width, A.height);
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(A, 0, 0);
        const p = g.getImageData(0, 0, A.width, A.height).data;
        const k = A.width / aus.width;
        const summe = [0, 0, 0];
        let n = 0;
        for (let y = 0; y < A.height; y++)
          for (let x = 0; x < A.width; x++) {
            if (Math.hypot(x / k + aus.x - kreis[0], y / k + aus.y - kreis[1]) > kreis[2]) continue;
            const i = 4 * (y * A.width + x);
            for (let j = 0; j < 3; j++) summe[j] += p[i + j];
            n++;
          }
        return summe.map((v) => Math.round(v / Math.max(1, n)));
      },
      { a: bilder[a], kreis, aus: AUS },
    );
  /** die Ebenen von oben nach unten */
  const ebenen = async () => (await O('farbEbenen')).ebenen;
  /** die Mitte der Linse einer Ebene im Stapel, die ihres Punkts und die des Plus (CSS-Pixel) */
  const imStapel = (id) =>
    s.evaluate((id) => {
      const mitte = (e) => {
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      };
      const li = document.querySelector(`#ebenen li[data-id="${id}"]`);
      return { linse: mitte(li?.querySelector('.linse')), auge: mitte(li?.querySelector('.auge')), plus: mitte(document.querySelector('#ebenen .ebene.neu .linse')), hoch: li?.offsetHeight ?? 0 };
    }, id);
  /**
   * Quer über die Farblinie an der Stelle (x, y) längs (ux, uy), nach außen positiv: wo der Anteil von Rot 75 %, 50 % und 25 % ist
   * (Pixel längs der Richtung). Innen liegt Rot.
   */
  const quer = async (x, y, ux, uy, weit, schritt = 0.25) => {
    const S = [];
    for (let a = -weit; a <= weit; a += schritt) S.push(a);
    const T = await rot(S.map((a) => [x + ux * a, y + uy * a]));
    const bei = (ziel) => {
      for (let i = 0; i + 1 < S.length; i++) {
        const [p, q] = [T[i], T[i + 1]];
        if (p === null || q === null) continue;
        if (p >= ziel && q < ziel) return S[i] + ((p - ziel) / Math.max(1e-9, p - q)) * schritt;
      }
      return NaN;
    };
    const [s75, s50, s25] = [bei(0.75), bei(0.5), bei(0.25)];
    // (die Breite des Verlaufs, zu jeder Seite: Zwischen 75 % und 25 % liegen 0,6946 davon)
    return { s75, s50, s25, halb: (s25 - s75) / 0.6946 };
  };
  return { zieh, rot, schirm, unterschied, farbeIm, ebenen, imStapel, quer };
};

// =====================================================================================================================
// an der Kugel
// =====================================================================================================================
{
  const t = await auf({ dichte: 1, extra: 'ohneLinie=0&material=wachs&fuellen=0' });
  const { s, O, geladen, klick, ziehen, fehler } = t;
  const { zieh, rot, schirm, unterschied, farbeIm, ebenen, imStapel, quer } = helfer(t);
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
  await s.waitForTimeout(800);
  // von vorn auf die Kugel (die Seite ohne Naht), der Fleck in der Mitte des Bilds
  await O('blickSetzen', { gier: 0, neigung: 0, zoom: 1 });
  await s.waitForTimeout(800);
  await s.keyboard.press('b');
  await s.waitForTimeout(500);
  const M = [700, 440];
  const r = 52;
  /** ein Bild ohne Farblinien: auf Wachs und auf hellem Solid, außerhalb des Paint-Modus; danach steht wieder Wachs */
  const beide = async (name) => {
    const malt = await O('malen');
    if (malt) await O('malen', false);
    await O('material', 'Wachs');
    await s.waitForTimeout(250);
    await schirm(`${name}-wachs`);
    await O('material', 'Helles Solid');
    await s.waitForTimeout(600);
    await schirm(`${name}-hell`);
    const anzeige = (await O('farbEbenen')).anzeige;
    await O('material', 'Wachs');
    await s.waitForTimeout(250);
    if (malt) await O('malen', true);
    await s.waitForTimeout(250);
    return anzeige;
  };
  // ---------- die untere Ebene: alles blau ----------
  await O('farbFuellen', M[0], M[1], BLAU);
  await s.waitForTimeout(300);
  const unten = (await ebenen())[0].id;
  await beide('eins');
  await beide('eins2');
  const still = [await unterschied('eins-wachs', 'eins2-wachs'), await unterschied('eins-hell', 'eins2-hell')];
  // ---------- eine zweite Ebene mit dem Plus des Stapels; noch leer ----------
  const vorPlus = await ebenen();
  const stapelDa = (await O('farbEbenen')).zu_sehen;
  await klick(...(await imStapel(unten)).plus);
  await s.waitForTimeout(400);
  const nachPlus = await ebenen();
  const oben = nachPlus[0].id;
  await beide('leer');
  const leer = [await unterschied('eins-wachs', 'leer-wachs'), await unterschied('eins-hell', 'leer-hell')];
  // ---------- auf der oberen Ebene: ein runder Fleck (vier gezogene Punkte, auf dem ersten geschlossen), rot gefüllt ----------
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    await zieh(M[0] + r * Math.cos(w), M[1] + r * Math.sin(w), -0.55 * r * Math.sin(w), 0.55 * r * Math.cos(w));
  }
  await klick(M[0] + r * Math.cos(-0.4), M[1] + r * Math.sin(-0.4));
  await s.waitForTimeout(400);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  await O('farbFuellen', M[0], M[1], ROT);
  await s.waitForTimeout(300);
  const E0 = await ebenen();
  if (E0.length !== 2 || E0[0].id !== oben || !E0[0].aktiv || (await O('farbe')).linien !== 1) throw new Error(`Vorbereitung: ${JSON.stringify(E0)}`);
  const beideDa = await beide('zwei');

  // ---------- 63 und 60: aus- und einblenden ----------
  await O('farbEbene', 'zeigen', oben, false);
  await beide('aus');
  await O('farbEbene', 'zeigen', oben, true);
  await beide('wieder');
  const aus = [await unterschied('eins-wachs', 'aus-wachs'), await unterschied('eins-hell', 'aus-hell')];
  const wieder = [await unterschied('zwei-wachs', 'wieder-wachs'), await unterschied('zwei-hell', 'wieder-hell')];
  const anders = [await unterschied('eins-wachs', 'zwei-wachs'), await unterschied('eins-hell', 'zwei-hell')];
  ok(
    '60 Eine leere oder ausgeblendete Ebene ändert keinen Bildpunkt, auf Wachs und auf hellem Solid',
    still.every((u) => u.groesst === 0) && leer.every((u) => u.groesst === 0) && aus.every((u) => u.groesst === 0) && vorPlus.length === 1 && nachPlus.length === 2 && nachPlus[0].aktiv && nachPlus[0].leer && stapelDa,
    `dasselbe Bild zweimal: ${still.map((u) => u.groesst).join(' und ')} von 255; mit einer leeren Ebene darüber: ${leer.map((u) => u.groesst).join(' und ')}; mit dem Fleck auf der oberen Ebene, sie ausgeblendet: ${aus.map((u) => u.groesst).join(' und ')} (Wachs und helles Solid)`,
  );
  ok(
    '63 Aus- und einblenden: ausgeblendet steht das Bild ohne die Ebene, eingeblendet wieder das mit ihr, Bildpunkt für Bildpunkt',
    aus.every((u) => u.groesst === 0) && wieder.every((u) => u.groesst === 0) && anders.every((u) => u.zahl > 2000),
    `ausgeblendet gegen das Bild ohne sie: ${aus.map((u) => u.groesst).join(' und ')} von 255; wieder eingeblendet gegen das Bild mit ihr: ${wieder.map((u) => u.groesst).join(' und ')}; mit und ohne unterscheiden sich in ${anders.map((u) => u.zahl).join(' und ')} Bildpunkten (Wachs und helles Solid)`,
  );

  // ---------- 61: oben deckt unten ----------
  {
    // die untere Ebene ausgeblendet: der Fleck allein. Im Inneren des Flecks muss dasselbe stehen wie mit der unteren Ebene
    await O('farbEbene', 'zeigen', unten, false);
    const allein = await beide('allein');
    await O('farbEbene', 'zeigen', unten, true);
    await s.waitForTimeout(250);
    const innen = [M[0], M[1], r - 9];
    const u = [await unterschied('zwei-wachs', 'allein-wachs', innen), await unterschied('zwei-hell', 'allein-hell', innen)];
    const [mitte, daneben] = await rot([M, [M[0] + r + 30, M[1]]]);
    const hellMitte = await farbeIm('zwei-hell', [M[0], M[1], 12]);
    const hellDaneben = await farbeIm('zwei-hell', [M[0] + r + 30, M[1], 8]);
    ok(
      '61 Oben deckt unten: Im Fleck steht die Farbe der oberen Ebene rein, als läge nichts darunter (Wachs und helles Solid)',
      mitte !== null && mitte > 0.995 && daneben !== null && daneben < 0.005 && u[0].groesst <= 2 && u[1].groesst <= 2 && u[0].geprueft > 3000 && beideDa.ebenen === 2 && beideDa.gesammelt && allein.ebenen === 1 && !allein.gesammelt && hellMitte[0] > 150 && hellMitte[2] < 40 && hellDaneben[2] > 150 && hellDaneben[0] < 40,
      `auf Wachs: im Fleck ${z2(100 * mitte)} % Rot, daneben ${z2(100 * daneben)} %; im Fleck mit und ohne die untere Ebene: Wachs ${u[0].groesst} von 255, helles Solid ${u[1].groesst} von 255 (${u[0].geprueft} Bildpunkte); helles Solid: im Fleck steht ${hellMitte.join(', ')}, daneben ${hellDaneben.join(', ')}; gesammelt wird nur mit zwei Ebenen (${beideDa.gesammelt}, allein ${allein.gesammelt})`,
    );
  }

  // ---------- 62: ordnen ----------
  {
    const vorher = (await ebenen()).map((e) => e.id);
    const gelegt = await O('farbEbene', 'ordnen', oben, 1);
    await s.waitForTimeout(300);
    const nachher = (await ebenen()).map((e) => e.id);
    await beide('unten');
    const zu = [await unterschied('eins-wachs', 'unten-wachs'), await unterschied('eins-hell', 'unten-hell')];
    const [mitte] = await rot([M]);
    // (der Fleck ist weiter aktiv und zu bedienen, auch wenn er zugedeckt ist)
    const aktiv = (await ebenen()).find((e) => e.aktiv)?.id;
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(500);
    const zurueck = (await ebenen()).map((e) => e.id);
    await beide('zurueck');
    const wie = [await unterschied('zwei-wachs', 'zurueck-wachs'), await unterschied('zwei-hell', 'zurueck-hell')];
    ok(
      '62 Ordnen: Liegt die Ebene mit dem Fleck unten, deckt die andere ihn zu; ⌘Z legt sie zurück',
      gelegt === true && vorher.join() === `${oben},${unten}` && nachher.join() === `${unten},${oben}` && zu[0].groesst <= 2 && zu[1].groesst <= 2 && mitte !== null && mitte < 0.005 && aktiv === oben && zurueck.join() === vorher.join() && wie.every((u) => u.groesst === 0),
      `von oben nach unten: ${vorher.join(', ')} → ${nachher.join(', ')}; das Bild gegen „nur die blaue Ebene“: Wachs ${zu[0].groesst} von 255, helles Solid ${zu[1].groesst} von 255; im Fleck ${z2(100 * (mitte ?? NaN))} % Rot; ⌘Z: ${zurueck.join(', ')}, das Bild gegen vorher ${wie.map((u) => u.groesst).join(' und ')}`,
    );
  }

  // ---------- 64: Muster über Verläufen ----------
  {
    await s.keyboard.press('Meta+a');
    await s.waitForTimeout(300);
    const G = await O('farbWeichGriffe');
    await s.keyboard.press('Escape');
    await s.waitForTimeout(250);
    const je = G[0]?.jeEinheit ?? NaN;
    const W = 20;
    await O('farbBreite', 0, -1, W);
    await s.waitForTimeout(300);
    const L = await O('farbLinieImBild', 0);
    const n = L.length;
    const [a, b, p] = [L[n - 4], L[4], L[0]];
    const stueck = Math.hypot(b.x - a.x, b.y - a.y);
    let [ux, uy] = [(b.y - a.y) / stueck, -(b.x - a.x) / stueck];
    if ((p.x - M[0]) * ux + (p.y - M[1]) * uy < 0) [ux, uy] = [-ux, -uy];
    await s.mouse.move(1380, 80);
    const q = await quer(p.x, p.y, ux, uy, 1.3 * W * je);
    const soll = W * je;
    const daneben = Math.abs(q.halb - soll);
    // weit innen rein rot, weit außen rein blau
    const [innen, aussen] = await rot([
      [p.x - ux * 1.2 * soll, p.y - uy * 1.2 * soll],
      [p.x + ux * 1.2 * soll, p.y + uy * 1.2 * soll],
    ]);
    if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-ebenen-64.png`, await s.screenshot({ clip: { x: 520, y: 250, width: 400, height: 400 } }));
    await O('farbBreite', 0, -1, 0);
    await s.waitForTimeout(300);
    ok(
      '64 Muster über Verläufen: Eine weiche Kante der oberen Ebene läuft in die Farbe der unteren aus; an der Farblinie zur Hälfte, so breit wie eingestellt',
      G.length >= 4 && Number.isFinite(q.halb) && (daneben <= 1 || daneben <= 0.05 * soll) && Math.abs(q.s50) <= 1 && innen > 0.995 && aussen < 0.005,
      `eingestellt ${z2(soll)} Pixel zu jeder Seite, gemessen ${z2(q.halb)} (${z2(daneben)} daneben); die Mitte liegt ${z2(q.s50)} Pixel neben der Farblinie; im Abstand von 1,2 Breiten: innen ${z2(100 * innen)} % Rot, außen ${z2(100 * aussen)} %`,
    );
  }

  // ---------- 65: gemalt wird auf der aktiven Ebene ----------
  {
    const netzOben = (await O('farbNetz')).length;
    // die untere Ebene im Stapel antippen: Dort wird jetzt gemalt, die Farblinie des Flecks ist nicht mehr zu greifen
    await klick(...(await imStapel(unten)).linse);
    await s.waitForTimeout(400);
    const E1 = await ebenen();
    const netzUnten = (await O('farbNetz')).length;
    // ein kleines Dreieck mit P, links unten auf der Kugel, und gefüllt
    await s.keyboard.press('p');
    await s.waitForTimeout(400);
    const D = [
      [640, 520],
      [680, 530],
      [655, 555],
    ];
    for (const d of D) await klick(d[0], d[1]);
    await klick(D[0][0], D[0][1]);
    await s.waitForTimeout(400);
    await s.keyboard.press('a');
    await s.waitForTimeout(400);
    await O('farbFuellen', 658, 534, ROT);
    await s.waitForTimeout(300);
    const A = (await O('farbe')).ebenen;
    const netzDanach = (await O('farbNetz')).length;
    const [imDreieck] = await rot([[658, 534]]);
    // (beides zurück: die Füllung und die Farblinie)
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(400);
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(400);
    const B = (await O('farbe')).ebenen;
    await klick(...(await imStapel(oben)).linse);
    await s.waitForTimeout(400);
    const E2 = await ebenen();
    const zeile = (e) => `${e.name}: ${e.linien} Farblinien, ${e.fuellungen} Füllungen`;
    ok(
      '65 Gemalt wird auf der aktiven Ebene: P und Füllen kommen dort an, bedient werden nur ihre Farblinien',
      netzOben >= 1 && E1.find((e) => e.aktiv)?.id === unten && netzUnten === 0 && netzDanach >= 1 && A[0].linien === 1 && A[0].fuellungen === 2 && A[1].linien === 1 && A[1].fuellungen === 1 && imDreieck > 0.995 && B[0].linien === 0 && B[0].fuellungen === 1 && E2.find((e) => e.aktiv)?.id === oben,
      `Farblinien zu greifen: an der oberen ${netzOben}, an der unteren ${netzUnten}, nach dem Zeichnen dort ${netzDanach}; nach P und Füllen an der unteren: ${A.map(zeile).join(' · ')}; im Dreieck ${z2(100 * (imDreieck ?? NaN))} % Rot; nach zweimal ⌘Z: ${B.map(zeile).join(' · ')}`,
    );
  }

  // ---------- 67: der Stapel mit echten Klicks ----------
  {
    // der Punkt blendet aus und ein
    const S0 = await imStapel(oben);
    await klick(...S0.auge);
    await s.waitForTimeout(350);
    const ausgeblendet = (await ebenen()).find((e) => e.id === oben)?.aus;
    const [ohne] = await rot([M]);
    await klick(...(await imStapel(oben)).auge);
    await s.waitForTimeout(350);
    const eingeblendet = !(await ebenen()).find((e) => e.id === oben)?.aus;
    // ziehen ordnet: die obere Linse eine Zeile tiefer, dann wieder hinauf
    const S1 = await imStapel(oben);
    await ziehen(S1.linse[0], S1.linse[1], S1.linse[0], S1.linse[1] + S1.hoch, { schritte: 10, takt: 30 });
    await s.waitForTimeout(450);
    const tiefer = (await O('farbEbenen')).ebenen.map((e) => e.id);
    const stapelTiefer = (await O('farbEbenen')).stapel;
    const [zugedeckt] = await rot([M]);
    const S2 = await imStapel(oben);
    await ziehen(S2.linse[0], S2.linse[1], S2.linse[0], S2.linse[1] - S2.hoch, { schritte: 10, takt: 30 });
    await s.waitForTimeout(450);
    const hoeher = (await ebenen()).map((e) => e.id);
    // (ein Zug ist ein Schritt: einmal ⌘Z legt sie wieder nach unten, dann von Hand wieder hinauf)
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(400);
    const nachZ = (await ebenen()).map((e) => e.id);
    const S3 = await imStapel(oben);
    await ziehen(S3.linse[0], S3.linse[1], S3.linse[0], S3.linse[1] - S3.hoch, { schritte: 10, takt: 30 });
    await s.waitForTimeout(450);
    // Plus legt an; die neue Ebene auf den Mülleimer gezogen: gelöscht
    await klick(...(await imStapel(oben)).plus);
    await s.waitForTimeout(400);
    const drei = await ebenen();
    const neu = drei[0].id;
    const muell = await s.evaluate(() => {
      const q = [...document.querySelectorAll('#leiste button.werkzeug')].find((b) => b.title.startsWith('Mülleimer')).getBoundingClientRect();
      return [q.left + q.width / 2, q.top + q.height / 2];
    });
    const S4 = await imStapel(neu);
    await ziehen(S4.linse[0], S4.linse[1], muell[0], muell[1], { schritte: 24, takt: 20 });
    await s.waitForTimeout(450);
    const zwei = await ebenen();
    // eine Linse neben den Mülleimer gezogen: Sie kehrt zurück, nichts ist gelöscht
    const S5 = await imStapel(oben);
    await ziehen(S5.linse[0], S5.linse[1], S5.linse[0] - 300, S5.linse[1] + 10, { schritte: 16, takt: 20 });
    await s.waitForTimeout(450);
    const geblieben = await ebenen();
    if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-ebenen-67.png`, await s.screenshot());
    ok(
      '67 Der Stapel am Rand mit echten Klicks: Plus legt an, Tippen wählt, der Punkt blendet aus und ein, Ziehen ordnet, auf dem Mülleimer ist die Ebene gelöscht',
      ausgeblendet === true && ohne !== null && ohne < 0.005 && eingeblendet && tiefer.join() === `${unten},${oben}` && stapelTiefer.join() === tiefer.join() && zugedeckt !== null && zugedeckt < 0.005 && hoeher.join() === `${oben},${unten}` && nachZ.join() === `${unten},${oben}` && drei.length === 3 && drei[0].aktiv && zwei.length === 2 && zwei.map((e) => e.id).join() === `${oben},${unten}` && geblieben.length === 2,
      `Punkt: ausgeblendet ${ausgeblendet} (im Fleck ${z2(100 * (ohne ?? NaN))} % Rot), wieder eingeblendet ${eingeblendet}; eine Zeile tiefer gezogen: ${tiefer.join(', ')} (im Fleck ${z2(100 * (zugedeckt ?? NaN))} % Rot), wieder hinauf: ${hoeher.join(', ')}, ⌘Z: ${nachZ.join(', ')}; Plus: ${drei.length} Ebenen, die neue aktiv ${drei[0].aktiv}; auf den Mülleimer: ${zwei.length} Ebenen; neben den Mülleimer: ${geblieben.length}`,
    );
  }

  // ---------- 66: ⌘Z, Sichern, Laden ----------
  {
    const E0b = await ebenen();
    await O('farbEbene', 'neu');
    await s.waitForTimeout(300);
    const mitDrei = (await ebenen()).length;
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(400);
    const ohneDrei = (await ebenen()).length;
    await O('farbEbene', 'loeschen', oben);
    await s.waitForTimeout(300);
    const geloescht = (await O('farbe')).ebenen;
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(400);
    const zurueck = (await O('farbe')).ebenen;
    // sichern: die Ebene mit dem Fleck nach unten gelegt, die blaue ausgeblendet, an der blauen wird gemalt
    await O('farbEbene', 'ordnen', oben, 1);
    await O('farbEbene', 'zeigen', unten, false);
    await O('farbEbene', 'waehlen', unten);
    await s.waitForTimeout(300);
    const vor = (await O('farbe')).ebenen;
    const text = await O('sichern', PROBE);
    const gesichert = fs.existsSync(datei);
    await O('laden', PROBE);
    await geladen();
    await s.waitForTimeout(2500);
    await O('material', 'Wachs');
    await O('blickSetzen', { gier: 0, neigung: 0, zoom: 1 });
    await O('malen', true);
    await s.waitForTimeout(1200);
    const nach = (await O('farbe')).ebenen;
    const [mitte] = await rot([M]);
    const kurz = (E) => E.map((e) => `${e.name}${e.aktiv ? ' (aktiv)' : ''}${e.aus ? ' (aus)' : ''}: ${e.linien}/${e.fuellungen}`).join(' · ');
    ok(
      '66 ⌘Z nimmt Anlegen und Löschen zurück; Sichern und Laden halten Ebenen, Reihenfolge und was ausgeblendet ist',
      E0b.length === 2 && mitDrei === 3 && ohneDrei === 2 && geloescht.length === 1 && zurueck.length === 2 && zurueck[1].linien === 1 && zurueck[1].fuellungen === 1 && gesichert && JSON.stringify(nach) === JSON.stringify(vor) && nach[0].linien === 1 && nach[1].aus && nach[1].aktiv && mitte !== null && mitte > 0.995,
      `Plus: ${mitDrei} Ebenen, ⌘Z: ${ohneDrei}; gelöscht: ${geloescht.length}, ⌘Z: ${kurz(zurueck)}; ${String(text).slice(0, 40)} · von unten nach oben vorher ${kurz(vor)}, geladen ${kurz(nach)}; im Fleck ${z2(100 * (mitte ?? NaN))} % Rot`,
    );
    if (fs.existsSync(datei)) fs.unlinkSync(datei);
  }
  fehlerAlle.push(...fehler);
  await t.browser.close();
}

// =====================================================================================================================
// 68: Tempo an „strange bird“ mit drei Ebenen
// =====================================================================================================================
{
  const t = await auf({ form: 'strange bird', dichte: 2, extra: 'material=wachs&fuellen=0' });
  const { s, O, geladen, klick, fehler } = t;
  const { zieh, ebenen } = helfer(t);
  await geladen();
  await O('blickSetzen', { gier: -0.62, neigung: 0, zoom: 4 });
  await s.waitForTimeout(1500);
  await s.keyboard.press('b');
  await s.waitForTimeout(700);
  /** ein runder Fleck mit P (vier gezogene Punkte, auf dem ersten geschlossen) */
  const fleck = async (x, y, r) => {
    await s.keyboard.press('p');
    await s.waitForTimeout(400);
    for (let i = 0; i < 4; i++) {
      const w = (Math.PI / 2) * i - 0.4;
      await zieh(x + r * Math.cos(w), y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
    }
    await klick(x + r * Math.cos(-0.4), y + 1.15 * r * Math.sin(-0.4));
    await s.waitForTimeout(400);
    await s.keyboard.press('a');
    await s.waitForTimeout(400);
  };
  // Ebene 1: der Körper blau, ein großer Fleck hell, rundum weich
  const q = { x: 530, y: 510 };
  await fleck(q.x, q.y, 64);
  await O('farbFuellen', q.x + 1.9 * 64, q.y + 0.3 * 64, BLAU);
  await O('farbFuellen', q.x, q.y, [0.98, 0.96, 0.92]);
  await O('farbBreite', 0, -1, 30);
  // Ebene 2: drei Punkte im Fleck
  await O('farbEbene', 'neu');
  await s.waitForTimeout(300);
  for (const [dx, dy] of [
    [-24, -18],
    [22, -6],
    [-6, 26],
  ]) {
    await fleck(q.x + dx, q.y + dy, 9);
    await O('farbFuellen', q.x + dx, q.y + dy, ROT);
  }
  // Ebene 3: ein Fleck daneben, rundum weich
  await O('farbEbene', 'neu');
  await s.waitForTimeout(300);
  await fleck(q.x + 150, q.y - 20, 30);
  await O('farbFuellen', q.x + 150, q.y - 20, [0.96, 0.77, 0.27]);
  await O('farbBreite', 0, -1, 12);
  await s.waitForTimeout(500);
  const E = (await O('farbe')).ebenen;
  // ein Punkt der obersten Ebene gewählt, sein Tropfen in zwölf Schritten gezogen: Jeder Schritt rechnet nur diese Ebene neu
  const P = (await O('farbPunkte', 0)).punkte[0];
  await klick(P.x, P.y);
  await s.waitForTimeout(300);
  const g = (await O('farbWeichGriffe'))[0];
  const lang = Math.hypot(g.gx - g.x, g.gy - g.y);
  const [ux, uy] = [(g.gx - g.x) / lang, (g.gy - g.y) / lang];
  await s.mouse.move(g.gx + ux * 4, g.gy + uy * 4, { steps: 4 });
  await s.waitForTimeout(250);
  await s.mouse.down();
  const kosten = [];
  const neuGerechnet = [];
  for (let i = 1; i <= 12; i++) {
    await s.mouse.move(g.gx + ux * (4 + 3 * i), g.gy + uy * (4 + 3 * i));
    await s.waitForTimeout(40);
    kosten.push((await O('farbWeich')).ableitenMs);
    neuGerechnet.push((await O('farbEbenen')).abgeleitet);
  }
  await s.mouse.up();
  await s.waitForTimeout(300);
  await s.keyboard.press('Escape');
  await s.waitForTimeout(200);
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-ebenen-68.png`, await s.screenshot());
  /** die Form drehen und messen: was ein Bild kostet und was davon die Bemalung */
  const drehen = async () => {
    await O('farbKosten', true);
    await O('messen', true);
    await s.mouse.move(1300, 800, { steps: 4 });
    await s.waitForTimeout(300);
    await s.mouse.down();
    for (let i = 1; i <= 60; i++) {
      await s.mouse.move(1300 - 2 * i, 800);
      await s.waitForTimeout(16);
    }
    await s.mouse.up();
    await s.waitForTimeout(900);
    const bilder = (await O('messen', false)).filter((b) => b.abstand > 0);
    const kb = await O('farbKosten', true);
    return { kb, bildMs: bilder.map((b) => b.ms), zahl: bilder.length };
  };
  await O('malen', false);
  await s.waitForTimeout(300);
  const wachs = await drehen();
  const aufWachs = (await O('farbEbenen')).anzeige;
  await O('material', 'Helles Solid');
  await s.waitForTimeout(800);
  const hell = await drehen();
  const aufHell = (await O('farbEbenen')).anzeige;
  const groesst = Math.max(...kosten);
  ok(
    '68 Tempo an „strange bird“ mit drei Ebenen: Ein Handgriff rechnet nur seine Ebene neu (höchstens 30 ms); beim Drehen kostet die Bemalung je Bild im Median höchstens 1 ms, auf Wachs kein Bild über 16,7 ms',
    E.length === 3 && E.every((e) => e.linien >= 1 && e.fuellungen >= 1) && groesst <= 30 && neuGerechnet.every((n) => n === 1) && aufWachs.ebenen === 3 && aufWachs.gesammelt && aufHell.gesammelt && wachs.zahl > 20 && wachs.kb.median <= 1 && Math.max(...wachs.bildMs) <= 16.7 && hell.zahl > 20 && hell.kb.median <= 1,
    `${E.map((e) => `${e.name}: ${e.linien} Farblinien, ${e.fuellungen} Füllungen`).join(' · ')}; beim Ziehen am Tropfen (zwölf Schritte): Neurechnen ${z2(Math.min(...kosten))} bis ${z2(groesst)} ms, je Schritt ${[...new Set(neuGerechnet)].join(' oder ')} Ebene neu; beim Drehen auf Wachs (${wachs.zahl} Bilder): ein Bild im Median ${z2(quantil(wachs.bildMs, 0.5))} ms, das teuerste ${z2(Math.max(...wachs.bildMs))} ms, davon die Bemalung im Median ${z2(wachs.kb.median)} ms, 95 % ${z2(wachs.kb.p95)} ms; auf hellem Solid (${hell.zahl} Bilder, gesammelt ${aufHell.gesammelt}): ein Bild im Median ${z2(quantil(hell.bildMs, 0.5))} ms, das teuerste ${z2(Math.max(...hell.bildMs))} ms, davon die Bemalung im Median ${z2(hell.kb.median)} ms, 95 % ${z2(hell.kb.p95)} ms`,
  );
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-ebenen-68-hell.png`, await s.screenshot());
  fehlerAlle.push(...fehler);
  await t.browser.close();
}

ok('69 Keine Fehler in der Konsole', fehlerAlle.length === 0, fehlerAlle.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} FEHL` : 'alles gut');
process.exit(schlecht ? 1 : 0);
