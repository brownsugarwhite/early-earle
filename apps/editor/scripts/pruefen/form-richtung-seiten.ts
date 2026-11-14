// Form zuerst (09.11.2026), Beweis „Linien mit Richtung“: Krümmung je Seite am Ring, gemessen mit der vorgegebenen Normale, gegen den
// Wert, den der Löser ohne Richtung misst. Kugel R 150 mit einem Ring am Äquator, obere Kuppel ×FAKTOR (Standard 1). Im Maß des Lösers
// ×300 (Kugel: 1).
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-richtung-seiten.ts
import type { HautAusKurven } from '../../../../packages/shape/src/dicht/ausKurven';
import { loopEinsetzen } from '../../../../packages/shape/src/dicht/einsetzen';
import { gewichteAus, hautAus, hautNormalenMax, vermessen } from '../../../../packages/shape/src/dicht/kurven';
import { LoopZug, griffeAnlegen, loopAusSchnitt } from '../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../packages/shape/src/dicht/rund';

type Seiten = { je: Map<number, { werte: Float64Array; neigung: Float64Array }>; mittel: Map<number, number> };
const faktor = Number(process.env.FAKTOR ?? 1);
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
for (let v = 0; v < h.n; v++) if (h.pos[3 * v + 1]! > 0) h.pos[3 * v + 1] = h.pos[3 * v + 1]! * faktor;
const z = new LoopZug(h, r.loops, null, true, 'kurven', 'gleich', { richtung: true });
const L = z.loeser as unknown as HautAusKurven & {
  linienNachbarn: Map<number, [number, number][]>;
  seitenMessen(rn: Float64Array, hn: Float64Array, kap: Float64Array): Seiten;
};
const vn = new Float64Array(3 * h.n).fill(Number.NaN);
for (let v = 0; v < h.n; v++) {
  if (Math.abs(h.pos[3 * v + 1]!) > 0.5) continue;
  const rr = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 2]!);
  vn[3 * v] = h.pos[3 * v]! / rr;
  vn[3 * v + 1] = 0;
  vn[3 * v + 2] = h.pos[3 * v + 2]! / rr;
}
console.log(`Linienpunkte mit Nachbarn auf der Linie: ${L.linienNachbarn.size}`);
const { je, mittel } = L.seitenMessen(vn, hautNormalenMax(h), vermessen(h, gewichteAus(h, null), hautNormalenMax(h)).kap);
const m = vermessen(h, gewichteAus(h, null));
let k = 0;
for (const [v, e] of je) {
  if (k++ > 6) break;
  const seiten = Array.from(e.werte, (w, s) => `${(w * 300).toFixed(3)} (Neigung ${e.neigung[2 * s]!.toFixed(4)}, ${e.neigung[2 * s + 1]!.toFixed(4)})`);
  console.log(
    `Punkt ${v} (y ${h.pos[3 * v + 1]!.toFixed(3)}, ${h.nachbarn[v]!.length} Nachbarn): Seiten ${seiten.join(' · ')} · Mittel ${(mittel.get(v)! * 300).toFixed(3)} · ohne Richtung ${(m.kap[v]! * 300).toFixed(3)}`,
  );
}
