// Form zuerst (09.11.2026), Beweis „Linien mit Richtung“: Ablauf wie im Fenster im Kern — Kugel, nacheinander drei Loops schneiden
// (Ring waagerecht, Mitte, Ring senkrecht), nach jedem einen Zug mit Richtung anlegen und Runden rechnen. Misst Zeiten (Anlegen, je
// Runde) und ob die Haut endlich bleibt. Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-richtung-ablauf.ts
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { kugel } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type Loop, LoopZug, griffeAnlegen, kreuzungenZwischen, loopAusSchnitt, mittlereKante, punktEinfuegen } from '../../../../packages/shape/src/dicht/loops';

let h = kugel();
let loops: Loop[] = [];
const schnitte = [
  ['seite', [-200, 0], [200, 0]],
  ['top', [-200, 0], [200, 0]],
  ['seite', [10, 200], [10, -200]],
] as const;
let k = 1;
for (const [a, A, B] of schnitte) {
  const t0 = performance.now();
  loops.push(loopAusSchnitt(h, a, [A[0], A[1]], [B[0], B[1]], loops.length + 1, 8)!);
  const r = loopEinsetzen(h, loops, loops.length - 1)!;
  h = r.haut;
  loops = r.loops;
  const tol = 0.25 * mittlereKante(h);
  const neu = loops[loops.length - 1]!;
  for (let i = 0; i < loops.length - 1; i++)
    for (const f of kreuzungenZwischen(loops[i]!, loops[i]!.ruhe, neu, neu.ruhe, tol)) {
      punktEinfuegen(loops[i]!, f.sa, k);
      punktEinfuegen(neu, f.sb, k);
      k++;
    }
  griffeAnlegen(neu);
  const t1 = performance.now();
  const z = new LoopZug(h, loops, null, true, 'kurven', 'gleich', { richtung: true });
  const t2 = performance.now();
  const zeiten: number[] = [];
  for (let i = 0; i < 8; i++) {
    const t3 = performance.now();
    z.schritt(
      loops.map(() => null),
      1,
    );
    zeiten.push(performance.now() - t3);
  }
  let endlich = true;
  let rmax = 0;
  for (let v = 0; v < h.n; v++) {
    const rr = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
    if (!Number.isFinite(rr)) endlich = false;
    rmax = Math.max(rmax, Math.abs(rr - 150));
  }
  console.log(
    `${loops.length} Loops (${loops.map((l) => l.art).join(', ')}): Schnitt ${(t1 - t0).toFixed(0)} ms, Anlegen ${(t2 - t1).toFixed(0)} ms, je Runde ${zeiten.map((x) => x.toFixed(0)).join(' ')} ms; ${endlich ? '' : 'NICHT ENDLICH, '}größter Abstand zur Kugel ${rmax.toFixed(2)}`,
  );
}
