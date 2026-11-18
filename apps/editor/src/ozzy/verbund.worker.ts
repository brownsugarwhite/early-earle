// Der Verbund im Hintergrund (Etappe 5, 19.11.2026): Das Fenster schickt die gezeigten Häute der Objekte, die verschmelzen oder
// abziehen (nur die, die sich geändert haben), hier werden sie geschnitten, gerundet und als ein Netz für die Anzeige zurückgegeben
// (`verbundRechnen.ts`). So stockt das Bild nie, auch wenn ein Stand in voller Feinheit ein Viertel einer Sekunde braucht.
import Module from 'manifold-3d';
import wasmOrt from 'manifold-3d/manifold.wasm?url';
import type { Wasm } from '../form/naht';
import { type VerbundAuftrag, type VerbundErgebnis, VerbundSpeicher, verbundRechnen } from './verbundRechnen';

const speicher = new VerbundSpeicher();
let geladen: Promise<Wasm> | null = null;
const laden = (): Promise<Wasm> =>
  (geladen ??= Module({ locateFile: () => wasmOrt }).then((w) => {
    w.setup();
    return w;
  }));

// die Aufträge der Reihe nach (der erste wartet, bis die Bibliothek geladen ist)
let reihe: Promise<void> = Promise.resolve();
self.onmessage = (e: MessageEvent<VerbundAuftrag>) => {
  const ziel = self as unknown as Worker;
  const auftrag = e.data;
  reihe = reihe.then(async () => {
    let ergebnis: VerbundErgebnis;
    try {
      ergebnis = verbundRechnen(await laden(), auftrag, speicher);
    } catch (fehler) {
      const leer = new Float32Array(0);
      ergebnis = { nr: auftrag.nr, netz: null, naht: leer, umriss: [leer, leer, leer], beisst: [], fehlt: [], dehnungRest: 0, ms: 0, fehler: fehler instanceof Error ? fehler.message : String(fehler) };
    }
    const n = ergebnis.netz;
    const felder = [...(n ? [n.pos, n.normal, n.index, n.hoehe, n.blatt, n.dehnung] : []), ergebnis.naht, ...ergebnis.umriss];
    ziel.postMessage(ergebnis, [...new Set(felder.map((f) => f.buffer as ArrayBuffer))]);
  });
};
