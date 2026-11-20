// Vertrag: „Warum?“ und „Warum nicht?“ (Plan 4.5; Konzept 8). Die Laufzeit antwortet aus dem Ringpuffer ihrer Entscheidungen, auch für
// Regler („Ohr links: Pendel + Pose Erschrecken + Draht von Neigung“).
import type { Id } from '@ee/studio-format/typen/grund';
import type { Ereignis } from './ereignis';

export type WarumFrage = { regler: Id<'rg'>; takt: number } | { regel: Id<'re'>; takt: number } | { ereignis: Ereignis };
/** `saetze`: Antwort in Sätzen; `beteiligte`: Kennungen, die die Bühne dabei leuchten lässt */
export interface WarumAntwort { saetze: string[]; beteiligte: string[] }
