 
// Gegenprüfung Frage 2: Wohin kommt ein neuer Punkt beim Teilen? Gemessen an der Startkugel (R = 150) und an einem daraus
// analytisch gestreckten Ellipsoid (x × S): Abstand der neuen Punkte von der genauen Fläche direkt nach dem Verdichten, ohne Löser.
import { type Haut, hautAus, hautNormalen } from '../../../../../../packages/shape/src/dicht/kurven';
import { mittlereKante } from '../../../../../../packages/shape/src/dicht/loops';
import { rundAusSeite } from '../../../../../../packages/shape/src/dicht/rund';
import { verdichten } from '../../../../../../packages/shape/src/dicht/verdichten';
import { guete, gueteZeile, quantil, spiegelCheck, topoCheck } from './netzstat';

const R = 150;
const f = (x: number, d = 3) => x.toFixed(d);
const kugel = (): Haut => {
  const n = rundAusSeite(
    [
      { x: R, y: 0 },
      { x: 0, y: R },
      { x: -R, y: 0 },
      { x: 0, y: -R },
    ],
    { dreiecke: Number(process.env.DREIECKE ?? 6000) },
  );
  return hautAus(n.positionen, n.indizes);
};

const roh = kugel();
{
  // die Startform ist nicht genau die Kugel R = 150: Radien der Punkte
  const r: number[] = [];
  for (let v = 0; v < roh.n; v++) r.push(Math.hypot(roh.pos[3 * v]!, roh.pos[3 * v + 1]!, roh.pos[3 * v + 2]!));
  console.log(`Startform roh: Radius der Punkte ${f(Math.min(...r))} … ${f(Math.max(...r))}, Mittel ${f(r.reduce((s, x) => s + x, 0) / r.length)} (bestellt: 150)`);
}
// für die Messung genau auf die Kugel R = 150 gelegt (radial; bleibt spiegelgleich)
const h0 = (() => {
  const pos = Float64Array.from(roh.pos);
  for (let v = 0; v < roh.n; v++) {
    const l = Math.hypot(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!);
    for (let k = 0; k < 3; k++) pos[3 * v + k] = (pos[3 * v + k]! * R) / l;
    if (roh.spiegel[v] === v) pos[3 * v + 2] = 0;
  }
  return hautAus(pos, roh.tri);
})();
const MK = mittlereKante(h0);
console.log(`Startkugel: ${h0.n} Punkte, ${h0.tri.length / 3} Dreiecke, mittlere Kante ${f(MK, 2)}`);
console.log(gueteZeile('Startnetz (Surface Nets, auf die Kugel gelegt)', guete(h0)));
{
  let mx = 0;
  let s = 0;
  for (let v = 0; v < h0.n; v++) {
    const d = Math.abs(Math.hypot(h0.pos[3 * v]!, h0.pos[3 * v + 1]!, h0.pos[3 * v + 2]!) - R);
    mx = Math.max(mx, d);
    s += d;
  }
  console.log(`  Punkte von der Kugel: größter ${mx.toExponential(2)}, Mittel ${(s / h0.n).toExponential(2)}`);
  // Normalen nach Fläche gegen die wahre Normale
  const nor = hautNormalen(h0);
  const w: number[] = [];
  for (let v = 0; v < h0.n; v++) {
    const c = (nor[3 * v]! * h0.pos[3 * v]! + nor[3 * v + 1]! * h0.pos[3 * v + 1]! + nor[3 * v + 2]! * h0.pos[3 * v + 2]!) / Math.hypot(h0.pos[3 * v]!, h0.pos[3 * v + 1]!, h0.pos[3 * v + 2]!);
    w.push((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
  }
  console.log(`  Normale nach Fläche gegen wahre Normale: Median ${f(quantil(w, 0.5), 2)}°, 95 % ${f(quantil(w, 0.95), 2)}°, größte ${f(Math.max(...w), 2)}°`);
  console.log('  Spiegel/Topologie:', JSON.stringify(spiegelCheck(h0)), JSON.stringify(topoCheck(h0)));
}

type Abstand = (p: [number, number, number]) => number;
const kugelAbstand: Abstand = (p) => Math.hypot(p[0], p[1], p[2]) - R;

function messen(name: string, h: Haut, maxKante: number, opt: Parameters<typeof verdichten>[3], abstand: Abstand, sehne?: (a: number[], b: number[]) => number): void {
  // Sehnenmitte zum Vergleich: jede Kante über maxKante, Mitte gegen die Fläche
  const sehnen: number[] = [];
  for (let v = 0; v < h.n; v++)
    for (const w of h.nachbarn[v]!) {
      if (w < v) continue;
      const l = Math.hypot(h.pos[3 * v]! - h.pos[3 * w]!, h.pos[3 * v + 1]! - h.pos[3 * w + 1]!, h.pos[3 * v + 2]! - h.pos[3 * w + 2]!);
      if (l <= maxKante) continue;
      sehnen.push(Math.abs(abstand([(h.pos[3 * v]! + h.pos[3 * w]!) / 2, (h.pos[3 * v + 1]! + h.pos[3 * w + 1]!) / 2, (h.pos[3 * v + 2]! + h.pos[3 * w + 2]!) / 2])));
    }
  void sehne;
  const r = verdichten(h, [], maxKante, opt);
  if (!r) {
    console.log(`${name}: nichts zu teilen`);
    return;
  }
  const neu: number[] = [];
  const vorz: number[] = [];
  let altBewegt = 0;
  for (let q = 0; q < r.haut.n; q++) {
    const p: [number, number, number] = [r.haut.pos[3 * q]!, r.haut.pos[3 * q + 1]!, r.haut.pos[3 * q + 2]!];
    const a = r.alt[q]!;
    if (a >= 0) {
      altBewegt = Math.max(altBewegt, Math.hypot(p[0] - h.pos[3 * a]!, p[1] - h.pos[3 * a + 1]!, p[2] - h.pos[3 * a + 2]!));
      continue;
    }
    const d = abstand(p);
    neu.push(Math.abs(d));
    vorz.push(d);
  }
  const innen = vorz.filter((d) => d < 0).length;
  console.log(
    `${name}: +${r.neu} Punkte, ${r.gelegt} zusammengelegt, ${r.gedreht} Kanten gedreht (${h.n} → ${r.haut.n})\n` +
      `    neue Punkte von der Fläche: Median ${f(quantil(neu, 0.5))}, 95 % ${f(quantil(neu, 0.95))}, größter ${f(Math.max(...neu))}; ${innen} von ${neu.length} innen\n` +
      `    zum Vergleich Sehnenmitten der zu langen Kanten (erste Runde): Median ${f(quantil(sehnen, 0.5))}, 95 % ${f(quantil(sehnen, 0.95))}, größte ${f(Math.max(...sehnen))} (${sehnen.length} Kanten)\n` +
      `    alte Punkte bewegt: ${altBewegt.toExponential(2)}`,
  );
  console.log('    ' + gueteZeile('danach', guete(r.haut)).replace(/\n/g, '\n    '));
  console.log('    Spiegel/Topologie:', JSON.stringify(spiegelCheck(r.haut)), JSON.stringify(topoCheck(r.haut)));
}

console.log('\n=== Kugel: alle Kanten über x · MK geteilt ===');
for (const x of [1.0, 0.75]) {
  messen(`Kugel, Kanten über ${x} MK, nur Teilen (ohne Drehen, ohne Entspannen)`, h0, x * MK, { drehen: false, entspannen: false }, kugelAbstand);
  messen(`Kugel, Kanten über ${x} MK, Teilen + Drehen (ohne Entspannen)`, h0, x * MK, { entspannen: false }, kugelAbstand);
  messen(`Kugel, Kanten über ${x} MK, Standard (Teilen, Drehen, Entspannen)`, h0, x * MK, {}, kugelAbstand);
}

// Ellipsoid: Kugel in x um S gestreckt (genau auf x²/(SR)² + y²/R² + z²/R² = 1), dann wie nach einem Zug: 1,75 MK, kurz 0,5 MK
for (const S of [2, 4]) {
  const pos = Float64Array.from(h0.pos);
  for (let v = 0; v < h0.n; v++) pos[3 * v] = pos[3 * v]! * S;
  const hE = hautAus(pos, h0.tri);
  // Abstand zur Fläche: Newton auf den nächsten Punkt (erste Ordnung reicht nicht bei S = 4 nahe den Polen)
  const a2 = (S * R) ** 2;
  const b2 = R * R;
  const ellAbstand: Abstand = (p) => {
    // nächster Punkt q auf dem Ellipsoid: q = (a² x/(a²+t), b² y/(b²+t), b² z/(b²+t)), t aus F(t) = 0
    let t = 0;
    for (let it = 0; it < 50; it++) {
      const qx = (a2 * p[0]) / (a2 + t);
      const qy = (b2 * p[1]) / (b2 + t);
      const qz = (b2 * p[2]) / (b2 + t);
      const F = (qx * qx) / a2 + (qy * qy + qz * qz) / b2 - 1;
      const dF = (-2 * qx * qx) / (a2 * (a2 + t)) - (2 * (qy * qy + qz * qz)) / (b2 * (b2 + t));
      const dt = F / dF;
      t -= dt;
      if (Math.abs(dt) < 1e-12 * b2) break;
    }
    const qx = (a2 * p[0]) / (a2 + t);
    const qy = (b2 * p[1]) / (b2 + t);
    const qz = (b2 * p[2]) / (b2 + t);
    const d = Math.hypot(p[0] - qx, p[1] - qy, p[2] - qz);
    return t >= 0 ? d : -d;
  };
  console.log(`\n=== Ellipsoid (Kugel in x × ${S}, genau): verdichtet wie nach einem Zug (über 1,75 MK teilen, unter 0,5 MK zusammenlegen) ===`);
  console.log(gueteZeile('gestreckt, vor dem Verdichten', guete(hE)));
  messen(`Ellipsoid ×${S}, nur Teilen`, hE, 1.75 * MK, { drehen: false, entspannen: false }, ellAbstand);
  messen(`Ellipsoid ×${S}, Teilen + Drehen`, hE, 1.75 * MK, { entspannen: false }, ellAbstand);
  messen(`Ellipsoid ×${S}, Standard mit Zusammenlegen`, hE, 1.75 * MK, { kurz: 0.5 * MK }, ellAbstand);
}
