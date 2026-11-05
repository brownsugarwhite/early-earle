// Form zuerst (05.11.2026), Schritt 1 „Nur Loops“ (Fenster `kurven.html`, Florian): Die Kugel hat am Anfang keine Loops. Loops
// werden quer über den Körper geschnitten (in Seite, Front und Top) oder als geschlossene Form gezeichnet; es gibt keine offenen
// Linien. Griffe sind Kreuzungen von Loops (entstehen von selbst) und Punkte, die er auf eine Linie setzt (Doppelklick) oder mit
// einer Form zeichnet; sie lassen sich löschen. Ein ganzer Loop wird angeklickt und gezogen oder mit G/S/R geformt, mit O
// (Einflusskreis) wie in Blender. Der Umriss ist nur Shader. Die Haut löst `LoopZug` im Einflussbereich. Start: `?form=kugel|bohne`.
// (Der Beweis davor, „Kurven als Wahrheit“ mit dem Startumriss als Loop 0, steht in Commit bb0c837d.)

import {
  type Ansicht,
  type Kurve,
  type Loop,
  LoopZug,
  type UmrissPunkt,
  type V3,
  bereichUm,
  einfluss,
  festlegen,
  formAusZeichnung,
  hautAus,
  hautNormalen,
  kreuzungenZwischen,
  kurveAbtasten,
  loopAusSchnitt,
  mittlereKante,
  punktEinfuegen,
  rundAusSeite,
  verschiebungLaengs,
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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Auswahl: ein Punkt (i ≥ 0) oder ein ganzer Loop (i = −1), Loop über seine Kennung */
type Wahl = { l: number; i: number };

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
const KURVE = 0x0e9f8e;
const KURVE_WAHL = 0x0a5f56;
/** So viele Welteinheiten passen in die kürzere Seite eines Blatts. */
const SICHT = 560;
/** bestellte Dreiecke der Haut (Surface Nets geben etwa das 1,5-Fache) */
const DREIECKE = 6000;
/** Runden je Mausbewegung und beim Loslassen */
const RUNDEN_ZUG = 2;
const RUNDEN_ENDE = 4;

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
/** Kopf über Bauch: zwischen ihnen eine Einbuchtung von vorn (Schnauze links) */
const BOHNE: UmrissPunkt[] = [
  { x: 150, y: 0 },
  { x: 80, y: 130 },
  { x: -40, y: 150 },
  { x: -150, y: 120 },
  { x: -200, y: 60 },
  { x: -170, y: 22 },
  { x: -110, y: 24 },
  { x: -50, y: 15 },
  { x: -110, y: 4 },
  { x: -180, y: -40 },
  { x: -120, y: -130 },
  { x: 0, y: -150 },
  { x: 110, y: -110 },
];
const FORMEN: Record<string, UmrissPunkt[]> = { kugel: kreis(150), bohne: BOHNE };
const startUmriss = FORMEN[new URLSearchParams(location.search).get('form') ?? 'kugel'] ?? kreis(150);

// ---------- Haut und Loops ----------

const netz = rundAusSeite(startUmriss, { dreiecke: DREIECKE });
const haut = hautAus(netz.positionen, netz.indizes);
const MK = mittlereKante(haut);
/** so nah müssen sich zwei Loops kommen, damit sie sich kreuzen */
const TOL = 0.25 * MK;

let loops: Loop[] = [];
let naechsteId = 1;
let naechsteKreuzung = 1;
let auswahl: Wahl[] = [];
let modus: 'frei' | 'loop' | 'form' = 'frei';
let oAn = false;
let radius = 90;
let meldung = '';

type Schnappschuss = { loops: Loop[]; pos: Float64Array; auswahl: Wahl[]; ids: [number, number] };
const zurueck: Schnappschuss[] = [];
const kopieLoop = (l: Loop): Loop => ({
  ...l,
  ruhe: Float64Array.from(l.ruhe),
  punkte: l.punkte.map((p) => ({ ...p, ref: { ...p.ref }, cur: { ...p.cur } })),
});
const schnappschuss = (): Schnappschuss => ({
  loops: loops.map(kopieLoop),
  pos: Float64Array.from(haut.pos),
  auswahl: [...auswahl],
  ids: [naechsteId, naechsteKreuzung],
});
function wiederherstellen(s: Schnappschuss): void {
  loops = s.loops;
  haut.pos.set(s.pos);
  auswahl = s.auswahl;
  [naechsteId, naechsteKreuzung] = s.ids;
  allesZeigen();
}

const loopNr = (id: number): number => loops.findIndex((l) => l.id === id);
const lageAus = (L: Float64Array, i: number): V3 => ({ x: L[3 * i]!, y: L[3 * i + 1]!, z: L[3 * i + 2]! });
const spiegeln = (p: V3): V3 => ({ ...p, z: -p.z });
const abstand = (a: V3, b: V3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const abstandSym = (a: V3, b: V3): number => Math.min(abstand(a, b), abstand(a, spiegeln(b)));

/** Kreuzungen suchen (nur mit `nur`, sonst alle Paare); neue werden Punkte auf beiden Loops */
function kreuzungenSuchen(nur?: Loop): number {
  let zahl = 0;
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      const A = loops[i]!;
      const B = loops[j]!;
      if (nur && A !== nur && B !== nur) continue;
      for (const f of kreuzungenZwischen(A, A.ruhe, B, B.ruhe, TOL)) {
        const schon = A.punkte.some((p) => p.kreuzung !== undefined && abstand(p.ref, f.p) < 8 * TOL && B.punkte.some((q) => q.kreuzung === p.kreuzung));
        if (schon) continue;
        const k = naechsteKreuzung++;
        punktEinfuegen(A, f.sa, k);
        punktEinfuegen(B, f.sb, k);
        zahl++;
      }
    }
  }
  return zahl;
}

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
const umrissMaterial = new ShaderMaterial({
  uniforms: { uBreite: { value: 2.5 }, uAufloesung: { value: new Vector2(1, 1) }, uFarbe: { value: new Color(TINTE) } },
  vertexShader: /* glsl */ `
    uniform float uBreite;
    uniform vec2 uAufloesung;
    void main() {
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
    void main() { gl_FragColor = vec4(uFarbe, 1.0); }
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
const bandMaterialien = [bandMaterial(KURVE, 1), bandMaterial(KURVE, 0.25), bandMaterial(KURVE_WAHL, 1), bandMaterial(KURVE_WAHL, 0.3)];

const hautGeometrie = new BufferGeometry();
const hautLagen = new Float32Array(haut.pos.length);
const hautNormalenPuffer = new Float32Array(haut.pos.length);
hautGeometrie.setAttribute('position', new BufferAttribute(hautLagen, 3));
hautGeometrie.setAttribute('normal', new BufferAttribute(hautNormalenPuffer, 3));
hautGeometrie.setIndex(new BufferAttribute(haut.tri, 1));
const koerper = new Mesh(hautGeometrie, new MeshToonMaterial({ color: KOERPER, gradientMap: stufen }));
const umriss = new Mesh(hautGeometrie, umrissMaterial);
umriss.renderOrder = 1;
const baender = bandMaterialien.map((m, i) => {
  const b = new Mesh(new BufferGeometry(), m);
  b.renderOrder = 2 + i;
  return b;
});
szene.add(koerper, umriss, ...baender);
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
let neuZeichnen = true;
steuerung.addEventListener('change', () => {
  neuZeichnen = true;
});

const skala = (): number => {
  const r = felder.seite.getBoundingClientRect();
  return Math.max(1e-6, Math.min(r.width, r.height) / SICHT);
};

/** Weltpunkt → Blattkoordinaten (Welteinheiten, y nach unten) */
const imBlatt = (a: Ansicht, p: V3): [number, number] => (a === 'seite' ? [p.x, -p.y] : a === 'front' ? [p.z, -p.y] : [p.x, p.z]);
/** Verschiebung im Blatt → Verschiebung in der Welt */
const inWelt = (a: Ansicht, dx: number, dy: number): V3 =>
  a === 'seite' ? { x: dx, y: -dy, z: 0 } : a === 'front' ? { x: 0, y: -dy, z: dx } : { x: dx, y: 0, z: dy };
const blattPunkt = (a: Ansicht, e: { clientX: number; clientY: number }): [number, number] => {
  const r = felder[a].getBoundingClientRect();
  const s = skala();
  return [(e.clientX - r.left - r.width / 2) / s, (e.clientY - r.top - r.height / 2) / s];
};

function hautZeigen(): void {
  const nor = hautNormalen(haut);
  for (let i = 0; i < haut.pos.length; i++) {
    hautLagen[i] = haut.pos[i]!;
    hautNormalenPuffer[i] = nor[i]!;
  }
  hautGeometrie.attributes.position!.needsUpdate = true;
  hautGeometrie.attributes.normal!.needsUpdate = true;
  hautGeometrie.computeBoundingSphere();
  neuZeichnen = true;
}

function bandGeometrie(linien: readonly { p: readonly V3[]; breite: number }[]): BufferGeometry {
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
      for (const [p, q, r] of [
        [a, b, 1],
        [b, a, -1],
      ] as const) {
        for (const sd of [1, -1]) {
          pos.push(p.x, p.y, p.z);
          anderer.push(q.x, q.y, q.z);
          seite.push(sd);
          richtung.push(r);
          breite.push(l.breite);
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
/** Blattkoordinaten → (u, v) des Kerns: Seite (x, y), Front (z, y), Top (x, z) */
const uvAus = (a: Ansicht, X: number, Y: number): [number, number] => (a === 'top' ? [X, Y] : [X, -Y]);

/** Linien eines Loops zum Zeichnen: Ring = gespeicherte Hälfte und Spiegelhälfte, Paar = Loop und Zwilling, Mitte geschlossen */
function linienVon(l: Loop, L: Float64Array): V3[][] {
  const p = Array.from({ length: l.proben.length }, (_, i) => lageAus(L, i));
  if (l.art === 'ring') return [p, p.map(spiegeln)];
  if (l.art === 'mitte') return [[...p, p[0]!]];
  const zu = [...p, p[0]!];
  return [zu, zu.map(spiegeln)];
}

const aktuelleLagen = (): Float64Array[] => (zug ? zug.lagen : loops.map((l) => l.ruhe));

function baenderZeigen(): void {
  const lagen = aktuelleLagen();
  const normal: { p: V3[]; breite: number }[] = [];
  const gewaehlt: { p: V3[]; breite: number }[] = [];
  loops.forEach((l, li) => {
    const gew = auswahl.some((w) => w.l === l.id);
    for (const p of linienVon(l, lagen[li]!)) (gew ? gewaehlt : normal).push({ p, breite: gew ? 3 : 2 });
  });
  const gN = bandGeometrie(normal);
  const gW = bandGeometrie(gewaehlt);
  for (const [i, g] of [gN, gN, gW, gW].entries()) {
    baender[i]!.geometry.dispose();
    baender[i]!.geometry = g;
  }
  neuZeichnen = true;
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

/** Mitte der Auswahl (für den Einflusskreis) */
function auswahlMitte(): V3 | null {
  const q: V3[] = [];
  for (const w of auswahl) {
    const l = loops[loopNr(w.l)];
    if (!l) continue;
    if (w.i >= 0) {
      const p = l.punkte[w.i];
      if (p) q.push(zug ? p.cur : p.ref);
    } else {
      const L = aktuelleLagen()[loopNr(w.l)]!;
      for (let j = 0; j < l.proben.length; j++) q.push(lageAus(L, j));
    }
  }
  if (q.length === 0) return null;
  const m = q.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }), { x: 0, y: 0, z: 0 });
  return { x: m.x / q.length, y: m.y / q.length, z: m.z / q.length };
}

let entwurf: { a: Ansicht; x0: number; y0: number; x1: number; y1: number } | null = null;
let spur: { a: Ansicht; p: [number, number][] } | null = null;

function blattZeichnen(a: Ansicht): void {
  const el = blaetter[a];
  const r = felder[a].getBoundingClientRect();
  const s = skala();
  const w = r.width / s;
  const h = r.height / s;
  el.setAttribute('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`);
  el.classList.toggle('loop', modus === 'loop');
  el.classList.toggle('form', modus === 'form');
  el.replaceChildren();
  const rp = 4.5 / s;
  const lagen = aktuelleLagen();
  loops.forEach((l, li) => {
    const gew = auswahl.some((x) => x.l === l.id);
    linienVon(l, lagen[li]!).forEach((pts, m) => {
      // in der Seite liegen Spiegelhälfte und Zwilling genau hinter dem Gespeicherten
      if (m === 1 && a === 'seite') return;
      const d = pfad(a, pts);
      el.append(element('path', `kurve${gew ? ' gewaehlt' : ''}${m ? ' spiegel' : ''}`, { d }));
      const t = element('path', 'kurve-treffer', { d });
      t.setAttribute('data-l', String(l.id));
      if (m) t.setAttribute('data-m', '1');
      el.append(t);
    });
  });
  loops.forEach((l) =>
    l.punkte.forEach((p, i) => {
      const q = zug ? p.cur : p.ref;
      for (const m of a === 'seite' || Math.abs(q.z) < 1e-6 ? [false] : [false, true]) {
        const [x, y] = imBlatt(a, m ? spiegeln(q) : q);
        const gew = auswahl.some((x2) => x2.l === l.id && x2.i === i);
        const kreuz = p.kreuzung !== undefined;
        const c = element('circle', `kpunkt${kreuz ? ' kreuz' : ''}${gew ? ' gewaehlt' : ''}${m ? ' spiegel' : ''}`, {
          cx: x,
          cy: y,
          r: kreuz ? rp * 1.2 : rp,
        });
        c.setAttribute('data-l', String(l.id));
        c.setAttribute('data-i', String(i));
        if (m) c.setAttribute('data-m', '1');
        el.append(c);
      }
    }),
  );
  if (oAn) {
    const c = zug?.mitte ?? auswahlMitte();
    if (c) {
      const [x, y] = imBlatt(a, c);
      el.append(element('circle', 'einfluss', { cx: x, cy: y, r: radius }));
    }
  }
  if (entwurf && entwurf.a === a) el.append(element('line', 'entwurf', { x1: entwurf.x0, y1: entwurf.y0, x2: entwurf.x1, y2: entwurf.y1 }));
  if (spur && spur.a === a) el.append(element('polyline', 'entwurf', { points: spur.p.map((q) => q.join(',')).join(' ') }));
}

function allesZeigen(): void {
  hautZeigen();
  baenderZeigen();
  for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
  knopfLoop.setAttribute('aria-pressed', String(modus === 'loop'));
  knopfForm.setAttribute('aria-pressed', String(modus === 'form'));
  knopfO.setAttribute('aria-pressed', String(oAn));
  knopfO.textContent = oAn ? `Einfluss O · ${Math.round(radius)}` : 'Einfluss O';
  statusZeigen();
}

// ---------- Messen ----------

const zeiten: number[] = [];
let letzteZerlegung = 0;
let letzterBereich = 0;
function statusZeigen(): void {
  const z = zeiten.slice(-20);
  const ms = z.length ? z.reduce((s, v) => s + v, 0) / z.length : 0;
  const punkte = loops.reduce((s, l) => s + l.punkte.length, 0);
  const kreuz = new Set(loops.flatMap((l) => l.punkte.filter((p) => p.kreuzung !== undefined).map((p) => p.kreuzung))).size;
  statusZeile.textContent =
    meldung ||
    `${loops.length} Loops · ${punkte} Punkte (${kreuz} Kreuzungen) · Zug ${ms.toFixed(1)} ms · zerlegen ${letzteZerlegung} ms · ` +
      `Bereich ${letzterBereich} von ${haut.n}`;
}

// ---------- Ziehen und G/S/R ----------

type Zug = {
  /** null: direkt gezogen (wie G) */
  modal: 'g' | 's' | 'r' | null;
  achse: 'x' | 'y' | 'z' | null;
  ansicht: Ansicht;
  /** auf einer Spiegelhälfte gegriffen: die Tiefe läuft umgekehrt */
  spiegel: boolean;
  x0: number;
  y0: number;
  pivot: V3;
  vorher: Schnappschuss;
  loeser: LoopZug;
  /** ganz bewegte Loops (Index) */
  ganze: Set<number>;
  /** mit O: Gewicht je Probe der anderen Loops */
  probenW: (Float64Array | null)[];
  /** Gewicht je Punkt („Loop:Punkt“) */
  punktW: Map<string, number>;
  lagen: Float64Array[];
  versch: (Float64Array | null)[];
  bewegt: boolean;
  mitte: V3 | null;
};
let zug: Zug | null = null;

/** Abbildung des Zugs für die Maus an (X, Y) im Blatt: Verschieben, Skalieren (um die Mitte der Auswahl) oder Drehen (um die Blickachse) */
function abbildung(z: Zug, X: number, Y: number): (p: V3) => V3 {
  const a = z.ansicht;
  const [cx, cy] = imBlatt(a, z.pivot);
  if (z.modal === 's') {
    const k = Math.hypot(X - cx, Y - cy) / Math.max(1e-6, Math.hypot(z.x0 - cx, z.y0 - cy));
    const c = z.pivot;
    return (p) => ({
      x: !z.achse || z.achse === 'x' ? c.x + k * (p.x - c.x) : p.x,
      y: !z.achse || z.achse === 'y' ? c.y + k * (p.y - c.y) : p.y,
      z: !z.achse || z.achse === 'z' ? c.z + k * (p.z - c.z) : p.z,
    });
  }
  if (z.modal === 'r') {
    const phi = Math.atan2(Y - cy, X - cx) - Math.atan2(z.y0 - cy, z.x0 - cx);
    const co = Math.cos(phi);
    const si = Math.sin(phi);
    return (p) => {
      const [px, py] = imBlatt(a, p);
      const nx = cx + (px - cx) * co - (py - cy) * si;
      const ny = cy + (px - cx) * si + (py - cy) * co;
      const d = inWelt(a, nx - px, ny - py);
      return { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z };
    };
  }
  const d = inWelt(a, X - z.x0, Y - z.y0);
  if (z.spiegel) d.z = -d.z;
  if (z.achse) for (const k of ['x', 'y', 'z'] as const) if (k !== z.achse) d[k] = 0;
  // spiegelgleiche Loops als Ganzes nicht aus der Mitte schieben
  if ([...z.ganze].some((li) => loops[li]!.art !== 'paar')) d.z = 0;
  return (p) => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });
}

/** Punkt einer Linie in der Mittelebene bzw. am Ende eines Rings: z bleibt 0; Ringe nicht unter die Mitte */
function zFest(l: Loop, s: number): boolean {
  return l.art === 'mitte' || (l.art === 'ring' && (s <= 1e-6 || s >= l.laenge - 1e-6));
}

function zugStarten(modal: Zug['modal'], a: Ansicht, X: number, Y: number, spiegel: boolean): boolean {
  if (auswahl.length === 0) return false;
  const ganze = new Set<number>();
  const punktW = new Map<string, number>();
  const kreuzWahl = new Set<number>();
  const zentren: V3[] = [];
  for (const w of auswahl) {
    const li = loopNr(w.l);
    const l = loops[li];
    if (!l) continue;
    if (w.i < 0) {
      ganze.add(li);
      l.punkte.forEach((p, i) => {
        punktW.set(`${li}:${i}`, 1);
        if (p.kreuzung !== undefined) kreuzWahl.add(p.kreuzung);
      });
      for (let j = 0; j < l.proben.length; j += 2) zentren.push(lageAus(l.ruhe, j));
    } else {
      const p = l.punkte[w.i];
      if (!p) continue;
      punktW.set(`${li}:${w.i}`, 1);
      zentren.push(p.ref);
      if (p.kreuzung !== undefined) kreuzWahl.add(p.kreuzung);
    }
  }
  if (zentren.length === 0) return false;
  if (modal === 'r' && a !== 'seite' && [...ganze].some((li) => loops[li]!.art !== 'paar')) {
    meldung = 'Spiegelgleiche Loops dreht man in der Seite';
    statusZeigen();
    return false;
  }
  // an einer Kreuzung geht der Punkt im anderen Loop ganz mit
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      if (p.kreuzung !== undefined && kreuzWahl.has(p.kreuzung)) punktW.set(`${li}:${i}`, 1);
    }),
  );
  const probenW: (Float64Array | null)[] = loops.map(() => null);
  if (oAn) {
    loops.forEach((l, li) => {
      if (ganze.has(li)) return;
      const w = new Float64Array(l.proben.length);
      let irgend = false;
      for (let j = 0; j < l.proben.length; j++) {
        const q = lageAus(l.ruhe, j);
        let d = Infinity;
        for (const c of zentren) d = Math.min(d, abstandSym(q, c));
        w[j] = einfluss(d, radius);
        if (w[j]! > 0) irgend = true;
      }
      if (irgend) probenW[li] = w;
      l.punkte.forEach((p, i) => {
        const k = `${li}:${i}`;
        if (punktW.has(k)) return;
        let d = Infinity;
        for (const c of zentren) d = Math.min(d, abstandSym(p.ref, c));
        const g = einfluss(d, radius);
        if (g > 0) punktW.set(k, g);
      });
    });
  }
  // was sich bewegt: ganze Loops, mit O die Proben im Kreis, sonst die Stücke um die bewegten Punkte bis zu ihren Nachbarn
  const bewegt: V3[] = [];
  const ecken = new Set<number>();
  let r = oAn ? radius : 2 * MK;
  loops.forEach((l, li) => {
    const n = l.proben.length;
    const mark = new Uint8Array(n);
    const ausdehnung = () => {
      let m = 0;
      for (let j = 0; j < n; j += 4) m = Math.max(m, abstand(lageAus(l.ruhe, j), lageAus(l.ruhe, 0)));
      return m;
    };
    // ein ganzer Loop nimmt sein Inneres mit (Bereich über seine Mitte hinaus), sonst verdreht sich die Haut auf kurzem Weg
    if (ganze.has(li)) {
      mark.fill(1);
      if (!oAn) r = Math.max(r, 0.6 * ausdehnung());
    } else if (probenW[li]) {
      for (let j = 0; j < n; j++) if (probenW[li]![j]! > 0) mark[j] = 1;
    } else if (!oAn) {
      const P = l.punkte;
      P.forEach((p, k) => {
        if (!punktW.has(`${li}:${k}`)) return;
        const zu = l.art !== 'ring';
        if (zu && P.length === 1) {
          mark.fill(1);
          r = Math.max(r, 0.6 * ausdehnung());
          return;
        }
        const s0 = k > 0 ? P[k - 1]!.s : zu ? P[P.length - 1]!.s - l.laenge : 0;
        const s1 = k < P.length - 1 ? P[k + 1]!.s : zu ? P[0]!.s + l.laenge : l.laenge;
        for (let j = 0; j < n; j++) {
          const s = l.s[j]!;
          if ((s > s0 && s < s1) || (zu && (s - l.laenge > s0 || s + l.laenge < s1))) mark[j] = 1;
        }
        const nach = [k > 0 ? P[k - 1]!.ref : lageAus(l.ruhe, 0), k < P.length - 1 ? P[k + 1]!.ref : lageAus(l.ruhe, n - 1)];
        for (const q of nach) r = Math.max(r, 0.5 * abstand(p.ref, q));
      });
    }
    for (let j = 0; j < n; j++) {
      if (!mark[j]) continue;
      if (j % 2 === 0) bewegt.push(lageAus(l.ruhe, j));
      for (const v of l.proben[j]!.ecken) ecken.add(v);
    }
  });
  const loeser = new LoopZug(haut, loops, bereichUm(haut, bewegt, r, ecken));
  const pivot = zentren.reduce((s, p) => ({ x: s.x + p.x / zentren.length, y: s.y + p.y / zentren.length, z: s.z + p.z / zentren.length }), { x: 0, y: 0, z: 0 });
  if (ganze.size > 0 && [...ganze].every((li) => loops[li]!.art !== 'paar')) pivot.z = 0;
  zug = {
    modal,
    achse: null,
    ansicht: a,
    spiegel,
    x0: X,
    y0: Y,
    pivot,
    vorher: schnappschuss(),
    loeser,
    ganze,
    probenW,
    punktW,
    lagen: loeser.start,
    versch: loops.map(() => null),
    bewegt: false,
    mitte: zentren.length === 1 ? { ...zentren[0]! } : pivot,
  };
  letzteZerlegung = loeser.loeser.zeitZerlegen;
  letzterBereich = loeser.loeser.anzahl;
  meldung = '';
  return true;
}

/** Verschiebung je Probe je Loop für die Abbildung f */
function verschiebungen(z: Zug, f: (p: V3) => V3): (Float64Array | null)[] {
  return loops.map((l, li) => {
    const n = l.proben.length;
    const S = z.loeser.start[li]!;
    let d: Float64Array | null = null;
    if (z.ganze.has(li) || z.probenW[li]) {
      const w = z.probenW[li];
      d = new Float64Array(3 * n);
      for (let j = 0; j < n; j++) {
        const g = w ? w[j]! : 1;
        if (!g) continue;
        const p = lageAus(S, j);
        const q = f(p);
        d[3 * j] = g * (q.x - p.x);
        d[3 * j + 1] = g * (q.y - p.y);
        d[3 * j + 2] = g * (q.z - p.z);
      }
    } else {
      let irgend = false;
      const D = l.punkte.map((p, i) => {
        const g = z.punktW.get(`${li}:${i}`);
        if (!g) return { x: 0, y: 0, z: 0 };
        irgend = true;
        const q = f(p.ref);
        return { x: g * (q.x - p.ref.x), y: g * (q.y - p.ref.y), z: g * (q.z - p.ref.z) };
      });
      if (irgend) d = verschiebungLaengs(l, D);
    }
    if (d) {
      for (let j = 0; j < n; j++) {
        if (l.art === 'mitte' || (l.art === 'ring' && (j === 0 || j === n - 1))) d[3 * j + 2] = 0;
        else if (l.art === 'ring') d[3 * j + 2] = Math.max(d[3 * j + 2]!, -S[3 * j + 2]!);
      }
    }
    return d;
  });
}

function zugBewegen(X: number, Y: number): void {
  const z = zug;
  if (!z) return;
  if (!z.bewegt && Math.hypot(X - z.x0, Y - z.y0) * skala() < 2) return;
  z.bewegt = true;
  const f = abbildung(z, X, Y);
  z.versch = verschiebungen(z, f);
  loops.forEach((l, li) =>
    l.punkte.forEach((p, i) => {
      const g = z.punktW.get(`${li}:${i}`) ?? 0;
      if (!g) {
        p.cur = { ...p.ref };
        return;
      }
      const q = f(p.ref);
      const c = { x: p.ref.x + g * (q.x - p.ref.x), y: p.ref.y + g * (q.y - p.ref.y), z: p.ref.z + g * (q.z - p.ref.z) };
      if (zFest(l, p.s)) c.z = 0;
      else if (l.art === 'ring') c.z = Math.max(0, c.z);
      p.cur = c;
    }),
  );
  z.lagen = z.loeser.lagen(z.versch);
  if (z.mitte) z.mitte = f(z.pivot);
  const t0 = performance.now();
  z.loeser.schritt(z.versch, RUNDEN_ZUG);
  zeiten.push(performance.now() - t0);
  if (zeiten.length > 200) zeiten.shift();
  hautZeigen();
  baenderZeigen();
  for (const a of ['seite', 'front', 'top'] as const) blattZeichnen(a);
  statusZeigen();
}

function zugEnde(ok: boolean): void {
  const z = zug;
  if (!z) return;
  zug = null;
  if (!ok) {
    wiederherstellen(z.vorher);
    return;
  }
  if (z.bewegt) {
    z.loeser.schritt(z.versch, RUNDEN_ENDE);
    for (const l of loops) festlegen(haut, l);
    kreuzungenSuchen();
    zurueck.push(z.vorher);
  } else {
    for (const l of loops) for (const p of l.punkte) p.cur = { ...p.ref };
  }
  allesZeigen();
}

// ---------- Loops schneiden, Formen zeichnen, Punkte setzen und löschen ----------

function loopSchneiden(a: Ansicht, A: [number, number], B: [number, number]): void {
  const l = loopAusSchnitt(haut, a, A, B, naechsteId, 10 / skala());
  if (!l) {
    meldung = 'Kein Loop: die Linie quer über den Körper ziehen';
    return;
  }
  if (l.art === 'mitte' && loops.some((x) => x.art === 'mitte')) {
    meldung = 'Den Loop in der Mitte gibt es schon';
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  kreuzungenSuchen(l);
  auswahl = [{ l: l.id, i: -1 }];
  meldung = '';
}

/** Ramer–Douglas–Peucker: Nummern der Punkte, die bleiben */
function vereinfachen(p: readonly [number, number][], tol: number): number[] {
  const bleibt = new Uint8Array(p.length);
  bleibt[0] = 1;
  bleibt[p.length - 1] = 1;
  const stapel: [number, number][] = [[0, p.length - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop()!;
    const [ax, ay] = p[a]!;
    const [bx, by] = p[b]!;
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1;
    let wo = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - p[i]![1]) - (ax - p[i]![0]) * (by - ay)) / L;
      if (d > best) {
        best = d;
        wo = i;
      }
    }
    if (best > tol) {
      bleibt[wo] = 1;
      stapel.push([a, wo], [wo, b]);
    }
  }
  return [...bleibt.keys()].filter((i) => bleibt[i]);
}

function formErstellen(a: Ansicht, roh: [number, number][]): void {
  if (roh.length < 8) return;
  const s = skala();
  let idx = vereinfachen([...roh, roh[0]!], 4 / s).filter((i) => i < roh.length);
  if (idx.length < 4) idx = [0, 1, 2, 3].map((k) => Math.floor((k * roh.length) / 4));
  const k: Kurve = {
    art: 'mitte',
    punkte: idx.map((i) => {
      const [u, v] = uvAus(a, roh[i]![0], roh[i]![1]);
      return { x: u, y: v, z: 0 };
    }),
  };
  const { p, t } = kurveAbtasten(k, 0.6 * MK);
  const uv = p.map((q): [number, number] => [q.x, q.y]);
  const knoten = t.map((x, i) => (x === 0 ? i : -1)).filter((i) => i >= 0);
  const l = formAusZeichnung(haut, a, uv, knoten, naechsteId);
  if (!l) {
    meldung = 'Keine Form: ganz auf dem Körper zeichnen (über die Mitte nur in Front oder Top)';
    return;
  }
  naechsteId++;
  zurueck.push(schnappschuss());
  loops.push(l);
  kreuzungenSuchen(l);
  auswahl = [{ l: l.id, i: -1 }];
  meldung = '';
}

/** Doppelklick auf eine Linie: dort ein Punkt */
function punktAmKlick(a: Ansicht, id: number, X: number, Y: number, m: boolean): void {
  const l = loops[loopNr(id)];
  if (!l) return;
  const n = l.proben.length;
  let best = Infinity;
  let bs = 0;
  for (let j = 0; j < (l.art === 'ring' ? n - 1 : n); j++) {
    const k = (j + 1) % n;
    const p = lageAus(l.ruhe, j);
    const q = lageAus(l.ruhe, k);
    const [x0, y0] = imBlatt(a, m ? spiegeln(p) : p);
    const [x1, y1] = imBlatt(a, m ? spiegeln(q) : q);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(X - x0 - t * dx, Y - y0 - t * dy);
    if (d < best) {
      best = d;
      bs = l.s[j]! + t * ((k > j ? l.s[k]! : l.laenge) - l.s[j]!);
    }
  }
  if (l.punkte.some((p) => Math.abs(p.s - bs) < 2 * MK)) return;
  zurueck.push(schnappschuss());
  const p = punktEinfuegen(l, bs);
  auswahl = [{ l: id, i: l.punkte.indexOf(p) }];
  allesZeigen();
}

function loeschen(): void {
  const punkte = auswahl.filter((w) => w.i >= 0).map((w) => loops[loopNr(w.l)]?.punkte[w.i]);
  const ganz = new Set(auswahl.filter((w) => w.i < 0).map((w) => w.l));
  const eigene = new Set(punkte.filter((p) => p && p.kreuzung === undefined));
  if (eigene.size === 0 && ganz.size === 0) {
    if (punkte.length) meldung = 'Kreuzungen bleiben, solange sich die Loops kreuzen';
    statusZeigen();
    return;
  }
  zurueck.push(schnappschuss());
  for (const l of loops) l.punkte = l.punkte.filter((p) => !eigene.has(p));
  const wegKreuz = new Set<number>();
  for (const l of loops) if (ganz.has(l.id)) for (const p of l.punkte) if (p.kreuzung !== undefined) wegKreuz.add(p.kreuzung);
  loops = loops.filter((l) => !ganz.has(l.id));
  for (const l of loops) l.punkte = l.punkte.filter((p) => p.kreuzung === undefined || !wegKreuz.has(p.kreuzung));
  auswahl = [];
  allesZeigen();
}

// ---------- Maus und Tasten ----------

let maus: { a: Ansicht; X: number; Y: number } | null = null;

/** Doppelklick selbst zählen: das Blatt wird beim Drücken neu gezeichnet, `dblclick` kommt dann nicht an */
const letzterKlick = { t: 0, X: 0, Y: 0, was: '' };
function doppelklick(was: string, X: number, Y: number): boolean {
  const jetzt = performance.now();
  const ja = was === letzterKlick.was && jetzt - letzterKlick.t < 400 && Math.hypot(X - letzterKlick.X, Y - letzterKlick.Y) * skala() < 6;
  Object.assign(letzterKlick, { t: ja ? 0 : jetzt, X, Y, was });
  return ja;
}

function druecken(a: Ansicht, e: PointerEvent): void {
  const [X, Y] = blattPunkt(a, e);
  if (zug && zug.modal) {
    zugEnde(e.button === 0);
    return;
  }
  if (e.button !== 0) return;
  if (modus === 'loop') {
    entwurf = { a, x0: X, y0: Y, x1: X, y1: Y };
    blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  if (modus === 'form') {
    spur = { a, p: [[X, Y]] };
    blaetter[a].setPointerCapture(e.pointerId);
    return;
  }
  const ziel = e.target as SVGElement;
  const l = ziel.getAttribute('data-l');
  if (l === null) {
    auswahl = [];
    meldung = '';
    allesZeigen();
    return;
  }
  const i = Number(ziel.getAttribute('data-i') ?? -1);
  const m = ziel.getAttribute('data-m') === '1';
  if (i < 0 && doppelklick(`${l}:${m}`, X, Y)) {
    punktAmKlick(a, Number(l), X, Y, m);
    return;
  }
  const w = { l: Number(l), i };
  const drin = auswahl.some((x) => x.l === w.l && x.i === w.i);
  if (e.shiftKey) auswahl = drin ? auswahl.filter((x) => x.l !== w.l || x.i !== w.i) : [...auswahl, w];
  else if (!drin) auswahl = [w];
  allesZeigen();
  if (auswahl.length && zugStarten(null, a, X, Y, m)) blaetter[a].setPointerCapture(e.pointerId);
}

function bewegen(a: Ansicht, e: PointerEvent): void {
  const [X, Y] = blattPunkt(a, e);
  maus = { a, X, Y };
  if (entwurf && entwurf.a === a) {
    entwurf = { ...entwurf, x1: X, y1: Y };
    blattZeichnen(a);
    return;
  }
  if (spur && spur.a === a) {
    const [lx, ly] = spur.p[spur.p.length - 1]!;
    if (Math.hypot(X - lx, Y - ly) * skala() > 2) spur.p.push([X, Y]);
    blattZeichnen(a);
    return;
  }
  if (zug && !zug.modal && zug.ansicht === a) zugBewegen(X, Y);
}

function loslassen(a: Ansicht): void {
  if (entwurf && entwurf.a === a) {
    const { x0, y0, x1, y1 } = entwurf;
    entwurf = null;
    modus = 'frei';
    if (Math.hypot(x1 - x0, y1 - y0) * skala() > 6) loopSchneiden(a, uvAus(a, x0, y0), uvAus(a, x1, y1));
    allesZeigen();
    return;
  }
  if (spur && spur.a === a) {
    const p = spur.p;
    spur = null;
    modus = 'frei';
    formErstellen(a, p);
    allesZeigen();
    return;
  }
  if (zug && !zug.modal) zugEnde(true);
}

for (const a of ['seite', 'front', 'top'] as const) {
  const el = blaetter[a];
  el.addEventListener('pointerdown', (e) => druecken(a, e));
  el.addEventListener('pointermove', (e) => bewegen(a, e));
  el.addEventListener('pointerup', () => loslassen(a));
  el.addEventListener('pointercancel', () => loslassen(a));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
// G/S/R folgt der Maus überall im Fenster
window.addEventListener('pointermove', (e) => {
  if (!zug || !zug.modal) return;
  const [X, Y] = blattPunkt(zug.ansicht, e);
  zugBewegen(X, Y);
});

knopfLoop.addEventListener('click', () => {
  modus = modus === 'loop' ? 'frei' : 'loop';
  allesZeigen();
});
knopfForm.addEventListener('click', () => {
  modus = modus === 'form' ? 'frei' : 'form';
  allesZeigen();
});
knopfO.addEventListener('click', () => {
  oAn = !oAn;
  allesZeigen();
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (zug && zug.modal) {
    if (e.key === 'Escape') zugEnde(false);
    else if (e.key === 'Enter') zugEnde(true);
    else if (k === 'x' || k === 'y' || k === 'z') {
      zug.achse = zug.achse === k ? null : k;
      if (maus) zugBewegen(maus.X, maus.Y);
    }
    e.preventDefault();
    return;
  }
  if (zug) return;
  if ((e.metaKey || e.ctrlKey) && k === 'z') {
    const s = zurueck.pop();
    if (s) wiederherstellen(s);
    e.preventDefault();
  } else if (k === 'g' || k === 's' || k === 'r') {
    if (maus && zugStarten(k, maus.a, maus.X, maus.Y, false)) allesZeigen();
  } else if (k === 'l') {
    modus = modus === 'loop' ? 'frei' : 'loop';
    allesZeigen();
  } else if (k === 'f') {
    modus = modus === 'form' ? 'frei' : 'form';
    allesZeigen();
  } else if (k === 'o') {
    oAn = !oAn;
    allesZeigen();
  } else if (e.key === '[' || e.key === ']') {
    radius = Math.max(10, Math.min(600, radius * (e.key === ']' ? 1.2 : 1 / 1.2)));
    allesZeigen();
  } else if (e.key === 'Escape') {
    modus = 'frei';
    entwurf = null;
    spur = null;
    auswahl = [];
    meldung = '';
    allesZeigen();
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    loeschen();
  }
});

// ---------- Zeichnen ----------

function rendern(): void {
  const hoehe = window.innerHeight;
  const dpr = renderer.getPixelRatio();
  renderer.setScissorTest(false);
  renderer.setClearColor(PAPIER, 1);
  renderer.clear();
  renderer.setScissorTest(true);
  const s = skala();
  const liste: [keyof typeof felder, OrthographicCamera | PerspectiveCamera][] = [
    ['seite', kameras.seite],
    ['front', kameras.front],
    ['top', kameras.top],
    ['drei', dreiKamera],
  ];
  for (const [name, kamera] of liste) {
    const r = felder[name].getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const y = hoehe - r.bottom;
    renderer.setViewport(r.left, y, r.width, r.height);
    renderer.setScissor(r.left, y, r.width, r.height);
    if (kamera instanceof OrthographicCamera) {
      const w = r.width / s / 2;
      const h = r.height / s / 2;
      kamera.left = -w;
      kamera.right = w;
      kamera.top = h;
      kamera.bottom = -h;
    } else {
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

function schleife(): void {
  if (neuZeichnen) {
    neuZeichnen = false;
    rendern();
  }
  requestAnimationFrame(schleife);
}
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  allesZeigen();
});

allesZeigen();
schleife();

// Prüfhaken für Skripte: Loops, Lagen, Bildschirmpunkte, Zeiten
(window as unknown as { __kurven: unknown }).__kurven = {
  loops: () =>
    loops.map((l) => ({
      id: l.id,
      art: l.art,
      proben: l.proben.length,
      laenge: l.laenge,
      punkte: l.punkte.map((p) => ({ s: p.s, ref: p.ref, kreuzung: p.kreuzung ?? null })),
      ruhe: Array.from(l.ruhe),
    })),
  auswahl: () => auswahl,
  zeiten: () => ({ zug: [...zeiten], zerlegen: letzteZerlegung, bereich: letzterBereich }),
  lagen: () => Array.from(haut.pos),
  dreiecke: () => Array.from(haut.tri),
  meldung: () => meldung,
  bild: (a: Ansicht, p: V3): { x: number; y: number } => {
    const r = felder[a].getBoundingClientRect();
    const s = skala();
    const [x, y] = imBlatt(a, p);
    return { x: r.left + r.width / 2 + x * s, y: r.top + r.height / 2 + y * s };
  },
  felder: () =>
    Object.fromEntries(
      Object.entries(felder).map(([k, f]) => {
        const r = f.getBoundingClientRect();
        return [k, { x: r.left, y: r.top, w: r.width, h: r.height }];
      }),
    ),
  setzeRadius: (r: number) => {
    radius = r;
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
