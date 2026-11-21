// Ozzy, Zähne je Pose (Plan „Maul, Zähne, Zunge“, Etappe 8, Scheibe 4, 21.11.2026; `docs/plans/2026-11-21-ozzy-maul-etappe-8-posen.md`,
// Abschnitt 8), an „teat firefish“ (NAME) auf Wachs, in der eingerasteten Seite, nah am Maul. Das Maul wird geschnitten, die Zähne
// sprießen in der Grundform; dann „Fressen“ und eine zweite Pose mit anderer Lippe und weiterem Unterkiefer.
//   Z1 In „Fressen“ an der Linse die Größe gestellt (Perle G, Rad der Maus): Die Zähne dort sind länger; die Werte der Grundform und
//      der zweiten Pose sind dieselben wie vorher; die Statuszeile nennt die Pose. Schritte für ⌘Z; zurückgenommen ist es wie vorher.
//   Z2 In der Grundform die Neigung gestellt: Sie gilt in allen Posen; „Fressen“ behält dazu seinen Unterschied der Größe (1e-9).
//   Z3 In der zweiten Pose die Anzahl gestellt: Sie gilt in der Grundform und in jeder Pose; die Statuszeile sagt es.
//   Z4 In der zweiten Pose einen Zahn gerückt (über denselben Weg wie die Linse): nur dort; in „Fressen“ steht er an seinem Platz
//      (Werte gleich, alle Punkte der Zähne höchstens 0,01 neben vorher).
//   Z5 Am Faden zwischen den zwei Posen auf der Hälfte: Die Spitze des gerückten Zahns (am Oberkiefer, der in beiden Posen gleich
//      steht) liegt höchstens 5 % ihres Wegs neben der Mitte ihrer zwei Lagen. Am Anfang und am Ende des Fadens gehalten liegen die
//      Zähne höchstens 0,05 neben dem Stand in der Pose dort (größter Abstand über alle Punkte der Zähne): Beim Ankommen springt
//      nichts.
//   Z6 Plus in „Fressen“ (mit eigenen Zähnen): Die neue Pose hat dieselben Werte.
//   Z7 Gesichert und geladen: jede Pose mit ihren Zähnen (Werte gleich).
//   Z8 Tempo: die Fahrt zwischen zwei Posen mit verschiedenen Zähnen im Mittel höchstens 16,7 ms je Bild.
//   Z9 Bei offener Linse (sie hält das Maul der Grundform offen) bleibt das Maul auf der Fahrt zwischen Grundform und „Fressen“
//      offen: In keinem Bild steht es weiter zu als an den zwei Enden (höchstens 0,5° darunter). Beim Bau gefunden: Es klappte
//      vorher bei jedem Wechsel von 42° auf 0° zu. Die Linse sagt beim Wechsel kurz, wessen Zähne sie zeigt.
//   K  Keine Fehler in der Konsole.
// Aufruf aus apps/editor: GPU=1 [NAME=…] [LINIE='x,y;…'] [BIS=Z2|Z4|Z5] node scripts/pruefen/ozzy-maul-posen-zaehne-fenster.mjs [ordner]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { flickenAnlegen } from './ozzy-teile.mjs';

const ordner = process.argv[2] ?? '';
const NAME = process.env.NAME ?? 'teat firefish';
const LINIE = (process.env.LINIE ?? '-860,172;-735,156;-700,152;-665,156;-640,165').split(';').map((t) => t.split(',').map(Number));
const BIS = process.env.BIS ?? '';
const basis = process.env.OZZY_URL ?? 'http://localhost:5205/ozzy.html';
const PROBE = 'ozzy-probe-posen-zaehne';
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
const z3 = (x) => (Number.isFinite(x) ? x.toFixed(3).replace('.', ',') : 'andere Punktzahl');
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
  /** in die Lage k, wenn die Form nicht schon dort steht (ein Tipp auf die gewählte Pose führte sonst in die Grundform) */
  const nach = async (k) => {
    const p = await O('pose');
    if (k === 0 ? !p.an : p.an && p.nr === k - 1) return;
    await lage(k);
  };
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
    if (ordner) await s.screenshot({ path: `${ordner}/ozzy-maul-posen-zaehne-${name}.png` });
  };
  const abwaehlen = async () => {
    const b = await O('bearbeiten');
    if (!(b.auswahl?.length || b.werkAuswahl?.length)) return;
    await s.keyboard.press('Escape');
    await s.waitForTimeout(300);
  };
  const mitte = (sel) =>
    s.evaluate((q) => {
      const r = document.querySelector(q)?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, w: r.width } : null;
    }, sel);
  /** ein Ort an der Linse: Winkel in Grad (0 rechts, 90 unten), Abstand von ihrer Mitte als Rand über dem runden Feld (CSS-Pixel) */
  const anLinse = async (grad, ueber) => {
    const l = (await O('zaehne')).linse;
    const r = l.innen / 2 + ueber;
    const w = (grad * Math.PI) / 180;
    return [l.mitte[0] + r * Math.cos(w), l.mitte[1] + r * Math.sin(w)];
  };
  /** eine Perle der Linse antippen (0 Anzahl, 1 Größe, 2 Neigung, 3 Verlauf, 4 Sitz) und am Rad der Maus drehen (Bogenmaß; 15° sind eine Rast) */
  const perle = async (i, bogen) => {
    const [x, y] = await anLinse((0.62 + 0.115 * i) * 180, 48);
    await klick(x, y);
    const l = (await O('zaehne')).linse;
    await s.mouse.move(l.mitte[0], l.mitte[1]);
    await s.waitForTimeout(120);
    await s.mouse.wheel(0, (-bogen / 0.004) * 2);
    await s.waitForTimeout(600);
  };
  const linseAuf = async () => {
    if (!(await O('zaehne')).linse.offen) {
      await s.click('#zaehne-tropfen');
      await s.waitForTimeout(900);
    }
  };
  /** je Bild, wie weit das Maul offen ist (Grad), während `tun` läuft und `ms` danach */
  const spur = async (tun, ms = 1300) => {
    await s.evaluate(() => {
      window.__spur = [];
      window.__spurEnde = false;
      const f = () => {
        window.__spur.push(window.__ozzy.pose().offen);
        if (window.__spur.length < 300 && !window.__spurEnde) requestAnimationFrame(f);
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
  return { s, O, ruhig, klick, ziehen, heran, lage, nach, meldung, imBild, bild, abwaehlen, mitte, perle, linseAuf, spur };
};
/** größter Abstand zweier Sätze von Punkten (Einheiten des Werks); Infinity: andere Punktzahl */
const abstand = (A, B) => {
  if (A.pos.length !== B.pos.length || !A.pos.length) return Infinity;
  let m = 0;
  for (let i = 0; i < A.pos.length; i += 3) m = Math.max(m, Math.hypot(A.pos[i] - B.pos[i], A.pos[i + 1] - B.pos[i + 1], A.pos[i + 2] - B.pos[i + 2]));
  return m;
};
/** die Spitze eines Zahns (die letzten zwei Punkte eines Zahns sind die Mitte seines Fußes und seine Spitze) */
const spitze = (Z, unten, i, gespiegelt = false) => {
  const q = Z.zaehne.findIndex((z) => z.unten === unten && z.i === i && z.gespiegelt === gespiegelt);
  if (q < 0) return null;
  const v = 3 * (q * Z.jeZahn + Z.jeZahn - 1);
  return [Z.pos[v], Z.pos[v + 1], Z.pos[v + 2]];
};
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const A = await seite(NAME);
  const { s, O, ruhig, klick, ziehen, heran, lage, nach, meldung, imBild, bild, abwaehlen, mitte, perle, linseAuf, spur } = A;
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

  // die Zähne sprießen in der Grundform
  await O('zaehne', 'anfang');
  await s.waitForTimeout(2200);
  await ruhig();
  const z0 = await O('zaehne');
  // „Fressen“, dann eine zweite Pose mit anderer Lippe und weiterem Unterkiefer
  await lage(1);
  await s.click('#pose-plus');
  await s.waitForTimeout(900);
  await ruhig();
  {
    const L = (await O('werkLinienDaten')).find((l) => l.maulEcht);
    const n = L.punkte.length;
    const P = await imBild(L.id, n);
    const innen = P.filter((p) => p.i !== 0 && p.i !== n - 1 && p.i !== (n - 1) / 2);
    const paar = (p) => P.find((q) => q.i === n - 1 - p.i);
    const unten = innen.filter((p) => paar(p) && p.y > paar(p).y + 3).sort((a, b) => a.x - b.x);
    const u = unten[Math.floor(unten.length / 2)];
    await ziehen(u.x, u.y, 0, 24);
    await ruhig();
    await abwaehlen();
    await s.evaluate(() => {
      const r = document.getElementById('fressen-maul');
      r.dispatchEvent(new PointerEvent('pointerdown'));
      r.value = '50';
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await s.waitForTimeout(600);
    await ruhig();
  }
  // (die eingerastete Seite: Die Probe darf sie nicht unbemerkt verlassen)
  const ansicht = async () => (await O('bearbeiten')).flaechen.join(',');
  const ansicht0 = await ansicht();
  await lage(1);
  const f0 = await O('zaehne');
  const namen = (await O('pose')).namen;

  // ---------- Z1: in „Fressen“ die Größe ----------
  await linseAuf();
  const schritte1 = (await O('kiefer')).schritte;
  await perle(1, 0.45);
  const f1 = await O('zaehne');
  const m1 = await meldung();
  const schritte1b = (await O('kiefer')).schritte;
  await bild('1-fressen-groesser');
  for (let i = 0; i < schritte1b - schritte1; i++) {
    await s.keyboard.press('Meta+z');
    await s.waitForTimeout(700);
  }
  const f1z = await O('zaehne');
  ok(
    'Z1 in „Fressen“ die Größe gestellt: die Zähne dort sind länger; Grundform und zweite Pose behalten ihre Werte; ⌘Z nimmt es zurück',
    namen.join('|') === 'Fressen|Pose 2' &&
      f1.linse.perle === 'G' &&
      f1.werte.oben.groesse > f0.werte.oben.groesse + 0.05 &&
      f1.lang > f0.lang * 1.03 &&
      gleich(f1.grund, z0.grund) &&
      gleich(f1.jePose[1], f0.jePose[1]) &&
      f1.versatz[0]?.oben?.groesse > 0.05 &&
      !f1.versatz[1] &&
      /Fressen/.test(m1) &&
      schritte1b > schritte1 &&
      gleich(f1z.werte, f0.werte) &&
      !f1z.versatz[0],
    `Größe in „Fressen“ ${z3(f0.werte.oben.groesse)} → ${z3(f1.werte.oben.groesse)} (längster Zahn ${f0.lang.toFixed(1)} → ${f1.lang.toFixed(1)}); Grundform ${z3(f1.grund.oben.groesse)}, Pose 2 ${z3(f1.jePose[1].oben.groesse)}; Statuszeile „${m1.slice(0, 44)}“; Schritte +${schritte1b - schritte1}; nach ⌘Z ${z3(f1z.werte.oben.groesse)}`,
  );
  // (noch einmal: Mit diesem Unterschied geht es weiter)
  await perle(1, 0.45);
  const f1b = await O('zaehne');
  const mehr = f1b.werte.oben.groesse - f1b.grund.oben.groesse;

  // ---------- Z2: in der Grundform die Neigung (und Z9: Die Linse ist offen, das Maul bleibt auf beiden Fahrten offen) ----------
  const offen9 = ((w) => w[0] + w[1])((await O('pose')).winkel[0]);
  const linse9 = (await O('zaehne')).linse.offen;
  const wort = () => s.evaluate(() => document.querySelector('#linse .linse-zahl')?.textContent ?? '');
  const S9a = await spur(() => s.click('#pose-grundform'));
  const wort9a = await wort();
  await ruhig();
  const linse9b = (await O('zaehne')).linse.offen;
  await linseAuf();
  await perle(2, 0.3);
  const g2 = await O('zaehne');
  const S9b = await spur(() => s.click('#posen button.pose[data-nr="1"]'));
  const wort9b = await wort();
  await ruhig();
  const f2 = await O('zaehne');
  const dn = g2.grund.oben.neigung - z0.grund.oben.neigung;
  ok(
    'Z2 in der Grundform die Neigung gestellt: sie gilt in allen Posen; „Fressen“ behält seinen Unterschied der Größe',
    g2.linse.perle === 'N' &&
      Math.abs(dn) > 0.02 &&
      Math.abs(g2.jePose[0].oben.neigung - g2.grund.oben.neigung) < 1e-9 &&
      Math.abs(g2.jePose[1].oben.neigung - g2.grund.oben.neigung) < 1e-9 &&
      Math.abs(f2.werte.oben.neigung - g2.grund.oben.neigung) < 1e-9 &&
      Math.abs(f2.werte.oben.groesse - f2.grund.oben.groesse - mehr) < 1e-9 &&
      mehr > 0.05,
    `Neigung ${z3(z0.grund.oben.neigung)} → ${z3(g2.grund.oben.neigung)} in der Grundform, in „Fressen“ ${z3(f2.werte.oben.neigung)}, in Pose 2 ${z3(g2.jePose[1].oben.neigung)}; Größe in „Fressen“ um ${z3(f2.werte.oben.groesse - f2.grund.oben.groesse)} über der Grundform (vorher ${z3(mehr)})`,
  );
  ok(
    'Z9 bei offener Linse bleibt das Maul auf der Fahrt zwischen Grundform und „Fressen“ offen (es klappt nicht erst zu)',
    linse9 && linse9b && S9a.length > 20 && S9b.length > 20 && Math.min(...S9a) >= offen9 - 0.5 && Math.min(...S9b) >= offen9 - 0.5 && Math.max(...S9a, ...S9b) <= offen9 + 0.5 && wort9a === 'Grundform' && wort9b === 'Fressen',
    `„Fressen“ ${offen9.toFixed(1)}° offen; zur Grundform: ${S9a.length} Bilder, kleinster Wert ${Math.min(...S9a).toFixed(1)}°; wieder hinein: ${S9b.length} Bilder, kleinster Wert ${Math.min(...S9b).toFixed(1)}°; Linse offen: ${linse9 && linse9b ? 'ja' : 'NEIN'}; die Linse sagt „${wort9a}“, dann „${wort9b}“`,
  );
  if (BIS === 'Z2') throw new Error('BIS');

  // ---------- Z3: in der zweiten Pose die Anzahl ----------
  await lage(2);
  await linseAuf();
  const p3a = await O('zaehne');
  await perle(0, 0.28);
  const p3 = await O('zaehne');
  const m3 = await meldung();
  ok(
    'Z3 in der zweiten Pose die Anzahl gestellt: sie gilt in der Grundform und in jeder Pose; die Statuszeile sagt es',
    p3.linse.perle === '#' &&
      p3.werte.oben.anzahl !== p3a.werte.oben.anzahl &&
      p3.grund.oben.anzahl === p3.werte.oben.anzahl &&
      p3.jePose[0].oben.anzahl === p3.werte.oben.anzahl &&
      p3.grund.unten.anzahl === p3.werte.unten.anzahl &&
      Math.abs(p3.jePose[0].oben.groesse - p3.grund.oben.groesse - mehr) < 1e-9 &&
      /alle Posen/.test(m3),
    `Anzahl oben ${p3a.werte.oben.anzahl} → ${p3.werte.oben.anzahl} in Pose 2; Grundform ${p3.grund.oben.anzahl}/${p3.grund.unten.anzahl}, „Fressen“ ${p3.jePose[0].oben.anzahl}/${p3.jePose[0].unten.anzahl}; Statuszeile „${m3.slice(0, 50)}“`,
  );

  // ---------- Z4: in der zweiten Pose einen Zahn rücken ----------
  await lage(1);
  const F4 = await O('zahnPunkte');
  const f4 = await O('zaehne');
  await lage(2);
  const p4a = await O('zaehne');
  const P4a = await O('zahnPunkte');
  // (ein Zahn der oberen Reihe und sein Spiegelbild, längs nach hinten: derselbe Weg wie die Linse, `zaehneWert`)
  const T = 3;
  const TP = p4a.werte.oben.anzahl - 1 - T;
  await O('zaehne', { ...p4a.werte, oben: { ...p4a.werte.oben, eigen: { ...(p4a.werte.oben.eigen ?? {}), [T]: { ds: 0.1 }, [TP]: { ds: 0.1 } } } });
  await s.waitForTimeout(500);
  const p4 = await O('zaehne');
  const P4 = await O('zahnPunkte');
  await bild('4-pose-2-zahn-gerueckt');
  await lage(1);
  const f4b = await O('zaehne');
  const F4b = await O('zahnPunkte');
  const s4a = spitze(P4a, false, T);
  const s4 = spitze(P4, false, T);
  const ruck = s4a && s4 ? Math.hypot(s4[0] - s4a[0], s4[1] - s4a[1], s4[2] - s4a[2]) : 0;
  ok(
    'Z4 in der zweiten Pose einen Zahn gerückt: nur dort; in „Fressen“ steht er an seinem Platz',
    Math.abs((p4.versatz[1]?.oben?.eigen?.[T]?.ds ?? 0) - 0.1) < 1e-9 && p4.grund.oben.eigen === undefined && ruck > 1 && gleich(f4b.werte, f4.werte) && f4b.werte.oben.eigen === undefined && abstand(F4, F4b) <= 0.01,
    `Versatz in Pose 2: Zahn ${T} längs ${z3(p4.versatz[1]?.oben?.eigen?.[T]?.ds ?? 0)}, seine Spitze rückt ${ruck.toFixed(2)}; Grundform ohne eigene Zähne: ${p4.grund.oben.eigen === undefined ? 'ja' : 'NEIN'}; „Fressen“: Werte ${gleich(f4b.werte, f4.werte) ? 'gleich' : 'ANDERS'}, Punkte der Zähne höchstens ${z3(abstand(F4, F4b))} neben vorher`,
  );
  if (BIS === 'Z4') throw new Error('BIS');

  // ---------- Z5: am Faden zwischen den zwei Posen ----------
  await lage(2);
  const B5 = await O('zahnPunkte');
  await lage(1);
  const A5 = await O('zahnPunkte');
  await lage(2);
  const faden = await mitte('#posen .posen-faden[data-nr="2"]');
  // (links am Faden steht „Fressen“, rechts Pose 2. Wer den Faden greift, steht in der linken Pose und wandert zur rechten: Der
  // Anteil ist rechts 1 und links 0)
  const amFaden = async (von, bis, halten = 600) => {
    await s.mouse.move(faden.l + von * faden.w, faden.y);
    await s.waitForTimeout(150);
    await s.mouse.down();
    for (let i = 1; i <= 14; i++) {
      await s.mouse.move(faden.l + (von + ((bis - von) * i) / 14) * faden.w, faden.y);
      await s.waitForTimeout(25);
    }
    await s.waitForTimeout(halten);
  };
  await amFaden(0.94, 1.2);
  const anfang = await O('zahnPunkte');
  for (let i = 1; i <= 10; i++) {
    await s.mouse.move(faden.l + (1.2 - 0.07 * i) * faden.w, faden.y);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(600);
  const halb = await O('zahnPunkte');
  await bild('5-halb');
  for (let i = 1; i <= 12; i++) {
    await s.mouse.move(faden.l + (0.5 - 0.06 * i) * faden.w, faden.y);
    await s.waitForTimeout(25);
  }
  await s.waitForTimeout(600);
  const ende = await O('zahnPunkte');
  await s.mouse.up();
  await s.waitForTimeout(1100);
  await ruhig();
  const an = await O('zahnPunkte');
  const p5 = await O('pose');
  const sA = spitze(A5, false, T);
  const sB = spitze(B5, false, T);
  const sH = spitze(halb, false, T);
  let weg = 0;
  let neben = Infinity;
  if (sA && sB && sH) {
    weg = Math.hypot(sA[0] - sB[0], sA[1] - sB[1], sA[2] - sB[2]);
    neben = Math.hypot(sH[0] - (sA[0] + sB[0]) / 2, sH[1] - (sA[1] + sB[1]) / 2, sH[2] - (sA[2] + sB[2]) / 2) / Math.max(1e-9, weg);
  }
  ok(
    'Z5 am Faden zwischen zwei Posen mit verschiedenen Zähnen: auf der Hälfte steht die Spitze des gerückten Zahns in der Mitte ihrer zwei Lagen; an beiden Enden gehalten stehen die Zähne wie in der Pose dort (beim Ankommen springt nichts)',
    anfang.ziel !== null && anfang.ziel >= 0.999 && Math.abs(halb.ziel - 0.5) <= 0.03 && ende.ziel !== null && ende.ziel <= 0.001 && weg > 1 && neben <= 0.05 && abstand(anfang, B5) <= 0.05 && abstand(ende, A5) <= 0.05 && abstand(ende, an) <= 0.05 && p5.an && p5.nr === 0 && !p5.ziel,
    `Anteile ${anfang.ziel}, ${z3(halb.ziel ?? NaN)}, ${ende.ziel}; die Spitze (${weg.toFixed(2)} zwischen den Posen) steht ${(100 * neben).toFixed(1)} % ihres Wegs neben der Mitte; am Anfang gehalten ${z3(abstand(anfang, B5))} neben Pose 2, am Ende gehalten ${z3(abstand(ende, A5))} neben „Fressen“, beim Ankommen ${z3(abstand(ende, an))}; die zwei Posen selbst liegen bis ${abstand(A5, B5).toFixed(2)} auseinander`,
  );
  if (BIS === 'Z5') throw new Error('BIS');

  // ---------- Z6: Plus nimmt die Zähne mit ----------
  await nach(1);
  await s.click('#pose-plus');
  await s.waitForTimeout(900);
  await ruhig();
  const p6 = await O('zaehne');
  const n6 = (await O('pose')).namen;
  await s.keyboard.press('Meta+z');
  await s.waitForTimeout(900);
  await ruhig();
  const n6z = (await O('pose')).namen;
  ok(
    'Z6 Plus in „Fressen“ (mit eigenen Zähnen): die neue Pose hat dieselben Werte',
    n6.length === 3 && gleich(p6.jePose[2], p6.jePose[0]) && gleich(p6.versatz[2], p6.versatz[0]) && !!p6.versatz[0] && gleich(p6.werte, p6.jePose[2]) && n6z.length === 2,
    `Posen ${n6.join(', ')}; Größe oben: „Fressen“ ${z3(p6.jePose[0].oben.groesse)}, neu ${z3(p6.jePose[2].oben.groesse)}, Grundform ${z3(p6.grund.oben.groesse)}; nach ⌘Z ${n6z.join(', ')}`,
  );

  // ---------- Z7: sichern und laden ----------
  await nach(2);
  const v7 = await O('zaehne');
  const text7 = await O('sichern', PROBE);
  await s.waitForTimeout(800);
  const B = await seite(PROBE);
  await B.ruhig();
  const l7 = await B.O('zaehne');
  const p7 = await B.O('pose');
  await B.s.close();
  ok(
    'Z7 gesichert und geladen: jede Pose mit ihren Zähnen',
    fs.existsSync(datei) && p7.an && p7.nr === 1 && gleich(l7.grund, v7.grund) && gleich(l7.jePose, v7.jePose) && gleich(l7.versatz, v7.versatz) && !!l7.versatz[0] && !!l7.versatz[1] && gleich(l7.werte, v7.werte),
    `Meldung „${String(text7).slice(0, 40)}“; geladen: Pose ${p7.nr}, ${p7.an ? 'an' : 'AUS'}; Grundform ${gleich(l7.grund, v7.grund) ? 'gleich' : 'ANDERS'}, Zähne je Pose ${gleich(l7.jePose, v7.jePose) ? 'gleich' : 'ANDERS'} (Versatz ${l7.versatz.map((v) => (v ? 'ja' : 'nein')).join(', ')})`,
  );

  // ---------- Z8: Tempo der Fahrt zwischen zwei Posen mit verschiedenen Zähnen ----------
  await nach(2);
  await s.waitForTimeout(2500);
  await ruhig();
  await O('messen', true);
  await s.click('#fressen-knopf');
  await s.waitForTimeout(700);
  await s.click('#posen button.pose[data-nr="2"]');
  await s.waitForTimeout(700);
  const faden8 = await mitte('#posen .posen-faden[data-nr="2"]');
  await s.mouse.move(faden8.l + 0.94 * faden8.w, faden8.y);
  await s.waitForTimeout(100);
  await s.mouse.down();
  for (let i = 0; i < 40; i++) {
    await s.mouse.move(faden8.l + (0.5 + 0.44 * Math.cos(i / 6)) * faden8.w, faden8.y);
    await s.waitForTimeout(12);
  }
  const b8 = await O('messen', false);
  await s.mouse.up();
  await s.waitForTimeout(900);
  await ruhig();
  const fahrt8 = b8.filter((q) => q.teile[1] > 1);
  const ms8 = fahrt8.map((q) => q.ms).sort((x, y) => x - y);
  const mittel8 = ms8.reduce((x, y) => x + y, 0) / Math.max(1, ms8.length);
  ok(
    'Z8 Tempo: die Fahrt zwischen zwei Posen mit verschiedenen Zähnen rechnet unterwegs je Bild im Mittel höchstens 16,7 ms',
    ms8.length > 10 && mittel8 <= 16.7,
    `${ms8.length} Bilder unterwegs: im Mittel ${mittel8.toFixed(1)} ms, Median ${(ms8[Math.floor(ms8.length / 2)] ?? 0).toFixed(1)} ms, das langsamste ${(ms8[ms8.length - 1] ?? 0).toFixed(1)} ms; je Bild im Mittel: ${['Werk', 'Haut', 'Linien', 'Seifenhaut', 'Zeichnen', 'Wände'].map((nm, k) => `${nm} ${(fahrt8.reduce((x, q) => x + q.teile[k], 0) / Math.max(1, fahrt8.length)).toFixed(1)}`).join(', ')}`,
  );
  ok('die Ansicht ist am Ende dieselbe wie am Anfang (die eingerastete Seite)', (await ansicht()) === ansicht0 && ansicht0 !== '', `${ansicht0} → ${await ansicht()}`);
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
