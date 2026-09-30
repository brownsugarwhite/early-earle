/**
 * Eine rAF-Zeitleiste für den Splash: Spuren mit Start, Dauer, Easing und optional Stufen (gehaltene Posen im
 * Neo-Brutalismus-Takt), Aufrufe zu Zeitpunkten (Klänge), `seek(t)` und `timeScale`.
 *
 * Spuren sind zustandslos: `apply(p)` setzt den Zustand ihres Elements vollständig für den Fortschritt p. `seek(t)`
 * setzt alles zurück (`reset`) und wendet jede Spur an, die bis t begonnen hat (in Startreihenfolge, spätere gewinnen;
 * abgelaufene mit p = 1). Deshalb ergibt Springen dasselbe Bild wie Abspielen, und Schnellvorlauf, Antippen
 * (Schnappen ans Ende) und reduzierte Bewegung enden im selben Zustand.
 */

export type Ease = (t: number) => number;

export interface Track {
  /** Start in Sekunden (Zeitleistenzeit). */
  t0: number;
  /** Dauer in Sekunden (0 = Sprung, Infinity = offene Spur wie Leerlauf: p bleibt 0, `apply` bekommt die Zeit). */
  dur: number;
  /** Easing auf den (gestuften) Fortschritt. */
  ease?: Ease;
  /** Anzahl gehaltener Posen über die Dauer (p springt in k/steps-Schritten). */
  steps?: number;
  /** Alternativ: Posen pro Sekunde (Zeit wird auf 1/fps gerastert, z. B. 12 fps für die Flamme). */
  fps?: number;
  /** Auch vor dem Start anwenden (p = 0), z. B. unsichtbarer Anfangszustand. */
  fillBefore?: boolean;
  /** Setzt den Zustand für p ∈ [0, 1]; `t` ist die lokale Zeit in Sekunden seit t0. */
  apply(p: number, t: number): void;
  /** Für Diagnose/Tests. */
  id?: string;
}

interface Call {
  t: number;
  fn: () => void;
  tag: string;
  fired: boolean;
}

export const linear: Ease = (t) => t;
export const easeIn: Ease = (t) => t * t;
export const easeOut: Ease = (t) => 1 - (1 - t) * (1 - t);
export const easeInOut: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
export const easeOutBack: Ease = (t) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
/** Fallen: Schwerkraft (quadratisch). */
export const gravity: Ease = (t) => t * t;

/** Stückweise linear durch Stützwerte (gleichmäßig verteilt): keys([0, 1.5, 1])(p). */
export function keys(values: readonly number[]): (p: number) => number {
  const n = values.length - 1;
  return (p) => {
    if (n <= 0) return values[0] ?? 0;
    const x = Math.min(n, Math.max(0, p * n));
    const i = Math.min(n - 1, Math.floor(x));
    const f = x - i;
    return values[i]! + (values[i + 1]! - values[i]!) * f;
  };
}

/** Gestufte Posen: frames([a, b, c])(p) hält jede Pose ein Drittel der Dauer (p = 1 → letzte). */
export function frames<T>(poses: readonly T[]): (p: number) => T {
  return (p) => poses[Math.min(poses.length - 1, Math.max(0, Math.ceil(p * poses.length) - 1))]!;
}

export class Timeline {
  timeScale = 1;
  /** Aktuelle Zeitleistenzeit in Sekunden. */
  time = 0;
  private tracks: Track[] = [];
  private calls: Call[] = [];
  private sorted = true;
  /** Setzt alle Elemente in den Ausgangszustand (vor `seek`). */
  reset: () => void = () => undefined;
  /** Aufrufe mit diesen Tags werden beim Überqueren nicht ausgeführt (z. B. beim Schnappen ans Ende). */
  muted: ((tag: string) => boolean) | null = null;

  add(track: Track): this {
    this.tracks.push(track);
    this.sorted = false;
    return this;
  }

  /** Aufruf beim Überqueren von t (Klänge). `tag` erlaubt gezieltes Stummschalten. */
  call(t: number, fn: () => void, tag = 'sound'): this {
    this.calls.push({ t, fn, tag, fired: false });
    return this;
  }

  get duration(): number {
    let d = 0;
    for (const tr of this.tracks) if (Number.isFinite(tr.dur)) d = Math.max(d, tr.t0 + tr.dur);
    for (const c of this.calls) d = Math.max(d, c.t);
    return d;
  }

  get trackCount(): number {
    return this.tracks.length;
  }

  /** Springt an t: Zustand deterministisch aus den Spuren, ohne Aufrufe auszulösen (sie gelten als erledigt). */
  seek(t: number): void {
    this.time = t;
    for (const c of this.calls) c.fired = c.t <= t;
    this.render(t);
  }

  /** Spielt dt Sekunden (× timeScale) ab und löst überquerte Aufrufe genau einmal aus. */
  update(dt: number): void {
    const from = this.time;
    const to = from + dt * this.timeScale;
    this.time = to;
    for (const c of this.calls) {
      if (!c.fired && c.t <= to && c.t > from - 1e-9) {
        c.fired = true;
        if (!this.muted?.(c.tag)) c.fn();
      } else if (!c.fired && c.t <= from) c.fired = true;
    }
    this.render(to);
  }

  /** Noch nicht ausgelöste Aufrufe verwerfen (z. B. beim Schnappen ans Ende); `keep` darf einzelne behalten. */
  cancelCalls(keep?: (tag: string) => boolean): void {
    for (const c of this.calls) if (!c.fired && !keep?.(c.tag)) c.fired = true;
  }

  private render(t: number): void {
    if (!this.sorted) {
      // stabil nach Start sortieren (gleicher Start: Einfügereihenfolge)
      this.tracks = this.tracks.map((tr, i) => ({ tr, i })).sort((a, b) => a.tr.t0 - b.tr.t0 || a.i - b.i).map((x) => x.tr);
      this.sorted = true;
    }
    this.reset();
    for (const tr of this.tracks) {
      if (t < tr.t0) {
        if (tr.fillBefore) tr.apply(0, 0);
        continue;
      }
      let local = t - tr.t0;
      if (tr.fps && tr.fps > 0) local = Math.floor(local * tr.fps + 1e-9) / tr.fps;
      let p = tr.dur > 0 ? Math.min(1, local / tr.dur) : 1;
      if (tr.steps && tr.steps > 0 && p < 1) p = Math.min(1, Math.ceil(p * tr.steps - 1e-9) / tr.steps);
      if (!Number.isFinite(tr.dur)) p = 0;
      tr.apply(tr.ease ? tr.ease(p) : p, local);
    }
  }
}
