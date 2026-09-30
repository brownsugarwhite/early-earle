/**
 * Abgleich einzelner Logo-Teile mit dem gesetzten PNG (ohne Abhängigkeiten): PNG lesen (zlib), Polygone mit
 * Überabtastung rastern (nonzero), Deckung des PNGs je Pixel schätzen (Projektion der Farbe auf die Strecke
 * Grund → Teilfarbe) und die kleine Ähnlichkeitskorrektur (Verschiebung, Skalierung um die Teilmitte) suchen, die
 * die quadratische Abweichung der Deckungen minimiert. Florians AI-Datei ist neuer als das PNG: Sterne und ® sitzen
 * dort um Bruchteile eines Pixels anders — das PNG ist der verbindliche Look.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

export function readPng(path) {
  const data = fs.readFileSync(path);
  let pos = 8;
  const idat = [];
  let w = 0;
  let h = 0;
  let ct = 0;
  while (pos < data.length) {
    const len = data.readUInt32BE(pos);
    const type = data.toString('latin1', pos + 4, pos + 8);
    const body = data.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      ct = body[9];
      if (body[8] !== 8 || body[12] !== 0) throw new Error('PNG: nur 8 bit, ohne Interlace');
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
  }
  const ch = { 2: 3, 6: 4, 0: 1, 4: 2 }[ct];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  let i = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[i++];
    const line = Buffer.from(raw.subarray(i, i + stride));
    i += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = v & 255;
    }
    line.copy(out, y * stride);
    prev = line;
  }
  return { w, h, ch, px: (x, y) => [out[(y * w + x) * ch], out[(y * w + x) * ch + 1], out[(y * w + x) * ch + 2]] };
}

/** Deckung (0 … 1) von Ringen (nonzero) auf einem w × h-Raster mit ss × ss Abtastung. */
export function rasterize(rings, w, h, ss = 4) {
  const cov = new Float32Array(w * h);
  const edges = [];
  for (const r of rings)
    for (let i = 0; i < r.length; i++) {
      const a = r[i];
      const b = r[(i + 1) % r.length];
      if (a[1] !== b[1]) edges.push([a[0], a[1], b[0], b[1]]);
    }
  const inc = 1 / (ss * ss);
  for (let sy = 0; sy < h * ss; sy++) {
    const y = (sy + 0.5) / ss;
    const xs = [];
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push([x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
    }
    if (!xs.length) continue;
    xs.sort((a, b) => a[0] - b[0]);
    let wnd = 0;
    const row = Math.floor(sy / ss) * w;
    for (let k = 0; k < xs.length - 1; k++) {
      wnd += xs[k][1];
      if (wnd === 0) continue;
      const sa = Math.max(0, Math.ceil(xs[k][0] * ss - 0.5));
      const sb = Math.min(w * ss - 1, Math.floor(xs[k + 1][0] * ss - 0.5));
      for (let sx = sa; sx <= sb; sx++) cov[row + Math.floor(sx / ss)] += inc;
    }
  }
  return cov;
}

/** Deckung eines PNG-Pixels P zwischen Grund B und Teilfarbe A (Projektion, geklemmt). */
export function coverageOf(p, A, B) {
  let num = 0;
  let den = 0;
  for (let k = 0; k < 3; k++) {
    const a = A[k] - B[k];
    num += (p[k] - B[k]) * a;
    den += a * a;
  }
  return den > 0 ? Math.max(0, Math.min(1, num / den)) : 0;
}

/**
 * Sucht (dx, dy, s) um die Mitte c, sodass die gerasterten Ringe die PNG-Deckung am besten treffen. Liefert auch den
 * IoU (Schwelle 0,5 beidseitig) vorher/nachher.
 */
export function alignPart(png, rings, A, B, { maxShift = 2, maxScale = 0.04, exclude = null } = {}) {
  const pts = rings.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = 6;
  const x0 = Math.floor(Math.min(...xs)) - pad;
  const y0 = Math.floor(Math.min(...ys)) - pad;
  const w = Math.ceil(Math.max(...xs)) + pad - x0;
  const h = Math.ceil(Math.max(...ys)) + pad - y0;
  const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const target = new Float32Array(w * h);
  const skip = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      target[y * w + x] = coverageOf(png.px(x + x0, y + y0), A, B);
      if (exclude?.(x + x0, y + y0)) skip[y * w + x] = 1;
    }
  const place = (dx, dy, s) => rings.map((r) => r.map(([x, y]) => [c[0] + (x - c[0]) * s + dx - x0, c[1] + (y - c[1]) * s + dy - y0]));
  const cost = (dx, dy, s) => {
    const cov = rasterize(place(dx, dy, s), w, h, 4);
    let e = 0;
    for (let i = 0; i < cov.length; i++) if (!skip[i]) e += (cov[i] - target[i]) ** 2;
    return e;
  };
  const iou = (dx, dy, s) => {
    const cov = rasterize(place(dx, dy, s), w, h, 4);
    let inter = 0;
    let uni = 0;
    for (let i = 0; i < cov.length; i++) {
      if (skip[i]) continue;
      const a = cov[i] >= 0.5 ? 1 : 0;
      const b = target[i] >= 0.5 ? 1 : 0;
      inter += a & b;
      uni += a | b;
    }
    return uni ? inter / uni : 1;
  };
  let best = { dx: 0, dy: 0, s: 1, e: cost(0, 0, 1) };
  for (const step of [0.5, 0.25, 0.1, 0.05]) {
    let improved = true;
    while (improved) {
      improved = false;
      for (const [ddx, ddy, ds] of [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ]) {
        const cand = { dx: best.dx + ddx * step, dy: best.dy + ddy * step, s: best.s + ds * step * 0.02 };
        if (Math.abs(cand.dx) > maxShift || Math.abs(cand.dy) > maxShift || Math.abs(cand.s - 1) > maxScale) continue;
        cand.e = cost(cand.dx, cand.dy, cand.s);
        if (cand.e < best.e - 1e-6) {
          best = cand;
          improved = true;
        }
      }
    }
  }
  return { c, dx: best.dx, dy: best.dy, s: best.s, before: iou(0, 0, 1), after: iou(best.dx, best.dy, best.s) };
}

/** Quadratische Abweichung der Deckung (für Stärke-Suchen wie beim ®). */
export function coverageError(png, rings, A, B, box) {
  const [x0, y0, w, h] = box;
  const cov = rasterize(rings.map((r) => r.map(([x, y]) => [x - x0, y - y0])), w, h, 4);
  let e = 0;
  let inter = 0;
  let uni = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = coverageOf(png.px(x + x0, y + y0), A, B);
      const c = cov[y * w + x];
      e += (c - t) ** 2;
      const a = c >= 0.5 ? 1 : 0;
      const b = t >= 0.5 ? 1 : 0;
      inter += a & b;
      uni += a | b;
    }
  return { e, iou: uni ? inter / uni : 1 };
}
