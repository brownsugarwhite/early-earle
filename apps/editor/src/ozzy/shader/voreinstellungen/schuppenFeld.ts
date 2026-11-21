/**
 * Schuppenfeld (Runde 8; Florian: Schlangen „sollen viel besser und echter aussehen“). Echte Schlangenschuppen liegen in
 * regelmäßigen schrägen Reihen. Zellen im Raum geben keine Reihen (sie wirkten wie Kiesel), Zylinderkoordinaten um die Körperachse
 * entarten auf Flossen und Ohren. Darum werden auf dem Netz zwei Phasen gelöst (einmal je Netzstand, auf dem Prozessor):
 * - **U** (längs): ihr Gefälle soll der Strichrichtung S folgen (längs der Körperachse in der Fläche), Abstand eine Schuppenlänge.
 *   Ein Ausgleich nach kleinsten Quadraten über alle Kanten (Poisson, konjugierte Gradienten).
 * - **W** (quer): ihr Gefälle soll T = n × S folgen. Um den Körper herum geht das nur mit einer ganzzahligen Windung: W = N·θ + χ,
 *   θ der Winkel um die Körperachse (Naht am Bauch, dort liegen ohnehin die Bauchschilde), χ ein Ausgleich wie bei U. Auf Flossen
 *   trägt χ die ganze Querphase, an den Enden der Achse laufen die Reihen zusammen (wie an Kopf und Schwanz).
 * - Je Ecke (cos U, sin U, cos W, sin W) in einer Textur; ein Durchgang zeichnet das Netz damit, der Shader liest die Phasen je
 *   Bildpunkt. Gitter: a = (U + W)/2π, b = (U − W)/2π, je Zelle eine Schuppe (eine Raute, Diagonalen längs und quer).
 * Merke: Die Anzeige kann an der Spiegelebene doppelte Ecken haben; sie werden nach Lage verschweißt, sonst entstünde dort eine Naht.
 */
import { DataTexture, FloatType, NearestFilter, type RawShaderMaterial, RGBAFormat, type Texture } from 'three';
import type { ShaderKern } from '../kern';

const BREITE = 1024;

const VERTEX = /* glsl */ `
precision highp float;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform sampler2D tFeld;
in vec3 position;
out vec4 vPhase;
void main() {
  vPhase = texelFetch(tFeld, ivec2(gl_VertexID % ${BREITE}, gl_VertexID / ${BREITE}), 0);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;
const FRAGMENT = /* glsl */ `
precision highp float;
in vec4 vPhase;
out vec4 farbe;
void main() { farbe = vPhase; }
`;

type Graph = { n: number; start: Int32Array; nb: Int32Array };

/** Ecken nach Lage verschweißen: je Ecke ihr Vertreter (0 … m-1) */
function verschweissen(pos: ArrayLike<number>, n: number, eps: number): { rep: Int32Array; m: number } {
  const rep = new Int32Array(n);
  const map = new Map<number, number>();
  let m = 0;
  const o = 65536;
  for (let i = 0; i < n; i++) {
    const k = ((Math.round(pos[i * 3]! / eps) + o) * 131072 + Math.round(pos[i * 3 + 1]! / eps) + o) * 131072 + Math.round(pos[i * 3 + 2]! / eps) + o;
    const v = map.get(k);
    if (v === undefined) {
      map.set(k, m);
      rep[i] = m++;
    } else rep[i] = v;
  }
  return { rep, m };
}

/** Nachbarn je (verschweißter) Ecke aus den Dreiecken, ohne Doppelte */
function graphBauen(m: number, idx: ArrayLike<number>, rep: Int32Array): Graph {
  const deg = new Int32Array(m);
  for (let t = 0; t < idx.length; t += 3) {
    deg[rep[idx[t]!]!]! += 2;
    deg[rep[idx[t + 1]!]!]! += 2;
    deg[rep[idx[t + 2]!]!]! += 2;
  }
  const start = new Int32Array(m + 1);
  for (let i = 0; i < m; i++) start[i + 1] = start[i]! + deg[i]!;
  const roh = new Int32Array(start[m]!);
  const fill = start.slice(0, m);
  const dazu = (a: number, b: number) => {
    if (a !== b) roh[fill[a]!++] = b;
  };
  for (let t = 0; t < idx.length; t += 3) {
    const a = rep[idx[t]!]!;
    const b = rep[idx[t + 1]!]!;
    const c = rep[idx[t + 2]!]!;
    dazu(a, b);
    dazu(a, c);
    dazu(b, a);
    dazu(b, c);
    dazu(c, a);
    dazu(c, b);
  }
  const nb = new Int32Array(start[m]!);
  const s2 = new Int32Array(m + 1);
  let w = 0;
  for (let i = 0; i < m; i++) {
    s2[i] = w;
    const seg = roh.subarray(start[i]!, fill[i]!).sort();
    let last = -1;
    for (let k = 0; k < seg.length; k++) {
      const v = seg[k]!;
      if (v !== last) {
        nb[w++] = v;
        last = v;
      }
    }
  }
  s2[m] = w;
  return { n: m, start: s2, nb: nb.subarray(0, w) };
}

/** L x = b mit dem Graph-Laplace (plus ein Hauch auf der Diagonale), Jacobi-vorkonditionierte konjugierte Gradienten */
function loesen(g: Graph, b: Float64Array, iter: number, x0?: Float64Array): Float64Array {
  const n = g.n;
  const x = x0 ? Float64Array.from(x0) : new Float64Array(n);
  const r = Float64Array.from(b);
  if (x0) {
    for (let i = 0; i < n; i++) {
      let s = (g.start[i + 1]! - g.start[i]! + 1e-6) * x[i]!;
      for (let k = g.start[i]!; k < g.start[i + 1]!; k++) s -= x[g.nb[k]!]!;
      r[i]! -= s;
    }
  }
  const z = new Float64Array(n);
  const p = new Float64Array(n);
  const q = new Float64Array(n);
  const diag = new Float64Array(n);
  for (let i = 0; i < n; i++) diag[i] = g.start[i + 1]! - g.start[i]! + 1e-6;
  for (let i = 0; i < n; i++) z[i] = r[i]! / diag[i]!;
  p.set(z);
  let rz = 0;
  for (let i = 0; i < n; i++) rz += r[i]! * z[i]!;
  const b2 = Math.max(rz, 1e-30);
  for (let it = 0; it < iter; it++) {
    for (let i = 0; i < n; i++) {
      let s = diag[i]! * p[i]!;
      for (let k = g.start[i]!; k < g.start[i + 1]!; k++) s -= p[g.nb[k]!]!;
      q[i] = s;
    }
    let pq = 0;
    for (let i = 0; i < n; i++) pq += p[i]! * q[i]!;
    const al = rz / Math.max(pq, 1e-30);
    let rzNeu = 0;
    for (let i = 0; i < n; i++) {
      x[i]! += al * p[i]!;
      r[i]! -= al * q[i]!;
      z[i] = r[i]! / diag[i]!;
      rzNeu += r[i]! * z[i]!;
    }
    if (rzNeu < b2 * 1e-10) break;
    const be = rzNeu / rz;
    rz = rzNeu;
    for (let i = 0; i < n; i++) p[i] = z[i]! + be * p[i]!;
  }
  return x;
}

export type FeldWunsch = {
  /** Schuppenlänge längs und Breite quer, Anteil vom Radius der Form */
  laenge: number;
  breite: number;
};

/** das Feld einer Form: Phasen je Ecke, ein Durchgang, der sie ins Bild zeichnet */
export class SchuppenFeld {
  private schluessel = '';
  private tex: DataTexture | null = null;
  private readonly mat: RawShaderMaterial;
  /** Dauer der letzten Rechnung (ms), zum Messen */
  ms = 0;
  constructor(k: ShaderKern) {
    this.mat = k.netzProgramm(FRAGMENT, { vertex: VERTEX, uniforms: { tFeld: { value: null } } });
  }

  /** Phasen neu rechnen, wenn sich Netz oder Wunsch geändert haben; dann ins Bild zeichnen */
  bild(k: ShaderKern, w: FeldWunsch): Texture | null {
    const g = k.geo;
    const pa = g.getAttribute('position');
    const na = g.getAttribute('normal');
    if (!pa || !na || !g.index) return null;
    const n = pa.count;
    const schluessel = `${k.netzStand}|${n}|${w.laenge.toFixed(4)}|${w.breite.toFixed(4)}`;
    if (schluessel !== this.schluessel) {
      const t0 = performance.now();
      this.rechnen(k, pa.array as ArrayLike<number>, na.array as ArrayLike<number>, g.index.array as ArrayLike<number>, n, w);
      this.ms = performance.now() - t0;
      this.schluessel = schluessel;
    }
    this.mat.uniforms.tFeld!.value = this.tex;
    const z = k.ziel('schuppen:phasen', { art: 'half', tiefe: true });
    k.netz(this.mat, z, [1, 0, 1, 0]);
    return z.texture;
  }

  private rechnen(k: ShaderKern, pos: ArrayLike<number>, nor: ArrayLike<number>, idx: ArrayLike<number>, n: number, w: FeldWunsch): void {
    const M = k.u.uMitte.value;
    const R = k.u.uRadius.value;
    const H = k.u.uHalb.value;
    // Achsen wie im Shader (achsen in tiere.ts): A längs (in der Seitenebene), B oben, C quer (Normale der Spiegelebene)
    const mx = Math.max(H.x, H.y, 1e-6);
    const ax = (H.x / mx) ** 4;
    const ay = (H.y / mx) ** 4;
    let A = [ax + 1e-3, ay, 0];
    const la = Math.hypot(A[0]!, A[1]!);
    A = [A[0]! / la, A[1]! / la, 0];
    const B = [-A[1]!, A[0]!, 0];
    const C = [0, 0, 1];
    const { rep, m } = verschweissen(pos, n, R * 4e-5);
    const gr = graphBauen(m, idx, rep);
    // je Vertreter: Lage, Normale (gemittelt), S und T, Winkel um die Achse
    const P = new Float64Array(m * 3);
    const Nn = new Float64Array(m * 3);
    const zahl = new Float64Array(m);
    for (let i = 0; i < n; i++) {
      const r = rep[i]!;
      for (let c = 0; c < 3; c++) {
        P[r * 3 + c] = pos[i * 3 + c]!;
        Nn[r * 3 + c]! += nor[i * 3 + c]!;
      }
      zahl[r]! += 1;
    }
    const S = new Float64Array(m * 3);
    const T = new Float64Array(m * 3);
    const th = new Float64Array(m);
    const radien: number[] = [];
    // Strich wie im Shader: nach hinten (gegen A) und ein wenig nach unten
    const s0 = [-A[0]!, -A[1]! - 0.25, -A[2]!];
    for (let i = 0; i < m; i++) {
      let nx = Nn[i * 3]!;
      let ny = Nn[i * 3 + 1]!;
      let nz = Nn[i * 3 + 2]!;
      const ln = Math.hypot(nx, ny, nz) || 1;
      nx /= ln;
      ny /= ln;
      nz /= ln;
      Nn[i * 3] = nx;
      Nn[i * 3 + 1] = ny;
      Nn[i * 3 + 2] = nz;
      const d = s0[0]! * nx + s0[1]! * ny + s0[2]! * nz;
      let sx = s0[0]! - nx * d;
      let sy = s0[1]! - ny * d;
      let sz = s0[2]! - nz * d;
      let ls = Math.hypot(sx, sy, sz);
      if (ls < 1e-4) {
        // die Normale steht längs der Achse: irgendeine Richtung in der Fläche
        sx = ny * C[2]! - nz * C[1]!;
        sy = nz * C[0]! - nx * C[2]!;
        sz = nx * C[1]! - ny * C[0]!;
        ls = Math.hypot(sx, sy, sz) || 1;
      }
      sx /= ls;
      sy /= ls;
      sz /= ls;
      S[i * 3] = sx;
      S[i * 3 + 1] = sy;
      S[i * 3 + 2] = sz;
      T[i * 3] = ny * sz - nz * sy;
      T[i * 3 + 1] = nz * sx - nx * sz;
      T[i * 3 + 2] = nx * sy - ny * sx;
      const dx = P[i * 3]! - M.x;
      const dy = P[i * 3 + 1]! - M.y;
      const dz = P[i * 3 + 2]! - M.z;
      const u = dx * A[0]! + dy * A[1]! + dz * A[2]!;
      const bx = dx - A[0]! * u;
      const by = dy - A[1]! * u;
      const bz = dz - A[2]! * u;
      th[i] = Math.atan2(bx * C[0]! + by * C[1]! + bz * C[2]!, bx * B[0]! + by * B[1]! + bz * B[2]!);
      if (i % 7 === 0) radien.push(Math.hypot(bx, by, bz));
    }
    radien.sort((a, b) => a - b);
    const rMittel = radien[Math.floor(radien.length * 0.6)] ?? R * 0.5;
    const LS = w.laenge * R;
    const LT = w.breite * R;
    const wU = (2 * Math.PI) / LS;
    const wW = (2 * Math.PI) / LT;
    // Windung um den Körper: so viele Schuppen, wie um den typischen Umfang passen
    const N = Math.max(3, Math.round((2 * Math.PI * rMittel) / LT));
    const bU = new Float64Array(m);
    const bW = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      for (let k2 = gr.start[i]!; k2 < gr.start[i + 1]!; k2++) {
        const j = gr.nb[k2]!;
        const ex = P[j * 3]! - P[i * 3]!;
        const ey = P[j * 3 + 1]! - P[i * 3 + 1]!;
        const ez = P[j * 3 + 2]! - P[i * 3 + 2]!;
        const rU = wU * 0.5 * (ex * (S[i * 3]! + S[j * 3]!) + ey * (S[i * 3 + 1]! + S[j * 3 + 1]!) + ez * (S[i * 3 + 2]! + S[j * 3 + 2]!));
        let dth = th[j]! - th[i]!;
        if (dth > Math.PI) dth -= 2 * Math.PI;
        if (dth < -Math.PI) dth += 2 * Math.PI;
        const rW = wW * 0.5 * (ex * (T[i * 3]! + T[j * 3]!) + ey * (T[i * 3 + 1]! + T[j * 3 + 1]!) + ez * (T[i * 3 + 2]! + T[j * 3 + 2]!)) - N * dth;
        bU[i]! -= rU;
        bW[i]! -= rW;
      }
    }
    const sl = Math.hypot(s0[0]!, s0[1]!, s0[2]!);
    const U0 = new Float64Array(m);
    for (let i = 0; i < m; i++) U0[i] = (wU * ((P[i * 3]! - M.x) * s0[0]! + (P[i * 3 + 1]! - M.y) * s0[1]! + (P[i * 3 + 2]! - M.z) * s0[2]!)) / sl;
    const U = loesen(gr, bU, 160, U0);
    const X = loesen(gr, bW, 160);
    const hoehe = Math.max(1, Math.ceil(n / BREITE));
    const daten = new Float32Array(BREITE * hoehe * 4);
    for (let i = 0; i < n; i++) {
      const r = rep[i]!;
      const u = U[r]!;
      const ww = N * th[r]! + X[r]!;
      daten[i * 4] = Math.cos(u);
      daten[i * 4 + 1] = Math.sin(u);
      daten[i * 4 + 2] = Math.cos(ww);
      daten[i * 4 + 3] = Math.sin(ww);
    }
    if (!this.tex || this.tex.image.height !== hoehe) {
      this.tex?.dispose();
      this.tex = new DataTexture(daten, BREITE, hoehe, RGBAFormat, FloatType);
      this.tex.minFilter = NearestFilter;
      this.tex.magFilter = NearestFilter;
    } else (this.tex.image as { data: Float32Array }).data = daten;
    this.tex.needsUpdate = true;
  }

  freigeben(): void {
    this.mat.dispose();
    this.tex?.dispose();
  }
}

/** je Kern ein Feld (die Schlangen teilen es) */
const felder = new WeakMap<ShaderKern, SchuppenFeld>();
export function schuppenFeld(k: ShaderKern): SchuppenFeld {
  let f = felder.get(k);
  if (!f) {
    f = new SchuppenFeld(k);
    felder.set(k, f);
  }
  return f;
}
