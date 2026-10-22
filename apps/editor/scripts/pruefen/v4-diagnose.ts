// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V4 „Exakte Umrisse“, Vorarbeit: Wo entsteht die Abweichung
// zwischen Körper und Zeichnung heute? Je Beweis-Körper (gebaut wie im Editor: Röhre, glatt + mittel, Florians Ablauf aus der
// Startkugel) und Blatt: Δ, die Stelle der größten Abweichung, ob der Körper dort zu breit (über die Linie) oder zu schmal ist,
// und ob sie an einer Kappe oder an den Ringen liegt (Ring-Nummer). Dazu je Ring der breiteste Punkt der Querschnittsvorlage
// (Reihe j, an der heute der Breitenpunkt sitzt).
// Aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/v4-diagnose.ts  (KOERPER=kugel,ei,… zum Eingrenzen)
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { extremKoerper } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import { extremMessen } from '../../../../packages/shape/src/kern/pruefen/extremMessung';

const BEWEIS = (process.env.KOERPER?.split(',') ?? ['kugel', 'ei', 'robbe', 'tigerkopf', 'vase', 'einfach', 'kegel', 'widerspruch-breite']);
const PX = 461;
const BL = ['seite', 'front', 'top'] as const;
type V2 = { x: number; y: number };

function innen(poly: readonly V2[], p: V2): boolean {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) drin = !drin;
  }
  return drin;
}

for (const name of BEWEIS) {
  const { bau, gezeigt: g, messung } = extremMessen(extremKoerper(name), 'roehre', 'kugel', { durchdringung: false, linien: false, zug: false });
  const abl = bau.stand.abl;
  const v = abl.vorlage;
  const { R, N } = v;
  const fein = abl.fein;
  // x der Ringe (Grenzlage des rechten Punkts N/4) und je Ring der breiteste Vorlagenpunkt (Breitenpunkt heute)
  const ringX = Array.from({ length: R }, (_, i) => fein[3 * v.ringPunkt(i, N / 4)]!);
  const breitJ = Array.from({ length: R }, (_, i) => {
    let best = -1;
    let bz = -Infinity;
    for (let j = 1; j < N / 2; j++) {
      const z = fein[3 * v.ringPunkt(i, j) + 2]!;
      if (z > bz) {
        bz = z;
        best = j;
      }
    }
    return best;
  });
  const breiteZeilen = abl.breite ? new Set(Array.from(abl.breite.fein).filter((p) => p < v.kaefig.n && p < R * N).map((p) => `${Math.floor(p / N)}:${p % N}`)) : new Set<string>();
  console.log(`\n${name}: Δ Seite ${messung.delta.seite.max.toFixed(1)} · Front ${messung.delta.front.max.toFixed(1)} · Top ${messung.delta.top.max.toFixed(1)} px (mittel ${messung.delta.seite.mittel.toFixed(1)}/${messung.delta.front.mittel.toFixed(1)}/${messung.delta.top.mittel.toFixed(1)}); Breitenpunkte heute an ${breiteZeilen.size} Käfigpunkten; breiteste Reihe je Ring: ${breitJ.join(' ')}`);
  for (const a of BL) {
    const saum = bau.netz.saum?.[a];
    if (!saum) continue;
    const pr = bau.dok.profile[a];
    const poly = pfadAbtasten(vollerPfad(pr), 32).map((p) => ({ x: p.x * bau.dok.skalierung, y: p.y * bau.dok.skalierung }));
    // die drei größten Abweichungen mit Ort
    const stellen: { x: number; y: number; d: number }[] = [];
    for (let i = 0; i + 2 < saum.length; i += 3) if (Number.isFinite(saum[i]!)) stellen.push({ x: saum[i]!, y: saum[i + 1]!, d: saum[i + 2]! });
    stellen.sort((p, q) => q.d - p.d);
    const gezeigtSt: string[] = [];
    for (const s of stellen) {
      if (gezeigtSt.length >= 3) break;
      // nur deutlich getrennte Stellen (> 20 px auseinander)
      if (gezeigtSt.length && stellen.slice(0, stellen.indexOf(s)).some((t, k) => k < 50 && Math.hypot(t.x - s.x, t.y - s.y) * PX < 20 && t.d >= s.d)) continue;
      const ueber = !innen(poly, s);
      // 3D-Ort: feiner Punkt, dessen Projektion am nächsten liegt (Front: z/y, Top: x/z, Seite: x/y)
      let best = -1;
      let bd = Infinity;
      for (let q = 0; q < g.punkte.length; q++) {
        const p = g.punkte[q]!;
        const pp = a === 'seite' ? { x: p[0], y: p[1] } : a === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] };
        const d = Math.hypot(pp.x - s.x, pp.y - s.y);
        if (d < bd) {
          bd = d;
          best = q;
        }
      }
      const p3 = g.punkte[best]!;
      const x = p3[0];
      let ring = 0;
      for (let i = 1; i < R; i++) if (Math.abs(ringX[i]! - x) < Math.abs(ringX[ring]! - x)) ring = i;
      const kappe = x < Math.min(ringX[0]!, ringX[R - 1]!) - 1e-6 ? 'Kappe vorn' : x > Math.max(ringX[0]!, ringX[R - 1]!) + 1e-6 ? 'Kappe hinten' : `Ring ${ring}`;
      gezeigtSt.push(`${s.d.toFixed(1)} px ${ueber ? 'zu breit' : 'zu schmal'} bei (${(s.x * PX).toFixed(0)}, ${(s.y * PX).toFixed(0)}) px, ${kappe}, 3D (${p3.map((c) => (c * PX).toFixed(0)).join(', ')})`);
    }
    console.log(`  ${a}: ${gezeigtSt.join(' | ')}`);
  }
}
