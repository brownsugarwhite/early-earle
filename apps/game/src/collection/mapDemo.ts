import { Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import type { PathLayout } from '../flow/path';
import type { MapWorld } from '../flow/MapWorld';
import { createMapCreatures, type MapCreaturesApi } from '../flow/MapCreatures';
import { createMapGround, type MapGroundAdapter } from '../flow/mapGround';
import { useFlowStore } from '../flow/flowStore';
import { useProgress, collectionKey, type CollectionEntry } from '../state/progress';
import { BUNDLED_RULES } from '../lab/creature/content';
import { catalogFor, levelIdOf, seedFor } from './catalog';

/**
 * Prüfpfad vor der Flow-Integration (B4): `/play?mapCreatures=demo` setzt die Map-Wesen auf die echte Karte der
 * FlowScene (Entwicklung: über den Debug-Griff `window.__ee.controller`), mit einem Dutzend Wesen rund um den
 * aktuellen Knoten (oder den gespeicherten, wenn es schon welche auf der Map gibt). `window.__ee.mapCreatures`
 * löst Aufbrüche und Einfallen aus (Tests, Screenshots). So erzeugt der Flow sie später selbst:
 *
 *   const ground = createMapGround(world, layout);
 *   const creatures = createMapCreatures(ground, { cap: mobile ? 7 : 14, mobile, shadowLayer: SHADOW_PROXY_LAYER, library, rules });
 *   world.planet.add(creatures.group);
 *   creatures.restore(Object.values(useProgress.getState().collection));
 *   // je Bild: if (creatures.update(dt, world.camera)) world.markShadowDirty();
 */
interface FlowDebug {
  world?: MapWorld;
  layout?: PathLayout;
  update(dt: number, elapsed: number, ctx: unknown): void;
}

export interface MapCreaturesDemo {
  creatures: MapCreaturesApi;
  ground: MapGroundAdapter;
  entries: CollectionEntry[];
  /** Ein neues Wesen verlässt ein (gedachtes) Plateau am Knoten `node` und läuft heim; Sekunden bis zur Ankunft. */
  release(node?: number): number;
  /** Ein neues Wesen fällt am Knoten `node` ein. */
  drop(node?: number): void;
}

export function installMapCreaturesDemo(): () => void {
  if (typeof location === 'undefined' || new URLSearchParams(location.search).get('mapCreatures') !== 'demo') return () => undefined;
  let stop = false;
  let cleanup: (() => void) | null = null;
  const tryAttach = (): void => {
    if (stop) return;
    const ee = (window as unknown as { __ee?: { controller?: FlowDebug } & Record<string, unknown> }).__ee;
    const scene = ee?.controller;
    if (!scene?.world || !scene.layout) {
      setTimeout(tryAttach, 250);
      return;
    }
    cleanup = attach(scene, ee!);
  };
  tryAttach();
  return () => {
    stop = true;
    cleanup?.();
  };
}

function attach(scene: FlowDebug, ee: Record<string, unknown>): () => void {
  const world = scene.world!;
  const layout = scene.layout!;
  const mobile = window.innerWidth < 700;
  const ground = createMapGround(world, layout);
  const creatures = createMapCreatures(ground, { cap: mobile ? 7 : 14, mobile, shadowLayer: 1 });
  world.planet.add(creatures.group);
  creatures.onPlaced = (key) => {
    if (useProgress.getState().collection[key]) useProgress.getState().markPlaced(key);
  };
  const placed = Object.values(useProgress.getState().collection).filter((e) => e.placedOnMap);
  const entries = placed.length > 0 ? placed : demoEntries(useFlowStore.getState().current, layout.nodes.length);
  creatures.restore(entries);
  // Die Szene zeichnet in `update`: die Wesen davor aktualisieren (ihr Schattenpass ist dann schon angefordert).
  const original = scene.update;
  scene.update = (dt, elapsed, ctx) => {
    const camera = (world as unknown as { camera: Camera }).camera;
    if (creatures.update(dt, camera)) world.markShadowDirty();
    original.call(scene, dt, elapsed, ctx);
  };
  let extra = 0;
  const demo: MapCreaturesDemo = {
    creatures,
    ground,
    entries,
    release(node = useFlowStore.getState().current) {
      const e = fresh(node, extra++);
      const n = layout.nodes[node]!;
      // Der Plateau-Rand: ein Punkt 2,6 vor dem Knoten (wie ein Brett-Rand), das Plateau sinkt in 0,9 s.
      const c = new Vector3(n.position[0], n.position[1], n.position[2]);
      const up = c.clone().normalize();
      const side = new Vector3(0, 1, 0).cross(up).normalize();
      const rim = c.clone().addScaledVector(side, 2.6);
      const frame = { position: new Vector3(), normal: new Vector3() };
      ground.ground(rim, frame);
      const top = frame.position.clone().addScaledVector(frame.normal, 0.35);
      const t0 = performance.now();
      return creatures.release(e, {
        position: frame.position,
        normal: frame.normal,
        scale: 0.2,
        ride: (out) => {
          const k = Math.min(1, (performance.now() - t0) / 900);
          out.copy(top).addScaledVector(frame.normal, -0.37 * k);
          return k < 1;
        },
      });
    },
    drop(node = useFlowStore.getState().current) {
      creatures.dropIn(fresh(node, extra++), 0.1);
    },
  };
  ee['mapCreatures'] = demo;
  return () => {
    scene.update = original;
    creatures.dispose();
    if (ee['mapCreatures'] === demo) delete ee['mapCreatures'];
  };
}

/** Ein Dutzend Wesen der Zone rund um den Knoten: verschiedene Stufen und Arten, teils mehrere je Knoten. */
function demoEntries(current: number, nodeCount: number): CollectionEntry[] {
  const catalog = catalogFor(BUNDLED_RULES);
  const zoneOf = (node: number) => (node < 25 ? 'tjorizo' : node < 50 ? 'syrup' : node < 75 ? 'luzz' : 'wooding');
  const out: CollectionEntry[] = [];
  const picks: Array<[number, number, string]> = [
    [0, 1, 'blob'],
    [0, 6, 'retriever'],
    [1, 3, 'blob'],
    [-1, 8, 'elephant'],
    [2, 7, 'rex'],
    [2, 5, 'mouse'],
    [-2, 9, 'duck'],
    [3, 6, 'snake'],
    [1, 10, 'giraffe'],
    [4, 2, 'blob'],
    [-3, 12, 'elephant'],
    [5, 8, 'retriever'],
  ];
  picks.forEach(([dn, tier, species], i) => {
    const node = Math.min(nodeCount - 1, Math.max(0, current + dn));
    const zone = zoneOf(node);
    const e = catalog.find((c) => c.zone === zone && c.tier === tier && c.species === species) ?? catalog.find((c) => c.zone === zone && c.tier === tier)!;
    out.push({ key: e.key + (out.some((o) => o.key === e.key) ? `#${i}` : ''), zone: e.zone, tier: e.tier, species: e.species, bodyType: e.bodyType, seed: seedFor(BUNDLED_RULES, e), levelId: levelIdOf(node), node, at: Date.now(), count: 1, seen: true, placedOnMap: true });
  });
  return out;
}

/** Ein neues Wesen für Aufbruch/Einfallen am Knoten (nicht in der Sammlung: nur Demo). */
function fresh(node: number, k: number): CollectionEntry {
  const catalog = catalogFor(BUNDLED_RULES);
  const zone = node < 25 ? 'tjorizo' : node < 50 ? 'syrup' : node < 75 ? 'luzz' : 'wooding';
  const list = catalog.filter((c) => c.zone === zone && c.tier >= 5);
  const e = list[(k * 7 + 3) % list.length]!;
  return { key: `${collectionKey(e.zone, e.tier, e.species)}#demo${k}`, zone: e.zone, tier: e.tier, species: e.species, bodyType: e.bodyType, seed: seedFor(BUNDLED_RULES, e), levelId: levelIdOf(node), node, at: Date.now(), count: 1, seen: false, placedOnMap: false };
}
