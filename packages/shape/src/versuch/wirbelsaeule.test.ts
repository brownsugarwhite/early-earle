// VERSUCH (12.10.2026 abends): Wirbelsäule – Messungen an Florians Wesen (Pixel = Kachel · 461 in der Grundansicht).
import { describe, expect, it } from 'vitest';
import langhals from '../../../../apps/editor/public/versuch/langhals/langhals.json';
import rex from '../../../../apps/editor/public/versuch/rex/rex.json';
import robbe from '../../../../apps/editor/public/versuch/robbe/robbe.json';
import tiger from '../../../../apps/editor/public/versuch/tiger/tiger.json';
import type { V2 } from '../bezier';
import { neuesDokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import { unterteilenMehrfach } from './catmullClark';
import { selbstDurchdringungen } from './pruefen';
import { geschlossen } from './tigerKaefig';
import { umrissAusNetz } from './umriss3d';
import { type Vorlage, vorlageDokument } from './vorlagen';
import { linieDurch } from './linie3d';
import { eigeneWirbelsaeule, kaefigAusSprossen, wirbelBiegen, wirbelKaefig } from './wirbelsaeule';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now: () => number };

const PX = 461;

function zumZug(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  for (let k = 0; k < zug.length; k++) {
    const a = zug[k]!;
    const b = zug[(k + 1) % zug.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y));
  }
  return best;
}

/** Abweichung zweier geschlossener Umrisse in Pixeln: größte und mittlere (beide Richtungen). */
function abweichung(a: readonly V2[], b: readonly V2[]): { max: number; mittel: number } {
  const ab = a.map((p) => zumZug(p, b));
  const ba = b.map((p) => zumZug(p, a));
  const alle = [...ab, ...ba];
  return { max: Math.max(...alle) * PX, mittel: (alle.reduce((s, x) => s + x, 0) / alle.length) * PX };
}

const WESEN: [string, Vorlage][] = [
  ['Langhals', langhals as unknown as Vorlage],
  ['Robbe', robbe as unknown as Vorlage],
  ['Rex', rex as unknown as Vorlage],
  ['Tiger', tiger as unknown as Vorlage],
];

describe('Wirbelsäule (Versuch)', () => {
  it('Kugel: Wirbelsäule waagerecht, Umrisse getroffen, Netz geschlossen', () => {
    const wk = wirbelKaefig(neuesDokument());
    expect(geschlossen(wk.netz)).toBe(true);
    const fein = unterteilenMehrfach(wk.netz, 3);
    const d = neuesDokument();
    for (const a of ['seite', 'front', 'top'] as const) {
      const soll = pfadAbtasten(vollerPfad(d.profile[a]), 32);
      const ist = umrissAusNetz(fein, a, 400)[0]!;
      const ab = abweichung(ist, soll);
      console.log(`Kugel ${a}: max ${ab.max.toFixed(2)} px, mittel ${ab.mittel.toFixed(2)} px`);
      expect(ab.max).toBeLessThan(3);
    }
  });

  it('Langhals: Sprossen im Hals waagerecht (Breite aus der Front), im Rumpf und Kopf senkrecht (aus dem Top)', () => {
    const wk = wirbelKaefig(vorlageDokument(langhals as unknown as Vorlage, 'zu', 'Langhals'));
    const stehend = wk.sprossen.filter((s) => s.liegend < 0.5);
    expect(stehend.length).toBeGreaterThan(8);
    // stehende Ringe liegen im Hals: über dem Rumpf, unter dem Kopf
    const ys = stehend.map((s) => (s.oben.y + s.unten.y) / 2);
    const alle = wk.sprossen.map((s) => (s.oben.y + s.unten.y) / 2);
    expect(Math.min(...ys)).toBeGreaterThan(Math.min(...alle));
    expect(Math.max(...ys)).toBeLessThan(Math.max(...alle));
    expect(stehend.filter((s) => s.quelle === 'front').length).toBeGreaterThan(stehend.length * 0.7);
  });

  it('Pose: Wirbelsäule biegen dreht Hals und Kopf, Rumpf bleibt, gleiche Topologie', () => {
    const wk = wirbelKaefig(vorlageDokument(langhals as unknown as Vorlage, 'zu', 'Langhals'));
    const b = wirbelBiegen(wk, 0.62, 30, 0.3);
    const k = kaefigAusSprossen(b.sprossen, b.spitzeV, wk.wirbel[wk.wirbel.length - 1]!);
    expect(k.netz.punkte.length).toBe(wk.netz.punkte.length);
    expect(k.netz.flaechen).toEqual(wk.netz.flaechen);
    expect(geschlossen(k.netz)).toBe(true);
    // hinterer Teil (Rumpf) unverändert, Kopfspitze weit gewandert
    const n = wk.sprossen.length;
    expect(b.sprossen[n - 1]!.oben).toEqual(wk.sprossen[n - 1]!.oben);
    expect(Math.hypot(b.spitzeV.x - wk.wirbel[0]!.x, b.spitzeV.y - wk.wirbel[0]!.y) * PX).toBeGreaterThan(40);
    // Abstände entlang der Wirbelsäule bleiben (Gelenkkette)
    const m = (ss: typeof wk.sprossen, i: number) => ({ x: (ss[i]!.oben.x + ss[i]!.unten.x) / 2, y: (ss[i]!.oben.y + ss[i]!.unten.y) / 2 });
    for (let i = 0; i + 1 < n; i++) {
      const vor = Math.hypot(m(wk.sprossen, i).x - m(wk.sprossen, i + 1).x, m(wk.sprossen, i).y - m(wk.sprossen, i + 1).y);
      const nach = Math.hypot(m(b.sprossen, i).x - m(b.sprossen, i + 1).x, m(b.sprossen, i).y - m(b.sprossen, i + 1).y);
      expect(Math.abs(nach - vor)).toBeLessThan(1e-9);
    }
  });

  it('Selbst gezeichnete Wirbelsäule: bis zum Umriss verlängert, Ringe senkrecht dazu, Netz geschlossen', () => {
    const d = neuesDokument();
    // schräge Wirbelsäule durch die Kugel (vorn unten → hinten oben)
    const schraeg = { ...d, wirbelsaeule: linieDurch([[-0.15, 0.2, 0], [0, 0.27, 0], [0.15, 0.34, 0]]) };
    const e = eigeneWirbelsaeule(schraeg)!;
    expect(e).not.toBeNull();
    // Enden liegen auf dem Umriss (Abstand zur Kugelmitte = Radius)
    for (const q of [e.vorn, e.hinten]) expect(Math.abs(Math.hypot(q.x, q.y - 0.265) - 0.265) * PX).toBeLessThan(1.5);
    const wk = wirbelKaefig(schraeg);
    expect(geschlossen(wk.netz)).toBe(true);
    // die Wirbelsäule folgt der Zeichnung (steigt nach hinten)
    expect(wk.wirbel[wk.wirbel.length - 1]!.y).toBeGreaterThan(wk.wirbel[0]!.y + 0.1);
    // Seitenumriss bleibt getroffen
    const soll = pfadAbtasten(vollerPfad(d.profile.seite), 32);
    const ist = umrissAusNetz(unterteilenMehrfach(wk.netz, 3), 'seite', 400)[0]!;
    expect(abweichung(ist, soll).max).toBeLessThan(4);
    // Wirbelsäule außerhalb des Umrisses: Vorschlag und Hinweis
    const draussen = wirbelKaefig({ ...d, wirbelsaeule: linieDurch([[1, 1, 0], [1.2, 1.1, 0]]) });
    expect(draussen.hinweise.join(' ')).toContain('nicht im Umriss');
  });

  it('Florians Wesen: Hals hoch, Kopf drauf – Umrisse, Durchdringungen, Laufzeit (Messung)', () => {
    for (const [name, v] of WESEN) {
      const dok = vorlageDokument(v, 'zu', name);
      const t0 = performance.now();
      const wk = wirbelKaefig(dok);
      const ms = performance.now() - t0;
      expect(geschlossen(wk.netz)).toBe(true);
      const fein = unterteilenMehrfach(wk.netz, 3);
      const zeilen: string[] = [];
      for (const a of ['seite', 'front', 'top'] as const) {
        const soll = pfadAbtasten(vollerPfad(dok.profile[a]), 32);
        const ist = umrissAusNetz(fein, a, 400)[0]!;
        const ab = abweichung(ist, soll);
        zeilen.push(`${a} max ${ab.max.toFixed(1)} / mittel ${ab.mittel.toFixed(1)} px`);
      }
      const sd = selbstDurchdringungen(unterteilenMehrfach(wk.netz, 1));
      const quellen = wk.sprossen.reduce<Record<string, number>>((m, s) => ((m[s.quelle] = (m[s.quelle] ?? 0) + 1), m), {});
      const stehend = wk.sprossen.filter((s) => s.liegend < 0.5).length;
      console.log(
        `${name}: ${ms.toFixed(0)} ms; ${zeilen.join(' | ')}; Durchdringungen (Stufe 1) ${sd.paare}; Breite aus ${JSON.stringify(quellen)}; stehende Ringe ${stehend}/${wk.sprossen.length}; Hinweise ${JSON.stringify(wk.hinweise)}`,
      );
    }
  });
});
