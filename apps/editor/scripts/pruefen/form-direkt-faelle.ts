// Plan vom 12.11.2026, Schritt 3: die Körper der Probe `form-direkt.ts` (Kugel, Schlauch), mit eingesetzten Loops wie im Fenster.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { type Haut, hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, kanteBei, kreuzungenZwischen, loopAusSchnitt, mittlereKante, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import type { UmrissPunkt } from '../../../../packages/shape/src/dicht/umriss';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';
import { type WesenStand, entpacken } from '../../src/form/ablage';

/** Radius der Kugel */
export const R = 150;
/** Schlauch längs x: Radius, Mitten der Kappen bei ±c, äußere Ringe bei ±a (dazu einer bei 0) */
export const SCHLAUCH = { r: 50, c: 150, a: 100 };

export type Abbildung = (x: number, y: number, z: number) => [number, number, number];
/** Lagen (3 je Probe) abbilden */
export function abbilden(L: Float64Array, f: Abbildung): Float64Array {
  const aus = new Float64Array(L.length);
  for (let i = 0; i < L.length; i += 3) {
    const q = f(L[i]!, L[i + 1]!, L[i + 2]!);
    aus[i] = q[0];
    aus[i + 1] = q[1];
    aus[i + 2] = q[2];
  }
  return aus;
}

export type Schnitt = readonly ['seite' | 'top' | 'front', readonly [number, number], readonly [number, number]];

/** Loops schneiden und einsetzen, Kreuzungen als Punkte (wie `dreiLoops` in `kurvenFaelle.ts`) */
export function mitSchnitten(h0: Haut, schnitte: readonly Schnitt[]): { h: Haut; loops: Loop[] } {
  let h = h0;
  let loops: Loop[] = [];
  for (const [a, A, B] of schnitte) {
    const l = loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8);
    if (!l) throw new Error(`Schnitt ${a} ${A} → ${B} trifft die Haut nicht`);
    loops.push(l);
    const r = loopEinsetzen(h, loops, loops.length - 1);
    if (!r) throw new Error(`Loop ${loops.length} lässt sich nicht einsetzen`);
    h = r.haut;
    loops = r.loops;
  }
  const tol = 0.25 * mittlereKante(h);
  let k = 1;
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++)
      for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, loops[j]!, loops[j]!.ruhe, tol)) {
        punktEinfuegen(loops[i]!, f.sa, k);
        punktEinfuegen(loops[j]!, f.sb, k);
        k++;
      }
  return { h, loops };
}

const kreis: UmrissPunkt[] = [
  { x: R, y: 0 },
  { x: 0, y: R },
  { x: -R, y: 0 },
  { x: 0, y: -R },
];

/** Kugel mit der Mittellinie allein oder mit drei Loops (Ring waagerecht, Mitte, Ring senkrecht) */
export function kugelMit(was: 'mitte' | 'drei', dreiecke: number): { h: Haut; loops: Loop[] } {
  const n = rundAusSeite(kreis, { dreiecke });
  const h = hautAus(n.positionen, n.indizes);
  const mitte: Schnitt = ['top', [-200, 0], [200, 0]];
  return mitSchnitten(h, was === 'mitte' ? [mitte] : [['seite', [-200, 0], [200, 0]], mitte, ['seite', [10, 200], [10, -200]]]);
}

/** Schlauch (Kapsel) längs x mit der Mittellinie und drei Ringen bei x = −a, 0, a */
export function schlauchMit(dreiecke: number, ringe: readonly number[] = [-SCHLAUCH.a, 0, SCHLAUCH.a]): { h: Haut; loops: Loop[] } {
  const { r, c } = SCHLAUCH;
  const p: UmrissPunkt[] = [];
  for (let w = -90; w <= 90; w += 22.5) p.push({ x: c + r * Math.cos((w * Math.PI) / 180), y: r * Math.sin((w * Math.PI) / 180) });
  for (let x = c - 37.5; x > -c + 1; x -= 37.5) p.push({ x, y: r });
  for (let w = 90; w <= 270; w += 22.5) p.push({ x: -c + r * Math.cos((w * Math.PI) / 180), y: r * Math.sin((w * Math.PI) / 180) });
  for (let x = -c + 37.5; x < c - 1; x += 37.5) p.push({ x, y: -r });
  const n = rundAusSeite(p, { dreiecke });
  const h = hautAus(n.positionen, n.indizes);
  return mitSchnitten(h, [['top', [-400, 0], [400, 0]], ...ringe.map((x): Schnitt => ['seite', [x, 200], [x, -200]])]);
}

/** Optionen des Verdichtens wie im Fenster (kleines Rechennetz, Stand 12.11.) */
export const verdichtenWieImFenster = (mk: number, kurz = 0.5): { kurz: number; genau: number; genauHaut: boolean; genauFlaeche: number; flachSchutz: boolean } => ({
  kurz: kurz * mk,
  genau: mk / 40,
  genauHaut: true,
  genauFlaeche: mk / 16,
  flachSchutz: true,
});

/**
 * Die Haut verdichten wie das Fenster nach einem Zug (bis nichts mehr zu tun ist). `neu`: je Punkt der neuen Haut 1, wenn es ihn
 * vorher nicht gab (das Verdichten hat ihn gesetzt, weil eine Kante zu lang oder die Haut dort zu grob war).
 */
export function nachVerdichten(h: Haut, loops: Loop[], mk: number, kurz = 0.5): { h: Haut; loops: Loop[]; neu: Uint8Array } {
  let haut = h;
  let ls = loops;
  // Herkunft je Punkt: seine Nummer in der Haut am Anfang oder −1
  let her = Int32Array.from({ length: h.n }, (_, v) => v);
  for (let g = 0; g < 8; g++) {
    const v = verdichten(haut, ls, 1.75 * mk, verdichtenWieImFenster(mk, kurz));
    if (!v) break;
    her = Int32Array.from(v.alt, (a) => (a >= 0 ? her[a]! : -1));
    haut = v.haut;
    ls = v.loops;
    if (v.gelegt === 0 && v.neu === 0) break;
  }
  return { h: haut, loops: ls, neu: Uint8Array.from(her, (a) => (a < 0 ? 1 : 0)) };
}

/** Punkte der Haut auf einer harten Linie (Kante an) */
export function hartePunkte(h: Haut, loops: readonly Loop[]): Uint8Array {
  const hart = new Uint8Array(h.n);
  for (const l of loops) {
    const k = kanteBei(l, loops);
    l.proben.forEach((p, i) => {
      if (!k[i] || p.ecken[0] !== p.ecken[1] || p.ecken[1] !== p.ecken[2]) return;
      hart[p.ecken[0]] = 1;
      const s = h.spiegel[p.ecken[0]]!;
      if (s >= 0) hart[s] = 1;
    });
  }
  return hart;
}

export function formLaden(name: string, klein = true): { h: Haut; loops: Loop[]; mk: number } {
  const datei = fileURLToPath(new URL(`../../../../wesen/${name}.eewesen`, import.meta.url));
  const st: WesenStand = entpacken(new Uint8Array(fs.readFileSync(datei)));
  if (st.grund) throw new Error('Die Form ist in der Pose gesichert; die Probe rechnet nur die Grundform.');
  const f = st.haut;
  const nachbarn: number[][] = new Array<number[]>(f.n);
  for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
  let h: Haut = { pos: Float64Array.from(f.pos), tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
  let loops: Loop[] = st.loops;
  // wie das Fenster beim Laden: Loops, die nur auf der Haut liegen, einsetzen
  for (let li = 0; li < loops.length; li++) {
    if (loops[li]!.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) continue;
    const r = loopEinsetzen(h, loops, li);
    if (!r) continue;
    h = r.haut;
    loops = r.loops;
  }
  const MK_KLEIN = 8.64 * Math.sqrt(3);
  if (!klein || st.mk > MK_KLEIN / 1.05) return { h, loops, mk: st.mk };
  const r = nachVerdichten(h, loops, MK_KLEIN, 0.8);
  return { h: r.h, loops: r.loops, mk: MK_KLEIN };
}
