/**
 * Deterministische Zufallsquellen für den Weltgenerator. Keine Abhängigkeit auf @ee/core, damit die
 * Chunk-Generierung auch in Workern und Tests ohne Spiellogik läuft.
 */

/** Geteilter Puffer für die Bytes einer Zahl (Float64, Plattform-Bytereihenfolge wie zuvor je Aufruf neu angelegt). */
const HASH_F64 = new Float64Array(1);
const HASH_U8 = new Uint8Array(HASH_F64.buffer);

/**
 * 32-bit-Hash (FNV-1a mit Murmur-Finalizer) über Zahlen und Strings, z. B. `hash32('tjorizo', cx, cy)`.
 *
 * Ohne Allokation je Aufruf (R4: vorher je Zahl ein neues Float64Array + Uint8Array — beim Schwenken ≈ 3 µs je
 * `treeHash`, 77 % von `TreeLayer.setContent`); dieselben Bytes in derselben Reihenfolge → identische Werte.
 */
export function hash32(...parts: ReadonlyArray<number | string>): number {
  let h = 0x811c9dc5;
  for (let p = 0; p < parts.length; p++) {
    const part = parts[p]!;
    if (typeof part === 'string') {
      for (let i = 0; i < part.length; i++) {
        h ^= part.charCodeAt(i) & 0xff;
        h = Math.imul(h, 0x01000193);
      }
      h ^= 0xff;
      h = Math.imul(h, 0x01000193);
    } else {
      // Zahlen bitweise (auch Nachkommastellen) einmischen
      HASH_F64[0] = part;
      for (let i = 0; i < 8; i++) {
        h ^= HASH_U8[i]!;
        h = Math.imul(h, 0x01000193);
      }
    }
  }
  // Murmur3-Finalizer für bessere Streuung
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32: schneller, reproduzierbarer PRNG. Liefert Zahlen in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
