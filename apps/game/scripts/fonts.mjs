#!/usr/bin/env node
/**
 * Caprasimo (EE Heavy) für den Loader und den Splash aufbereiten:
 *
 *   node scripts/fonts.mjs
 *
 * 1. src/splash/glyphs.gen.ts — Umrisse von "0123456789%Tippen" als SVG-Pfade (Einheit: em, y nach unten, Grundlinie
 *    bei 0), Vorschübe, Unterschneidung für "Tippen" und abgetastete Ringe für die langen Schatten (Außenringe positive
 *    Fläche, Löcher negativ). Der Loader zeichnet Ziffern als Pfade: kein Schrift-Blitzen, die Ziffern werfen Schatten,
 *    und das Inline-Boot-Skript braucht keine Webfont.
 * 2. public/fonts/ee-heavy.woff2 — Untermenge (Basis-Latein, ÄÖÜäöüß, Satzzeichen) für alle anderen Stellen
 *    (fonts.css lädt woff2 zuerst, die TTF bleibt Rückfall und Quelle für die native App).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import subsetFont from 'subset-font';
import { flatten, orientRings, simplify } from './ai/geom.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..');
const SRC = path.resolve(appDir, '../../assets/fonts/caprasimo/Caprasimo-Regular.ttf');
const OUT_TS = path.join(appDir, 'src/splash/glyphs.gen.ts');
const OUT_WOFF2 = path.join(appDir, 'public/fonts/ee-heavy.woff2');

const CHARS = '0123456789%Tipen';
const WORD = 'Tippen';

const buf = fs.readFileSync(SRC);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const upm = font.unitsPerEm;

/** opentype-Befehle (Schriftraum, y nach oben) → Segmente in em, y nach unten. */
function segments(glyph) {
  const cmds = glyph.getPath(0, 0, upm).commands; // getPath: y bereits nach unten, Größe upm → Einheiten
  const P = (x, y) => [x / upm, y / upm];
  const segs = [];
  let cur = [0, 0];
  for (const c of cmds) {
    if (c.type === 'M') {
      cur = P(c.x, c.y);
      segs.push({ op: 'M', pts: [cur] });
    } else if (c.type === 'L') {
      cur = P(c.x, c.y);
      segs.push({ op: 'L', pts: [cur] });
    } else if (c.type === 'Q') {
      // Quadratisch → kubisch (Gradanhebung)
      const q = P(c.x1, c.y1);
      const e = P(c.x, c.y);
      const c1 = [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])];
      const c2 = [e[0] + (2 / 3) * (q[0] - e[0]), e[1] + (2 / 3) * (q[1] - e[1])];
      segs.push({ op: 'C', pts: [c1, c2, e] });
      cur = e;
    } else if (c.type === 'C') {
      const e = P(c.x, c.y);
      segs.push({ op: 'C', pts: [P(c.x1, c.y1), P(c.x2, c.y2), e] });
      cur = e;
    } else if (c.type === 'Z') segs.push({ op: 'Z', pts: [] });
  }
  return segs;
}

/**
 * SVG-Pfad in em, relativ (Kleinbuchstaben) mit 3 Nachkommastellen (bei 30 px Schriftgröße 0,03 px): kurz genug
 * für das Inline-Boot-Skript. Quadratische Segmente bleiben quadratisch.
 */
function pathData(glyph) {
  const all = glyph.getPath(0, 0, 1).commands;
  // opentype setzt vor Kurven gern ein L auf den aktuellen Punkt: weglassen
  const cmds = all.filter((c, i) => !(c.type === 'L' && i > 0 && all[i - 1].x === c.x && all[i - 1].y === c.y));
  const q = (v) => Math.round(v * 1000);
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let out = '';
  const n = (v) => {
    const s = (v / 1000).toFixed(3).replace(/\.?0+$/, '').replace(/^(-?)0\./, '$1.');
    return s === '-0' ? '0' : s;
  };
  const pair = (x, y) => {
    const a = n(x);
    const b = n(y);
    return a + (b.startsWith('-') ? '' : ' ') + b;
  };
  for (const c of cmds) {
    if (c.type === 'Z') {
      out += 'z';
      cx = sx;
      cy = sy;
      continue;
    }
    const x = q(c.x);
    const y = q(c.y);
    if (c.type === 'M') {
      out += 'm' + pair(x - cx, y - cy);
      sx = x;
      sy = y;
    } else if (c.type === 'L') out += 'l' + pair(x - cx, y - cy);
    else if (c.type === 'Q') out += 'q' + pair(q(c.x1) - cx, q(c.y1) - cy) + ' ' + pair(x - cx, y - cy);
    else if (c.type === 'C') out += 'c' + pair(q(c.x1) - cx, q(c.y1) - cy) + ' ' + pair(q(c.x2) - cx, q(c.y2) - cy) + ' ' + pair(x - cx, y - cy);
    cx = x;
    cy = y;
  }
  return out;
}

const glyphs = {};
for (const ch of CHARS) {
  const g = font.charToGlyph(ch);
  const rings = orientRings(flatten(segments(g), 0.0008).map((r) => simplify(r, 0.01)));
  const bb = g.getBoundingBox();
  glyphs[ch] = {
    adv: +(g.advanceWidth / upm).toFixed(4),
    d: pathData(g),
    rings: rings.map((r) => r.map((p) => [+p[0].toFixed(3), +p[1].toFixed(3)])),
    box: [+(bb.x1 / upm).toFixed(4), +(-bb.y2 / upm).toFixed(4), +(bb.x2 / upm).toFixed(4), +(-bb.y1 / upm).toFixed(4)],
  };
}
const kern = {};
for (let i = 0; i + 1 < WORD.length; i++) {
  const a = font.charToGlyph(WORD[i]);
  const b = font.charToGlyph(WORD[i + 1]);
  const k = font.getKerningValue(a, b) / upm;
  if (Math.abs(k) > 1e-4) kern[WORD[i] + WORD[i + 1]] = +k.toFixed(4);
}

const data = {
  family: 'Caprasimo',
  ascent: +(font.ascender / upm).toFixed(4),
  descent: +(font.descender / upm).toFixed(4),
  capHeight: +((font.tables.os2?.sCapHeight ?? 0) / upm).toFixed(4),
  glyphs,
  kern,
};
const ts = `/* Generiert von scripts/fonts.mjs aus assets/fonts/caprasimo/Caprasimo-Regular.ttf (SIL OFL 1.1) — nicht von Hand ändern. */
/**
 * Caprasimo-Umrisse für Loader-Prozent und "Tippen": Pfade in em (y nach unten, Grundlinie 0, Ursprung links),
 * Vorschub \`adv\`, Umrissbox \`box\` [x0, y0, x1, y1], Schattenwerfer-Ringe (Außenringe positive Fläche, Löcher
 * negativ) und Unterschneidung für Paare aus "${WORD}".
 */
export const GLYPHS = ${JSON.stringify(data)} as const;

export type GlyphChar = keyof typeof GLYPHS.glyphs;
`;
fs.writeFileSync(OUT_TS, ts);

// woff2-Untermenge
const latin = Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('');
const text = latin + 'ÄÖÜäöüßéèêàâçœ€„“”‚‘’–—…·×÷°²³½';
const woff2 = await subsetFont(buf, text, { targetFormat: 'woff2' });
fs.writeFileSync(OUT_WOFF2, woff2);

console.log(`glyphs.gen.ts: ${Object.keys(glyphs).length} Glyphen, ${(ts.length / 1024).toFixed(1)} KB, Kerning ${JSON.stringify(kern)}`);
console.log(`ee-heavy.woff2: ${(woff2.length / 1024).toFixed(1)} KB (TTF ${(buf.length / 1024).toFixed(1)} KB)`);
