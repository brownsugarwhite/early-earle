// Form zuerst (05.11.2026), Schritt 1 „Nur Loops“ (Fenster `kurven.html`, Florian): Die Kugel hat am Anfang keine Loops. Loops
// werden quer über den Körper geschnitten (in Seite, Front und Top) oder als geschlossene Form gezeichnet; es gibt keine offenen
// Linien. Griffe sind Kreuzungen von Loops (entstehen von selbst) und Punkte, die er auf eine Linie setzt (Doppelklick) oder mit
// einer Form zeichnet; sie lassen sich löschen. Ein ganzer Loop wird angeklickt und gezogen oder mit G/S/R geformt, mit O
// (Einflusskreis) wie in Blender. Der Umriss ist nur Shader. Die Haut löst `LoopZug` im Einflussbereich. Start: `?form=kugel|bohne`.
// (Der Beweis davor, „Kurven als Wahrheit“ mit dem Startumriss als Loop 0, steht in Commit bb0c837d.)
// Griffe (Florian, 05.11.): Jeder gewählte Punkt zeigt seine Bézier-Griffe (gespeichert, Teil A 06.11.); ein Griff biegt nur
// sein Stück. Glatt ● hält die Griffe gegenüber, an einer Ecke ◆ darf die Linie knicken (Doppelklick oder ⌥-Klick schaltet um);
// die Kreuzung mit einer Kante wird von selbst eine Ecke. Kante an/aus ist eine eigene Einstellung (Taste K). Wie in
// Illustrator gehen die Griffe mit ihrem Punkt (S/R drehen und skalieren sie mit), ein Punkt ändert nur die zwei Stücke bis zu
// seinen Nachbarn. Jedes Blatt hat einen eigenen Ausschnitt (Rad/Pinch zoomt, zwei Finger/mittlere Taste verschieben, Pos1).
// Das Netz verdichtet sich selbst (`verdichten`): nach jedem Zug, und bei weiten Zügen in Stufen, in denen der Bereich mitwächst.
// Spiegelpunkte (Ende eines Rings auf der Mittelebene) zeigen beide Griffe, der zweite ist das Spiegelbild; beide sind frei
// ziehbar (die Linie knickt dort spiegelgleich, der Punkt wird eine Ecke), glatt steht der Griff senkrecht zur Mittelebene.
// Doppelklick auf einen Griff schaltet seinen Punkt um (an Kreuzungen liegt oft der Punkt des anderen Loops obenauf).
// Maul (Florian: „Mund = Loop“): eine schmale Form ums Maul (F, vorn über den Umriss oder über die Mitte) wird mit dem Regler „Maul“
// im 3D-Blatt das Maul. Ihr Inneres ist die Öffnung, ihr fernster Punkt der Mundwinkel ◆; die Lippen bleiben Loops wie die anderen.
// Das Netz bleibt geschlossen (die Öffnung wird nicht gezeigt), die Grundform zeigt das Maul zu, so wie es gezeichnet ist.
// Die Linie ist ihr Pfad (07.11., Florian: „ja genau zur Bézier-Kurve machen“): In der Grundform liegt jede Linie genau auf dem
// Bézier-Pfad aus ihren Punkten und Griffen, die Haut folgt; ein neuer Loop springt beim Anlegen örtlich darauf (ohne Zusatzpunkte;
// `?punkte=noetig` zum Vergleich), eine Kreuzung ist ein Ort, O formt über Punkte und Griffspitzen. Die Blätter zeichnen die Linie als
// ihren Bézier-Pfad, und nach einem Zug wird das Netz an den Linien so fein, dass es höchstens MK/40 von ihrer Kurve abweicht (08.11.,
// kleine Details waren eckig).
// Fressen-Pose (Florian: „in der Pose ganz normal die Bézier-Punkte bearbeiten und den Blendshape erstellen“): Knopf „Fressen“ oder
// die Regler Maul und Kopf (Unterkiefer und Schädel als Knochen) zeigen die Pose. Darin wirken alle Werkzeuge wie in der Grundform
// auf das, was zu sehen ist; gespeichert wird der Unterschied zur Grundform vor den Knochen (Blendshape, `poseLoop.ts`). Grundform
// und Pose haben dasselbe Netz; neue Punkte oder Loops gibt es in beiden, die Grundform ändern sie nicht.

import {
  type Ansicht,
  LoopZug,
  MAUL_WINKEL_MAX,
  type V3,
  eckenAuto,
  griffeBei,
  hatGriffe,
  haerteBei,
  kanteBei,
  knickQuer,
  knickReihe,
  istEcke,
  istSichtbar,
  hautNormalen,
  innenPosieren,
  knickWinkel,
  knochenDrehen,
  mitteKreuzungen,
  maulAmLoop,
  pfadAbweichung,
  pfadVersatz,
  istMaulLinie,
  obereLippe,
  zwillinge,
  zwillingsFehler,
} from '@ee/shape/dicht';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  GreaterDepth,
  HemisphereLight,
  LessEqualDepth,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  RedFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  OrbitControls,
} from 'three/examples/jsm/controls/OrbitControls.js';
import {
  istTrackpad,
  radFaktor,
} from '../viewports/ansicht2d';
import {
  auskunft,
  entpacken,
  packen,
  pruefen,
} from './ablage';
import {
  GlattPlan,
  type LinienKante,
} from './glattPlan';
import {
  GLATT,
  FEIN,
  haut,
  MK,
  loops,
  pose,
  grund,
  inAnzeige,
  KRUEMMUNG,
  GEWICHTE,
  RICHTUNG_OPT,
  mitBereich,
  direktAn,
  direktGilt,
  direktBereit,
  letztesDirektBereiten,
  exakt,
  festlegenAlle,
  letzteVerdichtung,
  ruheOffen,
  type Schnappschuss,
  zurueck,
  schnappschuss,
  wiederherstellen,
  loopNr,
  lageAus,
  spiegeln,
  abstand,
  SCHNITT_RAND,
  anzeigeQuelle,
  anzeigeKante,
  anzeigeIndex,
  teilungNeu,
  ausschnitt,
  imBlatt,
  schieben,
  mundwinkelVon,
  maulAktuell,
  maulIstGeformt,
  indexOhneOeffnung,
  poseKnochen,
  poseBetreten,
  alsAnzeige,
  poseVerlassen,
  knochenSetzen,
  maulLauf,
  maulFormenGewaehlt,
  hautSeite,
  anzeigeZ,
  indexOhneAnliegende,
  glattStufen,
  glattZiel,
  pfadStuecke,
  type Band,
  uvAus,
  linienVon,
  aktuelleLagen,
  zeigeLage,
  streckeOffen,
  zwischenPunkte,
  BREITE_KNICK,
  pfadKurven,
  gezeichnetNeben,
  kantenFlaeche,
  auswahlMitte,
  griffeZumZeigen,
  blaetterZeichnen,
  vorrechnenUhr,
  vorrechnenPlanen,
  letztesVorrechnen,
  letztesNachLoesen,
  zeiten,
  messung,
  letzteZerlegung,
  letzterBereich,
  hinterDerMitteZahl,
  zug,
  griffZugStarten,
  eckeGezeigt,
  eckeUmschalten,
  zugStarten,
  zugBewegen,
  letzteUnruhe,
  unruheZahl,
  davonZahl,
  davongelaufen,
  umgeschlageneZahl,
  hintergrundStufen,
  letzteAusloesungMs,
  ausloesungTeile,
  hintergrundTeile,
  letzteEinwechslungMs,
  einwechslungTeile,
  letztesAuspacken,
  letzteHintergrundMs,
  zerleger,
  hintergrundAus,
  nachlauf,
  letzterAuftrag,
  letzterZwischenstand,
  nachlaufRunden,
  griffWartet,
  zugStufen,
  letzteEndrunden,
  letzteStufeMs,
  zugEnde,
  letztesLoslassen,
  loopSchneiden,
  letzteNadeln,
  kanteSetzen,
  letztesNeuRechnen,
  formErstellen,
  punktAmKlick,
  loeschen,
  stiftDruecken,
  stiftBewegen,
  stiftStueck,
  stiftFertig,
  type AbzweigOrt,
  abzweigAnfangImBlatt,
  abzweigIstAnfang,
  ABZWEIG_WEITER,
  abzweigBeginnen,
  abzweigAbbrechen,
  abzweigungErstellen,
  doppelklick,
  haltenSchalten,
  BEHALTEN,
  standJetzt,
  speicher,
  type Davor,
  behaltenBereit,
  behaltenAus,
  letztesBehalten,
  behaltenLaeuft,
  nameGueltig,
  behaltenPlanen,
  behaltenJetzt,
  davorLaeuft,
  behaltenesHolen,
  ABLAGE,
  ablageListe,
  wesenUebernehmen,
  wesenLaden,
  wesenNeu,
  bildRechnen,
  G,
  anzeige,
} from './werk';


const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
const KURVE = 0x0e9f8e;
const KURVE_WAHL = 0x0a5f56;
const LIPPE = 0xb0413a;
const MAULFARBE = 0x7a3431;
/** So viele Welteinheiten passen in die kürzere Seite eines Blatts. */
const SICHT = 560;
const GLATT_RUHE_MS = 200;
/**
 * Normalen der glatten Anzeige: je Rechenpunkt gemessen, so oft beruhigt und mit den Lagen verfeinert (`GlattPlan.rechnen`). An ihnen
 * hängen die Farbstufen. `?ruhe=-1`: die Normalen der gewöhnlich unterteilten Fläche wie im Vergleichsbild vom 12.11. (zum Vergleich;
 * auf dem ungleichmäßigen Netz laufen die Farbstufen damit in Wellen).
 */
const GLATT_RUHE = Number(new URLSearchParams(location.search).get('ruhe') ?? 3);

// ---------- Darstellung ----------

const feld = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Feld fehlt: ${id}`);
  return e;
};
const felder = { seite: feld('feld-seite'), front: feld('feld-front'), top: feld('feld-top'), drei: feld('feld-3d') };
const blaetter: Record<Ansicht, SVGSVGElement> = {
  seite: document.getElementById('blatt-seite') as unknown as SVGSVGElement,
  front: document.getElementById('blatt-front') as unknown as SVGSVGElement,
  top: document.getElementById('blatt-top') as unknown as SVGSVGElement,
};
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;
const statusZeile = document.getElementById('status') as HTMLSpanElement;
const knopfLoop = document.getElementById('knopf-loop') as HTMLButtonElement;
const knopfO = document.getElementById('knopf-o') as HTMLButtonElement;

const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.autoClear = false;
const szene = new Scene();
const stufen = new DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, RedFormat);
stufen.minFilter = NearestFilter;
stufen.magFilter = NearestFilter;
stufen.needsUpdate = true;
const SCHNITT_VERTEX = GLATT ? 'attribute float aSeite;\nvarying vec2 vSchnitt;' : '';
const SCHNITT_VERTEX_MAIN = GLATT ? 'vSchnitt = vec2(aSeite, position.z);' : '';
const SCHNITT_FRAGMENT = GLATT ? 'varying vec2 vSchnitt;' : '';
const SCHNITT_FRAGMENT_MAIN = GLATT ? `if (vSchnitt.x * vSchnitt.y < -${SCHNITT_RAND.toFixed(3)} * abs(vSchnitt.x)) discard;` : '';
/**
 * Material der Haut. Glatte Anzeige: dieselben vier Stufen an denselben Schwellen wie `stufen`, die Grenze aber einen Bildpunkt
 * breit geglättet (eine harte Schwelle je Bildpunkt gibt Treppen), dazu der Schnitt an der Spiegelebene.
 */
function hautMaterial(farbe: number): MeshToonMaterial {
  if (!GLATT) return new MeshToonMaterial({ color: farbe, gradientMap: stufen });
  const m = new MeshToonMaterial({ color: farbe });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SCHNITT_VERTEX}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${SCHNITT_VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SCHNITT_FRAGMENT}`)
      .replace(
        '#include <gradientmap_pars_fragment>',
        /* glsl */ `
        vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
          float x = dot( normal, lightDirection ) * 0.5 + 0.5;
          float w = max( fwidth( x ), 1e-5 ) * 0.85;
          float g = mix( 70.0 / 255.0, 135.0 / 255.0, smoothstep( 0.25 - w, 0.25 + w, x ) );
          g = mix( g, 200.0 / 255.0, smoothstep( 0.5 - w, 0.5 + w, x ) );
          g = mix( g, 1.0, smoothstep( 0.75 - w, 0.75 + w, x ) );
          return vec3( g );
        }`,
      )
      .replace('void main() {', `void main() {\n${SCHNITT_FRAGMENT_MAIN}`);
  };
  m.customProgramCacheKey = () => 'haut-glatt';
  return m;
}
const umrissMaterial = new ShaderMaterial({
  uniforms: { uBreite: { value: 2.5 }, uAufloesung: { value: new Vector2(1, 1) }, uFarbe: { value: new Color(TINTE) } },
  vertexShader: /* glsl */ `
    uniform float uBreite;
    uniform vec2 uAufloesung;
    ${SCHNITT_VERTEX}
    void main() {
      ${SCHNITT_VERTEX_MAIN}
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      vec2 richtung = (projectionMatrix * vec4(n, 0.0)).xy;
      float l = length(richtung);
      richtung = l > 1e-9 ? richtung / l : vec2(0.0);
      float kipp = clamp(length(n.xy) / 0.35, 0.0, 1.0);
      clip.xy += richtung * kipp * uBreite * 2.0 / uAufloesung * clip.w;
      gl_Position = clip;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uFarbe;
    ${SCHNITT_FRAGMENT}
    void main() {
      ${SCHNITT_FRAGMENT_MAIN}
      gl_FragColor = vec4(uFarbe, 1.0);
    }
  `,
  side: BackSide,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});
/** Kurven im 3D: Bänder mit fester Pixelbreite, sichtbar kräftig, verdeckt blass */
const bandMaterial = (farbe: number, deckung: number): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      uAufloesung: { value: new Vector2(1, 1) },
      uDpr: { value: 1 },
      uFarbe: { value: new Color(farbe) },
      uDeckung: { value: deckung },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aAnderer;
      attribute float aSeite;
      attribute float aRichtung;
      attribute float aBreite;
      uniform vec2 uAufloesung;
      uniform float uDpr;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(aAnderer, 1.0);
        vec2 d = (b.xy / b.w - a.xy / a.w) * uAufloesung;
        float l = length(d);
        d = l > 1e-6 ? d / l : vec2(1.0, 0.0);
        vec2 quer = vec2(-d.y, d.x) * aRichtung;
        a.xy += quer * aSeite * aBreite * uDpr / uAufloesung * a.w;
        gl_Position = a;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uFarbe;
      uniform float uDeckung;
      void main() { gl_FragColor = vec4(uFarbe, uDeckung); }
    `,
    transparent: deckung < 1,
    depthWrite: false,
    depthFunc: deckung < 1 ? GreaterDepth : LessEqualDepth,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
// Kurven türkis, gewählte dunkler, Kanten schwarz und breit
const bandMaterialien = [
  bandMaterial(KURVE, 1),
  bandMaterial(KURVE, 0.25),
  bandMaterial(KURVE_WAHL, 1),
  bandMaterial(KURVE_WAHL, 0.3),
  bandMaterial(TINTE, 1),
  bandMaterial(TINTE, 0.3),
  bandMaterial(LIPPE, 1),
  bandMaterial(LIPPE, 0.3),
];

let hautGeometrie = new BufferGeometry();
let hautLagen = new Float32Array(0);
let hautNormalenPuffer = new Float32Array(0);
const koerper = new Mesh(hautGeometrie, hautMaterial(KOERPER));
const umriss = new Mesh(hautGeometrie, umrissMaterial);

/** Puffer für eine neue Haut oder neue Kanten (nach dem Einsetzen eines Loops, einer Kante oder ⌘Z) */
function geometrieNeu(): void {
  teilungNeu();
  const alt = hautGeometrie;
  hautGeometrie = new BufferGeometry();
  hautLagen = new Float32Array(3 * anzeigeQuelle.length);
  hautNormalenPuffer = new Float32Array(3 * anzeigeQuelle.length);
  hautGeometrie.setAttribute('position', new BufferAttribute(hautLagen, 3));
  hautGeometrie.setAttribute('normal', new BufferAttribute(hautNormalenPuffer, 3));
  hautGeometrie.setIndex(new BufferAttribute(anzeigeIndex, 1));
  koerper.geometry = hautGeometrie;
  umriss.geometry = hautGeometrie;
  alt.dispose();
}
geometrieNeu();
umriss.renderOrder = 1;
const baender = bandMaterialien.map((m, i) => {
  const b = new Mesh(new BufferGeometry(), m);
  b.renderOrder = 2 + i;
  return b;
});
const maulInnen = new Mesh(new BufferGeometry(), hautMaterial(MAULFARBE));
maulInnen.visible = false;
szene.add(koerper, umriss, maulInnen, ...baender);
const sonne = new DirectionalLight(0xffffff, 2.4);
sonne.position.set(0.9, 1.4, 1.1);
szene.add(sonne, new HemisphereLight(0xfff6e8, 0x9c8a74, 1.1));

const ortho = (x: number, y: number, zz: number, oben: [number, number, number]): OrthographicCamera => {
  const k = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  k.position.set(x, y, zz);
  k.up.set(...oben);
  k.lookAt(0, 0, 0);
  return k;
};
// Schnauze links: Seite von +z, Front von −x (vorn), Top von oben mit +z nach unten
const kameras: Record<Ansicht, OrthographicCamera> = {
  seite: ortho(0, 0, 3000, [0, 1, 0]),
  front: ortho(-3000, 0, 0, [0, 1, 0]),
  top: ortho(0, 3000, 0, [0, 0, -1]),
};
const dreiKamera = new PerspectiveCamera(30, 1, 20, 20000);
const steuerung = new OrbitControls(dreiKamera, felder.drei);
const BLICK = new Vector3(-0.5, 0.32, 0.8).normalize();
{
  const r = felder.drei.getBoundingClientRect();
  const fovV = (dreiKamera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (r.width / Math.max(1, r.height)));
  const abstand = (260 / Math.sin(Math.min(fovV, fovH) / 2)) * 1.12;
  dreiKamera.position.copy(BLICK).multiplyScalar(abstand);
  steuerung.target.set(0, 0, 0);
  steuerung.update();
}
steuerung.addEventListener('change', () => {
  G.neuZeichnen = true;
});
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 40;
/** Bildpunkte je Welteinheit im Blatt */
const skala = (a: Ansicht): number => {
  const r = felder.seite.getBoundingClientRect();
  return Math.max(1e-6, Math.min(r.width, r.height) / SICHT) * ausschnitt[a].zoom;
};

// Die Anzeige für das Werk (Haken), so früh wie möglich gesetzt
Object.assign(anzeige, { geometrieNeu, reglerZeigen, allesZeigen, skala, ausschnittGeaendert, statusZeigen, eingabenSperren, hautZeigen, baenderZeigen, blattZeichnen, glattInRuhe, rendern });
const blattPunkt = (a: Ansicht, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[a].getBoundingClientRect();
  const s = skala(a);
  return [(e.clientX - r.left - r.width / 2) / s + ausschnitt[a].cx, (e.clientY - r.top - r.height / 2) / s + ausschnitt[a].cy];
};

/** Zoom um den Faktor k, der Blattpunkt unter (clientX, clientY) bleibt stehen */
function zoomen(a: Ansicht, k: number, clientX: number, clientY: number): void {
  const v = ausschnitt[a];
  const vorher = blattPunkt(a, { clientX, clientY });
  v.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v.zoom * k));
  const nachher = blattPunkt(a, { clientX, clientY });
  v.cx += vorher[0] - nachher[0];
  v.cy += vorher[1] - nachher[1];
  ausschnittGeaendert(a);
}
const NAMEN: Record<Ansicht, string> = { seite: 'Seite', front: 'Front', top: 'Top' };
function ausschnittGeaendert(a: Ansicht): void {
  const kopf = felder[a].querySelector('header');
  const z = ausschnitt[a].zoom;
  if (kopf) kopf.textContent = Math.abs(z - 1) < 1e-3 ? NAMEN[a] : `${NAMEN[a]} · ${Math.round(z * 100)} %`;
  blattZeichnen(a);
  G.neuZeichnen = true;
  behaltenPlanen();
}

// ---------- Maul ----------

const maulRegler = document.getElementById('maul-oeffnung') as HTMLInputElement;
maulRegler.max = String(MAUL_WINKEL_MAX);
const kopfRegler = document.getElementById('kopf-oeffnung') as HTMLInputElement;
const knopfPose = document.getElementById('knopf-pose') as HTMLButtonElement;
const knopfMaul = document.getElementById('knopf-maul') as HTMLButtonElement | null;

/** Inneres zeigen (oder verstecken) */
function innenZeigen(): void {
  const o = G.maulGezeigt;
  maulInnen.visible = o !== null;
  if (!o) return;
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(o.innenPositionen, 3));
  g.setAttribute('normal', new BufferAttribute(o.innenNormalen, 3));
  g.setIndex(new BufferAttribute(o.innenIndizes, 1));
  g.computeBoundingSphere();
  maulInnen.geometry.dispose();
  maulInnen.geometry = g;
}

/** Regler und Knopf nach dem Stand der Pose */
function reglerZeigen(): void {
  maulRegler.value = String(pose.kiefer);
  kopfRegler.value = String(pose.schaedel);
  knopfPose.setAttribute('aria-pressed', String(grund !== null));
}

let vorRegler: Schnappschuss | null = null;
for (const r of [maulRegler, kopfRegler]) {
  r.addEventListener('pointerdown', () => {
    vorRegler = schnappschuss();
  });
  r.addEventListener('input', () => {
    vorRegler ??= schnappschuss();
    if (!knochenSetzen(Number(maulRegler.value), Number(kopfRegler.value))) {
      reglerZeigen();
      statusZeigen();
      return;
    }
    reglerZeigen();
    hautZeigen();
    baenderZeigen();
    blaetterZeichnen();
    statusZeigen();
  });
  r.addEventListener('change', () => {
    const v = vorRegler;
    vorRegler = null;
    const anders = v && (v.pose.kiefer !== pose.kiefer || v.pose.schaedel !== pose.schaedel || (v.grund === null) !== (grund === null) || JSON.stringify(v.maul) !== JSON.stringify(G.maul));
    if (v && anders) zurueck.push(v);
    allesZeigen();
  });
}
knopfPose.addEventListener('click', () => {
  if (zug) return;
  if (grund) poseVerlassen();
  else poseBetreten();
  reglerZeigen();
  allesZeigen();
});

/** Solange „Maul formen“ rechnet, nimmt das Fenster keine Eingaben (die Anzeige sperrt sie). */
function eingabenSperren(an: boolean): void {
  document.body.style.pointerEvents = an ? 'none' : '';
}
knopfMaul?.addEventListener('click', () => maulFormenGewaehlt());
function hautZeigen(): void {
  if (grund && !inAnzeige) return alsAnzeige(hautZeigen);
  const m = maulAktuell();
  G.maulGezeigt = null;
  // (am geformten Maul wird nichts weggeschnitten und nichts eingesetzt: Gaumen und Boden sind die Haut selbst)
  if (m && G.maul && !maulIstGeformt()) {
    if (grund) {
      // das Innere aus der Ruhe der Pose geschnitten (die Gewichte der Grundform gelten weiter), dann mit den Knochen gedreht
      const k = poseKnochen();
      const mr = k ? maulAmLoop({ ...haut, pos: knochenDrehen(haut.pos, k.theta, k.G, true) }, k.l, k.ecke, { zelle: MK / 2, wieVorher: m }) : null;
      if (mr) {
        mr.drehsinn = m.drehsinn;
        const innen = innenPosieren(mr, pose);
        G.maulGezeigt = { m, innenPositionen: innen.positionen, innenNormalen: innen.normalen, innenIndizes: mr.innen.indizes };
      }
    } else G.maulGezeigt = { m, innenPositionen: m.innen.positionen, innenNormalen: m.innen.normalen, innenIndizes: m.innen.indizes };
  }
  innenZeigen();
  const nor = hautNormalen(haut);
  G.normalenGezeigt = { haut, nor };
  const P = haut.pos;
  // jede Hälfte an der Spiegelebene abgeschnitten (`anzeigeZ`), ohne die Dreiecke, die danach ganz auf ihr liegen
  const Z = anzeigeZ();
  const seite = hautSeite();
  const ohneMaul = G.maulGezeigt ? indexOhneOeffnung(G.maulGezeigt.m.offen) : anzeigeIndex;
  const I = indexOhneAnliegende(ohneMaul, Z);
  if (hautGeometrie.index?.array !== I) hautGeometrie.setIndex(new BufferAttribute(I, 1));
  const N = anzeigeQuelle.length;
  // Normale je gezeigtem Punkt aus seinen Dreiecken (bei doppelten nur die seiner Seite)
  const eigen = new Float64Array(3 * N);
  for (let f = 0; f < I.length / 3; f++) {
    const [a, b, c] = [anzeigeQuelle[I[3 * f]!]!, anzeigeQuelle[I[3 * f + 1]!]!, anzeigeQuelle[I[3 * f + 2]!]!];
    const abx = P[3 * b]! - P[3 * a]!;
    const aby = P[3 * b + 1]! - P[3 * a + 1]!;
    const abz = Z[b]! - Z[a]!;
    const acx = P[3 * c]! - P[3 * a]!;
    const acy = P[3 * c + 1]! - P[3 * a + 1]!;
    const acz = Z[c]! - Z[a]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    for (let e = 0; e < 3; e++) {
      const d = I[3 * f + e]!;
      eigen[3 * d] = eigen[3 * d]! + fx;
      eigen[3 * d + 1] = eigen[3 * d + 1]! + fy;
      eigen[3 * d + 2] = eigen[3 * d + 2]! + fz;
    }
  }
  for (let d = 0; d < N; d++) {
    const q = anzeigeQuelle[d]!;
    // ein Punkt, der an der Spiegelebene abgeschnitten ist, ist dort mit seinem Spiegelbild verschmolzen: Es zählen nur die gezeigten
    // Dreiecke, und die Normale liegt in der Ebene (wie bei einem Punkt der Mittelkante)
    const verschmolzen = seite !== null && seite[q] !== 0 && Z[q] === 0;
    const h = verschmolzen ? 1 : anzeigeKante[d]!;
    const el = Math.hypot(eigen[3 * d]!, eigen[3 * d + 1]!, eigen[3 * d + 2]!) || 1;
    let nx = (1 - h) * nor[3 * q]! + (h * eigen[3 * d]!) / el;
    let ny = (1 - h) * nor[3 * q + 1]! + (h * eigen[3 * d + 1]!) / el;
    let nz = verschmolzen ? 0 : (1 - h) * nor[3 * q + 2]! + (h * eigen[3 * d + 2]!) / el;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    hautLagen[3 * d] = P[3 * q]!;
    hautLagen[3 * d + 1] = P[3 * q + 1]!;
    hautLagen[3 * d + 2] = Z[q]!;
    hautNormalenPuffer[3 * d] = nx;
    hautNormalenPuffer[3 * d + 1] = ny;
    hautNormalenPuffer[3 * d + 2] = nz;
  }
  hautGeometrie.attributes.position!.needsUpdate = true;
  hautGeometrie.attributes.normal!.needsUpdate = true;
  hautGeometrie.computeBoundingSphere();
  // glatte Anzeige: aus den Lagen, wie sie sind, und allen Dreiecken außer der Maulöffnung (an der Spiegelebene schneidet dort das
  // Material je Bildpunkt); die Puffer oben bleiben wie vorher, an ihnen messen die Proben
  if (GLATT) glattZeigen(ohneMaul);
  G.neuZeichnen = true;
}

/**
 * Glatte Anzeige (`GLATT`): der Stand für das Netz der Anzeige, wie es gerade ist. Der Plan hängt am Netz (gezeigte Dreiecke,
 * aufgetrennte harte Linien) und daran, welche Kanten auf Linien liegen; je Bild kommen nur die Lagen und die Pfadstücke dazu.
 */
type GlattStand = {
  index: Uint32Array;
  quelle: Int32Array;
  kenn: string;
  plan: GlattPlan;
  /** je Linienkante des Plans ihre beiden Punkte der Anzeige (Kontrollpunkte von `a` nach `b`) */
  kanten: LinienKante[];
  /** Loop, Probe, Spiegelhälfte (`glattOrt`) → Linienkanten des Plans (eine weiche Kante eine, eine harte je Seite eine) */
  wo: Map<number, number[]>;
  /** Seite der Spiegelung je Punkt der Anzeige (null: nicht gespiegelt) */
  seite: Float32Array | null;
  geo: Map<number, BufferGeometry>;
  lagen: Float64Array;
  pfade: Float64Array;
  /** Stufen im letzten Bild, Dauer der letzten Rechnung, Dauer des Anlegens */
  gezeigt: number;
  ms: number;
  planMs: number;
};
let glatt: GlattStand | null = null;
/** wann die Haut zuletzt neu gezeigt wurde; `glattVoll`: Dieses Zeigen rechnet alle Stufen (die Haut ruht) */
let glattGeaendert = 0;

/** Schlüssel einer Linienkante: Loop, Probe, an der sie beginnt (sie läuft zur nächsten), Spiegelhälfte */
const glattOrt = (li: number, j: number, sp: boolean): number => (li * 1_000_000 + j) * 2 + (sp ? 1 : 0);

/** Woran die Zuordnung der Linien zu den Kanten hängt (außer am Netz der Anzeige) */
const glattKenn = (): string => `${grund ? 'p' : 'g'}|${loops.map((l) => `${l.id}.${l.proben.length}.${exakt(l) ? 1 : 0}`).join(',')}`;

/** Wird die Anzeige feiner, sobald die Haut ruht? */
function glattOffen(): boolean {
  if (!glatt || FEIN >= 0) return false;
  return glatt.gezeigt < glattZiel(glatt.index.length / 3);
}

function glattAnlegen(I: Uint32Array): GlattStand {
  const t0 = performance.now();
  const n = haut.n;
  const N = anzeigeQuelle.length;
  const skin = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
  // Kanten der Haut am Rand der Maulöffnung bleiben gerade (dort schließt das Innere an): kein Pfad
  const amRand = new Set<number>();
  const offen = G.maulGezeigt?.m.offen;
  if (offen)
    for (let f = 0; f < haut.tri.length / 3; f++) {
      if (!offen[f]) continue;
      for (let e = 0; e < 3; e++) amRand.add(skin(haut.tri[3 * f + e]!, haut.tri[3 * f + ((e + 1) % 3)]!));
    }
  // Kanten der Haut auf Linien mit Pfad: von welcher Probe zu welcher, ob hart
  const linie = new Map<number, { schluessel: number; von: number; hart: boolean }>();
  loops.forEach((l, li) => {
    if (!exakt(l) || !l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2])) return;
    const hd = kanteBei(l, loops);
    const kette = l.proben.map((p) => p.ecken[0]);
    const m = kette.length;
    for (let j = 0; j < (l.art === 'ring' ? m - 1 : m); j++) {
      const k = (j + 1) % m;
      const hart = hd[j] === 1 && hd[k] === 1;
      for (const sp of l.art === 'mitte' ? [false] : [false, true]) {
        const a = sp ? haut.spiegel[kette[j]!]! : kette[j]!;
        const b = sp ? haut.spiegel[kette[k]!]! : kette[k]!;
        if (a < 0 || b < 0 || a === b) continue;
        const s = skin(a, b);
        if (amRand.has(s) || linie.has(s)) continue;
        linie.set(s, { schluessel: glattOrt(li, j, sp), von: a, hart });
      }
    }
  });
  const kanten: LinienKante[] = [];
  const wo = new Map<number, number[]>();
  const gesehen = new Set<number>();
  if (linie.size)
    for (let t = 0; t < I.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const da = I[t + e]!;
        const db = I[t + ((e + 1) % 3)]!;
        const qa = anzeigeQuelle[da]!;
        const qb = anzeigeQuelle[db]!;
        const eintrag = linie.get(skin(qa, qb));
        if (!eintrag) continue;
        const s = da < db ? da * N + db : db * N + da;
        if (gesehen.has(s)) continue;
        gesehen.add(s);
        const liste = wo.get(eintrag.schluessel);
        if (liste) liste.push(kanten.length);
        else wo.set(eintrag.schluessel, [kanten.length]);
        kanten.push(qa === eintrag.von ? { a: da, b: db, hart: eintrag.hart } : { a: db, b: da, hart: eintrag.hart });
      }
  const fest = new Uint8Array(N);
  for (let d = 0; d < N; d++) fest[d] = anzeigeKante[d]! > 0 ? 1 : 0;
  const hs = hautSeite();
  const plan = new GlattPlan(I, N, fest, kanten);
  return {
    index: I,
    quelle: anzeigeQuelle,
    kenn: glattKenn(),
    plan,
    kanten,
    wo,
    seite: hs ? Float32Array.from(anzeigeQuelle, (q) => hs[q]!) : null,
    geo: new Map(),
    lagen: new Float64Array(3 * N),
    pfade: new Float64Array(12 * kanten.length),
    gezeigt: 0,
    ms: 0,
    planMs: performance.now() - t0,
  };
}

/** Die verfeinerte Haut rechnen und zeigen (`I`: die gezeigten Dreiecke des Netzes der Anzeige) */
function glattZeigen(I: Uint32Array): void {
  if (!glatt || glatt.index !== I || glatt.quelle !== anzeigeQuelle || glatt.kenn !== glattKenn()) {
    if (glatt) for (const g of glatt.geo.values()) g.dispose();
    glatt = glattAnlegen(I);
  }
  const g = glatt;
  const t0 = performance.now();
  const P = haut.pos;
  const N = g.quelle.length;
  const L = g.lagen;
  for (let d = 0; d < N; d++) {
    const q = 3 * g.quelle[d]!;
    L[3 * d] = P[q]!;
    L[3 * d + 1] = P[q + 1]!;
    L[3 * d + 2] = P[q + 2]!;
  }
  // Pfadstücke: erst jede Linienkante gerade, dann die Stücke der Loops. Ein Stück wird an die Punkte der Haut gelegt, wie sie
  // gerade sind (seine Enden auf sie verschoben, die inneren Kontrollpunkte mit): Steht die Haut, liegt sie auf dem Pfad, und das
  // Stück ist genau der Pfad; hinkt sie im Zug nach, bleibt die Kante stetig.
  const K = g.pfade;
  g.kanten.forEach((k, i) => {
    for (let x = 0; x < 3; x++) {
      const a = L[3 * k.a + x]!;
      const b = L[3 * k.b + x]!;
      K[12 * i + x] = a;
      K[12 * i + 3 + x] = a + (b - a) / 3;
      K[12 * i + 6 + x] = b - (b - a) / 3;
      K[12 * i + 9 + x] = b;
    }
  });
  const stufen = glattStufen(I.length / 3);
  if (g.kanten.length && stufen > 0)
    loops.forEach((l, li) => {
      const stuecke = pfadStuecke(l, li);
      if (!stuecke) return;
      for (const e of stuecke)
        for (const sp of l.art === 'mitte' ? [0] : [0, 1]) {
          const plaetze = g.wo.get(glattOrt(li, e.ja, sp === 1));
          if (!plaetze) continue;
          // die vier Kontrollpunkte des Stücks (in der Spiegelhälfte gespiegelt)
          const c = e.k.map((p) => [p.x, p.y, sp ? -p.z : p.z] as const);
          for (const i of plaetze) {
            const k = g.kanten[i]!;
            for (let x = 0; x < 3; x++) {
              K[12 * i + 3 + x] = c[1]![x]! + (L[3 * k.a + x]! - c[0]![x]!);
              K[12 * i + 6 + x] = c[2]![x]! + (L[3 * k.b + x]! - c[3]![x]!);
            }
          }
        }
    });
  const fein = g.plan.rechnen(L, K, stufen, GLATT_RUHE);
  let geo = g.geo.get(stufen);
  if (!geo) {
    geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(fein.pos, 3));
    geo.setAttribute('normal', new BufferAttribute(fein.nor, 3));
    if (g.seite) geo.setAttribute('aSeite', new BufferAttribute(g.plan.weiterreichen(stufen, g.seite), 1));
    geo.setIndex(new BufferAttribute(g.plan.index(stufen), 1));
    g.geo.set(stufen, geo);
  }
  geo.attributes.position!.needsUpdate = true;
  geo.attributes.normal!.needsUpdate = true;
  // die Kugel um die Haut reicht auch für die verfeinerte (sie liegt höchstens um eine Wölbung daneben)
  const kugel = hautGeometrie.boundingSphere;
  if (kugel) geo.boundingSphere = kugel.clone();
  if (geo.boundingSphere) geo.boundingSphere.radius *= 1.05;
  koerper.geometry = geo;
  umriss.geometry = geo;
  g.gezeigt = stufen;
  g.ms = performance.now() - t0;
  if (!G.glattVoll) glattGeaendert = performance.now();
}

/** Ruht die Haut seit `GLATT_RUHE_MS`, bekommt die Anzeige ihre Stufen für die Ruhe (im Zug kosteten sie je Bild zu viel) */
function glattInRuhe(): void {
  if (!GLATT || zug || nachlauf || !glattOffen() || performance.now() - glattGeaendert < GLATT_RUHE_MS) return;
  // ohne Stufe laufen die Bänder der Linien gerade von Probe zu Probe, mit Stufen auf dem Pfad (`baenderZeigen`)
  const gerade = glatt?.gezeigt === 0;
  G.glattVoll = true;
  try {
    hautZeigen();
  } finally {
    G.glattVoll = false;
  }
  if (gerade) baenderZeigen();
}
function bandGeometrie(linien: readonly Band[]): BufferGeometry {
  const pos: number[] = [];
  const anderer: number[] = [];
  const seite: number[] = [];
  const richtung: number[] = [];
  const breite: number[] = [];
  const ind: number[] = [];
  for (const l of linien) {
    for (let i = 0; i + 1 < l.p.length; i++) {
      const a = l.p[i]!;
      const b = l.p[i + 1]!;
      const v = pos.length / 3;
      const wa = typeof l.breite === 'number' ? l.breite : l.breite[i]!;
      const wb = typeof l.breite === 'number' ? l.breite : l.breite[i + 1]!;
      for (const [p, q, r, w] of [
        [a, b, 1, wa],
        [b, a, -1, wb],
      ] as const) {
        for (const sd of [1, -1]) {
          pos.push(p.x, p.y, p.z);
          anderer.push(q.x, q.y, q.z);
          seite.push(sd);
          richtung.push(r);
          breite.push(w);
        }
      }
      ind.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('aAnderer', new BufferAttribute(new Float32Array(anderer), 3));
  g.setAttribute('aSeite', new BufferAttribute(new Float32Array(seite), 1));
  g.setAttribute('aRichtung', new BufferAttribute(new Float32Array(richtung), 1));
  g.setAttribute('aBreite', new BufferAttribute(new Float32Array(breite), 1));
  g.setIndex(ind);
  return g;
}

const knopfForm = document.getElementById('knopf-form') as HTMLButtonElement;
const knopfStift = document.getElementById('knopf-stift') as HTMLButtonElement;
const BREITE_FEIN = 0.5;
const BREITE_GEWAEHLT = 1.25;
const breiteBei = (haerte: number, fein: number): number => fein + (BREITE_KNICK - fein) * haerte;

let baenderMs = 0;
function baenderZeigen(): void {
  if (grund && !inAnzeige) return alsAnzeige(baenderZeigen);
  const baenderT0 = performance.now();
  const lagen = aktuelleLagen();
  const fein = Math.max(BREITE_FEIN, 1 / renderer.getPixelRatio());
  const normal: Band[] = [];
  const gewaehlt: Band[] = [];
  const lippe: Band[] = [];
  // Kanten: je Strecke ein Band, so breit, wie die Linie dort hart ist (Spiegelhälfte und Zwilling ebenso)
  const hart: Band[] = [];
  loops.forEach((l, li) => {
    const L = lagen[li]!;
    const gew = G.auswahl.some((w) => w.l === l.id);
    const ziel = gew ? gewaehlt : G.maul?.id === l.id ? lippe : normal;
    const hd = haerteBei(l, loops);
    const n = l.proben.length;
    // glatte Anzeige mit verfeinerter Haut: Das Band folgt zwischen zwei Proben dem Pfad (gerade Strecken lägen neben der gewölbten
    // Haut); ohne Stufe (große Form im Zug) läuft es gerade wie die Kanten der Haut
    const stueck = new Map<number, readonly V3[]>();
    if (GLATT && glatt && glatt.gezeigt > 0) for (const e of pfadStuecke(l, li) ?? []) stueck.set(e.ja * n + e.jb, e.k);
    // Ring: gespeicherte Hälfte und Spiegelhälfte, Paar: Loop und Zwilling, Mitte geschlossen
    for (const sp of l.art === 'mitte' ? [false] : [false, true]) {
      const pkt = Array.from({ length: n }, (_, i) => zeigeLage(L, i, sp));
      let lauf: V3[] = [];
      const schluss = () => {
        if (lauf.length > 1) ziel.push({ p: lauf, breite: gew ? Math.max(BREITE_GEWAEHLT, fein) : G.maul?.id === l.id ? 2 : fein });
        lauf = [];
      };
      for (let j = 0; j < (l.art === 'ring' ? n - 1 : n); j++) {
        const k = (j + 1) % n;
        if (streckeOffen(l, j, k, sp)) {
          schluss();
          continue;
        }
        const zw = zwischenPunkte(stueck.get(j * n + k), pkt[j]!, pkt[k]!, sp);
        if (lauf.length === 0) lauf.push(pkt[j]!);
        lauf.push(...zw, pkt[k]!);
        if (hd[j]! > 0 || hd[k]! > 0) {
          const p = [pkt[j]!, ...zw, pkt[k]!];
          hart.push({ p, breite: p.map((_, i) => breiteBei(hd[j]! + ((hd[k]! - hd[j]!) * i) / (p.length - 1), fein)) });
        }
      }
      schluss();
    }
  });
  const gN = bandGeometrie(normal);
  const gW = bandGeometrie(gewaehlt);
  const gH = bandGeometrie(hart);
  const gL = bandGeometrie(lippe);
  for (const [i, g] of [gN, gN, gW, gW, gH, gH, gL, gL].entries()) {
    baender[i]!.geometry.dispose();
    baender[i]!.geometry = g;
  }
  G.neuZeichnen = true;
  baenderMs = performance.now() - baenderT0;
}

const NS = 'http://www.w3.org/2000/svg';
const element = (art: string, klasse: string, attr: Record<string, string | number>): SVGElement => {
  const e = document.createElementNS(NS, art);
  e.setAttribute('class', klasse);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, String(v));
  return e;
};
const pfad = (a: Ansicht, p: readonly V3[]): string =>
  p
    .map((q, i) => {
      const [x, y] = imBlatt(a, q);
      return `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
function blattZeichnen(a: Ansicht): void {
  if (grund && !inAnzeige) return alsAnzeige(() => blattZeichnen(a));
  const el = blaetter[a];
  const r = felder[a].getBoundingClientRect();
  const s = skala(a);
  const w = r.width / s;
  const h = r.height / s;
  const { cx, cy } = ausschnitt[a];
  el.setAttribute('viewBox', `${cx - w / 2} ${cy - h / 2} ${w} ${h}`);
  el.classList.toggle('loop', G.modus === 'loop');
  el.classList.toggle('form', G.modus === 'form');
  el.replaceChildren();
  const rp = 4.5 / s;
  const lagen = aktuelleLagen();
  loops.forEach((l, li) => {
    const gew = G.auswahl.some((x) => x.l === l.id);
    linienVon(l, lagen[li]!).forEach((pts, m) => {
      // in der Seite liegen Spiegelhälfte und Zwilling genau hinter dem Gespeicherten
      if (m === 1 && a === 'seite') return;
      // in der Grundform der Bézier-Pfad (die Linie ist ihr Pfad), auch während eines Zugs; in der Pose und ohne Pfad die Linie,
      // wie sie gerade liegt
      const d = exakt(l) ? pfadKurven(a, l, m === 1, li) : pfad(a, pts);
      el.append(element('path', `kurve${gew ? ' gewaehlt' : ''}${G.maul?.id === l.id ? ' maul' : ''}${m ? ' spiegel' : ''}`, { d }));
      const t = element('path', 'kurve-treffer', { d });
      t.setAttribute('data-l', String(l.id));
      if (m) t.setAttribute('data-m', '1');
      el.append(t);
    });
  });
  // Kanten schwarz: je zusammenhängendem harten Stück eine Fläche, 3 Bildpunkte breit am Knick, zum runden Punkt hin verjüngt
  loops.forEach((l, li) => {
    const hd = haerteBei(l, loops);
    if (!hd.some((x) => x > 0)) return;
    const L = lagen[li]!;
    const n = l.proben.length;
    const zu = l.art !== 'ring';
    for (const m of a === 'seite' || l.art === 'mitte' ? [false] : [false, true]) {
      const ort = (j: number): [number, number] => {
        const p = lageAus(L, j);
        return imBlatt(a, m ? spiegeln(p) : p);
      };
      // Läufe aufeinanderfolgender Strecken, an denen die Linie hart ist (ein geschlossener Loop beginnt an einer runden Stelle)
      const hartStrecke = (j: number): boolean => hd[j]! > 0 || hd[(j + 1) % n]! > 0;
      const strecken = zu ? n : n - 1;
      let start = 0;
      if (zu) {
        while (start < n && hartStrecke(start)) start++;
        if (start === n) start = 0;
      }
      let lauf: number[] = [];
      const schluss = (): void => {
        if (lauf.length > 1) {
          const d = kantenFlaeche(lauf.map(ort), lauf.map((j) => breiteBei(hd[j]!, BREITE_FEIN) / s));
          if (d) el.append(element('path', `kante-band${m ? ' spiegel' : ''}`, { d }));
        }
        lauf = [];
      };
      for (let k = 0; k < strecken; k++) {
        const j = (start + k) % n;
        if (!hartStrecke(j)) {
          schluss();
          continue;
        }
        if (lauf.length === 0) lauf.push(j);
        lauf.push((j + 1) % n);
      }
      schluss();
    }
  });
  // Griffe der gewählten Punkte: Linie vom Punkt zur Spitze, Spitze als kleines Quadrat (unter den Punkten)
  for (const { li, i, ein, aus } of griffeZumZeigen()) {
    const l = loops[li]!;
    const p = l.punkte[i]!;
    const q = zug && !zug.griff ? p.cur : p.ref;
    const [px, py] = imBlatt(a, q);
    for (const [seite, v] of [
      ['ein', ein],
      ['aus', aus],
    ] as const) {
      // ein Griff der Länge null (Ecke, mit dem Stift geklickt) ist nicht zu sehen
      if (!v || Math.hypot(v.x, v.y, v.z) < 1e-9) continue;
      const [gx, gy] = imBlatt(a, { x: q.x + v.x, y: q.y + v.y, z: q.z + v.z });
      el.append(element('line', 'griff-linie', { x1: px, y1: py, x2: gx, y2: gy }));
      const g = element('rect', 'griff', { x: gx - rp * 0.75, y: gy - rp * 0.75, width: rp * 1.5, height: rp * 1.5 });
      g.setAttribute('data-l', String(l.id));
      g.setAttribute('data-i', String(i));
      g.setAttribute('data-g', seite);
      el.append(g);
    }
  }
  // Lose über die Mitte gezogen (13.11., Florian: „An den neuen Kreuzungen bilden sich Punkte und der durch die Mitte gezogene Griff
  // bleibt sichtbar, aber ist markiert“): ein Punkt, wo der Pfad einer Linie die Mittelebene kreuzt. Er folgt dem Zug und gehört noch
  // niemandem; greifen lässt er sich, wenn der Schnitt fest ist (`mitteFest`). Nur in der Grundform (dort ist die Linie ihr Pfad).
  loops.forEach((l, li) => {
    if (!exakt(l) || l.art === 'mitte') return;
    const orte = l.punkte.map((p) => (zug && !zug.griff ? p.cur : p.ref));
    for (const k of mitteKreuzungen(l, orte, (zug ? zug.griffeNeu[li] : null) ?? undefined)) {
      const [x, y] = imBlatt(a, k.ort);
      el.append(element('circle', 'mitte-kreuz', { cx: x, cy: y, r: rp * 0.85 }));
    }
  });
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      // ein Ende von selbst (Ring ohne Kreuzung dort) hält nur Griffe: nicht zu sehen, nicht zu greifen
      if (!istSichtbar(p)) return;
      const q = zug ? p.cur : p.ref;
      // hinter der Mitte: ein Punkt der Hälfte z ≥ 0, über die Mittelebene gezogen (markiert; ihn löschen macht den Schnitt fest)
      const hinter = !grund && l.art !== 'mitte' && q.z < -1e-6;
      for (const m of a === 'seite' || Math.abs(q.z) < 1e-6 ? [false] : [false, true]) {
        const [x, y] = imBlatt(a, m ? spiegeln(q) : q);
        const gew = G.auswahl.some((x2) => x2.l === l.id && x2.i === i);
        const kreuz = p.kreuzung !== undefined;
        const klasse = `kpunkt${kreuz ? ' kreuz' : ''}${gew ? ' gewaehlt' : ''}${m ? ' spiegel' : ''}${hinter ? ' hinter' : ''}`;
        const r = kreuz ? rp * 1.2 : rp;
        // Ecke als Raute, glatt als Kreis (an einer Kreuzung: Ecke, sobald einer ihrer Loops dort eine hat)
        const c = eckeGezeigt(li, i)
          ? element('polygon', `${klasse} ecke`, { points: `${x},${y - 1.35 * r} ${x + 1.35 * r},${y} ${x},${y + 1.35 * r} ${x - 1.35 * r},${y}` })
          : element('circle', klasse, { cx: x, cy: y, r });
        c.setAttribute('data-l', String(l.id));
        c.setAttribute('data-i', String(i));
        if (m) c.setAttribute('data-m', '1');
        el.append(c);
      }
    }),
  );
  if (G.oAn) {
    const c = zug?.mitte ?? auswahlMitte();
    if (c) {
      const [x, y] = imBlatt(a, c);
      el.append(element('circle', 'einfluss', { cx: x, cy: y, r: G.radius }));
    }
  }
  if (G.entwurf && G.entwurf.a === a) el.append(element('line', 'entwurf', { x1: G.entwurf.x0, y1: G.entwurf.y0, x2: G.entwurf.x1, y2: G.entwurf.y1 }));
  if (G.spur && G.spur.a === a) el.append(element('polyline', 'entwurf', { points: G.spur.p.map((q) => q.join(',')).join(' ') }));
  if (G.stift && G.stift.a === a) stiftZeichnen(el, a, rp);
  if (G.abzweig && G.abzweig.a === a) abzweigZeichnen(el, a, rp);
}

function allesZeigen(): void {
  // ist der Loop des Mauls gelöscht, ist auch das Maul weg
  if (G.maul && loopNr(G.maul.id) < 0) {
    poseVerlassen();
    G.maul = null;
    reglerZeigen();
  }
  // Ecken an Kreuzungen mit Kanten folgen den Kanten und den Kreuzungen
  eckenAuto(loops);
  hautZeigen();
  baenderZeigen();
  blaetterZeichnen();
  knopfLoop.setAttribute('aria-pressed', String(G.modus === 'loop'));
  knopfForm.setAttribute('aria-pressed', String(G.modus === 'form'));
  knopfStift.setAttribute('aria-pressed', String(G.modus === 'stift'));
  knopfO.setAttribute('aria-pressed', String(G.oAn));
  knopfO.textContent = G.oAn ? `Einfluss O · ${Math.round(G.radius)}` : 'Einfluss O';
  statusZeigen();
  vorrechnenPlanen();
  behaltenPlanen();
}
function statusZeigen(): void {
  const z = zeiten.slice(-20);
  const ms = z.length ? z.reduce((s, v) => s + v, 0) / z.length : 0;
  const punkte = loops.reduce((s, l) => s + l.punkte.length, 0);
  const kreuz = new Set(loops.flatMap((l) => l.punkte.filter((p) => p.kreuzung !== undefined).map((p) => p.kreuzung))).size;
  // was gerade noch rechnet: auch hinter einer Meldung (nach K steht dort „Kante“, die Haut folgt aus dem Hintergrund erst danach)
  const rechnet =
    zug?.offen || nachlauf ? ' (rechnet)' : G.gegriffen ? ' (der Griff wartet, bis die Haut steht)' : G.aufraeumen?.setzen ? ' (rechnet im Hintergrund)' : G.aufraeumen?.verdichten ? ' (verfeinert im Hintergrund)' : '';
  const hinter = hinterDerMitteZahl();
  statusZeile.textContent =
    (G.meldung ? G.meldung + rechnet : '') ||
    `${direktGilt() ? 'Form halten · ' : ''}${hinter ? `${hinter === 1 ? 'ein Punkt' : `${hinter} Punkte`} hinter der Mitte (löschen macht den Schnitt fest) · ` : ''}${loops.length} Loops · ${punkte} Punkte (${kreuz} Kreuzungen) · Zug ${ms.toFixed(1)} ms${rechnet} · zerlegen ${letzteZerlegung} ms · ` +
      `Bereich ${letzterBereich} von ${haut.n}` +
      (letzteVerdichtung
        ? ` · verdichtet +${letzteVerdichtung.neu}${letzteVerdichtung.gelegt ? ` −${letzteVerdichtung.gelegt}` : ''} (${letzteVerdichtung.ms} ms)`
        : '') +
      (G.maul ? (!G.maulGezeigt && !maulIstGeformt() ? ' · Maul: Loop schneidet nicht (als Kette eingesetzt?)' : grund ? ` · Fressen: Maul ${pose.kiefer}°, Kopf ${pose.schaedel}°` : ' · Grundform') : '');
}

function stiftZeichnen(el: SVGElement, a: Ansicht, rp: number): void {
  const st = G.stift!;
  const A = st.anker;
  let d = '';
  A.forEach((p, i) => {
    if (i === 0) d += `M ${p.X} ${p.Y}`;
    else {
      const c = stiftStueck(A[i - 1]!, p);
      d += ` C ${c[1]![0]} ${c[1]![1]} ${c[2]![0]} ${c[2]![1]} ${p.X} ${p.Y}`;
    }
  });
  // Gummiband zur Maus, solange nicht gezogen wird (wie in Illustrator)
  const letzt = A[A.length - 1];
  if (letzt && !st.zieht && G.maus && G.maus.a === a) d += ` C ${letzt.X + (letzt.aus?.[0] ?? 0)} ${letzt.Y + (letzt.aus?.[1] ?? 0)} ${G.maus.X} ${G.maus.Y} ${G.maus.X} ${G.maus.Y}`;
  if (d) el.append(element('path', 'entwurf stift', { d }));
  if (letzt?.aus) {
    for (const k of [1, -1]) {
      const gx = letzt.X + k * letzt.aus[0];
      const gy = letzt.Y + k * letzt.aus[1];
      el.append(element('line', 'griff-linie', { x1: letzt.X, y1: letzt.Y, x2: gx, y2: gy }));
      el.append(element('rect', 'griff', { x: gx - rp * 0.75, y: gy - rp * 0.75, width: rp * 1.5, height: rp * 1.5 }));
    }
  }
  A.forEach((p, i) => el.append(element('rect', `stift-anker${i === 0 ? ' erster' : ''}`, { x: p.X - rp, y: p.Y - rp, width: 2 * rp, height: 2 * rp })));
}

/** der Punkt oder die Linie unter dem Zeiger (kein Griff): wo eine Abzweigung beginnen oder enden kann */
function abzweigOrt(el: Element | null | undefined, X: number, Y: number): AbzweigOrt | null {
  const l = el?.getAttribute('data-l');
  if (!el || l === null || l === undefined || el.getAttribute('data-g')) return null;
  if (loopNr(Number(l)) < 0) return null;
  return { id: Number(l), i: Number(el.getAttribute('data-i') ?? -1), m: el.getAttribute('data-m') === '1', X, Y };
}
/** der oberste Punkt oder die oberste Linie dieses Blatts unter dem Zeiger */
function abzweigOrtUnter(a: Ansicht, e: { clientX: number; clientY: number }): AbzweigOrt | null {
  const [X, Y] = blattPunkt(a, e);
  for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
    if (!blaetter[a].contains(el)) continue;
    const o = abzweigOrt(el, X, Y);
    if (o) return o;
  }
  return null;
}

/** das Gummiband vom Anfang über die gesetzten Punkte zur Maus */
function abzweigZeichnen(el: SVGElement, a: Ansicht, rp: number): void {
  const ab = G.abzweig!;
  const [x0, y0] = abzweigAnfangImBlatt(a);
  let d = `M ${x0} ${y0}`;
  for (const p of ab.anker) d += ` L ${p.X} ${p.Y}`;
  if (G.maus && G.maus.a === a && !ab.ankerZieht) d += ` L ${G.maus.X} ${G.maus.Y}`;
  el.append(element('path', 'entwurf stift', { d }));
  el.append(element('rect', 'stift-anker erster', { x: x0 - rp, y: y0 - rp, width: 2 * rp, height: 2 * rp }));
  for (const p of ab.anker) {
    el.append(element('rect', 'stift-anker', { x: p.X - rp, y: p.Y - rp, width: 2 * rp, height: 2 * rp }));
    // ein gezogener Punkt wird glatt: sein Griff, wie gezogen (er zeigt nur an, dass er glatt ist; die Linie rundet sich dort)
    if (p.aus) el.append(element('line', 'griff-linie', { x1: p.X - p.aus[0], y1: p.Y - p.aus[1], x2: p.X + p.aus[0], y2: p.Y + p.aus[1] }));
  }
}

/** Druck mit P, während eine Abzweigung begonnen ist: auf einem Punkt oder einer Linie endet sie, auf der Haut entsteht ein Punkt */
function abzweigWeiter(a: Ansicht, e: PointerEvent, X: number, Y: number): void {
  const ab = G.abzweig!;
  if (ab.a !== a || !ab.start) return;
  const o = abzweigOrt(e.target as Element, X, Y);
  if (o && abzweigIstAnfang(a, o)) {
    G.meldung = `Abzweigung: Das ist ihr Anfang. ${ABZWEIG_WEITER}`;
    statusZeigen();
    return;
  }
  if (o) {
    G.abzweig = null;
    G.modus = 'frei';
    abzweigungErstellen(a, ab.von, o, ab.start, ab.vorher, ab.anker);
    allesZeigen();
    return;
  }
  ab.anker.push({ X, Y, aus: null });
  ab.ankerZieht = true;
  blaetter[a].setPointerCapture(e.pointerId);
  blattZeichnen(a);
}

/** mittlere Taste gedrückt: das Blatt verschieben (wie in Blender) */
let schwenk: { a: Ansicht; x: number; y: number } | null = null;

function druecken(a: Ansicht, e: PointerEvent): void {
  const [X, Y] = blattPunkt(a, e);
  if (zug && zug.modal) {
    zugEnde(e.button === 0);
    return;
  }
  if (e.button === 1) {
    schwenk = { a, x: e.clientX, y: e.clientY };
    blaetter[a].setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;
  if (G.modus === 'loop') {
    G.entwurf = { a, x0: X, y0: Y, x1: X, y1: Y };
    blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  if (G.modus === 'form') {
    G.spur = { a, p: [[X, Y]] };
    blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  if (G.modus === 'stift') {
    // eine begonnene Abzweigung: der nächste Punkt oder ihr Ende
    if (G.abzweig) {
      abzweigWeiter(a, e, X, Y);
      return;
    }
    // auf einem Punkt oder einer Linie begonnen (und noch kein Punkt gesetzt): eine Abzweigung
    const ort = G.stift ? null : abzweigOrt(e.target as Element, X, Y);
    if (ort) {
      G.abzweig = { a, von: ort, zieht: true, start: null, vorher: null, anker: [], ankerZieht: false };
      G.maus = { a, X, Y };
      blaetter[a].setPointerCapture(e.pointerId);
      blattZeichnen(a);
      return;
    }
    if (stiftDruecken(a, X, Y)) blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  const ziel = e.target as SVGElement;
  const l = ziel.getAttribute('data-l');
  if (l === null) {
    G.auswahl = [];
    G.meldung = '';
    allesZeigen();
    return;
  }
  const i = Number(ziel.getAttribute('data-i') ?? -1);
  const m = ziel.getAttribute('data-m') === '1';
  const g = ziel.getAttribute('data-g');
  if (g === 'ein' || g === 'aus') {
    // Doppelklick auf einen Griff: sein Punkt Ecke ↔ glatt (an einer Kreuzung liegt oft der Punkt des anderen Loops obenauf)
    if (doppelklick(a, `g${l}:${i}`, X, Y, e.timeStamp)) {
      eckeUmschalten(Number(l), i);
      return;
    }
    if (griffWartet()) {
      G.gegriffen = { a, X, Y, m, griff: { id: Number(l), i, seite: g }, seit: performance.now() };
      G.maus = { a, X, Y };
      blaetter[a].setPointerCapture(e.pointerId);
      statusZeigen();
    } else if (griffZugStarten(a, X, Y, m, loopNr(Number(l)), i, g)) blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  if (i < 0 && doppelklick(a, `${l}:${m}`, X, Y, e.timeStamp)) {
    punktAmKlick(a, Number(l), X, Y, m);
    return;
  }
  // Doppelklick oder ⌥-Klick auf einen Punkt: Ecke ↔ glatt
  if (i >= 0 && (doppelklick(a, `p${l}:${i}`, X, Y, e.timeStamp) || e.altKey)) {
    eckeUmschalten(Number(l), i);
    return;
  }
  const w = { l: Number(l), i };
  const drin = G.auswahl.some((x) => x.l === w.l && x.i === w.i);
  if (e.shiftKey) G.auswahl = drin ? G.auswahl.filter((x) => x.l !== w.l || x.i !== w.i) : [...G.auswahl, w];
  else if (!drin) G.auswahl = [w];
  allesZeigen();
  if (G.auswahl.length && griffWartet()) {
    G.gegriffen = { a, X, Y, m, griff: null, seit: performance.now() };
    G.maus = { a, X, Y };
    blaetter[a].setPointerCapture(e.pointerId);
    statusZeigen();
  } else if (G.auswahl.length && zugStarten(null, a, X, Y, m)) blaetter[a].setPointerCapture(e.pointerId);
}

function bewegen(a: Ansicht, e: PointerEvent): void {
  if (schwenk && schwenk.a === a) {
    schieben(a, e.clientX - schwenk.x, e.clientY - schwenk.y);
    schwenk = { a, x: e.clientX, y: e.clientY };
    return;
  }
  const [X, Y] = blattPunkt(a, e);
  G.maus = { a, X, Y };
  if (G.entwurf && G.entwurf.a === a) {
    G.entwurf = { ...G.entwurf, x1: X, y1: Y };
    blattZeichnen(a);
    return;
  }
  if (G.spur && G.spur.a === a) {
    const [lx, ly] = G.spur.p[G.spur.p.length - 1]!;
    if (Math.hypot(X - lx, Y - ly) * skala(a) > 2) G.spur.p.push([X, Y]);
    blattZeichnen(a);
    return;
  }
  if (G.abzweig && G.abzweig.a === a) {
    // ein gesetzter Punkt wird gezogen: sein Griff (unter 3 px bleibt er eine Ecke), wie beim Stift
    if (G.abzweig.ankerZieht) {
      const k = G.abzweig.anker[G.abzweig.anker.length - 1]!;
      const dx = X - k.X;
      const dy = Y - k.Y;
      k.aus = Math.hypot(dx, dy) * skala(a) > 3 ? [dx, dy] : null;
    }
    blattZeichnen(a);
    return;
  }
  if (G.stift && G.stift.a === a) {
    stiftBewegen(X, Y);
    blattZeichnen(a);
    return;
  }
  if (zug && !zug.modal && zug.ansicht === a) zugBewegen(X, Y);
}

function loslassen(a: Ansicht, e: PointerEvent | null): void {
  if (schwenk && schwenk.a === a) {
    schwenk = null;
    return;
  }
  if (G.abzweig && G.abzweig.a === a) {
    const ab = G.abzweig;
    if (ab.ankerZieht) {
      ab.ankerZieht = false;
      blattZeichnen(a);
      return;
    }
    if (!ab.zieht) return;
    ab.zieht = false;
    // in einem Zug: auf einem anderen Punkt oder einer anderen Linie losgelassen
    const nach = e ? abzweigOrtUnter(a, e) : null;
    if (nach && !abzweigIstAnfang(a, nach)) {
      G.abzweig = null;
      G.modus = 'frei';
      abzweigungErstellen(a, ab.von, nach);
      allesZeigen();
      return;
    }
    // ein Klick: Hier beginnt sie, das Werkzeug bleibt an
    abzweigBeginnen();
    allesZeigen();
    return;
  }
  if (G.entwurf && G.entwurf.a === a) {
    const { x0, y0, x1, y1 } = G.entwurf;
    G.entwurf = null;
    G.modus = 'frei';
    if (Math.hypot(x1 - x0, y1 - y0) * skala(a) > 6) loopSchneiden(a, uvAus(a, x0, y0), uvAus(a, x1, y1));
    allesZeigen();
    return;
  }
  if (G.spur && G.spur.a === a) {
    const p = G.spur.p;
    G.spur = null;
    G.modus = 'frei';
    formErstellen(a, p);
    allesZeigen();
    return;
  }
  if (G.stift && G.stift.a === a && G.stift.zieht) {
    G.stift.zieht = false;
    blattZeichnen(a);
    return;
  }
  // losgelassen, bevor der Griff beginnen konnte: ein Klick (die Auswahl steht schon)
  if (G.gegriffen && G.gegriffen.a === a) {
    G.gegriffen = null;
    statusZeigen();
    return;
  }
  if (zug && !zug.modal) zugEnde(true);
}

for (const a of ['seite', 'front', 'top'] as const) {
  const el = blaetter[a];
  el.addEventListener('pointerdown', (e) => druecken(a, e));
  el.addEventListener('pointermove', (e) => bewegen(a, e));
  el.addEventListener('pointerup', (e) => loslassen(a, e));
  el.addEventListener('pointercancel', () => loslassen(a, null));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  // Rad und Pinch zoomen zum Zeiger, zwei Finger auf dem Trackpad verschieben (wie im Editor); nicht passiv, sonst zoomt die Seite
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (istTrackpad(e)) schieben(a, -e.deltaX, -e.deltaY);
      else zoomen(a, radFaktor(e), e.clientX, e.clientY);
    },
    { passive: false },
  );
  // die mittlere Taste soll nicht das automatische Rollen des Browsers starten
  el.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });
}
// G/S/R folgt der Maus überall im Fenster
window.addEventListener('pointermove', (e) => {
  if (!zug || !zug.modal) return;
  const [X, Y] = blattPunkt(zug.ansicht, e);
  zugBewegen(X, Y);
});

// Knöpfe und Regler im 3D-Blatt: Die Kamerasteuerung des Blatts fängt sonst den Zeiger (der Klick kam nie am Knopf an)
const reglerLeiste = document.querySelector('.regler-leiste');
for (const art of ['pointerdown', 'wheel'] as const) reglerLeiste?.addEventListener(art, (e) => e.stopPropagation());

knopfLoop.addEventListener('click', () => {
  G.modus = G.modus === 'loop' ? 'frei' : 'loop';
  allesZeigen();
});
knopfForm.addEventListener('click', () => {
  G.modus = G.modus === 'form' ? 'frei' : 'form';
  allesZeigen();
});
knopfStift.addEventListener('click', () => {
  if (G.abzweig) abzweigAbbrechen();
  G.modus = G.modus === 'stift' ? 'frei' : 'stift';
  G.stift = null;
  allesZeigen();
});
knopfO.addEventListener('click', () => {
  G.oAn = !G.oAn;
  allesZeigen();
});

window.addEventListener('keydown', (e) => {
  // solange das Maul geformt wird, nimmt das Fenster keine Eingaben an
  if (maulLauf) {
    e.preventDefault();
    return;
  }
  const k = e.key.toLowerCase();
  // ⌘S sichert (unter dem Namen von zuletzt, sonst fragt das Feld danach); der Browser böte sonst an, die Seite zu speichern
  if ((e.metaKey || e.ctrlKey) && k === 's') {
    e.preventDefault();
    if (!zug) sichernKurz();
    return;
  }
  // beim Tippen eines Namens (Sichern) gehören die Tasten dem Feld
  if (e.target instanceof HTMLInputElement && e.target.type === 'text') return;
  if (zug && zug.modal) {
    if (e.key === 'Escape') zugEnde(false);
    else if (e.key === 'Enter') zugEnde(true);
    else if (k === 'x' || k === 'y' || k === 'z') {
      zug.achse = zug.achse === k ? null : k;
      if (G.maus) zugBewegen(G.maus.X, G.maus.Y);
    }
    e.preventDefault();
    return;
  }
  if (zug) return;
  // eine begonnene Abzweigung: ⌫ nimmt den letzten gesetzten Punkt zurück (ohne einen bricht es ab), ⏎ sagt, wo sie enden kann;
  // Esc und jedes andere Werkzeug brechen ab
  if (G.abzweig) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (G.abzweig.anker.length) G.abzweig.anker.pop();
      else {
        abzweigAbbrechen();
        G.modus = 'frei';
        G.meldung = '';
      }
      allesZeigen();
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      G.meldung = `Abzweigung: Sie endet an einem Punkt oder auf einer Linie. ${ABZWEIG_WEITER}`;
      statusZeigen();
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape' || k === 'p' || k === 'l' || k === 'f') abzweigAbbrechen();
  }
  // beim Zeichnen mit dem Stift: ⏎ schließt, ⌫ nimmt den letzten Punkt zurück, Esc bricht ab
  if (G.stift) {
    if (e.key === 'Enter') {
      stiftFertig();
      e.preventDefault();
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      G.stift.anker.pop();
      if (G.stift.anker.length === 0) G.stift = null;
      allesZeigen();
      e.preventDefault();
      return;
    }
  }
  if ((e.metaKey || e.ctrlKey) && k === 'z') {
    const s = zurueck.pop();
    if (s) wiederherstellen(s);
    e.preventDefault();
  } else if (k === 'g' || k === 's' || k === 'r') {
    if (G.maus && zugStarten(k, G.maus.a, G.maus.X, G.maus.Y, false)) allesZeigen();
  } else if (k === 'l') {
    G.modus = G.modus === 'loop' ? 'frei' : 'loop';
    allesZeigen();
  } else if (k === 'f') {
    G.modus = G.modus === 'form' ? 'frei' : 'form';
    allesZeigen();
  } else if (k === 'p') {
    G.modus = G.modus === 'stift' ? 'frei' : 'stift';
    G.stift = null;
    allesZeigen();
  } else if (k === 'o') {
    G.oAn = !G.oAn;
    allesZeigen();
  } else if (e.key === 'Home') {
    // Pos1: alle Blätter wieder ganz zeigen
    for (const a of ['seite', 'front', 'top'] as const) {
      Object.assign(ausschnitt[a], { cx: 0, cy: 0, zoom: 1 });
      ausschnittGeaendert(a);
    }
  } else if (e.key === '[' || e.key === ']') {
    G.radius = Math.max(10, Math.min(600, G.radius * (e.key === ']' ? 1.2 : 1 / 1.2)));
    allesZeigen();
  } else if (e.key === 'Escape') {
    G.modus = 'frei';
    G.entwurf = null;
    G.spur = null;
    G.stift = null;
    G.abzweig = null;
    G.auswahl = [];
    G.meldung = '';
    allesZeigen();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    loeschen();
  } else if (k === 'k') {
    kanteSetzen();
  }
});
const davorHolen = (): Promise<Davor | undefined> =>
  BEHALTEN && !behaltenAus ? davorLaeuft.then(() => speicher<Davor | undefined>('readonly', (s) => s.get('davor') as IDBRequest<Davor | undefined>)).catch(() => undefined) : Promise.resolve(undefined);
const namenPruefen = (roh: string): string => roh.trim().replace(/\s+/g, ' ');

/** Das Wesen unter einem Namen sichern; ohne Ablage als Datei über den Browser. Zurück: Text für die Statuszeile */
async function wesenSichern(name: string): Promise<string> {
  // läuft die Haut nach einem Zug noch nach, erst danach (bis dahin ist sie noch nicht die Form, die bleibt)
  for (const t0 = performance.now(); (zug || nachlauf) && performance.now() - t0 < 5000; ) await new Promise((weiter) => setTimeout(weiter, 30));
  if (zug) return 'Sichern: bitte erst den Zug beenden';
  const st = standJetzt();
  // ein Stand, der nicht in Ordnung ist, überschriebe sonst eine gute Datei (und ließe sich nicht wieder laden)
  const mangel = pruefen(st);
  if (mangel) return `Sichern geht so nicht: ${mangel} · ⌘Z führt zu einem Stand davor`;
  const datei = new Blob(packen(st) as BlobPart[], { type: 'application/octet-stream' });
  let antwort: Response | null = null;
  try {
    antwort = await fetch(ABLAGE + encodeURIComponent(name), { method: 'PUT', body: datei });
  } catch {
    antwort = null;
  }
  if (antwort?.ok) {
    G.ablageName = name;
    // der Name bleibt mit dem Wesen behalten (über das Neuladen)
    behaltenPlanen();
    return `gesichert: „${name}“ (${auskunft(st)}, ${(datei.size / 1e6).toFixed(1)} MB)`;
  }
  if (antwort && antwort.status !== 404) return `Sichern fehlgeschlagen (${antwort.status} ${await antwort.text().catch(() => '')})`;
  // keine Ablage (kein Dev-Server): als Datei über den Browser
  const a = document.createElement('a');
  a.href = URL.createObjectURL(datei);
  a.download = `${name}.eewesen`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  G.ablageName = name;
  return `als Datei „${name}.eewesen“ abgelegt (${auskunft(st)})`;
}

// ----- die drei Knöpfe und ihr Feld -----

const knopfNeu = document.getElementById('knopf-neu') as HTMLButtonElement | null;
const knopfSichern = document.getElementById('knopf-sichern') as HTMLButtonElement | null;
const knopfLaden = document.getElementById('knopf-laden') as HTMLButtonElement | null;
const ablageFeld = document.getElementById('ablage-feld') as HTMLDivElement | null;
let ablageOffen: 'sichern' | 'laden' | null = null;
/** das offene Namensfeld abschicken (⏎, Knopf, ⌘S) */
let ablageLos: (() => void) | null = null;
function ablageSchliessen(): void {
  ablageOffen = null;
  ablageLos = null;
  if (ablageFeld) {
    ablageFeld.hidden = true;
    ablageFeld.replaceChildren();
  }
  knopfSichern?.setAttribute('aria-pressed', 'false');
  knopfLaden?.setAttribute('aria-pressed', 'false');
}
const sagen = (text: string): void => {
  G.meldung = text;
  statusZeigen();
};
const datumKurz = (zeit: string): string => {
  const d = new Date(zeit);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()}.${d.getMonth() + 1}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
function sichernZeigen(): void {
  if (!ablageFeld) return;
  ablageOffen = 'sichern';
  ablageFeld.hidden = false;
  knopfSichern?.setAttribute('aria-pressed', 'true');
  knopfLaden?.setAttribute('aria-pressed', 'false');
  const feld = document.createElement('input');
  feld.type = 'text';
  feld.id = 'ablage-name';
  feld.maxLength = 60;
  feld.placeholder = 'Name des Wesens';
  feld.value = G.ablageName;
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'regler knopf';
  ok.id = 'ablage-ok';
  ok.textContent = 'Sichern';
  /** Namen, die es schon gibt (ein anderer als der eigene wird erst beim zweiten Mal überschrieben) */
  let vorhanden = new Set<string>();
  let bestaetigt = '';
  void ablageListe().then((liste) => {
    vorhanden = new Set((liste ?? []).map((e) => e.name));
  });
  const los = (): void => {
    const name = namenPruefen(feld.value);
    if (!nameGueltig(name)) {
      sagen('Sichern: bitte einen Namen aus Buchstaben, Ziffern, Leerzeichen, Punkt, Strich (höchstens 60 Zeichen)');
      return;
    }
    if (vorhanden.has(name) && name !== G.ablageName && bestaetigt !== name) {
      bestaetigt = name;
      ok.textContent = 'Überschreiben';
      sagen(`„${name}“ gibt es schon: noch einmal drücken überschreibt`);
      return;
    }
    ok.disabled = true;
    void wesenSichern(name).then((text) => {
      ablageSchliessen();
      sagen(text);
    });
  };
  feld.addEventListener('input', () => {
    bestaetigt = '';
    ok.textContent = 'Sichern';
  });
  feld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') los();
    else if (e.key === 'Escape') ablageSchliessen();
  });
  ok.addEventListener('click', los);
  ablageLos = los;
  ablageFeld.replaceChildren(feld, ok);
  feld.focus();
  feld.select();
}
/** ⌘S: unter dem Namen von zuletzt sichern; hat das Wesen noch keinen, fragt das Feld danach (ist es offen, gilt, was darin steht) */
function sichernKurz(): void {
  if (ablageOffen === 'sichern' && ablageLos) ablageLos();
  else if (G.ablageName) {
    ablageSchliessen();
    const name = G.ablageName;
    sagen(`sichere „${name}“ …`);
    void wesenSichern(name).then(sagen);
  } else sichernZeigen();
}
function ladenZeigen(): void {
  if (!ablageFeld) return;
  ablageOffen = 'laden';
  ablageFeld.hidden = false;
  knopfLaden?.setAttribute('aria-pressed', 'true');
  knopfSichern?.setAttribute('aria-pressed', 'false');
  ablageFeld.replaceChildren(document.createTextNode('…'));
  void Promise.all([ablageListe(), davorHolen()]).then(([liste, davor]) => {
    if (ablageOffen !== 'laden') return;
    const teile: Node[] = [];
    // das Wesen, das „Laden“ oder „Neu“ zuletzt ersetzt hat (über das Neuladen hinweg, wenn ⌘Z es nicht mehr bringt)
    if (davor) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'regler knopf eintrag davor';
      b.dataset.wesenDavor = '1';
      b.textContent = `Wesen von vorher${davor.name ? ` („${davor.name}“)` : ''} · ${davor.punkte.toLocaleString('de-DE')} Punkte · ${datumKurz(davor.zeit)}`;
      b.addEventListener('click', () => {
        ablageSchliessen();
        try {
          const st = entpacken(davor.daten);
          wesenUebernehmen(st, nameGueltig(davor.name) ? davor.name : '');
          sagen(`Wesen von vorher wieder da (${auskunft(st)}) · ⌘Z bringt das andere zurück`);
        } catch (e) {
          sagen(`Laden fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
      teile.push(b);
    }
    for (const e of [...(liste ?? [])].sort((a, b) => b.zeit.localeCompare(a.zeit))) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'regler knopf eintrag';
      b.dataset.wesen = e.name;
      b.textContent = `${e.name} · ${e.punkte.toLocaleString('de-DE')} Punkte · ${datumKurz(e.zeit)}`;
      b.addEventListener('click', () => {
        ablageSchliessen();
        sagen(`lade „${e.name}“ …`);
        void wesenLaden(e.name).then(sagen);
      });
      teile.push(b);
    }
    if (liste && liste.length === 0) teile.push(document.createTextNode('noch nichts gesichert'));
    // eine Datei von anderswo (oder ohne Ablage)
    const wahl = document.createElement('label');
    wahl.className = 'regler knopf eintrag';
    wahl.textContent = 'Datei …';
    const datei = document.createElement('input');
    datei.type = 'file';
    datei.accept = '.eewesen';
    datei.hidden = true;
    datei.addEventListener('change', () => {
      const f = datei.files?.[0];
      if (!f) return;
      ablageSchliessen();
      void f
        .arrayBuffer()
        .then((buf) => {
          const st = entpacken(buf);
          const name = f.name.replace(/\.eewesen$/, '');
          wesenUebernehmen(st, nameGueltig(name) ? name : '');
          sagen(`geladen: „${f.name}“ (${auskunft(st)}) · ⌘Z bringt das Wesen von vorher zurück`);
        })
        .catch((e: unknown) => sagen(`Laden fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`));
    });
    wahl.append(datei);
    teile.push(wahl);
    ablageFeld.replaceChildren(...teile);
  });
}
knopfSichern?.addEventListener('click', () => {
  if (ablageOffen === 'sichern') ablageSchliessen();
  else sichernZeigen();
});
knopfLaden?.addEventListener('click', () => {
  if (ablageOffen === 'laden') ablageSchliessen();
  else ladenZeigen();
});
knopfNeu?.addEventListener('click', () => {
  ablageSchliessen();
  // der Knopf behält den Fokus nicht: Sonst drückte ihn die nächste Leertaste oder ⏎ noch einmal
  knopfNeu.blur();
  if (zug) return;
  sagen(wesenNeu());
});

// ---------- Zeichnen ----------

function rendern(nur?: keyof typeof felder): void {
  const hoehe = window.innerHeight;
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setClearColor(PAPIER, 1);
  renderer.clear();
  renderer.setScissorTest(true);
  const liste: [keyof typeof felder, OrthographicCamera | PerspectiveCamera][] = [
    ['seite', kameras.seite],
    ['front', kameras.front],
    ['top', kameras.top],
    ['drei', dreiKamera],
  ];
  for (const [name, kamera] of liste) {
    if (nur && name !== nur) continue;
    const r = felder[name].getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const y = hoehe - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height);
    renderer.setScissor(r.left, y, r.width, r.height);
    if (kamera instanceof OrthographicCamera && name !== 'drei') {
      // Blattkoordinaten (x, y nach unten) und Kamera: rechts = Blatt-x, oben = −Blatt-y, in allen drei Ansichten
      const s = skala(name);
      const w = r.width / s / 2;
      const h = r.height / s / 2;
      const { cx, cy } = ausschnitt[name];
      kamera.left = cx - w;
      kamera.right = cx + w;
      kamera.top = -cy + h;
      kamera.bottom = -cy - h;
    } else if (kamera instanceof PerspectiveCamera) {
      kamera.aspect = r.width / r.height;
    }
    kamera.updateProjectionMatrix();
    // die Kurven zeichnen in den Blättern die SVG-Ebenen, im 3D die Bänder
    for (const b of baender) b.visible = name === 'drei';
    umrissMaterial.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
    umrissMaterial.uniforms.uBreite!.value = 2.5 * dpr;
    for (const m of bandMaterialien) {
      m.uniforms.uAufloesung!.value.set(r.width * dpr, r.height * dpr);
      m.uniforms.uDpr!.value = dpr;
    }
    renderer.clearDepth();
    renderer.render(szene, kamera);
  }
}

/**
 * Die Schleife der Bilder darf an einem Fehler beim Rechnen nicht enden: Sonst rechnet und zeigt das Fenster nichts mehr, es steht
 * (10.11., Florian: „die Seite hängt sich auf“). Ein Fehler nimmt den laufenden Zug zurück (oder den letzten, wenn er im Nachlauf
 * geschah), steht in der Statuszeile und in der Konsole, und das nächste Bild kommt wie sonst.
 */
let fehlerZahl = 0;
function schleife(): void {
  try {
    bildRechnen();
  } catch (e) {
    fehlerZahl++;
    // (käme der Fehler in jedem Bild wieder, füllte er die Konsole: nur die ersten)
    if (fehlerZahl <= 5) console.error('Fehler beim Rechnen', e);
    try {
      const text = `Beim Rechnen ist ein Fehler aufgetreten (${e instanceof Error ? e.message : String(e)}).`;
      if (zug) davongelaufen(zug.vorher, `${text} Der Zug ist zurückgenommen, die Form steht wieder wie davor.`);
      else if (nachlauf) davongelaufen(null, `${text} Der Zug ist zurückgenommen, die Form steht wieder wie davor.`);
      else {
        G.gegriffen = null;
        G.eingetroffen = null;
        G.zwischenstand = null;
        G.aufgeraeumt = null;
        G.aufraeumen = null;
        G.meldung = `${text} Die Form bleibt, wie sie ist.`;
        statusZeigen();
      }
    } catch (e2) {
      console.error('Fehler beim Zurücknehmen', e2);
    }
  }
  requestAnimationFrame(schleife);
}
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  allesZeigen();
});

reglerZeigen();
allesZeigen();
schleife();
if (BEHALTEN) behaltenesHolen();

// Prüfhaken für Skripte: Loops, Lagen, Bildschirmpunkte, Zeiten
(window as unknown as { __kurven: unknown }).__kurven = {
  /** Prüfung im laufenden Zug über die ganze Haut: n weitere Runden zu den Zielen von jetzt; zurück kommt, wie weit sich die Haut dabei bewegt */
  weiterrechnen: (n: number): number | null => {
    const z = zug;
    if (!z || mitBereich()) return null;
    const vor = Float64Array.from(haut.pos);
    z.loeser.schritt(z.versch, n);
    let m = 0;
    for (let k = 0; k < vor.length; k += 3) m = Math.max(m, Math.hypot(haut.pos[k]! - vor[k]!, haut.pos[k + 1]! - vor[k + 1]!, haut.pos[k + 2]! - vor[k + 2]!));
    hautZeigen();
    baenderZeigen();
    return m;
  },
  /** Wesen behalten, sichern, laden (Prüfhaken): Namen sichern und laden, Liste, Neu, der Stand als Datei, Maß, Dauer des Packens */
  ablage: {
    sichern: (name: string) => wesenSichern(name),
    laden: (name: string) => wesenLaden(name),
    liste: () => ablageListe(),
    neu: () => wesenNeu(),
    /** jetzt behalten und warten, bis es im Browser liegt */
    behalten: async (): Promise<number> => {
      behaltenJetzt();
      await behaltenLaeuft;
      return letztesBehalten;
    },
    bereit: () => behaltenBereit,
    mk: () => MK,
    name: () => G.ablageName,
    bytes: () => packen(standJetzt()).reduce((n, t) => n + t.length, 0),
    /** das Wesen, das „Laden“ oder „Neu“ zuletzt ersetzt hat (ohne seine Daten) */
    davor: () => davorHolen().then((d) => (d ? { zeit: d.zeit, punkte: d.punkte, loops: d.loops, name: d.name } : null)),
  },
  /** Prüfung: die nächste Runde des Lösers im Fenster gilt als davongelaufen (der Zug wird zurückgenommen) */
  davonProbe: () => {
    G.davonProbe = true;
  },
  /** Prüfung: das nächste Bild wirft beim Rechnen einen Fehler (die Schleife der Bilder läuft weiter) */
  fehlerProbe: () => {
    G.fehlerProbe = true;
  },
  /** Prüfung: der Worker fällt aus (wie ein Fehler beim Laden oder ein Absturz); danach läuft alles im Fenster */
  ausfall: () => zerleger()?.onerror?.(new ErrorEvent('error', { message: 'Probe' })),
  /** Prüfung: der laufende Auftrag nach dem Loslassen meldet einen Fehler; das Fenster räumt dann selbst auf */
  auftragFehler: () => {
    const w = zerleger();
    if (w && G.aufraeumen) w.onmessage?.(new MessageEvent('message', { data: { id: G.aufraeumen.id, fehler: 'Probe' } }));
  },
  /** Prüfung: n weitere Runden über die ganze Haut (wie das Setzen in der Ruhe), ohne Verdichten; ist die Haut fertig gerechnet? */
  nachrechnen: (n: number) => {
    if (mitBereich() || zug) return;
    const z = new LoopZug(haut, loops, null, KRUEMMUNG, 'kurven', GEWICHTE, RICHTUNG_OPT);
    z.schritt(
      loops.map((l, li) => (exakt(l) ? pfadVersatz(l, z.start[li]!) : null)),
      n,
    );
    festlegenAlle();
    hautZeigen();
    baenderZeigen();
  },
  loops: () =>
    loops.map((l) => ({
      id: l.id,
      art: l.art,
      haengt: l.haengt ?? null,
      proben: l.proben.length,
      laenge: l.laenge,
      punkte: l.punkte.map((p) => ({
        s: p.s,
        ref: p.ref,
        sichtbar: istSichtbar(p),
        kreuzung: p.kreuzung ?? null,
        ecke: istEcke(p),
        autoEcke: p.autoEcke ?? false,
        kante: p.kante ?? null,
        mundwinkel: p.mundwinkel ?? false,
        knick: p.knick ?? null,
        ein: p.ein ?? null,
        aus: p.aus ?? null,
      })),
      /** das Maul aus einer Linie: so weit ist die gerechnete Lage offen (Grad); null: kein solches */
      maulLinie: l.maulLinie ?? null,
      pfad: hatGriffe(l),
      /** ins Netz eingesetzt (jede Probe ein Punkt des Netzes); sonst liegt der Loop nur auf der Haut */
      eingesetzt: l.proben.every((p) => p.ecken[0] === p.ecken[1] && p.ecken[1] === p.ecken[2]),
      kante: l.kante ?? null,
      /** das Maul an diesem Ring ist geformt (echte Haut im Maul) */
      geformt: l.maulGeformt ?? false,
      ruhe: Array.from(l.ruhe),
      s: Array.from(l.s),
    })),
  auswahl: () => G.auswahl,
  /** je Loop: wie weit seine Linie höchstens neben ihrem Pfad liegt (an gleicher Stelle; 0 ohne Pfad) */
  pfadRest: (): number[] => loops.map((l) => pfadAbweichung(l)),
  /** am Gezeigten: wie weit die Linie, wie das Blatt sie zeichnet, höchstens neben ihren gezeigten Lagen liegt (in der Pose gedreht) */
  pfadRestGezeigt: (): number[] => alsAnzeige(() => loops.map((l, li) => gezeichnetNeben(l, li))),
  /** die drei Blätter `n`-mal neu zeichnen: Dauer eines Durchgangs in ms (Median) */
  blaetterMs: (n = 20): number => {
    const ms: number[] = [];
    for (let i = 0; i < n; i++) {
      const t0 = performance.now();
      blaetterZeichnen();
      ms.push(performance.now() - t0);
    }
    return ms.sort((x, y) => x - y)[n >> 1]!;
  },
  /** Knick der Linie an einem Punkt (Grad): Richtung hinein gegen hinaus, je Seite für sich gemessen */
  knickAm: (id: number, i: number): number => {
    const l = loops[loopNr(id)];
    if (!l?.punkte[i]) return NaN;
    const g = griffeBei(l, i);
    if (!g.ein || !g.aus) return NaN;
    const c = -(g.ein.x * g.aus.x + g.ein.y * g.aus.y + g.ein.z * g.aus.z) / (Math.hypot(g.ein.x, g.ein.y, g.ein.z) * Math.hypot(g.aus.x, g.aus.y, g.aus.z));
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  },
  /** Griffspitzen eines Punkts in der Welt, wie gezeigt (wahre Länge; `faktor` ist seit dem 10.11. immer 1, für ältere Proben) */
  griffe: (id: number, i: number): { ein: V3 | null; aus: V3 | null; faktor: number } => {
    const l = loops[loopNr(id)];
    const p = l?.punkte[i];
    if (!l || !p) return { ein: null, aus: null, faktor: 1 };
    const g = griffeBei(l, i);
    const spitze = (v: V3 | null) => (v ? { x: p.ref.x + v.x, y: p.ref.y + v.y, z: p.ref.z + v.z } : null);
    return { ein: spitze(g.ein), aus: spitze(g.aus), faktor: 1 };
  },
  /** 3D-Kamera setzen (für Nahbilder) */
  kamera: (pos: V3, ziel: V3) => {
    dreiKamera.position.set(pos.x, pos.y, pos.z);
    steuerung.target.set(ziel.x, ziel.y, ziel.z);
    steuerung.update();
    G.neuZeichnen = true;
  },
  /** Knick quer über einen Loop je Probe (Grad) */
  knick: (id: number): number[] => {
    const l = loops[loopNr(id)];
    return l ? Array.from(knickWinkel(haut, l)) : [];
  },
  /** umgeschlagene Dreiecke (Normale gegen die mittlere Normale ihrer Ecken) */
  umgeschlagen: (): number => umgeschlageneZahl(),
  /**
   * Gemessen: der Knick der Haut quer über einen Ring (Grad): an seinen beiden Enden im Schnitt durch die Mitte, und nahe seinem
   * Mundwinkel (Mittel der Stellen bis 2,5 Kanten davor und dahinter); null, wenn der Loop kein eingesetzter Ring ist
   */
  knickGemessen: (id: number): { enden: number[]; mundwinkel: number } | null => {
    const l = loops[loopNr(id)];
    const R = l ? knickReihe(haut, l) : null;
    if (!l || !R) return null;
    const inMitte = (v: number): number[] => haut.nachbarn[v]!.filter((u) => Math.abs(haut.pos[3 * u + 2]!) < 1e-6);
    const enden = [l.proben[0]!.ecken[0], l.proben[l.proben.length - 1]!.ecken[0]].map((v) => {
      const r = inMitte(v).map((u) => ({ x: haut.pos[3 * u]! - haut.pos[3 * v]!, y: haut.pos[3 * u + 1]! - haut.pos[3 * v + 1]! }));
      if (r.length !== 2) return NaN;
      const c = (r[0]!.x * r[1]!.x + r[0]!.y * r[1]!.y) / (Math.hypot(r[0]!.x, r[0]!.y) * Math.hypot(r[1]!.x, r[1]!.y));
      return 180 - (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
    });
    const W = l.punkte.find((p) => p.mundwinkel);
    const w: number[] = [];
    if (W)
      for (let j = 0; j < l.proben.length; j++) {
        if (Math.abs(l.s[j]! - W.s) > 2.5 * MK) continue;
        const x = knickQuer(haut, R, j);
        if (Number.isFinite(x)) w.push(x);
      }
    return { enden, mundwinkel: w.length ? w.reduce((a, b) => a + b, 0) / w.length : NaN };
  },
  /**
   * das Maul aus einer Linie: sein Loop, der Winkel der gerechneten Lage, wie weit die Lippen vom Abbild abweichen, die Zahl der
   * Punktpaare (−1: nicht paarweise), der größte Abstand der beiden Lippen im Netz, wie es jetzt liegt (null: kein solches Maul)
   */
  maulLinie: (): { id: number; winkel: number; fehler: number | null; paare: number; spalt: number; vorn: number } | null => {
    const l = loops.find(istMaulLinie);
    if (!l) return null;
    const zw = zwillinge(l);
    const ecke = mundwinkelVon(l);
    const K = l.proben.map((p) => lageAus(haut.pos, p.ecken[0]));
    const eine = K.slice(0, ecke + 1);
    const andere = K.slice(ecke);
    const zur = (q: V3, Z: readonly V3[]): number => {
      let best = Infinity;
      for (let i = 0; i + 1 < Z.length; i++) {
        const u = Z[i]!;
        const v = Z[i + 1]!;
        const uv = { x: v.x - u.x, y: v.y - u.y, z: v.z - u.z };
        const t = Math.max(0, Math.min(1, ((q.x - u.x) * uv.x + (q.y - u.y) * uv.y + (q.z - u.z) * uv.z) / (uv.x * uv.x + uv.y * uv.y + uv.z * uv.z || 1)));
        best = Math.min(best, Math.hypot(q.x - u.x - t * uv.x, q.y - u.y - t * uv.y, q.z - u.z - t * uv.z));
      }
      return best;
    };
    let spalt = 0;
    for (const q of andere) spalt = Math.max(spalt, zur(q, eine));
    for (const q of eine) spalt = Math.max(spalt, zur(q, andere));
    return { id: l.id, winkel: l.maulLinie ?? 0, fehler: grund ? null : zwillingsFehler(l, obereLippe(l)), paare: zw ? zw.paare.length : -1, spalt, vorn: abstand(K[0]!, K[K.length - 1]!) };
  },
  /** das Maul: Loop, Öffnung, Dreiecke der Öffnung und des Inneren, umgeschlagene Dreiecke und offene Kanten wie gezeigt */
  maul: (orte = false) => {
    const g = G.maulGezeigt;
    if (!G.maul || !g) return G.maul ? { ...G.maul, geschnitten: false } : null;
    const o = { m: g.m, positionen: Float32Array.from(haut.pos), innenPositionen: g.innenPositionen };
    const wo: number[][] = [];
    const umg = (P: Float32Array, I: Uint32Array, ruhe: Float32Array): number => {
      const vn = new Float64Array(P.length);
      const fn: number[][] = [];
      for (let i = 0; i < I.length; i += 3) {
        const [a, b, c] = [I[i]!, I[i + 1]!, I[i + 2]!];
        const ab = [0, 1, 2].map((k) => P[3 * b + k]! - P[3 * a + k]!);
        const ac = [0, 1, 2].map((k) => P[3 * c + k]! - P[3 * a + k]!);
        const f = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
        fn.push(f);
        for (const v of [a, b, c]) for (let k = 0; k < 3; k++) vn[3 * v + k] = vn[3 * v + k]! + f[k]!;
      }
      let z = 0;
      for (let i = 0; i < I.length; i += 3) {
        const f = fn[i / 3]!;
        const mm = [0, 1, 2].map((k) => vn[3 * I[i]! + k]! + vn[3 * I[i + 1]! + k]! + vn[3 * I[i + 2]! + k]!);
        if (f[0]! * mm[0]! + f[1]! * mm[1]! + f[2]! * mm[2]! >= 0) continue;
        z++;
        if (orte) wo.push([0, 1, 2].map((k) => Math.round((ruhe[3 * I[i]! + k]! + ruhe[3 * I[i + 1]! + k]! + ruhe[3 * I[i + 2]! + k]!) / 3)));
      }
      return z;
    };
    // Kanten mit mehr oder weniger als zwei Dreiecken (Haut und Inneres). Punkte innerhalb eines Hundertstels gelten als einer: Die
    // Haut wird in Float64 gedreht, das Innere in Float32, gerundet fielen gleiche Punkte an Rundungsgrenzen auseinander
    const zellen = new Map<string, { x: number; y: number; z: number; id: number }[]>();
    let ids = 0;
    const nr = (x: number, y: number, z: number): number => {
      const cx = Math.floor(x / 0.05);
      const cy = Math.floor(y / 0.05);
      const cz = Math.floor(z / 0.05);
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++)
          for (let c = -1; c <= 1; c++)
            for (const q of zellen.get(`${cx + a},${cy + b},${cz + c}`) ?? []) if (Math.hypot(q.x - x, q.y - y, q.z - z) < 0.01) return q.id;
      const k = `${cx},${cy},${cz}`;
      const liste = zellen.get(k) ?? [];
      zellen.set(k, liste);
      liste.push({ x, y, z, id: ids });
      return ids++;
    };
    const zahl = new Map<string, number>();
    const dazu = (P: Float32Array, I: Uint32Array) => {
      for (let i = 0; i < I.length; i += 3) {
        const e = [0, 1, 2].map((k) => {
          const v = I[i + k]!;
          return nr(P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!);
        });
        for (let k = 0; k < 3; k++) {
          const a = Math.min(e[k]!, e[(k + 1) % 3]!);
          const b = Math.max(e[k]!, e[(k + 1) % 3]!);
          if (a !== b) zahl.set(`${a},${b}`, (zahl.get(`${a},${b}`) ?? 0) + 1);
        }
      }
    };
    dazu(o.positionen, o.m.indizes);
    dazu(o.innenPositionen, g.innenIndizes);
    return {
      ...G.maul,
      geschnitten: true,
      oeffnung: o.m.offen.reduce((a, b) => a + b, 0),
      innen: g.innenIndizes.length / 3,
      umgeschlagenHaut: umg(o.positionen, o.m.indizes, o.m.positionen),
      umgeschlagenInnen: umg(o.innenPositionen, g.innenIndizes, o.innenPositionen),
      offeneKanten: [...zahl.values()].filter((z) => z !== 2).length,
      gelenk: o.m.gelenk,
      ...(orte ? { umgeschlagenWo: wo } : {}),
    };
  },
  /** „Form halten“ setzen oder lesen */
  halten: (an?: boolean): boolean => {
    if (an !== undefined && an !== direktAn) haltenSchalten(an);
    return direktAn;
  },
  zeiten: () => ({
    zug: [...zeiten],
    /** „Form halten“: an, der Löser für den Stand liegt bereit, so lange dauerte das letzte Vorbereiten (ms) */
    halten: { an: direktAn, gilt: direktGilt(), bereit: direktBereit !== null && direktBereit.haut === haut, bereiten: letztesDirektBereiten },
    zerlegen: letzteZerlegung,
    bereich: letzterBereich,
    verdichtung: letzteVerdichtung,
    punkte: haut.n,
    stufen: zugStufen,
    endrunden: letzteEndrunden,
    /** der Löser eines laufenden Zugs rechnet noch (die Haut steht nicht); Runden seit der letzten Mausbewegung */
    offen: zug?.offen ?? false,
    nachRunden: zug?.nachRunden ?? 0,
    hintergrund: hintergrundStufen,
    /** Arbeit im Hauptthread (ms): je Bild im Zug, je Mausbewegung, je Auslösen und je Einwechseln beim Verfeinern */
    messung: { bild: [...messung.bild], maus: [...messung.maus], ausloesen: [...messung.ausloesen], einwechseln: [...messung.einwechseln], nachlauf: [...messung.nachlauf] },
    /** nach dem Loslassen: Der Nachlauf rechnet noch (Runden bisher, über alle Züge); der Auftrag im Hintergrund läuft; der letzte Auftrag */
    nachlauf: nachlauf !== null,
    nachlaufRunden,
    aufraeumen: G.aufraeumen !== null,
    auftrag: letzterAuftrag,
    hintergrundAus,
    loslassen: letztesLoslassen,
    /** nach dem letzten Einsetzen eines Loops: zusammengelegte Punkte an den Linien (Nadeln), Dauer im Fenster */
    nadeln: letzteNadeln,
    /**
     * Schutz (10.11.): wie oft ein Zug zurückgenommen wurde, weil die Haut davonlief; Fehler in der Schleife der Bilder; wie oft ein
     * Löser im Fenster seinen Schritt verkleinert hat oder stehen geblieben ist, und der Löser der letzten Runde
     */
    davon: davonZahl,
    fehler: fehlerZahl,
    unruhe: unruheZahl,
    letzteUnruhe,
    /** was für den Stand offen ist; der letzte Zwischenstand; rechnet noch etwas oder steht etwas an (Zug, Nachlauf, Hintergrund, Uhr) */
    ruheOffen: ruheOffen ? (ruheOffen.setzen ? 'setzen' : 'aufraeumen') : null,
    auftragNr: G.aufraeumen ? G.aufraeumen.id : null,
    zwischen: letzterZwischenstand,
    beschaeftigt: zug !== null || nachlauf !== null || G.aufraeumen !== null || vorrechnenUhr !== null || G.gegriffen !== null || maulLauf !== null,
    griffWartet: G.gegriffen !== null,
    ausloesung: letzteAusloesungMs,
    ausloesungTeile,
    /** der letzte Auftrag im Hintergrund (ms): verdichten, einbetten, Zeilen, zerlegen */
    hintergrundTeile,
    /** das letzte Einwechseln (ms): Auspacken; festlegen, Punkte auf die Haut von jetzt, Netz übernehmen, Löser anlegen, zeigen */
    auspacken: letztesAuspacken,
    einwechslungTeile,
    einwechslung: letzteEinwechslungMs,
    hintergrundMs: letzteHintergrundMs,
    stufeMs: letzteStufeMs,
    neuRechnen: letztesNeuRechnen,
    vorrechnen: letztesVorrechnen,
    nachLoesen: letztesNachLoesen,
  }),
  lagen: () => Array.from(haut.pos),
  /** die Felder der Haut selbst, ohne Kopie (nur für Proben, die im Fenster mitlesen) */
  roh: () => ({ pos: haut.pos, tri: haut.tri }),
  /** Lagen der Grundform (in der Pose die gemerkte) */
  grundLagen: () => Array.from((grund ? grund.haut : haut).pos),
  /** Stand der Pose: an, Knochen, größte Verschiebung des Blendshapes */
  pose: () => {
    let max = 0;
    const d = pose.delta;
    if (d) for (let i = 0; i < d.length; i += 3) max = Math.max(max, Math.hypot(d[i]!, d[i + 1]!, d[i + 2]!));
    return { an: grund !== null, kiefer: pose.kiefer, schaedel: pose.schaedel, blendshape: max, punkte: haut.n };
  },
  dreiecke: () => Array.from(haut.tri),
  /** die Haut, wie sie gezeigt wird (jede Hälfte an der Spiegelebene abgeschnitten): Lagen je gezeigtem Punkt und Dreiecke */
  anzeige: () => ({ lagen: Array.from(hautLagen), dreiecke: Array.from(hautGeometrie.index?.array ?? []) }),
  /** die glatte Anzeige: Stufen, gezeigte Punkte und Dreiecke, Linienkanten, Zeiten; null mit `?anzeige=grob` */
  glatt: () =>
    glatt
      ? {
          stufen: glatt.gezeigt,
          punkte: glatt.plan.punkte(glatt.gezeigt),
          dreiecke: glatt.plan.index(glatt.gezeigt).length / 3,
          rechenpunkte: glatt.quelle.length,
          linienkanten: glatt.kanten.length,
          ms: glatt.ms,
          baenderMs,
          planMs: glatt.planMs,
          wirdFeiner: glattOffen(),
          /** zeigt der Körper gerade die verfeinerte Geometrie (und wie viele Dreiecke)? */
          amKoerper: koerper.geometry === glatt.geo.get(glatt.gezeigt),
          koerperDreiecke: (koerper.geometry.index?.count ?? 0) / 3,
        }
      : null,
  /**
   * Zeit je Zeichnen in ms, mit Warten auf die Grafikkarte (alle vier Felder oder nur eines): für Messungen, was die Blätter kosten
   * (`scripts/pruefen/anzeige-zeichnen-zeit.mjs`)
   */
  zeichnenMs: (mal = 20, nur?: keyof typeof felder): number => {
    const gl = renderer.getContext();
    const punkt = new Uint8Array(4);
    const fertig = (): void => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, punkt);
    rendern(nur);
    fertig();
    const t0 = performance.now();
    for (let i = 0; i < mal; i++) {
      rendern(nur);
      fertig();
    }
    const ms = (performance.now() - t0) / mal;
    G.neuZeichnen = true;
    return ms;
  },
  meldung: () => G.meldung,
  bild: (a: Ansicht, p: V3): { x: number; y: number } => {
    const r = felder[a].getBoundingClientRect();
    const s = skala(a);
    const [x, y] = imBlatt(a, p);
    return { x: r.left + r.width / 2 + (x - ausschnitt[a].cx) * s, y: r.top + r.height / 2 + (y - ausschnitt[a].cy) * s };
  },
  /** Ausschnitt eines Blatts setzen bzw. lesen (Mitte in Blattkoordinaten, Zoom) */
  ausschnitt: (a: Ansicht, v?: { cx: number; cy: number; zoom: number }) => {
    if (v) {
      Object.assign(ausschnitt[a], v);
      ausschnittGeaendert(a);
    }
    return { ...ausschnitt[a] };
  },
  felder: () =>
    Object.fromEntries(
      Object.entries(felder).map(([k, f]) => {
        const r = f.getBoundingClientRect();
        return [k, { x: r.left, y: r.top, w: r.width, h: r.height }];
      }),
    ),
  setzeRadius: (r: number) => {
    G.radius = r;
    allesZeigen();
  },
  symmetrie: (): number => {
    let m = 0;
    const P = haut.pos;
    for (let v = 0; v < haut.n; v++) {
      const w = haut.spiegel[v]!;
      if (w >= 0) m = Math.max(m, Math.hypot(P[3 * v]! - P[3 * w]!, P[3 * v + 1]! - P[3 * w + 1]!, P[3 * v + 2]! + P[3 * w + 2]!));
    }
    return m;
  },
  masse: (): number[] => {
    const m = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
    for (let v = 0; v < haut.n; v++) {
      for (let c = 0; c < 3; c++) {
        m[2 * c] = Math.min(m[2 * c]!, haut.pos[3 * v + c]!);
        m[2 * c + 1] = Math.max(m[2 * c + 1]!, haut.pos[3 * v + c]!);
      }
    }
    return m.map((x) => Math.round(x * 10) / 10);
  },
};

// In der Pose melden die Haken, was gezeigt wird (die gedrehte Lage), nicht die Ruhe der Pose (`ruheLagen` gibt die Ruhe)
{
  const haken = (window as unknown as { __kurven: Record<string, unknown> }).__kurven;
  for (const name of ['loops', 'lagen', 'roh', 'maulLinie', 'umgeschlagen', 'symmetrie', 'knickGemessen', 'knick', 'knickAm', 'griffe', 'maul', 'masse']) {
    const f = haken[name] as ((...a: unknown[]) => unknown) | undefined;
    if (f) haken[name] = (...a: unknown[]): unknown => alsAnzeige(() => f(...a));
  }
  haken.ruheLagen = (): number[] => Array.from(haut.pos);
  haken.ruheUmgeschlagen = (): number => umgeschlageneZahl();
  haken.ruheLoops = (): { id: number; punkte: { ref: V3; ein: V3 | null; aus: V3 | null }[] }[] => loops.map((l) => ({ id: l.id, punkte: l.punkte.map((q) => ({ ref: q.ref, ein: q.ein ?? null, aus: q.aus ?? null })) }));
}
