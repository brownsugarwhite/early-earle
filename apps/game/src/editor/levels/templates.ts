import { curveBand, generateLevel, levelSpec, type CurveType, type LevelSpec } from '@ee/core';
import { ZONE_LABEL, normalizeDraft, type LevelDraft, type ZoneId } from './draft';

/**
 * „Neu aus Vorlage“: fünf Presets pro Zone (Tutorial, Normal, Hart, Feier, Boss — die Kurventypen Einführung, Normal,
 * Hart, Spaß und Boss). Jede Vorlage baut auf einem kalibrierten Level des passenden Kurventyps auf (Spec aus
 * `@ee/core`), läuft durch den Generator und ist damit sofort gültig. Ein neuer Seed würfelt die Platzierung neu
 * (feste ASCII-Bretter wie die Feier-Level bleiben gleich).
 */

export type TemplateId = 'tutorial' | 'normal' | 'hard' | 'celebration' | 'boss';

export interface TemplateInfo {
  id: TemplateId;
  label: string;
  /** Ein Satz zur Idee. */
  blurb: string;
  band: string;
}

/** Kurventyp je Vorlage (Band und Zugbudget eines neuen Levels hinter Level 184 kommen aus der letzten Zone). */
export const TEMPLATE_CURVE_TYPE: Record<TemplateId, CurveType> = {
  tutorial: 'intro',
  normal: 'normal',
  hard: 'hard',
  celebration: 'fun',
  boss: 'boss',
};

/** Richtband der Vorlage (Anzeige, solange keine Vorschau gebaut ist): das Band des Typs in der letzten Zone. */
const bandText = (id: TemplateId): string => {
  const [lo, hi] = curveBand(TEMPLATE_CURVE_TYPE[id], 15);
  return `${lo.toFixed(1).replace('.', ',')}–${hi.toFixed(1).replace('.', ',')}`;
};

export const TEMPLATES: readonly TemplateInfo[] = [
  { id: 'tutorial', label: 'Tutorial', blurb: 'Ein neues Element, viel Luft', band: bandText('tutorial') },
  { id: 'normal', label: 'Normal', blurb: 'Eine Idee, zwei Elemente', band: bandText('normal') },
  { id: 'hard', label: 'Hart', blurb: 'Kurz und knackig', band: bandText('hard') },
  { id: 'celebration', label: 'Feier', blurb: 'Große Verschmelzung', band: bandText('celebration') },
  { id: 'boss', label: 'Boss', blurb: 'Zonenende, 5×5, knappe Züge', band: bandText('boss') },
];

/**
 * Basis-Level je Zone und Vorlage. Die Typen stammen aus der Kurve (`curveSpec`): Tutorial = Level mit neuer Elementart
 * (Einführung), Normal, Hart, Feier = Spaß, Boss. Level 1–50 sind eingefroren; ab 51 haben die Level neuen Inhalt
 * (Luzz 51–75, Wooding 76–124; Bosse gibt es erst ab Level 62, daher Boss-Basen aus 62/74/86/114).
 */
const BASE: Record<ZoneId, Record<TemplateId, number>> = {
  tjorizo: { tutorial: 6, normal: 23, hard: 13, celebration: 10, boss: 114 },
  syrup: { tutorial: 26, normal: 32, hard: 28, celebration: 30, boss: 74 },
  luzz: { tutorial: 51, normal: 53, hard: 55, celebration: 60, boss: 62 },
  wooding: { tutorial: 80, normal: 82, hard: 79, celebration: 90, boss: 86 },
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
