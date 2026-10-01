/**
 * Abgeleitete Specs für Level 51–184: Kurve (`curve.ts`) + Idee der Kartenzone (`ideas.ts`)
 * + automatische Nachjustierung (`tuning.ts`, geschrieben von `tools/levels/tune.ts`).
 *
 * Die Nachjustierung kennt drei Regler, alle deterministisch (der Seed bleibt):
 *   - `moves`: das Zugbudget (Hauptregler),
 *   - `dial`: Zielgröße ± (Stufe, Anzahl, Zellen, Lagen — je nach erstem einstellbaren Ziel),
 *   - `start`: Startmasse ± (zusätzliche Blobs der Stufe 2/3 oder die kleinsten weg).
 */

import type { GoalSpec, LevelSpec, StartBlobSpec } from './generateLevel';
import { curveSpec, LEGACY_LAST_LEVEL, CURVE_LAST_LEVEL } from './curve';
import { storyZone, ZONE_KITS, type Idea } from './ideas';
import { TUNING, type Tune } from './tuning';

/** Idee eines Levels 51–184. */
export function ideaOf(index: number): Idea {
  const c = curveSpec(index);
  const kit = ZONE_KITS.find((k) => k.zone === c.zoneIndex);
  const idea = kit?.ideas[c.positionInZone - 1];
  if (!idea) throw new Error(`no idea for level ${index}`);
  return idea;
}

/** Zonen-Set (Arten, die der Boss trägt) der Kartenzone eines Levels ≥ 51. */
export function zoneSetOf(index: number): readonly string[] {
  const c = curveSpec(index);
  return ZONE_KITS.find((k) => k.zone === c.zoneIndex)?.set ?? [];
}

/** Grund-Spec aus Kurve und Idee, ohne Nachjustierung. */
export function baseSpec(index: number): LevelSpec {
  if (index <= LEGACY_LAST_LEVEL || index > CURVE_LAST_LEVEL)
    throw new Error(`level ${index} is not derived (51–${CURVE_LAST_LEVEL})`);
  const c = curveSpec(index);
  const idea = ideaOf(index);
  const { grid, ...rest } = idea;
  const spec: LevelSpec = {
    ...rest,
    zone: storyZone(index),
    index,
    type: c.type,
    grid: grid ?? (idea.mask ? { w: idea.mask[0]!.length, h: idea.mask.length } : { ...c.grid }),
    seed: 1,
  };
  return spec;
}

// ---- Regler -------------------------------------------------------------------------------

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Stellt die Zielgröße um `d` Schritte (positiv = schwerer). */
export function dialSpec(spec: LevelSpec, d: number): LevelSpec {
  if (d === 0) return spec;
  const out: LevelSpec = { ...spec, goals: spec.goals.map((g) => ({ ...g })) };
  const counts = { ...(spec.counts ?? {}) };
  const fixed = spec.board !== undefined;
  for (let i = 0; i < out.goals.length; i++) {
    const g = out.goals[i]!;
    switch (g.type) {
      case 'reachTier':
        out.goals[i] = { ...g, tier: clamp(g.tier + d, 3, 10) };
        return out;
      case 'release':
        out.goals[i] = { ...g, count: clamp(g.count + d, 1, 6) };
        return out;
      case 'deliver':
        out.goals[i] = { ...g, count: clamp(g.count + d, 1, 6) };
        return out;
      case 'score':
        out.goals[i] = { ...g, points: Math.max(20, Math.round((g.points * (1 + 0.15 * d)) / 10) * 10) };
        return out;
      case 'collectSpores':
        if (fixed) continue;
        out.goals[i] = { ...g, count: clamp(g.count + d, 1, 12) };
        counts.spores = Math.max(counts.spores ?? 3, g.count + d);
        out.counts = counts;
        return out;
      case 'rescue':
        if (fixed) continue;
        out.goals[i] = { ...g, count: clamp(g.count + d, 1, 4) };
        counts.cages = Math.max(counts.cages ?? 1, g.count + d);
        out.counts = counts;
        return out;
      case 'calmStrays':
        if (fixed) continue;
        out.goals[i] = { ...g, count: clamp(g.count + d, 1, 3) };
        counts.strays = Math.max(counts.strays ?? 1, g.count + d);
        out.counts = counts;
        return out;
      case 'heal':
        if (fixed) continue;
        if (spec.elements.includes('withered')) counts.withered = clamp((counts.withered ?? 3) + d, 1, 9);
        else counts.deepWithered = clamp((counts.deepWithered ?? 2) + d, 1, 6);
        out.counts = counts;
        return out;
      case 'clearScrap':
        if (fixed) continue;
        if (spec.elements.includes('scrap')) counts.scrap = clamp((counts.scrap ?? 2) + d, 1, 7);
        else out.moundLayers = clamp((spec.moundLayers ?? 4) + 2 * d, 4, 8);
        out.counts = counts;
        return out;
      case 'clearRot':
        if (fixed) continue;
        out.rotPeriod = clamp((spec.rotPeriod ?? 3) - d, 1, 9);
        return out;
    }
  }
  return out;
}

/**
 * Feste Bretter: hebt die `s` kleinsten freien Blobs um eine Stufe (s > 0) oder senkt die `-s`
 * größten (s < 0). Nur schlichte Blobs (`3`, `3/o`), keine Schläfer, Käfige oder Nebel.
 */
function boardStart(board: string, s: number): string {
  const rows = board
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r.length > 0)
    .map((r) => r.split(/\s+/));
  const blobs: { y: number; x: number; tier: number }[] = [];
  rows.forEach((row, y) =>
    row.forEach((tok, x) => {
      const m = /^(\d{1,2})(\/.+)?$/.exec(tok);
      if (m) blobs.push({ y, x, tier: Number(m[1]) });
    }),
  );
  // Reihenfolge: nach Stufe, dann Lesereihenfolge (deterministisch).
  blobs.sort((a, b) => (s > 0 ? a.tier - b.tier : b.tier - a.tier) || a.y - b.y || a.x - b.x);
  for (const b of blobs.slice(0, Math.abs(s))) {
    const t = Math.max(1, Math.min(11, b.tier + Math.sign(s)));
    rows[b.y]![b.x] = rows[b.y]![b.x]!.replace(/^\d{1,2}/, String(t));
  }
  return '\n' + rows.map((r) => r.join(' ')).join('\n');
}

/** Ändert die Startmasse um `s` Schritte (positiv = leichter). */
export function startSpec(spec: LevelSpec, s: number): LevelSpec {
  if (s === 0) return spec;
  if (spec.board !== undefined) return { ...spec, board: boardStart(spec.board, s) };
  const tiers: (number | StartBlobSpec)[] = [...(spec.startTiers ?? [2, 2, 1, 1])];
  const tierOf = (t: number | StartBlobSpec) => (typeof t === 'number' ? t : t.tier);
  if (s > 0) {
    for (let k = 0; k < s; k++) tiers.push(k % 2 === 0 ? 2 : 3);
  } else {
    for (let k = 0; k < -s && tiers.length > 1; k++) {
      let lowest = 0;
      tiers.forEach((t, i) => {
        if (tierOf(t) <= tierOf(tiers[lowest]!)) lowest = i;
      });
      tiers.splice(lowest, 1);
    }
  }
  tiers.sort((a, b) => tierOf(b) - tierOf(a));
  return { ...spec, startTiers: tiers };
}

/** Setzt das Spawn-Gewicht der Stufe 2 (bleibt > 0: die Möwe liest Stufe 1 und 2). */
export function spawnSpec(spec: LevelSpec, t2: number | undefined): LevelSpec {
  if (t2 === undefined || t2 === (spec.spawn?.tier2 ?? 1)) return spec;
  return { ...spec, spawn: { ...(spec.spawn ?? {}), tier2: Math.max(0.25, t2) } };
}

/** Wendet eine Nachjustierung an. */
export function applyTune(spec: LevelSpec, tune: Tune | undefined): LevelSpec {
  if (!tune) return spec;
  let out = dialSpec(spec, tune.dial ?? 0);
  out = startSpec(out, tune.start ?? 0);
  out = spawnSpec(out, tune.t2);
  return { ...out, moves: tune.moves };
}

/** Spec eines Levels 51–184 (Grund-Spec + Nachjustierung). */
export function extendedSpec(index: number): LevelSpec {
  return applyTune(baseSpec(index), TUNING[index]);
}

/** Hilfsfunktion für Werkzeuge: das erste Ziel als kurzer Text. */
export function goalLabel(g: GoalSpec): string {
  switch (g.type) {
    case 'reachTier':
      return `Stufe ${g.tier}`;
    case 'release':
      return `${g.count}× Aufbruch`;
    case 'deliver':
      return `${g.count}× Stufe ${g.tier} liefern`;
    case 'score':
      return `${g.points} Punkte`;
    case 'collectSpores':
      return `${g.count} Sporen`;
    case 'rescue':
      return `${g.count}× retten`;
    case 'calmStrays':
      return `${g.count}× beruhigen`;
    case 'heal':
      return 'heilen';
    case 'clearScrap':
      return 'Schrott räumen';
    case 'clearRot':
      return 'Fäulnis eindämmen';
  }
}
