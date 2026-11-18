// Loft-Messung (11.11.2026): Übersicht über die Loops einer gesicherten Form. Liest nur.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/loft-2026-11-11/uebersicht.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hatPfad, pfadLagen } from '../../../../../packages/shape/src/dicht/loops';
import { entpacken } from '../../../src/form/ablage';

const ordner = fileURLToPath(new URL('../../../../../wesen/', import.meta.url));
const z = (x: number, d = 1): string => x.toFixed(d).padStart(7);
const namen = (process.env.WESEN ?? 'strange bird,teat firefish').split(',');
for (const name of namen) {
  const st = entpacken(new Uint8Array(fs.readFileSync(path.join(ordner, `${name}.eewesen`))));
  const g = st.grund ?? { haut: st.haut, loops: st.loops };
  const P = g.haut.pos;
  const lo = [1e9, 1e9, 1e9];
  const hi = [-1e9, -1e9, -1e9];
  for (let v = 0; v < g.haut.n; v++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, P[3 * v + k]!); hi[k] = Math.max(hi[k]!, P[3 * v + k]!); }
  console.log(`\n=== ${name}: ${g.haut.n} Punkte, ${g.haut.tri.length / 3} Dreiecke, mk ${st.mk.toFixed(2)}, Pose ${st.grund ? 'ja' : 'nein'}, Maul ${st.maul ? st.maul.id : '-'}`);
  console.log(`    Ausdehnung x ${z(lo[0]!)}…${z(hi[0]!)}  y ${z(lo[1]!)}…${z(hi[1]!)}  z ${z(lo[2]!)}…${z(hi[2]!)}`);
  console.log('    id art    Proben Punkte  Länge  Kante Pfad |   Mitte (x, y, z)       | Normale der Ausgleichsebene | uneben | x-Spanne  y-Spanne  z-Spanne | Kreuzungen');
  for (const l of g.loops) {
    const L = (hatPfad(l) ? pfadLagen(l) : null) ?? l.ruhe;
    const n = l.proben.length;
    const c = [0, 0, 0];
    for (let j = 0; j < n; j++) for (let k = 0; k < 3; k++) c[k] += L[3 * j + k]! / n;
    // Ausgleichsebene: kleinster Eigenvektor der Kovarianz (Potenzmethode auf der Inversen ersetzt durch Jacobi 3×3)
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let j = 0; j < n; j++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a]![b]! += (L[3 * j + a]! - c[a]!) * (L[3 * j + b]! - c[b]!) / n;
    const { werte, vektoren } = jacobi(C);
    const k0 = werte.indexOf(Math.min(...werte));
    const nrm = [vektoren[0]![k0]!, vektoren[1]![k0]!, vektoren[2]![k0]!];
    const sp = [0, 1, 2].map((k) => { let a = 1e9, b = -1e9; for (let j = 0; j < n; j++) { a = Math.min(a, L[3 * j + k]!); b = Math.max(b, L[3 * j + k]!); } return [a, b]; });
    const kr = l.punkte.filter((p) => p.kreuzung !== undefined).map((p) => p.kreuzung).join(',');
    console.log(`    ${String(l.id).padStart(2)} ${l.art.padEnd(5)} ${String(n).padStart(6)} ${String(l.punkte.length).padStart(6)} ${z(l.laenge)} ${l.kante ? '  ja ' : '   - '} ${hatPfad(l) ? ' ja ' : '  - '} | ${z(c[0]!)} ${z(c[1]!)} ${z(c[2]!)} | ${z(nrm[0]!, 2)} ${z(nrm[1]!, 2)} ${z(nrm[2]!, 2)}      | ${z(Math.sqrt(Math.max(0, werte[k0]!)))} | ${z(sp[0]![0]!, 0)}…${z(sp[0]![1]!, 0)} ${z(sp[1]![0]!, 0)}…${z(sp[1]![1]!, 0)} ${z(sp[2]![0]!, 0)}…${z(sp[2]![1]!, 0)} | ${kr}`);
  }
}

function jacobi(A0: number[][]): { werte: number[]; vektoren: number[][] } {
  const A = A0.map((r) => r.slice());
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 60; it++) {
    let p = 0, q = 1, m = Math.abs(A[0]![1]!);
    if (Math.abs(A[0]![2]!) > m) { m = Math.abs(A[0]![2]!); p = 0; q = 2; }
    if (Math.abs(A[1]![2]!) > m) { m = Math.abs(A[1]![2]!); p = 1; q = 2; }
    if (m < 1e-14) break;
    const th = 0.5 * Math.atan2(2 * A[p]![q]!, A[q]![q]! - A[p]![p]!);
    const cs = Math.cos(th), sn = Math.sin(th);
    for (let k = 0; k < 3; k++) { const a = A[k]![p]!, b = A[k]![q]!; A[k]![p] = cs * a - sn * b; A[k]![q] = sn * a + cs * b; }
    for (let k = 0; k < 3; k++) { const a = A[p]![k]!, b = A[q]![k]!; A[p]![k] = cs * a - sn * b; A[q]![k] = sn * a + cs * b; }
    for (let k = 0; k < 3; k++) { const a = V[k]![p]!, b = V[k]![q]!; V[k]![p] = cs * a - sn * b; V[k]![q] = sn * a + cs * b; }
  }
  return { werte: [A[0]![0]!, A[1]![1]!, A[2]![2]!], vektoren: V };
}
