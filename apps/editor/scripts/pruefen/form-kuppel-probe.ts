// Form zuerst (08.11.2026), Löser-Schritt Teil 1: Bestimmen die Linien die Form zwischen sich? Kugel mit einem Ring (Äquator), die obere
// Kuppel von Hand höher oder flacher gestellt, dann rechnet der Löser über die ganze Haut Runde für Runde. Kehrt die Kuppel zur Kugel zurück,
// legen die Linien sie fest; bleibt sie, wo sie ist, passt jede Kuppelhöhe (die Krümmung an der Linie wird an der Haut selbst gemessen).
// FAKTOR (Standard 1,25): Höhe der oberen Kuppel; GEWICHTE=gleich|geometrie; RUNDEN (Standard 40).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-kuppel-probe.ts
import { type HautAusKurven, messreiheSetzen } from '../../../../packages/shape/src/dicht/ausKurven';
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
// Messreihen-Schalter vor dem Anlegen (das Gewicht der Zeilen neben der Linie steckt in der Zerlegung)
if (process.env.RICHTUNG) {
  if (process.env.ZEILE === 'alt') messreiheSetzen({ linienZeile: 'alt' });
  if (process.env.RADIUS) messreiheSetzen({ seiteRadius: Number(process.env.RADIUS) });
  if (process.env.SCHRITT) messreiheSetzen({ seiteSchritt: Number(process.env.SCHRITT) });
  if (process.env.SEITEFEST) messreiheSetzen({ seiteFest: true });
  if (process.env.SOLL) messreiheSetzen({ seiteSoll: Number(process.env.SOLL) });
  if (process.env.FEST) messreiheSetzen({ fest: true });
  if (process.env.NEIGUNG) messreiheSetzen({ seiteNeigung: process.env.NEIGUNG as 'frei' | 'fest' });
  if (process.env.G1) messreiheSetzen({ g1Gewicht: Number(process.env.G1) });
}
// MAX=1 (09.11., Weg a): im Maß des Lösers die Normalen nach Max, ohne Richtung
const z = new LoopZug(h, loops, null, true, 'kurven', gewichte, {
  ...(process.env.RICHTUNG ? { richtung: true } : {}),
  ...(process.env.MAX ? { maxNormalen: true } : {}),
  ...(process.env.GEKOPPELT ? { gekoppelt: true } : {}),
});
// RICHTUNG=1 (09.11., Beweis „Linien mit Richtung“): am Ring die Normale der Kugel vorgeben (waagerecht nach außen); ZEILE=alt: die
// Laplace-Zeile der Linienpunkte wie bisher (nur die Seiten messen mit der Richtung)
if (process.env.RICHTUNG) {
  const vn = new Float64Array(3 * h.n).fill(Number.NaN);
  for (let v = 0; v < h.n; v++) {
    if (Math.abs(h.pos[3 * v + 1]!) > 0.5) continue;
    const r = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 2]!);
    vn[3 * v] = h.pos[3 * v]! / r;
    vn[3 * v + 1] = 0;
    vn[3 * v + 2] = h.pos[3 * v + 2]! / r;
  }
  (z.loeser as HautAusKurven).richtung = vn;
}
const zeilen: string[] = [];
for (let k = 1; k <= runden; k++) {
  z.schritt(
    loops.map(() => null),
    1,
  );
  if (process.env.DIAG && k <= 6) {
    // je Runde: Spanne der Krümmung (×300) und der Punkt, der am weitesten von der Mitte liegt
    const c = (z.loeser as HautAusKurven).letzteKruemmung!;
    let cmin = Infinity;
    let cmax = -Infinity;
    let iw = 0;
    let rw = 0;
    for (let v = 0; v < h.n; v++) {
      cmin = Math.min(cmin, c[v]! * 300);
      cmax = Math.max(cmax, c[v]! * 300);
      const rr = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
      if (rr > rw) {
        rw = rr;
        iw = v;
      }
    }
    console.log(
      `Runde ${k}: Krümmung ${cmin.toFixed(2)} … ${cmax.toFixed(2)}, weitester Punkt ${iw} bei ${rw.toFixed(1)} (${[0, 1, 2].map((q) => h.pos[3 * iw + q]!.toFixed(1)).join(', ')})`,
    );
    // die fünf Punkte mit der größten Abweichung der Krümmung von der Kugel: Lage, Linie (L) oder Nachbar einer Linie (N)
    const rn = (z.loeser as HautAusKurven).richtung;
    const istL = (v: number) => !!rn && !Number.isNaN(rn[3 * v]!);
    const liste = Array.from({ length: h.n }, (_, v) => v)
      .sort((a, b) => Math.abs(c[b]! * 300 - 1) - Math.abs(c[a]! * 300 - 1))
      .slice(0, 5)
      .map((v) => {
        const art = istL(v) ? 'L' : h.nachbarn[v]!.some(istL) ? 'N' : '-';
        return `${v}${art}(${(c[v]! * 300).toFixed(2)}; ${[0, 1, 2].map((q) => h.pos[3 * v + q]!.toFixed(0)).join(',')})`;
      });
    console.log(`  größte Abweichung: ${liste.join(' ')}`);
  }
  if (k <= 5 || k % 5 === 0) {
    const [o, u] = hoehe();
    zeilen.push(`${k}: oben ${o.toFixed(1)}, unten ${u.toFixed(1)}`);
  }
}
console.log(
  `Kuppel ×${faktor} (${gewichte}${process.env.GEKOPPELT ? ', gekoppelt' : ''}${process.env.MAX ? ', Normalen nach Max' : ''}${process.env.RICHTUNG ? `, Richtung am Ring${process.env.ZEILE === 'alt' ? ', Zeile alt' : ''}` : ''}), ${h.n} Punkte; Kugel: oben 150, unten −150`,
);
console.log(`  ${zeilen.join(' · ')}`);
// GEKOPPELT=1 (09.11., Beweis „Krümmung an den Linien mitgelöst“): GMRES-Schritte je Runde und Rest
if (process.env.GEKOPPELT) {
  const g = (z.loeser as HautAusKurven).gmres;
  console.log(`  gekoppelt: ${g.runden} Runden, im Mittel ${(g.schritte / Math.max(1, g.runden)).toFixed(1)} GMRES-Schritte, letzter Rest ${g.rest.toExponential(1)}`);
}
