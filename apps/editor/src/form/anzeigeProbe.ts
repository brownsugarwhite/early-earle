// Plan vom 12.11.2026, Schritt 1: Vergleichsbild vor dem Einbau (`anzeige.html`). Eine gesicherte Form von Florian wird nebeneinander
// gezeigt: wie heute, wie heute mit geglätteter Farbstufe, mit gekrümmten Dreiecken und unterteilt (`glatt.ts`). Dieselbe Kamera, dasselbe
// Licht und dieselben Farben wie in `kurven.ts`. Nur zum Ansehen; am Fenster des Editors ändert die Seite nichts.
//
// Adresse: anzeige.html?name=strange%20bird · z1, z2: Bildpunkte je Einheit der oberen und unteren Reihe (2.7 = 300 %, 7.2 = 800 %) ·
// m1, m2: Mitte je Reihe (x,y,z) · blick: Richtung zur Kamera (x,y,z) · stufen: Stufen der Unterteilung · pn: Schritte je Kante der
// gekrümmten Dreiecke · runden: Durchgänge des Versatzes · linien=0: ohne Linien · netz=1: Rechennetz als Drahtgitter darüber
import { hautSeiten } from '@ee/shape/dicht';
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  OrthographicCamera,
  RedFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { entpacken } from './ablage';
import { type AnzeigeNetz, anzeigeNetz, durchPunkte, gekruemmt, linienAbstand, netzNormalen, normalenBeruhigen, ruhigeNormalen, unterteilen, verfeinernGekruemmt } from './glatt';
import { hautAusFlach } from './verfeinern';

const PAPIER = 0xefe9dd;
const KOERPER = 0xe2b98e;
const TINTE = 0x1f1a17;
const KURVE = 0x0e9f8e;

const frage = new URLSearchParams(location.search);
const zahl = (name: string, sonst: number): number => {
  const w = Number(frage.get(name));
  return frage.has(name) && Number.isFinite(w) ? w : sonst;
};
const vektor = (name: string): Vector3 | null => {
  const t = frage.get(name)?.split(',').map(Number);
  return t && t.length === 3 && t.every(Number.isFinite) ? new Vector3(t[0], t[1], t[2]) : null;
};
const NAME = frage.get('name') ?? 'strange bird';
const STUFEN = zahl('stufen', 2);
const PN = zahl('pn', 4);
const RUNDEN = zahl('runden', 2);
const ZOOM = [zahl('z1', 2.7), zahl('z2', 7.2)];
const MIT_LINIEN = frage.get('linien') !== '0';
const MIT_NETZ = frage.get('netz') === '1';
/** `linienart=hart`: beim Unterteilen liegen nur die Punkte harter Linien auf jeder Stufe auf dem Pfad (sonst die aller Linien) */
const ALLE_LINIEN = frage.get('linienart') !== 'hart';
/** so oft werden die Normalen der gekrümmten Dreiecke beruhigt (0: Normalen wie heute) */
const RUHE = zahl('ruhe', 0);
/** so oft wird vor den gekrümmten Dreiecken ohne Glätten verfeinert (0 oder 1) */
const VOR = zahl('vor', 1);
/**
 * Normalen je Rechenpunkt für die gekrümmten Dreiecke: `ruhig` (Grenzlagen der gewöhnlichen Unterteilung, so billig wie heute),
 * `unterteilt` (aus der zweimal unterteilten Fläche, zum Vergleich) oder `flaeche` (wie heute)
 */
const PN_NORMALEN = frage.get('pnnormalen') ?? 'ruhig';
/** so weit über der Haut werden die Linien gezeichnet (Einheiten): Liegt die Haut höher über dem Pfad, verschwindet die Linie */
const LINIE_HOEHE = zahl('hoehe', 0.15);
/**
 * `normalen=flaeche`: Die unterteilte Fassung schattiert mit den Normalen ihrer eigenen Fläche. Sonst (`glatt`) mit denen der
 * gewöhnlichen Unterteilung desselben Netzes ohne Versatz: Die Fläche geht durch die Rechenpunkte, die Schattierung ist so ruhig wie
 * bei Subsurf (kleine Unebenheiten der Rechenpunkte kippen die Normalen sonst sichtbar).
 */
const NORMALEN = frage.get('normalen') ?? 'glatt';

const info = document.getElementById('info') as HTMLDivElement;
const schrift = document.getElementById('schrift') as HTMLDivElement;
const leinwand = document.getElementById('leinwand') as HTMLCanvasElement;

// die vier Stufen der Schattierung wie in kurven.ts
const stufen = new DataTexture(new Uint8Array([70, 135, 200, 255]), 4, 1, RedFormat);
stufen.minFilter = NearestFilter;
stufen.magFilter = NearestFilter;
stufen.needsUpdate = true;

/** wie heute: harte Schwelle je Bildpunkt */
const materialHeute = (): MeshToonMaterial => new MeshToonMaterial({ color: KOERPER, gradientMap: stufen });
/** dieselben vier Stufen an denselben Schwellen, die Grenze aber einen Bildpunkt breit geglättet */
const materialGlatt = (): MeshToonMaterial => {
  const m = new MeshToonMaterial({ color: KOERPER });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
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
    );
  };
  m.customProgramCacheKey = () => 'stufe-glatt';
  return m;
};
/** Umriss wie in kurven.ts: Rückseiten, längs der Normale um eine feste Zahl Bildpunkte nach außen */
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

type Fassung = { titel: string; unter: string; szene: Scene; linien: LineMaterial[] };

function geometrie(pos: ArrayLike<number>, nor: ArrayLike<number>, index: Uint32Array): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(Float32Array.from(pos), 3));
  g.setAttribute('normal', new BufferAttribute(Float32Array.from(nor), 3));
  g.setIndex(new BufferAttribute(index, 1));
  return g;
}

/** die Linien als Bänder fester Breite: weiche türkis, harte schwarz und breiter (aus den Pfadstücken der Kanten) */
function linienBaender(net: AnzeigeNetz, nor: ArrayLike<number>): { objekte: LineSegments2[]; materialien: LineMaterial[] } {
  const N = net.pos.length / 3;
  const weich: number[] = [];
  const hart: number[] = [];
  const TEILE = 8;
  for (const [s, e] of net.pfad) {
    const ziel = e.hart ? hart : weich;
    const a = Math.floor(s / N);
    const b = s % N;
    // ein wenig über der Haut (längs der Normalen der beiden Enden), damit die Linie nicht mit der Fläche um die Tiefe streitet
    const punkt = (t: number): [number, number, number] => {
      const u = 1 - t;
      const b0 = u * u * u;
      const b1 = 3 * u * u * t;
      const b2 = 3 * u * t * t;
      const b3 = t * t * t;
      const aus: [number, number, number] = [0, 0, 0];
      for (let x = 0; x < 3; x++)
        aus[x] = b0 * e.k[x]! + b1 * e.k[3 + x]! + b2 * e.k[6 + x]! + b3 * e.k[9 + x]! + LINIE_HOEHE * (u * nor[3 * a + x]! + t * nor[3 * b + x]!);
      return aus;
    };
    let vor = punkt(0);
    for (let i = 1; i <= TEILE; i++) {
      const p = punkt(i / TEILE);
      ziel.push(...vor, ...p);
      vor = p;
    }
  }
  const objekte: LineSegments2[] = [];
  const materialien: LineMaterial[] = [];
  for (const [punkte, farbe, breite] of [
    [weich, KURVE, 1.6],
    [hart, TINTE, 3],
  ] as const) {
    if (!punkte.length) continue;
    const g = new LineSegmentsGeometry();
    g.setPositions(punkte);
    const m = new LineMaterial({ color: farbe, linewidth: breite });
    const o = new LineSegments2(g, m);
    o.renderOrder = 3;
    objekte.push(o);
    materialien.push(m);
  }
  return { objekte, materialien };
}

function fassung(titel: string, unter: string, geo: BufferGeometry, mat: MeshToonMaterial, grob: AnzeigeNetz, grobNor: ArrayLike<number>): Fassung {
  const szene = new Scene();
  const sonne = new DirectionalLight(0xffffff, 2.4);
  sonne.position.set(0.9, 1.4, 1.1);
  szene.add(sonne, new HemisphereLight(0xfff6e8, 0x9c8a74, 1.1));
  const umriss = new Mesh(geo, umrissMaterial);
  umriss.renderOrder = 1;
  szene.add(new Mesh(geo, mat), umriss);
  const linien: LineMaterial[] = [];
  if (MIT_LINIEN) {
    const b = linienBaender(grob, grobNor);
    szene.add(...b.objekte);
    linien.push(...b.materialien);
  }
  if (MIT_NETZ) {
    // das Rechennetz als Drahtgitter (zeigt, wie grob gerechnet und wie fein gezeigt wird)
    const kanten = new Set<number>();
    const N = grob.pos.length / 3;
    const p: number[] = [];
    for (let t = 0; t < grob.tri.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = grob.tri[t + e]!;
        const b = grob.tri[t + ((e + 1) % 3)]!;
        const s = a < b ? a * N + b : b * N + a;
        if (kanten.has(s)) continue;
        kanten.add(s);
        p.push(grob.pos[3 * a]!, grob.pos[3 * a + 1]!, grob.pos[3 * a + 2]!, grob.pos[3 * b]!, grob.pos[3 * b + 1]!, grob.pos[3 * b + 2]!);
      }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(Float32Array.from(p), 3));
    const draht = new LineSegments(g, new LineBasicMaterial({ color: TINTE, transparent: true, opacity: 0.22, depthWrite: false }));
    draht.renderOrder = 2;
    szene.add(draht);
  }
  return { titel, unter, szene, linien };
}

async function start(): Promise<void> {
  const antwort = await fetch(`/__wesen/${encodeURIComponent(NAME)}`);
  if (!antwort.ok) throw new Error(`„${NAME}“ ließ sich nicht laden (${antwort.status})`);
  const stand = entpacken(await antwort.arrayBuffer());
  const haut = hautAusFlach(stand.grund?.haut ?? stand.haut);
  const loops = stand.grund?.loops ?? stand.loops;

  // an der Spiegelebene abgeschnitten wie heute (`anzeigeZ` in kurven.ts): je Punkt, vor allem anderen
  const seite = hautSeiten(haut);
  const lagen = Float64Array.from(haut.pos);
  let ueberMitte = 0;
  if (seite)
    for (let v = 0; v < haut.n; v++) {
      const z = lagen[3 * v + 2]!;
      if ((seite[v]! > 0 && z < 0) || (seite[v]! < 0 && z > 0)) {
        lagen[3 * v + 2] = 0;
        ueberMitte++;
      }
    }

  const zeit: Record<string, number> = {};
  let t0 = performance.now();
  const grob = anzeigeNetz(haut, loops, lagen);
  zeit.netz = performance.now() - t0;
  const grobNormalen = netzNormalen(grob.pos, grob.tri);
  const grobGeo = geometrie(grob.pos, grobNormalen, grob.tri);


  t0 = performance.now();
  let fein = durchPunkte(grob, RUNDEN);
  zeit.versatz = performance.now() - t0;
  t0 = performance.now();
  for (let s = 0; s < STUFEN; s++) fein = unterteilen(fein, ALLE_LINIEN);
  zeit.unterteilen = performance.now() - t0;
  const feinNormalen = netzNormalen(fein.pos, fein.tri);
  // ruhige Normalen: die der gewöhnlichen Unterteilung desselben Netzes (ohne Versatz, weiche Linien frei). Diese Fläche ist überall
  // glatt, auch über die weichen Linien; ihre Punkte haben dieselben Nummern wie die der gezeigten Fläche, die ersten sind die Rechenpunkte.
  t0 = performance.now();
  let ruhig = grob;
  for (let s = 0; s < STUFEN; s++) ruhig = unterteilen(ruhig, false);
  const ruhigNormalen = netzNormalen(ruhig.pos, ruhig.tri);
  zeit.normalen = performance.now() - t0;
  const feinGeo = geometrie(fein.pos, NORMALEN === 'glatt' ? ruhigNormalen : feinNormalen, fein.tri);

  // gekrümmte Dreiecke: Normalen je Rechenpunkt wie heute (`pnnormalen=flaeche`) oder die ruhigen
  t0 = performance.now();
  const pnVor = PN_NORMALEN === 'ruhig' ? ruhigeNormalen(grob) : PN_NORMALEN === 'unterteilt' ? ruhigNormalen.subarray(0, grob.pos.length) : grobNormalen;
  const pnNor = RUHE > 0 ? normalenBeruhigen(grob, pnVor, RUHE) : pnVor;
  // `vor=1` (Standard): erst einmal ohne Glätten verfeinern und auf dem feineren Netz ruhige Normalen rechnen, dann die gekrümmten
  // Dreiecke mit halb so vielen Schritten (gleich viele Dreiecke); `vor=0`: gleich die gekrümmten Dreiecke
  let pnNetz = grob;
  let pnNormalen: ArrayLike<number> = pnNor;
  let pnSchritte = PN;
  for (let s = 0; s < VOR; s++) {
    pnNetz = verfeinernGekruemmt(pnNetz, pnNormalen);
    pnNormalen = PN_NORMALEN === 'flaeche' ? netzNormalen(pnNetz.pos, pnNetz.tri) : ruhigeNormalen(pnNetz);
    pnSchritte = Math.max(1, Math.round(pnSchritte / 2));
  }
  const pn = gekruemmt(pnNetz, pnSchritte, pnNormalen);
  zeit.gekruemmt = performance.now() - t0;
  let pnGeo = geometrie(pn.pos, pn.nor, pn.index);
  // `spalte3=beides` (Standard): die Form der gekrümmten Dreiecke (ohne Glätten verfeinert: geht durch alle Rechenpunkte, Linien exakt,
  // nichts schwingt über), schattiert mit den ruhigen Normalen der gewöhnlichen Unterteilung. Beide Verfeinerungen zählen ihre Punkte
  // gleich, die Normalen passen deshalb Punkt für Punkt. `spalte3=pn`: die gekrümmten Dreiecke mit ihren eigenen Normalen.
  if (frage.get('spalte3') !== 'pn') {
    t0 = performance.now();
    let g = grob;
    let gn: ArrayLike<number> = ruhigeNormalen(grob);
    for (let s = 0; s < STUFEN; s++) {
      g = verfeinernGekruemmt(g, gn);
      gn = ruhigeNormalen(g);
    }
    zeit.beides = performance.now() - t0;
    pnGeo = geometrie(g.pos, ruhigNormalen, g.tri);
  }
  const abstand = linienAbstand(fein, feinNormalen);
  // wie weit die Punkte der Haut auf den Linien in der gesicherten Form neben ihrem Pfad liegen (vor dem Anlegen an den Pfad)
  const roh = anzeigeNetz(haut, loops, lagen);
  let vorMax = 0;
  let vorSum = 0;
  let vorZahl = 0;
  {
    const quelleLage = (v: number, x: number): number => lagen[3 * v + x]!;
    const nRoh = roh.pos.length / 3;
    for (const [s, e] of roh.pfad) {
      for (const [v, ab] of [
        [Math.floor(s / nRoh), 0],
        [s % nRoh, 9],
      ] as const) {
        if (v >= haut.n) continue;
        const d = Math.hypot(e.k[ab]! - quelleLage(v, 0), e.k[ab + 1]! - quelleLage(v, 1), e.k[ab + 2]! - quelleLage(v, 2));
        vorMax = Math.max(vorMax, d);
        vorSum += d;
        vorZahl++;
      }
    }
  }

  const dreiecke = (g: BufferGeometry): string => `${Math.round(g.index!.count / 3).toLocaleString('de-DE')} Dreiecke`;
  const fassungen: Fassung[] = [
    fassung('heute', `${dreiecke(grobGeo)} gerechnet und gezeigt`, grobGeo, materialHeute(), grob, grobNormalen),
    fassung('heute, nur die Farbstufe geglättet', dreiecke(grobGeo), grobGeo, materialGlatt(), grob, grobNormalen),
    fassung(frage.get('spalte3') === 'pn' ? 'gekrümmte Dreiecke' : 'gekrümmte Dreiecke, ruhig schattiert', `${dreiecke(pnGeo)} gezeigt · Linien exakt auf dem Pfad`, pnGeo, materialGlatt(), grob, grobNormalen),
    fassung(`unterteilt (${STUFEN} Stufen, wie Subsurf)`, `${dreiecke(feinGeo)} gezeigt`, feinGeo, materialGlatt(), grob, grobNormalen),
  ];

  // Ausschnitte: oben die Mitte der Form, unten der höchste Punkt (ein Ohr, ein Horn)
  let oben = 0;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (let v = 0; v < haut.n; v++) {
    const p = new Vector3(lagen[3 * v], lagen[3 * v + 1], lagen[3 * v + 2]);
    min.min(p);
    max.max(p);
    if (p.y > lagen[3 * oben + 1]! || (p.y === lagen[3 * oben + 1]! && p.z > lagen[3 * oben + 2]!)) oben = v;
  }
  const mitten = [
    vektor('m1') ?? min.clone().add(max).multiplyScalar(0.5),
    vektor('m2') ?? new Vector3(lagen[3 * oben]!, lagen[3 * oben + 1]! - 22 / ZOOM[1]! - 30, lagen[3 * oben + 2]!),
  ];
  const blick = (vektor('blick') ?? new Vector3(-0.5, 0.32, 0.8)).normalize();

  const renderer = new WebGLRenderer({ canvas: leinwand, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.autoClear = false;
  const kamera = new OrthographicCamera(-1, 1, 1, -1, 1, 8000);

  const zeichnen = (): void => {
    const B = window.innerWidth;
    const H = window.innerHeight;
    renderer.setSize(B, H, false);
    renderer.setScissorTest(false);
    renderer.setClearColor(PAPIER, 1);
    renderer.clear();
    renderer.setScissorTest(true);
    const sp = fassungen.length;
    const zl = ZOOM.length;
    const b = B / sp;
    const h = H / zl;
    schrift.replaceChildren();
    for (let r = 0; r < zl; r++)
      for (let c = 0; c < sp; c++) {
        const f = fassungen[c]!;
        const x = c * b;
        const y = H - (r + 1) * h;
        renderer.setViewport(x, y, b, h);
        renderer.setScissor(x, y, b, h);
        const z = ZOOM[r]!;
        kamera.left = -b / (2 * z);
        kamera.right = b / (2 * z);
        kamera.top = h / (2 * z);
        kamera.bottom = -h / (2 * z);
        kamera.position.copy(mitten[r]!).addScaledVector(blick, 3000);
        kamera.up.set(0, 1, 0);
        kamera.lookAt(mitten[r]!);
        kamera.updateProjectionMatrix();
        (umrissMaterial.uniforms.uAufloesung!.value as Vector2).set(b, h);
        for (const m of f.linien) m.resolution.set(b, h);
        renderer.clearDepth();
        renderer.render(f.szene, kamera);
        const rahmen = document.createElement('div');
        rahmen.className = 'rahmen';
        rahmen.style.cssText = `left:${x}px;top:${r * h}px;width:${b}px;height:${h}px`;
        schrift.append(rahmen);
        if (r === 0) {
          const t = document.createElement('div');
          t.className = 'titel';
          t.style.cssText = `left:${x}px;top:0`;
          t.innerHTML = `${f.titel}<small>${f.unter}</small>`;
          schrift.append(t);
        }
      }
    for (let r = 0; r < zl; r++) {
      const t = document.createElement('div');
      t.className = 'zeile';
      t.style.top = `${(r + 1) * h - 26}px`;
      t.textContent = `${Math.round((ZOOM[r]! / 2.7) * 300)} % · 1 Einheit = ${ZOOM[r]!.toLocaleString('de-DE')} Bildpunkte`;
      schrift.append(t);
    }
  };
  zeichnen();
  window.addEventListener('resize', zeichnen);

  const ms = (x: number | undefined): string => `${(x ?? 0).toFixed(1)} ms`;
  const text = [
    `„${NAME}“: ${haut.n.toLocaleString('de-DE')} Punkte, ${loops.length} Loops${ueberMitte ? `, ${ueberMitte} Punkte über der Mitte abgeschnitten` : ''}`,
    `Kanten auf Linien: ${grob.pfad.size} (hart: ${[...grob.pfad.values()].filter((e) => e.hart).length}); Punkte der Haut lagen vorher höchstens ${vorMax.toFixed(3)}, im Mittel ${(vorSum / (vorZahl || 1)).toFixed(3)} Einheiten neben ihrem Pfad`,
    `weiche Linien nach dem Unterteilen (${ALLE_LINIEN ? 'auf dem Pfad gehalten' : 'frei'}): Pfad über/unter der Haut höchstens ${abstand.quer.groesster.toFixed(3)}, im Mittel ${abstand.quer.mittel.toFixed(3)} Einheiten; Netzpunkte längs der Haut gerutscht höchstens ${abstand.gleiten.groesster.toFixed(2)}`,
    `Netz der Anzeige ${ms(zeit.netz)} · gekrümmt ${ms(zeit.gekruemmt)} · beides ${ms(zeit.beides)} · ruhige Normalen ${ms(zeit.normalen)} · Versatz ${ms(zeit.versatz)} · unterteilen ${ms(zeit.unterteilen)}`,
  ];
  info.textContent = frage.get('info') === '0' ? '' : text.join('\n');
  (window as unknown as { __anzeige: unknown }).__anzeige = {
    bereit: true,
    text,
    zeit,
    abstand,
    oben: [lagen[3 * oben], lagen[3 * oben + 1], lagen[3 * oben + 2]],
    min: min.toArray(),
    max: max.toArray(),
    zeichnen,
  };
}

start().catch((e: unknown) => {
  info.textContent = `Fehler: ${e instanceof Error ? e.message : String(e)}`;
  (window as unknown as { __anzeige: unknown }).__anzeige = { bereit: false, fehler: String(e) };
  throw e;
});
