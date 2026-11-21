// Ozzy, mehrere Posen (Plan „Maul, Zähne, Zunge“, Etappe 8, Scheibe 3, 21.11.2026; `docs/plans/2026-11-21-ozzy-maul-etappe-8-posen.md`,
// Abschnitt 7), an „teat firefish“ (NAME) auf Wachs, in der eingerasteten Seite, nah am Maul. Das Maul wird geschnitten.
//   R1 In „Fressen“ auf Plus: Eine zweite Pose „Pose 2“ ist gewählt; gezeigte Haut und Winkel wie in „Fressen“ (Haut höchstens 0,01
//      anders); ein Schritt, ⌘Z nimmt sie, die Reihe zeigt wieder einen Tropfen für Posen.
//   R2 In Pose 2 einen Punkt der Lippe und einen Punkt fern vom Maul ziehen, den Unterkiefer weiter öffnen; dann „Fressen“, dann
//      Grundform: „Fressen“ hat seine Linien (höchstens 0,01) und Winkel behalten, die Grundform ihre Linien (höchstens 0,01).
//   R3 Aus „Fressen“ ein Tipp auf Pose 2: Die Fahrt geht direkt (der Winkel des Mauls läuft stetig vom einen zum anderen Wert und
//      verlässt den Bereich dazwischen nie); danach ist Pose 2 gewählt, ihre Linien wie verlassen (höchstens 0,01).
//   R4 Am Faden zwischen „Fressen“ und Pose 2 auf die Hälfte: Der Winkel des Mauls ist das Mittel beider Posen (höchstens 0,5°), der
//      in Pose 2 gezogene Punkt fern vom Maul steht in der Mitte seiner zwei Lagen (höchstens 5 % des Wegs); unter der Hälfte
//      losgelassen „Fressen“, darüber Pose 2.
//   R5 In Pose 2 das Maul weit formen (das Netz wächst), zurück: „Fressen“ und die Grundform haben ihre Linien (höchstens 0,01);
//      die gezeigte Haut beider liegt höchstens 1 neben vorher, höchstens 1 % der Proben über 0,05.
//   R6 Pose 2 halten, „Gähnen“ schreiben, ↩: Der Tropfen heißt so; ein Schritt, ⌘Z gibt „Pose 2“ zurück.
//   R7 In der zweiten Pose gesichert, neu geladen: zwei Posen mit ihren Namen, Winkeln und Linien (höchstens 0,01); die gewählte
//      ist gewählt.
//   R8 Den Tropfen der zweiten Pose auf den Mülleimer gezogen: Eine Pose bleibt, die Form steht in der Grundform; ⌘Z bringt die
//      Pose wieder (Linien höchstens 0,01). Die letzte Pose lässt sich nicht löschen.
//   R9 Tempo: Die Fahrt zwischen zwei Posen rechnet unterwegs je Bild im Mittel höchstens 16,7 ms.
//   K  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] [BIS=R2|R4|R5|R7] node scripts/pruefen/ozzy-maul-posen-reihe-fenster.mjs [ordner]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const BIS = process.env.BIS ?? '';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const PROBE = 'ozzy-probe-posen-reihe';
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
const z2 = (x) => (Number.isFinite(x) ? x.toFixed(3).replace('.', ',') : 'andere Punktzahl');
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
  const heran = async (zoom) => {
    let b = await O('blickSetzen', { zoom });
    await s.waitForTimeout(700);
    for (let i = 0; i < 4; i++) {
      const q = await O('werkImBild', { x: -720, y: 150, z: 0 });
      b = await O('blickSetzen', { schwenkX: b.schwenkX + (640 - q.x), schwenkY: b.schwenkY + (450 - q.y) });
      await s.waitForTimeout(500);
    }
  };
  /** ein Tipp auf einen Tropfen der Reihe (0: Grundform, k: die Pose k), dann warten, bis die Fahrt vorbei ist */
  const lage = async (k) => {
    await s.click(k === 0 ? '#pose-grundform' : `#posen button.pose[data-nr="${k}"]`);
    await s.waitForTimeout(1300);
    await ruhig();
  };
  const linien = async () => (await O('werkLinienDaten')).map((l) => ({ id: l.id, maulLinie: l.maulLinie, echt: l.maulEcht, p: l.punkte.map((q) => [q.x, q.y, q.z]) }));
  const meldung = () => s.evaluate(() => document.getElementById('hinweis')?.textContent ?? '');
  const imBild = async (id, n) => {
    const aus = [];
    for (let i = 0; i < n; i++) {
      const A = (await O('ankerImBild', id, i, 'seite')).filter((q) => !q.m);
      if (A[0]) aus.push({ i, x: A[0].x, y: A[0].y, sichtbar: A[0].sichtbar, verdeckt: A[0].verdeckt });
    }
    return aus;
  };
  const bild = async (name) => {
    if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-posen-reihe-${name}.png` });
  };
  const abwaehlen = async () => {
    const b = await O('bearbeiten');
    if (!(b.auswahl?.length || b.werkAuswahl?.length)) return;
    await s.keyboard.press('Escape');
    await s.waitForTimeout(300);
  };
  /** die Tropfen der Posen in der Reihe: ihre Namen */
  const tropfen = () => s.evaluate(() => [...document.querySelectorAll('#posen button.pose')].map((b) => b.textContent));
  const mitte = (sel) =>
    s.evaluate((q) => {
      const r = document.querySelector(q)?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, w: r.width } : null;
    }, sel);
  return { s, O, ruhig, klick, ziehen, heran, lage, linien, meldung, imBild, bild, abwaehlen, tropfen, mitte };
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
const proben = (S) => {
  const P = [];
  for (let i = 0; i + 2 < S.proben.length; i += 3) P.push([S.proben[i], S.proben[i + 1], S.proben[i + 2]]);
  return P;
};

try {
  const A = await seite(NAME);
  const { s, O, ruhig, klick, ziehen, heran, lage, linien, meldung, imBild, bild, abwaehlen, tropfen, mitte } = A;
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
  const f0 = (await O('werk')).f;
  const lippe = G0.find((l) => l.echt);
  const n = lippe.p.length;
  /** die gezeigte Haut gegen gemerkte Proben: größter Abstand (Einheiten des Werks) und der Anteil über 0,05 */
  const gezeigt = async (P) => {
    const d = (await O('hautAbstand', P)).map((x) => x * f0);
    return { max: Math.max(0, ...d), ueber: d.filter((x) => x > 0.05).length / Math.max(1, d.length) };
  };
  const lippenImBild = async () => {
    const P = await imBild(lippe.id, n);
    const innen = P.filter((p) => p.i !== 0 && p.i !== n - 1 && p.i !== (n - 1) / 2);
    const paar = (p) => P.find((q) => q.i === n - 1 - p.i);
    return { unten: innen.filter((p) => paar(p) && p.y > paar(p).y + 3).sort((a, b) => a.x - b.x), oben: innen.filter((p) => paar(p) && p.y < paar(p).y - 3).sort((a, b) => a.x - b.x) };
  };
  // (die Grundform nach zehn Sekunden Ruhe: ihre gezeigte Haut für R5)
  const SG = proben(await O('hautStand', true));

  // ---------- R1: Plus ----------
  await lage(1);
  const FA = await linien();
  const HA = (await O('pose', true)).haut;
  const SF = proben(await O('hautStand', true));
  const schritte0 = (await O('kiefer')).schritte;
  await bild('1-fressen');
  await s.click('#pose-plus');
  await s.waitForTimeout(900);
  await ruhig();
  const p1 = await O('pose', true);
  const t1 = await tropfen();
  let anders = p1.haut.length === HA.length ? 0 : Infinity;
  if (anders === 0) for (let i = 0; i < HA.length; i++) anders = Math.max(anders, Math.abs(HA[i] - p1.haut[i]));
  const schritte1 = (await O('kiefer')).schritte;
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(900);
  await ruhig();
  const p1z = await O('pose');
  const t1z = await tropfen();
  ok(
    'R1 in „Fressen“ auf Plus: eine zweite Pose ist gewählt und sieht aus wie „Fressen“; ein Schritt, ⌘Z nimmt sie',
    p1.an && p1.nr === 1 && p1.namen.join('|') === 'Fressen|Pose 2' && t1.join('|') === 'Fressen|Pose 2' && anders <= 0.01 && p1.winkel[1].join() === p1.winkel[0].join() && schritte1 === schritte0 + 1 && p1z.namen.length === 1 && t1z.length === 1 && p1z.an && p1z.nr === 0,
    `Posen ${p1.namen.join(', ')}; gewählt ${p1.nr}; gezeigte Haut höchstens ${z2(anders)} anders; Winkel ${p1.winkel[1].join('/')}° (Fressen ${p1.winkel[0].join('/')}°); Schritte +${schritte1 - schritte0}; nach ⌘Z ${t1z.join(', ')}, Pose ${p1z.an ? 'an' : 'AUS'}`,
  );

  // ---------- R2: Pose 2 formen; „Fressen“ und Grundform bleiben ----------
  await s.click('#pose-plus');
  await s.waitForTimeout(900);
  await ruhig();
  let L = await lippenImBild();
  const u = L.unten[Math.floor(L.unten.length / 2)];
  await ziehen(u.x, u.y, 0, 24);
  await ruhig();
  await abwaehlen();
  // ein Punkt der Form fern vom Maul, frei im Bild
  let fern = null;
  {
    const alle = await linien();
    const kand = [];
    for (const l of alle) {
      if (l.echt) continue;
      const P = await imBild(l.id, l.p.length);
      for (const q of P) if (l.p[q.i][0] > -420 && q.sichtbar !== false && !q.verdeckt && q.x > 300 && q.x < 1300 && q.y > 200 && q.y < 760) kand.push({ id: l.id, ...q });
    }
    fern = kand.find((q) => kand.every((r) => r === q || Math.hypot(r.x - q.x, r.y - q.y) > 16)) ?? null;
  }
  const ort = async () => (fern ? (await imBild(fern.id, fern.i + 1)).find((q) => q.i === fern.i) : null);
  if (fern) {
    await ziehen(fern.x, fern.y, 0, -30);
    await ruhig();
    await abwaehlen();
  }
  // der Unterkiefer weiter auf (der Regler „Maul“ gilt der gewählten Pose)
  await s.evaluate(() => {
    const r = document.getElementById('fressen-maul');
    r.dispatchEvent(new PointerEvent('pointerdown'));
    r.value = '50';
    r.dispatchEvent(new Event('input', { bubbles: true }));
    r.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await s.waitForTimeout(600);
  await ruhig();
  const P2 = await linien();
  const ort2 = await ort();
  const w2 = (await O('pose')).winkel;
  await bild('2-pose-2');
  await lage(1);
  const F2 = await linien();
  const ortF = await ort();
  const pF = await O('pose');
  await lage(0);
  const G2 = await linien();
  const pG = await O('pose');
  ok(
    'R2 Pose 2 geformt (Lippe, ein ferner Punkt, der Unterkiefer weiter auf): „Fressen“ behält Linien und Winkel, die Grundform ihre Linien',
    weit(FA, P2) > 2 && w2[1][0] === 50 && weit(FA, F2) <= 0.01 && pF.an && pF.nr === 0 && pF.winkel[0].join() === p1.winkel[0].join() && pF.winkel[1][0] === 50 && weit(G0, G2) <= 0.01 && !pG.an && !!fern,
    `Pose 2 gegen „Fressen“: Linien bis ${z2(weit(FA, P2))} anders, Winkel ${w2[1].join('/')}°; zurück in „Fressen“: Linien ${z2(weit(FA, F2))} neben vorher, Winkel ${pF.winkel[0].join('/')}°; Grundform: Linien ${z2(weit(G0, G2))}; ferner Punkt ${fern ? `${fern.id}.${fern.i}` : 'FEHLT'}`,
  );
  if (BIS === 'R2') throw new Error('BIS');

  // ---------- R3: von „Fressen“ direkt in Pose 2 ----------
  await lage(1);
  const spur = async (tun, ms = 900) => {
    await s.evaluate(() => {
      window.__spur = [];
      window.__spurEnde = false;
      const f = () => {
        const p = window.__ozzy.pose();
        window.__spur.push([p.ziel ? p.ziel.t : p.nr, p.offen, p.an ? 1 : 0, p.nr]);
        if (window.__spur.length < 240 && !window.__spurEnde) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    await tun();
    await s.waitForTimeout(ms);
    return s.evaluate(() => {
      window.__spurEnde = true;
      return window.__spur;
    });
  };
  const offenA = pF.winkel[0][0] + pF.winkel[0][1];
  const offenB = w2[1][0] + w2[1][1];
  const S3 = await spur(() => s.click('#posen button.pose[data-nr="2"]'));
  await ruhig();
  const p3 = await O('pose');
  const P3 = await linien();
  const O3 = S3.map((q) => q[1]);
  let rueck = 0;
  let sprung = 0;
  for (let i = 1; i < O3.length; i++) {
    if (O3[i] < O3[i - 1] - 1e-9) rueck++;
    sprung = Math.max(sprung, Math.abs(O3[i] - O3[i - 1]));
  }
  const unterwegs = new Set(O3.filter((x) => x > offenA + 0.2 && x < offenB - 0.2).map((x) => x.toFixed(2))).size;
  ok(
    'R3 aus „Fressen“ ein Tipp auf Pose 2: die Fahrt geht direkt (das Maul läuft stetig vom einen Winkel zum anderen, nie darunter); danach ist Pose 2 gewählt, ihre Linien wie verlassen',
    rueck === 0 && Math.min(...O3) >= offenA - 0.01 && Math.max(...O3) <= offenB + 0.01 && unterwegs >= 6 && sprung <= 0.25 * (offenB - offenA) && S3.every((q) => q[2] === 1) && p3.an && p3.nr === 1 && !p3.ziel && weit(P2, P3) <= 0.01,
    `Maul von ${offenA.toFixed(1)}° nach ${offenB.toFixed(1)}°: ${unterwegs} Bilder unterwegs, kleinster Wert ${Math.min(...O3).toFixed(1)}°, größter Schritt ${sprung.toFixed(1)}°${rueck ? `, ${rueck}-mal rückwärts` : ''}; danach Pose ${p3.nr}, Linien ${z2(weit(P2, P3))} neben verlassen`,
  );

  // ---------- R4: am Faden zwischen „Fressen“ und Pose 2 ----------
  const faden = await mitte('#posen .posen-faden[data-nr="2"]');
  const amFaden = async (von, nach, halten = 500) => {
    await s.mouse.move(faden.l + von * faden.w, faden.y);
    await s.waitForTimeout(150);
    await s.mouse.down();
    for (let i = 1; i <= 14; i++) {
      await s.mouse.move(faden.l + (von + ((nach - von) * i) / 14) * faden.w, faden.y);
      await s.waitForTimeout(25);
    }
    await s.waitForTimeout(halten);
  };
  await amFaden(0.94, 0.5);
  const halb = await O('pose');
  const ortHalb = await ort();
  await bild('4-halb');
  await s.mouse.move(faden.l + 0.3 * faden.w, faden.y);
  await s.waitForTimeout(200);
  await s.mouse.up();
  await s.waitForTimeout(900);
  await ruhig();
  const los1 = await O('pose');
  await amFaden(0.06, 0.72, 200);
  await s.mouse.up();
  await s.waitForTimeout(900);
  await ruhig();
  const los2 = await O('pose');
  let mitteNeben = Infinity;
  let ortWeg = 0;
  if (ort2 && ortF && ortHalb) {
    ortWeg = Math.hypot(ort2.x - ortF.x, ort2.y - ortF.y);
    mitteNeben = Math.hypot(ortHalb.x - (ort2.x + ortF.x) / 2, ortHalb.y - (ort2.y + ortF.y) / 2) / Math.max(1e-9, ortWeg);
  }
  ok(
    'R4 am Faden zwischen „Fressen“ und Pose 2 auf die Hälfte: das Maul beim Mittel beider Winkel, der gezogene Punkt fern vom Maul in der Mitte seiner zwei Lagen; losgelassen fährt es zum näheren Tropfen',
    !!halb.ziel && Math.abs(halb.ziel.t - 0.5) <= 0.03 && Math.abs(halb.offen - (offenA + offenB) / 2) <= 0.5 && ortWeg > 5 && mitteNeben <= 0.05 && los1.an && los1.nr === 0 && !los1.ziel && los2.an && los2.nr === 1 && !los2.ziel,
    `Anteil ${halb.ziel ? z2(halb.ziel.t) : 'KEIN ZIEL'}, Maul ${halb.offen.toFixed(1)}° (Mittel ${((offenA + offenB) / 2).toFixed(1)}°); der Punkt (${ortWeg.toFixed(1)} Bildpunkte zwischen den Posen) steht ${(100 * mitteNeben).toFixed(1)} % seines Wegs neben der Mitte; bei 0,3 losgelassen: Pose ${los1.nr}; bei 0,72: Pose ${los2.nr}`,
  );
  if (BIS === 'R4') throw new Error('BIS');

  // ---------- R5: in Pose 2 weit formen (das Netz wächst); „Fressen“ und Grundform bleiben ----------
  const punkteVor = (await O('werk')).punkte;
  for (let k = 0; k < 6; k++) {
    L = await lippenImBild();
    const p = k < 3 ? L.unten[k] : L.oben[k - 3];
    if (!p) continue;
    await ziehen(p.x, p.y, 0, k < 3 ? 36 : -28);
    await ruhig();
    await abwaehlen();
  }
  const punkteNach = (await O('werk')).punkte;
  await bild('5-pose-2-weit');
  await lage(1);
  const F5 = await linien();
  const hF = await gezeigt(SF);
  await lage(0);
  const G5 = await linien();
  const hG = await gezeigt(SG);
  ok(
    'R5 in Pose 2 das Maul weit geformt (das Netz wächst): „Fressen“ und die Grundform haben ihre Linien; ihre gezeigte Haut ist die von vorher',
    punkteNach !== punkteVor && weit(FA, F5) <= 0.01 && weit(G0, G5) <= 0.01 && hF.max <= 1 && hF.ueber <= 0.01 && hG.max <= 1 && hG.ueber <= 0.01,
    `Rechennetz ${punkteVor} → ${punkteNach} Punkte; „Fressen“: Linien ${z2(weit(FA, F5))}, gezeigte Haut höchstens ${z2(hF.max)} neben vorher (${(100 * hF.ueber).toFixed(2).replace('.', ',')} % über 0,05); Grundform: Linien ${z2(weit(G0, G5))}, Haut höchstens ${z2(hG.max)} (${(100 * hG.ueber).toFixed(2).replace('.', ',')} %)`,
  );
  if (BIS === 'R5') throw new Error('BIS');

  // ---------- R6: benennen ----------
  const schritte6 = (await O('kiefer')).schritte;
  const halten = async (text) => {
    const m = await mitte('#posen button.pose[data-nr="2"]');
    await s.mouse.move(m.x, m.y);
    await s.waitForTimeout(150);
    await s.mouse.down();
    await s.waitForTimeout(800);
    await s.mouse.up();
    await s.waitForTimeout(300);
    const offen = await s.evaluate(() => !document.getElementById('pose-name').hidden);
    await s.keyboard.press('Meta+a');
    await s.keyboard.type(text);
    await s.keyboard.press('Enter');
    await s.waitForTimeout(500);
    return offen;
  };
  const feld6 = await halten('Gähnen');
  const p6 = await O('pose');
  const t6 = await tropfen();
  const schritte6b = (await O('kiefer')).schritte;
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(900);
  await ruhig();
  const t6z = await tropfen();
  ok(
    'R6 Pose 2 gehalten, „Gähnen“ geschrieben, ↩: der Tropfen heißt so; ein Schritt, ⌘Z gibt „Pose 2“ zurück',
    feld6 && p6.namen[1] === 'Gähnen' && t6[1] === 'Gähnen' && !p6.an && schritte6b === schritte6 + 1 && t6z[1] === 'Pose 2',
    `Feld ${feld6 ? 'offen' : 'NICHT offen'}; danach ${t6.join(', ')}; Pose ${p6.an ? 'AN' : 'aus'}; Schritte +${schritte6b - schritte6}; nach ⌘Z ${t6z.join(', ')}`,
  );
  await halten('Gähnen');

  // ---------- R7: sichern und laden ----------
  await lage(2);
  const vor7 = await O('pose');
  const pose7 = await linien();
  const text7 = await O('sichern', PROBE);
  await s.waitForTimeout(800);
  const B = await seite(PROBE);
  await B.ruhig();
  const p7 = await B.O('pose');
  const pose7b = await B.linien();
  await B.lage(1);
  const fressen7b = await B.linien();
  await B.lage(0);
  const grund7b = await B.linien();
  ok(
    'R7 in der zweiten Pose gesichert und neu geladen: zwei Posen mit Namen, Winkeln und Linien; die gewählte ist gewählt',
    fs.existsSync(datei) && p7.an && p7.nr === 1 && p7.namen.join('|') === 'Fressen|Gähnen' && JSON.stringify(p7.winkel) === JSON.stringify(vor7.winkel) && weit(pose7, pose7b) <= 0.01 && weit(FA, fressen7b) <= 0.01 && weit(G0, grund7b) <= 0.01,
    `Meldung „${String(text7).slice(0, 40)}“; geladen: ${p7.namen.join(', ')}, gewählt ${p7.nr}, Pose ${p7.an ? 'an' : 'AUS'}, Winkel ${p7.winkel.map((w) => w.join('/')).join(' · ')}; Linien: zweite Pose ${z2(weit(pose7, pose7b))}, „Fressen“ ${z2(weit(FA, fressen7b))}, Grundform ${z2(weit(G0, grund7b))} neben vorher`,
  );
  await B.s.close();
  if (BIS === 'R7') throw new Error('BIS');

  // ---------- R8: löschen ----------
  const schritte8 = (await O('kiefer')).schritte;
  const muell = await mitte('button[title^="Mülleimer"]');
  const tragen = async (sel) => {
    const m = await mitte(sel);
    await s.mouse.move(m.x, m.y);
    await s.waitForTimeout(150);
    await s.mouse.down();
    for (let i = 1; i <= 16; i++) {
      await s.mouse.move(m.x + ((muell.x - m.x) * i) / 16, m.y + ((muell.y - m.y) * i) / 16);
      await s.waitForTimeout(20);
    }
    await s.waitForTimeout(150);
    await s.mouse.up();
    await s.waitForTimeout(900);
    await ruhig();
  };
  await tragen('#posen button.pose[data-nr="2"]');
  const p8 = await O('pose');
  const t8 = await tropfen();
  const schritte8b = (await O('kiefer')).schritte;
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(900);
  await ruhig();
  const p8z = await O('pose');
  const pose8z = await linien();
  // die letzte Pose: erst die zweite wieder weg, dann „Fressen“ auf den Mülleimer
  await tragen('#posen button.pose[data-nr="2"]');
  await tragen('#fressen-knopf');
  const p8l = await O('pose');
  const m8 = await meldung();
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(900);
  await ruhig();
  ok(
    'R8 den Tropfen der zweiten Pose auf den Mülleimer gezogen: eine Pose bleibt, die Form steht in der Grundform; ⌘Z bringt sie wieder; die letzte Pose bleibt',
    !!muell && p8.namen.join('|') === 'Fressen' && t8.length === 1 && !p8.an && schritte8b === schritte8 + 1 && p8z.namen.join('|') === 'Fressen|Gähnen' && p8z.an && p8z.nr === 1 && weit(pose7, pose8z) <= 0.01 && p8l.namen.length === 1 && /bleibt/.test(m8),
    `nach dem Löschen: ${t8.join(', ')}, Pose ${p8.an ? 'AN' : 'aus'}; Schritte +${schritte8b - schritte8}; nach ⌘Z: ${p8z.namen.join(', ')}, gewählt ${p8z.nr}, Linien ${z2(weit(pose7, pose8z))} neben vorher; die letzte: ${p8l.namen.join(', ')} · „${m8.slice(0, 50)}“`,
  );

  // ---------- R9: Tempo der Fahrt zwischen zwei Posen ----------
  const p9 = await O('pose');
  if (p9.namen.length < 2) throw new Error('R9: es fehlt die zweite Pose');
  if (!p9.an || p9.nr !== 1) await lage(2);
  await s.waitForTimeout(2500);
  await ruhig();
  await O('messen', true);
  await s.click('#fressen-knopf');
  await s.waitForTimeout(700);
  await s.click('#posen button.pose[data-nr="2"]');
  await s.waitForTimeout(700);
  const faden9 = await mitte('#posen .posen-faden[data-nr="2"]');
  await s.mouse.move(faden9.l + 0.94 * faden9.w, faden9.y);
  await s.waitForTimeout(100);
  await s.mouse.down();
  for (let i = 0; i < 40; i++) {
    await s.mouse.move(faden9.l + (0.5 + 0.44 * Math.cos(i / 6)) * faden9.w, faden9.y);
    await s.waitForTimeout(12);
  }
  const b9 = await O('messen', false);
  await s.mouse.up();
  await s.waitForTimeout(900);
  await ruhig();
  const fahrt9 = b9.filter((q) => q.teile[1] > 1);
  const ms9 = fahrt9.map((q) => q.ms).sort((x, y) => x - y);
  const mittel9 = ms9.reduce((x, y) => x + y, 0) / Math.max(1, ms9.length);
  ok(
    'R9 Tempo: die Fahrt zwischen zwei Posen rechnet unterwegs je Bild im Mittel höchstens 16,7 ms',
    ms9.length > 10 && mittel9 <= 16.7,
    `${ms9.length} Bilder unterwegs: im Mittel ${mittel9.toFixed(1)} ms, Median ${(ms9[Math.floor(ms9.length / 2)] ?? 0).toFixed(1)} ms, das langsamste ${(ms9[ms9.length - 1] ?? 0).toFixed(1)} ms; je Bild im Mittel: ${['Werk', 'Haut', 'Linien', 'Seifenhaut', 'Zeichnen', 'Wände'].map((nm, k) => `${nm} ${(fahrt9.reduce((x, q) => x + q.teile[k], 0) / Math.max(1, fahrt9.length)).toFixed(1)}`).join(', ')}`,
  );
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
