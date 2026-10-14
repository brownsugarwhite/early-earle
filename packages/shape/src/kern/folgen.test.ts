// „Formen folgen“ (15.10. nachts): Nach einem Pinselstrich legen sich die Profile auf die Silhouette des Körpers, die
// Deltas werden nachgeführt — der Körper bleibt bitgenau, die Blätter zeigen die echte Form.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import type { V3 } from '../versuch/catmullClark';
import { alleFlaechen } from '../kaefig/halbkanten';
import { formenFolgen, profilAbweichungPx } from './folgen';
import { deltasAnwenden } from './pinsel';
import { wesenBauen } from './wesen';

declare const console: { log: (...a: unknown[]) => void };

describe('Formen folgen', () => {
  it('Kugel mit Beule oben: Seitenprofil folgt, Front/Top folgen, Körper bleibt bitgenau, Δ ≤ 2 px', () => {
    const dok = neuesDokument();
    const r0 = wesenBauen(dok, {}, null, false);
    const abl = r0.stand.abl;
    const n0 = abl.vorlage.kaefig.n;
    const xyz = abl.kaefig.xyz;
    // Beule: alle Vorlagenpunkte im oberen Viertel 0,05 nach oben (rechte Hälfte und Naht; links spiegelt der Kern)
    let yMax = -Infinity;
    let yMin = Infinity;
    for (let p = 0; p < n0; p++) {
      yMax = Math.max(yMax, xyz[3 * p + 1]!);
      yMin = Math.min(yMin, xyz[3 * p + 1]!);
    }
    const deltas = [];
    for (let p = 0; p < n0; p++) if (xyz[3 * p + 2]! >= -1e-9 && xyz[3 * p + 1]! > yMin + 0.75 * (yMax - yMin)) deltas.push({ punkt: p, d: [0, 0.05, 0] as [number, number, number] });
    expect(deltas.length).toBeGreaterThan(5);
    const dokB = { ...dok, kaefig: { deltas } };
    const vorher = deltasAnwenden(abl, deltas);
    const letzte = vorher.unterteilung.stufen[vorher.unterteilung.stufen.length - 1]!.kaefig;
    const flaechen = alleFlaechen(letzte);
    const punkte: V3[] = [];
    for (let i = 0; i < vorher.fein.length / 3; i++) punkte.push([vorher.fein[3 * i]!, vorher.fein[3 * i + 1]!, vorher.fein[3 * i + 2]!]);
    const dSeiteVor = profilAbweichungPx(dokB, 'seite', punkte, flaechen);
    const t0 = performance.now();
    const r = formenFolgen(dokB, {}, r0.stand);
    const dauer = performance.now() - t0;
    const dokN = { ...dokB, profile: r.profile, kaefig: { deltas: r.deltas } };
    const dSeite = profilAbweichungPx(dokN, 'seite', punkte, flaechen);
    const dFront = profilAbweichungPx(dokN, 'front', punkte, flaechen);
    const dTop = profilAbweichungPx(dokN, 'top', punkte, flaechen);
    console.log(`Formen folgen (Kugel, Beule 0,05): Seite ${dSeiteVor.toFixed(1)} → ${dSeite.toFixed(1)} px, Front ${dFront.toFixed(1)} px, Top ${dTop.toFixed(1)} px; Fehler des Fits ${Object.values(r.fehlerPx).map((x) => x.toFixed(2)).join(' / ')} px; Deltas ${deltas.length} → ${r.deltas.length}; ${dauer.toFixed(0)} ms`);
    // Profile liegen auf der Silhouette
    expect(dSeiteVor).toBeGreaterThan(5);
    expect(dSeite).toBeLessThan(2);
    expect(dFront).toBeLessThan(2);
    expect(dTop).toBeLessThan(2);
    // Knoten bleiben (höchstens eingefügte glatte dazu, wo ein Segment die Silhouette um > 2 px verfehlte)
    for (const a of ['seite', 'front', 'top'] as const) {
      expect(r.profile[a].knoten.length).toBeGreaterThanOrEqual(dok.profile[a].knoten.length);
      expect(r.profile[a].knoten.length).toBeLessThanOrEqual(dok.profile[a].knoten.length + 6);
    }
    console.log(`eingefügt: ${r.eingefuegt} Knoten (Seite ${r.profile.seite.knoten.length}, Front ${r.profile.front.knoten.length}, Top ${r.profile.top.knoten.length})`);
    // Der Körper bleibt bitgenau: neuer Bau (neue Profile + nachgeführte Deltas) = alter Körper mit Deltas
    const r2 = wesenBauen(dokN, {}, r.stand, false);
    const nachher = deltasAnwenden(r2.stand.abl, r.deltas);
    expect(nachher.fein.length).toBe(vorher.fein.length);
    let max = 0;
    for (let i = 0; i < vorher.fein.length; i++) max = Math.max(max, Math.abs(nachher.fein[i]! - vorher.fein[i]!));
    expect(max).toBeLessThan(1e-6);
    // und ein zweites Folgen ändert nichts mehr Wesentliches (keine Rückkopplung)
    const r3 = formenFolgen(dokN, {}, r2.stand);
    let maxKnoten = 0;
    for (const a of ['seite', 'front', 'top'] as const) {
      expect(r3.profile[a].knoten.length).toBe(r.profile[a].knoten.length);
      r3.profile[a].knoten.forEach((k, i) => (maxKnoten = Math.max(maxKnoten, Math.hypot(k.p.x - r.profile[a].knoten[i]!.p.x, k.p.y - r.profile[a].knoten[i]!.p.y))));
    }
    console.log(`zweites Folgen: Knoten bewegen sich höchstens ${(maxKnoten * dok.skalierung * 461).toFixed(2)} px, ${r3.eingefuegt} eingefügt`);
    expect(maxKnoten * dok.skalierung * 461).toBeLessThan(1);
  });
});
