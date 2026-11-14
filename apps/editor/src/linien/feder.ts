/**
 * Federn für die Probe „Linien, Punkte, Zeiger“: gedämpfte Schwingung zu einem Ziel, beschrieben durch Frequenz (Hz) und Dämpfung
 * (1 = ohne Überschwingen, darunter federt es nach). Gerechnet in kleinen festen Schritten, damit auch steife Federn ruhig bleiben.
 */

const SCHRITT = 1 / 480;

export class Feder1 {
  x: number;
  v = 0;
  ziel: number;
  constructor(x: number) {
    this.x = x;
    this.ziel = x;
  }
  schritt(dt: number, hz: number, daempfung: number): void {
    const w = 2 * Math.PI * hz;
    let rest = dt;
    while (rest > 1e-6) {
      const h = Math.min(SCHRITT, rest);
      const a = w * w * (this.ziel - this.x) - 2 * daempfung * w * this.v;
      this.v += a * h;
      this.x += this.v * h;
      rest -= h;
    }
  }
  ruhig(eps = 1e-3): boolean {
    return Math.abs(this.ziel - this.x) < eps && Math.abs(this.v) < eps * 10;
  }
  setzen(x: number): void {
    this.x = x;
    this.ziel = x;
    this.v = 0;
  }
}

export class Feder2 {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  zx: number;
  zy: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.zx = x;
    this.zy = y;
  }
  schritt(dt: number, hz: number, daempfung: number): void {
    const w = 2 * Math.PI * hz;
    let rest = dt;
    while (rest > 1e-6) {
      const h = Math.min(SCHRITT, rest);
      this.vx += (w * w * (this.zx - this.x) - 2 * daempfung * w * this.vx) * h;
      this.vy += (w * w * (this.zy - this.y) - 2 * daempfung * w * this.vy) * h;
      this.x += this.vx * h;
      this.y += this.vy * h;
      rest -= h;
    }
  }
  ruhig(eps = 1e-2): boolean {
    return Math.hypot(this.zx - this.x, this.zy - this.y) < eps && Math.hypot(this.vx, this.vy) < eps * 10;
  }
  setzen(x: number, y: number): void {
    this.x = this.zx = x;
    this.y = this.zy = y;
    this.vx = this.vy = 0;
  }
}
