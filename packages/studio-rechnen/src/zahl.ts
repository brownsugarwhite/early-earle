// Zahlen schreiben (Plan 3.5 Nr. 3, Befund 11): ungerundet, in der kürzesten Darstellung, die beim Lesen dieselbe Zahl ergibt.
// So bleibt der Rundweg Schreiben–Laden bitgleich, und keine Mischung hängt an einer Rundung.

/** größter Betrag, den der Schreiber annimmt; darüber liegt ein Fehler im Dokument vor */
export const ZAHL_GRENZE = 1e15;

/**
 * Zahl als Text für den Schreiber: `String(x)`, also die kürzeste Darstellung, die beim Lesen dieselbe Zahl ergibt (Beträge unter
 * 1e-6 mit Exponent, wie `String`), −0 als `0`, nie gerundet. NaN, ±∞ und Beträge über 1e15 werfen einen Fehler: Der Schreiber
 * bricht ab, statt etwas Falsches zu schreiben.
 */
export function zahlText(x: number): string {
  if (Number.isNaN(x)) throw new RangeError('zahlText: NaN lässt sich nicht schreiben');
  if (!Number.isFinite(x)) throw new RangeError(`zahlText: ${x > 0 ? '+∞' : '−∞'} lässt sich nicht schreiben`);
  if (Math.abs(x) > ZAHL_GRENZE) throw new RangeError(`zahlText: Betrag über 1e15 (${String(x)})`);
  return x === 0 ? '0' : String(x);
}
