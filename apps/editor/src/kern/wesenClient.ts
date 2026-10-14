// Phase 1 / M1: Auftraggeber für den Wesen-Worker, „neuester Auftrag gewinnt“ (Muster aus apps/game/src/lab/wesen/buildClient.ts):
// Während ein Bau läuft, ersetzt jede neue Anfrage die wartende; nach dem Ende startet nur die letzte. Animationsbilder
// werden nur angefordert, wenn kein Auftrag läuft (sonst verfällt das Bild). Ohne Worker (Tests) wird synchron gebaut.

import { type Bauplan, type WesenNetz, type WesenStand, formenFolgen, wesenAnimieren, wesenBauen } from '@ee/shape/kern';
import type { Dokument } from '@ee/shape';
import type { FolgenAntwort, WorkerAntwort, WorkerAuftrag } from './wesen.worker';

type Bild = { positionen: Float32Array; normalen: Float32Array };

export class WesenClient {
  private worker: Worker | null = null;
  private busy = false;
  private naechster: { dok: Dokument; plan: Partial<Bauplan>; schnell: boolean; cb: (n: WesenNetz) => void } | null = null;
  /** Formen folgen (nach einem Pinselstrich): wartet hinter dem nächsten Bau, nur der neueste Auftrag */
  private naechsterFolgen: { dok: Dokument; plan: Partial<Bauplan>; cb: (r: FolgenAntwort | null) => void } | null = null;
  private laufend: { cb: (n: WesenNetz) => void } | { animation: (b: Bild | null) => void } | { folgen: (r: FolgenAntwort | null) => void } | null = null;
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
        if (m.typ === 'fehler') {
          this.fehler(m.fehler);
          if (lauf && 'folgen' in lauf) lauf.folgen(null);
        } else if (m.typ === 'netz' && lauf && 'cb' in lauf) lauf.cb(m.netz);
        else if (m.typ === 'animation' && lauf && 'animation' in lauf) lauf.animation(m.a);
        else if (m.typ === 'folgen' && lauf && 'folgen' in lauf) lauf.folgen(m.ergebnis);
        this.pumpen();
      };
      this.worker.onerror = (e) => {
        this.fehler(e.message);
        if (this.laufend && 'folgen' in this.laufend) this.laufend.folgen(null);
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

  /** Formen folgen: Profile an die Silhouette des gebauten Körpers, Deltas nachgeführt; null bei Fehler. */
  folgen(dok: Dokument, plan: Partial<Bauplan>, cb: (r: FolgenAntwort | null) => void): void {
    if (!this.worker) {
      try {
        const r = formenFolgen(dok, plan, this.stand);
        this.stand = r.stand;
        cb({ profile: r.profile, spanten: r.spanten, deltas: r.deltas, fehlerPx: r.fehlerPx, eingefuegt: r.eingefuegt });
      } catch (e) {
        this.fehler(e instanceof Error ? e.message : String(e));
        cb(null);
      }
      return;
    }
    this.naechsterFolgen?.cb(null);
    this.naechsterFolgen = { dok, plan, cb };
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
    return this.busy || this.naechster !== null || this.naechsterFolgen !== null;
  }

  private pumpen(): void {
    if (this.busy || !this.worker) return;
    if (this.naechster) {
      const job = this.naechster;
      this.naechster = null;
      this.busy = true;
      this.laufend = { cb: job.cb };
      const auftrag: WorkerAuftrag = { id: ++this.id, typ: 'bauen', dok: job.dok, plan: job.plan, schnell: job.schnell };
      this.worker.postMessage(auftrag);
      return;
    }
    if (this.naechsterFolgen) {
      const job = this.naechsterFolgen;
      this.naechsterFolgen = null;
      this.busy = true;
      this.laufend = { folgen: job.cb };
      const auftrag: WorkerAuftrag = { id: ++this.id, typ: 'folgen', dok: job.dok, plan: job.plan };
      this.worker.postMessage(auftrag);
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.naechster = null;
    this.naechsterFolgen = null;
    this.laufend = null;
  }
}
