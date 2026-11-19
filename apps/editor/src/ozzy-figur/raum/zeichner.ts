// Ozzy im Raum (Beweis 3D): zeichnet die Figur flach schwarz, ohne Licht, ohne Outline; das Weiß aus Florians Zeichnungen. Unter dem
// Winkel ψ mischt der Zeichner das Weiß der beiden nächsten Schlüsselansichten (Front, rechte Seite, Rücken, linke Seite = Seite
// gespiegelt), jedes nur dort, wo seine Ansicht die Fläche sieht (je Schlüsselansicht ein Tiefenbild, wie bei Schatten) und umso
// mehr, je gerader die Fläche zu ihr schaut. Die fernen Paarteile (Beine, Ohr) bildet er beim Blick von der Seite so ab, wie Florian
// sie zeichnet.
import * as THREE from 'three';
import type { Bau } from './bau';
import type { Maske } from './masken';

export const SCHLUESSEL = [0, 90, 180, 270] as const;
/** Auflösung der Tiefenbilder der Schlüsselansichten */
const TIEFE_GROESSE = 1024;

/** Bildausschnitt in Körperkoordinaten: Mitte (x, Y) und halbe Breite und Höhe */
export interface Rahmen {
  cx: number;
  cy: number;
  hb: number;
  hh: number;
}

const ECKEN = /* glsl */ `
  precision highp float;
  in vec3 position;
  in float paar;
  in float paarW;
  in float seite;
  in float teil;
  in vec3 normale;
  out float vTeil;
  out vec3 vNormale;
  uniform float psi;
  uniform vec4 rahmen;
  uniform vec4 nah[4];
  uniform vec4 fern[4];
  out vec2 vFront;
  out vec2 vRechts;
  out vec2 vRuecken;
  out vec2 vLinks;
  out vec3 vRest;
  vec2 fernAb(vec2 zy, int i, float w) {
    vec4 n = i == 1 ? nah[1] : i == 2 ? nah[2] : nah[3];
    vec4 f = i == 1 ? fern[1] : i == 2 ? fern[2] : fern[3];
    vec2 m = f.xy + (zy - n.xy) * f.zw / n.zw;
    return mix(zy, m, w);
  }
  void main() {
    vec3 p = position;
    int i = int(paar + 0.5);
    float sn = sin(psi);
    float c = cos(psi);
    float fernSeite = sn >= 0.0 ? 1.0 : -1.0;
    vec3 q = p;
    if (i > 0 && abs(seite - fernSeite) < 0.5) q.zy = fernAb(p.zy, i, paarW * sn * sn);
    vFront = p.xy;
    vRuecken = vec2(-p.x, p.y);
    vRechts = (i > 0 && seite > 0.5) ? fernAb(p.zy, i, paarW) : p.zy;
    vLinks = (i > 0 && seite < -0.5) ? fernAb(p.zy, i, paarW) : p.zy;
    vRest = p;
    vTeil = teil;
    vNormale = normale;
    float sx = q.x * c + q.z * sn;
    float tiefe = -q.x * sn + q.z * c;
    gl_Position = vec4((sx - rahmen.x) / rahmen.z, -(q.y - rahmen.y) / rahmen.w, -tiefe / 2000.0, 1.0);
  }
`;

const FLAECHE = /* glsl */ `
  precision highp float;
  uniform sampler2D mFront;
  uniform sampler2D mSeite;
  uniform sampler2D mRuecken;
  uniform vec4 gFront;
  uniform vec4 gSeite;
  uniform vec4 gRuecken;
  uniform vec4 gewicht;
  uniform float mitWeiss;
  in vec2 vFront;
  in vec2 vRechts;
  in vec2 vRuecken;
  in vec2 vLinks;
  in vec3 vRest;
  in float vTeil;
  in vec3 vNormale;
  uniform float bunt;
  uniform float mitSicht;
  uniform float fest;
  uniform sampler2D tiefe0;
  uniform sampler2D tiefe1;
  uniform sampler2D tiefe2;
  uniform sampler2D tiefe3;
  uniform vec4 tiefeRahmen;
  out vec4 farbe;
  // sieht die Schlüsselansicht diesen Punkt? (Bild x, Bild Y, Tiefe zur Kamera in dieser Ansicht, wie gerade die Fläche zu ihr
  // schaut). Der Abstand wächst mit der Schräge (sonst flackert der Vergleich auf schrägen Flächen in feinen Streifen), verglichen wird
  // weich über vier Nachbarn des Tiefenbilds
  float sieht(sampler2D t, float sx, float y, float tiefe, float c) {
    vec2 uv = vec2((sx - tiefeRahmen.x) / tiefeRahmen.z, -(y - tiefeRahmen.y) / tiefeRahmen.w) * 0.5 + 0.5;
    float d = 0.5 - tiefe / 4000.0;
    float cc = clamp(c, 0.15, 1.0);
    float abstand = (1.5 + 3.0 * sqrt(1.0 - cc * cc) / cc) / 4000.0;
    vec2 px = 1.0 / vec2(textureSize(t, 0));
    float v = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 o = (vec2(float(i & 1), float(i >> 1)) - 0.5) * px;
      float vorn = texture(t, uv + o).r;
      v += 1.0 - smoothstep(abstand, 2.0 * abstand, d - vorn);
    }
    return v * 0.25;
  }
  float lesen(sampler2D t, vec4 g, vec2 q) {
    vec2 uv = (q - g.xy) / g.zw;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 50.0;
    return texture(t, uv).r;
  }
  void main() {
    // je Ansicht nur dort, wo sie die Fläche sieht, und umso mehr, je gerader die Fläche zu ihr schaut (die Front zieht sonst auf
    // seitlichen Flächen Streifen); an den Schlüsselwinkeln zählt nur eine Ansicht, dort gilt genau Florians Zeichnung
    vec3 n = normalize(vNormale);
    vec4 richtung = vec4(max(n.z, 0.0), max(-n.x, 0.0), max(-n.z, 0.0), max(n.x, 0.0));
    // fest: das Weiß als feste Bemalung (jede Fläche nach der Ansicht, zu der sie schaut, unabhängig vom Blick); sonst nach dem Blick
    vec4 gw = fest > 0.5 ? vec4(1.0) : gewicht;
    vec4 sicht = vec4(1.0);
    if (mitSicht > 0.5) {
      sicht = vec4(
        gw.x > 0.0 ? sieht(tiefe0, vRest.x, vRest.y, vRest.z, richtung.x) : 0.0,
        gw.y > 0.0 ? sieht(tiefe1, vRechts.x, vRechts.y, -vRest.x, richtung.y) : 0.0,
        gw.z > 0.0 ? sieht(tiefe2, -vRest.x, vRest.y, -vRest.z, richtung.z) : 0.0,
        gw.w > 0.0 ? sieht(tiefe3, -vLinks.x, vLinks.y, vRest.x, richtung.w) : 0.0);
    }
    vec4 r2 = richtung * richtung;
    vec4 w = gw * sicht * (fest > 0.5 ? r2 * r2 * r2 : r2);
    float summe = w.x + w.y + w.z + w.w;
    // Flächen, die keine Ansicht gerade sieht (Stufen nach oben oder unten): die Ansichten nach ihrem Gewicht allein
    vec4 w2 = gw * sicht;
    float s2 = w2.x + w2.y + w2.z + w2.w;
    float k = smoothstep(0.0, 0.05, summe);
    w = mix(w2 / max(s2, 1e-6), w / max(summe, 1e-6), k) * step(1e-3, s2);
    summe = w.x + w.y + w.z + w.w;
    float m = 50.0;
    if (summe > 1e-3) {
      float a = w.x > 0.0 ? lesen(mFront, gFront, vFront) : 0.0;
      float b = w.y > 0.0 ? lesen(mSeite, gSeite, vRechts) : 0.0;
      float r = w.z > 0.0 ? lesen(mRuecken, gRuecken, vRuecken) : 0.0;
      float l = w.w > 0.0 ? lesen(mSeite, gSeite, vLinks) : 0.0;
      m = (w.x * a + w.y * b + w.z * r + w.w * l) / summe;
    }
    float aa = max(fwidth(m), 1e-4) * 0.75;
    float weiss = smoothstep(aa, -aa, m) * mitWeiss;
    farbe = vec4(vec3(weiss), 1.0);
    if (bunt > 0.5) farbe = vec4(0.5 + 0.5 * cos(6.2832 * (vTeil / 12.0 + vec3(0.0, 0.33, 0.67))), 1.0);
  }
`;

function textur(m: Maske): { t: THREE.DataTexture; g: THREE.Vector4 } {
  const daten = new Uint16Array(m.feld.length);
  for (let i = 0; i < m.feld.length; i++) daten[i] = THREE.DataUtils.toHalfFloat(Math.max(-40, Math.min(40, m.feld[i]!)));
  const t = new THREE.DataTexture(daten, m.g.b, m.g.h, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return { t, g: new THREE.Vector4(m.g.x0, m.g.y0, m.g.b * m.g.s, m.g.h * m.g.s) };
}

/** Gewichte der Schlüsselansichten beim Blick ψ (Grad): die beiden nächsten, weich übergeblendet */
export function gewichte(psi: number): [number, number, number, number] {
  const p = ((psi % 360) + 360) % 360;
  const out: [number, number, number, number] = [0, 0, 0, 0];
  const i = Math.floor(p / 90) % 4;
  const t = (p - SCHLUESSEL[i]!) / 90;
  const s = t * t * (3 - 2 * t);
  out[i] = 1 - s;
  out[(i + 1) % 4] = s;
  return out;
}

export class RaumZeichner {
  readonly renderer: THREE.WebGLRenderer;
  private readonly szene = new THREE.Scene();
  private readonly kamera = new THREE.Camera();
  private readonly material: THREE.RawShaderMaterial;
  /** größter Abstand einer Ecke von der Drehachse und Höhenbereich (für einen festen Rahmen über alle Winkel) */
  readonly umfang: { r: number; y0: number; y1: number };

  constructor(readonly canvas: HTMLCanvasElement, bau: Bau) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0xffffff, 1);
    const n = bau.netz;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(n.lagen, 3));
    geo.setAttribute('paar', new THREE.BufferAttribute(n.paar, 1));
    geo.setAttribute('paarW', new THREE.BufferAttribute(n.paarW, 1));
    geo.setAttribute('seite', new THREE.BufferAttribute(n.seite, 1));
    geo.setAttribute('teil', new THREE.BufferAttribute(new Float32Array(n.teil), 1));
    geo.setAttribute('normale', new THREE.BufferAttribute(n.normalen, 3));
    geo.setIndex(new THREE.BufferAttribute(n.dreiecke, 1));
    const f = textur(bau.masken.front);
    const s = textur(bau.masken.seite);
    const r = textur(bau.masken.ruecken);
    const vec = (k: number[]): THREE.Vector4 => new THREE.Vector4(k[0], k[1], k[2], k[3]);
    this.material = new THREE.RawShaderMaterial({
      vertexShader: ECKEN,
      fragmentShader: FLAECHE,
      glslVersion: THREE.GLSL3,
      side: THREE.DoubleSide,
      uniforms: {
        psi: { value: 0 },
        rahmen: { value: new THREE.Vector4(0, -200, 250, 250) },
        nah: { value: bau.karten.map((k) => vec(k.nah)) },
        fern: { value: bau.karten.map((k) => vec(k.fern)) },
        mFront: { value: f.t },
        mSeite: { value: s.t },
        mRuecken: { value: r.t },
        gFront: { value: f.g },
        gSeite: { value: s.g },
        gRuecken: { value: r.g },
        gewicht: { value: new THREE.Vector4(1, 0, 0, 0) },
        mitWeiss: { value: 1 },
        bunt: { value: 0 },
        mitSicht: { value: 1 },
        fest: { value: 0 },
        tiefe0: { value: null },
        tiefe1: { value: null },
        tiefe2: { value: null },
        tiefe3: { value: null },
        tiefeRahmen: { value: new THREE.Vector4(0, -200, 250, 250) },
      },
    });
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.frustumCulled = false;
    this.szene.add(mesh);
    this.netz = mesh;
    let rr = 0;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < n.lagen.length; i += 3) {
      rr = Math.max(rr, Math.hypot(n.lagen[i]!, n.lagen[i + 2]!));
      y0 = Math.min(y0, n.lagen[i + 1]!);
      y1 = Math.max(y1, n.lagen[i + 1]!);
    }
    this.umfang = { r: rr, y0, y1 };
    this.tiefenbilder();
  }

  private readonly netz: THREE.Mesh;

  /** je Schlüsselansicht ein Tiefenbild der Figur, wie diese Ansicht sie sieht (mit den fernen Teilen wie gezeichnet) */
  private tiefenbilder(): void {
    const u = this.umfang;
    const r = Math.max(u.r, (u.y1 - u.y0) / 2) * 1.05;
    const rahmen = new THREE.Vector4(0, (u.y0 + u.y1) / 2, r, r);
    const mat = new THREE.RawShaderMaterial({
      vertexShader: ECKEN,
      fragmentShader: 'precision highp float; out vec4 farbe; void main() { farbe = vec4(1.0); }',
      glslVersion: THREE.GLSL3,
      side: THREE.DoubleSide,
      uniforms: { psi: { value: 0 }, rahmen: { value: rahmen }, nah: this.material.uniforms.nah!, fern: this.material.uniforms.fern! },
    });
    this.netz.material = mat;
    SCHLUESSEL.forEach((psi, i) => {
      const ziel = new THREE.WebGLRenderTarget(TIEFE_GROESSE, TIEFE_GROESSE, { depthBuffer: true });
      ziel.depthTexture = new THREE.DepthTexture(TIEFE_GROESSE, TIEFE_GROESSE, THREE.UnsignedIntType);
      mat.uniforms.psi!.value = (psi * Math.PI) / 180;
      this.renderer.setRenderTarget(ziel);
      this.renderer.render(this.szene, this.kamera);
      this.material.uniforms[`tiefe${i}`]!.value = ziel.depthTexture;
    });
    this.renderer.setRenderTarget(null);
    this.netz.material = this.material;
    (this.material.uniforms.tiefeRahmen!.value as THREE.Vector4).copy(rahmen);
  }

  /** fester Rahmen über alle Winkel für eine Fläche b × h (Bildpunkte) mit Rand */
  rahmenFuer(b: number, h: number, rand = 0.06): Rahmen {
    const u = this.umfang;
    const cy = (u.y0 + u.y1) / 2;
    let hb = u.r * (1 + rand);
    let hh = ((u.y1 - u.y0) / 2) * (1 + rand);
    if (hb / hh < b / h) hb = (hh * b) / h;
    else hh = (hb * h) / b;
    return { cx: 0, cy, hb, hh };
  }

  /** Sichtbarkeit der Schlüsselansichten beachten (aus: zum Prüfen) */
  set sicht(an: boolean) {
    this.material.uniforms.mitSicht!.value = an ? 1 : 0;
  }

  /** Weiß als feste Bemalung (unabhängig vom Blickwinkel) statt nach dem Blick gemischt */
  set fest(an: boolean) {
    this.material.uniforms.fest!.value = an ? 1 : 0;
  }

  /** Teile farbig (zum Prüfen) */
  set bunt(an: boolean) {
    this.material.uniforms.bunt!.value = an ? 1 : 0;
  }

  /** Weiß zeigen (aus: nur die schwarze Form, zum Prüfen) */
  set weiss(an: boolean) {
    this.material.uniforms.mitWeiss!.value = an ? 1 : 0;
  }

  zeichne(psi: number, rahmen: Rahmen): void {
    const u = this.material.uniforms;
    u.psi!.value = (psi * Math.PI) / 180;
    (u.rahmen!.value as THREE.Vector4).set(rahmen.cx, rahmen.cy, rahmen.hb, rahmen.hh);
    (u.gewicht!.value as THREE.Vector4).set(...gewichte(psi));
    this.renderer.render(this.szene, this.kamera);
  }

  groesse(b: number, h: number, dpr = 1): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(b, h, false);
  }
}
