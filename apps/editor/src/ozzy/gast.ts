/**
 * Jelly und helles Solid in Ozzy (Florian, 18.11.2026: „die beiden, die wir im Screenshot erarbeitet hatten (Jelly und helles Solid mit
 * leichter Kante und Verlauf, aber ohne die extra Outlines)“, „exakt wie wir sie erarbeitet haben und keine eigene Version“; auf Ozzys
 * weißem Raum: „dann auf Weiß“).
 *
 * Beide sind die Darstellung des Blaupause-Editors `/editor`: `BlaupauseBild` aus `src/form/blaupause.ts` mit den Looks `jelly` (sein
 * 3D-Fenster) und `logo` (Seite, Front, Top), die Lava aus `src/form/lava.ts`. Der Renderer läuft hier **als Gast, unverändert**; an
 * seinem Code und seinen Shadern ist nichts angefasst (die Dateien gehören der Design-Sitzung). Was Ozzy darum herum tut:
 *
 * - **Eigene Zeichenfläche** (`#gast`, zwischen dem Raum und den Linien, mit Kantenglättung wie die Leinwand des Editors): Der Renderer
 *   zeichnet wie zu Hause in „sein Fenster“. In ein Ziel mit Kantenglättung ginge es nicht: Er zeichnet ein Fenster in mehreren
 *   Durchgängen, und three gibt den Inhalt eines solchen Ziels nach jedem Durchgang frei.
 * - **Auf Weiß:** Sein dunkler Grund bleibt weg (das eine Netz `hgNetz` wird verborgen; die Fläche ist durchsichtig und liegt über Ozzys
 *   Raum). Damit entfällt beim Logo-Look auch alles, was der Grund zeichnet: die dicke Kontur in Petrol, der Rand im Verlauf, Extrusion
 *   und langer Schatten („ohne die extra Outlines“). Es bleiben der weiße Körper mit dem Verlauf, die Schattenseite in Lavendel und die
 *   Kanten der Überdeckung.
 * - **Kante am Umriss (nur helles Solid):** Auf Weiß hätte der weiße Körper keinen Rand. Darum liegt unter ihm eine Kontur wie die
 *   dicke des Logo-Looks (überall gleich breit um die Silhouette, Petrol), aber nur so breit wie seine Kanten (4 Bildpunkte bei 100 %,
 *   sie wächst mit wie sie). Gezeichnet als die Fläche des Körpers, im Kreis um diese Breite versetzt (so zieht `feldRechnen` dort die
 *   Extrusion); der Körper deckt danach alles, was innen liegt. Die Kontur aus dem umgestülpten Körper (`umrissMat`) taugt hier nicht:
 *   Sie verjüngt sich an flachen Teilen bis auf nichts, und Weiß stünde dort auf Weiß.
 * - **Ozzys Perspektive:** Der Renderer rechnet parallel (Tiefe und Dicke je Bildpunkt gelten nur so). Ozzys Raum ist räumlich. Darum
 *   bekommt er die Haut so verzerrt, dass eine parallele Kamera genau Ozzys Bild sieht (jeder Punkt rückt quer zum Blick um
 *   Abstand der Mitte / eigener Abstand; die Normalen gehen mit, sodass der Umriss dort liegt, wo die Fläche quer zum Blick steht).
 *   In der Tiefe der Mitte ändert sich nichts; die Form im Bild deckt sich mit Ozzys Linien.
 * - **Was das Fenster des Editors dazugibt** (`editor.ts`, dort nachzulesen), ist hier Zeile für Zeile übernommen: Bläschen
 *   (`blasenJetzt`), Bodenkontakt (`kontaktRechnen`), Lava (`lavaAnkerRechnen`), die Maße des Körpers. Zwei Dinge fehlen mit Absicht:
 *   das Auge (es gehört zum Wesen, nicht zum Material), und die Lava steht still (im Editor „Lava bewegt“ aus), damit Ozzy in der
 *   Ruhe keine Bilder rechnet.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  OrthographicCamera,
  type PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { HautNetz } from '../anfang/haut';
import { BlaupauseBild, type Einstellung, type FensterBild, type KontaktEllipse, type P3 } from '../form/blaupause';
import { LavaLampe, lavaAnker, lavaPlan } from '../form/lava';

export const GAST_MATERIALIEN = ['Jelly', 'Helles Solid'] as const;
export type GastMaterial = (typeof GAST_MATERIALIEN)[number];

export type GastWerte = {
  /** wie deckend (Röntgen nimmt zurück; beim Einrasten blendet die Haut aus), 0 … 1 */
  deckung: number;
  /** Abstand der Kamera zur Mitte des Raums (Welt): in dieser Tiefe bleibt die Haut, wie sie ist */
  abstand: number;
  /** Kantenlänge des Rechennetzes in der Welt: so weit glättet der Renderer im Bild (4,5 Kanten, wie im Editor) */
  kante: number;
  /** Richtung zur Kamera in der Hausansicht des Raums: Bläschen sitzen unter Flächen, die dorthin schauen (wie im 3D-Fenster) */
  heim: [number, number, number];
  /** Zeit (ms) */
  jetzt: number;
  /**
   * Paint-Modus (19.11.): nach dem Bild des Gasts auf dieselbe Fläche zeichnen (die Farbe auf der Haut, `farbe/anzeige.ts`); das
   * Fenster des Renderers ist dann wieder die ganze Fläche. `ueberzugStand`: ändert er sich, wird neu gezeichnet, auch wenn sonst
   * alles steht.
   */
  ueberzug?: ((r: WebGLRenderer) => void) | null;
  ueberzugStand?: string;
};

/** Grundwerte des Editors (`teststand` in `editor.ts`): so zeigt sein 3D-Fenster das Jelly */
const JELLY: Einstellung = {
  durchsicht: false,
  linienMass: true,
  pBlick: true,
  pWandel: true,
  pTiefe: false,
  tiefe: 0.14,
  tiefeSchraeg: true,
  grundDa: false,
  kontur: 28,
  rand: 12,
  tiktok: true,
  extrusion: false,
  schatten: 0.36,
  kontaktKontur: true,
  kontaktBoden: true,
  kantenTiefe: true,
};
/** helles Solid: der Logo-Look ohne alles, was um den Körper liegt (das zeichnet ohnehin der Grund, der hier fehlt) */
const HELL: Einstellung = { ...JELLY, pBlick: false, pWandel: false, kontur: 0, rand: 0, tiktok: false, schatten: 0 };

/** Breite der Kanten im Logo-Look bei 100 % (`KANTE_BREITE` in `blaupause.ts`) und ihre Farbe (`FARBEN_START.kontur`) */
const KANTE_BREITE = 4;
const PETROL: P3 = [0x00 / 255, 0x3f / 255, 0x4e / 255];
/** Bildpunkte je Welteinheit bei 100 % im Editor: die kürzere Seite des Fensters zeigt so viele Einheiten (`SICHT` in `editor.ts`) */
const SICHT = 560;

/**
 * Die Stellen, an denen die Form aufliegt (`kontaktRechnen` aus `editor.ts`): die unterste Schicht der Haut (bis 12 % der Höhe über
 * dem tiefsten Punkt) nach zusammenhängenden Gruppen, je Gruppe eine Ellipse.
 */
function kontaktStellen(L: ArrayLike<number>, R: number): KontaktEllipse[] {
  const n = Math.floor(L.length / 3);
  if (n < 10) return [];
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let v = 0; v < n; v++) {
    y0 = Math.min(y0, L[3 * v + 1]!);
    y1 = Math.max(y1, L[3 * v + 1]!);
  }
  const band = y0 + 0.12 * (y1 - y0);
  const zelle = Math.max(1, 0.05 * R);
  // Punkte der untersten Schicht in Zellen am Boden; Gruppen = zusammenhängende Zellen (auch über Ecken)
  const zellen = new Map<string, number[]>();
  for (let v = 0; v < n; v++) {
    if (L[3 * v + 1]! > band) continue;
    const k = `${Math.floor(L[3 * v]! / zelle)},${Math.floor(L[3 * v + 2]! / zelle)}`;
    const z = zellen.get(k);
    if (z) z.push(v);
    else zellen.set(k, [v]);
  }
  const gruppe = new Map<string, number>();
  const gruppen: number[][] = [];
  for (const start of zellen.keys()) {
    if (gruppe.has(start)) continue;
    const g = gruppen.length;
    const punkte: number[] = [];
    const offen = [start];
    gruppe.set(start, g);
    while (offen.length) {
      const k = offen.pop()!;
      for (const v of zellen.get(k)!) punkte.push(v);
      const [i, j] = k.split(',').map(Number) as [number, number];
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++) {
          const q = `${i + di},${j + dj}`;
          if (zellen.has(q) && !gruppe.has(q)) {
            gruppe.set(q, g);
            offen.push(q);
          }
        }
    }
    gruppen.push(punkte);
  }
  const ellipsen: (KontaktEllipse & { zahl: number })[] = [];
  for (const g of gruppen) {
    if (g.length < 3) continue;
    let mx = 0;
    let mz = 0;
    let gy = Infinity;
    for (const v of g) {
      mx += L[3 * v]!;
      mz += L[3 * v + 2]!;
      gy = Math.min(gy, L[3 * v + 1]!);
    }
    mx /= g.length;
    mz /= g.length;
    let sxx = 0;
    let sxz = 0;
    let szz = 0;
    for (const v of g) {
      const dx = L[3 * v]! - mx;
      const dz = L[3 * v + 2]! - mz;
      sxx += dx * dx;
      sxz += dx * dz;
      szz += dz * dz;
    }
    // Hauptachsen der Streuung; die Halbachsen aus der Ausdehnung längs dieser Achsen (95 % der Punkte), etwas kleiner für den Glasrand
    const phi = 0.5 * Math.atan2(2 * sxz, sxx - szz);
    const ux = Math.cos(phi);
    const uz = Math.sin(phi);
    let pa: number[] = [];
    let pb: number[] = [];
    for (const v of g) {
      const dx = L[3 * v]! - mx;
      const dz = L[3 * v + 2]! - mz;
      pa.push(Math.abs(dx * ux + dz * uz));
      pb.push(Math.abs(dz * ux - dx * uz));
    }
    // die Halbachsen aus dem Querschnitt des Körpers in Höhe der Ellipse (sonst ragt sie an flachen Bäuchen über die Kontur)
    const yE = gy + 0.5 * (band - y0);
    const qa: number[] = [];
    const qb: number[] = [];
    for (const v of g) {
      if (Math.abs(L[3 * v + 1]! - yE) > 0.02 * (y1 - y0)) continue;
      const dx = L[3 * v]! - mx;
      const dz = L[3 * v + 2]! - mz;
      qa.push(Math.abs(dx * ux + dz * uz));
      qb.push(Math.abs(dz * ux - dx * uz));
    }
    if (qa.length >= 6) {
      pa = qa;
      pb = qb;
    }
    pa.sort((p, q) => p - q);
    pb.sort((p, q) => p - q);
    const q95 = (w: number[]): number => w[Math.min(w.length - 1, Math.floor(0.95 * w.length))]!;
    const rmin = 0.08 * R;
    // die Ellipse liegt waagerecht knapp über dem tiefsten Punkt ihrer Stelle (im Glas, nicht am Boden: so bleibt sie auch von der Seite
    // innerhalb der Kontur)
    ellipsen.push({ x: mx, y: gy + 0.5 * (band - y0), z: mz, ux, uz, a: Math.max(rmin, 0.8 * q95(pa)), b: Math.max(rmin, 0.8 * q95(pb)), zahl: g.length });
  }
  ellipsen.sort((a, b) => b.zahl - a.zahl);
  return ellipsen.slice(0, 4).map(({ x, y, z, ux, uz, a, b }) => ({ x, y, z, ux, uz, a, b }));
}

/**
 * Wo die Bläschen sitzen (`blasenJetzt` aus `editor.ts`): Punkte der Haut, die zur Hausansicht schauen, weit auseinander. Je Netz
 * einmal gewählt; die Bläschen wandern dann mit der Haut.
 */
function blasenWaehlen(P: ArrayLike<number>, nor: ArrayLike<number>, heim: readonly [number, number, number]): number[] {
  const n = Math.floor(P.length / 3);
  const kand: number[] = [];
  for (let v = 0; v < n; v += 5) if (nor[3 * v]! * heim[0] + nor[3 * v + 1]! * heim[1] + nor[3 * v + 2]! * heim[2] > 0.72) kand.push(v);
  const idx: number[] = [];
  const ab = (v: number, w: number): number => Math.hypot(P[3 * v]! - P[3 * w]!, P[3 * v + 1]! - P[3 * w + 1]!, P[3 * v + 2]! - P[3 * w + 2]!);
  if (kand.length) {
    idx.push(kand[Math.floor(kand.length * 0.37)]!);
    while (idx.length < 4 && idx.length < kand.length) {
      let best = -1;
      let bd = -1;
      for (const v of kand) {
        let m = Infinity;
        for (const w of idx) m = Math.min(m, ab(v, w));
        if (m > bd) {
          bd = m;
          best = v;
        }
      }
      idx.push(best);
    }
  }
  return idx;
}
const BLASEN_GROESSE = [0.075, 0.055, 0.095, 0.045];

/**
 * Die Fläche des Körpers in einer Farbe, im Bild um `uZug` versetzt (wie `maskeMat` in `blaupause.ts`): im Kreis versetzt gezeichnet,
 * wächst die Silhouette rundum um den Halbmesser des Kreises.
 */
function randMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
    uniforms: { uZug: { value: new Vector2() }, uFarbe: { value: new Vector3(...PETROL) } },
    vertexShader: 'uniform vec2 uZug; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.xy += uZug * gl_Position.w; }',
    fragmentShader: 'uniform vec3 uFarbe; void main() { gl_FragColor = vec4(uFarbe, 1.0); }',
  });
}

export class GastHaut {
  private readonly leinwand: HTMLCanvasElement;
  private renderer: WebGLRenderer | null = null;
  private bild: BlaupauseBild | null = null;
  private bildDpr = 0;
  private readonly geo = new BufferGeometry();
  private readonly kam = new OrthographicCamera(-1, 1, 1, -1, 1, 100);
  private readonly randMat = randMaterial();
  private readonly szRand = new Scene();
  private readonly lampe = new LavaLampe();
  private glanzTeile: { c: P3; r: number }[] = [];
  private grossHalbmesser = 100;
  private kontakt: KontaktEllipse[] = [];
  private blasenIdx: number[] = [];
  private blasenFuer: { index: unknown; zahl: number } | null = null;
  private netz: HautNetz | null = null;
  private wicklung = 0;
  /** verzerrte Lagen und Normalen (was der Renderer zeichnet) */
  private lagen = new Float32Array(0);
  private normalen = new Float32Array(0);
  /** Maße des Körpers (Welt, unverzerrt) */
  private kasten = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, radius: 150 };
  /** der Körper hat sich geändert: Lava, Kontakt und Maße neu (höchstens alle 250 ms, wie im Editor) */
  private koerperAlt = true;
  private koerperZeit = -Infinity;
  private b = 4;
  private h = 4;
  private dpr = 1;
  /** was zuletzt gezeichnet wurde (ändert sich nichts, bleibt das Bild stehen) */
  private stand = '';
  private sichtbar = false;
  /**
   * Zeiten des letzten Bilds (ms): Verzerren, Zeichnen (mit `genau` bis die Grafikkarte fertig ist), Körper vermessen; die Größe des
   * Fensters, das der Renderer bekam; wie viele Bilder gezeichnet wurden
   */
  readonly mess = { verzerren: 0, zeichnen: 0, koerper: 0, fenster: [0, 0] as [number, number], bilder: 0 };
  /** zum Messen: nach jedem Bild warten, bis die Grafikkarte fertig ist */
  genau = false;
  private readonly punkt = new Uint8Array(4);
  /** das Fenster des letzten Bilds (Gerätepunkte, Ursprung unten links) */
  private fenster = { x: 0, y: 0, w: 0, h: 0 };

  constructor(leinwand: HTMLCanvasElement) {
    this.leinwand = leinwand;
    const m = new Mesh(this.geo, this.randMat);
    m.frustumCulled = false;
    this.szRand.add(m);
  }

  groesse(b: number, h: number, dpr: number): void {
    this.b = b;
    this.h = h;
    this.dpr = dpr;
    if (this.renderer) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(b, h, false);
    }
    this.stand = '';
  }

  /**
   * Die glatte Anzeige des Werks (dieselben Felder wie für die Seifenhaut). `wicklung`: Umlaufsinn ihrer Dreiecke von außen gesehen
   * (1 gegen den Uhrzeiger).
   */
  netzSetzen(netz: HautNetz | null, wicklung: number): void {
    this.netz = netz;
    this.koerperAlt = true;
    this.stand = '';
    if (!netz) return;
    if (this.lagen.length !== netz.pos.length || wicklung !== this.wicklung || this.geo.index?.count !== netz.index.length) {
      this.wicklung = wicklung;
      this.lagen = new Float32Array(netz.pos.length);
      this.normalen = new Float32Array(netz.pos.length);
      const lage = new BufferAttribute(this.lagen, 3);
      const normale = new BufferAttribute(this.normalen, 3);
      lage.setUsage(DynamicDrawUsage);
      normale.setUsage(DynamicDrawUsage);
      this.geo.setAttribute('position', lage);
      this.geo.setAttribute('normal', normale);
      // Vorderseiten gegen den Uhrzeiger (so erwartet es three)
      let index = netz.index;
      if (wicklung < 0) {
        index = new Uint32Array(netz.index.length);
        for (let i = 0; i < index.length; i += 3) {
          index[i] = netz.index[i]!;
          index[i + 1] = netz.index[i + 2]!;
          index[i + 2] = netz.index[i + 1]!;
        }
      }
      this.geo.setIndex(new BufferAttribute(index, 1));
    }
  }

  /**
   * Probe: Wie weit liegt das Bild der verzerrten Haut (parallele Kamera des letzten Bilds) neben dem Bild, das Ozzys Kamera von der
   * Haut selbst gibt? Größter Abstand in Gerätepunkten über jede 37. Ecke; −1 ohne Bild.
   */
  abweichung(kamera: PerspectiveCamera | OrthographicCamera): number {
    const netz = this.netz;
    const f = this.fenster;
    if (!netz || f.w < 4 || this.lagen.length !== netz.pos.length) return -1;
    const Bd = Math.max(4, Math.round(this.b * this.dpr));
    const Hd = Math.max(4, Math.round(this.h * this.dpr));
    const a = new Vector3();
    const b = new Vector3();
    let weit = 0;
    for (let i = 0; i < netz.pos.length; i += 3 * 37) {
      a.set(netz.pos[i]!, netz.pos[i + 1]!, netz.pos[i + 2]!).project(kamera);
      b.set(this.lagen[i]!, this.lagen[i + 1]!, this.lagen[i + 2]!).project(this.kam);
      const dx = (a.x * 0.5 + 0.5) * Bd - (f.x + (b.x * 0.5 + 0.5) * f.w);
      const dy = (a.y * 0.5 + 0.5) * Hd - (f.y + (b.y * 0.5 + 0.5) * f.h);
      weit = Math.max(weit, Math.hypot(dx, dy));
    }
    return weit;
  }

  /** die Fläche leeren und verbergen (ein anderes Material ist gewählt, oder es ist nichts zu zeigen) */
  aus(): void {
    if (!this.sichtbar) return;
    this.sichtbar = false;
    this.stand = '';
    this.leinwand.style.display = 'none';
  }

  private bauen(): BlaupauseBild {
    if (!this.renderer) {
      this.renderer = new WebGLRenderer({ canvas: this.leinwand, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
      this.renderer.autoClear = false;
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(this.b, this.h, false);
    }
    if (!this.bild || this.bildDpr !== this.dpr) {
      this.bild = new BlaupauseBild(this.renderer, this.dpr);
      this.bildDpr = this.dpr;
      this.bild.hautGeometrie(this.geo);
      // auf Weiß: der Grund des Editors bleibt weg
      const grund = Reflect.get(this.bild, 'hgNetz') as { visible: boolean } | undefined;
      if (grund) grund.visible = false;
      else console.warn('Ozzy: Der Grund des Blaupause-Renderers ließ sich nicht verbergen (`hgNetz` fehlt); Jelly und helles Solid stehen auf seinem dunklen Grund.');
    }
    return this.bild;
  }

  /** Maße, Lava, Kontakt und Bläschen aus der unverzerrten Haut (wie `rendern` und `lavaAnkerRechnen` in `editor.ts`) */
  private koerperRechnen(netz: HautNetz, bild: BlaupauseBild, w: GastWerte): void {
    const t0 = performance.now();
    const P = netz.pos;
    const n = P.length / 3;
    const k = this.kasten;
    k.x0 = k.y0 = k.z0 = Infinity;
    k.x1 = k.y1 = k.z1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
      const x = P[i]!;
      const y = P[i + 1]!;
      const z = P[i + 2]!;
      if (x < k.x0) k.x0 = x;
      if (x > k.x1) k.x1 = x;
      if (y < k.y0) k.y0 = y;
      if (y > k.y1) k.y1 = y;
      if (z < k.z0) k.z0 = z;
      if (z > k.z1) k.z1 = z;
    }
    const mx = 0.5 * (k.x0 + k.x1);
    const my = 0.5 * (k.y0 + k.y1);
    const mz = 0.5 * (k.z0 + k.z1);
    let r2 = 0;
    for (let i = 0; i < P.length; i += 3) r2 = Math.max(r2, (P[i]! - mx) ** 2 + (P[i + 1]! - my) ** 2 + (P[i + 2]! - mz) ** 2);
    const radius = Math.sqrt(r2);
    k.radius = radius > 1 ? radius : 150;
    // Lava: Anker in den dicken Teilen, Glanz auf den großen (die Kontaktbereiche rechnet das Fenster aus dem Bodenkontakt)
    if (n >= 4) {
      const fund = lavaAnker(P, this.geo.index!.array);
      const plan = lavaPlan(fund);
      if (fund.feld) bild.abstandFeld(fund.feld);
      this.lampe.ziele({ anker: plan.anker, kontakt: null }, 0.66, 0.87);
      this.glanzTeile = (plan.teile ?? []).map((a) => ({ c: a.p, r: a.r }));
      this.grossHalbmesser = plan.teile?.[0]?.r ?? 100;
    } else {
      this.lampe.ziele({ anker: [], kontakt: null }, 0.66, 0.87);
      this.glanzTeile = [];
    }
    this.kontakt = kontaktStellen(P, k.radius);
    if (!this.blasenFuer || this.blasenFuer.index !== netz.index || this.blasenFuer.zahl !== n) {
      this.blasenIdx = blasenWaehlen(P, netz.normal, w.heim);
      this.blasenFuer = { index: netz.index, zahl: n };
    }
    this.mess.koerper = performance.now() - t0;
  }

  /**
   * Die Haut mit dem Material auf die eigene Fläche zeichnen (sie liegt über dem Raum). Zurück: ob noch etwas in Bewegung ist (die
   * Lava schwimmt zu neuen Ankern, oder der Körper wird gleich neu vermessen) und das nächste Bild gebraucht wird.
   */
  zeichnen(kamera: PerspectiveCamera | OrthographicCamera, art: GastMaterial, w: GastWerte): boolean {
    const netz = this.netz;
    if (!netz || netz.pos.length < 12) {
      this.aus();
      return false;
    }
    const bild = this.bauen();
    const r = this.renderer!;
    const jelly = art === 'Jelly';
    // der Körper: nach einer Änderung neu, höchstens alle 250 ms (solange gezogen wird, schwimmt die Lava hinterher)
    let unruhig = false;
    if (this.koerperAlt) {
      if (w.jetzt - this.koerperZeit >= 250) {
        this.koerperZeit = w.jetzt;
        this.koerperAlt = false;
        this.koerperRechnen(netz, bild, w);
      } else unruhig = true;
    }
    if (jelly) {
      this.lampe.schritt(w.jetzt);
      if (this.lampe.unruhig) unruhig = true;
    }
    this.leinwand.style.opacity = String(Math.max(0, Math.min(1, w.deckung)));
    // steht alles (Kamera, Haut, Größe, Material), bleibt das Bild stehen
    const pe = kamera.projectionMatrix.elements;
    const me = kamera.matrixWorld.elements;
    const stand = `${art}|${this.b}|${this.h}|${this.dpr}|${w.abstand}|${w.kante}|${pe.join(',')}|${me.join(',')}|${w.ueberzugStand ?? ''}`;
    if (stand === this.stand && !unruhig && this.sichtbar) return false;
    this.stand = stand;

    // ---------- die Haut verzerren: Eine parallele Kamera sieht dann, was Ozzys räumliche Kamera sieht ----------
    const t0 = performance.now();
    const raeumlich = Math.abs(pe[15]!) < 0.5;
    const D = Math.max(1e-6, w.abstand);
    const rx = me[0]!;
    const ry = me[1]!;
    const rz = me[2]!;
    const ux = me[4]!;
    const uy = me[5]!;
    const uz = me[6]!;
    const bx = me[8]!;
    const by = me[9]!;
    const bz = me[10]!;
    const cx = me[12]!;
    const cy = me[13]!;
    const cz = me[14]!;
    /** ein Punkt der Welt → verzerrt; zurück: der Faktor quer zum Blick */
    const ein = (x: number, y: number, z: number, aus: P3): number => {
      const px = x - cx;
      const py = y - cy;
      const pz = z - cz;
      const qx = px * rx + py * ry + pz * rz;
      const qy = px * ux + py * uy + pz * uz;
      const qz = px * bx + py * by + pz * bz;
      const k = raeumlich ? D / Math.max(1e-6, -qz) : 1;
      aus[0] = cx + k * qx * rx + k * qy * ux + qz * bx;
      aus[1] = cy + k * qx * ry + k * qy * uy + qz * by;
      aus[2] = cz + k * qx * rz + k * qy * uz + qz * bz;
      return k;
    };
    const P = netz.pos;
    const N = netz.normal;
    const L = this.lagen;
    const M = this.normalen;
    let sx0 = Infinity;
    let sx1 = -Infinity;
    let sy0 = Infinity;
    let sy1 = -Infinity;
    let d0 = Infinity;
    let d1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) {
      const px = P[i]! - cx;
      const py = P[i + 1]! - cy;
      const pz = P[i + 2]! - cz;
      const qx = px * rx + py * ry + pz * rz;
      const qy = px * ux + py * uy + pz * uz;
      const qz = px * bx + py * by + pz * bz;
      const d = -qz;
      const k = raeumlich ? D / Math.max(1e-6, d) : 1;
      const sx = k * qx;
      const sy = k * qy;
      L[i] = cx + sx * rx + sy * ux + qz * bx;
      L[i + 1] = cy + sx * ry + sy * uy + qz * by;
      L[i + 2] = cz + sx * rz + sy * uz + qz * bz;
      if (sx < sx0) sx0 = sx;
      if (sx > sx1) sx1 = sx;
      if (sy < sy0) sy0 = sy;
      if (sy > sy1) sy1 = sy;
      if (d < d0) d0 = d;
      if (d > d1) d1 = d;
      // die Normale geht mit (Kehrwert der Verzerrung, transponiert): Sie steht quer zum Blick, wo der Sehstrahl die Fläche streift
      const nx = N[i]! * rx + N[i + 1]! * ry + N[i + 2]! * rz;
      const ny = N[i]! * ux + N[i + 1]! * uy + N[i + 2]! * uz;
      const nz = N[i]! * bx + N[i + 1]! * by + N[i + 2]! * bz;
      let ax = nx;
      let ay = ny;
      let az = nz;
      if (raeumlich) {
        ax = nx / k;
        ay = ny / k;
        az = nz - (nx * qx + ny * qy) / Math.max(1e-6, d);
      }
      const l = 1 / (Math.hypot(ax, ay, az) || 1);
      ax *= l;
      ay *= l;
      az *= l;
      M[i] = ax * rx + ay * ux + az * bx;
      M[i + 1] = ax * ry + ay * uy + az * by;
      M[i + 2] = ax * rz + ay * uz + az * bz;
    }
    (this.geo.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.geo.getAttribute('normal') as BufferAttribute).needsUpdate = true;
    this.mess.verzerren = performance.now() - t0;

    // ---------- die parallele Kamera: Ozzys Bild in der Tiefe der Mitte, beschnitten auf das Fenster um die Haut ----------
    const Bd = Math.max(4, Math.round(this.b * this.dpr));
    const Hd = Math.max(4, Math.round(this.h * this.dpr));
    // halbe Breite und Höhe des ganzen Bilds in der Welt und seine Mitte (Schwenken und die Vier Ansichten verschieben und stauchen es)
    const hw = raeumlich ? D / pe[0]! : 1 / pe[0]!;
    const hh = raeumlich ? D / pe[5]! : 1 / pe[5]!;
    const mx = raeumlich ? (D * pe[8]!) / pe[0]! : -pe[12]! / pe[0]!;
    const my = raeumlich ? (D * pe[9]!) / pe[5]! : -pe[13]! / pe[5]!;
    const ppu = Hd / (2 * hh);
    const mass = ppu / this.dpr / (Math.min(this.b, this.h) / SICHT);
    // das Fenster des Renderers: die Haut im Bild mit Rand (Kante, Glättung), auf ganze Gerätepunkte
    const rand = Math.ceil((16 + 2 * KANTE_BREITE * mass) * this.dpr);
    const X0 = Math.max(0, Math.floor(((sx0 - mx) / hw / 2 + 0.5) * Bd) - rand);
    const X1 = Math.min(Bd, Math.ceil(((sx1 - mx) / hw / 2 + 0.5) * Bd) + rand);
    const Y0 = Math.max(0, Math.floor(((sy0 - my) / hh / 2 + 0.5) * Hd) - rand);
    const Y1 = Math.min(Hd, Math.ceil(((sy1 - my) / hh / 2 + 0.5) * Hd) + rand);
    r.setRenderTarget(null);
    r.setScissorTest(false);
    r.setViewport(0, 0, this.b, this.h);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    if (!this.sichtbar) {
      this.sichtbar = true;
      this.leinwand.style.display = '';
    }
    if (X1 - X0 < 4 || Y1 - Y0 < 4) return unruhig;
    const rect = { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 };
    const css = { x: rect.x / this.dpr, y: rect.y / this.dpr, w: rect.w / this.dpr, h: rect.h / this.dpr };
    this.mess.fenster = [rect.w, rect.h];
    this.fenster = rect;
    const kam = this.kam;
    kam.position.set(cx, cy, cz);
    kam.quaternion.setFromRotationMatrix(kamera.matrixWorld);
    kam.left = mx - hw + (rect.x / Bd) * 2 * hw;
    kam.right = kam.left + (rect.w / Bd) * 2 * hw;
    kam.bottom = my - hh + (rect.y / Hd) * 2 * hh;
    kam.top = kam.bottom + (rect.h / Hd) * 2 * hh;
    const polster = Math.max(10, 0.1 * (d1 - d0));
    kam.near = Math.max(1, d0 - polster);
    kam.far = d1 + polster;
    kam.updateProjectionMatrix();
    kam.updateMatrixWorld(true);

    // ---------- was das Fenster des Editors dem Renderer mitgibt (`rendern` in `editor.ts`) ----------
    const k = this.kasten;
    const ausd = [k.x1 - k.x0, k.y1 - k.y0, k.z1 - k.z0].sort((a, b) => a - b);
    bild.einstellung = jelly ? JELLY : HELL;
    bild.koerperRadius = k.radius;
    bild.koerperMitte = [0.5 * (k.x0 + k.x1), 0.5 * (k.y0 + k.y1), 0.5 * (k.z0 + k.z1)];
    // typische Dicke: aus der mittleren Ausdehnung (ein Fisch ist lang, aber nicht dick)
    bild.dickeBezug = Math.max(1, 0.6 * ausd[1]!);
    bild.halbeHoehe = Math.max(1, 0.5 * (k.y1 - k.y0));
    bild.bodenY = k.y0;
    bild.grossHalbmesser = this.grossHalbmesser;
    bild.kantenLaenge = w.kante;
    bild.auge(null);
    if (jelly) {
      const hilf: P3 = [0, 0, 0];
      // Bläschen: ein Stück unter ihrer Stelle der Haut (sie wandern mit ihr)
      const T0 = bild.dickeBezug;
      bild.blasen(
        this.blasenIdx
          .filter((v) => 3 * v + 2 < P.length)
          .map((v, i) => {
            const rr = BLASEN_GROESSE[i % BLASEN_GROESSE.length]! * T0;
            const t = 0.18 * T0 + rr;
            const f = ein(P[3 * v]! - N[3 * v]! * t, P[3 * v + 1]! - N[3 * v + 1]! * t, P[3 * v + 2]! - N[3 * v + 2]! * t, hilf);
            return { p: [hilf[0], hilf[1], hilf[2]] as P3, r: rr * f };
          }),
      );
      // Lava: die Uhr steht (im Editor „Lava bewegt“ aus); die Blasen schwimmen nur zu neuen Ankern
      bild.lava(
        this.lampe.formen(0).map((s) => {
          const f = ein(s.c[0], s.c[1], s.c[2], hilf);
          return { c: [hilf[0], hilf[1], hilf[2]] as P3, m: s.m.map((x) => x * f * f) as typeof s.m, ton: s.ton };
        }),
        this.glanzTeile.map((g) => {
          const f = ein(g.c[0], g.c[1], g.c[2], hilf);
          return { c: [hilf[0], hilf[1], hilf[2]] as P3, r: g.r * f };
        }),
      );
      bild.kontaktEllipsen(
        this.kontakt.map((e) => {
          const f = ein(e.x, e.y, e.z, hilf);
          return { x: hilf[0], y: hilf[1], z: hilf[2], ux: e.ux, uz: e.uz, a: e.a * f, b: e.b * f };
        }),
      );
    }
    const t1 = performance.now();
    // helles Solid: zuerst die Kante um den Umriss (der Körper deckt danach alles, was innen liegt)
    if (!jelly) {
      r.setViewport(css.x, css.y, css.w, css.h);
      r.setScissor(css.x, css.y, css.w, css.h);
      r.setScissorTest(true);
      const breit = KANTE_BREITE * this.dpr * mass;
      // so viele Lagen im Kreis, dass der Rand zwischen zweien höchstens 0,15 Bildpunkte einfällt
      const lagen = Math.max(12, Math.min(48, Math.ceil(Math.PI / Math.acos(Math.max(0, 1 - 0.15 / Math.max(0.2, breit))))));
      const zug = this.randMat.uniforms.uZug!.value as Vector2;
      for (let i = 0; i < lagen; i++) {
        const a = (2 * Math.PI * i) / lagen;
        zug.set((2 * breit * Math.cos(a)) / rect.w, (2 * breit * Math.sin(a)) / rect.h);
        r.render(this.szRand, kam);
      }
    }
    const fenster: FensterBild = {
      rect,
      css,
      kam,
      // immer von vorn (im Editor tauschen Körper und Kontur von hinten die Farben; ein Material hat keine Rückseite)
      sigma: { A: 3.2, beta: 0, w: 1, fdot: 1, fs: [0, 0], cx: 0, cy: 0 },
      ppu,
      mass,
      kamAbstand: D,
      blick: [bx, by, bz],
      griffStaebe: [],
      griffBoegen: [],
      art: jelly ? 'jelly' : 'logo',
    };
    bild.zeichne(fenster);
    r.setScissorTest(false);
    if (w.ueberzug) {
      r.setRenderTarget(null);
      r.setViewport(0, 0, this.b, this.h);
      w.ueberzug(r);
    }
    if (this.genau) {
      // einen Bildpunkt zurücklesen: erst dann ist die Grafikkarte wirklich fertig (`finish` allein wartet im Browser nicht)
      const gl = r.getContext();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.punkt);
    }
    this.mess.zeichnen = performance.now() - t1;
    this.mess.bilder++;
    return unruhig;
  }
}
