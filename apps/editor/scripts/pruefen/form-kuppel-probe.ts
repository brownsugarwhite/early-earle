// Form zuerst (08.11.2026), Löser-Schritt Teil 1: Bestimmen die Linien die Form zwischen sich? Kugel mit einem Ring (Äquator), die obere
// Kuppel von Hand höher oder flacher gestellt, dann rechnet der Löser über die ganze Haut Runde für Runde. Kehrt die Kuppel zur Kugel zurück,
// legen die Linien sie fest; bleibt sie, wo sie ist, passt jede Kuppelhöhe (die Krümmung an der Linie wird an der Haut selbst gemessen).
// FAKTOR (Standard 1,25): Höhe der oberen Kuppel; GEWICHTE=gleich|geometrie; RUNDEN (Standard 40).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-kuppel-probe.ts
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { hautAus } from '../../../../packages/shape/src/dicht/kurven';
import { LoopZug, griffeAnlegen, loopAusSchnitt } from '../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';

const faktor = Number(process.env.FAKTOR ?? 1.25);
const gewichte = (process.env.GEWICHTE ?? 'gleich') as 'gleich' | 'geometrie';
const runden = Number(process.env.RUNDEN ?? 40);
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
const loops = r.loops;
griffeAnlegen(loops[0]!);
// obere Kuppel höher bzw. flacher
for (let v = 0; v < h.n; v++) if (h.pos[3 * v + 1]! > 0) h.pos[3 * v + 1] = h.pos[3 * v + 1]! * faktor;
const hoehe = () => {
  let o = -Infinity;
  let u = Infinity;
  for (let v = 0; v < h.n; v++) {
    o = Math.max(o, h.pos[3 * v + 1]!);
    u = Math.min(u, h.pos[3 * v + 1]!);
  }
  return [o, u];
};
const z = new LoopZug(h, loops, null, true, 'kurven', gewichte);
const zeilen: string[] = [];
for (let k = 1; k <= runden; k++) {
  z.schritt(
    loops.map(() => null),
    1,
  );
  if (k <= 5 || k % 5 === 0) {
    const [o, u] = hoehe();
    zeilen.push(`${k}: oben ${o.toFixed(1)}, unten ${u.toFixed(1)}`);
  }
}
console.log(`Kuppel ×${faktor} (${gewichte}), ${h.n} Punkte; Kugel: oben 150, unten −150`);
console.log(`  ${zeilen.join(' · ')}`);
