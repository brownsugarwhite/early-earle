// Prüfsumme des Laufs (Plan 4.1; Konzept 10.3, Schritt 9): 32 Bit über die Bytes von Feldern, nach dem Vorbild von MurmurHash3
// (x86, 32 Bit). Nur ganze 32-Bit-Zahlen (Math.imul, Verschiebungen): auf jedem Gerät dieselbe Zahl für dieselben Bytes. Schnell
// und ohne Speicher im Takt (je Puffer einmal eine Byte-Sicht); nicht kryptografisch, dafür gibt es sha256.ts.

/** Byte-Sicht je Puffer, damit der Takt keine anlegt */
const bytesJePuffer = new WeakMap<ArrayBufferLike, Uint8Array>();

function pufferBytes(puffer: ArrayBufferLike): Uint8Array {
  let bytes = bytesJePuffer.get(puffer);
  if (bytes === undefined || bytes.byteLength !== puffer.byteLength) {
    bytes = new Uint8Array(puffer);
    bytesJePuffer.set(puffer, bytes);
  }
  return bytes;
}

/** ein Wort k in den Stand h einrechnen */
function runde(h: number, k: number): number {
  k = Math.imul(k, 0xcc9e2d51);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, 0x1b873593);
  h ^= k;
  h = (h << 13) | (h >>> 19);
  return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

/**
 * Prüfsumme über die Bytes der Felder (je Feld byteOffset bis byteOffset + byteLength), in ihrer Reihenfolge, ganz in [0, 2³²).
 * Die Länge jedes Felds zählt mit: Anders aufgeteilte gleiche Bytes geben eine andere Summe. `start` (Standard 0) ist der
 * Anfangsstand, etwa die Summe des vorigen Takts. Gemessen werden die Bytes, wie sie im Speicher liegen (alle Zielgeräte
 * speichern Zahlen mit dem niedrigsten Byte zuerst). Ein NaN kann je Gerät andere Bytes haben: Weicht die Summe ab, zuerst nach
 * NaN im Lauf suchen (das ist ohnehin ein Fehler).
 */
export function pruefsumme(felder: readonly ArrayBufferView[], start = 0): number {
  let h = start | 0;
  for (let f = 0; f < felder.length; f++) {
    const feld = felder[f]!;
    const laenge = feld.byteLength;
    let bytes: Uint8Array;
    let i: number;
    if (feld instanceof Uint8Array) {
      bytes = feld;
      i = 0;
    } else {
      bytes = pufferBytes(feld.buffer);
      i = feld.byteOffset;
    }
    const ende = i + laenge;
    // volle Wörter, das niedrigste Byte zuerst
    for (; i + 4 <= ende; i += 4) h = runde(h, bytes[i]! | (bytes[i + 1]! << 8) | (bytes[i + 2]! << 16) | (bytes[i + 3]! << 24));
    // Rest mit Nullen aufgefüllt; die Länge danach unterscheidet ihn von echten Nullen
    if (i < ende) {
      let k = 0;
      for (let s = 0; i < ende; i++, s += 8) k |= bytes[i]! << s;
      h = runde(h, k);
    }
    h = runde(h, laenge);
  }
  return vermengen(h ^ felder.length) >>> 0;
}

/** Schlussmischung von MurmurHash3: Jedes Bit wirkt auf jedes */
function vermengen(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h;
}
