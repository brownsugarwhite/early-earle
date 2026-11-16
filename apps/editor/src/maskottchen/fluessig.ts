// Flüssiges Verschmelzen (liquid drop), ganz auf der Grafikkarte, in einer eigenen Ebene über dem Grund:
//   1. Maske: Alle schwarzen Teile (Rumpf, Beine, Schwanz, Ohren, Schopf, Kopf, Nase) werden als Flächen gefüllt (Schablone:
//      Fächer aus Dreiecken zählen die Umläufe, wie „nonzero“ im Canvas), mit Mehrfachabtastung, nur im Rahmen der Figur.
//   2. Zweimal weichgezeichnet (Gauß):
//      - groß (`sigma`): Die Maske wird erst durch Mitteln verkleinert (je Stufe 2 × 2 Bildpunkte, bis σ 3 bis 6 Punkte der
//        kleinen Stufe misst), dort weichgezeichnet und beim Schneiden als kubischer B-Spline gelesen. So bleibt das Feld ohne
//        Treppen (früher tastete der Kern die scharfe Maske in Sprüngen von σ/4 ab: Die Brücken franzten aus). Bei 50 %
//        geschnitten füllt es jede Kehle zwischen zwei Teilen rund aus (Bein in Bauch, Ohr in Kopf, Schwanz in Rücken, Strähne
//        in Nase); wo sich Teile nähern, entsteht eine Brücke wie zwischen zwei Tropfen,
//      - klein (`sigmaGlatt`, volle Auflösung): rundet auch nach außen gewölbte Ecken ein wenig (0 = Spitzen bleiben ganz spitz).
//      Beides vereinigt ergibt die Form, in der Farbe der Tinte auf die Ebene gelegt (Kante einen Bildpunkt weich).
//   3. Gesicht, Fenster, Loch, Nase und Kinnhaken scharf darüber, in der Reihenfolge der Teile.
// Nichts wird zwischen Canvas und Grafikkarte hin und her kopiert (das kostete in Safari rund 30 ms je Bild).
import type { Zeichenteil } from './figur';

const VS_PFAD = `#version 300 es
in vec2 a; uniform vec2 ziel; uniform float hoch; uniform vec2 ursprung;
void main(){ vec2 p = a - ursprung; gl_Position = vec4(p.x / ziel.x * 2.0 - 1.0, (hoch - p.y) / ziel.y * 2.0 - 1.0, 0.0, 1.0); }`;
const FS_FARBE = `#version 300 es
precision mediump float; uniform vec4 farbe; out vec4 o; void main(){ o = farbe; }`;
/** Rechteck (oben links x, y, Breite, Höhe in Bildpunkten des Ziels) */
const VS_RECHTECK = `#version 300 es
in vec2 a; uniform vec2 ziel; uniform float hoch; uniform vec4 rechteck;
void main(){ vec2 p = rechteck.xy + (a * 0.5 + 0.5) * rechteck.zw; gl_Position = vec4(p.x / ziel.x * 2.0 - 1.0, (hoch - p.y) / ziel.y * 2.0 - 1.0, 0.0, 1.0); }`;
/** höchste Zahl der Abgriffe je Seite eines Kerns */
const NMAX = 32;
const ABGRIFF = `float abgriff(sampler2D t, vec2 uv, vec2 lo, vec2 hi){ return texture(t, clamp(uv, lo, hi)).r; }`;
/** halbieren: Mittel aus 2 × 2 Bildpunkten (ein linearer Abgriff genau auf ihrer gemeinsamen Ecke) */
const FS_HALB = `#version 300 es
precision highp float; uniform sampler2D t; uniform vec2 quelle; uniform vec2 lo; uniform vec2 hi; out vec4 o;
${ABGRIFF}
void main(){ o = vec4(abgriff(t, (floor(gl_FragCoord.xy) * 2.0 + 1.0) / quelle, lo, hi), 0.0, 0.0, 1.0); }`;
/** Gauß in eine Richtung, Gewichte symmetrisch (w[0] Mitte) */
const FS_GAUSS = `#version 300 es
precision highp float; uniform sampler2D t; uniform vec2 quelle; uniform vec2 lo; uniform vec2 hi;
uniform vec2 schritt; uniform int n; uniform float w[${NMAX + 1}]; out vec4 o;
${ABGRIFF}
void main(){
  vec2 uv = gl_FragCoord.xy / quelle;
  float s = w[0] * abgriff(t, uv, lo, hi);
  for (int i = 1; i <= ${NMAX}; i++) { if (i > n) break; vec2 d = schritt * float(i); s += w[i] * (abgriff(t, uv + d, lo, hi) + abgriff(t, uv - d, lo, hi)); }
  o = vec4(s, 0.0, 0.0, 1.0);
}`;
const FS_SCHLIESSEN = `#version 300 es
precision highp float;
uniform sampler2D tief; uniform vec2 tiefGroesse; uniform vec2 tiefLo; uniform vec2 tiefHi; uniform float faktor;
uniform sampler2D klein; uniform sampler2D roh; uniform vec2 groesse; uniform vec2 lo; uniform vec2 hi; uniform vec2 versatz;
uniform vec2 schritt2; uniform int n2; uniform float w2[${NMAX + 1}];
uniform float schwelle; uniform float glattAn; uniform vec3 tinte;
out vec4 o;
${ABGRIFF}
// kubischer B-Spline aus vier linearen Abgriffen; p in Bildpunkten der Stufe (Mitten bei .5)
float bspline(sampler2D t, vec2 p, vec2 g, vec2 lo, vec2 hi){
  vec2 c = p - 0.5; vec2 i = floor(c); vec2 f = c - i;
  vec2 f2 = f * f; vec2 f3 = f2 * f;
  vec2 w0 = (-f3 + 3.0 * f2 - 3.0 * f + 1.0) / 6.0;
  vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1; vec2 g1 = w2 + w3;
  vec2 a = (i - 0.5 + w1 / g0) / g; vec2 b = (i + 1.5 + w3 / g1) / g;
  return g0.y * (g0.x * abgriff(t, a, lo, hi) + g1.x * abgriff(t, vec2(b.x, a.y), lo, hi))
       + g1.y * (g0.x * abgriff(t, vec2(a.x, b.y), lo, hi) + g1.x * abgriff(t, b, lo, hi));
}
void main(){
  vec2 p = gl_FragCoord.xy + versatz;
  float s = bspline(tief, p / faktor, tiefGroesse, tiefLo, tiefHi);
  float zu = clamp(0.5 + (s - schwelle) / max(fwidth(s), 1e-5), 0.0, 1.0);
  vec2 uv = p / groesse;
  float g;
  if (glattAn > 0.5) {
    float s2 = w2[0] * abgriff(klein, uv, lo, hi);
    for (int i = 1; i <= ${NMAX}; i++) { if (i > n2) break; vec2 d = schritt2 * float(i); s2 += w2[i] * (abgriff(klein, uv + d, lo, hi) + abgriff(klein, uv - d, lo, hi)); }
    g = clamp(0.5 + (s2 - 0.5) / max(fwidth(s2), 1e-5), 0.0, 1.0);
  } else {
    g = texture(roh, uv).r;
  }
  float a = max(zu, g);
  o = vec4(tinte * a, a);
}`;

function farbe(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Gauß mit `sigma` (in Bildpunkten der Stufe): Abgriffe je Seite, Abstand, Gewichte (Summe 1) */
function kern(sigma: number, w: Float32Array): { n: number; schritt: number } {
  const s = Math.max(0.35, sigma);
  let n = Math.ceil(3 * s);
  let schritt = 1;
  if (n > NMAX) {
    schritt = (3 * s) / NMAX;
    n = NMAX;
  }
  let summe = 0;
  for (let i = 0; i <= NMAX; i++) {
    const x = i * schritt;
    const g = i <= n ? Math.exp((-0.5 * x * x) / (s * s)) : 0;
    w[i] = g;
    summe += i ? 2 * g : g;
  }
  for (let i = 0; i <= NMAX; i++) w[i]! /= summe;
  return { n, schritt };
}

export interface FigurStil {
  /** große Glätte (Kehlen), Bildpunkte */
  sigma: number;
  /** kleine Glätte (Ecken), Bildpunkte; 0 = Spitzen ganz spitz */
  sigmaGlatt: number;
  schwelle: number;
  schwarz: string;
  weiss: string;
}

type Programm = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
interface Ziel {
  tex: WebGLTexture;
  fb: WebGLFramebuffer;
  w: number;
  h: number;
}

export class Fluessig {
  readonly leinwand: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private pfad: Programm;
  private halb: Programm;
  private gauss: Programm;
  private schliessen: Programm;
  private bufPfad: WebGLBuffer;
  private vaoPfad: WebGLVertexArrayObject;
  private vaoQuad: WebGLVertexArrayObject;
  private proben: number;
  /** Feld in halber Genauigkeit (16 Bit), wenn die Grafikkarte darin zeichnen kann */
  private feldFormat: [number, number, number];
  // Ziele im Rahmen der Figur (wachsen nur): Mehrfachabtastung, Maske, Stufen 1–3, groß waagrecht/senkrecht, klein waagrecht
  private tw = 0;
  private th = 0;
  private rbFarbe: WebGLRenderbuffer;
  private rbSchablone: WebGLRenderbuffer;
  private fbMs: WebGLFramebuffer;
  private maske: Ziel;
  private stufen: Ziel[];
  private grossA: Ziel;
  private grossB: Ziel;
  private klein: Ziel;
  // Eckpunkte aller Teile einer Figur (Bildpunkte der Leinwand)
  private ecken = new Float32Array(1 << 16);
  private w1 = new Float32Array(NMAX + 1);
  private w2 = new Float32Array(NMAX + 1);

  constructor(leinwand: HTMLCanvasElement) {
    this.leinwand = leinwand;
    const gl = leinwand.getContext('webgl2', { premultipliedAlpha: true, antialias: true, stencil: true, depth: false, alpha: true, preserveDrawingBuffer: false });
    if (!gl) throw new Error('kein WebGL2');
    this.gl = gl;
    const programm = (vs: string, fs: string): Programm => {
      const p = gl.createProgram()!;
      for (const [art, src] of [
        [gl.VERTEX_SHADER, vs],
        [gl.FRAGMENT_SHADER, fs],
      ] as const) {
        const s = gl.createShader(art)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'Shader');
        gl.attachShader(p, s);
      }
      gl.bindAttribLocation(p, 0, 'a');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'Programm');
      const u: Record<string, WebGLUniformLocation | null> = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i)!.name.replace('[0]', '');
        u[name] = gl.getUniformLocation(p, name);
      }
      return { p, u };
    };
    this.pfad = programm(VS_PFAD, FS_FARBE);
    this.halb = programm(VS_RECHTECK, FS_HALB);
    this.gauss = programm(VS_RECHTECK, FS_GAUSS);
    this.schliessen = programm(VS_RECHTECK, FS_SCHLIESSEN);
    this.bufPfad = gl.createBuffer()!;
    this.vaoPfad = gl.createVertexArray()!;
    gl.bindVertexArray(this.vaoPfad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPfad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const bufQuad = gl.createBuffer()!;
    this.vaoQuad = gl.createVertexArray()!;
    gl.bindVertexArray(this.vaoQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.proben = Math.max(1, Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number));
    this.feldFormat = gl.getExtension('EXT_color_buffer_float') ? [gl.R16F, gl.RED, gl.HALF_FLOAT] : [gl.R8, gl.RED, gl.UNSIGNED_BYTE];
    this.rbFarbe = gl.createRenderbuffer()!;
    this.rbSchablone = gl.createRenderbuffer()!;
    this.fbMs = gl.createFramebuffer()!;
    const ziel = (): Ziel => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return { tex: t, fb: gl.createFramebuffer()!, w: 0, h: 0 };
    };
    this.maske = ziel();
    this.stufen = [ziel(), ziel(), ziel()];
    this.grossA = ziel();
    this.grossB = ziel();
    this.klein = ziel();
  }

  /** Größe der Ebene in Bildpunkten */
  groesse(w: number, h: number): void {
    if (this.leinwand.width !== w) this.leinwand.width = w;
    if (this.leinwand.height !== h) this.leinwand.height = h;
  }

  /** Ebene leeren (am Anfang jedes Bilds) */
  leeren(): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.leinwand.width, this.leinwand.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
    gl.stencilMask(0xff);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  }

  private anlegen(z: Ziel, w: number, h: number, format: [number, number, number]): void {
    const gl = this.gl;
    z.w = w;
    z.h = h;
    gl.bindTexture(gl.TEXTURE_2D, z.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, format[0], w, h, 0, format[1], format[2], null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, z.tex, 0);
  }

  /** Ziele im Rahmen der Figur anlegen (wachsen in Stufen von 256 Bildpunkten) */
  private ziele(w: number, h: number): void {
    if (w <= this.tw && h <= this.th) return;
    const gl = this.gl;
    const max = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number);
    this.tw = Math.min(max, Math.max(this.tw, Math.ceil(w / 256) * 256));
    this.th = Math.min(max, Math.max(this.th, Math.ceil(h / 256) * 256));
    const { tw, th } = this;
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbFarbe);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.proben, gl.R8, tw, th);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbSchablone);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.proben, gl.DEPTH24_STENCIL8, tw, th);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbMs);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.rbFarbe);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.rbSchablone);
    this.anlegen(this.maske, tw, th, [gl.R8, gl.RED, gl.UNSIGNED_BYTE]);
    this.stufen.forEach((z, k) => this.anlegen(z, Math.ceil(tw / 2 ** (k + 1)), Math.ceil(th / 2 ** (k + 1)), this.feldFormat));
    for (const z of [this.grossA, this.grossB, this.klein]) this.anlegen(z, tw, th, this.feldFormat);
  }

  /** Platz für weitere Eckpunkte */
  private platz(n: number): void {
    if (n <= this.ecken.length) return;
    let l = this.ecken.length;
    while (l < n) l *= 2;
    const neu = new Float32Array(l);
    neu.set(this.ecken);
    this.ecken = neu;
  }

  /** Umriss eines Teils als Linienzug in Bildpunkten der Leinwand anhängen (Bézier fein genug unterteilt). Gibt das Ende zurück. */
  private umriss(t: Zeichenteil, m: DOMMatrix, k: number): number {
    const { p, n } = t;
    const { a, b, c, d, e, f } = m;
    const X = (x: number, y: number) => a * x + c * y + e;
    const Y = (x: number, y: number) => b * x + d * y + f;
    if (t.art === 'vieleck') {
      this.platz(k + n * 2);
      for (let i = 0; i < n; i++) {
        const x = p[i * 2]!;
        const y = p[i * 2 + 1]!;
        this.ecken[k++] = X(x, y);
        this.ecken[k++] = Y(x, y);
      }
      return k;
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = p[i * 6]!;
      const ay = p[i * 6 + 1]!;
      const bx = p[j * 6]!;
      const by = p[j * 6 + 1]!;
      const x0 = X(ax, ay);
      const y0 = Y(ax, ay);
      const x1 = X(ax + p[i * 6 + 4]!, ay + p[i * 6 + 5]!);
      const y1 = Y(ax + p[i * 6 + 4]!, ay + p[i * 6 + 5]!);
      const x2 = X(bx + p[j * 6 + 2]!, by + p[j * 6 + 3]!);
      const y2 = Y(bx + p[j * 6 + 2]!, by + p[j * 6 + 3]!);
      const x3 = X(bx, by);
      const y3 = Y(bx, by);
      // Abweichung der Sehne ≤ 0,75·dd/s² (dd: größte zweite Differenz der Kontrollpunkte): höchstens 0,12 Bildpunkte
      const dd = Math.max(Math.hypot(x0 - 2 * x1 + x2, y0 - 2 * y1 + y2), Math.hypot(x1 - 2 * x2 + x3, y1 - 2 * y2 + y3));
      const s = Math.max(1, Math.min(48, Math.ceil(Math.sqrt((0.75 * dd) / 0.12))));
      this.platz(k + s * 2);
      for (let q = 0; q < s; q++) {
        const u = q / s;
        const v = 1 - u;
        const w0 = v * v * v;
        const w1 = 3 * v * v * u;
        const w2 = 3 * v * u * u;
        const w3 = u * u * u;
        this.ecken[k++] = w0 * x0 + w1 * x1 + w2 * x2 + w3 * x3;
        this.ecken[k++] = w0 * y0 + w1 * y1 + w2 * y2 + w3 * y3;
      }
    }
    return k;
  }

  /** Füllen mit Schablone: Fächer zählen die Umläufe (vorn +1, hinten −1), dann deckt die Farbe, wo die Zahl nicht 0 ist,
   *  und setzt sie zurück. */
  private fuellen(von: number, anzahl: number): void {
    const gl = this.gl;
    gl.colorMask(false, false, false, false);
    gl.stencilFunc(gl.ALWAYS, 0, 0xff);
    gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
    gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
    gl.drawArrays(gl.TRIANGLE_FAN, von, anzahl);
    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
    gl.drawArrays(gl.TRIANGLE_FAN, von, anzahl);
  }

  /** Ein Durchgang über den Rahmen (w × h, unten links) eines Ziels */
  private flaeche(prog: Programm, z: Ziel, w: number, h: number): Record<string, WebGLUniformLocation | null> {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, z.fb);
    gl.viewport(0, 0, z.w, z.h);
    gl.useProgram(prog.p);
    const u = prog.u;
    gl.uniform2f(u['ziel']!, z.w, z.h);
    gl.uniform1f(u['hoch']!, h);
    gl.uniform4f(u['rechteck']!, 0, 0, w, h);
    return u;
  }

  /** Grenzen der Abgriffe: nur im Rahmen (dahinter liegen Reste älterer Bilder; der Rand des Rahmens ist leer) */
  private grenzen(u: Record<string, WebGLUniformLocation | null>, z: Ziel, w: number, h: number, lo = 'lo', hi = 'hi'): void {
    this.gl.uniform2f(u[lo]!, 0.5 / z.w, 0.5 / z.h);
    this.gl.uniform2f(u[hi]!, (w - 0.5) / z.w, (h - 0.5) / z.h);
  }

  /** Eine Figur auf die Ebene legen. `m`: Welt → Bildpunkte der Leinwand. */
  figur(teile: Zeichenteil[], m: DOMMatrix, stil: FigurStil, inMaske: (t: Zeichenteil) => boolean, vorn: (t: Zeichenteil) => boolean): void {
    const gl = this.gl;
    const W = this.leinwand.width;
    const H = this.leinwand.height;
    // Umrisse: zuerst die Maske, dann was vorn liegt
    const maske: [number, number][] = [];
    const oben: [number, number, Zeichenteil][] = [];
    let k = 0;
    for (const t of teile) {
      if (t.n < 2) continue;
      const rein = inMaske(t);
      const drauf = vorn(t);
      if (!rein && !drauf) continue;
      const von = k;
      k = this.umriss(t, m, k);
      const anzahl = (k - von) / 2;
      if (anzahl < 3) continue;
      if (rein) maske.push([von / 2, anzahl]);
      if (drauf) oben.push([von / 2, anzahl, t]);
    }
    if (!k) return;
    // Rahmen der Figur (mit Platz für das Weichzeichnen)
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < k; i += 2) {
      const x = this.ecken[i]!;
      const y = this.ecken[i + 1]!;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const rand = Math.ceil(3 * Math.max(stil.sigma, stil.sigmaGlatt) + 16);
    x0 = Math.max(0, Math.floor(x0) - rand);
    y0 = Math.max(0, Math.floor(y0) - rand);
    x1 = Math.min(W, Math.ceil(x1) + rand);
    y1 = Math.min(H, Math.ceil(y1) + rand);
    if (x1 - x0 <= 0 || y1 - y0 <= 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPfad);
    gl.bufferData(gl.ARRAY_BUFFER, this.ecken.subarray(0, k), gl.DYNAMIC_DRAW);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.stencilMask(0xff);

    if (maske.length) {
      this.ziele(x1 - x0, y1 - y0);
      const { tw, th } = this;
      const ww = Math.min(x1 - x0, tw);
      const hh = Math.min(y1 - y0, th);
      // 1. Maske mit Mehrfachabtastung, aufgelöst in `maske`
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbMs);
      gl.viewport(0, 0, tw, th);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, ww, hh);
      gl.clearColor(0, 0, 0, 0);
      gl.clearStencil(0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.STENCIL_TEST);
      gl.useProgram(this.pfad.p);
      gl.uniform2f(this.pfad.u['ziel']!, tw, th);
      gl.uniform1f(this.pfad.u['hoch']!, hh);
      gl.uniform2f(this.pfad.u['ursprung']!, x0, y0);
      gl.uniform4f(this.pfad.u['farbe']!, 1, 1, 1, 1);
      gl.bindVertexArray(this.vaoPfad);
      for (const [von, anzahl] of maske) this.fuellen(von, anzahl);
      gl.disable(gl.STENCIL_TEST);
      gl.disable(gl.SCISSOR_TEST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbMs);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.maske.fb);
      gl.blitFramebuffer(0, 0, ww, hh, 0, 0, ww, hh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.bindVertexArray(this.vaoQuad);
      gl.activeTexture(gl.TEXTURE0);

      // 2. groß: verkleinern, bis σ auf der Stufe 3 bis 6 Punkte misst (höchstens 1/8), dort weichzeichnen
      const stufe = Math.max(0, Math.min(3, Math.floor(Math.log2(Math.max(1, stil.sigma / 3)))));
      let quelle = this.maske;
      let qw = ww;
      let qh = hh;
      for (let s = 0; s < stufe; s++) {
        const z = this.stufen[s]!;
        const nw = Math.ceil(qw / 2);
        const nh = Math.ceil(qh / 2);
        const u = this.flaeche(this.halb, z, nw, nh);
        gl.bindTexture(gl.TEXTURE_2D, quelle.tex);
        gl.uniform1i(u['t']!, 0);
        gl.uniform2f(u['quelle']!, quelle.w, quelle.h);
        this.grenzen(u, quelle, qw, qh);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        quelle = z;
        qw = nw;
        qh = nh;
      }
      const faktor = 2 ** stufe;
      const g1 = kern(stil.sigma / faktor, this.w1);
      for (const [von, nach, richtung] of [
        [quelle, this.grossA, 0],
        [this.grossA, this.grossB, 1],
      ] as const) {
        const u = this.flaeche(this.gauss, nach, qw, qh);
        gl.bindTexture(gl.TEXTURE_2D, von.tex);
        gl.uniform1i(u['t']!, 0);
        gl.uniform2f(u['quelle']!, von.w, von.h);
        this.grenzen(u, von, qw, qh);
        gl.uniform2f(u['schritt']!, richtung ? 0 : g1.schritt / von.w, richtung ? g1.schritt / von.h : 0);
        gl.uniform1i(u['n']!, g1.n);
        gl.uniform1fv(u['w']!, this.w1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      // 3. klein: waagrecht in volle Auflösung, senkrecht beim Schneiden
      const glattAn = stil.sigmaGlatt > 0.3;
      const g2 = kern(stil.sigmaGlatt, this.w2);
      if (glattAn) {
        const u = this.flaeche(this.gauss, this.klein, ww, hh);
        gl.bindTexture(gl.TEXTURE_2D, this.maske.tex);
        gl.uniform1i(u['t']!, 0);
        gl.uniform2f(u['quelle']!, this.maske.w, this.maske.h);
        this.grenzen(u, this.maske, ww, hh);
        gl.uniform2f(u['schritt']!, g2.schritt / this.maske.w, 0);
        gl.uniform1i(u['n']!, g2.n);
        gl.uniform1fv(u['w']!, this.w2);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      // 4. schneiden, vereinigen, in Tinte auf die Ebene
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const z = this.schliessen.u;
      gl.useProgram(this.schliessen.p);
      gl.uniform2f(z['ziel']!, W, H);
      gl.uniform1f(z['hoch']!, H);
      gl.uniform4f(z['rechteck']!, x0, y0, ww, hh);
      // Bildpunkt der Ebene (von unten) → Stelle im Rahmen (unten links): x − x0, y + y0 + hh − H
      gl.uniform2f(z['versatz']!, -x0, y0 + hh - H);
      gl.uniform1f(z['faktor']!, faktor);
      gl.uniform2f(z['tiefGroesse']!, this.grossB.w, this.grossB.h);
      this.grenzen(z, this.grossB, qw, qh, 'tiefLo', 'tiefHi');
      gl.uniform2f(z['groesse']!, this.maske.w, this.maske.h);
      this.grenzen(z, this.maske, ww, hh);
      gl.uniform2f(z['schritt2']!, 0, g2.schritt / this.klein.h);
      gl.uniform1i(z['n2']!, g2.n);
      gl.uniform1fv(z['w2']!, this.w2);
      gl.uniform1f(z['schwelle']!, stil.schwelle);
      gl.uniform1f(z['glattAn']!, glattAn ? 1 : 0);
      gl.uniform3fv(z['tinte']!, farbe(stil.schwarz));
      gl.uniform1i(z['tief']!, 0);
      gl.uniform1i(z['klein']!, 1);
      gl.uniform1i(z['roh']!, 2);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.grossB.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.klein.tex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maske.tex);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.activeTexture(gl.TEXTURE0);
      gl.disable(gl.BLEND);
    }

    // 5. was vorn liegt, scharf darüber (Mehrfachabtastung der Ebene)
    if (oben.length) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.enable(gl.STENCIL_TEST);
      gl.useProgram(this.pfad.p);
      gl.uniform2f(this.pfad.u['ziel']!, W, H);
      gl.uniform1f(this.pfad.u['hoch']!, H);
      gl.uniform2f(this.pfad.u['ursprung']!, 0, 0);
      gl.bindVertexArray(this.vaoPfad);
      const schwarz = farbe(stil.schwarz);
      const weiss = farbe(stil.weiss);
      for (const [von, anzahl, t] of oben) {
        const [r, g, b] = t.farbe === 'schwarz' ? schwarz : weiss;
        gl.uniform4f(this.pfad.u['farbe']!, r, g, b, 1);
        this.fuellen(von, anzahl);
      }
      gl.disable(gl.STENCIL_TEST);
    }
    gl.bindVertexArray(null);
  }
}
