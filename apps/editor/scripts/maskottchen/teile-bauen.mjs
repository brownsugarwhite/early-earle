// Baut aus teile-def.mjs die Formen des Maskottchens: je Teil gleiche Punktzahl in jeder Ansicht (zwischen zwei Marken gleich
// viele Punkte, gleichmäßig nach Bogenlänge), relativ zum Anker der Ansicht. Ausgabe: src/maskottchen/daten/formen.ts
//   node scripts/maskottchen/teile-bauen.mjs
import fs from 'node:fs';
import { kopf, koerper } from './teile-def.mjs';
import { laenge, ladeSpur, naechster, wegLaengs } from './spurdaten.mjs';

const ABSTAND = Number(process.env.ABSTAND ?? 9); // Bildpunkte zwischen zwei Punkten (im Logo-Maßstab)
const QUELLEN = { logo: ladeSpur('spur.json'), front: ladeSpur('spur-front.json'), seite: ladeSpur('spur-seite.json') };

function catmull(pts, schritt = 2) {
  // glatt durch alle Punkte (Catmull-Rom, gleichmäßig), dicht abgetastet
  if (pts.length === 2) return linie(pts[0], pts[1], schritt);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / schritt));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function linie(a, b, schritt = 2) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / schritt));
  const out = [];
  for (let k = 0; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  return out;
}
/** K Punkte gleichmäßig nach Bogenlänge, Anfang dabei, Ende nicht */
function neuAbtasten(p, K) {
  const s = [0];
  for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const L = s[s.length - 1];
  const out = [];
  let j = 0;
  for (let k = 0; k < K; k++) {
    const ziel = (L * k) / K;
    while (j < p.length - 2 && s[j + 1] < ziel) j++;
    const t = s[j + 1] > s[j] ? (ziel - s[j]) / (s[j + 1] - s[j]) : 0;
    out.push([p[j][0] + (p[j + 1][0] - p[j][0]) * t, p[j][1] + (p[j + 1][1] - p[j][1]) * t]);
  }
  return out;
}

function stueckSpec(teil, ansicht, a, b) {
  return ansicht.s?.[`${a}-${b}`] ?? ['f'];
}

/** Lage der Marken einer Ansicht (angelegt, wo ein Stück der Nachzeichnung folgt) */
function markenLage(teil, ansicht) {
  const u = QUELLEN[ansicht.quelle];
  const n = teil.marken.length;
  const lage = {};
  for (let j = 0; j < n; j++) {
    const name = teil.marken[j];
    const m = ansicht.m[name];
    if (!m) throw new Error(`${teil.name}: Marke ${name} fehlt`);
    const vor = stueckSpec(teil, ansicht, teil.marken[(j - 1 + n) % n], name);
    const nach = stueckSpec(teil, ansicht, name, teil.marken[(j + 1) % n]);
    const folgt = (sp) => sp === 's' || (Array.isArray(sp) && sp[0] === 's');
    if (m.s || folgt(vor) || folgt(nach)) {
      const q = m.s ?? m.p;
      const t = naechster(u, q);
      if (t.d > 12) console.warn(`  ! ${teil.name} ${ansicht.quelle}: Marke ${name} liegt ${t.d.toFixed(1)} neben der Nachzeichnung`);
      lage[name] = { p: t.p, u: t.u, i: t.i };
    } else lage[name] = { p: m.p };
  }
  return lage;
}

function stueckWeg(teil, ansicht, lage, a, b) {
  const sp = stueckSpec(teil, ansicht, a, b);
  const A = lage[a];
  const B = lage[b];
  if (sp === 'g') return linie(A.p, B.p);
  if (sp === 's' || sp[0] === 's') {
    if (A.u === undefined || B.u === undefined || A.u !== B.u) throw new Error(`${teil.name} ${ansicht.quelle}: ${a}-${b} nicht auf einem Umriss`);
    const r = QUELLEN[ansicht.quelle][A.u];
    const vor = wegLaengs(r, A.i, B.i, 1);
    const rueck = wegLaengs(r, A.i, B.i, -1);
    if (Array.isArray(sp) && sp[1]) {
      const nah = (w) => Math.min(...w.map((p) => Math.hypot(p[0] - sp[1][0], p[1] - sp[1][1])));
      return nah(vor) <= nah(rueck) ? vor : rueck;
    }
    return laenge(vor) <= laenge(rueck) ? vor : rueck;
  }
  return catmull([A.p, ...sp.slice(1), B.p]);
}

function bauen(teil, alle) {
  const n = teil.marken.length;
  const winkel = Object.keys(teil.ansichten).map(Number);
  // Wege je Ansicht und Stück
  const wege = {};
  for (const w of winkel) {
    const ans = teil.ansichten[w];
    const lage = markenLage(teil, ans);
    wege[w] = { ans, stuecke: teil.marken.map((a, j) => stueckWeg(teil, ans, lage, a, teil.marken[(j + 1) % n])) };
  }
  return { teil, winkel, wege };
}

function spiegelPaare(teil) {
  // τ: Marke j → gespiegelte Marke; muss die Reihenfolge umkehren
  const n = teil.marken.length;
  if (!teil.paare) return null;
  const idx = Object.fromEntries(teil.marken.map((m, j) => [m, j]));
  const tau = teil.marken.map((_, j) => j);
  for (const [a, b] of teil.paare) {
    tau[idx[a]] = idx[b];
    tau[idx[b]] = idx[a];
  }
  const c = (tau[0] + 0) % n;
  for (let j = 0; j < n; j++) if (tau[j] !== (c - j + n) % n) throw new Error(`${teil.name}: Paare kehren die Reihenfolge nicht um (Marke ${teil.marken[j]})`);
  return tau;
}

function ausgeben(gebaute, gruppe) {
  // K je Stück: über alle Ansichten (und Spiegelpartner) das Maximum; bei Paaren symmetrisch
  const nachName = Object.fromEntries(gebaute.map((g) => [g.teil.name, g]));
  const K = {};
  for (const g of gebaute) {
    const n = g.teil.marken.length;
    K[g.teil.name] = Array.from({ length: n }, (_, j) => Math.max(2, ...g.winkel.map((w) => Math.ceil(laenge(g.wege[w].stuecke[j]) / ABSTAND))));
  }
  for (const g of gebaute) {
    const p = g.teil.spiegel;
    if (p && p !== 'selbst') {
      const a = K[g.teil.name];
      const b = K[p];
      for (let j = 0; j < a.length; j++) a[j] = b[j] = Math.max(a[j], b[j]);
    }
    const tau = spiegelPaare(g.teil);
    if (tau) {
      const k = K[g.teil.name];
      const n = k.length;
      // Stück j (j → j+1) wird zu Stück τ(j+1) (τ(j+1) → τ(j))
      for (let j = 0; j < n; j++) {
        const m = tau[(j + 1) % n];
        k[j] = k[m] = Math.max(k[j], k[m]);
      }
    }
  }
  const out = [];
  for (const g of gebaute) {
    const k = K[g.teil.name];
    const n = g.teil.marken.length;
    const start = [];
    let summe = 0;
    for (let j = 0; j < n; j++) {
      start.push(summe);
      summe += k[j];
    }
    const ansichten = {};
    for (const w of g.winkel) {
      const anker = g.wege[w].ans.anker;
      const pkt = g.wege[w].stuecke.flatMap((st, j) => neuAbtasten(st, k[j]));
      ansichten[w] = pkt.flatMap(([x, y]) => [Math.round((x - anker[0]) * 10) / 10, Math.round((y - anker[1]) * 10) / 10]);
    }
    const tau = spiegelPaare(g.teil);
    let sigma = null;
    if (tau) {
      sigma = new Array(summe);
      for (let j = 0; j < n; j++) {
        sigma[start[j]] = start[tau[j]];
        const m = tau[(j + 1) % n];
        for (let q = 1; q < k[j]; q++) sigma[start[j] + q] = start[m] + (k[j] - q);
      }
    }
    // Ecken mit Stärke je Ansicht (0 = glatt, 1 = Knick); Liste oder Objekt { Marke: 1 | { Winkel: Stärke } }
    const eckDef = Array.isArray(g.teil.ecken) ? Object.fromEntries(g.teil.ecken.map((m) => [m, 1])) : g.teil.ecken;
    const ecken = {};
    for (const w of g.winkel) ecken[w] = Object.entries(eckDef).map(([m, v]) => [start[g.teil.marken.indexOf(m)], typeof v === 'number' ? v : (v[w] ?? 1)]);
    const marken = Object.fromEntries(g.teil.marken.map((m, j) => [m, start[j]]));
    out.push({ name: g.teil.name, farbe: g.teil.farbe, spiegel: g.teil.spiegel, n: summe, ecken, marken, sigma, ansichten });
    console.log(`${gruppe} ${g.teil.name}: ${summe} Punkte, Ansichten ${g.winkel.join(' ')}`);
  }
  return out;
}

const kopfFormen = ausgeben(kopf.map((t) => bauen(t)), 'Kopf');
const koerperFormen = ausgeben(koerper.map((t) => bauen(t)), 'Körper');
const ziel = new URL('../../src/maskottchen/daten/formen.ts', import.meta.url);
fs.mkdirSync(new URL('.', ziel), { recursive: true });
const kopfzeile = `// Erzeugt von scripts/maskottchen/teile-bauen.mjs aus den Nachzeichnungen (docs/look/maskottchen). Nicht von Hand ändern.\n`;
const typ = `export interface FormRoh {\n  name: string;\n  farbe: 'schwarz' | 'weiss';\n  spiegel: string;\n  n: number;\n  ecken: Record<number, [number, number][]>;\n  marken: Record<string, number>;\n  sigma: number[] | null;\n  ansichten: Record<number, number[]>;\n}\n`;
fs.writeFileSync(
  ziel,
  kopfzeile + typ + `export const kopfFormen: FormRoh[] = ${JSON.stringify(kopfFormen)};\nexport const koerperFormen: FormRoh[] = ${JSON.stringify(koerperFormen)};\n`,
);
console.log('geschrieben', ziel.pathname);
