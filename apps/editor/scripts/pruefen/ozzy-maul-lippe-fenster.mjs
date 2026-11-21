// Ozzy, die Lippe als die gezeichnete Linie (Feinschlifflauf, Block D, 21.11.2026; Plan
// `docs/plans/2026-11-20-ozzy-maul-feinschliff.md`), an „teat firefish“ (NAME) oder einem frischen Oval (FRISCH=1), in der Seite.
// Kriterien:
//   P1  Die Lippe trägt ihre zwei Enden, den Mundwinkel, die Kreuzungen mit Linien der Form und je Lippe die gezeichneten Anker,
//       die in der Form liegen (eine Kreuzung dicht an einem Anker steht für ihn). Sonst nichts.
//   P2  Die Linie im Maul (Mitte von Gaumen und Boden) trägt dieselben Anker.
//   P3  Von der Seite liegt der Pfad der Lippe auf der Zeichnung (höchstens 0,5 Einheiten daneben; steht eine Kreuzung für einen
//       Anker, höchstens 1).
//   P4  Ein Anker der Lippe, in der Seite gegriffen, zieht die Lippe (nicht den Punkt der Linie im Maul dahinter).
//   F1  Ohne Maul trägt die Anzeige der Linien keine Farbe.
//   F2  Zu: die Punkte der Lippe türkis, die Linie dazwischen in Tinte, der Mundwinkel schwarz.
//   F3  „Fressen“ an: die Oberlippe rosa, die Unterlippe blau (Punkte und Linie), der Mundwinkel schwarz.
//   F4  Lippen getrennt (zu): die Oberlippe liegt vorn, rosa; ein Punkt der Unterlippe nach unten gezogen ist blau.
//   U1  Eine Linie, mit P auf dem Umriss begonnen und mit ↩ in der Form beendet, wartet als Strich mit dem Tropfen „Maul“; die
//       Linien der Form sind dabei, wie sie waren.
//   U2  Der Tropfen macht daraus das Maul; das Werk kommt zur Ruhe.
//   U3  Andersherum (im Mundwinkel begonnen, der letzte Klick auf dem Umriss) wartet der Strich ebenso.
//   K   Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [FRISCH=1] [NAME=…] [LINIE='x,y;…' (Werk, von vorn zum Mundwinkel)] node scripts/pruefen/ozzy-maul-lippe-fenster.mjs [ordner für Bilder]
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
let LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const FRISCH = process.env.FRISCH === '1';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const fehler = [];
s.on('pageerror', (e) => fehler.push(String(e)));
s.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
await flickenAnlegen(s, undefined, fehler);
await s.goto(FRISCH ? `${basis}?loops=1` : `${basis}?form=${encodeURIComponent(NAME)}`);
await s.waitForFunction(() => !!window.__ozzy);
const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
if (FRISCH) {
  const [cx, cy, rx, ry] = [720, 450, 190, 120];
  const kx = 0.5523 * rx;
  const ky = 0.5523 * ry;
  await O('form', [
    { x: cx + rx, y: cy, ein: [0, -ky], aus: [0, ky] },
    { x: cx, y: cy + ry, ein: [kx, 0], aus: [-kx, 0] },
    { x: cx - rx, y: cy, ein: [0, ky], aus: [0, -ky] },
    { x: cx, y: cy - ry, ein: [-kx, 0], aus: [kx, 0] },
  ]);
  await s.waitForTimeout(300);
  await O('aufblasen');
  await s.waitForFunction(() => window.__ozzy.werk().gezeigt && window.__ozzy.bearbeiten().an, null, { timeout: 90000 });
  await s.waitForTimeout(2500);
}
const ruhig = async (zeit = 120000) => {
  await s.waitForTimeout(300);
  try {
    await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: zeit });
  } catch (e) {
    // (woran es hängt, gehört in die Ausgabe: sonst steht dort nur „Timeout“)
    const b = await O('bearbeiten');
    const w = await O('werk');
    console.log(`keine Ruhe nach ${zeit / 1000} s: Bearbeiten an ${b.an}, beschäftigt ${b.beschaeftigt}; Werk beschäftigt ${w.beschaeftigt}; Blick ${JSON.stringify(await O('blick')).slice(0, 120)}; Meldung: ${(w.meldung ?? '').slice(0, 100)}`);
    throw e;
  }
  await s.waitForTimeout(200);
};
await ruhig();
/** die Auswahl leeren (Esc nur, wenn etwas gewählt ist: Ohne Auswahl verlässt Esc die Seitenansicht) */
const abwaehlen = async () => {
  const b = await O('bearbeiten');
  if (b.auswahl.length || b.werkAuswahl.length) {
    await s.keyboard.press('Escape');
    await s.waitForTimeout(250);
  }
};
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
const bild = async (name) => {
  if (ordner) await s.screenshot({ path: `${ordner}/ozzy-lippe-${name}.png` });
};
await s.keyboard.press('1');
await s.waitForTimeout(1500);
await ruhig();
const klick = async (x, y) => {
  await s.mouse.move(x, y);
  await s.waitForTimeout(250);
  await s.mouse.down();
  await s.waitForTimeout(60);
  await s.mouse.up();
  await s.waitForTimeout(250);
};
const vorher = await O('werkLinienDaten');
if (FRISCH) {
  const P = vorher.flatMap((l) => l.punkte);
  const x0 = Math.min(...P.map((p) => p.x));
  const x1 = Math.max(...P.map((p) => p.x));
  const y0 = Math.min(...P.map((p) => p.y));
  const y1 = Math.max(...P.map((p) => p.y));
  const W = x1 - x0;
  const ym = 0.5 * (y0 + y1) - 0.12 * (y1 - y0);
  LINIE = [
    [x0 - 0.3 * W, ym + 0.02 * W],
    [x0 + 0.1 * W, ym - 0.02 * W],
    [x0 + 0.3 * W, ym + 0.03 * W],
  ];
}
const imBild = (x, y, z = 0) => O('werkImBild', { x, y, z });
// mit dem Rad an das Maul heran (bei kleinem Maßstab liegen die Punkte der Lippe wenige Bildpunkte auseinander, und ein Zug um
// einige Einheiten wäre im Bild nur ein Klick)
{
  // Raste um Raste, solange alle Anker der Linie im Fenster bleiben (eine Form, die ins Fenster passt, bleibt beim Vergrößern
  // in seiner Mitte; eine größere wächst um den Zeiger)
  const imFenster = async () => {
    for (const [x, y] of LINIE) {
      const q = await imBild(x, y);
      if (q.x < 60 || q.x > 1380 || q.y < 130 || q.y > 840) return false;
    }
    return true;
  };
  let rasten = 0;
  for (; rasten < 14; rasten++) {
    const m = await imBild(...LINIE[Math.floor(LINIE.length / 2)]);
    await s.mouse.move(m.x, m.y);
    await s.mouse.wheel(0, -240);
    await s.waitForTimeout(160);
    if (!(await imFenster())) {
      await s.mouse.wheel(0, 240);
      await s.waitForTimeout(160);
      break;
    }
  }
  await s.waitForTimeout(1500);
  await ruhig();
  console.log(`herangefahren: ${rasten} Rasten, Maßstab ${(await O('blick')).massstab.toFixed(2)}`);
}
const zeichnen = async (linie) => {
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  for (const [x, y] of linie) {
    const q = await imBild(x, y);
    await klick(q.x, q.y);
  }
  await s.keyboard.press('Enter');
  await s.waitForTimeout(500);
};
/** die Farben der Anzeige der Linien um einen Ort (CSS-Pixel): der bunteste Bildpunkt im Umkreis und der dunkelste */
const farbeBei = (x, y, r = 2.5) =>
  s.evaluate(
    async ([x2, y2, r2]) => {
      window.__ozzy.bild?.();
      const c = document.querySelector('#linien');
      const D = c.width / c.getBoundingClientRect().width;
      const url = c.toDataURL('image/png');
      const img = new Image();
      img.src = url;
      await img.decode();
      const k = document.createElement('canvas');
      k.width = img.width;
      k.height = img.height;
      const g = k.getContext('2d');
      g.drawImage(img, 0, 0);
      const R = Math.ceil(r2 * D);
      const x0 = Math.max(0, Math.round(x2 * D) - R);
      const y0 = Math.max(0, Math.round(y2 * D) - R);
      const d = g.getImageData(x0, y0, 2 * R + 1, 2 * R + 1).data;
      let bunt = [0, 0, 0, 0];
      let buntheit = -1;
      let dunkel = [255, 255, 255, 0];
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 200) continue;
        const b = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
        if (b > buntheit) {
          buntheit = b;
          bunt = [d[i], d[i + 1], d[i + 2], d[i + 3]];
        }
        if (d[i] + d[i + 1] + d[i + 2] < dunkel[0] + dunkel[1] + dunkel[2]) dunkel = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      }
      return { bunt, buntheit, dunkel };
    },
    [x, y, r],
  );
/** wie viele deckende Bildpunkte der Anzeige der Linien bunt sind (auf der ganzen Fläche) */
const bunteZahl = () =>
  s.evaluate(async () => {
    window.__ozzy.bild?.();
    const c = document.querySelector('#linien');
    const img = new Image();
    img.src = c.toDataURL('image/png');
    await img.decode();
    const k = document.createElement('canvas');
    k.width = img.width;
    k.height = img.height;
    const g = k.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, k.width, k.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 90) n++;
    return n;
  });
const nah = (c, soll, tol = 70) => Math.hypot(c[0] - soll[0], c[1] - soll[1], c[2] - soll[2]) < tol;
const TUERKIS = [0x00, 0xd3, 0xc5];
const ROSA = [0xff, 0x33, 0x6c];
const BLAU = [0x06, 0x00, 0xf9];
const hex = (c) => `#${c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// F1 ohne Maul keine Farbe
await s.mouse.move(40, 420);
await s.waitForTimeout(400);
const bunt0 = await bunteZahl();
ok('F1 ohne Maul trägt die Anzeige der Linien keine Farbe', bunt0 === 0, `${bunt0} bunte Bildpunkte`);

// ---------- P1 bis P4: die Punkte ----------
await zeichnen(LINIE);
await bild('p0-strich');
if (!(await O('maulStrich'))) console.log(`kein wartender Strich: ${JSON.stringify(await O('bearbeiten')).slice(0, 300)}; Meldung: ${((await O('werk')).meldung ?? '').slice(0, 160)}`);
// (verglichen wird mit den Ankern, wie sie gesetzt wurden: Ein geklickter Punkt sitzt, wo der Zeiger gezeichnet ist)
{
  const st = await O('maulStrich');
  if (st?.gezeichnet.length === LINIE.length) {
    const weit = Math.max(...st.gezeichnet.map((g, i) => Math.hypot(g.x - LINIE[i][0], g.y - LINIE[i][1])));
    LINIE = st.gezeichnet.map((g) => [g.x, g.y]);
    console.log(`gezeichnet: ${LINIE.length} Anker, höchstens ${weit.toFixed(2)} Einheiten neben dem Soll der Probe`);
  }
}
// welche Anker in der Form liegen (nur sie können Punkte der Lippe werden; eine Form mit einer Bucht vorn lässt welche im Leeren)
const inDerForm = [];
for (const [x, y] of LINIE) {
  const q = await imBild(x, y);
  inDerForm.push(await O('formUnter', q.x, q.y));
}
await s.click('#maul-tropfen');
await s.waitForFunction(() => !window.__ozzy.maulStrich(), null, { timeout: 60000 }).catch(() => {});
await s.waitForTimeout(3500);
await ruhig();
await s.keyboard.press('a');
await s.waitForTimeout(400);
await abwaehlen();
const Linien = await O('werkLinienDaten');
const lippe = Linien.find((l) => l.maulEcht);
const ankerInnen = LINIE.slice(0, -1).filter((_, i) => inDerForm[i]);
const C = LINIE[LINIE.length - 1];
if (!lippe) ok('P1 die Punkte der Lippe', false, 'kein Maul');
else {
  const n = lippe.punkte.length;
  const iW = (n - 1) / 2;
  const d2 = (p, q) => Math.hypot(p.x - q[0], p.y - q[1]);
  // je Anker: auf jeder Lippe ein Punkt genau dort, oder eine Kreuzung dicht daneben
  let fehlt = 0;
  let amAnker = 0;
  let vertreten = 0;
  for (const A of ankerInnen)
    for (const haelfte of [lippe.punkte.slice(0, iW), lippe.punkte.slice(iW + 1)]) {
      if (haelfte.some((p) => d2(p, A) < 0.1)) amAnker++;
      else if (haelfte.some((p) => p.kreuzung !== null && d2(p, A) < 12)) vertreten++;
      else fehlt++;
    }
  // was sonst auf der Lippe liegt: nur Enden, Mundwinkel, Kreuzungen
  const fremd = lippe.punkte.filter((p, i) => i !== 0 && i !== n - 1 && i !== iW && p.kreuzung === null && !ankerInnen.some((A) => d2(p, A) < 0.1));
  ok(
    'P1 die Lippe trägt ihre Enden, den Mundwinkel, die Kreuzungen und die gezeichneten Anker, sonst nichts',
    fehlt === 0 && fremd.length === 0 && n % 2 === 1 && d2(lippe.punkte[iW], C) < 0.1,
    `${n} Punkte bei ${LINIE.length} gezeichneten (${inDerForm.filter((x) => !x).length} davon im Leeren); je Lippe ${ankerInnen.length} Anker in der Form (ohne den Mundwinkel): ${amAnker} Punkte genau am Anker, ${vertreten} durch eine Kreuzung vertreten, ${fehlt} fehlen; fremde Punkte ${fremd.length}; Mundwinkel ${d2(lippe.punkte[iW], C).toFixed(3)} neben dem letzten Anker`,
  );
  // P2 die Linie im Maul: in der Spiegelebene, hängt an beiden Enden, läuft durch den Mundwinkel
  const mitte = Linien.find((l) => l !== lippe && !l.kante && l.haengt && l.haengt[0] && l.haengt[1] && l.punkte.every((p) => Math.abs(p.z) < 1e-6) && l.punkte.some((p) => d2(p, C) < 0.1));
  if (!mitte) ok('P2 die Linie im Maul trägt dieselben Anker', false, 'die Linie im Maul fehlt');
  else {
    const fehltM = ankerInnen.filter((A) => mitte.punkte.filter((p) => d2(p, A) < 0.1).length !== 2).length;
    ok('P2 die Linie im Maul trägt dieselben Anker', fehltM === 0 && mitte.punkte.length === 2 * ankerInnen.length + 3, `${mitte.punkte.length} Punkte (zwei Enden, die Wende, je Seite ${ankerInnen.length} Anker); Anker ohne ihre zwei Punkte: ${fehltM}`);
  }
  // P3 der Pfad der Lippe von der Seite gegen die Zeichnung (die Anker als Ecken, nach vorn gerade verlängert)
  const Z = [...LINIE].reverse();
  const nebenZ = (x, y) => {
    let m = Infinity;
    for (let i = 0; i + 1 < Z.length; i++) {
      const [ax, ay] = Z[i];
      const [bx, by] = Z[i + 1];
      const ex = bx - ax;
      const ey = by - ay;
      const f = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1)));
      m = Math.min(m, Math.hypot(x - ax - f * ex, y - ay - f * ey));
    }
    return m;
  };
  let weit = 0;
  for (let i = 0; i + 1 < n; i++) {
    const a = lippe.punkte[i];
    const b = lippe.punkte[i + 1];
    if (!a.aus || !b.ein) continue;
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const u = 1 - t;
      const x = u * u * u * a.x + 3 * u * u * t * (a.x + a.aus.x) + 3 * u * t * t * (b.x + b.ein.x) + t * t * t * b.x;
      const y = u * u * u * a.y + 3 * u * u * t * (a.y + a.aus.y) + 3 * u * t * t * (b.y + b.ein.y) + t * t * t * b.y;
      weit = Math.max(weit, nebenZ(x, y));
    }
  }
  // (steht eine Kreuzung für einen Anker, liegt die Ecke der Lippe an ihr statt am Anker: bis eine Einheit daneben)
  const grenze = vertreten ? 1 : 0.5;
  ok('P3 von der Seite liegt der Pfad der Lippe auf der Zeichnung', weit < grenze, `höchstens ${weit.toFixed(3)} Einheiten daneben (Grenze ${grenze}${vertreten ? ': Eine Kreuzung steht für einen Anker' : ''})`);

  // F2 zu: Punkte türkis, Linie in Tinte, Mundwinkel schwarz
  await s.mouse.move(40, 420);
  await s.waitForTimeout(500);
  const ort = async (i) => {
    const a = (await O('ankerImBild', lippe.id, i, 'seite')).filter((q) => q.sichtbar);
    return a[0] ?? null;
  };
  const iA = lippe.punkte.findIndex((p, i) => i > 0 && i < iW && p.kreuzung === null);
  const iPunkt = iA > 0 ? iA : 1;
  const qP = await ort(iPunkt);
  const qW = await ort(iW);
  const fP = qP ? await farbeBei(qP.x, qP.y) : null;
  const fW = qW ? await farbeBei(qW.x, qW.y) : null;
  // die Linie zwischen zwei Punkten (die Mitte des Stücks im Bild)
  const qN = await ort(iPunkt + 1);
  const fL = qP && qN ? await farbeBei((qP.x + qN.x) / 2, (qP.y + qN.y) / 2, 1.5) : null;
  ok(
    'F2 zu: die Punkte der Lippe türkis, die Linie dazwischen in Tinte, der Mundwinkel schwarz',
    !!fP && !!fW && !!fL && nah(fP.bunt, TUERKIS) && fW.buntheit < 60 && fL.buntheit < 60,
    `Punkt ${fP ? hex(fP.bunt) : '–'} (soll ${hex(TUERKIS)}), Linie dazwischen Buntheit ${fL ? fL.buntheit : '–'}, Mundwinkel Buntheit ${fW ? fW.buntheit : '–'}`,
  );
  await bild('f2-zu');

  // P4 ein Anker der Lippe gegriffen: die Lippe geht (nicht der Punkt der Linie im Maul dahinter)
  if (qP) {
    const vorP = lippe.punkte[iPunkt];
    const ziel = await imBild(vorP.x, vorP.y - 6, vorP.z);
    const von = await imBild(vorP.x, vorP.y, vorP.z);
    await s.mouse.move(von.x, von.y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    for (let k = 1; k <= 8; k++) {
      await s.mouse.move(von.x + ((ziel.x - von.x) * k) / 8, von.y + ((ziel.y - von.y) * k) / 8);
      await s.waitForTimeout(40);
    }
    await s.mouse.up();
    await ruhig();
    const Ln = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const ging = Ln ? Math.hypot(Ln.punkte[iPunkt].x - vorP.x, Ln.punkte[iPunkt].y - vorP.y) : 0;
    ok('P4 ein Anker der Lippe, in der Seite gegriffen, zieht die Lippe', ging > 4, `der Punkt der Lippe ging ${ging.toFixed(2)} (gezogen um 6)`);
    await s.keyboard.press('Meta+z');
    await ruhig();
    await abwaehlen();
  }

  // F3 „Fressen“ an: oben rosa, unten blau
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1200);
  await ruhig();
  await s.mouse.move(40, 420);
  await s.waitForTimeout(500);
  {
    // welche Hälfte oben liegt, sagt das Bild: der höhere der zwei Zwillinge
    const a = await ort(iPunkt);
    const b = await ort(n - 1 - iPunkt);
    const [oben, unten] = a && b && a.y < b.y ? [a, b] : [b, a];
    const fo = oben ? await farbeBei(oben.x, oben.y) : null;
    const fu = unten ? await farbeBei(unten.x, unten.y) : null;
    const w = await ort(iW);
    const fw = w ? await farbeBei(w.x, w.y, 1.2) : null;
    // die Linie je Lippe: die Mitte zwischen zwei Punkten derselben Lippe
    const a2 = await ort(iPunkt + (iPunkt + 1 < iW ? 1 : -1));
    const b2 = await ort(n - 1 - iPunkt - (iPunkt + 1 < iW ? 1 : -1));
    const [oben2, unten2] = a && b && a.y < b.y ? [a2, b2] : [b2, a2];
    const flo = oben && oben2 ? await farbeBei((oben.x + oben2.x) / 2, (oben.y + oben2.y) / 2, 1.5) : null;
    const flu = unten && unten2 ? await farbeBei((unten.x + unten2.x) / 2, (unten.y + unten2.y) / 2, 1.5) : null;
    ok(
      'F3 „Fressen“ an: die Oberlippe rosa, die Unterlippe blau (Punkte und Linie)',
      !!fo && !!fu && !!flo && !!flu && nah(fo.bunt, ROSA) && nah(fu.bunt, BLAU) && nah(flo.bunt, ROSA, 110) && nah(flu.bunt, BLAU, 110),
      `Punkt oben ${fo ? hex(fo.bunt) : '–'} (soll ${hex(ROSA)}), unten ${fu ? hex(fu.bunt) : '–'} (soll ${hex(BLAU)}); Linie oben ${flo ? hex(flo.bunt) : '–'}, unten ${flu ? hex(flu.bunt) : '–'}; am Mundwinkel der dunkelste Bildpunkt ${fw ? hex(fw.dunkel) : '–'}`,
    );
    await bild('f3-fressen');
  }
  await s.click('#fressen-knopf');
  await s.waitForTimeout(1200);
  await ruhig();

  // F4 Lippen getrennt
  if (qP) {
    await klick(qP.x, qP.y);
    await s.waitForTimeout(400);
    if ((await O('pose')).tropfen === 'Lippen trennen') {
      await s.click('#maul-tropfen');
      await s.waitForTimeout(600);
      await ruhig();
    }
    await abwaehlen();
    await s.mouse.move(40, 420);
    await s.waitForTimeout(500);
    const getrennt = (await O('werkLinienDaten')).find((l) => l.maulEcht)?.maulLinie === null;
    const fz = await farbeBei(qP.x, qP.y);
    // der Punkt der Unterlippe, knapp unter der Linie gegriffen und nach unten gezogen
    const vorP = lippe.punkte[iPunkt];
    const von = await imBild(vorP.x, vorP.y - 1.5, vorP.z);
    const ziel = await imBild(vorP.x, vorP.y - 9, vorP.z);
    await s.mouse.move(von.x, von.y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    for (let k = 1; k <= 8; k++) {
      await s.mouse.move(von.x + ((ziel.x - von.x) * k) / 8, von.y + ((ziel.y - von.y) * k) / 8);
      await s.waitForTimeout(40);
    }
    await s.mouse.up();
    await ruhig();
    await abwaehlen();
    await s.mouse.move(40, 420);
    await s.waitForTimeout(500);
    const Lg = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    // welcher der zwei Punkte ging: der gezogene liegt tiefer (y des Werks kleiner)
    const pa = Lg.punkte[iPunkt];
    const pb = Lg.punkte[n - 1 - iPunkt];
    const [gezogen, geblieben] = pa.y < pb.y ? [iPunkt, n - 1 - iPunkt] : [n - 1 - iPunkt, iPunkt];
    const qg = await ort(gezogen);
    const qb = await ort(geblieben);
    const fg = qg ? await farbeBei(qg.x, qg.y) : null;
    const fb = qb ? await farbeBei(qb.x, qb.y) : null;
    ok(
      'F4 Lippen getrennt: zu liegt die Oberlippe vorn (rosa); der nach unten gezogene Punkt ist blau, der gebliebene rosa',
      getrennt && nah(fz.bunt, ROSA) && !!fg && !!fb && nah(fg.bunt, BLAU) && nah(fb.bunt, ROSA),
      `getrennt ${getrennt ? 'ja' : 'nein'}; aufeinander ${hex(fz.bunt)} (soll ${hex(ROSA)}); gezogen ${fg ? hex(fg.bunt) : '–'} (soll ${hex(BLAU)}), geblieben ${fb ? hex(fb.bunt) : '–'}; die Punkte liegen ${Math.abs(pa.y - pb.y).toFixed(1)} auseinander`,
    );
    await bild('f4-getrennt');
  }
}
// ---------- U1 bis U3: die Linie am Umriss ----------
// (zurück zur Form ohne Maul; wo die gezeichnete Linie den Umriss kreuzt, sagt das Ende der Lippe von eben)
{
  const Lp = (await O('werkLinienDaten')).find((l) => l.maulEcht);
  const amUmriss = Lp ? [Lp.punkte[0].x, Lp.punkte[0].y] : null;
  for (let k = 0; k < 12 && (await O('werkLinienDaten')).some((l) => l.maulEcht); k++) {
    await s.keyboard.press('Meta+z');
    await ruhig();
  }
  await abwaehlen();
  await s.keyboard.press('a');
  await s.waitForTimeout(400);
  const davor = await O('werkLinienDaten');
  const zahl = (L) => L.map((l) => `${l.id}:${l.punkte.length}`).join(' ');
  // ein Ende in der Form, an dem P nichts fängt: vom Umriss aus in Richtung des Mundwinkels gefächert, weit genug von jeder Linie
  let innenOrt = null;
  if (amUmriss) {
    const Cw = LINIE[LINIE.length - 1];
    const lang = Math.hypot(Cw[0] - amUmriss[0], Cw[1] - amUmriss[1]);
    const w0 = Math.atan2(Cw[1] - amUmriss[1], Cw[0] - amUmriss[0]);
    aussen: for (const f of [1, 0.8, 0.6, 1.25]) {
      for (const dw of [0, -0.2, 0.2, -0.4, 0.4, -0.6, 0.6, -0.8, 0.8]) {
        const T = [amUmriss[0] + f * lang * Math.cos(w0 + dw), amUmriss[1] + f * lang * Math.sin(w0 + dw)];
        const q = await imBild(T[0], T[1]);
        if ((await O('formUnter', q.x, q.y)) && (await O('linienAbstand', q.x, q.y)) > 14) {
          innenOrt = T;
          break aussen;
        }
      }
    }
  }
  if (!amUmriss || !innenOrt) ok('U1 die Linie am Umriss', false, 'keine Stelle am Umriss oder kein freies Ende in der Form gefunden');
  else {
    // U1 auf dem Umriss begonnen
    await zeichnen([amUmriss, innenOrt]);
    const st = await O('maulStrich');
    const p = await O('pose');
    const dabei = await O('werkLinienDaten');
    ok(
      'U1 auf dem Umriss begonnen, mit ↩ in der Form beendet: Der Strich wartet mit dem Tropfen „Maul“, die Linien der Form sind wie vorher',
      !!st && st.innenAmEnde && p.tropfen === 'Maul' && st.anker === 2 && zahl(dabei) === zahl(davor),
      `Strich ${st ? `${st.anker} Anker, Mundwinkel am ${st.innenAmEnde ? 'Ende' : 'Anfang'}` : 'keiner'}; Tropfen ${p.tropfen ?? 'keiner'}; Linien ${zahl(dabei) === zahl(davor) ? 'unverändert' : 'verändert'}; Meldung: ${((await O('werk')).meldung ?? '').slice(0, 90)}`,
    );
    await bild('u1-strich-am-umriss');
    // U2 der Tropfen macht das Maul
    if (st) {
      await s.click('#maul-tropfen');
      await s.waitForFunction(() => !window.__ozzy.maulStrich() || /Maul geht hier nicht/.test(window.__ozzy.werk().meldung ?? ''), null, { timeout: 60000 }).catch(() => {});
      await s.waitForTimeout(3500);
      await ruhig();
    }
    const L2 = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const w2 = await O('werk');
    ok('U2 der Tropfen macht daraus das Maul, das Werk kommt zur Ruhe', !!L2 && L2.punkte.length % 2 === 1, `Lippe ${L2 ? `${L2.punkte.length} Punkte` : 'fehlt'}; umgeschlagen ${w2.umgeschlagen}; Meldung: ${(w2.meldung ?? '').slice(0, 80)}`);
    await bild('u2-maul-vom-umriss');
    for (let k = 0; k < 4 && (await O('werkLinienDaten')).some((l) => l.maulEcht); k++) {
      await s.keyboard.press('Meta+z');
      await ruhig();
    }
    await abwaehlen();
    await s.keyboard.press('a');
    await s.waitForTimeout(300);
    // U3 andersherum: im Mundwinkel begonnen, der letzte Klick auf dem Umriss
    await zeichnen([innenOrt, amUmriss]);
    const st3 = await O('maulStrich');
    const p3 = await O('pose');
    ok(
      'U3 andersherum (im Mundwinkel begonnen, der letzte Klick auf dem Umriss): Der Strich wartet ebenso',
      !!st3 && !st3.innenAmEnde && p3.tropfen === 'Maul',
      `Strich ${st3 ? `${st3.anker} Anker, Mundwinkel am ${st3.innenAmEnde ? 'Ende' : 'Anfang'}` : 'keiner'}; Tropfen ${p3.tropfen ?? 'keiner'}; Meldung: ${((await O('werk')).meldung ?? '').slice(0, 90)}`,
    );
    await s.keyboard.press('Escape');
    await s.waitForTimeout(300);
  }
}
ok('K keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 4).join(' | '));
console.log(schlecht ? `${schlecht} Kriterien nicht erfüllt` : 'alle Kriterien erfüllt');
await browser.close();
process.exit(schlecht ? 1 : 0);
