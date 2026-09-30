import type { Vec3 } from '../capPatch';
import { hash32, mulberry32 } from '../rng';
import { HEAL_SPAN, DEBRIS_SHAPE, NEVER_HEALS, VENT_CHIMNEY_SHAPE, type DebrisKind, type TrashItem, type TrashKind, type TrashSpec, type VeilSpore } from '../trash/types';
import { CHUNK_SIZE } from './chunks';
import type { PlaneField } from './field';
import { GradientNoise2, smoothstep } from './noise2';

/**
 * Müll v2 auf der unendlichen Ebene (ADR 0002): dieselbe Platzierung wie auf dem alten Planeten — Müllberge und Ruinen
 * weit vom Pfad, Kleinteile in Verwehungen längs der Höhenlinien, Schutt am Fuß der Berge, Neon-Pfützen in Senken,
 * Gasquellen, Schleier-Gitter und schwebende Sporen —, je Ebenen-Chunk (16 × 16) deterministisch. Heilschwellen folgen
 * dem nächsten Punkt des endgültigen Levelpfads; die Heilung einer Welt endet mit ihrem letzten Level.
 * Positionen in Ebenenkoordinaten `[x, h, z]`.
 */

/** Ein Knoten des endgültigen Levelpfads (für Heilung und Freiraum). */
export interface PlaneTrashNode {
  index: number;
  position: Vec3;
}

export interface PlaneTrashContext {
  field: PlaneField;
  /** Knoten des Levelpfads im z-Bereich [z0, z1] (nach Index sortiert). */
  nodes(z0: number, z1: number): ReadonlyArray<PlaneTrashNode>;
  /** Müll einer Welt (Standard: Katalog). */
  spec?(world: number): TrashSpec | undefined;
  seed: number;
  /** Gesamtdichte (Lab-Regler „Müll“, 1 = Inhalt). */
  densityScale?: number;
  /** Faktor nur für Kleinteile und Sporen (Qualitätsstufe: Mobil weniger). */
  debrisScale?: number;
  /** Schleier-Gitter: Vertices je Chunk-Kante (Standard 13). */
  veilRes?: number;
  /** Geländemaske (Wasser, Felsen): true = hier liegt nichts. Standard: Merkmale der Ebene. */
  isBlocked?(x: number, z: number): boolean;
}

/** Schleier-Gitter eines Ebenen-Chunks (regelmäßig über 16 × 16, Lagen auf festen Höhen erzeugt der Renderer). */
export interface PlaneVeilGrid {
  n: number;
  /** Ecke des Chunks und Kantenlänge (Ebene). */
  x0: number;
  z0: number;
  size: number;
  strength: Float32Array;
  heal: Float32Array;
  open: Float32Array;
  /** Welt je Vertex (Schleier über Nachbarwelten, Neonfarbe). */
  worlds: Float32Array;
  heights: number[];
  indices: Uint16Array;
}

export interface PlaneChunkTrash {
  items: TrashItem[];
  veil: PlaneVeilGrid | null;
  spores: VeilSpore[];
  nodeBlooms: VeilSpore[];
  hMax: number;
}

const DEFAULT_DEBRIS_KINDS: Record<DebrisKind, number> = {
  can: 0.2,
  bottle: 0.08,
  pipe: 0.1,
  barrel: 0.08,
  tyre: 0.14,
  coil: 0.05,
  crate: 0.12,
  bale: 0.08,
  shard: 0.1,
  girder: 0.05,
};

/** Heil-Verzögerung je Art (Knoten): Kleinteile gehen zuerst, Berge zuletzt. */
const HEAL_DELAY: Record<TrashKind, number> = { tube: 0, ring: 0, block: 0.1, goo: 0.25, vent: 0.5, ruin: 0.9, heap: 1.6 };
/** Zusatzverzögerung je Welteinheit Pfadabstand: die Heilung läuft wie eine Welle vom Pfad nach außen. */
const HEAL_PER_UNIT = 0.12;
const VEIL_PER_UNIT = 0.08;
/** Freiraum um Knoten (das Spielbrett faltet sich dort aus dem Boden): Kleinteile / große Elemente. */
const NODE_CLEAR_SMALL = 1.7;
const NODE_CLEAR_BIG = 3.4;
/** z-Reichweite der Pfadknoten je Chunk (Heilung, Freiraum). */
const NODE_REACH = 48;

interface Pocket {
  x: number;
  z: number;
  r: number;
}

interface LocalSpec {
  world: number;
  /** Heilzone: Knotenbereich [start, end) des Pfadabschnitts der Region. */
  zoneStart: number;
  zoneEnd: number;
  zone: number;
  spec: TrashSpec | undefined;
  weight: number;
}

interface Hit {
  s: number;
  dist: number;
}

/** Nächster Punkt einer Knotenpolylinie (Ebene, Abstand in xz). */
class Locator {
  private readonly nodes: ReadonlyArray<PlaneTrashNode>;
  constructor(nodes: ReadonlyArray<PlaneTrashNode>) {
    this.nodes = nodes;
  }

  locate(x: number, z: number, out: Hit): Hit {
    const n = this.nodes;
    out.s = 0;
    out.dist = Infinity;
    if (n.length === 0) return out;
    if (n.length === 1) {
      out.s = n[0]!.index;
      out.dist = Math.hypot(x - n[0]!.position[0], z - n[0]!.position[2]);
      return out;
    }
    let best = Infinity;
    let bestS = 0;
    for (let i = 0; i < n.length - 1; i++) {
      const a = n[i]!;
      const b = n[i + 1]!;
      const ax = a.position[0];
      const az = a.position[2];
      const bx = b.position[0] - ax;
      const bz = b.position[2] - az;
      const len2 = bx * bx + bz * bz;
      let t = len2 > 1e-12 ? ((x - ax) * bx + (z - az) * bz) / len2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(ax + bx * t - x, az + bz * t - z);
      if (d < best) {
        best = d;
        bestS = a.index + t * (b.index - a.index);
      }
    }
    out.s = bestS;
    out.dist = best;
    return out;
  }
}

const _hit: Hit = { s: 0, dist: Infinity };

export class PlaneTrashPlanner {
  private readonly pockets = new Map<string, Pocket[]>();
  private readonly drift: GradientNoise2;
  private locator: Locator = new Locator([]);
  private locatorZ: [number, number] = [1, 0];
  private chunkNodes: ReadonlyArray<PlaneTrashNode> = [];

  constructor(readonly ctx: PlaneTrashContext) {
    this.drift = new GradientNoise2(hash32('trash-drift', ctx.seed));
  }

  private specOf(world: number): TrashSpec | undefined {
    return this.ctx.spec ? this.ctx.spec(world) : this.ctx.field.spec(world).trash;
  }

  private blocked(x: number, z: number): boolean {
    if (this.ctx.isBlocked) return this.ctx.isBlocked(x, z);
    const f = this.ctx.field;
    return f.isWater(x, z, 0.6) || f.rockAt(x, z, 0.6) !== null || f.landmarkBlocks(x, z, 0.6);
  }

  /** Knoten und Pfad-Locator für einen z-Bereich (einmal je Chunk). */
  private useNodes(z0: number, z1: number): void {
    if (this.locatorZ[0] === z0 && this.locatorZ[1] === z1) return;
    this.chunkNodes = this.ctx.nodes(z0, z1);
    this.locator = new Locator(this.chunkNodes);
    this.locatorZ = [z0, z1];
  }

  /** Müll und Schleier eines Chunks (cx, cz). */
  chunk(cx: number, cz: number): PlaneChunkTrash {
    const items: TrashItem[] = [];
    const out: PlaneChunkTrash = { items, veil: null, spores: [], nodeBlooms: [], hMax: 0 };
    if (!this.touches(cx, cz)) return out;
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    this.useNodes(oz - NODE_REACH, oz + CHUNK_SIZE + NODE_REACH);
    const density = this.ctx.densityScale ?? 1;
    const debrisScale = (this.ctx.debrisScale ?? 1) * density;
    // Maxima der Dichten über die Welten, die den Chunk berühren
    const specs = this.specsNear(cx, cz);
    const maxOf = (pick: (s: TrashSpec) => number): number => Math.max(0, ...specs.map((s) => pick(s)));
    const seedOf = (salt: string) => hash32(salt, cx, cz, this.ctx.seed);

    // --- Müllberge und Ruinen (groß, selten, weit vom Pfad) -----------------------------------------------
    const bigs: TrashItem[] = [];
    const heapMax = maxOf((s) => s.heaps ?? 0) * density;
    if (heapMax > 0) {
      const pts = this.samples(cx, cz, 'heap', Math.sqrt(1 / (heapMax * 1.7)));
      const rand = mulberry32(seedOf('trash-heap'));
      for (const [x, z] of pts) {
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const r4 = rand();
        const r5 = rand();
        const loc = this.specAt(x, z);
        const spec = loc.spec;
        if (!spec?.heaps) continue;
        if (r1 > (spec.heaps * density * loc.weight) / heapMax) continue;
        const [h0, h1] = spec.heapHeight ?? [2.4, 4.4];
        const shape = pickIndex(spec.heapShapes ?? [0.4, 0.4, 0.2], r2);
        const height = h0 + (h1 - h0) * (0.25 * r3 + 0.75 * r3 * r3);
        // Halde breit, Turm schlank, Grat lang gezogen
        const width = height * (shape === 0 ? 1.15 : shape === 1 ? 0.62 : 0.8);
        const depth = shape === 2 ? width * 0.45 : width * (0.85 + 0.2 * r4);
        const item = this.placeBig('heap', shape, x, z, [width, height, depth], loc, spec, r5, rand);
        if (!item || overlapsBig(item, bigs)) continue;
        bigs.push(item);
      }
    }
    const ruinMax = maxOf((s) => s.ruins ?? 0) * density;
    if (ruinMax > 0) {
      const pts = this.samples(cx, cz, 'ruin', Math.sqrt(1 / (ruinMax * 1.7)));
      const rand = mulberry32(seedOf('trash-ruin'));
      for (const [x, z] of pts) {
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const r4 = rand();
        const loc = this.specAt(x, z);
        const spec = loc.spec;
        if (!spec?.ruins) continue;
        if (r1 > (spec.ruins * density * loc.weight) / ruinMax) continue;
        const [h0, h1] = spec.ruinHeight ?? [1.6, 3.2];
        const shape = pickIndex(spec.ruinShapes ?? [0.3, 0.25, 0.3, 0.15], r2);
        const height = h0 + (h1 - h0) * r3;
        // Bogen und Wand: breite Scheiben; Turm: schlank; Säulenreihe: lang
        const width = height * (shape === 0 ? 1.05 : shape === 1 ? 0.5 : shape === 2 ? 1.3 : 1.5);
        const depth = shape === 1 ? width : height * (shape === 3 ? 0.3 : 0.24);
        const item = this.placeBig('ruin', shape, x, z, [width, height, depth], loc, spec, r4, rand);
        if (!item || overlapsBig(item, bigs)) continue;
        bigs.push(item);
      }
    }
    for (const b of bigs) {
      items.push(b);
      out.hMax = Math.max(out.hMax, b.size[1]);
    }

    // --- Schutt am Fuß der Berge und Ruinen, Lecks ----------------------------------------------------------
    for (const b of bigs) {
      const rand = mulberry32(hash32('trash-scree', Math.round(b.position[0] * 100), Math.round(b.position[2] * 100), this.ctx.seed));
      const spec = this.specOf(b.world);
      if (!spec) continue;
      const base = Math.max(b.size[0], b.size[2]) * 0.5;
      const n = Math.round((b.kind === 'heap' ? 9 + rand() * 9 : 4 + rand() * 5) * Math.min(1.5, debrisScale));
      // Schutt liegt bevorzugt auf einer Seite (Hangabwärts-Fächer)
      const side = rand() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        const a = side + (rand() - 0.5) * Math.PI * 1.4;
        const r = base * (0.85 + rand() * 0.9);
        const kind = pickDebris(spec.debrisKinds, rand());
        const it = this.placeDebris(kind, b.position[0] + Math.cos(a) * r, b.position[2] + Math.sin(a) * r, rand, spec, 0.2);
        if (it) items.push(it);
      }
      if (b.kind === 'heap' && (spec.goo ?? 0) > 0 && rand() < 0.65) {
        const a = side + (rand() - 0.5) * 0.8;
        const rr = base * (1.05 + rand() * 0.4);
        const g = this.placeGoo(b.position[0] + Math.cos(a) * rr, b.position[2] + Math.sin(a) * rr, 0.45 + rand() * 0.5, rand, spec, b.heal - 0.4);
        if (g) items.push(g);
      }
    }

    // --- Verwehungen (Kleinteile in Gruppen längs der Höhenlinien) ------------------------------------------
    const debrisMax = maxOf((s) => s.debris ?? 0) * debrisScale;
    if (debrisMax > 0) {
      const clusterMax = Math.max(...specs.map((s) => (s.cluster ? (s.cluster[0] + s.cluster[1]) / 2 : 10)));
      // Doppelt so viele Kandidaten, davon bleibt etwa die Hälfte im Müllfeld-Muster (Earle: ruhige Flächen zwischen
      // dichten Gruppen statt gleichmäßiger Streuung)
      const clusterDensity = (debrisMax / Math.max(3, clusterMax)) * 2;
      const pts = this.samples(cx, cz, 'drift', Math.sqrt(1 / (clusterDensity * 1.7)));
      const rand = mulberry32(seedOf('trash-drift'));
      for (const [x, z] of pts) {
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const loc = this.specAt(x, z);
        const spec = loc.spec;
        if (!spec?.debris) continue;
        if (r1 > ((spec.debris * debrisScale * loc.weight) / debrisMax) * this.fieldMask(x, z)) continue;
        const [c0, c1] = spec.cluster ?? [6, 14];
        const count = Math.round(c0 + (c1 - c0) * r2);
        // Längsachse der Verwehung: Höhenlinie (senkrecht zum Hanggefälle), leicht verrauscht
        const axis = this.contourAngle(x, z) + (r3 - 0.5) * 0.9;
        // Dichte Haufen statt loser Streuung (Earle: Massen mit klarer Kontur, dazwischen Ruhe)
        const length = 1.0 + rand() * 1.6;
        const width = 0.4 + rand() * 0.5;
        const placed: Array<[number, number]> = [];
        // Neon-Schleim mitten im Haufen (jeder dritte): die Teile liegen darin
        if ((spec.goo ?? 0) > 0 && rand() < 0.35) {
          const g = this.placeGoo(x, z, 0.3 + rand() * 0.25, rand, spec);
          if (g) items.push(g);
        }
        const ca = Math.cos(axis);
        const sa = Math.sin(axis);
        for (let k = 0; k < count * 3 && placed.length < count; k++) {
          // Dichte fällt zur Spitze der Verwehung ab (Tropfenform)
          const u = (rand() + rand() + rand()) / 3 - 0.5;
          const v = (rand() + rand()) / 2 - 0.5;
          const along = u * length;
          const across = v * width * (1 - Math.abs(u) * 1.2);
          const px = x + ca * along - sa * across;
          const pz = z + sa * along + ca * across;
          // Mindestabstand 0.16 Welteinheiten
          if (placed.some((q) => Math.hypot(q[0] - px, q[1] - pz) < 0.16)) continue;
          const kind = pickDebris(spec.debrisKinds, rand());
          const it = this.placeDebris(kind, px, pz, rand, spec, 0);
          if (!it) continue;
          placed.push([px, pz]);
          items.push(it);
        }
      }
    }

    // --- Neon-Pfützen in Senken und Gasquellen ------------------------------------------------------------
    const gooMax = maxOf((s) => s.goo ?? 0) * density;
    if (gooMax > 0) {
      const pts = this.samples(cx, cz, 'goo', Math.sqrt(1 / (gooMax * 1.7)));
      const rand = mulberry32(seedOf('trash-goo'));
      for (const [x, z] of pts) {
        const r1 = rand();
        const r2 = rand();
        const loc = this.specAt(x, z);
        const spec = loc.spec;
        if (!spec?.goo) continue;
        if (r1 > (spec.goo * density * loc.weight) / gooMax) continue;
        // Senken: nur im unteren Teil der Hügel (Schleim sammelt sich unten)
        if (this.ctx.field.heightNormAt(x, z) > 0.42) continue;
        const g = this.placeGoo(x, z, 0.5 + r2 * 0.8, rand, spec);
        if (g) items.push(g);
      }
    }
    const ventMax = maxOf((s) => s.vents ?? 0) * density;
    if (ventMax > 0) {
      const pts = this.samples(cx, cz, 'vent', Math.sqrt(1 / (ventMax * 1.7)));
      const rand = mulberry32(seedOf('trash-vent'));
      for (const [x, z] of pts) {
        const r1 = rand();
        const loc = this.specAt(x, z);
        const spec = loc.spec;
        if (!spec?.vents) continue;
        if (r1 > (spec.vents * density * loc.weight) / ventMax) continue;
        const s = this.surface(x, z);
        if (!this.free(x, z, 0.9, false)) continue;
        this.locator.locate(x, z, _hit);
        const heal = this.heal(spec, HEAL_PER_UNIT, HEAL_DELAY.vent, loc, x, z);
        const h = 0.34 + rand() * 0.3;
        const r = 0.13 + rand() * 0.05;
        items.push({
          kind: 'vent',
          shape: VENT_CHIMNEY_SHAPE,
          position: sink(s.position, s.normal, 0.06),
          up: s.normal,
          yaw: rand() * Math.PI * 2,
          lean: rand() * 0.12,
          leanDir: rand() * Math.PI * 2,
          size: [r * 2, h, r * 2],
          heal,
          world: loc.world,
          zone: loc.zone,
          variant: rand(),
          neon: Math.max(0.5, spec.neon ?? 1),
        });
        const g = this.placeGoo(x, z, 0.4 + rand() * 0.25, rand, spec, heal);
        if (g) items.push(g);
        out.hMax = Math.max(out.hMax, h);
      }
    }

    // --- Schleier und Sporen ---------------------------------------------------------------------------------
    out.veil = this.veil(cx, cz);
    if (out.veil) out.spores = this.spores(cx, cz, out.veil);
    out.nodeBlooms = this.nodeBlooms(cx, cz);
    return out;
  }

  /** Blütenkranz um jeden Knoten des Chunks, dessen Welt heilenden Müll trägt. */
  private nodeBlooms(cx: number, cz: number): VeilSpore[] {
    const out: VeilSpore[] = [];
    const f = this.ctx.field;
    const x0 = cx * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    for (const node of this.chunkNodes) {
      const p = node.position;
      if (p[0] < x0 || p[0] >= x0 + CHUNK_SIZE || p[2] < z0 || p[2] >= z0 + CHUNK_SIZE) continue;
      const loc = this.specAt(p[0], p[2]);
      if (!loc.spec || loc.spec.heals === false) continue;
      // Nur Knoten am Boden (die Stufen am Riesenbaum liegen über dem Gelände)
      if (p[1] - f.heightAt(p[0], p[2]) > 0.5) continue;
      const rand = mulberry32(hash32('trash-node-bloom', node.index, this.ctx.seed));
      for (let k = 0; k < 7; k++) {
        const a = rand() * Math.PI * 2;
        const r = 1.2 + Math.sqrt(rand()) * 1.6;
        const x = p[0] + Math.cos(a) * r;
        const z = p[2] + Math.sin(a) * r;
        const pos: Vec3 = [x, f.heightAt(x, z) + 0.01, z];
        // nicht auf die Wegpunkte
        if (this.locator.locate(x, z, _hit).dist < 0.45) continue;
        if (this.blocked(x, z)) continue;
        out.push({ position: pos, up: [0, 1, 0], heal: node.index + 1, phase: rand(), size: 0.03 + rand() * 0.025 });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------------------

  /** Welten mit Müll, die den Chunk berühren (Mitte, Ecken, Kantenmitten). */
  private specsNear(cx: number, cz: number): TrashSpec[] {
    const out = new Set<TrashSpec>();
    for (const lv of [0, 0.25, 0.5, 0.75, 1]) {
      for (const lu of [0, 0.25, 0.5, 0.75, 1]) {
        const s = this.specOf(this.ctx.field.worldAt((cx + lu) * CHUNK_SIZE, (cz + lv) * CHUNK_SIZE));
        if (s && hasContent(s)) out.add(s);
      }
    }
    return [...out];
  }

  private touches(cx: number, cz: number): boolean {
    return this.specsNear(cx, cz).length > 0;
  }

  /**
   * Müllfeld-Muster 0..1 (großes, ruhiges Rauschen, Wellenlänge ≈ 12 Einheiten): Kleinteile liegen in Feldern, dazwischen
   * bleibt die Wiese frei. Mittelwert ≈ 0.5.
   */
  private fieldMask(x: number, z: number): number {
    const n = this.drift.fbm(x / 12 + 7.3, z / 12 - 2.1, 2);
    return smoothstep(-0.18, 0.22, n);
  }

  /** Heilschwelle am zuletzt gesuchten Pfadpunkt (`_hit`); Welten mit `heals: false` heilen nie. */
  private heal(spec: TrashSpec | undefined, perUnit: number, delay: number, loc: LocalSpec, x: number, z: number): number {
    if (spec?.heals === false) return NEVER_HEALS;
    // Heilfront mit Lappen statt gerader Linie: langsames Rauschen verschiebt die Schwelle um ±0.6 Knoten
    const wobble = this.drift.fbm(x / 6 - 3.3, z / 6 + 8.1, 2) * 1.3;
    const raw = _hit.s + 0.1 + perUnit * _hit.dist + delay + wobble;
    return Math.min(loc.zoneEnd, Math.max(loc.zoneStart + HEAL_SPAN, raw));
  }

  /** Welt, Spezifikation, Heilzone und Nester-Gewicht am Ort. */
  private specAt(x: number, z: number): LocalSpec {
    const f = this.ctx.field;
    const rs = f.sample(x, z);
    const world = rs.world;
    const spec = this.specOf(world);
    const seg = f.layout.segment(Math.max(0, rs.region.k));
    const zoneStart = Math.max(0, seg.firstLevel - 1);
    const zoneEnd = zoneStart + Math.max(1, seg.levels);
    let weight = spec ? 1 : 0;
    if (spec?.pockets) weight *= this.pocketMask(rs.region.key, world, spec, x, z);
    return { world, zoneStart, zoneEnd, zone: rs.region.k, spec, weight };
  }

  /** Nester einer Region (einmal je Region, deterministisch): Müll liegt dort, dazwischen ist die Welt sauber. */
  private pocketMask(key: string, world: number, spec: TrashSpec, x: number, z: number): number {
    let pockets = this.pockets.get(key);
    if (!pockets) {
      pockets = this.buildPockets(key, world, spec);
      if (this.pockets.size > 512) this.pockets.clear();
      this.pockets.set(key, pockets);
    }
    let m = 0;
    for (const p of pockets) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d >= p.r) continue;
      m = Math.max(m, smoothstep(p.r, p.r * 0.55, d));
    }
    return m;
  }

  private buildPockets(key: string, world: number, spec: TrashSpec): Pocket[] {
    const pk = spec.pockets;
    if (!pk) return [];
    const f = this.ctx.field;
    const layout = f.layout;
    const region = f.region(key);
    const rand = mulberry32(hash32('trash-pockets', key, world, this.ctx.seed));
    // Kandidaten auf einem Gitter über der Region (Pfadabschnitt: das Band; Seitenzelle: um ihr Zentrum)
    let zA: number;
    let zB: number;
    let xOf: (z: number) => [number, number];
    if (region.kind === 'path') {
      const seg = layout.segment(region.k);
      zA = seg.zEnd;
      zB = seg.zStart;
      xOf = (z) => [layout.backbone(z) - layout.bandHalfWidth - 2, layout.backbone(z) + layout.bandHalfWidth + 2];
    } else {
      const rr = Math.max(layout.cellAcross, layout.cellAlong);
      zA = region.cz - rr;
      zB = region.cz + rr;
      xOf = () => [region.cx - rr, region.cx + rr];
    }
    const step = 3;
    const inside: Array<[number, number]> = [];
    for (let z = zA; z <= zB; z += step) {
      const [xa, xb] = xOf(z);
      for (let x = xa; x <= xb; x += step) if (f.sample(x, z).region.key === key) inside.push([x, z]);
    }
    const area = inside.length * step * step;
    const count = Math.max(inside.length > 0 ? 1 : 0, Math.round(area * pk.density));
    // Mischen (deterministisch), dann mit Mindestabstand wählen
    for (let i = inside.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = inside[i]!;
      inside[i] = inside[j]!;
      inside[j] = t;
    }
    const nodes = this.ctx.nodes(zA - 8, zB + 8);
    const loc = new Locator(nodes);
    const hit: Hit = { s: 0, dist: Infinity };
    const out: Pocket[] = [];
    for (const [x, z] of inside) {
      if (out.length >= count) break;
      const radius = pk.radius[0] + (pk.radius[1] - pk.radius[0]) * rand();
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < radius * 1.6)) continue;
      // Nester nicht auf den Pfad legen
      if (loc.locate(x, z, hit).dist < radius * 0.6 + 1.5) continue;
      out.push({ x, z, r: radius });
    }
    return out;
  }

  /**
   * Bridson-Poisson im Chunk (Welteinheiten). Seltene Elemente (wenige je Chunk) werden stattdessen gleichverteilt
   * gewürfelt — Bridson mit großem Abstand füllt einen Chunk kaum (Randverluste); Überlappungen prüft der Aufrufer.
   */
  private samples(cx: number, cz: number, salt: string, minDist: number): Array<[number, number]> {
    const rand = mulberry32(hash32('trash-poisson', salt, cx, cz, this.ctx.seed));
    const S = CHUNK_SIZE;
    const x0 = cx * S;
    const z0 = cz * S;
    const r = Math.max(1e-3, minDist);
    if (r > 0.35 * (S / 2)) {
      // Erwartete Anzahl je Chunk aus dem Mindestabstand (Dichte = 1 / (1.7·d²)), stochastisch gerundet
      const expected = (S * S) / (1.7 * r * r);
      const n = Math.floor(expected + rand());
      const out: Array<[number, number]> = [];
      for (let k = 0; k < n; k++) out.push([x0 + rand() * S, z0 + rand() * S]);
      return out;
    }
    const cell = r / Math.SQRT2;
    const gridN = Math.ceil(S / cell) + 1;
    if (gridN * gridN > 4_000_000) return [];
    const grid = new Int32Array(gridN * gridN).fill(-1);
    const pts: Array<[number, number]> = [];
    const active: number[] = [];
    const fits = (x: number, y: number): boolean => {
      if (x < 0 || x >= S || y < 0 || y >= S) return false;
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      for (let j = Math.max(0, gy - 2); j <= Math.min(gridN - 1, gy + 2); j++) {
        for (let i = Math.max(0, gx - 2); i <= Math.min(gridN - 1, gx + 2); i++) {
          const k = grid[j * gridN + i]!;
          if (k < 0) continue;
          const q = pts[k]!;
          if ((q[0] - x) ** 2 + (q[1] - y) ** 2 < r * r) return false;
        }
      }
      return true;
    };
    const push = (x: number, y: number) => {
      pts.push([x, y]);
      grid[Math.floor(y / cell) * gridN + Math.floor(x / cell)] = pts.length - 1;
      active.push(pts.length - 1);
    };
    push(rand() * S, rand() * S);
    while (active.length > 0 && pts.length < 5000) {
      const ai = Math.floor(rand() * active.length);
      const base = pts[active[ai]!]!;
      let placed = false;
      for (let k = 0; k < 18; k++) {
        const a = rand() * Math.PI * 2;
        const dd = r * (1 + rand());
        const x = base[0] + Math.cos(a) * dd;
        const y = base[1] + Math.sin(a) * dd;
        if (fits(x, y)) {
          push(x, y);
          placed = true;
          break;
        }
      }
      if (!placed) {
        active[ai] = active[active.length - 1]!;
        active.pop();
      }
    }
    return pts.map(([x, y]) => [x0 + x, z0 + y]);
  }

  /** Oberflächenpunkt und Normale. */
  private surface(x: number, z: number): { position: Vec3; normal: Vec3 } {
    const position: Vec3 = [0, 0, 0];
    const normal: Vec3 = [0, 0, 0];
    this.ctx.field.surfaceAt(x, z, position, normal);
    return { position, normal };
  }

  /** Winkel der Höhenlinie am Ort (Ebene, Winkel in xz): Verwehungen liegen quer zum Hang. */
  private contourAngle(x: number, z: number): number {
    const n = this.surface(x, z).normal;
    // Gefälle = waagrechter Anteil der Normale (zeigt hangabwärts), Höhenlinie senkrecht dazu
    if (Math.hypot(n[0], n[2]) < 1e-4) return this.drift.sample(x * 0.1, z * 0.1) * Math.PI * 2;
    return Math.atan2(n[2], n[0]) + Math.PI / 2;
  }

  /** Frei von Pfad, Knoten, Wahrzeichen und Geländemasken? */
  private free(x: number, z: number, radius: number, big: boolean): boolean {
    const f = this.ctx.field;
    if (this.blocked(x, z)) return false;
    const key = f.sample(x, z).region.key;
    for (const s of f.landmarksIn([key])) {
      if (Math.hypot(x - s.position[0], z - s.position[2]) < s.clearRadius + radius) return false;
    }
    for (const s of f.externalLandmarks) {
      if (Math.hypot(x - s.position[0], z - s.position[2]) < s.clearRadius + radius) return false;
    }
    this.locator.locate(x, z, _hit);
    const spec = this.specOf(f.worldAt(x, z));
    const clear = spec?.pathClear ?? 1.2;
    if (_hit.dist < clear + radius) return false;
    // Knoten: das Brett klappt dort aus dem Boden, große Elemente halten mehr Abstand
    const nodeClear = big ? NODE_CLEAR_BIG : NODE_CLEAR_SMALL;
    if (_hit.dist < nodeClear + radius) {
      for (const n of this.chunkNodes) {
        if (Math.abs(n.index - _hit.s) > 1.5) continue;
        if (Math.hypot(x - n.position[0], z - n.position[2]) < nodeClear + radius) return false;
      }
    }
    return true;
  }

  private placeBig(kind: 'heap' | 'ruin', shape: number, x: number, z: number, size: Vec3, loc: LocalSpec, spec: TrashSpec, variant: number, rand: () => number): TrashItem | null {
    const s = this.surface(x, z);
    const radius = Math.max(size[0], size[2]) * 0.5;
    if (!this.free(x, z, radius, true)) return null;
    // Fuß am tiefsten Punkt unter dem Grundriss: der Berg sitzt immer auf (bergseitig steckt er im Hang)
    let minH = s.position[1];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      minH = Math.min(minH, this.ctx.field.heightAt(x + Math.cos(a) * radius * 0.8, z + Math.sin(a) * radius * 0.8));
    }
    // Große Formen stehen fast senkrecht (Earles Türme); nur wenig zur Hangnormale geneigt
    const up = normalize(lerp3([0, 1, 0], s.normal, 0.25));
    this.locator.locate(x, z, _hit);
    const heal = this.heal(spec, HEAL_PER_UNIT * 0.6, HEAL_DELAY[kind], loc, x, z);
    return {
      kind,
      shape,
      position: [x, minH - 0.08, z],
      up,
      yaw: rand() * Math.PI * 2,
      // Türme lehnen sich (kollabierte Türme deutlich), Halden stehen
      lean: kind === 'ruin' ? (shape === 1 ? 0.08 + rand() * 0.14 : rand() * 0.05) : shape === 1 ? rand() * 0.1 : rand() * 0.04,
      leanDir: rand() * Math.PI * 2,
      size,
      heal,
      world: loc.world,
      zone: loc.zone,
      variant,
      neon: clamp01((spec.neon ?? 1) * (0.75 + 0.5 * rand())),
    };
  }

  /** Ein Kleinteil an (x, z) (liegt, steht oder steckt je Sorte im Boden). */
  private placeDebris(kind: DebrisKind, x: number, z: number, rand: () => number, spec: TrashSpec, healDelay: number): TrashItem | null {
    const s = this.surface(x, z);
    const r1 = rand();
    const r2 = rand();
    const r3 = rand();
    const r4 = rand();
    const r5 = rand();
    const map = DEBRIS_SHAPE[kind];
    let size: Vec3;
    let lean = 0;
    let embed = 0;
    switch (kind) {
      case 'can': {
        const w = 0.085 + r1 * 0.04;
        size = [w, w * (1.35 + r2 * 0.3), w];
        lean = r3 < 0.6 ? Math.PI / 2 : r3 * 0.3; // meist liegend
        embed = lean > 1 ? w * 0.25 : 0.01;
        break;
      }
      case 'bottle': {
        const w = 0.07 + r1 * 0.03;
        size = [w, w * (2.8 + r2 * 0.6), w];
        lean = r3 < 0.7 ? Math.PI / 2 - 0.1 : 0.2 + r3 * 0.4;
        embed = lean > 1 ? w * 0.25 : w * 0.8;
        break;
      }
      case 'pipe': {
        const w = 0.09 + r1 * 0.07;
        size = [w, 0.6 + r2 * 0.9, w];
        lean = Math.PI / 2 - r3 * 0.25; // liegt, ein Ende steckt im Boden
        embed = w * 0.35;
        break;
      }
      case 'barrel': {
        const w = 0.22 + r1 * 0.08;
        size = [w, w * 1.4, w];
        lean = r3 < 0.4 ? Math.PI / 2 : r3 * 0.2;
        embed = lean > 1 ? w * 0.2 : 0.02;
        break;
      }
      case 'tyre': {
        const w = 0.34 + r1 * 0.16;
        size = [w, w * 0.34, w];
        // flach liegend oder halb eingegraben aufrecht (Earles Halbkreise)
        lean = r3 < 0.55 ? r3 * 0.35 : Math.PI / 2;
        embed = lean > 1 ? w * (0.2 + r2 * 0.25) : 0;
        break;
      }
      case 'coil': {
        const w = 0.26 + r1 * 0.14;
        size = [w, w * 0.5, w];
        lean = r3 * 0.3;
        embed = 0.01;
        break;
      }
      case 'crate': {
        const w = 0.2 + r1 * 0.16;
        size = [w, w * (0.75 + r2 * 0.35), w * (0.8 + r4 * 0.3)];
        lean = r3 * 0.35;
        embed = w * 0.15;
        break;
      }
      case 'bale': {
        const w = 0.3 + r1 * 0.18;
        size = [w, w * (0.8 + r2 * 0.25), w * (0.9 + r4 * 0.2)];
        lean = r3 * 0.12;
        embed = w * 0.1;
        break;
      }
      case 'shard': {
        // Scherben stecken schräg im Boden wie Earles kleine Felszähne
        const w = 0.14 + r1 * 0.16;
        size = [w, w * (1.0 + r2 * 0.8), 0.04 + r4 * 0.03];
        lean = 0.15 + r3 * 0.55;
        embed = size[1] * 0.25;
        break;
      }
      case 'girder': {
        const w = 0.06 + r1 * 0.04;
        size = [w * 1.4, 0.8 + r2 * 0.8, w];
        lean = Math.PI / 2 - 0.05 - r3 * 0.25; // flach, ein Ende steckt im Boden (lange Schatten bleiben Linien)
        embed = size[1] * 0.12 + w * 0.3;
        break;
      }
    }
    const radius = Math.max(size[0], size[1] * (lean > 0.8 ? 0.5 : 0.2), size[2]);
    // Nur in Müll-Welten (Verwehungen und Schutt laufen nicht über Weltgrenzen und Nesterränder hinaus)
    const here = this.specAt(x, z);
    if (!here.spec || here.weight < 0.2) return null;
    if (!this.free(x, z, radius, false)) return null;
    this.locator.locate(x, z, _hit);
    const heal = this.heal(spec, HEAL_PER_UNIT, HEAL_DELAY[map.kind] + healDelay + r5 * 0.25, here, x, z);
    return {
      kind: map.kind,
      shape: map.shape,
      position: sink(s.position, s.normal, embed),
      up: s.normal,
      yaw: rand() * Math.PI * 2,
      lean,
      leanDir: rand() * Math.PI * 2,
      size,
      heal,
      world: here.world,
      zone: here.zone,
      variant: rand(),
      neon: clamp01((spec.neon ?? 1) * (kind === 'bottle' || kind === 'coil' ? 1 : 0.6) * rand() * 1.4),
    };
  }

  /** Neon-Pfütze (flach auf dem Boden; nur auf fast ebenem Boden). */
  private placeGoo(x: number, z: number, radius: number, rand: () => number, spec: TrashSpec, healAt?: number): TrashItem | null {
    const s = this.surface(x, z);
    if (s.normal[1] < 0.965) return null;
    const loc = this.specAt(x, z);
    if (!loc.spec || loc.weight < 0.2) return null;
    if (!this.free(x, z, radius * 0.8, false)) return null;
    this.locator.locate(x, z, _hit);
    const heal = healAt ?? this.heal(spec, HEAL_PER_UNIT, HEAL_DELAY.goo, loc, x, z);
    const stretch = 0.6 + rand() * 0.4;
    return {
      kind: 'goo',
      shape: 0,
      position: sink(s.position, s.normal, -0.02),
      up: s.normal,
      yaw: rand() * Math.PI * 2,
      lean: 0,
      leanDir: 0,
      size: [radius * 2, 0.02, radius * 2 * stretch],
      heal,
      world: loc.world,
      zone: loc.zone,
      variant: rand(),
      neon: Math.max(0.35, spec.neon ?? 1),
    };
  }

  /** Schleier-Gitter des Chunks (null, wenn keine Welt darin einen Schleier trägt). */
  private veil(cx: number, cz: number): PlaneVeilGrid | null {
    const n = Math.max(3, this.ctx.veilRes ?? 13);
    const S = CHUNK_SIZE;
    const x0 = cx * S;
    const z0 = cz * S;
    const strength = new Float32Array(n * n);
    const heal = new Float32Array(n * n);
    const open = new Float32Array(n * n);
    const worlds = new Float32Array(n * n);
    let any = false;
    let heights: number[] | null = null;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = x0 + (i / (n - 1)) * S;
        const z = z0 + (j / (n - 1)) * S;
        const loc = this.specAt(x, z);
        const v = (loc.spec?.veil ?? 0) * loc.weight;
        strength[k] = v;
        worlds[k] = loc.world;
        if (v > 0) {
          any = true;
          heights ??= loc.spec?.veilHeights ?? null;
        }
        this.locator.locate(x, z, _hit);
        heal[k] = this.heal(loc.spec, VEIL_PER_UNIT, 0, loc, x, z);
        open[k] = smoothstep(0.4, 2.6, _hit.dist);
      }
    }
    if (!any) return null;
    const indices = new Uint16Array((n - 1) * (n - 1) * 6);
    let o = 0;
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i;
        const b = a + 1;
        const c = a + n;
        const e = c + 1;
        indices[o++] = a;
        indices[o++] = b;
        indices[o++] = c;
        indices[o++] = b;
        indices[o++] = e;
        indices[o++] = c;
      }
    }
    return { n, x0, z0, size: S, strength, heal, open, worlds, heights: heights ?? [0.55, 1.0, 1.45], indices };
  }

  /** Schwebende Sporen im Schleier (wenige je Chunk, zwischen den Lagen). */
  private spores(cx: number, cz: number, veil: PlaneVeilGrid): VeilSpore[] {
    const scale = (this.ctx.debrisScale ?? 1) * (this.ctx.densityScale ?? 1);
    const S = CHUNK_SIZE;
    const rand = mulberry32(hash32('trash-spores', cx, cz, this.ctx.seed));
    const n = Math.round(S * S * 0.28 * scale);
    const out: VeilSpore[] = [];
    const top = veil.heights[veil.heights.length - 1] ?? 1.4;
    for (let k = 0; k < n; k++) {
      const x = cx * S + rand() * S;
      const z = cz * S + rand() * S;
      const r1 = rand();
      const r2 = rand();
      const r3 = rand();
      const loc = this.specAt(x, z);
      const v = (loc.spec?.veil ?? 0) * loc.weight * Math.min(1, loc.spec?.neon ?? 1);
      if (v <= 0 || r1 > v) continue;
      const ground = this.ctx.field.heightAt(x, z);
      // Sporen schweben im Schleier: über dem Boden, unter der obersten Lage
      const h = Math.max(ground + 0.15, Math.min(top + 0.3, ground + 0.2 + r2 * 1.4));
      this.locator.locate(x, z, _hit);
      const heal = this.heal(loc.spec, VEIL_PER_UNIT, 0, loc, x, z);
      out.push({ position: [x, h, z], up: [0, 1, 0], heal, phase: r3, size: 0.022 + rand() * 0.022 });
    }
    return out;
  }
}

// --- kleine Helfer ------------------------------------------------------------------------------------------

function hasContent(s: TrashSpec): boolean {
  return (s.debris ?? 0) > 0 || (s.heaps ?? 0) > 0 || (s.ruins ?? 0) > 0 || (s.goo ?? 0) > 0 || (s.vents ?? 0) > 0 || (s.veil ?? 0) > 0;
}

function overlapsBig(item: TrashItem, list: TrashItem[]): boolean {
  const r = Math.max(item.size[0], item.size[2]) * 0.5;
  return list.some((o) => Math.hypot(o.position[0] - item.position[0], o.position[2] - item.position[2]) < r + Math.max(o.size[0], o.size[2]) * 0.5 + 1.2);
}

function pickIndex(weights: readonly number[], r: number): number {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += Math.max(0, weights[i]!) / total;
    if (r < acc) return i;
  }
  return weights.length - 1;
}

function pickDebris(weights: Partial<Record<DebrisKind, number>> | undefined, r: number): DebrisKind {
  const w = weights ?? DEFAULT_DEBRIS_KINDS;
  const entries = Object.entries(w) as Array<[DebrisKind, number]>;
  if (entries.length === 0) return 'can';
  const idx = pickIndex(
    entries.map(([, v]) => v),
    r,
  );
  return entries[idx]![0];
}

function sink(p: Vec3, n: Vec3, depth: number): Vec3 {
  return [p[0] - n[0] * depth, p[1] - n[1] * depth, p[2] - n[2] * depth];
}

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
