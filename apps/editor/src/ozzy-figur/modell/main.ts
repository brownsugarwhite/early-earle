// Ozzy als Modell (Plan docs/plans/2026-11-19-ozzy-modell.md; Florian, 19.11.: „Front ist am wichtigsten. seite und 3/4 sind
// angenähert … Ich verlange ja nicht dass es 100% trifft. aber es war ja komplett daneben und unschön“). Seite ozzy-modell.html: zuerst
// der Kopf. Er ist aus Florians Front aufgeblasen (von vorn genau sein Umriss), die Tiefe aus der Seite angenähert. Sein Weiß kommt aus
// der Front und reicht an der Seite bis zu einer Grenze aus der Seitenzeichnung; ringsum ein schwarzer Rand fester Breite (die Rückseiten
// einer um den Rand vergrößerten Hülle). Nase und Ohren schwarz. Prüfhaken window.__ozzyModell.
import * as THREE from 'three';
import backSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_back.svg?raw';
import frontSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_front.svg?raw';
import lieg1Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown01.svg?raw';
import lieg2Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown02.svg?raw';
import logoSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand01_logo.svg?raw';
import profilSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand02.svg?raw';
import sitz1Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_sit01.svg?raw';
import sitz2Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_st02.svg?raw';
import viertelSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_viertel.svg?raw';
import { abflachen, type Form, verschieben } from '../form';
import { koerperUrsprung } from '../raster';
import { type AnsichtName, importieren, type TeilName } from '../vorlagen/import';
import { lesen } from '../raum/gitter';
import type { Netz3 } from './aufblasen';
import { type BartKopf, bartKopfBauen } from './bart';
import { KOPF_TEILE, kopfBauen, type KopfModell } from './kopf';

const TEXTE: Record<string, string> = {
  'ozzy_front.svg': frontSvg,
  'ozzy_back.svg': backSvg,
  'ozzy_stand01_logo.svg': logoSvg,
  'ozzy_stand02.svg': profilSvg,
  'ozzy_laydown01.svg': lieg1Svg,
  'ozzy_laydown02.svg': lieg2Svg,
  'ozzy_viertel.svg': viertelSvg,
  'ozzy_sit01.svg': sitz1Svg,
  'ozzy_st02.svg': sitz2Svg,
};
const daten = importieren(TEXTE);

/** Florians Zeichnung zu einem Winkel (270° ist die Seite gespiegelt) */
const VORLAGE_BEI: [number, AnsichtName, boolean][] = [
  [0, 'front', false],
  [45, 'viertel', false],
  [90, 'profil', false],
  [180, 'back', false],
  [270, 'profil', true],
];

const adresse = new URLSearchParams(location.search);
const zustand = { psi: Number(adresse.get('psi') ?? 30), laeuft: false, vorlage: adresse.get('vorlage') === '1', tempo: 45 };
const optionen = {
  rand: Number(adresse.get('rand') ?? 10),
  hinten: Number(adresse.get('hinten') ?? 60),
  netz: Number(adresse.get('netz') ?? 1.5),
  weit: Number(adresse.get('weit') ?? 1),
  rueckwaerts: Number(adresse.get('rueckwaerts') ?? -0.2),
  weitSeite: Number(adresse.get('weitSeite') ?? 10),
  schattiert: Number(adresse.get('schattiert') ?? 0),
  /** Übergang Front → Seite (Grad von vorn) */
  vornBis: Number(adresse.get('vornBis') ?? 66),
  seiteAb: Number(adresse.get('seiteAb') ?? 88),
  randWeiss: Number(adresse.get('randWeiss') ?? 22),
  seite: Number(adresse.get('seite') ?? 0),
  /** nur der Umriss (Prüfung der Form ohne Weiß) */
  umriss: Number(adresse.get('umriss') ?? 0),
};
const figur = document.getElementById('figur') as HTMLCanvasElement;
const oben = document.getElementById('oben') as HTMLCanvasElement;
const leiste = document.getElementById('leiste')!;
const tempoText = document.getElementById('tempo')!;

// ---- Zeichnen (Figur-Einheiten; three.js: y nach oben = −y) ----
const renderer = new THREE.WebGLRenderer({ canvas: figur, antialias: true, preserveDrawingBuffer: true });
renderer.setClearColor(0xffffff, 1);
const szene = new THREE.Scene();
const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000);
kamera.position.set(0, 0, 1000);
const wurzel = new THREE.Group();
szene.add(wurzel);

const ECKEN = /* glsl */ `
  varying vec3 vRest;
  varying vec3 vNormaleRest;
  varying vec3 vNormaleSicht;
  void main() {
    vRest = vec3(position.x, -position.y, position.z);
    vNormaleRest = vec3(normal.x, -normal.y, normal.z);
    vNormaleSicht = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
/**
 * Gesicht: Florians Weiß. Flächen, die nach vorn schauen, nehmen es aus der Front, Flächen zur Seite aus der Seitenzeichnung; dazwischen
 * (zwischen `uebergang.y` und `uebergang.x` als Anteil der Blickrichtung nach vorn) gehen die beiden Abstandsfelder ineinander über, so
 * dass sich die Grenzen fließend verschieben (kein Überblenden zweier Bilder). Wo die Fläche nach hinten schaut, bleibt es schwarz.
 */
const GESICHT = /* glsl */ `
  uniform sampler2D weiss;
  uniform vec4 weissRahmen;
  uniform sampler2D weissRein;
  uniform sampler2D weissSeite;
  uniform vec4 weissSeiteRahmen;
  uniform vec2 uebergang;
  uniform sampler2D grenze;
  uniform vec3 grenzeRahmen;
  uniform float randWeiss;
  uniform float seite;
  uniform float weit;
  uniform float rueckwaerts;
  uniform float schattiert;
  uniform float umriss;
  varying vec3 vRest;
  varying vec3 vNormaleRest;
  varying vec3 vNormaleSicht;
  float lesen(sampler2D t, vec4 r, vec2 q) {
    vec2 uv = (q - r.xy) / r.zw;
    return (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 50.0 : texture2D(t, uv).r;
  }
  void main() {
    vec3 n = normalize(vNormaleRest);
    float mf = lesen(weiss, weissRahmen, vRest.xy);
    float ms = lesen(weissSeite, weissSeiteRahmen, vec2(vRest.z, vRest.y));
    // Randband (von vorn nur die letzten Einheiten vor dem Rand, von der Seite die Mitte des Gesichts): das Weiß der Front dort breiter,
    // damit Augenkerben und Kappe an der Seite schmal auslaufen statt als Flecken. Seitenzeichnung nur, wenn \`seite\` > 0 (Versuch)
    float band = smoothstep(uebergang.y, uebergang.x, abs(n.x));
    float mr = lesen(weissRein, weissRahmen, vRest.xy);
    float m = mix(mix(mf, mr, band) - randWeiss * band, ms, seite * band) - weit;
    float aa = max(fwidth(m), 1e-4) * 0.75;
    float w = smoothstep(aa, -aa, m);
    // nach hinten bis zur Grenze des Weiß in Florians Seitenzeichnung (je Höhe), und nie, wo die Fläche weit nach hinten schaut
    float gz = texture2D(grenze, vec2(((vRest.y - grenzeRahmen.x) / grenzeRahmen.y + 0.5) / grenzeRahmen.z, 0.5)).r;
    float az = max(fwidth(vRest.z), 1e-4);
    w *= smoothstep(gz - az, gz + az, vRest.z);
    float an = max(fwidth(n.z), 1e-4);
    w *= smoothstep(rueckwaerts - an, rueckwaerts + an, n.z);
    w *= 1.0 - umriss;
    gl_FragColor = vec4(vec3(w), 1.0);
    if (schattiert > 0.5) {
      vec3 l = normalize(vec3(-0.4, 0.6, 0.7));
      float licht = 0.25 + 0.75 * max(0.0, dot(normalize(vNormaleSicht), l));
      gl_FragColor = vec4(vec3(licht) * mix(vec3(0.55, 0.6, 0.75), vec3(1.0), w), 1.0);
    }
  }
`;
/**
 * Bart (eigene Form): vorn Florians Weiß der Front, an den Seiten das Weiß seiner Seitenzeichnung; die Grenze liegt dort, wo die Fläche
 * gleich weit nach vorn wie zur Seite schaut (an der gerundeten Kante). Wo sie nach hinten schaut, schwarz.
 */
const BART = /* glsl */ `
  uniform sampler2D weiss;
  uniform vec4 weissRahmen;
  uniform sampler2D weissSeite;
  uniform vec4 weissSeiteRahmen;
  uniform float weit;
  uniform float schattiert;
  uniform float umriss;
  varying vec3 vRest;
  varying vec3 vNormaleRest;
  varying vec3 vNormaleSicht;
  float lesen(sampler2D t, vec4 r, vec2 q) {
    vec2 uv = (q - r.xy) / r.zw;
    return (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 50.0 : texture2D(t, uv).r;
  }
  void main() {
    vec3 n = normalize(vNormaleRest);
    float mf = lesen(weiss, weissRahmen, vRest.xy);
    float ms = lesen(weissSeite, weissSeiteRahmen, vec2(vRest.z, vRest.y));
    float d = n.z - abs(n.x);
    float ad = max(fwidth(d), 1e-4);
    float m = mix(ms, mf, smoothstep(-ad, ad, d)) - weit;
    float aa = max(fwidth(m), 1e-4) * 0.75;
    float w = smoothstep(aa, -aa, m);
    float an = max(fwidth(n.z), 1e-4);
    w *= smoothstep(-0.5 - an, -0.5 + an, n.z);
    w *= 1.0 - umriss;
    gl_FragColor = vec4(vec3(w), 1.0);
    if (schattiert > 0.5) {
      vec3 l = normalize(vec3(-0.4, 0.6, 0.7));
      float licht = 0.25 + 0.75 * max(0.0, dot(normalize(vNormaleSicht), l));
      gl_FragColor = vec4(vec3(licht) * mix(vec3(0.55, 0.6, 0.75), vec3(1.0), w), 1.0);
    }
  }
`;
/** schwarz, in der Prüfansicht schattiert */
const SCHWARZ_FARBE = /* glsl */ `
  uniform float schattiert;
  varying vec3 vNormaleSicht;
  void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    if (schattiert > 0.5) {
      vec3 l = normalize(vec3(-0.4, 0.6, 0.7));
      float licht = 0.25 + 0.75 * max(0.0, dot(normalize(vNormaleSicht), l));
      gl_FragColor = vec4(vec3(licht) * vec3(0.32, 0.3, 0.35), 1.0);
    }
  }
`;
/**
 * schwarzer Rand: Rückseiten einer um `rand` längs der Normalen vergrößerten Hülle, beim Zeichnen um `zurueck` (Tiefe, normierte
 * Einheiten) nach hinten geschoben: So zeigt er sich nur außerhalb des Umrisses; in Mulden stach er sonst durch die Fläche
 */
const RAND_ECKEN = /* glsl */ `
  uniform float rand;
  uniform float zurueck;
  attribute float randBreite;
  void main() {
    vec3 p = position + normalize(normal) * (rand > 0.0 ? randBreite : 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_Position.z += zurueck * gl_Position.w;
  }
`;
const RAND_FARBE = /* glsl */ `
  uniform vec3 farbe;
  void main() { gl_FragColor = vec4(farbe, 1.0); }
`;
const SCHWARZ = new THREE.MeshBasicMaterial({ color: 0x000000 });
const randMaterial = new THREE.ShaderMaterial({ vertexShader: RAND_ECKEN, fragmentShader: RAND_FARBE, uniforms: { rand: { value: optionen.rand }, zurueck: { value: (4 * optionen.rand * 2) / 6000 }, farbe: { value: new THREE.Color(adresse.get('randFarbe') ?? '#000000') } }, side: THREE.BackSide });

function halbFeld(werte: Float32Array, b: number, h: number, grenze = 40): THREE.DataTexture {
  const d = new Uint16Array(werte.length);
  for (let i = 0; i < werte.length; i++) d[i] = THREE.DataUtils.toHalfFloat(Math.max(-grenze, Math.min(grenze, werte[i]!)));
  const t = new THREE.DataTexture(d, b, h, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/** Geometrie aus einem Netz: y gespiegelt, Dreiecke nach außen gegen den Uhrzeigersinn */
function geometrie(n: Netz3): THREE.BufferGeometry {
  const pos = new Float32Array(n.lagen.length);
  const nor = new Float32Array(n.normalen.length);
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = n.lagen[i]!;
    pos[i + 1] = -n.lagen[i + 1]!;
    pos[i + 2] = n.lagen[i + 2]!;
    nor[i] = n.normalen[i]!;
    nor[i + 1] = -n.normalen[i + 1]!;
    nor[i + 2] = n.normalen[i + 2]!;
  }
  const idx = new Uint32Array(n.dreiecke);
  let gleich = 0;
  for (let k = 0; k < idx.length; k += 3) {
    const a = 3 * idx[k]!;
    const b = 3 * idx[k + 1]!;
    const c = 3 * idx[k + 2]!;
    const ux = pos[b]! - pos[a]!;
    const uy = pos[b + 1]! - pos[a + 1]!;
    const uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!;
    const vy = pos[c + 1]! - pos[a + 1]!;
    const vz = pos[c + 2]! - pos[a + 2]!;
    const s = (uy * vz - uz * vy) * nor[a]! + (uz * vx - ux * vz) * nor[a + 1]! + (ux * vy - uy * vx) * nor[a + 2]!;
    gleich += s > 0 ? 1 : -1;
  }
  if (gleich < 0)
    for (let k = 0; k < idx.length; k += 3) {
      const t = idx[k + 1]!;
      idx[k + 1] = idx[k + 2]!;
      idx[k + 2] = t;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

let modell: KopfModell | null = null;
/** Umfang (Figur-Einheiten): größter Abstand von der Drehachse, Höhe */
const umfang = { r: 200, y0: -430, y1: -80 };

function aufbauen(): void {
  if (adresse.get('kopf') !== 'rund') {
    bartAufbauen();
    return;
  }
  const t = performance.now();
  modell = kopfBauen(daten, { rand: optionen.rand, hinten: optionen.hinten, netz: optionen.netz, vorZurMitte: adresse.has('dick') ? Number(adresse.get('dick')) : undefined });
  const m = modell;
  const w = m.weiss;
  const ws = m.weissSeite;
  const gesicht = new THREE.ShaderMaterial({
    vertexShader: ECKEN,
    fragmentShader: GESICHT,
    uniforms: {
      weiss: { value: halbFeld(w.abstand, w.g.b, w.g.h) },
      weissRahmen: { value: new THREE.Vector4(w.g.x0, w.g.y0, w.g.b * w.g.s, w.g.h * w.g.s) },
      weissRein: { value: halbFeld(m.weissRein.abstand, m.weissRein.g.b, m.weissRein.g.h) },
      weissSeite: { value: halbFeld(ws.abstand, ws.g.b, ws.g.h) },
      weissSeiteRahmen: { value: new THREE.Vector4(ws.g.x0, ws.g.y0, ws.g.b * ws.g.s, ws.g.h * ws.g.s) },
      uebergang: { value: new THREE.Vector2(Math.sin((optionen.seiteAb * Math.PI) / 180), Math.sin((optionen.vornBis * Math.PI) / 180)) },
      grenze: { value: (() => {
        const t = new THREE.DataTexture(new Float32Array(m.grenze.z), m.grenze.z.length, 1, THREE.RedFormat, THREE.FloatType);
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
        return t;
      })() },
      grenzeRahmen: { value: new THREE.Vector3(m.grenze.y0, m.grenze.s, m.grenze.z.length) },
      randWeiss: { value: optionen.randWeiss },
      seite: { value: optionen.seite },
      weit: { value: optionen.weit },
      rueckwaerts: { value: optionen.rueckwaerts },
      schattiert: { value: optionen.schattiert },
      umriss: { value: optionen.umriss },
    },
    side: THREE.DoubleSide,
  });
  for (const p of m.teile) {
    const g = geometrie(p.netz);
    const mesh = new THREE.Mesh(g, p.art === 'gesicht' ? gesicht : SCHWARZ);
    mesh.frustumCulled = false;
    wurzel.add(mesh);
    if (p.art === 'gesicht') {
      // Breite des Rands je Ecke: Florians Rand an der Stelle (von vorn)
      const rb = new Float32Array(p.netz.lagen.length / 3);
      for (let i = 0; i < rb.length; i++) rb[i] = lesen(m.randFeld.w, m.randFeld.g, p.netz.lagen[3 * i]!, p.netz.lagen[3 * i + 1]!);
      g.setAttribute('randBreite', new THREE.BufferAttribute(rb, 1));
      const rand = new THREE.Mesh(g, randMaterial);
      rand.frustumCulled = false;
      wurzel.add(rand);
    }
    const L = p.netz.lagen;
    for (let i = 0; i < L.length; i += 3) {
      umfang.r = Math.max(umfang.r, Math.hypot(L[i]!, L[i + 2]!));
      umfang.y0 = Math.min(umfang.y0, L[i + 1]!);
      umfang.y1 = Math.max(umfang.y1, L[i + 1]!);
    }
  }
  umfang.r += optionen.rand;
  console.info('Ozzy Modell gebaut', Math.round(performance.now() - t), 'ms', m.zeiten);
}

let bartModell: BartKopf | null = null;
/** Kopf mit dem Bart als eigener Form */
function bartAufbauen(): void {
  const t = performance.now();
  const zahl = (n: string): number | undefined => (adresse.has(n) ? Number(adresse.get(n)) : undefined);
  bartModell = bartKopfBauen(daten, {
    rand: optionen.rand,
    netz: optionen.netz,
    ...Object.fromEntries((['rundung', 'woelbung', 'flacher', 'schaedelBis', 'naseVor', 'schaedelVorn'] as const).flatMap((k) => (zahl(k) === undefined ? [] : [[k, zahl(k)]]))),
  });
  const m = bartModell;
  const w = m.weiss;
  const ws = m.weissSeite;
  const bart = new THREE.ShaderMaterial({
    vertexShader: ECKEN,
    fragmentShader: BART,
    uniforms: {
      weiss: { value: halbFeld(w.abstand, w.g.b, w.g.h) },
      weissRahmen: { value: new THREE.Vector4(w.g.x0, w.g.y0, w.g.b * w.g.s, w.g.h * w.g.s) },
      weissSeite: { value: halbFeld(ws.abstand, ws.g.b, ws.g.h) },
      weissSeiteRahmen: { value: new THREE.Vector4(ws.g.x0, ws.g.y0, ws.g.b * ws.g.s, ws.g.h * ws.g.s) },
      weit: { value: optionen.weit },
      schattiert: { value: optionen.schattiert },
      umriss: { value: optionen.umriss },
    },
    side: THREE.DoubleSide,
  });
  const schwarz = new THREE.ShaderMaterial({ vertexShader: ECKEN, fragmentShader: SCHWARZ_FARBE, uniforms: { schattiert: { value: optionen.schattiert } }, side: THREE.DoubleSide });
  for (const p of m.teile) {
    const g = geometrie(p.netz);
    const mesh = new THREE.Mesh(g, p.art === 'bart' ? bart : schwarz);
    mesh.frustumCulled = false;
    wurzel.add(mesh);
    if (p.art === 'bart') {
      const rb = new Float32Array(p.netz.lagen.length / 3);
      for (let i = 0; i < rb.length; i++) rb[i] = lesen(m.randFeld.w, m.randFeld.g, p.netz.lagen[3 * i]!, p.netz.lagen[3 * i + 1]!);
      g.setAttribute('randBreite', new THREE.BufferAttribute(rb, 1));
      const rand = new THREE.Mesh(g, randMaterial);
      rand.frustumCulled = false;
      wurzel.add(rand);
    }
    const L = p.netz.lagen;
    for (let i = 0; i < L.length; i += 3) {
      umfang.r = Math.max(umfang.r, Math.hypot(L[i]!, L[i + 2]!));
      umfang.y0 = Math.min(umfang.y0, L[i + 1]!);
      umfang.y1 = Math.max(umfang.y1, L[i + 1]!);
    }
  }
  umfang.r += optionen.rand;
  console.info('Ozzy Modell (Bart) gebaut', Math.round(performance.now() - t), 'ms', m.zeiten);
}

/** fester Rahmen über alle Winkel (Körperkoordinaten): Mitte, halbe Breite und Höhe */
interface Rahmen {
  cx: number;
  cy: number;
  hb: number;
  hh: number;
}
function rahmenFuer(b: number, h: number, rand = 0.06): Rahmen {
  const cy = (umfang.y0 + umfang.y1) / 2;
  let hb = umfang.r * (1 + rand);
  let hh = ((umfang.y1 - umfang.y0) / 2) * (1 + rand);
  if (hb / hh < b / h) hb = (hh * b) / h;
  else hh = (hb * h) / b;
  return { cx: 0, cy, hb, hh };
}
let rahmen: Rahmen = rahmenFuer(1, 1);

function bildZeichnen(psi: number, b: number, h: number, dpr: number, r?: Rahmen): void {
  renderer.setPixelRatio(dpr);
  renderer.setSize(b, h, false);
  rahmen = r ?? rahmenFuer(b, h);
  kamera.left = rahmen.cx - rahmen.hb;
  kamera.right = rahmen.cx + rahmen.hb;
  kamera.top = -(rahmen.cy - rahmen.hh);
  kamera.bottom = -(rahmen.cy + rahmen.hh);
  kamera.updateProjectionMatrix();
  wurzel.rotation.y = (psi * Math.PI) / 180;
  randMaterial.uniforms.rand!.value = optionen.rand;
  renderer.render(szene, kamera);
}

// ---- Leiste ----
leiste.innerHTML = `
  <h2>Drehung</h2>
  <label class="regler"><span>Winkel</span><input type="range" id="winkel" min="0" max="360" step="0.5" value="${zustand.psi}"><output for="winkel"></output></label>
  <div class="knoepfe">
    <button type="button" class="knopf" id="spielen">Drehen ▶</button>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((w) => `<button type="button" class="knopf" data-psi="${w}">${w}°</button>`).join('')}
  </div>
  <label class="schalter"><input type="checkbox" id="vorlage" ${zustand.vorlage ? 'checked' : ''}> Florians Zeichnung rot darüber (0°, 45°, 90°, 180°, 270°)</label>
  <p class="hinweis">Zuerst der Kopf: aus deiner Front aufgeblasen (von vorn genau dein Umriss), die Tiefe aus der Seite angenähert. Dein Weiß aus der Front, ringsum ein schwarzer Rand fester Breite.</p>
`;
const winkel = document.getElementById('winkel') as HTMLInputElement;
const winkelAus = leiste.querySelector('output[for="winkel"]') as HTMLOutputElement;

function groesse(): { b: number; h: number; dpr: number } {
  const r = figur.getBoundingClientRect();
  return { b: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)), dpr: Math.min(2, window.devicePixelRatio || 1) };
}

const pfadVon = (f: Form): string => {
  let s = `M${f[0]!.p[0]},${f[0]!.p[1]}`;
  for (let k = 0; k < f.length; k++) {
    const a = f[k]!;
    const c = f[(k + 1) % f.length]!;
    s += `C${a.o[0]},${a.o[1]},${c.i[0]},${c.i[1]},${c.p[0]},${c.p[1]}`;
  }
  return s + 'Z';
};

function vorlageZeichnen(): void {
  const { b, h, dpr } = groesse();
  oben.width = Math.round(b * dpr);
  oben.height = Math.round(h * dpr);
  const ctx = oben.getContext('2d')!;
  ctx.clearRect(0, 0, oben.width, oben.height);
  if (!zustand.vorlage) return;
  const p = ((zustand.psi % 360) + 360) % 360;
  const v = VORLAGE_BEI.find(([w]) => Math.abs(w - p) < 0.6);
  if (!v) return;
  const a = daten.ansichten[v[1]];
  const u = koerperUrsprung(a);
  const sx = (x: number): number => ((x - rahmen.cx) / rahmen.hb + 1) * 0.5 * oben.width;
  const sy = (y: number): number => ((y - rahmen.cy) / rahmen.hh + 1) * 0.5 * oben.height;
  ctx.strokeStyle = 'rgba(230, 40, 40, 0.85)';
  ctx.lineWidth = Math.max(1, dpr);
  for (const t of a.teile) {
    if (!KOPF_TEILE.includes(t.name)) continue;
    const pts = abflachen(verschieben(t.form, -u[0], -u[1]), (q) => [sx(v[2] ? -q[0] : q[0]), sy(q[1])], 1);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i]!, pts[i + 1]!);
    ctx.closePath();
    ctx.stroke();
  }
}

function zeichnen(): void {
  winkel.value = String(zustand.psi);
  winkelAus.value = `${Math.round(zustand.psi * 10) / 10}°`;
  if (!modell && !bartModell) return;
  const { b, h, dpr } = groesse();
  bildZeichnen(zustand.psi, b, h, dpr);
  vorlageZeichnen();
}

let letzte = 0;
const abstaende: number[] = [];
function schleife(jetzt: number): void {
  if (!zustand.laeuft) return;
  if (letzte) {
    const dt = Math.min(0.1, (jetzt - letzte) / 1000);
    zustand.psi = (zustand.psi + zustand.tempo * dt) % 360;
    abstaende.push(jetzt - letzte);
    if (abstaende.length > 60) abstaende.shift();
    tempoText.textContent = `${(1000 / (abstaende.reduce((s, x) => s + x, 0) / abstaende.length)).toFixed(0)} Bilder/s`;
  }
  letzte = jetzt;
  zeichnen();
  requestAnimationFrame(schleife);
}

winkel.addEventListener('input', () => {
  zustand.psi = Number(winkel.value);
  zeichnen();
});
document.getElementById('spielen')!.addEventListener('click', (e) => {
  zustand.laeuft = !zustand.laeuft;
  (e.currentTarget as HTMLElement).classList.toggle('an', zustand.laeuft);
  letzte = 0;
  if (zustand.laeuft) requestAnimationFrame(schleife);
});
for (const k of leiste.querySelectorAll<HTMLButtonElement>('[data-psi]'))
  k.addEventListener('click', () => {
    zustand.psi = Number(k.dataset.psi);
    zeichnen();
  });
document.getElementById('vorlage')!.addEventListener('change', (e) => {
  zustand.vorlage = (e.currentTarget as HTMLInputElement).checked;
  zeichnen();
});
window.addEventListener('resize', zeichnen);

tempoText.textContent = 'rechnet …';
const bereit = new Promise<void>((fertig) => {
  setTimeout(() => {
    aufbauen();
    tempoText.textContent = '';
    zeichnen();
    fertig();
  }, 30);
});

// ---- Prüfhaken ----
/** Florians Zeichnung einer Ansicht (nur die genannten Teile, in Malreihenfolge) als Pixel im Rahmen */
async function zeichnungPixel(n: AnsichtName, r: Rahmen, b: number, h: number, namen: TeilName[] | null, spiegeln: boolean): Promise<Uint8ClampedArray> {
  const a = daten.ansichten[n];
  const u = koerperUrsprung(a);
  const vb = spiegeln ? `${-(r.cx + r.hb)} ${r.cy - r.hh} ${2 * r.hb} ${2 * r.hh}` : `${r.cx - r.hb} ${r.cy - r.hh} ${2 * r.hb} ${2 * r.hh}`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${h}" viewBox="${vb}" preserveAspectRatio="none">`;
  for (const t of a.teile) {
    if (namen && !namen.includes(t.name)) continue;
    s += `<path d="${pfadVon(verschieben(t.form, -u[0], -u[1]))}" fill="${t.weiss && !optionen.umriss ? '#fff' : '#000'}"/>`;
  }
  s += '</svg>';
  const bild = new Image();
  await new Promise<void>((ok, fehler) => {
    bild.onload = () => ok();
    bild.onerror = () => fehler(new Error('SVG lädt nicht'));
    bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  });
  const cv = document.createElement('canvas');
  cv.width = b;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#fff';
  c.fillRect(0, 0, b, h);
  if (spiegeln) {
    c.translate(b, 0);
    c.scale(-1, 1);
  }
  c.drawImage(bild, 0, 0, b, h);
  return c.getImageData(0, 0, b, h).data;
}

declare global {
  interface Window {
    __ozzyModell: unknown;
  }
}
const KOPF_RAHMEN: Rahmen = { cx: 25, cy: -255, hb: 205, hh: 205 };
const haken = {
  bereit: () => bereit,
  optionen,
  modell: () => modell ?? bartModell,
  zeigen(psi: number, b = 800, h = 800, kopf = false): Rahmen {
    figur.style.width = `${b}px`;
    figur.style.height = `${h}px`;
    bildZeichnen(psi, b, h, 1, kopf ? KOPF_RAHMEN : undefined);
    return rahmen;
  },
  bild: (): string => figur.toDataURL('image/png'),
  /** Deckung des Schwarz mit Florians Zeichnung (nur Kopf), Unterschiedsbild (rot nur 3D, blau nur Zeichnung), auf Wunsch die Zeichnung */
  async vergleich(psi: number, ansicht: AnsichtName, b = 600, h = 600, spiegeln = false, mitZeichnung = false, ausrichten = false) {
    haken.zeigen(psi, b, h, true);
    const cv0 = document.createElement('canvas');
    cv0.width = b;
    cv0.height = h;
    cv0.getContext('2d')!.drawImage(figur, 0, 0, b, h);
    const a0 = cv0.getContext('2d')!.getImageData(0, 0, b, h).data;
    const v = await zeichnungPixel(ansicht, KOPF_RAHMEN, b, h, KOPF_TEILE, spiegeln);
    // auf Wunsch das 3D-Bild verschoben, bis es am besten deckt (Form vergleichen, nicht die Lage)
    let versatz: [number, number] = [0, 0];
    if (ausrichten) {
      const deck = (dx: number, dy: number, schritt: number): number => {
        let beide = 0;
        let oder = 0;
        for (let y = 0; y < h; y += schritt)
          for (let x = 0; x < b; x += schritt) {
            const xa = x - dx;
            const ya = y - dy;
            const sa = xa >= 0 && ya >= 0 && xa < b && ya < h && a0[(ya * b + xa) * 4]! < 128;
            const sv = v[(y * b + x) * 4]! < 128;
            if (sa && sv) beide++;
            if (sa || sv) oder++;
          }
        return beide / Math.max(1, oder);
      };
      let best = -1;
      const weit = Math.round(b * 0.12);
      for (let dy = -weit; dy <= weit; dy += 3) for (let dx = -weit; dx <= weit; dx += 3) {
        const d = deck(dx, dy, 3);
        if (d > best) {
          best = d;
          versatz = [dx, dy];
        }
      }
      const [bx, by] = versatz;
      for (let dy = by - 2; dy <= by + 2; dy++) for (let dx = bx - 2; dx <= bx + 2; dx++) {
        const d = deck(dx, dy, 1);
        if (d > best) {
          best = d;
          versatz = [dx, dy];
        }
      }
    }
    const a = new Uint8ClampedArray(a0.length).fill(255);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < b; x++) {
        const xa = x - versatz[0];
        const ya = y - versatz[1];
        if (xa >= 0 && ya >= 0 && xa < b && ya < h) for (let k = 0; k < 4; k++) a[(y * b + x) * 4 + k] = a0[(ya * b + xa) * 4 + k]!;
      }
    let beide = 0;
    let oder = 0;
    let nur3D = 0;
    let nurVorlage = 0;
    const diff = new Uint8ClampedArray(a.length);
    for (let i = 0; i < a.length; i += 4) {
      const sa = a[i]! < 128;
      const sv = v[i]! < 128;
      if (sa && sv) beide++;
      if (sa || sv) oder++;
      if (sa && !sv) nur3D++;
      if (sv && !sa) nurVorlage++;
      const g = sa && sv ? 40 : 255;
      diff.set(sa && !sv ? [230, 40, 40, 255] : sv && !sa ? [40, 90, 230, 255] : [g, g, g, 255], i);
    }
    const cv = document.createElement('canvas');
    cv.width = b;
    cv.height = h;
    const c = cv.getContext('2d')!;
    let zeichnung: string | null = null;
    if (mitZeichnung) {
      c.putImageData(new ImageData(new Uint8ClampedArray(v), b, h), 0, 0);
      zeichnung = cv.toDataURL('image/png');
    }
    c.putImageData(new ImageData(diff, b, h), 0, 0);
    return { deckung: beide / Math.max(1, oder), nur3D, nurVorlage, bild: cv.toDataURL('image/png'), zeichnung, versatz: [(versatz[0] * 2 * KOPF_RAHMEN.hb) / b, (versatz[1] * 2 * KOPF_RAHMEN.hh) / h] };
  },
};
window.__ozzyModell = haken;
