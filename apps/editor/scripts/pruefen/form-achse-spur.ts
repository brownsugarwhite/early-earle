// Form zuerst (11.11.2026): einen Punkt verfolgen, der beim Spielzug auf die andere Seite der Mittelebene gerät: je Runde seine Lage,
// Normale, Krümmung (gemessen nach der Geometrie), Soll-Krümmung, und die seiner Nachbarn auf der Linie. Anlass: Florians `test_kaputt`.
// Aufruf aus packages/shape: NAME=test_kaputt npx vite-node ../../apps/editor/scripts/pruefen/form-achse-spur.ts   (FLUSS=0/1, VORSICHT=0)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { type Haut, type V3, hautNormalen } from '../../../../packages/shape/src/dicht/kurven';
import { intrinsischeGewichte } from '../../../../packages/shape/src/dicht/intrinsisch';
import { type Loop, LoopZug, verschiebungLaengs } from '../../../../packages/shape/src/dicht/loops';
import { entpacken } from '../../src/form/ablage';

/** FLUSS=1 / FLUSS=0: Normalfluss erzwingen / verbieten; ohne Angabe wählt der Löser selbst (nur, wenn ein Loop lose aufliegt) */
const FLUSS_ART: { normalfluss?: boolean } = process.env.FLUSS === '1' ? { normalfluss: true } : process.env.FLUSS === '0' ? { normalfluss: false } : {};

const datei = fileURLToPath(new URL(`../../../../wesen/${process.env.NAME ?? 'test_kaputt'}.eewesen`, import.meta.url));
const SCHRITTE = Number(process.env.SCHRITTE ?? 12);
const JE = Number(process.env.JE ?? 5);
const [pl, pi] = (process.env.PUNKT ?? '4:1').split(':').map(Number) as [number, number];
const weg: V3[] = (process.env.WEG ?? '0,50,0>0,-30,0>0,60,0').split('>').map((s) => {
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
const z = new LoopZug(h, loops, null, true, 'kurven', 'geometrie', { vorsicht: process.env.VORSICHT !== '0', ...FLUSS_ART });
const loop = loops.find((l) => l.id === pl)!;
const k = loop.punkte[pi]!.kreuzung;
const ziel = (D: V3): (Float64Array | null)[] =>
  loops.map((l) => {
    const i = k === undefined ? (l === loop ? pi : -1) : l.punkte.findIndex((p) => p.kreuzung === k);
    if (i < 0) return null;
    const d = verschiebungLaengs(l, l.punkte.map((_, q) => (q === i ? D : { x: 0, y: 0, z: 0 })));
    const n = l.proben.length;
    const S = z.start[loops.indexOf(l)]!;
    for (let j = 0; j < n; j++) {
      if (l.art === 'mitte' || (l.art === 'ring' && (j === 0 || j === n - 1))) d[3 * j + 2] = 0;
      else if (l.art === 'ring') d[3 * j + 2] = Math.max(d[3 * j + 2]!, -S[3 * j + 2]!);
    }
    return d;
  });
// Linienpunkte (gebunden): Ecken der Proben mit Gewicht 1
const aufLinie = new Uint8Array(h.n);
for (const l of loops) for (const p of l.proben) for (let e = 0; e < 3; e++) if (p.b[e]! > 0.999) aufLinie[p.ecken[e]!] = 1;
const kruemmung = (): { kap: Float64Array; nor: Float64Array } => {
  const ig = intrinsischeGewichte(h, null);
  const nor = hautNormalen(h);
  const P = h.pos;
  const kap = new Float64Array(h.n);
  for (let v = 0; v < h.n; v++) {
    let s = 0, mx = 0, my = 0, mz = 0, e2 = 0;
    for (let q = ig.start[v]!; q < ig.start[v + 1]!; q++) {
      const j = ig.nb[q]!;
      const w = ig.w[q]!;
      s += w;
      mx += w * (P[3 * v]! - P[3 * j]!);
      my += w * (P[3 * v + 1]! - P[3 * j + 1]!);
      mz += w * (P[3 * v + 2]! - P[3 * j + 2]!);
      e2 += w * ig.l2[q]!;
    }
    if (!(s > 1e-12)) continue;
    const k2 = Math.max(e2 / s, 1e-9);
    kap[v] = (mx * nor[3 * v]! + my * nor[3 * v + 1]! + mz * nor[3 * v + 2]!) / s / k2;
  }
  return { kap, nor };
};
// erst einmal durchspielen und den ersten Punkt finden, der hinübergerät
let von: V3 = { x: 0, y: 0, z: 0 };
let runde = 0;
let erster = -1;
let ersteRunde = -1;
const spur: string[] = [];
const WATCH = process.env.WATCH ? Number(process.env.WATCH) : -1;
const zeile = (v: number, D: V3): string => {
  const { kap, nor } = kruemmung();
  const c = (z.loeser as unknown as { letzteKruemmung: Float64Array | null }).letzteKruemmung;
  const P = h.pos;
  const nb = nachbarn[v]!;
  const lin = nb.filter((j) => aufLinie[j]);
  return `R${String(runde).padStart(3)} Ziel y+${D.y.toFixed(1)} · Punkt (${P[3 * v]!.toFixed(1)}, ${P[3 * v + 1]!.toFixed(1)}, ${P[3 * v + 2]!.toFixed(2)}) n (${nor[3 * v]!.toFixed(2)}, ${nor[3 * v + 1]!.toFixed(2)}, ${nor[3 * v + 2]!.toFixed(2)}) κ ${(kap[v]! * 1000).toFixed(2)} Soll ${c ? (c[v]! * 1000).toFixed(2) : '—'} · Linie daneben: ${lin.map((j) => `y ${P[3 * j + 1]!.toFixed(1)} κ ${(kap[j]! * 1000).toFixed(1)}`).join(' | ')}`;
};
for (const nach of weg) {
  for (let s = 1; s <= SCHRITTE; s++) {
    const t = s / SCHRITTE;
    const D = { x: von.x + t * (nach.x - von.x), y: von.y + t * (nach.y - von.y), z: von.z + t * (nach.z - von.z) };
    const d = ziel(D);
    for (let q = 0; q < JE; q++) {
      z.schritt(d, 1);
      runde++;
      if (WATCH >= 0) spur.push(zeile(WATCH, D));
      if (erster < 0)
        for (let v = 0; v < h.n; v++) {
          const z0 = P0[3 * v + 2]!;
          if (z0 !== 0 && z0 * h.pos[3 * v + 2]! < 0) {
            erster = v;
            ersteRunde = runde;
            break;
          }
        }
    }
  }
  von = nach;
}
if (WATCH < 0) console.log(`erster Punkt auf der falschen Seite: ${erster} in Runde ${ersteRunde} (Anfang (${P0[3 * erster]!.toFixed(1)}, ${P0[3 * erster + 1]!.toFixed(1)}, ${P0[3 * erster + 2]!.toFixed(2)}), Nachbarn ${nachbarn[erster]?.length}, davon auf der Linie ${nachbarn[erster]?.filter((j) => aufLinie[j]).length}, Spiegel ${h.spiegel[erster]})`);
else console.log(spur.join('\n'));
