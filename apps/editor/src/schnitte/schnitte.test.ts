// Versuch 13.10.: Bauweise „Schnitte“ gegen „creation“ (Platzhalter-Loft bzw. Kanten-Käfig, wie der Editor sie baut).
// Gemessen: Abweichung des 3D-Umrisses von den gezeichneten Profilen in px (461 px je Kachel), Teile der Schnitte, Bauzeit
// und Dreiecke. Prüfwesen: Kugel, Florians Überhang (13.10.), die nachgezogenen Rex, Tiger, Robbe, Langhals.
import { type Dokument, type V2, dokumentLesen, loftNetz, neuesDokument, pfadAbtasten, vollerPfad } from '@ee/shape';
import { type Netz, type V3, type Vorlage, schnittLoft, umrissAusNetz, vorlageDokument } from '@ee/shape/versuch';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { kantenBauen, kantenDreiecke, mitKanten } from '../kanten/kantenKoerper';
import { netzAusFlaeche } from './schnittKoerper';

const PX = 461;
const WESEN = ['kugel', 'ueberhang', 'rex', 'tiger', 'robbe', 'langhals'] as const;

function laden(wesen: string): Dokument {
  if (wesen === 'kugel') return neuesDokument('Kugel');
  const json = JSON.parse(readFileSync(new URL(`../../public/versuch/${wesen}/${wesen}.json`, import.meta.url), 'utf8')) as { format?: string };
  return json.format === 'ee-wesen' ? dokumentLesen(json) : vorlageDokument(json as Vorlage, 'zu', wesen);
}

/** Körper der bisherigen Bauweise („creation“) als Netz. */
function creation(dok: Dokument): { netz: Netz; dreiecke: number; ms: number } {
  const t0 = performance.now();
  if (mitKanten(dok)) {
    const t = kantenDreiecke(kantenBauen(dok));
    const ms = performance.now() - t0;
    const punkte: V3[] = [];
    for (let i = 0; i < t.positionen.length; i += 3) punkte.push([t.positionen[i]!, t.positionen[i + 1]!, t.positionen[i + 2]!]);
    const flaechen: number[][] = [];
    for (let i = 0; i < punkte.length; i += 3) flaechen.push([i, i + 1, i + 2]);
    return { netz: { punkte, flaechen, schaerfe: new Map() }, dreiecke: flaechen.length, ms };
  }
  const l = loftNetz(dok);
  const ms = performance.now() - t0;
  return { netz: netzAusFlaeche(l.positionen, l.indizes), dreiecke: l.indizes.length / 3, ms };
}

/** Gezeichneter Umriss je Ansicht in Weltkoordinaten (Top auf die Länge der Seite gestreckt wie im 3D). */
function sollUmriss(dok: Dokument, a: 'seite' | 'front' | 'top'): V2[] {
  const pts = pfadAbtasten(vollerPfad(dok.profile[a]), 32);
  if (a !== 'top') return pts;
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 32);
  const xMin = Math.min(...seite.map((p) => p.x));
  const xMax = Math.max(...seite.map((p) => p.x));
  const tMin = Math.min(...pts.map((p) => p.x));
  const tMax = Math.max(...pts.map((p) => p.x));
  return pts.map((p) => ({ x: xMin + ((p.x - tMin) / (tMax - tMin)) * (xMax - xMin), y: p.y }));
}

function abstandZumZug(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  for (let i = 0; i < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % zug.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y));
  }
  return best;
}

/** Abweichung des 3D-Umrisses von der Zeichnung in px: Mittel und Größtwert über beide Richtungen. */
export function umrissAbweichung(netz: Netz, dok: Dokument, a: 'seite' | 'front' | 'top'): { mittel: number; max: number } {
  const ist = umrissAusNetz(netz, a, 400);
  const soll = sollUmriss(dok, a);
  const d: number[] = [];
  for (const z of ist) for (const p of z) d.push(abstandZumZug(p, soll));
  for (const p of soll) d.push(Math.min(...ist.map((z) => abstandZumZug(p, z))));
  return { mittel: (d.reduce((s, x) => s + x, 0) / d.length) * PX, max: Math.max(...d) * PX };
}

describe('Versuch Schnitte gegen creation', () => {
  it('Umrisse, Teile, Bauzeit je Prüfwesen', () => {
    const zeilen: string[] = ['| Wesen | Bauweise | Seite Ø/max px | Front Ø/max px | Top Ø/max px | Teile max | Bauzeit ms | Dreiecke |', '|---|---|---|---|---|---|---|---|'];
    const ergebnis: Record<string, { seite: number; front: number; top: number }> = {};
    for (const wesen of WESEN) {
      const dok = laden(wesen);
      const c = creation(dok);
      const grob = schnittLoft(dok, { aufloesung: 56 });
      const s = schnittLoft(dok, { aufloesung: 112 });
      const sn = netzAusFlaeche(s.positionen, s.indizes);
      const fmt = (x: { mittel: number; max: number }) => `${x.mittel.toFixed(1)} / ${x.max.toFixed(1)}`;
      const uc = { seite: umrissAbweichung(c.netz, dok, 'seite'), front: umrissAbweichung(c.netz, dok, 'front'), top: umrissAbweichung(c.netz, dok, 'top') };
      const us = { seite: umrissAbweichung(sn, dok, 'seite'), front: umrissAbweichung(sn, dok, 'front'), top: umrissAbweichung(sn, dok, 'top') };
      zeilen.push(`| ${wesen} | creation | ${fmt(uc.seite)} | ${fmt(uc.front)} | ${fmt(uc.top)} | 1 | ${c.ms.toFixed(0)} | ${c.dreiecke} |`);
      zeilen.push(
        `| ${wesen} | schnitte | ${fmt(us.seite)} | ${fmt(us.front)} | ${fmt(us.top)} | ${s.info.maxTeile} | ${grob.info.millisekunden.toFixed(0)} (56) / ${s.info.millisekunden.toFixed(0)} (112) | ${grob.info.dreiecke} / ${s.info.dreiecke} |`,
      );
      ergebnis[wesen] = { seite: us.seite.mittel, front: us.front.mittel, top: us.top.mittel };
      expect(s.info.dreiecke).toBeGreaterThan(1000);
    }
    console.log(zeilen.join('\n'));
    // Kugel: Umriss in allen Ansichten unter einem Pixel im Mittel
    for (const a of ['seite', 'front', 'top'] as const) expect(ergebnis.kugel![a]).toBeLessThan(1);
    // Überhang: die Seite (Schnauze über Bauch) folgt der Zeichnung
    expect(ergebnis.ueberhang!.seite).toBeLessThan(3);
  });
});
