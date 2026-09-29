import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';

export interface OrbitView {
  yaw: number;
  pitch: number;
  distance: number;
  target: [number, number, number];
}

/**
 * Orbit-Kamera fürs Baum-Lab: Ziehen dreht (Yaw/Pitch), Rad und Pinch zoomen, kurze Trägheit beim Loslassen.
 * Kein Roll; Pitch −0,6…1,35 rad (Blick hinauf in die Krone erlaubt, Kamera bleibt über dem Boden).
 */
export class OrbitRig {
  yaw = -0.6;
  pitch = 0.3;
  distance = 70;
  readonly target = new Vector3(0, 15, 0);
  private velYaw = 0;
  private velPitch = 0;
  private dragging = false;
  private moved = false;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private detachFn: (() => void) | null = null;
  /** Zeitstempel der letzten Nutzereingabe (Kamerafahrt abbrechen). */
  lastInput = 0;

  get isDragging(): boolean {
    return this.dragging;
  }

  attach(el: HTMLElement): void {
    this.detach();
    el.style.touchAction = 'none';
    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.velYaw = this.velPitch = 0;
      } else if (this.pointers.size === 2) this.pinchDist = this.pointerDistance();
      this.lastInput = performance.now();
    };
    const move = (e: PointerEvent) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      if (this.pointers.size === 1) this.drag(e.clientX - prev.x, e.clientY - prev.y);
      prev.x = e.clientX;
      prev.y = e.clientY;
      if (this.pointers.size === 2) {
        const d = this.pointerDistance();
        if (this.pinchDist > 0 && d > 0) this.zoom(this.pinchDist / d);
        this.pinchDist = d;
      }
      this.lastInput = performance.now();
    };
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) this.dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.0015));
      this.lastInput = performance.now();
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

  drag(dxPx: number, dyPx: number): void {
    const dy = -dxPx * 0.0055;
    const dp = dyPx * 0.0045;
    this.yaw += dy;
    this.pitch = Math.min(1.35, Math.max(-0.6, this.pitch + dp));
    this.velYaw = dy * 60;
    this.velPitch = dp * 60;
    this.moved = true;
  }

  zoom(factor: number): void {
    this.distance = Math.min(220, Math.max(8, this.distance * factor));
    this.moved = true;
  }

  setView(v: OrbitView): void {
    this.yaw = v.yaw;
    this.pitch = v.pitch;
    this.distance = v.distance;
    this.target.set(v.target[0], v.target[1], v.target[2]);
    this.velYaw = this.velPitch = 0;
    this.moved = true;
  }

  /** Trägheit integrieren; liefert true, wenn sich die Kamera bewegt hat. */
  step(dt: number): boolean {
    let changed = this.moved;
    this.moved = false;
    if (!this.dragging && (Math.abs(this.velYaw) > 1e-3 || Math.abs(this.velPitch) > 1e-3)) {
      this.yaw += this.velYaw * dt;
      this.pitch = Math.min(1.35, Math.max(-0.6, this.pitch + this.velPitch * dt));
      const k = Math.exp(-dt / 0.18);
      this.velYaw *= k;
      this.velPitch *= k;
      changed = true;
    }
    return changed;
  }

  apply(camera: PerspectiveCamera): void {
    // Unter das Ziel darf die Kamera (Blick nach oben), aber nie unter den Boden (y ≥ 1.2)
    const minSin = (1.2 - this.target.y) / Math.max(1e-3, this.distance);
    if (Math.sin(this.pitch) < minSin) this.pitch = Math.asin(Math.min(1, Math.max(-1, minSin)));
    const cp = Math.cos(this.pitch);
    camera.position.set(
      this.target.x + this.distance * Math.sin(this.yaw) * cp,
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + this.distance * Math.cos(this.yaw) * cp,
    );
    camera.lookAt(this.target);
  }
}
