// Zuletzt gebautes Kern-Netz, ohne den Worker-Client zu laden (Module wie die Maulebene lesen es; Tests ohne DOM und
// Worker laden sie mit). `kernBauen` setzt es vor dem Anzeige-Stand, Abonnenten lesen es synchron.
import type { WesenNetz } from '@ee/shape/kern';
import { create } from 'zustand';

let letztes: { netz: WesenNetz; skalierung: number } | null = null;

/** Zähler je neuem Netz: Ansichten, die aus dem Netz zeichnen (wirksame Lippenlinien), abonnieren ihn. */
export const useNetzStand = create<{ version: number }>(() => ({ version: 0 }));

export function setzeAktuellesNetz(n: { netz: WesenNetz; skalierung: number } | null): void {
  letztes = n;
  useNetzStand.setState((s) => ({ version: s.version + 1 }));
}

/** Das zuletzt gebaute Netz (für Treffer, Griffe und Maulpunkte im Hauptthread), mit dem Maßstab des Dokuments. */
export function aktuellesNetz(): { netz: WesenNetz; skalierung: number } | null {
  return letztes;
}
