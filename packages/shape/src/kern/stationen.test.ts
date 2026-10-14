// Plan „Zeichnung ist Form“ (15.10.), Schritt 3 „Käfig als Wahrheit“: eingefrorene Stationen. Florians Satz 3: „Den
// Giraffenhals ziehe ich hoch, und er bleibt hoch“ — was ich am Körper ändere, bleibt; keine Ansicht formt eine andere.
import { describe, expect, it } from 'vitest';
import { DokumentSchema, type Dokument, neuesDokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import langhalsJson from '../versuch/vorlagen/langhals.json';
import { ableiten, spineAnteile, umrissDicht } from './ableiten';

declare const console: { log: (...a: unknown[]) => void };
const PX = 461;

function nahtFehler(abl: ReturnType<typeof ableiten>, dok: Dokument): number {
  return nahtFehlerOrt(abl, dok).px;
}
function nahtFehlerOrt(abl: ReturnType<typeof ableiten>, dok: Dokument): { px: number; ort: [number, number] } {
  const u = umrissDicht(dok);
  let worst = 0;
  let ort: [number, number] = [0, 0];
  for (const p of abl.naht.fein) {
    const x = abl.fein[3 * p]!;
    const y = abl.fein[3 * p + 1]!;
    let best = Infinity;
    for (let i = 0; i < u.pts.length; i++) {
      const a = u.pts[i]!;
      const b = u.pts[(i + 1) % u.pts.length]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(a.x + t * dx - x, a.y + t * dy - y));
    }
    if (best > worst) {
      worst = best;
      ort = [x, y];
    }
  }
  return { px: worst * PX, ort };
}

/** Hals und Kopf des Langhalses um dy heben: Knoten der Seite vorn, weich ab x = 0 (voll ab x ≤ −0,12), samt Griffen. */
function halsHeben(dok: Dokument, dy: number): Dokument {
  const seite = dok.profile.seite;
  const w = (x: number) => Math.min(1, Math.max(0, -x / 0.12));
  const knoten = seite.knoten.map((k) => {
    const d = dy * w(k.p.x);
    return d > 0 ? { ...k, p: { x: k.p.x, y: k.p.y + d } } : k; // Griffe sind relativ zu p
  });
  return { ...dok, profile: { ...dok.profile, seite: { ...seite, knoten } } };
}

describe('Zeichnung ist Form, Schritt 3: eingefrorene Stationen', () => {
  const langhals = vorlageDokument(langhalsJson as unknown as Vorlage, 'zu', 'langhals');
  it('Ableiten mit den eigenen eingefrorenen Stationen ergibt denselben Käfig', () => {
    const a = ableiten(langhals, { stufen: 2 });
    const b = ableiten(langhals, { stufen: 2, stationen: a.gefroren });
    expect(b.gefroren).toEqual(a.gefroren);
    let d = 0;
    for (let i = 0; i < a.kaefig.xyz.length; i++) d = Math.max(d, Math.abs(a.kaefig.xyz[i]! - b.kaefig.xyz[i]!));
    expect(d).toBeLessThan(1e-9);
  });
  it('Langhals: Hals hoch mit eingefrorenen Ringen — Ringe bleiben, die Naht folgt der Kurve (≤ 2,5 px wie frei abgeleitet); frei abgeleitet springen die Ringe', () => {
    const a = ableiten(langhals, { stufen: 2 });
    const hoch = halsHeben(langhals, 0.08);
    const fest = ableiten(hoch, { stufen: 2, stationen: a.gefroren });
    const frei = ableiten(hoch, { stufen: 2 });
    expect(fest.gefroren.ringe).toEqual(a.gefroren.ringe);
    const fFest = spineAnteile(fest.altLeiter, fest.stationen);
    const fFrei = spineAnteile(frei.altLeiter, frei.stationen);
    let sprung = 0;
    for (let i = 0; i < fFest.length; i++) sprung = Math.max(sprung, Math.abs(fFest[i]! - fFrei[i]!));
    const naht = nahtFehler(fest, hoch);
    const o = nahtFehlerOrt(fest, hoch);
    const nahtFrei = nahtFehlerOrt(frei, hoch);
    console.log(`Langhals Hals +0,08: Naht mit eingefrorenen Ringen ${naht.toFixed(2)} px bei (${o.ort[0].toFixed(3)}, ${o.ort[1].toFixed(3)}); frei ${nahtFrei.px.toFixed(2)} px bei (${nahtFrei.ort[0].toFixed(3)}, ${nahtFrei.ort[1].toFixed(3)}); unverändert ${nahtFehler(a, langhals).toFixed(2)} px; größter Ringsprung bei freier Ableitung ${(sprung * 100).toFixed(2)} % der Wirbelsäule; Ecken fest ${JSON.stringify(fest.ecken)} frei ${JSON.stringify(frei.ecken)}`);
    expect(naht).toBeLessThan(2.5);
    expect(sprung).toBeGreaterThan(0.002);
  });
  it('Dokument: Stationen überstehen die Rundreise', () => {
    const a = ableiten(neuesDokument('Kugel'), { stufen: 2 });
    const dok: Dokument = { ...neuesDokument('Kugel'), kaefig: { deltas: [], stationen: a.gefroren } };
    const zurueck = DokumentSchema.parse(JSON.parse(JSON.stringify(dok)));
    expect(zurueck.kaefig?.stationen).toEqual(a.gefroren);
  });
});
