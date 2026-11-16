// Flüssiges Verschmelzen (liquid drop): Alle schwarzen Teile hinter dem Gesicht (Rumpf, Beine, Schwanz, Kehle, Ohren, Schopf,
// Kopf) werden als eine Maske gezeichnet, auf der Grafikkarte weichgezeichnet (Gauß, zwei Durchgänge) und bei 50 % geschnitten;
// das Ergebnis wird mit der ursprünglichen Maske vereinigt. Das ist die „Schließung“ der Bildverarbeitung: Wo Teile aneinander-
// stoßen, entsteht eine runde Kehle (Bein in Bauch, Ohr in Kopf, Schwanz in Rücken), wo sie sich nähern, eine Brücke wie zwischen
// zwei Tropfen. Nach außen gewölbte Spitzen bleiben spitz (die ursprüngliche Maske ist immer dabei). Gesicht, Fenster, Loch und Nase
// zeichnet die Bühne danach scharf darüber.
const VS = `attribute vec2 a; varying vec2 v; void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const KERN = `
  float s = 0.0; float w = 0.0;
  for (int i = -12; i <= 12; i++) {
    float x = float(i);
    float g = exp(-0.5 * x * x / (sigma * sigma));
    s += texture2D(t, v + schritt * x).a * g; w += g;
  }
  s /= w;`;
const BLUR = `precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 schritt; uniform float sigma;
void main(){ ${KERN} gl_FragColor = vec4(0.0, 0.0, 0.0, s); }`;
const SCHLIESSEN = `precision highp float; varying vec2 v; uniform sampler2D t; uniform sampler2D roh; uniform vec2 schritt; uniform float sigma;
uniform float kante; uniform float schwelle; uniform vec3 tinte;
void main(){ ${KERN}
  float zu = smoothstep(schwelle - kante, schwelle + kante, s);
  float a = max(zu, texture2D(roh, v).a);
  gl_FragColor = vec4(tinte * a, a);
}`;

function farbe(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class Fluessig {
  readonly leinwand: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private progBlur: WebGLProgram;
  private progZu: WebGLProgram;
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
    this.progZu = prog(SCHLIESSEN);
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

  /** `quelle`: Maske der schwarzen Teile (Deckung im Alphakanal). sigma in Bildpunkten der Quelle. */
  zeichnen(quelle: HTMLCanvasElement, sigma: number, tinte: string, schwelle = 0.5): void {
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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texQuelle);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, quelle);
    const s = Math.max(0.35, sigma);
    const schritt = Math.max(1, s / 4);
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
    gl.useProgram(this.progZu);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texZwischen);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texQuelle);
    gl.uniform1i(gl.getUniformLocation(this.progZu, 't'), 0);
    gl.uniform1i(gl.getUniformLocation(this.progZu, 'roh'), 1);
    gl.uniform2f(gl.getUniformLocation(this.progZu, 'schritt'), 0, schritt / h);
    gl.uniform1f(gl.getUniformLocation(this.progZu, 'sigma'), s / schritt);
    gl.uniform1f(gl.getUniformLocation(this.progZu, 'kante'), Math.min(0.5, 0.22 / s + 0.01));
    gl.uniform1f(gl.getUniformLocation(this.progZu, 'schwelle'), schwelle);
    gl.uniform3fv(gl.getUniformLocation(this.progZu, 'tinte'), farbe(tinte));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.activeTexture(gl.TEXTURE0);
  }
}
