// S1c (Plan „Liniennetz, Zielform, Käfig“, 16.10.): Kopplung jedes Punkts. Tor: nach jeder Geste Widerspruch ≤ 1 px in
// allen Blättern (stimmiger Anfang), keine neuen Knoten, alte Widersprüche bleiben, bis man angleicht.
import { describe, expect, it } from 'vitest';
import type { Dokument } from './dokument';
import { erreichbarkeit } from './kern/grundkoerper/huelle';
import { G_KOERPER, S0_KOERPER, gKoerperDokument, s0KoerperDokument } from './kern/pruefen/grundkoerper';
import { abgleichen } from './kopplung';
import { gekoppelt, gekoppeltMit, punkteAngleichen, punkteAngleichenMit } from './kopplungPunkte';
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

  it('Zufallsgesten ohne Einfügen: folgende Ansichten nie schlechter als am Gestenbeginn (≤ 1 px); was sich ohne neue Punkte nicht lösen lässt, bleibt in der führenden', () => {
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
        const vorher = widerspruch(basis);
        const t0 = performance.now();
        pr = gekoppelt({ ...basis, [a]: neu }, a, basis);
        ms = Math.max(ms, performance.now() - t0);
        for (const b of ['seite', 'front', 'top'] as const) expect(pr[b].knoten.length).toBe(basis[b].knoten.length);
        const w = widerspruch(pr);
        // folgende Ansichten: über ihren Stand am Gestenbeginn hinaus (alte Reste früherer unerfüllbarer Züge bleiben erlaubt)
        const folgend = Math.max(...(['seite', 'front', 'top'] as const).filter((b) => b !== a).map((b) => w[b] - Math.max(0, vorher[b] - 1)));
        folgendSchlimmste = Math.max(folgendSchlimmste, folgend);
        // insgesamt nie schlechter als nur mit den Außenmaßen (der Rest darf in die führende Ansicht wandern)
        if (w.max > Math.max(1, ohne.max) + 0.5) fuehrendMehr++;
        if (w.max <= 1) erfuellt++;
        max = Math.max(max, w.max);
        gesten++;
      }
      zeilen.push(`${name.padEnd(14)} größter Widerspruch nach 25 Gesten ${max.toFixed(2)} px`);
    }
    console.log(zeilen.join('\n'), `\n${gesten} Gesten: ${erfuellt} ganz stimmig (≤ 1 px), folgende Ansichten höchstens ${folgendSchlimmste.toFixed(2)} px über ihrem Stand, insgesamt schlechter als ohne: ${fuehrendMehr}, längster Zug ${ms.toFixed(1)} ms`);
    expect(folgendSchlimmste).toBeLessThanOrEqual(1);
    // höchstens ein Zug, in dem der Rest ganz in die führende wandert (mit Einfügen sind alle stimmig, Test unten)
    expect(fuehrendMehr).toBeLessThanOrEqual(1);
    expect(erfuellt / gesten).toBeGreaterThan(0.97);
  });

  it('Punkte einfügen (Florian 16.10.: nur wenn wirklich notwendig): Ente-Haken mit führendem Top wird stimmig', () => {
    const pr = s0KoerperDokument('ente-haken').profile;
    const ohne = widerspruch(punkteAngleichen(pr, 'top'));
    const r = punkteAngleichenMit(pr, 'top', { einfuegen: true });
    const w = widerspruch(r.profile);
    console.log(`Ente-Haken, Top führt: ohne Einfügen ${ohne.max.toFixed(1)} px, mit ${w.max.toFixed(1)} px; Front ${pr.front.knoten.length} → ${r.profile.front.knoten.length} Knoten, Teilungen ${JSON.stringify(r.teilungen.front.map(([s, t]) => [s, +t.toFixed(2)]))}`);
    expect(ohne.max).toBeGreaterThan(5);
    expect(w.max).toBeLessThanOrEqual(1);
    expect(r.profile.front.knoten.length - pr.front.knoten.length).toBeLessThanOrEqual(2);
    expect(r.profile.top.knoten.length).toBe(pr.top.knoten.length);
    // stimmige Körper bekommen beim Angleichen keinen Punkt
    for (const [name, p0] of koerper()) {
      if (name === 'ente-haken') continue;
      for (const f of ['front', 'top'] as const) {
        const a = punkteAngleichenMit(p0, f, { einfuegen: true });
        expect(a.teilungen.front.length + a.teilungen.top.length, `${name} ${f}`).toBe(0);
      }
    }
  });

  it('Zufallsgesten mit Einfügen: alle stimmig, Punkte nur, wo die vorhandenen Knoten nicht reichen', () => {
    const z = zufall(7);
    let gesten = 0;
    let erfuellt = 0;
    let eingefuegt = 0;
    let unnoetig = 0;
    const faelle: string[] = [];
    for (const [name, roh] of koerper()) {
      let pr = punkteAngleichen(roh, 'front');
      for (let g = 0; g < 25; g++) {
        const a = (['seite', 'front', 'top'] as const)[Math.floor(z() * 3)]!;
        const kn = pr[a].knoten;
        const frei = kn.map((_, i) => i).filter((i) => !istAchsKnoten(pr[a], i));
        const i = frei[Math.floor(z() * frei.length)]!;
        const d = { x: (z() - 0.5) * 0.08, y: (z() - 0.5) * 0.08 };
        const neu = verschiebeKnoten(pr[a], [i], d);
        const basis = pr;
        const ohne = widerspruch(gekoppelt({ ...basis, [a]: neu }, a, basis));
        const r = gekoppeltMit({ ...basis, [a]: neu }, a, basis, { einfuegen: true });
        const n = r.teilungen.front.length + r.teilungen.top.length;
        if (n) {
          eingefuegt += n;
          faelle.push(`${name} Geste ${g} (${a}): ohne ${ohne.max.toFixed(1)} px → ${n} Punkt(e)`);
          if (ohne.max <= 1) unnoetig++;
        }
        pr = r.profile;
        const w = widerspruch(pr);
        if (w.max <= 1) erfuellt++;
        gesten++;
      }
    }
    console.log(`${gesten} Gesten: ${erfuellt} stimmig (≤ 1 px), ${eingefuegt} Punkte eingefügt, davon unnötig ${unnoetig}\n${faelle.join('\n')}`);
    expect(unnoetig).toBe(0);
    expect(erfuellt).toBe(gesten);
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
