// Form zuerst (10.11.2026, vor G5): Wesen behalten, sichern, laden.
// Ein Wesen bauen (drei Loops, ein weiter Zug, eine Kante), dann:
//   A  die Seite neu laden: das Wesen ist wieder da, Bit für Bit; ein Zug danach geht, ⌘Z führt zum Stand nach dem Laden
//   B  „Sichern“ unter einem Namen (Knopf, Feld, ⏎): die Datei liegt in der Ablage; Tippen im Feld löst keine Kürzel aus;
//      ⌘S sichert danach ohne Frage unter demselben Namen; der Name übersteht das Neuladen
//   C  „Neu“: die Startform; ⌘Z bringt das Wesen zurück; ein vorhandener Name wird nicht beim ersten Drücken überschrieben
//   D  „Laden“ aus der Liste: derselbe Stand wie gesichert; ⌘Z bringt das Wesen von vorher zurück
//   F  ein Wesen, das nie gesichert wurde, „Neu“, die Seite neu laden: Es steht als „Wesen von vorher“ in der Liste von „Laden“
//   P  mit Maul in der Fressen-Pose (Unterlippe gezogen, Maul 45°): neu laden und laden führen wieder in die Pose, Bit für Bit, samt
//      Grundform und Reglern
//   E  eine andere Startform (dichteres Netz): das behaltene Wesen kommt dort nicht von selbst; geladen bringt es sein Maß mit
// Aufruf aus apps/editor: node scripts/pruefen/form-ablage-probe.mjs   (KURVEN_URL; die Probe legt „probe-ablage…“ in wesen/ an
// und räumt sie am Ende wieder weg, LASSEN=1 lässt sie liegen)
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// unter Playwright behält das Fenster nichts (die anderen Proben erwarten bei jedem Laden die Startform): hier eigens einschalten
const basis = ((u) => (u.searchParams.set('behalten', '1'), u.href))(new URL(process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html?gewichte=geometrie'));
const NAME = 'probe-ablage';
const NAME2 = 'probe-ablage zwei';
const NAME3 = 'probe-ablage pose';
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] });
const kontext = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
let seite = await kontext.newPage();
const fehler = [];
const horchen = (s) => {
  s.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  s.on('pageerror', (e) => fehler.push(String(e)));
};
horchen(seite);
const bereit = async () => {
  await seite.waitForFunction(() => window.__kurven !== undefined && window.__kurven.ablage.bereit());
  await seite.waitForTimeout(300);
};
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const A = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven.ablage[f2](...a2), [f, a]);
const bild = async (a, p) => {
  const b = await K('bild', a, p);
  return [b.x, b.y];
};
const ruhig = () => seite.waitForFunction(() => !window.__kurven.zeiten().beschaeftigt, null, { timeout: 60000 });
const status = () => seite.evaluate(() => document.getElementById('status').textContent);
const statusMit = (muster) => seite.waitForFunction((m) => new RegExp(m).test(document.getElementById('status').textContent), muster, { timeout: 30000 });
// der Stand: Lagen als Bits, Dreiecke, die Loops (Punkte, Griffe, Schalter, Proben), das Maß
const stand = () =>
  seite.evaluate(() => {
    const k = window.__kurven;
    const r = k.roh();
    return {
      bits: Array.from(new Uint32Array(r.pos.buffer, r.pos.byteOffset, 2 * r.pos.length)),
      tri: Array.from(r.tri),
      loops: JSON.stringify(k.loops()),
      zahl: k.loops().length,
      mk: k.ablage.mk(),
      punkte: k.zeiten().punkte,
    };
  });
const gleich = (a, b) => a.bits.length === b.bits.length && a.bits.every((v, i) => v === b.bits[i]) && a.tri.length === b.tri.length && a.tri.every((v, i) => v === b.tri[i]) && a.loops === b.loops && a.mk === b.mk;
let alleGut = true;
const ok = (name, bedingung, text) => {
  if (!bedingung) alleGut = false;
  console.log(`${bedingung ? 'gut ' : 'FEHL'} ${name}: ${text}`);
};
const ziehen = async ([x, y], [x2, y2], n) => {
  await seite.mouse.move(x, y);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) {
    await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
    await seite.waitForTimeout(16);
  }
  await seite.mouse.up();
};
// der oberste Punkt des senkrechten Rings (der, der nicht in der Ebene y = 0 liegt und nicht in z = 0 … der dritte Loop)
const oben = async () => {
  const L = await K('loops');
  const senkrecht = L[2];
  return senkrecht.punkte.filter((q) => q.sichtbar !== false).reduce((b, q) => (q.ref.y > b.ref.y ? q : b)).ref;
};
const zug = async (dy, n = 10) => {
  const p = await oben();
  await ziehen(await bild('seite', p), await bild('seite', { ...p, y: p.y + dy }), n);
  await ruhig();
  return p;
};
const eintragVon = async (name) => ((await A('liste')) ?? []).find((e) => e.name === name);
const regler = async (id, w) => {
  await seite.evaluate(
    ([id2, v]) => {
      const el = document.getElementById(id2);
      el.dispatchEvent(new PointerEvent('pointerdown'));
      el.value = String(v);
      el.dispatchEvent(new Event('input'));
      el.dispatchEvent(new Event('change'));
    },
    [id, w],
  );
  await seite.waitForTimeout(250);
};
// der Stand in der Pose: dazu die Grundform, die Knochen, die Regler, das Maul
const standPose = async () => ({
  ...(await stand()),
  ...(await seite.evaluate(() => {
    const k = window.__kurven;
    const g = k.grundLagen();
    return {
      pose: JSON.stringify(k.pose()),
      maul: JSON.stringify(k.maul()),
      grund: g ? Array.from(g) : null,
      regler: `${document.getElementById('maul-oeffnung').value}/${document.getElementById('kopf-oeffnung').value}`,
      knopf: document.getElementById('knopf-pose').getAttribute('aria-pressed'),
    };
  })),
});
const gleichPose = (a, b) => gleich(a, b) && a.pose === b.pose && a.maul === b.maul && a.regler === b.regler && a.knopf === b.knopf && !!a.grund && !!b.grund && a.grund.length === b.grund.length && a.grund.every((v, i) => Object.is(v, b.grund[i]));

// ---------- ein Wesen bauen ----------
await seite.goto(basis);
await bereit();
const start = await stand();
for (const [a, P, Q] of [
  ['seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  await ziehen(await bild(a, { ...P, z: 0 }), await bild(a, { ...Q, z: 0 }), 6);
  await ruhig();
}
await seite.keyboard.press('Escape');
await zug(60, 20);
await seite.keyboard.press('k');
await ruhig();
const packen = await A('behalten');
const bytes = await A('bytes');
const S1 = await stand();
console.log(`Wesen gebaut: ${S1.punkte} Punkte, ${S1.zahl} Loops, Maß ${S1.mk.toFixed(3)}; als Datei ${(bytes / 1e6).toFixed(2)} MB, Packen im Fenster ${packen} ms`);

// ---------- A: neu laden ----------
await seite.reload();
await bereit();
const S2 = await stand();
ok('A neu geladen', gleich(S1, S2), `${S2.punkte} Punkte (vorher ${S1.punkte}), Stand ${gleich(S1, S2) ? 'Bit für Bit gleich' : 'ANDERS'}; Statuszeile: „${(await status()).slice(0, 70)}“`);
await ruhig();
const S2b = await stand();
ok('A in der Ruhe', gleich(S2, S2b), `nach dem Rechnen im Hintergrund unverändert: ${gleich(S2, S2b) ? 'ja' : 'NEIN'}`);
const p = await zug(20);
const S3 = await stand();
const p3 = await oben();
ok('A Zug danach', Math.abs(p3.y - p.y - 20) < 0.5 && S3.bits.every(Number.isFinite), `Punkt ${p.y.toFixed(1)} → ${p3.y.toFixed(1)}, ${S3.punkte} Punkte`);
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(200);
const S4 = await stand();
ok('A ⌘Z', gleich(S2, S4), `zurück zum Stand nach dem Neuladen: ${gleich(S2, S4) ? 'ja' : 'NEIN'}`);
await ruhig();

// ---------- B: sichern ----------
await seite.click('#knopf-sichern');
await seite.fill('#ablage-name', '');
// Tippen im Feld: k (Kante), l (Loop), p (Stift), ⌫ (Löschen) dürfen nichts am Wesen tun
await seite.type('#ablage-name', 'klp');
for (let i = 0; i < 3; i++) await seite.keyboard.press('Backspace');
const S5 = await stand();
const loopKnopf = await seite.getAttribute('#knopf-loop', 'aria-pressed');
ok('B Tippen', gleich(S4, S5) && loopKnopf === 'false', `Wesen unverändert: ${gleich(S4, S5) ? 'ja' : 'NEIN'}, Loop-Werkzeug ${loopKnopf === 'false' ? 'aus' : 'AN'}`);
await seite.type('#ablage-name', NAME);
await seite.keyboard.press('Enter');
await statusMit('gesichert|fehlgeschlagen|als Datei');
let eintrag = await eintragVon(NAME);
ok('B gesichert', !!eintrag && eintrag.punkte === S5.punkte && eintrag.loops === 3, `Statuszeile „${(await status()).slice(0, 80)}“; in der Ablage: ${eintrag ? `${eintrag.punkte} Punkte, ${eintrag.loops} Loops, ${(eintrag.bytes / 1e6).toFixed(2)} MB` : 'FEHLT'}`);
// ⌘S: ohne Frage unter demselben Namen
await zug(5, 5);
const S5b = await stand();
await seite.keyboard.press('Meta+s');
await statusMit('^gesichert|fehlgeschlagen');
const eintragB = await eintragVon(NAME);
ok('B ⌘S', !!eintragB && !!eintrag && eintragB.zeit !== eintrag.zeit && (await seite.locator('#ablage-name').count()) === 0, `„${(await status()).slice(0, 60)}“, ohne Namensfeld, Datei neu geschrieben: ${eintragB && eintrag && eintragB.zeit !== eintrag.zeit ? 'ja' : 'NEIN'}`);
// ⌘S mit offenem Feld: gilt, was darin steht
await seite.click('#knopf-sichern');
const vorgabe = await seite.inputValue('#ablage-name');
await seite.fill('#ablage-name', NAME2);
await seite.keyboard.press('Meta+s');
await statusMit('^gesichert|fehlgeschlagen');
ok('B ⌘S im Feld', vorgabe === NAME && !!(await eintragVon(NAME2)) && (await A('name')) === NAME2, `das Feld schlug „${vorgabe}“ vor; gesichert als „${await A('name')}“`);
// der Name übersteht das Neuladen
await A('behalten');
await seite.reload();
await bereit();
const S5c = await stand();
ok('B Name bleibt', (await A('name')) === NAME2 && gleich(S5b, S5c), `nach dem Neuladen: Name „${await A('name')}“, Stand ${gleich(S5b, S5c) ? 'gleich' : 'ANDERS'}; „${(await status()).slice(0, 60)}“`);
await ruhig();

// ---------- C: neu ----------
await seite.click('#knopf-neu');
await seite.waitForTimeout(300);
const S6 = await stand();
ok('C Neu', gleich(start, S6) && S6.zahl === 0 && (await A('name')) === '', `${S6.punkte} Punkte, ${S6.zahl} Loops (Startform: ${gleich(start, S6) ? 'ja' : 'NEIN'})`);
// die leere Startform unter einem vorhandenen Namen: erst beim zweiten Drücken
await seite.click('#knopf-sichern');
await seite.waitForTimeout(300);
await seite.fill('#ablage-name', NAME);
await seite.keyboard.press('Enter');
await seite.waitForTimeout(300);
const nachEinmal = await eintragVon(NAME);
ok('C kein Überschreiben', /gibt es schon/.test(await status()) && nachEinmal?.loops === 3, `„${(await status()).slice(0, 70)}“; in der Ablage weiter ${nachEinmal?.loops} Loops`);
await seite.keyboard.press('Escape');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
const S7 = await stand();
ok('C ⌘Z', gleich(S5c, S7), `das Wesen ist wieder da: ${gleich(S5c, S7) ? 'ja' : 'NEIN'}`);
await ruhig();

// ---------- D: laden ----------
await seite.click('#knopf-neu');
await seite.waitForTimeout(300);
await seite.click('#knopf-laden');
await seite.click(`#ablage-feld [data-wesen="${NAME2}"]`);
await statusMit('^geladen|fehlgeschlagen');
const S8 = await stand();
ok('D geladen', gleich(S5b, S8) && (await A('name')) === NAME2, `aus der Liste: ${S8.punkte} Punkte, Stand ${gleich(S5b, S8) ? 'Bit für Bit wie gesichert' : 'ANDERS'}; „${(await status()).slice(0, 60)}“`);
await ruhig();
await zug(15, 8);
const S9 = await stand();
ok('D Zug danach', S9.bits.every(Number.isFinite) && Math.abs(S9.punkte - S8.punkte) < 0.05 * S8.punkte && !gleich(S8, S9), `${S8.punkte} → ${S9.punkte} Punkte`);
await seite.keyboard.press('Meta+z');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
const S10 = await stand();
ok('D zweimal ⌘Z', gleich(start, S10), `zurück zur Startform von vor dem Laden: ${gleich(start, S10) ? 'ja' : 'NEIN'}`);

// ---------- F: ein nie gesichertes Wesen, „Neu“, neu laden ----------
await seite.click('#knopf-laden');
await seite.click(`#ablage-feld [data-wesen="${NAME2}"]`);
await statusMit('^geladen|fehlgeschlagen');
await ruhig();
await zug(-25, 10);
const S11 = await stand(); // so ist es nirgends gesichert
await seite.click('#knopf-neu');
await seite.waitForFunction(() => window.__kurven.ablage.davor().then((d) => d !== null && d.loops === 3));
await seite.waitForTimeout(400);
await seite.reload();
await bereit();
const S12 = await stand();
ok('F nach „Neu“ neu geladen', gleich(start, S12), `die Startform (kein Wesen kommt von selbst): ${gleich(start, S12) ? 'ja' : 'NEIN'}`);
await seite.click('#knopf-laden');
const davorText = await seite.textContent('#ablage-feld [data-wesen-davor]');
await seite.click('#ablage-feld [data-wesen-davor]');
await statusMit('wieder da|fehlgeschlagen');
const S13 = await stand();
ok('F Wesen von vorher', gleich(S11, S13), `Eintrag „${davorText}“; Stand ${gleich(S11, S13) ? 'Bit für Bit wie vor „Neu“' : 'ANDERS'}`);
await ruhig();
await A('behalten');

// ---------- P: mit Maul in der Fressen-Pose ----------
await seite.click('#knopf-neu');
await seite.waitForTimeout(300);
await seite.keyboard.press('f');
{
  const n = 64;
  const pkt = [];
  for (let i = 0; i <= n; i++) pkt.push(await bild('seite', { x: -115 + 60 * Math.cos((2 * Math.PI * i) / n), y: -20 + 9 * Math.sin((2 * Math.PI * i) / n), z: 0 }));
  await seite.mouse.move(pkt[0][0], pkt[0][1]);
  await seite.mouse.down();
  for (const q of pkt.slice(1)) {
    await seite.mouse.move(q[0], q[1]);
    await seite.waitForTimeout(6);
  }
  await seite.mouse.up();
}
await ruhig();
await seite.click('#knopf-pose');
await seite.waitForTimeout(400);
{
  const mund = (await K('loops')).find((l) => l.punkte.some((q) => q.mundwinkel));
  const unten = [...mund.punkte].filter((q) => !q.mundwinkel && q.sichtbar !== false).sort((a, b) => a.ref.y - b.ref.y)[0];
  await ziehen(await bild('seite', unten.ref), await bild('seite', { ...unten.ref, y: unten.ref.y - 25 }), 12);
}
await seite.waitForTimeout(500);
await ruhig();
await regler('maul-oeffnung', 45);
await regler('kopf-oeffnung', 10);
// größter Unterschied zweier Lagenlisten (gleiches Netz)
const weit = (a, b) => (a.length === b.length ? a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0) : Infinity);
// zum Vergleich, ohne Sichern: die Pose verlassen und wieder betreten (das Fenster rechnet sie dabei neu aus Grundform, Blendshape
// und Knochen; um so viel ändert das allein die Lagen)
const vorWechsel = await K('lagen');
await seite.click('#knopf-pose');
await seite.waitForTimeout(400);
await seite.click('#knopf-pose');
await seite.waitForTimeout(400);
const wechselAllein = weit(await K('lagen'), vorWechsel);
const P1 = await standPose();
await A('behalten');
await seite.reload();
await bereit();
const P2 = await standPose();
ok('P Pose neu geladen', gleichPose(P1, P2) && P2.knopf === 'true', `wieder in der Pose (${P2.pose}), Regler ${P2.regler}, Stand samt Grundform ${gleichPose(P1, P2) ? 'Bit für Bit gleich' : 'ANDERS'}; „${(await status()).slice(0, 70)}“`);
await ruhig();
// sichern in der Pose, Neu, laden
await seite.keyboard.press('Meta+s');
await seite.fill('#ablage-name', NAME3);
await seite.keyboard.press('Enter');
await statusMit('^gesichert|fehlgeschlagen');
await seite.click('#knopf-neu');
await seite.waitForTimeout(300);
const P3 = await standPose();
ok('P Neu aus der Pose', gleich(start, P3) && P3.knopf === 'false' && P3.maul === 'null', `die Startform, nicht in der Pose, kein Maul: ${gleich(start, P3) && P3.knopf === 'false' ? 'ja' : 'NEIN'}`);
await seite.click('#knopf-laden');
await seite.click(`#ablage-feld [data-wesen="${NAME3}"]`);
await statusMit('^geladen|fehlgeschlagen');
const P4 = await standPose();
ok('P geladen', gleichPose(P1, P4), `„${(await status()).slice(0, 70)}“; Stand samt Grundform ${gleichPose(P1, P4) ? 'Bit für Bit wie gesichert' : 'ANDERS'}`);
await ruhig();
// zurück in die Grundform: wie vor der Pose
await seite.click('#knopf-pose');
await seite.waitForTimeout(400);
const grundNachher = await K('lagen');
const grundGleich = grundNachher.length === P1.grund.length && grundNachher.every((v, i) => Object.is(v, P1.grund[i]));
ok('P Grundform', grundGleich, `nach dem Laden die Pose verlassen: die Grundform wie gesichert ${grundGleich ? 'Bit für Bit' : `ANDERS (bis ${weit(grundNachher, P1.grund)})`}`);
// und wieder hinein: die Pose wie gesichert (bis auf das, was Verlassen und Betreten auch ohne Sichern ändern)
await seite.click('#knopf-pose');
await seite.waitForTimeout(400);
const P5 = await standPose();
const wechselNachLaden = weit(await K('lagen'), vorWechsel);
const [k1, k5] = [JSON.parse(P1.pose), JSON.parse(P5.pose)];
const knochenGleich = k5.an === true && k5.kiefer === k1.kiefer && k5.schaedel === k1.schaedel && Math.abs(k5.blendshape - k1.blendshape) < 1e-9 && P5.regler === P1.regler;
ok('P wieder hinein', knochenGleich && wechselNachLaden <= Math.max(1e-9, 3 * wechselAllein), `Knochen und Blendshape ${knochenGleich ? 'wie gesichert' : 'ANDERS'}; Lagen gegen vorher bis ${wechselNachLaden.toExponential(1)} (Verlassen und Betreten allein, ohne Sichern: ${wechselAllein.toExponential(1)})`);

// ---------- E: andere Startform ----------
seite = await kontext.newPage();
horchen(seite);
const andere = new URL(basis);
andere.searchParams.set('dreiecke', andere.searchParams.get('dreiecke') === '14000' ? '6000' : '14000');
await seite.goto(andere.href);
await bereit();
const S14 = await stand();
ok('E andere Startform', S14.zahl === 0 && S14.punkte !== start.punkte, `das behaltene Wesen kommt hier nicht von selbst: ${S14.punkte} Punkte, ${S14.zahl} Loops, Maß ${S14.mk.toFixed(3)}`);
await seite.click('#knopf-laden');
await seite.click(`#ablage-feld [data-wesen="${NAME2}"]`);
await statusMit('^geladen|fehlgeschlagen');
const S15 = await stand();
ok('E geladen', gleich(S5b, S15), `${S15.punkte} Punkte, Maß ${S15.mk.toFixed(3)} (das des Wesens: ${S5b.mk.toFixed(3)}; das der Seite war ${S14.mk.toFixed(3)})`);
await ruhig();
await zug(15, 8);
const S16 = await stand();
ok('E Zug danach', S16.bits.every(Number.isFinite) && Math.abs(S16.punkte - S15.punkte) < 0.05 * S15.punkte, `${S15.punkte} → ${S16.punkte} Punkte (das Netz bleibt beim Maß des Wesens)`);
await seite.keyboard.press('Meta+z');
await seite.keyboard.press('Meta+z');
await seite.waitForTimeout(300);
const S17 = await stand();
ok('E zweimal ⌘Z', gleich(S14, S17), `zurück zur dichteren Startform samt ihrem Maß ${S17.mk.toFixed(3)}: ${gleich(S14, S17) ? 'ja' : 'NEIN'}`);

ok('Konsole', fehler.length === 0, fehler.length ? fehler.slice(0, 3).join(' | ') : 'keine Fehler');
await browser.close();
if (process.env.LASSEN !== '1') {
  const ordner = fileURLToPath(new URL('../../../../wesen/', import.meta.url));
  for (const n of [NAME, NAME2, NAME3]) await rm(`${ordner}${n}.eewesen`, { force: true });
  console.log('(die Dateien der Probe in wesen/ sind wieder weg)');
}
console.log(alleGut ? 'alles gut' : 'ES GIBT FEHLER');
