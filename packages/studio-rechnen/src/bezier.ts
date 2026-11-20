// Bézier-Hilfen (Plan 3.5, 4.1): Teilen nach de Casteljau, Stückzahl nach Wang, Bernstein-Tabellen und der Abstand zweier Formen an
// ihren Kurvenpunkten.
//
// Ein Kurvenstück sind 8 Zahlen: p0, Aus-Griff von p0, Ein-Griff von p3, p3 (je x, y). Eine Form hat je Anker 6 Zahlen absolut:
// p, Ein-Griff, Aus-Griff (wie `ankerPunkte` im Format); Stück k läuft von Anker k über dessen Aus-Griff und den Ein-Griff von
// Anker k + 1 zu Anker k + 1, bei geschlossenen Formen das letzte zurück zu Anker 0. Gewichte und Teilung rechnen in derselben
// Folge wie `punktAuf` und `teilen` des Prototyps (form.ts:49–78).

/**
 * Stück bei t teilen (de Casteljau): aus[0 … 7] das Stück von p0 bis zum Teilungspunkt, aus[8 … 15] das von dort bis p3. Beide
 * Hälften ergeben zusammen dieselbe Kurve; der Teilungspunkt ist der Kurvenpunkt bei t.
 */
export function casteljau(stueck: ArrayLike<number>, t: number, aus: Float64Array): void {
  if (stueck.length < 8) throw new RangeError(`casteljau: ein Stück hat 8 Zahlen, nicht ${stueck.length}`);
  if (aus.length < 16) throw new RangeError(`casteljau: Platz für ${aus.length} Zahlen, gebraucht 16`);
  const p0x = stueck[0]!;
  const p0y = stueck[1]!;
  const p1x = stueck[2]!;
  const p1y = stueck[3]!;
  const p2x = stueck[4]!;
  const p2y = stueck[5]!;
  const p3x = stueck[6]!;
  const p3y = stueck[7]!;
  // je Ebene der Punkt bei t zwischen zwei Nachbarn: u + (v − u) · t
  const q0x = p0x + (p1x - p0x) * t;
  const q0y = p0y + (p1y - p0y) * t;
  const q1x = p1x + (p2x - p1x) * t;
  const q1y = p1y + (p2y - p1y) * t;
  const q2x = p2x + (p3x - p2x) * t;
  const q2y = p2y + (p3y - p2y) * t;
  const r0x = q0x + (q1x - q0x) * t;
  const r0y = q0y + (q1y - q0y) * t;
  const r1x = q1x + (q2x - q1x) * t;
  const r1y = q1y + (q2y - q1y) * t;
  const sx = r0x + (r1x - r0x) * t;
  const sy = r0y + (r1y - r0y) * t;
  aus[0] = p0x;
  aus[1] = p0y;
  aus[2] = q0x;
  aus[3] = q0y;
  aus[4] = r0x;
  aus[5] = r0y;
  aus[6] = sx;
  aus[7] = sy;
  aus[8] = sx;
  aus[9] = sy;
  aus[10] = r1x;
  aus[11] = r1y;
  aus[12] = q2x;
  aus[13] = q2y;
  aus[14] = p3x;
  aus[15] = p3y;
}

/**
 * Stückzahl nach Wang: so viele gleich lange Parameterschritte, dass die Strecken nirgends weiter als `toleranz` von der Kurve
 * liegen: ⌈√(0,75 · M / toleranz)⌉ mit M, dem größten Betrag der zweiten Differenzen der Kontrollpunkte; mindestens 1. Maßstab,
 * der Faktor 1,25 für Knochen und Zusätze und die Grenze von 64 je Stück gehören dem Aufrufer (16 k).
 */
export function wangStueckzahl(stueck: ArrayLike<number>, toleranz: number): number {
  if (stueck.length < 8) throw new RangeError(`wangStueckzahl: ein Stück hat 8 Zahlen, nicht ${stueck.length}`);
  if (!(toleranz > 0) || !Number.isFinite(toleranz)) throw new RangeError(`wangStueckzahl: Toleranz ${String(toleranz)} ist nicht positiv`);
  const ax = stueck[0]! - 2 * stueck[2]! + stueck[4]!;
  const ay = stueck[1]! - 2 * stueck[3]! + stueck[5]!;
  const bx = stueck[2]! - 2 * stueck[4]! + stueck[6]!;
  const by = stueck[3]! - 2 * stueck[5]! + stueck[7]!;
  const m = Math.sqrt(Math.max(ax * ax + ay * ay, bx * bx + by * by));
  const n = Math.ceil(Math.sqrt((0.75 * m) / toleranz));
  if (!Number.isFinite(n)) throw new RangeError('wangStueckzahl: Stück mit nicht endlichen Zahlen');
  return Math.max(1, n);
}

/**
 * Bernstein-Gewichte der vier Kontrollpunkte an den Stellen t = j / stufen, j = 0 … stufen: (stufen + 1) · 4 Zahlen, je Stelle
 * (1 − t)³, 3(1 − t)²t, 3(1 − t)t², t³. An t = 0 und t = 1 genau (1, 0, 0, 0) und (0, 0, 0, 1): Anker bleiben exakt. Ein
 * Kurvenpunkt ist w0 · p0 + w1 · p1 + w2 · p2 + w3 · p3 (in dieser Folge summiert wie `punktAuf` des Prototyps).
 */
export function bernstein(stufen: number): Float64Array {
  if (!Number.isInteger(stufen) || stufen < 1) throw new RangeError(`bernstein: ${String(stufen)} Stufen`);
  const aus = new Float64Array((stufen + 1) * 4);
  for (let j = 0; j <= stufen; j++) {
    const t = j / stufen;
    const u = 1 - t;
    aus[4 * j] = u * u * u;
    aus[4 * j + 1] = 3 * u * u * t;
    aus[4 * j + 2] = 3 * u * t * t;
    aus[4 * j + 3] = t * t * t;
  }
  return aus;
}

/** Stellen der Kurvenpunkte, an denen gemessen wird: t = 0, 1/8, …, 1 (3.5) */
const ACHTEL = bernstein(8);

/**
 * Größter Abstand gleicher Kurvenpunkte zweier Formen mit gleich vielen Ankern (je Anker 6 Zahlen absolut: p, Ein-Griff,
 * Aus-Griff): je Kurvenstück bei t = 0, 1/8, …, 1, Anker eingeschlossen (3.5). Eine geschlossene Form hat so viele Stücke wie
 * Anker, eine offene eins weniger; eine offene mit einem Anker wird an ihm gemessen. Liegt irgendwo NaN, ist das Ergebnis NaN.
 */
export function kurvenAbstand(a: ArrayLike<number>, b: ArrayLike<number>, geschlossen: boolean): number {
  if (a.length % 6 !== 0 || b.length % 6 !== 0) throw new RangeError('kurvenAbstand: je Anker 6 Zahlen');
  if (a.length !== b.length) throw new RangeError(`kurvenAbstand: ${a.length / 6} gegen ${b.length / 6} Anker`);
  const n = a.length / 6;
  if (n === 0) return 0;
  if (n === 1 && !geschlossen) {
    const dx = a[0]! - b[0]!;
    const dy = a[1]! - b[1]!;
    return Math.sqrt(dx * dx + dy * dy);
  }
  const stuecke = geschlossen ? n : n - 1;
  let groesster = 0;
  for (let k = 0; k < stuecke; k++) {
    const i = 6 * k;
    const j = 6 * ((k + 1) % n);
    for (let s = 0; s <= 8; s++) {
      const w0 = ACHTEL[4 * s]!;
      const w1 = ACHTEL[4 * s + 1]!;
      const w2 = ACHTEL[4 * s + 2]!;
      const w3 = ACHTEL[4 * s + 3]!;
      // Anker k, sein Aus-Griff, der Ein-Griff von Anker k + 1, Anker k + 1
      const ax = w0 * a[i]! + w1 * a[i + 4]! + w2 * a[j + 2]! + w3 * a[j]!;
      const ay = w0 * a[i + 1]! + w1 * a[i + 5]! + w2 * a[j + 3]! + w3 * a[j + 1]!;
      const bx = w0 * b[i]! + w1 * b[i + 4]! + w2 * b[j + 2]! + w3 * b[j]!;
      const by = w0 * b[i + 1]! + w1 * b[i + 5]! + w2 * b[j + 3]! + w3 * b[j + 1]!;
      const dx = ax - bx;
      const dy = ay - by;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (Number.isNaN(d)) return NaN;
      if (d > groesster) groesster = d;
    }
  }
  return groesster;
}
