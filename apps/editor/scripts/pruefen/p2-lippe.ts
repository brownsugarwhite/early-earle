// P2 Tag 5: Lippe je Station — Spanne, Drehung der Linie, Abstand Kontrollpunkt (Falte, A6) und Abtastpunkt (Musterrand) vom Ziel.
// Aufruf aus packages/shape: FALL=robbe/hoch/j npx vite-node ../../apps/editor/scripts/pruefen/p2-lippe.ts
// Lippenziel je Station: Drehung der Zielpolylinie (Station zu Station), Abstand Kontrollpunkt − Zielpunkt (nicht Abtastpunkt des Musters),
// Abstand Abtastpunkt (Musterrand, Käfig vor dem Lösen) − Zielpunkt
import { einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { stuecknetzAblauf } from '../../../../packages/shape/src/kern/einsatz/stuecknetz';
type V3 = [number, number, number];
const [art, anfang, form] = (process.env.FALL ?? 'rex/mittel/gerade').split('/') as ['rex', 'mittel', 'gerade'];
const f = einsatzFall(art, anfang, form);
if (!f || 'fehler' in f) throw new Error('kein Fall');
const { bau, lippe } = stuecknetzAblauf(f, {}, {});
const t = bau.t;
const PX = 461;
const ziel = f.lippenZiel();
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
// Polylinie des Ziels mit Bogenlänge
const sZ = [0];
for (let i = 1; i < ziel.length; i++) sZ.push(sZ[i - 1]! + len(sub(ziel[i]!, ziel[i - 1]!)));
const LZ = sZ[sZ.length - 1]!;
const bei = (s: number): V3 => { let i = 1; while (i < sZ.length - 1 && sZ[i]! < s) i++; const l = sZ[i]! - sZ[i - 1]!; const tt = l > 0 ? (s - sZ[i - 1]!) / l : 0; const a = ziel[i - 1]!, b = ziel[i]!; return [a[0] + tt * (b[0] - a[0]), a[1] + tt * (b[1] - a[1]), a[2] + tt * (b[2] - a[2])]; };
const m = t.m;
const ring = t.haut[0]! as unknown as number[];
const k = t.kaefig;
console.log(`${f.name}: m ${m}, Ziel ${ziel.length} Punkte, Länge ${(LZ * PX).toFixed(1)} px, Anteile ${Array.from(t.lippenAnteile).map((x) => x.toFixed(3)).join(' ')}`);
let vorher: V3 | null = null;
for (let q = 0; q <= m; q++) {
  const zp = bei(LZ * t.lippenAnteile[q]!);
  const cp = lippe.punkte[q]!;
  const v = ring[q]!;
  const ap: V3 = [k.xyz[3 * v]!, k.xyz[3 * v + 1]!, k.xyz[3 * v + 2]!];
  // Drehung der Zielpolylinie an Station q (zwischen Spannen q−1→q und q→q+1)
  let dreh = '';
  if (q > 0 && q < m) {
    const a = sub(zp, bei(LZ * t.lippenAnteile[q - 1]!));
    const b = sub(bei(LZ * t.lippenAnteile[q + 1]!), zp);
    const cos = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b) || 1);
    dreh = `${((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI).toFixed(1)}°`;
  }
  const spanne = vorher ? (len(sub(zp, vorher)) * PX).toFixed(2) : '-';
  vorher = zp;
  console.log(`  ${String(q).padStart(2)}: Spanne ${spanne.padStart(5)} px, Drehung ${dreh.padStart(6)}, Kontroll−Ziel ${(len(sub(cp, zp)) * PX).toFixed(2)} px, Abtast−Ziel ${(len(sub(ap, zp)) * PX).toFixed(2)} px, Kontroll−Abtast ${(len(sub(cp, ap)) * PX).toFixed(2)} px`);
}
