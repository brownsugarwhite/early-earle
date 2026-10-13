// Phase 1 / M1: Auftraggeber für den Wesen-Worker, „neuester Auftrag gewinnt“ (Muster aus apps/game/src/lab/wesen/buildClient.ts):
// Während ein Bau läuft, ersetzt jede neue Anfrage die wartende; nach dem Ende startet nur die letzte. Animationsbilder
// werden nur angefordert, wenn kein Auftrag läuft (sonst verfällt das Bild). Ohne Worker (Tests) wird synchron gebaut.

import { type Bauplan, type WesenNetz, type WesenStand, wesenAnimieren, wesenBauen } from '@ee/shape/kern';
import type { Dokument } from '@ee/shape';
import type { WorkerAntwort, WorkerAuftrag } from './wesen.worker';

type Bild = { positionen: Float32Array; normalen: Float32Array };

export class WesenClient {
  private worker: Worker | null = null;
  private busy = false;
  private naechster: { dok: Dokument; plan: Partial<Bauplan>; schnell: boolean; cb: (n: WesenNetz) => void } | null = null;
  private laufend: { cb: (n: WesenNetz) => void } | { animation: (b: Bild | null) => void } | null = null;
  private id = 0;
  /** ohne Worker: Stand im Hauptthread */
  private stand: WesenStand | null = null;
  private readonly fehler: (text: string) => void;

  constructor(fehler: (text: string) => void = (t) => console.error('[wesen] Bau fehlgeschlagen:', t)) {
    this.fehler = fehler;
    try {
      this.worker = new Worker(new URL('./wesen.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<WorkerAntwort>) => {
        const lauf = this.laufend;
        this.laufend = null;
        this.busy = false;
        const m = e.data;
        if (m.typ === 'fehler') this.fehler(m.fehler);
        else if (m.typ === 'netz' && lauf && 'cb' in lauf) lauf.cb(m.netz);
        else if (m.typ === 'animation' && lauf && 'animation' in lauf) lauf.animation(m.a);
        this.pumpen();
      };
      this.worker.onerror = (e) => {
        this.fehler(e.message);
        this.laufend = null;
        this.busy = false;
        this.pumpen();
      };
    } catch {
      this.worker = null;
    }
  }

  /** Netz bauen; läuft gerade ein Bau, wartet nur der neueste Auftrag. */
  bauen(dok: Dokument, plan: Partial<Bauplan>, schnell: boolean, cb: (n: WesenNetz) => void): void {
    if (!this.worker) {
      const r = wesenBauen(dok, plan, this.stand, schnell);
      this.stand = r.stand;
      cb(r.netz);
      return;
    }
    this.naechster = { dok, plan, schnell, cb };
    this.pumpen();
  }

  /** Klingen für die Zeit t; false, wenn gerade ein Auftrag läuft (Bild verfällt). */
  animieren(zeit: number, cb: (b: Bild | null) => void): boolean {
    if (!this.worker) {
      cb(wesenAnimieren(this.stand, zeit));
      return true;
    }
    if (this.busy || this.naechster) return false;
    this.busy = true;
    this.laufend = { animation: cb };
    const auftrag: WorkerAuftrag = { id: ++this.id, typ: 'animieren', zeit };
    this.worker.postMessage(auftrag);
    return true;
  }

  get beschaeftigt(): boolean {
    return this.busy || this.naechster !== null;
  }

  private pumpen(): void {
    if (this.busy || !this.naechster || !this.worker) return;
    const job = this.naechster;
    this.naechster = null;
    this.busy = true;
    this.laufend = { cb: job.cb };
    const auftrag: WorkerAuftrag = { id: ++this.id, typ: 'bauen', dok: job.dok, plan: job.plan, schnell: job.schnell };
    this.worker.postMessage(auftrag);
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.naechster = null;
    this.laufend = null;
  }
}
