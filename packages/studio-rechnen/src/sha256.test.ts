// SHA-256 (Befund 30 a): Testvektoren aus FIPS 180-2 (Anhang B) und Vergleich mit node:crypto (nur im Test), dazu UTF-8 wie Node.
import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sha256, utf8 } from './sha256';

const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const ascii = (s: string): Uint8Array => Uint8Array.from(s, (z) => z.charCodeAt(0));
const vonNode = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');

describe('sha256', () => {
  it('Testvektoren: leer, „abc“, 448 Bit, 896 Bit, eine Million „a“', () => {
    expect(hex(sha256(new Uint8Array(0)))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hex(sha256(ascii('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hex(sha256(ascii('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(
      hex(sha256(ascii('abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu'))),
    ).toBe('cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1');
    expect(hex(sha256(new Uint8Array(1_000_000).fill(0x61)))).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });

  it('jede Länge an den Blockgrenzen gleich node:crypto', () => {
    for (let n = 0; n <= 200; n++) {
      const daten = new Uint8Array(n);
      for (let i = 0; i < n; i++) daten[i] = (i * 151 + n * 7) & 0xff;
      expect(hex(sha256(daten)), `Länge ${n}`).toBe(vonNode(daten));
    }
  });

  it('zufällige Bytes gleich node:crypto (fast-check)', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 1000 }), (daten) => hex(sha256(daten)) === vonNode(daten)),
      { numRuns: 500 },
    );
  });

  it('liest nur die Bytes der Sicht, ändert sie nicht und gibt 32 Bytes', () => {
    const puffer = Uint8Array.from({ length: 300 }, (_, i) => i & 0xff);
    const sicht = puffer.subarray(17, 250);
    const kopie = sicht.slice();
    const summe = sha256(sicht);
    expect(summe.length).toBe(32);
    expect(hex(summe)).toBe(vonNode(kopie));
    expect(Array.from(sicht)).toEqual(Array.from(kopie));
    // zweimal gerechnet dasselbe (das gemeinsame Arbeitsfeld hinterlässt nichts)
    expect(hex(sha256(sicht))).toBe(hex(summe));
  });
});

describe('utf8', () => {
  it('wie Node für feste Fälle: ASCII, Umlaute, Emoji, einzelne Hälften eines Ersatzpaars', () => {
    for (const s of ['', 'ozzy/teil/a', 'Größe ß € 😀', '\ud800', 'a\udc00b', '😀\ud83d', '߿ࠀ￿']) {
      expect(Array.from(utf8(s)), JSON.stringify(s)).toEqual(Array.from(Buffer.from(s, 'utf8')));
    }
  });

  it('beliebige UTF-16-Einheiten wie Node (fast-check)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 0xffff }), { maxLength: 60 }), (einheiten) => {
        const s = String.fromCharCode(...einheiten);
        const a = utf8(s);
        const b = Buffer.from(s, 'utf8');
        return a.length === b.length && a.every((x, i) => x === b[i]);
      }),
      { numRuns: 1000 },
    );
  });
});
