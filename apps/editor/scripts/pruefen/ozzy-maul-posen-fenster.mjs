// Ozzy, die Posen (Plan „Maul, Zähne, Zunge“, Etappe 8, 21.11.2026; `docs/plans/2026-11-21-ozzy-maul-etappe-8-posen.md`), an „teat
// firefish“ (NAME) auf Wachs, in der eingerasteten Seite, nah am Maul. Das Maul wird geschnitten, die Lippen bleiben verbunden.
// Scheibe 1 (in der Pose ist jede Lippe frei, und die Grundform bleibt):
//   P1 In „Fressen“ einen inneren Punkt der Unterlippe 20 Bildpunkte nach unten ziehen: Er geht (keine Meldung zur Maullinie), sein
//      Zwilling an der Oberlippe bleibt (höchstens 0,05); das Werk kommt zur Ruhe; ein Schritt, ⌘Z nimmt ihn.
//   P2 „Fressen“ aus: Die Linien der Grundform sind höchstens 0,01 bewegt, ihre Lippen liegen aufeinander (höchstens 0,06), die
//      Lippe ist wieder zusammengeklappt; die gezeigte Haut (die glatte Anzeige) liegt höchstens 1 neben der von vorher und an
//      höchstens 1 % ihrer Proben mehr als 0,05 daneben; in der freien Haut ist kein Dreieck mehr umgeschlagen als vorher (Dreiecke,
//      deren Ecken alle auf Linien liegen, werden genannt, aber nicht gewertet: Liste, Punkt 155). (Berichtigt am 21.11.: Zuerst
//      stand hier „die Haut höchstens 0,05“. Das Netz ist beiden Lagen gemeinsam und richtet sich nach der, in der gearbeitet wird:
//      Legt es in der Pose Punkte zusammen, fehlen sie auch der Grundform, und ihre Fläche weicht dort um die Feinheit des Netzes
//      ab, die es ohnehin hat: ein Sechzehntel der Startkante, rund 0,9. Neue Punkte liegen auf ihrer runden Fläche.)
//   P3 „Fressen“ wieder an: Die Linien der Pose sind wie verlassen (höchstens 0,01).
//   P4 Das große Maul: alle inneren Punkte der Unterlippe 40 nach unten, der Oberlippe 30 nach oben. Keine Linie hat danach einen
//      Punkt mehr; nach „Fressen“ aus gilt P2.
//   P5 Zähne an, in der Pose: Ihr Netz ist endlich; nach einem weiteren Zug an der Unterlippe steht ein Zahn woanders.
//   P6 In der Pose: P auf eine Linie und ⌫ auf einen gewählten Punkt ändern nichts (Meldung); „Lippen trennen“ hängt nicht.
//   P7 In der Pose gesichert und neu geladen: Die Pose ist an, ihre Linien und die der Grundform sind wie vorher (höchstens 0,01).
//   P8 Tempo: Der Zug aus P1 rechnet je Bild im Mittel nicht mehr als derselbe Zug in der Grundform (höchstens ein Fünftel und
//      2 ms darüber).
//   K  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] [BIS=P3|P4|P6] node scripts/pruefen/ozzy-maul-posen-fenster.mjs [ordner]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const BIS = process.env.BIS ?? '';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const PROBE = 'ozzy-probe-posen';
const datei = `${fileURLToPath(new URL('../../../../wesen/', import.meta.url))}${PROBE}.eewesen`;
const aufraeumen = () => {
  if (fs.existsSync(datei)) fs.unlinkSync(datei);
};
aufraeumen();
const browser = await chromium.launch({ args: process.env.GPU === '1' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const fehler = [];
let schlecht = 0;
const ok = (name, gut, text = '') => {
  if (!gut) schlecht++;
  console.log(`${gut ? 'gut ' : 'FEHL'} ${name}${text ? `: ${text}` : ''}`);
};
/** eine Seite von Ozzy mit ihren Helfern */
const seite = async (form) => {
  const s = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  s.on('pageerror', (e) => fehler.push(String(e)));
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  await flickenAnlegen(s, undefined, fehler);
  await s.goto(`${basis}?form=${encodeURIComponent(form)}`);
  await s.waitForFunction(() => !!window.__ozzy);
  const O = (f, ...a) => s.evaluate(([f2, a2]) => window.__ozzy[f2](...a2), [f, a]);
  const ruhig = async (zeit = 120000) => {
    await s.waitForTimeout(300);
    await s.waitForFunction(() => window.__ozzy.bearbeiten().an && !window.__ozzy.bearbeiten().beschaeftigt && !window.__ozzy.werk().beschaeftigt, null, { timeout: zeit });
    await s.waitForTimeout(200);
  };
  const klick = async (x, y) => {
    await s.mouse.move(x, y);
    await s.waitForTimeout(250);
    await s.mouse.down();
    await s.waitForTimeout(60);
    await s.mouse.up();
    await s.waitForTimeout(250);
  };
  const ziehen = async (x, y, dx, dy, pause = 30) => {
    await s.mouse.move(x - 4, y - 4);
    await s.waitForTimeout(150);
    await s.mouse.move(x, y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    await s.waitForTimeout(80);
    for (let i = 1; i <= 12; i++) {
      await s.mouse.move(x + (dx * i) / 12, y + (dy * i) / 12);
      await s.waitForTimeout(pause);
    }
    await s.waitForTimeout(200);
    await s.mouse.up();
    await s.waitForTimeout(500);
  };
  /** in der eingerasteten Seite nah ans Maul */
  const heran = async (zoom) => {
    let b = await O('blickSetzen', { zoom });
    await s.waitForTimeout(700);
    for (let i = 0; i < 4; i++) {
      const q = await O('werkImBild', { x: -720, y: 150, z: 0 });
      b = await O('blickSetzen', { schwenkX: b.schwenkX + (640 - q.x), schwenkY: b.schwenkY + (450 - q.y) });
      await s.waitForTimeout(500);
    }
  };
  const fressen = async () => {
    await s.click('#fressen-knopf');
    await s.waitForTimeout(1500);
    await ruhig();
  };
  const linien = async () => (await O('werkLinienDaten')).map((l) => ({ id: l.id, maulLinie: l.maulLinie, echt: l.maulEcht, p: l.punkte.map((q) => [q.x, q.y, q.z]) }));
  const meldung = () => s.evaluate(() => document.getElementById('hinweis')?.textContent ?? '');
  /** die Punkte einer Linie in der Seite: Nummer und Ort im Bild (ohne Spiegelbild) */
  const imBild = async (id, n) => {
    const aus = [];
    for (let i = 0; i < n; i++) {
      const A = (await O('ankerImBild', id, i, 'seite')).filter((q) => !q.m);
      if (A[0]) aus.push({ i, x: A[0].x, y: A[0].y, sichtbar: A[0].sichtbar, verdeckt: A[0].verdeckt });
    }
    return aus;
  };
  const bild = async (name) => {
    if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-posen-${name}.png` });
  };
  return { s, O, ruhig, klick, ziehen, heran, fressen, linien, meldung, imBild, bild };
};
/** wie weit sich Linien bewegt haben (Punkt für Punkt); Infinity: andere Punktzahl oder eine Linie fehlt */
const weit = (A, B) => {
  let m = 0;
  for (const a of A) {
    const b = B.find((x) => x.id === a.id);
    if (!b || b.p.length !== a.p.length) return Infinity;
    a.p.forEach((q, i) => {
      m = Math.max(m, Math.hypot(q[0] - b.p[i][0], q[1] - b.p[i][1], q[2] - b.p[i][2]));
    });
  }
  return B.length === A.length ? m : Infinity;
};
const zahlen = (A) => A.map((l) => `${l.id}:${l.p.length}`).join(' ');
/** der größte Abstand der Punkte `P` (jeder dritte) von der Fläche (`Q`, `tri`), mit einem Gitter über den Dreiecken */
const nebenFlaeche = (P, Q, tri) => {
  const zelle = 12;
  const gitter = new Map();
  const schl = (x, y, z) => `${Math.floor(x / zelle)},${Math.floor(y / zelle)},${Math.floor(z / zelle)}`;
  for (let t = 0; t < tri.length; t += 3) {
    const a = 3 * tri[t];
    const b = 3 * tri[t + 1];
    const c = 3 * tri[t + 2];
    const x0 = Math.min(Q[a], Q[b], Q[c]);
    const x1 = Math.max(Q[a], Q[b], Q[c]);
    const y0 = Math.min(Q[a + 1], Q[b + 1], Q[c + 1]);
    const y1 = Math.max(Q[a + 1], Q[b + 1], Q[c + 1]);
    const z0 = Math.min(Q[a + 2], Q[b + 2], Q[c + 2]);
    const z1 = Math.max(Q[a + 2], Q[b + 2], Q[c + 2]);
    for (let x = Math.floor(x0 / zelle); x <= Math.floor(x1 / zelle); x++)
      for (let y = Math.floor(y0 / zelle); y <= Math.floor(y1 / zelle); y++)
        for (let z = Math.floor(z0 / zelle); z <= Math.floor(z1 / zelle); z++) {
          const k = `${x},${y},${z}`;
          let L = gitter.get(k);
          if (!L) gitter.set(k, (L = []));
          L.push(t);
        }
  }
  const zuDreieck = (p, a, b, c) => {
    const ab = [Q[b] - Q[a], Q[b + 1] - Q[a + 1], Q[b + 2] - Q[a + 2]];
    const ac = [Q[c] - Q[a], Q[c + 1] - Q[a + 1], Q[c + 2] - Q[a + 2]];
    const ap = [p[0] - Q[a], p[1] - Q[a + 1], p[2] - Q[a + 2]];
    const d = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const d00 = d(ab, ab);
    const d01 = d(ab, ac);
    const d11 = d(ac, ac);
    const d20 = d(ap, ab);
    const d21 = d(ap, ac);
    const de = d00 * d11 - d01 * d01 || 1e-30;
    let v = (d11 * d20 - d01 * d21) / de;
    let w = (d00 * d21 - d01 * d20) / de;
    // (außerhalb des Dreiecks: auf die nächste Kante, grob: Gewichte in das Dreieck gedrückt)
    v = Math.max(0, Math.min(1, v));
    w = Math.max(0, Math.min(1 - v, w));
    return Math.hypot(ap[0] - v * ab[0] - w * ac[0], ap[1] - v * ab[1] - w * ac[1], ap[2] - v * ab[2] - w * ac[2]);
  };
  let max = 0;
  for (let i = 0; i < P.length; i += 9) {
    const p = [P[i], P[i + 1], P[i + 2]];
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const L = gitter.get(schl(p[0] + dx * zelle, p[1] + dy * zelle, p[2] + dz * zelle));
          if (!L) continue;
          for (const t of L) best = Math.min(best, zuDreieck(p, 3 * tri[t], 3 * tri[t + 1], 3 * tri[t + 2]));
        }
    if (best < Infinity) max = Math.max(max, best);
  }
  return max;
};

try {
  const A = await seite(NAME);
  const { s, O, ruhig, klick, ziehen, heran, fressen, linien, meldung, imBild, bild } = A;
  await ruhig();
  await O('material', 'wachs');
  await s.keyboard.press('1');
  await s.waitForTimeout(1500);
  await ruhig();
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  for (const [x, y] of LINIE) {
    const q = await O('werkImBild', { x, y, z: 0 });
    await klick(q.x, q.y);
  }
  await s.keyboard.press('Enter');
  await s.waitForTimeout(500);
  await s.click('#maul-tropfen');
  await s.waitForFunction(() => !window.__ozzy.maulStrich(), null, { timeout: 60000 }).catch(() => {});
  await ruhig();
  await s.waitForTimeout(2500);
  await ruhig();
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
  await s.keyboard.press('1');
  await s.waitForTimeout(1500);
  await ruhig();
  await heran(5);

  const G0 = await linien();
  const R0 = await O('werkRoh');
  // die gezeigte Haut der Grundform am Anfang: Proben in der Welt (jeder 23. Punkt der glatten Anzeige), `f`: Einheiten des Werks je Pixel
  const S0 = await O('hautStand', true);
  const f0 = (await O('werk')).f;
  /** umgeschlagene Dreiecke mit mindestens einer Ecke in der freien Haut (nicht auf einer Linie): Für sie steht der Ort neuer Punkte */
  const inFreierHaut = (um) => um.liste.filter((q) => q.linien.some((x) => !x)).length;
  const um0 = await O('umgeschlagen');
  const umgeschlagen0 = um0.zahl;
  const frei0 = inFreierHaut(um0);
  const proben0 = [];
  for (let i = 0; i + 2 < S0.proben.length; i += 3) proben0.push([S0.proben[i], S0.proben[i + 1], S0.proben[i + 2]]);
  const lippe = G0.find((l) => l.echt);
  const n = lippe.p.length;
  const paarWeit = (D) => {
    const l = D.find((x) => x.id === lippe.id);
    let m = 0;
    for (let i = 1; i < (n - 1) / 2; i++) m = Math.max(m, Math.hypot(l.p[i][0] - l.p[n - 1 - i][0], l.p[i][1] - l.p[n - 1 - i][1], l.p[i][2] - l.p[n - 1 - i][2]));
    return m;
  };
  /** die inneren Punkte der Lippen im Bild der Pose: unten (größeres y als ihr Zwilling) und oben, von vorn nach hinten */
  const lippenImBild = async () => {
    const P = await imBild(lippe.id, n);
    const innen = P.filter((p) => p.i !== 0 && p.i !== n - 1 && p.i !== (n - 1) / 2);
    const paar = (p) => P.find((q) => q.i === n - 1 - p.i);
    return { unten: innen.filter((p) => paar(p) && p.y > paar(p).y + 3).sort((a, b) => a.x - b.x), oben: innen.filter((p) => paar(p) && p.y < paar(p).y - 3).sort((a, b) => a.x - b.x) };
  };
  /** die Grundform gegen den Anfang: Linien, Paare, Zeichen der Lippe, Haut */
  const grundform = async () => {
    const G = await linien();
    const R = await O('werkRoh');
    const l = G.find((x) => x.id === lippe.id);
    // die gezeigte Haut gegen die vom Anfang: wie weit die Proben von damals neben der Fläche von jetzt liegen (Einheiten des Werks)
    const d = (await O('hautAbstand', proben0)).map((x) => x * f0);
    const gezeigt = { max: Math.max(0, ...d), ueber: d.filter((x) => x > 0.05).length / Math.max(1, d.length) };
    const um = await O('umgeschlagen');
    const umgeschlagen = um.zahl;
    const frei = inFreierHaut(um);
    const umText = um.zahl > umgeschlagen0 ? ` [${um.liste.slice(0, 8).map((q) => `bei ${q.mitte.map((x) => x.toFixed(0)).join('/')} Fläche ${q.flaeche.toFixed(3)} der mittleren, Linien ${q.linien.map((x) => x || 'frei').join(',')}`).join('; ')}]` : '';
    const gut = weit(G0, G) < 0.01 && paarWeit(G) < 0.06 && l?.maulLinie !== null && l?.maulLinie !== undefined && gezeigt.max <= 1 && gezeigt.ueber <= 0.01 && frei <= frei0;
    const text = `Linien ${z2(weit(G0, G))}; Paare höchstens ${z2(paarWeit(G))}; zusammengeklappt ${l?.maulLinie !== null && l?.maulLinie !== undefined ? 'ja' : 'NEIN'}; gezeigte Haut höchstens ${z2(gezeigt.max)} neben vorher, ${(100 * gezeigt.ueber).toFixed(2).replace('.', ',')} % der Proben über 0,05; umgeschlagen in der freien Haut ${frei} (vorher ${frei0}), zwischen Linien ${umgeschlagen - frei} (vorher ${umgeschlagen0 - frei0})${umText}; Rechennetz ${R0.pos.length / 3} → ${R.pos.length / 3} Punkte, seine Punkte von vorher höchstens ${z2(nebenFlaeche(R0.pos, R.pos, R.tri))} neben der Fläche von jetzt`;
    return { gut, text, G };
  };
  const z2 = (x) => (Number.isFinite(x) ? x.toFixed(3).replace('.', ',') : 'andere Punktzahl');

  // P8 (vorab): derselbe Zug in der Grundform, zum Vergleich des Tempos (danach ⌘Z)
  let tempoGrund = 0;
  {
    const P = await imBild(lippe.id, n);
    const u = P.find((p) => p.i === 2) ?? P[1];
    await s.mouse.move(u.x - 4, u.y - 4);
    await s.waitForTimeout(150);
    await s.mouse.move(u.x, u.y + 2);
    await s.waitForTimeout(300);
    await s.mouse.down();
    await s.mouse.move(u.x, u.y + 6);
    await s.waitForTimeout(300);
    await O('messen', true);
    for (let i = 0; i < 40; i++) {
      await s.mouse.move(u.x + 3 * Math.sin(i / 4), u.y + 12 + 6 * Math.cos(i / 5));
      await s.waitForTimeout(12);
    }
    const b = await O('messen', false);
    await s.mouse.up();
    await ruhig();
    tempoGrund = b.reduce((a, q) => a + q.ms, 0) / Math.max(1, b.length);
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(800);
    await ruhig();
  }
  const G0b = await linien();
  const zurueckGenau = weit(G0, G0b);

  // ---------- P1: in „Fressen“ einen inneren Punkt der Unterlippe ziehen ----------
  await fressen();
  await bild('1-fressen');
  const PA = await linien();
  const schritte0 = (await O('kiefer')).schritte;
  let L = await lippenImBild();
  const u = L.unten[Math.floor(L.unten.length / 2)];
  let tempoPose = 0;
  {
    await s.mouse.move(u.x - 4, u.y - 4);
    await s.waitForTimeout(150);
    await s.mouse.move(u.x, u.y);
    await s.waitForTimeout(300);
    await s.mouse.down();
    await s.mouse.move(u.x, u.y + 6);
    await s.waitForTimeout(300);
    await O('messen', true);
    for (let i = 0; i < 40; i++) {
      await s.mouse.move(u.x + 3 * Math.sin(i / 4), u.y + 12 + 6 * Math.cos(i / 5));
      await s.waitForTimeout(12);
    }
    const b = await O('messen', false);
    tempoPose = b.reduce((a, q) => a + q.ms, 0) / Math.max(1, b.length);
    await s.mouse.move(u.x, u.y + 20);
    await s.waitForTimeout(200);
    await s.mouse.up();
    await s.waitForTimeout(500);
  }
  const m1 = await meldung();
  await ruhig();
  const P1 = await linien();
  const dPose = (X, Y, i) => {
    const a = X.find((x) => x.id === lippe.id).p[i];
    const b = Y.find((x) => x.id === lippe.id).p[i];
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };
  const ging = dPose(PA, P1, u.i);
  const zwilling = dPose(PA, P1, n - 1 - u.i);
  const schritte1 = (await O('kiefer')).schritte;
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(800);
  await ruhig();
  const P1z = await linien();
  // (noch einmal, für das Weitere)
  L = await lippenImBild();
  const u2 = L.unten.find((p) => p.i === u.i) ?? u;
  await ziehen(u2.x, u2.y, 0, 20);
  await ruhig();
  const P1b = await linien();
  ok(
    'P1 in „Fressen“ ein innerer Punkt der Unterlippe 20 Bildpunkte nach unten: Er geht, sein Zwilling bleibt; ein Schritt, ⌘Z nimmt ihn',
    !/Maullinie/.test(m1) && ging > 2 && zwilling < 0.05 && schritte1 === schritte0 + 1 && weit(PA, P1z) < 0.01 && dPose(PA, P1b, u.i) > 2,
    `Punkt ${u.i} ging ${z2(ging)}, sein Zwilling ${n - 1 - u.i} ${z2(zwilling)}; Schritte +${schritte1 - schritte0}; nach ⌘Z ${z2(weit(PA, P1z))} neben vorher${/Maullinie/.test(m1) ? '; Meldung „' + m1.slice(0, 60) + '“' : ''}`,
  );
  await bild('1-lippe-gezogen');

  // ---------- P2: „Fressen“ aus ----------
  const poseVor = await linien();
  await fressen();
  const g2 = await grundform();
  ok('P2 „Fressen“ aus: die Linien der Grundform wie vorher, ihre Lippen liegen aufeinander und sind zusammengeklappt, die gezeigte Haut ist die von vorher', g2.gut && zurueckGenau < 0.01, g2.text);
  await bild('2-grundform');

  // ---------- P3: wieder an ----------
  await fressen();
  const P3 = await linien();
  ok('P3 „Fressen“ wieder an: die Linien der Pose wie verlassen', weit(poseVor, P3) < 0.01, `höchstens ${z2(weit(poseVor, P3))} neben vorher`);
  if (BIS === 'P3') throw new Error('BIS');

  // ---------- P4: das große Maul ----------
  const zahlenVor = zahlen(await linien());
  for (let k = 0; k < 6; k++) {
    L = await lippenImBild();
    const p = k < 3 ? L.unten[k] : L.oben[k - 3];
    if (!p) continue;
    await ziehen(p.x, p.y, 0, k < 3 ? 40 : -30);
    await ruhig();
  }
  const P4 = await linien();
  const zahlenNach = zahlen(P4);
  await bild('4-grosses-maul');
  await fressen();
  const g4 = await grundform();
  await bild('4-grundform');
  ok('P4 das große Maul (alle inneren Punkte der Lippen weit gezogen): keine Linie hat einen Punkt mehr; die Grundform ist die von vorher', zahlenVor === zahlenNach && g4.gut, `Punkte je Linie ${zahlenVor === zahlenNach ? 'gleich' : `ANDERS (${zahlenVor} → ${zahlenNach})`}; Grundform: ${g4.text}`);
  await fressen();
  const P4b = await linien();
  ok('P4b wieder in der Pose: das große Maul steht, wie es verlassen wurde', weit(P4, P4b) < 0.01, `höchstens ${z2(weit(P4, P4b))} neben vorher`);
  if (BIS === 'P4') throw new Error('BIS');

  // ---------- P5: Zähne in der Pose ----------
  // (die Zähne über den Haken: Der Tropfen öffnete die Linse, und solange sie offen ist, gehen die Zähne den Linien vor)
  await O('zaehne', 'anfang');
  await s.waitForTimeout(1500);
  await ruhig();
  const z5 = await O('zaehne');
  const fuesse = (await O('zaehneImBild')).filter((t) => t.unten && !t.gespiegelt).map((t) => ({ i: t.i, x: t.fuss[0], y: t.fuss[1] }));
  L = await lippenImBild();
  const p5 = L.unten[1] ?? L.unten[0];
  const vor5 = await linien();
  await ziehen(p5.x, p5.y, 0, 16);
  await ruhig();
  const lippe5 = dPose(vor5, await linien(), p5.i);
  const fuesse2 = (await O('zaehneImBild')).filter((t) => t.unten && !t.gespiegelt).map((t) => ({ i: t.i, x: t.fuss[0], y: t.fuss[1] }));
  let zahnWeg = 0;
  for (const a of fuesse) {
    const b = fuesse2.find((q) => q.i === a.i);
    if (b) zahnWeg = Math.max(zahnWeg, Math.hypot(a.x - b.x, a.y - b.y));
  }
  const z5b = await O('zaehne');
  ok('P5 Zähne in der Pose (Linse zu): ein Punkt der Unterlippe lässt sich greifen, die Zähne gehen mit; ihr Netz ist endlich', !!z5.netz && z5.netz.endlich && !!z5b.netz && z5b.netz.endlich && !z5.linse.offen && lippe5 > 2 && zahnWeg > 2, `${z5.plaetze.length} Zähne, Linse ${z5.linse.offen ? 'OFFEN' : 'zu'}; Punkt ${p5.i} der Lippe ging ${z2(lippe5)}; der weiteste Fuß eines Zahns ging ${zahnWeg.toFixed(1)} Bildpunkte`);
  await bild('5-zaehne');

  // ---------- P6: in der Pose keine neuen Punkte, kein Löschen, kein „Lippen trennen“ ----------
  const vor6 = await linien();
  await s.keyboard.press('p');
  await s.waitForTimeout(300);
  L = await lippenImBild();
  const a6 = L.unten[0];
  const b6 = L.unten[1] ?? L.unten[0];
  await klick((a6.x + b6.x) / 2, (a6.y + b6.y) / 2);
  const m6a = await meldung();
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
  await s.keyboard.press('a');
  await s.waitForTimeout(300);
  L = await lippenImBild();
  await klick(L.unten[0].x, L.unten[0].y);
  const tropfen6 = (await O('pose')).tropfen;
  await s.keyboard.press('Backspace');
  await s.waitForTimeout(500);
  const m6b = await meldung();
  await ruhig();
  const nach6 = await linien();
  await s.keyboard.press('Escape');
  await s.waitForTimeout(300);
  ok(
    'P6 in der Pose: P auf eine Linie und ⌫ auf einen gewählten Punkt ändern nichts (Meldung); „Lippen trennen“ hängt nicht',
    zahlen(vor6) === zahlen(nach6) && weit(vor6, nach6) < 0.01 && /Grundform/.test(m6b) && !/Lippen/.test(tropfen6 ?? ''),
    `Linien ${zahlen(vor6) === zahlen(nach6) ? 'gleich viele Punkte' : 'ANDERS'}, ${z2(weit(vor6, nach6))} bewegt; nach P: „${m6a.slice(0, 50)}“; nach ⌫: „${m6b.slice(0, 50)}“; Tropfen ${tropfen6 ?? 'keiner'}`,
  );
  if (BIS === 'P6') throw new Error('BIS');

  // ---------- P7: in der Pose sichern, neu laden ----------
  const pose7 = await linien();
  await fressen();
  const grund7 = await linien();
  await fressen();
  const text7 = await O('sichern', PROBE);
  await s.waitForTimeout(800);
  const B = await seite(PROBE);
  await B.ruhig();
  const an7 = (await B.O('pose')).an;
  const pose7b = await B.linien();
  if (an7) await B.fressen();
  const grund7b = await B.linien();
  ok(
    'P7 in der Pose gesichert und neu geladen: die Pose ist an, ihre Linien und die der Grundform sind wie vorher',
    fs.existsSync(datei) && an7 && weit(pose7, pose7b) < 0.01 && weit(grund7, grund7b) < 0.01 && !pose7b.find((l) => l.echt)?.maulLinie && !!grund7b.find((l) => l.echt)?.maulLinie,
    `Meldung „${String(text7).slice(0, 50)}“; Pose an: ${an7}; Linien der Pose ${z2(weit(pose7, pose7b))}, der Grundform ${z2(weit(grund7, grund7b))} neben vorher`,
  );
  await B.s.close();

  // ---------- P8: Tempo ----------
  ok('P8 Tempo: Der Zug an der Lippe rechnet in der Pose je Bild nicht mehr als in der Grundform (höchstens ein Fünftel und 2 ms darüber)', tempoPose > 0 && tempoPose <= 1.2 * tempoGrund + 2, `Grundform ${tempoGrund.toFixed(1)} ms, Pose ${tempoPose.toFixed(1)} ms je Bild`);
} catch (e) {
  if (String(e?.message) !== 'BIS') {
    schlecht++;
    console.log('FEHL Abbruch:', String(e?.stack ?? e).slice(0, 600));
  }
} finally {
  aufraeumen();
}
ok('K keine Fehler in der Konsole', fehler.length === 0, fehler.slice(0, 3).join(' | '));
await browser.close();
console.log(schlecht ? `\n${schlecht} Kriterien nicht erfüllt` : '\nalle Kriterien erfüllt');
process.exit(schlecht ? 1 : 0);
