// Form zuerst (08.11.2026), kleines Detail herausziehen (Florian mit Bild: „warum es ungenau und eckig wird, wenn ich kleine Details
// rausziehe … Die Linie wird ganz kantig. Der Punkt sitzt nicht mehr exakt auf der Linie und ich habe Probleme, einen neuen Punkt
// einzufügen direkt am Detail“). Nachgestellt wie im Bild: Kugel, drei Loops (Ring waagerecht, Mitte, Ring senkrecht), auf dem
// senkrechten Ring in der Front vier Punkte per Doppelklick (40°, 50°, 60°, 70° vom Scheitel), die zwei mittleren zusammen 70 nach
// außen (ein Ohr). Gemessen:
//   - Linie gegen ihren Pfad zwischen den Proben (wie weit die gezeichnete Linie die Kurve abschneidet) und Abstand der Proben,
//   - wie weit jeder Punkt neben der gezeichneten Linie liegt,
//   - Haut am Ohr: längste Kante, größte Drehung der Normale über eine Kante,
//   - Doppelklick auf die Linie am Ohr: kommt ein Punkt dazu?
// Bilder der Front bei 307 % und 3D.
// Aufruf aus apps/editor: node scripts/pruefen/form-detail-probe.mjs <ordner> [name]   (KURVEN_URL für Varianten)
import { chromium } from '@playwright/test';

const ordner = process.argv[2] ?? '.';
const name = process.argv[3] ?? 'vorher';
const basis = process.env.KURVEN_URL ?? 'http://localhost:5193/kurven.html';
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('console', (m) => {
  if (m.type() === 'error') fehler.push(m.text());
});
seite.on('pageerror', (e) => fehler.push(String(e)));
await seite.goto(basis);
await seite.waitForFunction(() => window.__kurven !== undefined);
await seite.waitForTimeout(400);
const K = (f, ...a) => seite.evaluate(([f2, a2]) => window.__kurven[f2](...a2), [f, a]);
const bild = (a, p) => K('bild', a, p);
const xy = (p) => [p.x, p.y];
const ziehen = async ([x, y], [x2, y2], n = 40, mod = null) => {
  await seite.mouse.move(x, y);
  if (mod) await seite.keyboard.down(mod);
  await seite.mouse.down();
  for (let i = 1; i <= n; i++) await seite.mouse.move(x + ((x2 - x) * i) / n, y + ((y2 - y) * i) / n);
  await seite.mouse.up();
  if (mod) await seite.keyboard.up(mod);
  await seite.waitForTimeout(1500);
};

// ---------- Rechnung des Pfads (wie im Kern) ----------
const zu = (l) => l.art !== 'ring';
const stuecke = (l) => {
  const P = l.punkte;
  const m = P.length;
  if (zu(l)) return P.map((p, i) => ({ a: i, b: (i + 1) % m, s0: p.s, s1: i + 1 < m ? P[i + 1].s : P[0].s + l.laenge }));
  return P.slice(0, -1).map((p, i) => ({ a: i, b: i + 1, s0: p.s, s1: P[i + 1].s }));
};
const bez = (P0, a, b, P3, t) => {
  const u = 1 - t;
  const [b0, b1, b2, b3] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return ['x', 'y', 'z'].map((k) => (b0 + b1) * P0[k] + b1 * a[k] + b2 * b[k] + (b2 + b3) * P3[k]);
};
const pfadBei = (l, s) => {
  for (const st of stuecke(l)) {
    const x = zu(l) && s < st.s0 ? s + l.laenge : s;
    if (x < st.s0 - 1e-9 || x > st.s1 + 1e-9) continue;
    const A = l.punkte[st.a];
    const B = l.punkte[st.b];
    if (!A.aus || !B.ein) return null;
    return bez(A.ref, A.aus, B.ein, B.ref, st.s1 - st.s0 > 1e-9 ? (x - st.s0) / (st.s1 - st.s0) : 0);
  }
  return null;
};
const probe = (l, j) => [0, 1, 2].map((k) => l.ruhe[3 * j + k]);
const abstandZurStrecke = (q, a, b) => {
  const d = [0, 1, 2].map((k) => b[k] - a[k]);
  const dd = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1;
  const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1] + (q[2] - a[2]) * d[2]) / dd));
  return Math.hypot(q[0] - a[0] - t * d[0], q[1] - a[1] - t * d[1], q[2] - a[2] - t * d[2]);
};
const strecken = (l) => {
  const n = l.s.length;
  const out = [];
  for (let j = 0; j < (zu(l) ? n : n - 1); j++) {
    const k = (j + 1) % n;
    out.push({ j, k, s0: l.s[j], s1: k > j ? l.s[k] : l.s[k] + l.laenge });
  }
  return out;
};
const r = (p) => Math.hypot(p[0], p[1], p[2]);
/** Güte einer Linie: wie weit sie ihren Pfad zwischen den Proben abschneidet (am Ohr = Proben weiter als `R0` von der Mitte), Abstand der Proben, Punkte neben der gezeichneten Linie */
const guete = (l, R0) => {
  let schnittOhr = 0;
  let schnitt = 0;
  let langOhr = 0;
  for (const { j, k, s0, s1 } of strecken(l)) {
    const a = probe(l, j);
    const b = probe(l, k);
    const ohr = r(a) > R0 || r(b) > R0;
    let m = 0;
    for (let i = 1; i < 8; i++) {
      const q = pfadBei(l, s0 + ((s1 - s0) * i) / 8);
      if (q) m = Math.max(m, abstandZurStrecke(q, a, b));
    }
    schnitt = Math.max(schnitt, m);
    if (ohr) {
      schnittOhr = Math.max(schnittOhr, m);
      langOhr = Math.max(langOhr, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
  }
  const neben = l.punkte
    .filter((p) => p.sichtbar)
    .map((p) => Math.min(...strecken(l).map(({ j, k }) => abstandZurStrecke([p.ref.x, p.ref.y, p.ref.z], probe(l, j), probe(l, k)))));
  return { schnittOhr, schnitt, langOhr, neben: Math.max(0, ...neben) };
};
/** Haut am Ohr: längste Kante, größte Drehung der Normale über eine Kante (Ecken weiter als R0 von der Mitte) */
const haut = async (R0) => {
  const P = await K('lagen');
  const T = await K('dreiecke');
  const vn = new Float64Array(P.length);
  for (let i = 0; i < T.length; i += 3) {
    const [a, b, c] = [T[i], T[i + 1], T[i + 2]];
    const ab = [0, 1, 2].map((k) => P[3 * b + k] - P[3 * a + k]);
    const ac = [0, 1, 2].map((k) => P[3 * c + k] - P[3 * a + k]);
    const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] += f[k];
  }
  const n = (v) => {
    const l = Math.hypot(vn[3 * v], vn[3 * v + 1], vn[3 * v + 2]) || 1;
    return [vn[3 * v] / l, vn[3 * v + 1] / l, vn[3 * v + 2] / l];
  };
  const p = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
  let lang = 0;
  let dreh = 0;
  let punkte = 0;
  // Abweichung von der runden Fläche je Kante (Bogen: Länge × Drehung der Normale / 8), wie `verdichten` sie schätzt
  let bogen = 0;
  let ueber = 0;
  const mk = MK ?? 8.64;
  const gesehen = new Set();
  for (let i = 0; i < T.length; i += 3) {
    for (let e = 0; e < 3; e++) {
      const a = T[i + e];
      const b = T[i + ((e + 1) % 3)];
      if (r(p(a)) < R0 && r(p(b)) < R0) continue;
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      if (gesehen.has(key)) continue;
      gesehen.add(key);
      lang = Math.max(lang, Math.hypot(...[0, 1, 2].map((k) => P[3 * a + k] - P[3 * b + k])));
      const na = n(a);
      const nb = n(b);
      const phi = Math.acos(Math.max(-1, Math.min(1, na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2])));
      dreh = Math.max(dreh, (phi * 180) / Math.PI);
      const sg = (Math.hypot(...[0, 1, 2].map((k) => P[3 * a + k] - P[3 * b + k])) * phi) / 8;
      bogen = Math.max(bogen, sg);
      if (sg > mk / 40) ueber++;
    }
  }
  for (let v = 0; v < P.length / 3; v++) if (r(p(v)) > R0) punkte++;
  return { lang, dreh, punkte, alle: P.length / 3, bogen, ueber };
};

// ---------- drei Loops ----------
for (const [a, A, B] of [
  ['seite', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['top', { x: -200, y: 0 }, { x: 200, y: 0 }],
  ['seite', { x: 10, y: 200 }, { x: 10, y: -200 }],
]) {
  await seite.keyboard.press('l');
  await ziehen(xy(await bild(a, { ...A, z: 0 })), xy(await bild(a, { ...B, z: 0 })), 6);
}
await seite.keyboard.press('Escape');
let L = await K('loops');
const ring = L.filter((l) => l.art === 'ring').reduce((b, l) => (Math.max(...l.punkte.map((p) => Math.abs(p.ref.y))) > Math.max(...b.punkte.map((p) => Math.abs(p.ref.y))) ? l : b));
const ringId = ring.id;
// mittlere Kante der Startkugel (wie im Fenster)
const MK = await seite.evaluate(() => {
  const p = window.__kurven.lagen();
  const t = window.__kurven.dreiecke();
  let s = 0;
  let n = 0;
  for (let i = 0; i < t.length; i += 3)
    for (let e = 0; e < 3; e++) {
      const a = t[i + e];
      const b = t[i + ((e + 1) % 3)];
      s += Math.hypot(p[3 * a] - p[3 * b], p[3 * a + 1] - p[3 * b + 1], p[3 * a + 2] - p[3 * b + 2]);
      n++;
    }
  return s / n;
});
const ringVon = async () => (await K('loops')).find((l) => l.id === ringId);

// ---------- vier Punkte per Doppelklick in der Front (wie von Hand: zwischen zwei Proben, auf der Kurve) ----------
const winkel = [40, 50, 60, 70];
for (const w of winkel) {
  const l = await ringVon();
  const th = (w * Math.PI) / 180;
  let best = 0;
  for (let j = 0; j < l.s.length; j++) {
    const q = probe(l, j);
    if (Math.abs(Math.atan2(q[2], q[1]) - th) < Math.abs(Math.atan2(probe(l, best)[2], probe(l, best)[1]) - th)) best = j;
  }
  const j = Math.min(best, l.s.length - 2);
  const q = pfadBei(l, (l.s[j] + l.s[j + 1]) / 2);
  await seite.mouse.dblclick(...xy(await bild('front', { x: q[0], y: q[1], z: q[2] })));
  await seite.waitForTimeout(500);
  await seite.keyboard.press('Escape');
}
let l = await ringVon();
const neue = l.punkte.filter((p) => p.sichtbar && p.kreuzung === null);
console.log(`${name}: ${neue.length} Punkte per Doppelklick auf dem Ring (erwartet ${winkel.length})`);
// die zwei mittleren (50°, 60°) wählen und zusammen 70 nach außen ziehen
const mitte = neue.filter((p) => {
  const w = (Math.atan2(p.ref.z, p.ref.y) * 180) / Math.PI;
  return w > 45 && w < 65;
});
await seite.mouse.click(...xy(await bild('front', mitte[0].ref)));
await seite.waitForTimeout(300);
await seite.keyboard.down('Shift');
await seite.mouse.click(...xy(await bild('front', mitte[1].ref)));
await seite.keyboard.up('Shift');
await seite.waitForTimeout(300);
const rich = { z: Math.sin((55 * Math.PI) / 180), y: Math.cos((55 * Math.PI) / 180) };
const von = mitte[0].ref;
await ziehen(xy(await bild('front', von)), xy(await bild('front', { x: von.x, y: von.y + 70 * rich.y, z: von.z + 70 * rich.z })), 40);
await seite.keyboard.press('Escape');
await seite.waitForTimeout(2500);
l = await ringVon();
const R0 = 165;
const g = guete(l, R0);
const h = await haut(R0);
const rest = (await K('pfadRest'))[(await K('loops')).findIndex((x) => x.id === ringId)];
console.log(
  `${name}: Ohr — Linie schneidet den Pfad bis ${g.schnittOhr.toFixed(2)} ab (ganzer Ring ${g.schnitt.toFixed(2)}), Proben bis ${g.langOhr.toFixed(1)} auseinander, ` +
    `Punkte bis ${g.neben.toFixed(2)} neben der Linie des Netzes, Linie neben dem Pfad an gleicher Stelle ${rest.toFixed(3)}`,
);
console.log(
  `${name}: Haut am Ohr — ${h.punkte} Punkte (von ${h.alle}), Kanten bis ${h.lang.toFixed(1)}, Normale dreht über eine Kante bis ${h.dreh.toFixed(1)}°, ` +
    `weicht bis ${h.bogen.toFixed(2)} von der runden Fläche ab (${h.ueber} Kanten über MK/40) · umgeklappt ${await K('umgeschlagen')}`,
);

// ---------- Bilder: Front bei 307 % am Ohr, 3D ----------
const ohr = l.punkte.filter((p) => p.sichtbar && p.kreuzung === null);
const cz = ohr.reduce((s, p) => s + p.ref.z, 0) / ohr.length;
const cy = ohr.reduce((s, p) => s + p.ref.y, 0) / ohr.length;
await K('ausschnitt', 'front', { cx: cz, cy: -cy, zoom: 3.07 });
await seite.waitForTimeout(300);
{
  const a0 = await bild('front', { x: 0, y: 0, z: 0 });
  const a1 = await bild('front', { x: 0, y: 0, z: 1 });
  const px = Math.hypot(a1.x - a0.x, a1.y - a0.y);
  console.log(`${name}: bei 307 % sind ${px.toFixed(2)} Bildpunkte je Einheit: Linie schneidet ab bis ${(g.schnittOhr * px).toFixed(1)} px, Punkte neben der Linie des Netzes bis ${(g.neben * px).toFixed(1)} px`);
}
// Ring wählen, damit seine Punkte gross gezeigt werden: Klick auf einen Punkt des Ohrs
await seite.mouse.click(...xy(await bild('front', ohr[1].ref)));
await seite.waitForTimeout(400);
const F = await K('felder');
await seite.screenshot({ path: `${ordner}/form-detail-${name}-front-2026-11-08.jpg`, type: 'jpeg', quality: 88, clip: { x: F.front.x, y: F.front.y, width: F.front.w, height: F.front.h } });
const sp = ohr[1].ref;
await K('kamera', { x: sp.x - 330, y: sp.y + 40, z: sp.z + 190 }, { x: sp.x * 0.9, y: sp.y * 0.9, z: sp.z * 0.85 });
await seite.waitForTimeout(400);
await seite.screenshot({ path: `${ordner}/form-detail-${name}-3d-2026-11-08.jpg`, type: 'jpeg', quality: 88, clip: { x: F.drei.x, y: F.drei.y, width: F.drei.w, height: F.drei.h } });
await seite.keyboard.press('Escape');

// ---------- Doppelklick auf die Linie am Ohr ----------
// zwischen den zwei gezogenen Punkten (Spitze) in der Mitte und zwischen dem 40°-Punkt und dem ersten gezogenen bei 20 % und 80 %
const nachS = [...ohr].sort((a, b) => a.s - b.s);
const proben = [
  ['Spitze Mitte', nachS[1].s + 0.5 * (nachS[2].s - nachS[1].s)],
  ['Flanke 20 %', nachS[0].s + 0.2 * (nachS[1].s - nachS[0].s)],
  ['Flanke 80 %', nachS[0].s + 0.8 * (nachS[1].s - nachS[0].s)],
];
for (const [wo, s] of proben) {
  const vor = await ringVon();
  const q = pfadBei(vor, s);
  // auf die gezeichnete Linie: nächste Stelle der Strecken zur Kurve
  let best = null;
  for (const { j, k } of strecken(vor)) {
    const a = probe(vor, j);
    const b = probe(vor, k);
    const d = [0, 1, 2].map((c) => b[c] - a[c]);
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1] + (q[2] - a[2]) * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1)));
    const p = [0, 1, 2].map((c) => a[c] + t * d[c]);
    const dd = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (!best || dd < best.d) best = { d: dd, p };
  }
  const klick = await bild('front', { x: best.p[0], y: best.p[1], z: best.p[2] });
  await seite.mouse.dblclick(klick.x, klick.y);
  await seite.waitForTimeout(600);
  const nach = await ringVon();
  const dazu = nach.punkte.filter((p) => p.sichtbar).length - vor.punkte.filter((p) => p.sichtbar).length;
  const neu = nach.punkte.find((p) => !vor.punkte.some((x) => Math.abs(x.s - p.s) < 1e-6));
  const wohin = neu ? await bild('front', neu.ref) : null;
  // wie weit der neue Punkt neben der Linie des Netzes liegt (Strecken zwischen den Proben), in Bildpunkten des Blatts
  let netz = null;
  if (neu) {
    const q = [neu.ref.x, neu.ref.y, neu.ref.z];
    const d = Math.min(...strecken(nach).map(({ j, k }) => abstandZurStrecke(q, probe(nach, j), probe(nach, k))));
    const a0 = await bild('front', { x: 0, y: 0, z: 0 });
    const a1 = await bild('front', { x: 0, y: 0, z: 1 });
    netz = d * Math.hypot(a1.x - a0.x, a1.y - a0.y);
  }
  console.log(
    `${name}: Doppelklick ${wo}: ${dazu === 1 ? 'Punkt eingefügt' : `kein Punkt (${dazu})`}` +
      (wohin ? `, ${Math.hypot(wohin.x - klick.x, wohin.y - klick.y).toFixed(1)} px neben dem Klick, ${netz.toFixed(2)} px neben der Linie des Netzes` : '') +
      ` · Meldung „${await K('meldung')}“`,
  );
  if (dazu === 1) {
    await seite.keyboard.press('Meta+z');
    await seite.waitForTimeout(400);
  }
  await seite.keyboard.press('Escape');
}
console.log(fehler.length ? `Fehler im Fenster: ${fehler.join(' | ')}` : 'keine Fehler im Fenster');
await browser.close();
