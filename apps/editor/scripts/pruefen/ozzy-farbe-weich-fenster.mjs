// Ozzy, Paint-Modus, Etappe 4 (19.11.2026; Plan docs/plans/2026-11-19-ozzy-paint-modus.md, Abschnitt 14 und 15): weiche Kanten,
// Fassung 1 (der Tropfen am Faden). An einer frischen Kugel auf Wachs, ohne Einlaufen; ein runder Fleck in Rot auf Blau (aus Rot und
// Blau lässt sich der Anteil der zwei Farben an jedem Bildpunkt lesen, gleich wie hell das Wachs dort ist).
//   50  Breite null gibt genau das Bild von vorher (kein Bildpunkt anders), auch nachdem eine Breite gesetzt und wieder genommen wurde.
//   51  Der Verlauf ist so breit wie eingestellt (höchstens 1 Gerätepunkt oder 5 % daneben), bei 1-, 4- und 16-facher Vergrößerung.
//   52  Längs der Farblinie fließt die Breite stetig von Punkt zu Punkt; an einem Punkt mit Breite null ist die Kante einen
//       Gerätepunkt breit.
//   53  Kein Verlauf geht über eine andere Farblinie hinweg.
//   54  Der Tropfen am Faden: An einem gewählten Punkt sitzt er hohl; wegziehen macht die Kante so weit weich, wie er gezogen
//       wird; zurückschieben macht sie hart; ⌘Z nimmt beides zurück.
//   55  K schaltet an gewählten Punkten weich und hart, ] und [ machen den Verlauf breiter und schmaler.
//   56  Sichern und Laden halten die Breiten.
//   57  Tempo an „strange bird“: Neurechnen nach einem Handgriff höchstens 30 ms, die Bemalung je Bild im Median höchstens 1 ms.
//   58  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 OZZY_URL=http://localhost:5215/ozzy.html node scripts/pruefen/ozzy-farbe-weich-fenster.mjs [ordner für Bilder]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { auf } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const ablage = fileURLToPath(new URL('../../../../wesen/', import.meta.url));
const PROBE = 'ozzy-probe-weich';
const datei = `${ablage}${PROBE}.eewesen`;
if (fs.existsSync(datei)) fs.unlinkSync(datei);
const ROT = [1, 0, 0];
const BLAU = [0, 0, 1];
let schlecht = 0;
/** was die Kugel zu 51 gemessen hat (die 16-fache Größe misst eine zweite Seite, die Zeile steht danach) */
let kugel51 = null;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '–');
const fehlerAlle = [];

/** was eine Seite an Helfern braucht */
const helfer = (t) => {
  const { s } = t;
  const zieh = async (x, y, dx, dy, schritte = 6, halten = 0) => {
    await s.mouse.move(x, y, { steps: 5 });
    await s.waitForTimeout(250);
    await s.mouse.down();
    for (let i = 1; i <= schritte; i++) {
      await s.mouse.move(x + (dx * i) / schritte, y + (dy * i) / schritte);
      await s.waitForTimeout(22);
    }
    if (halten) await s.waitForTimeout(halten);
    await s.mouse.up();
    await s.waitForTimeout(250);
  };
  /** ein Bild rechnen und an den Stellen (CSS-Pixel) den Anteil von Rot lesen (0 … 1; null: dort steht keine der zwei Farben) */
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
        // (gemischt wird in Bildschirmwerten, dann erst hell und dunkel: r : b = lin(t) : lin(1 − t))
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
  /** die Haut als Bild merken (unter einem Namen) oder mit einem gemerkten vergleichen: der größte Unterschied (0 … 255) */
  const hautBild = (name, vergleichen) =>
    s.evaluate(
      ({ name, vergleichen }) => {
        const o = window.__ozzy;
        o.film(true);
        o.bild(1 / 60);
        const haut = document.getElementById('haut');
        const c = new OffscreenCanvas(haut.width, haut.height);
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(haut, 0, 0);
        o.film(false);
        const d = g.getImageData(0, 0, haut.width, haut.height).data;
        window.__bilder ??= {};
        if (!vergleichen) {
          window.__bilder[name] = d;
          return 0;
        }
        const a = window.__bilder[name];
        let groesst = 0;
        for (let i = 0; i < d.length; i++) groesst = Math.max(groesst, Math.abs(d[i] - a[i]));
        return groesst;
      },
      { name, vergleichen },
    );
  /**
   * Quer über die Farblinie an der Stelle (x, y) längs (ux, uy), nach außen positiv: wo der Anteil von Rot 75 %, 50 % und 25 % ist
   * (Pixel längs der Richtung) und wie breit der Übergang von 90 % auf 10 % ist. Innen liegt Rot.
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
    const [s90, s75, s50, s25, s10] = [bei(0.9), bei(0.75), bei(0.5), bei(0.25), bei(0.1)];
    // (die Breite des Verlaufs, zu jeder Seite: Zwischen 75 % und 25 % liegen 0,6946 davon)
    return { s75, s50, s25, halb: (s25 - s75) / 0.6946, kante: s10 - s90 };
  };
  return { zieh, rot, hautBild, quer };
};

/** eine frische Kugel von vorn, darauf ein runder Fleck (vier gezogene Punkte) in Rot auf Blau; zurück: seine Mitte und sein Halbmesser im Bild */
const kugelMitFleck = async (t) => {
  const { s, O, geladen, klick } = t;
  const { zieh } = helfer(t);
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
  const blick0 = await O('blickSetzen', { gier: 0, neigung: 0, zoom: 1 });
  await s.waitForTimeout(800);
  await s.keyboard.press('b');
  await s.waitForTimeout(500);
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  // ein runder Fleck: vier gezogene Punkte, auf dem ersten geschlossen
  const M = [700, 440];
  const r = 52;
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    await zieh(M[0] + r * Math.cos(w), M[1] + r * Math.sin(w), -0.55 * r * Math.sin(w), 0.55 * r * Math.cos(w));
  }
  await klick(M[0] + r * Math.cos(-0.4), M[1] + r * Math.sin(-0.4));
  await s.waitForTimeout(400);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  const f0 = await O('farbe');
  if (f0.linien !== 1) throw new Error(`Vorbereitung: ${f0.linien} Farblinien (erwartet 1)`);
  await O('farbFuellen', M[0] + r + 40, M[1] + 30, BLAU);
  await O('farbFuellen', M[0], M[1], ROT);
  await s.mouse.move(1380, 80);
  await s.waitForTimeout(500);
  return { M, r, blick0 };
};
/** den Punkt 0 der Farblinie in die Mitte des Bilds holen (in ein paar Schritten: Der Blick ist perspektivisch) */
const zumPunkt = async (t, zoom) => {
  const { s, O } = t;
  let [sx, sy] = [0, 0];
  await O('blickSetzen', { zoom, schwenkX: 0, schwenkY: 0 });
  await s.waitForTimeout(500);
  for (let runde = 0; runde < 6; runde++) {
    const P = (await O('farbPunkte', 0)).punkte[0];
    if (Math.hypot(P.x - 720, P.y - 450) < 1.5) break;
    sx += 720 - P.x;
    sy += 450 - P.y;
    await O('blickSetzen', { zoom, schwenkX: sx, schwenkY: sy });
    await s.waitForTimeout(350);
  }
  await s.waitForTimeout(400);
};
/** an der Stelle des Punkts 0: die Richtung quer zur Farblinie im Bild (vom Fleck weg) und die Länge eines kurzen Stücks von ihr */
const amPunkt = async (t) => {
  const L = await t.O('farbLinieImBild', 0);
  const n = L.length;
  const [a, b, p] = [L[n - 4], L[4], L[0]];
  const stueck = Math.hypot(b.x - a.x, b.y - a.y);
  let [ux, uy] = [(b.y - a.y) / stueck, -(b.x - a.x) / stueck];
  const mx = L.reduce((q, o) => q + o.x, 0) / n;
  const my = L.reduce((q, o) => q + o.y, 0) / n;
  if ((p.x - mx) * ux + (p.y - my) * uy < 0) [ux, uy] = [-ux, -uy];
  return { x: p.x, y: p.y, ux, uy, stueck };
};

// =====================================================================================================================
// an der Kugel
// =====================================================================================================================
{
  const t = await auf({ dichte: 1, extra: 'ohneLinie=0&material=wachs&fuellen=0' });
  const { s, O, geladen, klick, fehler } = t;
  const { zieh, rot, hautBild, quer } = helfer(t);
  const { M, r, blick0 } = await kugelMitFleck(t);
  /** alle Punkte wählen und ihre Tropfen lesen (dann die Auswahl wieder leeren) */
  const griffe = async () => {
    await s.keyboard.press('Meta+a');
    await s.waitForTimeout(300);
    const G = await O('farbWeichGriffe');
    return G.map((g) => ({ ...g, ux: (g.gx - g.x) / Math.hypot(g.gx - g.x, g.gy - g.y), uy: (g.gy - g.y) / Math.hypot(g.gx - g.x, g.gy - g.y) }));
  };
  const G0 = await griffe();
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-weich-0.png`, await s.screenshot());
  // (an der gespiegelten Kugel liegt das Spiegelbild des Flecks auf der Rückseite; einer seiner Punkte kann am Umriss zu sehen sein)
  if (G0.filter((g) => Math.hypot(g.x - M[0], g.y - M[1]) < r + 12).length !== 4) throw new Error(`Vorbereitung: ${G0.length} Tropfen (${G0.map((g) => `${Math.round(g.x)};${Math.round(g.y)}`).join(' ')})`);
  const je = G0[0].jeEinheit;
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);

  // ---------- 50: Breite null ist das Bild von vorher ----------
  {
    await hautBild('hart', false);
    const gleich0 = await hautBild('hart', true);
    await O('farbBreite', 0, -1, 20);
    await s.waitForTimeout(300);
    const weich = await hautBild('hart', true);
    await O('farbBreite', 0, -1, 0);
    await s.waitForTimeout(300);
    const wiederHart = await hautBild('hart', true);
    ok('50 Breite null gibt genau das Bild von vorher', gleich0 === 0 && weich > 20 && wiederHart === 0, `zweimal hart: größter Unterschied ${gleich0} von 255; mit Breite 20: ${weich}; die Breite wieder genommen: ${wiederHart}`);
  }

  // ---------- 51: so breit wie eingestellt, bei jeder Vergrößerung ----------
  {
    const W = 20;
    await O('farbBreite', 0, -1, W);
    await s.waitForTimeout(300);
    const zeilen = [];
    let gut = true;
    // bei einfacher Größe sagt der Tropfen des Punkts, wie viele Pixel eine Einheit quer zur Farblinie misst; vergrößert wächst das
    // wie ein kurzes Stück der Farblinie an derselben Stelle (der Blick ist perspektivisch: nicht einfach mit dem Zoom)
    let stueck1 = 0;
    for (const zoom of [1, 4]) {
      await zumPunkt(t, zoom);
      const A = await amPunkt(t);
      if (zoom === 1) stueck1 = A.stueck;
      const soll = (W * je * A.stueck) / stueck1;
      const q = await quer(A.x, A.y, A.ux, A.uy, Math.min(440, 1.25 * soll), Math.max(0.25, soll / 160));
      const daneben = Math.abs(q.halb - soll);
      const haelt = Number.isFinite(q.halb) && (daneben <= 1 || daneben <= 0.05 * soll) && Math.abs(q.s50) <= Math.max(1, 0.03 * soll);
      if (!haelt) gut = false;
      zeilen.push(`${zoom}-fach: eingestellt ${z2(soll)} Pixel, gemessen ${z2(q.halb)} (${z2(daneben)} daneben), die Mitte ${z2(q.s50)} neben der Farblinie`);
      if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-weich-51-${zoom}.png`, await s.screenshot());
    }
    kugel51 = { gut, zeilen, je, stueck1 };
    await O('blickSetzen', { zoom: 1, schwenkX: blick0.schwenkX, schwenkY: blick0.schwenkY });
    await s.waitForTimeout(600);
  }

  // ---------- 52: die Breite fließt, an einem Punkt mit Breite null ist die Kante hart ----------
  {
    const W = 24;
    for (let q = 0; q < 4; q++) await O('farbBreite', 0, q, q % 2 === 0 ? W : 0);
    await s.waitForTimeout(400);
    const P = (await O('farbPunkte', 0)).punkte;
    const L = await O('farbLinieImBild', 0);
    const mx = L.reduce((a, p) => a + p.x, 0) / L.length;
    const my = L.reduce((a, p) => a + p.y, 0) / L.length;
    // vom weichen Punkt 0 zum harten Punkt 1: an neun Stellen der Farblinie quer messen
    const stellen = [];
    for (let j = 0; j <= 8; j++) {
      const i = Math.round(P[0].i + ((P[1].i - P[0].i) * j) / 8);
      const p = L[i];
      const lang = Math.hypot(p.x - mx, p.y - my);
      const q = await quer(p.x, p.y, (p.x - mx) / lang, (p.y - my) / lang, 1.3 * W * je + 4, 0.25);
      stellen.push(q);
    }
    const breiten = stellen.map((q) => (Number.isFinite(q.halb) ? q.halb : 0));
    let stetig = true;
    for (let j = 1; j < breiten.length; j++) if (breiten[j] > breiten[j - 1] + 1 || breiten[j - 1] - breiten[j] > 0.45 * W * je) stetig = false;
    const amHarten = stellen[8];
    ok(
      '52 Die Breite fließt stetig von Punkt zu Punkt; an einem Punkt mit Breite null ist die Kante einen Gerätepunkt breit',
      stetig && Math.abs(breiten[0] - W * je) <= Math.max(1, 0.06 * W * je) && Math.abs(breiten[4] - 0.5 * W * je) <= 0.15 * W * je && amHarten.kante <= 1.6 && amHarten.kante >= 0.3,
      `vom weichen zum harten Punkt (Pixel): ${breiten.map((b) => z2(b)).join(' → ')} (eingestellt ${z2(W * je)} → 0); die Kante am harten Punkt: ${z2(amHarten.kante)} Pixel von 90 % auf 10 %`,
    );
    if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-weich-52.png`, await s.screenshot());
  }

  // ---------- 54: der Tropfen am Faden ----------
  {
    await O('farbBreite', 0, -1, 0);
    await s.waitForTimeout(300);
    await hautBild('vor54', false);
    const P = (await O('farbPunkte', 0)).punkte[0];
    await klick(P.x, P.y);
    await s.waitForTimeout(300);
    const G = await O('farbWeichGriffe');
    const g = G[0];
    const lang0 = g ? Math.hypot(g.gx - g.x, g.gy - g.y) : NaN;
    const [ux, uy] = g ? [(g.gx - g.x) / lang0, (g.gy - g.y) / lang0] : [1, 0];
    const schritte0 = (await O('farbe')).schritte;
    // den Tropfen an seiner Mitte greifen und 30 Pixel von der Farblinie wegziehen
    await zieh(g.gx + ux * 4, g.gy + uy * 4, ux * 30, uy * 30, 10, 100);
    const G1 = (await O('farbWeichGriffe'))[0];
    const anders = await hautBild('vor54', true);
    const schritte1 = (await O('farbe')).schritte;
    if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-weich-54.png`, await s.screenshot());
    // zurück an die Farblinie: hart
    await zieh(G1.gx + ux * 4, G1.gy + uy * 4, -ux * (Math.hypot(G1.gx - G1.x, G1.gy - G1.y) - 2), -uy * (Math.hypot(G1.gx - G1.x, G1.gy - G1.y) - 2), 10, 100);
    const G2 = (await O('farbWeichGriffe'))[0];
    const wiederHart = await hautBild('vor54', true);
    // (⌘Z leert die Auswahl: die Breite am Punkt selbst lesen)
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(300);
    const G3 = { breite: (await O('farbPunkte', 0)).punkte[0].breite };
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(300);
    const G4 = { breite: (await O('farbPunkte', 0)).punkte[0].breite };
    const soll = (lang0 + 30) / g.jeEinheit;
    ok(
      '54 Der Tropfen am Faden: hohl am gewählten Punkt; wegziehen macht die Kante so weit weich, zurückschieben hart; ⌘Z nimmt beides zurück',
      G.length === 1 && g.breite === 0 && Math.abs(lang0 - 12) < 0.5 && Math.abs(G1.breite - soll) <= 1.5 / g.jeEinheit && anders > 20 && schritte1 === schritte0 + 1 && G2.breite === 0 && wiederHart === 0 && Math.abs(G3.breite - G1.breite) < 1e-6 && G4.breite === 0,
      `gewählt: ${G.length} Tropfen, Breite ${g.breite}, Faden ${z2(lang0)} Pixel; 30 Pixel gezogen: Breite ${z2(G1.breite)} (erwartet ${z2(soll)}), das Bild ändert sich um bis zu ${anders} von 255, ein Schritt mehr (${schritte1 - schritte0}); zurückgeschoben: Breite ${G2.breite}, Unterschied zum Bild vorher ${wiederHart}; ⌘Z: ${z2(G3.breite)}, noch einmal: ${G4.breite}`,
    );
  }

  // ---------- 55: K, ] und [ ----------
  {
    const P0 = (await O('farbPunkte', 0)).punkte[0];
    await klick(P0.x, P0.y);
    await s.waitForTimeout(300);
    const lesen = async () => (await O('farbPunkte', 0)).punkte.map((q) => q.breite);
    await s.keyboard.press('k');
    await s.waitForTimeout(250);
    const a = await lesen();
    await s.keyboard.press(']');
    await s.waitForTimeout(250);
    const b = await lesen();
    await s.keyboard.press('[');
    await s.keyboard.press('[');
    await s.waitForTimeout(250);
    const c = await lesen();
    await s.keyboard.press('k');
    await s.waitForTimeout(250);
    const d = await lesen();
    await s.keyboard.press('Meta+a');
    await s.waitForTimeout(250);
    await s.keyboard.press('k');
    await s.waitForTimeout(250);
    const e = await lesen();
    await s.keyboard.press('k');
    await s.waitForTimeout(250);
    const f = await lesen();
    await s.keyboard.press('Escape');
    await s.waitForTimeout(250);
    ok(
      '55 K schaltet an gewählten Punkten weich und hart, ] und [ machen den Verlauf breiter und schmaler',
      a[0] > 0 && a[1] === 0 && Math.abs(b[0] - 1.25 * a[0]) < 1e-6 && Math.abs(c[0] - a[0] / 1.25) < 1e-6 && d[0] === 0 && e.every((x) => x > 0) && f.every((x) => x === 0),
      `K: ${a.map(z2).join(' ')}; ]: ${z2(b[0])}; zweimal [: ${z2(c[0])}; K: ${d[0]}; alle gewählt, K: ${e.map(z2).join(' ')}; K: ${f.join(' ')}`,
    );
  }

  // ---------- 53: nicht über eine andere Farblinie hinweg ----------
  {
    await O('farbBreite', 0, -1, 26);
    await s.waitForTimeout(300);
    // eine harte, offene Farblinie rechts neben dem Fleck, 12 Pixel von ihm (mitten in seinem Verlauf), senkrecht, 150 Pixel lang
    const x = M[0] + r + 12;
    const frei = await rot([[x + 8, M[1]]]);
    await s.keyboard.press('p');
    await s.waitForTimeout(400);
    await klick(x, M[1] - 75);
    await klick(x, M[1] + 75);
    await s.keyboard.press('Enter');
    await s.waitForTimeout(400);
    await s.keyboard.press('a');
    await s.waitForTimeout(400);
    await s.mouse.move(1380, 80);
    const [davor, dahinter, weitDahinter] = await rot([
      [x - 5, M[1]],
      [x + 8, M[1]],
      [x + 14, M[1]],
    ]);
    const linien = (await O('farbe')).linien;
    ok('53 Kein Verlauf geht über eine andere Farblinie hinweg', linien === 2 && frei > 0.008 && davor > 0.05 && dahinter !== null && dahinter < 0.004 && weitDahinter < 0.004, `ohne die zweite Farblinie steht 8 Pixel hinter ihrer Stelle ${z2(100 * frei)} % Rot; mit ihr: davor ${z2(100 * davor)} %, 8 Pixel dahinter ${z2(100 * dahinter)} %, 14 Pixel dahinter ${z2(100 * weitDahinter)} %`);
    if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-weich-53.png`, await s.screenshot());
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(300);
  }

  // ---------- 56: Sichern und Laden ----------
  {
    for (let q = 0; q < 4; q++) await O('farbBreite', 0, q, [20, 0, 7.5, 12][q]);
    await s.waitForTimeout(300);
    const vor = (await O('farbPunkte', 0)).punkte.map((q) => q.breite);
    await hautBild('vorSichern', false);
    const text = await O('sichern', PROBE);
    const gesichert = fs.existsSync(datei);
    await O('laden', PROBE);
    await geladen();
    await s.waitForTimeout(2500);
    await O('material', 'Wachs');
    await O('blickSetzen', { gier: 0, neigung: 0, zoom: 1 });
    await O('malen', true);
    await s.waitForTimeout(1200);
    const nach = ((await O('farbPunkte', 0))?.punkte ?? []).map((q) => q.breite);
    ok('56 Sichern und Laden halten die Breiten', gesichert && nach.length === 4 && nach.every((x, i) => Math.abs(x - vor[i]) < 1e-9), `${String(text).slice(0, 50)} · vorher ${vor.map(z2).join(' ')}, geladen ${nach.map(z2).join(' ')}`);
    if (fs.existsSync(datei)) fs.unlinkSync(datei);
  }
  fehlerAlle.push(...fehler);
  await t.browser.close();
}

// =====================================================================================================================
// 51, die 16-fache Größe: dieselbe Kugel 4-fach vergrößert bei vierfacher Pixeldichte (jeder Gerätepunkt ist ein Sechzehntel)
// =====================================================================================================================
{
  const t = await auf({ dichte: 4, extra: 'ohneLinie=0&material=wachs&fuellen=0' });
  const { s, O, fehler } = t;
  const { quer } = helfer(t);
  await kugelMitFleck(t);
  const W = 20;
  await O('farbBreite', 0, -1, W);
  await s.waitForTimeout(300);
  await zumPunkt(t, 1);
  const A1 = await amPunkt(t);
  await zumPunkt(t, 4);
  const A = await amPunkt(t);
  // (Pixel je Einheit bei einfacher Größe: von der ersten Seite; dieselbe Kugel, derselbe Blick)
  const soll = (W * kugel51.je * A.stueck) / A1.stueck;
  const q = await quer(A.x, A.y, A.ux, A.uy, Math.min(440, 1.25 * soll), 0.25);
  // in Gerätepunkten
  const [sollG, halbG] = [4 * soll, 4 * q.halb];
  const daneben = Math.abs(halbG - sollG);
  const haelt = Number.isFinite(q.halb) && (daneben <= 1 || daneben <= 0.05 * sollG) && Math.abs(4 * q.s50) <= Math.max(1, 0.03 * sollG);
  kugel51.zeilen.push(`16-fach (4-fach vergrößert, vierfache Pixeldichte, in Gerätepunkten): eingestellt ${z2(sollG)}, gemessen ${z2(halbG)} (${z2(daneben)} daneben), die Mitte ${z2(4 * q.s50)} neben der Farblinie`);
  ok('51 Der Verlauf ist so breit wie eingestellt (höchstens 1 Gerätepunkt oder 5 % daneben), bei 1-, 4- und 16-facher Vergrößerung', kugel51.gut && haelt, kugel51.zeilen.join(' · '));
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-weich-51-16.png`, await s.screenshot({ clip: { x: 420, y: 250, width: 600, height: 400 } }));
  fehlerAlle.push(...fehler);
  await t.browser.close();
}

// =====================================================================================================================
// 57: Tempo an „strange bird“
// =====================================================================================================================
{
  const t = await auf({ form: 'strange bird', dichte: 2, extra: 'material=wachs&fuellen=0' });
  const { s, O, geladen, klick, fehler } = t;
  const { zieh } = helfer(t);
  await geladen();
  await O('blickSetzen', { gier: -0.62, neigung: 0, zoom: 4 });
  await s.waitForTimeout(1500);
  await s.keyboard.press('b');
  await s.waitForTimeout(700);
  await s.keyboard.press('p');
  await s.waitForTimeout(400);
  const q = { x: 530, y: 510 };
  const r = 64;
  for (let i = 0; i < 4; i++) {
    const w = (Math.PI / 2) * i - 0.4;
    await zieh(q.x + r * Math.cos(w), q.y + 1.15 * r * Math.sin(w), -0.55 * r * Math.sin(w), 0.63 * r * Math.cos(w));
  }
  await klick(q.x + r * Math.cos(-0.4), q.y + 1.15 * r * Math.sin(-0.4));
  await s.waitForTimeout(400);
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  await O('farbFuellen', q.x + 1.9 * r, q.y + 0.3 * r, BLAU);
  await O('farbFuellen', q.x, q.y, ROT);
  await s.waitForTimeout(400);
  const linien = (await O('farbe')).linien;
  // ein Punkt gewählt, sein Tropfen in zwölf Schritten 60 Pixel weit gezogen: Jeder Schritt rechnet neu
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
  for (let i = 1; i <= 12; i++) {
    await s.mouse.move(g.gx + ux * (4 + 5 * i), g.gy + uy * (4 + 5 * i));
    await s.waitForTimeout(40);
    kosten.push((await O('farbWeich')).ableitenMs);
  }
  await s.mouse.up();
  await s.waitForTimeout(300);
  // rundum weich (30 Einheiten), dann die Form drehen: was kostet die Bemalung je Bild?
  await s.keyboard.press('Escape');
  await O('farbBreite', 0, -1, 30);
  await s.waitForTimeout(400);
  const W = await O('farbWeich');
  await O('farbKosten', true);
  await s.mouse.move(1300, 800, { steps: 4 });
  await s.mouse.down();
  for (let i = 1; i <= 60; i++) {
    await s.mouse.move(1300 - 2 * i, 800);
    await s.waitForTimeout(16);
  }
  await s.waitForTimeout(400);
  await s.mouse.up();
  const kb = await O('farbKosten');
  const groesst = Math.max(...kosten);
  ok(
    '57 Tempo an „strange bird“: Neurechnen nach einem Handgriff höchstens 30 ms, die Bemalung je Bild im Median höchstens 1 ms',
    linien === 1 && groesst <= 30 && W.ableitenMs <= 30 && W.dreiecke > 50 && kb.bilder >= 20 && kb.median <= 1,
    `beim Ziehen am Tropfen (zwölf Schritte): Neurechnen ${z2(Math.min(...kosten))} bis ${z2(groesst)} ms; rundum weich: ${z2(W.ableitenMs)} ms, davon die weichen Kanten ${z2(W.weichMs)} ms, ${W.dreiecke} Dreiecke im Verlauf; beim Drehen (${kb.bilder} Bilder): die Bemalung je Bild im Median ${z2(kb.median)} ms, 95 % ${z2(kb.p95)} ms`,
  );
  if (ordner) fs.writeFileSync(`${ordner}/ozzy-farbe-weich-57.png`, await s.screenshot());
  fehlerAlle.push(...fehler);
  await t.browser.close();
}

ok('58 Keine Fehler in der Konsole', fehlerAlle.length === 0, fehlerAlle.slice(0, 3).join(' | '));
console.log(schlecht ? `${schlecht} FEHL` : 'alles gut');
process.exit(schlecht ? 1 : 0);
