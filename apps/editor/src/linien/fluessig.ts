/**
 * Flüssige Anzeige der Probe „Linien, Punkte, Zeiger“ (WebGL2).
 *
 * Alles, was gezeichnet wird, ist eine Kapsel mit zwei Radien (ein Stück Linie mit Anfangs- und Endbreite, ein Punkt, ein Tropfen,
 * ein Hals). Jeder Bildpunkt rechnet den Abstand zu den Kapseln in seiner Nähe. Linien vereinigen sich hart (Kreuzungen bleiben
 * scharf, wie gezeichnet); Punkte, Tropfen und Hälse vereinigen sich weich mit allem, nahe am Zeiger und an Tropfen sichtbar: ein
 * Tropfen fließt mit seinem Hals in die Linie. Damit nicht jeder Bildpunkt alle Kapseln rechnet, werden sie auf Kacheln verteilt.
 *
 * Kanten bleiben auch bei Haarlinien richtig: Eine Linie, schmaler als ein Bildpunkt, deckt so viel, wie sie breit ist (Kastenfilter).
 *
 * Im Raum (3D-Probe) zeichnet dieselbe Anzeige zuerst den Körper (weiß, Umriss als Hülle) in einen eigenen Puffer, samt der Tiefe je
 * Bildpunkt. Eine Kapsel mit der Schicht „nach Tiefe“ ist dann je Bildpunkt sichtbar (Tinte) oder verdeckt (Grün `#b9d1b4`), je
 * nachdem, ob sie vor oder hinter der Haut liegt. Ohne Körper ist die Ausgabe durchsichtig (darunter kann der Entwurf liegen).
 */

const KACHEL = 32;
const PRIM_BREITE = 2049;
const LISTE_BREITE = 2048;
/**
 * Floats je Kapsel (drei Texel): x0, y0, x1, y1 | r0, r1, Gruppe, Art | z0, z1, –, – (Gerätepunkte; z = Tiefe zum Betrachter).
 * Art = Schicht (0 Tinte, 1 verdeckt, 2 nach Tiefe) + 4 · Form (0 Linie, hart; 1 Punkt, Tropfen, Hals, weich).
 */
export const PRIM_FELDER = 12;

export interface Koerper {
  pos: Float32Array;
  normal: Float32Array;
  index: Uint32Array;
  /** Projektion · Ansicht und Ansicht allein (Spalten, wie WebGL) */
  projektion: Float32Array;
  ansicht: Float32Array;
  /** 0: rein weiß; 1: leichte Stufen */
  schattierung: number;
  /** Breite des Umrisses (Gerätepunkte) */
  umriss: number;
  /** neue Lagen oder Normalen hochladen */
  geaendert: boolean;
  /** Kennung des Netzes: wechselt sie, werden alle Puffer neu angelegt */
  netz: number;
  /** Umlaufsinn der Dreiecke von außen gesehen: 1 gegen den Uhrzeiger, −1 mit ihm */
  wicklung: number;
}

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
  /** der Körper im Raum (sonst durchsichtig) und wie weit eine Kapsel hinter der Haut liegen darf, ohne verdeckt zu sein */
  koerper?: Koerper | null;
  bias?: number;
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
uniform sampler2D uKoerperFarbe;
uniform sampler2D uKoerperTiefe;
uniform int uMitKoerper;
uniform float uBias;
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

vec4 texel(int i) {
  return texelFetch(uPrim, ivec2(i % PB, i / PB), 0);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uHoehe - gl_FragCoord.y);
  ivec2 kc = ivec2(p) / KG;
  uvec2 se = texelFetch(uKachel, kc, 0).xy;
  float tiefe = 1e9;
  vec3 grund = vec3(0.0);
  float grundA = 0.0;
  if (uMitKoerper == 1) {
    tiefe = texelFetch(uKoerperTiefe, ivec2(gl_FragCoord.xy), 0).r;
    grund = texelFetch(uKoerperFarbe, ivec2(gl_FragCoord.xy), 0).rgb;
    grundA = 1.0;
  }
  float fl = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uFelder) break;
    fl = max(fl, glocke(length(p - uFeld[i].xy), uFeld[i].z) * uFeld[i].w);
  }
  float k = uK0 + uK1 * fl;
  // je Schicht (x Tinte, y verdeckt): Linien hart, Punkte und Tropfen weich, dazu der kleinste Einzelabstand und seine Breite
  vec2 dL = vec2(1e6);
  vec2 dB = vec2(1e6);
  vec2 dE = vec2(1e6);
  vec2 wE = vec2(0.0);
  int gruppe = -1;
  int form = 0;
  vec2 gd = vec2(1e6);
  vec2 gw = vec2(0.0);
  for (uint i = 0u; i < se.y; i++) {
    int j = int(se.x + i);
    int idx = int(texelFetch(uListe, ivec2(j % LB, j / LB), 0).r);
    vec4 A = texel(idx * 3);
    vec4 B = texel(idx * 3 + 1);
    int g = int(B.z + 0.5);
    if (g != gruppe) {
      if (gruppe >= 0) {
        if (form == 0) dL = min(dL, gd);
        else { dB.x = smin(dB.x, gd.x, k); dB.y = smin(dB.y, gd.y, k); }
        if (gd.x < dE.x) { dE.x = gd.x; wE.x = gw.x; }
        if (gd.y < dE.y) { dE.y = gd.y; wE.y = gw.y; }
      }
      gruppe = g;
      form = int(B.w + 0.5) / 4;
      gd = vec2(1e6);
    }
    float d = kapsel(p, A.xy, A.zw, B.x, B.y);
    if (d < 2.0 + k) {
      int art = int(B.w + 0.5);
      int schicht = art - 4 * (art / 4);
      vec2 ba = A.zw - A.xy;
      float f = clamp(dot(p - A.xy, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      if (schicht == 2) {
        vec4 C = texel(idx * 3 + 2);
        float z = mix(C.x, C.y, f);
        schicht = z > tiefe + uBias ? 1 : 0;
      }
      float w = mix(B.x, B.y, f);
      if (schicht == 0) { if (d < gd.x) { gd.x = d; gw.x = w; } }
      else { if (d < gd.y) { gd.y = d; gw.y = w; } }
    }
  }
  if (gruppe >= 0) {
    if (form == 0) dL = min(dL, gd);
    else { dB.x = smin(dB.x, gd.x, k); dB.y = smin(dB.y, gd.y, k); }
    if (gd.x < dE.x) { dE.x = gd.x; wE.x = gw.x; }
    if (gd.y < dE.y) { dE.y = gd.y; wE.y = gw.y; }
  }
  float d0 = smin(dL.x, dB.x, k);
  float d1 = smin(dL.y, dB.y, k);
  // wo das weiche Minimum die Form verdickt, gilt die Verdickung als Breite
  float aG = deckung(d1, wE.y + max(dE.y - d1, 0.0));
  float aI = deckung(d0, wE.x + max(dE.x - d0, 0.0));
  vec3 c = grund * grundA;
  float a = grundA;
  c = uGruen * aG + c * (1.0 - aG);
  a = aG + a * (1.0 - aG);
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

/** Körper: Hülle (Umriss) und Haut; zweite Ausgabe ist die Tiefe zum Betrachter */
const KOERPER_VERTEX = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
uniform mat4 uProj;
uniform mat4 uAnsicht;
uniform float uHuelle;
uniform vec2 uViewport;
out vec3 vNormal;
out float vTiefe;
void main() {
  vec4 clip = uProj * vec4(aPos, 1.0);
  vec4 v = uAnsicht * vec4(aPos, 1.0);
  vTiefe = -v.z;
  vNormal = (uAnsicht * vec4(aNormal, 0.0)).xyz;
  if (uHuelle > 0.0) {
    vec2 n = (uProj * vec4(aNormal, 0.0)).xy;
    float l = length(n);
    if (l > 1e-6) clip.xy += n / l * uHuelle * 2.0 / uViewport * clip.w;
  }
  gl_Position = clip;
}
`;

const KOERPER_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vNormal;
in float vTiefe;
uniform float uHuelle;
uniform float uSchattierung;
uniform vec3 uTinte;
layout(location = 0) out vec4 farbe;
layout(location = 1) out vec4 tiefe;
void main() {
  if (uHuelle > 0.0) {
    farbe = vec4(uTinte, 1.0);
  } else {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float l = dot(n, normalize(vec3(-0.35, 0.55, 0.75)));
    // leichte Stufen wie gedruckt: weiß, ein helles Grau, ein etwas dunkleres
    float stufe = l > 0.35 ? 0.0 : (l > -0.15 ? 1.0 : 2.0);
    vec3 c = mix(vec3(1.0), vec3(0.93, 0.925, 0.915), clamp(stufe, 0.0, 1.0));
    c = mix(c, vec3(0.875, 0.87, 0.86), clamp(stufe - 1.0, 0.0, 1.0));
    farbe = vec4(mix(vec3(1.0), c, uSchattierung), 1.0);
  }
  tiefe = vec4(vTiefe, 0.0, 0.0, 1.0);
}
`;

function shader(gl: WebGL2RenderingContext, art: number, quelle: string): WebGLShader {
  const s = gl.createShader(art)!;
  gl.shaderSource(s, quelle);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader: ${gl.getShaderInfoLog(s) ?? ''}`);
  return s;
}

function programm(gl: WebGL2RenderingContext, v: string, f: string, attribute: string[]): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, v));
  gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, f));
  attribute.forEach((a, i) => gl.bindAttribLocation(p, i, a));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Programm: ${gl.getProgramInfoLog(p) ?? ''}`);
  return p;
}

export class FluessigeAnzeige {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private progK: WebGLProgram;
  private vaoQuad: WebGLVertexArrayObject;
  private texPrim: WebGLTexture;
  private texKachel: WebGLTexture;
  private texListe: WebGLTexture;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private uniK: Record<string, WebGLUniformLocation | null> = {};
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
  /** Körper: Puffer und Ziel (Farbe, Tiefe) */
  private k: {
    vao: WebGLVertexArrayObject;
    pos: WebGLBuffer;
    normal: WebGLBuffer;
    index: WebGLBuffer;
    anzahl: number;
    netz: number;
    fb: WebGLFramebuffer | null;
    farbe: WebGLTexture | null;
    tiefe: WebGLTexture | null;
    rb: WebGLRenderbuffer | null;
    b: number;
    h: number;
  } | null = null;
  private tiefeLesen = new Float32Array(4);
  /** zuletzt: Kapseln, Einträge in den Kacheln, Zeit fürs Verteilen (ms) */
  stat = { kapseln: 0, eintraege: 0, verteilenMs: 0 };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) throw new Error('WebGL2 fehlt');
    this.gl = gl;
    gl.getExtension('EXT_color_buffer_float');
    this.prog = programm(gl, VERTEX, FRAGMENT, ['aPos']);
    for (const n of ['uPrim', 'uKachel', 'uListe', 'uKoerperFarbe', 'uKoerperTiefe', 'uMitKoerper', 'uBias', 'uHoehe', 'uK0', 'uK1', 'uFelder', 'uFeld', 'uTinte', 'uGruen', 'uZeigerDa', 'uZA', 'uZB', 'uZC', 'uZLinie'])
      this.uni[n] = gl.getUniformLocation(this.prog, n);
    this.progK = programm(gl, KOERPER_VERTEX, KOERPER_FRAGMENT, ['aPos', 'aNormal']);
    for (const n of ['uProj', 'uAnsicht', 'uHuelle', 'uViewport', 'uSchattierung', 'uTinte']) this.uniK[n] = gl.getUniformLocation(this.progK, n);
    this.vaoQuad = gl.createVertexArray()!;
    gl.bindVertexArray(this.vaoQuad);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
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

  /** Tiefe der Haut (zum Betrachter) in einem Fenster um (x, y), Gerätepunkte; 1e9 = keine Haut. Nur nach einem Bild mit Körper. */
  tiefeBei(x: number, y: number, r: number): { x0: number; y0: number; b: number; h: number; tiefe: Float32Array } | null {
    const k = this.k;
    if (!k?.fb) return null;
    const gl = this.gl;
    const x0 = Math.max(0, Math.floor(x - r));
    const y0 = Math.max(0, Math.floor(y - r));
    const x1 = Math.min(this.breite, Math.ceil(x + r));
    const y1 = Math.min(this.hoehe, Math.ceil(y + r));
    const b = x1 - x0;
    const h = y1 - y0;
    if (b <= 0 || h <= 0) return null;
    if (this.tiefeLesen.length < b * h * 4) this.tiefeLesen = new Float32Array(b * h * 4);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, k.fb);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(x0, this.hoehe - y1, b, h, gl.RGBA, gl.FLOAT, this.tiefeLesen);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    const t = new Float32Array(b * h);
    // Zeilen von unten nach oben gelesen: umdrehen
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < b; xx++) t[yy * b + xx] = this.tiefeLesen[((h - 1 - yy) * b + xx) * 4]!;
    return { x0, y0, b, h, tiefe: t };
  }

  private koerperZeichnen(kd: Koerper): void {
    const gl = this.gl;
    if (!this.k || this.k.netz !== kd.netz) {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const pos = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, pos);
      gl.bufferData(gl.ARRAY_BUFFER, kd.pos, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      const normal = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, normal);
      gl.bufferData(gl.ARRAY_BUFFER, kd.normal, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      const index = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, kd.index, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const alt = this.k;
      this.k = { vao, pos, normal, index, anzahl: kd.index.length, netz: kd.netz, fb: alt?.fb ?? null, farbe: alt?.farbe ?? null, tiefe: alt?.tiefe ?? null, rb: alt?.rb ?? null, b: alt?.b ?? 0, h: alt?.h ?? 0 };
      kd.geaendert = false;
    } else if (kd.geaendert) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.k.pos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, kd.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.k.normal);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, kd.normal);
      kd.geaendert = false;
    }
    const k = this.k;
    // Ziel in der Größe der Leinwand: Farbe, Tiefe zum Betrachter (Gleitkomma), Tiefenpuffer
    if (!k.fb || k.b !== this.breite || k.h !== this.hoehe) {
      if (k.fb) gl.deleteFramebuffer(k.fb);
      if (k.farbe) gl.deleteTexture(k.farbe);
      if (k.tiefe) gl.deleteTexture(k.tiefe);
      if (k.rb) gl.deleteRenderbuffer(k.rb);
      const t = (intern: number, format: number, typ: number): WebGLTexture => {
        const x = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, x);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, intern, this.breite, this.hoehe, 0, format, typ, null);
        return x;
      };
      k.farbe = t(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
      k.tiefe = t(gl.R32F, gl.RED, gl.FLOAT);
      k.rb = gl.createRenderbuffer()!;
      gl.bindRenderbuffer(gl.RENDERBUFFER, k.rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, this.breite, this.hoehe);
      k.fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, k.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, k.farbe, 0);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, k.tiefe, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, k.rb);
      k.b = this.breite;
      k.h = this.hoehe;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, k.fb);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, this.breite, this.hoehe);
    gl.clearBufferfv(gl.COLOR, 0, [1, 1, 1, 1]);
    gl.clearBufferfv(gl.COLOR, 1, [1e9, 0, 0, 1]);
    gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.useProgram(this.progK);
    gl.uniformMatrix4fv(this.uniK.uProj!, false, kd.projektion);
    gl.uniformMatrix4fv(this.uniK.uAnsicht!, false, kd.ansicht);
    gl.uniform2f(this.uniK.uViewport!, this.breite, this.hoehe);
    gl.uniform1f(this.uniK.uSchattierung!, kd.schattierung);
    gl.uniform3f(this.uniK.uTinte!, 0x1f / 255, 0x1a / 255, 0x17 / 255);
    gl.bindVertexArray(k.vao);
    // erst die Hülle (der Umriss), dann die Haut
    // die Hülle nur mit ihren Rückseiten: So liegt sie hinter der Haut und schaut nur am Rand (Umriss, Falten) hervor
    if (kd.umriss > 0) {
      gl.enable(gl.CULL_FACE);
      gl.frontFace(kd.wicklung >= 0 ? gl.CCW : gl.CW);
      gl.cullFace(gl.FRONT);
      gl.uniform1f(this.uniK.uHuelle!, kd.umriss);
      gl.drawElements(gl.TRIANGLES, k.anzahl, gl.UNSIGNED_INT, 0);
      gl.disable(gl.CULL_FACE);
    }
    gl.uniform1f(this.uniK.uHuelle!, 0);
    gl.drawElements(gl.TRIANGLES, k.anzahl, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  zeichnen(sz: Szene): void {
    const gl = this.gl;
    if (sz.koerper) this.koerperZeichnen(sz.koerper);
    const t0 = performance.now();
    const n = sz.anzahl;
    const P = sz.prim;
    // Kapseln auf Kacheln verteilen (Rand: weichste Stelle + ein Bildpunkt)
    const rand = sz.k0 + sz.k1 + 2.5;
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
    // Kapseln: je drei Texel
    const primH = Math.max(1, Math.ceil((n * 3) / PRIM_BREITE));
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.breite, this.hoehe);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    const binde = (einheit: number, t: WebGLTexture | null, name: string): void => {
      gl.activeTexture(gl.TEXTURE0 + einheit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(this.uni[name]!, einheit);
    };
    binde(0, this.texPrim, 'uPrim');
    binde(1, this.texKachel, 'uKachel');
    binde(2, this.texListe, 'uListe');
    const mit = !!sz.koerper && !!this.k?.fb;
    // ohne Körper zeigen die Einheiten 3 und 4 auf eine harmlose Textur (der Shader liest sie dann nicht)
    binde(3, mit ? this.k!.farbe : this.texPrim, 'uKoerperFarbe');
    binde(4, mit ? this.k!.tiefe : this.texPrim, 'uKoerperTiefe');
    gl.uniform1i(this.uni.uMitKoerper!, mit ? 1 : 0);
    gl.uniform1f(this.uni.uBias!, sz.bias ?? 0);
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
    gl.bindVertexArray(this.vaoQuad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}
