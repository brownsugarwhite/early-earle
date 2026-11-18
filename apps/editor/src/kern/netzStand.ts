// Zuletzt gebautes Kern-Netz, ohne den Worker-Client zu laden (Module wie die Maulebene lesen es; Tests ohne DOM und
// Worker laden sie mit). `kernBauen` setzt es vor dem Anzeige-Stand, Abonnenten lesen es synchron.
import type { WesenNetz } from '@ee/shape/kern';
import { create } from 'zustand';

/** `gewichte`: Schlüssel der Gewichte, mit denen das Netz gebaut ist (B7: Werkzeuge greifen nur auf ein Netz zu, das zeigt, was gerade gezeigt werden soll) */
type Stand = { netz: WesenNetz; skalierung: number; gewichte?: string };
let letztes: Stand | null = null;

/** Zähler je neuem Netz: Ansichten, die aus dem Netz zeichnen (wirksame Lippenlinien), abonnieren ihn. */
export const useNetzStand = create<{ version: number }>(() => ({ version: 0 }));

export function setzeAktuellesNetz(n: Stand | null): void {
  letztes = n;
  useNetzStand.setState((s) => ({ version: s.version + 1 }));
}

/** Das zuletzt gebaute Netz (für Treffer, Griffe und Maulpunkte im Hauptthread), mit dem Maßstab des Dokuments. */
export function aktuellesNetz(): Stand | null {
  return letztes;
}
