// Form zuerst (09.11.2026), Löser-Schritt Teil 1 neu: Wie genau misst der Löser die Krümmung an den Punkten eines frisch eingesetzten
// Rings? Kugel R 150 (Soll im Maß des Lösers 1/300), am Ring gegen die übrigen Punkte, je Gewichtung; dazu, ob die Haut nach dem Einsetzen
// noch auf der Kugel liegt. Ergebnis (Planseite „Kurven als Wahrheit“, Abschnitt 13): am Ring 9–225 % des Werts, sonst 99–106 %; die
// Haut liegt auf der Kugel (±0,15) — das Rauschen der Lagen überdeckt auf den kurzen Kanten der schmalen Dreiecke die Krümmung.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-kap-ring.ts
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, LoopZug, griffeAnlegen, loopAusSchnitt, mittlereKante } from '../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';
import { verdichten } from '../../../../packages/shape/src/dicht/verdichten';

const netz = rundAusSeite(
  [
    { x: 150, y: 0 },
    { x: 0, y: 150 },
    { x: -150, y: 0 },
    { x: 0, y: -150 },
  ],
  { dreiecke: 6000 },
);
let h = hautAus(netz.positionen, netz.indizes);
const ring = loopAusSchnitt(h, 'seite', [-200, 0], [200, 0], 1, 8)!;
const r = loopEinsetzen(h, [ring], 0)!;
h = r.haut;
griffeAnlegen(r.loops[0]!);
let loops: Loop[] = r.loops;
// VERDICHTET=1: danach verdichtet wie das Fenster nach einem Zug (Teilen, Zusammenlegen, Linien genau)
if (process.env.VERDICHTET) {
  const MK = mittlereKante(h);
  const v = verdichten(h, loops, 1.75 * MK, { kurz: 0.5 * MK, genau: MK / 40 });
  if (v) {
    h = v.haut;
    loops = v.loops;
  }
}
{
  const nah: number[] = [];
  const fern: number[] = [];
  for (let v = 0; v < h.n; v++) {
    const R = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    (Math.abs(h.pos[3 * v + 1]!) < 15 ? nah : fern).push(R);
  }
  const st = (a: number[]) => `${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2)} (${Math.min(...a).toFixed(2)}–${Math.max(...a).toFixed(2)})`;
  console.log(`Abstand zur Mitte: nah am Ring ${st(nah)} · sonst ${st(fern)}`);
}
for (const g of ['gleich', 'geometrie'] as const) {
  const z = new LoopZug(h, loops, null, true, 'kurven', g);
  const L = z.loeser as unknown as { ruhe: { kap: Float64Array }; quelle: Float64Array };
  const auf: number[] = [];
  const sonst: number[] = [];
  for (let v = 0; v < h.n; v++) (L.quelle[v]! >= 0 ? auf : sonst).push(L.ruhe.kap[v]! * 300);
  const st = (a: number[]) => {
    a.sort((x, y) => x - y);
    const m = a.reduce((s, x) => s + x, 0) / a.length;
    return `Mittel ${m.toFixed(3)}, 5 % ${a[Math.floor(0.05 * a.length)]!.toFixed(3)}, 95 % ${a[Math.floor(0.95 * a.length)]!.toFixed(3)} (${a.length})`;
  };
  console.log(`${g}: am Ring ${st(auf)} · sonst ${st(sonst)}   (×300, Soll 1)`);
}
