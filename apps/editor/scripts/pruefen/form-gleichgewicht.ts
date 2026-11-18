// Form zuerst (07.11.2026), die Linie ist ihr Pfad: Wohin rechnet „aus den Kurven“ die Kugel mit drei Loops (Ring waagerecht, Mitte,
// Ring senkrecht), je nachdem, ob die Linien genau auf ihrem Pfad liegen (GENAU=1, mit PUNKTE=<Abstand> Punkte wo nötig) oder neben
// ihm auf der Kugel (GENAU=0, wie bis zum 06.11.)? Gemessen nach 4, 12, 30 und 60 Runden über die ganze Haut: wie weit die Haut
// danach neben der Kugel liegt.
// Aufruf aus packages/shape: GENAU=1 npx vite-node ../../apps/editor/scripts/pruefen/form-gleichgewicht.ts
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { hautAus } from '../../../../packages/shape/src/dicht/kurven';
import {
  type Loop,
  LoopZug,
  eckenAuto,
  festlegen,
  griffeAnlegen,
  hatPfad,
  kreuzungenZwischen,
  loopAusSchnitt,
  mittlereKante,
  pfadAbweichung,
  pfadParameter,
  pfadVersatz,
  punktEinfuegen,
} from '../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';

const genau = process.env.GENAU !== '0';
const tolPunkte = Number(process.env.PUNKTE ?? 0);
const kreis = (r: number) => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const netz = rundAusSeite(kreis(150), { dreiecke: 6000 });
let h = hautAus(netz.positionen, netz.indizes);
const MK = mittlereKante(h);
const TOL = 0.25 * MK;
let loops: Loop[] = [];
let k = 1;
const kugel = () => {
  let m = 0;
  let s = 0;
  for (let v = 0; v < h.n; v++) {
    const d = Math.abs(Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!) - 150);
    m = Math.max(m, d);
    s += d;
  }
  return `Kugel bis ${m.toFixed(2)} (Mittel ${(s / h.n).toFixed(3)})`;
};
const schnitte: [Parameters<typeof loopAusSchnitt>[1], [number, number], [number, number]][] = [
  ['seite', [-200, 0], [200, 0]],
  ['top', [-200, 0], [200, 0]],
  ['seite', [10, 200], [10, -200]],
];
for (const [a, A, B] of schnitte) {
  const l = loopAusSchnitt(h, a, A, B, loops.length + 1, 10)!;
  loops.push(l);
  const r = loopEinsetzen(h, loops, loops.length - 1)!;
  h = r.haut;
  loops = r.loops;
  const neu = loops[loops.length - 1]!;
  for (const x of loops.slice(0, -1)) {
    for (const f of kreuzungenZwischen(x, x.ruhe, neu, neu.ruhe, TOL)) {
      const ea = genau && hatPfad(x);
      const pa = punktEinfuegen(x, f.sa, k, ea);
      const pb = punktEinfuegen(neu, f.sb, k, false);
      if (ea) {
        pb.ref = { ...pa.ref };
        pb.cur = { ...pa.ref };
      }
      k++;
    }
  }
  eckenAuto(loops);
  // Punkte wo nötig wie im Fenster mit ?punkte=noetig (dort 0,05 Kanten ≈ 0,43)
  griffeAnlegen(neu, neu.ruhe, genau, genau ? tolPunkte : 0);
}
for (const l of loops) if (genau) pfadParameter(l);
console.log(
  `${genau ? (tolPunkte ? `genau, Punkte wo nötig (${tolPunkte})` : 'genau, ohne Zusatzpunkte') : 'alt'}: Punkte ${loops.map((l) => l.punkte.length).join('/')}, Linie ↔ Pfad ${loops.map((l) => pfadAbweichung(l).toFixed(2)).join(' / ')}; vorher ${kugel()}`,
);
for (const runden of [4, 12, 30, 60]) {
  const z = new LoopZug(h, loops, null, true, 'kurven');
  const bis = runden - (runden === 4 ? 0 : runden === 12 ? 4 : runden === 30 ? 12 : 30);
  z.schritt(
    loops.map((x, li) => (genau && hatPfad(x) ? pfadVersatz(x, z.start[li]!) : null)),
    bis,
  );
  for (const x of loops) festlegen(h, x, !(genau && hatPfad(x)));
  console.log(`  nach ${runden} Runden: ${kugel()}`);
}
