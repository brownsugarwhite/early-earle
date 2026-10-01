import type { Camera, Object3D } from 'three/webgpu';
import { bus } from '../../state/bus';
import { useProgress } from '../../state/progress';
import { SHADOW_PROXY_LAYER } from '../Hero';
import { creatureLibrary } from '../LevelBoard';
import { createMapCreatures, type MapCreaturesApi, type MapGround } from '../MapCreatures';
import type { FlowQuality } from '../quality';

/**
 * Hält die erspielten Wesen der Map (MapCreatures, gebaut von der Sammlungs-Baustelle) für den Flow: erzeugt sie, sobald
 * die gemeinsame Modulbibliothek des Bretts geladen ist, setzt beim Start und beim Moduswechsel alle Wesen des aktiven
 * Stands mit `placedOnMap` an ihre Wohnorte und aktualisiert sie je Frame (Schattenpass gedrosselt: 10 Hz, mobil 6 Hz).
 */
export class CreatureHost {
  /** null, solange die Bibliothek lädt (Aufbrüche davor tragen die Wesen nur ein; `restore` holt sie nach). */
  api: MapCreaturesApi | null = null;
  private disposed = false;
  private shadowAt = -1;
  private readonly off: Array<() => void> = [];

  constructor(
    private readonly opts: {
      ground: MapGround;
      /** Eltern der Wesen-Gruppe (`world.planet`, der Anzeigeraum; die Wesen setzen sich über `ground.display`). */
      planet: Object3D;
      quality: FlowQuality;
      markShadowDirty(): void;
    },
  ) {
    const mobile = opts.quality.name === 'mobil';
    void creatureLibrary()
      .catch(() => null)
      .then((c) => {
        if (this.disposed) return;
        this.api = createMapCreatures(opts.ground, { cap: opts.quality.mapCreatureCap, mobile, shadowLayer: SHADOW_PROXY_LAYER, library: c?.library ?? null, rules: c?.rules ?? null });
        opts.planet.add(this.api.group);
        this.restore();
      });
    const onMode = (): void => this.restore();
    bus.on('progress/mode', onMode);
    this.off.push(() => bus.off('progress/mode', onMode));
  }

  /** Alle Wesen des aktiven Stands, die schon auf der Map wohnen. */
  restore(): void {
    this.api?.restore(Object.values(useProgress.getState().collection).filter((e) => e.placedOnMap));
  }

  update(dt: number, camera: Camera, elapsed: number): void {
    const api = this.api;
    if (!api) return;
    const hz = this.opts.quality.name === 'mobil' ? 6 : 10;
    if (api.update(dt, camera) && elapsed - this.shadowAt >= 1 / hz) {
      this.shadowAt = elapsed;
      this.opts.markShadowDirty();
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const f of this.off) f();
    this.off.length = 0;
    this.api?.dispose();
    this.api = null;
  }
}
