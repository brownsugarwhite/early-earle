import type { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';

/**
 * Feste Ansichten des Wesen-Labs (Winkel in Bogenmaß, Brennweite als vertikales Sichtfeld in Grad):
 * - `held`: freie Ansicht zum Bauen, Dreiviertel von rechts vorn.
 * - `boegen`: Bögen-Kamera des Referenzmodus (Look-Vertrag Regel 15): Dreiviertel von rechts vorn, leicht von oben,
 *   lange Brennweite (flache Perspektive wie auf Florians Bögen). Das Wesen schaut +Z, die Kamera steht vorn rechts.
 * - `brett`: wie das Spielfeld (FlowScene `levelPose`: ≈ 63–67° von oben, Sichtfeld 40–44°), Wesen in Brettgröße.
 */
export const ANSICHTEN = {
  held: { yaw: 0.62, pitch: 0.24, fov: 32 },
  boegen: { yaw: 0.62, pitch: 0.26, fov: 22 },
  brett: { yaw: 0.28, pitch: 1.13, fov: 42 },
} as const;

export type TurntableAnsicht = keyof typeof ANSICHTEN;

export interface TurntableView {
  yaw?: number;
  pitch?: number;
  distance?: number;
  target?: [number, number, number];
  /** Vertikales Sichtfeld in Grad. */
  fov?: number;
}

interface Anim {
  from: Required<Omit<TurntableView, 'target'>> & { target: Vector3 };
  to: Required<Omit<TurntableView, 'target'>> & { target: Vector3 };
  t: number;
  dur: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Drehteller-Kamera für das Wesen-Lab: Ziehen dreht, Rad/Pinch zoomt (Nahbereich), optional Autodrehung, Fahrten zu festen Ansichten. */
export class Turntable {
  yaw: number = ANSICHTEN.held.yaw;
  pitch: number = ANSICHTEN.held.pitch;
  distance = 3.2;
  fov: number = ANSICHTEN.held.fov;
  readonly target = new Vector3(0, 0.5, 0);
  spin = false;
  /** Der Nutzer hat selbst gezoomt (dann passt das Lab den Abstand nicht mehr von selbst an). */
  userZoomed = false;
  /** Der Nutzer hat selbst gedreht (seit der letzten festen Ansicht). */
  userOrbited = false;
  private dragging = false;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private detachFn: (() => void) | null = null;
  private moved = true;
  private anim: Anim | null = null;

  attach(el: HTMLElement): void {
    this.detach();
    el.style.touchAction = 'none';
    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.anim = null;
      if (this.pointers.size === 1) this.dragging = true;
      else if (this.pointers.size === 2) this.pinch = this.pointerDistance();
    };
    const move = (e: PointerEvent) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      if (this.pointers.size === 1) {
        this.yaw -= (e.clientX - prev.x) * 0.006;
        this.pitch = Math.min(1.3, Math.max(-0.35, this.pitch + (e.clientY - prev.y) * 0.005));
        this.userOrbited = true;
        this.moved = true;
      }
      prev.x = e.clientX;
      prev.y = e.clientY;
      if (this.pointers.size === 2) {
        const d = this.pointerDistance();
        if (this.pinch > 0 && d > 0) this.zoom(this.pinch / d, true);
        this.pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) this.dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.anim = null;
      this.zoom(Math.exp(e.deltaY * 0.0015), true);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    this.detachFn = () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      this.pointers.clear();
      this.dragging = false;
    };
  }

  detach(): void {
    this.detachFn?.();
    this.detachFn = null;
  }

  private pointerDistance(): number {
    const it = this.pointers.values();
    const a = it.next().value;
    const b = it.next().value;
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  zoom(factor: number, byUser = false): void {
    this.distance = Math.min(40, Math.max(0.6, this.distance * factor));
    if (byUser) this.userZoomed = true;
    this.moved = true;
  }

  /** Sofort setzen (ohne Fahrt). */
  setView(v: TurntableView): void {
    this.anim = null;
    if (v.yaw !== undefined) this.yaw = v.yaw;
    if (v.pitch !== undefined) this.pitch = v.pitch;
    if (v.distance !== undefined) this.distance = v.distance;
    if (v.fov !== undefined) this.fov = v.fov;
    if (v.target) this.target.set(...v.target);
    this.moved = true;
  }

  /** Weiche Fahrt zu einer Ansicht (fehlende Werte bleiben); Ziehen bricht sie ab. */
  animateTo(v: TurntableView, seconds = 0.45): void {
    const from = { yaw: this.yaw, pitch: this.pitch, distance: this.distance, fov: this.fov, target: this.target.clone() };
    // kürzester Weg um die Hochachse
    let yaw = v.yaw ?? this.yaw;
    while (yaw - from.yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw - from.yaw < -Math.PI) yaw += Math.PI * 2;
    const to = { yaw, pitch: v.pitch ?? this.pitch, distance: v.distance ?? this.distance, fov: v.fov ?? this.fov, target: v.target ? new Vector3(...v.target) : this.target.clone() };
    if (seconds <= 0) {
      this.setView({ ...to, target: [to.target.x, to.target.y, to.target.z] });
      return;
    }
    this.anim = { from, to, t: 0, dur: seconds };
    this.moved = true;
  }

  /** Feste Ansicht: Winkel und Brennweite aus `ANSICHTEN`, Abstand/Ziel vom Aufrufer (Rahmen ums Wesen). */
  setAnsicht(name: TurntableAnsicht, frame: { distance: number; target: [number, number, number] }, seconds = 0.45): void {
    const a = ANSICHTEN[name];
    this.userZoomed = false;
    this.userOrbited = false;
    this.animateTo({ yaw: a.yaw, pitch: a.pitch, fov: a.fov, distance: frame.distance, target: frame.target }, seconds);
  }

  get animating(): boolean {
    return this.anim !== null;
  }

  /** Liefert true, wenn sich die Kamera bewegt hat. */
  step(dt: number): boolean {
    let changed = this.moved;
    this.moved = false;
    const a = this.anim;
    if (a) {
      a.t = Math.min(1, a.t + dt / a.dur);
      const k = ease(a.t);
      this.yaw = a.from.yaw + (a.to.yaw - a.from.yaw) * k;
      this.pitch = a.from.pitch + (a.to.pitch - a.from.pitch) * k;
      this.distance = a.from.distance + (a.to.distance - a.from.distance) * k;
      this.fov = a.from.fov + (a.to.fov - a.from.fov) * k;
      this.target.lerpVectors(a.from.target, a.to.target, k);
      if (a.t >= 1) this.anim = null;
      changed = true;
    }
    if (this.spin && !this.dragging && !this.anim) {
      this.yaw += dt * 0.35;
      changed = true;
    }
    return changed;
  }

  apply(camera: PerspectiveCamera): void {
    const cp = Math.cos(this.pitch);
    camera.position.set(this.target.x + this.distance * Math.sin(this.yaw) * cp, this.target.y + this.distance * Math.sin(this.pitch), this.target.z + this.distance * Math.cos(this.yaw) * cp);
    camera.lookAt(this.target);
    if (Math.abs(camera.fov - this.fov) > 1e-4) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }
  }
}
