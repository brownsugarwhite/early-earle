/**
 * Minimaler PDF-Leser für Illustrator-Dateien mit PDF-Kompatibilität (ohne Abhängigkeiten, nur zlib):
 * Objekte, Dictionaries, Streams (FlateDecode) und ein Interpreter für Inhaltsströme, der eine Anzeigeliste
 * liefert (Pfade im Seitenraum, Füllungen, Konturen, Verläufe, Form-XObjects als Gruppen, Text als Glyphenlauf).
 *
 * Unterstützt genau das, was Florians Datei braucht (und etwas Reserve): m l c v y h re, cm q Q, g rg k G RG K
 * cs CS sc scn SC SCN, w J j M d, gs (ca CA BM), W W* n f F f* S s B B* b b*, sh (Axialverläufe, Funktionstyp 2/3),
 * Do (Form mit Matrix, BBox, Group), BT ET Tf Tm Td TD T* Tj TJ ' ", BDC/BMC/EMC mit optionalem Inhalt (/OC).
 */
import zlib from 'node:zlib';

// ------------------------------------------------------------------------------------------ Objektsyntax

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set([...'()<>[]{}/%'].map((c) => c.charCodeAt(0)));

export class Ref {
  constructor(num, gen) {
    this.num = num;
    this.gen = gen;
  }
}
export class Name {
  constructor(name) {
    this.name = name;
  }
}
export class Op {
  constructor(op) {
    this.op = op;
  }
}

/** Tokenizer über einen Buffer (Objektsyntax und Inhaltsströme teilen ihn). */
export class Lexer {
  constructor(buf, pos = 0) {
    this.buf = buf;
    this.pos = pos;
  }

  skipWs() {
    const b = this.buf;
    for (;;) {
      while (this.pos < b.length && WS.has(b[this.pos])) this.pos++;
      if (b[this.pos] === 0x25) {
        // Kommentar bis Zeilenende
        while (this.pos < b.length && b[this.pos] !== 0x0a && b[this.pos] !== 0x0d) this.pos++;
        continue;
      }
      return;
    }
  }

  /** Nächster Token: number | string(Buffer) | Name | Op | '[' ']' '<<' '>>' | null am Ende. */
  token() {
    this.skipWs();
    const b = this.buf;
    if (this.pos >= b.length) return null;
    const c = b[this.pos];
    if (c === 0x5b) {
      this.pos++;
      return '[';
    }
    if (c === 0x5d) {
      this.pos++;
      return ']';
    }
    if (c === 0x3c && b[this.pos + 1] === 0x3c) {
      this.pos += 2;
      return '<<';
    }
    if (c === 0x3e && b[this.pos + 1] === 0x3e) {
      this.pos += 2;
      return '>>';
    }
    if (c === 0x7b || c === 0x7d) {
      this.pos++;
      return String.fromCharCode(c);
    }
    if (c === 0x2f) {
      // Name
      let e = this.pos + 1;
      while (e < b.length && !WS.has(b[e]) && !DELIM.has(b[e])) e++;
      const raw = b.toString('latin1', this.pos + 1, e).replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      this.pos = e;
      return new Name(raw);
    }
    if (c === 0x28) return this.literalString();
    if (c === 0x3c) return this.hexString();
    // Zahl oder Operator
    let e = this.pos;
    while (e < b.length && !WS.has(b[e]) && !DELIM.has(b[e])) e++;
    if (e === this.pos) e++; // einzelnes Trennzeichen (sollte nicht vorkommen)
    const word = b.toString('latin1', this.pos, e);
    this.pos = e;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(word)) return Number(word);
    return new Op(word);
  }

  literalString() {
    const b = this.buf;
    let depth = 0;
    const out = [];
    this.pos++; // (
    for (;;) {
      const c = b[this.pos++];
      if (c === undefined) break;
      if (c === 0x5c) {
        const n = b[this.pos++];
        const map = { 0x6e: 0x0a, 0x72: 0x0d, 0x74: 0x09, 0x62: 0x08, 0x66: 0x0c, 0x28: 0x28, 0x29: 0x29, 0x5c: 0x5c };
        if (n in map) out.push(map[n]);
        else if (n >= 0x30 && n <= 0x37) {
          let v = n - 0x30;
          for (let k = 0; k < 2 && b[this.pos] >= 0x30 && b[this.pos] <= 0x37; k++) v = v * 8 + (b[this.pos++] - 0x30);
          out.push(v & 255);
        } else if (n === 0x0d) {
          if (b[this.pos] === 0x0a) this.pos++;
        } else if (n !== 0x0a) out.push(n);
        continue;
      }
      if (c === 0x28) depth++;
      if (c === 0x29) {
        if (depth === 0) break;
        depth--;
      }
      out.push(c);
    }
    return Buffer.from(out);
  }

  hexString() {
    const b = this.buf;
    this.pos++; // <
    let hex = '';
    while (this.pos < b.length && b[this.pos] !== 0x3e) {
      const ch = String.fromCharCode(b[this.pos++]);
      if (/[0-9a-fA-F]/.test(ch)) hex += ch;
    }
    this.pos++; // >
    if (hex.length % 2) hex += '0';
    return Buffer.from(hex, 'hex');
  }

  /** Ein vollständiges Objekt (Dictionary, Array, Referenz …) — für die Objektsyntax. */
  object() {
    const t = this.token();
    return this.finish(t);
  }

  finish(t) {
    if (t === '[') {
      const arr = [];
      for (;;) {
        const u = this.token();
        if (u === ']' || u === null) break;
        arr.push(this.finish(u));
      }
      return this.refs(arr);
    }
    if (t === '<<') {
      const dict = {};
      for (;;) {
        const k = this.token();
        if (k === '>>' || k === null) break;
        if (!(k instanceof Name)) throw new Error(`Dictionary-Schlüssel erwartet, bekam ${String(k)}`);
        const save = this.pos;
        const v = this.token();
        const val = this.finish(v);
        // Referenz "n g R"
        if (typeof val === 'number') {
          const p2 = this.pos;
          const g = this.token();
          const r = this.token();
          if (typeof g === 'number' && r instanceof Op && r.op === 'R') {
            dict[k.name] = new Ref(val, g);
            continue;
          }
          this.pos = p2;
        }
        void save;
        dict[k.name] = val;
      }
      return dict;
    }
    if (t instanceof Op && (t.op === 'true' || t.op === 'false')) return t.op === 'true';
    if (t instanceof Op && t.op === 'null') return null;
    return t;
  }

  /** Arrays: "n g R" zu Ref zusammenfassen. */
  refs(arr) {
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      const g = arr[i + 1];
      const r = arr[i + 2];
      if (typeof a === 'number' && typeof g === 'number' && r instanceof Op && r.op === 'R') {
        out.push(new Ref(a, g));
        i += 2;
      } else out.push(a);
    }
    return out;
  }
}

/** Liest alle "n g obj … endobj" (ohne xref: Illustrator schreibt jedes Objekt einzeln, zuletzt gewinnt). */
export function readPdf(buf) {
  const objects = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  const text = buf.toString('latin1');
  let m;
  while ((m = re.exec(text))) {
    const num = Number(m[1]);
    const lx = new Lexer(buf, m.index + m[0].length);
    const value = lx.object();
    let stream = null;
    lx.skipWs();
    if (buf.toString('latin1', lx.pos, lx.pos + 6) === 'stream') {
      let p = lx.pos + 6;
      if (buf[p] === 0x0d && buf[p + 1] === 0x0a) p += 2;
      else if (buf[p] === 0x0a || buf[p] === 0x0d) p += 1;
      const len = typeof value.Length === 'number' ? value.Length : null;
      if (len === null) throw new Error(`Objekt ${num}: indirekte /Length nicht unterstützt`);
      stream = buf.subarray(p, p + len);
      re.lastIndex = p + len;
    }
    objects.set(num, { value, stream });
  }
  const pdf = {
    objects,
    get(x) {
      return x instanceof Ref ? (objects.get(x.num)?.value ?? null) : x;
    },
    streamOf(x) {
      const o = x instanceof Ref ? objects.get(x.num) : null;
      if (!o?.stream) return null;
      const filter = o.value.Filter;
      const name = filter instanceof Name ? filter.name : Array.isArray(filter) ? filter[0]?.name : null;
      if (name === 'FlateDecode') return zlib.inflateSync(o.stream);
      if (!name) return o.stream;
      throw new Error(`Filter ${name} nicht unterstützt`);
    },
  };
  const trailerAt = text.lastIndexOf('trailer');
  pdf.trailer = new Lexer(buf, trailerAt + 7).object();
  return pdf;
}

/** Seiten in Reihenfolge (Pages-Baum). */
export function pages(pdf) {
  const root = pdf.get(pdf.trailer.Root);
  const out = [];
  const walk = (node) => {
    const n = pdf.get(node);
    if (n.Type?.name === 'Pages') for (const k of n.Kids) walk(k);
    else out.push(n);
  };
  walk(root.Pages);
  return out;
}

// ------------------------------------------------------------------------------------------ Geometrie

export const IDENTITY = [1, 0, 0, 1, 0, 0];
/** m1 · m2 im PDF-Sinn: erst m1, dann m2 (Zeilenvektor · Matrix). */
export function mul(m1, m2) {
  const [a, b, c, d, e, f] = m1;
  const [A, B, C, D, E, F] = m2;
  return [a * A + b * C, a * B + b * D, c * A + d * C, c * B + d * D, e * A + f * C + E, e * B + f * D + F];
}
export function apply(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// ------------------------------------------------------------------------------------------ Funktionen/Farben

/** Wertet eine PDF-Funktion (Typ 2 und 3) aus. */
export function evalFunction(pdf, fn, t) {
  const f = pdf.get(fn);
  const dom = f.Domain ?? [0, 1];
  t = Math.min(dom[1], Math.max(dom[0], t));
  if (f.FunctionType === 2) {
    const n = f.N ?? 1;
    const c0 = f.C0 ?? [0];
    const c1 = f.C1 ?? [1];
    const x = t <= 0 ? 0 : Math.pow(t, n);
    return c0.map((v, i) => v + x * (c1[i] - v));
  }
  if (f.FunctionType === 3) {
    const bounds = f.Bounds ?? [];
    const fns = f.Functions;
    let k = 0;
    while (k < bounds.length && t >= bounds[k]) k++;
    const lo = k === 0 ? dom[0] : bounds[k - 1];
    const hi = k === bounds.length ? dom[1] : bounds[k];
    const e0 = f.Encode[2 * k];
    const e1 = f.Encode[2 * k + 1];
    const u = hi > lo ? e0 + ((t - lo) / (hi - lo)) * (e1 - e0) : e0;
    return evalFunction(pdf, fns[k], u);
  }
  throw new Error(`Funktionstyp ${f.FunctionType} nicht unterstützt`);
}

/**
 * Verlaufsstopps für SVG: exakt an den Segmentgrenzen der Stitching-Funktion, dazwischen bei Exponent ≠ 1
 * so viele Zwischenstopps, dass die Abweichung unter einer halben 8-Bit-Stufe bleibt.
 */
export function gradientStops(pdf, fn) {
  const f = pdf.get(fn);
  const dom = f.Domain ?? [0, 1];
  const cuts = [dom[0], ...(f.FunctionType === 3 ? f.Bounds : []), dom[1]];
  const stops = [];
  const push = (t) => {
    const c = evalFunction(pdf, fn, t);
    const last = stops[stops.length - 1];
    if (last && Math.abs(last.t - t) < 1e-9) return;
    stops.push({ t, c });
  };
  for (let k = 0; k + 1 < cuts.length; k++) {
    const lo = cuts[k];
    const hi = cuts[k + 1];
    const sub = f.FunctionType === 3 ? pdf.get(f.Functions[k]) : f;
    const nonlinear = sub.FunctionType === 2 && (sub.N ?? 1) !== 1;
    const steps = nonlinear ? 12 : 1;
    for (let i = 0; i <= steps; i++) push(lo + ((hi - lo) * i) / steps);
    // Sprung an der Grenze: rechten Grenzwert als eigenen Stopp (gleiche Position) behalten
    if (k + 2 < cuts.length) {
      const right = evalFunction(pdf, fn, hi + 1e-9);
      const left = stops[stops.length - 1].c;
      if (right.some((v, i) => Math.abs(v - left[i]) > 1 / 512)) stops.push({ t: hi, c: right });
    }
  }
  return stops;
}

// ------------------------------------------------------------------------------------------ Interpreter

/**
 * Führt einen Inhaltsstrom aus und liefert die Anzeigeliste. Jedes Element trägt:
 * - kind: 'fill' | 'stroke' | 'shading' | 'group-begin' | 'group-end' | 'text'
 * - path: [{op:'M'|'L'|'C'|'Z', pts:[...]}] im Seitenraum (nach CTM)
 * - clips: Liste von Pfaden (Schnittmenge), rule 'nonzero'|'evenodd'
 * - Farbe (rgb 0..1), alpha, blend, Linienparameter, bei Verläufen die Shading-Definition + Matrix
 */
export function interpret(pdf, contentBuf, resources, opts = {}) {
  const list = [];
  const ocgNames = opts.ocgNames ?? new Map();
  const state0 = {
    ctm: opts.ctm ?? IDENTITY,
    fill: [0, 0, 0],
    stroke: [0, 0, 0],
    ca: 1,
    CA: 1,
    blend: 'Normal',
    lineWidth: 1,
    lineJoin: 0,
    lineCap: 0,
    miter: 10,
    dash: null,
    clips: opts.clips ?? [],
    font: null,
    fontSize: 1,
  };
  run(pdf, contentBuf, resources, state0, list, ocgNames, opts.layer ?? null);
  return list;
}

function run(pdf, buf, resources, st0, list, ocgNames, layer0) {
  const lx = new Lexer(buf);
  const stack = [];
  let st = { ...st0 };
  let path = [];
  let cur = [0, 0];
  let start = [0, 0];
  let pendingClip = null;
  let operands = [];
  const layerStack = [];
  let layer = layer0;
  let tm = IDENTITY;
  let tlm = IDENTITY;
  let leading = 0;

  const res = (kind, name) => {
    const dict = pdf.get(resources?.[kind]);
    return dict ? pdf.get(dict[name]) : null;
  };
  const resRaw = (kind, name) => pdf.get(resources?.[kind])?.[name];
  const P = (x, y) => apply(st.ctm, x, y);

  const paint = (kind, rule) => {
    if (path.length) {
      const item = {
        kind,
        rule,
        path,
        clips: st.clips,
        layer,
        ca: st.ca,
        CA: st.CA,
        blend: st.blend,
      };
      if (kind === 'fill' || kind === 'fillstroke') item.fill = st.fill;
      if (kind === 'stroke' || kind === 'fillstroke') {
        item.stroke = st.stroke;
        // Linienbreite im Seitenraum (gleichförmige Skalierung vorausgesetzt)
        const s = Math.sqrt(Math.abs(st.ctm[0] * st.ctm[3] - st.ctm[1] * st.ctm[2]));
        item.lineWidth = st.lineWidth * s;
        item.lineJoin = st.lineJoin;
        item.lineCap = st.lineCap;
        item.miter = st.miter;
      }
      if (kind !== 'none') list.push(item);
    }
    if (pendingClip) {
      st.clips = [...st.clips, { path: pendingClip.path, rule: pendingClip.rule }];
      pendingClip = null;
    }
    path = [];
  };

  for (;;) {
    const t = lx.token();
    if (t === null) break;
    if (t === '[' || t === '<<') {
      operands.push(lx.finish(t));
      continue;
    }
    if (!(t instanceof Op)) {
      operands.push(t);
      continue;
    }
    const o = operands;
    operands = [];
    switch (t.op) {
      // --- Zustand
      case 'q':
        stack.push(st);
        st = { ...st };
        break;
      case 'Q':
        st = stack.pop() ?? st;
        break;
      case 'cm':
        st.ctm = mul(o, st.ctm);
        break;
      case 'w':
        st.lineWidth = o[0];
        break;
      case 'J':
        st.lineCap = o[0];
        break;
      case 'j':
        st.lineJoin = o[0];
        break;
      case 'M':
        st.miter = o[0];
        break;
      case 'd':
        st.dash = o;
        break;
      case 'gs': {
        const g = res('ExtGState', o[0].name) ?? {};
        if (typeof g.ca === 'number') st.ca = g.ca;
        if (typeof g.CA === 'number') st.CA = g.CA;
        if (g.BM) st.blend = g.BM instanceof Name ? g.BM.name : (g.BM[0]?.name ?? 'Normal');
        if (typeof g.LW === 'number') st.lineWidth = g.LW;
        break;
      }
      // --- Farben (Geräte-RGB/Grau/CMYK, ICCBased mit N=3 wie RGB)
      case 'g':
        st.fill = [o[0], o[0], o[0]];
        break;
      case 'G':
        st.stroke = [o[0], o[0], o[0]];
        break;
      case 'rg':
        st.fill = o.slice(0, 3);
        break;
      case 'RG':
        st.stroke = o.slice(0, 3);
        break;
      case 'k':
        st.fill = cmyk(o);
        break;
      case 'K':
        st.stroke = cmyk(o);
        break;
      case 'cs':
      case 'CS':
        break;
      case 'sc':
      case 'scn':
        if (o.length === 3) st.fill = o.slice(0, 3);
        else if (o.length === 1 && typeof o[0] === 'number') st.fill = [o[0], o[0], o[0]];
        else if (o.length === 4) st.fill = cmyk(o);
        break;
      case 'SC':
      case 'SCN':
        if (o.length === 3) st.stroke = o.slice(0, 3);
        else if (o.length === 1 && typeof o[0] === 'number') st.stroke = [o[0], o[0], o[0]];
        else if (o.length === 4) st.stroke = cmyk(o);
        break;
      // --- Pfadaufbau
      case 'm':
        cur = P(o[0], o[1]);
        start = cur;
        path.push({ op: 'M', pts: [cur] });
        break;
      case 'l':
        cur = P(o[0], o[1]);
        path.push({ op: 'L', pts: [cur] });
        break;
      case 'c':
        path.push({ op: 'C', pts: [P(o[0], o[1]), P(o[2], o[3]), P(o[4], o[5])] });
        cur = P(o[4], o[5]);
        break;
      case 'v':
        path.push({ op: 'C', pts: [cur, P(o[0], o[1]), P(o[2], o[3])] });
        cur = P(o[2], o[3]);
        break;
      case 'y':
        path.push({ op: 'C', pts: [P(o[0], o[1]), P(o[2], o[3]), P(o[2], o[3])] });
        cur = P(o[2], o[3]);
        break;
      case 'h':
        path.push({ op: 'Z', pts: [] });
        cur = start;
        break;
      case 're': {
        const [x, y, w, h] = o;
        path.push({ op: 'M', pts: [P(x, y)] }, { op: 'L', pts: [P(x + w, y)] }, { op: 'L', pts: [P(x + w, y + h)] }, { op: 'L', pts: [P(x, y + h)] }, { op: 'Z', pts: [] });
        cur = P(x, y);
        start = cur;
        break;
      }
      // --- Malen
      case 'W':
        pendingClip = { path, rule: 'nonzero' };
        break;
      case 'W*':
        pendingClip = { path, rule: 'evenodd' };
        break;
      case 'n':
        paint('none');
        break;
      case 'f':
      case 'F':
        paint('fill', 'nonzero');
        break;
      case 'f*':
        paint('fill', 'evenodd');
        break;
      case 'S':
        paint('stroke', 'nonzero');
        break;
      case 's':
        path.push({ op: 'Z', pts: [] });
        paint('stroke', 'nonzero');
        break;
      case 'B':
        paint('fillstroke', 'nonzero');
        break;
      case 'B*':
        paint('fillstroke', 'evenodd');
        break;
      case 'b':
        path.push({ op: 'Z', pts: [] });
        paint('fillstroke', 'nonzero');
        break;
      case 'b*':
        path.push({ op: 'Z', pts: [] });
        paint('fillstroke', 'evenodd');
        break;
      case 'sh': {
        const sh = res('Shading', o[0].name);
        list.push({ kind: 'shading', shading: sh, shadingRef: resRaw('Shading', o[0].name), matrix: st.ctm, clips: st.clips, layer, ca: st.ca, blend: st.blend });
        break;
      }
      case 'Do': {
        const ref = resRaw('XObject', o[0].name);
        const xo = pdf.get(ref);
        if (xo?.Subtype?.name !== 'Form') break;
        const m = xo.Matrix ?? IDENTITY;
        const inner = { ...st, ctm: mul(m, st.ctm) };
        // BBox als Clip (im Formraum)
        if (xo.BBox) {
          const [x0, y0, x1, y1] = xo.BBox;
          const bb = [
            { op: 'M', pts: [apply(inner.ctm, x0, y0)] },
            { op: 'L', pts: [apply(inner.ctm, x1, y0)] },
            { op: 'L', pts: [apply(inner.ctm, x1, y1)] },
            { op: 'L', pts: [apply(inner.ctm, x0, y1)] },
            { op: 'Z', pts: [] },
          ];
          inner.clips = [...st.clips, { path: bb, rule: 'nonzero' }];
        }
        const group = xo.Group ? pdf.get(xo.Group) : null;
        list.push({ kind: 'group-begin', ref: ref?.num, isGroup: !!group, ca: st.ca, blend: st.blend, layer, clips: st.clips });
        // In einer Transparenzgruppe wirken Alpha und Mischmodus auf die Gruppe als Ganzes.
        if (group) {
          inner.ca = 1;
          inner.CA = 1;
          inner.blend = 'Normal';
        }
        run(pdf, pdf.streamOf(ref), xo.Resources ?? resources, inner, list, ocgNames, layer);
        list.push({ kind: 'group-end', ref: ref?.num });
        break;
      }
      // --- optionaler Inhalt (Ebenen)
      case 'BDC': {
        layerStack.push(layer);
        if (o[0] instanceof Name && o[0].name === 'OC' && o[1] instanceof Name) {
          const prop = pdf.get(pdf.get(resources?.Properties)?.[o[1].name]);
          const nm = prop?.Name;
          layer = nm ? Buffer.isBuffer(nm) ? nm.toString('latin1') : String(nm) : layer;
        }
        break;
      }
      case 'BMC':
        layerStack.push(layer);
        break;
      case 'EMC':
        layer = layerStack.pop() ?? null;
        break;
      // --- Text
      case 'BT':
        tm = IDENTITY;
        tlm = IDENTITY;
        break;
      case 'ET':
        break;
      case 'Tf':
        st.font = o[0].name;
        st.fontSize = o[1];
        break;
      case 'TL':
        leading = o[0];
        break;
      case 'Tm':
        tm = o.slice(0, 6);
        tlm = tm;
        break;
      case 'Td':
        tlm = mul([1, 0, 0, 1, o[0], o[1]], tlm);
        tm = tlm;
        break;
      case 'TD':
        leading = -o[1];
        tlm = mul([1, 0, 0, 1, o[0], o[1]], tlm);
        tm = tlm;
        break;
      case 'T*':
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm);
        tm = tlm;
        break;
      case 'Tj':
      case 'TJ':
      case "'":
      case '"': {
        const font = res('Font', st.font);
        const parts = t.op === 'TJ' ? o[0] : [o[o.length - 1]];
        const widths = font?.Widths ?? [];
        const first = font?.FirstChar ?? 0;
        for (const p of parts) {
          if (typeof p === 'number') {
            tm = mul([1, 0, 0, 1, (-p / 1000) * st.fontSize, 0], tm);
            continue;
          }
          for (const code of p) {
            const trm = mul([st.fontSize, 0, 0, st.fontSize, 0, 0], mul(tm, st.ctm));
            const w = widths[code - first] ?? 0;
            list.push({ kind: 'text', code, char: String.fromCharCode(code), font: font?.BaseFont?.name ?? st.font, size: st.fontSize, matrix: trm, advance: (w / 1000) * st.fontSize, fill: st.fill, ca: st.ca, layer, clips: st.clips });
            tm = mul([1, 0, 0, 1, (w / 1000) * st.fontSize, 0], tm);
          }
        }
        break;
      }
      case 'Tc':
      case 'Tw':
      case 'Tz':
      case 'Ts':
      case 'Tr':
      case 'ri':
      case 'i':
      case 'BX':
      case 'EX':
      case 'MP':
      case 'DP':
      case 'd0':
      case 'd1':
        break;
      default:
        // Unbekannte Operatoren still überspringen (Kompatibilitätsbereich)
        break;
    }
  }
  void ocgNames;
}

function cmyk([c, m, y, k]) {
  return [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)];
}
