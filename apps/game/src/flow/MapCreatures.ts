import { Group, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { hash32, type GenomeRules, type ZoneId } from '@ee/genome';
import { CreatureHerd, type HerdMember, type ModuleLibrary } from '@ee/render';
import type { CollectionEntry } from '../state/progress';
import { BUNDLED_RULES } from '../lab/creature/content';
import { creatureLibrary } from './LevelBoard';

/**
 * Erspielte Wesen auf der Map (Iteration 4, Punkt 5). Vertrag zwischen Flow (erzeugt, aktualisiert, ruft `release`
 * beim Aufbruch) und der Sammlungs-Baustelle (baut die echte Darstellung).
 *
 * Nahtstelle für ADR 0002: Alle Positionen kommen über `MapGround` — heute Kugel (surfaceRadius, bend), später die
 * unendliche Ebene mit Anzeige-Abbildung. Nichts darf schweben: Füße immer auf `ground()`.
 */
export interface GroundFrame {
  /** Punkt auf dem Boden (im Raum der Map-Gruppe, vor der Anzeige-Abbildung). */
  position: Vector3;
  /** Bodennormale. */
  normal: Vector3;
}

export interface MapGround {
  /** Wohnort Nummer `slot` am Knoten `node` (trocken, nicht auf dem Pfad, in der Lichtung); false, wenn keiner frei ist. */
  homeSpot(node: number, slot: number, out: GroundFrame): boolean;
  /** Projiziert einen Punkt auf begehbaren Boden (Füße auf dem Netz). */
  ground(p: Vector3, out: GroundFrame): void;
  /** Anzeige-Abbildung (heute `world.bend`), damit Wesen mit der überzeichneten Krümmung gehen. */
  display(p: Vector3, out: Vector3): Vector3;
  /** Blickpunkt der Karte (derselbe, den die Scroll-Grenze benutzt): entscheidet, welche Wesen leben. */
  focus(out: Vector3): Vector3;
  /** Optional: trocken und kein Fels (Wanderziele); ohne gilt jeder Punkt nahe dem Wohnort. */
  walkable?(p: Vector3): boolean;
  /** Optional: nur der Bodenpunkt (ohne Normale, billiger — die Füße fragen oft). */
  groundPoint?(p: Vector3, out: Vector3): Vector3;
}

export interface MapCreaturesOptions {
  /** Höchstzahl gleichzeitig lebender Wesen (Mobil 7, Hoch 14). */
  cap: number;
  mobile: boolean;
  /** Layer der Schatten-Proxys (Brett und Held: 1). */
  shadowLayer: number;
  /** Gemeinsame GLB-Modulbibliothek des Bretts; darf später nachgereicht werden (`setLibrary`). */
  library?: ModuleLibrary | null;
  rules?: GenomeRules | null;
}

export interface MapCreaturesApi {
  /** Kind von `world.planet` (bzw. später des Ebenen-Ankers). */
  readonly group: Group;
  /**
   * Beim Start: alle Wesen mit `placedOnMap` an ihre Wohnorte setzen. Wieder aufgerufen (Moduswechsel, geleerte
   * Sammlung) gleicht es ab: wer nicht mehr dabei ist, geht (außer Wesen, die gerade heimlaufen).
   */
  restore(entries: CollectionEntry[]): void;
  /**
   * Aufbruch: ein Wesen verlässt das Plateau am Rand `from` und läuft zu seinem Wohnort am Fundknoten.
   * `ride` liefert während der Übergabe die Oberkante des sinkenden Plateaus. Rückgabe: Sekunden bis zur Ankunft.
   */
  release(entry: CollectionEntry, from: GroundFrame & { scale: number; ride?: (out: Vector3) => boolean }): number;
  /** Weitere neue Wesen des Levels fallen nahe ihrem Wohnort ein. */
  dropIn(entry: CollectionEntry, delay?: number): void;
  /** Pro Frame; `true`, wenn sich Schattenwerfer bewegt haben (Schattenpass nötig). */
  update(dt: number, camera: Camera): boolean;
  dispose(): void;
  /** Die Modulbibliothek (Teile) und Regeln kommen nach (optional; ohne Bibliothek tragen die Wesen keine Teile). */
  setLibrary?(library: ModuleLibrary | null, rules?: GenomeRules | null): void;
  /** Ein Wesen ist daheim angekommen (Aufbruch, Einfallen): der Flow kann es als "wohnt auf der Map" markieren. */
  onPlaced?: ((key: string) => void) | null;
  /**
   * Sperrzone (Raum der Map-Gruppe, vor der Anzeige): Wesen, die dort wohnen, ploppen weg und kommen erst wieder, wenn
   * sie aufgehoben ist — z. B. um das Plateau, solange ein Level auf dem Knoten steht. `null` hebt sie auf.
   */
  setExclusion?(center: Vector3 | null, radius?: number): void;
  /** Lebende Wesen (Tests, Debug). */
  readonly liveCount?: number;
  /** Zustand je Wesen (Tests, Debug): Kontaktpunkt der Füße, der angezeigte Boden darunter, Wohnort, Phase. */
  probe?(): MapCreatureProbe[];
}

export interface MapCreatureProbe {
  key: string;
  live: boolean;
  phase: string;
  /** Wo die Füße stehen (Raum der Map-Gruppe, angezeigt) und der angezeigte Bodenpunkt darunter. */
  contact: Vector3 | null;
  ground: Vector3 | null;
  /** Unangezeigter Bodenpunkt unter den Füßen (vor `display`). */
  groundRaw: Vector3 | null;
  home: Vector3;
  /** Entfernung (lokal) zum Wohnort. */
  fromHome: number;
}

/** Leben: ein ≤ 11 Einheiten vom Blickpunkt, weg ab 13 (Hysterese); Prüfung 2 × je Sekunde; Ein-/Ausploppen 0,25 s. */
export const LIVE_IN = 11;
export const LIVE_OUT = 13;
const LIVE_EVERY = 0.5;
const POP_S = 0.25;
/** Wandern um den Wohnort: Radius, Pausen; Mindestabstand zweier Wohnorte am selben Knoten. */
const WANDER_R = 0.9;
const HOME_GAP = 0.75;
const PAUSE_MIN = 3;
const PAUSE_MAX = 8;
/** Schattenpass höchstens 10 × (Mobil 6 ×) je Sekunde, solange Wesen sich bewegen. */
const SHADOW_HZ = 10;
const SHADOW_HZ_MOBILE = 6;

/** Größe des Helden auf der Map (FlowScene HERO_MAP_SCALE): der Maßstab der Wesen dort. */
export const MAP_HERO_SCALE = 0.48;

/**
 * Größe auf der Map (Blob-Einheit → Welt) relativ zum Helden: Stufe 1 = 0,42 × Held, ab Stufe 9 = 0,9 × Held — Earles
 * kleine Maßstabsfiguren neben dem Pfad, die großen fast so groß wie der Held.
 */
export function mapScaleForTier(tier: number): number {
  return MAP_HERO_SCALE * Math.min(0.9, 0.42 + 0.06 * (Math.max(1, tier) - 1));
}

type Phase = 'home' | 'ride' | 'walkHome' | 'fall' | 'twin';

interface Resident {
  entry: CollectionEntry;
  key: string;
  /** Wohnort auf dem Boden (Planetenraum) und sein Rahmen (lokales +y = Bodennormale). */
  home: Vector3;
  normal: Vector3;
  t1: Vector3;
  t2: Vector3;
  frame: Quaternion;
  hasHome: boolean;
  member: HerdMember | null;
  phase: Phase;
  /** Zeit bis zum nächsten Wandern / Ereignis. */
  timer: number;
  /** 0..1 Ein-/Ausploppen (Richtung). */
  pop: number;
  popDir: 1 | -1;
  /** Größe gegenüber der Map-Größe (Aufbruch: vom Brett her), strebt zu 1. */
  size: number;
  /** Aufbruch: Plateau-Oberkante (während `ride`), Fallhöhe (Einfallen), Zwilling. */
  ride: ((out: Vector3) => boolean) | null;
  fallV: number;
  twin: Resident | null;
  /** Muss leben (Aufbruch, Einfallen), egal wie weit vom Blickpunkt. */
  pinned: boolean;
  /** Wartet (Einfallen mit Verzögerung): noch nicht zeigen. */
  hold: boolean;
  /** Verlässt die Map (Zwilling angekommen). */
  leaving: boolean;
}

const _p = new Vector3();
const _q = new Vector3();
const _f = new Vector3();
const _m = new Matrix4();
const _frame: GroundFrame = { position: new Vector3(), normal: new Vector3() };

/**
 * Die erspielten Wesen wohnen neben dem Knoten, an dem sie gefunden wurden: jedes mit seinem Aussehen (Seed + Art),
 * lebendig in einem eigenen Bodenrahmen (CreatureHerd), die Füße auf dem gezeichneten Gelände. Nur die nächsten am
 * Blickpunkt leben (Obergrenze `cap`, 11/13 Einheiten Hysterese); sie wandern gemächlich um ihren Wohnort. Der Aufbruch
 * eines Levels schickt neue Wesen vom Plateau-Rand heim (`release`) oder lässt sie nahe dem Wohnort einfallen (`dropIn`);
 * ein Doppelgänger läuft zu seinem Zwilling und verschwindet.
 */
export function createMapCreatures(ground: MapGround, options: MapCreaturesOptions): MapCreaturesApi {
  const group = new Group();
  group.name = 'map-creatures';
  let rules: GenomeRules | null = options.rules ?? BUNDLED_RULES;
  let herd: CreatureHerd | null = null;
  const residents: Resident[] = [];
  const byKey = new Map<string, Resident>();
  const slotsAt = new Map<number, number>();
  let liveT = 0;
  let shadowT = 0;
  let disposed = false;
  const shadowEvery = 1 / (options.mobile ? SHADOW_HZ_MOBILE : SHADOW_HZ);
  let library: ModuleLibrary | null = options.library ?? null;

  const ensureHerd = (): CreatureHerd | null => {
    if (herd || !rules || disposed) return herd;
    herd = new CreatureHerd({ rules, library, capacity: Math.min(36, options.cap + 6), mobile: options.mobile, shadowLayer: options.shadowLayer, contactShadows: null, maxPartPools: options.mobile ? 14 : 20 });
    group.add(herd.group);
    return herd;
  };

  /** Der Rahmen eines Wohnorts: Normale nach oben, eine feste Tangente (je Schlüssel gedreht). */
  const makeResident = (entry: CollectionEntry): Resident => {
    // Der nächste freie Platz am Knoten, der nicht auf einem Nachbarn liegt.
    let slot = slotsAt.get(entry.node) ?? 0;
    let hasHome = false;
    for (let tries = 0; tries < 8; tries++) {
      hasHome = ground.homeSpot(entry.node, slot++, _frame);
      if (hasHome && !residents.some((o) => o.hasHome && o.entry.node === entry.node && o.home.distanceTo(_frame.position) < HOME_GAP)) break;
    }
    slotsAt.set(entry.node, slot);
    const home = _frame.position.clone();
    const normal = _frame.normal.clone().normalize();
    const t1 = new Vector3(0, 1, 0);
    if (Math.abs(normal.y) > 0.9) t1.set(1, 0, 0);
    t1.addScaledVector(normal, -t1.dot(normal)).normalize();
    const t2 = new Vector3().crossVectors(t1, normal).normalize();
    // Lokale Achsen: x = t1, y = Normale, z = t2 (rechtshändig: t1 × n = t2… x × y = z).
    _m.makeBasis(t1, normal, t2);
    const frame = new Quaternion().setFromRotationMatrix(_m);
    const r: Resident = { entry, key: entry.key, home, normal, t1, t2, frame, hasHome, member: null, phase: 'home', timer: pause(entry.key, 0), pop: 0, popDir: 1, size: 1, ride: null, fallV: 0, twin: null, pinned: false, hold: false, leaving: false };
    return r;
  };

  /** Bodenpunkt (billiger Weg, wenn der Boden ihn anbietet). */
  const groundPoint = (p: Vector3, out: Vector3): Vector3 => {
    if (ground.groundPoint) return ground.groundPoint(p, out);
    ground.ground(p, _frame);
    return out.copy(_frame.position);
  };

  /**
   * Lokaler Boden des Rahmens: Höhe des Geländes über der Tangentialebene am Wohnort. Die Füße fragen mehrmals je Bild
   * an fast denselben Stellen: ein kleiner Zwischenspeicher je Wesen (Raster 4 cm).
   */
  const localGround = (r: Resident) => {
    const cache = new Map<number, number>();
    const _g = new Vector3();
    return (x: number, z: number): number => {
      const key = Math.round(x * 25) * 100003 + Math.round(z * 25);
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      _g.copy(r.home).addScaledVector(r.t1, x).addScaledVector(r.t2, z);
      groundPoint(_g, _g);
      const h = _g.sub(r.home).dot(r.normal);
      if (cache.size > 256) cache.clear();
      cache.set(key, h);
      return h;
    };
  };

  const spawn = (r: Resident, at?: readonly [number, number]): boolean => {
    const h = ensureHerd();
    if (!h || r.member || !r.hasHome || h.full) return false;
    const e = r.entry;
    const genome = { zone: e.zone as ZoneId, tier: e.tier, seed: e.seed, species: e.species as never };
    let spec;
    try {
      spec = h.resolve(genome);
    } catch {
      return false;
    }
    const sk = spec.skeleton;
    const extent = spec.bodyType === 'blob' ? 2.2 : Math.max(2.2, sk.length * 0.84, sk.width);
    const scale = (mapScaleForTier(e.tier) * 2.2) / extent;
    const yaw = ((hash32('map-yaw', r.key) % 1000) / 1000) * Math.PI * 2;
    const m = h.add({ genome, scale, animated: true, yaw, at: at ?? [0, 0], ground: localGround(r) });
    if (!m) return false;
    m.quaternion.copy(r.frame);
    m.pop = 0.001;
    r.member = m;
    r.pop = 0;
    r.popDir = 1;
    return true;
  };

  const despawn = (r: Resident): void => {
    if (!r.member) return;
    herd?.remove(r.member);
    r.member = null;
    r.pop = 0;
  };

  const add = (entry: CollectionEntry): Resident => {
    const known = byKey.get(entry.key);
    if (known) {
      known.entry = entry;
      return known;
    }
    const r = makeResident(entry);
    residents.push(r);
    byKey.set(entry.key, r);
    return r;
  };

  /** Sperrzone (Plateau eines Levels): dort wohnende Wesen ruhen. */
  let exclusion: { center: Vector3; radius: number } | null = null;
  const excluded = (r: Resident): boolean => !!exclusion && !r.pinned && r.home.distanceTo(exclusion.center) < exclusion.radius;

  /** Welche Wesen leben: gepinnte immer, sonst die nächsten am Blickpunkt (11 rein, 13 raus), höchstens `cap`. */
  const updateLive = (): void => {
    const f = ground.focus(_f);
    const ranked = residents
      .filter((r) => r.hasHome && !r.leaving && !r.hold && !excluded(r))
      .map((r) => ({ r, d: r.home.distanceTo(f) }))
      .filter(({ r, d }) => r.pinned || d < (r.member ? LIVE_OUT : LIVE_IN))
      .sort((a, b) => Number(b.r.pinned) - Number(a.r.pinned) || a.d - b.d);
    const keep = new Set(ranked.slice(0, Math.max(0, options.cap)).map((x) => x.r));
    for (const r of residents) {
      if (keep.has(r)) {
        if (!r.member) spawn(r);
        else if (r.popDir < 0) r.popDir = 1;
      } else if (r.member && !r.pinned) r.popDir = -1;
    }
  };

  /** Rahmen und Anzeige: der Bodenpunkt unter dem Wesen wird angezeigt (Krümmung), der Rahmen folgt ihm. */
  const place = (r: Resident): void => {
    const m = r.member;
    if (!m) return;
    const [x, z] = m.motion ? m.motion.controller.position : [m.x, m.z];
    _q.copy(r.home).addScaledVector(r.t1, x).addScaledVector(r.t2, z);
    const g = groundPoint(_q, _f);
    const h = _q.copy(g).sub(r.home).dot(r.normal);
    // Der Kontaktpunkt (x, h, z) des Rahmens soll auf dem angezeigten Bodenpunkt liegen.
    ground.display(g, _p);
    _q.set(x, h, z).applyQuaternion(r.frame);
    m.origin.copy(_p).sub(_q);
  };

  const stepResident = (r: Resident, dt: number): void => {
    const m = r.member;
    if (!m) return;
    // Ein-/Ausploppen.
    r.pop = Math.min(1, Math.max(0, r.pop + (r.popDir * dt) / POP_S));
    const k = r.popDir > 0 ? easeOutBack(r.pop) : r.pop * r.pop;
    r.size += (1 - r.size) * (1 - Math.exp(-dt * (r.phase === 'walkHome' ? 1.6 : 3)));
    m.pop = Math.max(0.001, k * r.size);
    if (r.popDir < 0 && r.pop <= 0) {
      despawn(r);
      if (r.leaving) remove(r);
      return;
    }
    const ctl = m.motion?.controller;
    switch (r.phase) {
      case 'ride': {
        // Auf dem sinkenden Plateau: das Wesen fährt mit hinunter, dann läuft es heim.
        const onTop = r.ride ? r.ride(_p) : false;
        if (onTop) {
          const [x, z] = ctl ? ctl.position : [m.x, m.z];
          _q.copy(r.home).addScaledVector(r.t1, x).addScaledVector(r.t2, z);
          const g = groundPoint(_q, _f);
          m.lift = Math.max(0, _p.sub(g).dot(r.normal));
          if (m.lift > 0.04) break;
        }
        m.lift = 0;
        r.ride = null;
        r.phase = 'walkHome';
        ctl?.walkTo(0, 0);
        break;
      }
      case 'walkHome': {
        if (!ctl) break;
        const [x, z] = ctl.position;
        if (Math.hypot(x, z) < 0.12 && ctl.currentMode === 'idle') arrive(r);
        else if (ctl.currentMode === 'idle') ctl.walkTo(0, 0);
        break;
      }
      case 'fall': {
        r.fallV -= 9.8 * dt;
        m.lift = Math.max(0, m.lift + r.fallV * dt);
        if (m.lift <= 0) {
          m.lift = 0;
          herd?.poke(m, 1.2);
          arrive(r);
        }
        break;
      }
      case 'twin': {
        const twin = r.twin;
        if (!ctl || !twin?.member) {
          r.popDir = -1;
          r.leaving = true;
          break;
        }
        // Zum Zwilling laufen (seine Position im eigenen Rahmen), dort verschwinden.
        const tw = twin.member.center;
        _q.copy(tw).sub(r.home);
        const tx = _q.dot(r.t1);
        const tz = _q.dot(r.t2);
        const [x, z] = ctl.position;
        const near = Math.hypot(tx - x, tz - z) < Math.max(0.35, (m.radius + twin.member.radius) * 0.8);
        if (near) {
          herd?.poke(twin.member, 1);
          r.popDir = -1;
          r.leaving = true;
        } else if (ctl.currentMode === 'idle') ctl.walkTo(tx, tz);
        break;
      }
      default: {
        // Daheim: Pausen von 3–8 s, dann ein Stück wandern (höchstens 0,9 um den Wohnort, trocken).
        if (!ctl || ctl.currentMode !== 'idle') break;
        r.timer -= dt;
        if (r.timer > 0) break;
        r.timer = pause(r.key, performance.now());
        const hsh = hash32('map-wander', r.key, Math.floor(performance.now() / 997));
        const ang = ((hsh & 0xffff) / 0xffff) * Math.PI * 2;
        const rad = 0.25 + (((hsh >>> 16) & 0xffff) / 0xffff) * (WANDER_R - 0.25);
        const tx = Math.cos(ang) * rad;
        const tz = Math.sin(ang) * rad;
        _q.copy(r.home).addScaledVector(r.t1, tx).addScaledVector(r.t2, tz);
        if (ground.walkable && !ground.walkable(_q)) break;
        if (m.spec.bodyType === 'blob' && (hsh & 3) === 0) ctl.jumpTo(tx, tz);
        else ctl.walkTo(tx, tz);
      }
    }
  };

  const arrive = (r: Resident): void => {
    r.phase = 'home';
    r.pinned = false;
    r.timer = pause(r.key, performance.now());
    api.onPlaced?.(r.key);
  };

  const remove = (r: Resident): void => {
    despawn(r);
    const i = residents.indexOf(r);
    if (i >= 0) residents.splice(i, 1);
    if (byKey.get(r.key) === r) byKey.delete(r.key);
  };

  /** Sekunden, bis ein Wesen aus lokaler Entfernung `d` daheim ist (Schätzung für die Choreografie). */
  const walkSeconds = (r: Resident, d: number): number => {
    const speed = r.member?.motion?.controller.maxSpeed ?? 0.8;
    return d / Math.max(0.2, speed * 0.8) + 0.35;
  };

  const api: MapCreaturesApi & { liveCount: number } = {
    group,
    onPlaced: null,
    get liveCount() {
      return residents.filter((r) => r.member).length;
    },
    restore(entries) {
      // Abgleich: wer nicht mehr auf der Map wohnt (Moduswechsel, geleerte Sammlung), geht; neue ziehen ein.
      const placed = new Set(entries.filter((e) => e.placedOnMap).map((e) => e.key));
      for (const r of [...residents]) if (!placed.has(r.key) && !r.pinned && r.key === r.entry.key) remove(r);
      for (const e of entries) if (e.placedOnMap) add(e);
      liveT = 0;
    },
    release(entry, from) {
      const twin = byKey.get(entry.key);
      if (twin && twin.phase === 'home' && entry.placedOnMap) {
        // Doppelgänger: läuft vom Plateau zu seinem Zwilling und verschwindet dort.
        const dup = makeResident(entry);
        dup.key = `${entry.key}#${residents.length}`;
        dup.home.copy(twin.home);
        dup.normal.copy(twin.normal);
        dup.t1.copy(twin.t1);
        dup.t2.copy(twin.t2);
        dup.frame.copy(twin.frame);
        dup.hasHome = twin.hasHome;
        residents.push(dup);
        return startRelease(dup, from, twin);
      }
      const r = add(entry);
      return startRelease(r, from, null);
    },
    dropIn(entry, delay = 0) {
      const r = add(entry);
      r.pinned = true;
      r.hold = true;
      r.phase = 'fall';
      r.fallV = 0;
      const begin = () => {
        if (disposed) return;
        r.hold = false;
        if (!r.member && !spawn(r, [0, 0])) {
          r.pinned = false;
          r.phase = 'home';
          return;
        }
        const m = r.member!;
        m.lift = 2.4;
        r.fallV = 0;
        r.pop = 1;
        r.size = 1;
      };
      if (delay > 0) setTimeout(begin, delay * 1000);
      else begin();
    },
    update(dt, camera) {
      if (disposed) return false;
      if (!herd && rules) ensureHerd();
      liveT -= dt;
      if (liveT <= 0) {
        liveT = LIVE_EVERY;
        updateLive();
      }
      for (const r of [...residents]) {
        stepResident(r, dt);
        place(r);
      }
      const moved = herd ? herd.update(dt, camera) : false;
      shadowT -= dt;
      if (moved && shadowT <= 0) {
        shadowT = shadowEvery;
        return true;
      }
      return false;
    },
    dispose() {
      disposed = true;
      herd?.dispose();
      herd = null;
      residents.length = 0;
      byKey.clear();
      group.removeFromParent();
    },
    setLibrary(lib, r) {
      library = lib;
      if (r) rules = r;
      if (herd) herd.setLibrary(lib, r ?? null);
    },
    setExclusion(center, radius = 3.2) {
      exclusion = center ? { center: center.clone(), radius } : null;
      updateLive();
      liveT = LIVE_EVERY;
    },
    probe() {
      return residents.map((r) => {
        const m = r.member;
        if (!m) return { key: r.key, live: false, phase: r.phase, contact: null, ground: null, groundRaw: null, home: r.home.clone(), fromHome: 0 };
        const [x, z] = m.motion ? m.motion.controller.position : [m.x, m.z];
        const raw = groundPoint(new Vector3().copy(r.home).addScaledVector(r.t1, x).addScaledVector(r.t2, z), new Vector3());
        const shown = ground.display(raw, new Vector3());
        const h = raw.clone().sub(r.home).dot(r.normal);
        const contact = new Vector3(x, h, z).applyQuaternion(r.frame).add(m.origin).addScaledVector(r.normal, m.lift);
        return { key: r.key, live: true, phase: r.phase, contact, ground: shown, groundRaw: raw, home: r.home.clone(), fromHome: Math.hypot(x, z) };
      });
    },
  };

  // Ohne mitgegebene Bibliothek: die gemeinsame des Bretts (einmal geladen, geteilt).
  if (options.library === undefined) {
    void creatureLibrary().then((c) => {
      if (c && !disposed && !library) api.setLibrary?.(c.library, c.rules);
    });
  }

  function startRelease(r: Resident, from: GroundFrame & { scale: number; ride?: (out: Vector3) => boolean }, twin: Resident | null): number {
    // Start im Rahmen des Wohnorts: der Plateau-Rand in lokalen Koordinaten.
    _q.copy(from.position).sub(r.home);
    const x = _q.dot(r.t1);
    const z = _q.dot(r.t2);
    r.pinned = true;
    r.twin = twin;
    r.phase = from.ride ? 'ride' : twin ? 'twin' : 'walkHome';
    r.ride = from.ride ?? null;
    if (!r.member && !spawn(r, [x, z])) return 0;
    const m = r.member!;
    if (m.motion) m.motion.controller.teleport(x, z, Math.atan2(-x, -z));
    // Vom Brett her so groß wie dort, dann wächst es auf seine Map-Größe.
    r.size = Math.max(0.2, Math.min(1.5, from.scale / Math.max(1e-3, m.scale)));
    r.pop = 1;
    r.popDir = 1;
    m.pop = r.size;
    if (r.phase === 'walkHome') m.motion?.controller.walkTo(0, 0);
    if (r.phase === 'twin' && twin?.member) {
      _q.copy(twin.member.center).sub(r.home);
      m.motion?.controller.walkTo(_q.dot(r.t1), _q.dot(r.t2));
    }
    const d = Math.hypot(x, z);
    return (from.ride ? 1.0 : 0) + walkSeconds(r, d);
  }

  return api;
}

/** Pause vor dem nächsten Wandern (3–8 s, je Wesen und Zeitpunkt gestreut). */
function pause(key: string, t: number): number {
  const h = hash32('map-pause', key, Math.floor(t / 1000));
  return PAUSE_MIN + ((h & 0xffff) / 0xffff) * (PAUSE_MAX - PAUSE_MIN);
}

function easeOutBack(t: number): number {
  const c1 = 1.7;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
