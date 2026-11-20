// Register der Arten (Bauplan 4.1, 4.5): Bausteinarten, Chiparten, Effektarten und Arten von Zusatzbewegungen, je mit Schema,
// Version und Migrationen. Eine neue Art ist eine eigene Datei, ihr Schema und eine Zeile in ARTEN (Befund 28). Zusammenbau-Datei
// (2.2): Nur die Integration hängt hier Arten ein. Laden öffnet eine Datei mit einer unbekannten Art nur zum Lesen (3.4).
//
// Arten heißen je Familie (Schlüssel `<familie>:<art>`, `ArtSchluessel`), weil derselbe Name in zwei Familien vorkommt (Chip und
// Effekt `wasser`, M10); unter diesem Schlüssel stehen sie in `Versionen.arten` und im Block ihrer Migrationen ('art:<familie>:<art>',
// versionen.ts).
import type { ZodType } from 'zod';
import type { ArtFamilie, ArtSchluessel } from '../typen/dokument';
import type { ArtDaten } from '../typen/grund';
import { ART_FAMILIEN, ART_NAME, artBlock, type Migration } from '../versionen';
import { EFFEKTE } from './effekte';

export type { ArtFamilie } from '../typen/dokument';

export interface ArtSchema {
  art: string; familie: ArtFamilie; version: number; schema: ZodType<ArtDaten>; migrationen: Migration[];
  /** an Teilen mit wieGezeichnet (30 d): 'zeichnung' wirkt immer (Dickenregel, Kantenglättung, Verdecken, Weiß-Nachgeben; Chips
   *  Schwingen, Kette, Stauchen, Ruhig halten); 'bewegung' nur in Bewegung, in Ruhe null (Beinschattierung); 'nurFlorian' nur, wenn
   *  der Datensatz Herkunft 'dein' hat (Gelee, Schmierbild, Aufprallbild, Zittern, Bewegungslinien, Verformung nach Tempo, Schein,
   *  Auflösen, Kontakt- und Bodenschatten). Standard 'nurFlorian'. */
  aufGezeichnet?: 'zeichnung' | 'bewegung' | 'nurFlorian';
}
export type AufGezeichnet = NonNullable<ArtSchema['aufGezeichnet']>;

/** Registerliste: je Familie die Arten ihrer Datei (arten/bausteine.ts, chips.ts, zusatz.ts kommen in späteren Etappen dazu) */
const ARTEN: readonly (readonly ArtSchema[])[] = [EFFEKTE];

const register = new Map<ArtSchluessel, ArtSchema>();

/** Schlüssel einer Art im Register und in `Versionen.arten` */
export function artSchluessel(familie: ArtFamilie, art: string): ArtSchluessel {
  return `${familie}:${art}`;
}

/**
 * trägt eine Art ein (auch zur Laufzeit, etwa im Erweiterungstest). Geprüft wird: Name in kleinCamelCase, bekannte Familie, Version
 * ab 1 und Migrationen lückenlos von 1 bis zur Version, je eine pro Schritt im Block der Art. Dieselbe Art zweimal ist ein Fehler,
 * außer es ist derselbe Eintrag.
 */
export function artEintragen(a: ArtSchema): void {
  const schluessel = artSchluessel(a.familie, a.art);
  if (!ART_NAME.test(a.art)) throw new RangeError(`artEintragen: ungültiger Name ${JSON.stringify(a.art)}`);
  if (!ART_FAMILIEN.includes(a.familie)) throw new RangeError(`artEintragen: unbekannte Familie ${JSON.stringify(a.familie)}`);
  if (!Number.isSafeInteger(a.version) || a.version < 1) throw new RangeError(`artEintragen: ${schluessel} mit Version ${a.version}`);
  if (a.migrationen.length !== a.version - 1)
    throw new RangeError(`artEintragen: ${schluessel} Version ${a.version} braucht ${a.version - 1} Migrationen, hat ${a.migrationen.length}`);
  const block = artBlock(schluessel);
  const schritte = [...a.migrationen].sort((x, y) => x.von - y.von);
  schritte.forEach((m, i) => {
    if (m.block !== block || m.von !== i + 1 || m.nach !== i + 2)
      throw new RangeError(`artEintragen: ${schluessel} Migration ${m.block} ${m.von} → ${m.nach} passt nicht (erwartet ${block} ${i + 1} → ${i + 2})`);
  });
  const da = register.get(schluessel);
  if (da !== undefined && da !== a) throw new RangeError(`artEintragen: ${schluessel} ist schon eingetragen`);
  register.set(schluessel, a);
}

export function artVon(familie: ArtFamilie, art: string): ArtSchema | undefined {
  return register.get(artSchluessel(familie, art));
}

/** eingetragene Arten, nach Schlüssel sortiert; ohne Familie alle */
export function artenVon(familie?: ArtFamilie): readonly ArtSchema[] {
  return [...register.keys()]
    .sort()
    .map((k) => register.get(k)!)
    .filter((a) => familie === undefined || a.familie === familie);
}

/** wie eine Art an Teilen mit `wieGezeichnet` wirkt (30 d); Standard 'nurFlorian' */
export function aufGezeichnetVon(a: ArtSchema): AufGezeichnet {
  return a.aufGezeichnet ?? 'nurFlorian';
}

/** Version jeder eingetragenen Art nach ihrem Schlüssel, sortiert (für `Versionen.arten`) */
export function artVersionen(): Record<ArtSchluessel, number> {
  const aus: Record<ArtSchluessel, number> = {};
  for (const k of [...register.keys()].sort()) aus[k] = register.get(k)!.version;
  return aus;
}

for (const liste of ARTEN) for (const a of liste) artEintragen(a);
