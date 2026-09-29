/**
 * Deterministische Zufallsquellen für den Weltgenerator. Keine Abhängigkeit auf @ee/core, damit die
 * Chunk-Generierung auch in Workern und Tests ohne Spiellogik läuft.
 */

/** 32-bit-Hash (FNV-1a mit Murmur-Finalizer) über Zahlen und Strings, z. B. `hash32('tjorizo', cx, cy)`. */
export function hash32(...parts: ReadonlyArray<number | string>): number {
  let h = 0x811c9dc5;
  const mixByte = (b: number) => {
    h ^= b & 0xff;
    h = Math.imul(h, 0x01000193);
  };
  for (const part of parts) {
    if (typeof part === 'string') {
      for (let i = 0; i < part.length; i++) mixByte(part.charCodeAt(i));
      mixByte(0xff);
    } else {
      // Zahlen bitweise (auch Nachkommastellen) einmischen
      const f = new Float64Array([part]);
      const u = new Uint8Array(f.buffer);
      for (let i = 0; i < 8; i++) mixByte(u[i] ?? 0);
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
