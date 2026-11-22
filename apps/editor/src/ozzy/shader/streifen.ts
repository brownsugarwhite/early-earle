/**
 * Streifen (22.11.2026, Plan `docs/plans/2026-11-22-ozzy-shader-streifen.md`): alle Shader nebeneinander als schräge Streifen über
 * der Form, zum Durchwischen. Jeder Streifen zeigt die Form mit genau seinem Shader und seiner Bühne.
 *
 * Beim Wischen ändert sich nur, welcher Teil welches Bilds zu sehen ist. Jeder Shader rechnet sein Bild darum für den ganzen Blick,
 * in senkrechten Bahnen (so viele je Bild, wie in den Takt passen; gemessen am Abstand der Bilder), zuerst die Bahnen, die gerade zu
 * sehen sind, dann die Nachbarn in Wischrichtung. Das Wischen setzt nur fertige Bilder zusammen: ein Durchgang mit bis zu zwölf
 * Bildern, harte, geglättete Schnitte. Bewegte Shader rechnen in Ruhe nur den Kasten ihres Streifens nach (Schere im Kern).
 *
 * Übersetzt wird im Hintergrund, die nächsten zuerst (`compileAsync`: paralleles Übersetzen, wo der Browser es kann). Die Programme
 * bleiben in einem Schatten erhalten (eine zweite Hülle je Programm): Ein Shader, der freigegeben wird und wiederkommt, übersetzt
 * nichts mehr. Was noch nicht fertig ist, zeigt die Form in Ton mit einem leichten Schimmer.
 */
import {
  BufferAttribute,
  BufferGeometry,
  type Camera,
  CustomBlending,
  DataTexture,
  GLSL3,
  type IUniform,
  type Material,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  RawShaderMaterial,
  Scene,
  type Texture,
  Vector2,
  type WebGLRenderer,
} from 'three';
import type { HautNetz } from '../../anfang/haut';
import { GDaten } from './daten';
import { FLAECHE_VERTEX } from './glsl';
import { SHADER_GRUPPEN, ShaderKern, type ShaderLauf, type Voreinstellung } from './kern';

/** so viele Streifen setzt ein Durchgang höchstens zusammen */
export const STREIFEN_HOECHSTENS = 12;
/** Schräge der Schnitte: waagerechter Versatz je senkrechtem Punkt (wie Florians Bild: oben rechts nach unten links) */
export const SCHRAEGE = 0.2;
/** senkrechte Bahnen, in denen ein Bild entsteht */
const BAHNEN = 12;
const ALLE_BAHNEN = (1 << BAHNEN) - 1;
/** Rand um eine Bahn (Gerätepunkte): Shader lesen ihre Nachbarn */
const RAND = 48;
/** so viele Streifen links und rechts außerhalb des Bilds werden vorbereitet */
const VORRAT = 3;

export type StreifenWerte = {
  schnitt: [number, number, number, number] | null;
  spiegelSchnitt: number | null;
  flach: boolean;
  buehne: boolean;
  /** Bildpunkte (CSS) je Welteinheit in der Ebene durch die Mitte */
  mass: number;
  /** die Regler eines Shaders (Florians Werte aus der Tafel) */
  regler: (id: string) => Record<string, number>;
};

/** ein Streifen im Bild (für die Namen) */
export type StreifenImBild = { k: number; nr: number; v: Voreinstellung; x: number; bereit: boolean };

type Platz = {
  v: Voreinstellung;
  lauf: ShaderLauf | null;
  /** die Ziele, die er angefasst hat */
  ziele: Set<string>;
  bild: Texture | null;
  /** Bahnen, die für diesen Blick in seinem Bild fertig sind (Bits) */
  bahnen: number;
  /** in wie vielen Stücken das Bild für diesen Blick entstand (mehr als eins: am Ende einmal ganz, wenn Zeit ist) */
  stuecke: number;
  reglerText: string;
  t0: number;
  letzte: number;
  unruhig: boolean;
  /** Nummer des Bilds, in dem er zuletzt zu sehen oder nah war, und in dem er zuletzt rechnete */
  gesehen: number;
  gerechnet: number;
  kaputt: boolean;
  /** noch nie gerechnet seit dem Bau (Probe: die erste Rechnung kostet oft mehr) */
  erst: boolean;
};

type Arbeit = { p: Platz; maske: number; rang: number; ab: number; fokus: number; ganz: boolean };

const ZUSAMMEN = /* glsl */ `
precision highp float;
precision highp int;
${Array.from({ length: STREIFEN_HOECHSTENS }, (_, i) => `uniform sampler2D tB${i};`).join('\n')}
uniform sampler2D tDaten;
uniform float uMaske[${STREIFEN_HOECHSTENS}];
uniform float uL0;
uniform float uB;
uniform float uS;
uniform float uH;
uniform float uDpr;
uniform float uBahn;
uniform float uZeit;
uniform vec2 uAufl;
uniform mat4 uView;
uniform vec3 uLichtSicht;
in vec2 vUv;
out vec4 farbe;

vec4 bildVon(int j, vec2 uv) {
${Array.from({ length: STREIFEN_HOECHSTENS }, (_, i) => `  ${i === 0 ? '' : 'else '}if (j <= ${i}) return texture(tB${i}, uv);`).join('\n')}
  return texture(tB${STREIFEN_HOECHSTENS - 1}, uv);
}

/** was noch nicht fertig ist: die Form in Ton auf dunklem Grund, ein leichter Schimmer zieht schräg durch */
vec4 ton(vec2 uv, float u) {
  float schimmer = 0.5 + 0.5 * sin(u * 0.018 - uZeit * 3.2);
  schimmer = pow(schimmer, 6.0);
  vec3 grund = mix(vec3(0.115, 0.11, 0.105), vec3(0.16, 0.152, 0.145), uv.y) + 0.035 * schimmer;
  vec4 n = texture(tDaten, uv);
  if (n.a < 0.02) return vec4(grund, 1.0);
  vec3 nv = normalize((uView * vec4(normalize(n.xyz + 1e-6), 0.0)).xyz);
  float l = max(dot(nv, normalize(uLichtSicht)), 0.0);
  float rand = pow(1.0 - max(nv.z, 0.0), 2.5);
  vec3 c = vec3(0.70, 0.68, 0.65) * (0.28 + 0.72 * l) + 0.10 * rand + 0.05 * schimmer;
  return vec4(mix(grund, c, clamp(n.a, 0.0, 1.0)), 1.0);
}

vec4 streifen(int j, vec2 uv, float u) {
  j = clamp(j, 0, ${STREIFEN_HOECHSTENS - 1});
  int m = int(uMaske[j] + 0.5);
  int b = int(floor(gl_FragCoord.x / uBahn));
  if (((m >> b) & 1) == 1) return bildVon(j, uv);
  return ton(uv, u);
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, uAufl.y - gl_FragCoord.y) / uDpr;
  float u = css.x + uS * (css.y - 0.5 * uH);
  float s = (u - uL0) / uB;
  int j = int(floor(s));
  float f = (s - floor(s)) * uB;
  vec2 uv = gl_FragCoord.xy / uAufl;
  vec4 c = streifen(j, uv, u);
  // geglättete Schnitte: Abstand zur Kante in Gerätepunkten, auf einem Punkt Breite mit dem Nachbarn gemischt
  float n = sqrt(1.0 + uS * uS);
  float dl = f / n * uDpr;
  float dr = (uB - f) / n * uDpr;
  if (dl < 0.5) c = mix(streifen(j - 1, uv, u), c, 0.5 + dl);
  else if (dr < 0.5) c = mix(streifen(j + 1, uv, u), c, 0.5 + dr);
  farbe = c;
}
`;

const KOPIE = /* glsl */ `
uniform sampler2D tQuelle;
out vec4 farbe;
void main() { farbe = texture(tQuelle, vUv); }
`;

/** alle Materialien in einem Lauf (Felder, Listen, Szenen), auch die, die er nicht über den Kern gebaut hat */
function materialienSuchen(o: unknown, gefunden: Set<Material>, gesehen = new Set<unknown>(), tiefe = 0): void {
  if (!o || typeof o !== 'object' || gesehen.has(o) || tiefe > 5) return;
  gesehen.add(o);
  const x = o as { isMaterial?: boolean; isObject3D?: boolean; isTexture?: boolean; isBufferGeometry?: boolean; isWebGLRenderTarget?: boolean; children?: unknown[]; material?: unknown };
  if (x.isMaterial) {
    gefunden.add(o as Material);
    return;
  }
  if (x.isTexture || x.isBufferGeometry || x.isWebGLRenderTarget || o instanceof ShaderKern || ArrayBuffer.isView(o) || (typeof EventTarget !== 'undefined' && o instanceof EventTarget)) return;
  if (x.isObject3D) {
    materialienSuchen(x.material, gefunden, gesehen, tiefe + 1);
    for (const c of x.children ?? []) materialienSuchen(c, gefunden, gesehen, tiefe + 1);
    return;
  }
  if (o instanceof Map) {
    for (const w of o.values()) materialienSuchen(w, gefunden, gesehen, tiefe + 1);
    return;
  }
  if (Array.isArray(o)) {
    if (o.length > 64 && typeof o[0] !== 'object') return;
    for (const w of o) materialienSuchen(w, gefunden, gesehen, tiefe + 1);
    return;
  }
  for (const k of Object.keys(o)) materialienSuchen((o as Record<string, unknown>)[k], gefunden, gesehen, tiefe + 1);
}

export class ShaderStreifen {
  /** die Shader in der Reihenfolge der Tafel (nach Gruppen) */
  readonly liste: Voreinstellung[];
  private readonly r: WebGLRenderer;
  private kern: ShaderKern | null = null;
  private ton: GDaten | null = null;
  private readonly plaetze = new Map<string, Platz>();
  /** Shader, deren Programme übersetzt im Schatten liegen */
  private readonly uebersetzt = new Set<string>();
  private uebersetzenLaeuft = false;
  private readonly schatten = new Map<string, RawShaderMaterial>();
  private neueProgramme: Material[] = [];
  private zusammen: RawShaderMaterial | null = null;
  private kopie: RawShaderMaterial | null = null;
  private readonly szene = new Scene();
  private readonly mesh: Mesh;
  private readonly kamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly dreieck = new BufferGeometry();
  private readonly leer: DataTexture;
  /** Lage der Streifen (CSS): Versatz längs der Reihe und Breite eines Streifens */
  versatz = 0;
  private breiteWert = 300;
  /** es wird schnell gewischt: bewegte Shader warten */
  schnell = false;
  /** Richtung des Wischens: +1 die Streifen wandern nach links (der Versatz wächst), −1 nach rechts */
  richtung = 1;
  W = 4;
  H = 4;
  D = 1;
  private sichtText = '';
  private bildNr = 0;
  /** Arbeit je Bild in Bahnen (passt sich dem Takt an) */
  private budget = 6;
  private letztesBild = 0;
  private readonly abstaende: number[] = [];
  private tonFertig = false;
  /**
   * Vorwärmen: Shader, die für dieses Netz schon einmal gerechnet haben. Manche rechnen beim ersten Mal lange auf dem Prozessor (das
   * Schuppenfeld der Schlangen rund 0,5 s); das geschieht in Ruhe, nicht beim Wischen.
   */
  private readonly gewaermt = new Set<string>();
  private gewaermtStand = -1;
  /** Zeit der letzten Bewegung der Streifen (ms) */
  private bewegtBis = 0;
  private letzterVersatz = 0;
  /** die Plätze im Bild und in der Nähe (dieses Bild) */
  private readonly imBild = new Set<Platz>();
  private readonly nahe = new Set<Platz>();
  /** meldet, wenn ein Shader fertig übersetzt ist (Anzeige, neues Bild) */
  aenderung: () => void = () => {};
  /** für Proben: Zeiten und Zahlen */
  readonly mess = { ms: 0, bahnen: 0, laeufe: 0, budget: 0, abstand: 0, gewaermt: 0, lebend: 0, bilder: 0 };
  /** Probe: wartet nach jedem Rechnen auf die Grafikkarte und sammelt je Shader Zeit und Bahnen (nur zum Messen) */
  messen = false;
  readonly zeiten = new Map<string, { ms: number; bahnen: number; mal: number; erste: number }>();
  private readonly pixel = new Uint8Array(4);

  constructor(renderer: WebGLRenderer, liste: Voreinstellung[]) {
    this.r = renderer;
    const rang = (v: Voreinstellung): number => SHADER_GRUPPEN.indexOf(v.gruppe);
    this.liste = liste.map((v, i) => ({ v, i })).sort((a, b) => rang(a.v) - rang(b.v) || a.i - b.i).map((x) => x.v);
    this.dreieck.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.mesh = new Mesh(this.dreieck);
    this.mesh.frustumCulled = false;
    this.szene.add(this.mesh);
    this.leer = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    this.leer.needsUpdate = true;
  }

  // ---------- Lage ----------

  get breite(): number {
    return this.breiteWert;
  }

  /** die Breite eines Streifens; `um` (CSS x) bleibt dabei stehen */
  breiteSetzen(b: number, um = this.W / 2): void {
    const min = Math.max(70, (this.W + SCHRAEGE * this.H) / (STREIFEN_HOECHSTENS - 1.5));
    const neu = Math.max(min, Math.min(Math.max(min, this.W * 1.2), b));
    const q = (um + this.versatz) / this.breiteWert;
    this.breiteWert = neu;
    this.versatz = q * neu - um;
  }

  nrVon(k: number): number {
    const n = this.liste.length;
    return ((k % n) + n) % n;
  }

  /** der Streifen unter einem Punkt (CSS) */
  kBei(x: number, y: number): number {
    return Math.floor((x + SCHRAEGE * (y - this.H / 2) + this.versatz) / this.breiteWert);
  }

  /** der Shader in der Mitte des Bilds */
  mitte(): Voreinstellung {
    return this.liste[this.nrVon(this.kBei(this.W / 2, this.H / 2))]!;
  }

  /** der Versatz, bei dem Streifen k in der Mitte steht */
  versatzFuer(k: number): number {
    return (k + 0.5) * this.breiteWert - this.W / 2;
  }

  zentrieren(id: string): void {
    this.versatz = this.versatzFuer(Math.max(0, this.liste.findIndex((v) => v.id === id)));
  }

  private sichtbar(): { k0: number; k1: number } {
    const k0 = Math.floor((-SCHRAEGE * this.H * 0.5 + this.versatz) / this.breiteWert);
    const k1 = Math.floor((this.W + SCHRAEGE * this.H * 0.5 + this.versatz) / this.breiteWert);
    return { k0, k1: Math.min(k1, k0 + STREIFEN_HOECHSTENS - 1) };
  }

  /** Kasten eines Streifens im Bild (CSS x, ungekappt) */
  private kasten(k: number): [number, number] {
    const l = k * this.breiteWert - this.versatz;
    return [l - SCHRAEGE * this.H * 0.5, l + this.breiteWert + SCHRAEGE * this.H * 0.5];
  }

  /** die Streifen im Bild, mit der Mitte jedes Streifens auf der Höhe `y` (CSS) */
  lage(y: number): StreifenImBild[] {
    const { k0, k1 } = this.sichtbar();
    const r: StreifenImBild[] = [];
    for (let k = k0; k <= k1; k++) {
      const nr = this.nrVon(k);
      const v = this.liste[nr]!;
      const p = this.plaetze.get(v.id);
      const x = (k + 0.5) * this.breiteWert - this.versatz - SCHRAEGE * (y - this.H / 2);
      r.push({ k, nr, v, x, bereit: !!p && p.bahnen === ALLE_BAHNEN });
    }
    return r;
  }

  /** wie viele Shader übersetzt sind */
  get uebersetztZahl(): number {
    return this.uebersetzt.size;
  }

  // ---------- an und aus ----------

  an(): void {
    if (this.kern) return;
    // Breite nach dem Fenster: quer etwa vier Streifen wie in Florians Bild, hochkant zweieinhalb
    this.breiteWert = Math.max(110, Math.min(520, this.W / (this.W > this.H ? 4.2 : 2.5)));
    this.breiteSetzen(this.breiteWert);
    const k = new ShaderKern(this.r);
    this.kern = k;
    k.groesse(this.W, this.H, this.D);
    this.ton = new GDaten(k);
    this.tonFertig = false;
    this.gewaermt.clear();
    this.gewaermtStand = -1;
    this.sichtText = '';
    this.zusammen = new RawShaderMaterial({
      glslVersion: GLSL3,
      uniforms: {
        ...Object.fromEntries(Array.from({ length: STREIFEN_HOECHSTENS }, (_, i) => [`tB${i}`, { value: this.leer }])),
        tDaten: { value: null },
        uMaske: { value: new Array<number>(STREIFEN_HOECHSTENS).fill(0) },
        uL0: { value: 0 },
        uB: { value: 300 },
        uS: { value: SCHRAEGE },
        uH: { value: 4 },
        uDpr: { value: 1 },
        uBahn: { value: 1 },
        uZeit: { value: 0 },
        uAufl: { value: new Vector2(4, 4) },
        uView: k.u.uView,
        uLichtSicht: k.u.uLichtSicht,
      } as Record<string, IUniform>,
      vertexShader: FLAECHE_VERTEX,
      fragmentShader: ZUSAMMEN,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
    });
    this.kopie = k.flaecheProgramm(KOPIE, { tQuelle: { value: null } });
    void this.uebersetzenLaufen();
  }

  /** alles freigeben (die Programme bleiben im Schatten) */
  aus(): void {
    for (const p of this.plaetze.values()) this.abbauen(p);
    this.plaetze.clear();
    this.ton?.freigeben();
    this.ton = null;
    this.zusammen?.dispose();
    this.zusammen = null;
    this.kopie?.dispose();
    this.kopie = null;
    this.kern?.freigeben();
    this.kern = null;
  }

  groesse(b: number, h: number, dpr: number): void {
    this.W = b;
    this.H = h;
    this.D = dpr;
    this.kern?.groesse(b, h, dpr);
    this.breiteSetzen(this.breiteWert);
  }

  netzSetzen(netz: HautNetz | null, wicklung: number): void {
    this.kern?.netzSetzen(netz, wicklung);
  }

  /** jedes Bild neu rechnen (Probe) */
  alleNeu(): void {
    this.sichtText = '';
  }

  // ---------- je Bild ----------

  /** setzt die Streifen zusammen und rechnet, was fehlt; true: Es braucht weitere Bilder */
  zeichnen(kamera: Camera, w: StreifenWerte): boolean {
    const k = this.kern;
    if (!k || !k.bereit || !this.ton || !this.zusammen) return false;
    const t0 = performance.now();
    this.takt(t0);
    this.bildNr++;
    if (this.versatz !== this.letzterVersatz) {
      this.letzterVersatz = this.versatz;
      this.bewegtBis = t0;
    }
    if (k.netzStand !== this.gewaermtStand) {
      this.gewaermtStand = k.netzStand;
      this.gewaermt.clear();
    }
    kamera.updateMatrixWorld();
    const sicht = `${k.b}x${k.h}|${k.netzStand}|${w.buehne ? 1 : 0}|${w.flach ? 1 : 0}|${w.schnitt?.join(',') ?? ''}|${w.spiegelSchnitt ?? ''}|${kamera.projectionMatrix.elements.join(',')}|${kamera.matrixWorldInverse.elements.join(',')}`;
    if (sicht !== this.sichtText) {
      this.sichtText = sicht;
      this.tonFertig = false;
      for (const p of this.plaetze.values()) {
        p.bahnen = 0;
        p.stuecke = 0;
      }
    }
    const zurueck = k.zustandMerken();
    let mehr = false;
    try {
      k.bildBeginnen(kamera, { zeit: 0, schnitt: w.schnitt, spiegelSchnitt: w.spiegelSchnitt, flach: w.flach, buehne: w.buehne, mass: w.mass });
      if (!this.tonFertig) {
        // die gemeinsamen Daten (Vorder- und Rückseite) einmal ganz: Bahnen und Kästen lesen sie auch außerhalb ihrer Schere
        k.ausschnitt = null;
        this.ton.zeichnen(k);
        this.ton.rueckseite(k);
        this.tonFertig = true;
      }
      mehr = this.arbeiten(w, t0);
      this.zusammensetzen(t0);
    } finally {
      k.ausschnitt = null;
      k.aufzeichnen = null;
      k.sammeln = null;
      zurueck();
    }
    this.schattenNachtragen();
    this.aufraeumen();
    this.mess.ms = performance.now() - t0;
    this.mess.budget = this.budget;
    this.mess.gewaermt = this.gewaermt.size;
    let lebend = 0;
    let bilder = 0;
    for (const p of this.plaetze.values()) {
      if (p.lauf) lebend++;
      if (p.bild) bilder++;
    }
    this.mess.lebend = lebend;
    this.mess.bilder = bilder;
    return mehr || this.uebersetzenLaeuft;
  }

  /** Abstand der Bilder: Arbeit je Bild nach dem Takt richten */
  private takt(jetzt: number): void {
    const d = jetzt - this.letztesBild;
    this.letztesBild = jetzt;
    if (!(d > 0 && d < 200)) return;
    this.mess.abstand = d;
    const a = this.abstaende;
    a.push(d);
    if (a.length > 120) a.shift();
    const basis = Math.max(6, Math.min(34, [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.1)]!));
    if (d > basis * 1.5) this.budget = Math.max(1, this.budget * 0.7);
    else if (d < basis * 1.2) this.budget = Math.min(BAHNEN * 2, this.budget + 0.5);
  }

  private platz(nr: number): Platz {
    const v = this.liste[nr]!;
    let p = this.plaetze.get(v.id);
    if (!p) {
      p = { v, lauf: null, ziele: new Set(), bild: null, bahnen: 0, stuecke: 0, reglerText: '', t0: 0, letzte: 0, unruhig: true, gesehen: 0, gerechnet: 0, kaputt: false, erst: true };
      this.plaetze.set(v.id, p);
    }
    return p;
  }

  private arbeiten(w: StreifenWerte, jetzt: number): boolean {
    const k = this.kern!;
    const { k0, k1 } = this.sichtbar();
    const bw = Math.ceil(k.b / BAHNEN);
    const bahn = (x: number): number => Math.max(0, Math.min(BAHNEN - 1, Math.floor((x * this.D) / bw)));
    const arbeit: Arbeit[] = [];
    let offen = false;
    this.imBild.clear();
    this.nahe.clear();
    for (let kk = k0; kk <= k1; kk++) {
      const p = this.platz(this.nrVon(kk));
      p.gesehen = this.bildNr;
      this.imBild.add(p);
      if (p.kaputt) continue;
      if (!this.uebersetzt.has(p.v.id)) {
        offen = true;
        continue;
      }
      // geänderte Regler: das Bild ist alt
      const rt = JSON.stringify(w.regler(p.v.id));
      if (p.bild && rt !== p.reglerText) p.bahnen = 0;
      const [x0, x1] = this.kasten(kk);
      if (x1 <= 0 || x0 >= this.W) continue;
      const a = bahn(Math.max(0, x0));
      const b = bahn(Math.min(this.W, x1) - 1e-3);
      let noetig = 0;
      for (let i = a; i <= b; i++) noetig |= 1 << i;
      const ab = Math.abs((x0 + x1) / 2 - this.W / 2);
      const fehlt = noetig & ~p.bahnen;
      if (fehlt) arbeit.push({ p, maske: fehlt, rang: 0, ab, fokus: (a + b) / 2, ganz: false });
      else if (p.unruhig && !this.schnell && jetzt - p.letzte >= 33) arbeit.push({ p, maske: p.lauf ? noetig : ALLE_BAHNEN, rang: 1, ab: -(jetzt - p.letzte), fokus: (a + b) / 2, ganz: true });
      const rest = ALLE_BAHNEN & ~p.bahnen & ~noetig;
      if (rest) arbeit.push({ p, maske: rest, rang: 2, ab, fokus: this.richtung >= 0 ? a - 1 : b + 1, ganz: false });
      else if (!fehlt && p.stuecke > 1 && !p.unruhig && !this.schnell) arbeit.push({ p, maske: ALLE_BAHNEN, rang: 4, ab, fokus: 0, ganz: true });
      if (fehlt || rest || p.unruhig || (p.stuecke > 1 && !p.unruhig)) offen = true;
    }
    // die nächsten außerhalb des Bilds, in Wischrichtung zuerst; sie kommen von ihrer Seite herein
    for (let d = 1; d <= VORRAT; d++) {
      for (const kk of this.richtung >= 0 ? [k1 + d, k0 - d] : [k0 - d, k1 + d]) {
        const p = this.platz(this.nrVon(kk));
        p.gesehen = this.bildNr;
        this.nahe.add(p);
        if (p.kaputt || !this.uebersetzt.has(p.v.id) || p.bahnen === ALLE_BAHNEN) continue;
        arbeit.push({ p, maske: ALLE_BAHNEN & ~p.bahnen, rang: 3, ab: d, fokus: kk > k1 ? BAHNEN - 1 : 0, ganz: false });
        offen = true;
      }
    }
    // in Ruhe (seit 1,2 s nichts gewischt, nichts Sichtbares offen): der nächste Shader, der für dieses Netz noch nie gerechnet hat
    const ruhig = jetzt - this.bewegtBis > 1200 && !arbeit.some((a) => a.rang === 0);
    if (ruhig && this.bildNr % 3 === 0) {
      const mitte = this.kBei(this.W / 2, this.H / 2);
      for (let d = VORRAT + 1; d <= this.liste.length; d++) {
        const kk = d % 2 ? mitte + ((d + 1) >> 1) : mitte - (d >> 1);
        const v = this.liste[this.nrVon(kk)]!;
        if (this.gewaermt.has(v.id) || !this.uebersetzt.has(v.id)) continue;
        const p = this.platz(this.nrVon(kk));
        if (p.kaputt) {
          this.gewaermt.add(v.id);
          continue;
        }
        p.gesehen = this.bildNr;
        arbeit.push({ p, maske: ALLE_BAHNEN & ~p.bahnen || ALLE_BAHNEN, rang: 5, ab: d, fokus: 0, ganz: true });
        break;
      }
    }
    if (this.gewaermt.size < this.liste.length) offen = true;
    arbeit.sort((x, y) => x.rang - y.rang || x.ab - y.ab);
    let rest = this.budget;
    let getan = 0;
    let bahnen = 0;
    for (const a of arbeit) {
      if (a.p.gerechnet === this.bildNr) continue;
      let b0: number;
      let b1: number;
      if (a.ganz) {
        // der ganze Kasten (bewegter Shader, Nachlauf)
        b0 = BAHNEN;
        b1 = -1;
        for (let i = 0; i < BAHNEN; i++) if (a.maske & (1 << i)) {
          b0 = Math.min(b0, i);
          b1 = Math.max(b1, i);
        }
        const kosten = b1 - b0 + 1;
        if (kosten > rest && (getan > 0 || (a.rang !== 0 && a.rang !== 5))) continue;
      } else {
        // eine zusammenhängende Folge fehlender Bahnen um den Fokus, so lang, wie das Budget reicht (mindestens eine)
        const n = getan === 0 && a.rang === 0 ? Math.max(1, Math.floor(rest)) : Math.floor(rest);
        if (n < 1) continue;
        const f = Math.max(0, Math.min(BAHNEN - 1, Math.round(a.fokus)));
        let start = -1;
        for (let d = 0; d < BAHNEN && start < 0; d++) {
          if (f + d < BAHNEN && a.maske & (1 << (f + d))) start = f + d;
          else if (f - d >= 0 && a.maske & (1 << (f - d))) start = f - d;
        }
        if (start < 0) continue;
        b0 = start;
        b1 = start;
        while (b1 - b0 + 1 < n) {
          const links = b0 - 1 >= 0 && (a.maske & (1 << (b0 - 1))) !== 0;
          const rechts = b1 + 1 < BAHNEN && (a.maske & (1 << (b1 + 1))) !== 0;
          if (!links && !rechts) break;
          if (rechts && (!links || b1 - f <= f - b0)) b1++;
          else b0--;
        }
      }
      this.rendern(a.p, b0, b1, w, jetzt, a.rang === 4);
      const kosten = b1 - b0 + 1;
      rest -= kosten;
      bahnen += kosten;
      getan++;
      if (rest < 1) break;
    }
    this.mess.bahnen = bahnen;
    this.mess.laeufe = getan;
    return offen;
  }

  private bauen(p: Platz, jetzt: number): void {
    const k = this.kern!;
    k.aufzeichnen = p.ziele;
    k.sammeln = this.neueProgramme;
    try {
      p.lauf = p.v.bauen(k);
    } catch (e) {
      console.warn(`Streifen: ${p.v.id} lässt sich nicht bauen`, e);
      p.kaputt = true;
    } finally {
      k.aufzeichnen = null;
      k.sammeln = null;
    }
    if (!p.t0) p.t0 = jetzt;
    p.letzte = jetzt;
    p.erst = true;
  }

  /** Probe: auf die Grafikkarte warten (ein Bildpunkt zurücklesen) */
  private warten(): void {
    const gl = this.r.getContext();
    this.r.setRenderTarget(null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel);
  }

  private rendern(p: Platz, b0: number, b1: number, w: StreifenWerte, jetzt: number, nachlauf: boolean): void {
    const k = this.kern!;
    if (!p.lauf) this.bauen(p, jetzt);
    const lauf = p.lauf;
    if (!lauf) return;
    const bw = Math.ceil(k.b / BAHNEN);
    const ganz = b0 <= 0 && b1 >= BAHNEN - 1;
    k.ausschnitt = ganz ? null : { x0: Math.max(0, b0 * bw - RAND), y0: 0, x1: Math.min(k.b, (b1 + 1) * bw + RAND), y1: k.h };
    const regler = w.regler(p.v.id);
    const zeit = (jetzt - p.t0) / 1000;
    const dt = Math.min(0.1, Math.max(0, (jetzt - p.letzte) / 1000));
    p.letzte = jetzt;
    p.gerechnet = this.bildNr;
    this.gewaermt.add(p.v.id);
    k.u.uZeit.value = zeit;
    const werte = { zeit, dt, deckung: 1, buehne: w.buehne, regler };
    let bild: Texture | null = null;
    k.aufzeichnen = p.ziele;
    k.sammeln = this.neueProgramme;
    if (this.messen) this.warten();
    const tm = performance.now();
    try {
      bild = lauf.bild(k, werte);
      p.unruhig = lauf.unruhig(werte);
    } catch (e) {
      console.warn(`Streifen: ${p.v.id} rechnet nicht`, e);
      p.kaputt = true;
    } finally {
      k.aufzeichnen = null;
      k.sammeln = null;
    }
    p.reglerText = JSON.stringify(regler);
    p.bild = bild ? this.behalten(p, bild) : null;
    if (this.messen) {
      this.warten();
      const z = this.zeiten.get(p.v.id) ?? { ms: 0, bahnen: 0, mal: 0, erste: 0 };
      const ms = performance.now() - tm;
      if (p.erst) z.erste = ms;
      else {
        z.ms += ms;
        z.bahnen += Math.min(BAHNEN - 1, b1) - Math.max(0, b0) + 1;
        z.mal++;
      }
      this.zeiten.set(p.v.id, z);
    }
    p.erst = false;
    k.ausschnitt = null;
    const vorher = p.bahnen;
    for (let b = Math.max(0, b0); b <= Math.min(BAHNEN - 1, b1); b++) p.bahnen |= 1 << b;
    if (nachlauf || ganz) p.stuecke = 1;
    else if (p.bahnen !== vorher) p.stuecke++;
  }

  /**
   * das Bild eines Shaders behalten: immer in seiner eigenen Kopie (mit derselben Schere). So bleibt es, wenn sein Lauf freigegeben
   * wird (fertig und nicht in Bewegung), und ein neu gebauter Lauf, der nur seinen Kasten rechnet, überschreibt nur diesen
   */
  private behalten(p: Platz, bild: Texture): Texture {
    const k = this.kern!;
    const z = k.ziel(`streifen:${p.v.id}`, { art: 'byte' });
    this.kopie!.uniforms.tQuelle!.value = bild;
    k.flaeche(this.kopie!, z, [0, 0, 0, 0]);
    return z.texture;
  }

  private nutzer(name: string, ausser?: Platz): number {
    let n = 0;
    for (const p of this.plaetze.values()) if (p !== ausser && p.lauf && p.ziele.has(name)) n++;
    return n;
  }

  /** den Lauf freigeben (Programme bleiben im Schatten); sein Bild bleibt */
  private laufFreigeben(p: Platz): void {
    if (!p.lauf) return;
    try {
      p.lauf.freigeben();
    } catch (e) {
      console.warn(`Streifen: ${p.v.id} gibt nicht frei`, e);
    }
    p.lauf = null;
    const k = this.kern;
    // (eine Simulation fängt danach von vorn an, ihre Zeit auch)
    if ([...p.ziele].some((n) => n.includes('#'))) p.t0 = 0;
    if (k) for (const name of p.ziele) if (!name.startsWith('gemein:') && this.nutzer(name, p) === 0) k.zielFreigeben(name);
    p.ziele.clear();
  }

  /** alles freigeben: Lauf und Bild */
  private abbauen(p: Platz): void {
    this.laufFreigeben(p);
    this.kern?.zielFreigeben(`streifen:${p.v.id}`);
    p.bild = null;
    p.bahnen = 0;
    p.stuecke = 0;
  }

  /**
   * Speicher: Ein Lauf lebt nur, solange er gebraucht wird (im Bild und noch nicht fertig, in Bewegung oder vor dem Nachlauf; in der
   * Nähe und noch nicht fertig; eine Simulation in der Nähe). Sonst bleibt nur sein Bild (4 Byte je Punkt statt seiner Ziele; das Fell
   * hält Ziele mit vierfacher Abtastung). Bilder höchstens so viele, wie der Speicher trägt; die am längsten nicht gesehenen gehen zuerst.
   */
  private aufraeumen(): void {
    const k = this.kern;
    if (!k) return;
    for (const p of this.plaetze.values()) {
      if (!p.lauf || p.gerechnet === this.bildNr) continue;
      const fertig = p.bahnen === ALLE_BAHNEN;
      const sim = [...p.ziele].some((n) => n.includes('#'));
      if (this.imBild.has(p) && (!fertig || p.unruhig || p.stuecke > 1)) continue;
      if (this.nahe.has(p) && (!fertig || sim)) continue;
      if (this.imBild.has(p) && sim) continue;
      this.laufFreigeben(p);
    }
    const hoechstens = Math.max(this.imBild.size + this.nahe.size + 2, Math.min(40, Math.floor(0.7e9 / (k.b * k.h * 4))));
    const mitBild = [...this.plaetze.values()].filter((p) => p.bild);
    if (mitBild.length <= hoechstens) return;
    mitBild.sort((a, b) => a.gesehen - b.gesehen);
    let n = mitBild.length;
    for (const p of mitBild) {
      if (n <= hoechstens) break;
      if (this.imBild.has(p) || this.nahe.has(p) || p.gerechnet === this.bildNr) continue;
      this.abbauen(p);
      n--;
    }
  }

  private zusammensetzen(jetzt: number): void {
    const k = this.kern!;
    const z = this.zusammen!;
    const u = z.uniforms;
    const { k0, k1 } = this.sichtbar();
    const maske = u.uMaske!.value as number[];
    for (let j = 0; j < STREIFEN_HOECHSTENS; j++) {
      const kk = k0 + j;
      const p = kk <= k1 ? this.plaetze.get(this.liste[this.nrVon(kk)]!.id) : undefined;
      const fertig = !!p && !!p.bild && !p.kaputt;
      u[`tB${j}`]!.value = fertig ? (p.bild ?? this.leer) : this.leer;
      maske[j] = fertig ? p.bahnen : 0;
    }
    u.uL0!.value = k0 * this.breiteWert - this.versatz;
    u.uB!.value = this.breiteWert;
    u.uH!.value = this.H;
    u.uDpr!.value = this.D;
    u.uBahn!.value = Math.ceil(k.b / BAHNEN);
    u.uZeit!.value = (jetzt / 1000) % 1000;
    (u.uAufl!.value as Vector2).set(k.b, k.h);
    u.tDaten!.value = k.ziel('gemein:daten', { anzahl: 2, tiefe: true, art: 'half' }).textures[0];
    this.r.setRenderTarget(null);
    this.mesh.material = z;
    this.r.render(this.szene, this.kamera);
  }

  // ---------- Übersetzen im Hintergrund ----------

  private async uebersetzenLaufen(): Promise<void> {
    if (this.uebersetzenLaeuft) return;
    this.uebersetzenLaeuft = true;
    try {
      while (this.kern) {
        const v = this.naechsterOhneProgramme();
        if (!v) break;
        await this.uebersetzen(v);
        this.uebersetzt.add(v.id);
        this.aenderung();
        await new Promise((r) => setTimeout(r, 0));
      }
    } finally {
      this.uebersetzenLaeuft = false;
      this.aenderung();
    }
  }

  private naechsterOhneProgramme(): Voreinstellung | null {
    const mitte = this.kBei(this.W / 2, this.H / 2);
    for (let d = 0; d <= this.liste.length; d++) {
      for (const kk of this.richtung >= 0 ? [mitte + d, mitte - d] : [mitte - d, mitte + d]) {
        const v = this.liste[this.nrVon(kk)]!;
        if (!this.uebersetzt.has(v.id)) return v;
      }
    }
    return null;
  }

  /** einen Shader zur Probe bauen, seine Programme im Schatten übersetzen (ohne zu warten), den Bau wieder freigeben */
  private async uebersetzen(v: Voreinstellung): Promise<void> {
    const k = this.kern;
    if (!k) return;
    const gebaut: Material[] = [];
    const ziele = new Set<string>();
    k.sammeln = gebaut;
    k.aufzeichnen = ziele;
    let lauf: ShaderLauf | null = null;
    try {
      lauf = v.bauen(k);
    } catch (e) {
      console.warn(`Streifen: ${v.id} lässt sich nicht bauen`, e);
    } finally {
      k.sammeln = null;
      k.aufzeichnen = null;
    }
    if (!lauf) return;
    const alle = new Set<Material>(gebaut);
    materialienSuchen(lauf, alle);
    const neu = this.schattenFuer(alle);
    try {
      lauf.freigeben();
    } catch {
      // (ein Probebau, der nichts gerechnet hat)
    }
    for (const name of ziele) if (!name.startsWith('gemein:') && this.nutzer(name) === 0) k.zielFreigeben(name);
    if (neu.length) await this.kompilieren(neu);
  }

  /** je neuem Programm eine Hülle, die es am Leben hält */
  private schattenFuer(alle: Iterable<Material>): RawShaderMaterial[] {
    const neu: RawShaderMaterial[] = [];
    for (const m of alle) {
      const r = m as RawShaderMaterial;
      if (!r.isRawShaderMaterial) continue;
      const schluessel = `${r.glslVersion}\u0001${JSON.stringify(r.defines ?? {})}\u0001${r.vertexShader}\u0001${r.fragmentShader}`;
      if (this.schatten.has(schluessel)) continue;
      const s = new RawShaderMaterial({ glslVersion: r.glslVersion, vertexShader: r.vertexShader, fragmentShader: r.fragmentShader, defines: { ...(r.defines ?? {}) } });
      this.schatten.set(schluessel, s);
      neu.push(s);
    }
    return neu;
  }

  private async kompilieren(neu: RawShaderMaterial[]): Promise<void> {
    const szene = new Scene();
    for (const m of neu) {
      const me = new Mesh(this.dreieck, m);
      me.frustumCulled = false;
      szene.add(me);
    }
    try {
      await this.r.compileAsync(szene, this.kamera);
    } catch (e) {
      console.warn('Streifen: Übersetzen', e);
    }
  }

  /** Programme, die erst beim Rechnen entstanden: auch sie in den Schatten (sie sind schon übersetzt) */
  private schattenNachtragen(): void {
    if (!this.neueProgramme.length) return;
    const neu = this.schattenFuer(this.neueProgramme);
    this.neueProgramme = [];
    if (neu.length) void this.kompilieren(neu);
  }
}
