// Versionen je Block und je Art (Bauplan 3.4). Fassung 1 schreibt überall Version 1; jede Datei trägt die Versionen im Kopf. Eine
// neuere Datei oder eine unbekannte Art öffnet der Editor nur zum Lesen, mit Meldung; ältere Stände bringen die Migrationen nach vorn
// (nur vorwärts, Version für Version, nie gelöscht, jede mit einer Prüfdatei aus Florians Ozzy).
//
// Hier liegen die Typen `Migration` und `ArtBlock`, weil schon das Register der Arten (arten/register.ts, M0) sie braucht und
// migrationen/register.ts erst mit M1.2 kommt. Diese Datei reicht sie nur weiter (`export type { Migration, ArtBlock } from
// '../versionen'`) und hält die Liste MIGRATIONEN; niemand legt sie ein zweites Mal an.
//
// Arten heißen je Familie: Schlüssel '<familie>:<art>' (`ArtSchluessel`, typen/dokument.ts), Block ihrer Migrationen
// 'art:<familie>:<art>', etwa 'art:baustein:vierbeiner'. Der Bauplan schreibt in 3.4 'art:vierbeiner'; ohne Familie wären Chip und
// Effekt 'wasser' (M10) nicht zu unterscheiden. Der Typ lässt nur die Schreibweise mit Familie zu, das Schema ebenso.
import { z } from 'zod';
import type { ArtFamilie, ArtSchluessel, Block, Versionen } from './typen/dokument';

/** Version jedes Blocks in dieser Fassung; der Typ erzwingt, dass jeder Block genau einmal vorkommt */
export const BLOCK_VERSIONEN: Readonly<Record<Block, number>> = {
  kern: 1, knochen: 1, posen: 1, physik: 1, bild: 1, logik: 1, welt: 1, ton: 1,
};
/** Blöcke in der Reihenfolge von 3.4, zugleich die Reihenfolge im Kopf einer Datei */
export const BLOECKE: readonly Block[] = Object.keys(BLOCK_VERSIONEN) as Block[];

/** Familien der Arten in fester Reihenfolge */
export const ART_FAMILIEN: readonly ArtFamilie[] = ['baustein', 'chip', 'effekt', 'zusatz'];
const NAME = '[a-z][A-Za-z0-9]*';
/** Name einer Art: kleinCamelCase */
export const ART_NAME = new RegExp(`^${NAME}$`);
const ART_SCHLUESSEL = new RegExp(`^(?:${ART_FAMILIEN.join('|')}):${NAME}$`);

/** Block der Migrationen einer Art: 'art:' und ihr Schlüssel (`<familie>:<art>`), etwa 'art:baustein:vierbeiner' */
export type ArtBlock = `art:${ArtSchluessel}`;
export interface Migration { block: Block | ArtBlock; von: number; nach: number; schritt(roh: unknown): unknown; pruefdatei: string }

/** gültiger Schlüssel einer Art: bekannte Familie, ein Doppelpunkt, Name in kleinCamelCase */
export function istArtSchluessel(s: string): s is ArtSchluessel {
  return ART_SCHLUESSEL.test(s);
}

export function artBlock(schluessel: ArtSchluessel): ArtBlock {
  return `art:${schluessel}`;
}

export const blockSchema = z.enum(BLOECKE);
export const versionSchema = z.int().min(1);
export const artSchluesselSchema = z.custom<ArtSchluessel>(
  (x) => typeof x === 'string' && istArtSchluessel(x),
  "Art erwartet: '<familie>:<art>' mit Familie baustein, chip, effekt oder zusatz",
);
export const versionenSchema = z.strictObject({
  bloecke: z.strictObject({
    kern: versionSchema,
    knochen: versionSchema,
    posen: versionSchema,
    physik: versionSchema,
    bild: versionSchema,
    logik: versionSchema,
    welt: versionSchema,
    ton: versionSchema,
  }),
  arten: z.record(artSchluesselSchema, versionSchema),
});

/** Versionen, die diese Fassung schreibt: alle Blöcke aus BLOCK_VERSIONEN, dazu die genannten Arten (Schlüssel → Version) */
export function aktuelleVersionen(arten: Readonly<Record<ArtSchluessel, number>>): Versionen {
  return { bloecke: { ...BLOCK_VERSIONEN }, arten: { ...arten } };
}

export interface Versionsabgleich {
  /** neuer als diese Fassung: Studio öffnet die Datei nur zum Lesen */
  neuer: { block: Block | ArtBlock; datei: number; aktuell: number }[];
  /** Arten, die diese Fassung nicht kennt: nur zum Lesen */
  unbekannt: ArtBlock[];
  /** älter: die Migrationen von `von` bis `nach` laufen Version für Version */
  aelter: { block: Block | ArtBlock; von: number; nach: number }[];
}

/** vergleicht den Kopf einer Datei mit dieser Fassung; Blöcke in der Reihenfolge von BLOECKE, Arten nach ihrem Schlüssel */
export function versionenAbgleichen(datei: Versionen, aktuell: Versionen): Versionsabgleich {
  const a: Versionsabgleich = { neuer: [], unbekannt: [], aelter: [] };
  for (const b of BLOECKE) vergleichen(a, b, datei.bloecke[b], aktuell.bloecke[b]);
  for (const schluessel of Object.keys(datei.arten).sort() as ArtSchluessel[]) {
    const jetzt = aktuell.arten[schluessel];
    if (jetzt === undefined) a.unbekannt.push(artBlock(schluessel));
    else vergleichen(a, artBlock(schluessel), datei.arten[schluessel]!, jetzt);
  }
  return a;
}

/** nur zum Lesen öffnen: etwas ist neuer als diese Fassung oder unbekannt (3.4) */
export function nurLesenNach(a: Versionsabgleich): boolean {
  return a.neuer.length > 0 || a.unbekannt.length > 0;
}

function vergleichen(a: Versionsabgleich, block: Block | ArtBlock, datei: number, aktuell: number): void {
  if (datei > aktuell) a.neuer.push({ block, datei, aktuell });
  else if (datei < aktuell) a.aelter.push({ block, von: datei, nach: aktuell });
}
