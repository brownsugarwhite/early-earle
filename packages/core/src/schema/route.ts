/**
 * RouteSchema — die eine Quelle der Kartenroute (`content/zones/route.json`, ADR 0002 Nachtrag „Route 15 + 1“):
 * die Autorenwelten entlang des Levelpfads (−z), je Abschnitt Welt und Anzahl Level, dahinter eine angedeutete,
 * gesperrte Zone (`state: "hinted"`, Torknoten) und die Welt, die überall jenseits der Route liegt (`beyond`: seitlich,
 * hinter dem Tor, vor dem Start).
 *
 * Abgeleitet (Loader `@ee/world` `resolveRoute`): Levelzahl (bis zum ersten `hinted`), Riesenbaum-Abschnitt
 * (`tree`), letzter Knoten (Torknoten), Level des Tors. Makroformen (`shape`, `shapeParams`) und Grenztröge (`gorges`)
 * sind hier nur deklariert — ihre Bedeutung kommt mit den Baustellen W3 und W5c.
 */

import { z } from 'zod';

/** Makroform eines Pfadabschnitts (W3): Mäander, Serpentine, Spirale, Gratweg, Kletterweg. */
export const ROUTE_SHAPES = ['meander', 'serpentine', 'spiral', 'ridge', 'climb'] as const;
export type RouteShape = (typeof ROUTE_SHAPES)[number];

/** Zustand eines Abschnitts: spielbar (Standard) oder angedeutet (gesperrt, „bald“, nur der Torknoten). */
export const ROUTE_STATES = ['playable', 'hinted'] as const;
export type RouteState = (typeof ROUTE_STATES)[number];

const WorldId = z.string().regex(/^w\d{2}$/, 'Weltkennung wie "w09"');

/** Parameter der Makroform (W3); alle optional, die Form wählt Standardwerte. */
export const RouteShapeParamsSchema = z
  .object({
    amplitude: z.number().positive(),
    turns: z.number().positive(),
    side: z.union([z.literal(-1), z.literal(1)]),
    centre: z.enum(['focal', 'landmark']),
    radius: z.number().positive(),
  })
  .partial();
export type RouteShapeParams = z.infer<typeof RouteShapeParamsSchema>;

export const RouteEntrySchema = z.object({
  /** Weltkennung der Weltdatei (`content/zones/worlds/NN.json` → `id`). */
  world: WorldId,
  /** Anzahl Level (Knoten) im Abschnitt; ein angedeuteter Abschnitt trägt nur den Torknoten (1) oder keinen (0). */
  levels: z.number().int().min(0),
  /** Länge entlang z (Welteinheiten); Standard `levels × nodeSpacing`. */
  length: z.number().positive().optional(),
  state: z.enum(ROUTE_STATES).optional(),
  /** Der Abschnitt trägt den Riesenbaum (seine Level steigen Stamm und Krone hinauf). Höchstens einer. */
  tree: z.literal(true).optional(),
  /** Makroform des Pfads (W3, nur deklariert). */
  shape: z.enum(ROUTE_SHAPES).optional(),
  shapeParams: RouteShapeParamsSchema.optional(),
  /** Freie Notiz (Weltname, Referenz) — ohne Bedeutung für das Spiel. */
  note: z.string().optional(),
});
export type RouteEntryDef = z.infer<typeof RouteEntrySchema>;

/** Grenztrog mit großer Brücke nach dem Abschnitt der Welt `after` (W5c, nur deklariert). */
export const RouteGorgeSchema = z.object({
  after: WorldId,
  width: z.number().positive(),
  depth: z.number().positive(),
  /** Meeresarm statt Trockental (w14 → w15). */
  water: z.boolean().optional(),
});
export type RouteGorgeDef = z.infer<typeof RouteGorgeSchema>;

export const RouteSchema = z
  .object({
    schemaVersion: z.literal(1),
    /** Abstand zweier Level entlang z (Welteinheiten). */
    nodeSpacing: z.number().positive(),
    /** Welt jenseits der Route: seitlich, hinter dem Tor, vor dem Start (angedeutete Zone, gesperrt). */
    beyond: z.object({ world: WorldId }),
    entries: z.array(RouteEntrySchema).min(1),
    gorges: z.array(RouteGorgeSchema).optional(),
  })
  .superRefine((route, ctx) => {
    let hinted = false;
    let trees = 0;
    route.entries.forEach((e, i) => {
      const isHinted = e.state === 'hinted';
      if (hinted && !isHinted) ctx.addIssue({ code: 'custom', path: ['entries', i, 'state'], message: 'nach einem angedeuteten Abschnitt folgen nur angedeutete' });
      hinted ||= isHinted;
      if (!isHinted && e.levels < 1) ctx.addIssue({ code: 'custom', path: ['entries', i, 'levels'], message: 'spielbare Abschnitte tragen mindestens ein Level' });
      if (e.tree) {
        trees++;
        if (isHinted) ctx.addIssue({ code: 'custom', path: ['entries', i, 'tree'], message: 'der Riesenbaum steht in einem spielbaren Abschnitt' });
      }
    });
    if (trees > 1) ctx.addIssue({ code: 'custom', path: ['entries'], message: 'höchstens ein Riesenbaum-Abschnitt' });
    for (const [i, g] of (route.gorges ?? []).entries()) {
      if (!route.entries.some((e) => e.world === g.after)) ctx.addIssue({ code: 'custom', path: ['gorges', i, 'after'], message: `Welt ${g.after} liegt nicht auf der Route` });
    }
  });

export type RouteDef = z.infer<typeof RouteSchema>;

export function parseRoute(input: unknown): RouteDef {
  return RouteSchema.parse(input);
}
