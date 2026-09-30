import type { Vec3 } from '../capPatch';
import { GradientNoise3 } from '../noise';
import { chunkDirection, type ChunkId, type PlanetField } from '../planet';
import { hash32, mulberry32 } from '../rng';
import { PathLocator, healThreshold, type HealNode, type PathHit } from './heal';
import { DEBRIS_SHAPE, NEVER_HEALS, VENT_CHIMNEY_SHAPE, type ChunkTrash, type DebrisKind, type TrashItem, type TrashKind, type TrashSpec, type VeilGrid, type VeilSpore } from './types';

/** Alles, was die Müll-Platzierung vom Planeten braucht. */
export interface TrashContext {
  field: PlanetField;
  /** Levelpfad (Knoten in Reihenfolge): Heilschwellen und Freiraum. */
  nodes: ReadonlyArray<HealNode>;
  /** Müll je Welt-Index (fehlt = sauber). */
  specs: ReadonlyArray<TrashSpec | undefined>;
  nodesPerZone: number;
  seed: number;
  /** Gesamtdichte (Lab-Regler „Müll“, 1 = Inhalt). */
  densityScale?: number;
  /** Faktor nur für Kleinteile und Sporen (Qualitätsstufe: Mobil weniger). */
  debrisScale?: number;
  /** Schleier-Gitter: Vertices je Chunk-Kante (Standard 17). */
  veilRes?: number;
  /**
   * Optionale Geländemasken (Wasser, Felswände …): true = hier liegt nichts. Wird vom Terrain bereitgestellt, sobald
   * es Flüsse/Seen kennt; ohne Maske gilt der ganze Boden.
   */
  isBlocked?: (dx: number, dy: number, dz: number) => boolean;
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

interface Pocket {
  dir: Vec3;
  cos: number;
  cosInner: number;
}

interface LocalSpec {
  world: number;
  zone: number;
  spec: TrashSpec | undefined;
  /** Gewicht 0..1 (Nester der Nachbarwelten, Weltgrenzen). */
  weight: number;
}

const _hit: PathHit = { s: 0, dist: Infinity };

/**
 * Deterministische Müll-Platzierung je Chunk: Müllberge und Ruinen (Poisson, weit vom Pfad), Kleinteile in
 * Verwehungen längs der Höhenlinien (Earle: Gruppen mit klaren Lücken, keine gleichmäßige Streuung), Schutt am Fuß
 * der Berge, Neon-Pfützen in Senken, Gasquellen, Schleier-Gitter und schwebende Sporen. Gleicher Seed und Chunk →
 * gleiche Liste; die Heilschwelle jedes Elements folgt dem nächsten Pfadpunkt.
 */
export class TrashPlanner {
  readonly path: PathLocator;
  private readonly pockets = new Map<number, Pocket[]>();
  private readonly drift: GradientNoise3;

  constructor(readonly ctx: TrashContext) {
    this.path = new PathLocator(ctx.nodes);
    this.drift = new GradientNoise3(hash32('trash-drift', ctx.seed));
  }

  /** Hat irgendeine Welt Müll? (Sonst muss kein Chunk geplant werden.) */
  get active(): boolean {
    return this.ctx.specs.some((s) => !!s && hasContent(s));
  }

  /** Müll und Schleier eines Chunks. */
  chunk(id: ChunkId): ChunkTrash {
    const items: TrashItem[] = [];
    const out: ChunkTrash = { items, veil: null, spores: [], nodeBlooms: [], hMax: 0 };
    if (!this.active || !this.touches(id)) return out;
    const R = this.ctx.field.params.radius;
    const halfExtent = this.halfExtent(id);
    const density = this.ctx.densityScale ?? 1;
    const debrisScale = (this.ctx.debrisScale ?? 1) * density;
    const maxOf = (pick: (s: TrashSpec) => number): number => Math.max(0, ...this.ctx.specs.map((s) => (s ? pick(s) : 0)));

    // --- Müllberge und Ruinen (groß, selten, weit vom Pfad) -----------------------------------------------
    const bigs: TrashItem[] = [];
    const heapMax = maxOf((s) => s.heaps ?? 0) * density;
    if (heapMax > 0) {
      const pts = this.samples(id, 'heap', Math.sqrt(1 / (heapMax * 1.7)), halfExtent);
      const rand = mulberry32(hash32('trash-heap', id.face, id.cx, id.cy, this.ctx.seed));
      for (const d of pts) {
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const r4 = rand();
        const r5 = rand();
        const loc = this.specAt(d);
        const spec = loc.spec;
        if (!spec?.heaps) continue;
        if (r1 > (spec.heaps * density * loc.weight) / heapMax) continue;
        const [h0, h1] = spec.heapHeight ?? [2.4, 4.4];
        const shape = pickIndex(spec.heapShapes ?? [0.4, 0.4, 0.2], r2);
        const height = h0 + (h1 - h0) * (0.25 * r3 + 0.75 * r3 * r3);
        // Halde breit, Turm schlank, Grat lang gezogen
        const width = height * (shape === 0 ? 1.15 : shape === 1 ? 0.62 : 0.8);
        const depth = shape === 2 ? width * 0.45 : width * (0.85 + 0.2 * r4);
        const item = this.placeBig('heap', shape, d, [width, height, depth], loc, spec, r5, rand);
        if (!item || this.overlapsBig(item, bigs)) continue;
        bigs.push(item);
      }
    }
    const ruinMax = maxOf((s) => s.ruins ?? 0) * density;
    if (ruinMax > 0) {
      const pts = this.samples(id, 'ruin', Math.sqrt(1 / (ruinMax * 1.7)), halfExtent);
      const rand = mulberry32(hash32('trash-ruin', id.face, id.cx, id.cy, this.ctx.seed));
      for (const d of pts) {
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const r4 = rand();
        const loc = this.specAt(d);
        const spec = loc.spec;
        if (!spec?.ruins) continue;
        if (r1 > (spec.ruins * density * loc.weight) / ruinMax) continue;
        const [h0, h1] = spec.ruinHeight ?? [1.6, 3.2];
        const shape = pickIndex(spec.ruinShapes ?? [0.3, 0.25, 0.3, 0.15], r2);
        const height = h0 + (h1 - h0) * r3;
        // Bogen und Wand: breite Scheiben; Turm: schlank; Säulenreihe: lang
        const width = height * (shape === 0 ? 1.05 : shape === 1 ? 0.5 : shape === 2 ? 1.3 : 1.5);
        const depth = shape === 1 ? width : height * (shape === 3 ? 0.3 : 0.24);
        const item = this.placeBig('ruin', shape, d, [width, height, depth], loc, spec, r4, rand);
        if (!item || this.overlapsBig(item, bigs)) continue;
        bigs.push(item);
      }
    }
    for (const b of bigs) {
      items.push(b);
      out.hMax = Math.max(out.hMax, b.size[1]);
    }

    // --- Schutt am Fuß der Berge und Ruinen, Lecks ----------------------------------------------------------
    for (const b of bigs) {
      const rand = mulberry32(hash32('trash-scree', b.position[0], b.position[1], b.position[2], this.ctx.seed));
      const spec = this.ctx.specs[b.world];
      if (!spec) continue;
      const base = Math.max(b.size[0], b.size[2]) * 0.5;
      const n = Math.round((b.kind === 'heap' ? 9 + rand() * 9 : 4 + rand() * 5) * Math.min(1.5, debrisScale));
      // Schutt liegt bevorzugt auf einer Seite (Hangabwärts-Fächer)
      const side = rand() * Math.PI * 2;
      for (let k = 0; k < n; k++) {
        const a = side + (rand() - 0.5) * Math.PI * 1.4;
        const r = base * (0.85 + rand() * 0.9);
        const p = this.offsetDir(b.position, b.up, a, r);
        const kind = pickDebris(spec.debrisKinds, rand());
        const it = this.placeDebris(kind, p, rand, spec, 0.2);
        if (it) items.push(it);
      }
      if (b.kind === 'heap' && (spec.goo ?? 0) > 0 && rand() < 0.65) {
        const a = side + (rand() - 0.5) * 0.8;
        const p = this.offsetDir(b.position, b.up, a, base * (1.05 + rand() * 0.4));
        const g = this.placeGoo(p, 0.45 + rand() * 0.5, rand, spec, b.heal - 0.4);
        if (g) items.push(g);
      }
    }

    // --- Verwehungen (Kleinteile in Gruppen längs der Höhenlinien) ------------------------------------------
    const debrisMax = maxOf((s) => s.debris ?? 0) * debrisScale;
    if (debrisMax > 0) {
      const clusterMax = Math.max(...this.ctx.specs.map((s) => (s?.cluster ? (s.cluster[0] + s.cluster[1]) / 2 : 10)));
      // Doppelt so viele Kandidaten, davon bleibt etwa die Hälfte im Müllfeld-Muster (Earle: ruhige Flächen zwischen
      // dichten Gruppen statt gleichmäßiger Streuung)
      const clusterDensity = (debrisMax / Math.max(3, clusterMax)) * 2;
      const pts = this.samples(id, 'drift', Math.sqrt(1 / (clusterDensity * 1.7)), halfExtent);
      const rand = mulberry32(hash32('trash-drift', id.face, id.cx, id.cy, this.ctx.seed));
      for (const d of pts) {
        const r1 = rand();
        const r2 = rand();
        const r3 = rand();
        const loc = this.specAt(d);
        const spec = loc.spec;
        if (!spec?.debris) continue;
        if (r1 > ((spec.debris * debrisScale * loc.weight) / debrisMax) * this.fieldMask(d)) continue;
        const [c0, c1] = spec.cluster ?? [6, 14];
        const count = Math.round(c0 + (c1 - c0) * r2);
        // Längsachse der Verwehung: Höhenlinie (senkrecht zum Hanggefälle), leicht verrauscht
        const axis = this.contourAngle(d) + (r3 - 0.5) * 0.9;
        // Dichte Haufen statt loser Streuung (Earle: Massen mit klarer Kontur, dazwischen Ruhe)
        const length = 1.0 + rand() * 1.6;
        const width = 0.4 + rand() * 0.5;
        const placed: Vec3[] = [];
        const centre = this.surface(d);
        const up = centre.normal;
        const R = this.ctx.field.params.radius;
        // Neon-Schleim mitten im Haufen (jeder dritte): die Teile liegen darin
        if ((spec.goo ?? 0) > 0 && rand() < 0.35) {
          const g = this.placeGoo(centre.position, 0.3 + rand() * 0.25, rand, spec);
          if (g) items.push(g);
        }
        for (let k = 0; k < count * 3 && placed.length < count; k++) {
          // Dichte fällt zur Spitze der Verwehung ab (Tropfenform)
          const u = (rand() + rand() + rand()) / 3 - 0.5;
          const v = (rand() + rand()) / 2 - 0.5;
          const along = u * length;
          const across = v * width * (1 - Math.abs(u) * 1.2);
          const p = this.offsetDir(centre.position, up, axis, along, across);
          // Abstand über die Richtungen (p ist eine Einheitsrichtung): mindestens 0.16 Welteinheiten
          if (placed.some((q) => dist3(q, p) * R < 0.16)) continue;
          const kind = pickDebris(spec.debrisKinds, rand());
          const it = this.placeDebris(kind, p, rand, spec, 0);
          if (!it) continue;
          placed.push(p);
          items.push(it);
        }
      }
    }

    // --- Neon-Pfützen in Senken und Gasquellen ------------------------------------------------------------
    const gooMax = maxOf((s) => s.goo ?? 0) * density;
    if (gooMax > 0) {
      const pts = this.samples(id, 'goo', Math.sqrt(1 / (gooMax * 1.7)), halfExtent);
      const rand = mulberry32(hash32('trash-goo', id.face, id.cx, id.cy, this.ctx.seed));
      for (const d of pts) {
        const r1 = rand();
        const r2 = rand();
        const loc = this.specAt(d);
        const spec = loc.spec;
        if (!spec?.goo) continue;
        if (r1 > (spec.goo * density * loc.weight) / gooMax) continue;
        // Senken: nur im unteren Teil der Hügel (Schleim sammelt sich unten)
        if (this.ctx.field.heightNormAt(d[0], d[1], d[2]) > 0.42) continue;
        const g = this.placeGoo(this.surface(d).position, 0.5 + r2 * 0.8, rand, spec);
        if (g) items.push(g);
      }
    }
    const ventMax = maxOf((s) => s.vents ?? 0) * density;
    if (ventMax > 0) {
      const pts = this.samples(id, 'vent', Math.sqrt(1 / (ventMax * 1.7)), halfExtent);
      const rand = mulberry32(hash32('trash-vent', id.face, id.cx, id.cy, this.ctx.seed));
      for (const d of pts) {
        const r1 = rand();
        const loc = this.specAt(d);
        const spec = loc.spec;
        if (!spec?.vents) continue;
        if (r1 > (spec.vents * density * loc.weight) / ventMax) continue;
        const s = this.surface(d);
        if (!this.free(s.position, 0.9, false)) continue;
        this.path.locate(s.position, _hit);
        const heal = this.heal(spec, HEAL_PER_UNIT, HEAL_DELAY.vent, loc.zone, s.position);
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
        const g = this.placeGoo(s.position, 0.4 + rand() * 0.25, rand, spec, heal);
        if (g) items.push(g);
        out.hMax = Math.max(out.hMax, h);
      }
    }

    // --- Schleier und Sporen ---------------------------------------------------------------------------------
    out.veil = this.veil(id);
    if (out.veil) out.spores = this.spores(id, out.veil, halfExtent, R);
    out.nodeBlooms = this.nodeBlooms(id);
    return out;
  }

  /** Blütenkranz um jeden Knoten des Chunks, dessen Welt heilenden Müll trägt. */
  private nodeBlooms(id: ChunkId): VeilSpore[] {
    const out: VeilSpore[] = [];
    const f = this.ctx.field;
    const R = f.params.radius;
    for (const node of this.ctx.nodes) {
      const p = node.position;
      const l = Math.hypot(p[0], p[1], p[2]) || 1;
      const c = f.chunkOf(p[0] / l, p[1] / l, p[2] / l);
      if (c.face !== id.face || c.cx !== id.cx || c.cy !== id.cy) continue;
      const loc = this.specAt([p[0] / l, p[1] / l, p[2] / l]);
      if (!loc.spec || loc.spec.heals === false) continue;
      // Nur Knoten am Boden (die Stufen am Riesenbaum liegen über dem Gelände)
      if (l - (R + f.heightAt(p[0] / l, p[1] / l, p[2] / l)) > 0.5) continue;
      const rand = mulberry32(hash32('trash-node-bloom', node.index, this.ctx.seed));
      const up: Vec3 = [p[0] / l, p[1] / l, p[2] / l];
      const n = 7;
      for (let k = 0; k < n; k++) {
        const a = rand() * Math.PI * 2;
        const r = 1.2 + Math.sqrt(rand()) * 1.6;
        const d = this.offsetDir(p, up, a, r);
        const g = R + f.heightAt(d[0], d[1], d[2]) + 0.01;
        const pos: Vec3 = [d[0] * g, d[1] * g, d[2] * g];
        // nicht auf die Wegpunkte
        if (this.path.locate(pos, _hit).dist < 0.45) continue;
        if (this.ctx.isBlocked?.(d[0], d[1], d[2])) continue;
        out.push({ position: pos, up: d, heal: node.index + 1, phase: rand(), size: 0.03 + rand() * 0.025 });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------------------

  /**
   * Müllfeld-Muster 0..1 (großes, ruhiges Rauschen, Wellenlänge ≈ 12 Einheiten): Kleinteile liegen in Feldern, dazwischen
   * bleibt die Wiese frei. Mittelwert ≈ 0.5.
   */
  private fieldMask(d: Vec3): number {
    const f = this.ctx.field.params.radius / 12;
    const n = this.drift.fbm(d[0] * f + 7.3, d[1] * f - 2.1, d[2] * f + 4.4, 2);
    return smoothstep(-0.18, 0.22, n);
  }

  /** Heilschwelle am zuletzt gesuchten Pfadpunkt (`_hit`); Welten mit `heals: false` heilen nie. */
  private heal(spec: TrashSpec | undefined, perUnit: number, delay: number, zone: number, at: Vec3): number {
    if (spec?.heals === false) return NEVER_HEALS;
    // Heilfront mit Lappen statt gerader Linie: langsames Rauschen verschiebt die Schwelle um ±0.6 Knoten (gleich für
    // Müll und Schleier am selben Ort, damit beide zusammen aufreißen)
    const l = Math.hypot(at[0], at[1], at[2]) || 1;
    const f = this.ctx.field.params.radius / 6;
    const wobble = this.drift.fbm((at[0] / l) * f - 3.3, (at[1] / l) * f + 8.1, (at[2] / l) * f + 1.7, 2) * 1.3;
    return healThreshold(_hit, { perUnit, delay: delay + wobble, nodesPerZone: this.ctx.nodesPerZone, zone });
  }

  /** Grober Test, ob ein Chunk eine Müll-Welt berührt (Mitte, Ecken, Kantenmitten). */
  private touches(id: ChunkId): boolean {
    const cpf = this.ctx.field.params.chunksPerFace;
    const d: Vec3 = [0, 0, 0];
    for (const lv of [-1, -0.5, 0, 0.5, 1]) {
      for (const lu of [-1, -0.5, 0, 0.5, 1]) {
        chunkDirection(id, cpf, lu, lv, d);
        const w = this.ctx.field.worldAt(d[0], d[1], d[2]);
        const s = this.ctx.specs[w];
        if (s && hasContent(s)) return true;
      }
    }
    return false;
  }

  private halfExtent(id: ChunkId): number {
    const cpf = this.ctx.field.params.chunksPerFace;
    const c = chunkDirection(id, cpf, 0, 0, [0, 0, 0]);
    const e = chunkDirection(id, cpf, 1, 0, [0, 0, 0]);
    return Math.acos(Math.min(1, c[0] * e[0] + c[1] * e[1] + c[2] * e[2])) * this.ctx.field.params.radius;
  }

  /** Welt, Spezifikation und Nester-Gewicht am Ort. */
  private specAt(d: Vec3): LocalSpec {
    const f = this.ctx.field;
    const world = f.worldAt(d[0], d[1], d[2]);
    const zone = f.zoneIndex(d[0], d[1], d[2]);
    const spec = this.ctx.specs[world];
    let weight = spec ? 1 : 0;
    if (spec?.pockets) weight *= this.pocketMask(world, spec, d);
    return { world, zone, spec, weight };
  }

  /** Nester einer Welt (einmal je Welt, deterministisch): Müll liegt dort, dazwischen ist die Welt sauber. */
  private pocketMask(world: number, spec: TrashSpec, d: Vec3): number {
    let pockets = this.pockets.get(world);
    if (!pockets) {
      pockets = this.buildPockets(world, spec);
      this.pockets.set(world, pockets);
    }
    let m = 0;
    for (const p of pockets) {
      const c = p.dir[0] * d[0] + p.dir[1] * d[1] + p.dir[2] * d[2];
      if (c <= p.cos) continue;
      m = Math.max(m, smoothstep(p.cos, p.cosInner, c));
    }
    return m;
  }

  private buildPockets(world: number, spec: TrashSpec): Pocket[] {
    const pk = spec.pockets;
    if (!pk) return [];
    const f = this.ctx.field;
    const R = f.params.radius;
    const rand = mulberry32(hash32('trash-pockets', world, this.ctx.seed));
    // Fibonacci-Kugel als Kandidaten, gefiltert auf die Welt; Fläche der Welt ≈ Anteil der Treffer
    const N = 2400;
    const inside: Vec3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(1 - y * y);
      const a = golden * i;
      const d: Vec3 = [r * Math.cos(a), y, r * Math.sin(a)];
      if (f.worldAt(d[0], d[1], d[2]) === world) inside.push(d);
    }
    const area = (inside.length / N) * 4 * Math.PI * R * R;
    const count = Math.max(inside.length > 0 ? 1 : 0, Math.round(area * pk.density));
    const out: Pocket[] = [];
    // Mischen (deterministisch), dann mit Mindestabstand wählen
    for (let i = inside.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = inside[i]!;
      inside[i] = inside[j]!;
      inside[j] = t;
    }
    for (const d of inside) {
      if (out.length >= count) break;
      const radius = pk.radius[0] + (pk.radius[1] - pk.radius[0]) * rand();
      const ang = radius / R;
      if (out.some((p) => Math.acos(Math.min(1, p.dir[0] * d[0] + p.dir[1] * d[1] + p.dir[2] * d[2])) < ang * 1.6)) continue;
      // Nester nicht auf den Pfad legen
      const pos = this.surface(d).position;
      if (this.path.locate(pos, _hit).dist < radius * 0.6 + 1.5) continue;
      out.push({ dir: d, cos: Math.cos(ang), cosInner: Math.cos(ang * 0.55) });
    }
    return out;
  }

  /**
   * Bridson-Poisson im lokalen Chunk-Raum (lu, lv ∈ [-1, 1]), Mindestabstand in Welteinheiten. Seltene Elemente
   * (wenige je Chunk) werden stattdessen gleichverteilt gewürfelt — Bridson mit großem Abstand füllt einen Chunk
   * kaum (Randverluste), die Dichte käme viel zu klein heraus; Überlappungen prüft der Aufrufer.
   */
  private samples(id: ChunkId, salt: string, minDistWorld: number, halfExtent: number): Vec3[] {
    const cpf = this.ctx.field.params.chunksPerFace;
    const rand = mulberry32(hash32('trash-poisson', salt, id.face, id.cx, id.cy, this.ctx.seed));
    const r = Math.max(1e-3, minDistWorld / Math.max(1e-3, halfExtent));
    const lo = -0.99;
    const hi = 0.99;
    if (r > 0.35) {
      // Erwartete Anzahl je Chunk aus dem Mindestabstand (Dichte = 1 / (1.7·d²)), stochastisch gerundet
      const expected = (4 * halfExtent * halfExtent) / (1.7 * minDistWorld * minDistWorld);
      const n = Math.floor(expected + rand());
      const out: Vec3[] = [];
      for (let k = 0; k < n; k++) out.push(chunkDirection(id, cpf, lo + rand() * (hi - lo), lo + rand() * (hi - lo), [0, 0, 0]));
      return out;
    }
    const cell = r / Math.SQRT2;
    const gridN = Math.ceil((hi - lo) / cell) + 1;
    if (gridN * gridN > 4_000_000) return [];
    const grid = new Int32Array(gridN * gridN).fill(-1);
    const pts: Array<[number, number]> = [];
    const active: number[] = [];
    const fits = (x: number, y: number): boolean => {
      if (x < lo || x > hi || y < lo || y > hi) return false;
      const cx = Math.floor((x - lo) / cell);
      const cy = Math.floor((y - lo) / cell);
      for (let j = Math.max(0, cy - 2); j <= Math.min(gridN - 1, cy + 2); j++) {
        for (let i = Math.max(0, cx - 2); i <= Math.min(gridN - 1, cx + 2); i++) {
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
      grid[Math.floor((y - lo) / cell) * gridN + Math.floor((x - lo) / cell)] = pts.length - 1;
      active.push(pts.length - 1);
    };
    push(lo + rand() * (hi - lo), lo + rand() * (hi - lo));
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
    return pts.map(([lu, lv]) => chunkDirection(id, cpf, lu, lv, [0, 0, 0]));
  }

  /** Oberflächenpunkt und Normale in einer Richtung. */
  private surface(d: Vec3): { position: Vec3; normal: Vec3 } {
    const position: Vec3 = [0, 0, 0];
    const normal: Vec3 = [0, 0, 0];
    this.ctx.field.surfaceAt(d[0], d[1], d[2], position, normal);
    return { position, normal };
  }

  /**
   * Punkt im Abstand `along` (Richtung `angle` in der Tangentialebene) und `across` (quer dazu) von `p`, zurück auf
   * die Oberfläche projiziert (Richtung vom Mittelpunkt).
   */
  private offsetDir(p: Vec3, up: Vec3, angle: number, along: number, across = 0): Vec3 {
    const [t1, t2] = tangents(up);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const ex = t1[0] * c + t2[0] * s;
    const ey = t1[1] * c + t2[1] * s;
    const ez = t1[2] * c + t2[2] * s;
    const fx = -t1[0] * s + t2[0] * c;
    const fy = -t1[1] * s + t2[1] * c;
    const fz = -t1[2] * s + t2[2] * c;
    const q: Vec3 = [p[0] + ex * along + fx * across, p[1] + ey * along + fy * across, p[2] + ez * along + fz * across];
    const l = Math.hypot(q[0], q[1], q[2]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l];
  }

  /** Winkel der Höhenlinie am Ort (Tangentialbasis wie `offsetDir`): Verwehungen liegen quer zum Hang. */
  private contourAngle(d: Vec3): number {
    const s = this.surface(d);
    const n = s.normal;
    const [t1, t2] = tangents(n);
    // Gefälle = Normale ohne Radialanteil (zeigt hangabwärts), Höhenlinie senkrecht dazu
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    const rd = n[0] * d[0] / l + n[1] * d[1] / l + n[2] * d[2] / l;
    const gx = n[0] - (d[0] / l) * rd;
    const gy = n[1] - (d[1] / l) * rd;
    const gz = n[2] - (d[2] / l) * rd;
    const a = gx * t1[0] + gy * t1[1] + gz * t1[2];
    const b = gx * t2[0] + gy * t2[1] + gz * t2[2];
    if (Math.hypot(a, b) < 1e-4) {
      // Ebene: Verwehung folgt einem langsamen Richtungsfeld
      return this.drift.sample(d[0] * 3.1, d[1] * 3.1, d[2] * 3.1) * Math.PI * 2;
    }
    return Math.atan2(b, a) + Math.PI / 2;
  }

  /** Frei von Pfad, Knoten, Wahrzeichen und Geländemasken? */
  private free(p: Vec3, radius: number, big: boolean): boolean {
    const f = this.ctx.field;
    const l = Math.hypot(p[0], p[1], p[2]) || 1;
    if (this.ctx.isBlocked?.(p[0] / l, p[1] / l, p[2] / l)) return false;
    for (const s of f.landmarkSlots) {
      if (dist3(p, s.position) < s.clearRadius + radius) return false;
    }
    this.path.locate(p, _hit);
    const spec = this.ctx.specs[f.worldAt(p[0] / l, p[1] / l, p[2] / l)];
    const clear = spec?.pathClear ?? 1.2;
    if (_hit.dist < clear + radius) return false;
    // Knoten: das Brett klappt dort aus dem Boden, große Elemente halten mehr Abstand (nur die Knoten um den
    // nächsten Pfadpunkt prüfen)
    const nodeClear = big ? NODE_CLEAR_BIG : NODE_CLEAR_SMALL;
    if (_hit.dist < nodeClear + radius) {
      for (const n of this.ctx.nodes) {
        if (Math.abs(n.index - _hit.s) > 1.5) continue;
        if (dist3(p, n.position) < nodeClear + radius) return false;
      }
    }
    return true;
  }

  private placeBig(kind: 'heap' | 'ruin', shape: number, d: Vec3, size: Vec3, loc: LocalSpec, spec: TrashSpec, variant: number, rand: () => number): TrashItem | null {
    const s = this.surface(d);
    const radius = Math.max(size[0], size[2]) * 0.5;
    if (!this.free(s.position, radius, true)) return null;
    // Fuß am tiefsten Punkt unter dem Grundriss: der Berg sitzt immer auf (bergseitig steckt er im Hang)
    const radial: Vec3 = [d[0], d[1], d[2]];
    let minR = Infinity;
    for (let k = 0; k < 8; k++) {
      const q = this.offsetDir(s.position, radial, (k / 8) * Math.PI * 2, radius * 0.8);
      const r = this.ctx.field.params.radius + this.ctx.field.heightAt(q[0], q[1], q[2]);
      minR = Math.min(minR, r);
    }
    const rC = Math.hypot(s.position[0], s.position[1], s.position[2]);
    const baseR = Math.min(rC, minR) - 0.08;
    // Große Formen stehen fast senkrecht (Earles Türme); nur wenig zur Hangnormale geneigt
    const up = normalize(lerp3(radial, s.normal, 0.25));
    this.path.locate(s.position, _hit);
    const heal = this.heal(spec, HEAL_PER_UNIT * 0.6, HEAL_DELAY[kind], loc.zone, s.position);
    return {
      kind,
      shape,
      position: [d[0] * baseR, d[1] * baseR, d[2] * baseR],
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

  private overlapsBig(item: TrashItem, list: TrashItem[]): boolean {
    const r = Math.max(item.size[0], item.size[2]) * 0.5;
    return list.some((o) => dist3(o.position, item.position) < r + Math.max(o.size[0], o.size[2]) * 0.5 + 1.2);
  }

  /** Ein Kleinteil an Richtung `d` (liegt, steht oder steckt je Sorte im Boden). */
  private placeDebris(kind: DebrisKind, d: Vec3, rand: () => number, spec: TrashSpec, healDelay: number): TrashItem | null {
    const s = this.surface(d);
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
    const here = this.specAt(d);
    if (!here.spec || here.weight < 0.2) return null;
    if (!this.free(s.position, radius, false)) return null;
    const loc = here;
    this.path.locate(s.position, _hit);
    const heal = this.heal(spec, HEAL_PER_UNIT, HEAL_DELAY[map.kind] + healDelay + r5 * 0.25, loc.zone, s.position);
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
      world: loc.world,
      zone: loc.zone,
      variant: rand(),
      neon: clamp01((spec.neon ?? 1) * (kind === 'bottle' || kind === 'coil' ? 1 : 0.6) * rand() * 1.4),
    };
  }

  private specAtKnown(d: Vec3, l: number): { world: number; zone: number } {
    const f = this.ctx.field;
    return { world: f.worldAt(d[0] / l, d[1] / l, d[2] / l), zone: f.zoneIndex(d[0] / l, d[1] / l, d[2] / l) };
  }

  /** Neon-Pfütze (flach, in der Tangentialebene; nur auf fast ebenem Boden). */
  private placeGoo(p: Vec3, radius: number, rand: () => number, spec: TrashSpec, healAt?: number): TrashItem | null {
    const l = Math.hypot(p[0], p[1], p[2]) || 1;
    const d: Vec3 = [p[0] / l, p[1] / l, p[2] / l];
    const s = this.surface(d);
    const flat = s.normal[0] * d[0] + s.normal[1] * d[1] + s.normal[2] * d[2];
    if (flat < 0.965) return null;
    const loc = this.specAt(d);
    if (!loc.spec || loc.weight < 0.2) return null;
    if (!this.free(s.position, radius * 0.8, false)) return null;
    this.path.locate(s.position, _hit);
    const heal = healAt ?? this.heal(spec, HEAL_PER_UNIT, HEAL_DELAY.goo, loc.zone, s.position);
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
  private veil(id: ChunkId): VeilGrid | null {
    const maxVeil = Math.max(0, ...this.ctx.specs.map((s) => s?.veil ?? 0));
    if (maxVeil <= 0) return null;
    const n = Math.max(3, this.ctx.veilRes ?? 17);
    const cpf = this.ctx.field.params.chunksPerFace;
    const dirs = new Float32Array(n * n * 3);
    const strength = new Float32Array(n * n);
    const heal = new Float32Array(n * n);
    const open = new Float32Array(n * n);
    const d: Vec3 = [0, 0, 0];
    const pos: Vec3 = [0, 0, 0];
    let any = false;
    let heights: number[] | null = null;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        chunkDirection(id, cpf, (i / (n - 1)) * 2 - 1, (j / (n - 1)) * 2 - 1, d);
        dirs[k * 3] = d[0];
        dirs[k * 3 + 1] = d[1];
        dirs[k * 3 + 2] = d[2];
        const loc = this.specAt(d);
        const v = (loc.spec?.veil ?? 0) * loc.weight;
        strength[k] = v;
        if (v > 0) {
          any = true;
          heights ??= loc.spec?.veilHeights ?? null;
        }
        const r = this.ctx.field.params.radius + this.ctx.field.heightAt(d[0], d[1], d[2]);
        pos[0] = d[0] * r;
        pos[1] = d[1] * r;
        pos[2] = d[2] * r;
        this.path.locate(pos, _hit);
        heal[k] = this.heal(loc.spec, VEIL_PER_UNIT, 0, loc.zone, pos);
        open[k] = smoothstep(0.4, 2.6, _hit.dist);
      }
    }
    if (!any) return null;
    const quads = (n - 1) * (n - 1);
    const indices = new Uint16Array(quads * 6);
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
    return { n, dirs, strength, heal, open, heights: heights ?? [0.55, 1.0, 1.45], indices };
  }

  /** Schwebende Sporen im Schleier (wenige je Chunk, zwischen den Lagen). */
  private spores(id: ChunkId, veil: VeilGrid, halfExtent: number, R: number): VeilSpore[] {
    const scale = (this.ctx.debrisScale ?? 1) * (this.ctx.densityScale ?? 1);
    const area = (2 * halfExtent) ** 2;
    const rand = mulberry32(hash32('trash-spores', id.face, id.cx, id.cy, this.ctx.seed));
    const n = Math.round(area * 0.28 * scale);
    const out: VeilSpore[] = [];
    const cpf = this.ctx.field.params.chunksPerFace;
    const d: Vec3 = [0, 0, 0];
    const top = veil.heights[veil.heights.length - 1] ?? 1.4;
    for (let k = 0; k < n; k++) {
      const lu = rand() * 2 - 1;
      const lv = rand() * 2 - 1;
      const r1 = rand();
      const r2 = rand();
      const r3 = rand();
      chunkDirection(id, cpf, lu, lv, d);
      const loc = this.specAt(d);
      const v = (loc.spec?.veil ?? 0) * loc.weight * Math.min(1, loc.spec?.neon ?? 1);
      if (v <= 0 || r1 > v) continue;
      const ground = this.ctx.field.heightAt(d[0], d[1], d[2]);
      // Sporen schweben im Schleier: über dem Boden, unter der obersten Lage
      const h = Math.max(ground + 0.15, Math.min(top + 0.3, ground + 0.2 + r2 * 1.4));
      const rr = R + h;
      const position: Vec3 = [d[0] * rr, d[1] * rr, d[2] * rr];
      this.path.locate(position, _hit);
      const heal = this.heal(loc.spec, VEIL_PER_UNIT, 0, loc.zone, position);
      out.push({ position, up: [d[0], d[1], d[2]], heal, phase: r3, size: 0.022 + rand() * 0.022 });
    }
    return out;
  }
}

// --- kleine Helfer ------------------------------------------------------------------------------------------

function hasContent(s: TrashSpec): boolean {
  return (s.debris ?? 0) > 0 || (s.heaps ?? 0) > 0 || (s.ruins ?? 0) > 0 || (s.goo ?? 0) > 0 || (s.vents ?? 0) > 0 || (s.veil ?? 0) > 0;
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

/** Zwei Tangenten zu `n` (stabil, Planetenraum). */
function tangents(n: Vec3): [Vec3, Vec3] {
  const ax = Math.abs(n[1]) < 0.9 ? 0 : 1;
  const ay = Math.abs(n[1]) < 0.9 ? 1 : 0;
  // t1 = a × n
  let t1x = ay * n[2];
  let t1y = -ax * n[2];
  let t1z = ax * n[1] - ay * n[0];
  const l1 = Math.hypot(t1x, t1y, t1z) || 1;
  t1x /= l1;
  t1y /= l1;
  t1z /= l1;
  const t2: Vec3 = [n[1] * t1z - n[2] * t1y, n[2] * t1x - n[0] * t1z, n[0] * t1y - n[1] * t1x];
  return [[t1x, t1y, t1z], t2];
}

function sink(p: Vec3, n: Vec3, depth: number): Vec3 {
  return [p[0] - n[0] * depth, p[1] - n[1] * depth, p[2] - n[2] * depth];
}

function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
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

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
