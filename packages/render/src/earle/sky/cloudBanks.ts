import { BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicNodeMaterial } from 'three/webgpu';
import type { Vector3 } from 'three/webgpu';
import { abs, attribute, clamp, cos, float, floor, fract, fwidth, max, mix, pow, sin, smoothstep, sqrt, uniform, vec3 } from 'three/tsl';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';

/**
 * Earles Wolkenbänke (Ebene 45, Welt 13): gewaltige, gestapelte Schichten mit flach abgeschnittener Unterseite und
 * blumenkohlartiger Oberkante; jede Schicht ein eigener Siebdruck: cremeweiße Köpfe, mintgrüne und türkise Mitte,
 * blaugraue bis lavendelfarbene Schattenunterseite — harte Stufen, in jeder Stufe ein eigener Verlauf nach innen. Dazu
 * flache, spitz auslaufende Wolkenstreifen (Linsenwolken) mit dunkler Unterseite.
 *
 * Himmel, keine Landschaft: die Schichten liegen auf einer Kuppel um die Kamera (Radius `radius`), ihre Höhen zählen
 * vom Horizont der Kugel (die Kugel-Anzeige hebt und senkt ihn mit der Kamerahöhe), ihr Azimut von der Blickachse des
 * Rigs. Deshalb stehen sie auf der Karte als Band über dem gebogenen Horizont und im Lab als Turm über dem Monolithen.
 * Welt-abhängig wie Himmel und Nebel: die Wolken der Blick-Welt blenden mit deren Überblendung ein und aus. Ein Mesh je
 * Welt mit Wolken (Aufruf je Mesh), ein geteiltes Material.
 */

/** Eine Wolkenschicht (Winkel in Grad). */
export interface CloudLayerSpec {
  /**
   * `bank` = Haufenbank (flacher Fuß, Blumenkohl-Kopf), `streak` = flacher Linsenstreifen, `dome` = einzelne Kuppel,
   * `wash` = flaches Himmelsband (tiefes Nachtblau oben im Bild, harte gewellte Unterkante, innen verlaufend).
   */
  kind?: 'bank' | 'streak' | 'dome' | 'wash';
  /** Azimut der Mitte, Grad von der Blickachse (+ = rechts). */
  az: number;
  /** Halbe Breite (Grad). */
  width: number;
  /** Fuß über dem Horizont (Grad). */
  el: number;
  /** Höhe des höchsten Kopfs (Grad). */
  height: number;
  /** Köpfe über die Breite (Standard nach Breite). */
  puffs?: number;
  /** Helligkeit 0 (Schatten, blau) … 1 (sonnig, creme); Standard 0.6. */
  tone?: number;
  /** Innere Kopfreihen (0–3, Standard 2 bei Bänken). */
  rows?: number;
  seed?: number;
}

export interface CloudBankSpec {
  layers: CloudLayerSpec[];
}

export interface CloudBanksOptions {
  lookup: PaletteLookup;
  /** Kuppelradius (innerhalb der Himmelskuppel, hinter allem Gelände). Standard 260. */
  radius?: number;
  /** Segmente je Schicht längs (Standard 28). */
  segments?: number;
}

const DEG = Math.PI / 180;
const KIND: Record<NonNullable<CloudLayerSpec['kind']>, number> = { bank: 0, streak: 1, dome: 2, wash: 3 };

/** Geometrie einer Wolkenwelt: je Schicht ein Streifen aus Quads (u längs, v hoch), Parameter je Vertex. */
export function cloudGeometry(spec: CloudBankSpec, segments = 28): BufferGeometry {
  const layers = spec.layers;
  const n = layers.length;
  const seg = Math.max(4, segments);
  const verts = n * (seg + 1) * 2;
  const a = new Float32Array(verts * 4);
  const b = new Float32Array(verts * 4);
  const c = new Float32Array(verts * 4);
  const pos = new Float32Array(verts * 3);
  const idx: number[] = [];
  let v = 0;
  layers.forEach((l, li) => {
    const kind = KIND[l.kind ?? 'bank'];
    const puffs = l.puffs ?? Math.max(2, Math.round(l.width / (kind === 1 ? 7 : 4.5)));
    const seed = l.seed ?? li * 0.618 + 0.13;
    const rows = l.rows ?? 0;
    const base = v;
    for (let i = 0; i <= seg; i++) {
      for (let j = 0; j < 2; j++) {
        const u = i / seg;
        a.set([u, j, l.az * DEG, l.width * DEG], v * 4);
        b.set([l.el * DEG, l.height * DEG, kind, seed], v * 4);
        c.set([l.tone ?? 0.6, puffs, rows, Math.min(0.45, l.width / puffs / Math.max(0.1, l.height))], v * 4);
        v++;
      }
    }
    for (let i = 0; i < seg; i++) {
      const p = base + i * 2;
      idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('cbA', new BufferAttribute(a, 4));
  g.setAttribute('cbB', new BufferAttribute(b, 4));
  g.setAttribute('cbC', new BufferAttribute(c, 4));
  g.setIndex(idx);
  return g;
}

/** Halbkreis-Profil 0..1 je Periode (Blumenkohl-Kopf). */
function scallop(t: FloatNode): FloatNode {
  const f = fract(t).mul(2).sub(1);
  return sqrt(max(float(0), float(1).sub(f.mul(f))));
}

/** Mischung wie Druckfarbe (√-Raum). */
function mixInk(a: Vec3Node, b: Vec3Node, t: FloatNode): Vec3Node {
  const s = mix(sqrt(a.max(0)), sqrt(b.max(0)), t);
  return s.mul(s) as unknown as Vec3Node;
}

/** Anti-aliasierte Stufe (1 px). */
function aa(edge: FloatNode, x: FloatNode): FloatNode {
  const w = fwidth(x).max(1e-5);
  return smoothstep(edge.sub(w), edge.add(w), x);
}

export class CloudBanks {
  readonly group = new Group();
  /** Elevation des Kugelhorizonts (Bogenmaß, negativ = unter der Waagrechten), je Frame vom Besitzer gesetzt. */
  readonly horizon = uniform(0);
  private readonly material: MeshBasicNodeMaterial;
  private readonly meshes = new Map<number, Mesh>();
  private readonly radius: number;
  private readonly segments: number;

  constructor(readonly options: CloudBanksOptions) {
    this.group.name = 'CloudBanks';
    this.radius = options.radius ?? 260;
    this.segments = options.segments ?? 28;
    const lookup = options.lookup;
    // Je Mesh (Welt): Palettenzeile der Wolken und Deckkraft
    const row = uniform(0).onObjectUpdate((frame) => (frame.object?.userData.cloudRow as number | undefined) ?? 0);
    const opacity = uniform(1).onObjectUpdate((frame) => (frame.object?.userData.cloudOpacity as number | undefined) ?? 0);
    const A = attribute('cbA', 'vec4');
    const B = attribute('cbB', 'vec4');
    const C = attribute('cbC', 'vec4');
    const u = A.x;
    const v = A.y;
    const R = this.radius;
    // --- Lage auf der Kuppel: Azimut von der Blickachse, Höhe vom Horizont ---------------------------------------
    const az = A.z.add(u.sub(0.5).mul(2).mul(A.w));
    const el = this.horizon.add(B.x).add(v.mul(B.y));
    const ce = cos(el);
    this.material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
    this.material.positionNode = vec3(ce.mul(sin(az)).mul(R), sin(el).mul(R), ce.mul(cos(az)).mul(-R));

    // --- Umriss ---------------------------------------------------------------------------------------------
    const kind = B.z;
    const seed = B.w;
    const tone = C.x;
    const puffs = C.y;
    const rows = C.z;
    // Arten als 0/1-Faktoren und `mix` statt `select`: TSL baut Knoten in `select`-Zweigen nur dort auf, andere Zweige
    // läsen dann alte Werte (siehe Fels-Material)
    const isStreak = clamp(float(1).sub(abs(kind.sub(1)).mul(2)), 0, 1);
    const isDome = clamp(float(1).sub(abs(kind.sub(2)).mul(2)), 0, 1);
    const isWash = clamp(float(1).sub(abs(kind.sub(3)).mul(2)), 0, 1);
    const x = u;
    const y = v;
    const ax = abs(x.mul(2).sub(1));
    // Hülle: Bank mit gerundeten Enden, Streifen spitz, Kuppel rund, Band fast gerade
    const envBank = pow(max(float(0), float(1).sub(pow(ax, float(2.4)))), float(0.5));
    const envStreak = max(float(0), float(1).sub(pow(ax, float(1.15))));
    const envDome = sqrt(max(float(0), float(1).sub(ax.mul(ax))));
    const env = mix(mix(envBank, envDome, isDome), envStreak, isStreak);
    // Köpfe: runde Halbkreise (Radius je Schicht in v-Einheiten, `cbC.w`), darauf kleinere Blumenkohl-Köpfe
    const rP = C.w;
    // Köpfe ungleich breit und hoch (Phase und Höhe langsam moduliert): große und kleine Ballen nebeneinander
    const warp = sin(x.mul(puffs.mul(0.63)).add(seed.mul(2.0))).mul(0.3);
    const ph1 = x.mul(puffs).add(seed.mul(3.7)).add(warp);
    const big = float(0.72).add(sin(x.mul(puffs.mul(0.41)).add(seed.mul(5.0))).mul(0.28));
    const s1 = scallop(ph1);
    const s2 = scallop(x.mul(puffs.mul(2.6)).add(seed.mul(5.3)).add(warp.mul(1.7)));
    const s3 = scallop(x.mul(puffs.mul(6.1)).add(seed.mul(1.9)));
    const cauli = s1.mul(rP.mul(big)).add(s2.mul(rP.mul(0.42))).add(s3.mul(rP.mul(0.18)));
    const base = env.mul(float(1).sub(rP.mul(1.15)));
    const bankCrest = base.add(cauli.mul(pow(env, float(0.35))));
    const streakCrest = env.mul(float(0.8).add(s3.mul(0.12)));
    const crest = mix(mix(bankCrest, streakCrest, isStreak), float(1), isWash);
    // Band: Unterkante leicht gewellt (harte Kante), sonst die ganze Schicht
    const washEdge = sin(x.mul(3.1).add(seed.mul(4.0))).mul(0.035).add(sin(x.mul(7.3).add(seed)).mul(0.01)).add(0.05);
    const bottom = mix(float(0.002), washEdge, isWash);
    const inside = aa(y, crest).mul(aa(bottom, y));
    // --- Werte: harte Stufen von oben nach unten, je Stufe ein Verlauf -------------------------------------
    // Abstand unter der Oberkante (0 = Kante, 1 = Fuß)
    const d = clamp(crest.sub(y).div(crest.max(1e-3)), 0, 1);
    // Jeder Kopf eine Kuppel: Kreis um (Mitte der Periode, Kopfsockel), Licht von rechts oben vorn
    const px = fract(ph1).mul(2).sub(1);
    const py = y.sub(base).div(rP.mul(big).max(1e-3));
    const r2 = px.mul(px).add(py.mul(py));
    const nz = sqrt(max(float(0), float(1).sub(r2)));
    const puffLight = clamp(px.mul(0.42).add(py.mul(0.72)).add(nz.mul(0.55)), -1, 1);
    const inPuff = smoothstep(1.0, 0.8, r2).mul(step01(py.add(0.35)));
    let value: FloatNode = float(1).sub(d.mul(1.1)).add(tone.sub(0.6).mul(0.45));
    value = mix(value, max(value, float(0.5).add(puffLight.mul(0.42)).add(tone.sub(0.6).mul(0.3))), inPuff.mul(0.85));
    // Innere Kopfreihen: helle Säume unter versetzten Kopfbögen, darunter ein schmaler Schatten (gestapelte Köpfe)
    const rowGap = float(0.3);
    const away = smoothstep(0.1, 0.35, s1);
    const k1 = crest.sub(rowGap).add(scallop(x.mul(puffs.mul(1.6)).add(seed.mul(2.3))).mul(rP.mul(0.7))).sub(rP.mul(0.35));
    const k2 = crest.sub(rowGap.mul(2)).add(scallop(x.mul(puffs.mul(2.1)).add(seed.mul(4.1))).mul(rP.mul(0.6))).sub(rP.mul(0.3));
    const rimW = rP.mul(0.35).max(0.03);
    const rim1 = aa(y, k1).mul(aa(k1.sub(rimW), y)).mul(step01(rows.sub(0.5)));
    const rim2 = aa(y, k2).mul(aa(k2.sub(rimW), y)).mul(step01(rows.sub(1.5)));
    const shade1 = aa(y, k1.sub(rimW)).mul(aa(k1.sub(rimW.mul(2.2)), y)).mul(step01(rows.sub(0.5)));
    value = max(value, rim1.mul(float(0.8).add(tone.mul(0.15)).sub(d.mul(0.2))).mul(away));
    value = max(value, rim2.mul(float(0.7).add(tone.mul(0.15)).sub(d.mul(0.2))).mul(away));
    value = value.sub(shade1.mul(0.12));
    // Streifen: obere Hälfte hell, untere dunkel (zwei Schichten)
    const upper = aa(crest.mul(0.48), y);
    const streakValue = mix(float(0.12), float(0.9).add(tone.mul(0.1)), upper);
    value = mix(value, streakValue, isStreak);
    // Stufen: 0 Tiefschatten, 1 Lavendel, 2 Türkis, 3 helles Türkis, 4 Mint, 5 Creme, 6 Hellcreme (Palette „cloud")
    const vb = clamp(value, 0, 0.999).mul(6);
    const i = floor(vb);
    const t = fract(vb);
    const pal = (k: FloatNode | number): Vec3Node => lookup.pal(k, row).rgb as unknown as Vec3Node;
    const lo = pal(i);
    const hi = pal(i.add(1).min(6));
    let color: Vec3Node = mixInk(lo, hi, t.mul(0.55));
    // dunkle Unterseite der Streifen (Stufe 7)
    const under = mixInk(pal(7), pal(1), clamp(y.div(crest.mul(0.48).max(1e-3)), 0, 1).mul(0.6));
    color = mix(color, under, isStreak.mul(upper.oneMinus())) as unknown as Vec3Node;
    // Himmelsband: Nachtblau (Stufe 7), zur Unterkante hin ein Stück Richtung Tiefschatten verlaufend
    const wash = mixInk(pal(7), pal(0), clamp(float(1).sub(y), 0, 1).mul(0.42));
    color = mix(color, wash, isWash) as unknown as Vec3Node;
    this.material.colorNode = color;
    this.material.opacityNode = inside.mul(opacity);
  }

  /** Mesh der Welt `id` (gebaut beim ersten Mal). */
  private meshFor(id: number, spec: CloudBankSpec): Mesh {
    let m = this.meshes.get(id);
    if (!m) {
      m = new Mesh(cloudGeometry(spec, this.segments), this.material);
      m.name = `clouds-${id}`;
      m.frustumCulled = false;
      m.castShadow = false;
      m.receiveShadow = false;
      m.renderOrder = -5;
      this.meshes.set(id, m);
      this.group.add(m);
    }
    return m;
  }

  /**
   * Je Frame: Wolken der Blick-Welten A und B (Überblendung t: 0 = A, 1 = B), Kamera im Raum des Besitzers (die Kuppel
   * folgt ihr, Richtungen bleiben am Rig), Horizont als sin der Elevation (wie `skyHorizon`).
   */
  update(a: { id: number; spec: CloudBankSpec | undefined; row: number } | null, b: { id: number; spec: CloudBankSpec | undefined; row: number } | null, t: number, camera: Vector3, horizonSin: number): void {
    this.group.position.copy(camera);
    this.horizon.value = Math.asin(Math.max(-1, Math.min(1, horizonSin)));
    const want = new Map<number, { opacity: number; row: number }>();
    const add = (w: typeof a, o: number) => {
      if (!w || !w.spec || w.spec.layers.length === 0 || o <= 0.001) return;
      const prev = want.get(w.id);
      want.set(w.id, { opacity: Math.min(1, (prev?.opacity ?? 0) + o), row: w.row });
      this.meshFor(w.id, w.spec);
    };
    add(a, a && b && a.id === b.id ? 1 : 1 - t);
    if (!(a && b && a.id === b.id)) add(b, t);
    for (const [id, m] of this.meshes) {
      const w = want.get(id);
      m.visible = !!w;
      if (w) {
        m.userData.cloudOpacity = w.opacity;
        m.userData.cloudRow = w.row;
      }
    }
    // Meshes fremder Welten nicht ewig halten
    if (this.meshes.size > 6) {
      for (const [id, m] of this.meshes) {
        if (want.has(id)) continue;
        m.geometry.dispose();
        m.removeFromParent();
        this.meshes.delete(id);
        if (this.meshes.size <= 4) break;
      }
    }
  }

  /** Alle Wolken-Meshes verwerfen (Weltdaten geändert, z. B. im Map-Editor); sie entstehen beim nächsten `update` neu. */
  reset(): void {
    for (const m of this.meshes.values()) {
      m.geometry.dispose();
      m.removeFromParent();
    }
    this.meshes.clear();
  }

  /** Zeichenaufrufe (Diagnose). */
  get visibleMeshes(): number {
    let n = 0;
    for (const m of this.meshes.values()) if (m.visible) n++;
    return n;
  }

  dispose(): void {
    for (const m of this.meshes.values()) m.geometry.dispose();
    this.meshes.clear();
    this.material.dispose();
    this.group.removeFromParent();
  }
}

/** Was `followViewClouds` von der Karte braucht (EarlePlanet). */
export interface CloudHost {
  readonly viewWorlds: { a: number; b: number; t: number };
  worldData(id: number): { clouds?: CloudBankSpec };
  rowsOfWorld(id: number): { cloud?: number };
}

/**
 * Wolken der Blick-Welten nachführen (Lab und Karte, einmal je Frame nach `setViewPoint`): `camera` = Kameraposition im
 * Raum des Rigs, an dem die Wolken hängen; `horizonSin` = sin der Horizont-Elevation (wie `skyHorizon`).
 */
export function followViewClouds(clouds: CloudBanks, host: CloudHost, camera: Vector3, horizonSin: number): void {
  const { a, b, t } = host.viewWorlds;
  const wa = host.worldData(a).clouds;
  const wb = host.worldData(b).clouds;
  clouds.update(
    wa ? { id: a, spec: wa, row: host.rowsOfWorld(a).cloud ?? 0 } : null,
    wb ? { id: b, spec: wb, row: host.rowsOfWorld(b).cloud ?? 0 } : null,
    t,
    camera,
    horizonSin,
  );
}

/** 1 ab 0 (Stufe für Zählwerte). */
function step01(x: FloatNode): FloatNode {
  return clamp(x.mul(1e4), 0, 1);
}

