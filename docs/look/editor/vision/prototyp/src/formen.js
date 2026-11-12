// Florians Formen (aus kurven.html gesichert) als Ruhenetz mit ihren Loops. Die Haut rechnet hier der Ersatzlöser,
// nicht sein Löser: Die Form bleibt, wie er sie gesichert hat, bis man zieht.
import vogel from '../daten/strange_bird.txt';
import fisch from '../daten/teat_firefish.txt';
import kaputt from '../daten/test_kaputt.txt';
import { Netz } from './netz.js';
import { neuerPunkt, neueId, PROBEN } from './linien.js';

const QUELLEN = { vogel, fisch, kaputt };

async function entpacken(b64) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const strom = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(strom).text());
}

export const formNamen = Object.keys(QUELLEN);

export async function formHolen(name) {
  const d = await entpacken(QUELLEN[name]);
  const netz = new Netz(new Float32Array(d.pos), new Uint32Array(d.tri), new Int32Array(d.spiegel));
  const linien = d.loops.map((L) => ({
    id: neueId(),
    art: L.art,
    punkte: L.punkte.map((P) => {
      const q = neuerPunkt(P.p, P.ein, P.aus, P.ecke, P.kante);
      q.kreuz = P.kreuz ? 1000 + P.kreuz : 0;
      q.vonSelbst = P.vonSelbst;
      return q;
    }),
    proben: [],
  }));
  return { netz, linien };
}

export { PROBEN };
