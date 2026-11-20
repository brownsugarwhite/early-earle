/**
 * Alle Shader in der Reihenfolge der Wahl: zuerst die zehn nach Spider-Verse, dann die zehn freien (Plan
 * `docs/plans/2026-11-20-ozzy-shader.md`).
 */
import type { Voreinstellung } from '../kern';
import { AQUARELL } from './aquarell';
import { COMICDRUCK } from './comicdruck';
import { DAVINCI } from './davinci';
import { ERDE42 } from './erde42';
import { GLITCH } from './glitch';
import { INDRAJAL } from './indrajal';
import { MARKER } from './marker';
import { MULTIPLANE } from './multiplane';
import { PUNK } from './punk';
import { TINTENFLECK } from './tintenfleck';

export const VOREINSTELLUNGEN: Voreinstellung[] = [COMICDRUCK, AQUARELL, INDRAJAL, PUNK, MARKER, TINTENFLECK, DAVINCI, GLITCH, ERDE42, MULTIPLANE];
