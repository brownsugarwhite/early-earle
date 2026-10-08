import { Color, PerspectiveCamera, Scene } from 'three/webgpu';
import { posedPositions, stableJson, type Bauplan, type CreatureBuild } from '@ee/creature';
import { BuildClient } from './buildClient';
import { CreatureMesh, STIL_STANDARD, type WesenStil } from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { useAppStore } from '../../state/store';
import { createMeadow, type Meadow } from '../rex/meadow';
import { ANSICHTEN, Turntable, rahmenUm, type TurntableAnsicht } from './turntable';

export type WesenBoden = 'wiese' | 'weiss';

export interface WesenLabStats {
  vertices: number;
  triangles: number;
  bones: number;
  teeth: number;
  buildMs: number;
  resolution: number;
  pending: boolean;
  /** Letzter Baufehler (null = alles gut). */
  fehler: string | null;
  /** Angewandte Bauten seit dem Start (grob und fein), für Messungen. */
  builds: number;
}

/** Felder, die nur Farbe/Stil betreffen: ändern sie sich allein, braucht es kein neues Mesh. */
function formSchluessel(b: Bauplan): string {
  // Bewusst großzügig: alles außer Name, Muster/Farben und Verhalten baut neu (sicher, falls die Form später mehr liest).
  const form: Partial<Bauplan> = { ...b };
  delete form.name;
  delete form.muster;
  delete form.verhalten;
  return stableJson(form);
}

function stilSchluessel(b: Bauplan): string {
  return stableJson({ material: b.material, muster: b.muster });
}

/**
 * Grundformen-Lab: ein Wesen auf dem Drehteller (Earle-Wiese oder weißer Referenzgrund), live aus dem Bauplan
 * vermascht — grob beim Ziehen, fein nach kurzer Ruhe, beides im Worker („neuester gewinnt“). Reine Farb-/Stiländerungen
 * bauen kein Mesh, sie färben nur um (einmal je Bild). Ansichten: frei (`held`), Bögen-Kamera (`boegen`, Referenzmodus)
 * und Spielfeld (`brett`). Verben: Maul auf/zu, Blinzeln.
 */
export class WesenLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(ANSICHTEN.held.fov, 1, 0.05, 400);
  readonly turntable = new Turntable();
  private meadow: Meadow | null = null;
  private creature: CreatureMesh | null = null;
  private ctx: SceneContext | null = null;
  private bauplan: Bauplan | null = null;
  private stil: WesenStil = { ...STIL_STANDARD };
  private boden: WesenBoden = 'wiese';
  private ansicht: TurntableAnsicht = 'held';
  private highTimer: ReturnType<typeof setTimeout> | null = null;
  private lastBuild: CreatureBuild | null = null;
  private readonly builder = new BuildClient((msg) => {
    this.stats.fehler = msg;
    console.error('[wesen] Bau fehlgeschlagen:', msg);
  });
  private stats: WesenLabStats = { vertices: 0, triangles: 0, bones: 0, teeth: 0, buildMs: 0, resolution: 0, pending: false, fehler: null, builds: 0 };
  /** Auflösungen (Leitung: Held 80³, Vorschau 36³): grob beim Ziehen (passt sich der Bauzeit an), fein in Ruhe. */
  lowRes = 36;
  highRes = 88;
  /** Grobe Auflösung höchstens / mindestens (Ziel: ≤ 90 ms je grobem Bau, damit das Wesen beim Ziehen mitläuft). */
  private readonly lowMax = 36;
  private readonly lowMin = 24;
  private formKey = '';
  private stilKey = '';
  private stilDirty = false;
  /** Ausdehnung beim letzten Einpassen; Rahmen neu, wenn das Wesen deutlich wächst oder schrumpft. */
  private fitExtent = 0;
  /** Nächster feiner Bau passt die Kamera neu ein (neue Vorlage, neue Ansicht). */
  private fitNext: 'voll' | 'abstand' | null = 'voll';
  private openness = 0.3;
  private laufen = false;
  /** Standbild (Harness, Vergleichsbilder): kein Atmen, kein Blinzeln. */
  private readonly standbild: boolean;

  constructor(opts: { standbild?: boolean } = {}) {
    this.standbild = opts.standbild ?? false;
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'WesenLab';
    this.scene.add(this.camera);
    const quality = useAppStore.getState().effectiveQuality;
    this.meadow = createMeadow(this.scene, quality);
    this.meadow.target.visible = false;
    this.creature = new CreatureMesh({ stil: this.stil });
    this.creature.openness = this.openness;
    this.creature.laufen = this.laufen;
    this.creature.breathe = !this.standbild;
    this.scene.add(this.creature.root);
    this.turntable.attach(ctx.canvas);
    const a = ANSICHTEN[this.ansicht];
    this.turntable.setView({ yaw: a.yaw, pitch: a.pitch, fov: a.fov, distance: 3.4, target: [0, 0.55, 0] });
    this.applyBoden();
    if (this.bauplan) {
      this.creature.setStyle(this.bauplan, this.stil);
      this.stilKey = stilSchluessel(this.bauplan);
      this.formKey = formSchluessel(this.bauplan);
      this.stats.pending = true;
      this.rebuild(this.highRes);
    }
  }

  resize(ctx: SceneContext): void {
    this.ctx = ctx;
  }

  /**
   * Neuer Bauplan: Formänderung → grober Bau gleich, feiner nach Ruhe; nur Farben → Umfärben im nächsten Bild.
   * `neu` (Vorlage/Datei geladen, Rückgängig darüber): nach dem feinen Bau die Kamera neu einrahmen.
   */
  setBauplan(b: Bauplan, opts: { immediate?: boolean; neu?: boolean } = {}): void {
    const prev = this.bauplan;
    const immediate = opts.immediate ?? false;
    this.bauplan = b;
    if (!this.creature) return;
    const fk = formSchluessel(b);
    const sk = stilSchluessel(b);
    if (sk !== this.stilKey) {
      this.stilKey = sk;
      this.stilDirty = true;
    }
    if (prev && fk === this.formKey && !immediate) return;
    this.formKey = fk;
    if (opts.neu) this.fitNext = 'voll';
    if (this.highTimer) clearTimeout(this.highTimer);
    this.stats.pending = true;
    if (immediate || !prev) {
      this.rebuild(this.highRes);
      return;
    }
    // Grob sofort: der Worker baut immer nur den neuesten Stand („neuester gewinnt“), ein Zug am Regler läuft also
    // mit der Bauzeit mit (keine Entprellung, die beim Ziehen nie feuern würde). Fein erst nach kurzer Ruhe.
    this.rebuild(this.lowRes);
    this.highTimer = setTimeout(() => this.rebuild(this.highRes), 480);
  }

  /** Nur Stil/Licht (kein neues Mesh): einmal je Bild angewandt. */
  setStil(stil: WesenStil): void {
    this.stil = stil;
    this.stilDirty = true;
  }

  setBoden(boden: WesenBoden): void {
    this.boden = boden;
    this.applyBoden();
  }

  setSpin(on: boolean): void {
    this.turntable.spin = on;
  }

  setOpenness(o: number): void {
    const vorher = this.openness;
    this.openness = o;
    if (this.creature) this.creature.openness = o;
    // feste Ansichten rahmen die Pose ein (weit offenes Maul ragt sonst aus dem Bild)
    if (this.lastBuild && this.ansicht !== 'held' && Math.abs(o - vorher) > 0.05) this.frame('abstand', 0.35);
  }

  /** Feste Ansicht anfahren (Rahmen ums aktuelle Wesen, Winkel zurück); ohne Wesen beim nächsten Bau. */
  setAnsicht(name: TurntableAnsicht): void {
    this.ansicht = name;
    if (this.lastBuild) this.frame('voll', 0.5, true);
    else this.fitNext = 'voll';
  }

  /** Verben: Maul auf/zu setzt das Öffnungsziel (wie `setOpenness`), Blinzeln spielt einmal, Laufen schaltet den Demo-Gang um. */
  play(action: 'maulAuf' | 'maulZu' | 'blinzeln' | 'laufen'): void {
    if (action === 'blinzeln') this.creature?.play('blinzeln');
    else if (action === 'laufen') this.setLaufen(!this.laufen);
    else this.setOpenness(action === 'maulAuf' ? 1 : 0);
  }

  /** Demo-Gang an/aus (Beine schwingen, Körper wippt). */
  setLaufen(on: boolean): void {
    this.laufen = on;
    if (this.creature) this.creature.laufen = on;
  }

  getStats(): WesenLabStats {
    return { ...this.stats };
  }

  getBuild(): CreatureBuild | null {
    return this.lastBuild;
  }

  /** Die Kamera hat ihre feste Ansicht erreicht (keine Fahrt mehr). */
  get cameraSettled(): boolean {
    return !this.turntable.animating;
  }

  private applyBoden(): void {
    if (!this.meadow) return;
    const white = this.boden === 'weiss';
    this.meadow.group.visible = !white;
    this.scene.background = new Color(white ? '#ffffff' : '#7ce6d5');
  }

  private rebuild(resolution: number): void {
    if (!this.bauplan || !this.creature) return;
    const bauplan = this.bauplan;
    this.builder.request(bauplan, { resolution, smoothIterations: resolution >= 48 ? 6 : 3, weightSmoothing: resolution >= 48 ? 2 : 1 }, (build) => this.applyBuild(build, bauplan, resolution));
  }

  private applyBuild(build: CreatureBuild, bauplan: Bauplan, resolution: number): void {
    if (!this.creature) return;
    this.lastBuild = build;
    const current = this.bauplan ?? bauplan;
    // Stil des aktuellen Bauplans gilt (Farben können sich seit dem Auftrag geändert haben); setBuild färbt mit dem
    // zuletzt gesetzten Stil, ein noch offener Stilwechsel folgt im nächsten Bild.
    this.creature.setBuild(build, current);
    const coarse = resolution < this.highRes;
    if (coarse) {
      // Grobe Auflösung an die Bauzeit anpassen: zu langsam → gröber, viel Luft → feiner (in Grenzen)
      if (build.stats.ms > 90 && this.lowRes > this.lowMin) this.lowRes = Math.max(this.lowMin, this.lowRes - 2);
      else if (build.stats.ms < 45 && this.lowRes < this.lowMax) this.lowRes = Math.min(this.lowMax, this.lowRes + 2);
    }
    this.stats = {
      vertices: build.stats.vertexCount,
      triangles: build.stats.triangleCount,
      bones: build.bones.length,
      teeth: build.mouth?.teeth.length ?? 0,
      buildMs: Math.round(build.stats.ms),
      resolution,
      pending: coarse || this.builder.pending,
      fehler: null,
      builds: this.stats.builds + 1,
    };
    if (!coarse && this.fitNext) {
      this.frame(this.fitNext, this.fitExtent === 0 ? 0 : 0.5);
      this.fitNext = null;
      return;
    }
    // Wächst oder schrumpft das Wesen deutlich, Abstand nachführen — außer der Nutzer hat selbst gezoomt oder vergleicht
    // gerade mit einem Referenzbild (Bögen-Ansicht: die Kamera bleibt stehen, bis „Bögen-Ansicht“ sie neu einpasst)
    const ext = this.extent(build);
    if (!coarse && this.ansicht !== 'boegen' && !this.turntable.userZoomed && Math.abs(ext - this.fitExtent) > this.fitExtent * 0.15) this.frame('abstand', 0.35);
  }

  private extent(build: CreatureBuild): number {
    const b = build.bounds;
    return Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
  }

  /**
   * Rahmen ums Wesen: Abstand aus der Hüllkugel und dem engeren Sichtfeld (hochkant zählt die Breite), Ziel in der
   * Mitte. Brett: Wesen in Spielfeldgröße (ein Feld von etwa 3,6 in der kürzeren Bildkante).
   */
  private frame(mode: 'voll' | 'abstand', seconds: number, force = false): void {
    const build = this.lastBuild;
    if (!build) return;
    const b = build.bounds;
    const ext = this.extent(build);
    this.fitExtent = ext;
    const name: TurntableAnsicht = this.ansicht;
    const a = ANSICHTEN[name];
    const aspect = this.ctx ? this.ctx.width / Math.max(1, this.ctx.height) : 1;
    const vHalf = (a.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const half = Math.min(vHalf, hHalf);
    const dx = b.max[0] - b.min[0];
    const dy = b.max[1] - b.min[1];
    const dz = b.max[2] - b.min[2];
    let distance = 0;
    let target: [number, number, number] = [0, 0, 0];
    if (name === 'brett') {
      const cell = Math.max(dx, dz) * 1.15;
      distance = (3.6 * cell) / 2 / Math.tan(half);
      target = [(b.min[0] + b.max[0]) / 2, b.min[1] + dy * 0.35, (b.min[2] + b.max[2]) / 2];
    }
    const winkelZurueck = mode === 'voll' && (force || name !== 'held' || !this.turntable.userOrbited);
    if (name !== 'brett') {
      // Enger Rahmen für genau die Blickrichtung, die die Kamera gleich hat (feste Ansicht oder die des Nutzers)
      const yaw = winkelZurueck ? a.yaw : this.turntable.yaw;
      const pitch = winkelZurueck ? a.pitch : this.turntable.pitch;
      // Rahmen um die **Pose** (offenes Maul): Positionen wie zur Laufzeit gehäutet
      const punkte = this.openness > 0.05 && this.bauplan && build.mouth ? posedPositions(build, { openness: this.openness, maul: this.bauplan.maul }) : build.positions;
      ({ distance, target } = rahmenUm(punkte, yaw, pitch, a.fov, aspect, name === 'boegen' ? 0.84 : 0.78));
    }
    if (winkelZurueck) this.turntable.setAnsicht(name, { distance, target }, seconds);
    else this.turntable.animateTo({ distance, target, fov: a.fov }, seconds);
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    this.ctx = ctx;
    if (this.stilDirty && this.creature && this.bauplan) {
      this.stilDirty = false;
      this.creature.setStyle(this.bauplan, this.stil);
    }
    this.camera.aspect = ctx.width / Math.max(1, ctx.height);
    this.camera.updateProjectionMatrix();
    this.turntable.step(dt);
    this.turntable.apply(this.camera);
    if (this.creature) {
      this.creature.update(Math.min(dt, 0.1));
      // Standbild: das automatische Blinzeln nie zeigen (der Zeitgeber des Wesens läuft weiter)
      if (this.standbild) this.creature.uniforms.blink.value = 0;
    }
    this.meadow?.sun.requestUpdate();
    ctx.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.highTimer) clearTimeout(this.highTimer);
    this.turntable.detach();
    this.builder.dispose();
    this.creature?.dispose();
    this.creature = null;
    this.meadow?.dispose();
    this.meadow = null;
    this.scene.clear();
  }
}
