// Linien und Punkte aus Florians Entwurf (Illustrator, 14.11.2026) gewinnen: Bild → Mittellinien → Bézier-Stücke.
// Aufruf aus dem Wurzelordner des Arbeitsbaums:
//   sips -s format bmp docs/look/linien/2026-11-14-florian-fisch-entwurf.webp --out <tmp>/fisch.bmp
//   node apps/editor/scripts/linien/fisch-aus-entwurf.mjs <tmp>/fisch.bmp apps/editor/src/linien/fisch.json [<debug.svg>]
// Das Bild ist ein Export in dreifacher Größe (Umriss 3 Bildpunkte = 1 px, innen rund 0,75 = 0,25 px, Punkte 7,5 = 2,5 px
// Durchmesser): Ausgegeben wird in Punkten des Entwurfs (Bildpunkt / 3).
// Im Entwurf liegen schon Mauszeiger, Tropfen und verdickte Stellen (Florians Skizze des Verhaltens). Die Zeiger werden entfernt,
// die Tropfen nicht als Punkte gezählt, und wo die Linien angeschwollen sind, gilt die Breite des übrigen Stücks.
import fs from 'node:fs';

const [bmpPfad, ausPfad, debugPfad] = process.argv.slice(2);
if (!bmpPfad || !ausPfad) throw new Error('Aufruf: fisch-aus-entwurf.mjs <bmp> <aus.json> [debug.svg]');

// ---------- Bild lesen ----------
const buf = fs.readFileSync(bmpPfad);
const off = buf.readUInt32LE(10);
const W = buf.readInt32LE(18);
const Hs = buf.readInt32LE(22);
const bpp = buf.readUInt16LE(28);
const H = Math.abs(Hs);
const bpx = bpp / 8;
const zeile = Math.ceil((W * bpp) / 32) * 4;
const N = W * H;
const R = new Uint8Array(N);
const G = new Uint8Array(N);
const B = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  const row = Hs < 0 ? y : H - 1 - y;
  for (let x = 0; x < W; x++) {
    const i = off + row * zeile + x * bpx;
    B[y * W + x] = buf[i];
    G[y * W + x] = buf[i + 1];
    R[y * W + x] = buf[i + 2];
  }
}
const hell = (i) => 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];

// Tinte: Mittel der dunkelsten Bildpunkte; Grün der verdeckten Linien: Vorgabe b9d1b4
let ts = [0, 0, 0, 0];
for (let i = 0; i < N; i++) if (hell(i) < 70) ts = [ts[0] + R[i], ts[1] + G[i], ts[2] + B[i], ts[3] + 1];
const tinte = [ts[0] / ts[3], ts[1] / ts[3], ts[2] / ts[3]];
const tinteL = 0.299 * tinte[0] + 0.587 * tinte[1] + 0.114 * tinte[2];
const GRUEN = [0xb9, 0xd1, 0xb4];
const gruenUeber = GRUEN[1] - (GRUEN[0] + GRUEN[2]) / 2; // 26,5 bei voller Deckung
const gruenL = 0.299 * GRUEN[0] + 0.587 * GRUEN[1] + 0.114 * GRUEN[2];
const aInk = new Float32Array(N);
const aGrn = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const g = Math.min(1, Math.max(0, G[i] - (R[i] + B[i]) / 2) / gruenUeber);
  const rest = 255 - hell(i) - g * (255 - gruenL);
  aGrn[i] = g;
  aInk[i] = Math.min(1, Math.max(0, rest / (255 - tinteL)));
}

// ---------- Maske ----------
const maske = new Uint8Array(N);
for (let i = 0; i < N; i++) maske[i] = aInk[i] > 0.1 || aGrn[i] > 0.14 ? 1 : 0;

const maskeRoh = maske.slice();
// Mauszeiger entfernen: kleine weiße Inseln (das Innere der Dreiecke) im Bereich der Skizze, dazu ihr Rand
const BEREICH = { x0: 1080, x1: 1480, y0: 480, y1: 800 };
{
  const komp = new Int32Array(N).fill(-1);
  const stapel = [];
  let nr = 0;
  for (let y = BEREICH.y0; y < BEREICH.y1; y++)
    for (let x = BEREICH.x0; x < BEREICH.x1; x++) {
      const s = y * W + x;
      if (maske[s] || komp[s] >= 0) continue;
      const liste = [];
      komp[s] = nr;
      stapel.push(s);
      let rand = false;
      while (stapel.length) {
        const i = stapel.pop();
        liste.push(i);
        const ix = i % W;
        const iy = (i - ix) / W;
        if (ix <= BEREICH.x0 || ix >= BEREICH.x1 - 1 || iy <= BEREICH.y0 || iy >= BEREICH.y1 - 1) rand = true;
        for (const j of [i - 1, i + 1, i - W, i + W]) {
          if (j < 0 || j >= N || maske[j] || komp[j] >= 0) continue;
          komp[j] = nr;
          stapel.push(j);
        }
      }
      nr++;
      if (!rand && liste.length < 520 && liste.length > 40) {
        // Insel und ihren Rand (bis 3 Bildpunkte) löschen
        for (const i of liste) {
          const ix = i % W;
          const iy = (i - ix) / W;
          for (let dy = -3; dy <= 3; dy++)
            for (let dx = -3; dx <= 3; dx++) {
              const j = (iy + dy) * W + ix + dx;
              maske[j] = 0;
              aInk[j] = 0;
              aGrn[j] = 0;
            }
        }
        const xs = liste.map((i) => i % W);
        const ys = liste.map((i) => Math.floor(i / W));
        console.log('Zeiger entfernt bei', Math.round(xs.reduce((a, b) => a + b) / xs.length), Math.round(ys.reduce((a, b) => a + b) / ys.length), 'Fläche', liste.length);
      }
    }
}

const probeRoh = (arr, x, y) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) return 0;
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * W + x0;
  return (arr[i] * (1 - fx) + arr[i + 1] * fx) * (1 - fy) + (arr[i + W] * (1 - fx) + arr[i + W + 1] * fx) * fy;
};
// ---------- Abstand zum Grund (für Punkte) ----------
function edt(m) {
  const INF = 1e12;
  const f = new Float64Array(Math.max(W, H));
  const d = new Float64Array(Math.max(W, H));
  const v = new Int32Array(Math.max(W, H));
  const z = new Float64Array(Math.max(W, H) + 1);
  const out = new Float64Array(N);
  const eins = (n) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s;
      for (;;) {
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        if (s <= z[k]) k--;
        else break;
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = m[y * W + x] ? INF : 0;
    eins(H);
    for (let y = 0; y < H; y++) out[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = out[y * W + x];
    eins(W);
    for (let x = 0; x < W; x++) out[y * W + x] = Math.sqrt(d[x]);
  }
  return out;
}
const abstand = edt(maske);

// ---------- Punkte: dicke runde Flecken ----------
// Die Tropfen der Skizze sind keine Punkte (Lage aus dem Nahbild umgerechnet).
const TROPFEN = [
  [1313, 540],
  [1275, 698],
];
// In den angeschwollenen Stellen der Skizze sind dicke Flecken keine Punkte; die echten Punkte dort (aus dem Nahbild abgelesen):
const SCHWELLUNG = [
  [1140, 555, 75],
  [1305, 540, 75],
  [1400, 636, 90],
  [1268, 693, 80],
];
const inBereich = (x, y) => SCHWELLUNG.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r);
const ECHT = [
  [1138.5, 553.5],
  [1267.3, 690.1],
  [1291.5, 604.3],
  [1252.5, 729],
];
const punktKand = [];
for (let y = 2; y < H - 2; y++)
  for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    const a = abstand[i];
    if (a < 3.3) continue;
    let max = true;
    for (let dy = -2; dy <= 2 && max; dy++) for (let dx = -2; dx <= 2; dx++) if (abstand[i + dy * W + dx] > a) max = false;
    if (max) punktKand.push({ x, y, a });
  }
punktKand.sort((p, q) => q.a - p.a);
const punkte = [];
for (const p of punktKand) {
  if (punkte.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 9)) continue;
  if (TROPFEN.some(([tx, ty]) => Math.hypot(tx - p.x, ty - p.y) < 9)) continue;
  if (inBereich(p.x, p.y) && !ECHT.some(([ex, ey]) => Math.hypot(ex - p.x, ey - p.y) < 7)) continue;
  // an der Unterlippe laufen Umriss und verdeckte Linie zu einem dicken Fleck zusammen: kein Punkt
  if (Math.hypot(p.x - 257, p.y - 710) < 8) continue;
  // Mitte des Flecks: gewichtet nach Deckung
  let sx = 0;
  let sy = 0;
  let sw = 0;
  let gr = 0;
  for (let dy = -5; dy <= 5; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx + dy * dy > 25) continue;
      const j = (p.y + dy) * W + p.x + dx;
      const w = Math.max(aInk[j], aGrn[j]);
      sx += (p.x + dx) * w;
      sy += (p.y + dy) * w;
      sw += w;
      gr += aGrn[j];
    }
  punkte.push({ x: sx / sw, y: sy / sw, a: p.a, gruen: gr / sw > 0.5 });
}
for (const [ex, ey] of ECHT) {
  const q = punkte.find((p) => Math.hypot(ex - p.x, ey - p.y) < 7);
  if (q) Object.assign(q, { x: ex, y: ey });
  else punkte.push({ x: ex, y: ey, a: 5, gruen: false });
}
console.log('Punkte gefunden:', punkte.length, '(grün:', punkte.filter((p) => p.gruen).length + ')');

// ---------- Mittellinien (Zhang-Suen) ----------
// für das Skelett um einen Bildpunkt verbreitert: dünne Linien zerfallen sonst in Pünktchen
const sk = new Uint8Array(N);
for (let y = 1; y < H - 1; y++)
  for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (maske[i] || maske[i - 1] || maske[i + 1] || maske[i - W] || maske[i + W] || maske[i - W - 1] || maske[i - W + 1] || maske[i + W - 1] || maske[i + W + 1]) sk[i] = 1;
  }
{
  const weg = [];
  let geaendert = true;
  while (geaendert) {
    geaendert = false;
    for (let durchgang = 0; durchgang < 2; durchgang++) {
      weg.length = 0;
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (!sk[i]) continue;
          const p2 = sk[i - W], p3 = sk[i - W + 1], p4 = sk[i + 1], p5 = sk[i + W + 1];
          const p6 = sk[i + W], p7 = sk[i + W - 1], p8 = sk[i - 1], p9 = sk[i - W - 1];
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const a = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
          if (a !== 1) continue;
          if (durchgang === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          weg.push(i);
        }
      for (const i of weg) sk[i] = 0;
      if (weg.length) geaendert = true;
    }
  }
}
const NB = [-W - 1, -W, -W + 1, 1, W + 1, W, W - 1, -1];
const nachbarn = (i) => NB.map((d) => i + d).filter((j) => sk[j]);
// Knoten: Enden (1 Nachbar) und Verzweigungen (3 und mehr Übergänge im Kreis)
const uebergaenge = (i) => {
  let a = 0;
  for (let k = 0; k < 8; k++) if (!sk[i + NB[k]] && sk[i + NB[(k + 1) % 8]]) a++;
  return a;
};
const istKnoten = new Uint8Array(N);
for (let i = W; i < N - W; i++) {
  if (!sk[i]) continue;
  const n = nachbarn(i).length;
  if (n === 1 || n === 0 || uebergaenge(i) >= 3) istKnoten[i] = 1;
}
// Knoten-Haufen zusammenfassen
const haufen = new Int32Array(N).fill(-1);
const knoten = [];
for (let i = 0; i < N; i++) {
  if (!istKnoten[i] || haufen[i] >= 0) continue;
  const nr = knoten.length;
  const liste = [i];
  haufen[i] = nr;
  for (let k = 0; k < liste.length; k++)
    for (const j of nachbarn(liste[k]))
      if (istKnoten[j] && haufen[j] < 0) {
        haufen[j] = nr;
        liste.push(j);
      }
  const x = liste.reduce((s, j) => s + (j % W), 0) / liste.length;
  const y = liste.reduce((s, j) => s + Math.floor(j / W), 0) / liste.length;
  knoten.push({ x, y, pix: liste, kanten: [] });
}
// Kanten verfolgen
const besucht = new Uint8Array(N);
let kanten = [];
for (const [kn, k] of knoten.entries()) {
  for (const s of k.pix)
    for (const j0 of nachbarn(s)) {
      if (istKnoten[j0]) {
        if (haufen[j0] !== kn) {
          // zwei Haufen direkt benachbart
          const ziel = haufen[j0];
          if (!kanten.some((e) => (e.a === kn && e.b === ziel) || (e.a === ziel && e.b === kn)))
            kanten.push({ a: kn, b: ziel, pfad: [s, j0] });
        }
        continue;
      }
      if (besucht[j0]) continue;
      const pfad = [s, j0];
      besucht[j0] = 1;
      let vor = s;
      let jetzt = j0;
      let ende = -1;
      for (let schritt = 0; schritt < 20000; schritt++) {
        const nb = nachbarn(jetzt).filter((j) => j !== vor && j !== pfad[pfad.length - 3]);
        const knotenNb = nb.filter((j) => istKnoten[j] && !(haufen[j] === kn && pfad.length < 4));
        if (knotenNb.length) {
          ende = haufen[knotenNb[0]];
          pfad.push(knotenNb[0]);
          break;
        }
        const frei = nb.filter((j) => !besucht[j]);
        if (!frei.length) break;
        // an Treppen den weiteren Schritt nehmen
        const vx = vor % W;
        const vy = Math.floor(vor / W);
        frei.sort((p, q) => Math.hypot((q % W) - vx, Math.floor(q / W) - vy) - Math.hypot((p % W) - vx, Math.floor(p / W) - vy));
        vor = jetzt;
        jetzt = frei[0];
        besucht[jetzt] = 1;
        pfad.push(jetzt);
      }
      if (ende >= 0) kanten.push({ a: kn, b: ende, pfad });
    }
}
console.log('Rohgraph:', knoten.length, 'Knoten,', kanten.length, 'Kanten');

// ---------- Graph aufräumen ----------
const pfadLaenge = (p) => {
  let l = 0;
  for (let k = 1; k < p.length; k++) l += Math.hypot((p[k] % W) - (p[k - 1] % W), Math.floor(p[k] / W) - Math.floor(p[k - 1] / W));
  return l;
};
const grad = () => {
  const g = new Map();
  for (const e of kanten) {
    g.set(e.a, (g.get(e.a) ?? 0) + 1);
    g.set(e.b, (g.get(e.b) ?? 0) + 1);
  }
  return g;
};
// Stummel (Tropfen, Ecken der dicken Linie) und Schleifen an einem Knoten weg
// Ein Stummel, der an einem Punkt endet, ist eine Spitze (Flosse): nicht weg
const amPunkt = (kn) => punkte.some((p) => Math.hypot(p.x - knoten[kn].x, p.y - knoten[kn].y) < 8);
for (let runde = 0; runde < 6; runde++) {
  const g = grad();
  const vorher = kanten.length;
  kanten = kanten.filter((e) => {
    if (e.a === e.b) return pfadLaenge(e.pfad) > 60;
    const l = pfadLaenge(e.pfad);
    const aFrei = g.get(e.a) === 1 && !amPunkt(e.a);
    const bFrei = g.get(e.b) === 1 && !amPunkt(e.b);
    return !((aFrei || bFrei) && l < 16);
  });
  if (kanten.length === vorher) break;
}
// Spitzen: Verzweigung mit kurzem Stummel zum Punkt → die Verzweigung rückt auf die Spitze, der Stummel fällt weg
{
  for (const e of kanten.slice()) {
    const g = grad();
    if (!kanten.includes(e)) continue;
    const l = pfadLaenge(e.pfad);
    if (l > 26) continue;
    for (const [spitze, gabel] of [
      [e.a, e.b],
      [e.b, e.a],
    ]) {
      if (g.get(spitze) !== 1 || g.get(gabel) !== 3 || !amPunkt(spitze)) continue;
      kanten = kanten.filter((q) => q !== e);
      for (const q of kanten) {
        if (q.a === gabel) q.a = spitze;
        if (q.b === gabel) q.b = spitze;
      }
      console.log('Spitze an', Math.round(knoten[spitze].x), Math.round(knoten[spitze].y));
      break;
    }
  }
}
// nahe Knoten verschmelzen (eine Kreuzung zerfällt im Skelett oft in zwei Verzweigungen)
{
  const zu = knoten.map((_, i) => i);
  const wurzel = (i) => (zu[i] === i ? i : (zu[i] = wurzel(zu[i])));
  for (const e of kanten) if (e.a !== e.b && pfadLaenge(e.pfad) < 9) zu[wurzel(e.a)] = wurzel(e.b);
  kanten = kanten.filter((e) => wurzel(e.a) !== wurzel(e.b) || pfadLaenge(e.pfad) > 30);
  for (const e of kanten) {
    e.a = wurzel(e.a);
    e.b = wurzel(e.b);
  }
}
// Lücken schließen (unter den Mauszeigern der Skizze): ein freies Ende, das auf ein anderes freies Ende oder einen Knoten zeigt
{
  const linie = (x0, y0, x1, y1) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    const out = [];
    for (let k = 0; k <= n; k++) out.push(Math.round(y0 + ((y1 - y0) * k) / n) * W + Math.round(x0 + ((x1 - x0) * k) / n));
    return out.filter((v, k) => k === 0 || v !== out[k - 1]);
  };
  const g = grad();
  const freie = [];
  for (const [i, n] of g) {
    if (n !== 1) continue;
    const e = kanten.find((q) => q.a === i || q.b === i);
    const p = e.a === i ? e.pfad : e.pfad.slice().reverse();
    const [x0, y0] = [p[0] % W, Math.floor(p[0] / W)];
    const q = p[Math.min(p.length - 1, 12)];
    const dx = x0 - (q % W);
    const dy = y0 - Math.floor(q / W);
    const l = Math.hypot(dx, dy) || 1;
    freie.push({ i, x: x0, y: y0, d: [dx / l, dy / l], pix: p[0] });
  }
  const ziele = [];
  for (const a of freie) {
    for (const b of freie) {
      if (b.i <= a.i) continue;
      const v = [b.x - a.x, b.y - a.y];
      const l = Math.hypot(v[0], v[1]);
      if (l > 48 || l < 1) continue;
      const u = [v[0] / l, v[1] / l];
      if (a.d[0] * u[0] + a.d[1] * u[1] > 0.55 && -(b.d[0] * u[0] + b.d[1] * u[1]) > 0.55) ziele.push({ a, b, l });
    }
    for (const [ki, k] of knoten.entries()) {
      if ((g.get(ki) ?? 0) < 2) continue;
      const v = [k.x - a.x, k.y - a.y];
      const l = Math.hypot(v[0], v[1]);
      if (l > 40 || l < 1) continue;
      if ((a.d[0] * v[0] + a.d[1] * v[1]) / l > 0.8) ziele.push({ a, b: { i: ki, x: k.x, y: k.y, pix: k.pix[0] }, l: l * 1.2 });
    }
  }
  ziele.sort((p, q) => p.l - q.l);
  const fertig = new Set();
  for (const z of ziele) {
    if (fertig.has(z.a.i) || fertig.has(z.b.i)) continue;
    fertig.add(z.a.i);
    if (g.get(z.b.i) === 1) fertig.add(z.b.i);
    // glatt: am freien Ende in seiner Richtung hinaus, am Ziel in dessen Richtung hinein (ein Knoten: entlang der Sehne)
    const L = z.l / (g.get(z.b.i) === 1 ? 1 : 1.2);
    const m0 = [z.a.d[0] * L, z.a.d[1] * L];
    const m1 = z.b.d ? [-z.b.d[0] * L, -z.b.d[1] * L] : [z.b.x - z.a.x, z.b.y - z.a.y];
    const n = Math.max(2, Math.ceil(L * 1.5));
    const pfad = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const h00 = 2 * t * t * t - 3 * t * t + 1;
      const h10 = t * t * t - 2 * t * t + t;
      const h01 = -2 * t * t * t + 3 * t * t;
      const h11 = t * t * t - t * t;
      const x = h00 * z.a.x + h10 * m0[0] + h01 * z.b.x + h11 * m1[0];
      const y = h00 * z.a.y + h10 * m0[1] + h01 * z.b.y + h11 * m1[1];
      const v = Math.round(y) * W + Math.round(x);
      if (pfad[pfad.length - 1] !== v) pfad.push(v);
    }
    void linie;
    kanten.push({ a: z.a.i, b: z.b.i, pfad });
    console.log('Lücke geschlossen', Math.round(z.a.x), Math.round(z.a.y), '→', Math.round(z.b.x), Math.round(z.b.y));
  }
}

// Punkte den Knoten zuordnen; ein Punkt mitten auf einer Kante teilt sie
for (const p of punkte) {
  const g = grad();
  let best = -1;
  let bd = 11;
  for (const [i, k] of knoten.entries()) {
    if (!g.get(i)) continue;
    const d = Math.hypot(k.x - p.x, k.y - p.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  if (best >= 0) {
    if (knoten[best].punkt) console.log('zweiter Punkt an einem Knoten verworfen bei', Math.round(p.x), Math.round(p.y));
    else knoten[best].punkt = p;
    continue;
  }
  // auf einer Kante?
  let be = null;
  let bk = -1;
  bd = 14;
  for (const e of kanten)
    for (let k = 2; k < e.pfad.length - 2; k++) {
      const d = Math.hypot((e.pfad[k] % W) - p.x, Math.floor(e.pfad[k] / W) - p.y);
      if (d < bd) {
        bd = d;
        be = e;
        bk = k;
      }
    }
  if (!be) {
    // eine Spitze, an der mehrere Linien zusammenlaufen: der nächste Knoten mit Linien rückt auf den Punkt
    let kn = -1;
    let kd = 30;
    for (const [i, k] of knoten.entries()) {
      const d = Math.hypot(k.x - p.x, k.y - p.y);
      if (d < kd && (g.get(i) ?? 0) >= 2 && !k.punkt) {
        kd = d;
        kn = i;
      }
    }
    if (kn >= 0) {
      knoten[kn].punkt = p;
      console.log('Spitze auf den Punkt gerückt bei', Math.round(p.x), Math.round(p.y), 'um', kd.toFixed(1));
    } else console.log('Punkt ohne Linie bei', Math.round(p.x), Math.round(p.y));
    continue;
  }
  const nr = knoten.length;
  knoten.push({ x: p.x, y: p.y, pix: [be.pfad[bk]], kanten: [], punkt: p });
  kanten.push({ a: nr, b: be.b, pfad: be.pfad.slice(bk) });
  be.b = nr;
  be.pfad = be.pfad.slice(0, bk + 1);
}
// Knoten mit Punkt liegen genau auf dem Punkt
for (const k of knoten) if (k.punkt) Object.assign(k, { x: k.punkt.x, y: k.punkt.y });

// Linie durch die Stellen der Skizze (Stern, Linse), die das Skelett nicht hält: von Hand über ihre Punkte gelegt
const VON_HAND = [
  [[1138.5, 553.5], [1166, 566], [1202, 583], [1222, 590], [1248, 596], [1274, 601], [1291.4, 604.4]],
  [[1291.4, 604.4], [1312, 607], [1339, 612], [1378, 623], [1417, 636], [1443, 647], [1466, 660], [1489, 676], [1510.9, 694.5]],
  // die Linie läuft durch die Schwanzwurzel weiter bis an den Rand der Flosse (das Skelett hält sie nicht)
  [[1510.9, 694.5], [1550, 721], [1590, 749], [1630, 777], [1665, 801], [1696, 822.5]],
];
{
  const naechster = (x, y) => {
    let best = -1;
    let bd = 9;
    for (const [i, k] of knoten.entries()) {
      const d = Math.hypot(k.x - x, k.y - y);
      if (d < bd && kanten.some((e) => e.a === i || e.b === i)) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  for (const zug of VON_HAND) {
    // fein abtasten (Catmull-Rom), dann je Probe quer zur Linie auf die Mitte der Tinte ziehen
    let pts = [];
    for (let k = 0; k < zug.length - 1; k++) {
      const p0 = zug[Math.max(0, k - 1)];
      const p1 = zug[k];
      const p2 = zug[k + 1];
      const p3 = zug[Math.min(zug.length - 1, k + 2)];
      const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]));
      for (let j = 0; j < n; j++) {
        const t = j / n;
        const t2 = t * t;
        const t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    pts.push(zug[zug.length - 1]);
    for (let runde = 0; runde < 3; runde++) {
      pts = pts.map((q, k) => {
        if (k < 26 || k > pts.length - 27) return q;
        const a = pts[k - 4];
        const b = pts[k + 4];
        const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const nx = -(b[1] - a[1]) / tl;
        const ny = (b[0] - a[0]) / tl;
        let s0 = 0;
        let s1 = 0;
        for (let o = -6; o <= 6; o += 0.5) {
          const w = Math.max(probeRoh(aInk, q[0] + nx * o, q[1] + ny * o), 0);
          s0 += w;
          s1 += w * o;
        }
        const o = s0 > 0.3 ? Math.max(-3, Math.min(3, s1 / s0)) : 0;
        return [q[0] + nx * o, q[1] + ny * o];
      });
      // glätten
      pts = pts.map((q, k) => (k < 2 || k > pts.length - 3 ? q : [(pts[k - 2][0] + pts[k - 1][0] + q[0] + pts[k + 1][0] + pts[k + 2][0]) / 5, (pts[k - 2][1] + pts[k - 1][1] + q[1] + pts[k + 1][1] + pts[k + 2][1]) / 5]));
    }
    const a = naechster(...zug[0]);
    const b = naechster(...zug[zug.length - 1]);
    if (a < 0 || b < 0) {
      console.log('von Hand: kein Knoten am Ende', zug[0], zug[zug.length - 1]);
      continue;
    }
    const pfad = pts.map(([x, y]) => Math.round(y) * W + Math.round(x)).filter((v, k, arr) => k === 0 || v !== arr[k - 1]);
    kanten.push({ a, b, pfad, fein: pts });
    console.log('von Hand gelegt:', zug[0], '→', zug[zug.length - 1]);
  }
}

// Kanten durch Knoten vom Grad 2 ohne Punkt zusammenhängen (außer an Ecken; die Ecken findet die Anpassung)
const schleifenKnoten = new Set();
for (let runde = 0; runde < 400; runde++) {
  const g = grad();
  const k2 = [...g.entries()].find(([i, n]) => n === 2 && !knoten[i].punkt && !schleifenKnoten.has(i));
  if (!k2) break;
  const i = k2[0];
  const [e1, e2] = kanten.filter((e) => e.a === i || e.b === i);
  if (!e2 || e1 === e2) {
    schleifenKnoten.add(i);
    continue;
  }
  const p1 = e1.b === i ? e1.pfad : e1.pfad.slice().reverse();
  const p2 = e2.a === i ? e2.pfad : e2.pfad.slice().reverse();
  const a = e1.b === i ? e1.a : e1.b;
  const b = e2.a === i ? e2.b : e2.a;
  kanten = kanten.filter((e) => e !== e1 && e !== e2);
  kanten.push({ a, b, pfad: [...p1, ...p2.slice(1)] });
  if (a === b && a === i) break;
}

// ---------- Pfade als Punktfolgen (in Bildpunkten), Knoten an die Enden ----------
const xy = (i) => [i % W, Math.floor(i / W)];
for (const e of kanten) {
  if (e.fein) {
    e.p = e.fein.slice();
    e.p[0] = [knoten[e.a].x, knoten[e.a].y];
    e.p[e.p.length - 1] = [knoten[e.b].x, knoten[e.b].y];
    continue;
  }
  const roh = e.pfad.map(xy);
  // geglättet (gleitendes Mittel), die Enden genau auf die Knoten
  const n = roh.length;
  const glatt = roh.map((_, k) => {
    let sx = 0;
    let sy = 0;
    let s = 0;
    for (let d = -3; d <= 3; d++) {
      const q = roh[Math.min(n - 1, Math.max(0, k + d))];
      sx += q[0];
      sy += q[1];
      s++;
    }
    return [sx / s, sy / s];
  });
  glatt[0] = [knoten[e.a].x, knoten[e.a].y];
  glatt[n - 1] = [knoten[e.b].x, knoten[e.b].y];
  e.p = glatt;
}

// ---------- Breite und Farbe je Kante ----------
const probe = (arr, x, y) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) return 0;
  const fx = x - x0;
  const fy = y - y0;
  const i = y0 * W + x0;
  return (arr[i] * (1 - fx) + arr[i + 1] * fx) * (1 - fy) + (arr[i + W] * (1 - fx) + arr[i + W + 1] * fx) * fy;
};
// außen: Grund, der vom Bildrand aus erreichbar ist
const aussen = new Uint8Array(N);
{
  const st = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  for (const s of st) aussen[s] = 1;
  while (st.length) {
    const i = st.pop();
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= N || aussen[j] || maskeRoh[j]) continue;
      aussen[j] = 1;
      st.push(j);
    }
  }
}
for (const e of kanten) {
  const breiten = [];
  let grn = 0;
  let ink = 0;
  let aus = 0;
  let proben = 0;
  const n = e.p.length;
  for (let k = 4; k < n - 4; k++) {
    const [x, y] = e.p[k];
    // nicht an den Knoten messen (Kreuzungen, Punkte)
    if (Math.hypot(x - e.p[0][0], y - e.p[0][1]) < 9 || Math.hypot(x - e.p[n - 1][0], y - e.p[n - 1][1]) < 9) continue;
    const tx = e.p[k + 3][0] - e.p[k - 3][0];
    const ty = e.p[k + 3][1] - e.p[k - 3][1];
    const tl = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl;
    const ny = tx / tl;
    let si = 0;
    let sg = 0;
    for (let o = -4; o <= 4; o += 0.5) {
      si += probe(aInk, x + nx * o, y + ny * o) * 0.5;
      sg += probe(aGrn, x + nx * o, y + ny * o) * 0.5;
    }
    breiten.push({ w: si + sg, angeschwollen: inBereich(x, y) });
    grn += sg;
    ink += si;
    for (const o of [-5, 5]) {
      const qx = Math.round(x + nx * o);
      const qy = Math.round(y + ny * o);
      if (aussen[qy * W + qx]) aus++;
    }
    proben++;
  }
  const ws = breiten.filter((b) => !b.angeschwollen).map((b) => b.w);
  const alle = ws.sort((a, b) => a - b);
  e.wenigGemessen = ws.length < 6;
  e.breiteMedian = alle.length ? alle[Math.floor(alle.length / 2)] : 0;
  e.breite90 = alle.length ? alle[Math.floor(alle.length * 0.9)] : 0;
  e.verdeckt = grn > ink;
  e.aussen = proben > 0 && aus / proben > 0.3;
  e.verlauf = breiten.map((b) => b.w);
}

// ---------- Linien bilden: an jedem Knoten die geradesten Paare durchlaufen ----------
const richtungWeg = (e, amAnfang) => {
  // Richtung vom Knoten weg, gemessen 6 bis 16 Bildpunkte entfernt
  const p = amAnfang ? e.p : e.p.slice().reverse();
  const k0 = p[0];
  let sx = 0;
  let sy = 0;
  for (let k = 1; k < p.length; k++) {
    const d = Math.hypot(p[k][0] - k0[0], p[k][1] - k0[1]);
    if (d < 6) continue;
    if (d > 16) break;
    sx += (p[k][0] - k0[0]) / d;
    sy += (p[k][1] - k0[1]) / d;
  }
  if (sx === 0 && sy === 0) {
    const q = p[Math.min(p.length - 1, 3)];
    sx = q[0] - k0[0];
    sy = q[1] - k0[1];
  }
  const l = Math.hypot(sx, sy) || 1;
  return [sx / l, sy / l];
};
const enden = new Map(); // Knoten → Liste {e, anfang}
for (const e of kanten) {
  for (const anfang of [true, false]) {
    const kn = anfang ? e.a : e.b;
    if (!enden.has(kn)) enden.set(kn, []);
    enden.get(kn).push({ e, anfang, r: richtungWeg(e, anfang) });
  }
}
const weiter = new Map(); // "e,anfang" → {e, anfang}
for (const [, liste] of enden) {
  const paare = [];
  for (let i = 0; i < liste.length; i++)
    for (let j = i + 1; j < liste.length; j++) {
      const c = liste[i].r[0] * liste[j].r[0] + liste[i].r[1] * liste[j].r[1];
      paare.push({ i, j, c });
    }
  paare.sort((a, b) => a.c - b.c);
  const frei = new Set(liste.map((_, i) => i));
  for (const pr of paare) {
    if (!frei.has(pr.i) || !frei.has(pr.j)) continue;
    // nur, was ungefähr gerade weiterläuft (bis 60° Knick), oder an einem Knoten mit genau zwei Enden (Ecke)
    if (pr.c > -0.5 && liste.length !== 2) continue;
    frei.delete(pr.i);
    frei.delete(pr.j);
    const A = liste[pr.i];
    const Bq = liste[pr.j];
    weiter.set(`${kanten.indexOf(A.e)},${A.anfang}`, Bq);
    weiter.set(`${kanten.indexOf(Bq.e)},${Bq.anfang}`, A);
  }
}
const linien = [];
const vergeben = new Set();
const kantenKey = (e) => kanten.indexOf(e);
for (const start of kanten) {
  if (vergeben.has(kantenKey(start))) continue;
  // rückwärts bis zum Anfang laufen
  let e = start;
  let vorwaerts = true; // Kante e wird von a nach b durchlaufen
  for (let s = 0; s < 500; s++) {
    const zurueck = weiter.get(`${kantenKey(e)},${vorwaerts}`); // am Anfangsknoten der Laufrichtung
    if (!zurueck || zurueck.e === start) break;
    e = zurueck.e;
    vorwaerts = !zurueck.anfang;
  }
  const kette = [];
  let zu = false;
  for (let s = 0; s < 500; s++) {
    kette.push({ e, vorwaerts });
    vergeben.add(kantenKey(e));
    const n = weiter.get(`${kantenKey(e)},${!vorwaerts}`); // am Endknoten der Laufrichtung
    if (!n) break;
    if (n.e === kette[0].e) {
      zu = true;
      break;
    }
    if (vergeben.has(kantenKey(n.e))) break;
    e = n.e;
    vorwaerts = n.anfang;
  }
  linien.push({ kette, zu });
}
console.log('Linien:', linien.length);

// ---------- Bézier-Stücke anpassen ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const bez = (P, t) => {
  const u = 1 - t;
  return [
    u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
    u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1],
  ];
};
// Schneider: Länge der Griffe bei festen Richtungen; Parameter nach Bogenlänge, dann zweimal nachgestellt
function stueckAnpassen(pts, t0, t3) {
  const n = pts.length;
  const P0 = pts[0];
  const P3 = pts[n - 1];
  const u = [0];
  for (let k = 1; k < n; k++) u.push(u[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const L = u[n - 1] || 1;
  for (let k = 0; k < n; k++) u[k] /= L;
  let P = null;
  for (let iter = 0; iter < 4; iter++) {
    let c00 = 0;
    let c01 = 0;
    let c11 = 0;
    let x0 = 0;
    let x1 = 0;
    for (let k = 0; k < n; k++) {
      const t = u[k];
      const b0 = (1 - t) ** 3;
      const b1 = 3 * t * (1 - t) ** 2;
      const b2 = 3 * t * t * (1 - t);
      const b3 = t ** 3;
      const A1 = [t0[0] * b1, t0[1] * b1];
      const A2 = [t3[0] * b2, t3[1] * b2];
      c00 += A1[0] * A1[0] + A1[1] * A1[1];
      c01 += A1[0] * A2[0] + A1[1] * A2[1];
      c11 += A2[0] * A2[0] + A2[1] * A2[1];
      const rest = sub(pts[k], [P0[0] * (b0 + b1) + P3[0] * (b2 + b3), P0[1] * (b0 + b1) + P3[1] * (b2 + b3)]);
      x0 += A1[0] * rest[0] + A1[1] * rest[1];
      x1 += A2[0] * rest[0] + A2[1] * rest[1];
    }
    const det = c00 * c11 - c01 * c01;
    let a = det ? (x0 * c11 - x1 * c01) / det : 0;
    let b = det ? (c00 * x1 - c01 * x0) / det : 0;
    const sehne = Math.hypot(P3[0] - P0[0], P3[1] - P0[1]);
    if (!(a > sehne * 1e-3) || !(b > sehne * 1e-3) || a > sehne * 2 || b > sehne * 2) a = b = sehne / 3;
    P = [P0, [P0[0] + t0[0] * a, P0[1] + t0[1] * a], [P3[0] + t3[0] * b, P3[1] + t3[1] * b], P3];
    // Parameter nachstellen (Newton)
    for (let k = 1; k < n - 1; k++) {
      const t = u[k];
      const q = bez(P, t);
      const d1 = [
        3 * ((1 - t) ** 2 * (P[1][0] - P[0][0]) + 2 * (1 - t) * t * (P[2][0] - P[1][0]) + t * t * (P[3][0] - P[2][0])),
        3 * ((1 - t) ** 2 * (P[1][1] - P[0][1]) + 2 * (1 - t) * t * (P[2][1] - P[1][1]) + t * t * (P[3][1] - P[2][1])),
      ];
      const d2 = [
        6 * ((1 - t) * (P[2][0] - 2 * P[1][0] + P[0][0]) + t * (P[3][0] - 2 * P[2][0] + P[1][0])),
        6 * ((1 - t) * (P[2][1] - 2 * P[1][1] + P[0][1]) + t * (P[3][1] - 2 * P[2][1] + P[1][1])),
      ];
      const r = sub(q, pts[k]);
      const z = r[0] * d1[0] + r[1] * d1[1];
      const nn = d1[0] * d1[0] + d1[1] * d1[1] + r[0] * d2[0] + r[1] * d2[1];
      if (Math.abs(nn) > 1e-9) u[k] = Math.min(1, Math.max(0, t - z / nn));
    }
  }
  let fehler = 0;
  let wo = 0;
  for (let k = 0; k < n; k++) {
    const q = bez(P, u[k]);
    const d = Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1]);
    if (d > fehler) {
      fehler = d;
      wo = k;
    }
  }
  return { P, fehler, wo };
}
// Richtung der Folge an Stelle k (über ±5 Proben)
const tangente = (pts, k) => {
  const a = pts[Math.max(0, k - 5)];
  const b = pts[Math.min(pts.length - 1, k + 5)];
  return norm(sub(b, a));
};
// Ecken entlang eines Pfads: Knick über ±7 Proben größer als 45°
function ecken(pts) {
  const n = pts.length;
  const w = [];
  for (let k = 8; k < n - 8; k++) {
    const a = norm(sub(pts[k], pts[k - 7]));
    const b = norm(sub(pts[k + 7], pts[k]));
    w.push({ k, c: a[0] * b[0] + a[1] * b[1] });
  }
  const res = [];
  for (const q of w) {
    if (q.c > 0.7) continue;
    const lokal = w.filter((r) => Math.abs(r.k - q.k) <= 6);
    if (lokal.every((r) => r.c >= q.c) && !res.some((k) => Math.abs(k - q.k) < 8)) res.push(q.k);
  }
  return res;
}

const TOL = 1.6; // Bildpunkte
const ausPunkte = []; // {x, y, sichtbar, verdeckt, ecke}
const knotenNr = new Map();
const punktVon = (kn) => {
  if (!knotenNr.has(kn)) {
    const k = knoten[kn];
    knotenNr.set(kn, ausPunkte.length);
    ausPunkte.push({ x: k.x, y: k.y, sichtbar: !!k.punkt, verdeckt: !!k.punkt?.gruen });
  }
  return knotenNr.get(kn);
};
const ausLinien = [];
for (const lin of linien) {
  // die ganze Folge der Linie, mit den Knoten als Stützstellen
  const stuecke = lin.kette.map(({ e, vorwaerts }) => ({
    pts: vorwaerts ? e.p : e.p.slice().reverse(),
    von: vorwaerts ? e.a : e.b,
    nach: vorwaerts ? e.b : e.a,
    e,
  }));
  // Tangenten an den Knoten der Linie: Mittel beider Seiten (glatt), an Ecken je Seite
  const n = stuecke.length;
  const seg = [];
  for (let s = 0; s < n; s++) {
    const st = stuecke[s];
    // Ecken im Inneren des Stücks → Teilung
    const ek = ecken(st.pts);
    const teile = [];
    let k0 = 0;
    for (const k of ek) {
      teile.push({ pts: st.pts.slice(k0, k + 1), ecke0: k0 > 0, ecke1: true });
      k0 = k;
    }
    teile.push({ pts: st.pts.slice(k0), ecke0: k0 > 0, ecke1: false });
    teile.forEach((t, ti) => {
      t.von = ti === 0 ? { kn: st.von } : { neu: t.pts[0], ecke: true };
      t.nach = ti === teile.length - 1 ? { kn: st.nach } : { neu: t.pts[t.pts.length - 1], ecke: true };
      t.e = st.e;
      seg.push(t);
    });
  }
  // Knotenfolge der Linie
  const m = seg.length;
  const richtungAm = (si, anfang) => {
    const t = seg[si];
    return anfang ? tangente(t.pts, 0) : tangente(t.pts, t.pts.length - 1);
  };
  const tan = [];
  for (let si = 0; si < m; si++) {
    // Tangente am Anfang von seg[si]
    const vorher = si > 0 ? si - 1 : lin.zu ? m - 1 : -1;
    const ecke = seg[si].von.ecke || (vorher >= 0 && seg[vorher].nach.ecke);
    const hier = richtungAm(si, true);
    if (vorher < 0) tan.push({ ein: null, aus: hier });
    else {
      const dort = richtungAm(vorher, false);
      // Ecke auch dann, wenn die Linie an einem Knoten stark knickt
      const knick = hier[0] * dort[0] + hier[1] * dort[1] < 0.75;
      if (ecke || knick) tan.push({ ein: [-dort[0], -dort[1]], aus: hier, ecke: true });
      else {
        const t = norm([hier[0] + dort[0], hier[1] + dort[1]]);
        tan.push({ ein: [-t[0], -t[1]], aus: t });
      }
    }
  }
  const endTan = lin.zu ? tan[0] : { ein: (() => { const d = richtungAm(m - 1, false); return [-d[0], -d[1]]; })(), aus: null };
  // Stücke anpassen, bei zu großem Fehler teilen
  const knotenFolge = [];
  const bezStuecke = [];
  const anpassen = (pts, t0, t3, tiefe) => {
    const r = stueckAnpassen(pts, t0, [-t3[0], -t3[1]]);
    if (r.fehler <= TOL || pts.length < 12 || tiefe > 6) return [r.P];
    const k = Math.min(pts.length - 6, Math.max(5, r.wo));
    const tm = tangente(pts, k);
    return [...anpassen(pts.slice(0, k + 1), t0, tm, tiefe + 1), ...anpassen(pts.slice(k), tm, t3, tiefe + 1)];
  };
  for (let si = 0; si < m; si++) {
    const t = seg[si];
    const t0 = tan[si].aus;
    const tEnde = si + 1 < m ? tan[si + 1].ein : endTan.ein;
    const t3 = [-tEnde[0], -tEnde[1]];
    const teile = anpassen(t.pts, t0, t3, 0);
    const von = t.von.kn !== undefined ? punktVon(t.von.kn) : null;
    teile.forEach((P, pi) => {
      let a;
      if (pi === 0) {
        a = von ?? ausPunkte.push({ x: P[0][0], y: P[0][1], sichtbar: false, verdeckt: false, ecke: true }) - 1;
        if (tan[si].ecke) ausPunkte[a].ecke = true;
      } else a = ausPunkte.push({ x: P[0][0], y: P[0][1], sichtbar: false, verdeckt: false }) - 1;
      knotenFolge.push(a);
      bezStuecke.push({ P, e: t.e });
    });
  }
  // Endpunkt
  const letzte = seg[m - 1].nach;
  if (!lin.zu) knotenFolge.push(letzte.kn !== undefined ? punktVon(letzte.kn) : ausPunkte.push({ x: letzte.neu[0], y: letzte.neu[1], sichtbar: false, verdeckt: false }) - 1);
  ausLinien.push({ zu: lin.zu, knotenFolge, bezStuecke });
}

// ---------- Aufräumen: Enden auf nahe Punkte, Stützen dicht an Punkten weg ----------
{
  const nah = (a, b, r) => Math.hypot(ausPunkte[a].x - ausPunkte[b].x, ausPunkte[a].y - ausPunkte[b].y) < r;
  const sichtbare = ausPunkte.map((p, i) => (p.sichtbar ? i : -1)).filter((i) => i >= 0);
  for (const l of ausLinien) {
    if (l.zu) continue;
    for (const ende of [0, l.knotenFolge.length - 1]) {
      const a = l.knotenFolge[ende];
      if (ausPunkte[a].sichtbar) continue;
      const b = sichtbare.find((v) => nah(a, v, 12));
      if (b === undefined) continue;
      // das Stück zum Ende behält seine Form, der Endpunkt wandert auf den Punkt
      l.knotenFolge[ende] = b;
      console.log('Ende eingerastet bei', Math.round(ausPunkte[b].x), Math.round(ausPunkte[b].y));
    }
    if (l.knotenFolge[0] === l.knotenFolge[l.knotenFolge.length - 1] && l.knotenFolge.length > 2) {
      l.knotenFolge.pop();
      l.zu = true;
      console.log('Linie geschlossen bei', Math.round(ausPunkte[l.knotenFolge[0]].x), Math.round(ausPunkte[l.knotenFolge[0]].y));
    }
  }
  // Stützen, die dicht neben einem Nachbarpunkt derselben Linie liegen: Stücke zusammenlegen
  for (const l of ausLinien) {
    for (let k = 0; k < l.knotenFolge.length; k++) {
      const n = l.knotenFolge.length;
      const p = l.knotenFolge[k];
      if (ausPunkte[p].sichtbar || n < 3) continue;
      const vor = l.zu ? l.knotenFolge[(k - 1 + n) % n] : k > 0 ? l.knotenFolge[k - 1] : -1;
      const nach = l.zu ? l.knotenFolge[(k + 1) % n] : k < n - 1 ? l.knotenFolge[k + 1] : -1;
      const anVor = vor >= 0 && nah(p, vor, 12);
      const anNach = nach >= 0 && nah(p, nach, 12);
      if (!anVor && !anNach) continue;
      if (!l.zu && (k === 0 || k === n - 1)) continue;
      // Stück k-1 (vor → p) und Stück k (p → nach) zu einem: Griffe der äußeren Enden behalten
      const si0 = (k - 1 + l.bezStuecke.length) % l.bezStuecke.length;
      const si1 = k % l.bezStuecke.length;
      const A = l.bezStuecke[si0];
      const Bs = l.bezStuecke[si1];
      const neu = { P: [A.P[0], A.P[1], Bs.P[2], Bs.P[3]], e: A.e };
      l.bezStuecke.splice(si0, 1, neu);
      l.bezStuecke.splice(si1 > si0 ? si1 : si1, 1);
      l.knotenFolge.splice(k, 1);
      k--;
    }
  }
}

// Kreuzungen schließen: läuft eine Linie mit einer Stütze dicht an einem sichtbaren Punkt vorbei, wird er ihr Punkt
{
  ausPunkte.forEach((p, pi) => {
    if (!p.sichtbar) return;
    for (const l of ausLinien) {
      if (l.knotenFolge.includes(pi)) continue;
      let best = -1;
      let bd = 12;
      l.knotenFolge.forEach((q, k) => {
        if (ausPunkte[q].sichtbar) return;
        const d = Math.hypot(ausPunkte[q].x - p.x, ausPunkte[q].y - p.y);
        if (d < bd) {
          bd = d;
          best = k;
        }
      });
      if (best < 0) continue;
      l.knotenFolge[best] = pi;
      console.log('Kreuzung geschlossen bei', Math.round(p.x), Math.round(p.y), 'um', bd.toFixed(1));
    }
  });
  // Punkte, die keine Linie mehr nutzt, fallen weg (Nummern neu)
  const genutzt = new Set(ausLinien.flatMap((l) => l.knotenFolge));
  const neu = new Map();
  const behalten = [];
  ausPunkte.forEach((p, i) => {
    if (!genutzt.has(i)) return;
    neu.set(i, behalten.length);
    behalten.push(p);
  });
  for (const l of ausLinien) l.knotenFolge = l.knotenFolge.map((i) => neu.get(i));
  ausPunkte.length = 0;
  ausPunkte.push(...behalten);
}

// ---------- Ausgabe in Punkten des Entwurfs ----------
const S = 1 / 3;
const r2 = (v) => Math.round(v * S * 100) / 100;
const daten = {
  quelle: 'docs/look/linien/2026-11-14-florian-fisch-entwurf.webp',
  hinweis: 'Aus dem Entwurf gewonnen mit apps/editor/scripts/linien/fisch-aus-entwurf.mjs; Einheit: Punkt des Entwurfs (Bildpunkt / 3).',
  breite: W * S,
  hoehe: H * S,
  tinte: '#' + tinte.map((c) => Math.round(c).toString(16).padStart(2, '0')).join(''),
  punkte: ausPunkte.map((p) => ({ x: r2(p.x), y: r2(p.y), ...(p.sichtbar ? {} : { stuetze: true }), ...(p.verdeckt ? { verdeckt: true } : {}), ...(p.ecke ? { ecke: true } : {}) })),
  linien: ausLinien.map((l) => ({
    zu: l.zu,
    punkte: l.knotenFolge,
    stuecke: l.bezStuecke.map(({ P, e }) => ({
      g1: [r2(P[1][0] - P[0][0]), r2(P[1][1] - P[0][1])],
      g2: [r2(P[2][0] - P[3][0]), r2(P[2][1] - P[3][1])],
      art: e.verdeckt ? 'verdeckt' : e.aussen ? 'umriss' : !e.wenigGemessen && e.breite90 > 1.35 ? 'kante' : 'innen',
      b: Math.round(e.breiteMedian * 100) / 100,
      b90: Math.round(e.breite90 * 100) / 100,
    })),
  })),
};
fs.writeFileSync(ausPfad, JSON.stringify(daten));
console.log('geschrieben:', ausPfad, daten.punkte.length, 'Punkte,', daten.linien.length, 'Linien,', daten.linien.reduce((s, l) => s + l.stuecke.length, 0), 'Stücke; Tinte', daten.tinte);
const arten = {};
for (const l of daten.linien) for (const s of l.stuecke) arten[s.art] = (arten[s.art] ?? 0) + 1;
console.log('Arten:', JSON.stringify(arten));

if (debugPfad) {
  const farbe = { umriss: '#e0218a', innen: '#1c7cff', kante: '#ff8a00', verdeckt: '#18a058' };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  svg += `<image href="docs-entwurf.webp" x="0" y="0" width="${W}" height="${H}" opacity="0.35"/>`;
  for (const l of ausLinien)
    for (const { P, e } of l.bezStuecke) {
      const art = e.verdeckt ? 'verdeckt' : e.aussen ? 'umriss' : !e.wenigGemessen && e.breite90 > 1.35 ? 'kante' : 'innen';
      svg += `<path d="M${P[0]} C${P[1]} ${P[2]} ${P[3]}" fill="none" stroke="${farbe[art]}" stroke-width="2"/>`;
    }
  for (const p of ausPunkte)
    svg += p.sichtbar
      ? `<circle cx="${p.x}" cy="${p.y}" r="5" fill="none" stroke="${p.verdeckt ? '#18a058' : '#000'}" stroke-width="1.5"/>`
      : `<rect x="${p.x - 3}" y="${p.y - 3}" width="6" height="6" fill="none" stroke="${p.ecke ? '#d00' : '#888'}" stroke-width="1"/>`;
  svg += '</svg>';
  fs.writeFileSync(debugPfad, svg);
  console.log('Prüfbild:', debugPfad);
}
