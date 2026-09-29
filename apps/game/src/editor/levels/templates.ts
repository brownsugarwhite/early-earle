import { generateLevel, levelSpec, type LevelSpec } from '@ee/core';
import { ZONE_LABEL, normalizeDraft, type LevelDraft, type ZoneId } from './draft';

/**
 * „Neu aus Vorlage“: vier Presets pro Zone. Jede Vorlage baut auf einem kalibrierten Level derselben Zone auf
 * (Spec aus `@ee/core`), läuft durch den Generator und ist damit sofort gültig. Ein neuer Seed würfelt die
 * Platzierung neu (feste ASCII-Bretter wie die Feier-Level bleiben gleich).
 */

export type TemplateId = 'tutorial' | 'normal' | 'hard' | 'celebration';

export interface TemplateInfo {
  id: TemplateId;
  label: string;
  /** Ein Satz zur Idee. */
  blurb: string;
  band: string;
}

export const TEMPLATES: readonly TemplateInfo[] = [
  { id: 'tutorial', label: 'Tutorial', blurb: 'Ein neues Element, viel Luft', band: '1,0–1,3' },
  { id: 'normal', label: 'Normal', blurb: 'Eine Idee, zwei Elemente', band: '1,2–1,4' },
  { id: 'hard', label: 'Hart', blurb: 'Kurz und knackig', band: '1,6–2,0' },
  { id: 'celebration', label: 'Feier', blurb: 'Große Verschmelzung', band: '1,0–1,1' },
];

/** Basis-Level je Zone und Vorlage (Nummern aus dem 100-Level-Skelett, GDD 6.2). */
const BASE: Record<ZoneId, Record<TemplateId, number>> = {
  tjorizo: { tutorial: 6, normal: 23, hard: 13, celebration: 10 },
  syrup: { tutorial: 26, normal: 32, hard: 28, celebration: 30 },
  luzz: { tutorial: 51, normal: 67, hard: 55, celebration: 60 },
  wooding: { tutorial: 76, normal: 82, hard: 85, celebration: 90 },
};

export function templateBase(zone: ZoneId, t: TemplateId): number {
  return BASE[zone][t];
}

/** Baut den Entwurf; `index` = neue Levelnummer (bestimmt die ID), `reroll` verschiebt den Seed. */
export function buildTemplate(zone: ZoneId, t: TemplateId, index: number, reroll = 0): LevelDraft {
  const baseNo = BASE[zone][t];
  const spec: LevelSpec = levelSpec(baseNo);
  const label = TEMPLATES.find((x) => x.id === t)?.label ?? t;
  const name = `${label} · ${ZONE_LABEL[zone]}`;
  const attempt = (seed: number) => generateLevel({ ...spec, zone, index, seed, name });
  let level;
  try {
    level = attempt(spec.seed + reroll);
  } catch {
    level = attempt(spec.seed);
  }
  return normalizeDraft(level);
}
