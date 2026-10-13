// Wesen-Editor 2, Beweis 4 (Look live): Earle-Material aus `packages/render/src/creature2` auf dem Kern-Netz.
// Paletten nach `docs/look/wesen-refs/ZIELSYSTEM.md` (Tiger, Rex, Giraffe) und ein grüner Grundblob; Zonen so gesetzt,
// dass ein Bauchfeld hart und ein Rückenfeld weich auslaufend ist (Kriterium Beweis 4).

import type { CreatureColors, ZoneDaten } from '@ee/render';

export type Look = 'matcap' | 'earle';

export type Palette = {
  name: string;
  farben: CreatureColors;
  muster: { typ: 'uni' | 'streifen' | 'rosetten' | 'platten' | 'schuppen' | 'punkte' | 'bauchRuecken' | 'flecken' | 'ringel' | 'salamander' | 'koi'; dichte: number; groesse: number; drehung: number; spitze: number; zittern: number; seed: number };
  zonen: ZoneDaten[];
  /** Bauch/Rücken-Grenze (−1 … 1) und Stärke der Bauchfarbe */
  bauchlinie: number;
  bauchStaerke: number;
  glimmer: number;
};

export const PALETTEN: Record<string, Palette> = {
  tiger: {
    name: 'Tiger',
    farben: { grund: '#b56939', bauch: '#ddbc96', muster: '#392c24', akzent: '#f0d9b0', lippe: '#bf8e6c', rachen: '#6e2334', auge: '#101418', zonen: ['#e8d2ad', '#8f4a24', '#f3e6c8'], glimmer: '#f7d6a0' },
    muster: { typ: 'streifen', dichte: 0.55, groesse: 0.42, drehung: 0, spitze: 0.7, zittern: 0.3, seed: 3 },
    zonen: [
      { art: 'bauch', lage: 0.42, breite: 0.85, federung: 0.04, muster: 'frei' },
      { art: 'ruecken', lage: 0.55, breite: 0.45, federung: 0.9, muster: 'ueber' },
    ],
    bauchlinie: -0.15,
    bauchStaerke: 0.6,
    glimmer: 0.3,
  },
  rex: {
    name: 'Rex',
    farben: { grund: '#403445', bauch: '#6f5e78', muster: '#2b2230', akzent: '#9b4e4c', lippe: '#bf8e6c', rachen: '#2b0b10', auge: '#f0b030', zonen: ['#6f5e78', '#2e2535', '#f3e6c8'], glimmer: '#c9a0e0' },
    muster: { typ: 'uni', dichte: 0.5, groesse: 0.5, drehung: 0, spitze: 0.6, zittern: 0.3, seed: 1 },
    zonen: [
      { art: 'bauch', lage: 0.4, breite: 0.8, federung: 0.08, muster: 'frei' },
      { art: 'ruecken', lage: 0.5, breite: 0.5, federung: 0.85, muster: 'ueber' },
    ],
    bauchlinie: -0.2,
    bauchStaerke: 0.7,
    glimmer: 0.5,
  },
  blob: {
    name: 'Blob',
    farben: { grund: '#7fb63a', bauch: '#cfe69a', muster: '#4b7a2a', akzent: '#f7e27a', lippe: '#d98c8c', rachen: '#6e2334', auge: '#101418', zonen: ['#cfe69a', '#5c8f2c', '#f3e6c8'], glimmer: '#e8ff9a' },
    muster: { typ: 'punkte', dichte: 0.35, groesse: 0.3, drehung: 0, spitze: 0.5, zittern: 0.3, seed: 7 },
    zonen: [{ art: 'bauch', lage: 0.35, breite: 0.9, federung: 0.05, muster: 'frei' }],
    bauchlinie: -0.3,
    bauchStaerke: 0.5,
    glimmer: 0.6,
  },
  giraffe: {
    name: 'Giraffe',
    farben: { grund: '#e4cca0', bauch: '#f3e6c8', muster: '#777a6a', akzent: '#9a8a6a', lippe: '#bf8e6c', rachen: '#6e2334', auge: '#101418', zonen: ['#f3e6c8', '#c9b17f', '#f3e6c8'], glimmer: '#f7d6a0' },
    muster: { typ: 'platten', dichte: 0.5, groesse: 0.5, drehung: 0, spitze: 0.5, zittern: 0.25, seed: 5 },
    zonen: [{ art: 'bauch', lage: 0.4, breite: 0.8, federung: 0.06, muster: 'frei' }],
    bauchlinie: -0.2,
    bauchStaerke: 0.5,
    glimmer: 0.3,
  },
};

export type Auge = { pos: [number, number, number]; normale: [number, number, number]; groesse: number };
