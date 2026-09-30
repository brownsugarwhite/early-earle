import { Box3, BufferAttribute, BufferGeometry, Group, Matrix3, Matrix4, Mesh, Uint32BufferAttribute, Vector3 } from 'three/webgpu';
import type { Camera, InstancedBufferAttribute, Object3D } from 'three/webgpu';
import { attribute, normalLocal, positionGeometry, positionLocal, uniform } from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';
import { PaletteAtlas } from '../palette';
import { PaletteLookup, createFogSettings, type FloatNode, type FogSettings, type TSLUniform, type Vec2Node, type Vec3Node, type Vec4Node } from '../tsl';
import { createBarkShade, type BarkStyle } from './bark';
import { createLaceMesh, createStarMesh, type BillboardUniforms, type CountLodMesh } from './branches';
import { createCanopy, type Canopy } from './canopy';
import { makeTube, tubeLength, tubePointAt, tubeRadiusAt, tubeTangentAt, wrapAngle, type TubeCurve } from './curve';
import { InkMaterial } from './inkMaterial';
import { TREE_PALETTE_ROWS, addTreePalette, type TreePaletteRows } from './palette';
import type { Dome, Limb, NeedleSite, TreeShape, Twig } from './shape';
import { trunkProfile, type TrunkProfile } from './trunk';
import { buildWood } from './wood';

/**
 * Große Geschwister des Riesenbaums (Florian 2026-09-30: „Um den riesigen Baum auch noch ein paar mehr große Bäume in
 * ähnlichem Stil“): Earle-Bäume im Stil des Riesenbaums — knorriger, gedrehter Stamm mit weißen Rindenlinien und Schnee,
 * Wurzeln und Schneewehe, Fontänenäste, die sich dendritisch gabeln, ein Schleier hängender Zweige mit goldenen
 * Sternnadeln, Juwelenkuppeln mit Mikropunkten und Blüten —, aber kleiner und jeder anders:
 * - `kuppel`: gestufte Juwelenkuppel auf Tragästen (Bild 02), der kleine Bruder;
 * - `schirm`: flacher, weiter Kuppelschirm auf hohem Stamm, der Schleier fällt vom Rand (Ebene 1/36);
 * - `pagode`: schmal und hoch, Kuppelkränze übereinander (Ebene 33);
 * - `fontaene`: knorrige Fontäne (Bild 04) — kleine Krone, lange Äste fallen bis fast zum Boden, dichter Sternenschleier.
 *
 * Alle Geschwister einer Gruppe teilen sich EIN Holz-Mesh, EINE Kuppel-Instanz mit Randpunkten, EINEN Schleier und EINE
 * Sternschicht: 5 Draw Calls und 2 Schattenwerfer für die ganze Gruppe, egal wie viele Bäume. Die Detailstufe (Randpunkte,
 * Schleier, Sterne) folgt der Bildschirmgröße stetig wie beim Riesenbaum (nichts ploppt).
 *
 * Raum: ein gemeinsamer Baumraum (+Y oben, Einheit wie der Riesenbaum: Kronenradius 15 ≈ 6 Welteinheiten auf der Karte).
 * Auf der Karte ist das der Slot-Raum des Riesenbaums (dieselbe `warp`- und `groundAt`-Funktion), die Geschwister
 * stehen dann um ihn herum; in Labs ein eigener Halter.
 */

export type GrandForm = 'kuppel' | 'schirm' | 'pagode' | 'fontaene';
export const GRAND_FORMS: readonly GrandForm[] = ['kuppel', 'fontaene', 'schirm', 'pagode'];

/** Form eines Geschwisters (Baumeinheiten wie der Riesenbaum: Stamm 14, Krone 15). */
export interface GrandTreeSpec {
  form: GrandForm;
  seed: number;
  /** Stammhöhe bis zur Gabel. */
  height: number;
  /** Kronenradius. */
  crown: number;
  /** Farbband der Kuppeln auf dem Juwelenverlauf 0..1 (Türkis → Blau → Violett → Magenta → Rot): [Rand, Scheitel]. */
  tones: [number, number];
}

/** Standort eines Geschwisters im gemeinsamen Raum (Fuß; die Bodenhöhe kommt aus `groundAt`). */
export interface GrandTreeSite {
  x: number;
  z: number;
  /** Drehung um die Hochachse (rad). */
  yaw?: number;
  /** Teile der Form überschreiben (sonst aus Seed und Reihenfolge). */
  spec?: Partial<GrandTreeSpec>;
}

export type GrandQuality = 'hoch' | 'mobil';

export interface GrandTreesOptions {
  sites: GrandTreeSite[];
  /** Startwert der Gruppe (Formen, Zweige, Farben). */
  seed?: number;
  quality?: GrandQuality;
  /** Bodenhöhe unter (x, z) im gemeinsamen Raum (Wurzeln, Schneewehe folgen dem Gelände; Standard: eben). */
  groundAt?: (x: number, z: number) => number;
  /** Positions-Warp je Vertex im gemeinsamen Raum (z. B. die Planetenkrümmung wie beim Riesenbaum). */
  warp?: (p: Vec3Node) => Vec3Node;
  /** Rinde: `ink` (Bild 01/04, weiße Linien) oder `jewel` (Bild 02, Glasfenster-Streifen). */
  bark?: BarkStyle;
  /** Schnee auf der Rinde und an den Füßen 0..1 (Standard 1). */
  snow?: number;
  /** Atlas mit den Baumzeilen (Standard: eigener); mit `rows` + `lookup` die Zeilen des Riesenbaums teilen. */
  atlas?: PaletteAtlas;
  lookup?: PaletteLookup;
  rows?: TreePaletteRows;
  fog?: FogSettings;
  fogLookup?: PaletteLookup;
  /** Billboard-Uniforms des Riesenbaums teilen (Kamera, Sonne, Wachstum): dann genügt dessen `updateCamera`. */
  billboard?: BillboardUniforms;
}

export interface GrandTrees {
  group: Group;
  parts: { wood: Mesh; domes: Canopy['domes']; dots: Mesh; lace: Mesh; stars: Mesh };
  /** Glatte Schattenwerfer (Holz, Kuppeln) — nie Punkte, Schleier oder Sterne. */
  shadowCasters: Object3D[];
  /** Formen je Standort (nach Vorgaben und Seed). */
  specs: GrandTreeSpec[];
  /** Füße im gemeinsamen Raum (mit Bodenhöhe) und Gipfelhöhen darüber. */
  feet: Vector3[];
  tops: number[];
  bounds: Box3;
  stats: { trees: number; domes: number; dots: number; twigs: number; stars: number; woodVertices: number };
  billboard: BillboardUniforms;
  /** Einmal je Frame (falls die Billboards nicht vom Riesenbaum kommen: Kamera-Achsen, Projektion; immer: Detailstufe, Sortierung). */
  updateCamera(camera: Camera): void;
  setSunDirection(dirWorld: Vector3): void;
  update(dt: number): void;
  /** Kronen wachsen von innen nach außen ein (0..1). */
  setGrowth(g: number): void;
  setDetail(share: number | null): void;
  dispose(): void;
}

const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);
const dirH = (a: number): Vector3 => new Vector3(Math.cos(a), 0, Math.sin(a));

/** Form des i-ten Geschwisters aus Seed und Reihenfolge (die vier Formen wechseln sich ab, Farben rücken weiter). */
export function grandSpec(index: number, seed: number, over: Partial<GrandTreeSpec> = {}): GrandTreeSpec {
  const rand = mulberry32(hash32('grand-spec', seed, index));
  const form = over.form ?? GRAND_FORMS[(index + Math.floor(rand() * 2)) % GRAND_FORMS.length]!;
  // Größe relativ zum Riesenbaum (Stamm 14, Krone 15): etwa halb so groß, je Form eigene Proportionen
  const size = 0.85 + 0.3 * rand();
  const dims: Record<GrandForm, [number, number]> = { kuppel: [7.5, 7.6], schirm: [9.5, 7.8], pagode: [7.2, 5.4], fontaene: [5.6, 7.2] };
  const [h, c] = dims[form];
  // Farbbänder rücken je Baum weiter (Türkis-Blau, Magenta-Rot, Blau-Violett, Violett-Rot …)
  const bands: Array<[number, number]> = [
    [0.02, 0.4],
    [0.58, 1.0],
    [0.26, 0.66],
    [0.45, 0.92],
    [0.1, 0.55],
    [0.7, 1.0],
  ];
  return { form, seed: hash32('grand-tree', seed, index), height: h * size, crown: c * size, tones: bands[(index + (seed % 3)) % bands.length]!, ...over };
}

/**
 * Standorte um den Riesenbaum: ein lockerer Ring (Abstand 1.8–2.7 Kronenradien vom Fuß), gleichmäßig verteilt mit
 * Versatz; Sektoren in `avoid` (z. B. Pfadanfang an der Wurzelspitze, Bodenast) bleiben frei. Ergebnis im Baumraum des
 * Riesenbaums (Fuß im Ursprung).
 */
export function layoutGrandTrees(o: { count: number; seed?: number; heroCrown?: number; minRadius?: number; maxRadius?: number; avoid?: Array<{ angle: number; width: number }> }): GrandTreeSite[] {
  const rand = mulberry32(hash32('grand-layout', o.seed ?? 7));
  const R = o.heroCrown ?? 15;
  const r0 = o.minRadius ?? R * 1.8;
  const r1 = o.maxRadius ?? R * 2.7;
  const n = Math.max(1, Math.min(6, Math.round(o.count)));
  const blocked = (a: number): boolean => (o.avoid ?? []).some((s) => Math.abs(wrapAngle(a - s.angle)) < s.width);
  // freie Winkel rundum (720 Schritte); die Bäume teilen sich den freien Bogen gleichmäßig (nie zwei hintereinander)
  const STEPS = 720;
  const free: number[] = [];
  const a0 = rand() * Math.PI * 2;
  for (let k = 0; k < STEPS; k++) {
    const a = a0 + (k / STEPS) * Math.PI * 2;
    if (!blocked(a)) free.push(a);
  }
  if (free.length === 0) for (let k = 0; k < STEPS; k++) free.push(a0 + (k / STEPS) * Math.PI * 2);
  const sites: GrandTreeSite[] = [];
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5 + (rand() - 0.5) * 0.35) / n;
    const ang = free[Math.min(free.length - 1, Math.max(0, Math.floor(f * free.length)))]!;
    // abwechselnd näher und weiter (Tiefe statt Kranz)
    const t = i % 2 === 0 ? rand() * 0.45 : 0.55 + rand() * 0.45;
    const rho = r0 + (r1 - r0) * t;
    sites.push({ x: Math.cos(ang) * rho, z: Math.sin(ang) * rho, yaw: rand() * Math.PI * 2 });
  }
  return sites;
}

interface GrandShapeData {
  trunk: TrunkProfile;
  limbs: Limb[];
  twigs: Twig[];
  needles: NeedleSite[];
  domes: Dome[];
  /** Kronenmitte (für das Licht der Schleier-Zweige) und Gipfelhöhe. */
  centre: Vector3;
  top: number;
}

/**
 * Reine Form eines Geschwisters im eigenen Raum (Fuß im Ursprung): Stamm (trunkProfile wie der Riesenbaum), Kuppeln in
 * Kränzen auf einer Hüllkuppel, Tragäste zu den Randkuppeln, Fontänenarme, dendritische Gabeln, Schleier und Nadeln.
 */
function grandShape(spec: GrandTreeSpec, groundAt: (x: number, z: number) => number, quality: GrandQuality): GrandShapeData {
  const rand = mulberry32(hash32('grand-shape', spec.seed));
  const mobil = quality === 'mobil';
  const form = spec.form;
  const H = spec.height;
  const R = spec.crown;
  const u = R / 15; // Maßstab relativ zum Riesenbaum (Schrittweiten, Zweigstärken)
  const fountain = form === 'fontaene';
  const trunk = trunkProfile({
    height: H,
    baseRadius: R * (fountain ? 0.3 : 0.21),
    topRadius: R * (fountain ? 0.19 : 0.14),
    flare: 0.45,
    twist: 1.1 + rand() * 1.6,
    lobes: 5 + Math.floor(rand() * 2.99),
    lean: R * (0.07 + rand() * 0.09),
    rings: mobil ? 30 : 46,
    segments: mobil ? 20 : 30,
    rootCount: 5 + Math.floor(rand() * 2.99),
    rootLength: R * 0.62,
    groundAt,
    seed: spec.seed,
  });
  const c0 = trunk.axisAt(H, new Vector3());
  const cx = c0.x;
  const cz = c0.z;
  const at = (ang: number, rho: number, y: number): Vector3 => new Vector3(cx + Math.cos(ang) * rho, y, cz + Math.sin(ang) * rho);

  // --- Hülle und Kuppeln ---------------------------------------------------------------------------------------
  const env: Record<GrandForm, { floor: number; top: number; re: number; tiers: number[]; r: [number, number]; sy: [number, number] }> = {
    kuppel: { floor: 0.45, top: 1.22, re: 0.95, tiers: [0.92, 0.64, 0.36], r: [0.2, 0.29], sy: [0.56, 0.7] },
    schirm: { floor: 0.2, top: 0.66, re: 1.22, tiers: [0.95, 0.72, 0.48, 0.22], r: [0.2, 0.26], sy: [0.44, 0.56] },
    pagode: { floor: 0.35, top: 2.1, re: 0.64, tiers: [0.95, 0.72, 0.5, 0.28], r: [0.3, 0.38], sy: [0.58, 0.7] },
    fontaene: { floor: 0.5, top: 1.05, re: 0.55, tiers: [0.85, 0.42], r: [0.26, 0.34], sy: [0.6, 0.72] },
  };
  const E = env[form];
  const yFloor = H + E.floor * R;
  const crownTop = H + E.top * R;
  const Re = E.re * R;
  const yBase = yFloor + 0.24 * R;
  const yEnv = (rho: number): number => yBase + (crownTop - yBase) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, rho / Re), 2)), form === 'pagode' ? 0.55 : 0.8);
  const domes: Dome[] = [];
  const addDome = (center: Vector3, r: number, sy: number, cluster: number): void => {
    domes.push({ center, r, sy, rank: 0, hash: rand(), cluster, tone: 0, path: false });
  };
  const overlaps = (c: Vector3, r: number, k: number): boolean => {
    for (const d of domes) {
      const dh = Math.hypot(c.x - d.center.x, c.z - d.center.z);
      const dv = Math.abs(c.y - d.center.y) * 1.6;
      if (Math.hypot(dh, dv) < (r + d.r) * k) return true;
    }
    return false;
  };
  const envNormal = (rho: number): { nh: number; ny: number } => {
    const e = 0.05;
    const dy = (yEnv(Math.min(Re, rho + e)) - yEnv(Math.max(0, rho - e))) / (2 * e);
    const l = Math.hypot(dy, 1);
    return { nh: -dy / l, ny: 1 / l };
  };
  // Scheitel
  addDome(at(0, 0, crownTop - R * 0.3 * 0.7), R * (form === 'pagode' ? 0.34 : 0.3), 0.7, 4);
  // Kränze von außen nach innen (Pagode: jeder Kranz ein Stockwerk höher)
  const phase = rand() * Math.PI * 2;
  E.tiers.forEach((f, ti) => {
    const rho = f * Re;
    const r = R * (E.r[0] + (E.r[1] - E.r[0]) * rand()) * (1 + 0.25 * (1 - f));
    const n = Math.max(3, Math.round((Math.PI * 2 * rho) / (r * 1.45)));
    const en = envNormal(rho);
    for (let k = 0; k < n; k++) {
      const a = phase + ti * 0.9 + (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.35;
      const rr = r * (0.9 + 0.2 * rand());
      const sy = E.sy[0] + (E.sy[1] - E.sy[0]) * rand();
      const top = yEnv(rho) + (rand() - 0.4) * 0.5 * u;
      const c = at(a, rho - en.nh * rr * 0.3, top - rr * sy * (0.74 + 0.26 * en.ny));
      if (overlaps(c, rr, 0.5)) continue;
      addDome(c, rr, sy, 1 + Math.min(2, ti));
    }
  });
  // Boden der Krone: flache Kuppeln unter dem Haufen (von unten eine dunkle Masse auf den Ästen, nichts schwebt)
  {
    const count = form === 'schirm' ? 8 : 5;
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = a0 + (i / count) * Math.PI * 2;
      addDome(at(a, Re * (0.35 + 0.18 * rand()), yFloor + R * 0.1), R * (0.3 + 0.05 * rand()) * (form === 'pagode' ? 0.75 : 1), 0.36 + 0.06 * rand(), 5);
    }
    addDome(at(0, 0, yFloor + R * 0.12), R * (form === 'pagode' ? 0.34 : 0.42), 0.38, 5);
  }
  // Trabanten hängen tiefer am Rand (gezackter Unterrand wie Bild 02)
  if (form !== 'pagode') {
    const count = Math.round(domes.length * 0.28);
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = a0 + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.3;
      const r = R * (0.13 + 0.07 * rand());
      const c = at(a, Re * (0.88 + 0.1 * rand()), yFloor + R * (0.0 + 0.08 * rand()));
      if (!overlaps(c, r, 0.45)) addDome(c, r, 0.66 + 0.14 * rand(), 0);
    }
  }
  // Rang (Wachstum innen → außen) und Ton (kühler Rand → warmer Scheitel, Flecken) im Farbband des Baums
  for (const d of domes) {
    const rho = Math.hypot(d.center.x - cx, d.center.z - cz);
    d.rank = Math.min(1, rho / (R * 1.1));
    const h = Math.min(1, Math.max(0, (d.center.y + d.r * d.sy - yFloor) / Math.max(1e-3, crownTop - yFloor)));
    const ang = Math.atan2(d.center.z - cz, d.center.x - cx);
    const t = Math.min(1, Math.max(0, 0.78 * h + 0.18 * Math.sin(ang * 1.5 + spec.seed * 0.001 + h * 2.2) + (d.hash - 0.5) * 0.4));
    d.tone = spec.tones[0] + (spec.tones[1] - spec.tones[0]) * t;
  }
  const insideCanopy = (p: Vector3, pad: number): boolean => {
    for (const d of domes) {
      const rh = d.r + pad;
      const rv = d.r * d.sy + pad;
      if (((p.x - d.center.x) / rh) ** 2 + ((p.y - d.center.y) / rv) ** 2 + ((p.z - d.center.z) / rh) ** 2 < 1) return true;
    }
    return false;
  };

  // --- Äste ------------------------------------------------------------------------------------------------------
  const limbs: Limb[] = [];
  const step = Math.max(0.16, 0.45 * u);
  const limbTube = (ctrl: Vector3[], r0: number, rTip: number, collar = 0.5): TubeCurve =>
    makeTube(ctrl, step, (t, s) => (rTip + (r0 - rTip) * Math.pow(1 - t, 1.05)) * (1 + collar * Math.exp(-s / (1.6 * u))));
  const axis = (y: number): Vector3 => trunk.axisAt(y, new Vector3());
  // Tragäste: aus der Gabel steil hinauf, dann zu den Randkuppeln und etwas darüber hinaus (leicht hängend)
  const rim = domes.filter((d) => d.cluster === 1 || d.cluster === 0);
  const nSupport = form === 'schirm' ? 7 : form === 'pagode' ? 4 : form === 'fontaene' ? 3 : 5;
  const a0 = rand() * Math.PI * 2;
  for (let i = 0; i < nSupport; i++) {
    const ang0 = a0 + ((i + 0.5) / nSupport) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    let pick: Dome | null = null;
    let best = Infinity;
    for (const d of rim) {
      const da = Math.abs(wrapAngle(Math.atan2(d.center.z - cz, d.center.x - cx) - ang0));
      if (da < best) {
        best = da;
        pick = d;
      }
    }
    const ang = pick && best < 0.5 ? Math.atan2(pick.center.z - cz, pick.center.x - cx) : ang0;
    const aRho = pick && best < 0.5 ? Math.hypot(pick.center.x - cx, pick.center.z - cz) : Re * 0.8;
    const aY = pick && best < 0.5 ? pick.center.y - pick.r * pick.sy * 0.3 : yBase;
    const yb = H * (0.86 + 0.12 * rand());
    const b = axis(yb);
    const rT = trunk.surfaceAt(yb, ang0);
    const ctrl = [
      b.clone().addScaledVector(dirH(ang0), rT * 0.3).add(new Vector3(0, -1.0 * u, 0)),
      axis(Math.min(H + 1.4 * u, yb + 2.4 * u))
        .addScaledVector(dirH(ang0), rT * 0.8)
        .add(new Vector3(0, 0.6 * u, 0)),
      at(ang + (rand() - 0.5) * 0.3, aRho * 0.42, yb + (aY - yb) * (0.7 + 0.12 * rand())),
      at(ang, aRho, aY),
      at(ang + 0.06, aRho + R * 0.16, aY - R * 0.05),
      at(ang + 0.1, aRho + R * 0.27, aY - R * (0.16 + 0.1 * rand())),
    ];
    limbs.push({ curve: limbTube(ctrl, rT * 0.5, 0.2 * u), kind: 'support', level: 1, hash: rand(), exposedFrom: 0 });
  }
  // Fontänenarme (Bild 04): aus dem Stamm unter der Krone kurz hinauf, dann in langen Bögen hinaus und hinab
  const nArms = form === 'fontaene' ? 7 : form === 'kuppel' ? 4 : form === 'schirm' ? 2 : 0;
  const armA0 = rand() * Math.PI * 2;
  for (let i = 0; i < nArms; i++) {
    const ang = armA0 + (i / nArms) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    const yb = H * (fountain ? 0.62 + 0.3 * rand() : 0.5 + 0.28 * rand());
    const b = axis(yb);
    const rT = trunk.surfaceAt(yb, ang);
    const reach = fountain ? 1.25 + 0.35 * rand() : 1.3 + 0.2 * rand();
    const sway = (i % 2 === 0 ? 1 : -1) * (0.08 + 0.12 * rand());
    const lift = R * (fountain ? 0.35 + 0.2 * rand() : 0.22 + 0.12 * rand());
    const tipRho = R * reach;
    // die Fontäne fällt tief (fast zum Boden), die anderen enden auf halber Stammhöhe
    const tipY = groundAt(cx + Math.cos(ang) * tipRho, cz + Math.sin(ang) * tipRho) + H * (fountain ? 0.06 + 0.16 * rand() : 0.45 + 0.2 * rand());
    const ctrl = [
      b.clone().addScaledVector(dirH(ang), rT * 0.3).add(new Vector3(0, -0.6 * u, 0)),
      b.clone().addScaledVector(dirH(ang), rT + 1.2 * u).add(new Vector3(0, 1.4 * u, 0)),
      at(ang + sway * 0.3, tipRho * 0.4, yb + lift),
      at(ang + sway * 0.7, tipRho * 0.68, yb + lift * 0.85),
      at(ang + sway, tipRho * 0.88, yb + lift * 0.1),
      at(ang + sway * 1.2, tipRho, tipY),
    ];
    limbs.push({ curve: limbTube(ctrl, rT * (fountain ? 0.46 : 0.36), 0.14 * u, 0.5), kind: 'free', level: 1, hash: rand(), exposedFrom: 0 });
  }
  // Leittrieb: aus der Gabel in den Boden der Krone
  {
    const b = axis(H * 0.9);
    const ctrl = [b.clone(), b.clone().add(new Vector3(0.3 * u, 2.5 * u, 0.2 * u)), at(0.7, R * 0.1, yFloor - R * 0.05), at(1.1, R * 0.06, yFloor + R * 0.2)];
    limbs.push({ curve: limbTube(ctrl, trunk.topRadius * 0.7, 0.4 * u, 0.2), kind: 'leader', level: 1, hash: rand(), exposedFrom: 0 });
  }
  for (const l of limbs) {
    const c = l.curve;
    let from = 0;
    for (let i = 0; i < c.points.length; i++) if (insideCanopy(c.points[i]!, 0.2 * u)) from = c.lengths[i]!;
    l.exposedFrom = from;
  }
  // Gabeln (Bild 04): der freie Teil jedes Asts gabelt sich zu einer dendritischen Hand
  const nLimbs = limbs.length;
  const fork = (start: Vector3, dir: Vector3, r0: number, len: number, depth: number): void => {
    const ctrl = [start.clone()];
    const d = dir.clone().normalize();
    let p = start.clone();
    const bend = (rand() - 0.5) * 0.5;
    for (let k = 1; k <= 3; k++) {
      d.applyAxisAngle(UP, bend * 0.35)
        .addScaledVector(DOWN, 0.1 + 0.07 * k + 0.05 * depth)
        .normalize();
      p = p.clone().addScaledVector(d, (len / 3) * (0.85 + 0.3 * rand()));
      ctrl.push(p);
    }
    const tipR = Math.max(0.04 * u, r0 * 0.35);
    const curve = makeTube(ctrl, step * 0.8, (t) => tipR + (r0 - tipR) * Math.pow(1 - t, 1.1));
    limbs.push({ curve, kind: 'branch', level: 2, hash: rand(), exposedFrom: 0 });
    if (depth >= 2 || r0 < 0.16 * u) return;
    const clen = tubeLength(curve);
    const kids = depth === 0 ? 2 : 1 + (rand() < 0.6 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const s = clen * (kids === 1 ? 0.55 + 0.2 * rand() : 0.4 + 0.35 * k + 0.1 * rand());
      const q = tubePointAt(curve, s, new Vector3());
      const t = tubeTangentAt(curve, s, new Vector3());
      const sign = (k + depth) % 2 === 0 ? 1 : -1;
      const cd = t
        .clone()
        .applyAxisAngle(UP, sign * (0.45 + 0.35 * rand()))
        .addScaledVector(DOWN, 0.15)
        .normalize();
      fork(q, cd, tubeRadiusAt(curve, s) * 0.72, len * (0.55 + 0.15 * rand()), depth + 1);
    }
  };
  for (let li = 0; li < nLimbs; li++) {
    const l = limbs[li]!;
    if (l.kind === 'leader') continue;
    const c = l.curve;
    const len = tubeLength(c);
    const from = Math.max(l.exposedFrom, len * (l.kind === 'free' ? 0.42 : 0.55));
    const count = l.kind === 'free' ? 3 : 2;
    for (let k = 0; k < count; k++) {
      const s = from + ((k + 0.5 + (rand() - 0.5) * 0.3) / count) * (len - from) * 0.92;
      const p = tubePointAt(c, s, new Vector3());
      if (insideCanopy(p, 0.3 * u)) continue;
      const t = tubeTangentAt(c, s, new Vector3());
      const sign = k % 2 === 0 ? 1 : -1;
      const dir0 = t
        .clone()
        .applyAxisAngle(UP, sign * (0.5 + 0.3 * rand()))
        .add(new Vector3(0, 0.12, 0))
        .normalize();
      const r0 = tubeRadiusAt(c, s) * (0.6 + 0.1 * rand());
      fork(p.clone().addScaledVector(dir0, -r0 * 0.4), dir0, r0, R * (0.2 + 0.1 * rand()), 0);
    }
  }

  // --- Schleier und Nadeln (Bild 04) -----------------------------------------------------------------------------
  const twigs: Twig[] = [];
  const needles: NeedleSite[] = [];
  const cap = mobil ? 320 : 640;
  const hang = (start: Vector3, out: Vector3, length: number, r0: number, rank: number, order: number, depth: number): void => {
    if (twigs.length >= cap) return;
    const segs = depth === 0 ? 6 : 3;
    let p = start.clone();
    const d = out.clone().normalize();
    const segLen = length / segs;
    let r = r0;
    for (let k = 0; k < segs; k++) {
      d.lerp(DOWN, 0.34 + 0.08 * k).normalize();
      d.x += (rand() - 0.5) * 0.22;
      d.z += (rand() - 0.5) * 0.22;
      d.normalize();
      const q = p.clone().addScaledVector(d, segLen * (0.85 + 0.3 * rand()));
      const r1 = r * 0.8;
      twigs.push({ a: p, b: q, r0: r, r1, rank, order });
      if (depth === 0 && (k === 1 || k === 3 || k === 4) && rand() < 0.7) {
        const side = new Vector3()
          .crossVectors(d, UP)
          .normalize()
          .multiplyScalar(rand() < 0.5 ? -1 : 1);
        hang(q, d.clone().addScaledVector(side, 1.0), length * (0.4 + 0.2 * rand()), r1 * 0.8, rank, Math.min(2, order + 1), depth + 1);
        if (rand() < (fountain ? 0.4 : 0.22)) needles.push({ pos: q.clone(), normal: out.clone().setY(0).normalize(), size: R * (0.02 + 0.012 * rand()), rank, order: order + 1 });
      }
      p = q;
      r = r1;
    }
    if (depth > 0 || rand() < (fountain ? 0.85 : 0.6)) needles.push({ pos: p.clone(), normal: out.clone().setY(0).normalize(), size: R * (0.026 + 0.02 * rand()), rank, order });
  };
  const wood = limbs.filter((l) => l.kind !== 'leader');
  for (const l of wood) {
    const c = l.curve;
    const len = tubeLength(c);
    const from = l.level === 2 ? len * 0.2 : Math.max(l.exposedFrom, len * 0.5);
    const stepT = (l.level === 2 ? 0.5 : 0.9) * u * (fountain ? 0.75 : 1);
    for (let s = from; s < len; s += stepT * (0.8 + 0.4 * rand())) {
      const p = tubePointAt(c, s, new Vector3());
      if (insideCanopy(p, 0.1 * u)) continue;
      const t = tubeTangentAt(c, s, new Vector3());
      const rad = tubeRadiusAt(c, s);
      const outward = new Vector3(p.x - cx, 0, p.z - cz).normalize();
      const side = new Vector3()
        .crossVectors(t, UP)
        .normalize()
        .multiplyScalar(rand() < 0.5 ? -1 : 1);
      const o2 = outward.clone().multiplyScalar(0.55).addScaledVector(side, 0.55).addScaledVector(t, 0.25).normalize();
      const start = p.clone().addScaledVector(DOWN, rad * 0.6);
      hang(start, o2, R * (0.22 + 0.26 * rand()) * (fountain ? 1.3 : 1), Math.min(0.07 * u, rad * 0.35), Math.min(1, Math.hypot(p.x - cx, p.z - cz) / (R * 1.4)), 0, 0);
    }
  }
  // Randfransen: Schleier unter dem Kronenrand
  for (const d of domes) {
    const rho = Math.hypot(d.center.x - cx, d.center.z - cz);
    if (rho < Re * 0.62 || d.cluster === 5) continue;
    for (let j = 0; j < (form === 'schirm' ? 3 : 2); j++) {
      const a = Math.atan2(d.center.z - cz, d.center.x - cx) + (rand() - 0.5) * 1.4;
      const p = d.center.clone().addScaledVector(dirH(a), d.r * (0.5 + 0.3 * rand()));
      p.y = d.center.y - d.r * d.sy * 0.55;
      hang(p, dirH(a).multiplyScalar(0.5).add(new Vector3(0, -0.35, 0)), R * (0.18 + 0.2 * rand()) * (form === 'schirm' ? 1.35 : 1), 0.06 * u, Math.min(1, rho / (R * 1.2)), 0, 0);
    }
  }
  // Nadeln entlang der freien Astrücken
  for (const l of wood) {
    if (l.level !== 1) continue;
    const c = l.curve;
    const len = tubeLength(c);
    for (let s = Math.max(l.exposedFrom, len * 0.5); s < len; s += (2 + rand() * 1.5) * u) {
      const p = tubePointAt(c, s, new Vector3());
      p.y += tubeRadiusAt(c, s) * 0.9;
      needles.push({ pos: p, normal: new Vector3(p.x - cx, 0.4 * R, p.z - cz).normalize(), size: R * (0.026 + 0.016 * rand()), rank: Math.min(1, Math.hypot(p.x - cx, p.z - cz) / (R * 1.4)), order: 0 });
    }
  }
  let top = crownTop;
  for (const d of domes) top = Math.max(top, d.center.y + d.r * d.sy);
  return { trunk, limbs, twigs, needles, domes, centre: new Vector3(cx, crownTop, cz), top };
}

/** Holz-Geometrien mit denselben Attributen zu einem Mesh zusammenfügen (Indizes verschoben). */
function mergeWood(parts: BufferGeometry[]): BufferGeometry {
  const first = parts[0]!;
  const names = Object.keys(first.attributes);
  const out = new BufferGeometry();
  for (const name of names) {
    const size = first.getAttribute(name).itemSize;
    let n = 0;
    for (const g of parts) n += g.getAttribute(name).count * size;
    const arr = new Float32Array(n);
    let o = 0;
    for (const g of parts) {
      const a = g.getAttribute(name).array as Float32Array;
      arr.set(a, o);
      o += a.length;
    }
    out.setAttribute(name, new BufferAttribute(arr, size));
  }
  let total = 0;
  for (const g of parts) total += g.getIndex()!.count;
  const idx = new Uint32Array(total);
  let o = 0;
  let base = 0;
  for (const g of parts) {
    const index = g.getIndex()!;
    for (let i = 0; i < index.count; i++) idx[o++] = index.getX(i) + base;
    base += g.getAttribute('position').count;
  }
  out.setIndex(new Uint32BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

const _m3 = new Matrix3();
const _cam = new Vector3();
const _inv = new Matrix4();
const _c = new Vector3();

/**
 * Baut eine Gruppe von Geschwistern an den Standorten `sites` (gemeinsamer Raum, Fuß auf `groundAt`). Formen aus
 * `grandSpec(i, seed, site.spec)`. 5 Draw Calls für die ganze Gruppe (Holz, Kuppeln, Randpunkte, Schleier, Sterne).
 */
export function createGrandTrees(o: GrandTreesOptions): GrandTrees {
  const quality: GrandQuality = o.quality ?? 'hoch';
  const mobil = quality === 'mobil';
  const seed = o.seed ?? 7;
  const groundCommon = o.groundAt ?? (() => 0);
  const shared = o.atlas && o.atlas.rowCount + TREE_PALETTE_ROWS <= o.atlas.height ? o.atlas : null;
  const atlas = o.rows && o.lookup ? null : (shared ?? new PaletteAtlas());
  const lookup = o.rows && o.lookup ? o.lookup : shared ? (o.lookup ?? new PaletteLookup(atlas!.texture, atlas!.width, atlas!.height)) : new PaletteLookup(atlas!.texture, atlas!.width, atlas!.height);
  const rows = o.rows ?? addTreePalette(atlas!);
  const fog = o.fog ?? createFogSettings({ row: rows.nofog, steps: 2, start: 1e6, range: 1 });
  const fogLookup = o.fog ? (o.fogLookup ?? lookup) : lookup;
  const ownsAtlas = !o.rows && !shared && atlas !== null;
  const bb: BillboardUniforms = o.billboard ?? {
    camRight: uniform(new Vector3(1, 0, 0)),
    camUp: uniform(new Vector3(0, 1, 0)),
    projScaleY: uniform(1),
    sunDirWorld: uniform(new Vector3(0, 1, 0)),
    collapsePx: uniform(mobil ? 1.2 : 0.8),
    crown: uniform(1),
    clock: uniform(0),
  };
  const ownsBillboard = !o.billboard;

  // --- Formen je Standort, in den gemeinsamen Raum gesetzt ---------------------------------------------------------
  const specs: GrandTreeSpec[] = [];
  const feet: Vector3[] = [];
  const tops: number[] = [];
  const woodParts: BufferGeometry[] = [];
  const domes: Dome[] = [];
  const twigs: Twig[] = [];
  const twigCentre: Vector3[] = [];
  const needles: NeedleSite[] = [];
  const bounds = new Box3();
  o.sites.forEach((site, i) => {
    const spec = grandSpec(i, seed, site.spec);
    specs.push(spec);
    const y0 = groundCommon(site.x, site.z);
    const yaw = site.yaw ?? 0;
    const T = new Matrix4().makeRotationY(yaw).setPosition(site.x, y0, site.z);
    const p = new Vector3();
    // Boden im eigenen Raum: gemeinsamer Boden unter dem gedrehten Punkt, relativ zum Fuß
    const groundLocal = (x: number, z: number): number => {
      p.set(x, 0, z).applyMatrix4(T);
      return groundCommon(p.x, p.z) - y0;
    };
    const s = grandShape(spec, groundLocal, quality);
    const shape = { seed: spec.seed, trunk: s.trunk, limbs: s.limbs, plan: { startAngle: (spec.seed % 628) / 100 } } as unknown as TreeShape;
    const wood = buildWood(shape, { quality, snow: o.snow ?? 1 });
    wood.geometry.applyMatrix4(T);
    woodParts.push(wood.geometry);
    const centre = s.centre.clone().applyMatrix4(T);
    for (const d of s.domes) {
      d.center.applyMatrix4(T);
      domes.push(d);
    }
    // Aufeinanderfolgende Zweigstücke teilen ihre Endpunkte (b des einen = a des nächsten): kopieren, nie doppelt drehen
    for (const t of s.twigs) {
      twigs.push({ ...t, a: t.a.clone().applyMatrix4(T), b: t.b.clone().applyMatrix4(T) });
      twigCentre.push(centre);
    }
    _m3.setFromMatrix4(T);
    for (const n of s.needles) {
      n.pos.applyMatrix4(T);
      n.normal.applyMatrix3(_m3).normalize();
      needles.push(n);
    }
    feet.push(new Vector3(site.x, y0, site.z));
    tops.push(s.top);
    const reach = spec.crown * (spec.form === 'schirm' ? 1.6 : 1.7);
    bounds.expandByPoint(new Vector3(site.x - reach, y0 - 3, site.z - reach));
    bounds.expandByPoint(new Vector3(site.x + reach, y0 + s.top + 1, site.z + reach));
  });
  // Schleier und Sterne: Rangfolge wie beim Riesenbaum (Hauptzweige zuerst → Detailstufe über den Anteil)
  const twigOrder = twigs.map((_, i) => i).sort((a, b) => twigs[a]!.order - twigs[b]!.order);
  const twigsSorted = twigOrder.map((i) => twigs[i]!);
  const centreSorted = twigOrder.map((i) => twigCentre[i]!);
  needles.sort((a, b) => a.order - b.order);
  const woodGeometry = mergeWood(woodParts);
  for (const g of woodParts) g.dispose();

  const group = new Group();
  group.name = 'GrandTrees';
  const disposables: Array<() => void> = [];
  const snow: TSLUniform = uniform(Math.min(1, Math.max(0, o.snow ?? 1)));

  // --- Holz: ein Mesh für alle Stämme, Wurzeln, Äste, Wehen ------------------------------------------------------
  const woodMaterial = new InkMaterial({
    shade: createBarkShade({
      lookup,
      rows: { bark: rows.bark, snow: rows.snow, jewel: rows.jewel },
      bark: attribute('bark', 'vec2') as unknown as Vec2Node,
      circumference: attribute('barkCirc', 'float') as unknown as FloatNode,
      wood: attribute('wood', 'vec4') as unknown as Vec4Node,
      normal: normalLocal as unknown as Vec3Node,
      snowBase: attribute('snowBase', 'float') as unknown as FloatNode,
      position: positionGeometry as unknown as Vec3Node,
      snow,
      style: o.bark ?? 'ink',
      quality,
      seed,
    }),
    terminator: 0.02,
    fog,
    lookup: fogLookup,
    ...(o.warp ? { positionNode: o.warp(positionLocal as unknown as Vec3Node) } : {}),
  });
  const woodMesh = new Mesh(woodGeometry, woodMaterial);
  woodMesh.name = 'grand-wood';
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;
  woodMesh.frustumCulled = false;
  group.add(woodMesh);
  disposables.push(() => {
    woodGeometry.dispose();
    woodMaterial.dispose();
  });

  // --- Kuppeln aller Geschwister in einer Instanz (Farbband je Baum über den Ton) ------------------------------------
  const canopy = createCanopy({
    domes,
    lookup,
    fog,
    fogLookup,
    rows: { domes: rows.domes, motif: rows.motif },
    bands: uniform(3),
    family: 'jewel',
    quality: mobil ? { dotsPerDome: [30, 110], sphere: [18, 12], flowers: true } : { dotsPerDome: [70, 240], sphere: [28, 18], flowers: true },
    bb,
    seed,
    ...(o.warp ? { warp: o.warp } : {}),
  });
  group.add(canopy.domes, canopy.dots);
  disposables.push(canopy.dispose);

  // --- Schleier und Sterne ---------------------------------------------------------------------------------------
  const warpOpt = o.warp ? { warp: o.warp } : {};
  const lace: CountLodMesh = createLaceMesh({ twigs: twigsSorted, lookup, fog, fogLookup, laceRow: rows.lace, bb, centre: new Vector3(), ...warpOpt });
  // Licht der Zweige: Außenrichtung je Zweig von der Krone SEINES Baums (nicht von der Gruppenmitte)
  {
    const data = lace.mesh.geometry.getAttribute('twigData') as InstancedBufferAttribute;
    twigsSorted.forEach((t, i) => {
      const c = centreSorted[i]!;
      data.setW(i, Math.atan2(t.a.z - c.z, t.a.x - c.x));
    });
    data.needsUpdate = true;
  }
  const stars = createStarMesh({ stars: needles, rays: mobil ? 12 : 18, lookup, fog, fogLookup, starRow: rows.star, bb, seed, ...warpOpt });
  group.add(lace.mesh, stars.mesh);
  disposables.push(lace.dispose, stars.dispose);
  lace.mesh.name = 'grand-lace';
  stars.mesh.name = 'grand-stars';
  canopy.domes.name = 'grand-domes';
  canopy.dots.name = 'grand-dots';

  // --- Detailstufe nach Bildschirmgröße (stetig) --------------------------------------------------------------------
  let detail = 1;
  let override: number | null = null;
  const applyDetail = (share: number): void => {
    detail = share;
    lace.setShare(Math.min(1, 0.35 + share * 0.65));
    stars.setShare(Math.min(1, 0.3 + share * 0.7));
    canopy.setDotShare(Math.min(1, 0.4 + share * 0.6));
  };
  applyDetail(1);
  const centreAll = bounds.getCenter(new Vector3());
  const sizeAll = bounds.getSize(new Vector3());
  const lastSort = new Vector3(Infinity, Infinity, Infinity);
  const maxTop = Math.max(1, ...tops);

  return {
    group,
    parts: { wood: woodMesh, domes: canopy.domes, dots: canopy.dots, lace: lace.mesh, stars: stars.mesh },
    shadowCasters: [woodMesh, canopy.domes],
    specs,
    feet,
    tops,
    bounds,
    stats: { trees: specs.length, domes: canopy.counts.domes, dots: canopy.counts.dots, twigs: lace.count, stars: stars.count, woodVertices: woodGeometry.getAttribute('position').count },
    billboard: bb,
    updateCamera: (camera) => {
      const e = camera.matrixWorld.elements;
      if (ownsBillboard) {
        bb.camRight.value.set(e[0]!, e[1]!, e[2]!).normalize();
        bb.camUp.value.set(e[4]!, e[5]!, e[6]!).normalize();
        bb.projScaleY.value = camera.projectionMatrix.elements[5]!;
      }
      group.updateWorldMatrix(true, false);
      _cam.set(e[12]!, e[13]!, e[14]!).applyMatrix4(_inv.copy(group.matrixWorld).invert());
      if (_cam.distanceToSquared(lastSort) > 1) {
        lastSort.copy(_cam);
        canopy.sortForCamera(_cam);
      }
      if (override === null) {
        // Bildanteil des höchsten Geschwisters aus dem Abstand zur Gruppe (wie beim Riesenbaum)
        const s = group.matrixWorld.getMaxScaleOnAxis();
        _c.copy(centreAll).applyMatrix4(group.matrixWorld);
        const dist = Math.max(1e-3, _c.distanceTo(_cam.set(e[12]!, e[13]!, e[14]!)) - Math.max(sizeAll.x, sizeAll.z) * 0.25 * s);
        const f = (maxTop * 0.55 * s * camera.projectionMatrix.elements[5]!) / dist;
        const share = Math.min(1, Math.max(0, (f - 0.12) / 0.7));
        if (Math.abs(share - detail) > 0.002) applyDetail(share);
      }
    },
    setSunDirection: (dir) => {
      if (ownsBillboard) bb.sunDirWorld.value.copy(dir).normalize();
    },
    update: (dt) => {
      if (ownsBillboard) bb.clock.value += dt;
    },
    setGrowth: (g) => {
      if (ownsBillboard) bb.crown.value = Math.min(1, Math.max(0, g));
    },
    setDetail: (share) => {
      override = share;
      if (share !== null) applyDetail(Math.min(1, Math.max(0, share)));
    },
    dispose: () => {
      for (const d of disposables) d();
      group.removeFromParent();
      if (ownsAtlas) atlas!.dispose();
    },
  };
}

/** Ein einzelnes Geschwister (Fuß im Ursprung) — Kurzform von `createGrandTrees` mit einem Standort. */
export function createGrandTree(seed: number, spec: Partial<GrandTreeSpec> = {}, options: Omit<GrandTreesOptions, 'sites' | 'seed'> = {}): GrandTrees {
  return createGrandTrees({ ...options, seed, sites: [{ x: 0, z: 0, spec }] });
}
