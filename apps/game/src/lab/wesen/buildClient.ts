import { buildCreature, type Bauplan, type BuildOptions, type CreatureBuild } from '@ee/creature';

/**
 * Baut Wesen im Worker, „neuester gewinnt“: Während ein Bau läuft, ersetzt jede neue Anfrage die wartende; nach dem
 * Ende startet nur die letzte. Ohne Worker (Tests, alte Umgebungen) wird synchron gebaut.
 */
export class BuildClient {
  private worker: Worker | null = null;
  private busy = false;
  private next: { bauplan: Bauplan; opts: BuildOptions; cb: (b: CreatureBuild) => void } | null = null;
  private current: { cb: (b: CreatureBuild) => void } | null = null;
  private id = 0;
  private readonly onError: (msg: string) => void;

  constructor(onError: (msg: string) => void = (m) => console.error('[wesen] Bau fehlgeschlagen:', m)) {
    this.onError = onError;
    try {
      this.worker = new Worker(new URL('./build.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<{ id: number; build?: CreatureBuild; error?: string }>) => {
        this.busy = false;
        const cur = this.current;
        this.current = null;
        if (e.data.error) this.onError(e.data.error);
        else if (e.data.build && cur) cur.cb(e.data.build);
        this.pump();
      };
      this.worker.onerror = (e) => {
        this.onError(e.message);
        this.busy = false;
        this.current = null;
        this.pump();
      };
    } catch {
      this.worker = null;
    }
  }

  request(bauplan: Bauplan, opts: BuildOptions, cb: (b: CreatureBuild) => void): void {
    if (!this.worker) {
      cb(buildCreature(bauplan, opts));
      return;
    }
    this.next = { bauplan, opts, cb };
    this.pump();
  }

  get pending(): boolean {
    return this.busy || this.next !== null;
  }

  private pump(): void {
    if (this.busy || !this.next || !this.worker) return;
    const job = this.next;
    this.next = null;
    this.busy = true;
    this.current = { cb: job.cb };
    this.worker.postMessage({ id: ++this.id, bauplan: job.bauplan, opts: job.opts });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.next = null;
    this.current = null;
  }
}
