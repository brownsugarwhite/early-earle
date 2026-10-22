// Phase 1 / M1: Wesen-Bau im Worker. Hält den letzten Stand (Ableitung, Klingen) und beantwortet „bauen“ (Netz mit
// übertragbaren Puffern) und „animieren“ (Klingen für eine Zeit). Der Hauptthread schickt nur Dokument und Bauplan.

import { type Bauplan, type FolgenErgebnis, type PoseMischung, type WesenStand, type ZahnMeldung, formenFolgen, netzPuffer, wesenAnimieren, wesenBauen } from '@ee/shape/kern';
import type { Dokument } from '@ee/shape';

export type FolgenAntwort = Omit<FolgenErgebnis, 'stand'>;
export type WorkerAuftrag = { id: number; typ: 'bauen'; dok: Dokument; plan: Partial<Bauplan>; schnell: boolean } | { id: number; typ: 'animieren'; zeit: number } | { id: number; typ: 'folgen'; dok: Dokument; plan: Partial<Bauplan> } | { id: number; typ: 'pruefen'; dok: Dokument; plan: Partial<Bauplan> } | { id: number; typ: 'mischen'; dok: Dokument; plan: Partial<Bauplan> };
export type WorkerAntwort = { id: number; typ: 'netz'; netz: ReturnType<typeof wesenBauen>['netz'] } | { id: number; typ: 'animation'; a: { positionen: Float32Array; normalen: Float32Array } | null } | { id: number; typ: 'folgen'; ergebnis: FolgenAntwort } | { id: number; typ: 'pruefung'; meldungen: ZahnMeldung[] } | { id: number; typ: 'mischung'; mischung: PoseMischung | null } | { id: number; typ: 'fehler'; fehler: string };

let stand: WesenStand | null = null;

self.onmessage = (e: MessageEvent<WorkerAuftrag>) => {
  const m = e.data;
  try {
    if (m.typ === 'bauen') {
      const r = wesenBauen(m.dok, m.plan, stand, m.schnell);
      stand = r.stand;
      const antwort: WorkerAntwort = { id: m.id, typ: 'netz', netz: r.netz };
      (self as unknown as Worker).postMessage(antwort, netzPuffer(r.netz));
    } else if (m.typ === 'folgen') {
      // Formen folgen (nach einem Pinselstrich): Profile an die Silhouette, Deltas nachgeführt; der Stand bleibt der neue
      const r = formenFolgen(m.dok, m.plan, stand);
      stand = r.stand;
      const antwort: WorkerAntwort = { id: m.id, typ: 'folgen', ergebnis: { profile: r.profile, spanten: r.spanten, deltas: r.deltas, fehlerPx: r.fehlerPx, eingefuegt: r.eingefuegt } };
      (self as unknown as Worker).postMessage(antwort);
    } else if (m.typ === 'pruefen') {
      // Zahnprüfung (Phase 2 M4): auf dem gemerkten Stand (keine neue Ableitung), nur die Befunde zurück
      const r = wesenBauen(m.dok, { ...m.plan, zahnPruefung: true }, stand, true);
      stand = r.stand;
      const antwort: WorkerAntwort = { id: m.id, typ: 'pruefung', meldungen: r.netz.zahnMeldungen ?? [] };
      (self as unknown as Worker).postMessage(antwort);
    } else if (m.typ === 'mischen') {
      // B7 „Aus der Vorschau“: die Mischung der Gewichte als neue Pose (genauer Bau auf dem gemerkten Stand)
      const r = wesenBauen(m.dok, { ...m.plan, mischung: true }, stand, false);
      stand = r.stand;
      const antwort: WorkerAntwort = { id: m.id, typ: 'mischung', mischung: r.netz.mischung };
      (self as unknown as Worker).postMessage(antwort);
    } else {
      const a = wesenAnimieren(stand, m.zeit);
      const antwort: WorkerAntwort = { id: m.id, typ: 'animation', a };
      (self as unknown as Worker).postMessage(antwort, a ? [a.positionen.buffer, a.normalen.buffer] : []);
    }
  } catch (err) {
    const antwort: WorkerAntwort = { id: m.id, typ: 'fehler', fehler: err instanceof Error ? err.message : String(err) };
    (self as unknown as Worker).postMessage(antwort);
  }
};
