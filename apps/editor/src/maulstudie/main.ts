/**
 * Studie „Maul, Zähne, Zunge“ (20.11.2026). Steht neben Ozzy (`maul.html`), ändert nichts an Ozzy und nichts am Rechenkern.
 *
 * Was sie zeigt, an einer gesicherten Form:
 * 1. Eine Linie wird ein Maul. Die Form bleibt, wie sie ist; das Maul ist ein Schnitt in der gezeigten Haut (`schnitt.ts`).
 *    Geschlossen steht die Form von vorher im Bild. Zwei Tropfen an den Kieferspitzen öffnen Ober- und Unterkiefer, jeden für sich.
 * 2. Zähne lassen sich einschalten: gleichmäßig auf dem Zahnfleisch (`gebiss.ts`, `zahn.ts`). Ein Tipp wählt die Reihe, ein zweiter
 *    den einzelnen Zahn; dann geht oben rechts die Linse auf (`linse.ts`): der Zahn im Raum, der Formenring, der Drehregler.
 * 3. Die Zunge liegt im Maul und lässt sich ziehen wie Gummi (`zunge.ts`).
 * 4. P zeichnet eine eigene Maullinie von der Seite; der Tropfen „Maul“ an ihrem Ende bestätigt.
 *
 * Adresse: `?form=<Name>` (Standard „teat firefish“), `?fein=<0|1|2>` (Stufen der Verfeinerung), `?linie=x,y;x,y;…` (Profil in der
 * Seitenebene, vom Mundwinkel nach vorn), `?reich=1,1.9` (Reichweite der Kiefer). Haken für Bilder und Proben: `window.__maul`.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DataTexture,
  DoubleSide,
  FloatType,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshMatcapMaterial,
  NearestFilter,
  PerspectiveCamera,
  Plane,
  Points,
  PointsMaterial,
  Raycaster,
  RedFormat,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { manifoldLaden, type Wasm } from '../form/naht';
import { wachsKugel } from '../ozzy/wachs';
import { formLaden, type Form } from './form';
import { fleischBreite, platzBei, randAbstand, reihe, type GebissWerte, type ZahnPlatz } from './gebiss';
import { Linse, type Perle } from './linse';
import { BREITE_N, auslaufDreiecke, auslaufNormalen, kieferFeld, kieferStellen, maulSchneiden, type MaulSchnitt, type V2 } from './schnitt';
import { ZAHN_FORMEN, mischen, zahnNetz, type ZahnForm } from './zahn';
import { Zunge } from './zunge';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const adresse = new URLSearchParams(location.search);
const NAME = adresse.get('form') ?? 'teat firefish';
const FEIN = adresse.get('fein') === null ? -1 : Number(adresse.get('fein'));
/** wie weit ein Kiefer reicht, in Längen der Lippe: bis zum ersten Wert ganz, bis zum zweiten läuft es aus (`?reich=1,1.9`) */
const REICH = ((): [number, number] => {
  const r = (adresse.get('reich') ?? '').split(',').map(Number);
  return r.length === 2 && r.every((x) => Number.isFinite(x) && x > 0) ? [r[0]!, r[1]!] : [1.0, 1.9];
})();

/** Maullinien für Florians Formen (Seitenebene, vom Mundwinkel nach vorn), damit die Studie mit einem Maul beginnt */
const STANDARD: Record<string, V2[]> = {
  'teat firefish': [
    { x: -640, y: 165 },
    { x: -665, y: 156 },
    { x: -700, y: 152 },
    { x: -735, y: 156 },
    { x: -760, y: 163 },
  ],
};

// ---------- Bühne ----------

const leinwand = $<HTMLCanvasElement>('buehne');
const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xffffff, 1);
const szene = new Scene();
const kamera = new PerspectiveCamera(24, 1, 1, 10000);

let schmutzig = true;
const anstossen = (): void => {
  schmutzig = true;
};

function groesse(): void {
  const b = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(b, h, false);
  kamera.aspect = b / h;
  kamera.updateProjectionMatrix();
  for (const m of Object.values(lippeMat)) m.resolution.set(b, h);
  anstossen();
}
window.addEventListener('resize', groesse);

// ---------- Materialien ----------

const G = 256;
const wachsDaten = wachsKugel(G);
const wachsBild = new DataTexture(wachsDaten, G, G, RGBAFormat);
wachsBild.colorSpace = SRGBColorSpace;
wachsBild.needsUpdate = true;
/** dasselbe Kugelbild ohne Farbe: nur Hell, Dunkel und Glanz (für Innenraum, Zähne, Zunge) */
const grauDaten = new Uint8Array(G * G * 4);
{
  let max = 1;
  const hell = (i: number): number => 0.2126 * wachsDaten[4 * i]! + 0.7152 * wachsDaten[4 * i + 1]! + 0.0722 * wachsDaten[4 * i + 2]!;
  for (let i = 0; i < G * G; i++) max = Math.max(max, hell(i));
  for (let i = 0; i < G * G; i++) {
    // (heller gestellt: Zähne und Zunge sollen nicht so dunkel schattieren wie das Wachs)
    const l = Math.round(255 * Math.pow(hell(i) / max, 0.55));
    grauDaten[4 * i] = grauDaten[4 * i + 1] = grauDaten[4 * i + 2] = l;
    grauDaten[4 * i + 3] = 255;
  }
}
const grauBild = new DataTexture(grauDaten, G, G, RGBAFormat);
grauBild.colorSpace = SRGBColorSpace;
grauBild.needsUpdate = true;

const hautMaterial = new MeshMatcapMaterial({ matcap: wachsBild, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const breiteBild = new DataTexture(new Float32Array(BREITE_N), BREITE_N, 1, RedFormat, FloatType);
breiteBild.minFilter = breiteBild.magFilter = NearestFilter;
const wandMaterial = new ShaderMaterial({
  side: DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
  uniforms: {
    uBreite: { value: breiteBild },
    uSVorn: { value: 1 },
    uFleischBreite: { value: 6 },
    uInnen: { value: new Vector3(0.42, 0.07, 0.125) },
    uTief: { value: new Vector3(0.2, 0.025, 0.06) },
    uFleisch: { value: new Vector3(0.72, 0.2, 0.29) },
    uGrau: { value: grauBild },
  },
  vertexShader: /* glsl */ `
    attribute vec2 sz;
    varying vec2 vSz;
    varying vec3 vN;
    void main() {
      vSz = sz;
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D uBreite;
    uniform sampler2D uGrau;
    uniform float uSVorn;
    uniform float uFleischBreite;
    uniform vec3 uInnen;
    uniform vec3 uTief;
    uniform vec3 uFleisch;
    varying vec2 vSz;
    varying vec3 vN;
    const float N = ${BREITE_N}.0;
    float breite(float s) {
      float x = clamp(s / uSVorn, 0.0, 1.0) * (N - 1.0);
      float i = floor(x);
      float a = texture2D(uBreite, vec2((i + 0.5) / N, 0.5)).r;
      float b = texture2D(uBreite, vec2((min(i + 1.0, N - 1.0) + 0.5) / N, 0.5)).r;
      return mix(a, b, x - i);
    }
    void main() {
      float s = vSz.x;
      float ds = 3.0 * uSVorn / N;
      float b = breite(s);
      float steig = (breite(s + ds) - breite(s - ds)) / (2.0 * ds);
      // Abstand zur Lippe, in der Wand gemessen; vorn schließt sich die Lippe über die Mitte
      float rand = min((b - abs(vSz.y)) / sqrt(1.0 + steig * steig), uSVorn - s);
      float kante = fwidth(rand) * 0.75;
      float fleisch = 1.0 - smoothstep(uFleischBreite - kante, uFleischBreite + kante, rand);
      float tiefe = clamp(1.0 - s / uSVorn, 0.0, 1.0);
      vec3 farbe = mix(mix(uInnen, uTief, tiefe * tiefe), uFleisch, fleisch);
      vec3 n = normalize(gl_FrontFacing ? vN : -vN);
      float licht = texture2D(uGrau, n.xy * 0.495 + 0.5).r;
      gl_FragColor = vec4(farbe * (0.42 + 0.7 * licht), 1.0);
      #include <colorspace_fragment>
    }`,
});
const linienMaterial = new LineBasicMaterial({ color: 0x1f1a17, transparent: true, opacity: 0.55 });
/** die Lippe in Florians Farben (sein Blatt 05): zu türkis, offen oben rosa, unten blau */
const lippeMat = { oben: new LineMaterial({ color: 0xe8306a, linewidth: 2.6 }), unten: new LineMaterial({ color: 0x1f3cf0, linewidth: 2.6 }), zu: new LineMaterial({ color: 0x2fb8a6, linewidth: 2.6 }) };
const punktBild = ((): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1f1a17';
  g.beginPath();
  g.arc(16, 16, 11, 0, 2 * Math.PI);
  g.fill();
  return new CanvasTexture(c);
})();
const kreuzMaterial = new PointsMaterial({ map: punktBild, size: 7, sizeAttenuation: false, transparent: true, alphaTest: 0.4, depthTest: false });
const zahnMat = {
  ruhig: new MeshMatcapMaterial({ matcap: grauBild, color: new Color('#f3e8cc'), side: DoubleSide }),
  gewaehlt: new MeshMatcapMaterial({ matcap: grauBild, color: new Color('#ffffff'), side: DoubleSide }),
  leise: new MeshMatcapMaterial({ matcap: grauBild, color: new Color('#d9cdb0'), side: DoubleSide }),
};
const zungenMaterial = new MeshMatcapMaterial({ matcap: grauBild, color: new Color('#e2607a'), side: DoubleSide });

// ---------- Zustand ----------

let form: Form | null = null;
let wasm: Wasm | null = null;
let schnitt: MaulSchnitt | null = null;
let linie: V2[] | null = null;
/** Winkel der Kiefer in Bogenmaß (positiv öffnet) */
const winkel = { oben: 0, unten: 0 };
let maulAn = true;
let linienAn = true;
let zaehneAn = false;
let zungeAn = true;
let knochenAn = adresse.get('knochen') !== '0';

let koerperNetz: Mesh | null = null;
let hautNetz: Mesh | null = null;
let wandNetz: Mesh | null = null;
type Mitgeher = { ruhe: Float32Array; nor: Float32Array; seite: Int8Array; gewicht: Float32Array | null; geo: BufferGeometry };
let striche: (Mitgeher & { netz: LineSegments }) | null = null;
let kreuze: (Mitgeher & { netz: Points }) | null = null;
type Lippe = Mitgeher & { netz: Line2; gestellt: Float32Array };
let lippen: { oben: Lippe; unten: Lippe } | null = null;
let auslauf: Uint32Array | null = null;
let normalenPuffer: Float32Array | null = null;

type Kiefer = 'oben' | 'unten';
type Eigen = { ds: number; dz: number; form?: ZahnForm; faktor?: number };
type KieferGebiss = { werte: GebissWerte; form: ZahnForm; vorlage: number; plaetze: ZahnPlatz[]; netze: Mesh[]; eigen: Map<number, Eigen> };
const gebissNeu = (): KieferGebiss => ({ werte: { anzahl: 12, groesse: 0.92, neigung: 0.12, verlauf: 0.45, bis: 0.86, sitz: 0.5 }, form: { ...ZAHN_FORMEN[0]!.form }, vorlage: 0, plaetze: [], netze: [], eigen: new Map() });
const gebiss: Record<Kiefer, KieferGebiss> = { oben: gebissNeu(), unten: gebissNeu() };
gebiss.unten.werte.anzahl = 11;
let zahnWuchs = 0;
let auswahl: { kiefer: Kiefer; i: number | null } | null = null;
let zunge: Zunge | null = null;
let zungenNetz: Mesh | null = null;
let zungeWach = false;

function weg(o: { geometry: BufferGeometry; removeFromParent(): unknown } | null | undefined): void {
  if (!o) return;
  o.removeFromParent();
  o.geometry.dispose();
}

/** die Drehung der Seite links und rechts der Maullinie, mit Vorzeichen (wie `kieferStellen` dreht) */
const seitenDrehung = (): [number, number] => {
  if (!schnitt) return [0, 0];
  return [schnitt.obenLinks ? winkel.oben : winkel.unten, -(schnitt.obenLinks ? winkel.unten : winkel.oben)];
};
const kieferDrehung = (k: Kiefer): number => {
  const [l, r] = seitenDrehung();
  return (k === 'oben') === schnitt!.obenLinks ? l : r;
};
const offen = (): number => winkel.oben + winkel.unten;

function koerperBauen(): void {
  if (!form) return;
  weg(koerperNetz);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(form.pos, 3));
  g.setAttribute('normal', new BufferAttribute(form.nor, 3));
  g.setIndex(new BufferAttribute(form.tri, 1));
  koerperNetz = new Mesh(g, hautMaterial);
  szene.add(koerperNetz);
}

const mitgeher = (p: number[], s: number[], w: number[] | null): Mitgeher => {
  const ruhe = Float32Array.from(p);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(ruhe.slice(), 3));
  return { ruhe, nor: new Float32Array(ruhe.length), seite: Int8Array.from(s), gewicht: w ? Float32Array.from(w) : null, geo };
};

/** die Linien der Form als Strecken; an der Lippe reißen sie und bekommen dort einen Punkt je Kiefer */
function linienBauen(): void {
  if (!form) return;
  weg(striche?.netz);
  weg(kreuze?.netz);
  weg(lippen?.oben.netz);
  weg(lippen?.unten.netz);
  lippen = null;
  const P: number[] = [];
  const S: number[] = [];
  const W: number[] = [];
  const KP: number[] = [];
  const KS: number[] = [];
  const KW: number[] = [];
  const m = schnitt;
  for (const l of form.linien) {
    const n = l.pos.length / 3;
    let vor = m ? kieferFeld(m, l.pos[0]!, l.pos[1]!, REICH) : null;
    for (let i = 0; i + 1 < n; i++) {
      const ax = l.pos[3 * i]!;
      const ay = l.pos[3 * i + 1]!;
      const az = l.pos[3 * i + 2]!;
      const bx = l.pos[3 * i + 3]!;
      const by = l.pos[3 * i + 4]!;
      const bz = l.pos[3 * i + 5]!;
      const nach = m ? kieferFeld(m, bx, by, REICH) : null;
      if (m && vor && nach && vor.seite !== nach.seite && !vor.hinten && !nach.hinten) {
        // die Strecke kreuzt die Lippe: dort teilen, jede Hälfte geht mit ihrem Kiefer
        const u = Math.abs(vor.d) / (Math.abs(vor.d) + Math.abs(nach.d) || 1);
        const x = ax + u * (bx - ax);
        const y = ay + u * (by - ay);
        const z = az + u * (bz - az);
        const g = kieferFeld(m, x, y, REICH).gewicht;
        P.push(ax, ay, az, x, y, z, x, y, z, bx, by, bz);
        S.push(vor.seite, vor.seite, nach.seite, nach.seite);
        W.push(vor.gewicht, g, g, nach.gewicht);
        KP.push(x, y, z, x, y, z);
        KS.push(vor.seite, nach.seite);
        KW.push(g, g);
      } else {
        P.push(ax, ay, az, bx, by, bz);
        S.push(vor?.seite ?? 1, nach?.seite ?? 1);
        W.push(vor?.gewicht ?? 0, nach?.gewicht ?? 0);
      }
      vor = nach;
    }
  }
  const a = mitgeher(P, S, W);
  striche = { ...a, netz: new LineSegments(a.geo, linienMaterial) };
  striche.netz.visible = linienAn;
  szene.add(striche.netz);
  const b = mitgeher(KP, KS, KW);
  kreuze = { ...b, netz: new Points(b.geo, kreuzMaterial) };
  kreuze.netz.visible = linienAn;
  kreuze.netz.renderOrder = 5;
  szene.add(kreuze.netz);
  if (m) {
    // die Lippe: vom Mundwinkel der einen Wange um die Spitze zum anderen, je Kiefer eine Linie
    const L: number[] = [];
    const n = 72;
    const bei = (s: number): number => {
      const x = Math.max(0, Math.min(1, s / m.sVorn)) * (m.breite.length - 1);
      const i = Math.floor(x);
      return m.breite[i]! + (m.breite[Math.min(m.breite.length - 1, i + 1)]! - m.breite[i]!) * (x - i);
    };
    for (let i = 0; i <= 2 * n; i++) {
      const u = i <= n ? i / n : 2 - i / n;
      const s = m.sVorn * u;
      const o = m.profil.ort(s);
      L.push(o.x, o.y, (i <= n ? 1 : -1) * (u >= 1 ? 0 : bei(s)));
    }
    const eine = (oben: boolean): Lippe => {
      const q = mitgeher(L, new Array<number>(L.length / 3).fill(oben === m.obenLinks ? 1 : -1), null);
      const geo = new LineGeometry();
      geo.setPositions(L);
      const netz = new Line2(geo, lippeMat.zu);
      netz.renderOrder = 4;
      szene.add(netz);
      return { ...q, netz, gestellt: Float32Array.from(L) };
    };
    lippen = { oben: eine(true), unten: eine(false) };
  }
}

function maulBauen(): string | null {
  if (!form || !wasm) return 'noch nicht geladen';
  weg(hautNetz);
  weg(wandNetz);
  weg(zungenNetz);
  hautNetz = wandNetz = zungenNetz = null;
  zunge = null;
  schnitt = null;
  let fehler: string | null = null;
  if (linie && maulAn) {
    const r = maulSchneiden(wasm, form, linie, { reichweite: REICH });
    if ('fehler' in r) fehler = r.fehler;
    else {
      schnitt = r;
      auslauf = auslaufDreiecke(r.haut.index, r.haut.gewicht);
      normalenPuffer = new Float32Array(r.haut.pos.length);
      const hg = new BufferGeometry();
      hg.setAttribute('position', new BufferAttribute(r.haut.pos.slice(), 3));
      hg.setAttribute('normal', new BufferAttribute(r.haut.nor.slice(), 3));
      hg.setIndex(new BufferAttribute(r.haut.index, 1));
      hautNetz = new Mesh(hg, hautMaterial);
      szene.add(hautNetz);
      const wg = new BufferGeometry();
      wg.setAttribute('position', new BufferAttribute(r.wand.pos.slice(), 3));
      wg.setAttribute('normal', new BufferAttribute(r.wand.nor.slice(), 3));
      wg.setAttribute('sz', new BufferAttribute(r.wand.sz, 2));
      wg.setIndex(new BufferAttribute(r.wand.index, 1));
      wandNetz = new Mesh(wg, wandMaterial);
      szene.add(wandNetz);
      (breiteBild.image.data as Float32Array).set(r.breite);
      breiteBild.needsUpdate = true;
      wandMaterial.uniforms.uSVorn!.value = r.sVorn;
      wandMaterial.uniforms.uFleischBreite!.value = fleischBreite(r);
      zunge = new Zunge(r);
      zungenNetz = new Mesh(zunge.geo, zungenMaterial);
      zungenNetz.frustumCulled = false;
      szene.add(zungenNetz);
      zungeWach = true;
    }
  }
  linienBauen();
  gebissBauen();
  kieferZeigen();
  leisteZeigen();
  return fehler;
}

// ---------- Zähne ----------

const zahnGeo = new Map<ZahnForm, BufferGeometry>();
function geoVon(f: ZahnForm): BufferGeometry {
  let g = zahnGeo.get(f);
  if (!g) {
    g = zahnNetz(f, false);
    zahnGeo.set(f, g);
  }
  return g;
}
function gebissBauen(): void {
  for (const g of zahnGeo.values()) g.dispose();
  zahnGeo.clear();
  for (const k of ['oben', 'unten'] as const) {
    const gb = gebiss[k];
    for (const n of gb.netze) n.removeFromParent();
    gb.netze = [];
    gb.plaetze = [];
    if (!schnitt) continue;
    const P = reihe(schnitt, k === 'oben', gb.werte);
    P.forEach((p, i) => {
      const e = gb.eigen.get(i);
      const q = e ? platzBei(schnitt!, k === 'oben', p.s + e.ds, p.z + e.dz, p.mass * (e.faktor ?? 1), gb.werte.neigung) : p;
      gb.plaetze.push(q);
      const netz = new Mesh(geoVon(e?.form ?? gb.form), zahnMat.ruhig);
      netz.matrixAutoUpdate = false;
      netz.frustumCulled = false;
      netz.userData = { kiefer: k, i };
      szene.add(netz);
      gb.netze.push(netz);
    });
  }
  zaehneStellen();
}
const partner = (k: Kiefer, i: number): number => gebiss[k].werte.anzahl - 1 - i;

const basis = new Matrix4();
function zaehneStellen(): void {
  if (!schnitt) return;
  const c = schnitt.C;
  for (const k of ['oben', 'unten'] as const) {
    const gb = gebiss[k];
    const a = kieferDrehung(k);
    const co = Math.cos(a);
    const si = Math.sin(a);
    const dreh = (v: Vector3, alsOrt: boolean): Vector3 => {
      const x = alsOrt ? v.x - c.x : v.x;
      const y = alsOrt ? v.y - c.y : v.y;
      return new Vector3((alsOrt ? c.x : 0) + co * x - si * y, (alsOrt ? c.y : 0) + si * x + co * y, v.z);
    };
    gb.netze.forEach((netz, i) => {
      const p = gb.plaetze[i]!;
      const f = gb.eigen.get(i)?.form ?? gb.form;
      // zwischen den Kiefern ist nur so viel Platz, wie das Maul offen ist: Ein Zahn innen wird nie länger als der Spalt
      const spalt = 2 * p.r * Math.sin(Math.min(Math.PI, offen()) / 2);
      const innen = randAbstand(schnitt!, p.s, p.z) > 0;
      const hoch = innen ? Math.min(1, (0.94 * spalt) / (f.laenge * p.mass + 1e-9)) : 1;
      // (sprießen: von der Spitze nach hinten, jeder Zahn etwas später)
      const u = Math.max(0, Math.min(1, zahnWuchs * 1.8 - 0.8 * (1 - p.s / schnitt!.sVorn)));
      const wuchs = u * u * (3 - 2 * u) * (1 + 0.25 * Math.sin(Math.PI * u));
      const m = p.mass * wuchs;
      basis.makeBasis(dreh(p.x, false).multiplyScalar(m), dreh(p.y, false).multiplyScalar(m * hoch), dreh(p.zl, false).multiplyScalar(m));
      basis.setPosition(dreh(p.ort, true));
      netz.matrix.copy(basis);
      netz.matrixWorldNeedsUpdate = true;
      netz.visible = zaehneAn && m > 1e-4 && hoch > 0.02;
      const gew = auswahl && auswahl.kiefer === k && (auswahl.i === null || auswahl.i === i || partner(k, auswahl.i) === i);
      netz.material = !auswahl ? zahnMat.ruhig : gew ? zahnMat.gewaehlt : zahnMat.leise;
    });
  }
  anstossen();
}

// ---------- Kiefer ----------

/** die Kiefer in die Anzeige rechnen */
function kieferZeigen(): void {
  const zu = winkel.oben === 0 && winkel.unten === 0;
  // geschlossen steht die Form von vorher im Bild: Das Maul ist dann nur seine Linie
  if (koerperNetz) koerperNetz.visible = !schnitt || zu;
  if (schnitt && hautNetz && wandNetz) {
    hautNetz.visible = wandNetz.visible = !zu;
    const hp = hautNetz.geometry.getAttribute('position') as BufferAttribute;
    const hn = hautNetz.geometry.getAttribute('normal') as BufferAttribute;
    kieferStellen(schnitt, winkel.oben, winkel.unten, { pos: schnitt.haut.pos, nor: schnitt.haut.nor, seite: schnitt.haut.seite, gewicht: schnitt.haut.gewicht }, { pos: hp.array as Float32Array, nor: hn.array as Float32Array });
    if (auslauf && normalenPuffer && !zu) auslaufNormalen(hp.array as Float32Array, schnitt.haut.index, auslauf, schnitt.haut.gewicht, hn.array as Float32Array, normalenPuffer);
    hp.needsUpdate = hn.needsUpdate = true;
    const wp = wandNetz.geometry.getAttribute('position') as BufferAttribute;
    const wn = wandNetz.geometry.getAttribute('normal') as BufferAttribute;
    kieferStellen(schnitt, winkel.oben, winkel.unten, { pos: schnitt.wand.pos, nor: schnitt.wand.nor, seite: schnitt.wand.seite, gewicht: null }, { pos: wp.array as Float32Array, nor: wn.array as Float32Array });
    wp.needsUpdate = wn.needsUpdate = true;
    for (const q of [striche, kreuze]) {
      if (!q) continue;
      const p = q.geo.getAttribute('position') as BufferAttribute;
      kieferStellen(schnitt, winkel.oben, winkel.unten, { pos: q.ruhe, nor: q.nor, seite: q.seite, gewicht: q.gewicht }, { pos: p.array as Float32Array, nor: q.nor });
      p.needsUpdate = true;
    }
    for (const q of lippen ? [lippen.oben, lippen.unten] : []) {
      kieferStellen(schnitt, winkel.oben, winkel.unten, { pos: q.ruhe, nor: q.nor, seite: q.seite, gewicht: null }, { pos: q.gestellt, nor: q.nor });
      (q.netz.geometry as LineGeometry).setPositions(q.gestellt);
    }
    if (lippen) {
      // zu: eine Linie (wie in Florians Blatt türkis), offen: oben rosa, unten blau
      lippen.oben.netz.material = zu ? lippeMat.zu : lippeMat.oben;
      lippen.unten.netz.material = zu ? lippeMat.zu : lippeMat.unten;
      lippen.oben.netz.visible = lippen.unten.netz.visible = linienAn;
    }
    if (zungenNetz) zungenNetz.visible = zungeAn && !zu;
    zungeWach = true;
  }
  zaehneStellen();
  anstossen();
}

let gleitet: { von: [number, number]; nach: [number, number]; start: number; dauer: number; dann: (() => void) | undefined } | null = null;
function gleiten(obenGrad: number, untenGrad: number, dauer = 0.6, dann?: () => void): void {
  gleitet = { von: [winkel.oben, winkel.unten], nach: [(obenGrad * Math.PI) / 180, (untenGrad * Math.PI) / 180], start: performance.now(), dauer: dauer * 1000, dann };
  anstossen();
}

// ---------- Blick ----------

const steuerung = new OrbitControls(kamera, leinwand);
steuerung.enableDamping = true;
steuerung.dampingFactor = 0.12;
steuerung.rotateSpeed = 0.7;
steuerung.addEventListener('change', () => anstossen());
const mitte = new Vector3();
let radius = 100;
function blickSetzen(gier: number, neigung: number, zoom = 1, ziel?: Vector3): void {
  const d = ((radius / Math.sin((kamera.fov * Math.PI) / 360)) * 1.15) / zoom;
  const z = ziel ?? mitte;
  steuerung.target.copy(z);
  kamera.position.set(z.x + d * Math.sin(gier) * Math.cos(neigung), z.y + d * Math.sin(neigung), z.z + d * Math.cos(gier) * Math.cos(neigung));
  kamera.near = d / 60;
  kamera.far = d * 6;
  kamera.updateProjectionMatrix();
  steuerung.update();
  anstossen();
}
/** der Blick auf das Maul: Mitte der Lippe, so nah, dass der Kopf das Bild füllt */
function blickAufsMaul(gier = -0.95, neigung = 0.14): void {
  if (!schnitt) return blickSetzen(gier, neigung);
  const v = schnitt.profil.ort(schnitt.sVorn * 0.6);
  blickSetzen(gier, neigung, radius / (schnitt.lang * 2.6), new Vector3(v.x, v.y, 0));
}

// ---------- Tropfen an den Kiefern ----------

const tropfenFeld = $('tropfen');
const tropfen = (klasse: string, titel: string): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `tropfen ${klasse}`;
  b.title = titel;
  b.hidden = true;
  tropfenFeld.appendChild(b);
  return b;
};
const tropfenOben = tropfen('oben', 'Oberkiefer: ziehen öffnet');
const tropfenUnten = tropfen('unten', 'Unterkiefer: ziehen öffnet');
const tropfenWinkel = tropfen('winkel', 'Mundwinkel');

/** die Stelle eines Kiefer-Tropfens in Ruhe (Seitenebene): vor der Lippe, ein Stück auf seine Seite */
function tropfenRuhe(oben: boolean): V2 {
  const m = schnitt!;
  const v = m.profil.ort(m.sVorn);
  const t = m.profil.tangente(m.sVorn);
  const s = (oben === m.obenLinks ? 1 : -1) * 0.12 * m.lang;
  return { x: v.x + t.x * 0.14 * m.lang - t.y * s, y: v.y + t.y * 0.14 * m.lang + t.x * s };
}
const gedreht = (p: V2, c: V2, a: number): V2 => ({ x: c.x + Math.cos(a) * (p.x - c.x) - Math.sin(a) * (p.y - c.y), y: c.y + Math.sin(a) * (p.x - c.x) + Math.cos(a) * (p.y - c.y) });
/** der Drehsinn eines Kiefers: links der Linie öffnet gegen den Uhrzeigersinn */
const sinn = (oben: boolean): number => (oben === schnitt!.obenLinks ? 1 : -1);
const imBild = (x: number, y: number, z: number): [number, number] => {
  const v = new Vector3(x, y, z).project(kamera);
  return [(0.5 + 0.5 * v.x) * window.innerWidth, (0.5 - 0.5 * v.y) * window.innerHeight];
};
function tropfenStellen(): void {
  const an = !!schnitt && !stift;
  tropfenOben.hidden = tropfenUnten.hidden = tropfenWinkel.hidden = !an;
  if (schnitt && an) {
    for (const [el, oben] of [
      [tropfenOben, true],
      [tropfenUnten, false],
    ] as const) {
      const p = gedreht(tropfenRuhe(oben), schnitt.C, sinn(oben) * (oben ? winkel.oben : winkel.unten));
      const [x, y] = imBild(p.x, p.y, 0);
      el.style.left = `${x.toFixed(1)}px`;
      el.style.top = `${y.toFixed(1)}px`;
    }
    // der Mundwinkel auf der Wange, die zum Betrachter zeigt
    const z = schnitt.breite[0]! * (kamera.position.z >= steuerung.target.z ? 1 : -1);
    const [x, y] = imBild(schnitt.C.x, schnitt.C.y, z);
    tropfenWinkel.style.left = `${x.toFixed(1)}px`;
    tropfenWinkel.style.top = `${y.toFixed(1)}px`;
    // die Knochen laufen in der Mitte des Kopfs (z = 0) vom Scharnier zur Kieferspitze
    const [sx, sy] = imBild(schnitt.C.x, schnitt.C.y, 0);
    [tropfenOben, tropfenUnten].forEach((el, i) => {
      const l = knochen[i]!;
      l.setAttribute('x1', sx.toFixed(1));
      l.setAttribute('y1', sy.toFixed(1));
      l.setAttribute('x2', el.style.left.replace('px', ''));
      l.setAttribute('y2', el.style.top.replace('px', ''));
    });
  }
  for (const l of knochen) l.style.display = an && knochenAn ? '' : 'none';
  entwurfZeigen();
}

const strahl = new Raycaster();
const mittelebene = new Plane(new Vector3(0, 0, 1), 0);
const strahlVon = (e: { clientX: number; clientY: number }): Raycaster => {
  strahl.setFromCamera(new Vector2((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2), kamera);
  return strahl;
};
function kieferZug(el: HTMLButtonElement, oben: boolean): void {
  let start: { y: number; winkel: number } | null = null;
  el.addEventListener('pointerdown', (e) => {
    if (!schnitt) return;
    el.setPointerCapture(e.pointerId);
    el.classList.add('greift');
    gleitet = null;
    start = { y: e.clientY, winkel: oben ? winkel.oben : winkel.unten };
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!start || !schnitt) return;
    let a: number;
    const q = new Vector3();
    if (Math.abs(strahlVon(e).ray.direction.z) > 0.3 && strahl.ray.intersectPlane(mittelebene, q)) {
      // der Tropfen folgt dem Zeiger: Winkel um den Mundwinkel, gegen seine Ruhelage
      const r = tropfenRuhe(oben);
      const c = schnitt.C;
      a = sinn(oben) * Math.atan2((r.x - c.x) * (q.y - c.y) - (r.y - c.y) * (q.x - c.x), (r.x - c.x) * (q.x - c.x) + (r.y - c.y) * (q.y - c.y));
    } else a = start.winkel + ((oben ? -1 : 1) * (e.clientY - start.y)) / 160;
    // (knapp vor „zu“ rastet es zu: Dann steht die Form von vorher im Bild)
    a = a < 0.035 ? 0 : Math.min(1.9, a);
    if (oben) winkel.oben = a;
    else winkel.unten = a;
    kieferZeigen();
  });
  const ende = (): void => {
    if (!start) return;
    start = null;
    el.classList.remove('greift');
  };
  el.addEventListener('pointerup', ende);
  el.addEventListener('pointercancel', ende);
}
kieferZug(tropfenOben, true);
kieferZug(tropfenUnten, false);

// ---------- Linse ----------

const zielGebiss = (): KieferGebiss | null => (auswahl ? gebiss[auswahl.kiefer] : null);
const zielForm = (): ZahnForm | null => {
  const g = zielGebiss();
  if (!g || !auswahl) return null;
  return auswahl.i !== null ? (g.eigen.get(auswahl.i)?.form ?? g.form) : g.form;
};
/** die Form der Auswahl ändern: bei der Reihe die Form des Kiefers, beim einzelnen Zahn seine eigene (und die seines Spiegelbilds) */
function formSetzen(f: ZahnForm): void {
  const g = zielGebiss();
  if (!g || !auswahl) return;
  if (auswahl.i === null) g.form = f;
  else {
    for (const i of new Set([auswahl.i, partner(auswahl.kiefer, auswahl.i)])) {
      const e = g.eigen.get(i) ?? { ds: 0, dz: 0 };
      e.form = f;
      g.eigen.set(i, e);
    }
  }
  gebissBauen();
  linse.zahnSetzen(f);
}
let morph: { von: ZahnForm; nach: ZahnForm; start: number } | null = null;
const perleWerte = (name: 'groesse' | 'neigung' | 'verlauf' | 'sitz', min: number, max: number, kurz: string, lang: string, zeigen: (w: number) => string): Perle => ({
  kurz,
  name: lang,
  min,
  max,
  schritt: 0.1,
  rastet: false,
  wert: () => zielGebiss()?.werte[name] ?? 0,
  setzen: (w) => {
    const g = zielGebiss();
    if (!g) return;
    g.werte[name] = w;
    gebissBauen();
  },
  zeigen,
});
const perlen: Perle[] = [
  {
    kurz: '#',
    name: 'Anzahl',
    min: 1,
    max: 40,
    schritt: 1,
    rastet: true,
    wert: () => zielGebiss()?.werte.anzahl ?? 0,
    setzen: (w) => {
      const g = zielGebiss();
      if (!g || !auswahl) return;
      g.werte.anzahl = Math.round(w);
      g.eigen.clear();
      auswahl.i = null;
      gebissBauen();
    },
    zeigen: (w) => String(Math.round(w)),
  },
  {
    kurz: 'G',
    name: 'Größe',
    min: 0.3,
    max: 2.6,
    schritt: 0.1,
    rastet: false,
    wert: () => {
      const g = zielGebiss();
      if (!g || !auswahl) return 1;
      return auswahl.i !== null ? (g.eigen.get(auswahl.i)?.faktor ?? 1) : g.werte.groesse;
    },
    setzen: (w) => {
      const g = zielGebiss();
      if (!g || !auswahl) return;
      if (auswahl.i === null) g.werte.groesse = w;
      else {
        for (const i of new Set([auswahl.i, partner(auswahl.kiefer, auswahl.i)])) {
          const e = g.eigen.get(i) ?? { ds: 0, dz: 0 };
          e.faktor = w;
          g.eigen.set(i, e);
        }
      }
      gebissBauen();
    },
    zeigen: (w) => `${Math.round(w * 100)} %`,
  },
  {
    kurz: 'B',
    name: 'Biegung',
    min: 0,
    max: 1.4,
    schritt: 0.1,
    rastet: false,
    wert: () => zielForm()?.bogen ?? 0,
    setzen: (w) => {
      const f = zielForm();
      if (f) formSetzen({ ...f, bogen: w });
    },
    zeigen: (w) => `${Math.round((w * 180) / Math.PI)}°`,
  },
  perleWerte('neigung', -0.6, 1.2, 'N', 'Neigung', (w) => `${Math.round((w * 180) / Math.PI)}°`),
  perleWerte('verlauf', 0, 0.9, 'V', 'Verlauf', (w) => `${Math.round(w * 100)} %`),
  perleWerte('sitz', -1.2, 2.4, 'S', 'Sitz', (w) => (w < 0 ? 'außen' : `${w.toFixed(1)}`)),
];
const linse = new Linse($('linse'), grauBild, {
  perlen,
  form: (i) => {
    const von = zielForm();
    const g = zielGebiss();
    if (!von || !g || !auswahl) return;
    if (auswahl.i === null) g.vorlage = i;
    morph = { von, nach: { ...ZAHN_FORMEN[i]!.form }, start: performance.now() };
    anstossen();
  },
});
function auswahlSetzen(a: typeof auswahl): void {
  auswahl = a;
  const f = zielForm();
  const g = zielGebiss();
  if (f && g) linse.oeffnen(f, g.vorlage);
  else linse.schliessen();
  zaehneStellen();
}

// ---------- Zeichnen: eine eigene Maullinie (P) ----------

let stift = false;
/** der Strich, wie er gezeichnet wurde (Seitenebene), und fertig geordnet: vom Mundwinkel nach vorn */
let strich: V2[] = [];
let entwurf: V2[] | null = null;
const zeichnung = document.getElementById('zeichnung') as unknown as SVGSVGElement;
const entwurfPfad = document.createElementNS('http://www.w3.org/2000/svg', 'path');
entwurfPfad.setAttribute('class', 'entwurf');
zeichnung.appendChild(entwurfPfad);
/** die zwei Kieferknochen: je eine Haarlinie vom Mundwinkel zum Tropfen an der Kieferspitze */
const knochen = [0, 1].map(() => {
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('class', 'knochen');
  zeichnung.appendChild(l);
  return l;
});
const maulTropfen = document.createElement('button');
maulTropfen.type = 'button';
maulTropfen.className = 'pille maul-tropfen';
maulTropfen.textContent = 'Maul';
maulTropfen.title = 'Aus dieser Linie wird das Maul';
maulTropfen.hidden = true;
tropfenFeld.appendChild(maulTropfen);

function entwurfZeigen(): void {
  const p = entwurf ?? (strich.length > 1 ? strich : null);
  if (!p) {
    entwurfPfad.setAttribute('d', '');
    maulTropfen.hidden = true;
    return;
  }
  entwurfPfad.setAttribute('d', p.map((q, i) => `${i ? 'L' : 'M'}${imBild(q.x, q.y, 0).map((v) => v.toFixed(1)).join(',')}`).join(''));
  maulTropfen.hidden = !entwurf;
  if (entwurf) {
    // der Tropfen hängt am Mundwinkel
    const [x, y] = imBild(entwurf[0]!.x, entwurf[0]!.y, 0);
    maulTropfen.style.left = `${x.toFixed(1)}px`;
    maulTropfen.style.top = `${(y + 22).toFixed(1)}px`;
  }
}

/** wie dick die Form an einer Stelle der Seitenebene ist (0: daneben) */
function dickeBei(p: V2): number {
  if (!koerperNetz) return 0;
  // (von beiden Seiten: Das Material der Haut zeigt nur seine Vorderseite, ein Strahl trifft also nur beim Eintreten)
  strahl.set(new Vector3(p.x, p.y, 1e5), new Vector3(0, 0, -1));
  const a = strahl.intersectObject(koerperNetz, false)[0];
  strahl.set(new Vector3(p.x, p.y, -1e5), new Vector3(0, 0, 1));
  const b = strahl.intersectObject(koerperNetz, false)[0];
  return a && b ? a.point.z - b.point.z : 0;
}

/** einen Strich glätten: ausdünnen, dann zweimal Ecken abschneiden */
function glaetten(p: V2[], genau: number): V2[] {
  const rdp = (a: number, b: number, aus: V2[]): void => {
    let weit = 0;
    let j = -1;
    const A = p[a]!;
    const B = p[b]!;
    const l = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((B.x - A.x) * (p[i]!.y - A.y) - (B.y - A.y) * (p[i]!.x - A.x)) / l;
      if (d > weit) {
        weit = d;
        j = i;
      }
    }
    if (j >= 0 && weit > genau) {
      rdp(a, j, aus);
      rdp(j, b, aus);
    } else aus.push(B);
  };
  let q: V2[] = [p[0]!];
  rdp(0, p.length - 1, q);
  for (let r = 0; r < 2; r++) {
    const n: V2[] = [q[0]!];
    for (let i = 0; i + 1 < q.length; i++) {
      const a = q[i]!;
      const b = q[i + 1]!;
      n.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    n.push(q[q.length - 1]!);
    q = n;
  }
  return q;
}

function strichFertig(): void {
  if (strich.length < 3) {
    strich = [];
    return;
  }
  let p = glaetten(strich, radius * 0.004);
  // der Mundwinkel ist das Ende, an dem die Form dick ist; das andere Ende liegt vorn (vor der Form oder an ihrem Rand)
  if (dickeBei(p[0]!) < dickeBei(p[p.length - 1]!)) p = p.reverse();
  strich = [];
  entwurf = p;
  maulTropfen.classList.remove('quillt');
  void maulTropfen.offsetWidth;
  maulTropfen.classList.add('quillt');
  anstossen();
}
function stiftSetzen(an: boolean): void {
  stift = an;
  steuerung.enabled = !an;
  document.body.classList.toggle('stift', an);
  if (an) {
    auswahlSetzen(null);
    gleiten(0, 0, 0.3);
    blickSetzen(0, 0, schnitt ? radius / (schnitt.lang * 3.4) : 1, schnitt ? new Vector3(schnitt.C.x - schnitt.lang * 0.4, schnitt.C.y, 0) : undefined);
    melden('Zeichne die Maullinie von der Seite: von vor der Form bis zum Mundwinkel');
  } else {
    strich = [];
    entwurf = null;
  }
  leisteZeigen();
  anstossen();
}
maulTropfen.addEventListener('click', () => {
  if (!entwurf) return;
  linie = entwurf;
  maulAn = true;
  winkel.oben = winkel.unten = 0;
  const f = maulBauen();
  stiftSetzen(false);
  if (f) return melden(f);
  melden(`Maul aus deiner Linie · Schnitt in ${schnitt!.ms.toFixed(0)} ms`);
  blickAufsMaul();
  // es zeigt sich: einmal auf und halb wieder zu
  gleiten(8, 34, 0.5, () => gleiten(5, 20, 0.45));
});

// ---------- Eingaben auf der Bühne: Zähne wählen und rücken, Zunge ziehen, zeichnen ----------

let zug: { art: 'zahn'; kiefer: Kiefer; i: number; weg: number } | { art: 'zunge'; ebene: Plane } | { art: 'strich' } | { art: 'leer'; x: number; y: number } | null = null;
leinwand.addEventListener(
  'pointerdown',
  (e) => {
    if (stift) {
      const q = new Vector3();
      if (strahlVon(e).ray.intersectPlane(mittelebene, q)) {
        entwurf = null;
        strich = [{ x: q.x, y: q.y }];
        zug = { art: 'strich' };
        leinwand.setPointerCapture(e.pointerId);
      }
      return;
    }
    strahlVon(e);
    if (zaehneAn && offen() > 0.01) {
      const t = strahl.intersectObjects(
        [...gebiss.oben.netze, ...gebiss.unten.netze].filter((n) => n.visible),
        false,
      )[0];
      if (t) {
        const { kiefer, i } = t.object.userData as { kiefer: Kiefer; i: number };
        // erster Tipp: die Reihe; ein Tipp auf einen Zahn der gewählten Reihe: dieser Zahn
        if (!auswahl || auswahl.kiefer !== kiefer) auswahlSetzen({ kiefer, i: null });
        else if (auswahl.i !== i && partner(kiefer, auswahl.i ?? -9) !== i) auswahlSetzen({ kiefer, i });
        zug = { art: 'zahn', kiefer, i, weg: 0 };
        steuerung.enabled = false;
        leinwand.setPointerCapture(e.pointerId);
        return;
      }
    }
    if (zunge && zungenNetz?.visible) {
      const t = strahl.intersectObject(zungenNetz, false)[0];
      if (t) {
        const k = zunge.naechster(t.point);
        zunge.greifen(k);
        const blick = new Vector3();
        kamera.getWorldDirection(blick);
        zug = { art: 'zunge', ebene: new Plane().setFromNormalAndCoplanarPoint(blick, zunge.ort(k)) };
        zungeWach = true;
        steuerung.enabled = false;
        leinwand.setPointerCapture(e.pointerId);
        document.body.classList.add('zieht');
        return;
      }
    }
    zug = { art: 'leer', x: e.clientX, y: e.clientY };
  },
  { capture: true },
);
leinwand.addEventListener('pointermove', (e) => {
  if (!zug) return;
  if (zug.art === 'strich') {
    const q = new Vector3();
    if (strahlVon(e).ray.intersectPlane(mittelebene, q)) {
      const l = strich[strich.length - 1]!;
      if (Math.hypot(q.x - l.x, q.y - l.y) > radius * 0.003) strich.push({ x: q.x, y: q.y });
      anstossen();
    }
  } else if (zug.art === 'zunge' && zunge) {
    const q = new Vector3();
    if (strahlVon(e).ray.intersectPlane(zug.ebene, q)) zunge.ziehen(q);
    zungeWach = true;
    anstossen();
  } else if (zug.art === 'zahn' && schnitt && wandNetz && auswahl?.i === zug.i) {
    zug.weg += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (zug.weg < 4) return;
    // der Zahn rückt auf seiner Wand: Treffer des Strahls, in die Ruhe des Kiefers zurückgedreht
    const a = kieferDrehung(zug.kiefer);
    const fb = fleischBreite(schnitt);
    for (const t of strahlVon(e).intersectObject(wandNetz, false)) {
      const r = gedreht({ x: t.point.x, y: t.point.y }, schnitt.C, -a);
      const o = schnitt.profil.naechster(r.x, r.y);
      if (o.hinten || Math.abs(o.d) > 0.02 * schnitt.lang) continue;
      // nur im Maul und ein Stück davor: Weiter hinaus hält ihn die Lippe fest
      const rand = randAbstand(schnitt, o.s, t.point.z);
      if (rand < -0.5 * fb || rand > 3.2 * fb) break;
      const g = gebiss[zug.kiefer];
      const grund = reihe(schnitt, zug.kiefer === 'oben', g.werte)[zug.i]!;
      const e1 = g.eigen.get(zug.i) ?? { ds: 0, dz: 0 };
      e1.ds = o.s - grund.s;
      e1.dz = t.point.z - grund.z;
      g.eigen.set(zug.i, e1);
      const p = partner(zug.kiefer, zug.i);
      if (p !== zug.i) {
        const e2 = g.eigen.get(p) ?? { ds: 0, dz: 0 };
        e2.ds = e1.ds;
        e2.dz = -e1.dz;
        g.eigen.set(p, e2);
      }
      gebissBauen();
      break;
    }
  }
});
const zugEnde = (e: PointerEvent): void => {
  const z = zug;
  zug = null;
  if (!z) return;
  if (z.art === 'strich') strichFertig();
  else if (z.art === 'zunge') {
    zunge?.lassen();
    zungeWach = true;
    document.body.classList.remove('zieht');
  } else if (z.art === 'leer' && Math.hypot(e.clientX - z.x, e.clientY - z.y) < 4 && auswahl) auswahlSetzen(null);
  if (!stift) steuerung.enabled = true;
  anstossen();
};
leinwand.addEventListener('pointerup', zugEnde);
leinwand.addEventListener('pointercancel', zugEnde);

// ---------- Leiste unten ----------

const fuss = $('fuss');
const meldung = $('meldung');
let meldungUhr = 0;
function melden(text: string): void {
  meldung.textContent = text;
  meldung.hidden = false;
  meldung.style.opacity = '1';
  window.clearTimeout(meldungUhr);
  meldungUhr = window.setTimeout(() => (meldung.style.opacity = '0'), 3200);
}
function pille(text: string, titel: string, klick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pille';
  b.textContent = text;
  b.title = titel;
  b.addEventListener('click', klick);
  fuss.appendChild(b);
  return b;
}
const pStift = pille('P · Linie', 'eine Maullinie von der Seite zeichnen (P)', () => stiftSetzen(!stift));
const pMaul = pille('Maul', 'das Maul an und aus: Aus ist die Form, wie sie war', () => {
  maulAn = !maulAn;
  const f = maulBauen();
  if (f) melden(f);
});
const pZaehne = pille('Zähne', 'Zähne einschalten: Sie sprießen gleichmäßig auf dem Zahnfleisch', () => zaehneSetzen(!zaehneAn));
const pZunge = pille('Zunge', 'die Zunge: ziehen wie Gummi', () => {
  zungeAn = !zungeAn;
  kieferZeigen();
  leisteZeigen();
});
const pLinien = pille('Linien', 'die Linien der Form und die Lippe zeigen', () => {
  linienAn = !linienAn;
  if (striche) striche.netz.visible = linienAn;
  if (kreuze) kreuze.netz.visible = linienAn;
  kieferZeigen();
  leisteZeigen();
});
const trenner = document.createElement('span');
trenner.className = 'leise';
trenner.textContent = 'Blick';
fuss.appendChild(trenner);
pille('Seite', 'von der Seite (1)', () => (schnitt ? blickAufsMaul(0, 0) : blickSetzen(0, 0)));
pille('Schräg', 'schräg von vorn (2)', () => (schnitt ? blickAufsMaul() : blickSetzen(-0.75, 0.22)));
pille('Front', 'von vorn (3)', () => (schnitt ? blickAufsMaul(-Math.PI / 2, 0.05) : blickSetzen(-Math.PI / 2, 0)));
pille('Ganz', 'die ganze Form (4)', () => blickSetzen(-0.75, 0.22));

function leisteZeigen(): void {
  pStift.setAttribute('aria-pressed', String(stift));
  pMaul.setAttribute('aria-pressed', String(maulAn && !!schnitt));
  pZaehne.setAttribute('aria-pressed', String(zaehneAn));
  pZunge.setAttribute('aria-pressed', String(zungeAn));
  pLinien.setAttribute('aria-pressed', String(linienAn));
  // Zähne und Zunge gibt es erst mit einem Maul: Sie quellen dann aus der Leiste
  for (const b of [pZaehne, pZunge]) {
    const war = b.hidden;
    b.hidden = !schnitt;
    if (war && !b.hidden) {
      b.classList.remove('quillt');
      void b.offsetWidth;
      b.classList.add('quillt');
    }
  }
}
function zaehneSetzen(an: boolean): void {
  zaehneAn = an;
  zahnWuchs = an ? 0 : 1;
  if (!an) auswahlSetzen(null);
  else if (offen() < 0.2) gleiten(8, 30, 0.5);
  zaehneStellen();
  leisteZeigen();
}
window.addEventListener('keydown', (e) => {
  if (e.key === '1') {
    if (schnitt) blickAufsMaul(0, 0);
    else blickSetzen(0, 0);
  } else if (e.key === '2') {
    if (schnitt) blickAufsMaul();
    else blickSetzen(-0.75, 0.22);
  } else if (e.key === '3') {
    if (schnitt) blickAufsMaul(-Math.PI / 2, 0.05);
    else blickSetzen(-Math.PI / 2, 0);
  } else if (e.key === '4') blickSetzen(-0.75, 0.22);
  else if (e.key === 'p' || e.key === 'P') stiftSetzen(!stift);
  else if (e.key === 'Escape') {
    if (stift) stiftSetzen(false);
    else auswahlSetzen(null);
  }
});

// ---------- Bildtakt ----------

let zuletzt = performance.now();
function bild(jetzt: number): void {
  const dt = Math.min(0.05, (jetzt - zuletzt) / 1000);
  zuletzt = jetzt;
  steuerung.update();
  if (gleitet) {
    const u = Math.min(1, (jetzt - gleitet.start) / gleitet.dauer);
    // (weich mit einem kleinen Überschwingen, wie ein Tropfen)
    const k = 1 - Math.pow(1 - u, 3) * Math.cos(u * Math.PI * 1.1);
    winkel.oben = Math.max(0, gleitet.von[0] + (gleitet.nach[0] - gleitet.von[0]) * k);
    winkel.unten = Math.max(0, gleitet.von[1] + (gleitet.nach[1] - gleitet.von[1]) * k);
    if (u >= 1) {
      [winkel.oben, winkel.unten] = gleitet.nach;
      const dann = gleitet.dann;
      gleitet = null;
      dann?.();
    }
    kieferZeigen();
  }
  if (zaehneAn && zahnWuchs < 1) {
    zahnWuchs = Math.min(1, zahnWuchs + dt / 0.9);
    zaehneStellen();
  }
  if (morph) {
    const u = Math.min(1, (jetzt - morph.start) / 260);
    formSetzen(mischen(morph.von, morph.nach, u * u * (3 - 2 * u)));
    if (u >= 1) morph = null;
    anstossen();
  }
  if (zunge && zungeAn && zungeWach && schnitt && offen() > 0) {
    const [l, r] = seitenDrehung();
    zungeWach = zunge.schritt(dt, l, r);
    schmutzig = true;
  }
  if (schmutzig) {
    schmutzig = false;
    renderer.render(szene, kamera);
    tropfenStellen();
  }
  requestAnimationFrame(bild);
}

// ---------- Haken für Bilder und Proben ----------

const zeichnen = (): void => {
  renderer.render(szene, kamera);
  tropfenStellen();
};
const haken = {
  bereit: false,
  fehler: null as string | null,
  info: () => ({
    form: form?.name ?? null,
    punkte: form ? form.pos.length / 3 : 0,
    dreiecke: form ? form.tri.length / 3 : 0,
    linien: form?.linien.length ?? 0,
    min: form?.min ?? null,
    max: form?.max ?? null,
    schnitt: schnitt ? { ms: schnitt.ms, sVorn: schnitt.sVorn, lang: schnitt.lang, obenLinks: schnitt.obenLinks, hautPunkte: schnitt.haut.pos.length / 3, wandDreiecke: schnitt.wand.index.length / 3, kreuzungen: kreuze ? kreuze.ruhe.length / 6 : 0 } : null,
    winkel: { ...winkel },
    zaehne: { an: zaehneAn, oben: gebiss.oben.werte.anzahl, unten: gebiss.unten.werte.anzahl },
    auswahl,
  }),
  blick: (gier: number, neigung: number, zoom = 1, ziel?: [number, number, number]) => {
    blickSetzen(gier, neigung, zoom, ziel ? new Vector3(...ziel) : undefined);
    zeichnen();
  },
  blickMaul: (gier?: number, neigung?: number) => {
    blickAufsMaul(gier, neigung);
    zeichnen();
  },
  kiefer: (obenGrad: number, untenGrad: number) => {
    gleitet = null;
    winkel.oben = (obenGrad * Math.PI) / 180;
    winkel.unten = (untenGrad * Math.PI) / 180;
    kieferZeigen();
    // (die Zunge an ihren Platz setzen: ein paar Bilder vorspulen)
    if (zunge) {
      const [l, r] = seitenDrehung();
      for (let i = 0; i < 90; i++) zunge.schritt(1 / 60, l, r);
    }
    zeichnen();
  },
  linie: (p: V2[] | null) => {
    linie = p;
    const f = maulBauen();
    zeichnen();
    return f ?? haken.info().schnitt;
  },
  maul: (an: boolean) => {
    maulAn = an;
    const f = maulBauen();
    zeichnen();
    return f;
  },
  linien: (an: boolean) => {
    linienAn = an;
    if (striche) striche.netz.visible = an;
    if (kreuze) kreuze.netz.visible = an;
    kieferZeigen();
    zeichnen();
  },
  zaehne: (an: boolean, sofort = true) => {
    zaehneSetzen(an);
    gleitet = null;
    if (sofort) zahnWuchs = 1;
    zaehneStellen();
    zeichnen();
  },
  zunge: (an: boolean) => {
    zungeAn = an;
    kieferZeigen();
    zeichnen();
  },
  knochen: (an: boolean) => {
    knochenAn = an;
    zeichnen();
  },
  waehlen: (kiefer: Kiefer | null, i: number | null = null) => {
    auswahlSetzen(kiefer ? { kiefer, i } : null);
    zeichnen();
  },
  /** eine Vorlage für die Auswahl setzen (ohne Überblenden) und einen Wert einer Perle */
  vorlage: (i: number) => {
    const g = zielGebiss();
    if (g && auswahl?.i === null) g.vorlage = i;
    formSetzen({ ...ZAHN_FORMEN[i]!.form });
    zeichnen();
  },
  perle: (kurz: string, wert: number) => {
    perlen.find((p) => p.kurz === kurz)?.setzen(wert);
    zeichnen();
  },
  /** die Zungenspitze um einen Versatz ziehen (in Längen der Lippe) und halten oder loslassen */
  zungeZiehen: (dx: number, dy: number, dz: number, halten = true) => {
    if (!zunge || !schnitt) return;
    const k = zunge.knoten - 2;
    zunge.greifen(k);
    const o = zunge.ort(k);
    zunge.ziehen(new Vector3(o.x + dx * schnitt.lang, o.y + dy * schnitt.lang, o.z + dz * schnitt.lang));
    const [l, r] = seitenDrehung();
    for (let i = 0; i < 60; i++) zunge.schritt(1 / 60, l, r);
    if (!halten) zunge.lassen();
    zeichnen();
  },
  stift: (an: boolean) => stiftSetzen(an),
  /** ein Ort der Form im Bild (CSS-Pixel) und die Spitze der Zunge im Bild */
  imBild: (x: number, y: number, z = 0) => imBild(x, y, z),
  zungenSpitze: () => {
    if (!zunge) return null;
    const o = zunge.ort(zunge.knoten - 2);
    return imBild(o.x, o.y, o.z);
  },
  /** einen Strich vorgeben, als wäre er gezeichnet (Seitenebene), und bestätigen */
  strich: (p: V2[], bestaetigen = false) => {
    strich = p.slice();
    strichFertig();
    zeichnen();
    if (bestaetigen) maulTropfen.click();
    return entwurf;
  },
  /** Bildpunkte, in denen sich das Bild mit geschlossenem Maul vom Bild ohne Maul unterscheidet (und wie viele die Form deckt) */
  vergleich: () => {
    const lesen = (): Uint8ClampedArray => {
      renderer.render(szene, kamera);
      const c = document.createElement('canvas');
      c.width = leinwand.width;
      c.height = leinwand.height;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(leinwand, 0, 0);
      return g.getImageData(0, 0, c.width, c.height).data;
    };
    const vorher = { ...winkel, maulAn, linienAn };
    gleitet = null;
    linienAn = false;
    winkel.oben = winkel.unten = 0;
    maulAn = false;
    maulBauen();
    const a = lesen();
    maulAn = true;
    maulBauen();
    const b = lesen();
    let deckt = 0;
    let anders = 0;
    let groesster = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i]! < 250 || a[i + 1]! < 250 || a[i + 2]! < 250) deckt++;
      const d = Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!));
      if (d > 2) anders++;
      groesster = Math.max(groesster, d);
    }
    winkel.oben = vorher.oben;
    winkel.unten = vorher.unten;
    maulAn = vorher.maulAn;
    linienAn = vorher.linienAn;
    maulBauen();
    return { form: deckt, anders, groesster };
  },
  /** wie lange das Stellen der Kiefer dauert (Mittel über `n` Stellungen, Millisekunden) */
  kieferZeit: (n = 40) => {
    const vorher = { ...winkel };
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      winkel.oben = 0.1 + 0.002 * i;
      winkel.unten = 0.3 + 0.004 * i;
      kieferZeigen();
    }
    const ms = (performance.now() - t0) / n;
    winkel.oben = vorher.oben;
    winkel.unten = vorher.unten;
    kieferZeigen();
    return ms;
  },
};
(window as unknown as { __maul: typeof haken }).__maul = haken;

// ---------- Start ----------

async function start(): Promise<void> {
  groesse();
  leisteZeigen();
  requestAnimationFrame(bild);
  try {
    [form, wasm] = await Promise.all([formLaden(NAME, FEIN), manifoldLaden()]);
  } catch (e) {
    haken.fehler = String(e);
    melden(String(e));
    return;
  }
  mitte.set(0.5 * (form.min[0] + form.max[0]), 0.5 * (form.min[1] + form.max[1]), 0);
  radius = 0.5 * Math.hypot(form.max[0] - form.min[0], form.max[1] - form.min[1], form.max[2] - form.min[2]);
  koerperBauen();
  const ausAdresse = adresse.get('linie');
  linie = ausAdresse
    ? ausAdresse.split(';').map((q) => {
        const [x, y] = q.split(',').map(Number);
        return { x: x ?? 0, y: y ?? 0 };
      })
    : (STANDARD[NAME] ?? null);
  const f = maulBauen();
  if (f) melden(f);
  if (schnitt) {
    melden(`Maul aus einer Linie · Schnitt in ${schnitt.ms.toFixed(0)} ms`);
    blickAufsMaul();
    if (adresse.get('ruhe') !== '1') gleiten(5, 20, 0.7);
  } else {
    blickSetzen(-0.75, 0.22);
    melden('P: eine Maullinie von der Seite zeichnen');
  }
  haken.bereit = true;
}
void start();
