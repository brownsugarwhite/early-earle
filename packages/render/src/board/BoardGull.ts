import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Group, Mesh, MeshBasicMaterial } from 'three/webgpu';
import type { GullTimes } from '@ee/core';
import type { WallClockTweens } from './boardTween';
import { GULL_HEIGHT, GULL_INDEX, GULL_REST_POSE, GULL_VERTS, awayInUV, gullCasterMatrix, gullCenter, gullOutline, gullPose, planGullFlight, type GullFlight, type GullFlightSpec, type GullPose } from './gullPath';

interface Bird {
  mesh: Mesh;
  geometry: BufferGeometry;
  /** (u, 0, v) je Eckpunkt, jede Frame neu geschrieben (Flügelschlag auf der CPU). */
  positions: Float32Array;
  attr: BufferAttribute;
  flight: GullFlight | null;
  tag: string | null;
  /** Startreihenfolge (der älteste Flug macht Platz, wenn beide Vögel fliegen). */
  order: number;
}

const linear = (t: number): number => t;

/**
 * Die Möwe, die man nur als Schatten sieht: zwei unsichtbare Werfer (je 21 Dreiecke, Pool für überlappende Flüge) auf
 * der Schattenebene, Kind des Brett-Lifts. Jeder Flug läuft als eigener Tween unter einem eindeutigen Tag `gull:N`
 * (ein Tag behält sein `hurry`-Tempo), damit ein schneller Wisch Brett und Möwe gemeinsam beschleunigt. Umriss und
 * Flug kommen aus `gullPath.ts`; hier werden nur Eckpunkte und Matrix geschrieben.
 *
 * Material: `MeshBasicMaterial` mit `side` und `shadowSide` = DoubleSide — eine flache Fläche, die der Sonne zugewandt
 * ist (NodeMaterials mit FrontSide würden die sonnenseitigen Fragmente im Schattenpass verwerfen). Im Leerlauf bleibt
 * ein eingeklappter Vogel sichtbar, damit die Schatten-Pipeline mit dem ersten Schattenpass des Bretts entsteht
 * (Warm-up), nicht erst beim ersten Flug.
 */
export class BoardGull {
  readonly group = new Group();
  private readonly birds: Bird[] = [];
  private readonly material: MeshBasicMaterial;
  private readonly pose: GullPose = { ...GULL_REST_POSE };
  private readonly center = { x: 0, z: 0, hx: 0, hz: 1 };
  private readonly matrix = new Array<number>(16);
  private seq = 0;
  /** Gestartete Flüge (Lab, Tests). */
  flights = 0;
  /** Letzter Flug: Schattenmitte und Zugzeit des zuletzt geschriebenen Frames, Zeiten, Zelle (Lab, Tests). */
  readonly last: { x: number; z: number; t: number; cell: [number, number]; released: boolean; times: GullTimes | null } = { x: 0, z: 0, t: -1, cell: [0, 0], released: false, times: null };

  constructor(
    private readonly tweens: WallClockTweens,
    shadowLayer: number,
  ) {
    this.group.name = 'board-gull';
    this.material = new MeshBasicMaterial({ color: '#000000', side: DoubleSide });
    this.material.shadowSide = DoubleSide;
    for (let i = 0; i < 2; i++) {
      const positions = new Float32Array(GULL_VERTS * 3);
      const attr = new BufferAttribute(positions, 3);
      attr.setUsage(DynamicDrawUsage);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', attr);
      geometry.setIndex(new BufferAttribute(GULL_INDEX, 1));
      const mesh = new Mesh(geometry, this.material);
      mesh.name = `board-gull-${i}`;
      mesh.layers.set(shadowLayer);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      // Reiner Werfer ohne Earle-Werferregeln: keine Aufweitung, kein Kontaktversatz, keine Terminator-Silhouette
      mesh.userData = { shadowDilate: false, shadowContact: false, shadowSmooth: false };
      mesh.visible = false;
      this.group.add(mesh);
      this.birds.push({ mesh, geometry, positions, attr, flight: null, tag: null, order: 0 });
    }
    this.park(this.birds[0]!, true);
  }

  /** Vögel im Flug. */
  get active(): number {
    let n = 0;
    for (const b of this.birds) if (b.flight) n++;
    return n;
  }

  /**
   * Startet einen Flug (Zeiten in s ab jetzt, wie die Zug-Tweens): der Schatten fliegt von `enterAt` bis `exitAt` und
   * steht bei `releaseAt` über der Zielzelle. Gibt den geplanten Flug zurück (Weg für Reaktionen auf dem Brett).
   */
  fly(spec: GullFlightSpec): GullFlight {
    let bird = this.birds.find((b) => !b.flight);
    if (!bird) {
      // Beide in der Luft: der älteste Flug ist fast draußen — zu Ende spulen und den Vogel übernehmen.
      bird = this.birds.reduce((a, b) => (a.order <= b.order ? a : b));
      if (bird.tag) this.tweens.finish(bird.tag);
    }
    const flight = planGullFlight(spec);
    const tag = `gull:${++this.seq}`;
    bird.flight = flight;
    bird.tag = tag;
    bird.order = this.seq;
    bird.mesh.visible = false;
    this.flights++;
    this.last.cell = [spec.cell[0], spec.cell[1]];
    this.last.released = false;
    this.last.t = -1;
    this.last.times = spec.times;
    const { enterAt, exitAt } = spec.times;
    const b = bird;
    this.tweens.add(
      Math.max(1e-3, exitAt - enterAt),
      (u) => {
        if (b.tag !== tag) return;
        this.write(b, enterAt + u * (exitAt - enterAt));
      },
      { delay: enterAt, ease: linear, tag, done: () => (b.tag === tag ? this.land(b) : undefined) },
    );
    return flight;
  }

  /** Ein schneller Wisch beschleunigt die laufenden Flüge (dasselbe Tempo wie der Zug). */
  hurry(factor: number): void {
    for (const b of this.birds) if (b.tag && b.flight) this.tweens.hurry(b.tag, factor);
  }

  /** Alle Flüge abbrechen (Level laden, nur Teile, Aufräumen); ein Vogel bleibt eingeklappt geparkt. */
  reset(): void {
    for (const b of this.birds) {
      if (b.tag) this.tweens.cancel(b.tag);
      b.flight = null;
      b.tag = null;
    }
    this.birds.forEach((b, i) => this.park(b, i === 0));
  }

  /** Warm-up: der geparkte, eingeklappte Vogel ist sichtbar (der Schattenpass baut seine Pipeline mit). */
  warm(): void {
    const b = this.birds[0]!;
    if (!b.flight) this.park(b, true);
  }

  dispose(): void {
    this.reset();
    for (const b of this.birds) b.geometry.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }

  private land(b: Bird): void {
    b.flight = null;
    b.tag = null;
    this.park(b, b === this.birds[0]);
  }

  /** Eingeklappt (alle Eckpunkte in einem Punkt: kein Fragment, aber ein Zeichenaufruf im Schattenpass) oder aus. */
  private park(b: Bird, visible: boolean): void {
    b.positions.fill(0);
    b.attr.needsUpdate = true;
    b.mesh.matrix.identity();
    b.mesh.matrix.elements[13] = GULL_HEIGHT;
    b.mesh.matrixWorldNeedsUpdate = true;
    b.mesh.visible = visible;
  }

  /** Schreibt Umriss und Werfermatrix für die Zugzeit `t`. */
  private write(b: Bird, t: number): void {
    const flight = b.flight;
    if (!flight) return;
    const c = gullCenter(flight, t, this.center);
    gullPose(flight, t, this.pose);
    const uv = gullOutline(flight.spec.span, this.pose, awayInUV(flight, c.hx, c.hz), _uv);
    const p = b.positions;
    for (let i = 0; i < GULL_VERTS; i++) {
      p[i * 3] = uv[i * 2]!;
      p[i * 3 + 1] = 0;
      p[i * 3 + 2] = uv[i * 2 + 1]!;
    }
    b.attr.needsUpdate = true;
    gullCasterMatrix(flight, c.x, c.z, c.hx, c.hz, this.matrix);
    b.mesh.matrix.fromArray(this.matrix);
    b.mesh.matrixWorldNeedsUpdate = true;
    b.mesh.visible = true;
    this.last.x = c.x;
    this.last.z = c.z;
    this.last.t = t;
    if (t >= flight.spec.times.releaseAt) this.last.released = true;
  }
}

const _uv = new Float32Array(GULL_VERTS * 2);
