// Phase 1 / M1: Auftraggeber für den Wesen-Worker, „neuester Auftrag gewinnt“ (Muster aus apps/game/src/lab/wesen/buildClient.ts):
// Während ein Bau läuft, ersetzt jede neue Anfrage die wartende; nach dem Ende startet nur die letzte. Animationsbilder
// werden nur angefordert, wenn kein Auftrag läuft (sonst verfällt das Bild). Ohne Worker (Tests) wird synchron gebaut.

import { type Bauplan, type PoseMischung, type Stencil, type WesenNetz, type WesenStand, type ZahnMeldung, formenFolgen, wesenAnimieren, wesenBauen, zugStencil } from '@ee/shape/kern';
import type { Dokument } from '@ee/shape';
import type { FolgenAntwort, WorkerAntwort, WorkerAuftrag } from './wesen.worker';

type Bild = { positionen: Float32Array; normalen: Float32Array };

export class WesenClient {
  private worker: Worker | null = null;
  private busy = false;
  private naechster: { dok: Dokument; plan: Partial<Bauplan>; schnell: boolean; cb: (n: WesenNetz) => void } | null = null;
  /** Formen folgen (nach einem Pinselstrich): wartet hinter dem nächsten Bau, nur der neueste Auftrag */
  private naechsterFolgen: { dok: Dokument; plan: Partial<Bauplan>; cb: (r: FolgenAntwort | null) => void } | null = null;
  /** Zahnprüfung (Phase 2 M4): wartet hinter Bau und Folgen; ein neuer Bau verdrängt sie (sie gehörte zu einem älteren Dokument) */
  private naechsterPruefen: { dok: Dokument; plan: Partial<Bauplan>; cb: (m: ZahnMeldung[] | null) => void } | null = null;
  /** B7 „Aus der Vorschau“: wartet hinter Bau, Folgen und Prüfung; nur der neueste */
  private naechsterMischen: { dok: Dokument; plan: Partial<Bauplan>; cb: (m: PoseMischung | null) => void } | null = null;
  /** Genauer Zug: Stencil des Treffers (klein, vor allen anderen Aufträgen); nur der neueste */
  private naechsterStencil: { dreieck: number; flaeche: number; bary: [number, number, number]; cb: (s: Stencil | null) => void } | null = null;
  private laufend: { cb: (n: WesenNetz) => void } | { animation: (b: Bild | null) => void } | { folgen: (r: FolgenAntwort | null) => void } | { pruefen: (m: ZahnMeldung[] | null) => void } | { mischen: (m: PoseMischung | null) => void } | { stencil: (s: Stencil | null) => void } | null = null;
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
          if (lauf && 'pruefen' in lauf) lauf.pruefen(null);
          if (lauf && 'mischen' in lauf) lauf.mischen(null);
          if (lauf && 'stencil' in lauf) lauf.stencil(null);
        } else if (m.typ === 'netz' && lauf && 'cb' in lauf) lauf.cb(m.netz);
        else if (m.typ === 'stencil' && lauf && 'stencil' in lauf) lauf.stencil(m.stencil);
        else if (m.typ === 'mischung' && lauf && 'mischen' in lauf) lauf.mischen(m.mischung);
        else if (m.typ === 'animation' && lauf && 'animation' in lauf) lauf.animation(m.a);
        else if (m.typ === 'folgen' && lauf && 'folgen' in lauf) lauf.folgen(m.ergebnis);
        else if (m.typ === 'pruefung' && lauf && 'pruefen' in lauf) lauf.pruefen(m.meldungen);
        this.pumpen();
      };
      this.worker.onerror = (e) => {
        this.fehler(e.message);
        if (this.laufend && 'folgen' in this.laufend) this.laufend.folgen(null);
        if (this.laufend && 'pruefen' in this.laufend) this.laufend.pruefen(null);
        if (this.laufend && 'mischen' in this.laufend) this.laufend.mischen(null);
        if (this.laufend && 'stencil' in this.laufend) this.laufend.stencil(null);
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
    // eine wartende Prüfung gehört zu einem älteren Dokument: verwerfen (der Editor plant nach dem Bau neu)
    this.naechsterPruefen?.cb(null);
    this.naechsterPruefen = null;
    this.pumpen();
  }

  /** Zahnprüfung auf dem gemerkten Stand (bei zu, 25 %, 50 %, offen); null bei Fehler oder wenn ein neuer Bau sie verdrängt. */
  pruefen(dok: Dokument, plan: Partial<Bauplan>, cb: (m: ZahnMeldung[] | null) => void): void {
    if (!this.worker) {
      try {
        const r = wesenBauen(dok, { ...plan, zahnPruefung: true }, this.stand, true);
        this.stand = r.stand;
        cb(r.netz.zahnMeldungen ?? []);
      } catch (e) {
        this.fehler(e instanceof Error ? e.message : String(e));
        cb(null);
      }
      return;
    }
    this.naechsterPruefen?.cb(null);
    this.naechsterPruefen = { dok, plan, cb };
    this.pumpen();
  }

  /** B7 „Aus der Vorschau“: die Mischung der Gewichte im Bauplan als Daten einer neuen Pose; null bei Fehler. */
  mischen(dok: Dokument, plan: Partial<Bauplan>, cb: (m: PoseMischung | null) => void): void {
    if (!this.worker) {
      try {
        const r = wesenBauen(dok, { ...plan, mischung: true }, this.stand, false);
        this.stand = r.stand;
        cb(r.netz.mischung);
      } catch (e) {
        this.fehler(e instanceof Error ? e.message : String(e));
        cb(null);
      }
      return;
    }
    this.naechsterMischen?.cb(null);
    this.naechsterMischen = { dok, plan, cb };
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

  /**
   * Genauer Zug (Plan 2026-10-20): Hautpunkt im gezeigten Körperdreieck als Mischung der Käfigpunkte; null, wenn der Stand
   * nicht zum gezeigten Netz passt oder der Körper keine Grundlage hat. Läuft vor allen wartenden Aufträgen.
   */
  stencil(dreieck: number, flaeche: number, bary: [number, number, number], cb: (s: Stencil | null) => void): void {
    if (!this.worker) {
      cb(zugStencil(this.stand, dreieck, flaeche, bary));
      return;
    }
    this.naechsterStencil?.cb(null);
    this.naechsterStencil = { dreieck, flaeche, bary, cb };
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
    return this.busy || this.naechster !== null || this.naechsterFolgen !== null || this.naechsterPruefen !== null || this.naechsterMischen !== null;
  }

  private pumpen(): void {
    if (this.busy || !this.worker) return;
    if (this.naechsterStencil) {
      const job = this.naechsterStencil;
      this.naechsterStencil = null;
      this.busy = true;
      this.laufend = { stencil: job.cb };
      const auftrag: WorkerAuftrag = { id: ++this.id, typ: 'stencil', dreieck: job.dreieck, flaeche: job.flaeche, bary: job.bary };
      this.worker.postMessage(auftrag);
      return;
    }
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
      return;
    }
    if (this.naechsterPruefen) {
      const job = this.naechsterPruefen;
      this.naechsterPruefen = null;
      this.busy = true;
      this.laufend = { pruefen: job.cb };
      const auftrag: WorkerAuftrag = { id: ++this.id, typ: 'pruefen', dok: job.dok, plan: job.plan };
      this.worker.postMessage(auftrag);
      return;
    }
    if (this.naechsterMischen) {
      const job = this.naechsterMischen;
      this.naechsterMischen = null;
      this.busy = true;
      this.laufend = { mischen: job.cb };
      const auftrag: WorkerAuftrag = { id: ++this.id, typ: 'mischen', dok: job.dok, plan: job.plan };
      this.worker.postMessage(auftrag);
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.naechster = null;
    this.naechsterFolgen = null;
    this.naechsterPruefen = null;
    this.naechsterMischen = null;
    this.naechsterStencil = null;
    this.laufend = null;
  }
}
