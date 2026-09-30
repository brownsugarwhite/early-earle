import { describe, expect, it } from 'vitest';
import { PlanetField, chunkList, spiralPath, type PlanetParams, type PlanetWorldParams } from '../planet';
import { PathLocator, healAmount, healThreshold } from './heal';
import { TrashPlanner, type TrashContext } from './placement';
import { HEAL_SPAN, type TrashItem, type TrashSpec } from './types';

const veg = (density: number): PlanetWorldParams['vegetation'] => ({ density, clumpiness: 0.5, kinds: { dome: 1 }, scale: [0.8, 1.2] });

/** Zehn Welten wie im Spiel (Welt 09 = Startwelt Tjorizo, nahe Seite von Zone 0). */
const worlds: PlanetWorldParams[] = [
  { id: 'w01', zone: 3, side: 'near', half: 0, terrain: { amplitude: 2.6 }, vegetation: veg(0.3) },
  { id: 'w02', zone: 2, side: 'near', terrain: { amplitude: 2.6 }, vegetation: veg(0.3) },
  { id: 'w03', zone: 3, side: 'near', half: 1, terrain: { amplitude: 1.8 }, vegetation: veg(0.2) },
  { id: 'w04', zone: 1, side: 'near', terrain: { amplitude: 4.2, slope: 0.5 }, vegetation: veg(0.2) },
  { id: 'w05', zone: 1, side: 'far', half: 1, terrain: { amplitude: 2.8 }, vegetation: veg(0.1) },
  { id: 'w06', zone: 0, side: 'far', terrain: { amplitude: 3.6, ridge: 0.9 }, vegetation: veg(0.5) },
  { id: 'w07', zone: 2, side: 'far', terrain: { amplitude: 0.9 }, vegetation: veg(0.4) },
  { id: 'w08', zone: 3, side: 'far', terrain: { amplitude: 1.6, floor: 0.6, wavelength: 2 }, vegetation: veg(0.05) },
  { id: 'w09', zone: 0, side: 'near', terrain: { amplitude: 2.4, wavelength: 1.5, slope: 0.4 }, vegetation: veg(0.2) },
  { id: 'w10', zone: 1, side: 'far', half: 0, terrain: { amplitude: 0.7 }, vegetation: veg(0.3) },
];
const zones: PlanetParams['zones'] = ['tjorizo', 'syrup', 'luzz', 'wooding'].map((id) => ({ id, hillAmplitude: 1.5, vegetation: veg(0.2) }));
const params: PlanetParams = { radius: 32, seed: 7, chunksPerFace: 3, zones, worlds, spiral: { turns: 2.75, polarMarginDeg: 9 } };

const START: TrashSpec = { debris: 1.2, cluster: [6, 12], heaps: 0.006, heapHeight: [2.4, 4.4], ruins: 0.003, goo: 0.02, vents: 0.008, veil: 1, neon: 1 };
const POCKETS: TrashSpec = { debris: 0.8, ruins: 0.004, goo: 0.01, veil: 0.5, neon: 0.6, pockets: { density: 0.004, radius: [3, 5] } };

const field = new PlanetField(params);
const path = spiralPath(field, { nodesPerZone: 25 });
const specs: Array<TrashSpec | undefined> = worlds.map(() => undefined);
specs[8] = START;
specs[3] = POCKETS;

function context(extra: Partial<TrashContext> = {}): TrashContext {
  return { field, nodes: path.nodes, specs, nodesPerZone: 25, seed: 7, ...extra };
}

/** Alle Chunks einmal planen (für Dichte- und Freiraumtests). */
const planner = new TrashPlanner(context());
const all = chunkList(3).map((id) => ({ id, trash: planner.chunk(id) }));
const items: TrashItem[] = all.flatMap((c) => c.trash.items);

describe('TrashPlanner', () => {
  it('ist deterministisch: gleicher Seed und Chunk → gleiche Liste; anderer Seed → andere', () => {
    const again = new TrashPlanner(context());
    const other = new TrashPlanner(context({ seed: 8 }));
    const busy = all.reduce((a, b) => (b.trash.items.length > a.trash.items.length ? b : a));
    expect(busy.trash.items.length).toBeGreaterThan(20);
    expect(again.chunk(busy.id)).toEqual(busy.trash);
    expect(other.chunk(busy.id).items.map((i) => i.position)).not.toEqual(busy.trash.items.map((i) => i.position));
  });

  it('legt Müll nur in Welten mit Müll-Abschnitt (Nester nur in ihren Nestern)', () => {
    expect(items.length).toBeGreaterThan(200);
    for (const it of items) expect(specs[it.world], `Welt ${it.world}`).toBeDefined();
    const start = items.filter((i) => i.world === 8);
    const pockets = items.filter((i) => i.world === 3);
    expect(start.length).toBeGreaterThan(pockets.length * 2);
  });

  it('trifft die Dichte der Kleinteile (Verwehungen, Freiräume) grob', () => {
    // Fläche der Startwelt über eine Fibonacci-Kugel schätzen
    const N = 4000;
    let hits = 0;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(1 - y * y);
      if (field.worldAt(r * Math.cos(golden * i), y, r * Math.sin(golden * i)) === 8) hits++;
    }
    const area = (hits / N) * 4 * Math.PI * 32 * 32;
    const debris = items.filter((i) => i.world === 8 && (i.kind === 'tube' || i.kind === 'ring' || i.kind === 'block')).length;
    const expected = (START.debris ?? 0) * area;
    expect(debris).toBeGreaterThan(expected * 0.25);
    expect(debris).toBeLessThan(expected * 1.6);
    // Verwehungen: Kleinteile liegen gruppiert (Nachbar näher als 0.8 bei den meisten)
    const small = items.filter((i) => i.kind === 'tube' || i.kind === 'block').slice(0, 300);
    const grouped = small.filter((a) => small.some((b) => b !== a && Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]) < 0.8)).length;
    expect(grouped / small.length).toBeGreaterThan(0.6);
    // Mehr Müll → mehr Kleinteile
    const dense = new TrashPlanner(context({ densityScale: 2 }));
    const busy = all.reduce((a, b) => (b.trash.items.length > a.trash.items.length ? b : a));
    expect(dense.chunk(busy.id).items.length).toBeGreaterThan(busy.trash.items.length * 1.3);
    const none = new TrashPlanner(context({ densityScale: 0 }));
    expect(none.chunk(busy.id).items.length).toBe(0);
  });

  it('hält Pfad und Knoten frei (große Elemente mit ihrem Radius)', () => {
    const loc = new PathLocator(path.nodes);
    for (const it of items) {
      const hit = loc.locate(it.position);
      const radius = it.kind === 'heap' || it.kind === 'ruin' ? Math.max(it.size[0], it.size[2]) * 0.5 : 0;
      expect(hit.dist, `${it.kind} am Pfad`).toBeGreaterThan(1.2 + radius - 0.05);
      if (it.kind === 'heap' || it.kind === 'ruin') {
        for (const n of path.nodes) {
          const d = Math.hypot(it.position[0] - n.position[0], it.position[1] - n.position[1], it.position[2] - n.position[2]);
          expect(d).toBeGreaterThan(3.4 + radius - 0.05);
        }
      }
    }
  });

  it('steht auf dem Boden: Fuß nie über dem Gelände, große Formen am tiefsten Punkt ihres Grundrisses', () => {
    for (const it of items) {
      const r = Math.hypot(it.position[0], it.position[1], it.position[2]);
      const d = [it.position[0] / r, it.position[1] / r, it.position[2] / r] as const;
      const ground = 32 + field.heightAt(d[0], d[1], d[2]);
      expect(r, `${it.kind} schwebt`).toBeLessThanOrEqual(ground + 0.03);
      // Höchstens halb eingegraben (liegende/aufrechte Teile: größte Kante zählt)
      expect(r, `${it.kind} vergraben`).toBeGreaterThan(ground - Math.max(0.12, Math.max(...it.size) * 0.5));
    }
  });

  it('heilt entlang des Pfads: Schwelle in der Zone, nahe Knoten zuerst, Berge später', () => {
    const loc = new PathLocator(path.nodes);
    const zone0 = items.filter((i) => i.zone === 0);
    expect(zone0.length).toBeGreaterThan(100);
    for (const it of items) {
      expect(it.heal).toBeGreaterThanOrEqual(it.zone * 25 + HEAL_SPAN - 1e-9);
      expect(it.heal).toBeLessThanOrEqual((it.zone + 1) * 25 + 1e-9);
    }
    // Monotonie: Schwelle wächst mit dem Pfadindex des nächsten Punkts (Rangkorrelation deutlich positiv)
    const pairs = zone0.map((i) => [loc.locate(i.position).s, i.heal] as const);
    const rank = (v: number[]) => {
      const o = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
      const r = new Array<number>(v.length);
      o.forEach(([, i], k) => (r[i] = k));
      return r;
    };
    const ra = rank(pairs.map((p) => p[0]));
    const rb = rank(pairs.map((p) => p[1]));
    const n = pairs.length;
    const d2 = ra.reduce((acc, a, i) => acc + (a - rb[i]!) ** 2, 0);
    const spearman = 1 - (6 * d2) / (n * (n * n - 1));
    expect(spearman).toBeGreaterThan(0.7);
    // Fortschritt 0: nichts geheilt; Zonenende: alles in Zone 0 weg
    for (const it of zone0) {
      expect(healAmount(it.heal, 0)).toBe(0);
      expect(healAmount(it.heal, 25)).toBe(1);
    }
    // Berge heilen später als Kleinteile am selben Ort
    const hit = { s: 10, dist: 5 };
    expect(healThreshold(hit, { perUnit: 0.14, delay: 1.6, nodesPerZone: 25, zone: 0 })).toBeGreaterThan(healThreshold(hit, { perUnit: 0.14, delay: 0, nodesPerZone: 25, zone: 0 }));
    // Teilfortschritt: ein Teil ist weg, ein Teil steht noch
    const gone = zone0.filter((i) => healAmount(i.heal, 10) >= 1).length;
    expect(gone).toBeGreaterThan(zone0.length * 0.15);
    expect(gone).toBeLessThan(zone0.length * 0.85);
  });

  it('legt Blütenkränze um die Knoten der Müll-Welten (blühen, sobald der Knoten geschafft ist)', () => {
    const blooms = all.flatMap((c) => c.trash.nodeBlooms);
    expect(blooms.length).toBeGreaterThan(100);
    const zone0 = path.nodes.filter((n) => n.zone === 0).map((n) => n.index);
    for (const b of blooms) {
      // Schwelle = Knotenindex + 1 (ganzzahlig), Blüte am Boden
      expect(Number.isInteger(b.heal)).toBe(true);
      const r = Math.hypot(...b.position);
      const g = 32 + field.heightAt(b.position[0] / r, b.position[1] / r, b.position[2] / r);
      expect(Math.abs(r - g)).toBeLessThan(0.05);
    }
    // Startwelt: fast jeder Knoten der Zone 0 hat seinen Kranz
    const withRing = new Set(blooms.map((b) => b.heal - 1));
    expect(zone0.filter((i) => withRing.has(i)).length).toBeGreaterThan(zone0.length * 0.6);
  });

  it('lässt überwachsene Ruinen stehen (heals: false)', () => {
    const forest: Array<TrashSpec | undefined> = worlds.map(() => undefined);
    forest[0] = { ruins: 0.02, debris: 0.3, neon: 0, heals: false };
    const p = new TrashPlanner(context({ specs: forest }));
    const list = chunkList(3).flatMap((id) => p.chunk(id).items);
    expect(list.length).toBeGreaterThan(0);
    for (const it of list) expect(healAmount(it.heal, 100)).toBe(0);
  });

  it('liefert ein Schleier-Gitter nur über Müll-Welten, dünn auf dem Pfad', () => {
    const veiled = all.filter((c) => c.trash.veil);
    expect(veiled.length).toBeGreaterThan(0);
    for (const c of veiled) {
      const v = c.trash.veil!;
      expect(v.dirs.length).toBe(v.n * v.n * 3);
      expect(Math.max(...v.strength)).toBeGreaterThan(0);
      expect(v.heights.length).toBeGreaterThan(0);
      for (const h of v.heal) expect(h).toBeGreaterThan(0);
      for (const o of v.open) expect(o).toBeGreaterThanOrEqual(0);
    }
    // Chunks ohne Müll-Welt tragen keinen Schleier und keinen Müll
    const clean = all.filter((c) => c.trash.items.length === 0 && !c.trash.veil);
    expect(clean.length).toBeGreaterThan(10);
    // Sporen schweben über dem Boden
    const spores = veiled.flatMap((c) => c.trash.spores);
    expect(spores.length).toBeGreaterThan(20);
    for (const s of spores.slice(0, 200)) {
      const r = Math.hypot(...s.position);
      const g = 32 + field.heightAt(s.position[0] / r, s.position[1] / r, s.position[2] / r);
      expect(r).toBeGreaterThan(g + 0.1);
    }
  });
});
