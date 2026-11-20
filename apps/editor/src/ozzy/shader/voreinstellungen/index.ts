/**
 * Alle Shader in der Reihenfolge der Wahl: zuerst die zehn nach Spider-Verse, dann die zehn freien (Plan
 * `docs/plans/2026-11-20-ozzy-shader.md`).
 */
import type { Voreinstellung } from '../kern';
import { AQUARELL } from './aquarell';
import { COMICDRUCK } from './comicdruck';
import { DAVINCI } from './davinci';
import { EINE_LINIE } from './eineLinie';
import { ERDE42 } from './erde42';
import { FEUER } from './feuer';
import { GLAS } from './glas';
import { GLITCH } from './glitch';
import { HORIZONT } from './horizont';
import { INDRAJAL } from './indrajal';
import { MARKER } from './marker';
import { MULTIPLANE } from './multiplane';
import { OPAL } from './opal';
import { PUNK } from './punk';
import { RAUCH } from './rauch';
import { STAUB } from './staub';
import { TINTE } from './tinte';
import { TINTENFLECK } from './tintenfleck';
import { TROPFEN } from './tropfen';
import { TURING } from './turing';

export const VOREINSTELLUNGEN: Voreinstellung[] = [COMICDRUCK, AQUARELL, INDRAJAL, PUNK, MARKER, TINTENFLECK, DAVINCI, GLITCH, ERDE42, MULTIPLANE, EINE_LINIE, FEUER, TROPFEN, RAUCH, TINTE, GLAS, OPAL, STAUB, HORIZONT, TURING];
