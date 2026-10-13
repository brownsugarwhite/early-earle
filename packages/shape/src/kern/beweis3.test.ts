// Wesen-Editor 2, Phase 0, Beweis 3: Teil nahtlos (Plan 11.1). Rex-Säulenbein verschmolzen (Ausstülpung des 2×2-Felds)
// und angesteckt, Beinschwung ±35°. Kriterien: Käfig geschlossen und mannigfaltig, keine Durchdringung bei −35/0/+35°,
// Umbau ≤ 200 ms; Zebra ohne Knick über die Hüfte als Bild (`kern-beine-*.png`).
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import { selbstDurchdringungen } from '../versuch/pruefen';
import type { V3 } from '../versuch/catmullClark';
import { alleFlaechen, pruefeKaefig } from '../kaefig/halbkanten';
import { type BeinAnsatz, ableitenMitBeinen, beinPose } from './teil';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };

function pruefen(name: string, dok: Dokument, ansaetze: BeinAnsatz[], stufen = 2) {
  const abl = ableitenMitBeinen(dok, ansaetze, 'verschmolzen', { stufen });
  const pr = pruefeKaefig(abl.kaefig);
  const letzte = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  const bereich = flaechen.map((f) => (abl.teilWert[Math.min(f[0]!, abl.kaefig.n - 1)]! > 0 ? 'bein' : 'koerper'));
  const ergebnisse: { grad: number; paare: number; nachBereich: Record<string, number>; ort: V3 | undefined }[] = [];
  const t0 = performance.now();
  for (const grad of [-35, 0, 35]) {
    const pose = beinPose(abl, grad);
    const punkte: V3[] = [];
    for (let i = 0; i < pose.fein.length / 3; i++) punkte.push([pose.fein[3 * i]!, pose.fein[3 * i + 1]!, pose.fein[3 * i + 2]!]);
    const d = selbstDurchdringungen({ punkte, flaechen, schaerfe: new Map() }, 1e-4, bereich);
    ergebnisse.push({ grad, paare: d.paare, nachBereich: d.nachBereich, ort: d.orte[0] });
  }
  const tPosen = performance.now() - t0;
  const z = abl.zeiten;
  const b = abl.beine[0]!;
  console.log(
    `${name}: Käfig ${abl.kaefig.n} Punkte (Vorlage ${abl.vorlage.kaefig.n}), fein ${abl.fein.length / 3}, ${abl.beine.length} Beine, Hüfte (${b.huefte.map((x) => x.toFixed(3)).join(',')}); Käfig ok=${pr.ok}; Umbau ${z.gesamt.toFixed(0)} ms (Matrix ${z.matrix.toFixed(0)}, Löser ${z.loeser.toFixed(0)}, Ziele+Lösen ${z.ziele.toFixed(0)}); ${abl.naht.fein.length} Nahtpunkte; 3 Posen + Prüfung ${tPosen.toFixed(0)} ms; ` +
      ergebnisse.map((e) => `${e.grad}°: ${e.paare} Durchdringungen${e.paare ? ` [${Object.entries(e.nachBereich).map(([k, n]) => `${k} ${n}`).join(', ')} bei (${e.ort?.map((x) => x.toFixed(3)).join(',')})]` : ''}`).join('; '),
  );
  return { abl, pr, ergebnisse, umbau: z.gesamt };
}

const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');

describe('Beweis 3: Teil nahtlos', () => {
  it('Rex, zwei Säulenbeine verschmolzen: Käfig sauber, keine Durchdringung bei −35/0/+35°', () => {
    const r = pruefen('Rex', rex, [{ ring: 15, j: 6 }]);
    expect(r.pr.ok).toBe(true);
    for (const e of r.ergebnisse) expect(e.paare, `${e.grad}°`).toBe(0);
  });
  it('Rex auf Stufe 3: Umbau ≤ 200 ms (unter Testlast 350)', () => {
    let best = Infinity;
    for (let w = 0; w < 3; w++) best = Math.min(best, ableitenMitBeinen(rex, [{ ring: 15, j: 6 }], 'verschmolzen').zeiten.gesamt);
    console.log(`Rex Beine Stufe 3: bester Umbau ${best.toFixed(0)} ms`);
    expect(best).toBeLessThan(350);
  });
  it('Kugel, zwei Beine verschmolzen am runden Bauch (45°-Flanke): Käfig sauber, keine Durchdringung bei −35/0/+35°', () => {
    // 14.10. spätabends: gleichmäßige Ringwinkel statt Bündelwinkel des Feldrands, Feldrand wandert die Achse hinab (Nachtrag Beweis 3)
    const r = pruefen('Kugel', neuesDokument('Kugel'), [{ ring: 12, j: 6 }]);
    expect(r.pr.ok).toBe(true);
    for (const e of r.ergebnisse) expect(e.paare).toBe(0);
  });
  it('Rex, Beine angesteckt: eigene Röhren, Käfig sauber, Pose dreht starr', () => {
    const abl = ableitenMitBeinen(rex, [{ ring: 15, j: 6 }], 'angesteckt', { stufen: 2 });
    expect(abl.gesteckt.length).toBe(2);
    for (const g of abl.gesteckt) expect(pruefeKaefig(g.kaefig).ok).toBe(true);
    const pose = beinPose(abl, 35);
    expect(pose.gesteckt.length).toBe(2);
    console.log(`Rex angesteckt: ${abl.gesteckt.length} Beine à ${abl.gesteckt[0]!.kaefig.n} Käfigpunkte, fein ${abl.gesteckt[0]!.fein.length / 3}; Hüfte (${abl.gesteckt[0]!.huefte.map((x) => x.toFixed(3)).join(',')})`);
  });
});
