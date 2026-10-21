// Teil A, E1 (Plan 21.10.): Reihen nach Hautlänge. Ein in U der Karte gleichmäßiges Gitter drängt die Reihen nahe dem
// Schlitz und am Mundwinkel zusammen (dort ist die Haut ∝ ζ²; auf K2 lagen sechs Reihen innerhalb von 6 px um c). Hier
// werden die Speichen eines dichten Gitters der Karte auf der Haut abgemessen und die Reihen in gewünschten Abständen auf sie
// gelegt (Lage „Band“, `band.ts`). DOM-frei.

type V3 = [number, number, number];
type Umkehr = (u: number, v: number) => { p: V3; n: V3 };

/** Lage des Hautgitters (rechte Hälfte): Kartenlage und Haut je Knoten, Reihe 0 = Lippe (2m + 1), ab Reihe 1 je 2M + 1. */
export type HautLage = { u: number[][]; v: number[][]; lagen: V3[][] };

/** Kernring: Lippenknoten, an dem Speiche j beginnt (die Fächerspeichen m … M + 2 samt den Polen beginnen an c). */
export function speichenAnfang(j: number, m: number): number {
  return j < m ? j : j <= m + 4 ? m : j - 4;
}

/** Geometrische Reihe: Faktor q mit erste·(1 + q + … + q^(J−1)) = L (Halbierung; q = 1 bei J·erste = L). */
function wachstum(L: number, erste: number, J: number): number {
  const summe = (q: number) => (Math.abs(q - 1) < 1e-12 ? J * erste : (erste * (q ** J - 1)) / (q - 1));
  let lo = 0.05;
  let hi = 4;
  if (summe(lo) >= L) return lo;
  if (summe(hi) <= L) return hi;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (summe(mid) < L) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * Reihen nach Hautlänge: Speiche j des dichten Gitters (J_d Reihen) ab ihrem Lippenknoten auf der Haut abgemessen, Reihe r
 * bei erste_j·(1 + q + … + q^(r−1)) mit dem Faktor q der Speiche (Reihe J = Feldrand); `erste` je Speiche (die örtliche
 * Spanne der Lippe: Zellen an der Lippe quadratisch) oder für alle gleich. Je Speiche monoton, also faltenfrei, solange die
 * Speichen sich nicht kreuzen (sie kommen aus einer faltenfreien Lage der Karte). Dazu je Knoten der Abstand auf seiner
 * Speiche (`abstand[r][j]`) und je Speiche ihre Länge.
 */
export function reihenNachHaut(dicht: HautLage, J: number, m: number, erste: number | readonly number[], umkehr: Umkehr): HautLage & { abstand: number[][]; laenge: number[] } {
  const Jd = dicht.u.length - 1;
  const S = dicht.u[1]!.length - 1;
  const leer = <T>() => Array.from({ length: J - 1 }, () => new Array<T>(S + 1));
  const u: number[][] = [dicht.u[0]!.slice(), ...leer<number>(), dicht.u[Jd]!.slice()];
  const v: number[][] = [dicht.v[0]!.slice(), ...leer<number>(), dicht.v[Jd]!.slice()];
  const lagen: V3[][] = [dicht.lagen[0]!.slice(), ...leer<V3>(), dicht.lagen[Jd]!.slice()];
  const abstand: number[][] = [new Array<number>(2 * m + 1).fill(0), ...leer<number>(), new Array<number>(S + 1)];
  const laenge: number[] = [];
  for (let j = 0; j <= S; j++) {
    const k0 = speichenAnfang(j, m);
    const zu = [dicht.u[0]![k0]!];
    const zv = [dicht.v[0]![k0]!];
    const zp: V3[] = [dicht.lagen[0]![k0]!];
    for (let r = 1; r <= Jd; r++) {
      zu.push(dicht.u[r]![j]!);
      zv.push(dicht.v[r]![j]!);
      zp.push(dicht.lagen[r]![j]!);
    }
    const s = [0];
    for (let i = 1; i < zp.length; i++) s.push(s[i - 1]! + Math.hypot(zp[i]![0] - zp[i - 1]![0], zp[i]![1] - zp[i - 1]![1], zp[i]![2] - zp[i - 1]![2]));
    const L = s[s.length - 1]!;
    laenge.push(L);
    abstand[J]![j] = L;
    // erste Reihe im gewünschten Abstand, dann geometrisch wachsend — nie schrumpfend: ist die Speiche kürzer als J Schritte,
    // liegen die Reihen gleichmäßig (sonst drängen sich die letzten Reihen am Feldrand und die Zellen entarten)
    const e0 = Math.min(typeof erste === 'number' ? erste : erste[j]!, L / J);
    const q = Math.max(1, wachstum(L, e0, J));
    let ziel = 0;
    let schritt = e0;
    let i = 0;
    for (let r = 1; r < J; r++) {
      ziel += schritt;
      schritt *= q;
      while (i + 2 < s.length && s[i + 1]! < ziel) i++;
      const t = s[i + 1]! > s[i]! ? Math.min(1, Math.max(0, (ziel - s[i]!) / (s[i + 1]! - s[i]!))) : 0;
      const uu = zu[i]! + t * (zu[i + 1]! - zu[i]!);
      const vv = zv[i]! + t * (zv[i + 1]! - zv[i]!);
      u[r]![j] = uu;
      v[r]![j] = vv;
      lagen[r]![j] = umkehr(uu, vv).p;
      abstand[r]![j] = Math.min(ziel, L);
    }
  }
  return { u, v, lagen, abstand, laenge };
}
