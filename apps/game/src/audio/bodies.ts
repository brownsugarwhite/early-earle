import * as Genome from '@ee/genome';
import type { BodyKind, Coat, Material } from './sfx';

/**
 * Which creature a blob is on the board — needed to time its merge (blobs splash, walkers leap toward the
 * camera, snakes coil, heavies stomp) and to pick its footstep sound (fur thump, feather flutter …). The
 * board seeds every blob's line with `id × 31 + 7` and resolves the archetype with the genome rules; this
 * mirrors that decision (archetype, species, coat) without building the creature. Genome functions are
 * feature-detected so a renamed export degrades to plain blobs instead of breaking the build.
 */

export interface CreatureGuess {
  body: BodyKind;
  coat: Coat;
}

export const BLOB_GUESS: CreatureGuess = { body: 'blob', coat: 'bare' };

type Fn = (...args: unknown[]) => unknown;
const lib = Genome as unknown as Record<string, unknown>;
const fn = (name: string): Fn | null => (typeof lib[name] === 'function' ? (lib[name] as Fn) : null);

let rules: unknown = null;
let loading: Promise<void> | null = null;

/** Loads the bundled genome rules once (the same module the board uses); quiet when unavailable. */
export function loadCreatureRules(): Promise<void> {
  if (!loading) {
    loading = import('../lab/creature/content')
      .then((m) => {
        rules = (m as { BUNDLED_RULES?: unknown }).BUNDLED_RULES ?? null;
      })
      .catch(() => {
        rules = null;
      });
  }
  return loading;
}

/** For tests and the lab: inject rules (or null for "blobs only"). */
export function setCreatureRules(r: unknown): void {
  rules = r;
  cache.clear();
}

const cache = new Map<string, CreatureGuess>();

interface CoatRule {
  fur: number;
  feather: number;
}

/**
 * Archetype and coat of blob `id` (tier, kind, material) on a board of zone `zone`. Amoebas and every blob
 * before the rules load are plain blobs.
 */
export function guessCreature(zone: string, tier: number, id: number, kind: string, material: Material): CreatureGuess {
  if (!rules || kind === 'amoeba') return BLOB_GUESS;
  const key = `${zone}|${tier}|${id}|${material}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let guess = BLOB_GUESS;
  try {
    const seed = id * 31 + 7;
    const bodyTypeForTier = fn('bodyTypeForTier');
    const body = (bodyTypeForTier ? bodyTypeForTier(rules, zone, tier, seed) : 'blob') as BodyKind;
    let coat: Coat = 'bare';
    const speciesForLine = fn('speciesForLine');
    const speciesRuleFor = fn('speciesRuleFor');
    const bodyRuleFor = fn('bodyRuleFor');
    const makeRng = fn('makeRng');
    const hash32 = fn('hash32');
    if (body !== 'blob' && speciesForLine && speciesRuleFor && bodyRuleFor && makeRng && hash32) {
      const u = (makeRng(hash32('species', zone, seed, body)) as { next: () => number }).next();
      const species = speciesForLine(rules, body, u) as string;
      const sr = speciesRuleFor(rules, species) as { coat?: CoatRule };
      const br = bodyRuleFor(rules, zone, body) as { coat: CoatRule };
      const c = sr.coat ?? br.coat;
      const v = (makeRng(hash32('skin', zone, seed, body)) as { next: () => number }).next();
      coat = v < c.fur ? 'fur' : v < c.fur + c.feather ? 'feather' : 'bare';
    }
    if (material === 'fire') coat = 'bare';
    guess = { body, coat };
  } catch {
    guess = BLOB_GUESS;
  }
  if (cache.size > 512) cache.clear();
  cache.set(key, guess);
  return guess;
}
