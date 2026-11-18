/* eslint-disable */
// Gegenprüfung „Lineare Algebra“, Messung 6: dieselben C-Kerne (kern.c) als WebAssembly in Node (V8), gegen dieselben Daten.
// Ohne Linker: Die Objektdatei von clang (--target=wasm32) ist schon ein Modul, ihr fehlen nur die Exporte — sie werden hier aus der
// Symboltabelle („linking“) als Export-Abschnitt eingefügt. Aufruf: node a6-wasm.mjs kern.wasm.o matrix-<n>.bin [...]
import { readFileSync } from 'node:fs';

const [, , objekt, ...dateien] = process.argv;
const roh = new Uint8Array(readFileSync(objekt));

function leb(b, o) {
  let x = 0;
  let s = 0;
  for (;;) {
    const c = b[o++];
    x |= (c & 0x7f) << s;
    s += 7;
    if (!(c & 0x80)) break;
  }
  return [x >>> 0, o];
}
const lebSchreiben = (x) => {
  const out = [];
  do {
    let c = x & 0x7f;
    x >>>= 7;
    if (x) c |= 0x80;
    out.push(c);
  } while (x);
  return out;
};
// Abschnitte lesen
const abschnitte = [];
let o = 8;
while (o < roh.length) {
  const id = roh[o];
  const [len, o2] = leb(roh, o + 1);
  abschnitte.push({ id, start: o, inhalt: o2, ende: o2 + len });
  o = o2 + len;
}
// Symboltabelle: Name → Funktionsindex
const funktionen = new Map();
for (const a of abschnitte) {
  if (a.id !== 0) continue;
  let [nl, p] = leb(roh, a.inhalt);
  const name = new TextDecoder().decode(roh.subarray(p, p + nl));
  p += nl;
  if (name !== 'linking') continue;
  let version;
  [version, p] = leb(roh, p);
  while (p < a.ende) {
    const typ = roh[p++];
    let l;
    [l, p] = leb(roh, p);
    const ende = p + l;
    if (typ === 8) {
      let anzahl;
      [anzahl, p] = leb(roh, p);
      for (let k = 0; k < anzahl; k++) {
        const art = roh[p++];
        let flags;
        [flags, p] = leb(roh, p);
        if (art === 0 || art === 2 || art === 4 || art === 5) {
          let index;
          [index, p] = leb(roh, p);
          if (!(flags & 0x10) || flags & 0x40) {
            let n2;
            [n2, p] = leb(roh, p);
            const nm = new TextDecoder().decode(roh.subarray(p, p + n2));
            p += n2;
            if (art === 0 && !(flags & 0x10)) funktionen.set(nm, index);
          }
        } else if (art === 1) {
          let n2;
          [n2, p] = leb(roh, p);
          p += n2;
          if (!(flags & 0x10)) {
            [, p] = leb(roh, p);
            [, p] = leb(roh, p);
            [, p] = leb(roh, p);
          }
        } else if (art === 3) {
          [, p] = leb(roh, p);
        }
      }
    }
    p = ende;
  }
}
const namen = ['chol', 'loesen_k', 'loesen3', 'loesen_super'];
const exp = [namen.length];
for (const nm of namen) {
  if (!funktionen.has(nm)) throw new Error(`Symbol ${nm} fehlt`);
  const b = new TextEncoder().encode(nm);
  exp.push(...lebSchreiben(b.length), ...b, 0, ...lebSchreiben(funktionen.get(nm)));
}
const expAbschnitt = Uint8Array.from([7, ...lebSchreiben(exp.length), ...exp]);
// vor dem ersten Abschnitt einfügen, der nach den Exporten kommen muss (Start 8, Elemente 9, Datenzahl 12, Code 10, Daten 11)
const vor = abschnitte.find((a) => [8, 9, 12, 10, 11].includes(a.id));
const modulBytes = new Uint8Array(roh.length + expAbschnitt.length);
modulBytes.set(roh.subarray(0, vor.start), 0);
modulBytes.set(expAbschnitt, vor.start);
modulBytes.set(roh.subarray(vor.start), vor.start + expAbschnitt.length);
const modul = new WebAssembly.Module(modulBytes);
const importe = WebAssembly.Module.imports(modul);
const speicher = new WebAssembly.Memory({ initial: 4096 });
const env = {};
for (const im of importe) {
  if (im.kind === 'memory') env[im.name] = speicher;
  else if (im.kind === 'global') env[im.name] = new WebAssembly.Global({ value: 'i32', mutable: true }, 65536 * 16);
  else if (im.kind === 'table') env[im.name] = new WebAssembly.Table({ initial: 0, element: 'anyfunc' });
  else throw new Error(`unerwarteter Import ${im.kind} ${im.name}`);
}
const inst = new WebAssembly.Instance(modul, { env });
const X = inst.exports;
console.log(`WebAssembly-Modul aus ${objekt}: Importe ${importe.map((i) => `${i.kind} ${i.name}`).join(', ')}; Funktionen ${namen.map((n) => `${n}=${funktionen.get(n)}`).join(', ')}`);

const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
for (const datei of dateien) {
  const buf = readFileSync(datei);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const kopf = new Int32Array(ab, 0, 6);
  const [n, nnzC, nnzL, nS, nW, nZ] = kopf;
  // Stapel bis 1 MB, Daten ab 2 MB
  let frei = 2 << 20;
  const platz = (bytes) => {
    const p = frei;
    frei += bytes + ((8 - (bytes % 8)) % 8);
    if (frei > speicher.buffer.byteLength) speicher.grow(Math.ceil((frei - speicher.buffer.byteLength) / 65536) + 16);
    return p;
  };
  let q = 24;
  const teil = (bytesJe, anz) => {
    const bytes = bytesJe * anz;
    const p = platz(bytes);
    new Uint8Array(speicher.buffer, p, bytes).set(new Uint8Array(ab, q, bytes));
    q += bytes + ((8 - (bytes % 8)) % 8);
    return p;
  };
  const Cp = teil(4, n + 1);
  const Ci = teil(4, nnzC);
  const Cx = teil(8, nnzC);
  const Lp = teil(4, n + 1);
  const Li = teil(4, nnzL);
  const Lx = teil(8, nnzL);
  const perm = teil(4, n);
  const rhs = teil(8, 3 * n);
  const j0 = teil(4, nS);
  const s = teil(4, nS);
  const r = teil(4, nS);
  const oD = teil(4, nS);
  const oR = teil(4, nS);
  const oZ = teil(4, nS);
  const zeilen = teil(4, nZ);
  const werte = teil(8, nW);
  const x0p = teil(8, 3 * n);
  const Lp2 = platz(4 * (n + 1));
  const Li2 = platz(4 * nnzL);
  const Lx2 = platz(8 * nnzL);
  const w = platz(4 * 7 * n);
  const x = platz(8 * n);
  const B = platz(8 * 3 * n);
  const b0 = platz(8 * n);
  const b1 = platz(8 * n);
  const b2 = platz(8 * n);
  const y = platz(8 * 3 * 64);
  const out = new Float64Array(3 * n);
  const F = () => new Float64Array(speicher.buffer);
  const I = () => new Int32Array(speicher.buffer);
  console.log(`\n## ${n} Punkte, nnz(L) ${nnzL} (WebAssembly in Node ${process.version})`);
  console.log('| Kern | Median ms | Minimum ms | Unterschied zu JavaScript |\n| --- | --- | --- | --- |');
  // Zerlegen
  const tz = [];
  for (let k = 0; k < 9; k++) {
    const a = performance.now();
    const e = X.chol(n, Cp, Ci, Cx, Lp2, Li2, Lx2, w, w + 4 * n, w + 8 * n, w + 12 * n, w + 16 * n, w + 20 * n, w + 24 * n, x);
    tz.push(performance.now() - a);
    if (e !== nnzL) console.log(`chol: ${e} statt ${nnzL}`);
  }
  let dl = 0;
  {
    const f = F();
    for (let p = 0; p < nnzL; p++) dl = Math.max(dl, Math.abs(f[Lx2 / 8 + p] - f[Lx / 8 + p]));
  }
  console.log(`| Zerlegen (Baum + Muster + Werte) | ${median(tz).toFixed(2)} | ${Math.min(...tz).toFixed(2)} | ${dl.toExponential(1)} |`);
  const tk = [];
  const t3 = [];
  const ts = [];
  const abw = [0, 0, 0];
  for (let rep = 0; rep < 60; rep++) {
    let f = F();
    let i = I();
    let a = performance.now();
    for (let j = 0; j < n; j++) {
      const v = i[perm / 4 + j];
      f[B / 8 + 3 * j] = f[rhs / 8 + 3 * v];
      f[B / 8 + 3 * j + 1] = f[rhs / 8 + 3 * v + 1];
      f[B / 8 + 3 * j + 2] = f[rhs / 8 + 3 * v + 2];
    }
    X.loesen_k(n, Lp, Li, Lx, B, 3);
    for (let j = 0; j < n; j++) {
      const v = i[perm / 4 + j];
      out[3 * v] = f[B / 8 + 3 * j];
      out[3 * v + 1] = f[B / 8 + 3 * j + 1];
      out[3 * v + 2] = f[B / 8 + 3 * j + 2];
    }
    tk.push(performance.now() - a);
    if (rep === 0) for (let k = 0; k < 3 * n; k++) abw[0] = Math.max(abw[0], Math.abs(out[k] - f[x0p / 8 + k]));
    for (const [art, t, nr] of [
      ['3', t3, 1],
      ['s', ts, 2],
    ]) {
      a = performance.now();
      for (let j = 0; j < n; j++) {
        const v = i[perm / 4 + j];
        f[b0 / 8 + j] = f[rhs / 8 + 3 * v];
        f[b1 / 8 + j] = f[rhs / 8 + 3 * v + 1];
        f[b2 / 8 + j] = f[rhs / 8 + 3 * v + 2];
      }
      if (art === '3') X.loesen3(n, Lp, Li, Lx, b0, b1, b2);
      else X.loesen_super(nS, j0, s, r, oD, oR, oZ, zeilen, werte, b0, b1, b2, y);
      for (let j = 0; j < n; j++) {
        const v = i[perm / 4 + j];
        out[3 * v] = f[b0 / 8 + j];
        out[3 * v + 1] = f[b1 / 8 + j];
        out[3 * v + 2] = f[b2 / 8 + j];
      }
      t.push(performance.now() - a);
      if (rep === 0) for (let k = 0; k < 3 * n; k++) abw[nr] = Math.max(abw[nr], Math.abs(out[k] - f[x0p / 8 + k]));
    }
  }
  console.log(`| Lösen 3 Spalten, wie der Code heute (Schleife über c) | ${median(tk).toFixed(2)} | ${Math.min(...tk).toFixed(2)} | ${abw[0].toExponential(1)} |`);
  console.log(`| Lösen 3 Spalten, ausgeschrieben, getrennte Felder | ${median(t3).toFixed(2)} | ${Math.min(...t3).toFixed(2)} | ${abw[1].toExponential(1)} |`);
  console.log(`| Lösen 3 Spalten, Superknoten | ${median(ts).toFixed(2)} | ${Math.min(...ts).toFixed(2)} | ${abw[2].toExponential(1)} |`);
}
