// Kleiner PNG-Leser und -Schreiber (8 Bit, RGB/RGBA/Grau, ohne Interlace) für die Proben des Maskottchens.
import fs from 'node:fs';
import zlib from 'node:zlib';

export function lesePng(datei) {
  const buf = fs.readFileSync(datei);
  let p = 8;
  let breite = 0;
  let hoehe = 0;
  let tiefe = 0;
  let art = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const typ = buf.toString('latin1', p + 4, p + 8);
    const daten = buf.subarray(p + 8, p + 8 + len);
    if (typ === 'IHDR') {
      breite = daten.readUInt32BE(0);
      hoehe = daten.readUInt32BE(4);
      tiefe = daten[8];
      art = daten[9];
      if (daten[12] !== 0) throw new Error('Interlace nicht unterstützt');
    } else if (typ === 'IDAT') idat.push(daten);
    else if (typ === 'IEND') break;
    p += 12 + len;
  }
  if (tiefe !== 8) throw new Error('nur 8 Bit');
  const kanaele = { 0: 1, 2: 3, 4: 2, 6: 4 }[art];
  if (!kanaele) throw new Error('Farbart ' + art);
  const roh = zlib.inflateSync(Buffer.concat(idat));
  const zeile = breite * kanaele;
  const out = new Uint8Array(breite * hoehe * 4);
  const vor = new Uint8Array(zeile);
  const cur = new Uint8Array(zeile);
  for (let y = 0; y < hoehe; y++) {
    const f = roh[y * (zeile + 1)];
    const s = roh.subarray(y * (zeile + 1) + 1, (y + 1) * (zeile + 1));
    for (let i = 0; i < zeile; i++) {
      const a = i >= kanaele ? cur[i - kanaele] : 0;
      const b = vor[i];
      const c = i >= kanaele ? vor[i - kanaele] : 0;
      let v = s[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < breite; x++) {
      const o = (y * breite + x) * 4;
      const i = x * kanaele;
      if (kanaele === 1) {
        out[o] = out[o + 1] = out[o + 2] = cur[i];
        out[o + 3] = 255;
      } else if (kanaele === 2) {
        out[o] = out[o + 1] = out[o + 2] = cur[i];
        out[o + 3] = cur[i + 1];
      } else {
        out[o] = cur[i];
        out[o + 1] = cur[i + 1];
        out[o + 2] = cur[i + 2];
        out[o + 3] = kanaele === 4 ? cur[i + 3] : 255;
      }
    }
    vor.set(cur);
  }
  return { breite, hoehe, rgba: out };
}

const crcTab = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTab[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(typ, daten) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(daten.length);
  const td = Buffer.concat([Buffer.from(typ, 'latin1'), daten]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
export function schreibePng(datei, breite, hoehe, rgba) {
  const zeile = breite * 4;
  const roh = Buffer.alloc((zeile + 1) * hoehe);
  for (let y = 0; y < hoehe; y++) {
    roh[y * (zeile + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * zeile, zeile).copy(roh, y * (zeile + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(
    datei,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(roh, { level: 6 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
