// Phase 1 / M1: Wesen-Bau im Worker. Hält den letzten Stand (Ableitung, Klingen) und beantwortet „bauen“ (Netz mit
// übertragbaren Puffern) und „animieren“ (Klingen für eine Zeit). Der Hauptthread schickt nur Dokument und Bauplan.

import { type Bauplan, type WesenStand, netzPuffer, wesenAnimieren, wesenBauen } from '@ee/shape/kern';
import type { Dokument } from '@ee/shape';

export type WorkerAuftrag = { id: number; typ: 'bauen'; dok: Dokument; plan: Partial<Bauplan>; schnell: boolean } | { id: number; typ: 'animieren'; zeit: number };
export type WorkerAntwort = { id: number; typ: 'netz'; netz: ReturnType<typeof wesenBauen>['netz'] } | { id: number; typ: 'animation'; a: { positionen: Float32Array; normalen: Float32Array } | null } | { id: number; typ: 'fehler'; fehler: string };

let stand: WesenStand | null = null;

self.onmessage = (e: MessageEvent<WorkerAuftrag>) => {
  const m = e.data;
  try {
    if (m.typ === 'bauen') {
      const r = wesenBauen(m.dok, m.plan, stand, m.schnell);
      stand = r.stand;
      const antwort: WorkerAntwort = { id: m.id, typ: 'netz', netz: r.netz };
      (self as unknown as Worker).postMessage(antwort, netzPuffer(r.netz));
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
