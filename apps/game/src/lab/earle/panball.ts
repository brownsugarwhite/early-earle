export interface PanBallOptions {
  /** Welteinheiten pro Bildschirmpixel am Blickpunkt (abhängig von Zoom und Canvas-Höhe). */
  worldUnitsPerPixel: () => number;
  /** Drehung der Ansicht um die Senkrechte (rad): Bildschirmrichtungen → Ebene. */
  yaw?: () => number;
  /** Fokus verschieben (Ebene, Welteinheiten). */
  onPan: (dx: number, dz: number) => void;
  onZoom?: (factor: number) => void;
  /** Trägheit: v ·= exp(−dt/τ). */
  tau?: number;
}

/**
 * „An der Kugel drehen" auf der unendlichen Ebene (ADR 0002): Ein Zug über den Bildschirm verschiebt den Fokus (den
 * Ebenenpunkt am Scheitel der Anzeigekugel) — der Boden folgt dem Finger, vorwärts, rückwärts, nach links und rechts,
 * ohne Ende. Loslassen im Schwung: Trägheit mit τ ≈ 0,45 s. Pinch- und Wheel-Zoom wie der alte Trackball.
 */
export class PanBall {
  /** Fokusgeschwindigkeit (Ebene, Einheiten/s). */
  readonly velocity = { x: 0, z: 0 };
  private readonly tau: number;
  private dragging = false;
  private moved = false;
  private lastMoveTime = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private detachFn: (() => void) | null = null;

  constructor(private readonly options: PanBallOptions) {
    this.tau = options.tau ?? 0.45;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  /** Läuft noch Schwung? */
  get coasting(): boolean {
    return !this.dragging && Math.hypot(this.velocity.x, this.velocity.z) > 1e-3;
  }

  /** Schwung anhalten (z. B. wenn der Flow den Fokus selbst führt). */
  stop(): void {
    this.velocity.x = 0;
    this.velocity.z = 0;
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
        this.stop();
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
        if (performance.now() - this.lastMoveTime > 90) this.stop();
      } else if (this.pointers.size === 1) {
        this.lastMoveTime = performance.now();
        this.stop();
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

  /** Bildschirmweg (Pixel) → Fokusweg in der Ebene: der Boden folgt dem Finger. */
  private toPlane(dxPx: number, dyPx: number): { x: number; z: number } {
    const w = this.options.worldUnitsPerPixel();
    // Finger nach rechts → Boden nach rechts → Fokus nach links; Finger nach unten → Blick weiter voraus (−z)
    const rx = -dxPx * w;
    const rz = -dyPx * w;
    const yaw = this.options.yaw?.() ?? 0;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return { x: rx * c + rz * s, z: -rx * s + rz * c };
  }

  /** Zeigerbewegung in Pixeln (auch programmatisch, z. B. für Tests). */
  drag(dxPx: number, dyPx: number, dt: number): void {
    const d = this.toPlane(dxPx, dyPx);
    if (Math.hypot(d.x, d.z) < 1e-9) return;
    this.options.onPan(d.x, d.z);
    this.moved = true;
    // Geschwindigkeit für die Trägheit (leicht geglättet)
    const k = 1 / Math.max(dt, 1 / 240);
    this.velocity.x += (d.x * k - this.velocity.x) * 0.6;
    this.velocity.z += (d.z * k - this.velocity.z) * 0.6;
  }

  /** Integriert die Trägheit. Liefert true, wenn sich der Fokus bewegt hat. */
  step(dt: number): boolean {
    if (dt <= 0) return false;
    if (this.dragging) {
      // Während des Ziehens zählt nur eine echte Zeigerbewegung (stiller Finger → kein Schattenpass)
      const changed = this.moved;
      this.moved = false;
      return changed;
    }
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 1e-3) {
      this.stop();
      return false;
    }
    this.options.onPan(this.velocity.x * dt, this.velocity.z * dt);
    const decay = Math.exp(-dt / this.tau);
    this.velocity.x *= decay;
    this.velocity.z *= decay;
    return true;
  }
}
