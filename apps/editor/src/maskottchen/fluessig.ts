// Flüssige Zeichenstufe: Die Figur wird erst ganz normal gezeichnet (Schwarz und Weiß auf durchsichtigem Grund), dann auf der
// Grafikkarte leicht weichgezeichnet (Gauß, zwei Durchgänge) und wieder bei 50 % geschnitten, mit einer Kante von gut einem
// Bildpunkt. Haarrisse zwischen Teilen schließen sich, Zacken an Ecken runden sich, dünne Splitter verschwinden; gerade und runde
// Kanten bleiben, wo sie sind (die „Schließung“ der Bildverarbeitung als Unschärfe und Schwelle, wie beim „Gooey“-Effekt).
// Zwei Masken werden getrennt geglättet: Schwarz (Tinte) und Figur (Deckung). So bleibt das weiße Gesicht vor dunklem Grund weiß.
const VS = `attribute vec2 a; varying vec2 v; void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const KERN = `
  vec2 s = vec2(0.0); float w = 0.0;
  for (int i = -12; i <= 12; i++) {
    float x = float(i);
    float g = exp(-0.5 * x * x / (sigma * sigma));
    vec4 c = texture2D(t, v + schritt * x);
    s += probe(c) * g; w += g;
  }
  s /= w;`;
const BLUR = `precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 schritt; uniform float sigma;
vec2 probe(vec4 c){ return vec2(c.a * (1.0 - c.r), c.a); }
void main(){ ${KERN} gl_FragColor = vec4(s.x, s.y, 0.0, 1.0); }`;
const SCHWELLE = `precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 schritt; uniform float sigma; uniform float kante;
uniform vec3 tinte; uniform vec3 papier;
vec2 probe(vec4 c){ return c.rg; }
void main(){ ${KERN}
  float schwarz = smoothstep(0.5 - kante, 0.5 + kante, s.x);
  float deckung = smoothstep(0.5 - kante, 0.5 + kante, max(s.y, s.x));
  vec3 f = mix(papier, tinte, deckung > 0.0 ? schwarz / deckung : 0.0);
  gl_FragColor = vec4(f * deckung, deckung);
}`;

function farbe(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class Fluessig {
  readonly leinwand: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private progBlur: WebGLProgram;
  private progSchwelle: WebGLProgram;
  private texQuelle: WebGLTexture;
  private texZwischen: WebGLTexture;
  private fb: WebGLFramebuffer;
  private w = 0;
  private h = 0;

  constructor(leinwand: HTMLCanvasElement) {
    this.leinwand = leinwand;
    const gl = leinwand.getContext('webgl', { premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true, alpha: true });
    if (!gl) throw new Error('kein WebGL');
    this.gl = gl;
    const prog = (fs: string) => {
      const p = gl.createProgram()!;
      for (const [art, src] of [
        [gl.VERTEX_SHADER, VS],
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
      return p;
    };
    this.progBlur = prog(BLUR);
    this.progSchwelle = prog(SCHWELLE);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = () => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.texQuelle = tex();
    this.texZwischen = tex();
    this.fb = gl.createFramebuffer()!;
  }

  /** `quelle`: Leinwand mit der Figur (Schwarz/Weiß auf durchsichtig). sigma in Bildpunkten der Quelle. */
  zeichnen(quelle: HTMLCanvasElement, sigma: number, tinte: string, papier: string): void {
    const gl = this.gl;
    const w = quelle.width;
    const h = quelle.height;
    if (this.leinwand.width !== w || this.leinwand.height !== h) {
      this.leinwand.width = w;
      this.leinwand.height = h;
    }
    if (w !== this.w || h !== this.h) {
      gl.bindTexture(gl.TEXTURE_2D, this.texZwischen);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.w = w;
      this.h = h;
    }
    gl.viewport(0, 0, w, h);
    gl.bindTexture(gl.TEXTURE_2D, this.texQuelle);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, quelle);
    const s = Math.max(0.35, sigma);
    const schritt = Math.max(1, s / 4); // Abtastabstand, damit 25 Abgriffe bis ±3σ reichen
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texZwischen, 0);
    gl.useProgram(this.progBlur);
    gl.uniform1i(gl.getUniformLocation(this.progBlur, 't'), 0);
    gl.uniform2f(gl.getUniformLocation(this.progBlur, 'schritt'), schritt / w, 0);
    gl.uniform1f(gl.getUniformLocation(this.progBlur, 'sigma'), s / schritt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, this.texZwischen);
    gl.useProgram(this.progSchwelle);
    gl.uniform1i(gl.getUniformLocation(this.progSchwelle, 't'), 0);
    gl.uniform2f(gl.getUniformLocation(this.progSchwelle, 'schritt'), 0, schritt / h);
    gl.uniform1f(gl.getUniformLocation(this.progSchwelle, 'sigma'), s / schritt);
    gl.uniform1f(gl.getUniformLocation(this.progSchwelle, 'kante'), Math.min(0.5, 0.25 / s + 0.01));
    gl.uniform3fv(gl.getUniformLocation(this.progSchwelle, 'tinte'), farbe(tinte));
    gl.uniform3fv(gl.getUniformLocation(this.progSchwelle, 'papier'), farbe(papier));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
