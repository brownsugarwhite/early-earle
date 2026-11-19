// Ozzy im Raum: Bau im Hintergrund (die Seite bleibt bedienbar, solange das Netz entsteht)
import { bauen } from './bau';

self.onmessage = (e: MessageEvent<{ texte: Record<string, string>; h?: number; k?: number }>) => {
  const b = bauen(e.data.texte, e.data.h, e.data.k);
  const n = b.netz;
  const m = b.masken;
  (self as unknown as Worker).postMessage(b, [
    n.lagen.buffer,
    n.dreiecke.buffer,
    n.paar.buffer,
    n.paarW.buffer,
    n.seite.buffer,
    n.teil.buffer,
    n.normalen.buffer,
    m.front.feld.buffer,
    m.seite.feld.buffer,
    m.ruecken.feld.buffer,
  ]);
};
