// Form zuerst (11.11.2026): Wandert eine gesicherte Form von selbst? Runden ohne jeden Zug; je Runde: größter Weg, wo, Rauminhalt,
// größte Koordinate. Anlass: Florians `test_kaputt` (der Loop der Mitte lag nur auf der Haut: 0,12 bis 0,15 Einheiten je Runde, endlos).
// Aufruf aus packages/shape: NAME=test_kaputt npx vite-node ../../apps/editor/scripts/pruefen/form-achse-drift.ts   (RUNDEN=200, FLUSS=0/1, VORSICHT=0)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { LoopZug } from '../../../../packages/shape/src/dicht/loops';
import { entpacken } from '../../src/form/ablage';

import { messreiheSetzen } from '../../../../packages/shape/src/dicht/ausKurven';
if (process.env.FEST === '1') messreiheSetzen({ fest: true });
/** FLUSS=1 / FLUSS=0: Normalfluss erzwingen / verbieten; ohne Angabe wählt der Löser selbst (nur, wenn ein Loop lose aufliegt) */
const FLUSS_ART: { normalfluss?: boolean } = process.env.FLUSS === '1' ? { normalfluss: true } : process.env.FLUSS === '0' ? { normalfluss: false } : {};

const datei = process.env.DATEI ?? fileURLToPath(new URL(`../../../../wesen/${process.env.NAME ?? 'test_kaputt'}.eewesen`, import.meta.url));
const RUNDEN = Number(process.env.RUNDEN ?? 200);
const VORSICHT = process.env.VORSICHT !== '0';
const st = entpacken(new Uint8Array(fs.readFileSync(datei)));
const f = st.haut;
const nachbarn: number[][] = new Array<number[]>(f.n);
for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
const h: Haut = { pos: Float64Array.from(f.pos), tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
const inhalt = (): number => {
  let s = 0;
  const P = h.pos;
  for (let t = 0; t < h.tri.length; t += 3) {
    const a = 3 * h.tri[t]!;
    const b = 3 * h.tri[t + 1]!;
    const c = 3 * h.tri[t + 2]!;
    s += P[a]! * (P[b + 1]! * P[c + 2]! - P[b + 2]! * P[c + 1]!) - P[a + 1]! * (P[b]! * P[c + 2]! - P[b + 2]! * P[c]!) + P[a + 2]! * (P[b]! * P[c + 1]! - P[b + 1]! * P[c]!);
  }
  return s / 6;
};
const z = new LoopZug(h, st.loops, null, true, 'kurven', 'geometrie', { vorsicht: VORSICHT, ...FLUSS_ART });
const null0 = st.loops.map(() => null);
const vor = new Float64Array(h.pos.length);
const P0 = Float64Array.from(h.pos);
console.log(`${f.n} Punkte, Rauminhalt ${inhalt().toFixed(0)}`);
for (let r = 1; r <= RUNDEN; r++) {
  vor.set(h.pos);
  z.schritt(null0, 1);
  let w = 0;
  let wo = -1;
  let ges = 0;
  for (let v = 0; v < h.n; v++) {
    const a = Math.hypot(h.pos[3 * v]! - vor[3 * v]!, h.pos[3 * v + 1]! - vor[3 * v + 1]!, h.pos[3 * v + 2]! - vor[3 * v + 2]!);
    if (a > w) {
      w = a;
      wo = v;
    }
    const g = Math.hypot(h.pos[3 * v]! - P0[3 * v]!, h.pos[3 * v + 1]! - P0[3 * v + 1]!, h.pos[3 * v + 2]! - P0[3 * v + 2]!);
    if (g > ges) ges = g;
  }
  if (wo < 0) {
    let nan = 0;
    for (let i = 0; i < h.pos.length; i++) if (!Number.isFinite(h.pos[i]!)) nan++;
    const L = z.loeser as unknown as { faltRunden: number; folgeRunden: number; umgAnfang: number };
    console.log(`Runde ${r}: keine Bewegung · nicht endlich ${nan} · nur gefolgt in ${L.faltRunden} Runden · umgeschlagen beim Anlegen ${L.umgAnfang} · Vorsicht ${JSON.stringify(z.unruhe)}`);
    if (r > 6) break;
    continue;
  }
  if (r <= 12 || r % 10 === 0)
    console.log(`Runde ${String(r).padStart(3)}: Weg ${w.toFixed(3)} bei (${h.pos[3 * wo]!.toFixed(0)}, ${h.pos[3 * wo + 1]!.toFixed(0)}, ${h.pos[3 * wo + 2]!.toFixed(0)}) · seit Anfang ${ges.toFixed(2)} · Rauminhalt ${inhalt().toFixed(0)} · Vorsicht ${z.unruhe.stufen}${z.unruhe.fest ? ' fest' : ''}`);
}
