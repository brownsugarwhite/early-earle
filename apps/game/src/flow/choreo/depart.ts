import { Vector3 } from 'three/webgpu';
import type { CreatureSpec } from '@ee/genome';
import { useGridStore } from '../../lab/grid/gridStore';
import { rexLine } from '../../lab/grid/rex';
import { bus } from '../../state/bus';
import { collectionKey, useProgress, type CollectionEntry } from '../../state/progress';
import { useFlowStore } from '../flowStore';
import { easeInOut, easeInOutQuint, type Ease } from '../tween';
import { hopArc, routeStops, walkDuration, type RouteStop } from './route';
import type { FlowStage } from './stage';

/**
 * Aufbruch und Weg (Iteration 4, Punkt 3): Nach einem gewonnenen Level springt der Blob nicht mehr direkt zum nächsten
 * Level. Er LANDET AUF DEM GESCHAFFTEN KNOTEN (die Blüte öffnet sich unter ihm) und HÜPFT über die Trittsteine zum
 * nächsten — dort springt die Freischaltung auf. So versteht man, dass man das nächste Level erreicht hat.
 *
 * Zeiten (Szenenuhr) für ein gewonnenes Level auf einer Bodenstrecke; `walkAt` = wann das Zielwesen den Rand erreicht
 * (`exitCreature`, ≈ 0,5–1,1 s):
 *
 *  0            Phase `depart`, REX „Geh …“; das Zielwesen läuft zum Rand in Richtung seines Wohnorts
 *  walkAt       es verlässt das Brett: neue Wesen ziehen auf die Map (MapCreatures.release/dropIn), sonst verschwindet es
 *  s0 = +0,1    der Held ploppt aus der Plateaumitte (eigenes Genom, Stufe 1, trägt nichts)
 *  s0 + 0,05    das Plateau sinkt (0,92 s), Kamera zurück in die Kartenansicht des Knotens (1,3 s), Nebel hoch
 *  s0 + 0,12    der Held springt auf den geschafften Knoten (0,95 s, Bogen 1,6)
 *  tLand        Landung; Feier: Blüte öffnet sich, die Strecke poppt Punkt für Punkt im Takt der Hüpfer
 *  tLand + 0,25 Phase `travel`: Hüpfer über die Punkte (je Punkt genau beim Aufpoppen), Kamera folgt
 *  + walkDur    letzter Hüpfer auf den nächsten Knoten: Freischalt-Pop, `progress/unlocked`, Phase `map`, REX
 *
 * Strecken am Riesenbaum (Schiene) und Level, die neben ihrem Knoten gespielt werden: bis zur Landung gleich (Sprung
 * auf den Sitz am Baum, Bogen 2,2 über 1,1 s), dann ein einziger Bogen samt Schienenfahrt wie bisher. Verlassen oder
 * verloren: bis zur Landung auf dem eigenen Knoten, dann direkt die Map.
 */
export const DEPART_TIMES = {
  /** Ohne Wesen, das zum Rand läuft (verlassen, verloren): der Held ploppt nach … */
  leave: 0.25,
  /** … bzw. so lange nach dem Abgang des Wesens. */
  pop: 0.1,
  sinkAt: 0.05,
  camera: 1.3,
  jumpAt: 0.12,
  jump: 0.95,
  jumpArc: 1.6,
  treeJump: 1.1,
  treeArc: 2.2,
  levelNodeAt: 0.55,
  shadowAt: 0.57,
  /** Nach der Landung beginnt der Weg. */
  travelAt: 0.25,
  /** Ein Bogen am Riesenbaum. */
  arc: 1.1,
  arcHeight: 2.6,
  /** Bodenkontakt zwischen zwei Hüpfern (der Landeimpuls wird sichtbar). */
  contact: 0.05,
} as const;

const TAG = 'depart';
/** Hüpfer: gleichmäßig vorwärts (der Bogen kommt aus dem Sinus der Flugbahn). */
const HOP_EASE: Ease = (t) => t;

/** Was die Tests und die Werkstatt über den letzten Weg wissen wollen. */
export interface TravelLog {
  mode: 'hops' | 'arc' | 'none';
  from: number;
  to: number;
  /** Dauer des Wegs (s). */
  walk: number;
  stops: RouteStop[];
  /** Abstand Held ↔ Pfadpunkt (Anzeige) bei jeder Landung; `dot` −1 = der Knoten. */
  landings: Array<{ dot: number; u: number; distance: number }>;
}

export interface DepartureHooks {
  /** Der Held steht (Phase `map`): `won` = neu freigeschalteter Knoten, sonst zurück auf dem eigenen. */
  arrived?(node: number, won: boolean): void;
}

/** Das Wesen des Bretts, das zum ersten Mal gefunden wurde (Schlüssel aus dem Bauplan, sonst über die Stufe). */
function matchEntry(fresh: CollectionEntry[], spec: CreatureSpec | null | undefined, tier: number): CollectionEntry | null {
  if (spec) {
    const key = collectionKey(spec.zone, spec.tier, spec.species);
    const hit = fresh.find((e) => e.key === key);
    if (hit) return hit;
  }
  return fresh.find((e) => e.tier === tier) ?? null;
}

const _v = new Vector3();

export class Departure {
  readonly from: number;
  readonly to: number;
  log: TravelLog;
  private fresh: CollectionEntry[] = [];
  private released = false;
  private landed = false;
  private arrivedFlag = false;
  private done = false;

  private constructor(
    private readonly stage: FlowStage,
    /** Gewonnen und es gibt einen nächsten Knoten: der Weg dorthin folgt. */
    readonly won: boolean,
    from: number,
    to: number,
    private readonly hooks: DepartureHooks,
  ) {
    this.from = from;
    this.to = to;
    this.log = { mode: 'none', from, to, walk: 0, stops: [], landings: [] };
  }

  /** Level → Map: gewonnen (Aufbruch, Landung, Weg) oder verlassen/verloren (zurück auf den eigenen Knoten). */
  static fromLevel(stage: FlowStage, won: boolean, hooks: DepartureHooks = {}): Departure {
    const flow = useFlowStore.getState();
    const from = flow.playing ?? flow.current;
    const to = won ? Math.min(from + 1, stage.layout.nodes.length - 1) : from;
    const d = new Departure(stage, won && to !== from, from, to, hooks);
    d.leaveLevel(won);
    return d;
  }

  /** Nur der Weg über die Punkte (Entwicklung: „Depart“ auf der Map). */
  static walk(stage: FlowStage, from: number, to: number, hooks: DepartureHooks = {}): Departure {
    const d = new Departure(stage, true, from, to, hooks);
    d.released = true;
    d.landed = true;
    d.travel();
    return d;
  }

  get finished(): boolean {
    return this.done;
  }

  /**
   * Abbruch (Sprung auf die Map, Abbau): alles, was der Fortschritt braucht, sofort — Knoten weiter, Freischaltung,
   * neue Wesen gelten als eingezogen. Den Rest (Held, Brett, Kamera) setzt der Aufrufer hart.
   */
  finishNow(): void {
    if (this.done) return;
    this.done = true;
    const { stage } = this;
    stage.tweens.cancel(TAG);
    if (!this.released) {
      this.released = true;
      const progress = useProgress.getState();
      for (const e of this.fresh) {
        stage.creatures?.dropIn(e, 0);
        progress.markPlaced(e.key);
      }
    }
    const flow = useFlowStore.getState();
    flow.setPlaying(null);
    if (this.won && !this.arrivedFlag) {
      this.arrivedFlag = true;
      flow.setCurrent(this.to);
      stage.path.setProgress(this.to, Math.max(stage.path.doneCount, this.from + 1));
      this.unlock();
    }
  }

  // ---------------------------------------------------------------------------------------------- level → node

  private leaveLevel(won: boolean): void {
    const { stage } = this;
    const { board, hero, tweens } = stage;
    const T = DEPART_TIMES;
    stage.setPhase('depart');
    useFlowStore.getState().setRex(won ? (rexLine('release') ?? 'Geh. Wir kommen nach.') : (rexLine('lose') ?? 'Nochmal.'));
    // The creatures found for the first time in this level (the collection records them during play).
    const levelId = useGridStore.getState().level?.id;
    this.fresh = won && levelId ? Object.values(useProgress.getState().collection).filter((e) => e.levelId === levelId && !e.placedOnMap) : [];

    // The goal creature walks, hops or slithers to the plateau rim — toward its home on the map when it is new.
    let walkAt: number = T.leave;
    let rim: Vector3 | null = null;
    let topEntry: CollectionEntry | null = null;
    const top = won ? board.topBlob() : null;
    if (top) {
      topEntry = matchEntry(this.fresh, board.blobInfo(top.id)?.spec, top.tier);
      const ex = board.exitCreature(top.id, ...this.exitDirection(topEntry));
      if (ex) {
        walkAt = ex.at;
        rim = ex.local.clone();
      }
    }
    tweens.after(walkAt, () => this.release(top, topEntry, rim), TAG);

    const s0 = walkAt + T.pop;
    const placed = stage.boardPlacement;
    // Onto the giant tree or back from a stage beside the node: the long jump to its seat.
    const long = !!placed?.away || stage.isTreeNode(this.from);
    tweens.after(s0, () => this.popHero(), TAG);
    tweens.after(
      s0 + T.sinkAt,
      () => {
        board.playSink(null);
        stage.cue('sink');
        stage.cameraToMap(this.from, T.camera);
        stage.stripesTo(0, 0.9);
      },
      TAG,
    );
    tweens.after(
      s0 + T.jumpAt,
      () => {
        stage.cue('heroJump');
        // The target is taken once the camera pulls out (the hero faces the map camera).
        hero.flyTo(stage.nodePose(this.from), { duration: long ? T.treeJump : T.jump, arc: long ? T.treeArc : T.jumpArc, ease: easeInOut, done: () => this.land() });
      },
      TAG,
    );
    tweens.after(s0 + T.levelNodeAt, () => stage.setLevelNode(null), TAG);
    tweens.after(s0 + T.shadowAt, () => stage.setShadowFocus(false), TAG);
  }

  /** Brett-lokale Richtung für den Abgang: zum Wohnort eines neuen Wesens, sonst zum nächsten Knoten. */
  private exitDirection(entry: CollectionEntry | null): [number, number] {
    const { stage } = this;
    let target: Vector3 | null = null;
    if (entry) {
      const frame = { position: new Vector3(), normal: new Vector3() };
      const slot = Object.values(useProgress.getState().collection).filter((e) => e.placedOnMap && e.node === entry.node).length;
      if (stage.ground.homeSpot(entry.node, slot, frame)) target = frame.position;
    }
    const node = stage.layout.nodes[this.to];
    if (!target && node) target = new Vector3(node.position[0], node.position[1], node.position[2]);
    const dir = stage.boardDirectionTo(this.to === this.from && !entry ? null : target);
    return [dir.x, dir.z];
  }

  /** Das Zielwesen verlässt das Brett; neue Wesen ziehen auf die Map. */
  private release(top: { id: number; tier: number } | null, topEntry: CollectionEntry | null, rim: Vector3 | null): void {
    if (this.released || this.done) return;
    this.released = true;
    const { stage } = this;
    const { board } = stage;
    const creatures = stage.creatures;
    if (top) {
      const info = board.blobInfo(top.id);
      const scale = info?.scale ?? board.worldScale(top.tier);
      board.setBlobHidden(top.id, true);
      if (rim && topEntry && creatures) {
        const frame = stage.boardFrame(rim, { position: new Vector3(), normal: new Vector3() });
        creatures.release(topEntry, { ...frame, scale, ride: (out) => stage.boardSurface(rim, out) });
      } else if (rim) {
        // Not new: it jumps off the rim and is gone (as before).
        board.splat(rim, scale);
      }
    }
    let k = 0;
    for (const e of this.fresh) if (e !== topEntry) creatures?.dropIn(e, 0.3 + 0.22 * k++);
    const progress = useProgress.getState();
    for (const e of this.fresh) progress.markPlaced(e.key);
    if (this.fresh.length > 0) stage.cue('creatureRelease');
  }

  /** Der Held ploppt aus der Plateaumitte: sein eigener Körper, Stufe 1, nichts dabei. */
  private popHero(): void {
    const { hero, board } = this.stage;
    hero.setTier(1);
    const scale = board.worldScale(1);
    const centre = new Vector3();
    hero.setPose(this.stage.boardPose(centre, scale));
    hero.root.visible = true;
    hero.impulse(1.3);
    board.splat(centre, scale);
    this.stage.cue('splat', 0.6);
  }

  /** Landung auf dem eigenen Knoten. */
  private land(): void {
    if (this.landed || this.done) return;
    this.landed = true;
    const { stage } = this;
    stage.cue('heroLand');
    stage.board.root.visible = false;
    stage.board.unbind();
    useFlowStore.getState().setPlaying(null);
    if (!this.won) {
      this.done = true;
      stage.enterMap();
      this.hooks.arrived?.(this.from, false);
      return;
    }
    this.travel();
  }

  // ---------------------------------------------------------------------------------------------- node → next node

  private travel(): void {
    const { stage } = this;
    const { path, tweens, hero } = stage;
    const T = DEPART_TIMES;
    const { from, to } = this;
    const rail = stage.isRailSegment(from, to);
    const stops = rail ? [] : routeStops(stage.layout.dots, from);
    const walk = rail ? T.arc : walkDuration(stops.length);
    this.log = { mode: rail ? 'arc' : 'hops', from, to, walk, stops, landings: [] };
    // The flower opens under the hero, the stretch pops dot by dot in time with the hops, the ring grows in at `to`.
    path.celebrate(from, to, walk, T.travelAt);
    path.setProgress(to, Math.max(path.doneCount, from + 1));
    this.walkStart = stage.now() + T.travelAt;
    tweens.after(
      T.travelAt,
      () => {
        if (this.done) return;
        stage.setPhase('travel');
        useFlowStore.getState().setCurrent(to);
        if (rail) {
          // Along the giant tree: one arc while the camera rides its rail and the planet turns (as before).
          stage.cameraToMap(to, walk + 0.2, easeInOutQuint);
          hero.flyTo(stage.nodePose(to), { duration: walk, arc: T.arcHeight, ease: easeInOut, done: () => this.arrive(-1, 1) });
          return;
        }
        // The camera follows progressively: the view glides to `to` over the whole walk.
        stage.focusNode(to, walk + 0.3, easeInOut);
        this.hop(stops, 0, walk);
      },
      TAG,
    );
  }

  /** Scene time the hops started at: hop k lands at `walkStart + u_k · walk`, when the celebration pops its dot. */
  private walkStart = 0;

  /**
   * Hop `k` of the walk. Hops are chained (the next one takes off after a short ground contact), each aimed at its
   * landing time on the scene clock — so slow frames never let two flights overlap and the landings stay on the beat.
   */
  private hop(stops: readonly RouteStop[], k: number, walk: number): void {
    if (this.done) return;
    const stop = stops[k];
    if (!stop) return;
    const { stage } = this;
    const hero = stage.hero;
    const last = k === stops.length - 1;
    const target = stop.dot < 0 ? stage.nodePose(this.to) : stage.routePose(this.from, stop);
    const length = hero.root.position.distanceTo(target.position);
    const landAt = this.walkStart + stop.u * walk;
    hero.flyTo(target, {
      duration: Math.max(0.06, landAt - stage.now()),
      arc: last ? 0.6 : hopArc(length),
      ease: last ? easeInOut : HOP_EASE,
      land: last ? 1.1 : 0.5,
      done: () => {
        if (last) {
          this.arrive(stop.dot, stop.u);
          return;
        }
        this.logLanding(stop.dot, stop.u);
        stage.cue('hop', 0.35);
        // Ground contact (the landing squash shows), then the next hop.
        const next = stops[k + 1]!;
        const contact = Math.min(DEPART_TIMES.contact, (next.u - stop.u) * walk * 0.25);
        stage.tweens.after(contact, () => this.hop(stops, k + 1, walk), TAG);
      },
    });
  }

  private logLanding(dot: number, u: number): void {
    const { stage } = this;
    const d = stage.layout.dots[dot];
    let target: Vector3;
    if (dot >= 0 && d) target = stage.display(_v.set(d.position[0], d.position[1], d.position[2]), new Vector3());
    else target = stage.nodePose(this.to).position;
    this.log.landings.push({ dot, u, distance: stage.hero.root.position.distanceTo(target) });
  }

  /** Auf dem neuen Knoten: Freischaltung (Pop, Klang, Bus), Phase `map`, dann REX. */
  private arrive(dot: number, u: number): void {
    if (this.arrivedFlag || this.done) return;
    this.logLanding(dot, u);
    this.arrivedFlag = true;
    this.done = true;
    const { stage } = this;
    stage.cue('heroLand');
    stage.cue('nodeUnlock');
    this.unlock();
    stage.enterMap();
    this.hooks.arrived?.(this.to, true);
  }

  /** Die Freischaltung wird sichtbar, wenn der Held ANKOMMT (nicht beim Sieg). */
  private unlock(): void {
    const p = useProgress.getState();
    this.stage.path.setReach(p.mode === 'real' ? p.reached : -1);
    bus.emit('progress/unlocked', { node: this.to });
  }
}
