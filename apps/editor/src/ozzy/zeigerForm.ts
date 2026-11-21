// Ozzy, der Zeiger in der Form des Werkzeugs (S13, liquid drop, Idee 8): die Umrisse. Aus `main.ts` herausgelöst (21.11.2026),
// damit auch die Linse der Zähne den Zeiger so zeichnet wie die Bühne (Etappe 7: der Zahn als kleine Form).
import { ZEIGER_PUNKTE } from '../linien/fluessig';

/** die zwei Winkel des Pfeils (wie in der Linien-Studie: Spitze oben links) */
export const ZEIGER_WINKEL = [(32 * Math.PI) / 180, (80 * Math.PI) / 180];

/** Pfeil (Auswahl), Spitze (P und Freihand), Schlinge (Lasso), Ring (Pinsel an der Haut; so groß wie sein Einfluss) */
export type ZeigerArt = 'pfeil' | 'spitze' | 'schlinge' | 'ring';

/** der Umriss einer Art, die Spitze im Ursprung (Gerätepunkte, y nach unten), so groß wie der Pfeil (L) */
export function zeigerUmrissVon(art: ZeigerArt, L: number, ring: number): [number, number][] {
  const w0 = ZEIGER_WINKEL[0]!;
  const w1 = ZEIGER_WINKEL[1]!;
  const dw = (w0 + w1) / 2;
  const d: [number, number] = [Math.cos(dw), Math.sin(dw)];
  const q: [number, number] = [-Math.sin(dw), Math.cos(dw)];
  const bei = (a: number, b: number): [number, number] => [a * d[0] + b * q[0], a * d[1] + b * q[1]];
  if (art === 'pfeil')
    return [
      [0, 0],
      [L * Math.cos(w0), L * Math.sin(w0)],
      [L * Math.cos(w1), L * Math.sin(w1)],
    ];
  if (art === 'spitze') return [[0, 0], bei(0.42 * L, 0.2 * L), bei(1.0 * L, 0.2 * L), bei(1.0 * L, -0.2 * L), bei(0.42 * L, -0.2 * L)];
  if (art === 'schlinge') {
    // ein kurzer Faden von der Spitze, dann die Schlinge (der Faden hin und zurück ist eine Linie)
    const ende = bei(0.3 * L, 0);
    const m = bei(0.62 * L, 0);
    const rd = 0.32 * L;
    const rq = 0.44 * L;
    const pkt: [number, number][] = [[0, 0], ende];
    for (let k = 1; k < 20; k++) {
      const t = Math.PI + (2 * Math.PI * k) / 20;
      pkt.push([m[0] + rd * Math.cos(t) * d[0] + rq * Math.sin(t) * q[0], m[1] + rd * Math.cos(t) * d[1] + rq * Math.sin(t) * q[1]]);
    }
    pkt.push(ende);
    return pkt;
  }
  // Ring um die Spitze; der erste Punkt zeigt nach oben links (dorthin, wo die anderen ihre Spitze haben)
  const pkt: [number, number][] = [];
  for (let k = 0; k < ZEIGER_PUNKTE; k++) {
    const t = dw + Math.PI + (2 * Math.PI * k) / ZEIGER_PUNKTE;
    pkt.push([ring * Math.cos(t), ring * Math.sin(t)]);
  }
  return pkt;
}

/** einen geschlossenen Umriss auf `n` Punkte verteilen, je Kante nach ihrer Länge (die Ecken bleiben Ecken) */
export function umfangVerteilen(poly: [number, number][], n: number): Float32Array {
  const m = poly.length;
  const len = poly.map((p, i) => Math.hypot(poly[(i + 1) % m]![0] - p[0], poly[(i + 1) % m]![1] - p[1]));
  const summe = len.reduce((a, b) => a + b, 0) || 1;
  const zahl = len.map((l) => Math.max(1, Math.round((n * l) / summe)));
  let rest = n - zahl.reduce((a, b) => a + b, 0);
  while (rest !== 0) {
    let k = 0;
    for (let i = 1; i < m; i++) if (rest > 0 ? len[i]! / zahl[i]! > len[k]! / zahl[k]! : zahl[i]! > zahl[k]!) k = i;
    if (rest < 0 && zahl[k]! <= 1) break;
    zahl[k] = zahl[k]! + Math.sign(rest);
    rest -= Math.sign(rest);
  }
  const aus = new Float32Array(2 * n);
  let j = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % m]!;
    for (let k = 0; k < zahl[i]! && j < n; k++, j++) {
      const t = k / zahl[i]!;
      aus[2 * j] = p[0] + (q[0] - p[0]) * t;
      aus[2 * j + 1] = p[1] + (q[1] - p[1]) * t;
    }
  });
  for (; j < n; j++) {
    aus[2 * j] = aus[2 * j - 2]!;
    aus[2 * j + 1] = aus[2 * j - 1]!;
  }
  return aus;
}
