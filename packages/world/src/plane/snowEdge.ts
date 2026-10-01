import { pickTreeKind, type TreeKind } from '../scatterTrees';
import type { PlaneField } from './field';
import { GradientNoise2, smoothstep } from './noise2';
import { hash32 } from '../rng';

/**
 * Tannen am Rand der Schneefelder (Welt 06, Bild 06 = Ebene 10): der Wald endet am Schnee in einer dichten Reihe
 * schwarzer, spitzer Tannen — ihre Spitzen stehen als Sägezahn vor dem hellen Schnee, ihre langen Schatten liegen als
 * blaue Keile auf ihm. Auf dem Schnee stehen vereinzelt kleine Gruppen schwarzer Tannen; im Waldinneren nur wenige
 * echte Bäume (den dichten Wald malt der Tannenteppich des Bodens, `@ee/render` ground/firCarpet).
 *
 * Wirkt nur in Welten mit `vegetation.snowEdge`; alle anderen Welten ziehen keinen zusätzlichen Zufall (ihre Bäume
 * bleiben, wie sie sind).
 */
export interface SnowEdgeSpec {
  /** Arten der Randtannen (Gewichte). */
  kinds: Partial<Record<TreeKind, number>>;
  /** Band im Wald am Schneefeld (Feldwert, < 0 = Wald), in dem die Randtannen stehen, z. B. [−0.14, −0.045]. */
  band: [number, number];
  /** Wahrscheinlichkeit einer Randtanne je Kandidat im Band. */
  chance: number;
  /** Größenfaktor der Randtannen. */
  scale: [number, number];
  /** Anteil der Kandidaten im Waldinneren, die (nach der Hain-Komposition) stehen dürfen (Standard 1). */
  interior?: number;
  /**
   * Gruppen auf dem Schnee: Wahrscheinlichkeit je Kandidat in einem Flecken (Fleckmaske aus Rauschen, Wellenlänge
   * `patch` Welteinheiten, Anteil `cover` der Schneefläche), Arten wie am Rand.
   */
  islands?: { chance: number; patch: number; cover: number; scale: [number, number] };
}

export interface SnowEdgePick {
  kind: TreeKind;
  scale: number;
  /** Steht auf dem Schnee (die Schneefeld-Sperre gilt für diesen Baum nicht). */
  onSnow: boolean;
}

const islandNoise = new Map<number, GradientNoise2>();
function islandMask(seed: number, x: number, z: number, patch: number): number {
  let n = islandNoise.get(seed);
  if (!n) {
    n = new GradientNoise2(hash32('plane-snow-islands', seed));
    islandNoise.set(seed, n);
  }
  const f = 1 / Math.max(1, patch);
  return 0.5 + 0.6 * n.fbm(x * f + 11.3, z * f - 4.7, 2);
}

/**
 * Entscheidung für einen Streukandidaten in einer Welt mit Schneerand: `undefined` = kein Schneefeld hier, die übliche
 * Komposition entscheidet (Waldinneres, ggf. ausgedünnt über `interior`); `null` = kein Baum; sonst Art und Größe.
 */
export function snowEdgeTree(field: PlaneField, key: string, x: number, z: number, spec: SnowEdgeSpec, rand: () => number): SnowEdgePick | null | undefined {
  const snow = field.features.region(key).snow;
  if (!snow) return undefined;
  const v = snow.value(x, z, field.heightNormAt(x, z));
  const r = rand();
  const [s0, s1] = spec.scale;
  if (v > 0) {
    const isl = spec.islands;
    if (!isl) return null;
    // Flecken: nur ein Teil der Schneefläche trägt Gruppen, dort dicht
    const m = smoothstep(1 - isl.cover - 0.06, 1 - isl.cover + 0.06, islandMask(field.seed, x, z, isl.patch));
    // nicht direkt an der Kante (dort stehen schon die Randtannen) und nicht tief im Feld
    const inner = smoothstep(0.03, 0.08, v) * (1 - smoothstep(0.32, 0.5, v));
    if (r >= isl.chance * m * inner) return null;
    const [a, b] = isl.scale;
    return { kind: pickTreeKind(spec.kinds, rand()), scale: a + (b - a) * rand(), onSnow: true };
  }
  const [b0, b1] = spec.band;
  if (v >= b0 && v <= b1) {
    // zum Schnee hin dichter (die vorderste Reihe steht geschlossen)
    const edge = smoothstep(b0, b1, v);
    if (r >= spec.chance * (0.55 + 0.45 * edge)) return null;
    // die vorderste Reihe größer, nach innen kleiner
    const t = 0.35 * rand() + 0.65 * rand();
    return { kind: pickTreeKind(spec.kinds, rand()), scale: (s0 + (s1 - s0) * t) * (0.8 + 0.25 * edge), onSnow: false };
  }
  // Waldinneres: wenige echte Bäume (der Tannenteppich malt den Wald)
  if (r >= (spec.interior ?? 1)) return null;
  return undefined;
}
