// S1c (Plan „Liniennetz, Zielform, Käfig“, 16.10.): Kopplung jedes Punkts. Tor: nach jeder Geste Widerspruch ≤ 1 px in
// allen Blättern (stimmiger Anfang), keine neuen Knoten, alte Widersprüche bleiben, bis man angleicht.
import { describe, expect, it } from 'vitest';
import type { Dokument } from './dokument';
import { erreichbarkeit } from './kern/grundkoerper/huelle';
import { G_KOERPER, S0_KOERPER, gKoerperDokument, s0KoerperDokument } from './kern/pruefen/grundkoerper';
import { abgleichen } from './kopplung';
import { gekoppelt, punkteAngleichen } from './kopplungPunkte';
import { type Profile, istAchsKnoten, neuesDokument, verschiebeKnoten } from './index';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };

const widerspruch = (profile: Profile) => {
  const e = erreichbarkeit({ profile, skalierung: 1 } as Dokument);
  return { seite: e.seite.max, front: e.front.max, top: e.top.max, max: Math.max(e.seite.max, e.front.max, e.top.max) };
};

/** einfacher Zufall (reproduzierbar) */
function zufall(saat: number) {
  let s = saat >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const koerper = (): [string, Profile][] => [
  ['kugel', neuesDokument().profile],
  ...S0_KOERPER.map((n) => [n, s0KoerperDokument(n).profile] as [string, Profile]),
  ...G_KOERPER.map((n) => [n, gKoerperDokument(n).profile] as [string, Profile]),
];

describe('Kopplung jedes Punkts (S1c)', () => {
  it('Angleichen löst die Widersprüche der Prüfkörper auf (die führende Ansicht bleibt stehen)', () => {
    const zeilen: string[] = [];
    let schlimmste = 0;
    for (const [name, pr] of koerper()) {
      const vorher = widerspruch(pr);
      for (const fuehrend of ['front', 'top'] as const) {
        const nach = punkteAngleichen(pr, fuehrend);
        const w = widerspruch(nach);
        zeilen.push(`${name.padEnd(14)} ${fuehrend.padEnd(5)} vorher ${vorher.max.toFixed(1).padStart(5)} px → ${w.max.toFixed(1).padStart(4)} px (S ${w.seite.toFixed(1)}, F ${w.front.toFixed(1)}, T ${w.top.toFixed(1)})`);
        expect(JSON.stringify(nach[fuehrend])).toBe(JSON.stringify(abgleichen(pr, fuehrend, pr)[fuehrend]));
        for (const a of ['seite', 'front', 'top'] as const) expect(nach[a].knoten.length).toBe(pr[a].knoten.length);
        // Ente-Haken mit führendem Top: der Kopf im Top ist breiter, als die Front (ein einziger freier Knoten am Bauch)
        // ohne neuen Knoten zulassen kann — der Rest bleibt als Widerspruch im Top, die Front bleibt stimmig
        if (name === 'ente-haken' && fuehrend === 'top') expect(w.front).toBeLessThanOrEqual(1);
        else schlimmste = Math.max(schlimmste, w.max);
      }
    }
    console.log(zeilen.join('\n'));
    expect(schlimmste).toBeLessThanOrEqual(1);
  });

  it('Zufallsgesten: folgende Ansichten bleiben stimmig (≤ 1 px), die führende wird nie schlechter als ohne Kopplung jedes Punkts', () => {
    const z = zufall(7);
    let gesten = 0;
    let erfuellt = 0;
    let folgendSchlimmste = 0;
    let fuehrendMehr = 0;
    let ms = 0;
    const zeilen: string[] = [];
    for (const [name, roh] of koerper()) {
      let pr = punkteAngleichen(roh, 'front');
      let max = 0;
      for (let g = 0; g < 25; g++) {
        const a = (['seite', 'front', 'top'] as const)[Math.floor(z() * 3)]!;
        const kn = pr[a].knoten;
        const frei = kn.map((_, i) => i).filter((i) => !istAchsKnoten(pr[a], i));
        const i = frei[Math.floor(z() * frei.length)]!;
        const d = { x: (z() - 0.5) * 0.08, y: (z() - 0.5) * 0.08 };
        const neu = verschiebeKnoten(pr[a], [i], d);
        const basis = pr;
        const ohne = widerspruch(abgleichen({ ...basis, [a]: neu }, a, basis));
        const t0 = performance.now();
        pr = gekoppelt({ ...basis, [a]: neu }, a, basis);
        ms = Math.max(ms, performance.now() - t0);
        for (const b of ['seite', 'front', 'top'] as const) expect(pr[b].knoten.length).toBe(basis[b].knoten.length);
        const w = widerspruch(pr);
        const folgend = Math.max(...(['seite', 'front', 'top'] as const).filter((b) => b !== a).map((b) => w[b]));
        folgendSchlimmste = Math.max(folgendSchlimmste, folgend);
        if (w[a] > Math.max(1, ohne[a]) + 0.5) fuehrendMehr++;
        if (w.max <= 1) erfuellt++;
        max = Math.max(max, w.max);
        gesten++;
      }
      zeilen.push(`${name.padEnd(14)} größter Widerspruch nach 25 Gesten ${max.toFixed(2)} px`);
    }
    console.log(zeilen.join('\n'), `\n${gesten} Gesten: ${erfuellt} ganz stimmig (≤ 1 px), folgende Ansichten höchstens ${folgendSchlimmste.toFixed(2)} px, führende schlechter als ohne: ${fuehrendMehr}, längster Zug ${ms.toFixed(1)} ms`);
    expect(folgendSchlimmste).toBeLessThanOrEqual(1);
    expect(fuehrendMehr).toBe(0);
    expect(erfuellt / gesten).toBeGreaterThan(0.97);
  });

  it('alte Widersprüche bleiben bei einer Geste an anderer Stelle stehen (bis man angleicht)', () => {
    const pr = s0KoerperDokument('ente-haken').profile;
    const vorher = widerspruch(pr);
    expect(vorher.max).toBeGreaterThan(5);
    // Seite: hinterster Knoten etwas nach hinten (weit weg vom Kopf)
    const kn = pr.seite.knoten;
    let i = 0;
    kn.forEach((k, j) => {
      if (k.p.x > kn[i]!.p.x) i = j;
    });
    const nach = gekoppelt({ ...pr, seite: verschiebeKnoten(pr.seite, [i], { x: 0.01, y: 0 }) }, 'seite', pr);
    const w = widerspruch(nach);
    console.log(`Ente: vorher ${vorher.max.toFixed(1)} px, nach Zug am Schwanz ${w.max.toFixed(1)} px; Top-Knoten bewegt: ${nach.top.knoten.filter((k, j) => Math.hypot(k.p.x - pr.top.knoten[j]!.p.x, k.p.y - pr.top.knoten[j]!.p.y) > 1e-9).length}`);
    expect(w.max).toBeGreaterThan(vorher.max - 1);
    expect(w.max).toBeLessThan(vorher.max + 1);
  });
});
