// Loft-Messung (11.11.2026): die Felder zwischen den Linien einer gesicherten Form. Für den CAD-Weg über das ganze Liniennetz
// („Fläche zwischen Randkurven“) zählt, wie viele Seiten ein Feld hat: vier Seiten füllt eine Coons-Fläche direkt aus den vier
// Randkurven, alles andere braucht mehrseitige Flächen oder muss zerschnitten werden.
// Gemessen wird dazu, was die vier Randkurven allein von der Form wissen: Abstand der heutigen Haut im Feld zur Coons-Fläche
// (Bilanz 09.11.: „zwischen wenigen Linien wird die Fläche flach — erwartet, nicht gemessen“).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/loft-2026-11-11/felder.ts
import path from 'node:path';
import { type BildLinie, type Tafel, bildSeite } from './bild';
import { AUSGABE, laden, quantil } from './formen';
import { abstaendeZumNetz, bei, poly } from './loft';

const z = (x: number, d = 1): string => x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
for (const name of (process.env.WESEN ?? 'strange bird,teat firefish').split(',')) {
  const f = laden(name);
  const h = f.haut;
  const P = h.pos;
  const n = h.n;
  const key = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
  // Linienkanten mit der Nummer ihres Loops (gespiegelte Hälfte: dieselbe Nummer)
  const linie = new Map<number, number>();
  for (const l of f.loops) {
    const v = l.proben.map((p) => p.ecken[p.b.indexOf(1)]!);
    const m = l.art === 'ring' ? v.length - 1 : v.length;
    for (let j = 0; j < m; j++) {
      const a = v[j]!;
      const b = v[(j + 1) % v.length]!;
      if (a === b) continue;
      linie.set(key(a, b), l.id);
      if (l.art !== 'mitte') linie.set(key(h.spiegel[a]!, h.spiegel[b]!), l.id);
    }
  }
  // Dreiecke über Kanten verbinden, Linienkanten trennen
  const nt = h.tri.length / 3;
  const anKante = new Map<number, number[]>();
  for (let t = 0; t < nt; t++)
    for (let e = 0; e < 3; e++) {
      const k = key(h.tri[3 * t + e]!, h.tri[3 * t + ((e + 1) % 3)]!);
      const l = anKante.get(k);
      if (l) l.push(t);
      else anKante.set(k, [t]);
    }
  const feld = new Int32Array(nt).fill(-1);
  let nf = 0;
  for (let t0 = 0; t0 < nt; t0++) {
    if (feld[t0]! >= 0) continue;
    feld[t0] = nf;
    const stapel = [t0];
    while (stapel.length) {
      const t = stapel.pop()!;
      for (let e = 0; e < 3; e++) {
        const k = key(h.tri[3 * t + e]!, h.tri[3 * t + ((e + 1) % 3)]!);
        if (linie.has(k)) continue;
        for (const u of anKante.get(k)!) if (feld[u]! < 0) {
          feld[u] = nf;
          stapel.push(u);
        }
      }
    }
    nf++;
  }
  // je Feld: Fläche, Schwerpunkt, Rand
  type Feld = { nr: number; A: number; cz: number; seiten: number; zyklen: number; chi: number; ketten: { loop: number; v: number[] }[]; d?: { med: number; p99: number; max: number; mass: number } };
  const A = new Float64Array(nf);
  const cz = new Float64Array(nf);
  const randKanten: [number, number, number][][] = Array.from({ length: nf }, () => []);
  const eckenJe: Set<number>[] = Array.from({ length: nf }, () => new Set<number>());
  const kantenJe: Set<number>[] = Array.from({ length: nf }, () => new Set<number>());
  const triJe = new Int32Array(nf);
  for (let t = 0; t < nt; t++) {
    const a = h.tri[3 * t]!;
    const b = h.tri[3 * t + 1]!;
    const c = h.tri[3 * t + 2]!;
    const ux = P[3 * b]! - P[3 * a]!;
    const uy = P[3 * b + 1]! - P[3 * a + 1]!;
    const uz = P[3 * b + 2]! - P[3 * a + 2]!;
    const vx = P[3 * c]! - P[3 * a]!;
    const vy = P[3 * c + 1]! - P[3 * a + 1]!;
    const vz = P[3 * c + 2]! - P[3 * a + 2]!;
    const ar = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    const q = feld[t]!;
    A[q] += ar;
    cz[q] += (ar * (P[3 * a + 2]! + P[3 * b + 2]! + P[3 * c + 2]!)) / 3;
    triJe[q]++;
    for (const [x, y] of [[a, b], [b, c], [c, a]] as const) {
      eckenJe[q]!.add(x);
      const k = key(x, y);
      kantenJe[q]!.add(k);
      const id = linie.get(k);
      if (id !== undefined) randKanten[q]!.push([x, y, id]);
    }
  }
  const ganz = A.reduce((s, x) => s + x, 0);
  const felder: Feld[] = [];
  for (let q = 0; q < nf; q++) {
    if (cz[q]! / A[q]! < 0) continue; // nur die gezeichnete Hälfte
    // Rand in Zyklen ablaufen (gerichtete Kanten im Umlaufsinn der Dreiecke)
    const nach = new Map<number, [number, number][]>();
    for (const [x, y, id] of randKanten[q]!) {
      const l = nach.get(x);
      if (l) l.push([y, id]);
      else nach.set(x, [[y, id]]);
    }
    const benutzt = new Set<string>();
    const zyklen: { v: number[]; loop: number[] }[] = [];
    for (const [x, y, id] of randKanten[q]!) {
      if (benutzt.has(`${x}>${y}`)) continue;
      const v = [x];
      const lo = [id];
      benutzt.add(`${x}>${y}`);
      let jetzt = y;
      let sicher = 0;
      while (jetzt !== x && sicher++ < 100000) {
        const w = (nach.get(jetzt) ?? []).find(([y2]) => !benutzt.has(`${jetzt}>${y2}`));
        if (!w) break;
        v.push(jetzt);
        lo.push(w[1]);
        benutzt.add(`${jetzt}>${w[0]}`);
        jetzt = w[0];
      }
      zyklen.push({ v, loop: lo });
    }
    // Seiten des ersten (längsten) Zyklus: Läufe gleicher Loop-Nummer
    zyklen.sort((a, b) => b.v.length - a.v.length);
    const zy = zyklen[0];
    const ketten: { loop: number; v: number[] }[] = [];
    if (zy) {
      const m = zy.v.length;
      let start = 0;
      for (let i = 0; i < m; i++) if (zy.loop[i] !== zy.loop[(i + m - 1) % m]) {
        start = i;
        break;
      }
      let k: { loop: number; v: number[] } | null = null;
      for (let s = 0; s < m; s++) {
        const i = (start + s) % m;
        if (!k || k.loop !== zy.loop[i]) {
          if (k) k.v.push(zy.v[i]!);
          k = { loop: zy.loop[i]!, v: [zy.v[i]!] };
          ketten.push(k);
        } else k.v.push(zy.v[i]!);
      }
      if (k) k.v.push(zy.v[start]!);
    }
    const chi = eckenJe[q]!.size - kantenJe[q]!.size + triJe[q]!;
    felder.push({ nr: q, A: A[q]!, cz: cz[q]! / A[q]!, seiten: ketten.length, zyklen: zyklen.length, chi, ketten });
  }
  felder.sort((a, b) => b.A - a.A);
  const halb = felder.reduce((s, x) => s + x.A, 0);
  console.log(`\n=== ${name}: ${f.loops.length} Loops, ${felder.length} Felder auf der gezeichneten Hälfte (Fläche der Hälfte ${z((100 * halb) / ganz, 1)} % des Ganzen)`);
  // Coons-Fläche für Felder mit vier Seiten (ein Rand, Scheibe)
  const tafeln: Tafel[] = [];
  const coonsNetze: { pos: Float64Array; tri: Uint32Array }[] = [];
  const rand: { feld: number; p: [number, number, number]; n: [number, number, number] }[] = [];
  for (const fe of felder) {
    if (!(fe.seiten === 4 && fe.zyklen === 1 && fe.chi === 1)) continue;
    const kurve = (v: number[]): ReturnType<typeof poly> => {
      const L = new Float64Array(3 * v.length);
      v.forEach((x, i) => {
        L[3 * i] = P[3 * x]!;
        L[3 * i + 1] = P[3 * x + 1]!;
        L[3 * i + 2] = P[3 * x + 2]!;
      });
      return poly(L, false);
    };
    const c = fe.ketten.map((k) => kurve(k.v));
    // c0: P0→P1, c1: P1→P2, c2: P2→P3, c3: P3→P0
    const G = 40;
    const pos = new Float64Array(3 * (G + 1) * (G + 1));
    const p00 = bei(c[0]!, 0);
    const p10 = bei(c[0]!, c[0]!.len);
    const p11 = bei(c[2]!, 0);
    const p01 = bei(c[2]!, c[2]!.len);
    for (let i = 0; i <= G; i++)
      for (let j = 0; j <= G; j++) {
        const u = i / G;
        const v = j / G;
        const a = bei(c[0]!, u * c[0]!.len);
        const b = bei(c[2]!, (1 - u) * c[2]!.len);
        const d0 = bei(c[3]!, (1 - v) * c[3]!.len);
        const d1 = bei(c[1]!, v * c[1]!.len);
        for (let k = 0; k < 3; k++)
          pos[3 * (i * (G + 1) + j) + k] =
            (1 - v) * a[k]! + v * b[k]! + (1 - u) * d0[k]! + u * d1[k]! - ((1 - u) * (1 - v) * p00[k]! + u * (1 - v) * p10[k]! + u * v * p11[k]! + (1 - u) * v * p01[k]!);
      }
    const tri: number[] = [];
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) {
        const a = i * (G + 1) + j;
        tri.push(a, a + G + 1, a + G + 2, a, a + G + 2, a + 1);
      }
    const netz = { pos, tri: Uint32Array.from(tri) };
    coonsNetze.push(netz);
    // Randproben mit Normale (für den Knick zur Nachbarfläche an der gemeinsamen Linie)
    const at = (i: number, j: number, k: number): number => pos[3 * (i * (G + 1) + j) + k]!;
    for (let i = 0; i <= G; i++)
      for (let j = 0; j <= G; j++) {
        if (i > 0 && i < G && j > 0 && j < G) continue;
        const i0 = Math.max(0, i - 1);
        const i1 = Math.min(G, i + 1);
        const j0 = Math.max(0, j - 1);
        const j1 = Math.min(G, j + 1);
        const du = [0, 1, 2].map((k) => at(i1, j, k) - at(i0, j, k));
        const dv = [0, 1, 2].map((k) => at(i, j1, k) - at(i, j0, k));
        const nx = du[1]! * dv[2]! - du[2]! * dv[1]!;
        const ny = du[2]! * dv[0]! - du[0]! * dv[2]!;
        const nz = du[0]! * dv[1]! - du[1]! * dv[0]!;
        const nl = Math.hypot(nx, ny, nz);
        if (nl < 1e-9 || ((i === 0 || i === G) && (j === 0 || j === G))) continue;
        rand.push({ feld: fe.nr, p: [at(i, j, 0), at(i, j, 1), at(i, j, 2)], n: [nx / nl, ny / nl, nz / nl] });
      }
    const wer: number[] = [];
    const drin = new Uint8Array(n);
    for (let t = 0; t < nt; t++) if (feld[t] === fe.nr) for (let e = 0; e < 3; e++) drin[h.tri[3 * t + e]!] = 1;
    for (let v = 0; v < n; v++) if (drin[v]) wer.push(v);
    const d = Array.from(abstaendeZumNetz(P, wer, netz), Math.abs);
    fe.d = { med: quantil(d, 0.5), p99: quantil(d, 0.99), max: Math.max(...d), mass: Math.sqrt(fe.A) };
  }
  console.log('   Feld  Fläche  Seiten  Ränder  Loops am Rand                 | Haut → Coons-Fläche aus den vier Randkurven (Einheiten; in % der Feldgröße √Fläche)');
  for (const fe of felder) {
    const art = fe.zyklen !== 1 || fe.chi !== 1 ? `${fe.zyklen} (Loch)` : '1';
    const dz = fe.d ? `Median ${z(fe.d.med)}, 99 % ${z(fe.d.p99)}, größter ${z(fe.d.max)}  (${z((100 * fe.d.max) / fe.d.mass, 0)} %)` : '';
    console.log(`   ${String(fe.nr).padStart(4)}  ${z((100 * fe.A) / halb, 1).padStart(5)} %  ${String(fe.seiten).padStart(4)}  ${art.padStart(8)}  ${fe.ketten.map((k) => k.loop).join('-').padEnd(28)} | ${dz}`);
  }
  const nach = new Map<string, { zahl: number; A: number }>();
  for (const fe of felder) {
    const k = fe.zyklen !== 1 || fe.chi !== 1 ? 'mit Loch' : fe.seiten >= 6 ? '6 und mehr' : String(fe.seiten);
    const e = nach.get(k) ?? { zahl: 0, A: 0 };
    e.zahl++;
    e.A += fe.A;
    nach.set(k, e);
  }
  console.log(`   nach Seiten: ${[...nach.entries()].sort().map(([k, e]) => `${k}: ${e.zahl} Felder, ${z((100 * e.A) / halb, 1)} % der Fläche`).join(' · ')}`);
  const vier = felder.filter((x) => x.d);
  if (vier.length) {
    const gew = vier.reduce((s, x) => s + x.A, 0);
    console.log(
      `   vierseitige Felder: Haut bis ${z(Math.max(...vier.map((x) => x.d!.max)))} Einheiten neben der Coons-Fläche; nach Fläche gewichtet im Mittel größter Abstand ${z(vier.reduce((s, x) => s + x.A * x.d!.max, 0) / gew)} Einheiten = ${z(vier.reduce((s, x) => s + (x.A * 100 * x.d!.max) / x.d!.mass, 0) / gew, 0)} % der Feldgröße`,
    );
  }
  // Knick an gemeinsamen Linien zweier vierseitiger Felder: Randproben beider Flächen, die aufeinanderliegen
  const knicke: number[] = [];
  const paare = new Map<string, number[]>();
  for (let a = 0; a < rand.length; a++) {
    const ra = rand[a]!;
    let best = 1.5;
    let bb = -1;
    for (let b = 0; b < rand.length; b++) {
      const rb = rand[b]!;
      if (rb.feld === ra.feld) continue;
      const dd = Math.hypot(ra.p[0] - rb.p[0], ra.p[1] - rb.p[1], ra.p[2] - rb.p[2]);
      if (dd < best) {
        best = dd;
        bb = b;
      }
    }
    if (bb < 0 || ra.feld > rand[bb]!.feld) continue;
    const rb = rand[bb]!;
    const w = (Math.acos(Math.min(1, Math.abs(ra.n[0] * rb.n[0] + ra.n[1] * rb.n[1] + ra.n[2] * rb.n[2]))) * 180) / Math.PI;
    knicke.push(w);
    const k = `${ra.feld}|${rb.feld}`;
    const l = paare.get(k);
    if (l) l.push(w);
    else paare.set(k, [w]);
  }
  if (knicke.length)
    console.log(
      `   Knick zwischen benachbarten Coons-Flächen an der gemeinsamen Linie (${knicke.length} Stellen, ${paare.size} Nachbarschaften): Median ${z(quantil(knicke, 0.5))}°, 90 % ${z(quantil(knicke, 0.9))}°, größter ${z(Math.max(...knicke))}° · je Nachbarschaft: ${[...paare.entries()].map(([k, l]) => `${k} Median ${z(quantil(l, 0.5))}° / größter ${z(Math.max(...l))}°`).join(', ')}`,
    );
  // Bild: Felder nach Seitenzahl gefärbt; daneben die Coons-Flächen der vierseitigen
  const FARBEN: Record<string, [number, number, number]> = { '1': [150, 150, 150], '2': [232, 160, 70], '3': [225, 200, 80], '4': [110, 185, 120], '5': [120, 160, 225], '6': [170, 120, 210], loch: [215, 80, 90] };
  const netze = felder.map((fe) => {
    const tri: number[] = [];
    for (let t = 0; t < nt; t++) if (feld[t] === fe.nr) tri.push(h.tri[3 * t]!, h.tri[3 * t + 1]!, h.tri[3 * t + 2]!);
    const k = fe.zyklen !== 1 || fe.chi !== 1 ? 'loch' : String(Math.min(6, fe.seiten));
    return { pos: P, tri, farbe: FARBEN[k] ?? [200, 200, 200] };
  });
  const linien: BildLinie[] = f.loops.map((l) => ({ pts: f.kurven.get(l.id)!, farbe: '#1d1a16', dick: 1.4, zu: l.art !== 'ring' }));
  const B = 760;
  const H = 520;
  tafeln.push({ titel: 'Felder zwischen den Linien: grün 4 Seiten · orange 2 · gelb 3 · blau 5 · lila 6 und mehr · rot mit Loch · grau 1', blick: 'seite', netze, linien, breit: B, hoch: H });
  tafeln.push({ titel: 'dieselben Felder von schräg oben', blick: [30, 35], netze, linien, breit: B, hoch: H });
  if (coonsNetze.length) {
    tafeln.push({ titel: 'vierseitige Felder: heutige Haut', blick: [30, 35], netze: netze.filter((_, i) => felder[i]!.d), linien, breit: B, hoch: H });
    tafeln.push({ titel: 'vierseitige Felder: Fläche nur aus den vier Randkurven (Coons)', blick: [30, 35], netze: coonsNetze.map((c) => ({ ...c, farbe: [110, 185, 120] as [number, number, number] })), linien, breit: B, hoch: H });
  }
  const datei = path.join(AUSGABE, `${name.replace(/ /g, '-')}-felder.html`);
  bildSeite(datei, `${name} — Felder zwischen den Linien`, `${f.loops.length} Loops, ${felder.length} Felder auf der gezeichneten Hälfte.`, tafeln, 2);
  console.log(`   ${datei}`);
}
