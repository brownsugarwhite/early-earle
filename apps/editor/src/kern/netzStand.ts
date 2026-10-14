// Zuletzt gebautes Kern-Netz, ohne den Worker-Client zu laden (Module wie die Maulebene lesen es; Tests ohne DOM und
// Worker laden sie mit). `kernBauen` setzt es vor dem Anzeige-Stand, Abonnenten lesen es synchron.
import type { WesenNetz } from '@ee/shape/kern';

let letztes: { netz: WesenNetz; skalierung: number } | null = null;

export function setzeAktuellesNetz(n: { netz: WesenNetz; skalierung: number } | null): void {
  letztes = n;
}

/** Das zuletzt gebaute Netz (für Treffer, Griffe und Maulpunkte im Hauptthread), mit dem Maßstab des Dokuments. */
export function aktuellesNetz(): { netz: WesenNetz; skalierung: number } | null {
  return letztes;
}
