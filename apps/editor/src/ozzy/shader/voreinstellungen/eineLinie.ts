/**
 * Eine Linie (frei; Florians Vorlage vom 20.11.: „ein shader der aus nur einer linie besteht die sich ständig flüssig so verformt,
 * dass das eigentliche shading entsteht. lauter kurven die sich ständig verändern in verschiedenen größen wechselnd und sich dabei
 * nicht berühren“).
 *
 * Eine einzige geschlossene Linie, die im Bild wächst und sich faltet, ohne sich je zu berühren (Rechnung in `linieSim.ts`, im
 * Worker). Je Bild zeichnet die Grafikkarte eine kleine Karte der Form: Helligkeit (das Licht von oben links, am Rand dunkler, damit
 * sich der Umriss aus der Linie bildet), Deckung und die Bewegung seit der letzten Karte. Der Worker nimmt die Linie mit der Bewegung
 * mit (sie klebt an der Form, wenn sie sich dreht), lässt sie wachsen, wo Platz ist, und zieht sie zurück, wo es heller wird. Der
 * Abstand atmet langsam: Kurven wechseln ihre Größe, auch wenn die Form still steht.
 *
 * Gezeichnet wird jedes Stück als Kapsel mit weicher Kante; Stücke werden mit „Maximum“ übereinandergelegt (keine dunkleren Knoten).
 */
import {
  BufferAttribute,
  CustomBlending,
  DynamicDrawUsage,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix4,
  MaxEquation,
  Mesh,
  OneFactor,
  OrthographicCamera,
  RawShaderMaterial,
  Scene,
  type Texture,
  Vector2,
  Vector3,
} from 'three';
import { FARBE, NETZ_FRAGMENT_KOPF, RAUSCHEN } from '../glsl';
import { DoubleSide, type ShaderKern, type ShaderLauf, type ShaderWerte, type Voreinstellung } from '../kern';

const KAP = 60000;
/** Prüfhilfen: `?linieKarte=1` zeigt die Karte unter der Linie, `?linieMit=0` nimmt die Linie nicht mit der Bewegung mit */
const PRUEF = ((): { karte: boolean; mit: boolean } => {
  const p = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  return { karte: p.get('linieKarte') === '1', mit: p.get('linieMit') !== '0' };
})();

const KARTE_VERTEX = /* glsl */ `
precision highp float;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 uVorherVP;
in vec3 position;
in vec3 normal;
in float aSeite;
out vec3 vWelt;
out vec3 vNormal;
out vec3 vSicht;
out vec2 vSpiegel;
out vec4 vJetzt;
out vec4 vVorher;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWelt = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 s = viewMatrix * w;
  vSicht = s.xyz;
  vSpiegel = vec2(aSeite, position.z);
  gl_Position = projectionMatrix * s;
  vJetzt = gl_Position;
  vVorher = uVorherVP * w;
}
`;

const KARTE_FRAGMENT = /* glsl */ `
${NETZ_FRAGMENT_KOPF}
uniform mat4 uViewInv;
uniform vec2 uKarte;
uniform float uKontrast;
uniform vec2 uTiefe;
in vec4 vJetzt;
in vec4 vVorher;
out vec4 farbe;
void main() {
  if (geschnitten()) discard;
  vec3 n = normaleJetzt();
  vec3 L = normalize((uViewInv * vec4(-0.55, 0.62, 0.55, 0.0)).xyz);
  vec3 V = normalize(cameraPosition - vWelt);
  float ndl = dot(n, L);
  float hell = clamp(0.42 + 0.78 * ndl, 0.0, 1.0);
  // am Rand dunkler: Der Umriss bildet sich aus dichter Linie
  float rand = pow(1.0 - max(dot(n, V), 0.0), 2.5);
  hell *= 1.0 - 0.55 * rand;
  // ein wenig Glanz oben links (die hellste Stelle bleibt fast leer)
  hell = clamp(hell + 0.25 * pow(max(dot(n, normalize(L + V)), 0.0), 18.0), 0.0, 1.0);
  hell = pow(hell, 1.35 * uKontrast);
  // Tiefe in 16 Bit zwischen nah und fern (für die Mitnahme im Worker)
  float t = clamp((-vSicht.z - uTiefe.x) / max(uTiefe.y - uTiefe.x, 1e-6), 0.0, 1.0);
  float t16 = floor(t * 65535.0 + 0.5);
  float hoch = floor(t16 / 256.0);
  farbe = vec4(hell, 1.0, hoch / 255.0, (t16 - hoch * 256.0) / 255.0);
}
`;

const STRICH_VERTEX = /* glsl */ `
precision highp float;
in vec2 ecke;
in vec2 aA;
in vec2 aB;
uniform vec2 uFeld;
uniform float uHalb;
out vec2 vLokal;
out float vLaenge;
void main() {
  vec2 d = aB - aA;
  float l = length(d);
  vec2 t = l > 1e-5 ? d / l : vec2(1.0, 0.0);
  vec2 q = vec2(-t.y, t.x);
  float r = uHalb + 1.5;
  float s = ecke.x * (l + 2.0 * r) - r;
  vec2 p = aA + t * s + q * ecke.y * r;
  vLokal = vec2(s, ecke.y * r);
  vLaenge = l;
  gl_Position = vec4(p / uFeld * 2.0 - 1.0, 0.0, 1.0);
}
`;

const STRICH_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uHalb;
uniform float uDpr;
in vec2 vLokal;
in float vLaenge;
out vec4 farbe;
void main() {
  float a = vLokal.x, b = vLokal.y;
  float d = a < 0.0 ? length(vec2(a, b)) : (a > vLaenge ? length(vec2(a - vLaenge, b)) : abs(b));
  float deckung = clamp((uHalb - d) * uDpr + 0.5, 0.0, 1.0);
  farbe = vec4(deckung, 0.0, 0.0, deckung);
}
`;

const ENDE = /* glsl */ `
${RAUSCHEN}
${FARBE}
uniform sampler2D tTinte;
uniform sampler2D tKarte;
uniform float uKarteZeigen;
uniform float uBuehne;
uniform float uFarbe;
out vec4 farbe;
void main() {
  vec2 cssPx = gl_FragCoord.xy / uDpr;
  float tinte = texture(tTinte, vUv).r;
  if (uKarteZeigen > 0.5) {
    vec4 k = texture(tKarte, vUv);
    farbe = vec4(mix(vec3(k.r * k.g, k.g * 0.3 + (k.b - 0.5) * 4.0, (k.a - 0.5) * 4.0 + 0.2), vec3(1.0, 0.0, 0.0), tinte), 1.0);
    return;
  }
  vec3 papier = vec3(0.985, 0.98, 0.968) * (0.985 + 0.02 * noise2(cssPx * 0.6));
  // Tinte: fast schwarz; mit „Farbe“ wandert sie langsam durch einen Verlauf
  vec3 tinteFarbe = mix(vec3(0.07, 0.065, 0.075), hsv(vec3(fract(cssPx.y * 0.0008 + cssPx.x * 0.0004 + uZeit * 0.02), 0.75, 0.6)), uFarbe);
  vec3 bild = mix(papier, tinteFarbe, tinte);
  float a = uBuehne > 0.5 ? 1.0 : tinte;
  vec3 aus = uBuehne > 0.5 ? bild : tinteFarbe;
  farbe = vec4(aus * a, a);
}
`;

class EineLinie implements ShaderLauf {
  private readonly karte: RawShaderMaterial;
  private readonly strich: RawShaderMaterial;
  private readonly ende: RawShaderMaterial;
  private readonly geo = new InstancedBufferGeometry();
  private readonly aA: InstancedBufferAttribute;
  private readonly aB: InstancedBufferAttribute;
  private readonly szene = new Scene();
  private readonly kamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly worker: Worker;
  private wartet = false;
  private readonly vorherVP = new Matrix4();
  private hatVorher = false;
  private n = 0;
  private neu = false;
  private pos: Float32Array | null = null;
  private feld = new Vector2(1, 1);
  private zuletzt = { n: 0, ms: 0, karten: 0, entwirrt: 0 };
  private tot = false;

  constructor(k: ShaderKern) {
    this.karte = k.netzProgramm(KARTE_FRAGMENT, {
      vertex: KARTE_VERTEX,
      seite: DoubleSide,
      uniforms: { uVorherVP: { value: new Matrix4() }, uKarte: { value: new Vector2(1, 1) }, uKontrast: { value: 1 }, uTiefe: { value: new Vector2(0, 1) } },
    });
    const ecken = new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]);
    this.geo.setAttribute('ecke', new BufferAttribute(ecken, 2));
    this.geo.setIndex([0, 1, 2, 2, 1, 3]);
    this.aA = new InstancedBufferAttribute(new Float32Array(KAP * 2), 2);
    this.aB = new InstancedBufferAttribute(new Float32Array(KAP * 2), 2);
    this.aA.setUsage(DynamicDrawUsage);
    this.aB.setUsage(DynamicDrawUsage);
    this.geo.setAttribute('aA', this.aA);
    this.geo.setAttribute('aB', this.aB);
    this.geo.instanceCount = 0;
    this.strich = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: { uFeld: { value: this.feld }, uHalb: { value: 0.6 }, uDpr: k.u.uDpr },
      vertexShader: STRICH_VERTEX,
      fragmentShader: STRICH_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: CustomBlending,
      blendEquation: MaxEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
    });
    const mesh = new Mesh(this.geo, this.strich);
    mesh.frustumCulled = false;
    this.szene.add(mesh);
    this.ende = k.flaecheProgramm(ENDE, { tTinte: { value: null }, tKarte: { value: null }, uKarteZeigen: { value: PRUEF.karte ? 1 : 0 }, uFarbe: { value: 0 } });
    this.worker = new Worker(new URL('../linie.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<{ art: 'linie'; pos: Float32Array; n: number; ms: number; entwirrt: number }>) => {
      this.pos = e.data.pos;
      this.n = e.data.n;
      this.neu = true;
      this.wartet = false;
      this.zuletzt.n = e.data.n;
      this.zuletzt.ms = e.data.ms;
      this.zuletzt.entwirrt = e.data.entwirrt;
      this.zuletzt.karten++;
    };
  }

  bild(k: ShaderKern, w: ShaderWerte): Texture {
    const cssB = k.b / k.dpr, cssH = k.h / k.dpr;
    // Karte: etwa ein Punkt je drei CSS-Bildpunkte
    const skala = 3;
    const kb = Math.max(8, Math.round(cssB / skala));
    const kh = Math.max(8, Math.round(cssH / skala));
    const sk = cssB / kb;
    this.feld.set(kb * sk, kh * sk);
    const karte = k.ziel('eineLinie:karte', { breite: kb, hoehe: kh, art: 'byte', tiefe: true, filter: 'nearest' });
    if (karte.width !== kb || karte.height !== kh) karte.setSize(kb, kh);
    if (!this.wartet && !this.tot) {
      const u = this.karte.uniforms;
      const jetzt = k.jetztViewProj;
      (u.uVorherVP!.value as Matrix4).copy(this.hatVorher ? this.vorherVP : jetzt);
      (u.uKarte!.value as Vector2).set(kb, kh);
      u.uKontrast!.value = w.regler.kontrast ?? 1;
      const kamPos = new Vector3().setFromMatrixPosition(k.kamera.matrixWorld);
      const zc = kamPos.distanceTo(k.u.uMitte.value);
      const R = k.u.uRadius.value * 1.05;
      const nah = Math.max(0, zc - R), fern = zc + R;
      (u.uTiefe!.value as Vector2).set(nah, fern);
      const kamera = {
        vp: new Float32Array(jetzt.elements),
        vpInv: new Float32Array(new Matrix4().copy(jetzt).invert().elements),
        sicht: new Float32Array(k.kamera.matrixWorldInverse.elements),
        nah,
        fern,
      };
      k.netz(this.karte, karte, [1, 0, 0, 0]);
      this.vorherVP.copy(jetzt);
      this.hatVorher = true;
      this.wartet = true;
      const daten = new Uint8Array(kb * kh * 4);
      k.r
        .readRenderTargetPixelsAsync(karte, 0, 0, kb, kh, daten)
        .then(() => {
          if (this.tot) return;
          const dichte = w.regler.dichte ?? 1;
          // der Abstand wächst mit der Form im Bild: bei jedem Zoom dasselbe Bild (wie eine Zeichnung, nicht wie ein Muster)
          const rPx = this.formRadiusPx(k);
          this.worker.postMessage(
            {
              art: 'karte',
              daten,
              kb,
              kh,
              skala: sk,
              zeit: w.zeit * (w.regler.tempo ?? 1),
              mit: PRUEF.mit,
              kamera,
              werte: { dMin: Math.max(2.0, rPx * 0.0085) * dichte, dMax: Math.max(8, rPx * 0.036) * dichte, gamma: 1.1, atmen: w.regler.atmen ?? 0.6, schritte: Math.round(4 * (w.regler.tempo ?? 1)) },
            },
            [daten.buffer],
          );
        })
        .catch(() => {
          this.wartet = false;
        });
    }
    // die Linie als Kapseln
    if (this.neu && this.pos) {
      const n = Math.min(this.n, KAP);
      const a = this.aA.array as Float32Array, b = this.aB.array as Float32Array, p = this.pos;
      for (let i = 0; i < n; i++) {
        const j = i === n - 1 ? 0 : i + 1;
        a[2 * i] = p[2 * i]!;
        a[2 * i + 1] = p[2 * i + 1]!;
        b[2 * i] = p[2 * j]!;
        b[2 * i + 1] = p[2 * j + 1]!;
      }
      this.aA.clearUpdateRanges();
      this.aB.clearUpdateRanges();
      this.aA.addUpdateRange(0, n * 2);
      this.aB.addUpdateRange(0, n * 2);
      this.aA.needsUpdate = true;
      this.aB.needsUpdate = true;
      this.geo.instanceCount = n;
      this.neu = false;
    }
    this.strich.uniforms.uHalb!.value = 0.55 * Math.min(1.7, Math.max(0.85, this.formRadiusPx(k) / 260)) * (w.regler.strich ?? 1);
    const tinte = k.ziel('eineLinie:tinte', { art: 'byte' });
    k.szene(this.szene, this.kamera, tinte, [0, 0, 0, 0]);
    this.ende.uniforms.tTinte!.value = tinte.texture;
    this.ende.uniforms.tKarte!.value = karte.texture;
    this.ende.uniforms.uFarbe!.value = w.regler.farbe ?? 0;
    const z = k.ziel('eineLinie:ende', { art: 'byte' });
    k.flaeche(this.ende, z, [0, 0, 0, 0]);
    return z.texture;
  }

  /** Halbmesser der Form im Bild (CSS-Bildpunkte) */
  private formRadiusPx(k: ShaderKern): number {
    const m = k.u.uMitte.value;
    const rechts = new Vector3(1, 0, 0).transformDirection(k.kamera.matrixWorld).multiplyScalar(k.u.uRadius.value * 0.7).add(m);
    const a = m.clone().project(k.kamera), b = rechts.project(k.kamera);
    return Math.hypot(((b.x - a.x) / 2) * (k.b / k.dpr), ((b.y - a.y) / 2) * (k.h / k.dpr));
  }

  unruhig(): boolean {
    return true;
  }

  info(): Record<string, number> {
    return { ...this.zuletzt };
  }

  freigeben(): void {
    this.tot = true;
    this.worker.terminate();
    this.karte.dispose();
    this.strich.dispose();
    this.ende.dispose();
    this.geo.dispose();
  }
}

export const EINE_LINIE: Voreinstellung = {
  id: 'eineLinie',
  name: 'Eine Linie',
  gruppe: 'Effekte',
  zeile: 'Eine einzige Linie, die wächst, fließt und sich nie berührt; ihr Abstand zu sich selbst ist das Licht',
  regler: [
    { k: 'dichte', name: 'Abstand', min: 0.5, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'kontrast', name: 'Kontrast', min: 0.4, max: 2.5, schritt: 0.05, grund: 1 },
    { k: 'atmen', name: 'Atmen', min: 0, max: 1, schritt: 0.05, grund: 0.6 },
    { k: 'tempo', name: 'Tempo', min: 0.3, max: 3, schritt: 0.1, grund: 1 },
    { k: 'strich', name: 'Strich', min: 0.4, max: 3, schritt: 0.05, grund: 1 },
    { k: 'farbe', name: 'Farbe', min: 0, max: 1, schritt: 0.05, grund: 0 },
  ],
  bauen: (k) => new EineLinie(k),
};
