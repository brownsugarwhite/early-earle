/**
 * Alle Shader in der Reihenfolge der Wahl, nach Gruppen (Pläne `docs/plans/2026-11-20-ozzy-shader.md` und
 * `docs/plans/2026-11-20-ozzy-shader-runde-2.md`).
 */
import type { Voreinstellung } from '../kern';
import { ANIME } from './anime';
import { AQUARELL } from './aquarell';
import { AUTOLACK } from './autolack';
import { CARTOON } from './cartoon';
import { COMICDRUCK } from './comicdruck';
import { DAMPFWESEN } from './dampfwesen';
import { DAVINCI } from './davinci';
import { EARLE_HAUT, EARLE_SCHUPPEN } from './earle';
import { EINE_LINIE } from './eineLinie';
import { ERDE42 } from './erde42';
import { FELL, GIRAFFE, LEOPARD, PLUESCHTIER, SCHAF, TIGER } from './fell';
import { PUSTEBLUME, WOLKE, ZUCKERWATTE } from './flausch';
import { FEUER } from './feuer';
import { FLAMMENWESEN } from './flammenwesen';
import { DIAMANT, PAVE } from './diamant';
import { DISKOKUGEL } from './diskokugel';
import { GLAS } from './glas';
import { GLITCH } from './glitch';
import { GOUACHE } from './gouache';
import { HAUT } from './haut';
import { HORIZONT } from './horizont';
import { INDRAJAL } from './indrajal';
import { KNETE } from './knete';
import { LEGO } from './lego';
import { MANGA } from './manga';
import { MARKER } from './marker';
import { MULTIPLANE } from './multiplane';
import { NEUNZIGER } from './neunziger';
import { NOIR } from './noir';
import { OPAL } from './opal';
import { PIXEL } from './pixel';
import { PUNK } from './punk';
import { RAUCH } from './rauch';
import { SHINKAI } from './shinkai';
import { SIENKIEWICZ } from './sienkiewicz';
import { STAUB } from './staub';
import { TINTE } from './tinte';
import { TREX } from './trex';
import { SCHLEIMGEIST, TROPFSCHLEIM } from './schleim';
import { BRUCHSTEIN, FELS_SHADER } from './fels';
import { MATRIX } from './matrix';
import { ORNAMENT } from './ornament';
import { PEDRERA, TRENCADIS, TRENCADIS_VERSE } from './gaudi';
import { FLOR_POP, PANOT, PERSIANA } from './barcelona';
import { ARGON_BLAU, HALL_OF_FAME, NEON_ROT, NIETENLEDER } from './strasse';
import { PLATANE } from './natur';
import { BRAUNFELL, GIRAFFENFELL } from './samtfell';
import { SCHAFWOLLE } from './wolle';
import { NACHTSCHATTEN, NACHTSCHATTEN_ALPHA } from './nachtschatten';
import { SIN_CITY_GELB, SIN_CITY_REGEN, SIN_CITY_ROT } from './sincity';
import { ACHAT, GRANIT, JADE, LAPIS, MALACHIT, MARMOR, OBSIDIAN, SANDSTEIN } from './steine';
import { BAUMPYTHON, CHAMAELEON_HAUT, DRACHE_HAUT, ELEFANT, FROSCH_HAUT, KLAPPERSCHLANGE, KORALLENNATTER, KRAKE_HAUT, KROKODIL, REGENBOGENBOA, SALAMANDER, SCHLANGE } from './haeute';
import { TINTENFLECK } from './tintenfleck';
import { TROPFEN } from './tropfen';
import { TURING } from './turing';
import { UKIYOE } from './ukiyoe';
import { VENOM } from './venom';

export const VOREINSTELLUNGEN: Voreinstellung[] = [
  // Spider-Verse
  COMICDRUCK,
  AQUARELL,
  INDRAJAL,
  PUNK,
  MARKER,
  TINTENFLECK,
  DAVINCI,
  GLITCH,
  ERDE42,
  MULTIPLANE,
  NOIR,
  CARTOON,
  NEUNZIGER,
  SIENKIEWICZ,
  VENOM,
  PIXEL,
  LEGO,
  // Anime & Manga
  ANIME,
  MANGA,
  FLAMMENWESEN,
  DAMPFWESEN,
  SHINKAI,
  UKIYOE,
  GOUACHE,
  ORNAMENT,
  // Sin City
  SIN_CITY_REGEN,
  SIN_CITY_GELB,
  SIN_CITY_ROT,
  // Materialien
  AUTOLACK,
  HAUT,
  KNETE,
  EARLE_HAUT,
  EARLE_SCHUPPEN,
  GLAS,
  SCHLEIMGEIST,
  TROPFSCHLEIM,
  OPAL,
  DIAMANT,
  PAVE,
  DISKOKUGEL,
  // Stein
  FELS_SHADER,
  BRUCHSTEIN,
  MARMOR,
  GRANIT,
  SANDSTEIN,
  OBSIDIAN,
  JADE,
  LAPIS,
  MALACHIT,
  ACHAT,
  // Barcelona
  TRENCADIS,
  TRENCADIS_VERSE,
  PEDRERA,
  PANOT,
  FLOR_POP,
  PERSIANA,
  // Straße
  HALL_OF_FAME,
  NIETENLEDER,
  NEON_ROT,
  ARGON_BLAU,
  // Natur
  PLATANE,
  // Tiermuster
  LEOPARD,
  TIGER,
  GIRAFFE,
  ELEFANT,
  SCHLANGE,
  KLAPPERSCHLANGE,
  KORALLENNATTER,
  REGENBOGENBOA,
  BAUMPYTHON,
  KROKODIL,
  SALAMANDER,
  TREX,
  DRACHE_HAUT,
  NACHTSCHATTEN,
  NACHTSCHATTEN_ALPHA,
  FROSCH_HAUT,
  CHAMAELEON_HAUT,
  KRAKE_HAUT,
  TURING,
  // Fell & Flausch
  FELL,
  GIRAFFENFELL,
  BRAUNFELL,
  SCHAFWOLLE,
  SCHAF,
  PLUESCHTIER,
  WOLKE,
  ZUCKERWATTE,
  PUSTEBLUME,
  // Effekte
  EINE_LINIE,
  MATRIX,
  FEUER,
  TROPFEN,
  RAUCH,
  TINTE,
  STAUB,
  HORIZONT,
];
