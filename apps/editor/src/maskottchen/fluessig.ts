// Flüssiges Verschmelzen (liquid drop): Alle schwarzen Teile (Rumpf, Beine, Schwanz, Kehle, Ohren, Schopf, Kopf, Nase) werden als
// eine Maske gezeichnet und auf der Grafikkarte zweimal weichgezeichnet (Gauß, je zwei Durchgänge):
//   - groß (`sigma`): bei 50 % geschnitten füllt das jede Kehle zwischen zwei Teilen rund aus (Bein in Bauch, Ohr in Kopf,
//     Schwanz in Rücken, Strähne in Nase); wo sich Teile nähern, entsteht eine Brücke wie zwischen zwei Tropfen,
//   - klein (`sigmaGlatt`): rundet auch nach außen gewölbte Ecken ein wenig (0 = Spitzen bleiben ganz spitz).
// Beides vereinigt ergibt die Form. Gesicht, Fenster, Loch und Nase zeichnet die Bühne danach scharf darüber.
const VS = `attribute vec2 a; varying vec2 v; void main(){ v = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const kern = (tex: string, schritt: string, sigma: string, aus: string) => `
  float ${aus} = 0.0; { float w = 0.0;
  for (int i = -12; i <= 12; i++) {
    float x = float(i);
    float g = exp(-0.5 * x * x / (${sigma} * ${sigma}));
    ${aus} += texture2D(${tex}, v + ${schritt} * x).a * g; w += g;
  }
  ${aus} /= w; }`;
const BLUR = `precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 schritt; uniform float sigma;
void main(){ ${kern('t', 'schritt', 'sigma', 's')} gl_FragColor = vec4(0.0, 0.0, 0.0, s); }`;
const SCHLIESSEN = `precision highp float; varying vec2 v;
uniform sampler2D t; uniform sampler2D t2; uniform sampler2D roh;
uniform vec2 schritt; uniform float sigma; uniform vec2 schritt2; uniform float sigma2;
uniform float kante; uniform float kante2; uniform float schwelle; uniform float glattAn; uniform vec3 tinte;
void main(){
  ${kern('t', 'schritt', 'sigma', 's')}
  float zu = smoothstep(schwelle - kante, schwelle + kante, s);
  float g;
  if (glattAn > 0.5) {
    ${kern('t2', 'schritt2', 'sigma2', 's2')}
    g = smoothstep(0.5 - kante2, 0.5 + kante2, s2);
  } else {
    g = texture2D(roh, v).a;
  }
  float a = max(zu, g);
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
  private texGross: WebGLTexture;
  private texKlein: WebGLTexture;
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
    this.texGross = tex();
    this.texKlein = tex();
    this.fb = gl.createFramebuffer()!;
  }

  /** waagrechter Durchgang von der Quelle in `ziel` */
  private waagrecht(ziel: WebGLTexture, sigma: number): { schritt: number; s: number } {
    const gl = this.gl;
    const s = Math.max(0.35, sigma);
    const schritt = Math.max(1, s / 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ziel, 0);
    gl.useProgram(this.progBlur);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texQuelle);
    gl.uniform1i(gl.getUniformLocation(this.progBlur, 't'), 0);
    gl.uniform2f(gl.getUniformLocation(this.progBlur, 'schritt'), schritt / this.w, 0);
    gl.uniform1f(gl.getUniformLocation(this.progBlur, 'sigma'), s / schritt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return { schritt, s };
  }

  /** `quelle`: Maske der schwarzen Teile (Deckung im Alphakanal). sigma, sigmaGlatt in Bildpunkten der Quelle. */
  zeichnen(quelle: HTMLCanvasElement, sigma: number, tinte: string, schwelle = 0.5, sigmaGlatt = 0): void {
    const gl = this.gl;
    const w = quelle.width;
    const h = quelle.height;
    if (this.leinwand.width !== w || this.leinwand.height !== h) {
      this.leinwand.width = w;
      this.leinwand.height = h;
    }
    if (w !== this.w || h !== this.h) {
      for (const t of [this.texGross, this.texKlein]) {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      this.w = w;
      this.h = h;
    }
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texQuelle);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, quelle);
    const gross = this.waagrecht(this.texGross, sigma);
    const glattAn = sigmaGlatt > 0.3;
    const klein = glattAn ? this.waagrecht(this.texKlein, sigmaGlatt) : { schritt: 1, s: 1 };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const p = this.progZu;
    gl.useProgram(p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texGross);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texKlein);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texQuelle);
    gl.uniform1i(gl.getUniformLocation(p, 't'), 0);
    gl.uniform1i(gl.getUniformLocation(p, 't2'), 1);
    gl.uniform1i(gl.getUniformLocation(p, 'roh'), 2);
    gl.uniform2f(gl.getUniformLocation(p, 'schritt'), 0, gross.schritt / h);
    gl.uniform1f(gl.getUniformLocation(p, 'sigma'), gross.s / gross.schritt);
    gl.uniform2f(gl.getUniformLocation(p, 'schritt2'), 0, klein.schritt / h);
    gl.uniform1f(gl.getUniformLocation(p, 'sigma2'), klein.s / klein.schritt);
    gl.uniform1f(gl.getUniformLocation(p, 'kante'), Math.min(0.5, 0.22 / gross.s + 0.01));
    gl.uniform1f(gl.getUniformLocation(p, 'kante2'), Math.min(0.5, 0.22 / klein.s + 0.01));
    gl.uniform1f(gl.getUniformLocation(p, 'schwelle'), schwelle);
    gl.uniform1f(gl.getUniformLocation(p, 'glattAn'), glattAn ? 1 : 0);
    gl.uniform3fv(gl.getUniformLocation(p, 'tinte'), farbe(tinte));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.activeTexture(gl.TEXTURE0);
  }
}
