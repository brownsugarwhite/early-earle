// Form zuerst (11.11.2026): im Kern (ohne Fenster, ohne Verdichten) einen Punkt einer gesicherten Form über Wegpunkte ziehen wie das
// Fenster (je Mausschritt JE Runden, am Ende Runden bis zur Ruhe) und nach jedem Wegstück festhalten, wie es der Haut geht.
// Anlass: Florians `test_kaputt` (mit einer oder zwei Runden je Schritt heil, mit fünf zerrissen: seit G3 sichtbar).
// Aufruf aus packages/shape: NAME=test_kaputt PUNKT=4:1 WEG="0,50,0>0,-30,0>0,60,0>0,0,0" JE=5 npx vite-node ../../apps/editor/scripts/pruefen/form-achse-spiel.ts
//   SCHRITTE=12  NACH=60  HALTEN=18  FLUSS=0/1  VORSICHT=0  FEST=1
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Haut, V3 } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { entpacken } from '../../src/form/ablage';

import { messreiheSetzen } from '../../../../packages/shape/src/dicht/ausKurven';
if (process.env.FEST === '1') messreiheSetzen({ fest: true });
/** FLUSS=1 / FLUSS=0: Normalfluss erzwingen / verbieten; ohne Angabe wählt der Löser selbst (nur, wenn ein Loop lose aufliegt) */
const FLUSS_ART: { normalfluss?: boolean } = process.env.FLUSS === '1' ? { normalfluss: true } : process.env.FLUSS === '0' ? { normalfluss: false } : {};

const datei = process.env.DATEI ?? fileURLToPath(new URL(`../../../../wesen/${process.env.NAME ?? 'test_kaputt'}.eewesen`, import.meta.url));
const SCHRITTE = Number(process.env.SCHRITTE ?? 12);
const NACH = Number(process.env.NACH ?? 60);
const HALTEN = Number(process.env.HALTEN ?? 18);
const JE = Number(process.env.JE ?? 1);
const VORSICHT = process.env.VORSICHT !== '0';
const [pl, pi] = (process.env.PUNKT ?? '4:1').split(':').map(Number) as [number, number];
const weg: V3[] = (process.env.WEG ?? '0,50,0>0,-30,0>0,60,0>0,0,0').split('>').map((s) => {
  const [x, y, z] = s.split(',').map(Number);
  return { x: x!, y: y!, z: z! };
});
const st = entpacken(new Uint8Array(fs.readFileSync(datei)));
const f = st.haut;
const nachbarn: number[][] = new Array<number[]>(f.n);
for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
const h: Haut = { pos: Float64Array.from(f.pos), tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
const P0 = Float64Array.from(h.pos);
const loops: Loop[] = st.loops;
const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorsicht: VORSICHT, ...FLUSS_ART });
const loop = loops.find((l) => l.id === pl)!;
const k = loop.punkte[pi]!.kreuzung;
const ziel = (D: V3): (Float64Array | null)[] =>
  loops.map((l) => {
    const i = k === undefined ? (l === loop ? pi : -1) : l.punkte.findIndex((p) => p.kreuzung === k);
    if (i < 0) return null;
    const d = verschiebungLaengs(
      l,
      l.punkte.map((_, q) => (q === i ? D : { x: 0, y: 0, z: 0 })),
    );
    const n = l.proben.length;
    const S = z.start[loops.indexOf(l)]!;
    for (let j = 0; j < n; j++) {
      if (l.art === 'mitte' || (l.art === 'ring' && (j === 0 || j === n - 1))) d[3 * j + 2] = 0;
      else if (l.art === 'ring') d[3 * j + 2] = Math.max(d[3 * j + 2]!, -S[3 * j + 2]!);
    }
    return d;
  });
const zustand = (): string => {
  const P = h.pos;
  const T = h.tri;
  const nor = new Float64Array(T.length);
  const kanten = new Map<number, number>();
  let inhalt = 0;
  for (let t = 0; t < T.length; t += 3) {
    const a = 3 * T[t]!;
    const b = 3 * T[t + 1]!;
    const c = 3 * T[t + 2]!;
    inhalt += P[a]! * (P[b + 1]! * P[c + 2]! - P[b + 2]! * P[c + 1]!) - P[a + 1]! * (P[b]! * P[c + 2]! - P[b + 2]! * P[c]!) + P[a + 2]! * (P[b]! * P[c + 1]! - P[b + 1]! * P[c]!);
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nor[t] = nx / l;
    nor[t + 1] = ny / l;
    nor[t + 2] = nz / l;
    for (let e = 0; e < 3; e++) {
      const p = T[t + e]!;
      const q = T[t + ((e + 1) % 3)]!;
      const key = p < q ? p * 1e7 + q : q * 1e7 + p;
      const alt = kanten.get(key);
      kanten.set(key, alt === undefined ? t : -1 - (alt * 1e7 + t));
    }
  }
  let scharf = 0;
  let spitz = 0;
  const orte: string[] = [];
  for (const [key, v] of kanten) {
    if (v >= 0) continue;
    const w = -1 - v;
    const t1 = Math.floor(w / 1e7);
    const t2 = w % 1e7;
    const c = nor[t1]! * nor[t2]! + nor[t1 + 1]! * nor[t2 + 1]! + nor[t1 + 2]! * nor[t2 + 2]!;
    if (c < 0.5) scharf++;
    if (c < Math.cos((150 * Math.PI) / 180)) {
      spitz++;
      const p = Math.floor(key / 1e7);
      const q = key % 1e7;
      if (orte.length < 8) orte.push(`(${((P[3 * p]! + P[3 * q]!) / 2).toFixed(0)}, ${((P[3 * p + 1]! + P[3 * q + 1]!) / 2).toFixed(0)}, ${((P[3 * p + 2]! + P[3 * q + 2]!) / 2).toFixed(0)})`);
    }
  }
  // Punkte, die auf die andere Seite der Mittelebene geraten sind
  let drueben = 0;
  let tief = 0;
  for (let v = 0; v < h.n; v++) {
    const z0 = P0[3 * v + 2]!;
    const z1 = P[3 * v + 2]!;
    if (z0 !== 0 && z0 * z1 < 0) {
      drueben++;
      tief = Math.max(tief, Math.abs(z1));
    }
  }
  let weit = 0;
  for (let v = 0; v < h.n; v++) weit = Math.max(weit, Math.hypot(P[3 * v]! - P0[3 * v]!, P[3 * v + 1]! - P0[3 * v + 1]!, P[3 * v + 2]! - P0[3 * v + 2]!));
  return `Rauminhalt ${(inhalt / 6 / 1e6).toFixed(3)} Mio · Knicke über 60° ${scharf}, über 150° ${spitz} · auf der falschen Seite der Mitte ${drueben} Punkte (bis ${tief.toFixed(2)} tief) · gegen den Anfang bis ${weit.toFixed(1)}${orte.length ? ` · Knicke bei ${orte.join(' ')}` : ''}`;
};
console.log(`Anfang: ${zustand()}`);
const vor = new Float64Array(h.pos.length);
const runde = (d: (Float64Array | null)[]): number => {
  vor.set(h.pos);
  z.schritt(d, 1);
  let w = 0;
  for (let i = 0; i < vor.length; i += 3) w = Math.max(w, Math.hypot(h.pos[i]! - vor[i]!, h.pos[i + 1]! - vor[i + 1]!, h.pos[i + 2]! - vor[i + 2]!));
  return w;
};
let von: V3 = { x: 0, y: 0, z: 0 };
let d = ziel(von);
for (const nach of weg) {
  for (let s = 1; s <= SCHRITTE; s++) {
    const t = s / SCHRITTE;
    d = ziel({ x: von.x + t * (nach.x - von.x), y: von.y + t * (nach.y - von.y), z: von.z + t * (nach.z - von.z) });
    for (let q = 0; q < JE; q++) runde(d);
  }
  von = nach;
  console.log(`nach (${nach.x}, ${nach.y}, ${nach.z}): ${zustand()}`);
}
const wege: number[] = [];
for (let r = 0; r < HALTEN + NACH; r++) wege.push(runde(d));
console.log(`nach ${HALTEN + NACH} Runden Ruhe (Weg je Runde ${wege.slice(0, 4).map((w) => w.toFixed(2)).join(' ')} … ${wege.slice(-3).map((w) => w.toFixed(2)).join(' ')}): ${zustand()} · Vorsicht ${z.unruhe.stufen}${z.unruhe.fest ? ' fest' : ''}`);
