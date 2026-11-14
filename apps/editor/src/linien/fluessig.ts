/**
 * Flüssige Anzeige der Probe „Linien, Punkte, Zeiger“ (WebGL2).
 *
 * Alles, was gezeichnet wird, ist eine Kapsel mit zwei Radien (ein Stück Linie mit Anfangs- und Endbreite, ein Punkt, ein Tropfen,
 * ein Hals). Jeder Bildpunkt rechnet den Abstand zu den Kapseln in seiner Nähe. Linien vereinigen sich hart (Kreuzungen bleiben
 * scharf, wie gezeichnet); Punkte, Tropfen und Hälse vereinigen sich weich mit allem, nahe am Zeiger und an Tropfen sichtbar: ein
 * Tropfen fließt mit seinem Hals in die Linie. Damit nicht jeder Bildpunkt alle Kapseln rechnet, werden sie auf Kacheln verteilt.
 *
 * Kanten bleiben auch bei Haarlinien richtig: Eine Linie, schmaler als ein Bildpunkt, deckt so viel, wie sie breit ist (Kastenfilter).
 * Ausgabe mit Alpha (vormultipliziert), darunter kann der Entwurf liegen.
 */

const KACHEL = 32;
const PRIM_BREITE = 2048;
const LISTE_BREITE = 2048;
/** Floats je Kapsel: x0, y0, x1, y1, r0, r1, Gruppe, Schicht + 2 · Art (Art 0 Linie, 1 Punkt/Tropfen/Hals; Gerätepunkte) */
export const PRIM_FELDER = 8;

export interface Szene {
  prim: Float32Array;
  anzahl: number;
  /** weich verschmelzen: k = k0 + k1 · Feld (Gerätepunkte) */
  k0: number;
  k1: number;
  /** Felder der Weichheit: je vier Werte x, y, Radius, Stärke (Gerätepunkte), höchstens 8 */
  felder: number[];
  tinte: [number, number, number];
  gruen: [number, number, number];
  /** Zeiger: Spitze und zwei weitere Ecken (Gerätepunkte), Linienbreite; null = keiner */
  zeiger: { ax: number; ay: number; bx: number; by: number; cx: number; cy: number; linie: number } | null;
}

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;
uniform sampler2D uPrim;
uniform usampler2D uKachel;
uniform usampler2D uListe;
uniform float uHoehe;
uniform float uK0;
uniform float uK1;
uniform int uFelder;
uniform vec4 uFeld[8];
uniform vec3 uTinte;
uniform vec3 uGruen;
uniform int uZeigerDa;
uniform vec2 uZA;
uniform vec2 uZB;
uniform vec2 uZC;
uniform float uZLinie;
out vec4 aus;

const int PB = ${PRIM_BREITE};
const int LB = ${LISTE_BREITE};
const int KG = ${KACHEL};

// Kapsel mit zwei Radien (iq), a mit ra, b mit rb
float kapsel(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 ba = b - a;
  float h = length(ba);
  if (h < 1e-4) return length(p - a) - max(ra, rb);
  vec2 d = ba / h;
  vec2 q = p - a;
  vec2 r = vec2(abs(dot(q, vec2(-d.y, d.x))), dot(q, d));
  float bb = (ra - rb) / h;
  if (abs(bb) >= 1.0) return min(length(q) - ra, length(p - b) - rb);
  float aa = sqrt(1.0 - bb * bb);
  float k = dot(r, vec2(-bb, aa));
  if (k < 0.0) return length(r) - ra;
  if (k > aa * h) return length(r - vec2(0.0, h)) - rb;
  return dot(r, vec2(aa, bb)) - ra;
}

float smin(float a, float b, float k) {
  if (k < 1e-3) return min(a, b);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float glocke(float d, float r) {
  float x = clamp(d / max(r, 1e-3), 0.0, 1.0);
  float u = 1.0 - x * x;
  return u * u * u;
}

float dreieck(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
  vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
  vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
  vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                   vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                   vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}

// Deckung einer Form mit Abstand d, deren schmalste Stelle hier w (halb) breit ist: Kastenfilter, auch unter einem Bildpunkt
float deckung(float d, float w) {
  return clamp(min(2.0 * w, 0.5 - d), 0.0, 1.0);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uHoehe - gl_FragCoord.y);
  ivec2 kc = ivec2(p) / KG;
  uvec2 se = texelFetch(uKachel, kc, 0).xy;
  float fl = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uFelder) break;
    fl = max(fl, glocke(length(p - uFeld[i].xy), uFeld[i].z) * uFeld[i].w);
  }
  float k = uK0 + uK1 * fl;
  // je Schicht: Linien hart, Punkte und Tropfen weich, dazu der kleinste Einzelabstand und seine Breite
  vec2 dL = vec2(1e6);
  vec2 dB = vec2(1e6);
  vec2 dE = vec2(1e6);
  vec2 wE = vec2(0.0);
  int gruppe = -1;
  int schicht = 0;
  int art = 0;
  float gd = 1e6;
  float gw = 0.0;
  for (uint i = 0u; i < se.y; i++) {
    int j = int(se.x + i);
    int idx = int(texelFetch(uListe, ivec2(j % LB, j / LB), 0).r);
    int t = idx * 2;
    vec4 A = texelFetch(uPrim, ivec2(t % PB, t / PB), 0);
    vec4 B = texelFetch(uPrim, ivec2((t + 1) % PB, (t + 1) / PB), 0);
    int g = int(B.z + 0.5);
    if (g != gruppe) {
      if (gruppe >= 0) {
        if (art == 0) dL[schicht] = min(dL[schicht], gd);
        else dB[schicht] = smin(dB[schicht], gd, k);
        if (gd < dE[schicht]) { dE[schicht] = gd; wE[schicht] = gw; }
      }
      gruppe = g;
      int sa = int(B.w + 0.5);
      schicht = sa - 2 * (sa / 2);
      art = sa / 2;
      gd = 1e6;
    }
    float d = kapsel(p, A.xy, A.zw, B.x, B.y);
    if (d < gd) {
      gd = d;
      // Breite an der nächsten Stelle der Kapsel
      vec2 ba = A.zw - A.xy;
      float f = clamp(dot(p - A.xy, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      gw = mix(B.x, B.y, f);
    }
  }
  if (gruppe >= 0) {
    if (art == 0) dL[schicht] = min(dL[schicht], gd);
    else dB[schicht] = smin(dB[schicht], gd, k);
    if (gd < dE[schicht]) { dE[schicht] = gd; wE[schicht] = gw; }
  }
  float d0 = smin(dL.x, dB.x, k);
  float d1 = smin(dL.y, dB.y, k);
  // wo das weiche Minimum die Form verdickt, gilt die Verdickung als Breite
  float aG = deckung(d1, wE.y + max(dE.y - d1, 0.0));
  float aI = deckung(d0, wE.x + max(dE.x - d0, 0.0));
  vec3 c = uGruen * aG;
  float a = aG;
  c = uTinte * aI + c * (1.0 - aI);
  a = aI + a * (1.0 - aI);
  if (uZeigerDa == 1) {
    float dz = dreieck(p, uZA, uZB, uZC);
    float fuell = clamp(0.5 - dz, 0.0, 1.0);
    c = vec3(1.0) * fuell + c * (1.0 - fuell);
    a = fuell + a * (1.0 - fuell);
    // Rand innen an der Kante, so sitzt die Spitze genau auf der Stelle
    float rand = deckung(abs(dz + uZLinie * 0.5) - uZLinie * 0.5, uZLinie * 0.5);
    c = uTinte * rand + c * (1.0 - rand);
    a = rand + a * (1.0 - rand);
  }
  aus = vec4(c, a);
}
`;

function shader(gl: WebGL2RenderingContext, art: number, quelle: string): WebGLShader {
  const s = gl.createShader(art)!;
  gl.shaderSource(s, quelle);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader: ${gl.getShaderInfoLog(s) ?? ''}`);
  return s;
}

export class FluessigeAnzeige {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private texPrim: WebGLTexture;
  private texKachel: WebGLTexture;
  private texListe: WebGLTexture;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private breite = 1;
  private hoehe = 1;
  private kx = 1;
  private ky = 1;
  private primKap = 0;
  private listeKap = 0;
  private kachelDaten = new Uint32Array(2);
  private zaehler = new Uint32Array(1);
  private liste = new Uint32Array(1);
  private primDaten = new Float32Array(4);
  /** zuletzt: Kapseln, Einträge in den Kacheln, Zeit fürs Verteilen (ms) */
  stat = { kapseln: 0, eintraege: 0, verteilenMs: 0 };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) throw new Error('WebGL2 fehlt');
    this.gl = gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Programm: ${gl.getProgramInfoLog(p) ?? ''}`);
    this.prog = p;
    for (const n of ['uPrim', 'uKachel', 'uListe', 'uHoehe', 'uK0', 'uK1', 'uFelder', 'uFeld', 'uTinte', 'uGruen', 'uZeigerDa', 'uZA', 'uZB', 'uZC', 'uZLinie'])
      this.uni[n] = gl.getUniformLocation(p, n);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = (): WebGLTexture => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.texPrim = tex();
    this.texKachel = tex();
    this.texListe = tex();
  }

  /** Größe in Gerätepunkten */
  groesse(b: number, h: number): void {
    this.breite = Math.max(1, Math.round(b));
    this.hoehe = Math.max(1, Math.round(h));
    const c = this.gl.canvas as HTMLCanvasElement;
    c.width = this.breite;
    c.height = this.hoehe;
    this.kx = Math.ceil(this.breite / KACHEL);
    this.ky = Math.ceil(this.hoehe / KACHEL);
    this.kachelDaten = new Uint32Array(this.kx * this.ky * 2);
    this.zaehler = new Uint32Array(this.kx * this.ky);
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texKachel);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32UI, this.kx, this.ky, 0, gl.RG_INTEGER, gl.UNSIGNED_INT, null);
  }

  zeichnen(sz: Szene): void {
    const gl = this.gl;
    const t0 = performance.now();
    const n = sz.anzahl;
    const P = sz.prim;
    // Kapseln auf Kacheln verteilen (Rand: weichste Stelle + ein Bildpunkt)
    const rand = sz.k0 + sz.k1 + 1.5;
    const z = this.zaehler;
    z.fill(0);
    const box = new Int32Array(n * 4);
    let gesamt = 0;
    for (let i = 0; i < n; i++) {
      const o = i * PRIM_FELDER;
      const x0 = P[o]!;
      const y0 = P[o + 1]!;
      const x1 = P[o + 2]!;
      const y1 = P[o + 3]!;
      const r = Math.max(P[o + 4]!, P[o + 5]!) + rand;
      const a = Math.max(0, Math.floor((Math.min(x0, x1) - r) / KACHEL));
      const b = Math.min(this.kx - 1, Math.floor((Math.max(x0, x1) + r) / KACHEL));
      const c = Math.max(0, Math.floor((Math.min(y0, y1) - r) / KACHEL));
      const d = Math.min(this.ky - 1, Math.floor((Math.max(y0, y1) + r) / KACHEL));
      box[i * 4] = a;
      box[i * 4 + 1] = b;
      box[i * 4 + 2] = c;
      box[i * 4 + 3] = d;
      if (a > b || c > d) continue;
      for (let ty = c; ty <= d; ty++) for (let tx = a; tx <= b; tx++) z[ty * this.kx + tx]!++;
      gesamt += (b - a + 1) * (d - c + 1);
    }
    const kd = this.kachelDaten;
    let lauf = 0;
    for (let t = 0; t < z.length; t++) {
      kd[t * 2] = lauf;
      kd[t * 2 + 1] = z[t]!;
      lauf += z[t]!;
      z[t] = 0;
    }
    const listeH = Math.max(1, Math.ceil(gesamt / LISTE_BREITE));
    if (this.liste.length < listeH * LISTE_BREITE) this.liste = new Uint32Array(listeH * LISTE_BREITE * 2);
    const L = this.liste;
    for (let i = 0; i < n; i++) {
      const a = box[i * 4]!;
      const b = box[i * 4 + 1]!;
      const c = box[i * 4 + 2]!;
      const d = box[i * 4 + 3]!;
      for (let ty = c; ty <= d; ty++)
        for (let tx = a; tx <= b; tx++) {
          const t = ty * this.kx + tx;
          L[kd[t * 2]! + z[t]!] = i;
          z[t]!++;
        }
    }
    // Kapseln: je zwei Texel
    const primH = Math.max(1, Math.ceil((n * 2) / PRIM_BREITE));
    if (this.primDaten.length < primH * PRIM_BREITE * 4) this.primDaten = new Float32Array(primH * PRIM_BREITE * 4 * 2);
    this.primDaten.set(P.subarray(0, n * PRIM_FELDER));
    this.stat = { kapseln: n, eintraege: gesamt, verteilenMs: performance.now() - t0 };

    gl.bindTexture(gl.TEXTURE_2D, this.texPrim);
    if (primH > this.primKap) {
      this.primKap = primH * 2;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, PRIM_BREITE, this.primKap, 0, gl.RGBA, gl.FLOAT, null);
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PRIM_BREITE, primH, gl.RGBA, gl.FLOAT, this.primDaten.subarray(0, primH * PRIM_BREITE * 4));
    gl.bindTexture(gl.TEXTURE_2D, this.texListe);
    if (listeH > this.listeKap) {
      this.listeKap = listeH * 2;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32UI, LISTE_BREITE, this.listeKap, 0, gl.RED_INTEGER, gl.UNSIGNED_INT, null);
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LISTE_BREITE, listeH, gl.RED_INTEGER, gl.UNSIGNED_INT, L.subarray(0, listeH * LISTE_BREITE));
    gl.bindTexture(gl.TEXTURE_2D, this.texKachel);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.kx, this.ky, gl.RG_INTEGER, gl.UNSIGNED_INT, kd);

    gl.viewport(0, 0, this.breite, this.hoehe);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texPrim);
    gl.uniform1i(this.uni.uPrim!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texKachel);
    gl.uniform1i(this.uni.uKachel!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texListe);
    gl.uniform1i(this.uni.uListe!, 2);
    gl.uniform1f(this.uni.uHoehe!, this.hoehe);
    gl.uniform1f(this.uni.uK0!, sz.k0);
    gl.uniform1f(this.uni.uK1!, sz.k1);
    const nf = Math.min(8, Math.floor(sz.felder.length / 4));
    gl.uniform1i(this.uni.uFelder!, nf);
    const fd = new Float32Array(32);
    fd.set(sz.felder.slice(0, nf * 4));
    gl.uniform4fv(this.uni.uFeld!, fd);
    gl.uniform3fv(this.uni.uTinte!, sz.tinte);
    gl.uniform3fv(this.uni.uGruen!, sz.gruen);
    const zg = sz.zeiger;
    gl.uniform1i(this.uni.uZeigerDa!, zg ? 1 : 0);
    if (zg) {
      gl.uniform2f(this.uni.uZA!, zg.ax, zg.ay);
      gl.uniform2f(this.uni.uZB!, zg.bx, zg.by);
      gl.uniform2f(this.uni.uZC!, zg.cx, zg.cy);
      gl.uniform1f(this.uni.uZLinie!, zg.linie);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
