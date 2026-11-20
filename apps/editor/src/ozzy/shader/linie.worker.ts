/**
 * Eine Linie: die Rechnung im Hintergrund (`linieSim.ts`). Je Karte (Helligkeit, Form, Bewegung) ein paar Schritte, dann die Lagen
 * zurück. Ozzy schickt die nächste Karte erst, wenn die Lagen da sind: Es staut sich nichts.
 */
import { LinienSim, type LinienWerte } from './linieSim';

const sim = new LinienSim(60000);

type Nachricht =
  | { art: 'neu' }
  | {
      art: 'karte';
      daten: Uint8Array;
      kb: number;
      kh: number;
      skala: number;
      zeit: number;
      mit?: boolean;
      kamera: { vp: Float32Array; vpInv: Float32Array; sicht: Float32Array; nah: number; fern: number };
      werte: Partial<LinienWerte>;
    };

self.onmessage = (e: MessageEvent<Nachricht>) => {
  const d = e.data;
  if (d.art === 'neu') {
    sim.n = 0;
    return;
  }
  const t0 = performance.now();
  Object.assign(sim.w, d.werte);
  sim.karteSetzen(d.daten, d.kb, d.kh, d.skala, d.zeit, d.mit === false ? undefined : d.kamera);
  const schritte = Math.max(1, Math.round(sim.w.schritte));
  for (let k = 0; k < schritte; k++) sim.schritt();
  const pos = new Float32Array(sim.n * 2);
  for (let i = 0; i < sim.n; i++) {
    pos[2 * i] = sim.x[i]!;
    pos[2 * i + 1] = sim.y[i]!;
  }
  (self as unknown as Worker).postMessage({ art: 'linie', pos, n: sim.n, ms: performance.now() - t0, entwirrt: sim.entwirrt }, [pos.buffer]);
};
