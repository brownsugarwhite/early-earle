// Schemas zu typen/logik.ts: Baustein, Messwert, Draht, Bedingungen, Aktionen, Regeln, Aufgabe.
import { z } from 'zod';
import type { Messwert } from '../typen/logik';
import { artDatenSchema, herkunftSchema, kennungSchema, ordnungSchema, punktSchema, wertSchema } from './grund';

export const bausteinSchema = z.strictObject({
  id: kennungSchema('bs'),
  art: z.string().min(1),
  an: kennungSchema('di'),
  regler: z.record(z.string(), wertSchema),
  posen: z.record(z.string(), kennungSchema('po')),
  daten: artDatenSchema,
  herkunft: herkunftSchema,
});

const MESSWERT = /^(?:bs|di)_[0-9A-Za-z]{10}\..+$/;
/** '<Kennung eines Bausteins oder Dings>.<name>' */
export const messwertSchema = z.custom<Messwert>(
  (x) => typeof x === 'string' && MESSWERT.test(x),
  "Messwert erwartet: '<Baustein oder Ding>.<name>'",
);

/** ein Paar einer Kennlinie [ein, aus]; der Schreiber setzt jedes auf eine Zeile (3.5 Nr. 2) */
export const kennlinienPaarSchema = z.tuple([z.number(), z.number()]);

export const drahtSchema = z.strictObject({
  id: kennungSchema('dr'),
  besitzer: kennungSchema('fig', 'sz'),
  quelle: z.union([kennungSchema('rg'), messwertSchema]),
  ziel: kennungSchema('rg'),
  kennlinie: z.array(kennlinienPaarSchema),
  kurve: z.enum(['weich', 'linear']),
  spiegel: z.strictObject({ ab: z.number(), um: z.number(), negieren: z.boolean() }).exactOptional(),
  glaetten: z.number(),
  herkunft: herkunftSchema,
});

export const bandSchema = z.enum(['koerper', 'regie', 'spieler', 'laune', 'grund']);
export const vergleichSchema = z.enum(['=', '!=', '<', '<=', '>', '>=']);
export const wertquelleSchema = z.union([
  z.strictObject({ messwert: messwertSchema }),
  z.strictObject({ zustand: kennungSchema('bs') }),
  z.strictObject({ regler: kennungSchema('rg') }),
  z.strictObject({ zaehler: kennungSchema('bs') }),
]);
export const bedingungSchema = z.strictObject({
  links: wertquelleSchema,
  vergleich: vergleichSchema,
  rechts: z.union([z.number(), z.string()]),
  rueckweg: z.number().exactOptional(),
});

const ausMesswert = z.strictObject({ aus: messwertSchema });
export const aktionSchema = z.discriminatedUnion('tun', [
  z.strictObject({ tun: z.literal('pose'), ding: kennungSchema('di'), pose: kennungSchema('po'), variante: z.string().exactOptional() }),
  z.strictObject({ tun: z.literal('befehl'), baustein: kennungSchema('bs'), befehl: z.string(), wert: z.number().exactOptional() }),
  z.strictObject({ tun: z.literal('klang'), klang: kennungSchema('kl'), lautstaerke: z.union([z.number(), ausMesswert]).exactOptional() }),
  z.strictObject({ tun: z.literal('effekt'), effekt: kennungSchema('ef'), staerke: z.union([z.number(), ausMesswert]).exactOptional() }),
  z.strictObject({
    tun: z.literal('zaehler'),
    zaehler: kennungSchema('bs'),
    plus: z.number().exactOptional(),
    setzen: z.number().exactOptional(),
  }),
  z.strictObject({ tun: z.literal('zeitlupe'), faktor: z.number(), dauer: z.number() }),
  z.strictObject({ tun: z.literal('kamerastoss'), staerke: z.number() }),
  z.strictObject({ tun: z.literal('haptik'), staerke: z.enum(['leicht', 'mittel', 'stark']) }),
  z.strictObject({ tun: z.literal('launeBeenden') }),
  z.strictObject({ tun: z.enum(['zeigen', 'verbergen']), ding: kennungSchema('di') }),
  z.strictObject({ tun: z.literal('stoss'), ding: kennungSchema('di'), kraft: punktSchema }),
]);

/** Felder von RegelBasis, in jeder Regel zuerst */
const regelBasis = {
  id: kennungSchema('re'),
  szene: kennungSchema('sz'),
  geltung: z.union([z.strictObject({ art: z.string() }), z.strictObject({ ding: kennungSchema('di') })]),
  band: bandSchema,
  ordnung: ordnungSchema,
  aktiv: z.boolean(),
  herkunft: herkunftSchema,
};
export const regelSobaldSchema = z.strictObject({
  ...regelBasis,
  satz: z.literal('sobald'),
  ereignis: z.string(),
  falls: z.array(bedingungSchema),
  dann: z.array(aktionSchema),
  hoechstensAlle: z.number().exactOptional(),
});
export const regelSolangeSchema = z.strictObject({
  ...regelBasis,
  satz: z.literal('solange'),
  wenn: z.array(bedingungSchema),
  halte: z.array(z.strictObject({ kanal: z.string(), wert: z.union([z.number(), z.string()]) })),
  mindestens: z.number().exactOptional(),
});
export const regelLauneSchema = z.strictObject({
  ...regelBasis,
  satz: z.literal('laune'),
  name: z.string(),
  wenn: z.union([z.strictObject({ ereignis: z.string() }), z.strictObject({ chanceJeSekunde: z.number() })]),
  falls: z.array(bedingungSchema),
  haeufigkeit: z.strictObject({ basis: z.number(), launenRegler: z.string().exactOptional() }),
  ankuendigung: z.strictObject({ pose: kennungSchema('po'), dauer: z.number() }),
  wirkung: z.strictObject({
    soll: z.array(z.tuple([z.string(), z.union([z.number(), z.string()])])),
    pose: kennungSchema('po').exactOptional(),
    dauer: z.tuple([z.number(), z.number()]),
  }),
  ende: z.array(z.union([z.strictObject({ zeit: z.literal('um') }), z.strictObject({ ereignis: z.string() })])),
  danach: kennungSchema('po').exactOptional(),
  ruhezeit: z.number(),
});
export const regelSchema = z.discriminatedUnion('satz', [regelSobaldSchema, regelSolangeSchema, regelLauneSchema]);

export const aufgabeSchema = z.strictObject({
  id: kennungSchema('au'),
  szene: kennungSchema('sz'),
  text: z.string(),
  ordnung: ordnungSchema,
  vorlage: z.enum(['mal', 'ohne', 'waehrend', 'vor', 'erreicht']),
  ereignis: z.string().exactOptional(),
  anzahl: z.number().exactOptional(),
  zustand: z.string().exactOptional(),
  bis: z.string().exactOptional(),
  messwert: messwertSchema.exactOptional(),
  wert: z.number().exactOptional(),
  beweis: z.string().exactOptional(),
  herkunft: herkunftSchema,
});
