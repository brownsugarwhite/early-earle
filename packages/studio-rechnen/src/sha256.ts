// SHA-256 nach FIPS 180-4, eigene Umsetzung (Befund 30 a): ohne node:crypto und WebCrypto, damit Format und Laufzeit es ohne DOM
// und ohne Node nutzen (Kennungen aus Pfaden, Revisionen; Plan 3.3, 4.1). Nur ganze 32-Bit-Zahlen: auf jedem Gerät dasselbe
// Ergebnis. Dazu `utf8`, denn `TextEncoder` gibt es ohne DOM nicht.

/** erste 32 Bit der Nachkommastellen der Kubikwurzeln der ersten 64 Primzahlen (FIPS 180-4, 4.2.2) */
const K = new Int32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be,
  0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa,
  0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85,
  0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** Anfangswert: erste 32 Bit der Nachkommastellen der Quadratwurzeln der ersten acht Primzahlen (FIPS 180-4, 5.3.3) */
const ANFANG = new Int32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);

/** Wortplan eines Blocks; sha256 ruft nichts von außen auf, darum genügt ein Feld für alle Aufrufe */
const W = new Int32Array(64);

function dreheRechts(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** einen Block aus 64 Bytes ab `o` in den Stand h einrechnen (FIPS 180-4, 6.2.2) */
function block(h: Int32Array, d: Uint8Array, o: number): void {
  for (let t = 0; t < 16; t++) {
    const j = o + 4 * t;
    W[t] = (d[j]! << 24) | (d[j + 1]! << 16) | (d[j + 2]! << 8) | d[j + 3]!;
  }
  for (let t = 16; t < 64; t++) {
    const x = W[t - 15]!;
    const y = W[t - 2]!;
    const s0 = dreheRechts(x, 7) ^ dreheRechts(x, 18) ^ (x >>> 3);
    const s1 = dreheRechts(y, 17) ^ dreheRechts(y, 19) ^ (y >>> 10);
    W[t] = (s1 + W[t - 7]! + s0 + W[t - 16]!) | 0;
  }
  let a = h[0]!;
  let b = h[1]!;
  let c = h[2]!;
  let dd = h[3]!;
  let e = h[4]!;
  let f = h[5]!;
  let g = h[6]!;
  let hh = h[7]!;
  for (let t = 0; t < 64; t++) {
    const summe1 = dreheRechts(e, 6) ^ dreheRechts(e, 11) ^ dreheRechts(e, 25);
    const wahl = (e & f) ^ (~e & g);
    const t1 = (hh + summe1 + wahl + K[t]! + W[t]!) | 0;
    const summe0 = dreheRechts(a, 2) ^ dreheRechts(a, 13) ^ dreheRechts(a, 22);
    const mehrheit = (a & b) ^ (a & c) ^ (b & c);
    const t2 = (summe0 + mehrheit) | 0;
    hh = g;
    g = f;
    f = e;
    e = (dd + t1) | 0;
    dd = c;
    c = b;
    b = a;
    a = (t1 + t2) | 0;
  }
  h[0] = (h[0]! + a) | 0;
  h[1] = (h[1]! + b) | 0;
  h[2] = (h[2]! + c) | 0;
  h[3] = (h[3]! + dd) | 0;
  h[4] = (h[4]! + e) | 0;
  h[5] = (h[5]! + f) | 0;
  h[6] = (h[6]! + g) | 0;
  h[7] = (h[7]! + hh) | 0;
}

/** SHA-256 der Bytes: 32 Bytes, das höchste Byte jedes Worts zuerst (wie jede andere Umsetzung) */
export function sha256(daten: Uint8Array): Uint8Array {
  const h = new Int32Array(ANFANG);
  const n = daten.length;
  const volle = Math.floor(n / 64);
  for (let b = 0; b < volle; b++) block(h, daten, 64 * b);
  // Rest, eine 1, Nullen und die Länge in Bit (64 Bit, höchstes Byte zuerst): ein oder zwei Blöcke
  const rest = n - 64 * volle;
  const ende = new Uint8Array(rest < 56 ? 64 : 128);
  ende.set(daten.subarray(64 * volle));
  ende[rest] = 0x80;
  const bitsHoch = Math.floor(n / 0x20000000);
  const bitsTief = (n * 8) >>> 0;
  const l = ende.length;
  ende[l - 8] = bitsHoch >>> 24;
  ende[l - 7] = (bitsHoch >>> 16) & 0xff;
  ende[l - 6] = (bitsHoch >>> 8) & 0xff;
  ende[l - 5] = bitsHoch & 0xff;
  ende[l - 4] = bitsTief >>> 24;
  ende[l - 3] = (bitsTief >>> 16) & 0xff;
  ende[l - 2] = (bitsTief >>> 8) & 0xff;
  ende[l - 1] = bitsTief & 0xff;
  for (let o = 0; o < l; o += 64) block(h, ende, o);
  const aus = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    const v = h[i]!;
    aus[4 * i] = v >>> 24;
    aus[4 * i + 1] = (v >>> 16) & 0xff;
    aus[4 * i + 2] = (v >>> 8) & 0xff;
    aus[4 * i + 3] = v & 0xff;
  }
  return aus;
}

/**
 * Text als UTF-8-Bytes, genau wie `TextEncoder`: Ersatzpaare werden ein Zeichen aus vier Bytes, eine einzelne Hälfte eines
 * Ersatzpaars wird U+FFFD.
 */
export function utf8(text: string): Uint8Array {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length && (text.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      n += 4;
      i++;
    } else n += 3;
  }
  const aus = new Uint8Array(n);
  let j = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) {
      aus[j++] = c;
    } else if (c < 0x800) {
      aus[j++] = 0xc0 | (c >>> 6);
      aus[j++] = 0x80 | (c & 0x3f);
    } else if (c >= 0xd800 && c <= 0xdfff) {
      const d = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (c <= 0xdbff && (d & 0xfc00) === 0xdc00) {
        const p = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        aus[j++] = 0xf0 | (p >>> 18);
        aus[j++] = 0x80 | ((p >>> 12) & 0x3f);
        aus[j++] = 0x80 | ((p >>> 6) & 0x3f);
        aus[j++] = 0x80 | (p & 0x3f);
        i++;
      } else {
        aus[j++] = 0xef;
        aus[j++] = 0xbf;
        aus[j++] = 0xbd;
      }
    } else {
      aus[j++] = 0xe0 | (c >>> 12);
      aus[j++] = 0x80 | ((c >>> 6) & 0x3f);
      aus[j++] = 0x80 | (c & 0x3f);
    }
  }
  return aus;
}
