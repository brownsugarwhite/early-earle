import { Quaternion, Vector3 } from 'three';

export interface TrackballOptions {
  /** Kugelradius: Fingerweg auf der Oberfläche / radius = Drehwinkel. */
  radius: number;
  /** Trägheit: ω ·= exp(−dt/τ). */
  tau?: number;
  /** Maximale Neigung des Scheitels gegen +Y (rad); darüber zieht eine Feder zurück. */
  maxTilt?: number;
  /** Welteinheiten pro Bildschirmpixel am Blickpunkt (abhängig von Zoom und Canvas-Höhe). */
  worldUnitsPerPixel: () => number;
  onZoom?: (factor: number) => void;
}

const _axis = new Vector3();
const _q = new Quaternion();
const _up = new Vector3();
const _Y = new Vector3(0, 1, 0);

/**
 * Trackball "Kugel rollen": Zeigerbewegung wird in Bodenweg umgerechnet (x → +X, y → +Z), Drehachse =
 * up × Weg, Winkel = Weg / R. Trägheit mit τ ≈ 0.4 s, weiche Federgrenze, Pinch- und Wheel-Zoom.
 */
export class Trackball {
  readonly quaternion = new Quaternion();
  private readonly omega = new Vector3();
  private readonly tau: number;
  private readonly maxTilt: number;
  private dragging = false;
  private lastMoveTime = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private detachFn: (() => void) | null = null;

  constructor(private readonly options: TrackballOptions) {
    this.tau = options.tau ?? 0.4;
    this.maxTilt = options.maxTilt ?? (12 * Math.PI) / 180;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  /** Bindet Pointer- und Wheel-Events an das Element (Maus und Touch). */
  attach(el: HTMLElement): void {
    this.detach();
    el.style.touchAction = 'none';
    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.omega.set(0, 0, 0);
        this.lastMoveTime = performance.now();
      } else if (this.pointers.size === 2) {
        this.pinchDist = this.pointerDistance();
      }
    };
    const move = (e: PointerEvent) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const now = performance.now();
      if (this.pointers.size === 1) {
        const dt = Math.max(1e-3, (now - this.lastMoveTime) / 1000);
        this.drag(e.clientX - prev.x, e.clientY - prev.y, dt);
        this.lastMoveTime = now;
      }
      prev.x = e.clientX;
      prev.y = e.clientY;
      if (this.pointers.size === 2) {
        const d = this.pointerDistance();
        if (this.pinchDist > 0 && d > 0) this.options.onZoom?.(this.pinchDist / d);
        this.pinchDist = d;
      }
    };
    const up = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        this.dragging = false;
        // Wenn der Finger vor dem Loslassen stillstand, keine Trägheit
        if (performance.now() - this.lastMoveTime > 90) this.omega.set(0, 0, 0);
      } else if (this.pointers.size === 1) {
        this.lastMoveTime = performance.now();
        this.omega.set(0, 0, 0);
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.options.onZoom?.(Math.exp(e.deltaY * 0.0015));
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
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Zeigerbewegung in Pixeln (auch programmatisch, z. B. für Tests). */
  drag(dxPx: number, dyPx: number, dt: number): void {
    const w = this.options.worldUnitsPerPixel();
    const dx = dxPx * w;
    const dz = dyPx * w;
    const len = Math.hypot(dx, dz);
    if (len < 1e-9) return;
    const angle = len / this.options.radius;
    _axis.set(dz, 0, -dx).divideScalar(len); // up × Bodenweg
    _q.setFromAxisAngle(_axis, angle);
    this.quaternion.premultiply(_q);
    // Winkelgeschwindigkeit für die Trägheit (leicht geglättet)
    const rate = angle / Math.max(dt, 1 / 240);
    this.omega.lerp(_axis.clone().multiplyScalar(rate), 0.6);
  }

  /** Integriert Trägheit und Feder. Liefert true, wenn sich die Rotation geändert hat. */
  step(dt: number): boolean {
    if (dt <= 0) return false;
    let changed = false;
    if (!this.dragging) {
      // Federgrenze: Scheitel darf höchstens maxTilt kippen
      _up.copy(_Y).applyQuaternion(this.quaternion);
      const tilt = Math.acos(Math.min(1, Math.max(-1, _up.y)));
      if (tilt > this.maxTilt) {
        _axis.crossVectors(_up, _Y);
        if (_axis.lengthSq() > 1e-12) {
          _axis.normalize();
          this.omega.addScaledVector(_axis, (tilt - this.maxTilt) * 14 * dt);
        }
        this.omega.multiplyScalar(Math.exp(-dt / 0.12));
      }
      const speed = this.omega.length();
      if (speed > 1e-4) {
        _q.setFromAxisAngle(_axis.copy(this.omega).divideScalar(speed), speed * dt);
        this.quaternion.premultiply(_q);
        this.omega.multiplyScalar(Math.exp(-dt / this.tau));
        changed = true;
      } else if (speed > 0) {
        this.omega.set(0, 0, 0);
      }
    } else {
      changed = true; // während des Ziehens wurde per drag() rotiert
    }
    return changed;
  }
}
