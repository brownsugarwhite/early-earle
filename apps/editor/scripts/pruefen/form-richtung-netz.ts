// Form zuerst (09.11.2026), Beweis „Linien mit Richtung“: Richtung aus dem Liniennetz längs jedes Loops gegen die Normale der Kugel
// (drei Loops wie in Florians Fällen). Je Loop: Abweichung in Grad je Probe (jede fünfte), Kreuzungen markiert (×), die Lage der Probe
// gegen die Kugel und die Tangente gegen die Kugel (wie weit sie aus der Tangentialebene kippt).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-richtung-netz.ts
import { hautNormalenMax } from '../../../../packages/shape/src/dicht/kurven';
import { dreiLoops } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { bindungenAus } from '../../../../packages/shape/src/dicht/loops';
import { linienRichtung } from '../../../../packages/shape/src/dicht/richtung';

const { h, loops } = dreiLoops();
const plan = bindungenAus(h, loops);
const n = linienRichtung(
  h,
  loops,
  plan,
  loops.map((l) => l.ruhe),
  hautNormalenMax(h),
);
const P = h.pos;
const zahl = new Map<number, number>();
for (let j = 0; j < plan.loop.length; j++) {
  const v = plan.bind.ecken[3 * j]!;
  if (plan.spiegel[j]) continue;
  zahl.set(v, (zahl.get(v) ?? 0) + 1);
}
loops.forEach((l, li) => {
  const zeile: string[] = [];
  for (let i = 0; i < l.proben.length; i++) {
    const v = l.proben[i]!.ecken[0];
    const r = Math.hypot(P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!);
    const c = (n[3 * v]! * P[3 * v]! + n[3 * v + 1]! * P[3 * v + 1]! + n[3 * v + 2]! * P[3 * v + 2]!) / r;
    const w = (Math.acos(Math.min(1, c)) * 180) / Math.PI;
    if (i % 5 === 0 || (zahl.get(v) ?? 0) > 1) zeile.push(`${i}${(zahl.get(v) ?? 0) > 1 ? '×' : ''}:${w.toFixed(2)}(${(r - 150).toFixed(2)})`);
  }
  console.log(`Loop ${li} (${l.art}, ${l.proben.length} Proben): ${zeile.join(' ')}`);
});
