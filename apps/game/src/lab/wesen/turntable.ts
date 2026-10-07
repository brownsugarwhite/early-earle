import type { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';

/** Drehteller-Kamera für das Wesen-Lab: Ziehen dreht, Rad/Pinch zoomt (Nahbereich), optional Autodrehung. */
export class Turntable {
  yaw = 0.55;
  pitch = 0.22;
  distance = 3.2;
  readonly target = new Vector3(0, 0.5, 0);
  spin = false;
  private dragging = false;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;
  private detachFn: (() => void) | null = null;
  private moved = true;

  attach(el: HTMLElement): void {
    this.detach();
    el.style.touchAction = 'none';
    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.dragging = true;
      else if (this.pointers.size === 2) this.pinch = this.pointerDistance();
    };
    const move = (e: PointerEvent) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      if (this.pointers.size === 1) {
        this.yaw -= (e.clientX - prev.x) * 0.006;
        this.pitch = Math.min(1.3, Math.max(-0.35, this.pitch + (e.clientY - prev.y) * 0.005));
        this.moved = true;
      }
      prev.x = e.clientX;
      prev.y = e.clientY;
      if (this.pointers.size === 2) {
        const d = this.pointerDistance();
        if (this.pinch > 0 && d > 0) this.zoom(this.pinch / d);
        this.pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) this.dragging = false;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.0015));
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

  zoom(factor: number): void {
    this.distance = Math.min(14, Math.max(0.9, this.distance * factor));
    this.moved = true;
  }

  setView(v: { yaw?: number; pitch?: number; distance?: number; target?: [number, number, number] }): void {
    if (v.yaw !== undefined) this.yaw = v.yaw;
    if (v.pitch !== undefined) this.pitch = v.pitch;
    if (v.distance !== undefined) this.distance = v.distance;
    if (v.target) this.target.set(...v.target);
    this.moved = true;
  }

  /** Liefert true, wenn sich die Kamera bewegt hat. */
  step(dt: number): boolean {
    let changed = this.moved;
    this.moved = false;
    if (this.spin && !this.dragging) {
      this.yaw += dt * 0.35;
      changed = true;
    }
    return changed;
  }

  apply(camera: PerspectiveCamera): void {
    const cp = Math.cos(this.pitch);
    camera.position.set(this.target.x + this.distance * Math.sin(this.yaw) * cp, this.target.y + this.distance * Math.sin(this.pitch), this.target.z + this.distance * Math.cos(this.yaw) * cp);
    camera.lookAt(this.target);
  }
}
