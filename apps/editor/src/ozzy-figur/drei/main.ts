// Ozzy 3D (Florian, 19.11.: „Ja blender klingt besser … das weiß kann auch gerne aus einem shader kommen. Im gesicht vllt nicht aber
// am körper bzw den beinen schon … Mach mal und wir schauen wie gut es rankommt“). Seite ozzy-3d.html: das Rohmodell aus Blender
// (tools/ozzy-figur/ozzy_roh.py → docs/look/ozzy-figur/3d/ozzy-roh.glb), flach schwarz gezeichnet, ohne Licht und Outline.
//   Beine und Schwanz: Weiß, wo die Fläche zur Kamera schaut (ein schwarzer Rand bleibt, aus jedem Winkel); Gewicht aus der
//   Eckfarbe „fenster“ (Bohne 0, Beine und Schwanz 1).
//   Gesicht: Florians Weiß aus der Frontzeichnung, von vorn auf den Kopf gemalt (fest am Kopf, dreht mit).
// Prüfhaken window.__ozzy3d.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import backSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_back.svg?raw';
import frontSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_front.svg?raw';
import lieg1Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown01.svg?raw';
import lieg2Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_laydown02.svg?raw';
import logoSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand01_logo.svg?raw';
import profilSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_stand02.svg?raw';
import sitz1Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_sit01.svg?raw';
import sitz2Svg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_st02.svg?raw';
import viertelSvg from '../../../../../docs/look/ozzy-figur/vorlagen/ozzy_viertel.svg?raw';
import modellUrl from '../../../../../docs/look/ozzy-figur/3d/ozzy-roh.glb?url';
import { abflachen, verschieben } from '../form';
import { koerperUrsprung } from '../raster';
import { maskeVon } from '../raum/masken';
import { ANSICHTEN, type AnsichtName, importieren } from '../vorlagen/import';

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
/** Modell in Metern, 1 Figur-Einheit = 1 mm */
const S = 0.001;

/** Florians Zeichnung zu einem Winkel (Körperkoordinaten; 270° ist die Seite gespiegelt) */
const VORLAGE_BEI: [number, AnsichtName, boolean][] = [
  [0, 'front', false],
  [45, 'viertel', false],
  [90, 'profil', false],
  [180, 'back', false],
  [270, 'profil', true],
];

const adresse = new URLSearchParams(location.search);
const zustand = { psi: Number(adresse.get('psi') ?? 30), laeuft: false, vorlage: adresse.get('vorlage') === '1', tempo: 45, schwelle: Number(adresse.get('schwelle') ?? 0.85) };
const figur = document.getElementById('figur') as HTMLCanvasElement;
const oben = document.getElementById('oben') as HTMLCanvasElement;
const leiste = document.getElementById('leiste')!;
const tempoText = document.getElementById('tempo')!;

// ---- Zeichnen ----
const renderer = new THREE.WebGLRenderer({ canvas: figur, antialias: true, preserveDrawingBuffer: true });
renderer.setClearColor(0xffffff, 1);
const szene = new THREE.Scene();
const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
kamera.position.set(0, 0, 5);
const wurzel = new THREE.Group();
szene.add(wurzel);

const ECKEN = /* glsl */ `
  varying vec3 vNormaleSicht;
  varying vec3 vRest;
  varying vec3 vNormaleRest;
  varying float vFenster;
  void main() {
    vRest = position;
    vNormaleRest = normal;
    vNormaleSicht = normalize(normalMatrix * normal);
    #ifdef USE_COLOR
    vFenster = color.r;
    #else
    vFenster = 0.0;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
/** Beine und Schwanz: Weiß, wo die Fläche zur Kamera schaut, mit schwarzem Rand */
const FENSTER = /* glsl */ `
  uniform float schwelle;
  varying vec3 vNormaleSicht;
  varying vec3 vRest;
  varying float vFenster;
  void main() {
    float zu = abs(normalize(vNormaleSicht).z);
    float aa = max(fwidth(zu), 1e-4);
    float w = smoothstep(schwelle - aa, schwelle + aa, zu);
    // die Sohle bleibt schwarz (bei Florian ist der Rand unten am breitesten)
    float hoehe = vRest.y * 1000.0;
    float ah = max(fwidth(hoehe), 1e-4);
    float f = smoothstep(0.45, 0.55, vFenster) * smoothstep(24.0 - ah, 24.0 + ah, hoehe);
    gl_FragColor = vec4(vec3(w * f), 1.0);
  }
`;
/**
 * Kopf: Florians Weiß als feste Form im Raum. „schnitt“ (Standard, Florian: „Bart als eigene Form“): Weiß ist, was von vorn UND von
 * der Seite in seinen Zeichnungen weiß ist (Schnitt der beiden Weißflächen, durch den Kopf geschoben) – eine feste Form, die aus jedem
 * Winkel dieselbe bleibt, nichts wird überblendet. „front“: nur die Frontzeichnung, auf Flächen, die nach vorn schauen. „mischen“:
 * Front und Seite nach der Richtung der Fläche gemischt (Versuch). Nie bis an den Umriss: ein schwarzer Rand bleibt.
 */
const GESICHT = /* glsl */ `
  uniform sampler2D maske;
  uniform vec4 maskeRahmen;
  uniform sampler2D maskeSeite;
  uniform vec4 maskeSeiteRahmen;
  uniform float gesichtArt;
  varying vec3 vRest;
  varying vec3 vNormaleRest;
  varying vec3 vNormaleSicht;
  float lesen(sampler2D t, vec4 r, vec2 q) {
    vec2 uv = (q - r.xy) / r.zw;
    return (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 50.0 : texture2D(t, uv).r;
  }
  void main() {
    vec3 n = normalize(vNormaleRest);
    float mf = lesen(maske, maskeRahmen, vec2(vRest.x, -vRest.y) * 1000.0);
    float ms = lesen(maskeSeite, maskeSeiteRahmen, vec2(vRest.z, -vRest.y) * 1000.0);
    float m = mf;
    float vorn = 1.0;
    if (gesichtArt > 2.5) {
      // jede Fläche nimmt die Zeichnung, zu der sie schaut: die Front bis etwa 53° zur Seite (dort liegt noch das Weiß ihres Gesichts,
      // nicht ihr schwarzer Rand), dann die Seite; scharfe Grenze (weich auslaufend lief sie über den Rand: schwarze Risse)
      float d = n.z - 0.75 * abs(n.x);
      float ad = max(fwidth(d), 1e-4);
      float k = smoothstep(-ad, ad, d);
      m = mix(ms, mf, k);
    } else if (gesichtArt > 1.5) {
      m = max(mf, ms);
    } else if (gesichtArt > 0.5) {
      float wf = smoothstep(0.05, 0.6, n.z);
      float ws = smoothstep(0.05, 0.6, abs(n.x));
      wf *= wf;
      ws *= ws;
      m = (wf * mf + ws * ms) / max(wf + ws, 1e-4);
    } else {
      float an = max(fwidth(n.z), 1e-4);
      vorn = smoothstep(0.22 - an, 0.22 + an, n.z);
    }
    float aa = max(fwidth(m), 1e-4) * 0.75;
    // scharfe Kanten (nur an der Kante geglättet): Weiß nur, wo die Fläche zur Kamera schaut (ein schwarzer Rand bleibt am Umriss)
    float zu = abs(normalize(vNormaleSicht).z);
    float az = max(fwidth(zu), 1e-4);
    float rand = smoothstep(0.45 - az, 0.45 + az, zu);
    float weiss = smoothstep(aa, -aa, m) * rand * vorn;
    gl_FragColor = vec4(vec3(weiss), 1.0);
  }
`;
const SCHWARZ = new THREE.MeshBasicMaterial({ color: 0x000000 });
const fensterMaterial = new THREE.ShaderMaterial({ vertexShader: ECKEN, fragmentShader: FENSTER, vertexColors: true, uniforms: { schwelle: { value: zustand.schwelle } }, side: THREE.DoubleSide });
function maskenTextur(n: AnsichtName): { t: THREE.DataTexture; r: THREE.Vector4 } {
  const m = maskeVon(daten, n);
  const d = new Uint16Array(m.feld.length);
  for (let i = 0; i < m.feld.length; i++) d[i] = THREE.DataUtils.toHalfFloat(Math.max(-40, Math.min(40, m.feld[i]!)));
  const t = new THREE.DataTexture(d, m.g.b, m.g.h, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return { t, r: new THREE.Vector4(m.g.x0, m.g.y0, m.g.b * m.g.s, m.g.h * m.g.s) };
}
const maskeFront = maskenTextur('front');
const maskeSeite = maskenTextur('profil');
const gesichtMaterial = new THREE.ShaderMaterial({
  vertexShader: ECKEN,
  fragmentShader: GESICHT,
  uniforms: { maske: { value: maskeFront.t }, maskeRahmen: { value: maskeFront.r }, maskeSeite: { value: maskeSeite.t }, maskeSeiteRahmen: { value: maskeSeite.r }, gesichtArt: { value: { front: 0, mischen: 1, schnitt: 2, kante: 3 }[adresse.get('gesicht') ?? 'kante'] ?? 3 } },
  side: THREE.DoubleSide,
});

let geladen = false;
/** Umfang des Modells (Figur-Einheiten): größter Abstand von der Drehachse, Höhe */
const umfang = { r: 250, y0: -430, y1: 0 };
const bereit = new Promise<void>((fertig) => {
  new GLTFLoader().load(modellUrl, (gltf) => {
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = m.name.toLowerCase();
      m.material = n.startsWith('koerper') ? fensterMaterial : n.startsWith('kopf') ? gesichtMaterial : SCHWARZ;
      m.frustumCulled = false;
      const pos = m.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / S;
        const y = -pos.getY(i) / S;
        const z = pos.getZ(i) / S;
        umfang.r = Math.max(umfang.r, Math.hypot(x, z));
        umfang.y0 = Math.min(umfang.y0, y);
        umfang.y1 = Math.max(umfang.y1, y);
      }
    });
    wurzel.add(gltf.scene);
    geladen = true;
    zeichnen();
    fertig();
  });
});

/** fester Rahmen über alle Winkel (Körperkoordinaten): Mitte (x, Y), halbe Breite und Höhe */
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

function bildZeichnen(psi: number, b: number, h: number, dpr: number): void {
  renderer.setPixelRatio(dpr);
  renderer.setSize(b, h, false);
  rahmen = rahmenFuer(b, h);
  kamera.left = (rahmen.cx - rahmen.hb) * S;
  kamera.right = (rahmen.cx + rahmen.hb) * S;
  kamera.top = -(rahmen.cy - rahmen.hh) * S;
  kamera.bottom = -(rahmen.cy + rahmen.hh) * S;
  kamera.updateProjectionMatrix();
  wurzel.rotation.y = (psi * Math.PI) / 180;
  fensterMaterial.uniforms.schwelle!.value = zustand.schwelle;
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
  <h2>Weiß</h2>
  <label class="regler"><span>Fenster</span><input type="range" id="schwelle" min="0.2" max="0.95" step="0.01" value="${zustand.schwelle}"><output for="schwelle"></output></label>
  <p class="hinweis">Rohmodell aus Blender (Metaballs, tools/ozzy-figur/ozzy_roh.py). Beine und Schwanz: Weiß, wo die Fläche zur Kamera schaut (Regler: wie breit der schwarze Rand bleibt). Gesicht: dein Weiß aus der Front, aufgemalt.</p>
`;
const winkel = document.getElementById('winkel') as HTMLInputElement;
const winkelAus = leiste.querySelector('output[for="winkel"]') as HTMLOutputElement;
const schwelle = document.getElementById('schwelle') as HTMLInputElement;
const schwelleAus = leiste.querySelector('output[for="schwelle"]') as HTMLOutputElement;

function groesse(): { b: number; h: number; dpr: number } {
  const r = figur.getBoundingClientRect();
  return { b: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)), dpr: Math.min(2, window.devicePixelRatio || 1) };
}

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
  schwelleAus.value = zustand.schwelle.toFixed(2);
  if (!geladen) return;
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
schwelle.addEventListener('input', () => {
  zustand.schwelle = Number(schwelle.value);
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
zeichnen();

// ---- Prüfhaken ----
async function svgBild(text: string, r: Rahmen, b: number, h: number): Promise<Uint8ClampedArray> {
  const ohneMeta = text.replace(/<\?xml[^>]*>/, '').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  const svg = ohneMeta.replace(/viewBox="[^"]+"/, `viewBox="${r.cx - r.hb} ${r.cy - r.hh} ${2 * r.hb} ${2 * r.hh}" width="${b}" height="${h}" preserveAspectRatio="none"`);
  const bild = new Image();
  await new Promise<void>((ok, fehler) => {
    bild.onload = () => ok();
    bild.onerror = () => fehler(new Error('SVG lädt nicht'));
    bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = b;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#fff';
  c.fillRect(0, 0, b, h);
  c.drawImage(bild, 0, 0, b, h);
  return c.getImageData(0, 0, b, h).data;
}

declare global {
  interface Window {
    __ozzy3d: unknown;
  }
}
const haken = {
  bereit: () => bereit,
  zeigen(psi: number, b = 800, h = 800): Rahmen {
    figur.style.width = `${b}px`;
    figur.style.height = `${h}px`;
    bildZeichnen(psi, b, h, 1);
    return rahmen;
  },
  bild: (): string => figur.toDataURL('image/png'),
  /** Deckung des Schwarz mit Florians Zeichnung bei ψ, Unterschiedsbild (rot nur 3D, blau nur Zeichnung) und auf Wunsch die Zeichnung */
  async vergleich(psi: number, ansicht: AnsichtName, b = 800, h = 800, spiegeln = false, mitZeichnung = false) {
    const r = haken.zeigen(psi, b, h);
    const cv0 = document.createElement('canvas');
    cv0.width = b;
    cv0.height = h;
    cv0.getContext('2d')!.drawImage(figur, 0, 0, b, h);
    const a = cv0.getContext('2d')!.getImageData(0, 0, b, h).data;
    const u = koerperUrsprung(daten.ansichten[ansicht]);
    const vr: Rahmen = spiegeln ? { ...r, cx: -r.cx } : r;
    let v = await svgBild(TEXTE[ANSICHTEN[ansicht].datei]!, { ...vr, cx: vr.cx + u[0], cy: vr.cy + u[1] }, b, h);
    if (spiegeln) {
      const m = new Uint8ClampedArray(v.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < b; x++) for (let k = 0; k < 4; k++) m[(y * b + x) * 4 + k] = v[(y * b + (b - 1 - x)) * 4 + k]!;
      v = m;
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
    return { deckung: beide / Math.max(1, oder), nur3D, nurVorlage, bild: cv.toDataURL('image/png'), zeichnung };
  },
  tempo(n = 120, b = 1000, h = 1000) {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    const z: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = performance.now();
      bildZeichnen((i * 3) % 360, b, h, 1);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      z.push(performance.now() - t);
    }
    z.sort((x, y) => x - y);
    return { median: z[Math.floor(n / 2)], p95: z[Math.floor(n * 0.95)] };
  },
};
window.__ozzy3d = haken;
