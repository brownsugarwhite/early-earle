import { hash32, mulberry32 } from '../rng';
import type { PlaneField } from './field';
import { ridgeTrainValley } from './flank';

/**
 * Nebelbänke der unendlichen Ebene (Welten 11/12, Ebene 20 und Ebene 7): waagrechte Airbrush-Bänke, die zwischen den
 * Hügelschichten liegen (Ebene 20: vier, fünf Bänke mit weißlich-cyanem Kern), und das Nebelmeer (Ebene 7: dichte,
 * goldene Bänke am Talgrund, aus denen Felsstümpfe ragen). Geplant je Region (Pfadabschnitt oder Seitenzelle),
 * deterministisch aus Seed und Regionsschlüssel; gezeichnet werden sie als senkrechte, zur Kamera gedrehte Bänder
 * (`@ee/render`, `earle/mist`) — das Gelände davor verdeckt sie, das dahinter liegt im Nebel.
 */

export interface MistSpec {
  /** Bänke je Region (Pfadabschnitt bzw. Seitenzelle). */
  banks: number;
  /** Höhe der Bankmitte über dem tiefsten Gelände unter der Bank, Anteil der Amplitude [min, max] (Standard [0.15, 0.55]). */
  height?: [number, number];
  /** Dicke (senkrecht, Welteinheiten) [min, max] (Standard [1.2, 2.2]). */
  thickness?: [number, number];
  /** Länge (Welteinheiten) [min, max] (Standard [12, 22]). */
  length?: [number, number];
  /** Deckkraft des Kerns 0..1 (Standard 0.85). */
  opacity?: number;
  /**
   * Nebelmeer (Ebene 7): zusätzliche breite, dichte Bänke am Talgrund. `level` = Oberkante über dem tiefsten Gelände
   * (Anteil der Amplitude), `banks` = Anzahl je Region, `lateral` = seitliche Lage [min, max] relativ zum Rückgrat
   * (Welteinheiten, + = rechts; Standard beide Seiten). `height` = Nebelspiegel des Geländes (absolute Höhe in
   * Welteinheiten; darunter wird der Boden zu Nebel, siehe `@ee/render` `ground/fogSea`), Standard `level` × Amplitude.
   */
  sea?: { level: number; banks: number; lateral?: [number, number]; thickness?: [number, number]; height?: number };
  /**
   * Eine Bank hinter dem Fokus-Element der Region (vom Pfad aus gesehen dahinter, −z): der Schirmbaum steht als dunkle
   * Silhouette vor dem hellen Nebel (Ebene 20). Abstand und Höhe über dem Fuß des Fokus (Welteinheiten).
   */
  focal?: { behind: number; height: number };
  /**
   * Blasse Bergsilhouetten im Hintergrund (Ebene 7): flache Formen mit gezackter Oberkante, die nach oben verblassen, je
   * Region `count` Stück seitlich des Pfads (`lateral` [min, max], + = rechts), `ahead` [min, max] Einheiten vor dem Ende
   * des Pfadabschnitts (Standard: im Abschnitt), Höhe und Breite in Welteinheiten.
   */
  mountains?: { count: number; lateral: [number, number]; height: [number, number]; width?: [number, number]; ahead?: [number, number] };
  /**
   * Anteil der Bänder in den farbigen Tönen der Nebelzeile (Welt 02, Ebene 49: leuchtend türkisblaue Bänder zwischen
   * den weißen Schlieren), 0..1; Standard 0.
   */
  tinted?: number;
}

/**
 * Art einer Bank: 0 = Band zwischen den Hügeln, 1 = Nebelmeer (dicht unten, weich oben), 2 = Bergsilhouette, 3 = farbiges
 * Band (wie 0, in den farbigen Tönen der Nebelzeile).
 */
export type MistKind = 0 | 1 | 2 | 3;

export interface MistBank {
  /** Mitte (Ebene: x, Höhe, z). */
  x: number;
  y: number;
  z: number;
  /** Länge (quer zur Blickrichtung) und Dicke (senkrecht). */
  length: number;
  thickness: number;
  opacity: number;
  /** Zufallswert 0..1 (Wellen der Ränder). */
  seed: number;
  world: number;
  kind: MistKind;
}

/** Planung der Nebelbänke je Region mit Cache (Obergrenze wie die Merkmale). */
export class PlaneMist {
  private readonly cache = new Map<string, MistBank[]>();
  /** Obergrenze des Caches (Regionen). */
  capacity = 160;

  constructor(private readonly field: PlaneField) {}

  /** Bänke einer Region (leer, wenn ihre Welt keinen Nebel hat). */
  region(key: string): MistBank[] {
    const hit = this.cache.get(key);
    if (hit) return hit;
    const out = this.plan(key);
    this.cache.set(key, out);
    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return out;
  }

  /** Bänke aller gegebenen Regionen. */
  in(keys: Iterable<string>): MistBank[] {
    const out: MistBank[] = [];
    for (const k of keys) for (const b of this.region(k)) out.push(b);
    return out;
  }

  get size(): number {
    return this.cache.size;
  }

  private plan(key: string): MistBank[] {
    const field = this.field;
    const region = field.region(key);
    const spec = field.spec(region.world).mist;
    if (!spec || (spec.banks <= 0 && !spec.sea)) return [];
    const rand = mulberry32(hash32('plane-mist', key, field.seed));
    const layout = field.layout;
    const out: MistBank[] = [];
    // Ausdehnung der Region längs z und quer (Pfadabschnitt: Abschnitt × Band; Zelle: um ihren Mittelpunkt)
    let z0: number;
    let z1: number;
    let half: number;
    if (region.kind === 'path') {
      const seg = layout.segment(region.k);
      z0 = seg.zEnd;
      z1 = seg.zStart;
      half = layout.bandHalfWidth * 0.75;
    } else {
      z0 = region.cz - layout.cellAlong * 0.45;
      z1 = region.cz + layout.cellAlong * 0.45;
      half = layout.cellAcross * 0.4;
    }
    const centreX = (z: number): number => (region.kind === 'path' ? layout.backbone(z) : region.cx);
    const amp = Math.max(0.5, field.shapeOf(region.world).amplitude);
    /** Tiefstes und höchstes Gelände längs der Bank (fünf Proben quer). */
    const ground = (x: number, z: number, len: number): [number, number] => {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < 5; i++) {
        const h = field.heightAt(x + (i / 4 - 0.5) * len * 0.8, z);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
      return [lo, hi];
    };
    const [h0, h1] = spec.height ?? [0.15, 0.55];
    const [t0, t1] = spec.thickness ?? [1.2, 2.2];
    const [l0, l1] = spec.length ?? [12, 22];
    const opacity = spec.opacity ?? 0.85;
    const n = Math.max(0, Math.round(spec.banks));
    const ridges = field.spec(region.world).terrain.ridges;
    for (let i = 0; i < n; i++) {
      // gleichmäßig längs der Region, leicht verschoben: Bänke in jeder Tiefe (Staffelung wie in Ebene 20); mit einer
      // Hügelstaffel liegen sie in den Tälern zwischen den Kämmen
      let z = z1 + (z0 - z1) * ((i + 0.2 + 0.6 * rand()) / n);
      const x = centreX(z) + (rand() * 2 - 1) * half;
      if (ridges) z = ridgeTrainValley(ridges, field.seed, x, z);
      const length = l0 + (l1 - l0) * rand();
      const [lo] = ground(x, z, length);
      const y = lo + amp * (h0 + (h1 - h0) * rand());
      if (field.worldAt(x, z) !== region.world) continue;
      const bank: MistBank = { x, y, z, length, thickness: t0 + (t1 - t0) * rand(), opacity: opacity * (0.8 + 0.2 * rand()), seed: rand(), world: region.world, kind: 0 };
      // farbige Bänder nur in Welten mit `tinted` (sonst kein zusätzlicher Zufall)
      if (spec.tinted && rand() < spec.tinted) bank.kind = 3;
      out.push(bank);
    }
    const focal = spec.focal ? field.focalSlot(key) : null;
    if (spec.focal && focal) {
      const [fx, fy, fz] = focal.position;
      out.push({ x: fx, y: fy + spec.focal.height, z: fz - spec.focal.behind, length: l1 * 0.9, thickness: t1, opacity, seed: rand(), world: region.world, kind: 0 });
    }
    const mountains = spec.mountains;
    // Nur voraus (k ≥ 0): ein Abschnitt hinter dem Start (angedeutete Welt) setzte seine Berge sonst in die Startwelt
    if (mountains && region.kind === 'path' && region.k >= 0) {
      const [w0, w1] = mountains.width ?? [26, 40];
      const [a0, a1] = mountains.lateral;
      for (let i = 0; i < mountains.count; i++) {
        const ahead = mountains.ahead;
        const z = ahead ? z0 - (ahead[0] + (ahead[1] - ahead[0]) * rand()) : z1 + (z0 - z1) * ((i + 0.2 + 0.6 * rand()) / Math.max(1, mountains.count));
        const x = centreX(z) + a0 + (a1 - a0) * rand();
        const height = mountains.height[0] + (mountains.height[1] - mountains.height[0]) * rand();
        // Fuß im Nebel: die Silhouette beginnt knapp unter dem Gelände, Mitte eine halbe Höhe darüber
        const y = field.heightAt(x, z) - 1 + height * 0.5;
        out.push({ x, y, z, length: w0 + (w1 - w0) * rand(), thickness: height, opacity: 1, seed: rand(), world: region.world, kind: 2 });
      }
    }
    const sea = spec.sea;
    if (sea) {
      const [s0, s1] = sea.thickness ?? [2.2, 3.4];
      const [a0, a1] = sea.lateral ?? [-half, half];
      const m = Math.max(0, Math.round(sea.banks));
      for (let i = 0; i < m; i++) {
        const z = z1 + (z0 - z1) * ((i + 0.1 + 0.8 * rand()) / m);
        const x = centreX(z) + a0 + (a1 - a0) * rand();
        const length = 16 + 12 * rand();
        const [lo] = ground(x, z, length);
        const thickness = s0 + (s1 - s0) * rand();
        // Oberkante auf dem Nebelspiegel: Mitte eine halbe Dicke darunter
        const y = lo + amp * sea.level - thickness * 0.5;
        if (field.worldAt(x, z) !== region.world) continue;
        out.push({ x, y, z, length, thickness, opacity: 1, seed: rand(), world: region.world, kind: 1 });
      }
    }
    return out;
  }
}
